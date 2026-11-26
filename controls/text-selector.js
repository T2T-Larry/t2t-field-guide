// text-selector.js -- Nov 26 2026 (Larry: "One card code"). ONE Gear popup for how a card's SUBJECT looks, used by every kind of card back.
// It replaces the block that only the idea card built (Subject Bold, CAPS, Colon, Italic, Follow parent); the look itself stays in controls/subject-look.js.
//
// WHAT YOU SEE: Gear > Text opens check boxes showing the look this card has right now (its own choice, else the one it inherits).
// A click sets this card's own choice and the cards beneath it follow; Follow parent drops the card's own choices.
// SAVED on the card's ideas row. A card that keeps its own copy (task card, idea card) listens for 'fg-card-saved' to repaint and offer Undo.
(function(){
  function injectStyle(){
    if(document.getElementById('fg-text-selector-style')) return;
    var st=document.createElement('style'); st.id='fg-text-selector-style';
    st.textContent='.fg-tx-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px}'
      +'.fg-tx-row{display:flex;align-items:center;gap:7px;min-height:26px;cursor:pointer;font-weight:700;letter-spacing:.5px}'
      +'.fg-tx-row input{margin:0;width:15px;height:15px;cursor:pointer;accent-color:#1e9e4a}';
    document.head.appendChild(st);
  }
  function build(item, box){
    var L=window.T2TSubjectLook; if(!item || !L) return;
    injectStyle();
    var list=document.createElement('div'); list.className='fg-tx-list'; box.appendChild(list);
    var follow=document.createElement('button'); follow.type='button'; follow.className='fg-gh-btn'; follow.textContent='Follow parent';
    follow.title='Drop this card’s own Bold, CAPS and colon choices so it takes its parent’s look again'; follow.style.marginTop='8px'; box.appendChild(follow);
    var status=document.createElement('div'); status.className='fg-gh-status'; box.appendChild(status);
    var defs=[['bold','Bold','isBold'],['caps','CAPS','isCaps']];
    if(item.content_type==='header') defs.push(['colon','Colon','isColon']);   // headers show a colon automatically; off here leaves it only implied
    defs.push(['italic','Italic','isItalic']);
    var boxes=[];
    function paint(){ boxes.forEach(function(x){ x.cb.checked=!!L[x.fn](item); }); }
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
      var row=document.createElement('label'); row.className='fg-tx-row'; row.title=d[1]+' for this card’s Subject; the cards beneath it follow';
      var cb=document.createElement('input'); cb.type='checkbox';
      var tx=document.createElement('span'); tx.textContent=d[1];
      row.appendChild(cb); row.appendChild(tx); list.appendChild(row);
      cb.addEventListener('change', function(){ save(L.flip(item, d[0])); });
      boxes.push({cb:cb, fn:d[2]});
    });
    follow.addEventListener('click', function(e){ e.stopPropagation(); save(L.clear()); });
    paint();
  }
  if(window.FGGearHub && FGGearHub.addFeature) FGGearHub.addFeature({ key:'text', label:'Text', cluster:'text', body:build });
})();
