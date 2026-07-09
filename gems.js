/* ============================================================
   gems.js — T2T Field Guide · Gems module (9420)
   New build — July 9, 2026. Replaces the old 9420 list-view
   (s-gems-list) as the default Gems screen reached from the
   💎 backpack button. The legacy Gems hub — s-gems, s-gem-add,
   s-gems-list, s-gems-miro, plus registerGems()/getGemCandidates()
   in backpack.js — is left fully intact and UNCHANGED. Nothing
   was deleted. It's just no longer the default path.

   Talks to backpack.js ONLY through window.T2T (the existing
   public API) — never reaches into backpack.js internals
   directly. Loads AFTER backpack.js (and after sea-of-ideas.js,
   if present) in every phase file that needs Gems.

   Built plug-and-play on purpose: gemTile() is a standalone
   renderer — takes plain {text, shape, color, hearted} data and
   two callbacks, returns a DOM node. Nothing in it assumes Gems
   specifically. Any future feature that wants a scattered,
   editable card pile (a future Values pass, some other board)
   can call gemTile() directly without touching this file's
   Supabase/data logic.

   REQUIRES a one-time Supabase migration — see note at bottom
   of this file. Nothing here will save correctly until that
   migration is run.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  var SHAPES = ['circle','square','triangle','pentagon','hexagon'];
  var CLIPS = {
    circle:   'circle(46% at 50% 50%)',
    square:   'inset(10%)',
    triangle: 'polygon(50% 8%,92% 88%,8% 88%)',
    pentagon: 'polygon(50% 4%,95% 38%,79% 92%,21% 92%,5% 38%)',
    hexagon:  'polygon(25% 6%,75% 6%,96% 50%,75% 94%,25% 94%,4% 50%)'
  };
  var PALETTE = ['#E9D8FD','#FDE8D8','#D8F3E9','#FDE0EC','#DCE8FD','#F5E8D0'];
  var PURPLE = '#5B21B6';
  var CARD = 96;

  /* ── CURATED GEM SOURCE LIST ──
     Each entry is a Gem the guide offers, tied to the page it
     lives on. The moment a traveler's B (bookmark) passes
     page_num, the Gem unlocks into their chest — once, silently,
     no popup, same mechanism the Map already uses for traveled
     vs. unvisited. Add future curated Gems here as new pages lock. */
  var CURATED = [
    { page_num:'0200', text:'Every great invention started as a thought.', attr:'Curated · from 0200' }
  ];

  /* ── REUSABLE TILE RENDERER — plug-and-play ──
     opts: { onOpen(), onHeart(hearted) }
     Returns { el, fitText(), setShape(s), setColor(c) }. */
  function gemTile(data, opts){
    opts = opts || {};
    var card = document.createElement('div');
    card.style.position = 'absolute';
    card.style.width = CARD + 'px';
    card.style.height = CARD + 'px';
    card.style.background = '#2B2438';
    card.style.border = '2px solid #111';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 3px 8px rgba(0,0,0,.22), 0 1px 3px rgba(0,0,0,.14)';
    card.style.cursor = 'pointer';

    var face = document.createElement('div');
    face.style.position = 'absolute';
    face.style.top = '0'; face.style.left = '0'; face.style.right = '0'; face.style.bottom = '0';
    face.style.background = data.color || PURPLE;
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
    label.style.color = '#F5F3FF';
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

    card.addEventListener('dblclick', function(){ if (opts.onOpen) opts.onOpen(); });

    function fitText(){
      var size = 13, tries = 0;
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

    var div = document.createElement('div');
    div.innerHTML =
      '<div class="sc card" id="s-gems-board">' +
        '<div style="position:relative;width:100%;height:480px;background:#F5F3FF;overflow:hidden">' +
          '<div style="position:absolute;top:16px;left:16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;z-index:1">Gems <span id="gb-count"></span></div>' +
          '<button id="gb-close" aria-label="Close" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:8px;background:#ede9fe;border:1px solid #c4b5fd;z-index:1;cursor:pointer">✕</button>' +
          '<div id="gb-pile" style="position:absolute;top:56px;left:16px;right:16px;bottom:16px"></div>' +
          '<div id="gb-empty" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;color:#7c3aed;text-align:center;padding:40px;box-sizing:border-box">' +
            '<div style="font-size:15px;line-height:1.6">No Gems yet.<br>They surface when you\'re ready.</div>' +
          '</div>' +
        '</div>' +
        '<div id="gb-detail" style="display:none;position:fixed;inset:0;background:rgba(59,37,16,0.4);align-items:center;justify-content:center;z-index:999">' +
          '<div style="background:#F5F3FF;border-radius:12px;border:2px solid #111;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:1.25rem;max-width:340px;width:85%;box-sizing:border-box">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
              '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7c3aed">Gem</div>' +
              '<button id="gb-detail-close" aria-label="Close" style="width:28px;height:28px;border-radius:50%;background:#ede9fe;border:1.5px solid #111;cursor:pointer">✕</button>' +
            '</div>' +
            '<div id="gb-source" style="font-size:12px;color:#7c3aed;opacity:.8;margin-bottom:12px;min-height:14px"></div>' +
            '<textarea id="gb-text" style="width:100%;min-height:70px;font-size:16px;color:#5B21B6;line-height:1.5;background:#fff;border:1.5px solid #c4b5fd;border-radius:8px;padding:10px;box-sizing:border-box;resize:none;margin-bottom:12px"></textarea>' +
            '<div id="gb-notes-wrap" style="display:none;margin-bottom:12px">' +
              '<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Notes</div>' +
              '<textarea id="gb-notes" placeholder="Anything that comes to mind" style="width:100%;min-height:60px;font-size:14px;color:#3B2510;background:#fff;border:1.5px solid #c4b5fd;border-radius:8px;padding:10px;box-sizing:border-box;resize:none"></textarea>' +
            '</div>' +
            '<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Shape</div>' +
            '<div id="gb-shapes" style="display:flex;gap:10px;margin-bottom:14px"></div>' +
            '<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Color</div>' +
            '<div id="gb-colors" style="display:flex;gap:10px;margin-bottom:18px"></div>' +
            '<div style="display:flex;gap:8px">' +
              '<button id="gb-notes-btn" style="flex:1;cursor:pointer">✏️ Notes</button>' +
              '<button id="gb-trash" style="flex:1;cursor:pointer">🗑️ Trash</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    fg.appendChild(div.firstChild);

    T().registerPageNum('s-gems-board', '9420');
    T().registerCtx('s-gems-board', 'Gems');
    T().wire('gb-close', function(){ T().returnToMG(); });
    T().wire('gb-detail-close', closeDetail);
    T().registerScreenActivate('s-gems-board', renderGemsBoard);
  }

  /* ── DATA LAYER ── */

  async function ensureCuratedGems(){
    var sb = T().sb, member = T().getMember();
    if (!sb || !member) return;
    var visited = (T().getVisited ? T().getVisited() : []);
    var due = CURATED.filter(function(c){ return visited.indexOf(c.page_num) !== -1; });
    if (!due.length) return;
    try {
      var user = await sb.auth.getUser();
      if (!user || !user.data || !user.data.user) return;
      var uid = user.data.user.id;
      var existing = await sb.from('gems').select('source_page').eq('user_id', uid).eq('source_type', 'curated');
      var have = (existing.data || []).map(function(r){ return r.source_page; });
      var missing = due.filter(function(c){ return have.indexOf(c.page_num) === -1; });
      for (var i = 0; i < missing.length; i++) {
        var c = missing[i];
        await sb.from('gems').insert({
          user_id: uid, gem_text: c.text, attribution: c.attr,
          source_type: 'curated', source_page: c.page_num,
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          color: PURPLE, hearted: false, trashed: false
        });
      }
    } catch (e) { console.error('Gems: curated insert failed', e); }
  }

  async function loadGems(){
    var sb = T().sb;
    try {
      var user = await sb.auth.getUser();
      if (!user || !user.data || !user.data.user) return [];
      var res = await sb.from('gems').select('*').eq('user_id', user.data.user.id).eq('trashed', false).order('created_at', { ascending: false });
      return res.data || [];
    } catch (e) { console.error('Gems: load failed', e); return []; }
  }

  async function saveGemField(id, fields){
    var sb = T().sb;
    try { await sb.from('gems').update(fields).eq('id', id); }
    catch (e) { console.error('Gems: save failed', e); }
  }

  /* ── RENDER ── */

  var _activeGemId = null, _tiles = {};

  async function renderGemsBoard(){
    await ensureCuratedGems();
    var pile = document.getElementById('gb-pile');
    var empty = document.getElementById('gb-empty');
    var countEl = document.getElementById('gb-count');
    pile.innerHTML = ''; _tiles = {};

    var gems = await loadGems();
    countEl.textContent = gems.length ? gems.length : '';
    empty.style.display = gems.length ? 'none' : 'flex';

    var W = pile.clientWidth || 560, H = pile.clientHeight || 340;
    gems.forEach(function(g){
      var x = Math.random() * Math.max(0, W - CARD);
      var y = Math.random() * Math.max(0, H - CARD);
      var rot = (Math.random() * 14 - 7).toFixed(1);
      var tile = gemTile(
        { text: g.gem_text, shape: g.shape || 'circle', color: g.color || PURPLE, hearted: g.hearted },
        {
          onOpen: function(){ openDetail(g); },
          onHeart: function(h){ saveGemField(g.id, { hearted: h }); }
        }
      );
      tile.el.style.left = x + 'px';
      tile.el.style.top = y + 'px';
      tile.el.style.transform = 'rotate(' + rot + 'deg)';
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
      mini.style.background = gem.color || PURPLE;
      mini.style.clipPath = CLIPS[name];
      mini.style.border = '1.5px solid #111';
      box.appendChild(mini);
      box.addEventListener('click', function(){
        gem.shape = name;
        var t = _tiles[gem.id]; if (t) t.setShape(name);
        saveGemField(gem.id, { shape: name });
        paintShapePicker(gem);
      });
      wrap.appendChild(box);
    });
  }

  function paintColorPicker(gem){
    var wrap = document.getElementById('gb-colors');
    wrap.innerHTML = '';
    PALETTE.concat([PURPLE]).forEach(function(c){
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
        var t = _tiles[gem.id]; if (t) t.setColor(c);
        saveGemField(gem.id, { color: c });
        paintColorPicker(gem);
        paintShapePicker(gem);
      });
      wrap.appendChild(ring);
    });
  }

  function openDetail(gem){
    _activeGemId = gem.id;
    document.getElementById('gb-text').value = gem.gem_text || '';
    document.getElementById('gb-source').textContent = gem.source_type === 'curated' ? (gem.attribution || 'Curated') : '';
    document.getElementById('gb-notes').value = gem.notes || '';
    document.getElementById('gb-notes-wrap').style.display = 'none';
    paintShapePicker(gem);
    paintColorPicker(gem);
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
   REQUIRED ONE-TIME SUPABASE MIGRATION
   Run this once in the Supabase SQL editor before pushing this
   file live. The existing `gems` table only has
   user_id / gem_text / attribution / created_at — this adds the
   columns the new board depends on.

   alter table gems add column if not exists shape text default 'circle';
   alter table gems add column if not exists color text default '#5B21B6';
   alter table gems add column if not exists hearted boolean default false;
   alter table gems add column if not exists notes text;
   alter table gems add column if not exists source_type text default 'traveler';
   alter table gems add column if not exists source_page text;
   alter table gems add column if not exists trashed boolean default false;
   ============================================================ */
