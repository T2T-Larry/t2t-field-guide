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
// ONE POPUP (Larry, Nov 24): the BOARD COLOR SELECTOR is the BOARD chip inside the COLOR SELECTOR popup (controls/color-selector.js), which only changes
// the color options (nine bold colors, RESET lower right). TWO WAYS IN: the BOARD chip, or double-clicking the board background (storyboard / session
// screens call openBoardBgPicker, which opens that popup with BOARD already chosen).
//
// NOT BUILT YET (waiting on Larry): press-and-hold on a swatch to change that swatch (where a changed swatch is kept is still open), BRAND colors.
// The COLOR WHEEL (any color) shows only where the 'color-wheel' breaker is on for the card, same as the COLOR SELECTOR popup.
//
// Public surface: window.T2TBoardColor
//   .effective(row) -> the board color for a card (its own, else its nearest ancestor's, else '')
//   .forScreen()    -> the board color for the topic the screen is showing ('' = the default look)
//   .open(item, opts) -> the COLOR SELECTOR popup with BOARD chosen 
//   .save(item, hex)  -> sets or resets (hex '') a card's board color
(function(){
  // Nine bold board colors. The first three are the out-of-the-box board looks (IDEA blue sky, PLAN light brown, STORY yellow).
  var BOARD_COLORS=['#5b9bd5','#c9a876','#e8c547','#a8b89a','#0f6e56','#d97b5f','#c98a9c','#6b3a5e','#1a3a5c'];

  function all(){ try{ return window._sboardAllRowsById || (typeof _sboardAllRowsById!=='undefined' ? _sboardAllRowsById : null); }catch(e){ return null; } }
  function full(row){ var a=all(); return (a && row && row.id!=null && a[row.id]) ? a[row.id] : row; }
  function parentOf(row){
    var a=all(); if(!a || !row || row.cluster_id==null) return null;
    var p=a[row.cluster_id]; return (p && p!==row) ? p : null;
  }
  function off(row){ var F=window.FGFeatureBreakers; return !!(F && F.isOffRow && F.isOffRow(row,'color')); }   // Color off = the parent's board color
  function own(row){ if(off(row)) return ''; var v=row && row.board_bg_color; return (typeof v==='string' && /^#[0-9a-f]{3,8}$/i.test(v)) ? v : ''; }

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

  // Nov 24 2026 (Larry: "this is a keeper! SIMPLE!"): there is ONE popup, the COLOR SELECTOR (controls/color-selector.js). BOARD is a chip in it that
  // changes the color options. This opens that popup with BOARD already chosen. A click outside any Gear popup closes it (controls/gear-hub.js, SOP).
  function open(item, opts){
    opts=opts||{};
    if(!item || !window.FGGearHub || !FGGearHub.showPopup || !window.T2TColorLook || !T2TColorLook.build) return;
    FGGearHub.showPopup(3, opts.from||'Board', 'Color', function(body){ T2TColorLook.build(item, body, 'board'); }, opts.anchor||null);
  }

  window.T2TBoardColor={ effective:effective, forScreen:forScreen, topicRow:topicRow, open:open, COLORS:BOARD_COLORS, save:save };
})();
