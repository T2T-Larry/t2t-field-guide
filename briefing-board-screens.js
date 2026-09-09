/* ============================================================
   briefing-board-screens.js -- T2T Field Guide - BRIEFING BOARD (9350)

   STRUCTURE. Pure HTML markup for every BB screen and overlay --
   the board itself, Add a Card, the Briefing Card detail, Settings,
   Signal Flag builder/picker/library, Archive/History/Briefing Log,
   Recent Moves, Recently Deleted. Empty shapes only -- nothing here
   fills them with real cards or makes them respond to a tap; that's
   briefing-board-ops.js's job once this markup exists.

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

   Sibling files: calls injectBriefingBoardStyles() (briefing-board-styles.js) and wireBriefingBoard() (briefing-board.js) at the end, same as before.
   ============================================================ */



  function injectBriefingBoardScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-briefing-board')) return;
    injectBriefingBoardStyles();

    var div=document.createElement('div');
    div.innerHTML=
       '<div class="sc" id="s-briefing-board">'
        +'<div class="bb-mhead">'
          +'<div class="bb-mhead-top">'
            +'<div class="bb-mh-typebox">'
              // Traveler name + PROJECT, Sept 5 2026 -- moved to the FRONT
              // of this row (was third) to sit at the header's far left
              // corner, matching where the Idea Board keeps its own
              // traveler-name/PROJECT column. "Project" eyebrow label
              // dropped -- Idea Board dropped its own the same day so the
              // board-switcher itself reads as the only thing in this
              // column, directly under the traveler's name. bb-project-caret
              // added so this field gets the Idea Board's exact two-piece
              // shape (label button, then its own arrow) -- wired in
              // _bbRenderBoardPicker, right after that function's existing
              // _bbRenderDropdown call, to open the same board-switch menu
              // the label itself already opens. _bbRenderTravelerName
              // (below) fills in the traveler-name text.
              // Sept 5 2026, Larry: "increase the text size on the PROJECT
              // field on all boards" -- matches sc-title-trigger's own
              // bump in idea-storyboard-9710.js (9px/24px -> 14px/30px).
              +'<div class="bb-mh-fieldgrp"><div class="bb-traveler-eyebrow" id="bb-traveler-name"></div><div class="bb-cdrop" id="bb-board-cdrop" style="display:flex;align-items:center;gap:2px"><button type="button" class="bb-hdr-select bb-cdrop-trigger" id="bb-board-trigger" title="Double-click to rename; click to switch boards" style="font-size:calc(14px * var(--fg-text-scale,1));height:30px;max-width:calc(120px * var(--fg-text-scale,1))"></button><button type="button" class="bb-parent-caret" id="bb-project-caret" title="Choose a board" aria-label="Choose a board">▾</button><div class="bb-cdrop-menu" id="bb-board-menu" hidden></div></div></div>'
              // Parent field retired from the header, Sept 6 2026 --
              // Larry: "the hierarchy is set when a PROJECT is chosen,"
              // folding its "jump to any level above" job into a new
              // up-arrow on TOPIC itself (bb-topic-caret-up, see the
              // TOPIC markup just below) instead of a separate eyebrow
              // and field over here. Same "retire in place, don't
              // delete" treatment already used on TYPE/ORG NAME right
              // below this comment: _bbRenderParentField and
              // _bbWireParentAncestorDropdown are both left exactly as
              // they were and still get called every render (they no-op
              // the moment bb-parent-hit/bb-parent-caret don't resolve
              // in the DOM, same as those two already do) -- nothing to
              // rebuild if this ever needs to come back.
              //
              // TYPE and ORG NAME (Client/Department/Partner categorization)
              // retired from the visible chrome, Sept 5 2026 -- Larry: BB's
              // header should look exactly like the Idea Board's, which has
              // no equivalent field. Left as real, working code -- just no
              // longer rendered here -- rather than deleted: _bbRenderOrgName,
              // _bbRenderTypePicker and friends still run fine with no
              // bb-type-trigger/bb-org-name-trigger in the DOM (_bbRenderDropdown
              // no-ops when its trigger/menu ids don't resolve), so this is
              // reversible by putting the fieldgrp back, nothing to rebuild.
            +'</div>'
            // TOPIC, Sept 5 2026 -- Larry: "Need TOPIC just like Idea
            // Board. What if it is exactly the same? If Field Guide is
            // open on the Idea Board, then the BB is set to the Field
            // Guide BB. If DREAM PHASE is the TOPIC on the Idea Board,
            // then DREAM PHASE is the BB." Its own grid track, between
            // the left PROJECT/PARENT column and the big "Briefing
            // Board" title -- the dead-center spot that title's own move
            // to the right (see bb-mhead-top above) freed up. Shows
            // whichever Header this exact board is linked to
            // (storyboard_project_id) -- the project root itself when
            // nothing's been descended into, same as PROJECT reads in
            // that case, or a nested layer's own name once TOPIC's own
            // ▾ has been used to go deeper. Same label-then-arrow shape
            // as PROJECT/PARENT (bb-hdr-select + bb-parent-caret);
            // _bbRenderTopicField below fills in the name and wires the
            // arrow to list this layer's own children, each one a real,
            // separate Briefing Board of its own (created on first visit
            // via _bbResolveOrCreateBoardForHeader) -- so cards on a
            // descended-into layer are that layer's alone, never mixed
            // with its parent's. The one root layer of a project reads
            // as its MASTER BRIEFING BOARD instead (Larry, same day:
            // "the top level of the BB = MASTER BRIEFING BOARD which
            // includes everything at all levels") -- see
            // _bbMasterRollupDepth (a Preferences field, not a fixed
            // number) for how far down "everything" currently reaches.
            // Up-arrow, Sept 6 2026 -- Larry: "an up arrow on the left
            // side to allow us to select a parental level" instead of
            // the separate Parent eyebrow/field this project used to
            // carry (see the Sept 6 note where that field's markup used
            // to sit, above). Mirrors the descend caret on the right --
            // same class, same chip, opposite direction -- so TOPIC
            // reads as one unit that climbs on the left and descends on
            // the right. _bbTopicAncestorChoices/_bbWireTopicAncestor-
            // Dropdown (near _bbWireTopicDropdown below) walk the same
            // ideas.cluster_id chain the descend caret already reads,
            // just upward -- the actual family tree TOPIC has always
            // meant, not the separate board_relations org-adoption chain
            // Parent's old dropdown used (that logic is untouched and
            // still runs for any board that has one; this new arrow just
            // doesn't attempt it, on the same "hierarchy comes from the
            // PROJECT" read Larry gave this today). Goes visually inert
            // (.bb-topic-caret:disabled, above) once TOPIC is already a
            // project's own root -- nothing above it to jump to.
            +'<div class="bb-mh-fieldgrp bb-mh-group-topic">'
              +'<div class="bb-cdrop" id="bb-topic-cdrop" style="display:flex;align-items:center;gap:6px">'
                +'<button type="button" class="bb-topic-caret" id="bb-topic-caret-up" title="Jump to any level above" aria-label="Jump to any level above">▴</button>'
                +'<button type="button" class="bb-topic-hit" id="bb-topic-hit" style="cursor:default"></button>'
                +'<button type="button" class="bb-topic-caret" id="bb-topic-caret" title="Descend into a child layer" aria-label="Descend into a child layer">▾</button>'
                +'<div class="bb-cdrop-menu" id="bb-topic-menu" hidden></div>'
                +'<div class="bb-cdrop-menu" id="bb-topic-ancestor-menu" hidden></div>'
              +'</div>'
            +'</div>'
            // Top-center label is a real board-kind dropdown now, Aug 30
            // 2026 -- Larry: "the top center of the Briefing Board could
            // be the dropdown to return to one of the other boards."
            // Mirrors the Idea board's own IDEA/PLAN/BRIEFING BOARD/
            // SHARE/CAST trigger (idea-storyboard-9710.js,
            // _sboardWireBoardKindDropdown) so the loop closes both ways
            // -- see _bbWireBoardKindDropdown below for the click
            // handling. bb-mh's own type styling stays as-is; only the
            // button chrome is stripped inline so nothing looks
            // different at rest.
            //
            // bb-boardkind-wrap id added Sept 6 2026 so
            // _bbPositionBoardKindMidway (near _bbRenderTopicField below)
            // has something to move -- "the type of board" (this is the
            // board-kind label Larry meant, the same "Briefing Board" /
            // "Idea" / "Plan" family this dropdown already switches
            // between) now sits at the real midpoint between TOPIC's box
            // and LOGO's, not just in its own leftover grid column.
            // Tagline dropped, Sept 6 2026 -- Larry: "delete the tag line
            // under the Briefing Board." bb-mh-subtitle (the "A control
            // and communication tool." / Master-rollup line) is simply
            // not rendered here anymore. _bbSyncMasterSubtitle (below)
            // is left exactly as it was -- it already no-ops the moment
            // getElementById('bb-mh-subtitle') comes back null, so
            // nothing to rebuild if this ever needs to come back; just
            // put the div back with its old id.
            +'<div class="bb-mh-group-center" id="bb-boardkind-wrap"><button type="button" class="bb-mh bb-cdrop-trigger" id="bb-boardkind-trigger" title="Switch to Idea, Plan, Share, or Cast" style="background:none;border:none;padding:0;margin:0;cursor:pointer">Briefing Board</button><div class="bb-cdrop-menu" id="bb-boardkind-menu" hidden></div></div>'
            +'<div class="bb-mhead-actions">'
              // Aug 30 2026, Larry: "move everything but Utility and X into
              // the Utility button" -- Reload, Jump-to-menu, History and
              // Relationships used to ride along here as their own icons
              // (see wireBriefingBoard below for the July 22 reasoning on
              // Reload specifically); all four now live one tap inside
              // Utility instead (_bbRenderSettingsScreen, 'home' screen),
              // so this row goes back to just the two.
              //
              // Logo, Sept 5 2026 -- moved here from the left-side typebox
              // row so it sits between the center title and Utility/Close,
              // matching where Logo sits on the Idea Board (between Topic
              // and the big IDEA label, itself just left of gear/close).
              // Purely a DOM-order move -- bb-logo-anchor already uses
              // plain flex layout (see the shared T2TLogo config comment
              // near injectBriefingBoardStyles), no position math tied to
              // where its wrapper sits in the row.
              +'<div class="bb-mh-fieldgrp"><div class="bb-mh-eyebrow" id="bb-logo-eyebrow">Logo</div><div class="bb-logo-anchor"><div id="bb-logo-slot" class="bb-logo-slot"><img id="bb-logo-img" src="" alt="Logo" style="display:none"><div class="bb-logo-eyebrow-onlogo" id="bb-logo-eyebrow-onlogo">Logo</div><button type="button" class="bb-dotted-add-btn" id="bb-logo-add-btn" title="Add a logo or artwork" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">+</button><input type="file" id="bb-logo-input" accept="image/*" style="display:none"><div class="bb-logo-resize-handle" id="bb-logo-resize-handle" title="Drag to resize"></div></div></div></div>'
              +'<button class="bb-icon-btn" id="bb-gear" title="Utility">⚙️</button>'
              +'<button class="bb-icon-btn" id="bb-close-x" title="Close">✕</button>'
            +'</div>'
          +'</div>'
        +'</div>'
        +'<div id="bb-board-wrap"><div id="bb-cols"></div></div>'
        +'<div class="bb-trash" id="bb-trash" title="Trash">'+TRASH_SVG+'</div>'
        +'<div class="bb-trash" id="bb-moves" title="Recent Moves" style="right:68px">'+MOVES_SVG+'</div>'
      +'</div>';
    while(div.firstChild) fg.appendChild(div.firstChild);

    // Add a Card (9360), the Briefing Card (9370), the Trash confirm, and
    // Board Settings -- all overlays, living as direct children of
    // #fg-root so they render regardless of whether #s-briefing-board
    // happens to be the active .sc screen.
    if(!document.getElementById('bb-add-overlay')){
      var addOv=document.createElement('div');
      addOv.id='bb-add-overlay'; addOv.className='bb-overlay';
      addOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Card</span><button class="bb-close" id="bb-add-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-new-task" placeholder="What needs to be done?"></textarea></div>'
            +'<button class="jb" id="b-bb-save-card">Pin it to the board</button>'
            +'<div id="bb-add-status" style="font-size:calc(11px * var(--fg-text-scale,1));color:#5a7a3a;min-height:14px;margin-top:4px;text-align:center"></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(addOv);
      // Aug 7 2026 -- Larry: ENTER pinning the card was right, but it was
      // also closing this screen, and it should only close with the X.
      // Aug 9 2026 -- Larry: clicking outside the card should close it too,
      // same as the X -- restored that behavior, matching every other
      // overlay on the board.
      addOv.addEventListener('click', function(e){ if(e.target===addOv) closeAddCard(); });
      _bbMakeDraggable(addOv.querySelector('.bb-overlay-card'), addOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-detail-overlay')){
      var detailOv=document.createElement('div');
      detailOv.id='bb-detail-overlay'; detailOv.className='bb-overlay';
      detailOv.innerHTML=
         '<div class="bb-overlay-card">'
          // Routine-card toggle button dropped, Aug 27 2026 (Larry: "Drop
          // Routine card icon from top of card") -- redundant now that
          // Routine is its own checkbox further down: picking a
          // frequency there already marks the card routine (c.routine),
          // see wireRoutineControls' select handler. The card-front
          // badge and the overlay's own routine-tinted top border stay
          // -- only the manual header button goes.
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Briefing Card</span><div style="display:flex;gap:6px"><button class="bb-close" id="bb-detail-close" aria-label="Close">✕</button></div></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Priority</label><div class="bb-priorities">'
              +PRIORITY_BASE.map(function(p){ return '<button class="bb-pri-btn" data-pri-base="'+p+'">'+p+'</button>'; }).join('')
            +'</div></div>'
            // Added-date, Aug 27 2026 (Larry: "What if the date added is
            // quietly after the TASK Eyebrow?") -- the standalone "Dates"
            // block (below) used to hold this, but once Start Date moved
            // into its own checkbox that block was down to one static
            // line, not worth a whole section for. Same id (bb-d-added),
            // same value, just riding quietly on the Task label instead.
            +'<div class="bb-field"><label>Task<span class="bb-added-quiet" id="bb-d-added">&mdash;</span></label><textarea id="bb-d-task"></textarea></div>'
            // Project, Sept 7 2026 -- Larry: "BB has eyebrow project ID.
            // Make this a dropdown field on the back of the card so we
            // can change projects for a given BB card." The card
            // front's own TOPIC eyebrow (topicEyebrow, above) already
            // names whichever project a card is under; this is the
            // editable version of that same fact, on the back. Same
            // bb-cdrop trigger-button-plus-menu shape as the header's
            // own PROJECT field (bb-board-trigger et al) -- no separate
            // caret needed here since nothing on this button does
            // double duty (the header's caret exists only to separate
            // "open the menu" from the label's own double-click-to-
            // rename; this field has no rename). Wired in
            // _bbRenderCardProjectField, called from openCardDetail.
            +'<div class="bb-field"><label>Project</label><div class="bb-cdrop"><button type="button" class="bb-hdr-select bb-cdrop-trigger" id="bb-d-project-trigger" title="Change which project this card belongs to" style="width:100%;max-width:none;height:34px;font-size:calc(13px * var(--fg-text-scale,1))"></button><div class="bb-cdrop-menu" id="bb-d-project-menu" hidden></div></div></div>'
            +'<div id="bb-d-hangup-wrap" style="display:none">'
              +'<div class="bb-field bb-inline-field"><label>Stuck since</label><span id="bb-d-hangup-since">&mdash;</span></div>'
              +'<div class="bb-field"><label>Situation &mdash; what&rsquo;s stuck, and why</label><textarea id="bb-d-situation" placeholder="What seems to be the problem? Help us understand what&rsquo;s going on."></textarea></div>'
            +'</div>'
            // Additions, Aug 27 2026 (Larry: "all additions = checkboxes
            // which open when checked and stay open when active"),
            // extended same session to also cover Related Storyboards
            // and Signal Flags -- Checklist, Routine, Start Date, Due
            // Date, Budget, Notes, Links, Related Storyboards, and
            // Signal Flags are all opt-in now instead of always taking
            // up room on every card. Each is a checkbox riding its own
            // field label; the field's real content sits in a
            // .bb-addition-body directly under it, hidden by default and
            // shown for exactly as long as its checkbox is checked --
            // see BB_ADDITIONS/openCardDetail/wireAdditionToggles below
            // for the shared plumbing. Only Reviewed by is NOT part of
            // this -- Larry's list never included it, so it stays
            // permanently visible, just below the divider that closes
            // out this whole section.
            +'<div class="bb-field bb-addition" id="bb-d-add-checklist-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-checklist"><span class="bb-addition-eyebrow">Checklist</span></label><div class="bb-addition-body" id="bb-d-checklist-body" style="display:none"><div id="bb-d-checklist-list"></div><div class="bb-checklist-add-row"><input id="bb-d-checklist-new" type="text" placeholder="Add steps..."><button class="bb-icon-btn bb-icon-btn-add" id="bb-d-checklist-add-btn" title="Add step">+</button></div></div></div>'
            +'<div class="bb-field" id="bb-d-shared-wrap" style="display:none"><label>Also show on</label><select id="bb-d-shared-board"><option value="">Just here</option></select></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-routine-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-routine"><span class="bb-addition-eyebrow">Routine</span></label><div class="bb-addition-body" id="bb-d-routine-body" style="display:none">'
              +'<select id="bb-d-routine" class="bb-routine-select"><option value="">&mdash;&mdash;&mdash;</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select>'
              +'<input id="bb-d-routine-custom" type="text" class="bb-routine-custom" placeholder="e.g. Last Friday, EOB" style="display:none;margin-top:4px">'
            +'</div></div>'
            // Start Date, Aug 27 2026 (Larry: "Add checkbox for START
            // DATE which can be preset or automatic when card is moved
            // to DOING... should be just above DUE DATE") -- the
            // auto-stamp-on-drop-to-Doing behavior already existed
            // (_bbStageMirrorUpdate / the native drop handler below);
            // both spots now also open this checkbox when they stamp
            // the date, so an auto-set Start Date is never left hidden
            // behind an unchecked box.
            +'<div class="bb-field bb-addition" id="bb-d-add-start-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-start"><span class="bb-addition-eyebrow">Start Date</span></label><div class="bb-addition-body" id="bb-d-start-body" style="display:none">'
              +'<div class="bb-date-row"><input id="bb-d-start" type="text" placeholder="Start MM/DD/YYYY"><input id="bb-d-start-time" type="text" class="bb-date-time" placeholder="Time"><button class="bb-icon-btn" id="bb-d-start-cal" type="button" title="Pick a date">\uD83D\uDCC5</button></div>'
            +'</div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-due-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-due"><span class="bb-addition-eyebrow">Due Date</span></label><div class="bb-addition-body" id="bb-d-due-body" style="display:none">'
              +'<div class="bb-date-row"><input id="bb-d-due" type="text" placeholder="Due MM/DD/YYYY"><input id="bb-d-due-time" type="text" class="bb-date-time" placeholder="Time"><button class="bb-icon-btn" id="bb-d-due-cal" type="button" title="Pick a date">\uD83D\uDCC5</button></div>'
            +'</div></div>'
            // Budget label simplified, Aug 27 2026 (Larry: "Drop TIME or
            // DOLLARS from BUDGET").
            +'<div class="bb-field bb-addition" id="bb-d-add-budget-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-budget"><span class="bb-addition-eyebrow">Budget</span></label><div class="bb-addition-body" id="bb-d-budget-body" style="display:none"><input id="bb-d-budget" type="text"></div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-notes-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-notes"><span class="bb-addition-eyebrow">Notes</span></label><div class="bb-addition-body" id="bb-d-notes-body" style="display:none"><textarea id="bb-d-notes" placeholder="Notes, comments, questions..."></textarea></div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-links-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-links"><span class="bb-addition-eyebrow">Links</span></label><div class="bb-addition-body" id="bb-d-links-body" style="display:none"><div class="bb-link-row"><input id="bb-d-link-url" type="text" placeholder="Paste a YouTube, Vimeo, or other link\u2026"><button class="bb-icon-btn" id="bb-d-link-clear" type="button" title="Remove">\u2715</button></div><div id="bb-d-link-preview" class="bb-link-preview" style="display:none"></div></div></div>'
            // Related Storyboards, Aug 27 2026 (Larry: "do the same with
            // the RELATED STORYBOARDS and move them after LINKS, since
            // they are sort of a special case link") -- this is the old
            // top-of-card doors-row (Idea Board / Plan / Organization /
            // Share), relocated here and gated like every other
            // addition. "Active" for the auto-open backfill below means
            // already linked to an Idea Storyboard header
            // (c.sourceHeaderId) -- Plan/Organization/Share are still
            // Door-Soon placeholders with nothing of their own to be
            // active yet.
            +'<div class="bb-field bb-addition" id="bb-d-add-related-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-related"><span class="bb-addition-eyebrow">Related Storyboards</span></label><div class="bb-addition-body" id="bb-d-related-body" style="display:none">'
              +'<div id="bb-d-doors-row" class="bb-doors-row">'
                +'<button class="bb-icon-btn bb-door-btn" id="bb-d-open-header" type="button" title="Idea Board">'+'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f6fed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.4 18 9.1 18 8a6 6 0 0 0-12 0c0 1.1.3 2.4 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>'+'</button>'
                +'<button class="bb-icon-btn bb-door-btn" id="bb-d-door-plan" type="button" title="Plan">'+'<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#2f6fed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M4 20h4v-4h4v-4h4v-4h4"/></svg>'+'</button>'
                +'<button class="bb-icon-btn bb-door-btn" id="bb-d-door-org" type="button" title="Organization">\uD83D\uDC65</button>'
                +'<button class="bb-icon-btn bb-door-btn" id="bb-d-door-share" type="button" title="Share">\uD83D\uDCAC</button>'
              +'</div>'
            +'</div></div>'
            // Signal Flags, Aug 27 2026 (Larry: "make Signal Flags like
            // the other checkboxes which auto open if there is an
            // active flag") -- was a fixed, always-visible field just
            // below the old divider; now gated the same way as
            // everything else in this section, with the same
            // migration-backfill approach (open by default for any card
            // that already has a flag set) rather than any new runtime
            // logic -- "active" is decided once, at load, exactly like
            // Notes/Budget/etc. above.
            +'<div class="bb-field bb-addition" id="bb-d-add-flags-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-flags"><span class="bb-addition-eyebrow">Signal Flags</span></label><div class="bb-addition-body" id="bb-d-flags-body" style="display:none"><div class="bb-key-row" id="bb-d-key-row"></div></div></div>'
            // Divider, Aug 27 2026 -- now sits directly above Reviewed
            // by (the last item that isn't itself a checkbox), so the
            // whole run of additions -- Checklist through Signal Flags
            // -- reads as one contiguous section.
            +'<hr class="bb-field-divider">'
            +'<div class="bb-field"><label>Reviewed by</label><select id="bb-d-reviewer">'+REVIEWERS.map(function(n){ return '<option value="'+n+'">'+n+'</option>'; }).join('')+'</select></div>'
            +'<div class="bb-field"><div class="bb-flags"><button class="bb-flag-btn" id="bb-d-pro">&#11088; PRO</button><button class="bb-flag-btn" id="bb-d-grow">&#127793; GROW</button><button class="bb-flag-btn" id="bb-d-verify">&#10003; Verified</button></div></div>'
            +'<div class="bb-field" id="bb-d-grow-note-wrap" style="display:none"><label>GROW comment &mdash; required</label><textarea id="bb-d-grow-note" placeholder="What would make this even better next time?"></textarea></div>'
            // Bottom action row, Session 234 (Aug 21, Larry: "add the same
            // bottom row as on the IDEA CARD to the BB Cards? lock - twin
            // heads - gear - trash"). Lock moved down here (was the big
            // top button, Larry: "too in your face"). Assigned-to is gone
            // -- retired the same way Person Assigned was on the Idea
            // Card, in favor of the 👥 star (see wireBbDetailActions).
            // Color swatch row is new for Briefing Cards (no prior
            // per-card color existed) -- built for Gear-button parity
            // with the Idea Card. Trash reuses the existing drag-to-trash
            // "Moose poop?" confirm as a direct button here too.
            +'<div id="bb-d-color-row" class="bb-doors-row bb-swatch-row" style="display:none"></div>'
            +'<div class="bb-doors-row bb-action-row">'
              +'<button class="bb-icon-btn" id="bb-d-lock" type="button">🔓</button>'
              +'<button class="bb-icon-btn" id="bb-d-people" type="button" title="Who is working on this?">👥</button>'
              +'<div class="sc-cdrop-menu" id="bb-people-menu" hidden></div>'
              +'<button class="bb-icon-btn" id="bb-d-gear" type="button" title="Utility">⚙️</button>'
              +'<button class="bb-icon-btn" id="bb-d-trash" type="button" title="Trash"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg></button>'
            +'</div>'
          +'</div>'
        +'</div>';
      fg.appendChild(detailOv);
      detailOv.addEventListener('click', function(e){ if(e.target===detailOv) closeCardDetail(); });
      _bbMakeDraggable(detailOv.querySelector('.bb-overlay-card'), detailOv.querySelector('.bb-overlay-head'));
    }
    // Door-Soon placeholder, Aug 12 2026 -- Plan/Organization/Share
    // doors on the Briefing Card back all point here until their real
    // Storyboards (PSB/OSB/CSB) exist. One shared overlay, title text
    // swapped per door by openDoorSoon(label).
    if(!document.getElementById('bb-door-soon-overlay')){
      var doorSoonOv=document.createElement('div');
      doorSoonOv.id='bb-door-soon-overlay'; doorSoonOv.className='bb-overlay';
      doorSoonOv.innerHTML=
         '<div class="bb-overlay-card" style="width:280px;text-align:center">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title" id="bb-door-soon-title">Coming Soon</span><button class="bb-close" id="bb-door-soon-close" aria-label="Close">\u2715</button></div>'
          +'<div style="font-size:calc(13px * var(--fg-text-scale,1));color:#7A5C3A">This workspace isn\u2019t built yet &mdash; coming soon.</div>'
        +'</div>';
      fg.appendChild(doorSoonOv);
      doorSoonOv.addEventListener('click', function(e){ if(e.target===doorSoonOv) closeDoorSoon(); });
    }
    if(!document.getElementById('bb-trash-overlay')){
      var trashOv=document.createElement('div');
      trashOv.id='bb-trash-overlay'; trashOv.className='bb-overlay';
      trashOv.innerHTML=
         // Anchored just above the trash can (bottom:16/right:16, 44px
         // tall) instead of the shared .bb-overlay center, Aug 7 2026
         // per Larry -- position:fixed here overrides the overlay's
         // flex centering since the card is explicitly positioned,
         // no change needed to the shared .bb-overlay/.bb-overlay-card
         // rules every other overlay still relies on.
         '<div class="bb-overlay-card" style="width:280px;text-align:center;position:fixed;right:16px;bottom:76px;margin:0">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(18px * var(--fg-text-scale,1));font-weight:700;color:#3B2510;margin-bottom:6px">Moose poop?</div>'
          // Aug 7 2026 -- Larry: "We need a safety net for potential
          // errors." Trash used to delete the row from Supabase
          // outright, no undo -- now it's a real recoverable trash
          // (trashed_at column), kept 30 days before it's auto-purged,
          // with a Recently Deleted list (open by clicking the trash
          // can itself, not dragging to it) to restore from in the
          // meantime. Wording updated to match -- this is no longer a
          // "for good" action.
          +'<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#7A5C3A;font-style:italic;margin-bottom:14px">Off the board &mdash; kept for 30 days in case you change your mind.</div>'
          +'<div style="display:flex;gap:8px">'
            +'<button class="bb-flag-btn" id="bb-trash-yes" style="background:#a3372b;color:#fff;border-color:#a3372b">Yes</button>'
            +'<button class="bb-flag-btn" id="bb-trash-no">Keep it</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(trashOv);
      trashOv.addEventListener('click', function(e){ if(e.target===trashOv) closeTrashConfirm(); });
    }
    // Recently Deleted (9365), Aug 7 2026 -- the other half of the
    // safety net alongside trashed_at/doTrashCard below. Opened by a
    // plain click on the trash can (drag-and-drop still goes through
    // the Moose poop? confirm above) -- lists every card on this board
    // with trashed_at set and not yet purged, newest first, each with
    // Restore and a separate, harder-to-hit Delete Forever.
    if(!document.getElementById('bb-recently-deleted-overlay')){
      var rdOv=document.createElement('div');
      rdOv.id='bb-recently-deleted-overlay'; rdOv.className='bb-overlay';
      rdOv.innerHTML=
         '<div class="bb-overlay-card" style="width:320px">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Recently Deleted</span><button class="bb-close" id="bb-rd-close" aria-label="Close">✕</button></div>'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7A5C3A;font-style:italic;margin-bottom:10px">Kept for 30 days, then removed for good.</div>'
          +'<div id="bb-rd-list" style="max-height:320px;overflow-y:auto"></div>'
        +'</div>';
      fg.appendChild(rdOv);
      rdOv.addEventListener('click', function(e){ if(e.target===rdOv) closeRecentlyDeleted(); });
      _bbMakeDraggable(rdOv.querySelector('.bb-overlay-card'), rdOv.querySelector('.bb-overlay-head'));
    }
    // Recent Moves (9366), Aug 7 2026 -- Larry: a card he moved didn't
    // land where he put it and couldn't be put back, separate from
    // Trash entirely ("Never put the card into the trash... We need a
    // safety net for potential errors"). Opened by a plain click on
    // this icon -- lists the last 20 manual moves on this board
    // (drag-drop or the H/M/L buttons), newest first, each with an
    // Undo that puts the card straight back to its prior column,
    // priority, and position.
    if(!document.getElementById('bb-moves-overlay')){
      var mvOv=document.createElement('div');
      mvOv.id='bb-moves-overlay'; mvOv.className='bb-overlay';
      mvOv.innerHTML=
         '<div class="bb-overlay-card" style="width:320px">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Recent Moves</span><button class="bb-close" id="bb-moves-close" aria-label="Close">✕</button></div>'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7A5C3A;font-style:italic;margin-bottom:10px">Every move you made, with a way back.</div>'
          +'<div id="bb-moves-list" style="max-height:320px;overflow-y:auto"></div>'
        +'</div>';
      fg.appendChild(mvOv);
      mvOv.addEventListener('click', function(e){ if(e.target===mvOv) closeRecentMoves(); });
      _bbMakeDraggable(mvOv.querySelector('.bb-overlay-card'), mvOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-settings-overlay')){
      var setOv=document.createElement('div');
      setOv.id='bb-settings-overlay'; setOv.className='bb-overlay';
      setOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title" id="bb-settings-title">Settings</span><button class="bb-close" id="bb-settings-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw" id="bb-settings-body"></div>'
        +'</div>';
      fg.appendChild(setOv);
      setOv.addEventListener('click', function(e){ if(e.target===setOv) closeSettings(); });
    }
    // Team Roster (Settings > Team), Aug 8 2026 -- Larry's locked design:
    // reads like it would print, not a data-entry grid. Email/phone always
    // visible (the real use case is calling someone to cover a session or
    // checking who's free at a new time), Notes gets its own always-on
    // field per person, role symbol doubles as the role-picker trigger.
    if(!document.getElementById('bb-team-overlay')){
      var tmOv=document.createElement('div');
      tmOv.id='bb-team-overlay'; tmOv.className='bb-overlay';
      tmOv.innerHTML=
         '<div class="bb-overlay-card bb-team-print" style="width:400px">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Cast</span><button class="bb-close" id="bb-team-close" aria-label="Close">&#10005;</button></div>'
          +'<input type="text" class="tm-groupname" id="bb-team-groupname" placeholder="Name this cast...">'
          +'<div id="bb-team-list-view"></div>'
          +'<div class="tm-addrow">'
            +'<div class="tm-add-tile" id="bb-team-add" title="Add a cast member">+</div>'
            +'<div class="tm-print-tile" id="bb-team-print" title="Print roster">&#128438;</div>'
          +'</div>'
          +'<div id="bb-team-add-row" style="display:none;margin-top:10px;gap:6px">'
            +'<div class="tm-add-wrap">'
              +'<input type="text" id="bb-team-add-email" placeholder="Type a name or email..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:calc(12px * var(--fg-text-scale,1));padding:6px 8px;border:1px solid var(--bb-accent);border-radius:6px">'
              +'<div class="tm-add-suggest" id="bb-team-add-suggest" style="display:none"></div>'
            +'</div>'
            +'<button class="bb-flag-btn" id="bb-team-add-confirm" style="flex-shrink:0">Add</button>'
          +'</div>'
          +'<div id="bb-team-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin-top:6px;display:none"></div>'
        +'</div>';
      fg.appendChild(tmOv);
      tmOv.addEventListener('click', function(e){ if(e.target===tmOv) closeTeamRoster(); });
      _bbMakeDraggable(tmOv.querySelector('.bb-overlay-card'), tmOv.querySelector('.bb-overlay-head'));
    }
    // Key Library manager (9397), Aug 3 2026 -- Larry: "we need to be
    // able to edit or trash any custom key." Didn't exist for the
    // Briefing Board at all before (only the per-card slot picker,
    // which can only assign/unassign, never edit or delete the key
    // itself). Now that keys are the shared, traveler-wide custom_keys
    // library, this is deliberately the twin of the Storyboard's own
    // _sboardOpenKeyLibraryManager -- same pencil+trash-per-row shape,
    // reachable from either board's gear menu, editing the same rows.
    if(!document.getElementById('bb-keylibmanager-overlay')){
      var klOv=document.createElement('div');
      klOv.id='bb-keylibmanager-overlay'; klOv.className='bb-overlay';
      klOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Signal Flags</span><button class="bb-close" id="bb-keylibmanager-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-links-empty" style="margin-bottom:8px">One shared set, usable on any card, any board -- and on the Idea Storyboard too. Cards or Storyboard items that share a signal flag link to each other automatically.</div>'
            +'<div id="bb-keylib-list"></div>'
            +'<button class="jb" id="bb-keylib-add" style="width:100%;margin-bottom:0">+ Add a Flag</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(klOv);
      klOv.addEventListener('click', function(e){ if(e.target===klOv) closeKeyLibManager(); });
      _bbMakeDraggable(klOv.querySelector('.bb-overlay-card'), klOv.querySelector('.bb-overlay-head'));
    }
    // Board Sharing (Aug 4 2026) -- lets the owner of a project/departmental/
    // company Briefing Board add other signed-in members so they can see
    // and edit it too. Same overlay shape as the Signal Flags manager.
    if(!document.getElementById('bb-sharing-overlay')){
      var shOv=document.createElement('div');
      shOv.id='bb-sharing-overlay'; shOv.className='bb-overlay';
      shOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Guests</span><button class="bb-close" id="bb-sharing-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-links-empty" style="margin-bottom:8px">Guests can look at this board but not change anything.</div>'
            +'<div id="bb-sharing-list"></div>'
            +'<div id="bb-sharing-add-row" style="margin-top:8px">'
              +'<div style="display:flex;gap:6px;margin-bottom:6px">'
                +'<input id="bb-sharing-add-email" type="email" placeholder="Their email address" style="flex:1">'
                +'<button class="bb-icon-btn bb-icon-btn-add" id="bb-sharing-add-btn" title="Add">+</button>'
              +'</div>'
            +'</div>'
          +'</div>'
        +'</div>';
      fg.appendChild(shOv);
      shOv.addEventListener('click', function(e){ if(e.target===shOv) closeSharingManager(); });
      _bbMakeDraggable(shOv.querySelector('.bb-overlay-card'), shOv.querySelector('.bb-overlay-head'));
    }
    // Relationships (Aug 16 2026) -- Larry: members need a real way to
    // form/accept a parent-child adoption as it happens, not just have
    // Claude write it into the database. Same overlay shape as Guests.
    // Shows this board's parent + children, any pending requests
    // touching any board you own (incoming ones need your Approve/
    // Decline; outgoing ones show as waiting), and a form to start a
    // new request -- either to one of your own boards, or to another
    // member's by email (find_member_boards_by_email), going through
    // request_board_adoption/respond_board_adoption so the same
    // mutual-consent rule holds no matter who's using it.
    if(!document.getElementById('bb-relations-overlay')){
      var relOv=document.createElement('div');
      relOv.id='bb-relations-overlay'; relOv.className='bb-overlay';
      relOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Relationships</span><button class="bb-close" id="bb-relations-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw"><div id="bb-relations-body">Loading...</div></div>'
        +'</div>';
      fg.appendChild(relOv);
      relOv.addEventListener('click', function(e){ if(e.target===relOv) closeRelationsManager(); });
      _bbMakeDraggable(relOv.querySelector('.bb-overlay-card'), relOv.querySelector('.bb-overlay-head'));
    }
    // Project Hub (Aug 16 2026) -- Larry: the PROJECT field's (-) needs
    // to do something real for a project with actual content in it, not
    // just delete it outright. Three choices, shown together even
    // though only Move is wired up yet -- Larry's call: "3 choices even
    // if they do not all work yet." Move detaches this project from its
    // current parent (if any) via detach_board_relation, then opens the
    // existing Relationships overlay so a new parent can be requested
    // right away. Archive/Trash are stubs for now -- board-level
    // archive/trash don't exist yet, only the card-level versions do.
    if(!document.getElementById('bb-project-hub-overlay')){
      var phOv=document.createElement('div');
      phOv.id='bb-project-hub-overlay'; phOv.className='bb-overlay';
      phOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Remove Project</span><button class="bb-close" id="bb-hub-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-links-empty" id="bb-hub-board-label" style="margin-bottom:10px"></div>'
            +'<button class="jb bb-hx-landing-btn" id="bb-hub-move-btn" style="width:100%">🔀 Move to another parent</button>'
            +'<button class="jb bb-hx-landing-btn" id="bb-hub-archive-btn" style="width:100%">📁 Archive this project</button>'
            +'<button class="jb bb-hx-landing-btn" id="bb-hub-trash-btn" style="width:100%">🗑️ Trash this project</button>'
            +'<div id="bb-hub-msg" class="bb-links-empty" style="margin-top:6px"></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(phOv);
      phOv.addEventListener('click', function(e){ if(e.target===phOv) closeProjectHub(); });
      _bbMakeDraggable(phOv.querySelector('.bb-overlay-card'), phOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-hx-overlay')){
      var hxOv=document.createElement('div');
      hxOv.id='bb-hx-overlay'; hxOv.className='bb-overlay';
      hxOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">History</span><button class="bb-close" id="bb-hx-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<button class="jb bb-hx-landing-btn" id="bb-hx-archive-btn" style="width:100%">📁 Archive</button>'
            +'<button class="jb bb-hx-landing-btn" id="bb-hx-briefinglog-btn" style="width:100%">📣 Briefing Log</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(hxOv);
      hxOv.addEventListener('click', function(e){ if(e.target===hxOv) closeHX(); });
      _bbMakeDraggable(hxOv.querySelector('.bb-overlay-card'), hxOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-archive-overlay')){
      var archOv=document.createElement('div');
      archOv.id='bb-archive-overlay'; archOv.className='bb-overlay';
      archOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><button class="bb-hx-back" id="bb-archive-back" title="Back to History">←</button><span class="bb-overlay-title">Archive</span><button class="bb-close" id="bb-archive-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw"><div id="bb-archive-list" style="width:100%"></div></div>'
        +'</div>';
      fg.appendChild(archOv);
      archOv.addEventListener('click', function(e){ if(e.target===archOv) closeArchive(); });
      _bbMakeDraggable(archOv.querySelector('.bb-overlay-card'), archOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-briefinglog-overlay')){
      var blOv=document.createElement('div');
      blOv.id='bb-briefinglog-overlay'; blOv.className='bb-overlay';
      blOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><button class="bb-hx-back" id="bb-briefinglog-back" title="Back to History">←</button><span class="bb-overlay-title">Briefing Log</span><button class="bb-close" id="bb-briefinglog-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw"><div id="bb-briefinglog-list" style="width:100%"></div></div>'
        +'</div>';
      fg.appendChild(blOv);
      blOv.addEventListener('click', function(e){ if(e.target===blOv) closeBriefingLog(); });
      _bbMakeDraggable(blOv.querySelector('.bb-overlay-card'), blOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-keybuilder-overlay')){
      var kbOv=document.createElement('div');
      kbOv.id='bb-keybuilder-overlay'; kbOv.className='bb-overlay';
      kbOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Signal Flag</span><button class="bb-close" id="bb-keybuilder-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Shape</label><div class="bb-flags">'
              +SIGNAL_SHAPES.map(function(s){ return '<button class="bb-shape-btn" data-shape="'+s+'" title="'+s+'"><span style="display:inline-block;width:18px;height:18px;'+_bbShapeCSS(s,'#3B2510')+'"></span></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Color</label><div class="bb-swatches">'
              +KEY_COLORS.map(function(col){ return '<button class="bb-key-swatch" data-color="'+col+'" style="background:'+col+'"></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Meaning</label><input type="text" id="bb-keybuilder-meaning" placeholder="What does this signal flag mean?"></div>'
            +'<button class="bb-flag-btn" id="bb-keybuilder-save" style="width:100%">Save</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(kbOv);
      kbOv.addEventListener('click', function(e){ if(e.target===kbOv) closeKeyBuilder(); });
      _bbMakeDraggable(kbOv.querySelector('.bb-overlay-card'), kbOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-keypicker-overlay')){
      var kpOv=document.createElement('div');
      kpOv.id='bb-keypicker-overlay'; kpOv.className='bb-overlay';
      kpOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Choose a Signal Flag</span><button class="bb-close" id="bb-keypicker-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field" id="bb-keypicker-list"></div>'
            +'<button class="bb-flag-btn" id="bb-keypicker-remove" style="width:100%;margin-bottom:8px">Remove this signal flag</button>'
            +'<button class="bb-flag-btn" id="bb-keypicker-new" style="width:100%">Build a new signal flag</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(kpOv);
      kpOv.addEventListener('click', function(e){ if(e.target===kpOv) closeKeyPicker(); });
      _bbMakeDraggable(kpOv.querySelector('.bb-overlay-card'), kpOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-keypeek-overlay')){
      var kkOv=document.createElement('div');
      kkOv.id='bb-keypeek-overlay'; kkOv.className='bb-overlay';
      kkOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title" id="bb-keypeek-title">Signal Flag</span><button class="bb-close" id="bb-keypeek-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw"><div id="bb-keypeek-body" style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#a3907a;text-align:center;padding:16px 0">Loading\u2026</div></div>'
        +'</div>';
      fg.appendChild(kkOv);
      kkOv.addEventListener('click', function(e){ if(e.target===kkOv) closeKeyPeek(); });
      T().wire('bb-keypeek-close', closeKeyPeek);
      _bbMakeDraggable(kkOv.querySelector('.bb-overlay-card'), kkOv.querySelector('.bb-overlay-head'));
    }
    // Logo crop tool overlay, Aug 28 2026 -- shell only; its card is
    // filled in fresh by _bbLogoCfg.crop.mount (shared T2TLogo
    // controller, idea-media-shared.js) every time it opens, same
    // "shared overlay, replace the innerHTML" approach the Idea/Plan
    // Storyboard's own crop tool uses on sb-detail-overlay, so nothing
    // static needs to live here beyond the empty card shell.
    if(!document.getElementById('bb-logo-crop-overlay')){
      var lcOv=document.createElement('div');
      lcOv.id='bb-logo-crop-overlay'; lcOv.className='bb-overlay';
      lcOv.innerHTML='<div class="bb-overlay-card" style="width:380px;max-width:92vw"></div>';
      fg.appendChild(lcOv);
    }
    T().registerPageNum('s-briefing-board', '4010'); /* Larry, Aug 8 2026: renumbered off 9350 into the Journey phase sequence, mirroring ISB's July 29 move from 9710 to 1010 -- see Journey's 4810 Tools Crib link in Design Notes */
    T().registerUtilScreen('s-briefing-board');
    T().registerCtx('s-briefing-board', 'Briefing Board');

    // Appearance (theme/font) restores immediately -- a personal
    // preference shared across all of a traveler's boards, independent
    // of which board is active or whether Supabase is reachable.
    _bbApplyTheme(_bbCurrentTheme());
    _bbApplyFont(_bbCurrentFont());

    T().registerScreenActivate('s-briefing-board', function(){
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.add('isx-full');
      if(!_bbInitStarted){
        _bbInitStarted=true;
        _bbInitBoardsAndData();
      } else {
        renderBoard();
      }
    });

    wireBriefingBoard();
  }
