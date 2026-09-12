/* ============================================================
   idea-storyboard-shared.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   SHARED STATE + UNDO. The board-state variables nearly every other file reads or writes (selected header, cached rows, drag state, filters), the add/patch-row helpers, and the undo/redo system (including its keyboard shortcuts).

   Split out of idea-storyboard-9710.js Sept 12, 2026 -- the file had
   grown to 11,463 lines (Code Growth Watch flags a split well before
   that; idea-storyboard-9710.js itself was already the product of an
   earlier split of sea-of-ideas.js back on July 17, 2026). Behavior
   is UNCHANGED -- this is a structural split, not a rebuild.

   All ten pieces share one global scope on the page (same pattern
   used for the briefing-board.js split on Sept 9, 2026) -- there's
   no per-file wrapper and no namespace object, so every
   function/variable here is reachable by its plain name from any of
   the other nine files. Load order does not matter for anything
   except idea-storyboard-9710.js itself, which must load LAST among
   this family.

   Sibling files: idea-storyboard-screens.js, idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js, idea-storyboard-navigation.js,
   idea-storyboard-tiles.js, idea-storyboard-header.js, idea-storyboard-card-detail.js,
   idea-storyboard-9710.js (boot -- loads last)
   ============================================================ */

  var _sboardTrashId = null;
  var _sboardMiscId = null;
  var _sboardPurposeId = null;
  var _sboardNewAdditionsId = null;
  var _sboardActiveId = null;
  // Idea Storyboards role-based shortcuts (Sept 2 2026) -- resolved once
  // per real render (see renderSeaBoard) and read again on a cache-only
  // patch render of the SAME Topic so the strip doesn't flicker away
  // during a live update. _sboardIdeaStoryboardsRootId mirrors the
  // _sboardPurposeId/_sboardMiscId caching pattern just above; the other
  // three only apply when the current Topic is one of the three screens
  // these shortcuts belong on (see _sboardComputeRoleShortcuts).
  var _sboardIdeaStoryboardsRootId = null;
  var _sboardRoleShortcuts = [];
  var _sboardRoleShortcutsKind = null;
  var _sboardRoleShortcutsTopicId = null;
  // Which header/Subber tile is "selected" for the Tab/Shift+Tab (nest/
  // un-nest) and Ctrl+Down/Ctrl+Up (drill in/out) keyboard shortcuts --
  // set by clicking a header or Subber tile (see renderGroup and
  // _sboardMakeHeaderStackTile). Aug 20 2026 (Larry: MOVE vs VIEW
  // shortcuts). Cleared whenever the board's current Topic changes (see
  // _sboardDrillInto/_sboardGoUpOneLevel) since a selection from the old
  // board wouldn't mean anything on the new one.
  var _sboardSelectedHeaderId = null;
  // Sentinel value for _sboardSelectedHeaderId meaning "the TOPIC card
  // itself is selected" -- not a real row id (there's nothing to look up
  // in _sboardAllRowsById for it), so every place that reads
  // _sboardSelectedHeaderId to act on a card must check for this sentinel
  // BEFORE doing the normal row lookup. Aug 21 2026 (Larry: "make the
  // Topic card selectable and highlightable like headers are").
  var _SBOARD_TOPIC_SENTINEL = '__topic__';
  // Aug 23 2026 (Larry: "ONE level ONLY!" -- PgUp on a card nested two
  // tiers below the current Topic, e.g. a Subber inside a column, was
  // jumping it straight to becoming the Topic itself in a single press,
  // skipping the middle step of just showing as a plain top-level header
  // of the SAME (unchanged) Topic first). Holds the id of the ONE row
  // (if any) currently being displayed as a top-level header purely for
  // VIEW purposes, even though its real cluster_id still points at its
  // actual, deeper parent -- nothing in the database changes, this is
  // read by renderSeaBoard to temporarily borrow it into the current
  // Topic's column row for this render only. A second PgUp on it (now
  // that it reads as top-level) promotes it for real via _sboardDrillInto.
  // Goes stale (and gets dropped) the moment it no longer matches
  // _sboardSelectedHeaderId -- see the check in renderSeaBoard -- so
  // selecting something else, or a real Topic change clearing selection,
  // automatically cleans this up without needing its own callback wired
  // into every place selection can change.
  var _sboardViewPromotedId = null;
  // Which Header/Subber (if any) is currently mid-drag, Aug 26 2026 --
  // Larry: dragging a Subber up towards the header row showed the green
  // "safe to release" cue, then it landed inside a NEIGHBORING column's
  // card list instead of promoting, because that column's own header
  // pill (the real "promote" target) is a much smaller strip than the
  // tall card list sitting right below/beside it. dragover can't read
  // dataTransfer's actual payload (browsers only allow that on drop), so
  // there's no way for a column to tell mid-drag whether a Header/Subber
  // is what's being dragged (which should get the enlarged promote
  // target below) versus a plain card (which shouldn't) without this --
  // set on dragstart, cleared on dragend, read by the enlarged drop zone
  // added to renderGroup's own "block" below.
  var _sboardDraggingHeaderId = null;
  var _sboardHeadersById = {};
  var _sboardHeaderList = [];
  var _sboardTopLevelOrder = [];
  // VIEW-by-person filter state -- Aug 9 2026, upgraded to multi-select
  // Session 255 (Larry: check one or more people, board narrows to any
  // of their assignments in any role -- Stakeholder included). Empty
  // array = everyone (default). Resets whenever the current project
  // changes, same as BB resetting its own VIEW filter on a board switch.
  // _sboardFilterMatchCardIds is the resolved Set of card ids the current
  // checked people show up in, any role; null means "not resolved yet"
  // (kept separate from "no filter set" so a render mid-fetch doesn't
  // flash the unfiltered board).
  var _sboardPersonFilterIds = [];
  var _sboardFilterMatchCardIds = null;
  var _sboardAllRowsById = {};
  var _sboardVisibleHeaders = [];
  var _sboardCacheReady = false;
  // Merges known-good field values straight into the cached row instead
  // of re-fetching it from Supabase to find out what it now looks like --
  // safe specifically because these are fields THIS tab itself just wrote
  // (we already know the new values without asking), unlike a realtime
  // patch (_sboardApplyRemoteIdea) which has to trust whatever payload
  // Supabase hands over instead. Aug 9 2026 (Supabase egress fix, local
  // edits). No-ops harmlessly if the row isn't in the cache yet for some
  // reason -- falls back to whatever the next real render fetches.
  function _sboardPatchRow(id, fields){
    if(!id || !_sboardAllRowsById[id]) return;
    var row=_sboardAllRowsById[id];
    for(var k in fields){ if(Object.prototype.hasOwnProperty.call(fields,k)) row[k]=fields[k]; }
  }
  // Same idea for a row THIS tab just inserted -- Supabase hands back the
  // full new row (id, created_at, etc.) via .select(), so there's no need
  // to re-fetch the account just to learn about the row we ourselves just
  // created.
  function _sboardAddRow(row){
    if(row && row.id) _sboardAllRowsById[row.id]=row;
  }
  // Shared with session.js's own tile renderer (_isxMakeTile), same
  // bridge pattern as keyDotsHTML/assignedBadgeHTML below -- a card can
  // carry a video/link attachment (Aug 11 2026) independent of its
  // content_type, so both screens' tiles need to show it, not just
  // 9710's own. Skipped for content_type==='link' cards themselves --
  // those already show their own built-in 🔗 marker.
  function _sboardLinkBadgeHTML(item){
    if(!item.link_url || item.content_type==='link') return '';
    return '<a class="sb-link-badge" href="'+_sboardEsc(item.link_url)+'" target="_blank" rel="noopener" draggable="false" title="Open link">🎬</a>';
  }

  // ---- Ctrl/Cmd+Z undo (single-step), Aug 11 2026 -- same shape as the
  // Briefing Board's own slot (briefing-board.js, _bbPushAction/_bbUndo/
  // _bbRedo), itself modeled on the Idea Session's (session.js, _isx*).
  // Covers moves and deletes -- restores the ONE row that moved/was
  // deleted to its exact previous cluster_id+sort_order, same fidelity
  // as Briefing Board's move-undo (doesn't try to re-thread every
  // sibling's order, just this row's own position). Text/color/detail
  // edits are a separate follow-up, not covered here.
  var _sboardLastAction = null;
  var _sboardLastUndone = null;
  function _sboardPushAction(entry){ _sboardLastAction=entry; _sboardLastUndone=null; }
  function _sboardShowToast(msg){
    var banner=document.getElementById('sb-undo-toast');
    if(!banner){
      banner=document.createElement('div');
      banner.id='sb-undo-toast';
      banner.style.cssText='position:fixed;top:14px;right:16px;width:200px;background:#eaf6ea;border:2px solid #2d7a3d;'
        +'color:#2d7a3d;font-size:calc(10px * var(--fg-text-scale,1));padding:6px 9px;border-radius:8px;z-index:9999;box-shadow:0 2px 6px rgba(0,0,0,.15)';
      document.body.appendChild(banner);
    }
    banner.textContent=msg;
    banner.style.display='block';
    clearTimeout(banner._sboardTimer);
    banner._sboardTimer=setTimeout(function(){ banner.style.display='none'; }, 3000);
  }
  async function _sboardUndo(){
    if(!_sboardLastAction){ _sboardShowToast('Nothing to undo.'); return; }
    var a=_sboardLastAction; _sboardLastAction=null;
    await a.undo();
    _sboardLastUndone=a;
    _sboardShowToast(a.label+' undone.');
  }
  async function _sboardRedo(){
    if(!_sboardLastUndone){ _sboardShowToast('Nothing to redo.'); return; }
    var a=_sboardLastUndone; _sboardLastUndone=null;
    await a.redo();
    _sboardLastAction=a;
    _sboardShowToast(a.label+' redone.');
  }
  function _sboardSnapshotRow(id){
    var row=_sboardAllRowsById[id];
    return row ? {cluster_id:row.cluster_id, sort_order:row.sort_order} : null;
  }
  // Shared write-back for undo AND redo -- writes the row's cluster_id+
  // sort_order straight to Supabase, patches the cache, redraws. Doesn't
  // replay any of the guarded logic in the move functions below (e.g.
  // _sboardReorderHeader's "can't create a new project this way" rule)
  // -- restoring a row to a state it has already legitimately been in
  // before doesn't need to pass those gates again.
  async function _sboardApplyRowSnapshot(id, snap){
    if(!snap) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:snap.cluster_id, sort_order:snap.sort_order}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:snap.cluster_id, sort_order:snap.sort_order});
      renderSeaBoard(true);
    }catch(e){ console.error('Storyboard: undo/redo write failed', e); }
  }
  // General-purpose version of the above for edit undo (text/color/notes)
  // -- writes whatever fields are given, straight to Supabase + cache,
  // then redraws. Added Aug 11 2026 alongside the move/delete undo.
  async function _sboardApplyFields(id, fields){
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('ideas').update(fields).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, fields);
      renderSeaBoard(true);
    }catch(e){ console.error('Storyboard: undo/redo write failed', e); }
  }
  // Moved here Aug 24 2026 (see the long comment where this used to live,
  // just above the PARENT click wiring) so climbOut()/drillIn() below can
  // actually see it -- it used to be nested one function deeper, out of
  // reach, which silently broke Page Down (and Page Up from a selected
  // TOPIC card) with a ReferenceError.
  function _sboardCanGoUpFromTopic(){
    var row=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    return !!(row && row.cluster_id);
  }
  function wireSboardUndoKeyboard(){
    // climbOut/drillIn hold the actual VIEW navigation -- doesn't move or
    // rename anything, purely which level of the board you're looking at.
    // History: Aug 20 2026 (Larry: MOVE vs VIEW shortcuts -- Tab/Shift+Tab
    // below is the separate MOVE gesture). Aug 21 2026 (Larry: "any card,
    // including topic") -- both pivot off whatever's currently selected
    // (a real row, or the TOPIC card itself via _SBOARD_TOPIC_SENTINEL,
    // checked first since it's not a real row id). With nothing selected,
    // both fall back to the existing PARENT breadcrumb climb -- an empty
    // selection reads as "the Parent" itself. From the TOPIC card there's
    // nothing to drill further into, so it always just climbs.
    // Direction swapped Aug 22 2026 (Larry, live-testing: "ctrl-down moved
    // the card UP instead" -- Down drilling IN read as backwards to him).
    // climbOut is now what Down triggers; drillIn is what Up triggers.
    // Second same-day fix: climbOut used to call _sboardDrillUpFrom
    // directly, but that function has its own fallback for a top-level
    // Header (whose parent already IS the current Topic -- nowhere
    // shallower to climb to) that promotes it to Topic anyway, the exact
    // "becomes Topic" result Larry flagged as wrong for Down. climbOut now
    // checks for that case itself first and shows the "already at the
    // top" toast instead -- it can never promote a card to Topic.
    //
    // Third fix, Aug 23 2026 (Larry: "ONE level ONLY!") through fifth fix
    // (Larry: "PgDn moved the view UP not down") -- several attempts at
    // making drillIn() (going down) a card-selection-based mirror of
    // climbOut() (going up). All superseded by the final shape below,
    // which came from Larry stating the actual rule directly: "The issue
    // is only which HEADER to PROMOTE to TOPIC going UP! If I click
    // down, the current topic becomes a header, EXACTLY like clicking on
    // the parent! Therefore, PgDn = click parent! PgUp requires highlight
    // on header to promote OR header of the highlighted card!"
    //
    // Going UP is genuinely ambiguous without a selection -- a Topic can
    // have several Headers, so promoting one to be the new Topic needs
    // to know WHICH one. climbOut() resolves that from whatever's
    // selected: a selected Header promotes directly; a selected Subheader
    // promotes its OWN Header (via _sboardDrillUpFrom, unchanged); with
    // nothing selected there's no way to know which Header is meant, so
    // it now asks for a click instead of guessing.
    //
    // Going DOWN is never actually ambiguous: the board only ever has one
    // current Topic, and that Topic has exactly one parent -- the same
    // single destination the PARENT breadcrumb (sc-parent-hit) already
    // climbs to. drillIn() doesn't need to know what's selected at all;
    // it's just that same climb, every time, full stop.
    function climbOut(){
      if(_sboardSelectedHeaderId===_SBOARD_TOPIC_SENTINEL){
        if(_sboardCanGoUpFromTopic()){ _sboardGoUpOneLevel(); _sboardSelectedHeaderId=_SBOARD_TOPIC_SENTINEL; }
        else _sboardShowToast('Already at the top of this board.');
        return;
      }
      var selRow=_sboardSelectedHeaderId && _sboardAllRowsById[_sboardSelectedHeaderId];
      if(selRow) _sboardDrillUpFrom(selRow);
      else _sboardShowToast('Click a card first -- Page Up promotes its header to the top.');
    }
    function drillIn(){
      if(_sboardCanGoUpFromTopic()) _sboardGoUpOneLevel();
      else _sboardShowToast('Already at the widest view on this board.');
    }
    document.addEventListener('keydown', function(e){
      var screen=document.getElementById('s-sea-of-ideas-cluster');
      if(!screen || !screen.classList.contains('active')) return;
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||(e.target&&e.target.isContentEditable)) return;
      var k=e.key.toLowerCase();
      // Tab / Shift+Tab -- MOVE: nest the selected header under the
      // previous top-level header, or un-nest it back to top-level. Same
      // "change level" key every outliner (Notion, Workflowy, Word's
      // outline view) already uses, so no new modifier to learn. Only
      // takes over Tab once a header is actually selected (click one
      // first) -- otherwise Tab still does normal focus-cycling, so this
      // never breaks keyboard access to the rest of the screen.
      // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
      if(k==='tab' && _sboardSelectedHeaderId && _sboardSelectedHeaderId!==_SBOARD_TOPIC_SENTINEL){
        e.preventDefault();
        if(e.shiftKey) _sboardPromoteSelectedHeader(); else _sboardDemoteSelectedHeader();
        return;
      }
      // PageDown/PageUp, Aug 22 2026 (Larry: "would click PgUp and PgDn
      // work better?" -- asked after Ctrl+Down still didn't fire for him
      // even once the logic bug above was found, fixed, and confirmed
      // deployed live). Added as a second, no-modifier way to trigger the
      // exact same climbOut/drillIn -- checked here, before the Ctrl/Cmd
      // gate below, since these two don't need a modifier at all.
      //
      // Fixed Aug 23 2026 (Larry: "PgUp should shift the entire VIEW up
      // one page... I just want to change the limited VIEW, not move
      // stuff around individually"). The original pairing above mirrored
      // Ctrl+Down/Ctrl+Up's mapping (Down=climbOut, Up=drillIn) onto the
      // Page keys without checking whether that direction reads right for
      // THIS pair -- for Page keys, "Up" universally means back toward
      // the top/start, i.e. the shallower, parent-ward direction
      // (climbOut), not deeper (drillIn). PageUp was doing the opposite
      // of what its name says. Swapped: PageUp now calls climbOut(),
      // PageDown now calls drillIn() -- same two functions as before,
      // just on the correctly-named keys.
      //
      // Two more same-day fixes to climbOut()/drillIn() themselves (an
      // over-eager bypass of the selected card, then drillIn() not
      // actually being climbOut()'s inverse) -- see their own history
      // comment above wireSboardUndoKeyboard's function bodies for the
      // full story. This pairing (PageUp=climbOut, PageDown=drillIn)
      // hasn't changed since the swap above.
      if(k==='pageup'){ e.preventDefault(); climbOut(); return; }
      if(k==='pagedown'){ e.preventDefault(); drillIn(); return; }
      // Plain Down arrow, added Aug 23 2026 (Larry: "the down arrow
      // should work exactly like this too... it is all the same action!
      // Only UP requires knowing directly or indirectly"). Going down is
      // never ambiguous (see climbOut/drillIn's own comment above), so
      // unlike Up it doesn't need a modifier to guard against an
      // accidental press -- checked here, before the Ctrl/Cmd gate
      // below, same tier as the Page keys above. This one line covers
      // plain Down AND Ctrl+Down (Ctrl+Down still matches 'arrowdown'
      // here regardless of the modifier, so it never falls through to
      // the gated block below) -- both are just drillIn(), same as
      // Page Down.
      if(k==='arrowdown'){ e.preventDefault(); drillIn(); return; }
      // Plain Up arrow, added Aug 25 2026 (Larry: "delete the need for
      // ctrl with up or down arrows -- shift view with a simple highlight
      // + appropriate arrow"). Up used to require Ctrl/Cmd on the theory
      // that promoting a card needs a highlight to know WHICH header, so a
      // stray plain Up shouldn't risk doing that by accident -- but
      // climbOut() already refuses to act without a selection (shows the
      // "Click a card first" toast instead), so the modifier was never
      // actually the thing guarding against a mistaken promote; the
      // highlight itself is. Moved up here, same tier as plain Down, so
      // the whole gesture is just: highlight a card, press the arrow that
      // matches the direction you want the view to shift -- no modifier
      // key at all. Ctrl+Up/Ctrl+Down still work too, since they also
      // match 'arrowup'/'arrowdown' here regardless of modifier and never
      // fall through to the gated block below.
      if(k==='arrowup'){ e.preventDefault(); climbOut(); return; }
      // Delete/Backspace, Aug 25 2026 (Larry: "Make Delete key act like
      // dragging to Trash"). Trashes whatever's currently selected --
      // same selection this whole handler already uses for Tab/Page/Arrow
      // -- exactly the way dropping that same card on the Trash pile
      // already does: straight to Trash, no confirm, recoverable with
      // Ctrl/Cmd+Z like any other move (see _sboardMoveCard). Skipped
      // while the card DETAILS panel is open -- that panel has its own
      // Trash button (with the Moose Poop confirm, now skippable via its
      // own "don't ask again" checkbox) and Delete here could otherwise
      // act on a different card than the one actually showing.
      if(k==='delete' || k==='backspace'){
        e.preventDefault();
        var detailOv=document.getElementById('sb-detail-overlay');
        if(detailOv && detailOv.classList.contains('active')) return;
        if(!_sboardSelectedHeaderId || _sboardSelectedHeaderId===_SBOARD_TOPIC_SENTINEL){
          _sboardShowToast('Click a card first, then Delete to trash it.');
          return;
        }
        if(!_sboardTrashId){ _sboardShowToast('Trash isn’t ready yet — try again in a moment.'); return; }
        var trashSelId=_sboardSelectedHeaderId;
        _sboardSelectedHeaderId=null;
        _sboardMoveCard(trashSelId, _sboardTrashId);
        return;
      }
      var mod=e.metaKey||e.ctrlKey;
      if(!mod) return;
      if(k==='z'){ e.preventDefault(); if(e.shiftKey) _sboardRedo(); else _sboardUndo(); return; }
    });
  }
  // Set true the first time this tab has done a real (network) render of
  // the Storyboard. Realtime-triggered renders (see _sboardRtSafeRefresh)
  // patch the changed row straight into _sboardAllRowsById and re-render
  // from that cache instead of re-fetching the whole account from
  // Supabase -- but only once there's something real in the cache to
  // render from. Aug 9 2026 (Supabase egress fix).
  // Set by 9711 (session.js, setIsxContext) after every render — lets the
  // shared DETAILS card compute an accurate "Current Location" breadcrumb
  // and header lookup when opened from 9711, instead of reading 9710's own
  // (often stale or empty) T2TShared.currentTopicId / _sboardAllRowsById.
  // Larry, July 18, 2026 ("'What do you want?' is no longer a project...
  // that isn't right").
  var _isxDetailCtx = null;
  var _sboardIdeaOrderByParent = {};
  // Subber order within their own Header, added Aug 3 2026 -- same idea
  // as _sboardIdeaOrderByParent just above, but for nested Header cards
  // (Subbers) instead of plain ideas. Lets dragging one Subber onto
  // another reorder them, the same way dragging a plain idea onto
  // another already reorders those.
  var _sboardSubberOrderByParent = {};
  // Aug 22 2026 (Larry: "sub-headers always cluster to the top... I want
  // to mix them into the story") -- the ONE real shared order for a
  // column's Subbers and plain cards together, per parent Header. Until
  // this, Subbers and cards each had their own independently-numbered
  // sequence (_sboardSubberOrderByParent / _sboardIdeaOrderByParent) and
  // always rendered as two stacked blocks, Subbers first -- no drag could
  // cross that line. This map is what dragging either kind now reorders
  // against, and what the column actually renders from (see renderGroup);
  // _sboardIdeaOrderByParent/_sboardSubberOrderByParent are still kept in
  // sync (as same-type subsets of this) purely for other, unrelated code
  // that only ever asks about one type (CLUSTER's own bucket count, the
  // top-level header promote/demote pair).
  var _sboardColumnOrderByParent = {};
  // Aug 3 2026 -- combined Subber+idea DISPLAY order per parent, used by
  // the ORDER # badge and the DETAILS card's order pill so the whole
  // visual column numbers 1,2,3... straight down with no repeats. As of
  // Aug 22 2026 this is simply set equal to _sboardColumnOrderByParent
  // each render (the real order now IS the display order) -- kept as its
  // own map since some callers still read it by this name.
  var _sboardCardOrderByParent = {};
  var _sboardChildCountById = {};
  // PLAN board support, Aug 26 2026 -- Larry: "duplicate a Project Idea
  // Board, put the card numbers on the front of the cards, make every
  // card without a verb pink," clarified to mean the real PLAN Storyboard
  // this dropdown already promised ("Planning Storyboard coming soon"):
  // picking PLAN now builds it, once, as a full copy of the current IDEA
  // project (see _sboardOpenOrCreatePlanBoard/_sboardDuplicateProjectAsPlan
  // below). _sboardIsPlanBoard is refreshed every render (see the
  // isAtProjectRoot block) from whatever project the traveler is
  // currently anywhere inside, so it stays right no matter how deep a
  // Header/Subber they've drilled into.
  var _sboardIsPlanBoard = false;
  // Alphabetical header view -- Larry, Aug 3 2026: "If headers or subbers
  // are sorted alphabetically the order number does NOT change, allowing
  // to resort to number order." This is a pure DISPLAY toggle, never
  // written anywhere -- true by default means "showing A-Z instead of
  // the real order," reset to false any time the traveler leaves this
  // board (see _sboardDrillInto/_sboardGoUpOneLevel) so a freshly opened
  // board never inherits a leftover alphabetical view from somewhere else.
  var _sboardAlphaHeaderView = false;
  var _sboardLastRenderedTopicId = undefined;
  // Signal Flags, Aug 3 2026 -- Larry: "We use red hearts to mean I like
  // this one. What about a blue heart? or a yellow triangle with custom
  // meanings visible on hover? This option could be in every gear?"
  // Follow-up, when asked how far to take it: one shared library, usable
  // "anywhere a traveler makes a note or adds an idea." This reuses the
  // exact shape+color+meaning system already proven on the Briefing
  // Board (its own board-scoped briefing_board_keys) and on Shortcuts
  // (traveler-wide bookmark_keys) -- this one is modeled on Shortcuts'
  // traveler-wide scope (one shared custom_keys table, not tied to a
  // single board), same 6 shapes / 6 colors, 12-key-library-cap (raised from 6 Aug 4 2026 after the library merge) /
  // 3-keys-per-card-cap so the visual language matches everywhere it
  // shows up. The existing red heart is untouched, per Larry's explicit
  // call -- Signal Flags are a second, optional marker, not a
  // replacement.
