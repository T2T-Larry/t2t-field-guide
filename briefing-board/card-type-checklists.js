// card-type-checklists.js -- Oct 21 2026 (Larry: "VISION, PLAN and ISSUE checklists that follow the Hang Up checklist pattern, each with
// its own color and card title"). One place for the card backs of a task that wears a VISION or a PLAN badge.
//
// Card type (one rule): HANG UP (sitting in HANG-UPS) > VISION (needs_vision) > PLAN (needs_plan, or the card is the GOAL of a plan) > TASK.
// On a VISION or PLAN card the band title reads VISION / PLAN, the back takes that type's color, the standard fixed rows are dropped
// (same as a Hang Up) and a checklist replaces them. Same look as the Hang Up reasons: .bb-hr rows with the 3-state box.
//   VISION: row 1 shows the header waiting on the VISION board (ensure_vision_header puts it there); row 2 "Vision statement written" cycles
//           empty -> selected -> complete (stored in hangup_reasons as vision / vision:done, same as the Hang Up reason). Complete clears NEEDS VISION.
//   PLAN:   one box per step of the plan (child headers of the GOAL header, ideas.step_done). Last row "Plan approved" cycles like VISION's
//           (plan / plan:done); complete clears NEEDS PLAN.
// ISSUE comes later (it needs its home under Sea of Ideas first).
//
// Public surface: window.FGCardBackType
//   .sync(card, overlayCard, hooks) -> paints the type onto the open card back. hooks.changed() = save locally + redraw the board.
//   .typeOf(card) -> 'hangup' | 'vision' | 'plan' | 'task'
(function(){
  var TYPES={
    vision:{ title:'VISION', accent:'#4a90c8', bg:'#EEF6FC', ink:'#1e4f7a' },
    plan:  { title:'PLAN',   accent:'#4a2c12', bg:'#F7EFE6', ink:'#4a2c12' }
  };
  var _seq=0;

  function _sb(){ return window.T2T && window.T2T.sb; }
  function typeOf(c){
    if(!c) return 'task';
    if(c.col==='hangups') return 'hangup';
    if(c.needsVision) return 'vision';
    if(c.needsPlan || c.goalHeaderId) return 'plan';
    return 'task';
  }
  function _state(c,k){
    var l=','+String(c.hangupReasons||'')+',';
    if(l.indexOf(','+k+':done,')>=0) return 2;
    if(l.indexOf(','+k+',')>=0 || (k==='vision' && c.needsVision) || (k==='plan' && c.needsPlan)) return 1;
    return 0;
  }
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
  function _row(id, state, text, note){
    return '<div class="bb-ct-row"><button type="button" class="bb-hr" data-ct="'+_esc(id)+'" data-state="'+state+'"><span class="bb-hr-box"></span><span class="bb-hr-text">'+_esc(text)+'</span></button>'
      +(note?'<span class="bb-ct-note">'+_esc(note)+'</span>':'')+'</div>';
  }

  function _injectStyle(){
    if(document.getElementById('bb-ct-style')) return;
    var s=document.createElement('style'); s.id='bb-ct-style';
    s.textContent=
      '.bb-overlay-card.bb-type-vision,.bb-overlay-card.bb-type-plan{border-top-color:var(--ct-accent);background:var(--ct-bg)}'
      +'.bb-overlay-card.bb-type-vision .fg-back-fixed,.bb-overlay-card.bb-type-vision .fg-back-selected,.bb-overlay-card.bb-type-vision .fg-back-region,.bb-overlay-card.bb-type-vision .fg-back-daterow,'
      +'.bb-overlay-card.bb-type-plan .fg-back-fixed,.bb-overlay-card.bb-type-plan .fg-back-selected,.bb-overlay-card.bb-type-plan .fg-back-region,.bb-overlay-card.bb-type-plan .fg-back-daterow{display:none!important}'
      +'.bb-overlay-card.bb-type-vision .bb-overlay-title,.bb-overlay-card.bb-type-plan .bb-overlay-title{color:var(--ct-ink)}'
      +'#bb-ct-panel{margin:6px 0 4px}'
      +'#bb-ct-panel .bb-ct-cap{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ct-ink);margin-bottom:6px}'
      +'#bb-ct-panel .bb-ct-row{display:flex;flex-direction:column;gap:1px;margin:5px 0}'
      +'#bb-ct-panel .bb-hr-box{border-color:var(--ct-accent)}'
      +'#bb-ct-panel .bb-ct-note{margin-left:20px;font-size:11px;opacity:.75}'
      +'#bb-ct-panel .bb-hr{white-space:normal}';
    document.head.appendChild(s);
  }

  async function _planSteps(c){
    var sb=_sb(); if(!sb || !c.goalHeaderId) return [];
    var r=await sb.from('ideas').select('id,text_content,subject,step_time,step_done,sort_order')
      .eq('content_type','header').eq('cluster_id', c.goalHeaderId).is('trashed_at', null).order('sort_order',{ascending:true});
    if(r.error || !r.data) return [];
    return r.data;
  }
  async function _cycleReason(c, k, hooks){
    var next=(_state(c,k)+1)%3;
    var list=String(c.hangupReasons||'').split(',').filter(function(x){ return x && x!==k && x!==k+':done'; });
    if(next===1) list.push(k);
    if(next===2) list.push(k+':done');
    c.hangupReasons=list.join(',');
    var upd={hangup_reasons:c.hangupReasons};
    if(k==='vision'){ upd.needs_vision=(next===1); c.needsVision=(next===1); }
    if(k==='plan'){ upd.needs_plan=(next===1); c.needsPlan=(next===1); }
    var sb=_sb();
    if(sb){
      var res=await sb.from('task_fields').update(upd).eq('idea_id', c.id);
      if(res.error) console.error('Briefing Board: checklist save failed', res.error);
      else if(k==='vision' && next===1){
        var rr=await sb.rpc('ensure_vision_header',{p_idea:c.id});
        if(rr.error) console.error('Briefing Board: VISION header add failed', rr.error);
      }
    }
    if(hooks && hooks.changed) hooks.changed();
  }

  async function sync(c, card, hooks){
    if(!card) return;
    _injectStyle();
    var t=typeOf(c), old=card.querySelector('#bb-ct-panel');
    // Oct 24 2026 (Larry): the card's color and title say WHERE WE ARE (a Briefing Board task), not where the badge leads. A VISION or PLAN badge
    // therefore no longer recolors or retitles the back; only the checklist below is added, and the standard rows stay.
    card.classList.remove('bb-type-vision','bb-type-plan');
    if(t!=='vision' && t!=='plan'){ if(old) old.remove(); return; }
    var T=TYPES[t];
    card.style.setProperty('--ct-accent', T.accent);
    card.style.setProperty('--ct-bg', T.bg);
    card.style.setProperty('--ct-ink', T.ink);
    var panel=old;
    if(!panel){
      panel=document.createElement('div'); panel.id='bb-ct-panel';
      var head=card.querySelector('.bb-overlay-head');
      if(head && head.parentNode) head.parentNode.insertBefore(panel, head.nextSibling); else card.appendChild(panel);
    }
    var mySeq=++_seq;
    var html='';
    if(t==='vision'){
      // The header is matched by name under the card's topic and added by ensure_vision_header, so a flagged card always has one.
      var hdr=(c.needsVision || _state(c,'vision')===2) ? String(c.subject||c.task||'').trim() : '';
      html='<div class="bb-ct-cap">Vision checklist</div>'
        +_row('vision-header', hdr?1:0, 'Header on the VISION board', hdr||'Added when this card is flagged VISION')
        +_row('reason-vision', _state(c,'vision'), 'Vision statement written', 'Click: selected, then complete (confirms it)');
    }else{
      var steps=await _planSteps(c);
      if(mySeq!==_seq) return;
      html='<div class="bb-ct-cap">Plan checklist</div>';
      if(!steps.length) html+='<div class="bb-ct-note" style="margin:4px 0">No steps yet: build the plan under this card&rsquo;s goal.</div>';
      steps.forEach(function(s){
        var label=String(s.subject||s.text_content||'Step').trim();
        html+=_row('step:'+s.id, s.step_done?2:0, label, s.step_time||'');
      });
      html+=_row('reason-plan', _state(c,'plan'), 'Plan approved', 'Click: selected, then complete (confirms it)');
    }
    panel.innerHTML=html;
    panel.querySelectorAll('[data-ct]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var id=btn.getAttribute('data-ct');
        if(id==='vision-header') return;          // shown for information; the database adds the header itself
        if(id.indexOf('step:')===0){
          var stepId=id.slice(5), on=btn.getAttribute('data-state')!=='2';
          btn.setAttribute('data-state', on?'2':'0');
          var sb=_sb();
          if(sb){
            var res=await sb.from('ideas').update({step_done:on}).eq('id', stepId);
            if(res.error){ console.error('Briefing Board: plan step save failed', res.error); btn.setAttribute('data-state', on?'0':'2'); }
          }
          return;
        }
        var k=id.replace('reason-','');
        await _cycleReason(c, k, hooks);
        sync(c, card, hooks);
      });
    });
  }

  window.FGCardBackType={ sync:sync, typeOf:typeOf };
})();
