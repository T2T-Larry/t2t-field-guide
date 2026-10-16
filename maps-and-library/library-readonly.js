/* library-readonly.js -- Oct 6 2026 (Master BB: CONCEPTS FOR MEMBERS)

   Larry: "no board changes shape" -- a member who clicks the brass Concepts button in the LIBRARY tray lands on
   the real Blue Sky board (same look, columns and A-Z button) showing the CONCEPTS tree, READ-ONLY.
   This replaces the stand-alone Concepts panel (library-concepts.js, removed).

   How it works
     open()      finds the CONCEPTS header under LIBRARY (rows readable through the ideas "library member read"
                 rule), marks the board as a Library view, and opens it with T2TMedia.openBoard.
     read-only   _sboardIsReadOnly() (idea-storyboard-shared.js) is true while that tree is on screen. Then:
                 - this file hides every editing control with CSS (add (+), gear, board-type switch, lasso move bar),
                 - blocks card dragging and the edit keyboard shortcuts,
                 - a double-click opens showCard() below (a plain reader; Notes are never shown) instead of the
                   editable card back,
                 - the board render skips every "ensure header" step so a member's visit creates nothing.
     The database still refuses every member write; none of this is the security, it only keeps the board honest. */
(function(){
  var STYLE_ID = 'sz-library-readonly-style';
  var CARD_ID = 'sz-library-card';
  var SCREEN = 's-sea-of-ideas-cluster';

  function sb(){ return window.T2T && window.T2T.sb; }

  function screenActive(){
    var el = document.getElementById(SCREEN);
    return !!(el && el.classList.contains('active'));
  }
  function readOnlyNow(){
    return screenActive() && typeof window._sboardIsReadOnly === 'function' ? window._sboardIsReadOnly() : false;
  }

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var scope = 'body.fg-readonly:has(#' + SCREEN + '.active) ';
    var css = ''
      + scope + '.t2t-add,' + scope + '.sc-add-subber-tile,' + scope + '#b-sc-gear,' + scope + '#sc-board-kind-trigger,' + scope + '#t2t-lasso-bar{display:none!important}'
      + '#' + CARD_ID + '{position:fixed;inset:0;z-index:100000;background:rgba(20,40,70,.5);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}'
      + '#' + CARD_ID + ' .lr-card{background:#fff;border:3px solid #1a3a5c;box-shadow:0 10px 40px rgba(0,0,0,.4);width:min(640px,100%);max-height:86vh;overflow:auto;padding:22px 26px;box-sizing:border-box;position:relative}'
      + '#' + CARD_ID + ' .lr-kind{font-size:11px;letter-spacing:3px;color:#5b7fa3;margin-bottom:8px}'
      + '#' + CARD_ID + ' .lr-title{font-family:"Playfair Display",serif;font-size:26px;font-weight:700;color:#1a3a5c;line-height:1.2;margin:0 0 12px}'
      + '#' + CARD_ID + ' .lr-body{font-size:16px;line-height:1.55;color:#1a3a5c;white-space:pre-wrap}'
      + '#' + CARD_ID + ' .lr-img{max-width:100%;margin-top:12px}'
      + '#' + CARD_ID + ' .lr-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:20px;cursor:pointer;color:#1a3a5c}';
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function toast(msg){
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#1a3a5c;color:#fff;padding:10px 18px;border-radius:8px;z-index:100001;font-size:14px';
    document.body.appendChild(t);
    setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  }

  /* The plain reader. Subject (if any) is the headline, text is the body. Notes are deliberately not shown. */
  function closeCard(){
    var el = document.getElementById(CARD_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.removeEventListener('keydown', onCardKey, true);
  }
  function onCardKey(e){ if (e.key === 'Escape') { e.stopPropagation(); closeCard(); } }

  function showCard(item){
    if (!item) return;
    injectStyle();
    closeCard();
    var subject = String(item.subject || '').trim();
    var text = String(item.text_content || '').trim();
    var title = subject || (item.content_type === 'header' ? text : '');
    var body = subject ? text : (item.content_type === 'header' ? '' : text);

    var ov = document.createElement('div');
    ov.id = CARD_ID;
    var card = document.createElement('div');
    card.className = 'lr-card';
    var x = document.createElement('button');
    x.className = 'lr-x'; x.textContent = '✕'; x.title = 'Close';
    x.addEventListener('click', closeCard);
    card.appendChild(x);
    var kind = document.createElement('div');
    kind.className = 'lr-kind';
    kind.textContent = item.content_type === 'header' ? 'HEADER' : 'CARD';
    card.appendChild(kind);
    if (title) { var h = document.createElement('h2'); h.className = 'lr-title'; h.textContent = title; card.appendChild(h); }
    if (body) { var b = document.createElement('div'); b.className = 'lr-body'; b.textContent = body; card.appendChild(b); }
    if (item.content_type === 'image' && item.image_url) {
      var im = document.createElement('img'); im.className = 'lr-img'; im.src = item.image_url; card.appendChild(im);
    }
    ov.appendChild(card);
    ov.addEventListener('click', function(e){ if (e.target === ov) closeCard(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', onCardKey, true);
  }

  /* Find the CONCEPTS header that sits directly under LIBRARY, then open the real board on it, read-only. */
  async function open(){
    try {
      injectStyle();
      var client = sb();
      if (!client || !window.T2TMedia || !window.T2TMedia.openBoard || !window.T2TShared) throw new Error('not ready');
      var libs = await client.from('ideas').select('id')
        .eq('library_shared', true).eq('content_type', 'header').ilike('text_content', 'library').limit(50);
      if (libs.error) throw libs.error;
      var libIds = (libs.data || []).map(function(r){ return r.id; });
      if (!libIds.length) throw new Error('Library is not shared with this account');
      var cands = await client.from('ideas').select('id')
        .eq('library_shared', true).eq('content_type', 'header').ilike('text_content', 'concepts').in('cluster_id', libIds).limit(5);
      if (cands.error) throw cands.error;
      var root = (cands.data || [])[0];
      if (!root) throw new Error('Concepts not found');
      var me = await client.auth.getUser();
      window.T2TShared._meId = (me && me.data && me.data.user) ? me.data.user.id : null;
      window.T2TShared._libraryNext = root.id;
      window.T2TMedia.openBoard(root.id, true);
    } catch (err) {
      console.error('[library-readonly] could not open Concepts:', err);
      toast('Concepts had trouble opening -- please try again.');
    }
  }

  /* Oct 10 2026 (Larry: "the LIBRARY is a filter"). Concepts carry a concept_group tag (PEOPLE, PLAN, VALUES ...) and may live
     under their home topics (CAST, TOOL SHED, T2T ...). In the Library view only, every tagged row whose parent is missing or is
     not itself a concept (that is, the top of a concept group) is shown as a child of the CONCEPTS root, so a member sees the same
     groups as before no matter where the rows really sit. Deeper rows keep their real parents, so each group's own structure is
     unchanged. This edits the in-memory row cache only; nothing is written to the database. */
  function overlay(rowsById){
    var S = window.T2TShared;
    if (!S || !S.libraryRootId || !rowsById) return;
    var root = S.libraryRootId;
    Object.keys(rowsById).forEach(function(id){
      var r = rowsById[id];
      if (!r || id === root || !r.concept_group) return;
      var p = r.cluster_id ? rowsById[r.cluster_id] : null;
      if (p && p.concept_group) return;          /* nested inside another concept: keeps its real parent */
      if (r.cluster_id !== root) r.cluster_id = root;
    });
  }

  /* No card dragging and no edit shortcuts while the board is read-only. */
  window.addEventListener('dragstart', function(e){
    if (readOnlyNow() && document.getElementById(SCREEN).contains(e.target)) e.preventDefault();
  }, true);
  window.addEventListener('keydown', function(e){
    if (!readOnlyNow()) return;
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    var k = e.key;
    if (e.altKey || e.ctrlKey || e.metaKey || k === 'Delete' || k === 'Backspace' || k === 'Tab' || k === 'Enter') {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  injectStyle();
  window.T2TLibraryView = { open: open, showCard: showCard, close: closeCard, overlay: overlay };
})();
