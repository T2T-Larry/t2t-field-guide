/* library-concepts.js -- Oct 4 2026
   Read-only LIBRARY > CONCEPTS reader for every signed-in member.

   Larry, Oct 4 2026: "Library = read only. make a brass button like the
   others." The LIBRARY tray (drawer-system.js, LIBRARY_ITEMS) gets a
   Concepts button that calls window.T2TLibraryConcepts.open().

   Why a separate viewer instead of opening the Blue Sky board: the
   board is an editing surface (drag, add, delete, back-of-card options)
   and loads only the traveler's own cards. This viewer has no editing
   controls at all. The database side is the "ideas - library member
   read" SELECT policy (ideas.library_shared); there is no insert/update
   /delete path for members, so even a modified client cannot change a
   Library card.

   Data: the CONCEPTS header and everything beneath it, read level by
   level (cluster_id = parent id). Text lives in text_content; an
   optional subject is the card's headline. Card Notes are deliberately
   not shown. Tree depth is small (about 5 levels, ~680 rows).

   Views: CATEGORIES (the clustered headers) and A-Z (every concept that
   has a headline, grouped by first letter). Search filters both.
*/
(function(){
  var ROOT_ID = 'sz-library-concepts';
  var STYLE_ID = 'sz-library-concepts-style';
  var _data = null;      // { byId, kids, root }
  var _loading = null;
  var _view = 'categories';
  var _query = '';

  function sb(){ return window.T2T && window.T2T.sb; }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function titleOf(n){
    var t = (n.subject && n.subject.trim()) || (n.text_content || '').trim();
    return t.replace(/\s+/g, ' ');
  }

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '#' + ROOT_ID + '{position:fixed;inset:0;z-index:100000;background:rgba(40,28,10,.55);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}'
      + '#' + ROOT_ID + ' .lc-panel{background:#fffdf7;border:3px solid #c9973a;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.45);width:min(900px,100%);height:min(86vh,100%);display:flex;flex-direction:column;overflow:hidden;font-family:"Playfair Display",Georgia,serif;color:#4a3418}'
      + '#' + ROOT_ID + ' .lc-top{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#e0b060,#8a6420);color:#fff7e0}'
      + '#' + ROOT_ID + ' .lc-title{font-weight:700;letter-spacing:3px;font-size:15px;flex:0 0 auto}'
      + '#' + ROOT_ID + ' .lc-sub{font-size:11px;opacity:.9;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '#' + ROOT_ID + ' .lc-x{border:none;background:rgba(255,255,255,.25);color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;flex:0 0 auto}'
      + '#' + ROOT_ID + ' .lc-bar{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid #e6d3a8;background:#fbf3de}'
      + '#' + ROOT_ID + ' .lc-search{flex:1 1 auto;min-width:0;padding:7px 10px;border:1px solid #c9a86a;border-radius:6px;font:inherit;font-size:13px;background:#fff}'
      + '#' + ROOT_ID + ' .lc-tab{padding:6px 12px;border:1px solid #c9a86a;border-radius:6px;background:#fff;color:#8a6a3a;font:inherit;font-size:12px;cursor:pointer;letter-spacing:1px}'
      + '#' + ROOT_ID + ' .lc-tab.on{background:#c9973a;color:#fff;border-color:#8a6420}'
      + '#' + ROOT_ID + ' .lc-body{flex:1 1 auto;overflow:auto;padding:12px 16px 24px;font-size:14px;line-height:1.55}'
      + '#' + ROOT_ID + ' details{margin:4px 0 4px 0}'
      + '#' + ROOT_ID + ' details > details, #' + ROOT_ID + ' .lc-kids{margin-left:16px;border-left:2px solid #ecd9ae;padding-left:10px}'
      + '#' + ROOT_ID + ' summary{cursor:pointer;font-weight:700;padding:3px 0}'
      + '#' + ROOT_ID + ' .lc-cat > summary{font-size:15px;letter-spacing:1px;color:#6b4a14}'
      + '#' + ROOT_ID + ' .lc-card{margin:4px 0}'
      + '#' + ROOT_ID + ' .lc-card b{color:#6b4a14}'
      + '#' + ROOT_ID + ' .lc-letter{margin:14px 0 4px;font-size:18px;font-weight:700;color:#c9973a;border-bottom:1px solid #ecd9ae}'
      + '#' + ROOT_ID + ' .lc-empty{color:#8a6a3a;font-style:italic;padding:20px 0}'
      + '#' + ROOT_ID + ' mark{background:#fbe9a8;color:inherit}';
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  async function fetchLevel(ids){
    var out = [];
    var CHUNK = 100;
    for (var i = 0; i < ids.length; i += CHUNK) {
      var part = ids.slice(i, i + CHUNK);
      var res = await sb().from('ideas')
        .select('id,cluster_id,content_type,text_content,subject,sort_order,created_at')
        .in('cluster_id', part)
        .eq('library_shared', true)
        .order('sort_order', { ascending: true })
        .limit(1000);
      if (res.error) throw res.error;
      out = out.concat(res.data || []);
    }
    return out;
  }

  async function load(){
    if (_data) return _data;
    if (_loading) return _loading;
    _loading = (async function(){
      // Find the CONCEPTS header that sits directly under LIBRARY.
      var libs = await sb().from('ideas')
        .select('id,text_content')
        .eq('library_shared', true).eq('content_type', 'header')
        .ilike('text_content', 'library').limit(50);
      if (libs.error) throw libs.error;
      var libIds = (libs.data || []).map(function(r){ return r.id; });
      if (!libIds.length) throw new Error('Library is not shared with this account');
      var cands = await sb().from('ideas')
        .select('id,cluster_id,text_content')
        .eq('library_shared', true).eq('content_type', 'header')
        .ilike('text_content', 'concepts').in('cluster_id', libIds).limit(10);
      if (cands.error) throw cands.error;
      var root = (cands.data || [])[0];
      if (!root) throw new Error('Concepts not found');

      var byId = {}; var kids = {};
      byId[root.id] = root;
      var frontier = [root.id];
      for (var depth = 0; depth < 8 && frontier.length; depth++) {
        var rows = await fetchLevel(frontier);
        frontier = [];
        rows.forEach(function(r){
          if (r.id === r.cluster_id || byId[r.id]) return;
          byId[r.id] = r;
          (kids[r.cluster_id] = kids[r.cluster_id] || []).push(r);
          if (r.content_type === 'header') frontier.push(r.id);
        });
      }
      _data = { byId: byId, kids: kids, root: root };
      return _data;
    })();
    try { return await _loading; } finally { _loading = null; }
  }

  function matches(n, q){
    if (!q) return true;
    return ((n.subject || '') + ' ' + (n.text_content || '')).toLowerCase().indexOf(q) !== -1;
  }
  function subtreeMatches(id, q){
    var d = _data;
    var n = d.byId[id];
    if (matches(n, q)) return true;
    var ks = d.kids[id] || [];
    for (var i = 0; i < ks.length; i++) if (subtreeMatches(ks[i].id, q)) return true;
    return false;
  }

  function hl(text, q){
    var safe = esc(text);
    if (!q) return safe;
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return safe;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function nodeHTML(n, q, isCat){
    var d = _data;
    var ks = (d.kids[n.id] || []).filter(function(k){ return !q || subtreeMatches(k.id, q); });
    var isHeader = n.content_type === 'header';
    if (!isHeader && !ks.length) {
      var head = n.subject && n.subject.trim();
      return '<div class="lc-card">' + (head ? '<b>' + hl(head, q) + '</b> &mdash; ' : '') + hl((n.text_content || '').trim(), q) + '</div>';
    }
    var label = titleOf(n);
    var inner = ks.map(function(k){ return nodeHTML(k, q, false); }).join('');
    var open = (q || isCat === 'open') ? ' open' : '';
    return '<details class="' + (isCat ? 'lc-cat' : 'lc-node') + '"' + open + '><summary>' + hl(label, q) + '</summary>'
      + (!isHeader && n.subject && (n.text_content || '').trim() ? '<div class="lc-card">' + hl(n.text_content.trim(), q) + '</div>' : '')
      + '<div class="lc-kids">' + inner + '</div></details>';
  }

  function categoriesHTML(q){
    var d = _data;
    var cats = (d.kids[d.root.id] || []).filter(function(k){ return !q || subtreeMatches(k.id, q); });
    if (!cats.length) return '<div class="lc-empty">Nothing matches.</div>';
    return cats.map(function(c){ return nodeHTML(c, q, true); }).join('');
  }

  function azHTML(q){
    var d = _data;
    var entries = [];
    Object.keys(d.byId).forEach(function(id){
      var n = d.byId[id];
      if (id === d.root.id) return;
      var parent = d.byId[n.cluster_id];
      if (parent && parent.id === d.root.id) return; // categories are buckets, not concepts
      // A concept filed inside another concept is its child (Larry, Oct 4
      // 2026): it shows under its parent, not as a second A-Z entry. Only
      // the primary concepts, the ones sitting directly in a category,
      // get their own place in the alphabet.
      var grand = parent && d.byId[parent.cluster_id];
      if (!grand || grand.id !== d.root.id) return;
      var hasHead = n.content_type === 'header' || (n.subject && n.subject.trim());
      if (!hasHead) return;                         // plain sentence cards belong to their concept
      if (q && !subtreeMatches(id, q)) return;
      entries.push(n);
    });
    if (!entries.length) return '<div class="lc-empty">Nothing matches.</div>';
    entries.sort(function(a, b){ return titleOf(a).toLowerCase().localeCompare(titleOf(b).toLowerCase()); });
    var html = ''; var last = '';
    entries.forEach(function(n){
      var t = titleOf(n);
      var letter = (t.charAt(0) || '#').toUpperCase();
      if (!/[A-Z]/.test(letter)) letter = '#';
      if (letter !== last) { html += '<div class="lc-letter">' + letter + '</div>'; last = letter; }
      html += nodeHTML(n, q, false);
    });
    return html;
  }

  function render(){
    var root = document.getElementById(ROOT_ID);
    if (!root || !_data) return;
    var q = _query.trim().toLowerCase();
    var body = root.querySelector('.lc-body');
    body.innerHTML = _view === 'az' ? azHTML(q) : categoriesHTML(q);
    root.querySelectorAll('.lc-tab').forEach(function(b){
      b.classList.toggle('on', b.dataset.view === _view);
    });
  }

  function close(){
    var root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e){ if (e.key === 'Escape') { e.stopPropagation(); close(); } }

  async function open(){
    if (!sb()) { return; }
    injectStyle();
    close();
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = ''
      + '<div class="lc-panel" role="dialog" aria-label="Concepts library">'
      +   '<div class="lc-top"><span class="lc-title">CONCEPTS</span><span class="lc-sub">Library &middot; read only</span>'
      +   '<button type="button" class="lc-x" title="Close" aria-label="Close">&#10005;</button></div>'
      +   '<div class="lc-bar"><input class="lc-search" type="search" placeholder="Search concepts" aria-label="Search concepts">'
      +   '<button type="button" class="lc-tab" data-view="categories">CATEGORIES</button>'
      +   '<button type="button" class="lc-tab" data-view="az">A-Z</button></div>'
      +   '<div class="lc-body"><div class="lc-empty">Loading&hellip;</div></div>'
      + '</div>';
    document.body.appendChild(root);
    root.addEventListener('mousedown', function(e){ if (e.target === root) close(); });
    root.querySelector('.lc-x').addEventListener('click', close);
    root.querySelector('.lc-search').addEventListener('input', function(e){ _query = e.target.value; render(); });
    root.querySelectorAll('.lc-tab').forEach(function(b){
      b.addEventListener('click', function(){ _view = b.dataset.view; render(); });
    });
    document.addEventListener('keydown', onKey, true);
    try {
      await load();
      render();
    } catch (err) {
      console.error('[library-concepts] failed to load:', err);
      var body = root.querySelector('.lc-body');
      if (body) body.innerHTML = '<div class="lc-empty">Concepts could not be loaded. Please sign in as a member and try again.</div>';
    }
  }

  window.T2TLibraryConcepts = { open: open, close: close, refresh: function(){ _data = null; } };
})();
