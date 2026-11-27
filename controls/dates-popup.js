/* DATES POPUP -- what the Dates feature's popup holds, the same on every card back (Nov 27 2026; VISION: WEBSITE > FEATURES > Dates).

   WHAT YOU SEE
   - Start Date and Due Date, one line each: the two dates a person sets.
   - Completed and Hang Up since: dates a task card records by itself, shown while they apply.
   - A red line when a date has passed (a late task card also turns pink), whether or not the dates are visible.
   - Visible: a green check shows the dates on the card front. No check keeps them backstage: still saved, still on the back.
   - Add to Calendar.
   The popup shell and its "View as Card Option" foot are the ones every feature uses (card-back-fixed-rows.js, feature-place.js). The date fields
   themselves are the card's own (card-schedule.js), borrowed while the popup is open, so saving is unchanged.

   HOW VISIBLE IS SAVED: the front_hidden words 'start' and 'due' (both listed = backstage). One check sets both.
   Public surface: window.FGDatesPopup  .row(instance, datesRow, calendarButton, cardId) */
(function(){
  var KEYS=['start','due'];

  function injectStyle(){
    if(document.getElementById('fg-dates-popup-style')) return;
    var st=document.createElement('style'); st.id='fg-dates-popup-style';
    st.textContent=''
      +'.fg-opt-popup.fg-opt-dates{padding-bottom:4px}'
      +'.fg-opt-dates .bb-field{margin:0;max-width:none}'
      // One date per line: its name, then the date, time and calendar picker.
      +'.fg-opt-dates .fg-opt-pop-body .bb-addition-body{display:flex;align-items:center;gap:6px;margin:0 0 2px}'
      +'.fg-opt-dates .fg-back-opt-title{flex:0 0 62px;margin:0;min-height:0;white-space:nowrap}'
      +'.fg-opt-dates .fg-back-opt-title .fg-back-eye{display:none}'   // the one Visible check replaces the eye on each date
      +'.fg-opt-dates .bb-date-row{flex:1 1 auto;min-width:0;gap:4px;margin:0}'
      +'.fg-opt-dates .bb-date-row input[type=text]{min-width:0;padding-top:0;padding-bottom:0}'
      +'.fg-opt-dates .bb-date-row .bb-icon-btn{height:22px;min-height:0}'
      +'.fg-dates-note{font-size:calc(10.5px * var(--fg-text-scale,1));line-height:1.35;text-align:center}'
      +'.fg-dates-late{font-size:calc(10.5px * var(--fg-text-scale,1));line-height:1.35;font-weight:700;text-align:center;color:#c2255c}'
      +'.fg-dates-note:empty,.fg-dates-late:empty{display:none}'
      +'.fg-dates-bottom{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 22px}'
      +'.fg-dates-bottom .fg-pop-check{min-height:22px;font-size:calc(11px * var(--fg-text-scale,1))}'
      +'.fg-dates-bottom .fg-place-line{min-height:22px;gap:6px;cursor:pointer}';
    document.head.appendChild(st);
  }

  function row(inst, datesRow, calendar, cardId){
    injectStyle();
    var task=String(datesRow.bodies[0]||'').indexOf('bb-d-')===0, P=task ? 'bb-d' : 'idc';
    function card(){ return (task && typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(cardId) : null; }
    function field(name){ return document.getElementById(P+'-'+name); }
    function typed(name){ var f=field(name); return f ? String(f.value||'').trim() : ''; }
    function div(cls){ var d=document.createElement('div'); d.className=cls; return d; }

    var more=div('fg-dates-more'), note=div('fg-dates-note'), late=div('fg-dates-late'), bottom=div('fg-dates-bottom');
    more.appendChild(note); more.appendChild(late); more.appendChild(bottom);

    // VISIBLE: one check for the card front.
    var vis=FGPopupParts.check('Visible', 'Checked: the dates show on the card. Unchecked: they are kept backstage');
    bottom.appendChild(vis.row);
    function hidden(){ return (inst.cfg.getHidden()||[]).slice(); }
    function paintVisible(){
      var on=!window.FGCardOptions || FGCardOptions.isOn(cardId,'dates'), h=hidden();
      vis.box.checked=on && KEYS.some(function(k){ return h.indexOf(k)<0; });
    }
    vis.box.addEventListener('change', function(){
      var next=hidden().filter(function(w){ return KEYS.indexOf(w)<0; });
      if(!vis.box.checked) next=next.concat(KEYS);
      inst.cfg.setHidden(next);
    });

    // ADD TO CALENDAR: the card's own button, with its words beside it.
    var calBox=null;
    if(calendar){
      calBox=div('fg-place-line');
      var words=document.createElement('span'); words.textContent='Add to Calendar';
      words.addEventListener('click', function(e){ e.stopPropagation(); calendar.click(); });
      calBox.appendChild(words); bottom.appendChild(calBox);
    }

    // The recorded dates and the overdue line.
    function passed(text){ var d=_bbParseDue(text); return !!d && _bbDaysUntil(d)<0; }
    function paintLines(){
      var c=card(), said=[], warn=[];
      if(c && c.routine) said.push('Routine sets the due date'+(c.due ? ': '+c.due : ''));
      if(c && c.col==='done' && c.completedDate) said.push('Completed: '+c.completedDate);
      if(c && c.col==='hangups' && c.hangupSince) said.push('Hang Up since: '+c.hangupSince);
      note.textContent=said.join(' · ');
      // The same rules that turn a task card pink (briefing-board/operations.js): finished and Hang Up cards are never overdue.
      var closed=!!c && (c.col==='done' || c.col==='hangups' || c.archived || c.trashedAt);
      var due=(c && c.routine) ? c.due : typed('due'), start=typed('start');
      if(!closed && passed(due)) warn.push('OVERDUE: due '+due);
      if(c && !closed && !c.routine && typeof _bbIsDoCol==='function' && _bbIsDoCol(c.col) && passed(start)) warn.push('START DATE PASSED: '+start);
      late.textContent=warn.join(' · ');
      var face=c ? document.querySelector('#bb-detail-overlay .bb-overlay-card') : null;
      if(face) face.classList.toggle('bb-overdue-active', warn.length>0);
    }
    // A date typed or picked here counts as using it: its check follows what is in the field, and the field stays in view.
    function dateChanged(e){
      KEYS.forEach(function(k){
        var f=field(k); if(!f || (e.target!==f && e.target!==field(k+'-time'))) return;
        var box=field('add-'+k), has=!!(typed(k) || typed(k+'-time'));
        if(box && box.checked!==has){ box.checked=has; box.dispatchEvent(new Event('change',{bubbles:true})); }
      });
      showFields();
      setTimeout(paintLines,0);   // after the card has taken the new value
    }
    function showFields(){ datesRow.bodies.forEach(function(id){ var b=document.getElementById(id); if(b) b.style.display=''; }); }
    // Runs each time the popup opens (live or look-only).
    function opened(){
      var pop=more.closest('.fg-opt-popup');
      if(pop){ pop.addEventListener('change', function(e){ if(!more.contains(e.target)) dateChanged(e); }); pop.addEventListener('input', paintLines); }
      showFields(); paintVisible(); paintLines();
    }

    return Object.assign({}, datesRow, {
      noBar:true, after:[more], inside:calBox ? [{ node:calendar, into:calBox }] : [],
      onOpen:opened, onPreview:opened
    });
  }

  window.FGDatesPopup={ row:row };
})();
