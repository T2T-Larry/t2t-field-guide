/* ============================================================
   idea-storyboard-screen-markup.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   SCREEN MARKUP. injectSeaOfIdeasCluster: builds the 9710 cluster /
   storyboard screen (markup, injected CSS, and its one-time event
   wiring) at boot.

   Split out of idea-storyboard-screens.js on Oct 10, 2026 (screens.js
   split, step 1 of the plan on the Code Efficiency Maintenance card).
   The function body is moved VERBATIM -- no behavior change. Like its
   sibling Idea Storyboard files it lives in the shared page-global
   scope (no wrapper, no namespace), so every caller reaches it by its
   plain name. Load order: anywhere before idea-storyboard-9710.js, which
   calls it at boot and must load LAST in this family.

   Sibling files: idea-storyboard-screens.js (board rendering),
   idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js,
   idea-storyboard-navigation.js, idea-storyboard-tiles.js,
   idea-storyboard-header.js, idea-storyboard-card-detail.js,
   idea-storyboard-9710.js (boot -- loads last)
   ============================================================ */

  function injectSeaOfIdeasCluster(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-sea-of-ideas-cluster')) return;
    if(!document.getElementById('sea-cluster-style')){
      var style=document.createElement('style');
      style.id='sea-cluster-style';
      style.textContent='#s-sea-of-ideas-cluster .bar-dream-pp{background:#1a3a5c!important;border-color:#14305a!important;border-top-color:#2a5080!important}#s-sea-of-ideas-cluster .bar-dream-pp .tb{background:#d6eaf8!important;border-color:#a9cce3!important;color:#1a3a5c}#s-sea-of-ideas-cluster .bar-dream-pp .tb:hover:not(.dim){background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff}'
        +'.sc-tile{position:absolute;width:64px;height:64px;border-radius:0;background:#fff;border:1px solid #cfe4f2;box-shadow:0 3px 10px rgba(0,0,0,0.28);overflow:hidden;cursor:grab;user-select:none}'
        +'.sc-tile.dragging{cursor:grabbing;box-shadow:0 8px 18px rgba(0,0,0,0.4);z-index:50}'
        +'.sc-tile img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}'
        +'.sc-tile-caption{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;font-size:calc(8px * var(--fg-text-scale,1));line-height:1.2;font-weight:600;padding:6px 4px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}'
        +'.sc-tile.text{padding:5px;display:flex;align-items:center;justify-content:center}'
        +'.sc-tile.text p{margin:0;font-size:calc(8.5px * var(--fg-text-scale,1));line-height:1.25;color:#000;font-weight:400;text-align:center;pointer-events:none}'
        +'.sc-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(91,155,213,0.22),transparent 70%);pointer-events:none;z-index:5}'
        +'.sc-pill{position:absolute;z-index:15;transform:translate(-50%,-50%);background:#5b9bd5;color:#fff;border:none;padding:5px 10px;border-radius:14px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;box-shadow:0 3px 8px rgba(26,58,92,0.2);cursor:pointer;white-space:nowrap;max-width:calc(150px * var(--fg-text-scale,1));overflow:hidden;text-overflow:ellipsis}'
        +'.sc-pill.named{background:#fff;color:#1a3a5c;border:2px solid #1a3a5c;border-radius:0;box-shadow:0 3px 10px rgba(0,0,0,0.28)}'
        // Apex frame, Sept 27 2026 -- Larry: MASTER-level headers (real
        // top-level Topics, direct children of the hidden PROJECTS_ROOT
        // row -- see the _isApexTopic note on renderGroup's hd, below) are
        // the apex of each Topic, so they get a visual frame. Larry's
        // 2nd correction (same day, after +1px outside was still outside
        // and too faint against the .named border): the frame goes
        // INSIDE the card now, with a negative offset big enough that
        // the card's own 2px navy border stays clearly visible as its
        // own ring around it, not merged into one thick edge.
        +'.sc-pill.apex-topic{outline:3px solid #1a3a5c;outline-offset:-6px}'
        // Order # badge -- Larry, Aug 3 2026: "small, no bigger that Notes
        // field" (.sb-notes-pill below is 12px; this is smaller still).
        // Moved to the upper-left corner (Larry, Aug 3 2026) so the number
        // reads first, before anything else on the card. The link badge
        // (top-left, link+image cards only) is nudged right below so the
        // two never overlap.
        +'.sb-order-badge.sb-order-right{left:auto;right:3px}'
        +'*:has(> .sb-person-badge) > .sb-order-badge.sb-order-right{right:20px}'
        +'.sb-order-badge{position:absolute;top:2px;left:3px;font-size:calc(9px * var(--fg-text-scale,1));line-height:1;font-weight:700;font-family:sans-serif;color:rgba(0,0,0,.55);background:rgba(255,255,255,.78);border-radius:6px;padding:1px 4px;pointer-events:none;z-index:6}'
        // Bottom-left signal cluster, Aug 15 2026 (Larry: "is the LOCK
        // not just another FLAG? ... all signal flags are added to the
        // lower left corner"), rebuilt as a real flex row the same day
        // after Larry caught a gap bug: fixed pixel offsets (left:2/16/
        // 30/44) left dead space wherever a badge was missing -- a card
        // with only Lock + one Signal Flag showed the flag stranded
        // halfway across the card instead of snug against Lock, because
        // Signal Flags always started at left:44 whether or not Notes/
        // Link were actually present. .sb-signal-row is the shared
        // positioned wrapper (bottom-left corner, matches the Briefing
        // Board's .bb-key-badges); everything inside it is a plain flex
        // child now, sized to its own content, packed left to right with
        // no gaps for absent badges. Order inside: Lock, Signal Flags,
        // Notes, Link.
        +'.sb-signal-row{position:absolute;bottom:2px;left:2px;display:flex;align-items:center;gap:4px;pointer-events:none;z-index:6}'
        +'.sb-key-dots{display:flex;gap:2px}'
        // Person Assigned badge (Aug 9 2026, Larry: "look like the BB card
        // with the initials on the front") -- same small circle-with-
        // initials look as the Briefing Board's .bb-dot, scaled down to
        // fit this board's much smaller ~70-76px tile. Top-right is the
        // one corner nothing else on the tile claims (order badge is
        // top-left, heart is bottom-right, the whole signal cluster is
        // bottom-left).
        // Priority badge (Sept 22 2026) -- same pill as the Briefing
        // Board's .bb-pri-badge, scaled to this board's smaller tile.
        // Top-left; steps right of the PLAN board's step number.
        +'.sb-pri-badge{position:absolute;top:3px;left:3px;font-size:calc(10px * var(--fg-text-scale,1));line-height:1.35;font-weight:700;font-family:sans-serif;padding:1px 5px;border-radius:4px;pointer-events:none;z-index:6;box-shadow:0 1px 2px rgba(0,0,0,.3)}'
        +'.sb-pri-badge.sb-pri-after-order{left:24px}'
        +'.sb-person-badge{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#9c8b73;color:#fff;font-size:calc(7px * var(--fg-text-scale,1));font-weight:700;font-family:sans-serif;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;box-shadow:0 1px 2px rgba(0,0,0,.35)}'
        // Notes badge (Larry, Aug 11 2026: "pencil as signal flag on the
        // front of any card if there are Notes inside") -- a plain flex
        // child of .sb-signal-row as of Aug 15 2026.
        +'.sb-notes-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:auto;cursor:default}'
        // Video/Link flag, Aug 11 2026 (Larry: "make link usable, move
        // link flag to lower left corner") -- a plain flex child of
        // .sb-signal-row as of Aug 15 2026, and still a real clickable
        // link (not just a marker) -- opens the attached URL in a new
        // tab. draggable=false keeps a native link drag from hijacking
        // the tile's own drag-to-reorder gesture.
        +'.sb-link-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);cursor:pointer;text-decoration:none}'
        // pointer-events:auto here, Aug 4 2026 -- same fix as the
        // Briefing Board's .bb-key-badge: the wrapping .sb-signal-row
        // stays click-through (so it never grabs a card drag), but a
        // dot inherits that "none" too unless it opts back in, which
        // was silently killing its own title-on-hover meaning tooltip.
        +'.sb-key-dot{display:inline-block;width:10px;height:10px;box-shadow:0 1px 2px rgba(0,0,0,.35);pointer-events:auto;cursor:default}'
        // Lock badge, moved here from a top-right icon Aug 15 2026 (Larry:
        // treat LOCK as just another signal flag) -- a plain flex child
        // of .sb-signal-row, leftmost in the cluster.
        +'.sb-lock-badge{font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:auto;cursor:default}'
        +'.sb-key-shape-btn{width:28px;height:28px;border:2px solid transparent;border-radius:6px;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}'
        +'.sb-key-shape-btn.active{border-color:#5b9bd5}'
        +'.sb-key-swatch-btn{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}'
        +'.sb-key-swatch-btn.active{border-color:#1a3a5c}'
        +'.sb-key-pick-row{display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:1px solid #e3d9c6;border-radius:8px;background:#fff;margin-bottom:6px}'
        +'.sb-key-pick-select{display:flex;align-items:center;gap:8px;flex:1;min-width:0;border:none;background:none;cursor:pointer;text-align:left;padding:0;font:inherit}'
        +'.sb-key-pick-select span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.sb-key-pick-select[disabled]{opacity:.35;cursor:not-allowed}'
        +'.sb-key-pick-edit{border:none;background:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#5b9bd5;flex-shrink:0;padding:0 2px}'
        +'.sb-key-lib-row{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:1px solid #e3d9c6;border-radius:8px;background:#fff;margin-bottom:6px}'
        +'.sb-icon-btn{flex:1;background:#d6eaf8;border:1px solid #a9cce3;border-radius:10px;box-shadow:0 3px 8px rgba(26,58,92,0.15);padding:10px 0;font-size:calc(19px * var(--fg-text-scale,1));line-height:1;cursor:pointer;text-align:center;color:#1a3a5c;transition:transform .1s}'
        +'.sb-icon-btn:active{transform:scale(0.93)}'
        +'.sb-icon-btn.misc{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.4px;padding:14px 0}'
        // Sept 5 2026, Larry: "increase text size of Idea Board TOPIC
        // field to stand out" (paired with deleting the Topic eyebrow
        // above it, see the header markup) -- 23px -> 30px.
        // Sept 6 2026 -- carried the rest of the way to match the
        // Briefing Board's own TOPIC box (bb-topic-hit, briefing-board.js:
        // 44px, Playfair Display, rounded corners, tight 2px vertical
        // padding) as part of "make all ID bands exactly the same look
        // (other than color)" -- this box was still visibly smaller and
        // square-cornered next to it. Border/text stay this board's own
        // blue; background was also this board's own tint (#eaf3fb)
        // until Sept 15 2026 -- Larry: "the actual fields should look
        // like the TOPIC field with white background and frame though
        // colors should be different for each type of board." Fill is
        // now white everywhere, matching Briefing Board's bb-topic-hit
        // (which was already white); only the frame/text color is this
        // board's own identity now.
        // Sept 27 2026 -- #sc-board-kind-trigger folded into this same
        // rule (mirrors BB's own combined ".bb-topic-hit,.bb-boardkind-
        // hit" selector, briefing-board-styles.js): now that PROJECT is
        // retired below (sc-project-wrap), STORYBOARD is TOPIC's only
        // remaining partner and gets sized/framed identically instead of
        // its old small PROJECT-matched chip -- one rule, so the two
        // can't drift apart in size the way PROJECT/STORYBOARD used to.
        // box-shadow now reads IDBand.TOKENS.topicBox.boxShadow (id-band.js)
        // instead of its own hardcoded value -- Sept 27 2026, Larry liked
        // this "glow" and asked for it on every board, so it moved into
        // the shared token BB's own rule now reads too, rather than
        // staying a value only this board happened to already have.
        // Sept 29 2026 -- the isx-* ids are Sea of Ideas' (screen 1014) own
        // TOPIC / Board Type, given the same rules so its ID Band is identical
        // to this board's, not a lookalike (sea-id-band.js).
        +'#sc-topic-box,#sc-board-kind-trigger,#isx-topic-box,#isx-board-kind-trigger{text-align:center;background:#fff;border:2px solid #1a3a5c;border-radius:'+IDBand.TOKENS.topicBox.radius+'px;padding:'+IDBand.TOKENS.topicBox.padding+';font-size:calc('+IDBand.TOKENS.topicBox.fontSize+'px * var(--fg-text-scale,1));font-weight:700;font-family:\'Playfair Display\',serif;line-height:'+IDBand.TOKENS.topicBox.lineHeight+';color:#1a3a5c;cursor:pointer;position:relative;box-shadow:'+IDBand.TOKENS.topicBox.boxShadow+'}'
        +'#s-sea-of-ideas-cluster .sw{align-items:stretch}'
        +'#sc-divider{border-bottom:none;margin:0 0 2px;width:100%}'
        +'#sc-status{font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;text-align:right;margin-bottom:2px;min-height:0}'
        +'#sc-status:empty{display:none;margin:0}'
        +'#sc-status.err{color:#b8562f}'
        +'#sc-status.pending{color:#3a6ea5;font-style:italic}'
        +'.sc-overlay-card{background:#fff;border-radius:14px;padding:16px;width:min(260px,84%);box-shadow:0 10px 24px rgba(0,0,0,0.3)}'
        +'.sc-overlay-card label{display:block;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:6px}'
        +'.sc-overlay-card input{width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px 10px;font-size:calc(13px * var(--fg-text-scale,1));font-family:inherit;color:#1a3a5c;margin-bottom:10px;box-sizing:border-box}'
        +'.sc-overlay-actions{display:flex;gap:8px;justify-content:flex-end}'
        +'.sc-ov-btn{border:1px solid #cfe4f2;background:#fff;padding:6px 12px;border-radius:14px;font-size:calc(11px * var(--fg-text-scale,1));font-weight:600;cursor:pointer;color:#5b9bd5}'
        +'.sc-ov-btn.save{background:#5b9bd5;color:#fff;border-color:#5b9bd5}'
        // Sept 12 2026, Larry: "Hx on all screens but grayed out when
        // not relative" -- every Settings home now shows the full BB
        // list and just disables what doesn't apply here, instead of
        // omitting it. Same grayed treatment as the desktop's own
        // .sz-set-btn:disabled (drawer-system.js).
        +'.sc-ov-btn:disabled{opacity:.45;cursor:not-allowed;background:#f3f0ea;color:#8a9aa8}'
        +'.sc-ov-btn:disabled:hover{background:#f3f0ea}'
        +'.sb-gear-tabs{display:flex;gap:4px;margin-bottom:10px}'
        +'.sb-gear-tab{flex:1;font-size:calc(11px * var(--fg-text-scale,1));padding:7px 3px;border-radius:8px;border:1px solid #cfe4f2;background:#fff;cursor:pointer;color:#5b9bd5;font-family:inherit}'
        +'.sb-gear-tab.active{background:#5b9bd5;color:#fff;border-color:#5b9bd5}'
        +'.tm-groupname{font-family:\'Playfair Display\',serif;font-size:calc(16px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;text-align:center;border:none;border-bottom:1px dashed #cfe4f2;background:transparent;width:90%;padding:2px 0;display:block;margin:0 auto 12px}'
        +'.tm-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #efe9dc;text-align:left}'
        +'.tm-sym{width:22px;text-align:center;font-size:calc(15px * var(--fg-text-scale,1));padding-top:1px;flex-shrink:0}'
        +'.tm-sym.tm-clickable{cursor:pointer}'
        +'.tm-body{flex:1;min-width:0}'
        +'.tm-name{font-size:calc(13px * var(--fg-text-scale,1));font-weight:600;color:#1a3a5c}'
        +'.tm-role{font-weight:400;color:#7a6040;font-size:calc(11px * var(--fg-text-scale,1))}'
        +'.tm-contact{font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;line-height:1.25;margin-top:1px}'
        +'.tm-notes-row{display:flex;align-items:baseline;gap:5px;line-height:1.25;margin-top:1px}'
        +'.tm-notes-lbl{font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:1px;color:#a89a80;flex-shrink:0}'
        +'.tm-notes-input,.tm-phone-input{flex:1;border:none;border-bottom:1px dashed #cfe4f2;background:transparent;font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;padding:0;font-family:inherit}'
        +'.tm-rolepanel{margin:6px 0 0 32px;background:#f7fbfe;border:1px solid #cfe4f2;border-radius:8px;padding:8px 10px}'
        +'.tm-rolepanel label{display:flex;align-items:center;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));color:#1a3a5c;margin-bottom:5px;cursor:pointer}'
        +'.tm-rolepanel label:last-child{margin-bottom:0}'
        +'.tm-addrow{display:flex;align-items:center;justify-content:space-between;margin-top:10px}'
        +'.tm-add-tile{width:26px;height:26px;border-radius:50%;border:1.5px dashed #a9cce3;color:#5b9bd5;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer}'
        +'.tm-print-tile{width:26px;height:26px;border-radius:50%;border:1px solid #cfe4f2;background:#fff;color:#5b9bd5;font-size:calc(12px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;cursor:pointer}'
        +'.tm-add-wrap{position:relative;flex:1;min-width:0}'
        +'.tm-add-suggest{position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #cfe4f2;border-radius:8px;box-shadow:0 6px 16px rgba(26,58,92,0.18);max-height:160px;overflow-y:auto;overflow-x:hidden;z-index:5;box-sizing:border-box}'
        +'.tm-add-suggest-row{padding:6px 10px;font-size:calc(12px * var(--fg-text-scale,1));color:#1a3a5c;cursor:pointer;box-sizing:border-box}'
        +'.tm-add-suggest-row:hover{background:#f7fbfe}'
        +'.tm-add-suggest-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        +'.tm-add-suggest-email{color:#7a6040;font-size:calc(11px * var(--fg-text-scale,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        +'.tm-add-suggest-empty{padding:6px 10px;font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;font-style:italic}'
        // Role / Call Sheet overlay, Session 222 (Aug 18) design, built
        // Session 223 -- reuses every tm-* row/contact/notes/add-suggest
        // class above (same look as Team Roster) grouped into labeled
        // boxes instead of one flat list. cs-doers boxes Leader + Cast
        // Member together per Larry's "the doers" framing; Principal/
        // Stakeholder and Facilitator each get their own box.
        // cs-crumb (the old single-line breadcrumb here) retired Sept 14
        // 2026 -- replaced on-screen by the PROJECT/TASK fields built
        // directly in openCallSheet (idea-storyboard-people.js) and, on
        // the printed page, by cs-pr-field/cs-pr-field-label above.
        +'.cs-group{border:1px solid #efe9dc;border-radius:10px;padding:8px 10px 4px;margin-bottom:10px;text-align:left}'
        +'.cs-group.cs-doers{background:#f7fbfe;border-color:#cfe4f2}'
        +'.cs-group-title{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1a3a5c;margin-bottom:2px}'
        +'.cs-group-sub{font-size:calc(9px * var(--fg-text-scale,1));color:#a3907a;margin:-2px 0 4px}'
        +'.cs-role-label{font-size:calc(10px * var(--fg-text-scale,1));font-weight:600;color:#5b9bd5;letter-spacing:0.04em;margin-top:6px}'
        +'.cs-role-label:first-child{margin-top:0}'
        +'.cs-empty-role{font-size:calc(11px * var(--fg-text-scale,1));color:#a3907a;font-style:italic;padding:4px 0 6px}'
        +'.cs-remove-x{margin-left:6px;color:#b8562f;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1))}'
        +'.cs-parent-star{color:#c9a87c;margin-right:2px}'
        // Key Stakeholder toggle, Session 228 -- a clickable 🔑, dimmed
        // when off, full color when on. Deliberately not a star, so it
        // can never be mistaken for cs-parent-star's gold ★ (a
        // different meaning: carried over from the parent board).
        +'.cs-key-toggle{cursor:pointer;margin-right:4px;opacity:0.32;filter:grayscale(1)}'
        +'.cs-key-toggle:hover{opacity:0.6}'
        +'.cs-key-toggle.cs-key-on{opacity:1;filter:none}'
        // Primary doer star, Session 234 -- blue, not gold, so it's never
        // mistaken for cs-parent-star's gold ★ (carried-over-from-parent
        // marker) right next to it on the same row.
        +'.cs-primary-toggle{cursor:pointer;margin-right:4px;opacity:0.32;color:#3a7ca8}'
        +'.cs-primary-toggle:hover{opacity:0.6}'
        +'.cs-primary-toggle.cs-primary-on{opacity:1}'
        // Flat Cast list, Session 255 (Aug 28 2026) -- Larry: every card's
        // people screen should look like the board-level Cast screen (one
        // flat list, tm-row/tm-name/tm-rolepanel -- see _tmRenderRoster),
        // not three grouped boxes. Role choices only show once you click
        // the name (tm-rolepanel, reused as-is); a checkbox in front of
        // each row drives the board-wide person filter (multi-select --
        // see _sboardPersonFilterIds) instead of a single "Team" dropdown
        // trigger. Contact fields are now always editable (any signed-in
        // member, any row -- Larry: "anyone can edit anyone's contact
        // info"), and Notes collapses behind a ✏️ pencil after the name
        // instead of sitting open as its own row, auto-opened only when
        // notes already has something in it.
        +'.cs-filter-chk{margin-right:7px;cursor:pointer;accent-color:#5b9bd5}'
        +'.cs-role-tag{font-weight:400;color:#7a6040;font-size:calc(11px * var(--fg-text-scale,1))}'
        +'.cs-notes-pencil{cursor:pointer;margin-left:4px;opacity:0.55;font-size:calc(10px * var(--fg-text-scale,1))}'
        +'.cs-notes-pencil:hover{opacity:1}'
        +'.cs-notes-pencil.cs-notes-has{opacity:1}'
        +'.cs-contact-input{border:none;border-bottom:1px dashed #cfe4f2;background:transparent;font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;padding:0;font-family:inherit;width:auto;max-width:150px}'
        +'@media print{body *{visibility:hidden}.sb-team-print,.sb-team-print *{visibility:visible}.sb-team-print{position:absolute;left:0;top:0;width:100%!important;box-shadow:none!important}@page{size:landscape}}'
        // Call Sheet print document, Session 228 (Aug 19) -- portrait
        // page, built and shown only for the print job (see _csPrint).
        // Scoped to body.cs-printing so it never collides with the
        // sb-team-print rule above, which stays in force for Team
        // Roster's own (landscape) print button.
        +'.cs-print-doc{display:none}'
        +'.cs-pr-masthead{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:6px}'
        +'.cs-pr-mast-left h1{margin:0;font-size:26px;letter-spacing:0.04em;font-weight:700;font-family:Georgia,\'Times New Roman\',serif;color:#1a3a5c}'
        +'.cs-pr-sub{font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a6040;margin-top:4px}'
        +'.cs-pr-mast-right{text-align:right;font-family:Arial,sans-serif;font-size:11px;color:#7a6040}'
        +'.cs-pr-date{font-weight:700;color:#1a3a5c;font-size:12px}'
        // Sept 14 2026, Larry: "classic call sheet" -- PROJECT and TASK
        // as their own labeled lines (cs-pr-field/cs-pr-field-label)
        // replace the old single centered cs-pr-crumb line, matching the
        // same split on the on-screen header (openCallSheet, idea-
        // storyboard-people.js).
        +'.cs-pr-field{font-family:Arial,sans-serif;font-size:12px;color:#1a3a5c;margin:10px 0 0;text-align:left}'
        +'.cs-pr-field:last-of-type{margin-bottom:20px}'
        +'.cs-pr-field-label{display:inline-block;width:64px;font-weight:700;letter-spacing:0.08em;color:#7a6040;font-size:10.5px}'
        +'.cs-pr-group{margin-bottom:22px}'
        +'.cs-pr-group-title{font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1a3a5c;border-bottom:1.5px solid #1a3a5c;padding-bottom:4px;margin-bottom:2px}'
        +'.cs-pr-group-sub{font-family:Arial,sans-serif;font-size:10px;color:#7a6040;font-style:italic;margin:2px 0 10px}'
        +'.cs-print-doc table{width:100%;border-collapse:collapse}'
        +'.cs-pr-role{width:118px;font-weight:700;color:#5b9bd5;font-size:11px;letter-spacing:0.03em;padding:7px 0 6px;vertical-align:top;font-family:Arial,sans-serif}'
        +'.cs-pr-name{font-family:Arial,sans-serif;font-size:12.5px;vertical-align:top;padding:6px 0;border-bottom:1px solid #efe9dc}'
        +'.cs-pr-nameline{font-weight:700;color:#1a3a5c}'
        +'.cs-pr-star{color:#c9a87c;margin-right:3px}'
        +'.cs-pr-keytag{display:inline-block;font-size:9px;font-weight:700;letter-spacing:0.05em;color:#fff;background:#b8562f;border-radius:3px;padding:1px 5px;margin-right:5px;vertical-align:middle}'
        +'.cs-pr-email{color:#5b9bd5;font-size:11px;margin-top:1px}'
        +'.cs-pr-notes{color:#7a6040;font-size:11px;margin-top:2px;font-style:italic}'
        +'.cs-pr-empty{color:#b9ad98;font-style:italic;font-size:11.5px}'
        +'.cs-pr-footer{margin-top:32px;padding-top:12px;border-top:1px solid #efe9dc;font-family:Arial,sans-serif;font-size:9.5px;color:#a3907a;display:flex;justify-content:space-between}'
        +'@media print{body.cs-printing *{visibility:hidden}body.cs-printing .cs-print-doc{display:block;position:absolute;left:0;top:0;width:100%;padding:0.2in;box-sizing:border-box}body.cs-printing .cs-print-doc,body.cs-printing .cs-print-doc *{visibility:visible}}'
        +'.sb-overlay{position:fixed;inset:0;z-index:200;background:rgba(26,58,92,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
        +'.sb-overlay.active{display:flex}'
        +'#sc-board-wrap{text-align:left;overflow-x:auto;padding-bottom:4px;flex:1}'
        // Infinite canvas camera (board-canvas-camera.js), Sept 29 2026. Until
        // the camera attaches, the viewport takes no box of its own
        // (display:contents), so the board lays out and scrolls exactly as
        // before. Once attached, the viewport fills the space under the header
        // and clips; the wrap becomes the canvas (natural size, moved and
        // scaled from its top-left) and the camera owns panning.
        +'#sc-board-viewport{display:contents}'
        +'#sc-board-viewport.isx-camera{display:flex;flex:1;min-height:0;position:relative;overflow:hidden;cursor:grab}'
        +'#sc-board-viewport.isx-camera.isx-panning{cursor:grabbing}'
        +'#sc-board-viewport.isx-camera #sc-board-wrap{flex:0 0 auto;position:relative;overflow:visible;width:max-content;min-width:100%;align-self:stretch;transform-origin:0 0;padding-bottom:0}'
        +'#sc-board-viewport.isx-camera #sc-board-wrap>*{cursor:auto}'
        +'#sc-controls{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:4px 0 0}'
        +'#sc-controls .sc-ov-btn{padding:4px 10px;font-size:calc(10px * var(--fg-text-scale,1))}'
        // Sept 5 2026 -- found the real source of Larry's "still see a
        // border around the Skeleton, on my desktop monitor, and BB
        // doesn't have it" report, and it wasn't the Skeleton rule
        // itself -- it was this file separately reusing the OLD
        // 'sb-wide' class (a leftover from before full-screen boards
        // existed, meant only for CLUSTER's own "give me more room"
        // toggle below) on the Storyboard's own screen too. Whenever
        // both 'sb-wide' and 'isx-full' landed on #fg-root together,
        // sb-wide's max-width:1200px cap and 24px height inset fought
        // isx-full's own width:100vw/height:100vh and (being the
        // later-loaded stylesheet) won -- a border-shaped gap on any
        // monitor wider than 1200px. Briefing Board never touched
        // 'sb-wide' at all, which is why it never showed the gap even
        // though both boards share the exact same Skeleton rule.
        //
        // Renamed CLUSTER's toggle to its own 'cl-widescreen' class so
        // it can never again collide with a board's own full-screen
        // state, board skeleton or otherwise -- not just guarded
        // against it, structurally unable to. The Storyboard's own
        // full-screen look is entirely the shared Skeleton rule in
        // style.css now (#fg-root.isx-full .sc.active); it doesn't add
        // or need any width/height rule of its own for that any more.
        +'#fg-root.cl-widescreen:not(.isx-full){max-width:1200px!important}'
        +'#fg-root.cl-widescreen:not(.isx-full) #s-sea-of-ideas-cluster{min-height:calc(100vh - 24px)!important;max-height:calc(100vh - 24px)!important}'
        +'#s-sea-of-ideas-cluster #sc-board-wrap{display:flex}'
        +'#sc-groups-wrap{gap:2px!important}'
        // Sept 6 2026, Larry: "make all ID bands exactly the same look
        // (other than color) on all the boards" -- this eyebrow (Parent/
        // Logo/etc.) was the one place still missing the bold weight
        // every other board's matching label already carries (compare
        // briefing-board.js's .bb-mh-eyebrow, and this file's own larger
        // .sc-traveler-eyebrow just below, both font-weight:700). Color
        // stays its own per-board thing, untouched.
        +'.sc-hdr-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px}'
        // Traveler name, Sept 5 2026 -- Larry: retire the gold nameplate
        // (kept in the DOM, hidden, not deleted -- see the sc-member-name
        // block further down) in favor of the same plain ice-blue eyebrow
        // treatment every other header field already uses (Parent/Topic/
        // Logo), sized twice as large (18px vs the standard 9px) since
        // this is the traveler's own name, not just a field label -- and
        // stacked directly above PROJECT so PROJECT reads as subordinate
        // to it ("it looks like my projects are below this").
        //
        // Same day, follow-up -- Larry: "shrink traveler name slightly...
        // it is squeezed against the bottom of the header bar." The name
        // plus PROJECT stacked underneath it was tall enough to crowd the
        // header band's own bottom edge. Stepped down from 18px to 15px
        // (still noticeably bigger than the standard 9px eyebrow, just
        // not double) and tightened the gap above PROJECT (5px to 3px)
        // to buy back a little vertical room.
        +'.sc-traveler-eyebrow{font-size:calc(15px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px;font-weight:700;white-space:nowrap}'
        // On-logo LOGO eyebrow, Aug 30 2026 -- same shared T2TLogo
        // treatment as the Briefing Board's own bb-logo-eyebrow-onlogo
        // (see that file's own comment for the full reasoning): tucked
        // behind the artwork at rest via a negative z-index (a plain,
        // non-positioned <img> always paints above a negative-z-index
        // layer), centered on sc-logo-slot at all times since it's a
        // child of the slot itself. t2t-logo-eyebrow-peek is the shared
        // class T2TLogo's hover wiring toggles on every board -- a dark
        // navy text color here (rather than this theme's usual light
        // #a9cce3) since the chip it sits on while peeking is white.
        +'.sc-logo-eyebrow-onlogo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:-1;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a3a5c;white-space:nowrap;pointer-events:none}'
        +'.sc-logo-eyebrow-onlogo.t2t-logo-eyebrow-peek{z-index:4;background:#fff;border-radius:4px;padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.35)}'
        +'.sc-hdr-side{min-width:72px;min-height:46px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}'
        +'#sc-parent-hit{cursor:pointer}'
        +'#sc-parent-hit.inert{cursor:default}'
        +'#sc-parent-label{font-family:\'Playfair Display\',serif;font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;color:#fff;line-height:1.2}'
        +'#sc-topic-box.dragover,#sc-parent-hit.dragover{outline:2px solid #5b9bd5}'
        // Custom Type/Title dropdowns, Aug 13 2026 -- Larry: "the (+)
        // should be at the bottom of each dropdown list, not to the
        // side." A native <select> can't put a real dashed circle inside
        // one of its own options, so Type/Title are a small trigger
        // button + a real styled menu instead; the menu's last row is
        // the dashed-circle (+), same shape as every other add on this
        // board (see .sc-dotted-add-btn).
        +'.sc-cdrop{position:relative}'
        // Centered, Aug 13 2026 (Larry: "Center TITLE on title field") --
        // was space-between with the caret pinned to the far right,
        // which read as left-aligned. Text and caret now sit together,
        // centered as a unit, matching every other field's centered look.
        +'.sc-cdrop-trigger{display:flex;align-items:center;justify-content:center;gap:6px;text-align:center}'
        +'.sc-cdrop-trigger:after{content:\'\u25be\';font-size:calc(8px * var(--fg-text-scale,1));opacity:.7;flex-shrink:0}'
        // position:fixed + moved to <body> on open (see _sboardRenderDropdown),
        // Aug 13 2026 -- Larry: "dropdown lists drop under the headers and
        // cannot be read." Board content underneath has its own stacked
        // cards with their own z-index; nesting the menu inside the header
        // band meant it was still trapped in *that* band's own stacking
        // context no matter how high its own z-index went. Living as a
        // direct child of <body> with a real viewport position escapes
        // that entirely.
        +'.sc-cdrop-menu{position:fixed;background:#1a3a5c;border:1px solid rgba(255,255,255,.24);border-radius:'+IDBand.TOKENS.dropdownMenu.radius+'px;box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:'+IDBand.TOKENS.dropdownMenu.zIndex+';padding:'+IDBand.TOKENS.dropdownMenu.padding+'px;box-sizing:border-box;max-height:'+IDBand.TOKENS.dropdownMenu.maxHeight+'px;overflow-y:auto;min-width:'+IDBand.TOKENS.dropdownMenu.minWidth+'px}'
        +'.sc-cdrop-row{padding:'+IDBand.TOKENS.dropdownRow.padding+';font-size:calc('+IDBand.TOKENS.dropdownRow.fontSize+'px * var(--fg-text-scale,1));color:#fff;border-radius:'+IDBand.TOKENS.dropdownRow.radius+'px;cursor:pointer;white-space:nowrap}'
        +'.sc-cdrop-row:hover{background:rgba(255,255,255,.14)}'
        +'.sc-cdrop-row.active{background:rgba(255,255,255,.1);font-weight:700}'
        // VIEW's checkbox rows, Sept 19 2026 -- same shape as BB's own
        // .bb-cdrop-row.bb-view-person-row (briefing-board-styles.js).
        +'.sc-cdrop-row.sc-view-person-row{display:flex;align-items:center;gap:6px}'
        +'.sc-cdrop-row.sc-view-person-row input[type=checkbox]{margin:0;flex:none}'
        +'.sc-cdrop-addrow{display:flex;justify-content:center;gap:10px;padding:6px 0 2px;margin-top:2px;border-top:1px solid rgba(255,255,255,.14)}'
        // VIEW dropdown roles + inline add, Aug 13 2026 (Larry): the
        // person-filter list now shows each Cast member's role and lets
        // an Owner or Leader add someone right from the board face, no
        // trip to Gear required -- same Cast data, same add-member flow
        // (_tmAddMember/_tmRenderMemberSuggestions), just a second
        // doorway to it.
        +'.sc-view-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}'
        +'.sc-view-row-name{overflow:hidden;text-overflow:ellipsis}'
        +'.sc-view-row-role{font-size:calc(9px * var(--fg-text-scale,1));color:#a9cce3;flex-shrink:0;text-transform:uppercase;letter-spacing:.03em;margin-left:10px}'
        +'.sc-view-addform{padding:8px 6px 4px;border-top:1px solid rgba(255,255,255,.14);margin-top:2px}'
        +'.sc-view-addform input{width:100%;box-sizing:border-box;font-size:calc(11px * var(--fg-text-scale,1));padding:5px 7px;border:1px solid rgba(255,255,255,.3);border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font-family:inherit;margin-bottom:5px}'
        +'.sc-view-addform input::placeholder{color:rgba(255,255,255,.55)}'
        +'.sc-view-addform .tm-add-suggest{position:static;box-shadow:none;margin-bottom:5px}'
        +'.sc-view-removeform{padding:6px}'
        +'.sc-view-remove-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px;font-size:calc(11px * var(--fg-text-scale,1));color:#fff}'
        +'.sc-view-remove-row:not(:last-child){border-bottom:1px solid rgba(255,255,255,.14)}'
        +'.sc-view-remove-empty{font-size:calc(11px * var(--fg-text-scale,1));color:rgba(255,255,255,.65);padding:4px 2px}'
        +'.sc-view-add-confirm{width:100%;box-sizing:border-box}'
        +'.sc-view-add-error{font-size:calc(10px * var(--fg-text-scale,1));color:#f0b090;margin-top:2px}'
        // 👥 in-place People dropdown, Session 226 (Aug 19) design, built
        // Aug 19 2026 -- the card-back trigger used to jump straight to
        // the full Call Sheet screen; now it opens this compact preview
        // right where you clicked (same .sc-cdrop-menu shell as VIEW/
        // Type/Title), so a quick glance or a quick add/remove never
        // needs the full three-box screen at all.
        +'.sb-people-row{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:default}'
        +'.sb-people-row:hover{background:none}'
        +'.sb-people-star{flex-shrink:0;background:none;border:0;color:#3a7ca8;cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1));padding:2px;opacity:0.4}'
        +'.sb-people-star:hover{opacity:0.7}'
        +'.sb-people-star.active{opacity:1}'
        +'.sb-people-x{margin-left:8px;flex-shrink:0;background:none;border:0;color:#f0b090;cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1));padding:2px}'
        +'.sb-people-rolepick{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:6px}'
        +'.sb-people-rolepick-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.24);border-radius:6px;color:#fff;font-size:calc(12px * var(--fg-text-scale,1));padding:3px 7px;cursor:pointer;opacity:.55;font-family:inherit}'
        +'.sb-people-rolepick-btn:hover{opacity:.8}'
        +'.sb-people-rolepick-btn.active{opacity:1;background:#5b9bd5;border-color:#5b9bd5}'
        +'.sb-people-call{border-style:solid;border-color:#5b9bd5;color:#5b9bd5}'
        +'.sb-people-call:hover{background:rgba(255,255,255,.1);border-color:#fff;color:#fff}'
        +'.sc-hdr-frame{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:0 12px;box-sizing:border-box;height:30px}'
        // Sept 20 2026, Larry: "ID BAND buttons need white backgrounds.
        // Same for ALL boards now and in future" -- this used to be a
        // near-transparent "muted" look (readable on BB's own top band,
        // not on the Idea Board's own), which is exactly why VIEW below
        // had needed its own one-off solid-gray override just to stay
        // visible. Brought up to IDBand.TOKENS.iconBtn -- BB's own
        // .bb-icon-btn white-bg/framed look, now the shared source for
        // this row on every board -- so VIEW/RETURN/GEAR/CLOSE match BB
        // exactly (only the frame color stays this board's own navy).
        // No opacity here (unlike the old muted look) -- same reasoning
        // as dropping the pure-white check in the comment above: a
        // partly-transparent white over the board's own color isn't a
        // white background, it's white blended with whatever's behind
        // it, which is the exact drift this pass is closing.
        +'.sc-hdr-btn-muted{background:#fff;border:'+IDBand.TOKENS.iconBtn.borderWidth+'px solid #1a3a5c;color:#1a3a5c;border-radius:'+IDBand.TOKENS.iconBtn.radius+'px;padding:0 12px;height:'+IDBand.TOKENS.iconBtn.size+'px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.03em;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;transition:background .15s}'
        +'.sc-hdr-btn-muted:hover{background:#eef2f6}'
        +'.sc-hdr-btn-icon{padding:0;width:'+IDBand.TOKENS.iconBtn.size+'px;font-size:calc(14px * var(--fg-text-scale,1))}'
        // VIEW's one-off gray override is gone now that the shared white
        // look is itself visible against the Idea Board's own top band --
        // it just needed the same white/framed treatment as its siblings,
        // not a special color. Its "a filter is on" state stays exactly
        // as it was (a real state to show, not a background-color fix).
        +'#sc-view-trigger.sc-view-on{background:#5b9bd5;border-color:#5b9bd5;color:#fff}'
        +'.sc-hdr-frame .sc-hdr-eyebrow{color:rgba(169,204,227,.6)}'
        +'button.sc-hdr-eyebrow{background:none;border:none;padding:0;margin:0 0 3px;cursor:pointer;font-family:inherit;width:auto}'
        +'button.sc-hdr-eyebrow:hover{opacity:.65}'
        +'.sc-hdr-frame-label{opacity:.72}'
        // VIEW-by-person filter, Aug 9 2026 (Larry): a dropdown next to
        // PARENT, same idea as the Briefing Board's own VIEW filter
        // (Session 198) -- pulls the current project's real Cast roster
        // and narrows which idea cards show. Purely a display filter,
        // same rule as BB's: never touches sort_order/what's saved, and
        // headers/Subbers always stay visible (they're navigation, not
        // person-filterable content) -- only leaf idea/text/image/link
        // cards get hidden when they don't match.
        // Sept 6 2026 -- bold + Playfair Display added to match the
        // Briefing Board's own PROJECT/board-name look (bb-hdr-select in
        // briefing-board.js), part of "make all ID bands exactly the
        // same look (other than color)" -- this label read visibly
        // thinner/plainer than its BB counterpart before this.
        //
        // Sept 15 2026 -- Larry: "all the actual fields should look like
        // the TOPIC field with white background and frame though colors
        // should be different for each type of board." This was still
        // the old translucent-on-dark chip (rgba white on this board's
        // own navy), never brought up to match Briefing Board's own
        // bb-hdr-select (white bg, var(--bb-accent) frame) despite the
        // Sept 6 pass matching everything else about it. Fixed here:
        // white fill, #1a3a5c frame/text -- this board's identity color,
        // same idea as bb-hdr-select using --bb-accent.
        +'.sc-hdr-select{background:#fff;border:1.5px solid #1a3a5c;color:#1a3a5c;border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-size:calc(11px * var(--fg-text-scale,1));font-family:\'Playfair Display\',serif;font-weight:700;max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        +'.sc-org-name-cdrop{margin-top:3px}'
        +'.sc-hdr-select:hover{opacity:1}'
        +'.sc-hdr-select option{color:#2C2C2A}'
        // PROJECT's own dropdown arrow, Sept 3 2026 -- split out of
        // sc-title-trigger into its own real button (see the header
        // markup and _sboardWireProjectHeaderDropdown) so it can carry a
        // job separate from the label it used to be fused to.
        // Sept 6 2026 -- widened to match the Briefing Board's own arrow
        // chip (bb-parent-caret, briefing-board.js: 24px wide, 14px
        // glyph) -- this one read noticeably smaller/harder to tap next
        // to it. Same "make all ID bands exactly the same look" pass.
        // Sept 15 2026 -- same white-bg/frame fix as sc-hdr-select above,
        // matching bb-parent-caret's own white+var(--bb-accent) look.
        +'.sc-project-caret{background:#fff;border:1.5px solid #1a3a5c;color:#1a3a5c;border-radius:6px;width:'+IDBand.TOKENS.pickerCaret.width+'px;height:'+IDBand.TOKENS.pickerCaret.height+'px;box-sizing:border-box;padding:0;cursor:pointer;opacity:.85;font-size:calc('+IDBand.TOKENS.pickerCaret.glyphSize+'px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;flex-shrink:0}'
        +'.sc-project-caret:hover{opacity:1}'
        // TOPIC's own up/down arrows, Sept 6 2026 -- Larry: "UP and DOWN
        // ARROWS, just like on BB." Bigger than the small PROJECT-style
        // sc-project-caret chip (34px vs 24px, matching BB's own
        // bb-topic-caret next to its 44px TOPIC box) and align-self:
        // stretch so both arrows match whatever height TOPIC's box
        // renders at, same as BB's pair does next to bb-topic-hit.
        // :disabled is real (a <button disabled>, not just a style) so a
        // stray click can't pop an empty menu -- same discipline as BB's
        // own bb-topic-caret:disabled.
        //
        // Same day, follow-up -- Larry: "make the up and down arrows
        // black on a white background with a black frame like the brown
        // one on BB." BB's own bb-topic-caret is a solid white chip with
        // a 2px --bb-accent (brown) frame and --bb-ink (dark brown)
        // glyph, not the translucent-on-navy look every other chip on
        // this board uses -- explicitly asked for here in black/white
        // instead of BB's brown, a deliberate one-off rather than this
        // board's usual ice-blue-on-navy palette.
        +'.sc-topic-caret{background:#fff;border:2px solid #000;color:#000;border-radius:8px;padding:0;box-sizing:border-box;width:'+IDBand.TOKENS.topicCaret.width+'px;align-self:stretch;cursor:pointer;opacity:1;font-size:calc('+IDBand.TOKENS.topicCaret.glyphSize+'px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;flex-shrink:0}'
        +'.sc-topic-caret:hover{opacity:.75}'
        +'.sc-topic-caret:disabled{opacity:.35;cursor:default}'
        // ID Band, Sept 19 2026 (Larry: "make the Idea Board's ID Band
        // exactly like BB's") -- ported wholesale from the Briefing
        // Board's own Sept 19 2026 ID Band redesign (briefing-board-
        // styles.js: .bb-idn, .bb-mh-typebox, .bb-mh-fieldgrp, .bb-mh-
        // group-topic, .bb-mh-eyebrow, .bb-mh-group-center, .bb-mh-field-
        // trigger, #bb-topic-menu). Same class shapes, this board's own
        // established ice-blue-on-navy palette instead of BB's light
        // theme variables. Positioning itself (left/top for each of
        // these) is set every render by _sboardPositionIdBandRow (idea-
        // storyboard-navigation.js, mirrors _bbPositionIdBandRow) --
        // these rules are just the pre-JS fallback plus each piece's own
        // internal layout.
        //
        // Identity block (organization name + member name, pinned to the
        // header's true top-left corner). Logo intentionally left out --
        // Larry, same session: "drop LOGO totally for future iteration."
        +'.sc-idn{position:absolute;top:10px;left:16px;display:flex;flex-direction:column;align-items:flex-start;gap:1px}'
        +'.sc-idn-toprow{display:flex;align-items:center;gap:8px}'
        +'.sc-idn-org{font-size:calc(22px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;white-space:nowrap;line-height:1.1}'
        +'.sc-idn .sc-traveler-eyebrow{margin-bottom:0}'
        +'.sc-idn.has-org .sc-traveler-eyebrow{font-size:calc(11px * var(--fg-text-scale,1));letter-spacing:1.5px}'
        // sc-card-org, Sept 26 2026 (later) -- now a LOGO-ONLY box. It
        // used to also carry the TOPIC's resolved org name + descriptor
        // (see idea-storyboard-screens.js markup above), which sat right
        // next to sc-idn's own traveler-identity org and read as the org
        // showing twice; that text moved up into sc-idn. Position kept
        // exactly where it was -- Larry: "current position of the org/
        // descriptor is perfect for the logo if there is one."
        +'.sc-card-org{position:absolute;top:10px;left:230px}'
        +'#sc-card-org-logo-wrap{width:28px;height:28px;flex-shrink:0;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center}'
        +'#sc-card-org-logo{max-width:100%;max-height:100%;object-fit:contain;display:block}'
        // sc-card-org-eyebrow (the descriptor) now lives inside sc-idn,
        // directly under whichever org name sc-idn-org is showing --
        // "descriptor goes under the org." Same look as before, just
        // relocated; add a hair of top margin so it doesn't crowd the
        // org name above it (sc-idn's own flex gap is only 1px).
        +'.sc-idn .sc-card-org-eyebrow{font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:1.5px;text-transform:uppercase;color:#a9cce3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;margin-top:1px}'
        // PROJECT-TOPIC-STORYBOARD chain wraps, all three positioned as
        // one centered group by _sboardPositionIdBandRow.
        +'.sc-mh-typebox{position:absolute;top:0;left:0}'
        +'.sc-mh-fieldgrp{display:flex;flex-direction:column;gap:3px;align-items:center}'
        +'.sc-mh-group-topic{position:absolute;top:0;left:0}'
        // Sept 26 2026 -- Larry: eyebrow read too faint (same "more
        // visible" fix as BB's own .bb-mh-eyebrow). BB went fixed dark
        // gray, but this header's own background is dark navy (#1a3a5c)
        // -- dark gray would disappear here, so this one goes a light
        // gray at full opacity instead, same muted-but-legible intent.
        +'.sc-mh-eyebrow{font-size:calc(8px * var(--fg-text-scale,1));font-weight:400;letter-spacing:1px;text-transform:uppercase;color:#d5d5d5;opacity:1}'
        +'.sc-mh-group-center{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;position:absolute;top:0;left:0;width:max-content}'
        // PROJECT/STORYBOARD's shared size (same IDBand.TOKENS.fieldBox
        // every board reads) -- add/remove this class instead of a fresh
        // inline style so the two can never quietly drift apart again.
        +'.sc-mh-field-trigger{font-size:calc('+IDBand.TOKENS.fieldBox.fontSize+'px * var(--fg-text-scale,1));height:'+IDBand.TOKENS.fieldBox.height+'px;max-width:calc('+IDBand.TOKENS.fieldBox.maxWidth+'px * var(--fg-text-scale,1))}'
        // STORYBOARD (sc-board-kind-trigger) is now a plain click-to-open
        // label with no arrow at all, matching BB's own #bb-boardkind-
        // trigger -- its separate sc-board-kind-caret button is gone
        // (Larry, Sept 19, BB side: "additional unneeded dropdown arrow
        // beside board name").
        +'#sc-board-kind-trigger.sc-cdrop-trigger:after,#isx-board-kind-trigger.sc-cdrop-trigger:after{content:none}'
        // TOPIC hierarchy menu (click TOPIC) -- taller than the standard
        // dropdown so a whole project tree is readable, current header
        // highlighted, deeper levels indented. Mirrors #bb-topic-menu.
        +'#sc-topic-menu,#isx-topic-menu{max-height:min(60vh, 420px)}'
        // Sept 21 2026 fix -- Larry: TOPIC's tree was unreadable, black
        // text on this menu's dark navy background. These two rules
        // targeted .sc-topic-tree-row/.active, the OLD flat-list TOPIC
        // menu's classes from before topic-pyramid.js replaced it on
        // Sept 20 -- that swap never carried the dark-background
        // override over to the pyramid's own row classes (.tp-row/
        // .tp-current), which topic-pyramid.js deliberately leaves
        // colorless since it's shared, board-agnostic code (BB mounts
        // it on its own light dropdown, where inherited black is
        // already right). Scoped here instead of touching that shared
        // file, same as the dead rules they replace.
        +'#sc-topic-menu .tp-row,#isx-topic-menu .tp-row{color:#fff}'
        +'#sc-topic-menu .tp-row:hover,#isx-topic-menu .tp-row:hover{background:rgba(255,255,255,.08)}'
        +'#sc-topic-menu .tp-current,#isx-topic-menu .tp-current{background:rgba(255,255,255,.16)}'
        // Dotted-circle (+) for the Type/Title dropdowns, Aug 13 2026 --
        // Larry: "the + in a dotted line circle just like every other
        // add. Consistent symbol." Same shape/border/color as the
        // header (+) and subber (+) tiles (see _sboardMakeAddHeaderTile /
        // _sboardMakeAddSubberTile) instead of a text "(+) Add..." row
        // buried inside the native <select>, which couldn't carry that
        // look. Sits beside its dropdown, not inside it.
        +'.sc-dotted-add-btn{flex-shrink:0;width:22px;height:22px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #a9cce3;border-radius:50%;color:#a9cce3;font-size:calc(13px * var(--fg-text-scale,1));font-weight:700;font-family:inherit;line-height:1;cursor:pointer;opacity:.75;transition:opacity .15s,background .15s,border-color .15s,color .15s;padding:0}'
        +'.sc-dotted-add-btn:hover{opacity:1;background:rgba(255,255,255,.1);border-color:#fff;color:#fff}'
        +'.sc-dotted-remove-btn{border-color:#e08a7d;color:#e08a7d}'
        +'.sc-dotted-remove-btn:hover{background:rgba(224,138,125,.15);border-color:#e08a7d;color:#e08a7d}'
        +'#b-sc-purpose{width:100%;box-sizing:border-box}'
        // Sept 8 2026, Larry: "DREAM PHASE should display on one line" --
        // this is the actual TOPIC title box (not the smaller renderGroup
        // column pill), and this older rule was still allowing it to wrap
        // (white-space:normal, no ellipsis, a narrower max-width formula)
        // even after the Sept 6 pass above matched its size/shape to BB's
        // bb-topic-hit. Matched the rest of the way now: same nowrap +
        // ellipsis, same max-width formula BB's own box uses.
        +'#sc-topic-box,#isx-topic-box{display:inline-block;max-width:calc(360px * var(--fg-text-scale,1));box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1}'
        +'.sc-pill.has-children{box-shadow:3px 3px 0 rgba(26,58,92,0.20),6px 6px 0 rgba(26,58,92,0.11)}'
        +'.sc-add-header-tile:hover{background:#eaf3fb;border-color:#5b9bd5;opacity:1}'
        +'.sc-add-subber-tile:hover{background:#eaf3fb;border-color:#5b9bd5;opacity:1}'
        +'.sc-peek-card{background:#fff;border-radius:14px;padding:14px;width:min(360px,94%);max-height:82vh;overflow-y:auto;box-sizing:border-box}'
        +'.sc-peek-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid #cfe4f2}'
        +'.sc-peek-topbar button{background:#e8f5f2;border:1px solid #a8d8cc;border-radius:8px;padding:6px 10px;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;flex:0 0 auto}'
        +'.sc-peek-title{font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;text-align:center;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.sc-peek-spacer{width:32px;flex:0 0 auto}'
        +'.sb-shape-card{background:#F5F1E8;border-radius:16px;padding:16px;width:min(320px,88%);max-height:calc(100vh - 40px);overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;flex-direction:column;box-sizing:border-box}'
        +'.sb-crumbs{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;min-height:20px}'
        +'.sb-crumb-parent{font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:600;opacity:.8}'
        +'.sb-crumb-sep{font-size:calc(10px * var(--fg-text-scale,1));color:#cfc3ae}'
        +'.sb-crumb-topic{font-size:calc(16px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;font-family:\'Playfair Display\',serif}'
        +'.sb-hdr-eyebrow2{font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:1.5px;text-transform:uppercase;color:#5F5E5A;margin-bottom:3px;text-align:left}'
        // VIEW widget, Aug 7 2026 -- Header/Subber toggle on every card's
        // own DETAILS, same look/interaction as the board's own VIEW control
        // (sc-hdr-frame/sc-hdr-viewmenu up in the header band): shows only
        // the current state, click drops down the one other option. Light-
        // card colors here instead of that control's dark-band ones, to sit
        // right on DETAILS's own cream background.
        +'.sb-view-wrap{display:inline-block;text-align:center;position:relative}'
        +'.sb-view-frame{background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:5px 14px;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;font-family:\'Playfair Display\',serif;cursor:pointer}'
        +'.sb-view-frame:active{transform:scale(0.96)}'
        // sb-move-frame, Sept 26 2026 -- Larry: "MOVE field is 2 lines.
        // Can we make it one line consistent with other fields on that
        // line?" MOVE (unlike View's fixed Header/Subber or Order's
        // fixed "N of M") shows curHeaderLabel, which can run long enough
        // to wrap the button onto a second line inside its fixed-width
        // eyebrow column. Truncates with an ellipsis instead -- full name
        // is still in the button's title tooltip.
        +'.sb-move-frame{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}'
        +'.sb-view-menu{position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:1px solid #cfe4f2;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.22);padding:4px;display:none;z-index:20;white-space:nowrap}'
        +'.sb-view-menu.open{display:block}'
        +'.sb-view-menu-item{font-family:\'Playfair Display\',serif;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;padding:6px 12px;border-radius:6px;cursor:pointer}'
        +'.sb-view-menu-item:hover{background:#eaf3fb}'
        +'.sb-view-menu-item.disabled{color:#c4c0b8;cursor:default}'
        +'.sb-view-menu-item.disabled:hover{background:transparent}'
        +'.sb-hdr-vlist{display:flex;flex-direction:column;gap:3px;max-height:112px;overflow-y:auto;margin-bottom:10px;border:0.5px solid #D3D1C7;border-radius:8px;padding:6px;flex-shrink:0;background:#fff}'
        +'.sb-hdr-vitem{padding:6px 10px;border-radius:8px;font-size:calc(12px * var(--fg-text-scale,1));text-align:left;cursor:pointer;color:#2C2C2A;background:transparent}'
        +'.sb-hdr-vitem.current{background:#F5F1E8;font-weight:700}'
        +'.sb-hdr-vitem.newh{color:#0F6E56;font-weight:700;border-top:1px dashed #D3D1C7;margin-top:2px;padding-top:8px}'
        +'.sb-body-box{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:120px;max-height:50vh;border-radius:8px;background:#fff;border:0.5px solid #B4B2A9;padding:10px 12px;box-sizing:border-box;margin-bottom:8px;overflow:hidden;position:relative}'
        +'.sb-body-box img{max-width:100%;max-height:100%;border-radius:8px;object-fit:contain;display:block}'
        +'.sb-body-text{font-family:\'Playfair Display\',serif;color:#2C2C2A;font-weight:500;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;word-break:break-word}'
        // 4-line cap, Aug 7, 2026 (Larry) -- replaces the old shrink-the-
        // font-to-cram-more-in behavior on a card's own text (see the
        // plain-idea branch of openSbDetail below): text now always shows
        // at the standard 18px size and simply clips after 4 lines instead
        // of getting smaller and smaller to fit everything.
        +'.sb-body-text-clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3}'
        // Divider + even spread, Aug 21 2026 (Larry): a line above the
        // bottom action row to set it apart from the rest of the card,
        // and the icons spread across the full width instead of
        // clustered in the center -- same treatment applied to the
        // Briefing Card's own .bb-action-row (briefing-board.js) for
        // consistency between the two card types.
        +'.sb-blue-row{display:flex;gap:6px;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0;border-top:1.5px solid #B4B2A9;padding-top:10px}'
        +'.sb-blue-btn{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 10px;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;flex:1 1 auto;min-width:36px}'
        +'.sb-blue-btn:active{transform:scale(0.95)}'
        +'.sb-blue-btn.misc-on{background:#EEECE4}'
        +'.sb-blue-row-sm{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-sm{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 10px;font-size:calc(12px * var(--fg-text-scale,1));cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-sm:active{transform:scale(0.95)}'
        +'.sb-blue-row-md{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-md{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 8px;font-size:calc(12px * var(--fg-text-scale,1));font-weight:600;cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-md:active{transform:scale(0.95)}'
        +'.sb-viewas-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:1.5px;text-transform:uppercase;color:#5F5E5A;text-align:center;margin-bottom:4px}'
        +'.sb-viewas-btn{box-sizing:border-box;background:#fff;color:#5F5E5A;border:0.5px solid #D3D1C7;border-radius:8px;padding:5px 8px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;cursor:pointer;flex:1 1 auto}'
        +'.sb-viewas-btn:active{transform:scale(0.95)}'
        +'.sb-slider-project{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-align:center;color:#7c3aed;cursor:pointer;padding:4px 0;margin-bottom:2px}'
        +'.sb-slider-project:active{transform:scale(0.97)}'
        +'.sb-slider-track{display:flex;flex-direction:column;border:1px solid #B4B2A9;border-radius:10px;overflow:hidden}'
        +'.sb-slider-notch{padding:8px 0;text-align:center;font-size:calc(10.5px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;background:#fff;color:#2C2C2A;cursor:pointer;border-bottom:0.5px solid #e3e0d8}'
        +'.sb-slider-notch:last-child{border-bottom:none}'
        +'.sb-slider-notch:active:not(.sb-slide-disabled){transform:scale(0.98)}'
        +'.sb-slider-notch.sb-slide-current{background:#1a3a5c;color:#fff}'
        +'.sb-slider-notch.sb-slide-disabled{color:#c4c0b8;background:#f5f3ee;cursor:default}'
        +'.sb-card-title{font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:3px;text-transform:uppercase;color:#5b9bd5;text-align:center;margin-bottom:6px}'
        +'.sb-close-btn{box-sizing:border-box;background:#fff;color:#2C2C2A;font-weight:700;border:0.5px solid #B4B2A9;border-radius:8px;padding:10px 14px;font-size:calc(14px * var(--fg-text-scale,1));cursor:pointer;width:100%;flex-shrink:0}'
        +'.sb-parent-value{font-family:\'Playfair Display\',serif;font-size:calc(12px * var(--fg-text-scale,1));font-weight:500;color:#444441;margin-bottom:8px;text-align:left}'
        +'.sb-topic-value{display:block;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;padding:5px 8px;font-size:calc(12px * var(--fg-text-scale,1));font-weight:500;color:#2C2C2A;font-family:\'Playfair Display\',serif;margin-bottom:8px;text-align:left}'
        +'.sb-hdr-current{font-size:calc(12px * var(--fg-text-scale,1));color:#2C2C2A;font-weight:500;cursor:pointer;margin-bottom:6px;padding:5px 8px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;text-align:left}'
        /* DETAILS redesign — July 17, 2026. Large landscape card shape (distinct
           from the compact .sb-shape-card used by the Shape/reserved-header
           dialog), Current Location row + single MOVE button, HEART/NOTES
           grouped directly below Content. */
        +'.sb-details-card{width:min(380px,90vw);border-radius:0;border-top:6px solid #5b9bd5;box-shadow:0 10px 30px rgba(0,0,0,0.18);position:relative}'
        +'.sb-details-card::after{content:\'\';position:absolute;top:6px;right:0;width:0;height:0;border-style:solid;border-width:0 16px 16px 0;border-color:transparent #e4ddc9 transparent transparent}'
        // TOP ROW (PARENT/VIEW/ORDER) + SIGNAL FLAGS, Aug 7 2026 -- replaces
        // the old .sb-loc-row/.sb-loc-crumbs/.sb-move-btn (Current Location
        // breadcrumb + its own MOVE button), which are retired.
        +'.sb-eyebrow-row{display:flex;gap:8px;margin-bottom:10px}'
        +'.sb-eyebrow-col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}'
        +'.sb-eyebrow-col .sb-hdr-eyebrow2{text-align:center}'
        +'.sb-flag-add-btn{flex-shrink:0;width:26px;height:26px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #cfe4f2;border-radius:50%;color:#5b9bd5;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;cursor:pointer;opacity:.85;transition:opacity .15s,background .15s}'
        +'.sb-flag-add-btn:hover{background:#eaf3fb;border-color:#5b9bd5;opacity:1}'
        +'.sb-flag-add-btn:active{transform:scale(0.95)}'
        +'.sb-below-content-row{display:flex;gap:6px;margin:6px 0 8px}'
        +'.sb-notes-pill{font-size:calc(12px * var(--fg-text-scale,1));padding:5px 9px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;display:flex;align-items:center;gap:4px;cursor:pointer;color:#2C2C2A;font-family:inherit}'
        +'.sb-notes-pill.active{background:#EEECE4}'
        // Addition checkboxes, Aug 27 2026 -- Idea Card counterpart to the
        // Briefing Card's own .bb-addition system (briefing-board.js):
        // Notes/Links/Related Storyboards/Signal Flags each get a
        // checkbox that opens the section when checked, hides it (without
        // losing anything typed in it) when unchecked. Reuses
        // .sb-hdr-eyebrow2 for the label text so it matches every other
        // eyebrow on this card; the label override below just cancels
        // that class's own margin/centering since it's riding next to a
        // checkbox here instead of stacked above a field.
        +'.sb-addition{width:100%;margin-bottom:10px;text-align:left}'
        +'.sb-addition-label{display:flex;align-items:center;gap:6px;cursor:pointer;color:#2C2C2A;line-height:14px}'
        +'.sb-addition-label input[type=checkbox]{width:14px;height:14px;margin:0;flex-shrink:0;cursor:pointer}'
        +'.sb-addition-label .sb-hdr-eyebrow2{margin-bottom:0;transform:translateY(-1.5px)}'
        +'.sb-addition-body{margin-top:6px}'
        +'.sb-swatch-row2{display:none;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}'
        +'.sb-inline-field{margin-bottom:10px;flex-shrink:0}'
        /* CLUSTER view — Logged July 7, 2026. SHAPING (#sb-detail-overlay) always
           renders above CLUSTER (#sb-cluster-overlay) so opening a card's SHAPING
           card from inside CLUSTER never gets buried underneath it. */
        +'#sb-detail-overlay{z-index:220}'
        +'#sb-cluster-overlay{z-index:200}'
        +'.cl-card{background:#eef2f6;border-radius:16px;padding:14px;width:min(560px,96%);height:min(700px,90vh);box-shadow:0 10px 30px rgba(0,0,0,0.35);display:flex;flex-direction:column;box-sizing:border-box;transition:width .15s,height .15s}'
        +'.cl-card.cl-wide{width:min(1100px,96vw);height:min(920px,92vh)}'
        +'.cl-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px;flex-shrink:0}'
        +'.cl-title{font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.cl-topbar-btns{display:flex;gap:6px;flex-shrink:0}'
        +'.cl-close{background:#e8f5f2;border:1px solid #a8d8cc;border-radius:8px;padding:5px 11px;font-size:calc(13px * var(--fg-text-scale,1));cursor:pointer;flex-shrink:0}'
        +'.cl-hint{font-size:calc(10px * var(--fg-text-scale,1));font-style:italic;color:#7a90a8;text-align:center;margin-bottom:6px;flex-shrink:0}'
        /* cl-body holds the shelf + starburst together so their arrangement can
           flip from stacked (shelf below, mobile/normal) to side-by-side (shelf
           column on the left, wide/desktop) without touching the topbar/hint
           above them. Tied to the same ⛶ toggle that already means "desktop." */
        +'.cl-body{flex:1;display:flex;flex-direction:column;min-height:0}'
        +'.cl-card.cl-wide .cl-body{flex-direction:row;gap:10px}'
        +'.cl-starburst{order:1;flex:1;position:relative;overflow-y:auto;overflow-x:hidden;padding:20px;border-radius:12px;background:radial-gradient(circle,rgba(91,155,213,0.10),transparent 70%);min-height:0}'
        +'.cl-empty{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#93a4b5;text-align:center;width:80%}'
        +'.cl-canvas{position:relative;width:100%;cursor:crosshair}'
        +'.cl-lasso{position:absolute;border:2px solid #2f7fe0;background:rgba(47,127,224,0.16);pointer-events:none;z-index:900;box-shadow:0 0 14px rgba(47,127,224,0.4)}'
        +'.sc-tile.cl-selected{box-shadow:0 0 0 3px #2f7fe0,0 0 10px rgba(47,127,224,0.55)}'
        +'.cl-shelf-col{order:2;flex-shrink:0;display:flex;flex-direction:column;min-height:0}'
        +'.cl-card.cl-wide .cl-shelf-col{order:0;width:118px;border-right:1.5px solid #cfe4f2;padding-right:8px}'
        +'.cl-shelf-label{font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#7a6040;text-align:center;margin:8px 0 4px;flex-shrink:0}'
        +'.cl-card.cl-wide .cl-shelf-label{text-align:left;margin:0 0 6px}'
        +'.cl-shelf{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding:4px 2px 2px;border-top:1.5px solid #cfe4f2;flex-shrink:0;align-items:flex-start}'
        +'.cl-card.cl-wide .cl-shelf{flex-direction:column;overflow-x:hidden;overflow-y:auto;border-top:none;flex:1;align-items:stretch}'
        /* Fixed height + 2-line clamp — a long header name used to stretch every
           pill (and the whole shelf row) taller, squeezing the starburst above
           it down to almost nothing. Height is capped no matter how long the
           name is; full text is still available via the title tooltip. Made
           smaller overall per Larry's request — these are wayfinding chips,
           not the main content, and were taking up more room than they earned. */
        +'.cl-bucket{flex:0 0 auto;width:72px;height:36px;padding:3px 6px;border-radius:8px;background:#fff;border:1.5px solid #a9cce3;font-size:calc(9.5px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;text-align:center;cursor:pointer;box-sizing:border-box;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.1;word-break:break-word;align-items:center;justify-content:center}'
        +'.cl-card.cl-wide .cl-bucket{width:100%;height:34px;font-size:calc(10px * var(--fg-text-scale,1))}'
        +'.cl-bucket.dragover{outline:2px solid #5b9bd5}'
        +'.cl-newbucket{flex:0 0 auto;min-width:36px;height:36px;padding:0 10px;border-radius:8px;background:#eaf3fb;border:1.5px dashed #a9cce3;font-size:calc(14px * var(--fg-text-scale,1));line-height:36px;color:#5b9bd5;cursor:pointer;text-align:center;box-sizing:border-box}'
        +'.cl-card.cl-wide .cl-newbucket{width:100%;box-sizing:border-box}'
        +'.cl-newbucket-input{flex:0 0 auto;width:90px;height:36px;padding:0 8px;border-radius:8px;border:1.5px solid #a9cce3;font-size:calc(10px * var(--fg-text-scale,1));font-family:inherit;box-sizing:border-box}'
        +'.cl-card.cl-wide .cl-newbucket-input{width:100%}'
        // Keyboard-selected header highlight, Aug 20 2026 (Larry: MOVE vs
        // VIEW shortcuts -- Tab/Shift+Tab to nest/un-nest a header,
        // Ctrl+Down/Ctrl+Up to drill into/back out of one). Click a header
        // or Subber tile to select it; this ring shows which one the
        // keyboard shortcuts will act on.
        +'#s-sea-of-ideas-cluster .sb-kbd-selected{outline:3px solid #2d7dff!important;outline-offset:-2px}'
        // Alt+M "move armed" highlight, Sept 19 2026 (Larry: "what if
        // Alt-M prepares card to move with next click where it goes?").
        // Pulsing amber ring on the armed card itself, distinct from the
        // blue keyboard-selection ring above and the green drop-target
        // cues below, so it reads as "waiting for you to click a
        // destination" rather than either of those. The green hover cue
        // on every other card while armed echoes the same "totally
        // green if ready for drop" cue a real drag already shows.
        +'#s-sea-of-ideas-cluster .sb-move-armed{outline:3px dashed #f5a623!important;outline-offset:-2px;animation:sbMoveArmedPulse 1s ease-in-out infinite}'
        +'@keyframes sbMoveArmedPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,.55)}50%{box-shadow:0 0 0 9px rgba(245,166,35,0)}}'
        +'body.sb-move-arming [data-header-id]:hover{outline:5px solid #22c55e!important;outline-offset:-2px;cursor:copy}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    // Sept 5 2026 -- dropped the "card" class (Larry: Skeleton unification,
    // every board stretches to fit like Briefing Board's own screen instead
    // of starting life as a fixed-size, rounded-corner card that later gets
    // forced full-screen). See the matching CSS note above (near the old
    // #fg-root.isx-full override) for what replaced it.
    // Sept 5 2026 -- THE actual border/white-space bug, finally run to
    // ground (both the automatic border-removal fix and the sb-wide
    // rename above were real cleanups, but neither one was this).
    // '.sw' is a shared class (style.css: white background, 28px/32px
    // padding) used by plain card-style screens across the site --
    // this screen's own inline style already trimmed that down to
    // 16px/20px, but never all the way to 0. Every full-screen board
    // (Idea, Plan, and Share all render through this exact same
    // function -- they're the same screen, just showing different
    // cards) inherited that leftover padding: a white ring around the
    // navy board, on every side, exactly the size of the padding.
    // Briefing Board was never built with a '.sw' wrapper at all,
    // which is the real reason it never showed this. Dropped the
    // padding to 0 -- header and board now paint flush to every edge
    // of the full-screen shell, no ring left to show.
    div.innerHTML='<div class="sc" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:0;align-items:stretch;text-align:center;position:relative">'
      // Sept 5 2026 -- header band flattened to match Briefing Board's own
      // header, same session: no more separate rounded-corner box floating
      // inside the screen (border-radius:10px removed) -- just a plain
      // divider line under it instead, same idea as Briefing Board's own
      // border-bottom under .bb-mhead. Kept as a neutral, low-contrast line
      // rather than a second board color, since a board's identity is meant
      // to be one solid color now, not a color pair.
      +'<div id="sc-header-area" style="background:#1a3a5c;padding:10px 16px 4px;margin-bottom:0;position:relative;min-height:70px;border-bottom:1px solid rgba(255,255,255,.15)">'
      // ID Band, Sept 19 2026 (Larry: "make the Idea Board's ID Band
      // exactly like BB's") -- full rebuild of this header's identity
      // strip to match the Briefing Board's own Sept 19 2026 ID Band
      // redesign (briefing-board-screens.js): a top-left identity block
      // (organization name + member name -- Logo left out, see the CSS
      // comment above) plus PROJECT-TOPIC-STORYBOARD as one dynamically
      // centered chain (_sboardPositionIdBandRow, idea-storyboard-
      // navigation.js -- same measure-and-chain approach as BB's own
      // _bbPositionIdBandRow), replacing everything this used to be: the
      // Aug 16 2026 3-column grid, the Sept 6 2026 up/down TOPIC carets
      // (folded into one click-opens-the-whole-hierarchy gesture, same
      // as BB's own Sept 19 TOPIC redesign), and STORYBOARD's old fixed
      // top:50%/left:75% position. sc-pagenum's triple-click reveal
      // (wired below, unchanged) still lives on #sc-topic-box itself.
      // Sept 26 2026 (later), Larry, live on the Blue Sky board: the
      // per-card/inherited Organization (below) was floating in its own
      // box mid-header, right next to this block -- when a TOPIC had one
      // set, its org name sat beside the traveler's own identity org,
      // reading as "org shown twice." Fix: sc-idn-org now doubles as
      // BOTH slots -- the TOPIC's own resolved org (when the chain has
      // one) takes priority and overwrites whatever the traveler-identity
      // fill wrote here, since _sboardRenderOrgDisplay runs LAST in
      // _sboardUpdateHeaderChrome now (idea-storyboard-header.js) and
      // otherwise leaves this line exactly as fill() set it (no card-
      // level org = old single-org-line behavior, unchanged). The
      // descriptor (sc-card-org-eyebrow) sits directly under whichever
      // org name is showing, above the traveler name -- "descriptor goes
      // under the org." See _sboardRenderOrgDisplay, idea-storyboard-
      // navigation.js.
      +'<div class="sc-idn" id="sc-idn">'
      +'<div class="sc-idn-toprow"><div class="sc-idn-org" id="sc-idn-org" style="display:none"></div></div>'
      +'<div class="sc-card-org-eyebrow" id="sc-card-org-eyebrow" style="display:none"></div>'
      // _sboardRenderMemberName (below) fills in the text.
      +'<div class="sc-traveler-eyebrow" id="sc-traveler-name"></div>'
      +'</div>'
      // Per-card/inherited Organization's LOGO, Sept 26 2026 (later) --
      // the org NAME + descriptor text moved up into sc-idn above (this
      // box used to carry all three together, which is what caused the
      // "org shown twice" duplicate). Larry: "current position of the
      // org/descriptor is perfect for the logo if there is one" -- so
      // this box keeps its original spot and now holds only the logo,
      // shown only when the resolved TOPIC actually has a logo_url.
      +'<div class="sc-card-org" id="sc-card-org" style="display:none">'
      +'<div id="sc-card-org-logo-wrap"><img id="sc-card-org-logo" alt=""></div>'
      +'</div>'
      // TOPIC field (the separate PROJECT switcher that used to sit here)
      // retired Sept 27 2026 to mirror BB's own ID Band simplification
      // (bb-project-wrap, briefing-board-screens.js) the same day: pure
      // navigation duplication now that TOPIC's own pyramid (sc-topic-box,
      // below) already climbs to MASTER and lists the same top-level
      // Topics as children. Same "retire in place, don't delete" as
      // everything else this file has retired -- _sboardWireProjectPicker/
      // _sboardRenderProjectField (wherever they live) are left exactly as
      // they were, just with no sc-title-trigger visible for them to
      // update; harmless no-ops, same as BB's own _bbRenderBoardPicker.
      +'<div id="sc-project-wrap" class="sc-mh-typebox" style="display:none">'
      +'<div class="sc-mh-fieldgrp"><div class="sc-mh-eyebrow">Topic</div><div class="sc-cdrop" id="sc-title-cdrop"><button type="button" class="sc-hdr-select sc-mh-field-trigger" id="sc-title-trigger" title="Click to open your topics; double-click for the fast-jump list"></button><div class="sc-cdrop-menu" id="sc-title-menu" hidden></div></div></div>'
      +'</div>'
      // TOPIC -- Sept 19 2026, matching BB's own redesign: the up/down
      // arrow chips are gone ("too cluttered" on BB). Clicking TOPIC
      // itself now opens the whole project's header hierarchy with the
      // current header highlighted (_sboardWireTopicTree, idea-
      // storyboard-navigation.js). _sboardParentAncestorChoices/
      // _sboardWireParentAncestorDropdown and _sboardTopicChildChoices/
      // _sboardWireTopicChildDropdown (idea-storyboard-navigation.js)
      // are retired in place, not deleted -- same "leave the old function
      // working, just nothing left wired to it" treatment BB's own
      // retired up/down arrows got.
      +'<div id="sc-topic-wrap" class="sc-mh-group-topic">'
      +'<div id="sc-pagenum" style="position:absolute;top:-14px;left:0;font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">1010</div>'
      // Sept 27 2026 -- Larry: "MASTER field is higher than Blue Sky
      // field" (the exact "change one, forget the other" drift the id-
      // band.js consolidation was meant to end -- this file's own
      // sc-boardkind-wrap already has display:flex;align-items:center on
      // its own .sc-cdrop, matching BB's bb-topic-cdrop and bb-boardkind-
      // wrap; this one was the one left over from before, still block-
      // level, so #sc-topic-box (inline-block) got extra baseline
      // whitespace below it, making this wrap measure a few px taller
      // than sc-boardkind-wrap -- IDBand.positionRow centers each field
      // by its OWN measured height, so an inflated topicWrap gets
      // pushed down less/positioned differently than boardkindWrap once
      // the two are supposed to sit on one shared centered row.
      +'<div class="sc-cdrop" id="sc-topic-cdrop" style="display:flex;align-items:center">'
      +'<div id="sc-topic-box" data-header-id="__topic__" title="Click to see this topic\'s headers"><span id="sc-topic-text"></span><div id="sc-topic-badge"></div></div>'
      +'<div class="sc-cdrop-menu sc-topic-tree" id="sc-topic-menu" hidden></div>'
      +'</div>'
      +'</div>'
      // STORYBOARD (board-kind), Sept 19 2026 -- now a plain click-to-open
      // label with no arrow at all (sc-board-kind-caret retired, see the
      // CSS override above), matching BB's own #bb-boardkind-trigger and
      // fixing the same "two dropdown arrows" complaint Larry raised on
      // BB's side the same session.
      // Sept 27 2026 -- "Board" eyebrow dropped and sc-hdr-select/sc-mh-
      // field-trigger classes removed, matching BB's own same-day change
      // (bb-boardkind-hit is TOPIC's own class under a second name): this
      // button now reads the shared #sc-topic-box,#sc-board-kind-trigger
      // CSS rule above instead, so it can't drift out of size sync with
      // TOPIC the way the old small chip drifted from PROJECT's.
      +'<div class="sc-mh-group-center" id="sc-boardkind-wrap"><div class="sc-cdrop" style="display:flex;align-items:center;gap:2px"><button type="button" class="sc-cdrop-trigger" id="sc-board-kind-trigger" title="Switch to Plan, Story, or Cast">BLUE SKY</button></div><div class="sc-cdrop-menu" id="sc-board-kind-menu" hidden></div></div>'
      // Sept 5 2026, Larry: "delete the nametag -- don't totally delete it
      // yet, I don't know why, I just like it. Can it go somewhere on the
      // website that is retrievable but not in active use?" Retired in
      // place, not removed: wrapped in a plain display:none box so every
      // id, style, and the render wiring below (_sboardRenderMemberName)
      // stay exactly as they were -- delete this wrapper's display:none
      // (or the wrapper itself) to bring the gold nameplate straight
      // back, nothing else to rebuild.
      +'<div style="display:none">'
      +'<div id="sc-member-name" style="display:inline-flex;flex-direction:column;align-items:center;background:linear-gradient(180deg,#e8c878,#b8923e 55%,#8a6a26 100%);border:1px solid #6b4a2c;border-radius:8px;padding:5px 14px 6px;box-shadow:2px 4px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,248,220,.5);white-space:nowrap">'
      +'<div style="color:#4a3418;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-shadow:1px 1px 0 rgba(255,240,200,.5)">Thoughts to Things</div>'
      +'<div id="sc-member-name-text" style="color:#4a3418;font-family:\'Playfair Display\',serif;font-weight:700;font-size:calc(17px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;text-shadow:1px 1px 0 rgba(255,240,200,.5)"></div>'
      +'</div>'
      +'</div>'
      // sc-idn/sc-project-wrap/sc-topic-wrap/sc-boardkind-wrap above are
      // each self-contained (own open+close), and no longer share a
      // single flex-column wrapper the way traveler-name/PROJECT used to
      // -- one fewer closing </div> here than this block had before Sept
      // 19 2026, matching that removed wrapper.
      // align-items:flex-end, Sept 6 2026 -- Larry: "LOGO should be to the
      // left of the Utilities button JUST LIKE on BB." Logo is gone now
      // (see below), but the bottom-justified row it needed stays --
      // VIEW/Return/Utility/Close all line up along their shared bottom
      // edge the same way.
      +'<div class="sc-hdr-side" style="position:absolute;top:10px;right:16px;display:flex;flex-direction:row;gap:6px;align-items:flex-end">'
        // Storyboard/Session toggle removed here, Aug 9 2026 (Larry): this
        // header is the Idea Storyboard's own, Session-specific chrome
        // stays out of it -- Session gets its own entry point dealt with
        // separately later, not a switch living on this screen.
        // Logo dropped entirely, Sept 19 2026 (Larry: "Drop LOGO field to
        // left of return and replace with single head icon button just
        // like on BB") -- sc-logo-wrap and everything in it (eyebrow,
        // anchor, slot, image, add button, file input, resize handle) is
        // gone from this board's chrome. T2TLogo.wire/render calls at boot
        // and in _sboardUpdateHeaderChrome are left in place: every one of
        // them starts with a document.getElementById check on an id that
        // no longer exists and returns immediately, so they're harmless
        // no-ops rather than something that needs deleting too -- same
        // "retire in place" treatment as everything else superseded here.
        //
        // VIEW, same day -- Larry: "People can be assigned headers on an
        // IDEA board too," so a person filter belongs here exactly like
        // BB's own bb-view-trigger (briefing-board-screens.js): a single
        // 👤 icon button in Logo's old spot, left of Return. Lights up
        // (.sc-view-on) whenever a person filter is applied -- see
        // _sboardSyncViewTriggerLabel/_sboardWireViewFilterDropdown,
        // idea-storyboard-navigation.js -- and reuses the board's own
        // existing _sboardPersonFilterIds/_sboardRecomputeFilterMatches
        // state, the same state the Cast popup's checkboxes
        // (idea-storyboard-people.js) already write to, rather than
        // building a second, separate filter.
        // A-Z, Oct 4 2026 -- Larry: one button in every board's ID Band icon
        // row, leftmost (left of TEAM). Gray when off, lit when on; on boards
        // where it does not apply it looks the same as off and only the hover
        // tooltip explains. Markup, look and letter grouping: az-toggle.js.
        // Wiring on this board: _sboardWireAzButton, idea-storyboard-navigation.js.
      +(window.T2TAZ ? T2TAZ.buttonHTML('sc-az-btn','sc-hdr-btn-muted sc-hdr-btn-icon') : '')
      +'<div class="sc-cdrop" id="sc-view-cdrop" style="position:relative"><button type="button" class="sc-hdr-btn-muted sc-hdr-btn-icon" id="sc-view-trigger" title="TEAM: showing everyone \u2014 click to show only one person&#39;s cards." aria-label="TEAM — filter by person">👤</button><div class="sc-cdrop-menu" id="sc-view-menu" hidden></div></div>'
        // RETURN, Sept 15 2026 -- Bill: "a RETURN button to jump back to
        // the last screen." Same muted-icon family as Utility, mirrors
        // bb-return on the Briefing Board (id-band.js's IDBand.jumpToRecorded
        // handles both). b-sc-close above is actually Close, despite its
        // pre-existing "Return" tooltip -- left that alone, out of scope
        // here, but naming this one sc-return (not b-sc-return) avoids
        // reading like a third b-sc-* variant of the same old confusion.
        +'<button class="sc-hdr-btn-muted sc-hdr-btn-icon" id="sc-return" title="Return to previous screen">↩︎</button>'
        +'<button class="sc-hdr-btn-muted sc-hdr-btn-icon" id="b-sc-gear" title="Utility">⚙️</button>'
        // Sept 20 2026 -- was .sc-ov-btn, the generic overlay-popup button
        // class (pill-shaped, auto-width -- built for Save/Cancel rows
        // elsewhere in this file), not this row's own icon-button family.
        // That's why Close sat differently shaped from its three
        // siblings; matches them now (same class VIEW/RETURN/GEAR use).
        +'<button class="sc-hdr-btn-muted sc-hdr-btn-icon" id="b-sc-close" title="Return">✕</button>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      // #sc-board-viewport (Sept 29 2026): the camera's window onto the board.
      // #sc-board-wrap stays the one element every render clears and refills;
      // the camera moves/scales it from outside, so nothing that draws the
      // board had to change. Without the camera script the viewport is
      // display:contents (see the CSS) and the board scrolls natively as before.
      +'<div id="sc-board-viewport"><div id="sc-board-wrap"></div></div>'
      +'</div></div>';
    fg.appendChild(div.firstChild);
    // These live as direct children of fg-root, NOT inside the Storyboard's
    // own .sc screen div — a .sc gets display:none whenever it isn't the
    // active screen, and a display:none ancestor hides everything inside it
    // even with position:fixed. Nesting the overlays in Storyboard meant
    // opening a card's detail from the CREATE screen built the card but it
    // was trapped inside a hidden parent — dblclick looked like it did
    // nothing. Living at fg-root level, they render from any screen.
    if(!document.getElementById('sb-detail-overlay')){
      var detailOv=document.createElement('div');
      detailOv.id='sb-detail-overlay'; detailOv.className='sb-overlay';
      fg.appendChild(detailOv);
      // Click the backdrop (not the card itself) to close — same result as
      // the explicit ✕. Added July 14, 2026.
      detailOv.addEventListener('click', function(e){
        if(e.target===detailOv) closeSbDetail();
      });
    }
    if(!document.getElementById('sb-cluster-overlay')){
      var clusterOv=document.createElement('div');
      clusterOv.id='sb-cluster-overlay'; clusterOv.className='sb-overlay';
      fg.appendChild(clusterOv);
    }
    T().registerPageNum('s-sea-of-ideas-cluster', '1010'); // Larry, July 29 2026: renumbered from 9710 -- Idea Storyboard now reads as 1010 in the Dream Phase sequence, not the 9700s Storyboard-family block.
    T().registerCtx('s-sea-of-ideas-cluster', 'Storyboard');
    T().wire('b-sc-close', _sboardCloseBoard);
    T().wire('b-sc-gear', _sboardOpenGearMenu);
    T2TLogo.wire(_sboardLogoCfg);
    _sboardMountIdBand();   // TOPIC pyramid, Board Type, RETURN, row layout -- shared (id-band-controls.js)
    // _sboardWireProjectHeaderDropdown(), Sept 19 2026 -- re-pointed at
    // sc-title-trigger now that sc-project-caret is gone (see that
    // function's own trigger lookup, above): PROJECT drops down on click
    // exactly like STORYBOARD's sc-board-kind-trigger does, per Larry's
    // same-day follow-up ("PROJECT field must drop down on IDEA board
    // just like STORYBOARD field").
    _sboardWireProjectHeaderDropdown();
    _sboardWireViewFilterDropdown();
    _sboardWireAzButton();
    // _sboardWireParentAncestorDropdown()/_sboardWireTopicChildDropdown()
    // no longer wired at boot, Sept 19 2026 -- TOPIC's up/down arrow chips
    // are gone (matching BB's own Sept 19 ID Band redesign); a single
    // click on TOPIC now opens the whole project hierarchy instead (see
    // _sboardWireTopicTree, idea-storyboard-navigation.js). Both retired
    // functions are left defined, just unreachable, same "retire in
    // place" treatment every other superseded ID Band control on this
    // project gets.
    // PROJECT, Sept 2 2026 -- Larry: "Top Project for each member = IDEA
    // STORYBOARDS. The HEADERS for that board are the PROJECTS plus
    // COLLABORATOR and STAKEHOLDER." Every member has exactly one true
    // top-level project now (see the retirement note on
    // _sboardRenderTitlePicker above), so PROJECT stops being a picker
    // that switches between several roots and becomes a fixed label
    // reading "Idea Storyboards" (set once here, and again defensively
    // in _sboardRenderMemberName on every chrome refresh).
    //
    // First cut of this (same day) opened openProjectSwitcher's popup on
    // click -- wrong per Larry's very next message: "I clicked on Idea
    // Storyboards which should take me to the master Idea Storyboard,"
    // i.e. a real click should DRILL IN, landing on the actual board
    // where Mouse Criteria/Field Guide/etc. show as ordinary Header
    // tiles (same screen every other Header already opens onto -- no
    // separate "master" screen to build), not surface a small popup
    // instead of it.
    // Sept 19 2026, Larry: "PROJECT field must drop down on IDEA board
    // just like STORYBOARD field" -- a single click on PROJECT now opens
    // the same project-list dropdown STORYBOARD opens (see
    // _sboardWireProjectHeaderDropdown's boot call below, now pointed at
    // sc-title-trigger since sc-project-caret is gone), rather than
    // drilling straight into the current project. The ensure-root-then-
    // drill-in logic this click handler used to run lives on now as that
    // dropdown's pinned MASTER row instead (same behavior, reached one
    // click deeper) -- see that row's own click handler,
    // _sboardWireProjectHeaderDropdown. openProjectSwitcher's popup is
    // real, tested code and still useful as a fast jump without scrolling
    // the board -- kept reachable on double-click rather than deleted.
    (function(){
      var titleTrigger=document.getElementById('sc-title-trigger');
      if(titleTrigger){
        // Sept 5 2026 -- safe pre-load default only; _sboardRenderProjectLabel
        // (called from _sboardUpdateHeaderChrome on every refresh, same as
        // Parent/Topic) overwrites this the moment the current project is
        // known, per Larry: PROJECT should show whichever project is
        // actually on screen (Field Guide, etc.), not a fixed label.
        // Sept 6 2026 -- text itself no longer names Idea Storyboards
        // (see _sboardRenderProjectLabel's own Sept 6 note); this is just
        // the placeholder shown for the instant before that first real
        // render lands.
        // Sept 7 2026, Larry: PROJECT and TOPIC were both reading
        // "PROJECTS" at root ("PROJECTS - PROJECTS - Wish Tank" on the
        // live board) -- PROJECT now reads MASTER at root instead, TOPIC
        // (the root Header's own name) keeps reading PROJECTS. Same
        // MASTER wording applies board-wide, not just here -- see
        // briefing-board.js's own root PROJECT label.
        titleTrigger.textContent='MASTER';
        titleTrigger.title='Click to open your topics; double-click for the fast-jump list';
        titleTrigger.addEventListener('dblclick', function(e){
          e.stopPropagation();
          openProjectSwitcher();
        });
      }
      // Member name (replaces the old Organization Type/Name fields,
      // same session) -- see _sboardRenderMemberName below. The
      // member's profile may still be loading the first time this
      // screen paints, so this listens for the same event the
      // nameplate (screen-zero.js) already relies on for exactly that
      // race, in addition to the direct call _sboardUpdateHeaderChrome
      // makes on every render.
      // Sept 5 2026 -- no longer also re-running PROJECT's midway-to-Logo
      // placement here: PROJECT now nests under the traveler name in a
      // fixed column instead of being positioned off Name/Logo's boxes
      // (see the Sept 5 note on sc-project-wrap in the header markup
      // above), so there's nothing left for this listener to reposition.
      window.addEventListener('t2t:member-loaded', function(){ _sboardRenderMemberName(); });
    })();
    // Board-type color folded into this same startup batch, Sept 15
    // 2026 -- see T2TData.ensureBoardTypeColorsLoaded/getBoardTypeColor
    // in header-data.js. _sboardApplyBoardBg already ran once just below
    // with whatever was cached (nothing, on a fresh tab); this repaints
    // with the real per-Type color once it's actually loaded.
    Promise.all([_sboardLoadMyRoots(), _sboardEnsureHiddenTypesLoaded(), T2TData.ensureBoardTypeColorsLoaded('idea_bg')]).then(function(){ _sboardRenderTypePicker(); _sboardRenderOrgName(); _sboardApplyBoardBg(); });
    var boardWrapBgEl=document.getElementById('sc-board-wrap');
    if(boardWrapBgEl) boardWrapBgEl.addEventListener('dblclick', function(e){ if(e.target===boardWrapBgEl || e.target.id==='sc-groups-wrap') openBoardBgPicker(); });
    // Under the camera the empty board can also be the viewport itself
    // (the area past the edge of the columns), Sept 29 2026.
    var boardViewportBgEl=document.getElementById('sc-board-viewport');
    if(boardViewportBgEl) boardViewportBgEl.addEventListener('dblclick', function(e){ if(e.target===boardViewportBgEl) openBoardBgPicker(); });
    // Header band is now the same single color as the board (see
    // _sboardApplyBoardBg) — double-click there opens the same picker,
    // same gesture as double-clicking the board itself. Larry, August 1
    // 2026: "I double clicked it and nothing happened."
    var scHeaderAreaEl=document.getElementById('sc-header-area');
    if(scHeaderAreaEl) scHeaderAreaEl.addEventListener('dblclick', function(e){ if(e.target===scHeaderAreaEl) openBoardBgPicker(); });
    _sboardApplyBoardBg();
    _sboardWireAutoScroll();
    _sboardAttachCamera();

    // Opening the TOPIC card, Aug 13 2026 (Larry: "Double click to open
    // the TOPIC card") -- double-click is the way in. Was a second way
    // alongside a corner-flip triangle; the corner-flip was removed
    // Sept 6 2026 (Larry: "remove the gray corners flip option from all
    // cards. Just double click to open cards.") so double-click is now
    // the only way in. Kept separate from the plain-click drill-in that
    // used to live here -- that was replaced by drag-and-drop onto TOPIC
    // (locked July 27, 2026) and stays that way; this only opens the
    // card, never changes what board is being viewed.
    // Sept 19 2026: the "Shape > Root prompt" editor this used to open at
    // MASTER root is gone (see _sboardGetRootPrompt, idea-storyboard-
    // navigation.js -- Larry: the ghost "What do you want?" text it let
    // you type needed to be deleted, not just relabeled). There's no real
    // card at root to open, so double-clicking TOPIC there is now inert,
    // same as PARENT already is at that level.
    function _sboardOpenTopicCard(){
      if(_sboardIsReadOnly()){ if(window.T2TLibraryView && _sboardAllRowsById[T2TShared.currentTopicId]) T2TLibraryView.showCard(_sboardAllRowsById[T2TShared.currentTopicId]); return; }
      if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
        openSbDetail(_sboardAllRowsById[T2TShared.currentTopicId]);
      }
    }

    // Drag any card (header or plain idea) onto the TOPIC box to make it
    // the viewed board -- replaces double-click-to-drill-in (locked July
    // 27, 2026), reusing the .dragover outline that was already sitting
    // here unused. Distinct from the old chrome drag-drop system removed
    // above (that one relocated a card's filing; this one only changes
    // what's currently being viewed, same job double-click used to do).
    (function(){
      var topicBoxEl=document.getElementById('sc-topic-box');
      if(!topicBoxEl) return;
      // Click to select the TOPIC card itself for Ctrl+Down/Ctrl+Up, same
      // as clicking any Header/Subheader tile does (see the matching
      // handler in renderGroup and _sboardMakeHeaderStackTile). Uses the
      // _SBOARD_TOPIC_SENTINEL value since there's no real row id for
      // "the board's own current Topic" to store in _sboardSelectedHeaderId.
      // Aug 21 2026 (Larry: "make the Topic card selectable and
      // highlightable like headers are").
      topicBoxEl.addEventListener('click', function(e){
        if(_sboardSelectedHeaderId===_SBOARD_TOPIC_SENTINEL) return;
        var prevId=_sboardSelectedHeaderId;
        _sboardSelectedHeaderId=_SBOARD_TOPIC_SENTINEL;
        if(prevId){
          var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
          if(prevEl) prevEl.classList.remove('sb-kbd-selected');
        }
        topicBoxEl.classList.add('sb-kbd-selected');
      });
      topicBoxEl.addEventListener('dblclick', function(e){ e.stopPropagation(); _sboardOpenTopicCard(); });
      topicBoxEl.addEventListener('dragover', function(e){ e.preventDefault(); topicBoxEl.classList.add('dragover'); });
      topicBoxEl.addEventListener('dragleave', function(){ topicBoxEl.classList.remove('dragover'); });
      topicBoxEl.addEventListener('drop', function(e){
        e.preventDefault();
        topicBoxEl.classList.remove('dragover');
        var raw=e.dataTransfer.getData('text/plain');
        if(!raw) return;
        var id = raw.indexOf('header:')===0 ? raw.slice(7)
               : raw.indexOf('group:')===0 ? (raw.slice(6).split(',')[0]||null)
               : raw;
        var row = id && _sboardAllRowsById[id];
        if(row) _sboardDrillInto(row);
      });
    })();


    // PARENT's plain-click/double-click "climb one level" shortcuts
    // (July 12 - July 16 2026 history below, kept for the record) lost
    // their target, Sept 6 2026, when sc-parent-hit was deleted along
    // with the rest of the PARENT field/eyebrow (Larry: "Delete PARENT
    // eyebrow and field. UP and DOWN ARROWS, just like on BB.") --
    // T().wire and the dblclick listener below both already null-guard
    // on the element, so they're harmless no-ops now rather than
    // errors; left in place, not deleted, in case PARENT's old hit-box
    // ever comes back. The job itself isn't gone -- the new up-arrow's
    // dropdown (sc-parent-caret, now living on TOPIC's own row --
    // see _sboardWireParentAncestorDropdown) reaches the same nearest-
    // ancestor destination, just via one dropdown click instead of a
    // direct one, matching how BB's own up-arrow works.
    //
    // PARENT still climbs one level on a simple click — the DETAILS slider
    // (added July 12, 2026) is now the primary way to move a specific card
    // between Parent/Topic/Header/Subber, so the earlier chrome drag-drop
    // system (drag Topic/Parent/cards onto each other) has been removed;
    // this plain click is the one navigation shortcut that stays outside
    // the slider, since it predates this session and needs no card open.
    // Fixed July 16, 2026: was climbing all the way to the cross-project
    // "What do you want?" apex whenever the current Topic had no parent of
    // its own (i.e. sitting at a project's own root) — that apex behaves
    // like a project chooser, duplicating what PROJECT already does, so
    // PARENT now stays inert there instead of escaping to it.
    // Aug 24 2026 fix: this helper used to be declared right here, nested
    // one level inside injectSeaOfIdeasCluster() -- fine for the PARENT
    // click handler right below (same nesting), but wireSboardUndoKeyboard()
    // is a SEPARATE sibling function declared far below (not nested inside
    // this one), so it could never see this identifier. climbOut()/drillIn()
    // calling it threw a silent "ReferenceError: _sboardCanGoUpFromTopic is
    // not defined" on every Page Down (and on Page Up whenever the TOPIC
    // card itself was selected) -- exactly matching Larry's report that
    // Down never worked while Up "mostly" did. Moved to the shared outer
    // scope (right before wireSboardUndoKeyboard) where every nav helper
    // it's called from can actually reach it.
    T().wire('sc-parent-hit', function(){
      if(_sboardCanGoUpFromTopic()){ _sboardGoUpOneLevel(); }
    });
    // Double-click PARENT also climbs back to TOPIC level — explicit
    // gesture requested July 16, 2026, alongside the existing single click.
    (function(){
      var parentHitEl=document.getElementById('sc-parent-hit');
      if(parentHitEl) parentHitEl.addEventListener('dblclick', function(e){
        e.stopPropagation();
        if(_sboardCanGoUpFromTopic()){ _sboardGoUpOneLevel(); }
      });
    })();

    // Triple-click page-number reveal, moved onto TOPIC itself, Sept 6
    // 2026 -- its old home (sc-parent-hit) was deleted along with the
    // rest of the PARENT field. Not traveler-facing (Design Notes: "the
    // traveler never sees" page numbers, "Claude always reads them"),
    // so it just needed a click target that's always present regardless
    // of depth -- sc-topic-box is that, same as sc-parent-hit used to be.
    (function(){
      var clicks=0, timer=null;
      var hit=document.getElementById('sc-topic-box');
      if(hit) hit.addEventListener('click', function(){
        clicks++;
        if(timer) clearTimeout(timer);
        timer=setTimeout(function(){ clicks=0; }, 600);
        if(clicks>=3){
          clicks=0;
          var pn=document.getElementById('sc-pagenum');
          if(pn){ pn.style.opacity='1'; setTimeout(function(){ pn.style.opacity='0'; }, 2000); }
        }
      });
    })();

    T().registerScreenActivate('s-sea-of-ideas-cluster', renderSeaOfIdeasCluster);

    document.addEventListener('paste', function(e){
      var screen=document.getElementById('s-sea-of-ideas-cluster');
      if(!screen || !screen.classList.contains('active')) return;
      var active=document.activeElement;
      if(active && (active.tagName==='TEXTAREA' || active.tagName==='INPUT')) return;
      var items=(e.clipboardData && e.clipboardData.items) || [];
      var imageItem=null;
      for(var i=0;i<items.length;i++){
        if(items[i].type && items[i].type.indexOf('image/')===0){ imageItem=items[i]; break; }
      }
      if(!imageItem) return;
      e.preventDefault();
      var file=imageItem.getAsFile();
      if(file) _sboardBatchUpload([file]);
    });

    wireSboardUndoKeyboard();
  }
