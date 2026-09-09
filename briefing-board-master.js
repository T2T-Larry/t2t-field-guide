/* ============================================================
   briefing-board-master.js -- T2T Field Guide - BRIEFING BOARD (9350)

   MASTER. The logic behind the single shared MASTER board: which
   board/project is currently active, resolving or creating a board
   for a given tree Header, rolling cards up to Master, merging in
   cards shared or foreign from other boards, and the whole board-
   switch/board-create data path. This is the newest, most actively-
   changing part of the Briefing Board and where most recent bug
   fixes have landed.

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

   Sibling files: briefing-board-master-nav.js is its UI half (the screens a traveler taps through to use this).
   ============================================================ */



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
  var _bbBoards = [];
  // Project-name lookup, Sept 8 2026 -- the card eyebrow needs a real
  // project name for cards that carry a projectHeaderId but no
  // topicLabel (see the eyebrow logic in renderBoard below for why).
  // Populated once in _bbInitBoardsAndData from T2TData.fetchAllHeaders
  // (same header rows the PROJECT tree itself is built from), keyed by
  // header id -> its own text_content. Same "resolve once at init,
  // self-heals on next reload" idiom as _bbIdeaStoryboardsRootId and
  // _bbRelationsCache just below.
  var _bbProjectNameById = {};
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
  var _bbInitStarted = false;
  // Sept 7 2026 rename+extend (Larry: "ALL CARDS EVERYWHERE... One
  // code!") -- was _bbPersistOpenForeignCardIfAny, foreign/shared-in
  // only. The Master Briefing Board's rollup cards (_bbRollupCards,
  // added Sept 5 2026) hit the exact same silent-loss bug this function
  // was built to fix, for the exact same reason: a fourth card source
  // existed on screen that this check never learned about, so every
  // Notes/Priority/Signal-Flag/etc. edit on a rolled-up card patched the
  // in-memory object and quietly never reached the database. One
  // function now covers every merged source instead of one hand-written
  // branch per source.
  // Sept 7 2026 -- the one place that persists a merged (foreign/
  // shared-in/rollup) card's current in-memory state to its real row,
  // by id, regardless of what changed on it (col, trashedAt, color,
  // task text, whatever -- _bbCardToRow serializes the whole object).
  // Called two ways: right after whichever card is open in the detail
  // overlay changes (_bbPersistOpenMergedCardIfAny, keyed off
  // _bbOpenCardId), and directly by id from every other single-card
  // mutator below (trash, undo/redo, color, unarchive, restore) so a
  // merged card doesn't have to be open to have an action on it
  // actually stick. Every one of those mutators used to check
  // _bbCardsList() alone; a merged card silently "worked" for the rest
  // of the session (the in-memory object really did change, so the
  // board kept looking right) and then reverted on the next real fetch,
  // because nothing had actually reached the database. No-ops cleanly
  // for a native card or any id that isn't a merged card anywhere --
  // native cards are already covered by the normal _bbCardsList()/
  // _bbSaveLocal whole-list sync.
  function _bbPersistMergedCardById(id){
    if(!id) return;
    var fc=(_bbForeignCards||[]).concat(_bbSharedInCards||[]).filter(function(x){ return x.id===id; })[0];
    if(fc) return _bbPersistForeignFieldEdit(fc);
    var rc=(_bbRollupCards||[]).filter(function(x){ return x.id===id; })[0];
    if(rc) return _bbPersistRollupCard(rc);
  }
  async function _bbPersistForeignFieldEdit(fc){
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
  function _bbPersistOpenMergedCardIfAny(){
    return _bbPersistMergedCardById(_bbOpenCardId);
  }
  async function _bbPersistRollupCard(rc){
    var sb=T().sb; if(!sb) return;
    try{
      var row=_bbCardToRow(rc, rc._homeBoardId);
      delete row.id;
      delete row.board_id;
      var res=await sb.from('briefing_cards').update(row).eq('id', rc.id);
      if(res.error) console.error('Briefing Board: rollup card save failed', res.error);
    }catch(e){ console.error('Briefing Board: rollup card save failed', e); }
  }

  function _bbCurrentBoardDefaultAssignee(){
    var b=_bbBoards.filter(function(x){ return x.id===_bbCurrentBoardId; })[0];
    return (b && b.default_assignee) || '';
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
  // Person-assigned filter. Session 255: the header's own VIEW/Team
  // dropdown (and the Idea/Plan board's matching one) is gone -- checking
  // someone in the Cast popup (👥, on every card) is now the only way to
  // set this. _bbSourceFilter stays as the single filter state renderBoard
  // reads at draw time (purely a display filter -- narrows what shows,
  // never touches what's saved); _bbFilterMatchCardIds is the resolved Set
  // of card ids the checked people show up in, any role (a real card_roles
  // query, same reasoning as idea-storyboard-9710.js's
  // _sboardRecomputeFilterMatches -- "any role" can't be read off a
  // primary-doer-only cache).
  var _bbSourceFilter = null; // null = no filter; else {mode:'person', uids:[...]}
  var _bbPersonFilterIds = [];
  var _bbFilterMatchCardIds = null;
  async function _bbRecomputeFilterMatches(){
    if(!_bbPersonFilterIds || !_bbPersonFilterIds.length){ _bbFilterMatchCardIds=null; return; }
    var sb=T().sb; if(!sb){ _bbFilterMatchCardIds=new Set(); return; }
    try{
      var res=await sb.from('card_roles').select('card_id').eq('card_type','briefing_card').in('user_id', _bbPersonFilterIds);
      var set=new Set();
      (res.data||[]).forEach(function(r){ set.add(String(r.card_id)); });
      _bbFilterMatchCardIds=set;
    }catch(e){ _bbFilterMatchCardIds=new Set(); }
  }
  function _bbCastFilterChange(uid, checked){
    uid=String(uid);
    var idx=_bbPersonFilterIds.indexOf(uid);
    if(checked && idx<0) _bbPersonFilterIds.push(uid);
    if(!checked && idx>=0) _bbPersonFilterIds.splice(idx,1);
    _bbSourceFilter = _bbPersonFilterIds.length ? {mode:'person', uids:_bbPersonFilterIds.slice()} : null;
    _bbRecomputeFilterMatches().then(function(){ renderBoard(); });
  }

  // Session 255: the only way left to set this is the Cast popup's
  // checkboxes -- any role, any of the checked people (not just whoever's
  // starred primary), resolved by _bbRecomputeFilterMatches before this
  // ever runs. Falls through to the unfiltered list while a fetch is
  // still in flight so toggling a checkbox doesn't flash an empty board.
  function _bbSourceFilterCards(cards){
    if(!_bbSourceFilter || !_bbSourceFilter.uids) return cards;
    if(!_bbFilterMatchCardIds) return cards;
    return cards.filter(function(c){ return _bbFilterMatchCardIds.has(String(c.id)); });
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
  // Sept 7 2026 -- rollup cards skip _bbHandleMergedCardDrop on purpose.
  // That function's whole job is keeping a merged card's column change
  // PRIVATE to this viewer (personal_col/shared_col) unless it crosses
  // into/out of Doing/Done/Hang-Ups, because a foreign/shared-in card's
  // real status belongs to whoever owns its home board, not to
  // whoever's looking at it from elsewhere. A rollup card has no such
  // owner/viewer split -- the Master Briefing Board IS a real
  // management view of every layer below, so a drag here always writes
  // straight through as the card's one true column, same as dragging it
  // on its own home board would. Deliberately simpler than the native
  // drop handler too (no fine H/M/L escalation by drop position within
  // the column, just the coarse family -- same simplification the
  // foreign/shared merged drop already makes): lands the card at the
  // end of its target column on its own real board, via a Date.now()
  // sortOrder rather than querying that board's real max first, so this
  // can never collide with or renumber cards from a board that isn't
  // even the one currently open.
  function _bbHandleRollupDrop(zone, draggedId, rc){
    var newCol=zone.getAttribute('data-col');
    var wasCol=rc.col;
    if(wasCol===newCol) return;
    rc.col=newCol;
    if(_bbIsDoCol(newCol)) rc.priority=_bbPriorityForDrop(newCol, rc.priority);
    if(newCol==='doing' && _bbIsDoCol(wasCol) && !rc.startDate){ rc.startDate=_bbToday(); rc.addStart=true; }
    if(newCol==='done' && wasCol!=='done') rc.completedDate=_bbToday();
    if(wasCol==='done' && newCol!=='done'){ rc.completedDate=''; rc.verified=false; rc.pro=false; rc.grow=false; }
    if(newCol==='hangups' && wasCol!=='hangups') rc.hangupSince=_bbToday();
    if(wasCol==='hangups' && newCol!=='hangups') rc.hangupSince='';
    rc.sortOrder=Date.now();
    _bbPersistRollupCard(rc).then(renderBoard);
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
          _bbRenderLogo();
          _bbRenderTravelerName();
          _bbRenderParentField();
          await _bbRenderTopicField();
          _bbPositionBoardKindMidway();
          await _bbLoadMasterRollupCards();
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
    _bbRenderLogo();
    _bbRenderTravelerName();
    _bbRenderParentField();
    await _bbRenderTopicField();
    _bbPositionBoardKindMidway();
    await _bbLoadMasterRollupCards();
    await _bbLoadKeyLinkCounts(_bbCards.map(function(c){ return c.id; }));
    await _bbLoadForeignCardsForPersonalBoard(board);
    await _bbLoadSharedInCardsForProjectBoard(board);
    renderBoard();
  }

  // Root-header set, Sept 5 2026 -- see the call site in
  // _bbInitBoardsAndData above. {headerId: true} for a confirmed project
  // root, {headerId: false} for a confirmed nested layer; an id simply
  // absent means "not checked yet" and PROJECT's own filter treats that
  // as include-by-default, so a slow/failed lookup never hides a real
  // project.
  //
  // Sept 6 2026 fix, Larry: "the BB still has the wrong projects." All
  // three places that filled this set tested `!cluster_id` -- "sits at
  // the database's true top level" -- which was the right test before
  // Sept 2, when every real project genuinely lived there. Once the
  // Idea Storyboards migration moved every real project one level down
  // (nested under this member's own Idea Storyboards root instead), a
  // real top-level project like "Field Guide" always has a cluster_id
  // now (pointing at that root) and this test wrongly read it as a
  // nested layer -- which is exactly why PROJECT's own filter below
  // (`_bbRootHeaderIdSet[id]!==false`) was quietly excluding real
  // projects. _bbIsProjectRoot/_bbIdeaStoryboardsRootId (fetched once in
  // _bbInitBoardsAndData via the same T2TData.ensureIdeaStoryboardsRoot
  // the Idea Board itself calls) replace that stale test everywhere it
  // was used.
  var _bbRootHeaderIdSet = {};
  var _bbIdeaStoryboardsRootId = null;
  function _bbIsProjectRoot(clusterId){
    // Degrades to the old (pre-migration) test only if the root id
    // itself somehow never resolved -- a failed fetch shouldn't mark
    // every real project as a nested layer.
    return _bbIdeaStoryboardsRootId ? clusterId===_bbIdeaStoryboardsRootId : !clusterId;
  }
  // Header cluster/name cache, Sept 5 2026 fix -- {headerId: {clusterId,
  // name}} for every Header this pass has touched, so PROJECT (when
  // standing on a nested layer's own auto-created board) and PARENT (when
  // that layer has no board_relations adoption of its own) can both climb
  // one step up the same Idea-tree cluster_id chain the Idea Board already
  // uses, instead of the generic dropdown fallback or a flat "No parent
  // yet". Populated here and in _bbResolveOrCreateBoardForHeader, wherever
  // this data is already being fetched anyway -- never a dedicated
  // round-trip of its own.
  var _bbHeaderInfoById = {};
  async function _bbRefreshRootHeaderIdSet(){
    var linkedIds=_bbBoards.filter(function(b){ return b.storyboard_project_id; }).map(function(b){ return b.storyboard_project_id; });
    if(!linkedIds.length) return;
    try{
      var sb=T().sb;
      var res=await sb.from('ideas').select('id,cluster_id,text_content').in('id',linkedIds);
      if(res.error) return;
      (res.data||[]).forEach(function(r){
        _bbRootHeaderIdSet[r.id]=_bbIsProjectRoot(r.cluster_id||null);
        _bbHeaderInfoById[r.id]={clusterId:r.cluster_id||null, name:r.text_content||'(untitled)'};
      });
    }catch(e){ console.warn('Briefing Board: could not check which boards are project roots', e); }
  }
  // Climbs from a nested layer's Header up to its real project root,
  // resolving/creating the linked board for whichever Header it lands on
  // (its immediate ancestor, one step at a time -- same "one level up"
  // meaning PARENT already has everywhere else). Falls back to a plain
  // Supabase fetch for any ancestor _bbHeaderInfoById hasn't seen yet
  // (e.g. a grandparent layer nobody has opened via BB this session).
  // Sept 5 2026 fix.
  async function _bbFetchHeaderInfo(headerId){
    if(_bbHeaderInfoById[headerId]) return _bbHeaderInfoById[headerId];
    var sb=T().sb; if(!sb) return null;
    try{
      var res=await sb.from('ideas').select('id,cluster_id,text_content').eq('id',headerId).maybeSingle();
      if(res.error || !res.data) return null;
      var info={clusterId:res.data.cluster_id||null, name:res.data.text_content||'(untitled)'};
      _bbHeaderInfoById[headerId]=info;
      _bbRootHeaderIdSet[headerId]=_bbIsProjectRoot(info.clusterId);
      return info;
    }catch(e){ console.warn('Briefing Board: could not fetch ancestor Header', e); return null; }
  }

  // Header -> board resolver, Sept 5 2026 -- backs the deep-link above
  // (first visit to Briefing Board this session), window.T2TBriefingBoard.
  // jumpToTopic below (Briefing Board already open), and TOPIC's own
  // descend-to-a-child-layer dropdown (_bbRenderTopicField). Started life
  // scoped to project roots only ("PROJECTS on a BB are exactly the same
  // as on the Idea Board"); widened same day once Larry asked for TOPIC
  // itself to work "exactly the same" too ("if DREAM PHASE is the TOPIC
  // on the Idea Board, then DREAM PHASE is the BB") -- any Header row
  // works here now, root project or a layer nested arbitrarily deep
  // inside one, since a Briefing Board's link (storyboard_project_id) was
  // never actually restricted to roots, only ever used that way. Mirrors
  // _bbCreateBoard's own "+Add a board" insert -- same two tables, same
  // two-way link (storyboard_project_id on the board, briefing_board_id
  // on the Header's ideas row) -- but starting from an existing Header
  // instead of a brand-new name, so nothing here ever creates a new
  // Header, only the board that stands in for it here.
  async function _bbResolveOrCreateBoardForHeader(headerId){
    if(!headerId) return null;
    // One-board model, Sept 8 2026 -- a traveler with one true board
    // never gets a second one created for them: "landing on" a project
    // Header just means filtering the one board down to it. Every call
    // site above (deep-links, PROJECT's dropdown, TOPIC's own descend/
    // ascend, jumpToTopic) already expects a board object back and
    // passes it straight to _bbSwitchToBoard, so this still returns
    // one -- the same one, every time -- with the actual navigation
    // happening here instead, via _bbSetProjectFilter.
    if(_bbSingleBoardMode()){
      await _bbSetProjectFilter(headerId);
      return _bbBoards[0];
    }
    var existing=_bbBoards.filter(function(b){ return b.storyboard_project_id===headerId; })[0];
    if(existing) return existing;
    var sb=T().sb, uid=await _bbCurrentUserId();
    if(!uid || !sb) return null;
    try{
      var hdrRes=await sb.from('ideas').select('id,cluster_id,text_content,board_type,briefing_board_id').eq('id',headerId).maybeSingle();
      if(hdrRes.error || !hdrRes.data) return null;
      var hdr=hdrRes.data;
      // Sept 5 2026 -- known the moment we've fetched this Header at all,
      // whether or not it ends up needing a new board: keeps
      // _bbRootHeaderIdSet (PROJECT's own root-vs-layer filter, above)
      // current without a second round-trip.
      _bbRootHeaderIdSet[headerId] = _bbIsProjectRoot(hdr.cluster_id||null);
      _bbHeaderInfoById[headerId] = {clusterId:hdr.cluster_id||null, name:hdr.text_content||'(untitled)'};
      // This Header may already point at a board this traveler's own
      // _bbBoards fetch didn't happen to include (shouldn't normally
      // happen -- RLS scopes both the same way -- but cheap to check
      // before creating a second one).
      if(hdr.briefing_board_id){
        var already=_bbBoards.filter(function(b){ return b.id===hdr.briefing_board_id; })[0];
        if(already) return already;
      }
      var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:hdr.board_type||'personal', name:hdr.text_content||'Untitled', storyboard_project_id:headerId}).select().single();
      if(ins.error || !ins.data){ console.error('Briefing Board: could not create linked board for this layer', ins.error); return null; }
      _bbBoards.push(ins.data);
      try{ await sb.from('ideas').update({briefing_board_id:ins.data.id}).eq('id',headerId); }catch(e){ console.warn('Briefing Board: could not link board back onto its layer', e); }
      return ins.data;
    }catch(e){ console.error('Briefing Board: could not resolve/create board for this layer', e); return null; }
  }

  // Project field on the card back, Sept 7 2026 -- Larry: "BB has
  // eyebrow project ID. Make this a dropdown field on the back of the
  // card so we can change projects for a given BB card." Works out
  // which option (_bbProjectPickerOptions' 'hdr:'/'brd:' tags) a given
  // card is sitting under right now, same climb-to-root idea
  // _bbRenderBoardPicker already uses for the whole open board -- just
  // starting from the card's own link instead of the board's. A
  // header-linked card (c.sourceHeaderId, auto-created/kept in sync by
  // the ideas_sync_header_task_card DB trigger) climbs from its own
  // topic; every other card climbs from whichever board it actually
  // lives on (its home board for a merged/foreign card, the open board
  // for a native one). Falls back to {} (no selection) if the answer
  // isn't cached yet -- same "pending" shape _bbClimbToProjectRoot
  // itself returns -- so the caller can re-render once it's warm.
  function _bbCardProjectValue(c, homeBoardId){
    // One-board model, Sept 8 2026 -- the board-climb logic below answers
    // "which project does this card's BOARD belong to," which meant
    // something when every project had its own board; on the one shared
    // MASTER board it can't tell projects apart at all any more. A
    // single-board traveler's real answer already lives on the card
    // itself (project_header_id, written once at creation or by hand
    // through this same field -- see _bbSetCardProjectHeader below), so
    // read that directly instead of climbing a board link that no
    // longer means anything.
    if(_bbSingleBoardMode()){
      if(!c.projectHeaderId) return {value:null, pendingHeaderId:null, fallbackName:null};
      return {value:'hdr:'+c.projectHeaderId, pendingHeaderId:null, fallbackName:_bbProjectNameById[c.projectHeaderId]||null};
    }
    if(c.sourceHeaderId){
      var climb=_bbClimbToProjectRoot(c.sourceHeaderId);
      if(climb.rootHeaderId) return {value:'hdr:'+climb.rootHeaderId, pendingHeaderId:null, fallbackName:climb.rootName};
      if(climb.pendingHeaderId) return {value:null, pendingHeaderId:climb.pendingHeaderId, fallbackName:null};
    }
    var board=_bbBoards.filter(function(b){ return b.id===homeBoardId; })[0];
    if(!board) return {value:null, pendingHeaderId:null, fallbackName:null};
    if(board.storyboard_project_id){
      var climb2=_bbClimbToProjectRoot(board.storyboard_project_id);
      if(climb2.rootHeaderId) return {value:'hdr:'+climb2.rootHeaderId, pendingHeaderId:null, fallbackName:climb2.rootName};
      if(climb2.pendingHeaderId) return {value:null, pendingHeaderId:climb2.pendingHeaderId, fallbackName:null};
    }
    return {value:'brd:'+board.id, pendingHeaderId:null, fallbackName:null};
  }

  // Moves a card to a different project, Sept 7 2026 -- the actual
  // reassignment behind the Project dropdown (_bbRenderCardProjectField
  // below). Writes this one card's row onto the given board directly --
  // effectively the same move a drag onto that board's own screen would
  // produce, just done from the card back instead. Deliberately allowed
  // on a header-linked card too (Larry: every card, not just hand-typed
  // ones) -- clearing source_header_id/topic_label here is what tells
  // the ideas_sync_header_task_card trigger this card isn't its topic's
  // stand-in any more (that trigger only ever looks a card up BY
  // source_header_id, see its own definition), so the old topic simply
  // gets a fresh auto-card next time it's touched, while this one lives
  // on independently under its new project. Local copy is dropped from
  // every card-source array it might be sitting in so the board redraws
  // without a stale ghost of it -- then, if the screen already happens
  // to be looking at the card's new home (e.g. a project just created
  // on the spot, which _bbCreateBoard's own insert already switched the
  // screen to), added straight back in so it shows up without waiting
  // on a reload. Takes the actual card object rather than an id so a
  // caller that's about to switch boards (losing whatever _bbCards
  // pointed to before) can still hand over the right one.
  async function _bbMoveCardObjectToBoard(c, targetBoard){
    if(!c || !targetBoard) return false;
    var sb=T().sb;
    if(!sb){ window.alert('Not connected -- try again in a moment.'); return false; }
    try{
      var row=_bbCardToRow(c, targetBoard.id);
      delete row.id;
      row.source_header_id=null;
      row.topic_label=null;
      var res=await sb.from('briefing_cards').update(row).eq('id', c.id);
      if(res.error){ console.error('Briefing Board: move card failed', res.error); window.alert('Could not move this card. Try again.'); return false; }
    }catch(e){ console.error('Briefing Board: move card failed', e); window.alert('Could not move this card. Try again.'); return false; }
    c.sourceHeaderId=null; c.topicLabel='';
    _bbCards=_bbCardsList().filter(function(x){ return x.id!==c.id; });
    if(_bbForeignCards) _bbForeignCards=_bbForeignCards.filter(function(x){ return x.id!==c.id; });
    if(_bbSharedInCards) _bbSharedInCards=_bbSharedInCards.filter(function(x){ return x.id!==c.id; });
    if(_bbRollupCards) _bbRollupCards=_bbRollupCards.filter(function(x){ return x.id!==c.id; });
    if(_bbCurrentBoardId===targetBoard.id) _bbCards.push(c);
    return true;
  }

  // Resolves a picker value ('hdr:'/'brd:', see _bbProjectPickerOptions)
  // to a real board, then hands off to _bbMoveCardObjectToBoard -- the
  // ordinary path when Larry picks an existing project from the
  // dropdown (see _bbRenderCardProjectField's onSelect below).
  // One-board model, Sept 8 2026 -- the actual reassignment behind the
  // card-back Project field for a single-board traveler. Unlike
  // _bbMoveCardToProject below (which moves a card onto a different
  // BOARD -- meaningless once there's only one true board), this is the
  // one narrow project_header_id write T2TData.stampCardProject already
  // exposes for a card's one-time creation stamp, reused here for an
  // explicit hand reassignment through this field. Never rides on the
  // whole-card save (_bbCardToRow already excludes this column), and
  // never touches source_header_id/topic_label -- picking a project by
  // hand here is independent of whatever topic a header-linked card is
  // still standing in for.
  async function _bbSetCardProjectHeader(cardId, headerId){
    var c=_bbFindCardAnywhere(cardId);
    if(!c || !headerId) return;
    await T2TData.stampCardProject('briefing_cards', cardId, headerId);
    c.projectHeaderId=headerId;
    closeCardDetail();
    renderBoard();
  }

  async function _bbMoveCardToProject(cardId, value){
    var v=String(value), targetBoard=null;
    if(v.indexOf('hdr:')===0) targetBoard=await _bbResolveOrCreateBoardForHeader(v.slice(4));
    else if(v.indexOf('brd:')===0) targetBoard=_bbBoards.filter(function(b){ return b.id===v.slice(4); })[0];
    if(!targetBoard){ window.alert('Could not find that project. Try again in a moment.'); return; }
    var c=_bbFindCardAnywhere(cardId);
    if(!c) return;
    var ok=await _bbMoveCardObjectToBoard(c, targetBoard);
    if(!ok) return;
    closeCardDetail();
    renderBoard();
  }

  // Renders/wires the card back's own Project dropdown -- called from
  // openCardDetail for whichever card just opened. Reuses the same
  // _bbRenderDropdown widget the whole-board PROJECT switcher uses, so
  // it looks and behaves identically (same menu, same "+" to start a
  // new board and move straight into it). currentValue can come back
  // null while an ancestor Header is still warming up in
  // _bbHeaderInfoById -- shown as a plain "Loading…" trigger for that
  // one render, then re-rendered for real once _bbFetchHeaderInfo
  // resolves it, same pattern _bbRenderBoardPicker already uses. The
  // "+" handler captures the card object before calling _bbCreateBoard
  // (which switches the whole screen to the board it creates) so the
  // move that follows always has the right card in hand regardless of
  // what that switch just did to _bbCards.
  async function _bbRenderCardProjectField(c){
    var trigger=document.getElementById('bb-d-project-trigger'), menu=document.getElementById('bb-d-project-menu');
    if(!trigger || !menu) return;
    var homeBoardId = c._homeBoardId || _bbCurrentBoardId;
    var pv=_bbCardProjectValue(c, homeBoardId);
    if(pv.pendingHeaderId){
      trigger.textContent='Loading…';
      _bbFetchHeaderInfo(pv.pendingHeaderId).then(function(info){ if(info && _bbOpenCardId===c.id) _bbRenderCardProjectField(c); });
      return;
    }
    var opts=await _bbProjectPickerOptions();
    if(_bbOpenCardId!==c.id) return; // a different card opened while this was loading
    if(pv.value && !opts.some(function(o){ return o.value===pv.value; }) && pv.fallbackName){
      opts=opts.concat([{value:pv.value, label:pv.fallbackName}]);
    }
    // One-board model, Sept 8 2026 -- single-board travelers get the
    // dedicated _bbSetCardProjectHeader path (one narrow write, no
    // board involved); everyone else keeps the original Sept 7 move-
    // to-a-different-board behavior untouched.
    if(_bbSingleBoardMode()){
      _bbRenderDropdown('bb-d-project-trigger','bb-d-project-menu', opts, pv.value, function(value){
        var v=String(value);
        if(v.indexOf('hdr:')===0) _bbSetCardProjectHeader(c.id, v.slice(4));
      }, async function(){
        var name=window.prompt('Name for the new project:');
        if(!name || !name.trim()) return;
        var rootId=_bbIdeaStoryboardsRootId;
        if(!rootId){ try{ rootId=await T2TData.ensureIdeaStoryboardsRoot(); }catch(e){} }
        if(!rootId){ window.alert('Could not add a project right now. Try again in a moment.'); return; }
        var hdr;
        try{ hdr=await T2TData.createHeader(name.trim(), rootId); }
        catch(e){ console.error('Briefing Board: could not add project header', e); window.alert('Could not add the project "'+name.trim()+'". Try again.'); return; }
        _bbProjectNameById[hdr.id]=hdr.text_content||name.trim();
        await _bbSetCardProjectHeader(c.id, hdr.id);
      }, 'Add a project');
      return;
    }
    _bbRenderDropdown('bb-d-project-trigger','bb-d-project-menu', opts, pv.value, function(value){
      _bbMoveCardToProject(c.id, value);
    }, async function(){
      var name=window.prompt('Name for the new project:');
      if(!name || !name.trim()) return;
      var ok=await _bbCreateBoard(name.trim(), 'project');
      if(!ok) return;
      var targetBoard=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      if(targetBoard) await _bbMoveCardObjectToBoard(c, targetBoard);
      closeCardDetail();
      renderBoard();
    }, 'Add a project');
  }

  async function _bbInitBoardsAndData(){
    var uid=await _bbCurrentUserId();
    // _bbRenderLogo() added to every early-exit branch below, Sept 8
    // 2026: the logo slot now starts hidden (see .bb-logo-slot's own
    // comment) and only ever becomes visible from inside that call, so
    // any path that skips it entirely would leave the slot invisible
    // for the rest of the session instead of just showing no logo/(+).
    if(!uid){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); _bbRenderLogo(); return; }
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
      // Sept 8 2026 -- retired boards (superseded once their cards were
      // merged onto one real MASTER board, see the retired column's own
      // migration comment) are excluded here, never fetched at all --
      // this is what makes _bbSingleBoardMode()'s length check correct
      // for a traveler who's been through that merge.
      var res=await sb.from('briefing_boards').select('*').eq('retired', false).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _bbBoards=res.data||[];
      // Sept 6 2026 -- fetched once here, before _bbRefreshRootHeaderIdSet
      // (right below) needs it: the same T2TData.ensureIdeaStoryboardsRoot
      // the Idea Board itself calls, so _bbIsProjectRoot (see its own
      // comment, above) can tell a real top-level project apart from a
      // nested layer correctly. Safe to call every session -- self-
      // healing/idempotent per that function's own doc comment.
      try{ _bbIdeaStoryboardsRootId = await T2TData.ensureIdeaStoryboardsRoot(); }
      catch(e){ console.warn('Briefing Board: could not resolve the Idea Storyboards root', e); }
      // Sept 8 2026 -- see _bbProjectNameById's own comment above: this
      // is what lets a card's eyebrow name its actual project (Field
      // Guide, Wish Tank, ...) instead of falling back to the one
      // shared MASTER board's name for every card that has no
      // topicLabel of its own.
      try{
        var _hdrs=await T2TData.fetchAllHeaders();
        var _nameMap={}; (_hdrs||[]).forEach(function(h){ _nameMap[h.id]=h.text_content||''; });
        _bbProjectNameById=_nameMap;
      }catch(e){ console.warn('Briefing Board: could not load project names for card eyebrows', e); }
      // Aug 16 2026 -- adopted parent-child edges, so the PROJECT
      // picker can show a board's children alongside its type-mates.
      // RLS already scopes this to relations touching a board this
      // traveler owns, same as briefing_boards above -- no extra filter
      // needed here.
      try{
        var relRes=await sb.from('board_relations').select('*').eq('status','approved');
        _bbRelationsCache=relRes.error?[]:(relRes.data||[]);
      }catch(e){ _bbRelationsCache=[]; console.error('Briefing Board: could not load board relations', e); }
      // Root-header lookup, Sept 5 2026 -- now that TOPIC
      // (_bbResolveOrCreateBoardForHeader) can link a board to ANY
      // Header, not just a project root, PROJECT's own list
      // (_bbRenderBoardPicker) needs a way to tell the two apart --
      // "DREAM PHASE" (a descended-into layer) must never show up as if
      // it were its own top-level project. Populated once here; kept
      // current afterward by _bbResolveOrCreateBoardForHeader itself
      // whenever it links a board to a new Header.
      await _bbRefreshRootHeaderIdSet();
    }catch(e){
      console.error('Briefing Board: could not load boards, staying local', e);
      _bbCurrentBoardId=null; _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); _bbRenderLogo();
      return;
    }
    if(!_bbBoards.length){
      try{
        var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:'personal', name:'My Board'}).select().single();
        if(!ins.error && ins.data) _bbBoards=[ins.data];
      }catch(e){}
    }
    if(!_bbBoards.length){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); _bbRenderLogo(); return; }
    // Sept 8 2026 -- T2TData's own single-board-mode check has no board
    // table to query itself, so this file (the one that actually loaded
    // _bbBoards, retired rows already excluded above) reports the count
    // once here, right after it's settled. Every other board kind that
    // adopts the same project-filter API reports its own count the same
    // way.
    T2TData.setBoardCount(_bbBoards.length);
    // TOPIC deep-link, Sept 5 2026 -- Larry: "if an Idea Board changes a
    // PROJECT or a level, jumping to the BB should instantly go to the
    // same project and level" -- then, same day: "what if TOPIC is
    // exactly the same [as the Idea Board's]? If DREAM PHASE is the
    // TOPIC on the Idea Board, then DREAM PHASE is the BB." Set by the
    // Idea/Plan board's own IDEA/PLAN/BRIEFING BOARD/SHARE/CAST dropdown
    // (idea-storyboard-9710.js, _sboardWireBoardKindDropdown) via
    // window.T2TBriefingBoard.jumpToTopic below, right before nav()'ing
    // here the first time this session -- same "set a flag, then nav"
    // shape as the two card-level deep-links just below. Checked first
    // since a TOPIC-level jump is the more fundamental of the two;
    // _bbResolveOrCreateBoardForHeader creates the linked board on the
    // spot if this exact layer never had one.
    try{
      var _bbDeepLinkTopicId=sessionStorage.getItem('fg_open_board_for_topic_id');
      if(_bbDeepLinkTopicId){
        sessionStorage.removeItem('fg_open_board_for_topic_id');
        var _bbDeepLinkBoard=await _bbResolveOrCreateBoardForHeader(_bbDeepLinkTopicId);
        if(_bbDeepLinkBoard){ await _bbSwitchToBoard(_bbDeepLinkBoard.id); return; }
      }
    }catch(e){ console.warn('Briefing Board project deep-link failed:', e); }
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
    // One-board model, Sept 8 2026 -- active_briefing_board_id always
    // resolves to the same one board here, so it can't tell "where was I"
    // any more; active_project_header_id (this account's equivalent,
    // read only after a fresh, non-deep-linked load) picks up that job.
    if(_bbSingleBoardMode()){
      try{
        var pf=await sb.from('profiles').select('active_project_header_id').eq('user_id',uid).single();
        if(!pf.error && pf.data && pf.data.active_project_header_id) await _bbSetProjectFilter(pf.data.active_project_header_id);
        else await _bbSetProjectFilter(null);
        await _bbRenderTopicField();
        renderBoard();
      }catch(e){ console.warn('Briefing Board: could not restore the active project filter', e); }
    }
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

  // Climbs a nested layer's own Header up its cluster_id chain to the
  // real project root, same "keep climbing until self-scoped" idea as
  // the Idea Board's _sboardProjectRowFor -- just walking
  // _bbHeaderInfoById (this board's own cache of that same ideas data)
  // instead of _sboardAllRowsById. Returns {rootHeaderId, rootName} once
  // found, or {pendingHeaderId} if some ancestor along the way hasn't
  // been fetched into the cache yet (caller kicks off that one fetch and
  // re-renders once it lands, rather than blocking here). Sept 5 2026 fix.
  //
  // Sept 6 2026 fix -- the `|| !info.clusterId` half of the stop test
  // used to be the one that actually fired for most real projects (see
  // the Sept 6 note on _bbRootHeaderIdSet's fill sites, above), which
  // meant this quietly overshot every project's own root and climbed
  // one step further to the shared Idea Storyboards row -- exactly the
  // "up arrow never needs to go above the actual project" mistake Larry
  // called out today, just here instead of on TOPIC's own arrow.
  // _bbRootHeaderIdSet[curId]===true is the correct, sufficient stop
  // condition now that its fill sites test the real thing (parent IS the
  // Idea Storyboards root); the old clusterId-null fallback stays only
  // as a last resort for the rare case that root id never resolved.
  function _bbClimbToProjectRoot(headerId){
    var curId=headerId, guard=0;
    while(curId && guard<25){
      guard++;
      var info=_bbHeaderInfoById[curId];
      if(!info) return {pendingHeaderId:curId};
      if(_bbRootHeaderIdSet[curId]===true || (!_bbIdeaStoryboardsRootId && !info.clusterId)) return {rootHeaderId:curId, rootName:info.name};
      curId=info.clusterId;
    }
    return {};
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
          // Sept 5 2026 -- close the link the other direction too
          // (storyboard_project_id on the board itself), the same field
          // _bbResolveOrCreateBoardForHeader and the Idea Board's own
          // jumpToProjectKind/jumpToTopic both read. Without this, a
          // board created here could show up in PROJECT but couldn't
          // jump back to its Idea board (the "This board isn't linked to
          // a project" toast in _bbWireBoardKindDropdown).
          try{
            await sb.from('briefing_boards').update({storyboard_project_id:rootIns.data.id}).eq('id',ins.data.id);
            ins.data.storyboard_project_id=rootIns.data.id;
          }catch(e2){ console.warn('Briefing Board: could not link new board back to its project', e2); }
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
  // Master Briefing Board depth, Sept 5 2026 -- Larry: "traveler choice
  // for number of levels to include in MASTER view." Same shape as the
  // two functions just above (localStorage, "set it and forget it").
  // Default of 3 matches BB_MASTER_ROLLUP_DEPTH's original placeholder
  // value, now retired in favor of this.
  function _bbMasterRollupDepth(){
    try{ var v=parseInt(localStorage.getItem('bbMasterRollupDepth'),10); return isNaN(v)?3:Math.max(0,v); }
    catch(e){ return 3; }
  }
  function _bbSetMasterRollupDepth(n){
    try{ localStorage.setItem('bbMasterRollupDepth', String(Math.max(0, parseInt(n,10)||0))); }catch(e){}
  }

  // One true Briefing Board, Sept 8 2026 -- Larry: "EVERYTHING is a
  // child of MASTER, including Field Guide and Wish Tank. There is only
  // ONE BB and that is the MASTER. All other BBs are filters of the
  // MASTER!" Every one of Larry's tasks was migrated onto his one real
  // board that day (briefing_cards.project_header_id records which
  // project each one belongs to; see that column's own migration
  // comment). This is the single switch the rest of the file reads to
  // tell that world apart from a traveler who still has several real
  // boards (anyone not yet migrated the same way): _bbBoards.length===1
  // means "board switching" no longer means anything -- Field Guide,
  // Wish Tank, and every other project are just this one board's cards
  // filtered down to a Header, never a different board_id. Every call
  // site that used to branch on board identity now branches on this
  // instead, so a traveler who gets migrated later needs no further
  // code changes to land in the same behavior.
  //
  // Sept 8 2026, Larry: "PROJECT FILTER crosses all boards and may have
  // new features of its own in the future" -- so the actual state and
  // logic now live in header-data.js (T2TData), shared by every board
  // kind, not trapped inside this one file. These are thin wrappers so
  // every call site already written against the old names below keeps
  // working unchanged; _bbBoards.length is reported to T2TData right
  // after boards load, in _bbInitBoardsAndData.
  function _bbSingleBoardMode(){ return T2TData.isSingleBoardMode(); }
  function _bbProjectFilter(){ return T2TData.getProjectFilter(); }
  async function _bbSetProjectFilter(headerId){
    var normalized = await T2TData.setProjectFilter(headerId, _bbIdeaStoryboardsRootId);
    // TOPIC's own eyebrow/rollup-adjacent state still wants the real
    // header (root included), same meaning it always had -- this stays
    // here since it's Briefing-Board-specific screen state, not
    // something every board kind shares.
    _bbCurrentTopicHeaderId = headerId || _bbIdeaStoryboardsRootId || null;
    _bbCurrentTopicIsRoot = !normalized;
  }
  function _bbProjectFilterCards(cards){ return T2TData.filterCardsByProject(cards); }
  // Sept 8 2026 -- the one-time, narrow write that actually tags a new
  // card with its project (see projectHeaderId's own comment on
  // _bbRowToCard for why this never rides on the general whole-board
  // save). Called once, right when a card is created, never again.
  async function _bbStampCardProject(cardId, headerId){ return T2TData.stampCardProject('briefing_cards', cardId, headerId); }
  // Rollup cache, Sept 5 2026 -- same "load into a module-level array,
  // let renderBoard() read it synchronously" shape as _bbForeignCards/
  // _bbSharedInCards below. Loaded in _bbSwitchToBoard right after
  // _bbRenderTopicField (so _bbCurrentTopicIsRoot is already current)
  // and right before that function's own renderBoard() call -- never
  // triggers a render on its own.
  var _bbRollupCards = [];
  async function _bbLoadMasterRollupCards(){
    try{ _bbRollupCards = await _bbMasterRollupCardsIfAny(); }
    catch(e){ _bbRollupCards = []; }
  }

  // Master rollup, Sept 5 2026 -- Larry: "the top level of the BB =
  // MASTER BRIEFING BOARD which includes everything at all levels. Ah,
  // but might we want to limit the Master view to a number of levels?"
  // then: "traveler choice for number of levels to include in MASTER
  // view." Landed as a real Preferences field (_bbMasterRollupDepth,
  // above) rather than a fixed cap -- an uncapped rollup on a project
  // with many nested layers could still pull in an unbounded number of
  // boards' worth of cards on every render, so 0 is the floor, but how
  // deep "everything" reaches is the traveler's own call, not a hardcoded
  // number. Walks the ideas tree breadth-first from the root TOPIC, one
  // level of cluster_id at a time, collecting every descendant Header id
  // up to that depth; only Headers that already have their own linked
  // Briefing Board (storyboard_project_id, cached in _bbBoards) actually
  // contribute cards -- this never creates boards on a traveler's
  // behalf, only reads ones that already exist. Cards pulled in this way
  // are marked _foreign/_homeBoardName (renderBoard's existing dashed-
  // border badge), same as any other card that visibly lives elsewhere.
  // Sept 8 2026 -- superseded by the real fix: once a traveler has
  // exactly one true Briefing Board (_bbSingleBoardMode, below), every
  // task already lives on it, so there is nothing left to roll up --
  // renderBoard's own project filter (_bbProjectFilterCards) does this
  // job now, correctly and without a network round trip. This depth-
  // limited walk stays as-is for any traveler not yet on the one-board
  // model; _bbLoadMasterRollupCards (its only caller) skips calling it
  // at all in single-board mode.
  async function _bbMasterRollupCardsIfAny(){
    if(_bbSingleBoardMode()) return [];
    if(!_bbCurrentTopicIsRoot || !_bbCurrentTopicHeaderId) return [];
    var sb=T().sb;
    var maxDepth=_bbMasterRollupDepth();
    var frontier=[_bbCurrentTopicHeaderId], seen={}, descendantIds=[];
    seen[_bbCurrentTopicHeaderId]=true;
    for(var depth=0; depth<maxDepth && frontier.length; depth++){
      var next=[];
      try{
        var res=await sb.from('ideas').select('id,cluster_id,text_content').in('cluster_id',frontier).eq('content_type','header');
        if(!res.error){
          (res.data||[]).forEach(function(row){
            if(seen[row.id] || BB_RESERVED_HEADER_NAMES[row.text_content]) return;
            seen[row.id]=true; next.push(row.id); descendantIds.push(row.id);
          });
        }
      }catch(e){ break; }
      frontier=next;
    }
    if(!descendantIds.length) return [];
    var rollupBoards=_bbBoards.filter(function(b){ return b.storyboard_project_id && descendantIds.indexOf(b.storyboard_project_id)!==-1; });
    if(!rollupBoards.length) return [];
    var out=[];
    for(var i=0;i<rollupBoards.length;i++){
      var rb=rollupBoards[i];
      try{
        var cRes=await sb.from('briefing_cards').select('*').eq('board_id',rb.id).eq('archived',false).is('trashed_at',null);
        if(!cRes.error && cRes.data){
          out=out.concat(cRes.data.map(function(row){
            var c=_bbRowToCard(row);
            // Reuses the same dashed-border "foreign card" badge/eyebrow
            // handling _bbLoadForeignCardsForPersonalBoard and
            // _bbLoadSharedInCardsForProjectBoard already built (a card
            // that visibly lives elsewhere but is allowed to show here) --
            // Master's rollup is the same situation, just gathered by
            // walking descendant layers instead of an explicit share.
            // Moving a rolled-up card between columns still writes
            // through to its own board (board_id never changes here),
            // same as any other foreign card.
            c._foreign=true;
            c._homeBoardId=rb.id;
            c._homeBoardName=rb.name||'(untitled)';
            return c;
          }));
        }
      }catch(e){}
    }
    return out;
  }
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

  // Cross-file jump, Sept 5 2026 -- the mirror image of
  // idea-storyboard-9710.js's own window.T2TStoryboard.jumpToProjectKind
  // (Aug 30 2026), which already lets Briefing Board's board-kind
  // dropdown land on a specific project's Idea or Plan board. That
  // direction existed; IDEA -> BRIEFING BOARD never carried the current
  // position along, it just nav()'d here and left whatever board was
  // already open in place. This closes the loop: idea-storyboard-9710.js
  // calls this with the traveler's exact current TOPIC (any depth -- see
  // T2TShared.currentTopicId) right before choosing BRIEFING BOARD from
  // that same dropdown, and TOPIC's own descend dropdown here
  // (_bbRenderTopicField) calls it again every time a child layer is
  // chosen -- same function either way, since "jump to a project" and
  // "descend into a layer" are the same move once TOPIC and PROJECT both
  // just mean "some Header in the tree."
  window.T2TBriefingBoard = {
    jumpToTopic: async function(headerId){
      if(!headerId) return false;
      if (window.T2T && window.T2T.showTravelSpinner) window.T2T.showTravelSpinner();
      // Briefing Board hasn't booted yet this session (first visit) --
      // _bbInitBoardsAndData hasn't run, so _bbBoards/
      // _bbResolveOrCreateBoardForHeader aren't safe to touch yet. Same
      // "set a flag, then nav" shape as the Idea Storyboard's own
      // card-level deep-links; the flag is read at the top of
      // _bbInitBoardsAndData, above.
      if(!_bbInitStarted){
        try{ sessionStorage.setItem('fg_open_board_for_topic_id', headerId); }catch(e){}
        if(window.T2T && window.T2T.nav) window.T2T.nav('s-briefing-board');
        return true;
      }
      try{
        var board=await _bbResolveOrCreateBoardForHeader(headerId);
        if(!board) return false;
        if(window.T2T && window.T2T.nav) window.T2T.nav('s-briefing-board');
        await _bbSwitchToBoard(board.id);
        return true;
      }catch(e){ return false; }
    }
  };
