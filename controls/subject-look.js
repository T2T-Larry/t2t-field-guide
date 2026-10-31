// subject-look.js -- Oct 31 2026 (Larry: "MASTER HEADERS ... do not have a consistent look ... What if we have an option to bold or not bold a SUBJECT?").
// ONE place that decides how a SUBJECT is drawn, so every card face, header face and back reads the same way.
//   Two looks: BOLD and CAPS.
//   Screen level: a traveler-side viewing preference (localStorage, like the Subject-only view), shared by every board.
//   Card level: a card can override the screen. The card's own value is subject_bold / subject_caps on its ideas row
//   (true = on, false = off, null or missing = follow the screen). Until those two columns exist every card follows the screen.
// Defaults keep today's look exactly: BOLD on, CAPS off -- nothing changes on any board until a toggle is flipped.
// Public surface: window.T2TSubjectLook
//   .screenBold() .screenCaps()            current screen settings
//   .setScreenBold(on) .setScreenCaps(on)  change them (stored on this device)
//   .isBold(row) .isCaps(row)              the look this card actually gets (card override first, then the screen; headers: always bold, CAPS only by their own choice)
//   .weight(row)  -> '700' | '400'         for style.fontWeight
//   .transform(row) -> 'uppercase' | 'none' for style.textTransform
//   .measure(text,row)                     the text as it will look, for font-fit measuring (caps are wider)
//   .paint(el,row)                         sets weight + transform on an element
//   .flip(row,key)  key = 'bold' | 'caps'  the card-level toggle: the new override to save ({subject_bold:..} or {subject_caps:..}).
//                                          Flipping back to what the screen already says clears the override (null), so "follow the screen" is never lost.
(function(){
  var KEY_BOLD='t2t-subject-bold', KEY_CAPS='t2t-subject-caps';
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
  // the screen's Bold and CAPS toggles change the cards under the headers only. A header is always bold and ignores the screen toggles;
  // its CAPS comes only from its own card choice.
  function isHeader(row){ return !!(row && row.content_type==='header'); }
  function isBold(row){ if(isHeader(row)) return true; var c=cardValue(row,'subject_bold'); return c===null ? _bold : c; }
  function isCaps(row){ var c=cardValue(row,'subject_caps'); if(c!==null) return c; return isHeader(row) ? false : _caps; }

  window.T2TSubjectLook={
    screenBold:function(){ return _bold; },
    screenCaps:function(){ return _caps; },
    setScreenBold:function(on){ _bold=!!on; write(KEY_BOLD,_bold); },
    setScreenCaps:function(on){ _caps=!!on; write(KEY_CAPS,_caps); },
    isBold:isBold,
    isCaps:isCaps,
    weight:function(row){ return isBold(row) ? '700' : '400'; },
    transform:function(row){ return isCaps(row) ? 'uppercase' : 'none'; },
    measure:function(text,row){ text=String(text==null?'':text); return isCaps(row) ? text.toUpperCase() : text; },
    paint:function(el,row){ if(!el) return; el.style.fontWeight=this.weight(row); el.style.textTransform=this.transform(row); },
    flip:function(row,key){
      var field=(key==='caps') ? 'subject_caps' : 'subject_bold';
      var now=(key==='caps') ? isCaps(row) : isBold(row);
      var screen=(key==='caps') ? _caps : _bold;
      var next=!now, out={};
      if(isHeader(row)) screen=(key==='caps') ? false : true;   // a header's baseline is not the screen's
      out[field]=(next===screen) ? null : next;
      return out;
    }
  };
})();
