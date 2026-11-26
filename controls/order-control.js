/* ORDER CONTROL -- the one ORDER option every card back uses (Nov 26 2026, Larry: "yes. one code for all cards."): up arrow, the card's number, down arrow,
   and the eye that shows the number in the upper right of the card front.

   WHAT YOU SEE
   - "Order" with ▲  [3] of 7  ▼. The arrows move the card one place; typing a number moves it straight there (Oct 22 2026, Larry: "Make changing the
     order number also change the order").
   - A card with no place in an order shows a dash. A locked card shows its number but does not move.

   THE CHECK MARK (Nov 26 2026, Larry: "keep the Order check mark green when a card is reopened"): turning Order on is saved on that one card
   (the word use-order in ideas.features), so its check on the OPTIONS list is still green next time. A card whose number shows on its front counts as on.
   Turning Order off takes the number off the front too (unchecked = nothing showing).

   THE CALLER says where the card stands and does the moving; this file only draws and listens.
     host = { place: fn() -> {idx, count, min, max, editable} or null      idx counts from 0; min / max = how far this card may move
              move:  fn(newIdx) -> promise
              front: { get: fn() -> bool, set: fn(bool) -> promise (rejects when not saved) },
              card:  fn() -> {id, features, saved: fn(features)} or null     the open card, its saved option words, and where the caller keeps the new ones }
   Idea cards: the card's place among its siblings (storyboard/idea-storyboard-card-detail.js).  Task cards: its place in its column (briefing-board/operations.js).
   Public surface: window.FGOrderControl  .html(prefix)  .wire(prefix, host) -> {paint, reset}   reset() = show the open card's own check and number */
(function(){
  var USED='use-order';
  function el(p,name){ return document.getElementById(p+'-order-'+name); }
  function html(p){
    var btn=function(name,label,mark){ return '<button id="'+p+'-order-'+name+'" class="bb-pri-btn" type="button" aria-label="'+label+'">'+mark+'</button>'; };
    return '<div class="bb-field sb-order-top"><label>Order</label><div class="bb-priorities">'
      +btn('up','Move earlier','▲')
      +'<div class="bb-pri-btn sb-order-num" title="Order #"><span id="'+p+'-order-value">—</span></div>'
      +btn('down','Move later','▼')
      +'</div><label class="bb-front-check" id="'+p+'-order-front-row"><input type="checkbox" id="'+p+'-order-front"><span></span></label></div>';
  }
  function setArrow(b, can){
    if(!b) return;
    b.disabled=!can; b.style.opacity=can?'1':'0.3'; b.style.cursor=can?'pointer':'default';
  }
  function wire(p, host){
    var busy=false;
    var value=el(p,'value'), up=el(p,'up'), down=el(p,'down'), eye=el(p,'front'), eyeRow=el(p,'front-row');
    if(!value) return { paint:function(){}, reset:function(){} };
    var box=document.getElementById(p+'-add-order'), body=el(p,'body'), saving=Promise.resolve();
    function wasUsed(){
      var c=host.card && host.card();
      return !!host.front.get() || (!!c && (','+String(c.features||'')+',').indexOf(','+USED+',')>=0);
    }
    function showBody(){ if(body && box) body.style.display=box.checked?'':'none'; }
    // The check follows what is saved on the card that is open now.
    function reset(){
      if(box){ box.checked=wasUsed(); showBody(); }
      paint();
      if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync();
    }
    // Saves run one after another, each for the card that was open at the click.
    function keep(){
      var want=box.checked, c=host.card && host.card(), hideFront=!want && !!host.front.get();
      showBody(); paint();
      if(!c) return;
      var off=hideFront ? host.front.set(false) : Promise.resolve();
      off.catch(function(){});   // reported below
      saving=saving.then(function(){ return off; })
        .then(function(){ return FGFeatureBreakers.writeOne(c.id, [{key:USED, on:want}]); })
        .then(function(words){ c.saved(words); paint(); })
        .catch(function(err){ console.error('Order check mark not saved', err); alert('The Order setting was not saved: '+((err&&err.message)||err)); reset(); });
    }
    function tip(live){
      if(!eyeRow) return;
      eyeRow.title = !live ? 'This card has no place in an order yet'
        : (eye.checked ? 'Card number shows in the upper right of the card — click to hide it' : 'Card number is back only — click to show it in the upper right of the card');
    }
    function paint(){
      var at=host.place(), live=!!at;
      if(!live) value.textContent='—';
      else {
        var inp=value.querySelector('input');
        if(!inp){
          value.innerHTML='<input id="'+p+'-order-input" type="number" min="1" aria-label="Order number"> of <span></span>';
          inp=value.querySelector('input');
        }
        inp.max=at.count; inp.value=at.idx+1; inp.disabled=!at.editable;
        value.querySelector('span').textContent=at.count;
      }
      setArrow(up, live && at.editable && at.idx>at.min);
      setArrow(down, live && at.editable && at.idx<at.max);
      if(eye){ eye.checked=!!host.front.get(); eye.disabled=!live; eyeRow.classList.toggle('bb-disabled', !live); tip(live); }
    }
    // One move for everything: the arrows and the typed number both land here.
    async function go(to){
      var at=host.place();
      if(busy || !at || !at.editable || isNaN(to)){ paint(); return; }
      to=Math.max(at.min, Math.min(at.max, to));
      if(to===at.idx){ paint(); return; }
      busy=true;
      try{ await host.move(to); }
      catch(err){ console.error('Card order not saved', err); alert('The new order was not saved: '+((err&&err.message)||err)); }
      busy=false; paint();
    }
    if(up) up.addEventListener('click', function(e){ e.stopPropagation(); var at=host.place(); if(at) go(at.idx-1); });
    if(down) down.addEventListener('click', function(e){ e.stopPropagation(); var at=host.place(); if(at) go(at.idx+1); });
    value.addEventListener('click', function(e){ e.stopPropagation(); });
    value.addEventListener('keydown', function(e){
      var inp=e.target; if(inp.tagName!=='INPUT') return;
      e.stopPropagation();
      if(e.key==='Enter'){ e.preventDefault(); inp.blur(); }
      else if(e.key==='Escape'){ paint(); inp.blur(); }
    });
    value.addEventListener('change', function(e){ if(e.target.tagName==='INPUT') go(parseInt(e.target.value,10)-1); });
    if(eye) eye.addEventListener('change', async function(){
      var want=eye.checked; tip(true);
      try{ await host.front.set(want); }
      catch(err){ eye.checked=!want; tip(true); alert('The card number setting was not saved: '+((err&&err.message)||err)); }
    });
    if(box) box.addEventListener('change', keep);
    reset();
    return { paint:paint, reset:reset };
  }
  (function(){
    if(document.getElementById('fg-order-control-style')) return;
    var st=document.createElement('style'); st.id='fg-order-control-style';
    st.textContent='.sb-order-num{cursor:default}'
      +'.sb-order-num input{width:2.4em;border:0;background:transparent;text-align:center;font:inherit;color:inherit;padding:0;margin:0;-moz-appearance:textfield}'
      +'.sb-order-num input::-webkit-outer-spin-button,.sb-order-num input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}'
      +'.sb-order-num input:disabled{opacity:.5}'
      // In its popup (which sits outside the card, so the card's button styles do not reach it): one line, ▲  3 of 7  ▼.
      +'.fg-opt-popup .sb-order-top .bb-priorities{display:flex;align-items:center;justify-content:center;gap:8px}'
      +'.fg-opt-popup .sb-order-top .bb-pri-btn{flex:0 0 auto!important;width:auto!important;display:flex;align-items:center;justify-content:center;gap:2px;box-sizing:border-box;min-width:30px;height:28px;padding:0 10px;border:1.5px solid var(--bb-ink,#555);border-radius:4px;background:#fff;color:inherit;font:inherit;font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;white-space:nowrap}'
      +'.fg-opt-popup .sb-order-num span{display:flex;align-items:center;gap:4px;white-space:nowrap}'
      +'.fg-opt-popup .sb-order-num input{width:2.4em!important;height:20px!important;min-height:0!important;border:0!important;padding:0!important;margin:0!important;background:transparent!important}';
    document.head.appendChild(st);
  })();
  window.FGOrderControl={ html:html, wire:wire };
})();
