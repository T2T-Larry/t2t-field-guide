
(function () {
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

  /* Picks an element up out of normal document flow and pins it to its
     current on-screen size before switching to position:absolute --
     otherwise an element sized by its layout (e.g. a grid cell's
     width:100%) silently resizes to fill the whole scene the moment it
     goes absolute, which then traps it against one edge. */
  function ensureAbsolute(el, sceneEl) {
    if (el.style.position === 'absolute') return;
    var sceneRect = sceneEl.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.position = 'absolute';
    el.style.left = (r.left - sceneRect.left) + 'px';
    el.style.top = (r.top - sceneRect.top) + 'px';
    el.style.margin = '0';
    el.style.zIndex = '10';
  }

  /* Same idea as ensureAbsolute, but for a whole group at once. Reads
     every element's position FIRST, then writes them all -- doing this
     one element at a time (read, write, read, write...) lets the first
     write's reflow (e.g. a header row shrinking once one item leaves
     the grid) quietly shift where the *next* element in the group
     measures itself, so the group drifts apart instead of moving as
     one. Reading everything up front before writing anything avoids
     that. */
  function ensureAllAbsolute(els, sceneEl) {
    var pending = els.filter(function (el) { return el.style.position !== 'absolute'; });
    if (!pending.length) return;
    var sceneRect = sceneEl.getBoundingClientRect();
    var snapshots = pending.map(function (el) {
      var r = el.getBoundingClientRect();
      return {
        el: el,
        width: r.width, height: r.height,
        left: r.left - sceneRect.left, top: r.top - sceneRect.top
      };
    });
    snapshots.forEach(function (s) {
      s.el.style.width = s.width + 'px';
      s.el.style.height = s.height + 'px';
      s.el.style.position = 'absolute';
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

    function applySavedPosition() {
      var saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); }
      catch (e) { saved = null; }
      if (saved) {
        var r = el.getBoundingClientRect();
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
        el.style.position = 'absolute';
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
    document.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) {
        moved = true;
        ensureAllAbsolute(frames.map(function (f) { return f.el; }), sceneEl);
        frames.forEach(function (f) {
          f.startLeft = parseFloat(f.el.style.left) || f.startLeft;
          f.startTop = parseFloat(f.el.style.top) || f.startTop;
        });
      }
      if (moved) {
        var sceneRect = sceneEl.getBoundingClientRect();
        frames.forEach(function (f) {
          var r = f.el.getBoundingClientRect();
          var maxLeft = Math.max(sceneRect.width - r.width, 0);
          var maxTop = Math.max(sceneRect.height - r.height, 0);
          var newLeft = Math.min(Math.max(f.startLeft + dx, 0), maxLeft);
          var newTop = Math.min(Math.max(f.startTop + dy, 0), maxTop);
          f.el.style.left = newLeft + 'px';
          f.el.style.top = newTop + 'px';
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

  window.T2TDesktopScene = {
    wireToolButtons: wireToolButtons,
    wireNotebook: wireNotebook,
    wireRoundButtons: wireRoundButtons,
    setNameplate: setNameplate,
    setMapPosition: setMapPosition,
    makeDraggable: makeDraggable,
    enableLasso: enableLasso
  };
})();
