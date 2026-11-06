/* auto-grow-field.js -- T2T Field Guide - SHARED "GROW, THEN SCROLL" TEXT FIELD
   Nov 6 2026 (Larry): "What if the task field on the TASK card started at 2 lines but expanded to 4 lines before adding a scroll
   in order to minimize space on card back?"  Proposal KEPT, build it.

   One shared behavior (one tree, one code): any textarea can use it, the TASK field is the first.
     FGAutoGrow.attach(textarea, {minLines:2, maxLines:4})   once, when the field is built
     FGAutoGrow.refresh(textarea)                            after the code sets its value (a card opening)
   - Starts at minLines tall, grows a line at a time as text is added, stops at maxLines, then scrolls inside itself.
   - A saved value longer than maxLines opens at maxLines and scrolls, so the card back is the same height whether the
     field is being edited or only read.
   - Measured from the field's own font, line height, padding and border, so the text-size setting and any card theme are honored.
   - A field that is hidden (a card back not open yet) is skipped; it repaints the moment it is shown or its width changes. */
(function(){
  'use strict';
  if(window.FGAutoGrow) return;

  var DEFAULTS={minLines:2, maxLines:4};
  var cfgOf=new WeakMap();

  function px(v){ var n=parseFloat(v); return isNaN(n)?0:n; }

  function measure(el){
    var cs=getComputedStyle(el);
    var lh=px(cs.lineHeight);
    if(!lh) lh=px(cs.fontSize)*1.3;   // line-height "normal" has no number
    return {
      lh:lh,
      pad:px(cs.paddingTop)+px(cs.paddingBottom),
      bord:px(cs.borderTopWidth)+px(cs.borderBottomWidth),
      borderBox:cs.boxSizing==='border-box'
    };
  }

  function refresh(el){
    if(!el || !cfgOf.has(el)) return;
    if(!el.getClientRects().length) return;   // hidden right now: the observer repaints it when it is shown
    var cfg=cfgOf.get(el), m=measure(el);
    var extra=m.pad+(m.borderBox?m.bord:0);   // what a height value carries beyond the text lines
    var minH=cfg.minLines*m.lh+extra, maxH=cfg.maxLines*m.lh+extra;
    el.style.height=minH+'px';                // measure from the shortest height so shrinking works too
    var need=el.scrollHeight+(m.borderBox?m.bord:0);
    var h=Math.min(maxH, Math.max(minH, need));
    el.style.height=h+'px';
    el.style.overflowY = need>maxH+1 ? 'auto' : 'hidden';
  }

  function attach(el, opts){
    if(!el || cfgOf.has(el)) return el;
    var cfg={
      minLines:(opts&&opts.minLines)||DEFAULTS.minLines,
      maxLines:(opts&&opts.maxLines)||DEFAULTS.maxLines
    };
    if(cfg.maxLines<cfg.minLines) cfg.maxLines=cfg.minLines;
    cfgOf.set(el,cfg);
    el.addEventListener('input', function(){ refresh(el); });
    // A card back that was hidden when its value was set, or a width change, repaints here. Only width is watched,
    // so the height this code sets never re-triggers it.
    if(window.ResizeObserver){
      var lastW=-1;
      new ResizeObserver(function(){
        var w=el.clientWidth;
        if(w!==lastW){ lastW=w; refresh(el); }
      }).observe(el);
    }
    refresh(el);
    return el;
  }

  window.FGAutoGrow={attach:attach, refresh:refresh};
})();
