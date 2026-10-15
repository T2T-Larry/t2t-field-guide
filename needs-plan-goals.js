// needs-plan-goals.js -- Oct 15 2026 (Larry: NEEDS PLAN cards are the GOALs of their plans).
// A Briefing Board card flagged NEEDS PLAN is read from briefing_cards (same card, never a copy) and drawn as a tile:
//   - in the PLAN board's Parking Lot while it has no plan header yet  (pink NEEDS PLAN badge), and
//   - at the top of its plan header's column once filed there          (GOAL badge).
// Filing = drag the tile onto a header (sets task_fields.goal_header_id), onto open board space (creates a plan header
// named after the task, tagged to the task's topic, and files the card there), or back onto the Parking Lot (clears it).
// The task row itself never moves: its home topic and BB column are untouched.
// Public surface: window.T2TNeedsPlanGoals.fill(hostEl, sourceTopicId, tileW)  -- Parking Lot
//                 window.T2TNeedsPlanGoals.fillHeader(hostEl, headerId, tileW)  -- a plan header's column
(function(){
  var MIME='text/plain', PREFIX='np-goal:';
  function _sb(){ return window.T2T && window.T2T.sb; }
  function _rows(){ return (typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById : {}; }
  function _within(headerId, sourceId){
    var byId=_rows(), cur=headerId, guard=0;
    while(cur && guard++<60){
      if(String(cur)===String(sourceId)) return true;
      var r=byId[cur]; cur=r ? r.cluster_id : null;
    }
    return false;
  }
  async function _load(){
    var sb=_sb(); if(!sb) return [];
    var res=await sb.from('briefing_cards').select('id,project_header_id,col,subject,task,goal_header_id')
      .or('needs_plan.eq.true,goal_header_id.not.is.null').neq('archived', true).is('trashed_at', null).neq('col','done');
    if(res.error || !res.data) return [];
    var cards=res.data, prim={}, init={};
    try{
      var rr=await sb.from('card_roles').select('card_id,user_id').eq('card_type','briefing_card').eq('role','primary').in('card_id', cards.map(function(c){ return c.id; }));
      if(rr.data) rr.data.forEach(function(x){ prim[x.card_id]=x.user_id; });
      var uids=Object.keys(prim).map(function(k){ return prim[k]; }).filter(function(u,i,a){ return u && a.indexOf(u)===i; });
      if(uids.length){
        var pr=await sb.rpc('people_by_ids', {p_ids: uids});
        if(pr.data) pr.data.forEach(function(m){ init[m.user_id]=(m.initials||'').toUpperCase(); });
      }
    }catch(e){}
    cards.forEach(function(c){ c.initials=init[prim[c.id]]||''; });
    return cards;
  }
  function _tile(c, tileW, isGoal){
    var t=document.createElement('div');
    t.className='np-goal-tile';
    t.setAttribute('draggable','true');
    t.setAttribute('data-np-card', c.id);
    t.title=isGoal ? 'GOAL of this plan (Briefing Board card, same card). Click to open its card back. Drag to the Parking Lot to unfile.' : 'NEEDS PLAN (Briefing Board card, same card). Click to open its card back. Drag onto a header to make it that plan\'s GOAL, or onto open space to start a new plan.';
    t.style.cssText='width:'+tileW+'px;box-sizing:border-box;border-radius:8px;background:rgba(255,255,255,.92);cursor:grab;padding:6px 8px 8px;font-size:13px;line-height:1.25;color:#222;text-align:left;'
      +(isGoal ? 'box-shadow:inset 0 3px 0 rgba(13,148,136,.7),0 2px 6px rgba(0,0,0,.25)' : 'box-shadow:inset 0 3px 0 rgba(236,72,153,.6),0 2px 6px rgba(0,0,0,.25)');
    t.addEventListener('dragstart', function(e){ e.dataTransfer.setData(MIME, PREFIX+c.id); e.dataTransfer.effectAllowed='move'; e.stopPropagation(); });
    // Oct 15 2026 (Larry: these are BB cards, but on the PLAN board they could not be opened, so the ID BAND was
    // out of reach). A click opens the card's back -- the Briefing Card, same card -- using the same by-id handoff
    // the Blue Sky "also on the Briefing Board" list uses (briefing-board-master.js consumes fg_open_card_id).
    // A drag never fires a click, so filing a tile is unaffected.
    t.addEventListener('click', function(e){
      e.stopPropagation();
      try{
        sessionStorage.setItem('bp_target','4010');
        sessionStorage.setItem('fg_open_card_id', c.id);
      }catch(x){}
      window.open(location.pathname+location.search, '_blank');
    });
    var eb=document.createElement('div');
    eb.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px';
    var b=document.createElement('span');
    b.textContent=isGoal ? 'GOAL' : 'NEEDS PLAN';
    b.style.cssText='font-size:10px;font-weight:800;letter-spacing:.06em;border-radius:4px;padding:1px 5px;'
      +(isGoal ? 'color:#115e59;background:rgba(13,148,136,.25);border:1px solid rgba(13,148,136,.7)' : 'color:#9d174d;background:rgba(236,72,153,.28);border:1px solid rgba(236,72,153,.6)');
    eb.appendChild(b);
    if(c.initials){ var w=document.createElement('span'); w.textContent=c.initials; w.style.cssText='font-size:11px;font-weight:700;color:#555'; eb.appendChild(w); }
    t.appendChild(eb);
    var tx=document.createElement('div'); tx.textContent=c.subject||c.task||'(untitled task)'; t.appendChild(tx);
    return t;
  }
  async function fill(host, sourceId, tileW){
    if(!host || !sourceId) return;
    var cards=(await _load()).filter(function(c){ return !c.goal_header_id && c.project_header_id && _within(c.project_header_id, sourceId); });
    host.innerHTML='';
    cards.forEach(function(c){ host.appendChild(_tile(c, tileW, false)); });
  }
  async function fillHeader(host, headerId, tileW){
    if(!host || !headerId) return;
    var cards=(await _load()).filter(function(c){ return String(c.goal_header_id)===String(headerId); });
    host.innerHTML='';
    cards.forEach(function(c){ host.appendChild(_tile(c, tileW, true)); });
  }
  async function _setGoal(cardId, headerId){
    var r=await _sb().from('task_fields').update({goal_header_id: headerId||null}).eq('idea_id', cardId).select('idea_id');
    if(r.error || !r.data || !r.data.length) throw new Error((r.error&&r.error.message)||'Save was blocked -- nothing changed.');
  }
  async function _newPlanHeader(cardId){
    var sb=_sb();
    var c=(await _load()).filter(function(x){ return x.id===cardId; })[0];
    if(!c) throw new Error('Card not found');
    var u=await sb.auth.getUser(); var uid=u && u.data && u.data.user && u.data.user.id;
    var ins=await sb.from('ideas').insert({user_id:uid, content_type:'header', text_content:(c.subject||c.task||'New plan'), cluster_id:T2TShared.currentTopicId, source_project_id:c.project_header_id||null, created_at:new Date().toISOString(), color:(window.T2T && T2T.getDefaultHeaderColor ? T2T.getDefaultHeaderColor() : undefined)}).select().single();
    if(ins.error) throw ins.error;
    return ins.data.id;
  }
  function _redraw(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); }
  function _cardIdFrom(e){ var raw=''; try{ raw=e.dataTransfer.getData(MIME)||''; }catch(x){} return raw.indexOf(PREFIX)===0 ? raw.slice(PREFIX.length) : null; }
  function _isDrag(e){ try{ return Array.prototype.indexOf.call(e.dataTransfer.types||[], MIME)>=0; }catch(x){ return false; } }
  var _dragging=false;
  document.addEventListener('dragstart', function(e){ _dragging=!!(e.target && e.target.classList && e.target.classList.contains('np-goal-tile')); }, true);
  document.addEventListener('dragend', function(){ _dragging=false; }, true);
  function _targetKind(e){
    var el=e.target && e.target.closest ? e.target : null; if(!el) return null;
    var hdr=el.closest('[data-header-id]');
    if(hdr) return {header:hdr.getAttribute('data-header-id')};
    if(el.closest('[data-idea-id]') || el.closest('.np-goal-tile')) return null;
    // Open space anywhere on the board (the groups wrap is only as wide as its columns, so use the whole viewport).
    if(el.closest('#sc-board-viewport') || el.closest('[data-sb-groups]')) return {space:true};
    return null;
  }
  document.addEventListener('dragover', function(e){
    if(!_dragging) return;
    if(_targetKind(e)){ e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('drop', async function(e){
    if(!_dragging) return;
    var cardId=_cardIdFrom(e); if(!cardId) return;
    var k=_targetKind(e); if(!k) return;
    e.preventDefault(); e.stopPropagation(); _dragging=false;
    try{
      if(k.header){
        var hr=_rows()[k.header];
        var isLot=hr && /^(parking lot|new|new additions)$/i.test(String(hr.text_content||'').trim());
        await _setGoal(cardId, isLot ? null : k.header);
      } else {
        var hid=await _newPlanHeader(cardId);
        await _setGoal(cardId, hid);
      }
      _redraw();
    }catch(err){
      var st=document.getElementById('sc-status'); if(st){ st.textContent=err.message||String(err); st.classList.add('err'); }
    }
  }, true);
  window.T2TNeedsPlanGoals={ fill: fill, fillHeader: fillHeader };
})();
