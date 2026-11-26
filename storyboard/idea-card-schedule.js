/* IDEA CARD SCHEDULE -- Start Date, Due Date, Routine, P&G review and Add to Calendar on every card that is not a Briefing Board task
   (Nov 26 2026, Larry: "yes. one code for all cards.").

   The fields, icons and rules are the task card's own (controls/card-schedule.js). This file only does what is different about the other cards:
   puts the fields on their back, and saves them.

   WHERE IT IS SAVED: ideas.card_fields, one small record per card, with the same key names the task cards use in task_fields
   (due_date, due_time, start_date, start_time, is_routine, routine_freq, routine_custom, routine_day, reviewed_by, pro, grow, grow_note,
   adds_start, adds_due, adds_routine). A date here stays on this card: it is not a Briefing Board task, and it shows there only if the card is put there.
   This file is the only one that reads and writes the record; a move to or from the Briefing Board asks it (fromRow / toRow).

   Each option starts unchecked on these cards (controls/card-options-list.js).
   Public surface: window.FGIdeaSchedule  .html() .rows() .attach(card,item) .flush() .settled(id) .frontHTML(item) .carry(src) .toRow(c) .fromRow(row)
     .hasData(row) */
(function(){
  var P='idc';
  var open=null;     // the card back on screen: {id, item, c, loaded, saved, node}
  var chains={};     // id -> the card's saves, one after another

  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function el(name){ return document.getElementById(P+'-'+name); }
  function firstReviewer(){ return (typeof REVIEWERS!=='undefined') ? REVIEWERS[0] : 'Larry'; }

  // ---- the saved record <-> the card object the shared code works on ---------------------------------------------------------
  function parse(row){ if(typeof row==='string'){ try{ return JSON.parse(row)||{}; }catch(e){ return {}; } } return row||{}; }
  function fromRow(row){
    var r=parse(row);
    return {
      due:_bbFromISODate(r.due_date), dueTime:r.due_time||'', startDate:_bbFromISODate(r.start_date), startTime:r.start_time||'',
      routine:!!r.is_routine, routineFreq:r.routine_freq||'', routineCustom:r.routine_custom||'', routineDay:r.routine_day||'',
      pro:!!r.pro, grow:!!r.grow, growNote:r.grow_note||'', reviewedBy:r.reviewed_by||firstReviewer(),
      addStart:!!(r.adds_start||r.start_date), addDue:!!(r.adds_due||r.due_date), addRoutine:!!(r.adds_routine||r.is_routine)
    };
  }
  // Only what holds something is kept; a card with nothing keeps no record at all.
  function toRow(c){
    var r={
      due_date:_bbToISODate(c.due), due_time:c.dueTime||null, start_date:_bbToISODate(c.startDate), start_time:c.startTime||null,
      is_routine:!!c.routine, routine_freq:c.routineFreq||null, routine_custom:c.routineCustom||null, routine_day:c.routineDay||null,
      pro:!!c.pro, grow:!!c.grow, grow_note:c.growNote||null,
      reviewed_by:(c.reviewedBy && c.reviewedBy!==firstReviewer()) ? c.reviewedBy : null,
      adds_start:!!c.addStart, adds_due:!!c.addDue, adds_routine:!!c.addRoutine
    };
    var out={}, any=false;
    Object.keys(r).sort().forEach(function(k){ if(r[k]){ out[k]=r[k]; any=true; } });
    return any ? out : null;
  }
  // Something a person filled in (a checked-but-empty option does not count).
  function hasData(row){
    var r=parse(row);
    return ['due_date','due_time','start_date','start_time','is_routine','routine_custom','pro','grow','grow_note'].some(function(k){ return !!r[k]; });
  }
  // The same record whatever order the database hands its keys back in.
  function stamp(c){ return JSON.stringify(toRow(c)); }

  // ---- a card moving between boards (people-team/id-band-moves.js) -------------------------------------------------------------
  var VIEW_WORDS=['start','due','routine'];
  function viewWords(frontHidden){ return String(frontHidden||'').split(',').filter(function(w){ return VIEW_WORDS.indexOf(w)>=0; }); }
  // What the new card takes along. src = the card being moved:
  //   from the Briefing Board: src.schedule is the task card. Returns {card_fields, features, front_hidden} for the new idea card.
  //   from any other card:     read from its saved record.     Returns the same, plus fields (the record's own keys, which task cards share).
  async function carry(src){
    var row=null, hidden='';
    if(src.origin==='task'){
      if(!src.schedule) return {};
      row=toRow(src.schedule); hidden=src.schedule.frontHidden||'';
    } else {
      await settled(src.id);
      var c=sb(); if(!c) throw new Error('not signed in');
      var r=await c.from('ideas').select('card_fields,front_hidden').eq('id', src.id).maybeSingle();
      if(r.error) throw r.error;
      row=(r.data && r.data.card_fields) || null; hidden=(r.data && r.data.front_hidden) || '';
    }
    if(!row) return {};
    // The options that hold something are checked on the new card, so nothing arrives out of sight.
    var words=[];
    if(row.adds_start||row.start_date) words.push('on-start');
    if(row.adds_due||row.due_date) words.push('on-due');
    if(row.adds_routine||row.is_routine) words.push('on-routine');
    if(row.pro||row.grow||row.grow_note) words.push('on-review');
    var out={ card_fields:row, fields:row };
    if(words.length) out.features=words.join(',');
    if(viewWords(hidden).length) out.front_hidden=viewWords(hidden).join(',');
    return out;
  }

  // ---- the card back --------------------------------------------------------------------------------------------------------
  function html(){
    return FGCardSchedule.startHTML(P)+FGCardSchedule.dueHTML(P)+FGCardSchedule.routineHTML(P)+FGCardSchedule.reviewHTML(P);
  }
  // The checklist rows these fields answer to (card-back-fixed-rows.js).
  function rows(){
    return {
      dates:  { id:'dates', label:'Dates', boxes:[P+'-add-start',P+'-add-due'], eyeKeys:['start','due'], bodies:[P+'-start-body',P+'-due-body'] },
      routine:{ id:'routine', label:'Routine', boxes:[P+'-add-routine'], eyeKeys:['routine'], bodies:[P+'-routine-body'] }
    };
  }
  var ADDITIONS=[{key:'start',flag:'addStart'},{key:'due',flag:'addDue'},{key:'routine',flag:'addRoutine'}];
  var TYPED=['due','due-time','start','start-time','routine-custom','reviewer','pro-note','grow-note'];
  var CONTROLS=TYPED.concat(['routine','routine-day-weekly','routine-day-monthly','routine-time','start-cal','due-cal']);

  function status(text){ var e=document.getElementById('sb-note-status'); if(e) e.textContent=text; }
  function lockFields(on){ CONTROLS.forEach(function(n){ var e=el(n); if(e) e.disabled=on; }); }
  function paint(s){
    FGCardSchedule.fill(P, s.c);
    ADDITIONS.forEach(function(a){
      var cb=el('add-'+a.key), body=el(a.key+'-body');
      if(cb) cb.checked=!!s.c[a.flag];
      if(body) body.style.display=s.c[a.flag]?'':'none';
    });
    if(s.node) s.node.classList.toggle('bb-routine-active', !!s.c.routine);
    if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync();
  }

  // Save the card's record. Saves of one card run one after another; the board follows at once.
  function save(s){
    var json=stamp(s.c);
    if(json===s.saved) return;
    s.saved=json;
    var row=toRow(s.c);
    s.item.card_fields=row;
    if(typeof _sboardPatchRow==='function') _sboardPatchRow(s.id, {card_fields:row});
    redraw();
    chains[s.id]=(chains[s.id]||Promise.resolve()).then(async function(){
      var c=sb(); if(!c) throw new Error('not signed in');
      var r=await c.from('ideas').update({card_fields:row}).eq('id', s.id);
      if(r.error) throw r.error;
    }).catch(function(err){
      console.error('Card dates not saved', err);
      s.saved=null;   // the next change tries again
      status('Not saved: '+((err&&err.message)||err));
      if(s!==open || !document.contains(s.node)) alert('The card’s dates were not saved: '+((err&&err.message)||err));
    });
  }
  var redrawTimer=null;
  function redraw(){
    if(redrawTimer) clearTimeout(redrawTimer);
    redrawTimer=setTimeout(function(){ redrawTimer=null; if(typeof renderSeaBoard==='function') renderSeaBoard(true); }, 60);
  }

  async function load(s){
    try{
      await (chains[s.id]||Promise.resolve());
      var c=sb(); if(!c) throw new Error('not signed in');
      var r=await c.from('ideas').select('card_fields,features').eq('id', s.id).maybeSingle();
      if(r.error) throw r.error;
      var row=(r.data && r.data.card_fields) || null;
      s.c=fromRow(row); s.saved=stamp(s.c); s.item.card_fields=row;
      if(r.data) s.item.features=r.data.features;
      if(typeof _sboardPatchRow==='function') _sboardPatchRow(s.id, {card_fields:row, features:s.item.features});
      if(s!==open) return;
      s.loaded=true; lockFields(false); paint(s);
    }catch(err){
      // Nothing is ever saved over a record that could not be read.
      console.error('Card dates not loaded', err);
      if(s===open) status('Dates could not be loaded. Close the card and open it again.');
    }
  }

  // Called once the card back is built (every open builds it afresh).
  function attach(card, item){
    var s=open={ id:item.id, item:item, c:fromRow(item.card_fields), loaded:false, saved:null, node:card };
    s.saved=stamp(s.c);
    var ready=function(){ return s===open && s.loaded; };
    var host={
      card:function(){ return ready() ? s.c : null; },
      changed:function(){ save(s); },
      tint:function(){ return s.node; }
    };
    FGCardSchedule.wire(P, host);
    TYPED.forEach(function(n){
      var f=el(n); if(!f) return;
      f.addEventListener('change', function(){ if(!ready()) return; FGCardSchedule.read(P, s.c); save(s); });
    });
    ADDITIONS.forEach(function(a){
      var cb=el('add-'+a.key); if(!cb) return;
      cb.addEventListener('change', function(){
        if(!ready()){ cb.checked=!!s.c[a.flag]; return; }
        s.c[a.flag]=cb.checked;
        var body=el(a.key+'-body'); if(body) body.style.display=cb.checked?'':'none';
        if(a.flag==='addRoutine') FGCardSchedule.routineToggled(P, s.c, cb.checked, host);
        save(s);
      });
    });
    var cal=el('calendar');
    if(cal) cal.addEventListener('click', function(e){
      e.stopPropagation();
      if(!ready()) return;
      var typed=function(id, saved){ var f=document.getElementById(id); return (f?f.value:saved)||''; };
      FGCardSchedule.calendar(P, s.c, { id:s.id,
        title:typed('sb-subject-input', item.subject) || typed('sb-text-input', item.text_content||item.idea_text),
        notes:item.notes||'' });
    });
    paint(s);
    lockFields(true);
    load(s);
  }
  // The back is closing or another card is opening: keep whatever is typed.
  function flush(){
    var s=open; if(!s || !s.loaded || !s.node || !s.node.isConnected) return;
    FGCardSchedule.read(P, s.c);
    save(s);
  }
  // Resolves once everything saved for this card has reached the database.
  function settled(id){ return chains[id]||Promise.resolve(); }

  // ---- the card face ----------------------------------------------------------------------------------------------------------
  function frontHTML(item){
    if(!item || !item.card_fields || !window.FGCardSchedule) return '';
    var lines=FGCardSchedule.frontLines(fromRow(item.card_fields), function(k){
      if(window.FGCardBackOptions && FGCardBackOptions.isBackOnly(item.front_hidden,k)) return false;
      return !window.FGCardOptions || FGCardOptions.isOnWords(item.features, k, 'idea');
    });
    if(!lines) return '';
    var plan=(typeof _sboardIsPlanBoard!=='undefined' && _sboardIsPlanBoard && String(item.step_time||'').trim());
    return '<div class="sb-date-stack'+(plan?' sb-above-steptime':'')+'">'+lines+'</div>';
  }
  // A feature checked or unchecked: the faces follow.
  document.addEventListener('fg-features-changed', function(e){
    var d=e.detail||{}; if(!d.words || !/(start|due|routine|order)/.test(String(d.key||''))) return;
    if(typeof _sboardPatchRow!=='function') return;
    Object.keys(d.words).forEach(function(id){ _sboardPatchRow(id, {features:d.words[id]||null}); });
    if(open && d.words.hasOwnProperty(open.id)) open.item.features=d.words[open.id]||null;
    redraw();
  });

  (function(){
    if(document.getElementById('fg-idea-schedule-style')) return;
    var st=document.createElement('style'); st.id='fg-idea-schedule-style';
    st.textContent='.sb-date-stack{position:absolute;right:4px;bottom:3px;display:flex;flex-direction:column;align-items:flex-end;text-align:right;line-height:1.2;'
        +'font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;color:#5b4a38;pointer-events:none;z-index:4}'
      +'.sb-date-stack.sb-above-steptime{bottom:17px}'
      +'.sb-date-stack .bb-due{color:#a3372b}';
    document.head.appendChild(st);
  })();

  window.FGIdeaSchedule={ html:html, rows:rows, attach:attach, flush:flush, settled:settled, frontHTML:frontHTML, carry:carry, toRow:toRow, fromRow:fromRow, hasData:hasData };
})();
