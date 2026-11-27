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
   PRIORITY (Nov 27 2026, Larry: "Priority should work like all features on any card"): an OPTIONS row like the rest, on every card. The box is checked
   when the card has a priority; the card's own H M L buttons (same wiring) wait in the row and ride in the Priority popup:
   cfg.priority = {node (the .bb-priorities element), getValue()}.
   Nov 26 2026 (Larry): the OPTIONS popup is the popup of every feature (controls/feature-place.js), with the OPTION / UTILITY toggle under a divider at its foot.
     cfg.popup = the checklist is only a store the popups draw from (the old Gear rows); cfg.getItem = the card's row, for the Color and Text popups.
   Public surface: window.FGCardBackFixedRows  .build(bbw, cfg)   cfg = {getHidden, setHidden, rows?, mount?, key?, className?, popup?, getItem?, priority?}   .sync()
     .instances()  .openSpec(key,row,level)  .openId()  .closePopup()
   ============================================================ */
(function(){
  var ROWS = [
    { id:'order',  label:'Order',        boxes:['bb-d-add-order'],                eyeKeys:[],              bodies:['bb-d-order-body'] },
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
      +'.fg-gear-set>.fg-back-fixed.fg-gear-rows{margin:0}'
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
      // OPTION SPACE (Nov 26 2026, Larry: "Even if there are no features selected, there should be enough space between CONTENTS field and lower divider line
      // for a popup the size of the COLOR selector. It is like a workspace for options and their list"): every card back keeps this room, and popups open in it.
      +'.fg-back-3x5 .fg-back-split{min-height:calc(142px * var(--fg-text-scale,1));align-items:stretch}'
      +'.fg-back-right>.fg-back-selected{margin-top:2px}'
      +'.fg-back-right>.fg-back-task{margin-bottom:4px!important}'
      +'@media (max-width:420px){.fg-back-split{grid-template-columns:1fr}.fg-back-split>.fg-back-fixed{border-right:0;padding-right:0}}'
      +'.fg-fixed-row.fg-pri-row .bb-priorities{display:none}'
      // In the Priority popup the H M L buttons look like buttons (a chosen one wears its priority color, set on the button itself).
      +'.fg-opt-popup .fg-opt-pop-body>.bb-priorities{display:flex;justify-content:center;gap:12px;margin:4px 0 8px}'
      +'.fg-opt-popup .fg-opt-pop-body>.bb-priorities .bb-pri-btn{flex:0 0 auto;min-width:40px;height:28px;padding:0 10px;border:1.5px solid var(--bb-ink,#555);border-radius:6px;background:#fff;color:inherit;font-family:inherit;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;cursor:pointer}'
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
      // Their exact spot is measured by FGCardSchedule.reviewBand() in controls/card-schedule.js, so it stays equal on any card width.
      +'.bb-action-row .bb-pg-band,.bb-action-row .bb-verified-band{position:absolute;top:50%;left:25%;transform:translate(-50%,-50%);margin-top:2px;display:flex;align-items:center;gap:10px;white-space:nowrap}'
      +'.bb-action-row .bb-pg-band .fg-fixed-row,.bb-action-row .bb-verified-band .fg-fixed-row{min-height:0}'
      +'.bb-action-row .bb-pg-band label,.bb-action-row .bb-verified-band label{font-size:calc(10px * var(--fg-text-scale,1))}'
      // The OPTIONS (+) popup button is retired: the four rows replace it (Larry, Oct 19 2026).
      +'.fg-back-3x5 .bb-action-row .fg-opt-btn{display:none!important}'
      // Nov 22 2026 (Larry: "click on the box or the title opens and closes the popup, all one button; all the real action takes place in the popup;
      // the green check appears on activation in the popup"): the OPTIONS checklist is a launcher. The check is a green status light; each row's
      // details (its opened body) wait out of sight until the popup carries them.
      +'.fg-opt-mode .fg-fixed-row label{cursor:pointer}'
      +'.fg-opt-parked{display:none!important}'
      +'.fg-opt-popup{position:fixed;z-index:100001;box-sizing:border-box;min-width:240px;min-height:calc(142px * var(--fg-text-scale,1));max-height:min(70vh,460px);overflow-y:auto;background:#fff;border:2px solid var(--bb-ink,#444);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:0 12px 6px;color:var(--bb-ink,#333);font-family:var(--bb-body-font,Georgia,serif)}'
      +'.fg-opt-pop-head{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;margin-bottom:3px}'
      +'.fg-opt-pop-head.has-bar{padding-bottom:2px;border-bottom:1px dotted var(--bb-accent,#999)}'
      +'.fg-opt-pop-bar{display:flex;align-items:center;gap:8px}'
      +'.fg-opt-pop-on{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase}'
      +'.fg-opt-pop-on input{margin:0;width:15px;height:15px;cursor:pointer;accent-color:#1e9e4a}'
      +'.fg-opt-pop-eye{display:flex;align-items:center;gap:5px;padding:2px 4px;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:4px;font-size:calc(10px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;font-family:inherit}'
      +'.fg-opt-pop-eye:hover{background:rgba(128,128,128,.18)}'
      +'.fg-opt-pop-eye[hidden]{display:none}'
      +'.fg-opt-popup .bb-addition-body{margin:0;padding:0;border:0}'
      // Band and bar stay put, the controls scroll if they must, the divider and toggle stay at the foot.
      +'.fg-opt-popup{display:flex;flex-direction:column;overflow:hidden}'
      +'.fg-opt-popup>.fg-opt-pop-head{flex:0 0 auto}'
      +'.fg-opt-popup .fg-opt-dup,.fg-opt-popup .fg-lib-eyebrow{display:none!important}'   // the popup's own title already says it
      +'.fg-opt-none{font-size:calc(11px * var(--fg-text-scale,1));opacity:.75;padding:4px 0}'
      +'.fg-opt-pop-body{flex:1 1 auto;min-height:0;overflow-y:auto}'
      +'.fg-back-menu{z-index:100010!important}'   // a LINK's TOPIC and BOARD lists open above the popup
      // Start Date and Due Date together fit the standard box without scrolling.
      +'.fg-opt-popup.fg-opt-dates{padding-bottom:4px}'
      +'.fg-opt-dates .fg-opt-pop-head{margin-bottom:1px;padding-bottom:0}'
      +'.fg-opt-dates .bb-field{margin:0 0 2px;max-width:none}'
      +'.fg-opt-dates .bb-field label{margin-bottom:0}'
      +'.fg-opt-dates .bb-date-row input[type=text]{padding-top:0;padding-bottom:0}'
      +'.fg-opt-dates .fg-back-daterow{gap:0}'
      +'.fg-opt-dates .bb-date-row .bb-icon-btn{height:22px;min-height:0}'
      +'.fg-opt-dates .fg-opt-pop-eye{padding-top:0;padding-bottom:0}'
      +'.fg-opt-dates .fg-back-opt-title{margin-bottom:0;min-height:0}'
      +'.fg-opt-dates .fg-back-opt-title .fg-back-eye{height:14px;min-height:0;padding-top:0;padding-bottom:0}'
      +'.fg-opt-dates .fg-back-opt-title .fg-back-eye svg{height:12px}';
    document.head.appendChild(st);
  }
  function real(id){ return document.getElementById(id); }
  function isOn(row){ return row.boxes.some(function(id){ var b=real(id); return b && b.checked; }); }

  // The Priority row's box: checked when the card has a priority.
  function paintPri(){
    Object.keys(instances).forEach(function(k){
      var p=instances[k].pri; if(!p) return;   // p = {d, cb, cfg}
      p.cb.checked=!!(p.cfg.getValue && p.cfg.getValue()); p.cb.setAttribute('data-st', p.cb.checked?'1':'0');
    });
  }

  function build(bbw, cfg){
    var key=cfg.key||'main', rowsDef=(cfg.rows||ROWS).slice();
    // Nov 11 2026 (Larry: "put all options in alphabetical order for ease of finding"): every checklist is in A-Z order. Review's own PRO - GROW pair keeps its order.
    if(key!=='review') rowsDef.sort(function(a,b){ return String(a.label).localeCompare(String(b.label)); });
    if(!bbw || instances[key] && instances[key].block.isConnected) return;
    closePopup();   // a new card back never inherits the last card's open popup
    injectStyle();
    // The main OPTIONS checklist (task back, idea back) is the launcher for popups; the Gear's rows keep their own way.
    var isMain = !cfg.key || cfg.key==='main' || !!cfg.eyebrow;
    var isOptions = isMain || !!cfg.popup;
    var block=document.createElement('div'); block.className='fg-back-fixed'+(cfg.className?' '+cfg.className:'')+(isOptions?' fg-opt-mode':'');
    var rows=[];
    // OPTIONS eyebrow, Oct 24 2026 (Larry): the main checklist of a card back is headed OPTIONS.
    if(!cfg.key || cfg.key==='main' || cfg.eyebrow){
      var eb=document.createElement('div'); eb.className='fg-fixed-eyebrow'; eb.textContent='Options'; block.appendChild(eb);
    }
    // PRIORITY: its row opens the same popup as the FEATURES list. Only the main checklist carries it.
    var priRow=null;
    if(cfg.priority && cfg.priority.node){
      var pd=document.createElement('div'); pd.className='fg-fixed-row fg-pri-row'; pd.setAttribute('data-fg-sort','Priority');
      var plab=document.createElement('label'); plab.title='Click to open or close its popup';
      var pcb=document.createElement('input'); pcb.type='checkbox'; pcb.className='fg-pri-check fg-tri'; pcb.id='bb-d-pri-check'; pcb.tabIndex=-1;
      var ptx=document.createElement('span'); ptx.textContent='Priority';
      plab.appendChild(pcb); plab.appendChild(ptx); pd.appendChild(plab);
      var pf=cfg.priority.node.closest ? cfg.priority.node.closest('.bb-field') : null;
      pd.appendChild(cfg.priority.node);
      if(pf && pf.parentNode && !pf.querySelector('.bb-priorities')) pf.parentNode.removeChild(pf);   // the old Priority field is empty now
      block.appendChild(pd);
      priRow={d:pd, cb:pcb, cfg:cfg.priority};
      pcb.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        if(window.FGFeaturePlace) FGFeaturePlace.open('priority', 1);
        setTimeout(paintPri,0);   // the browser flips the box back after this handler
      });
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
      block.appendChild(d);
      row.d=d;
      cb.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        if(isOptions){ openPopup(key,row); return; }   // Nov 22 2026: box and name are one button that opens / closes the popup
        advance(key,row);
        setTimeout(sync,0);   // the browser flips the box back after this handler; paint the true state once it has
      });
      if(isOptions) bodiesOf(row).forEach(function(b){ b.classList.add('fg-opt-parked'); });   // out of sight until the popup carries it
      rows.push({row:row, cb:cb});
    });
    // LINK (Nov 1 2026, Larry): an OPTION on every card -- three colored arrows (lime, orange, hot pink by slot). One module, T2TLinks, makes the row.
    // cfg.link = {cardId(): the open card's id, fromKind:'BB'|'SB', theme:'bb'|'idea', isHidden(id)}; a check box + eyeball at the foot of the main OPTIONS list that opens the three-link popup.
    var linkRow=null;
    var openLink=isMain ? function(){ if(window.FGFeaturePlace) FGFeaturePlace.open('links', 1); } : null;
    if(cfg.link && window.T2TLinks){ linkRow=T2TLinks.buildRow(Object.assign({getHidden:cfg.getHidden, setHidden:cfg.setHidden, onOpen:openLink}, cfg.link)); block.appendChild(linkRow); linkRow.setAttribute('data-fg-sort','Link'); }
    // Action rows (e.g. Duplicate): a plain button on its own full-width line, no checkbox.
    var acts=[];
    (cfg.actions||[]).forEach(function(a){
      var d=document.createElement('div'); d.className='fg-fixed-row fg-gear-action'; d.setAttribute('data-fg-sort',a.label);
      if(a.optKey) d.setAttribute('data-fg-opt', a.optKey);   // Nov 24 2026: the card OPTIONS list (controls/card-options-list.js) shows or hides this row
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
    // Features whose control lives off the checklist get a plain row too, shown only while the feature is placed on the card (card-options-list.js).
    if(isMain && window.FGCardOptions) ['az','duplicate','library','lock','org','people','plan','routine','trivia'].forEach(function(k){
      var o=FGCardOptions.OPTIONS.filter(function(x){ return x.key===k; })[0]; if(!o) return;
      var d=document.createElement('div'); d.className='fg-fixed-row fg-opt-off'; d.setAttribute('data-fg-sort',o.label); d.setAttribute('data-fg-proxy',k);
      var lab=document.createElement('label'); lab.title='Click to open or close its popup';
      var cb=document.createElement('input'); cb.type='checkbox'; cb.className='fg-tri'; cb.tabIndex=-1;
      var tx=document.createElement('span'); tx.textContent=o.label; lab.appendChild(cb); lab.appendChild(tx); d.appendChild(lab);
      cb.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); if(window.FGFeaturePlace) FGFeaturePlace.open(k, 1); setTimeout(sync,0); });
      block.appendChild(d);
    });
    // A main OPTIONS checklist is sorted A-Z as a whole: Priority, Link and the action rows (Notes) sit among the rest.
    if(!cfg.key || cfg.key==='main' || cfg.eyebrow){
      Array.prototype.slice.call(block.children).filter(function(c){ return c.hasAttribute('data-fg-sort'); })
        .sort(function(a,b){ return a.getAttribute('data-fg-sort').localeCompare(b.getAttribute('data-fg-sort')); })
        .forEach(function(c){ block.appendChild(c); });
    }
    // The same green check box as the popups' checklists (controls/popup-parts.js, Nov 27 2026, Larry).
    if(isOptions && window.FGPopupParts) Array.prototype.forEach.call(block.querySelectorAll('.fg-fixed-row input[type=checkbox]'), FGPopupParts.box);
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
    if(linkRow && linkRow.__body){ if(isOptions) linkRow.__body.classList.add('fg-opt-parked'); (linkHost||block).appendChild(linkRow.__body); }
    instances[key]={rows:rows, cfg:cfg, block:block, acts:acts, pri:priRow, link:linkRow, isOptions:isOptions, main:isMain};
    // Any change to a real box (from here, from older code, or from a card opening) re-reads the rows.
    rowsDef.forEach(function(r){ r.boxes.forEach(function(id){ var b=real(id); if(b) b.addEventListener('change', sync); }); });
    sync();
  }

  // ---- the OPTION popup (Nov 22 2026, Larry) ---------------------------------------------------------------------------
  // The OPTIONS checklist row (box and name are one button) opens and closes this popup. All the action lives here: the ON switch (the green check on
  // the checklist follows it), the eye that shows the option on the card front, and the option's own control (its opened body, carried in while open).
  var openPop=null;   // {key,row,el,restore,onDown,onKey}
  function closePopup(){
    var p=openPop; if(!p) return; openPop=null;
    // A field still being typed in saves before it goes back to the card.
    if(document.activeElement && p.el.contains(document.activeElement)) document.activeElement.blur();
    document.removeEventListener('mousedown', p.onDown, true);
    document.removeEventListener('keydown', p.onKey, true);
    if(p.tuck) p.tuck();
    p.restore.slice().reverse().forEach(function(r){
      if(r.parent) r.parent.insertBefore(r.node, (r.next && r.next.parentNode===r.parent) ? r.next : null);
      else if(r.node.parentNode) r.node.parentNode.removeChild(r.node);
      if(r.display!==undefined) r.node.style.display=r.display;
      if(r.park) r.node.classList.add('fg-opt-parked');
    });
    if(p.el.parentNode) p.el.parentNode.removeChild(p.el);
    sync();
  }
  function openPopup(key,row,level){
    var inst=instances[key]; if(!inst) return;
    level=level||1;
    if(openPop && openPop.key===key && openPop.row.id===row.id){ closePopup(); return; }   // the same button again closes it
    closePopup();
    if(level===1 && window.FGGearHub) FGGearHub.closeLevel(1);
    var st=row.state||null, hasFront=st ? !!row.hasFront : frontKeys(row).length>0, icons=(window.FGCardBackOptions && FGCardBackOptions.eyeIcons) || {};
    var el=document.createElement('div'); el.className='fg-opt-popup'+(row.id==='dates'?' fg-opt-dates':''); el.setAttribute('role','dialog'); el.setAttribute('aria-label', row.label);
    el.setAttribute('data-level', String(level));
    // The ID BAND, the same one the Color popup wears (controls/popup-parts.js, Nov 27 2026, Larry).
    var head=FGPopupParts.head('Feature', row.label, function(){ closePopup(); });
    el.appendChild(head);
    var bar=document.createElement('div'); bar.className='fg-opt-pop-bar';
    var onLab=document.createElement('label'); onLab.className='fg-opt-pop-on'; onLab.title='Turn this option on or off for the card';
    var onCb=document.createElement('input'); onCb.type='checkbox'; var onTx=document.createElement('span'); onTx.textContent='On';
    onLab.appendChild(onCb); onLab.appendChild(onTx); bar.appendChild(onLab);
    var eyeBtn=null;
    if(hasFront){ eyeBtn=document.createElement('button'); eyeBtn.type='button'; eyeBtn.className='fg-opt-pop-eye'; bar.appendChild(eyeBtn); }
    // row.preview: the feature is off (controls/feature-place.js). The popup shows what is in it, look-only, with no ON box or eye.
    var preview=!!row.preview;
    if(!row.noBar && !preview){ var barRow=document.createElement('div'); barRow.className='fg-opt-pop-head has-bar'; barRow.appendChild(bar); el.appendChild(barRow); }
    var body=document.createElement('div'); body.className='fg-opt-pop-body'; el.appendChild(body);
    var restore=[];
    // Borrow a node from the card; closing the popup puts it back where it was.
    function carry(n, into){
      var r={node:n, parent:n.parentNode, next:n.nextSibling, park:n.classList.contains('fg-opt-parked'), display:n.style.display};
      restore.push(r); n.classList.remove('fg-opt-parked'); n.classList.remove('fg-opt-off'); into.appendChild(n);
    }
    if(row.nodes){
      row.nodes.forEach(function(n){ if(n) carry(n, body); });
    } else {
      bodiesOf(row).forEach(function(b){ carry(b, body); restore[restore.length-1].park=true; if(!preview) restore[restore.length-1].display=undefined; });
    }
    (row.after||[]).forEach(function(n){ if(n) carry(n, body); });
    (row.inside||[]).forEach(function(x){ carry(x.node, x.into); x.into.insertBefore(x.node, x.into.firstChild); });
    // A block's own heading is left out when it only repeats the popup's title.
    Array.prototype.forEach.call(body.querySelectorAll('.fg-back-opt-title'), function(t){
      var words=t.firstElementChild ? t.firstElementChild.textContent : t.textContent;
      t.classList.toggle('fg-opt-dup', String(words).trim().toLowerCase()===String(row.label).trim().toLowerCase());
    });
    if(row.onInput) el.addEventListener('input', row.onInput);
    // A look-only body takes no pointer, so the wheel is passed on to it: long contents can still be read.
    el.addEventListener('wheel', function(e){ if(lookOnly) body.scrollTop+=e.deltaY; }, {passive:true});
    // Controls a card keeps tucked away until an option is in use are brought out while the popup is look-only, and tucked back when it closes.
    var lookOnly=false, brought=[];
    function tuck(){ if(lookOnly) brought.forEach(function(n){ n.style.display='none'; }); brought=[]; }
    // "View as Card Option", under a divider at the foot of every feature's popup (controls/feature-place.js).
    var foot=(window.FGFeaturePlace && FGFeaturePlace.footer) ? FGFeaturePlace.footer(row.id, { level:level }) : null;
    if(foot) el.appendChild(foot);
    function isOnNow(){ return st ? !!st.on() : isOn(row); }
    function paint(){
      var on=isOnNow(); onCb.checked=on;
      if(eyeBtn){
        var front=st ? !!st.front() : !isBackOnly(inst,row);
        eyeBtn.hidden=!on;
        eyeBtn.innerHTML=(front?(icons.open||''):(icons.slash||''))+'<span>'+(front?'On the front':'Back only')+'</span>';
        eyeBtn.title=front?'Shows on the front of the card. Click to show on the back only':'Back only. Click to show on the front of the card too';
      }
      // Feature off, or its ON box not yet checked: never a blank popup -- the contents show faded until switched on.
      lookOnly=preview || (!row.noBar && !on);
      body.inert=lookOnly; body.classList.toggle('fg-opt-preview', lookOnly);
      if(lookOnly) Array.prototype.forEach.call(body.children, function(n){ if(n.style.display==='none'){ n.style.display=''; brought.push(n); } });
    }
    onCb.addEventListener('change', function(){
      if(st){ st.setOn(onCb.checked); }
      else if(onCb.checked){ patchHidden(inst,row,hasFront?false:null); setReal(row,true); }
      else { patchHidden(inst,row,null); setReal(row,false); }
      setTimeout(function(){ sync(); paint(); },0);
    });
    if(eyeBtn) eyeBtn.addEventListener('click', function(e){ e.stopPropagation(); if(st) st.setFront(!st.front()); else patchHidden(inst,row,isBackOnly(inst,row)); setTimeout(function(){ sync(); paint(); },0); });
    document.body.appendChild(el);
    if(window.FGWindowDrag) FGWindowDrag.attach(el, head, 'gear-hub-'+level);   // drag it by the band, like the Gear's popups
    var idle=preview || (!row.noBar && !isOnNow());
    var onShow=(idle && row.onPreview) ? row.onPreview : (preview ? null : row.onOpen);
    if(onShow) onShow();
    paint();
    // Over the display area: the right-hand column of the card back (where opened options used to appear); beside the row when there is none.
    var cardEl=inst.block.closest('.sb-details-card, .bb-details-card, .fg-back-3x5') || inst.block.parentNode;
    var right=inst.block.parentNode && inst.block.parentNode.querySelector('.fg-back-right');
    var br=inst.block.getBoundingClientRect(), rr=(right||inst.block).getBoundingClientRect();
    var w=272, left=right ? rr.left : br.right+8;   // every feature popup is the same size (Nov 26 2026, Larry), the size of the Gear's
    left=Math.max(8, Math.min(left, window.innerWidth-w-8));
    el.style.width=w+'px'; el.style.left=left+'px'; el.style.top=Math.max(8, Math.min(br.top, window.innerHeight-el.offsetHeight-8))+'px';
    // The standard box (controls/gear-hub.js): the same size and place as the Gear's popups, inside the card.
    var std=(window.FGGearHub && FGGearHub.standardBox) ? FGGearHub.standardBox(level) : null;
    if(std){
      el.style.width=std.width+'px'; el.style.height=std.height+'px'; el.style.minHeight='0'; el.style.maxHeight='none';
      el.style.left=std.left+'px'; el.style.top=std.top+'px';
    }
    // SOP (Larry, Nov 24 2026: "ALL popups should disappear when clicking outside the popup or on the X"): a click anywhere outside this popup closes it,
    // on the card or off it. Only the popup itself, the OPTIONS row buttons (they open and close it themselves) and the Gear's own popups are left alone.
    var onDown=function(e){
      var t=e.target;
      if(el.contains(t) || inst.block.contains(t) || (t && t.closest && t.closest('.fg-opt-mode'))) return;
      if(t && t.closest && t.closest('.fg-gh-pw')) return;   // a Gear popup closes itself (controls/gear-hub.js)
      if(t && t.closest && t.closest('.bb-datepicker-pop, .fg-back-menu')) return;   // picking a date or from a list belongs to the field that opened it
      closePopup();
      // The card's own backdrop also closes the whole card on click; this click only dismissed a popup, so it is swallowed there (same as the Gear popups).
      if(t && (t.id==='sb-detail-overlay' || t.id==='bb-detail-overlay')){
        var swallow=function(ev){ ev.stopPropagation(); document.removeEventListener('click', swallow, true); };
        document.addEventListener('click', swallow, true);
        setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 1500);
      }
    };
    var onKey=function(e){ if(e.key==='Escape'){ e.stopPropagation(); closePopup(); } };
    document.addEventListener('mousedown', onDown, true); document.addEventListener('keydown', onKey, true);
    openPop={key:key, row:row, el:el, restore:restore, onDown:onDown, onKey:onKey, tuck:tuck};
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
        if(inst.isOptions) st=on?1:0;   // Nov 22 2026: the check is only a green status light; front or back is the eye inside the popup
        x.cb.checked=on;
        x.cb.setAttribute('data-st', String(st));
        x.cb.parentNode.title = inst.isOptions ? 'Click to open or close its popup' : (st===0 ? 'Click to show on the back of the card' : (st===1 ? (frontKeys(x.row).length?'Shows on the back. Click to also show on the front':'Shown. Click to hide') : 'Shows on the back and the front. Click to hide'));
        if(x.row.d) x.row.d.classList.remove('fg-done');
        bodiesOf(x.row).forEach(function(b){ b.classList.remove('fg-row-done-body'); });
        // Details wait out of sight until the popup carries them -- also on a back that was built before it was on the page.
        if(inst.isOptions) bodiesOf(x.row).forEach(function(b){ if(!(openPop && openPop.el.contains(b))) b.classList.add('fg-opt-parked'); });
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
    Object.keys(instances).forEach(function(k){ if(window.FGCardOptions) FGCardOptions.applyTo(instances[k]); });   // Nov 24 2026: only the options the card's list has checked
    paintPri();
  }

  // The back is reused card to card, so every card that opens repaints its LINK arrows.
  function refreshLinks(){ Object.keys(instances).forEach(function(k){ var l=instances[k].link; if(l && l.__paint) l.__paint(); }); }
  window.FGCardBackFixedRows = { build:build, sync:sync, paintPri:paintPri, refreshLinks:refreshLinks, GEAR_ROWS:GEAR_ROWS,
    instances:function(){ return instances; }, openSpec:openPopup, closePopup:closePopup, openId:function(){ return openPop ? openPop.row.id : null; } };
})();
