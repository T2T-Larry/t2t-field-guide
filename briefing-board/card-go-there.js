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
      +'.fg-go-field{display:flex;align-items:center;gap:6px;width:100%}'
      +'.fg-go-field>input{flex:1 1 auto;min-width:0}'
      +'.fg-go-wrap{position:relative;display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;margin-left:6px}'
      +'.fg-go-eyebrow{position:absolute;left:0;bottom:100%;margin-bottom:2px;white-space:nowrap;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--bb-sub);pointer-events:none}'
      +'.fg-go-chip.fg-go-empty{min-width:44px;justify-content:center}'
      +'.fg-go-btn{display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;border:1px solid var(--bb-accent);border-radius:6px;padding:3px 5px;color:var(--bb-ink)}'
      +'.fg-go-btn svg{width:15px;height:15px}'
      +'.fg-go-chip{display:inline-flex;align-items:center;gap:4px;cursor:pointer;background:transparent;border:1px dashed var(--bb-accent);border-radius:6px;padding:3px 7px;font:inherit;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub)}'
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
    return out;
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
  function toast(m){ if(typeof _bbShowToast==='function') _bbShowToast(m); }

  // The header named after the task, searched up to three levels under the card's topic (same reach as ensure_vision_header). null if none.
  async function findTaskHeader(sb, topicId, name){
    try{
      if(!name) return null;
      var want=name.toLowerCase(), ids=[topicId];
      for(var d=0; d<3 && ids.length; d++){
        var r=await sb.from('ideas').select('id,subject,text_content').eq('content_type','header').in('cluster_id', ids);
        if(r.error || !r.data || !r.data.length) return null;
        var hit=r.data.filter(function(h){
          return String(h.subject||'').trim().toLowerCase()===want || String(h.text_content||'').trim().toLowerCase()===want;
        })[0];
        if(hit) return hit.id;
        ids=r.data.map(function(h){ return h.id; });
      }
    }catch(e){ console.error('Briefing Board: could not find the task header', e); }
    return null;
  }

  // The header named after the task: found, or made under the card's topic (same columns ensure_vision_header fills). null if it could not be made.
  async function ensureOwnHeader(sb, c, topicId, name){
    var have=await findTaskHeader(sb, topicId, name);
    if(have) return have;
    var me=await sb.from('ideas').select('user_id,project_id').eq('id', c.id).limit(1);
    var row=me && me.data && me.data[0];
    if(!row) return null;
    var ins=await sb.from('ideas').insert({user_id:row.user_id, content_type:'header', text_content:name, cluster_id:topicId, project_id:row.project_id, topic_scope_id:row.project_id}).select('id').limit(1);
    if(ins.error){ console.error('Briefing Board: could not add the task header', ins.error); return null; }
    return (ins.data && ins.data[0] && ins.data[0].id) || null;
  }

  // Go to a board type for this task. ws = {kind, label}. A task with no workspace there gets one (its own header on that board), and VISION / PLAN
  // also put their badge on the card, so the front always tells the truth about where the task has workspaces.
  async function go(c, ws){
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
        if(!own){ toast('That workspace did not open. Try again in a moment.'); return; }
        target=own;
        if(ws.kind==='PLAN' && !c.needsPlan && !c.goalHeaderId){
          c.needsPlan=true;
          try{ await sb.from('task_fields').update({needs_plan:true}).eq('idea_id', c.id); }catch(e){ console.error('Briefing Board: PLAN badge save failed', e); }
        }
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

  // The board type dropdown: the same list the ID BAND offers, minus the board we are standing on. A tick marks the ones this task already has.
  var menuEl=null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } }
  function openMenu(anchor, c, have){
    closeMenu();
    var kinds=(window.IDBand && IDBand.BOARD_KINDS ? IDBand.BOARD_KINDS : []).filter(function(k){ return k.value!=='BRIEFING BOARD'; });
    if(!kinds.length) return;
    menuEl=document.createElement('div'); menuEl.className='fg-go-menu';
    kinds.forEach(function(k){
      var on=have.some(function(w){ return w.kind===k.value; });
      var it=document.createElement('button'); it.type='button'; it.className='fg-go-item';
      it.innerHTML='<span>'+esc(k.label)+'</span>'+(on?'<span class="fg-go-tick">✓</span>':'');
      it.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); go(c, {kind:k.value, label:k.label}); });
      menuEl.appendChild(it);
    });
    document.body.appendChild(menuEl);
    var r=anchor.getBoundingClientRect();
    menuEl.style.left=Math.max(8, Math.min(r.left, window.innerWidth-menuEl.offsetWidth-8))+'px';
    menuEl.style.top=(r.bottom+4)+'px';
  }
  document.addEventListener('mousedown', function(e){ if(menuEl && !menuEl.contains(e.target) && !(e.target.closest && e.target.closest('.fg-go-chip'))) closeMenu(); }, true);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeMenu(); }, true);

  // Right of the HEADER: the board type chip (the task's default workspace, or empty when it has none) and, when it has one, the magnifying glass.
  var wrapEl=null;
  function paint(){
    if(!wrapEl) return;
    var c=(typeof _bbFindCardAnywhere==='function' && typeof _bbOpenCardId!=='undefined') ? _bbFindCardAnywhere(_bbOpenCardId) : null;
    closeMenu();
    wrapEl.innerHTML='';
    if(!c){ wrapEl.style.display='none'; return; }
    wrapEl.style.display='';
    var list=workspacesOf(c), def=list[0]||null;
    // Normally right of the HEADER field; a Hang Up hides that row, so the buttons ride beside the TOPIC instead.
    var row=document.getElementById('bb-d-subject-row'), field=document.getElementById('fg-go-field');
    var rowHidden=!row || row.style.display==='none';
    var trig=document.getElementById('bb-d-project-trigger');
    if(rowHidden && trig && trig.parentNode){ if(wrapEl.previousSibling!==trig) trig.parentNode.insertBefore(wrapEl, trig.nextSibling); }
    else if(field && wrapEl.parentNode!==field) field.appendChild(wrapEl);
    var chip=document.createElement('button'); chip.type='button'; chip.className='fg-go-chip'+(def?' fg-go-has':'');
    if(!def) chip.classList.add('fg-go-empty');
    chip.title='Workspace: choose a board type to go to, or to start one';
    chip.innerHTML=(def?'<span>'+esc(def.label)+'</span>':'')+'<span aria-hidden="true">\u25BE</span>';
    var eb=document.createElement('span'); eb.className='fg-go-eyebrow'; eb.textContent='Workspace';
    wrapEl.appendChild(eb);
    chip.addEventListener('click', function(e){ e.stopPropagation(); if(menuEl) closeMenu(); else openMenu(chip, c, list); });
    wrapEl.appendChild(chip);
    if(def){
      var b=document.createElement('button'); b.type='button'; b.className='fg-go-btn'; b.title='Go to '+def.label;
      b.setAttribute('aria-label','Go to '+def.label);
      b.innerHTML=GLASS;
      b.addEventListener('click', function(e){ e.stopPropagation(); go(c, def); });
      wrapEl.appendChild(b);
    }
  }

  function build(bbw){
    if(!bbw || bbw.querySelector('.fg-go-field')) return;
    var input=bbw.querySelector('#bb-d-subject');
    if(!input || !input.parentNode) return;
    injectStyle();
    var field=document.createElement('div'); field.className='fg-go-field'; field.id='fg-go-field';
    input.parentNode.insertBefore(field, input); field.appendChild(input);
    wrapEl=document.createElement('span'); wrapEl.className='fg-go-wrap'; field.appendChild(wrapEl);
    paint();
    // A badge switched on or off while the back is open changes the buttons.
    bbw.addEventListener('change', function(){ setTimeout(paint, 60); });
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

  // The card back is built once and reused for every card, so each time a card opens its rows are painted again for that card.
  function refresh(){ setTimeout(paint, 0); }   // after the card's other rows (a Hang Up hides the HEADER row) are set

  window.FGBBGoThere={ build:build, refresh:refresh, afterRender:afterRender };
})();
