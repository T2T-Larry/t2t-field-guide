// picture-row.js -- Nov 26 2026 (Larry: "One card code. Features all selectable as OPTIONS"). The IMAGE option: ONE picture row used by every kind of card back.
// A small preview of the card's picture (when it has one), the picture button, and Remove. Each card back keeps its own saving; the look and the place live here:
// the row sits at the foot of the open space to the right of OPTIONS, so it takes no height from the card.
//
// FGPictureRow.inner({url, removable, ids:{preview, swap, remove}}) -> the row's HTML
//   url        the card's picture, if any
//   removable  offer Remove (an image card on an idea board keeps its picture, because without it the card would be empty)
// FGPictureRow.dock(bbw, row) -> moves the row to its place on the card back (leaves it where it is when the back has no OPTIONS split)
(function(){
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function inner(o){
    var ids=o.ids;
    return (o.url ? '<img id="'+ids.preview+'" src="'+esc(o.url)+'" alt="" style="width:44px;height:44px;object-fit:cover;object-position:center 25%;border-radius:4px;border:1px solid var(--bb-accent)">' : '')
      + '<button type="button" class="bb-icon-btn" id="'+ids.swap+'" title="'+(o.url?'Replace picture':'Add a picture')+'" aria-label="'+(o.url?'Replace picture':'Add a picture')+'">🖼️</button>'
      + ((o.url && o.removable) ? '<button type="button" class="bb-icon-btn" id="'+ids.remove+'" title="Remove picture" aria-label="Remove picture">✕</button>' : '');
  }
  function dock(bbw, row){
    var right=bbw && bbw.querySelector('.fg-back-right'); if(!right || !row) return;
    if(!document.getElementById('fg-picture-row-style')){
      var st=document.createElement('style'); st.id='fg-picture-row-style';
      st.textContent='.fg-back-right.fg-has-pic{display:flex;flex-direction:column}'
        +'.fg-back-right.fg-has-pic>.fg-pic-dock{order:9;margin:auto 0 2px!important;flex:0 0 auto}';
      document.head.appendChild(st);
    }
    right.classList.add('fg-has-pic'); row.classList.add('fg-pic-dock'); right.appendChild(row);
  }
  window.FGPictureRow={ inner:inner, dock:dock };
})();
