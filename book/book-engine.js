
(function () {
  function createBook(rootEl, pages, tableButtons) {
    var idx = 0;
    // Single-page (binder) markup has just one .book-page with no
    // left/right split; two-page (spread) markup -- still used by the
    // older standalone prototype -- has a .book-page.left and
    // .book-page.right pair. Detect which markup is present so both
    // keep working from the same engine.
    var rightPage = rootEl.querySelector('.book-page.right');
    var single = !rightPage;
    var step = single ? 1 : 2;

    var leftEye, leftTitle, leftBody, leftFolio;
    var rightEye, rightTitle, rightBody, rightFolio;
    if (single) {
      var page = rootEl.querySelector('.book-page');
      leftEye = page.querySelector('.book-eyebrow');
      leftTitle = page.querySelector('.book-title');
      leftBody = page.querySelector('.book-body');
      leftFolio = page.querySelector('.book-folio');
    } else {
      leftEye = rootEl.querySelector('.book-page.left .book-eyebrow');
      leftTitle = rootEl.querySelector('.book-page.left .book-title');
      leftBody = rootEl.querySelector('.book-page.left .book-body');
      leftFolio = rootEl.querySelector('.book-page.left .book-folio');
      rightEye = rootEl.querySelector('.book-page.right .book-eyebrow');
      rightTitle = rootEl.querySelector('.book-page.right .book-title');
      rightBody = rootEl.querySelector('.book-page.right .book-body');
      rightFolio = rootEl.querySelector('.book-page.right .book-folio');
    }
    var turnPage = rootEl.querySelector('.book-turn-page');
    var prevBtn = rootEl.querySelector('.book-arrow.prev');
    var nextBtn = rootEl.querySelector('.book-arrow.next');

    function pairAt(i) {
      if (single) return [pages[i] || null];
      var left = pages[i] || null;
      var right = pages[i + 1] || null;
      return [left, right];
    }

    function fillSide(eyeEl, titleEl, bodyEl, folioEl, page) {
      if (!eyeEl) return;
      if (!page) {
        eyeEl.textContent = '';
        titleEl.textContent = '';
        bodyEl.textContent = '';
        folioEl.textContent = '';
        return;
      }
      eyeEl.textContent = page.eyebrow || '';
      titleEl.textContent = page.title || '';
      bodyEl.textContent = page.body || '';
      folioEl.textContent = page.folio || '';
    }

    function render() {
      var pair = pairAt(idx);
      fillSide(leftEye, leftTitle, leftBody, leftFolio, pair[0]);
      if (!single) fillSide(rightEye, rightTitle, rightBody, rightFolio, pair[1]);
      // prevBtn stays enabled even at the first page — one more click closes
      // the book back to the cover (see closeBook() wiring in the page script).
      nextBtn.disabled = idx + step >= pages.length;
    }

    function flip(dir) {
      var nextIdx = idx + dir * step;
      if (nextIdx < 0 || nextIdx >= pages.length) return;
      var nextPair = pairAt(nextIdx);
      var showPage = single ? nextPair[0] : (dir > 0 ? nextPair[0] : nextPair[1]);
      turnPage.innerHTML =
        '<div class="book-eyebrow">' + (showPage ? showPage.eyebrow || '' : '') + '</div>' +
        '<div class="book-title">' + (showPage ? showPage.title || '' : '') + '</div>' +
        '<div class="book-body">' + (showPage ? showPage.body || '' : '') + '</div>';
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
