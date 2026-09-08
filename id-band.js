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
      logo: { minSize:20, maxSize:90, defaultSize:30 }
    }
  };

})();
