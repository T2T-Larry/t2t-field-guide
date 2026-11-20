/* ============================================================
   flag-face.js -- T2T Field Guide - shared by every board

   THE FLAGS ON THE FRONT OF A CARD, drawn in ONE place. Larry, Nov 20 2026: "One tree. One code
   whenever possible." The Briefing Board and every other board each used to work out which flags a
   card wears (custom flags, heart, gem, the Green/Yellow/Red lights), count them, write their
   tooltips and draw them, in two separate copies. Now:

     1. describe()  decides WHAT the card wears (same rules for every board).
     2. render()    draws it in the board's own LOOK (a "skin" below, kept side by side so a change
                    to a flag is made here and nowhere else).

   Use:  T2TFlagFace.html(card, options, 'briefing' | 'storyboard')   ->  the HTML for the card face
     options: keyIds     the ids of the card's custom flags
              keyById    id -> { shape, color, meaning }
              linkCount  (optional) id -> how many other cards share that flag
              hearts     true = also show the card's hearts and gems here
              alignParts the words that name a light on the card (controls/align-flags.js)
              sb         the database client (stamps a card's lights the first time its owner sees it)
              onLooksLoaded (optional) redraw once this member's own flag looks have loaded

   Every mark carries the class 'fg-flag-front-tap', so a tap on it hides the flags on the front
   (controls/flag-front-tap.js).

   TO CHANGE HOW A FLAG LOOKS ON A BOARD: edit that board's skin below.
   Used by: briefing-board/operations.js and storyboard/idea-storyboard-signal-flags.js.
   ============================================================ */
(function(){
  var TAP = 'fg-flag-front-tap';

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function shapeCSS(shape, color){
    var core = window.T2TSignalFlagCore;
    return core ? core.shapeCSS(shape, color) : ('background:' + color + ';');
  }
  function times(n){ return n >= 2 ? ' x' + n : ''; }

  // ---- 1. WHAT the card wears ----
  function describe(card, o){
    o = o || {};
    var FC = window.T2TFlagCounts, AF = window.T2TAlignFlags, out = [];
    (o.keyIds || []).filter(Boolean).forEach(function(kid){
      var k = o.keyById && o.keyById(kid); if(!k) return;
      out.push({ kind:'custom', id:kid, shape:k.shape, color:k.color, meaning:k.meaning || '',
                 count: FC ? FC.count(card, kid) : 1, links: o.linkCount ? (o.linkCount(kid) || 0) : 0 });
    });
    if(o.hearts && FC){
      var h = FC.count(card, 'heart'), g = FC.count(card, 'gem');
      if(h > 0) out.push({ kind:'heart', count:h });
      if(g > 0) out.push({ kind:'gem', count:g });
    }
    if(AF && card && o.alignParts){
      AF.onCard(card, o.alignParts).forEach(function(a){
        out.push({ kind:'light', def:a, name:a.name, count:AF.count(card, o.alignParts, a.id) });
      });
      AF.stampIfNeeded(o.sb, card, o.alignParts);                       // first sight by its owner: the card keeps these flags
      if(o.onLooksLoaded) AF.ensureLoaded(o.sb, o.onLooksLoaded);       // this member's own flag looks, once per page load
    }
    return out;
  }

  // ---- 2. HOW a board draws it (each board's look) ----
  var SKINS = {
    // Briefing Board: each flag is its own wrapped badge, count in the dark badge.
    briefing: {
      lightPx: 12,
      badge: function(n){ return window.T2TFlagCounts ? T2TFlagCounts.badgeDark(n) : ''; },
      title: function(d){
        if(d.kind === 'custom') return d.meaning + (d.links ? ' — ' + d.links + ' linked via this flag' : '');
        if(d.kind === 'heart') return 'I like this!' + times(d.count);
        if(d.kind === 'gem') return 'Important (gem)' + times(d.count);
        return d.name;
      },
      custom: function(d){ return '<span class="bb-key-badge" style="' + shapeCSS(d.shape, d.color) + '"></span>'; },
      item: function(d, mark, badge, title){ return '<span class="bb-key-badge-wrap ' + TAP + '" title="' + esc(title) + '">' + mark + badge + '</span>'; }
    },
    // Every other board: small dots in one row, count in the light badge.
    storyboard: {
      lightPx: 10,
      badge: function(n){ return window.T2TFlagCounts ? T2TFlagCounts.badge(n) : ''; },
      title: function(d){ return d.kind === 'custom' ? d.meaning + times(d.count) : (d.name || ''); },
      custom: function(d, title){ return '<span class="sb-key-dot" style="' + shapeCSS(d.shape, d.color) + '" title="' + esc(title) + '"></span>'; },
      item: function(d, mark, badge){ return '<span style="display:inline-flex;align-items:center">' + mark + badge + '</span>'; },
      outer: function(inner){ return '<div class="sb-key-dots ' + TAP + '">' + inner + '</div>'; }
    }
  };

  function markHTML(d, skin, title){
    if(d.kind === 'custom') return skin.custom(d, title);
    if(d.kind === 'heart') return '<span style="font-size:11px;line-height:1">&#10084;&#65039;</span>';
    if(d.kind === 'gem') return window.T2TFlagCounts ? T2TFlagCounts.gemIcon(12) : '';
    return window.T2TAlignFlags.markHTML(d.def, skin.lightPx);
  }

  function render(descs, skinName){
    var skin = SKINS[skinName]; if(!skin || !descs.length) return '';
    var inner = descs.map(function(d){
      var title = skin.title(d);
      return skin.item(d, markHTML(d, skin, title), skin.badge(d.count), title);
    }).join('');
    return skin.outer ? skin.outer(inner) : inner;
  }

  function html(card, options, skinName){ return render(describe(card, options), skinName); }

  window.T2TFlagFace = { html: html, describe: describe, render: render };
})();
