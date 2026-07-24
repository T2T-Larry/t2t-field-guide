
(function () {
  function createBook(rootEl, pages, tableButtons) {
    var idx = 0;
    var spread = rootEl.querySelector('.book-spread');
    var leftEye = rootEl.querySelector('.book-page.left .book-eyebrow');
    var leftTitle = rootEl.querySelector('.book-page.left .book-title');
    var leftBody = rootEl.querySelector('.book-page.left .book-body');
    var leftFolio = rootEl.querySelector('.book-page.left .book-folio');
    var rightEye = rootEl.querySelector('.book-page.right .book-eyebrow');
    var rightTitle = rootEl.querySelector('.book-page.right .book-title');
    var rightBody = rootEl.querySelector('.book-page.right .book-body');
    var rightFolio = rootEl.querySelector('.book-page.right .book-folio');
    var turnPage = rootEl.querySelector('.book-turn-page');
    var prevBtn = rootEl.querySelector('.book-arrow.prev');
    var nextBtn = rootEl.querySelector('.book-arrow.next');

    function pairAt(i) {
      var left = pages[i] || null;
      var right = pages[i + 1] || null;
      return [left, right];
    }

    function fillSide(eyeEl, titleEl, bodyEl, folioEl, page) {
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
      fillSide(rightEye, rightTitle, rightBody, rightFolio, pair[1]);
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx + 2 >= pages.length;
    }

    function flip(dir) {
      var nextIdx = idx + dir * 2;
      if (nextIdx < 0 || nextIdx >= pages.length) return;
      var nextPair = pairAt(nextIdx);
      var showPage = dir > 0 ? nextPair[0] : nextPair[1];
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

    return { goTo: function (i) { idx = i; render(); } };
  }

  window.T2TBook = { createBook: createBook };
})();
