/* ============================================================
   backpack.js — T2T Field Guide shared infrastructure v1.0
   Loaded by index.html, dream.html, and all future phase files.
   Injects MG overlay, wires backpack, manages all shared state.
   ============================================================ */

(function(){

  /* ── SUPABASE ── */
  const SB_URL = 'https://jyvvbjxqmxdgsxfcrfdn.supabase.co';
  const SB_KEY = 'sb_publishable_LADU6bQTx91yLtXdm4Xb4g_jLjQ6meh';
  // "Remember me" checkbox on the sign-in screen, Aug 3 2026 -- Supabase
  // always keeps a signed-in session in localStorage by default, so a
  // traveler who signs in stays signed in forever with no way to opt
  // out. This swaps the session's storage between localStorage
  // (remembered -- survives closing the browser, the original/default
  // behavior) and sessionStorage (not remembered -- gone the moment
  // the tab/browser closes) based on a small preference flag the
  // sign-in button writes right before signing in. The flag itself
  // always lives in localStorage (not sensitive, just a yes/no), so
  // this device keeps remembering the traveler's last choice even
  // across a "don't remember me" session. No flag yet (a traveler
  // who's never seen the checkbox) defaults to remembered, matching
  // the exact behavior this app always had before.
  var T2T_REMEMBER_KEY = 't2t_remember';
  function _t2tAuthBackingStore(){
    var remembered = true;
    try{ remembered = localStorage.getItem(T2T_REMEMBER_KEY) !== '0'; }catch(e){}
    return remembered ? window.localStorage : window.sessionStorage;
  }
  var _t2tAuthStorage = {
    getItem:function(key){ try{ return _t2tAuthBackingStore().getItem(key); }catch(e){ return null; } },
    setItem:function(key,value){ try{ _t2tAuthBackingStore().setItem(key,value); }catch(e){} },
    removeItem:function(key){ try{ _t2tAuthBackingStore().removeItem(key); }catch(e){} }
  };
  const _sb = supabase.createClient(SB_URL, SB_KEY, { auth:{ storage:_t2tAuthStorage } });

  /* ── MEMBER PROFILE ── */
  var _member = {
    user_id:null, email:null, display_name:null,
    briefing_board_id:null
  };

  // ── LIVE SYNC (Aug 4 2026) ──────────────────────────────────────
  // Larry asked whether the Storyboard and Briefing Board could stay in
  // sync when open at once (e.g. on two screens). Neither board polled
  // or listened for anything before this -- each one loaded its data
  // once and only ever saw a fresh copy again after its own save. This
  // adds one shared Supabase Realtime channel, listening for row
  // changes on every table either board reads (ideas, briefing_cards,
  // briefing_checklist_items, briefing_card_links, custom_keys), and a
  // tiny pub/sub (onRealtimeChange) so briefing-board.js and
  // idea-storyboard-9710.js can each react in their own way without
  // reaching into each other's code -- same "talk only through
  // window.T2T" rule the two boards already follow for everything else.
  // Row visibility is still governed entirely by each table's existing
  // Row Level Security policies -- this doesn't widen what anyone can
  // see, it just pushes the same rows a traveler could already query
  // themselves, the moment they change instead of on next reload.
  var _rtListeners = {};
  function onRealtimeChange(table, cb){
    (_rtListeners[table] = _rtListeners[table] || []).push(cb);
  }
  function _rtFire(table, eventType, newRow, oldRow){
    var arr = _rtListeners[table];
    if (!arr || !arr.length) return;
    arr.forEach(function(cb){
      try { cb(eventType, newRow, oldRow); }
      catch(e){ console.error('T2T: realtime listener failed for', table, e); }
    });
  }
  var _rtChannel = null, _rtStarted = false;
  var LIVE_SYNC_TABLES = ['ideas','briefing_cards','briefing_checklist_items','briefing_card_links','custom_keys','gems'];
  function startRealtimeSync(){
    if (_rtStarted || !_member.user_id) return;
    _rtStarted = true;
    try {
      var ch = _sb.channel('t2t-live-sync');
      LIVE_SYNC_TABLES.forEach(function(t){
        ch.on('postgres_changes', { event:'*', schema:'public', table:t }, function(payload){
          _rtFire(t, payload.eventType, payload.new, payload.old);
        });
      });
      ch.subscribe(function(status, err){
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('T2T: live-sync channel problem', status, err);
          _rtStarted = false; // allow a retry on next profile load / nav
        }
      });
      _rtChannel = ch;
    } catch(e) { console.error('T2T: could not start live sync', e); _rtStarted = false; }
  }
  // Native HTML5 drag-and-drop breaks if the dragged element gets
  // removed from the DOM mid-drag -- exactly what a remote-change
  // re-render would do to a card/idea currently being dragged. Both
  // boards check this (via T().isDragActive()) before reacting to a
  // live update, and re-check on t2t:drag-end once the drag finishes.
  var _t2tDragActive = false;
  document.addEventListener('dragstart', function(){ _t2tDragActive = true; }, true);
  document.addEventListener('dragend', function(){
    _t2tDragActive = false;
    window.dispatchEvent(new CustomEvent('t2t:drag-end'));
  }, true);

  async function loadMemberProfile(userId) {
    try {
      var res = await _sb.from('profiles').select('*').eq('user_id', userId).single();
      // Larry, July 31 2026 (bug report): "Still calls me Traveler
      // rather than my name" -- with a console check turning up
      // nothing but an unrelated favicon 404. Root cause: Supabase's
      // client doesn't throw on a failed query here -- a missing row,
      // a permissions/RLS block, or any other failure comes back as
      // res.error with res.data left null, which this function used
      // to just silently ignore (the `if (res.data)` below skipped it
      // entirely, and the catch below never even ran since nothing
      // threw). Logging res.error means a failure like this actually
      // shows up in the console from now on instead of failing with
      // zero trace anywhere.
      if (res.error) {
        console.error('T2T: profile lookup failed for', userId, res.error);
        return;
      }
      if (res.data) {
        _member.user_id          = userId;
        _member.display_name     = res.data.display_name      || '';
        _member.briefing_board_id= res.data.briefing_board_id || null;
        var nameEl = document.getElementById('jcov-member-name');
        if (nameEl && _member.display_name) nameEl.textContent = _member.display_name.toUpperCase();
        // Larry, July 27 2026 (bug report): the desk nametag stayed
        // stuck on "Traveler" even after a real sign-in -- it used to
        // just poll this profile for ~20 seconds and quietly give up,
        // so anyone who took longer than that to type their email and
        // password (normal) never got their name filled in, even
        // though sign-in itself worked fine. Firing a real event here
        // whenever the profile actually finishes loading -- whether
        // that's on page load or well after a slow manual sign-in --
        // lets the nametag (and anything else that wants it) update
        // immediately instead of guessing at a timeout.
        window.dispatchEvent(new CustomEvent('t2t:member-loaded', { detail: _member }));
        startRealtimeSync();
      } else {
        console.error('T2T: profile lookup returned no row and no error for', userId, res);
      }
    } catch(e) { console.error('T2T: profile lookup threw', e); }
  }

  /* ── NAV STATE ── persisted across phase transitions via sessionStorage */
  var cur         = 's-signin';
  var stack       = [];
  var primaryPage = null;
  var mgOrigin    = null;
  var seaChapterEntry = false; /* true only when ISB was entered via the normal CREATE chapter flow (not via the ☰ backpack) */
  // Generic exit-return override, added July 21, 2026 for the Briefing
  // Board's Unhooking Ideas hand-off -- lets a screen say "when the
  // Storyboard closes via X, come back to ME specifically" instead of
  // always falling back to the backpack menu. A plain function (not a
  // screen id string) so the caller can also restore whatever state it
  // needs (e.g. reopening a specific card), not just navigate. Same
  // shape as seaChapterEntry just above -- set on the way in, consumed
  // (read-once) on the way out.
  var _primaryPages = [];
  var _returnOverride = null;

  (function restoreNavState(){
    try {
      var saved = sessionStorage.getItem('bp_nav');
      if (saved) {
        var s = JSON.parse(saved);
        stack       = s.stack       || [];
        primaryPage = s.primaryPage || null;
        mgOrigin    = s.mgOrigin    || null;
        sessionStorage.removeItem('bp_nav');
      }
    } catch(e) {}
  })();

  function persistNavState() {
    try {
      sessionStorage.setItem('bp_nav', JSON.stringify({
        stack:stack, primaryPage:primaryPage, mgOrigin:mgOrigin
      }));
    } catch(e) {}
  }

  // July 22, 2026, Larry: called after a session resume (see index.html's
  // _resumeSession and this file's own DOMContentLoaded) instead of always
  // landing on a fixed screen -- tries the last screen actually visited
  // first (by page number, so it works the same regardless of which file
  // registered it), and only falls back to fallbackId if there's nothing
  // saved yet or that screen isn't available in this file.
  function resumeToLastPageOr(fallbackId){
    // Wrapped in its own try/catch, July 22, 2026 -- Larry hit a case
    // where something in this path (or whatever a screen's own activate
    // callback does once nav() reaches it) left the sign-in button
    // stuck forever on "Signing in..." because nothing downstream ever
    // got a chance to reset it. This must never throw back to a caller
    // that isn't expecting it -- worst case, fall back to fallbackId.
    try{
      var lastNum=null;
      try{ lastNum=localStorage.getItem('bpLastPageNum'); }catch(e){}
      if(lastNum){
        var localId=_pageNumsReverse[lastNum];
        // Belt-and-suspenders alongside the nav() guard above -- never
        // "return" to the sign-in screen itself, even if an older stored
        // value somehow still points there.
        // push:false, added August 1 2026 -- Larry: "closing storyboard
        // went to sign in screen not storyboard button." cur is still
        // 's-signin' (its initial value) at the exact moment this runs,
        // so a plain nav() here pushed it onto the real navigation
        // stack every single reload -- and goBackStack (used by 1010/
        // 9711's own close button) will happily pop right back to it
        // later. Sign-in is never a legitimate "go back" destination
        // once already signed in, so it has no business on that stack
        // at all.
        //
        // Larry, Aug 3 2026 (bug report): "When I signed in it went to
        // an OBSOLETE idea board called What do you want? It claims to
        // be in the Wish Tank project but that is not true!!" Root
        // cause: this is the ONE entry point into 1010 (the Idea
        // Storyboard, s-sea-of-ideas-cluster) that was still a bare
        // nav() call -- every other entry point (desk button, TOOLS
        // menu, TOC links) was already fixed back on Aug 1 to go
        // through T2TMedia.openBoardResume() instead, precisely
        // because a bare nav() here leaves currentTopicId null and 1010
        // renders its blank-project fallback chrome (TOPIC "What do you
        // want?", PROJECT hardcoded to read "Wish Tank" even though no
        // real project is selected at all). Nothing was ever actually
        // saved as an obsolete board -- this was always just that same
        // fallback display, reachable one path Aug 1's fix missed:
        // sign-in/reload resuming a session that was last left sitting
        // on 1010 with no topic resolved. Same treatment as every other
        // entry point now: resolve a real topic first, THEN land on the
        // screen, instead of landing blank and hoping something fixes
        // it up afterward.
        if(localId==='s-sea-of-ideas-cluster' && window.T2TMedia && window.T2TMedia.openBoardResume){
          window.T2TMedia.openBoardResume(false);
          return;
        }
        if(localId && localId!=='s-signin' && document.getElementById(localId)){ nav(localId, false); return; }
      }
      if(document.getElementById(fallbackId)) nav(fallbackId, false);
    }catch(e){
      console.error('resumeToLastPageOr failed, falling back to', fallbackId, e);
      try{ if(document.getElementById(fallbackId)) nav(fallbackId); }catch(e2){}
    }
  }

  // The actual "reset" shortcut -- Larry: a button to reload the site and
  // land back on the current page, instead of the manual reload-then-
  // re-navigate dance. bpLastPageNum is already kept fresh by nav() above,
  // so there's nothing extra to stash here; a plain reload is enough, and
  // resumeToLastPageOr (run from the session-resume flow on the other
  // side of the reload) does the actual returning.
  function resetAndReturn(){
    window.location.reload();
  }

  // July 22, 2026, Larry: wants a keyboard shortcut too, not just the
  // button. F3 didn't actually work -- Chrome grabs it for its own
  // "Find Next" before page JS ever sees it, preventDefault or not.
  // Ctrl+Alt+R came next and DID work, but felt awkward to reach with
  // one hand; asked for Alt+C instead. Not reserved by Chrome/Firefox/
  // Edge on Windows or Mac. Checked via e.code ('KeyC') rather than
  // e.key -- on a Mac, Option+C types the character "ç", so e.key
  // would come through as that instead of "c"; e.code reports the
  // physical key regardless of what character a modifier+layout
  // combination produces, so this works the same on both platforms.
  // Global (works from any screen, matching the button living in both
  // the backpack menu and, more importantly per Larry, right on the
  // Briefing Board itself).
  document.addEventListener('keydown', function(e){
    if(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code==='KeyC'){
      e.preventDefault();
      resetAndReturn();
    }
  });

  /* ── GEMS REGISTRY ── */
  var _gemsRegistry = {};

  function registerGems(screenId, candidates) {
    _gemsRegistry[screenId] = candidates || [];
  }

  function getGemCandidates() {
    return _gemsRegistry[cur] || [];
  }

  /* ── TRIVIA REGISTRY ── */
  var _triviaRegistry = {};
  var _triviaScreens = [];   /* all screen IDs registered as trivia targets */
  var _triviaOverride = null; /* forces renderTrivia() to use this screen's registry instead of
                                  primaryPage/mgOrigin — for hub screens (Idea/Journal/Gems) whose
                                  own trivia should show regardless of which primary page launched
                                  the MG. Persists across repeat visits to the Trivia hub while
                                  browsing that hub's cards; cleared in goMG() the moment the MG is
                                  genuinely opened from a real (non-utility) primary page. */

  function registerTrivia(screenId, links) {
    _triviaRegistry[screenId] = links || [];
    /* track the target screen IDs so goBack() can identify trivia pages */
    (links||[]).forEach(function(link){
      if(link.target && _triviaScreens.indexOf(link.target)===-1)
        _triviaScreens.push(link.target);
    });
  }

  function renderTrivia() {
    var el = document.getElementById('trivia-links');
    if (!el) return;
    el.innerHTML = '';
    var ctxLbl = document.getElementById('trivia-ctx-label');
    if (ctxLbl) ctxLbl.textContent = getCtx() + ' · TRIVIA';
    // Hub trivia (Idea/Journal/Gems) takes priority when set; otherwise primary page or mgOrigin — no stack walk
    var links = (_triviaOverride && _triviaRegistry[_triviaOverride]) || _triviaRegistry[primaryPage] || _triviaRegistry[mgOrigin] || [];
    if (!links.length) {
      el.innerHTML = '<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-style:italic;color:#aaa;padding:16px 0">Nothing here yet.</div>';
      return;
    }
    links.forEach(function(link) {
      var div = document.createElement('div');
      var pn = _pageNums[link.target];
      div.className = 'more-link' + (pn && getVisited().indexOf(pn)!==-1 ? ' visited' : '');
      div.innerHTML =
        '<div class="more-link-left">' +
          '<div class="more-link-icon">' + (link.icon || '✦') + '</div>' +
          '<div><div class="more-link-label">' + link.label + '</div>' +
          (link.sub ? '<div class="more-link-sub">' + link.sub + '</div>' : '') +
          '</div></div>' +
        '<div class="more-link-arrow"></div>';
      div.addEventListener('click', function() { nav(link.target); });
      el.appendChild(div);
    });
  }

  /* ── CONTEXT MAP ── */
  var _ctxMap = {};
  function registerCtx(screenId, label) { _ctxMap[screenId] = label; }
  function getCtx() {
    if (_ctxMap[cur]) return _ctxMap[cur];
    for (var i = stack.length - 1; i >= 0; i--) { if (_ctxMap[stack[i]]) return _ctxMap[stack[i]]; }
    return 'Field Guide';
  }

  /* ── MAP + MORE CONFIG ── */
  var _mapMap  = {};
  var _moreMap = {};
  function registerMap(screenId, mapScreenId)   { _mapMap[screenId]  = mapScreenId; }
  function registerMore(screenId, moreScreenId) { _moreMap[screenId] = moreScreenId; }

  /* ── PAGE NUMBERS ── */
  var _pageNums = {};
  var _pageNumsReverse = {};
  function registerPageNum(screenId, num) { _pageNums[screenId] = num; _pageNumsReverse[num] = screenId; }

  /* ── SCREEN ACTIVATE REGISTRY ── lets a standalone module (e.g. sea-of-ideas.js)
     hook a render function to its own screen ID without backpack.js needing to
     know that screen exists. nav() calls this generically for every screen. */
  var _screenActivate = {};
  function registerScreenActivate(screenId, fn) { _screenActivate[screenId] = fn; }

  /* ── UTILITY SCREENS ── */
  var _utilScreens = [
    's-trivia','s-cover-more','s-invention-more','s-want-more','s-know-more',
    's-what-is-t2t','s-t2t-goals','s-authors',
    's-thoughts-1','s-thoughts-2','s-thoughts-3',
    's-idea',
    's-journal','s-journal-landing','s-journal-capture','s-journal-cover',
    's-journal-view','s-journal-entry',
    's-gems','s-gem-add','s-gems-list',
    's-search',
    's-tools','s-question','s-create','s-shape-tools','s-share','s-dare',
    's-configure','s-change-password','s-sea-of-ideas'
    // 's-sea-of-ideas-cluster' (1010, the real Idea/Planning Storyboard)
    // removed from this list Aug 3 2026 -- it has its own dedicated
    // close routine now (T2TStoryboard.closeBoard / the board's own X),
    // same as 's-briefing-board' and 's-idea-session' already correctly
    // never sat here. Leaving it registered as a "utility screen" made
    // the generic goBack() treat it as an old backpack-hub destination
    // and reopen the obsolete \u2630 backpack menu on close instead of
    // actually closing the board. Larry, Aug 3 2026: "closing storyboard
    // went to obsolete backpack rather than to storyboard button."
  ];
  // Screens that legitimately take over #fg-root as position:fixed
  // full-viewport (isx-full) -- each one adds the class itself on entry
  // (see briefing-board.js, gems.js, idea-storyboard-9710.js, session.js)
  // but only removed it via its OWN dedicated close button (X / end
  // session). Any other way of leaving -- the 🔍 "jump to menu" icon,
  // the backpack, the Alt+C reset-and-return shortcut -- skipped that
  // cleanup and left isx-full stuck, so whatever screen you landed on
  // next (e.g. Tools) rendered full-viewport too, since the CSS rule is
  // unconditional on #fg-root, not scoped to these screens. Larry hit
  // this July 22, 2026 ("screen is once again full and not widget
  // size?") after jumping from the Briefing Board to Tools via the
  // menu. Fixed centrally in nav() below instead of chasing every exit
  // path individually.
  var _fullScreenScreens = ['s-briefing-board','s-gems-board','s-sea-of-ideas-cluster','s-idea-session'];
  function registerUtilScreen(screenId) {
    if (_utilScreens.indexOf(screenId) === -1) _utilScreens.push(screenId);
  }

  /* ── VISITED PAGES ── */
  function getVisited() { try { var v=sessionStorage.getItem('visitedPages'); return v?JSON.parse(v):[]; } catch(e){ return []; } }
  function addVisited(num) {
    if (!num) return;
    try { var v=getVisited(); if(v.indexOf(num)===-1){ v.push(num); sessionStorage.setItem('visitedPages',JSON.stringify(v)); upsertVisited(num); } } catch(e){}
  }
  async function upsertVisited(num) {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return;
      await _sb.from('visited_pages').upsert({user_id:user.data.user.id,page_num:num},{onConflict:'user_id,page_num'});
    } catch(e){}
  }
  async function loadVisitedFromSupabase() {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return;
      var res=await _sb.from('visited_pages').select('page_num').eq('user_id',user.data.user.id);
      if(res.data){ sessionStorage.setItem('visitedPages',JSON.stringify(res.data.map(function(r){return r.page_num;}))); }
    } catch(e){}
  }

  /* ── TRAVEL SPINNER — pocket watch ──
     Shown the instant a screen switches, hidden once that screen's own
     activate function is done — instantly for static screens (no visible
     flash), or until the data actually arrives for ones that fetch. A
     safety-net timeout hides it regardless if something never resolves, so
     it can never get stuck spinning forever. Locked July 16, 2026. */
  var _spinnerHideTimer=null;
  function showTravelSpinner(){
    var sp=document.getElementById('travel-spinner');
    if(!sp) return;
    sp.classList.add('active');
    if(_spinnerHideTimer) clearTimeout(_spinnerHideTimer);
    _spinnerHideTimer=setTimeout(hideTravelSpinner, 5000);
  }
  function hideTravelSpinner(){
    var sp=document.getElementById('travel-spinner');
    if(sp) sp.classList.remove('active');
    if(_spinnerHideTimer){ clearTimeout(_spinnerHideTimer); _spinnerHideTimer=null; }
  }

  /* ── CORE NAV ── */
  function nav(id, push) {
    var t=document.getElementById(id); if(!t) return;
    var fg=document.getElementById('fg-root');
    var pool=document.getElementById('bp-util-pool');
    if(pool&&fg&&t.parentNode===pool){ fg.appendChild(t); }
    document.querySelectorAll('.sc').forEach(function(s){ s.classList.remove('active'); });
    t.classList.add('active');
    // Sign-in (0010) has no desk around it yet -- it's the gate before
    // the Desktop chrome exists for this traveler, so the nav rail,
    // right drawer, and TV frame all stay hidden while it's showing.
    // Larry, July 28 2026.
    document.body.classList.toggle('t2t-bare-screen', id === 's-signin');
    // 0010 predates the desk entirely -- render centered regardless of
    // wherever the widget was last dragged to on a real (signed-in)
    // screen, and restore that saved spot the moment nav() leaves
    // sign-in again. Larry, July 28 2026 (bug report: sign-in
    // rendering high on screen instead of centered, because the TV
    // frame's last drag position was still being force-applied even
    // though sign-in has no TV frame to drag it back with).
    if (id === 's-signin') {
      if (fg) { fg.style.position=''; fg.style.left=''; fg.style.top=''; fg.style.margin=''; }
    } else {
      try {
        var savedPos = JSON.parse(localStorage.getItem('t2t-widget-pos'));
        // Larry, Aug 1 2026: stored/restored by CENTER, not top-left --
        // screen-fit.js's live scale transform means a scaled box's
        // rendered top-left shifts with whatever scale is in effect,
        // while its rendered center stays exactly equal to its layout
        // center no matter the scale. Restoring by center is what
        // actually keeps a moved widget where it was put, even across
        // screens with a different natural height (and so a different
        // scale).
        if (fg && savedPos && typeof savedPos.cx==='number' && typeof savedPos.cy==='number') {
          // Larry, Aug 1 2026 (bug report): "almost off the apple
          // screen" -- a saved center from one screen size (or an
          // older, larger monitor) can land partway or entirely off a
          // smaller one. Clamp the center so the widget stays fully
          // on-screen. Uses the widget's CURRENT rendered box (already
          // reflects whatever scale screen-fit.js has it at right now)
          // rather than a worst-case guess at its scale -- an earlier
          // version of this fix used a flat 1.45x-of-natural-size
          // margin, which was so conservative it fought a traveler's
          // own repositioning on a small screen ("moving widget to more
          // readable position... reverted to the previous less
          // readable position" -- the honest fix is to only push back
          // when a position is genuinely off-screen, not pre-emptively
          // narrow where it's allowed to go).
          var _w=fg.offsetWidth, _h=fg.offsetHeight;
          var _rr=fg.getBoundingClientRect(), _rw=_rr.width||_w, _rh=_rr.height||_h;
          var _mx=_rw/2+24, _my=_rh/2+24;
          var _cx=(2*_mx<window.innerWidth) ? Math.max(_mx, Math.min(savedPos.cx, window.innerWidth-_mx)) : window.innerWidth/2;
          var _cy=(2*_my<window.innerHeight) ? Math.max(_my, Math.min(savedPos.cy, window.innerHeight-_my)) : window.innerHeight/2;
          fg.style.position='fixed'; fg.style.left=(_cx - _w/2)+'px'; fg.style.top=(_cy - _h/2)+'px'; fg.style.margin='0';
        }
      } catch(e){}
    }
    // Safety net for the isx-full full-viewport takeover -- see
    // _fullScreenScreens above. Landing anywhere that isn't one of
    // those screens means any leftover isx-full is stale.
    if (_fullScreenScreens.indexOf(id)===-1 && fg && fg.classList.contains('isx-full')) {
      fg.classList.remove('isx-full');
      fg.classList.remove('sb-wide');
    }
    // Larry, Aug 4 2026 (bug report): closing the Briefing Board could
    // land back on it (e.g. via returnToMG()'s mgOrigin, or stale
    // sessionStorage nav state from an earlier test) via this generic
    // nav() rather than briefing-board.js's own dedicated open path --
    // the only place that was adding isx-full (see its own
    // registerScreenActivate). Without it, Briefing Board's CSS
    // (`#fg-root.isx-full #s-briefing-board.active{...}`) never
    // applied, so it rendered squished into the normal small widget
    // frame instead of full-screen -- looked like "too tall" content
    // cramped into the TV frame, and the frame itself reads "widened"
    // since it was still tracking #fg-root's real (now content-
    // overflowed) size. Added the symmetric case: landing ON a
    // full-screen screen via ANY path now adds isx-full here too, so
    // it's never possible to reach one of these screens without the
    // right full-screen treatment, regardless of which caller's nav()
    // call got it there.
    if (_fullScreenScreens.indexOf(id)!==-1 && fg && !fg.classList.contains('isx-full')) {
      fg.classList.add('isx-full');
    }
    if (push!==false) stack.push(cur);
    cur=id;
    if (_primaryPages.indexOf(id)!==-1) primaryPage=id;
    var pn=_pageNums[id]; if(pn) addVisited(pn);
    // July 22, 2026, Larry: wants a shortcut to reload the site (to pick
    // up a fresh code push) and land back on the same screen, instead of
    // manually re-navigating every time. Track the most recent numbered
    // screen continuously (not just on an explicit "reset" click) so it's
    // always current, however the reload actually happens.
    // Never record s-signin itself -- otherwise landing there (signed
    // out, or before a fresh sign-in) becomes "the page to return to,"
    // and a successful sign-in immediately bounces right back to it --
    // an infinite sign-in loop Larry hit in practice.
    if(pn && id!=='s-signin'){ try{ localStorage.setItem('bpLastPageNum', pn); }catch(e){} }
    // Separate from bpLastPageNum above (which must never point at
    // sign-in -- that's the loop guard for right after a successful
    // sign-in). This one tracks the literal current screen, sign-in
    // included, purely so a refresh can return to the exact screen it
    // came from instead of always bouncing a signed-in traveler
    // forward. Larry, July 28 2026.
    if(pn){ try{ localStorage.setItem('bpCurrentScreenNum', pn); }catch(e){} }
    showTravelSpinner();
    if (id==='s-trivia')          renderTrivia();
    if (id==='s-journal-view')    renderJournalView();
    if (id==='s-journal-cover')   initJournalCover();
    if (id==='s-gems-list')       renderGemsView();
    var _activateResult = _screenActivate[id] ? _screenActivate[id]() : null;
    if (id==='s-change-password') initChangePassword();
    window.scrollTo(0,0);
    if(_activateResult && typeof _activateResult.then==='function'){
      _activateResult.then(hideTravelSpinner, hideTravelSpinner);
    } else {
      hideTravelSpinner();
    }
  }

  function goBack() {
    var ov=document.getElementById('mg-overlay');
    if (ov&&ov.classList.contains('active')){ ov.classList.remove('active'); return; }
    /* trivia content page → always return to trivia hub */
    if (_triviaScreens.indexOf(cur)!==-1){ nav('s-trivia',false); return; }
    /* utility hub → reopen MG overlay */
    if (_utilScreens.indexOf(cur)!==-1){ goMG(); return; }
    /* PP → go to previous PP by page number */
    goBackByNum();
  }

  /* ── NUMERIC BACK NAV ── */
  function currentFile() {
    var path = window.location.pathname;
    return path.substring(path.lastIndexOf('/')+1) || 'index.html';
  }

  async function navToPageNum(num) {
    // Local registry first — no Supabase needed if screen is in this file
    var localId = _pageNumsReverse[num];
    // Same guard resumeToLastPageOr already has (Aug 1 2026 bug fix) --
    // a bare nav() into 1010 (the Idea Storyboard) leaves currentTopicId
    // null, which renders 1010's blank-project fallback chrome ("What
    // do you want?" / a project that isn't real). This function was the
    // one remaining entry point still missing that guard -- exposed
    // Aug 7 2026 once the Sign-In-on-reload race was fixed and a
    // session's own remembered screen (bpCurrentScreenNum) could
    // actually reach here and be 1010.
    if(localId==='s-sea-of-ideas-cluster' && window.T2TMedia && window.T2TMedia.openBoardResume){
      window.T2TMedia.openBoardResume(false);
      return;
    }
    if (localId && document.getElementById(localId)) {
      nav(localId, false);
      return;
    }
    // Not found locally — cross-file nav via Supabase
    try {
      var res = await _sb.from('pages').select('*').eq('page_num',num).single();
      if (!res.data) return;
      var page = res.data;
      if (page.phase_file === currentFile()) {
        nav(page.screen_id, false);
      } else {
        sessionStorage.setItem('bp_target', num);
        goPhase(page.phase_file);
      }
    } catch(e) { console.warn('navToPageNum failed:', e); }
  }

  async function goBackByNum() {
    var curNum = _pageNums[cur];
    if (!curNum) { if(stack.length>0) nav(stack.pop(),false); return; }
    // Find nearest lower page number in local registry first
    var nums = Object.keys(_pageNumsReverse).sort();
    var lower = null;
    for (var i = nums.length-1; i >= 0; i--) {
      if (nums[i] < curNum) { lower = nums[i]; break; }
    }
    if (lower) {
      var localId = _pageNumsReverse[lower];
      if (localId && document.getElementById(localId)) {
        nav(localId, false);
        return;
      }
    }
    // Not found locally — try Supabase for cross-file back nav
    try {
      var res = await _sb.from('pages')
        .select('*')
        .in('page_type', ['pp','phase'])
        .lt('page_num', curNum)
        .order('page_num', {ascending:false})
        .limit(1)
        .single();
      if (!res.data) { if(stack.length>0) nav(stack.pop(),false); return; }
      var page = res.data;
      if (page.phase_file === currentFile()) {
        nav(page.screen_id, false);
      } else {
        sessionStorage.setItem('bp_target', page.page_num);
        goPhase(page.phase_file);
      }
    } catch(e) { if(stack.length>0) nav(stack.pop(),false); }
  }

  function goMG() {
    if (_utilScreens.indexOf(cur)===-1) { mgOrigin=cur; _triviaOverride=null; }
    else if (!mgOrigin) {
      // Safety net, July 22 2026 -- Larry: "closing screens is not
      // working, stuck on menu screen 9000." Root cause: if the
      // traveler lands directly on a utility screen (e.g. the Briefing
      // Board resumed on reload) without ever passing through the
      // backpack first, mgOrigin is never recorded. Pressing back then
      // closed the backpack only to have goBack() reopen it immediately
      // (still sitting on that same utility screen), an invisible loop
      // that looked like the menu was simply stuck. Falling back to the
      // traveler's home screen here means there's always somewhere real
      // to land.
      mgOrigin = primaryPage || _primaryPages[0] || null;
    }
    var ov=document.getElementById('mg-overlay');
    if (ov) ov.classList.add('active');
  }

  function closeMG(){ var ov=document.getElementById('mg-overlay'); if(ov) ov.classList.remove('active'); }

  /* ── RETURN TO MG ── used by every backpack screen's ⬅️ (Map, Idea, Journal,
     Gems, Tools, Trivia). Used to also reopen the MG overlay on top of the
     origin page, restoring exactly the state the traveler left -- Larry,
     July 29 2026: skip that now and land directly on the origin page with
     no backpack overlay showing, since the backpack itself is on its way
     to the archive. Name kept as-is (still "the thing every hub's ⬅️
     calls") even though it no longer reopens the MG. */
  function returnToMG(){
    // Larry, Aug 4 2026 (bug report): closing the Briefing Board (or any
    // other full-screen hub reached directly, e.g. right after sign-in,
    // without ever passing through the backpack menu first) left
    // mgOrigin unset, so this fell through to goBack() -- which, for a
    // screen not in _utilScreens, means goBackByNum()'s unpredictable
    // numeric lookup instead of a real destination. In practice that
    // surfaced as a shrunk/mispositioned widget and the obsolete
    // backpack menu popping open on the next interaction, when the
    // traveler should have just landed on Cover. Falling back to
    // primaryPage / _primaryPages[0] mirrors the same safety net
    // goMG() already uses (that array is seeded with 's-cover' first
    // via index.html's setPrimaryPages call), so there's always a real,
    // correct screen to land on.
    //
    // Same day, follow-up bug report: "Closing Briefing Board still
    // goes [to] the deleted backpack screen" / "Closing the backpack
    // went to that too tall tv frame again." Root cause: this trusted
    // mgOrigin blindly the moment it was truthy, with no check that
    // it still points at something real or sane. A stale value can
    // survive across reloads in the same tab (mgOrigin round-trips
    // through sessionStorage via persistNavState/restoreNavState), so
    // a value set before an earlier fix -- pointing at a screen since
    // archived, or at a full-screen hub like Briefing Board itself --
    // kept getting reused: nav()-ing straight to a full-screen hub
    // this way skips the isx-full setup only that hub's own open path
    // adds (see nav()'s own fix just above), which is the "too tall"/
    // "widened" rendering. mgOrigin is now validated before being
    // trusted: it must point to a real element still in the DOM, and
    // it must not be one of the full-screen hubs (those always need
    // their own dedicated entry, never a bare nav()). Anything invalid
    // falls through to the same Cover-first fallback as an unset
    // mgOrigin, instead of being trusted at face value.
    var mgOriginValid = mgOrigin && document.getElementById(mgOrigin) &&
      _fullScreenScreens.indexOf(mgOrigin) === -1;
    if (mgOriginValid){ nav(mgOrigin,false); }
    else if (primaryPage || _primaryPages[0]){ nav(primaryPage || _primaryPages[0], false); }
    else { goBack(); }
  }

  function goMap() {
    closeMG();
    var srcNum=_pageNums[cur]||null;
    var m=_mapMap[cur];
    if(!m){ for(var i=stack.length-1;i>=0;i--){ if(_mapMap[stack[i]]){ m=_mapMap[stack[i]]; break; } } }
    nav(m||'s-cover-map');
    if (window.T2T && window.T2T.renderMap) window.T2T.renderMap(srcNum);
  }

  function goMore() {
    closeMG();
    var m=_moreMap[primaryPage]||_moreMap[cur];
    if(!m) return;
    nav(m);
  }

  function goPhase(url) { persistNavState(); window.location.href=url; }

  /* ── HIDDEN MICKEY — triple-tap reveals page number ── */
  (function(){
    var _tapCount = 0, _tapTimer = null;
    function showPageToast(num) {
      var existing = document.getElementById('hm-toast');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.id = 'hm-toast';
      toast.textContent = '📍 ' + num;
      toast.style.cssText = [
        'position:fixed','bottom:72px','left:50%','transform:translateX(-50%)',
        'background:rgba(10,74,56,0.92)','color:#C9A87C',
        'font-family:Playfair Display,serif','font-size:13px','font-weight:700',
        'letter-spacing:4px','padding:8px 20px','border-radius:20px',
        'box-shadow:0 4px 16px rgba(0,0,0,0.35)','z-index:9999',
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
    document.addEventListener('click', function(e){
      if (e.target.closest('button, a, input, textarea, select, [role="button"], .mg-btn, .mg-ret, .spark-door, .ib, .jb, .gb, .tb, .more-link, .tool-row, .save-btn, .jsave-btn, .gsave-btn')) return;
      _tapCount++;
      clearTimeout(_tapTimer);
      _tapTimer = setTimeout(function(){ _tapCount = 0; }, 500);
      if (_tapCount >= 3){
        _tapCount = 0;
        var ov=document.getElementById('mg-overlay');
        var mgOpen = ov && ov.classList.contains('active');
        // 1170/9713/14/15 capture cards never call nav() — by design, they sit
        // on top of whatever screen is active without disturbing it (see
        // idea-capture.js header). That means `cur` still points at the
        // HOST screen (9710 or 9711) while one of these is open, so this
        // toast kept reporting the host's number instead of the card's own.
        // Fixed July 17, 2026 — same priority pattern as mgOpen above,
        // using the public IdeaCapture.isOpen()/currentPageNum() API.
        var icOpen = window.IdeaCapture && window.IdeaCapture.isOpen && window.IdeaCapture.isOpen();
        // IDEA CARD (1011 as of Aug 19, 2026 -- was DETAILS/9716; the
        // shared Storyboard/Session card-back overlay) has the exact same
        // "sits on top without calling nav()" problem the 1170/9713-9715
        // fix above already covers -- just never got added to this check,
        // so triple-clicking the card back still reported whatever host
        // screen (9710/9711, now 1010/1014) was underneath it. Larry, July
        // 18, 2026.
        var detailOv=document.getElementById('sb-detail-overlay');
        var detailOpen = !!(detailOv && detailOv.classList.contains('active'));
        // CLUSTER (1211 as of Aug 19, 2026 -- was 9717) and the Moose Poop
        // trash confirmation (1221 as of Aug 19, 2026 -- was 9718) have the
        // exact same "sits on top without calling nav()" problem IDEA CARD
        // (1011) had - same fix, same reasoning. Every screen is a Touch
        // Point and gets its own number, no exceptions. Larry, July 19,
        // 2026. Renumbered into the Dream-phase methodology family
        // (1200/1210/1220/1230/1240 -- see FG Design Notes) Aug 19, 2026.
        var clusterOv=document.getElementById('sb-cluster-overlay');
        var clusterOpen = !!(clusterOv && clusterOv.classList.contains('active'));
        var trashOv=document.getElementById('sb-trash-overlay');
        var trashOpen = !!(trashOv && trashOv.style.display==='flex');
        // Briefing Board's own two overlays (Add a Card / Back of the
        // Card) have the identical "sits on top without calling nav()"
        // situation as DETAILS/CLUSTER/trash above -- same fix, same
        // reasoning. Larry, July 20, 2026.
        var bbAddOv=document.getElementById('bb-add-overlay');
        var bbAddOpen = !!(bbAddOv && bbAddOv.classList.contains('active'));
        var bbDetailOv=document.getElementById('bb-detail-overlay');
        var bbDetailOpen = !!(bbDetailOv && bbDetailOv.classList.contains('active'));
        // Add a Signal Flag (9390) has the same "sits on top without calling nav()"
        // situation as the other Briefing Board overlays above -- same fix.
        // Larry, July 21, 2026.
        var bbKeyBuilderOv=document.getElementById('bb-keybuilder-overlay');
        var bbKeyBuilderOpen = !!(bbKeyBuilderOv && bbKeyBuilderOv.classList.contains('active'));
        // Choose a Signal Flag (9395) -- same situation as 9390 above.
        var bbKeyPickerOv=document.getElementById('bb-keypicker-overlay');
        var bbKeyPickerOpen = !!(bbKeyPickerOv && bbKeyPickerOv.classList.contains('active'));
        // Screen 0000 (the plain gray backdrop) and 0020 (the nav bar
        // that rides on top of it) both live OUTSIDE the widget
        // (#fg-root), so neither one has a `cur` screen id to look up in
        // _pageNums. Larry, July 26 2026: triple-tapping the backdrop
        // itself should read 0000; triple-tapping the nav bar (its own
        // background, not its gear button -- that's already excluded
        // above like any other button) should read 0020.
        //
        // Later same-day follow-up: both side drawers now show one of
        // three "mode" panels depending on how many quick taps their
        // own toggle got (screen-zero.js's wireModeToggle) -- 0001/0002/
        // 0003 for the left drawer's slots, 0004/0005/0006 for the new
        // right drawer's. "Related to 0000 more than any phase or other
        // screen" per Larry, July 26 -- these live in the 000x block,
        // same as 0000/0020, not registered via the normal per-screen
        // _pageNums system. Collapsed still just reads as the drawer's
        // own base number (0020 for the left, same as before; the right
        // drawer didn't have a number before it existed, so collapsed
        // there just falls through to 0000 like empty backdrop always
        // has).
        var leftBar = document.getElementById('sz-navbar');
        var rightBar = document.getElementById('sz-drawer-r');
        var onNavBar = !!e.target.closest('#sz-navbar');
        var onRightDrawer = !!e.target.closest('#sz-drawer-r');
        var outsideWidget = !e.target.closest('#fg-root');
        var LEFT_MODE_NUMS = { '1':'0001', '2':'0002', '3':'0003' };
        var RIGHT_MODE_NUMS = { '1':'0004', '2':'0005', '3':'0006' };
        var leftNum = (leftBar && !leftBar.classList.contains('sz-collapsed'))
          ? (LEFT_MODE_NUMS[leftBar.dataset.mode] || '0020') : '0020';
        var rightNum = (rightBar && !rightBar.classList.contains('sz-collapsed'))
          ? (RIGHT_MODE_NUMS[rightBar.dataset.mode] || '0000') : '0000';
        // TV frame is 0007 -- Larry's confirmed direction, July 27 2026.
        // The frame ring (#tv-frame) has pointer-events:none so it can
        // let clicks pass through to whatever's underneath (the widget
        // drag surface, the 0000 backdrop); that means e.target.closest
        // never actually lands on it, unlike sz-navbar/sz-drawer-r
        // above. So this checks geometry instead: is the click inside
        // the frame's own visible rect, but outside the widget and off
        // both drawers? Only counts while the frame is actually shown
        // (it hides itself during full-screen outputs).
        var tvFrameEl = document.getElementById('tv-frame');
        var onTvFrameRing = false;
        if (tvFrameEl && outsideWidget && !onNavBar && !onRightDrawer &&
            !tvFrameEl.classList.contains('tv-frame-hidden')) {
          var tvR = tvFrameEl.getBoundingClientRect();
          onTvFrameRing = e.clientX >= tvR.left && e.clientX <= tvR.right &&
                          e.clientY >= tvR.top && e.clientY <= tvR.bottom;
        }
        var outsideNum = onNavBar ? leftNum : (onRightDrawer ? rightNum : (onTvFrameRing ? '0007' : (outsideWidget ? '0000' : (_pageNums[cur] || '—')))); // backdrop renamed C001 -> 0000, July 31 2026, Larry: closing the desk via the TV X now leaves a real near-blank state (just the embossed T2T watermark + the two empty drawers) reachable and visible like any other screen, so it earns a screen number instead of a Component id (was A001, then C001 as of July 28 2026's Library A/M/T-prefix cleanup).
        var num = mgOpen ? '9000' : (icOpen ? window.IdeaCapture.currentPageNum() : (trashOpen ? '1221' : (clusterOpen ? '1211' : (detailOpen ? '1011' : (bbAddOpen ? '4020' : (bbDetailOpen ? '4030' : (bbKeyBuilderOpen ? '4050' : (bbKeyPickerOpen ? '4055' : outsideNum))))))));
        showPageToast(num);
      }
    });
  })();

  function wire(id,fn){ var el=document.getElementById(id); if(el) el.addEventListener('click',fn); }

  function togglePh(id){
    var el=document.getElementById(id),tog=document.getElementById(id+'-tog'); if(!el) return;
    var hidden=el.classList.contains('phd')||el.style.display==='none';
    if(hidden){ el.classList.remove('phd'); el.style.display='flex'; if(tog) tog.textContent='▲'; }
    else      { el.classList.add('phd');    el.style.display='none'; if(tog) tog.textContent='▼'; }
  }

  function setPhOpen(id, open){
    var el=document.getElementById(id),tog=document.getElementById(id+'-tog'); if(!el) return;
    if(open){ el.classList.remove('phd'); el.style.display='flex'; if(tog) tog.textContent='▲'; }
    else     { el.classList.add('phd');    el.style.display='none'; if(tog) tog.textContent='▼'; }
  }

  /* autoOpenMapPhase moved to tmap.js, July 14, 2026 — setPhOpen stays here
     and is exported below since it's a small generic utility, not Map-specific. */

  /* ── MAP RENDER ── moved to tmap.js, July 14, 2026 (Tmap/Dmap split — see
     FG Standards). backpack.js exposes getCurNum/setPhOpen/getPageNumsReverse
     below so tmap.js (and optionally dmap.js) can build the Map screen
     without needing backpack.js's private closure state directly. */

  // July 23, 2026, Larry: Miro is no longer part of the Field Guide --
  // removed the sticky-note posting, board embeds, and board-id plumbing
  // that used to live here (postIdeaToMiro/postImageToMiro/postGemToMiro/
  // postJournalToMiro/ensureMiroReminder/openJournalMiro/openGemsMiro).


  /* ── JOURNAL ── */
  var _jeEntries=[],_jeIndex=0;

  async function loadEntriesFromSupabase() {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var res=await _sb.from('journal_notes').select('*').eq('user_id',user.data.user.id).order('created_at',{ascending:true});
      if(res.error) return null;
      return res.data||[];
    } catch(e){ return null; }
  }
  async function saveEntryToSupabase(text,pageCtx,topic) {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var now=new Date();
      var dateStr=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      var res=await _sb.from('journal_notes').insert({
        user_id:user.data.user.id,note_text:text,topic:topic||null,
        page_context:pageCtx,entry_date:dateStr,created_at:now.toISOString()
      }).select('id').single();
      if(res.error) return null;
      return res.data.id;
    } catch(e){ return null; }
  }
  async function suggestTopic(noteId,text) {
    try {
      var response=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',max_tokens:40,
          system:'You are a journal assistant. Reply with ONLY a short topic label — 3 to 5 words, title case, no punctuation. Nothing else.',
          messages:[{role:'user',content:'Suggest a topic for this journal note: '+text}]
        })
      });
      var data=await response.json();
      var suggested=(data.content&&data.content[0]&&data.content[0].text||'').trim();
      if(!suggested) return;
      await _sb.from('journal_notes').update({suggested_topic:suggested}).eq('id',noteId);
    } catch(e){}
  }
  function loadEntriesLocal(){ try{ var r=sessionStorage.getItem('jentries'); return r?JSON.parse(r):[]; }catch(e){ return []; } }
  function saveEntryLocal(e){ try{ var a=loadEntriesLocal(); a.push(e); sessionStorage.setItem('jentries',JSON.stringify(a)); }catch(e){} }

  function showEntryAt(entries,idx) {
    if(!entries||!entries.length) return;
    idx=Math.max(0,Math.min(idx,entries.length-1));
    _jeEntries=entries; _jeIndex=idx;
    var e=entries[idx];
    var numEl=document.getElementById('je-num');    if(numEl)  numEl.textContent=String(idx+1).padStart(3,'0');
    var textEl=document.getElementById('je-text');  if(textEl) textEl.textContent=e.note_text||e.text||'';
    var topEl=document.getElementById('je-topic');  if(topEl){ topEl.textContent=e.topic||''; topEl.style.display=e.topic?'block':'none'; }
    var eyeEl=document.getElementById('je-eyebrow');if(eyeEl)  eyeEl.textContent=(e.entry_date||e.date||'')+(e.page_context||e.page?' \u00b7 '+(e.page_context||e.page):'');
    var countEl=document.getElementById('je-nav-count'); if(countEl) countEl.textContent=(idx+1)+' of '+entries.length;
    var prevBtn=document.getElementById('b-je-prev'),nextBtn=document.getElementById('b-je-next');
    if(prevBtn) prevBtn.classList.remove('dim');
    if(nextBtn) nextBtn.classList.toggle('dim',idx===entries.length-1);
  }

  async function renderJournalView() {
    var list=document.getElementById('jv-entries-list'),count=document.getElementById('jv-count');
    if(!list) return;
    list.innerHTML='<div class="jv-empty" style="opacity:.5">Loading\u2026</div>';
    var entries=await loadEntriesFromSupabase();
    if(!entries){ entries=loadEntriesLocal().map(function(e){return{note_text:e.text,entry_date:e.date,page_context:e.page};}); }
    _jeEntries=entries;
    if(!entries.length){ list.innerHTML='<div class="jv-empty">No entries yet.<br>Every journey starts with a first note.</div>'; if(count) count.textContent='Your entries'; return; }
    if(count) count.textContent=entries.length+' '+(entries.length===1?'entry':'entries');
    list.innerHTML='';
    entries.forEach(function(e,i){
      var card=document.createElement('div'); card.className='jcard';
      var text=e.note_text||e.text||'', topic=e.topic||'', suggested=e.suggested_topic||'';
      var preview=text.length>120?text.substring(0,120)+'\u2026':text;
      var eyebrow=(e.entry_date||e.date||'')+(e.page_context||e.page?' \u00b7 '+(e.page_context||e.page):'');
      var topicHtml=topic?'<div class="jcard-topic">'+topic+'</div>':(suggested?'<div class="jcard-suggested">\u2756 '+suggested+'</div>':'');
      card.innerHTML='<div class="jcard-num">'+String(i+1).padStart(3,'0')+'</div>'+topicHtml+'<div class="jcard-text">'+preview+'</div><div class="jcard-eyebrow">'+eyebrow+'</div>';
      card.addEventListener('click',(function(idx){return function(){showEntryAt(_jeEntries,idx);nav('s-journal-entry');};})(i));
      list.appendChild(card);
    });
  }

  async function openJournalView() {
    nav('s-journal-view');
    var attempts=0;
    function tryOpenLatest(){
      if(_jeEntries.length>0){showEntryAt(_jeEntries,_jeEntries.length-1);nav('s-journal-entry');}
      else if(attempts<20){attempts++;setTimeout(tryOpenLatest,100);}
    }
    setTimeout(tryOpenLatest,200);
  }

  function initJournalCover() {
    try{
      var s=sessionStorage.getItem('jstarted');
      if(!s){s=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});sessionStorage.setItem('jstarted',s);}
      var el=document.getElementById('jcov-start'); if(el) el.textContent='Started '+s;
    }catch(e){}
  }

  /* ── GEMS ── */
  function openGemAdd() {
    var candidates=getGemCandidates();
    var ctxEl=document.getElementById('gc-ctx-label'); if(ctxEl) ctxEl.textContent=getCtx();
    var candEl=document.getElementById('gc-candidates');
    if(candEl){
      candEl.innerHTML='';
      candidates.forEach(function(c,i){
        var div=document.createElement('div'); div.className='gc-option';
        div.innerHTML='<input type="checkbox" id="gc-chk-'+i+'" data-idx="'+i+'"><label for="gc-chk-'+i+'" style="flex:1;cursor:pointer"><div class="gc-option-text">'+c.text+'</div>'+(c.attr?'<div class="gc-option-attr">'+c.attr+'</div>':'')+'</label>';
        div.addEventListener('click',function(e){
          if(e.target.tagName!=='INPUT'){var chk=div.querySelector('input');chk.checked=!chk.checked;}
          div.classList.toggle('selected',div.querySelector('input').checked);
          updateGemSaveBtn();
        });
        candEl.appendChild(div);
      });
    }
    var ownTA=document.getElementById('gc-own-text'); if(ownTA) ownTA.value='';
    var status=document.getElementById('gc-status'); if(status) status.textContent='';
    var btn=document.getElementById('b-save-gem'); if(btn) btn.classList.remove('active');
    nav('s-gem-add');
  }

  function updateGemSaveBtn(){
    var anyChecked=document.querySelectorAll('#gc-candidates input:checked').length>0;
    var ownText=(document.getElementById('gc-own-text')||{}).value||'';
    var btn=document.getElementById('b-save-gem');
    if(btn) btn.classList.toggle('active',anyChecked||ownText.trim().length>0);
  }

  async function saveGemToSupabase(text,attr){
    try{
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var res=await _sb.from('gems').insert({
        user_id:user.data.user.id,gem_text:text,attribution:attr||null,
        page_context:getCtx(),created_at:new Date().toISOString()
      }).select('id').single();
      if(res.error) return null;
      return res.data.id;
    }catch(e){return null;}
  }

  async function renderGemsView(){
    var list=document.getElementById('gv-entries-list'),count=document.getElementById('gv-count');
    if(!list) return;
    list.innerHTML='<div class="gv-empty" style="opacity:.5">Loading\u2026</div>';
    try{
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user){list.innerHTML='<div class="gv-empty">Sign in to see your Gems.</div>';return;}
      var res=await _sb.from('gems').select('*').eq('user_id',user.data.user.id).order('created_at',{ascending:false});
      var gems=res.data||[];
      if(!gems.length){list.innerHTML='<div class="gv-empty">No Gems yet.<br>They surface when you\'re ready.</div>';if(count) count.textContent='Your gems';return;}
      if(count) count.textContent=gems.length+' '+(gems.length===1?'gem':'gems');
      list.innerHTML='';
      gems.forEach(function(g,i){
        var card=document.createElement('div'); card.className='gcard';
        var text=g.gem_text||'',attr=g.attribution||'';
        var preview=text.length>120?text.substring(0,120)+'\u2026':text;
        card.innerHTML='<div class="gcard-num">'+String(i+1).padStart(3,'0')+'</div><div class="gcard-text">'+preview+'</div>'+(attr?'<div class="gcard-attr">'+attr+'</div>':'');
        list.appendChild(card);
      });
    }catch(e){list.innerHTML='<div class="gv-empty">Could not load Gems.</div>';}
  }

  /* ── TOOLS PENTAGON ── */
  function drawPentagonArrows(){
    var arrowG=document.getElementById('orb-arrows'); if(!arrowG) return;
    // r matches the pentagon button radius in index.html's #s-tools
    // orbital SVG -- keep both in sync if that radius ever changes
    // again (105->155->138->124 July 22 2026: widened for the doubled
    // font, pulled in once that needed a scroll, pulled in once more
    // once the buttons read a little too big at actual widget size).
    var cx=160,cy=160,r=124,ns='http://www.w3.org/2000/svg';
    for(var i=0;i<5;i++){
      var midRad=(-90+i*72+36)*Math.PI/180;
      var px=cx+r*Math.cos(midRad),py=cy+r*Math.sin(midRad);
      var tx=-Math.sin(midRad),ty=Math.cos(midRad),nx=Math.cos(midRad),ny=Math.sin(midRad),s=9;
      var poly=document.createElementNS(ns,'polygon');
      poly.setAttribute('points',(px+tx*s)+','+(py+ty*s)+' '+(px-tx*s-nx*(s*.7))+','+(py-ty*s-ny*(s*.7))+' '+(px-tx*s+nx*(s*.7))+','+(py-ty*s+ny*(s*.7)));
      arrowG.appendChild(poly);
    }
  }

  /* ── CHANGE PASSWORD ── */
  function initChangePassword(){
    var input=document.getElementById('cp-new-password'),btn=document.getElementById('b-cp-save'),msg=document.getElementById('cp-msg');
    if(input) input.value=''; if(btn) btn.classList.remove('active'); if(msg){msg.textContent='';msg.className='cp-msg';}
  }
  function injectMGOverlay(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('mg-overlay')) return;
    var div=document.createElement('div');
    div.innerHTML='<div class="mg-overlay" id="mg-overlay"><div class="mg-modal"><div class="mg-wrap"><div class="mg-head"><div class="mg-ring">☰</div><div class="mg-ttl">Details</div><div class="mg-desc">Plus places to keep what matters.</div></div><div class="mg-hrule"></div><div class="mg-body"><div class="mg-row"><div class="mg-btn" id="b-mg-map">🧭</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-idea">💡</div><div class="mg-btn" id="b-mg-journal">✏️</div><div class="mg-btn" id="b-mg-search">🔍</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-tools">🛠️</div></div></div></div><div class="mg-bar"><div class="mg-ret" id="b-mg-ret">⬅️</div><div class="mg-ret" id="b-mg-reset" title="Reload and return here (Alt+C)">🔄</div></div></div></div>';
    fg.appendChild(div.firstChild);
    wireMGOverlay();
  }

  function wireMGOverlay(){
    var mgOv=document.getElementById('mg-overlay');
    if(mgOv) mgOv.addEventListener('click',function(e){if(e.target===mgOv) closeMG();});
    wire('b-mg-ret',function(){
      var behind=_utilScreens.indexOf(cur)!==-1;
      closeMG();
      if(behind){ if(mgOrigin){ nav(mgOrigin,false); } else { goBack(); } }
    });
    wire('b-mg-map',goMap);
    wire('b-mg-idea',   function(){
      closeMG();
      // 9611 FOCUS retired from this entry point, July 13, 2026 — 9711 now
      // handles its own sticky last-Topic resume, so the extra gate screen
      // in front of it is redundant. FOCUS is still used elsewhere (e.g.
      // entering the Storyboard directly, b-sea-ideas below).
      if(window.T2TSea && window.T2TSea.openIdeaCapture){
        var ctx=(window.T2TSea.getCurrentBoardContext)?window.T2TSea.getCurrentBoardContext():null;
        ctx=ctx||{};
        // Clicking 💡 in the backpack means "I want to add an idea," not
        // "show me the board" — Locked July 18, 2026. 1170 auto-opens on
        // top of 9711 the moment it lands, rather than requiring a second
        // tap once there.
        ctx.autoOpenCapture=true;
        window.T2TSea.openIdeaCapture(ctx);
      } else console.error('Idea capture unavailable — window.T2TSea.openIdeaCapture is missing (session.js failed to load?). The old 9210-legacy fallback screen was removed July 18, 2026, so there is no longer a second path here.');
    });
    wire('b-mg-journal',function(){closeMG();nav('s-journal',false);});
    // 🔍 Search hub — Larry, July 20, 2026: "using a magnifying glass along
    // the path in the forest where you might find interesting flowers or
    // precious gems." Replaces the old direct Gems slot in this row; Trivia
    // and Gems both moved one step deeper onto their own shared landing
    // page (s-search, 9800) instead of sitting directly in the backpack.
    wire('b-mg-search', function(){closeMG();nav('s-search', false);});
    wire('b-trivia-back', returnToMG);
    wire('b-trivia-mg',   goMG);
    wire('b-mg-tools',  function(){closeMG();nav('s-tools',  false);});
    wire('b-mg-reset', resetAndReturn);
  }

  /* ── BACKPACK SCREEN WIRING ── */
  function wireBackpack(){
    /* ── BACKPACK PAGE NUMBERS (per Notion 9000 series) ── */
    registerPageNum('s-cover-map',   '9100');
    registerPageNum('s-idea',        '9200');
    // s-idea-capture/theme/paste/link/custom (9210-legacy, 9211-9214)
    // registrations removed July 18, 2026 along with the screens
    // themselves — see idea-media-shared.js.
    registerPageNum('s-idea-session','1014'); /* was 9210, then 9711 (renumbered July 13, 2026 into the 9700-9799 Storyboard family) -- renumbered again Aug 9 2026, out of the 9700s and into the Dream Phase 1000s sequence, right after ISB (1010), same move ISB itself made from 9710. */
    registerPageNum('s-journal',        '9300');
    // 9300 became the NOTES chooser (Journal vs Briefing Board) July 19,
    // 2026 -- the Add Note/View Journal buttons that used to live directly
    // on 9300 moved one step deeper onto their own screen, so they get
    // their own number too: 9300.1, decimal off the Notes hub, same
    // pattern as Trivia (0100.1, 1110.1). Larry: every screen is a Touch
    // Point, no exceptions.
    registerPageNum('s-journal-landing','9300.1');
    registerPageNum('s-journal-capture','9310');
    registerPageNum('s-journal-view',   '9320');
    // Every screen a traveler can land on is its own Touch Point and gets
    // its own number — Larry, July 19, 2026. Cover and Entry are states
    // within the View flow (9320), so they take decimals off it, matching
    // the established Trivia pattern (0100.1, 1110.1, etc.) rather than a
    // whole new ten-block, since neither will ever need Trivia-style
    // multiplication of siblings.
    registerPageNum('s-journal-cover',  '9320.1');
    registerPageNum('s-journal-entry',  '9320.2');
    registerPageNum('s-gems',      '9400');
    registerPageNum('s-gem-add',   '9410');
    /* s-gems-list previously held 9420 — freed for the new gems.js
       board (July 9, 2026). s-gems-list itself is untouched, just
       no longer numbered/reachable from the default backpack path. */
    registerPageNum('s-trivia', '9500');
    registerPageNum('s-tools',  '9600');
    registerPageNum('s-question', '9610');
    registerPageNum('s-create',   '9620');
    registerPageNum('s-shape-tools', '9630');
    registerPageNum('s-share', '9640');
    /* s-dare has no Notion page number assigned yet */
    // 9800 — Search hub (🔍 Trivia + Gems), added July 20, 2026. Whole
    // number, not a decimal off anything, since it's a new top-level
    // backpack destination (parallel to Notes/Gems/Trivia/Tools), not a
    // sub-screen of one of them. 9700-9799 is the Storyboard family, so
    // this takes the next open hundred-block. Larry: every screen is a
    // Touch Point, no exceptions.
    registerPageNum('s-search', '9800');

    /* MAP — wired by tmap.js against its own injected elements, not here */

    /* IDEA HUB */
    wire('b-idea-back',returnToMG);
    wire('b-idea-mg',goMG);
    wire('b-idea-trivia',function(){ _triviaOverride='s-idea'; nav('s-trivia',false); });
    /* NOTE: capture flow (selects, close, save, image buttons) is wired
       entirely inside sea-of-ideas.js via renderIdeaSession() — registered
       against 's-idea-session' through registerScreenActivate. This keeps
       all Idea/board schema logic (boards, headers, cluster_id) in one
       file. The 9200 hub screen ('s-idea') is no longer the default entry
       point (💡 now opens 9711 directly, see b-mg-idea above) but is left
       in place and still reachable; its "Capture an Idea" button below
       just forwards into the same 9711 flow. 9611 FOCUS retired from this
       entry point July 13, 2026 — same reasoning as b-mg-idea above. */
    wire('b-capture-idea',function(){
      if(window.T2TSea&&window.T2TSea.openIdeaCapture) window.T2TSea.openIdeaCapture(null);
      else console.error('Idea capture unavailable — window.T2TSea.openIdeaCapture is missing (session.js failed to load?). The old 9210-legacy fallback screen was removed July 18, 2026, so there is no longer a second path here.');
    });
    wire('b-sea-ideas',function(){
      seaChapterEntry = false;
      if(window.T2TMedia && window.T2TMedia.openBoardResume) window.T2TMedia.openBoardResume();
      else nav('s-sea-of-ideas-cluster');
    });

    /* JOURNAL HUB */
    wire('b-journal-back',function(){nav('s-journal');});
    wire('b-journal-mg',goMG);
    /* NOTES chooser (9300) -- Journal vs Briefing Board, added July 19, 2026 */
    wire('b-notes-back',returnToMG);
    wire('b-notes-mg',goMG);
    wire('b-notes-journal',function(){nav('s-journal-landing');});
    wire('b-notes-bb',function(){nav('s-briefing-board');});
    wire('b-add-note',function(){
      nav('s-journal-capture');
      setTimeout(function(){
        var t=document.getElementById('journal-text');if(t)t.value='';
        var tp=document.getElementById('journal-topic');if(tp)tp.value='';
        var b=document.getElementById('b-save-journal');if(b)b.classList.remove('active');
      },50);
    });
    wire('b-view-journal',openJournalView);
    wire('b-jcap-back',function(){nav('s-journal-landing');}); wire('b-jcap-mg',goMG);
    wire('b-jcov-back',function(){nav('s-journal-landing');}); wire('b-jcov-mg',goMG);
    wire('b-jcov-next',function(){if(_jeEntries.length>0){showEntryAt(_jeEntries,0);nav('s-journal-entry');}});
    wire('b-jview-back',function(){nav('s-journal-landing');}); wire('b-jview-mg',goMG);
    wire('b-jentry-back',function(){nav('s-journal-view');}); wire('b-jentry-mg',goMG);
    wire('b-je-back',function(){nav('s-journal-view');});
    wire('b-je-prev',function(){if(_jeIndex>0)showEntryAt(_jeEntries,_jeIndex-1);else nav('s-journal-cover');});
    wire('b-je-next',function(){if(_jeIndex<_jeEntries.length-1)showEntryAt(_jeEntries,_jeIndex+1);});
    wire('b-save-journal',async function(){
      var t=document.getElementById('journal-text');if(!t)return;
      var text=t.value.trim();if(!text)return;
      var topicEl=document.getElementById('journal-topic'),topic=topicEl?topicEl.value.trim():'';
      var ctx=getCtx();
      var noteId=await saveEntryToSupabase(text,ctx,topic);
      if(noteId){if(!topic)suggestTopic(noteId,text);}
      else{saveEntryLocal({text:text,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),page:ctx,topic:topic});}
      t.value='';if(topicEl)topicEl.value='';
      var btn=document.getElementById('b-save-journal');if(btn)btn.classList.remove('active');
    });
    var journalTA=document.getElementById('journal-text');
    if(journalTA) journalTA.addEventListener('input',function(){var b=document.getElementById('b-save-journal');if(b)b.classList.toggle('active',this.value.trim().length>0);});

    /* SEARCH HUB — 🔍 Trivia + Gems (added July 20, 2026, replacing the old
       direct Gems slot in the backpack's middle row) */
    wire('b-search-back', returnToMG);
    wire('b-search-mg',   goMG);
    wire('b-search-trivia', function(){ nav('s-trivia', false); });
    wire('b-search-gems',   function(){ nav('s-gems-board', false); });

    /* GEMS HUB */
    wire('b-gems-back',returnToMG);
    wire('b-gems-mg',goMG);
    wire('b-add-gem',openGemAdd);
    wire('b-gadd-back',function(){nav('s-gems');}); wire('b-gadd-mg',goMG);
    var gcOwnTA=document.getElementById('gc-own-text');
    if(gcOwnTA) gcOwnTA.addEventListener('input',updateGemSaveBtn);
    wire('b-save-gem',async function(){
      var btn=document.getElementById('b-save-gem'),status=document.getElementById('gc-status');
      btn.classList.remove('active');btn.textContent='SAVING\u2026';
      var saved=0, candidates=getGemCandidates();
      var checked=document.querySelectorAll('#gc-candidates input:checked');
      for(var i=0;i<checked.length;i++){
        var idx=parseInt(checked[i].getAttribute('data-idx'));
        var c=candidates[idx];
        if(c){await saveGemToSupabase(c.text,c.attr);saved++;}
      }
      var ownText=(document.getElementById('gc-own-text')||{}).value||'';
      if(ownText.trim()){await saveGemToSupabase(ownText.trim(),null);saved++;}
      btn.textContent='SAVE';
      if(status) status.textContent=saved+(saved===1?' Gem saved.':' Gems saved.');
      setTimeout(function(){
        document.querySelectorAll('#gc-candidates input').forEach(function(c){c.checked=false;});
        document.querySelectorAll('#gc-candidates .gc-option').forEach(function(d){d.classList.remove('selected');});
        var ownEl=document.getElementById('gc-own-text');if(ownEl)ownEl.value='';
        if(status)status.textContent='';
        updateGemSaveBtn();
      },2000);
    });
    wire('b-view-gems',function(){nav('s-gems-list');renderGemsView();});
    wire('b-gview-list',function(){nav('s-gems-list');renderGemsView();});
    wire('b-glist-back',function(){nav('s-gems');}); wire('b-glist-mg',goMG);

    /* TOOLS */
    wire('b-tools-back',returnToMG); wire('b-tools-mg',goMG);
    wire('pb-question',function(){nav('s-question');}); wire('pb-create',function(){nav('s-create');});
    wire('pb-shape',function(){nav('s-shape-tools');}); wire('pb-share',function(){nav('s-share');});
    wire('pb-dare',function(){nav('s-dare');}); wire('btn-configure',function(){nav('s-configure');});
    wire('b-q-back',function(){nav('s-tools');});  wire('b-q-mg',goMG);
    wire('b-c-back',function(){nav('s-tools');});  wire('b-c-mg',goMG);
    wire('b-sh-back',function(){nav('s-tools');}); wire('b-sh-mg',goMG);
    wire('b-sr-back',function(){nav('s-tools');}); wire('b-sr-mg',goMG);
    wire('b-d-back',function(){nav('s-tools');});  wire('b-d-mg',goMG);
    wire('b-cfg-back',function(){nav('s-tools');}); wire('b-cfg-mg',goMG);
    wire('b-tools-sea-ideas', function(){
      // Larry, August 1 2026 (third report): "What do you want showed
      // up! No such TOPIC!" -- same bare-nav bug as the Dream Phase
      // TOC's Storyboard link, fixed the same way.
      if(window.T2TMedia && window.T2TMedia.openBoardResume) window.T2TMedia.openBoardResume();
      else nav('s-sea-of-ideas-cluster');
    });
    wire('b-tools-trash', function(){
      if (window.T2TSea) window.T2TSea.openTrash();
    });
    wire('b-go-change-pw',function(){nav('s-change-password');});
    // Sign Out, Aug 11 2026 -- Larry (bug report): a device that's
    // signed in and remembered (see the "Remember me" storage swap
    // above) has no way to stop being signed in from inside the app --
    // the session-resume path on load was finding it and skipping
    // straight past Sign In into whatever screen was last open,
    // forever, with nothing anywhere to break that. This clears the
    // remembered Supabase session AND both saved-screen markers
    // (bpLastPageNum/bpCurrentScreenNum, in whichever storage
    // "Remember me" was actually using), then sends the browser back
    // to the cover file fresh -- landing on Sign In, since the
    // INITIAL_SESSION resume check there finds no session at all.
    wire('b-sign-out',async function(){
      if(!confirm('Sign out of the Field Guide on this device?')) return;
      try{ await _sb.auth.signOut(); }catch(e){ console.error('Sign out failed', e); }
      try{ localStorage.removeItem('bpLastPageNum'); }catch(e){}
      try{ localStorage.removeItem('bpCurrentScreenNum'); }catch(e){}
      try{ sessionStorage.removeItem('bpLastPageNum'); }catch(e){}
      try{ sessionStorage.removeItem('bpCurrentScreenNum'); }catch(e){}
      window.location.href='index.html';
    });

    /* CHANGE PASSWORD */
    wire('b-cp-back',function(){nav('s-configure');}); wire('b-cp-mg',goMG);
    var cpInput=document.getElementById('cp-new-password');
    if(cpInput) cpInput.addEventListener('input',function(){var btn=document.getElementById('b-cp-save');if(btn)btn.classList.toggle('active',this.value.trim().length>=6);});
    wire('b-cp-save',async function(){
      var input=document.getElementById('cp-new-password'),msg=document.getElementById('cp-msg'),btn=document.getElementById('b-cp-save');
      var pw=input?input.value.trim():'';
      if(!pw||pw.length<6){if(msg){msg.textContent='Password must be at least 6 characters.';msg.className='cp-msg err';}return;}
      btn.textContent='Saving\u2026';btn.disabled=true;
      var res=await _sb.auth.updateUser({password:pw});
      btn.textContent='Save Password';btn.disabled=false;
      if(res.error){if(msg){msg.textContent=res.error.message;msg.className='cp-msg err';}}
      else{if(msg){msg.textContent='Password updated successfully.';msg.className='cp-msg';}if(input)input.value='';btn.classList.remove('active');}
    });

    drawPentagonArrows();
  }

  // goBackStack — Larry, August 1 2026: "Close Field Guide to obsolete
  // back pack rather than primary screen from which it was called."
  // returnToMG()'s mgOrigin is only ever set by goMG() (opening the old
  // backpack hub) -- entering 1010/9711 any other way (the desk's own
  // Idea Board button, FOCUS, a chapter link) never touches it, so
  // closing back out fell back to whatever stale backpack-era screen
  // mgOrigin last happened to hold, not the actual screen the traveler
  // had just come from. nav() already reliably records real navigation
  // history in `stack` (pushed on every call unless told not to) -- this
  // reads that instead, so closing means "back to the literal previous
  // screen," not a guess tied to the backpack's own bookkeeping. Falls
  // back to returnToMG() only if the stack is genuinely empty.
  // Default header color for newly-created headers -- Larry, Aug 7 2026:
  // "when all headers color is set, that is the default color for all new
  // headers until changed by traveler." Recolor-all (9710's own board and
  // 9711's per-Topic version) is the only place a color applies to every
  // header at once, so that's the moment that sets this. Persisted in
  // localStorage (not sessionStorage) since it's meant to survive across
  // sessions until deliberately changed again, same durability class as
  // t2t_lastActiveProjectId. Shared across every board/Topic -- one
  // traveler-wide default, not scoped per-board.
  function getDefaultHeaderColor(){
    try{ return localStorage.getItem('t2t_defaultHeaderColor') || null; }catch(e){ return null; }
  }
  function setDefaultHeaderColor(c){
    try{ if(c) localStorage.setItem('t2t_defaultHeaderColor', c); }catch(e){}
  }

  function goBackStack(){
    // Skip past any 's-signin' entries -- never a real "go back"
    // destination once already signed in (see the push:false fix in
    // resumeToLastPageOr; this is the belt-and-suspenders half, for any
    // already-open session where one snuck onto the stack before that
    // fix). Larry, August 1 2026: "closing storyboard went to sign in
    // screen not storyboard button."
    while (stack.length>0 && stack[stack.length-1]==='s-signin'){ stack.pop(); }
    if (stack.length>0) { nav(stack.pop(), false); }
    else { returnToMG(); }
  }

  /* ── PUBLIC API on window.T2T ── */
  window.T2T = {
    nav:nav, goBack:goBack, goMG:goMG, closeMG:closeMG, returnToMG:returnToMG, goBackStack:goBackStack,
    goPhase:goPhase, wire:wire, togglePh:togglePh,
    showTravelSpinner:showTravelSpinner, hideTravelSpinner:hideTravelSpinner,
    markSeaChapterEntry:function(){ seaChapterEntry = true; },
    getSeaChapterEntry:function(){ return seaChapterEntry; },
    consumeSeaChapterEntry:function(){ var v=seaChapterEntry; seaChapterEntry=false; return v; },
    markReturnOverride:function(fn){ _returnOverride = (typeof fn==='function') ? fn : null; },
    consumeReturnOverride:function(){ var f=_returnOverride; _returnOverride=null; return f; },
    openSeaTrash:function(){
      if (window.T2TSea) return window.T2TSea.openTrash();
    },
    registerGems:registerGems, registerCtx:registerCtx,
    registerMap:registerMap, registerMore:registerMore,
    registerPageNum:registerPageNum, registerUtilScreen:registerUtilScreen,
    registerTrivia:registerTrivia, registerScreenActivate:registerScreenActivate,
    setPrimaryPages:function(arr){_primaryPages=arr;},
    loadMemberProfile:loadMemberProfile,
    loadVisitedFromSupabase:loadVisitedFromSupabase,
    getVisited:getVisited,
    sb:_sb, getMember:function(){return _member;},
    onRealtimeChange:onRealtimeChange, isDragActive:function(){ return _t2tDragActive; },
    // Larry, July 27 2026: "Trivia button should light up if there are
    // any trivia docs [for the current page]." Mirrors renderTrivia's
    // own priority exactly (hub override, then primary page, then
    // mgOrigin) so "does the current page have trivia" always means
    // the same thing here as it does inside the actual Trivia hub.
    hasTrivia:function(){
      var links = (_triviaOverride && _triviaRegistry[_triviaOverride]) || _triviaRegistry[primaryPage] || _triviaRegistry[mgOrigin] || [];
      return links.length > 0;
    },
    getCtx:getCtx,
    openGemAdd:openGemAdd,
    openJournalView:openJournalView,
    navToPageNum:navToPageNum, currentFile:currentFile,
    getCurNum:function(){ return _pageNums[cur]||null; },
    // Larry, July 31 2026: "toggle all the buttons!" -- tool buttons
    // that nav() to a real screen need to know whether that screen is
    // already showing, so a second tap can go back instead of
    // re-navigating to the same place. Read-only, mirrors getCurNum's
    // own pattern right above.
    getCur:function(){ return cur; },
    setPhOpen:setPhOpen,
    getPageNumsReverse:function(){ return _pageNumsReverse; },
    resumeToLastPageOr:resumeToLastPageOr,
    resetAndReturn:resetAndReturn,
    getDefaultHeaderColor:getDefaultHeaderColor, setDefaultHeaderColor:setDefaultHeaderColor
  };

  document.addEventListener('DOMContentLoaded',function(){
    injectMGOverlay();
    wireBackpack();
    /* cross-file landing — check if we were sent here to a specific page */
    var bpTarget = sessionStorage.getItem('bp_target');
    if (bpTarget) {
      sessionStorage.removeItem('bp_target');
      navToPageNum(bpTarget);
    }
  });

})();
