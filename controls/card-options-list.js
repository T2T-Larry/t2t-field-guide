/* CARD OPTIONS LIST -- the one list of every OPTION a card back can offer (Nov 24 2026, Larry: "GEAR PREFERENCES needs a list of all potential OPTIONS for a card as a
   checklist. When checked, these OPTIONS will be listed on the cards ... Start Date and Due Date are two lines ... and add color and text").

   WHAT YOU SEE
   NAMES (Nov 26 2026, Larry): FEATURES is this checklist; a checked feature shows up as an OPTION on the card.
   - Gear > Preferences > FEATURES opens a checklist of every option a card back can offer, A to Z. Nothing to do with the front of the card:
     an option is on the list only because it can appear on the BACK of a card as a choice.
   - Checked = the option is listed on this card's back (in its OPTIONS checklist, or in its Gear for Organization, Routine, Budget, Links).
     Unchecked = it is not listed there. Whatever was saved on the card stays, so checking it again brings it back exactly as it was.
   - ALL (Nov 26 2026, Larry: "toggle ALL features on or off"): the box at the top checks or unchecks every feature at once. It shows a dash when only some are checked.
   - Like the Feature breakers, a change sets the card and every card beneath it. A card below can change it again for itself and its own children.
   - Every option that is on a card back today starts CHECKED, so nothing disappears. Color and Text are new to the list and start unchecked.

   HOW IT IS SAVED (no new column): the same ideas.features word list the Feature breakers use (controls/feature-breakers.js, writeStored).
     off-<key>  = an option that is normally on has been switched off for the card.
     on-<key>   = an option that is normally off has been switched on for the card.

   HOW THE CARD BACK FOLLOWS IT: card-back-fixed-rows.js asks applyTo(instance) every time it paints; rows and their opened bodies for an option that is off get the
   class fg-opt-off (display none). Plan step time and Step done are plain fields, found by selector.

   WHAT IS NOT ON THE LIST (Nov 25 2026, Larry): only FEATURES (things a person can choose to have, with an on-off) are listed. Attachments and Duplicate are
   FUNCTIONS (always there, how a card works), so they are not options and are never hidden; Link arrows is part of the one LINK option.

   ADDING AN OPTION LATER: one line in OPTIONS. If it is a checklist row, add its row id to ROW_KEYS; if it is a plain button row, give the action an optKey.
   Public surface: window.FGCardOptions  .OPTIONS  .isOn(id,key)  .set(id,key,on)  .setAll(id,on)  .applyTo(instance)  .panel(item,box)  .actions(getItem) */
(function(){
  // defaultOn = true when it already appears on card backs today.
  var OPTIONS=[
    { key:'calendar', label:'Calendar', defaultOn:true  },
    { key:'color',    label:'Color', defaultOn:false },
    { key:'due',      label:'Due Date', defaultOn:true  },
    { key:'image',    label:'Image', defaultOn:true  },
    { key:'library', label:'Library', defaultOn:false, breaker:true },   // the Library breaker (controls/feature-breakers.js) is this option's switch
    { key:'links',    label:'Link', defaultOn:true  },
    { key:'lock',     label:'Lock', defaultOn:true  },
    { key:'notes',    label:'Notes', defaultOn:true  },
    { key:'order',    label:'Order', defaultOn:true  },
    { key:'people',   label:'People', defaultOn:true  },
    { key:'priority', label:'Priority', defaultOn:true  },
    { key:'review',   label:'P&G review', defaultOn:true  },
    { key:'org',      label:'Organization', defaultOn:true  },
    { key:'stepdone', label:'Step done', defaultOn:true  },
    { key:'steptime', label:'Plan step time', defaultOn:true  },
    { key:'flags',    label:'Signal Flags', defaultOn:true  },
    { key:'routine',  label:'Routine', defaultOn:true  },
    { key:'start',    label:'Start Date', defaultOn:true  },
    { key:'text',     label:'Text', defaultOn:false }
  ];
  // FEATURE IDEAS (Nov 25 2026, Larry): BUDGET is not a feature until it has a VISION of its own, so it is hidden from every card back and is not on the list.
  OPTIONS.push({ key:'budget', label:'Budget', defaultOn:false, idea:true });
  OPTIONS.sort(function(a,b){ return a.label.localeCompare(b.label); });
  // Which checklist row (card-back-fixed-rows.js row id) belongs to which option. Dates is one row that opens both date fields, so each field follows its own option.
  var ROW_KEYS={ dates:['start','due'], flags:['flags'], routine:['routine'], budget:['budget'], links:['links'], org:['org'], order:['order'], image:['image'], attach:['attach'] };
  // Plain fields on a back that are options too (found by selector).
  var FIELD_SELECTORS={ steptime:'.sb-steptime-field', stepdone:'.sb-stepdone-field',
    lock:'#bb-d-lock, #sb-lock', calendar:'#bb-d-calendar',
    // PEOPLE (Nov 25 2026, Larry): unchecked People usually means one person on this board, so the 👥 button AND the PRIMARY head (👤) in the card back's top right hide with it.
    people:'#bb-d-people, #sb-people-btn, #bb-d-primary-cdrop, #sb-primary-trigger',
    image:'#sb-add-image-wrap, #bb-d-pic-row',   // Nov 26 2026 (Larry: "Image button is still on cards with no way to hide it"): the picture button follows the Image option, on both card backs
    review:'.bb-pg-band' };   // P&G review = the PRO and GROW boxes; VERIFIED stays, because it is how a finished card reaches the Archive
  // The opened body of each date field, so Start and Due can be listed on their own.
  var BODY_OF={ start:'bb-d-start-body', due:'bb-d-due-body' };

  function R(){ return window.FGLibraryRibbons || null; }
  function FB(){ return window.FGFeatureBreakers || null; }
  function optOf(key){ for(var i=0;i<OPTIONS.length;i++){ if(OPTIONS[i].key===key) return OPTIONS[i]; } return null; }
  function words(id){ var f=R() ? R().state(id).features : ''; return ','+String(f||'')+','; }
  function isOn(id,key){
    var o=optOf(key); if(!o) return true;
    if(o.breaker) return !!(FB() && FB().isOn(id,key));
    var w=words(id);
    return o.defaultOn ? w.indexOf(',off-'+key+',')<0 : w.indexOf(',on-'+key+',')>=0;
  }
  // Set an option on or off for the card and every card beneath it. Returns the number of cards changed.
  async function set(id,key,on){
    var o=optOf(key), fb=FB(); if(!o || !fb) throw new Error('not available here');
    if(o.breaker) return fb.flip(id, key, on);
    var w=wordFor(o,on);
    return fb.writeStored(id, w.key, w.on);
  }
  // The saved word that makes an option on or off. A breaker is saved under its own key; a normally-on option is switched OFF by adding its off- word;
  // a normally-off option is switched ON by adding its on- word.
  function wordFor(o,on){
    if(o.breaker) return {key:o.key, on:on};
    return o.defaultOn ? {key:'off-'+o.key, on:!on} : {key:'on-'+o.key, on:on};
  }
  // The options on the checklist (a FEATURE IDEA is not on it).
  function listed(){ return OPTIONS.filter(function(o){ return !o.idea; }); }
  // Every listed option on or off together, saved in one pass.
  async function setAll(id,on){
    var fb=FB(); if(!fb) throw new Error('not available here');
    return fb.writeMany(id, listed().map(function(o){ return wordFor(o,on); }));
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
      +'.fg-co-all .fg-co-lab{text-transform:uppercase;letter-spacing:1px}';
    document.head.appendChild(st);
  }

  // ---- the card back follows the list ---------------------------------------------------------------------------------------
  function cardIdOf(inst){
    var c=inst && inst.cfg; if(!c) return null;
    try{ if(c.cardId) return c.cardId(); if(c.link && c.link.cardId) return c.link.cardId(); }catch(e){}
    return null;
  }
  function show(el,on){ if(el) el.classList.toggle('fg-opt-off', !on); }
  function applyTo(inst){
    var id=cardIdOf(inst); if(!id) return;
    // The saved list is read fresh whenever this back is showing a different card than the last time.
    if(inst.__optCard!==id){
      inst.__optCard=id;
      if(R()) R().fetchOne(id).then(function(){ if(inst.__optCard===id && window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); });
    }
    (inst.rows||[]).forEach(function(x){
      var keys=ROW_KEYS[x.row.id]; if(!keys) return;
      var on=keys.some(function(k){ return isOn(id,k); });
      if(x.row.d) show(x.row.d, on);
      if(x.row.id==='dates'){
        keys.forEach(function(k){ var b=document.getElementById(BODY_OF[k]); if(b) show(b, isOn(id,k)); });
      } else (x.row.bodies||[]).forEach(function(bid){ var b=document.getElementById(bid); if(b) show(b, on); });
    });
    if(inst.block){
      Array.prototype.forEach.call(inst.block.querySelectorAll('[data-fg-opt]'), function(d){ show(d, isOn(id, d.getAttribute('data-fg-opt'))); });
    }
    // Priority and the LINK arrows (which follow the one LINK option) are built into the main checklist by the card back itself.
    if(inst.pri && inst.pri.d) show(inst.pri.d, isOn(id,'priority'));
    if(inst.link){ show(inst.link, isOn(id,'links')); if(inst.link.__body) show(inst.link.__body, isOn(id,'links')); }   // Nov 25 2026 (Larry): LINK is one feature; its arrows are part of it, not a separate option
    Object.keys(FIELD_SELECTORS).forEach(function(k){
      Array.prototype.forEach.call(document.querySelectorAll(FIELD_SELECTORS[k]), function(el){
        // Each card answers only for its own back: a field sitting on a different card back follows that card's list, not this one's.
        var home=el.closest('.fg-back-3x5'), mine=inst.block && inst.block.closest('.fg-back-3x5');
        if(home && mine && home!==mine) return;
        // A locked card always keeps its Lock button, so it can never be stuck locked.
        var stuck = k==='lock' && (el.textContent||'').indexOf('\uD83D\uDD12')>=0;
        show(el, isOn(id,k) || stuck);
      });
    });
  }

  // ---- Color and Text: check box rows like Notes (Nov 25 2026, Larry: Color had no check box); the box shows the card has its own color / text look, and a click opens the Gear's own Color / Text popups (one tree, one code) -----------------
  // openFn (optional): a card back that has to look its card up first (the task card) opens the popup itself.
  function actions(getItem, openFn){
    function opener(clusterKey){ return function(){ if(openFn) return openFn(clusterKey); var item=getItem(); if(item && window.FGGearHub) FGGearHub.openCluster(clusterKey, item, document.activeElement); }; }
    return [
      { label:'Color', title:'Choose the color of this card',  optKey:'color', icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && i.color)); }, run:opener('color') },
      { label:'Text',  title:'Choose how the text looks',      optKey:'text',  icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && (i.subject_bold||i.subject_caps||i.subject_italic))); }, run:opener('text')  }
    ];
  }

  // ---- the checklist in Gear > Preferences > Features ----------------------------------------------------------------------
  function panel(item, box){
    injectStyle();
    var list=document.createElement('div'); list.className='fg-co-list'; list.title='Checked features are offered as options on this card and every card beneath it'; box.appendChild(list);
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
    async function save(name, work, done){
      if(busy) return;
      busy=true; lock(true); status.textContent='Saving '+name+'…';
      try{
        var n=await work();
        status.textContent=done+' on this card'+(n>1 ? ' and '+(n-1)+' card'+(n-1===1?'':'s')+' beneath it.' : '.');
      }catch(err){ status.textContent='Could not save it: '+err.message; }
      busy=false; lock(false); paint();
    }
    // ALL leads the list.
    var all=makeRow('All', 'fg-co-all'); list.appendChild(all.row);
    all.cb.addEventListener('change', function(){
      var want=all.cb.checked;
      save('all features', function(){ return setAll(item.id, want); }, want ? 'Every feature is offered' : 'No features are offered');
    });
    listed().forEach(function(o){
      var x=makeRow(o.label); list.appendChild(x.row);
      x.cb.addEventListener('change', function(){
        var want=x.cb.checked;
        save(o.label, function(){ return set(item.id, o.key, want); }, o.label+(want?' is offered':' is no longer offered'));
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
  window.FGCardOptions={ OPTIONS:OPTIONS, isOn:isOn, set:set, setAll:setAll, applyTo:applyTo, panel:panel, actions:actions };
})();
