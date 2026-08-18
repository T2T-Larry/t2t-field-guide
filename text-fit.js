// Shared "shrink to fit" helper -- Aug 18 2026, Larry: "can we shrink text
// size when necessary to prevent splitting words on all boards?"
//
// Loaded once, right after header-data.js, on every page that has board
// cards/tiles (index, believe, dare, dream, journey). Any board's render
// code can call window.FGFitFontSize(text, maxWidthPx, opts) to get back
// the largest font size (down to a floor) at which no single WORD in the
// text is wider than the space available -- so a card shrinks its text
// first, instead of a long word getting cut in half. Measured with a
// canvas (real per-word pixel width for the given font), not a guess based
// on character count, so it actually looks at whether a specific word will
// fit, not just how long the whole string is.
//
// If even the smallest allowed size still can't fit the longest word (a
// single very long word, or a URL with no spaces), this returns the floor
// size and lets the caller's own word-break:break-word CSS take over as a
// last resort -- Larry's call, Aug 18 2026: shrink first, only split a
// word if there's truly no room left even at the smallest readable size.
(function(){
  var _ctx=null;
  function _measureCtx(){
    if(!_ctx){ _ctx=document.createElement('canvas').getContext('2d'); }
    return _ctx;
  }

  window.FGFitFontSize=function(text, maxWidthPx, opts){
    opts=opts||{};
    var base=opts.base||16;
    var min=(opts.min!=null)?opts.min:Math.max(8, Math.round(base*0.55));
    var step=opts.step||0.5;
    var fontFamily=opts.fontFamily||'serif';
    var fontWeight=opts.fontWeight||'400';
    var words=String(text||'').split(/\s+/).filter(Boolean);
    if(!words.length || !maxWidthPx || maxWidthPx<=0) return base;
    var c=_measureCtx(), size=base;
    while(size>min){
      c.font=fontWeight+' '+size+'px '+fontFamily;
      var fits=true;
      for(var i=0;i<words.length;i++){
        if(c.measureText(words[i]).width>maxWidthPx){ fits=false; break; }
      }
      if(fits) return size;
      size-=step;
    }
    return min;
  };
})();
