
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

  /* Lets a desk object (nameplate, notebook, book) be picked up and moved
     around the scene, like a real object on a desk. A plain click (no real
     movement) still passes through untouched, so existing open/close
     behavior on these same elements keeps working. Final position is
     remembered per element via localStorage. */
  function makeDraggable(el, storageKey, sceneEl) {
    if (!el || !sceneEl) return;
    var dragging = false, moved = false;
    var startX, startY, startLeft, startTop;

    function applySavedPosition() {
      var saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); }
      catch (e) { saved = null; }
      if (saved) {
        // Lock in the object's current (in-flow) size before switching to
        // absolute -- otherwise an element sized by its layout (e.g. a grid
        // cell's width:100%) silently resizes to fill the whole scene the
        // moment it goes absolute, which then traps it against one edge.
        var elRect = el.getBoundingClientRect();
        el.style.width = elRect.width + 'px';
        el.style.height = elRect.height + 'px';
        el.style.position = 'absolute';
        el.style.left = saved.left + 'px';
        el.style.top = saved.top + 'px';
        el.style.margin = '0';
        el.style.zIndex = '10';
      }
    }
    applySavedPosition();

    function toAbsolute() {
      if (el.style.position === 'absolute') return;
      var sceneRect = sceneEl.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      el.style.width = elRect.width + 'px';
      el.style.height = elRect.height + 'px';
      el.style.position = 'absolute';
      el.style.left = (elRect.left - sceneRect.left) + 'px';
      el.style.top = (elRect.top - sceneRect.top) + 'px';
      el.style.margin = '0';
      el.style.zIndex = '10';
    }

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
      var sceneRect = sceneEl.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      startLeft = elRect.left - sceneRect.left;
      startTop = elRect.top - sceneRect.top;
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) {
        moved = true;
        toAbsolute();
        startLeft = parseFloat(el.style.left) || startLeft;
        startTop = parseFloat(el.style.top) || startTop;
      }
      if (moved) {
        var sceneRect = sceneEl.getBoundingClientRect();
        var elRect = el.getBoundingClientRect();
        var maxLeft = Math.max(sceneRect.width - elRect.width, 0);
        var maxTop = Math.max(sceneRect.height - elRect.height, 0);
        var newLeft = Math.min(Math.max(startLeft + dx, 0), maxLeft);
        var newTop = Math.min(Math.max(startTop + dy, 0), maxTop);
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        localStorage.setItem(storageKey, JSON.stringify({
          left: parseFloat(el.style.left),
          top: parseFloat(el.style.top)
        }));
        el.dataset.justDragged = '1';
      }
    }

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  window.T2TDesktopScene = {
    wireToolButtons: wireToolButtons,
    wireNotebook: wireNotebook,
    wireRoundButtons: wireRoundButtons,
    setNameplate: setNameplate,
    setMapPosition: setMapPosition,
    makeDraggable: makeDraggable
  };
})();
