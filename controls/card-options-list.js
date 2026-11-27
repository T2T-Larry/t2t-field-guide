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
   - ALL BLANK (Nov 27 2026, Larry: "Set default on FEATURES checklist to all blank"): no feature starts checked. A card has a feature once someone
     checks it (on that card or on one above it). Nothing saved on a card is erased while its feature is unchecked.
   - CUSTOM COMBOS (Nov 27 2026, Larry: "Briefing Cards are a Custom Combo!"): a combo is a named set of features that starts checked on one kind of
     card (COMBOS below). Briefing Board task cards start with theirs; an unchecked word saved on a card still wins.
     Saved Color, Text look and A-Z order keep showing until a card is explicitly unchecked (controls/feature-breakers.js, isOffRow); linked words likewise.

   HOW IT IS SAVED (no new column): the same ideas.features word list the Feature breakers use (controls/feature-breakers.js, writeStored).
     off-<key>  = the option has been switched off for the card.
     on-<key>   = the option has been switched on for the card.
     Neither word = unchecked, unless the card's Custom Combo holds the feature. A change writes one and removes the other.

   HOW THE CARD BACK FOLLOWS IT: card-back-fixed-rows.js asks applyTo(instance) every time it paints; rows and their opened bodies for an option that is off get the
   class fg-opt-off (display none). The Plan fields (Time, Step done) are found by selector.

   WHAT IS NOT ON THE LIST (Nov 25 2026, Larry): only FEATURES (things a person can choose to have, with an on-off) are listed. Attachments is a
   FUNCTION (always there, how a card works), so it is not an option and is never hidden; Link arrows is part of the one LINK option.

   VIEW AS CARD OPTION (Nov 27 2026, Larry): every checked feature is changed from this list (its title opens its popup). The "View as Card Option" box at
   the foot of the popup (controls/feature-place.js) also puts it on the back of the card. Saved as opt-<key> (on the card) / util-<key> (not); neither
   word = the starting place (place:'utility' below = not on the card, else on the card).
   DATES, DUPLICATE (Nov 27 2026): Dates is one feature made of Start Date, Due Date and Add to Calendar (the 'part' lines below, saved under their
   own words, switched together; its popup is controls/dates-popup.js). Duplicate is a feature that starts unchecked. Account is no longer a feature: My Info and Sign Out open from your name
   (people-team/name-hub.js).

   ADDING AN OPTION LATER: one line in OPTIONS. If it is a checklist row, add its row id to ROW_KEYS; if it is a plain button row, give the action an optKey.
   Public surface: window.FGCardOptions  .OPTIONS  .isOn(id,key)  .isOnWords(features,key,kind)  .set(id,key,on)  .setView(id,key,onCard)  .activate(id,key)  .rest(id,key)  .setAll(id,on)  .placeOf(id,key)
   .applyTo(instance)  .panel(item,box)  .actions(getItem) */
(function(){
  var OPTIONS=[
    { key:'az',       label:'A-Z',  place:'utility' },   // Nov 27 2026 (Larry: "A-Z is a feature, Remove from PREFERENCES")
    { key:'calendar', label:'Calendar', place:'utility', part:'dates' },
    { key:'color',    label:'Color',  place:'utility' },
    // DATES is one feature with one switch (Nov 27 2026); Add to Calendar lives in its popup.
    { key:'dates',    label:'Dates', parts:['start','due'] },
    { key:'due',      label:'Due Date', part:'dates' },
    // DUPLICATE copies only the card it is on (controls/card-duplicate.js).
    { key:'duplicate', label:'Duplicate', place:'utility' },
    { key:'image',    label:'Image'},
    { key:'library', label:'Library', breaker:true, place:'utility' },   // the Library breaker (controls/feature-breakers.js) is this option's switch
    { key:'links',    label:'Link'},
    { key:'lock',     label:'Lock',  place:'utility' },
    { key:'notes',    label:'Notes'},
    { key:'order',    label:'Order'},
    { key:'people',   label:'People'},
    { key:'priority', label:'Priority'},
    { key:'review',   label:'P&G review'},
    { key:'org',      label:'Organization', place:'utility' },
    // PLAN (Nov 27 2026, Larry: "Consolidate features: Plan step time and Step Done into 'Plan' feature"): one switch; its popup holds Time and Step done.
    { key:'plan',     label:'Plan'},
    { key:'flags',    label:'Signal Flags'},
    { key:'routine',  label:'Routine', place:'utility' },
    { key:'start',    label:'Start Date', part:'dates' },
    { key:'text',     label:'Text',  place:'utility' },
    // TIPS & TRIVIA (Nov 27 2026, Larry: "add as feature"): unchecked at the top card removes the flower on the TV frame and the other Trivia buttons.
    { key:'trivia',   label:'Tips & Trivia', place:'utility' }
  ];
  // FEATURE IDEAS (Nov 25 2026, Larry): BUDGET is not a feature until it has a VISION of its own, so it is hidden from every card back and is not on the list.
  OPTIONS.push({ key:'budget', label:'Budget', idea:true, place:'utility' });
  OPTIONS.sort(function(a,b){ return a.label.localeCompare(b.label); });
  // CUSTOM COMBOS: kind of card -> the features that start checked on it. 'task' = a Briefing Board card (the set those cards had on Nov 27 2026).
  var COMBOS={
    task:['az','calendar','color','due','image','links','lock','notes','people','priority','review','org','plan','flags','routine','start','text','trivia']
  };
  // Which checklist row (card-back-fixed-rows.js row id) belongs to which option. Dates is one row that opens both date fields, so each field follows its own option.
  var ROW_KEYS={ dates:['start','due'], flags:['flags'], routine:['routine'], budget:['budget'], links:['links'], org:['org'], order:['order'], image:['image'], attach:['attach'] };
  // Plain fields on a back that are options too (found by selector).
  var FIELD_SELECTORS={ plan:'#sb-plan-step',
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
  function inCombo(key,kind){ return !!COMBOS[kind] && COMBOS[kind].indexOf(key)>=0; }
  // The answer from a card's saved words (a card front has them on its row already).
  function isOnWords(features,key,kind){
    var o=optOf(key); if(!o) return true;
    // Dates is one switch: Start, Due and Add to Calendar are on while either date's word is on (Nov 27 2026).
    var dates=optOf('dates');
    if(o.parts || o.part==='dates') return dates.parts.some(function(k){ return saidOn(features,k,kind); });
    if(o.breaker) return (','+String(features||'')+',').indexOf(','+key+',')>=0;
    return saidOn(features,key,kind);
  }
  // What the saved words alone say about one key.
  function saidOn(features,key,kind){
    var w=','+String(features||'')+',';
    if(w.indexOf(',off-'+key+',')>=0) return false;
    return w.indexOf(',on-'+key+',')>=0 || inCombo(key,kind);
  }
  function isOn(id,key){
    var o=optOf(key); if(!o) return true;
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
  // A CHECK IN THE POPUP SWITCHES THE FEATURE ON (Nov 27 2026, Larry: "Checking any item activates the feature."). Only the box that was checked gets
  // checked, so this card does not also gain "View as Card Option"; the on- words go down the tree as with any switch.
  async function activate(id,key){
    var o=optOf(key), fb=FB(); if(!o || !fb) throw new Error('not available here');
    await fb.writeOne(id, [{key:'util-'+key, on:true}, {key:'opt-'+key, on:false}]);
    return fb.writeMany(id, wordsFor(o,true));
  }
  // The last green check cleared ("No checks = inactive"): off on this card only, nothing beneath it is touched.
  async function rest(id,key){
    var o=optOf(key), fb=FB(); if(!o || !fb) throw new Error('not available here');
    return fb.writeOne(id, wordsFor(o,false));
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
      (x.row.bodies||[]).forEach(function(bid){
        var b=document.getElementById(bid); if(!b) return;
        // A popup shows everything it holds, look-only while the feature is off.
        var held=!!b.closest('.fg-opt-popup');
        show(b, held || on); hold(b, !held || on);
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
  // A-Z also counts as checked while an order followed from above is in force, matching the green checks in its popup.
  function listChecked(id,key){ var o=window.T2TCardOrder; return (key==='az' && o && o.inUse) ? o.inUse(id) : isOn(id,key); }
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
      rows.forEach(function(x){ x.cb.checked=listChecked(item.id, x.o.key); if(x.cb.checked) n++; });
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

  // ---- screen-wide controls follow their feature (Nov 25 2026, Larry: "If a Feature is turned off, it never appears on any board. This is SOP.") ----
  // The TEAM head on the board header, and the PRIMARY head in the New Card popup, belong to People. People is set from the top card and cascades down,
  // so one look at the top card (the root every board hangs from) decides it for every board: unchecked People = those heads are gone everywhere.
  // TIPS & TRIVIA (Nov 27 2026) works the same way: unchecked at the top card = the TV frame's flower and the other Trivia buttons are gone.
  // The last answer is remembered on this device, so a switched-off control does not flash up while the page loads.
  function sbClient(){ return (window.T2T && window.T2T.sb) || null; }
  var SCREEN_WIDE=['people','trivia'];
  // 'off' = unchecked on purpose: gone everywhere. 'blank' = never checked: gone, except where a Custom Combo holds it (the Briefing Board's TEAM head).
  function showScreenWide(key,state){ var c=document.documentElement.classList; c.toggle('fg-'+key+'-off', state==='off'); c.toggle('fg-'+key+'-blank', state==='blank'); }
  async function syncBoardHeads(){
    try{
      var c=sbClient(); if(!c) return;
      var r=await c.from('ideas').select('id,project_id,features').is('cluster_id', null).limit(200);
      if(!r || r.error) return;
      var roots=(r.data || []).filter(function(x){ return x.id===x.project_id; });   // a root = a card that is its own project
      if(!roots.length) return;   // not signed in yet: keep what is showing
      SCREEN_WIDE.forEach(function(k){
        function has(word){ return roots.some(function(x){ return (','+String(x.features||'')+',').indexOf(','+word+',')>=0; }); }
        var state=has('off-'+k) ? 'off' : (has('on-'+k) ? 'on' : 'blank');
        showScreenWide(k,state);
        try{ localStorage.setItem('fg-'+k+'-state', state); }catch(e){}
      });
    }catch(e){}
  }
  SCREEN_WIDE.forEach(function(k){ try{ showScreenWide(k, localStorage.getItem('fg-'+k+'-state')||'blank'); }catch(e){ showScreenWide(k,'blank'); } });
  (function(){ var st=document.createElement('style'); st.id='fg-screen-wide-off-style';
    st.textContent='.fg-people-off #bb-view-cdrop,.fg-people-off #sc-view-cdrop,.fg-people-off #isx-p-cast-btn,'
      +'.fg-people-blank #sc-view-cdrop,.fg-people-blank #isx-p-cast-btn,'
      +'.fg-trivia-off .tv-knob[data-kind="trivia"],.fg-trivia-off #b-idea-trivia,.fg-trivia-off #b-search-trivia,'
      +'.fg-trivia-blank .tv-knob[data-kind="trivia"],.fg-trivia-blank #b-idea-trivia,.fg-trivia-blank #b-search-trivia{display:none!important}';
    document.head.appendChild(st); })();
  document.addEventListener('fg-features-changed', function(e){ var k=String((e.detail && e.detail.key) || ''); if(!e.detail || SCREEN_WIDE.some(function(w){ return k.indexOf(w)>=0; })) syncBoardHeads(); });
  setTimeout(syncBoardHeads, 1500); setTimeout(syncBoardHeads, 6000);

  // A change anywhere repaints every open back.
  document.addEventListener('fg-features-changed', function(){ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); });
  injectStyle();
  window.FGCardOptions={ OPTIONS:OPTIONS, isOn:isOn, isOnWords:isOnWords, set:set, setView:setView, activate:activate, rest:rest, setAll:setAll, placeOf:placeOf, applyTo:applyTo, panel:panel, actions:actions };
})();
