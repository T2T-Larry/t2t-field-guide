/* ============================================================
   drawer-surprise-tray.js — Drawer Surprise Tray. The two "extra"
   slots each drawer carries beyond its real content (tools on the
   left, phases on the right): tap-slot 2, the traveler-made "new
   tray" a traveler can drop things into and name (the junk drawer /
   Library tray), and tap-slot 3, the triple-tap surprise (today: a
   monkey playing cymbals, or a donkey, picked at random). Named
   "Drawer" up front because both live inside the drawer/tray
   structure Drawer System owns, not as a standalone feature of their
   own -- Larry's own naming catch when this file was still just
   called "Surprise Tray."

   Split out of screen-zero.js (Sept 4 2026) -- see the Field Guide
   Project Journal for the full split plan. Depends on Drag Engine
   (window.SZDragCore.makeDraggable) and Drawer System (window.SZDrag's
   claim-registry functions, and window.SZDrawerRename for the same
   rename-card popup the tool/phase trays use) -- load this file AFTER
   both of those.
   ============================================================ */

(function(){

  /* ---------- Custom tray slot -- Larry, July 31 2026: "Can traveler
     open a new tray (cluster) of objects? ... How might that happen?"
     then, after talking through drag-to-combine vs. an explicit new-
     tray gesture vs. this: "yes" to building the still-empty junk-
     drawer slot (mode 2, both drawers) as the birthplace. Nothing new
     needed for an object to JOIN this tray -- dropping anything onto
     a drawer while it's showing slot 2 already claims side+'-2'
     through the exact same riding-slot system every other object
     uses (see Drawer System's wireDetachableRailButton/
     wireToolButtonDrag reattachTargets). What's new here is purely the
     tray's own identity once it has members: a grip that appears the
     moment the slot holds its first one, drags the whole cluster
     together via a shared, persisted group offset instead of touching
     any member's own saved spot, and the same double-click rename
     card Tools/Phases already use -- keyed by side, so left and right
     can each become their own independently-named tray. ---------- */
  function trayGroupOffsetKey(side){ return 't2t_trayGroupOffset_' + side; }
  function loadTrayGroupOffset(side){
    try {
      var v = JSON.parse(localStorage.getItem(trayGroupOffsetKey(side)));
      if (v && typeof v.x === 'number' && typeof v.y === 'number') return v;
    } catch(e){}
    return { x: 0, y: 0 };
  }
  function saveTrayGroupOffset(side, x, y){
    try { localStorage.setItem(trayGroupOffsetKey(side), JSON.stringify({ x: x, y: y })); }
    catch(e){}
  }
  // Not currently called from anywhere (was true before the split
  // too) -- kept as-is rather than dropped, since removing working
  // code that isn't actually causing a problem isn't part of what
  // Larry asked for here. Reads the shared claim registry via
  // window.SZDrag's small accessor rather than a local variable, since
  // that registry now lives in Drawer System's own file.
  function traySlotMemberCount(side){
    var slot = window.SZDrag.slotKey(side, '2');
    var n = 0;
    window.SZDrag.getClaimRegistry().forEach(function(rec){
      if (window.SZDrag.isRidingDrawer(rec.storeKey) && window.SZDrag.getRidingSlot(rec.storeKey) === slot) n++;
    });
    return n;
  }

  function wireTrayGripDrag(grip, side){
    var dragging = false, moved = false, startX = 0, startY = 0, startOffset = { x: 0, y: 0 };
    function pointOf(e){ return e.touches ? e.touches[0] : e; }
    function onDown(e){
      var p = pointOf(e);
      window.T2TFront.bump(grip); // picking it up brings it to the front of everything else -- see Drag Engine's own onDown for why this matters once a member is sitting on top of it
      dragging = true; moved = false;
      startX = p.clientX; startY = p.clientY;
      startOffset = loadTrayGroupOffset(side);
    }
    function onMove(e){
      if (!dragging) return;
      var p = pointOf(e);
      var dx = p.clientX - startX, dy = p.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      if (e.cancelable) e.preventDefault();
      saveTrayGroupOffset(side, startOffset.x + dx, startOffset.y + dy);
      var barEl = document.getElementById(side === 'left' ? 'sz-navbar' : 'sz-drawer-r');
      if (barEl) window.SZDrag.refreshRidersForSlot(side, '2', barEl);
    }
    function onUp(){ dragging = false; }
    grip.addEventListener('mousedown', onDown);
    grip.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  // Larry, July 31 2026: "Is there a way to change the name of a
  // button?" Same idea as the tool/phase tray's own rename -- saved
  // separately per side so left and right can each carry their own
  // name. Identical literal prefix string to the one Drawer System
  // uses for the Tools/Phases tray grips (they're deliberately the
  // same localStorage namespace, just a different id per tray), so
  // this is a small, safe duplication rather than a cross-file
  // constant.
  var TRAY_LABEL_PREFIX = 't2t_trayLabel_';
  function loadCustomLabel(prefix, id, fallback){
    try { return localStorage.getItem(prefix + id) || fallback; } catch(e){ return fallback; }
  }
  function saveCustomLabel(prefix, id, label){
    try { localStorage.setItem(prefix + id, label); } catch(e){}
  }

  function buildCustomTraySlot(side){
    var panel = document.createElement('div');
    panel.className = 'sz-mode-panel sz-mode-placeholder sz-custom-tray';

    var grip = document.createElement('div');
    grip.className = 'sz-tool-stack-grip sz-custom-tray-grip';
    grip.dataset.side = side;
    grip.title = 'Drag to move the whole tray -- double-click to rename it';
    grip.textContent = '⋮⋮ ' + loadCustomLabel(TRAY_LABEL_PREFIX, side + '-tray', 'New Tray');
    // Larry, July 31 2026 (bug report): "the Library tray has
    // disappeared" -- it hadn't, but an empty tray used to show
    // nothing but the same generic embossed "Drawer" watermark every
    // other empty slot shows, with no name on screen to tell it apart
    // or confirm you're even looking at it before dropping something.
    // The grip (and the name on it) now shows the instant this page
    // is showing, member or not -- same idea as a real drawer keeping
    // its label on the front even when it's empty.
    grip.addEventListener('dblclick', function(){
      var current = loadCustomLabel(TRAY_LABEL_PREFIX, side + '-tray', 'New Tray');
      window.SZDrawerRename.open('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, side + '-tray', newName);
        grip.textContent = '⋮⋮ ' + newName;
      });
    });
    wireTrayGripDrag(grip, side);
    panel.appendChild(grip);

    return panel;
  }

  function buildModePlaceholder(label){
    var p = document.createElement('div');
    // Larry, July 29 2026: right drawer's slots 1 and 2 lose both the
    // "Right drawer -- slot N (not yet designated)" statement and the
    // dashed "not built yet" border (sz-mode-tbd) -- same bare-panel
    // treatment left drawer's slot 2 already got. Only buildModePlaceholder
    // callers left are these two, so this drops the border for good
    // rather than special-casing it per call site.
    p.className = 'sz-mode-panel sz-mode-placeholder';
    if (label) p.textContent = label;
    return p;
  }

  // Larry, July 27 2026: "a monkey playing cymbals to put into a
  // triple click drawer" -- the real surprise content for mode 3.
  // The rotating "not designed yet" placeholder text that used to
  // share this slot is gone (Larry, same day: "no pin with A future
  // surprise comment") now that there's a real object living here.
  var SURPRISE_GIF_URL = 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3dsdTg4cm9jcmllcTd2c3JxZjhxaDEwM3N3Z2JtdGh4eHpsaTM1aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/k5cnWfaRTPgze/giphy.gif';

  // A real "pile" instead of one fixed object -- Larry, Aug 4 2026,
  // pointed at the "Donkey" card already sitting on a storyboard and
  // asked to add it in here alongside the monkey. Session 148's
  // original ask was that a bigger set should hand back a fresh
  // random pick each time an object's dropped back home; the modest
  // version built here picks one at random each time a drawer is
  // built (so left and right can each surprise with a different one),
  // without touching the monkey's own hard-won drag/position code.
  var SURPRISE_ITEMS = [
    { url: SURPRISE_GIF_URL, alt: 'A monkey playing cymbals' },
    { url: 'https://jyvvbjxqmxdgsxfcrfdn.supabase.co/storage/v1/object/public/sea-of-ideas/819d8af0-3105-47c6-8208-a75a9d4dfd05/1783983964606-image.jpg', alt: 'Donkey' }
  ];
  function pickSurpriseItem(){
    return SURPRISE_ITEMS[Math.floor(Math.random() * SURPRISE_ITEMS.length)];
  }

  function injectSurpriseStyle(){
    if (document.getElementById('sz-surprise-style')) return;
    var css = ''
      // Larry, July 29 2026: "delete dotted lines too!" -- the
      // surprise slot needs a bit more room than the plain
      // placeholders now that it holds a real image.
      + '.sz-surprise-panel{min-height:150px;border:none}'
      + '.sz-surprise-gif{width:72px;height:72px;border-radius:8px;object-fit:cover;'
      +   'border:2px solid #b89968;box-shadow:0 3px 8px rgba(0,0,0,.3);cursor:grab;'
      +   '-webkit-user-drag:none;user-select:none}'
      + '.sz-surprise-gif.sz-dragging{cursor:grabbing}'
      // The one-off "you found it" celebration for the triple-tap
      // surprise slot -- the content behind it is meant to rotate over
      // time (see pickSurpriseItem above), but the little burst itself
      // can be consistent every time, per Larry's "fireworks or
      // something hidden" note.
      + '.sz-flourish{position:absolute;font-size:22px;pointer-events:none;'
      +   'animation:sz-flourish-pop .9s ease forwards;left:50%;top:8px;'
      +   'transform:translateX(-50%)}'
      + '@keyframes sz-flourish-pop{'
      +   '0%{opacity:0;transform:translateX(-50%) scale(.4)}'
      +   '30%{opacity:1;transform:translateX(-50%) scale(1.2)}'
      +   '100%{opacity:0;transform:translateX(-50%) scale(1) translateY(-16px)}}'
      ;
    var style = document.createElement('style');
    style.id = 'sz-surprise-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // The monkey should "drag out of the drawer and stay there if
  // desired" (Larry, July 27 2026), and stick to whichever slot it's
  // dropped into rather than following every mode switch -- same
  // slot-claim machinery as the tool/phase buttons. Left and right
  // drawers each build their own independent GIF (buildSurprisePanel
  // is called once per drawer), so each gets its own storage key and
  // can be claimed to a different slot from the other.
  function wireSurpriseGifDrag(img, storeKey, ownBar, ownSide, ownPanel, item){
    var rec = window.SZDrag.registerClaimable(img, storeKey, 60);
    var otherSide = ownSide === 'left' ? 'right' : 'left';
    var otherId = ownSide === 'left' ? 'sz-drawer-r' : 'sz-navbar';
    window.SZDragCore.makeDraggable(img, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      // Drop the monkey onto the open Notebook card and it goes INTO the
      // entry (Larry's own original example for this whole feature)
      // instead of falling through onto the desktop -- see Drag
      // Engine's dropTargets comment above for why this has to be
      // checked before the ordinary reattach/independent-drop logic
      // below runs.
      dropTargets: [
        { get el(){
            return (window.NotebookOpen && window.NotebookOpen.isOpen())
              ? document.querySelector('#nb-layer .nb-pcard') : null;
          },
          onDrop: function(){
            return !!(window.NotebookOpen && window.NotebookOpen.insertImageUrl &&
              window.NotebookOpen.insertImageUrl(item.url, item.alt));
          }
        }
      ],
      // Larry, Aug 4 2026 (bug report, third round): "When I move
      // monkey in drawer then close the drawer the monkey jumps out
      // of the drawer. AN OBJECT SHOULD STAY WHERE IT IS PUT!"
      // Root cause of this whole back-and-forth: the monkey's OWN
      // drawer/mode-3 slot was special-cased as "home" -- dropped
      // there, it reset to a hardcoded centered spot instead of
      // remembering exactly where it was dropped (unlike every other
      // slot-riding object, which always calls captureRidingOffset).
      // That's what made the hit-test tight in the previous pass (to
      // make escaping the reset easier), which in turn meant a drop
      // that still visually looked "in the drawer" but missed the
      // narrow target fell through to an independent, document.body,
      // position:fixed placement instead -- one that doesn't belong
      // to any slot, so refreshRidersForSlot's own collapse-hides-it
      // logic never applies, and it stays visible ("jumps out") when
      // the drawer collapses.
      //
      // Fixed at the actual source instead of patching the hit-test
      // again: the monkey's own drawer is no longer special-cased at
      // all -- landing on EITHER drawer (including its own, any mode)
      // now goes through the exact same setRidingSlot +
      // captureRidingOffset + refreshRidersForSlot path every other
      // riding object already uses. That system already remembers the
      // precise drop position AND already correctly hides/shows with
      // its bar's own collapsed state, so both bugs disappear by using
      // the proven mechanism instead of a bespoke one. The hit-test
      // also goes back to the plain, generous floor-to-ceiling target
      // every other object uses.
      reattachTargets: [
        { el: ownBar, side: ownSide },
        { get el(){ return document.getElementById(otherId); }, side: otherSide }
      ],
      onIndependent: function(){
        if (img.parentNode !== document.body) document.body.appendChild(img);
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        window.SZDrag.setRidingSlot(storeKey, window.SZDrag.slotKey(side, mode));
        window.SZDrag.captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        window.SZDrag.refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  function buildSurprisePanel(bar, side){
    injectSurpriseStyle();
    var wrap = document.createElement('div');
    wrap.className = 'sz-mode-panel sz-mode-placeholder sz-surprise-panel';
    wrap.style.position = 'relative';
    var item = pickSurpriseItem();
    var img = document.createElement('img');
    img.className = 'sz-surprise-gif sz-drawer-drag-exclude';
    img.src = item.url;
    img.alt = item.alt;
    // Larry, July 27 2026 (bug report): the monkey wouldn't budge out
    // of the drawer. Root cause: <img> elements are natively
    // draggable in every browser by default, so a mousedown-drag on
    // it was being hijacked by the browser's own ghost-image drag
    // before the custom mouse-drag logic below ever saw a real
    // mousemove -- it just snapped back on release, looking stuck.
    // Killing native drag here (the attribute for Chrome/Firefox,
    // dragstart preventDefault as backup for Safari) lets the real
    // drag take over, same as the corner-flip tabs elsewhere in this
    // codebase already do for their own elements.
    img.draggable = false;
    img.addEventListener('dragstart', function(e){ e.preventDefault(); });
    wrap.appendChild(img);
    wireSurpriseGifDrag(img, 't2t_surpriseGif_' + side, bar, side, wrap, item);
    return { el: wrap };
  }

  function triggerFlourish(container){
    injectSurpriseStyle();
    var f = document.createElement('div');
    f.className = 'sz-flourish';
    f.textContent = '🎆';
    container.appendChild(f);
    setTimeout(function(){ f.remove(); }, 950);
  }

  window.SZSurpriseTray = {
    buildCustomTraySlot: buildCustomTraySlot,
    buildModePlaceholder: buildModePlaceholder,
    buildSurprisePanel: buildSurprisePanel,
    triggerFlourish: triggerFlourish,
    // Read access for Drawer System -- a tool or phase button dropped
    // into a drawer's mode-2 (the custom tray) slot needs to line up
    // with wherever this tray's own grip has been dragged, same shared
    // group offset wireTrayGripDrag itself reads/writes.
    loadTrayGroupOffset: loadTrayGroupOffset
  };

})();
