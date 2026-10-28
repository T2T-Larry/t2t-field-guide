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

  function injectStyle(){
    if(document.getElementById('fg-cc-style')) return;
    var st=document.createElement('style'); st.id='fg-cc-style';
    st.textContent=''
      +'.bb-needs-plan-badge.bb-cycle-badge{background:rgba(160,120,220,.30);border-color:#7c5cb8;color:#4a2d85;cursor:pointer}'
      +'.bb-needs-plan-badge.bb-cycle-badge::after{content:" \\25BE";font-size:.9em}'
      +'.fg-cc-pop{position:fixed;z-index:100001;min-width:200px;max-width:260px;background:#fff;border:2px solid #7c5cb8;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#333}'
      +'.fg-cc-group{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.65;padding:6px 12px 2px}'
      +'.fg-cc-row{display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;user-select:none}'
      +'.fg-cc-row:hover{background:rgba(124,92,184,.14)}'
      +'.fg-cc-row.fg-cc-on{font-weight:700}'
      +'.fg-cc-row.fg-cc-on::after{content:"\\2713";margin-left:auto}'
      +'.fg-cc-num{flex:0 0 auto;width:16px;text-align:right;opacity:.7}'
      +'.fg-cc-sep{height:1px;background:rgba(128,128,128,.35);margin:4px 0}'
      +'#bb-d-cycle-row{display:flex;flex-direction:column}'
      +'#bb-d-cycle{width:100%;box-sizing:border-box}';
    document.head.appendChild(st);
  }

  // The badge for the card front. Empty until a step is chosen. Hidden on the front when the eye (key "cycle") is set to back-only.
  function badgeHTML(c){
    var s=stepOf(c); if(!s) return '';
    if(window.FGCardBackOptions && FGCardBackOptions.isBackOnly(c.frontHidden,'cycle')) return '';
    return '<span class="bb-needs-plan-badge bb-cycle-badge" data-cc-badge="'+esc(c.id)+'" title="Creative cycle: '+esc(s.label)+'. '+esc(s.tip)+' Click to change.">'+numOf(s)+' '+esc(s.label).toUpperCase()+'</span>';
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

  var pop=null;
  function closePop(){ if(pop){ pop.remove(); pop=null; } }
  function openPop(anchor, c){
    closePop(); injectStyle();
    var cur=stepOf(c);
    pop=document.createElement('div'); pop.className='fg-cc-pop';
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
    pop.innerHTML='<div class="fg-cc-group">Creative cycle</div>';
    STEPS.forEach(function(s, i){
      var r=document.createElement('div'); r.className='fg-cc-row'+(cur&&cur.key===s.key?' fg-cc-on':''); r.title=s.tip;
      r.innerHTML='<span class="fg-cc-num">'+(i+1)+'.</span><span>'+esc(s.label)+'</span>';
      r.addEventListener('click', function(e){ e.stopPropagation(); closePop(); setStep(c, s.key); });
      pop.appendChild(r);
    });
    if(cur){
      var sep=document.createElement('div'); sep.className='fg-cc-sep'; pop.appendChild(sep);
      var none=document.createElement('div'); none.className='fg-cc-row'; none.innerHTML='<span class="fg-cc-num"></span><span>No step</span>';
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
    var b=e.target && e.target.closest ? e.target.closest('[data-cc-badge]') : null;
    if(!b){ closePop(); return; }
    e.stopPropagation(); e.preventDefault();
    var c=cardOf(b.getAttribute('data-cc-badge')); if(c) openPop(b, c);
  }, true);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closePop(); });

  // The card back: a CREATIVE CYCLE dropdown under SUBJECT. Built once, repainted for each card that opens.
  function paintBack(c){
    try{
      var subj=document.getElementById('bb-d-subject-row'); if(!subj || !c) return;
      injectStyle();
      var row=document.getElementById('bb-d-cycle-row');
      if(!row){
        row=document.createElement('div'); row.className='bb-field'; row.id='bb-d-cycle-row';
        row.innerHTML='<label>Creative cycle</label><select id="bb-d-cycle"></select>';
        subj.parentNode.insertBefore(row, subj.nextSibling);
        var sel=row.querySelector('select');
        sel.innerHTML='<option value="">No step</option>'+STEPS.map(function(s,i){ return '<option value="'+s.key+'" title="'+esc(s.tip)+'">'+(i+1)+'. '+esc(s.label)+'</option>'; }).join('');
        sel.addEventListener('change', function(){
          var card=cardOf(typeof _bbOpenCardId!=='undefined' ? _bbOpenCardId : null); if(card) setStep(card, sel.value);
        });
      }
      var cur=stepOf(c); row.querySelector('select').value=cur?cur.key:'';
    }catch(e){ console.warn('Creative cycle: could not paint the card back', e); }
  }

  injectStyle();
  window.FGCreativeCycle={ STEPS:STEPS, stepOf:stepOf, badgeHTML:badgeHTML, paintBack:paintBack, setStep:setStep };
})();
