/* ============================================================
   T2T HUB SCREEN -- what the open desktop shows in its middle.
   Oct 21 2026, Larry: "There are several additions to the T2T HUB
   CONTENTS which need to appear on the T2T HUB screen now." Mirrors the
   CONTENTS header of the T2T HUB topic on the VISION board:
     - T2T / Thoughts to Things
     - a visual symbol for each BOARD type, each one a weenie that travels
       to that board (same list and same opener as the tray's buttons)
     - the two questions: What is T2T? / How does a thought become a thing?
       (their headers on the board are still empty, so for now they say
       they are coming)
   Shows only on the open desk: hidden while the Field Guide widget is
   open and while any full-screen board is up.
   ============================================================ */
(function(){
  var STYLE_ID = 't2t-hub-screen-style';
  var QUESTIONS = [
    { id: 'hub-what-is-t2t', label: 'What is T2T?' },
    { id: 'hub-how-thought-becomes-thing', label: 'How does a thought become a thing?' }
  ];

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '#t2t-hub-screen{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
      +   'z-index:1;width:min(640px,calc(100vw - 460px));min-width:360px;display:flex;flex-direction:column;'
      +   'align-items:center;gap:22px;user-select:none;-webkit-user-select:none}'
      + '#t2t-hub-screen .hub-title{font-family:"Playfair Display",Georgia,serif;font-weight:700;'
      +   'font-size:min(9vw,84px);letter-spacing:0.12em;line-height:1;color:rgba(0,0,0,.55)}'
      + '#t2t-hub-screen .hub-sub{font-family:"Playfair Display",Georgia,serif;font-size:min(2.6vw,24px);'
      +   'letter-spacing:0.08em;color:rgba(0,0,0,.45);margin-top:-12px}'
      + '#t2t-hub-screen .hub-boards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:100%}'
      + '#t2t-hub-screen .hub-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +   'gap:6px;padding:16px 8px;background:rgba(255,255,255,.7);border:1.5px solid rgba(0,0,0,.18);'
      +   'border-radius:14px;cursor:pointer;font-family:inherit;color:#1a3a5c;'
      +   'box-shadow:0 2px 8px rgba(0,0,0,.12);transition:transform .12s,box-shadow .12s}'
      + '#t2t-hub-screen .hub-tile:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.2);background:#fff}'
      + '#t2t-hub-screen .hub-symbol{font-size:40px;line-height:1}'
      + '#t2t-hub-screen .hub-name{font-size:15px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}'
      + '#t2t-hub-screen .hub-questions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;width:100%}'
      + '#t2t-hub-screen .hub-question{padding:10px 18px;background:rgba(255,255,255,.55);'
      +   'border:1.5px dashed rgba(0,0,0,.28);border-radius:999px;cursor:pointer;font-family:inherit;'
      +   'font-size:15px;color:#1a3a5c}'
      + '#t2t-hub-screen .hub-question:hover{background:#fff}'
      // Only on the open desk: not under the Field Guide widget, not over a full-screen board.
      + 'body:not(.t2t-desk-closed) #t2t-hub-screen,'
      +   'body:has(#fg-root.isx-full) #t2t-hub-screen,'
      +   'body.t2t-bare-screen #t2t-hub-screen{display:none!important}'
      // The hub carries its own T2T title, so the faint embossed one steps aside when it shows.
      + 'body.t2t-desk-closed:not(.t2t-bare-screen) #sz-t2t-watermark{display:none}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function toast(msg){
    if (window.T2T && window.T2T.toast) { window.T2T.toast(msg); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:rgba(10,74,56,.92);color:#fff;padding:8px 18px;border-radius:18px;z-index:10050;font-size:14px';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2200);
  }

  function build(){
    if (document.getElementById('t2t-hub-screen')) return;
    var sys = window.SZDrawerSystem;
    if (!sys || !sys.hubBoards || !sys.openHubBoard) return;
    injectStyle();
    var wrap = document.createElement('div');
    wrap.id = 't2t-hub-screen';

    var title = document.createElement('div'); title.className = 'hub-title'; title.textContent = 'T2T';
    var sub = document.createElement('div'); sub.className = 'hub-sub'; sub.textContent = 'Thoughts to Things';
    wrap.appendChild(title); wrap.appendChild(sub);

    var grid = document.createElement('div'); grid.className = 'hub-boards';
    sys.hubBoards.forEach(function(entry){
      var tile = document.createElement('button');
      tile.type = 'button'; tile.className = 'hub-tile'; tile.title = 'Go to ' + entry.label;
      var sym = document.createElement('span'); sym.className = 'hub-symbol'; sym.textContent = entry.symbol || '';
      var name = document.createElement('span'); name.className = 'hub-name'; name.textContent = entry.label;
      tile.appendChild(sym); tile.appendChild(name);
      tile.addEventListener('click', function(){ sys.openHubBoard(entry); });
      grid.appendChild(tile);
    });
    wrap.appendChild(grid);

    var qs = document.createElement('div'); qs.className = 'hub-questions';
    QUESTIONS.forEach(function(q){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hub-question'; b.textContent = q.label;
      b.addEventListener('click', function(){ toast(q.label + ' — coming soon.'); });
      qs.appendChild(b);
    });
    wrap.appendChild(qs);

    document.body.insertBefore(wrap, document.body.children[1] || null);
  }

  window.T2THubScreen = { build: build };
})();
