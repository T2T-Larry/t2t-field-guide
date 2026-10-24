/* ============================================================
   card-go-there.js -- T2T Field Guide - GO THERE (task card back -> its workspace) and the GLOW that marks where you started

   Oct 24 2026 (Larry): a badge on the front of a task says "there is a workspace for this". The back of a badged task shows a magnifying glass
   button to the right of the HEADER field (tooltip: Go there, with the board's name) that opens that workspace. A task with no badge needs no
   workspace, so it shows nothing. A Hang Up hides its HEADER row (its TOPIC is the thing), so there the button sits beside the TOPIC.
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
      +'.fg-go-wrap{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;margin-left:6px}'
      +'.fg-go-btn{display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;border:1px solid var(--bb-accent);border-radius:6px;padding:3px 5px;color:var(--bb-ink)}'
      +'.fg-go-btn svg{width:15px;height:15px}';
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

  async function go(c, ws){
    try{
      if(!window.IDBand || !IDBand.goToBoard){ toast('The workspace is not ready yet. Try again in a moment.'); return; }
      var sb=(typeof T==='function' && T().sb) || null;
      if(c.col==='hangups' && typeof _bbEnsureHangupHeader==='function') await _bbEnsureHangupHeader(c);
      if(ws.kind==='IDEA' && sb){ try{ await sb.rpc('ensure_vision_header', {p_idea:c.id}); }catch(e){} }
      var topicId=c.projectHeaderId;
      if(!topicId){ toast('This task has no TOPIC yet.'); return; }
      // VISION and PLAN open on the header named after the task (the task is the topic there), not on the card's parent topic.
      if((ws.kind==='IDEA' || ws.kind==='PLAN') && sb){
        var own=await findTaskHeader(sb, topicId, String(c.subject||c.task||'').trim());
        if(own) topicId=own;
        else if(ws.kind==='IDEA'){ toast('The header for this task is not on the VISION board yet. Try again in a moment.'); return; }
      }
      var back=returnProjectId();
      if(back) IDBand.recordReturn('BRIEFING BOARD', back);
      // Glow the card you are leaving from; it is still there when RETURN brings you back.
      if(typeof closeCardDetail==='function') closeCardDetail();
      setGlow(c.id);
      var ok;
      if(ws.kind==='SEA' && typeof _bbOpenHangupSea==='function'){ await _bbOpenHangupSea(c); ok=true; }
      else ok=await IDBand.goToBoard(ws.kind, topicId);
      if(ok===false){ setGlow(null); toast('That workspace did not open. Try again in a moment.'); }
    }catch(e){
      console.error('Briefing Board: GO THERE failed', e);
      setGlow(null); toast('That workspace did not open. Try again in a moment.');
    }
  }

  // The magnifying glass button(s) on the card back: one per badge, none when the task has no badge.
  var wrapEl=null;
  function paint(){
    if(!wrapEl) return;
    var c=(typeof _bbFindCardAnywhere==='function' && typeof _bbOpenCardId!=='undefined') ? _bbFindCardAnywhere(_bbOpenCardId) : null;
    var list=workspacesOf(c);
    wrapEl.innerHTML='';
    wrapEl.style.display=list.length ? '' : 'none';
    // Normally right of the HEADER field; a Hang Up hides that row, so the button rides beside the TOPIC instead.
    var row=document.getElementById('bb-d-subject-row'), field=document.getElementById('fg-go-field');
    var rowHidden=!row || row.style.display==='none';
    var trig=document.getElementById('bb-d-project-trigger');
    if(rowHidden && trig && trig.parentNode){ if(wrapEl.previousSibling!==trig) trig.parentNode.insertBefore(wrapEl, trig.nextSibling); }
    else if(field && wrapEl.parentNode!==field) field.appendChild(wrapEl);
    list.forEach(function(ws){
      var b=document.createElement('button'); b.type='button'; b.className='fg-go-btn'; b.title='Go to '+ws.label;
      b.setAttribute('aria-label','Go to '+ws.label);
      b.innerHTML=GLASS;
      b.addEventListener('click', function(e){ e.stopPropagation(); go(c, ws); });
      wrapEl.appendChild(b);
    });
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
