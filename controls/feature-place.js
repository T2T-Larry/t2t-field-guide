/* FEATURE PLACE -- where each checked feature shows up, and the one popup every feature opens (Nov 26 2026, Larry: "an activated (checked) FEATURE to appear by
   toggle in either OPTIONS on the page for items more frequently used or in UTILITIES (in GEAR) for less frequent use items. Both user choices." then
   "divider line near the bottom of the popup like on the cards and place the OPTION/UTILITY toggle like HEADER/SUBBER toggle").

   WHAT YOU SEE
   - Every feature popup ends in a divider line with one three-way button under it (Nov 27 2026, Larry: "All one three way toggle?"):
     OFF (grey) -> OPTION (green: on, shown on the card) -> UTILITY (blue: on, a button in Gear > UTILITIES) -> back to OFF. Placing is only possible
     once a feature is on. It is the same on / off as the feature's box on the FEATURES list. The DATES popup has one button for Start and one for Due.
     A task card's Priority never moves, so there it is just ON / OFF.
   - Gear > Preferences > FEATURES: the box turns a feature on or off; the title opens its popup. OPTIONS rows and UTILITIES buttons open the very same popup.
   - A feature that is off appears in neither place. Its title on the FEATURES list still opens its popup, showing what is in it, faded and look-only,
     until it is switched on (Nov 27 2026, Larry: "Click the title to open the popup whether or not it has been activated!").
   - Start Date and Due Date share one popup (DATES), so they move together.

   HOW IT IS SAVED: controls/card-options-list.js (the util-/opt- words in ideas.features; a change sets the card and every card beneath it).
   HOW IT IS BUILT (one tree, one code): the popup shell is the OPTIONS popup (briefing-board/card-back-fixed-rows.js), except Color and Text, which are the
   Gear's own popup (controls/gear-hub.js). This file only finds each feature's existing controls on the open card back and hands them over.
   Public surface: window.FGFeaturePlace  .open(key, level)  .footer(popId, {level, noPlace})  .popIdOf(rowId)  .available(key, back)  .isOn(id, key, back)  .used(key, back)  .utilities(item, box) */
(function(){
  // One popup can hold two features (Dates = Start Date + Due Date).
  var KEYS={ dates:['start','due'] };
  var LABEL={ dates:'Dates', links:'Link' };
  var GEAR_BODY={ color:'color-selector', text:'text' };                     // popups the Gear's own code fills
  var NODE={ lock:'#bb-d-lock, #sb-lock', calendar:'#bb-d-calendar, #idc-calendar', people:'#bb-d-people, #sb-people-btn',
    image:'#bb-d-pic-row, #sb-add-image-wrap', steptime:'.sb-steptime-field', stepdone:'.sb-stepdone-field' };
  var CAPTION={ lock:'Lock or unlock this card', calendar:'Add this card’s date to your calendar', people:'Who is on this card', image:'Add a picture to this card' };
  // What a popup says when there is nothing to show in it.
  var NOT_HERE={ priority:'Always at the top of a task card.', steptime:'Used on plan step cards.', stepdone:'Used on plan step cards.' };
  var ROW_POPS=['order','flags','dates','org','routine','library'];

  function CO(){ return window.FGCardOptions || null; }
  function FR(){ return window.FGCardBackFixedRows || null; }
  function popIdOf(key){ return (key==='start' || key==='due') ? 'dates' : key; }
  function keysOf(popId){ return KEYS[popId] || [popId]; }
  function optionOf(key){ var c=CO(); return c ? c.OPTIONS.filter(function(o){ return o.key===key; })[0] : null; }
  function labelOf(popId){ var o=optionOf(popId); return LABEL[popId] || (o ? o.label : popId); }

  // The card back that is on screen.
  function currentBack(){
    var all=document.querySelectorAll('.fg-back-3x5 .fg-back-split');
    for(var i=0;i<all.length;i++){ if(all[i].getClientRects().length) return all[i].closest('.fg-back-3x5'); }
    return null;
  }
  // The checklists built on that back: the main OPTIONS list first, then the rest.
  function instancesIn(back){
    var all=(FR() && FR().instances) ? FR().instances() : {};
    return Object.keys(all).filter(function(k){ return back && back.contains(all[k].block); })
      .map(function(k){ return { key:k, inst:all[k] }; })
      .sort(function(a,b){ return (b.inst.main?1:0)-(a.inst.main?1:0); });
  }
  function mainOf(back){ return instancesIn(back).filter(function(x){ return x.inst.main; })[0] || null; }
  function cardIdOf(back){
    var m=mainOf(back); if(!m) return null;
    var c=m.inst.cfg;
    try{ if(c.cardId) return c.cardId(); if(c.link && c.link.cardId) return c.link.cardId(); }catch(e){}
    return null;
  }
  // A control on the card -- also found while a popup is holding it.
  function findOn(back, sel){
    var el=back ? back.querySelector(sel) : null; if(el) return el;
    var pop=document.querySelector('.fg-opt-popup'); return pop ? pop.querySelector(sel) : null;
  }
  function rowOn(back, rowId){
    var list=instancesIn(back);
    for(var i=0;i<list.length;i++){
      var x=list[i].inst.rows.filter(function(r){ return r.row.id===rowId; })[0];
      if(x) return { key:list[i].key, inst:list[i].inst, row:x.row };
    }
    return null;
  }
  function notesAct(back){
    var m=mainOf(back); if(!m) return null;
    return (m.inst.acts||[]).filter(function(x){ return x.a.optKey==='notes'; })[0] || null;
  }

  // Does this kind of card have a control for the feature?
  function available(key, back){
    back=back||currentBack(); if(!back) return false;
    var p=popIdOf(key), m=mainOf(back); if(!m) return false;
    if(p==='az') return !!(window.T2TCardOrder && cardIdOf(back));   // every card can hold cards, so every card can order them
    if(GEAR_BODY[p]) return !!(m.inst.acts||[]).filter(function(x){ return x.a.optKey===p; }).length;
    if(p==='priority') return !!m.inst.pri;
    if(p==='links') return !!(m.inst.link || rowOn(back,'links'));
    if(p==='notes') return !!notesAct(back);
    if(p==='review') return !!rowOn(back,'pg');
    if(ROW_POPS.indexOf(p)>=0) return !!rowOn(back,p);
    if(NODE[p]) return !!findOn(back, NODE[p]);
    return false;
  }
  function locked(back){ var b=findOn(back, NODE.lock); return !!(b && (b.textContent||'').indexOf('🔒')>=0); }
  // On for this card. A locked card always keeps its Lock, so it can never be stuck locked.
  function isOn(id, key, back){ var c=CO(); return !!(c && c.isOn(id,key)) || (key==='lock' && locked(back||currentBack())); }
  // The green check on a plain OPTIONS row: the card is using this feature.
  function used(key, back){
    back=back||currentBack();
    if(key==='lock') return locked(back);
    if(key==='az') return !!(window.T2TCardOrder && T2TCardOrder.isAlpha(cardIdOf(back)));
    var r=rowOn(back, popIdOf(key));
    if(r) return r.row.boxes.some(function(id){ var b=document.getElementById(id); return !!(b && b.checked); });
    return false;
  }

  // ---- the divider and the toggle ------------------------------------------------------------------------------------------
  function injectStyle(){
    if(document.getElementById('fg-feature-place-style')) return;
    var st=document.createElement('style'); st.id='fg-feature-place-style';
    st.textContent='.fg-place-foot{flex:0 0 auto;display:flex;justify-content:center;align-items:center;gap:8px;border-top:1.5px solid var(--bb-accent,#8a7a4a);margin:3px 8px 0;padding:3px 0}'
      +'.fg-place-btn{min-width:84px;padding:1px 12px;background:#fff;color:#2C2C2A;border:1px solid #B4B2A9;border-radius:8px;font-family:\'Playfair Display\',serif;font-size:calc(10.5px * var(--fg-text-scale,1));font-weight:700;line-height:1.35;cursor:pointer}'
      +'.fg-place-btn.is-on{background:#1e9e4a;color:#fff;border-color:#1e9e4a}'
      +'.fg-place-btn.is-utility{background:#378ADD;color:#fff;border-color:#378ADD}'
      +'.fg-place-btn.is-off{background:#e4e4e0;color:#55554f}'
      // A feature that is off: its popup can be looked at, not used, until it is switched on.
      +'.fg-opt-preview{opacity:.5;pointer-events:none}'
      +'.fg-opt-preview .fg-opt-preview{opacity:1}'
      +'.fg-opt-preview>.fg-lib-body{display:block!important}'   // the Library hides its shelves itself while off
      +'.fg-place-btn[disabled]{opacity:.55;cursor:wait}'
      +'.fg-opt-popup .fg-place-foot{margin:2px 0 -3px;padding:2px 0 0}'
      // A plain control carried into a popup: its button with a few words beside it.
      +'.fg-place-line{display:flex;align-items:center;gap:8px;min-height:30px;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.fg-place-line .bb-icon-btn{flex:0 0 auto;min-width:30px;height:28px}'
      +'.fg-place-line>:not(span){flex:0 0 auto;width:auto!important;margin:0!important}'
      +'.fg-opt-popup .fg-lib-body{margin:0;padding:0;border:0}'
      +'.fg-opt-popup .fg-az-field>label{display:none}'   // the popup's title already says A-Z
      +'.fg-ut-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:5px}'
      +'.fg-ut-list .fg-gh-hubbtn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:7px;padding-right:5px;letter-spacing:.5px;font-size:calc(10px * var(--fg-text-scale,1))}';
    document.head.appendChild(st);
  }
  // opts: level = which popup layer this foot sits on (so it can be redrawn in place); noPlace = this popup has nowhere else to move to.
  function footer(popId, opts){
    opts=opts||{};
    var back=currentBack(), id=cardIdOf(back), keys=keysOf(popId), c=CO();
    keys=keys.filter(function(k){ var o=optionOf(k); return o && !o.idea; });
    if(!id || !c || !keys.length) return null;
    injectStyle();
    var foot=document.createElement('div'); foot.className='fg-place-foot';
    var busy=false, buttons=[];
    function onNow(){ return keys.map(function(k){ return c.isOn(id,k) ? '1' : '0'; }).join(''); }
    var drawn=onNow();   // what the popup above was drawn for
    function stateOf(k){ return !c.isOn(id,k) ? 'off' : (opts.noPlace ? 'on' : c.placeOf(id,k)); }
    // One click, one step: Off -> Option -> Utility -> Off (Off <-> On where there is nowhere to move).
    var NEXT={ off:opts.noPlace ? 'on' : 'option', option:'utility', utility:'off', on:'off' };
    var WORD={ off:'Off', on:'On', option:'Option', utility:'Utility' };
    var SAYS={ off:'is off.', on:'is on.', option:'is on and shown on the card.', utility:'is on and kept in Gear > Utilities.' };
    var THEN={ off:'switch it off', on:'switch it on', option:'switch it on, shown on the card', utility:'move it to Gear > Utilities' };
    // A popup holding two features (Dates) has a button for each.
    keys.forEach(function(k){
      var b=document.createElement('button'); b.type='button'; b.className='fg-place-btn'; foot.appendChild(b);
      buttons.push({ k:k, b:b, name:keys.length>1 ? (k==='start' ? 'Start: ' : 'Due: ') : '' });
      b.addEventListener('click', async function(e){
        e.stopPropagation();
        if(busy) return;
        busy=true; b.disabled=true;
        try{ await c.setState(id, k, NEXT[stateOf(k)]); }
        catch(err){ alert('Could not save it: '+err.message); }
        busy=false; b.disabled=false; paint(); redraw();
      });
    });
    function paint(){
      buttons.forEach(function(x){
        var s=stateOf(x.k);
        x.b.textContent=x.name+WORD[s];
        x.b.classList.toggle('is-off', s==='off'); x.b.classList.toggle('is-on', s==='on' || s==='option'); x.b.classList.toggle('is-utility', s==='utility');
        x.b.title=optionOf(x.k).label+' '+SAYS[s]+' Click to '+THEN[NEXT[s]]+'.';
      });
    }
    // Switched on or off (here or on the list): the popup is drawn again, live or faded to match.
    function redraw(){
      if(busy || !foot.isConnected || onNow()===drawn) return;
      drawn=onNow();
      setTimeout(function(){
        if(!foot.isConnected || !FR()) return;
        if(gearOpen && gearOpen.el.contains(foot)){ gearOpen=null; FGGearHub.closeLevel(opts.level||1); } else FR().closePopup();
        open(popId, opts.level);
      }, 0);
    }
    document.addEventListener('fg-features-changed', function onChange(){
      if(!foot.isConnected){ document.removeEventListener('fg-features-changed', onChange); return; }
      paint(); redraw();
    });
    paint();
    return foot;
  }

  // ---- opening a feature's popup -------------------------------------------------------------------------------------------
  function line(node, words){
    var d=document.createElement('div'); d.className='fg-place-line';
    var s=document.createElement('span'); s.textContent=words;
    d.appendChild(s); return { box:d, node:node };
  }
  var gearOpen=null;   // {popId, el}: a Color or Text popup this file opened (the same button again closes it)
  async function openGearBody(popId, level, m, preview){
    var f=window.FGGearHub && FGGearHub.FEATURES.filter(function(x){ return x.key===GEAR_BODY[popId]; })[0];
    if(!f || !m.inst.cfg.getItem) return;
    var item=await m.inst.cfg.getItem(); if(!item) return;
    var card=FGGearHub.showPopup(level, level>1 ? 'Gear' : 'Card', labelOf(popId), function(body){ f.body(item, body); }, null);
    if(preview){ var inner=card.querySelector('.fg-gh-pb'); inner.inert=true; inner.classList.add('fg-opt-preview'); }
    var foot=footer(popId, { level:level }); if(foot) card.appendChild(foot);
    gearOpen={ popId:popId, el:card };
  }
  // level: 1 = from the card; higher = on top of that many Gear popups.
  function open(key, level){
    var popId=popIdOf(key), back=currentBack(), m=mainOf(back); if(!m || !FR()) return;
    level=level||1;
    var again=!!(gearOpen && gearOpen.popId===popId && gearOpen.el.isConnected);
    var openId=FR().openId ? FR().openId() : null;
    if(window.FGGearHub) FGGearHub.closeLevel(level);
    gearOpen=null;
    if(again) return;
    if(openId===popId){ FR().closePopup(); return; }
    FR().closePopup();
    var id=cardIdOf(back);
    var on=keysOf(popId).some(function(k){ return isOn(id,k,back); });
    injectStyle();
    var has=available(popId,back);
    // A feature that is off still opens: its contents are shown to look at, with the switch under them.
    if(has && GEAR_BODY[popId]){ openGearBody(popId, level, m, !on); return; }
    var label=labelOf(popId);
    var spec=has ? specFor(popId, back, m) : null;
    if(!spec){   // nothing for it on this kind of card: one line saying so, over the switches
      var why=document.createElement('div'); why.className='fg-opt-none';
      why.textContent=NOT_HERE[popId] || 'Not used on this kind of card.';
      spec={ key:m.key, row:{ id:popId, label:label, noBar:true, nodes:[why], boxes:[], eyeKeys:[], bodies:[] } };
    } else if(!on) spec={ key:spec.key, row:Object.assign({}, spec.row, { preview:true }) };
    // A task card's Priority never moves, so there its button is just ON / OFF.
    if(popId==='priority' && !m.inst.pri) spec.row.noPlace=true;
    FR().openSpec(spec.key, spec.row, level);
  }
  // True only when the board's rows are in hand and none sits under this card (the A-Z tooltip then says why nothing moves yet).
  function nothingUnder(id){
    var all=null; try{ all=window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){}
    if(!all || !all[id]) return false;
    return !Object.keys(all).some(function(k){ var r=all[k]; return r && String(r.cluster_id)===String(id); });
  }
  function specFor(popId, back, m){
    var label=labelOf(popId), base={ id:popId, label:label, noBar:true, nodes:[], boxes:[], eyeKeys:[], bodies:[] };
    // A-Z: the CUSTOM | A-Z control (controls/card-order.js), the same one on every card; it orders the cards directly under it.
    if(popId==='az'){
      var cid=cardIdOf(back); if(!cid || !window.T2TCardOrder) return null;
      base.nodes=[T2TCardOrder.makeToggle(cid, { empty:nothingUnder(cid), onChange:function(){
        if(typeof renderSeaBoard==='function') renderSeaBoard(true);
        if(FR()) FR().sync();
      } })];
      return { key:m.key, row:base };
    }
    if(popId==='priority') return { key:m.key, row:{ id:'priority', label:label, pri:m.inst.pri, boxes:[], eyeKeys:[], bodies:[] } };
    if(ROW_POPS.indexOf(popId)>=0){ var r=rowOn(back,popId); return r ? { key:r.key, row:r.row } : null; }
    if(popId==='links'){
      var video=rowOn(back,'links'), link=m.inst.link, api=link && link.__api;
      if(!api) return video ? { key:video.key, row:video.row } : null;
      var vb=video ? video.row.bodies.map(function(b){ return findOn(back,'#'+b); }).filter(Boolean) : [];
      // The older video / PDF line shows only on a card that already has one saved; its attach button sits beside the paste box.
      var saved=!!video && (video.row.boxes.some(function(b){ var cb=document.getElementById(b); return !!(cb && cb.checked); })
        || vb.some(function(b){ return Array.prototype.some.call(b.querySelectorAll('input[type=text]'), function(i){ return !!i.value.trim(); }); }));
      var showOld=function(){ vb.forEach(function(b){ b.style.display=(saved && api.isOpen())?'':'none'; }); };
      var file=vb.length ? vb[0].querySelector('input[type=file]') : null;
      link.__body.__attach=file ? function(){ saved=true; showOld(); file.click(); } : null;
      base.noBar=false; base.nodes=[link.__body].concat(vb);
      base.hasFront=true;
      base.state={
        on:function(){ return api.isOpen(); },
        setOn:function(v){ Promise.resolve(api.setOn(v)); showOld(); },
        front:function(){ return !api.backOnly(); },
        setFront:function(v){ api.setFront(v); }
      };
      base.onOpen=function(){ api.draw(); showOld(); };
      base.onPreview=function(){ api.preview(); showOld(); };
      // A web address typed into the video / PDF box counts as using that row.
      base.onInput=function(e){ if(video && vb.some(function(b){ return b.contains(e.target); })) video.row.boxes.forEach(function(bid){ var cb=document.getElementById(bid); if(cb && !cb.checked){ cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true})); } }); };
      return { key:m.key, row:base };
    }
    if(popId==='notes'){
      var act=notesAct(back); if(!act) return null;
      var btn=document.createElement('button'); btn.type='button'; btn.className='fg-gh-btn'; btn.textContent='Write a note on this card';
      btn.addEventListener('click', function(e){ e.stopPropagation(); FR().closePopup(); if(window.FGGearHub) FGGearHub.close(); act.a.run(); });
      base.nodes=[btn]; return { key:m.key, row:base };
    }
    if(popId==='review'){
      var pg=rowOn(back,'pg'); if(!pg) return null;
      var who=findOn(back,'#bb-d-reviewer, #idc-reviewer'), whoField=who && who.closest('.bb-field');
      base.nodes=[pg.row.d].concat(pg.row.bodies.map(function(b){ return findOn(back,'#'+b); }), [whoField]).filter(Boolean);
      return { key:m.key, row:base };
    }
    if(NODE[popId]){
      var el=findOn(back, NODE[popId]); if(!el) return null;
      if(CAPTION[popId]){ var l=line(el, CAPTION[popId]); base.nodes=[l.box]; base.inside=[{ node:el, into:l.box }]; }
      else base.nodes=[el];
      return { key:m.key, row:base };
    }
    return null;
  }

  // ---- Gear > UTILITIES ----------------------------------------------------------------------------------------------------
  function utilities(item, box){
    injectStyle();
    var wrap=document.createElement('div'); box.appendChild(wrap);
    function paint(){
      wrap.innerHTML='';
      var c=CO(), back=currentBack(), id=item && item.id, seen={}, list=[];
      if(c && back && id) c.OPTIONS.forEach(function(o){
        var p=popIdOf(o.key);
        if(o.idea || seen[p] || !available(o.key,back) || !isOn(id,o.key,back) || c.placeOf(id,o.key)!=='utility') return;
        seen[p]=1; list.push({ id:p, label:labelOf(p) });
      });
      // Card display (controls/card-display-options.js) is not a per-card feature, so it is always listed here (Nov 27 2026, Larry).
      if(window.T2TCardDisplay) list.push({ label:'Card display', run:function(){ if(FR()) FR().closePopup(); T2TCardDisplay.openPopup(); } });
      if(!list.length){ var e=document.createElement('div'); e.className='fg-gh-empty'; e.textContent='Nothing here yet.'; wrap.appendChild(e); return; }
      var grid=document.createElement('div'); grid.className='fg-ut-list'; wrap.appendChild(grid);
      list.sort(function(a,b){ return a.label.localeCompare(b.label); }).forEach(function(x){
        var b=document.createElement('button'); b.type='button'; b.className='fg-gh-hubbtn'; b.textContent=x.label; b.title=x.label;
        b.onclick=function(e){ e.stopPropagation(); if(x.run) x.run(); else open(x.id, 4); };
        grid.appendChild(b);
      });
    }
    document.addEventListener('fg-features-changed', function onChange(){
      if(!wrap.isConnected){ document.removeEventListener('fg-features-changed', onChange); return; }
      paint();
    });
    paint();
    // Look the card up fresh, in case it was changed from above.
    if(window.FGLibraryRibbons && item) FGLibraryRibbons.fetchOne(item.id).then(function(){ if(wrap.isConnected) paint(); });
  }

  if(window.FGGearHub && FGGearHub.addFeature) FGGearHub.addFeature({ key:'utilities', label:'Utilities', cluster:'utilities', body:utilities });
  window.FGFeaturePlace={ open:open, footer:footer, popIdOf:popIdOf, available:available, isOn:isOn, used:used, utilities:utilities };
})();
