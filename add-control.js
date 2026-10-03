/* add-control.js -- Oct 3 2026.
   Larry: "a white dashed circle with a + is the standard symbol for 'add
   something new here' on every board ... the control senses its background
   for contrast (white on dark surfaces, the same dashed circle in dark ink
   on light ones)." This is that one control, defined ONCE.

   window.T2TAddControl
     make({title, onClick, sense, size})  -> <button> ready to append
         sense: the element whose background the control sits on (a menu, a
                panel). If omitted, the button senses its own ancestors the
                moment it is attached to the page.
     restyle(btn, sense?)                  -> (re)apply the standard look
     refresh(root)                         -> re-sense every control under root
     isDark(el)                            -> true when el's real background
                                              (first opaque ancestor) is dark

   Existing sites that still draw their own (+) with the older classes
   (.bb-dotted-add-btn, .sc-dotted-add-btn) are brought onto this standard
   automatically by the observer at the bottom, so a board that has not been
   migrated yet still gets the one look. A new board should call make().
   The matching "remove" buttons (.bb-dotted-remove-btn / .sc-dotted-remove-btn)
   keep their red on purpose -- they are not add controls.
*/
(function(){
  'use strict';

  var LIGHT_INK = '#3d3326';     // the dark-ink version, for light surfaces

  function parseRGB(s){
    var m = String(s || '').match(/[\d.]+/g) || [];
    if (m.length < 3) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  }
  function lum(c){ return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }

  // First opaque background walking up from el. Falls back to the page body,
  // then to white (light) so an unknown surface never gets an invisible ring.
  function surfaceColor(el){
    var n = el;
    while (n && n.nodeType === 1) {
      var c = parseRGB(window.getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function isDark(el){ return lum(surfaceColor(el)) < 140; }

  function ink(sense){
    return isDark(sense) ? '#fff' : LIGHT_INK;
  }

  function apply(btn, sense){
    var dark = isDark(sense || btn.parentElement || btn);
    var col = dark ? '#fff' : LIGHT_INK;
    var rest = dark ? '0.9' : '0.75';
    var s = btn.style;
    s.width = btn.getAttribute('data-size') ? btn.getAttribute('data-size') + 'px' : '22px';
    s.height = s.width;
    s.boxSizing = 'border-box';
    s.display = 'flex'; s.alignItems = 'center'; s.justifyContent = 'center';
    s.flexShrink = '0';
    s.background = 'transparent';
    s.border = '1.5px dashed ' + col;
    s.borderRadius = '50%';
    s.color = col;
    s.font = 'inherit';
    s.fontWeight = '700';
    s.lineHeight = '1';
    s.padding = '0';
    s.cursor = 'pointer';
    s.opacity = rest;
    s.transition = 'opacity .15s, background .15s';
    if (!btn._t2tAddHover) {
      btn._t2tAddHover = true;
      btn.addEventListener('mouseenter', function(){ btn.style.opacity = '1'; btn.style.background = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.06)'; });
      btn.addEventListener('mouseleave', function(){ btn.style.opacity = rest; btn.style.background = 'transparent'; });
    }
    btn.setAttribute('data-t2t-add', '1');
  }

  function make(o){
    o = o || {};
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 't2t-add';
    btn.textContent = '+';
    if (o.title) { btn.title = o.title; btn.setAttribute('aria-label', o.title); }
    if (o.size) btn.setAttribute('data-size', String(o.size));
    if (typeof o.onClick === 'function') btn.addEventListener('click', o.onClick);
    if (o.sense) {
      apply(btn, o.sense);
    } else {
      // No surface given: style it as soon as it is on the page and can look
      // at what is behind it.
      requestAnimationFrame(function(){ if (btn.isConnected) apply(btn); });
    }
    return btn;
  }

  /* ---- bring the older per-board classes onto the standard ---- */
  var LEGACY = '.bb-dotted-add-btn:not(.bb-dotted-remove-btn), .sc-dotted-add-btn:not(.sc-dotted-remove-btn)';
  function standardizeWithin(root){
    if (!root || root.nodeType !== 1) return;
    var list = [];
    if (root.matches && root.matches(LEGACY)) list.push(root);
    if (root.querySelectorAll) Array.prototype.push.apply(list, root.querySelectorAll(LEGACY));
    list.forEach(function(b){ if (!b.getAttribute('data-t2t-add')) apply(b); });
  }
  var queue = [], scheduled = false;
  function flush(){
    scheduled = false;
    var q = queue; queue = [];
    q.forEach(standardizeWithin);
  }
  function start(){
    standardizeWithin(document.body);
    new MutationObserver(function(muts){
      muts.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes, function(n){ if (n.nodeType === 1) queue.push(n); }); });
      if (queue.length && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // Re-sense every control under root -- call after a menu has been themed,
  // moved, or shown, since the surface behind the control may have changed.
  function refresh(root){
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-t2t-add]'), function(b){ apply(b); });
  }

  window.T2TAddControl = { make: make, restyle: apply, refresh: refresh, isDark: isDark, ink: ink };
})();
