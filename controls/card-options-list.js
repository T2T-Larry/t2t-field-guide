/* CARD OPTIONS LIST -- the one list of every OPTION a card back can offer (Nov 24 2026, Larry: "GEAR PREFERENCES needs a list of all potential OPTIONS for a card as a
   checklist. When checked, these OPTIONS will be listed on the cards ... Start Date and Due Date are two lines ... and add color and text").

   WHAT YOU SEE
   NAMES (Nov 26 2026, Larry): FEATURES is this checklist; a checked feature shows up as an OPTION on the card.
   - Gear > FEATURES opens a checklist of every option a card back can offer, A to Z. Nothing to do with the front of the card:
     an option is on the list only because it can appear on the BACK of a card as a choice.
   - Checked = the option is listed on this card's back (in its OPTIONS checklist, or in its Gear for Organization, Routine, Budget, Links).
     Unchecked = it is not listed there. Whatever was saved on the card stays, so checking it again brings it back exactly as it was.
   - ALL (Nov 26 2026, Larry: "toggle ALL features on or off"): the box at the top checks or unchecks every feature at once. It shows a dash when only some are checked.
   - Like the Feature breakers, a change sets the card and every card beneath it. A card below can change it again for itself and its own children.
   - Every option that is on a card back today starts CHECKED, so nothing disappears. Color and Text are new to the list and start unchecked.
   - ONE CARD CODE (Nov 26 2026, Larry: "yes. one code for all cards."): every card type offers the same list. What starts checked is what that type of card
     already offered: Calendar, Start Date, Due Date, Routine and P&G review start checked on task cards only; Order starts checked on idea cards only.

   HOW IT IS SAVED (no new column): the same ideas.features word list the Feature breakers use (controls/feature-breakers.js, writeStored).
     off-<key>  = the option has been switched off for the card.
     on-<key>   = the option has been switched on for the card.
     Neither word = the starting setting for that type of card. A change writes one and removes the other.

   HOW THE CARD BACK FOLLOWS IT: card-back-fixed-rows.js asks applyTo(instance) every time it paints; rows and their opened bodies for an option that is off get the
   class fg-opt-off (display none). Plan step time and Step done are plain fields, found by selector.

   WHAT IS NOT ON THE LIST (Nov 25 2026, Larry): only FEATURES (things a person can choose to have, with an on-off) are listed. Attachments is a
   FUNCTION (always there, how a card works), so it is not an option and is never hidden; Link arrows is part of the one LINK option.

   VIEW AS CARD OPTION (Nov 27 2026, Larry): every checked feature is changed from this list (its title opens its popup). The "View as Card Option" box at
   the foot of the popup (controls/feature-place.js) also puts it on the back of the card. Saved as opt-<key> (on the card) / util-<key> (not); neither
   word = the starting place (place:'utility' below = not on the card, else on the card).
   DATES, ACCOUNT, DUPLICATE (Nov 27 2026): Dates is one feature made of Start Date, Due Date and Add to Calendar (the 'part' lines below, each still saved
   under its own words). Account (My Info, Sign Out) is a feature like any other. Duplicate is a feature that starts unchecked.

   ADDING AN OPTION LATER: one line in OPTIONS. If it is a checklist row, add its row id to ROW_KEYS; if it is a plain button row, give the action an optKey.
   Public surface: window.FGCardOptions  .OPTIONS  .isOn(id,key)  .isOnWords(features,key,kind)  .set(id,key,on)  .setView(id,key,onCard)  .setAll(id,on)  .placeOf(id,key)
   .applyTo(instance)  .panel(item,box)  .actions(getItem) */
(function(){
  // defaultOn: true = starts checked on every card; 'task' or 'idea' = starts checked on that type of card only; false = starts unchecked.
  var OPTIONS=[
    // Nov 27 2026 (Larry: "yes, but totally consistent. Failure to activate account denies that feature until selected."): Account is a feature like any other.
    { key:'account',  label:'Account', defaultOn:true, place:'utility' },
    { key:'az',       label:'A-Z', defaultOn:true,  place:'utility' },   // Nov 27 2026 (Larry: "A-Z is a feature, Remove from PREFERENCES")
    { key:'calendar', label:'Calendar', defaultOn:'task', place:'utility', part:'dates' },
    { key:'color',    label:'Color', defaultOn:true,  place:'utility' },
    // DATES is one feature (Nov 27 2026): Start and Due are switched separately inside its popup, and Add to Calendar lives there too.
    { key:'dates',    label:'Dates', parts:['start','due'] },
    { key:'due',      label:'Due Date', defaultOn:'task', part:'dates' },
    // DUPLICATE is a feature, off until checked; it copies only the card it is on (controls/card-duplicate.js).
    { key:'duplicate', label:'Duplicate', defaultOn:false, place:'utility' },
    { key:'image',    label:'Image', defaultOn:true  },
    { key:'library', label:'Library', defaultOn:false, breaker:true, place:'utility' },   // the Library breaker (controls/feature-breakers.js) is this option's switch
    { key:'links',    label:'Link', defaultOn:true  },
    { key:'lock',     label:'Lock', defaultOn:true,  place:'utility' },
    { key:'notes',    label:'Notes', defaultOn:true  },
    { key:'order',    label:'Order', defaultOn:'idea'  },
    { key:'people',   label:'People', defaultOn:true  },
    { key:'priority', label:'Priority', defaultOn:true  },
    { key:'review',   label:'P&G review', defaultOn:'task'  },
    { key:'org',      label:'Organization', defaultOn:true, place:'utility' },
    { key:'stepdone', label:'Step done', defaultOn:true  },
    { key:'steptime', label:'Plan step time', defaultOn:true  },
    { key:'flags',    label:'Signal Flags', defaultOn:true  },
    { key:'routine',  label:'Routine', defaultOn:'task', place:'utility' },
    { key:'start',    label:'Start Date', defaultOn:'task', part:'dates' },
    { key:'text',     label:'Text', defaultOn:true,  place:'utility' }
  ];
  // FEATURE IDEAS (Nov 25 2026, Larry): BUDGET is not a feature until it has a VISION of its own, so it is hidden from every card back and is not on the list.
  OPTIONS.push({ key:'budget', label:'Budget', defaultOn:false, idea:true, place:'utility' });
  OPTIONS.sort(function(a,b){ return a.label.localeCompare(b.label); });
  // Which checklist row (card-back-fixed-rows.js row id) belongs to which option. Dates is one row that opens both date fields, so each field follows its own option.
  var ROW_KEYS={ dates:['start','due'], flags:['flags'], routine:['routine'], budget:['budget'], links:['links'], org:['org'], order:['order'], image:['image'], attach:['attach'] };
  // Plain fields on a back that are options too (found by selector).
  var FIELD_SELECTORS={ steptime:'.sb-steptime-field', stepdone:'.sb-stepdone-field',
    lock:'#bb-d-lock, #sb-lock', calendar:'#bb-d-calendar, #idc-calendar',
    // PEOPLE (Nov 25 2026, Larry): unchecked People usually means one person on this board, so the 👥 button AND the PRIMARY head (👤) in the card back's top right hide with it.
    people:'#bb-d-people, #sb-people-btn, #bb-d-primary-cdrop, #sb-primary-trigger',
    image:'#sb-add-image-wrap, #bb-d-pic-row',   // Nov 26 2026 (Larry: "Image button is still on cards with no way to hide it"): the picture button follows the Image option, on both card backs
    review:'.bb-pg-band' };   // P&G review = the PRO and GROW boxes; VERIFIED stays, because it is how a finished card reaches the Archive
  function R(){ return window.FGLibraryRibbons || null; }
  function FB(){ return window.FGFeatureBreakers || null; }
  function optOf(key){ for(var i=0;i<OPTIONS.length;i++){ if(OPTIONS[i].key===key) return OPTIONS[i]; } return null; }
  function words(id){ var f=R() ? R().state(id).features : ''; return ','+String(f||'')+','; }
  // A task card is one the Briefing Board is holding; every other card is an idea card.
  function kindOf(id){ return (typeof _bbFindCardAnywhere==='function' && _bbFindCardAnywhere(id)) ? 'task' : 'idea'; }
  function startsOn(o,kind){ return o.defaultOn===true || o.defaultOn===kind; }
  // The answer from a card's saved words (a card front has them on its row already).
  function isOnWords(features,key,kind){
    var o=optOf(key); if(!o) return true;
    // Dates is on while either of its dates is on; Add to Calendar goes with Dates.
    if(o.parts) return o.parts.some(function(k){ return isOnWords(features,k,kind); });
    if(key==='calendar') return isOnWords(features,'dates',kind);
    var w=','+String(features||'')+',';
    if(o.breaker) return w.indexOf(','+key+',')>=0;
    if(w.indexOf(',off-'+key+',')>=0) return false;
    if(w.indexOf(',on-'+key+',')>=0) return true;
    return startsOn(o,kind);
  }
  function isOn(id,key){
    var o=optOf(key); if(!o) return true;
    if(o.parts || key==='calendar') return isOnWords(words(id), key, kindOf(id));
    if(o.breaker) return !!(FB() && FB().isOn(id,key));
    return isOnWords(words(id), key, kindOf(id));
  }
  // Set an option on or off for the card and every card beneath it. Returns the number of cards changed.
  async function set(id,key,on){
    var o=optOf(key), fb=FB(); if(!o || !fb) throw new Error('not available here');
    if(o.breaker) return fb.flip(id, key, on);
    return fb.writeMany(id, wordsFor(o,on));
  }
  // The saved words that make an option on or off. A breaker is saved under its own key; every other option writes its on- or off- word and removes the
  // other, so a choice made above holds the same on every type of card beneath.
  function wordsFor(o,on){
    if(o.breaker) return [{key:o.key, on:on}];
    // Dates on or off as a whole sets both dates and Add to Calendar.
    if(o.parts) return o.parts.concat(['calendar']).reduce(function(all,k){ return all.concat(wordsFor(optOf(k),on)); }, []);
    return [{key:'on-'+o.key, on:on}, {key:'off-'+o.key, on:!on}];
  }
  // Where a checked feature shows: 'option' (on the card) or 'utility' (only opened from the Gear's list).
  function placeOf(id,key){
    var o=optOf(key);
    // Dates is on the card when a date that is switched on (or, with none on, either date) is placed there.
    if(o && o.parts){ var live=o.parts.filter(function(k){ return isOn(id,k); }); return (live.length ? live : o.parts).some(function(k){ return placeOf(id,k)==='option'; }) ? 'option' : 'utility'; }
    var w=words(id);
    if(w.indexOf(',util-'+key+',')>=0) return 'utility';
    if(w.indexOf(',opt-'+key+',')>=0) return 'option';
    return (o && o.place) || 'option';
  }
  // VIEW AS CARD OPTION (Nov 27 2026): the box at the foot of a feature's popup. Checked shows the feature on the card, and switches it on if it was off;
  // unchecked leaves it on and takes it off the card. Saved in one pass, with the same words as before ('option' = on the card, 'utility' = not).
  async function setView(id,key,onCard){
    var o=optOf(key), fb=FB(); if(!o || !fb) throw new Error('not available here');
    var changes=[], parts=o.parts || [key];
    if(onCard && !isOn(id,key)) changes=wordsFor(o,true);
    parts.forEach(function(k){ changes=changes.concat([{key:'util-'+k, on:!onCard}, {key:'opt-'+k, on:onCard}]); });
    return fb.writeMany(id, changes);
  }
  // The options on the checklist (a FEATURE IDEA is not on it, and a part of a feature is listed under that feature).
  function listed(){ return OPTIONS.filter(function(o){ return !o.idea && !o.part; }); }
  // Every listed option on or off together, saved in one pass.
  async function setAll(id,on){
    var fb=FB(); if(!fb) throw new Error('not available here');
    return fb.writeMany(id, listed().reduce(function(all,o){ return all.concat(wordsFor(o,on)); }, []));
  }

  function injectStyle(){
    if(document.getElementById('fg-card-options-style')) return;
    var st=document.createElement('style'); st.id='fg-card-options-style';
    st.textContent='.fg-opt-off{display:none!important}'
      // Columns that read A to Z downward, so the whole list shows in the standard popup (Nov 26 2026, Larry).
      +'.fg-co-list{column-width:98px;column-gap:6px}'
      +'.fg-co-row{display:flex;align-items:center;gap:4px;min-height:calc(16px * var(--fg-text-scale,1));cursor:pointer;break-inside:avoid;line-height:1.15}'
      +'.fg-co-row input{flex:0 0 auto;margin:0;width:12px;height:12px;cursor:pointer;accent-color:#1e9e4a}'
      +'.fg-co-lab{flex:1 1 auto;min-width:0;font-weight:700;font-size:calc(10.5px * var(--fg-text-scale,1))}'
      +'.fg-co-all .fg-co-lab{text-transform:uppercase;letter-spacing:1px}'
      +'button.fg-co-lab{padding:0;border:0;background:transparent;color:inherit;font-family:inherit;line-height:inherit;text-align:left;cursor:pointer}'
      +'button.fg-co-lab:hover{text-decoration:underline}';
    document.head.appendChild(st);
  }

  // ---- the card back follows the list ---------------------------------------------------------------------------------------
  function cardIdOf(inst){
    var c=inst && inst.cfg; if(!c) return null;
    try{ if(c.cardId) return c.cardId(); if(c.link && c.link.cardId) return c.link.cardId(); }catch(e){}
    return null;
  }
  function show(el,on){ if(el) el.classList.toggle('fg-opt-off', !on); }
  // Look-only (faded, not clickable) while a popup holds a control whose own feature is off.
  function hold(el,live){ el.inert=!live; el.classList.toggle('fg-opt-preview', !live); }
  function applyTo(inst){
    var id=cardIdOf(inst); if(!id) return;
    // The saved list is read fresh whenever this back is showing a different card than the last time.
    if(inst.__optCard!==id){
      inst.__optCard=id;
      if(R()) R().fetchOne(id).then(function(){ if(inst.__optCard===id && window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); });
    }
    var P=window.FGFeaturePlace || null, back=inst.block ? inst.block.closest('.fg-back-3x5') : null;
    // on = checked for this card; here = checked AND placed on the card (a UTILITY waits in the Gear).
    function on_(k){ return P ? P.isOn(id,k,back) : isOn(id,k); }
    function here(k){ return on_(k) && placeOf(id,k)==='option'; }
    (inst.rows||[]).forEach(function(x){
      var keys=ROW_KEYS[x.row.id]; if(!keys) return;
      var on=keys.some(on_);
      if(x.row.d) show(x.row.d, keys.some(here));
      // In the Dates row each date field follows its own option (its body is named ...-start-body or ...-due-body on every card back).
      (x.row.bodies||[]).forEach(function(bid){
        var b=document.getElementById(bid); if(!b) return;
        var own=keys.filter(function(k){ return x.row.id==='dates' && bid.slice(-(k.length+6))==='-'+k+'-body'; })[0];
        // A popup shows everything it holds; in Dates the field that is switched off is look-only.
        var held=!!b.closest('.fg-opt-popup'), live=own ? on_(own) : on;
        show(b, held || live); hold(b, !held || live);
      });
    });
    if(inst.block){
      Array.prototype.forEach.call(inst.block.querySelectorAll('[data-fg-opt]'), function(d){ show(d, here(d.getAttribute('data-fg-opt'))); });
      // The plain rows for features whose control lives elsewhere (Account, Duplicate, Lock, People, Organization, Routine, Library).
      Array.prototype.forEach.call(inst.block.querySelectorAll('[data-fg-proxy]'), function(d){
        var k=d.getAttribute('data-fg-proxy'); show(d, !!P && here(k) && P.available(k,back));
        var cb=d.querySelector('input'); if(cb && P){ var u=P.used(k,back); cb.checked=u; cb.setAttribute('data-st', u?'1':'0'); }
      });
    }
    // Priority and the LINK arrows (which follow the one LINK option) are built into the main checklist by the card back itself.
    if(inst.pri && inst.pri.d) show(inst.pri.d, here('priority'));
    if(inst.link){ show(inst.link, here('links')); if(inst.link.__body) show(inst.link.__body, on_('links') || !!inst.link.__body.closest('.fg-opt-popup')); }   // Nov 25 2026 (Larry): LINK is one feature; its arrows are part of it, not a separate option
    Object.keys(FIELD_SELECTORS).forEach(function(k){
      Array.prototype.forEach.call(document.querySelectorAll(FIELD_SELECTORS[k]), function(el){
        // A control a popup is holding always shows, wherever the feature is placed; while the feature is off the popup itself is look-only.
        if(el.closest('.fg-opt-popup')){ show(el, true); return; }
        // Each card answers only for its own back: a field sitting on a different card back follows that card's list, not this one's.
        var home=el.closest('.fg-back-3x5');
        if(home && back && home!==back) return;
        // A button lent to a Gear popup is on no card for the moment: its id says which kind of back it belongs to (bb-... = task, sb-/idc-... = the others).
        if(!home && el.id && inst.block && /^(bb|sb|idc)-/.test(el.id) && (el.id.indexOf('bb-')===0) === !!inst.block.closest('.fg-cardback-idea')) return;
        // A locked card always keeps its Lock button, so it can never be stuck locked.
        var stuck = k==='lock' && (el.textContent||'').indexOf('\uD83D\uDD12')>=0;
        show(el, here(k) || stuck);
      });
    });
  }

  // ---- Color and Text: check box rows like Notes (Nov 25 2026, Larry: Color had no check box); the box shows the card has its own color / text look, and a click opens the feature's popup (controls/feature-place.js, one tree, one code) -----------------
  function actions(getItem){
    function opener(key){ return function(){ if(window.FGFeaturePlace) FGFeaturePlace.open(key, 1); }; }
    return [
      { label:'Color', title:'Choose the color of this card',  optKey:'color', icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && i.color)); }, run:opener('color') },
      { label:'Text',  title:'Choose how the text looks',      optKey:'text',  icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && (i.subject_bold||i.subject_caps||i.subject_italic))); }, run:opener('text')  }
    ];
  }

  // ---- the checklist in Gear > Features ----------------------------------------------------------------------
  function panel(item, box){
    injectStyle();
    var list=document.createElement('div'); list.className='fg-co-list'; box.appendChild(list);
    var status=document.createElement('div'); status.className='fg-gh-status'; box.appendChild(status);
    var rows=[], busy=false;
    function makeRow(text, cls){
      var row=document.createElement('label'); row.className='fg-co-row'+(cls ? ' '+cls : '');
      var cb=document.createElement('input'); cb.type='checkbox';
      var lab=document.createElement('span'); lab.className='fg-co-lab'; lab.textContent=text;
      row.appendChild(cb); row.appendChild(lab);
      return {row:row, cb:cb};
    }
    // One save at a time: the boxes wait while it runs, then show what the card really holds.
    // Nov 26 2026 (Larry: "Delete the sentence at the bottom of the FEATURES popup"): nothing is written under the list unless a save fails.
    async function save(work){
      if(busy) return;
      busy=true; lock(true); status.textContent='';
      try{ await work(); }
      catch(err){ status.textContent='Could not save it: '+err.message; }
      busy=false; lock(false); paint();
    }
    // ALL leads the list.
    var all=makeRow('All', 'fg-co-all'); list.appendChild(all.row);
    all.cb.addEventListener('change', function(){
      var want=all.cb.checked;
      save(function(){ return setAll(item.id, want); });
    });
    listed().forEach(function(o){
      // The box turns the feature on or off; the title opens its popup (Nov 26 2026, Larry: "Click the title anywhere to open the popup").
      var row=document.createElement('div'); row.className='fg-co-row';
      var cb=document.createElement('input'); cb.type='checkbox'; cb.setAttribute('aria-label', o.label+' on');
      var title=document.createElement('button'); title.type='button'; title.className='fg-co-lab'; title.textContent=o.label; title.title='Open '+o.label;
      title.addEventListener('click', function(e){ e.stopPropagation(); if(window.FGFeaturePlace) FGFeaturePlace.open(o.key, 2); });
      row.appendChild(cb); row.appendChild(title);
      var x={row:row, cb:cb}; list.appendChild(x.row);
      x.cb.addEventListener('change', function(){
        var want=x.cb.checked;
        save(function(){ return set(item.id, o.key, want); });
      });
      rows.push({o:o, cb:x.cb});
    });
    function lock(v){ all.cb.disabled=v; rows.forEach(function(x){ x.cb.disabled=v; }); }
    function paint(){
      var n=0;
      rows.forEach(function(x){ x.cb.checked=isOn(item.id, x.o.key); if(x.cb.checked) n++; });
      all.cb.checked=n===rows.length;
      all.cb.indeterminate=n>0 && n<rows.length;
    }
    paint();
    // A feature switched on or off from its popup shows on this list at once.
    document.addEventListener('fg-features-changed', function onChange(){
      if(!list.isConnected){ document.removeEventListener('fg-features-changed', onChange); return; }
      if(!busy) paint();
    });
    if(R()) R().fetchOne(item.id).then(function(){ if(!busy) paint(); });   // look the card up fresh, in case it was changed from above
  }

  // ---- the board heads follow People (Nov 25 2026, Larry: "If a Feature is turned off, it never appears on any board. This is SOP.") ----
  // The TEAM head on the board header, and the PRIMARY head in the New Card popup, belong to People. People is set from the top card and cascades down,
  // so one look at the top card (the root every board hangs from) decides it for every board: unchecked People = those heads are gone everywhere.
  function sbClient(){ return (window.T2T && window.T2T.sb) || null; }
  async function syncBoardHeads(){
    try{
      var c=sbClient(); if(!c) return;
      var r=await c.from('ideas').select('id,project_id,features').is('cluster_id', null).limit(200);
      var roots=((r && r.data) || []).filter(function(x){ return x.id===x.project_id; });   // a root = a card that is its own project
      var off=roots.some(function(x){ return (','+String(x.features||'')+',').indexOf(',off-people,')>=0; });
      document.documentElement.classList.toggle('fg-people-off', off);
    }catch(e){}
  }
  (function(){ var st=document.createElement('style'); st.id='fg-people-off-style';
    st.textContent='.fg-people-off #bb-view-cdrop,.fg-people-off #sc-view-cdrop,.fg-people-off #isx-p-cast-btn{display:none!important}';
    document.head.appendChild(st); })();
  document.addEventListener('fg-features-changed', function(e){ if(!e.detail || String(e.detail.key||'').indexOf('people')>=0) syncBoardHeads(); });
  setTimeout(syncBoardHeads, 1500); setTimeout(syncBoardHeads, 6000);

  // A change anywhere repaints every open back.
  document.addEventListener('fg-features-changed', function(){ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); });
  injectStyle();
  window.FGCardOptions={ OPTIONS:OPTIONS, isOn:isOn, isOnWords:isOnWords, set:set, setView:setView, setAll:setAll, placeOf:placeOf, applyTo:applyTo, panel:panel, actions:actions };
})();
