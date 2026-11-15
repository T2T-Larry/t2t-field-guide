/* LIBRARY RIBBONS -- the Library marker on a header card (Nov 15 2026, Larry's IDEA-stage design; built as a PREVIEW so he can judge it on the live site).

   WHAT IT IS
   - A small ribbon in the top-right corner of a card face: a bold color, a black frame and one letter. No ribbon = the header is not on a Library shelf.
   - The Library owns a CLOSED set of ribbons (SHELVES below), one color and one letter per shelf. Colors skip red, blue, teal and yellow (the signal-flag and card colors); signal flags stay open and pastel.
   - JOURNALS and ARCHIVES are kinds inside NOTEBOOKS, so they would carry the NOTEBOOKS ribbon.

   WHAT IT IS NOT YET
   - There is no saved marker on a header yet. The card-back row (a color selector with an X, plus a front-visibility check) is still being designed, so for this preview PREVIEW_BY_HEADER_ID below names the five Library headers by id.
     When the marker is built, the painter reads the card's saved shelf instead and PREVIEW_BY_HEADER_ID goes away. Nothing here writes to the database.

   One place, no hooks in the card code: like the LINK arrows (links.js) it watches the board and paints each card it finds. */
(function(){
  var SHELVES={
    concepts:{letter:'C', color:'#7c3aed', name:'Concepts'},
    notebooks:{letter:'N', color:'#ea580c', name:'Notebooks'},
    stories:{letter:'S', color:'#16a34a', name:'Stories'},
    gems:{letter:'G', color:'#c026d3', name:'Gems'},
    resources:{letter:'R', color:'#78350f', name:'Resources'}
  };
  // Preview only: the five Library headers on MASTER VISION (their record ids).
  var PREVIEW_BY_HEADER_ID={
    '2ffd5d6b-ced6-4a56-865b-2221aaaea883':'concepts',
    '4380dc24-1bb1-4c97-984d-60016844bc7d':'resources',
    '1d0027d5-c353-4f2e-b2c8-cc933888d8f0':'gems',
    '5a7f6ed4-4c6e-40df-8936-ec6e9076a45e':'stories',
    '609d386b-3c81-4b5a-b59d-49427df229ff':'notebooks'
  };

  function ribbonSVG(shelf){
    var s=SHELVES[shelf];
    return '<svg width="20" height="30" viewBox="0 0 20 30" aria-hidden="true">'
      +'<path d="M1 1H19V28L10 21L1 28Z" fill="'+s.color+'" stroke="#000" stroke-width="2" stroke-linejoin="round"/>'
      +'<text x="10" y="14" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">'+s.letter+'</text>'
      +'</svg>';
  }
  function idOf(el){ return el.getAttribute('data-idea-id')||el.getAttribute('data-id')||el.getAttribute('data-header-id'); }

  function paint(root){
    root=root||document;
    var cards=root.querySelectorAll('.sc-tile[data-idea-id], .bb-card[data-id], .sc-stack-tile[data-header-id]');
    for(var i=0;i<cards.length;i++){
      var el=cards[i], shelf=PREVIEW_BY_HEADER_ID[idOf(el)];
      var old=el.querySelector(':scope > .fg-lib-ribbon');
      if(!shelf){ if(old) old.remove(); continue; }
      if(old && old.getAttribute('data-shelf')===shelf) continue;   // already drawn
      if(old) old.remove();
      if(getComputedStyle(el).position==='static') el.style.position='relative';
      var r=document.createElement('span');
      r.className='fg-lib-ribbon';
      r.setAttribute('data-shelf', shelf);
      r.title='Library: '+SHELVES[shelf].name;
      r.style.cssText='position:absolute;top:-4px;right:2px;width:20px;height:30px;z-index:6;pointer-events:none;line-height:0';
      r.innerHTML=ribbonSVG(shelf);
      el.appendChild(r);
    }
  }

  // The board redraws itself many times (load, refresh, drag): watch it and paint again, once per burst of changes.
  (function watch(){
    var timer=null;
    function run(){ timer=null; paint(document); }
    try{
      new MutationObserver(function(){ if(!timer) timer=setTimeout(run, 200); }).observe(document.documentElement, {childList:true, subtree:true});
    }catch(e){}
    if(document.readyState!=='loading') setTimeout(run, 300); else document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 300); });
  })();

  window.FGLibraryRibbons={SHELVES:SHELVES, paint:paint};
})();
