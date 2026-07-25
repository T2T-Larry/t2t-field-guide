
(function () {
  function createBook(rootEl, pages, tableButtons) {
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
      if (leftContainer) leftContainer.innerHTML = pageHTML(pair[0]);
      if (rightContainer) rightContainer.innerHTML = pageHTML(pair[1]);
      // prevBtn stays enabled even at the first page — one more click closes
      // the book back to the cover (see closeBook() wiring in the page script).
      nextBtn.disabled = idx + step >= pages.length;
    }

    function flip(dir) {
      var nextIdx = idx + dir * step;
      if (nextIdx < 0 || nextIdx >= pages.length) return;
      var nextPair = pairAt(nextIdx);
      var showPage = single ? nextPair[0] : (dir > 0 ? nextPair[0] : nextPair[1]);
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
      getIndex: function () { return idx; }
    };
  }

  window.T2TBook = { createBook: createBook };
})();
