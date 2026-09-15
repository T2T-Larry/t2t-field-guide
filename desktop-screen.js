/* ============================================================
   desktop-screen.js — Desktop Screen. Screen 0000 (the gray backdrop
   behind every screen): the embossed T2T watermark, the notebook (a
   free-floating desk object, not drawer content), dragging for the
   Field Guide widget itself, and the open/close-desk switch that
   hides/shows the widget, Phase tray, and Shortcuts rail as a unit.
   Also the one file that actually assembles the whole desk on load
   (init(), at the bottom) -- it calls into every other one of the six
   split files to build its own piece, in the right order, the same
   way the old single screen-zero.js file used to just run straight
   through top to bottom.

   Split out of screen-zero.js (Sept 4 2026) as part of Larry's
   code-hygiene cleanup -- see the Field Guide Project Journal for the
   full split plan. The nametag/nameplate that used to live in this
   same "desk furniture" territory is gone entirely by Larry's own
   call (Sept 4 2026): it was one of three objects the drag/dock
   system treated as free-floating desk furniture (nameplate,
   notebook, Phase tray) -- removing it just leaves two. The Idea
   Board's own gold name badge (idea-storyboard-9710.js) is a
   completely separate, independent copy of the same look and is
   unaffected.

   Loaded LAST among the six desk files -- it's the orchestrator, and
   its init() reaches into Drag Engine, Drawer Style, Desktop Style,
   Drawer System, and Drawer Surprise Tray, all of which must already
   have defined their window.SZ* handles by the time it runs. (Load
   ORDER only has to put this file after the other five in the
   <script> tags -- actual execution of init() itself waits for
   DOMContentLoaded, same as before the split, so nothing here is
   timing-sensitive beyond "all six files have finished parsing.")

   The actual "which number does triple-tap reveal" logic lives in
   backpack.js's Hidden Mickey handler. This file only makes sure
   #fg-root and #sz-navbar exist with those exact ids so backpack.js
   can tell 0000 / 0020 / whatever screen is showing apart.

   Loaded on every phase file, same as backpack.js/tmap.js.
   ============================================================ */

(function(){

  var NOTEBOOK_KEY = 't2t-notebook-pos'; // must match drawer-system.js's own copy of this literal key

  /* ---------- Notebook: filled in with the real signed-in member's
     name once backpack.js's profile load finishes -- not that this
     file needs the name for anything; kept purely as free-floating
     desk furniture, opens the real Journal popup on double-click.

     Larry, July 26 (later note): "the notebook does not go into a
     drawer -- it's like a custom label on every screen" (true of the
     nameplate that used to sit alongside it; the notebook itself CAN
     still dock into either drawer like anything else, it just isn't
     PART of one by default). Its own free-floating draggable object
     on 0000. A single click is the drag handle only; opening takes a
     double-click, since a real drag also ends in a mouseup on the
     same element and was popping the Journal open by accident. ---------- */
  function buildNotebook(){
    var nb = document.createElement('div');
    nb.id = 'sz-notebook';
    nb.title = 'Notebook (double-click to open)';
    nb.innerHTML = '<div id="sz-notebook-label"><span>Notes</span></div>';
    // Larry, July 29 2026: double-click opens the same kind of popup
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

  /* ---------- Notebook overlay hide/show hook -- July 29 2026. The
     notebook's double-click opens notebook-open.js's popup card
     instead of nav()'ing away; while that overlay is open the
     floating icon has to disappear, then reappear exactly where it
     already was once the overlay closes -- same spot, same claimed/
     riding state, same drag memory.

     Deliberately doesn't recompute anything through the drawer's own
     visibility logic -- Larry hit a real bug from that approach (the
     icon vanishing for good after closing the overlay, from an edge
     case in that recompute). Simplest fix, and the only one that
     actually guarantees "reappear exactly where it was left": just
     remember the icon's own exact inline display value the instant
     before hide() touches it, then restore that exact value on
     show(). ---------- */
  window.SZNotebook = {
    hide: function(){
      var nb = document.getElementById('sz-notebook');
      if (!nb) return;
      if (nb.style.display !== 'none') {
        nb.dataset.szPrevDisplay = nb.style.display;
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

  // Builds the notebook, appends it, and wires its drag/dock behavior
  // -- called by Drawer System's buildNavBar(), which needs the
  // finished element back so it can hand it to dockRail (the rail
  // carries the notebook along as it drags, same as always -- see
  // drawer-system.js's own header comment for this one acknowledged
  // remaining coupling point).
  function buildAndWireNotebook(leftBar){
    var notebook = buildNotebook();
    document.body.appendChild(notebook);

    // Default spot (before a traveler ever drags it) matches where it
    // always visually sat, on the rail near the bottom -- dockRail's
    // own repositionNotebook (drawer-system.js) computes that once the
    // rail itself is placed; this just gives makeDraggable a starting
    // point to restore FROM if nothing's saved yet.
    var notebookRec = window.SZDrag.registerClaimable(notebook, NOTEBOOK_KEY, 200);
    window.SZDragCore.makeDraggable(
      notebook, NOTEBOOK_KEY, null,
      notebook.style.left ? parseFloat(notebook.style.left) : 16,
      notebook.style.top ? parseFloat(notebook.style.top) : 16,
      {
        // Larry, July 27 2026 bug report: "Nametag and Notes were placed
        // in drawer 1 but now appear in drawer 3? Object stay in
        // whichever drawer they are placed!" Every drop claims the
        // exact slot it landed on, no exceptions.
        reattachTargets: [
          { el: leftBar, side: 'left' },
          { get el(){ return window.SZDrag.getDrawerR(); }, side: 'right' }
        ],
        onReattach: function(side, barEl){
          var mode = barEl.dataset.mode || '1';
          window.SZDrag.setRidingSlot(NOTEBOOK_KEY, window.SZDrag.slotKey(side, mode));
          window.SZDrag.captureRidingOffset(notebookRec, barEl,
            mode === '2' && window.SZSurpriseTray ? window.SZSurpriseTray.loadTrayGroupOffset(side) : null);
          window.SZDrag.refreshRidersForSlot(side, mode, barEl);
        }
      }
    );
    return notebook;
  }

  // Exposed early (before init() can possibly run, whichever branch
  // below fires) -- Drawer System's buildNavBar() calls this mid-
  // build, so it has to exist no matter how soon init() ends up
  // running.
  window.SZDesktop = {
    buildAndWireNotebook: buildAndWireNotebook
  };

  /* ---------- Dragging the widget (#fg-root) -- kept separate since
     it stays in normal centered flow until first dragged (the rail
     and notebook are always fixed-position from the start, since
     they're floating objects with no "home" spot in the page's
     document flow). Doesn't use Drag Engine's shared makeDraggable --
     this predates the drawer/dock system entirely and has never
     needed reattach-to-a-drawer behavior, so it keeps its own small,
     separate implementation rather than being forced through
     machinery it doesn't use. ---------- */
  var WIDGET_EXCLUDE = 'button, a, input, textarea, select, [role="button"], ' +
    '.mg-btn, .mg-ret, .spark-door, .ib, .jb, .gb, .tb, .more-link, ' +
    '.tool-row, .save-btn, .jsave-btn, .gsave-btn';

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
      // never reflect member preferences."
      // Larry, Aug 1 2026: stored/restored by CENTER now, not top-left
      // -- see the matching comment in tv-frame.js's wireFrameDrag for
      // why (screen-fit.js's live scale transform on #fg-root makes a
      // scaled box's rendered top-left shift with whatever scale is in
      // effect, while its center stays put).
      if (!document.body.classList.contains('t2t-bare-screen')) {
        var saved = JSON.parse(localStorage.getItem('t2t-widget-pos'));
        if (saved && typeof saved.cx === 'number' && typeof saved.cy === 'number') {
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
    // but not content." Moving the widget is now the TV frame's own
    // job instead (tv-frame.js's wireFrameDrag, same 't2t-widget-pos'
    // storage key so it's one continuous position, not two separate
    // systems). This function still restores a saved position on
    // load, and onDown/onMove/onUp stay defined below in case a future
    // screen wants body-dragging back -- just not wired to any
    // listener for now.
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

  /* ---------- Desk watermark -- Larry, July 31 2026: "with everything
     put into drawers, the desktop might be blank... a nice looking
     unobtrusive embossed T2T in the center of the screen that is
     covered by anything placed on top of it." This is the "embossed
     desktop" Larry means by "Desktop" -- not the notebook, not any
     drawer. Its CSS lives in Desktop Style (desktop-style.js); this
     function only builds and positions the actual element, forcing
     that CSS to exist first since it doesn't reliably run before this
     is first called otherwise. ---------- */
  function buildDeskWatermark(){
    if (document.getElementById('sz-desk-watermark')) return; // idempotent
    window.SZDeskStyle.injectDesktopStyle();
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
    // the desk (the widget, both drawers, tools, notebook) either
    // carries an explicit high z-index or, for the widget itself,
    // simply comes later in document order at the default stacking
    // level, so it paints on top of this watermark without needing to
    // know the watermark exists at all.
    document.body.insertBefore(wrap, document.body.firstChild);

    // Larry, August 3 2026: "smaller and in upper and lower case" --
    // shown in its natural mixed case here, since this is a quieter
    // caption line, not a bold nametag.
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
     Guide!" The nav rail, notebook, gear, menu, and every TOOL button
     are permanent desk furniture in Larry's model, not part of "the
     Field Guide" -- they never hide, open or closed.

     Reopening: since the tool trays themselves never hide, the real
     Field Guide tool button (Drawer System's LIBRARY_ITEMS, moved
     there Sept 4 2026 from the old flat Tools tray) IS the reopen
     handle -- it calls window.SZDesk.isClosed/.reopen/.close below.

     Sept 4 2026 (later session), Larry: "The desktop screen opens the
     Field Guide by default. Only the Field Guide button or having the
     Field Guide be the last location viewed should open the Field
     Guide." Reverses the July 31 note directly above (which is now
     stale) -- closed/open IS persisted again, the same way every other
     desk preference is (t2t-navbar-collapsed etc.), so a reload
     reflects whatever a traveler actually left showing: if they'd
     closed the Field Guide, a reload keeps it closed instead of
     silently popping back open; if it was open (the default for a
     brand-new traveler with nothing saved yet), a reload keeps it
     open. Nothing changes about the CLICK behavior itself -- the
     Field Guide button still opens/closes it instantly either way,
     same as before. ---------- */
  var DESK_CLOSED_KEY = 't2t_deskClosed';
  // Sept 15 2026, Larry: "Desktop needs to be the T2T Hub after
  // signing in" -- clarified as "just desktop and buttons," i.e. the
  // plain desk itself, not the Field Guide widget auto-opened on top
  // of it. Only changes the FIRST-EVER default (nothing saved yet for
  // this browser) from open to closed -- a returning traveler's own
  // saved open/closed state (the "stay where the traveler puts it"
  // rule, July 31/Sept 4 2026) is read and respected exactly as
  // before, untouched.
  var _deskClosed = true;
  try {
    var _savedDeskClosed = localStorage.getItem(DESK_CLOSED_KEY);
    if (_savedDeskClosed !== null) _deskClosed = _savedDeskClosed === '1';
  } catch(e){}

  function isDeskClosed(){
    return _deskClosed;
  }

  function closeDesk(){
    _deskClosed = true;
    document.body.classList.add('t2t-desk-closed');
    try { localStorage.setItem(DESK_CLOSED_KEY, '1'); } catch(e){}
  }

  function reopenDesk(){
    _deskClosed = false;
    document.body.classList.remove('t2t-desk-closed');
    try { localStorage.setItem(DESK_CLOSED_KEY, '0'); } catch(e){}
    // Larry, July 31 2026 (bug report): the bring-to-front fix only
    // covers actually DRAGGING something -- opening the Field Guide
    // back up via this button is a state toggle, not a drag, so the
    // frame/widget never got its own turn at the front just from
    // reopening. Bump the same shared counter here too.
    if (window.T2TFront) {
      window.T2TFront.bump(document.getElementById('tv-frame'));
      window.T2TFront.bump(document.getElementById('fg-root'));
      window.T2TFront.bump(document.getElementById('tv-vignette'));
    }
  }

  // Larry, July 31 2026: "It opened to the Field Guide 0100 but
  // should open to 0000 first with the blank desktop and 2 side
  // drawers both closed... like the desktop with the Field Guide
  // closed." closeDesk() alone deliberately leaves the two drawers
  // standing open or collapsed, whichever they already were -- correct
  // for the mid-session X, but signing in fresh should always start
  // from the same known, tidy state. Literal collapse-key strings
  // duplicated here rather than reaching into Drawer System's own
  // module vars -- they're plain localStorage key names, safe to copy,
  // and must match drawer-system.js's own COLLAPSE_KEY/
  // RIGHT_COLLAPSE_KEY exactly.
  function landOnClosedDesk(){
    closeDesk();
    [ { id: 'sz-navbar', key: 't2t-navbar-collapsed' },
      { id: 'sz-drawer-r', key: 't2t-drawer-r-collapsed' }
    ].forEach(function(d){
      var bar = document.getElementById(d.id);
      if (!bar) return;
      bar.classList.add('sz-collapsed');
      try { localStorage.setItem(d.key, '1'); } catch(e){}
      window.SZDrag.refreshRidersForSlot(d.id === 'sz-navbar' ? 'left' : 'right', bar.dataset.mode || '1', bar);
    });
  }

  window.SZDesk = {
    close: closeDesk,
    reopen: reopenDesk,
    isClosed: isDeskClosed,
    landOnClosedDesk: landOnClosedDesk
  };

  /* ---------- Larry, July 31 2026: "No travelers will expect or want
     that! An Idea Board is a totally different animal." Field Guide,
     gear, and Shortcuts are meant to follow a traveler onto every
     screen -- deliberate, they're universal tools. A custom tray
     (Drawer Surprise Tray's mode-2 slot) is different: it's blank-desk
     furniture, not a tool, and showed up riding along onto the Idea
     Board the same way those others do -- clutter, not a feature.

     Larry, Aug 3 2026 (bug report): "Notebook has bled onto the idea
     board. It must stay on 0000 or a drawer." The Notebook gets the
     exact same desk-only treatment as the custom tray now: hidden the
     instant a real content screen goes full-screen, restored the
     instant it isn't. Only a display:none/'' toggle -- never touches
     left/top -- so it can't jump or lose its spot. ---------- */
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
          window.SZDrag.getClaimRegistry().forEach(function(rec){
            var slot = window.SZDrag.getRidingSlot(rec.storeKey);
            if (!slot || slot.split('-')[1] !== '2') return; // only custom-tray members -- Field Guide/gear/Shortcuts stay put
            rec.el.style.display = 'none';
          });
          var nbHide = document.getElementById('sz-notebook');
          if (nbHide) nbHide.style.display = 'none';
        } else {
          // Back on the desk -- let the normal slot/mode rules
          // recompute everyone's real visibility rather than guessing
          // at what to restore.
          var leftBarEl = document.getElementById('sz-navbar');
          var rightBarEl = document.getElementById('sz-drawer-r');
          if (leftBarEl) window.SZDrag.refreshRidersForSlot('left', leftBarEl.dataset.mode || '1', leftBarEl);
          if (rightBarEl) window.SZDrag.refreshRidersForSlot('right', rightBarEl.dataset.mode || '1', rightBarEl);
          var nbShow = document.getElementById('sz-notebook');
          if (nbShow) nbShow.style.display = ''; // slot-riding case is already handled by the refresh calls above; this covers the plain default-spot case
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- Retire the drawers to the open desk -- Sept 15 2026,
     Larry (after live-testing with Rachel, on an iPad): the two side
     drawers' single/double/triple-tap mode switch was unreliable on
     touch -- a plain single tap sometimes opened Drawer 2 instead of
     Drawer 1 (most likely cause: makeTapCounter, drawer-system.js,
     counts every click event in a burst and a touch device can fire
     more than one per tap under the right conditions -- flagged here,
     not guessed at blind, since it can't be confirmed without live
     device testing). Separately, and regardless of that bug, Larry
     decided the drawers themselves should stop being where navigation
     lives at all: "Remove items from drawers. Leave code for drawers
     but make them go away visibly" and, on what the Desktop should
     show right after signing in, "just desktop and buttons."

     Nothing about the drawer SYSTEM is touched by this function --
     every one of the six split files (Drag Engine, Drawer Style,
     Drawer System, Drawer Surprise Tray, this file, Desktop Style) is
     unchanged and still fully wired, so the drawers themselves could
     come back with a one-line revert of the call at the bottom of
     init() below. This only changes where the three navigation groups
     built inside them (STORYBOARDS, LIBRARY, PHASES) physically live
     once buildNavBar()/buildRightDrawer() finish constructing them:
     pulled out onto the open desk as their own free-floating objects
     -- the exact same treatment the Notebook already gets -- instead
     of nested inside a drawer's mode-1 panel. The (now-empty) drawer
     bars and their toggle nubs are hidden outright.

     "Remove items from drawers" also covers anyone already mid-session
     with something actually DOCKED into a drawer slot (a tool button
     dragged in by hand, the Notebook, anything sitting in the custom-
     tray slot) -- unclaimEveryDrawerSlot() below sweeps every claim
     key so nothing is left stranded, invisible, behind a drawer that
     no longer shows. ---------- */
  var RETIRED_DRAWER_STYLE_ID = 'sz-drawers-retired-style';
  function injectDrawerRetiredStyle(){
    if (document.getElementById(RETIRED_DRAWER_STYLE_ID)) return;
    var css = ''
      + '#sz-navbar,#sz-drawer-r,#sz-navbar-toggle,#sz-drawer-r-toggle{display:none!important}'
      // Larry, Sept 15 2026: "enlarge the text on the buttons" -- now
      // that these stand on their own on the open desk instead of
      // packed into a narrow drawer column, they can afford to be
      // bigger and easier to read/tap (this mattered on Rachel's
      // iPad specifically).
      + '.sz-tool-btn{width:170px}'
      + '.sz-tool-face{font-size:15px;padding:9px 6px}'
      // Matches style.css's own body:has(#fg-root.isx-full) rule that
      // already hides #sz-navbar/#sz-drawer-r (and gear/X) the instant
      // a full-screen tool (Briefing Board, Idea Storyboard, etc.)
      // opens -- these three trays used to be DOM descendants of those
      // bars, so they hid for free; now that they float independently
      // on the open desk, they need that exact same rule spelled out
      // for their own ids or they'd float on top of every full-screen
      // tool instead of getting out of the way with everything else.
      + 'body:has(#fg-root.isx-full) #sz-tools-storyboards,'
      +   'body:has(#fg-root.isx-full) #sz-tools-library,'
      +   'body:has(#fg-root.isx-full) #sz-phases{display:none!important}';
    var style = document.createElement('style');
    style.id = RETIRED_DRAWER_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function unclaimEveryDrawerSlot(){
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('t2t_claimSlot_') === 0) toRemove.push(k);
      }
      toRemove.forEach(function(k){ localStorage.removeItem(k); });
    } catch(e){}
  }

  // Moves an already-built tray wrap out onto the open desk. If it
  // already carries its own position (a traveler dragged it
  // independently before this session, or it just got restored from a
  // saved spot by makeDraggable during buildNavBar/buildRightDrawer),
  // that position is left exactly as-is -- only a tray with no
  // position of its own yet (still sitting in normal in-flow layout,
  // per makeDraggable's skipDefaultPos branch) gets one of these
  // defaults. Also strips '.sz-mode-panel' -- the Phase tray wrap IS
  // one of the drawer's own mode-1 panels (see buildRightDrawer), and
  // that class's display:none!important rule applies globally, not
  // just while parented inside the drawer -- left on, a traveler whose
  // saved tap-mode happened to be 2 or 3 would find the whole Phase
  // tray invisible after this move.
  function floatFree(el, defaultLeft, defaultTop){
    if (!el) return;
    el.classList.remove('sz-mode-panel', 'sz-mode-active');
    if (el.parentNode !== document.body) document.body.appendChild(el);
    if (el.style.position !== 'fixed') {
      el.style.position = 'fixed';
      el.style.left = defaultLeft + 'px';
      el.style.top = defaultTop + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.margin = '0';
    }
  }

  function retireDrawersToDesk(){
    injectDrawerRetiredStyle();
    unclaimEveryDrawerSlot();
    floatFree(document.getElementById('sz-tools-storyboards'), 16, 70);
    floatFree(document.getElementById('sz-tools-library'), 16, 420);
    floatFree(document.getElementById('sz-phases'), Math.max(16, window.innerWidth - 190), 70);
  }

  function init(){
    window.SZLegacyFixes.runAll();
    buildDeskWatermark();
    window.SZDrawerSystem.buildNavBar();
    window.SZDrawerSystem.buildRightDrawer();
    retireDrawersToDesk();
    // The real Field Guide tool button (in Drawer System's tray) is
    // the reopen/close handle for mid-session clicks. Here at boot,
    // re-apply whatever was saved last (see the persisted
    // DESK_CLOSED_KEY note above closeDesk/reopenDesk) so a reload
    // shows the Field Guide only if it was genuinely last left open --
    // _deskClosed already reflects the saved value; this just puts the
    // body class in sync with it before the traveler sees anything.
    if (_deskClosed) document.body.classList.add('t2t-desk-closed');
    makeWidgetDraggable();
    window.SZDeskStyle.applyBgColor(window.SZDeskStyle.getSavedBgKey());
    window.SZDeskStyle.wireBgColorGesture();

    // Final sync pass, after both drawers definitely exist: some
    // claimable objects get registered partway through buildNavBar,
    // before dockRail's own initial apply() call had a chance to see
    // them, and the right drawer doesn't exist at all until
    // buildRightDrawer runs. This catches anyone loading with a saved
    // claim from a previous session so they land in the right spot on
    // first paint, not just after the next drag/dock/toggle.
    var leftBarEl = document.getElementById('sz-navbar');
    var rightBarEl = document.getElementById('sz-drawer-r');
    if (leftBarEl) window.SZDrag.refreshRidersForSlot('left', leftBarEl.dataset.mode || '1', leftBarEl);
    if (rightBarEl) window.SZDrag.refreshRidersForSlot('right', rightBarEl.dataset.mode || '1', rightBarEl);

    watchCustomTrayDeskOnlyVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
