// briefing-board-public-api.js -- Oct 10 2026 (Master BB card "Storyboard reaches into
// BB privates"). The Idea/Storyboard family (idea-capture.js, idea-storyboard-card-detail.js,
// idea-storyboard-navigation.js) used to call the Briefing Board's underscore-prefixed
// helpers directly -- they worked only because every file shares one global scope. This
// file is the Briefing Board's own front door: the handful of genuinely cross-family
// operations, exposed on window.T2TBriefingBoard. Storyboard-side code calls ONLY these,
// so a BB-side rename can no longer silently break a Storyboard screen -- change a private
// helper and this one file is the only place that has to follow.
// Loads after briefing-board.js (every helper below is defined by then; calls are lazy).
(function(){
  var BB=window.T2TBriefingBoard=window.T2TBriefingBoard||{};

  // Is the Briefing Board code loaded on this page at all?
  BB.isLoaded=function(){
    return typeof _bbUUID==='function' || !!(window.crypto && crypto.randomUUID);
  };

  // Is a Briefing Board currently open/initialised this session? Only then does the BB's own
  // whole-list save have a board to write to.
  function _live(){ return typeof _bbCurrentBoardId!=='undefined' && !!_bbCurrentBoardId; }

  // Narrow, BB-independent save (Oct 10 2026, Larry: "Added task but it disappeared"). The BB's own
  // save (_bbSaveLocal) silently does nothing until the BB screen has been opened once this
  // session, so a task entered from Blue Sky was lost. This writes the one card straight to
  // briefing_cards on the traveler's MASTER board instead. Resolves true/false.
  async function _insertDirect(card){
    try{
      var sb=window.T2T && window.T2T.sb; if(!sb) return false;
      var u=(await sb.auth.getUser()).data.user; if(!u) return false;
      var br=await sb.from('briefing_boards').select('id,name,user_id,created_at').eq('retired',false).order('created_at',{ascending:true});
      if(br.error || !br.data || !br.data.length) return false;
      var mine=br.data.filter(function(b){ return b.user_id===u.id; });
      var board=mine.filter(function(b){ return String(b.name||'').toUpperCase()==='MASTER'; })[0] || mine[0] || br.data[0];
      var mx=await sb.from('briefing_cards').select('sort_order').eq('board_id',board.id).eq('col','new').order('sort_order',{ascending:false,nullsFirst:false}).limit(1);
      var next=(mx.data && mx.data.length && typeof mx.data[0].sort_order==='number') ? mx.data[0].sort_order+1 : 0;
      var row={id:card.id, board_id:board.id, col:'new', task:card.task||'', subject:(card.subject||'').trim()||null,
               priority:'', reviewed_by:'Larry', archived:false, sort_order:next, project_header_id:card.projectHeaderId||null};
      var ins=await sb.from('briefing_cards').insert(row);
      if(ins.error){ console.error('NEW card (BB): direct save failed', ins.error); return false; }
      // Same rule as the BB's own add: if the BB's VIEW is filtered to exactly one person, the
      // new card is for that person -- otherwise the filter would hide it (no PRIMARY row yet).
      try{
        var f=JSON.parse(sessionStorage.getItem('bbViewFilterIds')||'[]');
        if(Array.isArray(f) && f.length===1){
          await sb.from('card_roles').insert({card_type:'briefing_card', card_id:card.id, role:'primary', is_primary:true, user_id:f[0], added_by:u.id});
        }
      }catch(e){ console.warn('NEW card (BB): could not assign to the active VIEW filter', e); }
      return true;
    }catch(e){ console.error('NEW card (BB): direct save failed', e); return false; }
  }

  // Create a NEW-column card from an Idea Input entry. opts: {task, subject, projectHeaderId}.
  // Returns {id, ready} immediately; ready resolves true once the card is really saved (and
  // tagged with its header), false if it could not be. Returns null only if there is no way to save.
  BB.createNewCard=function(opts){
    opts=opts||{};
    var projectHeaderId=opts.projectHeaderId||null;
    if(!_live()){
      var newId=(typeof _bbUUID==='function') ? _bbUUID() : (window.crypto&&crypto.randomUUID ? crypto.randomUUID() : null);
      if(!newId) return null;
      return {id:newId, ready:_insertDirect({id:newId, task:opts.task, subject:opts.subject, projectHeaderId:projectHeaderId})};
    }
    var cards=_bbCardsList();
    var maxOrder=cards.filter(function(c){ return c.col==='new' && typeof c.sortOrder==='number'; })
      .reduce(function(m,c){ return Math.max(m,c.sortOrder); }, -1);
    var newCardId=_bbUUID();
    cards.push({id:newCardId, col:'new', sortOrder:maxOrder+1, assigned:(typeof _bbToday==='function'?_bbToday():''),
      task:opts.task||'', subject:opts.subject||'', person:(typeof _bbCurrentBoardDefaultAssignee==='function'?_bbCurrentBoardDefaultAssignee():''),
      due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false,
      reviewedBy:(typeof REVIEWERS!=='undefined'?REVIEWERS[0]:''), archived:false, projectHeaderId:projectHeaderId});
    var sync=_bbSaveLocal(cards);
    var pending=[];
    function after(fn, label){
      var pr=(sync && sync.then) ? sync.then(fn).catch(function(e){ console.error('NEW card (BB): '+label, e); })
                                 : Promise.resolve().then(fn).catch(function(e){ console.error('NEW card (BB): '+label, e); });
      pending.push(pr);
    }
    if(projectHeaderId && typeof _bbStampCardProject==='function') after(function(){ return _bbStampCardProject(newCardId, projectHeaderId); }, 'could not tag project');
    if(typeof _bbAutoAssignToActiveFilter==='function') after(function(){ return _bbAutoAssignToActiveFilter(newCardId); }, 'could not auto-assign');
    if(typeof renderBoard==='function') renderBoard();
    var ready=Promise.all(pending.concat([ (sync && sync.then) ? sync.catch(function(){}) : Promise.resolve() ])).then(function(){ return true; });
    return {id:newCardId, ready:ready};
  };

  BB.hasCastPickMenu=function(){ return typeof _bbOpenCastPickMenu==='function'; };

  // The one shared CAST PICK list (same list the BB back-of-card head icon opens).
  // Returns false if the list isn't available on this page.
  BB.openCastPickMenu=function(menu, anchorEl, opts){
    if(typeof _bbOpenCastPickMenu!=='function') return false;
    _bbOpenCastPickMenu(menu, anchorEl, opts);
    return true;
  };

  // Paint a PRIMARY head/initials trigger for the given uid.
  BB.paintPrimaryTrigger=function(trigger, uid){
    if(typeof _bbPaintPrimaryTrigger!=='function') return Promise.resolve();
    return _bbPaintPrimaryTrigger(trigger, uid);
  };

  // H -> HH -> none style priority cycling; returns undefined if BB isn't loaded so
  // callers can fall back to their own copy.
  BB.nextPriority=function(current, base){
    if(typeof _bbNextPriority!=='function') return undefined;
    return _bbNextPriority(current, base);
  };
})();
