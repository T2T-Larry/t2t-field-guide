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
   Public surface: window.FGCardBackFixedRows  .build(bbw, cfg)   cfg = {getHidden, setHidden, rows?, mount?, key?, className?, extra?}   .sync()
   ============================================================ */
(function(){
  var ROWS = [
    { id:'dates',  label:'Dates',        boxes:['bb-d-add-start','bb-d-add-due'], eyeKeys:['start','due'] },
    { id:'flags',  label:'Signal Flags', boxes:['bb-d-add-flags'],                eyeKeys:['flags'] },
    { id:'vision', label:'Vision',       boxes:['bb-d-needs-vision'],             eyeKeys:['vision'] },
    { id:'plan',   label:'Plan',         boxes:['bb-d-needs-plan'],               eyeKeys:['plan'] }
  ];
  // The Gear's rows (Oct 20 2026). Routine is the only one that draws on the card face; the rest have no eye.
  var GEAR_ROWS = [
    { id:'org',     label:'Organization', boxes:['bb-d-add-org'],     eyeKeys:[] },
    { id:'routine', label:'Routine',      boxes:['bb-d-add-routine'], eyeKeys:['routine'] },
    { id:'budget',  label:'Budget',       boxes:['bb-d-add-budget'],  eyeKeys:[] },
    { id:'links',   label:'Links',        boxes:['bb-d-add-links'],   eyeKeys:[] }
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
      +'.fg-fixed-row{display:flex;align-items:center;gap:6px;min-height:24px}'
      +'.fg-fixed-row label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-fixed-row input[type=checkbox]{margin:0;width:15px;height:15px;cursor:pointer}'
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
      cb.addEventListener('change', function(){
        row.boxes.forEach(function(id){
          var b=real(id); if(!b || b.checked===cb.checked) return;
          b.checked=cb.checked; b.dispatchEvent(new Event('change',{bubbles:true}));
        });
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
      if(anchor) anchor.parentNode.insertBefore(block, anchor); else bbw.appendChild(block);
    }
    instances[key]={rows:rows, cfg:cfg, block:block};
    // Any change to a real box (from here, from older code, or from a card opening) re-reads the rows.
    rowsDef.forEach(function(r){ r.boxes.forEach(function(id){ var b=real(id); if(b) b.addEventListener('change', sync); }); });
    sync();
  }

  function sync(){
    Object.keys(instances).forEach(function(k){
      var inst=instances[k];
      inst.rows.forEach(function(x){ x.cb.checked=isOn(x.row); if(x.eye) paintEye(x.eye, x.row, inst.cfg); });
    });
  }

  window.FGCardBackFixedRows = { build:build, sync:sync, GEAR_ROWS:GEAR_ROWS };
})();
