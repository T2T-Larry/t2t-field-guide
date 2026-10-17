/* card-order.js -- Oct 17 2026.
   THE A-Z FEATURE (story: WEBSITE > FEATURES > A-Z on MASTER Blue Sky).
   Larry: "Card order is either A-Z or CUSTOM order." "A-Z changes the order of the
   cards directly under it." "Every card has an A-Z toggle in its gear." "The choice
   is remembered per card." "A-Z is display only. CUSTOM order is not altered."
   "CUSTOM is the default."

   One rule, one code: a card's toggle orders the cards directly under it, wherever
   they draw -- the headers across a board (the board's own toggle, keyed by the Topic
   id), or the cards stacked in a header's column (the header's toggle). The toggle is
   a reusable control (see CONTROLS on the website board), so every Gear builds it
   here instead of keeping its own copy.

   A-Z is a DISPLAY mode only. It never writes sort_order, so every card's real ORDER #
   is untouched and switching back to CUSTOM loses nothing.

   Memory: public.card_order_prefs holds one row per (traveler, card) while A-Z is ON;
   no row = CUSTOM. localStorage is the instant cache so a board never waits on the
   network: set() writes the cache and then the table (best effort), and load() pulls the
   table into the cache once the session is ready and fires 't2t-card-order-synced' when
   anything changed, so an open board can redraw. This replaces az-toggle.js (the old
   ID Band A-Z button and its letter-group view) and header-order.js, both retired.

   window.T2TCardOrder
     isAlpha(cardId)              true while that card's toggle is A-Z (this browser's cache)
     set(cardId, on)              remember one card's choice (cache now, Supabase right after)
     setMany(cardIds, on)         the same for a list (the board Gear's checklist)
     load()                       pull saved choices from Supabase (runs by itself)
     nameOf(row)                  the name a card shows (its Subject, else its text)
     compare(a, b)                A-Z comparison of two card rows
     sorted(rows)                 a sorted COPY of rows; the input is never touched
     makeToggle(cardId, opts)     the CUSTOM | A-Z control, as a DOM element
*/
(function(){
  'use strict';

  var KEY = 't2t_cardorder_';
  var TABLE = 'card_order_prefs';
  var CHUNK = 100;               // ids per Supabase request (keeps the URL short)
  var _dirty = {};               // cards changed in THIS browser; load() never overrides these

  // ---- memory (cache here, truth in public.card_order_prefs) ----
  function isAlpha(cardId){
    try{ return !!cardId && localStorage.getItem(KEY + cardId) === '1'; }catch(e){ return false; }
  }
  function cacheSet(cardId, on){
    try{
      if(on) localStorage.setItem(KEY + cardId, '1'); else localStorage.removeItem(KEY + cardId);
    }catch(e){}
  }
  function client(){ return (window.T2T && window.T2T.sb) ? window.T2T.sb : null; }
  function currentUserId(sb){
    return sb.auth.getSession().then(function(r){
      return (r && r.data && r.data.session && r.data.session.user) ? r.data.session.user.id : null;
    });
  }
  function chunks(list){
    var out = [];
    for(var i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
    return out;
  }

  function setMany(cardIds, on){
    var ids = (cardIds || []).map(String).filter(Boolean);
    if(!ids.length) return;
    ids.forEach(function(id){ cacheSet(id, on); _dirty[id] = true; });
    var sb = client();
    if(!sb) return;   // not signed in yet: the cache holds it
    currentUserId(sb).then(function(uid){
      if(!uid) return;
      var now = new Date().toISOString();
      return Promise.all(chunks(ids).map(function(part){
        if(on){
          return sb.from(TABLE).upsert(part.map(function(id){ return {user_id: uid, card_id: id, alpha_on: true, updated_at: now}; }));
        }
        return sb.from(TABLE).delete().eq('user_id', uid).in('card_id', part);
      }));
    }).catch(function(){});
  }
  function set(cardId, on){ setMany([cardId], on); }

  var _loaded = false, _loading = false;
  // Pull this traveler's saved choices into the cache. Safe to call repeatedly; only the
  // first successful pass does anything. The table is the truth, except for cards this
  // browser changed a moment ago whose write may still be on its way.
  function load(){
    if(_loaded || _loading) return;
    var sb = client();
    if(!sb) return;
    _loading = true;
    currentUserId(sb).then(function(uid){
      if(!uid){ _loading = false; return; }
      return sb.from(TABLE).select('card_id').eq('user_id', uid).limit(5000).then(function(res){
        if(!res || res.error){ _loading = false; return; }
        var remote = {};
        (res.data || []).forEach(function(r){ remote[String(r.card_id)] = true; });
        var changed = false;
        try{
          var local = [];
          for(var i = 0; i < localStorage.length; i++){
            var k = localStorage.key(i);
            if(k && k.indexOf(KEY) === 0) local.push(k.slice(KEY.length));
          }
          local.forEach(function(id){
            if(!remote[id] && !_dirty[id]){ localStorage.removeItem(KEY + id); changed = true; }
          });
        }catch(e){}
        Object.keys(remote).forEach(function(id){
          if(!isAlpha(id) && !_dirty[id]){ cacheSet(id, true); changed = true; }
        });
        _loaded = true; _loading = false;
        if(changed){
          try{ window.dispatchEvent(new CustomEvent('t2t-card-order-synced')); }catch(e){}
        }
      });
    }).catch(function(){ _loading = false; });
  }

  // The session is not ready the instant this file loads, so try until it is
  // (about 30 seconds at most), then stop.
  (function poll(n){
    load();
    if(!_loaded && n < 60) setTimeout(function(){ poll(n + 1); }, 500);
  })(0);

  // ---- ordering ----
  // The name a card shows: a card with a Subject shows that Subject as its headline, so
  // the sort uses it too (Oct 4 2026 fix: "Persuasion" was filed under W-Y). A header
  // without one is its own text; any other card is the start of its text.
  function nameOf(r){
    if(!r) return '';
    var s = String(r.subject == null ? '' : r.subject).trim();
    if(s) return s;
    if(r.content_type === 'header') return String(r.text_content == null ? '' : r.text_content);
    var t = String(r.text_content || r.idea_text || r.link_title || '').trim();
    return t.length > 60 ? t.slice(0, 60) : t;
  }
  // Lowercased, accents dropped, leading punctuation and The/A/An ignored.
  function sortKey(name){
    var s = String(name == null ? '' : name).toLowerCase();
    try{ s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }catch(e){}
    s = s.replace(/^[^a-z0-9]+/, '');
    s = s.replace(/^(the|a|an)\s+/, '');
    return s;
  }
  function compare(a, b){
    return sortKey(nameOf(a)).localeCompare(sortKey(nameOf(b)), undefined, {numeric: true, sensitivity: 'base'});
  }
  function sorted(rows){ return (rows || []).slice().sort(compare); }

  // ---- the control ----
  var TIP_ON = 'Sorted A to Z -- display only, your CUSTOM order is untouched.';
  var TIP_CUSTOM = 'CUSTOM: your own order. A-Z sorts the cards under this one alphabetically (display only).';
  var TIP_EMPTY = 'A-Z is set, but there is nothing under this card yet -- it will sort the cards you add.';

  function ensureStyle(){
    if(document.getElementById('card-order-style')) return;
    var s = document.createElement('style');
    s.id = 'card-order-style';
    s.textContent = '.fg-az-field{display:flex;flex-direction:column;gap:3px;width:100%;margin:0}'
      + '.fg-az-field>label{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.4px;text-transform:uppercase}';
    (document.head || document.documentElement).appendChild(s);
  }

  // opts: {empty: bool (nothing under this card yet -- the choice still saves, the tooltip
  //        says why nothing moves), onChange: function(on)}
  function makeToggle(cardId, opts){
    opts = opts || {};
    ensureStyle();
    var wrap = document.createElement('div');
    wrap.className = 'bb-field fg-az-field';
    wrap.setAttribute('data-az-card', String(cardId));
    wrap.innerHTML = '<label>A-Z</label>'
      + '<div class="sb-gear-tabs" style="margin-bottom:0;width:auto;min-width:150px">'
      +   '<button type="button" class="sb-gear-tab" data-az="0" style="padding:5px 8px">CUSTOM</button>'
      +   '<button type="button" class="sb-gear-tab" data-az="1" style="padding:5px 8px">A-Z</button>'
      + '</div>';
    var tabs = wrap.querySelectorAll('.sb-gear-tab');
    function paint(){
      var on = isAlpha(cardId);
      Array.prototype.forEach.call(tabs, function(b){
        var isOnTab = b.getAttribute('data-az') === '1';
        b.classList.toggle('active', isOnTab === on);
        b.setAttribute('aria-pressed', (isOnTab === on) ? 'true' : 'false');
        b.title = (on && opts.empty) ? TIP_EMPTY : (on ? TIP_ON : (opts.empty ? TIP_EMPTY : TIP_CUSTOM));
      });
    }
    Array.prototype.forEach.call(tabs, function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        var want = b.getAttribute('data-az') === '1';
        if(want === isAlpha(cardId)) return;
        set(cardId, want);
        paint();
        if(typeof opts.onChange === 'function') opts.onChange(want);
      });
    });
    paint();
    return wrap;
  }

  window.T2TCardOrder = {
    isAlpha: isAlpha,
    set: set,
    setMany: setMany,
    load: load,
    nameOf: nameOf,
    compare: compare,
    sorted: sorted,
    makeToggle: makeToggle
  };
})();
