/* ============================================================
   briefing-board-styles.js -- T2T Field Guide - BRIEFING BOARD (9350) STYLES

   Split out of briefing-board.js Sept 5, 2026 as part of the file-growth
   scoping pass (BB was 6,558 lines -- Code Growth Watch flags a split
   well before that). This piece is pure CSS injected once as a single
   <style> block -- no board state, no card data, nothing it reaches into
   anywhere else -- so it's the lowest-risk piece to carry on its own.

   Exposes window._bbInjectStyles() for briefing-board-screens.js (which
   calls it once, before building the board's markup) and for
   briefing-board.js itself if ever needed directly. Load this file
   BEFORE briefing-board-screens.js and briefing-board.js.
   ============================================================ */

(function(){

  function injectBriefingBoardStyles(){
    if(document.getElementById('bb-style')) return;
    var style=document.createElement('style');
    style.id='bb-style';
    style.textContent=
       '#fg-root{--bb-bg:#FDF6E8;--bb-accent:#C9A87C;--bb-ink:#3B2510;--bb-sub:#7A5C3A;--bb-head-font:"Playfair Display",serif;--bb-body-font:Georgia,serif}'
      +'#s-briefing-board{position:relative}'
      // Sept 5 2026 -- the full-screen sizing this used to duplicate
      // (fill the shell, no radius/shadow/margin) now lives in ONE
      // shared rule in style.css (#fg-root.isx-full .sc.active), so
      // every full-screen board gets it automatically instead of each
      // carrying its own copy. Dropped here -- and column layout was
      // already .sc.active's own default (see style.css), so nothing
      // Briefing-Board-specific needed to replace it.
      /* Header, July 20 2026 -- Topic folded into the SAME row as the
         title (a rounded pill, still always plain white so it stands
         out against whichever theme background is active) instead of
         its own bar above it, per Larry: don't spend a whole extra row
         of vertical board space on it. Gear + X ride along on the
         right of that same row. */
      // Header tightened, July 22 2026 -- Larry: "tighten up the screen
      // header ... more room for the body." Title + description now
      // stack together in the left column instead of the description
      // running the full width below the row, so they center as one
      // block against the topic's height. Top/bottom padding matched
      // (10px each) so the divider sits as close under the topic as
      // the topic sits under the top edge -- no more dead space.
      // Sept 5 2026 -- Larry: "the header band on the BB should look
      // exactly like the header band on the Idea Board." Padding/
      // min-height/border-weight matched to sc-header-area's own values
      // (idea-storyboard-9710.js) -- colors stay BB's own (var(--bb-bg)/
      // var(--bb-accent)), only the sizing changed, per Larry's call to
      // keep BB's palette and just match the layout.
      +'.bb-mhead{background:var(--bb-bg);border-bottom:1px solid var(--bb-accent);padding:10px 16px 4px;min-height:70px;box-sizing:border-box;flex-shrink:0}'
      +'.bb-mhead-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:10px;height:100%}'
      // TYPE + NAME, Aug 3 2026 -- Larry: "TOPIC is a permanent Briefing
      // Board [title], A control and communication tool, in the center.
      // Far left: eyebrow TYPE with drop down list followed by a Field
      // filled in with the name." Swaps the board switcher from the
      // center (where it lived as one big pill since July 22) out to the
      // far left, split into two small eyebrow-labeled dropdowns -- TYPE
      // (Personal/Departmental/Company/Project, briefing_boards.board_type)
      // then NAME (that type's boards, briefing_boards.name -- "Larry,"
      // "Accounting," "T2T," "Field Guide"). The center now carries the
      // permanent "Briefing Board" title, same text/size it always had,
      // just relocated.
      // Sept 5 2026, Larry: "move Parent closer to BB topic just like on
      // Idea Board" -- on the Idea Board, Parent sits in the header
      // grid's own left column with justify-self:end, so it hugs Topic's
      // edge, while traveler-name/PROJECT float separately at the far
      // left corner. Mirrored here with plain flex: this row now
      // stretches across the whole left grid column (justify-self:stretch)
      // and space-between pushes its two fieldgrps to opposite ends --
      // traveler-name/PROJECT (first child) stays pinned at the far left
      // corner, Parent (second child, moved up from the row below) lands
      // at this column's right edge, right up against bb-mh-group-center
      // (BB's own stand-in for Topic).
      +'.bb-mh-typebox{display:flex;justify-self:stretch;justify-content:space-between;align-items:flex-start;gap:14px}'
      +'.bb-mh-fieldgrp{display:flex;flex-direction:column;gap:3px;align-items:center}'
      +'.bb-mh-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      // Traveler name, Sept 5 2026 -- Larry: "every board now and in the
      // future" should carry the same PROJECT and PARENT fields the
      // Idea/Plan header does, starting here. Mirrors the plain eyebrow
      // treatment the Idea board's own traveler name settled on today
      // (.sc-traveler-eyebrow, idea-storyboard-9710.js) -- same idea,
      // just built on this board's own theme variable (var(--bb-sub))
      // instead of a fixed color, since Briefing Board themes can change
      // (see BB_THEME_VARS) and this needs to follow whichever one's
      // active, the same way every other label on this header already
      // does. Sized up from the standard 9px eyebrow the same way (15px)
      // since it's the traveler's own name, not a field label.
      +'.bb-traveler-eyebrow{font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub);white-space:nowrap}'
      // Logo/artwork, Aug 28 2026 -- Larry: give the Briefing Board the
      // same Logo option the Idea Board already has. Mirrors that
      // board's own upload -> crop -> resize-handle pipeline
      // (idea-storyboard-9710.js, Aug 26-27 2026 builds) but scoped to
      // THIS Briefing Board's own row (logo_url/logo_w/logo_h on
      // briefing_boards) rather than a shared project root -- one logo
      // per Briefing Board, the same "one per project" idea just
      // applied to this board type's own identity (its Project field)
      // instead of the Idea/Plan pair's shared root. Sits as a normal
      // flex field group next to Type/Project/View rather than
      // absolutely positioned near a dynamic-width Topic label -- this
      // header's center title is permanent text ("Briefing Board"), not
      // a per-project name, so there's no equivalent "gap to mirror" the
      // way Idea's Logo mirrors Parent's gap off Topic.
      // Fixed-footprint anchor, Aug 28 2026 -- Larry: resizing Logo up
      // "increased the size of the board header area," which should
      // never happen. bb-logo-slot itself grows/shrinks (up to 90px) and
      // now also carries a drag offset -- both handled by the shared
      // window.T2TLogo controller (idea-media-shared.js, Aug 30 2026;
      // also used by the Idea/Plan Storyboard) -- both need it out of
      // this fieldgrp's normal flex flow so its size never changes the
      // column's (and therefore the header row's) own height. This
      // anchor is what actually sits in the flex column, reserving the
      // original 30x30 footprint permanently; the slot floats over it
      // via position:absolute, free to grow/move without the fieldgrp
      // ever noticing. A big logo can now overlap neighboring header
      // fields instead of pushing them -- same tradeoff Larry already
      // accepted for it covering the LOGO eyebrow above it.
      +'.bb-logo-anchor{position:relative;width:30px;height:30px;flex-shrink:0}'
      +'.bb-logo-slot{position:absolute;top:0;left:0;width:30px;height:30px;box-sizing:border-box;border-radius:8px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      +'.bb-logo-slot img{max-width:100%;max-height:100%;object-fit:contain;border-radius:7px}'
      +'.bb-logo-resize-handle{position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;border-radius:4px;background:var(--bb-accent);border:2px solid #fff;cursor:nwse-resize;display:none;z-index:3;touch-action:none}'
      // LOGO eyebrow, on-logo + peek-on-hover, Aug 30 2026 (corrected
      // same day, then generalized into the shared T2TLogo controller
      // later the same day) -- first pass left the "Logo" label sitting
      // at its original spot above the empty slot while only the
      // artwork itself moved on drag/resize, so the hover-peek lit up
      // far from wherever the logo had actually been dragged to. Larry:
      // "move the eyebrow onto the logo (behind it) so wherever the logo
      // goes, the label goes with it." Fix: a second copy of the label
      // now lives INSIDE bb-logo-slot itself (bb-logo-eyebrow-onlogo,
      // added right after bb-logo-img in the markup above) instead of as
      // a sibling of the anchor -- being a child of the slot, it rides
      // along for free on both the drag transform and the resize width/
      // height (see T2TLogo.render/wire in idea-media-shared.js, none of
      // which needed board-specific logic to make this work), centered
      // on the slot at all times via top/left 50% + its own translate.
      // Original bb-mh-eyebrow above the anchor still exists and still
      // lines Logo up with Type/Project/Team at rest, but now only
      // actually shows while the slot is empty (no logo uploaded yet,
      // see T2TLogo.render) -- once real artwork exists, the traveling
      // on-logo copy is the only one that matters, since it's the one
      // guaranteed to be wherever the logo currently sits.
      +'.bb-logo-eyebrow-onlogo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:-1;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub);white-space:nowrap;pointer-events:none}'
      // Negative z-index (above) is what keeps it tucked behind the
      // image at rest -- non-positioned content (the plain <img>) always
      // paints above a negative-z-index layer. Hovering the slot (see
      // T2TLogo's shared wireHoverPeek) adds the t2t-logo-eyebrow-peek
      // class (shared by every board using T2TLogo, not just this one),
      // which only changes the z-index to a positive number so it jumps
      // above the image, plus a white chip so the text reads clearly
      // over whatever artwork it's currently sitting on. Deliberately
      // does NOT touch `position` (already absolute from the base rule)
      // -- overriding it here would pull the label back into
      // bb-logo-slot's own flex layout for as long as the hover lasted,
      // which visibly nudges the centered image every time.
      +'.bb-logo-eyebrow-onlogo.t2t-logo-eyebrow-peek{z-index:4;background:#fff;border-radius:4px;padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.3)}'
      // Organization's eyebrow is itself the Type dropdown trigger now,
      // Aug 15 2026 (Larry: "I want that word to actually be a dropdown
      // choice") -- it's a <button> sharing .bb-mh-eyebrow's exact look,
      // reset to have no box/border so it stays visually identical to
      // Project's and Team's plain eyebrows, just clickable. Its own
      // text becomes whatever category is chosen (e.g. "DEPARTMENT"),
      // not a fixed word -- the one eyebrow that's genuinely dynamic.
      +'button.bb-mh-eyebrow{background:none;border:none;padding:0;margin:0;cursor:pointer;font-family:inherit;width:auto}'
      +'button.bb-mh-eyebrow:hover{opacity:.65}'
      // One shared trigger-box class for Type/Title/View, Aug 13 2026
      // (Larry: "make the Briefing Board exactly like the Idea Board for
      // TYPE, TITLE and VIEW... every new board will have this same
      // setup") -- mirrors the Idea Board's single .sc-hdr-select box
      // model (height/padding/radius/opacity/hover) exactly; color and
      // font stay Briefing's own established theme (Gear > Colors),
      // which was never the part that had drifted.
      +'.bb-hdr-select{background:#fff;border:1.5px solid var(--bb-accent);color:var(--bb-ink);border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-family:var(--bb-head-font);font-weight:700;font-size:calc(11px * var(--fg-text-scale,1));max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.bb-hdr-select:hover{opacity:1}'
      // Rename, Aug 13 2026 (Larry) -- the separate pencil button is
      // gone; double-click the Title trigger to rename, same interaction
      // as the Idea Board's Title (see wireTopicBar's dblclick wiring).
      // Dotted-circle (+) beside Type/Title, Aug 13 2026 -- Larry: same
      // consistent symbol everywhere, matching .tm-add-tile's existing
      // dashed-circle look (Cast/team add) instead of the old text
      // "(+) Add a type/board..." row that used to live inside the
      // dropdown itself.
      +'.bb-dotted-add-btn{width:22px;height:22px;flex-shrink:0;border-radius:50%;background:transparent;border:1.5px dashed var(--bb-accent);color:var(--bb-sub);display:flex;align-items:center;justify-content:center;font-size:calc(13px * var(--fg-text-scale,1));font-weight:700;font-family:inherit;line-height:1;cursor:pointer;padding:0;opacity:.75;transition:opacity .15s,background .15s,border-color .15s,color .15s}'
      +'.bb-dotted-add-btn:hover{opacity:1;background:var(--bb-bg);border-color:var(--bb-ink);color:var(--bb-ink)}'
      +'.bb-dotted-remove-btn{border-color:#a3372b;color:#a3372b}'
      +'.bb-dotted-remove-btn:hover{background:#FFF4F2;border-color:#a3372b;color:#a3372b}'
      // Custom Type/Title dropdowns, Aug 13 2026 -- Larry: "the (+)
      // should be at the bottom of each dropdown list, not to the
      // side." Same reasoning as the Idea Board's own sc-cdrop: a
      // native <select> can't render a real dashed circle as one of
      // its own options, so Type/Title are a trigger button + a real
      // styled menu, ending in the same dashed-circle (+) as .tm-add-tile.
      +'.bb-cdrop{position:relative}'
      // Parent's fast-jump arrow, Sept 5 2026 -- same shell as the Idea
      // board's own sc-project-caret (idea-storyboard-9710.js), just
      // built on this board's light theme (white fill, accent border)
      // instead of that board's dark rgba() overlay, so it reads as one
      // of this header's own controls rather than a pasted-in dark chip.
      +'.bb-parent-caret{background:#fff;border:1.5px solid var(--bb-accent);color:var(--bb-ink);border-radius:6px;width:18px;height:30px;box-sizing:border-box;padding:0;cursor:pointer;opacity:.85;font-size:calc(9px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      +'.bb-parent-caret:hover{opacity:1}'
      // Centered, Aug 13 2026 -- same fix as the Idea Board's sc-cdrop-trigger.
      +'.bb-cdrop-trigger{display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;width:100%}'
      +'.bb-cdrop-trigger:after{content:\'\u25be\';font-size:calc(9px * var(--fg-text-scale,1));opacity:.6;flex-shrink:0}'
      // position:fixed + moved to <body> on open (see _bbRenderDropdown),
      // Aug 13 2026 -- same fix as the Idea Board's sc-cdrop-menu: nested
      // inside the header band, the menu was trapped in that band's own
      // stacking context no matter its own z-index, so board content
      // underneath painted over it. Living as a direct child of <body>
      // with a real viewport position escapes that.
      +'.bb-cdrop-menu{position:fixed;background:#fff;border:1.5px solid var(--bb-accent);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);z-index:99999;padding:4px;box-sizing:border-box;max-height:240px;overflow-y:auto;min-width:120px}'
      +'.bb-cdrop-row{padding:6px 10px;font-family:var(--bb-body-font);font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);border-radius:6px;cursor:pointer;white-space:nowrap}'
      +'.bb-cdrop-row:hover{background:var(--bb-bg)}'
      +'.bb-cdrop-row.active{background:var(--bb-bg);font-weight:700}'
      +'.bb-cdrop-addrow{display:flex;justify-content:center;gap:10px;padding:6px 0 2px;margin-top:2px;border-top:1px solid var(--bb-bg)}'
      // VIEW dropdown roles + inline add, Aug 13 2026 (Larry): same
      // change as the Idea Board's own sc-view-row/-addform -- the
      // person-filter list now shows each Cast member's role and lets
      // an Owner or Leader add someone right from the board face.
      +'.bb-view-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}'
      +'.bb-view-row-name{overflow:hidden;text-overflow:ellipsis}'
      +'.bb-view-row-role{font-size:calc(9px * var(--fg-text-scale,1));color:var(--bb-sub);flex-shrink:0;text-transform:uppercase;letter-spacing:.03em;margin-left:10px}'
      +'.bb-view-addform{padding:8px 6px 4px;border-top:1px solid var(--bb-bg);margin-top:2px}'
      +'.bb-view-addform input{width:100%;box-sizing:border-box;font-size:calc(11px * var(--fg-text-scale,1));padding:5px 7px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;color:var(--bb-ink);font-family:var(--bb-body-font);margin-bottom:5px}'
      +'.bb-view-addform .tm-add-suggest{position:static;box-shadow:none;margin-bottom:5px}'
      +'.bb-view-removeform{padding:6px}'
      +'.bb-view-remove-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-view-remove-row:not(:last-child){border-bottom:1px solid var(--bb-bg)}'
      +'.bb-view-remove-empty{font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);padding:4px 2px}'
      +'.bb-view-add-confirm{width:100%;box-sizing:border-box;margin-bottom:4px}'
      +'.bb-view-add-error{font-size:calc(10px * var(--fg-text-scale,1));color:#a3372b;margin-top:2px}'
      // Center title, Aug 3 2026 -- Larry: "Make Briefing Board larger.
      // Push tagline lower." Was 20px (sized for when it sat next to the
      // big board-name pill); now the header's one permanent, static
      // element, sized to lead. Gap between title and tagline widened
      // 2px -> 10px so the tagline reads as its own line, not crowded
      // against the title's descenders.
      +'.bb-mh-group-center{display:flex;flex-direction:column;align-items:center;gap:10px;justify-self:center;text-align:center}'
      // Sept 5 2026 -- Larry: match the Idea Board's header band. Bumped
      // to the same 42px this board-kind label uses there (idea-storyboard-
      // 9710.js sc-board-kind-trigger) and given the same raised/embossed
      // look (light highlight above, soft shadow below) instead of flat
      // text -- built with BB's own ink color, not Idea Board's blue.
      +'.bb-mh{color:var(--bb-ink);font-size:calc(42px * var(--fg-text-scale,1));font-weight:700;line-height:1;font-family:var(--bb-head-font);text-shadow:-1px -1px 0 rgba(255,255,255,.6),1px 1px 2px rgba(59,37,16,.25)}'
      // Logo now rides along in the same right-side group as Utility/Close
      // (see the markup below) so it sits between the center title and
      // those two icons, mirroring how Logo sits between Topic and IDEA
      // on the Idea Board -- align-items:center added so its taller
      // eyebrow+frame stack lines up with the shorter icon buttons.
      +'.bb-mhead-actions{display:flex;gap:8px;flex-shrink:0;justify-self:end;justify-content:flex-end;align-items:center}'
      +'.bb-icon-btn{width:30px;height:30px;border-radius:6px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;color:var(--bb-ink);padding:0}'
      // Dashed-circle (+) everywhere, Aug 13 2026 (Larry: "on all boards
      // (+) should be surrounded by a dotted line for consistency") --
      // same modifier pattern as .bb-key-add over .bb-key-btn: keep the
      // icon button's box, swap corners for a dashed circle.
      +'.bb-icon-btn-add{border-radius:50%;border-style:dashed}'
      +'.bb-icon-btn:hover{background:var(--bb-bg)}'
      +'.bb-doors-row{display:flex;gap:6px;margin-bottom:10px}'
      +'.bb-door-btn{flex:0 0 auto}'
      +'.bb-icon-loading{opacity:.5;pointer-events:none}'
      // Bottom action row, Session 234 (Aug 21) -- Lock/People/Gear/Trash,
      // reuses .bb-doors-row's own layout so it matches the doors row
      // directly above it. Lock's "on" state borrows the same red already
      // used for Hang-Ups/locked elsewhere in this file.
      +'.bb-icon-btn.bb-lock-active{background:#a3372b;border-color:#a3372b;color:#fff}'
      // Divider + even spread, Aug 21 2026 (Larry): a line above the
      // bottom action row to set it apart from the rest of the card,
      // and the 4 icons spread across the full width instead of
      // clustered at the left -- same treatment applied to the Idea
      // Card's own .sb-blue-row (idea-storyboard-9710.js) for
      // consistency between the two card types. width:100% is required
      // here (unlike the Idea Card) because #bb-detail-overlay .bbw is
      // a flex column with align-items:flex-start -- every direct child
      // shrinks to its own content width there instead of filling the
      // card, so without an explicit width justify-content:space-between
      // has no extra space to distribute and the icons just sit bunched
      // at the left. (.bb-field already sets width:100% for the same
      // reason -- this row just never had to before now.)
      +'.bb-action-row{width:100%;box-sizing:border-box;border-top:1.5px solid var(--bb-accent);padding-top:10px;justify-content:space-between}'
      // Match the Idea Card's bottom row exactly, Aug 21 2026 (Larry:
      // "make them both look like the IDEA CARD, same width of buttons
      // and same icon for trash") -- .bb-icon-btn everywhere else on the
      // Briefing Card stays a fixed 30x30 square (top toolbar, checklist
      // add, date pickers, etc.), but inside this specific bottom row the
      // 4 buttons now stretch and share the row evenly, same as
      // .sb-blue-btn on the Idea Card (idea-storyboard-9710.js).
      +'.bb-action-row .bb-icon-btn{width:auto;height:auto;flex:1 1 auto;min-width:36px;padding:6px 10px;border-radius:8px;border-width:0.5px}'
      +'.bb-swatch-row{flex-wrap:wrap}'
      +'.bb-swatch{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--bb-accent);cursor:pointer;padding:0}'
      +'.bb-swatch.bb-swatch-active{box-shadow:0 0 0 2px var(--bb-ink)}'
      +'.bb-dates-block .bb-date-row{margin-bottom:4px}'
      +'.bb-routine-select{width:140px}'
      +'.bb-mt{color:var(--bb-sub);font-size:calc(13px * var(--fg-text-scale,1));font-style:italic}'
      // Center the board's columns as a group (Larry, July 22 2026)
      // instead of always hugging the left edge -- still scrolls
      // normally once there are enough columns to overflow.
      +'#bb-board-wrap{flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 16px;background:var(--bb-bg);display:flex;justify-content:center}'
      +'#bb-cols{display:flex;gap:14px;height:100%}'
      +'.bb-col{flex-shrink:0;width:190px;display:flex;flex-direction:column;background:rgba(201,168,124,0.14);border:1px solid var(--bb-accent);border-radius:8px;padding:8px}'
      +'.bb-col-head{font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-bg);background:var(--bb-ink);border-radius:4px;text-align:center;padding:7px 4px;margin-bottom:4px}'
      +'.bb-col[data-col="hangups"] .bb-col-head{background:#a3372b;color:#fff}'
      // July 22, 2026, Larry: color the 3 Do column headers red/green/
      // yellow (H/M/L, in that order) so priority reads at a glance
      // across the board, not just on each card's own badge.
      // July 23, 2026 (later): NEW dropped its own tone -- Larry wants
      // it to read the same as DOING/DONE (both use the base
      // .bb-col-head styling below, var(--bb-ink)/var(--bb-bg)), so no
      // override here at all.
      +'.bb-col[data-col="do-h"] .bb-col-head{background:#c0272a;color:#fff}'
      +'.bb-col[data-col="do-m"] .bb-col-head{background:#3F8F3F;color:#fff}'
      +'.bb-col[data-col="do-l"] .bb-col-head{background:#e0c22e;color:#3B2510}'
      +'.bb-col-cards{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:60px}'
      +'.bb-col-cards.bb-dragover{outline:2px dashed var(--bb-accent);outline-offset:2px}'
      +'.bb-card{position:relative;background:#FFFDF7;border:1px solid var(--bb-accent);border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1.3;cursor:grab;font-family:var(--bb-body-font)}'
      +'.bb-card .bb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}'
      +'.bb-card .bb-top-left{display:flex;align-items:center;gap:4px}'
      +'.bb-pri-badge{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;line-height:1.4}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:calc(13px * var(--fg-text-scale,1));color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:calc(8px * var(--fg-text-scale,1));color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--bb-body-font);flex-shrink:0}'
      +'.bb-card .bb-task{color:var(--bb-ink);margin:2px 0 5px;word-break:break-word}'
      +'.bb-card-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--bb-sub);margin:1px 0 2px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-start-due{font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:#a3372b;margin:-3px 0 3px}'
      +'.bb-done-date{font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:#3F6B3A;text-align:right;margin-top:1px}'
      +'.bb-key-badges{position:absolute;bottom:2px;left:4px;display:flex;gap:7px;pointer-events:none}'
      // pointer-events:auto here, Aug 4 2026 -- the container above stays
      // click-through (so it never steals a card drag), but the wrap
      // around each dot+count needs real pointer events or its title
      // tooltip (the meaning, on hover) never fires -- a child inherits
      // "none" from its parent unless it opts back in like this.
      +'.bb-key-badge-wrap{display:inline-flex;align-items:center;gap:2px;pointer-events:auto;cursor:default}'
      +'.bb-key-badge{width:12px;height:12px;box-shadow:0 1px 2px rgba(0,0,0,.3);flex-shrink:0}'
      // .bb-key-link-count removed Aug 15 2026 (Larry: "delete number
      // of like flags from front of every type of card") -- the count
      // is still computed and available via each flag's hover tooltip,
      // just no longer rendered as a visible number on the card face.
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed var(--bb-accent);border-radius:3px;text-align:center;padding:8px;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);cursor:pointer;font-family:var(--bb-body-font)}'
      +'.bb-add-tile:hover{background:rgba(201,168,124,0.2)}'
      /* Fixed Trash can, July 20, 2026 -- same "small round drop target,
         bottom-right" convention as 9711's isx-trash-fixed. Anchored to
         #s-briefing-board itself (not #bb-board-wrap, which scrolls
         horizontally on narrow screens) so it never drifts off with the
         columns. */
      +'.bb-trash{position:absolute;right:16px;bottom:16px;width:44px;height:44px;border-radius:50%;background:#FFFDF7;border:2px solid var(--bb-ink);box-shadow:0 2px 6px rgba(59,37,16,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:80}'
      +'.bb-trash.bb-trash-dropready{outline:2px solid #a3372b;outline-offset:2px}'
      +'.bbw{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box}'
      +'#bb-detail-overlay .bbw{align-items:flex-start}'
      +'.bb-field{width:100%;max-width:280px;margin-bottom:12px;text-align:left}'
      +'.bb-field label{display:block;font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:3px}'
      // Addition checkboxes, Aug 27 2026 -- same label styling as every
      // other .bb-field label, just with a checkbox riding in front of
      // the text instead of standing alone. Body starts collapsed
      // (inline style="display:none" in the markup); JS only ever
      // flips that display, so there's no extra "open" class to keep
      // in sync -- one source of truth per addition. Darkened to
      // --bb-ink (was inheriting --bb-sub's lighter tone from the
      // shared ".bb-field label" rule) and a fixed line-height matching
      // the checkbox's own height, Aug 27 2026 (Larry: "center on the
      // checkboxes... darken the text") -- align-items:center alone
      // wasn't enough to true up the text against the checkbox box.
      +'.bb-addition-label{display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--bb-ink);line-height:14px}'
      +'.bb-addition-label input[type=checkbox]{width:14px;height:14px;margin:0;flex-shrink:0;cursor:pointer}'
      // Larry, Aug 27 2026: all the addition checkboxes' text labels
      // (Checklist/Routine/Start Date/Due Date/Budget/Notes/Links/Related
      // Storyboards/Signal Flags) read a touch low against their checkbox
      // -- nudge just the text up so it optically centers on the box.
      +'.bb-addition-eyebrow{transform:translateY(-1.5px)}'
      +'.bb-addition-body{margin-top:6px}'
      +'.bb-field-divider{border:none;border-top:1px solid var(--bb-accent);width:100%;max-width:280px;margin:4px 0 12px}'
      // Quiet Added-date, Aug 27 2026 (Larry: "What if the date added is
      // quietly after the TASK Eyebrow?") -- rides on the Task label
      // itself now instead of its own "Dates" block; deliberately NOT
      // styled like the other uppercase eyebrow labels (this is the
      // opposite -- quiet, small, cursive, same voice as every other
      // "Added"/date stamp elsewhere on the card).
      +'.bb-added-quiet{text-transform:none;letter-spacing:0;font-weight:400;font-family:"Caveat",cursive;font-size:calc(14px * var(--fg-text-scale,1));color:var(--bb-sub);margin-left:8px}'
      +'.bb-inline-field{display:flex;align-items:baseline;justify-content:flex-start;gap:6px;white-space:nowrap}'
      +'.bb-inline-field label{display:inline;margin:0}'
      +'.bb-inline-field span{font-family:"Caveat",cursive;font-size:calc(16px * var(--fg-text-scale,1));color:var(--bb-sub)}'
      +'.bb-field input,.bb-field textarea,.bb-field select{width:100%;font-family:var(--bb-body-font);font-size:calc(14px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:7px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:calc(16px * var(--fg-text-scale,1));resize:vertical}'
      +'#bb-d-task{font-family:var(--bb-body-font);font-style:normal;font-size:calc(14px * var(--fg-text-scale,1));color:#000}'
      +'#bb-d-notes{font-family:var(--bb-body-font)!important;font-style:normal;font-size:calc(14px * var(--fg-text-scale,1))!important;min-height:44px;overflow:hidden;resize:none;transition:height .1s}'
      +'#bb-new-task{font-family:var(--bb-body-font)!important;font-style:normal;font-size:calc(15px * var(--fg-text-scale,1))!important}'
      +'.bb-flags,.bb-priorities,.bb-swatches{display:flex;gap:4px}'
      +'.bb-flag-btn,.bb-pri-btn,.bb-font-btn,.bb-shape-btn{flex:1;font-size:calc(11px * var(--fg-text-scale,1));padding:6px 2px;border-radius:4px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font);display:flex;align-items:center;justify-content:center}'
      +'.bb-shape-btn.bb-shape-active{background:var(--bb-bg);border-color:var(--bb-ink)}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}'
      +'#bb-d-verify.bb-flag-active{background:#3F6B3A;border-color:#3F6B3A}'
      +'#bb-d-pro.bb-flag-active{background:#c9a230;border-color:#c9a230}'
      +'#bb-d-grow.bb-flag-active{background:#4a7a95;border-color:#4a7a95}'
      +'.bb-font-btn.bb-flag-active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-theme-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.15)}'
      +'.bb-theme-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-settings-tabs{display:flex;gap:4px;width:100%;max-width:280px;margin:0 auto 10px}'
      +'.bb-settings-tab{flex:1;font-size:calc(11px * var(--fg-text-scale,1));padding:7px 3px;border-radius:6px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font)}'
      +'.bb-settings-tab.active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-settings-pane{display:flex;flex-direction:column;align-items:center;width:100%}'
      +'.bb-key-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-start}'
      +'.bb-key-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      +'.bb-key-add{font-size:calc(16px * var(--fg-text-scale,1));color:var(--bb-sub);border-style:dashed}'
      +'.bb-key-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      +'.bb-key-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-pick-row-wrap{display:flex;align-items:center;gap:6px;margin-bottom:6px}'
      +'.bb-key-pick-row{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:8px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;cursor:pointer;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink);text-align:left}'
      +'.bb-key-pick-meaning{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.bb-key-pick-edit{background:none;border:none;cursor:pointer;font-size:calc(14px * var(--fg-text-scale,1));color:#4a7a95;flex-shrink:0;padding:0 4px}'
      +'.bb-key-pick-swatch{width:16px;height:16px;flex-shrink:0}'
      +'.bb-key-pick-disabled{opacity:.35;pointer-events:none}'
      +'.bb-key-pick-empty-msg{font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic;text-align:center;padding:6px 0}'
      +'.bb-checklist-row{display:flex;align-items:center;gap:6px;padding:3px 0;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-checklist-row .bb-checklist-check{flex:0 0 auto;width:14px;height:14px;margin:0;padding:0}'
      +'.bb-checklist-text{flex:1}'
      +'.bb-checklist-text.bb-checklist-done{text-decoration:line-through;color:var(--bb-sub)}'
      +'.bb-checklist-remove{background:none;border:none;color:var(--bb-sub);cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1));padding:0 4px}'
      +'.bb-checklist-add-row{display:flex;gap:6px;margin-top:4px}'
      +'.bb-checklist-add-row input{flex:1;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink)}'
      +'.bb-links-empty{font-size:calc(12px * var(--fg-text-scale,1));font-style:italic;color:var(--bb-sub);padding:2px 0}'
      // Signal Flags manager (9397), Aug 3 2026 -- same row shape as
      // Linked Items/Checklist just above, pencil then trash per row.
      +'.bb-keylib-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink);border-bottom:1px solid rgba(201,168,124,.35)}'
      +'.bb-keylib-row:last-child{border-bottom:none}'
      +'.bb-keylib-swatch{display:inline-block;width:16px;height:16px;flex-shrink:0}'
      +'.bb-keylib-meaning{flex:1}'
      +'.bb-keylib-edit,.bb-keylib-del{background:none;border:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));padding:0 4px}'
      +'.bb-keylib-edit{color:#4a7a95}'
      +'.bb-keylib-del{color:#a3372b}'
      +'.bb-archive-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--bb-accent)}'
      +'.bb-archive-task{font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-archive-meta{font-family:"Caveat",cursive;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-sub)}'
      +'.bb-card-foreign{border-style:dashed;opacity:0.92}'
      /* Overdue pink-face, Aug 15 2026, Larry: "pink faced card" for
         anything whose due date has passed (see _bbIsOverdue -- Done
         and Hang-Ups are excluded, they already have their own
         meaning). Steady pink border+background applies every render;
         bb-overdue-flash is added only on the render where a card is
         first discovered overdue, playing a brief alarm-flash before
         settling into the steady state above. animation has no
         fill-mode, so it always relaxes back to the plain .bb-overdue
         look once the 3 pulses finish -- no forced timeout needed. */
      +'.bb-card.bb-overdue{border-color:#c2255c;background:#FDE7EF}'
      +'.bb-card.bb-overdue .bb-task{color:#8a1a44}'
      +'@keyframes bb-overdue-alarm{0%,100%{background:#FDE7EF;box-shadow:none}50%{background:#f48fb1;box-shadow:0 0 10px rgba(194,37,92,0.7)}}'
      +'.bb-card.bb-overdue-flash{animation:bb-overdue-alarm 0.5s ease-in-out 3}'
      +'@media (prefers-reduced-motion: reduce){.bb-card.bb-overdue-flash{animation:none}}'
      +'.bb-foreign-row{margin:1px 0 3px}'
      +'.bb-foreign-badge{display:inline-block;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.3px;text-transform:uppercase;padding:1px 6px;border-radius:8px;background:rgba(59,37,16,.08);color:var(--bb-sub)}'
      /* Overlay chrome for Add a Card (9360) / the Briefing Card (9370) /
         Board Settings, July 20, 2026 -- same "fixed, dimmed backdrop,
         click-outside-closes" pattern as idea-storyboard-9710.js's
         .sb-overlay. Lives at #fg-root level (see
         injectBriefingBoardScreens), not inside #s-briefing-board, for
         the same reason 9710's overlays live at fg-root: a display:none
         ancestor (the board when it's not the active screen) would hide
         a position:fixed child too. Card is pinned to 340px -- just past
         the 280px field frame -- and tall rather than wide, scrolling
         internally if content runs long. */
      +'.bb-overlay{position:fixed;inset:0;z-index:200;background:rgba(59,37,16,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
      +'.bb-overlay.active{display:flex}'
      +'.bb-overlay-card{width:340px;max-width:90vw;max-height:min(640px,90vh);overflow-y:auto;background:#FFFDF7;border-radius:8px;border-top:6px solid var(--bb-accent);box-shadow:0 10px 30px rgba(59,37,16,0.35);box-sizing:border-box;padding:18px 22px 22px}'
      +'.bb-overlay-card.bb-hangup-active{border-top-color:#a3372b;background:#FFF4F2}'
      +'.bb-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;cursor:grab;user-select:none}'
      +'.bb-overlay-title{font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-overlay-card.bb-hangup-active .bb-overlay-title{color:#a3372b}'
      +'.bb-overlay-card.bb-overdue-active{border-top-color:#c2255c;background:#FDE7EF}'
      +'.bb-overlay-card.bb-overdue-active .bb-overlay-title{color:#c2255c}'
      +'.bb-close{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.tm-groupname{font-family:var(--bb-head-font);font-size:calc(16px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-ink);text-align:center;border:none;border-bottom:1px dashed var(--bb-accent);background:transparent;width:90%;padding:2px 0;display:block;margin:0 auto 2px}'
      +'.tm-cap{text-align:center;font-size:calc(10px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:10px}'
      +'.tm-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(59,37,16,0.12)}'
      +'.tm-sym{width:22px;text-align:center;font-size:calc(15px * var(--fg-text-scale,1));padding-top:1px;flex-shrink:0}'
      +'.tm-sym.tm-clickable{cursor:pointer}'
      +'.tm-body{flex:1;min-width:0}'
      +'.tm-name{font-size:calc(13px * var(--fg-text-scale,1));font-weight:600;color:var(--bb-ink)}'
      +'.tm-role{font-weight:400;color:var(--bb-sub);font-size:calc(11px * var(--fg-text-scale,1))}'
      +'.tm-contact{font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;line-height:1.25;margin-top:1px}'
      +'.tm-notes-row{display:flex;align-items:baseline;gap:5px;line-height:1.25;margin-top:1px}'
      +'.tm-notes-lbl{font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:1px;color:var(--bb-sub);flex-shrink:0}'
      +'.tm-notes-input{flex:1;border:none;border-bottom:1px dashed var(--bb-accent);background:transparent;font-size:calc(10px * var(--fg-text-scale,1));color:var(--bb-sub);padding:0;font-family:var(--bb-body-font)}'
      +'.tm-rolepanel{margin:6px 0 0 32px;background:#fff;border:1px solid var(--bb-accent);border-radius:8px;padding:8px 10px}'
      +'.tm-rolepanel label{display:flex;align-items:center;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);margin-bottom:5px;cursor:pointer}'
      +'.tm-rolepanel label:last-child{margin-bottom:0}'
      +'.tm-addrow{display:flex;align-items:center;justify-content:space-between;margin-top:10px}'
      +'.tm-add-tile{width:26px;height:26px;border-radius:50%;border:1.5px dashed var(--bb-accent);color:var(--bb-sub);font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer}'
      +'.tm-print-tile{width:26px;height:26px;border-radius:50%;border:1px solid var(--bb-accent);background:#fff;color:var(--bb-sub);font-size:calc(12px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;cursor:pointer}'
      // Session 255: matching styles for the flat Cast popup
      // (openCallSheet, in idea-storyboard-9710.js, bridged here as
      // T2TStoryboard.openCallSheet) so it looks the same whether it was
      // opened from an Idea/Plan card or a Briefing Card. That popup's
      // .tm-row/.tm-rolepanel markup is already covered by the rules
      // above; these are the pieces unique to it.
      +'.cs-filter-chk{margin-right:7px;cursor:pointer;accent-color:var(--bb-accent-strong,#4a7a95)}'
      +'.cs-role-tag{font-weight:400;color:var(--bb-sub);font-size:calc(11px * var(--fg-text-scale,1))}'
      +'.cs-notes-pencil{cursor:pointer;margin-left:4px;opacity:0.55;font-size:calc(10px * var(--fg-text-scale,1))}'
      +'.cs-notes-pencil:hover,.cs-notes-pencil.cs-notes-has{opacity:1}'
      +'.cs-contact-input{border:none;border-bottom:1px dashed var(--bb-accent);background:transparent;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);padding:0;font-family:inherit;width:auto;max-width:150px}'
      +'.cs-primary-toggle{margin-right:4px;color:#3a7ca8}'
      +'.cs-key-toggle{cursor:pointer;margin-right:4px;opacity:0.32;filter:grayscale(1)}'
      +'.cs-key-toggle.cs-key-on{opacity:1;filter:none}'
      +'.cs-remove-x{margin-left:6px;color:#a3372b;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1))}'
      +'.cs-parent-star{color:#c9a87c;margin-right:2px}'
      +'.cs-empty-role{font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic;padding:4px 0 6px}'
      +'.tm-add-wrap{position:relative;flex:1;min-width:0}'
      +'.tm-add-suggest{position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid var(--bb-accent);border-radius:8px;box-shadow:0 6px 16px rgba(59,37,16,0.18);max-height:160px;overflow-y:auto;overflow-x:hidden;z-index:5;box-sizing:border-box}'
      +'.tm-add-suggest-row{padding:6px 10px;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-ink);cursor:pointer;box-sizing:border-box}'
      +'.tm-add-suggest-row:hover{background:var(--bb-bg)}'
      +'.tm-add-suggest-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tm-add-suggest-email{color:var(--bb-sub);font-size:calc(11px * var(--fg-text-scale,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tm-add-suggest-empty{padding:6px 10px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic}'
      +'@media print{body *{visibility:hidden}.bb-team-print,.bb-team-print *{visibility:visible}.bb-team-print{position:absolute;left:0;top:0;width:100%!important;max-height:none!important;box-shadow:none!important}@page{size:landscape}}'
      +'.bb-close:hover{background:var(--bb-bg)}'
      +'.bb-hx-back{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:calc(14px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.bb-hx-back:hover{background:var(--bb-bg)}'
      // .bb-routine-toggle button rules dropped, Aug 27 2026 -- the
      // header button they styled is gone (see the overlay-head
      // comment above); .bb-routine-active stays, it still tints the
      // whole card when c.routine is true regardless of how it got set.
      +'.bb-overlay-card.bb-routine-active{border-top-color:#4a7a95}'
      +'.bb-date-row{display:flex;gap:6px;align-items:stretch}'
      +'.bb-date-row input[type=text]{flex:1.4;min-width:0}'
      +'.bb-date-row input.bb-date-time{width:60px;flex:none;min-width:0}'
      +'.bb-date-row select.bb-routine-select{flex:none;width:92px;font-family:var(--bb-body-font);font-size:calc(12px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 4px;background:#fff;color:var(--bb-ink)}'
      +'.bb-datepicker-pop{position:fixed;z-index:10001;width:220px;background:#fff;border:1.5px solid var(--bb-accent);border-radius:8px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);font-family:var(--bb-body-font)}'
      +'.bb-dp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}'
      +'.bb-dp-label{font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-ink)}'
      +'.bb-dp-nav{background:none;border:none;font-size:calc(16px * var(--fg-text-scale,1));line-height:1;cursor:pointer;color:var(--bb-ink);padding:0 6px}'
      +'.bb-dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}'
      +'.bb-dp-dow{font-size:calc(9px * var(--fg-text-scale,1));text-align:center;color:var(--bb-sub);font-weight:700;padding:2px 0}'
      +'.bb-dp-day{background:none;border:none;font-size:calc(12px * var(--fg-text-scale,1));padding:5px 0;text-align:center;cursor:pointer;border-radius:4px;color:var(--bb-ink)}'
      +'.bb-dp-day:hover{background:var(--bb-bg)}'
      +'.bb-dp-day.bb-dp-blank{cursor:default}'
      +'.bb-dp-day.bb-dp-blank:hover{background:none}'
      +'.bb-dp-day.bb-dp-today{border:1.5px solid var(--bb-accent);font-weight:700}'
      +'.bb-dp-day.bb-dp-selected{background:var(--bb-accent);color:#fff}'
      +'.bb-routine-custom{margin-top:6px;width:100%;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-routine-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1}'
      +'.bb-lock-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:default}'
      // pointer-events:auto here, Aug 11 2026 -- same fix as
      // .bb-key-badge-wrap: the wrapping .bb-key-badges container it
      // now lives inside stays click-through (never steals a card
      // drag), but this badge needs its own pointer events back or its
      // "Has notes" hover tooltip goes silent.
      +'.bb-notes-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:default}'
      // Video/Link flag, Aug 11 2026 (Larry: "make link usable, move
      // link flag to lower left corner") -- joins Notes in the
      // bottom-left signal-flags row instead of the top badge row, and
      // is a real link now (was a plain inert marker): opens the
      // attached URL in a new tab. draggable=false on the element
      // itself (see markup below) keeps a native link-drag from
      // hijacking the card's own drag-to-move gesture.
      +'.bb-link-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;pointer-events:auto;cursor:pointer;text-decoration:none;color:inherit}'
      +'.bb-link-row{display:flex;gap:6px}'
      +'.bb-link-row input{flex:1;font-family:var(--bb-body-font);font-size:calc(13px * var(--fg-text-scale,1));border:1.5px solid var(--bb-accent);border-radius:4px;padding:5px 8px;background:#fff;color:var(--bb-ink)}'
      +'.bb-link-preview{margin-top:6px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);text-align:center;font-style:italic}'
      +'.bb-link-preview img{max-width:100%;max-height:100px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain}'
      +'.bb-team-row{display:flex;gap:6px;align-items:center;padding:4px 0}'
      +'.bb-team-row input.bb-team-name{flex:1.6;min-width:0}'
      +'.bb-team-row input.bb-team-initials{width:50px;flex:none;text-transform:uppercase}'
      +'.bb-hx-landing-btn{margin-bottom:12px}';
    document.head.appendChild(style);
  }

  window._bbInjectStyles = injectBriefingBoardStyles;

})();
