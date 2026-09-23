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

  window.FGCardBack = { inject: inject, colors: { idea: IDEA } };
})();
