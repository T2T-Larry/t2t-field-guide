/* ============================================================
   creative-cycle-badge.js -- T2T Field Guide - CREATIVE CYCLE badge (task card front + back)

   Oct 28 2026 (Larry): the CREATIVE CYCLE is the small gear, five steps: Question - Create - Shape - Share - Align.
   A task wears ONE step as a badge on its front; the badge is a dropdown (click it to move the card to another step, or clear it).
   The same dropdown sits on the card back, under SUBJECT, so a step can be set the first time (no badge shows until one is chosen).

   Stored the way WORKSPACE and the eyes are: as one word in the card's existing comma list (ideas.front_hidden), "cc:<step>",
   so there is no new database column. Setting a step replaces any earlier "cc:" word. The badge's eye key is "cycle" (back-only hides it on the front).
   ============================================================ */
(function(){
  var STEPS=[
    {key:'question', label:'Question', tip:'Ask what we might want to think about or talk about. Results in headers.'},
    {key:'create',   label:'Create',   tip:'Generate the ideas. Results in ideas.'},
    {key:'shape',    label:'Shape',    tip:'Sort to what makes the difference. Results in a decision.'},
    {key:'share',    label:'Share',    tip:'Tell others what was decided. Results in communication.'},
    {key:'align',    label:'Align',    tip:'The green light. If it does not align, the gear slips back to a previous cog.'}
  ];
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function words(c){ return String(c&&c.frontHidden||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean); }
  function stepOf(c){
    var w=words(c);
    for(var i=0;i<w.length;i++){
      if(w[i].indexOf('cc:')===0){
        var k=w[i].slice(3);
        for(var j=0;j<STEPS.length;j++) if(STEPS[j].key===k) return STEPS[j];
      }
    }
    return null;
  }
  function numOf(step){ for(var i=0;i<STEPS.length;i++) if(STEPS[i].key===step.key) return i+1; return 0; }
  // Oct 29 2026 (Larry): changing the badge is only "another spin of the plate" -- it never means the old step is finished.
  // Finished is its own checkbox, like the TOPIC selector's: one "ccdone:<step>" word per finished step, in the same comma list.
  // The finished steps are the trail; the card itself stays where it is (a card that has started a cycle is DOING) and is never moved to DONE by a check.
  function isDone(c, key){ return words(c).indexOf('ccdone:'+key)>=0; }

  function injectStyle(){
    if(document.getElementById('fg-cc-style')) return;
    var st=document.createElement('style'); st.id='fg-cc-style';
    st.textContent=''
      +'.bb-needs-plan-badge.bb-cycle-badge{background:rgba(160,120,220,.30);border-color:#7c5cb8;color:#4a2d85;cursor:pointer}'
      +'.bb-needs-plan-badge.bb-cycle-badge::after{content:" \\25BE";font-size:.9em}'
      +'.bb-needs-plan-badge.bb-cycle-badge.bb-cycle-empty{background:transparent;border:1px dashed #7c5cb8;color:#7c5cb8;opacity:.75}'
      +'.bb-needs-plan-badge.bb-cycle-badge.bb-cycle-empty::after{content:""}'
      +'.bb-needs-plan-badge.bb-cycle-badge.bb-cycle-done{background:rgba(90,160,110,.30);border-color:#4a8a5c;color:#1f5a30}'
      +'.fg-cc-pop{position:fixed;z-index:100001;min-width:0;width:max-content;max-width:160px;background:#fff;border:2px solid #7c5cb8;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#333}'
      +'.fg-cc-group{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.65;padding:6px 12px 2px}'
      +'.fg-cc-row{display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;user-select:none}'
      +'.fg-cc-row:hover{background:rgba(124,92,184,.14)}'
      +'.fg-cc-row.fg-cc-on{font-weight:700;background:rgba(124,92,184,.10)}'
      +'.fg-cc-row input[type=checkbox]{margin:0;flex:0 0 auto;cursor:pointer}'
      +'.fg-cc-num{flex:0 0 auto;width:16px;text-align:right;opacity:.7}'
      +'.fg-cc-sep{height:1px;background:rgba(128,128,128,.35);margin:4px 0}'
      +'#bb-d-cycle-row{display:flex;flex-direction:column}'
      +'#bb-d-cycle-row>label{display:flex;align-items:center;white-space:nowrap}'
      +'#bb-d-cycle{width:auto;max-width:130px;box-sizing:border-box}';
    document.head.appendChild(st);
  }

  // The badge for the card front. Empty until a step is chosen. Hidden on the front when the eye (key "cycle") is set to back-only.
  // Oct 29 2026 (Larry): every task card has the picker, with one single click (no double-click). Before a step is chosen it is the dashed (+); a DONE card shows none until it has a step.
  function badgeHTML(c){
    if(window.FGCardBackOptions && FGCardBackOptions.isBackOnly(c.frontHidden,'cycle')) return '';
    var s=stepOf(c);
    if(!s){
      if(c.col==='done') return '';
      return '<span class="bb-needs-plan-badge bb-cycle-badge bb-cycle-empty" data-cc-badge="'+esc(c.id)+'" title="Session: click to pick a step.">+</span>';
    }
    var d=isDone(c, s.key);
    return '<span class="bb-needs-plan-badge bb-cycle-badge'+(d?' bb-cycle-done':'')+'" data-cc-badge="'+esc(c.id)+'" title="Session: '+esc(s.label)+(d?' (finished)':'')+'. '+esc(s.tip)+' Click to change.">'+(d?'✓ ':'')+esc(s.label).toUpperCase()+'</span>';
  }

  function save(c){
    if(typeof _bbSaveLocal==='function' && typeof _bbCardsList==='function') _bbSaveLocal(_bbCardsList());
    if(typeof _bbPersistMergedCardById==='function') _bbPersistMergedCardById(c.id);
    if(typeof renderBoard==='function') renderBoard();
  }
  function setStep(c, key){
    var w=words(c).filter(function(x){ return x.indexOf('cc:')!==0; });
    if(key) w.push('cc:'+key);
    c.frontHidden=w.join(',');
    save(c);
    paintBack(c);
  }
  // The checkbox: finished or not for one step. Changing the current step never touches these.
  function setDone(c, key, on){
    var w=words(c).filter(function(x){ return x!=='ccdone:'+key; });
    if(on) w.push('ccdone:'+key);
    c.frontHidden=w.join(',');
    // Oct 29 2026 (Larry): moving a card into DOING is his manual decision, and it stays there until the whole cycle is finished
    // (every cog checked) or he moves it to DONE himself. Finishing the cycle moves it to DONE, the same way COMPLETE does.
    if(on && c.col==='doing' && STEPS.every(function(s){ return w.indexOf('ccdone:'+s.key)>=0; })){
      c.col='done';
      if(!c.completedDate && typeof _bbToday==='function') c.completedDate=_bbToday();
    }
    save(c);
    paintBack(c);
  }

  var pop=null;
  function closePop(){ if(pop){ pop.remove(); pop=null; } }
  function openPop(anchor, c){
    closePop(); injectStyle();
    var cur=stepOf(c);
    pop=document.createElement('div'); pop.className='fg-cc-pop';
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
    pop.innerHTML='<div class="fg-cc-group">Session</div>';
    STEPS.forEach(function(s, i){
      var r=document.createElement('div'); r.className='fg-cc-row'+(cur&&cur.key===s.key?' fg-cc-on':''); r.title=s.tip;
      r.innerHTML='<input type="checkbox" title="Finished"'+(isDone(c, s.key)?' checked':'')+'><span>'+esc(s.label)+'</span>';
      r.addEventListener('click', function(e){ e.stopPropagation(); closePop(); setStep(c, s.key); });
      // The checkbox marks the step finished (or not) and keeps the card on its current step.
      r.querySelector('input').addEventListener('click', function(e){ e.stopPropagation(); var on=this.checked; closePop(); setDone(c, s.key, on); });
      pop.appendChild(r);
    });
    if(cur){
      var sep=document.createElement('div'); sep.className='fg-cc-sep'; pop.appendChild(sep);
      var none=document.createElement('div'); none.className='fg-cc-row'; none.innerHTML='<span class="fg-cc-num" style="width:13px"></span><span>No step</span>';
      none.addEventListener('click', function(e){ e.stopPropagation(); closePop(); setStep(c, ''); });
      pop.appendChild(none);
    }
    document.body.appendChild(pop);
    var r=anchor.getBoundingClientRect(), pr=pop.getBoundingClientRect();
    pop.style.left=Math.min(Math.max(8, r.left), window.innerWidth-pr.width-8)+'px';
    pop.style.top=(r.bottom+pr.height+8>window.innerHeight ? Math.max(8, r.top-pr.height-6) : r.bottom+4)+'px';
  }

  // A click on the front badge opens the dropdown instead of opening the card (capture phase, before the card's own click).
  function cardOf(id){ return (typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(id) : null; }
  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.fg-cc-pop')) return;   // clicks inside the list are handled by the list
    var b=e.target && e.target.closest ? e.target.closest('[data-cc-badge]') : null;
    if(!b){ closePop(); return; }
    e.stopPropagation(); e.preventDefault();
    var c=cardOf(b.getAttribute('data-cc-badge')); if(c) openPop(b, c);
  }, true);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closePop(); });

  // The card back: the SESSION dropdown (Oct 29 2026, Larry: "CREATIVE CYCLE, change to SESSION"). It is the first, narrow field of the Subject Band
  // (SESSION - SUBJECT - WORKSPACE - jump arrow). buildRow() makes the field once while the back is built; paintBack() repaints it for each card that opens.
  // "Step finished" is now just the small checkbox on the label line, so the field stays one select tall.
  function buildRow(){
    injectStyle();
    var row=document.getElementById('bb-d-cycle-row');
    if(row) return row;
    row=document.createElement('div'); row.className='bb-field'; row.id='bb-d-cycle-row';
    row.innerHTML='<label>Session</label><select id="bb-d-cycle" title="Session: which step of the creative cycle this card is on"></select>';
    var sel=row.querySelector('select');
    sel.innerHTML='<option value="">No step</option>'+STEPS.map(function(s){ return '<option value="'+s.key+'" title="'+esc(s.tip)+'">'+esc(s.label)+'</option>'; }).join('');
    sel.addEventListener('change', function(){
      var card=cardOf(typeof _bbOpenCardId!=='undefined' ? _bbOpenCardId : null); if(card) setStep(card, sel.value);
    });
    var lab=row.querySelector('label');
    var dn=document.createElement('input'); dn.type='checkbox'; dn.id='bb-d-cycle-done'; dn.title='Step finished'; dn.style.margin='0 0 0 6px'; dn.style.cursor='pointer';
    lab.appendChild(dn);
    dn.addEventListener('change', function(){
      var card=cardOf(typeof _bbOpenCardId!=='undefined' ? _bbOpenCardId : null), st=card&&stepOf(card);
      if(card && st) setDone(card, st.key, dn.checked); else dn.checked=false;
    });
    return row;
  }
  function paintBack(c){
    try{
      if(!c) return;
      var row=document.getElementById('bb-d-cycle-row');
      if(!row){
        var subj=document.getElementById('bb-d-subject-row'); if(!subj) return;
        row=buildRow(); subj.parentNode.insertBefore(row, subj);   // not pre-built (older path): sit just before SUBJECT
      }
      var cur=stepOf(c); row.querySelector('select').value=cur?cur.key:'';
      var dn=row.querySelector('#bb-d-cycle-done'); dn.checked=!!(cur && isDone(c, cur.key)); dn.disabled=!cur;
    }catch(e){ console.warn('Session: could not paint the card back', e); }
  }

  injectStyle();
  window.FGCreativeCycle={ buildRow:buildRow, STEPS:STEPS, stepOf:stepOf, isDone:isDone, badgeHTML:badgeHTML, paintBack:paintBack, setStep:setStep, setDone:setDone };
})();
