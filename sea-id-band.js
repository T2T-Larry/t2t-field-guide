/* sea-id-band.js -- Sept 29 2026.
   Larry: "ALL boards should have exactly the same ID BAND. SEA OF IDEAS
   does not." Sea of Ideas (screen 1014, session.js) still carried its own
   pre-ID-Band header -- Project / Parent / Topic / View boxes -- while the
   Blue Sky board and the Briefing Board share one band: an identity block
   top-left, TOPIC and Board Type as a centered pair, and an icon row top-right.

   This file hands Sea of Ideas' own facts to the shared routine
   (id-band-controls.js, IDBand.mountControls), which does the behavior.
   It does not invent a look:
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

  var hooks = {};
  var ctl = null;

  function $(id){ return document.getElementById(id); }
  function path(){ return (window.T2TShared && window.T2TShared.isxPath) || []; }
  function cur(){ var p = path(); return p.length ? p[p.length-1] : null; }
  function label(entry){ return hooks.labelFor ? hooks.labelFor(entry) : (entry ? entry.text : ''); }
  function atMaster(){ var p = path(); return p.length === 1 && label(p[0]) === 'MASTER'; }

  // TOPIC's text and its card color -- the one part of the band that is this
  // board's own content.
  function renderTopic(){
    var box = $('isx-topic-box'), text = $('isx-topic-text');
    if (!box || !text) return;
    var e = cur();
    text.textContent = e ? label(e) : 'MASTER';
    box.style.background = '';
    if (e && e.id && hooks.fetchRow){
      var wanted = e.id;
      hooks.fetchRow(wanted).then(function(row){
        var now = cur();
        if (row && now && String(now.id) === String(wanted)) box.style.background = row.color || '';
      });
    }
    if (window.FGFitBoxTextOneLine) window.FGFitBoxTextOneLine(box, text);
  }

  // Organization = the checkbox on the back of a card, inherited down the tree:
  // walk from the current Topic up to the first card that has it checked.
  // No card checked -> no organization line (a personal project like Wish Tank
  // must not show T2T).
  var orgSeq = 0;
  function renderOrg(){
    var seq = ++orgSeq, p = path().slice();
    if (!hooks.fetchRow || !p.length){ ctl.renderIdentity(); return; }
    ctl.renderIdentity();          // name at once; the org line joins when found
    (async function(){
      for (var i = p.length - 1; i >= 0; i--){
        var row = await hooks.fetchRow(p[i].id);
        if (seq !== orgSeq) return;
        if (row && row.adds_org){ ctl.renderIdentity({orgName: row.org_name || ''}); return; }
      }
    })();
  }

  function render(){
    if (!ctl) return;
    renderOrg();
    renderTopic();
    ctl.position();
    // Fonts and the member profile can land after the first pass.
    if (window.requestAnimationFrame) window.requestAnimationFrame(ctl.position);
    setTimeout(ctl.position, 120);
  }

  function init(h){
    hooks = h || hooks;
    if (ctl) return;
    ctl = window.IDBand.mountControls({
      screenId:'s-idea-session',
      kind:'SEA',
      rowClass:'sc-cdrop-row',
      fitBaseSize:36,
      container:'isx-header-area',
      actions:'isx-hdr-side',
      ids:{idn:'isx-idn', idnOrg:'isx-idn-org', name:'isx-traveler-name',
           topicWrap:'isx-topic-wrap', topicTrigger:'isx-topic-box', topicMenu:'isx-topic-menu',
           kindWrap:'isx-boardkind-wrap', kindTrigger:'isx-board-kind-trigger', kindMenu:'isx-board-kind-menu',
           ret:'isx-return'},
      hideOrg:atMaster,
      topicId:function(){ var e = cur(); return e ? e.id : null; },
      getTopic:function(){
        var here = cur();
        if (!here) return null;
        return {
          ancestors:path().slice(0, -1).map(function(a){ return {id:a.id, name:label(a), priority:''}; }),
          current:{id:here.id, name:label(here), priority:''}
        };
      },
      getChildren:function(id){
        return window.T2TData.activeChildHeaders(id).then(function(rows){
          return (rows || []).map(function(r){ return {id:r.id, name:r.text_content || '(untitled)', priority:r.priority || ''}; });
        });
      },
      goToTopic:function(id){ if (hooks.goToTopic) hooks.goToTopic(id); },
      toast:function(msg){ if (hooks.toast) hooks.toast(msg); }
    });
  }

  window.T2TSeaIdBand = { init: init, render: render, position: function(){ if (ctl) ctl.position(); } };
})();
