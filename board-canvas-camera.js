/* board-canvas-camera.js -- Sept 29 2026.
   Larry (Sept 28-29 2026, Session 295 design): every board type is its own
   world on an infinite x,y canvas, driven by the mouse wheel -- closest zoom
   is about one card with its neighbors peeking in at the edges, widest zoom
   fits every card on the board.

   This file is the "world layer": it owns a camera (a translate + scale
   applied to the board's canvas element) and nothing else. It knows nothing
   about ideas, headers, Supabase or any one board -- a board hands it three
   elements at create() time and keeps storing card positions in its own
   coordinates, exactly as before. Zooming and panning never touch stored
   positions; they only change how the canvas is viewed.

   One camera per board (Sept 29 2026, later): create() returns an
   independent instance with its own zoom, pan and listeners, so two boards
   can each have a camera without one replacing the other.

   Boards on it:
     - Sea of Ideas (session.js, screen 9711): free x,y tiles (.isx-tile), so
       the default card lookups below apply.
     - Blue Sky (idea-storyboard-screens.js, screen 1010): a column layout,
       not stored x,y. It plugs in as a computed layout through the optional
       hooks below -- nothing about how its cards are stored changes.
     - Briefing Board comes later, the same way as Blue Sky.

   Optional hooks a board can pass to create():
     contentBox()    -> {x,y,w,h} bounding box of everything, in canvas
                        coordinates. Default: the .isx-tile cards.
     cardSize()      -> {w,h} of one representative card, sets how close the
                        closest zoom goes. Default: the first .isx-tile.
     isBackground(t) -> true when event target t is empty board (drag pans).
                        Default: the scroller or the canvas itself.
     onBackgroundClick() -> a background click that did not become a pan.

   Gestures:
     - Wheel (or trackpad pinch, which browsers send as ctrl+wheel): zoom
       toward the cursor.
     - Drag on empty background: pan. (Sea of Ideas lasso is Shift+drag.)
     - Middle-button drag anywhere on the board: pan.
     - Home key: glide to fit every card on screen.
   Not built yet: touch pinch, low-zoom title-only cards, glide-to-card on
   click, saved viewpoints.

   Public API: window.T2TCanvasCamera.create(opts) returns an instance with
   reset, fitAll, panBy, getScale, screenToCanvas, ringToCanvas, setCurrent,
   isAttached. The older single-board calls (attach, reset, fitAll, ...)
   still exist and act on the camera attached through attach() -- that is
   what Sea of Ideas uses.
*/
(function(){
  'use strict';

  var FLOOR_SCALE = 0.05;   // never zoom out past this, however wide the board
  var CEIL_SCALE  = 8;      // never zoom in past this
  var FIT_PAD     = 48;     // px of breathing room kept around cards when fitting
  var NEIGHBOR    = 1.4;    // closest zoom shows one card at ~1/1.4 of the view, so neighbors peek in
  var CURRENT_BELOW = 0.6;  // below this zoom the last-touched card gets a highlight ring
  var GLIDE_MS    = 320;
  var PAN_THRESHOLD = 3;    // px of movement that turns a background click into a pan

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  var registry = [];        // one instance per canvas element

  function create(o){
    if (!o || !o.board || !o.scroller || !o.canvas) return null;
    for (var i = 0; i < registry.length; i++){
      if (registry[i].canvas === o.canvas) return registry[i].inst;
    }

    var cam = { tx:0, ty:0, s:1 };
    var els = { board:o.board, scroller:o.scroller, canvas:o.canvas };
    var opts = o;
    var currentId = null;
    var glideTimer = null;

    function tiles(){
      return Array.prototype.slice.call(els.canvas.querySelectorAll('.isx-tile'));
    }

    function viewSize(){
      var r = els.scroller.getBoundingClientRect();
      return { w:r.width, h:r.height, left:r.left, top:r.top };
    }

    // Bounding box of every card, in canvas coordinates. Layout sizes
    // (offsetWidth/Height) ignore CSS transforms, so this is the same at any zoom.
    function contentBox(){
      if (opts.contentBox) return opts.contentBox();
      var ts = tiles();
      if (!ts.length) return null;
      var x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity;
      ts.forEach(function(t){
        var x = parseFloat(t.style.left)||0, y = parseFloat(t.style.top)||0;
        var w = t.offsetWidth||112, h = t.offsetHeight||66;
        if (x<x0) x0=x; if (y<y0) y0=y;
        if (x+w>x1) x1=x+w; if (y+h>y1) y1=y+h;
      });
      return { x:x0, y:y0, w:x1-x0, h:y1-y0 };
    }

    function cardSize(){
      if (opts.cardSize){
        var c = opts.cardSize();
        if (c && c.w && c.h) return c;
      }
      var ts = tiles();
      return { w: ts.length ? (ts[0].offsetWidth||112) : 112,
               h: ts.length ? (ts[0].offsetHeight||66)  : 66 };
    }

    function fitScale(box, v){
      return Math.min((v.w - FIT_PAD*2)/Math.max(box.w,1), (v.h - FIT_PAD*2)/Math.max(box.h,1));
    }

    // Zoom limits are computed from what is on the board right now, so a board
    // with three cards and a board with three hundred both zoom sensibly.
    function limits(){
      var v = viewSize();
      var c = cardSize();
      var max = clamp(Math.min(v.w/(c.w*NEIGHBOR), v.h/(c.h*NEIGHBOR)), 1, CEIL_SCALE);
      var box = contentBox();
      var min = box ? clamp(Math.min(fitScale(box, v), 1), FLOOR_SCALE, 1) : 0.25;
      if (min > max) min = max;
      return { min:min, max:max };
    }

    function apply(){
      els.canvas.style.transform = 'translate(' + cam.tx.toFixed(2) + 'px,' + cam.ty.toFixed(2) + 'px) scale(' + cam.s.toFixed(4) + ')';
      markCurrent();
    }

    function markCurrent(){
      var on = cam.s < CURRENT_BELOW && currentId != null;
      tiles().forEach(function(t){
        t.classList.toggle('isx-current', on && t.dataset.isxId === currentId);
      });
    }

    function withGlide(fn, animate){
      if (!animate){ fn(); return; }
      if (glideTimer) clearTimeout(glideTimer);
      els.canvas.style.transition = 'transform ' + GLIDE_MS + 'ms ease';
      fn();
      glideTimer = setTimeout(function(){
        els.canvas.style.transition = '';
        glideTimer = null;
      }, GLIDE_MS + 40);
    }

    function cancelGlide(){
      if (glideTimer){ clearTimeout(glideTimer); glideTimer = null; }
      els.canvas.style.transition = '';
    }

    // ---- public geometry helpers ---------------------------------------

    // Screen (client) coordinates -> canvas-local coordinates, the same units a
    // card's style.left/top and its stored canvas_x/canvas_y use.
    function screenToCanvas(clientX, clientY){
      var v = viewSize();
      return { x:(clientX - v.left - cam.tx)/cam.s, y:(clientY - v.top - cam.ty)/cam.s };
    }

    // A tile living in the fixed ring layer (unscaled, board-relative pixels)
    // being detached onto the canvas: where does its top-left land in canvas
    // coordinates? Goes through real client rects so any offset between the ring
    // layer and the scroller is handled instead of assumed away.
    function ringToCanvas(left, top, ringEl){
      if (!ringEl) return { x:left, y:top };
      var rr = ringEl.getBoundingClientRect();
      return screenToCanvas(rr.left + left, rr.top + top);
    }

    // ---- camera moves --------------------------------------------------

    function panBy(dx, dy){
      cam.tx += dx; cam.ty += dy;
      apply();
    }

    function reset(animate){
      withGlide(function(){ cam.tx = 0; cam.ty = 0; cam.s = 1; apply(); }, animate);
    }

    function fitAll(animate){
      var box = contentBox();
      if (!box){ reset(animate); return; }
      var v = viewSize();
      var lim = limits();
      var s = clamp(Math.min(fitScale(box, v), 1), lim.min, lim.max);
      withGlide(function(){
        cam.s = s;
        cam.tx = (v.w - box.w*s)/2 - box.x*s;
        cam.ty = (v.h - box.h*s)/2 - box.y*s;
        apply();
      }, animate);
    }

    function zoomAt(clientX, clientY, factor){
      var v = viewSize();
      var lim = limits();
      var s2 = clamp(cam.s * factor, lim.min, lim.max);
      if (s2 === cam.s) return;
      var mx = clientX - v.left, my = clientY - v.top;
      var cx = (mx - cam.tx)/cam.s, cy = (my - cam.ty)/cam.s;   // canvas point under the cursor
      cam.s = s2;
      cam.tx = mx - cx*s2;
      cam.ty = my - cy*s2;
      apply();
    }

    // ---- input ---------------------------------------------------------

    function isBackground(t){
      if (opts.isBackground) return !!opts.isBackground(t);
      return t === els.scroller || t === els.canvas;
    }

    function onWheel(e){
      var v = viewSize();
      if (e.clientX < v.left || e.clientX > v.left + v.w || e.clientY < v.top || e.clientY > v.top + v.h) return;
      e.preventDefault();
      cancelGlide();
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 100;
      var k = e.ctrlKey ? 0.01 : 0.0015;   // pinch sends small ctrl+wheel deltas
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * k));
    }

    function onPointerDown(e){
      if (e.button !== 0 && e.button !== 1) return;
      var middle = (e.button === 1);
      if (!middle && (!isBackground(e.target) || e.shiftKey)) return;   // cards handle their own drags; Shift+drag is lasso
      e.preventDefault();
      cancelGlide();
      var sx = e.clientX, sy = e.clientY, moved = false;
      els.scroller.classList.add('isx-panning');
      function onMove(ev){
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.abs(dx) < PAN_THRESHOLD && Math.abs(dy) < PAN_THRESHOLD) return;
        moved = true;
        panBy(ev.clientX - sx, ev.clientY - sy);
        sx = ev.clientX; sy = ev.clientY;
      }
      function onUp(){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        els.scroller.classList.remove('isx-panning');
        if (!moved && !middle && opts.onBackgroundClick) opts.onBackgroundClick();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    function onKey(e){
      if (e.key !== 'Home' || e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      if (els.board.offsetParent === null) return;   // only while this board is on screen
      e.preventDefault();
      fitAll(true);
    }

    // ---- setup ---------------------------------------------------------

    // The class goes on first: a board's CSS may only give the scroller a
    // real box once the camera owns it (see Blue Sky's #sc-board-viewport).
    els.scroller.classList.add('isx-camera');
    els.board.addEventListener('wheel', onWheel, { passive:false });
    els.scroller.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    // Cards get rebuilt on every render; keep the "current card" ring on the
    // new elements without every board having to call back in.
    if (window.MutationObserver){
      new MutationObserver(markCurrent).observe(els.canvas, { childList:true });
    }
    apply();

    var inst = {
      isAttached: function(){ return true; },
      reset: reset,
      fitAll: fitAll,
      panBy: panBy,
      getScale: function(){ return cam.s; },
      screenToCanvas: screenToCanvas,
      ringToCanvas: ringToCanvas,
      setCurrent: function(id){ currentId = (id == null ? null : String(id)); markCurrent(); }
    };
    registry.push({ canvas:o.canvas, inst:inst });
    return inst;
  }

  // ---- single-board API (Sea of Ideas) -----------------------------------
  // Kept exactly as it was so session.js needs no change: attach() makes the
  // "default" camera and every other call acts on it.

  var main = null;

  window.T2TCanvasCamera = {
    create: create,
    attach: function(o){ var c = create(o); if (c && !main) main = c; return !!c; },
    isAttached: function(){ return !!main; },
    reset: function(a){ if (main) main.reset(a); },
    fitAll: function(a){ if (main) main.fitAll(a); },
    panBy: function(dx, dy){ if (main) main.panBy(dx, dy); },
    getScale: function(){ return main ? main.getScale() : 1; },
    screenToCanvas: function(x, y){ return main ? main.screenToCanvas(x, y) : { x:x, y:y }; },
    ringToCanvas: function(l, t, r){ return main ? main.ringToCanvas(l, t, r) : { x:l, y:t }; },
    setCurrent: function(id){ if (main) main.setCurrent(id); }
  };
})();
