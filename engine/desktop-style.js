/* ============================================================
   desktop-style.js — Desktop Style. All of the desk's own visual
   dressing that isn't a drawer: the desk background color picker
   (double-click the empty backdrop), and the look of the two objects
   Desktop Screen builds on top of that backdrop -- the embossed T2T
   watermark and the notebook. Paired with desktop-screen.js the way
   Larry asked ("Desktop Screen and Desktop Style") -- Screen owns the
   structure (the actual watermark/notebook elements and what they
   do), Style owns everything about how they look.

   Split out of screen-zero.js (Sept 4 2026). Before the split, the
   watermark's own CSS lived tangled inside this same color-picker
   style block, AND desktop-screen.js's buildDeskWatermark() reached
   over to call this file's injectDesktopStyle() just to make sure its
   own look existed -- a real entanglement, not a deliberate design.
   That reach-across call is still here (Screen still has to ask Style
   to inject its CSS before painting), but now it's an intentional,
   documented seam between two clearly-separated files instead of an
   accident of history. See the Field Guide Project Journal for the
   full split plan and reasoning.

   No dependency on Drag Engine, Drawer Style, Drawer System, or
   Drawer Surprise Tray -- callers reach it via window.SZDeskStyle.
   ============================================================ */

(function(){

  /* ---------- Desk backdrop (0000, was Component C001 -- renamed July
     31 2026) color picker -- double-click the empty backdrop (outside
     the widget, both drawers, the TV frame ring, and the notebook)
     opens a swatch picker, same "double-click is color options
     everywhere" standard as every other screen. Made-up starter
     palette for now, same approach as the TV frame's own picker --
     real swatches are a later Art-Director decision (Style Book).
     Larry, July 28 2026. Not shown at all on 0010 Sign In -- see
     t2t-bare-screen, there's no desk yet for a traveler who hasn't
     signed in. ---------- */
  var BG_COLOR_KEY = 't2t_deskBgColor';
  var BG_PALETTE = [
    { key:'fog',   name:'Fog (default)', color:'#D0D0D0' },
    { key:'slate', name:'Slate',   color:'#8792A2' },
    { key:'putty', name:'Putty',   color:'#C9BFA8' },
    { key:'sage',  name:'Sage',    color:'#9CAF88' },
    { key:'dusk',  name:'Dusk',    color:'#6E6A85' },
    { key:'clay',  name:'Clay',    color:'#B57B5D' }
  ];

  function injectDesktopStyle(){
    if (document.getElementById('sz-bg-color-style')) return;
    var css = ''
      + '#sz-bg-color-overlay{position:fixed;inset:0;z-index:9997;'
      +   'display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}'
      + '#sz-bg-color-overlay.active{display:flex}'
      + '#sz-bg-color-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:280px;max-width:88vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}'
      + '#sz-bg-color-card .sz-bg-color-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:16px;font-weight:700;color:#2b2b2b;margin-bottom:4px}'
      + '#sz-bg-color-card .sz-bg-color-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:12px}'
      + '#sz-bg-color-swatches{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:14px}'
      + '.sz-bg-color-swatch{width:44px;height:44px;border-radius:10px;cursor:pointer;'
      +   'border:3px solid transparent}'
      + '.sz-bg-color-swatch.sz-bg-color-active{border-color:#1a3a5c;'
      +   'box-shadow:0 0 0 2px #fdf8f0,0 0 0 4px #1a3a5c}'
      + '#sz-bg-color-close{border:1px solid #cfe4f2;background:#fff;padding:6px 16px;'
      +   'border-radius:8px;cursor:pointer;font-size:13px}'
      // Desk watermark -- Larry, July 31 2026: "with everything put
      // into drawers, the desktop might be blank with the 2 filing
      // cabinets on the sides? A nice looking unobtrusive embossed T2T
      // in the center of the screen that is covered by anything placed
      // on top of it." Sits on the same backdrop this color picker
      // covers, so its look lives right here alongside it, even though
      // the actual watermark ELEMENT is built by desktop-screen.js.
      // z-index:0 (an explicit low value, not the default "auto") plus
      // being the very first thing appended to <body> (see
      // buildDeskWatermark in desktop-screen.js) is what makes
      // "covered by anything placed on top" automatic -- the widget
      // and every drawer/tool/notebook already sit at z-index 9997+,
      // so they paint over this without any special-casing needed on
      // their end. The "embossed" look is a light+dark text-shadow
      // pair (a highlight up-left, a shadow down-right) on
      // near-transparent text, a look that reads as pressed into the
      // surface rather than printed on it, and holds up across every
      // desk color in the palette above since it's relative light/
      // dark rather than tied to one specific hue. pointer-events:none
      // so it never intercepts the backdrop's own double-click-for-
      // color gesture.
      //
      // Larry, August 3 2026: "write member's name above T2T on 0000
      // in embossed letters smaller than the 2." T2T itself used to be
      // the fixed-position element; now the fixed position moves up to
      // a wrapping container (#sz-desk-watermark) so the member's name
      // can stack above it as a second line, both centered together as
      // one unit -- same embossed look, just a smaller font so it
      // reads as a caption over the main T2T mark, not a rival to it.
      + '#sz-desk-watermark{position:fixed;top:50%;left:50%;'
      +   'transform:translate(-50%,-50%);z-index:0;pointer-events:none;'
      +   'display:flex;flex-direction:column;align-items:center;'
      +   'user-select:none;-webkit-user-select:none}'
      + '#sz-member-watermark{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(3vw,30px);letter-spacing:0.04em;color:rgba(0,0,0,.05);' /* Larry, August 3 2026: smaller + mixed case, so a tighter tracking than the all-caps T2T reads cleaner */
      +   'text-shadow:2px 2px 3px rgba(255,255,255,.45),-2px -2px 3px rgba(0,0,0,.18);'
      +   'white-space:nowrap;margin-top:2px}'
      + '#sz-t2t-watermark{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(11vw,110px);letter-spacing:0.12em;' /* Larry, July 31 2026: about half the original size */
      +   'color:rgba(0,0,0,.05);'
      +   'text-shadow:2px 2px 3px rgba(255,255,255,.45),-2px -2px 3px rgba(0,0,0,.18)}'
      // Never on 0010 -- there's no desk backdrop to sit on yet (same
      // reasoning as the color picker itself, just above).
      + 'body.t2t-bare-screen #sz-desk-watermark{display:none!important}'
      // Notebook -- Larry, July 26: notebook needed more "splash" --
      // reads as properly floating above the desk/drawer, not just
      // another flat card. A layered shadow (tight+dark close in,
      // soft+wide further out) instead of the single flat shadow every
      // other object uses.
      + '#sz-notebook{position:fixed;width:70px;height:98px;background:#3d2817;'
      +   'border:2px solid #241608;border-radius:4px;'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.4), 0 18px 40px rgba(0,0,0,.4);cursor:grab;'
      +   'transform:rotate(-4deg);z-index:9999}'
      + '#sz-notebook-label{position:absolute;left:50%;top:26%;transform:translateX(-50%);'
      +   'border:1px solid #C9A87C;padding:4px 8px;border-radius:2px}'
      + '#sz-notebook-label span{font-size:10px;color:#C9A87C;letter-spacing:1px;white-space:nowrap}'
      ;
    var style = document.createElement('style');
    style.id = 'sz-bg-color-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getSavedBgKey(){
    try { return localStorage.getItem(BG_COLOR_KEY) || 'fog'; } catch(e){ return 'fog'; }
  }
  function saveBgKey(key){ try { localStorage.setItem(BG_COLOR_KEY, key); } catch(e){} }
  function applyBgColor(key){
    var p = BG_PALETTE.filter(function(x){ return x.key===key; })[0] || BG_PALETTE[0];
    // Set as a CSS variable rather than a direct body style -- style.css's
    // body.t2t-bare-screen rule overrides it back to the plain default on
    // Sign In purely through CSS, so this can never race with load order
    // or leak a member's saved color onto a screen that has no member yet.
    // Larry, July 28 2026.
    document.documentElement.style.setProperty('--t2t-desk-bg', p.color);
  }

  // Outside-click-to-close guard, Aug 11 2026 -- see drawer-style.js
  // for the full history; every popup in this family (drawer color,
  // desk color, text size, rename card) carries its own small copy.
  function guardedBackdropClose(overlay, closeFn){
    var openedAt = 0;
    overlay.addEventListener('click', function(e){
      if (e.target !== overlay) return;
      if (Date.now() - openedAt < 400) return;
      closeFn();
    });
    overlay._markOpened = function(){ openedAt = Date.now(); };
  }

  function buildBgColorPicker(){
    injectDesktopStyle();
    var overlay = document.createElement('div');
    overlay.id = 'sz-bg-color-overlay';
    var card = document.createElement('div');
    card.id = 'sz-bg-color-card';
    card.innerHTML = ''
      + '<div class="sz-bg-color-title">Desk color</div>'
      + '<div class="sz-bg-color-sub">Pick a look for the desk itself. Stays until you change it.</div>'
      + '<div id="sz-bg-color-swatches"></div>'
      + '<button id="sz-bg-color-close" type="button">✕</button>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var row = card.querySelector('#sz-bg-color-swatches');
    BG_PALETTE.forEach(function(p){
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'sz-bg-color-swatch';
      sw.title = p.name;
      sw.style.background = p.color;
      sw.addEventListener('click', function(){
        applyBgColor(p.key);
        saveBgKey(p.key);
        closeBgColorPicker();
      });
      row.appendChild(sw);
    });

    guardedBackdropClose(overlay, closeBgColorPicker);
    card.querySelector('#sz-bg-color-close').addEventListener('click', closeBgColorPicker);
    return overlay;
  }

  function openBgColorPicker(){
    var overlay = document.getElementById('sz-bg-color-overlay') || buildBgColorPicker();
    var cur = getSavedBgKey();
    overlay.querySelectorAll('.sz-bg-color-swatch').forEach(function(sw, i){
      sw.classList.toggle('sz-bg-color-active', BG_PALETTE[i].key === cur);
    });
    overlay.classList.add('active');
    if (overlay._markOpened) overlay._markOpened();
  }

  function closeBgColorPicker(){
    var overlay = document.getElementById('sz-bg-color-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function wireBgColorGesture(){
    document.addEventListener('dblclick', function(e){
      if (document.body.classList.contains('t2t-bare-screen')) return; // no desk on 0010
      if (e.target.closest('#fg-root, #sz-navbar, #sz-drawer-r, #sz-notebook, #sz-bg-color-overlay')) return;
      var tvFrameEl = document.getElementById('tv-frame');
      if (tvFrameEl && !tvFrameEl.classList.contains('tv-frame-hidden')) {
        var r = tvFrameEl.getBoundingClientRect();
        var inRing = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (inRing) return; // TV frame's own dblclick picker owns that area
      }
      openBgColorPicker();
    });
  }

  window.SZDeskStyle = {
    injectDesktopStyle: injectDesktopStyle,
    getSavedBgKey: getSavedBgKey,
    applyBgColor: applyBgColor,
    wireBgColorGesture: wireBgColorGesture
  };

})();
