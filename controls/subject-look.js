// subject-look.js -- Oct 31 2026 (Larry: "MASTER HEADERS ... do not have a consistent look ... What if we have an option to bold or not bold a SUBJECT?").
// ONE place that decides how a SUBJECT is drawn, so every card face, header face and back reads the same way.
//   Three looks: BOLD, CAPS and ITALIC. (Nov 4 2026, Larry: bold is reserved for the MAIN source of a subject, and a LINK to it is never bold -- it is
//   italic. ITALIC has no screen toggle: it is only ever a card's own choice, subject_italic = true on its ideas row, and plain when missing.)
//   Screen level: a traveler-side viewing preference (localStorage, like the Subject-only view), shared by every board.
//   Card level: a card can override the screen. The card's own value is subject_bold / subject_caps on its ideas row
//   (true = on, false = off, null or missing = follow the screen). Until those two columns exist every card follows the screen.
// Defaults keep today's look exactly: BOLD on, CAPS off -- nothing changes on any board until a toggle is flipped.
// Public surface: window.T2TSubjectLook
//   .screenBold() .screenCaps()            current screen settings
//   .setScreenBold(on) .setScreenCaps(on)  change them (stored on this device)
//   .isBold(row) .isCaps(row)              the look this card actually gets (card override first, then the screen; headers: always bold, CAPS only by their own choice)
//   .isItalic(row)                         true only when the card itself says so (subject_italic), band or not
//   .fontStyle(row) -> 'italic' | 'normal' for style.fontStyle
//   .chainColor(row)                       the one color a LINK's whole search chain is drawn in ('' for a HOME)
//   .css(row)                              all three looks as one inline style string (weight, transform, style) -- use this instead of building your own
//   .weight(row)  -> '700' | '400'         for style.fontWeight
//   .transform(row) -> 'uppercase' | 'none' for style.textTransform
//   .measure(text,row)                     the text as it will look, for font-fit measuring (caps are wider)
//   .paint(el,row)                         sets weight + transform + italic on an element
//   .flip(row,key)  key = 'bold' | 'caps' | 'italic'  the card-level toggle: the new override to save ({subject_bold:..}, {subject_caps:..} or {subject_italic:..}).
//                                          Flipping back to what the screen already says clears the override (null), so "follow the screen" is never lost.
(function(){
  var KEY_BOLD='t2t-subject-bold', KEY_CAPS='t2t-subject-caps';
  var LINK_CHAIN_COLOR='#7b6fd6';   // mid violet: reads on both the light and the dark menus
  function read(key, dflt){ try{ var v=localStorage.getItem(key); return v===null ? dflt : v==='1'; }catch(e){ return dflt; } }
  function write(key, on){ try{ localStorage.setItem(key, on?'1':'0'); }catch(e){} }
  var _bold=read(KEY_BOLD, true);
  var _caps=read(KEY_CAPS, false);

  function cardValue(row, field){
    if(!row) return null;
    var v=row[field];
    return (v===true || v===false) ? v : null;
  }
  // Oct 31 2026 (Larry: "what if we only change the cards below the header band? ... MASTER HEADERS are always bold"):
  // the screen's Bold and CAPS toggles change the cards under the top header band only. The band itself is always bold and ignores the screen
  // toggles; its CAPS comes only from its own card choice. The band is decided by WHERE a card is drawn, not by what kind of card it is
  // (the cards under the band are headers too), so the face painter marks a band row with __band:true -- see bandLook().
  function isHeader(row){ return !!(row && row.__band); }
  function isBold(row){ if(isHeader(row)) return true; var c=cardValue(row,'subject_bold'); return c===null ? _bold : c; }
  function isCaps(row){ var c=cardValue(row,'subject_caps'); if(c!==null) return c; return isHeader(row) ? false : _caps; }
  // Nov 4 2026: a LINK subject is italic. Only the card's own choice counts (no screen setting), and the top band honors it like it honors CAPS.
  function isItalic(row){ return cardValue(row,'subject_italic')===true; }

  window.T2TSubjectLook={
    screenBold:function(){ return _bold; },
    screenCaps:function(){ return _caps; },
    setScreenBold:function(on){ _bold=!!on; write(KEY_BOLD,_bold); },
    setScreenCaps:function(on){ _caps=!!on; write(KEY_CAPS,_caps); },
    isBold:isBold,
    isCaps:isCaps,
    isItalic:isItalic,
    weight:function(row){ return isBold(row) ? '700' : '400'; },
    transform:function(row){ return isCaps(row) ? 'uppercase' : 'none'; },
    fontStyle:function(row){ return isItalic(row) ? 'italic' : 'normal'; },
    // Nov 4 2026 (Larry: "make all link chains the same color from top to bottom. That will make the home really stand out"): a search result that is a LINK
    // draws its whole chain, path and name, in this one color; a HOME keeps the normal look. '' = no override. Change the color here and every search follows.
    chainColor:function(row){ return isItalic(row) ? LINK_CHAIN_COLOR : ''; },
    css:function(row){ return 'font-weight:'+this.weight(row)+';text-transform:'+this.transform(row)+';font-style:'+this.fontStyle(row)+';'; },
    measure:function(text,row){ text=String(text==null?'':text); return isCaps(row) ? text.toUpperCase() : text; },
    paint:function(el,row){ if(!el) return; el.style.fontWeight=this.weight(row); el.style.textTransform=this.transform(row); el.style.fontStyle=this.fontStyle(row); },
    // The row to hand the look functions when a card is drawn as part of the top band.
    bandLook:function(row){ return { __band:true, subject_caps: row ? row.subject_caps : null, subject_bold: row ? row.subject_bold : null, subject_italic: row ? row.subject_italic : null }; },
    flip:function(row,key){
      var field=(key==='caps') ? 'subject_caps' : (key==='italic') ? 'subject_italic' : 'subject_bold';
      var now=(key==='caps') ? isCaps(row) : (key==='italic') ? isItalic(row) : isBold(row);
      var screen=(key==='caps') ? _caps : (key==='italic') ? false : _bold;
      var next=!now, out={};
      if(isHeader(row)) screen=(key==='caps' || key==='italic') ? false : true;   // a header's baseline is not the screen's
      out[field]=(next===screen) ? null : next;
      return out;
    }
  };
})();
