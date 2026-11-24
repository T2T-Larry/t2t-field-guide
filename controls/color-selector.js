// color-selector.js -- Nov 23 2026 (Larry: "Can you build a COLOR SELECTOR popup with the info we now have?").
// ONE place that decides what color a card is, and the Gear popup that changes it.
//
// THE RULE (Larry, Nov 21-23): a card defaults to the color of its nearest ancestor. A card's color change flows down only to cards beneath it
// that have no color of their own; a card with its own color blocks what is above it and becomes the parent for its own children. RESET (the
// first swatch) hands a card back to its parent's color. A parent never overrides a child. Where nobody has chosen, the default look applies.
//
// DATA: ideas.color = this card's own color. ideas.child_colors = {topic, headers, subbers} = what this card sets for the cards beneath it
// (database-changes/2026-11-23-ideas-child-colors.sql). A card is a TOPIC when it is a root or has an owner, a HEADER when its content_type is
// 'header', and a SUBBER otherwise.
// NOT BUILT YET (waiting on Larry's answers, see the open card): BRAND palette and its lock, the source line tap-to-jump, ID BAND / background wiring.
// The COLOR WHEEL (any color) shows only where the 'color-wheel' breaker is on for the card (controls/feature-breakers.js).
//
// Public surface: window.T2TColorLook
//   .kind(row) -> 'topic' | 'headers' | 'subbers'
//   .effective(row) -> the color the card is painted with ('' = default look)
//   .childColor(row, kind) -> {color, from} what this card's children of that kind get, and the card that set it
//   .ownerOfCard(row) -> the card the effective color comes from (row itself, an ancestor, or null)
(function(){
  var KINDS=['topic','headers','subbers'];
  function all(){ try{ return window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){ return null; } }
  function full(row){ var a=all(); return (a && row && row.id!=null && a[row.id]) ? a[row.id] : row; }
  function parentOf(row){
    var a=all(); if(!a || !row || row.cluster_id==null) return null;
    var p=a[row.cluster_id]; return (p && p!==row) ? p : null;
  }
  function kind(row){
    row=full(row);
    if(!row) return 'subbers';
    if(row.cluster_id==null || row.topic_owner_user_id) return 'topic';
    return row.content_type==='header' ? 'headers' : 'subbers';
  }
  function ownKid(r, k){ var c=r && r.child_colors; return (c && typeof c==='object' && /^#[0-9a-f]{3,8}$/i.test(c[k]||'')) ? c[k] : ''; }
  // What the cards of this kind beneath `row` get: the nearest card from `row` upward that set it.
  function childColor(row, k){
    var r=full(row), guard=0;
    while(r && guard++<60){ var v=ownKid(r,k); if(v) return {color:v, from:r}; r=parentOf(r); }
    return {color:'', from:null};
  }
  function effective(row){
    if(!row) return '';
    if(row.color) return row.color;                       // the row in hand (may be newer than the board table)
    var r=full(row);
    if(r && r.color) return r.color;
    var p=parentOf(r);
    return p ? childColor(p, kind(r)).color : '';
  }
  function ownerOfCard(row){
    var r=full(row);
    if(r && r.color) return r;
    var p=parentOf(r); return p ? childColor(p, kind(r)).from : null;
  }

  // ---- the popup ----------------------------------------------------------------------------------------------------------------
  var CHIPS=[ {key:'card',label:'CARD'}, {key:'topic',label:'TOPIC'}, {key:'headers',label:'HEADERS'}, {key:'subbers',label:'SUBBERS'} ];
  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function nameOf(r){ return r ? (r.subject || r.text_content || 'a card').toString().slice(0,40) : ''; }
  function refresh(){ try{ if(typeof renderSeaBoard==='function') renderSeaBoard(true); }catch(e){} }

  async function save(item, field, value){
    var c=sb(); if(!c) throw new Error('no connection');
    var upd={}; upd[field]=value;
    var r=await c.from('ideas').update(upd).eq('id', item.id);
    if(r.error) throw r.error;
    item[field]=value;
    try{ if(typeof _sboardPatchRow==='function') _sboardPatchRow(item.id, upd); }catch(e){}
  }
  // Nov 24 2026 (Larry: "The TOPIC is a card like any other card! That is the card that changes"): the TOPIC choice paints the topic card
  // itself -- the topic the screen is showing when it holds this card, else the highest card below the root.
  function topicCardOf(row){
    var r=full(row), a=all(), cur=null, top=r, guard=0;
    try{ var id=window.T2TShared && T2TShared.currentTopicId; cur=(id && a) ? a[id] : null; }catch(e){}
    var p=r;
    while(p && guard++<60){ if(cur && p.id===cur.id) return cur; var up=parentOf(p); if(!up || up.cluster_id==null) { top=p; break; } p=up; }
    return top;
  }
  async function setValue(item, chip, hex){            // hex '' = RESET
    if(chip==='card') return save(item, 'color', hex||null);
    if(chip==='topic') return save(topicCardOf(item), 'color', hex||null);
    var kids=Object.assign({}, (full(item).child_colors)||{});
    if(hex) kids[chip]=hex; else delete kids[chip];
    return save(item, 'child_colors', Object.keys(kids).length ? kids : null);
  }

  function build(item, box){
    var chip='card';
    // Nov 24 2026 (Larry: the popup's ID BAND color bleeds into the color selector body): a plain, flat ground covers the whole body so the swatches read true.
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));background:#fffdf6;color:#2b2b2b;margin:-6px -8px -7px;padding:6px 8px 7px;border-radius:0 0 9px 9px';
    var chipRow=document.createElement('div'); chipRow.style.cssText='display:flex;gap:4px';
    var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:5px';
    var wheelRow=document.createElement('div');
    var status=document.createElement('div'); status.style.cssText='min-height:13px;opacity:.8';
    wrap.appendChild(chipRow); wrap.appendChild(grid); wrap.appendChild(wheelRow); wrap.appendChild(status);
    box.appendChild(wrap);

    function current(k){ return k==='card' ? effective(item) : k==='topic' ? effective(topicCardOf(item)) : childColor(item,k).color; }
    function dot(color){ return color ? 'background:'+color : 'background:repeating-linear-gradient(45deg,#fff,#fff 3px,#e4dccb 3px,#e4dccb 6px)'; }
    function paint(){
      chipRow.innerHTML='';
      CHIPS.forEach(function(ch){
        var b=document.createElement('button'); b.type='button';
        b.style.cssText='flex:1 1 0;min-width:0;padding:3px 2px 4px;border:1.5px solid '+(ch.key===chip?'#1a3a5c':'#b9ad94')+';border-radius:6px;background:#fffdf6;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit';
        var eb=document.createElement('span'); eb.textContent=ch.label; eb.style.cssText='font-size:.82em;font-weight:700;letter-spacing:.5px';
        var sw=document.createElement('span'); sw.style.cssText='display:block;width:100%;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.25);'+dot(current(ch.key));
        b.appendChild(eb); b.appendChild(sw);
        b.addEventListener('click', function(e){ e.stopPropagation(); chip=ch.key; paint(); });
        chipRow.appendChild(b);
      });
      grid.innerHTML='';
      var pal=(window._sboardColorPalette||[]).slice(0,9);
      var own = chip==='card' ? (full(item).color||item.color||'') : chip==='topic' ? (topicCardOf(item).color||'') : ownKid(full(item), chip);
      var items=pal.concat(['']);                         // RESET sits last, lower right
      items.forEach(function(c){
        var s=document.createElement('button'); s.type='button';
        var sel = c==='' ? !own : (own && own.toLowerCase()===c.toLowerCase());
        s.style.cssText='height:26px;border-radius:5px;cursor:pointer;padding:0;font:inherit;font-size:.78em;font-weight:700;border:1.5px solid '+(sel?'#1a3a5c':'rgba(0,0,0,.3)')+';'+(sel?'box-shadow:0 0 0 2px #1a3a5c;':'')+(c?'background:'+c:'background:#fffdf6');
        if(!c){ s.textContent='RESET'; s.title='Return to the parent’s settings'; s.style.fontSize='.62em'; }
        s.addEventListener('click', async function(e){
          e.stopPropagation(); status.textContent='';
          try{ await setValue(item, chip, c); status.textContent=''; refresh(); paint(); }
          catch(err){ status.textContent='Could not save: '+err.message; }
        });
        grid.appendChild(s);
      });
      // COLOR WHEEL: any color, only where the breaker is on for this card.
      wheelRow.innerHTML='';
      var wheelOn=false; try{ wheelOn=!!(window.FGFeatureBreakers && FGFeatureBreakers.isOn(item.id,'color-wheel')); }catch(e){}
      if(wheelOn){
        var lab=document.createElement('label'); lab.style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer';
        var inp=document.createElement('input'); inp.type='color'; inp.value=/^#[0-9a-f]{6}$/i.test(own)?own:'#cccccc'; inp.style.cssText='width:34px;height:22px;padding:0;border:0;background:none';
        inp.addEventListener('change', async function(){
          status.textContent='';
          try{ await setValue(item, chip, inp.value.toLowerCase()); status.textContent=''; refresh(); paint(); }
          catch(err){ status.textContent='Could not save: '+err.message; }
        });
        lab.appendChild(inp); lab.appendChild(document.createTextNode('COLOR WHEEL'));
        wheelRow.appendChild(lab);
      }
    }
    function go(){ try{ paint(); }catch(e){ status.textContent='Color popup error: '+e.message; } }
    if(window.CardPalette && CardPalette.load) CardPalette.load().then(go, go); else go();
  }

  window.T2TColorLook={ kind:kind, effective:effective, childColor:childColor, ownerOfCard:ownerOfCard, KINDS:KINDS };
  if(window.FGGearHub && FGGearHub.addFeature){
    FGGearHub.addFeature({ key:'color-selector', label:'Color', cluster:'appearance', body:build });
  }
})();
