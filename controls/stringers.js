/* ============================================================
   stringers.js -- T2T Field Guide - shared by every board

   STRINGERS. Larry, Nov 1 2026: a Stringer is a Signal Flag that also points to somewhere else in the one tree (a card, a topic or a header).
   Click the flag and you jump there; a BACK button then returns you to exactly where you were, even after several jumps.

   Where the target lives: one optional column on the flag itself, custom_keys.target_idea_id (database-changes/2026-11-01 stringers.sql).
   Every card carrying that flag jumps to the same place. A Stringer still counts as one of a card's three custom flags, and the red heart and
   blue gem can never be Stringers (they are not custom flags). A flag with no target behaves exactly as it always did.

   The Back trail is a short list kept in the browser tab's session memory (sessionStorage), so it survives moving between boards. It is a stack:
   each jump adds the place you left; BACK takes the newest one off and goes there. The small x beside BACK clears the whole trail.

   One tree, one code: this one file serves the Briefing Board and the Story/Vision/Plan boards (they only add the target to their flag
   builders and put data-stringer attributes on the flag they draw -- see attrs()). It also holds the topic FINDER (find / pickTarget), which
   the next features (go-to link on cards, routine PLAN) are meant to reuse.

   Public surface: window.T2TStringers
     attrs(key, fromId, fromKind)  -> the HTML attributes that make a drawn flag a clickable Stringer ('' when the flag has no target)
     mark()                        -> the tiny arrow shown beside a Stringer
     jump({targetId, fromId, fromKind, keyId})
     find(text) / pickTarget(onPicked, currentId)
     describe(id) / forget(id)
     renderBack()
   ============================================================ */
(function(){
  var TRAIL_KEY='fg_stringer_trail';
  var MAX_TRAIL=20;
  var info={};   // id -> what describe() found (kept for the tab's life; forget(id) after editing a flag)

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function toast(m){
    if(typeof _bbShowToast==='function') _bbShowToast(m);
    else if(typeof _sboardShowToast==='function') _sboardShowToast(m);
  }
  function firstLine(s){ return String(s||'').split('\n')[0].trim(); }
  function titleOf(r){ return String(r && r.subject || '').trim() || firstLine(r && r.text_content) || '(untitled)'; }
  function short(s, n){ s=String(s||''); return s.length>n ? s.slice(0,n-1)+'…' : s; }

  // A lookup that stalls must never leave a screen waiting forever, so every database call here gives up after 12 seconds.
  function tmo(p, ms){
    return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timed out')); }, ms||12000); })]);
  }

  // ---- what is at the other end of a Stringer ----
  // {id, title, kind:'task'|'header'|'card', gone, reason, topicId, parentId}. A card that was trashed or archived is "gone" (the flag says so quietly).
  async function describe(id){
    if(!id) return null;
    if(info[id]) return info[id];
    var out={id:id, title:'', kind:'card', gone:true, reason:'it can no longer be found', topicId:null, parentId:null};
    var c=sb();
    if(!c) return out;
    try{
      var r=await tmo(c.from('ideas').select('id,subject,text_content,content_type,cluster_id').eq('id', id).maybeSingle());
      if(r.error) throw r.error;
      if(!r.data) return out;   // really not there any more
      var row=r.data;
      out.title=titleOf(row); out.parentId=row.cluster_id||null; out.gone=false; out.reason='';
      out.kind=(row.content_type==='header') ? 'header' : 'card';
      var t=await tmo(c.from('task_fields').select('archived,trashed_at,project_header_id').eq('idea_id', id).maybeSingle());
      if(t && t.data){
        out.kind='task'; out.topicId=t.data.project_header_id||null;
        if(t.data.trashed_at){ out.gone=true; out.reason='it is in the trash'; }
        else if(t.data.archived){ out.gone=true; out.reason='it is archived'; }
      }
    }catch(e){
      // Could not ask (slow network, signed out for a moment): say so, and do not remember it as gone.
      console.error('Stringers: could not look up the target', e);
      return {id:id, title:'', kind:'card', gone:false, reason:'', topicId:null, parentId:null, unreachable:true};
    }
    info[id]=out;
    return out;
  }
  function forget(id){ if(id) delete info[id]; else info={}; }

  // ---- drawn flags ----
  function mark(){ return '<span class="fg-str-mark" aria-hidden="true">↗</span>'; }
  // fromKind: 'BB' (a Briefing Board card) or 'SB' (a Story/Vision/Plan board item)
  function attrs(key, fromId, fromKind){
    if(!key || !key.target_idea_id) return '';
    return ' data-stringer="'+esc(key.target_idea_id)+'" data-stringer-key="'+esc(key.id)+'" data-str-from="'+esc(fromId||'')+'" data-str-from-kind="'+esc(fromKind||'')+'" data-str-base="'+esc(key.meaning||'')+'"';
  }

  // ---- the Back trail ----
  function readTrail(){ try{ var t=JSON.parse(sessionStorage.getItem(TRAIL_KEY)||'[]'); return Array.isArray(t)?t:[]; }catch(e){ return []; } }
  function writeTrail(t){ try{ sessionStorage.setItem(TRAIL_KEY, JSON.stringify(t.slice(-MAX_TRAIL))); }catch(e){} }

  function injectStyle(){
    if(document.getElementById('fg-stringer-style')) return;
    var st=document.createElement('style'); st.id='fg-stringer-style';
    st.textContent=''
      +'.fg-str-mark{display:inline-block;font-size:9px;font-weight:700;line-height:1;margin-left:1px;color:#3B2510;vertical-align:top}'
      +'[data-stringer]{cursor:pointer}'
      +'.fg-str-back{position:fixed;left:14px;bottom:14px;z-index:99990;display:flex;align-items:stretch;background:#fff;border:1px solid #3B2510;border-radius:999px;box-shadow:0 3px 12px rgba(0,0,0,.3);overflow:hidden;font-family:inherit}'
      +'.fg-str-back button{cursor:pointer;background:transparent;border:0;font:inherit;font-size:13px;font-weight:700;color:#3B2510;padding:8px 12px}'
      +'.fg-str-back button:hover{background:#f3ece0}'
      +'.fg-str-back .fg-str-x{border-left:1px solid #d8cdb6;padding:8px 10px;font-weight:400;color:#7a6040}'
      +'.fg-str-find{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px}'
      +'.fg-str-find-box{background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:460px;width:100%;max-height:82vh;display:flex;flex-direction:column;padding:16px;font-family:inherit;color:#222}'
      +'.fg-str-find-box input{width:100%;box-sizing:border-box;border:1px solid #d8cdb6;border-radius:8px;padding:9px 10px;font:inherit;font-size:14px;margin-bottom:8px}'
      +'.fg-str-find-list{overflow:auto;flex:1 1 auto}'
      +'.fg-str-hit{display:block;width:100%;text-align:left;cursor:pointer;background:#f7f4ee;border:1px solid #d8cdb6;border-radius:8px;padding:8px 10px;margin-bottom:6px;font:inherit;color:#222}'
      +'.fg-str-hit:hover{background:#efe7d6}'
      +'.fg-str-hit b{font-weight:700}'
      +'.fg-str-kind{display:inline-block;margin-left:6px;font-size:10px;font-weight:700;letter-spacing:1px;color:#7a6040;border:1px solid #cdbf9f;border-radius:4px;padding:0 4px}'
      +'.fg-str-path{display:block;font-size:12px;color:#777;margin-top:2px}';
    document.head.appendChild(st);
  }

  function renderBack(){
    var old=document.getElementById('fg-str-back'); if(old) old.remove();
    var t=readTrail(); if(!t.length || !document.body) return;
    injectStyle();
    var last=t[t.length-1];
    var box=document.createElement('div'); box.id='fg-str-back'; box.className='fg-str-back';
    var b=document.createElement('button'); b.type='button';
    b.textContent='← Back to '+short(last.label||'where you were', 28)+(t.length>1?' ('+t.length+')':'');
    b.title='Go back to exactly where you were before the jump'+(t.length>1?' ('+t.length+' stops on the trail)':'');
    b.addEventListener('click', goBack);
    var x=document.createElement('button'); x.type='button'; x.className='fg-str-x'; x.textContent='✕'; x.title='Clear the Back trail';
    x.addEventListener('click', function(){ writeTrail([]); renderBack(); });
    box.appendChild(b); box.appendChild(x);
    box.addEventListener('dblclick', function(e){ e.stopPropagation(); });   // same reason as the Finder: a quick double tap must not open the desk color picker
    document.body.appendChild(box);
  }

  // ---- travelling ----
  function boardKindHere(){
    if(window._sboardIsPlanBoard) return 'PLAN';
    if(window._sboardIsShareBoard) return 'SHARE';
    return 'IDEA';
  }
  // Where we are standing right now, so BACK can return to it. fromKind 'BB' = a Briefing Board card; anything else = a Story/Vision/Plan board.
  function hereFor(fromId, fromKind){
    if(fromKind==='BB'){
      var topic=null;
      try{ topic=(window.FGBBGoThere && FGBBGoThere.returnProjectId) ? FGBBGoThere.returnProjectId() : null; }catch(e){}
      return {kind:'BRIEFING BOARD', topicId:topic, cardId:fromId};
    }
    var cur=(window.T2TShared && T2TShared.currentTopicId) || null;
    return {kind:boardKindHere(), topicId:cur, cardId:fromId};
  }
  async function openPlace(kind, topicId, cardId){
    if(!window.IDBand || !IDBand.goToBoard || !topicId) return false;
    var ok=await IDBand.goToBoard(kind, topicId);
    if(ok===false) return false;
    if(kind==='BRIEFING BOARD' && cardId && window.FGBBGoThere && FGBBGoThere.glow){
      FGBBGoThere.glow(cardId);
      setTimeout(function(){ FGBBGoThere.glow(cardId); }, 500);
    }
    return true;
  }

  var jumping=false;
  async function jump(o){
    if(jumping || !o || !o.targetId) return;
    jumping=true;
    try{
      var tgt=await describe(o.targetId);
      if(tgt && tgt.unreachable){ toast('Could not look that up just now. Try again in a moment.'); return; }
      if(!tgt || tgt.gone){
        toast('This flag points to '+(tgt && tgt.title ? '“'+tgt.title+'”' : 'a card')+', but '+((tgt && tgt.reason)||'it can no longer be found')+'.');
        return;
      }
      var here=hereFor(o.fromId, o.fromKind);
      var from=o.fromId ? await describe(o.fromId) : null;
      here.label=(from && from.title) || 'where you were';
      var kind, topic, card=null;
      if(tgt.kind==='task'){ kind='BRIEFING BOARD'; topic=tgt.topicId || tgt.parentId; card=tgt.id; }
      else if(tgt.kind==='header'){ kind='IDEA'; topic=tgt.id; }
      else { kind='IDEA'; topic=tgt.parentId; }   // a plain card has no board of its own: open the header it lives on
      if(!topic){ toast('That place did not open. Try again in a moment.'); return; }
      var trail=readTrail(); trail.push(here); writeTrail(trail);
      var ok=await openPlace(kind, topic, card);
      if(!ok){ trail.pop(); writeTrail(trail); toast('That place did not open. Try again in a moment.'); }
      renderBack();
    }catch(e){
      console.error('Stringers: jump failed', e);
      toast('That place did not open. Try again in a moment.');
    }finally{ jumping=false; }
  }

  async function goBack(){
    var t=readTrail(); if(!t.length) return;
    var here=t.pop(); writeTrail(t);
    var ok=await openPlace(here.kind, here.topicId, here.cardId);
    if(!ok){ t.push(here); writeTrail(t); toast('That place did not open. Try again in a moment.'); }
    renderBack();
  }

  // ---- the FINDER: look for a card, header or topic by its words ----
  // Returns [{id, title, kind:'TASK'|'HEADER'|'CARD', path}] best matches first. The path is its place in the tree, e.g. MASTER > VISION > STRINGERS.
  async function find(text){
    var q=String(text||'').trim().replace(/[%,()*\\]/g,' ').replace(/\s+/g,' ').trim();
    var c=sb();
    if(q.length<2 || !c) return [];
    var like='*'+q+'*';
    var r=await tmo(c.from('ideas').select('id,subject,text_content,content_type,cluster_id').or('subject.ilike.'+like+',text_content.ilike.'+like).limit(60));
    if(r.error || !r.data) return [];
    var rows=r.data.filter(function(x){ return String(x.subject||x.text_content||'').trim() && x.content_type!=='image'; });
    if(!rows.length) return [];
    var ids=rows.map(function(x){ return x.id; });
    var skip={}, isTask={};
    try{
      var t=await tmo(c.from('task_fields').select('idea_id,archived,trashed_at').in('idea_id', ids));
      ((t&&t.data)||[]).forEach(function(x){ isTask[x.idea_id]=true; if(x.archived||x.trashed_at) skip[x.idea_id]=true; });
    }catch(e){}
    rows=rows.filter(function(x){ return !skip[x.id]; });
    var lq=q.toLowerCase();
    rows.forEach(function(x){
      var ti=titleOf(x).toLowerCase();
      x._score=(ti===lq?0:ti.indexOf(lq)===0?1:ti.indexOf(lq)>=0?2:3)*2+(x.content_type==='header'?0:1);
    });
    rows.sort(function(a,b){ return a._score-b._score; });
    rows=rows.slice(0,12);
    // ancestors, one level per round trip (a handful at most)
    var byId={}, need=[];
    rows.forEach(function(x){ if(x.cluster_id) need.push(x.cluster_id); });
    for(var d=0; d<6 && need.length; d++){
      var uniq=need.filter(function(id,i){ return !byId[id] && need.indexOf(id)===i; });
      if(!uniq.length) break;
      var pr=await tmo(c.from('ideas').select('id,subject,text_content,cluster_id').in('id', uniq));
      need=[];
      ((pr&&pr.data)||[]).forEach(function(p){ byId[p.id]=p; if(p.cluster_id) need.push(p.cluster_id); });
    }
    return rows.map(function(x){
      var parts=[], pid=x.cluster_id, guard=0;
      while(pid && byId[pid] && guard++<8){ parts.unshift(titleOf(byId[pid]).toUpperCase()); pid=byId[pid].cluster_id; }
      return {id:x.id, title:titleOf(x), kind:isTask[x.id]?'TASK':(x.content_type==='header'?'HEADER':'CARD'), path:parts.join(' › ')};
    });
  }

  // The picker: type a few words, see close matches with where each one sits in the tree, choose one. Calls onPicked({id,title}) or nothing if closed.
  function pickTarget(onPicked, currentId){
    injectStyle();
    var ov=document.createElement('div'); ov.className='fg-str-find';
    var box=document.createElement('div'); box.className='fg-str-find-box';
    box.innerHTML='<div style="font-size:15px;font-weight:700;margin-bottom:4px">Where does this flag go?</div>'
      +'<div style="font-size:13px;color:#666;margin-bottom:8px">Type a few words from the card, topic or header. Pick the one you want.</div>'
      +'<input type="text" placeholder="Search by name or words…" autocomplete="off">'
      +'<div class="fg-str-find-list"><div style="font-size:12px;color:#777">Matches show here.</div></div>'
      +'<button type="button" class="fg-str-cancel" style="margin:8px auto 0;cursor:pointer;background:transparent;border:0;font:inherit;font-size:12px;color:#777;text-decoration:underline">Cancel</button>';
    ov.appendChild(box); document.body.appendChild(ov);
    ov.addEventListener('dblclick', function(e){ e.stopPropagation(); });   // the desk color picker listens for double-clicks outside the app; selecting a word here must not open it
    var input=box.querySelector('input'), list=box.querySelector('.fg-str-find-list'), timer=null, seq=0;
    function close(){ ov.remove(); document.removeEventListener('keydown', onKey, true); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', function(e){ if(e.target===ov) close(); });
    box.querySelector('.fg-str-cancel').addEventListener('click', close);
    function show(hits, q){
      if(!hits.length){ list.innerHTML='<div style="font-size:13px;color:#777">'+(q.length<2?'Matches show here.':'Nothing close. Try other words.')+'</div>'; return; }
      list.innerHTML=hits.map(function(h){
        return '<button type="button" class="fg-str-hit" data-id="'+esc(h.id)+'"><b>'+esc(short(h.title,70))+'</b><span class="fg-str-kind">'+esc(h.kind)+'</span>'
          +(h.path?'<span class="fg-str-path">in '+esc(h.path)+'</span>':'')+(h.id===currentId?'<span class="fg-str-path">(this is where it goes now)</span>':'')+'</button>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('.fg-str-hit'), function(b){
        b.addEventListener('click', function(){
          var h=hits.filter(function(x){ return x.id===b.getAttribute('data-id'); })[0];
          close();
          if(h && onPicked) onPicked({id:h.id, title:h.title});
        });
      });
    }
    input.addEventListener('input', function(){
      clearTimeout(timer);
      var q=input.value, mine=++seq;
      timer=setTimeout(async function(){
        var hits=[]; try{ hits=await find(q); }catch(e){ console.error('Stringers: search failed', e); }
        if(mine===seq) show(hits, q.trim());
      }, 250);
    });
    setTimeout(function(){ input.focus(); }, 30);
  }

  // ---- clicks and hover on drawn flags (every board) ----
  // A press held for about half a second opens the flag's "who else carries this flag" peek (the boards already do that); the release that
  // follows must not also count as a click-to-jump.
  var downAt=0;
  function noteDown(e){ if(e.target && e.target.closest && e.target.closest('[data-stringer]')) downAt=Date.now(); }
  document.addEventListener('mousedown', noteDown, true);
  document.addEventListener('touchstart', noteDown, true);
  document.addEventListener('click', function(e){
    var el=e.target && e.target.closest ? e.target.closest('[data-stringer]') : null;
    if(!el) return;
    e.stopPropagation(); e.preventDefault();
    if(downAt && Date.now()-downAt>520){ downAt=0; return; }
    downAt=0;
    jump({targetId:el.getAttribute('data-stringer'), fromId:el.getAttribute('data-str-from'), fromKind:el.getAttribute('data-str-from-kind'), keyId:el.getAttribute('data-stringer-key')});
  }, true);
  // The tooltip names where the thread goes. It is worked out the first time the pointer rests on the flag.
  document.addEventListener('mouseover', function(e){
    var el=e.target && e.target.closest ? e.target.closest('[data-stringer]') : null;
    if(!el || el.getAttribute('data-str-tip')) return;
    el.setAttribute('data-str-tip','1');
    var base=el.getAttribute('data-str-base')||'';
    describe(el.getAttribute('data-stringer')).then(function(d){
      var where=(d && !d.unreachable) ? (d.gone ? '“'+(d.title||'a card')+'” ('+d.reason+')' : '“'+d.title+'”') : 'somewhere in the tree';
      el.title=(base?base+' — ':'')+'goes to '+where+'. Click to jump.';
    });
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', renderBack); else setTimeout(renderBack, 0);

  window.T2TStringers={attrs:attrs, mark:mark, jump:jump, find:find, pickTarget:pickTarget, describe:describe, forget:forget, renderBack:renderBack};
})();
