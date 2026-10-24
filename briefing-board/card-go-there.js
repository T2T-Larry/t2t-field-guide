/* ============================================================
   card-go-there.js -- T2T Field Guide - GO THERE (task card back -> its workspace) and the GLOW that marks where you started

   Oct 24 2026 (Larry): a badge on the front of a task says "there is a workspace for this". The back of a badged task now shows it in
   ID BAND style: the TASK as the topic, the BADGE as the board type (VISION, PLAN or SEA OF IDEAS), and a magnifying glass GO THERE button that
   opens that workspace. A task with no badge needs no workspace, so it shows nothing.
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
      +'.fg-go-there{display:flex;flex-direction:column;gap:3px;width:100%;margin:2px 0 6px}'
      +'.fg-go-row{display:flex;align-items:center;gap:8px;min-height:28px;padding:3px 6px;border:1px dotted var(--bb-accent);border-radius:6px}'
      +'.fg-go-topic{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-ink)}'
      +'.fg-go-board{flex:0 0 auto;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.fg-go-btn{flex:0 0 auto;display:flex;align-items:center;gap:5px;cursor:pointer;background:transparent;border:1px solid var(--bb-accent);border-radius:6px;padding:3px 8px;font:inherit;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-go-btn svg{width:14px;height:14px}';
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

  async function go(c, ws){
    try{
      if(!window.IDBand || !IDBand.goToBoard){ toast('The workspace is not ready yet. Try again in a moment.'); return; }
      var sb=(typeof T==='function' && T().sb) || null;
      if(c.col==='hangups' && typeof _bbEnsureHangupHeader==='function') await _bbEnsureHangupHeader(c);
      if(ws.kind==='IDEA' && sb){ try{ await sb.rpc('ensure_vision_header', {p_idea:c.id}); }catch(e){} }
      var topicId=c.projectHeaderId;
      if(!topicId){ toast('This task has no TOPIC yet.'); return; }
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

  // The rows on the card back: one per badge. Nothing at all when the task has no badge.
  function paint(host){
    var c=(typeof _bbFindCardAnywhere==='function' && typeof _bbOpenCardId!=='undefined') ? _bbFindCardAnywhere(_bbOpenCardId) : null;
    var list=workspacesOf(c);
    host.innerHTML='';
    host.style.display=list.length ? '' : 'none';
    var name=String((c && (c.subject||c.task))||'').trim()||'This task';
    list.forEach(function(ws){
      var row=document.createElement('div'); row.className='fg-go-row';
      row.innerHTML='<span class="fg-go-topic" title="'+esc(name)+'">'+esc(name)+'</span><span class="fg-go-board">'+esc(ws.label)+'</span>';
      var b=document.createElement('button'); b.type='button'; b.className='fg-go-btn'; b.title='Go there: open this task’s '+ws.label+' workspace';
      b.innerHTML=GLASS+'<span>Go there</span>';
      b.addEventListener('click', function(e){ e.stopPropagation(); go(c, ws); });
      row.appendChild(b); host.appendChild(row);
    });
  }

  function build(bbw){
    if(!bbw || bbw.querySelector('.fg-go-there')) return;
    injectStyle();
    var host=document.createElement('div'); host.className='fg-go-there';
    var split=bbw.querySelector('.fg-back-split');
    if(split && split.parentNode) split.parentNode.insertBefore(host, split); else bbw.appendChild(host);
    paint(host);
    // A badge switched on or off while the back is open changes the rows.
    bbw.addEventListener('change', function(){ setTimeout(function(){ if(host.isConnected) paint(host); }, 60); });
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

  window.FGBBGoThere={ build:build, afterRender:afterRender };
})();
