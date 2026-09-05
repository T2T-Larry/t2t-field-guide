/* ============================================================
   briefing-board-screens.js -- T2T Field Guide - BRIEFING BOARD (9350) SCREENS

   Split out of briefing-board.js Sept 5, 2026, same pass as
   briefing-board-styles.js. Pure HTML markup for every BB screen/overlay
   (the board itself, Add a Card, the Briefing Card detail, Settings, the
   Signal Flag builder/picker/library manager, Archive, History, the
   Briefing Log, Recent Moves, Recently Deleted) built as one string and
   injected once. No board logic lives here beyond the two calls out to
   the rest of the module (styles, then wiring) at the very end.

   Calls window._bbInjectStyles() (briefing-board-styles.js) and
   window._bbWireBriefingBoard() (briefing-board.js) -- load this file
   AFTER briefing-board-styles.js and BEFORE briefing-board.js, since
   briefing-board.js's own startup calls window._bbInjectScreens() (this
   file) once the DOM is ready.
   ============================================================ */

(function(){

  function injectBriefingBoardScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-briefing-board')) return;
    window._bbInjectStyles();

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
              // Parent, Sept 5 2026 -- Larry: "every board now and in the
              // future" should have the same PARENT field the Idea/Plan
              // header does. The data isn't new -- a board's one approved
              // parent has been readable since Aug 16 (see _bbRenderRelations
              // and the Links popup below) -- this just puts it in the
              // header itself instead of behind a popup, plus the same
              // fast-jump-to-any-level-above arrow the Idea board's own
              // Parent got today. bb-parent-hit is a real button (not a
              // plain div) since a single click already means something
              // here -- step up to the immediate parent -- same as
              // Idea/Plan's plain Parent click. _bbRenderParentField
              // (below) fills in the name and wires that click each time
              // the board switches; _bbWireParentAncestorDropdown wires
              // the caret once, at startup.
              +'<div class="bb-mh-fieldgrp">'
                +'<div class="bb-mh-eyebrow">Parent</div>'
                +'<div class="bb-cdrop" id="bb-parent-cdrop" style="display:flex;align-items:center;gap:2px">'
                  +'<button type="button" class="bb-parent-caret" id="bb-parent-caret" title="Jump to any level above" aria-label="Jump to any level above">▾</button>'
                  +'<button type="button" class="bb-hdr-select" id="bb-parent-hit" style="cursor:default"></button>'
                  +'<div class="bb-cdrop-menu" id="bb-parent-menu" hidden></div>'
                +'</div>'
              +'</div>'
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
            +'<div class="bb-mh-group-center"><button type="button" class="bb-mh bb-cdrop-trigger" id="bb-boardkind-trigger" title="Switch to Idea, Plan, Share, or Cast" style="background:none;border:none;padding:0;margin:0;cursor:pointer">Briefing Board</button><div class="bb-cdrop-menu" id="bb-boardkind-menu" hidden></div><div class="bb-mt">A control and communication tool.</div></div>'
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
      rdOv.addEventListener('click', function(e){ if(e.target===rdOv) window.BBArchive.closeRecentlyDeleted(); });
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
      mvOv.addEventListener('click', function(e){ if(e.target===mvOv) window.BBArchive.closeRecentMoves(); });
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
    // Session 271 (Sept 5 2026) -- the Signal Flags manager's own overlay
    // (bb-keylibmanager-overlay), plus the key builder's and key
    // picker's (bb-keybuilder-overlay, bb-keypicker-overlay, below)
    // moved out along with the functions that used them: all three UI
    // flows now go through the T2TStoryboard bridge's own floating
    // overlay (idea-storyboard-9710.js's _sfEnsureOverlay), shared with
    // the Idea Storyboard, instead of BB keeping its own copies. Only
    // bb-keypeek-overlay (further down) stays -- the peek feature itself
    // stayed BB-side.
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
      hxOv.addEventListener('click', function(e){ if(e.target===hxOv) window.BBArchive.closeHX(); });
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
      archOv.addEventListener('click', function(e){ if(e.target===archOv) window.BBArchive.closeArchive(); });
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
      blOv.addEventListener('click', function(e){ if(e.target===blOv) window.BBArchive.closeBriefingLog(); });
      _bbMakeDraggable(blOv.querySelector('.bb-overlay-card'), blOv.querySelector('.bb-overlay-head'));
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

    window._bbWireBriefingBoard();
  }

  window._bbInjectScreens = injectBriefingBoardScreens;

})();
