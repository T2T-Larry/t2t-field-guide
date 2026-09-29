/* ============================================================
   card-back-style.js -- T2T Field Guide - SHARED CARD BACK LOOK

   Sept 23 2026 -- Larry, Master BB: "Can we merge the backs of the
   Idea cards and the BB Task cards for a similar look with unique
   items only visible on appropriate cards and a simple color to
   signify where we are. Light blue for ideas and keep BB as is?"

   How the merge works:
   - The Briefing Card's back (briefing-board-styles.js) is the ONE
     source of truth for how a card back is built: title bar, field
     labels, inputs, Yes/No "Show on face of card" pills, Priority
     buttons, checkbox additions, bottom action row. All of those
     rules are written against four color variables: --bb-bg,
     --bb-accent, --bb-ink, --bb-sub.
   - The Idea Card's back (idea-storyboard-card-detail.js) now uses
     those same building blocks. This file only re-points the four
     color variables at light blue for the Idea Card (.fg-cardback-idea),
     plus a handful of fixes for Idea-only pieces (Move / View / Order,
     the contents box) so they pick up the same colors.
   - Briefing Cards are untouched -- they keep their own warm tan.

   To give some future card type its own back color, add one more
   .fg-cardback-<name> block with its own four colors. Nothing else.

   Injected once, on first open of an Idea Card (FGCardBack.inject()).
   ============================================================ */

(function(){
  var IDEA = {
    paper:  '#F2F8FD',   // card background
    bg:     '#E3F0FA',   // hover / soft fills
    accent: '#7FB2DD',   // edges, borders, top stripe, "Yes" pill
    ink:    '#1A3A5C',   // main text
    sub:    '#4A6D8C'    // labels, eyebrows
  };

  function inject(){
    if(document.getElementById('fg-cardback-style')) return;
    var st=document.createElement('style');
    st.id='fg-cardback-style';
    var c=IDEA;
    st.textContent=''
      // Color variables -- every shared Briefing Card rule reads these.
      +'.fg-cardback-idea{--bb-bg:'+c.bg+';--bb-accent:'+c.accent+';--bb-ink:'+c.ink+';--bb-sub:'+c.sub+';--bb-head-font:"Playfair Display",serif;--bb-body-font:Georgia,serif}'
      // Frame -- same size/shape as the Briefing Card, light blue paper.
      // Extra class weight so the older Idea-card frame rules
      // (.sc-overlay-card / .sb-details-card) can't win.
      +'.sc-overlay-card.sb-details-card.fg-cardback-idea{width:340px;max-width:90vw;max-height:min(640px,90vh);overflow-y:auto;background:'+c.paper+';border-radius:8px;border-top:6px solid var(--bb-accent);box-shadow:0 10px 30px rgba(26,58,92,0.30);box-sizing:border-box;padding:18px 22px 22px;text-align:left;display:block;font-family:var(--bb-body-font);color:var(--bb-ink)}'
      +'.sc-overlay-card.sb-details-card.fg-cardback-idea::after{display:none}'
      // Idea-only pieces, recolored to match.
      +'.fg-cardback-idea .sb-hdr-eyebrow2{font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;color:var(--bb-sub)}'
      +'.fg-cardback-idea .sb-view-frame{border:1.5px solid var(--bb-accent);color:var(--bb-ink);border-radius:4px}'
      +'.fg-cardback-idea #sb-order-up,.fg-cardback-idea #sb-order-down{border:1.5px solid var(--bb-accent)!important;border-radius:4px!important}'
      +'.fg-cardback-idea .sb-body-box{border:1.5px solid var(--bb-accent);border-radius:4px;margin-bottom:0}'
      +'.fg-cardback-idea .sb-body-text{color:var(--bb-ink)}'
      +'.fg-cardback-idea #sb-text-input{border:1.5px solid var(--bb-accent)!important;border-radius:4px!important}'
      +'.fg-cardback-idea .sb-blue-btn,.fg-cardback-idea .sb-blue-btn-sm{border:1.5px solid var(--bb-accent);border-radius:4px;color:var(--bb-ink)}'
      +'.fg-cardback-idea .sb-swatch{border-color:var(--bb-accent)!important}'
      +'.fg-cardback-idea .bb-addition-body textarea{min-height:60px}';
    document.head.appendChild(st);
  }

  // ============================================================
  // SHARED 3x5 SHAPE + ID BAND, Sept 29 2026 -- Larry: "Backs of cards:
  // shape them like the cards themselves in 3x5 proportion with the top
  // of the back of the cards also displaying the ID BAND."
  //
  // Applies to every card back that uses the shared Briefing Card back
  // building blocks: the Briefing Card back (#bb-detail-overlay) and the
  // Idea Card back (.sb-details-card). Both opt in with the class
  // fg-back-3x5 and put FGCardBack.bandHTML() as the card's first child.
  //
  // SHAPE: portrait 3 wide : 5 tall (aspect-ratio:3/5). The width is the
  // old 340px, capped so the height (width x 5/3 = ~567px) always fits
  // the window; the one number to change to flip orientation or size is
  // --fg-back-w plus the aspect-ratio below. Content taller than the card
  // scrolls INSIDE it -- the card itself never grows past 3x5.
  //
  // ID BAND: the same two fields every board's ID Band carries (TOPIC and
  // Board Type), drawn with the boards' own .bb-topic-hit/.bb-boardkind-hit
  // look and sticky at the top so it stays visible while the back scrolls.
  // The text is read live from the ID Band of the board the card is
  // sitting on (paintBand), so it can never drift from what the band
  // behind the card says -- one source of truth, no second copy.
  // ============================================================
  var TOPIC_IDS = ['bb-topic-hit','sc-topic-text'];
  var KIND_IDS  = ['bb-boardkind-trigger','sc-board-kind-trigger'];

  function _liveText(ids){
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(!el) continue;
      var t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(t && t!=='…' && t!=='...') return t;
    }
    return '';
  }

  function injectShape(){
    if(document.getElementById('fg-cardback-shape-style')) return;
    var st=document.createElement('style');
    st.id='fg-cardback-shape-style';
    st.textContent=''
      // !important on the frame numbers: the Briefing Card, Idea Card and
      // older Idea frame rules all set their own width/max-height and are
      // injected at different times, so source order can't be relied on.
      +'.fg-back-3x5{--fg-back-w:min(340px,90vw,calc(88vh * 0.6));width:var(--fg-back-w)!important;max-width:none!important;height:auto!important;max-height:none!important;aspect-ratio:3/5!important;overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important}'
      +'.fg-back-idband{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:8px;margin:-18px -22px 12px;padding:8px 22px;background:var(--bb-bg);border-bottom:1px solid var(--bb-accent);box-sizing:border-box}'
      +'.fg-back-idband .bb-topic-hit,.fg-back-idband .bb-boardkind-hit{flex:1 1 0;min-width:0;max-width:none;text-align:center;cursor:default;font-size:calc(13px * var(--fg-text-scale,1));padding:4px 8px;line-height:1.2}'
      +'.fg-back-idband .fg-back-empty{display:none}';
    document.head.appendChild(st);
  }

  // The band's markup. Empty until paintBand fills it.
  function bandHTML(){
    injectShape();
    return '<div class="fg-back-idband"><span class="bb-topic-hit fg-back-topic"></span><span class="bb-boardkind-hit fg-back-kind"></span></div>';
  }

  // Fill (or refresh) the band inside one card-back element from the live
  // ID Band. Safe to call every time a back opens.
  function paintBand(cardEl){
    if(!cardEl) return;
    var band=cardEl.querySelector('.fg-back-idband');
    if(!band) return;
    var t=band.querySelector('.fg-back-topic'), k=band.querySelector('.fg-back-kind');
    var tv=_liveText(TOPIC_IDS), kv=_liveText(KIND_IDS);
    if(t){ t.textContent=tv; t.title=tv; t.classList.toggle('fg-back-empty', !tv); }
    if(k){ k.textContent=kv; k.title=kv; k.classList.toggle('fg-back-empty', !kv); }
    band.style.display = (tv||kv) ? '' : 'none';
  }

  injectShape();

  window.FGCardBack = { inject: inject, injectShape: injectShape, bandHTML: bandHTML, paintBand: paintBand, colors: { idea: IDEA } };
})();
