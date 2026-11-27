// popup-parts.js -- Nov 27 2026. ONE place for the pieces every feature popup shares (Larry: "One tree. One code whenever possible.").
//   .head(from, title, onClose)   the popup's ID BAND: where it was opened from, its name, ✕ (Larry: "Need popup ID BAND header like COLOR popup")
//   .list(columns)               a popup's checklist, centered in the popup (Larry: "Center checklist on popup card")
//   .check(label, title) -> {row, box}   a checklist line: green check = on, no check = off (Larry: "Make on-off a checklist")
//   .reset(onClick, title) -> {row, paint(atDefault)}   RESET as a checklist line: checked = following the card above (Larry: "Make RESET a checklist item")
//   .box(input)                  the same green check box anywhere else, e.g. a card's OPTIONS list (Larry: "use same style checkbox ... as on popup")
(function(){
  function injectStyle(){
    if(document.getElementById('fg-popup-parts-style')) return;
    var st=document.createElement('style'); st.id='fg-popup-parts-style';
    st.textContent=''
      // The ID BAND, tinted by the popup's level, on the Gear's popups (controls/gear-hub.js) and the feature popups alike.
      +'.fg-gh-pc,.fg-opt-popup{--gh-tint:#f3ecd9}'
      +'.fg-gh-pc[data-level="2"],.fg-opt-popup[data-level="2"]{--gh-tint:#dce8f5}'
      +'.fg-gh-pc[data-level="3"],.fg-gh-pc[data-level="4"],.fg-opt-popup[data-level="3"],.fg-opt-popup[data-level="4"]{--gh-tint:#dcefdf}'
      +'.fg-gh-ph{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 3px 10px;border-bottom:1px solid var(--bb-accent,#8a7a4a);border-radius:9px 9px 0 0;background:var(--gh-tint);font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;user-select:none}'
      +'.fg-gh-ph .l{flex:0 0 62px;text-align:left;opacity:.75}'
      +'.fg-gh-ph .t{flex:1;text-align:center}'
      +'.fg-gh-ph .x{flex:0 0 62px;text-align:right}'
      +'.fg-gh-x{background:none;border:0;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;color:inherit}'
      // In a feature popup the band runs edge to edge.
      +'.fg-opt-popup>.fg-gh-ph{flex:0 0 auto;margin:0 -12px 3px;padding-top:2px;padding-bottom:1px;border-radius:8px 8px 0 0}'
      +'.fg-pop-check{display:flex;align-items:center;gap:7px;min-height:25px;margin:0;cursor:pointer;font-weight:700;letter-spacing:.5px}'
      +'.fg-pop-check input{margin:0;cursor:pointer}'
      // Green, over the one-look rule for check boxes (style/style.css), which sets size and shape for the whole Field Guide.
      +'input.fg-green-box[type=checkbox]{accent-color:#1e9e4a !important}'
      // The checklist sits in the middle of the popup, its boxes lined up under one another.
      +'.fg-opt-pop-body:has(>.fg-pop-list),.fg-gh-pb:has(>.fg-pop-list){display:flex;flex-direction:column}'
      +'.fg-pop-list{flex:1 0 auto;display:grid;grid-template-columns:auto;justify-content:center;align-content:center;column-gap:26px}'
      +'.fg-pop-list.two{grid-template-columns:auto auto}';
    document.head.appendChild(st);
  }
  function head(from, title, onClose){
    injectStyle();
    var h=document.createElement('div'); h.className='fg-gh-ph';
    h.innerHTML='<span class="l"></span><span class="t"></span><span class="x"></span>';
    h.querySelector('.l').textContent=from; h.querySelector('.t').textContent=title;
    var x=document.createElement('button'); x.type='button'; x.className='fg-gh-x'; x.textContent='✕'; x.title='Close'; x.setAttribute('aria-label','Close');
    x.onclick=function(e){ e.stopPropagation(); onClose(); };
    h.querySelector('.x').appendChild(x);
    return h;
  }
  function box(input){
    injectStyle();
    input.classList.remove('fg-tri'); input.classList.add('fg-green-box');
    return input;
  }
  function list(columns){
    injectStyle();
    var d=document.createElement('div'); d.className='fg-pop-list'+(columns===2 ? ' two' : '');
    return d;
  }
  function check(label, title){
    var row=document.createElement('label'); row.className='fg-pop-check'; if(title) row.title=title;
    var cb=document.createElement('input'); cb.type='checkbox'; box(cb);
    var words=document.createElement('span'); words.textContent=label;
    row.appendChild(cb); row.appendChild(words);
    row.addEventListener('click', function(e){ e.stopPropagation(); });
    return { row:row, box:cb };
  }
  function reset(onClick, title){
    var c=check('RESET', title || 'Checked: following the card above. Check it to return to those settings');
    c.box.addEventListener('click', function(e){
      if(!c.box.checked){ e.preventDefault(); return; }   // already following: it stays checked
      onClick();
    });
    return { row:c.row, paint:function(atDefault){ c.box.checked=!!atDefault; } };
  }
  window.FGPopupParts={ head:head, list:list, check:check, reset:reset, box:box };
})();
