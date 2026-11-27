/* FEATURE PLACE -- where each checked feature shows up, and the one popup every feature opens (Nov 26 2026, Larry: "an activated (checked) FEATURE to appear by
   toggle in either OPTIONS on the page for items more frequently used or ... for less frequent use items. Both user choices." Nov 27 2026: "Keep it simple" --
   the Gear is the FEATURES list, and every feature works the same way).

   WHAT YOU SEE
   - Gear > FEATURES: the box turns a feature on or off; the title opens its popup. An OPTIONS row on the card opens the very same popup.
   - Every popup ends in a divider line with one box under it: "View as Card Option". Checked = the feature also shows on the back of the card (checking it
     switches an unchecked feature on). Unchecked = it stays on and is opened from the Gear's list. The DATES popup also has its own Start and Due boxes.
   - A feature that is off appears nowhere on the card. Its title on the FEATURES list still opens its popup, showing what is in it, faded and look-only,
     until it is switched on (Nov 27 2026, Larry: "Click the title to open the popup whether or not it has been activated!"). Account is no exception
     (Nov 27 2026, Larry: "Failure to activate account denies that feature until selected.").
   - Each feature's own popup holds its front-of-card choice (the eye); there is no board-wide Card display list.

   HOW IT IS SAVED: controls/card-options-list.js (the util-/opt- words in ideas.features; a change sets the card and every card beneath it).
   HOW IT IS BUILT (one tree, one code): the popup shell is the OPTIONS popup (briefing-board/card-back-fixed-rows.js), except Color and Text, which are the
   Gear's own popup (controls/gear-hub.js). This file only finds each feature's existing controls on the open card back and hands them over.
   Public surface: window.FGFeaturePlace  .open(key, level)  .footer(popId, {level})  .popIdOf(rowId)  .available(key, back)  .isOn(id, key, back)  .used(key, back) */
(function(){
  // One popup can hold two features (Dates = Start Date + Due Date).
  var KEYS={ dates:['start','due'] };
  var LABEL={ dates:'Dates', links:'Link' };
  var GEAR_BODY={ color:'color-selector', text:'text' };                     // popups the Gear's own code fills
  var NODE={ lock:'#bb-d-lock, #sb-lock', calendar:'#bb-d-calendar, #idc-calendar', people:'#bb-d-people, #sb-people-btn',
    image:'#bb-d-pic-row, #sb-add-image-wrap', plan:'#sb-plan-step' };
  var CAPTION={ lock:'Lock or unlock this card', calendar:'Add this card’s date to your calendar', people:'Who is on this card', image:'Add a picture to this card' };
  // What a popup says when there is nothing to show in it.
  var NOT_HERE={ plan:'Used on plan step cards.' };
  var ROW_POPS=['order','flags','org','routine','library'];

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

  function isTaskBack(back){ return !!(back && back.querySelector('#bb-d-duplicate')); }   // the task card back keeps its own Duplicate button, out of sight

  // Does this kind of card have a control for the feature?
  function available(key, back){
    back=back||currentBack(); if(!back) return false;
    var p=popIdOf(key), m=mainOf(back); if(!m) return false;
    if(p==='az') return !!(window.T2TCardOrder && cardIdOf(back));   // every card can hold cards, so every card can order them
    if(p==='account') return !!window.FGGearBoardTools;
    if(p==='trivia') return true;
    if(p==='duplicate') return !!(cardIdOf(back) && (isTaskBack(back) || window.T2TCardDuplicate));
    if(p==='dates') return !!rowOn(back,'dates');
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
    if(key==='az'){ var o=CO(); return !!(o && o.isOn(cardIdOf(back),'az')); }   // any green check in its popup, View as Card Option included, means active
    // Plan: the step has a time, or is checked done.
    if(key==='plan'){ var t=findOn(back,'#sb-steptime-input'), d=findOn(back,'#sb-stepdone-input'); return !!((t && t.value.trim()) || (d && d.checked)); }
    var r=rowOn(back, popIdOf(key));
    if(r) return r.row.boxes.some(function(id){ var b=document.getElementById(id); return !!(b && b.checked); });
    return false;
  }

  // ---- the divider and "View as Card Option" ---------------------------------------------------------------------------------
  function injectStyle(){
    if(document.getElementById('fg-feature-place-style')) return;
    var st=document.createElement('style'); st.id='fg-feature-place-style';
    st.textContent='.fg-place-foot{flex:0 0 auto;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:2px 10px;border-top:1.5px solid var(--bb-accent,#8a7a4a);margin:3px 8px 0;padding:3px 0}'
      +'.fg-place-check{display:flex!important;align-items:center;gap:4px;margin:0!important;cursor:pointer;white-space:nowrap;font-size:calc(10.5px * var(--fg-text-scale,1));font-weight:700;line-height:1.35;letter-spacing:0;text-transform:none}'
      +'.fg-place-check input{flex:0 0 auto;margin:0;width:13px;height:13px;cursor:pointer;accent-color:#1e9e4a}'
      +'.fg-place-check.is-view{margin-left:6px!important}'
      // A feature that is off: its popup can be looked at, not used, until it is switched on.
      +'.fg-opt-preview{opacity:.5;pointer-events:none}'
      +'.fg-opt-preview .fg-opt-preview{opacity:1}'
      +'.fg-opt-preview>.fg-lib-body{display:block!important}'   // the Library hides its shelves itself while off
      +'.fg-place-check input[disabled]{opacity:.55;cursor:wait}'
      +'.fg-opt-popup .fg-place-foot{margin:2px 0 -3px;padding:2px 0 0}'
      // A plain control carried into a popup: its button with a few words beside it.
      +'.fg-place-line{display:flex;align-items:center;gap:8px;min-height:30px;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.fg-place-line .bb-icon-btn{flex:0 0 auto;min-width:30px;height:28px}'
      +'.fg-place-line>:not(span){flex:0 0 auto;width:auto!important;margin:0!important}'
      +'.fg-place-stack{display:flex;flex-direction:column;align-items:flex-start;gap:5px}'
      +'.fg-place-stack>.fg-gh-hubbtn{margin:0}'
      // Plan: Time (with its front-of-card eye) on one line, Step done under it.
      +'#sb-plan-step{display:flex;flex-direction:column;align-items:flex-start;gap:6px}'
      +'#sb-plan-step .bb-field{margin:0;width:110px}'
      +'#sb-plan-step input[type=text]{width:100%;box-sizing:border-box;border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:6px;background:#fff;color:inherit;padding:2px 6px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'#sb-plan-step .fg-back-labelrow{display:flex;align-items:center;gap:6px;margin-bottom:2px}'
      +'#sb-plan-step .fg-back-labelrow>label{margin:0}'
      +'.fg-place-stack>span{font-size:calc(12px * var(--fg-text-scale,1));line-height:1.35}'
      +'.fg-opt-popup .fg-place-line{min-height:20px}'
      +'.fg-opt-popup .fg-place-line .bb-icon-btn{height:20px;padding-top:0;padding-bottom:0}'
      +'.fg-opt-popup .fg-lib-body{margin:0;padding:0;border:0}';
    document.head.appendChild(st);
  }
  // opts: level = which popup layer this foot sits on (so it can be redrawn in place).
  function footer(popId, opts){
    opts=opts||{};
    var back=currentBack(), id=cardIdOf(back), c=CO(), o=optionOf(popId);
    if(!id || !c || !o || o.idea) return null;
    injectStyle();
    var keys=o.parts || [popId];
    var foot=document.createElement('div'); foot.className='fg-place-foot';
    var busy=false, boxes=[];
    function onNow(){ return keys.map(function(k){ return c.isOn(id,k) ? '1' : '0'; }).join(''); }
    var drawn=onNow();   // what the popup above was drawn for
    function viewing(){ return c.isOn(id,popId) && c.placeOf(id,popId)==='option'; }
    function check(text, cls, title, isChecked, change){
      var lab=document.createElement('label'); lab.className='fg-place-check'+(cls ? ' '+cls : ''); lab.title=title;
      var cb=document.createElement('input'); cb.type='checkbox';
      if(window.FGPopupParts) FGPopupParts.box(cb);   // the same green check box as the popup's own checklist
      var tx=document.createElement('span'); tx.textContent=text;
      lab.appendChild(cb); lab.appendChild(tx); foot.appendChild(lab);
      boxes.push({ cb:cb, isChecked:isChecked });
      lab.addEventListener('click', function(e){ e.stopPropagation(); });
      cb.addEventListener('change', async function(){
        if(busy) return;
        var want=cb.checked; busy=true; boxes.forEach(function(x){ x.cb.disabled=true; });
        try{ await change(want); }
        catch(err){ alert('Could not save it: '+err.message); }
        busy=false; boxes.forEach(function(x){ x.cb.disabled=false; }); paint(); redraw();
      });
    }
    // Dates holds two dates, each switched on its own; a date switched on joins the other wherever that one shows.
    if(o.parts) o.parts.forEach(function(k){
      var name=k==='start' ? 'Start' : 'Due';
      check(name, '', 'Use a '+name+' Date on this card', function(){ return c.isOn(id,k); }, async function(want){
        var was=c.isOn(id,popId), shown=viewing();
        await c.set(id,k,want);
        if(want && was) await c.setView(id,popId,shown);
      });
    });
    check('View as Card Option', o.parts ? 'is-view' : '', 'Show '+labelOf(popId)+' on the back of the card', viewing, async function(want){
      await c.setView(id,popId,want);
      if(!want && popId==='az' && window.T2TCardOrder) await T2TCardOrder.settle(id);   // nothing left checked: inactive
    });
    function paint(){ boxes.forEach(function(x){ x.cb.checked=!!x.isChecked(); }); }
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
    var card=FGGearHub.showPopup(level, 'Feature', labelOf(popId), function(body){ f.body(item, body); }, null);
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
    } else if(!on && popId!=='az') spec={ key:spec.key, row:Object.assign({}, spec.row, { preview:true }) };   // A-Z stays usable: a check switches it on
    FR().openSpec(spec.key, spec.row, level);
  }
  // The front-of-card eye for a mark that has no row of its own (the Notes pencil, the video / PDF mark): the same eye, the same saved list.
  function frontEye(inst, key, words){
    var b=document.createElement('button'); b.type='button'; b.className='fg-opt-pop-eye';
    function hidden(){ return (inst.cfg.getHidden()||[]).indexOf(key)>=0; }
    function paint(){
      var off=hidden(), ic=(window.FGCardBackOptions && FGCardBackOptions.eyeIcons) || {};
      b.innerHTML=((off ? ic.slash : ic.open)||'')+'<span>'+words+': '+(off ? 'back only' : 'on the front')+'</span>';
      b.title=off ? 'Back only. Click to show '+words.toLowerCase()+' on the front of the card' : 'Shows on the front of the card. Click to keep it on the back only';
    }
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var cur=(inst.cfg.getHidden()||[]).slice(), i=cur.indexOf(key);
      if(i>=0) cur.splice(i,1); else cur.push(key);
      inst.cfg.setHidden(cur); paint(); setTimeout(paint,0);
    });
    paint(); return b;
  }
  function stack(nodes){ var d=document.createElement('div'); d.className='fg-place-stack'; nodes.forEach(function(n){ d.appendChild(n); }); return d; }
  function specFor(popId, back, m){
    var label=labelOf(popId), base={ id:popId, label:label, noBar:true, nodes:[], boxes:[], eyeKeys:[], bodies:[] };
    // A-Z: ALL headers / ALL subbers and RESET (controls/card-order.js), the same on every card; they order the board shown when this card is the TOPIC.
    if(popId==='az'){
      var cid=cardIdOf(back); if(!cid || !window.T2TCardOrder) return null;
      base.nodes=[T2TCardOrder.makeControl(cid, { onChange:function(){
        if(typeof renderSeaBoard==='function') renderSeaBoard(true);
        if(FR()) FR().sync();
      } })];
      return { key:m.key, row:base };
    }
    // PRIORITY: the card's own H M L buttons ride in the popup (and go back to their OPTIONS row on close), with the eye for the badge on the front.
    if(popId==='priority'){
      if(!m.inst.pri) return null;
      base.nodes=[m.inst.pri.cfg.node, frontEye(m.inst, 'priority', 'Priority')]; return { key:m.key, row:base };
    }
    // ACCOUNT: My Info and Sign Out (controls/gear-board-tools.js).
    if(popId==='account'){
      if(!window.FGGearBoardTools) return null;
      var acc=stack([]); FGGearBoardTools.accountButtons(acc);
      base.nodes=[acc]; return { key:m.key, row:base };
    }
    // TIPS & TRIVIA: opened by the flower on the TV frame; the popup only says so (the switch under it is the same as every feature's).
    if(popId==='trivia'){
      var tell=document.createElement('span'); tell.textContent='Tips and trivia open from the flower on the TV frame. Switch this off on the MASTER card to remove the flower.';
      base.nodes=[stack([tell])]; return { key:m.key, row:base };
    }
    // DUPLICATE: a copy of this one card. A task card presses its own hidden button; every other card uses controls/card-duplicate.js.
    if(popId==='duplicate'){
      var own=back.querySelector('#bb-d-duplicate') || findOn(back,'#bb-d-duplicate'), mine=cardIdOf(back);
      var go=document.createElement('button'); go.type='button'; go.className='fg-gh-hubbtn'; go.textContent='Duplicate this card';
      go.addEventListener('click', function(e){
        e.stopPropagation(); FR().closePopup(); if(window.FGGearHub) FGGearHub.close();
        if(own) own.click(); else if(window.T2TCardDuplicate) T2TCardDuplicate.run(mine);
      });
      var only=document.createElement('span'); only.textContent='Copies this card only, not the cards beneath it.';
      base.nodes=[stack([go,only])]; return { key:m.key, row:base };
    }
    // DATES: the Start and Due fields, with Add to Calendar under them.
    if(popId==='dates'){
      var dates=rowOn(back,'dates'); if(!dates) return null;
      var cal=findOn(back, NODE.calendar); if(!cal) return { key:dates.key, row:dates.row };
      var cl=line(cal, CAPTION.calendar);
      return { key:dates.key, row:Object.assign({}, dates.row, { after:[cl.box], inside:[{ node:cal, into:cl.box }] }) };
    }
    if(ROW_POPS.indexOf(popId)>=0){ var r=rowOn(back,popId); return r ? { key:r.key, row:r.row } : null; }
    if(popId==='links'){
      var video=rowOn(back,'links'), link=m.inst.link, api=link && link.__api;
      if(!api) return video ? { key:video.key, row:video.row } : null;
      var vb=video ? video.row.bodies.map(function(b){ return findOn(back,'#'+b); }).filter(Boolean) : [];
      // The older video / PDF line shows only on a card that already has one saved; its attach button sits beside the paste box.
      var saved=!!video && (video.row.boxes.some(function(b){ var cb=document.getElementById(b); return !!(cb && cb.checked); })
        || vb.some(function(b){ return Array.prototype.some.call(b.querySelectorAll('input[type=text]'), function(i){ return !!i.value.trim(); }); }));
      var mark=video ? frontEye(video.inst, 'links', 'Video / PDF mark') : null;
      var showOld=function(){ vb.concat(mark ? [mark] : []).forEach(function(b){ b.style.display=(saved && api.isOpen())?'':'none'; }); };
      var file=vb.length ? vb[0].querySelector('input[type=file]') : null;
      link.__body.__attach=file ? function(){ saved=true; showOld(); file.click(); } : null;
      base.noBar=false; base.nodes=[link.__body].concat(vb, mark ? [mark] : []);
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
      base.nodes=[stack([btn, frontEye(m.inst, 'notes', 'Notes pencil')])]; return { key:m.key, row:base };
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
      // The board-wide Initials on cards switch belongs to People (Nov 27 2026).
      if(popId==='people' && window.FGGearBoardTools){ var initials=FGGearBoardTools.initialsSwitch(back); if(initials) base.nodes.push(initials); }
      return { key:m.key, row:base };
    }
    return null;
  }

  window.FGFeaturePlace={ open:open, footer:footer, popIdOf:popIdOf, available:available, isOn:isOn, used:used };
})();
