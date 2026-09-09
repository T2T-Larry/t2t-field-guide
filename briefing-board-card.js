/* ============================================================
   briefing-board-card.js -- T2T Field Guide - BRIEFING BOARD (9350)

   CARD. Everything about one card's own lifecycle: the data model
   and its local + Supabase persistence, undo/redo and the Recent
   Moves log, the checklist, trash/Recently-Deleted, the Archive +
   History + Briefing Log panels (what an earlier attempt called
   briefing-board-archive.js -- folded in here instead of its own
   file), Review/PRO/GROW, the card-detail lock and link-preview and
   Additions and Routine controls, and applying incoming live-sync
   updates to a card or its checklist.

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

   Sibling files: reads Signal-Flags data from briefing-board-signal-flags.js for key-link counts; called into from briefing-board-ops.js (card detail) and briefing-board.js (startup wiring).
   ============================================================ */



  var REVIEWERS = ['Larry']; // stand-in list until the real roster exists
  // Card background color, Session 234 (Aug 21) -- new for Briefing Cards,
  // added for bottom-row consistency with the Idea Card (Larry: "add the
  // same bottom row as on the IDEA CARD to the BB Cards... gear..."). Same
  // 8-color palette as idea-storyboard-9710.js's _sboardColorPalette,
  // hardcoded here rather than piped through the T2TStoryboard bridge --
  // it's a fixed list, not live state, so a cross-file dependency would
  // just be overhead.
  var BB_COLOR_PALETTE = ['#d6eaf8','#d9f2e6','#fdf3d0','#f8d9e3','#e6d9f2','#fbe3d0','#d0f2ec','#f0ebe0'];

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
  // Sept 7 2026 -- widened from _bbCardsList() alone to _bbFindCardAnywhere
  // (every single-card mutator on this page now goes through the same
  // one), plus an explicit _bbPersistMergedCardById so a merged
  // (foreign/shared-in/rollup) card actually gets saved even when it
  // isn't the card currently open in the detail overlay -- undo/redo,
  // trash, and color can all target a card that was never opened.
  function _bbApplyCardSnapshot(cardId, snap){
    var c=_bbFindCardAnywhere(cardId);
    if(!c) return;
    c.col=snap.col; c.priority=snap.priority;
    if(typeof snap.sortOrder==='number') c.sortOrder=snap.sortOrder;
    if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
    _bbStampDateEscalationHandled(c);
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(cardId);
    renderBoard();
  }
  function _bbApplyTrashState(cardId, trashedAt){
    var c=_bbFindCardAnywhere(cardId);
    if(!c) return;
    c.trashedAt=trashedAt;
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(cardId);
    renderBoard();
  }
  // Card color, Session 234 (Aug 21) -- new for Briefing Cards, set from
  // the bottom row's ⚙️ Gear swatches. Own tiny undo/redo helper, same
  // shape as _bbApplyTrashState just above, rather than folding it into
  // BB_DETAIL_FIELDS (that group only covers fields the detail form
  // saves together on close; color saves immediately on click instead).
  function _bbApplyColor(cardId, color){
    var c=_bbFindCardAnywhere(cardId);
    if(!c) return;
    c.color=color;
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(cardId);
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
    var c=_bbFindCardAnywhere(cardId);
    if(!c) return;
    BB_DETAIL_FIELDS.forEach(function(k){ if(Object.prototype.hasOwnProperty.call(fields,k)) c[k]=fields[k]; });
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(cardId);
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
    var c=_bbFindCardAnywhere(m.card_id);
    if(!c){ window.alert('That card is no longer on this board (it may have been trashed).'); return; }
    var before=_bbSnapshotCard(c);
    c.col=m.from_col; c.priority=m.from_priority; c.sortOrder=(typeof m.from_sort_order==='number')?m.from_sort_order:c.sortOrder;
    if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
    _bbStampDateEscalationHandled(c);
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(m.card_id);
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

  var TRASH_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
  // Aug 7 2026 -- the "Recent Moves" icon (a plain clock) that opens
  // the move-history/undo panel, sitting just to the left of Trash.
  var MOVES_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 16 14"></polyline></svg>';

  var _bbCards = null;
  var _bbTrashPendingId = null;

  var _bbChecklistCache = [];
  // Per-key link counts, Aug 4 2026 -- Larry: "Links are Key related...
  // One key on a card might have 7 links; another only 3." Same shape
  // Keyed two levels deep: {cardId: {keyId: n}}.
  // A key's link count IS the number of other cards/ideas currently
  // sharing that exact key (that's what _bbSyncKeyLinks wires up one
  // edge per pair for), so this reads straight off the already-tagged
  // source='key' rows rather than recomputing anything.
  var _bbKeyLinkCountCache = {};

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
    // Sept 9 2026 -- returns the sync promise now (was fire-and-forget)
    // so a caller that needs a second, dependent write to land AFTER
    // this one can chain onto it instead of racing it. See
    // _bbSaveNewCard's own comment for the bug this fixed.
    var syncPromise=_bbSyncCardsToSupabase(cards, deletedIds);
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
    _bbPersistOpenMergedCardIfAny();
    return syncPromise;
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
  // nothing. This checks every place a card can live; every open/edit/save
  // path below should go through this instead of _bbCardsList() alone
  // whenever it's resolving the currently-open card.
  //
  // Sept 7 2026 fix (Larry: "ALL CARDS EVERYWHERE NEED TO OPEN WITH A
  // DOUBLE CLICK. One code!") -- the Master Briefing Board rollup
  // (_bbRollupCards, added Sept 5 2026) repeated the exact bug this
  // function exists to prevent: renderBoard() happily draws rollup cards
  // on the board, but this lookup never learned about that fourth source,
  // so double-clicking any card rolled up from a layer below silently did
  // nothing -- while a card native to the board actually being viewed
  // (already in _bbCardsList()) opened fine. Rewritten as a loop over
  // every known card-source array instead of one hand-written check per
  // source, so the next new source (whatever it turns out to be) can't
  // quietly repeat this same miss by being left out of a list someone
  // has to remember to update by hand.
  function _bbFindCardAnywhere(id){
    var sources=[_bbCardsList(), _bbForeignCards, _bbSharedInCards, _bbRollupCards];
    for(var i=0;i<sources.length;i++){
      var list=sources[i]; if(!list) continue;
      for(var j=0;j<list.length;j++){ if(list[j].id===id) return list[j]; }
    }
    return undefined;
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
      topicLabel: row.topic_label || '',
      // One-board model, Sept 8 2026 -- which project (Header) this task
      // belongs to; null means general/unassigned, visible only at
      // MASTER root. Deliberately left OUT of _bbCardToRow's own payload
      // below (same treatment as sourceHeaderId/topicLabel just above,
      // for the same reason): a routine whole-board save must never be
      // able to move or clear a card's project assignment just because
      // it happened to be open while something else on it was edited.
      // It's set exactly once, at creation (_bbStampCardProject), via
      // its own narrow single-column write.
      projectHeaderId: row.project_header_id || null,
      // "Hide initials on front" (Aug 28 2026) -- see idea-storyboard-9710.js's
      // _csSetHideBadge comment: that shared function writes hide_primary_badge
      // straight to this card's own briefing_cards row, but this mapping was
      // the missing link that let a Briefing Card's own tile actually read it
      // back out. Without it the checkbox saved fine but never changed what
      // the card's corner badge showed.
      hidePrimaryBadge: !!row.hide_primary_badge
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


  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
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
    // Sept 7 2026 fix (Larry: "TRASH a NEW BB card is NOT working any
    // more") -- same missed-source gap as the open/edit/drag lookups
    // above, on the actual trash action itself: a card dragged straight
    // to the trash can (the normal way in, especially now that opening
    // a card first is no longer required) is very often a merged card,
    // and this used to only ever look at _bbCardsList().
    var c=_bbFindCardAnywhere(id);
    if(c){
      var ts=new Date().toISOString();
      c.trashedAt=ts;
      _bbPersistMergedCardById(id);
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
    // Session 255: opens the same flat Cast popup Idea/Plan cards use now
    // (add/remove/role/notes/contact/print/filter in one screen) instead
    // of the old compact dropdown -- Briefing Cards get the full screen
    // for the first time here, not just the star/add/remove it had before.
    T().wire('bb-d-people', function(e){
      e.stopPropagation();
      var c=_bbFindCardAnywhere(_bbOpenCardId); if(!c) return;
      if(window.T2TStoryboard && T2TStoryboard.openCallSheet){
        T2TStoryboard.openCallSheet(c, null, 'briefing_card', _bbCastFilterChange, _bbPersonFilterIds);
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
