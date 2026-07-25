/* TEMPORARY dev-only widget for the book-view-project pilot. Shows a
   small light in the corner while the live preview link is still
   catching up to the latest pushed change -- the preview runs through
   a caching proxy that can lag behind a push by anywhere from under a
   minute to several minutes. Once it's caught up, the light blends
   into the page background instead of staying lit, so it disappears
   rather than sitting there as a permanent green dot. Click it any
   time for a fresh, cache-busting reload.

   Safe to delete this whole file plus its <script> tag in
   intro-desktop.html once the pilot is done -- nothing else on the
   page depends on it.

   No bookkeeping required: it compares git's own content hash for the
   watched files (from GitHub's API, always accurate) against a hash
   computed from whatever the preview link is currently serving, so
   there's no separate "version" file to keep in sync by hand. */
(function () {
  var REPO = 'T2T-Larry/t2t-field-guide';
  var BRANCH = 'book-view-project';
  var WATCH_FILES = ['book/desktop-scene.js', 'book/desktop-scene.css', 'book/book-engine.css', 'book/book-engine.js', 'book/intro-desktop.html', 'book/refresh-light.js'];
  var POLL_MS = 90000;

  var light = document.createElement('div');
  light.title = 'Checking whether the preview has caught up to the latest change...';
  light.style.cssText = [
    'position:fixed', 'left:12px', 'bottom:12px', 'width:14px', 'height:14px',
    'border-radius:50%', 'background:#999', 'box-shadow:0 0 4px rgba(0,0,0,.4)',
    'border:1px solid rgba(0,0,0,.3)', 'cursor:pointer', 'z-index:99999',
    'transition:background .3s'
  ].join(';');
  document.body.appendChild(light);

  light.addEventListener('click', function () {
    location.href = location.pathname + '?r=' + Date.now();
  });

  // Second half of the drag-everything-into-place workflow: once
  // Larry's dragged the binder and everything in it to where he wants,
  // clicking this copies down exactly what's saved in THIS browser's
  // localStorage for every draggable object, formatted as a ready-to-
  // paste DEFAULT_POSITIONS block -- so those spots become the new
  // baseline for everyone instead of staying a one-browser-only
  // override. Sits right next to the sync light since both are the
  // same kind of temporary pilot tooling.
  var lockBtn = document.createElement('button');
  lockBtn.type = 'button';
  lockBtn.textContent = 'Lock Layout';
  lockBtn.style.cssText = [
    'position:fixed', 'left:34px', 'bottom:9px', 'padding:4px 10px',
    'font:11px \'Playfair Display\', Georgia, serif', 'border-radius:12px',
    'border:1px solid rgba(0,0,0,.3)', 'background:#fff', 'color:#333',
    'cursor:pointer', 'z-index:99999', 'box-shadow:0 0 4px rgba(0,0,0,.25)'
  ].join(';');
  lockBtn.title = 'Copy every dragged object\'s current position, ready to paste into DEFAULT_POSITIONS.';
  document.body.appendChild(lockBtn);

  lockBtn.addEventListener('click', function () {
    var sceneEl = document.querySelector('.desktop-scene');
    var code = sceneEl && window.T2TDesktopScene
      ? window.T2TDesktopScene.exportPositions(sceneEl)
      : '';
    var done = function (ok) {
      lockBtn.textContent = ok ? 'Copied!' : 'Copy failed -- see console';
      if (!ok) console.log(code);
      setTimeout(function () { lockBtn.textContent = 'Lock Layout'; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  });

  async function gitBlobSha1(text) {
    var enc = new TextEncoder();
    var contentBytes = enc.encode(text);
    var header = enc.encode('blob ' + contentBytes.length + '\0');
    var full = new Uint8Array(header.length + contentBytes.length);
    full.set(header, 0);
    full.set(contentBytes, header.length);
    var digest = await crypto.subtle.digest('SHA-1', full);
    return Array.from(new Uint8Array(digest)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  async function fileIsFresh(path) {
    var apiUrl = 'https://api.github.com/repos/' + REPO + '/contents/' + path + '?ref=' + BRANCH;
    var apiRes = await fetch(apiUrl);
    if (!apiRes.ok) return null;
    var apiJson = await apiRes.json();
    var latestSha = apiJson.sha;

    var rawUrl = 'https://raw.githack.com/' + REPO + '/' + BRANCH + '/' + path + '?b=' + Date.now();
    var rawRes = await fetch(rawUrl);
    if (!rawRes.ok) return null;
    var rawText = await rawRes.text();
    var rawSha = await gitBlobSha1(rawText);
    return rawSha === latestSha;
  }

  async function checkAll() {
    try {
      var results = await Promise.all(WATCH_FILES.map(fileIsFresh));
      if (results.some(function (r) { return r === null; })) return;
      var allFresh = results.every(Boolean);
      // Blend into whatever is actually painted behind the light --
      // that's the desk scene's own background, not the plain page
      // body, since the desk covers the full viewport underneath it.
      var bgEl = document.querySelector('.desktop-scene') || document.body;
      var bg = getComputedStyle(bgEl).backgroundColor;
      light.style.background = allFresh ? bg : '#999';
      light.title = allFresh
        ? 'The preview is caught up to the latest change. Click to refresh.'
        : 'Still waiting for the preview to catch up to the latest change...';
    } catch (e) {
      // Quietly retry on the next cycle.
    }
  }

  checkAll();
  setInterval(checkAll, POLL_MS);
})();
