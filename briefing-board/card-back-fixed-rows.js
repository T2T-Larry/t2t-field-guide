/* ============================================================
   card-back-fixed-rows.js -- T2T Field Guide - THE FOUR FIXED ROWS ON EVERY TASK CARD BACK

   Oct 19 2026 (Larry): every task back carries the same four checklist rows, always visible, replacing the OPTIONS (+) popup:
     DATES        -- opens the Start Date and Due Date fields (type a date or pick it from the calendar)
     SIGNAL FLAGS -- opens the flags
     VISION       -- puts a VISION badge on the card (this task needs a Vision statement) and adds its header to the VISION board
     PLAN         -- the NEEDS PLAN switch: the card goes to the PLAN Parking Lot to become a GOAL
   Nothing new is stored here: each row drives the real checkbox that already exists on the back (same ids, same saving).
   Oct 20 2026 (Larry: "redesign the Gear to test our system"): the SAME builder now also makes the Gear's rows --
     ORGANIZATION, ROUTINE, BUDGET, LINKS plus Duplicate -- so one tree, one code.
   Nov 11 2026 (Larry: "build the 3 click checklist function, no trash buttons, no eyeballs"): EVERY checklist row works the same three-click way
   (one tree, one code), and the eyeballs are gone from the checklist:
     unchecked = nothing showing.  Click 1 = the feature shows on the BACK of the card (hollow check).  Click 2 = it ALSO shows on the FRONT (filled check).
     Click 3 = hidden again (unchecked; the entry stays saved, so click 1 brings it back).
     A row with nothing to draw on the card front (Order, Review, Organization...) has no second step: click 1 shows it, click 2 hides it.
     "Front" is stored the way the old eyeball stored it (front_hidden: a feature's word in the list = back only), so every existing card keeps looking the same.
     "Nevermind": Escape while a row is open puts back what the row held when it was opened (an empty field goes back to unchecked).
   The checklist sits LEFT and whatever is open sits to its RIGHT, like Situation on the Hang Up card.
   Oct 29 2026 (Larry): PRIORITY is the FIRST item on the main checklist, always visible: PRIORITY [H M L]. Picking H, M or L checks the item
   automatically (the box is only an indicator); The H-M-L buttons are the
   card's existing ones (same wiring), moved here: cfg.priority = {node (the .bb-priorities element), getValue(), eye:{id, isShown(), setShown(bool)}}.
   Public surface: window.FGCardBackFixedRows  .build(bbw, cfg)   cfg = {getHidden, setHidden, rows?, mount?, key?, className?, extra?, priority?}   .sync()
   ============================================================ */
(function(){
  var ROWS = [
    { id:'dates',  label:'Dates',        boxes:['bb-d-add-start','bb-d-add-due'], eyeKeys:['start','due'], bodies:['bb-d-start-body','bb-d-due-body'] },
    { id:'flags',  label:'Signal Flags', boxes:['bb-d-add-flags'],                eyeKeys:['flags'],       bodies:['bb-d-flags-body'] }
    // Nov 12 2026 (Larry: "trash REVIEW from OPTIONS checklist"): the REVIEW row is gone. PRO - GROW sit left of DONE and VERIFIED sits between DONE and the Gear, in the bottom band.
  ];
  // The Gear's rows (Oct 20 2026). Routine is the only one that draws on the card face; the rest have no eye.
  var GEAR_ROWS = [
    { id:'org',     label:'Organization', boxes:['bb-d-add-org'],     eyeKeys:[],          bodies:['bb-d-org-body'] },
    { id:'routine', label:'Routine',      boxes:['bb-d-add-routine'], eyeKeys:['routine'], bodies:['bb-d-routine-body'] },
    { id:'budget',  label:'Budget',       boxes:['bb-d-add-budget'],  eyeKeys:[],          bodies:['bb-d-budget-body'] },
    { id:'links',   label:'Links',        boxes:['bb-d-add-links'],   eyeKeys:[],          bodies:['bb-d-links-body'] }
  ];
  var instances={};
  // Which Gear card-display feature each row belongs to (controls/card-display-options.js).
  var FEATURE_OF_ROW={ dates:'dates', flags:'flags', routine:'routine', org:'org', budget:'budget', links:'links' };

  function injectStyle(){
    if(document.getElementById('fg-fixed-rows-style')) return;
    var st=document.createElement('style'); st.id='fg-fixed-rows-style';
    st.textContent=''
      +'.fg-back-fixed{display:flex;flex-direction:column;gap:0;width:100%;margin:2px 0 8px;padding:4px 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      // Gear panel (Oct 20 2026): the rows sit two across so the whole Gear stays short; opened bodies follow underneath at full width.
      +'.fg-back-fixed.fg-gear-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;margin:4px 0 4px;padding:4px 0}'
      +'.fg-gear-rows .fg-fixed-row.fg-gear-action{grid-column:1 / -1;justify-content:flex-start}'
      +'.fg-fixed-row .fg-fixed-btn{display:flex;align-items:center;gap:7px;cursor:pointer;background:transparent;border:0;padding:0;font:inherit;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-back-util-extra>.bb-addition>.bb-addition-label{display:none}'
      +'.fg-back-util-extra>.bb-addition{margin:0}'
      +'.fg-fixed-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:2px}'
      +'.fg-fixed-row{display:flex;align-items:center;gap:6px;min-height:19px}'
      +'.fg-back-fixed .fg-fixed-row>label{display:flex!important;align-items:center;gap:7px;margin:0}'
      +'.fg-fixed-row label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-fixed-row input[type=checkbox]{margin:0;width:15px;height:15px;cursor:pointer}'
      // The three-click check (Nov 11 2026, Larry): empty = off, hollow check = shows on the back, filled check = back and front.
      +'.fg-fixed-row input.fg-tri{appearance:none;-webkit-appearance:none;position:relative;box-sizing:border-box;border:1px solid #767676;border-radius:2px;background:#fff;flex:0 0 auto}'
      +'.fg-fixed-row input.fg-tri[data-st="1"]::after,.fg-fixed-row input.fg-tri[data-st="2"]::after{content:"\\2713";position:absolute;left:1px;top:-2px;font-size:13px;line-height:1;font-weight:700;color:#0075ff}'
      +'.fg-fixed-row input.fg-tri[data-st="2"]{background:#0075ff;border-color:#0075ff}'
      +'.fg-fixed-row input.fg-tri[data-st="2"]::after{color:#fff}'
      // Left = the checklist, right = whatever is open (Oct 20 2026). Narrow screens stack them.
      +'.fg-back-split{display:grid;grid-template-columns:minmax(104px,36%) minmax(0,1fr);column-gap:12px;align-items:start;width:100%}'
      // Oct 25 2026 (Larry): a vertical divider line on the right of the OPTIONS list; everything to its right is the field for the selected OPTIONS.
      +'.fg-back-split>.fg-back-fixed{border-bottom:0;margin:2px 0;border-right:1.5px solid var(--bb-accent);padding-right:10px}'
      +'.fg-back-split>.fg-back-right{min-width:0}'
      +'.fg-back-right>.fg-back-selected{margin-top:2px}'
      +'.fg-back-right>.fg-back-task{margin-bottom:4px!important}'
      +'@media (max-width:420px){.fg-back-split{grid-template-columns:1fr}.fg-back-split>.fg-back-fixed{border-right:0;padding-right:0}}'
      +'.fg-fixed-row.fg-pri-row .fg-pri-check{pointer-events:none}'
      +'.fg-fixed-row.fg-pri-row .bb-priorities{display:flex;gap:3px;flex:0 0 auto}'
      +'.fg-fixed-row.fg-done label span{text-decoration:line-through;opacity:.6}'
      +'.fg-row-done-body{display:none!important}'
      // Review's own checklist: indented, PRO / GROW / COMPLETE on the left, their comments to the right under REVIEWED BY (Oct 20 2026).
      // Oct 25 2026 (Larry): PRO - GROW - VERIFIED sit horizontally in one row; whatever PRO / GROW open drops underneath at full width.
      +'.fg-review-grid{display:grid;grid-template-columns:minmax(0,1fr);row-gap:6px;align-items:start;width:100%}'
      +'.fg-review-left{padding-left:12px}'
      +'.fg-review-left .fg-back-fixed{border-bottom:0;margin:0;padding:0}'
      +'.fg-back-fixed.fg-review-rows{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 18px}'
      +'.fg-review-left .fg-fixed-row.fg-gear-action{grid-column:auto}'
      +'.fg-review-right textarea{width:100%;box-sizing:border-box;min-height:44px}'
      // DONE check box in the middle of the bottom (Utility) row, Oct 25 2026 (Larry).
      // Dead centre of the row (same trick as the Header/Subber toggle on the idea card); on a narrow card it moves to the left end so it never sits on the icons.
      +'.bb-action-row{position:relative}'
      +'.bb-action-row .bb-done-check{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin-top:2px;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;color:var(--bb-ink)}'
      +'@media (max-width:520px){.bb-action-row .bb-done-check{left:22px;transform:translateY(-50%)}}'
      +'.bb-action-row .bb-done-check input{margin:0;width:15px;height:15px;cursor:pointer}'
      // Nov 12 2026 (Larry): PRO - GROW sit midway between the left edge and DONE; VERIFIED sits midway between DONE and the Gear.
      // Their exact spot is measured by placeReviewBand() in screens.js, so it stays equal on any card width.
      +'.bb-action-row .bb-pg-band,.bb-action-row .bb-verified-band{position:absolute;top:50%;left:25%;transform:translate(-50%,-50%);margin-top:2px;display:flex;align-items:center;gap:10px;white-space:nowrap}'
      +'.bb-action-row .bb-pg-band .fg-fixed-row,.bb-action-row .bb-verified-band .fg-fixed-row{min-height:0}'
      +'.bb-action-row .bb-pg-band label,.bb-action-row .bb-verified-band label{font-size:calc(10px * var(--fg-text-scale,1))}'
      +'#bb-d-add-review-wrap>.bb-addition-label{display:none}'
      // The OPTIONS (+) popup button is retired: the four rows replace it (Larry, Oct 19 2026).
      +'.fg-back-3x5 .bb-action-row .fg-opt-btn{display:none!important}';
    document.head.appendChild(st);
  }
  function real(id){ return document.getElementById(id); }
  function isOn(row){ return row.boxes.some(function(id){ var b=real(id); return b && b.checked; }); }

  function paintPri(){
    Object.keys(instances).forEach(function(k){
      var p=instances[k].pri; if(!p) return;
      p.cb.checked=!!(p.cfg.getValue && p.cfg.getValue()); p.cb.setAttribute('data-st', p.cb.checked?'2':'0');
    });
  }

  function build(bbw, cfg){
    var key=cfg.key||'main', rowsDef=(cfg.rows||ROWS).slice();
    // Nov 11 2026 (Larry: "put all options in alphabetical order for ease of finding"): every checklist is in A-Z order. Review's own PRO - GROW pair keeps its order.
    if(key!=='review') rowsDef.sort(function(a,b){ return String(a.label).localeCompare(String(b.label)); });
    if(!bbw || instances[key] && instances[key].block.isConnected) return;
    injectStyle();
    var block=document.createElement('div'); block.className='fg-back-fixed'+(cfg.className?' '+cfg.className:'');
    var rows=[];
    // OPTIONS eyebrow, Oct 24 2026 (Larry): the main checklist of a card back is headed OPTIONS.
    if(!cfg.key || cfg.key==='main' || cfg.eyebrow){
      var eb=document.createElement('div'); eb.className='fg-fixed-eyebrow'; eb.textContent='Options'; block.appendChild(eb);
    }
    // PRIORITY first (Oct 29 2026): checkbox indicator + the card's own H M L buttons + the eye. Only the main checklist carries it.
    var priRow=null;
    if(cfg.priority && cfg.priority.node){
      var pd=document.createElement('div'); pd.className='fg-fixed-row fg-pri-row'; pd.setAttribute('data-fg-sort','Priority'); pd.setAttribute('data-fg-feature','priority');
      var plab=document.createElement('label'); plab.title='Checks itself when a priority is chosen';
      var pcb=document.createElement('input'); pcb.type='checkbox'; pcb.className='fg-pri-check fg-tri'; pcb.id='bb-d-pri-check'; pcb.tabIndex=-1;
      var ptx=document.createElement('span'); ptx.textContent='Priority';
      plab.appendChild(pcb); plab.appendChild(ptx); pd.appendChild(plab);
      var pf=cfg.priority.node.closest ? cfg.priority.node.closest('.bb-field') : null;
      pd.appendChild(cfg.priority.node);
      if(pf && pf.parentNode && !pf.querySelector('.bb-priorities')) pf.parentNode.removeChild(pf);   // the old Priority field is empty now
      // No eyeball (Nov 11 2026): a priority always shows on the card front. A card that was set back-only before is put right here, once.
      if(cfg.priority.eye && cfg.priority.eye.isShown && !cfg.priority.eye.isShown() && cfg.priority.eye.setShown) cfg.priority.eye.setShown(true);
      block.appendChild(pd);
      priRow={d:pd, cb:pcb, cfg:cfg.priority};
    }
    rowsDef.forEach(function(row){
      var d=document.createElement('div'); d.className='fg-fixed-row'; d.setAttribute('data-fg-sort',row.label);
      var lab=document.createElement('label');
      var cb=document.createElement('input'); cb.type='checkbox';
      var tx=document.createElement('span'); tx.textContent=row.label;
      lab.appendChild(cb); lab.appendChild(tx);
      d.appendChild(lab);
      cb.className='fg-tri';
      // Nov 6 2026 (Larry): the Gear's card display list hides a feature everywhere on a card, back included; tag the row (and its opened body) with its feature.
      var feat=FEATURE_OF_ROW[row.id];
      if(feat){ d.setAttribute('data-fg-feature', feat); bodiesOf(row).forEach(function(b){ b.setAttribute('data-fg-feature', feat); }); }
      block.appendChild(d);
      row.d=d;
      cb.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        advance(key,row);
        setTimeout(sync,0);   // the browser flips the box back after this handler; paint the true state once it has
      });
      rows.push({row:row, cb:cb});
    });
    // LINK (Nov 1 2026, Larry): an OPTION on every card -- three colored arrows (lime, orange, hot pink by slot). One module, T2TLinks, makes the row.
    // cfg.link = {cardId(): the open card's id, fromKind:'BB'|'SB', theme:'bb'|'idea', isHidden(id)}; a check box + eyeball at the foot of the main OPTIONS list that opens the three-link popup.
    var linkRow=null;
    if(cfg.link && window.T2TLinks){ linkRow=T2TLinks.buildRow(Object.assign({getHidden:cfg.getHidden, setHidden:cfg.setHidden}, cfg.link)); block.appendChild(linkRow); linkRow.setAttribute('data-fg-feature','link'); linkRow.setAttribute('data-fg-sort','Link'); if(linkRow.__body) linkRow.__body.setAttribute('data-fg-feature','link'); }
    // Action rows (e.g. Duplicate): a plain button on its own full-width line, no checkbox.
    var acts=[];
    (cfg.actions||[]).forEach(function(a){
      var d=document.createElement('div'); d.className='fg-fixed-row fg-gear-action'; d.setAttribute('data-fg-sort',a.label);
      if(a.checkbox){
        // Oct 25 2026 (Larry): COMPLETE and VERIFIED are check boxes. Clicking runs the action; the box shows whether it is already true (isOn).
        var lab2=document.createElement('label'); lab2.title=a.title||a.label;
        var cb2=document.createElement('input'); cb2.type='checkbox'; cb2.className='fg-tri';
        if(a.probe){ try{ a.probe().then(function(v){ a._on=!!v; sync(); }); }catch(e){} a.isOn=function(){ return !!a._on; }; }   // a check box whose truth is looked up (Notes: does the card have a note?)
        var tx2=document.createElement('span'); tx2.textContent=a.label;
        lab2.appendChild(cb2); lab2.appendChild(tx2); d.appendChild(lab2);
        cb2.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation();
          if(a.toggle || !(a.isOn && a.isOn())) a.run();   // a.toggle (Oct 31 2026, Subject Bold / CAPS): the box flips both ways
          setTimeout(sync,0);
        });
        acts.push({a:a, cb:cb2});
      } else {
        var btn=document.createElement('button'); btn.type='button'; btn.className='fg-fixed-btn'; btn.title=a.title||a.label;
        btn.innerHTML=(a.icon||'')+'<span>'+a.label+'</span>';
        btn.addEventListener('click', function(e){ e.stopPropagation(); a.run(); });
        d.appendChild(btn);
      }
      block.appendChild(d);
    });
    // A main OPTIONS checklist is sorted A-Z as a whole: Priority, Link and the action rows (Notes) sit among the rest.
    if(!cfg.key || cfg.key==='main' || cfg.eyebrow){
      Array.prototype.slice.call(block.children).filter(function(c){ return c.hasAttribute('data-fg-sort'); })
        .sort(function(a,b){ return a.getAttribute('data-fg-sort').localeCompare(b.getAttribute('data-fg-sort')); })
        .forEach(function(c){ block.appendChild(c); });
    }
    var linkHost=null;   // where LINK's opened body goes: the right column, like every other opened option (Nov 1 2026, Larry)
    if(cfg.mount) cfg.mount(block);
    else {
      // Sits above the opened items, right under Priority / Subject / Task.
      var anchor=bbw.querySelector('.fg-back-selected');
      if(anchor){
        // Oct 29 2026 (Larry: "move OPTIONS checklist up so all features are visible without scroll"): the checklist sits LEFT, level with TASK;
        // TASK and whatever is open stack on the RIGHT. This saves a whole row of height on the 3x5 card.
        var split=document.createElement('div'); split.className='fg-back-split';
        anchor.parentNode.insertBefore(split, anchor);
        var right=document.createElement('div'); right.className='fg-back-right';
        // Oct 30 2026 (Larry: the task card "should look more like Idea card with full width task contents"): TASK stays where it is, full width
        // across the card like the Idea card's Contents box, above the split. Only the opened items ride the right column now.
        right.appendChild(anchor);
        split.appendChild(block); split.appendChild(right); linkHost=right;
      } else bbw.appendChild(block);
    }
    if(linkRow && linkRow.__body) (linkHost||block).appendChild(linkRow.__body);
    instances[key]={rows:rows, cfg:cfg, block:block, acts:acts, pri:priRow, link:linkRow};
    // Any change to a real box (from here, from older code, or from a card opening) re-reads the rows.
    rowsDef.forEach(function(r){ r.boxes.forEach(function(id){ var b=real(id); if(b) b.addEventListener('change', sync); }); });
    sync();
  }

  // ---- the three-click cycle -------------------------------------------------------------------------------------------
  // The old COMPLETE state is retired (Nov 11 2026): a leftover done word on an older card is cleared the first time its row is clicked.
  function doneKey(row){ return 'done:'+row.id; }
  function frontKeys(row){ return row.eyeKeys||[]; }
  // front_hidden holds a feature's word when it shows on the BACK only; no word = it also shows on the front.
  function isBackOnly(inst,row){ var h=inst.cfg.getHidden()||[]; return frontKeys(row).every(function(k){ return h.indexOf(k)>=0; }); }
  function patchHidden(inst,row,front){   // front: true = remove the words (front too), false = add them (back only), null = leave them
    var cur=(inst.cfg.getHidden()||[]).slice(), before=cur.join(','), i=cur.indexOf(doneKey(row));
    if(i>=0) cur.splice(i,1);
    if(front!==null) frontKeys(row).forEach(function(k){ var j=cur.indexOf(k); if(front){ if(j>=0) cur.splice(j,1); } else if(j<0) cur.push(k); });
    if(cur.join(',')!==before) inst.cfg.setHidden(cur);
  }
  function setReal(row,on){
    row.boxes.forEach(function(id){ var b=real(id); if(!b || b.checked===on) return; b.checked=on; b.dispatchEvent(new Event('change',{bubbles:true})); });
  }
  function bodiesOf(row){ return (row.bodies||[]).map(real).filter(Boolean); }
  function fieldsOf(row){
    var out=[]; bodiesOf(row).forEach(function(b){ Array.prototype.forEach.call(b.querySelectorAll('input,textarea,select'), function(f){ out.push(f); }); });
    return out;
  }
  function fireChange(f){ f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); }
  // What the row held when it was opened, so Escape can say "nevermind". Dropped once you do anything outside the row.
  var drafts={};
  function takeDraft(key,row){
    var snap=fieldsOf(row).map(function(f){ return {f:f, checked:f.checked, value:f.value}; });
    drafts[key+':'+row.id]={snap:snap, wasEmpty:snap.every(function(x){ return (x.f.type==='checkbox'||x.f.type==='radio') ? !x.checked : !String(x.value||'').trim(); })};
  }
  function dropDrafts(exceptKey){
    Object.keys(drafts).forEach(function(k){ if(k!==exceptKey) delete drafts[k]; });
  }
  function nevermind(key,row){
    var d=drafts[key+':'+row.id]; if(!d) return false;
    d.snap.forEach(function(x){
      if(x.f.type==='checkbox'||x.f.type==='radio') x.f.checked=x.checked; else x.f.value=x.value;
      fireChange(x.f);
    });
    if(d.wasEmpty) setReal(row,false);
    delete drafts[key+':'+row.id];
    setTimeout(sync,0);
    return true;
  }
  function advance(key,row){
    var inst=instances[key]; if(!inst) return;
    dropDrafts(key+':'+row.id);   // anything done outside another open row makes that row's entry permanent
    var on=isOn(row), hasFront=frontKeys(row).length>0;
    if(!on){                                   // click 1: shows on the back (editable)
      patchHidden(inst,row,hasFront?false:null); setReal(row,true); takeDraft(key,row);
    } else if(hasFront && isBackOnly(inst,row)){   // click 2: also shows on the front
      delete drafts[key+':'+row.id]; patchHidden(inst,row,true);
    } else {                                   // click 3 (or click 2 when there is no front): hidden again; the entry stays saved
      delete drafts[key+':'+row.id]; patchHidden(inst,row,null); setReal(row,false);
    }
  }
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape') return;
    Object.keys(instances).forEach(function(key){
      instances[key].rows.forEach(function(x){
        if(!drafts[key+':'+x.row.id]) return;
        var a=document.activeElement;
        if(a && bodiesOf(x.row).some(function(b){ return b.contains(a); })){ if(nevermind(key,x.row)){ e.stopPropagation(); } }
      });
    });
  }, true);
  // Clicking or typing anywhere outside an open row's own details leaves that row (its draft becomes permanent).
  document.addEventListener('mousedown', function(e){
    Object.keys(drafts).forEach(function(k){
      var parts=k.split(':'), key=parts[0], rid=parts.slice(1).join(':'), inst=instances[key]; if(!inst) return;
      var x=inst.rows.filter(function(r){ return r.row.id===rid; })[0]; if(!x) return;
      var inside=bodiesOf(x.row).some(function(b){ return b.contains(e.target); }) || (x.row.d && x.row.d.contains(e.target));
      if(!inside) delete drafts[k];
    });
  }, true);

  function sync(){
    Object.keys(instances).forEach(function(k){
      var inst=instances[k];
      inst.rows.forEach(function(x){
        var on=isOn(x.row), front=on && frontKeys(x.row).length>0 && !isBackOnly(inst,x.row), st=!on?0:(front?2:1);
        x.cb.checked=on;
        x.cb.setAttribute('data-st', String(st));
        x.cb.parentNode.title = st===0 ? 'Click to show on the back of the card' : (st===1 ? (frontKeys(x.row).length?'Shows on the back. Click to also show on the front':'Shown. Click to hide') : 'Shows on the back and the front. Click to hide');
        if(x.row.d) x.row.d.classList.remove('fg-done');
        bodiesOf(x.row).forEach(function(b){ b.classList.remove('fg-row-done-body'); });
      });
      (inst.acts||[]).forEach(function(x){
        var on=!!(x.a.isOn && x.a.isOn()); x.cb.checked=on; x.cb.setAttribute('data-st', on?'1':'0');
        // Nov 11 2026: the back is reused card to card, so a check box whose truth is looked up (Notes) is looked up again for each card that opens.
        if(x.a.probe && !x.probing){
          x.probing=true;
          try{ x.a.probe().then(function(v){ x.probing=false; v=!!v; if(v!==!!x.a._on){ x.a._on=v; x.cb.checked=v; x.cb.setAttribute('data-st', v?'1':'0'); } }, function(){ x.probing=false; }); }catch(e){ x.probing=false; }
        }
      });
    });
    paintPri();
  }

  // The back is reused card to card, so every card that opens repaints its LINK arrows.
  function refreshLinks(){ Object.keys(instances).forEach(function(k){ var l=instances[k].link; if(l && l.__paint) l.__paint(); }); }
  window.FGCardBackFixedRows = { build:build, sync:sync, paintPri:paintPri, refreshLinks:refreshLinks, GEAR_ROWS:GEAR_ROWS };
})();
