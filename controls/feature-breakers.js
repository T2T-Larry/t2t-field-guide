/* FEATURE BREAKERS -- the master feature selector in the card Gear (Nov 16 2026, Larry: "a set of circuit breaker toggle switches which become a checklist box when activated").

   WHAT YOU SEE
   - A FEATURES button in the Gear opens a small panel of breaker switches, one per feature. Most start OFF. LIBRARY is the first.
   - A breaker that is ON gives the feature its checklist row in the Gear (and its ribbon on the card). A breaker that is OFF hides both; whatever was saved stays.

   THE RULE (Larry, KEPT): flipping a feature on a card sets it for that card and every card beneath it.
   - A card below can flip it again for itself and its own children. Who may flip what is between parent and child: the code does not police it.
   - There is no "inherited" state. Each card simply holds its own list, and the latest flip from above or below wins.

   HOW IT IS SAVED (database-changes/2026-11-16 feature breakers.sql)
   - ideas.features: a comma list of the features that are on for the card. A flip writes the new list to the card and every card under it (the cluster_id tree).

   ADDING A FEATURE LATER: one line in FEATURES below, then have its Gear row hide itself while FGFeatureBreakers.isOn(id,key) is false (see library-selector.js).
   Public surface: window.FGFeatureBreakers  .FEATURES  .isOn(id,key)  .isOffRow(row,key)  .hasWord(row,word)  .flip(id,key,on) -> number of cards changed  .writeStored(id,word,on)  .writeMany(id,[{key,on}])  .writeOne(id,[{key,on}]) (that card only)  .openPanel(item)  .ICON
   Event: 'fg-features-changed' ({detail:{id,key,on,words}}; words = every card's new list, so card faces can follow) after a flip, so an open card back shows or hides the row at once. */
(function(){
  var FEATURES=[
    { key:'library', label:'Library', hint:'A ribbon that puts a card on a Library shelf' },
    { key:'color-wheel', label:'Color wheel', hint:'Lets a card pick any color in the Color popup' }
  ];
  var ICON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><rect x="9" y="6" width="6" height="12" rx="1.5"/><line x1="12" y1="6" x2="12" y2="12"/></svg>';

  function R(){ return window.FGLibraryRibbons; }
  function client(){ return (window.T2T && window.T2T.sb) || null; }
  function featureOf(key){ for(var i=0;i<FEATURES.length;i++){ if(FEATURES[i].key===key) return FEATURES[i]; } return null; }
  function isOn(id,key){ return !!(R() && R().hasFeature(id,key)); }
  function parse(str){ return String(str||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean); }
  function chunks(arr,n){ var out=[]; for(var i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

  // The card and every card beneath it, found level by level through cluster_id.
  async function subtree(rootId){
    var c=client(); if(!c) throw new Error('not signed in');
    var seen={}; seen[rootId]=true; var all=[rootId], frontier=[rootId];
    while(frontier.length && all.length<8000){
      var next=[];
      for(var ch of chunks(frontier,80)){
        var r=await c.from('ideas').select('id').in('cluster_id', ch);
        if(r.error) throw r.error;
        (r.data||[]).forEach(function(row){ if(!seen[row.id]){ seen[row.id]=true; all.push(row.id); next.push(row.id); } });
      }
      frontier=next;
    }
    return all;
  }

  // Flip: write the feature on or off for the card and every card beneath it. Returns how many cards changed.
  async function flip(rootId, key, on){
    if(!featureOf(key)) throw new Error('unknown feature');
    return writeStored(rootId, key, on);
  }
  // The one writer: puts a word in (or takes it out of) the features list of the card and every card beneath it. The breakers use it by their own key;
  // the card OPTIONS list (controls/card-options-list.js) uses it for its on-/off- words, so there is one tree and one piece of saving code.
  function writeStored(rootId, key, on){ return writeMany(rootId, [{key:key, on:on}]); }
  // One card only, nothing beneath it (Nov 26 2026: an option a card is using, such as Order). Returns the card's new word list.
  async function writeOne(id, changes){
    var c=client(); if(!c) throw new Error('not signed in');
    var r=await c.from('ideas').select('features').eq('id', id).maybeSingle();
    if(r.error) throw r.error;
    if(!r.data) throw new Error('card not found');
    var v=apply(parse(r.data.features), changes).join(',');
    var upd=await c.from('ideas').update({features:v||null}).eq('id', id).select('id');
    if(upd.error) throw upd.error;
    if(!upd.data || !upd.data.length) throw new Error('Save was blocked (no rows matched).');
    if(R()) R().note(id,{features:v});
    announce(id, changes, (function(){ var w={}; w[id]=v; return w; })());
    return v;
  }
  // OFF LINES UP WITH THE PARENT (Nov 27 2026, Larry: "Reset or Off should both align with parent."): the painters ask this before using a card's own
  // Color or Text choice. While the feature is off on a card the saved choice is passed over, and kept, so switching on brings it back.
  var written={};   // id -> the words this tab saved last (newer than any row already in hand)
  function isOffRow(row,key){ return hasWord(row,'off-'+key); }
  // Is a saved word on this card? (A row in hand, or just {id}: the newest words known for it are used.)
  function hasWord(row,word){
    if(!row) return false;
    var id=row.id, w;
    if(id!=null && written.hasOwnProperty(id)) w=written[id];
    else {
      var all=null; try{ all=window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){}
      var t=(all && id!=null) ? all[id] : null;
      w=(t && t.features!==undefined) ? t.features : row.features;
    }
    return (','+String(w||'')+',').indexOf(','+word+',')>=0;
  }
  function announce(id, changes, words){
    Object.keys(words||{}).forEach(function(k){ written[k]=words[k]; try{ if(typeof _sboardPatchRow==='function') _sboardPatchRow(k, {features:words[k]||null}); }catch(e){} });
    if(changes.some(function(x){ return x.key==='off-color' || x.key==='off-text' || x.key==='off-az'; })){ try{ if(typeof renderSeaBoard==='function') renderSeaBoard(true); }catch(e){} }
    changes.forEach(function(x){ try{ document.dispatchEvent(new CustomEvent('fg-features-changed',{detail:{id:id,key:x.key,on:x.on,words:words}})); }catch(e){} });
  }
  // Several words in ONE pass over the tree (Nov 26 2026: the ALL box on the FEATURES list). changes = [{key, on}].
  function apply(list, changes){
    var out=list.slice();
    changes.forEach(function(x){ var i=out.indexOf(x.key); if(x.on && i<0) out.push(x.key); else if(!x.on && i>=0) out.splice(i,1); });
    return out;
  }
  async function writeMany(rootId, changes){
    var c=client(); if(!c) throw new Error('not signed in');
    var ids=await subtree(rootId), current={};
    for(var ch of chunks(ids,80)){
      var r=await c.from('ideas').select('id,features').in('id', ch);
      if(r.error) throw r.error;
      (r.data||[]).forEach(function(row){ current[row.id]=parse(row.features); });
    }
    var groups={}, words={}, changed=0;
    ids.forEach(function(id){
      var before=(current[id]||[]).join(','), v=apply(current[id]||[], changes).join(',');
      words[id]=v;
      if(v===before) return;
      (groups[v]=groups[v]||[]).push(id); changed++;
    });
    for(var v in groups){
      for(var ch2 of chunks(groups[v],200)){
        var upd=await c.from('ideas').update({features:v||null}).in('id', ch2);
        if(upd.error) throw upd.error;
      }
    }
    // Keep the ribbon list current for the cards it already knows, and tell any open card back.
    if(R()){ ids.forEach(function(id){ if(id===rootId || R().shelfOf(id)) R().note(id,{features:apply(parse(R().state(id).features), changes).join(',')}); }); }
    announce(rootId, changes, words);
    return changed;
  }

  // ---- the panel -------------------------------------------------------------------------------------------------------------
  var pop=null;
  function closePanel(){ if(pop && pop.parentNode) pop.parentNode.removeChild(pop); pop=null; document.removeEventListener('keydown', onKey, true); }
  function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); closePanel(); } }
  function injectStyle(){
    if(document.getElementById('fg-feature-breakers-style')) return;
    var st=document.createElement('style'); st.id='fg-feature-breakers-style';
    st.textContent=''
      +'.fg-fb-wrap{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}'
      +'.fg-fb-panel{width:min(340px,92vw);max-height:86vh;overflow:auto;background:var(--bb-bg,#fffdf6);color:var(--bb-ink,#2b2b2b);border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:10px;padding:12px 14px 10px;box-shadow:0 8px 28px rgba(0,0,0,.3);font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.fg-fb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px}'
      +'.fg-fb-title{font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase}'
      +'.fg-fb-x{background:transparent;border:0;cursor:pointer;color:inherit;font-size:calc(16px * var(--fg-text-scale,1));line-height:1;padding:2px 6px}'
      +'.fg-fb-sub{opacity:.75;margin:0 0 8px;line-height:1.35}'
      +'.fg-fb-row{display:flex;align-items:center;gap:10px;min-height:34px;border-bottom:1px dotted var(--bb-accent,#8a7a4a)}'
      +'.fg-fb-row:last-of-type{border-bottom:0}'
      // The breaker: a small rocker switch. Down and grey = off; up and green = on.
      +'.fg-fb-sw{flex:0 0 auto;position:relative;width:34px;height:18px;padding:0;border:1.5px solid var(--bb-ink,#2b2b2b);border-radius:9px;background:#d8d8d8;cursor:pointer;transition:background .12s}'
      +'.fg-fb-sw::after{content:"";position:absolute;top:1px;left:1px;width:13px;height:13px;border-radius:50%;background:#fff;border:1.5px solid var(--bb-ink,#2b2b2b);box-sizing:border-box;transition:left .12s}'
      +'.fg-fb-sw[aria-checked="true"]{background:#5fb36b}'
      +'.fg-fb-sw[aria-checked="true"]::after{left:17px}'
      +'.fg-fb-sw[disabled]{opacity:.5;cursor:wait}'
      +'.fg-fb-lab{flex:1 1 auto;min-width:0;font-weight:700}'
      +'.fg-fb-hint{display:block;font-weight:400;opacity:.65;font-size:calc(10.5px * var(--fg-text-scale,1))}'
      +'.fg-fb-status{min-height:16px;margin-top:6px;opacity:.8;line-height:1.3}';
    document.head.appendChild(st);
  }
  function openPanel(item){
    if(!item || !R()) return;
    if(pop){ closePanel(); return; }
    injectStyle();
    pop=document.createElement('div'); pop.className='fg-fb-wrap';
    var panel=document.createElement('div'); panel.className='fg-fb-panel';
    panel.innerHTML='<div class="fg-fb-head"><span class="fg-fb-title">Features</span><button type="button" class="fg-fb-x" aria-label="Close">✕</button></div>'
      +'<p class="fg-fb-sub">Flip a breaker on to add the feature to this card and every card beneath it.</p>';
    var status=document.createElement('div'); status.className='fg-fb-status';
    var rows=[];
    FEATURES.forEach(function(f){
      var row=document.createElement('div'); row.className='fg-fb-row';
      var sw=document.createElement('button'); sw.type='button'; sw.className='fg-fb-sw'; sw.setAttribute('role','switch');
      var lab=document.createElement('span'); lab.className='fg-fb-lab'; lab.textContent=f.label;
      if(f.hint){ var h=document.createElement('span'); h.className='fg-fb-hint'; h.textContent=f.hint; lab.appendChild(h); }
      row.appendChild(sw); row.appendChild(lab); panel.appendChild(row);
      sw.addEventListener('click', async function(e){
        e.stopPropagation();
        var want=!isOn(item.id,f.key);
        sw.disabled=true; status.textContent='Flipping '+f.label+' '+(want?'on':'off')+'…';
        try{
          var n=await flip(item.id, f.key, want);
          status.textContent=f.label+' is '+(want?'on':'off')+' for this card'+(n>1 ? ' and '+(n-1)+' card'+(n-1===1?'':'s')+' beneath it.' : '.');
        }catch(err){ status.textContent='Could not flip it: '+err.message; }
        sw.disabled=false; paint();
      });
      rows.push({f:f,sw:sw});
    });
    panel.appendChild(status);
    function paint(){ rows.forEach(function(x){ var on=isOn(item.id,x.f.key); x.sw.setAttribute('aria-checked', on?'true':'false'); x.sw.title=x.f.label+(on?' is on. Click to switch it off':' is off. Click to switch it on'); x.sw.setAttribute('aria-label', x.sw.title); }); }
    paint();
    R().fetchOne(item.id).then(function(){ if(pop) paint(); });   // look the card up fresh, in case it was flipped from above
    pop.appendChild(panel); document.body.appendChild(pop);
    pop.addEventListener('mousedown', function(e){ if(e.target===pop) closePanel(); });
    panel.querySelector('.fg-fb-x').addEventListener('click', function(e){ e.stopPropagation(); closePanel(); });
    document.addEventListener('keydown', onKey, true);
  }

  window.FGFeatureBreakers={ FEATURES:FEATURES, isOn:isOn, isOffRow:isOffRow, hasWord:hasWord, flip:flip, writeStored:writeStored, writeMany:writeMany, writeOne:writeOne, openPanel:openPanel, ICON:ICON };
})();
