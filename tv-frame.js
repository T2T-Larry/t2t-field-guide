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

   Trivia "lights up only when the current page has content
   attached" (a Session 144 decision) shipped July 27 2026 --
   T2T.hasTrivia() reads the same per-page trivia registry the
   Trivia hub itself renders from, and the knob slowly flashes
   brown to yellow-brown (see updateTriviaLit) whenever the
   current page has any trivia links attached.

   Not yet built (flagging honestly rather than guessing): the
   original arrows/back/menu buttons already inside each screen
   are left in place for now -- retiring 30+ screens' own
   controls in favor of the frame alone is a bigger follow-up,
   not part of this pass.

   Loaded after screen-zero.js.
   ============================================================ */

(function(){

  var BEZEL_SIDE = 22;   // px -- extra bezel width on left/right/top
  // BEZEL_BOTTOM narrowed 78 -> 56 and the knob row's own bottom offset
  // 12 -> 8, per Larry, July 27 2026: shorten the frame's overall
  // vertical height by tightening the gap between the knobs and the
  // cabinet's lower edge, not by shrinking the knobs themselves.
  var BEZEL_BOTTOM = 56; // px -- extra room at the bottom for the control ledge

  // Made-up starter palette for the frame's double-click color options --
  // Larry, July 27 2026: "just make up some interesting ones for now."
  // Not a themed/branded set, just six distinct cabinet looks. Emerald
  // (the current teal-green) stays the default so nothing changes for a
  // traveler who never opens the picker. Same 3-stop gradient + border
  // shape as the original brown bezel, just re-colored per swatch.
  var TV_COLOR_KEY = 't2t_tvFrameColor';
  var TV_PALETTE = [
    { key:'emerald',  name:'Emerald',    top:'#14806A', mid:'#0F6E56', bottom:'#093B2F', border:'#06231C' },
    { key:'rust',     name:'Rust',       top:'#D9713F', mid:'#C1502E', bottom:'#7A2E17', border:'#4A1B0E' },
    { key:'navy',     name:'Navy',       top:'#2E4F73', mid:'#1B3A5C', bottom:'#0E2038', border:'#081422' },
    { key:'wine',     name:'Wine',       top:'#8A3153', mid:'#6B1E3C', bottom:'#3E0F22', border:'#250913' },
    { key:'mustard',  name:'Mustard',    top:'#DDA83B', mid:'#C9973A', bottom:'#7A5A1C', border:'#4A3610' },
    { key:'charcoal', name:'Charcoal',   top:'#4A4A4A', mid:'#2B2B2B', bottom:'#151515', border:'#0A0A0A' }
  ];

  function getSavedColorKey(){
    try { return localStorage.getItem(TV_COLOR_KEY) || 'emerald'; } catch(e){ return 'emerald'; }
  }
  function saveColorKey(key){
    try { localStorage.setItem(TV_COLOR_KEY, key); } catch(e){}
  }
  function paletteEntry(key){
    for (var i = 0; i < TV_PALETTE.length; i++) if (TV_PALETTE[i].key === key) return TV_PALETTE[i];
    return TV_PALETTE[0];
  }
  function applyColor(frame, key){
    var p = paletteEntry(key);
    frame.style.setProperty('--tv-top', p.top);
    frame.style.setProperty('--tv-mid', p.mid);
    frame.style.setProperty('--tv-bottom', p.bottom);
    frame.style.setProperty('--tv-border', p.border);
    frame.dataset.colorKey = p.key;
  }

  function injectStyle(){
    if (document.getElementById('tv-frame-style')) return;
    // Fix for "screen refresh showed the new content color for an
    // instant, then went back to previous darker color" (Larry, July
    // 27 2026): the CSS custom-property fallbacks used to be
    // hardcoded to Emerald, so on a real page load there was a brief
    // window -- stylesheet parsed and painted before applyColor()'s
    // inline override landed -- where the frame showed Emerald
    // instead of whatever was actually saved. Reading the saved
    // palette entry here and baking IT in as the fallback means the
    // very first paint already matches, no matter how that timing
    // gap behaves in practice. applyColor() still runs after, so
    // switching colors live still works exactly the same.
    var savedP = paletteEntry(getSavedColorKey());
    var css = ''
      // Recolored brown/wood -> dark teal-green per Larry, July 27
      // 2026: #0F6E56 is the old (pre-TV) binder's own frame color --
      // reused here now that brown is reserved for the notebook. White
      // top highlight kept as-is (Larry: "I like the white frame on
      // the tv window").
      //
      // pointer-events switched none -> auto, July 27 2026 -- Larry:
      // "drag tv frame but not content." The frame ring is now the
      // widget's own drag handle (see wireFrameDrag below); the ring
      // and the knob-gaps both being real click targets is fine and
      // even helpful for that. #tv-controls below still needs its OWN
      // pointer-events:none so double-click/triple-click detection
      // (which checks ring geometry, not e.target) and the new drag
      // both still reach the frame itself through the gaps between
      // knobs, not just the knobs.
      + '#tv-frame{position:fixed;pointer-events:auto;cursor:grab;'
      +   'background:linear-gradient(160deg,var(--tv-top,' + savedP.top + '),var(--tv-mid,' + savedP.mid + ') 55%,var(--tv-bottom,' + savedP.bottom + ') 100%);'
      +   'border:2px solid var(--tv-border,' + savedP.border + ');border-radius:26px;'
      +   'box-shadow:0 10px 40px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.08),'
      +     'inset 0 -2px 0 rgba(0,0,0,.5);'
      +   'transition:opacity .15s ease, background .2s ease, border-color .2s ease;}'
      + '#tv-frame.tv-frame-hidden{opacity:0}'
      + '#tv-frame.tv-frame-dragging{cursor:grabbing}'
      // pointer-events:none here (was auto) -- Larry, July 27 2026:
      // "double click 0007 did not offer color options." Root cause:
      // this div spans the frame's FULL WIDTH (left:0;right:0), so
      // with pointer-events:auto on the div itself, every gap between
      // knobs (not just the knobs) was swallowing clicks meant for the
      // ring behind them -- a big share of the bottom band, worse now
      // that the frame's shorter. Only the individual knob buttons
      // need to catch clicks, so pointer-events is re-enabled just on
      // .tv-knob below, and everything else in this strip now passes
      // through to the frame itself underneath (drag + the existing
      // ring-detection in wireColorGesture).
      + '#tv-controls{position:absolute;left:0;right:0;bottom:8px;'
      +   'display:flex;align-items:center;justify-content:center;gap:14px;'
      +   'pointer-events:none}'
      // Triangles instead of the arrow emoji, and a real focus-visible
      // ring in place of the browser's default blue one -- Larry, July
      // 27 2026: "can we drop the blue around the arrows? If not, use
      // forward and back triangles?" Went with both: plain glyphs never
      // carry a platform color the way arrow emoji sometimes do, and
      // outline:none + a warm gold focus ring (matching the knob's own
      // color language) replaces the default blue instead of just
      // deleting focus indication outright.
      + '.tv-knob{width:34px;height:34px;border-radius:50%;cursor:pointer;pointer-events:auto;'
      +   'border:2px solid #6b5a42;background:radial-gradient(circle at 35% 30%,#8a7358,#4a3826 70%);'
      +   'box-shadow:0 3px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.15);'
      +   'font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;'
      +   'color:#f3e6cf;transition:transform .1s ease;outline:none}'
      + '.tv-knob:active{transform:translateY(1px)}'
      + '.tv-knob:focus-visible{box-shadow:0 3px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.15),'
      +   '0 0 0 3px #f3e6cf}'
      + '.tv-knob.dim{opacity:.35;cursor:default;pointer-events:none}'
      // Larry, July 27 2026: "Trivia button should turn brownish
      // yellow if there are any trivia docs [for the current page] --
      // maybe slowly flash from brown to yellow brown like a flashing
      // message light." This is the Session 144 "Trivia lights up only
      // when attached" decision, now wired to the real per-page trivia
      // registry via T2T.hasTrivia() (see updateTriviaLit below).
      + '.tv-knob[data-kind="trivia"].tv-lit{border-color:#a97c2f;'
      +   'animation:tv-trivia-flash 2.2s ease-in-out infinite alternate}'
      + '@keyframes tv-trivia-flash{'
      +   '0%{background:radial-gradient(circle at 35% 30%,#8a7358,#4a3826 70%)}'
      +   '100%{background:radial-gradient(circle at 35% 30%,#f0c869,#8a6420 70%)}'
      +   '}'
      // Vignette rebuilt as its OWN overlay element, July 27 2026 --
      // Larry: "just went to 0200 but do not see any vignette at the
      // content/TV frame junction." Root cause: it was an inset
      // box-shadow ON #fg-root itself, which paints BEHIND #fg-root's
      // own children -- so any screen whose card content is opaque
      // and runs flush to the widget's edges (most of them, including
      // 0200) painted right over it, hiding it completely. That also
      // explains the "not enough yet" feedback before this -- it was
      // never fully invisible, just inconsistently masked screen to
      // screen depending on each one's own content shape.
      //
      // #tv-vignette is a separate, transparent, pointer-events:none
      // layer, inserted AFTER #fg-root in the DOM (see init()) so it
      // paints on TOP of the widget and whatever screen it's showing,
      // no matter that screen's own background. It's sized/positioned
      // to match #fg-root exactly (see trackLoop) and carries only the
      // inset shadows themselves -- nothing to paint in the middle, so
      // the screen underneath still reads through clearly there.
      + '#tv-vignette{position:fixed;pointer-events:none;border-radius:14px;'
      +   'box-shadow:inset 0 0 14px 4px rgba(0,0,0,.55), inset 0 0 46px 14px rgba(0,0,0,.4);'
      +   'transition:opacity .15s ease}'
      + '#tv-vignette.tv-frame-hidden{opacity:0}'
      // Color-options picker (double-click the frame ring, screen 0007) --
      // Larry, July 27 2026: "definitely need a selection of color options
      // for the TV frame on double click." Reuses the site's existing
      // dimmed-backdrop overlay pattern (.sb-overlay in idea-storyboard-
      // 9710.js) so it reads as the same family of picker as everywhere
      // else, rather than a one-off look just for this frame.
      + '#tv-color-overlay{position:fixed;inset:0;z-index:9997;'
      +   'background:rgba(9,20,17,0.5);display:none;align-items:center;'
      +   'justify-content:center;padding:20px;box-sizing:border-box}'
      + '#tv-color-overlay.active{display:flex}'
      + '#tv-color-card{background:#fdf8f0;border-radius:14px;padding:18px;'
      +   'width:min(280px,90%);box-shadow:0 10px 30px rgba(0,0,0,.4);text-align:center}'
      + '#tv-color-card .tv-color-title{font-family:"Playfair Display",Georgia,serif;'
      +   'font-size:15px;font-weight:700;color:#1a3a5c;margin-bottom:2px}'
      + '#tv-color-card .tv-color-sub{font-size:11px;color:#888;font-style:italic;margin-bottom:12px}'
      + '#tv-color-swatches{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:14px}'
      + '.tv-color-swatch{width:44px;height:44px;border-radius:10px;cursor:pointer;'
      +   'border:2px solid rgba(0,0,0,.25);box-shadow:0 3px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.2);'
      +   'padding:0;position:relative}'
      + '.tv-color-swatch.tv-color-active{border-color:#1a3a5c;box-shadow:0 0 0 2px #fdf8f0,0 0 0 4px #1a3a5c}'
      + '#tv-color-close{border:1px solid #cfe4f2;background:#fff;padding:6px 16px;'
      +   'border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;color:#5b9bd5}'
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

    var prev = knob('prev', '◀', 'Previous');
    var next = knob('next', '▶', 'Next');
    var idea = knob('idea', '💡', 'Ideas');
    var trivia = knob('trivia', '🌸', 'Trivia');

    // Larry, July 26: "the next arrow should be on the far right" --
    // Prev anchors the left end, Next anchors the right end, Idea/Trivia
    // sit in the middle, like a remote's channel controls bookending the
    // row instead of being bunched together.
    controls.appendChild(prev);
    controls.appendChild(idea);
    controls.appendChild(trivia);
    controls.appendChild(next);
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
    var pattern = kind === 'next' ? /-(next|fwd)(-|\d|$)/i : /-(prev|back)(-|\d|$)/i;
    var candidates = active.querySelectorAll('button[id]');
    for (var i = 0; i < candidates.length; i++){
      var b = candidates[i];
      if (pattern.test(b.id) && !b.classList.contains('dim') && !b.disabled) return b;
    }
    return null;
  }

  function onKnob(kind){
    if (kind === 'idea'){
      // 9220 (legacy Sea of Ideas grid) retired as this knob's target.
      // Larry, July 29 2026: loading the full 9711 board just to auto-pop
      // 1170 on top of it (the previous fix) felt bulky and slow for
      // what's meant to be a quick jot — go straight to 1170 instead, no
      // board underneath, quickAddIdea (session.js) handles resolving
      // where the idea lands.
      if (window.T2T) window.T2T.closeMG();
      if (window.T2TSea && window.T2TSea.quickAddIdea){
        window.T2TSea.quickAddIdea();
      } else console.error('Idea capture unavailable — window.T2TSea.quickAddIdea is missing (session.js failed to load?).');
      return;
    }
    if (kind === 'trivia'){
      // Bug, Larry July 29 2026: this knob is the ONLY way into Trivia
      // (9500) that doesn't pass through the backpack's own goMG() call,
      // so mgOrigin was never captured — pressing the Trivia menu's own
      // ⬅️ (returnToMG) then had nowhere real to go back to and fell
      // through to reopening the backpack over a stale Trivia screen
      // instead of the primary page underneath. goMG() first captures
      // (or preserves) mgOrigin exactly like every other entry point;
      // closeMG() immediately after hides the overlay again since this
      // knob should land straight on 9500, not on the backpack icons.
      if (window.T2T){
        window.T2T.goMG();
        window.T2T.closeMG();
        window.T2T.nav('s-trivia', false);
      }
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

  // Larry, July 27 2026: "Trivia lights up only when attached" (the
  // Session 144 decision this was always meant to build toward, per
  // this file's own top-of-file note). Same live-tracking treatment
  // as updateDimStates above -- called every tick so it picks up a
  // navigation change immediately, no separate nav hook needed.
  function updateTriviaLit(frame){
    var btn = frame.querySelector('.tv-knob[data-kind="trivia"]');
    if (!btn) return;
    var lit = !!(window.T2T && window.T2T.hasTrivia && window.T2T.hasTrivia());
    btn.classList.toggle('tv-lit', lit);
  }

  /* ---------- Color-options picker: double-click the frame ring
     (screen 0007) opens a swatch picker, same "double-click is
     color options everywhere" standard as every other screen.
     ---------- */

  function buildColorPicker(frame){
    var overlay = document.createElement('div');
    overlay.id = 'tv-color-overlay';

    var card = document.createElement('div');
    card.id = 'tv-color-card';
    card.innerHTML = ''
      + '<div class="tv-color-title">TV frame color</div>'
      + '<div class="tv-color-sub">Pick a look for the cabinet. Stays until you change it.</div>'
      + '<div id="tv-color-swatches"></div>'
      + '<button id="tv-color-close" type="button">✕</button>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var swatchRow = card.querySelector('#tv-color-swatches');
    TV_PALETTE.forEach(function(p){
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'tv-color-swatch';
      sw.title = p.name;
      sw.style.background = 'linear-gradient(160deg,' + p.top + ',' + p.mid + ' 55%,' + p.bottom + ' 100%)';
      sw.addEventListener('click', function(){
        applyColor(frame, p.key);
        saveColorKey(p.key);
        closeColorPicker();
      });
      swatchRow.appendChild(sw);
    });

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeColorPicker(); });
    card.querySelector('#tv-color-close').addEventListener('click', closeColorPicker);

    return overlay;
  }

  function openColorPicker(frame){
    var overlay = document.getElementById('tv-color-overlay') || buildColorPicker(frame);
    var cur = frame.dataset.colorKey || getSavedColorKey();
    overlay.querySelectorAll('.tv-color-swatch').forEach(function(sw, i){
      sw.classList.toggle('tv-color-active', TV_PALETTE[i].key === cur);
    });
    overlay.classList.add('active');
  }

  function closeColorPicker(){
    var overlay = document.getElementById('tv-color-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  /* ---------- Track #fg-root continuously (drag, resize, screen
     changes) so the frame always reads as floating just behind
     whatever the widget is currently showing. Hides itself
     entirely while the widget is in full-screen output mode
     (`.isx-full`), since outputs take over the whole screen and a
     TV bezel around them wouldn't make sense. ---------- */

  function trackLoop(frame, fg, vignette){
    var lastKey = '';
    var lastVKey = '';
    function tick(){
      if (!document.body.contains(fg)) { frame.remove(); if (vignette) vignette.remove(); return; }

      var isFull = fg.classList.contains('isx-full');
      if (isFull){
        frame.classList.add('tv-frame-hidden');
        if (vignette) vignette.classList.add('tv-frame-hidden');
        requestAnimationFrame(tick);
        return;
      }
      frame.classList.remove('tv-frame-hidden');
      if (vignette) vignette.classList.remove('tv-frame-hidden');

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

      // Vignette matches #fg-root's own box exactly (not the bezel-
      // expanded frame rect above) -- it needs to sit precisely over
      // the widget itself to darken its edges, not the ring around it.
      if (vignette) {
        var vKey = r.left + ',' + r.top + ',' + r.width + ',' + r.height;
        if (vKey !== lastVKey) {
          vignette.style.left = r.left + 'px';
          vignette.style.top = r.top + 'px';
          vignette.style.width = r.width + 'px';
          vignette.style.height = r.height + 'px';
          lastVKey = vKey;
        }
      }

      updateDimStates(frame);
      updateTriviaLit(frame);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Double-click detection for the frame ring. Kept as a
     geometry check (frame rect vs. click point) rather than switching
     to e.target.closest('#tv-frame') now that pointer-events is auto
     -- it already worked and doesn't care either way, so there was no
     reason to touch it while making the frame draggable below.
     Excludes the knob row and the nav rail/drawers in case their rects
     ever overlap the frame's. Only counts while the frame is actually
     visible. ------ */

  function wireColorGesture(frame){
    document.addEventListener('dblclick', function(e){
      if (e.target.closest('.tv-knob, #sz-navbar, #sz-drawer-r, #tv-color-overlay')) return;
      if (frame.classList.contains('tv-frame-hidden')) return;
      if (e.target.closest('#fg-root')) return;
      var r = frame.getBoundingClientRect();
      var inRing = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inRing) openColorPicker(frame);
    });
  }

  /* ---------- Dragging the widget by its frame instead of its body --
     Larry, July 27 2026: "drag tv frame but not content." Same
     't2t-widget-pos' storage key screen-zero.js's makeWidgetDraggable
     used to write to, so this is a continuation of that one position,
     not a second competing one -- makeWidgetDraggable still restores
     it on load, this just replaces how a NEW position gets set. Since
     #tv-frame now has pointer-events:auto, this can wire directly to
     the frame element rather than needing a geometry check like the
     double/triple-click detection above. ---------- */

  function wireFrameDrag(frame, fg){
    var dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function pointOf(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      if (e.target.closest('.tv-knob')) return;
      if (frame.classList.contains('tv-frame-hidden')) return;
      var p = pointOf(e);
      dragging = true; moved = false;
      var rect = fg.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      startX = p.clientX; startY = p.clientY;
      frame.classList.add('tv-frame-dragging');
      document.body.style.userSelect = 'none';
    }

    function onMove(e){
      if (!dragging) return;
      var p = pointOf(e);
      var dx = p.clientX - startX, dy = p.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      if (e.cancelable) e.preventDefault();
      fg.style.position = 'fixed';
      fg.style.left = (startLeft + dx) + 'px';
      fg.style.top = (startTop + dy) + 'px';
      fg.style.margin = '0';
    }

    function onUp(){
      if (!dragging) return;
      dragging = false;
      frame.classList.remove('tv-frame-dragging');
      document.body.style.userSelect = '';
      if (!moved) return;
      var rect = fg.getBoundingClientRect();
      try { localStorage.setItem('t2t-widget-pos', JSON.stringify({ left: rect.left, top: rect.top })); }
      catch(e){}
    }

    frame.addEventListener('mousedown', onDown);
    frame.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
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

    // Vignette goes immediately AFTER #fg-root instead -- opposite
    // side, on purpose: it needs to paint ON TOP of the widget and
    // whatever screen content it's showing, not behind it (see the
    // injectStyle comment on #tv-vignette for why the old
    // inset-shadow-on-#fg-root approach didn't work).
    var vignette = document.createElement('div');
    vignette.id = 'tv-vignette';
    fg.parentNode.insertBefore(vignette, fg.nextSibling);

    applyColor(frame, getSavedColorKey());
    wireColorGesture(frame);
    wireFrameDrag(frame, fg);

    trackLoop(frame, fg, vignette);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
