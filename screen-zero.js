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
      +   'right:-28px;width:28px;height:60px;'
      +   'border-radius:0 30px 30px 0;border:2px solid #999;border-left:none;'
      +   'background:var(--sz-bg,#fdf8f0);cursor:pointer;'
      +   'box-shadow:2px 3px 8px rgba(0,0,0,.25);font-size:17px;line-height:1;'
      +   'display:flex;align-items:center;justify-content:center;z-index:1}'
      // Docked to the right side: the tray anchors from the right instead
      // of the left, and the toggle mirrors onto the rail's LEFT edge so
      // it still pokes into open screen space, not off past the browser
      // edge. Larry, July 26: "if it is placed on the right side of the
      // screen, the toggle must switch to the left side."
      + '#sz-navbar.sz-dock-right #sz-navbar-toggle{right:auto;left:-28px;'
      +   'border-radius:30px 0 0 30px;border-left:2px solid #999;border-right:none}'
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
      + '#sz-navmid{position:relative;flex:1;width:100%;display:flex;flex-direction:column;align-items:center;'
      +   'justify-content:center;gap:16px;overflow-y:auto;padding:10px 0}'
      + '#sz-tools{display:flex;flex-direction:column;align-items:center}'
      + '#sz-tool-stack{display:flex;flex-direction:column;gap:8px;align-items:center;cursor:grab;'
      +   'z-index:9999}'
      + '#sz-phases{display:flex;flex-direction:column;align-items:center}'
      + '#sz-phase-stack{display:flex;flex-direction:column;gap:8px;align-items:center;'
      +   'z-index:9999}'
      // Larry, July 29 2026 (close of session): phase buttons take their
      // matching phase color instead of the tool tray's shared gold --
      // green like the Introduction panels (#0F6E56, the locked
      // Introduction phase accent), sky blue for Dream (matches the
      // Dream toolbar's own #d6eaf8), parchment for Believe (matches
      // the app's existing parchment token), yellow for Dare, yellow-
      // green for Journey. Same two-tone gradient shape the gold
      // buttons already use, just recolored per phase.
      + '.sz-tool-btn[data-phase-id="intro"]{background:linear-gradient(135deg,#8fd9be,#0F6E56)}'
      + '.sz-tool-btn[data-phase-id="intro"] .sz-tool-face{background:radial-gradient(circle at 35% 30%,#eafaf3,#8fd9be 55%,#0F6E56 100%);color:#0a3a2c}'
      + '.sz-tool-btn[data-phase-id="dream"]{background:linear-gradient(135deg,#eaf4fb,#5b9bd5)}'
      + '.sz-tool-btn[data-phase-id="dream"] .sz-tool-face{background:radial-gradient(circle at 35% 30%,#f6fbfe,#cfe6f7 55%,#5b9bd5 100%);color:#1a3a5c}'
      + '.sz-tool-btn[data-phase-id="believe"]{background:linear-gradient(135deg,#fffbf0,#d8bd94)}'
      + '.sz-tool-btn[data-phase-id="believe"] .sz-tool-face{background:radial-gradient(circle at 35% 30%,#fffdf7,#f3e6cf 55%,#d8bd94 100%);color:#5c4423}'
      + '.sz-tool-btn[data-phase-id="dare"]{background:linear-gradient(135deg,#fff6d6,#d4af37)}'
      + '.sz-tool-btn[data-phase-id="dare"] .sz-tool-face{background:radial-gradient(circle at 35% 30%,#fffce8,#fbe9a8 55%,#d4af37 100%);color:#5c4a10}'
      + '.sz-tool-btn[data-phase-id="journey"]{background:linear-gradient(135deg,#eaf5c8,#8fae3e)}'
      + '.sz-tool-btn[data-phase-id="journey"] .sz-tool-face{background:radial-gradient(circle at 35% 30%,#f6fbe9,#d7e8a8 55%,#8fae3e 100%);color:#3a4a18}'
      + '.sz-tool-stack-grip{width:150px;padding:7px 4px;border-radius:6px;text-align:center;'
      +   'font-size:12px;letter-spacing:1.5px;color:#8a6a3a;cursor:grab;user-select:none;'
      +   'border:1px dashed #c9a86a;background:rgba(255,255,255,.35)}'
      // Larry, July 29 2026: after fixing tool buttons so a drop
      // anywhere on the rail (not just the list) rides that spot
      // independently, one dropped onto empty rail/drawer space came
      // back invisible -- rail and drawer panels paint at z-index:9998
      // and a tool button had no z-index of its own (defaults below
      // that), so it rendered UNDER the panel it was sitting on top of.
      // Nameplate/notebook never hit this because they were already
      // given z-index:9999; giving tool buttons the same fixes it.
      + '.sz-tool-btn{width:150px;padding:3px;border-radius:6px;border:none;cursor:pointer;'
      +   'background:linear-gradient(135deg,#e0b060,#8a6420);box-shadow:2px 3px 6px rgba(0,0,0,.3);'
      +   'transition:transform .1s ease, box-shadow .1s ease;z-index:9999}'
      + '.sz-tool-btn:active{transform:translateY(2px);box-shadow:1px 1px 2px rgba(0,0,0,.3)}'
      // Desk close/reopen handle -- RETIRED July 31 2026, later same
      // day, Larry: "Closing the Field Guide ONLY makes SHORTCUTS and
      // PHASES disappear." The tool tray never hides anymore, so the
      // real Field Guide tool button (still standing) is the reopen
      // handle now -- see its action in TOOL_ITEMS_DEFAULT. No
      // separate floating element needed, which also retires the bugs
      // that came with it (leaking onto Sign In, the confusing pulse).
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
      // Larry, July 31 2026 (bug report): gear dragged into the right
      // drawer vanished completely on release. Same root cause already
      // documented above for tool buttons: drawer panels paint at
      // z-index:9998, and gear/menu never got the z-index:9999 fix when
      // they were made drawer-dockable earlier today -- they rendered
      // UNDER whichever drawer they'd just been dropped onto, invisible
      // but not actually gone. Both now carry z-index:9999, same as
      // every other floating desk object.
      + '#sz-gear{width:36px;height:36px;border-radius:50%;border:2px solid #999;'
      +   'background:#fff;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);'
      +   'display:flex;align-items:center;justify-content:center;margin-top:6px;z-index:9999}'
      + '#sz-menu{width:36px;height:36px;border-radius:50%;border:2px solid #999;'
      +   'background:#fff;font-size:16px;line-height:1;cursor:pointer;flex-shrink:0;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.25);'
      +   'display:flex;align-items:center;justify-content:center;margin-top:10px;z-index:9999}'
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
      +   'gap:6px;width:150px;min-height:80px;border-radius:8px;'
      +   'padding:14px 10px;text-align:center;color:#7a5c3a;font-size:11px;'
      +   'font-family:"Playfair Display",Georgia,serif;box-sizing:border-box}'
      // Larry, July 29 2026: "delete dotted lines too!" -- both
      // drawers' still-undesignated slots (left's old slot 2, right's
      // slots 1 and 2) are bare panels now, no dashed "not built yet"
      // border. .sz-mode-tbd is retired along with it -- nothing uses
      // it anymore. Surprise slot (mode 3) needs a bit more room than
      // the plain placeholders, now that it holds a real image too.
      + '.sz-surprise-panel{min-height:150px;border:none}'
      + '.sz-surprise-gif{width:72px;height:72px;border-radius:8px;object-fit:cover;'
      +   'border:2px solid #b89968;box-shadow:0 3px 8px rgba(0,0,0,.3);cursor:grab;'
      +   '-webkit-user-drag:none;user-select:none}'
      + '.sz-surprise-gif.sz-dragging{cursor:grabbing}'
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
      // Larry, July 31 2026: "Let's emboss the drawers so that like the
      // desktop, putting something in them just covers the embossing."
      // Generalized version of the placeholder-only clue from earlier
      // today -- lives on each drawer's own interior (#sz-navmid /
      // #sz-drawer-r-mid) instead of one specific slot class, same
      // pressed-into-the-surface look as the desk's own T2T watermark.
      // z-index:-1 against the mid container's own stacking context
      // (position:relative, set just above) keeps it under every real
      // piece of drawer content -- the tool stack and phase tray both
      // already carry z-index:9999, so it's invisible behind either one
      // once populated, and only shows through a slot that's genuinely
      // empty (today: each drawer's own still-undesignated slot 2).
      + '#sz-navmid::before,#sz-drawer-r-mid::before{content:"Drawer";position:absolute;inset:0;'
      +   'z-index:-1;display:flex;align-items:center;justify-content:center;'
      +   'font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:26px;letter-spacing:0.1em;color:rgba(0,0,0,.05);'
      +   'text-shadow:1px 1px 2px rgba(255,255,255,.45),-1px -1px 2px rgba(0,0,0,.18);'
      +   'white-space:pre-line;text-align:center;line-height:1.25;'
      +   'pointer-events:none;user-select:none}'
      // Larry, August 3 2026: "add '1' below Drawer on the one-click
      // drawer and '2' on the two-click drawer, for ID purposes."
      // bar.dataset.mode (set by wireModeToggle's showMode) tells us
      // which tap-count slot is currently showing, so the embossed
      // watermark itself can carry the slot number -- same generic
      // text for mode 3 (surprise slot already has its own real
      // content/flourish, doesn't need a number).
      + '#sz-navbar[data-mode="1"] #sz-navmid::before,'
      +   '#sz-drawer-r[data-mode="1"] #sz-drawer-r-mid::before{content:"Drawer\\A 1"}'
      + '#sz-navbar[data-mode="2"] #sz-navmid::before,'
      +   '#sz-drawer-r[data-mode="2"] #sz-drawer-r-mid::before{content:"Drawer\\A 2"}'
      + '#sz-drawer-r-toggle{position:absolute;top:50%;transform:translateY(-50%);'
      +   'left:-28px;width:28px;height:60px;'
      +   'border-radius:30px 0 0 30px;border:2px solid #999;border-right:none;'
      +   'background:var(--sz-bg,#fdf8f0);cursor:pointer;'
      +   'box-shadow:-2px 3px 8px rgba(0,0,0,.25);font-size:17px;line-height:1;'
      +   'display:flex;align-items:center;justify-content:center;z-index:1}'
      + '#sz-drawer-r.sz-dock-left #sz-drawer-r-toggle{left:auto;right:-28px;'
      +   'border-radius:0 30px 30px 0;border-left:none;border-right:2px solid #999}'
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
      // Text-size picker -- Aug 3 2026, same overlay/card family as the
      // drawer color picker just above.
      + '#sz-text-overlay{position:fixed;inset:0;z-index:9997;'
      +   'background:rgba(74,52,24,0.4);display:none;align-items:center;'
      +   'justify-content:center;padding:20px;box-sizing:border-box}'
      + '#sz-text-overlay.active{display:flex}'
      + '#sz-text-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:min(280px,90%);box-shadow:0 10px 30px rgba(0,0,0,.4);text-align:center}'
      + '#sz-text-card .sz-text-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:15px;font-weight:700;color:#4a3418;margin-bottom:2px}'
      + '#sz-text-card .sz-text-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:14px}'
      + '#sz-text-options{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}'
      + '.sz-text-option{border:1px solid #cfae7e;background:#fff;padding:10px 12px;'
      +   'border-radius:10px;cursor:pointer;color:#4a3418;font-family:"Playfair Display",Georgia,serif}'
      + '.sz-text-option.sz-text-active{border-color:#4a3418;border-width:2px;background:#f6ecd8;font-weight:700}'
      + '#sz-text-close{border:1px solid #b89968;background:#fff;padding:6px 16px;'
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

    function applyName(m){
      var textEl = document.getElementById('sz-nameplate-text');
      if (m && m.display_name && textEl) textEl.textContent = m.display_name.toUpperCase();
    }

    // Larry, July 27 2026 (bug report): "Why does nametag say Traveler
    // instead of my name? I signed in!" Root cause: this was a pure
    // poll-and-give-up -- if sign-in took longer than the ~20 second
    // window (typing an email and password easily does), the poll had
    // already quit before the profile ever loaded, and nothing told
    // the nametag to look again. backpack.js now fires a real event
    // the moment the profile actually finishes loading, however long
    // that takes, so this is correct no matter how long sign-in takes.
    // The poll below stays as a fast path for the common case (a
    // restored session already loading on page load).
    window.addEventListener('t2t:member-loaded', function(e){ applyName(e.detail); });

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var m = window.T2T && window.T2T.getMember && window.T2T.getMember();
      if (m && m.display_name) {
        applyName(m);
        clearInterval(timer);
      } else if (tries > 20) {
        clearInterval(timer); // give up quietly for now -- the event listener above still catches a later sign-in
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
  // Larry, July 27 2026 (mid-turn interrupt): "Tool stack must
  // either stay as a unit or have a default reset if one is moved by
  // accident." Rather than force the 6 buttons to move as a rigid
  // group (which would undercut "Tool button stack should drag from
  // drawer if desired -- Flexibility!" from earlier the same day),
  // the gear button becomes an easy one-tap undo: every tool button
  // snaps back to its home spot in the list, regardless of what's
  // currently claimed or independently placed.
  // Larry, July 31 2026: "Tapping Field Guide a second time opens the
  // old backpack 9000. Is it a good idea for the second click to
  // close the button as additional method to X?" -- then, once
  // confirmed: "yes toggle all the buttons!" Every tool button that
  // actually opens a real screen now toggles: tap opens it, tap again
  // (while it's already showing) closes/leaves it, instead of
  // re-running the same open action or, for Field Guide specifically,
  // falling through to an unrelated legacy screen. Buttons that only
  // show a "coming later" toast have nothing to toggle yet -- nothing
  // opens, so they're untouched.
  // closeFn -- optional, Aug 3 2026. Defaults to the plain T2T.goBack()
  // every toggle button used before, but some target screens (the Idea
  // Storyboard) have their own dedicated close routine that does real
  // cleanup goBack() doesn't know about, and -- the actual bug -- treats
  // 1010 as an old backpack-hub utility screen and reopens the obsolete
  // ☰ backpack menu instead of closing. Larry, Aug 3 2026: "closing
  // storyboard went to obsolete backpack rather than to storyboard
  // button."
  function wireToggleNav(targetScreenId, openFn, closeFn){
    return function(){
      if (window.T2T && window.T2T.getCur && window.T2T.getCur() === targetScreenId) {
        if (closeFn) closeFn(); else window.T2T.goBack();
      } else {
        openFn();
      }
    };
  }

  var TOOL_ITEMS_DEFAULT = [
    // Larry, July 31 2026: "Closing the Field Guide ONLY makes
    // SHORTCUTS and PHASES disappear... Field Guide Button" is the
    // thing a traveler clicks to bring them back -- and since the
    // tool tray itself never hides anymore (see the desk-closed CSS
    // rule in style.css), THIS is that button; no separate floating
    // toggle needed. isDeskClosed/reopenDesk are declared further
    // down this file but that's fine -- function declarations are
    // hoisted, and this only ever runs from a real click, long after
    // the whole file has parsed.
    //
    // Second tap now closes the Field Guide (same as the TV frame's
    // own X) instead of opening the old 9000 backpack menu -- that
    // menu is still one tap away on the separate ☰ Menu button, so
    // nothing is lost, Field Guide just has one clean open/close job.
    { id: 'field-guide',    label: 'Field Guide',     action: function(){
        if (isDeskClosed()) { reopenDesk(); return; }
        closeDesk();
      } },
    { id: 'idea-board',     label: 'Idea Board',      action: wireToggleNav('s-sea-of-ideas-cluster', function(){ if (window.T2TMedia && window.T2TMedia.openBoardResume) window.T2TMedia.openBoardResume(); else if (window.T2T) window.T2T.nav('s-sea-of-ideas-cluster'); }, function(){ if (window.T2TStoryboard && window.T2TStoryboard.closeBoard) window.T2TStoryboard.closeBoard(); else if (window.T2T) window.T2T.goBack(); }) }, // Larry, July 29 2026: was pointing at the archived 9220 legacy grid -- routes to the current 1010 Idea Storyboard now. // Larry, August 1 2026: plain nav() left currentTopicId null, landing on 1010's confusing blank-project fallback -- now resumes the last real topic instead, same as 9711 already does.
    { id: 'briefing-board', label: 'Briefing Board',  action: wireToggleNav('s-briefing-board', function(){ if (window.T2T) window.T2T.nav('s-briefing-board'); }) },
    { id: 'planning',       label: 'Planning',        action: function(){ showZeroToast('Planning — coming later.'); } },
    { id: 'organization',   label: 'Organization',    action: function(){ showZeroToast('Organization — coming later.'); } },
    { id: 'storytelling',   label: 'Storytelling',    action: function(){ showZeroToast('Storytelling — coming later.'); } },
    { id: 'synapse',        label: 'Synapse',         action: function(){ showZeroToast('Synapse — coming later.'); } },
    { id: 'library',        label: 'Library',         action: function(){ showZeroToast('Library — coming later.'); } },
    { id: 'excellence',     label: 'Excellence',      action: function(){ showZeroToast('Excellence — coming later.'); } }
  ];

  // Larry, July 29 2026 (later same day): "All those buttons should be
  // in the tools group / tray... All reorganizable." The nine tools
  // used to be two separate clusters -- the original six couldn't be
  // reordered, only the three added earlier that day could. This is
  // one unified stack of nine: every button can be dragged past its
  // neighbors to reorder (wireToolReorder below), the whole stack
  // still moves together via its grip, and any single button can
  // still be dragged out alone onto the desk or into either drawer.
  var TOOL_ORDER_KEY = 't2t_toolOrder';
  var TOOL_STACK_KEY = 't2t_toolStackPos';
  var _toolStackRec = null;
  var _toolButtonRecs = [];

  // Larry, July 31 2026: "The gear button does not drag. All objects
  // should drag into and out of drawers." Gear (and the matching
  // Menu/☰ button next to it) used to be the one thing left out of
  // the drawer-dockable system every other floating object already
  // has -- same reattach-to-either-drawer pattern as the nameplate/
  // notebook, generalized here so both buttons share one function
  // instead of duplicating it. Recs live in their own array (not
  // _toolButtonRecs -- these aren't part of the reorderable tool
  // list) but resetToolStack() below restores them the same way, so
  // the gear's own reset action is also the way back if either gets
  // dragged somewhere by accident.
  var GEAR_POS_KEY = 't2t_gearPos';
  var MENU_POS_KEY = 't2t_menuPos';
  var _railButtonRecs = [];

  function wireDetachableRailButton(btn, storeKey, leftBar){
    var rec = registerClaimable(btn, storeKey, 16);
    _railButtonRecs.push(rec);
    makeDraggable(btn, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      reattachTargets: [
        { el: leftBar, side: 'left' },
        { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
      ],
      onIndependent: function(){
        if (btn.parentNode !== document.body) document.body.appendChild(btn);
        // Defensive, July 31 2026: nothing in this path should ever
        // leave a stale inline display:none behind, but this guarantees
        // a free-desktop drop is always visible regardless of what
        // state the button carried in from (e.g. dropped while still
        // nested under a collapsed rail).
        btn.style.display = '';
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
    return rec;
  }

  function loadToolOrder(){
    try {
      var saved = JSON.parse(localStorage.getItem(TOOL_ORDER_KEY));
      if (Array.isArray(saved) && saved.length === TOOL_ITEMS_DEFAULT.length) {
        var byId = {};
        TOOL_ITEMS_DEFAULT.forEach(function(it){ byId[it.id] = it; });
        var ordered = saved.map(function(id){ return byId[id]; }).filter(Boolean);
        if (ordered.length === TOOL_ITEMS_DEFAULT.length) return ordered;
      }
    } catch(e){}
    return TOOL_ITEMS_DEFAULT.slice();
  }

  function saveToolOrderFromDom(stackEl){
    var ids = [];
    stackEl.querySelectorAll(':scope > .sz-tool-btn').forEach(function(btn){
      if (btn.dataset.toolId) ids.push(btn.dataset.toolId);
    });
    if (ids.length === TOOL_ITEMS_DEFAULT.length) {
      try { localStorage.setItem(TOOL_ORDER_KEY, JSON.stringify(ids)); } catch(e){}
    }
  }

  function resetToolOrder(){
    try { localStorage.removeItem(TOOL_ORDER_KEY); } catch(e){}
  }

  function resetToolStack(){
    _toolButtonRecs.concat(_railButtonRecs).forEach(function(rec){
      setRidingSlot(rec.storeKey, null);
      try { localStorage.removeItem(rec.storeKey); } catch(e){}
      restoreHomeParent(rec);
      rec.el.style.position = '';
      rec.el.style.left = ''; rec.el.style.top = '';
      rec.el.style.right = ''; rec.el.style.bottom = ''; rec.el.style.margin = '';
      rec.el.style.display = '';
    });
    resetToolOrder();
    if (_toolStackRec) {
      var stackEl = _toolStackRec.el;
      var order = TOOL_ITEMS_DEFAULT.map(function(it){ return it.id; });
      order.forEach(function(id){
        var btn = stackEl.querySelector('[data-tool-id="' + id + '"]');
        if (btn) stackEl.appendChild(btn);
      });
      setRidingSlot(TOOL_STACK_KEY, null);
      try { localStorage.removeItem(TOOL_STACK_KEY); } catch(e){}
      restoreHomeParent(_toolStackRec);
      stackEl.style.position = '';
      stackEl.style.left = ''; stackEl.style.top = '';
      stackEl.style.right = ''; stackEl.style.bottom = ''; stackEl.style.margin = '';
      stackEl.style.display = '';
    }
    showZeroToast('Tool stack reset.');
  }

  // Live reorder while dragging -- swap-on-crossing, same idea as any
  // sortable list: as the dragged button's vertical midpoint crosses a
  // neighbor's midpoint, that neighbor hops to the other side of it.
  // Only acts while the dragged button is still at least partly over
  // the stack itself, so pulling one out toward a drawer or the open
  // desk never shuffles the others on its way past them.
  function wireToolReorder(btn, stackEl){
    return function(rect){
      var stackRect = stackEl.getBoundingClientRect();
      var nearStack = !(rect.right < stackRect.left || rect.left > stackRect.right ||
                         rect.bottom < stackRect.top || rect.top > stackRect.bottom);
      if (!nearStack) return;
      var draggedMidY = rect.top + rect.height / 2;
      var siblings = Array.prototype.slice.call(stackEl.querySelectorAll(':scope > .sz-tool-btn'))
        .filter(function(s){ return s !== btn; });
      for (var i = 0; i < siblings.length; i++) {
        var sib = siblings[i];
        var sr = sib.getBoundingClientRect();
        var sibMidY = sr.top + sr.height / 2;
        var draggedIsBefore = (btn.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (draggedIsBefore && draggedMidY > sibMidY) {
          stackEl.insertBefore(sib, btn);
          break;
        } else if (!draggedIsBefore && draggedMidY < sibMidY) {
          stackEl.insertBefore(btn, sib);
          break;
        }
      }
    };
  }

  // Each tool button can be dragged out of the stack onto the desk
  // (becomes its own independent floating object), dropped onto the
  // RIGHT drawer to be stored there, dropped back onto its OWN drawer
  // (leftBar) to return home, or dropped back onto the stack itself
  // to reorder (see wireToolReorder above, which has already put it
  // in the right DOM spot by the time it's released).
  function wireToolButtonDrag(btn, leftBar, stackEl){
    var storeKey = 't2t_toolBtnPos_' + btn.dataset.toolId;
    var rec = registerClaimable(btn, storeKey, 16);
    _toolButtonRecs.push(rec);
    makeDraggable(btn, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      onDragMove: wireToolReorder(btn, stackEl),
      reattachTargets: [
        { el: stackEl, side: 'stack' },
        { el: leftBar, side: 'left' },
        { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
      ],
      onIndependent: function(){
        if (btn.parentNode !== document.body) document.body.appendChild(btn);
      },
      onReattach: function(side, barEl){
        // Larry, July 29 2026 (later same day): "Field Guide jumped into
        // [the] tool list even though I dropped it above the list as a
        // separate item in the drawer." Root cause: the rail's own mode-1
        // (its default, most-common state) used to be treated as "this
        // button's home is the list" NO MATTER WHERE on the rail it
        // landed -- so any drop anywhere on the left rail, even clearly
        // above the list, merged it straight back in. Now the STACK
        // itself is the only thing that means "back in the list" (it's
        // already checked first, above); landing anywhere else on either
        // rail/drawer -- including elsewhere on the left rail -- rides
        // that spot as its own independent object instead, same as the
        // right drawer already did.
        if (side === 'stack') {
          setRidingSlot(storeKey, null);
          try { localStorage.removeItem(storeKey); } catch(e){}
          btn.style.position = '';
          btn.style.left = ''; btn.style.top = '';
          btn.style.right = ''; btn.style.bottom = ''; btn.style.margin = '';
          btn.style.display = '';
          saveToolOrderFromDom(stackEl);
          return;
        }
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  // Larry, July 27 2026: "Tool stack is an object and should move out
  // of drawer as a unit if desired." Grabbing a button still moves
  // just that button; grabbing the grip (or the gaps around it) moves
  // all nine together.
  function wireToolStackDrag(stack, leftBar){
    var rec = registerClaimable(stack, TOOL_STACK_KEY, 16);
    _toolStackRec = rec;
    makeDraggable(stack, TOOL_STACK_KEY, '.sz-tool-btn', 40, 40, {
      skipDefaultPos: true,
      reattachTargets: [
        { el: leftBar, side: 'left' },
        { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
      ],
      onIndependent: function(){
        if (stack.parentNode !== document.body) document.body.appendChild(stack);
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        // Larry, July 31 2026: "moved the phase tray up in the
        // drawer but it snapped back where it was" (tool stack has
        // the identical mechanism, same bug). Dropping BACK onto its
        // own home slot used to always wipe the claim and fall back
        // to the generic centered spot -- meaning any reposition
        // attempt within the home drawer itself was silently undone
        // on release, since "home" and "just moved a few px" looked
        // identical to this code. Home is no longer special-cased:
        // every drop (home slot or not) claims its slot and saves
        // exactly where it landed, so dragging within the home
        // drawer now just repositions it there, same as anywhere
        // else. The double-click gear reset (resetToolStack) remains
        // the one deliberate way back to the true default spot.
        setRidingSlot(TOOL_STACK_KEY, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  // Larry, July 31 2026: "Is there a way to change the name of a
  // button?" A button's id (item.id) still drives what it actually
  // does -- only the printed label is ever swapped, saved separately
  // per id so it survives reloads and never touches the id itself
  // (reordering, drag/dock claims, everything else keyed off item.id
  // keeps working exactly as before, whatever the button currently
  // reads). Same idea one step later gets its own key prefix
  // (TRAY_LABEL_PREFIX) for renaming a whole tray's grip.
  var TOOL_LABEL_PREFIX = 't2t_toolLabel_';
  var TRAY_LABEL_PREFIX = 't2t_trayLabel_';
  function loadCustomLabel(prefix, id, fallback){
    try { return localStorage.getItem(prefix + id) || fallback; } catch(e){ return fallback; }
  }
  function saveCustomLabel(prefix, id, label){
    try { localStorage.setItem(prefix + id, label); } catch(e){}
  }

  function buildTools(leftBar){
    var wrap = document.createElement('div');
    wrap.id = 'sz-tools';

    var stack = document.createElement('div');
    stack.id = 'sz-tool-stack';
    stack.className = 'sz-drawer-drag-exclude';

    var grip = document.createElement('div');
    grip.className = 'sz-tool-stack-grip';
    grip.title = 'Drag to move the whole tool stack -- double-click to rename it';
    grip.textContent = '\u22EE\u22EE ' + loadCustomLabel(TRAY_LABEL_PREFIX, 'tools', 'Tools');
    grip.addEventListener('dblclick', function(){
      var current = loadCustomLabel(TRAY_LABEL_PREFIX, 'tools', 'Tools');
      openRenameCard('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, 'tools', newName);
        grip.textContent = '\u22EE\u22EE ' + newName;
      });
    });
    stack.appendChild(grip);

    loadToolOrder().forEach(function(item){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sz-tool-btn';
      btn.dataset.toolId = item.id;
      var faceSpan = document.createElement('span');
      faceSpan.textContent = loadCustomLabel(TOOL_LABEL_PREFIX, item.id, item.label);
      var face = document.createElement('div');
      face.className = 'sz-tool-face';
      face.appendChild(faceSpan);
      btn.appendChild(face);
      btn.title = 'Double-click to rename';
      // Double-click renames instead of firing the button's own
      // action -- makeTapCounter (already used for the drawer's
      // single/double/triple-tap toggle) tells a real double-click
      // apart from a plain single tap on the SAME 'click' event a
      // real drag never fires anyway (see wireToolButtonDrag's own
      // comment), so this never fights with dragging the button.
      makeTapCounter(btn, function(n){
        if (n >= 2) {
          var current = loadCustomLabel(TOOL_LABEL_PREFIX, item.id, item.label);
          openRenameCard('Rename this button', current, function(newLabel){
            saveCustomLabel(TOOL_LABEL_PREFIX, item.id, newLabel);
            faceSpan.textContent = newLabel;
          });
        } else {
          item.action();
        }
      });
      stack.appendChild(btn);
      wireToolButtonDrag(btn, leftBar, stack);
    });

    wrap.appendChild(stack);
    wireToolStackDrag(stack, leftBar);

    return wrap;
  }

  /* ---------- Phase tray -- Larry, July 29 2026: "phase buttons like
     the tools tray but in the right top drawer." First pass was a
     static stack (click-only); same-session follow-up: "Phase buttons
     are on a tray like tools. Every button is moveable and
     rearrangeable just like tools. Tray can move out of drawer." This
     is now full parity with buildTools()/wireToolButtonDrag/
     wireToolStackDrag below -- same reorder-by-crossing, same
     drag-out-onto-desk, same dock-to-either-drawer, just mirrored:
     this tray's HOME is the right drawer (mode 1) instead of the left
     rail, so a button or the whole tray dropped back on the right
     drawer's own slot 1 resets home, and the left rail becomes the
     "foreign" dock instead of the right drawer. Colors are set by
     data-phase-id via plain attribute selectors (not scoped to
     #sz-phase-stack) so a button dragged out independently -- and
     reparented straight onto document.body by refreshRidersForSlot --
     keeps its phase color instead of losing it the moment it leaves
     the stack. */
  var PHASE_ITEMS = [
    { id:'intro',   label:'🚪 Introduction', num:'0100' },
    { id:'dream',   label:'🌈 Dream',        num:'1000' },
    { id:'believe', label:'🔬 Believe',      num:'2000' },
    { id:'dare',    label:'⚖️ Dare',         num:'3000' },
    { id:'journey', label:'🚀 Journey',      num:'4000' }
  ];

  var PHASE_ORDER_KEY = 't2t_phaseOrder';
  var PHASE_STACK_KEY = 't2t_phaseStackPos';
  var _phaseStackRec = null;
  var _phaseButtonRecs = [];

  function loadPhaseOrder(){
    try {
      var saved = JSON.parse(localStorage.getItem(PHASE_ORDER_KEY));
      if (Array.isArray(saved) && saved.length === PHASE_ITEMS.length) {
        var byId = {};
        PHASE_ITEMS.forEach(function(it){ byId[it.id] = it; });
        var ordered = saved.map(function(id){ return byId[id]; }).filter(Boolean);
        if (ordered.length === PHASE_ITEMS.length) return ordered;
      }
    } catch(e){}
    return PHASE_ITEMS.slice();
  }

  function savePhaseOrderFromDom(stackEl){
    var ids = [];
    stackEl.querySelectorAll(':scope > .sz-tool-btn').forEach(function(btn){
      if (btn.dataset.phaseId) ids.push(btn.dataset.phaseId);
    });
    if (ids.length === PHASE_ITEMS.length) {
      try { localStorage.setItem(PHASE_ORDER_KEY, JSON.stringify(ids)); } catch(e){}
    }
  }

  // Each phase button: dropped back on its own stack = reorder
  // (wireToolReorder, reused as-is -- it's generic over any
  // .sz-tool-btn siblings within the stack passed to it). Dropped on
  // the right drawer (this tray's home bar) or the left rail = rides
  // that spot independently, exactly like a tool button riding either
  // drawer.
  function wirePhaseButtonDrag(btn, rightBar, stackEl){
    var storeKey = 't2t_phaseBtnPos_' + btn.dataset.phaseId;
    var rec = registerClaimable(btn, storeKey, 16);
    _phaseButtonRecs.push(rec);
    makeDraggable(btn, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      onDragMove: wireToolReorder(btn, stackEl),
      reattachTargets: [
        { el: stackEl, side: 'stack' },
        { el: rightBar, side: 'right' },
        { get el(){ return document.getElementById('sz-navbar'); }, side: 'left' }
      ],
      onIndependent: function(){
        if (btn.parentNode !== document.body) document.body.appendChild(btn);
      },
      onReattach: function(side, barEl){
        if (side === 'stack') {
          setRidingSlot(storeKey, null);
          try { localStorage.removeItem(storeKey); } catch(e){}
          btn.style.position = '';
          btn.style.left = ''; btn.style.top = '';
          btn.style.right = ''; btn.style.bottom = ''; btn.style.margin = '';
          btn.style.display = '';
          savePhaseOrderFromDom(stackEl);
          return;
        }
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  // Whole tray: grip (or gaps between buttons) drags all five as a
  // unit. Home is the right drawer's slot 1 -- dropped there, it
  // resets to normal in-flow content; dropped anywhere else (left
  // rail, or the right drawer's other modes), it rides that spot.
  function wirePhaseStackDrag(stack, rightBar){
    var rec = registerClaimable(stack, PHASE_STACK_KEY, 16);
    _phaseStackRec = rec;
    makeDraggable(stack, PHASE_STACK_KEY, '.sz-tool-btn', 40, 40, {
      skipDefaultPos: true,
      reattachTargets: [
        { el: rightBar, side: 'right' },
        { get el(){ return document.getElementById('sz-navbar'); }, side: 'left' }
      ],
      onIndependent: function(){
        if (stack.parentNode !== document.body) document.body.appendChild(stack);
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        // Larry, July 31 2026: "moved the phase tray up in the
        // drawer but it snapped back where it was." Same fix as the
        // tool stack right above -- home is no longer special-cased
        // to always reset; every drop claims its slot and saves
        // exactly where it landed, so repositioning within the home
        // drawer actually sticks now.
        setRidingSlot(PHASE_STACK_KEY, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  function buildPhaseTray(rightBar){
    var wrap = document.createElement('div');
    wrap.id = 'sz-phases';

    var stack = document.createElement('div');
    stack.id = 'sz-phase-stack';
    stack.className = 'sz-drawer-drag-exclude';

    var grip = document.createElement('div');
    grip.className = 'sz-tool-stack-grip';
    grip.title = 'Drag to move the whole phase tray -- double-click to rename it';
    grip.textContent = '\u22EE\u22EE ' + loadCustomLabel(TRAY_LABEL_PREFIX, 'phases', 'Phases');
    grip.addEventListener('dblclick', function(){
      var current = loadCustomLabel(TRAY_LABEL_PREFIX, 'phases', 'Phases');
      openRenameCard('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, 'phases', newName);
        grip.textContent = '\u22EE\u22EE ' + newName;
      });
    });
    stack.appendChild(grip);

    loadPhaseOrder().forEach(function(item){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sz-tool-btn';
      btn.dataset.phaseId = item.id;
      btn.innerHTML = '<div class="sz-tool-face"><span>' + item.label + '</span></div>';
      btn.addEventListener('click', function(){
        if (window.T2T) window.T2T.navToPageNum(item.num);
      });
      stack.appendChild(btn);
      wirePhaseButtonDrag(btn, rightBar, stack);
    });

    wrap.appendChild(stack);
    wirePhaseStackDrag(stack, rightBar);

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
    // Larry, July 29 2026: double-click no longer changes the channel to
    // the full s-journal screen -- it opens the same kind of popup
    // overlay card idea-capture.js uses (see notebook-open.js), sitting
    // on top of whatever's already showing, no nav() at all. The icon
    // itself hides for as long as that overlay is open (see SZNotebook
    // below) and comes back once it closes.
    nb.addEventListener('dblclick', function(){
      if (window.SZNotebook) window.SZNotebook.hide();
      if (window.NotebookOpen) {
        window.NotebookOpen.open({
          onClosed: function(){ if (window.SZNotebook) window.SZNotebook.show(); }
        });
      } else if (window.SZNotebook) {
        // notebook-open.js didn't load -- don't strand the icon hidden.
        window.SZNotebook.show();
      }
    });
    return nb;
  }

  /* ---------- The gear -- stays inside the rail (only the notebook
     was asked to detach), just picks up the shared card shadow. -- */

  function buildGear(){
    var gear = document.createElement('button');
    gear.id = 'sz-gear';
    gear.type = 'button';
    gear.title = 'Click for text size, double-click to reset tool stack/gear/menu positions';
    gear.textContent = '⚙️';
    // Larry, July 31 2026 (bug report): "gear jumps back to a fixed
    // position... tools jumped back into the drawer on their own...
    // EVERY OBJECT should move in or out of a drawer and stay where
    // it is positioned!" Root cause: this reset was one plain click,
    // and a drag attempt on gear that doesn't clear the 3px movement
    // threshold still fires a real click on release -- an ordinary
    // mis-timed drag on gear was silently wiping every tool button's
    // saved position along with gear's own, snapping everything back
    // to its hardcoded home spot (bottom of the left rail). Requiring
    // a double-click instead -- same deliberate-gesture family as the
    // rename cards above -- means a stray single click/near-drag can
    // no longer nuke everyone's careful placement by accident.
    //
    // Aug 3 2026 -- Larry, on the laptop: "the print is too small...
    // someone with poor eyesight needs to adjust." The gear was always
    // meant to be the reader-facing settings icon (see the original
    // May 2026 Gear/Asterisk design split); a single tap now opens the
    // text-size picker (screen-fit.js owns the actual scale math) while
    // a real double-click still resets positions, same makeTapCounter
    // "count, then resolve after a gap" pattern already used for the
    // Hidden Mickey triple-tap and the mode-panel drawers -- so a
    // deliberate double-click is never mistaken for two single taps.
    makeTapCounter(gear, function(n){
      if (n >= 2) {
        resetToolStack();
      } else {
        openTextSizePicker();
      }
    }, 320);
    return gear;
  }

  /* ---------- Text-size picker -- Aug 3 2026. Same overlay+card
     pattern as the drawer color picker above (buildDrawerColorOverlay
     et al), just offering screen-fit.js's four boost levels instead of
     swatches. Lazily built on first open, same as the color picker. ---------- */

  function buildTextSizeOverlay(){
    var overlay = document.createElement('div');
    overlay.id = 'sz-text-overlay';

    var card = document.createElement('div');
    card.id = 'sz-text-card';
    card.innerHTML = ''
      + '<div class="sz-text-title">Text size</div>'
      + '<div class="sz-text-sub">Bigger text for easier reading. Stays until you change it.</div>'
      + '<div id="sz-text-options"></div>'
      + '<button id="sz-text-close" type="button">✕</button>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeTextSizePicker(); });
    card.querySelector('#sz-text-close').addEventListener('click', closeTextSizePicker);

    return overlay;
  }

  function openTextSizePicker(){
    if (!window.FGTextSize) return; // screen-fit.js not loaded on this file
    var overlay = document.getElementById('sz-text-overlay') || buildTextSizeOverlay();
    var row = overlay.querySelector('#sz-text-options');
    row.innerHTML = '';
    var current = window.FGTextSize.getIndex();
    window.FGTextSize.levels.forEach(function(label, i){
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'sz-text-option' + (i === current ? ' sz-text-active' : '');
      opt.textContent = label;
      opt.style.fontSize = (13 + i * 3) + 'px';
      opt.addEventListener('click', function(){
        window.FGTextSize.setIndex(i);
        showZeroToast('Text size: ' + label);
        closeTextSizePicker();
      });
      row.appendChild(opt);
    });
    overlay.classList.add('active');
  }

  function closeTextSizePicker(){
    var overlay = document.getElementById('sz-text-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // Exposed so full-screen tools (Storyboard, Session, Briefing Board,
  // Gems) that hide the desk's own gear can still open the same picker
  // from their own in-tool settings/gear menu. Aug 3 2026.
  window.openFGTextSizePicker = openTextSizePicker;

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

  /* ---------- Custom tray slot -- Larry, July 31 2026: "Can traveler
     open a new tray (cluster) of objects? ... How might that happen?"
     then, after talking through drag-to-combine vs. an explicit new-
     tray gesture vs. this: "yes" to building the still-empty junk-
     drawer slot (mode 2, both drawers) as the birthplace. Nothing new
     needed for an object to JOIN this tray -- dropping anything onto
     a drawer while it's showing slot 2 already claims side+'-2'
     through the exact same riding-slot system every other object
     uses (see wireDetachableRailButton/wireToolButtonDrag's own
     reattachTargets). What's new here is purely the tray's own
     identity once it has members: a grip that appears the moment the
     slot holds its first one, drags the whole cluster together via a
     shared, persisted group offset instead of touching any member's
     own saved spot, and the same double-click rename card Tools/
     Phases already use -- keyed by side, so left and right can each
     become their own independently-named tray. ---------- */
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
  function traySlotMemberCount(side){
    var slot = slotKey(side, '2');
    var n = 0;
    _claimRegistry.forEach(function(rec){
      if (isRidingDrawer(rec.storeKey) && getRidingSlot(rec.storeKey) === slot) n++;
    });
    return n;
  }

  function wireTrayGripDrag(grip, side){
    var dragging = false, moved = false, startX = 0, startY = 0, startOffset = { x: 0, y: 0 };
    function pointOf(e){ return e.touches ? e.touches[0] : e; }
    function onDown(e){
      var p = pointOf(e);
      window.T2TFront.bump(grip); // picking it up brings it to the front of everything else -- see makeDraggable's own onDown for why this matters once a member is sitting on top of it
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
      if (barEl) refreshRidersForSlot(side, '2', barEl);
    }
    function onUp(){ dragging = false; }
    grip.addEventListener('mousedown', onDown);
    grip.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function buildCustomTraySlot(side){
    var panel = document.createElement('div');
    panel.className = 'sz-mode-panel sz-mode-placeholder sz-custom-tray';

    var grip = document.createElement('div');
    grip.className = 'sz-tool-stack-grip sz-custom-tray-grip';
    grip.dataset.side = side;
    grip.title = 'Drag to move the whole tray -- double-click to rename it';
    grip.textContent = '\u22EE\u22EE ' + loadCustomLabel(TRAY_LABEL_PREFIX, side + '-tray', 'New Tray');
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
      openRenameCard('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, side + '-tray', newName);
        grip.textContent = '\u22EE\u22EE ' + newName;
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

  // The monkey should "drag out of the drawer and stay there if
  // desired" (Larry, July 27 2026), and stick to whichever slot it's
  // dropped into rather than following every mode switch -- same
  // slot-claim machinery as the nameplate/notebook/tool buttons.
  // Left and right drawers each build their own independent GIF
  // (buildSurprisePanel is called once per drawer), so each gets its
  // own storage key and can be claimed to a different slot from the
  // other.
  function wireSurpriseGifDrag(img, storeKey, ownBar, ownSide, ownPanel){
    var rec = registerClaimable(img, storeKey, 60);
    var otherSide = ownSide === 'left' ? 'right' : 'left';
    var otherId = ownSide === 'left' ? 'sz-drawer-r' : 'sz-navbar';
    makeDraggable(img, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      // Drop the monkey onto the open Notebook card and it goes INTO the
      // entry (Larry's own original example for this whole feature)
      // instead of falling through onto the desktop -- see makeDraggable's
      // dropTargets comment above for why this has to be checked before
      // the ordinary reattach/independent-drop logic below runs.
      dropTargets: [
        { get el(){
            return (window.NotebookOpen && window.NotebookOpen.isOpen())
              ? document.querySelector('#nb-layer .nb-pcard') : null;
          },
          onDrop: function(){
            return !!(window.NotebookOpen && window.NotebookOpen.insertImageUrl &&
              window.NotebookOpen.insertImageUrl(SURPRISE_GIF_URL, 'A monkey playing cymbals'));
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
      // its bar's own collapsed state (see refreshRidersForSlot's
      // `display = collapsed ? 'none' : ''`), so both bugs disappear
      // by using the proven mechanism instead of a bespoke one. The
      // hit-test also goes back to the plain, generous floor-to-
      // ceiling target every other object uses (restoreHomeParent and
      // the old special-case branch are no longer called here, so
      // that helper is now unused by the monkey but left in place --
      // still used elsewhere in this file).
      reattachTargets: [
        { el: ownBar, side: ownSide },
        { get el(){ return document.getElementById(otherId); }, side: otherSide }
      ],
      onIndependent: function(){
        if (img.parentNode !== document.body) document.body.appendChild(img);
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  function buildSurprisePanel(bar, side){
    var wrap = document.createElement('div');
    wrap.className = 'sz-mode-panel sz-mode-placeholder sz-surprise-panel';
    wrap.style.position = 'relative';
    var img = document.createElement('img');
    img.className = 'sz-surprise-gif sz-drawer-drag-exclude';
    img.src = SURPRISE_GIF_URL;
    img.alt = 'A monkey playing cymbals';
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
    wireSurpriseGifDrag(img, 't2t_surpriseGif_' + side, bar, side, wrap);
    return { el: wrap };
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

  // Larry, July 29 2026: "Nothing is in a drawer unless it is
  // completely in it. Partially out of the drawer is OUT of the
  // drawer." First pass required the dragged object's WHOLE rect to
  // fit inside the target's rect -- correct for a corner-clip (a
  // sliver of overlap no longer counts as docked), but too strict as
  // the actual drop test: a 150px tool button has to land within a
  // ~50px-wide margin of a 200px drawer to register at all, and a
  // 180px nameplate only has ~20px of room to work with -- Larry, July
  // 29 2026 (same day, later): "Tried to move Field Guide to drawer on
  // the right side but it would not go there." Fixed by testing the
  // dragged object's CENTER POINT against the target's rect instead of
  // its whole box -- still refuses a corner-clip (the center has to be
  // genuinely over the drawer, not just touching it), but gives a drop
  // the same forgiving hit-area every other drag target already gets.
  // Once something IS riding a drawer, refreshRidersForSlot always
  // places it at an exact offset inside the drawer's own bounds, so it
  // never sits half-in/half-out while docked either way -- this only
  // changes how generous the initial drop itself is.
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
      // the tool-group reordering (below) to swap sibling order as the
      // dragged button crosses another one, without needing its own
      // separate mouse-tracking machinery.
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
      // same way claiming a drawer slot does (see refreshRidersForSlot),
      // otherwise it silently vanishes the instant its old panel's
      // mode/side stops being the active one, even though it's not
      // riding anything anymore.
      if (opts && opts.onIndependent) opts.onIndependent();
    }

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  var COLLAPSE_KEY = 't2t-navbar-collapsed';
  var NAVBAR_EXCLUDE = 'button, a, input, textarea, select, [role="button"], .sz-drawer-drag-exclude';
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
     under similar names.

     Rebuilt per-SLOT rather than per-side, same day, after Larry
     caught the bug: "Nametag and Notes were placed in drawer 1 but
     now appear in drawer 3? Object stay in whichever drawer they are
     placed!" The first pass only tracked which SIDE an object rode,
     so it followed the bar around regardless of which of the 3
     tap-slots was showing -- looked like it "moved" the moment you
     switched modes, when really it just never had a specific slot to
     begin with. A slot key is now "side-mode", e.g. "left-3", and an
     object is only shown while ITS slot is the one currently active
     on that side; any other mode on the same side hides it, same as
     the mode panels' own content already does. ---------- */

  function isRidingDrawer(storeKey){
    try { return !localStorage.getItem(storeKey); } catch(e){ return true; }
  }
  function slotKey(side, mode){ return side + '-' + (mode || '1'); }
  function claimSlotStoreKey(storeKey){ return 't2t_claimSlot_' + storeKey; }
  function getRidingSlot(storeKey){
    try { return localStorage.getItem(claimSlotStoreKey(storeKey)); } catch(e){ return null; }
  }
  function setRidingSlot(storeKey, slot){
    try {
      if (slot) {
        localStorage.setItem(claimSlotStoreKey(storeKey), slot);
      } else {
        localStorage.removeItem(claimSlotStoreKey(storeKey));
        // Un-claiming (object went home, or independent) -- drop its
        // saved in-slot offset too, so a future claim starts fresh
        // instead of reusing a position left over from a totally
        // different drop.
        localStorage.removeItem(claimOffsetStoreKey(storeKey));
      }
    } catch(e){}
  }

  // Larry, July 31 2026 (bug report): "drawer contents seem to shift
  // to the top... found gear in the stack of stuff that had shifted
  // to the top of the left drawer." Root cause: WHICH slot an object
  // rides was always persisted (claimSlotStoreKey above), but WHERE
  // inside that slot it actually landed never was -- offsetX lived
  // only on the in-memory rec (reset to a generic 12px on every fresh
  // page load), and offsetY didn't exist at all, so refreshRidersForSlot
  // fell back to a small hardcoded defaultTop for every single object
  // on every reload, regardless of where it had actually been dropped.
  // Anything sharing a similar small default piled up in the same
  // top-left corner of whichever bar it rode. Now the exact (x, y)
  // offset from the bar's own top-left corner is saved right alongside
  // the slot claim and restored the same way, so a reload puts every
  // riding object back exactly where it was left, not just in the
  // right slot.
  function claimOffsetStoreKey(storeKey){ return 't2t_claimOffset_' + storeKey; }
  function saveRidingOffset(storeKey, x, y){
    try { localStorage.setItem(claimOffsetStoreKey(storeKey), JSON.stringify({ x: x, y: y })); }
    catch(e){}
  }
  function loadRidingOffset(storeKey){
    try {
      var v = JSON.parse(localStorage.getItem(claimOffsetStoreKey(storeKey)));
      if (v && typeof v.x === 'number' && typeof v.y === 'number') return v;
    } catch(e){}
    return null;
  }

  // rec: { el, storeKey, offsetX, offsetY, defaultTop }. offsetX/Y
  // start from any saved offset from a previous drop (see above),
  // falling back to the original generic spot only the very first
  // time an object is ever claimed by a drawer.
  var _claimRegistry = [];
  function registerClaimable(el, storeKey, defaultTop){
    // homeParent/homeNext -- where this object natively lives in the
    // DOM (nameplate/notebook are already top-level body children, so
    // this is a no-op for them; the tool buttons and the surprise GIF
    // live nested inside a mode-panel div, which is what makes
    // reparenting below actually matter for them).
    var savedOffset = loadRidingOffset(storeKey);
    var rec = { el: el, storeKey: storeKey,
                offsetX: savedOffset ? savedOffset.x : 12,
                offsetY: savedOffset ? savedOffset.y : null,
                defaultTop: defaultTop,
                homeParent: el.parentNode, homeNext: el.nextSibling };
    _claimRegistry.push(rec);
    return rec;
  }
  function captureRidingOffset(rec, barEl, groupOffset){
    // Larry, July 31 2026 (bug report): "I tried to move one up under
    // the handle but it jumped to a different position... so much
    // space between items that they do not look like they are
    // connected." Root cause: a custom tray's render math adds the
    // whole group's shared offset on TOP of each member's own saved
    // offset (see refreshRidersForSlot) -- moving the grip shifts
    // everyone at once without touching any member's individual spot.
    // But capturing a member's offset never subtracted that same
    // group offset back out first, so the moment the group had ever
    // been moved even once, every fresh drop of an individual member
    // saved a number that already secretly included the group shift
    // -- then the very next render added the group shift AGAIN on top
    // of that, throwing the member somewhere else entirely. Callers
    // now pass the tray's current group offset when there is one, so
    // what's saved is always the member's TRUE spot relative to the
    // group's own zero point, matching what gets added back at render
    // time exactly once, not twice.
    var barRect = barEl.getBoundingClientRect();
    var elRect = rec.el.getBoundingClientRect();
    var gx = (groupOffset && typeof groupOffset.x === 'number') ? groupOffset.x : 0;
    var gy = (groupOffset && typeof groupOffset.y === 'number') ? groupOffset.y : 0;
    rec.offsetX = elRect.left - barRect.left - gx;
    rec.offsetY = elRect.top - barRect.top - gy;
    saveRidingOffset(rec.storeKey, rec.offsetX, rec.offsetY);
  }
  // An object that's home again needs to go back to its ORIGINAL
  // spot in the DOM, not just have its inline styles cleared -- an
  // object still parked inside a mode-panel div while riding some
  // other slot would otherwise never actually escape that panel's
  // own display:none once a different mode is showing (see
  // refreshRidersForSlot's own reparent-to-body below, which this
  // undoes on the way back home).
  function restoreHomeParent(rec){
    // appendChild (not insertBefore rec.homeNext) deliberately -- if
    // ANOTHER sibling that used to be the "next" reference has since
    // been reparented out to document.body itself (a realistic case
    // when several tool buttons have all been dragged around),
    // insertBefore would throw trying to reference a node that's no
    // longer actually a child of homeParent. Falling back to "append
    // at the end" only costs perfect original ordering in that edge
    // case, never correctness. resetToolStack() below restores all 6
    // in their original idx order anyway, which re-sorts them
    // correctly regardless.
    if (rec.el.parentNode !== rec.homeParent) {
      rec.homeParent.appendChild(rec.el);
    }
  }

  // Called by whichever drawer just moved, docked, toggled, OR
  // changed mode -- repositions + shows every registered object
  // CURRENTLY riding THIS EXACT (side, mode) slot; hides anything
  // riding a DIFFERENT slot on the same side (it's "in another
  // drawer" right now); ignores anything riding the other side
  // entirely, leaving its visibility exactly as that side last set it.
  function refreshRidersForSlot(side, mode, barEl){
    var slot = slotKey(side, mode);
    var barRect = barEl.getBoundingClientRect();
    var collapsed = barEl.classList.contains('sz-collapsed');
    // Larry, July 31 2026: "Can traveler open a new tray?" -- mode 2
    // is the one slot that can become a traveler-made tray (see
    // buildCustomTraySlot). Its members drag together as a group via
    // one shared, persisted offset on top of each member's own --
    // moving the grip moves everyone without touching any individual
    // member's saved spot.
    var groupOffset = (mode === '2') ? loadTrayGroupOffset(side) : null;
    _claimRegistry.forEach(function(rec){
      if (!isRidingDrawer(rec.storeKey)) return;
      var ridingSlot = getRidingSlot(rec.storeKey);
      if (!ridingSlot) return;
      var ridingSide = ridingSlot.split('-')[0];
      if (ridingSide !== side) return; // belongs to the other drawer, not this refresh's concern
      if (ridingSlot !== slot) {
        rec.el.style.display = 'none'; // a different slot on this same side is showing right now
        return;
      }
      // Escape whatever mode-panel div it natively lives in (if any)
      // -- otherwise a display:none!important ancestor from a
      // now-inactive mode/side would hide it regardless of its own
      // position:fixed. Top-level objects (nameplate, notebook) are
      // already document.body children, so this is a no-op for them.
      if (rec.el.parentNode !== document.body) document.body.appendChild(rec.el);
      rec.el.style.position = 'fixed';
      var candLeft = barRect.left + rec.offsetX + (groupOffset ? groupOffset.x : 0);
      // Prefer a saved Y offset (relative to this bar's own top edge)
      // over the generic defaultTop fallback -- see the offset-
      // persistence note above captureRidingOffset. Falls through to
      // the old "only if nothing's set yet" default for the rare case
      // an object is showing here without ever having been captured
      // (shouldn't happen in practice once every drop path calls
      // captureRidingOffset, but safe either way).
      var candTop = (rec.offsetY != null)
        ? (barRect.top + rec.offsetY + (groupOffset ? groupOffset.y : 0))
        : null;
      // Larry, July 31 2026 (bug report): "it jumped above what I can
      // see... now I cannot reach the tray to move it." A fast/far
      // drag (especially the whole-tray group drag) could push a
      // riding object's computed position past the edge of the
      // screen entirely, with nothing to stop it and no way to grab
      // an invisible element to drag it back. Every riding object's
      // final on-screen spot is now clamped to stay fully inside the
      // current viewport -- it can still ride anywhere within that,
      // but never somewhere the traveler can't see or click it.
      var elW = rec.el.offsetWidth || 40;
      var elH = rec.el.offsetHeight || 40;
      var maxLeft = Math.max(0, window.innerWidth - elW);
      var maxTop = Math.max(0, window.innerHeight - elH);
      candLeft = Math.min(Math.max(candLeft, 0), maxLeft);
      if (candTop != null) candTop = Math.min(Math.max(candTop, 0), maxTop);
      rec.el.style.left = candLeft + 'px';
      if (candTop != null) {
        rec.el.style.top = candTop + 'px';
      } else if (!rec.el.style.top) {
        rec.el.style.top = rec.defaultTop + 'px';
      }
      rec.el.style.right = 'auto';
      rec.el.style.bottom = 'auto';
      rec.el.style.margin = '0';
      rec.el.style.display = collapsed ? 'none' : '';
    });
    // Larry, July 31 2026 (bug report): "I cannot grab the Library
    // tray and move it like I can the Tools tray." Root cause: every
    // OTHER riding object (tool buttons, gear, nameplate...) escapes
    // to document.body the moment it's claimed by a drawer (see the
    // reparent a few lines up), so it always paints in the same flat
    // arena as everything else on the desk. The tray's own grip never
    // did that -- it stayed nested inside the drawer's own markup,
    // which caps its paint order at the drawer's z-index (9998) no
    // matter what z-index the grip itself carries. Any member sitting
    // in the tray (a plain .sz-tool-btn, z-index 9999, living at
    // document.body like every independent object) always painted
    // above it, silently swallowing clicks meant for the grip the
    // moment the tray held anything at all. The grip now escapes to
    // document.body too, positioned just above its members and kept
    // there with a z-index above the members' own baseline -- same
    // fix shape as every other "trapped behind its own container"
    // bug already caught in this file, just for a new object.
    var grip = document.querySelector('.sz-custom-tray-grip[data-side="' + side + '"]');
    if (grip) {
      if (mode === '2') {
        if (grip.parentNode !== document.body) document.body.appendChild(grip);
        grip.style.position = 'fixed';
        var goff = loadTrayGroupOffset(side);
        var gLeft = barRect.left + 15 + goff.x;
        var gTop = barRect.top + 6 + goff.y;
        var gW = grip.offsetWidth || 150, gH = grip.offsetHeight || 20;
        gLeft = Math.min(Math.max(gLeft, 0), Math.max(0, window.innerWidth - gW));
        gTop = Math.min(Math.max(gTop, 0), Math.max(0, window.innerHeight - gH));
        grip.style.left = gLeft + 'px';
        grip.style.top = gTop + 'px';
        grip.style.right = 'auto';
        grip.style.bottom = 'auto';
        grip.style.margin = '0';
        if (!grip.style.zIndex) grip.style.zIndex = '10000'; // above the 9999 every plain tool button starts at; onDown bumps it further still on pickup
        grip.style.display = collapsed ? 'none' : '';
      } else if (grip.parentNode === document.body) {
        // A different page is showing on this side now -- hide, same
        // as any other rider claimed to a slot that isn't active.
        grip.style.display = 'none';
      }
    }
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
      // Bails if the notebook has its own independent spot (fully
      // claimed) OR is riding a specific drawer SLOT (July 27 2026
      // slot-claim fix, below) -- either way it's no longer this
      // "always follows the tray, every mode" native-default path.
      if (!notebook || notebookIsClaimed() || getRidingSlot(NOTEBOOK_KEY)) return;
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
      refreshRidersForSlot('left', bar.dataset.mode || '1', bar);
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
      refreshRidersForSlot('left', bar.dataset.mode || '1', bar); // ...and any other rider claimed by this drawer's active slot
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
    if (getRidingSlot(NOTEBOOK_KEY)) return; // slot system now owns visibility
    var hideWithDrawer = bar.classList.contains('sz-collapsed') && !notebookIsClaimed();
    notebook.style.display = hideWithDrawer ? 'none' : '';
  }

  /* ---------- Notebook overlay hide/show hook -- July 29 2026. The
     notebook's double-click now opens notebook-open.js's popup card
     instead of nav()'ing away (see buildNotebook above); while that
     overlay is open the floating icon has to disappear (nothing to
     double-click behind a dimmed overlay), then reappear exactly where
     it already was once the overlay closes -- same spot, same claimed/
     riding state, same drag memory.

     Reworked same day: the first version routed show() back through
     updateNotebookVisibility + refreshRidersForSlot (the rail's own
     recompute), on the theory that "closing the overlay" should behave
     exactly like every other visibility change already does. Larry hit
     a real bug from that: close the Notebook and the icon was gone
     entirely -- not on the desktop, not riding either drawer. That
     recompute has an early-return path (updateNotebookVisibility bails
     out silently whenever the icon is riding a claimed slot, trusting
     refreshRidersForSlot to be the one that actually sets display --
     and there are edge cases, e.g. right after a drawer mode/side
     change, where neither function ends up touching display at all) --
     exactly the kind of edge case that leaves it stuck on the
     'none' hide() set, with no recompute path left to undo it.

     Simplest fix, and the only one that actually guarantees "reappear
     exactly where it was left": don't recompute anything. Just
     remember the icon's own exact inline display value the instant
     before hide() touches it, then restore that exact value on show().
     No claim/slot/dock logic involved at all -- hide/show can never
     drift from whatever state was already correct a moment earlier. ---------- */
  /* ---------- Shared drag/dock primitives, exposed for other files.
     Larry, July 30 2026: wanted the new Shortcuts rail (bookmarks.js)
     to be "moveable like phases... could be put into a drawer if
     wanted," same drag/dock/collapse parity every other floating
     object on the desk already has. Rather than duplicate this
     machinery in bookmarks.js (which would need its own separate
     _claimRegistry, invisible to THIS file's own dock/mode/collapse
     handlers -- exactly the "placed in drawer 1, appears in drawer 3"
     class of bug Larry already hit once with the nameplate/notebook),
     bookmarks.js registers into this SAME shared registry via
     window.SZDrag, so every existing dock/mode/collapse trigger in
     this file already knows how to show, hide, and reposition it too. ---------- */
  window.SZDrag = {
    registerClaimable: registerClaimable,
    makeDraggable: makeDraggable,
    slotKey: slotKey,
    setRidingSlot: setRidingSlot,
    getRidingSlot: getRidingSlot,
    isRidingDrawer: isRidingDrawer,
    captureRidingOffset: captureRidingOffset,
    refreshRidersForSlot: refreshRidersForSlot,
    restoreHomeParent: restoreHomeParent,
    getNavbar: function(){ return document.getElementById('sz-navbar'); },
    getDrawerR: function(){ return document.getElementById('sz-drawer-r'); }
  };

  window.SZNotebook = {
    hide: function(){
      var nb = document.getElementById('sz-notebook');
      if (!nb) return;
      if (nb.style.display !== 'none') {
        nb.dataset.szPrevDisplay = nb.style.display; // '' (visible) or an already-hidden value
        nb.style.display = 'none';
      }
    },
    show: function(){
      var nb = document.getElementById('sz-notebook');
      if (!nb) return;
      nb.style.display = (nb.dataset.szPrevDisplay !== undefined) ? nb.dataset.szPrevDisplay : '';
      delete nb.dataset.szPrevDisplay;
    }
  };

  /* ---------- Desk close/reopen -- Larry, July 31 2026: "put an X on
     the tv screen to close it into the Field Guide Button. With Field
     Guide closed, Phases and Shortcuts disappear and reappear when it
     is opened." One body class (t2t-desk-closed) is the whole switch:
     style.css hides a NARROW list -- the TV frame/vignette/widget,
     the right/Phase drawer, the Shortcuts rail, and any phase button
     riding loose. NARROWED to this July 31 2026, later same day,
     after two broader passes -- Larry: "Top two drawers NEVER lose
     what is put in them!!!! ... Closing the Field Guide ONLY makes
     SHORTCUTS and PHASES disappear as the ONLY apply to the Field
     Guide!" The nav rail, nameplate, notebook, gear, menu, and every
     TOOL button are permanent desk furniture in Larry's model, not
     part of "the Field Guide" -- they never hide, open or closed.

     Reopening: since the tool tray itself never hides anymore, the
     real Field Guide tool button (always standing in the tray) IS the
     reopen handle -- see its action in TOOL_ITEMS_DEFAULT above. The
     first pass's separate floating #sz-desk-toggle element (and the
     Sign-In leak / confusing-pulse bugs that came with it) is retired.

     NOT persisted across a reload, unlike every other desk preference
     (drawer colors, TV frame color, drawer modes) -- Larry, same day,
     earlier follow-up: "Where are the drawers on desktop? They need
     to be there!" He'd closed the desk while testing the X, and
     because the closed state used to survive a refresh via
     localStorage, things stayed hidden on every later visit with no
     obvious reason why. An in-memory flag means "closed" only ever
     lasts for as long as the current page stays loaded -- exactly
     matching "disappear and reappear when it is opened" -- and every
     fresh load always starts fully open. Still scoped to the whole
     single-page app (not per-screen): the body class just keeps
     existing across in-app navigation with no extra wiring needed. */
  var _deskClosed = false;

  function isDeskClosed(){
    return _deskClosed;
  }

  function closeDesk(){
    _deskClosed = true;
    document.body.classList.add('t2t-desk-closed');
  }

  function reopenDesk(){
    _deskClosed = false;
    document.body.classList.remove('t2t-desk-closed');
    // Larry, July 31 2026 (bug report): "I put [the nametag] on the
    // desktop but when I opened the Field Guide the nametag still
    // jumped on top of the Guide." The bring-to-front fix only covers
    // actually DRAGGING something -- opening the Field Guide back up
    // via this button is a state toggle, not a drag, so the frame/
    // widget never got its own turn at the front just from reopening.
    // Bump the same shared counter here too.
    if (window.T2TFront) {
      window.T2TFront.bump(document.getElementById('tv-frame'));
      window.T2TFront.bump(document.getElementById('fg-root'));
      window.T2TFront.bump(document.getElementById('tv-vignette'));
    }
  }


  // Larry, July 31 2026: "It opened to the Field Guide 0100 but
  // should open to 0000 first with the blank desktop and 2 side
  // drawers both closed... like the desktop with the Field Guide
  // closed." closeDesk() alone (the same thing the TV frame's own X
  // triggers) hides the TV frame/Phases/Shortcuts but deliberately
  // leaves the two drawers standing open or collapsed, whichever they
  // already were -- correct for the mid-session X, but signing in
  // fresh should always start from the same known, tidy state: desk
  // closed AND both drawers collapsed, regardless of whatever they
  // were left at last time. Exposed separately from close() so the
  // TV frame's own X keeps its existing, already-approved behavior
  // untouched.
  function landOnClosedDesk(){
    closeDesk();
    [ { id: 'sz-navbar', key: COLLAPSE_KEY },
      { id: 'sz-drawer-r', key: RIGHT_COLLAPSE_KEY }
    ].forEach(function(d){
      var bar = document.getElementById(d.id);
      if (!bar) return;
      bar.classList.add('sz-collapsed');
      try { localStorage.setItem(d.key, '1'); } catch(e){}
      refreshRidersForSlot(d.id === 'sz-navbar' ? 'left' : 'right', bar.dataset.mode || '1', bar);
    });
  }

  window.SZDesk = {
    close: closeDesk,
    reopen: reopenDesk,
    isClosed: isDeskClosed,
    landOnClosedDesk: landOnClosedDesk
  };

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
    // Larry, July 29 2026: left drawer's slot 2 is no longer TBD --
    // it's the junk drawer now, a place to drop anything moved off
    // the desktop. Same treatment the surprise slot got once it held
    // real content: drop the placeholder statement and the dashed
    // "not built yet" border, keep the panel's size/layout.
    //
    // Larry, July 31 2026: this is also now where "open a new tray"
    // happens -- see buildCustomTraySlot -- so it's simultaneously
    // still the junk drawer (a bare drop spot) AND the birthplace of
    // a real, nameable, group-draggable tray the moment it gets its
    // first member.
    var mode2 = buildCustomTraySlot('left');
    var surprise = buildSurprisePanel(bar, 'left');
    mid.appendChild(mode1);
    mid.appendChild(mode2);
    mid.appendChild(surprise.el);

    var menuBtn = buildMenuButton();
    var gearBtn = buildGear();
    bar.appendChild(mid);
    bar.appendChild(menuBtn);
    bar.appendChild(gearBtn);

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
    var notebookRec = registerClaimable(notebook, NOTEBOOK_KEY, 200);
    makeDraggable(
      notebook, NOTEBOOK_KEY, null,
      notebook.style.left ? parseFloat(notebook.style.left) : 16,
      notebook.style.top ? parseFloat(notebook.style.top) : 16,
      {
        // Both drawers now, not just the left one -- Larry, July 27
        // 2026 bug report: "Nametag and Notes were placed in drawer 1
        // but now appear in drawer 3? Object stay in whichever drawer
        // they are placed!" Dropping onto the left drawer's OWN native
        // slot (mode 1) is still "true home" -- reverts to the
        // original always-visible-in-every-mode tray-riding behavior.
        // Dropping anywhere else (the right drawer, or the left
        // drawer while a different slot is showing) files it into
        // that exact slot instead, via the same slot system every
        // other draggable object now uses.
        reattachTargets: [
          { el: bar, side: 'left' },
          { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
        ],
        onReattach: function(side, barEl){
          // Larry, July 27 2026 (bug report, round 2): "Put in one
          // drawer; stay in one drawer." Dropping onto the left
          // drawer's own mode 1 used to be a special case ("true
          // home", visible in every mode of that drawer) -- that
          // special case was exactly what read as the notebook
          // "drifting" to other drawer taps. Every drop now claims
          // the exact slot it landed on, mode 1 included, no
          // exceptions -- matching how the nameplate already works.
          var mode = barEl.dataset.mode || '1';
          setRidingSlot(NOTEBOOK_KEY, slotKey(side, mode));
          captureRidingOffset(notebookRec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
          refreshRidersForSlot(side, mode, barEl);
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
          var mode = barEl.dataset.mode || '1';
          setRidingSlot(NAMEPLATE_KEY, slotKey(side, mode));
          captureRidingOffset(nameplateRec, barEl, mode === '2' ? loadTrayGroupOffset(side) : null);
          refreshRidersForSlot(side, mode, barEl);
        }
      }
    );

    // Larry, July 31 2026: gear and menu get the same drawer-dockable
    // treatment as everything else on the desk now (see
    // wireDetachableRailButton above).
    wireDetachableRailButton(menuBtn, MENU_POS_KEY, bar);
    wireDetachableRailButton(gearBtn, GEAR_POS_KEY, bar);
  }

  /* ---------- Dragging the widget (#fg-root) -- unchanged mechanics,
     kept separate since it stays in normal centered flow until first
     dragged (rail and notebook are always fixed-position from the
     start, since they're new floating objects with no "home" spot
     in the page's document flow). ---------- */

  function makeWidgetDraggable(){
    var el = document.getElementById('fg-root');
    if (!el) return;

    var dragging = false, moved = false, startX = 0, startY = 0, startCx = 0, startCy = 0;

    function applyPos(left, top){
      el.style.position = 'fixed';
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.margin = '0';
    }

    try {
      // Never on Sign In -- Larry, July 28 2026: "sign in page should
      // never reflect member preferences." nav() already clears/
      // restores this on every screen change, but this file's own
      // init() runs independently afterward and was re-applying the
      // saved position regardless of screen, which is what made
      // sign-in visibly re-center itself and then jump. Same guard as
      // nav()'s now uses.
      // Larry, Aug 1 2026: stored/restored by CENTER now, not top-left
      // -- see the matching comment in tv-frame.js's wireFrameDrag for
      // why (screen-fit.js's live scale transform on #fg-root makes a
      // scaled box's rendered top-left shift with whatever scale is in
      // effect, while its center stays put).
      if (!document.body.classList.contains('t2t-bare-screen')) {
        var saved = JSON.parse(localStorage.getItem('t2t-widget-pos'));
        if (saved && typeof saved.cx === 'number' && typeof saved.cy === 'number') {
          // Larry, Aug 1 2026: same off-screen clamp as backpack.js's
          // nav() restore, using the widget's actual current rendered
          // size rather than a worst-case scale guess -- see that
          // comment for why the first version of this was too tight.
          var _w=el.offsetWidth, _h=el.offsetHeight;
          var _rr=el.getBoundingClientRect(), _rw=_rr.width||_w, _rh=_rr.height||_h;
          var _mx=_rw/2+24, _my=_rh/2+24;
          var _cx=(2*_mx<window.innerWidth) ? Math.max(_mx, Math.min(saved.cx, window.innerWidth-_mx)) : window.innerWidth/2;
          var _cy=(2*_my<window.innerHeight) ? Math.max(_my, Math.min(saved.cy, window.innerHeight-_my)) : window.innerHeight/2;
          applyPos(_cx - _w / 2, _cy - _h / 2);
        }
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
      startCx = rect.left + rect.width / 2; startCy = rect.top + rect.height / 2;
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
      applyPos(startCx + dx - el.offsetWidth / 2, startCy + dy - el.offsetHeight / 2);
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = el.getBoundingClientRect();
      try { localStorage.setItem('t2t-widget-pos', JSON.stringify({ cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 })); }
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
      refreshRidersForSlot('right', bar.dataset.mode || '1', bar);
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
      refreshRidersForSlot('right', bar.dataset.mode || '1', bar);
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
    // Larry, July 29 2026: right drawer's slot 1 (the top,
    // single-tap slot) is no longer undesignated -- it's the
    // phase tray, mirroring the left rail's tool stack look.
    // Slot 2 is the right drawer's own new-tray birthplace now --
    // see buildCustomTraySlot, same as the left drawer's slot 2.
    var mode1 = buildPhaseTray(bar);
    mode1.classList.add('sz-mode-panel', 'sz-mode-active');
    var mode2 = buildCustomTraySlot('right');
    var surprise = buildSurprisePanel(bar, 'right');
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
      // Each slot keeps its own color (Larry, July 27 2026).
      refreshDrawerColorForMode(bar, RIGHT_DRAWER_COLOR_PREFIX);
      drawer.applyDock(drawer.getSide());
    });
    // Apply the restored slot's own saved color before first paint,
    // same reasoning as the left drawer above.
    refreshDrawerColorForMode(bar, RIGHT_DRAWER_COLOR_PREFIX);
  }

  /* ---------- Desk backdrop (0000, was Component C001 -- renamed July 31 2026) color picker -- double-click the
     empty backdrop (outside the widget, both drawers, the TV frame
     ring, the notebook, and the nameplate) opens a swatch picker,
     same "double-click is color options everywhere" standard as
     every other screen. Made-up starter palette for now, same
     approach as the TV frame's own picker -- real swatches are a
     later Art-Director decision (Style Book). Larry, July 28 2026.
     Not shown at all on 0010 Sign In -- see t2t-bare-screen, there's
     no desk yet for a traveler who hasn't signed in. ---------- */
  var BG_COLOR_KEY = 't2t_deskBgColor';
  var BG_PALETTE = [
    { key:'fog',   name:'Fog (default)', color:'#D0D0D0' },
    { key:'slate', name:'Slate',   color:'#8792A2' },
    { key:'putty', name:'Putty',   color:'#C9BFA8' },
    { key:'sage',  name:'Sage',    color:'#9CAF88' },
    { key:'dusk',  name:'Dusk',    color:'#6E6A85' },
    { key:'clay',  name:'Clay',    color:'#B57B5D' }
  ];

  function injectBgColorStyle(){
    if (document.getElementById('sz-bg-color-style')) return;
    var css = ''
      + '#sz-bg-color-overlay{position:fixed;inset:0;z-index:9997;'
      +   'display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}'
      + '#sz-bg-color-overlay.active{display:flex}'
      + '#sz-bg-color-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:280px;max-width:88vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}'
      + '#sz-bg-color-card .sz-bg-color-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:16px;font-weight:700;color:#2b2b2b;margin-bottom:4px}'
      + '#sz-bg-color-card .sz-bg-color-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:12px}'
      + '#sz-bg-color-swatches{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:14px}'
      + '.sz-bg-color-swatch{width:44px;height:44px;border-radius:10px;cursor:pointer;'
      +   'border:3px solid transparent}'
      + '.sz-bg-color-swatch.sz-bg-color-active{border-color:#1a3a5c;'
      +   'box-shadow:0 0 0 2px #fdf8f0,0 0 0 4px #1a3a5c}'
      + '#sz-bg-color-close{border:1px solid #cfe4f2;background:#fff;padding:6px 16px;'
      +   'border-radius:8px;cursor:pointer;font-size:13px}'
      // Desk watermark -- Larry, July 31 2026: "with everything put
      // into drawers, the desktop might be blank with the 2 filing
      // cabinets on the sides? A nice looking unobtrusive embossed T2T
      // in the center of the screen that is covered by anything placed
      // on top of it." Sits on the same backdrop this color picker
      // covers, so it lives right here alongside it. z-index:0 (an
      // explicit low value, not the default "auto") plus being the
      // very first thing appended to <body> (see buildDeskWatermark)
      // is what makes "covered by anything placed on top" automatic --
      // the widget and every drawer/tool/nameplate/notebook already
      // sit at z-index 9997+, so they paint over this without any
      // special-casing needed on their end. The "embossed" look is a
      // light+dark text-shadow pair (a highlight up-left, a shadow
      // down-right) on near-transparent text, a look that reads as
      // pressed into the surface rather than printed on it, and holds
      // up across every desk color in the palette above since it's
      // relative light/dark rather than tied to one specific hue.
      // pointer-events:none so it never intercepts the backdrop's own
      // double-click-for-color gesture.
      //
      // Larry, August 3 2026: "write member's name above T2T on 0000
      // in embossed letters smaller than the 2." T2T itself used to be
      // the fixed-position element; now the fixed position moves up to
      // a wrapping container (#sz-desk-watermark) so the member's name
      // can stack above it as a second line, both centered together as
      // one unit -- same embossed look, just a smaller font so it
      // reads as a caption over the main T2T mark, not a rival to it.
      + '#sz-desk-watermark{position:fixed;top:50%;left:50%;'
      +   'transform:translate(-50%,-50%);z-index:0;pointer-events:none;'
      +   'display:flex;flex-direction:column;align-items:center;'
      +   'user-select:none;-webkit-user-select:none}'
      + '#sz-member-watermark{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(3vw,30px);letter-spacing:0.04em;color:rgba(0,0,0,.05);' /* Larry, August 3 2026: smaller + mixed case, so a tighter tracking than the all-caps T2T reads cleaner */
      +   'text-shadow:2px 2px 3px rgba(255,255,255,.45),-2px -2px 3px rgba(0,0,0,.18);'
      +   'white-space:nowrap;margin-top:2px}'
      + '#sz-t2t-watermark{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(11vw,110px);letter-spacing:0.12em;' /* Larry, July 31 2026: about half the original size */
      +   'color:rgba(0,0,0,.05);'
      +   'text-shadow:2px 2px 3px rgba(255,255,255,.45),-2px -2px 3px rgba(0,0,0,.18)}'
      // Never on 0010 -- there's no desk backdrop to sit on yet (same
      // reasoning as the color picker itself, just above).
      + 'body.t2t-bare-screen #sz-desk-watermark{display:none!important}';
    var style = document.createElement('style');
    style.id = 'sz-bg-color-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildDeskWatermark(){
    if (document.getElementById('sz-desk-watermark')) return; // idempotent
    // injectBgColorStyle() normally only runs lazily, the first time a
    // traveler double-clicks the backdrop for its color picker -- the
    // watermark's own CSS lives in that same injected block (see
    // above), so it has to be forced here instead, or the watermark
    // would sit unstyled (default black text, top-left) until/unless
    // that gesture ever happened. Safe to call any time -- idempotent.
    injectBgColorStyle();
    var wrap = document.createElement('div');
    wrap.id = 'sz-desk-watermark';
    var memberLine = document.createElement('div');
    memberLine.id = 'sz-member-watermark';
    var mark = document.createElement('div');
    mark.id = 'sz-t2t-watermark';
    mark.textContent = 'T2T';
    wrap.appendChild(mark);
    wrap.appendChild(memberLine);
    // Inserted as the very FIRST child of <body> -- everything else on
    // the desk (the widget, both drawers, tools, nameplate, notebook)
    // either carries an explicit high z-index or, for the widget
    // itself, simply comes later in document order at the default
    // stacking level, so it paints on top of this watermark without
    // needing to know the watermark exists at all.
    document.body.insertBefore(wrap, document.body.firstChild);

    // Same real-signed-in-member name buildNameplate already fills in
    // (backpack.js's profile load) -- reused here rather than plumbed
    // through separately, so it stays correct if the profile finishes
    // loading late, or a different member signs in later in the same
    // tab. Larry, August 3 2026: "smaller and in upper and lower case"
    // -- shown in its natural mixed case here (unlike the nameplate's
    // own all-caps treatment), since this is a quieter caption line,
    // not the bold nametag.
    function applyMemberName(m){
      if (m && m.display_name) memberLine.textContent = m.display_name;
    }
    window.addEventListener('t2t:member-loaded', function(e){ applyMemberName(e.detail); });
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var m = window.T2T && window.T2T.getMember && window.T2T.getMember();
      if (m && m.display_name) {
        applyMemberName(m);
        clearInterval(timer);
      } else if (tries > 20) {
        clearInterval(timer); // give up quietly -- the event listener above still catches a later sign-in
      }
    }, 1000);
  }

  function getSavedBgKey(){
    try { return localStorage.getItem(BG_COLOR_KEY) || 'fog'; } catch(e){ return 'fog'; }
  }
  function saveBgKey(key){ try { localStorage.setItem(BG_COLOR_KEY, key); } catch(e){} }
  function applyBgColor(key){
    var p = BG_PALETTE.filter(function(x){ return x.key===key; })[0] || BG_PALETTE[0];
    // Set as a CSS variable rather than a direct body style -- style.css's
    // body.t2t-bare-screen rule overrides it back to the plain default on
    // Sign In purely through CSS, so this can never race with load order
    // or leak a member's saved color onto a screen that has no member yet.
    // Larry, July 28 2026.
    document.documentElement.style.setProperty('--t2t-desk-bg', p.color);
  }

  function buildBgColorPicker(){
    injectBgColorStyle();
    var overlay = document.createElement('div');
    overlay.id = 'sz-bg-color-overlay';
    var card = document.createElement('div');
    card.id = 'sz-bg-color-card';
    card.innerHTML = ''
      + '<div class="sz-bg-color-title">Desk color</div>'
      + '<div class="sz-bg-color-sub">Pick a look for the desk itself. Stays until you change it.</div>'
      + '<div id="sz-bg-color-swatches"></div>'
      + '<button id="sz-bg-color-close" type="button">\u2715</button>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var row = card.querySelector('#sz-bg-color-swatches');
    BG_PALETTE.forEach(function(p){
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'sz-bg-color-swatch';
      sw.title = p.name;
      sw.style.background = p.color;
      sw.addEventListener('click', function(){
        applyBgColor(p.key);
        saveBgKey(p.key);
        closeBgColorPicker();
      });
      row.appendChild(sw);
    });

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeBgColorPicker(); });
    card.querySelector('#sz-bg-color-close').addEventListener('click', closeBgColorPicker);
    return overlay;
  }

  /* ---------- Generic rename card -- Larry, July 31 2026: "Is there a
     way to change the name of a button?" and "Can traveler name a
     tray?" Same double-click-for-options family as the drawer/TV
     frame color pickers and the notebook's own double-click-to-open,
     just a text field instead of swatches. One shared overlay+card,
     reused for both a button's own label and a tray's grip label --
     callers only supply a title, the current value, and what to do
     with the saved result, so this has no idea whether it's renaming
     a button or a tray. ---------- */
  function injectRenameStyle(){
    if (document.getElementById('sz-rename-style')) return;
    var css = ''
      + '#sz-rename-overlay{position:fixed;inset:0;z-index:9997;'
      +   'display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}'
      + '#sz-rename-overlay.active{display:flex}'
      + '#sz-rename-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:260px;max-width:88vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}'
      + '#sz-rename-card .sz-rename-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:16px;font-weight:700;color:#2b2b2b;margin-bottom:12px}'
      + '#sz-rename-input{width:100%;box-sizing:border-box;padding:8px 10px;'
      +   'border:1px solid #cfe4f2;border-radius:8px;font-size:14px;'
      +   'font-family:"Playfair Display",Georgia,serif;margin-bottom:14px;text-align:center}'
      + '#sz-rename-actions{display:flex;gap:10px;justify-content:center}'
      + '#sz-rename-save{border:none;background:#378ADD;color:#fff;padding:7px 20px;'
      +   'border-radius:8px;cursor:pointer;font-size:13px;font-weight:700}'
      + '#sz-rename-cancel{border:1px solid #cfe4f2;background:#fff;padding:7px 16px;'
      +   'border-radius:8px;cursor:pointer;font-size:13px}';
    var style = document.createElement('style');
    style.id = 'sz-rename-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  var _renameOnSave = null;

  function buildRenameCard(){
    injectRenameStyle();
    var overlay = document.createElement('div');
    overlay.id = 'sz-rename-overlay';
    var card = document.createElement('div');
    card.id = 'sz-rename-card';
    card.innerHTML = ''
      + '<div class="sz-rename-title" id="sz-rename-title">Rename</div>'
      + '<input id="sz-rename-input" type="text" maxlength="40">'
      + '<div id="sz-rename-actions">'
      +   '<button id="sz-rename-save" type="button">Save</button>'
      +   '<button id="sz-rename-cancel" type="button">Cancel</button>'
      + '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var input = card.querySelector('#sz-rename-input');
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeRenameCard(); });
    card.querySelector('#sz-rename-cancel').addEventListener('click', closeRenameCard);
    card.querySelector('#sz-rename-save').addEventListener('click', saveRenameCard);
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') saveRenameCard();
      else if (e.key === 'Escape') closeRenameCard();
    });
    return overlay;
  }

  function openRenameCard(title, currentValue, onSave){
    var overlay = document.getElementById('sz-rename-overlay') || buildRenameCard();
    overlay.querySelector('#sz-rename-title').textContent = title;
    var input = overlay.querySelector('#sz-rename-input');
    input.value = currentValue || '';
    _renameOnSave = onSave;
    overlay.classList.add('active');
    input.focus();
    input.select();
  }

  function closeRenameCard(){
    var overlay = document.getElementById('sz-rename-overlay');
    if (overlay) overlay.classList.remove('active');
    _renameOnSave = null;
  }

  function saveRenameCard(){
    var overlay = document.getElementById('sz-rename-overlay');
    var input = overlay && overlay.querySelector('#sz-rename-input');
    var val = input ? input.value.trim() : '';
    var cb = _renameOnSave;
    closeRenameCard();
    if (val && cb) cb(val);
  }

  function openBgColorPicker(){
    var overlay = document.getElementById('sz-bg-color-overlay') || buildBgColorPicker();
    var cur = getSavedBgKey();
    overlay.querySelectorAll('.sz-bg-color-swatch').forEach(function(sw, i){
      sw.classList.toggle('sz-bg-color-active', BG_PALETTE[i].key === cur);
    });
    overlay.classList.add('active');
  }

  function closeBgColorPicker(){
    var overlay = document.getElementById('sz-bg-color-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function wireBgColorGesture(){
    document.addEventListener('dblclick', function(e){
      if (document.body.classList.contains('t2t-bare-screen')) return; // no desk on 0010
      if (e.target.closest('#fg-root, #sz-navbar, #sz-drawer-r, #sz-nameplate, #sz-notebook, #sz-bg-color-overlay')) return;
      var tvFrameEl = document.getElementById('tv-frame');
      if (tvFrameEl && !tvFrameEl.classList.contains('tv-frame-hidden')) {
        var r = tvFrameEl.getBoundingClientRect();
        var inRing = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (inRing) return; // TV frame's own dblclick picker owns that area
      }
      openBgColorPicker();
    });
  }

  // One-time cleanup, July 31 2026: gear/menu could get dropped
  // somewhere invisible before the fixes above existed -- missing
  // from the Sign In hide rule, or claimed by a drawer slot that
  // happened to be collapsed at that instant, no feedback either way.
  // If that already happened on this browser, clear the stuck saved
  // spot once so gear/menu come back home on the very next load, same
  // as a traveler who'd never touched them. Runs at most once ever
  // (per browser) -- afterward this is a no-op forever, so it never
  // interferes with anyone's real saved position going forward.
  function fixStuckGearMenuOnce(){
    try {
      if (localStorage.getItem('t2t_gearMenuFix_20260731')) return;
      ['t2t_gearPos','t2t_claimSlot_t2t_gearPos','t2t_menuPos','t2t_claimSlot_t2t_menuPos']
        .forEach(function(k){ localStorage.removeItem(k); });
      localStorage.setItem('t2t_gearMenuFix_20260731', '1');
    } catch(e){}
  }

  // Second one-time cleanup, same day -- Larry: "the nametag has been
  // changed to a weird Field Guide button that is supposed to be in
  // the missing left drawer." Not actually the nameplate -- the real
  // Field Guide TOOL button (top of the tool tray) had been dragged
  // out independently at some point well before today's session and
  // left riding its own saved desktop spot, which happens to sit right
  // near the nameplate's own default position -- close enough to read
  // as "the nametag turned into a button." Separate flag from the
  // gear/menu fix above (that one already ran once on Larry's browser,
  // so reusing its flag wouldn't fire again) -- clears Field Guide's
  // stray saved position/riding slot once so it lands back in the
  // tool tray, right where resetToolStack() would put it.
  function fixStuckFieldGuideOnce(){
    try {
      if (localStorage.getItem('t2t_fgHomeFix_20260731')) return;
      ['t2t_toolBtnPos_field-guide','t2t_claimSlot_t2t_toolBtnPos_field-guide']
        .forEach(function(k){ localStorage.removeItem(k); });
      localStorage.setItem('t2t_fgHomeFix_20260731', '1');
    } catch(e){}
  }

  // Third one-time cleanup, same day -- Larry: "those loose buttons
  // are supposed to be added to a Library tray... I do not know how
  // to add buttons to a new tray, PLUS those loose buttons seem to
  // have a remote connection to the tools tray... if I put the tools
  // tray in a drawer, the loose buttons think they are in the drawer
  // too." Two separate things were going on: the Library tray (the
  // right drawer's slot 2, which Larry had already named "Library")
  // never showed its own name while empty -- fixed above, it's no
  // longer indistinguishable from a plain empty drawer. But these
  // three placeholder tool buttons (Excellence, Storytelling, and
  // Library itself, since renamed to "Resources") had each picked up
  // a stray claim on some earlier drop attempt that never actually
  // landed cleanly -- Excellence and Storytelling were claimed to
  // "right-2" but ALSO still had their own independent desk position
  // saved, which wins in this system (an object with an independent
  // spot is never treated as riding anything, stray claim or not) --
  // so they just sat wherever they'd last been dropped, disconnected
  // from any drawer, while still carrying leftover slot data that
  // could resurface oddly later. "Library"/Resources had actually
  // succeeded in riding the drawer, just its Tools page (slot 1,
  // bundled in with the regular tool list) rather than its own named
  // tray (slot 2) -- because the drawer happened to be showing Tools,
  // not Library, at the moment it was dropped. This puts all three
  // where Larry always meant them to end up: genuinely riding the
  // right drawer's Library page as their own cluster, stacked in a
  // clean column, exactly like a real drag onto that page would have
  // produced if the timing had lined up. Field Guide is deliberately
  // left alone -- it's the real navigation button, not part of this
  // personal cluster idea, and already has its own fix above.
  function fixLibraryTrayMembersOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayFix_20260731')) return;
      var ids = ['excellence', 'storytelling', 'library'];
      ids.forEach(function(id, i){
        var storeKey = 't2t_toolBtnPos_' + id;
        localStorage.removeItem(storeKey);
        localStorage.setItem('t2t_claimSlot_' + storeKey, 'right-2');
        localStorage.setItem('t2t_claimOffset_' + storeKey,
          JSON.stringify({ x: 15, y: 40 + i * 46 }));
      });
      localStorage.setItem('t2t_libraryTrayFix_20260731', '1');
    } catch(e){}
  }

  // Fourth one-time cleanup, same day -- the right tray's own group
  // offset was left over from an earlier drag attempt on the grip
  // that never actually worked (see the grip stacking-context fix
  // above), and put the grip and its first member on top of each
  // other once both are positioned relative to the drawer's real top
  // edge. Zeroing it once gives the newly-migrated Library members a
  // clean, non-overlapping starting layout; the grip is fully
  // grabbable again after this same push, so any traveler is free to
  // drag the group somewhere else from here on same as before.
  function fixLibraryTrayOffsetOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayOffsetFix_20260731')) return;
      localStorage.setItem('t2t_trayGroupOffset_right', JSON.stringify({ x: 0, y: 0 }));
      localStorage.setItem('t2t_libraryTrayOffsetFix_20260731', '1');
    } catch(e){}
  }

  // Fifth one-time cleanup, same day -- Larry, testing the tray grip
  // once it finally became grabbable, hit the offset-doubling bug
  // fixed just above (captureRidingOffset): "moving the handle moves
  // the three buttons...even on top of each other... I tried to move
  // one up under the handle but it jumped to a different position...
  // so much space between items." Whatever got saved for these three
  // buttons and the tray's own group offset during that testing is
  // now unreliable data, produced by the very bug that's fixed above.
  // Re-running the same clean, stacked layout fixLibraryTrayMembersOnce
  // originally set (and re-zeroing the group offset) gives them a
  // sane starting point again -- safe to do a second time under a new
  // flag, since captureRidingOffset itself no longer corrupts things
  // going forward.
  function fixLibraryTrayLayoutAgainOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayLayoutFix2_20260731')) return;
      var ids = ['excellence', 'storytelling', 'library'];
      ids.forEach(function(id, i){
        var storeKey = 't2t_toolBtnPos_' + id;
        localStorage.removeItem(storeKey);
        localStorage.setItem('t2t_claimSlot_' + storeKey, 'right-2');
        localStorage.setItem('t2t_claimOffset_' + storeKey,
          JSON.stringify({ x: 15, y: 40 + i * 46 }));
      });
      localStorage.setItem('t2t_trayGroupOffset_right', JSON.stringify({ x: 0, y: 0 }));
      localStorage.setItem('t2t_libraryTrayLayoutFix2_20260731', '1');
    } catch(e){}
  }

  /* ---------- Larry, July 31 2026: "No travelers will expect or
     want that! An Idea Board is a totally different animal... you
     don't need a ship's anchor on an airplane." Field Guide, gear,
     and Shortcuts are meant to follow a traveler onto every screen --
     that's deliberate, they're universal tools. A custom tray
     (Library, or any future personal cluster a traveler builds) is
     different: it's blank-desk furniture, not a tool, and showed up
     riding along onto the Idea Board the same way those others do --
     which read as clutter that doesn't belong there, not a feature.
     Same idea as the TV frame already hiding itself during .isx-full
     (tv-frame.js's own trackLoop) for the same reason -- a real
     content screen taking over means desk-only furniture should get
     out of the way, then come right back the moment the desk is
     showing again. Polls once per frame but only ACTS on an actual
     full/not-full transition, so it's as cheap as the TV frame's own
     version of this same pattern.

     Larry, Aug 3 2026 (bug report): "Notebook has bled onto the idea
     board. It must stay on 0000 or a drawer." The Notebook was
     originally grouped in with Field Guide/gear/Shortcuts above as a
     "universal tool" that follows a traveler everywhere -- that's
     the one part of the July 31 decision this reverses. The Notebook
     now gets the exact same desk-only treatment as a custom tray:
     hidden the instant a real content screen goes full-screen,
     restored the instant it isn't. Only a display:none/'' toggle --
     never touches left/top -- so it can't jump or lose its spot,
     same guarantee every other object on the desk already has.
     Field Guide, gear, and Shortcuts are untouched; Larry only asked
     about the Notebook. ---------- */
  function watchCustomTrayDeskOnlyVisibility(){
    var fg = document.getElementById('fg-root');
    if (!fg) return;
    var wasFull = null;
    function tick(){
      var isFull = fg.classList.contains('isx-full');
      if (isFull !== wasFull) {
        wasFull = isFull;
        if (isFull) {
          document.querySelectorAll('.sz-custom-tray-grip').forEach(function(grip){
            grip.style.display = 'none';
          });
          _claimRegistry.forEach(function(rec){
            var slot = getRidingSlot(rec.storeKey);
            if (!slot || slot.split('-')[1] !== '2') return; // only custom-tray members -- Field Guide/gear/Shortcuts stay put
            rec.el.style.display = 'none';
          });
          // Notebook, Aug 3 2026: desk-only furniture too now (see the
          // comment above this function) -- hides regardless of
          // whether it's riding the rail's default spot, claimed into
          // a drawer slot, or sitting independently on the open desk.
          // A plain display toggle, nothing about its saved position
          // changes, so it comes back exactly where it was.
          var nbHide = document.getElementById('sz-notebook');
          if (nbHide) nbHide.style.display = 'none';
        } else {
          // Back on the desk -- let the normal slot/mode rules
          // recompute everyone's real visibility rather than
          // guessing at what to restore.
          var leftBarEl = document.getElementById('sz-navbar');
          var rightBarEl = document.getElementById('sz-drawer-r');
          if (leftBarEl) refreshRidersForSlot('left', leftBarEl.dataset.mode || '1', leftBarEl);
          if (rightBarEl) refreshRidersForSlot('right', rightBarEl.dataset.mode || '1', rightBarEl);
          // Notebook: if it's claimed into a drawer slot, the
          // refreshRidersForSlot call above already set its correct
          // display (that's exactly what _claimRegistry is for).
          // Otherwise (rail's default spot, or an independent desk
          // position) updateNotebookVisibility owns that same
          // decision everywhere else in this file -- reuse it here
          // instead of guessing, and it already no-ops if a slot claim
          // exists, so calling it unconditionally is safe either way.
          var nbShow = document.getElementById('sz-notebook');
          if (nbShow && leftBarEl) updateNotebookVisibility(leftBarEl, nbShow);
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  function init(){
    fixStuckGearMenuOnce();
    fixStuckFieldGuideOnce();
    fixLibraryTrayMembersOnce();
    fixLibraryTrayOffsetOnce();
    fixLibraryTrayLayoutAgainOnce();
    buildDeskWatermark();
    buildNavBar();
    buildRightDrawer();
    // No standalone reopen toggle to build anymore -- the real Field
    // Guide tool button (in buildNavBar's tray) IS the reopen handle.
    // No longer re-applies a saved closed state here either -- see the
    // in-memory _deskClosed note above, every fresh load starts open.
    makeWidgetDraggable();
    applyBgColor(getSavedBgKey());
    wireBgColorGesture();

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
    if (leftBarEl) refreshRidersForSlot('left', leftBarEl.dataset.mode || '1', leftBarEl);
    if (rightBarEl) refreshRidersForSlot('right', rightBarEl.dataset.mode || '1', rightBarEl);

    watchCustomTrayDeskOnlyVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
