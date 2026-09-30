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

  // Sept 30 2026 (Larry: a Blue Sky Parking Lot card's back said MASTER BRIEFING) -- the Briefing Board's band elements stay in the page,
  // hidden, after you leave it, and this used to take the first id with any text -- so a hidden BB band beat the Blue Sky band actually
  // on screen. Two guards now: each board passes its OWN ids (BOARD_IDS below), and within a list an element that is really on screen
  // wins over one that is not.
  var BOARD_IDS = {
    idea: { topic:['sc-topic-text'],  kind:['sc-board-kind-trigger'] },
    bb:   { topic:['bb-topic-hit'],   kind:['bb-boardkind-trigger'] }
  };
  function _liveText(ids){
    var hidden='';
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(!el) continue;
      var t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!t || t==='…' || t==='...') continue;
      if(el.getClientRects().length) return t;
      if(!hidden) hidden=t;
    }
    return hidden;
  }

  function injectShape(){
    if(document.getElementById('fg-cardback-shape-style')) return;
    var st=document.createElement('style');
    st.id='fg-cardback-shape-style';
    st.textContent=''
      // !important on the frame numbers: the Briefing Card, Idea Card and
      // older Idea frame rules all set their own width/max-height and are
      // injected at different times, so source order can't be relied on.
      +'.fg-back-3x5{--fg-back-w:min(640px,94vw,calc(88vh * 5 / 3));width:var(--fg-back-w)!important;max-width:none!important;height:auto!important;max-height:none!important;aspect-ratio:5/3!important;overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important;border-radius:0!important;border-top:0!important;padding-top:0!important;scrollbar-width:thin}'
      +'.fg-back-idband{position:sticky;top:0;z-index:6;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:0 0 8px -22px;width:calc(100% + 44px);max-width:none;align-self:flex-start;padding:4px 22px;background:inherit;border:0;border-bottom:1px solid var(--bb-accent);box-sizing:border-box}'
      +'.fg-back-idl{justify-self:start}.fg-back-idr{justify-self:end;display:flex;align-items:center;gap:6px}'
      +'.fg-back-idc{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0}'
      +'.fg-back-idband .bb-topic-hit,.fg-back-idband .bb-boardkind-hit{flex:0 1 auto;min-width:0;max-width:170px;text-align:center;cursor:default;font-size:calc(13px * var(--fg-text-scale,1));padding:4px 10px;line-height:1.2}'
      +'.fg-back-idband .bb-cdrop{position:relative;flex:0 1 auto;min-width:0}'
      +'.fg-back-idband .fg-back-empty{display:none}'
      // Layout (Sept 29 2026, Larry, round 2): the card is ONE full-width column -- except the checkbox region, which is two columns:
      // opened blocks on the left, the small dark checkbox list on the right. Each opened block carries its own small title.
      +'.fg-back-3x5 .bbw .bb-field{max-width:none;margin-bottom:8px}'
      +'.fg-back-region{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:12px;align-items:start;width:100%}'
      +'.fg-back-open{min-width:0}'
      +'.fg-back-open .bb-addition-body,.fg-back-daterow .bb-addition-body{margin:0 0 8px;padding:0 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      +'.fg-back-3x5 .bb-addition-body[data-fg-title]::before{content:attr(data-fg-title);display:block;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:3px}'
      +'.fg-back-checks{display:flex;flex-direction:column;gap:1px;padding-right:12px;border-right:1px solid var(--bb-accent);min-width:88px;align-self:stretch}'
      +'.fg-back-checks .bb-field.bb-addition{width:auto;margin:0}'
      +'.fg-back-checks .bb-addition-label{min-height:0}'
      +'.fg-back-checks #bb-d-add-notes-wrap{display:none}'
      // Priority + Subject share one line; Show-on-front sits right under it.
      +'.fg-back-toprow{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:end;width:100%}'
      +'.fg-back-toprow .bb-field{margin-bottom:4px}'
      +'#bb-detail-overlay .fg-back-task .bb-front-check{margin:2px 0 0}'
      +'.fg-back-toprow .bb-field:first-child{justify-self:start;width:auto}'
      +'.fg-back-toprow .bb-field:last-child{grid-column:2;width:200px;max-width:100%;min-width:0}'
      // Start Date + Due Date on one line (Add-to-Calendar stays in the bottom icon row).
      +'.fg-back-daterow{display:flex;gap:10px;align-items:flex-end}'
      +'.fg-back-daterow .bb-addition-body{flex:1 1 0;min-width:0}'
      +'.fg-back-daterow .bb-date-row{gap:3px;flex-wrap:wrap}'
      +'.fg-back-daterow .bb-date-row input[type=text]{min-width:0;flex:1 1 64px}'
      +'.fg-back-daterow .bb-date-row .bb-date-time{flex:0 1 48px}'
      // Utility extras (Duplicate) show with the gear's swatch row.
      +'.fg-back-util-extra{display:none;flex-direction:column;align-items:flex-start;gap:6px;margin-top:4px;width:100%}'
      +'.fg-back-util-extra .bb-field{margin:0;width:100%}'
      +'.fg-back-util-extra .bb-addition-body{margin-top:3px}'
      +'#bb-d-color-row[style*="display: flex"] + .fg-back-util-extra{display:flex}'
      // Checkbox list: smaller and darker (Larry, Sept 29 2026).
      +'.fg-back-3x5 .bb-addition-eyebrow{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;color:var(--bb-ink);opacity:1}'
      +'.fg-back-3x5 .bb-addition-label{gap:4px;line-height:12px;color:var(--bb-ink)}'
      +'.fg-back-3x5 .bb-addition-label input[type=checkbox]{width:11px;height:11px}'
      // Smaller H / M / L buttons.
      +'.fg-back-3x5 .bb-priorities{gap:3px}'
      +'.fg-back-3x5 .bb-pri-btn{flex:0 0 auto;min-width:26px;padding:2px 6px;font-size:calc(10px * var(--fg-text-scale,1));line-height:1.3}'
      +'.fg-back-3x5 .bb-field label{font-size:calc(10px * var(--fg-text-scale,1));margin-bottom:2px}'
      +'.fg-back-3x5 .bb-field textarea{min-height:36px}'
      // One icon row across the bottom; pencil lights up while Notes is open.
      // Full card width so its top line runs edge to edge; the buttons themselves ride the right end.
      +'.fg-back-3x5 .bb-action-row{flex-wrap:nowrap;justify-content:flex-end;gap:6px;margin:auto 0 0 -22px;padding:4px 22px 0;width:calc(100% + 44px);max-width:none;align-self:flex-start;box-sizing:border-box}'
      +'#bb-detail-overlay .fg-back-3x5{padding-bottom:8px!important}'
      // Briefing Card back only: the card is a column so its icon row rides the lower right corner.
      +'#bb-detail-overlay .fg-back-3x5{display:flex;flex-direction:column}'
      +'#bb-detail-overlay .fg-back-3x5 .fg-back-idband{flex:0 0 auto}'
      +'#bb-detail-overlay .fg-back-3x5 .bbw{flex:1 0 auto}'
      // Task is exactly three full lines tall (Larry, Sept 29 2026); it scrolls inside itself past that.
      +'#bb-detail-overlay .fg-back-3x5 .fg-back-task textarea{line-height:1.25;height:calc(3.75em + 10px);min-height:0;box-sizing:border-box;resize:none;overflow-y:auto}'
      +'.fg-back-3x5 .bb-action-row .bb-icon-btn{flex:0 0 auto;width:24px;height:24px;min-width:0;padding:0;font-size:calc(11px * var(--fg-text-scale,1));border-width:1px}'
      +'.fg-back-3x5 .bb-icon-btn.fg-on{background:var(--bb-bg);border-color:var(--bb-ink)}'
      // ID Band: title upper-left on two lines (checkbox-label size), small head + X the same size.
      +'.fg-back-title{flex:0 0 auto;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;line-height:.9;text-transform:uppercase;color:var(--bb-ink);white-space:nowrap;cursor:grab}'
      +'.fg-back-idband .bb-icon-btn,.fg-back-idband .bb-close{flex:0 0 auto;width:26px;height:26px;min-width:0;padding:0;font-size:calc(13px * var(--fg-text-scale,1))}'
      +'.fg-back-idband .bb-cdrop{position:relative;flex:1 1 0;min-width:0}'
      // Blue Sky (Idea) card back -- same 5x3 recipe as the Briefing Card back (Sept 30 2026): a column, the content block grows, the icon row rides the bottom.
      +'.sc-overlay-card.sb-details-card.fg-cardback-idea.fg-back-3x5{display:flex;flex-direction:column;padding-bottom:8px!important}'
      +'.fg-cardback-idea.fg-back-3x5 .fg-back-idband{flex:0 0 auto}'
      +'.fg-cardback-idea.fg-back-3x5 .bbw{flex:1 0 auto;align-items:flex-start}'
      +'.fg-cardback-idea.fg-back-3x5 .bbw>:not(.bb-action-row){align-self:stretch}'
      +'.fg-back-checks #sb-add-notes-wrap{display:none}'
      +'#sb-swatch-row[style*="display: flex"] + .fg-back-util-extra{display:flex}'
      // Squeezed so the back opens without a scrollbar (Larry, Sept 30 2026): Contents box was 120px tall minimum, the page-number line
      // and status line each held space, and field gaps were roomy.
      +'.fg-cardback-idea.fg-back-3x5 .sb-body-box{min-height:36px!important;max-height:60px!important;padding:4px 8px;margin-bottom:3px}'
      +'.fg-cardback-idea.fg-back-3x5 .sb-body-box:has(img){max-height:84px!important}'
      +'.fg-cardback-idea.fg-back-3x5 .sb-body-text-clamp{-webkit-line-clamp:2}'
      +'.fg-cardback-idea.fg-back-3x5 #sb-pagenum{position:absolute;top:2px;right:70px;height:auto;margin:0;z-index:7}'
      +'.fg-cardback-idea.fg-back-3x5 #sb-note-status{min-height:0;margin:0}'
      +'.fg-cardback-idea.fg-back-3x5 .fg-back-idband{margin-bottom:4px}'
      +'.fg-cardback-idea.fg-back-3x5 .bbw .bb-field{margin-bottom:4px}'
      +'.fg-cardback-idea.fg-back-3x5 .fg-back-toprow .bb-field{margin-bottom:0}'
      +'.fg-cardback-idea.fg-back-3x5 .sb-eyebrow-row{margin-bottom:3px;gap:6px}'
      +'.fg-cardback-idea.fg-back-3x5 .sb-hdr-eyebrow2{margin-bottom:1px}'
      +'.fg-cardback-idea.fg-back-3x5 .sb-view-frame{padding:3px 10px}'
      +'.fg-cardback-idea.fg-back-3x5 .bb-front-check{margin:1px 0 0}'
      +'.fg-cardback-idea.fg-back-3x5 .bb-action-row{padding-top:3px}'
      ;
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
      ? '<div class="bb-cdrop"><button type="button" class="bb-topic-hit bb-cdrop-trigger fg-back-topic fg-back-own" id="bb-d-project-trigger" title="Change which topic this card belongs to" style="cursor:pointer"></button><div class="bb-cdrop-menu" id="bb-d-project-menu" hidden></div></div>'
      : '<span class="bb-topic-hit fg-back-topic"></span>';
    var title = opts.titleHTML ? '<span class="fg-back-title">'+opts.titleHTML+'</span>' : '';
    return '<div class="fg-back-idband"><div class="fg-back-idl">'+title+'</div><div class="fg-back-idc">'+topic+'<span class="bb-boardkind-hit fg-back-kind"></span></div><div class="fg-back-idr">'+(opts.extraHTML||'')+'</div></div>';
  }

  // The checkbox region: every addition's opened body moves into a left column, and the addition checkboxes gather into a small dark list
  // on the right. Ids are untouched, so all the show/hide wiring keeps working. Everything else on the card stays full width.
  function checkRegion(bbw, skipIds){
    skipIds=skipIds||[];
    if(!bbw || bbw.querySelector('.fg-back-region')) return null;
    var adds=Array.prototype.slice.call(bbw.querySelectorAll('.bb-addition')).filter(function(w){ return skipIds.indexOf(w.id)<0; });
    if(!adds.length) return null;
    var region=document.createElement('div'), open=document.createElement('div'), checks=document.createElement('div');
    region.className='fg-back-region'; open.className='fg-back-open'; checks.className='fg-back-checks';
    adds[0].parentNode.insertBefore(region, adds[0]);
    region.appendChild(checks); region.appendChild(open);
    adds.forEach(function(w){
      var body=w.querySelector('.bb-addition-body');
      var eb=w.querySelector('.bb-addition-eyebrow');
      if(body){ body.setAttribute('data-fg-title', eb ? eb.textContent : ''); open.appendChild(body); }
      checks.appendChild(w);
    });
    return region;
  }

  // Fill (or refresh) the band inside one card-back element from the live
  // ID Band. Safe to call every time a back opens.
  // board: 'idea' or 'bb' reads only that board's own band; omitted = either, on-screen one first.
  function paintBand(cardEl, board){
    if(!cardEl) return;
    var band=cardEl.querySelector('.fg-back-idband');
    if(!band) return;
    var t=band.querySelector('.fg-back-topic'), k=band.querySelector('.fg-back-kind');
    var own=BOARD_IDS[board];
    var tv=_liveText(own?own.topic:TOPIC_IDS), kv=_liveText(own?own.kind:KIND_IDS);
    if(t && !t.classList.contains('fg-back-own')){ t.textContent=tv; t.title=tv; t.classList.toggle('fg-back-empty', !tv); }
    if(k){ k.textContent=kv; k.title=kv; k.classList.toggle('fg-back-empty', !kv); }
    band.style.display = (tv||kv||(t&&t.classList.contains('fg-back-own'))) ? '' : 'none';
  }

  injectShape();

  window.FGCardBack = { inject: inject, injectShape: injectShape, bandHTML: bandHTML, checkRegion: checkRegion, paintBand: paintBand, colors: { idea: IDEA } };
})();
