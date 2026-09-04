/* ============================================================
   drawer-system.js — Drawer System. The two drawers themselves (the
   0020 left rail and the right drawer): their container, their
   single/double/triple-tap mode switching, dragging and docking to
   either side of the screen, and the real content that lives in each
   drawer's first (default) slot -- the left rail's tool tray, the
   right drawer's phase tray. Also owns the shared "ride into a
   drawer slot" mechanics (the claim registry) that let ANY object on
   the desk -- a tool button, the notebook, the surprise-slot image --
   dock into either drawer and remember exactly where it landed, plus
   the gear/menu buttons and the text-size picker gear opens (they're
   built and docked the same way tool buttons are, using this same
   drawer machinery).

   Split out of screen-zero.js (Sept 4 2026) as part of Larry's
   code-hygiene cleanup -- see the Field Guide Project Journal for the
   full split plan (Drag Engine / Desktop Screen / Desktop Style /
   Drawer System / Drawer Style / Drawer Surprise Tray). This is the
   one file the other five most depend on: it assembles window.SZDrag,
   the same shared drag/dock interface bookmarks.js and
   idea-storyboard-9710.js already reach into (window.SZDrag,
   unchanged shape -- those two files needed no changes for this
   split). It also assembles window.SZDrawerRename, a small new
   handle Drawer Surprise Tray uses for the same rename-card popup
   the tool/phase trays use.

   Load order: after Drag Engine (needs window.SZDragCore.makeDraggable
   and window.T2TFront) and Drawer Style (needs
   window.SZDrawerStyle.wireDrawerColorGesture/refreshDrawerColorForMode)
   and Drawer Surprise Tray (needs window.SZSurpriseTray for the mode-2/
   mode-3 panels this file builds each drawer's mid section from) --
   but BEFORE Desktop Screen, which calls this file's buildNavBar()/
   buildRightDrawer() as part of its own init() orchestration, and
   which this file calls back into via window.SZDesk (the Field Guide
   tool button's open/close) and window.SZDesktop (to get a fully
   built, already-wired notebook to dock alongside the rail). ---------

   Known, intentional coupling left as-is by this split (documented,
   not hidden -- same "flagged, not guessed at here" spirit as the
   rest of this codebase): dockRail() below still directly repositions
   the notebook element as the left rail drags/docks/collapses, even
   though the notebook's own creation and drag-wiring now live in
   desktop-screen.js. Untangling that fully would mean redesigning how
   the rail "carries" the notebook (e.g. a custom event instead of a
   direct reference) -- a real improvement, but a bigger and riskier
   change than a straight file-split, so it's flagged here rather than
   attempted blind.
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
    'box-shadow:0 4px 24px rgba(0,0,0,.18);background:var(--sz-bg,#fdf8f0)';

  function injectStyle(){
    if (document.getElementById('sz-style')) return;
    var css = ''
      + '#sz-navbar{position:fixed;top:0;bottom:0;width:' + RAIL_WIDTH + 'px;'
      +   CARD_LOOK + ';z-index:9998;'
      +   'display:flex;flex-direction:column;align-items:center;'
      +   'padding:16px 10px 14px;box-sizing:border-box;font-family:"Playfair Display",Georgia,serif;'
      +   'transition:width .18s ease, padding .18s ease, background .18s ease, box-shadow .18s ease}'
      // Collapsed hides the drawer's own card -- background, border,
      // shadow -- leaving only the toggle nub sitting right on the screen
      // edge. Larry, July 26: "why not just have the toggle visible on
      // the edge of the screen?"
      + '#sz-navbar.sz-collapsed{width:0;padding:0;border:none;box-shadow:none;background:transparent}'
      // Sept 4 2026 fix -- Larry: "I closed the Field Guide and found the
      // Tools in the left drawer... Tools appear to be outside the
      // drawer, but disappear when drawer is closed." Root cause: #sz-
      // navmid used to be blanket-hidden on collapse, and the real tool
      // tray (mode 1 -- Field Guide, Idea Board, all nine) lives inside
      // it, so collapsing this ONE drawer's toggle wiped out every tool
      // button everywhere on screen, even ones long since dragged out to
      // ride the RIGHT drawer or sit free on the desk -- they're still
      // DOM descendants of this drawer's mid panel underneath, just
      // repositioned with their own fixed coordinates. That directly
      // contradicted the already-settled rule that the tool trays never
      // hide (see STORYBOARD_ITEMS/LIBRARY_ITEMS above). #sz-navmid itself is no
      // longer in this hide list. The junk-drawer/surprise slots (modes
      // 2/3) still disappear on their own -- .sz-mode-panel{display:none
      // !important} below already hides whichever mode isn't active,
      // collapse or not -- and the real tool stack's own position:fixed
      // layout keeps it rendering correctly regardless of this panel's
      // collapsed width.
      + '#sz-navbar.sz-collapsed #sz-menu,#sz-navbar.sz-collapsed #sz-gear{display:none}'
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
      + '#sz-navmid{position:relative;flex:1;width:100%;display:flex;flex-direction:column;align-items:center;'
      +   'justify-content:center;gap:16px;overflow-y:auto;padding:10px 0}'
      // Sept 4 2026: mode 1 now wraps two trays (STORYBOARDS, LIBRARY)
      // stacked vertically instead of one flat tray -- only sets the
      // properties that matter while hidden-vs-shown is decided
      // elsewhere (.sz-mode-panel/.sz-mode-active below), so there's no
      // display-property fight to resolve with !important here.
      + '#sz-navmid-tools{flex-direction:column;align-items:center;gap:18px}'
      + '.sz-tools-group{display:flex;flex-direction:column;align-items:center}'
      + '.sz-tool-stack{display:flex;flex-direction:column;gap:8px;align-items:center;cursor:grab;'
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
      // Notebook/gear never hit this because they were already given
      // z-index:9999; giving tool buttons the same fixes it.
      + '.sz-tool-btn{width:150px;padding:3px;border-radius:6px;border:none;cursor:pointer;'
      +   'background:linear-gradient(135deg,#e0b060,#8a6420);box-shadow:2px 3px 6px rgba(0,0,0,.3);'
      +   'transition:transform .1s ease, box-shadow .1s ease;z-index:9999}'
      + '.sz-tool-btn:active{transform:translateY(2px);box-shadow:1px 1px 2px rgba(0,0,0,.3)}'
      + '.sz-tool-face{padding:7px 4px;border-radius:4px;text-align:center;font-size:11px;'
      +   'color:#4a3418;font-family:"Playfair Display",Georgia,serif;white-space:nowrap;'
      +   'background:radial-gradient(circle at 35% 30%,#f3d98a,#c9973a 55%,#8a6420 100%)}'
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
      // elsewhere in this codebase) since a mode panel's own children
      // (e.g. .sz-tools-group) carry their own `display:flex`, which
      // would otherwise always beat a plain class rule regardless of
      // which mode is active.
      + '.sz-mode-panel{display:none!important}'
      + '.sz-mode-panel.sz-mode-active{display:flex!important}'
      + '.sz-mode-placeholder{flex-direction:column;align-items:center;justify-content:center;'
      +   'gap:6px;width:150px;min-height:80px;border-radius:8px;'
      +   'padding:14px 10px;text-align:center;color:#7a5c3a;font-size:11px;'
      +   'font-family:"Playfair Display",Georgia,serif;box-sizing:border-box}'
      // The new right-side drawer -- same family look as the left rail,
      // no notebook/menu/gear, just the toggle + mode panels, since its
      // actual contents aren't designated yet.
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
      // pressed-into-the-surface look as the desk's own T2T watermark
      // (desktop-style.js). z-index:-1 against the mid container's own
      // stacking context (position:relative, set just above) keeps it
      // under every real piece of drawer content -- the tool stack and
      // phase tray both already carry z-index:9999, so it's invisible
      // behind either one once populated, and only shows through a slot
      // that's genuinely empty (today: each drawer's own still-
      // undesignated slot 2).
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
      // Text-size picker -- Aug 3 2026, same overlay/card family as the
      // drawer color picker (drawer-style.js).
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

  // Outside-click-to-close guard, Aug 11 2026 -- see drawer-style.js
  // for the full history; every popup in this family carries its own
  // small copy.
  function guardedBackdropClose(overlay, closeFn){
    var openedAt = 0;
    overlay.addEventListener('click', function(e){
      if (e.target !== overlay) return;
      if (Date.now() - openedAt < 400) return;
      closeFn();
    });
    overlay._markOpened = function(){ openedAt = Date.now(); };
  }

  /* ---------- Tool stack: ported labels/shape from the binder pilot.
     Only the ones with a real live equivalent are wired; the rest
     show the same "coming later" toast as the gear, so nothing
     looks silently broken. ---------- */

  // Larry, July 31 2026: "Tapping Field Guide a second time opens the
  // old backpack 9000. Is it a good idea for the second click to
  // close the button as additional method to X?" -- then, once
  // confirmed: "yes toggle all the buttons!" Every tool button that
  // actually opens a real screen now toggles: tap opens it, tap again
  // (while it's already showing) closes/leaves it. closeFn -- optional,
  // Aug 3 2026, for target screens with their own dedicated close
  // routine (the Idea Storyboard).
  function wireToggleNav(targetScreenId, openFn, closeFn){
    return function(){
      if (window.T2T && window.T2T.getCur && window.T2T.getCur() === targetScreenId) {
        if (closeFn) closeFn(); else window.T2T.goBack();
      } else {
        openFn();
      }
    };
  }

  // Sept 4 2026, Larry: the old single nine-button Tools tray splits into
  // two trays, matching the STORYBOARDS/LIBRARY shape locked Sept 3
  // (Session 268) -- STORYBOARDS holds the five real board buttons,
  // LIBRARY holds Field Guide plus the still-coming-later reference
  // items. Synapse is deleted outright (already decided Sept 3: "dropped
  // outright, no placeholder anywhere"); Planning and Organization drop
  // too -- Planning's job is now just the real Plan button, and
  // Organization was already folded into Plan's own category, never a
  // separate button of its own.
  var STORYBOARD_ITEMS = [
    // Larry, July 29 2026: was pointing at the archived 9220 legacy grid
    // -- routes to the current 1010 Idea Storyboard now. Larry, August 1
    // 2026: plain nav() left currentTopicId null, landing on 1010's
    // confusing blank-project fallback -- now resumes the last real
    // topic instead, same as 9711 already does.
    // Sept 4 2026 (later same day) -- Larry hit a real stuck-screen bug:
    // clicking Idea cleared the desk (nav() had already landed and added
    // isx-full) but the board's own async resume chain (openBoardResume,
    // a chain of Supabase awaits before it ever calls nav) apparently
    // stalled or threw without ever finishing -- no spinner, no board
    // content, and no way back short of a hard browser reload. Whatever
    // the root network-timing cause turns out to be, a promise
    // rejection here was going uncaught (openBoardResume/jumpToProjectKind
    // are async functions called and never awaited or watched), so any
    // failure was completely silent. Wrapping every one of these calls
    // so a rejection surfaces as a real toast instead of a silent stuck
    // screen -- doesn't fix a slow/stuck network call by itself, but it
    // guarantees the traveler gets told something instead of just
    // staring at an empty board with the drawers gone. Larry, right
    // after: "we need to jump to the idea board instantly with the
    // spinning clock if needed for now" -- openBoardResume itself
    // (idea-media-shared.js) now shows the spinner as its very first
    // synchronous step, so the click gives instant feedback even before
    // this promise settles either way; this handler also hides it
    // immediately on a genuine failure instead of leaving it to the 5-
    // second safety-net timeout.
    { id: 'idea',           label: 'Idea',            action: wireToggleNav('s-sea-of-ideas-cluster', function(){
        if (window.T2TMedia && window.T2TMedia.openBoardResume) {
          try {
            var p = window.T2TMedia.openBoardResume();
            if (p && typeof p.catch === 'function') p.catch(function(err){
              console.error('Idea Storyboard failed to open:', err);
              if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
              showZeroToast('The Storyboard had trouble opening -- please try again.');
            });
          } catch(err) {
            console.error('Idea Storyboard failed to open:', err);
            if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
            showZeroToast('The Storyboard had trouble opening -- please try again.');
          }
        } else if (window.T2T) { window.T2T.nav('s-sea-of-ideas-cluster'); }
      }, function(){ if (window.T2TStoryboard && window.T2TStoryboard.closeBoard) window.T2TStoryboard.closeBoard(); else if (window.T2T) window.T2T.goBack(); }) },
    // Sept 4 2026 -- opens (or starts) the Plan board for whichever
    // project this traveler had open last (same "last active project"
    // memory the Idea button's own resume already reads), via the
    // existing jumpToProjectKind bridge briefing-board.js's board-kind
    // dropdown already uses for this same job.
    { id: 'plan',           label: 'Plan',            action: function(){
        var pid = (window.T2TMedia && window.T2TMedia.recallProject) ? window.T2TMedia.recallProject() : null;
        if (!pid) { showZeroToast('Start an Idea Storyboard first, then Plan can build off it.'); return; }
        if (window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind) {
          try {
            var p = window.T2TStoryboard.jumpToProjectKind(pid, 'PLAN');
            if (p && typeof p.then === 'function') p.then(function(ok){
              // jumpToProjectKind resolves false (never throws) on a
              // failed fetch -- catch() alone would miss this, since
              // the promise still resolves successfully.
              if (ok === false) {
                if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
                showZeroToast('Plan had trouble opening -- please try again.');
              }
            }, function(err){
              console.error('Plan failed to open:', err);
              if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
              showZeroToast('Plan had trouble opening -- please try again.');
            });
          } catch(err) {
            console.error('Plan failed to open:', err);
            if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
            showZeroToast('Plan had trouble opening -- please try again.');
          }
        }
      } },
    // Sept 4 2026 -- same "last active project" resolve as Plan, then
    // opens that project's Cast (team roster) popup -- the CAST branch
    // added to jumpToProjectKind alongside this.
    { id: 'cast',           label: 'Cast',            action: function(){
        var pid = (window.T2TMedia && window.T2TMedia.recallProject) ? window.T2TMedia.recallProject() : null;
        if (!pid) { showZeroToast('Start an Idea Storyboard first, then Cast can build off it.'); return; }
        if (window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind) {
          try {
            var p = window.T2TStoryboard.jumpToProjectKind(pid, 'CAST');
            if (p && typeof p.then === 'function') p.then(function(ok){
              if (ok === false) {
                if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
                showZeroToast('Cast had trouble opening -- please try again.');
              }
            }, function(err){
              console.error('Cast failed to open:', err);
              if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
              showZeroToast('Cast had trouble opening -- please try again.');
            });
          } catch(err) {
            console.error('Cast failed to open:', err);
            if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
            showZeroToast('Cast had trouble opening -- please try again.');
          }
        }
      } },
    // Matches the in-board board-kind dropdown's own "coming soon" SHARE
    // row -- not a new gap, same placeholder everywhere SHARE shows up.
    { id: 'share',          label: 'Share',           action: function(){ showZeroToast('Share — coming soon.'); } },
    { id: 'briefing-board', label: 'Briefing Board',  action: wireToggleNav('s-briefing-board', function(){ if (window.T2T) window.T2T.nav('s-briefing-board'); }) }
  ];

  var LIBRARY_ITEMS = [
    // Larry, July 31 2026: "Closing the Field Guide ONLY makes
    // SHORTCUTS and PHASES disappear... Field Guide Button" is the
    // thing a traveler clicks to bring them back -- and since the
    // tool tray itself never hides anymore, THIS is that button; no
    // separate floating toggle needed. Second tap now closes the
    // Field Guide (same as the TV frame's own X) instead of opening
    // the old 9000 backpack menu.
    //
    // Sept 4 2026: moved out of the old flat Tools tray into LIBRARY,
    // matching the Sept 3 lock ("Field Guide demoted to an optional
    // reference badge, not a required gate").
    { id: 'field-guide',    label: 'Field Guide',     action: function(){
        if (window.SZDesk.isClosed()) { window.SZDesk.reopen(); return; }
        window.SZDesk.close();
      } },
    { id: 'storytelling',   label: 'Storytelling',    action: function(){ showZeroToast('Storytelling — coming later.'); } },
    { id: 'excellence',     label: 'Excellence',      action: function(){ showZeroToast('Excellence — coming later.'); } }
  ];

  // Sept 4 2026: generalized to cfg-driven so this same machinery
  // serves two independent trays (STORYBOARDS, LIBRARY) instead of one
  // fixed nine-item stack -- each tray gets its own order/position
  // storage keys (cfg.orderKey/cfg.stackKey) and its own label/rename
  // storage (keyed by cfg.trayId), so dragging or renaming one tray's
  // buttons never touches the other's.
  var _toolStackRecs = []; // [{ rec, items, orderKey, stackKey }, ...] -- one per tray
  var _toolButtonRecs = [];

  var GEAR_POS_KEY = 't2t_gearPos';
  var MENU_POS_KEY = 't2t_menuPos';
  var _railButtonRecs = [];

  function wireDetachableRailButton(btn, storeKey, leftBar){
    var rec = registerClaimable(btn, storeKey, 16);
    _railButtonRecs.push(rec);
    window.SZDragCore.makeDraggable(btn, storeKey, null, 40, 40, {
      skipDefaultPos: true,
      reattachTargets: [
        { el: leftBar, side: 'left' },
        { get el(){ return document.getElementById('sz-drawer-r'); }, side: 'right' }
      ],
      onIndependent: function(){
        if (btn.parentNode !== document.body) document.body.appendChild(btn);
        btn.style.display = '';
      },
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? trayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
    return rec;
  }

  function loadToolOrder(items, orderKey){
    try {
      var saved = JSON.parse(localStorage.getItem(orderKey));
      if (Array.isArray(saved) && saved.length === items.length) {
        var byId = {};
        items.forEach(function(it){ byId[it.id] = it; });
        var ordered = saved.map(function(id){ return byId[id]; }).filter(Boolean);
        if (ordered.length === items.length) return ordered;
      }
    } catch(e){}
    return items.slice();
  }

  function saveToolOrderFromDom(stackEl, items, orderKey){
    var ids = [];
    stackEl.querySelectorAll(':scope > .sz-tool-btn').forEach(function(btn){
      if (btn.dataset.toolId) ids.push(btn.dataset.toolId);
    });
    if (ids.length === items.length) {
      try { localStorage.setItem(orderKey, JSON.stringify(ids)); } catch(e){}
    }
  }

  function resetToolOrder(orderKey){
    try { localStorage.removeItem(orderKey); } catch(e){}
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
    _toolStackRecs.forEach(function(entry){
      resetToolOrder(entry.orderKey);
      var stackEl = entry.rec.el;
      var order = entry.items.map(function(it){ return it.id; });
      order.forEach(function(id){
        var btn = stackEl.querySelector('[data-tool-id="' + id + '"]');
        if (btn) stackEl.appendChild(btn);
      });
      setRidingSlot(entry.stackKey, null);
      try { localStorage.removeItem(entry.stackKey); } catch(e){}
      restoreHomeParent(entry.rec);
      stackEl.style.position = '';
      stackEl.style.left = ''; stackEl.style.top = '';
      stackEl.style.right = ''; stackEl.style.bottom = ''; stackEl.style.margin = '';
      stackEl.style.display = '';
    });
    showZeroToast('Tool stack reset.');
  }

  // Live reorder while dragging -- swap-on-crossing, same idea as any
  // sortable list.
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

  function wireToolButtonDrag(btn, leftBar, stackEl, cfg){
    var storeKey = 't2t_toolBtnPos_' + cfg.trayId + '_' + btn.dataset.toolId;
    var rec = registerClaimable(btn, storeKey, 16);
    _toolButtonRecs.push(rec);
    window.SZDragCore.makeDraggable(btn, storeKey, null, 40, 40, {
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
        if (side === 'stack') {
          setRidingSlot(storeKey, null);
          try { localStorage.removeItem(storeKey); } catch(e){}
          btn.style.position = '';
          btn.style.left = ''; btn.style.top = '';
          btn.style.right = ''; btn.style.bottom = ''; btn.style.margin = '';
          btn.style.display = '';
          saveToolOrderFromDom(stackEl, cfg.items, cfg.orderKey);
          return;
        }
        var mode = barEl.dataset.mode || '1';
        setRidingSlot(storeKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? trayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  function wireToolStackDrag(stack, leftBar, cfg){
    var rec = registerClaimable(stack, cfg.stackKey, 16);
    _toolStackRecs.push({ rec: rec, items: cfg.items, orderKey: cfg.orderKey, stackKey: cfg.stackKey });
    window.SZDragCore.makeDraggable(stack, cfg.stackKey, '.sz-tool-btn', 40, 40, {
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
        setRidingSlot(cfg.stackKey, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? trayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  var TOOL_LABEL_PREFIX = 't2t_toolLabel_';
  var TRAY_LABEL_PREFIX = 't2t_trayLabel_';
  function loadCustomLabel(prefix, id, fallback){
    try { return localStorage.getItem(prefix + id) || fallback; } catch(e){ return fallback; }
  }
  function saveCustomLabel(prefix, id, label){
    try { localStorage.setItem(prefix + id, label); } catch(e){}
  }

  // Sept 4 2026: takes a cfg object -- { trayId, defaultLabel, items,
  // orderKey, stackKey } -- so this one function builds either tray
  // (STORYBOARDS or LIBRARY) instead of one hardcoded "Tools" stack.
  // Rename storage is keyed by trayId too (TRAY_LABEL_PREFIX+trayId for
  // the grip, TOOL_LABEL_PREFIX+trayId+'_'+item.id per button) so
  // renaming a button in one tray never collides with an identically-
  // named button in the other.
  function buildTools(leftBar, cfg){
    var wrap = document.createElement('div');
    wrap.id = 'sz-tools-' + cfg.trayId;
    wrap.className = 'sz-tools-group';

    var stack = document.createElement('div');
    stack.id = 'sz-tool-stack-' + cfg.trayId;
    stack.className = 'sz-tool-stack sz-drawer-drag-exclude';

    var grip = document.createElement('div');
    grip.className = 'sz-tool-stack-grip';
    grip.title = 'Drag to move the whole tool stack -- double-click to rename it';
    grip.textContent = '⋮⋮ ' + loadCustomLabel(TRAY_LABEL_PREFIX, cfg.trayId, cfg.defaultLabel);
    grip.addEventListener('dblclick', function(){
      var current = loadCustomLabel(TRAY_LABEL_PREFIX, cfg.trayId, cfg.defaultLabel);
      openRenameCard('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, cfg.trayId, newName);
        grip.textContent = '⋮⋮ ' + newName;
      });
    });
    stack.appendChild(grip);

    loadToolOrder(cfg.items, cfg.orderKey).forEach(function(item){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sz-tool-btn';
      btn.dataset.toolId = item.id;
      var labelKey = cfg.trayId + '_' + item.id;
      var faceSpan = document.createElement('span');
      faceSpan.textContent = loadCustomLabel(TOOL_LABEL_PREFIX, labelKey, item.label);
      var face = document.createElement('div');
      face.className = 'sz-tool-face';
      face.appendChild(faceSpan);
      btn.appendChild(face);
      btn.title = 'Double-click to rename';
      makeTapCounter(btn, function(n){
        if (n >= 2) {
          var current = loadCustomLabel(TOOL_LABEL_PREFIX, labelKey, item.label);
          openRenameCard('Rename this button', current, function(newLabel){
            saveCustomLabel(TOOL_LABEL_PREFIX, labelKey, newLabel);
            faceSpan.textContent = newLabel;
          });
        } else {
          item.action();
        }
      });
      stack.appendChild(btn);
      wireToolButtonDrag(btn, leftBar, stack, cfg);
    });

    wrap.appendChild(stack);
    wireToolStackDrag(stack, leftBar, cfg);

    return wrap;
  }

  /* ---------- Phase tray -- full parity with buildTools()/
     wireToolButtonDrag/wireToolStackDrag above -- same reorder-by-
     crossing, same drag-out-onto-desk, same dock-to-either-drawer,
     just mirrored: this tray's HOME is the right drawer (mode 1)
     instead of the left rail. ---------- */
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

  function wirePhaseButtonDrag(btn, rightBar, stackEl){
    var storeKey = 't2t_phaseBtnPos_' + btn.dataset.phaseId;
    var rec = registerClaimable(btn, storeKey, 16);
    _phaseButtonRecs.push(rec);
    window.SZDragCore.makeDraggable(btn, storeKey, null, 40, 40, {
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
        captureRidingOffset(rec, barEl, mode === '2' ? trayGroupOffset(side) : null);
        refreshRidersForSlot(side, mode, barEl);
      }
    });
  }

  function wirePhaseStackDrag(stack, rightBar){
    var rec = registerClaimable(stack, PHASE_STACK_KEY, 16);
    _phaseStackRec = rec;
    window.SZDragCore.makeDraggable(stack, PHASE_STACK_KEY, '.sz-tool-btn', 40, 40, {
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
        setRidingSlot(PHASE_STACK_KEY, slotKey(side, mode));
        captureRidingOffset(rec, barEl, mode === '2' ? trayGroupOffset(side) : null);
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
    grip.textContent = '⋮⋮ ' + loadCustomLabel(TRAY_LABEL_PREFIX, 'phases', 'Phases');
    grip.addEventListener('dblclick', function(){
      var current = loadCustomLabel(TRAY_LABEL_PREFIX, 'phases', 'Phases');
      openRenameCard('Rename this tray', current, function(newName){
        saveCustomLabel(TRAY_LABEL_PREFIX, 'phases', newName);
        grip.textContent = '⋮⋮ ' + newName;
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

  /* ---------- The gear -- picks up the shared card shadow, single
     tap opens the text-size picker, double-click resets every tool/
     rail-button position back home. ---------- */
  function buildGear(){
    var gear = document.createElement('button');
    gear.id = 'sz-gear';
    gear.type = 'button';
    gear.title = 'Utility';
    gear.textContent = '⚙️';
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
     pattern as the drawer color picker (drawer-style.js), just
     offering screen-fit.js's four boost levels instead of swatches.
     Lazily built on first open, same as the color picker. ---------- */
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

    guardedBackdropClose(overlay, closeTextSizePicker);
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
    if (overlay._markOpened) overlay._markOpened();
  }

  function closeTextSizePicker(){
    var overlay = document.getElementById('sz-text-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // Exposed so full-screen tools (Storyboard, Session, Briefing Board,
  // Gems) that hide the desk's own gear can still open the same picker
  // from their own in-tool settings/gear menu. Aug 3 2026. Unchanged
  // name/shape by this split -- those four files needed no changes.
  window.openFGTextSizePicker = openTextSizePicker;

  /* ---------- The MAP (☰) button. ---------- */
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

  /* ---------- Collapse / expand toggle for the rail. ---------- */
  function buildToggle(bar, onChange){
    var t = document.createElement('button');
    t.id = 'sz-navbar-toggle';
    t.type = 'button';
    t.title = 'Collapse / expand';
    t.textContent = '‹';
    t.addEventListener('click', function(){
      var collapsed = bar.classList.toggle('sz-collapsed');
      t.textContent = collapsed ? '›' : '‹';
      try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch(e){}
      if (onChange) onChange();
    });
    return t;
  }

  /* ---------- Tap counter: counts a quick burst of clicks on one
     element and reports the final tally once the burst pauses, same
     "count, then reset after a gap" idea as backpack.js's Hidden Mickey
     triple-tap. ---------- */
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

  // Small bridge used by the tool/phase stack drag handlers above --
  // mode-2 (the custom/new-tray slot) needs the SAME shared group
  // offset Drawer Surprise Tray's own tray-grip drag uses, so a tool
  // or phase button dropped into that slot lines up with the rest of
  // the group instead of ignoring how far the grip's been dragged.
  function trayGroupOffset(side){
    return window.SZSurpriseTray && window.SZSurpriseTray.loadTrayGroupOffset
      ? window.SZSurpriseTray.loadTrayGroupOffset(side) : null;
  }

  /* ---------- Generic rename card -- Larry, July 31 2026: "Is there a
     way to change the name of a button?" and "Can traveler name a
     tray?" One shared overlay+card, reused for a button's own label,
     a tray's grip label, AND (via window.SZDrawerRename below) Drawer
     Surprise Tray's own custom-tray grip label. ---------- */
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
    guardedBackdropClose(overlay, closeRenameCard);
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
    if (overlay._markOpened) overlay._markOpened();
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

  /* ---------- Generalized drawer-storage, July 27 2026 -- Larry:
     "every object in a drawer should be draggable onto the screen...
     every object on a screen should be movable... drag it onto a
     drawer to put it away when drawer is closed." Any object can ride
     EITHER drawer. Rebuilt per-SLOT rather than per-side, same day,
     after Larry caught the bug: "Nametag and Notes were placed in
     drawer 1 but now appear in drawer 3? Object stay in whichever
     drawer they are placed!" A slot key is "side-mode", e.g. "left-3",
     and an object is only shown while ITS slot is the one currently
     active on that side. ---------- */
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
        localStorage.removeItem(claimOffsetStoreKey(storeKey));
      }
    } catch(e){}
  }

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

  var _claimRegistry = [];
  function registerClaimable(el, storeKey, defaultTop){
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
    var barRect = barEl.getBoundingClientRect();
    var elRect = rec.el.getBoundingClientRect();
    var gx = (groupOffset && typeof groupOffset.x === 'number') ? groupOffset.x : 0;
    var gy = (groupOffset && typeof groupOffset.y === 'number') ? groupOffset.y : 0;
    rec.offsetX = elRect.left - barRect.left - gx;
    rec.offsetY = elRect.top - barRect.top - gy;
    saveRidingOffset(rec.storeKey, rec.offsetX, rec.offsetY);
  }
  function restoreHomeParent(rec){
    if (rec.el.parentNode !== rec.homeParent) {
      rec.homeParent.appendChild(rec.el);
    }
  }

  function refreshRidersForSlot(side, mode, barEl){
    var slot = slotKey(side, mode);
    var barRect = barEl.getBoundingClientRect();
    var collapsed = barEl.classList.contains('sz-collapsed');
    var groupOffset = (mode === '2') ? trayGroupOffset(side) : null;
    _claimRegistry.forEach(function(rec){
      if (!isRidingDrawer(rec.storeKey)) return;
      var ridingSlot = getRidingSlot(rec.storeKey);
      if (!ridingSlot) return;
      var ridingSide = ridingSlot.split('-')[0];
      if (ridingSide !== side) return;
      if (ridingSlot !== slot) {
        rec.el.style.display = 'none';
        return;
      }
      if (rec.el.parentNode !== document.body) document.body.appendChild(rec.el);
      rec.el.style.position = 'fixed';
      var candLeft = barRect.left + rec.offsetX + (groupOffset ? groupOffset.x : 0);
      var candTop = (rec.offsetY != null)
        ? (barRect.top + rec.offsetY + (groupOffset ? groupOffset.y : 0))
        : null;
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
    var grip = document.querySelector('.sz-custom-tray-grip[data-side="' + side + '"]');
    if (grip) {
      if (mode === '2') {
        if (grip.parentNode !== document.body) document.body.appendChild(grip);
        grip.style.position = 'fixed';
        var goff = trayGroupOffset(side) || { x: 0, y: 0 };
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
        if (!grip.style.zIndex) grip.style.zIndex = '10000';
        grip.style.display = collapsed ? 'none' : '';
      } else if (grip.parentNode === document.body) {
        grip.style.display = 'none';
      }
    }
  }

  /* ---------- The rail (tray): full height top-to-bottom by default,
     drags horizontally only, and always ends up flush against one
     edge or the other on release. The notebook (desktop-screen.js)
     rides along with the tray unless it's been dragged off to its own
     spot -- see this file's header comment for the known coupling
     that keeps alive. ---------- */
  var COLLAPSE_KEY = 't2t-navbar-collapsed';
  var NAVBAR_EXCLUDE = 'button, a, input, textarea, select, [role="button"], .sz-drawer-drag-exclude';
  var DOCK_KEY = 't2t-navbar-dock';
  var NOTEBOOK_KEY = 't2t-notebook-pos'; // must match desktop-screen.js's own copy of this literal key

  function notebookIsClaimed(){
    try { return !!localStorage.getItem(NOTEBOOK_KEY); } catch(e){ return false; }
  }

  function dockRail(bar, notebook){
    var dockSide = 'left';
    try { dockSide = localStorage.getItem(DOCK_KEY) || 'left'; } catch(e){}

    var dragging = false, moved = false, startX = 0, startLeft = 0;

    function currentWidth(){ return bar.classList.contains('sz-collapsed') ? 0 : RAIL_WIDTH; }

    function railLeftFor(side, width){
      return side === 'right' ? (window.innerWidth - width) : 0;
    }

    var notebookOffsetX = 12; // default: matches the original resting spot

    function captureNotebookOffset(){
      if (!notebook) return;
      var railRect = bar.getBoundingClientRect();
      var nbRect = notebook.getBoundingClientRect();
      notebookOffsetX = nbRect.left - railRect.left;
    }

    function repositionNotebook(railLeft){
      if (!notebook || notebookIsClaimed() || getRidingSlot(NOTEBOOK_KEY)) return;
      notebook.style.position = 'fixed';
      notebook.style.left = (railLeft + notebookOffsetX) + 'px';
      if (!notebook.style.top) {
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
      var left = startLeft + dx;
      bar.style.left = left + 'px';
      bar.style.right = 'auto';
      repositionNotebook(left);
      refreshRidersForSlot('left', bar.dataset.mode || '1', bar);
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

    return { applyDock: applyDock, getSide: function(){ return dockSide; }, captureNotebookOffset: captureNotebookOffset };
  }

  function updateNotebookVisibility(bar, notebook){
    if (getRidingSlot(NOTEBOOK_KEY)) return;
    var hideWithDrawer = bar.classList.contains('sz-collapsed') && !notebookIsClaimed();
    notebook.style.display = hideWithDrawer ? 'none' : '';
  }

  /* ---------- Shared drag/dock primitives, exposed for other files.
     Larry, July 30 2026: wanted the Shortcuts rail (bookmarks.js) to
     be "moveable like phases... could be put into a drawer if
     wanted." bookmarks.js registers into this SAME shared registry so
     every dock/mode/collapse trigger in this file already knows how
     to show, hide, and reposition it too. Unchanged shape by this
     split -- bookmarks.js and idea-storyboard-9710.js still reach
     window.SZDrag exactly as before. getClaimRegistry is the one
     addition (Drawer Surprise Tray's traySlotMemberCount needs read
     access to the registry now that it lives in a different file's
     closure). ---------- */
  window.SZDrag = {
    makeDraggable: window.SZDragCore.makeDraggable,
    registerClaimable: registerClaimable,
    slotKey: slotKey,
    setRidingSlot: setRidingSlot,
    getRidingSlot: getRidingSlot,
    isRidingDrawer: isRidingDrawer,
    captureRidingOffset: captureRidingOffset,
    refreshRidersForSlot: refreshRidersForSlot,
    restoreHomeParent: restoreHomeParent,
    getClaimRegistry: function(){ return _claimRegistry; },
    getNavbar: function(){ return document.getElementById('sz-navbar'); },
    getDrawerR: function(){ return document.getElementById('sz-drawer-r'); }
  };

  window.SZDrawerRename = {
    open: openRenameCard
  };

  function buildNavBar(){
    if (document.getElementById('sz-navbar')) return; // idempotent
    injectStyle();

    var bar = document.createElement('div');
    bar.id = 'sz-navbar';

    var mid = document.createElement('div');
    mid.id = 'sz-navmid';
    // Sept 4 2026: mode 1 now holds two trays stacked together --
    // STORYBOARDS (the five real board buttons) above LIBRARY (Field
    // Guide + the still-coming-later reference items) -- instead of one
    // flat nine-button Tools stack. Each tray drags, reorders, renames,
    // and docks independently (see buildTools' cfg above); this wrapper
    // is just what mode-switching (single/double/triple tap) shows or
    // hides as a unit.
    var mode1 = document.createElement('div');
    mode1.id = 'sz-navmid-tools';
    var storyboardsTray = buildTools(bar, { trayId: 'storyboards', defaultLabel: 'STORYBOARDS', items: STORYBOARD_ITEMS, orderKey: 't2t_toolOrder_storyboards', stackKey: 't2t_toolStackPos_storyboards' });
    var libraryTray = buildTools(bar, { trayId: 'library', defaultLabel: 'LIBRARY', items: LIBRARY_ITEMS, orderKey: 't2t_toolOrder_library', stackKey: 't2t_toolStackPos_library' });
    mode1.appendChild(storyboardsTray);
    mode1.appendChild(libraryTray);
    mode1.classList.add('sz-mode-panel', 'sz-mode-active');
    var mode2 = window.SZSurpriseTray.buildCustomTraySlot('left');
    var surprise = window.SZSurpriseTray.buildSurprisePanel(bar, 'left');
    mid.appendChild(mode1);
    mid.appendChild(mode2);
    mid.appendChild(surprise.el);

    var menuBtn = buildMenuButton();
    var gearBtn = buildGear();
    bar.appendChild(mid);
    bar.appendChild(menuBtn);
    bar.appendChild(gearBtn);

    // Notebook: built and drag-wired by Desktop Screen (it's desk
    // furniture, not drawer content -- see this file's header comment)
    // but the rail still has to carry it along as it drags/docks, so
    // Desktop Screen hands back the finished, already-appended element.
    var notebook = window.SZDesktop.buildAndWireNotebook(bar);

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

    window.SZDrawerStyle.wireDrawerColorGesture(bar, window.SZDrawerStyle.LEFT_DRAWER_COLOR_PREFIX, 'Left');

    wireModeToggle(toggle, bar, [mode1, mode2, surprise.el], 'LEFT_DRAWER_MODE', COLLAPSE_KEY, { open: '‹', closed: '›' }, function(){
      window.SZDrawerStyle.refreshDrawerColorForMode(bar, window.SZDrawerStyle.LEFT_DRAWER_COLOR_PREFIX);
      rail.applyDock(rail.getSide());
      updateNotebookVisibility(bar, notebook);
    });
    window.SZDrawerStyle.refreshDrawerColorForMode(bar, window.SZDrawerStyle.LEFT_DRAWER_COLOR_PREFIX);

    var rail = dockRail(bar, notebook);
    updateNotebookVisibility(bar, notebook);

    wireDetachableRailButton(menuBtn, MENU_POS_KEY, bar);
    wireDetachableRailButton(gearBtn, GEAR_POS_KEY, bar);
  }

  /* ---------- Mode panels for the two "magic" drawers -- Larry, July
     26: "single tap one drawer, double tap second drawer, triple tap
     for surprising trivia." Slot 1 is always the drawer's real,
     reliable content; slots 2 and 3 are Drawer Surprise Tray's
     territory. ---------- */
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
        window.SZSurpriseTray.triggerFlourish(bar);
      }
    }
    showMode(mode);

    makeTapCounter(toggleBtn, function(n){
      var collapsed = bar.classList.contains('sz-collapsed');
      if (!collapsed && n === 1) {
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

  /* ---------- The new right-side drawer -- mirrors the nav drawer's
     mechanics on the right instead of the left. This deliberately
     duplicates dockRail's drag/dock logic rather than generalizing
     dockRail to serve both drawers -- safer, given dockRail is already
     carrying real, tested behavior (the notebook riding along, its
     offset-tracking fix, etc.) that a shared refactor could risk
     disturbing. Worth unifying into one real "drawer" building block
     later, once this one's settled -- flagged, not guessed at here. ---------- */
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
    var mode1 = buildPhaseTray(bar);
    mode1.classList.add('sz-mode-panel', 'sz-mode-active');
    var mode2 = window.SZSurpriseTray.buildCustomTraySlot('right');
    var surprise = window.SZSurpriseTray.buildSurprisePanel(bar, 'right');
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

    window.SZDrawerStyle.wireDrawerColorGesture(bar, window.SZDrawerStyle.RIGHT_DRAWER_COLOR_PREFIX, 'Right');

    var drawer = dockRightDrawer(bar);

    wireModeToggle(toggle, bar, [mode1, mode2, surprise.el], 'RIGHT_DRAWER_MODE', RIGHT_COLLAPSE_KEY, { open: '›', closed: '‹' }, function(){
      window.SZDrawerStyle.refreshDrawerColorForMode(bar, window.SZDrawerStyle.RIGHT_DRAWER_COLOR_PREFIX);
      drawer.applyDock(drawer.getSide());
    });
    window.SZDrawerStyle.refreshDrawerColorForMode(bar, window.SZDrawerStyle.RIGHT_DRAWER_COLOR_PREFIX);
  }

  // Exposed for desktop-screen.js's init() orchestration, and for its
  // landOnClosedDesk (which needs to collapse both drawers). Literal
  // key strings duplicated there rather than reaching back into this
  // file's own module vars -- see that file's own comment.
  window.SZDrawerSystem = {
    buildNavBar: buildNavBar,
    buildRightDrawer: buildRightDrawer
  };

})();
