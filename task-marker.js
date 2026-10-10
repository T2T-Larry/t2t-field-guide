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
  var _byHeader={};               // headerId -> {n, assigned, doing, topPriority, cards:[]}
  var _loaded=false, _loading=null, _lastLoad=0;
  var TTL_MS=60*1000;

  function _sb(){ return window.T2T && window.T2T.sb; }

  var PRI_RANK={HH:6,H:5,MH:4,M:3,ML:2,L:1,'':0};

  async function _load(){
    var sb=_sb(); if(!sb) return;
    try{
      var res=await sb.from('briefing_cards')
        .select('id,project_header_id,col,priority,task,subject,sort_order')
        .not('project_header_id','is',null)
        .neq('archived',true)
        .is('trashed_at',null)
        .neq('col','done');
      if(res.error || !res.data) return;
      var cards=res.data, ids=cards.map(function(c){ return c.id; });
      var primaries={}, initialsByUid={};
      // card_roles in chunks (URL length) -- who holds PRIMARY on each task
      for(var i=0;i<ids.length;i+=100){
        var chunk=ids.slice(i,i+100);
        var r=await sb.from('card_roles').select('card_id,user_id')
          .eq('card_type','briefing_card').eq('role','primary').in('card_id',chunk);
        if(!r.error && r.data) r.data.forEach(function(x){ if(!primaries[x.card_id]) primaries[x.card_id]=x.user_id||true; });
      }
      // Initials of each assigned person (same people_by_ids lookup the card faces use)
      var uids=[]; Object.keys(primaries).forEach(function(k){ var u=primaries[k]; if(u!==true && uids.indexOf(u)<0) uids.push(u); });
      if(uids.length){
        try{
          var pr=await sb.rpc('people_by_ids',{p_ids:uids});
          if(!pr.error && pr.data) pr.data.forEach(function(m){ initialsByUid[m.user_id]=(m.initials||'').toUpperCase(); });
        }catch(e){}
      }
      var map={};
      cards.forEach(function(c){
        var m=map[c.project_header_id]||(map[c.project_header_id]={n:0,assigned:0,doing:0,topPriority:'',cards:[]});
        m.n++;
        m.cards.push({id:c.id, col:c.col, priority:c.priority||'', text:(c.subject||c.task||'(untitled task)'), order:c.sort_order, primary:!!primaries[c.id], initials:(primaries[c.id]&&primaries[c.id]!==true)?(initialsByUid[primaries[c.id]]||''):''});
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


  // ---- Popover list (Oct 10 2026, Larry: opening the BB was confusing -- back
  // landed on the wrong Blue Sky board. Now the marker just LISTS the tasks, each with
  // a flag for the BB column it sits in; clicking anywhere outside closes it and you
  // are still on the board you started from. Nothing navigates.)
  var COL_FLAG={ 'new':['NEW','#6b7a8d'], 'do-h':['H','#c0392b'], 'do-m':['M','#d4880f'], 'do-l':['L','#2e8b57'],
                 'doing':['DOING','#2a6fb0'], 'hangups':['HANG-UP','#8e44ad'], 'done':['DONE','#555'] };
  var _pop=null, _popFor=null, _offDown=null, _offKey=null;

  function _closePopover(){
    if(_pop && _pop.parentNode) _pop.parentNode.removeChild(_pop);
    _pop=null; _popFor=null;
    if(_offDown){ document.removeEventListener('mousedown', _offDown, true); _offDown=null; }
    if(_offKey){ document.removeEventListener('keydown', _offKey, true); _offKey=null; }
  }

  function _esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function _togglePopover(anchor, headerId){
    if(_pop && _popFor===headerId){ _closePopover(); return; }
    _closePopover();
    var m=_byHeader[headerId];
    if(!m || !m.n) return;
    var cards=m.cards.slice().sort(function(a,b){
      var ra=PRI_RANK[a.priority]||0, rb=PRI_RANK[b.priority]||0;
      if(ra!==rb) return rb-ra;
      return (a.order||0)-(b.order||0);
    });
    var box=document.createElement('div');
    box.className='sc-task-popover';
    box.style.cssText='position:fixed;z-index:100000;width:300px;max-width:calc(100vw - 24px);max-height:60vh;overflow:auto;box-sizing:border-box;background:#fff8e6;color:#2b2200;border:1.5px solid #e0a526;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.35);padding:8px 10px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1))';
    var html='<div style="font-weight:700;margin-bottom:6px;color:#7a5a00">'+m.n+(m.n===1?' task':' tasks')+' on this header</div>';
    cards.forEach(function(c){
      var f=COL_FLAG[c.col]||[String(c.col||'').toUpperCase(),'#555'];
      html+='<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid rgba(224,165,38,.35)">'
        +'<span title="Briefing Board column" style="flex:0 0 auto;min-width:44px;text-align:center;font-size:.78em;font-weight:700;color:#fff;background:'+f[1]+';border-radius:3px;padding:2px 4px;margin-top:1px">'+_esc(f[0])+'</span>'
        +'<span style="flex:1 1 auto;line-height:1.3;word-break:break-word">'+_esc(c.text)+'</span>'
        +(c.primary&&c.initials?'<span title="Assigned to" style="flex:0 0 auto;min-width:22px;text-align:center;font-size:.78em;font-weight:700;color:#3b2a00;background:#f3d27a;border-radius:11px;padding:2px 5px;margin-top:1px">'+_esc(c.initials)+'</span>':'')
        +'</div>';
    });
    box.innerHTML=html;
    document.body.appendChild(box);
    var r=anchor.getBoundingClientRect();
    var bw=box.offsetWidth, bh=box.offsetHeight;
    var left=Math.min(Math.max(12, r.left+r.width/2-bw/2), window.innerWidth-bw-12);
    var top=r.bottom+6;
    if(top+bh>window.innerHeight-12) top=Math.max(12, r.top-bh-6);
    box.style.left=left+'px'; box.style.top=top+'px';
    _pop=box; _popFor=headerId;
    // Click anywhere outside (or Esc) closes it. Capture phase + a swallowed click so the
    // outside click only closes the list and does not also open or drag something beneath.
    _offDown=function(e){
      if(_pop && _pop.contains(e.target)) return;
      if(anchor.contains(e.target)) return; // the marker's own click toggles it
      _closePopover();
    };
    _offKey=function(e){ if(e.key==='Escape'){ e.stopPropagation(); _closePopover(); } };
    document.addEventListener('mousedown', _offDown, true);
    document.addEventListener('keydown', _offKey, true);
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
      _togglePopover(el, headerId);
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
