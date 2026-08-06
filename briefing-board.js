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
     9390  bb-keybuilder-overlay  Add a Key -- builds one Custom Keys
                                library entry (shape+color+meaning).
                                9380 stays reserved for the Done archive.
     9395  bb-keypicker-overlay   Choose a Key -- opened by tapping any
                                of a card's 3 fixed key-slot circles.
                                Lists the library to pick from, Remove
                                (if the slot's filled), or Build a new
                                key (drops into 9390, slot-aware).
     9396  bb-linkpicker-overlay  Add a Link -- Aug 3 2026. Search +
                                pick an existing Storyboard idea/header
                                or another Briefing Card to link this
                                card to (briefing_card_links). Separate
                                from Unhooking Ideas (which creates a
                                NEW Header, doesn't link to one that
                                already exists).
     9397  bb-keylibmanager-overlay  Custom Keys -- Aug 3 2026. View,
                                edit (pencil), or delete (trash) any key
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
   - X (bb-close-x) closes the board straight to the MG; the MG-jump
     icon (b-bb-mg) rides along next to gear/X in the same header row.
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

  // Custom Keys, July 21, 2026 -- replaces the old one-per-board Signal.
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

  var _bbCards = null;
  var _bbOpenCardId = null;
  var _bbTrashPendingId = null;

  // Supabase-backed multi-board state, added July 21, 2026 (evening).
  var _bbCurrentBoardId = null;
  // TYPE + NAME, Aug 3 2026 -- the 4 board types Larry named: "Briefing
  // Boards can come in 4 types: Personal, Departmental, Company, and
  // Project." Stored as briefing_boards.board_type (already existed,
  // every board created before today just hardcoded 'personal').
  var BB_BOARD_TYPES = [
    {value:'personal', label:'Personal'},
    {value:'departmental', label:'Departmental'},
    {value:'company', label:'Company'},
    {value:'project', label:'Project'}
  ];
  var _bbBoards = [];
  // Custom Keys, Aug 3 2026 -- merged into the Storyboard's shared,
  // traveler-wide custom_keys table (was its own board-scoped
  // briefing_board_keys). Loaded once per session (_bbKeyLibraryLoaded
  // guards it), not re-fetched on every board switch -- see
  // _bbEnsureKeyLibraryLoaded, called from _bbInitBoardsAndData.
  var _bbKeyLibCache = [];
  var _bbKeyLibraryLoaded = false;
  var _bbMembersCache = [];
  var _bbTeamCache = [];
  var _bbChecklistCache = [];
  // Linked Items, Aug 3 2026. _bbLinksCache: the open card's own links,
  // resolved to a displayable label ({linkId, kind:'storyboard'|'card',
  // targetId, label, dead, drillId or boardId}). _bbLinkCountCache:
  // cardId -> total link count, board-wide, for the card-face badge/glow
  // (recomputed whenever the active board's cards load or the open
  // card's links change -- see _bbLoadLinkCounts).
  var _bbLinksCache = [];
  var _bbLinkCountCache = {};
  // Per-key link counts, Aug 4 2026 -- Larry: "Links are Key related...
  // One key on a card might have 7 links; another only 3." Same shape
  // as _bbLinkCountCache but keyed one level deeper: {cardId: {keyId: n}}.
  // A key's link count IS the number of other cards/ideas currently
  // sharing that exact key (that's what _bbSyncKeyLinks wires up one
  // edge per pair for), so this reads straight off the already-tagged
  // source='key' rows rather than recomputing anything.
  var _bbKeyLinkCountCache = {};
  // Loaded once per Link picker open, then filtered client-side as the
  // traveler types -- see openLinkPicker/_bbRenderLinkPickerResults.
  var _bbLinkPickerStoryboardCache = null;
  var _bbLinkPickerCardsCache = null;
  var _bbInitStarted = false;

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
  function _bbSaveLocal(cards){
    _bbCards = cards;
    try{ sessionStorage.setItem('bbCards', JSON.stringify(cards)); }catch(e){}
    _bbSyncCardsToSupabase(cards);
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
  // Custom Keys are a separate story, Aug 3 2026 -- originally their
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
      key_slot_1: keys[0]||null, key_slot_2: keys[1]||null, key_slot_3: keys[2]||null,
      situation: c.situation||null, hangup_since: _bbToISODate(c.hangupSince), hangup_header_id: c.hangupHeaderId||null,
      sort_order: (typeof c.sortOrder==='number') ? c.sortOrder : null,
      start_escalated_for: _bbToISODate(c.startEscalatedFor), due_escalated_for: _bbToISODate(c.dueEscalatedFor)
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
      situation: row.situation||'', hangupSince: _bbFromISODate(row.hangup_since), hangupHeaderId: row.hangup_header_id||null,
      sortOrder: (typeof row.sort_order==='number') ? row.sort_order : null,
      startEscalatedFor: _bbFromISODate(row.start_escalated_for), dueEscalatedFor: _bbFromISODate(row.due_escalated_for)
    };
  }
  function _bbSafeIdList(rows){
    return rows.map(function(r){ return String(r.id).replace(/[^a-zA-Z0-9-]/g,''); });
  }

  async function _bbSyncCardsToSupabase(cards){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var rows=cards.map(function(c){ return _bbCardToRow(c, _bbCurrentBoardId); });
      if(rows.length){
        var res=await sb.from('briefing_cards').upsert(rows);
        if(res.error) throw res.error;
        await sb.from('briefing_cards').delete().eq('board_id', _bbCurrentBoardId).not('id','in','('+_bbSafeIdList(rows).join(',')+')');
      } else {
        await sb.from('briefing_cards').delete().eq('board_id', _bbCurrentBoardId);
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

  // ============================================================
  // LINKED ITEMS, Aug 3 2026 -- Larry: "A link in the precomputer days
  // was colored yarn which literally connected cards with a line. The
  // literal line is not necessary but a card [links] with several other
  // items. The more links, the more key the item is." One edge per row
  // in briefing_card_links (Supabase): target_type='storyboard' points
  // at an Idea Storyboard idea/header (ideas.id); target_type='card'
  // points at another Briefing Card, on any board. Card-to-card edges
  // are undirected -- one row serves both cards, read from whichever
  // side (card_id or target_card_id) isn't the card asking.
  // ============================================================

  // Resolves a Storyboard row to whatever it should mean to jump to --
  // a Header/Subber is itself a real destination (currentTopicId can
  // drill straight into it), but a plain idea/note/image/link card
  // isn't drillable on its own, only its parent Header is. Mirrors the
  // same "only Headers are real destinations" rule Unhooking Ideas
  // already relies on (see _bbUnhookIdeas above).
  function _bbStoryboardDrillTarget(row){
    if(!row) return null;
    if(row.content_type==='header') return row.id;
    return row.cluster_id || row.id;
  }

  async function _bbLoadLinksForCard(cardId){
    var sb=T().sb;
    if(!sb){ if(_bbOpenCardId===cardId){ _bbLinksCache=[]; _bbRenderLinks(); } return; }
    try{
      var res=await sb.from('briefing_card_links').select('*').or('card_id.eq.'+cardId+',target_card_id.eq.'+cardId);
      if(res.error) throw res.error;
      var rows=res.data||[];
      var entries=rows.map(function(r){
        var base={linkId:r.id, source:r.source||'manual', viaKeyId:r.via_key_id||null};
        if(r.target_type==='storyboard'){
          return Object.assign(base, {kind:'storyboard', targetId:r.target_idea_id});
        }
        var otherCardId=(String(r.card_id)===String(cardId)) ? r.target_card_id : r.card_id;
        return Object.assign(base, {kind:'card', targetId:otherCardId});
      });
      var ideaIds=entries.filter(function(e){ return e.kind==='storyboard'; }).map(function(e){ return e.targetId; });
      var cardIds=entries.filter(function(e){ return e.kind==='card'; }).map(function(e){ return e.targetId; });
      // Key-sourced entries (Aug 3 2026, "place same symbol on cards and
      // they automatically link") also need the key's own meaning, so
      // the Linked Items row can say WHY the connection exists.
      var keyIds=entries.filter(function(e){ return e.source==='key' && e.viaKeyId; }).map(function(e){ return e.viaKeyId; });
      var ideaMap={}, cardMap={}, keyMap={};
      if(ideaIds.length){
        var ir=await sb.from('ideas').select('id,text_content,content_type,cluster_id').in('id', ideaIds);
        (ir.data||[]).forEach(function(row){ ideaMap[row.id]=row; });
      }
      if(cardIds.length){
        var cr=await sb.from('briefing_cards').select('id,task,board_id').in('id', cardIds);
        (cr.data||[]).forEach(function(row){ cardMap[row.id]=row; });
      }
      if(keyIds.length){
        var kr=await sb.from('custom_keys').select('id,meaning').in('id', keyIds);
        (kr.data||[]).forEach(function(row){ keyMap[row.id]=row; });
      }
      entries.forEach(function(e){
        if(e.kind==='storyboard'){
          var irow=ideaMap[e.targetId];
          e.label=irow ? (irow.text_content || (irow.content_type==='header' ? '(untitled header)' : '(untitled idea)')) : '(deleted item)';
          e.dead=!irow;
          e.drillId=irow ? _bbStoryboardDrillTarget(irow) : null;
        } else {
          var crow=cardMap[e.targetId];
          e.label=crow ? (crow.task || '(untitled card)') : '(deleted card)';
          e.dead=!crow;
          e.boardId=crow ? crow.board_id : null;
        }
        if(e.source==='key'){
          var krow=keyMap[e.viaKeyId];
          e.viaKeyMeaning=krow ? (krow.meaning||'') : '';
        }
      });
      if(_bbOpenCardId===cardId){ _bbLinksCache=entries; _bbRenderLinks(); }
    }catch(e){
      console.error('Briefing Board: could not load links', e);
      if(_bbOpenCardId===cardId){ _bbLinksCache=[]; _bbRenderLinks(); }
    }
  }

  function _bbRenderLinks(){
    var list=document.getElementById('bb-d-links-list'); if(!list) return;
    if(!_bbLinksCache.length){
      list.innerHTML='<div class="bb-links-empty">No linked items yet.</div>';
      return;
    }
    list.innerHTML=_bbLinksCache.map(function(e){
      var icon=e.kind==='storyboard' ? '🧭' : '📋';
      var label=_esc(e.label);
      // Key-sourced links (Aug 3 2026) show WHY they exist and can't be
      // individually removed -- the key is the source of truth, remove
      // the key from either item (or delete the key outright) to remove
      // the connection, same as a real shared piece of yarn only comes
      // untied at the pin, not by snipping the middle.
      if(e.source==='key'){
        return '<div class="bb-link-row'+(e.dead?' bb-link-dead':'')+'">'
          +'<span class="bb-link-go" data-go="'+_esc(e.linkId)+'">'+icon+' '+label+'</span>'
          +'<span style="font-size:10px;color:var(--bb-sub);white-space:nowrap" title="Linked automatically because both share this key">&#128273; '+_esc(e.viaKeyMeaning||'')+'</span>'
          +'</div>';
      }
      return '<div class="bb-link-row'+(e.dead?' bb-link-dead':'')+'">'
        +'<span class="bb-link-go" data-go="'+_esc(e.linkId)+'">'+icon+' '+label+'</span>'
        +'<button class="bb-link-remove" data-id="'+_esc(e.linkId)+'" title="Remove link">&#10005;</button>'
        +'</div>';
    }).join('');
    list.querySelectorAll('.bb-link-go').forEach(function(el){
      el.addEventListener('click', function(){
        var id=el.getAttribute('data-go');
        var entry=_bbLinksCache.filter(function(x){ return x.linkId===id; })[0];
        if(entry) _bbGoToLink(entry);
      });
    });
    list.querySelectorAll('.bb-link-remove').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var id=btn.getAttribute('data-id');
        var sb=T().sb;
        try{ if(sb) await sb.from('briefing_card_links').delete().eq('id', id); }
        catch(e){ console.error('Briefing Board: could not remove link', e); }
        _bbLinksCache=_bbLinksCache.filter(function(x){ return x.linkId!==id; });
        _bbRenderLinks();
      });
    });
  }

  // Jump to a linked item. Storyboard: same return-override pattern as
  // Unhooking Ideas, so the Storyboard's own X comes straight back to
  // this exact card instead of falling out to the backpack. Card:
  // switches boards first if the linked card lives on a different one
  // (it's still "your" corkboard, just a different board) then opens it.
  // Toast + glow, Aug 4 2026 -- Larry: "I thought the card switched but
  // it was not obvious. What would shout that we are on a different
  // card?" A link jump that lands back on the same overlay (card ->
  // card) swaps content in place with no visible cue that anything
  // moved. Same toast language already used elsewhere in the app
  // (screen-zero.js's showZeroToast) for "something just happened,
  // read this" moments, reskinned to Briefing Board's own palette --
  // plus a brief glow on the card that just opened so the eye finds it
  // fast, no reading required.
  function _bbShowToast(msg){
    var existing=document.getElementById('bb-toast'); if(existing) existing.remove();
    var toast=document.createElement('div');
    toast.id='bb-toast';
    toast.textContent=msg;
    toast.style.cssText=[
      'position:fixed','bottom:20px','left:20px',
      'background:rgba(59,37,16,0.92)','color:#C9A87C',
      'font-family:"Playfair Display",serif','font-size:13px','font-weight:700',
      'letter-spacing:0.5px','padding:10px 18px','border-radius:20px',
      'max-width:260px','text-align:left',
      'box-shadow:0 4px 16px rgba(0,0,0,0.35)','z-index:10000',
      'pointer-events:none','opacity:0','transition:opacity 0.2s'
    ].join(';');
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      toast.style.opacity='1';
      setTimeout(function(){
        toast.style.opacity='0';
        setTimeout(function(){ toast.remove(); }, 220);
      }, 2000);
    });
  }
  function _bbGlowOpenCard(){
    var card=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(!card) return;
    card.classList.remove('bb-just-arrived');
    void card.offsetWidth; // restart the animation if it's already mid-glow
    card.classList.add('bb-just-arrived');
    setTimeout(function(){ card.classList.remove('bb-just-arrived'); }, 1400);
  }
  function _bbGoToLink(entry){
    if(entry.dead){ window.alert('That linked item no longer exists.'); return; }
    if(entry.kind==='storyboard'){
      if(!entry.drillId) return;
      if(window.T2TShared){ window.T2TShared.currentTopicId=entry.drillId; window.T2TShared.filter=entry.drillId; }
      var _bbReturnCardId=_bbOpenCardId;
      if(T().markReturnOverride){
        T().markReturnOverride(function(){ T().nav('s-briefing-board'); openCardDetail(_bbReturnCardId); });
      }
      _bbShowToast('Jumped to \u201c'+entry.label+'\u201d on the Storyboard');
      closeCardDetail();
      T().nav('s-sea-of-ideas-cluster');
    } else if(entry.kind==='card'){
      var targetCardId=entry.targetId, targetBoardId=entry.boardId;
      var switchingBoard = targetBoardId && targetBoardId!==_bbCurrentBoardId;
      closeCardDetail();
      (async function(){
        if(switchingBoard){
          await _bbSwitchToBoard(targetBoardId);
          var board=_bbBoards.filter(function(b){ return b.id===targetBoardId; })[0];
          _bbShowToast('Switched to '+(board?board.name:'a different')+' board \u2014 \u201c'+entry.label+'\u201d');
        } else {
          _bbShowToast('Opened linked card \u2014 \u201c'+entry.label+'\u201d');
        }
        openCardDetail(targetCardId);
        _bbGlowOpenCard();
      })();
    }
  }

  // Board-wide link counts, Aug 3 2026 -- powers the card-face badge and
  // "more links, more key" glow for every card on the currently active
  // board. Two queries instead of one GROUP BY: supabase-js's query
  // builder has no aggregate/group-by, and this is small enough (a
  // traveler's whole board, not the whole table) that two plain .in()
  // selects plus a client-side tally is simpler than standing up a
  // Postgres function just for this.
  async function _bbLoadLinkCounts(cardIds){
    _bbLinkCountCache={};
    if(!cardIds || !cardIds.length) return;
    var sb=T().sb; if(!sb) return;
    try{
      var r1=await sb.from('briefing_card_links').select('card_id').in('card_id', cardIds);
      (r1.data||[]).forEach(function(row){ _bbLinkCountCache[row.card_id]=(_bbLinkCountCache[row.card_id]||0)+1; });
      var r2=await sb.from('briefing_card_links').select('target_card_id').in('target_card_id', cardIds);
      (r2.data||[]).forEach(function(row){ if(row.target_card_id) _bbLinkCountCache[row.target_card_id]=(_bbLinkCountCache[row.target_card_id]||0)+1; });
    }catch(e){ console.error('Briefing Board: could not load link counts', e); }
  }

  // Companion to _bbLoadLinkCounts above -- same two-query-plus-tally
  // shape, scoped to source='key' rows and split out by via_key_id so
  // the card face can show "this key has N links" per key, not just
  // one card-wide total.
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

  async function _bbCreateLink(targetType, targetIdeaId, targetCardId){
    if(!_bbOpenCardId) return;
    var sb=T().sb;
    if(!sb){ window.alert('Could not add the link: your sign-in session appears to have expired. Please refresh the page and sign in again.'); return; }
    try{
      var row={card_id:_bbOpenCardId, target_type:targetType, target_idea_id:targetIdeaId||null, target_card_id:targetCardId||null};
      var ins=await sb.from('briefing_card_links').insert(row).select().single();
      if(ins.error){
        console.error('Briefing Board: could not create link', ins.error);
        window.alert('Could not add that link. Error: '+(ins.error.message||'unknown error')+'. Nothing was saved -- please try again.');
        return;
      }
      closeLinkPicker();
      await _bbLoadLinksForCard(_bbOpenCardId);
    }catch(e){
      console.error('Briefing Board: could not create link', e);
      window.alert('Could not add that link. Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again.');
    }
  }

  // ---- Link picker (9396) ----

  async function openLinkPicker(){
    if(!_bbOpenCardId) return;
    var ov=document.getElementById('bb-linkpicker-overlay'); if(!ov) return;
    var search=document.getElementById('bb-linkpicker-search'); if(search) search.value='';
    ov.classList.add('active');
    _bbRenderLinkPickerResults('');
    var sb=T().sb;
    if(sb){
      try{
        var uid=await _bbCurrentUserId();
        if(uid){
          var ir=await sb.from('ideas').select('id,text_content,content_type,cluster_id').eq('user_id', uid).order('created_at',{ascending:false}).limit(500);
          _bbLinkPickerStoryboardCache=(ir.data||[]).filter(function(row){ return row.content_type==='header' || (row.text_content && row.text_content.trim()); });
          // RLS on briefing_cards already scopes SELECT to this
          // traveler's own boards (own cards - select policy joins
          // through board_id -> briefing_boards.user_id), so a plain
          // select needs no extra filter here -- matches every other
          // query in this file, none of which use an embedded/!inner
          // join. Board names come from _bbBoards, already loaded for
          // the TYPE/NAME pickers and covering every board regardless
          // of type.
          var cr=await sb.from('briefing_cards').select('id,task,board_id').order('created_at',{ascending:false}).limit(500);
          var boardNameById={};
          _bbBoards.forEach(function(b){ boardNameById[b.id]=b.name||'Untitled Board'; });
          _bbLinkPickerCardsCache=(cr.data||[]).filter(function(row){ return row.id!==_bbOpenCardId && row.task && row.task.trim(); }).map(function(row){
            return {id:row.id, task:row.task, board_id:row.board_id, boardName:boardNameById[row.board_id]||'Untitled Board'};
          });
        }
      }catch(e){ console.error('Briefing Board: could not load link picker candidates', e); }
      _bbRenderLinkPickerResults(search?search.value:'');
    }
  }

  function closeLinkPicker(){
    var ov=document.getElementById('bb-linkpicker-overlay'); if(ov) ov.classList.remove('active');
  }

  function _bbRenderLinkPickerResults(query){
    var box=document.getElementById('bb-linkpicker-results'); if(!box) return;
    var q=(query||'').trim().toLowerCase();
    var storyboardItems=_bbLinkPickerStoryboardCache||[];
    var cardItems=_bbLinkPickerCardsCache||[];
    var alreadyLinkedIdea={}, alreadyLinkedCard={};
    _bbLinksCache.forEach(function(e){
      if(e.kind==='storyboard') alreadyLinkedIdea[e.targetId]=true;
      else alreadyLinkedCard[e.targetId]=true;
    });
    var sMatches=storyboardItems.filter(function(row){
      if(alreadyLinkedIdea[row.id]) return false;
      var label=row.text_content||'';
      return !q || label.toLowerCase().indexOf(q)!==-1;
    }).slice(0,40);
    var cMatches=cardItems.filter(function(row){
      if(alreadyLinkedCard[row.id]) return false;
      return !q || row.task.toLowerCase().indexOf(q)!==-1;
    }).slice(0,40);
    if(!_bbLinkPickerStoryboardCache && !_bbLinkPickerCardsCache){
      box.innerHTML='<div class="bb-linkpicker-empty">Loading…</div>';
      return;
    }
    if(!sMatches.length && !cMatches.length){
      box.innerHTML='<div class="bb-linkpicker-empty">'+(q?'No matches.':'Nothing to link yet.')+'</div>';
      return;
    }
    var html='';
    sMatches.forEach(function(row){
      var label=row.text_content || (row.content_type==='header' ? '(untitled header)' : '(untitled idea)');
      html+='<div class="bb-linkpicker-item" data-storyboard="'+_esc(row.id)+'"><span class="bb-linkpicker-tag">'+(row.content_type==='header'?'Header':'Idea')+'</span><span>'+_esc(label)+'</span></div>';
    });
    cMatches.forEach(function(row){
      html+='<div class="bb-linkpicker-item" data-card="'+_esc(row.id)+'"><span class="bb-linkpicker-tag">'+_esc(row.boardName)+'</span><span>'+_esc(row.task)+'</span></div>';
    });
    box.innerHTML=html;
    box.querySelectorAll('[data-storyboard]').forEach(function(el){
      el.addEventListener('click', function(){ _bbCreateLink('storyboard', el.getAttribute('data-storyboard'), null); });
    });
    box.querySelectorAll('[data-card]').forEach(function(el){
      el.addEventListener('click', function(){ _bbCreateLink('card', null, el.getAttribute('data-card')); });
    });
  }

  function wireLinks(){
    T().wire('bb-d-add-link', openLinkPicker);
    T().wire('bb-linkpicker-close', closeLinkPicker);
    var search=document.getElementById('bb-linkpicker-search');
    if(search) search.addEventListener('input', function(){ _bbRenderLinkPickerResults(search.value); });
  }

  // Browsable Archive, added July 21, 2026 (evening) -- Touch Point 9380,
  // held in reserve since the original Custom Keys work. Verified-
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

  async function _bbSwitchToBoard(boardId){
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
    _bbLoadMembers();

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
          _bbRenderBoardPicker();
          await Promise.all([_bbLoadLinkCounts(_bbCards.map(function(c){ return c.id; })), _bbLoadKeyLinkCounts(_bbCards.map(function(c){ return c.id; }))]);
          renderBoard();
          return;
        }catch(e){ console.error('Briefing Board: legacy migration failed', e); }
      }
    }

    _bbCards = cardRows.length ? cardRows.map(_bbRowToCard) : _bbSeed();
    _bbRenderTypePicker();
    _bbRenderBoardPicker();
    await Promise.all([_bbLoadLinkCounts(_bbCards.map(function(c){ return c.id; })), _bbLoadKeyLinkCounts(_bbCards.map(function(c){ return c.id; }))]);
    renderBoard();
  }

  async function _bbInitBoardsAndData(){
    var uid=await _bbCurrentUserId();
    if(!uid){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); return; }
    // Aug 3 2026 -- Custom Keys are traveler-wide now (merged with the
    // Storyboard's shared library), so they load once here rather than
    // per board switch. _bbEnsureKeyLibraryLoaded guards itself, so a
    // reload-and-return-here (Alt+C) or re-entering the screen never
    // re-fetches needlessly.
    await _bbEnsureKeyLibraryLoaded();
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

  // NAME picker's list is scoped to whichever TYPE is currently
  // selected (Aug 3 2026) -- reads the TYPE dropdown's live value so a
  // rebuild mid-switch (see wireTypePicker) always reflects the type the
  // traveler is actually looking at, not stale data from _bbBoards.
  function _bbActiveBoardType(){
    var typeSel=document.getElementById('bb-type-picker');
    if(typeSel && typeSel.value) return typeSel.value;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    return (board && board.board_type) || 'personal';
  }

  function _bbRenderTypePicker(){
    var sel=document.getElementById('bb-type-picker'); if(!sel) return;
    if(!sel.options.length){
      sel.innerHTML = BB_BOARD_TYPES.map(function(t){ return '<option value="'+t.value+'">'+t.label+'</option>'; }).join('');
    }
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    sel.value = (board && board.board_type) || 'personal';
  }

  function _bbRenderBoardPicker(){
    var sel=document.getElementById('bb-board-picker'); if(!sel) return;
    var activeType=_bbActiveBoardType();
    var filtered=_bbBoards.filter(function(b){ return (b.board_type||'personal')===activeType; });
    var opts=filtered.map(function(b){
      return '<option value="'+_esc(b.id)+'"'+(b.id===_bbCurrentBoardId?' selected':'')+'>'+_esc(b.name||'Untitled Board')+'</option>';
    }).join('');
    sel.innerHTML = opts + '<option value="__add__">+ Add a board&hellip;</option>';
  }

  // Shared by both the NAME picker's "+ Add a board..." and the TYPE
  // picker's "no boards of this type yet" prompt (Aug 3 2026) -- one
  // creation path instead of two copies of the same Supabase insert.
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
      await _bbSwitchToBoard(ins.data.id);
      return true;
    }catch(e){
      console.error('Briefing Board: could not create board', e);
      window.alert('Could not add the board "'+name+'". Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again or refresh the page.');
      return false;
    }
  }

  function wireBoardPicker(){
    var sel=document.getElementById('bb-board-picker'); if(!sel) return;
    sel.addEventListener('change', async function(){
      if(sel.value==='__add__'){
        var typeSel=document.getElementById('bb-type-picker');
        var boardType=_bbActiveBoardType();
        var typeLabel=(typeSel && typeSel.options[typeSel.selectedIndex]) ? typeSel.options[typeSel.selectedIndex].text : 'board';
        var name=window.prompt('Name for the new '+typeLabel+' board:');
        _bbRenderBoardPicker();
        if(!name || !name.trim()) return;
        await _bbCreateBoard(name.trim(), boardType);
        return;
      }
      await _bbSwitchToBoard(sel.value);
    });
  }

  // TYPE picker, Aug 3 2026 -- switching TYPE jumps straight to that
  // type's first board (matching NAME's own alphabetical-by-created-at
  // order), or, if this traveler has none of that type yet, prompts to
  // create the first one right there (mirrors NAME's own "+ Add a
  // board..." flow, same _bbCreateBoard helper). Cancelling the prompt
  // reverts TYPE back to whatever board is actually still active, same
  // as NAME's own cancel-leaves-you-where-you-were behavior.
  function wireTypePicker(){
    var sel=document.getElementById('bb-type-picker'); if(!sel) return;
    sel.addEventListener('change', async function(){
      var matching=_bbBoards.filter(function(b){ return (b.board_type||'personal')===sel.value; });
      if(matching.length){
        await _bbSwitchToBoard(matching[0].id);
      } else {
        var typeLabel=sel.options[sel.selectedIndex].text;
        var name=window.prompt('No '+typeLabel+' boards yet. Name for the first one:');
        if(!name || !name.trim()){ _bbRenderTypePicker(); return; }
        await _bbCreateBoard(name.trim(), sel.value);
      }
    });
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

  // Member roster picker for Assigned To, July 22, 2026 -- pulled from
  // the real members table (the same roster used for login), formatted
  // "II Full Name" (e.g. "LS Larry Smithers") to match the initials
  // convention _bbInitials already parses. Loaded once per board
  // switch and cached; a card can still carry a person value that
  // isn't in the roster (typed in before this existed, or added via
  // "+ Add a name..."), so the select always includes whatever's
  // currently on the card even if it's not a known member.
  async function _bbLoadMembers(){
    var sb=T().sb; if(!sb) return;
    try{
      var res=await sb.from('briefing_roster').select('name,initials').order('name',{ascending:true});
      if(!res.error && res.data){
        _bbMembersCache = res.data.map(function(m){
          var initials=(m.initials||_bbInitialsFromName(m.name)).toUpperCase();
          return initials+' '+(m.name||'');
        });
      }
    }catch(e){ console.error('Briefing Board: could not load members', e); }
    var sel=document.getElementById('bb-d-person');
    if(sel && _bbOpenCardId){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(c) _bbRenderPersonSelect(c.person||'');
    }
  }

  function _bbRenderPersonSelect(currentValue){
    var sel=document.getElementById('bb-d-person'); if(!sel) return;
    var list=_bbMembersCache.slice();
    if(currentValue && list.indexOf(currentValue)===-1) list.unshift(currentValue);
    sel.innerHTML = list.map(function(v){
      return '<option value="'+_esc(v)+'"'+(v===currentValue?' selected':'')+'>'+_esc(v)+'</option>';
    }).join('') + '<option value="__add__">+ Add a name&hellip;</option>';
  }

  // Team roster management, July 22, 2026 -- edit/remove entries in
  // the real members table (not just the read-only briefing_roster
  // view used by the per-card picker). Only works for Larry once his
  // admin_all_members RLS policy points at his actual login email --
  // see that migration's notes. Deactivating (not deleting) a member
  // keeps their account/history intact; they just stop appearing as
  // an assignee.
  async function _bbLoadTeam(){
    var sb=T().sb; if(!sb) return;
    try{
      var res=await sb.from('members').select('email,name,initials').eq('membership_status','active').order('name',{ascending:true});
      if(!res.error && res.data) _bbTeamCache = res.data;
    }catch(e){ console.error('Briefing Board: could not load team', e); }
    _bbRenderTeamList();
  }

  function _bbRenderTeamList(){
    var wrap=document.getElementById('bb-team-list'); if(!wrap) return;
    wrap.innerHTML = _bbTeamCache.map(function(m){
      return '<div class="bb-team-row" data-email="'+_esc(m.email)+'">'
        +'<input type="text" class="bb-team-name" value="'+_esc(m.name)+'">'
        +'<input type="text" class="bb-team-initials" value="'+_esc(m.initials)+'" maxlength="4">'
        +'<button class="bb-checklist-remove" type="button" title="Remove from team">&#10005;</button>'
        +'</div>';
    }).join('');
  }

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
    var colCards=all.filter(function(c){ return !c.archived && c.col===colKey; });
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
    all.forEach(function(c){
      if(c.archived) return;
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
      +'.bb-mh-typebox{display:flex;gap:10px;justify-self:start;align-items:flex-end}'
      +'.bb-mh-fieldgrp{display:flex;flex-direction:column;gap:3px}'
      +'.bb-mh-eyebrow{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-type-picker{background:#fff;border:1.5px solid var(--bb-accent);border-radius:6px;padding:5px 8px;font-family:var(--bb-head-font);font-size:13px;font-weight:700;color:var(--bb-ink);cursor:pointer;outline:none;max-width:120px}'
      // NAME row, Aug 3 2026 -- pencil button added so a traveler can
      // actually rename a board (Larry: "How can a traveler edit the
      // name of the Briefing Board?" -- there was no way; renaming only
      // ever happened by typing a fresh name into "+ Add a board...").
      // Small and square like the header's other icon buttons, just
      // scaled down (22px vs 30px) to sit level with the NAME select's
      // own smaller 13px text instead of towering over it.
      +'.bb-mh-namerow{display:flex;align-items:center;gap:4px}'
      +'.bb-rename-btn{width:22px;height:22px;flex-shrink:0;border-radius:6px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;padding:0}'
      +'.bb-rename-btn:hover{background:var(--bb-bg)}'
      // Center title, Aug 3 2026 -- Larry: "Make Briefing Board larger.
      // Push tagline lower." Was 20px (sized for when it sat next to the
      // big board-name pill); now the header's one permanent, static
      // element, sized to lead. Gap between title and tagline widened
      // 2px -> 10px so the tagline reads as its own line, not crowded
      // against the title's descenders.
      +'.bb-mh-group-center{display:flex;flex-direction:column;align-items:center;gap:10px;justify-self:center;text-align:center}'
      +'.bb-mh{color:var(--bb-ink);font-size:38px;font-weight:700;line-height:1;font-family:var(--bb-head-font)}'
      +'.bb-board-picker{background:#fff;border:1.5px solid var(--bb-accent);border-radius:6px;padding:5px 8px;font-family:var(--bb-head-font);font-size:13px;font-weight:700;color:var(--bb-ink);cursor:pointer;outline:none;max-width:150px}'
      +'.bb-mhead-actions{display:flex;gap:8px;flex-shrink:0;justify-self:end;justify-content:flex-end}'
      +'.bb-icon-btn{width:30px;height:30px;border-radius:6px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;color:var(--bb-ink);padding:0}'
      +'.bb-icon-btn:hover{background:var(--bb-bg)}'
      +'.bb-mt{color:var(--bb-sub);font-size:13px;font-style:italic}'
      // Center the board's columns as a group (Larry, July 22 2026)
      // instead of always hugging the left edge -- still scrolls
      // normally once there are enough columns to overflow.
      +'#bb-board-wrap{flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 16px;background:var(--bb-bg);display:flex;justify-content:center}'
      +'#bb-cols{display:flex;gap:14px;height:100%}'
      +'.bb-col{flex-shrink:0;width:190px;display:flex;flex-direction:column;background:rgba(201,168,124,0.14);border:1px solid var(--bb-accent);border-radius:8px;padding:8px}'
      +'.bb-col-head{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-bg);background:var(--bb-ink);border-radius:4px;text-align:center;padding:7px 4px;margin-bottom:4px}'
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
      +'.bb-card{position:relative;background:#FFFDF7;border:1px solid var(--bb-accent);border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:12px;line-height:1.3;cursor:grab;font-family:var(--bb-body-font)}'
      // "More links, more key," Aug 3 2026 (Larry) -- a card's shadow
      // gets a layered, stacked look as its link count climbs, same
      // visual language the Storyboard already uses for "this thing has
      // more behind it" (.sc-pill.has-children in idea-storyboard-9710.js).
      // 1-2 links: a thin gold outline. 3+: a bolder outline plus a
      // second offset shadow layer, so a well-connected card visibly
      // stands out from the pile without needing to open it.
      +'.bb-card.bb-has-links{box-shadow:1px 2px 4px rgba(59,37,16,0.18),0 0 0 1px rgba(201,168,124,.65)}'
      +'.bb-card.bb-many-links{box-shadow:2px 3px 6px rgba(59,37,16,0.28),0 0 0 2px rgba(201,168,124,.9),4px 5px 0 rgba(201,168,124,.22)}'
      +'.bb-card .bb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}'
      +'.bb-card .bb-top-left{display:flex;align-items:center;gap:4px}'
      +'.bb-pri-badge{font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;line-height:1.4}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:13px;color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--bb-body-font);flex-shrink:0}'
      +'.bb-card .bb-task{color:var(--bb-ink);margin:2px 0 5px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:12px;color:var(--bb-sub);min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-done-date{font-family:"Caveat",cursive;font-size:12px;color:#3F6B3A;text-align:right;margin-top:1px}'
      +'.bb-key-badges{position:absolute;bottom:2px;left:4px;display:flex;gap:7px;pointer-events:none}'
      // pointer-events:auto here, Aug 4 2026 -- the container above stays
      // click-through (so it never steals a card drag), but the wrap
      // around each dot+count needs real pointer events or its title
      // tooltip (the meaning, on hover) never fires -- a child inherits
      // "none" from its parent unless it opts back in like this.
      +'.bb-key-badge-wrap{display:inline-flex;align-items:center;gap:2px;pointer-events:auto;cursor:default}'
      +'.bb-key-badge{width:12px;height:12px;box-shadow:0 1px 2px rgba(0,0,0,.3);flex-shrink:0}'
      // Link count, Aug 4 2026 -- Larry: "links number should be to
      // the right of the Key symbol. One key on a card might have 7
      // links; another only 3." Small enough to sit beside a 12px dot
      // without dominating the card face.
      +'.bb-key-link-count{font-family:var(--bb-body-font);font-size:9px;font-weight:700;color:var(--bb-sub);line-height:1}'
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed var(--bb-accent);border-radius:3px;text-align:center;padding:8px;font-size:12px;color:var(--bb-sub);cursor:pointer;font-family:var(--bb-body-font)}'
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
      +'.bb-field label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:3px}'
      +'.bb-inline-field{display:flex;align-items:baseline;justify-content:flex-start;gap:6px;white-space:nowrap}'
      +'.bb-inline-field label{display:inline;margin:0}'
      +'.bb-inline-field span{font-family:"Caveat",cursive;font-size:16px;color:var(--bb-sub)}'
      +'.bb-field input,.bb-field textarea,.bb-field select{width:100%;font-family:var(--bb-body-font);font-size:14px;border:1.5px solid var(--bb-accent);border-radius:4px;padding:7px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:16px;resize:vertical}'
      +'#bb-d-notes{font-family:var(--bb-body-font)!important;font-style:normal;font-size:14px!important;min-height:160px}'
      +'#bb-new-task{font-family:var(--bb-body-font)!important;font-style:normal;font-size:15px!important}'
      +'.bb-flags,.bb-priorities,.bb-swatches{display:flex;gap:4px}'
      +'.bb-flag-btn,.bb-pri-btn,.bb-font-btn,.bb-shape-btn{flex:1;font-size:11px;padding:6px 2px;border-radius:4px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font);display:flex;align-items:center;justify-content:center}'
      +'.bb-shape-btn.bb-shape-active{background:var(--bb-bg);border-color:var(--bb-ink)}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}'
      +'#bb-d-verify.bb-flag-active{background:#3F6B3A;border-color:#3F6B3A}'
      +'#bb-d-pro.bb-flag-active{background:#c9a230;border-color:#c9a230}'
      +'#bb-d-grow.bb-flag-active{background:#4a7a95;border-color:#4a7a95}'
      +'.bb-font-btn.bb-flag-active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-theme-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.15)}'
      +'.bb-theme-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-start}'
      +'.bb-key-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      +'.bb-key-add{font-size:16px;color:var(--bb-sub);border-style:dashed}'
      +'.bb-key-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      +'.bb-key-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-pick-row-wrap{display:flex;align-items:center;gap:6px;margin-bottom:6px}'
      +'.bb-key-pick-row{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:8px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;cursor:pointer;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink);text-align:left}'
      +'.bb-key-pick-meaning{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.bb-key-pick-edit{background:none;border:none;cursor:pointer;font-size:14px;color:#4a7a95;flex-shrink:0;padding:0 4px}'
      +'.bb-key-pick-swatch{width:16px;height:16px;flex-shrink:0}'
      +'.bb-key-pick-disabled{opacity:.35;pointer-events:none}'
      +'.bb-key-pick-empty-msg{font-size:12px;color:var(--bb-sub);font-style:italic;text-align:center;padding:6px 0}'
      +'.bb-checklist-row{display:flex;align-items:center;gap:6px;padding:3px 0;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink)}'
      +'.bb-checklist-row .bb-checklist-check{flex:0 0 auto;width:14px;height:14px;margin:0;padding:0}'
      +'.bb-checklist-text{flex:1}'
      +'.bb-checklist-text.bb-checklist-done{text-decoration:line-through;color:var(--bb-sub)}'
      +'.bb-checklist-remove{background:none;border:none;color:var(--bb-sub);cursor:pointer;font-size:12px;padding:0 4px}'
      +'.bb-checklist-add-row{display:flex;gap:6px;margin-top:4px}'
      +'.bb-checklist-add-row input{flex:1;font-family:var(--bb-body-font);font-size:13px;border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink)}'
      // Linked Items, Aug 3 2026 -- same row/remove-button shape as the
      // Checklist just above (bb-checklist-row/remove), so the two
      // "small list living inside a field" patterns on this card read
      // as one family.
      +'.bb-link-row{display:flex;align-items:center;gap:6px;padding:4px 0;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink);border-bottom:1px solid rgba(201,168,124,.35)}'
      +'.bb-link-row:last-child{border-bottom:none}'
      +'.bb-link-go{flex:1;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(59,37,16,.25);text-underline-offset:2px}'
      +'.bb-link-go:hover{color:#6b4a2e}'
      +'.bb-link-dead .bb-link-go{color:var(--bb-sub);font-style:italic;text-decoration:none;cursor:default}'
      +'.bb-link-remove{background:none;border:none;color:var(--bb-sub);cursor:pointer;font-size:12px;padding:0 4px}'
      +'.bb-links-empty{font-size:12px;font-style:italic;color:var(--bb-sub);padding:2px 0}'
      +'.bb-linkpicker-item{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--bb-accent);border-radius:6px;margin-bottom:6px;cursor:pointer;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink);background:#fff}'
      +'.bb-linkpicker-item:hover{background:var(--bb-bg)}'
      +'.bb-linkpicker-tag{flex-shrink:0;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-linkpicker-empty{font-size:12px;font-style:italic;color:var(--bb-sub);padding:8px 0}'
      // Key Library manager (9397), Aug 3 2026 -- same row shape as
      // Linked Items/Checklist just above, pencil then trash per row.
      +'.bb-keylib-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink);border-bottom:1px solid rgba(201,168,124,.35)}'
      +'.bb-keylib-row:last-child{border-bottom:none}'
      +'.bb-keylib-swatch{display:inline-block;width:16px;height:16px;flex-shrink:0}'
      +'.bb-keylib-meaning{flex:1}'
      +'.bb-keylib-edit,.bb-keylib-del{background:none;border:none;cursor:pointer;font-size:13px;padding:0 4px}'
      +'.bb-keylib-edit{color:#4a7a95}'
      +'.bb-keylib-del{color:#a3372b}'
      +'.bb-archive-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--bb-accent)}'
      +'.bb-archive-task{font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink)}'
      +'.bb-archive-meta{font-family:"Caveat",cursive;font-size:12px;color:var(--bb-sub)}'
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
      // Landed-here glow, Aug 4 2026 -- fires once when a link jump opens
      // a card into this same overlay, so a content swap that would
      // otherwise be silent gets one visible pulse to catch the eye.
      +'@keyframes bb-arrive-pulse{0%{box-shadow:0 10px 30px rgba(59,37,16,0.35),0 0 0 0 rgba(201,168,124,0.9)}70%{box-shadow:0 10px 30px rgba(59,37,16,0.35),0 0 0 14px rgba(201,168,124,0)}100%{box-shadow:0 10px 30px rgba(59,37,16,0.35),0 0 0 0 rgba(201,168,124,0)}}'
      +'.bb-overlay-card.bb-just-arrived{animation:bb-arrive-pulse 1.4s ease-out}'
      +'.bb-overlay-card.bb-hangup-active{border-top-color:#a3372b;background:#FFF4F2}'
      +'.bb-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;cursor:grab;user-select:none}'
      +'.bb-overlay-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-overlay-card.bb-hangup-active .bb-overlay-title{color:#a3372b}'
      +'.bb-close{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:13px;color:var(--bb-ink)}'
      +'.bb-close:hover{background:var(--bb-bg)}'
      +'.bb-hx-back{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:14px;color:var(--bb-ink)}'
      +'.bb-hx-back:hover{background:var(--bb-bg)}'
      +'.bb-routine-toggle{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:14px;color:var(--bb-ink)}'
      +'.bb-routine-toggle:hover{background:var(--bb-bg)}'
      +'.bb-routine-toggle.bb-routine-on{background:var(--bb-accent);color:#fff}'
      +'.bb-overlay-card.bb-routine-active{border-top-color:#4a7a95}'
      +'.bb-date-row{display:flex;gap:6px;align-items:stretch}'
      +'.bb-date-row input[type=text]{flex:1.4;min-width:0}'
      +'.bb-date-row input.bb-date-time{width:60px;flex:none;min-width:0}'
      +'.bb-date-row select.bb-routine-select{flex:none;width:92px;font-family:var(--bb-body-font);font-size:12px;border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 4px;background:#fff;color:var(--bb-ink)}'
      +'.bb-routine-custom{margin-top:6px;width:100%;font-family:var(--bb-body-font);font-size:13px;border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-routine-badge{font-size:11px;line-height:1}'
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
              +'<div class="bb-mh-fieldgrp"><div class="bb-mh-eyebrow">Type</div><select id="bb-type-picker" class="bb-type-picker" title="Board type"></select></div>'
              +'<div class="bb-mh-fieldgrp"><div class="bb-mh-eyebrow">Name</div><div class="bb-mh-namerow"><select id="bb-board-picker" class="bb-board-picker" title="Switch boards"></select><button class="bb-rename-btn" id="bb-rename-btn" title="Rename this board">\u270f\ufe0f</button></div></div>'
            +'</div>'
            +'<div class="bb-mh-group-center"><span class="bb-mh">Briefing Board</span><div class="bb-mt">A control and communication tool.</div></div>'
            +'<div class="bb-mhead-actions">'
              +'<button class="bb-icon-btn" id="bb-reset" title="Reload and return here (Alt+C)">🔄</button>'
              +'<button class="bb-icon-btn" id="b-bb-mg" title="Jump to menu">🔍</button>'
              +'<button class="bb-icon-btn" id="bb-hx-btn" title="History">HX</button>'
              +'<button class="bb-icon-btn" id="bb-gear" title="Colors &amp; fonts">⚙️</button>'
              +'<button class="bb-icon-btn" id="bb-close-x" title="Close">✕</button>'
            +'</div>'
          +'</div>'
        +'</div>'
        +'<div id="bb-board-wrap"><div id="bb-cols"></div></div>'
        +'<div class="bb-trash" id="bb-trash" title="Trash">'+TRASH_SVG+'</div>'
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
          +'</div>'
        +'</div>';
      fg.appendChild(addOv);
      addOv.addEventListener('click', function(e){ if(e.target===addOv) closeAddCard(); });
      _bbMakeDraggable(addOv.querySelector('.bb-overlay-card'), addOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-detail-overlay')){
      var detailOv=document.createElement('div');
      detailOv.id='bb-detail-overlay'; detailOv.className='bb-overlay';
      detailOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Briefing Card</span><div style="display:flex;gap:6px"><button class="bb-routine-toggle" id="bb-d-routine-toggle" title="Routine card" aria-label="Toggle routine">🔄</button><button class="bb-close" id="bb-detail-close" aria-label="Close">✕</button></div></div>'
          +'<div class="bbw">'
            +'<div class="bb-field bb-inline-field"><label>Date Added</label><span id="bb-d-added">&mdash;</span></div>'
            +'<div id="bb-d-hangup-wrap" style="display:none">'
              +'<div class="bb-field bb-inline-field"><label>Stuck since</label><span id="bb-d-hangup-since">&mdash;</span></div>'
              +'<div class="bb-field"><label>Situation &mdash; what&rsquo;s stuck, and why</label><textarea id="bb-d-situation" placeholder="What seems to be the problem? Help us understand what&rsquo;s going on."></textarea></div>'
              +'<button class="jb" id="bb-d-unhook-ideas" type="button" style="width:100%;margin-bottom:4px">&#129437; Unhooking Ideas</button>'
            +'</div>'
            +'<div class="bb-field"><label>Priority</label><div class="bb-priorities">'
              +PRIORITY_BASE.map(function(p){ return '<button class="bb-pri-btn" data-pri-base="'+p+'">'+p+'</button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Custom Keys</label><div class="bb-key-row" id="bb-d-key-row"></div></div>'
            // Linked Items, Aug 3 2026 -- Larry: "A link in the
            // precomputer days was colored yarn which literally
            // connected cards with a line ... a card [links] with
            // several other items. The more links, the more key the
            // item is." A card can link to an existing Storyboard idea
            // or header, or to another Briefing Card (any board) --
            // see briefing_card_links (Supabase) and openLinkPicker
            // below. Separate from Hang-Ups' own Unhooking Ideas button
            // above, which is untouched -- that one auto-creates a NEW
            // Header; this links to something that already exists.
            +'<div class="bb-field"><label>Linked Items</label><div id="bb-d-links-list"></div><button class="jb" id="bb-d-add-link" type="button" style="width:100%;margin-bottom:0">&#129525; Add a link</button></div>'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-d-task"></textarea></div>'
            +'<div class="bb-field"><label>Checklist</label><div id="bb-d-checklist-list"></div><div class="bb-checklist-add-row"><input id="bb-d-checklist-new" type="text" placeholder="Add steps..."><button class="bb-icon-btn" id="bb-d-checklist-add-btn" title="Add step">+</button></div></div>'
            +'<div class="bb-field"><label>Assigned to</label><select id="bb-d-person"></select></div>'
            +'<div class="bb-field"><label>Due date</label><div class="bb-date-row"><input id="bb-d-due" type="text" placeholder="MM/DD/YYYY"><input id="bb-d-due-time" type="text" class="bb-date-time" placeholder="Time"><select id="bb-d-routine" class="bb-routine-select"><option value="">Routine</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></div><input id="bb-d-routine-custom" type="text" class="bb-routine-custom" placeholder="e.g. Last Friday, EOB" style="display:none"></div>'
            +'<div class="bb-field"><label>Start date</label><div class="bb-date-row"><input id="bb-d-start" type="text" placeholder="MM/DD/YYYY"><input id="bb-d-start-time" type="text" class="bb-date-time" placeholder="Time"></div></div>'
            +'<div class="bb-field"><label>Budget &mdash; time or dollars</label><input id="bb-d-budget" type="text"></div>'
            +'<div class="bb-field"><label>Notes</label><textarea id="bb-d-notes" placeholder="Notes, comments, questions..."></textarea></div>'
            +'<div class="bb-field"><label>Reviewed by</label><select id="bb-d-reviewer">'+REVIEWERS.map(function(n){ return '<option value="'+n+'">'+n+'</option>'; }).join('')+'</select></div>'
            +'<div class="bb-field"><div class="bb-flags"><button class="bb-flag-btn" id="bb-d-pro">&#11088; PRO</button><button class="bb-flag-btn" id="bb-d-grow">&#127793; GROW</button><button class="bb-flag-btn" id="bb-d-verify">&#10003; Verified</button></div></div>'
            +'<div class="bb-field" id="bb-d-grow-note-wrap" style="display:none"><label>GROW comment &mdash; required</label><textarea id="bb-d-grow-note" placeholder="What would make this even better next time?"></textarea></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(detailOv);
      detailOv.addEventListener('click', function(e){ if(e.target===detailOv) closeCardDetail(); });
      _bbMakeDraggable(detailOv.querySelector('.bb-overlay-card'), detailOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-trash-overlay')){
      var trashOv=document.createElement('div');
      trashOv.id='bb-trash-overlay'; trashOv.className='bb-overlay';
      trashOv.innerHTML=
         '<div class="bb-overlay-card" style="width:280px;text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:18px;font-weight:700;color:#3B2510;margin-bottom:6px">Moose poop?</div>'
          +'<div style="font-size:12px;color:#7A5C3A;font-style:italic;margin-bottom:14px">Off the board for good &mdash; this isn’t the same as Done.</div>'
          +'<div style="display:flex;gap:8px">'
            +'<button class="bb-flag-btn" id="bb-trash-yes" style="background:#a3372b;color:#fff;border-color:#a3372b">Yes</button>'
            +'<button class="bb-flag-btn" id="bb-trash-no">Keep it</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(trashOv);
      trashOv.addEventListener('click', function(e){ if(e.target===trashOv) closeTrashConfirm(); });
    }
    if(!document.getElementById('bb-settings-overlay')){
      var setOv=document.createElement('div');
      setOv.id='bb-settings-overlay'; setOv.className='bb-overlay';
      setOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Board Settings</span><button class="bb-close" id="bb-settings-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Color theme</label><div class="bb-swatches">'
              +THEMES.map(function(t){ return '<button class="bb-theme-swatch" data-theme="'+t.key+'" title="'+t.label+'" style="background:'+t.bg+';border-color:'+t.accent+'"></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Font</label><div class="bb-flags">'
              +FONTS.map(function(f){ return '<button class="bb-font-btn" data-font="'+f.key+'">'+f.label+'</button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Text size</label>'
              +'<button class="bb-flag-btn" id="bb-open-textsize" style="width:100%">🔠 Adjust text size</button>'
            +'</div>'
            +'<div class="bb-field"><label>Start Date warning (days before, auto-sets H)</label>'
              +'<input type="number" min="0" step="1" id="bb-start-warn-days" style="width:80px">'
            +'</div>'
            +'<div class="bb-field"><label>Due Date warning (days before, auto-sets HH)</label>'
              +'<input type="number" min="0" step="1" id="bb-due-warn-days" style="width:80px">'
            +'</div>'
            +'<div class="bb-field"><label>Custom Keys</label>'
              +'<button class="bb-flag-btn" id="bb-open-keylib" style="width:100%">&#128273; Manage Keys</button>'
            +'</div>'
            +'<div class="bb-field" id="bb-sharing-field"><label>Sharing</label>'
              +'<div id="bb-sharing-summary" style="font-size:12px;color:var(--bb-sub);margin-bottom:6px"></div>'
              +'<button class="bb-flag-btn" id="bb-open-sharing" style="width:100%">&#129309; Manage Access</button>'
            +'</div>'
            +'<div class="bb-field"><label>Team</label><div id="bb-team-list"></div><div style="font-size:11px;color:var(--bb-sub);margin-top:6px;font-style:italic">To add someone new, they need a real account first -- this only edits or removes existing team members.</div></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(setOv);
      setOv.addEventListener('click', function(e){ if(e.target===setOv) closeSettings(); });
      // Aug 3 2026: Briefing Board is full-screen (.isx-full), so the
      // desk's own gear/text-size picker is hidden here -- same shared
      // picker as Storyboard/Session's Options menus.
      var tsBtn=setOv.querySelector('#bb-open-textsize');
      if(tsBtn) tsBtn.addEventListener('click', function(){ if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
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
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Custom Keys</span><button class="bb-close" id="bb-keylibmanager-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-links-empty" style="margin-bottom:8px">One shared set, usable on any card, any board -- and on the Idea Storyboard too. Cards or Storyboard items that share a key link to each other automatically.</div>'
            +'<div id="bb-keylib-list"></div>'
            +'<button class="jb" id="bb-keylib-add" style="width:100%;margin-bottom:0">+ Add a key</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(klOv);
      klOv.addEventListener('click', function(e){ if(e.target===klOv) closeKeyLibManager(); });
      _bbMakeDraggable(klOv.querySelector('.bb-overlay-card'), klOv.querySelector('.bb-overlay-head'));
    }
    // Board Sharing (Aug 4 2026) -- lets the owner of a project/departmental/
    // company Briefing Board add other signed-in members so they can see
    // and edit it too. Same overlay shape as the Custom Keys manager.
    if(!document.getElementById('bb-sharing-overlay')){
      var shOv=document.createElement('div');
      shOv.id='bb-sharing-overlay'; shOv.className='bb-overlay';
      shOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Manage Access</span><button class="bb-close" id="bb-sharing-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-links-empty" style="margin-bottom:8px">Everyone added here can see and edit this board -- same access as you.</div>'
            +'<div id="bb-sharing-list"></div>'
            +'<div id="bb-sharing-add-row" style="display:flex;gap:6px;margin-top:8px">'
              +'<input id="bb-sharing-add-email" type="email" placeholder="Their email address" style="flex:1">'
              +'<button class="bb-icon-btn" id="bb-sharing-add-btn" title="Add">+</button>'
            +'</div>'
          +'</div>'
        +'</div>';
      fg.appendChild(shOv);
      shOv.addEventListener('click', function(e){ if(e.target===shOv) closeSharingManager(); });
      _bbMakeDraggable(shOv.querySelector('.bb-overlay-card'), shOv.querySelector('.bb-overlay-head'));
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
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Key</span><button class="bb-close" id="bb-keybuilder-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Shape</label><div class="bb-flags">'
              +SIGNAL_SHAPES.map(function(s){ return '<button class="bb-shape-btn" data-shape="'+s+'" title="'+s+'"><span style="display:inline-block;width:18px;height:18px;'+_bbShapeCSS(s,'#3B2510')+'"></span></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Color</label><div class="bb-swatches">'
              +KEY_COLORS.map(function(col){ return '<button class="bb-key-swatch" data-color="'+col+'" style="background:'+col+'"></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Meaning</label><input type="text" id="bb-keybuilder-meaning" placeholder="What does this key mean?"></div>'
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
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Choose a Key</span><button class="bb-close" id="bb-keypicker-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field" id="bb-keypicker-list"></div>'
            +'<button class="bb-flag-btn" id="bb-keypicker-remove" style="width:100%;margin-bottom:8px">Remove this key</button>'
            +'<button class="bb-flag-btn" id="bb-keypicker-new" style="width:100%">Build a new key</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(kpOv);
      kpOv.addEventListener('click', function(e){ if(e.target===kpOv) closeKeyPicker(); });
      _bbMakeDraggable(kpOv.querySelector('.bb-overlay-card'), kpOv.querySelector('.bb-overlay-head'));
    }
    // Link picker (9396 -- next free number after 9395's Choose a Key),
    // Aug 3 2026. Loads the traveler's own Storyboard items and other
    // Briefing Cards once per open, then filters client-side as they
    // type -- both lists are small enough (low hundreds at most) that a
    // live search-as-you-type call to Supabase on every keystroke would
    // just be slower for no real benefit.
    if(!document.getElementById('bb-linkpicker-overlay')){
      var lpOv=document.createElement('div');
      lpOv.id='bb-linkpicker-overlay'; lpOv.className='bb-overlay';
      lpOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Link</span><button class="bb-close" id="bb-linkpicker-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><input type="text" id="bb-linkpicker-search" placeholder="Search Storyboard ideas, headers, and Briefing Cards..."></div>'
            +'<div class="bb-field" id="bb-linkpicker-results"></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(lpOv);
      lpOv.addEventListener('click', function(e){ if(e.target===lpOv) closeLinkPicker(); });
      _bbMakeDraggable(lpOv.querySelector('.bb-overlay-card'), lpOv.querySelector('.bb-overlay-head'));
    }

    T().registerPageNum('s-briefing-board', '9350');
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
    var cards=_bbCardsList().filter(function(c){ return !c.archived; });
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
        // Aug 3 2026, "more links, more key" -- bb-has-links (1-2) /
        // bb-many-links (3+) scale the card's own shadow, see the CSS
        // above. Count comes from _bbLinkCountCache, refreshed whenever
        // a board loads or a card's links change (see _bbLoadLinkCounts).
        var linkCount=_bbLinkCountCache[c.id]||0;
        el.className='bb-card'+(linkCount>=3?' bb-many-links':(linkCount>=1?' bb-has-links':''));
        el.draggable=true;
        el.setAttribute('data-id', c.id);
        var dotHTML = c.person ? ('<span class="bb-dot" style="background:#9c8b73" title="'+_esc(c.person)+'">'+_esc(_bbInitials(c.person))+'</span>') : '';
        var priBadge = c.priority ? '<span class="bb-pri-badge" style="background:'+PRI_COLOR[c.priority]+';color:'+PRI_TEXT[c.priority]+'">'+c.priority+'</span>' : '';
        var routineBadge = c.routine ? '<span class="bb-routine-badge" title="Routine card">🔄</span>' : '';
        // Larry, July 20, 2026: no date shown at all until a START DATE
        // exists (manually set in advance, or auto-stamped the moment
        // this card first moves into Doing) -- the quieter "date added
        // to the board" (c.assigned) is still recorded for later, just
        // not displayed here; not important enough to take up card-face
        // space, though it does show read-only on the back of the card.
        var startBadge = c.startDate ? '<span class="bb-date">'+_esc(c.startDate)+'</span>' : '';
        el.innerHTML='<div class="bb-top"><span class="bb-top-left">'+routineBadge+priBadge+startBadge+'</span>'+dotHTML+'</div>'
          +'<div class="bb-task">'+_esc(c.task)+'</div>'
          +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+(c.due?('DUE: '+_esc(c.due)):'')+'</span></div>'
          +(c.col==='done' && c.completedDate ? ('<div class="bb-done-date">COMPLETED: '+_esc(c.completedDate)+'</div>') : '')
          +((c.keys && c.keys.some(function(k){ return k; })) ? ('<div class="bb-key-badges">'+c.keys.filter(function(kid){ return kid; }).map(function(kid){
              var k=_keyLib.filter(function(x){ return x.id===kid; })[0];
              if(!k) return '';
              // Link count next to the key, Aug 4 2026 -- Larry: "Links
              // are Key related, therefore links number should be to
              // the right of the Key symbol. One key on a card might
              // have 7 links; another only 3." A key's count is exactly
              // how many other cards/ideas currently share that same
              // key (that's what auto-linking connects), read straight
              // from _bbKeyLinkCountCache rather than the card-wide
              // total badge, which lumps every key together.
              var lc=(_bbKeyLinkCountCache[c.id] && _bbKeyLinkCountCache[c.id][kid]) || 0;
              return '<span class="bb-key-badge-wrap" title="'+_esc(k.meaning||'')+(lc?' — '+lc+' linked via this key':'')+'">'
                +'<span class="bb-key-badge" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
                +(lc?'<span class="bb-key-link-count">'+lc+'</span>':'')
                +'</span>';
            }).join('')+'</div>') : '')
          +'<div class="bb-corner" data-flip="'+c.id+'" title="Flip card"></div>';
        el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
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
        if(c){
          var wasCol=c.col;
          c.col=zone.getAttribute('data-col');
          // July 22, 2026: dropping a card into one of the 3 Do columns
          // sets its priority to match (coarse -- H DO/M DO/L DO), same
          // as the H/M/L buttons but reachable by drag now too. Doesn't
          // touch priority when dragging into Doing/Done/Hang-Ups --
          // only the 3 Do columns are priority-linked.
          if(_bbIsDoCol(c.col)) c.priority=_bbPriorityForDrop(c.col, c.priority);
          if(c.col==='doing' && _bbIsDoCol(wasCol) && !c.startDate) c.startDate=_bbToday();
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
          _bbSaveLocal(_bbCardsList());
        }
        renderBoard();
      });
    });
    var addTile=document.getElementById('bb-add-tile');
    if(addTile) addTile.addEventListener('click', openAddCard);
  }

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
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(!c) return;
    document.getElementById('bb-d-added').textContent=c.assigned||'—';
    document.getElementById('bb-d-situation').value=c.situation||'';
    document.getElementById('bb-d-hangup-since').textContent=c.hangupSince||'—';
    document.getElementById('bb-d-hangup-wrap').style.display = (c.col==='hangups') ? '' : 'none';
    // Problem-red back, July 21, 2026 (evening) -- Larry: the card back
    // itself should read as a problem card while it's sitting in
    // HANG-UPS, not just the field that's revealed. Reuses the same
    // fixed Hang-Ups red (#a3372b) already used on the column header and
    // flag buttons -- one semantic color for "this is stuck," everywhere.
    var _bbDetailCard=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCard) _bbDetailCard.classList.toggle('bb-hangup-active', c.col==='hangups');
    // Unhooking Ideas button, July 21, 2026 (evening) -- this is a
    // permanent overlay element, never re-created between cards, so its
    // disabled/"Opening…" state from a previous click has to be reset
    // explicitly here or it stays stuck disabled on the next card opened
    // (the bug Larry hit working his way back to the card).
    var _bbUnhookBtn=document.getElementById('bb-d-unhook-ideas');
    if(_bbUnhookBtn){ _bbUnhookBtn.disabled=false; _bbUnhookBtn.textContent='\u{1FA9D} Unhooking Ideas'; }
    document.getElementById('bb-d-task').value=c.task||'';
    _bbRenderPersonSelect(c.person||'');
    document.getElementById('bb-d-due').value=c.due||'';
    document.getElementById('bb-d-due-time').value=c.dueTime||'';
    document.getElementById('bb-d-start').value=c.startDate||'';
    document.getElementById('bb-d-start-time').value=c.startTime||'';
    document.getElementById('bb-d-routine').value=c.routineFreq||'';
    document.getElementById('bb-d-routine-custom').value=c.routineCustom||'';
    document.getElementById('bb-d-routine-custom').style.display=(c.routineFreq==='custom')?'':'none';
    document.getElementById('bb-d-routine-toggle').classList.toggle('bb-routine-on', !!c.routine);
    var _bbDetailCardR=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCardR) _bbDetailCardR.classList.toggle('bb-routine-active', !!c.routine);
    document.getElementById('bb-d-budget').value=c.budget||'';
    document.getElementById('bb-d-notes').value=c.notes||'';
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
    _bbLinksCache=[];
    _bbRenderLinks();
    _bbLoadLinksForCard(id);
    var ov=document.getElementById('bb-detail-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function closeCardDetail(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(c){
      c.task=document.getElementById('bb-d-task').value;
      c.situation=document.getElementById('bb-d-situation').value;
      c.person=document.getElementById('bb-d-person').value;
      c.due=document.getElementById('bb-d-due').value;
      c.dueTime=document.getElementById('bb-d-due-time').value;
      c.startDate=document.getElementById('bb-d-start').value;
      c.startTime=document.getElementById('bb-d-start-time').value;
      c.routineFreq=document.getElementById('bb-d-routine').value;
      c.routineCustom=document.getElementById('bb-d-routine-custom').value;
      c.budget=document.getElementById('bb-d-budget').value;
      c.notes=document.getElementById('bb-d-notes').value;
      c.reviewedBy=document.getElementById('bb-d-reviewer').value;
      c.growNote=document.getElementById('bb-d-grow-note').value;
      _bbSaveLocal(_bbCardsList());
    }
    _bbOpenCardId=null;
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.remove('active');
    // Refresh link counts before redrawing -- the card that was just
    // open may have gotten (or lost) links, and the board-face badge/
    // glow needs to reflect that the moment you're back looking at it.
    Promise.all([_bbLoadLinkCounts(_bbCardsList().map(function(c){ return c.id; })), _bbLoadKeyLinkCounts(_bbCardsList().map(function(c){ return c.id; }))]).then(renderBoard);
  }

  function openTrashConfirm(id){
    _bbTrashPendingId=id;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.add('active');
  }

  function closeTrashConfirm(){
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
  }

  function doTrashCard(){
    var id=_bbTrashPendingId;
    _bbCards=_bbCardsList().filter(function(x){ return x.id!==id; });
    _bbSaveLocal(_bbCards);
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
    renderBoard();
  }

  function openSettings(){
    _bbHighlightAppearance();
    var sw=document.getElementById('bb-start-warn-days'); if(sw) sw.value=_bbStartWarnDays();
    var dw=document.getElementById('bb-due-warn-days'); if(dw) dw.value=_bbDueWarnDays();
    _bbLoadTeam();
    _bbLoadSharing();
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.add('active');
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
  }

  // Custom Keys -- a shared library of up to 12 traveler-defined
  // keys (shape+color+meaning), built in the Add-a-Key overlay (9390).
  // A card holds up to 3 (c.keys, always kept gap-free -- see
  // removeKeyFromSlot). Tapping ANY circle (empty or filled) opens
  // Choose a Key (9395), which does triple duty: assign an existing
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
      html += '<button class="bb-key-btn bb-key-add" data-slot="'+keys.length+'" title="Add a key">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.bb-key-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        openKeyPicker(Number(btn.getAttribute('data-slot')));
      });
    });
  }

  function openKeyPicker(slotIndex){
    _bbOpenSlotIndex = slotIndex;
    _bbRenderKeyPickerList();
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    var hasKey = !!(c && c.keys && c.keys[slotIndex]);
    var removeBtn=document.getElementById('bb-keypicker-remove');
    if(removeBtn) removeBtn.style.display = hasKey ? '' : 'none';
    var ov=document.getElementById('bb-keypicker-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyPicker(){
    var ov=document.getElementById('bb-keypicker-overlay'); if(ov) ov.classList.remove('active');
  }
  // Shows the whole library every time a slot is tapped -- Larry's "so
  // you know what is already possible" ask -- greying out any entry
  // already sitting in one of this card's OTHER two slots, since one
  // card showing the same key twice would just be confusing.
  function _bbRenderKeyPickerList(){
    var list=document.getElementById('bb-keypicker-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    var keys=(c && c.keys) || [];
    if(!lib.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No keys yet &mdash; build your first one below.</div>';
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
          // wherever he actually runs into a key, not just Board
          // Settings' library manager. Same edit form (openKeyBuilder
          // with existingKey), reached straight from the card's own
          // Choose-a-Key picker too.
          +'<button class="bb-key-pick-edit" data-key-id="'+k.id+'" title="Edit this key">&#9998;</button>'
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
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
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
    if(_bbOpenCardId===c.id) await _bbLoadLinksForCard(c.id);
    await Promise.all([_bbLoadLinkCounts(_bbCardsList().map(function(x){ return x.id; })), _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }))]);
    renderBoard();
  }
  async function removeKeyFromSlot(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
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
    if(_bbOpenCardId===c.id) await _bbLoadLinksForCard(c.id);
    await Promise.all([_bbLoadLinkCounts(_bbCardsList().map(function(x){ return x.id; })), _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }))]);
    renderBoard();
  }

  // existingKey -- optional (Aug 3 2026, pencil-to-edit on the Key
  // Library manager). Pre-fills the draft from a real key row and
  // switches saveNewKey (below) into update mode instead of insert.
  // onSaved(savedKeyRow) -- what to do once it's actually saved: assign
  // it to the card slot that opened this (bb-keypicker-new's case,
  // below), or just refresh whatever list is showing it (Key Library
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
    var t=document.querySelector('#bb-keybuilder-overlay .bb-overlay-title'); if(t) t.textContent=existingKey?'Edit Key':'Add a Key';
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
  // place (a card's Choose-a-Key, and the Key Library manager).
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
      console.error('Briefing Board: could not save key', e);
      window.alert('Could not save that key. Error: '+(e&&e.message?e.message:String(e))+'. Please try again.');
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

  // ---- Key Library manager (9397) ----

  function _bbRenderKeyLibManager(){
    var list=document.getElementById('bb-keylib-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    if(!lib.length){
      list.innerHTML='<div class="bb-links-empty">No custom keys yet. Build one below.</div>';
    } else {
      list.innerHTML=lib.map(function(k){
        return '<div class="bb-keylib-row">'
          +'<span class="bb-keylib-swatch" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-keylib-meaning">'+_esc(k.meaning||'')+'</span>'
          +'<button class="bb-keylib-edit" data-key-id="'+_esc(k.id)+'" title="Edit this key">&#9998;</button>'
          +'<button class="bb-keylib-del" data-key-id="'+_esc(k.id)+'" title="Delete this key">&#128465;&#65039;</button>'
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
          if(!window.confirm('Delete this key? It will be removed from every card and Storyboard item currently using it, and any links that exist only because of it.')) return;
          try{ await _bbDeleteKey(id); }
          catch(e){ console.error('Briefing Board: could not delete key', e); window.alert('Could not delete that key. Please try again.'); return; }
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
    T().wire('bb-open-keylib', function(){ closeSettings(); openKeyLibManager(); });
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
    if(openBtn) openBtn.innerHTML = '\uD83E\uDD1D ' + (_bbSharingIsOwner ? 'Manage Access' : 'View Access');
  }

  function _bbRenderSharingList(){
    var list=document.getElementById('bb-sharing-list'); if(!list) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var addRow=document.getElementById('bb-sharing-add-row');
    if(addRow) addRow.style.display = _bbSharingIsOwner ? 'flex' : 'none';
    if(!_bbSharingCache.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">Nobody else has access yet.</div>';
      return;
    }
    list.innerHTML=_bbSharingCache.map(function(m){
      return '<div class="bb-keylib-row" data-user-id="'+_esc(m.user_id)+'">'
        +'<span class="bb-keylib-meaning">'+_esc(m.name||m.email)+'</span>'
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
  }
  function wireSharingManager(){
    T().wire('bb-open-sharing', function(){ closeSettings(); openSharingManager(); });
    T().wire('bb-sharing-close', closeSharingManager);
    var addBtn=document.getElementById('bb-sharing-add-btn');
    if(addBtn) addBtn.addEventListener('click', async function(){
      if(!_bbSharingIsOwner){ window.alert('Only the board owner can add people.'); return; }
      var input=document.getElementById('bb-sharing-add-email');
      var email=input?input.value.trim().toLowerCase():'';
      if(!email) return;
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
        var ins=await sb.from('board_members').insert({board_id: board.id, user_id: match.user_id, added_by: myUid});
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

  function wirePriorityButtons(){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
          if(!c) return;
          var base=btn.getAttribute('data-pri-base');
          c.priority=_bbNextPriority(c.priority||'', base);
          // July 22, 2026: keep the card in the Do column matching its
          // new priority family, IF it's currently sitting in one of
          // the 3 Do columns at all (a card in Doing/Done/Hang-Ups can
          // still have its priority changed here without being yanked
          // back into Do).
          if(_bbIsDoCol(c.col)){ c.col=_bbDoColKey(c.priority); _bbResortDoColumnByPriority(c.col); }
          _bbSaveLocal(_bbCardsList());
          _bbHighlightPriority(c.priority);
          renderBoard();
        });
      })(btns[i]);
    }
  }

  // Rename, Aug 3 2026 -- Larry: "How can a traveler edit the name of
  // the Briefing Board?" There wasn't a way; the only place a name ever
  // got typed in was "+ Add a board...". Small pencil button next to
  // NAME does a plain rename-in-place -- same board, same cards, just a
  // new label -- rather than creating a new board.
  function wireRenameButton(){
    T().wire('bb-rename-btn', async function(){
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
    });
  }

  function wireTopicBar(){
    wireTypePicker();
    wireBoardPicker();
    wireRenameButton();
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
    T().wire('bb-settings-close', closeSettings);
    document.querySelectorAll('.bb-theme-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){ _bbApplyTheme(btn.getAttribute('data-theme')); });
    });
    document.querySelectorAll('.bb-font-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _bbApplyFont(btn.getAttribute('data-font')); });
    });
    var startWarnEl=document.getElementById('bb-start-warn-days');
    if(startWarnEl) startWarnEl.addEventListener('change', function(){
      _bbSetStartWarnDays(startWarnEl.value);
      startWarnEl.value=_bbStartWarnDays();
      renderBoard();
    });
    var dueWarnEl=document.getElementById('bb-due-warn-days');
    if(dueWarnEl) dueWarnEl.addEventListener('change', function(){
      _bbSetDueWarnDays(dueWarnEl.value);
      dueWarnEl.value=_bbDueWarnDays();
      renderBoard();
    });
    var teamList=document.getElementById('bb-team-list');
    if(teamList){
      teamList.addEventListener('change', async function(e){
        var row=e.target.closest('.bb-team-row'); if(!row) return;
        var email=row.getAttribute('data-email');
        var name=row.querySelector('.bb-team-name').value.trim();
        var initials=row.querySelector('.bb-team-initials').value.trim().toUpperCase();
        if(!name || !initials) return;
        var sb=T().sb; if(!sb) return;
        await sb.from('members').update({name:name, initials:initials}).eq('email', email);
        await _bbLoadMembers();
        await _bbLoadTeam();
      });
      teamList.addEventListener('click', async function(e){
        var btn=e.target.closest('.bb-checklist-remove'); if(!btn) return;
        var row=btn.closest('.bb-team-row'); if(!row) return;
        var email=row.getAttribute('data-email');
        var name=row.querySelector('.bb-team-name').value;
        if(!window.confirm('Remove '+name+' from the team? They will stop showing up as an assignee (their account is untouched).')) return;
        var sb=T().sb; if(!sb) return;
        await sb.from('members').update({membership_status:'inactive'}).eq('email', email);
        await _bbLoadMembers();
        await _bbLoadTeam();
      });
    }
  }

  // Unhooking Ideas, July 21, 2026 -- hands a Hang-Up card's Situation
  // off to the Idea Storyboard rather than building a second discussion
  // tool here. First click creates a Storyboard Header named after the
  // card's own task (the hang-up becomes the TOPIC, per Larry's framing)
  // with the Situation seeded in as its first idea, and remembers that
  // Header on the card (c.hangupHeaderId) so later clicks just re-open
  // it instead of spawning duplicates. Uses window.T2TData.createHeader
  // (header-data.js) to create the Header safely, then window.T2TShared
  // (idea-media-shared.js, the same shared state 9710/9711 already read
  // and write from other files) plus a plain nav() to hand off into the
  // Storyboard already drilled into that Header -- both are existing
  // cross-module integration points, not a new reach into
  // idea-storyboard-9710.js itself.
  async function _bbUnhookIdeas(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(!c) return;
    var taskField=document.getElementById('bb-d-task');
    var situationField=document.getElementById('bb-d-situation');
    var situationText=situationField?situationField.value.trim():'';
    c.situation=situationText;
    var btn=document.getElementById('bb-d-unhook-ideas');
    if(btn){ btn.disabled=true; btn.textContent='Opening…'; }
    try{
      if(!c.hangupHeaderId){
        if(!window.T2TData || !window.T2TData.createHeader) throw new Error('Storyboard not available yet');
        var header=await window.T2TData.createHeader((taskField&&taskField.value.trim())||c.task||'Hang-Up', null);
        c.hangupHeaderId=header.id;
        if(situationText && T().sb){
          var ures=await T().sb.auth.getUser();
          var uid=ures && ures.data && ures.data.user && ures.data.user.id;
          if(uid){
            await T().sb.from('ideas').insert({user_id:uid, content_type:'text', text_content:situationText, cluster_id:header.id, created_at:new Date().toISOString()});
          }
        }
      }
      _bbSaveLocal(_bbCardsList());
      if(window.T2TShared){ window.T2TShared.currentTopicId=c.hangupHeaderId; window.T2TShared.filter=c.hangupHeaderId; }
      // Return override, July 21, 2026 -- without this, X on the
      // Storyboard always fell back to the backpack menu, not back to
      // the Hang-Up card that sent you there (confusing, per Larry).
      // Captures the card id now, since _bbOpenCardId gets cleared by
      // closeCardDetail() right below.
      var _bbReturnCardId=c.id;
      if(T().markReturnOverride){
        T().markReturnOverride(function(){
          T().nav('s-briefing-board');
          openCardDetail(_bbReturnCardId);
        });
      }
      closeCardDetail();
      T().nav('s-sea-of-ideas-cluster');
    }catch(e){
      console.error('Unhooking Ideas failed', e);
      if(btn){ btn.disabled=false; btn.textContent='\u{1FA9D} Unhooking Ideas'; }
      alert('Could not open the storyboard: '+(e&&e.message?e.message:'unknown error'));
    }
  }

  function _bbUpdateReviewUI(c){
    var vBtn=document.getElementById('bb-d-verify');
    var pBtn=document.getElementById('bb-d-pro');
    var gBtn=document.getElementById('bb-d-grow');
    if(vBtn) vBtn.classList.toggle('bb-flag-active', !!c.verified);
    if(pBtn) pBtn.classList.toggle('bb-flag-active', !!c.pro);
    if(gBtn) gBtn.classList.toggle('bb-flag-active', !!c.grow);
  }

  function wireReviewButtons(){
    // PRO and GROW are performance-eval tags -- click to flag, click
    // again to clear, same pattern as Signal flag. Neither one gates
    // anything; they just ride along on the card's history.
    T().wire('bb-d-pro', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.pro=!c.pro;
      _bbSaveLocal(_bbCardsList());
      _bbUpdateReviewUI(c);
    });
    T().wire('bb-d-grow', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
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
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c || c.col!=='done') return;
      c.verified=true;
      c.archived=true;
      _bbSaveLocal(_bbCardsList());
      closeCardDetail();
    });
  }

  function wirePersonSelect(){
    var sel=document.getElementById('bb-d-person'); if(!sel) return;
    sel.addEventListener('change', function(){
      if(sel.value!=='__add__') return;
      var name=window.prompt('Full name for the new person:');
      if(!name || !name.trim()){ _bbRenderPersonSelect(''); return; }
      var initials=_bbInitialsFromName(name);
      var display=initials+' '+name.trim();
      if(_bbMembersCache.indexOf(display)===-1) _bbMembersCache.push(display);
      _bbRenderPersonSelect(display);
    });
  }

  function wireRoutineControls(){
    T().wire('bb-d-routine-toggle', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.routine=!c.routine;
      _bbSaveLocal(_bbCardsList());
      document.getElementById('bb-d-routine-toggle').classList.toggle('bb-routine-on', !!c.routine);
      var card=document.querySelector('#bb-detail-overlay .bb-overlay-card');
      if(card) card.classList.toggle('bb-routine-active', !!c.routine);
      renderBoard();
    });
    var sel=document.getElementById('bb-d-routine');
    if(sel) sel.addEventListener('change', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.routineFreq=sel.value;
      var custom=document.getElementById('bb-d-routine-custom');
      if(custom) custom.style.display = (sel.value==='custom') ? '' : 'none';
      if(sel.value){
        c.routine=true;
        document.getElementById('bb-d-routine-toggle').classList.add('bb-routine-on');
        var card=document.querySelector('#bb-detail-overlay .bb-overlay-card');
        if(card) card.classList.add('bb-routine-active');
      }
      _bbSaveLocal(_bbCardsList());
      renderBoard();
    });
    var custom=document.getElementById('bb-d-routine-custom');
    if(custom) custom.addEventListener('change', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
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
  function _bbApplyRemoteCard(evt, row, oldRow){
    var boardId = row ? row.board_id : (oldRow ? oldRow.board_id : null);
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
  function _bbApplyRemoteLinks(evt, row, oldRow){
    var cardId = (row && row.card_id) || (oldRow && oldRow.card_id);
    var targetCardId = (row && row.target_card_id) || (oldRow && oldRow.target_card_id);
    if (_bbOpenCardId && (cardId === _bbOpenCardId || targetCardId === _bbOpenCardId)) _bbLoadLinksForCard(_bbOpenCardId);
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
    T().wire('b-bb-save-card', function(){
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
      closeAddCard();
      renderBoard();
    });

    T().wire('bb-detail-close', closeCardDetail);
    T().wire('bb-d-unhook-ideas', _bbUnhookIdeas);
    wirePriorityButtons();
    wireReviewButtons();
    wireRoutineControls();
    wirePersonSelect();
    wireKeyBuilder();
    wireKeyPicker();
    wireKeyLibManager();
    wireSharingManager();
    wireChecklist();
    wireLinks();

    T().wire('bb-trash-yes', doTrashCard);
    T().wire('bb-trash-no', closeTrashConfirm);
    wireTrashIcon();
    wireTopicBar();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('briefing_cards', _bbApplyRemoteCard);
      T().onRealtimeChange('briefing_checklist_items', _bbApplyRemoteChecklist);
      T().onRealtimeChange('briefing_card_links', _bbApplyRemoteLinks);
      T().onRealtimeChange('custom_keys', _bbApplyRemoteKey);
    }
  });

})();
