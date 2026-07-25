
(function () {
  /* Baseline layout for anyone loading the page with nothing saved yet
     (a fresh browser, or localStorage cleared) -- captured from Larry's
     own arrangement on the desk so a first-time load already looks
     right instead of starting from the old grid default. Dragging still
     works exactly as before and still overrides this per-browser via
     localStorage the moment something is moved. */
  var DEFAULT_POSITIONS = {
    't2t-drag-nameplate':  { left: 15.7846, top: 15.2483 },
    't2t-drag-notebook':   { left: 1140.97, top: 294.153 },
    't2t-drag-bookslot':   { left: 583.126, top: 130.38 },
    't2t-drag-topicframe': { left: 562.123, top: 16.2062 },
    't2t-drag-tools':      { left: 52.3269, top: 197.582 }
    // No defaults yet for the binder's own internal pieces (hinges,
    // tabs, round buttons) -- those are brand new to dragging, so they
    // simply start at whatever spot their normal CSS already puts them
    // until Larry places them and this list gets updated to match.
  };

  function wireToolButtons(rootEl, onPress) {
    var buttons = rootEl.querySelectorAll('.tool-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('pressed'); });
        btn.classList.add('pressed');
        if (onPress) onPress(btn.getAttribute('data-tool'));
      });
    });
  }

  function wireNotebook(rootEl, onOpen) {
    var notebook = rootEl.querySelector('.desk-notebook');
    if (!notebook) return;
    notebook.addEventListener('click', function () {
      if (onOpen) onOpen();
    });
  }

  function wireRoundButtons(rootEl, onPress) {
    var buttons = rootEl.querySelectorAll('.round-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (onPress) onPress(btn.getAttribute('data-tool'));
      });
    });
  }

  function setNameplate(rootEl, name) {
    var el = rootEl.querySelector('.desk-nameplate-text');
    if (el) el.textContent = name || 'MEMBER';
  }

  function setMapPosition(rootEl, currentStep, totalSteps) {
    var marker = rootEl.querySelector('.desk-map-marker');
    if (!marker || !totalSteps) return;
    var pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
    marker.style.left = pct + '%';
  }

  /* ------------------------------------------------------------------
     Shared drag/selection state for one scene (the desk). Every object
     made draggable via makeDraggable registers itself here, so a lasso
     drawn over empty desk space can find them, and a group of selected
     objects can be moved together as one.
     ------------------------------------------------------------------ */
  function dragState(sceneEl) {
    if (!sceneEl._t2tDrag) {
      sceneEl._t2tDrag = { items: [], selected: new Set() };
    }
    return sceneEl._t2tDrag;
  }

  function setSelected(sceneEl, els) {
    var state = dragState(sceneEl);
    state.selected.forEach(function (el) { el.classList.remove('desk-selected'); });
    state.selected = new Set(els);
    state.selected.forEach(function (el) { el.classList.add('desk-selected'); });
  }

  function storageKeyFor(state, el) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].el === el) return state.items[i].storageKey;
    }
    return null;
  }

  /* Whatever CSS will actually use as an element's containing block
     once it's switched to position:absolute -- its nearest positioned
     ancestor -- rather than always assuming the whole scene. Most
     draggables (nameplate, notebook, tools...) sit directly in the
     scene today so this resolves to sceneEl for them either way, but
     objects nested inside another positioned piece (a binder tab
     living inside the tab strip, a hinge line living inside the page
     spread) need their OWN nearby ancestor, or they render at the
     wrong spot the moment they go absolute. */
  function containerFor(el, sceneEl) {
    return el.offsetParent || sceneEl;
  }

  /* Same idea, but for a whole group at once. Reads every element's
     position FIRST, then writes them all -- doing this one element at
     a time (read, write, read, write...) lets the first write's reflow
     (e.g. a header row shrinking once one item leaves the grid)
     quietly shift where the *next* element in the group measures
     itself, so the group drifts apart instead of moving as one.
     Reading everything up front before writing anything avoids that.
     Position is captured in on-screen (viewport) terms and only
     converted to each element's own local container space at the very
     end, since getBoundingClientRect() is meaningful regardless of
     what's still in normal flow vs already absolute, while raw
     left/top values are only meaningful relative to one specific
     container. */
  function ensureAllAbsolute(els, sceneEl) {
    var pending = els.filter(function (el) { return el.style.position !== 'absolute'; });
    if (!pending.length) return;
    var snapshots = pending.map(function (el) {
      var container = containerFor(el, sceneEl);
      var containerRect = container.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      return {
        el: el,
        width: r.width, height: r.height,
        left: r.left - containerRect.left, top: r.top - containerRect.top
      };
    });
    snapshots.forEach(function (s) {
      s.el.style.width = s.width + 'px';
      s.el.style.height = s.height + 'px';
      s.el.style.position = 'absolute';
      s.el.style.right = 'auto';
      s.el.style.bottom = 'auto';
      s.el.style.left = s.left + 'px';
      s.el.style.top = s.top + 'px';
      s.el.style.margin = '0';
      s.el.style.zIndex = '10';
    });
  }

  /* Lets a desk object (nameplate, notebook, book, topic card, tools
     panel) be picked up and moved around the scene, like a real object
     on a desk. A plain click (no real movement) still passes through
     untouched, so existing open/close behavior on these same elements
     keeps working. Final position is remembered per element via
     localStorage.

     If the object being picked up is part of a multi-object selection
     (made by lassoing), the whole selected group moves together,
     keeping each object's position relative to the others. */
  function makeDraggable(el, storageKey, sceneEl) {
    if (!el || !sceneEl) return;
    var state = dragState(sceneEl);
    state.items.push({ el: el, storageKey: storageKey });

    var dragging = false, moved = false;
    var startX, startY;
    var frames = [];

    // storageKey's saved (or default) left/top are always in the space
    // of whatever containerFor(el) resolves to -- see endDrag, which is
    // the only place that ever writes them.
    function applySavedPosition() {
      var saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); }
      catch (e) { saved = null; }
      if (!saved) saved = DEFAULT_POSITIONS[storageKey] || null;
      if (saved) {
        var r = el.getBoundingClientRect();
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
        el.style.position = 'absolute';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = saved.left + 'px';
        el.style.top = saved.top + 'px';
        el.style.margin = '0';
        el.style.zIndex = '10';
      }
    }
    applySavedPosition();

    el.style.touchAction = 'none';

    // Registered once, up front, in the capture phase. This must exist
    // before any other click handler is wired to this same element (e.g.
    // wireNotebook's open-on-click) so that a drag reliably suppresses the
    // click that follows it, regardless of what else later binds to `el`.
    el.addEventListener('click', function (ce) {
      if (el.dataset.justDragged) {
        delete el.dataset.justDragged;
        ce.stopPropagation();
        ce.preventDefault();
      }
    }, true);

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;

      var isGroup = state.selected.has(el) && state.selected.size > 1;
      var targets = isGroup ? Array.from(state.selected) : [el];
      var sceneRect = sceneEl.getBoundingClientRect();
      frames = targets.map(function (t) {
        var r = t.getBoundingClientRect();
        return {
          el: t,
          storageKey: storageKeyFor(state, t),
          startLeft: r.left - sceneRect.left,
          startTop: r.top - sceneRect.top
        };
      });
      // Keep the lasso (bound on the scene) from starting on top of this.
      e.stopPropagation();
    });

    // Move/up listen on the document, not the element itself, so a fast
    // or imprecise drag gesture (trackpad, etc.) keeps tracking the
    // pointer even once the cursor has outrun the object being dragged.
    //
    // All the delta/clamp math below works in on-screen (viewport)
    // terms, exactly like the pointerdown capture above -- getBoundingClientRect()
    // stays meaningful whether an element is still in normal flow or
    // already absolute, so there's no need to re-derive anything from
    // inline styles partway through a drag. Freedom of movement is
    // clamped against the WHOLE desk (sceneRect), not each element's own
    // small local container, so a tab or hinge line can still be picked
    // up and carried anywhere on the desk -- only the final write to
    // style.left/top gets converted into that element's own local
    // container space, since that's the only place it actually matters.
    document.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) {
        moved = true;
        ensureAllAbsolute(frames.map(function (f) { return f.el; }), sceneEl);
      }
      if (moved) {
        var sceneRect = sceneEl.getBoundingClientRect();
        frames.forEach(function (f) {
          var r = f.el.getBoundingClientRect();
          var maxLeft = Math.max(sceneRect.width - r.width, 0);
          var maxTop = Math.max(sceneRect.height - r.height, 0);
          var newLeftScene = Math.min(Math.max(f.startLeft + dx, 0), maxLeft);
          var newTopScene = Math.min(Math.max(f.startTop + dy, 0), maxTop);
          var containerRect = containerFor(f.el, sceneEl).getBoundingClientRect();
          f.el.style.left = (newLeftScene + sceneRect.left - containerRect.left) + 'px';
          f.el.style.top = (newTopScene + sceneRect.top - containerRect.top) + 'px';
        });
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        frames.forEach(function (f) {
          if (f.storageKey) {
            localStorage.setItem(f.storageKey, JSON.stringify({
              left: parseFloat(f.el.style.left),
              top: parseFloat(f.el.style.top)
            }));
          }
          f.el.dataset.justDragged = '1';
        });
      } else {
        // A plain click on this object, not a drag -- select just it.
        setSelected(sceneEl, [el]);
      }
    }

    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    // Exposed so a binder-internal draggable (a tab, a hinge line, a
    // round button) can be re-positioned once the binder actually
    // becomes visible -- it lives inside #bookWrap, which starts
    // display:none, so applySavedPosition()'s own measurements are all
    // zero the first time this runs at page load.
    return { reapply: applySavedPosition };
  }

  /* Draw a selection box over empty desk space (a "lasso") to select
     several objects at once. Anything the box touches gets selected;
     dragging any one selected object afterward moves the whole group.
     A plain click on empty desk space (no drag) clears the selection. */
  function enableLasso(sceneEl) {
    if (!sceneEl) return;
    var state = dragState(sceneEl);
    var active = false, lassoMoved = false, lassoBox = null;
    var startX, startY;

    function isInteractive(target) {
      return !!target.closest(
        '.desk-nameplate, .desk-notebook, .desk-book-slot, .desk-tools, ' +
        '.desk-topic-frame, .desk-round-btns, .tool-btn, button, ' +
        '.book-arrow, .notes-overlay'
      );
    }

    function positionLasso(x1, y1, x2, y2) {
      var sceneRect = sceneEl.getBoundingClientRect();
      var left = Math.min(x1, x2) - sceneRect.left;
      var top = Math.min(y1, y2) - sceneRect.top;
      var w = Math.abs(x2 - x1);
      var h = Math.abs(y2 - y1);
      lassoBox.style.left = left + 'px';
      lassoBox.style.top = top + 'px';
      lassoBox.style.width = w + 'px';
      lassoBox.style.height = h + 'px';
      return { left: left, top: top, right: left + w, bottom: top + h };
    }

    sceneEl.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      active = true;
      lassoMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      setSelected(sceneEl, []);
    });

    document.addEventListener('pointermove', function (e) {
      if (!active) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!lassoMoved && Math.hypot(dx, dy) > 4) {
        lassoMoved = true;
        lassoBox = document.createElement('div');
        lassoBox.className = 'desk-lasso';
        sceneEl.appendChild(lassoBox);
      }
      if (!lassoMoved) return;
      var box = positionLasso(startX, startY, e.clientX, e.clientY);
      var sceneRect = sceneEl.getBoundingClientRect();
      var hits = state.items.filter(function (item) {
        var r = item.el.getBoundingClientRect();
        var iL = r.left - sceneRect.left, iT = r.top - sceneRect.top;
        var iR = iL + r.width, iB = iT + r.height;
        return !(iR < box.left || iL > box.right || iB < box.top || iT > box.bottom);
      }).map(function (item) { return item.el; });
      setSelected(sceneEl, hits);
    });

    function endLasso() {
      if (!active) return;
      active = false;
      if (lassoBox) { lassoBox.remove(); lassoBox = null; }
    }
    document.addEventListener('pointerup', endLasso);
    document.addEventListener('pointercancel', endLasso);
  }

  /* Reserves each row's current natural height (measured before any of
     its objects have gone absolute) as an explicit min-height. Every
     draggable object now gets *some* position applied on load (its own
     saved spot, or the shared default) via makeDraggable's
     applySavedPosition -- which pulls it out of normal layout flow the
     moment that runs. Without this, whichever row that object used to
     give its height to quietly shrinks, and because the whole desk is a
     vertically-centered flex column, every row below it visibly jumps
     to re-center. Call this once at startup, before any makeDraggable()
     calls run, so it captures the pre-drag layout. */
  function reserveRowHeights(selectors) {
    selectors.forEach(function (sel) {
      var rowEl = document.querySelector(sel);
      if (!rowEl) return;
      var h = rowEl.getBoundingClientRect().height;
      if (h > 0) rowEl.style.minHeight = h + 'px';
    });
  }

  /* TEMPORARY pilot-only helper -- reads back whatever's actually saved
     for every registered draggable (in this browser's own localStorage)
     and formats it as a ready-to-paste DEFAULT_POSITIONS block. This is
     the "lock it in" half of the drag-everything-into-place workflow:
     once Larry likes where things sit, this is how those exact spots
     turn into the new baseline for everyone, instead of guessing
     numbers from a description. Items never actually dragged (still
     sitting at their plain CSS position) are left out, since there's
     nothing meaningful saved for them yet. Safe to delete alongside
     refresh-light.js once the pilot is done. */
  function exportPositions(sceneEl) {
    var state = dragState(sceneEl);
    var lines = [];
    state.items.forEach(function (item) {
      var raw = localStorage.getItem(item.storageKey);
      if (!raw) return;
      var pos;
      try { pos = JSON.parse(raw); } catch (e) { return; }
      if (!pos) return;
      lines.push("    '" + item.storageKey + "': { left: " + pos.left.toFixed(4) + ", top: " + pos.top.toFixed(4) + " }");
    });
    return "var DEFAULT_POSITIONS = {\n" + lines.join(',\n') + "\n};";
  }

  window.T2TDesktopScene = {
    wireToolButtons: wireToolButtons,
    wireNotebook: wireNotebook,
    wireRoundButtons: wireRoundButtons,
    setNameplate: setNameplate,
    setMapPosition: setMapPosition,
    makeDraggable: makeDraggable,
    enableLasso: enableLasso,
    reserveRowHeights: reserveRowHeights,
    exportPositions: exportPositions
  };
})();
