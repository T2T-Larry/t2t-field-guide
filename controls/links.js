/* ============================================================
   links.js -- T2T Field Guide - shared by every board

   LINK. Larry, Nov 1 2026: LINK is an OPTION on every card (separate from Signal Flags: a flag filters, a link travels).
   A card has up to 3 links. Each link is a colored arrow whose color is fixed by its slot, always in the same order:
     LINK 1 = lime green,  LINK 2 = orange,  LINK 3 = hot pink   (bright, like a lit button; a brand artist can change them here, in COLORS, and nowhere else).
   A link goes to a BOARD TYPE of a TOPIC (Nov 1 2026, Larry: "a link to field which opens the TOPIC selector, Board type, just like the ID BAND"),
   chosen with the same two pickers as the ID BAND. Click a link's arrow and you jump there. The RETURN arrow in the top right of the board then takes
   that link's color and brings you back. It is a single remembered stop, not a history: if the traveler switches topic or board on their
   own, the jump back is given up and RETURN goes back to its plain look.

   Where links live: table card_links (database-changes/2026-11-01 card links.sql) -- idea_id, slot 1..3, target_idea_id (the topic), board_kind.
   On a card back LINK is a check box in the OPTIONS list: it opens the three links on the right, like every other option; the active arrows always show on the card front (no eyeball). One table for every
   board, so no card table or view changes. If that table is not there yet, LINK says so quietly and nothing else is affected.

   Nov 6 2026 (Larry): DEFAULTS. LINK 1 (green) = this card's SUBJECT as a header, shown as a column on its topic's VISION board; LINK 2 (orange) = that header's own PLAN board;
   LINK 3 (pink) has no default. An empty default shows dim; clicking it looks for a header with that SUBJECT first, builds one only if none exists
   (in the card's own topic), saves the link and goes there. Every TOPIC picker in this popup ends in the dashed (+) to make a new header.

   Nov 6 2026 (Larry): a slot can ALSO hold an outside WEB ADDRESS (card_links.url / url_title / url_thumb): the arrow opens it in a new tab. Paste a web address in the LINK box,
   or paste/drop one on a card back (wirePaste): a picture or GIF link shows as the card's picture, any other address fills the next free slot.

   The same file holds the FINDER (find / pickTarget): type a few words, see matches with their place in the tree, choose one.

   Public surface: window.T2TLinks
     COLORS                         the three slot colors
     arrowSVG(slot, px)             the arrow drawing in a slot's color
     rowHTML / mountRow(host, cfg)  the LINK row on a card back: cfg = {cardId(), fromKind:'BB'|'SB', fromTitle()}
     get(ideaId)                    -> {1:target|null, 2:..., 3:...} (cached)
     jump({slot, topicId, kind, fromKind})
     paintFaces(root, isHidden)     draws the active arrows on card fronts
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
  // A card's links: {1:{topic,kind}|null, 2:..., 3:...}. topic = the topic's id, kind = an IDBand.BOARD_KINDS value (VISION, PLAN, BRIEFING BOARD...).
  var tableMissing=false;
  function none(){ return {1:null,2:null,3:null}; }
  // Nov 6 2026 (Larry): a slot holds EITHER a place in T2T ({topic,kind}) OR a web address ({url,title,thumb}). A web slot has a .url.
  function slotFrom(x){
    if(x.url) return {url:x.url, title:x.url_title||null, thumb:x.url_thumb||null};
    return {topic:x.target_idea_id, kind:x.board_kind||'IDEA'};
  }
  async function get(ideaId, fresh){
    if(!ideaId) return none();
    if(!fresh && cache[ideaId]) return cache[ideaId];
    var out=none(), c=sb();
    if(!c) return out;
    try{
      var r=await tmo(c.from('card_links').select('slot,target_idea_id,board_kind,url,url_title,url_thumb').eq('idea_id', ideaId));
      if(r.error){ tableMissing=true; return out; }   // table not made yet
      tableMissing=false;
      (r.data||[]).forEach(function(x){ out[x.slot]=slotFrom(x); });
      cache[ideaId]=out;
    }catch(e){ console.error('Links: could not read links', e); }
    return out;
  }
  // Many cards at once (the card faces): one question for all of them.
  async function getMany(ids){
    var c=sb(), need=ids.filter(function(id){ return !cache[id]; });
    if(c && need.length){
      try{
        var r=await tmo(c.from('card_links').select('idea_id,slot,target_idea_id,board_kind,url,url_title,url_thumb').in('idea_id', need));
        if(r.error){ tableMissing=true; }
        else{
          need.forEach(function(id){ cache[id]=none(); });
          (r.data||[]).forEach(function(x){ cache[x.idea_id][x.slot]=slotFrom(x); });
        }
      }catch(e){ console.error('Links: could not read links', e); }
    }
    return cache;
  }
  async function setLink(ideaId, slot, topic, kind){
    var c=sb(); if(!c) throw new Error('not signed in');
    var r;
    if(topic) r=await c.from('card_links').upsert({idea_id:ideaId, slot:slot, target_idea_id:topic, board_kind:kind||'IDEA', url:null, url_title:null, url_thumb:null}, {onConflict:'idea_id,slot'});
    else r=await c.from('card_links').delete().eq('idea_id', ideaId).eq('slot', slot);
    if(r.error) throw r.error;
    var cur=Object.assign(none(), cache[ideaId]||{}); cur[slot]=topic?{topic:topic, kind:kind||'IDEA'}:null; cache[ideaId]=cur;
  }
  // ---- outside web addresses (Nov 6 2026, Larry: "use that option for outside links too") ----
  function cleanUrl(u){
    u=String(u||'').trim();
    if(/^www\./i.test(u)) u='https://'+u;
    return /^https?:\/\/\S+$/i.test(u) ? u : null;
  }
  function hostOf(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return u; } }
  function openWeb(url){
    var u=cleanUrl(url); if(!u) return;
    window.open(u, '_blank', 'noopener');
  }
  async function setWebLink(ideaId, slot, url, title, thumb){
    var c=sb(); if(!c) throw new Error('not signed in');
    var r=await c.from('card_links').upsert({idea_id:ideaId, slot:slot, target_idea_id:null, board_kind:null, url:url, url_title:title||null, url_thumb:thumb||null}, {onConflict:'idea_id,slot'});
    if(r.error) throw r.error;
    var cur=Object.assign(none(), cache[ideaId]||{}); cur[slot]={url:url, title:title||null, thumb:thumb||null}; cache[ideaId]=cur;
  }
  // Pasted web address -> the card's first free LINK slot. Returns the slot number, or 0 when all three are taken (said quietly).
  async function addWeb(ideaId, rawUrl){
    var url=cleanUrl(rawUrl); if(!url || !ideaId) return 0;
    var l=await get(ideaId, true), slot=0;
    // Nov 6 2026: LINK 3 is the free slot (1 and 2 carry the VISION and PLAN defaults), so a pasted address fills 3 first.
    [3,2,1].forEach(function(sl){ if(!slot && !l[sl]) slot=sl; });
    if(!slot){ toast('All three links are used. Remove one to add another.'); return 0; }
    var title=null, thumb=null;
    try{
      var meta=(window.T2TMedia && T2TMedia.resolveOEmbed) ? await tmo(T2TMedia.resolveOEmbed(url), 6000) : null;
      if(meta){ title=meta.title||null; thumb=meta.thumbnail_url||null; }
    }catch(e){}
    await setWebLink(ideaId, slot, url, title||hostOf(url), thumb);
    return slot;
  }
  function kindLabel(kind){ return (window.IDBand && IDBand.boardName) ? IDBand.boardName(kind) : kind; }

  // ---- THE DEFAULT LINKS (Nov 6 2026, Larry: "look before you leap, only build if nothing exists") ----
  // LINK 1 (green) = the card's SUBJECT as a header: it opens the VISION board of the topic that header sits in, with the header there as a column
  // (Nov 6 2026, Larry: not an empty screen of its own). LINK 2 (orange) = that same header's own PLAN board.
  // LINK 3 (pink) has no default: it goes anywhere you point it. One header serves both defaults.
  // Clicking a default arrow looks for a header with that SUBJECT first, and only builds one (in the card's own topic) when none exists.
  // Nothing is built until the click, so a card never leaves empty headers behind.
  var DEFAULT_KIND={1:'IDEA', 2:'PLAN'};   // IDEA is the VISION board's kind value
  function plainName(s){ return String(s==null?'':s).replace(/[%_\\,()*]/g,' ').replace(/\s+/g,' ').trim().toLowerCase(); }
  // The header already carrying this SUBJECT, or null. Only this member's own headers; the one under the card's topic wins, else the oldest.
  async function findHeaderBySubject(subject, nearTopicId){
    var c=sb(), want=plainName(subject);
    if(!c || !want) return null;
    var uid=null;
    try{ var u=await tmo(c.auth.getUser(), 6000); uid=(u && u.data && u.data.user && u.data.user.id) || null; }catch(e){}
    var like='*'+want+'*';
    var q=c.from('ideas').select('id,subject,text_content,cluster_id,created_at').eq('content_type','header').or('subject.ilike.'+like+',text_content.ilike.'+like);
    if(uid) q=q.eq('user_id', uid);
    var r=await tmo(q.limit(60));
    if(r.error || !r.data) return null;
    var rows=r.data;
    if(window.T2TPlan && T2TPlan.withoutContainers){ try{ rows=T2TPlan.withoutContainers(rows); }catch(e){} }   // a PLAN's own container rows are not subjects
    rows=rows.filter(function(x){ return plainName(titleOf(x))===want; });
    if(!rows.length) return null;
    rows.sort(function(a,b){
      var an=(nearTopicId && a.cluster_id===nearTopicId)?0:1, bn=(nearTopicId && b.cluster_id===nearTopicId)?0:1;
      if(an!==bn) return an-bn;
      return String(a.created_at||'').localeCompare(String(b.created_at||''));
    });
    return rows[0];
  }
  // {id, built}: the existing header for this SUBJECT, or a new one made under the card's own topic (MASTER when the card has none).
  async function headerForSubject(subject, parentId){
    var found=await findHeaderBySubject(subject, parentId);
    if(found) return {id:found.id, built:false, parentId:found.cluster_id||null};
    if(!window.T2TData || !T2TData.createHeader) throw new Error('headers are not available yet');
    var parent=parentId;
    if(!parent && T2TData.ensureIdeaStoryboardsRoot) parent=await T2TData.ensureIdeaStoryboardsRoot();
    var row=await T2TData.createHeader(String(subject).trim(), parent||null);
    // The board that opens next draws its columns from the storyboard's own list of rows, so the new header is handed to it now.
    if(window.T2TStoryboard && T2TStoryboard.noteRow){ try{ T2TStoryboard.noteRow(row); }catch(e){} }
    return {id:row.id, built:true, parentId:parent||null};
  }

  // ---- travelling ----
  function boardKindHere(){
    if(window._sboardIsPlanBoard) return 'PLAN';
    if(window._sboardIsShareBoard) return 'SHARE';
    return 'IDEA';
  }
  // The place we are standing, so RETURN can bring us back. fromKind 'BB' = a Briefing Board card; anything else = a Story/Vision/Plan board.
  function hereFor(fromKind){
    if(fromKind==='BB'){
      var topic=null;
      try{ topic=(window.FGBBGoThere && FGBBGoThere.returnProjectId) ? FGBBGoThere.returnProjectId() : null; }catch(e){}
      return {kind:'BRIEFING BOARD', topicId:topic};
    }
    return {kind:boardKindHere(), topicId:(window.T2TShared && T2TShared.currentTopicId) || null};
  }
  var jumping=false;
  // The TOPIC chips of the boards, in the order they are looked for: the glow lands on the topic a link names when it is the board you arrive on.
  var TOPIC_BOXES=['#sc-topic-box','#isx-topic-box','#hub-topic-box','#bb-topic-hit'];
  // o = {slot, topicId, kind, fromKind, cardId (the card the link was followed from, so RETURN can glow it), glowHeaderId (a header column to glow instead of the topic)}
  async function jump(o){
    if(jumping || !o || !o.topicId || !o.kind) return;
    jumping=true;
    try{
      if(!window.IDBand || !IDBand.goToBoard){ toast('That place did not open. Try again in a moment.'); return; }
      var here=hereFor(o.fromKind);
      // A link to a VISION board that did not come straight from building a header (the saved arrow, the one on the card's face): the card's own SUBJECT header
      // in that topic is still what you came to find, so it gets the glow too (Nov 6 2026, Larry: "the header needs to blink and glow more than the topic").
      if(o.kind==='IDEA' && !o.glowHeaderId && o.cardId){
        try{
          var c0=sb();
          var rr=c0 ? await tmo(c0.from('ideas').select('subject,text_content').eq('id', o.cardId).limit(1), 6000) : null;
          var card0=rr && rr.data && rr.data[0];
          var h0=card0 ? await findHeaderBySubject(titleOf(card0), o.topicId) : null;
          if(h0 && String(h0.cluster_id)===String(o.topicId)) o.glowHeaderId=h0.id;
          // Nov 7 2026, Larry: a link picked by hand into a topic must also leave the card's SUBJECT there as a header column, glowing.
          // Look before you leap: only built when this topic has no header of that SUBJECT yet.
          else if(card0 && window.T2TData && T2TData.createHeader){
            var made=await T2TData.createHeader(titleOf(card0), o.topicId);
            if(made && made.id){
              if(window.T2TStoryboard && T2TStoryboard.noteRow){ try{ T2TStoryboard.noteRow(made); }catch(e){} }
              o.glowHeaderId=made.id;
            }
          }
        }catch(e){ console.error('Links: could not add the SUBJECT header', e); }
      }
      // The card back you followed the link from closes first, so the place you land on is what you see.
      try{
        if(o.fromKind==='BB' && typeof closeCardDetail==='function') closeCardDetail();
        else if(o.fromKind==='SB' && typeof closeSbDetail==='function') closeSbDetail();
      }catch(e){}
      // The single remembered stop, in this link's color. Any later manual topic or board switch replaces it (IDBand.recordReturn clears the color).
      // The card you left from is remembered too: RETURN glows it when you land back (Nov 6 2026, Larry).
      if(here.topicId) IDBand.recordReturn(here.kind, here.topicId, COLORS[o.slot]||null, o.cardId||null);
      var ok=await IDBand.goToBoard(o.kind, o.topicId);
      if(ok===false){ toast('That place did not open. Try again in a moment.'); return; }
      if(IDBand.paintReturn) IDBand.paintReturn();
      // Every LINK glows what it names (Nov 6 2026, Larry): a header column when the link goes to a header on that board, otherwise the TOPIC itself.
      if(window.FGGlow){
        // A header is the thing to find, so it blinks and glows harder than the topic; the topic glows plainly when it IS the target.
        var sels=TOPIC_BOXES, strong=false;
        if(o.glowHeaderId){ try{ sels=['[data-header-id="'+CSS.escape(String(o.glowHeaderId))+'"]']; strong=true; }catch(e){} }
        FGGlow.show(sels, {strong:strong});
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
  // cfg = {cardId(): id of the card now open, cardTopic(): the topic the card is filed under, fromKind:'BB'|'SB', theme:'bb'|'idea', getHidden(), setHidden(arr)}.
  // A check box in the OPTIONS list opens the three links on the RIGHT, like every other option (Nov 1 2026, Larry); (Nov 11 2026: the eyeball is gone) the
  // active arrows also show on the card front. The first time it opens, LINK 1's TOPIC already names the topic the card is in.
  function injectRowStyle(){
    if(document.getElementById('fg-links-pop-style')) return;
    var st=document.createElement('style'); st.id='fg-links-pop-style';
    st.textContent=''
      +'.fg-link-body{width:100%;box-sizing:border-box;padding:2px 0 6px;color:var(--bb-ink)}'
      +'.fg-link-body-title{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}'
      +'.fg-link-pop-row{display:flex;align-items:center;gap:6px;margin:6px 0}'
      +'.fg-link-pop-btn{flex:1 1 0;min-width:0;cursor:pointer;background:#f7f4ee;border:1px solid #d8cdb6;border-radius:6px;padding:5px 8px;font:inherit;font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#3B2510;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.fg-link-pop-btn.fg-empty{opacity:.55;font-weight:400}'
      +'.fg-link-pop-btn:hover{background:#efe7d6}'
      +'.fg-link-pop-x{cursor:pointer;background:transparent;border:0;font-size:13px;color:#7a6040;padding:2px 4px}'
      +'.fg-link-hint{font-size:11px;opacity:.7;margin:2px 0 0 28px}'
      +'.fg-link-face{display:inline-flex;gap:3px;align-items:center;pointer-events:auto}'
      +'.fg-link-face-btn{width:16px;height:16px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer}';
    document.head.appendChild(st);
  }

  function buildRow(cfg){
    injectStyle(); injectRowStyle();
    var row=document.createElement('div'); row.className='fg-fixed-row fg-link-row';
    var lab=document.createElement('label'); lab.title='Opens your three links';
    var cb=document.createElement('input'); cb.type='checkbox';
    var tx=document.createElement('span'); tx.textContent='Link'; lab.appendChild(cb); lab.appendChild(tx); row.appendChild(lab);
    var mini=document.createElement('span'); mini.className='fg-link-mini'; mini.style.cssText='display:inline-flex;gap:2px;align-items:center'; row.appendChild(mini);
    var note=document.createElement('span'); note.className='fg-link-note'; row.appendChild(note);

    var body=document.createElement('div'); body.className='fg-link-body'; body.style.display='none';
    body.addEventListener('dblclick', function(e){ e.stopPropagation(); });
    row.__body=body;
    var isOpen=false, draft={}, drawn=null, paintSeq=0;

    // No eyeball (Nov 11 2026, Larry): active arrows always show on the front. A card that was set back-only before is put right here, once.
    function paintEye(){
      var hidden=(cfg.getHidden && cfg.getHidden())||[], i=hidden.indexOf('link');
      if(i>=0 && cfg.setHidden){ var cur=hidden.slice(); cur.splice(i,1); cfg.setHidden(cur); setTimeout(function(){ paintFaces(document, cfg.isHidden); }, 50); }
    }

    // What a slot holds right now: the saved link, or the half-made one (a topic with no board yet).
    function view(l, sl){ return draft[sl] || l[sl] || null; }
    async function paint(){
      var id=cfg.cardId && cfg.cardId(); if(!id) return;
      var mine=++paintSeq;
      var l=await get(id, true);
      if(mine!==paintSeq) return;
      note.textContent = tableMissing ? 'needs one database step' : '';
      var any=false; mini.innerHTML='';
      [1,2,3].forEach(function(sl){ if(l[sl]){ any=true; mini.insertAdjacentHTML('beforeend', arrowSVG(sl,14)); } });
      cb.checked=any || isOpen;
      paintEye();
      if(isOpen) drawBody(l);
    }
    row.__paint=function(){ draft={}; isOpen=false; body.style.display='none'; paint(); };

    // ---- the three links, each with a TOPIC and a BOARD picker like the ID BAND ----
    function drawBody(l){
      var id=cfg.cardId && cfg.cardId(); if(!id) return;
      body.innerHTML='<div class="fg-link-body-title">Links</div>';
      var theme=cfg.theme||'bb';
      [1,2,3].forEach(function(sl){
        var saved=l[sl]||null;
        if(saved && saved.url){
          // A web address: the arrow and its title open it in a new tab; the ✕ removes it.
          var wline=document.createElement('div'); wline.className='fg-link-pop-row';
          var warrow=document.createElement('span'); warrow.style.cssText='flex:0 0 auto;display:inline-flex;cursor:pointer'; warrow.title=NAMES[sl]+': click to open the web page'; warrow.innerHTML=arrowSVG(sl,22);
          var wtitle=document.createElement('button'); wtitle.type='button'; wtitle.className='fg-link-pop-btn'; wtitle.style.textTransform='none'; wtitle.style.fontWeight='400';
          wtitle.textContent='🌐 '+(saved.title||hostOf(saved.url)); wtitle.title=saved.url;
          var wx=document.createElement('button'); wx.type='button'; wx.className='fg-link-pop-x'; wx.textContent='✕'; wx.title='Remove '+NAMES[sl];
          wline.appendChild(warrow); wline.appendChild(wtitle); wline.appendChild(wx); body.appendChild(wline);
          warrow.addEventListener('click', function(e){ e.stopPropagation(); openWeb(saved.url); });
          wtitle.addEventListener('click', function(e){ e.stopPropagation(); openWeb(saved.url); });
          wx.addEventListener('click', async function(e){
            e.stopPropagation();
            try{ await setLink(id, sl, null); }catch(err){ toast('The link did not remove. Try again.'); return; }
            paint(); paintFaces(document, cfg.isHidden);
          });
          return;
        }
        var line=document.createElement('div'); line.className='fg-link-pop-row';
        var arrow=document.createElement('span'); arrow.style.cssText='flex:0 0 auto;display:inline-flex;cursor:pointer'; arrow.title=NAMES[sl]+': click to jump';
        var tb=document.createElement('button'); tb.type='button'; tb.className='fg-link-pop-btn';
        var kb=document.createElement('button'); kb.type='button'; kb.className='fg-link-pop-btn'; kb.style.flex='0 1 110px';
        var xb=document.createElement('button'); xb.type='button'; xb.className='fg-link-pop-x'; xb.textContent='✕'; xb.title='Remove '+NAMES[sl];
        line.appendChild(arrow); line.appendChild(tb); line.appendChild(kb); line.appendChild(xb); body.appendChild(line);
        // Nov 6 2026: an empty LINK 1 or 2 shows its default (this card's SUBJECT on the VISION or PLAN board); the arrow stays dim until clicked.
        var dflt=(!saved && !draft[sl] && DEFAULT_KIND[sl]) ? {topic:null, kind:DEFAULT_KIND[sl]} : null;
        var subj=String((cfg.cardSubject && cfg.cardSubject())||'').trim();
        var v=draft[sl]||saved||dflt;
        arrow.innerHTML=arrowSVG(sl,22,!saved);
        // The first field is always the TOPIC the arrow opens, as everywhere else (Nov 6 2026, Larry). Green: the card's own topic (its VISION board);
        // orange: the subject's own header, because that header holds the subject's PLAN board.
        var homeId=cfg.cardTopic && cfg.cardTopic();
        tb.classList.toggle('fg-empty', dflt ? (sl===2 && !subj) : !(v&&v.topic)); kb.classList.toggle('fg-empty', !(v&&v.kind));
        tb.textContent=(v&&v.topic)?'…':(dflt ? (sl===1 ? (homeId?'…':'MASTER') : (subj||'SUBJECT')) : 'TOPIC'); kb.textContent=(v&&v.kind)?kindLabel(v.kind):'BOARD';
        tb.title=dflt
          ? (sl===1 ? 'Opens this card’s topic on its VISION board, with the SUBJECT’s header there as a glowing column (made if there is none yet). Click here to point the link somewhere else.'
                    : 'Opens the SUBJECT’s own PLAN board (its header is made if there is none yet). Click here to point the link somewhere else.')
          : 'Which topic this link goes to';
        kb.title='Which board of that topic';
        if(dflt && sl===1 && homeId) describe(homeId).then(function(d){ if(tb.isConnected) tb.textContent=(d && d.title)||'TOPIC'; });
        xb.style.visibility=(!dflt && v&&(v.topic||v.kind))?'visible':'hidden';   // a default has nothing to remove
        if(v && v.topic) describe(v.topic).then(function(d){ if(tb.isConnected){ tb.textContent=((d && d.title)||'(topic)'); tb.title=tb.textContent; } });

        async function commit(topic, kind){
          if(!topic || !kind){ draft[sl]={topic:topic||null, kind:kind||null}; drawBody(await get(id)); return; }   // half-made: shown, not saved yet
          try{ await setLink(id, sl, topic, kind); }
          catch(e){ console.error('Links: save failed', e); toast(tableMissing?'LINK needs one database step first.':'The link did not save. Try again.'); return; }
          delete draft[sl]; paint(); paintFaces(document, cfg.isHidden);
        }
        // A default arrow: look for the SUBJECT's header, build it only if none exists, save the link, and go there.
        async function activateDefault(){
          if(!subj){ toast('Give this card a SUBJECT first.'); return; }
          var res;
          try{ res=await headerForSubject(subj, cfg.cardTopic && cfg.cardTopic()); }
          catch(err){ console.error('Links: could not find or make the header', err); toast('That header could not be made. Try again.'); return; }
          // VISION opens the topic the header sits in, where the header shows as a column ready for cards (never an empty screen of its own);
          // PLAN opens the subject's own PLAN board.
          var target=(dflt.kind==='IDEA' && res.parentId) ? res.parentId : res.id;
          try{ await setLink(id, sl, target, dflt.kind); }
          catch(err){ console.error('Links: save failed', err); toast(tableMissing?'LINK needs one database step first.':'The link did not save. Try again.'); return; }
          paint(); paintFaces(document, cfg.isHidden);
          jump({slot:sl, topicId:target, kind:dflt.kind, fromKind:cfg.fromKind, cardId:id, glowHeaderId:(dflt.kind==='IDEA' ? res.id : null)});   // VISION: the glow lands on the header's column
        }
        arrow.addEventListener('click', function(e){
          e.stopPropagation();
          if(!saved){ if(dflt) activateDefault(); return; }
          jump({slot:sl, topicId:saved.topic, kind:saved.kind, fromKind:cfg.fromKind, cardId:id});
        });
        tb.addEventListener('click', function(e){
          e.stopPropagation();
          if(!window.FGCardBack) return;
          // Nov 6 2026 (Larry: "always (+) option"): every TOPIC picker here ends in the dashed (+), the same shared add every TOPIC list uses.
          // The new header goes under the card's own topic (or wherever you open the list to); the link then points at it, on VISION unless a board is already chosen.
          FGCardBack.openTopicMenu(tb, {theme:theme, sb:sb(), hereId:(v&&v.topic)||null, excludeId:null, allowRoot:true,
            addParentId:(cfg.cardTopic && cfg.cardTopic())||undefined,
            onAdded:function(row){ commit(row.id, (v&&v.kind)||'IDEA'); },
            onPick:function(hid){ commit(hid, v&&v.kind); }});
        });
        kb.addEventListener('click', function(e){
          e.stopPropagation();
          if(!window.FGCardBack) return;
          FGCardBack.openKindMenu(kb, {theme:theme, current:(v&&v.kind)||null, onPick:function(k){ commit(v&&v.topic, k.value); }});
        });
        xb.addEventListener('click', async function(e){
          e.stopPropagation();
          delete draft[sl];
          if(saved){ try{ await setLink(id, sl, null); }catch(err){ toast('The link did not remove. Try again.'); return; } paint(); paintFaces(document, cfg.isHidden); }
          else drawBody(await get(id));
        });
      });
      // Nov 6 2026 (Larry): "very SIMPLE: copy and paste" -- one box takes a web address for the next free link.
      var web=document.createElement('input'); web.type='text'; web.className='fg-link-web'; web.placeholder='Or paste a web address here…';
      web.style.cssText='width:100%;box-sizing:border-box;margin:6px 0 2px;padding:5px 8px;border:1px solid #d8cdb6;border-radius:6px;font:inherit;font-size:calc(12px * var(--fg-text-scale,1));background:#fff;color:#3B2510';
      web.addEventListener('mousedown', function(e){ e.stopPropagation(); });
      web.addEventListener('dblclick', function(e){ e.stopPropagation(); });
      async function takeWeb(){
        var raw=web.value; if(!cleanUrl(raw)){ if(raw.trim()) toast('That does not look like a web address.'); return; }
        web.disabled=true;
        try{ await addWeb(id, raw); }catch(err){ console.error('Links: web address did not save', err); toast(tableMissing?'LINK needs one database step first.':'The link did not save. Try again.'); }
        web.disabled=false; web.value='';
        paint(); paintFaces(document, cfg.isHidden);
      }
      web.addEventListener('paste', function(e){ setTimeout(takeWeb, 0); });
      web.addEventListener('keydown', function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); takeWeb(); } });
      body.appendChild(web);
      var hint=document.createElement('div'); hint.className='fg-link-hint'; hint.textContent='Click a dim arrow: green opens this topic’s VISION with the subject’s header glowing (made if missing), orange opens the subject’s own PLAN. Pink is yours: any topic and board, or a pasted web address.'; body.appendChild(hint);
    }

    cb.addEventListener('click', async function(e){
      e.preventDefault(); e.stopPropagation();
      isOpen=!isOpen;
      body.style.display=isOpen?'':'none';
      if(isOpen){
        var id=cfg.cardId && cfg.cardId(), l=id ? await get(id) : none();
        // Nov 6 2026: no prefill any more. An empty LINK 1 and LINK 2 show their VISION and PLAN defaults (see drawBody); LINK 3 starts empty.
        drawBody(l);
      }
      cb.checked = isOpen || !!mini.firstChild;
    });
    paint();
    return row;
  }
  // ---- the active arrows on a card's front ----
  // root = the board element after it draws; isHidden(cardId) = true when the card's LINK is back-only. Cards are found by data-id.
  async function paintFaces(root, isHidden){
    root=root||document;
    var cards=Array.prototype.slice.call(root.querySelectorAll('.bb-card[data-id], .sc-tile[data-idea-id]'));
    if(!cards.length) return;
    function idOf(el){ return el.getAttribute('data-id')||el.getAttribute('data-idea-id'); }
    var ids=cards.map(idOf);
    await getMany(ids);
    cards.forEach(function(el){
      var id=idOf(el), isTile=el.classList.contains('sc-tile'), old=el.querySelector(':scope > .fg-link-face, :scope > .bb-key-badges > .fg-link-face'); if(old) old.remove();
      var l=cache[id]; if(!l) return;   // the read failed or is still pending: leave the tile unmarked so it is tried again
      if(!isTile && isHidden && isHidden(id)) return;
      var active=[1,2,3].filter(function(sl){ return l[sl]; });
      if(isTile) el.setAttribute('data-lnk', active.map(function(sl){ return sl+':'+(l[sl].url||(l[sl].topic+l[sl].kind)); }).join('|')||'0');
      if(!active.length) return;
      injectStyle(); injectRowStyle();
      var wrap=document.createElement('span'); wrap.className='fg-link-face';
      active.forEach(function(sl){
        var b=document.createElement('button'); b.type='button'; b.className='fg-link-face-btn'; b.innerHTML=arrowSVG(sl,14);
        b.title=l[sl].url ? (NAMES[sl]+': click to open '+(l[sl].title||hostOf(l[sl].url))) : (NAMES[sl]+': click to jump');
        b.addEventListener('mousedown', function(e){ e.stopPropagation(); });
        b.addEventListener('dblclick', function(e){ e.stopPropagation(); });
        b.addEventListener('click', function(e){
          e.stopPropagation();
          if(l[sl].url){ openWeb(l[sl].url); return; }
          jump({slot:sl, topicId:l[sl].topic, kind:l[sl].kind, fromKind:isTile?'SB':'BB', cardId:id});
        });
        wrap.appendChild(b);
      });
      if(isTile){
        // story / vision tiles: the arrows sit in the bottom-right corner of the face
        wrap.style.cssText='position:absolute;right:3px;bottom:2px;z-index:5';
        el.appendChild(wrap);
        return;
      }
      var box=el.querySelector('.bb-key-badges');
      if(!box){ box=document.createElement('div'); box.className='bb-key-badges'; el.appendChild(box); }
      box.appendChild(wrap);
    });
  }
  // Story / vision boards draw their tiles in many places: watch for new tiles and give each its arrows (one place, no hooks in the tile code).
  (function watchTiles(){
    var timer=null;
    var tries=0;
    function run(){
      timer=null;
      if(!document.querySelector('#sc-board-wrap .sc-tile[data-idea-id]:not([data-lnk])')){ tries=0; return; }
      Promise.resolve(paintFaces(document.getElementById('sc-board-wrap'))).then(function(){
        if(document.querySelector('#sc-board-wrap .sc-tile[data-idea-id]:not([data-lnk])') && ++tries<4) timer=setTimeout(run, 3000); else tries=0;
      }, function(e){
        // the database was slow or busy: try again a few times rather than leave the tiles bare
        if(++tries<4) timer=setTimeout(run, 3000); else tries=0;
      });
    }
    try{
      new MutationObserver(function(){ if(!timer) timer=setTimeout(run, 250); }).observe(document.documentElement, {childList:true, subtree:true});
    }catch(e){}
  })();
  // ---- PASTE or DROP on a card back (Nov 6 2026, Larry: "very SIMPLE: copy and paste an image or a link") ----
  // A picture (file, or a link to a picture/GIF, Giphy and Tenor pages too) becomes the card's picture. Any other web address goes to the card's next free LINK slot.
  // Only a LONE address is taken over; a sentence that happens to hold a link still types normally.
  var IMG_EXT=/\.(gif|png|jpe?g|webp|avif|svg)(\?[^#]*)?(#.*)?$/i;
  var IMG_HOSTS=/^(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com|i\.imgur\.com|images\.unsplash\.com|upload\.wikimedia\.org)$/i;
  function classify(raw){
    var u=cleanUrl(raw), host='', path='';
    if(!u) return null;
    try{ var p=new URL(u); host=p.hostname.toLowerCase(); path=p.pathname; }catch(e){ return null; }
    if(IMG_EXT.test(u) || IMG_HOSTS.test(host)) return {kind:'picture', url:u};
    if(/(^|\.)giphy\.com$/.test(host)){
      var g=/\/(?:gifs|stickers|clips)\/(?:[^\/?#]*-)?([A-Za-z0-9]+)\/?$/.exec(path);
      if(g) return {kind:'picture', url:'https://media.giphy.com/media/'+g[1]+'/giphy.gif', source:u};
    }
    if(/(^|\.)tenor\.com$/.test(host) && /\/view\//.test(path)) return {kind:'page-picture', url:u};
    return {kind:'link', url:u};
  }
  // o = {cardId(), setPicture(url, sourceUrl) | null, afterLink()}
  async function takeUrl(o, c){
    try{
      // Larry, Nov 6 2026: "I do not like the link to the entire page" -- the card keeps the ONE GIF, not the page it came from.
      if(c.kind==='picture' && o.setPicture){ await o.setPicture(c.url, null); return; }
      if(c.kind==='page-picture' && o.setPicture){
        // A Tenor page: the browser may not read it, so a small lookup (the gif-link-resolver function) finds that page's own GIF.
        var img=null;
        try{
          var res=await tmo(sb().functions.invoke('gif-link-resolver', {body:{url:c.url}}), 12000);
          img=res && res.data && res.data.image || null;
        }catch(e){ console.error('Links: GIF lookup failed', e); }
        if(img){ await o.setPicture(img, null); return; }
        toast('That GIF could not be read. Right-click the GIF, choose Copy image address, and paste that.');
        return;
      }
      var slot=await addWeb(o.cardId(), c.url);
      if(slot){ toast('Saved as '+NAMES[slot]+'.'); if(o.afterLink) o.afterLink(); }
    }catch(err){ console.error('Links: paste failed', err); toast('That did not save. Try again.'); }
  }
  // o = {root: the card back element, dropZone: element that takes drops (default root), cardId(), sendFile(file) | null, setPicture(url, sourceUrl) | null, afterLink()}
  function wirePaste(o){
    if(!o || !o.root) return;
    function onPaste(e){
      if(!o.root.isConnected){ document.removeEventListener('paste', onPaste, true); return; }   // that card back closed
      var t=e.target, typing=t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if(typing && t.id!=='sb-text-input') return;   // other boxes (subject, notes, the link box) keep their own paste
      var cd=e.clipboardData; if(!cd) return;
      var items=cd.items||[];
      for(var i=0;i<items.length;i++){
        if(items[i].kind==='file' && /^image\//.test(items[i].type||'')){
          var f=items[i].getAsFile();
          if(f && o.sendFile){ e.preventDefault(); e.stopPropagation(); o.sendFile(f); return; }
        }
      }
      var text=String(cd.getData('text/plain')||'').trim();
      if(!text || /\s/.test(text)) return;
      var c=classify(text); if(!c) return;
      e.preventDefault(); e.stopPropagation();
      takeUrl(o, c);
    }
    document.addEventListener('paste', onPaste, true);
    var zone=(o.dropZone && o.dropZone()) || o.root;
    zone.addEventListener('dragover', function(e){
      var ty=(e.dataTransfer && e.dataTransfer.types) ? Array.prototype.slice.call(e.dataTransfer.types) : [];
      if(ty.indexOf('Files')>=0 || ty.indexOf('text/uri-list')>=0) e.preventDefault();
    });
    zone.addEventListener('drop', function(e){
      var dt=e.dataTransfer; if(!dt) return;
      var file=dt.files && dt.files[0];
      if(file && /^image\//.test(file.type||'') && o.sendFile){ e.preventDefault(); e.stopPropagation(); o.sendFile(file); return; }
      var c=classify(String(dt.getData('text/uri-list')||dt.getData('text/plain')||'').split('\n')[0].trim());
      if(c){ e.preventDefault(); e.stopPropagation(); takeUrl(o, c); }
    });
  }
  window.T2TLinks={COLORS:COLORS, arrowSVG:arrowSVG, addWeb:addWeb, openWeb:openWeb, classify:classify, wirePaste:wirePaste, buildRow:buildRow, paintFaces:paintFaces, get:get, set:setLink, jump:jump, find:find, pickTarget:pickTarget, describe:describe, forget:function(id){ if(id) delete info[id]; else info={}; }};
})();
