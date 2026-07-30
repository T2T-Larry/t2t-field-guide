/* ============================================================
   bookmarks.js -- "Shortcuts": a right-side rail of tagged screens.
   (File name predates the final name -- Larry named the feature
   itself "Shortcuts" on July 30, preferring it to "bookmarks" (a
   book word) or "favorites" (implies you loved the content, when
   half of this is just "where was I"). User-facing text all says
   Shortcuts; internal ids/tables kept as bm-/bookmark_* rather than
   renaming everything mid-build.)

   Larry, July 30 2026: "A series of potential bookmarks along the
   right side of the tv screen. A colored dot or shape of choice
   that marks a screen worth tagging to return to. Hover over the
   dot to see where it goes before you click, or just go there if
   you don't remember why you marked it." Then, once shown the
   Custom Keys system already built for the Briefing Board (shape +
   color + meaning, a small traveler-built library): "Custom keys
   just like on the Briefing Board!" -- confirmed as a build ("do
   it now!"). Same-day follow-up: "Can we make this a moveable list
   like phases that could be put into a drawer if wanted? What if
   someone doesn't want any bookmarks?" -- see the drag/dock section
   below for how both are answered.

   This file reuses that exact system (same 6 shapes, same 6
   curated colors, same shape-CSS technique -- see SIGNAL_SHAPES/
   KEY_COLORS/SIGNAL_CLIP in briefing-board.js) but keeps its own
   traveler-wide key library (bookmark_keys) rather than sharing
   the Briefing Board's per-board one, since Shortcuts aren't
   scoped to a board.

   How it works:
   - A small vertical rail of dots, draggable anywhere on the desk
     and dockable to either drawer -- see the drag/dock section
     below, which plugs into the exact same shared system the
     nameplate/notebook/Phase tray already use (window.SZDrag,
     exported by screen-zero.js).
   - The top dot is a "+" -- tap it to tag the CURRENTLY showing
     screen. Only works on screens that have a real page number
     (T2T.getCurNum()); utility boards (Briefing Board, Gems, etc.)
     don't have one and the button dims itself, same `.dim`
     language the TV frame's own knobs already use.
   - Tagging opens a small overlay: pick one of your existing keys,
     or build a new one (shape + color + meaning), same two-step
     flow as the Briefing Board's "Choose a Key" / "Add a Key"
     overlays. If the current screen is already tagged, the overlay
     opens straight to that key with a Remove option instead.
   - Hovering any dot shows its meaning + destination screen name
     before you commit to clicking; clicking navigates there.
   - Capped at 10 Shortcuts (MAX_BOOKMARKS) so the rail stays a
     quick-glance list, not a second nav menu.

   Not yet built (flagging honestly): utility/full-screen boards
   (Briefing Board, Gems, etc.) have no page number, so they're not
   taggable yet -- the rail itself stays visible there though
   (matching the nameplate/notebook, not the TV frame, which is the
   one thing that DOES hide during those). A future pass could give
   those boards a stable identity of their own if Larry wants them
   taggable too.

   Loaded last, after tv-frame.js (and after screen-zero.js, whose
   window.SZDrag export this file depends on for dragging/docking).
   ============================================================ */

(function(){

  function T(){ return window.T2T; }
  function db(){ return T() && T().sb; }

  var BM_SHAPES = ['circle','square','triangle','diamond','star','heart'];
  var BM_COLORS = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var BM_CLIP = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  var MAX_KEY_LIBRARY = 6;
  var MAX_BOOKMARKS = 10;
  var RAIL_GAP = 10;   // px gap used for the rail's one-time default spot
  var DOT_SIZE = 22;
  var DOT_GAP = 8;

  function shapeCSS(shape, color){
    var css = 'background:' + color + ';';
    if (shape === 'circle') css += 'border-radius:50%;';
    else if (shape === 'square') css += 'border-radius:3px;';
    else if (BM_CLIP[shape]) css += 'clip-path:' + BM_CLIP[shape] + ';';
    return css;
  }

  function uuid(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Best-effort human label when the shared `pages` registry (Supabase)
  // doesn't have a row for this screen yet -- it's populated gradually,
  // not exhaustively, so this keeps every screen nameable regardless.
  function prettifyScreenId(id){
    return (id || '')
      .replace(/^s-/, '')
      .split('-')
      .filter(Boolean)
      .map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ') || 'Untitled screen';
  }

  /* ---------- Storage: sessionStorage cache first (instant, and
     carries across real page loads within the same tab the same way
     'visitedPages'/'bbKeyLibrary' already do on this site), Supabase
     as the real per-traveler backing store. ---------- */

  var _bmKeyLib = [];
  var _bmBookmarks = [];

  function loadKeyLibLocal(){
    try { var r = sessionStorage.getItem('t2t_bmKeyLibrary'); return r ? JSON.parse(r) : []; }
    catch(e){ return []; }
  }
  function saveKeyLibLocal(lib){
    try { sessionStorage.setItem('t2t_bmKeyLibrary', JSON.stringify(lib)); } catch(e){}
  }
  function loadBookmarksLocal(){
    try { var r = sessionStorage.getItem('t2t_bookmarks'); return r ? JSON.parse(r) : []; }
    catch(e){ return []; }
  }
  function saveBookmarksLocal(list){
    try { sessionStorage.setItem('t2t_bookmarks', JSON.stringify(list)); } catch(e){}
  }

  async function currentUser(){
    var sb = db(); if (!sb) return null;
    try {
      var res = await sb.auth.getUser();
      return (res && res.data && res.data.user) || null;
    } catch(e){ return null; }
  }

  async function syncKeyLibToSupabase(lib){
    var sb = db(); var u = await currentUser(); if (!sb || !u) return;
    try {
      var rows = lib.map(function(k){ return { id:k.id, user_id:u.id, shape:k.shape, color:k.color, meaning:k.meaning||'' }; });
      if (rows.length){
        var res = await sb.from('bookmark_keys').upsert(rows);
        if (res.error) throw res.error;
        var ids = rows.map(function(r){ return "'" + r.id + "'"; }).join(',');
        await sb.from('bookmark_keys').delete().eq('user_id', u.id).not('id', 'in', '(' + ids + ')');
      } else {
        await sb.from('bookmark_keys').delete().eq('user_id', u.id);
      }
    } catch(e){ console.error('Bookmarks: key library sync failed', e); }
  }

  async function syncBookmarksToSupabase(list){
    var sb = db(); var u = await currentUser(); if (!sb || !u) return;
    try {
      var rows = list.map(function(b, i){
        return { id:b.id, user_id:u.id, page_num:b.page_num, screen_id:b.screen_id,
                 phase_file:b.phase_file, label:b.label||'', key_id:b.key_id||null, sort_order:i };
      });
      if (rows.length){
        var res = await sb.from('bookmarks').upsert(rows);
        if (res.error) throw res.error;
        var ids = rows.map(function(r){ return "'" + r.id + "'"; }).join(',');
        await sb.from('bookmarks').delete().eq('user_id', u.id).not('id', 'in', '(' + ids + ')');
      } else {
        await sb.from('bookmarks').delete().eq('user_id', u.id);
      }
    } catch(e){ console.error('Bookmarks: bookmark sync failed', e); }
  }

  function saveKeyLib(lib){ _bmKeyLib = lib; saveKeyLibLocal(lib); syncKeyLibToSupabase(lib); }
  function saveBookmarks(list){ _bmBookmarks = list; saveBookmarksLocal(list); syncBookmarksToSupabase(list); render(); }

  async function refreshFromSupabase(){
    var sb = db(); var u = await currentUser(); if (!sb || !u) return;
    try {
      var kRes = await sb.from('bookmark_keys').select('*').eq('user_id', u.id).order('created_at', {ascending:true});
      if (kRes.data){ _bmKeyLib = kRes.data; saveKeyLibLocal(_bmKeyLib); }
      var bRes = await sb.from('bookmarks').select('*').eq('user_id', u.id).order('sort_order', {ascending:true});
      if (bRes.data){ _bmBookmarks = bRes.data; saveBookmarksLocal(_bmBookmarks); }
      render();
    } catch(e){ console.error('Bookmarks: refresh failed', e); }
  }

  function keyById(id){
    for (var i = 0; i < _bmKeyLib.length; i++) if (_bmKeyLib[i].id === id) return _bmKeyLib[i];
    return null;
  }
  function bookmarkForCurrentPage(){
    var num = T() && T().getCurNum ? T().getCurNum() : null;
    if (!num) return null;
    for (var i = 0; i < _bmBookmarks.length; i++) if (_bmBookmarks[i].page_num === num) return _bmBookmarks[i];
    return null;
  }

  /* ---------- Styles ---------- */

  function injectStyle(){
    if (document.getElementById('bm-style')) return;
    var css = ''
      + '#bm-rail{position:fixed;display:flex;flex-direction:column;align-items:center;'
      +   'gap:' + DOT_GAP + 'px;z-index:9999;transition:opacity .15s ease;padding:6px 4px;'
      +   'border-radius:14px;background:rgba(20,20,20,.18);backdrop-filter:blur(1px)}'
      + '.bm-grip{width:100%;font-size:8px;letter-spacing:.5px;color:rgba(255,255,255,.75);'
      +   'text-align:center;cursor:grab;user-select:none;line-height:1.4}'
      + '.bm-dot{width:' + DOT_SIZE + 'px;height:' + DOT_SIZE + 'px;border:1.5px solid rgba(255,255,255,.7);'
      +   'cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.4);padding:0;flex:none;'
      +   'transition:transform .1s ease}'
      + '.bm-dot:hover{transform:scale(1.15)}'
      + '.bm-tag{width:' + DOT_SIZE + 'px;height:' + DOT_SIZE + 'px;border-radius:50%;flex:none;'
      +   'border:1.5px dashed rgba(255,255,255,.85);background:rgba(255,255,255,.12);color:#fff;'
      +   'font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}'
      + '.bm-tag.bm-tag-active{background:rgba(201,162,48,.85);border-style:solid}'
      + '.bm-tag.bm-dim{opacity:.3;cursor:default}'
      + '#bm-tooltip{position:fixed;z-index:10001;background:#fdf8f0;color:#3B2510;'
      +   'border-radius:8px;padding:6px 10px;font-size:11px;font-family:Georgia,serif;'
      +   'box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:180px;display:none;pointer-events:auto}'
      + '#bm-tooltip.active{display:block}'
      + '#bm-tooltip b{display:block;font-size:11.5px;margin-bottom:2px}'
      + '#bm-tooltip .bm-tip-remove{margin-top:4px;font-size:10px;color:#a3372b;cursor:pointer;'
      +   'text-decoration:underline;display:inline-block}'
      + '#bm-key-overlay{position:fixed;inset:0;z-index:10000;background:rgba(9,20,17,0.5);'
      +   'display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
      + '#bm-key-overlay.active{display:flex}'
      + '#bm-key-overlay .bm-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:min(300px,90%);box-shadow:0 10px 30px rgba(0,0,0,.4);max-height:80vh;overflow:auto}'
      + '.bm-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}'
      + '.bm-overlay-title{font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:700;color:#1a3a5c}'
      + '.bm-close{border:none;background:none;font-size:14px;cursor:pointer;color:#888}'
      + '.bm-overlay-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:12px}'
      + '#bm-key-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}'
      + '.bm-key-swatch-wrap{display:flex;flex-direction:column;align-items:center;width:64px;cursor:pointer}'
      + '.bm-key-swatch{width:30px;height:30px;border:2px solid transparent;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      + '.bm-key-swatch-wrap.bm-key-active .bm-key-swatch{border-color:#1a3a5c}'
      + '.bm-key-swatch-label{font-size:9.5px;color:#4a3418;text-align:center;margin-top:3px;line-height:1.2}'
      + '.bm-field{margin-bottom:12px}'
      + '.bm-field label{display:block;font-size:10px;font-weight:700;color:#4a3418;letter-spacing:.5px;'
      +   'text-transform:uppercase;margin-bottom:5px}'
      + '.bm-field input[type=text]{width:100%;box-sizing:border-box;padding:6px 8px;border:1.5px solid #cfae7c;'
      +   'border-radius:6px;font-size:12px;font-family:Georgia,serif}'
      + '#bm-shape-row,#bm-color-row{display:flex;gap:8px;flex-wrap:wrap}'
      + '.bm-shape-btn{width:30px;height:30px;border-radius:6px;border:1.5px solid #cfae7c;background:#fff;'
      +   'cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      + '.bm-shape-btn.bm-shape-active{background:#f3e6cf;border-color:#3B2510}'
      + '.bm-color-swatch{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;'
      +   'box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      + '.bm-color-swatch.bm-color-active{border-color:#3B2510}'
      + '.bm-btn{width:100%;padding:8px;border-radius:8px;border:1.5px solid #3B2510;background:#fff;'
      +   'font-size:12px;font-weight:600;cursor:pointer;color:#3B2510;margin-bottom:8px}'
      + '.bm-btn-primary{background:#3B2510;color:#fdf8f0}'
      + '.bm-btn-danger{border-color:#a3372b;color:#a3372b}'
      + '.bm-btn:disabled{opacity:.4;cursor:default}'
      ;
    var style = document.createElement('style');
    style.id = 'bm-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Rail + dots ---------- */

  var railEl, tagBtnEl, dotsEl, tooltipEl;

  function buildRail(){
    railEl = document.createElement('div');
    railEl.id = 'bm-rail';

    var grip = document.createElement('div');
    grip.className = 'bm-grip';
    grip.title = 'Drag to move Shortcuts \u2014 drop on a drawer to put it away';
    grip.textContent = '\u22EE\u22EE Shortcuts';
    railEl.appendChild(grip);

    tagBtnEl = document.createElement('button');
    tagBtnEl.type = 'button';
    tagBtnEl.className = 'bm-tag';
    tagBtnEl.textContent = '+';
    tagBtnEl.addEventListener('click', onTagClick);
    railEl.appendChild(tagBtnEl);

    dotsEl = document.createElement('div');
    dotsEl.id = 'bm-dots';
    dotsEl.style.display = 'flex';
    dotsEl.style.flexDirection = 'column';
    dotsEl.style.gap = DOT_GAP + 'px';
    railEl.appendChild(dotsEl);

    document.body.appendChild(railEl);

    tooltipEl = document.createElement('div');
    tooltipEl.id = 'bm-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function hideTooltip(){ tooltipEl.classList.remove('active'); }

  function showTooltipFor(dotEl, bm){
    var key = keyById(bm.key_id);
    var meaning = key && key.meaning ? key.meaning : 'Shortcut';
    tooltipEl.innerHTML = '<b>' + escapeHtml(meaning) + '</b>' + escapeHtml(bm.label || prettifyScreenId(bm.screen_id))
      + '<span class="bm-tip-remove" id="bm-tip-remove">✕ Remove</span>';
    var r = dotEl.getBoundingClientRect();
    tooltipEl.classList.add('active');
    var tw = tooltipEl.offsetWidth;
    tooltipEl.style.left = Math.max(4, r.left - tw - 10) + 'px';
    tooltipEl.style.top = (r.top + r.height/2 - tooltipEl.offsetHeight/2) + 'px';
    var rm = document.getElementById('bm-tip-remove');
    if (rm) rm.onclick = function(e){ e.stopPropagation(); removeBookmark(bm.page_num); hideTooltip(); };
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function render(){
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    _bmBookmarks.forEach(function(bm){
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'bm-dot';
      var key = keyById(bm.key_id);
      d.style.cssText = shapeCSS(key ? key.shape : 'circle', key ? key.color : '#888');
      d.addEventListener('mouseenter', function(){ showTooltipFor(d, bm); });
      d.addEventListener('mouseleave', hideTooltip);
      d.addEventListener('click', function(){ goToBookmark(bm); });
      dotsEl.appendChild(d);
    });
  }

  function goToBookmark(bm){
    hideTooltip();
    if (!T()) return;
    if (bm.phase_file === T().currentFile()){
      T().nav(bm.screen_id, false);
    } else {
      try { sessionStorage.setItem('bp_target', bm.page_num); } catch(e){}
      T().goPhase(bm.phase_file);
    }
  }

  function removeBookmark(pageNum){
    var list = _bmBookmarks.filter(function(b){ return b.page_num !== pageNum; });
    saveBookmarks(list);
  }

  /* ---------- Tag button state (checked every animation frame,
     same live-tracking pattern as tv-frame.js's updateDimStates). ---- */

  function updateTagState(){
    var num = T() && T().getCurNum ? T().getCurNum() : null;
    var existing = bookmarkForCurrentPage();
    var atCap = _bmBookmarks.length >= MAX_BOOKMARKS;
    var canTag = !!num && (existing || !atCap);
    tagBtnEl.classList.toggle('bm-dim', !canTag);
    tagBtnEl.classList.toggle('bm-tag-active', !!existing);
    tagBtnEl.title = !num ? "This screen doesn't have a page number yet"
      : existing ? 'Edit this screen’s shortcut'
      : atCap ? 'Shortcut rail is full (' + MAX_BOOKMARKS + ') — remove one to add another'
      : 'Tag this screen';
  }

  /* ---------- Tag / key overlay ---------- */

  var ov, ovTitle, ovSub, grid, newBtn, builder, shapeRow, colorRow, meaningInput, saveBtn, removeBtn, closeBtn;
  var _builderShape = BM_SHAPES[0], _builderColor = BM_COLORS[0];

  function buildOverlay(){
    ov = document.createElement('div');
    ov.id = 'bm-key-overlay';
    ov.innerHTML = ''
      + '<div class="bm-card">'
      +   '<div class="bm-overlay-head"><span class="bm-overlay-title" id="bm-overlay-title">Tag this screen</span>'
      +     '<button type="button" class="bm-close" id="bm-overlay-close">✕</button></div>'
      +   '<div class="bm-overlay-sub" id="bm-overlay-sub"></div>'
      +   '<div id="bm-key-grid"></div>'
      +   '<button type="button" class="bm-btn" id="bm-key-newbtn">+ Build a new key</button>'
      +   '<div id="bm-key-builder" style="display:none">'
      +     '<div class="bm-field"><label>Shape</label><div id="bm-shape-row"></div></div>'
      +     '<div class="bm-field"><label>Color</label><div id="bm-color-row"></div></div>'
      +     '<div class="bm-field"><label>Meaning</label><input type="text" id="bm-meaning-input" maxlength="40" placeholder="What does this mark mean?"></div>'
      +     '<button type="button" class="bm-btn bm-btn-primary" id="bm-key-save">Save key &amp; tag screen</button>'
      +   '</div>'
      +   '<button type="button" class="bm-btn bm-btn-danger" id="bm-remove-btn" style="display:none">Remove this shortcut</button>'
      + '</div>';
    document.body.appendChild(ov);

    ovTitle = ov.querySelector('#bm-overlay-title');
    ovSub = ov.querySelector('#bm-overlay-sub');
    grid = ov.querySelector('#bm-key-grid');
    newBtn = ov.querySelector('#bm-key-newbtn');
    builder = ov.querySelector('#bm-key-builder');
    shapeRow = ov.querySelector('#bm-shape-row');
    colorRow = ov.querySelector('#bm-color-row');
    meaningInput = ov.querySelector('#bm-meaning-input');
    saveBtn = ov.querySelector('#bm-key-save');
    removeBtn = ov.querySelector('#bm-remove-btn');
    closeBtn = ov.querySelector('#bm-overlay-close');

    BM_SHAPES.forEach(function(s){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bm-shape-btn'; b.dataset.shape = s; b.title = s;
      b.innerHTML = '<span style="display:inline-block;width:16px;height:16px;' + shapeCSS(s, '#3B2510') + '"></span>';
      b.addEventListener('click', function(){ _builderShape = s; refreshBuilderActive(); });
      shapeRow.appendChild(b);
    });
    BM_COLORS.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bm-color-swatch'; b.dataset.color = c; b.style.background = c;
      b.addEventListener('click', function(){ _builderColor = c; refreshBuilderActive(); });
      colorRow.appendChild(b);
    });

    closeBtn.addEventListener('click', closeOverlay);
    ov.addEventListener('click', function(e){ if (e.target === ov) closeOverlay(); });
    newBtn.addEventListener('click', function(){ showBuilder(); });
    saveBtn.addEventListener('click', onSaveNewKey);
    removeBtn.addEventListener('click', function(){
      var existing = bookmarkForCurrentPage();
      if (existing) removeBookmark(existing.page_num);
      closeOverlay();
    });
  }

  function refreshBuilderActive(){
    shapeRow.querySelectorAll('.bm-shape-btn').forEach(function(b){
      b.classList.toggle('bm-shape-active', b.dataset.shape === _builderShape);
    });
    colorRow.querySelectorAll('.bm-color-swatch').forEach(function(b){
      b.classList.toggle('bm-color-active', b.dataset.color === _builderColor);
    });
  }

  function renderKeyGrid(existingKeyId){
    grid.innerHTML = '';
    _bmKeyLib.forEach(function(k){
      var wrap = document.createElement('div');
      wrap.className = 'bm-key-swatch-wrap' + (k.id === existingKeyId ? ' bm-key-active' : '');
      wrap.innerHTML = '<div class="bm-key-swatch" style="' + shapeCSS(k.shape, k.color) + '"></div>'
        + '<div class="bm-key-swatch-label">' + escapeHtml(k.meaning || '(no meaning)') + '</div>';
      wrap.addEventListener('click', function(){ assignKeyToCurrentScreen(k.id); });
      grid.appendChild(wrap);
    });
    newBtn.style.display = _bmKeyLib.length >= MAX_KEY_LIBRARY ? 'none' : 'block';
  }

  function showBuilder(){
    builder.style.display = 'block';
    grid.style.display = 'none';
    newBtn.style.display = 'none';
    _builderShape = BM_SHAPES[0]; _builderColor = BM_COLORS[0];
    meaningInput.value = '';
    refreshBuilderActive();
  }

  async function onSaveNewKey(){
    var meaning = (meaningInput.value || '').trim();
    if (!meaning){ meaningInput.focus(); return; }
    var key = { id: uuid(), shape: _builderShape, color: _builderColor, meaning: meaning };
    saveKeyLib(_bmKeyLib.concat([key]));
    await assignKeyToCurrentScreen(key.id);
  }

  async function assignKeyToCurrentScreen(keyId){
    var num = T() && T().getCurNum ? T().getCurNum() : null;
    if (!num) { closeOverlay(); return; }
    var active = document.querySelector('.sc.active');
    var screenId = active ? active.id : null;
    if (!screenId){ closeOverlay(); return; }

    var existing = bookmarkForCurrentPage();
    if (existing){
      existing.key_id = keyId;
      saveBookmarks(_bmBookmarks.slice());
      closeOverlay();
      return;
    }

    var label = prettifyScreenId(screenId);
    try {
      var sb = db();
      if (sb){
        var res = await sb.from('pages').select('label').eq('page_num', num).maybeSingle();
        if (res && res.data && res.data.label) label = res.data.label;
      }
    } catch(e){}

    var bm = { id: uuid(), page_num: num, screen_id: screenId, phase_file: T().currentFile(),
               label: label, key_id: keyId, created_at: new Date().toISOString() };
    saveBookmarks(_bmBookmarks.concat([bm]));
    closeOverlay();
  }

  function openOverlay(){
    var existing = bookmarkForCurrentPage();
    grid.style.display = 'flex';
    builder.style.display = 'none';
    removeBtn.style.display = existing ? 'block' : 'none';
    ovTitle.textContent = existing ? 'Edit this shortcut' : 'Tag this screen';
    ovSub.textContent = existing ? 'Pick a different key, or remove the shortcut.' : 'Pick a key, or build a new one.';
    renderKeyGrid(existing ? existing.key_id : null);
    ov.classList.add('active');
  }
  function closeOverlay(){ ov.classList.remove('active'); }

  function onTagClick(){
    var num = T() && T().getCurNum ? T().getCurNum() : null;
    if (!num) return;
    var existing = bookmarkForCurrentPage();
    if (!existing && _bmBookmarks.length >= MAX_BOOKMARKS) return;
    openOverlay();
  }

  /* ---------- Drag + dock, July 30 2026 -- Larry: "make this a
     moveable list like phases that could be put into a drawer if
     wanted." Rather than the original per-frame position-tracking
     loop (which glued the rail to wherever the TV frame currently
     sat), this now registers into the SAME shared claim/drag/dock
     registry the nameplate, notebook, and Phase tray already use
     (exposed as window.SZDrag by screen-zero.js) -- so it can be
     dragged anywhere on the desk, dropped onto either drawer to ride
     it, and hides automatically when that drawer collapses, exactly
     like every other floating object already does. That also answers
     "what if someone doesn't want any bookmarks" -- drag the rail
     onto a drawer and collapse it, same as putting away the tool
     stack or the notebook; nothing to build twice.

     One-time-only default spot (first visit, nothing saved yet):
     approximated from the TV frame's current right edge, so it still
     starts out reading as "attached to the TV" the way Larry first
     asked for it -- from then on it behaves like the nameplate,
     independent of wherever the widget itself gets dragged to. ---------- */

  var BM_RAIL_KEY = 't2t-shortcuts-rail-pos';

  function defaultRailPos(){
    var frame = document.getElementById('tv-frame');
    var fg = document.getElementById('fg-root');
    var ref = frame || fg;
    if (!ref) return { left: window.innerWidth - 60, top: 120 };
    var r = ref.getBoundingClientRect();
    return { left: r.right + (frame ? RAIL_GAP : RAIL_GAP + 22), top: r.top + 20 };
  }

  function wireDrag(){
    var SZDrag = window.SZDrag;
    if (!SZDrag){ console.error('Shortcuts: SZDrag unavailable -- screen-zero.js failed to load?'); return; }

    var def = defaultRailPos();
    var rec = SZDrag.registerClaimable(railEl, BM_RAIL_KEY, def.top);
    SZDrag.makeDraggable(railEl, BM_RAIL_KEY, 'button', def.left, def.top, {
      reattachTargets: [
        { get el(){ return SZDrag.getNavbar(); }, side: 'left' },
        { get el(){ return SZDrag.getDrawerR(); }, side: 'right' }
      ],
      onReattach: function(side, barEl){
        var mode = barEl.dataset.mode || '1';
        SZDrag.setRidingSlot(BM_RAIL_KEY, SZDrag.slotKey(side, mode));
        SZDrag.captureRidingOffset(rec, barEl);
        SZDrag.refreshRidersForSlot(side, mode, barEl);
      }
    });

    // Safety net for a claim saved in a PREVIOUS session: screen-zero.js's
    // own init() already ran its one-time sync pass before this file's
    // DOMContentLoaded fires (script order), so it never saw this rail --
    // catch up now the same way that pass does for its own objects.
    var leftBar = SZDrag.getNavbar();
    var rightBar = SZDrag.getDrawerR();
    if (leftBar) SZDrag.refreshRidersForSlot('left', leftBar.dataset.mode || '1', leftBar);
    if (rightBar) SZDrag.refreshRidersForSlot('right', rightBar.dataset.mode || '1', rightBar);
  }

  // Tag-button state (dim/active/tooltip text) still needs to track
  // whichever screen is currently showing, same live-tick idea
  // tv-frame.js uses for its own knobs -- just no longer bundled with
  // position work now that position isn't recomputed every frame.
  function tickTagState(){
    updateTagState();
    requestAnimationFrame(tickTagState);
  }

  function init(){
    if (document.getElementById('bm-rail')) return; // idempotent
    injectStyle();
    _bmKeyLib = loadKeyLibLocal();
    _bmBookmarks = loadBookmarksLocal();
    buildRail();
    buildOverlay();
    render();
    wireDrag();
    requestAnimationFrame(tickTagState);
    refreshFromSupabase();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
