/* ============================================================
   T2T HUB SCREEN -- what the open desktop shows in its middle.
   Oct 21 2026, Larry: "There are several additions to the T2T HUB
   CONTENTS which need to appear on the T2T HUB screen now." Mirrors the
   CONTENTS header of the T2T HUB topic on the VISION board:
     - T2T / Thoughts to Things
     - a visual symbol for each BOARD type, each one a weenie that travels
       to that board (same list and same opener as the tray's buttons)
     - the two questions: What is T2T? / How does a thought become a thing?
       (their headers on the board are still empty, so for now they say
       they are coming)
   A topic hub (showTopicHub) is this same screen opened on any topic's headers; the Library button uses it.
   Shows only on the open desk: hidden while the Field Guide widget is
   open and while any full-screen board is up.
   ============================================================ */
(function(){
  var STYLE_ID = 't2t-hub-screen-style';
  // The two questions are real headers under the T2T topic on the VISION board. A button opens the
  // Vision board on just that header (found by name when clicked, so every member's own tree works).
  var QUESTIONS = [
    { id: 'hub-what-is-t2t', label: 'What is T2T?' },
    { id: 'hub-how-thought-becomes-thing', label: 'How does a thought become a thing?' }
  ];
  var POS_KEY = 't2t_hubTilePositions';

  // Pictures that are not a single emoji. 'stage-curtains' is the STORY symbol (Oct 21 2026).
  var ICONS = {
    'stage-curtains':
      '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">'
      + '<rect x="3" y="4" width="42" height="6" rx="2" fill="#6e1824"/>'
      + '<rect x="9" y="10" width="30" height="28" fill="#f6ecd2"/>'
      + '<circle cx="24" cy="24" r="4" fill="#f2b632"/>'
      + '<path d="M5 10h15c-1 9-3 18-10 30H5z" fill="#b3263a"/>'
      + '<path d="M43 10H28c1 9 3 18 10 30h5z" fill="#b3263a"/>'
      + '<path d="M11 10c0 10-1 19-3 30M16 10c0 10-1 19-5 30M37 10c0 10 1 19 3 30M32 10c0 10 1 19 5 30" stroke="#7d1a2a" stroke-width="1.3" fill="none"/>'
      + '<rect x="3" y="38" width="42" height="6" rx="1.5" fill="#8a5a2b"/>'
      + '</svg>'
  };

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var rules = ''
      + '#t2t-hub-screen{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
      +   'z-index:1;width:min(640px,calc(100vw - 460px));min-width:360px;display:flex;flex-direction:column;'
      +   'align-items:center;gap:22px;user-select:none;-webkit-user-select:none}'
      + '#t2t-hub-screen .hub-title{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(9vw,84px);letter-spacing:0.12em;line-height:1;color:rgba(0,0,0,.55)}'
      + '#t2t-hub-screen .hub-sub{font-family:"Playfair Display",Georgia,serif;font-size:min(2.6vw,24px);'
      +   'letter-spacing:0.08em;color:rgba(0,0,0,.45);margin-top:-12px}'
      + '#t2t-hub-screen .hub-boards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:100%}'
      + '#t2t-hub-screen .hub-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +   'gap:6px;padding:16px 8px;background:rgba(255,255,255,.7);border:1.5px solid rgba(0,0,0,.18);'
      +   'border-radius:14px;cursor:pointer;font-family:inherit;color:#1a3a5c;'
      +   'box-shadow:0 2px 8px rgba(0,0,0,.12);transition:transform .12s,box-shadow .12s}'
      + '#t2t-hub-screen .hub-tile:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.2);background:#fff}'
      + '#t2t-hub-screen .hub-symbol{font-size:40px;line-height:1;display:flex;align-items:center;justify-content:center;height:44px}'
      + '#t2t-hub-screen .hub-move{touch-action:none;cursor:grab}'
      + '#t2t-hub-screen .hub-dragging{cursor:grabbing;z-index:5;box-shadow:0 10px 24px rgba(0,0,0,.3);transition:none!important}'
      + '#t2t-hub-screen .hub-name{font-size:15px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}'
      + '#t2t-hub-screen .hub-questions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;width:100%}'
      + '#t2t-hub-screen .hub-question{padding:10px 18px;background:rgba(255,255,255,.55);'
      +   'border:1.5px dashed rgba(0,0,0,.28);border-radius:999px;cursor:pointer;font-family:inherit;'
      +   'font-size:15px;color:#1a3a5c}'
      + '#t2t-hub-screen .hub-question:hover{background:#fff}';
    // Oct 21 2026: a topic hub (the Library, and any topic later) is the SAME hub look in an overlay -- one set of rules, copied for its own root.
    var topicRules = rules.split('#t2t-hub-screen').join('#t2t-topic-hub .hub-inner');
    var css = rules + topicRules
      + '#t2t-topic-hub{position:fixed;inset:0;z-index:9000;background:#efe8d6;display:flex;align-items:center;justify-content:center}'
      + '#t2t-topic-hub .hub-inner{z-index:1}'
      + '#t2t-topic-hub .hub-back{position:absolute;top:18px;left:22px;padding:8px 16px;background:rgba(255,255,255,.7);'
      +   'border:1.5px solid rgba(0,0,0,.18);border-radius:999px;cursor:pointer;font-family:inherit;font-size:15px;color:#1a3a5c}'
      + '#t2t-topic-hub .hub-back:hover{background:#fff}'
      + '#t2t-topic-hub .hub-back{font-size:20px;line-height:1;padding:8px 12px}'
      // The Notebook sits on the desk, not on a hub (Oct 21 2026: it showed up over the Library hub).
      + 'body:has(#t2t-topic-hub) #sz-notebook{display:none!important}'
      // Only on the open desk: not under the Field Guide widget, not over a full-screen board.
      + 'body:not(.t2t-desk-closed) #t2t-hub-screen,'
      +   'body:has(#fg-root.isx-full) #t2t-hub-screen,'
      +   'body.t2t-bare-screen #t2t-hub-screen{display:none!important}'
      // The hub carries its own T2T title, so the faint embossed one steps aside when it shows.
      + 'body.t2t-desk-closed:not(.t2t-bare-screen) #sz-t2t-watermark{display:none}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function toast(msg){
    if (window.T2T && window.T2T.toast) { window.T2T.toast(msg); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:rgba(10,74,56,.92);color:#fff;padding:8px 18px;border-radius:18px;z-index:10050;font-size:14px';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2200);
  }

  /* Every button on the HUB can be moved: drag it anywhere and it stays there (saved on this device).
     A plain click still goes to the board; a drag of more than a few pixels is a move, not a click. */
  function loadPositions(){ try{ return JSON.parse(localStorage.getItem(POS_KEY)) || {}; }catch(e){ return {}; } }
  function savePosition(id, dx, dy){
    var all = loadPositions(); all[id] = [dx, dy];
    try{ localStorage.setItem(POS_KEY, JSON.stringify(all)); }catch(e){}
  }
  function makeMovable(el, id, onClick){
    var pos = loadPositions()[id] || [0, 0];
    var dx = pos[0], dy = pos[1], startX = 0, startY = 0, baseDx = 0, baseDy = 0, moved = false, down = false;
    function apply(){ el.style.transform = (dx || dy) ? 'translate(' + dx + 'px,' + dy + 'px)' : ''; }
    apply();
    el.addEventListener('pointerdown', function(e){
      if (e.button !== undefined && e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startY = e.clientY; baseDx = dx; baseDy = dy;
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
    });
    el.addEventListener('pointermove', function(e){
      if (!down) return;
      var mx = e.clientX - startX, my = e.clientY - startY;
      if (!moved && Math.abs(mx) + Math.abs(my) < 6) return;
      moved = true; el.classList.add('hub-dragging');
      dx = baseDx + mx; dy = baseDy + my; apply();
    });
    function end(){
      if (!down) return;
      down = false; el.classList.remove('hub-dragging');
      if (moved) savePosition(id, dx, dy);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', function(e){
      if (moved) { moved = false; e.preventDefault(); e.stopPropagation(); return; }
      onClick();
    });
  }

  /* Opens the Vision board on just the named header under the T2T topic ("one tree": the same
     headers you see on the board, found by name, never a copy). */
  async function openQuestion(q){
    try{
      var client = window.T2T && window.T2T.sb;
      if (!client || !window.IDBand || !window.IDBand.goToBoard) throw new Error('not ready');
      if (window.T2T.showTravelSpinner) window.T2T.showTravelSpinner();
      var found = await client.from('ideas').select('id,cluster_id,text_content')
        .eq('content_type', 'header').ilike('text_content', q.label).limit(20);
      if (found.error) throw found.error;
      var rows = found.data || [];
      var parentIds = rows.map(function(r){ return r.cluster_id; }).filter(Boolean);
      var parents = parentIds.length ? await client.from('ideas').select('id,text_content').in('id', parentIds) : { data: [] };
      var parentName = {};
      (parents.data || []).forEach(function(p){ parentName[p.id] = String(p.text_content || '').trim().toUpperCase(); });
      // The CONTENTS list on the T2T HUB topic holds empty copies of these names; the real header is the one that has content.
      var real = rows.filter(function(r){ return parentName[r.cluster_id] !== 'CONTENTS'; })[0];
      if (!real) throw new Error('not found');
      var ok = await window.IDBand.goToBoard('IDEA', real.id);
      if (ok === false) throw new Error('could not open');
    }catch(err){
      console.error('HUB question failed to open:', err);
      if (window.T2T && window.T2T.hideTravelSpinner) window.T2T.hideTravelSpinner();
      toast(q.label + ' had trouble opening -- please try again.');
    }
  }

  /* One tile, used by the T2T HUB and by every topic hub. */
  function makeTile(e){
    var tile = document.createElement('button');
    tile.type = 'button'; tile.className = 'hub-tile hub-move'; tile.title = 'Go to ' + e.label + ' (drag to move)';
    var sym = document.createElement('span'); sym.className = 'hub-symbol';
    if (typeof e.symbol === 'string' && e.symbol.indexOf('icon:') === 0) sym.innerHTML = ICONS[e.symbol.slice(5)] || '';
    else sym.textContent = e.symbol || '';
    var name = document.createElement('span'); name.className = 'hub-name'; name.textContent = e.label;
    tile.appendChild(sym); tile.appendChild(name);
    makeMovable(tile, e.id, e.go);
    return tile;
  }

  /* A topic hub: the same hub screen, opened on any topic whose children are headers (Oct 21 2026: the Library button).
     opts = { title, sub, items: [{ id, symbol, label, go }] }. Back (or Esc) returns to the T2T HUB. */
  function closeTopicHub(){
    var el = document.getElementById('t2t-topic-hub');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.removeEventListener('keydown', onTopicKey, true);
  }
  function onTopicKey(e){ if (e.key === 'Escape') { e.stopPropagation(); closeTopicHub(); } }
  function showTopicHub(opts){
    injectStyle();
    closeTopicHub();
    var ov = document.createElement('div'); ov.id = 't2t-topic-hub';
    var back = document.createElement('button'); back.type = 'button'; back.className = 'hub-back'; back.textContent = '\uD83C\uDFE0'; back.title = 'T2T HUB (home)'; back.setAttribute('aria-label', 'Home');
    back.addEventListener('click', closeTopicHub);
    var inner = document.createElement('div'); inner.className = 'hub-inner';
    var title = document.createElement('div'); title.className = 'hub-title'; title.textContent = opts.title || '';
    inner.appendChild(title);
    if (opts.sub) { var sub = document.createElement('div'); sub.className = 'hub-sub'; sub.textContent = opts.sub; inner.appendChild(sub); }
    var grid = document.createElement('div'); grid.className = 'hub-boards';
    (opts.items || []).forEach(function(it){
      grid.appendChild(makeTile({ id: 'topic-' + it.id, symbol: it.symbol, label: it.label, go: function(){ closeTopicHub(); it.go(); } }));
    });
    inner.appendChild(grid);
    ov.appendChild(back); ov.appendChild(inner);
    document.body.appendChild(ov);
    document.addEventListener('keydown', onTopicKey, true);
  }

  function build(){
    if (document.getElementById('t2t-hub-screen')) return;
    var sys = window.SZDrawerSystem;
    if (!sys || !sys.hubBoards || !sys.openHubBoard) return;
    injectStyle();
    var wrap = document.createElement('div');
    wrap.id = 't2t-hub-screen';

    var title = document.createElement('div'); title.className = 'hub-title'; title.textContent = 'T2T';
    var sub = document.createElement('div'); sub.className = 'hub-sub'; sub.textContent = 'Thoughts to Things';
    wrap.appendChild(title); wrap.appendChild(sub);

    var grid = document.createElement('div'); grid.className = 'hub-boards';
    var entries = sys.hubBoards.map(function(e){
      return { id: e.id, symbol: e.symbol, label: e.label, go: function(){ sys.openHubBoard(e); } };
    });
    // The Library: a book that opens the read-only Library view (its ID BAND has the home button to leave it).
    entries.push({ id: 'hub-library', symbol: '\uD83D\uDCDA', label: 'Library', go: function(){
      if (window.T2TLibraryView && window.T2TLibraryView.openHub) window.T2TLibraryView.openHub();
      else toast('The Library had trouble opening -- please try again.');
    } });
    entries.forEach(function(e){ grid.appendChild(makeTile(e)); });
    wrap.appendChild(grid);

    var qs = document.createElement('div'); qs.className = 'hub-questions';
    QUESTIONS.forEach(function(q){
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'hub-question hub-move'; btn.textContent = q.label; btn.title = 'Open ' + q.label + ' (drag to move)';
      makeMovable(btn, q.id, function(){ openQuestion(q); });
      qs.appendChild(btn);
    });
    wrap.appendChild(qs);

    document.body.insertBefore(wrap, document.body.children[1] || null);
  }

  window.T2THubScreen = { build: build, showTopicHub: showTopicHub, closeTopicHub: closeTopicHub };
})();
