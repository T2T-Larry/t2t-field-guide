// needs-plan-goals.js -- Oct 15 2026 (Larry: "the tasks needing plans did not appear in the Parking Lot").
// A Briefing Board card flagged NEEDS PLAN is the GOAL of its plan. This module reads those cards
// (briefing_cards.needs_plan = true, same card -- not a copy) and draws them as read-only goal tiles at the
// top of the Parking Lot on the PLAN board of the card's home topic (project_header_id), or of any
// ancestor topic. MASTER's plan therefore shows every one.
// Public surface: window.T2TNeedsPlanGoals.fill(hostEl, sourceTopicId, tileW)
(function(){
  function _sb(){ return window.T2T && window.T2T.sb; }
  function _within(headerId, sourceId){
    var byId = (typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById : {};
    var cur = headerId, guard = 0;
    while(cur && guard++ < 60){
      if(String(cur)===String(sourceId)) return true;
      var r = byId[cur]; cur = r ? r.cluster_id : null;
    }
    return false;
  }
  async function fill(host, sourceId, tileW){
    var sb=_sb(); if(!sb || !host || !sourceId) return;
    var res = await sb.from('briefing_cards').select('id,project_header_id,col,subject,task')
      .eq('needs_plan', true).neq('archived', true).is('trashed_at', null).neq('col','done');
    if(res.error || !res.data) return;
    var cards = res.data.filter(function(c){ return c.project_header_id && _within(c.project_header_id, sourceId); });
    if(!cards.length) return;
    var prim = {}, init = {};
    try{
      var rr = await sb.from('card_roles').select('card_id,user_id').eq('card_type','briefing_card').eq('role','primary').in('card_id', cards.map(function(c){ return c.id; }));
      if(rr.data) rr.data.forEach(function(x){ prim[x.card_id]=x.user_id; });
      var uids = Object.keys(prim).map(function(k){ return prim[k]; }).filter(function(u,i,a){ return u && a.indexOf(u)===i; });
      if(uids.length){
        var pr = await sb.rpc('people_by_ids', {p_ids: uids});
        if(pr.data) pr.data.forEach(function(m){ init[m.user_id]=(m.initials||'').toUpperCase(); });
      }
    }catch(e){}
    host.innerHTML='';
    cards.forEach(function(c){
      var t = document.createElement('div');
      t.className = 'np-goal-tile';
      t.title = 'GOAL: this task NEEDS PLAN (Briefing Board card, same card)';
      t.style.cssText = 'width:'+tileW+'px;box-sizing:border-box;border-radius:8px;background:rgba(255,255,255,.92);box-shadow:inset 0 3px 0 rgba(236,72,153,.6),0 2px 6px rgba(0,0,0,.25);padding:6px 8px 8px;font-size:13px;line-height:1.25;color:#222;text-align:left';
      var eb = document.createElement('div');
      eb.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px';
      var b = document.createElement('span');
      b.textContent = 'NEEDS PLAN';
      b.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:.06em;color:#9d174d;background:rgba(236,72,153,.28);border:1px solid rgba(236,72,153,.6);border-radius:4px;padding:1px 5px';
      eb.appendChild(b);
      var who = init[prim[c.id]];
      if(who){ var w=document.createElement('span'); w.textContent=who; w.style.cssText='font-size:11px;font-weight:700;color:#555'; eb.appendChild(w); }
      t.appendChild(eb);
      var tx = document.createElement('div');
      tx.textContent = c.subject || c.task || '(untitled task)';
      t.appendChild(tx);
      host.appendChild(t);
    });
  }
  window.T2TNeedsPlanGoals = { fill: fill };
})();
