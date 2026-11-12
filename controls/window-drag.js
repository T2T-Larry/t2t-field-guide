/* ============================================================
   window-drag.js -- T2T Field Guide
   Larry, Nov 12 2026: the Inside popup and a header's card back are WINDOWS: grab the top bar and move them, so both can be open side by side.
   FGWindowDrag.attach(card, handle, key)
     card   the popup element that moves   handle  the bar you grab (buttons, boxes and links in it still work)
     key    a short name; the spot a window was left in is remembered for the next time that same window opens (this visit only)
   Letting go after a move never counts as a click on whatever is underneath.
   ============================================================ */
(function(){
  var spots={};
  function attach(card, handle, key, start){
    if(!card || !handle) return;
    var s=spots[key] || start || {x:0, y:0};
    card.style.position='relative'; card.style.left=s.x+'px'; card.style.top=s.y+'px';
    handle.style.cursor='move'; handle.title=handle.title || 'Drag to move this window';
    var sx=0, sy=0, bl=0, bt=0, moving=false;
    function mv(e){ if(!moving) return; card.style.left=(bl+e.clientX-sx)+'px'; card.style.top=(bt+e.clientY-sy)+'px'; }
    function up(e){
      var moved=Math.abs((e.clientX||sx)-sx)+Math.abs((e.clientY||sy)-sy)>3;
      if(moved){
        var swallow=function(ev){ ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', swallow, true); };
        document.addEventListener('click', swallow, true);
        setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 400);
      }
      moving=false;
      spots[key]={x:parseFloat(card.style.left)||0, y:parseFloat(card.style.top)||0};
      document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true);
    }
    handle.addEventListener('mousedown', function(e){
      if(e.button!==0) return;
      if(e.target.closest && e.target.closest('button,input,select,textarea,a,[contenteditable]')) return;
      e.preventDefault();
      moving=true; sx=e.clientX; sy=e.clientY; bl=parseFloat(card.style.left)||0; bt=parseFloat(card.style.top)||0;
      document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
    });
  }
  window.FGWindowDrag={attach:attach};
})();
