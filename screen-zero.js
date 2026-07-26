/* ============================================================
   screen-zero.js — Screen 0000 (the gray backdrop behind every
   screen) and the widget it holds.

   Larry's numbering, July 26 2026: 0000 is the gray page itself,
   always underneath everything else; 0010 (sign-in) and 0100
   (Cover) and every screen after them are cards that sit on top
   of it inside #fg-root ("the widget"). This file owns two
   things that belong to 0000, not to any individual screen:

   1) A gear button fixed in 0000's own lower-right corner (not
      inside the widget, so it stays put no matter which screen
      is showing on top). For now it's a placeholder — tapping it
      just says custom options are coming later. No real settings
      live behind it yet.

   2) Making the widget itself (#fg-root) draggable, so a
      traveler can grab it (anywhere except its buttons/links/
      inputs) and move it around on the gray backdrop. Position
      is remembered per-browser (localStorage) so it stays where
      it was left after a reload — same "sticks around" behavior
      as the desk objects in the book-view-project prototype.

   Loaded on every phase file, same as backpack.js/tmap.js.
   ============================================================ */

(function(){

  /* ---------- 1) Screen 0000's gear button ---------- */

  function showZeroToast(msg){
    var existing = document.getElementById('sz-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'sz-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed','bottom:84px','right:20px',
      'background:rgba(10,74,56,0.92)','color:#C9A87C',
      'font-family:Playfair Display,Georgia,serif','font-size:13px','font-weight:700',
      'letter-spacing:1px','padding:10px 18px','border-radius:20px',
      'max-width:240px','text-align:right',
      'box-shadow:0 4px 16px rgba(0,0,0,0.35)','z-index:10000',
      'pointer-events:none','opacity:0','transition:opacity 0.2s'
    ].join(';');
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      toast.style.opacity = '1';
      setTimeout(function(){
        toast.style.opacity = '0';
        setTimeout(function(){ toast.remove(); }, 220);
      }, 1800);
    });
  }

  function buildGearButton(){
    if (document.getElementById('sz-gear')) return; // idempotent
    var btn = document.createElement('button');
    btn.id = 'sz-gear';
    btn.type = 'button';
    btn.title = 'Custom options (coming later)';
    btn.textContent = '⚙️'; // ⚙️
    btn.style.cssText = [
      'position:fixed','right:16px','bottom:16px',
      'width:44px','height:44px','border-radius:50%',
      'border:2px solid rgba(0,0,0,0.15)',
      'background:rgba(255,255,255,0.85)',
      'font-size:20px','line-height:1','cursor:pointer',
      'box-shadow:0 2px 10px rgba(0,0,0,0.2)',
      'z-index:9998','display:flex','align-items:center','justify-content:center'
    ].join(';');
    btn.addEventListener('mouseenter', function(){ btn.style.background='rgba(255,255,255,1)'; });
    btn.addEventListener('mouseleave', function(){ btn.style.background='rgba(255,255,255,0.85)'; });
    btn.addEventListener('click', function(){
      showZeroToast('Custom options — coming later.');
    });
    document.body.appendChild(btn);
  }

  /* ---------- 2) Dragging the widget (#fg-root) ---------- */

  var STORE_KEY = 't2t-widget-pos';
  // Same "don't hijack real controls" exclusion list backpack.js's own
  // triple-click handler uses, so anything already safe from that is
  // safe from starting a drag too.
  var EXCLUDE = 'button, a, input, textarea, select, [role="button"], ' +
    '.mg-btn, .mg-ret, .spark-door, .ib, .jb, .gb, .tb, .more-link, ' +
    '.tool-row, .save-btn, .jsave-btn, .gsave-btn';

  function makeWidgetDraggable(){
    var el = document.getElementById('fg-root');
    if (!el) return;

    var dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function applyPos(left, top){
      el.style.position = 'fixed';
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.margin = '0';
    }

    // Restore a saved position, if any, before the widget ever paints
    // in its default centered spot.
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        applyPos(saved.left, saved.top);
      }
    } catch(e){}

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (e.target.closest(EXCLUDE)) return;
      var p = pointOf(e);
      dragging = true; moved = false;
      var rect = el.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      startX = p.clientX; startY = p.clientY;
      document.body.style.userSelect = 'none';
    }

    function onMove(e){
      if (!dragging) return;
      var p = pointOf(e);
      var dx = p.clientX - startX, dy = p.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      if (e.cancelable) e.preventDefault();
      applyPos(startLeft + dx, startTop + dy);
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = el.getBoundingClientRect();
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ left: rect.left, top: rect.top })); }
      catch(e){}
    }

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function init(){
    buildGearButton();
    makeWidgetDraggable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
