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

  function _boardOnScreen(){
    var w = document.getElementById('bb-board-wrap');
    return !!(w && w.offsetParent !== null && !document.hidden);
  }

  async function _refreshFromServer(){
    if (_inFlight) return;
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
      var added = 0;
      res.data.forEach(function(row){
        if (have[row.id]) return;
        list.push(_bbRowToCard(row));
        added++;
      });
      if (added) { _bbCards = list; _bbRtSafeRender(); }
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
  window.addEventListener('t2t:drag-end', function(){
    if (_pendingAfterDrag) { _pendingAfterDrag = false; _refreshSoon(300); }
  });
})();
