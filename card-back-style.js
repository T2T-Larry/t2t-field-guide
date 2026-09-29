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
  // SHAPE: landscape 5 wide : 3 tall (aspect-ratio:5/3), like a real index
  // card (Larry, Sept 29 2026: "5 wide and 3 tall" -- first cut was portrait).
  // Width 600px, capped so the height (width x 3/5 = 360px) always fits
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
      +'.fg-back-3x5{--fg-back-w:min(600px,94vw,calc(88vh * 5 / 3));width:var(--fg-back-w)!important;max-width:none!important;height:auto!important;max-height:none!important;aspect-ratio:5/3!important;overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important}'
      +'.fg-back-idband{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:8px;margin:-18px -22px 12px;padding:8px 22px;background:var(--bb-bg);border-bottom:1px solid var(--bb-accent);box-sizing:border-box}'
      +'.fg-back-idband .bb-topic-hit,.fg-back-idband .bb-boardkind-hit{flex:1 1 0;min-width:0;max-width:none;text-align:center;cursor:default;font-size:calc(13px * var(--fg-text-scale,1));padding:4px 8px;line-height:1.2}'
      +'.fg-back-idband .fg-back-empty{display:none}'
      // Two columns (Sept 29 2026, Larry: "what if the checkboxes open into the 2nd column?"): left = the fixed core + the checkbox list,
      // right = whatever the checkboxes have opened. Each opened block carries its own small title so it reads without its checkbox nearby.
      +'.fg-back-3x5 .bbw.fg-back-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:18px;align-items:start;width:100%}'
      +'.fg-back-3x5 .fg-back-left,.fg-back-3x5 .fg-back-right{min-width:0}'
      +'.fg-back-3x5 .fg-back-cols .bb-field{max-width:none;margin-bottom:8px}'
      +'.fg-back-3x5 .fg-back-right .bb-addition-body{margin:0 0 10px;padding:0 0 8px;border-bottom:1px dotted var(--bb-accent)}'
      +'.fg-back-3x5 .fg-back-right .bb-addition-body[data-fg-title]::before{content:attr(data-fg-title);display:block;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:3px}'
      // Checkbox list: smaller and darker (Larry, Sept 29 2026), flowing in rows.
      +'.fg-back-3x5 .fg-back-checks{display:flex;flex-wrap:wrap;gap:3px 14px;margin:2px 0 8px}'
      +'.fg-back-3x5 .fg-back-checks .bb-field.bb-addition{width:auto;margin:0}'
      +'.fg-back-3x5 .bb-addition-eyebrow{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;color:var(--bb-ink);opacity:1}'
      +'.fg-back-3x5 .bb-addition-label{gap:4px;line-height:12px;color:var(--bb-ink)}'
      +'.fg-back-3x5 .bb-addition-label input[type=checkbox]{width:11px;height:11px}'
      // Smaller H / M / L buttons.
      +'.fg-back-3x5 .bb-priorities{gap:3px}'
      +'.fg-back-3x5 .bb-pri-btn{flex:0 0 auto;min-width:26px;padding:2px 6px;font-size:calc(10px * var(--fg-text-scale,1));line-height:1.3}'
      +'.fg-back-3x5 .bb-field label{font-size:calc(10px * var(--fg-text-scale,1));margin-bottom:2px}'
      +'.fg-back-3x5 .bb-field textarea{min-height:44px}'
      // Icon row stays one line at the bottom of the left column.
      +'.fg-back-3x5 .bb-action-row{flex-wrap:nowrap;gap:4px;margin-top:6px}'
      +'.fg-back-idband .bb-cdrop{position:relative;flex:1 1 0;min-width:0}'
      +'.fg-back-idband .bb-icon-btn{flex:0 0 auto}';
    document.head.appendChild(st);
  }

  // The band's markup. Empty until paintBand fills it.
  // opts.projectPicker: TOPIC is a real dropdown trigger (#bb-d-project-trigger + #bb-d-project-menu) so the Briefing Card back can move the
  //   card to another topic from the band itself; paintBand leaves its text alone (the card's own project fills it).
  // opts.extraHTML: extra controls placed at the right end of the band (the PRIMARY head on the Briefing Card).
  function bandHTML(opts){
    opts=opts||{};
    injectShape();
    var topic = opts.projectPicker
      ? '<div class="bb-cdrop"><button type="button" class="bb-topic-hit bb-cdrop-trigger fg-back-topic fg-back-own" id="bb-d-project-trigger" title="Change which topic this card belongs to" style="cursor:pointer;width:100%"></button><div class="bb-cdrop-menu" id="bb-d-project-menu" hidden></div></div>'
      : '<span class="bb-topic-hit fg-back-topic"></span>';
    return '<div class="fg-back-idband">'+topic+'<span class="bb-boardkind-hit fg-back-kind"></span>'+(opts.extraHTML||'')+'</div>';
  }

  // Splits a .bbw into two columns: everything stays on the left, except each addition's opened body, which moves to the right column
  // (ids are untouched, so all show/hide wiring keeps working). The addition checkboxes gather into one small list on the left.
  function twoColumn(bbw){
    if(!bbw || bbw.classList.contains('fg-back-cols')) return;
    var left=document.createElement('div'), right=document.createElement('div');
    left.className='fg-back-left'; right.className='fg-back-right';
    while(bbw.firstChild) left.appendChild(bbw.firstChild);
    var checks=document.createElement('div'); checks.className='fg-back-checks';
    var adds=Array.prototype.slice.call(left.querySelectorAll('.bb-addition'));
    var anchor=adds.length ? adds[0] : null;
    if(anchor) anchor.parentNode.insertBefore(checks, anchor);
    adds.forEach(function(w){
      var body=w.querySelector('.bb-addition-body');
      var eb=w.querySelector('.bb-addition-eyebrow');
      if(body){ body.setAttribute('data-fg-title', eb ? eb.textContent : ''); right.appendChild(body); }
      checks.appendChild(w);
    });
    // The bottom icon row rides under the checkbox list, still in the left column.
    bbw.classList.add('fg-back-cols');
    bbw.appendChild(left); bbw.appendChild(right);
  }

  // Fill (or refresh) the band inside one card-back element from the live
  // ID Band. Safe to call every time a back opens.
  function paintBand(cardEl){
    if(!cardEl) return;
    var band=cardEl.querySelector('.fg-back-idband');
    if(!band) return;
    var t=band.querySelector('.fg-back-topic'), k=band.querySelector('.fg-back-kind');
    var tv=_liveText(TOPIC_IDS), kv=_liveText(KIND_IDS);
    if(t && !t.classList.contains('fg-back-own')){ t.textContent=tv; t.title=tv; t.classList.toggle('fg-back-empty', !tv); }
    if(k){ k.textContent=kv; k.title=kv; k.classList.toggle('fg-back-empty', !kv); }
    band.style.display = (tv||kv||(t&&t.classList.contains('fg-back-own'))) ? '' : 'none';
  }

  injectShape();

  window.FGCardBack = { inject: inject, injectShape: injectShape, bandHTML: bandHTML, twoColumn: twoColumn, paintBand: paintBand, colors: { idea: IDEA } };
})();
