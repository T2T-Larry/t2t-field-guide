/* screen-fit.js -- Added Aug 1 2026.
   Larry: "this is a 27 inch pc desktop but I also have an Apple laptop --
   can we make our screens modifiable?" Auto-fit, not a manual control:
   the widget scales itself to whatever screen it's opened on, no
   traveler action needed (Larry chose auto over a manual size picker).

   #fg-root (the book widget, ".fg") is hand-built at a fixed 680px
   reference width -- every screen inside it uses fixed-px fonts,
   padding, and button sizes tuned at that width. Rather than reflow
   hundreds of screens' worth of fixed measurements for every possible
   window size, this scales the WHOLE widget uniformly with a CSS
   transform: shrink it to fit a small laptop, grow it to fill more of
   a big monitor -- every internal measurement stays in the same
   proportion to every other, nothing inside needs to change.

   tv-frame.js already tracks #fg-root's rendered box every frame via
   getBoundingClientRect(), which reflects the box AFTER this transform
   is applied -- so the TV frame, vignette, and everything that hugs
   the widget's edges follow the new size automatically. No changes
   needed there.

   Skipped entirely while #fg-root is in .isx-full (Storyboard, Session
   Recorder, Briefing Board, Gems) -- those tools already go edge-to-edge
   at 100vw/100vh and manage their own layout independently; scaling
   them would fight that.
*/
(function(){
  'use strict';

  var MIN_SCALE = 0.6;   // floor -- keeps text legible on small screens
  var MAX_SCALE = 1.45;  // ceiling -- keeps the widget from blowing up
                          // into a blurry, oversized book on very large
                          // monitors; the desk around it is meant to
                          // stay visible, not get crowded out
  var MARGIN = 40;        // breathing room kept clear on every side, px

  function reservedWidth(el){
    if (!el) return 0;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    var r = el.getBoundingClientRect();
    return r.width;
  }

  function tick(){
    var fg = document.getElementById('fg-root');
    if (fg){
      if (fg.classList.contains('isx-full')){
        if (fg.style.transform) fg.style.transform = '';
      } else {
        var navbar = document.getElementById('sz-navbar');
        var drawer = document.getElementById('sz-drawer-r');
        var leftReserved = reservedWidth(navbar);
        var rightReserved = reservedWidth(drawer);

        var availW = window.innerWidth - leftReserved - rightReserved - (MARGIN * 2);
        var availH = window.innerHeight - (MARGIN * 2);

        // offsetWidth/offsetHeight are layout measurements -- CSS
        // transform never changes them, so these stay the widget's
        // true natural size even while a previous scale is applied.
        var naturalW = fg.offsetWidth;
        var naturalH = fg.offsetHeight;

        if (naturalW > 0 && naturalH > 0 && availW > 0 && availH > 0){
          var scale = Math.min(availW / naturalW, availH / naturalH);
          scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
          var next = 'scale(' + scale.toFixed(4) + ')';
          if (fg.style.transform !== next) fg.style.transform = next;
        }
      }
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
