/* ============================================================
   briefing-board-archive.js -- T2T Field Guide - BRIEFING BOARD (9350)
   ARCHIVE & HISTORY

   Split out of briefing-board.js Sept 5, 2026, same file-growth scoping
   pass as briefing-board-styles.js / briefing-board-screens.js. Holds
   every "look back at what happened" panel: the Archive (completed/
   verified cards), History (HX, the landing page over Archive + the
   Briefing Log), the Briefing Log itself (who's been briefed, when),
   Recent Moves (the undo-a-move panel), and Recently Deleted (the Trash
   browser -- restore or delete forever).

   Checked against the Idea Storyboard file during scoping: nothing like
   this exists over there (no Archive, no History, no Briefing Log, no
   Recent-Moves panel) -- this is genuinely Briefing-Board-only, not a
   cross-board piece like Signal Flags/Cast/Board Identity turned out to
   be, so it stays paired with briefing-board.js rather than becoming a
   file the Idea Storyboard would ever load too.

   Talks back to the rest of the board through window.BBCore (a small,
   explicit set of accessors briefing-board.js exposes right after
   wireBriefingBoard's own definition: cardsList, saveLocal, renderBoard,
   boards, pushAction, applyCardSnapshot, resortDoColumn, currentBoardId)
   rather than reaching into briefing-board.js's private variables
   directly. A handful of tiny, genuinely stateless helpers (T, _esc,
   _bbSnapshotCard, _bbIsDoCol, _bbStampDateEscalationHandled, plus the
   _bbMoveDesc label helper and its BB_MOVE_COL_LABEL lookup) are just
   duplicated here rather than bridged, since they don't read or write
   any shared state -- only briefing-board.js's own copies are the ones
   actually wired to the live board.

   Exposes window.BBArchive = { openArchive, closeArchive, openHX,
   closeHX, openBriefingLog, closeBriefingLog, openRecentMoves,
   closeRecentMoves, wireRecentMoves, openRecentlyDeleted,
   closeRecentlyDeleted, wireRecentlyDeleted, logCardMove, purgeOld }.
   Load this file AFTER briefing-board-screens.js and BEFORE
   briefing-board.js -- briefing-board.js's own wiring (inside
   wireBriefingBoard) and two of its drag/priority handlers call into
   window.BBArchive at their own call time (after DOMContentLoaded), and
   window.BBCore only needs to exist by then too, so load order between
   this file and briefing-board.js doesn't matter beyond "both loaded
   before DOMContentLoaded fires."
   ============================================================ */

(function(){

  // ---- Small, stateless duplicates of briefing-board.js's own copies --
  // see the file header above for why these are copied rather than
  // bridged. Keep these in sync BY HAND if their logic ever changes in
  // briefing-board.js (there's no shared source for them, deliberately --
  // bridging something this tiny would add more moving parts than it'd
  // save).
  function T(){ return window.T2T; }
  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
  }
  function _bbSnapshotCard(c){
    return {col:c.col, priority:c.priority, sortOrder:c.sortOrder};
  }
  function _bbIsDoCol(colKey){ return colKey==='new' || colKey==='do-h' || colKey==='do-m' || colKey==='do-l'; }
  function _bbStampDateEscalationHandled(c){
    if(c.startDate) c.startEscalatedFor=c.startDate;
    if(c.due) c.dueEscalatedFor=c.due;
  }
  var BB_MOVE_COL_LABEL = {'new':'NEW','do-h':'DO (H)','do-m':'DO (M)','do-l':'DO (L)','doing':'Doing','done':'Done','hangups':'Hang-Ups'};
  function _bbMoveDesc(col, priority){
    var label = BB_MOVE_COL_LABEL[col] || col || '?';
    return priority ? (label+' \u2014 '+priority) : label;
  }

  // Fire-and-forget: logs a move to Supabase if col/priority/sortOrder
  // actually changed. Never blocks the UI and never throws -- a failed
  // log write shouldn't stop the move itself from saving.
  async function _bbLogCardMove(c, before){
    if(!window.BBCore.currentBoardId()) return;
    if(before.col===c.col && before.priority===c.priority && before.sortOrder===c.sortOrder) return;
    (function(){
      var cardId=c.id, beforeSnap=before, afterSnap=_bbSnapshotCard(c);
      window.BBCore.pushAction({
        label:'Move',
        undo: function(){ window.BBCore.applyCardSnapshot(cardId, beforeSnap); },
        redo: function(){ window.BBCore.applyCardSnapshot(cardId, afterSnap); }
      });
    })();
    var sb=T().sb; if(!sb) return;
    try{
      await sb.from('briefing_card_moves').insert({
        board_id: window.BBCore.currentBoardId(),
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
    if(!sb || !window.BBCore.currentBoardId()){ wrap.innerHTML='<div style="font-size:calc(12px * var(--fg-text-scale,1));color:#a3907a;text-align:center;padding:16px 0">Nothing in here right now.</div>'; return; }
    try{
      var res=await sb.from('briefing_card_moves').select('*').eq('board_id', window.BBCore.currentBoardId()).is('undone_at', null).order('moved_at',{ascending:false}).limit(20);
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
    var c=window.BBCore.cardsList().filter(function(x){ return x.id===m.card_id; })[0];
    if(!c){ window.alert('That card is no longer on this board (it may have been trashed).'); return; }
    var before=_bbSnapshotCard(c);
    c.col=m.from_col; c.priority=m.from_priority; c.sortOrder=(typeof m.from_sort_order==='number')?m.from_sort_order:c.sortOrder;
    if(_bbIsDoCol(c.col)) window.BBCore.resortDoColumn(c.col);
    _bbStampDateEscalationHandled(c);
    window.BBCore.saveLocal(window.BBCore.cardsList());
    var sb=T().sb;
    if(sb){
      try{ await sb.from('briefing_card_moves').update({undone_at:new Date().toISOString()}).eq('id', moveId); }catch(e){ console.error('Briefing Board: mark move undone failed', e); }
    }
    // Log the undo itself as a fresh move, so it too can be reverted.
    _bbLogCardMove(c, before);
    await _bbRenderRecentMoves();
    window.BBCore.renderBoard();
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
    var items=window.BBCore.cardsList().filter(function(c){ return c.archived; });
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
        var c=window.BBCore.cardsList().filter(function(x){ return x.id===id; })[0];
        if(c){ c.archived=false; window.BBCore.saveLocal(window.BBCore.cardsList()); }
        _bbRenderArchiveList();
        window.BBCore.renderBoard();
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
        var board=window.BBCore.boards().filter(function(b){ return b.id===r.board_id; })[0];
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
    var trashed=window.BBCore.cardsList().filter(function(c){ return c.trashedAt; })
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
    var c=window.BBCore.cardsList().filter(function(x){ return x.id===id; })[0];
    if(!c) return;
    c.trashedAt=null;
    window.BBCore.saveLocal(window.BBCore.cardsList());
    _bbRenderRecentlyDeleted();
    window.BBCore.renderBoard();
  }
  function _bbPurgeTrashedCardForever(id){
    var _bbRemaining=window.BBCore.cardsList().filter(function(x){ return x.id!==id; });
    window.BBCore.saveLocal(_bbRemaining, [id]);
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

  window.BBArchive = {
    openArchive: openArchive,
    closeArchive: closeArchive,
    openHX: openHX,
    closeHX: closeHX,
    openBriefingLog: openBriefingLog,
    closeBriefingLog: closeBriefingLog,
    openRecentMoves: openRecentMoves,
    closeRecentMoves: closeRecentMoves,
    wireRecentMoves: wireRecentMoves,
    openRecentlyDeleted: openRecentlyDeleted,
    closeRecentlyDeleted: closeRecentlyDeleted,
    wireRecentlyDeleted: wireRecentlyDeleted,
    logCardMove: _bbLogCardMove,
    purgeOld: function(boardId){ _bbPurgeOldTrash(boardId); _bbPurgeOldMoves(boardId); }
  };

})();
