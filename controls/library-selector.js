/* LIBRARY SELECTOR -- the Library row in the card Gear (Nov 16 2026, Larry: "build a LIBRARY SELECTOR for the GEAR ... with optional view on card back and card front").

   WHAT YOU SEE
   - A row called LIBRARY in the Gear's checklist (A-Z with the others), the same three-click check as every Gear row:
       click 1 = the selector opens and the ribbon shows on the BACK of the card (hollow check)
       click 2 = the ribbon ALSO shows on the FRONT (filled check)
       click 3 = hidden again (unchecked). The shelf stays saved, so click 1 brings it right back.
   - The selector is the five Library ribbons side by side (Concepts, Resources, Stories, Gems, Notebooks) plus an X. Click a ribbon to put the card on that shelf;
     click the lit ribbon again, or the X, to take the card off the Library. No ribbon lit = not in the Library.
   - Hover a ribbon for its shelf name; no letters on the ribbons themselves.

   HOW IT IS BUILT (one tree, one code)
   - The row is built by FGCardBackFixedRows like Organization and Links: this file only supplies a real check box (sb-add-library) and a body (sb-library-body).
   - Saving: adds_library (the check) here; the front/back step is the word 'library' in front_hidden, saved by the Gear's own setHidden; library_shelf by FGLibraryRibbons.setShelf.
   - Drawing: controls/library-ribbons.js draws the front ribbon; this file draws the small ribbon on the card back.
   THE BREAKER: the row only shows while the Library feature is switched on for the card (Gear > FEATURES, controls/feature-breakers.js).
   Public surface: window.FGLibrarySelector  .mount(card, ux, item) -> the Gear row definition (or null) */
(function(){
  function R(){ return window.FGLibraryRibbons; }
  function injectStyle(){
    if(document.getElementById('fg-library-selector-style')) return;
    var st=document.createElement('style'); st.id='fg-library-selector-style';
    st.textContent=''
      +'.fg-lib-store{display:none!important}'
      +'.fg-lib-body{display:none;width:100%;margin:2px 0 6px;padding:2px 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      +'.fg-lib-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:3px}'
      +'.fg-lib-pick{display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
      +'.fg-lib-btn{width:26px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px solid transparent;border-radius:5px;cursor:pointer;color:var(--bb-ink)}'
      +'.fg-lib-btn:hover{background:rgba(128,128,128,.14)}'
      +'.fg-lib-btn.fg-lib-on{border-color:var(--bb-ink);background:rgba(128,128,128,.12)}'
      +'.fg-lib-btn svg{width:14px;height:20px;display:block}'
      +'.fg-lib-x{font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;line-height:1}'
      +'.fg-lib-sep{width:1px;height:20px;background:var(--bb-accent);opacity:.6;margin:0 2px}'
      +'.fg-lib-back{position:absolute;top:0;right:40px;width:14px;height:20px;z-index:6;pointer-events:none;line-height:0}';
    document.head.appendChild(st);
  }

  function mount(card, ux, item){
    if(!card || !ux || !item || !R()) return null;
    injectStyle();
    // A real check box and a body, like Organization: the Gear row drives them.
    var store=document.createElement('div'); store.className='fg-lib-store';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.id='sb-add-library';
    store.appendChild(cb); ux.appendChild(store);
    var body=document.createElement('div'); body.className='fg-lib-body'; body.id='sb-library-body';
    body.innerHTML='<div class="fg-lib-eyebrow">Library shelf</div><div class="fg-lib-pick"></div>';
    ux.appendChild(body);
    var pick=body.querySelector('.fg-lib-pick'), buttons={};
    var shelves=R().SHELVES, order=['concepts','resources','stories','gems','notebooks'];
    order.forEach(function(k){
      var b=document.createElement('button'); b.type='button'; b.className='fg-lib-btn'; b.title=shelves[k].name;
      b.setAttribute('aria-label','Library shelf: '+shelves[k].name); b.innerHTML=R().ribbonSVG(k);
      b.addEventListener('click', function(e){ e.stopPropagation(); choose(R().shelfOf(item.id)===k ? null : k); });
      pick.appendChild(b); buttons[k]=b;
    });
    var sep=document.createElement('span'); sep.className='fg-lib-sep'; pick.appendChild(sep);
    var x=document.createElement('button'); x.type='button'; x.className='fg-lib-btn fg-lib-x'; x.textContent='✕'; x.title='Not in the Library'; x.setAttribute('aria-label','Take this card off the Library');
    x.addEventListener('click', function(e){ e.stopPropagation(); choose(null); });
    pick.appendChild(x);

    function status(msg){ var sb=document.getElementById('sb-note-status'); if(sb) sb.textContent=msg; }
    function paintBack(){
      var shelf=R().shelfOf(item.id);
      Object.keys(buttons).forEach(function(k){ buttons[k].classList.toggle('fg-lib-on', k===shelf); });
      var old=card.querySelector(':scope > .fg-lib-back'); if(old) old.remove();
      if(cb.checked && shelf && R().hasFeature(item.id,'library')){   // the ribbon on the BACK of the card
        if(getComputedStyle(card).position==='static') card.style.position='relative';
        var r=document.createElement('span'); r.className='fg-lib-back'; r.title='Library: '+shelves[shelf].name; r.innerHTML=R().ribbonSVG(shelf);
        card.appendChild(r);
      }
    }
    async function choose(shelf){
      try{ await R().setShelf(item.id, shelf); item.library_shelf=shelf; }
      catch(err){ status('Could not save the Library shelf: '+err.message); }
      paintBack();
    }
    var loading=false;   // true while this file sets the box itself, so it is not saved back
    cb.addEventListener('change', async function(){
      body.style.display=cb.checked ? 'block' : 'none';
      paintBack();
      if(loading) return;
      var on=cb.checked, prev=!!item.adds_library;
      R().note(item.id, {adds_library:on}); item.adds_library=on;
      try{
        var c=window.T2T && T2T.sb; if(!c) throw new Error('not signed in');
        var upd=await c.from('ideas').update({adds_library:on}).eq('id', item.id);
        if(upd.error) throw upd.error;
      }catch(err){ R().note(item.id, {adds_library:prev}); item.adds_library=prev; status('Could not save the Library row: '+err.message); }
    });
    // Show what this card already holds (the back is reused card to card, so look it up fresh).
    // The Library breaker (controls/feature-breakers.js): while it is off the row, its selector and the back ribbon stay out of sight.
    function apply(){
      var s=R().state(item.id), feat=R().hasFeature(item.id,'library');
      var rowEl=ux.querySelector('.fg-fixed-row[data-fg-sort="Library"]'); if(rowEl) rowEl.style.display=feat ? '' : 'none';
      loading=true; cb.checked=!!s.on; body.style.display=(cb.checked && feat) ? 'block' : 'none'; loading=false;
      paintBack();
      try{ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); }catch(e){}
    }
    apply();
    document.addEventListener('fg-features-changed', function onFeat(e){
      if(!document.body.contains(cb)){ document.removeEventListener('fg-features-changed', onFeat); return; }
      if(e.detail && e.detail.id===item.id) apply();
    });
    R().fetchOne(item.id).then(function(){ if(document.body.contains(cb)) apply(); });

    return { id:'library', label:'Library', boxes:['sb-add-library'], eyeKeys:['library'], bodies:['sb-library-body'] };
  }

  window.FGLibrarySelector={ mount:mount };
})();
