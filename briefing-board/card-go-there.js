/* ============================================================
   card-go-there.js -- T2T Field Guide - GO THERE (task card back -> its workspace) and the GLOW that marks where you started

   Oct 24 2026 (Larry): every task back looks the same. To the right of the HEADER sits the WORKSPACE board type selector: the task's badge (VISION, PLAN or SEA OF
   IDEAS) is its default board, or empty when it has none. Click the chip for the board type dropdown (same list as the ID BAND); picking one goes there and
   makes the task's own header on that board if it has none. A magnifying glass beside the chip (tooltip: Go to <board>) jumps straight to the default.
   A Hang Up hides its HEADER row (its TOPIC is the thing), so there the buttons sit beside the TOPIC.
   The RETURN button on every board already jumps back here (IDBand.recordReturn / jumpToRecorded), so GO THERE only records the Briefing Board
   as the place to return to. The card you left from GLOWS when you land back: the glow stays until you click anything else on the Briefing
   Board (or the glowing card). It lives in the page's memory only, so it lasts for the current visit and never longer.

   Public surface: window.FGBBGoThere  .build(bbw)  .afterRender(wrap)
   Reads the Briefing Board's shared globals (_bbFindCardAnywhere, _bbOpenCardId, _bbShowToast, closeCardDetail, ...), same scope as its sibling files.
   ============================================================ */
(function(){
  var glowId=null;          // the card to glow when the Briefing Board is showing; null = none
  var scrollNext=false;     // scroll the glowing card into view once, on the first draw after coming back

  function injectStyle(){
    if(document.getElementById('fg-go-there-style')) return;
    var st=document.createElement('style'); st.id='fg-go-there-style';
    st.textContent=''
      +'.bb-card.bb-glow{outline:3px solid #f2b705;outline-offset:2px;box-shadow:0 0 0 5px rgba(242,183,5,.35),0 0 20px 8px rgba(242,183,5,.7);animation:fg-glow-pulse 2.4s ease-in-out infinite}'
      +'@keyframes fg-glow-pulse{0%,100%{box-shadow:0 0 0 5px rgba(242,183,5,.35),0 0 14px 5px rgba(242,183,5,.55)}50%{box-shadow:0 0 0 7px rgba(242,183,5,.4),0 0 24px 10px rgba(242,183,5,.85)}}'
      +'.fg-go-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:8px;align-items:end}'
      +'.fg-go-grid>label{grid-area:1/1}'
      +'.fg-go-grid>input{grid-area:2/1;min-width:0;margin:0!important}'
      +'.fg-go-grid>.fg-go-head{grid-area:1/2}'
      +'.fg-go-head{display:inline-flex;align-items:center;gap:4px;justify-content:flex-start}'
      +'.fg-go-grid>.fg-go-wrap{grid-area:2/2}'
      +'.fg-go-wrap{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto}'
      +'.fg-go-eyebrow{white-space:nowrap;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);pointer-events:none}'
      +'.fg-go-btn{display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;border:1px solid var(--bb-accent);border-radius:6px;padding:3px 5px;color:var(--bb-ink)}'
      +'.fg-go-btn svg{width:15px;height:15px}'
      +'.fg-go-chip{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;white-space:nowrap;flex:0 0 auto;cursor:pointer;background:#fff;border:1px dashed var(--bb-accent);border-radius:6px;padding:3px 10px;font:inherit;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.fg-go-chip.fg-go-has{border-style:solid;color:var(--bb-ink)}'
      +'.fg-go-menu{position:fixed;z-index:100000;min-width:150px;display:flex;flex-direction:column;background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);padding:4px}'
      +'.fg-go-item{display:flex;justify-content:space-between;gap:12px;cursor:pointer;background:transparent;border:0;padding:6px 8px;border-radius:5px;font:inherit;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#222;text-align:left}'
      +'.fg-go-item:hover{background:#eef3fb}'
      +'.fg-go-tick{color:#2d7a3d}';
    document.head.appendChild(st);
  }

  var GLASS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><line x1="15" y1="15" x2="21" y2="21"/></svg>';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Which workspaces does this task's badges point to? (VISION badge, PLAN badge, and a Hang Up's ISSUE work on the Sea of Ideas.)
  function workspacesOf(c){
    var out=[];
    if(!c) return out;
    if(c.needsVision) out.push({kind:'IDEA', label:'VISION'});
    if(c.needsPlan || c.goalHeaderId) out.push({kind:'PLAN', label:'PLAN'});
    if(c.col==='hangups') out.push({kind:'SEA', label:'SEA OF IDEAS'});
    else if(hasWs(c,'sea')) out.push({kind:'SEA', label:'SEA OF IDEAS'});
    if(hasWs(c,'story')) out.push({kind:'SHARE', label:'STORY'});
    if(hasWs(c,'journey')) out.push({kind:'CAST', label:'JOURNEY'});
    return out;
  }
  // Oct 24 2026 (Larry): every board type gets a badge. SEA, STORY and JOURNEY are remembered on the card as "ws:sea", "ws:story", "ws:journey" words in the
  // same comma list the eyes use (front_hidden), the same way COMPLETE is remembered as "done:<row>", so no new database column is needed.
  // VISION and PLAN keep their own flags. The eye key for each badge is the same word without "ws:" (sea, story, journey).
  var WS_WORD={SEA:'sea', SHARE:'story', CAST:'journey'};
  function hasWs(c, w){ return (','+String(c.frontHidden||'')+',').indexOf(',ws:'+w+',')>=0; }
  function rememberWs(c, kind, ad){
    var w=WS_WORD[kind];
    if(!w || hasWs(c,w)) return;
    var cur=String(c.frontHidden||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    cur.push('ws:'+w);
    c.frontHidden=cur.join(',');
    if(ad && ad.persistHidden) ad.persistHidden(c);
    else if(typeof _bbPersistMergedCardById==='function') _bbPersistMergedCardById(c.id);
  }

  // The place RETURN should bring us back to: the Briefing Board on the topic we are viewing now (same rule as the Board Type picker).
  function returnProjectId(){
    try{
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      return _bbSingleBoardMode() ? (_bbProjectFilter() || _bbIdeaStoryboardsRootId) : (board && board.storyboard_project_id);
    }catch(e){ return null; }
  }

  function setGlow(id){
    glowId=id; scrollNext=!!id;
    Array.prototype.forEach.call(document.querySelectorAll('.bb-card.bb-glow'), function(el){ el.classList.remove('bb-glow'); });
    if(id){
      var el=document.querySelector('.bb-card[data-id="'+String(id).replace(/"/g,'')+'"]');
      if(el) el.classList.add('bb-glow');
    }
  }
  function toast(m){ if(typeof _bbShowToast==='function') _bbShowToast(m); else if(typeof _sboardShowToast==='function') _sboardShowToast(m); }

  // Oct 26 2026 (Larry): GO THERE must LOOK for a task's workspace before it ever makes one. A new task's name changes while it is being built, and the old
  // name-only search missed it and made another workspace each time. The order now: (1) the workspace the card already remembers (by id, so a rename never loses
  // it); (2) the headers with the task's name under its topic: none = make one, one = use it, several = ASK which one (or make a new one); nothing is made unasked.
  var cancelled=false;   // set when the person closes the picker, so the caller stays quiet instead of saying the workspace failed

  // Every header named after the task, searched up to three levels under the card's topic (same reach as ensure_vision_header). A copy that sits inside
  // another match (a board that opened its own header of the same name inside) is not offered as a separate choice.
  async function matchingHeaders(sb, topicId, name){
    var found=[];
    try{
      if(!name) return found;
      var want=name.toLowerCase(), ids=[topicId];
      for(var d=0; d<3 && ids.length; d++){
        var r=await sb.from('ideas').select('id,subject,text_content,cluster_id,created_at').eq('content_type','header').in('cluster_id', ids);
        if(r.error || !r.data || !r.data.length) break;
        r.data.forEach(function(h){
          if(String(h.subject||'').trim().toLowerCase()===want || String(h.text_content||'').trim().toLowerCase()===want) found.push(h);
        });
        ids=r.data.map(function(h){ return h.id; });
      }
      var have={}; found.forEach(function(h){ have[h.id]=1; });
      found=found.filter(function(h){ return !have[h.cluster_id]; });
    }catch(e){ console.error('Briefing Board: could not find the task header', e); }
    return found;
  }

  // The picker shown when several workspaces share the task's name. Resolves to a header id, 'NEW' (make a new one) or null (closed).
  async function chooseWorkspace(sb, cands, name){
    var rows=await Promise.all(cands.map(async function(h){
      var n=0, parent='';
      try{ var k=await sb.from('ideas').select('id',{count:'exact',head:true}).eq('cluster_id',h.id).neq('content_type','header'); n=k.count||0; }catch(e){}
      try{ var p=await sb.from('ideas').select('subject,text_content').eq('id',h.cluster_id).limit(1); var pr=p.data&&p.data[0]; parent=pr?(String(pr.subject||'').trim()||String(pr.text_content||'').trim()):''; }catch(e){}
      return {id:h.id, n:n, parent:parent, made:h.created_at?String(h.created_at).slice(0,10):''};
    }));
    return new Promise(function(resolve){
      var ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px';
      var box=document.createElement('div');
      box.style.cssText='background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:420px;width:100%;max-height:80vh;overflow:auto;padding:16px;font-family:inherit;color:#222';
      var h='<div style="font-size:15px;font-weight:700;margin-bottom:4px">Which workspace?</div>'
        +'<div style="font-size:13px;color:#666;margin-bottom:10px">There is more than one workspace named “'+esc(name)+'”. Pick the one you want, or make a new one.</div>';
      rows.forEach(function(r){
        h+='<button type="button" data-ws="'+esc(r.id)+'" style="display:block;width:100%;text-align:left;cursor:pointer;background:#f7f4ee;border:1px solid #d8cdb6;border-radius:8px;padding:8px 10px;margin-bottom:6px;font:inherit;color:#222">'
          +'<span style="font-weight:700">'+esc(name)+'</span>'
          +'<span style="display:block;font-size:12px;color:#777">'+(r.parent?'in '+esc(r.parent)+' · ':'')+r.n+' card'+(r.n===1?'':'s')+(r.made?' · made '+esc(r.made):'')+'</span></button>';
      });
      h+='<button type="button" data-ws="NEW" style="display:block;width:100%;cursor:pointer;background:#fff;border:1px dashed #a88;border-radius:8px;padding:8px 10px;margin-bottom:6px;font:inherit;font-weight:700;color:#222">+ Make a new one</button>'
        +'<button type="button" data-ws="" style="display:block;margin:4px auto 0;cursor:pointer;background:transparent;border:0;font:inherit;font-size:12px;color:#777;text-decoration:underline">Cancel</button>';
      box.innerHTML=h; ov.appendChild(box); document.body.appendChild(ov);
      function done(v){ ov.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); }
      function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); done(null); } }
      document.addEventListener('keydown', onKey, true);
      ov.addEventListener('mousedown', function(e){ if(e.target===ov) done(null); });
      Array.prototype.forEach.call(box.querySelectorAll('button[data-ws]'), function(b){
        b.addEventListener('click', function(e){ e.stopPropagation(); done(b.getAttribute('data-ws')||null); });
      });
    });
  }

  async function makeHeader(sb, c, topicId, name){
    var me=await sb.from('ideas').select('user_id,project_id').eq('id', c.id).limit(1);
    var row=me && me.data && me.data[0];
    if(!row) return null;
    var ins=await window.T2TData.insertHeaderRow(name, topicId, {client:sb, userId:row.user_id, fields:{project_id:row.project_id, topic_scope_id:row.project_id}});
    if(ins.error){ console.error('Briefing Board: could not add the task header', ins.error); return null; }
    return (ins.data && ins.data.id) || null;
  }

  // The task's workspace header: the one it remembers, else the one named after it (asking when there are several), else a new one. null if none (or closed).
  async function ensureOwnHeader(sb, c, topicId, name){
    cancelled=false;
    try{
      var sv=await sb.from('task_fields').select('workspace_header_id').eq('idea_id', c.id).maybeSingle();
      var sid=sv && sv.data && sv.data.workspace_header_id;
      if(sid){
        var ex=await sb.from('ideas').select('id').eq('id', sid).eq('content_type','header').limit(1);
        if(ex.data && ex.data.length) return sid;
      }
    }catch(e){ console.error('Briefing Board: could not read the remembered workspace', e); }
    var cands=await matchingHeaders(sb, topicId, name);
    if(cands.length===1) return cands[0].id;
    if(cands.length>1){
      var pick=await chooseWorkspace(sb, cands, name);
      if(!pick){ cancelled=true; return null; }
      if(pick!=='NEW') return pick;
    }
    return makeHeader(sb, c, topicId, name);
  }

  // Go to a board type for this task. ws = {kind, label}. A task with no workspace there gets one (its own header on that board), and VISION / PLAN
  // also put their badge on the card, so the front always tells the truth about where the task has workspaces.
  async function go(c, ws, inst){
    if(inst && inst.adapter && inst.adapter.generic) return goGeneric(c, ws, inst.adapter);
    try{
      if(!window.IDBand || !IDBand.goToBoard){ toast('The workspace is not ready yet. Try again in a moment.'); return; }
      var sb=(typeof T==='function' && T().sb) || null;
      var isHang=(c.col==='hangups');
      if(isHang && typeof _bbEnsureHangupHeader==='function') await _bbEnsureHangupHeader(c);
      var topicId=c.projectHeaderId;
      if(!topicId){ toast('This task has no TOPIC yet.'); return; }
      var target=topicId;
      // A Hang Up's TOPIC already is its own header. Any other task opens on the header named after it (the task is the topic there).
      if(!isHang && sb){
        var name=String(c.subject||c.task||'').trim();
        if(!name){ toast('Give this task a header first.'); return; }
        if(ws.kind==='IDEA'){ try{ await sb.rpc('ensure_vision_header', {p_idea:c.id}); }catch(e){} c.needsVision=true; }
        var own=await ensureOwnHeader(sb, c, topicId, name);
        if(!own){ if(!cancelled) toast('That workspace did not open. Try again in a moment.'); return; }
        target=own;
        // Anchor the task to its workspace by id (Oct 24 2026): checking the topic finishes the task and finishing the task checks the topic, even after a rename.
        try{ await sb.from('task_fields').update({workspace_header_id:own}).eq('idea_id', c.id); }catch(e){ console.error('Briefing Board: workspace link save failed', e); }
        if(ws.kind==='PLAN' && !c.needsPlan && !c.goalHeaderId){
          c.needsPlan=true;
          try{ await sb.from('task_fields').update({needs_plan:true}).eq('idea_id', c.id); }catch(e){ console.error('Briefing Board: PLAN badge save failed', e); }
        }
        rememberWs(c, ws.kind);
        if(typeof _bbSaveLocal==='function' && typeof _bbCardsList==='function') _bbSaveLocal(_bbCardsList());
      }
      var back=returnProjectId();
      if(back) IDBand.recordReturn('BRIEFING BOARD', back);
      // Glow the card you are leaving from; it is still there when RETURN brings you back.
      if(typeof closeCardDetail==='function') closeCardDetail();
      if(typeof renderBoard==='function') renderBoard();
      setGlow(c.id);
      var ok;
      if(isHang && ws.kind==='SEA' && typeof _bbOpenHangupSea==='function'){ await _bbOpenHangupSea(c); ok=true; }
      else ok=await IDBand.goToBoard(ws.kind, target);
      if(ok===false){ setGlow(null); toast('That workspace did not open. Try again in a moment.'); }
    }catch(e){
      console.error('Briefing Board: GO THERE failed', e);
      setGlow(null); toast('That workspace did not open. Try again in a moment.');
    }
  }

  // Any other card back (the Story Board cards): same idea, no task bookkeeping. The card's workspace on a board type is the header named after it
  // under its TOPIC (a header card is its own workspace). The adapter says how to name it, how to leave the card, and where RETURN comes back to.
  async function goGeneric(c, ws, ad){
    try{
      if(!window.IDBand || !IDBand.goToBoard){ toast('The workspace is not ready yet. Try again in a moment.'); return; }
      var sb=(window.T2T && window.T2T.sb) || null;
      var target=null;
      if(ad.isHeader && ad.isHeader(c)) target=c.id;
      else{
        var topicId=ad.topicId(c), name=ad.nameOf(c);
        if(!topicId){ toast('This card has no TOPIC yet.'); return; }
        if(!name){ toast('Give this card a header first.'); return; }
        if(!sb){ toast('That workspace did not open. Try again in a moment.'); return; }
        if(ws.kind==='IDEA'){ try{ await sb.rpc('ensure_vision_header', {p_idea:c.id}); }catch(e){} }
        target=await ensureOwnHeader(sb, c, topicId, name);
        if(!target){ if(!cancelled) toast('That workspace did not open. Try again in a moment.'); return; }
      }
      rememberWs(c, ws.kind, ad);
      ad.leave(c);
      var ok=await IDBand.goToBoard(ws.kind, target);
      if(ok===false) toast('That workspace did not open. Try again in a moment.');
    }catch(e){
      console.error('GO THERE failed', e);
      toast('That workspace did not open. Try again in a moment.');
    }
  }

  // The board type dropdown: the same list the ID BAND offers, minus the board we are standing on. A tick marks the ones this task already has.
  var menuEl=null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } }
  function openMenu(anchor, c, have, inst){
    closeMenu();
    var kinds=(window.IDBand && IDBand.BOARD_KINDS ? IDBand.BOARD_KINDS : []).filter(function(k){ return k.value!=='BRIEFING BOARD'; });
    if(!kinds.length) return;
    menuEl=document.createElement('div'); menuEl.className='fg-go-menu';
    kinds.forEach(function(k){
      var on=have.some(function(w){ return w.kind===k.value; });
      var it=document.createElement('button'); it.type='button'; it.className='fg-go-item';
      it.innerHTML='<span>'+esc(k.label)+'</span>'+(on?'<span class="fg-go-tick">✓</span>':'');
      it.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); go(c, {kind:k.value, label:k.label}, inst); });
      menuEl.appendChild(it);
    });
    document.body.appendChild(menuEl);
    var r=anchor.getBoundingClientRect();
    menuEl.style.left=Math.max(8, Math.min(r.left, window.innerWidth-menuEl.offsetWidth-8))+'px';
    menuEl.style.top=(r.bottom+4)+'px';
  }
  document.addEventListener('mousedown', function(e){ if(menuEl && !menuEl.contains(e.target) && !(e.target.closest && e.target.closest('.fg-go-chip'))) closeMenu(); }, true);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeMenu(); }, true);

  // Right of the HEADER: the board type chip (the card's default workspace, or empty when it has none) and, when it has one, the magnifying glass.
  // One routine for every card back (Oct 24 2026: "HEADER / WORKSPACE row goes on all types of cards"). An INSTANCE is one card back's row:
  // {row, input, wrapEl, ebEl, headEl, adapter}. The Briefing Card back has one built once (below); a Story Board card back mounts its own each time it opens.
  // The ADAPTER tells the row about its card: getCard(), and for non-task cards (generic:true) topicId(c), nameOf(c), isHeader(c), persistHidden(c), leave(c), changed(c).
  // The selector and the glass copy the HEADER field's own box (height, border, corners, text) so they read as one row.
  function matchField(el, input, minW){
    try{
      if(!input || !input.offsetHeight) return;
      var cs=getComputedStyle(input);
      el.style.height=cs.height; el.style.boxSizing=cs.boxSizing;
      el.style.border=cs.border; el.style.borderRadius=cs.borderRadius; el.style.background=cs.backgroundColor||'#fff';
      el.style.fontSize=cs.fontSize; el.style.fontFamily=cs.fontFamily; el.style.color=cs.color;
      if(minW) el.style.minWidth=minW;
    }catch(e){}
  }
  function paint(inst){
    if(!inst || !inst.wrapEl) return;
    var ad=inst.adapter, wrapEl=inst.wrapEl, ebEl=inst.ebEl, headEl=inst.headEl, row=inst.row, input=inst.input;
    var c=ad.getCard();
    closeMenu();
    wrapEl.innerHTML='';
    while(headEl.lastChild && headEl.lastChild!==ebEl) headEl.removeChild(headEl.lastChild);
    if(!c){ wrapEl.style.display='none'; return; }
    wrapEl.style.display='';
    var list=workspacesOf(c), def=list[0]||null;
    // Right of the HEADER field, with WORKSPACE on the HEADER label's line. Every card type looks the same (Oct 24 2026).
    ebEl.className='fg-go-eyebrow';
    if(wrapEl.parentNode!==row) row.appendChild(wrapEl);
    if(headEl.parentNode!==row) row.appendChild(headEl);
    // WORKSPACE takes the HEADER label's own type so the two eyebrows match.
    try{
      var lab=row.querySelector('label');
      if(lab && lab.offsetHeight){
        var ls=getComputedStyle(lab);
        ['fontSize','fontWeight','letterSpacing','textTransform','color','lineHeight','fontFamily','marginBottom'].forEach(function(k){ ebEl.style[k]=ls[k]; });
      }
    }catch(e){}
    var chip=document.createElement('button'); chip.type='button'; chip.className='fg-go-chip'+(def?' fg-go-has':'');
    if(!def) chip.classList.add('fg-go-empty');
    chip.title='Workspace: choose a board type to go to, or to start one';
    chip.innerHTML=(def?'<span>'+esc(def.label)+'</span>':'')+'<span aria-hidden="true">▾</span>';
    chip.addEventListener('click', function(e){ e.stopPropagation(); if(menuEl) closeMenu(); else openMenu(chip, c, list, inst); });
    wrapEl.appendChild(chip);
    matchField(chip, input, '176px');   // Oct 28 2026 (Larry): wide enough for SEA OF IDEAS, the longest workspace name; the SUBJECT field gives up the room
    // The eyeball (on by default): shows this workspace's badge on the front of the card, or on the back only. Every board type has a front badge (Oct 24 2026).
    var eyeKey=def ? ({IDEA:'vision', PLAN:'plan', SEA:'sea', SHARE:'story', CAST:'journey'})[def.kind] : null;
    if(eyeKey && window.FGCardBackOptions){
      var eye=document.createElement('button'); eye.type='button'; eye.className='fg-back-eye fg-go-eye';
      var paintEye=function(){
        var hidden=FGCardBackOptions.parseHidden(c.frontHidden), off=hidden.indexOf(eyeKey)>=0, ic=FGCardBackOptions.eyeIcons;
        eye.innerHTML=ic ? (off ? ic.slash : ic.open) : (off ? '⊘' : '◉');
        eye.classList.toggle('fg-eye-off', off);
        eye.title=off ? 'Back only: click to also show the badge on the front' : 'Shows on the front: click for back only';
      };
      eye.addEventListener('click', function(e){
        e.stopPropagation();
        var cur=FGCardBackOptions.parseHidden(c.frontHidden).slice(), i=cur.indexOf(eyeKey);
        if(i>=0) cur.splice(i,1); else cur.push(eyeKey);
        c.frontHidden=cur.join(',');
        if(ad.generic){ ad.persistHidden(c); }
        else{
          if(typeof _bbSaveLocal==='function' && typeof _bbCardsList==='function') _bbSaveLocal(_bbCardsList());
          if(typeof _bbPersistMergedCardById==='function') _bbPersistMergedCardById(c.id);
          if(typeof renderBoard==='function') renderBoard();
        }
        paintEye();
      });
      paintEye();
      headEl.appendChild(eye);   // up by the WORKSPACE label, immediately right of the eyebrow (Oct 24 2026)
    }
    if(def){
      var b=document.createElement('button'); b.type='button'; b.className='fg-go-btn'; b.title='Go to '+def.label;
      b.setAttribute('aria-label','Go to '+def.label);
      b.innerHTML=GLASS;
      b.addEventListener('click', function(e){ e.stopPropagation(); go(c, def, inst); });
      wrapEl.appendChild(b);
      matchField(b, input, '');
      b.style.background='#fff'; b.style.padding='0 7px';
    } else {
      // Oct 24 2026 (Larry): no workspace picked yet -- the magnifying glass still shows, grayed out, so every card back has the same row.
      var g=document.createElement('button'); g.type='button'; g.className='fg-go-btn fg-go-btn-off'; g.disabled=true;
      g.title='Pick a workspace first'; g.setAttribute('aria-label','Pick a workspace first');
      g.innerHTML=GLASS;
      wrapEl.appendChild(g);
      matchField(g, input, '');
      g.style.background='#fff'; g.style.padding='0 7px'; g.style.opacity='0.35'; g.style.cursor='default';
    }
  }

  // Build the row into a field that holds a "Header" label and its input as direct children.
  function mountInto(row, input, adapter){
    if(!row || !input || row.querySelector('.fg-go-wrap')) return null;
    injectStyle();
    row.classList.add('fg-go-grid');
    var inst={row:row, input:input, adapter:adapter};
    inst.ebEl=document.createElement('span'); inst.ebEl.className='fg-go-eyebrow'; inst.ebEl.textContent='Workspace';
    inst.wrapEl=document.createElement('span'); inst.wrapEl.className='fg-go-wrap';
    inst.headEl=document.createElement('span'); inst.headEl.className='fg-go-head'; inst.headEl.appendChild(inst.ebEl);
    row.appendChild(inst.headEl); row.appendChild(inst.wrapEl);
    paint(inst);
    // A back that is built before it is on screen cannot measure its SUBJECT field yet, so the selector and glass would come out small.
    // Paint again once it is showing (Oct 24 2026, Larry: every card back's WORKSPACE row looks exactly like the task card's).
    var again=function(){ if(inst.row && inst.row.isConnected) paint(inst); };
    if(window.requestAnimationFrame) requestAnimationFrame(function(){ requestAnimationFrame(again); });
    setTimeout(again, 150);
    return inst;
  }

  // The Briefing Card back is built once and reused for every card.
  var bbInst=null;
  var bbAdapter={
    getCard:function(){ return (typeof _bbFindCardAnywhere==='function' && typeof _bbOpenCardId!=='undefined') ? _bbFindCardAnywhere(_bbOpenCardId) : null; }
  };
  function build(bbw){
    if(!bbw || bbw.querySelector('.fg-go-wrap')) return;
    bbInst=mountInto(bbw.querySelector('#bb-d-subject-row'), bbw.querySelector('#bb-d-subject'), bbAdapter);
    if(!bbInst) return;
    // A badge switched on or off while the back is open changes the buttons.
    bbw.addEventListener('change', function(){ setTimeout(function(){ paint(bbInst); }, 60); });
  }

  // Called at the end of every Briefing Board draw: the glow follows its card, and scrolls it into view once after coming back.
  function afterRender(wrap){
    if(!glowId || !wrap) return;
    var el=wrap.querySelector('.bb-card[data-id="'+String(glowId).replace(/"/g,'')+'"]');
    if(!el){ return; }
    el.classList.add('bb-glow');
    if(scrollNext){ scrollNext=false; try{ el.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(e){} }
  }

  // Any click on the Briefing Board (the glowing card included) puts the glow out. Clicks on other boards leave it alone.
  document.addEventListener('mousedown', function(e){
    if(!glowId) return;
    var wrap=document.getElementById('bb-board-wrap');
    if(!wrap || wrap.offsetParent===null) return;
    if(wrap.contains(e.target)) setGlow(null);
  }, true);

  // The Briefing Card back is reused for every card, so each time a card opens its row is painted again for that card.
  function refresh(){ setTimeout(function(){ paint(bbInst); }, 0); }

  // Another card back (Story Board cards) puts the same row on itself: FGBBGoThere.mount(fieldEl, headerInputEl, adapter).
  window.FGBBGoThere={ build:build, refresh:refresh, afterRender:afterRender, mount:mountInto };
})();
