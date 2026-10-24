/* ============================================================
   card-back-fixed-rows.js -- T2T Field Guide - THE FOUR FIXED ROWS ON EVERY TASK CARD BACK

   Oct 19 2026 (Larry): every task back carries the same four checklist rows, always visible, replacing the OPTIONS (+) popup:
     DATES        -- opens the Start Date and Due Date fields (type a date or pick it from the calendar)
     SIGNAL FLAGS -- opens the flags
     VISION       -- puts a VISION badge on the card (this task needs a Vision statement) and adds its header to the VISION board
     PLAN         -- the NEEDS PLAN switch: the card goes to the PLAN Parking Lot to become a GOAL
   Each row has the slashed eye: it chooses whether that item also shows on the card front.
   Nothing new is stored here: each row drives the real checkbox that already exists on the back (same ids, same saving).
   Oct 20 2026 (Larry: "redesign the Gear to test our system"): the SAME builder now also makes the Gear's rows --
     ORGANIZATION, ROUTINE, BUDGET, LINKS (each with its eye where it draws on the front), plus Duplicate -- so one tree, one code.
   Oct 20 2026 (Larry): EVERY checklist row works the same three-click way (one tree, one code):
     unchecked = nothing showing.  Click 1 = OPEN (its field or inner checklist shows, editable).  Click 2 = COMPLETE (row lined through; its entry is
     kept but hidden and locked).  Click 3 = RESET (unchecked; the saved entry is kept, so click 1 again reopens it with the previous entry).
     "Nevermind": Escape while a row is open puts back what the row held when it was opened (an empty field goes back to unchecked). An entry is permanent
     once you do anything outside that row. COMPLETE is remembered on the card as a "done:<row>" word in the same list the eyes use (front_hidden).
   The checklist sits LEFT and whatever is open sits to its RIGHT, like Situation on the Hang Up card.
   Public surface: window.FGCardBackFixedRows  .build(bbw, cfg)   cfg = {getHidden, setHidden, rows?, mount?, key?, className?, extra?}   .sync()
   ============================================================ */
(function(){
  var ROWS = [
    { id:'dates',  label:'Dates',        boxes:['bb-d-add-start','bb-d-add-due'], eyeKeys:['start','due'], bodies:['bb-d-start-body','bb-d-due-body'] },
    { id:'flags',  label:'Signal Flags', boxes:['bb-d-add-flags'],                eyeKeys:['flags'],       bodies:['bb-d-flags-body'] },
    { id:'review', label:'Review',       boxes:['bb-d-add-review'],               eyeKeys:[],              bodies:['bb-d-review-body'] }
  ];
  // The Gear's rows (Oct 20 2026). Routine is the only one that draws on the card face; the rest have no eye.
  var GEAR_ROWS = [
    { id:'org',     label:'Organization', boxes:['bb-d-add-org'],     eyeKeys:[],          bodies:['bb-d-org-body'] },
    { id:'routine', label:'Routine',      boxes:['bb-d-add-routine'], eyeKeys:['routine'], bodies:['bb-d-routine-body'] },
    { id:'budget',  label:'Budget',       boxes:['bb-d-add-budget'],  eyeKeys:[],          bodies:['bb-d-budget-body'] },
    { id:'links',   label:'Links',        boxes:['bb-d-add-links'],   eyeKeys:[],          bodies:['bb-d-links-body'] }
  ];
  var instances={};

  function injectStyle(){
    if(document.getElementById('fg-fixed-rows-style')) return;
    var st=document.createElement('style'); st.id='fg-fixed-rows-style';
    st.textContent=''
      +'.fg-back-fixed{display:flex;flex-direction:column;gap:2px;width:100%;margin:2px 0 8px;padding:4px 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      // Gear panel (Oct 20 2026): the rows sit two across so the whole Gear stays short; opened bodies follow underneath at full width.
      +'.fg-back-fixed.fg-gear-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;margin:4px 0 4px;padding:4px 0}'
      +'.fg-gear-rows .fg-fixed-row.fg-gear-action{grid-column:1 / -1;justify-content:flex-start}'
      +'.fg-fixed-row .fg-fixed-btn{display:flex;align-items:center;gap:7px;cursor:pointer;background:transparent;border:0;padding:0;font:inherit;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-back-util-extra>.bb-addition>.bb-addition-label{display:none}'
      +'.fg-back-util-extra>.bb-addition{margin:0}'
      +'.fg-fixed-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:2px}'
      +'.fg-fixed-row{display:flex;align-items:center;gap:6px;min-height:24px}'
      +'.fg-fixed-row label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-fixed-row input[type=checkbox]{margin:0;width:15px;height:15px;cursor:pointer}'
      // Left = the checklist, right = whatever is open (Oct 20 2026). Narrow screens stack them.
      +'.fg-back-split{display:grid;grid-template-columns:minmax(104px,36%) minmax(0,1fr);column-gap:12px;align-items:start;width:100%}'
      +'.fg-back-split>.fg-back-fixed{border-bottom:0;margin:2px 0}'
      +'.fg-back-split>.fg-back-selected{margin-top:2px}'
      +'@media (max-width:420px){.fg-back-split{grid-template-columns:1fr}}'
      +'.fg-fixed-row.fg-done label span{text-decoration:line-through;opacity:.6}'
      +'.fg-row-done-body{display:none!important}'
      // Review's own checklist: indented, PRO / GROW / COMPLETE on the left, their comments to the right under REVIEWED BY (Oct 20 2026).
      +'.fg-review-grid{display:grid;grid-template-columns:minmax(72px,34%) minmax(0,1fr);column-gap:8px;align-items:start;width:100%}'
      +'.fg-review-left{padding-left:12px}'
      +'.fg-review-left .fg-back-fixed{border-bottom:0;margin:0;padding:0}'
      +'.fg-review-left .fg-fixed-row.fg-gear-action{grid-column:auto}'
      +'.fg-review-right textarea{width:100%;box-sizing:border-box;min-height:44px}'
      // The OPTIONS (+) popup button is retired: the four rows replace it (Larry, Oct 19 2026).
      +'.fg-back-3x5 .bb-action-row .fg-opt-btn{display:none!important}';
    document.head.appendChild(st);
  }
  function real(id){ return document.getElementById(id); }
  function isOn(row){ return row.boxes.some(function(id){ var b=real(id); return b && b.checked; }); }

  function paintEye(btn, row, cfg){
    var hidden=(cfg.getHidden()||[]);
    var backOnly=row.eyeKeys.every(function(k){ return hidden.indexOf(k)>=0; });
    var ic=window.FGCardBackOptions && FGCardBackOptions.eyeIcons;
    btn.innerHTML = ic ? (backOnly ? ic.slash : ic.open) : (backOnly ? '⊘' : '◉');
    btn.classList.toggle('fg-eye-off', backOnly);
    btn.title = backOnly ? 'Back only: click to also show on the front' : 'Shows on the front: click for back only';
  }

  function build(bbw, cfg){
    var key=cfg.key||'main', rowsDef=cfg.rows||ROWS;
    if(!bbw || instances[key] && instances[key].block.isConnected) return;
    injectStyle();
    var block=document.createElement('div'); block.className='fg-back-fixed'+(cfg.className?' '+cfg.className:'');
    var rows=[];
    // OPTIONS eyebrow, Oct 24 2026 (Larry): the main checklist of a card back is headed OPTIONS.
    if(!cfg.key || cfg.key==='main'){
      var eb=document.createElement('div'); eb.className='fg-fixed-eyebrow'; eb.textContent='Options'; block.appendChild(eb);
    }
    rowsDef.forEach(function(row){
      var d=document.createElement('div'); d.className='fg-fixed-row';
      var lab=document.createElement('label');
      var cb=document.createElement('input'); cb.type='checkbox';
      var tx=document.createElement('span'); tx.textContent=row.label;
      lab.appendChild(cb); lab.appendChild(tx);
      d.appendChild(lab);
      var eye=null;
      if(row.eyeKeys && row.eyeKeys.length){
        eye=document.createElement('button'); eye.type='button'; eye.className='fg-back-eye';
        d.appendChild(eye);
      }
      block.appendChild(d);
      row.d=d;
      cb.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        advance(key,row);
        setTimeout(sync,0);   // the browser flips the box back after this handler; paint the true state once it has
      });
      if(eye) eye.addEventListener('click', function(e){
        e.stopPropagation();
        var cur=(cfg.getHidden()||[]).slice();
        var backOnly=row.eyeKeys.every(function(k){ return cur.indexOf(k)>=0; });
        row.eyeKeys.forEach(function(k){
          var i=cur.indexOf(k);
          if(backOnly){ if(i>=0) cur.splice(i,1); } else if(i<0){ cur.push(k); }
        });
        cfg.setHidden(cur);
        paintEye(eye, row, cfg);
      });
      rows.push({row:row, cb:cb, eye:eye});
    });
    // Action rows (e.g. Duplicate): a plain button on its own full-width line, no checkbox.
    (cfg.actions||[]).forEach(function(a){
      var d=document.createElement('div'); d.className='fg-fixed-row fg-gear-action';
      var btn=document.createElement('button'); btn.type='button'; btn.className='fg-fixed-btn'; btn.title=a.title||a.label;
      btn.innerHTML=(a.icon||'')+'<span>'+a.label+'</span>';
      btn.addEventListener('click', function(e){ e.stopPropagation(); a.run(); });
      d.appendChild(btn); block.appendChild(d);
    });
    if(cfg.mount) cfg.mount(block);
    else {
      // Sits above the opened items, right under Priority / Subject / Task.
      var anchor=bbw.querySelector('.fg-back-selected');
      if(anchor){
        var split=document.createElement('div'); split.className='fg-back-split';
        anchor.parentNode.insertBefore(split, anchor);
        split.appendChild(block); split.appendChild(anchor);
      } else bbw.appendChild(block);
    }
    instances[key]={rows:rows, cfg:cfg, block:block};
    // Any change to a real box (from here, from older code, or from a card opening) re-reads the rows.
    rowsDef.forEach(function(r){ r.boxes.forEach(function(id){ var b=real(id); if(b) b.addEventListener('change', sync); }); });
    sync();
  }

  // ---- the three-click cycle -------------------------------------------------------------------------------------------
  function doneKey(row){ return 'done:'+row.id; }
  function isDone(inst,row){ return (inst.cfg.getHidden()||[]).indexOf(doneKey(row))>=0; }
  function setDone(inst,row,on){
    var cur=(inst.cfg.getHidden()||[]).slice(), i=cur.indexOf(doneKey(row));
    if(on && i<0) cur.push(doneKey(row)); else if(!on && i>=0) cur.splice(i,1); else return;
    inst.cfg.setHidden(cur);
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
    var on=isOn(row), done=on && isDone(inst,row);
    if(!on){                       // click 1: open (editable)
      setDone(inst,row,false); setReal(row,true); takeDraft(key,row);
    } else if(!done){              // click 2: complete (kept, hidden, locked)
      delete drafts[key+':'+row.id]; setDone(inst,row,true);
    } else {                       // click 3: reset (entry stays saved; click 1 brings it back)
      setDone(inst,row,false); setReal(row,false);
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
        var on=isOn(x.row), done=on && isDone(inst,x.row);
        x.cb.checked=on;
        if(x.row.d) x.row.d.classList.toggle('fg-done', done);
        bodiesOf(x.row).forEach(function(b){ b.classList.toggle('fg-row-done-body', done); });
        if(x.eye) paintEye(x.eye, x.row, inst.cfg);
      });
    });
  }

  window.FGCardBackFixedRows = { build:build, sync:sync, GEAR_ROWS:GEAR_ROWS };
})();
