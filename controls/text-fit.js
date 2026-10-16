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
    // oneLine, Sept 8 2026 -- Larry: "DREAM PHASE should display on one
    // line" (Idea Board's top-level phase/column tiles were wrapping a
    // short two-word name across two lines instead of shrinking it
    // further to fit one, the way Briefing Board's own labels read).
    // Opt-in and off by default -- every other caller keeps today's
    // behavior (accept the largest font that satisfies the per-word and
    // height checks, wrapping across lines if the height budget allows
    // it) exactly as the Aug 18/20 2026 notes above describe. When set,
    // this instead requires the WHOLE phrase (not just each word) to
    // measure within one line's width before accepting a size, so it
    // keeps shrinking past the point a multi-line layout would have
    // stopped -- and if even the floor size can't fit it on one line,
    // returns the floor exactly as before, leaving the caller's own
    // word-break:break-word CSS as the same last resort it always was.
    var oneLine=!!opts.oneLine;
    var words=String(text||'').split(/\s+/).filter(Boolean);
    if(!words.length || !maxWidthPx || maxWidthPx<=0) return base;
    var safeWidthPx=Math.max(1, maxWidthPx-SAFETY_PX);
    var c=_measureCtx(), size=base;
    while(size>min){
      c.font=fontWeight+' '+size+'px '+fontFamily;
      var fits=true;
      if(oneLine){
        fits=c.measureText(words.join(' ')).width<=safeWidthPx;
      } else {
        for(var i=0;i<words.length;i++){
          if(c.measureText(words[i]).width>safeWidthPx){ fits=false; break; }
        }
        if(fits && maxHeightPx){
          var lines=_lineCount(c, words, safeWidthPx);
          if(lines*size*lineHeight>maxHeightPx) fits=false;
        }
      }
      if(fits) return size;
      size-=step;
    }
    return min;
  };

  // Shared "shrink a hard-max-width, single-line box's own text so it
  // almost never needs to truncate" helper -- Sept 15 2026, Larry (Master
  // BB session with Bill): TOPIC was cutting long titles off with "..."
  // instead of shrinking them, on both boards that show a TOPIC box
  // (sc-topic-box on the Idea Board, bb-topic-hit on the Briefing Board --
  // same look/tokens, same bug, same fix). Both already carry
  // white-space:nowrap + text-overflow:ellipsis as what SHOULD be a
  // last-resort safety net for a single word/URL too wide even at the
  // floor size, not the everyday behavior -- this reuses the same
  // FGFitFontSize one-line shrink every board title already uses
  // (_bbFitBoardKindLabel, briefing-board-master-nav.js) so that
  // fallback stops being the normal case.
  //
  // el = the element whose CSS max-width/padding/border/font define the
  // box (the thing text-overflow:ellipsis would otherwise fire on).
  // textEl = the element actually holding the text -- pass the same
  // value as el when there's no separate child span (font-size set on el
  // cascades to a plain text-holding child either way). Resets to the
  // natural CSS size first so this never ratchets smaller across
  // repeated calls -- only ever shrinks, never grows past the stylesheet.
  window.FGFitBoxTextOneLine=function(el, textEl, opts){
    textEl=textEl||el;
    if(!el || !textEl || !window.FGFitFontSize) return;
    opts=opts||{};
    el.style.fontSize='';
    var cs=getComputedStyle(el);
    var maxW=parseFloat(cs.maxWidth);
    if(!maxW) return;
    // box-sizing:border-box on both known callers -- max-width already
    // includes padding+border, so the text's real available width is
    // narrower than maxW by both.
    var padL=parseFloat(cs.paddingLeft)||0, padR=parseFloat(cs.paddingRight)||0;
    var borL=parseFloat(cs.borderLeftWidth)||0, borR=parseFloat(cs.borderRightWidth)||0;
    var avail=maxW-padL-padR-borL-borR;
    if(avail<=0) return;
    var baseSize=parseFloat(cs.fontSize)||opts.base||16;
    var fitted=window.FGFitFontSize(textEl.textContent, avail, {
      base:baseSize, min:opts.min||Math.max(14,Math.round(baseSize*0.4)), step:0.5,
      fontFamily:cs.fontFamily, fontWeight:cs.fontWeight, oneLine:true
    });
    if(fitted<baseSize) el.style.fontSize=fitted+'px';
  };
})();
