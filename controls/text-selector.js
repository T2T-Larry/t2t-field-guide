// text-selector.js -- Nov 26 2026 (Larry: "One card code"). ONE Gear popup for how a card's SUBJECT looks, used by every kind of card back.
// It replaces the block that only the idea card built (Subject Bold, CAPS, Colon, Italic); the look itself stays in controls/subject-look.js.
//
// WHAT YOU SEE: Gear > Text opens check boxes showing the look this card has right now (its own choice, else the one it inherits).
// TEXT SIZE, lower left, sets how large text reads on the whole screen.
// A click sets this card's own choice and the cards beneath it follow. RESET (the popup's bottom right corner, controls/popup-parts.js) drops the card's own choices,
// so it is back in line with its parent. A card with no choice of its own, or with Text switched off, simply follows its parent (Nov 27 2026, Larry:
// "Follow parent button is not needed. RESET would bring the choices back in line with parent.").
// SAVED on the card's ideas row. A card that keeps its own copy (task card, idea card) listens for 'fg-card-saved' to repaint and offer Undo.
(function(){
  function injectStyle(){
    if(document.getElementById('fg-text-selector-style')) return;
    var st=document.createElement('style'); st.id='fg-text-selector-style';
    st.textContent='.fg-tx-size{justify-self:start;align-self:center}';
    document.head.appendChild(st);
  }
  function build(item, box){
    var L=window.T2TSubjectLook; if(!item || !L) return;
    injectStyle();
    var list=FGPopupParts.list(2); box.appendChild(list);
    var reset=FGPopupParts.reset(function(){ save(L.clear()); }, function(){   // unchecked: the look showing now becomes the card's own
      var keep={ subject_bold:!!L.isBold(item), subject_caps:!!L.isCaps(item) };
      if(item.content_type==='header') keep.subject_colon=!!L.isColon(item);
      save(keep);
    });
    var status=document.createElement('div'); status.className='fg-gh-status'; box.appendChild(status);
    var defs=[['bold','Bold','isBold'],['caps','CAPS','isCaps']];
    if(item.content_type==='header') defs.push(['colon','Colon','isColon']);   // headers show a colon automatically; off here leaves it only implied
    defs.push(['italic','Italic','isItalic']);
    var boxes=[];
    function paint(){
      boxes.forEach(function(x){ x.cb.checked=!!L[x.fn](item); });
      reset.paint(Object.keys(L.clear()).every(function(k){ return item[k]===null || item[k]===undefined; }));   // checked: nothing of its own to drop
    }
    async function save(patch){
      var before={}, k; for(k in patch) before[k]=(item[k]===true||item[k]===false) ? item[k] : null;
      status.textContent='Saving…';
      try{
        if(window.FGNewCardDoor && FGNewCardDoor.whenReady) await FGNewCardDoor.whenReady(item.id);
        var sb=window.T2T && window.T2T.sb; if(!sb) throw new Error('not signed in');
        var upd=await sb.from('ideas').update(patch).eq('id', item.id);
        if(upd.error) throw upd.error;
        for(k in patch) item[k]=patch[k];
        status.textContent='';
        document.dispatchEvent(new CustomEvent('fg-card-saved',{detail:{id:item.id, patch:patch, before:before, item:item, text:true}}));
      }catch(err){ status.textContent='Could not save: '+err.message; }
      paint();
      if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync();
    }
    defs.forEach(function(d){
      var c=FGPopupParts.check(d[1], d[1]+' for this card’s Subject; the cards beneath it follow'), cb=c.box;
      list.appendChild(c.row);
      cb.addEventListener('change', function(){ save(L.flip(item, d[0])); });
      boxes.push({cb:cb, fn:d[2]});
    });
    // TEXT SIZE (Nov 27 2026): how large everything reads on this screen. One setting for the whole screen, not for this card alone.
    if(window.openFGTextSizePicker){
      var size=document.createElement('button'); size.type='button'; size.className='fg-gh-btn fg-tx-size'; size.textContent='Text size';
      size.title='How large text reads on your whole screen';
      size.addEventListener('click', function(e){ e.stopPropagation(); window.openFGTextSizePicker(); });
      list.appendChild(size);
    }
    list.appendChild(reset.row);
    paint();
  }
  if(window.FGGearHub && FGGearHub.addFeature) FGGearHub.addFeature({ key:'text', label:'Text', cluster:'text', body:build });
})();
