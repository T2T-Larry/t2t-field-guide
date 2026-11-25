/* CARD OPTIONS LIST -- the one list of every OPTION a card back can offer (Nov 24 2026, Larry: "GEAR PREFERENCES needs a list of all potential OPTIONS for a card as a
   checklist. When checked, these OPTIONS will be listed on the cards ... Start Date and Due Date are two lines ... and add color and text").

   WHAT YOU SEE
   - Gear > Preferences > OPTIONS opens a checklist of every option a card back can offer, A to Z. Nothing to do with the front of the card:
     an option is on the list only because it can appear on the BACK of a card as a choice.
   - Checked = the option is listed on this card's back (in its OPTIONS checklist, or in its Gear for Organization, Routine, Budget, Links).
     Unchecked = it is not listed there. Whatever was saved on the card stays, so checking it again brings it back exactly as it was.
   - Like the Feature breakers, a change sets the card and every card beneath it. A card below can change it again for itself and its own children.
   - Every option that is on a card back today starts CHECKED, so nothing disappears. Color and Text are new to the list and start unchecked.

   HOW IT IS SAVED (no new column): the same ideas.features word list the Feature breakers use (controls/feature-breakers.js, writeStored).
     off-<key>  = an option that is normally on has been switched off for the card.
     on-<key>   = an option that is normally off has been switched on for the card.

   HOW THE CARD BACK FOLLOWS IT: card-back-fixed-rows.js asks applyTo(instance) every time it paints; rows and their opened bodies for an option that is off get the
   class fg-opt-off (display none). Plan step time and Step done are plain fields, found by selector.

   WHAT IS NOT ON THE LIST (Nov 25 2026, Larry): only FEATURES (things a person can choose to have, with an on-off) are listed. Attachments, Duplicate and Image are
   FUNCTIONS (always there, how a card works), so they are not options and are never hidden; Link arrows is part of the one LINK option.

   ADDING AN OPTION LATER: one line in OPTIONS. If it is a checklist row, add its row id to ROW_KEYS; if it is a plain button row, give the action an optKey.
   Public surface: window.FGCardOptions  .OPTIONS  .isOn(id,key)  .set(id,key,on)  .applyTo(instance)  .panel(item,box)  .actions(getItem) */
(function(){
  // defaultOn = true when it already appears on card backs today.
  var OPTIONS=[
    { key:'budget',   label:'Budget', defaultOn:true  },
    { key:'calendar', label:'Calendar', defaultOn:true  },
    { key:'color',    label:'Color', defaultOn:false },
    { key:'due',      label:'Due Date', defaultOn:true  },
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
  OPTIONS.sort(function(a,b){ return a.label.localeCompare(b.label); });
  // Which checklist row (card-back-fixed-rows.js row id) belongs to which option. Dates is one row that opens both date fields, so each field follows its own option.
  var ROW_KEYS={ dates:['start','due'], flags:['flags'], routine:['routine'], budget:['budget'], links:['links'], org:['org'], order:['order'], image:['image'], attach:['attach'] };
  // Plain fields on a back that are options too (found by selector).
  var FIELD_SELECTORS={ steptime:'.sb-steptime-field', stepdone:'.sb-stepdone-field',
    lock:'#bb-d-lock, #sb-lock', people:'#bb-d-people, #sb-people-btn', calendar:'#bb-d-calendar',
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
    // A normally-on option is switched OFF by adding its off- word; a normally-off option is switched ON by adding its on- word.
    return fb.writeStored(id, (o.defaultOn?'off-':'on-')+key, o.defaultOn ? !on : on);
  }

  function injectStyle(){
    if(document.getElementById('fg-card-options-style')) return;
    var st=document.createElement('style'); st.id='fg-card-options-style';
    st.textContent='.fg-opt-off{display:none!important}'
      +'.fg-co-row{display:flex;align-items:center;gap:8px;min-height:24px;cursor:pointer}'
      +'.fg-co-row input{margin:0;width:15px;height:15px;cursor:pointer;accent-color:#1e9e4a}'
      +'.fg-co-lab{flex:1 1 auto;min-width:0;font-weight:700}'
      +'.fg-co-list{max-height:min(54vh,380px);overflow:auto}';
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
        // A locked card always keeps its Lock button, so it can never be stuck locked.
        var stuck = k==='lock' && (el.textContent||'').indexOf('\uD83D\uDD12')>=0;
        show(el, isOn(id,k) || stuck);
      });
    });
  }

  // ---- Color and Text: check box rows like Notes (Nov 25 2026, Larry: Color had no check box); the box shows the card has its own color / text look, and a click opens the Gear's own Color / Text popups (one tree, one code) -----------------
  function actions(getItem){
    function opener(clusterKey){ return function(){ var item=getItem(); if(item && window.FGGearHub) FGGearHub.openCluster(clusterKey, item, document.activeElement); }; }
    return [
      { label:'Color', title:'Choose the color of this card',  optKey:'color', icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && i.color)); }, run:opener('color') },
      { label:'Text',  title:'Choose how the text looks',      optKey:'text',  icon:'', checkbox:true, toggle:true, probe:function(){ var i=getItem(); return Promise.resolve(!!(i && (i.subject_bold||i.subject_caps||i.subject_italic))); }, run:opener('text')  }
    ];
  }

  // ---- the checklist in Gear > Preferences > Options ----------------------------------------------------------------------
  function panel(item, box){
    injectStyle();
    var p=document.createElement('p'); p.textContent='Checked options are listed on this card and every card beneath it.'; box.appendChild(p);
    var list=document.createElement('div'); list.className='fg-co-list'; box.appendChild(list);
    var status=document.createElement('div'); status.className='fg-gh-status'; box.appendChild(status);
    var rows=[];
    OPTIONS.forEach(function(o){
      var row=document.createElement('label'); row.className='fg-co-row';
      var cb=document.createElement('input'); cb.type='checkbox';
      var lab=document.createElement('span'); lab.className='fg-co-lab'; lab.textContent=o.label;
      row.appendChild(cb); row.appendChild(lab); list.appendChild(row);
      cb.addEventListener('change', async function(){
        var want=cb.checked; cb.disabled=true; status.textContent='Saving '+o.label+'…';
        try{
          var n=await set(item.id, o.key, want);
          status.textContent=o.label+(want?' is listed':' is no longer listed')+' on this card'+(n>1 ? ' and '+(n-1)+' card'+(n-1===1?'':'s')+' beneath it.' : '.');
        }catch(err){ cb.checked=!want; status.textContent='Could not save it: '+err.message; }
        cb.disabled=false;
      });
      rows.push({o:o, cb:cb});
    });
    function paint(){ rows.forEach(function(x){ x.cb.checked=isOn(item.id, x.o.key); }); }
    paint();
    if(R()) R().fetchOne(item.id).then(paint);   // look the card up fresh, in case it was changed from above
  }

  // A change anywhere repaints every open back.
  document.addEventListener('fg-features-changed', function(){ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); });
  injectStyle();
  window.FGCardOptions={ OPTIONS:OPTIONS, isOn:isOn, set:set, applyTo:applyTo, panel:panel, actions:actions };
})();
