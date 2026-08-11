/* ============================================================
   gems.js — T2T Field Guide · Gems module (9420)
   v2 — July 9, 2026. Adds real full-screen (isx-full, same
   takeover as Idea Session 9210), random arrival colors, manual
   drag with persisted positions, and a traveler "add a Gem"
   button. Replaces the previous fixed-height, purple-default,
   static-layout version.

   Legacy Gems hub — s-gems, s-gem-add, s-gems-list —
   still untouched, still not deleted.

   Talks to backpack.js ONLY through window.T2T. Loads AFTER
   backpack.js (and sea-of-ideas.js, if present).

   gemTile() stays a standalone, plug-and-play renderer — plain
   data + callbacks in, DOM node out. Nothing in it assumes Gems
   specifically.

   REQUIRES the Supabase migration at the bottom of this file —
   two new columns (pos_x, pos_y) beyond the migration already run.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  // Aug 11 2026 -- re-render Gems' own board when the text-size boost
  // changes, but only if Gems is actually the screen on show right now
  // (renderGemsBoard doesn't guard itself the way 9710's renderSeaBoard
  // does -- it assumes its own DOM already exists).
  window.addEventListener('fg-text-scale-changed', function(){
    var screen = document.getElementById('s-gems-board');
    if (screen && screen.classList.contains('active')) {
      try { renderGemsBoard(); } catch(e){}
    }
  });

  // ── LIVE SYNC (Aug 11 2026) ── same pattern backpack.js's shared
  // realtime channel already drives on the Briefing Board and Idea
  // Storyboard (Aug 4 2026) -- a change to a Gem (yours, on another
  // tab/device) now shows up here without a page reload too. Gems
  // doesn't keep its own in-memory card list the way the other two
  // boards do -- renderGemsBoard() already re-fetches fresh from
  // Supabase every time it runs -- so this handler just re-renders,
  // debounced (a multi-row change shouldn't hammer the DOM once per
  // row) and paused entirely while a tile is mid-drag, only while the
  // Gems screen is actually the one on show.
  var _gemsRtPendingRender = false, _gemsRtTimer = null;
  function _gemsRtSafeRender(){
    var screen = document.getElementById('s-gems-board');
    if (!screen || !screen.classList.contains('active')) return;
    if (T().isDragActive && T().isDragActive()) { _gemsRtPendingRender = true; return; }
    if (_gemsRtTimer) clearTimeout(_gemsRtTimer);
    _gemsRtTimer = setTimeout(function(){ _gemsRtTimer = null; renderGemsBoard(); }, 300);
  }
  window.addEventListener('t2t:drag-end', function(){
    if (_gemsRtPendingRender) { _gemsRtPendingRender = false; _gemsRtSafeRender(); }
  });

  var SHAPES = ['circle','square','triangle','pentagon','hexagon'];
  var CLIPS = {
    circle:   'circle(46% at 50% 50%)',
    square:   'inset(10%)',
    triangle: 'polygon(50% 8%,92% 88%,8% 88%)',
    pentagon: 'polygon(50% 4%,95% 38%,79% 92%,21% 92%,5% 38%)',
    hexagon:  'polygon(25% 6%,75% 6%,96% 50%,75% 94%,25% 94%,4% 50%)'
  };
  var PALETTE = ['#E9D8FD','#FDE8D8','#D8F3E9','#FDE0EC','#DCE8FD','#F5E8D0'];
  var CARD = 96;

  function randomShape(){ return SHAPES[Math.floor(Math.random() * SHAPES.length)]; }
  function randomColor(){ return PALETTE[Math.floor(Math.random() * PALETTE.length)]; }

  /* ── CURATED GEM SOURCE LIST ──
     Each entry unlocks into the traveler's chest once their B
     (bookmark) passes page_num — same mechanism the Map already
     uses. Add future curated Gems here as new pages lock. */
  var CURATED = [
    { page_num:'0200', text:'Every great invention started as a thought.', attr:'Curated · from 0200' },
    { page_num:null, text:'Magic & Memorable', attr:'Curated' },
    { page_num:null, text:'Hidden Mickeys make life interesting.', attr:'Curated' }
  ];

  /* ── REUSABLE TILE RENDERER — plug-and-play ──
     opts: { onOpen(), onHeart(hearted), onDrag(x,y) }
     Returns { el, fitText(), setShape(s), setColor(c) }. */
  function gemTile(data, opts){
    opts = opts || {};
    // Card size scales with the text-size boost, Aug 11 2026 -- Larry:
    // bigger text should mean a bigger card here too, same reasoning as
    // Storyboard's tiles, otherwise a bigger label just gets clipped by
    // this fixed-size square. Computed fresh per tile (not read once at
    // load) so a boost change while Gems is open takes effect on the
    // next render without needing a page reload.
    var _gemMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
    var cardSize=Math.round(CARD*_gemMult);
    var card = document.createElement('div');
    card.style.position = 'absolute';
    card.style.width = cardSize + 'px';
    card.style.height = cardSize + 'px';
    card.style.background = '#B5B5B5';
    card.style.border = '2px solid #111';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 3px 8px rgba(0,0,0,.22), 0 1px 3px rgba(0,0,0,.14)';
    card.style.cursor = 'grab';

    var face = document.createElement('div');
    face.style.position = 'absolute';
    face.style.top = '0'; face.style.left = '0'; face.style.right = '0'; face.style.bottom = '0';
    face.style.background = data.color || randomColor();
    face.style.clipPath = CLIPS[data.shape] || CLIPS.circle;
    card.appendChild(face);

    var label = document.createElement('div');
    label.textContent = data.text || '';
    label.style.position = 'absolute';
    label.style.top = '0'; label.style.left = '0'; label.style.right = '0'; label.style.bottom = '0';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.justifyContent = 'center';
    label.style.padding = '18px';
    label.style.boxSizing = 'border-box';
    label.style.color = '#111';
    label.style.textAlign = 'center';
    label.style.lineHeight = '1.15';
    label.style.overflow = 'hidden';
    card.appendChild(label);

    var hearted = !!data.hearted;
    var heart = document.createElement('div');
    heart.style.position = 'absolute';
    heart.style.top = '-8px'; heart.style.right = '-8px';
    heart.style.width = '24px'; heart.style.height = '24px';
    heart.style.borderRadius = '50%';
    heart.style.background = '#F5F3FF';
    heart.style.border = '1.5px solid #111';
    heart.style.display = 'flex';
    heart.style.alignItems = 'center';
    heart.style.justifyContent = 'center';
    heart.style.cursor = 'pointer';
    heart.style.fontSize = '12px';
    function paintHeart(){
      heart.textContent = hearted ? '\u2665' : '\u2661';
      heart.style.color = hearted ? '#D4537E' : '#B4B2A9';
    }
    paintHeart();
    heart.addEventListener('click', function(evt){
      evt.stopPropagation();
      hearted = !hearted;
      paintHeart();
      if (opts.onHeart) opts.onHeart(hearted);
    });
    card.appendChild(heart);

    /* Drag, adapted from Idea Session's _isxWireTileDrag — mousedown
       + threshold distinguishes a drag from a click; dblclick still
       fires independently for opening the card. */
    (function wireDrag(){
      var startX, startY, origLeft, origTop, moved;
      card.addEventListener('mousedown', function(e){
        e.preventDefault();
        startX = e.clientX; startY = e.clientY; moved = false;
        origLeft = parseFloat(card.style.left) || 0;
        origTop = parseFloat(card.style.top) || 0;
        card.style.cursor = 'grabbing';
        function onMove(ev){
          var dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
          card.style.left = Math.round(origLeft + dx) + 'px';
          card.style.top = Math.round(origTop + dy) + 'px';
        }
        function onUp(){
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          card.style.cursor = 'grab';
          if (moved && opts.onDrag) {
            opts.onDrag(parseFloat(card.style.left), parseFloat(card.style.top));
          }
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    })();

    card.addEventListener('dblclick', function(){ if (opts.onOpen) opts.onOpen(); });

    function fitText(){
      var size = Math.round(13*_gemMult), tries = 0;
      label.style.fontSize = size + 'px';
      while (tries < 12 && (label.scrollHeight > label.clientHeight || label.scrollWidth > label.clientWidth)) {
        size -= 1;
        label.style.fontSize = size + 'px';
        tries++;
      }
    }

    return {
      el: card,
      fitText: fitText,
      setShape: function(s){ face.style.clipPath = CLIPS[s] || CLIPS.circle; },
      setColor: function(c){ face.style.background = c; }
    };
  }

  /* ── SCREEN INJECTION ── */
  function injectGemsBoard(){
    var fg = document.getElementById('fg-root'); if (!fg) return;
    if (document.getElementById('s-gems-board')) return;

    if (!document.getElementById('gems-board-style')) {
      var style = document.createElement('style');
      style.id = 'gems-board-style';
      style.textContent =
        '#fg-root.isx-full #s-gems-board.active{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:row}' +
        '#gb-toolbar{width:150px;flex-shrink:0;background:#4C1D95;display:flex;flex-direction:column;padding:14px 12px;gap:10px;overflow-y:auto;color:#F5F3FF}' +
        '#gb-toolbar .gb-tb-label{font-size:calc(9.5px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;text-align:center;opacity:.75;margin-bottom:4px}' +
        '#gb-toolbar button{background:#EFE7FB;color:#4C1D95;border:1.5px solid #111;border-radius:8px;padding:8px 6px;font-size:calc(13px * var(--fg-text-scale,1));cursor:pointer}';
      document.head.appendChild(style);
    }

    var div = document.createElement('div');
    div.innerHTML =
      '<div class="sc card" id="s-gems-board">' +
        '<div id="gb-toolbar">' +
          '<div class="gb-tb-label">Gems</div>' +
          '<button id="gb-add">＋ New Gem</button>' +
          '<button id="gb-textsize">🔠 Text size</button>' +
        '</div>' +
        '<div style="position:relative;flex:1;width:100%;background:#EFE7FB;overflow:hidden">' +
          '<div style="position:absolute;top:16px;left:16px;z-index:1">' +
            '<div style="font-size:calc(32px * var(--fg-text-scale,1));font-weight:700;line-height:1;color:#5B21B6">💎 GEMS</div>' +
            '<div style="font-size:calc(13px * var(--fg-text-scale,1));font-style:italic;color:#7c3aed;margin-top:4px">Flashes of potential value</div>' +
          '</div>' +
          '<button id="gb-close" aria-label="Close" style="position:absolute;top:10px;right:12px;width:32px;height:32px;border-radius:8px;background:#ede9fe;border:1px solid #c4b5fd;z-index:1;cursor:pointer">✕</button>' +
          '<div id="gb-pile" style="position:absolute;top:96px;left:16px;right:16px;bottom:16px"></div>' +
          '<div id="gb-empty" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;color:#7c3aed;text-align:center;padding:40px;box-sizing:border-box">' +
            '<div style="font-size:calc(15px * var(--fg-text-scale,1));line-height:1.6">No Gems yet.<br>They surface when you\'re ready.</div>' +
          '</div>' +
        '</div>' +
        '<div id="gb-detail" style="display:none;position:fixed;inset:0;background:rgba(59,37,16,0.4);align-items:center;justify-content:center;z-index:999">' +
          '<div style="background:#F5F3FF;border-radius:12px;border:2px solid #111;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:1.25rem;max-width:340px;width:85%;box-sizing:border-box">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
              '<div style="font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#7c3aed">Gem</div>' +
              '<button id="gb-detail-close" aria-label="Close" style="width:28px;height:28px;border-radius:50%;background:#ede9fe;border:1.5px solid #111;cursor:pointer">✕</button>' +
            '</div>' +
            '<div id="gb-source" style="font-size:calc(12px * var(--fg-text-scale,1));color:#7c3aed;opacity:.8;margin-bottom:4px;min-height:14px"></div>' +
            '<div id="gb-lock-note" style="display:none;font-size:calc(12px * var(--fg-text-scale,1));color:#7c3aed;opacity:.8;margin-bottom:12px">🔒 Locked — shape and color were chosen on purpose</div>' +
            '<textarea id="gb-text" style="width:100%;min-height:70px;font-size:calc(16px * var(--fg-text-scale,1));color:#5B21B6;line-height:1.5;background:#fff;border:1.5px solid #c4b5fd;border-radius:8px;padding:10px;box-sizing:border-box;resize:none;margin-bottom:12px"></textarea>' +
            '<div id="gb-notes-wrap" style="display:none;margin-bottom:12px">' +
              '<div style="font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Notes</div>' +
              '<textarea id="gb-notes" placeholder="Anything that comes to mind" style="width:100%;min-height:60px;font-size:calc(14px * var(--fg-text-scale,1));color:#3B2510;background:#fff;border:1.5px solid #c4b5fd;border-radius:8px;padding:10px;box-sizing:border-box;resize:none"></textarea>' +
            '</div>' +
            '<div style="font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Shape</div>' +
            '<div id="gb-shapes" style="display:flex;gap:10px;margin-bottom:14px"></div>' +
            '<div style="font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Color</div>' +
            '<div id="gb-colors" style="display:flex;gap:10px;margin-bottom:18px"></div>' +
            '<div style="display:flex;gap:8px">' +
              '<button id="gb-notes-btn" style="flex:1;cursor:pointer">✏️ Notes</button>' +
              '<button id="gb-trash" style="flex:1;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Trash</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    fg.appendChild(div.firstChild);

    T().registerPageNum('s-gems-board', '9420');
    T().registerCtx('s-gems-board', 'Gems');
    T().wire('gb-close', function(){
      var fgr = document.getElementById('fg-root');
      if (fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    T().wire('gb-detail-close', closeDetail);
    T().wire('gb-add', addNewGem);
    // Aug 3 2026: Gems is full-screen too and has no gear of its own --
    // same shared picker as Storyboard/Session/Briefing Board.
    T().wire('gb-textsize', function(){ if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
    T().registerScreenActivate('s-gems-board', renderGemsBoard);
  }

  /* ── DATA LAYER ── */

  async function currentUserId(){
    var sb = T().sb;
    var user = await sb.auth.getUser();
    return (user && user.data && user.data.user) ? user.data.user.id : null;
  }

  async function ensureCuratedGems(){
    var sb = T().sb;
    if (!sb) return;
    var visited = (T().getVisited ? T().getVisited() : []);
    var due = CURATED.filter(function(c){ return !c.page_num || visited.indexOf(c.page_num) !== -1; });
    if (!due.length) return;
    try {
      var uid = await currentUserId(); if (!uid) return;
      var existing = await sb.from('gems').select('source_page').eq('user_id', uid).eq('source_type', 'curated');
      var have = (existing.data || []).map(function(r){ return r.source_page; });
      var missing = due.filter(function(c){ return have.indexOf(c.page_num) === -1; });
      for (var i = 0; i < missing.length; i++) {
        var c = missing[i];
        await sb.from('gems').insert({
          user_id: uid, gem_text: c.text, attribution: c.attr,
          source_type: 'curated', source_page: c.page_num,
          shape: randomShape(), color: randomColor(), hearted: false, trashed: false
        });
      }
    } catch (e) { console.error('Gems: curated insert failed', e); }
  }

  async function loadGems(){
    var sb = T().sb;
    try {
      var uid = await currentUserId(); if (!uid) return [];
      var res = await sb.from('gems').select('*').eq('user_id', uid).eq('trashed', false).order('created_at', { ascending: false });
      return res.data || [];
    } catch (e) { console.error('Gems: load failed', e); return []; }
  }

  async function saveGemField(id, fields){
    var sb = T().sb;
    try { await sb.from('gems').update(fields).eq('id', id); }
    catch (e) { console.error('Gems: save failed', e); }
  }

  async function addNewGem(){
    var sb = T().sb;
    try {
      var uid = await currentUserId(); if (!uid) return;
      await sb.from('gems').insert({
        user_id: uid, gem_text: 'New Gem', attribution: null,
        source_type: 'traveler', source_page: null,
        shape: randomShape(), color: randomColor(), hearted: false, trashed: false
      });
      await renderGemsBoard();
    } catch (e) { console.error('Gems: add failed', e); }
  }

  /* ── RENDER ── */

  var _tiles = {}, _activeGemId = null;

  async function renderGemsBoard(){
    var fgr = document.getElementById('fg-root');
    if (fgr) fgr.classList.add('isx-full');

    await ensureCuratedGems();
    var pile = document.getElementById('gb-pile');
    var empty = document.getElementById('gb-empty');
    pile.innerHTML = ''; _tiles = {};

    var gems = await loadGems();
    empty.style.display = gems.length ? 'none' : 'flex';

    var W = pile.clientWidth || 900, H = pile.clientHeight || 500;
    gems.forEach(function(g){
      var hasPos = (g.pos_x !== null && g.pos_x !== undefined && g.pos_y !== null && g.pos_y !== undefined);
      var x = hasPos ? g.pos_x : Math.random() * Math.max(0, W - CARD);
      var y = hasPos ? g.pos_y : Math.random() * Math.max(0, H - CARD);
      if (!hasPos) saveGemField(g.id, { pos_x: x, pos_y: y });

      var tile = gemTile(
        { text: g.gem_text, shape: g.shape || randomShape(), color: g.color || randomColor(), hearted: g.hearted, locked: g.locked },
        {
          onOpen: function(){ openDetail(g); },
          onHeart: function(h){ saveGemField(g.id, { hearted: h }); },
          onDrag: function(nx, ny){ saveGemField(g.id, { pos_x: nx, pos_y: ny }); }
        }
      );
      tile.el.style.left = x + 'px';
      tile.el.style.top = y + 'px';
      pile.appendChild(tile.el);
      tile.fitText();
      _tiles[g.id] = tile;
    });
  }

  function paintShapePicker(gem){
    var wrap = document.getElementById('gb-shapes');
    wrap.innerHTML = '';
    SHAPES.forEach(function(name){
      var box = document.createElement('div');
      var selected = (name === gem.shape);
      box.style.width = '36px'; box.style.height = '36px';
      box.style.borderRadius = '8px';
      box.style.display = 'flex'; box.style.alignItems = 'center'; box.style.justifyContent = 'center';
      box.style.cursor = 'pointer';
      box.style.border = selected ? '3px solid #111' : '2px solid transparent';
      box.style.background = selected ? '#ede9fe' : 'transparent';
      var mini = document.createElement('div');
      mini.style.width = '22px'; mini.style.height = '22px';
      mini.style.background = '#5B21B6';
      mini.style.clipPath = CLIPS[name];
      mini.style.border = '1.5px solid #111';
      box.appendChild(mini);
      box.addEventListener('click', function(){
        gem.shape = name;
        gem.locked = true;
        var t = _tiles[gem.id]; if (t) t.setShape(name);
        saveGemField(gem.id, { shape: name, locked: true });
        paintShapePicker(gem);
        paintLockNote(gem);
      });
      wrap.appendChild(box);
    });
  }

  function paintColorPicker(gem){
    var wrap = document.getElementById('gb-colors');
    wrap.innerHTML = '';
    PALETTE.forEach(function(c){
      var ring = document.createElement('div');
      var selected = (c === gem.color);
      ring.style.width = '36px'; ring.style.height = '36px';
      ring.style.borderRadius = '50%';
      ring.style.display = 'flex'; ring.style.alignItems = 'center'; ring.style.justifyContent = 'center';
      ring.style.cursor = 'pointer';
      ring.style.border = selected ? '3px solid #111' : '2px solid transparent';
      var dot = document.createElement('div');
      dot.style.width = '24px'; dot.style.height = '24px';
      dot.style.borderRadius = '50%';
      dot.style.background = c;
      dot.style.border = '1.5px solid #111';
      ring.appendChild(dot);
      ring.addEventListener('click', function(){
        gem.color = c;
        gem.locked = true;
        var t = _tiles[gem.id]; if (t) t.setColor(c);
        saveGemField(gem.id, { color: c, locked: true });
        paintColorPicker(gem);
        paintShapePicker(gem);
        paintLockNote(gem);
      });
      wrap.appendChild(ring);
    });
  }

  function paintLockNote(gem){
    var el = document.getElementById('gb-lock-note');
    if (el) el.style.display = gem.locked ? 'block' : 'none';
  }

  function openDetail(gem){
    _activeGemId = gem.id;
    document.getElementById('gb-text').value = gem.gem_text || '';
    document.getElementById('gb-source').textContent = gem.source_type === 'curated' ? (gem.attribution || 'Curated') : '';
    document.getElementById('gb-notes').value = gem.notes || '';
    document.getElementById('gb-notes-wrap').style.display = 'none';
    paintShapePicker(gem);
    paintColorPicker(gem);
    paintLockNote(gem);
    document.getElementById('gb-detail').style.display = 'flex';
  }

  function closeDetail(){
    if (_activeGemId) {
      var text = document.getElementById('gb-text').value;
      var notes = document.getElementById('gb-notes').value;
      saveGemField(_activeGemId, { gem_text: text, notes: notes });
    }
    _activeGemId = null;
    document.getElementById('gb-detail').style.display = 'none';
    renderGemsBoard();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectGemsBoard();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('gems', _gemsRtSafeRender);
    }
    T().wire('gb-notes-btn', function(){
      var w = document.getElementById('gb-notes-wrap');
      w.style.display = (w.style.display === 'none') ? 'block' : 'none';
    });
    T().wire('gb-trash', function(){
      if (_activeGemId) saveGemField(_activeGemId, { trashed: true });
      _activeGemId = null;
      document.getElementById('gb-detail').style.display = 'none';
      renderGemsBoard();
    });
  });

  window.T2TGems = { open: function(){ T().nav('s-gems-board', false); } };

})();

/* ============================================================
   ADDITIONAL SUPABASE MIGRATION (v2) — run alongside the one
   from the previous build. Adds saved drag positions.

   alter table gems add column if not exists pos_x numeric;
   alter table gems add column if not exists pos_y numeric;
   ============================================================ */

/* ============================================================
   ADDITIONAL SUPABASE MIGRATION (v3) — adds the traveler-choice
   lock flag.

   alter table gems add column if not exists locked boolean default false;
   ============================================================ */
