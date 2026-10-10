// task-marker.js -- Oct 10 2026 (Master BB card "MERGE BB INTO ONE TREE", step 2).
// The first, read-only step of folding the Briefing Board into the one Blue Sky tree:
// a small marker at the bottom of any Blue Sky header that has Briefing Board tasks
// pointing at it (briefing_cards.project_header_id = the header, i.e. the ID Band
// TOPIC). It reads only; nothing here writes to the BB or to the ideas table, and the
// BB keeps running exactly as before. Clicking the marker opens the BB filtered to
// that header's topic.
//
// Color: a task that has a PRIMARY (card_roles role='primary') paints the marker in
// the "task with a PRIMARY" amber; a header whose tasks are all unassigned paints it
// a muted gray-amber, so action columns stand out the way the HOA-meeting notes did.
//
// Public surface: window.T2TTaskMarker
//   .makeTile(headerId, width) -> element (hidden until tasks are known)
//   .refresh()                 -> reloads the task map and repaints every marker
//   .countFor(headerId)        -> number of active tasks on that header
(function(){
  var AMBER_ASSIGNED='#e0a526';   // task(s) with a PRIMARY
  var AMBER_UNASSIGNED='#bfae86'; // task(s), nobody PRIMARY yet
  var _byHeader={};               // headerId -> {n, assigned, doing, topPriority}
  var _loaded=false, _loading=null, _lastLoad=0;
  var TTL_MS=60*1000;

  function _sb(){ return window.T2T && window.T2T.sb; }

  var PRI_RANK={HH:6,H:5,MH:4,M:3,ML:2,L:1,'':0};

  async function _load(){
    var sb=_sb(); if(!sb) return;
    try{
      var res=await sb.from('briefing_cards')
        .select('id,project_header_id,col,priority')
        .not('project_header_id','is',null)
        .neq('archived',true)
        .is('trashed_at',null)
        .neq('col','done');
      if(res.error || !res.data) return;
      var cards=res.data, ids=cards.map(function(c){ return c.id; });
      var primaries={};
      // card_roles in chunks (URL length) -- who holds PRIMARY on each task
      for(var i=0;i<ids.length;i+=100){
        var chunk=ids.slice(i,i+100);
        var r=await sb.from('card_roles').select('card_id')
          .eq('card_type','briefing_card').eq('role','primary').in('card_id',chunk);
        if(!r.error && r.data) r.data.forEach(function(x){ primaries[x.card_id]=true; });
      }
      var map={};
      cards.forEach(function(c){
        var m=map[c.project_header_id]||(map[c.project_header_id]={n:0,assigned:0,doing:0,topPriority:''});
        m.n++;
        if(primaries[c.id]) m.assigned++;
        if(c.col==='doing') m.doing++;
        if((PRI_RANK[c.priority||'']||0)>(PRI_RANK[m.topPriority]||0)) m.topPriority=c.priority||'';
      });
      _byHeader=map; _loaded=true; _lastLoad=Date.now();
    }catch(e){ console.error('T2TTaskMarker: could not load tasks', e); }
  }

  function _label(m){
    var t=m.n+(m.n===1?' task':' tasks');
    if(m.doing) t+=' · '+m.doing+' doing';
    return t;
  }

  function _paint(el){
    var id=el.getAttribute('data-task-marker');
    var m=_byHeader[id];
    if(!m || !m.n){ el.style.display='none'; return; }
    el.style.display='flex';
    el.style.background=m.assigned?AMBER_ASSIGNED:AMBER_UNASSIGNED;
    var span=el.querySelector('.tm-label');
    if(span) span.textContent=_label(m);
    var tip=m.n+' Briefing Board '+(m.n===1?'task':'tasks')+' on this header';
    if(m.assigned) tip+=' ('+m.assigned+' with a PRIMARY)';
    tip+=' — click to open them on the Briefing Board';
    el.title=tip;
  }

  function paintAll(root){
    (root||document).querySelectorAll('[data-task-marker]').forEach(_paint);
  }

  async function refresh(force){
    if(_loading) return _loading;
    if(!force && _loaded && (Date.now()-_lastLoad)<TTL_MS){ paintAll(); return; }
    _loading=_load().then(function(){ _loading=null; paintAll(); }, function(){ _loading=null; });
    return _loading;
  }

  function makeTile(headerId, width){
    var el=document.createElement('button');
    el.type='button';
    el.className='sc-task-marker';
    el.setAttribute('data-task-marker', headerId);
    el.style.cssText='display:none;flex-shrink:0;width:'+Math.max(60,(width||120)-24)+'px;margin:3px 0;padding:4px 8px;box-sizing:border-box;align-items:center;justify-content:center;gap:5px;border:none;border-radius:4px;color:#3b2a00;font-family:inherit;font-weight:700;font-size:calc(11px * var(--fg-text-scale,1));cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.25)';
    el.innerHTML='<span aria-hidden="true">▣</span><span class="tm-label"></span>';
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(headerId);
    });
    // Paint right away if tasks are already known; otherwise the load below paints it.
    if(_loaded) _paint(el); else refresh();
    return el;
  }

  window.T2TTaskMarker={
    makeTile: makeTile,
    refresh: function(){ return refresh(true); },
    paintAll: paintAll,
    countFor: function(headerId){ var m=_byHeader[headerId]; return m?m.n:0; }
  };
})();
