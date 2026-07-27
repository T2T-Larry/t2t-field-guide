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

  // Background switched to a CSS var (falls back to the original
  // parchment #fdf8f0) so each drawer's own pastel color picker can
  // override just itself -- Larry, July 27 2026, "let's make a pastel
  // drawer color option for each drawer."
  var CARD_LOOK = 'border:2px solid #999;border-radius:14px;' +
    'box-shadow:0 4px 24px rgba(0,0,0,.18);background:var(--sz-bg,#fdf8f0)';

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

  function injectStyle(){
    if (document.getElementById('sz-style')) return;
    var css = ''
      + '#sz-navbar{position:fixed;top:0;bottom:0;width:' + RAIL_WIDTH + 'px;'
      +   CARD_LOOK + ';z-index:9998;'
      +   'display:flex;flex-direction:column;align-items:center;'
      +   'padding:16px 10px 14px;box-sizing:border-box;font-family:"Playfair Display",Georgia,serif;'
      +   'transition:width .18s ease, padding .18s ease, background .18s ease, box-shadow .18s ease}'
      // Collapsed hides the whole tray -- background, border, shadow, and
      // every child (nameplate/tools/gear) -- leaving only the toggle nub
      // sitting right on the screen edge. Larry, July 26: "why not just
      // have the toggle visible on the edge of the screen?"
      + '#sz-navbar.sz-collapsed{width:0;padding:0;border:none;box-shadow:none;background:transparent}'
      // Larry, July 26 (later note): the nameplate moved OUT of the
      // drawer entirely -- it's a persistent label, not drawer content,
      // so it no longer hides with the drawer's collapse state at all.
      + '#sz-navbar.sz-collapsed #sz-navmid,'
      +   '#sz-navbar.sz-collapsed #sz-menu,#sz-navbar.sz-collapsed #sz-gear{display:none}'
      + '#sz-navbar-toggle{position:absolute;top:50%;transform:translateY(-50%);'
      +   'right:-18px;width:18px;height:40px;'
      +   'border-radius:0 20px 20px 0;border:2px solid #999;border-left:none;'
      +   'background:var(--sz-bg,#fdf8f0);cursor:pointer;'
      +   'box-shadow:2px 3px 8px rgba(0,0,0,.25);font-size:12px;line-height:1;'
      +   'display:flex;align-items:center;justify-content:center;z-index:1}'
      // Docked to the right side: the tray anchors from the right instead
      // of the left, and the toggle mirrors onto the rail's LEFT edge so
      // it still pokes into open screen space, not off past the browser
      // edge. Larry, July 26: "if it is placed on the right side of the
      // screen, the toggle must switch to the left side."
      + '#sz-navbar.sz-dock-right #sz-navbar-toggle{right:auto;left:-18px;'
      +   'border-radius:20px 0 0 20px;border-left:2px solid #999;border-right:none}'
      // Was `width:100%` while it lived inside the 200px rail -- now
      // that it's `position:fixed` and free-standing, 100% would
      // stretch it across the whole viewport, so it needs a real width
      // of its own instead.
      + '#sz-nameplate{width:180px;display:flex;flex-direction:column;align-items:stretch;'
      +   'background:linear-gradient(180deg,#e8c878,#b8923e 55%,#8a6a26 100%);'
      +   'border:1px solid #6b4a2c;border-radius:6px;overflow:hidden;cursor:grab;'
      +   'box-shadow:2px 4px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,248,220,.5);'
      +   'z-index:9999}'
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
      +   'border:2px solid #241608;border-radius:4px;'
      // Larry, July 26: notebook needed more "splash" -- reads as
      // properly floating above the desk/drawer, not just another flat
      // card. A layered shadow (tight+dark close in, soft+wide further
      // out) instead of the single flat shadow every other object uses.
      +   'box-shadow:0 3px 8px rgba(0,0,0,.4), 0 18px 40px rgba(0,0,0,.4);cursor:grab;'
      +   'transform:rotate(-4deg);z-index:9999}'
      + '#sz-notebook-label{position:absolute;left:50%;top:26%;transform:translateX(-50%);'
      +   'border:1px solid #C9A87C;padding:4px 8px;border-radius:2px}'
      + '#sz-notebook-label span{font-size:10px;color:#C9A87C;letter-spacing:1px;white-space:nowrap}'
      + '#sz-gear{width:36px;height:36px;border-radius:50%;border:2px solid #999;'
      +   'background:#fff;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);'
      +   'display:flex;align-items:center;justify-content:center;margin-top:6px}'
      + '#sz-menu{width:36px;height:36px;border-radius:50%;border:2px solid #999;'
      +   'background:#fff;font-size:16px;line-height:1;cursor:pointer;flex-shrink:0;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);'
      +   'display:flex;align-items:center;justify-content:center;margin-top:10px}'
      // Larry, July 26: "single/double/triple click drawers on the
      // sides of 0000" -- both the left drawer (0001/0002/0003) and a
      // new right drawer (0004/0005/0006) show one of three "mode"
      // panels depending on how many quick taps the toggle got. Using
      // !important here on purpose (matches the .sc/.bar2 convention
      // elsewhere in this codebase) since #sz-tools already carries its
      // own ID-level `display:flex`, which would otherwise always beat
      // a plain class rule regardless of which mode is active.
      + '.sz-mode-panel{display:none!important}'
      + '.sz-mode-panel.sz-mode-active{display:flex!important}'
      + '.sz-mode-placeholder{flex-direction:column;align-items:center;justify-content:center;'
      +   'gap:6px;width:150px;min-height:80px;border:2px dashed #b89968;border-radius:8px;'
      +   'padding:14px 10px;text-align:center;color:#7a5c3a;font-size:11px;'
      +   'font-family:"Playfair Display",Georgia,serif;box-sizing:border-box}'
      // The one-off "you found it" celebration for the triple-tap
      // surprise slot -- the content behind it is meant to rotate over
      // time (see buildSurprisePanel), but the little burst itself can
      // be consistent every time, per Larry's "fireworks or something
      // hidden" note.
      + '.sz-flourish{position:absolute;font-size:22px;pointer-events:none;'
      +   'animation:sz-flourish-pop .9s ease forwards;left:50%;top:8px;'
      +   'transform:translateX(-50%)}'
      + '@keyframes sz-flourish-pop{'
      +   '0%{opacity:0;transform:translateX(-50%) scale(.4)}'
      +   '30%{opacity:1;transform:translateX(-50%) scale(1.2)}'
      +   '100%{opacity:0;transform:translateX(-50%) scale(1) translateY(-16px)}}'
      // The new right-side drawer -- same family look as the left rail,
      // no nameplate/notebook/menu/gear, just the toggle + mode panels,
      // since its actual contents aren't designated yet.
      + '#sz-drawer-r{position:fixed;top:0;bottom:0;width:' + RAIL_WIDTH + 'px;'
      +   CARD_LOOK + ';z-index:9998;'
      +   'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +   'padding:16px 10px 14px;box-sizing:border-box;font-family:"Playfair Display",Georgia,serif;'
      +   'transition:width .18s ease, padding .18s ease, background .18s ease, box-shadow .18s ease}'
      + '#sz-drawer-r.sz-collapsed{width:0;padding:0;border:none;box-shadow:none;background:transparent}'
      + '#sz-drawer-r.sz-collapsed #sz-drawer-r-mid{display:none}'
      + '#sz-drawer-r-mid{flex:1;width:100%;display:flex;flex-direction:column;'
      +   'align-items:center;justify-content:center;gap:16px;overflow-y:auto;padding:10px 0;position:relative}'
      + '#sz-drawer-r-toggle{position:absolute;top:50%;transform:translateY(-50%);'
      +   'left:-18px;width:18px;height:40px;'
      +   'border-radius:20px 0 0 20px;border:2px solid #999;border-right:none;'
      +   'background:var(--sz-bg,#fdf8f0);cursor:pointer;'
      +   'box-shadow:-2px 3px 8px rgba(0,0,0,.25);font-size:12px;line-height:1;'
      +   'display:flex;align-items:center;justify-content:center;z-index:1}'
      + '#sz-drawer-r.sz-dock-left #sz-drawer-r-toggle{left:auto;right:-18px;'
      +   'border-radius:0 20px 20px 0;border-left:none;border-right:2px solid #999}'
      // Pastel color-options picker (double-click a drawer's own
      // background, not one of its buttons) -- Larry, July 27 2026.
      // Same dimmed-backdrop overlay family as the TV frame's picker
      // (tv-frame.js) and the Storyboard/Briefing Board swatch pickers,
      // kept self-contained here since screen-zero.js loads on every
      // phase file and shouldn't depend on tv-frame.js being present.
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

  /* ---------- Drawer color picker: double-click a drawer's own
     background (its padding/mid area, not a button inside it) opens
     a pastel swatch picker for WHICHEVER of the 3 tap-slots is
     currently showing -- Larry, July 27 2026, after the first pass
     colored the whole drawer (all 3 slots) at once: "each of the 3
     slots should have its own color." So the picker now reads
     bar.dataset.mode fresh every time it opens rather than being
     handed one fixed storageKey, and the drawer's visible background
     switches to match whichever slot's saved color as taps cycle
     through modes (see the refreshDrawerColorForMode calls wired into
     each drawer's wireModeToggle onChange, further down). One shared
     overlay element, reused by whichever drawer opened it last, same
     pattern as the TV frame's picker (tv-frame.js). ---------- */

  function buildDrawerColorOverlay(){
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

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeDrawerColorPicker(); });
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

  /* ---------- The nametag: ported from the binder pilot, filled in
     with the real signed-in member's name once backpack.js's profile
     load finishes (same data it already uses for the Journal cover's
     own name display).

     Larry, July 26 (later note): "the nametag does not go into a
     drawer -- it's like a custom label on every screen." Moved out of
     the rail entirely -- its own free-floating draggable object on
     0000, same mechanics as the notebook (position remembered,
     independent of the drawer's collapse/dock state from here on).
     Default spot matches where it always visually sat (top-left,
     where the rail's own padding used to place it) so nothing looks
     like it jumped on its own the first time anyone sees this. ---- */

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

  // Each tool button can be dragged out of the drawer onto the desk
  // (becomes its own independent floating object, still clickable),
  // dropped onto the RIGHT drawer to be stored there (rides it, hides
  // when it collapses, same as the nameplate), or dropped back onto
  // its OWN drawer (leftBar) to return home -- which means actually
  // flowing back into the list, not floating next to it. Larry, July
  // 27 2026: "Tool button stack should drag from drawer if desired.
  // Flexibility!"
  function wireToolButtonDrag(btn, leftBar, idx){
    var storeKey = 't2t_toolBtnPos_' + idx;
    var rec = registerClaimable(btn, storeKey, 16);
    makeDraggable(btn, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      reattachTargets: [
        { el: leftBar, side: 'left' },
        { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
      ],
      onReattach: function(side, barEl){
        if (side === 'left') {
          // Home drawer -- return to flowing in the list instead of
          // floating next to it.
          setRidingSide(storeKey, null);
          btn.style.position = '';
          btn.style.left = ''; btn.style.top = '';
          btn.style.right = ''; btn.style.bottom = ''; btn.style.margin = '';
          btn.style.display = '';
        } else {
          setRidingSide(storeKey, side);
          captureRidingOffset(rec, barEl);
          refreshRidersForSide(side, barEl);
        }
      }
    });
  }

  function buildTools(leftBar){
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

    items.forEach(function(item, idx){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sz-tool-btn';
      btn.innerHTML = '<div class="sz-tool-face"><span>' + item.label + '</span></div>';
      btn.addEventListener('click', item.action);
      wrap.appendChild(btn);
      wireToolButtonDrag(btn, leftBar, idx);
    });

    return wrap;
  }

  /* ---------- Notebook: ported look, now fully detached from the
     rail -- its own free-floating draggable object straight on
     0000, same drag mechanics as the widget. Opens the real
     Journal (9300 / s-journal), not the binder pilot's placeholder
     notes panel.

     Larry, July 26 (later same-day follow-up): a single click is
     the drag handle only -- it no longer opens anything by itself,
     since a real drag ends in a mouseup on the same element too and
     was popping the Journal open by accident. Opening now takes a
     double-click. ---------- */

  function buildNotebook(){
    var nb = document.createElement('div');
    nb.id = 'sz-notebook';
    nb.title = 'Notebook (double-click to open)';
    nb.innerHTML = '<div id="sz-notebook-label"><span>Notes</span></div>';
    nb.addEventListener('dblclick', function(){
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

  /* ---------- The MAP (☰) button -- Larry, July 26: a safety measure
     for retiring every screen's own bottom toolbar (see style.css --
     .bar2/.bar3 hidden entirely now, not just the paging arrows).
     Those toolbars each carried their own "☰" button opening the Field
     Guide backpack (Map/Idea/Journal/Search/Tools) -- goMG(), the same
     shared function on every one of them. One of these on the drawer
     covers that for every screen at once, so hiding all the per-screen
     ones loses nothing. ---------- */

  function buildMenuButton(){
    var m = document.createElement('button');
    m.id = 'sz-menu';
    m.type = 'button';
    m.title = 'Menu (Map / Idea / Journal / Search / Tools)';
    m.textContent = '☰';
    m.addEventListener('click', function(){
      if (window.T2T) window.T2T.goMG();
    });
    return m;
  }

  /* ---------- Collapse / expand toggle for the rail, so it can
     shrink to a thin strip and give the current screen more room,
     per Larry's "opens and closes for more screen space." ---------- */

  function buildToggle(bar, onChange){
    var t = document.createElement('button');
    t.id = 'sz-navbar-toggle';
    t.type = 'button';
    t.title = 'Collapse / expand';
    t.textContent = '‹'; // ‹
    t.addEventListener('click', function(){
      var collapsed = bar.classList.toggle('sz-collapsed');
      t.textContent = collapsed ? '›' : '‹'; // › vs ‹
      try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch(e){}
      if (onChange) onChange();
    });
    return t;
  }

  /* ---------- Tap counter: counts a quick burst of clicks on one
     element and reports the final tally once the burst pauses, same
     "count, then reset after a gap" idea as backpack.js's Hidden Mickey
     triple-tap -- just scoped to one button instead of the whole
     document, and reporting every count (1/2/3+) instead of only
     caring about hitting 3. ---------- */

  function makeTapCounter(el, onResolve, windowMs){
    var count = 0, timer = null;
    el.addEventListener('click', function(){
      count++;
      clearTimeout(timer);
      timer = setTimeout(function(){
        var n = count; count = 0;
        onResolve(n);
      }, windowMs || 450);
    });
  }

  /* ---------- Mode panels for the two "magic" drawers -- Larry, July
     26: "single tap one drawer, double tap second drawer, triple tap
     for surprising trivia." Slot 1 is always the drawer's real,
     reliable content (the left rail's existing tools, for now); slots
     2 and 3 are placeholders on purpose -- contents not designated yet,
     per Larry's own words starting this build. Slot 3 also gets the
     little "you found it" flourish, with the label text drawn from a
     small rotating pool so the surprise slot doesn't calcify into
     always showing the exact same thing. ---------- */

  var SURPRISE_POOL = [
    '🎉 Surprise slot -- what lands here is still undecided',
    '✨ Something will live here -- rotating placeholder for now',
    '🎈 A future surprise goes here -- not designed yet'
  ];

  function buildModePlaceholder(label){
    var p = document.createElement('div');
    p.className = 'sz-mode-panel sz-mode-placeholder';
    p.textContent = label;
    return p;
  }

  function buildSurprisePanel(){
    var wrap = document.createElement('div');
    wrap.className = 'sz-mode-panel sz-mode-placeholder';
    wrap.style.position = 'relative';
    var text = document.createElement('div');
    text.className = 'sz-surprise-text';
    wrap.appendChild(text);
    return { el: wrap, textEl: text };
  }

  function triggerFlourish(container){
    var f = document.createElement('div');
    f.className = 'sz-flourish';
    f.textContent = '🎆';
    container.appendChild(f);
    setTimeout(function(){ f.remove(); }, 950);
  }

  /* ---------- Wires a drawer's toggle button to the tap counter above,
     switching between however many mode panels it has instead of a
     plain collapse/expand. Single tap while already open still just
     collapses it (today's exact existing behavior, unchanged); double
     or triple tap while open switches the visible mode instead, without
     closing anything. While collapsed, any tap count opens it straight
     to that mode. Mode is remembered per drawer via localStorage, same
     as dock side and collapsed state already are. ---------- */

  function wireModeToggle(toggleBtn, bar, panels, modeKey, collapseKey, glyphs, onChange){
    var mode = 1;
    try { mode = parseInt(localStorage.getItem(modeKey), 10) || 1; } catch(e){}
    var openGlyph = (glyphs && glyphs.open) || '‹';
    var closedGlyph = (glyphs && glyphs.closed) || '›';

    function showMode(n){
      mode = Math.max(1, Math.min(panels.length, n));
      bar.dataset.mode = String(mode);
      try { localStorage.setItem(modeKey, String(mode)); } catch(e){}
      panels.forEach(function(p, i){
        p.classList.toggle('sz-mode-active', i === (mode - 1));
      });
      if (mode === panels.length && panels.length >= 3) {
        triggerFlourish(bar);
      }
    }
    showMode(mode); // apply the remembered (or default) mode on load

    makeTapCounter(toggleBtn, function(n){
      var collapsed = bar.classList.contains('sz-collapsed');
      if (!collapsed && n === 1) {
        // Exactly today's old single-tap behavior: close it.
        bar.classList.add('sz-collapsed');
        try { localStorage.setItem(collapseKey, '1'); } catch(e){}
      } else {
        if (collapsed) {
          bar.classList.remove('sz-collapsed');
          try { localStorage.setItem(collapseKey, '0'); } catch(e){}
        }
        showMode(n);
      }
      toggleBtn.textContent = bar.classList.contains('sz-collapsed') ? closedGlyph : openGlyph;
      if (onChange) onChange();
    });

    return { getMode: function(){ return mode; } };
  }

  /* ---------- Generic free-drag, shared by the rail and the
     notebook -- one object, one localStorage key, same mouse/touch
     handling for both. Position is remembered per browser; a plain
     click (no movement) still fires the element's own click handler
     (e.g. clicking a tool button inside the rail).

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
        var overlaps = !(rect.right < t.left || rect.left > t.right ||
                          rect.bottom < t.top || rect.top > t.bottom);
        if (overlaps) {
          try { localStorage.removeItem(storeKey); } catch(e){}
          if (opts.onReattach) opts.onReattach();
          return;
        }
      }

      // General version of the same idea, for objects that can be
      // claimed by EITHER drawer, not just one fixed target -- Larry,
      // July 27 2026: "every object on a screen should be movable...
      // drag it onto a drawer to put it away." Checks each candidate
      // target in turn; first overlap wins, same drop-detection math
      // as the single-target version above.
      if (opts && opts.reattachTargets) {
        for (var ri = 0; ri < opts.reattachTargets.length; ri++) {
          var target = opts.reattachTargets[ri];
          if (!target || !target.el) continue;
          var tr = target.el.getBoundingClientRect();
          var ov = !(rect.right < tr.left || rect.left > tr.right ||
                     rect.bottom < tr.top || rect.top > tr.bottom);
          if (ov) {
            try { localStorage.removeItem(storeKey); } catch(e){}
            if (opts.onReattach) opts.onReattach(target.side, target.el);
            return;
          }
        }
      }

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

  var DOCK_KEY = 't2t-navbar-dock';
  var NOTEBOOK_KEY = 't2t-notebook-pos';
  var NAMEPLATE_KEY = 't2t-nameplate-pos';

  function notebookIsClaimed(){
    try { return !!localStorage.getItem(NOTEBOOK_KEY); } catch(e){ return false; }
  }

  /* ---------- Generalized drawer-storage, July 27 2026 -- Larry:
     "every object in a drawer should be draggable onto the screen...
     every object on a screen should be movable... drag it onto a
     drawer to put it away when drawer is closed." This is the same
     idea the notebook already used above (riding a drawer = no
     independent saved position), generalized so ANY object can ride
     EITHER drawer, not just the notebook riding the left one. Naming
     is deliberately the mirror of notebookIsClaimed above -- here
     "riding" means still attached to a drawer (the notebook's
     "unclaimed" state), to avoid the two meaning opposite things
     under similar names. ---------- */

  function isRidingDrawer(storeKey){
    try { return !localStorage.getItem(storeKey); } catch(e){ return true; }
  }
  function claimSideStoreKey(storeKey){ return 't2t_claimSide_' + storeKey; }
  function getRidingSide(storeKey){
    try { return localStorage.getItem(claimSideStoreKey(storeKey)); } catch(e){ return null; }
  }
  function setRidingSide(storeKey, side){
    try {
      if (side) localStorage.setItem(claimSideStoreKey(storeKey), side);
      else localStorage.removeItem(claimSideStoreKey(storeKey));
    } catch(e){}
  }

  // rec: { el, storeKey, offsetX, defaultTop }. offsetX starts at a
  // sane default and gets overwritten the moment the object is first
  // actually dropped onto a drawer (captureRidingOffset), so it rides
  // wherever it was released, not some fixed formula spot.
  var _claimRegistry = [];
  function registerClaimable(el, storeKey, defaultTop){
    var rec = { el: el, storeKey: storeKey, offsetX: 12, defaultTop: defaultTop };
    _claimRegistry.push(rec);
    return rec;
  }
  function captureRidingOffset(rec, barEl){
    var barRect = barEl.getBoundingClientRect();
    var elRect = rec.el.getBoundingClientRect();
    rec.offsetX = elRect.left - barRect.left;
  }

  // Called by whichever drawer just moved, docked, or toggled --
  // repositions + shows/hides every registered object CURRENTLY
  // riding THIS side, ignores everything else. Cheap enough to call
  // on every drag tick, same as the notebook's own repositionNotebook
  // this generalizes.
  function refreshRidersForSide(side, barEl){
    var barRect = barEl.getBoundingClientRect();
    var collapsed = barEl.classList.contains('sz-collapsed');
    _claimRegistry.forEach(function(rec){
      if (!isRidingDrawer(rec.storeKey) || getRidingSide(rec.storeKey) !== side) return;
      rec.el.style.position = 'fixed';
      rec.el.style.left = (barRect.left + rec.offsetX) + 'px';
      if (!rec.el.style.top) rec.el.style.top = rec.defaultTop + 'px';
      rec.el.style.right = 'auto';
      rec.el.style.bottom = 'auto';
      rec.el.style.margin = '0';
      rec.el.style.display = collapsed ? 'none' : '';
    });
  }

  /* ---------- The rail (tray): full height top-to-bottom by default,
     drags horizontally only (Larry's own words: "drag from right to
     left or back"), and always ends up flush against one edge or the
     other on release -- a real dock, not a threshold you have to hit
     exactly. The notebook rides along with the tray (unless a traveler
     has manually dragged it off the tray to its own spot). ---------- */

  function dockRail(bar, notebook){
    var dockSide = 'left';
    try { dockSide = localStorage.getItem(DOCK_KEY) || 'left'; } catch(e){}

    var dragging = false, moved = false, startX = 0, startLeft = 0;

    function currentWidth(){ return bar.classList.contains('sz-collapsed') ? 0 : RAIL_WIDTH; }

    function railLeftFor(side, width){
      return side === 'right' ? (window.innerWidth - width) : 0;
    }

    // Larry, July 26 (bug fix, round 2): the notebook was snapping back
    // to a hardcoded "near the gear" spot every time the drawer opened,
    // closed, dragged, or docked -- not just on the initial re-attach
    // drop. Reposition now tracks a *relative offset* from the rail's
    // left edge instead of a fixed formula: wherever the notebook was
    // last resting (its default spot, or wherever it was dropped when
    // re-attached) becomes the offset it keeps from then on, so the
    // drawer moving only carries it sideways by the same amount the
    // drawer itself moved -- it never jumps back to one canned spot.
    // Vertical position is never touched here at all.
    var notebookOffsetX = 12; // default: matches the original resting spot

    function captureNotebookOffset(){
      if (!notebook) return;
      var railRect = bar.getBoundingClientRect();
      var nbRect = notebook.getBoundingClientRect();
      notebookOffsetX = nbRect.left - railRect.left;
    }

    function repositionNotebook(railLeft){
      if (!notebook || notebookIsClaimed()) return;
      notebook.style.position = 'fixed';
      notebook.style.left = (railLeft + notebookOffsetX) + 'px';
      if (!notebook.style.top) {
        // Only the very first placement (nothing set yet) needs a
        // vertical default -- same spot it always visually sat.
        notebook.style.top = (window.innerHeight - 132) + 'px';
      }
      notebook.style.right = 'auto';
      notebook.style.bottom = 'auto';
      notebook.style.margin = '0';
    }

    function apply(side, left){
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.bottom = '0';
      bar.style.left = left + 'px';
      bar.style.right = 'auto';
      bar.classList.toggle('sz-dock-right', side === 'right');
      repositionNotebook(left);
      refreshRidersForSide('left', bar);
    }

    function applyDock(side){
      dockSide = side;
      try { localStorage.setItem(DOCK_KEY, side); } catch(e){}
      apply(side, railLeftFor(side, currentWidth()));
    }

    // Initial placement, and re-applied whenever the collapsed width
    // changes (buildToggle calls this directly -- see below).
    apply(dockSide, railLeftFor(dockSide, currentWidth()));

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (NAVBAR_EXCLUDE && e.target.closest(NAVBAR_EXCLUDE)) return;
      if (bar.classList.contains('sz-collapsed')) return; // nothing to grab while collapsed
      var p = pointOf(e);
      dragging = true; moved = false;
      startLeft = bar.getBoundingClientRect().left;
      startX = p.clientX;
      document.body.style.userSelect = 'none';
    }

    function onMove(e){
      if (!dragging) return;
      var p = pointOf(e);
      var dx = p.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (!moved) return;
      if (e.cancelable) e.preventDefault();
      var left = startLeft + dx;
      bar.style.left = left + 'px';
      bar.style.right = 'auto';
      repositionNotebook(left); // the tray carries the notebook as it slides
      refreshRidersForSide('left', bar); // ...and any other rider claimed by this drawer
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = bar.getBoundingClientRect();
      // Always stick to whichever side is nearer -- a real magnetic dock,
      // not "only if you happen to release within N px of the edge."
      var center = rect.left + rect.width / 2;
      applyDock(center < window.innerWidth / 2 ? 'left' : 'right');
    }

    bar.addEventListener('mousedown', onDown);
    bar.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);

    return { applyDock: applyDock, getSide: function(){ return dockSide; }, captureNotebookOffset: captureNotebookOffset };
  }

  // Larry, July 26: "the notebook slides into the wall with everything
  // else on the bar" -- when the drawer closes, anything still resting
  // on it (i.e. the notebook, as long as it hasn't been dragged off to
  // its own spot) goes into the wall too, same as the nameplate/tools/
  // gear. A notebook a traveler has claimed for its own spot elsewhere
  // on the desk is unaffected either way.
  function updateNotebookVisibility(bar, notebook){
    var hideWithDrawer = bar.classList.contains('sz-collapsed') && !notebookIsClaimed();
    notebook.style.display = hideWithDrawer ? 'none' : '';
  }

  function buildNavBar(){
    if (document.getElementById('sz-navbar')) return; // idempotent
    injectStyle();

    var bar = document.createElement('div');
    bar.id = 'sz-navbar';

    // Larry, July 26: "single tap one drawer, double tap second
    // drawer, triple tap for surprising trivia." Mode 1 is the rail's
    // real, already-working content (the tool stack) -- untouched.
    // Modes 2 and 3 are placeholders on purpose; nothing's been
    // designated for them yet. Nameplate/menu/gear deliberately sit
    // OUTSIDE this mid area -- Larry, July 26 (later note): the
    // nameplate isn't drawer content, it's a persistent label, so it
    // (and the always-needed ☰/gear) stay visible no matter which mode
    // is showing.
    var mid = document.createElement('div');
    mid.id = 'sz-navmid';
    var mode1 = buildTools(bar);
    mode1.classList.add('sz-mode-panel', 'sz-mode-active');
    var mode2 = buildModePlaceholder('Left drawer -- slot 2 (not yet designated)');
    var surprise = buildSurprisePanel();
    surprise.textEl.textContent = SURPRISE_POOL[0]; // initial text, in case mode 3 restores on load
    mid.appendChild(mode1);
    mid.appendChild(mode2);
    mid.appendChild(surprise.el);

    bar.appendChild(mid);
    bar.appendChild(buildMenuButton());
    bar.appendChild(buildGear());

    var nameplate = buildNameplate();
    var notebook = buildNotebook();

    var toggle = document.createElement('button');
    toggle.id = 'sz-navbar-toggle';
    toggle.type = 'button';
    toggle.title = 'Collapse / expand (tap 1/2/3 times for the different slots)';
    toggle.textContent = '‹';
    bar.appendChild(toggle);

    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') {
        bar.classList.add('sz-collapsed');
        toggle.textContent = '›';
      }
    } catch(e){}

    document.body.appendChild(bar);
    document.body.appendChild(nameplate);
    document.body.appendChild(notebook);

    wireDrawerColorGesture(bar, LEFT_DRAWER_COLOR_PREFIX, 'Left');

    wireModeToggle(toggle, bar, [mode1, mode2, surprise.el], 'LEFT_DRAWER_MODE', COLLAPSE_KEY, { open: '‹', closed: '›' }, function(){
      // Only re-roll the surprise text when slot 3 is the one actually
      // showing -- not on every mode switch, so it doesn't waste a
      // pick nobody sees.
      if (bar.dataset.mode === '3') {
        var idx = Math.floor(Math.random() * SURPRISE_POOL.length);
        surprise.textEl.textContent = SURPRISE_POOL[idx];
      }
      // Each slot keeps its own color (Larry, July 27 2026) -- the
      // drawer's visible background needs to follow along every time
      // the active slot changes, not just at initial load.
      refreshDrawerColorForMode(bar, LEFT_DRAWER_COLOR_PREFIX);
      // Collapsing/expanding (or switching mode) changes the tray's
      // width/dock math the same way the old plain toggle did -- the
      // notebook riding on it needs to follow either way.
      rail.applyDock(rail.getSide());
      updateNotebookVisibility(bar, notebook);
    });
    // wireModeToggle already restored the remembered slot (or
    // defaulted to 1) into bar.dataset.mode by the time it returns --
    // apply that slot's own saved color now, before first paint.
    refreshDrawerColorForMode(bar, LEFT_DRAWER_COLOR_PREFIX);

    var rail = dockRail(bar, notebook);
    updateNotebookVisibility(bar, notebook);

    // Notebook's default spot (before a traveler ever drags it) is
    // computed by dockRail/repositionNotebook above -- "on the nav bar,
    // near the bottom," same place it always visually sat. Dragging it
    // elsewhere is a traveler option: once moved, it keeps its own
    // saved spot and stops riding the tray -- unless it's dragged back
    // onto the drawer itself, which re-claims it for the drawer (see
    // reattachTo/onReattach below).
    //
    // Larry, July 26 (bug fix): re-attaching must NOT jump the
    // notebook to the drawer's canned "near the gear" spot -- it stays
    // exactly wherever it was released, anywhere on screen. All
    // re-attaching does is drop the claim and update hide-with-drawer
    // visibility; the notebook only starts tracking the drawer's own
    // position again the next time the drawer itself is dragged or
    // docked (dockRail's repositionNotebook, unchanged).
    makeDraggable(
      notebook, NOTEBOOK_KEY, null,
      notebook.style.left ? parseFloat(notebook.style.left) : 16,
      notebook.style.top ? parseFloat(notebook.style.top) : 16,
      {
        reattachTo: bar,
        onReattach: function(){
          rail.captureNotebookOffset();
          updateNotebookVisibility(bar, notebook);
        }
      }
    );

    // Nameplate: free-standing, drag purely optional -- "make it
    // drag if desired." Default spot (10, 16) matches the rail's own
    // top-left padding, where the nameplate always visually sat while
    // it lived inside the bar. Nothing claims it by default -- it
    // only starts riding a drawer once a traveler actually drops it
    // on one (see reattachTargets below), same opt-in Larry described:
    // "if desired," not a forced new behavior for anyone who never
    // touches this.
    //
    // The right drawer's element is looked up lazily via a getter
    // (not captured directly) because buildRightDrawer() hasn't run
    // yet at this point in buildNavBar() -- by the time a traveler
    // actually drops the nameplate on it, it will exist.
    var nameplateRec = registerClaimable(nameplate, NAMEPLATE_KEY, 16);
    makeDraggable(
      nameplate, NAMEPLATE_KEY, null,
      nameplate.style.left ? parseFloat(nameplate.style.left) : 10,
      nameplate.style.top ? parseFloat(nameplate.style.top) : 16,
      {
        reattachTargets: [
          { el: bar, side: 'left' },
          { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
        ],
        onReattach: function(side, barEl){
          setRidingSide(NAMEPLATE_KEY, side);
          captureRidingOffset(nameplateRec, barEl);
          refreshRidersForSide(side, barEl);
        }
      }
    );
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

    // Body-drag retired here, July 27 2026 -- Larry: "drag tv frame
    // but not content." Now that reading content is highlight/copy-
    // selectable (see the #fg-root:not(.isx-full) rule in index.html),
    // grabbing the widget's own body to move it would fight with
    // selecting text in the same gesture. Moving the widget is now the
    // TV frame's own job instead (tv-frame.js's wireFrameDrag, same
    // 't2t-widget-pos' storage key so it's one continuous position,
    // not two separate systems). This function still restores a saved
    // position on load, and onDown/onMove/onUp stay defined below in
    // case a future screen wants body-dragging back -- just not wired
    // to any listener for now.
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
  }

  /* ---------- The new right-side drawer -- Larry, July 26: "only 2
     drawers BUT they are magic," mirroring the nav drawer's mechanics
     on the right instead of the left. No nameplate/notebook/menu/gear
     here -- nothing's been designated for what belongs in it yet, so
     it's just the toggle + three placeholder mode panels for now, same
     tap-count rule as the left drawer (1/2/3 taps = slot 1/2/3, single
     tap while open just closes it).

     This deliberately duplicates dockRail's drag/dock logic rather
     than generalizing dockRail to serve both drawers -- safer, given
     dockRail is already carrying real, tested behavior (the notebook
     riding along, its offset-tracking fix, etc.) that a shared
     refactor could risk disturbing. Worth unifying into one real
     "drawer" building block later, once this one's settled -- flagged,
     not guessed at here. ---------- */

  var RIGHT_DOCK_KEY = 't2t-drawer-r-dock';
  var RIGHT_COLLAPSE_KEY = 't2t-drawer-r-collapsed';

  function dockRightDrawer(bar){
    var dockSide = 'right';
    try { dockSide = localStorage.getItem(RIGHT_DOCK_KEY) || 'right'; } catch(e){}

    var dragging = false, moved = false, startX = 0, startLeft = 0;

    function currentWidth(){ return bar.classList.contains('sz-collapsed') ? 0 : RAIL_WIDTH; }
    function railLeftFor(side, width){ return side === 'left' ? 0 : (window.innerWidth - width); }

    function apply(side, left){
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.bottom = '0';
      bar.style.left = left + 'px';
      bar.style.right = 'auto';
      bar.classList.toggle('sz-dock-left', side === 'left');
      refreshRidersForSide('right', bar);
    }

    function applyDock(side){
      dockSide = side;
      try { localStorage.setItem(RIGHT_DOCK_KEY, side); } catch(e){}
      apply(side, railLeftFor(side, currentWidth()));
    }

    apply(dockSide, railLeftFor(dockSide, currentWidth()));

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (NAVBAR_EXCLUDE && e.target.closest(NAVBAR_EXCLUDE)) return;
      if (bar.classList.contains('sz-collapsed')) return;
      var p = pointOf(e);
      dragging = true; moved = false;
      startLeft = bar.getBoundingClientRect().left;
      startX = p.clientX;
      document.body.style.userSelect = 'none';
    }

    function onMove(e){
      if (!dragging) return;
      var p = pointOf(e);
      var dx = p.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (!moved) return;
      if (e.cancelable) e.preventDefault();
      bar.style.left = (startLeft + dx) + 'px';
      bar.style.right = 'auto';
      refreshRidersForSide('right', bar);
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = bar.getBoundingClientRect();
      var center = rect.left + rect.width / 2;
      applyDock(center < window.innerWidth / 2 ? 'left' : 'right');
    }

    bar.addEventListener('mousedown', onDown);
    bar.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);

    return { applyDock: applyDock, getSide: function(){ return dockSide; } };
  }

  function buildRightDrawer(){
    if (document.getElementById('sz-drawer-r')) return; // idempotent
    injectStyle();

    var bar = document.createElement('div');
    bar.id = 'sz-drawer-r';

    var mid = document.createElement('div');
    mid.id = 'sz-drawer-r-mid';
    var mode1 = buildModePlaceholder('Right drawer -- slot 1 (not yet designated)');
    mode1.classList.add('sz-mode-active');
    var mode2 = buildModePlaceholder('Right drawer -- slot 2 (not yet designated)');
    var surprise = buildSurprisePanel();
    surprise.textEl.textContent = SURPRISE_POOL[0];
    mid.appendChild(mode1);
    mid.appendChild(mode2);
    mid.appendChild(surprise.el);
    bar.appendChild(mid);

    var toggle = document.createElement('button');
    toggle.id = 'sz-drawer-r-toggle';
    toggle.type = 'button';
    toggle.title = 'Collapse / expand (tap 1/2/3 times for the different slots)';
    toggle.textContent = '›';
    bar.appendChild(toggle);

    try {
      if (localStorage.getItem(RIGHT_COLLAPSE_KEY) === '1') {
        bar.classList.add('sz-collapsed');
        toggle.textContent = '‹';
      }
    } catch(e){}

    document.body.appendChild(bar);

    wireDrawerColorGesture(bar, RIGHT_DRAWER_COLOR_PREFIX, 'Right');

    var drawer = dockRightDrawer(bar);

    wireModeToggle(toggle, bar, [mode1, mode2, surprise.el], 'RIGHT_DRAWER_MODE', RIGHT_COLLAPSE_KEY, { open: '›', closed: '‹' }, function(){
      if (bar.dataset.mode === '3') {
        var idx = Math.floor(Math.random() * SURPRISE_POOL.length);
        surprise.textEl.textContent = SURPRISE_POOL[idx];
      }
      // Each slot keeps its own color (Larry, July 27 2026).
      refreshDrawerColorForMode(bar, RIGHT_DRAWER_COLOR_PREFIX);
      drawer.applyDock(drawer.getSide());
    });
    // Apply the restored slot's own saved color before first paint,
    // same reasoning as the left drawer above.
    refreshDrawerColorForMode(bar, RIGHT_DRAWER_COLOR_PREFIX);
  }

  function init(){
    buildNavBar();
    buildRightDrawer();
    makeWidgetDraggable();

    // Final sync pass, after both drawers definitely exist: some
    // claimable objects (the nameplate, tool buttons) get registered
    // partway through buildNavBar, before dockRail's own initial
    // apply() call had a chance to see them, and the right drawer
    // doesn't exist at all until buildRightDrawer runs. This catches
    // anyone loading with a saved claim from a previous session so
    // they land in the right spot on first paint, not just after the
    // next drag/dock/toggle.
    var leftBarEl = document.getElementById('sz-navbar');
    var rightBarEl = document.getElementById('sz-drawer-r');
    if (leftBarEl) refreshRidersForSide('left', leftBarEl);
    if (rightBarEl) refreshRidersForSide('right', rightBarEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
