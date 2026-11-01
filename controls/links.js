/* ============================================================
   links.js -- T2T Field Guide - shared by every board

   LINK. Larry, Nov 1 2026: LINK is an OPTION on every card (separate from Signal Flags: a flag filters, a link travels).
   A card has up to 3 links. Each link is a colored arrow whose color is fixed by its slot, always in the same order:
     LINK 1 = lime green,  LINK 2 = orange,  LINK 3 = hot pink   (bright, like a lit button; a brand artist can change them here, in COLORS, and nowhere else).
   Click a link's arrow and you jump to the card, topic or header it points to. The RETURN arrow in the top right of the board then takes
   that link's color and brings you back. It is a single remembered stop, not a history: if the traveler switches topic or board on their
   own, the jump back is given up and RETURN goes back to its plain look.

   Where links live: table card_links (database-changes/2026-11-01 card links.sql) -- idea_id, slot 1..3, target_idea_id. One table for every
   board, so no card table or view changes. If that table is not there yet, LINK says so quietly and nothing else is affected.

   The same file holds the FINDER (find / pickTarget): type a few words, see matches with their place in the tree, choose one.

   Public surface: window.T2TLinks
     COLORS                         the three slot colors
     arrowSVG(slot, px)             the arrow drawing in a slot's color
     rowHTML / mountRow(host, cfg)  the LINK row on a card back: cfg = {cardId(), fromKind:'BB'|'SB', fromTitle()}
     get(ideaId)                    -> {1:target|null, 2:..., 3:...} (cached)
     jump({slot, targetId, fromId, fromKind})
     find(text) / pickTarget(onPicked, opts) / describe(id)
   ============================================================ */
(function(){
  var COLORS = { 1:'#2eea2e', 2:'#ff9500', 3:'#ff2d9a' };
  var NAMES  = { 1:'LINK 1', 2:'LINK 2', 3:'LINK 3' };
  var cache = {};      // ideaId -> {1:targetId|null,2:..,3:..}
  var info  = {};      // targetId -> describe() result

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function toast(m){
    if(typeof _bbShowToast==='function') _bbShowToast(m);
    else if(typeof _sboardShowToast==='function') _sboardShowToast(m);
  }
  function firstLine(s){ return String(s||'').split('\n')[0].trim(); }
  function titleOf(r){ return String(r && r.subject || '').trim() || firstLine(r && r.text_content) || '(untitled)'; }
  function short(s, n){ s=String(s||''); return s.length>n ? s.slice(0,n-1)+'…' : s; }
  // A lookup that stalls must never leave a screen waiting forever.
  function tmo(p, ms){
    return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timed out')); }, ms||12000); })]);
  }

  // ---- the arrow ----
  function arrowSVG(slot, px, dim){
    var c=COLORS[slot]||'#888', h=px||18;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="'+h+'" height="'+h+'" style="display:inline-block;vertical-align:middle'+(dim?';opacity:.35':';filter:drop-shadow(0 0 3px '+c+')')+'" aria-hidden="true">'
      +'<path d="M3 12h14M12 5l7 7-7 7" fill="none" stroke="'+c+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---- what is at the other end of a link ----
  // {id,title,kind:'task'|'header'|'card',gone,reason,topicId,parentId}. A trashed or archived card is "gone" (said quietly).
  async function describe(id){
    if(!id) return null;
    if(info[id]) return info[id];
    var out={id:id, title:'', kind:'card', gone:true, reason:'it can no longer be found', topicId:null, parentId:null};
    var c=sb(); if(!c) return out;
    try{
      var r=await tmo(c.from('ideas').select('id,subject,text_content,content_type,cluster_id').eq('id', id).maybeSingle());
      if(r.error) throw r.error;
      if(!r.data) return out;
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
      console.error('Links: could not look up the target', e);
      return {id:id, title:'', kind:'card', gone:false, reason:'', topicId:null, parentId:null, unreachable:true};   // not remembered
    }
    info[id]=out;
    return out;
  }

  // ---- reading and writing a card's links ----
  var tableMissing=false;
  async function get(ideaId, fresh){
    if(!ideaId) return {1:null,2:null,3:null};
    if(!fresh && cache[ideaId]) return cache[ideaId];
    var out={1:null,2:null,3:null}, c=sb();
    if(!c) return out;
    try{
      var r=await tmo(c.from('card_links').select('slot,target_idea_id').eq('idea_id', ideaId));
      if(r.error){ tableMissing=true; return out; }   // table not made yet
      tableMissing=false;
      (r.data||[]).forEach(function(x){ out[x.slot]=x.target_idea_id; });
      cache[ideaId]=out;
    }catch(e){ console.error('Links: could not read links', e); }
    return out;
  }
  async function setLink(ideaId, slot, targetId){
    var c=sb(); if(!c) throw new Error('not signed in');
    var r;
    if(targetId) r=await c.from('card_links').upsert({idea_id:ideaId, slot:slot, target_idea_id:targetId}, {onConflict:'idea_id,slot'});
    else r=await c.from('card_links').delete().eq('idea_id', ideaId).eq('slot', slot);
    if(r.error) throw r.error;
    var cur=Object.assign({1:null,2:null,3:null}, cache[ideaId]||{}); cur[slot]=targetId||null; cache[ideaId]=cur;
  }

  // ---- travelling ----
  function boardKindHere(){
    if(window._sboardIsPlanBoard) return 'PLAN';
    if(window._sboardIsShareBoard) return 'SHARE';
    return 'IDEA';
  }
  // The place we are standing, so RETURN can bring us back. fromKind 'BB' = a Briefing Board card; anything else = a Story/Vision/Plan board.
  function hereFor(fromId, fromKind){
    if(fromKind==='BB'){
      var topic=null;
      try{ topic=(window.FGBBGoThere && FGBBGoThere.returnProjectId) ? FGBBGoThere.returnProjectId() : null; }catch(e){}
      return {kind:'BRIEFING BOARD', topicId:topic};
    }
    return {kind:boardKindHere(), topicId:(window.T2TShared && T2TShared.currentTopicId) || null};
  }
  var jumping=false;
  async function jump(o){
    if(jumping || !o || !o.targetId) return;
    jumping=true;
    try{
      var tgt=await describe(o.targetId);
      if(tgt && tgt.unreachable){ toast('Could not look that up just now. Try again in a moment.'); return; }
      if(!tgt || tgt.gone){
        toast('This link points to '+(tgt && tgt.title ? '“'+tgt.title+'”' : 'a card')+', but '+((tgt && tgt.reason)||'it can no longer be found')+'.');
        return;
      }
      var here=hereFor(o.fromId, o.fromKind);
      var kind, topic, card=null;
      if(tgt.kind==='task'){ kind='BRIEFING BOARD'; topic=tgt.topicId || tgt.parentId; card=tgt.id; }
      else if(tgt.kind==='header'){ kind='IDEA'; topic=tgt.id; }
      else { kind='IDEA'; topic=tgt.parentId; }   // a plain card has no board of its own: open the header it lives on
      if(!topic || !window.IDBand || !IDBand.goToBoard){ toast('That place did not open. Try again in a moment.'); return; }
      // The card back you followed the link from closes first, so the place you land on is what you see.
      try{
        if(o.fromKind==='BB' && typeof closeCardDetail==='function') closeCardDetail();
        else if(o.fromKind==='SB' && typeof closeSbDetail==='function') closeSbDetail();
      }catch(e){}
      // The single remembered stop, in this link's color. Any later manual topic or board switch replaces it (IDBand.recordReturn clears the color).
      if(here.topicId) IDBand.recordReturn(here.kind, here.topicId, COLORS[o.slot]||null);
      var ok=await IDBand.goToBoard(kind, topic);
      if(ok===false){ toast('That place did not open. Try again in a moment.'); return; }
      if(IDBand.paintReturn) IDBand.paintReturn();
      if(kind==='BRIEFING BOARD' && card && window.FGBBGoThere && FGBBGoThere.glow){
        FGBBGoThere.glow(card);
        setTimeout(function(){ FGBBGoThere.glow(card); }, 500);
      }
    }catch(e){
      console.error('Links: jump failed', e);
      toast('That place did not open. Try again in a moment.');
    }finally{ jumping=false; }
  }

  // ---- the FINDER ----
  // Returns [{id,title,kind:'TASK'|'HEADER'|'CARD',path}] best matches first. path = its place in the tree, e.g. MASTER › VISION › STRINGERS.
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
      return {id:x.id, title:x.title||titleOf(x), kind:isTask[x.id]?'TASK':(x.content_type==='header'?'HEADER':'CARD'), path:parts.join(' › ')};
    });
  }

  function injectStyle(){
    if(document.getElementById('fg-links-style')) return;
    var st=document.createElement('style'); st.id='fg-links-style';
    st.textContent=''
      +'.fg-link-row{display:flex;align-items:center;gap:6px;min-height:24px}'
      +'.fg-link-row .fg-link-lab{font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-right:2px}'
      +'.fg-link-btn{width:26px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1.5px solid transparent;border-radius:6px;cursor:pointer}'
      +'.fg-link-btn.fg-set{border-color:rgba(0,0,0,.18);background:rgba(255,255,255,.55)}'
      +'.fg-link-btn:hover{background:rgba(255,255,255,.9)}'
      +'.fg-link-edit{width:22px;height:22px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed var(--bb-ink);border-radius:50%;color:var(--bb-ink);font-size:12px;line-height:1;cursor:pointer}'
      +'.fg-link-edit.fg-on{background:var(--bb-bg)}'
      +'.fg-link-note{font-size:11px;color:var(--bb-ink);opacity:.7;margin-left:4px}'
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

  // The picker. opts = {slot, currentId, onRemove}. Calls onPicked({id,title}); onRemove() when "Remove this link" is chosen.
  function pickTarget(onPicked, opts){
    opts=opts||{};
    injectStyle();
    var ov=document.createElement('div'); ov.className='fg-str-find';
    var box=document.createElement('div'); box.className='fg-str-find-box';
    box.innerHTML='<div style="font-size:15px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px">'+(opts.slot?arrowSVG(opts.slot,20):'')+'<span>Where does '+(opts.slot?NAMES[opts.slot]:'this link')+' go?</span></div>'
      +'<div style="font-size:13px;color:#666;margin-bottom:8px">Type a few words from the card, topic or header. Pick the one you want.</div>'
      +'<input type="text" placeholder="Search by name or words…" autocomplete="off">'
      +'<div class="fg-str-find-list"><div style="font-size:12px;color:#777">Matches show here.</div></div>'
      +'<div style="display:flex;justify-content:center;gap:16px;margin-top:8px">'
      +(opts.onRemove?'<button type="button" class="fg-str-remove" style="cursor:pointer;background:transparent;border:0;font:inherit;font-size:12px;color:#b3261e;text-decoration:underline">Remove this link</button>':'')
      +'<button type="button" class="fg-str-cancel" style="cursor:pointer;background:transparent;border:0;font:inherit;font-size:12px;color:#777;text-decoration:underline">Cancel</button></div>';
    ov.appendChild(box); document.body.appendChild(ov);
    ov.addEventListener('dblclick', function(e){ e.stopPropagation(); });   // the desk color picker listens for double-clicks outside the app
    var input=box.querySelector('input'), list=box.querySelector('.fg-str-find-list'), timer=null, seq=0;
    function close(){ ov.remove(); document.removeEventListener('keydown', onKey, true); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', function(e){ if(e.target===ov) close(); });
    box.querySelector('.fg-str-cancel').addEventListener('click', close);
    var rm=box.querySelector('.fg-str-remove');
    if(rm) rm.addEventListener('click', function(){ close(); opts.onRemove(); });
    function show(hits, q){
      if(!hits.length){ list.innerHTML='<div style="font-size:13px;color:#777">'+(q.length<2?'Matches show here.':'Nothing close. Try other words.')+'</div>'; return; }
      list.innerHTML=hits.map(function(h){
        return '<button type="button" class="fg-str-hit" data-id="'+esc(h.id)+'"><b>'+esc(short(h.title,70))+'</b><span class="fg-str-kind">'+esc(h.kind)+'</span>'
          +(h.path?'<span class="fg-str-path">in '+esc(h.path)+'</span>':'')+(h.id===opts.currentId?'<span class="fg-str-path">(this is where it goes now)</span>':'')+'</button>';
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
        var hits=[]; try{ hits=await find(q); }catch(e){ console.error('Links: search failed', e); }
        if(mine===seq) show(hits, q.trim());
      }, 250);
    });
    setTimeout(function(){ input.focus(); }, 30);
  }

  // ---- the LINK row on a card back ----
  // cfg = {cardId(): id of the card now open, fromKind:'BB'|'SB'}. Returns the row element. Click an arrow: jump (or, when the slot is empty
  // or the pencil is on, choose where it goes). The pencil toggles "change a link"; inside it a set slot offers Remove.
  function buildRow(cfg){
    injectStyle();
    var row=document.createElement('div'); row.className='fg-fixed-row fg-link-row';
    var lab=document.createElement('span'); lab.className='fg-link-lab'; lab.textContent='Link'; row.appendChild(lab);
    var btns={}, editing=false;
    [1,2,3].forEach(function(s){
      var b=document.createElement('button'); b.type='button'; b.className='fg-link-btn'; b.setAttribute('data-slot', s);
      b.innerHTML=arrowSVG(s,18,true); b.title=NAMES[s]+': empty. Click to choose where it goes.';
      row.appendChild(b); btns[s]=b;
      b.addEventListener('click', function(e){
        e.stopPropagation();
        var id=cfg.cardId && cfg.cardId(); if(!id) return;
        var tgt=b.getAttribute('data-target');
        if(tgt && !editing){ jump({slot:s, targetId:tgt, fromId:id, fromKind:cfg.fromKind}); return; }
        choose(s, id, tgt);
      });
    });
    var ed=document.createElement('button'); ed.type='button'; ed.className='fg-link-edit'; ed.textContent='✎'; ed.title='Change or remove a link'; row.appendChild(ed);
    var note=document.createElement('span'); note.className='fg-link-note'; row.appendChild(note);
    ed.addEventListener('click', function(e){ e.stopPropagation(); editing=!editing; ed.classList.toggle('fg-on', editing); note.textContent=editing?'Pick an arrow to change it':''; });
    function choose(slot, id, current){
      pickTarget(async function(t){
        if(t.id===id){ toast('A card cannot link to itself.'); return; }
        try{ await setLink(id, slot, t.id); }catch(e){ console.error('Links: save failed', e); toast(tableMissing?'LINK needs one database step first.':'The link did not save. Try again.'); return; }
        paint(); editing=false; ed.classList.remove('fg-on'); note.textContent='';
      }, {slot:slot, currentId:current, onRemove: current ? async function(){
        try{ await setLink(id, slot, null); }catch(e){ toast('The link did not remove. Try again.'); return; }
        paint();
      } : null});
    }
    async function paint(){
      var id=cfg.cardId && cfg.cardId(); if(!id) return;
      var l=await get(id, true);
      if(tableMissing){ note.textContent='needs one database step'; }
      [1,2,3].forEach(async function(s){
        var b=btns[s], t=l[s];
        if(!t){ b.removeAttribute('data-target'); b.classList.remove('fg-set'); b.innerHTML=arrowSVG(s,18,true); b.title=NAMES[s]+': empty. Click to choose where it goes.'; return; }
        b.setAttribute('data-target', t); b.classList.add('fg-set'); b.innerHTML=arrowSVG(s,18,false);
        b.title=NAMES[s]+': goes to … (click to jump)';
        var d=await describe(t);
        if(b.getAttribute('data-target')===t) b.title=NAMES[s]+': goes to '+((d&&!d.unreachable)?(d.gone?'“'+(d.title||'a card')+'” ('+d.reason+')':'“'+d.title+'”'):'somewhere in the tree')+'. Click to jump.';
      });
    }
    row.__paint=paint;
    paint();
    return row;
  }

  window.T2TLinks={COLORS:COLORS, arrowSVG:arrowSVG, buildRow:buildRow, get:get, set:setLink, jump:jump, find:find, pickTarget:pickTarget, describe:describe, forget:function(id){ if(id) delete info[id]; else info={}; }};
})();
