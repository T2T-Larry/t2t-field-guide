/* card-order.js -- THE A-Z FEATURE (story: WEBSITE > FEATURES > A-Z on MASTER Blue Sky).
   Larry, Oct 17 2026: "Card order is either A-Z or CUSTOM order." "CUSTOM is the default."
   "A-Z is display only. CUSTOM order is not altered." "Parking Lot header is not affected by a toggle."
   Nov 27 2026: "A-Z is a feature." Two choices, ALL headers and / or ALL subbers, "visible when this card is the TOPIC".
   "Parking Lot subbers can be affected." "A TOOLTIP says the feature content."
   "Child inherits but does not need to retain parent choice."

   THE RULE
   - Each card holds two choices, each On, Off or not chosen: HEADERS (the cards directly under it) and SUBBERS (the cards one level
     under those). They apply to the board shown when that card is the TOPIC.
   - A choice not made follows the nearest card above that made it. Nobody chose = Off (CUSTOM).
   - A card's own choice never changes its parent or flips a child. RESET hands both choices back to the parent; unchecking RESET
     keeps what is showing as the card's own, so it stops following.
   - A checked box counts only while the A-Z feature is switched ON for its card (Nov 27 2026: "A-Z is not on", yet an older saved
     choice was still ordering the boards). Off, or never switched on, the card follows its parent; the saved check comes back when it
     is switched on. A box UNCHECKED on a card stays unchecked either way: it does not re-alphabetize.
   - Moving a card inside an alphabetized group is choosing your own order: what is on screen becomes the order, and A-Z goes off
     for that group on that board.

   Nov 27 2026: "Any green checks mean the feature is active. No checks = inactive. Checking any item activates the feature. That means
   even View as Card Option." So the popup stays usable while the feature is off; a check switches it on; clearing the last check
   (headers, subbers, View as Card Option) switches it off on that card. A card may be active with nothing alphabetized.
   Nov 27 2026: "not sure the headers reset when I undid A-Z." The boxes always show what the board really does: an alphabetical order
   followed from above shows green checked even where the feature is off, so it can be seen and unchecked. Unchecking never switches on.

   Nov 27 2026: "Make on-off a checklist. check = on. no check = off." A choice followed from above shows green checked, like the parent's.

   A-Z is a DISPLAY mode only. It never writes sort_order, so every card's real ORDER # is untouched.
   (One exception: moving a card in a sorted group, by drag or ORDER number -- yieldTo().)

   Memory: public.card_order_prefs holds one row per (traveler, card) that has made a choice (headers_on / subbers_on, empty = follow the
   parent; database-changes/2026-11-27-az-headers-subbers.sql). localStorage is the instant cache so a board never waits on the network:
   a change writes the cache and then the table (best effort), and load() pulls the table into the cache once the session is ready and
   fires 't2t-card-order-synced' when anything changed, so an open board can redraw.

   window.T2TCardOrder
     own(cardId, which)           this card's own choice: true, false, or null (follows the parent). which = 'headers' | 'subbers'
     effective(cardId, which)     {on, from}: what applies, and the id of the card that chose it (null = nobody)
     sorts(cardId, which)         true when that group is shown A-Z on this card's board
     set(cardId, which, on)       remember one choice (cache now, Supabase right after)
     reset(cardId)                forget both choices: the card follows its parent again
     settle(cardId)               switch the feature off on this card when nothing in its popup is checked
     yieldTo(cardId, which)       a card was moved by hand in a sorted group: A-Z goes off for it (true when it was on)
     load()                       pull saved choices from Supabase (runs by itself)
     nameOf(row)                  the name a card shows (its Subject, else its text)
     compare(a, b)                A-Z comparison of two card rows
     sorted(rows)                 a sorted COPY of rows; the input is never touched
     makeControl(cardId, opts)    the popup's contents (a two-line checklist and RESET), as a DOM element
*/
(function(){
  'use strict';

  var KEY = 't2t_cardorder_';
  var TABLE = 'card_order_prefs';
  var FEATURE_CARD = '1ffd8ec8-c641-4db4-add1-9c87d33e03e2';   // the A-Z card under FEATURES: its CONTENTS are the tooltip
  var FEATURE_WORDS = 'Alphabetical order';
  var WHICH = ['headers', 'subbers'];
  var _dirty = {};               // cards changed in THIS browser; load() never overrides these

  // ---- memory (cache here, truth in public.card_order_prefs) ----
  // The cache holds two characters, headers then subbers: '1' on, '0' off, '-' not chosen. (A single '1' is the older one-switch save: headers on.)
  function read(cardId){
    var v = null;
    try{ v = cardId ? localStorage.getItem(KEY + cardId) : null; }catch(e){}
    function one(ch){ return ch === '1' ? true : (ch === '0' ? false : null); }
    return v ? { headers: one(v.charAt(0)), subbers: one(v.charAt(1)) } : { headers: null, subbers: null };
  }
  function pack(c){ return WHICH.map(function(w){ return c[w] === true ? '1' : (c[w] === false ? '0' : '-'); }).join(''); }
  function cacheSet(cardId, c){
    try{
      if(c.headers === null && c.subbers === null) localStorage.removeItem(KEY + cardId);
      else localStorage.setItem(KEY + cardId, pack(c));
    }catch(e){}
  }
  function client(){ return (window.T2T && window.T2T.sb) ? window.T2T.sb : null; }
  function currentUserId(sb){
    return sb.auth.getSession().then(function(r){
      return (r && r.data && r.data.session && r.data.session.user) ? r.data.session.user.id : null;
    });
  }

  function save(cardId, c){
    cardId = String(cardId);
    cacheSet(cardId, c); _dirty[cardId] = true;
    var sb = client();
    if(!sb) return;   // not signed in yet: the cache holds it
    currentUserId(sb).then(function(uid){
      if(!uid) return;
      var q = (c.headers === null && c.subbers === null)
        ? sb.from(TABLE).delete().eq('user_id', uid).eq('card_id', cardId)
        : sb.from(TABLE).upsert({user_id: uid, card_id: cardId, headers_on: c.headers, subbers_on: c.subbers,
            alpha_on: !!(c.headers || c.subbers), updated_at: new Date().toISOString()});
      return q.then(function(res){ if(res && res.error) console.warn('A-Z choice not saved:', res.error.message); });
    }).catch(function(e){ console.warn('A-Z choice not saved:', e && e.message); });
  }
  function set(cardId, which, on){
    if(!cardId || WHICH.indexOf(which) < 0) return;
    var c = read(cardId); c[which] = !!on; save(cardId, c);
  }
  function reset(cardId){ if(cardId) save(cardId, {headers: null, subbers: null}); }

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
      return sb.from(TABLE).select('card_id,headers_on,subbers_on').eq('user_id', uid).limit(5000).then(function(res){
        if(!res || res.error){ _loading = false; return; }
        var remote = {};
        (res.data || []).forEach(function(r){ remote[String(r.card_id)] = { headers: r.headers_on, subbers: r.subbers_on }; });
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
          if(!_dirty[id] && pack(read(id)) !== pack(remote[id])){ cacheSet(id, remote[id]); changed = true; }
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

  // ---- inheritance ----
  function rows(){ try{ return window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){ return null; } }
  // Is the A-Z feature switched on for this card? (A Briefing Board card starts with it on.)
  function switchedOn(cardId){
    var fb = window.FGFeatureBreakers;
    if(!fb || !fb.hasWord) return true;
    if(fb.hasWord({id: cardId}, 'off-az')) return false;
    if(fb.hasWord({id: cardId}, 'on-az')) return true;
    return !!(typeof window._bbFindCardAnywhere === 'function' && window._bbFindCardAnywhere(cardId));
  }
  // A card's own choice. A checked box counts only while the feature is on there (it is kept for later); an unchecked one always counts.
  function own(cardId, which){
    if(!cardId) return null;
    var v = read(cardId)[which];
    return (v === true && !switchedOn(cardId)) ? null : v;
  }
  // Its own choice, else the nearest one above it, else Off.
  function effective(cardId, which){
    var all = rows(), id = cardId, guard = 0;
    while(id && guard++ < 60){
      var v = own(id, which);
      if(v !== null) return { on: v, from: String(id) };
      var r = all && all[id];
      id = r ? r.cluster_id : null;
    }
    return { on: false, from: null };
  }
  function sorts(cardId, which){ return effective(cardId, which).on; }

  // ---- active or not (controls/card-options-list.js holds the switch) ----
  function options(){ return window.FGCardOptions || null; }
  function active(cardId){ var c = options(); return !c || c.isOn(cardId, 'az'); }
  // "No checks = inactive": with headers, subbers and View as Card Option all clear, the feature is switched off on this card.
  async function settle(cardId){
    var c = options(); if(!c || !c.isOn(cardId, 'az') || c.placeOf(cardId, 'az') === 'option') return;
    if(WHICH.some(function(w){ return effective(cardId, w).on; })) return;
    await c.rest(cardId, 'az');
  }

  // Moving a card by hand in a sorted group is choosing your own order for it ("Changing order on a card option should allow change or
  // exception from A-Z", Nov 13 2026). The one place for it: drag and the ORDER control both call here.
  function yieldTo(cardId, which){
    if(!cardId || !sorts(cardId, which)) return false;
    set(cardId, which, false);
    settle(cardId).catch(function(e){ console.warn('A-Z switch not saved:', e && e.message); });
    if(typeof _sboardShowToast === 'function') _sboardShowToast('A-Z ' + which + ' is off on this board so your order shows. Switch it back in the A-Z feature anytime.');
    return true;
  }

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

  // ---- the popup's contents ----
  function words(){
    var all = rows(), r = all && all[FEATURE_CARD];
    return (r && String(r.text_content || '').trim()) || FEATURE_WORDS;
  }
  function ensureStyle(){
    if(document.getElementById('card-order-style')) return;
    var s = document.createElement('style');
    s.id = 'card-order-style';
    s.textContent = '.fg-az{width:100%;margin:0;font-size:calc(11px * var(--fg-text-scale,1))}';
    (document.head || document.documentElement).appendChild(s);
  }
  // opts: {onChange: function()}
  function makeControl(cardId, opts){
    opts = opts || {};
    ensureStyle();
    var wrap = FGPopupParts.list();
    wrap.classList.add('fg-az');
    wrap.setAttribute('data-az-card', String(cardId));
    wrap.title = words();
    var boxes = {}, busy = false;
    [['headers', 'ALL headers'], ['subbers', 'ALL subbers']].forEach(function(d){
      var c = FGPopupParts.check(d[1]);
      c.box.addEventListener('change', function(){
        var want = c.box.checked;
        pick(function(){ set(cardId, d[0], want); }, !want);
      });
      boxes[d[0]] = c.box; wrap.appendChild(c.row);
    });
    // RESET checked = follow the card above. Unchecked = what is showing becomes this card's own choice (nothing showing: it goes inactive).
    var back = FGPopupParts.reset(function(){ pick(function(){ reset(cardId); }, false); }, function(){
      var shown = WHICH.map(function(w){ return effective(cardId, w).on; });
      pick(function(){ WHICH.forEach(function(w, i){ set(cardId, w, shown[i]); }); }, !shown[0] && !shown[1]);
    });
    wrap.appendChild(back.row);
    function paint(){
      var inUse = active(cardId);
      WHICH.forEach(function(w){ var v = effective(cardId, w).on; boxes[w].checked = v; if(v) inUse = true; });
      back.paint(inUse && own(cardId, 'headers') === null && own(cardId, 'subbers') === null);
    }
    // One click: save the choice, then switch the feature on (a check) or off (the last check cleared).
    async function pick(change, cleared){
      if(busy) return paint();
      busy = true;
      var wasOn = active(cardId);
      try{
        change();
        if(cleared) await settle(cardId);
        else if(!wasOn) await options().activate(cardId, 'az');
      }catch(err){ alert('Could not save it: ' + err.message); }
      busy = false; paint();
      if(typeof opts.onChange === 'function') opts.onChange();
    }
    paint();
    return wrap;
  }

  window.T2TCardOrder = {
    own: own,
    effective: effective,
    sorts: sorts,
    set: set,
    reset: reset,
    settle: settle,
    yieldTo: yieldTo,
    load: load,
    nameOf: nameOf,
    compare: compare,
    sorted: sorted,
    makeControl: makeControl
  };
})();
