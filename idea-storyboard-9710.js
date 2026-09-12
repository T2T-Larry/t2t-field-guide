/* ============================================================
   idea-storyboard-9710.js -- T2T Field Guide - IDEA STORYBOARD (9710)

   BOOT. The tiny piece that's left once everything else moved out:
   the realtime-update handlers (a live edit from another tab/device
   patching straight into the board without a full reload) and the
   DOMContentLoaded wiring that injects the two screen shells and
   hooks up realtime listening. This file keeps its original name
   and position in the load order (it must load LAST of the ten Idea
   Storyboard files -- see below) since every phase page already has
   a <script> tag pointing at it.

   Split Sept 12, 2026 -- this file had grown to 11,463 lines (Code
   Growth Watch flags a split well before that). Behavior is
   UNCHANGED -- this is a structural split, not a rebuild. Same
   pattern used for the briefing-board.js split on Sept 9, 2026: all
   ten pieces share one global scope on the page, no per-file
   wrapper, no namespace object -- every function/variable in any of
   them is reachable by its plain name from any of the others. Load
   order does not matter EXCEPT for this file: the window.T2TStoryboard
   object below references functions and variables that live in every
   one of its nine sibling files, so this file has to be the last of
   the ten to load, same as it was the last code to run inside the
   original single file.

   Sibling files (load before this one): idea-storyboard-screens.js,
   idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js,
   idea-storyboard-navigation.js, idea-storyboard-tiles.js,
   idea-storyboard-header.js, idea-storyboard-card-detail.js
   ============================================================ */

/* ============================================================
   idea-storyboard-9710.js — T2T Field Guide · ISB STORYBOARD (9710)
   + legacy 9220/9221 SEA OF IDEAS grid/cluster views.

   Split out of sea-of-ideas.js on July 17, 2026 (Session 118) once
   that file passed the 3,500-line threshold (was 4,325 lines).
   Behavior is UNCHANGED — this is a structural split, not a rebuild.

   Part of the three-file ISB split:
     idea-media-shared.js   (loads FIRST  — shared state + capture/media)
     idea-storyboard-9710.js (loads SECOND — this file, plus its nine
                               new siblings above, all loading before it)
     session.js              (loads THIRD  — 9711 SESSION + public API)
   Script tag order in every phase file matters — T2TShared and
   T2TMedia must exist before this file's top-level code runs, and
   this file's T2TStoryboard must exist before session.js runs.

   Talks to backpack.js ONLY through window.T2T. Talks to the other
   two ISB files ONLY through window.T2TShared (shared mutable state)
   and window.T2TMedia (exposed media/capture functions) — never
   reaches into their closures directly.

   Exposes window.T2TStoryboard = {
     ensureMiscHeader, ensureTrashHeader, moveCard,
     isAutoHeaderText, getRow
   } for idea-media-shared.js and session.js to call.
   ============================================================ */

  var _sboardRtPendingRender = false, _sboardRtTimer = null;
  function _sboardRtSafeRefresh(){
    if (T().isDragActive()) { _sboardRtPendingRender = true; return; }
    if (_sboardRtTimer) clearTimeout(_sboardRtTimer);
    _sboardRtTimer = setTimeout(function(){ _sboardRtTimer = null; renderSeaBoard(true); }, 300);
  }
  window.addEventListener('t2t:drag-end', function(){
    if (_sboardRtPendingRender) { _sboardRtPendingRender = false; _sboardRtSafeRefresh(); }
  });
  function _sboardApplyRemoteIdea(evt, row, oldRow){
    if (evt === 'DELETE') {
      if (oldRow) delete _sboardAllRowsById[oldRow.id];
    } else if (row) {
      // The whole-account fetch this cache was built from is always
      // scoped to this traveler's own rows (.eq('user_id', user.id)) --
      // matters once a Storyboard can be shared (storyboard_members),
      // since RLS may let this tab legitimately *see* a collaborator's
      // row over the realtime channel even though the account-scoped
      // fetch itself would never have pulled it in. Guarding here keeps
      // the patched cache matching exactly what a real re-fetch would
      // have contained.
      var _me=T().getMember && T().getMember();
      if (!_me || String(row.user_id) === String(_me.user_id)) {
        _sboardAllRowsById[row.id] = row;
      }
    }
    // 9711 (session.js) keeps its own separate cache of the same 'ideas'
    // rows -- this is the only place either screen learns about a live
    // change, so both need patching here regardless of which one is
    // actually on screen right now. Aug 9 2026.
    if(window.T2TSea && window.T2TSea.applyRemoteIdeaPatch) window.T2TSea.applyRemoteIdeaPatch(evt, row, oldRow);
    _sboardRtSafeRefresh();
  }
  function _sboardApplyRemoteKey(evt, row, oldRow){
    if (!_sboardKeyLibLoaded) return; // library not fetched in this tab yet -- nothing cached to patch
    if (evt === 'DELETE') {
      if (!oldRow) return;
      _sboardKeyLib = _sboardKeyLib.filter(function(k){ return String(k.id) !== String(oldRow.id); });
    } else {
      var idx = -1;
      for (var i=0;i<_sboardKeyLib.length;i++){ if (String(_sboardKeyLib[i].id) === String(row.id)) { idx=i; break; } }
      if (idx !== -1) _sboardKeyLib[idx] = row; else _sboardKeyLib.push(row);
    }
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    _sboardRtSafeRefresh();
  }

  window.T2TStoryboard = {
    ensureMiscHeader: T2TData.ensureMiscHeader,
    ensureTrashHeader: T2TData.ensureTrashHeader,
    moveCard: _sboardMoveCard,
    isAutoHeaderText: _sboardIsAutoHeaderText,
    getRow: function(id){ return _sboardAllRowsById[id]; },
    openDetail: openSbDetail,
    closeDetail: closeSbDetail,
    applyBoardBg: _sboardApplyBoardBg,
    openBoardBgPicker: openBoardBgPicker,
    // DETAILS' "Move to a different Header" list (openSbDetail, above)
    // reads _sboardVisibleHeaders directly -- populated only by 9710's own
    // renderSeaBoard, so opening DETAILS from 9711 always showed 9710's
    // last-rendered headers (often empty, or from the wrong Topic
    // entirely) instead of the Topic actually on screen. Lets 9711 hand
    // over its own current header list right after it renders, so MOVE
    // works correctly no matter which screen opened DETAILS. Larry, July
    // 18, 2026 ("unable to drop some of the ideas into an existing
    // header, nor can I move it on the back of the card").
    setVisibleHeaders: function(list){ _sboardVisibleHeaders = list||[]; },
    setIsxContext: function(ctx){ _isxDetailCtx = ctx||null; },
    openDetailToColor: openSbDetailToColor,
    drillInto: _sboardDrillInto,
    openKeyLibraryManager: _sboardOpenKeyLibraryManager,
    keyDotsHTML: _sboardKeyDotsHTML,
    assignedBadgeHTML: _sboardAssignedBadgeHTML,
    linkBadgeHTML: _sboardLinkBadgeHTML,
    lockBadgeHTML: _sboardLockBadgeHTML,
    signalRowHTML: _sboardSignalRowHTML,
    ensureAssignedInitials: _sboardEnsureAssignedInitials,
    ensureCardPrimary: _sboardEnsureCardPrimary,
    // Session 234 (Aug 21) -- generalized so briefing-board.js can bring
    // the same 👥 people/Call Sheet system + primary-doer star to
    // Briefing Cards (card_type:'briefing_card') without duplicating any
    // of this logic. See _sboardOpenPeopleDropdown's own comment.
    openPeopleDropdown: _sboardOpenPeopleDropdown,
    // Session 255: the flat Cast popup, bridged so briefing-board.js can
    // open the exact same screen (add/remove/role/notes/contact/print)
    // for card_type:'briefing_card' instead of duplicating it.
    openCallSheet: openCallSheet,
    closeCallSheet: closeCallSheet,
    // Aug 28 2026 -- both re-routed through the tacit-assignment resolver
    // (_sboardEnsureEffectivePrimaryRaw/_sboardEffectivePrimaryUidRaw) so
    // Briefing Board picks up the solo-assignee and climb-to-Header rules
    // automatically. Property names kept exactly as before -- nothing in
    // briefing-board.js needs to change its call shape except optionally
    // passing a sourceHeaderIdByCardId map as ensureCardPrimaryRaw's new
    // (optional) third argument.
    ensureCardPrimaryRaw: _sboardEnsureEffectivePrimaryRaw,
    cardPrimaryUidRaw: _sboardEffectivePrimaryUidRaw,
    ensureMemberInitials: _sboardEnsureMemberInitials,
    memberInfo: function(uid){ return _sboardAssignedCache[uid]||null; },
    closeBoard: _sboardCloseBoard,
    // Aug 30 2026 -- lets briefing-board.js's own top-center board-kind
    // dropdown jump straight to a specific project's Idea or Plan board.
    // See _sboardJumpToProjectKind above.
    jumpToProjectKind: _sboardJumpToProjectKind
  };

  document.addEventListener('DOMContentLoaded', function(){
    injectSeaOfIdeas();
    injectSeaOfIdeasCluster();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('ideas', _sboardApplyRemoteIdea);
      T().onRealtimeChange('custom_keys', _sboardApplyRemoteKey);
    }
  });

