/* ============================================================
   screen-zero.js — Screen 0000 (the gray backdrop behind every
   screen), the nav bar that rides on top of it (0020), and the
   widget the nav bar and 0000 both sit behind.

   Larry's numbering, July 26 2026: 0000 is the plain gray page
   itself, always underneath everything else. 0020 is the nav
   bar — a persistent strip that lives outside the widget, same
   as 0000, and doesn't change no matter which screen (0010
   sign-in, 0100 Cover, etc.) is currently showing inside the
   widget. The gear button that used to float directly on 0000
   now lives inside the 0020 nav bar instead (Larry, July 26:
   "gear is always on the nav bar and not on 0000").

   This file owns:
   1) The 0020 nav bar itself, and the placeholder gear button
      inside it (tapping it just says custom options are coming
      later — nothing real behind it yet).
   2) Making the widget (#fg-root) draggable, so a traveler can
      grab it (anywhere except its own buttons/links/inputs) and
      move it around on the gray backdrop. Position is
      remembered per-browser (localStorage).

   The actual "which number does triple-tap reveal" logic lives
   in backpack.js's Hidden Mickey handler (the one shared
   triple-click system for the whole app — see that file). This
   file only has to make sure #fg-root and #sz-navbar exist with
   those exact ids so backpack.js can tell 0000 / 0020 / whatever
   screen is showing apart.

   Loaded on every phase file, same as backpack.js/tmap.js.
   ============================================================ */

(function(){

  /* ---------- 1) The 0020 nav bar + its gear button ---------- */

  function showZeroToast(msg){
    var existing = document.getElementById('sz-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'sz-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed','bottom:64px','right:20px',
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

  function buildNavBar(){
    if (document.getElementById('sz-navbar')) return; // idempotent

    var bar = document.createElement('div');
    bar.id = 'sz-navbar';
    bar.style.cssText = [
      'position:fixed','left:0','right:0','bottom:0','height:48px',
      'background:rgba(255,255,255,0.9)','border-top:1px solid rgba(0,0,0,0.12)',
      'box-shadow:0 -2px 10px rgba(0,0,0,0.12)',
      'display:flex','align-items:center','justify-content:flex-end',
      'padding:0 14px','z-index:9998','box-sizing:border-box'
    ].join(';');

    var gear = document.createElement('button');
    gear.id = 'sz-gear';
    gear.type = 'button';
    gear.title = 'Custom options (coming later)';
    gear.textContent = '⚙️';
    gear.style.cssText = [
      'width:36px','height:36px','border-radius:50%',
      'border:2px solid rgba(0,0,0,0.15)','background:#fff',
      'font-size:18px','line-height:1','cursor:pointer',
      'display:flex','align-items:center','justify-content:center'
    ].join(';');
    gear.addEventListener('click', function(){
      showZeroToast('Custom options — coming later.');
    });

    bar.appendChild(gear);
    document.body.appendChild(bar);
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
    buildNavBar();
    makeWidgetDraggable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
