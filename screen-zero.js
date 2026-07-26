/* ============================================================
   screen-zero.js — Screen 0000 (the gray backdrop behind every
   screen), the 0020 nav rail that floats on top of it, and
   dragging for every object that sits on 0000: the widget, the
   nav rail itself, and the notebook.

   Larry's numbering, July 26 2026: 0000 is the plain gray page,
   always underneath everything. 0020 is the nav rail, carrying
   top to bottom: the nametag (ported from the binder-view
   desktop pilot), the tool stack (same pilot), and the gear
   button at the bottom. The gear stays a placeholder — tapping
   it just says custom options are coming later.

   Later same-day follow-up (still July 26) refined this further:
   - Notebook drags off the rail entirely -- it's now its own
     free-floating object on 0000, not nested inside the rail.
   - The rail itself is no longer pinned to the left edge -- it
     free-drags anywhere left-to-right (and back), same as the
     widget and notebook, and it opens/closes (collapses to a
     thin strip) to give the current screen more room.
   - Every object on 0000 -- rail, nameplate, tool stack, gear,
     notebook, widget -- shares the same raised floating-card
     look (the widget's own border/radius/shadow), no two-page
     book-frame styling anywhere. Larry confirmed: keep the
     widget's raised look, drop the book frame, apply that same
     card language to everything.

   "What if" is Larry's word for an idea still up for discussion,
   not yet worth building. "Add" / "do it" / "lock" is his word
   for commit -- build it now. This file is the "add" version of
   everything described above.

   The actual "which number does triple-tap reveal" logic lives
   in backpack.js's Hidden Mickey handler (the one shared
   triple-click system for the whole app). This file only makes
   sure #fg-root and #sz-navbar exist with those exact ids so
   backpack.js can tell 0000 / 0020 / whatever screen is showing
   apart -- true regardless of where the rail has been dragged or
   whether it's collapsed.

   Loaded on every phase file, same as backpack.js/tmap.js.
   ============================================================ */

(function(){

  var RAIL_WIDTH = 200;       // px -- "the wider" rail Larry asked for
  var RAIL_COLLAPSED_W = 40;  // px -- thin strip when closed

  /* ---------- Shared "floating card" look, matched to the
     widget's own #fg-root styling in style.css (border:2px solid
     #999; border-radius:14px; box-shadow:0 4px 24px rgba(0,0,0,.18)),
     so every object on 0000 reads as one consistent family of
     raised objects instead of some looking like page furniture. ---- */

  var CARD_LOOK = 'border:2px solid #999;border-radius:14px;' +
    'box-shadow:0 4px 24px rgba(0,0,0,.18);background:#fdf8f0';

  function injectStyle(){
    if (document.getElementById('sz-style')) return;
    var css = ''
      + '#sz-navbar{position:fixed;width:' + RAIL_WIDTH + 'px;max-height:calc(100vh - 32px);'
      +   CARD_LOOK + ';z-index:9998;'
      +   'display:flex;flex-direction:column;align-items:center;'
      +   'padding:16px 10px 14px;box-sizing:border-box;font-family:"Playfair Display",Georgia,serif;'
      +   'transition:width .18s ease, padding .18s ease}'
      + '#sz-navbar.sz-collapsed{width:' + RAIL_COLLAPSED_W + 'px;padding:12px 4px}'
      + '#sz-navbar.sz-collapsed #sz-nameplate,#sz-navbar.sz-collapsed #sz-navmid{display:none}'
      + '#sz-navbar-toggle{position:absolute;top:8px;right:-14px;width:28px;height:28px;'
      +   'border-radius:50%;border:2px solid #999;background:#fff;cursor:pointer;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);font-size:13px;line-height:1;'
      +   'display:flex;align-items:center;justify-content:center;z-index:1}'
      + '#sz-nameplate{width:100%;display:flex;flex-direction:column;align-items:stretch;'
      +   'background:linear-gradient(180deg,#e8c878,#b8923e 55%,#8a6a26 100%);'
      +   'border:1px solid #6b4a2c;border-radius:6px;overflow:hidden;cursor:grab;'
      +   'box-shadow:2px 4px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,248,220,.5)}'
      + '#sz-nameplate-header{color:#4a3418;font-size:9px;font-weight:700;letter-spacing:1.5px;'
      +   'text-transform:uppercase;text-align:center;padding:5px 8px 0;'
      +   'text-shadow:1px 1px 0 rgba(255,240,200,.5)}'
      + '#sz-nameplate-text{color:#4a3418;text-shadow:1px 1px 0 rgba(255,240,200,.5);'
      +   'font-size:13px;font-weight:700;letter-spacing:.5px;text-align:center;padding:2px 8px 6px;'
      +   'overflow-wrap:break-word}'
      + '#sz-navmid{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;'
      +   'justify-content:center;gap:16px;overflow-y:auto;padding:10px 0}'
      + '#sz-tools{display:flex;flex-direction:column;gap:8px;align-items:center}'
      + '.sz-tool-btn{width:150px;padding:3px;border-radius:6px;border:none;cursor:pointer;'
      +   'background:linear-gradient(135deg,#e0b060,#8a6420);box-shadow:2px 3px 6px rgba(0,0,0,.3);'
      +   'transition:transform .1s ease, box-shadow .1s ease}'
      + '.sz-tool-btn:active{transform:translateY(2px);box-shadow:1px 1px 2px rgba(0,0,0,.3)}'
      + '.sz-tool-face{padding:7px 4px;border-radius:4px;text-align:center;font-size:11px;'
      +   'color:#4a3418;font-family:"Playfair Display",Georgia,serif;white-space:nowrap;'
      +   'background:radial-gradient(circle at 35% 30%,#f3d98a,#c9973a 55%,#8a6420 100%)}'
      + '#sz-notebook{position:fixed;width:70px;height:98px;background:#3d2817;'
      +   'border:2px solid #241608;border-radius:14px;'
      +   'box-shadow:0 4px 24px rgba(0,0,0,.35);cursor:grab;'
      +   'transform:rotate(-4deg);z-index:9997}'
      + '#sz-notebook-label{position:absolute;left:50%;top:26%;transform:translateX(-50%);'
      +   'border:1px solid #C9A87C;padding:4px 8px;border-radius:2px}'
      + '#sz-notebook-label span{font-size:10px;color:#C9A87C;letter-spacing:1px;white-space:nowrap}'
      + '#sz-gear{width:36px;height:36px;border-radius:50%;border:2px solid #999;'
      +   'background:#fff;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);'
      +   'display:flex;align-items:center;justify-content:center;margin-top:6px}'
      ;
    var style = document.createElement('style');
    style.id = 'sz-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Toast, reused for the gear and for not-yet-wired tools ---------- */

  function showZeroToast(msg){
    var existing = document.getElementById('sz-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'sz-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed','bottom:20px','left:20px',
      'background:rgba(10,74,56,0.92)','color:#C9A87C',
      'font-family:Playfair Display,Georgia,serif','font-size:13px','font-weight:700',
      'letter-spacing:1px','padding:10px 18px','border-radius:20px',
      'max-width:240px','text-align:left',
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

  /* ---------- The nametag: ported from the binder pilot, filled in
     with the real signed-in member's name once backpack.js's profile
     load finishes (same data it already uses for the Journal cover's
     own name display). Also doubles as the rail's drag handle. ---- */

  function buildNameplate(){
    var wrap = document.createElement('div');
    wrap.id = 'sz-nameplate';
    wrap.innerHTML =
      '<div id="sz-nameplate-header">Thoughts to Things</div>' +
      '<div id="sz-nameplate-text">Traveler</div>';

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var m = window.T2T && window.T2T.getMember && window.T2T.getMember();
      var textEl = document.getElementById('sz-nameplate-text');
      if (m && m.display_name && textEl) {
        textEl.textContent = m.display_name.toUpperCase();
        clearInterval(timer);
      } else if (tries > 20) {
        clearInterval(timer); // give up quietly after ~20s, stays "Traveler"
      }
    }, 1000);

    return wrap;
  }

  /* ---------- Tool stack: ported labels/shape from the binder pilot.
     Only the ones with a real live equivalent are wired; the rest
     show the same "coming later" toast as the gear, so nothing
     looks silently broken. ---------- */

  function buildTools(){
    var wrap = document.createElement('div');
    wrap.id = 'sz-tools';

    var items = [
      { label: 'Field Guide',     action: function(){ if (window.T2T) window.T2T.goMG(); } },
      { label: 'Idea Board',      action: function(){ if (window.T2T) window.T2T.nav('s-sea-of-ideas'); } },
      { label: 'Briefing Board',  action: function(){ if (window.T2T) window.T2T.nav('s-briefing-board'); } },
      { label: 'Planning',        action: function(){ showZeroToast('Planning — coming later.'); } },
      { label: 'Organization',    action: function(){ showZeroToast('Organization — coming later.'); } },
      { label: 'Storytelling',    action: function(){ showZeroToast('Storytelling — coming later.'); } }
    ];

    items.forEach(function(item){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sz-tool-btn';
      btn.innerHTML = '<div class="sz-tool-face"><span>' + item.label + '</span></div>';
      btn.addEventListener('click', item.action);
      wrap.appendChild(btn);
    });

    return wrap;
  }

  /* ---------- Notebook: ported look, now fully detached from the
     rail -- its own free-floating draggable object straight on
     0000, same drag mechanics as the widget. Opens the real
     Journal (0300 / s-journal), not the binder pilot's placeholder
     notes panel. ---------- */

  function buildNotebook(){
    var nb = document.createElement('div');
    nb.id = 'sz-notebook';
    nb.title = 'Notebook';
    nb.innerHTML = '<div id="sz-notebook-label"><span>Notes</span></div>';
    nb.addEventListener('click', function(){
      if (window.T2T) window.T2T.nav('s-journal');
    });
    return nb;
  }

  /* ---------- The gear -- stays inside the rail (only the notebook
     was asked to detach), just picks up the shared card shadow. -- */

  function buildGear(){
    var gear = document.createElement('button');
    gear.id = 'sz-gear';
    gear.type = 'button';
    gear.title = 'Custom options (coming later)';
    gear.textContent = '⚙️';
    gear.addEventListener('click', function(){
      showZeroToast('Custom options — coming later.');
    });
    return gear;
  }

  /* ---------- Collapse / expand toggle for the rail, so it can
     shrink to a thin strip and give the current screen more room,
     per Larry's "opens and closes for more screen space." ---------- */

  function buildToggle(bar){
    var t = document.createElement('button');
    t.id = 'sz-navbar-toggle';
    t.type = 'button';
    t.title = 'Collapse / expand';
    t.textContent = '‹'; // ‹
    t.addEventListener('click', function(){
      var collapsed = bar.classList.toggle('sz-collapsed');
      t.textContent = collapsed ? '›' : '‹'; // › vs ‹
      try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch(e){}
    });
    return t;
  }

  /* ---------- Generic free-drag, shared by the rail and the
     notebook -- one object, one localStorage key, same mouse/touch
     handling for both. Position is remembered per browser; a plain
     click (no movement) still fires the element's own click handler
     (e.g. notebook opening the Journal, or clicking a tool button
     inside the rail). ---------- */

  function makeDraggable(el, storeKey, excludeSelector, defaultLeft, defaultTop){
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
    if (!restored) applyPos(defaultLeft, defaultTop);

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (excludeSelector && e.target.closest(excludeSelector)) return;
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
      try { localStorage.setItem(storeKey, JSON.stringify({ left: rect.left, top: rect.top })); }
      catch(e){}
    }

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  var COLLAPSE_KEY = 't2t-navbar-collapsed';
  var NAVBAR_EXCLUDE = 'button, a, input, textarea, select, [role="button"]';
  var WIDGET_EXCLUDE = 'button, a, input, textarea, select, [role="button"], ' +
    '.mg-btn, .mg-ret, .spark-door, .ib, .jb, .gb, .tb, .more-link, ' +
    '.tool-row, .save-btn, .jsave-btn, .gsave-btn';

  function buildNavBar(){
    if (document.getElementById('sz-navbar')) return; // idempotent
    injectStyle();

    var bar = document.createElement('div');
    bar.id = 'sz-navbar';

    var mid = document.createElement('div');
    mid.id = 'sz-navmid';
    mid.appendChild(buildTools());

    bar.appendChild(buildNameplate());
    bar.appendChild(mid);
    bar.appendChild(buildGear());
    bar.appendChild(buildToggle(bar));

    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') {
        bar.classList.add('sz-collapsed');
        var toggleBtn = bar.querySelector('#sz-navbar-toggle');
        if (toggleBtn) toggleBtn.textContent = '›';
      }
    } catch(e){}

    document.body.appendChild(bar);

    // Rail free-drags left-to-right (and back) instead of pinning to
    // the left edge; default position starts it where it always was.
    makeDraggable(bar, 't2t-navbar-pos', NAVBAR_EXCLUDE, 16, 16);

    // Notebook is its own object now -- append straight to 0000, not
    // nested inside the rail, and give it a default spot clear of the
    // rail and the widget (top-right corner).
    var notebook = buildNotebook();
    document.body.appendChild(notebook);
    makeDraggable(notebook, 't2t-notebook-pos', null, Math.max(16, window.innerWidth - 110), 24);
  }

  /* ---------- Dragging the widget (#fg-root) -- unchanged mechanics,
     kept separate since it stays in normal centered flow until first
     dragged (rail and notebook are always fixed-position from the
     start, since they're new floating objects with no "home" spot
     in the page's document flow). ---------- */

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

    try {
      var saved = JSON.parse(localStorage.getItem('t2t-widget-pos'));
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        applyPos(saved.left, saved.top);
      }
    } catch(e){}

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (e.target.closest(WIDGET_EXCLUDE)) return;
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
      try { localStorage.setItem('t2t-widget-pos', JSON.stringify({ left: rect.left, top: rect.top })); }
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
