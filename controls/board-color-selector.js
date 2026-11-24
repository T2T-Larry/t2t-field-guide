// board-color-selector.js -- Nov 24 2026 (Larry: "Transform the Storyboard background popup into the BOARD COLOR SELECTOR popup").
// ONE place that decides what color a board is painted, and the popup that changes it. It replaces the old Storyboard background picker.
//
// THE RULE (Larry, Nov 23-24): every card is a potential TOPIC, so every card has a Board Color. A card with no board color of its own
// uses the board color of its nearest ancestor (MASTER holds the defaults). A card's choice is for itself and every card beneath it
// unless one of them has made its own choice. RESET hands the card back to its parent's board color. Nothing is written to the children,
// so a child that never chose follows its parent automatically and a parent never overrides a child.
//
// DATA: ideas.board_bg_color (hex) on any card. NULL = follow the card above. Where nobody has chosen, the board's own default look applies
// (idea-storyboard-navigation.js _sboardDefaultBoardBg).
//
// TWO WAYS IN (Larry): double-click the board background (storyboard / session screens call openBoardBgPicker, which now lands here), or click
// BOARD in the COLOR SELECTOR popup (controls/color-selector.js). The popup is the same size and shape as the COLOR SELECTOR popup: it is built
// by the same Gear popup shell (FGGearHub.showPopup), with the same 5-column grid, nine colors and RESET in the lower right, and no message lines.
//
// NOT BUILT YET (waiting on Larry): press-and-hold on a swatch to change that swatch (where a changed swatch is kept is still open), BRAND colors.
// The COLOR WHEEL (any color) shows only where the 'color-wheel' breaker is on for the card, same as the COLOR SELECTOR popup.
//
// Public surface: window.T2TBoardColor
//   .effective(row) -> the board color for a card (its own, else its nearest ancestor's, else '')
//   .forScreen()    -> the board color for the topic the screen is showing ('' = the default look)
//   .open(item, opts) -> the BOARD COLOR SELECTOR popup for a card ({from:'Color'} names where it came from)
(function(){
  // Nine bold board colors. The first three are the out-of-the-box board looks (IDEA blue sky, PLAN light brown, STORY yellow).
  var BOARD_COLORS=['#5b9bd5','#c9a876','#e8c547','#a8b89a','#0f6e56','#d97b5f','#c98a9c','#6b3a5e','#1a3a5c'];

  function all(){ try{ return window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){ return null; } }
  function full(row){ var a=all(); return (a && row && row.id!=null && a[row.id]) ? a[row.id] : row; }
  function parentOf(row){
    var a=all(); if(!a || !row || row.cluster_id==null) return null;
    var p=a[row.cluster_id]; return (p && p!==row) ? p : null;
  }
  function own(row){ var v=row && row.board_bg_color; return (typeof v==='string' && /^#[0-9a-f]{3,8}$/i.test(v)) ? v : ''; }

  function effective(row){
    var r=full(row), guard=0;
    while(r && guard++<60){ var v=own(r); if(v) return v; r=parentOf(r); }
    return '';
  }
  // The topic the screen is showing; with none chosen the screen is showing the one root it has loaded (MASTER).
  function topicRow(){
    var a=all(); if(!a) return null;
    try{ var id=window.T2TShared && T2TShared.currentTopicId; if(id && a[id]) return a[id]; }catch(e){}
    var roots=Object.keys(a).map(function(k){ return a[k]; }).filter(function(r){ return r && r.cluster_id==null && r.content_type==='header'; });
    return roots.length===1 ? roots[0] : null;
  }
  function forScreen(){ var t=topicRow(); return t ? effective(t) : ''; }

  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  async function save(item, hex){
    var c=sb(); if(!c) throw new Error('no connection');
    var v=hex||null;
    var r=await c.from('ideas').update({board_bg_color:v}).eq('id', item.id);
    if(r.error) throw r.error;
    item.board_bg_color=v;
    var a=all(); if(a && a[item.id]) a[item.id].board_bg_color=v;
    try{ if(typeof _sboardPatchRow==='function') _sboardPatchRow(item.id, {board_bg_color:v}); }catch(e){}
    repaint();
  }
  function repaint(){
    try{ if(window.T2TStoryboard && T2TStoryboard.applyBoardBg) T2TStoryboard.applyBoardBg(); }catch(e){}
  }
  function dot(color){ return color ? 'background:'+color : 'background:repeating-linear-gradient(45deg,#fff,#fff 3px,#e4dccb 3px,#e4dccb 6px)'; }

  // The popup body: the same ground, spacing, 5-column grid and swatch size as controls/color-selector.js, so the two read as one family.
  function build(item, box){
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));background:#fffdf6;color:#2b2b2b;margin:-6px -8px -7px;padding:6px 8px 7px;border-radius:0 0 9px 9px';
    var chipRow=document.createElement('div'); chipRow.style.cssText='display:flex;gap:4px';
    var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:5px';
    var wheelRow=document.createElement('div');
    var status=document.createElement('div'); status.style.cssText='min-height:13px;opacity:.8';
    wrap.appendChild(chipRow); wrap.appendChild(grid); wrap.appendChild(wheelRow); wrap.appendChild(status);
    box.appendChild(wrap);

    async function choose(hex){
      status.textContent='';
      try{ await save(item, hex); paint(); }
      catch(err){ status.textContent='Could not save: '+err.message; }
    }
    function paint(){
      // One wide chip in the same place and size as the COLOR SELECTOR chips: it shows the color the board has now.
      chipRow.innerHTML='';
      var b=document.createElement('div');
      b.style.cssText='flex:1 1 0;min-width:0;padding:3px 2px 4px;border:1.5px solid #1a3a5c;border-radius:6px;background:#fffdf6;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit';
      var eb=document.createElement('span'); eb.textContent='BOARD'; eb.style.cssText='font-size:.82em;font-weight:700;letter-spacing:.5px';
      var sw=document.createElement('span'); sw.style.cssText='display:block;width:100%;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.25);'+dot(effective(item));
      b.appendChild(eb); b.appendChild(sw); chipRow.appendChild(b);

      grid.innerHTML='';
      var mine=own(full(item));
      BOARD_COLORS.concat(['']).forEach(function(c){            // RESET sits last, lower right
        var s=document.createElement('button'); s.type='button';
        var sel = c==='' ? !mine : (mine && mine.toLowerCase()===c.toLowerCase());
        s.style.cssText='height:26px;border-radius:5px;cursor:pointer;padding:0;font:inherit;font-size:.78em;font-weight:700;border:1.5px solid '+(sel?'#1a3a5c':'rgba(0,0,0,.3)')+';'+(sel?'box-shadow:0 0 0 2px #1a3a5c;':'')+(c?'background:'+c:'background:#fffdf6');
        if(!c){ s.textContent='RESET'; s.title='Return to the parent’s board color'; s.style.fontSize='.62em'; }
        s.addEventListener('click', function(e){ e.stopPropagation(); choose(c); });
        grid.appendChild(s);
      });

      wheelRow.innerHTML='';
      var wheelOn=false; try{ wheelOn=!!(window.FGFeatureBreakers && FGFeatureBreakers.isOn(item.id,'color-wheel')); }catch(e){}
      if(wheelOn){
        var lab=document.createElement('label'); lab.style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer';
        var inp=document.createElement('input'); inp.type='color'; inp.value=/^#[0-9a-f]{6}$/i.test(mine)?mine:'#cccccc'; inp.style.cssText='width:34px;height:22px;padding:0;border:0;background:none';
        inp.addEventListener('change', function(){ choose(inp.value.toLowerCase()); });
        lab.appendChild(inp); lab.appendChild(document.createTextNode('COLOR WHEEL'));
        wheelRow.appendChild(lab);
      }
    }
    try{ paint(); }catch(e){ status.textContent='Board color popup error: '+e.message; }
  }

  function open(item, opts){
    opts=opts||{};
    if(!item || !window.FGGearHub || !FGGearHub.showPopup) return;
    FGGearHub.showPopup(3, opts.from||'Board', 'Board color', function(body){ build(item, body); }, opts.anchor||null);
  }

  window.T2TBoardColor={ effective:effective, forScreen:forScreen, topicRow:topicRow, open:open, COLORS:BOARD_COLORS };
})();
