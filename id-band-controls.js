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

  function mountControls(cfg){
    var ids = cfg.ids || {};
    var GAP = cfg.gap || 10;

    function toast(msg){ if(cfg.toast) cfg.toast(msg); }
    function kindNow(){ return typeof cfg.kind==='function' ? cfg.kind() : cfg.kind; }
    function screenActive(){ var s=$(cfg.screenId); return !!(s && s.classList.contains('active')); }

    // ---- identity ----------------------------------------------------------
    function renderIdentity(){
      var hide = cfg.hideOrg ? !!cfg.hideOrg() : false;
      if(window.T2TMemberIdentity){
        window.T2TMemberIdentity.fill({wrap:ids.idn, org:ids.idnOrg, logo:ids.idnLogo, name:ids.name}, {hideOrg:hide});
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
      trigger.addEventListener('click', function(e){
        e.stopPropagation();
        var willOpen=menu.hidden;
        beforeOpen(willOpen ? ids.topicMenu : null);
        if(!willOpen){ menu.hidden=true; return; }
        Promise.resolve(cfg.getTopic ? cfg.getTopic() : null).then(function(t){
          if(!t || !t.current || !window.TopicPyramid) return;
          if(!menu.hidden) return;     // opened/closed again while we waited
          var rowEl=window.TopicPyramid.render(menu, {
            ancestors:t.ancestors || [],
            current:t.current,
            getChildren:cfg.getChildren,
            onNavigate:function(id){
              menu.hidden=true;
              if(String(id)!==String(t.current.id) && cfg.goToTopic) cfg.goToTopic(id);
            }
          });
          placeMenu(menu, trigger, 200);
          if(rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({block:'center'});
        });
      });
    }

    // BOARD TYPE -> go to that board on the same TOPIC
    function pick(k){
      if(cfg.onPick && cfg.onPick(k)===true) return;
      var here=kindNow();
      if(k.value===here) return;
      if(k.value==='SHARE'){ toast(k.soon || 'Coming soon'); return; }
      var topicId = cfg.topicId ? cfg.topicId() : null;
      if(!topicId){ toast('Open a project first.'); return; }
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
      if((k.value==='IDEA' || k.value==='PLAN') && window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind){
        Promise.resolve(window.T2TStoryboard.jumpToProjectKind(topicId, k.value)).then(function(ok){
          if(ok===false) toast('Could not open that board.');
        });
      }
    }

    function markActive(){
      var menu=$(ids.kindMenu), now=kindNow(), trig=$(ids.kindTrigger);
      var kinds=window.IDBand.BOARD_KINDS, label=now;
      kinds.forEach(function(k){ if(k.value===now) label=k.label; });
      if(trig && cfg.setTriggerLabel) trig.textContent=label;
      if(menu) Array.prototype.forEach.call(menu.querySelectorAll('[data-kind]'), function(r){
        r.classList.toggle('active', r.getAttribute('data-kind')===now);
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
    window.addEventListener('t2t:member-loaded', renderIdentity);

    return { position:position, renderIdentity:renderIdentity, closeMenus:closeMenus, markActive:markActive };
  }

  window.IDBand.mountControls = mountControls;
})();
