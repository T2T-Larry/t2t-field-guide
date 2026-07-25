
(function () {
  function createBook(rootEl, pages, tableButtons, onRender) {
    var idx = 0;
    // Single-page (binder-single) markup has just one .book-page with no
    // left/right split; two-page (spread) markup -- the desktop pilot's
    // binder view, and the older standalone prototype -- has a
    // .book-page.left and .book-page.right pair. Detect which markup is
    // present so both keep working from the same engine.
    var rightPage = rootEl.querySelector('.book-page.right');
    var single = !rightPage;
    var step = single ? 1 : 2;

    var leftContainer = single
      ? rootEl.querySelector('.book-page')
      : rootEl.querySelector('.book-page.left');
    var rightContainer = single ? null : rootEl.querySelector('.book-page.right');

    var turnPage = rootEl.querySelector('.book-turn-page');
    var prevBtn = rootEl.querySelector('.book-arrow.prev');
    var nextBtn = rootEl.querySelector('.book-arrow.next');

    function pairAt(i) {
      if (single) return [pages[i] || null];
      return [pages[i] || null, pages[i + 1] || null];
    }

    // A page can either supply raw `html` (used to embed the Field
    // Guide's own real screens verbatim, styled by their own real
    // classes -- see the .site-embed rules in book-engine.css) or the
    // older structured eyebrow/title/body/folio fields for a simple
    // text page. Either way this returns one HTML string to drop into
    // a page container.
    function pageHTML(page) {
      if (!page) return '';
      if (page.html !== undefined) return page.html;
      return '<div class="book-eyebrow">' + (page.eyebrow || '') + '</div>' +
        '<div class="book-title">' + (page.title || '') + '</div>' +
        '<div class="book-body">' + (page.body || '') + '</div>' +
        '<div class="book-folio">' + (page.folio || '') + '</div>';
    }

    function render() {
      var pair = pairAt(idx);
      if (leftContainer) {
        leftContainer.innerHTML = pageHTML(pair[0]);
        leftContainer.classList.toggle('blank', !!(pair[0] && pair[0].blank));
      }
      if (rightContainer) {
        rightContainer.innerHTML = pageHTML(pair[1]);
        rightContainer.classList.toggle('blank', !!(pair[1] && pair[1].blank));
      }
      // prevBtn stays enabled even at the first page — one more click closes
      // the book back to the cover (see closeBook() wiring in the page script).
      nextBtn.disabled = idx + step >= pages.length;
      if (onRender) onRender(idx, pages.length);
    }

    // The green placeholder frame lays the two pages out with a gap
    // between them (not a single continuous spread), so the flipping
    // overlay's box has to be measured from the real right-hand page
    // each time rather than assumed to be a fixed "right half" via CSS.
    function syncTurnPageBox() {
      if (single || !rightContainer) return;
      turnPage.style.left = rightContainer.offsetLeft + 'px';
      turnPage.style.top = rightContainer.offsetTop + 'px';
      turnPage.style.right = 'auto';
      turnPage.style.width = rightContainer.offsetWidth + 'px';
      turnPage.style.height = rightContainer.offsetHeight + 'px';
    }

    // Puts the prev/next arrows directly under the page they belong to --
    // prev centered under the left page's folio number, next centered
    // under the right page's -- instead of grouped in the middle of the
    // frame. Only meaningful in two-page (binder) mode, and only accurate
    // once the book is actually visible (display isn't none), so callers
    // should invoke this after the book is shown, not just at creation.
    function syncNavArrows() {
      if (single || !rightContainer || !leftContainer) return;
      var leftCenter = leftContainer.offsetLeft + leftContainer.offsetWidth / 2;
      var rightCenter = rightContainer.offsetLeft + rightContainer.offsetWidth / 2;
      prevBtn.style.position = 'absolute';
      prevBtn.style.left = leftCenter + 'px';
      prevBtn.style.right = 'auto';
      prevBtn.style.transform = 'translateX(-50%)';
      nextBtn.style.position = 'absolute';
      nextBtn.style.left = rightCenter + 'px';
      nextBtn.style.right = 'auto';
      nextBtn.style.transform = 'translateX(-50%)';
    }

    // Puts the phase-tab rail's own top/height so it exactly spans the
    // right-hand page's real top-to-bottom extent, instead of guessing
    // at a percentage/pixel offset from the frame -- percentages for an
    // absolutely positioned top/bottom are resolved against the
    // containing block's HEIGHT, while the page's own padding-driven
    // inset is resolved against its WIDTH, so the two were never
    // actually comparable numbers to begin with. rightContainer's
    // offsetParent is .book-spread, which itself sits flush at (0,0)
    // inside .book-frame (.binder-tabs' own offsetParent) with no
    // margin or padding between them, so rightContainer's offsetTop/
    // offsetHeight are already valid numbers for .binder-tabs too.
    // Same visibility caveat as syncNavArrows -- only accurate once the
    // book is actually shown.
    function syncTabRail() {
      if (single || !rightContainer) return;
      var tabs = rootEl.querySelector('.binder-tabs');
      if (!tabs) return;
      tabs.style.top = rightContainer.offsetTop + 'px';
      tabs.style.bottom = 'auto';
      tabs.style.height = rightContainer.offsetHeight + 'px';
    }

    function flip(dir) {
      var nextIdx = idx + dir * step;
      if (nextIdx < 0 || nextIdx >= pages.length) return;
      var nextPair = pairAt(nextIdx);
      var showPage = single ? nextPair[0] : (dir > 0 ? nextPair[0] : nextPair[1]);
      syncTurnPageBox();
      turnPage.innerHTML = pageHTML(showPage);
      turnPage.style.display = 'block';
      turnPage.style.transition = 'none';
      turnPage.style.transform = 'rotateY(0deg)';
      requestAnimationFrame(function () {
        turnPage.style.transition = 'transform .5s ease';
        turnPage.style.transform = 'rotateY(-180deg)';
      });
      setTimeout(function () {
        idx = nextIdx;
        render();
        turnPage.style.display = 'none';
      }, 520);
    }

    prevBtn.addEventListener('click', function () { flip(-1); });
    nextBtn.addEventListener('click', function () { flip(1); });
    render();

    return {
      goTo: function (i) { idx = i; render(); },
      getIndex: function () { return idx; },
      syncNavArrows: syncNavArrows,
      syncTabRail: syncTabRail
    };
  }

  window.T2TBook = { createBook: createBook };
})();
