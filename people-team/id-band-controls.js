/* id-band-controls.js -- Sept 29 2026.
   ONE routine that makes every board's ID Band work. Larry: "a snippet of
   common code for all boards ... Our job is CONTENT & FLOW."

   Before this, the Blue Sky board, the Briefing Board and Sea of Ideas each
   carried their own copy of the same behavior: open the TOPIC pyramid, open
   the Board Type list and go where it says, RETURN, and lay the row out.
   Every fix had to be made three times, and one always got missed.

   What lives here (behavior and flow only -- no colors, sizes or fonts;
   styling stays with each board's own markup and CSS):
     - TOPIC: click opens the pyramid (TopicPyramid) -- ancestors above,
       current Topic, children below fetched a level at a time.
     - BOARD TYPE: the list comes from IDBand.BOARD_KINDS; picking one goes to
       that board on the same TOPIC and records where we came from.
     - RETURN: jumps back to the board recorded when we left.
     - ROW LAYOUT: IDBand.positionRow + observer + resize/font/profile hooks.
     - IDENTITY: organization + member name block (T2TMemberIdentity).

   What a board hands in (see mountControls):
     screenId        id of the board's screen element
     kind            'SEA' | 'IDEA' | 'PLAN' | 'BRIEFING BOARD'  (or fn -> kind)
     ids             the board's own element ids: idn, idnOrg, idnLogo, name,
                     topicWrap, topicTrigger, topicMenu, kindWrap, kindTrigger,
                     kindMenu, kindCaret, ret
     container/actions   header element / icon row (element, id, or fn)
     rowClass        CSS class for a Board Type menu row
     fitBaseSize     starting font size for the Board Type label
     getTopic()      -> {ancestors:[{id,name,priority}], current:{id,name,priority}}
                        (or a Promise of that, or null when there is no Topic)
     getChildren(id) -> Promise of [{id,name,priority}]
     goToTopic(id)   move this board to another Topic
     topicId()       the Topic id used when leaving for another board
     hideOrg()       true while TOPIC is MASTER (no organization shown)
     onPick(k)       optional: return true if the board handled that choice itself
     closeOthers(exceptId), prepareMenu(menu), onKindOpen()   optional hooks
     toast(msg)
   Returns {position, renderIdentity, closeMenus}.
*/
(function(){
  'use strict';
  if(!window.IDBand) return;

  function $(id){ return id ? document.getElementById(id) : null; }
  function el(v){ return typeof v==='function' ? v() : (typeof v==='string' ? (document.getElementById(v) || document.querySelector(v)) : v); }


  // ---- ONE TREE (Oct 11 2026) ---------------------------------------------
  // Larry: "TOPIC selector must always be the same on every ID BAND" -- the
  // full one tree (MASTER at the top, a caret on every row to open any topic or
  // subtopic), never a shortened path. Every board used to hand in its own
  // getTopic/getChildren, so the three menus could drift apart (the Plan board
  // showed only MASTER > Blue Sky with nothing to open). The tree is now read
  // here, once, from the same ideas.cluster_id chain for every board; a board
  // only says WHICH topic it is standing on (cfg.topicId). The board's own
  // getTopic/getChildren remain only as a fallback when this can't load.
  var TREE_RESERVED={'NEW':1,'New Additions':1,'Parking Lot':1,'COLLABORATOR':1,'STAKEHOLDER':1,'Purpose':1,'Trash':1,'Archived':1};
  var treeRows={};
  function treeSb(){ return window.T2T && window.T2T.sb; }
  async function treeRow(id){
    if(!id) return null;
    if(treeRows[id]) return treeRows[id];
    var sb=treeSb(); if(!sb) return null;
    var res=await sb.from('ideas').select('id,cluster_id,text_content,subject,priority').eq('id',id).maybeSingle();
    if(res.error || !res.data) return null;
    treeRows[id]=res.data;
    return res.data;
  }
  // Oct 17 2026 (Larry): the TOPIC list shows the SUBJECT only, or the content when there is no subject.
  function treeLabel(r){ return String((r && r.subject)||'').trim() || String((r && r.text_content)||'').trim(); }
  function treeNode(r){ return {id:r.id, name:treeLabel(r)||'(untitled)', priority:r.priority||''}; }
  async function treeTopic(id){
    var cur=await treeRow(id);
    if(!cur) return null;
    var chain=[], guard=0, pid=cur.cluster_id;
    while(pid && guard<50){
      guard++;
      var p=await treeRow(pid);
      if(!p) break;
      chain.unshift(treeNode(p));
      pid=p.cluster_id;
    }
    return {ancestors:chain, current:treeNode(cur)};
  }
  async function treeChildren(id){
    var sb=treeSb(); if(!sb) throw new Error('no connection');
    var res=await sb.from('ideas').select('id,cluster_id,text_content,subject,priority,sort_order,storyboard_kind,source_project_id').eq('cluster_id',id).eq('content_type','header').order('sort_order',{ascending:true});
    if(res.error) throw res.error;
    return (res.data||[]).filter(function(r){ return !TREE_RESERVED[r.text_content] && !(window.T2TPlan && T2TPlan.isContainer(r)); }).map(function(r){ treeRows[r.id]=r; return treeNode(r); });
  }

  // ---- ONE TOPIC LIST FOR EVERY ID BAND (Oct 15 2026) ----------------------
  // Larry: the card ID BAND showed "All Topics" while the board ID BAND showed
  // MASTER -- "They should all look like the board ID BAND and all the child
  // topics should default to closed unless the current topic is a child."
  // Every TOPIC list (boards, card backs, the NEW card, the MOVE picker) now
  // draws through this ONE routine: the real one tree from its MASTER row,
  // everything closed except the path down to the topic you are standing on.
  // opts: {topicId (where you are, may be null = MASTER), excludeId, hereId,
  //        onAdded(row, parentId)  -- the (+) at the bottom: the routine asks for a name and creates the topic, the caller says what happens next
  //        addParentId             -- optional id (or function -> id / Promise) of the parent the new topic goes under; default = the current topic
  //        onNavigate(id, isRoot, name), fallback()->{ancestors,current}}
  // Resolves to the current row element (for scrolling) or null.
  // The ONE way a topic is added from any TOPIC list (Oct 15 2026, Larry: the (+) must work the same everywhere).
  // Resolves to the new header row, or null if cancelled or it failed (the failure is shown).
  async function addTopicUnder(parentId, label){
    if(!window.T2TData || !window.T2TData.createHeader){ window.alert('Adding topics isn\u2019t available right now.'); return null; }
    var name=window.prompt(label || 'Name for the new topic:');
    if(!name || !name.trim()) return null;
    try{ return await window.T2TData.createHeader(name.trim(), parentId); }
    catch(err){ console.error('ID BAND: could not add topic', err); window.alert('Could not add the topic. ' + ((err && err.message) || '')); return null; }
  }
  window.IDBand.addTopicUnder = addTopicUnder;

  async function renderTopicTree(menu, opts){
    if(!window.TopicPyramid) return null;
    var t=null;
    try{ if(opts.topicId) t=await treeTopic(opts.topicId); }catch(e){}
    if(!t && opts.fallback){ try{ t=await opts.fallback(); }catch(e){} }
    if(!t){
      // No topic to stand on (or it did not load): start at the one tree's top row.
      var sb=treeSb(), root=null;
      if(sb){
        try{
          var q=await sb.from('ideas').select('id,cluster_id,text_content,subject,priority').is('cluster_id',null).eq('content_type','header').limit(1);
          if(q && q.data && q.data[0]){ treeRows[q.data[0].id]=q.data[0]; root=treeNode(q.data[0]); }
        }catch(e){}
      }
      if(!root) return null;
      t={ancestors:[], current:root};
    }
    var rootId=String((t.ancestors && t.ancestors.length ? t.ancestors[0] : t.current).id);
    var exclude=opts.excludeId!=null ? String(opts.excludeId) : null;
    return window.TopicPyramid.render(menu, {
      fullTree:true,
      ancestors:t.ancestors||[],
      current:t.current,
      hereId:opts.hereId ? String(opts.hereId) : null,
      getChildren:function(id){
        return treeChildren(id).then(function(kids){
          return exclude ? kids.filter(function(k){ return String(k.id)!==exclude; }) : kids;
        });
      },
      onAdd:opts.onAdded ? async function(pid){
        var parent=opts.addParentId!=null ? opts.addParentId : pid;
        if(typeof parent==='function') parent=await parent();
        if(!parent) return;
        var row=await addTopicUnder(parent, opts.addLabel);
        if(row) opts.onAdded(row, parent);
      } : null,
      onNavigate:function(id){
        // The MASTER row itself is where you are going from, never a place a card is filed.
        var isRoot=String(id)===rootId;
        if(opts.noRootPick && isRoot) return;
        var r=treeRows[id];
        var nm=isRoot ? 'MASTER' : (treeLabel(r) || (String(id)===String(t.current.id) ? t.current.name : '') || '(untitled)');
        if(opts.onNavigate) opts.onNavigate(id, isRoot, nm);
      }
    });
  }
  window.IDBand.renderTopicTree = renderTopicTree;

  function mountControls(cfg){
    var ids = cfg.ids || {};
    var GAP = cfg.gap || 10;

    function toast(msg){ if(cfg.toast) cfg.toast(msg); }
    function kindNow(){ return typeof cfg.kind==='function' ? cfg.kind() : cfg.kind; }
    function screenActive(){ var s=$(cfg.screenId); return !!(s && s.classList.contains('active')); }

    // ---- identity ----------------------------------------------------------
    function renderIdentity(extra){
      var hide = cfg.hideOrg ? !!cfg.hideOrg() : false;
      if(window.T2TMemberIdentity){
        window.T2TMemberIdentity.fill({wrap:ids.idn, org:ids.idnOrg, logo:ids.idnLogo, name:ids.name}, {hideOrg:hide, orgName:extra && extra.orgName});
        return;
      }
      var m = (window.T2T && window.T2T.getMember) ? window.T2T.getMember() : null;
      var n = $(ids.name);
      if(n && m && m.display_name) n.textContent = m.display_name.toUpperCase();
    }

    // ---- row layout --------------------------------------------------------
    function position(){
      var topicWrap=$(ids.topicWrap), kindWrap=$(ids.kindWrap);
      var idn=$(ids.idn), actions=el(cfg.actions), container=el(cfg.container);
      if(!topicWrap || !kindWrap || !actions || !container) return;
      window.IDBand.observeRow(cfg.screenId, position, [topicWrap, idn, actions, container]);
      window.IDBand.positionRow({
        container:container, actionsEl:actions, idnEl:idn, gap:GAP,
        fields:[topicWrap, kindWrap], fitLabelId:ids.kindTrigger, fitBaseSize:cfg.fitBaseSize || 36
      });
    }

    // ---- menus -------------------------------------------------------------
    function closeMenus(exceptId){
      [ids.topicMenu, ids.kindMenu].forEach(function(id){
        var m=$(id);
        if(m && id!==exceptId) m.hidden=true;
      });
    }
    function beforeOpen(menuId){
      closeMenus(menuId);
      if(cfg.closeOthers) cfg.closeOthers(menuId);
    }
    function placeMenu(menu, trigger, minWidth){
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      if(cfg.prepareMenu) cfg.prepareMenu(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(minWidth, r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8, window.innerWidth-8-mr.width)+'px';
    }

    // TOPIC -> pyramid
    function wireTopic(){
      var trigger=$(ids.topicTrigger), menu=$(ids.topicMenu);
      if(!trigger || !menu) return;
      var openSeq=0;
      function openPyramid(){
        var seq=++openSeq;
        var tid=cfg.topicId ? cfg.topicId() : null;
        renderTopicTree(menu, {
          topicId:tid,
          fallback:function(){ return cfg.getTopic ? cfg.getTopic() : null; },
          onAdded:function(row){
            if(cfg.onTopicAdded) cfg.onTopicAdded(row);
            menu.hidden=true; openPyramid();
          },
          onNavigate:function(id){
            menu.hidden=true;
            if(cfg.goToTopic && (!tid || String(id)!==String(tid))) cfg.goToTopic(id);
          }
        }).then(function(rowEl){
          if(seq!==openSeq) return;   // closed or re-opened while we waited
          if(!menu.firstChild) return;
          placeMenu(menu, trigger, 200);
          if(rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({block:'center'});
        });
      }
      trigger.addEventListener('click', function(e){
        e.stopPropagation();
        var willOpen=menu.hidden;
        beforeOpen(willOpen ? ids.topicMenu : null);
        if(!willOpen){ openSeq++; menu.hidden=true; return; }
        openPyramid();
      });
    }

    // BOARD TYPE -> go to that board on the same TOPIC
    function pick(k){
      if(cfg.onPick && cfg.onPick(k)===true) return;
      var here=kindNow();
      if(k.value===here) return;
      // NOTES -> the Notebook. It floats over whatever is showing and never
      // changes the screen, so there is no topic to carry and nothing to RETURN to.
      if(k.value==='NOTEBOOK'){
        if(window.NotebookOpen && window.NotebookOpen.open) window.NotebookOpen.open();
        else toast('The Notebook isn’t available right now.');
        return;
      }
      var topicId = cfg.topicId ? cfg.topicId() : null;
      if(!topicId){ toast('Open a topic first.'); return; }
      if(k.value==='CAST'){
        if(window.CastRoster) window.CastRoster.open(topicId);
        return;
      }
      window.IDBand.recordReturn(here, topicId);
      if(k.value==='SEA'){
        if(window.T2TShared) window.T2TShared.currentTopicId=topicId;
        if(window.T2TMedia && window.T2TMedia.openIdeaSession) window.T2TMedia.openIdeaSession();
        else toast('Sea of Ideas isn’t available right now.');
        return;
      }
      if(k.value==='BRIEFING BOARD'){
        if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(topicId);
        else if(window.T2T && window.T2T.nav) window.T2T.nav('s-briefing-board');
        return;
      }
      // Oct 14 2026: SHARE (shown as STORY) is a real board now, opened the same way as IDEA and PLAN.
      if((k.value==='IDEA' || k.value==='PLAN' || k.value==='SHARE') && window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind){
        Promise.resolve(window.T2TStoryboard.jumpToProjectKind(topicId, k.value)).then(function(ok){
          if(ok===false) toast('Could not open that board.');
        });
      }
    }

    function markActive(){
      var menu=$(ids.kindMenu), now=kindNow(), trig=$(ids.kindTrigger);
      var entry=window.IDBand.kindEntryFor(now), label=window.IDBand.boardName(now);
      if(trig && cfg.setTriggerLabel) trig.textContent=label;
      if(menu) Array.prototype.forEach.call(menu.querySelectorAll('[data-kind]'), function(r){
        r.classList.toggle('active', !!entry && r.getAttribute('data-kind')===entry.value);
      });
    }

    function wireKind(){
      var trigger=$(ids.kindTrigger), menu=$(ids.kindMenu);
      if(!trigger || !menu || !window.IDBand.BOARD_KINDS) return;
      menu.innerHTML='';
      window.IDBand.BOARD_KINDS.forEach(function(k){
        var row=document.createElement('div');
        row.className=cfg.rowClass;
        row.setAttribute('data-kind', k.value);
        row.textContent=k.label;
        row.addEventListener('click', function(e){
          e.stopPropagation();
          menu.hidden=true;
          pick(k);
        });
        menu.appendChild(row);
      });
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      markActive();
      trigger.onclick=function(e){
        e.stopPropagation();
        var willOpen=menu.hidden;
        beforeOpen(willOpen ? ids.kindMenu : null);
        if(willOpen){ markActive(); placeMenu(menu, trigger, 120); }
        else menu.hidden=true;
      };
      var caret=$(ids.kindCaret);
      if(caret) caret.onclick=function(e){ e.stopPropagation(); trigger.click(); };
    }

    // RETURN -> back to the board recorded when we left it
    function wireReturn(){
      var btn=$(ids.ret);
      if(!btn) return;
      btn.addEventListener('click', function(){
        if(!window.IDBand.jumpToRecorded()) toast('Nothing to return to yet');
      });
    }

    wireTopic();
    wireKind();
    wireReturn();
    document.addEventListener('click', function(){ closeMenus(null); });
    window.addEventListener('resize', function(){ if(screenActive()) position(); });
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ if(screenActive()) position(); });
    }
    window.addEventListener('t2t:member-loaded', function(){ renderIdentity(); });

    return { position:position, renderIdentity:renderIdentity, closeMenus:closeMenus, markActive:markActive };
  }

  window.IDBand.mountControls = mountControls;
})();
