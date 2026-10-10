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
    return typeof _bbCardsList==='function' && typeof _bbSaveLocal==='function' && typeof _bbUUID==='function';
  };

  // Create a NEW-column card from an Idea Input entry. opts: {task, subject, projectHeaderId}.
  // Returns {id} immediately (the save syncs in the background), or null if BB isn't loaded.
  BB.createNewCard=function(opts){
    if(!BB.isLoaded()) return null;
    opts=opts||{};
    var cards=_bbCardsList();
    var maxOrder=cards.filter(function(c){ return c.col==='new' && typeof c.sortOrder==='number'; })
      .reduce(function(m,c){ return Math.max(m,c.sortOrder); }, -1);
    var newCardId=_bbUUID();
    var projectHeaderId=opts.projectHeaderId||null;
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
    // ready resolves once the card is saved and tagged, so callers can refresh anything
    // that reads it back (e.g. the Blue Sky task marker).
    var ready=Promise.all(pending.concat([ (sync && sync.then) ? sync.catch(function(){}) : Promise.resolve() ]));
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
