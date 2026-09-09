/* ============================================================
   briefing-board.js -- T2T Field Guide - BRIEFING BOARD (9350)

   STARTUP. The boot sequence -- hooks up every button and
   listener when the board loads (wireBriefingBoard), the
   DOMContentLoaded handler that kicks everything off, and the tiny
   T() helper nearly every other file calls to reach backpack.js.
   This file keeps the original name and the full design-history
   comment below (unchanged) since it's always been the one every
   other Field Guide page already has a <script> tag for.

   Split out of briefing-board.js Sept 9, 2026 -- the file had grown
   past 8,000 lines (Code Growth Watch flags a split well before
   that). One earlier partial attempt at this split (Sept 5, 2026)
   left briefing-board-styles.js / briefing-board-screens.js /
   briefing-board-archive.js in the repo but never finished wiring
   them in -- briefing-board.js kept its own internal copies the
   whole time and nothing ever loaded those three files. This split
   replaces that abandoned attempt: styles.js and screens.js are
   regenerated fresh from the current code, archive.js's contents
   now live inside briefing-board-card.js, and archive.js itself is
   deleted.

   All eight pieces below share one global scope on the page (same
   as the single file did internally) -- there's no per-file wrapper
   and no namespace object, so every function/variable here is
   reachable by its plain name from any of the other seven files.
   Load order does not matter: nothing at the top level of any of
   these files calls into another file's code immediately -- it's
   all either a definition, a constant, or an event-listener
   registration whose callback runs later, once every file is
   already loaded.

   Sibling files: briefing-board-styles.js, briefing-board-screens.js, briefing-board-card.js, briefing-board-signal-flags.js, briefing-board-master.js, briefing-board-master-nav.js, briefing-board-ops.js
   ============================================================ */

/* ============================================================
   briefing-board.js -- T2T Field Guide - BRIEFING BOARD (9350)

   Built July 19, 2026. A traveler's own DO / DOING / DONE / HANG-UPS
   board, based on Larry's original Disney Briefing Board booklet. It
   borrows the look and feel of the ISB Storyboard (card shapes, the
   turned-up corner that flips to a detail screen, drag between
   columns) but is deliberately its OWN module, not a mode bolted onto
   idea-storyboard-9710.js -- that file already carries the scars of
   teaching one engine to run two similar-but-different screens
   (9710/9711). A third mode there risked the same class of bug.

   Talks to backpack.js ONLY through window.T2T (registerPageNum,
   registerUtilScreen, registerScreenActivate, wire, nav, goMG,
   returnToMG), same convention every other module in this codebase
   follows.

   Screens, every one individually numbered per Larry's July 19, 2026
   rule -- every traveler-facing screen is a Touch Point:
     9350  s-briefing-board    the board itself (4 fixed columns) --
                                a real nav()'d screen.
     9360  bb-add-overlay      Add a Card
     9370  bb-detail-overlay   Briefing Card (was "Back of the Card" --
                                renamed July 20: it holds everything
                                on or about the card now, not just a
                                flipped-over back face)
     9390  bb-keybuilder-overlay  Add a Signal Flag -- builds one Signal Flags
                                library entry (shape+color+meaning).
                                9380 stays reserved for the Done archive.
     9395  bb-keypicker-overlay   Choose a Signal Flag -- opened by tapping any
                                of a card's 3 fixed key-slot circles.
                                Lists the library to pick from, Remove
                                (if the slot's filled), or Build a new
                                signal flag (drops into 9390, slot-aware).
     9396  (retired)          was Add a Link / Linked Items -- built
                                Aug 3 2026, removed Aug 7 2026 per
                                Larry: dropped the whole Linked Items
                                field from the Briefing Card. Number
                                held in reserve like 9380/9390.
     9397  bb-keylibmanager-overlay  Signal Flags -- Aug 3 2026. View,
                                edit (pencil), or delete (trash) any signal flag
                                in the shared custom_keys library.
                                Twin of the Storyboard's own
                                _sboardOpenKeyLibraryManager, same rows.
   9360/9370 converted from nav()'d screens to overlays July 20, 2026,
   per Larry: the card should sit ON TOP of the board (board stays
   visible/live underneath, dimmed), closed via an explicit X or by
   clicking outside the card -- same convention idea-storyboard-9710.js
   already uses for its own DETAILS card (sb-detail-overlay). Per the
   July 19 rule, overlay screens still get their own Touch Point number,
   they just don't call nav() to get it -- see backpack.js's page-toast
   detection for where 9360/9370 get recognized while active. A third
   overlay, bb-settings-overlay (colors/fonts), joined July 20 -- it
   never carries traveler data, just an appearance choice, so it isn't
   its own Touch Point.
   9380/9390 held in reserve (a Done archive, automation settings,
   whatever earns its place later).

   Trash + hearts, July 20, 2026 -- Larry's framing: a card sitting in
   Do is really just an idea (no inherent value yet), same as anything
   on the ISB before it's proven out. So this board borrows the ISB's
   own two ways of handling that: a fixed round Trash can (bottom-right
   of the board, same "small circle, drag a card onto it" convention as
   9711's isx-trash-fixed) for an idea that turns out not worth doing --
   NOT the same thing as finishing it (that's Done) -- plus a heart
   count (tap to add, hold to remove, same gesture as the ISB's
   sb-heart-pill) on the back of the card, for resonance.

   Priority, July 20, 2026, corrected July 21 (twice) -- Larry's "3=5"
   principle: give a group three choices (High/Medium/Low) and group
   discussion almost always settles on five real answers, because
   disagreement between two people's H and M becomes MH, between M and
   L becomes ML. Landed UI: just 3 buttons (H, M, L, not 5 or 7), each
   its own 3-click cycle that always escalates toward more urgent --
   H: H -> HH -> off. M: M -> MH -> off. L: L -> ML -> off. HH is H's
   own escalation (nothing sits above H to blend toward); M and L each
   escalate by blending one step toward H. No LL -- there's no
   direction to escalate a low priority further away from center, and
   Larry didn't want the extra choice anyway ("trying to avoid all
   those choices"). Six real values total: HH, H, MH, M, ML, L.
   (First built July 20 as a repeated-letter cycle -- H/HH/HHH,
   L/LL/LLL -- then briefly rebuilt July 21 as 7 always-visible direct-
   pick buttons; both missed the mark. This 3-button escalating cycle
   is what Larry actually wanted.)
   Each column sorts by priority, HH at the top, unset priority at the
   bottom (not yet triaged) -- ties keep whatever order they already
   had (stable sort), same as how the cards landed there. A near or
   passed due date can also pull a card's effective sort rank up (never
   down) even past its stated priority -- sort-only, the badge doesn't
   change.
   July 22, 2026, Larry: an arrived Start Date on a card still sitting
   in Do is different -- that one actually rewrites c.priority to H
   (never downgrades an already-more-urgent H/HH), so the card's own
   badge shows why it jumped, not just its spot in the list. See
   _bbAutoEscalateDates (also covers Due Date -> HH, added same day).

   Topic + appearance + Date Added, July 20, 2026:
   - #bb-topic-pill: a rounded, always-WHITE (not themeable -- the one
     constant regardless of color choice) fill-in-the-blank name, right
     next to the "Briefing Board" title on the SAME row (not its own
     bar -- folded in July 20 to save vertical board space) so whichever
     specific board this is (Personal / a project's / the company's /
     a department's) reads at a glance. Tap to edit, saved on blur.
   - Gear icon opens bb-settings-overlay: a handful of preset color
     themes plus a Classic/Clean font choice, applied as CSS custom
     properties on #fg-root (so both the board and its sibling overlays
     pick them up) and remembered in sessionStorage. Deliberately presets
     rather than a full color/font picker -- keeps this buildable now;
     revisit if Larry wants finer control later. The semantic colors
     (Hang-Ups red, flag colors, priority H-L gradient, heart red) stay
     fixed on purpose -- they carry meaning, a theme swap shouldn't
     change what "urgent" looks like.
   - X (bb-close-x) calls returnToMG(), which lands the traveler back on
     whichever page they opened the board from (validated against the
     DOM, Aug 4 fix), or Cover as the fallback -- not "the MG" itself,
     since returnToMG() stopped reopening that overlay on July 29. The
     MG-jump icon (b-bb-mg) rides along next to gear/X in the same
     header row for whenever the traveler actually wants the MG.
     The board's own separate bottom bar2 (the old back-arrow/MG-jump
     pair) was dropped entirely July 20 -- Larry: it had become an
     obsolete second toolbar once the header row could do the same job,
     and it was eating vertical space the board itself could use.
   - Date Added (c.assigned, already silently stamped at creation) now
     shows read-only on the back of the card -- useful there even
     though it was pulled off the card face itself.

   Review + Archive, July 20, 2026 -- "A DONE card remains on the board
   until reviewed." Larry's own PRO/GROW vocabulary, refined same day:
   PRO and GROW are both just performance-eval flags (click to tag,
   same one-tap pattern as Signal flag) -- no separate free-text field,
   they ARE the eval. Verified complete is the only thing that signals
   removal to the archive -- no separate Archive button; checking it
   while the card is actually sitting in Done archives it on the spot.
   Elsewhere it's a quiet no-op -- another hidden Mickey, per Larry:
   every action still exists for later without being explained. Priority
   sits above Task now (first thing a reviewer or traveler sees).
   "Reviewed by" is a plain text stand-in for now (no real team roster
   yet -- see the held team-roster discussion); revisit once real
   accounts/roles exist. Archiving hides a card from the board entirely
   (out of the 4 columns, kept in storage as history) rather than
   opening a full browsable Archive screen yet -- Touch Point 9380 stays
   reserved for that if/when it's wanted. Dragging a Done card back out
   to any other column retracts the whole judgment: completed date,
   Verified, PRO, and GROW all clear together.

   Persistence: sessionStorage for now, same local-fallback pattern
   Journal already uses (loadEntriesLocal/saveEntryLocal in
   backpack.js). Real per-traveler storage (a Supabase table,
   matching how Journal/Idea persist) is a follow-up once that
   table exists -- flagged here rather than silently assumed.

   Hang-Ups protocol, built July 21, 2026 -- Larry's framing: a card in
   DOING assumes something is actually happening. When it isn't (for
   whatever reason), it can't honestly stay in DOING, and it can't go
   back to DO either (it already started). HANG-UPS is where it goes
   instead -- in essence, "HELP, I'm stuck." Getting stuck isn't a
   property of the task, it's specific to whoever's assigned -- moving
   it here is meant to bring that out in the open so it can be talked
   about, not to imply anyone else would necessarily be stuck too.
   Three additions, on top of every other field a card already carries:
   - Stuck since: auto-stamped (c.hangupSince) the moment a card is
     dragged into HANG-UPS, same pattern as startDate/completedDate --
     cleared if it's dragged back out, so the stamp always reflects the
     card's *current* stuck streak, not its whole history.
   - Situation: its own field (c.situation), deliberately separate from
     Notes -- Notes is a running log, Situation is the one-line answer
     to "why can't this move," so opening the card shows the ask for
     help immediately rather than requiring a scroll through history.
   - Unhooking Ideas: hands the Situation off to the Idea Storyboard
     instead of re-inventing discussion tools here. Button creates (or
     re-opens, via c.hangupHeaderId) a Storyboard Header named after the
     card's own task -- the hang-up becomes the TOPIC, per Larry's own
     framing -- seeded with the Situation text as its first idea. Other
     Headers (things to think about/discuss) and Subbers (candidate
     answers) get added from inside the Storyboard itself, same as any
     other board. Built via window.T2TData.createHeader (header-data.js)
     and window.T2TShared (idea-media-shared.js) -- both already
     designed as the cross-module integration points other files use to
     reach the Storyboard, so this reuses that plumbing rather than
     reaching into idea-storyboard-9710.js directly, keeping the
     deliberate separation between the two modules intact.
   ============================================================ */

function T(){ return window.T2T; }

  function wireBriefingBoard(){
    // July 22, 2026, Larry: the Briefing Board is "one of the most
    // important places" for the reload-and-return shortcut -- burying
    // it one tap deep inside the \U0001F50D Jump-to-menu overlay (where it
    // first landed) wasn't good enough, so it got surfaced directly in
    // this board's own icon row alongside HX/gear/close instead.
    // Aug 30 2026, Larry reversed that: "move everything but Utility and
    // X into the Utility button" -- b-bb-mg and bb-reset (the standalone
    // header icons) are gone; Jump to Menu and Reload now live inside
    // Utility instead (bb-settings-go-menu / bb-settings-go-reload).

    // Traveler name + Parent, Sept 5 2026 -- one-time wiring, same
    // pattern as the Idea board's own injectSeaOfIdeasCluster: the caret
    // click only needs wiring once (its menu contents get rebuilt fresh
    // every time it opens), and the name listener covers the case where
    // the member profile finishes loading after this header is already
    // on screen. An immediate call handles the opposite race -- the
    // member already loaded before this wiring ran.
    _bbWireParentAncestorDropdown();
    _bbWireTopicDropdown();
    _bbWireTopicAncestorDropdown(); // Sept 6 2026 -- TOPIC's new up-arrow
    _bbRenderTravelerName();
    window.addEventListener('t2t:member-loaded', function(){ _bbRenderTravelerName(); });

    T().wire('bb-add-close', closeAddCard);
    // Aug 7 2026 -- Larry: "I hit ENTER on a Briefing Card entry but it
    // did not Pin to the board. This needs to work like the Ideas
    // cards" (same request that led to the Storyboard New Header fix
    // earlier today). This field's a textarea rather than a single-line
    // input, so plain ENTER pins the card and SHIFT+ENTER still inserts
    // a line break for anyone jotting a multi-line task.
    function _bbSaveNewCard(){
      var t=document.getElementById('bb-new-task');
      var text=t?t.value.trim():'';
      if(!text) return;
      var cards=_bbCardsList();
      // Appends at the end of L DO -- max existing sortOrder in that
      // column, plus one (0 if it's the first card ever to land there).
      var maxOrder=cards.filter(function(c){ return c.col==='new' && typeof c.sortOrder==='number'; })
        .reduce(function(m,c){ return Math.max(m,c.sortOrder); }, -1);
      // Due date, July 22, 2026 -- dropped from the quick-add form:
      // it's set on the full Briefing Card (9370) instead, since that's
      // where it already lives alongside Start date and the Routine
      // controls. No sense asking twice.
      // One-board model, Sept 8 2026 -- a new card pinned while a
      // project filter is active belongs to that project; pinned at
      // MASTER root (no filter) it's general/unassigned. Set on the
      // in-memory card right away so it shows up correctly in this same
      // render; the database side of the tag is its own one-time write
      // just below (_bbStampCardProject), never the general save.
      var newCardId=_bbUUID();
      var newProjectHeaderId=(_bbSingleBoardMode() && _bbProjectFilter()) ? _bbProjectFilter() : null;
      cards.push({id:newCardId, col:'new', sortOrder:maxOrder+1, assigned:_bbToday(), task:text, person:_bbCurrentBoardDefaultAssignee(), due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false, reviewedBy:REVIEWERS[0], archived:false, projectHeaderId:newProjectHeaderId});
      var _bbNewCardSync=_bbSaveLocal(cards);
      // Sept 9 2026 fix (Larry: "Newly added card disappeared when saved
      // and moved to MASTER") -- this used to fire the project stamp
      // (a separate UPDATE by id) in parallel with _bbSaveLocal's own
      // INSERT of that same new row, a genuine race: when the stamp's
      // UPDATE reached Supabase before the INSERT did, it matched zero
      // rows and silently did nothing -- Supabase doesn't error on an
      // update that touches no rows. The card still LOOKED tagged for
      // the rest of this session (this in-memory object already carries
      // projectHeaderId, set just above), but the database row was left
      // with no project_header_id at all, so the next real fetch showed
      // it only at MASTER root -- "disappeared" from the project it was
      // actually pinned to. Chaining onto _bbSaveLocal's own sync
      // promise (now returned instead of fire-and-forget, see its own
      // comment) guarantees the row exists before the stamp tries to
      // update it, without delaying the optimistic render below.
      if(newProjectHeaderId && _bbNewCardSync && _bbNewCardSync.then){
        _bbNewCardSync.then(function(){ return _bbStampCardProject(newCardId, newProjectHeaderId); })
          .catch(function(e){ console.error('Briefing Board: could not tag new card with its project', e); });
      } else if(newProjectHeaderId){
        _bbStampCardProject(newCardId, newProjectHeaderId);
      }
      renderBoard();
      // Aug 7 2026 -- Larry: pinning shouldn't close this screen, only
      // the X should. Clear the field and keep it open (and focused) so
      // several cards can be pinned back to back, with a quiet "Pinned"
      // flash standing in for the feedback the old auto-close used to give.
      if(t){ t.value=''; t.focus(); }
      var statusEl=document.getElementById('bb-add-status');
      if(statusEl){
        statusEl.textContent='Pinned ✓';
        clearTimeout(_bbAddStatusTimer);
        _bbAddStatusTimer=setTimeout(function(){ statusEl.textContent=''; }, 1500);
      }
    }
    T().wire('b-bb-save-card', _bbSaveNewCard);
    (function(){
      var newTaskField=document.getElementById('bb-new-task');
      if(newTaskField) newTaskField.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _bbSaveNewCard(); }
      });
    })();

    T().wire('bb-detail-close', closeCardDetail);
    T().wire('bb-d-open-header', _bbOpenOrCreateIdeaHeader);
    T().wire('bb-d-door-plan', function(){ openDoorSoon('Plan'); });
    T().wire('bb-d-door-org', function(){ openDoorSoon('Organization'); });
    T().wire('bb-d-door-share', function(){ openDoorSoon('Share'); });
    T().wire('bb-door-soon-close', closeDoorSoon);
    (function(){
      var notesEl=document.getElementById('bb-d-notes');
      if(notesEl) notesEl.addEventListener('input', _bbAutoGrowNotes);
    })();
    wirePriorityButtons();
    wireReviewButtons();
    wireLockButton();
    wireBbDetailActions();
    wireRoutineControls();
    wireLinkField();
    wireAdditionToggles();
    wireKeyBuilder();
    wireKeyPicker();
    wireKeyLibManager();
    wireSharingManager();
    wireRelationsManager();
    wireProjectHub();
    wireTeamRoster();
    wireChecklist();
    wireDatePickers();

    T().wire('bb-trash-yes', doTrashCard);
    T().wire('bb-trash-no', closeTrashConfirm);
    wireTrashIcon();
    wireRecentlyDeleted();
    wireRecentMoves();
    T().wire('bb-moves', openRecentMoves);
    wireTopicBar();
    _bbWireBoardKindDropdown();
    wireBbUndoKeyboard();
    wireLogoUpload();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('briefing_cards', _bbApplyRemoteCard);
      T().onRealtimeChange('briefing_checklist_items', _bbApplyRemoteChecklist);
      T().onRealtimeChange('custom_keys', _bbApplyRemoteKey);
    }
  });
