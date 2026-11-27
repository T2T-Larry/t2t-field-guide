/* CARD SCHEDULE -- START DATE, DUE DATE, ROUTINE, P&G REVIEW and ADD TO CALENDAR, the one code every card back uses
   (Nov 26 2026, Larry: "yes. one code for all cards.").

   This code used to live inside the task card (briefing-board/card.js and screens.js). It moved here unchanged in how it behaves, so the task card
   and the idea card show the same fields, the same icons and the same rules.

   TWO BACKS, TWO ID PREFIXES (both backs can be in the page at once): the task card uses 'bb-d', every other card uses 'idc'.
   Every field id is prefix + name:  -add-start -add-due -add-routine  (the check boxes the OPTIONS rows drive)   -start -start-time -due -due-time
   -routine -routine-day-weekly -routine-day-monthly -routine-time -routine-custom -routine-next   -rv-pro -rv-grow -reviewer -pro-note -grow-note

   THE CARD OBJECT (c) every function reads and writes: due, dueTime, startDate, startTime, routine, routineFreq, routineDay, routineCustom,
   pro, grow, growNote, reviewedBy, addStart, addDue, addRoutine. Where it is SAVED is the caller's business:
     task card  -> the Briefing Board's own card list (task_fields)
     other cards -> ideas.card_fields (storyboard/idea-card-schedule.js)

   Date reading and routine date math stay in briefing-board/operations.js (_bbParseDue, _bbComputeRoutineDue), which every page loads.
   Public surface: window.FGCardSchedule  .routineHTML(p) .startHTML(p) .dueHTML(p) .reviewHTML(p, extra) .calendarButtonHTML(id)
     .fill(p,c) .read(p,c) .wire(p,host)
     .routineToggled(p,c,on,host) .syncRoutine(p,freq) .renderNext(p,c) .reviewBand(bbw,p,cfg) .dateRow(p) .reviewerToGear(p,gearBox) .frontLines(c,show,extra) .calendar(p,c,info) */
(function(){
  function el(p,name){ return document.getElementById(p+'-'+name); }
  function val(p,name){ var e=el(p,name); return e ? e.value : ''; }
  function put(p,name,v){ var e=el(p,name); if(e) e.value=v; }
  function reviewers(){ return (typeof REVIEWERS!=='undefined') ? REVIEWERS : ['Larry']; }

  // ---- the fields -----------------------------------------------------------------------------------------------------------
  function addition(p, key, label, body, extraClass){
    return '<div class="bb-field bb-addition'+(extraClass?' '+extraClass:'')+'" id="'+p+'-add-'+key+'-wrap"><label class="bb-addition-label"><input type="checkbox" id="'+p+'-add-'+key+'">'
      +'<span class="bb-addition-eyebrow">'+label+'</span></label><div class="bb-addition-body" id="'+p+'-'+key+'-body" style="display:none">'+body+'</div></div>';
  }
  // Routine, Sept 26 2026 (Larry: "CADENCE, DAY and TIME in 3 fields horizontally on one line"). Start Date does not apply to a routine card, and its
  // DUE DATE is computed from CADENCE+DAY, not typed. DAY is two controls sharing one slot (weekday for Weekly, day of month for Monthly).
  function routineHTML(p){
    return addition(p,'routine','Routine',
      '<div class="bb-date-row">'
        +'<select id="'+p+'-routine" class="bb-routine-select"><option value="">&mdash;&mdash;&mdash;</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select>'
        +'<select id="'+p+'-routine-day-weekly" class="bb-routine-select" style="display:none"><option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option></select>'
        +'<input id="'+p+'-routine-day-monthly" type="number" min="1" max="31" step="1" class="bb-routine-day-num" placeholder="Day" style="display:none">'
        +'<input id="'+p+'-routine-time" type="text" class="bb-date-time" placeholder="Time" style="display:none">'
      +'</div>'
      +'<input id="'+p+'-routine-custom" type="text" class="bb-routine-custom" placeholder="e.g. Last Friday, EOB" style="display:none;margin-top:4px">'
      +'<div class="bb-mt" id="'+p+'-routine-next" style="display:none;margin-top:4px"></div>');
  }
  function dateHTML(p, key, label, word){
    return addition(p,key,label,
      '<div class="bb-date-row"><input id="'+p+'-'+key+'" type="text" placeholder="'+word+' MM/DD/YYYY"><input id="'+p+'-'+key+'-time" type="text" class="bb-date-time" placeholder="Time">'
      +'<button class="bb-icon-btn" id="'+p+'-'+key+'-cal" type="button" title="Pick a date">\uD83D\uDCC5</button></div>');
  }
  function startHTML(p){ return dateHTML(p,'start','Start Date','Start'); }
  function dueHTML(p){ return dateHTML(p,'due','Due Date','Due'); }
  // P&G review: REVIEWED BY and the two comments. The PRO / GROW boxes are made by the shared checklist builder (reviewBand); these hidden ones carry the flags.
  // extra = more hidden controls the caller needs (the task card's COMPLETE and VERIFIED buttons).
  function reviewHTML(p, extra){
    return '<div class="bb-field bb-addition fg-review-wrap" id="'+p+'-add-review-wrap"><label class="bb-addition-label"><input type="checkbox" id="'+p+'-add-review"><span class="bb-addition-eyebrow">P&amp;G</span></label>'
      +'<div class="bb-addition-body" id="'+p+'-review-body" style="display:none">'
        +'<div class="bb-field"><label>Reviewed by</label><select id="'+p+'-reviewer">'+reviewers().map(function(n){ return '<option value="'+n+'">'+n+'</option>'; }).join('')+'</select></div>'
        +'<input type="checkbox" id="'+p+'-rv-pro" style="display:none"><input type="checkbox" id="'+p+'-rv-grow" style="display:none">'
        +(extra||'')
        +'<div class="fg-review-grid"><div class="fg-review-left" id="'+p+'-rv-left"></div><div class="fg-review-right">'
          +'<div class="bb-field" id="'+p+'-pro-note-wrap" style="display:none"><label>PRO comment</label><textarea id="'+p+'-pro-note" placeholder="What went well?"></textarea></div>'
          +'<div class="bb-field" id="'+p+'-grow-note-wrap" style="display:none"><label>GROW comment &mdash; required</label><textarea id="'+p+'-grow-note" placeholder="What would make this even better next time?"></textarea></div>'
        +'</div></div>'
      +'</div></div>';
  }
  function calendarButtonHTML(id){
    return '<button class="bb-icon-btn" id="'+id+'" type="button" title="Add to Calendar (downloads an .ics for Outlook, Google, or Apple Calendar)">\uD83D\uDCC6</button>';
  }

  // ---- routine -------------------------------------------------------------------------------------------------------------
  // Only the controls of the chosen cadence show, and a routine card hides Start Date and Due Date (nothing typed there is lost).
  function syncRoutine(p, freq){
    function show(name,on){ var e=el(p,name); if(e) e.style.display=on?'':'none'; }
    show('routine-day-weekly', freq==='weekly');
    show('routine-day-monthly', freq==='monthly');
    show('routine-time', freq==='daily'||freq==='weekly'||freq==='monthly');
    show('routine-custom', freq==='custom');
    ['start','due'].forEach(function(k){
      show('add-'+k+'-wrap', !freq);
      var b=el(p,k+'-body'); if(b) b.classList.toggle('fg-routine-off', !!freq);   // the fields themselves, wherever the card back moved them
    });
  }
  function renderNext(p, c){
    var e=el(p,'routine-next'); if(!e) return;
    if(c.routine && c.due){ e.style.display=''; e.textContent='Next due: '+c.due+(c.dueTime?(', '+c.dueTime):''); }
    else { e.style.display='none'; e.textContent=''; }
  }
  function tint(host, on){ var card=host && host.tint ? host.tint() : null; if(card) card.classList.toggle('bb-routine-active', !!on); }
  // Sept 26 2026, Larry: unchecking ROUTINE is how a traveler cancels the recurrence -- it must turn the routine off, not just hide the picker. The cadence
  // is remembered, so checking it again brings the routine straight back.
  function routineToggled(p, c, on, host){
    if(!on){ c.routine=false; tint(host,false); }
    else if(c.routineFreq){ c.routine=true; tint(host,true); }
    syncRoutine(p, c.routine?c.routineFreq:'');
    renderNext(p, c);
  }
  function wireRoutine(p, host){
    var sel=el(p,'routine'), dayWeekly=el(p,'routine-day-weekly'), dayMonthly=el(p,'routine-day-monthly'), time=el(p,'routine-time'), custom=el(p,'routine-custom');
    // DUE is computed the moment CADENCE or DAY changes, and mirrored into the (hidden) Due Date fields so Add to Calendar reads the fresh date.
    function recomputeDue(c){
      var day=(c.routineFreq==='weekly') ? (dayWeekly?dayWeekly.value:'') : (c.routineFreq==='monthly') ? (dayMonthly?dayMonthly.value:'') : '';
      c.routineDay=day;
      var next=_bbComputeRoutineDue(c.routineFreq, day);
      if(next!=null) c.due=next;
      put(p,'due', c.due||''); put(p,'due-time', c.dueTime||'');
      renderNext(p, c);
    }
    function on(node, fn){ if(node) node.addEventListener('change', function(){ var c=host.card(); if(c && fn(c)!==false) host.changed(c,'routine'); }); }
    on(sel, function(c){
      c.routineFreq=sel.value;
      syncRoutine(p, sel.value);
      if(sel.value){
        c.routine=true; tint(host,true);
        // Weekly and Monthly need a DAY before a date can be computed: Saturday and the 1st until another is picked.
        if(sel.value==='weekly' && dayWeekly && !dayWeekly.value) dayWeekly.value='6';
        if(sel.value==='monthly' && dayMonthly && !dayMonthly.value) dayMonthly.value='1';
        recomputeDue(c);
      } else { c.routine=false; tint(host,false); renderNext(p, c); }
    });
    on(dayWeekly, function(c){ if(c.routineFreq!=='weekly') return false; recomputeDue(c); });
    on(dayMonthly, function(c){
      if(c.routineFreq!=='monthly') return false;
      var v=parseInt(dayMonthly.value,10); if(isNaN(v)) v=1;
      dayMonthly.value=Math.max(1, Math.min(31, v));
      recomputeDue(c);
    });
    on(time, function(c){ c.dueTime=time.value; put(p,'due-time', c.dueTime||''); renderNext(p, c); });
    on(custom, function(c){ c.routineCustom=custom.value; });
  }

  // ---- P&G review ----------------------------------------------------------------------------------------------------------
  // PRO and GROW are the two review flags; the review area (REVIEWED BY and the comments) shows only while one of them is on. Neither gates anything.
  function paintReview(p){
    var pro=el(p,'rv-pro'), grow=el(p,'rv-grow'), body=el(p,'review-body');
    if(body) body.style.display=((pro&&pro.checked)||(grow&&grow.checked))?'':'none';
  }
  function wireReview(p, host){
    [['rv-pro','pro','pro-note-wrap','pro-note'],['rv-grow','grow','grow-note-wrap','grow-note']].forEach(function(x){
      var box=el(p,x[0]); if(!box) return;
      box.addEventListener('change', function(){
        paintReview(p);
        var c=host.card(); if(!c) return;
        c[x[1]]=box.checked;
        host.changed(c,'review');
        var wrap=el(p,x[2]); if(wrap) wrap.style.display=box.checked?'':'none';
        if(box.checked){ var ta=el(p,x[3]); if(ta) setTimeout(function(){ ta.focus(); },0); }
      });
    });
    var rcb=el(p,'add-review'), body=el(p,'review-body');
    if(rcb && body) rcb.addEventListener('change', function(){ body.style.display=rcb.checked?'':'none'; });
  }

  // The PRO - GROW boxes (one P&G check, Nov 12 2026) sit in the card back's bottom band, midway between the left edge and the card's centre control;
  // extra actions (the task card's VERIFIED) sit midway between that control and the Gear.
  //   cfg = { key, actions, centre: element selector, getHidden, setHidden }
  function reviewBand(bbw, p, cfg){
    if(!window.FGCardBackFixedRows || !bbw) return;
    FGCardBackFixedRows.build(bbw, {
      key:cfg.key, className:'fg-review-rows', cardId:cfg.cardId,
      rows:[ { id:'pg', label:'P&G', boxes:[p+'-rv-pro',p+'-rv-grow'], eyeKeys:[], bodies:[p+'-pro-note-wrap',p+'-grow-note-wrap'] } ],
      mount:function(block){
        var ar=bbw.querySelector('.bb-action-row');
        if(!ar){ var left=el(p,'rv-left'); if(left) left.appendChild(block); return; }
        var pg=document.createElement('span'); pg.className='bb-pg-band';
        var vb=document.createElement('span'); vb.className='bb-verified-band';
        Array.prototype.slice.call(block.children).forEach(function(k){ (k.getAttribute('data-fg-sort')==='Verified' ? vb : pg).appendChild(k); });
        block.style.display='none';   // stays in the page (the builder checks it is still there) but empty
        ar.appendChild(block); ar.appendChild(pg); if(vb.firstChild) ar.appendChild(vb);
        // Measure where the centre control and the Gear actually sit and put each box in the middle of its gap.
        function place(){
          if(!ar.isConnected && place.seen){ window.removeEventListener('resize', place); return; }   // that card back is gone
          if(ar.isConnected) place.seen=true;
          var mid=cfg.centre ? ar.querySelector(cfg.centre) : null; if(!mid || !ar.offsetWidth) return;
          var a=ar.getBoundingClientRect(), d=mid.getBoundingClientRect(); if(!d.width) return;
          var leftEdge=a.left+22;   // the row's own side padding
          pg.style.left=((leftEdge+d.left)/2 - a.left)+'px';
          if(!vb.firstChild) return;
          var gear=ar.querySelector('[id$="-gear"]'), g=gear ? gear.getBoundingClientRect() : null;
          if(g && g.width){
            var m=(g.left>=d.right) ? (d.right+g.left)/2 : (g.right<=d.left ? (g.right+d.left)/2 : (d.right+a.right)/2);
            vb.style.left=(m - a.left)+'px';
          } else vb.style.left=((d.right+a.right)/2 - a.left)+'px';
        }
        if(cfg.onPlace) cfg.onPlace(place);
        if(window.ResizeObserver){ try{ new ResizeObserver(place).observe(ar); }catch(e){} }
        window.addEventListener('resize', place);
        setTimeout(place,0); setTimeout(place,250);
      },
      actions:cfg.actions||[], getHidden:cfg.getHidden, setHidden:cfg.setHidden
    });
  }

  // Start Date + Due Date open on one line.
  function dateRow(p){
    var sb=el(p,'start-body'), db=el(p,'due-body'); if(!sb || !db) return;
    var row=document.createElement('div'); row.className='fg-back-daterow';
    sb.parentNode.insertBefore(row, sb); row.appendChild(sb); row.appendChild(db);
  }
  // REVIEWED BY is part of the P&G review popup (Nov 26 2026); it waits out of sight in the back's feature store for it (controls/feature-place.js).
  function reviewerToGear(p, gearBox){
    var f=el(p,'reviewer'); f=f && f.closest('.bb-field');
    if(f && gearBox) gearBox.appendChild(f);
  }

  // ---- the dates on a card face (lower right corner, every card): ROUTINE, Start Date, Due Date, in that order ----------------
  // show(key) says whether 'start', 'due' or 'routine' may appear on this face; extra = { startOverdue, completed } for a task card.
  function frontLines(c, show, extra){
    var esc=function(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var line=function(cls, text){ return '<div class="bb-date-line '+cls+'">'+esc(text)+'</div>'; };
    var x=extra||{};
    return (c.routine && show('routine') ? line('bb-routine-badge','ROUTINE') : '')
      // Start Date and START DUE never show on a routine card's face, even if a start date is still saved from before it became routine.
      + (c.startDate && !c.routine && show('start') ? line('bb-date', c.startDate) : '')
      + (x.startOverdue && show('start') ? line('bb-start-due','START DUE: '+c.startDate) : '')
      + (c.due && show('due') ? line('bb-due','DUE: '+c.due) : '')
      // The recorded date follows the others: dates kept backstage (Dates > Visible unchecked) leave nothing on the face.
      + (x.completed && (show('start') || show('due')) ? line('bb-done-date','COMPLETED: '+x.completed) : '');
  }

  // ---- filling and reading the fields --------------------------------------------------------------------------------------
  function fill(p, c){
    put(p,'due', c.due||''); put(p,'due-time', c.dueTime||'');
    put(p,'start', c.startDate||''); put(p,'start-time', c.startTime||'');
    put(p,'routine', c.routineFreq||'');
    put(p,'routine-day-weekly', (c.routineFreq==='weekly'&&c.routineDay!==''&&c.routineDay!=null)?c.routineDay:'6');
    put(p,'routine-day-monthly', (c.routineFreq==='monthly'&&c.routineDay)?c.routineDay:'');
    put(p,'routine-time', c.dueTime||'');
    put(p,'routine-custom', c.routineCustom||'');
    syncRoutine(p, c.routine ? c.routineFreq : '');   // a remembered cadence with Routine off still shows the date fields
    renderNext(p, c);
    put(p,'reviewer', c.reviewedBy||reviewers()[0]);
    var rn=(typeof _bbReviewNotes==='function') ? _bbReviewNotes(c) : {pro:'', grow:c.growNote||''};
    put(p,'grow-note', rn.grow); put(p,'pro-note', rn.pro);
    var gw=el(p,'grow-note-wrap'), pw=el(p,'pro-note-wrap');
    if(gw) gw.style.display=c.grow?'':'none';
    if(pw) pw.style.display=c.pro?'':'none';
    var rp=el(p,'rv-pro'), rg=el(p,'rv-grow'), rcb=el(p,'add-review');
    if(rp) rp.checked=!!c.pro;
    if(rg) rg.checked=!!c.grow;
    if(rcb) rcb.checked=!!(c.pro||c.grow);
    paintReview(p);
  }
  // Sept 26 2026: a routine card's DUE is computed by its own controls, so the hidden Due Date and Start Date fields are not read back over it.
  function read(p, c){
    if(!el(p,'due')) return;
    if(c.routine){ var rt=el(p,'routine-time'); if(rt) c.dueTime=rt.value; }
    else {
      c.due=val(p,'due'); c.dueTime=val(p,'due-time');
      c.startDate=val(p,'start'); c.startTime=val(p,'start-time');
    }
    c.routineFreq=val(p,'routine');
    c.routineCustom=val(p,'routine-custom');
    c.reviewedBy=val(p,'reviewer');
    c.growNote=_bbPackReviewNotes(val(p,'pro-note'), val(p,'grow-note'));
  }

  // ---- the little calendar that fills a date field (Aug 7 2026, Larry: pick from a calendar, today stands out) ---------------
  function attachPicker(inputId, btnId){
    var input=document.getElementById(inputId); if(!input) return;
    var pop=null, viewYear=0, viewMonth=0;
    var MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
    function onDocDown(e){ if(pop && e.target!==input && !pop.contains(e.target)) closePop(); }
    function closePop(){
      if(!pop) return;
      pop.remove(); pop=null;
      document.removeEventListener('mousedown', onDocDown, true);
    }
    function render(){
      var now=new Date();
      var selected=_bbParseDue(input.value);
      var firstDow=new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth=new Date(viewYear, viewMonth+1, 0).getDate();
      var html='<div class="bb-dp-head">'
        +'<button type="button" class="bb-dp-nav" data-dp-nav="-1" aria-label="Previous month">&#8249;</button>'
        +'<span class="bb-dp-label">'+MONTH_NAMES[viewMonth]+' '+viewYear+'</span>'
        +'<button type="button" class="bb-dp-nav" data-dp-nav="1" aria-label="Next month">&#8250;</button>'
        +'</div><div class="bb-dp-grid">';
      ['S','M','T','W','T','F','S'].forEach(function(d){ html+='<span class="bb-dp-dow">'+d+'</span>'; });
      for(var i=0;i<firstDow;i++) html+='<span class="bb-dp-day bb-dp-blank"></span>';
      for(var d=1; d<=daysInMonth; d++){
        var isToday=(viewYear===now.getFullYear() && viewMonth===now.getMonth() && d===now.getDate());
        var isSel=(selected && selected.getFullYear()===viewYear && selected.getMonth()===viewMonth && selected.getDate()===d);
        html+='<button type="button" class="bb-dp-day'+(isToday?' bb-dp-today':'')+(isSel?' bb-dp-selected':'')+'" data-dp-day="'+d+'">'+d+'</button>';
      }
      html+='</div>';
      pop.innerHTML=html;
      pop.querySelectorAll('[data-dp-nav]').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          viewMonth+=parseInt(btn.getAttribute('data-dp-nav'),10);
          if(viewMonth<0){ viewMonth=11; viewYear--; } else if(viewMonth>11){ viewMonth=0; viewYear++; }
          render();
        });
      });
      pop.querySelectorAll('[data-dp-day]').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          input.value=(viewMonth+1)+'/'+btn.getAttribute('data-dp-day')+'/'+viewYear;
          closePop();   // no focus back on the field: focusing it opens the calendar again
          input.dispatchEvent(new Event('change',{bubbles:true}));   // a picked date saves like a typed one
        });
      });
    }
    function openPop(){
      if(pop) return;
      var base=_bbParseDue(input.value)||new Date();
      viewYear=base.getFullYear(); viewMonth=base.getMonth();
      pop=document.createElement('div');
      pop.className='bb-datepicker-pop';
      // The calendar sits outside the card, so it borrows the card's colors.
      var home=document.querySelector((inputId.indexOf('bb-d-')===0?'#bb-detail-overlay':'#sb-detail-overlay')+' .bb-overlay-card');
      var look=getComputedStyle(home||input);
      ['--bb-accent','--bb-ink','--bb-sub','--bb-bg','--bb-body-font'].forEach(function(v){ var x=look.getPropertyValue(v); if(x) pop.style.setProperty(v,x); });
      document.body.appendChild(pop);
      var r=input.getBoundingClientRect();
      pop.style.left=Math.max(8, Math.min(r.left, window.innerWidth-pop.offsetWidth-8))+'px';
      pop.style.top=(r.bottom+4)+'px';
      render();
      if(r.bottom+4+pop.offsetHeight>window.innerHeight-4) pop.style.top=Math.max(4, r.top-pop.offsetHeight-4)+'px';   // no room below: open above
      setTimeout(function(){ document.addEventListener('mousedown', onDocDown, true); }, 0);
    }
    input.addEventListener('click', openPop);
    input.addEventListener('focus', openPop);
    var btn=btnId ? document.getElementById(btnId) : null;
    if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openPop(); });
  }

  // ---- wiring (once per card back) -----------------------------------------------------------------------------------------
  // host = { card:fn() -> the open card object, changed:fn(c, 'routine'|'review') -> save it, tint:fn() -> the card back element }
  function wire(p, host){
    attachPicker(p+'-due', p+'-due-cal');
    attachPicker(p+'-start', p+'-start-cal');
    wireRoutine(p, host);
    wireReview(p, host);
  }

  // ---- Add to Calendar (Sept 14 2026): a one-way .ics download, one event for the card's Start Date and one for its Due Date -------
  function icsEscape(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r\n|\r|\n/g,'\\n'); }
  function pad(n){ return n<10 ? ('0'+n) : String(n); }
  function utcStamp(d){ return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+'Z'; }
  // Time is free text: 2pm, 2:30pm, 14:30, 2:30 p.m. Anything else makes an all-day event.
  function timeOfDay(s){
    if(!s) return null;
    var m=String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i);
    if(!m){
      var m24=String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
      if(!m24) return null;
      var h24=parseInt(m24[1],10), mi24=parseInt(m24[2],10);
      if(h24<0||h24>23||mi24<0||mi24>59) return null;
      return {h:h24, m:mi24};
    }
    var h=parseInt(m[1],10), mi=m[2]?parseInt(m[2],10):0, ap=m[3].toLowerCase();
    if(ap==='p' && h<12) h+=12;
    if(ap==='a' && h===12) h=0;
    if(h<0||h>23||mi<0||mi>59) return null;
    return {h:h, m:mi};
  }
  function download(filename, text, mime){
    var blob=new Blob([text], {type:(mime||'text/plain')+';charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=filename; a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ if(a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }
  // Reads the open card's fields first (what is typed right now, saved or not), the card object second. info = { id, title, notes, project }
  function calendar(p, c, info){
    if(!c) return;
    function now(name, saved){ var e=el(p,name); return String(e ? e.value : (saved||'')).trim(); }
    var dueVal=now('due', c.due), startVal=c.routine ? '' : now('start', c.startDate);   // Start Date does not apply to a routine card
    var picks=[];
    if(startVal) picks.push({word:'Start', dateStr:startVal, timeStr:now('start-time', c.startTime)});
    if(dueVal) picks.push({word:'Due', dateStr:dueVal, timeStr:now('due-time', c.dueTime)});
    if(!picks.length){ alert('Add a Due Date or Start Date to this card first \u2014 Add to Calendar builds its events from them.'); return; }
    if(picks.some(function(x){ x.d=_bbParseDue(x.dateStr); return !x.d; })){ alert('Couldn\u2019t read that date (expected MM/DD or MM/DD/YYYY) \u2014 fix it and try again.'); return; }
    var title=String((info&&info.title)||'').trim()||'(untitled)';
    var notes=String((info&&info.notes)||'').trim();
    var parts=[];
    if(info && info.project) parts.push('Project: '+info.project);
    if(notes) parts.push(notes);
    parts.push('From the T2T Field Guide.');
    var uid=(info&&info.id)||Math.random().toString(36).slice(2);
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//T2T Field Guide//Cards//EN','CALSCALE:GREGORIAN'];
    picks.forEach(function(x){
      var d=x.d, tm=timeOfDay(x.timeStr), y=d.getFullYear(), mo=pad(d.getMonth()+1), da=pad(d.getDate());
      lines.push('BEGIN:VEVENT');
      lines.push('UID:bb-'+uid+'-'+x.word.toLowerCase()+'-'+Date.now()+'@t2t-field-guide');
      lines.push('DTSTAMP:'+utcStamp(new Date()));
      if(tm){
        lines.push('DTSTART:'+y+mo+da+'T'+pad(tm.h)+pad(tm.m)+'00');
        var end=new Date(y, d.getMonth(), d.getDate(), tm.h, tm.m, 0); end.setHours(end.getHours()+1);
        lines.push('DTEND:'+end.getFullYear()+pad(end.getMonth()+1)+pad(end.getDate())+'T'+pad(end.getHours())+pad(end.getMinutes())+'00');
      } else {
        lines.push('DTSTART;VALUE=DATE:'+y+mo+da);
        var next=new Date(y, d.getMonth(), d.getDate()+1);
        lines.push('DTEND;VALUE=DATE:'+next.getFullYear()+pad(next.getMonth()+1)+pad(next.getDate()));
      }
      lines.push('SUMMARY:'+icsEscape((picks.length>1 ? x.word+': ' : '')+title));   // two dates: each event says which it is
      lines.push('DESCRIPTION:'+icsEscape(parts.join('\n')));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var safe=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'event';
    download(safe+'.ics', lines.join('\r\n'), 'text/calendar');
  }

  // The P&G label shows only through the bottom band; the date fields of a routine card stay out of sight wherever they were moved.
  (function(){
    if(document.getElementById('fg-card-schedule-style')) return;
    var st=document.createElement('style'); st.id='fg-card-schedule-style';
    st.textContent='.fg-review-wrap>.bb-addition-label{display:none}.fg-routine-off{display:none!important}'
      +'.bb-datepicker-pop{z-index:100010!important}'   // above every card popup (it opened behind the Dates popup)
      +'.bb-action-row .bb-pg-band .fg-fixed-row>label{display:flex!important;flex-direction:row;align-items:center;gap:7px;margin:0}';   // box beside its word on every back
    document.head.appendChild(st);
  })();

  window.FGCardSchedule={ routineHTML:routineHTML, startHTML:startHTML, dueHTML:dueHTML, reviewHTML:reviewHTML, calendarButtonHTML:calendarButtonHTML,
    fill:fill, read:read, wire:wire, routineToggled:routineToggled, syncRoutine:syncRoutine, renderNext:renderNext, reviewBand:reviewBand,
    dateRow:dateRow, reviewerToGear:reviewerToGear, frontLines:frontLines, calendar:calendar };
})();
