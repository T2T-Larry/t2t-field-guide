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
  // What the cards of this kind beneath `row` get: the nearest card from `row` upward that set it -- by kind (child_colors) or with a color of its own.
  function childColor(row, k){
    var r=full(row), guard=0;
    while(r && guard++<60){ var v=ownKid(r,k); if(v) return {color:v, from:r}; if(r.color) return {color:r.color, from:r}; r=parentOf(r); }
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
  // Nov 24 2026 (Larry: "What if the board color selection is on the SAME popup as the COLOR selector. It just changes the color options!"): BOARD is a chip here;
  // picking it swaps the swatches to the board colors. Card colors are locked to the card, so there is no CARD choice. Board data: controls/board-color-selector.js.
  var CHIPS=[ {key:'board',label:'BOARD'}, {key:'topic',label:'TOPIC'}, {key:'headers',label:'HEADERS'}, {key:'subbers',label:'SUBBERS'} ];
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
  // Nov 24 2026 (Larry: "The TOPIC is a card like any other card!", then "Should change that card and children, not parent"): every card is a
  // potential TOPIC, so the TOPIC choice paints the card the popup was opened from, and its children pick it up through the rule above.
  // It never reaches up to the topic the screen is showing.
  function topicCardOf(row){ return full(row); }
  async function setValue(item, chip, hex){            // hex '' = RESET
    if(chip==='board') return T2TBoardColor.save(item, hex);
    if(chip==='topic') return save(topicCardOf(item), 'color', hex||null);
    var kids=Object.assign({}, (full(item).child_colors)||{});
    if(hex) kids[chip]=hex; else delete kids[chip];
    return save(item, 'child_colors', Object.keys(kids).length ? kids : null);
  }

  // ---- NAMES for the colors (hover text). Looked up by color code, so a name follows the color even if a traveler moves or changes swatches.
  var COLOR_NAMES={
    '#d6eaf8':'Sky blue', '#d9f2e6':'Mint', '#fdf3d0':'Cream', '#f8d9e3':'Pink', '#e6d9f2':'Lavender', '#fbe3d0':'Peach', '#d0f2ec':'Teal', '#f0ebe0':'Sand', '#ffffff':'White',
    '#5b9bd5':'Blue sky', '#c9a876':'Light brown', '#e8c547':'Yellow', '#a8b89a':'Sage', '#0f6e56':'Deep teal', '#d97b5f':'Coral', '#c98a9c':'Rose', '#6b3a5e':'Plum', '#1a3a5c':'Navy'
  };
  function nameOf(hex){ return COLOR_NAMES[String(hex||'').toLowerCase()] || ''; }

  // ---- SHADE: three steps darker than the original, found by lowering the color's lightness (same hue). Nothing extra is stored: a shade is just a color,
  // and levelOf() recognizes it as "level n of this swatch" by recomputing the steps. Used only where the 'color-shade' breaker is on.
  var SHADE_LEVELS=3, SHADE_STEP=12;                                   // each level is 12 points of lightness darker
  function hexToHsl(h){
    var m=/^#([0-9a-f]{6})$/i.exec(h||''); if(!m) return null;
    var n=parseInt(m[1],16), r=(n>>16&255)/255, g=(n>>8&255)/255, b=(n&255)/255;
    var mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, hh=0, s=0, d=mx-mn;
    if(d){ s=l>.5 ? d/(2-mx-mn) : d/(mx+mn); hh = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; hh/=6; }
    return [hh,s,l];
  }
  function hslToHex(hsl){
    var h=hsl[0], s=hsl[1], l=hsl[2];
    function f(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; return t<1/6 ? p+(q-p)*6*t : t<1/2 ? q : t<2/3 ? p+(q-p)*(2/3-t)*6 : p; }
    var r,g,b; if(!s){ r=g=b=l; } else { var q=l<.5 ? l*(1+s) : l+s-l*s, p=2*l-q; r=f(p,q,h+1/3); g=f(p,q,h); b=f(p,q,h-1/3); }
    return '#'+[r,g,b].map(function(x){ return ('0'+Math.round(x*255).toString(16)).slice(-2); }).join('');
  }
  function shadeOf(hex, level){                                        // level 0 = the original
    if(!level) return hex.toLowerCase();
    var a=hexToHsl(hex); if(!a) return hex;
    a[2]=Math.max(.08, a[2]-SHADE_STEP/100*level);
    return hslToHex(a);
  }
  function levelOf(own, base){                                         // -1 = `own` is not a level of `base`
    var o=(own||'').toLowerCase(); if(!o) return -1;
    for(var n=0;n<=SHADE_LEVELS;n++){ if(shadeOf(base,n)===o) return n; }
    return -1;
  }

  function build(item, box, startChip){
    var chip=startChip||'topic';       // BOARD when opened by double-clicking the board background; TOPIC = the card it was opened from, plus its children
    // Nov 24 2026 (Larry: the popup's ID BAND color bleeds into the color selector body): a plain, flat ground covers the whole body so the swatches read true.
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));background:#fffdf6;color:#2b2b2b;margin:-6px -8px -7px;padding:6px 8px 8px;border-radius:0 0 9px 9px';
    var chipRow=document.createElement('div'); chipRow.style.cssText='display:flex;gap:4px';
    var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:5px';
    var wheelRow=document.createElement('div');
    var status=document.createElement('div'); status.style.cssText='opacity:.8;display:none';
    // Nov 24 2026 (Larry: shorten the popup so the bottom border matches the sides): the message line and the wheel row take no room until they have something to show.
    function say(t){ status.textContent=t||''; status.style.display=t?'':'none'; }
    wrap.appendChild(chipRow); wrap.appendChild(grid); wrap.appendChild(wheelRow); wrap.appendChild(status);
    box.appendChild(wrap);

    function current(k){ return k==='board' ? (window.T2TBoardColor ? T2TBoardColor.effective(item) : '') : k==='topic' ? effective(topicCardOf(item)) : childColor(item,k).color; }
    function dot(color){ return color ? 'background:'+color : 'background:repeating-linear-gradient(45deg,#fff,#fff 3px,#e4dccb 3px,#e4dccb 6px)'; }
    function paint(){
      chipRow.innerHTML='';
      CHIPS.forEach(function(ch){
        var b=document.createElement('button'); b.type='button';
        b.style.cssText='flex:1 1 0;min-width:0;padding:3px 2px 4px;border:1.5px solid '+(ch.key===chip?'#1a3a5c':'#b9ad94')+';border-radius:6px;background:#fffdf6;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit';
        var eb=document.createElement('span'); eb.textContent=ch.label; eb.style.cssText='font-size:.82em;font-weight:700;letter-spacing:.5px';
        var sw=document.createElement('span'); sw.style.cssText='display:block;width:100%;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.25);'+dot(current(ch.key));
        b.appendChild(eb); b.appendChild(sw);
        b.addEventListener('click', function(e){
          e.stopPropagation();
          chip=ch.key; paint();
        });
        chipRow.appendChild(b);
      });
      grid.innerHTML='';
      var pal= chip==='board' ? (window.T2TBoardColor ? T2TBoardColor.COLORS : []) : (window._sboardColorPalette||[]).slice(0,9);
      var own = chip==='board' ? ((full(item).board_bg_color)||'') : chip==='topic' ? (topicCardOf(item).color||'') : ownKid(full(item), chip);
      var items=pal.concat(['']);                         // RESET sits last, lower right
      // SHADE (a feature, 'color-shade' breaker): click the chosen color again and it steps darker 1, 2, 3, then the next click is the original again.
      var shadeOn=false; try{ shadeOn = chip!=='board' && !!(window.FGFeatureBreakers && FGFeatureBreakers.isOn(item.id,'color-shade')); }catch(e){}
      items.forEach(function(c){
        var s=document.createElement('button'); s.type='button';
        var lv = (shadeOn && c) ? levelOf(own, c) : -1;                    // -1 = this swatch is not the chosen color; 0 = original; 1-3 = shade
        var sel = c==='' ? !own : (lv>=0 || (own && own.toLowerCase()===c.toLowerCase()));
        s.style.cssText='height:26px;border-radius:5px;cursor:pointer;padding:0;font:inherit;font-size:.78em;font-weight:700;border:1.5px solid '+(sel?'#1a3a5c':'rgba(0,0,0,.3)')+';'+(sel?'box-shadow:0 0 0 2px #1a3a5c;':'')+(c?'background:'+(lv>0?shadeOf(c,lv):c):'background:#fffdf6');
        var nm=nameOf(c);                                                  // hover names the color (Larry, Nov 24 2026: "hover should name the color")
        if(c) s.title=nm||c;
        if(shadeOn && c && lv>=0 && lv<SHADE_LEVELS) s.title=(nm||c)+' -- click again for shade '+(lv+1);
        if(lv>0){ s.textContent=String(lv); s.title=(nm||c)+', shade '+lv+(lv>=SHADE_LEVELS?' -- click again for the original':' -- click again for shade '+(lv+1)); }
        if(!c){ s.textContent='RESET'; s.title='Return to the parent’s settings'; s.style.fontSize='.62em'; }
        s.addEventListener('click', async function(e){
          e.stopPropagation(); say('');
          var next=c;
          if(shadeOn && c && lv>=0) next = lv>=SHADE_LEVELS ? c : shadeOf(c, lv+1);   // the chosen color clicked again
          try{ await setValue(item, chip, next); say(''); refresh(); paint(); }
          catch(err){ say('Could not save: '+err.message); }
        });
        grid.appendChild(s);
      });
      // COLOR WHEEL: any color, only where the breaker is on for this card.
      wheelRow.innerHTML=''; wheelRow.style.display='none';
      var wheelOn=false; try{ wheelOn=!!(window.FGFeatureBreakers && FGFeatureBreakers.isOn(item.id,'color-wheel')); }catch(e){}
      if(wheelOn){
        wheelRow.style.display='';
        var lab=document.createElement('label'); lab.style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer';
        var inp=document.createElement('input'); inp.type='color'; inp.value=/^#[0-9a-f]{6}$/i.test(own)?own:'#cccccc'; inp.style.cssText='width:34px;height:22px;padding:0;border:0;background:none';
        inp.addEventListener('change', async function(){
          say('');
          try{ await setValue(item, chip, inp.value.toLowerCase()); say(''); refresh(); paint(); }
          catch(err){ say('Could not save: '+err.message); }
        });
        lab.appendChild(inp); lab.appendChild(document.createTextNode('COLOR WHEEL'));
        wheelRow.appendChild(lab);
      }
    }
    function go(){ try{ paint(); }catch(e){ say('Color popup error: '+e.message); } }
    if(window.CardPalette && CardPalette.load) CardPalette.load().then(go, go); else go();
  }

  window.T2TColorLook={ build:build, kind:kind, effective:effective, childColor:childColor, ownerOfCard:ownerOfCard, KINDS:KINDS };
  if(window.FGGearHub && FGGearHub.addFeature){
    FGGearHub.addFeature({ key:'color-selector', label:'Color', cluster:'color', body:build });
  }
})();
