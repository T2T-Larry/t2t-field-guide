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

(function(){

  function T(){ return window.T2T; }

  // July 22, 2026, Larry: Do split into 3 side-by-side columns by
  // priority family, so priority is visible on the board itself instead
  // of needing to flip a card -- "makes more visible on the BB screen."
  // H DO = HH/H, M DO = MH/M, L DO = ML/L. Doing/Done/Hang-Ups stay
  // single columns. See _bbDoFamily/_bbDoColKey/_bbIsDoCol just below
  // COLUMNS for the shared logic every other place in this file uses
  // to stay in sync with this split.
  // July 23, 2026 (later), Larry: originally ML lived in the M DO
  // column (rank-based split put HH/H | MH/M/ML | L). Larry now wants
  // dragging a card to the top of L DO to escalate it too ("L becomes
  // ML," same as H->HH and M->MH), so the split now matches the H/M/L
  // priority buttons' own pairing (PRI_BASE_OF / PRI_CYCLE below,
  // which already treated L:[L,ML] as a pair) -- H DO = HH/H, M DO =
  // MH/M, L DO = ML/L. Keeps the buttons and the drag columns agreeing
  // on where a card lands instead of fighting each other.
  var COLUMNS = [
    // July 23, 2026, Larry: DO-L used to double as the no-priority
    // bucket ("as an incentive to prioritize"), but Larry wants a real
    // 4th column for it instead -- NEW now holds anything that hasn't
    // been given a priority yet, and DO-L goes back to meaning plain L
    // only. Sits first so an untriaged card is the first thing seen.
    {key:'new',     label:'NEW'},
    // July 22, 2026 (later): Larry likes the red/green/yellow header
    // colors enough to drop the H/M/L letters entirely -- color alone
    // reads as priority now, plain "DO" on all 3.
    {key:'do-h',    label:'DO'},
    {key:'do-m',    label:'DO'},
    {key:'do-l',    label:'DO'},
    {key:'doing',   label:'Doing'},
    {key:'done',    label:'Done'},
    {key:'hangups', label:'Hang-Ups'}
  ];

  var REVIEWERS = ['Larry']; // stand-in list until the real roster exists
  // Card background color, Session 234 (Aug 21) -- new for Briefing Cards,
  // added for bottom-row consistency with the Idea Card (Larry: "add the
  // same bottom row as on the IDEA CARD to the BB Cards... gear..."). Same
  // 8-color palette as idea-storyboard-9710.js's _sboardColorPalette,
  // hardcoded here rather than piped through the T2TStoryboard bridge --
  // it's a fixed list, not live state, so a cross-file dependency would
  // just be overhead.
  var BB_COLOR_PALETTE = ['#d6eaf8','#d9f2e6','#fdf3d0','#f8d9e3','#e6d9f2','#fbe3d0','#d0f2ec','#f0ebe0'];
  // Priority, corrected July 21, 2026 (second pass) -- 3 buttons (H, M,
  // L), each its own 3-click cycle that always escalates toward more
  // urgent: H:[H,HH,off], M:[M,MH,off], L:[L,ML,off]. PRI_BASE_OF maps
  // any stored value back to which of the 3 buttons "owns" it -- needed
  // because ML starts with the letter M but belongs to the L button.
  var PRIORITY_BASE = ['H','M','L'];
  var PRI_CYCLE = { H:['H','HH',''], M:['M','MH',''], L:['L','ML',''] };
  var PRI_BASE_OF = { H:'H', HH:'H', M:'M', MH:'M', L:'L', ML:'L' };
  // Rank: lower number sorts higher (H-side). HH is the most urgent
  // thing on the board; L is the least -- there's no lower rung than
  // plain L, since nothing escalates a low priority further down.
  var PRI_ORDER = {HH:0, H:1, MH:2, M:3, ML:4, L:5};
  // July 23, 2026 (later), Larry: MH/ML recolored off the H/L blend
  // onto a straight green gradient with M -- dark green (MH) -> medium
  // green (M, unchanged) -> light green (ML) -- easier to read at a
  // glance than the old red/yellow-tinted versions.
  var PRI_COLOR = {HH:'#7a0000', H:'#c0272a', MH:'#1f5c1f', M:'#3F8F3F', ML:'#b8ddb0', L:'#eeddaa'};
  var PRI_TEXT = {HH:'#fff', H:'#fff', MH:'#fff', M:'#fff', ML:'#1f3a1a', L:'#3B2510'};
  function _bbNextPriority(current, base){
    var seq=PRI_CYCLE[base];
    var idx = PRI_BASE_OF[current]===base ? seq.indexOf(current) : -1;
    return idx===-1 ? seq[0] : seq[(idx+1)%seq.length];
  }

  // July 22, 2026, Larry: the 3 Do columns (H DO / M DO / L DO). Family
  // is by RANK (see COLUMNS comment above), a different split than
  // PRI_BASE_OF's button-ownership grouping -- don't reuse PRI_BASE_OF
  // here, they answer different questions.
  function _bbDoFamily(priority){
    var rank = PRI_ORDER.hasOwnProperty(priority) ? PRI_ORDER[priority] : 7;
    if(rank<=1) return 'h';   // HH, H
    if(rank<=3) return 'm';   // MH, M
    if(rank<=5) return 'l';   // ML, L
    return 'new';             // unset -- no priority chosen yet (July 23, 2026)
  }
  // July 23, 2026: 'new' is the one family whose column key isn't
  // 'do-'+family (there's no "do-new") -- it's just 'new'.
  function _bbDoColKey(priority){
    var fam=_bbDoFamily(priority);
    return fam==='new' ? 'new' : 'do-'+fam;
  }
  function _bbIsDoCol(colKey){ return colKey==='new' || colKey==='do-h' || colKey==='do-m' || colKey==='do-l'; }
  // The representative priority a drag-drop into a given Do column sets
  // -- coarse (family only); the H/M/L buttons on the card back remain
  // the fine control for HH vs H, MH vs M vs ML, etc. Only overwrites
  // when the card's CURRENT priority isn't already in the target family,
  // so dragging a card within the family it's already in (reordering,
  // or a drop that lands back in the same column) never resets an
  // escalated value like HH or ML back down to its base.
  // July 23, 2026: DO-L's base is now 'L' (it no longer doubles as the
  // no-priority bucket -- that's NEW's job, base '').
  var _bbDoColBasePriority = {'new':'', 'do-h':'H', 'do-m':'M', 'do-l':'L'};
  function _bbPriorityForDrop(colKey, currentPriority){
    var fam = colKey==='new' ? 'new' : colKey.slice(3);
    if(_bbDoFamily(currentPriority)===fam) return currentPriority;
    return _bbDoColBasePriority[colKey];
  }
  // Aug 7 2026 -- Larry moved a card to MH at the top of the M column,
  // and on the very next render _bbAutoEscalateDates silently knocked it
  // back down to H/do-h -- the card had an arrived Start Date that had
  // never triggered the one-time date nudge yet, so the nudge fired for
  // the first time right on top of Larry's own fresh manual placement,
  // undoing it without any visible sign of what happened. The July 23
  // startEscalatedFor/dueEscalatedFor fields already stop the nudge from
  // firing a SECOND time once it's fired once -- this closes the gap for
  // the FIRST time: any manual priority/column decision (drag-drop or
  // the H/M/L buttons) stamps the card's current dates as already
  // handled, so a coincidentally-arrived date can't immediately override
  // a choice the traveler just made.
  function _bbStampDateEscalationHandled(c){
    if(c.startDate) c.startEscalatedFor=c.startDate;
    if(c.due) c.dueEscalatedFor=c.due;
  }

  // Aug 7 2026 (later) -- Larry: a card he moved didn't land where he
  // put it AND couldn't be put back where it was -- it just vanished.
  // (Root cause was the auto-escalate override above; that's fixed.)
  // But Larry's ask was broader than one bug: a real safety net for
  // MOVES themselves, not just Trash. Every manual move (drag-drop or
  // the H/M/L buttons) now writes a row to briefing_card_moves with
  // the before/after col+priority+sortOrder, and the "Recent Moves"
  // panel (bb-moves icon, next to Trash) lists them with an Undo
  // button that puts the card straight back where it was -- no need to
  // guess, no dependency on the card ever having been trashed.
  var BB_MOVE_COL_LABEL = {'new':'NEW','do-h':'DO (H)','do-m':'DO (M)','do-l':'DO (L)','doing':'Doing','done':'Done','hangups':'Hang-Ups'};
  function _bbMoveDesc(col, priority){
    var label = BB_MOVE_COL_LABEL[col] || col || '?';
    return priority ? (label+' \u2014 '+priority) : label;
  }
  // ---- Ctrl/Cmd+Z undo (single-step), Aug 11 2026 -- Larry: "I want that
  // option on the website." Same shape as the Idea Session's own
  // undo/redo slot (session.js, _isxPushAction/_isxUndo/_isxRedo) --
  // one slot, most-recent action only, redo available until the next
  // new action overwrites the slot. Covers moves and deletions for now;
  // Storyboard and text/detail-edit coverage are separate follow-ups.
  var _bbLastAction = null;
  var _bbLastUndone = null;
  function _bbPushAction(entry){ _bbLastAction=entry; _bbLastUndone=null; }
  function _bbShowToast(msg){
    var wrap=document.getElementById('bb-board-wrap');
    if(!wrap) return;
    var banner=document.getElementById('bb-undo-toast');
    if(!banner){
      banner=document.createElement('div');
      banner.id='bb-undo-toast';
      banner.style.cssText='position:absolute;top:14px;right:16px;width:200px;background:#eaf6ea;border:2px solid #2d7a3d;'
        +'color:#2d7a3d;font-size:calc(10px * var(--fg-text-scale,1));padding:6px 9px;border-radius:8px;z-index:45;box-shadow:0 2px 6px rgba(0,0,0,.15)';
      wrap.appendChild(banner);
    }
    banner.textContent=msg;
    banner.style.display='block';
    clearTimeout(banner._bbTimer);
    banner._bbTimer=setTimeout(function(){ banner.style.display='none'; }, 3000);
  }
  async function _bbUndo(){
    if(!_bbLastAction){ _bbShowToast('Nothing to undo.'); return; }
    var a=_bbLastAction; _bbLastAction=null;
    await a.undo();
    _bbLastUndone=a;
    _bbShowToast(a.label+' undone.');
  }
  async function _bbRedo(){
    if(!_bbLastUndone){ _bbShowToast('Nothing to redo.'); return; }
    var a=_bbLastUndone; _bbLastUndone=null;
    await a.redo();
    _bbLastAction=a;
    _bbShowToast(a.label+' redone.');
  }
  // Shared apply-a-snapshot helper, reused by undo AND redo (they're the
  // same operation pointed at a different snapshot) and by the existing
  // Recent Moves panel's own per-item Undo button.
  function _bbApplyCardSnapshot(cardId, snap){
    var c=_bbCardsList().filter(function(x){ return x.id===cardId; })[0];
    if(!c) return;
    c.col=snap.col; c.priority=snap.priority;
    if(typeof snap.sortOrder==='number') c.sortOrder=snap.sortOrder;
    if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
    _bbStampDateEscalationHandled(c);
    _bbSaveLocal(_bbCardsList());
    renderBoard();
  }
  function _bbApplyTrashState(cardId, trashedAt){
    var c=_bbCardsList().filter(function(x){ return x.id===cardId; })[0];
    if(!c) return;
    c.trashedAt=trashedAt;
    _bbSaveLocal(_bbCardsList());
    renderBoard();
  }
  // Card color, Session 234 (Aug 21) -- new for Briefing Cards, set from
  // the bottom row's ⚙️ Gear swatches. Own tiny undo/redo helper, same
  // shape as _bbApplyTrashState just above, rather than folding it into
  // BB_DETAIL_FIELDS (that group only covers fields the detail form
  // saves together on close; color saves immediately on click instead).
  function _bbApplyColor(cardId, color){
    var c=_bbCardsList().filter(function(x){ return x.id===cardId; })[0];
    if(!c) return;
    c.color=color;
    _bbSaveLocal(_bbCardsList());
    if(_bbOpenCardId===cardId) _bbRenderColorSwatches(c);
    renderBoard();
  }
  // Text/detail-edit undo, Aug 11 2026 -- the DETAILS card edits a bunch
  // of fields at once and saves them together on close, so that's
  // treated as one Edit action (not one per field). "Also show on"
  // (sharedToBoardId) is deliberately left out -- it triggers a mirrored
  // card on another board (_bbHandleSharedTagChange) and safely undoing
  // that side effect is its own separate piece of work.
  var BB_DETAIL_FIELDS = ['task','situation','person','due','dueTime','startDate','startTime','routineFreq','routineCustom','budget','notes','reviewedBy','growNote','linkUrl','linkTitle','linkThumb'];
  // Additions, Aug 27 2026 (Larry: "all additions = checkboxes which
  // open when checked and stay open when active") -- Checklist, Due
  // Date, Routine, Budget, Notes, Links each get their own checkbox
  // gating a .bb-addition-body. Deliberately left out of
  // BB_DETAIL_FIELDS/the bundled Edit undo above, same call already
  // made for the routine-card toggle (c.routine) just below --
  // checking/unchecking one saves and takes effect immediately, it
  // isn't part of "everything this form changed on close."
  var BB_ADDITIONS = [
    {flag:'addChecklist', cb:'bb-d-add-checklist', body:'bb-d-checklist-body'},
    {flag:'addRoutine', cb:'bb-d-add-routine', body:'bb-d-routine-body'},
    {flag:'addStart', cb:'bb-d-add-start', body:'bb-d-start-body'},
    {flag:'addDue', cb:'bb-d-add-due', body:'bb-d-due-body'},
    {flag:'addBudget', cb:'bb-d-add-budget', body:'bb-d-budget-body'},
    {flag:'addNotes', cb:'bb-d-add-notes', body:'bb-d-notes-body'},
    {flag:'addLinks', cb:'bb-d-add-links', body:'bb-d-links-body'},
    {flag:'addRelated', cb:'bb-d-add-related', body:'bb-d-related-body'},
    {flag:'addFlags', cb:'bb-d-add-flags', body:'bb-d-flags-body'}
  ];
  function _bbSnapshotCardDetail(c){
    var snap={};
    BB_DETAIL_FIELDS.forEach(function(k){ snap[k]=c[k]||''; });
    return snap;
  }
  function _bbApplyCardDetail(cardId, fields){
    var c=_bbCardsList().filter(function(x){ return x.id===cardId; })[0];
    if(!c) return;
    BB_DETAIL_FIELDS.forEach(function(k){ if(Object.prototype.hasOwnProperty.call(fields,k)) c[k]=fields[k]; });
    _bbSaveLocal(_bbCardsList());
    if(_bbOpenCardId===cardId) openCardDetail(cardId);
    renderBoard();
  }
  var _bbDetailBeforeSnapshot = null;
  var _bbDetailBeforeCardId = null;
  // Video/Link field, Aug 11 2026 (Larry: "adding a video should not
  // require refreshing a screen or website") -- mirrors the Idea
  // Storyboard's own link/oEmbed pattern (idea-media-shared.js /
  // idea-capture.js), reusing the same resolver, but committed to the
  // card the same way every other DETAILS field is: on close, together
  // with everything else, which already saves + re-renders locally with
  // no page reload, and briefing_cards is already on the live-sync
  // channel so other open tabs/devices pick it up the same way.
  var _bbLinkPendingUrl = null, _bbLinkPendingThumb = null, _bbLinkPendingTitle = null, _bbLinkTimer = null;
  function _bbIsBareUrl(text){ return /^https?:\/\/\S+$/i.test((text||'').trim()); }
  function _bbRenderLinkPreview(url, thumb, title){
    var preview=document.getElementById('bb-d-link-preview');
    if(!preview) return;
    if(!url){ preview.style.display='none'; preview.innerHTML=''; return; }
    preview.style.display='';
    preview.innerHTML=(thumb ? ('<img src="'+thumb+'">') : '')+_esc(title||url);
  }
  function wireBbUndoKeyboard(){
    document.addEventListener('keydown', function(e){
      var screen=document.getElementById('s-briefing-board');
      if(!screen || !screen.classList.contains('active')) return;
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||(e.target&&e.target.isContentEditable)) return;
      var mod=e.metaKey||e.ctrlKey;
      if(!mod) return;
      var k=e.key.toLowerCase();
      if(k==='z'){ e.preventDefault(); if(e.shiftKey) _bbRedo(); else _bbUndo(); }
    });
  }

  function _bbSnapshotCard(c){
    return {col:c.col, priority:c.priority, sortOrder:c.sortOrder};
  }
  // Fire-and-forget: logs a move to Supabase if col/priority/sortOrder
  // actually changed. Never blocks the UI and never throws -- a failed
  // log write shouldn't stop the move itself from saving.
  async function _bbLogCardMove(c, before){
    if(!_bbCurrentBoardId) return;
    if(before.col===c.col && before.priority===c.priority && before.sortOrder===c.sortOrder) return;
    (function(){
      var cardId=c.id, beforeSnap=before, afterSnap=_bbSnapshotCard(c);
      _bbPushAction({
        label:'Move',
        undo: function(){ _bbApplyCardSnapshot(cardId, beforeSnap); },
        redo: function(){ _bbApplyCardSnapshot(cardId, afterSnap); }
      });
    })();
    var sb=T().sb; if(!sb) return;
    try{
      await sb.from('briefing_card_moves').insert({
        board_id: _bbCurrentBoardId,
        card_id: c.id,
        task: c.task||'',
        from_col: before.col||null, from_priority: before.priority||null, from_sort_order: (typeof before.sortOrder==='number')?before.sortOrder:null,
        to_col: c.col||null, to_priority: c.priority||null, to_sort_order: (typeof c.sortOrder==='number')?c.sortOrder:null
      });
    }catch(e){ console.error('Briefing Board: move log failed', e); }
  }
  function _bbMoveAgo(iso){
    var d=new Date(iso); if(isNaN(d.getTime())) return '';
    var mins=Math.floor((Date.now()-d.getTime())/60000);
    if(mins<1) return 'just now';
    if(mins<60) return mins+' min ago';
    var hrs=Math.floor(mins/60);
    if(hrs<24) return hrs+(hrs===1?' hour ago':' hours ago');
    var days=Math.floor(hrs/24);
    return days+(days===1?' day ago':' days ago');
  }
  function openRecentMoves(){
    _bbRenderRecentMoves();
    var ov=document.getElementById('bb-moves-overlay');
    if(ov) ov.classList.add('active');
  }
  function closeRecentMoves(){
    var ov=document.getElementById('bb-moves-overlay'); if(ov) ov.classList.remove('active');
  }
  var _bbMovesCache = [];
  async function _bbRenderRecentMoves(){
    var wrap=document.getElementById('bb-moves-list'); if(!wrap) return;
    wrap.innerHTML='<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#a3907a;text-align:center;padding:16px 0">Loading...</div>';
    var sb=T().sb;
    if(!sb || !_bbCurrentBoardId){ wrap.innerHTML='<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#a3907a;text-align:center;padding:16px 0">Nothing in here right now.</div>'; return; }
    try{
      var res=await sb.from('briefing_card_moves').select('*').eq('board_id', _bbCurrentBoardId).is('undone_at', null).order('moved_at',{ascending:false}).limit(20);
      if(res.error) throw res.error;
      _bbMovesCache = res.data||[];
    }catch(e){ console.error('Briefing Board: load moves failed', e); _bbMovesCache=[]; }
    if(!_bbMovesCache.length){
      wrap.innerHTML='<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#a3907a;text-align:center;padding:16px 0">Nothing in here right now.</div>';
      return;
    }
    wrap.innerHTML=_bbMovesCache.map(function(m){
      return '<div class="bb-mv-item" style="border:0.5px solid #d8cdb8;border-radius:8px;padding:8px;margin-bottom:6px">'
        +'<div style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:2px">'+_esc(m.task||'(untitled)')+'</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#6b5a42;margin-bottom:2px">'+_esc(_bbMoveDesc(m.from_col,m.from_priority))+' \u2192 '+_esc(_bbMoveDesc(m.to_col,m.to_priority))+'</div>'
        +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;margin-bottom:6px">'+_bbMoveAgo(m.moved_at)+'</div>'
        +'<button class="bb-icon-btn" data-mv-undo="'+_esc(m.id)+'" style="width:auto;height:auto;font-size:calc(11px * var(--fg-text-scale,1));padding:4px 8px">Undo -- put it back</button>'
      +'</div>';
    }).join('');
  }
  async function _bbUndoMove(moveId){
    var m=_bbMovesCache.filter(function(x){ return x.id===moveId; })[0];
    if(!m) return;
    var c=_bbCardsList().filter(function(x){ return x.id===m.card_id; })[0];
    if(!c){ window.alert('That card is no longer on this board (it may have been trashed).'); return; }
    var before=_bbSnapshotCard(c);
    c.col=m.from_col; c.priority=m.from_priority; c.sortOrder=(typeof m.from_sort_order==='number')?m.from_sort_order:c.sortOrder;
    if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
    _bbStampDateEscalationHandled(c);
    _bbSaveLocal(_bbCardsList());
    var sb=T().sb;
    if(sb){
      try{ await sb.from('briefing_card_moves').update({undone_at:new Date().toISOString()}).eq('id', moveId); }catch(e){ console.error('Briefing Board: mark move undone failed', e); }
    }
    // Log the undo itself as a fresh move, so it too can be reverted.
    _bbLogCardMove(c, before);
    await _bbRenderRecentMoves();
    renderBoard();
  }
  function wireRecentMoves(){
    T().wire('bb-moves-close', closeRecentMoves);
    var wrap=document.getElementById('bb-moves-list'); if(!wrap) return;
    wrap.addEventListener('click', function(e){
      var undoId=e.target.getAttribute && e.target.getAttribute('data-mv-undo');
      if(undoId) _bbUndoMove(undoId);
    });
  }
  // Rows older than this get cleaned up automatically -- mirrors the
  // Trash retention window (BB_TRASH_RETENTION_DAYS below).
  var BB_MOVE_LOG_RETENTION_DAYS = 30;
  async function _bbPurgeOldMoves(boardId){
    var sb=T().sb; if(!sb || !boardId) return;
    try{
      var cutoff=new Date(Date.now() - BB_MOVE_LOG_RETENTION_DAYS*86400000).toISOString();
      await sb.from('briefing_card_moves').delete().eq('board_id', boardId).lt('moved_at', cutoff);
    }catch(e){ console.error('Briefing Board: move log auto-purge failed', e); }
  }

  var THEMES = [
    {key:'gold',   label:'Gold',   bg:'#FDF6E8', accent:'#C9A87C', ink:'#3B2510', sub:'#7A5C3A'},
    {key:'forest', label:'Forest', bg:'#EFF5EC', accent:'#8FBE8A', ink:'#1F3A1A', sub:'#3F6B3A'},
    {key:'ocean',  label:'Ocean',  bg:'#EAF3FB', accent:'#6FA8D9', ink:'#16324A', sub:'#3A6485'},
    {key:'rose',   label:'Rose',   bg:'#FBEFF2', accent:'#D98FA8', ink:'#4A1F2E', sub:'#7A4054'}
  ];
  var FONTS = [
    {key:'classic', label:'Classic', head:'"Playfair Display",serif', body:'Georgia,serif'},
    {key:'clean',   label:'Clean',   head:'"Segoe UI",Helvetica,Arial,sans-serif', body:'"Segoe UI",Helvetica,Arial,sans-serif'}
  ];

  // Signal Flags, July 21, 2026 -- replaces the old one-per-board Signal.
  // A shared library of up to 12 traveler-defined keys (shape + color
  // + meaning), built from a fixed set of 6 shapes and 6 curated colors
  // so any two library entries stay visually distinct at card-face size.
  // Each card carries up to 3 of them (c.keys, an array of library ids)
  // -- see Larry's July 21 design chat for the 6/6/6/3 reasoning.
  var SIGNAL_SHAPES = ['circle','square','triangle','diamond','star','heart'];
  var KEY_COLORS = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var MAX_KEY_LIBRARY = 12; // raised from 6 -- Aug 4 2026, after merging Storyboard + Briefing Board libraries into one shared pool, the old per-board cap of 6 was too low for the combined set
  var MAX_KEYS_PER_CARD = 3;
  var SIGNAL_CLIP = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  function _bbShapeCSS(shape, color){
    var css='background:'+color+';';
    if(shape==='circle') css+='border-radius:50%;';
    else if(shape==='square') css+='border-radius:2px;';
    else if(SIGNAL_CLIP[shape]) css+='clip-path:'+SIGNAL_CLIP[shape]+';';
    return css;
  }
  function _bbLoadKeyLibrary(){
    return _bbKeyLibCache;
  }
  // Old per-board sessionStorage key, kept read-only so the one legacy
  // migration path below (a "field guide"-named board found empty)
  // can still recover any keys a traveler entered before named
  // multi-board storage shipped -- nothing else writes this key anymore.
  function _bbLoadKeyLibraryLegacy(){
    try{ var r=sessionStorage.getItem('bbKeyLibrary'); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  async function _bbEnsureKeyLibraryLoaded(){
    if(_bbKeyLibraryLoaded) return;
    _bbKeyLibraryLoaded=true;
    var sb=T().sb; if(!sb) return;
    try{
      var uid=await _bbCurrentUserId(); if(!uid) return;
      var res=await sb.from('custom_keys').select('*').eq('user_id',uid).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _bbKeyLibCache=res.data||[];
    }catch(e){ console.error('Briefing Board: could not load key library', e); }
  }
  async function _bbEnsureHiddenTypesLoaded(){
    if(_bbHiddenTypesLoaded) return;
    _bbHiddenTypesLoaded=true;
    var sb=T().sb; if(!sb) return;
    try{
      var uid=await _bbCurrentUserId(); if(!uid) return;
      var res=await sb.from('org_type_hidden').select('value').eq('user_id',uid);
      if(res.error) throw res.error;
      _bbHiddenTypesCache=(res.data||[]).map(function(r){ return r.value; });
    }catch(e){ console.error('Briefing Board: could not load hidden Types', e); }
  }
  // Fixed Types minus whatever's hidden -- but a value still in use by
  // one of the traveler's own boards always shows regardless, so hiding
  // a preset can never strand access to an existing board.
  function _bbVisibleFixedTypes(){
    var hidden={}; (_bbHiddenTypesCache||[]).forEach(function(v){ hidden[v]=true; });
    var inUse={}; _bbBoards.forEach(function(b){ inUse[(b.board_type||'personal')]=true; });
    return BB_BOARD_TYPES.filter(function(t){ return !hidden[t.value] || inUse[t.value]; });
  }
  async function _bbHideType(value){
    var uid=await _bbCurrentUserId(); if(!uid || !value) return;
    if(_bbHiddenTypesCache.indexOf(value)===-1) _bbHiddenTypesCache.push(value);
    var sb=T().sb;
    try{
      var ins=await sb.from('org_type_hidden').upsert({user_id:uid, value:value});
      if(ins.error) console.error('Briefing Board: could not hide Type', ins.error);
    }catch(e){ console.error('Briefing Board: could not hide Type', e); }
    _bbRenderTypePicker();
    _bbRenderOrgName();
  }
  async function _bbCreateKey(shape, color, meaning){
    var sb=T().sb;
    var uid=await _bbCurrentUserId();
    if(!uid) throw new Error('Not signed in.');
    var ins=await sb.from('custom_keys').insert({user_id:uid, shape:shape, color:color, meaning:meaning}).select().single();
    if(ins.error) throw ins.error;
    _bbKeyLibCache.push(ins.data);
    return ins.data;
  }
  async function _bbUpdateKey(keyId, shape, color, meaning){
    var sb=T().sb;
    var upd=await sb.from('custom_keys').update({shape:shape, color:color, meaning:meaning}).eq('id', keyId).select().single();
    if(upd.error) throw upd.error;
    var idx=_bbKeyLibCache.findIndex ? _bbKeyLibCache.findIndex(function(k){ return String(k.id)===String(keyId); }) : -1;
    if(idx===-1){ for(var i=0;i<_bbKeyLibCache.length;i++){ if(String(_bbKeyLibCache[i].id)===String(keyId)){ idx=i; break; } } }
    if(idx!==-1) _bbKeyLibCache[idx]=upd.data;
    return upd.data;
  }
  async function _bbDeleteKey(keyId){
    var sb=T().sb;
    var del=await sb.from('custom_keys').delete().eq('id', keyId);
    if(del.error) throw del.error;
    _bbKeyLibCache=_bbKeyLibCache.filter(function(k){ return String(k.id)!==String(keyId); });
  }

  var TRASH_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
  // Aug 7 2026 -- the "Recent Moves" icon (a plain clock) that opens
  // the move-history/undo panel, sitting just to the left of Trash.
  var MOVES_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 16 14"></polyline></svg>';

  var _bbCards = null;
  var _bbOpenCardId = null;
  var _bbTrashPendingId = null;
  var _bbAddStatusTimer = null;

  // Supabase-backed multi-board state, added July 21, 2026 (evening).
  var _bbCurrentBoardId = null;
  // TYPE + NAME, Aug 3 2026 -- originally the 4 board types Larry
  // named: Personal, Departmental, Company, Project. Expanded Aug 15
  // 2026 to the fuller starter set from the Organization design
  // conversation -- Project dropped from the seeded list (it's now its
  // own PROJECT eyebrow, not a Type), but any board already using
  // 'project' keeps working -- _bbExtraBoardTypes always re-adds
  // whatever's actually in use, seeded or not.
  var BB_BOARD_TYPES = [
    {value:'organization', label:'Organization'},
    {value:'company', label:'Company'},
    {value:'departmental', label:'Department'},
    {value:'client', label:'Client'},
    {value:'partner', label:'Partner'},
    {value:'supplier', label:'Supplier'},
    {value:'customer', label:'Customer'},
    {value:'personal', label:'Personal'}
  ];
  // Hidden presets, Aug 15 2026 -- a traveler can remove a seeded Type
  // they don't want cluttering the list (e.g. Jonny drops "Client" and
  // keeps only "Partner"). Only ever hides *unused* presets -- a value
  // still in use by one of the traveler's own boards always keeps
  // showing regardless (see _bbVisibleFixedTypes), so removing one
  // never strands access to an existing board.
  var _bbHiddenTypesCache = [];
  var _bbHiddenTypesLoaded = false;
  var _bbBoards = [];
  // Adoption edges, Aug 16 2026 -- Larry opened T2T and expected
  // Field Guide and Professional History to show in the PROJECT
  // list underneath it; they didn't, because that list only ever
  // matched on board_type, and board_relations (the adoption link
  // from Session 214-215) was never consulted. Loaded once per
  // session alongside _bbBoards -- see _bbInitBoardsAndData and
  // _bbChildBoardsOf.
  var _bbRelationsCache = [];
  // Empty-Type browsing, Aug 16 2026 -- Larry: "EVEN IF the field is
  // BLANK, make it a dropdown with the (+) and (-) options... They
  // all work the same way!" Picking a Type with zero boards used to
  // jump straight to a prompt() since there was nothing to switch
  // to. This override lets Type/Org Name/Project all show that empty
  // Type's dropdown shell instead -- the actual board content area
  // keeps showing whatever board was open before, since there's
  // truly nothing to open yet; only the header reflects the browsed
  // Type until a first board of it gets created via Org Name's or
  // Project's own (+). Reset to null the moment a real board opens
  // (_bbSwitchToBoard), so it never lingers.
  var _bbPendingTypeOverride = null;
  // Signal Flags, Aug 3 2026 -- merged into the Storyboard's shared,
  // traveler-wide custom_keys table (was its own board-scoped
  // briefing_board_keys). Loaded once per session (_bbKeyLibraryLoaded
  // guards it), not re-fetched on every board switch -- see
  // _bbEnsureKeyLibraryLoaded, called from _bbInitBoardsAndData.
  var _bbKeyLibCache = [];
  var _bbKeyLibraryLoaded = false;

  var _bbChecklistCache = [];
  // Per-key link counts, Aug 4 2026 -- Larry: "Links are Key related...
  // One key on a card might have 7 links; another only 3." Same shape
  // Keyed two levels deep: {cardId: {keyId: n}}.
  // A key's link count IS the number of other cards/ideas currently
  // sharing that exact key (that's what _bbSyncKeyLinks wires up one
  // edge per pair for), so this reads straight off the already-tagged
  // source='key' rows rather than recomputing anything.
  var _bbKeyLinkCountCache = {};
  var _bbInitStarted = false;
  // Overdue pink-flash, Aug 15 2026 -- ids that _bbAutoEscalateDates just
  // discovered are newly overdue on THIS pass, so renderBoard's card
  // loop knows to play the one-time flash animation instead of just the
  // steady pink face it draws every time regardless.
  var _bbOverdueFlashIds = [];

  function _bbUUID(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  }

  function _bbToday(){
    var d=new Date();
    return (d.getMonth()+1)+'/'+d.getDate();
  }

  function _bbLoadLocal(){
    try{ var r=sessionStorage.getItem('bbCards'); return r?JSON.parse(r):null; }
    catch(e){ return null; }
  }
  function _bbSaveLocal(cards, deletedIds){
    _bbCards = cards;
    try{ sessionStorage.setItem('bbCards', JSON.stringify(cards)); }catch(e){}
    _bbSyncCardsToSupabase(cards, deletedIds);
    // Foreign/shared-in card fix, Aug 14 2026 -- Larry: cards merged onto
    // this board from elsewhere (Personal BB's assigned-to-me read-through,
    // or a project board's shared-in cards) live in _bbForeignCards /
    // _bbSharedInCards, never in _bbCards -- deliberately, so the
    // whole-list sync just above can never steal one onto the wrong
    // board_id (see the block comment above _bbForeignCards). But that
    // also meant every edit made through the newly-openable shared Detail
    // overlay -- Notes, Priority, a Signal Flag, anything -- silently
    // never made it to the database: it patched the in-memory foreign-
    // card object, which this function never looks at, so the very next
    // fetch of that board quietly overwrote it back to the old value.
    // Whichever card is currently open gets checked here and, if it's a
    // foreign one, saved with its own narrow single-row write instead.
    _bbPersistOpenForeignCardIfAny();
  }
  async function _bbPersistOpenForeignCardIfAny(){
    if(!_bbOpenCardId) return;
    var fc=(_bbForeignCards||[]).concat(_bbSharedInCards||[]).filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(!fc) return;
    var sb=T().sb; if(!sb) return;
    try{
      var row=_bbCardToRow(fc, fc._homeBoardId);
      // Position (column + order) is intentionally left alone here and
      // stays on its own separate path (_bbPersistForeignPosition /
      // _bbPersistSharedPosition, driven only by dragging the card) --
      // fc.col/fc.sortOrder are THIS viewer's merged display placement
      // (personal_col/shared_col), not the card's real status on its
      // home board, so writing them back here would silently move the
      // card's actual Doing/Done/Hang-Ups status just because it happens
      // to sit somewhere else on a mirrored view. id and board_id are
      // dropped from the payload too, so this can never move a card onto
      // a different board no matter what changes upstream.
      row.col = fc._realCol;
      delete row.id;
      delete row.board_id;
      delete row.sort_order;
      var res=await sb.from('briefing_cards').update(row).eq('id', fc.id);
      if(res.error) console.error('Briefing Board: foreign card save failed', res.error);
    }catch(e){ console.error('Briefing Board: foreign card save failed', e); }
  }
  function _bbSeed(){
    return [
      {id:_bbUUID(), col:'new', sortOrder:0, assigned:_bbToday(), task:'Drag this card to Doing when you start it', person:_bbCurrentBoardDefaultAssignee(), due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false, reviewedBy:REVIEWERS[0], archived:false}
    ];
  }
  function _bbCardsList(){
    if(!_bbCards){ _bbCards = _bbLoadLocal() || _bbSeed(); }
    return _bbCards;
  }

  // Finds a card wherever it actually lives, Aug 14 2026 -- Larry: "why
  // can't I open some of the cards on the BB?" Root cause: every lookup
  // by id in this file only ever checked _bbCardsList() (cards native to
  // whichever board is currently open). Merged cards -- a Personal BB's
  // assigned-to-me read-through (_bbForeignCards) and a project board's
  // shared-in cards (_bbSharedInCards) -- were deliberately kept out of
  // that list (see the block comment above _bbForeignCards) so a
  // whole-list save could never steal one onto the wrong board_id. That
  // safety was correct, but nothing ever widened the READ side to match,
  // so double-clicking one of those cards found nothing and silently did
  // nothing. This checks all three places a card can live; every open/
  // edit/save path below should go through this instead of
  // _bbCardsList() alone whenever it's resolving the currently-open card.
  function _bbFindCardAnywhere(id){
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(c) return c;
    c=(_bbForeignCards||[]).filter(function(x){ return x.id===id; })[0];
    if(c) return c;
    return (_bbSharedInCards||[]).filter(function(x){ return x.id===id; })[0];
  }

  function _bbCurrentBoardDefaultAssignee(){
    var b=_bbBoards.filter(function(x){ return x.id===_bbCurrentBoardId; })[0];
    return (b && b.default_assignee) || '';
  }

  // ---- Supabase persistence, added July 21, 2026 (evening) -- boards
  // and cards live in real per-traveler Supabase tables (briefing_boards
  // / briefing_cards) instead of only sessionStorage. Every existing
  // card mutation in this file still just calls _bbSaveLocal exactly as
  // before -- it now ALSO pushes to Supabase in the background
  // (fire-and-forget) whenever a Supabase board is active, so nothing
  // else in this file had to change. If Supabase is unreachable, or
  // nobody's signed in, the board quietly keeps working exactly as it
  // always did, straight off sessionStorage.
  // Signal Flags are a separate story, Aug 3 2026 -- originally their
  // own board-scoped briefing_board_keys table (mirroring this same
  // save-local-then-sync pattern), now merged into the Storyboard's
  // shared, traveler-wide custom_keys table -- see _bbEnsureKeyLibraryLoaded
  // / _bbCreateKey / _bbUpdateKey / _bbDeleteKey below.

  function _bbToISODate(mdStr){
    var d=_bbParseDue(mdStr);
    if(!d) return null;
    var mm=String(d.getMonth()+1); if(mm.length<2) mm='0'+mm;
    var dd=String(d.getDate()); if(dd.length<2) dd='0'+dd;
    return d.getFullYear()+'-'+mm+'-'+dd;
  }
  function _bbFromISODate(iso){
    if(!iso) return '';
    var parts=String(iso).split('-');
    if(parts.length!==3) return '';
    return parseInt(parts[1],10)+'/'+parseInt(parts[2],10);
  }
  function _bbMDFromTimestamp(ts){
    if(!ts) return _bbToday();
    var d=new Date(ts);
    if(isNaN(d.getTime())) return _bbToday();
    return (d.getMonth()+1)+'/'+d.getDate();
  }

  function _bbCardToRow(c, boardId){
    var keys=c.keys||[];
    return {
      id: c.id, board_id: boardId, col: c.col,
      task: c.task||'', person: c.person||null, reviewed_by: c.reviewedBy||null,
      due_date: _bbToISODate(c.due), start_date: _bbToISODate(c.startDate), completed_date: _bbToISODate(c.completedDate),
      due_time: c.dueTime||null, start_time: c.startTime||null,
      is_routine: !!c.routine, routine_freq: c.routineFreq||null, routine_custom: c.routineCustom||null,
      budget: c.budget||null, notes: c.notes||null, priority: c.priority||'',
      verified: !!c.verified, pro: !!c.pro, grow: !!c.grow, grow_note: c.growNote||null,
      archived: !!c.archived,
      locked: !!c.locked, lock_reason: c.lockReason||null,
      shared_to_board_id: c.sharedToBoardId||null,
      color: c.color||null,
      key_slot_1: keys[0]||null, key_slot_2: keys[1]||null, key_slot_3: keys[2]||null,
      situation: c.situation||null, hangup_since: _bbToISODate(c.hangupSince), hangup_header_id: c.hangupHeaderId||null,
      link_url: c.linkUrl||null, link_title: c.linkTitle||null, link_thumb: c.linkThumb||null,
      // Addition toggles, Aug 27 2026 -- see BB_ADDITIONS below.
      adds_checklist: !!c.addChecklist, adds_due: !!c.addDue, adds_routine: !!c.addRoutine,
      adds_start: !!c.addStart, adds_budget: !!c.addBudget, adds_notes: !!c.addNotes, adds_links: !!c.addLinks,
      adds_related: !!c.addRelated, adds_flags: !!c.addFlags,
      sort_order: (typeof c.sortOrder==='number') ? c.sortOrder : null,
      start_escalated_for: _bbToISODate(c.startEscalatedFor), due_escalated_for: _bbToISODate(c.dueEscalatedFor),
      overdue_flash_shown_for: _bbToISODate(c.overdueFlashShownFor),
      start_overdue_flash_shown_for: _bbToISODate(c.startOverdueFlashShownFor),
      trashed_at: c.trashedAt || null
    };
  }
  function _bbRowToCard(row){
    return {
      id: row.id, col: row.col, assigned: _bbMDFromTimestamp(row.created_at),
      task: row.task||'', person: row.person||'', due: _bbFromISODate(row.due_date),
      startDate: _bbFromISODate(row.start_date), completedDate: _bbFromISODate(row.completed_date),
      dueTime: row.due_time||'', startTime: row.start_time||'',
      routine: !!row.is_routine, routineFreq: row.routine_freq||'', routineCustom: row.routine_custom||'',
      budget: row.budget||'', notes: row.notes||'', keys: [row.key_slot_1||null, row.key_slot_2||null, row.key_slot_3||null],
      priority: row.priority||'', verified: !!row.verified, pro: !!row.pro, grow: !!row.grow,
      growNote: row.grow_note||'', reviewedBy: row.reviewed_by||REVIEWERS[0], archived: !!row.archived,
      locked: !!row.locked, lockReason: row.lock_reason||'',
      sharedToBoardId: row.shared_to_board_id||null,
      color: row.color||'',
      situation: row.situation||'', hangupSince: _bbFromISODate(row.hangup_since), hangupHeaderId: row.hangup_header_id||null,
      linkUrl: row.link_url||'', linkTitle: row.link_title||'', linkThumb: row.link_thumb||'',
      // Addition toggles, Aug 27 2026 -- see BB_ADDITIONS below. The
      // Aug 27 migration backfilled these true for any card that
      // already had real content in the matching field, so nothing
      // already on a card goes invisible just because this shipped.
      addChecklist: !!row.adds_checklist, addDue: !!row.adds_due, addRoutine: !!row.adds_routine,
      addStart: !!row.adds_start, addBudget: !!row.adds_budget, addNotes: !!row.adds_notes, addLinks: !!row.adds_links,
      addRelated: !!row.adds_related, addFlags: !!row.adds_flags,
      sortOrder: (typeof row.sort_order==='number') ? row.sort_order : null,
      startEscalatedFor: _bbFromISODate(row.start_escalated_for), dueEscalatedFor: _bbFromISODate(row.due_escalated_for),
      overdueFlashShownFor: _bbFromISODate(row.overdue_flash_shown_for),
      startOverdueFlashShownFor: _bbFromISODate(row.start_overdue_flash_shown_for),
      trashedAt: row.trashed_at || null,
      // Header-linked task cards only (Aug 11 2026) -- auto-created and kept
      // in sync by the ideas_sync_header_task_card DB trigger whenever an
      // unlocked, active Idea Storyboard header exists. topicLabel is the
      // TOPIC's name, denormalized so the eyebrow still reads right if this
      // card is merged onto a different board (Personal BB read-through).
      sourceHeaderId: row.source_header_id || null,
      topicLabel: row.topic_label || ''
    };
  }
  function _bbSafeIdList(rows){
    return rows.map(function(r){ return String(r.id).replace(/[^a-zA-Z0-9-]/g,''); });
  }

  // Aug 7 2026 -- Larry: "We need a safety net for potential errors."
  // This used to upsert the given cards, THEN delete anything on the
  // board that wasn't in that same list -- meant to propagate local
  // deletions, but it meant ANY save from a list that was momentarily
  // incomplete (a stale tab, a card another tab/session had just added
  // that hadn't made it into this tab's in-memory list yet) would wipe
  // out real cards from Supabase with no warning and no way back. Now
  // that Trash is a soft delete (trashedAt, see doTrashCard) and the
  // only place a card is ever meant to leave _bbCards entirely is an
  // explicit "Delete Forever" in Recently Deleted, this function only
  // ever upserts -- deletion is opt-in per call via deletedIds, never
  // an automatic side effect of what happens to be missing from the
  // list at save time.
  async function _bbSyncCardsToSupabase(cards, deletedIds){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var rows=cards.map(function(c){ return _bbCardToRow(c, _bbCurrentBoardId); });
      if(rows.length){
        var res=await sb.from('briefing_cards').upsert(rows);
        if(res.error) throw res.error;
      }
      if(deletedIds && deletedIds.length){
        await sb.from('briefing_cards').delete().in('id', _bbSafeIdList(deletedIds.map(function(id){ return {id:id}; })));
      }
    }catch(e){ console.error('Briefing Board: Supabase card sync failed', e); }
  }

  // Checklist, added July 21, 2026 (evening) -- sub-steps under a card.
  // Lives in its own briefing_checklist_items table (one row per step),
  // loaded/saved per open card rather than riding along with the card's
  // own row. Same local-fallback shape as everything else: sessionStorage
  // (keyed per card id) when there's no Supabase board active.
  function _bbChecklistLocalKey(cardId){ return 'bbChecklist_'+cardId; }
  function _bbLoadChecklistLocal(cardId){
    try{ var r=sessionStorage.getItem(_bbChecklistLocalKey(cardId)); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  function _bbSaveChecklistLocal(cardId, items){
    try{ sessionStorage.setItem(_bbChecklistLocalKey(cardId), JSON.stringify(items)); }catch(e){}
  }
  async function _bbSyncChecklistToSupabase(cardId, items){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var rows=items.map(function(it,i){ return {id:it.id, card_id:cardId, item_text:it.text||'', done:!!it.done, sort_order:i}; });
      if(rows.length){
        var res=await sb.from('briefing_checklist_items').upsert(rows);
        if(res.error) throw res.error;
        await sb.from('briefing_checklist_items').delete().eq('card_id', cardId).not('id','in','('+_bbSafeIdList(rows).join(',')+')');
      } else {
        await sb.from('briefing_checklist_items').delete().eq('card_id', cardId);
      }
    }catch(e){ console.error('Briefing Board: checklist sync failed', e); }
  }
  function _bbSaveChecklist(cardId, items){
    _bbChecklistCache = items;
    _bbSaveChecklistLocal(cardId, items);
    _bbSyncChecklistToSupabase(cardId, items);
  }
  async function _bbLoadChecklistForCard(cardId){
    if(_bbCurrentBoardId){
      var sb=T().sb;
      try{
        var res=await sb.from('briefing_checklist_items').select('*').eq('card_id',cardId).order('sort_order',{ascending:true});
        if(!res.error){
          var items=(res.data||[]).map(function(r){ return {id:r.id, text:r.item_text||'', done:!!r.done}; });
          if(_bbOpenCardId===cardId){ _bbChecklistCache=items; _bbRenderChecklist(); }
          return;
        }
      }catch(e){ console.error('Briefing Board: checklist load failed', e); }
    }
    var local=_bbLoadChecklistLocal(cardId);
    if(_bbOpenCardId===cardId){ _bbChecklistCache=local; _bbRenderChecklist(); }
  }
  function _bbRenderChecklist(){
    var list=document.getElementById('bb-d-checklist-list'); if(!list) return;
    if(!_bbChecklistCache.length){
      list.innerHTML='';
      return;
    }
    list.innerHTML=_bbChecklistCache.map(function(it){
      return '<div class="bb-checklist-row">'
        +'<input type="checkbox" class="bb-checklist-check" data-id="'+_esc(it.id)+'"'+(it.done?' checked':'')+'>'
        +'<span class="bb-checklist-text'+(it.done?' bb-checklist-done':'')+'">'+_esc(it.text)+'</span>'
        +'<button class="bb-checklist-remove" data-id="'+_esc(it.id)+'" title="Remove">&#10005;</button>'
        +'</div>';
    }).join('');
    list.querySelectorAll('.bb-checklist-check').forEach(function(cb){
      cb.addEventListener('change', function(){
        var id=cb.getAttribute('data-id');
        var it=_bbChecklistCache.filter(function(x){ return x.id===id; })[0];
        if(it && _bbOpenCardId){ it.done=cb.checked; _bbSaveChecklist(_bbOpenCardId, _bbChecklistCache); _bbRenderChecklist(); }
      });
    });
    list.querySelectorAll('.bb-checklist-remove').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(!_bbOpenCardId) return;
        var id=btn.getAttribute('data-id');
        _bbChecklistCache=_bbChecklistCache.filter(function(x){ return x.id!==id; });
        _bbSaveChecklist(_bbOpenCardId, _bbChecklistCache);
        _bbRenderChecklist();
      });
    });
  }
  // Small calendar popup for the date fields (Due date / Start date),
  // Aug 7 2026 -- Larry: pick from a calendar instead of typing
  // MM/DD/YYYY by hand, today's date should stand out. Reads/writes the
  // same plain text input _bbParseDue already expects, so nothing else
  // about how dates are stored or validated has to change -- this is
  // just a faster way to fill in the same field. Built fresh rather
  // than a native <input type="date"> so the look matches the rest of
  // the card and MM/DD/YYYY without a year still works for hand-typing.
  function _bbAutoGrowNotes(){
    var el=document.getElementById('bb-d-notes'); if(!el) return;
    el.style.height='auto';
    el.style.height=Math.max(44, el.scrollHeight)+'px';
  }
  function _bbAttachDatePicker(inputId, btnId){
    var input=document.getElementById(inputId); if(!input) return;
    var pop=null, viewYear=0, viewMonth=0;
    var MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
    function onDocDown(e){
      if(pop && e.target!==input && !pop.contains(e.target)) closePop();
    }
    function closePop(){
      if(!pop) return;
      pop.remove(); pop=null;
      document.removeEventListener('mousedown', onDocDown, true);
    }
    function render(){
      var now=new Date();
      var selected=_bbParseDue(input.value);
      var firstDow=new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth=new Date(viewYear, viewMonth+1, 0).getDate();
      var html='<div class="bb-dp-head">'
        +'<button type="button" class="bb-dp-nav" data-dp-nav="-1" aria-label="Previous month">&#8249;</button>'
        +'<span class="bb-dp-label">'+MONTH_NAMES[viewMonth]+' '+viewYear+'</span>'
        +'<button type="button" class="bb-dp-nav" data-dp-nav="1" aria-label="Next month">&#8250;</button>'
        +'</div><div class="bb-dp-grid">';
      ['S','M','T','W','T','F','S'].forEach(function(d){ html+='<span class="bb-dp-dow">'+d+'</span>'; });
      for(var i=0;i<firstDow;i++) html+='<span class="bb-dp-day bb-dp-blank"></span>';
      for(var d=1; d<=daysInMonth; d++){
        var isToday=(viewYear===now.getFullYear() && viewMonth===now.getMonth() && d===now.getDate());
        var isSel=(selected && selected.getFullYear()===viewYear && selected.getMonth()===viewMonth && selected.getDate()===d);
        html+='<button type="button" class="bb-dp-day'+(isToday?' bb-dp-today':'')+(isSel?' bb-dp-selected':'')+'" data-dp-day="'+d+'">'+d+'</button>';
      }
      html+='</div>';
      pop.innerHTML=html;
      pop.querySelectorAll('[data-dp-nav]').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          viewMonth+=parseInt(btn.getAttribute('data-dp-nav'),10);
          if(viewMonth<0){ viewMonth=11; viewYear--; } else if(viewMonth>11){ viewMonth=0; viewYear++; }
          render();
        });
      });
      pop.querySelectorAll('[data-dp-day]').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          input.value=(viewMonth+1)+'/'+btn.getAttribute('data-dp-day')+'/'+viewYear;
          closePop();
          input.focus();
        });
      });
    }
    function openPop(){
      if(pop) return;
      var base=_bbParseDue(input.value)||new Date();
      viewYear=base.getFullYear(); viewMonth=base.getMonth();
      pop=document.createElement('div');
      pop.className='bb-datepicker-pop';
      document.body.appendChild(pop);
      var r=input.getBoundingClientRect();
      pop.style.left=r.left+'px';
      pop.style.top=(r.bottom+4)+'px';
      render();
      setTimeout(function(){ document.addEventListener('mousedown', onDocDown, true); }, 0);
    }
    input.addEventListener('click', openPop);
    input.addEventListener('focus', openPop);
    // Calendar-icon button, Aug 12 2026 -- same popup, opened from a
    // visible trigger next to the field instead of only via clicking
    // into the plain text input (which wasn't discoverable on its own).
    if(btnId){
      var btn=document.getElementById(btnId);
      if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openPop(); });
    }
  }
  function wireDatePickers(){
    _bbAttachDatePicker('bb-d-due', 'bb-d-due-cal');
    _bbAttachDatePicker('bb-d-start', 'bb-d-start-cal');
  }
  function wireChecklist(){
    T().wire('bb-d-checklist-add-btn', function(){
      var input=document.getElementById('bb-d-checklist-new');
      var text=input?input.value.trim():'';
      if(!text || !_bbOpenCardId) return;
      _bbChecklistCache.push({id:_bbUUID(), text:text, done:false});
      _bbSaveChecklist(_bbOpenCardId, _bbChecklistCache);
      if(input) input.value='';
      _bbRenderChecklist();
    });
  }

  // Two queries instead of one GROUP BY (supabase-js has no
  // aggregate/group-by): scoped to source='key' rows, split out by
  // via_key_id so the card face can show "this key has N links" per
  // key, not just one card-wide total.
  async function _bbLoadKeyLinkCounts(cardIds){
    _bbKeyLinkCountCache={};
    if(!cardIds || !cardIds.length) return;
    var sb=T().sb; if(!sb) return;
    try{
      var r1=await sb.from('briefing_card_links').select('card_id,via_key_id').eq('source','key').in('card_id', cardIds);
      (r1.data||[]).forEach(function(row){
        if(!row.via_key_id) return;
        _bbKeyLinkCountCache[row.card_id]=_bbKeyLinkCountCache[row.card_id]||{};
        _bbKeyLinkCountCache[row.card_id][row.via_key_id]=(_bbKeyLinkCountCache[row.card_id][row.via_key_id]||0)+1;
      });
      var r2=await sb.from('briefing_card_links').select('target_card_id,via_key_id').eq('source','key').in('target_card_id', cardIds);
      (r2.data||[]).forEach(function(row){
        if(!row.via_key_id || !row.target_card_id) return;
        _bbKeyLinkCountCache[row.target_card_id]=_bbKeyLinkCountCache[row.target_card_id]||{};
        _bbKeyLinkCountCache[row.target_card_id][row.via_key_id]=(_bbKeyLinkCountCache[row.target_card_id][row.via_key_id]||0)+1;
      });
    }catch(e){ console.error('Briefing Board: could not load per-key link counts', e); }
  }

  // Writes just this one card's key slots straight to Supabase and
  // waits for it -- assignKeyToSlot/removeKeyFromSlot's normal
  // _bbSaveLocal already does this too, but fire-and-forget, which
  // would race _bbSyncKeyLinks (right below) reading key_slot_1/2/3
  // back out of the same table a moment later. Only touches this one
  // row (a plain .update(), not _bbSyncCardsToSupabase's whole-board
  // upsert-then-delete-stale), so it's safe to call on its own.
  async function _bbPersistCardKeysNow(c){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      await sb.from('briefing_cards').update({key_slot_1:c.keys[0]||null, key_slot_2:c.keys[1]||null, key_slot_3:c.keys[2]||null}).eq('id', c.id);
    }catch(e){ console.error('Briefing Board: could not persist card keys', e); }
  }

  // "Place same symbol on cards and they automatically link" -- Larry,
  // Aug 3 2026. Reconciles every briefing_card_links row with
  // source='key' and via_key_id=keyId against reality: fetches every
  // idea/header and every Briefing Card currently carrying this key,
  // then makes sure a link row exists for every pair that should have
  // one (any two cards sharing it, or a card and a Storyboard item
  // sharing it) and removes any that no longer should. Idea-to-idea
  // pairs are skipped on purpose -- they're already sitting together
  // right on the Storyboard, a "jump to it" link wouldn't do anything
  // useful there. Called after ANY key assignment change, from either
  // this file (assignKeyToSlot/removeKeyFromSlot) or the Storyboard's
  // own _sboardSyncKeyLinks (idea-storyboard-9710.js) -- same table,
  // same reconciliation logic, kept as two small copies rather than a
  // cross-file call, matching how this codebase already keeps
  // Storyboard and Briefing Board talking only through window.T2T /
  // window.T2TShared, never straight into each other's functions.
  async function _bbSyncKeyLinks(keyId){
    if(!keyId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var ir=await sb.from('ideas').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var ideaIds=(ir.data||[]).map(function(r){ return r.id; });
      var cr=await sb.from('briefing_cards').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var cardIds=(cr.data||[]).map(function(r){ return r.id; });

      var desired={};
      var i, j;
      for(i=0;i<cardIds.length;i++){
        for(j=i+1;j<cardIds.length;j++){
          var a=cardIds[i], b=cardIds[j];
          var lo=a<b?a:b, hi=a<b?b:a;
          desired['card|'+lo+'|'+hi]={target_type:'card', card_id:lo, target_card_id:hi};
        }
      }
      for(i=0;i<cardIds.length;i++){
        for(j=0;j<ideaIds.length;j++){
          desired['story|'+cardIds[i]+'|'+ideaIds[j]]={target_type:'storyboard', card_id:cardIds[i], target_idea_id:ideaIds[j]};
        }
      }

      var existRes=await sb.from('briefing_card_links').select('*').eq('source','key').eq('via_key_id', keyId);
      var existing=existRes.data||[];
      var existingByKey={};
      existing.forEach(function(row){
        if(row.target_type==='card'){
          var a2=row.card_id, b2=row.target_card_id;
          var lo2=a2<b2?a2:b2, hi2=a2<b2?b2:a2;
          existingByKey['card|'+lo2+'|'+hi2]=row;
        } else {
          existingByKey['story|'+row.card_id+'|'+row.target_idea_id]=row;
        }
      });

      var toInsert=[], toDeleteIds=[];
      Object.keys(desired).forEach(function(k){
        if(!existingByKey[k]){
          var d=desired[k];
          toInsert.push({card_id:d.card_id, target_type:d.target_type, target_card_id:d.target_card_id||null, target_idea_id:d.target_idea_id||null, source:'key', via_key_id:keyId});
        }
      });
      Object.keys(existingByKey).forEach(function(k){
        if(!desired[k]) toDeleteIds.push(existingByKey[k].id);
      });

      if(toInsert.length) await sb.from('briefing_card_links').insert(toInsert);
      if(toDeleteIds.length) await sb.from('briefing_card_links').delete().in('id', toDeleteIds);
    }catch(e){ console.error('Briefing Board: could not sync key-driven links', e); }
  }
  // Browsable Archive, added July 21, 2026 (evening) -- Touch Point 9380,
  // held in reserve since the original Signal Flags work. Verified-
  // complete cards never left storage, just the board's 4 columns --
  // this is a read of the same in-memory card list already loaded for
  // the current board (archived cards ride along in _bbCards, only
  // filtered out at render time), so it needs no separate fetch.
  function openArchive(){
    var ov=document.getElementById('bb-archive-overlay'); if(ov) ov.classList.add('active');
    _bbRenderArchiveList();
  }
  function closeArchive(){
    var ov=document.getElementById('bb-archive-overlay'); if(ov) ov.classList.remove('active');
  }
  function _bbRenderArchiveList(){
    var list=document.getElementById('bb-archive-list'); if(!list) return;
    var items=_bbCardsList().filter(function(c){ return c.archived; });
    if(!items.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">Nothing archived yet.</div>';
      return;
    }
    list.innerHTML=items.map(function(c){
      return '<div class="bb-archive-row">'
        +'<div><div class="bb-archive-task">'+_esc(c.task)+'</div><div class="bb-archive-meta">Completed '+_esc(c.completedDate||'—')+'</div></div>'
        +'<button class="bb-flag-btn bb-archive-unarchive" data-id="'+_esc(c.id)+'">Unarchive</button>'
        +'</div>';
    }).join('');
    list.querySelectorAll('.bb-archive-unarchive').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id=btn.getAttribute('data-id');
        var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
        if(c){ c.archived=false; _bbSaveLocal(_bbCardsList()); }
        _bbRenderArchiveList();
        renderBoard();
      });
    });
  }

  // History (HX) -- a landing page over both Archive and the Briefing
  // Log, added July 21, 2026. Two different kinds of history: Archive
  // is completed board cards, Briefing Log is who's been briefed and
  // when. Kept as one entry point instead of two separate icons.
  function openHX(){
    var ov=document.getElementById('bb-hx-overlay'); if(ov) ov.classList.add('active');
  }
  function closeHX(){
    var ov=document.getElementById('bb-hx-overlay'); if(ov) ov.classList.remove('active');
  }

  // Briefing Log -- read-only history of who's been briefed, when, and
  // by what medium. Deliberately NOT scoped to just the current board:
  // a person's briefing history can span every board, so this always
  // pulls the full log regardless of which board HX was opened from.
  // Absence of any row for a name means that person has never been
  // briefed -- there's no placeholder row to fall out of date.
  function openBriefingLog(){
    var ov=document.getElementById('bb-briefinglog-overlay'); if(ov) ov.classList.add('active');
    _bbRenderBriefingLogList();
  }
  function closeBriefingLog(){
    var ov=document.getElementById('bb-briefinglog-overlay'); if(ov) ov.classList.remove('active');
  }
  async function _bbRenderBriefingLogList(){
    var list=document.getElementById('bb-briefinglog-list'); if(!list) return;
    list.innerHTML='<div class="bb-key-pick-empty-msg">Loading\u2026</div>';
    var sb=T().sb; if(!sb){ list.innerHTML='<div class="bb-key-pick-empty-msg">Sign in to see the Briefing Log.</div>'; return; }
    try{
      var res=await sb.from('briefing_log').select('*').order('briefing_date',{ascending:false});
      if(res.error){ list.innerHTML='<div class="bb-key-pick-empty-msg">Couldn\'t load the Briefing Log.</div>'; return; }
      var rows=res.data||[];
      if(!rows.length){ list.innerHTML='<div class="bb-key-pick-empty-msg">No briefings logged yet.</div>'; return; }
      list.innerHTML=rows.map(function(r){
        var board=_bbBoards.filter(function(b){ return b.id===r.board_id; })[0];
        var boardLabel=board?board.name:'\u2014';
        return '<div class="bb-archive-row">'
          +'<div><div class="bb-archive-task">'+_esc(r.receiver)+' &mdash; '+_esc(r.briefing_date||'\u2014')+'</div>'
          +'<div class="bb-archive-meta">From '+_esc(r.giver||'\u2014')+' &middot; '+_esc(r.medium||'\u2014')+' &middot; '+_esc(boardLabel)+'</div></div>'
          +'</div>';
      }).join('');
    }catch(e){
      list.innerHTML='<div class="bb-key-pick-empty-msg">Couldn\'t load the Briefing Log.</div>';
    }
  }

  async function _bbCurrentUserId(){
    var sb=T().sb; if(!sb) return null;
    try{ var u=await sb.auth.getUser(); return (u&&u.data&&u.data.user)?u.data.user.id:null; }
    catch(e){ return null; }
  }

  // Personal BB, corrected Aug 9 2026 (Session 198, second pass): Larry's
  // actual personal-type board ("Larry BB") is the personal BB -- not a
  // separate screen. When it's the active board, it shows its own native
  // cards (added directly here, exactly as before) PLUS a read-through
  // merge of every card assigned to this member on every other board
  // they can see, rendered in the same real columns with real drag-drop.
  //
  // Deliberately kept OUT of _bbCards/_bbCardsList(): _bbSaveLocal always
  // upserts the *entire* card list with board_id=_bbCurrentBoardId
  // (_bbSyncCardsToSupabase) -- if a foreign card ever ended up in that
  // list, the very next save anywhere on this board would silently steal
  // it from its home board. _bbForeignCards stays a separate array,
  // merged into renderBoard()'s local render list only, and persisted
  // through its own narrow path (_bbPersistForeignPosition /
  // _bbHandlePersonalBoardDrop) that only ever touches personal_col /
  // personal_rank -- never col, sort_order, or board_id.
  //
  // Matching "assigned to me" is exact-string against this member's own
  // roster label, straight off the legacy person field (see
  // _bbLoadForeignCardsForPersonalBoard) -- Session 234 (Aug 21) known
  // gap: a card whose only assignment is a 👥 star (no legacy person
  // text) won't surface here yet. Logged for a future pass; out of
  // scope for the bottom-row build itself.
  var _bbForeignCards = [];
  // Mirror boards, part 2 (Aug 9 2026): a card created directly on a
  // member's own personal board can be tagged (via the card's own
  // "Also show on" field) to also surface on a project/departmental/
  // company board they belong to -- so whoever's watching that board
  // can see, question, or stop the work without ever leaving it. The
  // card's real home stays the personal board (board_id never changes);
  // shared_to_board_id is just the tag. _bbSharedInCards holds the
  // read-through merge for THIS board when it's a project/departmental/
  // company board -- same separate-array, narrow-persist-path safety
  // net as _bbForeignCards above, just the mirror image of it.
  var _bbSharedInCards = [];
  // Source/assignee filter, Aug 9 2026 (Session 198, same pass): a
  // dropdown next to Name. On a personal board it filters the merged
  // view by where a card actually came from (your own board, or which
  // other board); on a project/departmental/company board it filters by
  // who a card's assigned to. Purely a display filter -- narrows what
  // renderBoard() shows, never touches what's saved. A project board's
  // "parent project" filter Larry also asked about needs Fractal
  // Casting's parent/TOPIC data to exist first -- not built yet, so not
  // wired here; only the assigned-to half is live for project boards.
  var _bbSourceFilter = null; // null = no filter; else {mode:'origin'|'person', value:string}

  // VIEW options, Aug 9 2026 -- Larry: "the only other VIEW choices are
  // the cast members," not just whoever happens to already have a card.
  // Rewritten Aug 13 2026 (Larry): now sources from _bbAllRosterRows --
  // the same Owner-or-Leader-aware roster Gear's Cast reads -- instead of
  // a second, independent members/board_members query, so a role tag can
  // show per person and an Owner-or-Leader can add someone right from
  // this dropdown. person: filter values keep the exact same "II Name"
  // label format as before, so matching against a card's saved c.person
  // is unaffected.
  var BB_TYPE_VIEW_LABEL = {project:'Team', departmental:'Department', company:'Team'};

  var BB_THEME_VARS=['--bb-bg','--bb-accent','--bb-ink','--bb-sub','--bb-head-font','--bb-body-font'];
  function _bbSyncMenuTheme(menu){
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    var cs=getComputedStyle(fgr);
    BB_THEME_VARS.forEach(function(v){
      var val=cs.getPropertyValue(v);
      if(val) menu.style.setProperty(v, val.trim());
    });
  }

  function _bbWireViewTrigger(trigger, menu){
    if(menu.parentElement!==document.body){ document.body.appendChild(menu); }
    _bbSyncMenuTheme(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-view-menu':null);
      if(willOpen){
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(160,r.width)+'px';
        menu.hidden=false;
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
  }

  async function _bbViewConfirmAddMember(email){
    var input=document.getElementById('bb-view-add-email');
    var errEl=document.getElementById('bb-view-add-error');
    var sugg=document.getElementById('bb-view-add-suggest');
    if(!email) return;
    var res=await _bbTeamAddMember(email);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    if(input) input.value='';
    if(sugg) sugg.style.display='none';
    await _bbLoadRoster();
    await _bbRenderSourcePicker();
  }

  async function _bbRenderSourcePicker(){
    // Always visible, Aug 13 2026 (Larry: "exactly like the Idea Board...
    // every new board will have this same setup") -- VIEW used to hide
    // itself entirely when there was nothing to filter yet; the Idea
    // Board's own VIEW never hides, so this no longer does either. An
    // empty/quiet VIEW (just "Everything" or just the type label, no
    // rows under it) is fine -- reserving the spot is what makes every
    // board's header match.
    var grp=document.getElementById('bb-source-fieldgrp');
    var trigger=document.getElementById('bb-view-trigger');
    var menu=document.getElementById('bb-view-menu');
    var eyebrow=document.getElementById('bb-source-eyebrow');
    if(!grp || !trigger || !menu || !eyebrow) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return;
    _bbSourceFilter=null;
    menu.innerHTML='';
    eyebrow.textContent='View';
    if(board.board_type==='personal'){
      var seen={}; var opts=[{value:'',label:'Everything'},{value:'origin:__native__',label:'Personal'}];
      _bbForeignCards.forEach(function(c){
        if(seen[c._homeBoardId]) return; seen[c._homeBoardId]=true;
        opts.push({value:'origin:'+c._homeBoardId, label:'From '+(c._homeBoardName||'')});
      });
      trigger.textContent='Everything';
      opts.forEach(function(o){
        var row=document.createElement('div');
        row.className='bb-cdrop-row'+(o.value===''?' active':'');
        row.textContent=o.label;
        row.addEventListener('click', function(e){
          e.stopPropagation(); menu.hidden=true;
          _bbSourceFilter = o.value ? {mode:o.value.split(':')[0], value:o.value.split(':').slice(1).join(':')} : null;
          trigger.textContent=o.label;
          renderBoard();
        });
        menu.appendChild(row);
      });
      // (+)/(-) pair, Aug 16 2026 (Larry): every other field's eyebrow
      // dropdown shows the pair together even when there's nothing to
      // add or remove yet, so VIEW shouldn't be the one exception. A
      // personal board's View is just an origin filter, not a Cast --
      // there's genuinely nothing to add or remove here yet, so both
      // are shown as stubs (same posture as Project Hub's Archive/Trash
      // buttons: visible on purpose, plain "not built yet" message).
      var pAddRow=document.createElement('div');
      pAddRow.className='bb-cdrop-addrow';
      var pAddBtn=document.createElement('button');
      pAddBtn.type='button'; pAddBtn.className='bb-dotted-add-btn'; pAddBtn.title='Add'; pAddBtn.textContent='+';
      pAddBtn.addEventListener('click', function(e){
        e.stopPropagation(); menu.hidden=true;
        window.alert('There\'s nothing to add to a personal board\'s View yet -- it just filters by where a card came from.');
      });
      var pRemoveBtn=document.createElement('button');
      pRemoveBtn.type='button'; pRemoveBtn.className='bb-dotted-add-btn bb-dotted-remove-btn'; pRemoveBtn.title='Remove';
      pRemoveBtn.textContent='−';
      pRemoveBtn.addEventListener('click', function(e){
        e.stopPropagation(); menu.hidden=true;
        window.alert('There\'s nothing to remove from a personal board\'s View yet -- it just filters by where a card came from.');
      });
      pAddRow.appendChild(pAddBtn); pAddRow.appendChild(pRemoveBtn);
      menu.appendChild(pAddRow);
      _bbWireViewTrigger(trigger, menu);
      return;
    }
    // Falls back to "Team" for any custom/unrecognized board_type (from
    // Type's own "+ Add a type..." flow) -- same universal default the
    // Idea Board's VIEW always uses, never hidden for an unknown type.
    var typeLabel=BB_TYPE_VIEW_LABEL[board.board_type] || 'Team';
    await _bbLoadRoster();
    var rows=_bbAllRosterRows();
    trigger.textContent=typeLabel;

    var teamRow=document.createElement('div');
    teamRow.className='bb-cdrop-row active';
    teamRow.textContent=typeLabel;
    teamRow.addEventListener('click', function(e){
      e.stopPropagation(); menu.hidden=true;
      _bbSourceFilter=null; trigger.textContent=typeLabel; renderBoard();
    });
    menu.appendChild(teamRow);

    rows.forEach(function(m){
      var label=(_bbInitialsFromName(m.name)?_bbInitialsFromName(m.name)+' ':'')+(m.name||'');
      var row=document.createElement('div');
      row.className='bb-cdrop-row bb-view-row';
      var nameSpan=document.createElement('span');
      nameSpan.className='bb-view-row-name'; nameSpan.textContent=m.name||m.email||'';
      var roleSpan=document.createElement('span');
      roleSpan.className='bb-view-row-role'; roleSpan.textContent=_bbRoleTitle(m);
      row.appendChild(nameSpan); row.appendChild(roleSpan);
      row.addEventListener('click', function(e){
        e.stopPropagation(); menu.hidden=true;
        // uid added Session 234 (Aug 21) -- lets _bbSourceFilterCards
        // match against the 👥 primary-doer star first, same as the
        // corner badge; value/label stays as the legacy text fallback
        // for any card nobody's starred yet.
        _bbSourceFilter={mode:'person', value:label, uid:m.user_id||null};
        trigger.textContent=m.name||m.email||'';
        renderBoard();
      });
      menu.appendChild(row);
    });

    if(_bbRosterCanManage && board.board_type!=='personal'){
      var addRow=document.createElement('div');
      addRow.className='bb-cdrop-addrow';
      var addBtn=document.createElement('button');
      addBtn.type='button'; addBtn.className='bb-dotted-add-btn';
      addBtn.title='Add a Cast Member'; addBtn.textContent='+';
      addRow.appendChild(addBtn);
      // (-) Remove a Cast Member, Aug 16 2026 (Larry): the mirror of
      // (+) -- pick someone off this board's own roster (never the
      // Owner, who isn't a board_members row and can't be removed this
      // way) and take them off the team. Same dashed-circle-pair
      // treatment as every other field's eyebrow dropdown.
      var removeBtn=document.createElement('button');
      removeBtn.type='button'; removeBtn.className='bb-dotted-add-btn bb-dotted-remove-btn';
      removeBtn.title='Remove a Cast Member'; removeBtn.textContent='−';
      addRow.appendChild(removeBtn);
      var addForm=document.createElement('div');
      addForm.className='bb-view-addform'; addForm.style.display='none';
      addForm.innerHTML='<input type="text" id="bb-view-add-email" placeholder="Type a name or email..." autocomplete="off">'
        +'<div class="tm-add-suggest" id="bb-view-add-suggest" style="display:none"></div>'
        +'<button type="button" class="bb-flag-btn bb-view-add-confirm" id="bb-view-add-confirm">Add</button>'
        +'<div id="bb-view-add-error" class="bb-view-add-error" style="display:none"></div>';
      addForm.addEventListener('click', function(e){ e.stopPropagation(); });
      addBtn.addEventListener('click', function(e){
        e.stopPropagation();
        removeForm.style.display='none';
        var opening=addForm.style.display==='none';
        addForm.style.display=opening?'block':'none';
        if(opening){ _bbFetchAllMembers().then(function(){ _bbRenderMemberSuggestions('', 'bb-view-add-suggest'); }); }
      });
      var addInput=addForm.querySelector('#bb-view-add-email');
      addInput.addEventListener('input', function(){ _bbRenderMemberSuggestions(addInput.value, 'bb-view-add-suggest'); });
      addInput.addEventListener('focus', function(){ _bbRenderMemberSuggestions(addInput.value, 'bb-view-add-suggest'); });
      addInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); _bbViewConfirmAddMember(addInput.value.trim()); } });
      var addSugg=addForm.querySelector('#bb-view-add-suggest');
      addSugg.addEventListener('click', function(e){
        var r=e.target.closest('.tm-add-suggest-row'); if(!r) return;
        _bbViewConfirmAddMember(r.getAttribute('data-email'));
      });
      var addConfirmBtn=addForm.querySelector('#bb-view-add-confirm');
      addConfirmBtn.addEventListener('click', function(){ _bbViewConfirmAddMember(addInput.value.trim()); });

      var removable=rows.filter(function(m){ return !m.isOwner; });
      var removeForm=document.createElement('div');
      removeForm.className='bb-view-addform bb-view-removeform'; removeForm.style.display='none';
      if(!removable.length){
        removeForm.innerHTML='<div class="bb-view-remove-empty">No one to remove yet.</div>';
      } else {
        removeForm.innerHTML=removable.map(function(m){
          return '<div class="bb-view-remove-row" data-uid="'+_esc(m.user_id)+'">'
            +'<span>'+_esc(m.name||m.email||'')+'</span>'
            +'<button type="button" class="bb-flag-btn bb-view-remove-confirm" data-uid="'+_esc(m.user_id)+'" style="background:#a3372b;color:#fff;border-color:#a3372b;flex:0 0 auto;padding:3px 8px">Remove</button>'
          +'</div>';
        }).join('')+'<div id="bb-view-remove-error" class="bb-view-add-error" style="display:none"></div>';
      }
      removeForm.addEventListener('click', function(e){
        e.stopPropagation();
        var btn=e.target.closest('.bb-view-remove-confirm'); if(!btn) return;
        var uid=btn.getAttribute('data-uid');
        var row=btn.closest('.bb-view-remove-row');
        var name=row ? row.querySelector('span').textContent : 'this person';
        if(!window.confirm('Remove '+name+' from this Cast?')) return;
        _bbViewConfirmRemoveMember(uid);
      });
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        addForm.style.display='none';
        var opening=removeForm.style.display==='none';
        removeForm.style.display=opening?'block':'none';
      });
      menu.appendChild(addRow);
      menu.appendChild(addForm);
      menu.appendChild(removeForm);
    }

    _bbWireViewTrigger(trigger, menu);
  }

  function _bbSourceFilterCards(cards){
    if(!_bbSourceFilter) return cards;
    if(_bbSourceFilter.mode==='origin'){
      if(_bbSourceFilter.value==='__native__') return cards.filter(function(c){ return !c._foreign; });
      return cards.filter(function(c){ return c._foreign && c._homeBoardId===_bbSourceFilter.value; });
    }
    if(_bbSourceFilter.mode==='person'){
      // Session 234 (Aug 21) -- match the 👥 primary-doer star first
      // (same source as the corner badge), same legacy person-text
      // fallback as before for a card nobody's starred yet. A card
      // whose primary fetch genuinely landed with "nobody starred"
      // (cardPrimaryUidRaw returns null, not undefined) still falls
      // through to the text match rather than being excluded outright.
      var uid=_bbSourceFilter.uid;
      var hasPrimaryLookup = uid && window.T2TStoryboard && T2TStoryboard.cardPrimaryUidRaw;
      return cards.filter(function(c){
        if(hasPrimaryLookup){
          var pUid=T2TStoryboard.cardPrimaryUidRaw('briefing_card', c.id);
          if(pUid) return String(pUid)===String(uid);
        }
        return c.person===_bbSourceFilter.value;
      });
    }
    return cards;
  }

  async function _bbLoadForeignCardsForPersonalBoard(board){
    _bbForeignCards = [];
    var sb=T().sb; if(!sb || !board) return;
    var uid=await _bbCurrentUserId();
    if(!uid || board.board_type!=='personal' || board.user_id!==uid) return;
    var myLabel='';
    try{
      var mres=await sb.from('members').select('name').eq('user_id', uid).single();
      if(!mres.error && mres.data && mres.data.name){
        var initials=_bbInitialsFromName(mres.data.name);
        myLabel=(initials?initials+' ':'')+mres.data.name;
      }
    }catch(e){ /* no roster label yet -- nothing will match, which is fine */ }
    if(!myLabel) return;
    var others=(_bbBoards||[]).filter(function(b){ return b.id!==board.id; });
    var merged=[];
    for(var i=0;i<others.length;i++){
      var b2=others[i];
      try{
        var res=await sb.from('briefing_cards').select('*').eq('board_id', b2.id).eq('person', myLabel).eq('archived', false).is('trashed_at', null);
        if(res.error || !res.data) continue;
        res.data.forEach(function(row){
          var fc=_bbRowToCard(row);
          fc._foreign=true;
          fc._homeBoardId=b2.id;
          fc._homeBoardName=b2.name||'Untitled Board';
          fc.col = row.personal_col || row.col;
          fc._realCol = row.col;
          fc.sortOrder = (typeof row.personal_rank==='number') ? row.personal_rank : Infinity;
          merged.push(fc);
        });
      }catch(e){ console.error('Personal BB: could not load assigned cards from board', b2.id, e); }
    }
    _bbForeignCards = merged;
  }

  // Loads cards tagged (shared_to_board_id) to THIS board when it's a
  // project/departmental/company board -- the reverse direction of
  // _bbLoadForeignCardsForPersonalBoard above. RLS ("shared cards -
  // select", Aug 9 2026) is what actually allows reading a row whose
  // real board_id belongs to someone else's personal board here --
  // this query just asks for anything tagged to us.
  async function _bbLoadSharedInCardsForProjectBoard(board){
    _bbSharedInCards = [];
    var sb=T().sb; if(!sb || !board) return;
    if(board.board_type==='personal') return;
    try{
      var res=await sb.from('briefing_cards').select('*').eq('shared_to_board_id', board.id).eq('archived', false).is('trashed_at', null);
      if(res.error || !res.data) return;
      _bbSharedInCards = res.data.map(function(row){
        var sc=_bbRowToCard(row);
        sc._foreign=true; // reuses the dashed-border badge styling already built for merged cards
        sc._sharedIn=true;
        sc._homeBoardId=row.board_id;
        sc._homeBoardName='Personal'+(row.person?(' \u2022 '+row.person):'');
        sc.col = row.shared_col || row.col;
        sc._realCol = row.col;
        sc.sortOrder = (typeof row.shared_rank==='number') ? row.shared_rank : Infinity;
        return sc;
      });
    }catch(e){ console.error('Could not load shared-in cards for board', board.id, e); }
  }

  // Persists a foreign card's position on THIS viewer's personal board
  // only -- personal_col/personal_rank, never the card's real col/
  // sort_order/board_id, so its position on its home board is untouched.
  async function _bbPersistForeignPosition(fc){
    var sb=T().sb; if(!sb) return;
    try{
      await sb.from('briefing_cards').update({
        personal_col: fc.col,
        personal_rank: (typeof fc.sortOrder==='number') ? fc.sortOrder : null
      }).eq('id', fc.id);
    }catch(e){ console.error('Personal BB: could not save card position', e); }
  }

  // Mirror boards, part 2 -- the reverse of the position write above.
  // Persists a shared-in card's position on THIS viewer's project/
  // departmental/company board only -- shared_col/shared_rank, never
  // the card's real col/sort_order/board_id (those stay owned by the
  // personal board it actually lives on).
  async function _bbPersistSharedPosition(sc){
    var sb=T().sb; if(!sb) return;
    try{
      await sb.from('briefing_cards').update({
        shared_col: sc.col,
        shared_rank: (typeof sc.sortOrder==='number') ? sc.sortOrder : null
      }).eq('id', sc.id);
    }catch(e){ console.error('Shared board: could not save card position', e); }
  }

  // Status changes mirror, priority stays personal -- Larry, Aug 9
  // 2026. Applies identically to both merge directions (a card
  // assigned to you elsewhere, shown on your personal board; or a
  // card you started on your own personal board, tagged onto a
  // project board): reshuffling within the 3 Do columns (H/M/L) is
  // each viewer's own private priority call and never leaves their
  // own display column (personal_col or shared_col). Crossing into or
  // out of Doing/Done/Hang-Ups is a real fact about the work, not a
  // personal preference, so it writes back to the card's one true
  // row. wasCol/newCol are the DISPLAY columns being dragged between;
  // priority/realRow describe the card's OWN true values (never
  // touched by the other side's private reshuffling), so re-entering
  // a Do column always lands on whichever H/M/L family that side's
  // own priority says, ignoring whatever family the other viewer
  // happened to drop it into. Returns null for a move that should
  // stay private (no mirror needed).
  function _bbStageMirrorUpdate(wasCol, newCol, priority, realRow){
    function stage(k){ return _bbIsDoCol(k) ? 'do' : k; }
    if(stage(wasCol)===stage(newCol)) return null;
    var realNewCol = _bbIsDoCol(newCol) ? _bbDoColKey(priority) : newCol;
    var wasRealCol = realRow.col;
    var upd={col: realNewCol};
    // Start Date addition, Aug 27 2026 -- same reasoning as the native
    // drop handler: an auto-stamped date with its checkbox still
    // unchecked would be invisible, so open it here too.
    if(realNewCol==='doing' && _bbIsDoCol(wasRealCol) && !realRow.startDate){ upd.startDate=_bbToday(); upd.addStart=true; }
    if(realNewCol==='done' && wasRealCol!=='done') upd.completedDate=_bbToday();
    if(wasRealCol==='done' && realNewCol!=='done'){ upd.completedDate=''; upd.verified=false; upd.pro=false; upd.grow=false; }
    if(realNewCol==='hangups' && wasRealCol!=='hangups') upd.hangupSince=_bbToday();
    if(wasRealCol==='hangups' && realNewCol!=='hangups') upd.hangupSince='';
    return upd;
  }
  // Writes a stage-mirror update straight to the card's real row --
  // by id, so it always lands on the one true record regardless of
  // which board's view triggered the move.
  async function _bbWriteStageMirror(realCardId, upd){
    var sb=T().sb; if(!sb) return;
    var row={col: upd.col};
    if('startDate' in upd) row.start_date=upd.startDate?_bbToISODate(upd.startDate):null;
    if('addStart' in upd) row.adds_start=upd.addStart;
    if('completedDate' in upd) row.completed_date=upd.completedDate?_bbToISODate(upd.completedDate):null;
    if('hangupSince' in upd) row.hangup_since=upd.hangupSince?_bbToISODate(upd.hangupSince):null;
    if('verified' in upd) row.verified=upd.verified;
    if('pro' in upd) row.pro=upd.pro;
    if('grow' in upd) row.grow=upd.grow;
    try{ await sb.from('briefing_cards').update(row).eq('id', realCardId); }
    catch(e){ console.error('Stage mirror: could not update the card\'s real row', e); }
  }

  // Dedicated drop path for a board's mixed native+merged columns --
  // used both for the personal board's foreign (assigned-to-me) cards
  // and a project board's shared-in (tagged-from-someone's-personal-
  // board) cards, since the two are mirror images of the same shape.
  // Deliberately simpler than the native drop handler for anything
  // that stays within the private side (no fine H/M/L escalation on
  // top/bottom drop, just the coarse family) -- but DOES now mirror a
  // stage crossing (into/out of Doing/Done/Hang-Ups) back to the
  // card's real row via _bbStageMirrorUpdate/_bbWriteStageMirror, per
  // Larry's Aug 9 2026 rule: status changes mirror, priority stays
  // personal. Renumbers the whole target column (native and merged
  // cards share one ordering space so drag position stays intuitive),
  // writing native changes through the normal save path and merged
  // changes through the given persistPositionFn, one card at a time.
  function _bbCardBeforeGeneric(zone, y, excludeId){
    var els=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
      .filter(function(el){ return el.getAttribute('data-id')!==excludeId; });
    var closest={offset:-Infinity, el:null};
    els.forEach(function(el){
      var box=el.getBoundingClientRect();
      var offset=y-box.top-box.height/2;
      if(offset<0 && offset>closest.offset) closest={offset:offset, el:el};
    });
    return closest.el;
  }
  async function _bbHandleMergedCardDrop(zone, e, draggedId, mergedList, persistPositionFn){
    var newCol=zone.getAttribute('data-col');
    var beforeEl=_bbCardBeforeGeneric(zone, e.clientY, draggedId);
    var order=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
      .map(function(el){ return el.getAttribute('data-id'); })
      .filter(function(cid){ return cid!==draggedId; });
    var insertAt=beforeEl ? order.indexOf(beforeEl.getAttribute('data-id')) : order.length;
    order.splice(insertAt, 0, draggedId);
    var nativeTouched=false;
    var mergedToPersist=[];
    order.forEach(function(cid, idx){
      var nc=_bbCardsList().filter(function(x){ return x.id===cid; })[0];
      if(nc){
        if(cid===draggedId) nc.col=newCol;
        nc.sortOrder=idx;
        nativeTouched=true;
        return;
      }
      var mc=mergedList.filter(function(x){ return x.id===cid; })[0];
      if(mc){
        if(cid===draggedId){
          var wasCol=mc.col;
          var upd=_bbStageMirrorUpdate(wasCol, newCol, mc.priority, {col:mc._realCol, startDate:mc.startDate});
          if(upd){
            _bbWriteStageMirror(mc.id, upd);
            mc._realCol=upd.col;
            if('startDate' in upd) mc.startDate=upd.startDate;
            if('addStart' in upd) mc.addStart=upd.addStart;
            if('completedDate' in upd) mc.completedDate=upd.completedDate;
            if('hangupSince' in upd) mc.hangupSince=upd.hangupSince;
            if('verified' in upd) mc.verified=upd.verified;
            if('pro' in upd) mc.pro=upd.pro;
            if('grow' in upd) mc.grow=upd.grow;
          }
          mc.col=newCol;
        }
        mc.sortOrder=idx;
        mergedToPersist.push(mc);
      }
    });
    if(nativeTouched) _bbSaveLocal(_bbCardsList());
    for(var i=0;i<mergedToPersist.length;i++){
      await persistPositionFn(mergedToPersist[i]);
    }
    renderBoard();
  }
  function _bbHandlePersonalBoardDrop(zone, e, draggedId){
    return _bbHandleMergedCardDrop(zone, e, draggedId, _bbForeignCards, _bbPersistForeignPosition);
  }
  function _bbHandleSharedInDrop(zone, e, draggedId){
    return _bbHandleMergedCardDrop(zone, e, draggedId, _bbSharedInCards, _bbPersistSharedPosition);
  }

  // Fired from closeCardDetail when a personal card's "Also show on"
  // choice changes. Setting or switching a target seeds shared_col to
  // this card's own current column (its starting priority on the
  // project board, per Larry: a default the project side can then
  // change independently) and shared_rank to the end of that column
  // there. Clearing it just drops the tag -- the row itself is
  // untouched and simply stops showing up on that board next load.
  async function _bbHandleSharedTagChange(c, newTarget){
    var sb=T().sb; if(!sb) return;
    try{
      if(newTarget){
        var res=await sb.from('briefing_cards').select('shared_rank').eq('shared_to_board_id', newTarget).eq('shared_col', c.col);
        var maxRank=-1;
        if(!res.error && res.data) res.data.forEach(function(r){ if(typeof r.shared_rank==='number' && r.shared_rank>maxRank) maxRank=r.shared_rank; });
        await sb.from('briefing_cards').update({shared_to_board_id:newTarget, shared_col:c.col, shared_rank:maxRank+1}).eq('id', c.id);
      } else {
        await sb.from('briefing_cards').update({shared_to_board_id:null, shared_col:null, shared_rank:null}).eq('id', c.id);
      }
    }catch(e){ console.error('Could not update this card\'s project tag', e); }
  }

  async function _bbSwitchToBoard(boardId){
    _bbPendingTypeOverride=null;
    _bbCurrentBoardId=boardId;
    try{ sessionStorage.setItem('bbCurrentBoardId', boardId); }catch(e){}
    var board=_bbBoards.filter(function(b){ return b.id===boardId; })[0];
    var sb=T().sb;
    // July 23, 2026, Larry: persist the active board to the database (not
    // just this tab's sessionStorage) so "which board is this person on"
    // is a plain, queryable column -- profiles.active_briefing_board_id,
    // a real foreign key to briefing_boards.id. Fire-and-forget; sessionStorage
    // above remains the fast path the UI actually reads from.
    (async function(){
      try{
        var uid=await _bbCurrentUserId();
        if(uid && sb) await sb.from('profiles').update({active_briefing_board_id: boardId}).eq('user_id', uid);
      }catch(e){ console.error('Briefing Board: could not persist active board', e); }
    })();
    var cardRows=[];
    try{
      var cRes=await sb.from('briefing_cards').select('*').eq('board_id',boardId).order('created_at',{ascending:true});
      if(!cRes.error) cardRows=cRes.data||[];
    }catch(e){ console.error('Briefing Board: could not load board data', e); }
    // Aug 7 2026 -- sweep anything past the 30-day trash retention
    // window every time the board loads. Fire-and-forget: doesn't block
    // showing the board, and cards already fetched into cardRows this
    // load are unaffected either way (a card purged mid-session just
    // won't come back next reload).
    _bbPurgeOldTrash(boardId);
    _bbPurgeOldMoves(boardId);

    // One-time migration, July 21, 2026 (evening): the first time Field
    // Guide BB is opened empty after named multi-board storage shipped,
    // copy in whatever was still sitting in the old single-board
    // sessionStorage version so nothing Larry already entered is lost.
    if(cardRows.length===0 && board && /field guide/i.test(board.name||'')){
      var already=false;
      try{ already = sessionStorage.getItem('bbMigratedLegacy')==='1'; }catch(e){}
      var legacyCards=_bbLoadLocal();
      if(!already && legacyCards && legacyCards.length){
        try{
          // Keys, Aug 3 2026 -- now the shared custom_keys table
          // (user_id-owned, not board-scoped), so recovered legacy
          // keys get inserted there instead of the now-gone
          // briefing_board_keys.
          var legacyKeys=_bbLoadKeyLibraryLegacy();
          var keyIdMap={};
          var remappedKeys=legacyKeys.map(function(k){
            var newId=_bbUUID(); keyIdMap[k.id]=newId;
            return {id:newId, shape:k.shape, color:k.color, meaning:k.meaning||''};
          });
          var remappedCards=legacyCards.map(function(c){
            return Object.assign({}, c, {
              id:_bbUUID(),
              keys:(c.keys||[]).map(function(kid){ return kid?(keyIdMap[kid]||null):null; })
            });
          });
          var migrationUid=await _bbCurrentUserId();
          if(remappedKeys.length && migrationUid) await sb.from('custom_keys').upsert(remappedKeys.map(function(k){ return {id:k.id, user_id:migrationUid, shape:k.shape, color:k.color, meaning:k.meaning}; }));
          if(remappedCards.length) await sb.from('briefing_cards').upsert(remappedCards.map(function(c){ return _bbCardToRow(c, boardId); }));
          try{ sessionStorage.setItem('bbMigratedLegacy','1'); }catch(e2){}
          _bbCards=remappedCards;
          await _bbEnsureKeyLibraryLoaded();
          if(remappedKeys.length) _bbKeyLibCache=_bbKeyLibCache.concat(remappedKeys);
          _bbRenderTypePicker();
          _bbRenderOrgName();
          _bbRenderBoardPicker();
          await _bbLoadKeyLinkCounts(_bbCards.map(function(c){ return c.id; }));
          renderBoard();
          return;
        }catch(e){ console.error('Briefing Board: legacy migration failed', e); }
      }
    }

    _bbCards = cardRows.length ? cardRows.map(_bbRowToCard) : _bbSeed();
    _bbRenderTypePicker();
    _bbRenderOrgName();
    _bbRenderBoardPicker();
    await _bbLoadKeyLinkCounts(_bbCards.map(function(c){ return c.id; }));
    await _bbLoadForeignCardsForPersonalBoard(board);
    await _bbLoadSharedInCardsForProjectBoard(board);
    await _bbRenderSourcePicker();
    renderBoard();
  }

  async function _bbInitBoardsAndData(){
    var uid=await _bbCurrentUserId();
    if(!uid){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); return; }
    // Aug 3 2026 -- Signal Flags are traveler-wide now (merged with the
    // Storyboard's shared library), so they load once here rather than
    // per board switch. _bbEnsureKeyLibraryLoaded guards itself, so a
    // reload-and-return-here (Alt+C) or re-entering the screen never
    // re-fetches needlessly.
    await _bbEnsureKeyLibraryLoaded();
    await _bbEnsureHiddenTypesLoaded();
    var sb=T().sb;
    try{
      // Aug 4 2026, Larry: board sharing -- the owner can grant other
      // members access (see board_members / is_board_member in the DB), so
      // this intentionally no longer filters to user_id=uid. Row Level
      // Security alone decides what comes back: this traveler's own boards,
      // plus any board someone has added them to.
      var res=await sb.from('briefing_boards').select('*').order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _bbBoards=res.data||[];
      // Aug 16 2026 -- adopted parent-child edges, so the PROJECT
      // picker can show a board's children alongside its type-mates.
      // RLS already scopes this to relations touching a board this
      // traveler owns, same as briefing_boards above -- no extra filter
      // needed here.
      try{
        var relRes=await sb.from('board_relations').select('*').eq('status','approved');
        _bbRelationsCache=relRes.error?[]:(relRes.data||[]);
      }catch(e){ _bbRelationsCache=[]; console.error('Briefing Board: could not load board relations', e); }
    }catch(e){
      console.error('Briefing Board: could not load boards, staying local', e);
      _bbCurrentBoardId=null; _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard();
      return;
    }
    if(!_bbBoards.length){
      try{
        var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:'personal', name:'My Board'}).select().single();
        if(!ins.error && ins.data) _bbBoards=[ins.data];
      }catch(e){}
    }
    if(!_bbBoards.length){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); return; }
    // Deep-link override, Aug 11 2026 -- the Idea Storyboard's "Open
    // Briefing Card" button (new-tab) sets this before opening the tab;
    // if present, it wins over the remembered-board resume below and
    // opens straight to that header's card. Looked up by
    // source_header_id since the button only knows the header, not
    // which card/board it landed on.
    try{
      var _bbDeepLinkHeaderId=sessionStorage.getItem('fg_open_card_header_id');
      if(_bbDeepLinkHeaderId){
        sessionStorage.removeItem('fg_open_card_header_id');
        var _bbDeepLinkRes=await sb.from('briefing_cards').select('id,board_id').eq('source_header_id',_bbDeepLinkHeaderId).eq('archived',false).limit(1);
        var _bbDeepLinkCard=(_bbDeepLinkRes.data && _bbDeepLinkRes.data[0]) || null;
        if(_bbDeepLinkCard){
          await _bbSwitchToBoard(_bbDeepLinkCard.board_id);
          openCardDetail(_bbDeepLinkCard.id);
          return;
        }
      }
    }catch(e){ console.warn('Briefing Board deep-link check failed:', e); }
    // Generic "open this exact card" deep-link, Aug 15 2026 -- the
    // Idea Storyboard's Signal Flag peek ("also on the Briefing Board")
    // sets this before opening the tab. Looked up by the card's own id,
    // not source_header_id -- these are ordinary cards, not necessarily
    // header-linked ones.
    try{
      var _bbDeepLinkCardId=sessionStorage.getItem('fg_open_card_id');
      if(_bbDeepLinkCardId){
        sessionStorage.removeItem('fg_open_card_id');
        var _bbDeepLinkRes2=await sb.from('briefing_cards').select('id,board_id').eq('id',_bbDeepLinkCardId).eq('archived',false).limit(1);
        var _bbDeepLinkCard2=(_bbDeepLinkRes2.data && _bbDeepLinkRes2.data[0]) || null;
        if(_bbDeepLinkCard2){
          await _bbSwitchToBoard(_bbDeepLinkCard2.board_id);
          openCardDetail(_bbDeepLinkCard2.id);
          return;
        }
      }
    }catch(e){ console.warn('Briefing Board deep-link (by card id) check failed:', e); }
    // July 23, 2026, Larry: prefer the persisted database pointer over the
    // tab-only sessionStorage one -- it's what makes "which board is active"
    // work from a fresh tab, a different device, or a plain SQL lookup, not
    // just the browser tab that last switched boards. sessionStorage stays
    // as the fallback for a signed-out/local-only session.
    var remembered=null;
    try{
      var profRes=await sb.from('profiles').select('active_briefing_board_id').eq('user_id',uid).single();
      if(!profRes.error && profRes.data) remembered=profRes.data.active_briefing_board_id;
    }catch(e){}
    if(!remembered){ try{ remembered=sessionStorage.getItem('bbCurrentBoardId'); }catch(e){} }
    var match=_bbBoards.filter(function(b){ return b.id===remembered; })[0];
    var fallback=_bbBoards.filter(function(b){ return /field guide/i.test(b.name||''); })[0] || _bbBoards[0];
    await _bbSwitchToBoard((match||fallback).id);
  }

  // Org context, Aug 16 2026 -- Larry: opening Field Guide flipped the
  // Organization eyebrow to "Project" and asked him to name a project,
  // instead of showing T2T. A child board's Organization identity
  // (its Type and its org_name) was never really its own -- it belongs
  // to whichever board it's an adopted project OF. This resolves
  // "which board's identity should the eyebrow actually show right
  // now": itself, if it has no approved parent; otherwise its
  // immediate parent. Falls back to the board itself if the parent
  // isn't loaded (shouldn't happen for a traveler's own boards, but
  // never leave the eyebrow with nothing to show).
  function _bbOrgContextBoard(boardId){
    var board=_bbBoards.filter(function(b){ return b.id===boardId; })[0];
    if(!board) return null;
    var parentRel=_bbRelationsCache.filter(function(r){ return r.child_board_id===boardId; })[0];
    if(!parentRel) return board;
    var parent=_bbBoards.filter(function(b){ return b.id===parentRel.parent_board_id; })[0];
    return parent || board;
  }

  // NAME/Title's list is scoped to whichever TYPE is currently active.
  // Derived from the org-context board's board_type (Aug 13 2026: same
  // fix applied to the Idea Board's equivalent function; Aug 16 2026:
  // routed through _bbOrgContextBoard so a project shows its parent's
  // Type, not a Type of its own).
  function _bbActiveBoardType(){
    if(_bbPendingTypeOverride) return _bbPendingTypeOverride;
    var board=_bbOrgContextBoard(_bbCurrentBoardId);
    return (board && board.board_type) || 'personal';
  }

  // Extra Types beyond the fixed four, Aug 13 2026 -- Larry: Type is
  // open-ended now, same (+) pattern as a header's own (+) for adding
  // subbers. Any board_type value already in use (created via the
  // dashed-circle (+) below) shows up here automatically, no separate
  // types table needed -- the distinct values already in briefing_boards
  // ARE the list.
  function _bbExtraBoardTypes(){
    var fixed={}; BB_BOARD_TYPES.forEach(function(t){ fixed[t.value]=true; });
    var seen={}, extra=[];
    _bbBoards.forEach(function(b){
      var v=(b.board_type||'personal');
      if(!fixed[v] && !seen[v]){ seen[v]=true; extra.push(v); }
    });
    return extra;
  }
  function _bbTypeLabel(value){
    var hit=BB_BOARD_TYPES.filter(function(t){ return t.value===value; })[0];
    if(hit) return hit.label;
    return String(value||'').replace(/(^|[_\s]+)([a-z])/g, function(m,p1,p2){ return (p1?' ':'')+p2.toUpperCase(); }).trim();
  }

  // Custom dropdown, Aug 13 2026 -- Larry: "the (+) should be at the
  // bottom of each dropdown list, not to the side" AND "the + in a
  // dotted line circle just like every other add." A native <select>
  // can't render a real dashed circle as one of its own options, so
  // Type and Title are a small trigger button + a real styled menu
  // instead, ending in that literal dashed-circle (+). Mirrors the Idea
  // Board's own _sboardRenderDropdown, same shape, BB's own light theme.
  function _bbCloseAllDropdowns(exceptMenuId){
    ['bb-type-menu','bb-org-name-menu','bb-board-menu','bb-view-menu'].forEach(function(id){
      if(id===exceptMenuId) return;
      var m=document.getElementById(id);
      if(m) m.hidden=true;
    });
  }
  document.addEventListener('click', function(){ _bbCloseAllDropdowns(null); });

  // onRemove, Aug 15 2026 -- optional 8th param, so far only used by
  // the Organization Type picker. When present, a second dashed-circle
  // button (−) sits next to the existing (+) at the bottom of the
  // menu; clicking it hands back to the caller, which decides what
  // "remove" means for that particular list (Type hides an unused
  // preset -- see _bbHideType).
  function _bbRenderDropdown(triggerId, menuId, options, currentValue, onSelect, onAdd, addTitle, onRemove, removeTitle){
    var trigger=document.getElementById(triggerId), menu=document.getElementById(menuId);
    if(!trigger || !menu) return;
    var current=options.filter(function(o){ return String(o.value)===String(currentValue); })[0];
    trigger.textContent = current ? current.label : (options[0] ? options[0].label : '—');
    menu.innerHTML='';
    options.forEach(function(o){
      var row=document.createElement('div');
      row.className='bb-cdrop-row'+(current && String(current.value)===String(o.value) ? ' active' : '');
      row.textContent=o.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onSelect(o.value);
      });
      menu.appendChild(row);
    });
    var addRow=document.createElement('div');
    addRow.className='bb-cdrop-addrow';
    var addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='bb-dotted-add-btn';
    addBtn.title=addTitle||'Add';
    addBtn.textContent='+';
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      menu.hidden=true;
      onAdd();
    });
    addRow.appendChild(addBtn);
    if(onRemove){
      var removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='bb-dotted-add-btn bb-dotted-remove-btn';
      removeBtn.title=removeTitle||'Remove';
      removeBtn.textContent='−';
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onRemove();
      });
      addRow.appendChild(removeBtn);
    }
    menu.appendChild(addRow);
    // Moved to <body>, same reasoning as the Idea Board's own dropdown --
    // see the .bb-cdrop-menu CSS note above. Idempotent. Theme vars
    // (--bb-accent etc.) live only on #fg-root, so re-synced onto the
    // menu every time -- see _bbSyncMenuTheme.
    if(menu.parentElement!==document.body){ document.body.appendChild(menu); }
    _bbSyncMenuTheme(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?menuId:null);
      if(willOpen){
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(120,r.width)+'px';
        menu.hidden=false;
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
  }

  // ORGANIZATION, Aug 15 2026, corrected again -- Larry: the eyebrow
  // WORD ITSELF should be the dropdown (clicking "ORGANIZATION" opens
  // the category menu, and the word then becomes whatever category was
  // chosen -- e.g. "DEPARTMENT"). The field below is a separate, plain
  // name for that category (e.g. "Accounting"), no longer combined
  // into the same button. bb-type-trigger/bb-type-menu now live on the
  // eyebrow button itself (_bbRenderTypePicker, unchanged) -- this
  // function only handles the plain Name box underneath.
  // Org Name, Aug 16 2026 -- Larry: Type/Project/View all open as a
  // real dropdown when clicked, even empty ones (dashed-circle (+) at
  // the bottom either way) -- Org Name alone jumped straight to a
  // prompt() on click, no menu step first. Rebuilt on the same
  // _bbRenderDropdown component as the other three, for that same
  // consistent feel: the dropdown lists any other names already used
  // on boards of this same Type (so a repeat name is one click, not
  // retyped), the current name is highlighted if it's among them, (+)
  // still opens the rename prompt (unchanged flow, just reached one
  // click later now), and (-) clears the name off this board.
  function _bbOrgNameOptions(boardType){
    var seen={}, opts=[];
    _bbBoards.forEach(function(b){
      if((b.board_type||'personal')!==boardType) return;
      var n=(b.org_name||'').trim();
      if(!n || seen[n]) return;
      seen[n]=true; opts.push({value:n, label:n});
    });
    return opts;
  }
  function _bbRenderOrgName(){
    var trigger=document.getElementById('bb-org-name-trigger');
    if(_bbPendingTypeOverride){
      // Browsing a Type with nothing in it yet, Aug 16 2026 -- no real
      // board exists to attach a name to, so (+) has to create the
      // first board of this Type rather than just save a field on one.
      var typeVal=_bbPendingTypeOverride;
      var opts0=_bbOrgNameOptions(typeVal);
      _bbRenderDropdown('bb-org-name-trigger','bb-org-name-menu', opts0, null, function(){ /* nothing to select onto yet */ }, async function(){
        var typeLabel0=_bbTypeLabel(typeVal);
        var name0=window.prompt('Name for this '+typeLabel0+' (e.g. "Accounting" or "Denver Broncos"):', '');
        if(!name0 || !name0.trim()) return;
        var trimmed0=name0.trim();
        var ok=await _bbCreateBoard(trimmed0, typeVal);
        if(ok){
          var created=_bbBoards.filter(function(b){ return b.name===trimmed0 && b.board_type===typeVal; }).slice(-1)[0];
          if(created) await _bbSaveOrgName(trimmed0, created);
        }
      }, 'Add a name', function(){
        // (-) while browsing an empty Type, Aug 16 2026 -- Larry: both
        // (+) and (-) always show, no exceptions for blank. Nothing to
        // delete yet, so this backs out of the browse instead -- the
        // screen returns to whichever real board was open before.
        _bbPendingTypeOverride=null;
        _bbRenderTypePicker();
        _bbRenderOrgName();
        _bbRenderBoardPicker();
      }, 'Stop browsing this Type');
      if(trigger) trigger.textContent='Add a name';
      return;
    }
    var board=_bbOrgContextBoard(_bbCurrentBoardId);
    if(!board) return;
    var current=(board.org_name||'').trim();
    var opts=_bbOrgNameOptions(board.board_type||'personal');
    _bbRenderDropdown('bb-org-name-trigger','bb-org-name-menu', opts, current||null, function(newName){
      _bbSaveOrgName(newName, board);
    }, async function(){
      var typeLabel=_bbTypeLabel(board.board_type||'personal');
      var name=window.prompt('Name for this '+typeLabel+' (e.g. "Accounting" or "Denver Broncos"):', board.org_name||'');
      if(name===null) return;
      await _bbSaveOrgName(name, board);
      _bbRenderOrgName();
    }, 'Add a name', current ? function(){
      _bbSaveOrgName('', board);
    } : null, 'Remove this name');
    // _bbRenderDropdown falls back to the first option's label when
    // nothing matches currentValue -- not what an unnamed board should
    // show, so this overrides the trigger text directly afterward.
    if(trigger && !current) trigger.textContent='Add a name';
  }
  async function _bbSaveOrgName(value, boardOverride){
    var board=boardOverride || _bbOrgContextBoard(_bbCurrentBoardId);
    if(!board) return;
    var trimmed=(value||'').trim();
    if((board.org_name||'')===trimmed) return;
    board.org_name=trimmed;
    _bbRenderOrgName();
    var sb=T().sb;
    try{
      var upd=await sb.from('briefing_boards').update({org_name:trimmed||null}).eq('id', board.id);
      if(upd.error) console.error('Briefing Board: could not save Organization name', upd.error);
    }catch(e){ console.error('Briefing Board: could not save Organization name', e); }
  }

  function _bbRenderTypePicker(){
    var extra=_bbExtraBoardTypes();
    var opts=_bbVisibleFixedTypes().concat(extra.map(function(v){ return {value:v, label:_bbTypeLabel(v)}; }));
    var activeType=_bbActiveBoardType();
    _bbRenderDropdown('bb-type-trigger','bb-type-menu', opts, activeType, async function(newType){
      var matching=_bbBoards.filter(function(b){ return (b.board_type||'personal')===newType; });
      if(matching.length){
        _bbPendingTypeOverride=null;
        await _bbSwitchToBoard(matching[0].id);
      } else {
        // Aug 16 2026 -- Larry: an empty Type should browse the same as
        // a full one, dropdown and all, not jump straight to a prompt.
        // No board content to show yet (nothing exists), so whatever
        // was open stays open underneath; only the header switches.
        _bbPendingTypeOverride=newType;
        _bbRenderTypePicker();
        _bbRenderOrgName();
        _bbRenderBoardPicker();
      }
    }, async function(){
      var typeName=window.prompt('Name for the new Type (e.g. "Client", "Household"):');
      if(!typeName || !typeName.trim()) return;
      var typeValue=typeName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || ('type_'+Date.now());
      var firstBoardName=window.prompt('Name for the first '+typeName.trim()+' board:');
      if(!firstBoardName || !firstBoardName.trim()) return;
      await _bbCreateBoard(firstBoardName.trim(), typeValue);
    }, 'Add a type', function(){
      // Remove, Aug 15 2026 -- only ever hides an unused preset (see
      // _bbHideType/_bbVisibleFixedTypes); a Type still in use by one
      // of the traveler's own boards keeps showing no matter what.
      var removable=_bbVisibleFixedTypes().filter(function(t){ return t.value!==activeType; });
      if(!removable.length){ window.alert('Nothing left to remove.'); return; }
      var listText=removable.map(function(t){ return t.label; }).join(', ');
      var typeName=window.prompt('Which Type would you like to remove from the list? ('+listText+')\n\nAny board already using it keeps working either way.');
      if(!typeName || !typeName.trim()) return;
      var hit=removable.filter(function(t){ return t.label.toLowerCase()===typeName.trim().toLowerCase(); })[0];
      if(!hit){ window.alert('Didn\'t recognize "'+typeName.trim()+'" -- type the name exactly as shown.'); return; }
      _bbHideType(hit.value);
    }, 'Remove a type');
  }

  // Adopted children of a given board (Aug 16 2026) -- resolved
  // against _bbBoards, so this only ever shows a child the traveler
  // can actually see (their own, or one shared with them). A board
  // not yet loaded (e.g. someone else's, not shared) is silently
  // skipped rather than shown as a broken row.
  function _bbChildBoardsOf(boardId){
    if(!boardId) return [];
    var childIds=_bbRelationsCache.filter(function(r){ return r.parent_board_id===boardId; }).map(function(r){ return r.child_board_id; });
    return _bbBoards.filter(function(b){ return childIds.indexOf(b.id)!==-1; });
  }

  function _bbRenderBoardPicker(){
    var activeType=_bbActiveBoardType();
    var filtered=_bbBoards.filter(function(b){ return (b.board_type||'personal')===activeType; });
    // Adopted children ride along too, Aug 16 2026 -- Larry: opening
    // T2T should list Field Guide and Professional History as its
    // projects, not just other boards that happen to share T2T's own
    // Type. Deduped by id in case a child's own Type already matched.
    // Aug 16 2026 (later same day) -- resolved off the org-context
    // board, not the literally-open one, so opening Field Guide shows
    // the same T2T-family list as opening T2T itself, instead of an
    // empty "children of Field Guide" list. Skipped entirely while
    // browsing an empty Type (_bbPendingTypeOverride) -- there's no
    // real context board yet, so _bbCurrentBoardId is just whatever
    // was open before and its children don't belong in this list.
    if(!_bbPendingTypeOverride){
      var contextBoard=_bbOrgContextBoard(_bbCurrentBoardId);
      var children=_bbChildBoardsOf(contextBoard ? contextBoard.id : _bbCurrentBoardId);
      children.forEach(function(c){ if(!filtered.some(function(b){ return b.id===c.id; })) filtered=filtered.concat([c]); });
    }
    var opts=filtered.map(function(b){ return {value:b.id, label:b.name||'Untitled Board'}; });
    // (-) on the PROJECT field, Aug 16 2026 -- Larry: "how do we handle
    // a (-) with a full project? Sounds like we need a hub screen, 3
    // choices even if they do not all work yet." Only offered when a
    // real, currently-open board is actually showing in this list --
    // not while browsing an empty Type (nothing real to remove).
    var currentBoardForRemove=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var canRemoveBoard=!_bbPendingTypeOverride && currentBoardForRemove && filtered.some(function(b){ return b.id===currentBoardForRemove.id; });
    _bbRenderDropdown('bb-board-trigger','bb-board-menu', opts, _bbCurrentBoardId, async function(id){
      await _bbSwitchToBoard(id);
    }, async function(){
      var typeLabel=_bbTypeLabel(_bbActiveBoardType());
      var name=window.prompt('Name for the new '+typeLabel+' board:');
      if(!name || !name.trim()) return;
      await _bbCreateBoard(name.trim(), _bbActiveBoardType());
    }, 'Add a board', canRemoveBoard ? function(){
      openProjectHub(currentBoardForRemove.id);
    } : null, 'Remove this project');
  }

  // Shared by both Title's own (+) and Type's "no boards of this type
  // yet" prompt (Aug 3 2026) -- one creation path instead of two copies
  // of the same Supabase insert.
  async function _bbCreateBoard(name, boardType){
    var uid=await _bbCurrentUserId();
    if(!uid){
      window.alert('Could not add a board: your sign-in session appears to have expired. Please refresh the page and sign in again, then try adding the board.');
      return false;
    }
    var sb=T().sb;
    try{
      var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:boardType||'personal', name:name}).select().single();
      if(ins.error || !ins.data){
        console.error('Briefing Board: could not create board', ins.error);
        window.alert('Could not add the board "'+name+'". Error: '+(ins.error&&ins.error.message?ins.error.message:'unknown error')+'. Nothing was saved -- please try again or refresh the page.');
        return false;
      }
      _bbBoards.push(ins.data);
      // Aug 16 2026 -- mirror onto the Idea Storyboard the moment a board
      // is created, linked by briefing_board_id, so the two screens can
      // never drift back into separate, unlinked board lists (that
      // drift is what today's board-unification work was fixing).
      // Best-effort: a failure here logs a warning but doesn't block the
      // Briefing Board side, which already succeeded.
      try{
        var rootIns=await sb.from('ideas').insert({user_id:uid, content_type:'header', text_content:name, cluster_id:null, board_type:boardType||'personal', briefing_board_id:ins.data.id, created_at:new Date().toISOString()}).select().single();
        if(!rootIns.error && rootIns.data){
          await sb.from('ideas').update({project_id:rootIns.data.id, topic_scope_id:rootIns.data.id}).eq('id',rootIns.data.id);
        } else {
          console.warn('Briefing Board: could not mirror new board onto the Idea Storyboard', rootIns.error);
        }
      }catch(e){ console.warn('Briefing Board: could not mirror new board onto the Idea Storyboard', e); }
      await _bbSwitchToBoard(ins.data.id);
      return true;
    }catch(e){
      console.error('Briefing Board: could not create board', e);
      window.alert('Could not add the board "'+name+'". Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again or refresh the page.');
      return false;
    }
  }

  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
  }

  // Initials for the card-face badge, July 21, 2026 (evening) -- Assigned
  // To is a free-text stand-in field (e.g. "Doc (Larry E. Smithers)"),
  // so the full name never fit in the small round badge. If the text
  // has a parenthetical, that's treated as the real name to derive
  // initials from (favoring "LS" over "D" for "Doc (Larry E. Smithers)");
  // otherwise the initials come from the string as typed. First + last
  // word, matching the same two-letter convention already used for the
  // traveler roster (BF, JG, RB, LM, JB, LS).
  function _bbInitialsFromName(name){
    var letters=String(name||'').trim().split(/\s+/).map(function(w){ return w.replace(/[^A-Za-z]/g,''); }).filter(function(w){ return w.length>0; });
    if(!letters.length) return '';
    if(letters.length===1) return letters[0].charAt(0).toUpperCase();
    return (letters[0].charAt(0)+letters[letters.length-1].charAt(0)).toUpperCase();
  }

  // Assigned To / member roster picker -- retired Session 234 (Aug 21,
  // Larry: "add the same bottom row as on the IDEA CARD to the BB
  // Cards... twin heads"). Used to populate a select from a
  // 'briefing_roster' table that never actually existed in Supabase
  // (confirmed via list_tables -- always silently failed, caught by its
  // own try/catch), so nothing here was ever really live; the 👥 people
  // dropdown (wireBbDetailActions, T2TStoryboard.openPeopleDropdown)
  // is the one place to put someone on a card now, same as the Idea
  // Card. _bbInitials just below is kept -- it's still the legacy-
  // fallback initials source for any card nobody's starred yet.

  function _bbInitials(person){
    if(!person) return '';
    var m=String(person).match(/\(([^)]+)\)/);
    var src=(m?m[1]:person).trim();
    var letters=src.split(/\s+/).map(function(w){ return w.replace(/[^A-Za-z]/g,''); }).filter(function(w){ return w.length>0; });
    if(!letters.length) return '';
    if(letters.length===1) return letters[0].charAt(0).toUpperCase();
    return (letters[0].charAt(0)+letters[letters.length-1].charAt(0)).toUpperCase();
  }

  // Due date parsing: the field is free text like "7/25" (no year).
  // Assume the current year; if that reading would already be more than
  // ~half a year in the past, it almost certainly means next year (e.g.
  // typing "1/5" in December) rather than last January.
  function _bbParseDue(s){
    if(!s) return null;
    var m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if(!m) return null;
    var mo=parseInt(m[1],10)-1, da=parseInt(m[2],10);
    var now=new Date();
    var yr=m[3] ? (m[3].length===2?2000+parseInt(m[3],10):parseInt(m[3],10)) : now.getFullYear();
    var d=new Date(yr, mo, da);
    if(isNaN(d.getTime())) return null;
    if(!m[3]){
      var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if(d-today < -182*86400000) d=new Date(yr+1, mo, da);
    }
    return d;
  }
  function _bbDaysUntil(d){
    var now=new Date();
    var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((d-today)/86400000);
  }
  function _bbDaysUntilOrInf(c){
    var d=_bbParseDue(c.due);
    return d ? _bbDaysUntil(d) : Infinity;
  }

  // Overdue pink-face signal, Aug 15 2026, Larry: "pink faced card" for
  // anything whose due date has passed. Deliberately independent of
  // priority (see the HH bump in _bbAutoEscalateDates below) -- Larry
  // pulled a card back down from an auto-escalated HH once already, so
  // this reads the calendar fact on its own rather than piggybacking on
  // a priority the traveler may have deliberately overridden. Excludes
  // Done (finished work can't be overdue) and Hang-Ups (already owns
  // its own red signal) -- matches the Do/Doing scope of the HH bump
  // plus Hang-Ups' existing color. "Overdue" means the date has fully
  // passed, not just arrived today (_bbDaysUntil < 0, not <= 0).
  function _bbIsOverdue(c){
    if(!c || c.archived || c.trashedAt) return false;
    if(c.col==='done' || c.col==='hangups') return false;
    var d=_bbParseDue(c.due);
    if(!d) return false;
    return _bbDaysUntil(d) < 0;
  }

  // Missed Start Date pink-face, Aug 27 2026, Larry: "What if a missed
  // START DATE turns a card pink like a missed DUE DATE and moves it to
  // HIGH priority?" -- the HIGH-priority part already existed (July 22
  // 2026, the startEscalatedFor bump in _bbAutoEscalateDates below), so
  // this only adds the pink half, same "fully passed, not just arrived
  // today" rule as _bbIsOverdue. Scoped to _bbIsDoCol (new/do-h/do-m/
  // do-l) rather than done/hangups like the due-date version -- a
  // missed START only means anything while the card genuinely hasn't
  // started yet; once it's in Doing it has started, late or not, so
  // there's nothing left to flag.
  function _bbIsStartOverdue(c){
    if(!c || c.archived || c.trashedAt) return false;
    if(!_bbIsDoCol(c.col)) return false;
    var d=_bbParseDue(c.startDate);
    if(!d) return false;
    return _bbDaysUntil(d) < 0;
  }

  // Larry, July 20, 2026: anything WITH a priority outranks anything
  // without one (unset already sorts last, rank 7, below L's 5). On top
  // of that, a near or passed due date pulls a card's effective rank up
  // for sorting purposes -- it might carry an L, but a due date due
  // today (or overdue) says otherwise. This only ever moves a card UP
  // (toward HH), never down -- a due date can't make an HH card less
  // urgent. The card still shows whatever priority was actually set;
  // this effective rank is for sort order only.
  // (A Start Date that's arrived while still in Do used to get this
  // same sort-only treatment -- July 22, 2026, Larry asked for that one
  // to be a real change instead: see _bbAutoEscalateDates, called
  // from renderBoard, which actually sets c.priority to H so the card's
  // own badge tells the truth, not just its position in the list.)
  function _priRank(c){
    var base = PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
    var rank = base;
    var daysUntil = _bbDaysUntilOrInf(c);
    if(daysUntil!==Infinity){
      if(daysUntil<=0) rank=Math.min(rank, 0);      // due today or overdue -> at least HH
      else if(daysUntil<=2) rank=Math.min(rank, 1); // due very soon -> at least H
      else if(daysUntil<=5) rank=Math.min(rank, 2); // due soon -> at least MH
    }
    return rank;
  }

  // July 23, 2026 (later), Larry: caught a real bug -- an ML card had
  // drifted to sort_order 0 in DO-M, tied with an MH card and sitting
  // above two plain M cards. Escalating/de-escalating a card's priority
  // (drag-to-top/bottom, the H/M/L buttons, or the date auto-escalation
  // below) was only ever changing the badge, never its actual position
  // -- "HH over H" / "MH over M over ML" was true in theory but not
  // enforced on the board. This re-sorts one Do column by priority rank
  // (HH/H in do-h, MH/M/ML in do-m -- do-l and new are single-value
  // families, always a no-op) and renumbers sort_order sequentially.
  // Stable sort, so cards that share a priority keep whatever relative
  // order they already had -- this only fixes rank violations, it
  // doesn't reshuffle same-priority cards against each other. Called
  // after anything that can change a Do-column card's priority.
  function _bbResortDoColumnByPriority(colKey){
    if(!_bbIsDoCol(colKey) || colKey==='new') return;
    var all=_bbCardsList();
    var colCards=all.filter(function(c){ return !c.archived && !c.locked && c.col===colKey; });
    colCards.sort(function(a,b){
      var soa=(typeof a.sortOrder==='number')?a.sortOrder:Infinity;
      var sob=(typeof b.sortOrder==='number')?b.sortOrder:Infinity;
      return (soa-sob) || 0;
    });
    colCards.sort(function(a,b){
      var ra=PRI_ORDER.hasOwnProperty(a.priority)?PRI_ORDER[a.priority]:7;
      var rb=PRI_ORDER.hasOwnProperty(b.priority)?PRI_ORDER[b.priority]:7;
      return ra-rb; // stable -- ties keep the sortOrder-based order set above
    });
    colCards.forEach(function(c, idx){ c.sortOrder=idx; });
  }

  // July 22, 2026, Larry: an arrived Start Date while a card sits in Do
  // ("scheduled to begin, hasn't actually begun") now bumps its ACTUAL
  // priority to H, not just its sort position -- the badge itself
  // should say H, so anyone glancing at the card sees why it jumped.
  // Only escalates (never overrides an already-more-urgent H or HH),
  // and only touches Do -- moving into Doing/Done stops the escalation
  // from re-triggering (the card just keeps whatever priority it had
  // when it moved). Runs every render; harmless to repeat since once a
  // card is at H or HH this is a no-op.
  function _bbAutoEscalateDates(){
    // Always scans + saves the FULL unfiltered list (not whatever
    // subset renderBoard happens to be working with) -- _bbSaveLocal
    // replaces _bbCards wholesale, so handing it a filtered array would
    // quietly drop every archived card from storage.
    // July 22, 2026, Larry: extended same day to Due Date -> HH (while
    // still in Do or Doing -- due date matters right up until the work
    // is actually done, not just before it starts), and made the
    // advance notice a traveler choice in Gear instead of a fixed "on
    // the day" rule -- "how much advance notice do I need to get
    // something done?" differs by person. bb-start-warn-days /
    // bb-due-warn-days (0 by default, matching the original on-the-day
    // behavior) control how many days BEFORE the date each fires. This
    // sits alongside, not instead of, the older graduated due-date
    // sort-only nudges in _priRank (5 days / 2 days out) -- those still
    // just nudge sort position; this is the point the badge itself
    // actually changes.
    // July 23, 2026 (later), Larry: real bug -- this ran on every
    // render, so a card with a past-due start/due date got pulled back
    // to H/HH and DO-H the instant a traveler dragged it anywhere else
    // ("Items in H cannot be moved to other priorities"). It's meant to
    // be a one-time nudge the moment a date arrives, not a standing rule
    // that overrides a manual decision forever. c.startEscalatedFor /
    // c.dueEscalatedFor now remember which date value already triggered
    // the bump, so it only fires again if the date itself changes to
    // something new -- a traveler's manual drag/reprioritization after
    // the nudge sticks.
    var all=_bbCardsList();
    var changed=false;
    var startWarn=_bbStartWarnDays(), dueWarn=_bbDueWarnDays();
    _bbOverdueFlashIds = [];
    all.forEach(function(c){
      if(c.archived) return;
      // Overdue pink-flash, Aug 15 2026 -- stamped independently of the
      // HH priority bump just below (see _bbIsOverdue). Only remembers
      // c.due's value, same pattern as startEscalatedFor/dueEscalatedFor,
      // so it fires again if the due date itself changes to something new.
      if(_bbIsOverdue(c) && c.overdueFlashShownFor!==c.due){
        _bbOverdueFlashIds.push(c.id);
        c.overdueFlashShownFor=c.due;
        changed=true;
      }
      // Missed Start Date pink-flash, Aug 27 2026 -- same one-time-per-
      // value pattern, its own remembered stamp (startOverdueFlashShownFor)
      // since it's keyed off startDate, not due. Pushed into the same
      // _bbOverdueFlashIds list as the due-date flash above -- the
      // render code just checks membership, it doesn't care which date
      // caused it, so one card can't double-flash for having both.
      if(_bbIsStartOverdue(c) && c.startOverdueFlashShownFor!==c.startDate){
        if(_bbOverdueFlashIds.indexOf(c.id)===-1) _bbOverdueFlashIds.push(c.id);
        c.startOverdueFlashShownFor=c.startDate;
        changed=true;
      }
      // July 22, 2026: c.col is now one of do-h/do-m/do-l, not a single
      // 'do' -- _bbIsDoCol covers all 3. When priority changes here,
      // also move the card into whichever Do column now matches (if
      // it's still in Do at all -- Due Date's HH bump can fire from
      // Doing too, and a card sitting in Doing doesn't jump back into
      // a Do column just because its priority changed).
      if(_bbIsDoCol(c.col) && c.startDate && c.startEscalatedFor!==c.startDate){
        var sd=_bbParseDue(c.startDate);
        if(sd && _bbDaysUntil(sd)<=startWarn){
          var curRank=PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
          if(curRank>PRI_ORDER.H){ c.priority='H'; c.col=_bbDoColKey(c.priority); changed=true; }
          c.startEscalatedFor=c.startDate;
        }
      }
      if((_bbIsDoCol(c.col) || c.col==='doing') && c.due && c.dueEscalatedFor!==c.due){
        var dd=_bbParseDue(c.due);
        if(dd && _bbDaysUntil(dd)<=dueWarn){
          var curRank2=PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
          if(curRank2>PRI_ORDER.HH){
            c.priority='HH';
            if(_bbIsDoCol(c.col)) c.col=_bbDoColKey(c.priority);
            changed=true;
          }
          c.dueEscalatedFor=c.due;
        }
      }
    });
    if(changed){
      _bbResortDoColumnByPriority('do-h');
      _bbResortDoColumnByPriority('do-m');
      _bbResortDoColumnByPriority('do-l');
      _bbSaveLocal(all);
    }
    return changed;
  }

  function _bbLoadTopic(){
    try{ return sessionStorage.getItem('bbTopic')||''; }catch(e){ return ''; }
  }
  function _bbSaveTopic(text){
    try{ sessionStorage.setItem('bbTopic', text); }catch(e){}
  }

  function _bbApplyTheme(themeKey){
    var t=THEMES.filter(function(x){ return x.key===themeKey; })[0]; if(!t) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-bg', t.bg);
    fgr.style.setProperty('--bb-accent', t.accent);
    fgr.style.setProperty('--bb-ink', t.ink);
    fgr.style.setProperty('--bb-sub', t.sub);
    try{ sessionStorage.setItem('bbTheme', themeKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbApplyFont(fontKey){
    var f=FONTS.filter(function(x){ return x.key===fontKey; })[0]; if(!f) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-head-font', f.head);
    fgr.style.setProperty('--bb-body-font', f.body);
    try{ sessionStorage.setItem('bbFont', fontKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbCurrentTheme(){
    try{ return sessionStorage.getItem('bbTheme')||'gold'; }catch(e){ return 'gold'; }
  }
  function _bbCurrentFont(){
    try{ return sessionStorage.getItem('bbFont')||'classic'; }catch(e){ return 'classic'; }
  }
  // July 22, 2026, Larry: advance-warning windows are a traveler choice,
  // not a fixed rule -- "how much advance notice do I need to get
  // something done?" differs by person. Stored in localStorage (unlike
  // theme/font, which are session-only) since this is a "set it and
  // forget it" preference, not a quick per-visit pick. 0 reproduces the
  // original hardcoded behavior (escalate exactly on/after the date).
  function _bbStartWarnDays(){
    try{ var v=parseInt(localStorage.getItem('bbStartWarnDays'),10); return isNaN(v)?0:Math.max(0,v); }
    catch(e){ return 0; }
  }
  function _bbDueWarnDays(){
    try{ var v=parseInt(localStorage.getItem('bbDueWarnDays'),10); return isNaN(v)?0:Math.max(0,v); }
    catch(e){ return 0; }
  }
  function _bbSetStartWarnDays(n){
    try{ localStorage.setItem('bbStartWarnDays', String(Math.max(0, parseInt(n,10)||0))); }catch(e){}
  }
  function _bbSetDueWarnDays(n){
    try{ localStorage.setItem('bbDueWarnDays', String(Math.max(0, parseInt(n,10)||0))); }catch(e){}
  }
  function _bbHighlightAppearance(){
    var curTheme=_bbCurrentTheme(), curFont=_bbCurrentFont();
    document.querySelectorAll('.bb-theme-swatch').forEach(function(el){
      el.classList.toggle('bb-swatch-active', el.getAttribute('data-theme')===curTheme);
    });
    document.querySelectorAll('.bb-font-btn').forEach(function(el){
      el.classList.toggle('bb-flag-active', el.getAttribute('data-font')===curFont);
    });
  }

  // Drag-by-header, July 20, 2026 -- Larry: New Card and Back of the
  // Card should be movable "for visual convenience" (so the board
  // underneath can be peeked at while one is open). Starts centered
  // (the existing flex-centered default) every time it opens; only
  // switches to an explicit fixed position once the traveler actually
  // grabs the header bar and drags. Position resets on next open.
  function _bbResetCardPosition(cardEl){
    if(!cardEl) return;
    cardEl.style.position=''; cardEl.style.left=''; cardEl.style.top=''; cardEl.style.margin='';
  }
  function _bbMakeDraggable(cardEl, headEl){
    if(!cardEl || !headEl) return;
    var dragging=false, startX=0, startY=0, startLeft=0, startTop=0;
    function onDown(e){
      if(e.target.closest('.bb-close')) return; // the X still just closes
      var pt = e.touches ? e.touches[0] : e;
      var rect=cardEl.getBoundingClientRect();
      dragging=true;
      startX=pt.clientX; startY=pt.clientY;
      startLeft=rect.left; startTop=rect.top;
      cardEl.style.position='fixed';
      cardEl.style.margin='0';
      cardEl.style.left=startLeft+'px';
      cardEl.style.top=startTop+'px';
      headEl.style.cursor='grabbing';
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      cardEl.style.left=(startLeft+(pt.clientX-startX))+'px';
      cardEl.style.top=(startTop+(pt.clientY-startY))+'px';
      e.preventDefault();
    }
    function onUp(){ dragging=false; headEl.style.cursor='grab'; }
    headEl.style.cursor='grab';
    headEl.addEventListener('mousedown', onDown);
    headEl.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('mousemove', onMove, {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function injectBriefingBoardStyles(){
    if(document.getElementById('bb-style')) return;
    var style=document.createElement('style');
    style.id='bb-style';
    style.textContent=
       '#fg-root{--bb-bg:#FDF6E8;--bb-accent:#C9A87C;--bb-ink:#3B2510;--bb-sub:#7A5C3A;--bb-head-font:"Playfair Display",serif;--bb-body-font:Georgia,serif}'
      +'#s-briefing-board{position:relative}'
      +'#fg-root.isx-full #s-briefing-board.active{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:column}'
      /* Header, July 20 2026 -- Topic folded into the SAME row as the
         title (a rounded pill, still always plain white so it stands
         out against whichever theme background is active) instead of
         its own bar above it, per Larry: don't spend a whole extra row
         of vertical board space on it. Gear + X ride along on the
         right of that same row. */
      // Header tightened, July 22 2026 -- Larry: "tighten up the screen
      // header ... more room for the body." Title + description now
      // stack together in the left column instead of the description
      // running the full width below the row, so they center as one
      // block against the topic's height. Top/bottom padding matched
      // (10px each) so the divider sits as close under the topic as
      // the topic sits under the top edge -- no more dead space.
      +'.bb-mhead{background:var(--bb-bg);border-bottom:3px solid var(--bb-accent);padding:10px 20px;flex-shrink:0}'
      +'.bb-mhead-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}'
      // TYPE + NAME, Aug 3 2026 -- Larry: "TOPIC is a permanent Briefing
      // Board [title], A control and communication tool, in the center.
      // Far left: eyebrow TYPE with drop down list followed by a Field
      // filled in with the name." Swaps the board switcher from the
      // center (where it lived as one big pill since July 22) out to the
      // far left, split into two small eyebrow-labeled dropdowns -- TYPE
      // (Personal/Departmental/Company/Project, briefing_boards.board_type)
      // then NAME (that type's boards, briefing_boards.name -- "Larry,"
      // "Accounting," "T2T," "Field Guide"). The center now carries the
      // permanent "Briefing Board" title, same text/size it always had,
      // just relocated.
      +'.bb-mh-typebox{display:flex;gap:14px;justify-self:start;align-items:flex-start}'
      +'.bb-mh-fieldgrp{display:flex;flex-direction:column;gap:3px;align-items:center}'
      +'.bb-mh-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      // Organization's eyebrow is itself the Type dropdown trigger now,
      // Aug 15 2026 (Larry: "I want that word to actually be a dropdown
      // choice") -- it's a <button> sharing .bb-mh-eyebrow's exact look,
      // reset to have no box/border so it stays visually identical to
      // Project's and Team's plain eyebrows, just clickable. Its own
      // text becomes whatever category is chosen (e.g. "DEPARTMENT"),
      // not a fixed word -- the one eyebrow that's genuinely dynamic.
      +'button.bb-mh-eyebrow{background:none;border:none;padding:0;margin:0;cursor:pointer;font-family:inherit;width:auto}'
      +'button.bb-mh-eyebrow:hover{opacity:.65}'
      // One shared trigger-box class for Type/Title/View, Aug 13 2026
      // (Larry: "make the Briefing Board exactly like the Idea Board for
      // TYPE, TITLE and VIEW... every new board will have this same
      // setup") -- mirrors the Idea Board's single .sc-hdr-select box
      // model (height/padding/radius/opacity/hover) exactly; color and
      // font stay Briefing's own established theme (Gear > Colors),
      // which was never the part that had drifted.
      +'.bb-hdr-select{background:#fff;border:1.5px solid var(--bb-accent);color:var(--bb-ink);border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-family:var(--bb-head-font);font-weight:700;font-size:calc(11px * var(--fg-text-scale,1));max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.bb-hdr-select:hover{opacity:1}'
      // Rename, Aug 13 2026 (Larry) -- the separate pencil button is
      // gone; double-click the Title trigger to rename, same interaction
      // as the Idea Board's Title (see wireTopicBar's dblclick wiring).
      // Dotted-circle (+) beside Type/Title, Aug 13 2026 -- Larry: same
      // consistent symbol everywhere, matching .tm-add-tile's existing
      // dashed-circle look (Cast/team add) instead of the old text
      // "(+) Add a type/board..." row that used to live inside the
      // dropdown itself.
      +'.bb-dotted-add-btn{width:22px;height:22px;flex-shrink:0;border-radius:50%;background:transparent;border:1.5px dashed var(--bb-accent);color:var(--bb-sub);display:flex;align-items:center;justify-content:center;font-size:calc(13px * var(--fg-text-scale,1));font-weight:700;font-family:inherit;line-height:1;cursor:pointer;padding:0;opacity:.75;transition:opacity .15s,background .15s,border-color .15s,color .15s}'
      +'.bb-dotted-add-btn:hover{opacity:1;background:var(--bb-bg);border-color:var(--bb-ink);color:var(--bb-ink)}'
      +'.bb-dotted-remove-btn{border-color:#a3372b;color:#a3372b}'
      +'.bb-dotted-remove-btn:hover{background:#FFF4F2;border-color:#a3372b;color:#a3372b}'
      // Custom Type/Title dropdowns, Aug 13 2026 -- Larry: "the (+)
      // should be at the bottom of each dropdown list, not to the
      // side." Same reasoning as the Idea Board's own sc-cdrop: a
      // native <select> can't render a real dashed circle as one of
      // its own options, so Type/Title are a trigger button + a real
      // styled menu, ending in the same dashed-circle (+) as .tm-add-tile.
      +'.bb-cdrop{position:relative}'
      // Centered, Aug 13 2026 -- same fix as the Idea Board's sc-cdrop-trigger.
      +'.bb-cdrop-trigger{display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;width:100%}'
      +'.bb-cdrop-trigger:after{content:\'\u25be\';font-size:calc(9px * var(--fg-text-scale,1));opacity:.6;flex-shrink:0}'
      // position:fixed + moved to <body> on open (see _bbRenderDropdown),
      // Aug 13 2026 -- same fix as the Idea Board's sc-cdrop-menu: nested
      // inside the header band, the menu was trapped in that band's own
      // stacking context no matter its own z-index, so board content
      // underneath painted over it. Living as a direct child of <body>
      // with a real viewport position escapes that.
      +'.bb-cdrop-menu{position:fixed;background:#fff;border:1.5px solid var(--bb-accent);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);z-index:99999;padding:4px;box-sizing:border-box;max-height:240px;overflow-y:auto;min-width:120px}'
      +'.bb-cdrop-row{padding:6px 10px;font-family:var(--bb-body-font);font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);border-radius:6px;cursor:pointer;white-space:nowrap}'
      +'.bb-cdrop-row:hover{background:var(--bb-bg)}'
      +'.bb-cdrop-row.active{background:var(--bb-bg);font-weight:700}'
      +'.bb-cdrop-addrow{display:flex;justify-content:center;gap:10px;padding:6px 0 2px;margin-top:2px;border-top:1px solid var(--bb-bg)}'
      // VIEW dropdown roles + inline add, Aug 13 2026 (Larry): same
      // change as the Idea Board's own sc-view-row/-addform -- the
      // person-filter list now shows each Cast member's role and lets
      // an Owner or Leader add someone right from the board face.
      +'.bb-view-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}'
      +'.bb-view-row-name{overflow:hidden;text-overflow:ellipsis}'
      +'.bb-view-row-role{font-size:calc(9px * var(--fg-text-scale,1));color:var(--bb-sub);flex-shrink:0;text-transform:uppercase;letter-spacing:.03em;margin-left:10px}'
      +'.bb-view-addform{padding:8px 6px 4px;border-top:1px solid var(--bb-bg);margin-top:2px}'
      +'.bb-view-addform input{width:100%;box-sizing:border-box;font-size:calc(11px * var(--fg-text-scale,1));padding:5px 7px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;color:var(--bb-ink);font-family:var(--bb-body-font);margin-bottom:5px}'
      +'.bb-view-addform .tm-add-suggest{position:static;box-shadow:none;margin-bottom:5px}'
      +'.bb-view-removeform{padding:6px}'
      +'.bb-view-remove-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-view-remove-row:not(:last-child){border-bottom:1px solid var(--bb-bg)}'
      +'.bb-view-remove-empty{font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);padding:4px 2px}'
      +'.bb-view-add-confirm{width:100%;box-sizing:border-box;margin-bottom:4px}'
      +'.bb-view-add-error{font-size:calc(10px * var(--fg-text-scale,1));color:#a3372b;margin-top:2px}'
      // Center title, Aug 3 2026 -- Larry: "Make Briefing Board larger.
      // Push tagline lower." Was 20px (sized for when it sat next to the
      // big board-name pill); now the header's one permanent, static
      // element, sized to lead. Gap between title and tagline widened
      // 2px -> 10px so the tagline reads as its own line, not crowded
      // against the title's descenders.
      +'.bb-mh-group-center{display:flex;flex-direction:column;align-items:center;gap:10px;justify-self:center;text-align:center}'
      +'.bb-mh{color:var(--bb-ink);font-size:calc(38px * var(--fg-text-scale,1));font-weight:700;line-height:1;font-family:var(--bb-head-font)}'
      +'.bb-mhead-actions{display:flex;gap:8px;flex-shrink:0;justify-self:end;justify-content:flex-end}'
      +'.bb-icon-btn{width:30px;height:30px;border-radius:6px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;color:var(--bb-ink);padding:0}'
      // Dashed-circle (+) everywhere, Aug 13 2026 (Larry: "on all boards
      // (+) should be surrounded by a dotted line for consistency") --
      // same modifier pattern as .bb-key-add over .bb-key-btn: keep the
      // icon button's box, swap corners for a dashed circle.
      +'.bb-icon-btn-add{border-radius:50%;border-style:dashed}'
      +'.bb-icon-btn:hover{background:var(--bb-bg)}'
      +'.bb-doors-row{display:flex;gap:6px;margin-bottom:10px}'
      +'.bb-door-btn{flex:0 0 auto}'
      +'.bb-icon-loading{opacity:.5;pointer-events:none}'
      // Bottom action row, Session 234 (Aug 21) -- Lock/People/Gear/Trash,
      // reuses .bb-doors-row's own layout so it matches the doors row
      // directly above it. Lock's "on" state borrows the same red already
      // used for Hang-Ups/locked elsewhere in this file.
      +'.bb-icon-btn.bb-lock-active{background:#a3372b;border-color:#a3372b;color:#fff}'
      // Divider + even spread, Aug 21 2026 (Larry): a line above the
      // bottom action row to set it apart from the rest of the card,
      // and the 4 icons spread across the full width instead of
      // clustered at the left -- same treatment applied to the Idea
      // Card's own .sb-blue-row (idea-storyboard-9710.js) for
      // consistency between the two card types. width:100% is required
      // here (unlike the Idea Card) because #bb-detail-overlay .bbw is
      // a flex column with align-items:flex-start -- every direct child
      // shrinks to its own content width there instead of filling the
      // card, so without an explicit width justify-content:space-between
      // has no extra space to distribute and the icons just sit bunched
      // at the left. (.bb-field already sets width:100% for the same
      // reason -- this row just never had to before now.)
      +'.bb-action-row{width:100%;box-sizing:border-box;border-top:1.5px solid var(--bb-accent);padding-top:10px;justify-content:space-between}'
      // Match the Idea Card's bottom row exactly, Aug 21 2026 (Larry:
      // "make them both look like the IDEA CARD, same width of buttons
      // and same icon for trash") -- .bb-icon-btn everywhere else on the
      // Briefing Card stays a fixed 30x30 square (top toolbar, checklist
      // add, date pickers, etc.), but inside this specific bottom row the
      // 4 buttons now stretch and share the row evenly, same as
      // .sb-blue-btn on the Idea Card (idea-storyboard-9710.js).
      +'.bb-action-row .bb-icon-btn{width:auto;height:auto;flex:1 1 auto;min-width:36px;padding:6px 10px;border-radius:8px;border-width:0.5px}'
      +'.bb-swatch-row{flex-wrap:wrap}'
      +'.bb-swatch{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--bb-accent);cursor:pointer;padding:0}'
      +'.bb-swatch.bb-swatch-active{box-shadow:0 0 0 2px var(--bb-ink)}'
      +'.bb-dates-block .bb-date-row{margin-bottom:4px}'
      +'.bb-routine-select{width:140px}'
      +'.bb-mt{color:var(--bb-sub);font-size:calc(13px * var(--fg-text-scale,1));font-style:italic}'
      // Center the board's columns as a group (Larry, July 22 2026)
      // instead of always hugging the left edge -- still scrolls
      // normally once there are enough columns to overflow.
      +'#bb-board-wrap{flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 16px;background:var(--bb-bg);display:flex;justify-content:center}'
      +'#bb-cols{display:flex;gap:14px;height:100%}'
      +'.bb-col{flex-shrink:0;width:190px;display:flex;flex-direction:column;background:rgba(201,168,124,0.14);border:1px solid var(--bb-accent);border-radius:8px;padding:8px}'
      +'.bb-col-head{font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-bg);background:var(--bb-ink);border-radius:4px;text-align:center;padding:7px 4px;margin-bottom:4px}'
      +'.bb-col[data-col="hangups"] .bb-col-head{background:#a3372b;color:#fff}'
      // July 22, 2026, Larry: color the 3 Do column headers red/green/
      // yellow (H/M/L, in that order) so priority reads at a glance
      // across the board, not just on each card's own badge.
      // July 23, 2026 (later): NEW dropped its own tone -- Larry wants
      // it to read the same as DOING/DONE (both use the base
      // .bb-col-head styling below, var(--bb-ink)/var(--bb-bg)), so no
      // override here at all.
      +'.bb-col[data-col="do-h"] .bb-col-head{background:#c0272a;color:#fff}'
      +'.bb-col[data-col="do-m"] .bb-col-head{background:#3F8F3F;color:#fff}'
      +'.bb-col[data-col="do-l"] .bb-col-head{background:#e0c22e;color:#3B2510}'
      +'.bb-col-cards{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:60px}'
      +'.bb-col-cards.bb-dragover{outline:2px dashed var(--bb-accent);outline-offset:2px}'
      +'.bb-card{position:relative;background:#FFFDF7;border:1px solid var(--bb-accent);border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1.3;cursor:grab;font-family:var(--bb-body-font)}'
      +'.bb-card .bb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}'
      +'.bb-card .bb-top-left{display:flex;align-items:center;gap:4px}'
      +'.bb-pri-badge{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;line-height:1.4}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:calc(13px * var(--fg-text-scale,1));color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:calc(8px * var(--fg-text-scale,1));color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--bb-body-font);flex-shrink:0}'
      +'.bb-card .bb-task{color:var(--bb-ink);margin:2px 0 5px;word-break:break-word}'
      +'.bb-card-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--bb-sub);margin:1px 0 2px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-done-date{font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:#3F6B3A;text-align:right;margin-top:1px}'
      +'.bb-key-badges{position:absolute;bottom:2px;left:4px;display:flex;gap:7px;pointer-events:none}'
      // pointer-events:auto here, Aug 4 2026 -- the container above stays
      // click-through (so it never steals a card drag), but the wrap
      // around each dot+count needs real pointer events or its title
      // tooltip (the meaning, on hover) never fires -- a child inherits
      // "none" from its parent unless it opts back in like this.
      +'.bb-key-badge-wrap{display:inline-flex;align-items:center;gap:2px;pointer-events:auto;cursor:default}'
      +'.bb-key-badge{width:12px;height:12px;box-shadow:0 1px 2px rgba(0,0,0,.3);flex-shrink:0}'
      // .bb-key-link-count removed Aug 15 2026 (Larry: "delete number
      // of like flags from front of every type of card") -- the count
      // is still computed and available via each flag's hover tooltip,
      // just no longer rendered as a visible number on the card face.
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed var(--bb-accent);border-radius:3px;text-align:center;padding:8px;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);cursor:pointer;font-family:var(--bb-body-font)}'
      +'.bb-add-tile:hover{background:rgba(201,168,124,0.2)}'
      /* Fixed Trash can, July 20, 2026 -- same "small round drop target,
         bottom-right" convention as 9711's isx-trash-fixed. Anchored to
         #s-briefing-board itself (not #bb-board-wrap, which scrolls
         horizontally on narrow screens) so it never drifts off with the
         columns. */
      +'.bb-trash{position:absolute;right:16px;bottom:16px;width:44px;height:44px;border-radius:50%;background:#FFFDF7;border:2px solid var(--bb-ink);box-shadow:0 2px 6px rgba(59,37,16,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:80}'
      +'.bb-trash.bb-trash-dropready{outline:2px solid #a3372b;outline-offset:2px}'
      +'.bbw{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box}'
      +'#bb-detail-overlay .bbw{align-items:flex-start}'
      +'.bb-field{width:100%;max-width:280px;margin-bottom:12px;text-align:left}'
      +'.bb-field label{display:block;font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:3px}'
      // Addition checkboxes, Aug 27 2026 -- same label styling as every
      // other .bb-field label, just with a checkbox riding in front of
      // the text instead of standing alone. Body starts collapsed
      // (inline style="display:none" in the markup); JS only ever
      // flips that display, so there's no extra "open" class to keep
      // in sync -- one source of truth per addition. Darkened to
      // --bb-ink (was inheriting --bb-sub's lighter tone from the
      // shared ".bb-field label" rule) and a fixed line-height matching
      // the checkbox's own height, Aug 27 2026 (Larry: "center on the
      // checkboxes... darken the text") -- align-items:center alone
      // wasn't enough to true up the text against the checkbox box.
      +'.bb-addition-label{display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--bb-ink);line-height:14px}'
      +'.bb-addition-label input[type=checkbox]{width:14px;height:14px;margin:0;flex-shrink:0;cursor:pointer}'
      +'.bb-addition-body{margin-top:6px}'
      +'.bb-field-divider{border:none;border-top:1px solid var(--bb-accent);width:100%;max-width:280px;margin:4px 0 12px}'
      // Quiet Added-date, Aug 27 2026 (Larry: "What if the date added is
      // quietly after the TASK Eyebrow?") -- rides on the Task label
      // itself now instead of its own "Dates" block; deliberately NOT
      // styled like the other uppercase eyebrow labels (this is the
      // opposite -- quiet, small, cursive, same voice as every other
      // "Added"/date stamp elsewhere on the card).
      +'.bb-added-quiet{text-transform:none;letter-spacing:0;font-weight:400;font-family:"Caveat",cursive;font-size:calc(14px * var(--fg-text-scale,1));color:var(--bb-sub);margin-left:8px}'
      +'.bb-inline-field{display:flex;align-items:baseline;justify-content:flex-start;gap:6px;white-space:nowrap}'
      +'.bb-inline-field label{display:inline;margin:0}'
      +'.bb-inline-field span{font-family:"Caveat",cursive;font-size:calc(16px * var(--fg-text-scale,1));color:var(--bb-sub)}'
      +'.bb-field input,.bb-field textarea,.bb-field select{width:100%;font-family:var(--bb-body-font);font-size:calc(14px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:7px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:calc(16px * var(--fg-text-scale,1));resize:vertical}'
      +'#bb-d-task{font-family:var(--bb-body-font);font-style:normal;font-size:calc(14px * var(--fg-text-scale,1));color:#000}'
      +'#bb-d-notes{font-family:var(--bb-body-font)!important;font-style:normal;font-size:calc(14px * var(--fg-text-scale,1))!important;min-height:44px;overflow:hidden;resize:none;transition:height .1s}'
      +'#bb-new-task{font-family:var(--bb-body-font)!important;font-style:normal;font-size:calc(15px * var(--fg-text-scale,1))!important}'
      +'.bb-flags,.bb-priorities,.bb-swatches{display:flex;gap:4px}'
      +'.bb-flag-btn,.bb-pri-btn,.bb-font-btn,.bb-shape-btn{flex:1;font-size:calc(11px * var(--fg-text-scale,1));padding:6px 2px;border-radius:4px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font);display:flex;align-items:center;justify-content:center}'
      +'.bb-shape-btn.bb-shape-active{background:var(--bb-bg);border-color:var(--bb-ink)}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}'
      +'#bb-d-verify.bb-flag-active{background:#3F6B3A;border-color:#3F6B3A}'
      +'#bb-d-pro.bb-flag-active{background:#c9a230;border-color:#c9a230}'
      +'#bb-d-grow.bb-flag-active{background:#4a7a95;border-color:#4a7a95}'
      +'.bb-font-btn.bb-flag-active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-theme-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.15)}'
      +'.bb-theme-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-settings-tabs{display:flex;gap:4px;width:100%;max-width:280px;margin:0 auto 10px}'
      +'.bb-settings-tab{flex:1;font-size:calc(11px * var(--fg-text-scale,1));padding:7px 3px;border-radius:6px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font)}'
      +'.bb-settings-tab.active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-settings-pane{display:flex;flex-direction:column;align-items:center;width:100%}'
      +'.bb-key-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-start}'
      +'.bb-key-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      +'.bb-key-add{font-size:calc(16px * var(--fg-text-scale,1));color:var(--bb-sub);border-style:dashed}'
      +'.bb-key-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      +'.bb-key-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-pick-row-wrap{display:flex;align-items:center;gap:6px;margin-bottom:6px}'
      +'.bb-key-pick-row{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:8px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;cursor:pointer;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink);text-align:left}'
      +'.bb-key-pick-meaning{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.bb-key-pick-edit{background:none;border:none;cursor:pointer;font-size:calc(14px * var(--fg-text-scale,1));color:#4a7a95;flex-shrink:0;padding:0 4px}'
      +'.bb-key-pick-swatch{width:16px;height:16px;flex-shrink:0}'
      +'.bb-key-pick-disabled{opacity:.35;pointer-events:none}'
      +'.bb-key-pick-empty-msg{font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic;text-align:center;padding:6px 0}'
      +'.bb-checklist-row{display:flex;align-items:center;gap:6px;padding:3px 0;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-checklist-row .bb-checklist-check{flex:0 0 auto;width:14px;height:14px;margin:0;padding:0}'
      +'.bb-checklist-text{flex:1}'
      +'.bb-checklist-text.bb-checklist-done{text-decoration:line-through;color:var(--bb-sub)}'
      +'.bb-checklist-remove{background:none;border:none;color:var(--bb-sub);cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1));padding:0 4px}'
      +'.bb-checklist-add-row{display:flex;gap:6px;margin-top:4px}'
      +'.bb-checklist-add-row input{flex:1;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink)}'
      +'.bb-links-empty{font-size:calc(12px * var(--fg-text-scale,1));font-style:italic;color:var(--bb-sub);padding:2px 0}'
      // Signal Flags manager (9397), Aug 3 2026 -- same row shape as
      // Linked Items/Checklist just above, pencil then trash per row.
      +'.bb-keylib-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink);border-bottom:1px solid rgba(201,168,124,.35)}'
      +'.bb-keylib-row:last-child{border-bottom:none}'
      +'.bb-keylib-swatch{display:inline-block;width:16px;height:16px;flex-shrink:0}'
      +'.bb-keylib-meaning{flex:1}'
      +'.bb-keylib-edit,.bb-keylib-del{background:none;border:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));padding:0 4px}'
      +'.bb-keylib-edit{color:#4a7a95}'
      +'.bb-keylib-del{color:#a3372b}'
      +'.bb-archive-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--bb-accent)}'
      +'.bb-archive-task{font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-archive-meta{font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub)}'
      +'.bb-card-foreign{border-style:dashed;opacity:0.92}'
      /* Overdue pink-face, Aug 15 2026, Larry: "pink faced card" for
         anything whose due date has passed (see _bbIsOverdue -- Done
         and Hang-Ups are excluded, they already have their own
         meaning). Steady pink border+background applies every render;
         bb-overdue-flash is added only on the render where a card is
         first discovered overdue, playing a brief alarm-flash before
         settling into the steady state above. animation has no
         fill-mode, so it always relaxes back to the plain .bb-overdue
         look once the 3 pulses finish -- no forced timeout needed. */
      +'.bb-card.bb-overdue{border-color:#c2255c;background:#FDE7EF}'
      +'.bb-card.bb-overdue .bb-task{color:#8a1a44}'
      +'@keyframes bb-overdue-alarm{0%,100%{background:#FDE7EF;box-shadow:none}50%{background:#f48fb1;box-shadow:0 0 10px rgba(194,37,92,0.7)}}'
      +'.bb-card.bb-overdue-flash{animation:bb-overdue-alarm 0.5s ease-in-out 3}'
      +'@media (prefers-reduced-motion: reduce){.bb-card.bb-overdue-flash{animation:none}}'
      +'.bb-foreign-row{margin:1px 0 3px}'
      +'.bb-foreign-badge{display:inline-block;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.3px;text-transform:uppercase;padding:1px 6px;border-radius:8px;background:rgba(59,37,16,.08);color:var(--bb-sub)}'
      /* Overlay chrome for Add a Card (9360) / the Briefing Card (9370) /
         Board Settings, July 20, 2026 -- same "fixed, dimmed backdrop,
         click-outside-closes" pattern as idea-storyboard-9710.js's
         .sb-overlay. Lives at #fg-root level (see
         injectBriefingBoardScreens), not inside #s-briefing-board, for
         the same reason 9710's overlays live at fg-root: a display:none
         ancestor (the board when it's not the active screen) would hide
         a position:fixed child too. Card is pinned to 340px -- just past
         the 280px field frame -- and tall rather than wide, scrolling
         internally if content runs long. */
      +'.bb-overlay{position:fixed;inset:0;z-index:200;background:rgba(59,37,16,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
      +'.bb-overlay.active{display:flex}'
      +'.bb-overlay-card{width:340px;max-width:90vw;max-height:min(640px,90vh);overflow-y:auto;background:#FFFDF7;border-radius:8px;border-top:6px solid var(--bb-accent);box-shadow:0 10px 30px rgba(59,37,16,0.35);box-sizing:border-box;padding:18px 22px 22px}'
      +'.bb-overlay-card.bb-hangup-active{border-top-color:#a3372b;background:#FFF4F2}'
      +'.bb-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;cursor:grab;user-select:none}'
      +'.bb-overlay-title{font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-overlay-card.bb-hangup-active .bb-overlay-title{color:#a3372b}'
      +'.bb-overlay-card.bb-overdue-active{border-top-color:#c2255c;background:#FDE7EF}'
      +'.bb-overlay-card.bb-overdue-active .bb-overlay-title{color:#c2255c}'
      +'.bb-close{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.tm-groupname{font-family:var(--bb-head-font);font-size:calc(16px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-ink);text-align:center;border:none;border-bottom:1px dashed var(--bb-accent);background:transparent;width:90%;padding:2px 0;display:block;margin:0 auto 2px}'
      +'.tm-cap{text-align:center;font-size:calc(10px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:10px}'
      +'.tm-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(59,37,16,0.12)}'
      +'.tm-sym{width:22px;text-align:center;font-size:calc(15px * var(--fg-text-scale,1));padding-top:1px;flex-shrink:0}'
      +'.tm-sym.tm-clickable{cursor:pointer}'
      +'.tm-body{flex:1;min-width:0}'
      +'.tm-name{font-size:calc(13px * var(--fg-text-scale,1));font-weight:600;color:var(--bb-ink)}'
      +'.tm-role{font-weight:400;color:var(--bb-sub);font-size:calc(11px * var(--fg-text-scale,1))}'
      +'.tm-contact{font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;line-height:1.25;margin-top:1px}'
      +'.tm-notes-row{display:flex;align-items:baseline;gap:5px;line-height:1.25;margin-top:1px}'
      +'.tm-notes-lbl{font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:1px;color:var(--bb-sub);flex-shrink:0}'
      +'.tm-notes-input{flex:1;border:none;border-bottom:1px dashed var(--bb-accent);background:transparent;font-size:calc(10px * var(--fg-text-scale,1));color:var(--bb-sub);padding:0;font-family:var(--bb-body-font)}'
      +'.tm-rolepanel{margin:6px 0 0 32px;background:#fff;border:1px solid var(--bb-accent);border-radius:8px;padding:8px 10px}'
      +'.tm-rolepanel label{display:flex;align-items:center;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);margin-bottom:5px;cursor:pointer}'
      +'.tm-rolepanel label:last-child{margin-bottom:0}'
      +'.tm-addrow{display:flex;align-items:center;justify-content:space-between;margin-top:10px}'
      +'.tm-add-tile{width:26px;height:26px;border-radius:50%;border:1.5px dashed var(--bb-accent);color:var(--bb-sub);font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer}'
      +'.tm-print-tile{width:26px;height:26px;border-radius:50%;border:1px solid var(--bb-accent);background:#fff;color:var(--bb-sub);font-size:calc(12px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;cursor:pointer}'
      +'.tm-add-wrap{position:relative;flex:1;min-width:0}'
      +'.tm-add-suggest{position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid var(--bb-accent);border-radius:8px;box-shadow:0 6px 16px rgba(59,37,16,0.18);max-height:160px;overflow-y:auto;overflow-x:hidden;z-index:5;box-sizing:border-box}'
      +'.tm-add-suggest-row{padding:6px 10px;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-ink);cursor:pointer;box-sizing:border-box}'
      +'.tm-add-suggest-row:hover{background:var(--bb-bg)}'
      +'.tm-add-suggest-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tm-add-suggest-email{color:var(--bb-sub);font-size:calc(11px * var(--fg-text-scale,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tm-add-suggest-empty{padding:6px 10px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic}'
      +'@media print{body *{visibility:hidden}.bb-team-print,.bb-team-print *{visibility:visible}.bb-team-print{position:absolute;left:0;top:0;width:100%!important;max-height:none!important;box-shadow:none!important}@page{size:landscape}}'
      +'.bb-close:hover{background:var(--bb-bg)}'
      +'.bb-hx-back{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:calc(14px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-hx-back:hover{background:var(--bb-bg)}'
      // .bb-routine-toggle button rules dropped, Aug 27 2026 -- the
      // header button they styled is gone (see the overlay-head
      // comment above); .bb-routine-active stays, it still tints the
      // whole card when c.routine is true regardless of how it got set.
      +'.bb-overlay-card.bb-routine-active{border-top-color:#4a7a95}'
      +'.bb-date-row{display:flex;gap:6px;align-items:stretch}'
      +'.bb-date-row input[type=text]{flex:1.4;min-width:0}'
      +'.bb-date-row input.bb-date-time{width:60px;flex:none;min-width:0}'
      +'.bb-date-row select.bb-routine-select{flex:none;width:92px;font-family:var(--bb-body-font);font-size:calc(12px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 4px;background:#fff;color:var(--bb-ink)}'
      +'.bb-datepicker-pop{position:fixed;z-index:10001;width:220px;background:#fff;border:1.5px solid var(--bb-accent);border-radius:8px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);font-family:var(--bb-body-font)}'
      +'.bb-dp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}'
      +'.bb-dp-label{font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-ink)}'
      +'.bb-dp-nav{background:none;border:none;font-size:calc(16px * var(--fg-text-scale,1));line-height:1;cursor:pointer;color:var(--bb-ink);padding:0 6px}'
      +'.bb-dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}'
      +'.bb-dp-dow{font-size:calc(9px * var(--fg-text-scale,1));text-align:center;color:var(--bb-sub);font-weight:700;padding:2px 0}'
      +'.bb-dp-day{background:none;border:none;font-size:calc(12px * var(--fg-text-scale,1));padding:5px 0;text-align:center;cursor:pointer;border-radius:4px;color:var(--bb-ink)}'
      +'.bb-dp-day:hover{background:var(--bb-bg)}'
      +'.bb-dp-day.bb-dp-blank{cursor:default}'
      +'.bb-dp-day.bb-dp-blank:hover{background:none}'
      +'.bb-dp-day.bb-dp-today{border:1.5px solid var(--bb-accent);font-weight:700}'
      +'.bb-dp-day.bb-dp-selected{background:var(--bb-accent);color:#fff}'
      +'.bb-routine-custom{margin-top:6px;width:100%;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-routine-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1}'
      +'.bb-lock-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:default}'
      // pointer-events:auto here, Aug 11 2026 -- same fix as
      // .bb-key-badge-wrap: the wrapping .bb-key-badges container it
      // now lives inside stays click-through (never steals a card
      // drag), but this badge needs its own pointer events back or its
      // "Has notes" hover tooltip goes silent.
      +'.bb-notes-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:default}'
      // Video/Link flag, Aug 11 2026 (Larry: "make link usable, move
      // link flag to lower left corner") -- joins Notes in the
      // bottom-left signal-flags row instead of the top badge row, and
      // is a real link now (was a plain inert marker): opens the
      // attached URL in a new tab. draggable=false on the element
      // itself (see markup below) keeps a native link-drag from
      // hijacking the card's own drag-to-move gesture.
      +'.bb-link-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:pointer;text-decoration:none;color:inherit}'
      +'.bb-link-row{display:flex;gap:6px}'
      +'.bb-link-row input{flex:1;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink)}'
      +'.bb-link-preview{margin-top:6px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);text-align:center;font-style:italic}'
      +'.bb-link-preview img{max-width:100%;max-height:100px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain}'
      +'.bb-team-row{display:flex;gap:6px;align-items:center;padding:4px 0}'
      +'.bb-team-row input.bb-team-name{flex:1.6;min-width:0}'
      +'.bb-team-row input.bb-team-initials{width:50px;flex:none;text-transform:uppercase}'
      +'.bb-hx-landing-btn{margin-bottom:12px}';
    document.head.appendChild(style);
  }

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
              +'<div class="bb-mh-fieldgrp"><button type="button" class="bb-mh-eyebrow bb-cdrop-trigger" id="bb-type-trigger" title="Click to change category (Client, Department, Partner...)"></button><div class="bb-cdrop-menu" id="bb-type-menu" hidden></div><button type="button" class="bb-hdr-select bb-cdrop-trigger" id="bb-org-name-trigger" title="Click to set a name, e.g. Accounting or Denver Broncos"></button><div class="bb-cdrop-menu" id="bb-org-name-menu" hidden></div></div>'
              +'<div class="bb-mh-fieldgrp"><div class="bb-mh-eyebrow">Project</div><div class="bb-cdrop" id="bb-board-cdrop"><button type="button" class="bb-hdr-select bb-cdrop-trigger" id="bb-board-trigger" title="Double-click to rename; click to switch boards"></button><div class="bb-cdrop-menu" id="bb-board-menu" hidden></div></div></div>'
              +'<div class="bb-mh-fieldgrp bb-mh-filtergrp" id="bb-source-fieldgrp"><div class="bb-mh-eyebrow" id="bb-source-eyebrow">View</div><div class="bb-cdrop" id="bb-view-cdrop"><button type="button" class="bb-hdr-select bb-cdrop-trigger" id="bb-view-trigger" title="Filter by person assigned">Team</button><div class="bb-cdrop-menu" id="bb-view-menu" hidden></div></div></div>'
            +'</div>'
            +'<div class="bb-mh-group-center"><span class="bb-mh">Briefing Board</span><div class="bb-mt">A control and communication tool.</div></div>'
            +'<div class="bb-mhead-actions">'
              +'<button class="bb-icon-btn" id="bb-reset" title="Reload and return here (Alt+C)">🔄</button>'
              +'<button class="bb-icon-btn" id="b-bb-mg" title="Jump to menu">🔍</button>'
              +'<button class="bb-icon-btn" id="bb-hx-btn" title="History">HX</button>'
              +'<button class="bb-icon-btn" id="bb-relations-btn" title="Relationships">🔗</button>'
              +'<button class="bb-icon-btn" id="bb-gear" title="Colors &amp; fonts">⚙️</button>'
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
            +'<div class="bb-field bb-addition" id="bb-d-add-checklist-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-checklist">Checklist</label><div class="bb-addition-body" id="bb-d-checklist-body" style="display:none"><div id="bb-d-checklist-list"></div><div class="bb-checklist-add-row"><input id="bb-d-checklist-new" type="text" placeholder="Add steps..."><button class="bb-icon-btn bb-icon-btn-add" id="bb-d-checklist-add-btn" title="Add step">+</button></div></div></div>'
            +'<div class="bb-field" id="bb-d-shared-wrap" style="display:none"><label>Also show on</label><select id="bb-d-shared-board"><option value="">Just here</option></select></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-routine-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-routine">Routine</label><div class="bb-addition-body" id="bb-d-routine-body" style="display:none">'
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
            +'<div class="bb-field bb-addition" id="bb-d-add-start-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-start">Start Date</label><div class="bb-addition-body" id="bb-d-start-body" style="display:none">'
              +'<div class="bb-date-row"><input id="bb-d-start" type="text" placeholder="Start MM/DD/YYYY"><input id="bb-d-start-time" type="text" class="bb-date-time" placeholder="Time"><button class="bb-icon-btn" id="bb-d-start-cal" type="button" title="Pick a date">\uD83D\uDCC5</button></div>'
            +'</div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-due-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-due">Due Date</label><div class="bb-addition-body" id="bb-d-due-body" style="display:none">'
              +'<div class="bb-date-row"><input id="bb-d-due" type="text" placeholder="Due MM/DD/YYYY"><input id="bb-d-due-time" type="text" class="bb-date-time" placeholder="Time"><button class="bb-icon-btn" id="bb-d-due-cal" type="button" title="Pick a date">\uD83D\uDCC5</button></div>'
            +'</div></div>'
            // Budget label simplified, Aug 27 2026 (Larry: "Drop TIME or
            // DOLLARS from BUDGET").
            +'<div class="bb-field bb-addition" id="bb-d-add-budget-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-budget">Budget</label><div class="bb-addition-body" id="bb-d-budget-body" style="display:none"><input id="bb-d-budget" type="text"></div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-notes-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-notes">Notes</label><div class="bb-addition-body" id="bb-d-notes-body" style="display:none"><textarea id="bb-d-notes" placeholder="Notes, comments, questions..."></textarea></div></div>'
            +'<div class="bb-field bb-addition" id="bb-d-add-links-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-links">Links</label><div class="bb-addition-body" id="bb-d-links-body" style="display:none"><div class="bb-link-row"><input id="bb-d-link-url" type="text" placeholder="Paste a YouTube, Vimeo, or other link\u2026"><button class="bb-icon-btn" id="bb-d-link-clear" type="button" title="Remove">\u2715</button></div><div id="bb-d-link-preview" class="bb-link-preview" style="display:none"></div></div></div>'
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
            +'<div class="bb-field bb-addition" id="bb-d-add-related-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-related">Related Storyboards</label><div class="bb-addition-body" id="bb-d-related-body" style="display:none">'
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
            +'<div class="bb-field bb-addition" id="bb-d-add-flags-wrap"><label class="bb-addition-label"><input type="checkbox" id="bb-d-add-flags">Signal Flags</label><div class="bb-addition-body" id="bb-d-flags-body" style="display:none"><div class="bb-key-row" id="bb-d-key-row"></div></div></div>'
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
              +'<button class="bb-icon-btn" id="bb-d-gear" type="button" title="Utilities">⚙️</button>'
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

  function renderBoard(){
    var wrap=document.getElementById('bb-cols'); if(!wrap) return;
    wrap.innerHTML='';
    var _keyLib=_bbLoadKeyLibrary();
    _bbAutoEscalateDates();
    var cards=_bbCardsList().filter(function(c){ return !c.archived && !c.trashedAt; });
    if(_bbForeignCards && _bbForeignCards.length) cards = cards.concat(_bbForeignCards.filter(function(c){ return !c.archived && !c.trashedAt; }));
    if(_bbSharedInCards && _bbSharedInCards.length) cards = cards.concat(_bbSharedInCards.filter(function(c){ return !c.archived && !c.trashedAt; }));
    cards = _bbSourceFilterCards(cards);
    // Primary-doer warm-up, Session 234 (Aug 21) -- same fire-and-forget
    // fetch-then-conditional-re-render pattern session.js already uses
    // for the Idea Board (T2TStoryboard.ensureCardPrimary), generalized
    // here via ensureCardPrimaryRaw for card_type:'briefing_card'. Feeds
    // both the corner badge (dotHTML below) and _bbSourceFilterCards's
    // person-mode match.
    if(window.T2TStoryboard && T2TStoryboard.ensureCardPrimaryRaw){
      var _bbPrimaryIds=cards.map(function(c){ return c.id; }).filter(Boolean);
      T2TStoryboard.ensureCardPrimaryRaw('briefing_card', _bbPrimaryIds).then(function(fetchedSomething){ if(fetchedSomething) renderBoard(); });
    }
    COLUMNS.forEach(function(cd){
      var col=document.createElement('div');
      col.className='bb-col';
      col.setAttribute('data-col', cd.key);
      col.innerHTML='<div class="bb-col-head">'+cd.label+'</div>'
        +'<div class="bb-col-cards" data-col="'+cd.key+'"></div>'
        +(cd.key==='new' ? '<div class="bb-add-tile" id="bb-add-tile">+ new card</div>' : '');
      wrap.appendChild(col);
    });
    // July 22, 2026 (later), Larry: wants to freely drag a card to a
    // new position WITHIN a column, not just between columns. Position
    // is now c.sortOrder (manual, set by dragging -- see the drop
    // handler below), primary sort key. Priority/due-date rank is only
    // the fallback for a card that doesn't have a sortOrder yet (brand
    // new, or not yet migrated) -- it no longer governs position for
    // anything that's actually been placed. Which Do column a card is
    // IN is still priority-driven (see _bbDoColKey); this only affects
    // order WITHIN whichever column it's already in.
    COLUMNS.forEach(function(cd){
      var target=wrap.querySelector('.bb-col-cards[data-col="'+cd.key+'"]');
      if(!target) return;
      var colCards=cards.filter(function(c){ return c.col===cd.key; });
      colCards.sort(function(a,b){
        var soa=(typeof a.sortOrder==='number')?a.sortOrder:Infinity;
        var sob=(typeof b.sortOrder==='number')?b.sortOrder:Infinity;
        if(soa!==sob) return soa-sob;
        var ra=_priRank(a), rb=_priRank(b);
        if(ra!==rb) return ra-rb;
        return _bbDaysUntilOrInf(a)-_bbDaysUntilOrInf(b);
      });
      colCards.forEach(function(c){
        var el=document.createElement('div');
        // Overdue pink-face, Aug 15 2026 -- bb-overdue is the steady
        // state (recomputed fresh every render, so it's always right
        // even for a card nobody's touched since it went overdue);
        // bb-overdue-flash only lands on whichever cards
        // _bbAutoEscalateDates just discovered are newly overdue THIS
        // pass, so the alarm-flash animation plays once, not every
        // reload.
        // Aug 27 2026 -- a missed Start Date reads as the same pink
        // signal as a missed Due Date; see _bbIsStartOverdue above.
        var cardIsOverdue=_bbIsOverdue(c)||_bbIsStartOverdue(c);
        var cardJustWentOverdue=_bbOverdueFlashIds.indexOf(c.id)!==-1;
        el.className='bb-card'+(c._foreign?' bb-card-foreign':'')
          +(cardIsOverdue?' bb-overdue':'')+(cardJustWentOverdue?' bb-overdue-flash':'');
        el.draggable=true;
        el.setAttribute('data-id', c.id);
        if(c.color) el.style.background=c.color;
        // Corner badge, Session 234 (Aug 21) -- 👥's ★ primary doer is
        // now the first source (same as the Idea Card's own badge),
        // falling back to the legacy person text field for any card
        // nobody's starred yet. cardPrimaryUidRaw returns undefined
        // before this pass's ensureCardPrimaryRaw fetch lands (falls
        // back same as "nobody starred" until then -- next re-render
        // fills it in), null once fetched with nobody starred, or a uid.
        var _bbPrimaryUid = (window.T2TStoryboard && T2TStoryboard.cardPrimaryUidRaw) ? T2TStoryboard.cardPrimaryUidRaw('briefing_card', c.id) : undefined;
        var _bbPrimaryInfo = (_bbPrimaryUid && window.T2TStoryboard && T2TStoryboard.memberInfo) ? T2TStoryboard.memberInfo(_bbPrimaryUid) : null;
        var dotHTML = _bbPrimaryInfo
          ? ('<span class="bb-dot" style="background:#9c8b73" title="'+_esc(_bbPrimaryInfo.name||'')+'">'+_esc(_bbPrimaryInfo.initials||'')+'</span>')
          : (c.person ? ('<span class="bb-dot" style="background:#9c8b73" title="'+_esc(c.person)+'">'+_esc(_bbInitials(c.person))+'</span>') : '');
        var foreignBadge = c._foreign ? ('<span class="bb-foreign-badge" title="From '+_esc(c._homeBoardName)+' — open it there to edit. Priority here is independent; moving it into or out of Doing/Done/Hang-Ups updates both boards.">'+_esc(c._homeBoardName)+'</span>') : '';
        var priBadge = c.priority ? '<span class="bb-pri-badge" style="background:'+PRI_COLOR[c.priority]+';color:'+PRI_TEXT[c.priority]+'">'+c.priority+'</span>' : '';
        var routineBadge = c.routine ? '<span class="bb-routine-badge" title="Routine card">🔄</span>' : '';
        // Lock badge moved into the bottom-left signal cluster, Aug 15
        // 2026 (Larry: "is the LOCK not just another FLAG?") -- was up
        // top with priority/routine/date; now reads as one more signal
        // alongside Signal Flags/Notes/Link, same corner every time.
        var lockBadge = c.locked ? '<span class="bb-lock-badge" title="Locked — parked here, paused before its turn. Was in progress; worth asking why.">🔒</span>' : '';
        // Notes badge moved into the bottom-left corner alongside the
        // Signal Flags, Aug 11 2026 (Larry: move it down "with other
        // signal flags") -- was up top with the other card badges;
        // now renders inside .bb-key-badges below instead, so every
        // per-card "signal" lives in the same corner.
        var notesBadge = (c.notes && c.notes.trim()) ? '<span class="bb-notes-badge" title="Has notes">✏️</span>' : '';
        var linkBadge = (c.linkUrl && c.linkUrl.trim()) ? '<a class="bb-link-badge" href="'+_esc(c.linkUrl)+'" target="_blank" rel="noopener" draggable="false" title="Open link">🎬</a>' : '';
        // Larry, July 20, 2026: no date shown at all until a START DATE
        // exists (manually set in advance, or auto-stamped the moment
        // this card first moves into Doing) -- the quieter "date added
        // to the board" (c.assigned) is still recorded for later, just
        // not displayed here; not important enough to take up card-face
        // space, though it does show read-only on the back of the card.
        var startBadge = c.startDate ? '<span class="bb-date">'+_esc(c.startDate)+'</span>' : '';
        // Signal Flags row, bottom-left corner -- Notes badge joined
        // this group Aug 11 2026 (Larry: move it down "with other
        // signal flags") instead of sitting up top with the rest of
        // the badges, so the pencil-if-there-are-Notes marker and the
        // card's actual Signal Flags read together as one cluster.
        var keyBadgesHTML = (c.keys && c.keys.some(function(k){ return k; })) ? c.keys.filter(function(kid){ return kid; }).map(function(kid){
              var k=_keyLib.filter(function(x){ return x.id===kid; })[0];
              if(!k) return '';
              // Link count removed from the card front, Aug 15 2026
              // (Larry: "delete number of like flags from front of
              // every type of card") -- the count still comes through
              // on hover, via the title tooltip below; only the visible
              // on-face number is gone. A key's count is exactly how
              // many other cards/ideas currently share that same key
              // (that's what auto-linking connects), read straight from
              // _bbKeyLinkCountCache rather than the card-wide total
              // badge, which lumps every key together.
              var lc=(_bbKeyLinkCountCache[c.id] && _bbKeyLinkCountCache[c.id][kid]) || 0;
              return '<span class="bb-key-badge-wrap" title="'+_esc(k.meaning||'')+(lc?' — '+lc+' linked via this flag':'')+'">'
                +'<span class="bb-key-badge" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
                +'</span>';
            }).join('') : '';
        // TOPIC eyebrow, Aug 11 2026 (Larry) -- header-linked task cards
        // (c.topicLabel set by the DB trigger, see _bbRowToCard) show which
        // TOPIC they came from right above the task line, same small-caps
        // treatment as the board-header eyebrows elsewhere on this screen.
        // Skip it when it would just repeat the task line verbatim (Aug 16
        // 2026 -- Larry found a card reading its own name twice, once in
        // the eyebrow and once as the task, after the task line had been
        // hand-edited to drop its usual "Develop " prefix) -- the eyebrow
        // only earns its place on the card when it's telling you something
        // the task line doesn't already say.
        var topicEyebrowText = (c.topicLabel||'').trim();
        var topicEyebrow = (topicEyebrowText && topicEyebrowText.toLowerCase()!==String(c.task||'').trim().toLowerCase())
          ? ('<div class="bb-card-eyebrow">'+_esc(c.topicLabel)+'</div>') : '';
        el.innerHTML='<div class="bb-top"><span class="bb-top-left">'+routineBadge+priBadge+startBadge+'</span>'+dotHTML+'</div>'
          +(foreignBadge ? ('<div class="bb-foreign-row">'+foreignBadge+'</div>') : '')
          +topicEyebrow
          +'<div class="bb-task">'+_esc(c.task)+'</div>'
          +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+(c.due?('DUE: '+_esc(c.due)):'')+'</span></div>'
          +(c.col==='done' && c.completedDate ? ('<div class="bb-done-date">COMPLETED: '+_esc(c.completedDate)+'</div>') : '')
          +((lockBadge || notesBadge || linkBadge || keyBadgesHTML) ? ('<div class="bb-key-badges">'+lockBadge+keyBadgesHTML+notesBadge+linkBadge+'</div>') : '')
          +'<div class="bb-corner" data-flip="'+c.id+'" title="Flip card"></div>';
        el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
        // Double-click also opens the card, Aug 11 2026 (Larry) -- same
        // openCardDetail the corner-flip triangle already calls, just a
        // second, faster way in (matches the subber-card double-click
        // added to the Idea Storyboard this same session). Corner-flip
        // stays as-is; this doesn't replace it.
        el.addEventListener('dblclick', function(e){ e.stopPropagation(); openCardDetail(c.id); });
        target.appendChild(el);
      });
    });
    wrap.querySelectorAll('.bb-corner').forEach(function(el){
      el.addEventListener('click', function(e){
        e.stopPropagation();
        openCardDetail(el.getAttribute('data-flip'));
      });
    });
    // July 22, 2026, Larry: dragging a card should be able to land it at
    // a specific spot within a column, not just change which column it's
    // in. Standard "closest sibling by vertical midpoint" technique --
    // compares the drop's Y position against each existing card's
    // midpoint to find which one it belongs before (null = belongs at
    // the end, after everything).
    function _bbCardBefore(zone, y, excludeId){
      var els=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
        .filter(function(el){ return el.getAttribute('data-id')!==excludeId; });
      var closest={offset:-Infinity, el:null};
      els.forEach(function(el){
        var box=el.getBoundingClientRect();
        var offset=y-box.top-box.height/2;
        if(offset<0 && offset>closest.offset) closest={offset:offset, el:el};
      });
      return closest.el;
    }
    wrap.querySelectorAll('.bb-col-cards').forEach(function(zone){
      zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('bb-dragover'); });
      zone.addEventListener('dragleave', function(){ zone.classList.remove('bb-dragover'); });
      zone.addEventListener('drop', function(e){
        e.preventDefault();
        zone.classList.remove('bb-dragover');
        var id=e.dataTransfer.getData('text/plain');
        var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
        if(!c){
          var fc=_bbForeignCards.filter(function(x){ return x.id===id; })[0];
          if(fc){ _bbHandlePersonalBoardDrop(zone, e, id); return; }
          var sc=_bbSharedInCards.filter(function(x){ return x.id===id; })[0];
          if(sc){ _bbHandleSharedInDrop(zone, e, id); return; }
          return;
        }
        if(c){
          var wasCol=c.col;
          var _bbMoveBefore=_bbSnapshotCard(c);
          c.col=zone.getAttribute('data-col');
          // July 22, 2026: dropping a card into one of the 3 Do columns
          // sets its priority to match (coarse -- H DO/M DO/L DO), same
          // as the H/M/L buttons but reachable by drag now too. Doesn't
          // touch priority when dragging into Doing/Done/Hang-Ups --
          // only the 3 Do columns are priority-linked.
          if(_bbIsDoCol(c.col)) c.priority=_bbPriorityForDrop(c.col, c.priority);
          // Start Date addition, Aug 27 2026 -- auto-stamping it (below,
          // pre-existing) is pointless if the checkbox that shows it
          // stays unchecked, so open it here too.
          if(c.col==='doing' && _bbIsDoCol(wasCol) && !c.startDate){ c.startDate=_bbToday(); c.addStart=true; }
          if(c.col==='done' && wasCol!=='done') c.completedDate=_bbToday();
          if(wasCol==='done' && c.col!=='done'){ c.completedDate=''; c.verified=false; c.pro=false; c.grow=false; }
          // Hang-Ups, July 21, 2026: stamp when a card lands here, clear
          // when it leaves -- the stamp tracks the *current* stuck streak.
          // Situation and the linked storyboard Header are left alone on
          // exit (that record stays even after it's unstuck).
          if(c.col==='hangups' && wasCol!=='hangups') c.hangupSince=_bbToday();
          if(wasCol==='hangups' && c.col!=='hangups') c.hangupSince='';
          // Land it at the exact drop position, then renumber this
          // column's sortOrder sequentially so everyone's position is
          // consistent (avoids float-precision drift from repeated
          // between-two-numbers interpolation over many reorders).
          var beforeEl=_bbCardBefore(zone, e.clientY, id);
          var order=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
            .map(function(el){ return el.getAttribute('data-id'); })
            .filter(function(cid){ return cid!==id; });
          var insertAt=beforeEl ? order.indexOf(beforeEl.getAttribute('data-id')) : order.length;
          // The card it's landing directly above -- i.e. the one it
          // displaces downward. Captured before the splice below so it
          // still reflects the pre-drop layout. Null when dropped at
          // the very bottom (nothing to land above).
          var neighborAfterId=beforeEl ? beforeEl.getAttribute('data-id') : null;
          order.splice(insertAt, 0, id);
          var allCards=_bbCardsList();
          order.forEach(function(cid, idx){
            var cc=allCards.filter(function(x){ return x.id===cid; })[0];
            if(cc) cc.sortOrder=idx;
          });
          // July 23, 2026, Larry: landing a card at the very top or
          // bottom of one of the 3 Do columns (H/M/L) further escalates
          // or de-escalates its priority within that column's family --
          // on top of the coarse family already set by _bbPriorityForDrop
          // above. Top always pushes toward the family's most urgent
          // value (H->HH, M->MH, L->ML); bottom pushes toward its least
          // urgent (H->H, M->M, L->L). Each family's top value has
          // nothing further to escalate to, so top just stays there;
          // same for each family's bottom value. A single-card column
          // counts as "top" (escalate wins the tie), not bottom.
          // Aug 6, 2026, Larry: landing in the middle used to leave the
          // card's priority alone -- now it matches whatever it's
          // physically dropped among instead, same escalate/de-escalate
          // as top and bottom ("HH moved between H's becomes H," same
          // for MH/M and ML/L). _bbResortDoColumnByPriority (called just
          // below) always keeps each family's cards grouped into two
          // contiguous blocks -- escalated on top, base on the bottom --
          // so landing directly above a given card means landing in
          // that card's block; reading its priority is enough to know
          // which block that is. Top/bottom still force the outright
          // escalated/base value regardless of neighbors (unchanged),
          // so dragging to the bottom of an all-HH column still lands
          // on plain H even though every neighbor is HH.
          if(_bbIsDoCol(c.col) && c.col!=='new' && order.length>0){
            var famKey=c.col.slice(3); // 'h' | 'm' | 'l'
            var isTop=(insertAt===0);
            var isBottom=(!isTop && insertAt===order.length-1);
            var famEscalated={h:'HH', m:'MH', l:'ML'}[famKey];
            var famBase={h:'H', m:'M', l:'L'}[famKey];
            if(isTop){
              c.priority=famEscalated;
            } else if(isBottom){
              c.priority=famBase;
            } else if(neighborAfterId){
              var neighborCard=allCards.filter(function(x){ return x.id===neighborAfterId; })[0];
              if(neighborCard && (neighborCard.priority===famEscalated || neighborCard.priority===famBase)){
                c.priority=neighborCard.priority;
              }
            }
          }
          if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
          _bbStampDateEscalationHandled(c);
          _bbSaveLocal(_bbCardsList());
          _bbLogCardMove(c, _bbMoveBefore);
        }
        renderBoard();
      });
    });
    var addTile=document.getElementById('bb-add-tile');
    if(addTile) addTile.addEventListener('click', openAddCard);
    _bbFitTaskText();
  }

  // Shrink-to-fit for card task text -- Aug 18 2026, Larry: "can we
  // shrink text size when necessary to prevent splitting words on all
  // boards?" Runs after every renderBoard() (and after a text-size-boost
  // change) so each card's task line checks its OWN real, laid-out
  // width and shrinks its font just enough that its longest word still
  // fits, before ever falling back to .bb-task's word-break:break-word.
  // Resets to the natural CSS size first so this is safe to call
  // repeatedly (e.g. after the text-size boost changes) without ratcheting
  // a card smaller and smaller across repeated calls.
  function _bbFitTaskText(){
    var els=document.querySelectorAll('.bb-card .bb-task');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      el.style.fontSize='';
      var w=el.clientWidth;
      if(!w) continue;
      var cs=getComputedStyle(el);
      var baseSize=parseFloat(cs.fontSize)||14;
      // Floor lowered Aug 21 2026, same SOP as the storyboard's card text --
      // a long word (e.g. "Appreciation") shrinking further is better than
      // it wrapping/splitting, so the floor here is no longer 9px/60%.
      var fitted=window.FGFitFontSize ? window.FGFitFontSize(el.textContent, w, {base:baseSize, min:Math.max(7, Math.round(baseSize*0.45)), step:0.5, fontFamily:cs.fontFamily, fontWeight:cs.fontWeight}) : baseSize;
      if(fitted<baseSize) el.style.fontSize=fitted+'px';
    }
  }

  // Text-size boost changes the CSS variable most card text scales off
  // (calc(...px * var(--fg-text-scale,1))) automatically, no JS needed --
  // but the fit pass above bakes in a fixed px value, so it has to
  // re-run whenever the boost changes or it'd go stale. Safe to call any
  // time; _bbFitTaskText() itself no-ops on any board that isn't showing
  // (querySelectorAll just finds nothing).
  window.addEventListener('fg-text-scale-changed', function(){
    try { _bbFitTaskText(); } catch(e){}
  });

  function openAddCard(){
    var t=document.getElementById('bb-new-task'); if(t) t.value='';
    var ov=document.getElementById('bb-add-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function closeAddCard(){
    var ov=document.getElementById('bb-add-overlay'); if(ov) ov.classList.remove('active');
  }

  function _bbHighlightPriority(priority){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      var base=btns[i].getAttribute('data-pri-base');
      var active = !!priority && PRI_BASE_OF[priority]===base;
      btns[i].textContent = active ? priority : base;
      if(active){
        btns[i].style.background=PRI_COLOR[priority];
        btns[i].style.borderColor=PRI_COLOR[priority];
        btns[i].style.color = PRI_TEXT[priority];
      } else {
        btns[i].style.background='';
        btns[i].style.borderColor='';
        btns[i].style.color='';
      }
    }
  }

  function openCardDetail(id){
    _bbOpenCardId=id;
    // Aug 14 2026 fix -- see _bbFindCardAnywhere above: this used to only
    // check _bbCardsList(), so a merged card (Personal BB read-through or
    // a project board's shared-in card) never opened at all.
    var c=_bbFindCardAnywhere(id);
    if(!c) return;
    _bbDetailBeforeCardId=id;
    _bbDetailBeforeSnapshot=_bbSnapshotCardDetail(c);
    document.getElementById('bb-d-added').textContent=c.assigned||'—';
    document.getElementById('bb-d-situation').value=c.situation||'';
    document.getElementById('bb-d-hangup-since').textContent=c.hangupSince||'—';
    document.getElementById('bb-d-hangup-wrap').style.display = (c.col==='hangups') ? '' : 'none';
    // Idea Board button, Aug 11 2026 -- one button, every card, doing
    // one of two things depending on whether this card is already
    // linked (c.sourceHeaderId): a linked card opens its existing
    // header in a new tab (was the separate "Open on Idea Storyboard"
    // button); an unlinked card creates a brand-new blank Idea Board
    // named after its own task text and links to that instead --
    // Larry's "Idea" this session: a Briefing Card with no home on any
    // board yet (e.g. "Routine Cards protocol") gets one on the spot,
    // with its own task text promoted straight into the TOPIC name.
    // Replaces the old Hang-Up-only "Unhooking Ideas" button -- same
    // Situation-seeding behavior, just folded into this one control
    // instead of a second, differently-named button. Reset here since
    // this is a permanent overlay element, never re-created between
    // cards -- its disabled/"Opening…" state from a previous click
    // would otherwise stick on the next card opened.
    var _bbOpenHdrBtn=document.getElementById('bb-d-open-header');
    if(_bbOpenHdrBtn){
      _bbOpenHdrBtn.disabled=false;
      _bbOpenHdrBtn.title = c.sourceHeaderId ? 'Open on Idea Storyboard' : 'Idea Board';
    }
    // Problem-red back, July 21, 2026 (evening) -- Larry: the card back
    // itself should read as a problem card while it's sitting in
    // HANG-UPS, not just the field that's revealed. Reuses the same
    // fixed Hang-Ups red (#a3372b) already used on the column header and
    // flag buttons -- one semantic color for "this is stuck," everywhere.
    var _bbDetailCard=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCard) _bbDetailCard.classList.toggle('bb-hangup-active', c.col==='hangups');
    if(_bbDetailCard) _bbDetailCard.classList.toggle('bb-overdue-active', _bbIsOverdue(c)||_bbIsStartOverdue(c));
    document.getElementById('bb-d-task').value=c.task||'';
    _bbRenderColorSwatches(c);
    // Color row starts collapsed on every open -- Gear (bb-d-gear) toggles
    // it, same as the Idea Card's Appearance gear.
    (function(){ var row=document.getElementById('bb-d-color-row'); if(row) row.style.display='none'; })();
    // Mirror boards, part 2, Aug 9 2026 -- "Also show on" only makes
    // sense for a card native to a PERSONAL board (tagging it onto a
    // project/departmental/company board this member belongs to).
    // Options come straight from _bbBoards, already RLS-scoped to
    // boards this member can actually see.
    (function(){
      var wrap=document.getElementById('bb-d-shared-wrap');
      var sel=document.getElementById('bb-d-shared-board');
      if(!wrap || !sel) return;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      // Aug 14 2026 -- also require !c._foreign now that a merged
      // (assigned-to-me) card can be opened from a Personal BB too: this
      // field only makes sense for a card actually native here, not one
      // just passing through on its way from someone else's board.
      if(board && board.board_type==='personal' && !c._foreign){
        var targets=_bbBoards.filter(function(b){ return b.board_type!=='personal'; });
        sel.innerHTML='<option value="">Just here</option>'+targets.map(function(b){
          return '<option value="'+b.id+'">'+_esc(b.name||'Untitled Board')+'</option>';
        }).join('');
        sel.value=c.sharedToBoardId||'';
        wrap.style.display='';
      } else {
        wrap.style.display='none';
      }
    })();
    document.getElementById('bb-d-due').value=c.due||'';
    document.getElementById('bb-d-due-time').value=c.dueTime||'';
    document.getElementById('bb-d-start').value=c.startDate||'';
    document.getElementById('bb-d-start-time').value=c.startTime||'';
    document.getElementById('bb-d-routine').value=c.routineFreq||'';
    document.getElementById('bb-d-routine-custom').value=c.routineCustom||'';
    document.getElementById('bb-d-routine-custom').style.display=(c.routineFreq==='custom')?'':'none';
    var _bbDetailCardR=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCardR) _bbDetailCardR.classList.toggle('bb-routine-active', !!c.routine);
    document.getElementById('bb-d-budget').value=c.budget||'';
    document.getElementById('bb-d-notes').value=c.notes||'';
    _bbAutoGrowNotes();
    document.getElementById('bb-d-link-url').value=c.linkUrl||'';
    _bbLinkPendingUrl=c.linkUrl||null; _bbLinkPendingThumb=c.linkThumb||null; _bbLinkPendingTitle=c.linkTitle||null;
    if(_bbLinkTimer){ clearTimeout(_bbLinkTimer); _bbLinkTimer=null; }
    _bbRenderLinkPreview(_bbLinkPendingUrl, _bbLinkPendingThumb, _bbLinkPendingTitle);
    document.getElementById('bb-d-reviewer').value=c.reviewedBy||REVIEWERS[0];
    document.getElementById('bb-d-grow-note').value=c.growNote||'';
    document.getElementById('bb-d-grow-note-wrap').style.display=c.grow?'':'none';
    _bbUpdateReviewUI(c);
    _bbHighlightPriority(c.priority||'');
    _bbRenderKeyRow(c);
    _bbChecklistCache=[];
    var clInput=document.getElementById('bb-d-checklist-new'); if(clInput) clInput.value='';
    _bbRenderChecklist();
    _bbLoadChecklistForCard(id);
    // Additions, Aug 27 2026 -- each checkbox/body pair just mirrors
    // this card's own addFlag; values were already written into their
    // fields above, so this only ever controls whether that section is
    // showing, never what's in it.
    BB_ADDITIONS.forEach(function(a){
      var open=!!c[a.flag];
      var cb=document.getElementById(a.cb); if(cb) cb.checked=open;
      var body=document.getElementById(a.body); if(body) body.style.display=open?'':'none';
    });
    var ov=document.getElementById('bb-detail-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function openDoorSoon(label){
    var t=document.getElementById('bb-door-soon-title');
    if(t) t.textContent=label;
    var ov=document.getElementById('bb-door-soon-overlay');
    if(ov) ov.classList.add('active');
  }
  function closeDoorSoon(){
    var ov=document.getElementById('bb-door-soon-overlay');
    if(ov) ov.classList.remove('active');
  }
  function closeCardDetail(){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(c){
      c.task=document.getElementById('bb-d-task').value;
      c.situation=document.getElementById('bb-d-situation').value;
      // c.person (Assigned to) no longer has a field on this screen --
      // retired Session 234, see the comment above _bbInitials. It's
      // left untouched here (never cleared) purely as the legacy
      // fallback source for any card nobody's starred a 👥 primary
      // doer on yet.
      c.due=document.getElementById('bb-d-due').value;
      c.dueTime=document.getElementById('bb-d-due-time').value;
      c.startDate=document.getElementById('bb-d-start').value;
      c.startTime=document.getElementById('bb-d-start-time').value;
      c.routineFreq=document.getElementById('bb-d-routine').value;
      c.routineCustom=document.getElementById('bb-d-routine-custom').value;
      c.budget=document.getElementById('bb-d-budget').value;
      c.notes=document.getElementById('bb-d-notes').value;
      (function(){
        var linkInput=document.getElementById('bb-d-link-url');
        var val=linkInput?linkInput.value.trim():'';
        if(!val){ c.linkUrl=null; c.linkTitle=null; c.linkThumb=null; }
        else if(val===_bbLinkPendingUrl){ c.linkUrl=val; c.linkTitle=_bbLinkPendingTitle||val; c.linkThumb=_bbLinkPendingThumb||null; }
        else { c.linkUrl=val; c.linkTitle=val; c.linkThumb=null; }
      })();
      c.reviewedBy=document.getElementById('bb-d-reviewer').value;
      c.growNote=document.getElementById('bb-d-grow-note').value;
      var sharedWrap=document.getElementById('bb-d-shared-wrap');
      if(sharedWrap && sharedWrap.style.display!=='none'){
        var newSharedTo=document.getElementById('bb-d-shared-board').value || null;
        if(newSharedTo!==(c.sharedToBoardId||null)){
          _bbHandleSharedTagChange(c, newSharedTo);
          c.sharedToBoardId=newSharedTo;
        }
      }
      if(_bbDetailBeforeSnapshot && _bbDetailBeforeCardId===_bbOpenCardId){
        var afterSnap=_bbSnapshotCardDetail(c);
        if(JSON.stringify(_bbDetailBeforeSnapshot)!==JSON.stringify(afterSnap)){
          (function(){
            var cardId=_bbOpenCardId, beforeSnap=_bbDetailBeforeSnapshot;
            _bbPushAction({label:'Edit', undo:function(){ _bbApplyCardDetail(cardId, beforeSnap); }, redo:function(){ _bbApplyCardDetail(cardId, afterSnap); }});
          })();
        }
      }
      _bbSaveLocal(_bbCardsList());
    }
    _bbOpenCardId=null;
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.remove('active');
    var openDp=document.querySelector('.bb-datepicker-pop'); if(openDp) openDp.remove();
    // Refresh per-key link counts before redrawing -- the card that was
    // just open may have gained or lost a Signal Flag, and the board-
    // face badge needs to reflect that the moment you're back looking.
    _bbLoadKeyLinkCounts(_bbCardsList().map(function(c){ return c.id; })).then(renderBoard);
  }

  function openTrashConfirm(id){
    _bbTrashPendingId=id;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.add('active');
  }

  function closeTrashConfirm(){
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
  }

  // Aug 7 2026 -- Larry: "We need a safety net for potential errors."
  // Trash used to filter the card out of _bbCards entirely and save --
  // since _bbSyncCardsToSupabase prunes any row not in the saved list,
  // that deleted it from the database outright, no undo, the instant
  // the confirm was clicked. Now it just stamps trashedAt and keeps the
  // card in _bbCards (so the prune step leaves it alone) -- renderBoard
  // filters trashed cards out of the normal columns below, same way it
  // already filters archived ones.
  function doTrashCard(){
    var id=_bbTrashPendingId;
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(c){
      var ts=new Date().toISOString();
      c.trashedAt=ts;
      _bbPushAction({
        label:'Delete',
        undo: function(){ _bbApplyTrashState(id, null); },
        redo: function(){ _bbApplyTrashState(id, ts); }
      });
    }
    _bbSaveLocal(_bbCardsList());
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
    // Session 234 (Aug 21) -- Trash is now also reachable straight from
    // the card detail overlay's bottom row (bb-d-trash), not just by
    // dragging to the trash can. If the card just trashed is the one
    // still sitting open behind this confirm, close it too rather than
    // leaving an empty/stale detail screen up.
    if(_bbOpenCardId===id){
      _bbOpenCardId=null;
      var detailOv=document.getElementById('bb-detail-overlay'); if(detailOv) detailOv.classList.remove('active');
    }
    renderBoard();
  }

  function openRecentlyDeleted(){
    _bbRenderRecentlyDeleted();
    var ov=document.getElementById('bb-recently-deleted-overlay');
    if(ov) ov.classList.add('active');
  }
  function closeRecentlyDeleted(){
    var ov=document.getElementById('bb-recently-deleted-overlay'); if(ov) ov.classList.remove('active');
  }
  function _bbDaysAgo(iso){
    var d=new Date(iso); if(isNaN(d.getTime())) return '';
    var days=Math.floor((Date.now()-d.getTime())/86400000);
    if(days<=0) return 'today';
    if(days===1) return '1 day ago';
    return days+' days ago';
  }
  function _bbRenderRecentlyDeleted(){
    var wrap=document.getElementById('bb-rd-list'); if(!wrap) return;
    var trashed=_bbCardsList().filter(function(c){ return c.trashedAt; })
      .sort(function(a,b){ return new Date(b.trashedAt)-new Date(a.trashedAt); });
    if(!trashed.length){
      wrap.innerHTML='<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#a3907a;text-align:center;padding:16px 0">Nothing in here right now.</div>';
      return;
    }
    wrap.innerHTML=trashed.map(function(c){
      return '<div class="bb-rd-item" style="border:0.5px solid #d8cdb8;border-radius:8px;padding:8px;margin-bottom:6px">'
        +'<div style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:2px">'+_esc(c.task||'(untitled)')+'</div>'
        +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;margin-bottom:6px">Trashed '+_bbDaysAgo(c.trashedAt)+'</div>'
        +'<div style="display:flex;gap:6px">'
          +'<button class="bb-icon-btn" data-rd-restore="'+_esc(c.id)+'" style="width:auto;height:auto;font-size:calc(11px * var(--fg-text-scale,1));padding:4px 8px">Restore</button>'
          +'<button class="bb-icon-btn" data-rd-purge="'+_esc(c.id)+'" style="width:auto;height:auto;font-size:calc(11px * var(--fg-text-scale,1));padding:4px 8px;color:#a3372b">Delete Forever</button>'
        +'</div>'
      +'</div>';
    }).join('');
  }
  function _bbRestoreTrashedCard(id){
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(!c) return;
    c.trashedAt=null;
    _bbSaveLocal(_bbCardsList());
    _bbRenderRecentlyDeleted();
    renderBoard();
  }
  function _bbPurgeTrashedCardForever(id){
    _bbCards=_bbCardsList().filter(function(x){ return x.id!==id; });
    _bbSaveLocal(_bbCards, [id]);
    _bbRenderRecentlyDeleted();
  }
  function wireRecentlyDeleted(){
    T().wire('bb-rd-close', closeRecentlyDeleted);
    var wrap=document.getElementById('bb-rd-list'); if(!wrap) return;
    wrap.addEventListener('click', function(e){
      var restoreId=e.target.getAttribute && e.target.getAttribute('data-rd-restore');
      var purgeId=e.target.getAttribute && e.target.getAttribute('data-rd-purge');
      if(restoreId) _bbRestoreTrashedCard(restoreId);
      if(purgeId){
        if(window.confirm('Delete this for good? There\'s no getting it back after this.')) _bbPurgeTrashedCardForever(purgeId);
      }
    });
  }
  // Aug 7 2026 -- cards sitting in trashed_at longer than this get
  // permanently removed the next time the board loads (see the purge
  // call in the board-load function). A targeted delete scoped to
  // trashed_at only -- never touches the risky whole-board prune in
  // _bbSyncCardsToSupabase.
  var BB_TRASH_RETENTION_DAYS = 30;
  async function _bbPurgeOldTrash(boardId){
    var sb=T().sb; if(!sb || !boardId) return;
    try{
      var cutoff=new Date(Date.now() - BB_TRASH_RETENTION_DAYS*86400000).toISOString();
      await sb.from('briefing_cards').delete().eq('board_id', boardId).not('trashed_at','is',null).lt('trashed_at', cutoff);
    }catch(e){ console.error('Briefing Board: trash auto-purge failed', e); }
  }

  // Settings screen stack, Aug 8 2026 -- Larry: Settings should be a
  // simple drill-down (Settings home -> People -> Cast/Guests), not a
  // tab bar, with X always meaning "back one screen" until you're back
  // at the top, where X closes for real. One overlay div, body content
  // re-rendered per screen -- same idea as the Storyboard's single
  // sb-detail-overlay, just scoped to Settings here.
  var _bbSettingsScreen='home';
  function _bbRenderSettingsScreen(screen){
    _bbSettingsScreen=screen;
    var body=document.getElementById('bb-settings-body'); if(!body) return;
    var titleEl=document.getElementById('bb-settings-title');
    if(screen==='home'){
      if(titleEl) titleEl.textContent='Settings';
      body.innerHTML=
         '<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-people" style="width:100%">&#128101; People</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-appearance" style="width:100%">&#127912; Appearance</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-preferences" style="width:100%">&#128295; Preferences</button></div>';
      T().wire('bb-settings-go-people', function(){ _bbRenderSettingsScreen('people'); });
      T().wire('bb-settings-go-appearance', function(){ _bbRenderSettingsScreen('appearance'); });
      T().wire('bb-settings-go-preferences', function(){ _bbRenderSettingsScreen('preferences'); });
    } else if(screen==='people'){
      if(titleEl) titleEl.textContent='People';
      body.innerHTML=
         '<div class="bb-field" id="bb-team-roster-field">'
          +'<button class="bb-flag-btn" id="bb-open-team-roster" style="width:100%">&#127917; Cast</button>'
        +'</div>'
        +'<div class="bb-field" id="bb-sharing-field">'
          +'<button class="bb-flag-btn" id="bb-open-sharing" style="width:100%">&#127915; Guests</button>'
        +'</div>'
        +'<div class="bb-field" id="bb-relations-field">'
          +'<button class="bb-flag-btn" id="bb-open-relations" style="width:100%">&#128279; Relationships</button>'
        +'</div>';
      T().wire('bb-open-team-roster', function(){ closeSettings(); openTeamRoster(); });
      T().wire('bb-open-sharing', function(){ closeSettings(); openSharingManager(); });
      T().wire('bb-open-relations', function(){ closeSettings(); openRelationsManager(); });
      _bbLoadSharing();
    } else if(screen==='appearance'){
      if(titleEl) titleEl.textContent='Appearance';
      body.innerHTML=
         '<div class="bb-field"><label>Color theme</label><div class="bb-swatches">'
          +THEMES.map(function(t){ return '<button class="bb-theme-swatch" data-theme="'+t.key+'" title="'+t.label+'" style="background:'+t.bg+';border-color:'+t.accent+'"></button>'; }).join('')
        +'</div></div>'
        +'<div class="bb-field"><label>Font</label><div class="bb-flags">'
          +FONTS.map(function(f){ return '<button class="bb-font-btn" data-font="'+f.key+'">'+f.label+'</button>'; }).join('')
        +'</div></div>'
        +'<div class="bb-field"><label>Text size</label>'
          +'<button class="bb-flag-btn" id="bb-open-textsize" style="width:100%">&#128288; Adjust text size</button>'
        +'</div>';
      // Aug 3 2026: Briefing Board is full-screen (.isx-full), so the
      // desk's own gear/text-size picker is hidden here -- same shared
      // picker as Storyboard/Session's Options menus.
      var tsBtn=document.getElementById('bb-open-textsize');
      if(tsBtn) tsBtn.addEventListener('click', function(){ if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
      document.querySelectorAll('#bb-settings-body .bb-theme-swatch').forEach(function(btn){
        btn.addEventListener('click', function(){ _bbApplyTheme(btn.getAttribute('data-theme')); });
      });
      document.querySelectorAll('#bb-settings-body .bb-font-btn').forEach(function(btn){
        btn.addEventListener('click', function(){ _bbApplyFont(btn.getAttribute('data-font')); });
      });
      _bbHighlightAppearance();
    } else if(screen==='preferences'){
      if(titleEl) titleEl.textContent='Preferences';
      body.innerHTML=
         '<div class="bb-field"><label>Start Date warning (days before, auto-sets H)</label>'
          +'<input type="number" min="0" step="1" id="bb-start-warn-days" style="width:80px">'
        +'</div>'
        +'<div class="bb-field"><label>Due Date warning (days before, auto-sets HH)</label>'
          +'<input type="number" min="0" step="1" id="bb-due-warn-days" style="width:80px">'
        +'</div>'
        +'<div class="bb-field"><label>Signal Flags</label>'
          +'<button class="bb-flag-btn" id="bb-open-keylib" style="width:100%">&#128681; Manage Signal Flags</button>'
        +'</div>';
      var sw=document.getElementById('bb-start-warn-days'); if(sw) sw.value=_bbStartWarnDays();
      var dw=document.getElementById('bb-due-warn-days'); if(dw) dw.value=_bbDueWarnDays();
      if(sw) sw.addEventListener('change', function(){ _bbSetStartWarnDays(sw.value); sw.value=_bbStartWarnDays(); renderBoard(); });
      if(dw) dw.addEventListener('change', function(){ _bbSetDueWarnDays(dw.value); dw.value=_bbDueWarnDays(); renderBoard(); });
      T().wire('bb-open-keylib', function(){ closeSettings(); openKeyLibManager(); });
    }
  }
  function _bbOpenSettingsAt(screen){
    _bbRenderSettingsScreen(screen);
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.add('active');
  }
  function openSettings(){
    _bbOpenSettingsAt('home');
  }
  function closeSettings(){
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.remove('active');
  }

  function wireTrashIcon(){
    var trash=document.getElementById('bb-trash'); if(!trash) return;
    trash.addEventListener('dragover', function(e){ e.preventDefault(); trash.classList.add('bb-trash-dropready'); });
    trash.addEventListener('dragleave', function(){ trash.classList.remove('bb-trash-dropready'); });
    trash.addEventListener('drop', function(e){
      e.preventDefault();
      trash.classList.remove('bb-trash-dropready');
      var id=e.dataTransfer.getData('text/plain');
      if(id) openTrashConfirm(id);
    });
    // Aug 7 2026 -- plain click (not a drop) opens Recently Deleted,
    // the restore side of the new safety net.
    trash.addEventListener('click', openRecentlyDeleted);
  }

  // Signal Flags -- a shared library of up to 12 traveler-defined
  // signal flags (shape+color+meaning), built in the Add-a-Signal-Flag overlay (9390).
  // A card holds up to 3 (c.keys, always kept gap-free -- see
  // removeKeyFromSlot). Tapping ANY circle (empty or filled) opens
  // Choose a Signal Flag (9395), which does triple duty: assign an existing
  // library entry, remove what's there, or jump into building a brand
  // new one. Meanings stay hover-only by design ("can't remember what
  // it means? hover over it") -- no separate legend, kept intentionally
  // intuitive.
  // July 22, 2026, Larry: only ONE open "+" shows at a time, never all
  // 3 circles up front -- a fresh card shows a single +, filling it
  // reveals the next, filling that reveals the third. Once all 3 are
  // filled, no separate + appears; tapping any of the 3 still swaps
  // that slot for a different key (or removes it, or builds a new one
  // in its place) -- same picker as always, just no 4th add icon.
  // Before this, all 3 circles (empty ones dashed "+") showed at once
  // per Larry's July 21 (afternoon) call -- replaced today per his ask
  // to keep only one + visible.
  var _bbKeyDraft = {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
  var _bbOpenSlotIndex = null;

  function _bbRenderKeyRow(c){
    var row=document.getElementById('bb-d-key-row'); if(!row) return;
    var lib=_bbLoadKeyLibrary();
    // July 22, 2026, Larry: show filled slots plus exactly ONE open "+" --
    // never all 3 circles up front. c.keys is kept gap-free (see
    // removeKeyFromSlot), so "next open slot" is always keys.length.
    var keys=(c.keys||[]).filter(function(id){ return !!id; });
    var html='';
    for(var i=0;i<keys.length;i++){
      var k = lib.filter(function(x){ return x.id===keys[i]; })[0];
      if(!k) continue;
      html += '<button class="bb-key-btn" data-slot="'+i+'" title="'+_esc(k.meaning||'')+'">'
        +'<span class="bb-key-shape" style="display:block;width:16px;height:16px;'+_bbShapeCSS(k.shape, k.color)+'"></span>'
        +'</button>';
    }
    if(keys.length < MAX_KEYS_PER_CARD){
      html += '<button class="bb-key-btn bb-key-add" data-slot="'+keys.length+'" title="Add a signal flag">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.bb-key-btn').forEach(function(btn){
      var slotIdx=Number(btn.getAttribute('data-slot'));
      var isFilled = !btn.classList.contains('bb-key-add');
      // Click-and-hold a filled Signal Flag to see every other card
      // carrying that same flag -- Aug 15 2026 (Larry: "click to travel
      // from one to another... like the header stack but even from
      // board to board"). Same 550ms hold as the Idea Storyboard's own
      // flag peek, so the gesture reads the same on either board. A
      // short click/tap still opens the picker as before.
      if(isFilled){
        var keyId=keys[slotIdx];
        var kHoldTimer=null, kHeld=false, kStartX=0, kStartY=0;
        // Aug 15 2026 fix -- a real finger (or trackpad click) drifts a
        // few pixels even when someone means to hold still, and the
        // header-stack peek's plain touchmove-cancels-everything version
        // got away with that because it has a fallback doorway (the
        // CLUSTER pill). This flag peek has no second doorway, so a
        // twitchy cancel would silently make it unreachable on touch.
        // Only cancel once the press has actually moved (10px), not on
        // the first touchmove event.
        function kStartHold(e){
          kHeld=false;
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          kStartX=pt.clientX; kStartY=pt.clientY;
          kHoldTimer=setTimeout(function(){ kHeld=true; var k=lib.filter(function(x){ return x.id===keyId; })[0]; if(k) openKeyPeek(k); }, 550);
        }
        function kCancelHold(){ clearTimeout(kHoldTimer); }
        function kMoveCheck(e){
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          if(Math.abs(pt.clientX-kStartX)>10 || Math.abs(pt.clientY-kStartY)>10) kCancelHold();
        }
        btn.addEventListener('mousedown', kStartHold);
        btn.addEventListener('touchstart', kStartHold);
        btn.addEventListener('mouseup', kCancelHold);
        btn.addEventListener('mouseleave', kCancelHold);
        btn.addEventListener('touchend', kCancelHold);
        btn.addEventListener('touchmove', kMoveCheck);
        btn.addEventListener('click', function(){ if(!kHeld) openKeyPicker(slotIdx); kHeld=false; });
      } else {
        btn.addEventListener('click', function(){ openKeyPicker(slotIdx); });
      }
    });
  }

  function openKeyPicker(slotIndex){
    _bbOpenSlotIndex = slotIndex;
    _bbRenderKeyPickerList();
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    var hasKey = !!(c && c.keys && c.keys[slotIndex]);
    var removeBtn=document.getElementById('bb-keypicker-remove');
    if(removeBtn) removeBtn.style.display = hasKey ? '' : 'none';
    var ov=document.getElementById('bb-keypicker-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyPicker(){
    var ov=document.getElementById('bb-keypicker-overlay'); if(ov) ov.classList.remove('active');
  }

  // Signal Flag peek, Aug 15 2026 (Larry: "click to travel from one to
  // another... like the header stack but even from board to board") --
  // twin of the Idea Storyboard's openSbKeyPeek. Shows every other
  // Briefing card carrying the same flag (opens right in place, same
  // tab, switching boards first if needed), plus any Idea Storyboard
  // matches as a jump-list to a new tab -- headers open straight to
  // their own board (the existing fg_open_header_id handoff); a plain
  // subber has no board of its own, so it opens the board it lives on
  // (its parent header) rather than nothing at all.
  async function openKeyPeek(keyObj){
    var titleEl=document.getElementById('bb-keypeek-title');
    if(titleEl){
      titleEl.innerHTML='<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;'+_bbShapeCSS(keyObj.shape,keyObj.color)+'"></span>'+_esc(keyObj.meaning||'Signal Flag');
    }
    var body=document.getElementById('bb-keypeek-body');
    if(body){ body.textContent='Loading…'; body.style.color=''; }
    var ov=document.getElementById('bb-keypeek-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
    var sb=T().sb;
    if(!sb || !body) return;
    try{
      // Aug 15 2026 (Larry: "there might be many different boards of
      // each type... must include the TITLE") -- embeds the parent
      // board's own name via the existing board_id foreign key, so
      // matches can be grouped and labeled by their real board instead
      // of a generic "the Briefing Board" bucket.
      var cardRes=await sb.from('briefing_cards').select('id,board_id,task,briefing_boards!board_id(name)')
        .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
        .eq('archived',false).limit(200);
      if(cardRes.error) throw new Error(cardRes.error.message);
      var cardRows=cardRes.data||[];

      var ideaRows=[];
      try{
        var ideaRes=await sb.from('ideas').select('id,content_type,text_content,cluster_id,topic_scope_id')
          .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
          .limit(200);
        if(!ideaRes.error) ideaRows=ideaRes.data||[];
      }catch(e){}

      if(!cardRows.length && !ideaRows.length){
        body.textContent='No other cards carry this Signal Flag yet.';
        return;
      }
      body.innerHTML='';
      body.style.cssText='';

      // Aug 15 2026 (Larry: "looks awkward... more like cards than
      // document links") -- each match renders as an actual small card,
      // reusing the real .bb-card look for Briefing Board matches (same
      // board, same card style) and the Idea Board's own blue/navy card
      // language for Idea Board matches -- so which board a match lives
      // on reads from its color alone, before you even read the label
      // above it. Grouped and labeled by each match's real board name,
      // since a traveler can have several boards of the same type.
      if(cardRows.length){
        var byBoard={}; var boardOrder=[];
        cardRows.forEach(function(c){
          var bid=c.board_id||'';
          if(!byBoard[bid]){ byBoard[bid]=[]; boardOrder.push(bid); }
          byBoard[bid].push(c);
        });
        var bbOuter=document.createElement('div');
        bbOuter.style.cssText='margin-bottom:'+(ideaRows.length?'14px':'0');
        boardOrder.forEach(function(bid, idx){
          var groupCards=byBoard[bid];
          var boardName=(groupCards[0].briefing_boards && groupCards[0].briefing_boards.name) || 'Untitled Board';
          var bbLbl=document.createElement('div');
          bbLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px;text-align:left';
          bbLbl.textContent='On the '+boardName+' Briefing Board:';
          bbOuter.appendChild(bbLbl);
          var bbGrid=document.createElement('div');
          bbGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupCards.forEach(function(c){
            var card=document.createElement('div');
            card.className='bb-card';
            card.style.cssText='width:100%;box-sizing:border-box;cursor:pointer';
            card.textContent=c.task||'(untitled)';
            card.addEventListener('click', async function(){
              closeKeyPeek();
              await _bbSwitchToBoard(c.board_id);
              openCardDetail(c.id);
            });
            bbGrid.appendChild(card);
          });
          bbOuter.appendChild(bbGrid);
        });
        body.appendChild(bbOuter);
      }

      if(ideaRows.length){
        // Same grouping on the Idea Board side -- topic_scope_id is the
        // nearest TOPIC-or-root ancestor, same id briefing_boards'
        // storyboard_project_id keys off of, and that ancestor's own
        // text_content is the board's real title (same resolution the
        // header<->card sync already uses).
        var scopeIds=[]; var seenScope={};
        ideaRows.forEach(function(r){
          if(r.topic_scope_id && !seenScope[r.topic_scope_id]){ seenScope[r.topic_scope_id]=true; scopeIds.push(r.topic_scope_id); }
        });
        var scopeNameById={};
        if(scopeIds.length){
          try{
            var scopeRes=await sb.from('ideas').select('id,text_content').in('id', scopeIds);
            (scopeRes.data||[]).forEach(function(s){ scopeNameById[s.id]=s.text_content||'Untitled Board'; });
          }catch(e){}
        }
        var byScope={}; var scopeOrder=[];
        ideaRows.forEach(function(r){
          var sid=r.topic_scope_id||'';
          if(!byScope[sid]){ byScope[sid]=[]; scopeOrder.push(sid); }
          byScope[sid].push(r);
        });
        var ibOuter=document.createElement('div');
        scopeOrder.forEach(function(sid, idx){
          var groupRows=byScope[sid];
          var boardName=scopeNameById[sid]||'Idea Board';
          var ibLbl=document.createElement('div');
          ibLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px;text-align:left';
          ibLbl.textContent='On the '+boardName+' Idea Board:';
          ibOuter.appendChild(ibLbl);
          var ibGrid=document.createElement('div');
          ibGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupRows.forEach(function(row){
            var targetHeaderId = (row.content_type==='header') ? row.id : row.cluster_id;
            var card=document.createElement('div');
            // Aug 15 2026 (Larry: "make the Idea Board flag card look
            // just like the BB flag card") -- same .bb-card look on
            // both groups now; the board name is already carried by
            // the label above each group, so the card itself doesn't
            // need to carry it too via color.
            card.className='bb-card';
            card.style.cssText='width:100%;box-sizing:border-box;cursor:pointer';
            card.textContent=row.text_content||'(untitled)';
            card.addEventListener('click', function(){
              try{
                sessionStorage.setItem('bp_target','1010');
                if(targetHeaderId) sessionStorage.setItem('fg_open_header_id', targetHeaderId);
              }catch(e){}
              window.open(location.pathname+location.search, '_blank');
            });
            ibGrid.appendChild(card);
          });
          ibOuter.appendChild(ibGrid);
        });
        body.appendChild(ibOuter);
      }
    }catch(err){
      body.textContent=err.message;
      body.style.color='#a3372b';
    }
  }

  function closeKeyPeek(){
    var ov=document.getElementById('bb-keypeek-overlay'); if(ov) ov.classList.remove('active');
  }
  // Shows the whole library every time a slot is tapped -- Larry's "so
  // you know what is already possible" ask -- greying out any entry
  // already sitting in one of this card's OTHER two slots, since one
  // card showing the same key twice would just be confusing.
  function _bbRenderKeyPickerList(){
    var list=document.getElementById('bb-keypicker-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    var keys=(c && c.keys) || [];
    if(!lib.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No signal flags yet &mdash; build your first one below.</div>';
    } else {
      list.innerHTML = lib.map(function(k){
        var usedElsewhere = keys.indexOf(k.id)>=0 && keys[_bbOpenSlotIndex]!==k.id;
        return '<div class="bb-key-pick-row-wrap">'
          +'<button class="bb-key-pick-row'+(usedElsewhere?' bb-key-pick-disabled':'')+'" data-key-id="'+k.id+'">'
          +'<span class="bb-key-pick-swatch" style="display:inline-block;'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-key-pick-meaning">'+_esc(k.meaning||'')+'</span>'
          +'</button>'
          // Pencil-to-edit, Aug 4 2026 -- Larry: "I must have a way to
          // edit or change the meaning of any one of them" from
          // wherever he actually runs into a signal flag, not just Board
          // Settings' library manager. Same edit form (openKeyBuilder
          // with existingKey), reached straight from the card's own
          // Choose-a-Signal-Flag picker too.
          +'<button class="bb-key-pick-edit" data-key-id="'+k.id+'" title="Edit this signal flag">&#9998;</button>'
          +'</div>';
      }).join('');
      list.querySelectorAll('.bb-key-pick-row').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(btn.classList.contains('bb-key-pick-disabled')) return;
          assignKeyToSlot(btn.getAttribute('data-key-id'));
        });
      });
      list.querySelectorAll('.bb-key-pick-edit').forEach(function(btn){
        btn.addEventListener('click', function(){
          var k=lib.filter(function(x){ return String(x.id)===btn.getAttribute('data-key-id'); })[0];
          if(k){ var slot=_bbOpenSlotIndex; closeKeyPicker(); openKeyBuilder(k, function(){ openKeyPicker(slot); }); }
        });
      });
    }
    var newBtn=document.getElementById('bb-keypicker-new');
    if(newBtn) newBtn.style.display = lib.length>=MAX_KEY_LIBRARY ? 'none' : '';
  }
  async function assignKeyToSlot(keyId){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(!c) return;
    c.keys = c.keys || [];
    c.keys[_bbOpenSlotIndex] = keyId;
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
    // Auto-link, Aug 3 2026 -- reconcile once the key's own database
    // row is confirmed current, so _bbSyncKeyLinks sees this card among
    // the key's holders.
    await _bbPersistCardKeysNow(c);
    await _bbSyncKeyLinks(keyId);
    await _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }));
    renderBoard();
  }
  async function removeKeyFromSlot(){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(!c || !c.keys) return;
    var removedKeyId=c.keys[_bbOpenSlotIndex];
    // Splice, don't null out -- keeps the array gap-free so the next
    // render shows the remaining keys packed left plus one "+", instead
    // of a hole where the removed key used to sit.
    c.keys.splice(_bbOpenSlotIndex, 1);
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
    await _bbPersistCardKeysNow(c);
    if(removedKeyId) await _bbSyncKeyLinks(removedKeyId);
    await _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }));
    renderBoard();
  }

  // existingKey -- optional (Aug 3 2026, pencil-to-edit on the Signal Flags
  // manager). Pre-fills the draft from a real key row and
  // switches saveNewKey (below) into update mode instead of insert.
  // onSaved(savedKeyRow) -- what to do once it's actually saved: assign
  // it to the card slot that opened this (bb-keypicker-new's case,
  // below), or just refresh whatever list is showing it (Signal Flags
  // manager, Task 8). Always explicit now -- no implicit "guess from
  // whatever card/slot happens to still be open" fallback, since that
  // got fragile once this overlay had more than one way in.
  var _bbKeyBuilderOnSaved = null;
  function openKeyBuilder(existingKey, onSaved){
    _bbKeyDraft = existingKey
      ? {shape:existingKey.shape, color:existingKey.color, editingId:existingKey.id}
      : {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
    _bbKeyBuilderOnSaved = onSaved || null;
    var m=document.getElementById('bb-keybuilder-meaning'); if(m) m.value=existingKey?(existingKey.meaning||''):'';
    var t=document.querySelector('#bb-keybuilder-overlay .bb-overlay-title'); if(t) t.textContent=existingKey?'Edit Signal Flag':'Add a Signal Flag';
    var s=document.getElementById('bb-keybuilder-save'); if(s) s.textContent=existingKey?'Save changes':'Save';
    _bbHighlightKeyBuilderShape(_bbKeyDraft.shape);
    _bbHighlightKeyBuilderColor(_bbKeyDraft.color);
    var ov=document.getElementById('bb-keybuilder-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyBuilder(){
    var ov=document.getElementById('bb-keybuilder-overlay'); if(ov) ov.classList.remove('active');
  }
  function _bbHighlightKeyBuilderShape(shape){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-shape-btn').forEach(function(btn){
      btn.classList.toggle('bb-shape-active', btn.getAttribute('data-shape')===shape);
    });
  }
  function _bbHighlightKeyBuilderColor(color){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-key-swatch').forEach(function(btn){
      btn.classList.toggle('bb-swatch-active', btn.getAttribute('data-color')===color);
    });
  }
  // Handles both create (fresh _bbKeyDraft) and edit (_bbKeyDraft.editingId
  // set) -- Aug 3 2026, "we need to be able to edit or trash any custom
  // key." Calls back via _bbKeyBuilderOnSaved rather than hardcoding
  // what happens next, since this overlay now opens from more than one
  // place (a card's Choose-a-Signal-Flag, and the Signal Flags manager).
  async function saveNewKey(){
    var meaningEl=document.getElementById('bb-keybuilder-meaning');
    var meaning=meaningEl?meaningEl.value.trim():'';
    if(!meaning){ if(meaningEl) meaningEl.focus(); return; }
    if(!_bbKeyDraft.editingId && _bbKeyLibCache.length>=MAX_KEY_LIBRARY) return;
    var savedKey;
    try{
      if(_bbKeyDraft.editingId){
        savedKey=await _bbUpdateKey(_bbKeyDraft.editingId, _bbKeyDraft.shape, _bbKeyDraft.color, meaning);
      } else {
        savedKey=await _bbCreateKey(_bbKeyDraft.shape, _bbKeyDraft.color, meaning);
      }
    }catch(e){
      console.error('Briefing Board: could not save signal flag', e);
      window.alert('Could not save that signal flag. Error: '+(e&&e.message?e.message:String(e))+'. Please try again.');
      return;
    }
    closeKeyBuilder();
    if(_bbKeyBuilderOnSaved) _bbKeyBuilderOnSaved(savedKey);
  }
  function wireKeyBuilder(){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-shape-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        _bbKeyDraft.shape=btn.getAttribute('data-shape');
        _bbHighlightKeyBuilderShape(_bbKeyDraft.shape);
      });
    });
    document.querySelectorAll('#bb-keybuilder-overlay .bb-key-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){
        _bbKeyDraft.color=btn.getAttribute('data-color');
        _bbHighlightKeyBuilderColor(_bbKeyDraft.color);
      });
    });
    T().wire('bb-keybuilder-save', saveNewKey);
    T().wire('bb-keybuilder-close', closeKeyBuilder);
  }
  function wireKeyPicker(){
    T().wire('bb-keypicker-close', closeKeyPicker);
    T().wire('bb-keypicker-remove', removeKeyFromSlot);
    T().wire('bb-keypicker-new', function(){
      closeKeyPicker();
      openKeyBuilder(null, function(newKey){ assignKeyToSlot(newKey.id); });
    });
  }

  // ---- Signal Flags manager (9397) ----

  function _bbRenderKeyLibManager(){
    var list=document.getElementById('bb-keylib-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    if(!lib.length){
      list.innerHTML='<div class="bb-links-empty">No signal flags yet. Build one below.</div>';
    } else {
      list.innerHTML=lib.map(function(k){
        return '<div class="bb-keylib-row">'
          +'<span class="bb-keylib-swatch" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-keylib-meaning">'+_esc(k.meaning||'')+'</span>'
          +'<button class="bb-keylib-edit" data-key-id="'+_esc(k.id)+'" title="Edit this signal flag">&#9998;</button>'
          +'<button class="bb-keylib-del" data-key-id="'+_esc(k.id)+'" title="Delete this signal flag">&#128465;&#65039;</button>'
          +'</div>';
      }).join('');
      list.querySelectorAll('.bb-keylib-edit').forEach(function(btn){
        btn.addEventListener('click', function(){
          var key=lib.filter(function(k){ return String(k.id)===btn.getAttribute('data-key-id'); })[0];
          if(key){ closeKeyLibManager(); openKeyBuilder(key, function(){ openKeyLibManager(); }); }
        });
      });
      list.querySelectorAll('.bb-keylib-del').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var id=btn.getAttribute('data-key-id');
          if(!window.confirm('Delete this signal flag? It will be removed from every card and Storyboard item currently using it, and any links that exist only because of it.')) return;
          try{ await _bbDeleteKey(id); }
          catch(e){ console.error('Briefing Board: could not delete signal flag', e); window.alert('Could not delete that signal flag. Please try again.'); return; }
          _bbRenderKeyLibManager();
          renderBoard();
        });
      });
    }
    var addBtn=document.getElementById('bb-keylib-add');
    if(addBtn) addBtn.style.display = lib.length>=MAX_KEY_LIBRARY ? 'none' : '';
  }

  function openKeyLibManager(){
    _bbRenderKeyLibManager();
    var ov=document.getElementById('bb-keylibmanager-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyLibManager(){
    var ov=document.getElementById('bb-keylibmanager-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireKeyLibManager(){
    T().wire('bb-keylibmanager-close', closeKeyLibManager);
    T().wire('bb-keylib-add', function(){ closeKeyLibManager(); openKeyBuilder(null, function(){ openKeyLibManager(); }); });
  }

  // ---- Board Sharing manager (Aug 4 2026) ----
  // Larry: Project/Departmental/Company boards should support more than
  // one signed-in member on the same board. Whoever owns the board (its
  // user_id) is the only one who can add or remove other members; anyone
  // they add gets full, equal edit access to the board's cards, same as
  // the owner -- no separate viewer/editor tiers for now. Backed by the
  // board_members table + RLS (Supabase migration "add_board_sharing").
  // Personal boards stay single-traveler and hide this control entirely.
  var _bbSharingCache = [];
  var _bbSharingIsOwner = false;

  async function _bbLoadSharing(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var fieldEl=document.getElementById('bb-sharing-field');
    var summaryEl=document.getElementById('bb-sharing-summary');
    if(!board || (board.board_type||'personal')==='personal'){
      if(fieldEl) fieldEl.style.display='none';
      return;
    }
    if(fieldEl) fieldEl.style.display='';
    var uid=await _bbCurrentUserId();
    _bbSharingIsOwner = !!uid && board.user_id===uid;
    var sb=T().sb; if(!sb) return;
    try{
      var res=await sb.rpc('list_board_members', {p_board_id: board.id});
      _bbSharingCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _bbSharingCache=[]; }
    if(summaryEl){
      if(!_bbSharingCache.length){
        summaryEl.textContent = _bbSharingIsOwner ? 'Only you can see this board right now.' : 'Shared with you.';
      } else {
        var names=_bbSharingCache.map(function(m){ return m.name||m.email; });
        summaryEl.textContent = (_bbSharingIsOwner?'Shared with: ':'Also shared with: ')+names.join(', ');
      }
    }
    var openBtn=document.getElementById('bb-open-sharing');
    if(openBtn) openBtn.innerHTML = '\uD83C\uDFAB Guests';
  }

  function _bbRenderSharingList(){
    var list=document.getElementById('bb-sharing-list'); if(!list) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var addRow=document.getElementById('bb-sharing-add-row');
    if(addRow) addRow.style.display = _bbSharingIsOwner ? 'block' : 'none';
    if(!_bbSharingCache.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">Nobody else has access yet.</div>';
      return;
    }
    var _bbGuestsOnly=(_bbSharingCache||[]).filter(function(m){ return m.access_level==='view'; });
    if(!_bbGuestsOnly.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No guests yet.</div>';
      return;
    }
    list.innerHTML=_bbGuestsOnly.map(function(m){
      var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc(m.phone)) : '';
      var sponsorLine = m.sponsor_name ? '<div style="font-size:calc(10px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic;margin-top:2px">Cast sponsor: '+_esc(m.sponsor_name)+'</div>' : '';
      return '<div class="bb-keylib-row" data-user-id="'+_esc(m.user_id)+'" style="align-items:flex-start">'
        +'<span class="bb-keylib-meaning"><div>'+_esc(m.name||m.email)+'</div><div style="font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub)">\u2709 '+_esc(m.email||'')+phoneLine+'</div>'+sponsorLine+'</span>'
        +(_bbSharingIsOwner ? '<button class="bb-keylib-del" data-user-id="'+_esc(m.user_id)+'" title="Remove">&#128465;&#65039;</button>' : '')
        +'</div>';
    }).join('');
    if(!_bbSharingIsOwner || !board) return;
    list.querySelectorAll('.bb-keylib-del').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var uidToRemove=btn.getAttribute('data-user-id');
        var row=_bbSharingCache.filter(function(m){ return m.user_id===uidToRemove; })[0];
        if(!window.confirm('Remove '+(row?(row.name||row.email):'this person')+' from this board? They will lose access immediately.')) return;
        var sb=T().sb; if(!sb) return;
        await sb.from('board_members').delete().eq('board_id', board.id).eq('user_id', uidToRemove);
        await _bbLoadSharing();
        _bbRenderSharingList();
      });
    });
  }

  function openSharingManager(){
    _bbLoadSharing().then(_bbRenderSharingList);
    var ov=document.getElementById('bb-sharing-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeSharingManager(){
    var ov=document.getElementById('bb-sharing-overlay'); if(ov) ov.classList.remove('active');
    _bbOpenSettingsAt('people');
  }
  function wireSharingManager(){
    T().wire('bb-sharing-close', closeSharingManager);
    var addBtn=document.getElementById('bb-sharing-add-btn');
    if(addBtn) addBtn.addEventListener('click', async function(){
      if(!_bbSharingIsOwner){ window.alert('Only the board owner can add people.'); return; }
      var input=document.getElementById('bb-sharing-add-email');
      var email=input?input.value.trim().toLowerCase():'';
      if(!email) return;
      var accessLevel='view';
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      var sb=T().sb; if(!sb || !board) return;
      try{
        var res=await sb.rpc('find_member_by_email', {p_email: email});
        var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
        if(!match){
          window.alert('No T2T member found with that email. They need an active Field Guide account first -- ask them to sign up, then try adding them again.');
          return;
        }
        var myUid=await _bbCurrentUserId();
        var ins=await sb.from('board_members').insert({board_id: board.id, user_id: match.user_id, added_by: myUid, access_level: accessLevel});
        if(ins.error){
          window.alert('Could not add '+(match.name||email)+'. '+(ins.error.message||'Please try again.'));
          return;
        }
        if(input) input.value='';
        await _bbLoadSharing();
        _bbRenderSharingList();
      }catch(e){
        console.error('Briefing Board: could not add member', e);
        window.alert('Could not add that person. Please try again.');
      }
    });
  }

  // Relationships (Aug 16 2026) -- the Organization Board work: a real
  // on-screen way to form and accept the parent-child adoption links
  // that board_relations has supported since Session 214-215, so this
  // stops being something only Claude can do from the database. Every
  // write here goes through request_board_adoption/respond_board_
  // adoption -- both SECURITY DEFINER functions that re-check ownership
  // and the mutual-consent rule server-side, so this UI can't bypass
  // anything the database itself wouldn't allow.
  var _bbRelationsFullCache = null;
  async function _bbLoadRelationsFull(force){
    var sb=T().sb; if(!sb) return [];
    if(!force && _bbRelationsFullCache) return _bbRelationsFullCache;
    try{
      var res=await sb.rpc('list_my_board_relations');
      _bbRelationsFullCache = res.error ? [] : (res.data||[]);
    }catch(e){ console.error('Briefing Board: could not load relationships', e); _bbRelationsFullCache=[]; }
    return _bbRelationsFullCache;
  }

  function _bbRelBoardLabel(name, type){
    return (name||'(untitled)')+' — '+_bbTypeLabel(type||'personal');
  }

  async function _bbRenderRelations(){
    var body=document.getElementById('bb-relations-body'); if(!body) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board){ body.innerHTML='Open a board first.'; return; }
    var myUid=await _bbCurrentUserId();
    var rel=await _bbLoadRelationsFull(true);

    var parentRow=rel.filter(function(r){ return r.status==='approved' && r.child_board_id===board.id; })[0];
    var childRows=rel.filter(function(r){ return r.status==='approved' && r.parent_board_id===board.id; });
    // Every pending request touching ANY board this member owns, not
    // just the one open right now -- Larry: this should also work as
    // one place to see everything, not just a per-board popup.
    var allIncoming=rel.filter(function(r){
      if(r.status!=='pending') return false;
      if(r.child_owner_id===myUid && !r.child_approved_by) return true;
      if(r.parent_owner_id===myUid && !r.parent_approved_by) return true;
      return false;
    });
    var allOutgoing=rel.filter(function(r){ return r.status==='pending' && r.requested_by===myUid && allIncoming.indexOf(r)===-1; });

    var html='<div class="bb-links-empty" style="margin-bottom:10px">'+_esc(board.name||'This board')+' — '+_bbTypeLabel(board.board_type||'personal')+'</div>';

    html+='<div class="bb-field"><label>Parent</label>'
      +(parentRow ? '<div class="bb-cdrop-row active" style="cursor:default">'+_esc(_bbRelBoardLabel(parentRow.parent_board_name, parentRow.parent_board_type))+'</div>'
                  : '<div class="bb-links-empty">No parent yet.</div>')
      +'</div>';

    html+='<div class="bb-field"><label>Children ('+childRows.length+')</label>'
      +(childRows.length ? childRows.map(function(r){ return '<div class="bb-cdrop-row active" style="cursor:default">'+_esc(_bbRelBoardLabel(r.child_board_name, r.child_board_type))+'</div>'; }).join('')
                          : '<div class="bb-links-empty">None yet.</div>')
      +'</div>';

    if(allIncoming.length){
      html+='<div class="bb-field"><label>Waiting on you</label>'
        +allIncoming.map(function(r){
          var otherName=(r.child_owner_id===myUid) ? r.parent_board_name : r.child_board_name;
          var thisName=(r.child_owner_id===myUid) ? r.child_board_name : r.parent_board_name;
          return '<div class="bb-cdrop-row" style="cursor:default;display:flex;justify-content:space-between;align-items:center;gap:8px">'
            +'<span>'+_esc(otherName)+' → '+_esc(thisName)+'</span>'
            +'<span style="display:flex;gap:4px">'
              +'<button class="bb-icon-btn bb-icon-btn-add" data-relid="'+r.id+'" data-approve="1" title="Approve">✓</button>'
              +'<button class="bb-icon-btn bb-dotted-remove-btn" data-relid="'+r.id+'" data-approve="0" title="Decline">✕</button>'
            +'</span></div>';
        }).join('')
        +'</div>';
    }
    if(allOutgoing.length){
      html+='<div class="bb-field"><label>Waiting on them</label>'
        +allOutgoing.map(function(r){ return '<div class="bb-cdrop-row" style="cursor:default">'+_esc(r.child_board_name)+' → '+_esc(r.parent_board_name)+'</div>'; }).join('')
        +'</div>';
    }

    html+='<div class="bb-field"><label>Start a new relationship</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
        +'<select id="bb-rel-direction" style="flex:1;min-width:160px">'
          +'<option value="child">Adopt another board as a child of this one</option>'
          +'<option value="parent">Make this board a child of another</option>'
        +'</select>'
      +'</div>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
        +'<select id="bb-rel-source" style="flex:1;min-width:160px">'
          +'<option value="own">One of my own boards</option>'
          +'<option value="email">Someone else’s, by email</option>'
        +'</select>'
      +'</div>'
      +'<div id="bb-rel-own-row" style="margin-bottom:6px">'
        +'<select id="bb-rel-own-board" style="width:100%">'
          +_bbBoards.filter(function(b){ return b.id!==board.id; }).map(function(b){ return '<option value="'+b.id+'">'+_esc(_bbRelBoardLabel(b.name,b.board_type))+'</option>'; }).join('')
        +'</select>'
      +'</div>'
      +'<div id="bb-rel-email-row" style="display:none;margin-bottom:6px">'
        +'<div style="display:flex;gap:6px;margin-bottom:6px">'
          +'<input id="bb-rel-email" type="email" placeholder="Their email address" style="flex:1">'
          +'<button class="bb-icon-btn bb-icon-btn-add" id="bb-rel-email-search" title="Find their boards">🔍</button>'
        +'</div>'
        +'<select id="bb-rel-email-board" style="width:100%" disabled><option>Search an email first</option></select>'
      +'</div>'
      +'<button class="bb-flag-btn" id="bb-rel-submit" style="width:100%">Send Request</button>'
      +'<div id="bb-rel-msg" class="bb-links-empty" style="margin-top:6px"></div>'
    +'</div>';

    body.innerHTML=html;
    _bbWireRelationsForm(board);
    body.querySelectorAll('[data-relid]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var relId=btn.getAttribute('data-relid'), approve=btn.getAttribute('data-approve')==='1';
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('respond_board_adoption', {p_relation_id: relId, p_approve: approve});
          if(res.error){ window.alert(res.error.message||'Could not respond to that request.'); return; }
          await _bbLoadRelationsFull(true);
          await _bbRenderRelations();
          _bbRenderBoardPicker();
        }catch(e){ console.error('Briefing Board: could not respond to relationship request', e); window.alert('Could not respond to that request.'); }
      });
    });
  }

  function _bbWireRelationsForm(board){
    var sourceSel=document.getElementById('bb-rel-source');
    var ownRow=document.getElementById('bb-rel-own-row');
    var emailRow=document.getElementById('bb-rel-email-row');
    if(sourceSel) sourceSel.addEventListener('change', function(){
      var useEmail=sourceSel.value==='email';
      if(ownRow) ownRow.style.display=useEmail?'none':'';
      if(emailRow) emailRow.style.display=useEmail?'':'none';
    });
    var searchBtn=document.getElementById('bb-rel-email-search');
    if(searchBtn) searchBtn.addEventListener('click', async function(){
      var input=document.getElementById('bb-rel-email');
      var email=input?input.value.trim().toLowerCase():'';
      var sel=document.getElementById('bb-rel-email-board');
      var msg=document.getElementById('bb-rel-msg');
      if(!email || !sel) return;
      var sb=T().sb; if(!sb) return;
      try{
        var res=await sb.rpc('find_member_boards_by_email', {p_email: email});
        if(res.error || !res.data || !res.data.length){
          sel.innerHTML='<option>No boards found for that email</option>'; sel.disabled=true;
          if(msg) msg.textContent='No T2T member with an active board was found at that email.';
          return;
        }
        sel.innerHTML=res.data.map(function(r){ return '<option value="'+r.board_id+'">'+_esc(r.board_name)+' — '+_esc(_bbTypeLabel(r.board_type))+' ('+_esc(r.member_name)+')</option>'; }).join('');
        sel.disabled=false;
        if(msg) msg.textContent='';
      }catch(e){ console.error('Briefing Board: could not search for member boards', e); }
    });
    var submitBtn=document.getElementById('bb-rel-submit');
    if(submitBtn) submitBtn.addEventListener('click', async function(){
      var direction=document.getElementById('bb-rel-direction').value;
      var useEmail=document.getElementById('bb-rel-source').value==='email';
      var otherId=useEmail
        ? (document.getElementById('bb-rel-email-board')||{}).value
        : (document.getElementById('bb-rel-own-board')||{}).value;
      var msg=document.getElementById('bb-rel-msg');
      if(!otherId){ if(msg) msg.textContent='Pick a board first.'; return; }
      var childId = direction==='child' ? otherId : board.id;
      var parentId = direction==='child' ? board.id : otherId;
      var sb=T().sb; if(!sb) return;
      try{
        var res=await sb.rpc('request_board_adoption', {p_child_board_id: childId, p_parent_board_id: parentId, p_relation_label: 'project of'});
        if(res.error){ if(msg) msg.textContent=res.error.message||'Could not send that request.'; return; }
        if(msg) msg.textContent = (res.data && res.data.status==='approved') ? 'Connected.' : 'Request sent -- waiting on the other Owner.';
        await _bbLoadRelationsFull(true);
        await _bbRenderRelations();
        _bbRenderBoardPicker();
      }catch(e){ console.error('Briefing Board: could not request relationship', e); if(msg) msg.textContent='Could not send that request.'; }
    });
  }

  function openRelationsManager(){
    _bbRenderRelations();
    var ov=document.getElementById('bb-relations-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeRelationsManager(){
    var ov=document.getElementById('bb-relations-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireRelationsManager(){
    T().wire('bb-relations-close', closeRelationsManager);
    T().wire('bb-relations-btn', openRelationsManager);
  }

  // Project Hub, Aug 16 2026 -- backs the PROJECT field's (-) button.
  // Reloads the approved-relations cache fresh (not the cached
  // _bbRelationsFullCache) so Move always sees the true current parent
  // even if something changed in another tab.
  var _bbProjectHubBoardId = null;
  async function _bbReloadRelationsCache(){
    var sb=T().sb; if(!sb) return;
    try{
      var relRes=await sb.from('board_relations').select('*').eq('status','approved');
      _bbRelationsCache=relRes.error?_bbRelationsCache:(relRes.data||[]);
    }catch(e){ console.error('Briefing Board: could not reload board relations', e); }
  }
  function openProjectHub(boardId){
    _bbProjectHubBoardId = boardId;
    var board=_bbBoards.filter(function(b){ return b.id===boardId; })[0];
    var label=document.getElementById('bb-hub-board-label');
    if(label) label.textContent = board ? ((board.name||'This project')+' — '+_bbTypeLabel(board.board_type||'personal')) : 'This project';
    var msg=document.getElementById('bb-hub-msg'); if(msg) msg.textContent='';
    var ov=document.getElementById('bb-project-hub-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeProjectHub(){
    var ov=document.getElementById('bb-project-hub-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireProjectHub(){
    T().wire('bb-hub-close', closeProjectHub);
    T().wire('bb-hub-move-btn', async function(){
      var boardId=_bbProjectHubBoardId; if(!boardId) return;
      var msg=document.getElementById('bb-hub-msg');
      var parentRel=_bbRelationsCache.filter(function(r){ return r.child_board_id===boardId; })[0];
      if(parentRel){
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('detach_board_relation', {p_relation_id: parentRel.id});
          if(res.error){ if(msg) msg.textContent=res.error.message||'Could not detach from the current parent.'; return; }
        }catch(e){ console.error('Briefing Board: could not detach board relation', e); if(msg) msg.textContent='Could not detach from the current parent.'; return; }
        await _bbReloadRelationsCache();
        _bbRelationsFullCache=null;
        _bbRenderBoardPicker();
        _bbRenderOrgName();
      }
      closeProjectHub();
      openRelationsManager();
    });
    T().wire('bb-hub-archive-btn', function(){
      var msg=document.getElementById('bb-hub-msg');
      if(msg) msg.textContent='Archiving a whole project isn\'t built yet -- for now you can archive individual cards inside it.';
    });
    T().wire('bb-hub-trash-btn', function(){
      var msg=document.getElementById('bb-hub-msg');
      if(msg) msg.textContent='Trashing a whole project isn\'t built yet -- for now you can trash individual cards inside it.';
    });
  }

  // Team Roster -- board-level roles (Owner/Leader/Facilitator/Member),
  // separate from the Sharing list above (Sharing is just "who can see
  // this board," Team Roster is "what's their role on it"). Owner is
  // never a board_members row -- it's implicit via briefing_boards.user_id
  // -- so it's read separately and shown first, non-editable except by
  // being who they are.
  var _bbRosterCache = [];
  var _bbRosterOwner = null;
  var _bbRosterIsOwner = false;
  var _bbRosterIsLeader = false; // Aug 13 2026, Larry: Owner-or-Leader can now manage the Cast too
  var _bbRosterCanManage = false; // = _bbRosterIsOwner || _bbRosterIsLeader
  var _bbAllMembersCache = null; // list_members_for_picker() results, fetched once per session
  async function _bbFetchAllMembers(){
    if(_bbAllMembersCache) return _bbAllMembersCache;
    var sb=T().sb; if(!sb) return [];
    try{
      var res=await sb.rpc('list_members_for_picker');
      _bbAllMembersCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _bbAllMembersCache=[]; }
    return _bbAllMembersCache;
  }
  function _bbRenderMemberSuggestions(query, targetId){
    var box=document.getElementById(targetId||'bb-team-add-suggest'); if(!box) return;
    var already={}; _bbAllRosterRows().forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    var pool=(_bbAllMembersCache||[]).filter(function(m){ return !already[m.user_id]; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone\u2019s already in this Cast.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  function _bbRoleSymbol(m){
    if(m.isOwner) return '\uD83D\uDC51';
    if(m.role==='sponsor') return '\uD83C\uDF31';
    if(m.role==='leader') return '\uD83C\uDFAF';
    if(m.is_facilitator) return '\uD83C\uDFA4';
    if(m.can_facilitate) return '\u2726';
    return '\u2610';
  }
  function _bbRoleTitle(m){
    if(m.isOwner) return 'Owner';
    if(m.role==='sponsor') return 'Sponsor';
    if(m.role==='leader') return 'Leader';
    if(m.is_facilitator) return 'Facilitator';
    if(m.can_facilitate) return 'Facilitator-qualified';
    return 'Cast Member';
  }

  async function _bbLoadRoster(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return;
    var uid=await _bbCurrentUserId();
    _bbRosterIsOwner = !!uid && board.user_id===uid;
    var sb=T().sb; if(!sb) return;
    try{
      var ownerRes=await sb.from('members').select('user_id,name,email,initials,phone').eq('user_id', board.user_id).maybeSingle();
      _bbRosterOwner = (!ownerRes.error && ownerRes.data) ? ownerRes.data : null;
    }catch(e){ _bbRosterOwner=null; }
    try{
      var res=await sb.rpc('list_board_members', {p_board_id: board.id});
      // View-only visitors (Aug 8 2026) aren't Team members -- they show
      // up in Sharing/Manage Access only, not in the role-based roster.
      _bbRosterCache = (!res.error && res.data) ? res.data.filter(function(m){ return (m.access_level||'edit')==='edit'; }) : [];
    }catch(e){ _bbRosterCache=[]; }
    // Owner-or-Leader (Aug 13 2026, Larry): a Leader can now add members
    // and change others' roles too, everywhere that ability exists --
    // Gear's Team screen and the VIEW dropdown's own add-row.
    _bbRosterIsLeader = !!uid && (_bbRosterCache||[]).some(function(m){ return String(m.user_id)===String(uid) && m.role==='leader'; });
    _bbRosterCanManage = _bbRosterIsOwner || _bbRosterIsLeader;
  }

  function _bbAllRosterRows(){
    var rows=[];
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(_bbRosterOwner) rows.push({user_id:_bbRosterOwner.user_id, name:_bbRosterOwner.name, email:_bbRosterOwner.email, phone:_bbRosterOwner.phone, isOwner:true, role:null, can_facilitate:true, is_facilitator:false, notes:(board&&board.owner_notes)||''});
    (_bbRosterCache||[]).forEach(function(m){ rows.push({user_id:m.user_id, name:m.name, email:m.email, phone:m.phone, isOwner:false, role:m.role, can_facilitate:m.can_facilitate, is_facilitator:m.is_facilitator, notes:m.notes||''}); });
    return rows;
  }

  function _bbRenderRoster(){
    var wrap=document.getElementById('bb-team-list-view'); if(!wrap) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var nameEl=document.getElementById('bb-team-groupname');
    if(nameEl){ nameEl.value=(board && (board.topic||board.name))||''; nameEl.disabled=!_bbRosterIsOwner; }
    var rows=_bbAllRosterRows();
    wrap.innerHTML = rows.map(function(m){
      var clickable = (!m.isOwner && _bbRosterCanManage);
      var panel = (!m.isOwner) ? (
        '<div class="tm-rolepanel" id="tm-rp-'+_esc(m.user_id)+'" style="display:none">'
          +'<label><input type="radio" name="tm-sp" class="tm-r-sponsor" data-uid="'+_esc(m.user_id)+'"'+(m.role==='sponsor'?' checked':'')+'> \uD83C\uDF31 Sponsor</label>'
          +'<label><input type="radio" name="tm-tl" class="tm-r-leader" data-uid="'+_esc(m.user_id)+'"'+(m.role==='leader'?' checked':'')+'> \uD83C\uDFAF Leader</label>'
          +'<label><input type="checkbox" class="tm-r-canfac" data-uid="'+_esc(m.user_id)+'"'+(m.can_facilitate?' checked':'')+'> \u2726 Facilitator-qualified</label>'
          +'<label><input type="radio" name="tm-fac" class="tm-r-fac" data-uid="'+_esc(m.user_id)+'"'+(m.is_facilitator?' checked':'')+'> \uD83C\uDFA4 Facilitator</label>'
        +'</div>'
      ) : '';
      var contactLine, notesLine;
      if(m.isOwner){
        contactLine = '<div class="tm-contact">\u2709 '+_esc(m.email||'')+' &nbsp;&nbsp; \u260E <input type="text" class="tm-phone-input tm-owner-phone" placeholder="Add phone" value="'+_esc(m.phone||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input tm-owner-notes" placeholder="\u2014" value="'+_esc(m.notes||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
      } else {
        var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc(m.phone)) : '';
        contactLine = '<div class="tm-contact">\u2709 '+_esc(m.email||'')+phoneLine+'</div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input" data-uid="'+_esc(m.user_id)+'" placeholder="\u2014" value="'+_esc(m.notes||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
      }
      return '<div class="tm-row">'
        +'<div class="tm-sym'+(clickable?' tm-clickable':'')+'" '+(clickable?'data-uid="'+_esc(m.user_id)+'"':'')+'>'+_bbRoleSymbol(m)+'</div>'
        +'<div class="tm-body">'
          +'<div class="tm-name">'+_esc(m.name||m.email||'')+' <span class="tm-role">&middot; '+_bbRoleTitle(m)+'</span></div>'
          +contactLine
          +notesLine
          +panel
        +'</div>'
      +'</div>';
    }).join('');
    var addTile=document.getElementById('bb-team-add');
    if(addTile) addTile.style.display = _bbRosterCanManage ? 'flex' : 'none';
  }

  async function _bbSaveMemberRole(uid, role, canFac, isFac){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
    var sb=T().sb; if(!sb) return;
    try{ await sb.rpc('update_board_member', {p_board_id: board.id, p_user_id: uid, p_role: role, p_can_facilitate: canFac, p_is_facilitator: isFac}); }catch(e){}
    await _bbLoadRoster(); _bbRenderRoster();
  }

  async function _bbSaveMemberNotes(uid, notes){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
    var sb=T().sb; if(!sb) return;
    try{ await sb.rpc('update_board_member_notes', {p_board_id: board.id, p_user_id: uid, p_notes: notes}); }catch(e){}
  }

  async function _bbSaveOwnerNotes(notes){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board || !_bbRosterIsOwner) return;
    var sb=T().sb; if(!sb) return;
    board.owner_notes=notes;
    try{ await sb.from('briefing_boards').update({owner_notes: notes}).eq('id', board.id); }catch(e){}
  }

  async function _bbSaveOwnerPhone(phone){
    if(!_bbRosterIsOwner) return;
    var sb=T().sb; if(!sb) return;
    if(_bbRosterOwner) _bbRosterOwner.phone=phone;
    try{ await sb.rpc('update_board_owner_contact', {p_phone: phone}); }catch(e){}
  }

  async function _bbTeamAddMember(email){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return {ok:false,msg:'No board selected.'};
    var rows=_bbAllRosterRows();
    var cap=board.member_cap||7;
    if(rows.length>=cap) return {ok:false,msg:'This board is at its '+cap+'-person cap.'};
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await sb.rpc('find_member_by_email', {p_email: String(email||'').trim().toLowerCase()});
      var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
      if(!match) return {ok:false,msg:'No T2T member found with that email.'};
      var myUid=await _bbCurrentUserId();
      var ins=await sb.from('board_members').insert({board_id: board.id, user_id: match.user_id, added_by: myUid, access_level: 'edit'});
      if(ins.error) return {ok:false,msg:ins.error.message||'Could not add them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not add them.'}; }
  }

  async function _bbTeamRemoveMember(uid){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return {ok:false,msg:'No board selected.'};
    if(String(uid)===String(board.user_id)) return {ok:false,msg:'The Owner can\'t be removed.'};
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var del=await sb.from('board_members').delete().eq('board_id', board.id).eq('user_id', uid);
      if(del.error) return {ok:false,msg:del.error.message||'Could not remove them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not remove them.'}; }
  }

  async function _bbViewConfirmRemoveMember(uid){
    var errEl=document.getElementById('bb-view-remove-error');
    var res=await _bbTeamRemoveMember(uid);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    await _bbLoadRoster();
    await _bbRenderSourcePicker();
  }

  function openTeamRoster(){
    _bbLoadRoster().then(_bbRenderRoster);
    var ov=document.getElementById('bb-team-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeTeamRoster(){
    var ov=document.getElementById('bb-team-overlay'); if(ov) ov.classList.remove('active');
    var addRow=document.getElementById('bb-team-add-row'); if(addRow) addRow.style.display='none';
    var errEl=document.getElementById('bb-team-error'); if(errEl) errEl.style.display='none';
    var sugg=document.getElementById('bb-team-add-suggest'); if(sugg) sugg.style.display='none';
    _bbOpenSettingsAt('people');
  }

  async function _bbConfirmAddMember(email){
    var input=document.getElementById('bb-team-add-email');
    var errEl=document.getElementById('bb-team-error');
    var sugg=document.getElementById('bb-team-add-suggest');
    if(!email) return;
    var res=await _bbTeamAddMember(email);
    if(!res.ok){
      if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; }
      return;
    }
    if(errEl) errEl.style.display='none';
    if(input) input.value='';
    if(sugg) sugg.style.display='none';
    var row=document.getElementById('bb-team-add-row'); if(row) row.style.display='none';
    await _bbLoadRoster(); _bbRenderRoster();
  }

  function wireTeamRoster(){
    T().wire('bb-team-close', closeTeamRoster);
    T().wire('bb-team-print', function(){ window.print(); });
    T().wire('bb-team-add', function(){
      if(!_bbRosterCanManage) return;
      var row=document.getElementById('bb-team-add-row');
      var opening = row && row.style.display==='none';
      if(row) row.style.display = opening ? 'flex' : 'none';
      if(opening){
        _bbFetchAllMembers().then(function(){ _bbRenderMemberSuggestions(''); });
      } else {
        var sugg=document.getElementById('bb-team-add-suggest'); if(sugg) sugg.style.display='none';
      }
    });
    var emailInput=document.getElementById('bb-team-add-email');
    if(emailInput){
      emailInput.addEventListener('input', function(){ _bbRenderMemberSuggestions(emailInput.value); });
      emailInput.addEventListener('focus', function(){ _bbRenderMemberSuggestions(emailInput.value); });
    }
    var suggBox=document.getElementById('bb-team-add-suggest');
    if(suggBox){
      suggBox.addEventListener('click', function(e){
        var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
        _bbConfirmAddMember(row.getAttribute('data-email'));
      });
    }
    var confirmBtn=document.getElementById('bb-team-add-confirm');
    if(confirmBtn) confirmBtn.addEventListener('click', async function(){
      var input=document.getElementById('bb-team-add-email');
      var email=input?input.value.trim():'';
      await _bbConfirmAddMember(email);
    });
    var nameEl=document.getElementById('bb-team-groupname');
    if(nameEl) nameEl.addEventListener('change', async function(){
      if(!_bbRosterIsOwner) return;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
      var sb=T().sb; if(!sb) return;
      board.topic=nameEl.value;
      try{ await sb.from('briefing_boards').update({topic: nameEl.value}).eq('id', board.id); }catch(e){}
    });
    var wrap=document.getElementById('bb-team-list-view');
    if(wrap){
      wrap.addEventListener('click', function(e){
        var sym=e.target.closest('.tm-clickable'); if(!sym) return;
        var p=document.getElementById('tm-rp-'+sym.getAttribute('data-uid'));
        if(p) p.style.display = (p.style.display==='none') ? 'block' : 'none';
      });
      wrap.addEventListener('change', async function(e){
        var t=e.target;
        if(t.classList.contains('tm-r-sponsor') || t.classList.contains('tm-r-leader') || t.classList.contains('tm-r-canfac') || t.classList.contains('tm-r-fac')){
          var uid=t.getAttribute('data-uid');
          var panel=document.getElementById('tm-rp-'+uid); if(!panel) return;
          if(t.classList.contains('tm-r-sponsor') && t.checked){ panel.querySelector('.tm-r-leader').checked=false; }
          if(t.classList.contains('tm-r-leader') && t.checked){ panel.querySelector('.tm-r-sponsor').checked=false; }
          var role = panel.querySelector('.tm-r-sponsor').checked ? 'sponsor' : (panel.querySelector('.tm-r-leader').checked ? 'leader' : null);
          var canFac = panel.querySelector('.tm-r-canfac').checked;
          var isFac = panel.querySelector('.tm-r-fac').checked;
          await _bbSaveMemberRole(uid, role, canFac, isFac);
        } else if(t.classList.contains('tm-owner-notes')){
          await _bbSaveOwnerNotes(t.value);
        } else if(t.classList.contains('tm-owner-phone')){
          await _bbSaveOwnerPhone(t.value);
        } else if(t.classList.contains('tm-notes-input')){
          await _bbSaveMemberNotes(t.getAttribute('data-uid'), t.value);
        }
      });
    }
  }

  function wirePriorityButtons(){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbFindCardAnywhere(_bbOpenCardId);
          if(!c) return;
          var _bbMoveBefore=_bbSnapshotCard(c);
          var base=btn.getAttribute('data-pri-base');
          c.priority=_bbNextPriority(c.priority||'', base);
          // July 22, 2026: keep the card in the Do column matching its
          // new priority family, IF it's currently sitting in one of
          // the 3 Do columns at all (a card in Doing/Done/Hang-Ups can
          // still have its priority changed here without being yanked
          // back into Do).
          if(_bbIsDoCol(c.col)){ c.col=_bbDoColKey(c.priority); _bbResortDoColumnByPriority(c.col); }
          _bbStampDateEscalationHandled(c);
          _bbSaveLocal(_bbCardsList());
          _bbLogCardMove(c, _bbMoveBefore);
          _bbHighlightPriority(c.priority);
          renderBoard();
        });
      })(btns[i]);
    }
  }

  // Rename, Aug 3 2026 -- Larry: "How can a traveler edit the name of
  // the Briefing Board?" There wasn't a way; the only place a name ever
  // got typed in was "+ Add a board...". Originally a small pencil
  // button next to NAME; Aug 13 2026 (Larry, "exactly like the Idea
  // Board"): the pencil is gone, double-click the Title trigger instead
  // -- same rename-in-place result, same interaction as the Idea
  // Board's own Title (see wireTopicBar's dblclick wiring below).
  async function _bbRenameCurrentBoard(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board){ window.alert('No board is open yet -- nothing to rename.'); return; }
    var newName=window.prompt('Rename this board:', board.name||'');
    if(newName===null) return;
    newName=newName.trim();
    if(!newName || newName===board.name) return;
    var sb=T().sb;
    try{
      var res=await sb.from('briefing_boards').update({name:newName}).eq('id', board.id).select().single();
      if(res.error){
        console.error('Briefing Board: could not rename board', res.error);
        window.alert('Could not rename the board. Error: '+(res.error.message||'unknown error')+'. Nothing was saved -- please try again.');
        return;
      }
      board.name = newName;
      _bbRenderBoardPicker();
    }catch(e){
      console.error('Briefing Board: could not rename board', e);
      window.alert('Could not rename the board. Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again.');
    }
  }

  function wireTopicBar(){
    // Type/Title dropdowns wire themselves fresh on every render now
    // (Aug 13 2026 -- see _bbRenderDropdown), no separate wire step.
    // Title's double-click-to-rename is wired once here instead, same
    // as the Idea Board's own Title trigger -- the button element
    // itself is never replaced across renders, only its text/menu.
    var boardTrigger=document.getElementById('bb-board-trigger');
    if(boardTrigger) boardTrigger.addEventListener('dblclick', function(e){
      e.stopPropagation();
      _bbRenameCurrentBoard();
    });
    // Organization's Name click-to-edit is wired fresh on every render
    // in _bbRenderOrgName() itself (bb-org-name-trigger.onclick), same
    // pattern as the Type dropdown -- nothing to wire once here anymore.
    T().wire('bb-close-x', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    T().wire('bb-hx-btn', openHX);
    T().wire('bb-hx-close', closeHX);
    T().wire('bb-hx-archive-btn', function(){ closeHX(); openArchive(); });
    T().wire('bb-hx-briefinglog-btn', function(){ closeHX(); openBriefingLog(); });
    T().wire('bb-archive-close', closeArchive);
    T().wire('bb-archive-back', function(){ closeArchive(); openHX(); });
    T().wire('bb-briefinglog-close', closeBriefingLog);
    T().wire('bb-briefinglog-back', function(){ closeBriefingLog(); openHX(); });
    T().wire('bb-gear', openSettings);
    // Double-click the board's own background (not a card) opens the same
    // Board Settings the gear does -- Color Theme is the first field in that
    // panel, so this is BB's version of the traveler color-options shortcut
    // locked July 27, 2026 (matches the Storyboard/Session board-background
    // double-click, which opens its own bg picker the same way).
    var bbBoardWrapEl=document.getElementById('bb-board-wrap');
    if(bbBoardWrapEl) bbBoardWrapEl.addEventListener('dblclick', function(e){
      if(e.target.closest('.bb-card')) return;
      openSettings();
    });
    T().wire('bb-settings-close', function(){
      if(_bbSettingsScreen==='home') closeSettings();
      else _bbRenderSettingsScreen('home');
    });
  }

  // Idea Board, Aug 11 2026 -- unified button, every card. Replaces
  // the old Hang-Up-only "Unhooking Ideas" (July 21 2026) AND the
  // header-linked-card-only "Open on Idea Storyboard" (earlier this
  // session) with one control that does either job depending on
  // whether c.sourceHeaderId is already set:
  //   - Linked already -- open that header, new tab. No header is
  //     created here; this card already points at one.
  //   - Not linked -- Larry's idea this session: a card with no home on
  //     any board yet (his example: "Routine Cards protocol" sitting on
  //     the Briefing Board with nowhere to actually develop it) gets a
  //     brand-new blank Idea Board on the spot, named after its own
  //     task text (promoted straight into the new board's TOPIC name --
  //     "Routine Cards protocol as the TOPIC," per Larry's framing).
  //     For a Hang-Up card specifically, the Situation still seeds in
  //     as the new header's first idea, exactly like Unhooking Ideas
  //     always did. Links back via source_header_id so the very next
  //     open just reopens the same header instead of spawning a
  //     duplicate.
  // New-tab handoff both ways: same sessionStorage bp_target already
  // used for cross-file landing (cloned into the new tab automatically,
  // same-origin) plus fg_open_header_id, which _ideaOpenBoardResume
  // (idea-media-shared.js) checks for and consumes.
  // Deliberately does NOT touch track_on_briefing_board or go through
  // the ideas_sync_header_task_card trigger -- a brand-new blank board
  // is always a root-level header (no parent), and roots never get an
  // auto-managed task card (same rule that keeps sub-headers out) --
  // this card IS that header's task card, hand-linked, not trigger-
  // managed, so its own task text is never overwritten.
  async function _bbOpenOrCreateIdeaHeader(){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(!c) return;
    if(c.sourceHeaderId){
      try{
        sessionStorage.setItem('bp_target','1010');
        sessionStorage.setItem('fg_open_header_id', c.sourceHeaderId);
      }catch(e){}
      window.open(location.pathname+location.search, '_blank');
      return;
    }
    var taskField=document.getElementById('bb-d-task');
    var situationField=document.getElementById('bb-d-situation');
    var situationText=(c.col==='hangups' && situationField) ? situationField.value.trim() : '';
    c.situation=situationText;
    var btn=document.getElementById('bb-d-open-header');
    if(btn){ btn.disabled=true; btn.classList.add('bb-icon-loading'); btn.title='Opening…'; }
    try{
      if(!window.T2TData || !window.T2TData.createHeader) throw new Error('Storyboard not available yet');
      var name=(taskField && taskField.value.trim()) || c.task || 'Untitled';
      var header=await window.T2TData.createHeader(name, null);
      if(situationText && T().sb){
        var ures=await T().sb.auth.getUser();
        var uid=ures && ures.data && ures.data.user && ures.data.user.id;
        if(uid){
          await T().sb.from('ideas').insert({user_id:uid, content_type:'text', text_content:situationText, cluster_id:header.id, created_at:new Date().toISOString()});
        }
      }
      var linkUpd=await T().sb.from('briefing_cards').update({source_header_id:header.id, topic_label:name}).eq('id', c.id);
      if(linkUpd.error) throw linkUpd.error;
      c.sourceHeaderId=header.id;
      c.topicLabel=name;
      _bbSaveLocal(_bbCardsList());
      try{
        sessionStorage.setItem('bp_target','1010');
        sessionStorage.setItem('fg_open_header_id', header.id);
      }catch(e){}
      window.open(location.pathname+location.search, '_blank');
      if(btn){ btn.disabled=false; btn.classList.remove('bb-icon-loading'); btn.title='Open on Idea Storyboard'; }
    }catch(e){
      console.error('Idea Board: could not create/link header', e);
      if(btn){ btn.disabled=false; btn.classList.remove('bb-icon-loading'); btn.title='Idea Board'; }
      alert('Could not open the Idea Board: '+(e&&e.message?e.message:'unknown error'));
    }
  }

  function _bbUpdateReviewUI(c){
    var vBtn=document.getElementById('bb-d-verify');
    var pBtn=document.getElementById('bb-d-pro');
    var gBtn=document.getElementById('bb-d-grow');
    if(vBtn) vBtn.classList.toggle('bb-flag-active', !!c.verified);
    if(pBtn) pBtn.classList.toggle('bb-flag-active', !!c.pro);
    if(gBtn) gBtn.classList.toggle('bb-flag-active', !!c.grow);
    var lBtn=document.getElementById('bb-d-lock');
    if(lBtn){
      // Icon-only, Session 234 (Aug 21) -- moved down into the bottom
      // action row (Larry: the old full-width top button was "too in
      // your face"). Title still carries the full sentence.
      lBtn.classList.toggle('bb-lock-active', !!c.locked);
      lBtn.textContent = c.locked ? '\uD83D\uDD12' : '\uD83D\uDD13';
      lBtn.title = c.locked ? 'Locked — click to unlock. This card is parked. Unlocking lets it compete for priority again.' : 'Lock — pause this card. It will stay here, marked, until you unlock it.';
    }
  }

  function wireReviewButtons(){
    // PRO and GROW are performance-eval tags -- click to flag, click
    // again to clear, same pattern as Signal flag. Neither one gates
    // anything; they just ride along on the card's history.
    T().wire('bb-d-pro', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c) return;
      c.pro=!c.pro;
      _bbSaveLocal(_bbCardsList());
      _bbUpdateReviewUI(c);
    });
    T().wire('bb-d-grow', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c) return;
      c.grow=!c.grow;
      _bbSaveLocal(_bbCardsList());
      _bbUpdateReviewUI(c);
      var wrap=document.getElementById('bb-d-grow-note-wrap');
      if(wrap){
        wrap.style.display=c.grow?'':'none';
        if(c.grow){ var ta=document.getElementById('bb-d-grow-note'); if(ta) ta.focus(); }
      }
    });
    // Verified complete is the ONLY thing that signals removal to the
    // archive -- Larry, July 20: no separate Archive button needed.
    // Only does anything while the card is actually sitting in Done;
    // elsewhere it's a quiet no-op (another hidden Mickey -- the action
    // exists for later, nothing to explain about it now).
    T().wire('bb-d-verify', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c || c.col!=='done') return;
      c.verified=true;
      c.archived=true;
      _bbSaveLocal(_bbCardsList());
      closeCardDetail();
    });
  }

  function wireLockButton(){
    T().wire('bb-d-lock', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c) return;
      if(c.locked){
        // Unlock -- no prompt needed. Header follows via the
        // ideas_sync_header_lock DB trigger once this card's own
        // locked flag clears.
        c.locked=false;
        c.lockReason='';
        _bbUpdateReviewUI(c);
        closeCardDetail();
        return;
      }
      // Lock, Session 211 (Aug 15) -- Larry: a lock always pauses the
      // header too, and has exactly two honest outcomes for the card:
      // the work's actually done (move to Done, same as normal), or
      // it's genuinely incomplete and needs to wait (stays right where
      // it is, marked, out of priority ranking -- that's the Hang-Up:
      // it started before its rightful turn). Plain confirm() dialogs,
      // matching the existing window.confirm/window.prompt pattern used
      // elsewhere in this file.
      if(!window.confirm('Lock this card? It will pause here until you unlock it.')) return;
      var isDone=window.confirm('Is the work actually finished? OK = Yes, move it to Done. Cancel = No, it still needs to happen -- park it here until its time.');
      if(isDone){
        var wasCol=c.col;
        c.col='done';
        if(!c.completedDate) c.completedDate=_bbToday();
        if(wasCol==='hangups') c.hangupSince='';
      } else {
        c.locked=true;
        c.lockReason='in_process';
      }
      _bbUpdateReviewUI(c);
      closeCardDetail();
      // Header lock set directly here too (not just left to the DB
      // trigger) so it's immediate even on the Done path, which never
      // touches this card's own locked column. Fired after
      // closeCardDetail's own card save so the card's real column
      // (esp. 'done') is already on its way to the database first --
      // the header-side trigger skips Done cards, but only once the
      // database actually agrees this card is Done.
      if(c.sourceHeaderId){
        try{
          var sb=T().sb;
          if(sb) sb.from('ideas').update({locked:true}).eq('id', c.sourceHeaderId).then(function(){}, function(){});
        }catch(e){}
      }
    });
  }

  // Color swatch row (⚙️ Gear), Session 234 (Aug 21) -- same palette and
  // "circle with a ring when selected" look as the Idea Card's own
  // sb-swatch row, rebuilt fresh every time the card detail opens (this
  // overlay is a permanent DOM node reused across cards, never rebuilt
  // from scratch, so the selected-swatch highlight has to be redrawn
  // per-card the same way _bbHighlightPriority/_bbUpdateReviewUI are).
  function _bbRenderColorSwatches(c){
    var row=document.getElementById('bb-d-color-row'); if(!row) return;
    row.innerHTML = BB_COLOR_PALETTE.map(function(clr){
      var active=(c.color===clr)?' bb-swatch-active':'';
      return '<button type="button" class="bb-swatch'+active+'" data-c="'+_esc(clr)+'" style="background:'+_esc(clr)+'" title="Card color"></button>';
    }).join('');
    row.onclick=function(e){
      var btn=e.target.closest('.bb-swatch'); if(!btn) return;
      var clr=btn.getAttribute('data-c');
      if(clr===c.color) return;
      var before=c.color;
      c.color=clr;
      _bbSaveLocal(_bbCardsList());
      _bbRenderColorSwatches(c);
      renderBoard();
      _bbPushAction({label:'Edit', undo:function(){ _bbApplyColor(c.id, before); }, redo:function(){ _bbApplyColor(c.id, clr); }});
    };
  }

  // Bottom action row (Lock is wired separately, wireLockButton), Session
  // 234 (Aug 21) -- Larry: "add the same bottom row as on the IDEA CARD
  // to the BB Cards? lock - twin heads - gear - trash".
  function wireBbDetailActions(){
    // 👥 People -- reuses the Idea Card's own Call Sheet/star system via
    // the T2TStoryboard bridge (idea-storyboard-9710.js), generalized for
    // card_type:'briefing_card'. This is now the one place to put
    // someone on a Briefing Card -- see the retired Assigned to field,
    // just above _bbInitials.
    T().wire('bb-d-people', function(e){
      e.stopPropagation();
      var c=_bbFindCardAnywhere(_bbOpenCardId); if(!c) return;
      if(window.T2TStoryboard && T2TStoryboard.openPeopleDropdown){
        T2TStoryboard.openPeopleDropdown(
          document.getElementById('bb-d-people'), c,
          function(){ openCardDetail(c.id); },
          'briefing_card', document.getElementById('bb-people-menu')
        );
      }
    });

    // ⚙️ Gear -- toggles the color swatch row. New for Briefing Cards
    // (no per-card color existed before this); built for bottom-row
    // parity with the Idea Card's own Appearance gear.
    T().wire('bb-d-gear', function(e){
      e.stopPropagation();
      var row=document.getElementById('bb-d-color-row'); if(!row) return;
      row.style.display=(row.style.display==='none'||!row.style.display)?'flex':'none';
    });

    // 🗑️ Trash -- same "Moose poop?" confirm dragging a card to the
    // trash can already triggers (openTrashConfirm/doTrashCard); just
    // reachable straight from inside the card now too.
    T().wire('bb-d-trash', function(){
      if(_bbOpenCardId) openTrashConfirm(_bbOpenCardId);
    });
  }

  function wireLinkField(){
    var input=document.getElementById('bb-d-link-url');
    if(input) input.addEventListener('input', function(){
      var val=input.value.trim();
      if(_bbLinkTimer) clearTimeout(_bbLinkTimer);
      if(!val){ _bbLinkPendingUrl=null; _bbLinkPendingThumb=null; _bbLinkPendingTitle=null; _bbRenderLinkPreview(null); return; }
      if(!_bbIsBareUrl(val)) return; // still mid-paste/typing -- wait for a clean URL
      _bbLinkTimer=setTimeout(async function(){
        var meta=(window.T2TMedia && window.T2TMedia.resolveOEmbed) ? await window.T2TMedia.resolveOEmbed(val) : null;
        if(input.value.trim()!==val) return; // superseded by further typing meanwhile
        _bbLinkPendingUrl=val;
        _bbLinkPendingThumb=meta&&meta.thumbnail_url||null;
        _bbLinkPendingTitle=meta&&meta.title||val;
        _bbRenderLinkPreview(_bbLinkPendingUrl, _bbLinkPendingThumb, _bbLinkPendingTitle);
      }, 500);
    });
    T().wire('bb-d-link-clear', function(){
      if(_bbLinkTimer){ clearTimeout(_bbLinkTimer); _bbLinkTimer=null; }
      _bbLinkPendingUrl=null; _bbLinkPendingThumb=null; _bbLinkPendingTitle=null;
      var linkInput=document.getElementById('bb-d-link-url'); if(linkInput) linkInput.value='';
      _bbRenderLinkPreview(null);
    });
  }
  // Additions, Aug 27 2026 -- checking a box opens its section and
  // saves immediately (matching the routine-card 🔄 toggle just below,
  // not the bundled Edit-on-close fields); unchecking just hides the
  // section again -- whatever was already typed in there stays put, so
  // re-checking it later brings it right back.
  function wireAdditionToggles(){
    BB_ADDITIONS.forEach(function(a){
      var cb=document.getElementById(a.cb);
      if(!cb) return;
      cb.addEventListener('change', function(){
        var c=_bbFindCardAnywhere(_bbOpenCardId);
        if(!c) return;
        c[a.flag]=cb.checked;
        var body=document.getElementById(a.body);
        if(body) body.style.display=cb.checked?'':'none';
        _bbSaveLocal(_bbCardsList());
      });
    });
  }
  // Header toggle button removed Aug 27 2026 -- c.routine is now set
  // only as a side effect of picking a frequency below (still the same
  // c.routine flag, still tints the card via .bb-routine-active, still
  // shows the front-tile badge -- just no more standalone button to
  // flip it on its own).
  function wireRoutineControls(){
    var sel=document.getElementById('bb-d-routine');
    if(sel) sel.addEventListener('change', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c) return;
      c.routineFreq=sel.value;
      var custom=document.getElementById('bb-d-routine-custom');
      if(custom) custom.style.display = (sel.value==='custom') ? '' : 'none';
      if(sel.value){
        c.routine=true;
        var card=document.querySelector('#bb-detail-overlay .bb-overlay-card');
        if(card) card.classList.add('bb-routine-active');
      }
      _bbSaveLocal(_bbCardsList());
      renderBoard();
    });
    var custom=document.getElementById('bb-d-routine-custom');
    if(custom) custom.addEventListener('change', function(){
      var c=_bbFindCardAnywhere(_bbOpenCardId);
      if(!c) return;
      c.routineCustom=custom.value;
      _bbSaveLocal(_bbCardsList());
    });
  }

  // ── LIVE SYNC (Aug 4 2026) ── reacts to changes pushed by backpack.js's
  // shared realtime channel (see startRealtimeSync there). A remote
  // change updates this board's own in-memory state the same way a
  // local save already does, then re-renders -- deferred/coalesced so
  // a burst of events (e.g. someone else's whole-board save, which
  // upserts every card row) doesn't hammer the DOM with a render per
  // row, and paused entirely while a card is mid-drag.
  var _bbRtPendingRender = false, _bbRtTimer = null;
  function _bbRtSafeRender(){
    if (T().isDragActive()) { _bbRtPendingRender = true; return; }
    if (_bbRtTimer) clearTimeout(_bbRtTimer);
    _bbRtTimer = setTimeout(function(){ _bbRtTimer = null; renderBoard(); }, 300);
  }
  window.addEventListener('t2t:drag-end', function(){
    if (_bbRtPendingRender) { _bbRtPendingRender = false; _bbRtSafeRender(); }
  });
  var _bbRtForeignTimer = null, _bbRtSharedInTimer = null;
  function _bbRtRefreshForeign(){
    if (_bbRtForeignTimer) clearTimeout(_bbRtForeignTimer);
    _bbRtForeignTimer = setTimeout(function(){
      _bbRtForeignTimer = null;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      if(!board) return;
      _bbLoadForeignCardsForPersonalBoard(board).then(_bbRtSafeRender);
    }, 300);
  }
  function _bbRtRefreshSharedIn(){
    if (_bbRtSharedInTimer) clearTimeout(_bbRtSharedInTimer);
    _bbRtSharedInTimer = setTimeout(function(){
      _bbRtSharedInTimer = null;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      if(!board) return;
      _bbLoadSharedInCardsForProjectBoard(board).then(_bbRtSafeRender);
    }, 300);
  }
  function _bbApplyRemoteCard(evt, row, oldRow){
    var boardId = row ? row.board_id : (oldRow ? oldRow.board_id : null);
    // Merged-view fix, Aug 14 2026 -- Larry: "when I change the
    // assignment, the card should disappear from the personal board."
    // Root cause: a Personal BB's read-through cards and a project
    // board's shared-in cards live under a board_id/shared_to_board_id
    // that's never the SAME as _bbCurrentBoardId, so the early return
    // just below used to throw away every remote change to them --
    // reassigning a card away from someone didn't drop it off their
    // Personal BB live, a newly-assigned card didn't appear, and a
    // status change on the real home board never showed up in the
    // mirror. Either merge just gets a light, debounced re-fetch (not a
    // precise in-place patch) on any card event that could plausibly
    // touch it, since re-running the same query the merge was built from
    // is simpler than trying to reconstruct the same filtering here.
    var curBoard = _bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if (curBoard && boardId !== _bbCurrentBoardId) {
      if (curBoard.board_type==='personal') { _bbRtRefreshForeign(); return; }
      var sharedTo = row ? row.shared_to_board_id : null;
      var oldSharedTo = oldRow ? oldRow.shared_to_board_id : null;
      if (sharedTo===_bbCurrentBoardId || oldSharedTo===_bbCurrentBoardId) { _bbRtRefreshSharedIn(); return; }
    }
    if (boardId !== _bbCurrentBoardId) return; // not the board currently open in this tab
    var list = _bbCardsList();
    if (evt === 'DELETE') {
      if (!oldRow) return;
      _bbCards = list.filter(function(c){ return c.id !== oldRow.id; });
      if (_bbOpenCardId === oldRow.id) closeCardDetail();
    } else {
      var card = _bbRowToCard(row);
      var idx = -1;
      for (var i=0;i<list.length;i++){ if (list[i].id === card.id) { idx=i; break; } }
      if (idx !== -1) list[idx] = card; else list.push(card);
      _bbCards = list;
    }
    _bbRtSafeRender();
  }
  function _bbApplyRemoteChecklist(evt, row, oldRow){
    var cardId = (row && row.card_id) || (oldRow && oldRow.card_id);
    if (cardId && cardId === _bbOpenCardId) _bbLoadChecklistForCard(cardId);
  }
  function _bbApplyRemoteKey(evt, row, oldRow){
    if (!_bbKeyLibraryLoaded) return; // library not fetched in this tab yet -- nothing cached to patch
    if (evt === 'DELETE') {
      if (!oldRow) return;
      _bbKeyLibCache = _bbKeyLibCache.filter(function(k){ return String(k.id) !== String(oldRow.id); });
    } else {
      var idx = -1;
      for (var i=0;i<_bbKeyLibCache.length;i++){ if (String(_bbKeyLibCache[i].id) === String(row.id)) { idx=i; break; } }
      if (idx !== -1) _bbKeyLibCache[idx] = row; else _bbKeyLibCache.push(row);
    }
    _bbRtSafeRender();
  }

  function wireBriefingBoard(){
    T().wire('b-bb-mg', T().goMG);
    // July 22, 2026, Larry: the Briefing Board is "one of the most
    // important places" for the reload-and-return shortcut -- burying
    // it one tap deep inside the \U0001F50D Jump-to-menu overlay (where it
    // first landed) wasn't good enough. Same T().resetAndReturn() as the
    // backpack menu's \U0001F504, just surfaced directly in this board's
    // own icon row alongside HX/gear/close.
    T().wire('bb-reset', T().resetAndReturn);

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
      cards.push({id:_bbUUID(), col:'new', sortOrder:maxOrder+1, assigned:_bbToday(), task:text, person:_bbCurrentBoardDefaultAssignee(), due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false, reviewedBy:REVIEWERS[0], archived:false});
      _bbSaveLocal(cards);
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
    wireBbUndoKeyboard();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('briefing_cards', _bbApplyRemoteCard);
      T().onRealtimeChange('briefing_checklist_items', _bbApplyRemoteChecklist);
      T().onRealtimeChange('custom_keys', _bbApplyRemoteKey);
    }
  });

})();
