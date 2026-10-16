// plan-step-marker.js -- Oct 12 2026 (Master BB card: plan step -> BB handoff).
// A Briefing Board card that carries out one step of a PLAN wears a small "PLAN n/m" marker
// on its face. The link is task_fields.plan_step_id (exposed on the briefing_cards view),
// which points at the plan's step header. This file only READS: it looks up the step, counts
// the plan's timed steps (a step with a time estimate is a real work step), and paints the
// marker. The next step arriving on the BB after a step is finished is done by the database
// (trigger task_fields_plan_advance), so it works however a card is moved to Done.
//
// Public surface: window.T2TPlanStep
//   .paintAll(root) -> fills every [data-plan-step] marker under root (default: document)
(function(){
  var _info={};      // stepId -> {n, m, label, planLabel}
  var _pending=null;

  function _sb(){ return window.T2T && window.T2T.sb; }
  function _lbl(r){ return String((r && (r.subject || r.text_content || r.idea_text)) || '').trim(); }

  async function _load(stepIds){
    var sb=_sb(); if(!sb || !stepIds.length) return;
    try{
      var steps=await sb.from('ideas').select('id,cluster_id,sort_order,text_content,subject').in('id', stepIds);
      if(steps.error || !steps.data) return;
      var byCluster={};
      steps.data.forEach(function(s){ if(s.cluster_id) byCluster[s.cluster_id]=true; });
      var clusterIds=Object.keys(byCluster);
      if(!clusterIds.length) return;
      var sibs=await sb.from('ideas').select('id,cluster_id,sort_order,step_time')
        .eq('content_type','header').in('cluster_id', clusterIds).order('sort_order',{ascending:true});
      var plans=await sb.from('ideas').select('id,text_content,subject').in('id', clusterIds);
      var planName={};
      if(!plans.error && plans.data) plans.data.forEach(function(p){ planName[p.id]=_lbl(p); });
      var timed={};
      if(!sibs.error && sibs.data) sibs.data.forEach(function(s){
        if(String(s.step_time||'').trim()) (timed[s.cluster_id]=timed[s.cluster_id]||[]).push(s.id);
      });
      steps.data.forEach(function(s){
        var list=timed[s.cluster_id]||[];
        var idx=list.indexOf(s.id);
        _info[s.id]={ n: idx>=0?idx+1:0, m: list.length, label:_lbl(s), planLabel:planName[s.cluster_id]||'' };
      });
    }catch(e){ console.error('T2TPlanStep: could not load plan steps', e); }
  }

  function _paintEl(el){
    var id=el.getAttribute('data-plan-step');
    var i=_info[id];
    if(!i) return;
    el.textContent='▣ PLAN'+(i.n&&i.m ? ' '+i.n+'/'+i.m : '');
    el.title='Part of a plan'+(i.planLabel?(': '+i.planLabel):'')+(i.n&&i.m?(' — step '+i.n+' of '+i.m):'')
      +(i.label?(' ('+i.label+')'):'')+'. Finishing this card puts the next step on the board.';
  }

  async function paintAll(root){
    var els=Array.prototype.slice.call((root||document).querySelectorAll('[data-plan-step]'));
    if(!els.length) return;
    var need=[];
    els.forEach(function(el){ var id=el.getAttribute('data-plan-step'); if(!_info[id] && need.indexOf(id)<0) need.push(id); });
    if(need.length){
      if(!_pending){ _pending=_load(need).then(function(){ _pending=null; }, function(){ _pending=null; }); }
      await _pending;
    }
    els.forEach(_paintEl);
  }

  window.T2TPlanStep={ paintAll: paintAll };
})();
