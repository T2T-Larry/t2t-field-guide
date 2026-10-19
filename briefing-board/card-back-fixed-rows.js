/* ============================================================
   card-back-fixed-rows.js -- T2T Field Guide - THE FOUR FIXED ROWS ON EVERY TASK CARD BACK

   Oct 19 2026 (Larry): every task back carries the same four checklist rows, always visible, replacing the OPTIONS (+) popup:
     DATES        -- opens the Start Date and Due Date fields (type a date or pick it from the calendar)
     SIGNAL FLAGS -- opens the flags
     VISION       -- puts a VISION badge on the card (this task needs a Vision statement) and adds its header to the VISION board
     PLAN         -- the NEEDS PLAN switch: the card goes to the PLAN Parking Lot to become a GOAL
   Each row has the slashed eye: it chooses whether that item also shows on the card front.
   Nothing new is stored here: each row drives the real checkbox that already exists on the back (same ids, same saving).
   Public surface: window.FGCardBackFixedRows  .build(bbw, cfg)   cfg = {getHidden, setHidden}   .sync()
   ============================================================ */
(function(){
  var ROWS = [
    { id:'dates',  label:'Dates',        boxes:['bb-d-add-start','bb-d-add-due'], eyeKeys:['start','due'] },
    { id:'flags',  label:'Signal Flags', boxes:['bb-d-add-flags'],                eyeKeys:['flags'] },
    { id:'vision', label:'Vision',       boxes:['bb-d-needs-vision'],             eyeKeys:['vision'] },
    { id:'plan',   label:'Plan',         boxes:['bb-d-needs-plan'],               eyeKeys:['plan'] }
  ];
  var built=null;

  function injectStyle(){
    if(document.getElementById('fg-fixed-rows-style')) return;
    var st=document.createElement('style'); st.id='fg-fixed-rows-style';
    st.textContent=''
      +'.fg-back-fixed{display:flex;flex-direction:column;gap:2px;width:100%;margin:2px 0 8px;padding:4px 0 6px;border-bottom:1px dotted var(--bb-accent)}'
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
    if(!bbw || bbw.querySelector('.fg-back-fixed')) return;
    injectStyle();
    var block=document.createElement('div'); block.className='fg-back-fixed';
    var rows=[];
    ROWS.forEach(function(row){
      var d=document.createElement('div'); d.className='fg-fixed-row';
      var lab=document.createElement('label');
      var cb=document.createElement('input'); cb.type='checkbox';
      var tx=document.createElement('span'); tx.textContent=row.label;
      lab.appendChild(cb); lab.appendChild(tx);
      var eye=document.createElement('button'); eye.type='button'; eye.className='fg-back-eye';
      d.appendChild(lab); d.appendChild(eye); block.appendChild(d);
      cb.addEventListener('change', function(){
        row.boxes.forEach(function(id){
          var b=real(id); if(!b || b.checked===cb.checked) return;
          b.checked=cb.checked; b.dispatchEvent(new Event('change',{bubbles:true}));
        });
      });
      eye.addEventListener('click', function(e){
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
    // Sits above the opened items, right under Priority / Subject / Task.
    var anchor=bbw.querySelector('.fg-back-selected');
    if(anchor) anchor.parentNode.insertBefore(block, anchor); else bbw.appendChild(block);
    built={rows:rows, cfg:cfg};
    // Any change to a real box (from here, from older code, or from a card opening) re-reads all four.
    ROWS.forEach(function(r){ r.boxes.forEach(function(id){ var b=real(id); if(b) b.addEventListener('change', sync); }); });
    sync();
  }

  function sync(){
    if(!built) return;
    built.rows.forEach(function(x){ x.cb.checked=isOn(x.row); paintEye(x.eye, x.row, built.cfg); });
  }

  window.FGCardBackFixedRows = { build:build, sync:sync };
})();
