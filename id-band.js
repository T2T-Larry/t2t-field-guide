/* ============================================================
   id-band.js — T2T Field Guide shared ID Band tokens
   Created Sept 8 2026 (Session 275/276), Larry: "Before leaving the
   ID BAND: the band crosses all types of boards. Does it have its
   own files?" ... "They will apply on PLAN and SHARE boards soon as
   well. Simplify now for future expansion and possible features."

   The ID Band is the header identity strip every board carries --
   TOPIC's chip, the big board-kind name (IDEA / Briefing Board /
   Plan / Share), the small arrow chips beside TOPIC and PROJECT, and
   the popup menu those arrows open. Since the Sept 6 2026 "make all
   ID bands exactly the same look (other than color)" pass, briefing-
   board.js and idea-storyboard-9710.js have each carried their OWN
   hand-typed copy of the numbers that are supposed to match, kept in
   sync only by a comment in each file pointing at the other. Change
   one, forget the other, and the bands quietly drift again -- which
   is exactly what already happened to the logo's minFrameFromCrop
   value (10 on Briefing Board, 12 on the Idea Board; flagged for
   Larry to pick one, not silently resolved here).

   This file is the one place those shared numbers live now. Board
   files read IDBand.TOKENS instead of carrying their own copy of a
   number that's meant to be identical everywhere. Every value below
   was pulled from the CURRENT LIVE code (Briefing Board is the
   canonical side per the "when they drift, Idea Board is brought up
   to match BB" rule) -- this file only reorganizes where the number
   lives, it does not change what either board looks like today.

   Board-specific things stay board-specific and are NOT here: each
   board's own colors, its accent/ink/bg CSS variables, font-family
   choice, and its own grid/flex layout. Only the numbers explicitly
   called out as "matched to X" moved.

   Not yet wired into the not-yet-built Plan and Share boards -- this
   is where their ID Band numbers should come from once those boards
   exist, instead of each starting its own hand-copied set.

   Load this file before briefing-board.js and idea-storyboard-9710.js
   (and before whatever Plan/Share end up being called).
   ============================================================ */

(function(){

  window.IDBand = {
    TOKENS: {
      // TOPIC's own chip (bb-topic-hit / #sc-topic-box).
      topicBox: { fontSize:44, radius:8, padding:'2px 16px', lineHeight:1.15 },

      // The big centered board-kind name (bb-mh / sc-board-kind-trigger):
      // "Briefing Board", "IDEA", and (soon) "Plan" / "Share".
      boardKindLabel: { fontSize:36 },

      // The up/down chevrons riding right against TOPIC itself
      // (bb-topic-caret / sc-topic-caret).
      topicCaret: { width:34, glyphSize:18 },

      // The small standalone arrow chip beside PROJECT/PARENT
      // (bb-parent-caret / sc-project-caret).
      pickerCaret: { width:24, height:30, glyphSize:14 },

      // The popup menu shell every ID Band dropdown opens into
      // (bb-cdrop-menu / sc-cdrop-menu), plus its row.
      dropdownMenu: { radius:8, zIndex:99999, padding:4, maxHeight:240, minWidth:120 },
      dropdownRow: { padding:'6px 10px', fontSize:11, radius:6 },

      // Logo footprint -- T2TLogo already shares the render/crop
      // code itself; this is just the size range every board's own
      // *LogoCfg describes. minFrameFromCrop deliberately NOT
      // included here yet: Briefing Board currently uses 10, the
      // Idea Board 12 -- a real drift, not a formatting difference,
      // and not this file's call to pick one silently.
      logo: { minSize:20, maxSize:90, defaultSize:30 },

      // PROJECT and STORYBOARD (formerly the board-kind label), Sept 15
      // 2026 -- Larry: "all the actual fields should look like the TOPIC
      // field with white background and frame... PROJECT and Board Type
      // [now STORYBOARD] are the same size and smaller than TOPIC."
      // Same look template as topicBox (white bg, board's-own-color
      // frame, same font/radius family) at a smaller size, with a single
      // down-arrow only -- neither field has an "up" the way TOPIC does
      // (PROJECT always mirrors TOPIC's own top-of-hierarchy ancestor;
      // STORYBOARD's five options are a flat set, not a hierarchy).
      // fontSize corrected 30->14 same day, once PROJECT/STORYBOARD/VIEW
      // actually got wired to this token (briefing-board-styles.js
      // .bb-mh-field-trigger) instead of each carrying its own ad hoc
      // inline style -- 14/30/120 is PROJECT's real, already-live size
      // (bb-board-trigger's Sept 5 2026 bump), which is what "PROJECT
      // and Board Type are the same size" actually means; 30 here was
      // this token's first pass, written before anything read it.
      fieldBox: { fontSize:14, height:30, maxWidth:120, radius:8, padding:'2px 12px', lineHeight:1.15 },
      fieldCaret: { width:24, glyphSize:14 },

      // The VIEW/RETURN/GEAR/CLOSE icon row riding the far right of
      // every ID Band (bb-icon-btn / sc-hdr-btn-muted+sc-hdr-btn-icon).
      // Sept 20 2026, Larry: "ID BAND buttons need white backgrounds.
      // Same for ALL boards now and in future" -- Briefing Board's own
      // .bb-icon-btn (white bg, 30x30, 6px radius, board-accent frame)
      // was already right; the Idea Board's version had drifted to a
      // near-transparent "muted" look (readable on BB's own top band,
      // not on the Idea Board's) plus a solid-gray one-off for VIEW.
      // Both are brought up to this token now, and it's the one place
      // a future Plan/Share board's own icon row should read from
      // instead of hand-copying either board's numbers again.
      iconBtn: { size:30, radius:6, borderWidth:1.5 }
    }
  };

  // RETURN button, Sept 15 2026 -- Bill: "a RETURN button to jump back
  // to the last screen." Scoped to the one concrete case this ID Band
  // itself creates: switching STORYBOARD kind (IDEAS/PLAN/TASKS/SHARE/
  // ROLES) navigates you away from wherever you were. recordReturn is
  // called right before that jump, from each board's own STORYBOARD
  // dropdown handler; consumeReturn is read once by the RETURN button
  // and clears itself so a second press doesn't jump again with stale
  // state. Deliberately a single remembered stop, not a full history
  // stack -- "the last screen," not "every screen."
  var _lastBoard = null;
  window.IDBand.recordReturn = function(kind, topicId){
    _lastBoard = { kind: kind, topicId: topicId||null };
  };
  window.IDBand.consumeReturn = function(){
    var v = _lastBoard;
    _lastBoard = null;
    return v;
  };
  window.IDBand.hasReturn = function(){ return !!_lastBoard; };

  // Shared RETURN click handler -- both boards' RETURN button call this
  // directly rather than each re-implementing the same dispatch.
  window.IDBand.jumpToRecorded = function(){
    var v=window.IDBand.consumeReturn();
    if(!v) return false;
    if(v.kind==='BRIEFING BOARD'){
      if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(v.topicId);
      return true;
    }
    if(v.kind==='IDEA' || v.kind==='PLAN'){
      if(window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind) window.T2TStoryboard.jumpToProjectKind(v.topicId, v.kind);
      return true;
    }
    return false;
  };

  // isAccountRoot, Sept 22 2026 -- Larry, after the MASTER-mislabel bug
  // report: "Does it have its own files? Do we have duplicate files?"
  // This file already stopped the visual numbers (fontSize, radius, etc.)
  // from being hand-copied per board; the MASTER/root TEST itself was
  // never brought in here though, so it had quietly drifted the same way
  // those numbers used to. Briefing Board's own copy called any row with
  // no parent "root" -- which also matches a real top-level project like
  // "Share" that simply has no parent of its own -- so it showed MASTER
  // for Share too. The Idea Board's copy already did this the safe way:
  // compare the row's actual id against the real, fetched root id, not
  // just "does it have a parent." One shared function now, so Plan and
  // Share (still to be built) read the same rule instead of a third
  // hand-typed copy, and so a future fix here reaches every board at once.
  //
  // row: {id, cluster_id} for whatever header/project is currently in
  // view -- null/undefined if nothing's resolved yet.
  // rootId: the board's own already-fetched account-root id (each board
  // still fetches this itself, via T2TData.ensureIdeaStoryboardsRoot --
  // that part was always identical and isn't what drifted).
  window.IDBand.isAccountRoot = function(row, rootId){
    // Nothing to compare yet -- both boards already treated this as "root"
    // (nothing narrower to show), so that stays the shared behavior.
    if(!row) return true;
    // Root id itself never resolved (a failed fetch) -- degrade to the
    // old pre-migration "has no parent" test rather than guessing either
    // way. Documented original rationale (briefing-board-master.js,
    // _bbIsProjectRoot): "a failed fetch shouldn't mark every real
    // project as a nested layer" -- kept here as the one shared fallback.
    if(!rootId) return !row.cluster_id;
    return String(row.id)===String(rootId);
  };

})();
