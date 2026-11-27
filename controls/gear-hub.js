/* GEAR HUB -- the card Gear as a hub of hubs, shown as layered popups (Nov 16 2026, Larry: "keep and build").

   WHAT YOU SEE
   - GEAR opens a hub of three buttons: UTILITIES - FEATURES - ACCOUNT (Nov 27 2026, Larry: "Move FEATURES to GEAR. Drop PREFERENCES.").
   - Each button opens straight to its popup. UTILITIES lists Card display, Text size, Duplicate (task cards) and the checked features placed there; the rest
     sit on the card as OPTIONS (controls/feature-place.js). FEATURES is the checklist (controls/card-options-list.js). ACCOUNT: My Info, Sign Out.
   - A feature's title on the checklist opens that feature's own popup, one layer up.

   LAYERS (Larry: "popup on popup, maybe with color layers ... closing one popup brings us up a level without closing everything")
   - Each level is a popup stacked a little down and to the right of the one beneath, so the edge of the one below stays visible.
   - Each level has its own tint (gold, blue, green) so you can tell where you are.
   - The X closes that level and any level above it. Escape closes the top level only. Every popup drags by its top bar (controls/window-drag.js).
   - The top bar reads: the level it came from (left), its own topic (center), the X (right).

   ONE DETAILS POPUP PER FEATURE
   - Each feature is built once and reused by every card.
   - Only the setting is stored per card (controls/card-options-list.js), so a change sets the card and every card beneath it.

   ONE CARD CODE (Nov 26 2026, Larry: "One card code. Features all selectable as OPTIONS ... visible when selected on the same size popups in the feature
   workspace on a card"): every kind of card back (idea, task) opens this same Gear. A card that keeps its own copy of what the popups change listens for
   'fg-card-saved'. Every popup is the same size.

   ADDING A CARD FEATURE LATER: one line in FGCardOptions.OPTIONS and its control in controls/feature-place.js. A new Gear button: one line in CLUSTERS and
   FGGearHub.addFeature with a body(item, box).
   ONE STANDARD SIZE (Nov 26 2026, Larry: every feature popup "fills the open space under the CONTENTS and to the right of the OPTIONS"): standardBox() is
   the one place that measures it. Gear popups, the OPTIONS popups (briefing-board/card-back-fixed-rows.js) and Card display all use it, so every popup is
   the same size and stays inside the card; longer content scrolls inside it. A card back too narrow for two columns, or no card at all, keeps the free size.
   NOV 21 2026 (Larry: "GEAR should remain closed by default... What if all the options appeared on popups in the display area?")
   - The Gear button opens ONLY this hub. Nothing opens on the card itself.
   - Every popup sits inside the card's display area (over the Contents field), never beside the card, and is moved back inside the screen if it would hang off.
   Public surface: window.FGGearHub  .open(item)  .close()  .addFeature(f)  .showPopup(...)  .closeLevel(n)  .standardBox(level)  .CLUSTERS  .FEATURES */
(function(){
  var CLUSTERS=[
    // Each Gear button opens straight to its feature's popup (no middle popup). Nov 27 2026: FEATURES took the place of PREFERENCES.
    { key:'utilities', label:'Utilities', feature:'utilities' },
    { key:'features',  label:'Features',  feature:'card-options' },
    { key:'account',   label:'Account',   feature:'account' }
  ];
  // The features the Gear knows. Others add theirs with addFeature (utilities, account, color, text).
  var FEATURES=[
    // Nov 24 2026 (Larry): the checklist of everything a card back can offer (controls/card-options-list.js).
    // Nov 26 2026 (Larry): the list is called FEATURES here; a checked feature shows up on the card (OPTION) or in Utilities.
    { key:'card-options', label:'Features', body:function(item, box){ if(window.FGCardOptions) FGCardOptions.panel(item, box); } }
  ];

  function button(text){ var b=document.createElement('button'); b.type='button'; b.className='fg-gh-btn'; b.textContent=text; return b; }
  function featureOf(key){ for(var i=0;i<FEATURES.length;i++){ if(FEATURES[i].key===key) return FEATURES[i]; } return null; }

  var stack=[];           // open popups, bottom to top: {el, level}
  var current=null;       // the card (item) the Gear was opened for

  function injectStyle(){
    if(document.getElementById('fg-gear-hub-style')) return;
    var st=document.createElement('style'); st.id='fg-gear-hub-style';
    st.textContent=''
      +'.fg-gh-pw{position:fixed;z-index:99990}'
      +'.fg-gh-pc{--gh-tint:#f3ecd9;width:272px;max-width:calc(100vw - 16px);background:var(--bb-bg,#fffdf6);color:var(--bb-ink,#2b2b2b);border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:10px;box-shadow:0 8px 26px rgba(0,0,0,.3);font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.fg-gh-pc[data-level="1"]{--gh-tint:#f3ecd9}'
      +'.fg-gh-pc[data-level="2"]{--gh-tint:#dce8f5}'
      +'.fg-gh-pc[data-level="3"],.fg-gh-pc[data-level="4"]{--gh-tint:#dcefdf}'
      // The standard size: a fixed box, its content scrolling inside.
      +'.fg-gh-pc.fg-gh-std{display:flex;flex-direction:column;box-sizing:border-box;max-width:none}'
      +'.fg-gh-std>.fg-gh-ph{flex:0 0 auto;padding-top:2px;padding-bottom:1px}'
      +'.fg-gh-std>.fg-gh-pb{flex:1 1 auto;min-height:0;max-height:none;overflow:auto;padding:4px 8px}'
      +'.fg-gh-std .fg-gh-hubbtn{margin-bottom:2px;padding-top:0;padding-bottom:0}'   // the buttons and the icon row fit without scrolling
      +'.fg-gh-std>.fg-gh-pb{padding-top:2px;padding-bottom:2px}'
      +'.fg-gh-std .fg-gh-pb>.fg-gear-set:has(.fg-lib-body){gap:0}'                  // the Library shelf fits under its rows
      +'.fg-gh-ph{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 3px 10px;border-bottom:1px solid var(--bb-accent,#8a7a4a);border-radius:9px 9px 0 0;background:var(--gh-tint);font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;user-select:none}'
      +'.fg-gh-ph .l{flex:0 0 62px;text-align:left;opacity:.75}'
      +'.fg-gh-ph .t{flex:1;text-align:center}'
      +'.fg-gh-ph .x{flex:0 0 62px;text-align:right}'
      +'.fg-gh-x{background:none;border:0;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;color:inherit}'
      +'.fg-gh-pb{max-height:calc(100vh - 90px);overflow:auto;padding:6px 8px 7px;background:var(--bb-bg,#fffdf6);border-radius:0 0 9px 9px}'
      +'.fg-gh-pb p{margin:0 0 8px;line-height:1.35}'
      +'.fg-gh-hubbtn{display:block;width:100%;margin:0 0 5px;padding:5px 10px;text-align:left;background:#fff;border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:8px;font:700 calc(11px * var(--fg-text-scale,1)) Georgia,serif;letter-spacing:1px;text-transform:uppercase;color:inherit;cursor:pointer}'
      +'.fg-gh-hubbtn:last-child{margin-bottom:0}'
      +'.fg-gh-hubbtn:hover{background:var(--gh-tint)}'
      +'.fg-gh-btn{background:#fff;border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:6px;padding:4px 10px;font:700 calc(11px * var(--fg-text-scale,1)) Georgia,serif;color:inherit;cursor:pointer}'
      +'.fg-gh-pb{min-height:calc(118px * var(--fg-text-scale,1));box-sizing:border-box}'
      +'.fg-gh-pb>.fg-gear-set{display:flex;flex-direction:column;gap:6px;width:100%}'
      +'.fg-gear-set>.bb-addition>.bb-addition-label{display:none}'
      +'.fg-gear-set>.bb-addition,.fg-gear-set .bb-field{margin:0;width:100%}'
      +'.fg-gh-empty{opacity:.6;font-style:italic;padding:2px 0}'
      +'.fg-gh-status{min-height:16px;margin-top:6px;opacity:.8;line-height:1.3}'
      +'.fg-gh-std .fg-gh-status:empty{min-height:0;margin:0}'
      +'.fg-gh-row{display:flex;align-items:center;gap:8px;min-height:26px}'
      +'.fg-gh-sw{flex:0 0 auto;position:relative;width:34px;height:18px;padding:0;border:1.5px solid var(--bb-ink,#2b2b2b);border-radius:9px;background:#d8d8d8;cursor:pointer;transition:background .12s}'
      +'.fg-gh-sw::after{content:"";position:absolute;top:1px;left:1px;width:13px;height:13px;border-radius:50%;background:#fff;border:1.5px solid var(--bb-ink,#2b2b2b);box-sizing:border-box;transition:left .12s}'
      +'.fg-gh-sw[aria-checked="true"]{background:#5fb36b}'
      +'.fg-gh-sw[aria-checked="true"]::after{left:17px}'
      +'.fg-gh-sw[disabled]{opacity:.5;cursor:wait}';
    document.head.appendChild(st);
  }

  // ---- stacking ---------------------------------------------------------------------------------------------------------------
  function closeFrom(level){      // closes this level and everything above it
    if(level<=3) openFeatureKey=null;
    while(stack.length && stack[stack.length-1].level>=level){
      var top=stack.pop(); if(top.el.parentNode) top.el.parentNode.removeChild(top.el);
    }
    if(!stack.length){ document.removeEventListener('keydown', onKey, true); document.removeEventListener('mousedown', onOutside, true); }
  }
  function featurePopup(){ return document.querySelector('.fg-opt-popup'); }   // a feature popup sits above the Gear's and closes first
  function onKey(e){ if(e.key==='Escape' && stack.length && !featurePopup()){ e.stopPropagation(); closeFrom(stack[stack.length-1].level); } }
  // SOP (Larry, Nov 24 2026: "Click to outside a popup to close is a SOP rule!"): a click anywhere outside the popups closes the LATEST (top) popup only
  // (Larry, Nov 24: "just close the latest popup, not all popups"). The Gear button that opened them is left out, so pressing it still toggles the stack.
  var openAnchor=null;
  function onOutside(e){
    if(!stack.length || featurePopup()) return;
    var t=e.target;
    if(t && t.closest && (t.closest('.fg-gh-pw, .fg-opt-popup, .bb-datepicker-pop, #sz-text-overlay') || (openAnchor && openAnchor.isConnected && openAnchor.contains(t)))) return;
    closeFrom(stack[stack.length-1].level);
    // The card's own backdrop also closes the whole card on click (idea-storyboard-screen-markup.js), which sends every Gear popup home with it.
    // This click only dismissed a popup, so it is swallowed there.
    if(t && (t.id==='sb-detail-overlay' || t.id==='bb-detail-overlay')){
      var swallow=function(ev){ ev.stopPropagation(); document.removeEventListener('click', swallow, true); };
      document.addEventListener('click', swallow, true);
      setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 1500);
    }
  }

  // The open card back's OPTION SPACE: the OPTIONS list and the room beside it. Hidden boards keep their markup, so only one that is on screen counts.
  function optionSpace(){
    var all=document.querySelectorAll('.fg-back-3x5 .fg-back-split');
    for(var i=0;i<all.length;i++){ if(all[i].getClientRects().length) return all[i]; }
    return null;
  }

  // THE STANDARD POPUP BOX: the space under CONTENTS and to the right of OPTIONS, down to the bottom band. Each layer sits a few pixels down and to the
  // right of the one beneath, and room for those steps is held back, so all layers are the same size and none leaves the card.
  var STEP_X=8, STEP_Y=3, STEPS=3;
  function standardBox(level){
    var ws=optionSpace(); if(!ws) return null;
    var right=ws.querySelector('.fg-back-right'); if(!right) return null;
    var wr=ws.getBoundingClientRect(), rr=right.getBoundingClientRect();
    if(rr.width<250 || rr.left<wr.left+40) return null;   // the two columns are stacked (narrow screen)
    var card=ws.closest('.fg-back-3x5'), band=card ? card.querySelector('.bb-action-row') : null;
    var br=band ? band.getBoundingClientRect() : null;
    var scale=card ? (parseFloat(getComputedStyle(card).getPropertyValue('--fg-text-scale'))||1) : 1;
    var top=wr.top-2, room=(br && br.height ? br.top-2 : wr.bottom)-top;
    var area=Math.max(142*scale, Math.min(room, 156*scale));   // the same height on every card, however long its OPTIONS list is
    var width=rr.width-STEP_X*STEPS, height=area-STEP_Y*STEPS, n=Math.max(0, Math.min(level-1, STEPS));
    var left=rr.left+n*STEP_X, y=top+n*STEP_Y;
    return {left:Math.max(8, Math.min(left, window.innerWidth-width-8)), top:Math.max(8, Math.min(y, window.innerHeight-height-8)), width:width, height:height};
  }

  // A popup at a level. A new popup at a level replaces whatever was open at that level or above, then sits offset from the level below.
  function show(level, fromLabel, title, fill, anchor, where){
    injectStyle();
    closeFrom(level);
    var below=stack.length ? stack[stack.length-1].el.getBoundingClientRect() : null;
    // Inside the display area: the first popup opens over the card's Contents field; each one after sits a little down and to the right of the one beneath.
    // Nov 21 2026 (Larry): the DISPLAY AREA is the blank space below the Contents and to the right of the OPTIONS.
    // Nov 26 2026 (Larry): that display area is now the card's OPTION SPACE (briefing-board/card-back-fixed-rows.js), on every kind of card back.
    var ws=optionSpace(), wr=ws ? ws.getBoundingClientRect() : null;
    var ob=ws ? ws.querySelector('.fg-back-fixed') : null, orc=ob ? ob.getBoundingClientRect() : null;
    var cf=document.querySelector('.sb-contents-field'), cr=(cf && cf.getClientRects().length) ? cf.getBoundingClientRect() : null;
    var a=anchor ? anchor.getBoundingClientRect() : {right:40, top:40};
    // Nov 24 2026 (BOARD COLOR SELECTOR opened by double-clicking the board background): with no card open and no anchor there is nothing to sit beside, so the popup is centered.
    var centered=!below && !wr && !cr && !anchor;
    var wsLeft=wr ? ((orc && orc.width<wr.width*0.7) ? orc.right+12 : wr.left) : 0;
    var left= below ? below.left+26 : (wr ? wsLeft : (cr ? cr.left : a.right+14));
    var top = below ? below.top+(wr?4:30) : (wr ? wr.top : (cr ? cr.bottom+8 : a.top-8));   // in the OPTION SPACE a layer steps down only a little, so it stays inside
    left=Math.max(8, Math.min(left, window.innerWidth-280)); top=Math.max(8, Math.min(top, window.innerHeight-120));
    var std=standardBox(level);
    if(std){ left=std.left; top=std.top; centered=false; }
    var w=document.createElement('div'); w.className='fg-gh-pw'; w.style.left=left+'px'; w.style.top=top+'px'; w.style.zIndex=99990+level; w.style.visibility='hidden';
    var card=document.createElement('div'); card.className='fg-gh-pc'; card.setAttribute('data-level', String(level));
    if(std){ card.classList.add('fg-gh-std'); card.style.width=std.width+'px'; card.style.height=std.height+'px'; }
    var head=document.createElement('div'); head.className='fg-gh-ph';
    head.innerHTML='<span class="l"></span><span class="t"></span><span class="x"></span>';
    head.querySelector('.l').textContent=fromLabel; head.querySelector('.t').textContent=title;
    var x=document.createElement('button'); x.type='button'; x.className='fg-gh-x'; x.textContent='✕'; x.setAttribute('aria-label','Close');
    x.onclick=function(e){ e.stopPropagation(); closeFrom(level); };
    head.querySelector('.x').appendChild(x);
    var body=document.createElement('div'); body.className='fg-gh-pb';
    card.appendChild(head); card.appendChild(body); w.appendChild(card); document.body.appendChild(w);
    var entry={el:w, level:level}; stack.push(entry);
    fill(body, entry);
    // Measure the filled popup and pull it back inside the screen if any edge hangs off.
    var r=w.getBoundingClientRect();
    if(centered){ left=(window.innerWidth-r.width)/2; top=(window.innerHeight-r.height)/3; }
    var nl=Math.max(8, Math.min(left, window.innerWidth-r.width-8)), nt=Math.max(8, Math.min(top, window.innerHeight-r.height-8));
    w.style.left=nl+'px'; w.style.top=nt+'px'; w.style.visibility='';
    if(window.FGWindowDrag) FGWindowDrag.attach(card, head, 'gear-hub-'+level);
    document.removeEventListener('keydown', onKey, true); document.addEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onOutside, true); document.addEventListener('mousedown', onOutside, true);
    return card;
  }

  // ---- level 1: the GEAR hub (three buttons) ------------------------------------------------------------------------------------
  function openHub(anchor){
    show(1, 'Card', 'Gear', function(body){
      CLUSTERS.forEach(function(c){
        var b=document.createElement('button'); b.type='button'; b.className='fg-gh-hubbtn'; b.textContent=c.label;
        b.onclick=function(){ openDirect(c, b); };
        body.appendChild(b);
      });
    }, anchor);
  }

  // ---- level 3: a button's popup (the same for every card) --------------------------------------------------------------------
  var openFeatureKey=null;   // the popup that is open (a second click on its button hides it again)
  function openDirect(c, anchor){
    var f=featureOf(c.feature); if(!f) return;
    if(openFeatureKey===f.key && stack.some(function(x){ return x.level===3; })){ closeFrom(2); return; }
    closeFrom(2);
    show(3, 'Gear', f.label, function(body){ if(f.body) f.body(current, body); }, anchor);
    openFeatureKey=f.key;   // set after show(): show() closes the level first, which clears this marker
  }
  function open(item, anchor){
    if(!item) return;
    if(anchor && anchor.closest && anchor.closest('.fg-gh-pw')) return;   // a button inside a popup does not close the hub it sits in
    if(stack.length && current && current.id===item.id){ closeFrom(1); return; }   // pushing GEAR again closes the whole stack
    closeFrom(1); current=item; openAnchor=anchor||null; openHub(anchor);
  }
  function close(){ if(window.FGCardBackFixedRows && FGCardBackFixedRows.closePopup) FGCardBackFixedRows.closePopup(); closeFrom(1); }
  function addFeature(f){ if(f && f.key && !featureOf(f.key)) FEATURES.push(f); }   // other files (controls/gear-board-tools.js) add their features here
  // showPopup: any other control that needs the same popup shell (same size, shape, drag and close) asks for it here, e.g. controls/board-color-selector.js.
  function showPopup(level, fromLabel, title, fill, anchor){ return show(level, fromLabel, title, fill, anchor); }
  function closeLevel(level){ closeFrom(level); }
  window.FGGearHub={ open:open, close:close, addFeature:addFeature, showPopup:showPopup, closeLevel:closeLevel, standardBox:standardBox, CLUSTERS:CLUSTERS, FEATURES:FEATURES };
})();
