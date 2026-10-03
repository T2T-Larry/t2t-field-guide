/* lasso-adapters.js -- Oct 3 2026.
   The small per-board part of the shared lasso (lasso-select.js). Each
   adapter answers five questions about its board: where may a lasso start,
   which cards are selectable, which headers can the set move into, how to
   move cards into a header, and (if the board allows it) how to make a new
   header. Nothing here draws or selects anything -- that is all in
   lasso-select.js. A new board = one more adapter block below.

   Loads after session.js and the briefing-board files, so the globals they
   share (script-global scope) and window.T2TSea.lassoHooks exist.
*/
(function(){
  'use strict';
  if (!window.T2TLasso) { console.warn('lasso-adapters: lasso-select.js did not load'); return; }

  function q(sel){ return document.querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tidy(t, n){ t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > (n || 60) ? t.slice(0, (n || 60) - 1) + '…' : t; }
  var NOT_BG = 'button,input,textarea,select,a,[contenteditable="true"]';

  /* ---------------- Sea of Ideas (freeform x,y canvas) ---------------- */
  T2TLasso.register({
    name: 'sea',
    surface: function(){ return q('#isx-canvas'); },
    // Plain drag pans when the camera is attached, so the lasso is Shift+drag
    // there (same as before); with no camera, plain drag lassos.
    needsShift: function(){ return !!(window.T2TCanvasCamera && T2TCanvasCamera.isAttached && T2TCanvasCamera.isAttached()); },
    isBackground: function(t){ return t === q('#isx-canvas'); },
    cards: function(){
      return qa('#isx-canvas .isx-tile').map(function(el){ return { id: el.dataset.isxId, el: el }; });
    },
    cardText: function(c){ return c.el.textContent; },
    headers: function(){ return window.T2TSea && T2TSea.lassoHooks ? T2TSea.lassoHooks.headers() : []; },
    moveToHeader: function(ids, hid){ return T2TSea.lassoHooks.moveCards(ids, hid); },
    createHeader: function(name){ return T2TSea.lassoHooks.addHeader(name); },
    // Mirror into the board's own group-drag state, so dragging any selected
    // tile moves the whole set to an unused x,y spot, as it always has.
    onSelect: function(ids){ if (window.T2TSea && T2TSea.lassoHooks) T2TSea.lassoHooks.setSelected(ids); }
  });

  /* ---------------- Blue Sky (columns of headers) ---------------- */
  function bsTopicId(){
    return (window.T2TShared && (T2TShared.filter || T2TShared.currentTopicId)) || null;
  }
  T2TLasso.register({
    name: 'bluesky',
    surface: function(){ return q('#sc-board-wrap'); },
    needsShift: function(){ var v = q('#sc-board-viewport'); return !!(v && v.classList.contains('isx-camera')); },
    isBackground: function(t){ return !(t.closest && (t.closest('.sc-tile') || t.closest('.sc-pill') || t.closest(NOT_BG))); },
    cards: function(){
      return qa('#sc-board-wrap .sc-tile[data-idea-id]').map(function(el){ return { id: el.getAttribute('data-idea-id'), el: el }; });
    },
    headers: function(){
      var seen = {}, out = [];
      qa('#sc-board-wrap .sc-pill[data-header-id]').forEach(function(el){
        var id = el.getAttribute('data-header-id');
        if (!id || seen[id]) return;
        seen[id] = true;
        var name = tidy(el.textContent, 60);
        if (name) out.push({ id: id, name: name });
      });
      return out;
    },
    moveToHeader: async function(ids, hid){
      for (var i = 0; i < ids.length; i++) await T2TStoryboard.moveCard(ids[i], hid);
    },
    createHeader: async function(name){
      var t2t = window.T2T, topic = bsTopicId();
      if (!t2t || !t2t.sb) throw new Error('Board is not ready yet.');
      var au = await t2t.sb.auth.getUser(); var user = au && au.data && au.data.user;
      if (!user) throw new Error('Not signed in.');
      var ins = await t2t.sb.from('ideas').insert({
        user_id: user.id, content_type: 'header', text_content: name, cluster_id: topic || null,
        created_at: new Date().toISOString(), color: t2t.getDefaultHeaderColor ? t2t.getDefaultHeaderColor() : undefined
      }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      if (typeof _sboardAddRow === 'function') _sboardAddRow(ins.data);   // script-global in idea-storyboard-shared.js
      return ins.data;
    }
  });

  /* ---------------- Briefing Board (fixed workflow columns) ---------------- */
  // Columns are fixed (Parking Lot / DO / Doing / Done / Hang-Ups), so there
  // is deliberately no createHeader here -- the bar leaves "New header" out.
  function bbColumns(){
    if (typeof COLUMNS === 'undefined') return [];
    var pri = { 'do-h': ' (H)', 'do-m': ' (M)', 'do-l': ' (L)' };
    return COLUMNS.map(function(c){ return { id: c.key, name: c.label + (pri[c.key] || '') }; });
  }
  T2TLasso.register({
    name: 'bb',
    surface: function(){ return q('#bb-board-wrap'); },
    needsShift: function(){ return false; },
    isBackground: function(t){ return !(t.closest && t.closest('.bb-card, .bb-col-head, .bb-add-tile, ' + NOT_BG)); },
    cards: function(){
      return qa('#bb-board-wrap .bb-card:not(.bb-card-foreign)').map(function(el){ return { id: el.getAttribute('data-id'), el: el }; });
    },
    headers: bbColumns,
    moveToHeader: function(ids, col){
      // _bbBulkMoveSelectedTo reads the board's own selection map, which
      // onSelect below keeps equal to this set.
      if (typeof _bbBulkMoveSelectedTo !== 'function') throw new Error('Board is not ready yet.');
      _bbLassoSelected = {}; ids.forEach(function(id){ _bbLassoSelected[id] = true; });
      _bbBulkMoveSelectedTo(col);
    },
    onSelect: function(ids){
      if (typeof _bbLassoSelected === 'undefined') return;
      _bbLassoSelected = {}; ids.forEach(function(id){ _bbLassoSelected[id] = true; });
      qa('#bb-board-wrap .bb-card').forEach(function(el){ el.classList.toggle('bb-lasso-selected', !!_bbLassoSelected[el.getAttribute('data-id')]); });
    }
  });
})();
