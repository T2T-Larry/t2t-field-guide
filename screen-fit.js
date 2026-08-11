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

   Text-size boost -- added Aug 3 2026. Larry, live on the laptop: "the
   print is too small... someone with poor eyesight needs to adjust."
   Auto-fit alone can shrink the widget down to MIN_SCALE on a smaller
   laptop window, and that's exactly where legibility suffers most. This
   layers a traveler-chosen multiplier on TOP of the auto-fit scale --
   auto-fit still finds the best base size for the window, the boost
   just steps it up further for anyone who needs bigger text. Deliberately
   allowed to push the widget past MAX_SCALE and off the edge of a small
   window (the surrounding page scrolls) -- for someone who needs this,
   legibility wins over tidy containment. Four steps, same "three or
   four feels right" sizing Larry settled on for other choice controls.
   Screen-zero.js's gear (single tap, see buildGear) opens the picker;
   this file owns the math and the saved preference so any screen can
   read the current boost without caring how it was set.
*/
(function(){
  'use strict';

  var BOOST_KEY = 'fg-text-boost';
  var BOOST_LEVELS = [
    { mult: 1,    label: 'Standard' },
    { mult: 1.2,  label: 'Large' },
    { mult: 1.45, label: 'Larger' },
    { mult: 1.75, label: 'Largest' }
  ];

  function loadBoostIndex(){
    try {
      var raw = localStorage.getItem(BOOST_KEY);
      var i = raw === null ? 0 : parseInt(raw, 10);
      if (isNaN(i) || i < 0 || i >= BOOST_LEVELS.length) return 0;
      return i;
    } catch(e){ return 0; }
  }

  var boostIndex = loadBoostIndex();

  // CSS variable twin of boostIndex, Aug 11 2026 -- Larry (bug report):
  // this file's own scaling (the tick() loop below) only ever resizes
  // #fg-root as a whole, which is why the boost above did nothing on
  // Briefing Board / Idea Storyboard / Session Recorder / Gems -- all
  // four go full-screen on purpose and are deliberately skipped by
  // tick()'s isx-full branch, so there was never anything for the old
  // boost to scale on those screens. Rather than teach this file about
  // four other files' layouts, those tools' own CSS now reads its font
  // sizes through this variable (calc(Npx * var(--fg-text-scale,1)))
  // instead of a bare px value -- setting the variable here is enough
  // to grow text on every one of them too, kept in sync with boostIndex
  // at every point that changes it.
  var CSS_VAR = '--fg-text-scale';
  function applyCSSVar(){
    try { document.documentElement.style.setProperty(CSS_VAR, String(BOOST_LEVELS[boostIndex].mult)); } catch(e){}
  }
  applyCSSVar();

  function setBoostIndex(i){
    if (i < 0 || i >= BOOST_LEVELS.length) return;
    boostIndex = i;
    try { localStorage.setItem(BOOST_KEY, String(i)); } catch(e){}
    applyCSSVar();
  }

  // Public API -- screen-zero.js's gear popover reads/writes through
  // this rather than touching localStorage or the scale math itself.
  window.FGTextSize = {
    levels: BOOST_LEVELS.map(function(l){ return l.label; }),
    getIndex: function(){ return boostIndex; },
    setIndex: setBoostIndex
  };

  var MIN_SCALE = 0.6;   // floor -- keeps text legible on small screens
  var MAX_SCALE = 1.15;  // ceiling -- keeps the widget from blowing up
                          // into a blurry, oversized book on very large
                          // monitors; the desk around it is meant to
                          // stay visible, not get crowded out.
                          // Lowered from 1.45, Aug 1 2026 -- Larry,
                          // live-testing on the laptop: "tv screen
                          // changes to a perfect size when both
                          // drawers are open... but enlarges again
                          // when drawer is closed." The widget's
                          // reference shape (680x~520) is wider than
                          // it is tall, so on a laptop-height screen
                          // its HEIGHT ratio is usually what limits
                          // the scale, not width -- closing a drawer
                          // frees up width the widget didn't actually
                          // need, but the math still had room to grow
                          // toward the old 1.45 ceiling. The measured
                          // desktop scale (~1.06 on a 27" monitor) is
                          // comfortably under 1.15 too, so this only
                          // trims the laptop's over-grown case, not
                          // the desktop experience this was built for.
  var MARGIN = 40;        // breathing room kept clear on every side, px
  var RAIL_WIDTH = 200;   // px -- matches screen-zero.js's own RAIL_WIDTH
                          // constant; kept in sync by hand since the two
                          // files don't share this value directly

  function reservedWidth(el){
    if (!el) return 0;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    // Larry, Aug 1 2026: reserve the rail's FULL nominal width whenever
    // it's present at all, regardless of whether a traveler has it
    // collapsed right now -- Larry, live-testing: "laptop still change
    // widget size based on drawers. Both open makes it the perfect
    // size!" He wants the fit to hold steady no matter what a traveler
    // does with the drawers mid-session, not react every time one gets
    // collapsed or reopened. Reading the rail's actual (possibly
    // collapsed-to-0) rendered width here was exactly what made the
    // widget grow whenever a drawer closed -- using the fixed nominal
    // width instead means the ONLY thing display:none (a rail that
    // genuinely isn't part of this screen at all, e.g. Sign In) still
    // correctly frees up the space it would have used.
    return RAIL_WIDTH;
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
          scale = scale * BOOST_LEVELS[boostIndex].mult;
          var next = 'scale(' + scale.toFixed(4) + ')';
          if (fg.style.transform !== next) fg.style.transform = next;
        }
      }
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
