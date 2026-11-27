// popup-parts.js -- Nov 27 2026. ONE place for the pieces every feature popup shares (Larry: "One tree. One code whenever possible.").
//   .head(from, title, onClose)   the popup's ID BAND: where it was opened from, its name, ✕ (Larry: "Need popup ID BAND header like COLOR popup")
//   .check(label, title) -> {row, box}   a checklist line: green check = on, no check = off (Larry: "Make on-off a checklist")
//   .reset(onClick, title) -> button     RESET, always in the popup's bottom right corner (Larry: "move reset to bottom right corner of popup cards")
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
      +'.fg-pop-check{display:flex;align-items:center;gap:7px;min-height:26px;margin:0;cursor:pointer;font-weight:700;letter-spacing:.5px}'
      +'.fg-pop-check input{margin:0;width:15px;height:15px;cursor:pointer;accent-color:#1e9e4a}'
      // Placed against the popup itself, so it lands in the same corner whatever the popup holds (it shares the foot's line when there is one).
      +'.fg-pop-reset{position:absolute;right:8px;bottom:4px;z-index:2;font:700 calc(10px * var(--fg-text-scale,1)) Georgia,serif;letter-spacing:.4px;line-height:1.35;padding:1px 9px;border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:6px;background:#fff;color:inherit;cursor:pointer}'
      +'.fg-pop-reset[disabled]{opacity:.4;cursor:default}'
      // A popup with no foot makes room for it.
      +'.fg-opt-popup:has(.fg-pop-reset):not(:has(.fg-place-foot)),.fg-gh-pc:has(.fg-pop-reset):not(:has(.fg-place-foot)){padding-bottom:26px}';
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
  function check(label, title){
    injectStyle();
    var row=document.createElement('label'); row.className='fg-pop-check'; if(title) row.title=title;
    var box=document.createElement('input'); box.type='checkbox';
    var words=document.createElement('span'); words.textContent=label;
    row.appendChild(box); row.appendChild(words);
    return { row:row, box:box };
  }
  function reset(onClick, title){
    injectStyle();
    var b=document.createElement('button'); b.type='button'; b.className='fg-pop-reset'; b.textContent='RESET';
    b.title=title || 'Return to the parent’s settings';
    b.addEventListener('click', function(e){ e.stopPropagation(); onClick(); });
    return b;
  }
  window.FGPopupParts={ head:head, check:check, reset:reset };
})();
