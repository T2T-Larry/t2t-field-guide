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
//
// Aug 20 2026, two follow-up bugs Larry found live ("Appreciation"/
// "Performance" still splitting; "Why Leave Up the Done Cards?" running
// past the bottom of its card):
//
// 1. Every caller was doing Math.round(FGFitFontSize(...)) before using
//    the result. FGFitFontSize itself always finds a size where the
//    widest word genuinely fits -- but rounding THAT size UP (JS rounds
//    .5 up) can push the actual rendered width back past the box's edge
//    by a fraction of a pixel, which is enough for the browser to break
//    the word anyway. There's no reason to round at all -- CSS font-size
//    accepts fractional px fine -- so callers now use the returned size
//    as-is. A small built-in safety margin (SAFETY_PX below) also guards
//    against the canvas measurement and the browser's real text layout
//    never being pixel-for-pixel identical.
// 2. FGFitFontSize only ever checked that no single WORD was wider than
//    the box -- it never checked whether the whole shrunk paragraph,
//    once wrapped, was short enough to fit the box's HEIGHT. A short-
//    word sentence that's simply long (no single word too wide) sailed
//    through unshrunk and ran past the bottom of a fixed-height card.
//    Callers that know their box's height can now pass opts.maxHeightPx
//    (plus opts.lineHeight, matching whatever line-height the element
//    actually renders at) and get a size that satisfies BOTH the
//    per-word width check and a real greedy line-wrap height check --
//    still shrinking only as far as needed, still stopping at the same
//    floor and handing off to word-break:break-word as the last resort
//    if even the floor can't make both fit.
(function(){
  var _ctx=null;
  function _measureCtx(){
    if(!_ctx){ _ctx=document.createElement('canvas').getContext('2d'); }
    return _ctx;
  }

  // Tiny cushion subtracted from maxWidthPx before any fit check -- canvas
  // measureText and the browser's actual text layout are close but not
  // always bit-for-bit identical (kerning/subpixel rounding), and this is
  // cheap insurance against a fit that's "correct" on paper but breaks by
  // a fraction of a pixel once it's real DOM text in a real box.
  var SAFETY_PX=1;

  // Greedy word-wrap simulation at a given font size: how many lines does
  // this text actually take at this width? Same greedy-fill algorithm
  // every browser's own line-breaking uses (fill a line with words until
  // the next word wouldn't fit, then start a new line) -- not exact for
  // every font's justification quirks, but plenty close enough to know
  // whether a paragraph is going to be 2 lines or 6.
  function _lineCount(c, words, maxWidthPx){
    if(!words.length) return 0;
    var spaceWidth=c.measureText(' ').width;
    var lines=1, lineWidth=0;
    for(var i=0;i<words.length;i++){
      var w=c.measureText(words[i]).width;
      var next=lineWidth ? lineWidth+spaceWidth+w : w;
      if(next>maxWidthPx && lineWidth>0){ lines++; lineWidth=w; }
      else { lineWidth=next; }
    }
    return lines;
  }

  window.FGFitFontSize=function(text, maxWidthPx, opts){
    opts=opts||{};
    var base=opts.base||16;
    var min=(opts.min!=null)?opts.min:Math.max(8, Math.round(base*0.55));
    var step=opts.step||0.5;
    var fontFamily=opts.fontFamily||'serif';
    var fontWeight=opts.fontWeight||'400';
    var maxHeightPx=opts.maxHeightPx||null;
    var lineHeight=opts.lineHeight||1.2;
    var words=String(text||'').split(/\s+/).filter(Boolean);
    if(!words.length || !maxWidthPx || maxWidthPx<=0) return base;
    var safeWidthPx=Math.max(1, maxWidthPx-SAFETY_PX);
    var c=_measureCtx(), size=base;
    while(size>min){
      c.font=fontWeight+' '+size+'px '+fontFamily;
      var fits=true;
      for(var i=0;i<words.length;i++){
        if(c.measureText(words[i]).width>safeWidthPx){ fits=false; break; }
      }
      if(fits && maxHeightPx){
        var lines=_lineCount(c, words, safeWidthPx);
        if(lines*size*lineHeight>maxHeightPx) fits=false;
      }
      if(fits) return size;
      size-=step;
    }
    return min;
  };
})();
