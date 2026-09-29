/* sea-id-band.js -- Sept 29 2026.
   Larry: "ALL boards should have exactly the same ID BAND. SEA OF IDEAS
   does not." Sea of Ideas (screen 1014, session.js) still carried its own
   pre-ID-Band header -- Project / Parent / Topic / View boxes -- while the
   Blue Sky board and the Briefing Board share one band: an identity block
   top-left, TOPIC and Board Type as a centered pair, and an icon row top-right.

   This file gives Sea of Ideas that same band. It does not invent a look:
     - markup uses the Blue Sky board's own classes (sc-idn, sc-mh-group-*,
       sc-cdrop-*, sc-hdr-side), and idea-storyboard-screens.js's CSS now
       lists this board's isx-* ids beside the sc-* ones, so both bands read
       one set of rules;
     - the row geometry is IDBand.positionRow / observeRow (id-band.js);
     - the Board Type list is IDBand.BOARD_KINDS (id-band.js);
     - the TOPIC dropdown is TopicPyramid (topic-pyramid.js), the same
       ancestors-above / children-below pyramid the other boards open.
   What is specific to this board -- where TOPIC comes from (T2TShared.isxPath)
   and how to move to another Topic -- is handed in by session.js via init().

   Not here on purpose: Project, Parent and View. Sea of Ideas is for
   capturing every kind of idea, so nothing on it needs them.

   Public API: window.T2TSeaIdBand -- init(hooks), render(), position().
   hooks: {labelFor(entry), goToTopic(id), fetchRow(id), toast(msg)}
*/
(function(){
  'use strict';

  var SCREEN_ID = 's-idea-session';
  var GAP = 10;                 // same SC_ID_BAND_GAP the Blue Sky board uses
  var hooks = {};
  var wired = false;

  function $(id){ return document.getElementById(id); }
  function path(){ return (window.T2TShared && window.T2TShared.isxPath) || []; }
  function cur(){ var p = path(); return p.length ? p[p.length-1] : null; }
  function label(entry){ return hooks.labelFor ? hooks.labelFor(entry) : (entry ? entry.text : ''); }
  function toast(msg){ if (hooks.toast) hooks.toast(msg); }

  // ---- render ------------------------------------------------------------

  // Top-left identity block: organization + member name, via the same shared
  // member-identity.js the other boards use. The org line stays hidden while
  // TOPIC is MASTER (Larry, Sept 20 2026: MASTER lists include every org, so
  // none is named there).
  function renderIdentity(){
    var p = path();
    var atMaster = p.length === 1 && label(p[0]) === 'MASTER';
    if (window.T2TMemberIdentity){
      window.T2TMemberIdentity.fill({wrap:'isx-idn', org:'isx-idn-org', name:'isx-traveler-name'}, {hideOrg:atMaster});
      return;
    }
    var m = (window.T2T && window.T2T.getMember) ? window.T2T.getMember() : null;
    var el = $('isx-traveler-name');
    if (el && m && m.display_name) el.textContent = m.display_name.toUpperCase();
  }

  function renderTopic(){
    var box = $('isx-topic-box'), text = $('isx-topic-text');
    if (!box || !text) return;
    var e = cur();
    text.textContent = e ? label(e) : 'MASTER';
    box.style.background = '';
    // TOPIC takes its card's own color, same as the Blue Sky board's TOPIC box.
    if (e && e.id && hooks.fetchRow){
      var wanted = e.id;
      hooks.fetchRow(wanted).then(function(row){
        var now = cur();
        if (row && now && String(now.id) === String(wanted)) box.style.background = row.color || '';
      });
    }
    if (window.FGFitBoxTextOneLine) window.FGFitBoxTextOneLine(box, text);
  }

  // Centers TOPIC + Board Type as one group between the identity block and
  // the icon row -- the shared implementation, same call the other boards make.
  function position(){
    var topicWrap = $('isx-topic-wrap'), kindWrap = $('isx-boardkind-wrap');
    var idn = $('isx-idn'), actions = $('isx-hdr-side'), container = $('isx-header-area');
    if (!topicWrap || !kindWrap || !actions || !container || !window.IDBand) return;
    window.IDBand.observeRow(SCREEN_ID, position, [topicWrap, idn, actions, container]);
    window.IDBand.positionRow({
      container:container, actionsEl:actions, idnEl:idn, gap:GAP,
      fields:[topicWrap, kindWrap], fitLabelId:'isx-board-kind-trigger', fitBaseSize:36
    });
  }

  function render(){
    renderIdentity();
    renderTopic();
    position();
    // Fonts and the member profile can land after the first pass.
    if (window.requestAnimationFrame) window.requestAnimationFrame(position);
    setTimeout(position, 120);
  }

  // ---- dropdowns ---------------------------------------------------------

  function closeMenus(exceptId){
    ['isx-topic-menu', 'isx-board-kind-menu'].forEach(function(id){
      var m = $(id);
      if (m && id !== exceptId) m.hidden = true;
    });
  }

  function openMenuAt(menu, trigger, minWidth){
    var r = trigger.getBoundingClientRect();
    menu.style.left = r.left + 'px';
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.minWidth = Math.max(minWidth, r.width) + 'px';
    menu.hidden = false;
    var mr = menu.getBoundingClientRect();
    if (mr.right > window.innerWidth - 8) menu.style.left = Math.max(8, window.innerWidth - 8 - mr.width) + 'px';
  }

  // TOPIC: click opens the pyramid -- ancestors above (from this board's own
  // path), the current Topic, its children below (fetched a level at a time).
  function wireTopic(){
    var box = $('isx-topic-box'), menu = $('isx-topic-menu');
    if (!box || !menu) return;
    box.addEventListener('click', function(e){
      e.stopPropagation();
      var willOpen = menu.hidden;
      closeMenus(willOpen ? 'isx-topic-menu' : null);
      if (!willOpen){ menu.hidden = true; return; }
      var here = cur();
      if (!here || !window.TopicPyramid || !window.T2TData || !window.T2TData.activeChildHeaders) return;
      if (menu.parentElement !== document.body) document.body.appendChild(menu);
      var p = path();
      var currentRow = window.TopicPyramid.render(menu, {
        ancestors: p.slice(0, -1).map(function(a){ return {id:a.id, name:label(a), priority:''}; }),
        current: {id:here.id, name:label(here), priority:''},
        getChildren: function(id){
          return window.T2TData.activeChildHeaders(id).then(function(rows){
            return (rows || []).map(function(r){ return {id:r.id, name:r.text_content || '(untitled)', priority:r.priority || ''}; });
          });
        },
        onNavigate: function(id){
          menu.hidden = true;
          if (String(id) !== String(here.id) && hooks.goToTopic) hooks.goToTopic(id);
        }
      });
      openMenuAt(menu, box, 200);
      if (currentRow && currentRow.scrollIntoView) currentRow.scrollIntoView({block:'center'});
    });
  }

  // Board Type: same list, same order, same destinations as the other boards.
  // Picking another board records where we came from, so that board's RETURN
  // button brings you back here.
  function pickKind(k){
    var e = cur(), topicId = e ? e.id : null;
    if (k.value === 'SEA') return;   // already here
    if (k.value === 'SHARE'){ toast(k.soon || 'Coming soon'); return; }
    if (!topicId){ toast('Open a project first.'); return; }
    if (k.value === 'CAST'){
      if (window.CastRoster) window.CastRoster.open(topicId);
      return;
    }
    window.IDBand.recordReturn('SEA', topicId);
    if (k.value === 'BRIEFING BOARD'){
      if (window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(topicId);
      else if (window.T2T && window.T2T.nav) window.T2T.nav('s-briefing-board');
      return;
    }
    if ((k.value === 'IDEA' || k.value === 'PLAN') && window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind){
      Promise.resolve(window.T2TStoryboard.jumpToProjectKind(topicId, k.value)).then(function(ok){
        if (ok === false) toast('Could not open that board.');
      });
    }
  }

  function wireBoardKind(){
    var trigger = $('isx-board-kind-trigger'), menu = $('isx-board-kind-menu');
    if (!trigger || !menu || !window.IDBand || !window.IDBand.BOARD_KINDS) return;
    menu.innerHTML = '';
    window.IDBand.BOARD_KINDS.forEach(function(k){
      var row = document.createElement('div');
      row.className = 'sc-cdrop-row' + (k.value === 'SEA' ? ' active' : '');
      row.setAttribute('data-kind', k.value);
      row.textContent = k.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden = true;
        pickKind(k);
      });
      menu.appendChild(row);
    });
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      var willOpen = menu.hidden;
      closeMenus(willOpen ? 'isx-board-kind-menu' : null);
      if (willOpen) openMenuAt(menu, trigger, 120); else menu.hidden = true;
    });
  }

  function wireReturn(){
    var btn = $('isx-return');
    if (!btn) return;
    btn.addEventListener('click', function(){
      if (!window.IDBand.jumpToRecorded()) toast('Nothing to return to yet');
    });
  }

  // ---- setup -------------------------------------------------------------

  function init(h){
    hooks = h || hooks;
    if (wired) return;
    wired = true;
    wireTopic();
    wireBoardKind();
    wireReturn();
    document.addEventListener('click', function(){ closeMenus(null); });
    window.addEventListener('resize', function(){
      var s = $(SCREEN_ID);
      if (s && s.classList.contains('active')) position();
    });
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        var s = $(SCREEN_ID);
        if (s && s.classList.contains('active')) position();
      });
    }
    // The member profile can finish loading after this board is already up.
    window.addEventListener('t2t:member-loaded', renderIdentity);
  }

  window.T2TSeaIdBand = { init: init, render: render, position: position };
})();
