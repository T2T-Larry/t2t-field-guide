/* ============================================================
   drawer-style.js — Drawer Style. Colors the two drawers (left rail,
   right drawer) -- each of a drawer's 3 tap-slots gets its own pastel,
   picked via a double-click on the drawer's own empty background.

   Split out of screen-zero.js (Sept 4 2026), and split apart from
   Desktop Style specifically because it colors a different thing --
   the drawers, not the desktop background. See the Field Guide
   Project Journal for the full split plan and the reasoning (the two
   pickers used to share one file purely by accident of history, not
   because they're the same concern).

   Loaded after Drag Engine (only needed indirectly, via the shared
   backdrop-click-guard pattern every popup in this family uses) and
   has no dependency on Drawer System, Drawer Surprise Tray, Desktop
   Screen, or Desktop Style -- callers reach it via window.SZDrawerStyle.
   ============================================================ */

(function(){

  // Background switched to a CSS var (falls back to the original
  // parchment #fdf8f0) so each drawer's own pastel color picker can
  // override just itself -- Larry, July 27 2026, "let's make a pastel
  // drawer color option for each drawer." CARD_LOOK itself (the shared
  // raised-card look every desk object uses) lives in Drawer System,
  // right alongside the CSS that actually applies it -- this file only
  // owns the --sz-bg variable's palette and picker.
  var DRAWER_COLOR_PALETTE = [
    { key:'parchment', name:'Parchment', c:'#fdf8f0' },
    { key:'blush',     name:'Blush',     c:'#F7D9DC' },
    { key:'sky',       name:'Sky',       c:'#D6E9F5' },
    { key:'lilac',     name:'Lilac',     c:'#E3D9F2' },
    { key:'mint',      name:'Mint',      c:'#D8F0E1' },
    { key:'butter',    name:'Butter',    c:'#FBF0C9' },
    { key:'peach',     name:'Peach',     c:'#FBE0CC' }
  ];

  function drawerPaletteEntry(key){
    for (var i = 0; i < DRAWER_COLOR_PALETTE.length; i++) if (DRAWER_COLOR_PALETTE[i].key === key) return DRAWER_COLOR_PALETTE[i];
    return DRAWER_COLOR_PALETTE[0];
  }
  function getSavedDrawerColorKey(storageKey){
    try { return localStorage.getItem(storageKey) || 'parchment'; } catch(e){ return 'parchment'; }
  }
  function applyDrawerColor(bar, key){
    bar.style.setProperty('--sz-bg', drawerPaletteEntry(key).c);
    bar.dataset.colorKey = key;
  }
  // Prefixes, not single keys -- Larry, July 27 2026: each of a
  // drawer's 3 tap-slots (1/2/3) gets its OWN color, not one shared
  // color for the whole drawer. Real key is prefix + mode number,
  // e.g. 't2t_leftDrawerColor_2' for the left drawer's slot 2.
  var LEFT_DRAWER_COLOR_PREFIX = 't2t_leftDrawerColor_';
  var RIGHT_DRAWER_COLOR_PREFIX = 't2t_rightDrawerColor_';
  function drawerColorKey(prefix, mode){ return prefix + (mode || '1'); }

  function injectDrawerColorStyle(){
    if (document.getElementById('sz-color-style')) return;
    var css = ''
      // Pastel color-options picker (double-click a drawer's own
      // background, not one of its buttons) -- Larry, July 27 2026.
      // Same dimmed-backdrop overlay family as the TV frame's picker
      // (tv-frame.js) and the Storyboard/Briefing Board swatch pickers,
      // kept self-contained here since this loads on every phase file
      // and shouldn't depend on tv-frame.js being present.
      + '#sz-color-overlay{position:fixed;inset:0;z-index:9997;'
      +   'background:rgba(74,52,24,0.4);display:none;align-items:center;'
      +   'justify-content:center;padding:20px;box-sizing:border-box}'
      + '#sz-color-overlay.active{display:flex}'
      + '#sz-color-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:min(280px,90%);box-shadow:0 10px 30px rgba(0,0,0,.4);text-align:center}'
      + '#sz-color-card .sz-color-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:15px;font-weight:700;color:#4a3418;margin-bottom:2px}'
      + '#sz-color-card .sz-color-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:12px}'
      + '#sz-color-swatches{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:14px}'
      + '.sz-color-swatch{width:40px;height:40px;border-radius:50%;cursor:pointer;'
      +   'border:2px solid rgba(0,0,0,.15);box-shadow:0 3px 8px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.4)}'
      + '.sz-color-swatch.sz-color-active{border-color:#4a3418;box-shadow:0 0 0 2px #fdf8f0,0 0 0 4px #4a3418}'
      + '#sz-color-close{border:1px solid #b89968;background:#fff;padding:6px 16px;'
      +   'border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;color:#4a3418}'
      ;
    var style = document.createElement('style');
    style.id = 'sz-color-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Outside-click-to-close guard, Aug 11 2026 -- Larry (bug report): the
  // text-size picker on Apple (Safari trackpad) was opening then
  // closing itself again before he could tap a size option -- a stray
  // click landing on the overlay's own backdrop right as it appeared,
  // left over from the very same tap/click gesture that opened it.
  // Every overlay in this family (drawer color, desk color, text size,
  // rename card) closes the same way -- a plain click listener on the
  // backdrop -- so all four share the same exposure, even though the
  // split now spreads them across three different files. Small enough
  // (and self-contained enough) to duplicate rather than build a
  // cross-file bridge just for this.
  function guardedBackdropClose(overlay, closeFn){
    var openedAt = 0;
    overlay.addEventListener('click', function(e){
      if (e.target !== overlay) return;
      if (Date.now() - openedAt < 400) return;
      closeFn();
    });
    overlay._markOpened = function(){ openedAt = Date.now(); };
  }

  function buildDrawerColorOverlay(){
    injectDrawerColorStyle();
    var overlay = document.createElement('div');
    overlay.id = 'sz-color-overlay';

    var card = document.createElement('div');
    card.id = 'sz-color-card';
    card.innerHTML = ''
      + '<div class="sz-color-title" id="sz-color-title">Drawer color</div>'
      + '<div class="sz-color-sub">Pick a pastel for this slot. Stays until you change it.</div>'
      + '<div id="sz-color-swatches"></div>'
      + '<button id="sz-color-close" type="button">✕</button>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    guardedBackdropClose(overlay, closeDrawerColorPicker);
    card.querySelector('#sz-color-close').addEventListener('click', closeDrawerColorPicker);

    return overlay;
  }

  // Applies + persists color for whichever slot is active RIGHT NOW
  // on this bar (bar.dataset.mode), so the drawer's own background
  // updates live the instant a swatch is picked.
  function applyAndSaveDrawerColor(bar, prefix, key){
    var mode = bar.dataset.mode || '1';
    applyDrawerColor(bar, key);
    try { localStorage.setItem(drawerColorKey(prefix, mode), key); } catch(e){}
  }

  function openDrawerColorPicker(bar, prefix, sideLabel){
    var overlay = document.getElementById('sz-color-overlay') || buildDrawerColorOverlay();
    var mode = bar.dataset.mode || '1';
    var titleEl = overlay.querySelector('#sz-color-title');
    if (titleEl) titleEl.textContent = sideLabel + ' drawer color -- slot ' + mode;
    var swatchRow = overlay.querySelector('#sz-color-swatches');
    swatchRow.innerHTML = '';
    var cur = getSavedDrawerColorKey(drawerColorKey(prefix, mode));
    DRAWER_COLOR_PALETTE.forEach(function(p){
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'sz-color-swatch' + (p.key === cur ? ' sz-color-active' : '');
      sw.title = p.name;
      sw.style.background = p.c;
      sw.addEventListener('click', function(){
        applyAndSaveDrawerColor(bar, prefix, p.key);
        closeDrawerColorPicker();
      });
      swatchRow.appendChild(sw);
    });
    overlay.classList.add('active');
    if (overlay._markOpened) overlay._markOpened();
  }

  function closeDrawerColorPicker(){
    var overlay = document.getElementById('sz-color-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // Wires the gesture onto a drawer bar: double-click its own
  // background (excludes real buttons -- gear/menu/toggle/tool
  // buttons -- same "not a card/control" exclusion the Storyboard's
  // board-background double-click already uses).
  function wireDrawerColorGesture(bar, prefix, sideLabel){
    bar.addEventListener('dblclick', function(e){
      if (e.target.closest('button')) return;
      openDrawerColorPicker(bar, prefix, sideLabel);
    });
  }

  // Re-reads whichever slot is active on this bar right now and
  // applies THAT slot's own saved color -- called once at build time
  // (after the drawer's remembered mode is restored) and again every
  // time a tap changes modes, so the drawer's visible background
  // always matches the slot currently showing.
  function refreshDrawerColorForMode(bar, prefix){
    var mode = bar.dataset.mode || '1';
    applyDrawerColor(bar, getSavedDrawerColorKey(drawerColorKey(prefix, mode)));
  }

  window.SZDrawerStyle = {
    LEFT_DRAWER_COLOR_PREFIX: LEFT_DRAWER_COLOR_PREFIX,
    RIGHT_DRAWER_COLOR_PREFIX: RIGHT_DRAWER_COLOR_PREFIX,
    wireDrawerColorGesture: wireDrawerColorGesture,
    refreshDrawerColorForMode: refreshDrawerColorForMode
  };

})();
