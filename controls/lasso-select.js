/* lasso-select.js -- Oct 3 2026.
   Larry (Master BB cards "Lasso to Cluster" and "Custom Filters"): a general
   tool for every board, written ONCE. Two ways to pick a set of cards, one
   way to move it:

     PICK    Lasso   -- draw a dashed freehand loop around cards; whatever
                        the loop touches is selected.
             ALT-F   -- highlight a word or phrase (or just press ALT-F and
                        type one); every card containing it is selected,
                        wherever it sits on the board. Cards that do not
                        match dim while the filter is on.
     MOVE    The same small bar appears under either pick: move the whole
             set into an existing header, or make a NEW header (named for
             the phrase when it came from ALT-F) and move the set into it.
             Boards whose columns are fixed (Briefing Board) simply leave
             out "new header". On a freeform canvas (Sea of Ideas) the set
             can also be dragged as one to an unused x,y spot -- that group
             drag already lives in session.js and reads the selection this
             file hands it.

   This file knows nothing about any one board. A board registers an
   ADAPTER (see lasso-adapters.js) with: where the lasso may start, how to
   list its cards, how to list its headers, how to move cards into a header,
   and (optionally) how to make a header. Adding a fourth board is a few
   lines there, never a new copy of this code.

   Public API (window.T2TLasso):
     register(adapter) -> instance   adapter fields below
     get(name)         -> instance
   Adapter:
     name            'sea' | 'bluesky' | 'bb'   (label only)
     surface()       -> element the lasso may start on (looked up at the
                        moment of mousedown, so a re-rendered board is fine)
     isBackground(t) -> true when event target t is empty board
     needsShift()    -> true when plain drag does something else (pan)
     cards()         -> [{id, el}] every selectable card right now
     headers()       -> [{id, name}] places the set can be moved into
     moveToHeader(ids, headerId)   -> Promise (or value)
     createHeader(name)            -> Promise<headerId>   (optional)
     onSelect(ids)   -> called whenever the selection changes (optional) so
                        a board can mirror it into its own group-drag state
   Instance: select(ids), clear(), getSelected(), filter(phrase).

   Keys: ALT-F start a filter; Esc clears.
*/
(function(){
  'use strict';

  var SEL = 't2t-lasso-selected';
  var DIM = 't2t-lasso-dim';
  var instances = [];
  var activeInst = null;      // the instance that owns the bar right now

  /* ---------------- styles (one block, injected once) ---------------- */
  function ensureStyles(){
    if (document.getElementById('t2t-lasso-styles')) return;
    var s = document.createElement('style');
    s.id = 't2t-lasso-styles';
    s.textContent =
      '.'+SEL+'{outline:2px solid #5b9bd5 !important;outline-offset:1px;}'
      +'.'+DIM+'{opacity:.28;transition:opacity .15s;}'
      +'#t2t-lasso-svg{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99998}'
      +'#t2t-lasso-svg path{fill:rgba(91,155,213,.12);stroke:#5b9bd5;stroke-width:2;stroke-dasharray:6 5;stroke-linecap:round;stroke-linejoin:round}'
      +'#t2t-lasso-bar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:#1a3a5c;color:#fff;'
      +'border-radius:12px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.35);display:flex;align-items:center;gap:8px;'
      +'font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));max-width:92vw;flex-wrap:wrap}'
      +'#t2t-lasso-bar .lb-count{font-weight:700;margin-right:2px}'
      +'#t2t-lasso-bar .lb-count em{font-style:normal;font-weight:400;opacity:.8}'
      +'#t2t-lasso-bar button{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:8px;'
      +'padding:5px 10px;cursor:pointer;font:inherit}'
      +'#t2t-lasso-bar button:hover{background:rgba(255,255,255,.26)}'
      +'#t2t-lasso-bar input{border:1px solid #cfe4f2;border-radius:8px;padding:5px 8px;font:inherit;color:#1a3a5c;min-width:160px}'
      +'#t2t-lasso-menu{position:fixed;z-index:100000;background:#fff;color:#1a3a5c;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);'
      +'max-height:46vh;overflow:auto;min-width:200px;padding:4px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'#t2t-lasso-menu div{padding:6px 10px;border-radius:7px;cursor:pointer}'
      +'#t2t-lasso-menu div:hover{background:#eaf4ff}'
      +'#t2t-lasso-menu .lm-empty{opacity:.6;cursor:default}';
    document.head.appendChild(s);
  }

  /* ---------------- geometry ---------------- */
  // Ray-casting point-in-polygon. pts = [[x,y],...]
  function inPoly(x, y, pts){
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++){
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  // A card is picked when the loop touches it: its centre or any corner is
  // inside the loop, or any point of the loop is inside the card. Cheap and
  // forgiving, which is what a hand-drawn loop wants.
  function loopTouches(rect, pts){
    var cx = (rect.left + rect.right) / 2, cy = (rect.top + rect.bottom) / 2;
    if (inPoly(cx, cy, pts)) return true;
    if (inPoly(rect.left, rect.top, pts) || inPoly(rect.right, rect.top, pts) ||
        inPoly(rect.left, rect.bottom, pts) || inPoly(rect.right, rect.bottom, pts)) return true;
    for (var i = 0; i < pts.length; i++){
      if (pts[i][0] >= rect.left && pts[i][0] <= rect.right && pts[i][1] >= rect.top && pts[i][1] <= rect.bottom) return true;
    }
    return false;
  }
  function pathD(pts){
    if (!pts.length) return '';
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) d += ' L' + pts[i][0] + ' ' + pts[i][1];
    return d + ' Z';
  }

  /* ---------------- the floating bar ---------------- */
  function removeMenu(){
    var m = document.getElementById('t2t-lasso-menu');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }
  function removeBar(){
    removeMenu();
    var b = document.getElementById('t2t-lasso-bar');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function makeInstance(ad){
    var selected = {};          // id -> true
    var phrase = '';            // active ALT-F phrase, '' when none
    var busy = false;

    function ids(){ return Object.keys(selected); }

    function applyClasses(){
      var list = [];
      try { list = ad.cards() || []; } catch (e) { list = []; }
      list.forEach(function(c){
        if (!c.el) return;
        var on = !!selected[c.id];
        c.el.classList.toggle(SEL, on);
        c.el.classList.toggle(DIM, !!phrase && !on);
      });
    }
    function changed(){
      applyClasses();
      if (ad.onSelect) { try { ad.onSelect(ids()); } catch (e) { console.warn('lasso onSelect failed', e); } }
      if (ids().length || phrase) { activeInst = inst; renderBar(); } else if (activeInst === inst) { removeBar(); activeInst = null; }
    }

    var inst = {
      name: ad.name,
      adapter: ad,
      getSelected: function(){ return ids(); },
      select: function(list, additive){
        if (!additive) selected = {};
        (list || []).forEach(function(id){ selected[id] = true; });
        changed();
      },
      clear: function(){
        selected = {}; phrase = '';
        changed();
      },
      // ALT-F: select every card whose text contains the phrase.
      filter: function(text){
        var p = String(text || '').trim();
        if (!p) { inst.clear(); return 0; }
        var needle = p.toLowerCase();
        var hits = [];
        (ad.cards() || []).forEach(function(c){
          var t = ad.cardText ? ad.cardText(c) : (c.el ? c.el.textContent : '');
          if (String(t || '').toLowerCase().indexOf(needle) !== -1) hits.push(c.id);
        });
        phrase = p;
        selected = {};
        hits.forEach(function(id){ selected[id] = true; });
        changed();
        return hits.length;
      },
      refresh: function(){ applyClasses(); }
    };

    /* --- bar --- */
    function renderBar(){
      ensureStyles();
      var bar = document.getElementById('t2t-lasso-bar');
      if (!bar) { bar = document.createElement('div'); bar.id = 't2t-lasso-bar'; document.body.appendChild(bar); }
      var n = ids().length;
      var canNew = typeof ad.createHeader === 'function';
      bar.innerHTML =
        '<span class="lb-count">' + n + ' selected' + (phrase ? ' <em>“' + esc(phrase) + '”</em>' : '') + '</span>'
        + (n ? '<button type="button" data-a="move">Move to header ▾</button>' : '')
        + (n && canNew ? '<button type="button" data-a="new">New header…</button>' : '')
        + (n && typeof ad.labelGroup === 'function' ? '<button type="button" data-a="label" title="Adds a header without moving anything — the cards reorganize when you open Blue Sky">Name group…</button>' : '')
        + (n && typeof ad.hasGrouped === 'function' && ad.hasGrouped(ids()) ? '<button type="button" data-a="ungroup">Ungroup</button>' : '')
        + '<button type="button" data-a="clear">Clear</button>';
      bar.onmousedown = function(e){ e.stopPropagation(); };
      bar.onclick = function(e){
        var b = e.target.closest('button'); if (!b || busy) return;
        var a = b.getAttribute('data-a');
        if (a === 'clear') inst.clear();
        else if (a === 'move') openMoveMenu(b);
        else if (a === 'new') openNewHeader();
        else if (a === 'label') openLabelGroup();
        else if (a === 'ungroup') doUngroup();
      };
    }

    async function doUngroup(){
      if (busy) return; busy = true;
      try { await ad.ungroup(ids()); selected = {}; phrase = ''; changed(); }
      catch (err) { console.warn('lasso ungroup failed', err); window.alert('Couldn’t ungroup: ' + (err && err.message ? err.message : String(err))); }
      finally { busy = false; }
    }

    // "Name group" — names the selection WITHOUT moving it (Sea of Ideas).
    function openLabelGroup(){
      removeMenu();
      var bar = document.getElementById('t2t-lasso-bar'); if (!bar) return;
      bar.innerHTML =
        '<span class="lb-count">' + ids().length + ' selected</span>'
        + '<input type="text" id="t2t-lasso-newname" placeholder="Group name" value="' + esc(phrase) + '">'
        + '<button type="button" data-a="go">Name it</button>'
        + '<button type="button" data-a="back">Back</button>';
      var inp = document.getElementById('t2t-lasso-newname');
      if (inp) { inp.focus(); inp.select(); }
      async function go(){
        var name = ((inp && inp.value) || '').trim();
        if (!name) { if (inp) inp.focus(); return; }
        if (busy) return; busy = true;
        try {
          await ad.labelGroup(ids(), name);
          selected = {}; phrase = '';
          changed();
        } catch (err) {
          console.warn('lasso label failed', err);
          window.alert('Couldn’t name this group: ' + (err && err.message ? err.message : String(err)));
        } finally { busy = false; }
      }
      bar.onclick = function(e){
        var b = e.target.closest('button'); if (!b) return;
        var a = b.getAttribute('data-a');
        if (a === 'go') go(); else if (a === 'back') renderBar();
      };
      if (inp) inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); go(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renderBar(); }
      });
    }

    async function doMove(headerId){
      if (busy) return;
      busy = true; removeMenu();
      var list = ids();
      try {
        await ad.moveToHeader(list, headerId);
        selected = {}; phrase = '';
        changed();
      } catch (err) {
        console.warn('lasso move failed', err);
        window.alert('Couldn’t move these: ' + (err && err.message ? err.message : String(err)));
      } finally { busy = false; }
    }

    async function openMoveMenu(anchor){
      removeMenu();
      var heads = [];
      try { heads = await Promise.resolve(ad.headers()); } catch (e) { heads = []; }
      var m = document.createElement('div'); m.id = 't2t-lasso-menu';
      if (!heads || !heads.length) {
        m.innerHTML = '<div class="lm-empty">No headers here yet' + (typeof ad.createHeader === 'function' ? ' — use New header…' : '') + '</div>';
      } else {
        m.innerHTML = heads.map(function(h, i){ return '<div data-i="' + i + '">' + esc(h.name || '(untitled)') + '</div>'; }).join('');
      }
      document.body.appendChild(m);
      var r = anchor.getBoundingClientRect();
      m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
      m.style.top = Math.max(8, r.top - m.offsetHeight - 6) + 'px';
      m.onmousedown = function(e){ e.stopPropagation(); };
      m.onclick = function(e){
        var d = e.target.closest('div[data-i]'); if (!d) return;
        doMove(heads[parseInt(d.getAttribute('data-i'), 10)].id);
      };
    }

    function openNewHeader(){
      removeMenu();
      var bar = document.getElementById('t2t-lasso-bar'); if (!bar) return;
      bar.innerHTML =
        '<span class="lb-count">' + ids().length + ' selected</span>'
        + '<input type="text" id="t2t-lasso-newname" placeholder="Header name" value="' + esc(phrase) + '">'
        + '<button type="button" data-a="go">Create & move</button>'
        + '<button type="button" data-a="back">Back</button>';
      var inp = document.getElementById('t2t-lasso-newname');
      if (inp) { inp.focus(); inp.select(); }
      async function go(){
        var name = ((inp && inp.value) || '').trim();
        if (!name) { if (inp) inp.focus(); return; }
        if (busy) return; busy = true;
        try {
          var hid = await ad.createHeader(name);
          busy = false;
          await doMove(hid && hid.id ? hid.id : hid);
        } catch (err) {
          busy = false;
          console.warn('lasso new header failed', err);
          window.alert('Couldn’t create that header: ' + (err && err.message ? err.message : String(err)));
        }
      }
      bar.onclick = function(e){
        var b = e.target.closest('button'); if (!b) return;
        var a = b.getAttribute('data-a');
        if (a === 'go') go(); else if (a === 'back') renderBar();
      };
      if (inp) inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); go(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renderBar(); }
      });
    }

    instances.push(inst);
    return inst;
  }

  /* ---------------- freehand drawing (one global listener) ---------------- */
  var drawing = null;

  document.addEventListener('mousedown', function(e){
    if (e.button !== 0 || drawing) return;
    // A press inside the bar or its menu is never the start of a lasso.
    if (e.target.closest && (e.target.closest('#t2t-lasso-bar') || e.target.closest('#t2t-lasso-menu'))) return;
    var inst = null;
    for (var i = instances.length - 1; i >= 0; i--) {
      var ad = instances[i].adapter, surf = null;
      try { surf = ad.surface(); } catch (err) { surf = null; }
      if (!surf || !surf.contains(e.target)) continue;
      if (ad.needsShift && ad.needsShift() && !e.shiftKey) continue;
      if (!ad.isBackground(e.target)) continue;
      inst = instances[i]; break;
    }
    if (!inst) {
      // Clicking empty space anywhere else drops a plain lasso selection
      // (but not an ALT-F filter's dimming -- that has its own Clear).
      return;
    }
    e.preventDefault();
    ensureStyles();
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 't2t-lasso-svg';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    document.body.appendChild(svg);
    drawing = { inst: inst, pts: [[e.clientX, e.clientY]], svg: svg, path: path, moved: false, raf: 0, additive: e.ctrlKey || e.metaKey };

    function paint(){
      if (!drawing) return;               // the mouse was already released
      drawing.raf = 0;
      drawing.path.setAttribute('d', pathD(drawing.pts));
      if (!drawing.moved) return;
      var hits = [];
      (inst.adapter.cards() || []).forEach(function(c){
        if (!c.el) return;
        if (loopTouches(c.el.getBoundingClientRect(), drawing.pts)) hits.push(c.id);
      });
      drawing.hits = hits;
      // live highlight while drawing, so it is clear what the loop will grab
      var live = {}; hits.forEach(function(id){ live[id] = true; });
      (inst.adapter.cards() || []).forEach(function(c){ if (c.el) c.el.classList.toggle(SEL, !!live[c.id] || (drawing.additive && inst.getSelected().indexOf(c.id) !== -1)); });
    }
    function onMove(ev){
      if (!drawing) return;
      var last = drawing.pts[drawing.pts.length - 1];
      var dx = ev.clientX - last[0], dy = ev.clientY - last[1];
      if (dx * dx + dy * dy < 9) return;           // ignore sub-3px jitter
      drawing.pts.push([ev.clientX, ev.clientY]);
      var f = drawing.pts[0];
      if (Math.abs(ev.clientX - f[0]) > 4 || Math.abs(ev.clientY - f[1]) > 4) drawing.moved = true;
      if (!drawing.raf) drawing.raf = requestAnimationFrame(paint);
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (drawing.raf) cancelAnimationFrame(drawing.raf);
      var d = drawing; drawing = null;
      if (d.svg.parentNode) d.svg.parentNode.removeChild(d.svg);
      if (!d.moved || d.pts.length < 3) { d.inst.clear(); return; }   // a plain click clears
      var hits = [];
      (d.inst.adapter.cards() || []).forEach(function(c){
        if (c.el && loopTouches(c.el.getBoundingClientRect(), d.pts)) hits.push(c.id);
      });
      d.inst.select(hits, d.additive);
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }, true);

  /* ---------------- ALT-F ---------------- */
  function visibleInstance(){
    for (var i = instances.length - 1; i >= 0; i--) {
      var surf = null; try { surf = instances[i].adapter.surface(); } catch (e) { surf = null; }
      if (surf && surf.isConnected && surf.getClientRects().length) return instances[i];
    }
    return null;
  }
  function askPhrase(inst){
    ensureStyles();
    removeBar();
    var bar = document.createElement('div'); bar.id = 't2t-lasso-bar';
    bar.innerHTML = '<span class="lb-count">Filter by</span><input type="text" id="t2t-lasso-phrase" placeholder="word or phrase">'
      + '<button type="button" data-a="go">Filter</button><button type="button" data-a="cancel">Cancel</button>';
    document.body.appendChild(bar);
    bar.onmousedown = function(e){ e.stopPropagation(); };
    var inp = document.getElementById('t2t-lasso-phrase'); if (inp) inp.focus();
    function go(){
      var v = ((inp && inp.value) || '').trim();
      if (!v) { if (inp) inp.focus(); return; }
      var n = inst.filter(v);
      if (!n) { window.alert('No cards contain “' + v + '”.'); }
    }
    bar.onclick = function(e){
      var b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-a') === 'go') go(); else { removeBar(); activeInst = null; }
    };
    if (inp) inp.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); removeBar(); activeInst = null; }
    });
  }

  document.addEventListener('keydown', function(e){
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyF') {
      var inst = visibleInstance();
      if (!inst) return;
      // Do not steal ALT-F while typing in a field (the highlight is the point).
      var t = e.target, tag = t && t.tagName;
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable);
      var sel = (window.getSelection && window.getSelection().toString().trim()) || '';
      if (typing && !sel) return;
      e.preventDefault();          // keeps the browser's File menu from opening
      if (sel) {
        var n = inst.filter(sel);
        if (!n) window.alert('No cards contain “' + sel + '”.');
      } else {
        askPhrase(inst);
      }
      return;
    }
    if (e.key === 'Escape' && activeInst) {
      var el = document.activeElement;
      if (el && (el.id === 't2t-lasso-newname' || el.id === 't2t-lasso-phrase')) return;   // their own handler
      activeInst.clear();
    }
  }, true);

  window.T2TLasso = {
    register: function(adapter){
      for (var i = 0; i < instances.length; i++) if (instances[i].name === adapter.name) { instances[i].adapter = adapter; return instances[i]; }
      return makeInstance(adapter);
    },
    get: function(name){
      for (var i = 0; i < instances.length; i++) if (instances[i].name === name) return instances[i];
      return null;
    }
  };
})();
