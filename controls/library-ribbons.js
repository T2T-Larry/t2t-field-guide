/* LIBRARY RIBBONS -- the Library marker on a card (Nov 15 2026 design; Nov 16 2026 now saved per card and chosen in the card Gear by controls/library-selector.js).

   WHAT IT IS
   - A small ribbon inside the top-right corner of a card face: a bold color and a black frame, no letter. No ribbon = the card is not on a Library shelf.
   - The Library owns a CLOSED set of ribbons (SHELVES below): Concepts white, Resources black, Stories bright yellow, Gems magenta, Notebooks orange.
     The colors stay apart from the open pastel signal flags. JOURNALS and ARCHIVES are kinds inside NOTEBOOKS, so they carry the NOTEBOOKS ribbon.

   WHAT IS SAVED (database-changes/2026-11-16 library selector.sql)
   - ideas.library_shelf  the shelf (null = not in the Library).  Unchecking the Gear row never clears it; the X in the selector does.
   - ideas.adds_library   the Gear's Library row is checked (the ribbon shows on the BACK).
   - ideas.features       the feature breakers switched ON for the card (comma list). Library off = no Gear row and no ribbon; the saved shelf stays.
   - the word 'library' in ideas.front_hidden = back only; no word = the ribbon also shows on the card FRONT (same rule as every Gear row).

   HOW IT WORKS
   - One place, no hooks in the card renderers: like the LINK arrows (links.js) it keeps a small list of the cards that have a shelf, watches the board and paints each card it finds.
   - The Gear row (library-selector.js) tells this file about changes with note() / setShelf(), so the board repaints at once.
   Public surface: window.FGLibraryRibbons  .SHELVES  .ribbonSVG(shelf)  .shelfOf(id)  .state(id)  .fetchOne(id)  .note(id,patch)  .setShelf(id,shelf)  .paint() */
(function(){
  var SHELVES={
    concepts:{letter:'C', color:'#ffffff', name:'Concepts'},
    notebooks:{letter:'N', color:'#ea580c', name:'Notebooks'},
    stories:{letter:'S', color:'#ffd400', name:'Stories'},
    gems:{letter:'G', color:'#c026d3', name:'Gems'},
    resources:{letter:'R', color:'#000000', name:'Resources'}
  };
  var cache={};   // id -> {shelf, on (adds_library), hidden (front_hidden text), features (the breakers switched on, a comma list)}
  var COLS='id,library_shelf,adds_library,front_hidden,features';

  function client(){ return (window.T2T && window.T2T.sb) || null; }
  function rowToState(r){ return {shelf:r.library_shelf||null, on:!!r.adds_library, hidden:r.front_hidden||'', features:r.features||''}; }
  function ribbonSVG(shelf){
    var s=SHELVES[shelf]; if(!s) return '';
    return '<svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">'
      +'<path d="M1 1H13V19L7 14L1 19Z" fill="'+s.color+'" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>'
      +'</svg>';
  }
  function state(id){ return cache[id]||{shelf:null,on:false,hidden:'',features:''}; }
  // Is a feature breaker (controls/feature-breakers.js) switched on for this card? A feature that is off hides its Gear row and its ribbon.
  function hasFeature(id,key){ return (','+state(id).features+',').indexOf(','+key+',')>=0; }
  function shelfOf(id){ return state(id).shelf; }
  function idOf(el){ return el.getAttribute('data-idea-id')||el.getAttribute('data-id')||el.getAttribute('data-header-id'); }
  // The ribbon shows on a card FRONT when the Gear row is checked and the row is on its second step (no 'library' word in front_hidden).
  function onFront(id){
    var s=state(id);
    return !!(s.shelf && SHELVES[s.shelf] && hasFeature(id,'library') && s.on && (','+s.hidden+',').indexOf(',library,')<0);
  }

  function paint(root){
    root=root||document;
    var cards=root.querySelectorAll('.sc-tile[data-idea-id], .bb-card[data-id], .sc-stack-tile[data-header-id]');
    for(var i=0;i<cards.length;i++){
      var el=cards[i], id=idOf(el), shelf=onFront(id) ? state(id).shelf : null;
      var old=el.querySelector(':scope > .fg-lib-ribbon');
      if(!shelf){ if(old) old.remove(); continue; }
      if(old && old.getAttribute('data-shelf')===shelf) continue;   // already drawn
      if(old) old.remove();
      if(getComputedStyle(el).position==='static') el.style.position='relative';
      var r=document.createElement('span');
      r.className='fg-lib-ribbon';
      r.setAttribute('data-shelf', shelf);
      r.title='Library: '+SHELVES[shelf].name;
      r.style.cssText='position:absolute;top:0;right:5px;width:14px;height:20px;z-index:6;pointer-events:none;line-height:0';
      r.innerHTML=ribbonSVG(shelf);
      el.appendChild(r);
    }
    try{ document.dispatchEvent(new CustomEvent('fg-library-painted')); }catch(e){}
  }
  var timer=null;
  function paintSoon(){ if(!timer) timer=setTimeout(function(){ timer=null; paint(document); }, 150); }

  // ---- the data --------------------------------------------------------------------------------------------------------------
  async function loadAll(tries){
    var c=client();
    if(!c){ if((tries||0)<40) setTimeout(function(){ loadAll((tries||0)+1); }, 500); return; }
    try{
      var r=await c.from('ideas').select(COLS).not('library_shelf','is',null);
      if(r.error) throw r.error;
      (r.data||[]).forEach(function(row){ cache[row.id]=rowToState(row); });
      paintSoon();
    }catch(e){ if((tries||0)<6) setTimeout(function(){ loadAll((tries||0)+1); }, 2000); }
  }
  async function fetchOne(id){
    var c=client(); if(!c) return state(id);
    try{
      var r=await c.from('ideas').select(COLS).eq('id', id).maybeSingle();
      if(!r.error && r.data){ cache[id]=rowToState(r.data); paintSoon(); }
    }catch(e){}
    return state(id);
  }
  // Another file changed something about a card (the Gear row, or its front/back step): keep the list current and repaint at once.
  function note(id, patch){
    var s=Object.assign({}, state(id));
    if('library_shelf' in patch) s.shelf=patch.library_shelf||null;
    if('adds_library' in patch) s.on=!!patch.adds_library;
    if('front_hidden' in patch) s.hidden=patch.front_hidden||'';
    if('features' in patch) s.features=patch.features||'';
    cache[id]=s; paintSoon();
  }
  async function setShelf(id, shelf){
    var c=client(); if(!c) throw new Error('not signed in');
    var before=state(id).shelf;
    note(id, {library_shelf:shelf});
    var r=await c.from('ideas').update({library_shelf:shelf||null}).eq('id', id);
    if(r.error){ note(id, {library_shelf:before}); throw r.error; }
  }

  // The board redraws itself many times (load, refresh, drag): watch it and paint again, once per burst of changes.
  try{ new MutationObserver(function(){ paintSoon(); }).observe(document.documentElement, {childList:true, subtree:true}); }catch(e){}
  if(document.readyState!=='loading') setTimeout(loadAll, 300); else document.addEventListener('DOMContentLoaded', function(){ setTimeout(loadAll, 300); });

  window.FGLibraryRibbons={SHELVES:SHELVES, ribbonSVG:ribbonSVG, shelfOf:shelfOf, state:state, hasFeature:hasFeature, fetchOne:fetchOne, note:note, setShelf:setShelf, paint:paint};
})();
