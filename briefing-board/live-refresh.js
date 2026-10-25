/* ============================================================
   briefing-board-live-refresh.js -- T2T Field Guide - BRIEFING BOARD

   LIVE REFRESH SAFETY NET (Oct 14 2026). Larry: "When a PLAN task
   moves to done, a new task moves to the BB. Can the BB automatically
   refresh so we can see the new addition?"

   The database creates that next card itself (plan_advance_on_done),
   so this tab never saves it and only learns of it through the live
   channel in backpack.js. A sleeping tab or a dropped channel misses
   that event. This file adds a second, independent way to notice:

     1. Right after a plan-step card is moved to DONE here, re-read the
        board once (and once more a few seconds later).
     2. Whenever the tab becomes visible or regains focus, re-read it.

   The re-read only ADDS cards the board doesn't have yet. It never
   overwrites or removes anything, so it can't clobber an edit that is
   still being saved. It never runs while a card is being dragged, and
   it only runs while the Briefing Board is actually on screen.

   Plain script, shared global scope, same as the other briefing-board-*
   files. Loads after briefing-board-ops.js.
   ============================================================ */
(function(){
  var _inFlight = false, _timer = null, _pendingAfterDrag = false;

  var _lastUserAction = 0;
  ['pointerdown', 'keydown', 'dragstart', 'dragend', 'change'].forEach(function(evt){
    document.addEventListener(evt, function(){ _lastUserAction = Date.now(); }, true);
  });

  // The fields that decide where a card sits and what its face shows.
  function _cardSignature(c){
    return [c.col, c.priority, c.person, c.completedDate, c.subject, c.archived ? 1 : 0, c.trashedAt || '', c.verified ? 1 : 0].join('|');
  }

  function _boardOnScreen(){
    var w = document.getElementById('bb-board-wrap');
    return !!(w && w.offsetParent !== null && !document.hidden);
  }

  // Oct 16 2026 -- a check that stalls on a bad connection must not block
  // every later check: after 15 seconds an unfinished check is written off.
  var _inFlightSince = 0;
  async function _refreshFromServer(){
    if (_inFlight && (Date.now() - _inFlightSince) < 15000) return;
    _inFlightSince = Date.now();
    if (typeof _bbCurrentBoardId === 'undefined' || !_bbCurrentBoardId) return;
    if (typeof T !== 'function' || !T().sb) return;
    if (!_boardOnScreen()) return;
    if (T().isDragActive && T().isDragActive()) { _pendingAfterDrag = true; return; }
    _inFlight = true;
    try {
      var boardId = _bbCurrentBoardId;
      var res = await T().sb.from('briefing_cards').select('*').eq('board_id', boardId).order('created_at', { ascending: true });
      if (res.error || !res.data || boardId !== _bbCurrentBoardId) return; // failed, or the board changed meanwhile
      var list = _bbCardsList();
      var have = {};
      list.forEach(function(c){ have[c.id] = true; });
      var added = 0, changed = 0;
      var recentlyTouched = (Date.now() - _lastUserAction) < 8000;
      res.data.forEach(function(row){
        if (!have[row.id]) {
          list.push(_bbRowToCard(row));
          added++;
          return;
        }
        // Oct 16 2026 -- Larry: a card moved to DONE from outside this tab
        // did not move until he reloaded. Cards already on the board now
        // follow the server too, but only for the fields that decide where
        // a card sits and how it reads, and never while the person is
        // mid-edit (a card is open, a drag is active, or they just clicked).
        if (recentlyTouched || (typeof _bbOpenCardId !== 'undefined' && _bbOpenCardId === row.id)) return;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id !== row.id) continue;
          var loc = list[i];
          // Oct 25 2026 -- never overwrite a card whose own save has not been confirmed yet
          // (checked BEFORE reading the server copy, which resets the saved-state record).
          if (typeof _bbCardHasUnsavedChanges === 'function' && _bbCardHasUnsavedChanges(loc)) break;
          var srv = _bbRowToCard(row);
          if (_cardSignature(srv) !== _cardSignature(loc)) { list[i] = srv; changed++; }
          break;
        }
      });
      if (added || changed) { _bbCards = list; _bbRtSafeRender(); }
    } catch (e) {
      console.error('Briefing Board: live refresh failed', e);
    } finally {
      _inFlight = false;
    }
  }

  function _refreshSoon(ms){
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function(){ _timer = null; _refreshFromServer(); }, ms);
  }

  // Called from _bbLogCardMove (briefing-board-card.js) on every move.
  window._bbRefreshAfterPlanDone = function(card, before){
    if (!card || !card.planStepId) return;
    if (card.col !== 'done' || (before && before.col === 'done')) return;
    _refreshSoon(1200);                                   // the database trigger has fired by now
    setTimeout(function(){ _refreshFromServer(); }, 4500); // and once more in case it was slow
  };

  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) _refreshSoon(400);
  });
  window.addEventListener('focus', function(){ _refreshSoon(400); });
  // The live channel just came back after a drop: read what it missed.
  window.addEventListener('t2t:realtime-reconnected', function(){ _refreshSoon(300); });
  // A light check every 20 seconds while the board is on screen, for the
  // times the live channel has quietly dropped (sleeping laptop, bad wifi).
  setInterval(function(){ if (_boardOnScreen()) _refreshFromServer(); }, 20000);
  window.addEventListener('t2t:drag-end', function(){
    if (_pendingAfterDrag) { _pendingAfterDrag = false; _refreshSoon(300); }
  });
})();
