/* ============================================================
   drag-engine.js — Drag Engine. The one shared mechanism that lets
   anything on the desk be picked up and moved: mouse/touch tracking,
   "which of several drop targets did this actually land on," and the
   shared "whatever you just touched jumps to the front" stacking
   counter. Pure mechanics — no visual styling of its own, which is
   why it has no matching "Style" file the way Desktop and the
   Drawer System each do.

   Split out of screen-zero.js (Sept 4 2026) as part of Larry's
   code-hygiene cleanup once that file passed 3,500 lines — see the
   Field Guide Project Journal for the full split plan. This piece is
   entirely self-contained: it doesn't call into any of the other
   five files, it only gets called BY them. Everything it needs to
   share back out is exposed on window.T2TFront (the front-of-stack
   counter, unchanged name/shape so tv-frame.js keeps working exactly
   as before) and window.SZDragCore.makeDraggable (a new, minimal
   handle the other desk files use in place of what used to be a
   same-file function call).

   Loaded FIRST among the six desk files, before Drawer System,
   Drawer Style, Drawer Surprise Tray, Desktop Screen, Desktop Style,
   and before tv-frame.js (which also reads window.T2TFront).
   ============================================================ */

(function(){

  /* ---------- Bring-to-front -- Larry, July 31 2026: "I opened the
     Field Guide on top of the nametag, but the nametag jumped on top
     of the Field Guide. On the desktop, stuff can get stacked on top
     of other stuff." Root cause: every floating object had a FIXED
     stacking priority (nameplate/notebook/tool buttons all hardcoded
     z-index:9999, drawers 9998, the TV frame/widget no z-index at
     all) -- whoever's number was highest always won, regardless of
     which one a traveler had actually just touched. Real desks don't
     work that way; whatever you just picked up sits on top of the
     pile. One shared, ever-increasing counter starting above every
     existing hardcoded value -- picking up ANY object bumps it past
     everything else touched so far. Exposed on window (not just a
     local var) because tv-frame.js is a separate file/IIFE that drags
     the Field Guide widget with its own code, not this file's shared
     makeDraggable -- both need to draw from the exact same counter or
     "most recently touched" could disagree between the two.
     Deliberately never rewinds -- an ever-climbing number is simpler
     and cheaper than tracking a full stacking list, and CSS z-index
     has effectively unlimited headroom for how long anyone will
     actually keep one page open. ---------- */
  window.T2TFront = window.T2TFront || (function(){
    var top = 10000; // above every existing hardcoded 9997-9999 value
    return {
      bump: function(el){
        if (!el) return;
        top += 1;
        el.style.zIndex = String(top);
      }
    };
  })();

  /* ---------- Larry, July 29 2026: "Nothing is in a drawer unless it
     is completely in it. Partially out of the drawer is OUT of the
     drawer." First pass required the dragged object's WHOLE rect to
     fit inside the target's rect -- correct for a corner-clip (a
     sliver of overlap no longer counts as docked), but too strict as
     the actual drop test: a 150px tool button has to land within a
     ~50px-wide margin of a 200px drawer to register at all, and a
     180px nameplate only has ~20px of room to work with -- Larry, July
     29 2026 (same day, later): "Tried to move Field Guide to drawer on
     the right side but it would not go there." Fixed by testing the
     dragged object's CENTER POINT against the target's rect instead of
     its whole box -- still refuses a corner-clip (the center has to be
     genuinely over the drawer, not just touching it), but gives a drop
     the same forgiving hit-area every other drag target already gets.
     Once something IS riding a drawer, refreshRidersForSlot always
     places it at an exact offset inside the drawer's own bounds, so it
     never sits half-in/half-out while docked either way -- this only
     changes how generous the initial drop itself is. ---------- */
  function dropHitsTarget(dragRect, targetRect){
    var cx = dragRect.left + dragRect.width / 2;
    var cy = dragRect.top + dragRect.height / 2;
    return cx >= targetRect.left && cx <= targetRect.right &&
           cy >= targetRect.top && cy <= targetRect.bottom;
  }

  // Larry, July 31 2026 (bug report): "buttons... disappear when
  // drawer is closed and reappear when that drawer is open... I
  // thought we had a rule that an object had to be completely inside
  // a drawer to be in a drawer?" -- then, confirming it wasn't just a
  // one-off: "It might be a desktop issue? When I put the loose
  // buttons in the right drawer, the left drawer closed without
  // taking them with it" (i.e. the slot system itself keeps left/
  // right correctly separate -- the bug is specifically about objects
  // that were SUPPOSED to land independently on the open desk).
  //
  // Root cause: #sz-navbar/#sz-drawer-r are deliberately floor-to-
  // ceiling (top:0;bottom:0) so they always look like a full column --
  // but that means the drawer's OWN element covers the entire screen
  // height no matter which point-testing algorithm dropHitsTarget
  // uses (center-point or full containment both pass anywhere in that
  // 200px-wide strip). A button dropped well clear of the visible
  // button cluster, but still technically inside that tall strip, was
  // silently getting claimed by the drawer instead of landing
  // independent on the desk -- then correctly hiding/showing with
  // THAT drawer's own open/closed state from then on, which is
  // exactly what looked like a bug (it wasn't lying about being "in a
  // drawer," it just never should have counted as dropped there).
  //
  // Fix: for the two drawer bars specifically, hit-test against the
  // CURRENTLY ACTIVE mode panel inside them (sized to its real
  // content, not the full column) instead of the bar's own floor-to-
  // ceiling rect. Every other reattach target (the tool/phase stack,
  // etc.) is already content-sized, so this only changes behavior for
  // the two bars. Deliberately leaves dropHitsTarget's own center-
  // point-vs-containment choice untouched -- that already has its own
  // separate history (July 29: containment was tried and reverted for
  // blocking legitimate docks) not worth reopening here.
  // Larry, July 31 2026 (bug report, same day, later): "I put the
  // nametag in the drawer but closing the drawer left the nametag on
  // the desktop?" The active-panel rect above was sized to its exact
  // content -- correct for excluding the dead space that caused the
  // original bug, but for a small or still-empty panel (the new-tray
  // placeholder is only 150x80) that's a genuinely tight target: a
  // drop landing just outside it now silently fell through to
  // independent placement instead of claiming the drawer, so closing
  // the drawer correctly left it alone -- it never actually made it
  // in, even though it looked close enough. DOCK_PAD gives the active
  // panel some real breathing room -- still nowhere near the full
  // floor-to-ceiling column the original bug was about, but forgiving
  // enough that landing near the visible content actually counts.
  // Larry, July 31 2026 (bug report, same day, yet later): "Slid
  // tools lower in the drawer and now they are on the desktop?" Even
  // padded, a box sized to the active panel's own content was still
  // too tight -- the drawer's card itself is genuinely floor-to-
  // ceiling (CARD_LOOK spans top:0;bottom:0), so visually there's no
  // difference between "near the buttons" and "further down the same
  // solid card" for a traveler dragging something around inside it.
  // Trying to shrink the VERTICAL extent was fighting how the drawer
  // actually looks. Splitting the two dimensions instead: height now
  // uses the drawer's own real full extent (matches what's actually
  // on screen -- sliding something anywhere up/down the same card
  // still counts as inside it), width stays bounded to the active
  // panel's own footprint plus DOCK_PAD (the dimension that actually
  // mattered for the original bug -- an object dropped clearly out on
  // the open desktop, to the side of both drawers, still correctly
  // misses).
  var DOCK_PAD = 40;
  function drawerHitRect(el){
    if (el && (el.id === 'sz-navbar' || el.id === 'sz-drawer-r')) {
      var active = el.querySelector('.sz-mode-panel.sz-mode-active');
      var full = el.getBoundingClientRect();
      if (active) {
        var r = active.getBoundingClientRect();
        return { left: r.left - DOCK_PAD, right: r.right + DOCK_PAD,
                  top: full.top, bottom: full.bottom };
      }
      return full;
    }
    return el.getBoundingClientRect();
  }

  /* ---------- Generic free-drag, shared by every draggable object on
     the desk -- one object, one localStorage key, same mouse/touch
     handling for all of them. Position is remembered per browser; a
     plain click (no movement) still fires the element's own click
     handler (e.g. clicking a tool button inside the rail).

     opts.reattachTo / opts.onReattach -- Larry, July 26: dropping a
     traveler-claimed object back onto the drop target (the nav
     drawer, for the notebook) un-claims it instead of saving it as
     its own independent spot, so it goes back to riding the drawer
     (including hiding with it when closed) from here on. ---------- */
  function makeDraggable(el, storeKey, excludeSelector, defaultLeft, defaultTop, opts){
    var dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function applyPos(left, top){
      el.style.position = 'fixed';
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.margin = '0';
    }

    var restored = false;
    try {
      var saved = JSON.parse(localStorage.getItem(storeKey));
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        applyPos(saved.left, saved.top);
        restored = true;
      }
    } catch(e){}
    // skipDefaultPos -- for objects whose "home" is normal document
    // flow (the tool buttons riding inside the drawer's own list),
    // not a floating desk spot. Without a saved independent position,
    // leave position/left/top alone entirely instead of forcing
    // position:fixed via defaultLeft/defaultTop, so CSS layout keeps
    // rendering it wherever it naturally sits until it's actually
    // dragged out. Larry, July 27 2026: "Tool button stack should drag
    // from drawer if desired."
    if (!restored && !(opts && opts.skipDefaultPos)) applyPos(defaultLeft, defaultTop);

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (excludeSelector && e.target.closest(excludeSelector)) return;
      window.T2TFront.bump(el); // picking it up brings it to the front of everything else
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
      // opts.onDragMove -- live callback fired on every move, used by
      // the tool-group reordering (Drawer System) to swap sibling order
      // as the dragged button crosses another one, without needing its
      // own separate mouse-tracking machinery.
      if (opts && opts.onDragMove) opts.onDragMove(el.getBoundingClientRect());
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = el.getBoundingClientRect();

      // opts.dropTargets -- Larry, July 29 2026 (bug report): dragged the
      // monkey onto the open Notebook expecting it to go INTO the entry
      // (his own original example for this feature), but it just fell
      // through onto the desktop underneath -- the Notebook card wasn't a
      // target this drag system knew about at all, so it landed as an
      // ordinary independent desktop drop, then got visually covered by
      // the Notebook floating above it (looked like it fell "through").
      // General hook for "something else on screen wants first refusal
      // on this drop": each target's onDrop(rect) runs only if the
      // dropped rect overlaps that target's own rect; if onDrop returns
      // true, the drop is considered fully handled elsewhere (e.g. the
      // monkey's GIF got inserted into the notebook entry) and this
      // function snaps the dragged element straight back to where the
      // drag started, rather than leaving a second independent copy
      // sitting on the desktop underneath whatever it was dropped onto.
      if (opts && opts.dropTargets) {
        for (var dti = 0; dti < opts.dropTargets.length; dti++) {
          var dt = opts.dropTargets[dti];
          if (!dt || !dt.el || typeof dt.el.getBoundingClientRect !== 'function') continue;
          var dr = dt.el.getBoundingClientRect();
          var dOverlaps = !(rect.right < dr.left || rect.left > dr.right ||
                             rect.bottom < dr.top || rect.top > dr.bottom);
          if (dOverlaps && dt.onDrop && dt.onDrop(rect)) {
            applyPos(startLeft, startTop);
            return;
          }
        }
      }

      // "Stick to the side when close to it" -- snap flush against
      // whichever screen edge the rail was dragged near, same idea as
      // a window magnetizing to the edge of a desktop.
      if (opts && opts.snapEdges) {
        var threshold = opts.snapThreshold || 48;
        if (rect.left <= threshold) {
          applyPos(0, rect.top);
        } else if (window.innerWidth - rect.right <= threshold) {
          applyPos(window.innerWidth - rect.width, rect.top);
        }
        rect = el.getBoundingClientRect();
      }

      // Dropped onto the reattach target (the nav drawer, for the
      // notebook) -- un-claim it so it rides the drawer again instead
      // of keeping this drop as its own independent spot.
      if (opts && opts.reattachTo) {
        var t = opts.reattachTo.getBoundingClientRect();
        var overlaps = dropHitsTarget(rect, t);
        if (overlaps) {
          try { localStorage.removeItem(storeKey); } catch(e){}
          if (opts.onReattach) opts.onReattach();
          return;
        }
      }

      // General version of the same idea, for objects that can be
      // claimed by EITHER drawer, not just one fixed target -- Larry,
      // July 27 2026: "every object on a screen should be movable...
      // drag it onto a drawer to put it away."
      //
      // Larry, July 31 2026 (bug report): "Field Guide button will not
      // drag into the right drawer." Root cause: BOTH the left rail
      // and the right drawer can independently dock to either side of
      // the screen (dockRail/dockRightDrawer), so their rects can end
      // up covering the exact same area -- e.g. the left rail dragged
      // over to the right side, sitting on top of the right drawer.
      // The old logic took the FIRST target in the array whose rect
      // contained the drop point, which for a tool button always meant
      // "my own rail" (checked before "the other drawer") even when
      // the other drawer was the one actually visible/on top at that
      // spot. Now, when more than one target's rect contains the drop
      // point, the tie is broken by asking the browser what's really
      // on top at that exact pixel (document.elementsFromPoint, same
      // thing native drag-and-drop would use) -- whichever target
      // contains that real topmost element wins, so a drop always
      // lands wherever it visually looks like it landed. Falls back to
      // the first match if that still can't be resolved (e.g. no
      // overlap edge case), so nothing regresses in the common case
      // where only one target ever matches.
      if (opts && opts.reattachTargets) {
        var matches = [];
        for (var ri = 0; ri < opts.reattachTargets.length; ri++) {
          var target = opts.reattachTargets[ri];
          if (!target || !target.el) continue;
          // hitEl -- Larry, Aug 4 2026 (bug report): "Monkey in the drawer
          // always snaps to middle and does not stay where it is put."
          // Root cause: this target's own drawer bar is deliberately
          // floor-to-ceiling for drawerHitRect's own-drawer special case
          // (see that function's July 31 history), so almost any drop
          // anywhere near the drawer's horizontal position -- even well
          // clear of the small monkey placeholder itself -- still counted
          // as "home" and re-centered it. hitEl lets a caller hit-test
          // against a smaller, real element (the monkey's own placeholder
          // box) while still reporting the actual bar as the match for
          // onReattach's mode-reading logic below, without changing
          // drawerHitRect's shared behavior for every other rider.
          var tr = drawerHitRect(target.hitEl || target.el);
          if (dropHitsTarget(rect, tr)) matches.push(target);
        }
        // Larry, July 31 2026 (bug report): objects kept landing in
        // the LEFT drawer no matter how many times he aimed for the
        // right one. Root cause: this used to default winner to
        // matches[0] up front, and only OVERWRITE it if
        // elementsFromPoint found a confident answer -- any time that
        // tie-break couldn't resolve (topOther pointing at neither
        // matched target, e.g. the desk backdrop showing through a
        // gap between two padded hit rects), winner silently stayed
        // matches[0]. reattachTargets is always defined left-then-
        // right everywhere it's used, so every unresolved tie quietly
        // favored the left drawer, regardless of where the drop
        // actually looked like it landed. Now winner starts genuinely
        // undecided, and an unresolved tie breaks by proximity --
        // whichever matched target's own center is physically closest
        // to the drop -- instead of by array order.
        var winner = null;
        if (matches.length === 1) {
          winner = matches[0];
        } else if (matches.length > 1) {
          if (document.elementsFromPoint) {
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            var underCursor = document.elementsFromPoint(cx, cy);
            var topOther = null;
            for (var ui = 0; ui < underCursor.length; ui++) {
              if (underCursor[ui] !== el && !el.contains(underCursor[ui])) { topOther = underCursor[ui]; break; }
            }
            if (topOther) {
              for (var mi = 0; mi < matches.length; mi++) {
                if (matches[mi].el.contains(topOther)) { winner = matches[mi]; break; }
              }
            }
          }
          if (!winner) {
            var dcx = rect.left + rect.width / 2, dcy = rect.top + rect.height / 2;
            var bestDist = Infinity;
            for (var pi = 0; pi < matches.length; pi++) {
              var ptr = drawerHitRect(matches[pi].el);
              var pcx = (ptr.left + ptr.right) / 2, pcy = (ptr.top + ptr.bottom) / 2;
              var dist = (dcx - pcx) * (dcx - pcx) + (dcy - pcy) * (dcy - pcy);
              if (dist < bestDist) { bestDist = dist; winner = matches[pi]; }
            }
          }
        }
        if (winner) {
          try { localStorage.removeItem(storeKey); } catch(e){}
          if (opts.onReattach) opts.onReattach(winner.side, winner.el);
          return;
        }
      }

      try { localStorage.setItem(storeKey, JSON.stringify({ left: rect.left, top: rect.top })); }
      catch(e){}
      // opts.onIndependent -- for objects natively nested inside a
      // conditionally-hidden container (a mode panel), dropping them
      // on open desk space still needs to escape that container the
      // same way claiming a drawer slot does (see refreshRidersForSlot,
      // in Drawer System), otherwise it silently vanishes the instant
      // its old panel's mode/side stops being the active one, even
      // though it's not riding anything anymore.
      if (opts && opts.onIndependent) opts.onIndependent();
    }

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  // Minimal handle the other five desk files use in place of what used
  // to be a same-closure function call. Kept deliberately small (just
  // the one function) -- dropHitsTarget/drawerHitRect are pure internal
  // helpers of makeDraggable itself and nothing outside this file ever
  // called them directly even before the split.
  window.SZDragCore = {
    makeDraggable: makeDraggable
  };

})();
