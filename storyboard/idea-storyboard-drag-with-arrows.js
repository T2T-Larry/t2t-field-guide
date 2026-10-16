/* ============================================================
   idea-storyboard-drag-with-arrows.js -- T2T Field Guide - IDEA STORYBOARD (9710)

   Oct 16 2026 (Larry: "I want to click and drag a card with the mouse
   while I use the arrows to move back and forth on a storyboard" -- a
   card often has to travel from one end of a long board to the other,
   and edge-scrolling alone is slow and fiddly).

   WHY THIS FILE EXISTS: the browser's built-in card drag (what every
   tile and header already uses) blocks the keyboard completely while a
   card is in the air -- no arrow press ever reaches the page. So this
   file takes over the "carrying" part of the drag, once, for every
   card on the Storyboard:

     * When a drag starts on any draggable card inside the Storyboard,
       the built-in drag is cancelled and replaced by a plain
       mouse-follow drag (a see-through copy of the card follows the
       pointer, the original dims).
     * While carrying, the same drag events the cards already listen for
       (dragenter / dragover / dragleave / drop / dragend) are sent to
       whatever is under the pointer. Every existing drop spot -- Trash,
       the TOPIC box, PARENT, header columns, other cards -- keeps
       working with NO changes to its own code. One tree, one code.
     * Left / Right / Up / Down slide the board while you hold the card
       (Shift = faster). Escape puts the card back. Every other key is
       ignored while carrying, so a stray Delete can't trash the
       selected card mid-drag.
     * The existing edge-scroll (hover near an edge) keeps working, since
       it listens for those same drag events.

   Nothing here knows what a card is or where it may land -- that stays
   with the drop spots. Library (read-only) boards never start a drag
   because their cards aren't draggable.

   Panning uses the Storyboard camera when the board has one
   (window.T2TStoryboardCamera, set in idea-storyboard-screens.js) and
   otherwise scrolls the board's own scroll areas.

   Sibling files: idea-storyboard-screens.js, idea-storyboard-tiles.js,
   idea-storyboard-board-columns.js, idea-storyboard-header.js.
   ============================================================ */
(function(){
  var SCREEN_ID = 's-sea-of-ideas-cluster';
  var STEP = 14;        // pixels per frame while an arrow is held
  var FAST_STEP = 48;   // same, with Shift held
  var OVER_EVERY_MS = 50; // how often a held, still card re-announces itself (native drags do ~the same)
  var drag = null;

  function activeScreen(){
    var s = document.getElementById(SCREEN_ID);
    return (s && s.classList.contains('active')) ? s : null;
  }

  function fire(d, el, type, extra){
    var init = {
      bubbles: true, cancelable: true, composed: true,
      clientX: d.x, clientY: d.y, screenX: d.x, screenY: d.y,
      dataTransfer: d.dt
    };
    if(extra) for(var k in extra) init[k] = extra[k];
    var ev = new DragEvent(type, init);
    ev.__t2tCarried = true; // so our own capture listener ignores it
    el.dispatchEvent(ev);
    return ev;
  }

  // Tell whatever is under the pointer that a card is over it. Same
  // sequence the browser would send: leave the old spot, enter the new
  // one, then keep announcing "over" (a drop is only allowed if the spot
  // answered the latest "over" by cancelling it).
  function announceOver(){
    var d = drag; if(!d) return;
    var el = document.elementFromPoint(d.x, d.y); // the copy has pointer-events:none
    if(el !== d.over){
      if(d.over) fire(d, d.over, 'dragleave', { relatedTarget: el });
      d.over = el;
      d.accepts = false;
      if(el) fire(d, el, 'dragenter', { relatedTarget: null });
    }
    if(el){
      var ev = fire(d, el, 'dragover');
      d.accepts = ev.defaultPrevented;
    }
    d.lastOver = Date.now();
  }

  function moveCopy(){
    var d = drag; if(!d || !d.copy) return;
    d.copy.style.left = (d.x - d.offX) + 'px';
    d.copy.style.top = (d.y - d.offY) + 'px';
  }

  function panBoard(dx, dy){
    var cam = window.T2TStoryboardCamera;
    if(cam && cam.panBy){ cam.panBy(dx, dy); return; }
    var h = document.getElementById('sc-board-wrap');
    if(h) h.scrollLeft -= dx;
    var v = document.getElementById(SCREEN_ID);
    if(v) v.scrollTop -= dy;
  }

  function frame(){
    var d = drag; if(!d) return;
    d.raf = requestAnimationFrame(frame);
    var k = d.keys, s = d.fast ? FAST_STEP : STEP, dx = 0, dy = 0;
    // The board slides the way the arrow points: Right shows more of the
    // right-hand side, so the content moves left.
    if(k.ArrowLeft) dx += s;
    if(k.ArrowRight) dx -= s;
    if(k.ArrowUp) dy += s;
    if(k.ArrowDown) dy -= s;
    if(dx || dy){
      panBoard(dx, dy);
      announceOver(); // the board moved under a still pointer
    } else if(Date.now() - d.lastOver >= OVER_EVERY_MS){
      announceOver();
    }
  }

  function onMove(e){
    if(!drag) return;
    drag.x = e.clientX; drag.y = e.clientY;
    moveCopy();
    announceOver();
  }
  function onUp(e){
    if(!drag) return;
    drag.x = e.clientX; drag.y = e.clientY;
    finish(true);
  }
  function onKeyDown(e){
    if(!drag) return;
    // Nothing else on the page hears keys while a card is in the air.
    e.stopImmediatePropagation();
    e.preventDefault();
    if(e.key === 'Escape'){ finish(false); return; }
    if(e.key.indexOf('Arrow') === 0){
      drag.keys[e.key] = true;
      drag.fast = e.shiftKey;
    }
  }
  function onKeyUp(e){
    if(!drag) return;
    delete drag.keys[e.key];
    drag.fast = e.shiftKey;
  }
  function onBlur(){ finish(false); }

  function finish(drop){
    var d = drag; if(!d) return;
    drag = null;
    cancelAnimationFrame(d.raf);
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    document.body.classList.remove('sb-carrying-card');
    if(d.copy && d.copy.parentNode) d.copy.parentNode.removeChild(d.copy);
    d.src.style.opacity = d.srcOpacity;
    if(d.over){
      if(drop && d.accepts) fire(d, d.over, 'drop');
      else fire(d, d.over, 'dragleave', { relatedTarget: null });
    }
    fire(d, d.src, 'dragend');
    // The mouse-up that ends a carry must not also count as a click on
    // whatever it lands on (a native drag never produces one either).
    var swallow = function(ev){ ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener('click', swallow, true);
    setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 60);
  }

  function startCarry(e, src){
    var dt = new DataTransfer();
    // Let the card's own start-of-drag code run (it records what is being
    // carried), aimed at our data bag instead of the browser's.
    var ds = new DragEvent('dragstart', {
      bubbles: true, cancelable: true, composed: true,
      clientX: e.clientX, clientY: e.clientY, dataTransfer: dt
    });
    ds.__t2tCarried = true;
    src.dispatchEvent(ds);

    var rect = src.getBoundingClientRect();
    var copy = src.cloneNode(true);
    // A copy must never be mistaken for the real card by id lookups.
    copy.removeAttribute('id'); copy.removeAttribute('draggable');
    copy.removeAttribute('data-header-id');
    Array.prototype.forEach.call(copy.querySelectorAll('[id],[data-header-id]'), function(n){
      n.removeAttribute('id'); n.removeAttribute('data-header-id');
    });
    copy.style.cssText += ';position:fixed;margin:0;pointer-events:none;z-index:2147483000;'
      + 'width:' + rect.width + 'px;height:' + rect.height + 'px;opacity:.88;'
      + 'box-shadow:0 8px 22px rgba(26,58,92,.35);transition:none;box-sizing:border-box';
    document.body.appendChild(copy);

    drag = {
      src: src, dt: dt, copy: copy,
      x: e.clientX, y: e.clientY,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top,
      over: null, accepts: false, lastOver: 0,
      keys: {}, fast: false, raf: 0,
      srcOpacity: src.style.opacity
    };
    src.style.opacity = '.35';
    document.body.classList.add('sb-carrying-card');
    moveCopy();

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    drag.raf = requestAnimationFrame(frame);
    announceOver();
  }

  // Capture phase on the document: runs before the card's own handlers.
  document.addEventListener('dragstart', function(e){
    if(e.__t2tCarried || drag) return;
    var screen = activeScreen(); if(!screen) return;
    var t = e.target;
    if(!t || !t.closest) return; // a text selection or file, not a card
    var src = t.closest('[draggable="true"]');
    if(!src || !screen.contains(src)) return;
    if(typeof DragEvent !== 'function' || typeof DataTransfer !== 'function') return; // old browser: keep the built-in drag
    e.preventDefault();
    e.stopImmediatePropagation();
    startCarry(e, src);
  }, true);

  // Lets the rest of the code (and a quick live check) see the layer is in.
  window.T2TStoryboardDragWithArrows = { isCarrying: function(){ return !!drag; } };
  var st = document.createElement('style');
  st.textContent = 'body.sb-carrying-card{user-select:none;-webkit-user-select:none;cursor:grabbing}';
  document.head.appendChild(st);
})();
