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
   EVERY CARD (Nov 26 2026, Larry: "yes. one code for all cards."): the idea card back is built afresh for each card; the task card back is built once
   and reused, so it passes card and item as functions, its own id prefix ('bb-d'), and calls refresh() each time a card opens.
   Public surface: window.FGLibrarySelector  .mount(card, ux, item, opts) -> the Gear row definition, with .refresh() (or null) */
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
      // In the Gear popup the rows and the shelf fit without scrolling.
      +'.fg-gh-std .fg-lib-body{margin:0;padding:0;border:0}.fg-gh-std .fg-lib-btn{height:22px}'
      +'.fg-lib-back{position:absolute;top:0;right:90px;width:14px;height:20px;z-index:6;pointer-events:none;line-height:0}';
    document.head.appendChild(st);
  }

  function mount(card, ux, item, opts){
    if(!card || !ux || !item || !R()) return null;
    var p=(opts && opts.prefix) || 'sb';
    var cur=function(){ return typeof item==='function' ? item() : item; };
    var cardEl=function(){ return typeof card==='function' ? card() : card; };
    injectStyle();
    // A real check box and a body, like Organization: the Gear row drives them.
    var store=document.createElement('div'); store.className='fg-lib-store';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.id=p+'-add-library';
    store.appendChild(cb); ux.appendChild(store);
    var body=document.createElement('div'); body.className='fg-lib-body'; body.id=p+'-library-body';
    body.innerHTML='<div class="fg-lib-eyebrow">Library shelf</div><div class="fg-lib-pick"></div>';
    ux.appendChild(body);
    var pick=body.querySelector('.fg-lib-pick'), buttons={};
    var shelves=R().SHELVES, order=['concepts','resources','stories','gems','notebooks'];
    order.forEach(function(k){
      var b=document.createElement('button'); b.type='button'; b.className='fg-lib-btn'; b.title=shelves[k].name;
      b.setAttribute('aria-label','Library shelf: '+shelves[k].name); b.innerHTML=R().ribbonSVG(k);
      b.addEventListener('click', function(e){ e.stopPropagation(); var it=cur(); if(it) choose(R().shelfOf(it.id)===k ? null : k); });
      pick.appendChild(b); buttons[k]=b;
    });
    var sep=document.createElement('span'); sep.className='fg-lib-sep'; pick.appendChild(sep);
    var x=document.createElement('button'); x.type='button'; x.className='fg-lib-btn fg-lib-x'; x.textContent='✕'; x.title='Not in the Library'; x.setAttribute('aria-label','Take this card off the Library');
    x.addEventListener('click', function(e){ e.stopPropagation(); choose(null); });
    pick.appendChild(x);

    function status(msg){ var line=p==='sb' ? document.getElementById('sb-note-status') : null; if(line) line.textContent=msg; else alert(msg); }
    function paintBack(){
      var it=cur(), host=cardEl(); if(!host) return;
      var shelf=it ? R().shelfOf(it.id) : null;
      Object.keys(buttons).forEach(function(k){ buttons[k].classList.toggle('fg-lib-on', k===shelf); });
      var old=host.querySelector(':scope > .fg-lib-back'); if(old) old.remove();
      if(cb.checked && shelf && R().hasFeature(it.id,'library')){   // the ribbon on the BACK of the card
        if(getComputedStyle(host).position==='static') host.style.position='relative';
        var r=document.createElement('span'); r.className='fg-lib-back'; r.title='Library: '+shelves[shelf].name; r.innerHTML=R().ribbonSVG(shelf);
        host.appendChild(r);
      }
    }
    async function choose(shelf){
      var it=cur(); if(!it) return;
      try{ await R().setShelf(it.id, shelf); it.library_shelf=shelf; }
      catch(err){ status('Could not save the Library shelf: '+err.message); }
      paintBack();
    }
    var loading=false;   // true while this file sets the box itself, so it is not saved back
    cb.addEventListener('change', async function(){
      body.style.display=cb.checked ? 'block' : 'none';
      paintBack();
      var it=cur(); if(loading || !it) return;
      var on=cb.checked, prev=R().state(it.id).on;
      R().note(it.id, {adds_library:on}); it.adds_library=on;
      try{
        var c=window.T2T && T2T.sb; if(!c) throw new Error('not signed in');
        var upd=await c.from('ideas').update({adds_library:on}).eq('id', it.id);
        if(upd.error) throw upd.error;
      }catch(err){ R().note(it.id, {adds_library:prev}); it.adds_library=prev; status('Could not save the Library row: '+err.message); }
    });
    // Show what this card already holds (the back is reused card to card, so look it up fresh).
    // The Library breaker (controls/feature-breakers.js): while it is off the row, its selector and the back ribbon stay out of sight.
    function apply(){
      var it=cur();
      var st=it ? R().state(it.id) : {on:false}, feat=!!it && R().hasFeature(it.id,'library');
      var rowEl=ux.querySelector('.fg-fixed-row[data-fg-sort="Library"]'); if(rowEl) rowEl.style.display=feat ? '' : 'none';
      loading=true; cb.checked=!!st.on; body.style.display=(cb.checked && feat) ? 'block' : 'none'; loading=false;
      paintBack();
      try{ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); }catch(e){}
    }
    function live(){ return p!=='sb' || document.body.contains(cb); }   // an idea back is thrown away when it closes; the task back stays
    // Look the card up fresh, in case it was changed from above.
    function refresh(){
      apply();
      var it=cur(); if(!it) return;
      R().fetchOne(it.id).then(function(){ var now=cur(); if(live() && now && now.id===it.id) apply(); });
    }
    document.addEventListener('fg-features-changed', function onFeat(e){
      if(!live()){ document.removeEventListener('fg-features-changed', onFeat); return; }
      var it=cur(); if(it && e.detail && (e.detail.id===it.id || (e.detail.words && e.detail.words.hasOwnProperty(it.id)))) apply();
    });
    refresh();

    return { id:'library', label:'Library', boxes:[p+'-add-library'], eyeKeys:['library'], bodies:[p+'-library-body'], refresh:refresh };
  }

  window.FGLibrarySelector={ mount:mount };
})();
