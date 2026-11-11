/* ============================================================
   card-go-there.js -- T2T Field Guide - the GLOW that marks the card you left from, and the place RETURN comes back to

   Nov 11 2026 (Larry): the workspace badge system (the WORKSPACE chip, the Jump arrow, the front badges) is deleted; the LINK arrows do that job.
   What stays: when you follow a LINK from a Briefing Board card and then press RETURN, the card you left from GLOWS (blinking) until you click anything
   else on the Briefing Board. It lives in the page's memory only, so it lasts for the current visit and never longer.

   Public surface: window.FGBBGoThere  .afterRender(wrap)  .glow(id)  .returnProjectId()
   ============================================================ */
(function(){
  var glowId=null;          // the card to glow when the Briefing Board is showing; null = none
  var scrollNext=false;     // scroll the glowing card into view once, on the first draw after coming back

  function injectStyle(){
    if(document.getElementById('fg-go-there-style')) return;
    var st=document.createElement('style'); st.id='fg-go-there-style';
    st.textContent=''
      +'.bb-card.bb-glow{outline:4px solid #f2b705;outline-offset:-4px;background-image:linear-gradient(rgba(242,183,5,.28),rgba(242,183,5,.28));box-shadow:inset 0 0 0 4px #f2b705,inset 0 0 22px 8px rgba(242,183,5,.85),0 0 24px 10px rgba(242,183,5,.8);animation:fg-bb-blink 1s ease-in-out infinite}'
      +'@keyframes fg-bb-blink{0%,100%{outline-color:#f2b705;box-shadow:inset 0 0 0 4px #f2b705,inset 0 0 22px 8px rgba(242,183,5,.85),0 0 24px 10px rgba(242,183,5,.8)}50%{outline-color:rgba(242,183,5,.2);box-shadow:inset 0 0 0 2px rgba(242,183,5,.25),inset 0 0 6px 2px rgba(242,183,5,.2),0 0 4px 1px rgba(242,183,5,.2)}}';
    document.head.appendChild(st);
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
    if(id) injectStyle();   // the glow's look lives in this file's style block, which used to be added only when a card back was built (so a return to a fresh board showed no glow)
    Array.prototype.forEach.call(document.querySelectorAll('.bb-card.bb-glow'), function(el){ el.classList.remove('bb-glow'); });
    if(id){
      var el=document.querySelector('.bb-card[data-id="'+String(id).replace(/"/g,'')+'"]');
      if(el) el.classList.add('bb-glow');
    }
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

  window.FGBBGoThere={ afterRender:afterRender, glow:setGlow, returnProjectId:returnProjectId };
})();
