/* ============================================================
   tv-frame.js — the TV bezel around the widget.

   Larry, July 26 2026 (same day as the rail/notebook rework):
   "What if the widget viewing screen is in a frame like a TV so
   the frame looks like it is floating over the 0100 screen? The
   arrows, lightbulb and trivia flower will rest on the frame,
   like TV controls?" -- confirmed as a build ("tv frame is a do
   it!").

   This lines up with Session 144's planning decision that the
   TV replaces the old book/binder centerpiece and its bezel is
   the old binder's double-border frame, with page-turn arrows
   becoming channel-style controls. This file is the concrete
   build of that bezel, sitting around whatever the widget
   (#fg-root) is currently showing -- not just the Cover (0100),
   since the TV shows every INPUT screen as a changeable channel
   behind the same frame.

   How it works:
   - #tv-frame is a fixed panel that continuously tracks
     #fg-root's real position and size (including while it's
     being dragged), sized a bit larger on every side so only
     the bezel ring shows around the widget's own edges -- the
     widget itself, sitting in front, covers the frame's middle
     like a picture showing through a TV's screen opening.
   - Four round controls sit on the frame's bottom ledge, like
     physical knobs on a TV cabinet: Back / Next (channel-style
     paging), a lightbulb for Ideas, and a trivia flower for
     Trivia.
   - Back/Next don't hard-code a target screen -- they act like a
     universal remote, proxy-clicking whichever real prev/next/
     back control already exists inside the screen currently
     showing (the Cover's own arrows, a Thoughts page's own
     paging strip, etc.), and dim themselves when the current
     screen has none, same visual language as the site's existing
     `.dim` convention.

   Not yet built (flagging honestly rather than guessing):
   Trivia "lights up only when the current page has content
   attached" (a Session 144 decision) needs a data model for
   which pages carry trivia -- doesn't exist yet, so for now the
   Trivia knob is always live. The original arrows/back/menu
   buttons already inside each screen are left in place for now
   too -- retiring 30+ screens' own controls in favor of the
   frame alone is a bigger follow-up, not part of this pass.

   Loaded after screen-zero.js.
   ============================================================ */

(function(){

  var BEZEL_SIDE = 22;   // px -- extra bezel width on left/right/top
  var BEZEL_BOTTOM = 78; // px -- extra room at the bottom for the control ledge

  function injectStyle(){
    if (document.getElementById('tv-frame-style')) return;
    var css = ''
      + '#tv-frame{position:fixed;pointer-events:none;'
      +   'background:linear-gradient(160deg,#4a3826,#2b1f14 55%,#1c130b 100%);'
      +   'border:2px solid #0d0a06;border-radius:26px;'
      +   'box-shadow:0 10px 40px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.08),'
      +     'inset 0 -2px 0 rgba(0,0,0,.5);'
      +   'transition:opacity .15s ease;}'
      + '#tv-frame.tv-frame-hidden{opacity:0}'
      + '#tv-controls{position:absolute;left:0;right:0;bottom:12px;'
      +   'display:flex;align-items:center;justify-content:center;gap:14px;'
      +   'pointer-events:auto}'
      + '.tv-knob{width:34px;height:34px;border-radius:50%;cursor:pointer;'
      +   'border:2px solid #6b5a42;background:radial-gradient(circle at 35% 30%,#8a7358,#4a3826 70%);'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.15);'
      +   'font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;'
      +   'color:#f3e6cf;transition:transform .1s ease}'
      + '.tv-knob:active{transform:translateY(1px)}'
      + '.tv-knob.dim{opacity:.35;cursor:default;pointer-events:none}'
      ;
    var style = document.createElement('style');
    style.id = 'tv-frame-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildFrame(){
    var frame = document.createElement('div');
    frame.id = 'tv-frame';

    var controls = document.createElement('div');
    controls.id = 'tv-controls';

    var prev = knob('prev', '⬅️', 'Previous');
    var next = knob('next', '➡️', 'Next');
    var idea = knob('idea', '💡', 'Ideas');
    var trivia = knob('trivia', '🌸', 'Trivia');

    controls.appendChild(prev);
    controls.appendChild(next);
    controls.appendChild(idea);
    controls.appendChild(trivia);
    frame.appendChild(controls);

    return frame;
  }

  function knob(kind, label, title){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tv-knob';
    b.dataset.kind = kind;
    b.title = title;
    b.textContent = label;
    b.addEventListener('click', function(){ onKnob(kind); });
    return b;
  }

  /* ---------- Universal remote: proxy-click whatever real prev/
     next/back control exists on the screen currently showing. ---- */

  function findProxyTarget(kind){
    var active = document.querySelector('.sc.active');
    if (!active) return null;
    var pattern = kind === 'next' ? /-next(-|\d|$)/i : /-(prev|back)(-|\d|$)/i;
    var candidates = active.querySelectorAll('button[id]');
    for (var i = 0; i < candidates.length; i++){
      var b = candidates[i];
      if (pattern.test(b.id) && !b.classList.contains('dim') && !b.disabled) return b;
    }
    return null;
  }

  function onKnob(kind){
    if (kind === 'idea'){
      if (window.T2T) window.T2T.nav('s-sea-of-ideas');
      return;
    }
    if (kind === 'trivia'){
      if (window.T2T) window.T2T.nav('s-trivia');
      return;
    }
    var target = findProxyTarget(kind);
    if (target) target.click();
  }

  /* ---------- Keep the two remote knobs honest about whether the
     current screen actually has somewhere to go, same `.dim`
     language the site already uses elsewhere. ---------- */

  function updateDimStates(frame){
    ['prev', 'next'].forEach(function(kind){
      var btn = frame.querySelector('.tv-knob[data-kind="' + kind + '"]');
      if (!btn) return;
      var has = !!findProxyTarget(kind);
      btn.classList.toggle('dim', !has);
    });
  }

  /* ---------- Track #fg-root continuously (drag, resize, screen
     changes) so the frame always reads as floating just behind
     whatever the widget is currently showing. Hides itself
     entirely while the widget is in full-screen output mode
     (`.isx-full`), since outputs take over the whole screen and a
     TV bezel around them wouldn't make sense. ---------- */

  function trackLoop(frame, fg){
    var lastKey = '';
    function tick(){
      if (!document.body.contains(fg)) { frame.remove(); return; }

      var isFull = fg.classList.contains('isx-full');
      if (isFull){
        frame.classList.add('tv-frame-hidden');
        requestAnimationFrame(tick);
        return;
      }
      frame.classList.remove('tv-frame-hidden');

      var r = fg.getBoundingClientRect();
      var left = r.left - BEZEL_SIDE;
      var top = r.top - BEZEL_SIDE;
      var width = r.width + BEZEL_SIDE * 2;
      var height = r.height + BEZEL_SIDE + BEZEL_BOTTOM;

      var key = left + ',' + top + ',' + width + ',' + height;
      if (key !== lastKey){
        frame.style.left = left + 'px';
        frame.style.top = top + 'px';
        frame.style.width = width + 'px';
        frame.style.height = height + 'px';
        lastKey = key;
      }

      updateDimStates(frame);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function init(){
    var fg = document.getElementById('fg-root');
    if (!fg) return;
    if (document.getElementById('tv-frame')) return; // idempotent

    injectStyle();
    var frame = buildFrame();
    // Insert immediately before #fg-root, in the same parent, so with
    // no explicit z-index on either element, normal stacking order
    // keeps the frame behind the widget -- the widget's own content
    // covers the frame's middle, leaving only the bezel ring visible.
    fg.parentNode.insertBefore(frame, fg);

    trackLoop(frame, fg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
