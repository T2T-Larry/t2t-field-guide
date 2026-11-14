// header-rule.js -- Nov 14 2026 (Larry: "If you have more than one thing to say about a card, it is by definition a header").
// ONE rule for "does this text make a card a header?", used everywhere a card's words are typed or saved
// (the Idea Storyboard quick add, the New card door, the card back's SUBJECT and CONTENTS fields).
// It used to live twice (idea-storyboard-header.js and idea-capture.js); both now ask here.
//
// A card is a header when its words:
//   1. end with ':' or '?'            (the header is a question; the colon is display-only), or
//   2. say more than one thing        (more than one sentence).
// The header toggle on the card is the one way back to a subber, so there are no special cases here.
// A '3:30' or '3.5 hours' in the middle of a sentence does not trip it: a sentence break needs
// an ending mark, a space, then a new capital letter, digit, quote or bracket.
(function(){
  var ENDS_WITH_MARK=/[:?]\s*$/;
  var SENTENCE_BREAK=/[.!?]["')\]]*\s+["'(\[]?[A-Z0-9]/;

  function hasMarkAtEnd(text){ return ENDS_WITH_MARK.test(String(text||'')); }
  function hasManySentences(text){ return SENTENCE_BREAK.test(String(text||'').trim()); }
  function isHeaderText(text){ return hasMarkAtEnd(text) || hasManySentences(text); }

  window.T2THeaderRule={ isHeaderText:isHeaderText, endsWithMark:hasMarkAtEnd, hasManySentences:hasManySentences };
})();
