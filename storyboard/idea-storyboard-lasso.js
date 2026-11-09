/* ============================================================
   idea-storyboard-lasso.js -- T2T Field Guide - IDEA STORYBOARD (9710)

   Nov 9 2026 (Larry: "ALT-click top and ALT-click bottom card to select a
   stack, then drag to a new header ... the colored outline would look like
   a lasso ... We need that traveler ability").

   WHAT IT DOES
     * ALT-click one card in a column: that card becomes the start of a stack.
     * ALT-click another card in the SAME column: every card between the two
       (inclusive) is lassoed. The start stays put, so ALT-clicking a
       different card re-stretches the lasso. ALT-click the start card again
       (or press Escape, or plain-click anywhere else) to let go.
     * The lassoed cards wear a gold glow and one dashed gold loop is drawn
       around the whole stack, with a count badge, so it reads as a lasso.
     * Dragging ANY lassoed card carries the whole stack ("group:id1,id2,...",
       the same payload CLUSTER's lasso already uses). Every drop spot on the
       board (header columns, Subbers, cards) already understands that
       payload, so the stack lands in the same order it was lassoed.

   Nothing here moves a card itself; it only selects and tags the drag.
   Library (read-only) boards never start a drag, so a lasso there is harmless.

   Sibling files: idea-storyboard-tiles.js, idea-storyboard-board-columns.js,
   idea-storyboard-drag-with-arrows.js, idea-storyboard-header.js.
   ============================================================ */
(function(){
  var SCREEN_ID = 's-sea-of-ideas-cluster';
  var CARD_SEL = '.sc-tile, .sc-stack-tile';
  var anchorId = null;      // the card the lasso started on
  var lassoIds = [];        // ids in column order, top to bottom
  var loopEl = null, badgeEl = null, raf = 0;

  function screen(){
    var s = document.getElementById(SCREEN_ID);
    return (s && s.classList.contains('active')) ? s : null;
  }
  function idOf(el){
    return el.getAttribute('data-header-id') || el.getAttribute('data-idea-id');
  }
  function elOf(id){
    var s = screen(); if(!s) return null;
    var q = CSS.escape(String(id));
    return s.querySelector('[data-header-id="'+q+'"]') || s.querySelector('[data-idea-id="'+q+'"]');
  }
  function cardFrom(target){
    var s = screen();
    if(!s || !target || !target.closest) return null;
    var el = target.closest(CARD_SEL);
    if(!el || !s.contains(el) || !idOf(el)) return null;
    return el;
  }
  function siblingCards(el){
    return Array.prototype.filter.call(el.parentNode ? el.parentNode.children : [], function(n){
      return n.matches && n.matches(CARD_SEL) && idOf(n);
    });
  }

  function paint(){
    var s = screen();
    Array.prototype.forEach.call(document.querySelectorAll('.sb-lasso'), function(n){ n.classList.remove('sb-lasso'); });
    if(!s || !lassoIds.length){ hideLoop(); return; }
    lassoIds.forEach(function(id){ var el = elOf(id); if(el) el.classList.add('sb-lasso'); });
    showLoop();
  }

  function ensureLoop(){
    if(loopEl) return;
    loopEl = document.createElement('div');
    loopEl.id = 'sb-lasso-loop';
    badgeEl = document.createElement('div');
    badgeEl.className = 'sb-lasso-badge';
    loopEl.appendChild(badgeEl);
    document.body.appendChild(loopEl);
  }
  function showLoop(){
    ensureLoop();
    loopEl.style.display = 'block';
    badgeEl.textContent = String(lassoIds.length);
    if(!raf) raf = requestAnimationFrame(placeLoop);
  }
  function hideLoop(){
    if(loopEl) loopEl.style.display = 'none';
    if(raf){ cancelAnimationFrame(raf); raf = 0; }
  }
  // Follows the cards while the board pans or zooms.
  function placeLoop(){
    raf = 0;
    if(!lassoIds.length || !screen()){ hideLoop(); return; }
    var l = 1e9, t = 1e9, r = -1e9, b = -1e9, any = false;
    lassoIds.forEach(function(id){
      var el = elOf(id); if(!el) return;
      var rc = el.getBoundingClientRect();
      if(!rc.width) return;
      any = true;
      l = Math.min(l, rc.left); t = Math.min(t, rc.top);
      r = Math.max(r, rc.right); b = Math.max(b, rc.bottom);
    });
    if(!any){ loopEl.style.display = 'none'; }
    else {
      loopEl.style.display = 'block';
      loopEl.style.left = (l - 8) + 'px'; loopEl.style.top = (t - 8) + 'px';
      loopEl.style.width = (r - l + 16) + 'px'; loopEl.style.height = (b - t + 16) + 'px';
    }
    raf = requestAnimationFrame(placeLoop);
  }

  function clear(){
    anchorId = null; lassoIds = [];
    paint();
  }

  function toast(msg){ try{ if(typeof _sboardShowToast==='function') _sboardShowToast(msg); }catch(e){} }

  // ALT-click: start or stretch the lasso. Capture phase, so the card's own
  // click / double-click handlers never also fire.
  document.addEventListener('click', function(e){
    var el = cardFrom(e.target);
    var plain = !(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey);
    if(plain){
      // A plain click anywhere that is not on a lassoed card lets the lasso go.
      if(lassoIds.length && !(el && lassoIds.indexOf(idOf(el)) !== -1)) clear();
      return;
    }
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    var id = idOf(el);
    var anchorEl = anchorId ? elOf(anchorId) : null;
    if(anchorId && String(id) === String(anchorId)){ clear(); return; }
    if(!anchorEl || anchorEl.parentNode !== el.parentNode){
      anchorId = id; lassoIds = [id];
      paint();
      toast('Lasso started — ALT-click the last card of the stack.');
      return;
    }
    var cards = siblingCards(el);
    var a = cards.indexOf(anchorEl), z = cards.indexOf(el);
    if(a === -1 || z === -1){ anchorId = id; lassoIds = [id]; paint(); return; }
    var from = Math.min(a, z), to = Math.max(a, z);
    lassoIds = cards.slice(from, to + 1).map(idOf);
    paint();
    toast(lassoIds.length + ' cards lassoed — drag any one onto a header. Esc lets go.');
  }, true);
  // ALT-click must not open the double-click card back either.
  document.addEventListener('dblclick', function(e){
    if(e.altKey && cardFrom(e.target)){ e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && lassoIds.length) clear();
  }, true);

  // Dragging a lassoed card carries the whole stack. Bubble phase, so the card's
  // own dragstart (which stored just its own id) has already run and this wins.
  document.addEventListener('dragstart', function(e){
    if(!lassoIds.length || !e.dataTransfer) return;
    var el = cardFrom(e.target);
    if(!el || lassoIds.indexOf(idOf(el)) === -1 || lassoIds.length < 2) return;
    var rest = lassoIds.filter(function(id){ return String(id) !== String(idOf(el)); });
    e.dataTransfer.setData('text/plain', 'group:' + [idOf(el)].concat(rest).join(','));
  });
  // After a drop the board re-draws, so the old outline would be left dangling.
  document.addEventListener('dragend', function(){
    if(lassoIds.length) setTimeout(clear, 400);
  }, true);

  // The lasso is gone when the traveler leaves this screen.
  setInterval(function(){ if(lassoIds.length && !screen()) clear(); }, 1000);

  var st = document.createElement('style');
  st.textContent =
    '#s-sea-of-ideas-cluster .sb-lasso{outline:3px solid #ffc83d!important;outline-offset:-2px;box-shadow:0 0 0 4px rgba(255,200,61,.45),0 0 14px rgba(255,200,61,.8)!important}'
    + '#sb-lasso-loop{position:fixed;display:none;z-index:9000;pointer-events:none;box-sizing:border-box;border:3px dashed #ffc83d;border-radius:16px;background:rgba(255,200,61,.10)}'
    + '#sb-lasso-loop .sb-lasso-badge{position:absolute;top:-14px;right:-14px;min-width:26px;height:26px;padding:0 7px;box-sizing:border-box;border-radius:13px;background:#ffc83d;color:#1a3a5c;font-weight:700;font-size:14px;line-height:26px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.3)}';
  document.head.appendChild(st);

  window.T2TStoryboardLasso = { ids: function(){ return lassoIds.slice(); }, clear: clear };
})();
