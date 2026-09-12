/* ============================================================
   idea-storyboard-screens.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   SCREENS. The two screen shells (legacy 9220 grid + the live 9710
   cluster/storyboard screen), the shared T() helper nearly every
   other Idea Storyboard file calls to reach backpack.js, and the
   main board-drawing engine: renderSeaBoard (the big one),
   renderSeaOfIdeasCluster, the drag-to-reorder auto-scroll wiring,
   and drag-and-drop image upload onto the board.

   Split out of idea-storyboard-9710.js Sept 12, 2026 -- the file had
   grown to 11,463 lines (Code Growth Watch flags a split well before
   that; idea-storyboard-9710.js itself was already the product of an
   earlier split of sea-of-ideas.js back on July 17, 2026). Behavior
   is UNCHANGED -- this is a structural split, not a rebuild.

   All ten pieces below share one global scope on the page (same
   pattern used for the briefing-board.js split on Sept 9, 2026) --
   there's no per-file wrapper and no namespace object, so every
   function/variable here is reachable by its plain name from any of
   the other nine files. Load order does not matter for anything
   except idea-storyboard-9710.js itself, which must load LAST among
   this family (it hands the finished window.T2TStoryboard object to
   idea-media-shared.js and session.js, so everything it references
   has to already exist).

   Sibling files: idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js,
   idea-storyboard-navigation.js, idea-storyboard-tiles.js,
   idea-storyboard-header.js, idea-storyboard-card-detail.js,
   idea-storyboard-9710.js (boot -- loads last)
   ============================================================ */

  function T(){ return window.T2T; }

  // Aug 11 2026 -- when the text-size boost changes (see screen-fit.js),
  // re-render whichever board is actually showing so its tiles pick up
  // the new size immediately instead of only on the next natural
  // refresh. renderSeaBoard already no-ops safely if neither this
  // screen nor 9711 is on screen (see its own guard), and already
  // delegates to 9711's own render when THAT'S the active one -- so one
  // listener here covers both screens.
  window.addEventListener('fg-text-scale-changed', function(){
    try { renderSeaBoard(true); } catch(e){}
  });

  /* ── SEA OF IDEAS — 9220 grid view. ARCHIVED July 29 2026: Larry --
     'now defunct 9220 which needs to be archived.' The Idea Board tool-
     tray button and the Map screen's Dream Phase step both used to point
     here; both now go to 1010 (Idea Storyboard / s-sea-of-ideas-cluster)
     instead, so nothing in the live UI links to this screen anymore.
     Left in place rather than deleted, in case something still depends
     on it existing -- say the word if you want it fully removed. ── */
  function injectSeaOfIdeas(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-sea-of-ideas')) return;
    if(!document.getElementById('sea-of-ideas-style')){
      var style=document.createElement('style');
      style.id='sea-of-ideas-style';
      style.textContent='#s-sea-of-ideas .phase-header{background:#fdf8f0;padding:12px 16px 10px;text-align:center;border-bottom:2px solid #5b9bd5;flex-shrink:0}#s-sea-of-ideas .ph-eyebrow{font-size:calc(10px * var(--fg-text-scale,1));letter-spacing:3px;text-transform:uppercase;color:#7a6040}#s-sea-of-ideas .bar-dream-pp{background:#1a3a5c!important;border-color:#14305a!important;border-top-color:#2a5080!important}#s-sea-of-ideas .bar-dream-pp .tb{background:#d6eaf8!important;border-color:#a9cce3!important;color:#1a3a5c}#s-sea-of-ideas .bar-dream-pp .tb:hover:not(.dim){background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas"><div class="phase-header" style="text-align:left;display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden"><span class="ph-eyebrow">🌈 DREAM PHASE</span><span class="ph-eyebrow">·</span><span class="ph-eyebrow">CREATE</span></div><div class="sw" style="padding:16px 32px;align-items:center;text-align:center"><div style="font-family:\'Playfair Display\',serif;font-size:calc(26px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:2px">ISB</div><div style="font-size:calc(13px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:14px;line-height:1.7">Everything captured so far. No order. Just a blast of ideas.</div><div id="sea-thumb" style="width:100%;border:1.5px solid #b0a898;border-radius:10px;margin-bottom:10px;background:#f5f5f5;padding:6px"><div id="sea-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div><div id="sea-empty" style="text-align:center;padding:16px;display:none"><div style="font-size:calc(36px * var(--fg-text-scale,1));margin-bottom:6px">🌊</div><div style="font-size:calc(12px * var(--fg-text-scale,1));font-style:italic;color:#999">Your ISB</div></div></div><div id="b-sea-to-cluster" style="font-size:calc(12px * var(--fg-text-scale,1));color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:4px">🧩 Try clustering these</div><div class="sp"></div></div><div class="bar2 bar-dream-pp"><button class="tb" id="b-sea-back">⬅️</button><button class="tb" id="b-sea-mg">🔍</button><button class="tb" id="b-sea-fwd">➡️</button><button class="tb" id="b-sea-close" style="display:none">✕</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas', '9220');
    T().registerCtx('s-sea-of-ideas', 'ISB');
    T().registerGems('s-sea-of-ideas', [
      {text:'The ISB holds everything — no commitment, no wrong answers.', attr:'T2T Field Guide · CREATE'}
    ]);
    // 'Add an Idea' -> s-idea-capture entry removed July 18, 2026 along
    // with the legacy screen it pointed to (see idea-media-shared.js). It
    // used the wrong property name anyway (id instead of target, which is
    // what renderTrivia in backpack.js actually reads) so it likely never
    // navigated correctly in the first place. The other two entries below
    // are untouched — also worth noting neither of THEM sets `target`
    // either (both use `id`), so this whole trivia list may never have
    // worked; flagging rather than guessing at a fix beyond today's ask.
    T().registerTrivia('s-sea-of-ideas', [
      { label: 'Purpose', id: 's-sea-trivia-purpose' },
      { label: 'Types of Seas of Ideas', id: 's-sea-trivia-types' }
    ]);
    T().wire('b-sea-back', function(){
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sea-mg', T().goMG);
    T().wire('b-sea-close', function(){ T().returnToMG(); });
    T().wire('b-sea-to-cluster', function(){
      if(window.T2TMedia && window.T2TMedia.openBoardResume) window.T2TMedia.openBoardResume();
      else T().nav('s-sea-of-ideas-cluster');
    });
    T().wire('b-sea-fwd', function(){
      if(T().currentFile()==='dream.html' && document.getElementById('s-idea-button')){ T().nav('s-idea-button'); }
      else { T().closeMG(); T().returnToMG(); }
    });
    T().registerScreenActivate('s-sea-of-ideas', renderSeaOfIdeas);
  }

  async function renderSeaOfIdeas(){
    var fwdBtn = document.getElementById('b-sea-fwd');
    var backBtn = document.getElementById('b-sea-back');
    var mgBtn = document.getElementById('b-sea-mg');
    var closeBtn = document.getElementById('b-sea-close');
    if(fwdBtn){
      var inChapterFlow = (T().currentFile()==='dream.html' && document.getElementById('s-idea-button') && T().getSeaChapterEntry());
      fwdBtn.style.opacity = inChapterFlow ? '1' : '0.3';
      fwdBtn.style.pointerEvents = inChapterFlow ? 'auto' : 'none';
      // Side-trip entry (via 🔍 backpack, not chapter flow): swap the
      // sequence costume (⬅️/🔍/➡️) for a single ✕, matching the
      // Storyboard/CLUSTER visit-and-return pattern. The back button's
      // own handler already does this same smart-return logic in this
      // case -- this just makes the button costume match the behavior.
      if(backBtn) backBtn.style.display = inChapterFlow ? '' : 'none';
      if(mgBtn) mgBtn.style.display = inChapterFlow ? '' : 'none';
      fwdBtn.style.display = inChapterFlow ? '' : 'none';
      if(closeBtn) closeBtn.style.display = inChapterFlow ? 'none' : '';
    }
    var grid = document.getElementById('sea-grid');
    var empty = document.getElementById('sea-empty');
    var _sb = T().sb;
    if(!grid || !_sb) return;
    grid.innerHTML = '';
    try{
      var u = (await _sb.auth.getUser()).data.user;
      if(!u) return;
      var res = await _sb.from('ideas').select('content_type,image_url,text_content').eq('user_id', u.id).order('created_at', {ascending:false});
      var rows = res.data || [];
      if(rows.length === 0){ if(empty) empty.style.display='block'; return; }
      if(empty) empty.style.display='none';
      rows.forEach(function(row){
        if(row.content_type === 'image' && row.image_url){
          var tile = document.createElement('div');
          tile.style.cssText = 'aspect-ratio:1/1;border-radius:6px;overflow:hidden;background:#eee';
          var img = document.createElement('img');
          img.src = row.image_url;
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
          tile.appendChild(img);
          grid.appendChild(tile);
        } else if(row.text_content){
          var tile = document.createElement('div');
          tile.style.cssText = 'aspect-ratio:1/1;border-radius:6px;background:#fff;border:1px solid #ddd;padding:10px;display:flex;align-items:center;justify-content:center;overflow:hidden';
          var card = document.createElement('div');
          card.style.cssText = 'font-family:Playfair Display,serif;font-style:italic;font-size:calc(12px * var(--fg-text-scale,1));color:#333;line-height:1.4;text-align:center';
          card.textContent = row.text_content;
          tile.appendChild(card);
          grid.appendChild(tile);
        }
      });
    }catch(e){}
  }

  /* ── SEA OF IDEAS: CLUSTER (9221) ── */
  // Logo/artwork upload, Aug 26 2026 -- real upload wired at last (was a
  // "coming soon" toast since Aug 16). The (+) and an already-loaded
  // image both open the same native file picker; save goes on the
  // current PROJECT'S ROOT row, not whatever header/sub-header happens
  // to be on screen, so one logo covers the whole project -- IDEA and
  // PLAN boards both read it.
  //
  // Aug 30 2026 -- upload/crop/resize/drag/hover-peek all now live in
  // the shared window.T2TLogo controller (idea-media-shared.js), also
  // used by the Briefing Board (Larry: "Add BB logo code to all other
  // boards"). _sboardLogoCfg is this board's own description of
  // itself for that controller -- which row holds the logo fields and
  // how to read/save it, this board's element ids, size bounds, and
  // this board's own dark-themed crop-overlay chrome (reusing the
  // shared sb-detail-overlay/closeSbDetail every other Storyboard
  // dialog uses).
  //
  // Sept 6 2026 -- Larry: "LOGO should be to the left of the Utilities
  // button JUST LIKE on BB." Logo moved out of its own independently-
  // positioned wrap near Topic and into sc-hdr-side's normal flex row,
  // right before Utility/Close (see the header markup below) -- same
  // spot BB's own Logo sits in (bb-mhead-actions). That means Logo now
  // has a real BB equivalent (a fixed flex-layout position) for the
  // first time, so positionAnchor (_sboardPositionLogoNearTopic) is no
  // longer wired in below -- left defined, not deleted, in case this
  // layout ever changes back.
  var _sboardLogoCfg={
    slotId:'sc-logo-slot', imgId:'sc-logo-img', addBtnId:'sc-logo-add-btn',
    inputId:'sc-logo-input', resizeHandleId:'sc-logo-resize-handle',
    eyebrowTopId:'sc-logo-eyebrow', eyebrowOnLogoId:'sc-logo-eyebrow-onlogo',
    // Sept 6 2026 -- matched to Briefing Board's own logo range
    // (briefing-board.js _bbLogoCfg) as part of "make all ID bands
    // exactly the same look" -- the empty (+) frame and any newly
    // added logo now open at the same footprint on both boards. A
    // project's already-saved logo_w/logo_h is untouched by this (only
    // the future resize ceiling/floor and the default for a brand-new
    // upload change), so nothing already on screen jumps size.
    minSize:IDBand.TOKENS.logo.minSize, maxSize:IDBand.TOKENS.logo.maxSize, defaultSize:IDBand.TOKENS.logo.defaultSize, minFrameFromCrop:12,
    uploadPrefix:'logo', subjectLabel:'project',
    showToast:_sboardShowToast,
    getRow:function(){ return _sboardCurrentRootRow(); },
    saveLogo:async function(patch){
      var root=_sboardCurrentRootRow();
      if(!root) return;
      var _sb=T().sb;
      var upd=await _sb.from('ideas').update(patch).eq('id', root.id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(root.id, patch);
    },
    crop:{
      stageMaxW:340, stageMaxH:340, handleColor:'#5b9bd5', handleBorderColor:'#0d2440',
      mount:function(doClose){
        var ov=document.getElementById('sb-detail-overlay');
        if(!ov) return null;
        ov.innerHTML='<div class="sc-overlay-card" style="width:min(420px,92%);text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:6px">Crop your logo</div>'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">Drag the box to choose what to keep. Drag a corner to reshape it -- any rectangle, not just square.</div>'
          +'<div id="lc-stage" style="position:relative;margin:0 auto 14px;background:#0d2440;border-radius:8px;overflow:hidden"></div>'
          +'<div style="display:flex;gap:6px">'
          +'<button type="button" class="sc-ov-btn save" id="lc-use" style="flex:1">Use this crop</button>'
          +'<button type="button" class="sc-ov-btn" id="lc-cancel" style="flex:1">Cancel</button>'
          +'</div>'
          +'</div>';
        ov.classList.add('active');
        var cancelBtn=document.getElementById('lc-cancel'); if(cancelBtn) cancelBtn.onclick=doClose;
        return { stage:document.getElementById('lc-stage'), useBtn:document.getElementById('lc-use') };
      },
      close:function(){ closeSbDetail(); }
    }
  };

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
        // Order # badge -- Larry, Aug 3 2026: "small, no bigger that Notes
        // field" (.sb-notes-pill below is 12px; this is smaller still).
        // Moved to the upper-left corner (Larry, Aug 3 2026) so the number
        // reads first, before anything else on the card. The link badge
        // (top-left, link+image cards only) is nudged right below so the
        // two never overlap.
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
        +'.sb-key-dot{display:inline-block;width:8px;height:8px;box-shadow:0 1px 2px rgba(0,0,0,.35);pointer-events:auto;cursor:default}'
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
        // square-cornered next to it. Background/border/text stay this
        // board's own blue, only shape and type match now.
        +'#sc-topic-box{text-align:center;background:#eaf3fb;border:2px solid #1a3a5c;border-radius:'+IDBand.TOKENS.topicBox.radius+'px;padding:'+IDBand.TOKENS.topicBox.padding+';font-size:calc('+IDBand.TOKENS.topicBox.fontSize+'px * var(--fg-text-scale,1));font-weight:700;font-family:\'Playfair Display\',serif;line-height:'+IDBand.TOKENS.topicBox.lineHeight+';color:#1a3a5c;cursor:pointer;position:relative;box-shadow:0 3px 10px rgba(0,0,0,0.28)}'
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
        +'.cs-crumb{font-size:calc(10px * var(--fg-text-scale,1));letter-spacing:0.06em;color:#7a6040;text-align:center;margin:-6px 0 12px}'
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
        +'.cs-pr-crumb{font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.06em;color:#7a6040;margin:12px 0 26px;text-align:center}'
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
        +'.sc-hdr-btn-muted{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:0 12px;height:30px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.03em;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;opacity:.85;transition:background .15s,opacity .15s}'
        +'.sc-hdr-btn-muted:hover{background:rgba(255,255,255,.14);opacity:1}'
        +'.sc-hdr-btn-icon{padding:0;width:30px;font-size:calc(14px * var(--fg-text-scale,1))}'
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
        +'.sc-hdr-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-size:calc(11px * var(--fg-text-scale,1));font-family:\'Playfair Display\',serif;font-weight:700;max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
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
        +'.sc-project-caret{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:6px;width:'+IDBand.TOKENS.pickerCaret.width+'px;height:'+IDBand.TOKENS.pickerCaret.height+'px;box-sizing:border-box;padding:0;cursor:pointer;opacity:.85;font-size:calc('+IDBand.TOKENS.pickerCaret.glyphSize+'px * var(--fg-text-scale,1));display:flex;align-items:center;justify-content:center;flex-shrink:0}'
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
        +'#sc-topic-box{display:inline-block;max-width:calc(360px * var(--fg-text-scale,1));box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1}'
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
        +'#s-sea-of-ideas-cluster .sb-kbd-selected{outline:3px solid #2d7dff!important;outline-offset:-2px}';
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
      // Header row, Aug 16 2026 -- Larry: "Center TOPIC horizontally. Move
      // parent to left of topic. Add field to right of topic for logo or
      // artwork. To right of logo say IDEA in light blue letters." 3-column
      // grid (1fr auto 1fr): Topic in the middle auto column -- mathematically
      // centered in the header no matter what either side holds, since both
      // side tracks are equal 1fr and are otherwise left empty on purpose,
      // just to hold their share of width so Topic's centering math stays
      // balanced.
      //
      // Sept 6 2026 -- Larry: "Delete PARENT eyebrow and field. UP and DOWN
      // ARROWS, just like on BB." Matches the Briefing Board's own Sept 6
      // retirement of its separate Parent field/eyebrow in favor of an
      // up-arrow directly on TOPIC (see the Sept 6 note on bb-mhead-top in
      // briefing-board.js) -- the left column that used to hold the Parent
      // eyebrow/pill is now just the pre-existing page-number reveal
      // (sc-pagenum, moved down from Parent's old column but otherwise
      // untouched), and the up-arrow (still id'd sc-parent-caret --
      // _sboardWireParentAncestorDropdown/_sboardParentAncestorChoices
      // below are unchanged, just retargeted onto TOPIC's own row) now
      // sits directly on TOPIC's left, pointing up (▴, matching BB's own
      // bb-topic-caret-up glyph -- was ▾ before, which never matched what
      // an "upward" jump actually meant). A new down-arrow
      // (sc-topic-caret-down) sits on TOPIC's right, mirroring BB's own
      // descend caret (bb-topic-caret) -- see _sboardTopicChildChoices/
      // _sboardWireTopicChildDropdown, below, for that new piece. Parent's
      // own "plain click steps up exactly one level" and its triple-click
      // page-number reveal both lived on the now-deleted sc-parent-hit;
      // the plain-click shortcut has no replacement (the up-arrow's
      // dropdown covers the same job, one extra click), and the
      // triple-click reveal moved to TOPIC itself (see the wiring below,
      // near the old sc-parent-hit wiring) so it isn't silently lost.
      +'<div style="display:grid;grid-template-columns:1fr auto 1fr;column-gap:14px;align-items:start">'
      +'<div style="display:flex;flex-direction:column;align-items:center;justify-self:end">'
      +'<div id="sc-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">1010</div>'
      +'</div>'
      +'<div class="sc-cdrop" id="sc-topic-cdrop" style="display:flex;align-items:center;justify-content:center;gap:6px">'
      +'<button type="button" class="sc-topic-caret" id="sc-parent-caret" title="Jump to any level above" aria-label="Jump to any level above">▴</button>'
      // Topic eyebrow deleted, Sept 5 2026, Larry -- Topic's own box is
      // sized up (see the #sc-topic-box font-size bump below) to stand
      // out on its own, without a small label crowding it from above.
      +'<div id="sc-topic-box" data-header-id="__topic__"><span id="sc-topic-text"></span><div id="sc-topic-badge"></div></div>'
      +'<button type="button" class="sc-topic-caret" id="sc-topic-caret-down" title="Descend into a child layer" aria-label="Descend into a child layer">▾</button>'
      +'<div class="sc-cdrop-menu" id="sc-parent-menu" hidden></div>'
      +'<div class="sc-cdrop-menu" id="sc-topic-child-menu" hidden></div>'
      +'</div>'
      +'<div></div>'
      +'</div>'
      // Logo moved out of here, Sept 6 2026 -- Larry: "LOGO should be to
      // the left of the Utilities button JUST LIKE on BB." Its markup
      // (sc-logo-wrap and everything inside it) now lives in sc-hdr-side
      // below, right before Utility/Close -- see that section for the
      // full history on Logo's placement (Aug 16 through Sept 5 all
      // happened while it lived here, independently positioned off
      // Topic; none of that math is needed any more now that it's a
      // normal flex item like BB's own Logo always was).
      //
      // IDEA label, Aug 16 2026 -- Larry: IDEA should read larger than
      // Topic and sit half way from Topic to the header's right edge.
      // Positioned independently of the grid above (percent offsets
      // against the full header width, header-area is already
      // position:relative): Topic sits at the header's horizontal center
      // (50%), so half way from there to the right edge (100%) is 75% --
      // that's IDEA's position.
      // Board-kind label -- static per board type. This file (the Idea
      // Storyboard) always reads IDEA; the not-yet-built Planning
      // Storyboard gets the same slot/styling reading PLAN. Raised/embossed
      // look (Larry, same day: "make IDEA look raised") via a light
      // highlight above + dark shadow below -- classic emboss technique,
      // no new color needed.
      // Aug 26 2026, Larry: "make IDEA a drop down choice: IDEA - PLAN -
      // SHARE - ORG" -- same four workspaces as the door icons on a
      // Briefing Card's back (Idea Board / Plan / Share / Organization).
      // Now a real sc-cdrop trigger (same shared menu shell as Type/
      // Title/View above) instead of a plain label; the emboss text
      // itself stays exactly as it was, just wrapped in a <button> with
      // its default chrome stripped so nothing looks different at rest.
      // This file only reads IDEA, so the trigger's own text never
      // changes. Aug 30 2026, Larry: replaced with IDEA - PLAN - BRIEFING
      // BOARD - SHARE - CAST -- BRIEFING BOARD and CAST are real,
      // already-built destinations (see _sboardWireBoardKindDropdown),
      // SHARE is still the only placeholder left.
      // Sept 6 2026 -- stepped down 42px -> 36px to match the Briefing
      // Board's own board-kind label after ITS Sept 6 shrink (bb-mh in
      // briefing-board.js, "Briefing Board needs to be on one line...
      // 42px -> 36px") -- part of "make all ID bands exactly the same
      // look (other than color)"; this one was the last board-kind
      // label still at the old size.
      +'<button type="button" class="sc-cdrop-trigger" id="sc-board-kind-trigger" title="Switch to Plan, Briefing Board, Share, or Cast" style="position:absolute;top:50%;left:75%;transform:translate(-50%,-50%);font-family:\'Playfair Display\',serif;font-weight:700;font-size:calc('+IDBand.TOKENS.boardKindLabel.fontSize+'px * var(--fg-text-scale,1));letter-spacing:1px;color:#5b9bd5;white-space:nowrap;text-shadow:-1px -1px 0 rgba(255,255,255,.3),1px 1px 2px rgba(0,0,0,.5);background:none;border:none;padding:0;margin:0;cursor:pointer">IDEA</button>'
      +'<div class="sc-cdrop-menu" id="sc-board-kind-menu" hidden></div>'
      +'<div style="position:absolute;top:10px;left:16px;z-index:3;display:flex;flex-direction:column;align-items:center">'
      // Traveler name, Sept 5 2026 -- Larry: "delete the nametag -- don't
      // totally delete it yet, I don't know why, I just like it. Can it
      // go somewhere on the website that is retrievable but not in active
      // use? Put the traveler name in the ice blue above a smaller
      // PROJECT (so it looks like my projects are below this)." Replaces
      // the gold nameplate (kept below, hidden not deleted) with the same
      // plain ice-blue eyebrow every other header field already uses
      // (Parent/Topic/Logo), via the new .sc-traveler-eyebrow class (see
      // the CSS rules above, near .sc-hdr-eyebrow) -- twice the standard
      // size since it's the traveler's own name, not a field label -- and
      // first in this wrapper's flex column so PROJECT (moved into this
      // same column, just below) reads as sitting underneath it.
      // _sboardRenderMemberName (below) fills in the text.
      +'<div class="sc-traveler-eyebrow" id="sc-traveler-name"></div>'
      // PROJECT, Sept 2 2026 -- fixed "Idea Storyboards" label (see the
      // one-time click wiring in injectSeaOfIdeasCluster) that opens the
      // real global-shortcut popup, openProjectSwitcher, on click. This
      // markup predates that -- the "sc-cdrop"/"sc-cdrop-trigger" classes
      // and the empty sc-title-menu just below are leftover from when
      // this button was an inline dropdown (the retired Title picker,
      // see _sboardRenderTitlePicker); harmless to leave since nothing
      // renders into sc-title-menu anymore. title text set at wiring
      // time, not here, since it depends on the new click behavior.
      //
      // Sept 3 2026, Larry: "PROJECT is too close to my name -- it should
      // be half the distance between name and LOGO." Pulled out of the
      // flex row it started in into its own independently-positioned
      // block (id'd sc-project-wrap) so _sboardPositionProjectMidwayToLogo
      // could measure Name's actual right edge and Logo's actual left
      // edge every render and place PROJECT's own center on the midpoint
      // between them.
      //
      // Sept 5 2026, Larry: moved into the same flex column as the new
      // traveler-name eyebrow just above, directly underneath it, instead
      // of being independently positioned by measuring Name and Logo's
      // boxes every render -- nesting it under Name in one column
      // sidesteps the crowding problem the midpoint math was trying to
      // manage, since there's nothing left on that side for it to
      // collide with. _sboardPositionProjectMidwayToLogo is no longer
      // called (see _sboardUpdateHeaderChrome and the two other call
      // sites below) but left in place, not deleted, in case this layout
      // changes again later. Sized down a step from its Sept 3 treatment
      // (11px selector text to 9px, 30px control height to 24px) so it
      // reads as visually smaller than -- and subordinate to -- the
      // traveler name above it, matching Larry's "it looks like my
      // projects are below this."
      +'<div id="sc-project-wrap" style="display:flex;flex-direction:column;align-items:center">'
      // Sept 5 2026, Larry: "what if we delete PROJECT eyebrow so that
      // projects list is the field below the Traveler name?" Removed the
      // "Project" label div that sat above the project selector -- the
      // selector itself (sc-title-cdrop, just below) is now the first and
      // only thing in this column, reading directly underneath the
      // traveler name above with nothing labeling it in between.
      // Sept 3 2026, Larry: "the dropdown arrow to the right of Idea
      // Storyboards should show me the Headers (other PROJECTS) as
      // choices, in the order they appear under the Idea Storyboards
      // TOPIC -- right now it acts like the Parent field." sc-title-trigger
      // was one single button carrying both the "Idea Storyboards" label
      // AND the decorative sc-cdrop-trigger ▾ (see that class's :after
      // rule below) -- so pressing the arrow did the exact same thing as
      // pressing the label: drill straight in, no choices shown, same as
      // sc-parent-hit's own plain click-to-navigate. Split the two apart:
      // sc-title-trigger keeps its plain "click drills in, double-click
      // opens the full PROJECT popup" behavior (Larry's own Sept 2 fix,
      // above), unchanged; the ▾ is now its own real button
      // (sc-project-caret) with its own job -- see
      // _sboardWireProjectHeaderDropdown, near _sboardWireBoardKindDropdown
      // below -- popping sc-title-menu (the same menu element the old,
      // retired Title picker used to own) open with just this member's
      // real Headers under Idea Storyboards, in their actual on-board
      // order, nothing else mixed in.
      +'<div class="sc-cdrop" id="sc-title-cdrop" style="display:flex;align-items:center;gap:2px">'
      // Sept 5 2026, Larry: "increase the text size on the PROJECT field
      // on all boards" -- 9px/24px (the Sept 5 "read as subordinate to
      // traveler name" sizing) bumped to 14px/30px, and widened to fit.
      // See bb-board-trigger in briefing-board.js for the same bump.
      +'<button type="button" class="sc-hdr-select" id="sc-title-trigger" style="font-size:calc(14px * var(--fg-text-scale,1));height:30px;max-width:calc(120px * var(--fg-text-scale,1))"></button>'
      +'<button type="button" class="sc-project-caret" id="sc-project-caret" title="Choose a project" aria-label="Choose a project" style="height:24px">▾</button>'
      +'<div class="sc-cdrop-menu" id="sc-title-menu" hidden></div>'
      +'</div>'
      +'</div>'
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
      +'</div>'
      // align-items:flex-end, Sept 6 2026 -- Larry: "LOGO should be to the
      // left of the Utilities button JUST LIKE on BB." Logo's eyebrow+
      // frame stack is taller than a plain icon button, same situation
      // BB solved the same day (bb-mhead-actions, briefing-board.js) by
      // bottom-justifying the row instead of centering it -- Logo, Utility
      // and Close now line up along their shared bottom edge here too.
      +'<div class="sc-hdr-side" style="position:absolute;top:10px;right:16px;display:flex;flex-direction:row;gap:6px;align-items:flex-end">'
        // Storyboard/Session toggle removed here, Aug 9 2026 (Larry): this
        // header is the Idea Storyboard's own, Session-specific chrome
        // stays out of it -- Session gets its own entry point dealt with
        // separately later, not a switch living on this screen.
        // Logo, Sept 6 2026 -- moved here from its own independently-
        // positioned wrap near Topic (see that section's own history,
        // above) so it sits immediately left of Utility, matching where
        // Logo sits on the Briefing Board (bb-mhead-actions: Logo, then
        // Utility, then Close). Purely a DOM-order move into this row's
        // plain flex layout -- the T2TLogo controller doesn't care where
        // its slot/eyebrow/handle ids live in the page.
      +'<div id="sc-logo-wrap" style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow" id="sc-logo-eyebrow">Logo</div>'
      // Sept 7 2026 fix (Larry: "the alignment is for default (unused)
      // LOGO only -- once a LOGO is added, it should stay the same size
      // and location set by the traveler without changing the other two
      // buttons") -- sc-logo-slot used to be position:relative, sized by
      // its own inline width/height, and living directly in this
      // column; because sc-hdr-side's row (below) lines Logo/Utility/
      // Close up along a shared bottom edge, growing the slot via the
      // resize handle grew this whole column and dragged Utility/Close
      // down with it -- the "shifted down" Larry reported. sc-logo-anchor
      // is new: a fixed 30x30 placeholder that's the only thing the row
      // actually measures, matching bb-logo-anchor's already-correct
      // pattern on the Briefing Board (briefing-board.js). sc-logo-slot
      // itself is now position:absolute inside it, so the resize handle
      // (and the traveler's own saved logo_w/logo_h) can grow it up to
      // 90px without ever changing this anchor's box or moving Utility/
      // Close -- purely a visual overlay, same as Briefing Board already
      // does.
      +'<div id="sc-logo-anchor" style="position:relative;width:30px;height:30px;flex-shrink:0">'
      // visibility:hidden, Sept 8 2026 -- same hard-reset flash fix as
      // Briefing Board's bb-logo-slot (see that CSS rule's own comment,
      // briefing-board.js): stays hidden until T2TLogo.render applies
      // the traveler's real saved position and reveals it, so this slot
      // is never painted at its untouched corner first.
      +'<div id="sc-logo-slot" style="position:absolute;top:0;left:0;width:30px;height:30px;box-sizing:border-box;border-radius:8px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;visibility:hidden">'
      +'<img id="sc-logo-img" src="" alt="Logo" style="display:none;max-width:100%;max-height:100%;object-fit:contain;border-radius:8px">'
      +'<div class="sc-logo-eyebrow-onlogo" id="sc-logo-eyebrow-onlogo">Logo</div>'
      +'<button type="button" class="sc-dotted-add-btn" id="sc-logo-add-btn" title="Add a logo or artwork" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">+</button>'
      +'<input type="file" id="sc-logo-input" accept="image/*" style="display:none">'
      +'<div class="sc-logo-resize-handle" id="sc-logo-resize-handle" title="Drag to resize" style="position:absolute;right:-6px;bottom:-6px;width:14px;height:14px;border-radius:4px;background:#5b9bd5;border:2px solid #0d2440;cursor:nwse-resize;display:none;z-index:3;touch-action:none"></div>'
      +'</div>'
      +'</div>'
      +'</div>'
        +'<button class="sc-hdr-btn-muted sc-hdr-btn-icon" id="b-sc-gear" title="Utility">⚙️</button>'
        +'<button class="sc-ov-btn" id="b-sc-close" title="Return">✕</button>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      +'<div id="sc-board-wrap"></div>'
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
    _sboardWireBoardKindDropdown();
    _sboardWireProjectHeaderDropdown();
    _sboardWireParentAncestorDropdown(); // Sept 5 2026 -- PARENT's own fast-jump arrow, see _sboardWireParentAncestorDropdown's own comment.
    _sboardWireTopicChildDropdown(); // Sept 6 2026 -- TOPIC's new down-arrow, see that function's own comment.
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
    // instead of it. Fixed: click ensures the root exists (this is also
    // what actually RUNS the one-time migration for a member who's never
    // opened it before -- confirmed live for Larry's own account:
    // no "Idea Storyboards" row existed yet, Mouse Criteria was still
    // sitting at true root) and drills straight into it.
    // openProjectSwitcher's popup is real, tested code and still useful
    // as a fast jump without scrolling the board -- kept reachable on
    // double-click rather than deleted.
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
        titleTrigger.title='Click to open your projects; double-click for the fast-jump list';
        titleTrigger.addEventListener('click', async function(e){
          e.stopPropagation();
          // Land wherever the label is currently pointing (Larry: the
          // click has to land where the label says it will) -- only
          // falls back to the Idea Storyboards root itself when nothing
          // more specific is resolved, or that root is genuinely current.
          var topicRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
          var projRow=topicRow?_sboardProjectRowFor(topicRow):null;
          if(projRow && _sboardIdeaStoryboardsRootId && String(projRow.id)!==String(_sboardIdeaStoryboardsRootId)){
            _sboardDrillInto(projRow);
          } else {
            var rootId=await T2TData.ensureIdeaStoryboardsRoot();
            if(rootId) _sboardDrillInto({id:rootId});
          }
        });
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
    Promise.all([_sboardLoadMyRoots(), _sboardEnsureHiddenTypesLoaded()]).then(function(){ _sboardRenderTypePicker(); _sboardRenderOrgName(); });
    var boardWrapBgEl=document.getElementById('sc-board-wrap');
    if(boardWrapBgEl) boardWrapBgEl.addEventListener('dblclick', function(e){ if(e.target===boardWrapBgEl || e.target.id==='sc-groups-wrap') openBoardBgPicker(); });
    // Header band is now the same single color as the board (see
    // _sboardApplyBoardBg) — double-click there opens the same picker,
    // same gesture as double-clicking the board itself. Larry, August 1
    // 2026: "I double clicked it and nothing happened."
    var scHeaderAreaEl=document.getElementById('sc-header-area');
    if(scHeaderAreaEl) scHeaderAreaEl.addEventListener('dblclick', function(e){ if(e.target===scHeaderAreaEl) openBoardBgPicker(); });
    _sboardApplyBoardBg();
    _sboardWireAutoScroll();

    // Opening the TOPIC card, Aug 13 2026 (Larry: "Double click to open
    // the TOPIC card") -- double-click is the way in. Was a second way
    // alongside a corner-flip triangle; the corner-flip was removed
    // Sept 6 2026 (Larry: "remove the gray corners flip option from all
    // cards. Just double click to open cards.") so double-click is now
    // the only way in. Kept separate from the plain-click drill-in that
    // used to live here -- that was replaced by drag-and-drop onto TOPIC
    // (locked July 27, 2026) and stays that way; this only opens the
    // card, never changes what board is being viewed.
    function _sboardOpenTopicCard(){
      if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
        openSbDetail(_sboardAllRowsById[T2TShared.currentTopicId]);
      } else {
        openRootPromptEditor();
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

  /* ── Board (storyboard) state + rendering ── */
  // _sboardDesktop was a never-finished "is this a desktop-sized
  // screen" flag -- declared false and never once set to anything
  // else, anywhere. Removed Sept 5 2026 as part of tracing the
  // sb-wide/isx-full border bug (see the Skeleton comment above):
  // dead code that's still readable as if it does something is worse
  // than no code at all. If a genuine desktop-vs-mobile board layout
  // decision comes up again, wire it fresh rather than reviving this.
  async function renderSeaOfIdeasCluster(){
    var boardWrap=document.getElementById('sc-board-wrap');
    if(!boardWrap) return;
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.add('isx-full');
    return renderSeaBoard();
  }

  // A dragged card can't reach a header that's scrolled out of view — native
  // HTML5 drag doesn't auto-scroll a nested container the way it scrolls a
  // whole page. Hovering near an edge while dragging nudges the scroll a
  // little on every dragover tick (which fires continuously), covering both
  // the horizontal row of header columns and, in tall columns, the vertical
  // scroll on the outer card.
  function _sboardWireAutoScroll(){
    var hWrap=document.getElementById('sc-board-wrap');
    var vWrap=document.getElementById('s-sea-of-ideas-cluster');
    var EDGE=56, MAXSPEED=16;
    function edgeScrollX(e){
      if(!hWrap) return;
      var rect=hWrap.getBoundingClientRect();
      var x=e.clientX;
      if(x<rect.left || x>rect.right) return;
      if(x-rect.left<EDGE) hWrap.scrollLeft -= MAXSPEED*(1-(x-rect.left)/EDGE);
      else if(rect.right-x<EDGE) hWrap.scrollLeft += MAXSPEED*(1-(rect.right-x)/EDGE);
    }
    function edgeScrollY(e){
      if(!vWrap) return;
      var rect=vWrap.getBoundingClientRect();
      var y=e.clientY;
      if(y<rect.top || y>rect.bottom) return;
      if(y-rect.top<EDGE) vWrap.scrollTop -= MAXSPEED*(1-(y-rect.top)/EDGE);
      else if(rect.bottom-y<EDGE) vWrap.scrollTop += MAXSPEED*(1-(rect.bottom-y)/EDGE);
    }
    if(hWrap) hWrap.addEventListener('dragover', edgeScrollX);
    if(vWrap) vWrap.addEventListener('dragover', edgeScrollY);
  }

  /* _sboardMakeRoleShortcutTile -- Idea Storyboards role shortcuts (Sept
     2 2026). A CAST assignment on someone else's project (Primary,
     Stakeholder, or plain Cast Member) is what promotes that project
     onto the traveler's own board -- see _sboardRoleShortcuts, resolved
     in renderSeaBoard just above. Deliberately its own small, read-only
     tile rather than being spliced into renderGroup's real Header/
     Subheader machinery: these tiles point at another traveler's actual
     project (readable now via the card_roles RLS grant added the same
     session), and reusing the full drag/reorder/trash/move-under
     plumbing built for a traveler's OWN rows would risk letting one
     traveler edit or reorder another's board by a stray drag. Clicking
     one just calls the same _sboardDrillInto real navigation every
     other Header uses -- from that point on it's the live foreign
     project, rendered through the normal path, nothing virtual left. */
  async function renderSeaBoard(fromCache){
    // Signal Flags, Aug 3 2026 -- kicks off the one-time library fetch
    // (no-ops after the first call, see _sboardKeyLibLoaded) regardless
    // of which screen (9710 or 9711, delegated to just below) is
    // actually active, since the library is shared/global, not tied to
    // either screen.
    _sboardEnsureKeyLibraryLoaded();
    // July 18, 2026: DETAILS (openSbDetail, below) is shared between 9710
    // and 9711 — every action inside it (color, heart, lock, trash, move,
    // notes) calls this function afterward to refresh the board. But
    // #sc-board-wrap always exists in the DOM regardless of which screen
    // is active, so this used to silently refresh 9710's own (invisible)
    // board even while 9711 was what's actually on screen — e.g. Larry
    // recoloring a card from 9711 and seeing nothing happen. Delegate to
    // 9711's own render in that case instead.
    var isxScreen=document.getElementById('s-idea-session');
    if(isxScreen && isxScreen.classList.contains('active') && window.T2TSea && window.T2TSea.renderBoard){
      // Aug 9 2026 -- fromCache used to get dropped right here: a live
      // patch (see _sboardRtSafeRefresh) always ended up back at 9711's
      // own full re-fetch the instant 9711 was the active screen, no
      // matter how cheap the 9710 side had just become. Forwarding it
      // lets 9711's own cache-mode render (session.js) apply too.
      return window.T2TSea.renderBoard(fromCache);
    }
    var wrap=document.getElementById('sc-board-wrap');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    if(!wrap||!_sb) return;
    // Realtime patch arrived before this tab ever did a real render of
    // the Storyboard (e.g. it's sitting on a different screen entirely) --
    // nothing cached to render from yet. Whatever screen the traveler
    // actually opens next does a real (non-cached) render and picks up
    // everything fresh, so this is a safe no-op, not a missed update.
    if(fromCache && !_sboardCacheReady) return;
    // Alphabetical view resets on a real board change, Aug 3 2026 --
    // keyed off whatever topic actually rendered last time (however it
    // got here: drill in/out, PROJECT switcher, a TOC link...), not any
    // one specific navigation function, so this can't miss a path. A
    // same-board refresh (recoloring, saving Notes, etc.) leaves it alone
    // -- only landing on a genuinely different board snaps back to the
    // real order.
    if(_sboardLastRenderedTopicId!==T2TShared.currentTopicId){
      _sboardAlphaHeaderView=false;
      _sboardLastRenderedTopicId=T2TShared.currentTopicId;
    }
    if(statusEl && !fromCache){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      // Resolve which project (if any) the current Topic actually belongs
      // to, using whatever's already cached from the last render (reliably
      // fresh in practice — you can't have navigated to a Topic without a
      // prior render having already fetched its row). This is what fixes
      // the "Purpose and Field Guide both showing under What do you want?"
      // bug: Purpose and the Ideas bucket used to be scoped to
      // cluster_id=null, a leftover from when there was only ever one
      // project — ISB / What do you want? was never a real
      // project, just placeholder text for that shared null slot. Locked
      // July 12, 2026: Purpose and the project-root Ideas bucket now
      // resolve to the actual project (Wish Tank, Field Guide, etc.), never
      // to a shared null root. Doesn't need the account fetch below to
      // have just run -- only reads what's already cached -- so this runs
      // the same way whether this render is fetching fresh or patching
      // from cache.
      var currentTopicRowForProject=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
      var currentProjectRowForScope=currentTopicRowForProject?_sboardProjectRowFor(currentTopicRowForProject):null;
      // Fallback for a cold/stale cache — e.g. the first time this Topic is
      // opened this session, or right after switching projects. Without
      // this, the row lookup above silently misses, Purpose gets treated
      // as project-less, and it never shows even at a real project root.
      // Locked July 16, 2026.
      if(!currentProjectRowForScope && T2TShared.currentTopicId && window.T2TData && window.T2TData.ancestorChain){
        try{
          var _chainForProject=await window.T2TData.ancestorChain(T2TShared.currentTopicId);
          if(_chainForProject && _chainForProject.length){
            // Aug 16 2026, Larry: this used to stand in a bare {id,text_content}
            // stub -- fine for Purpose's own placement check, but this fallback
            // only ever fires on a cold cache, which is exactly when VIEW's
            // Owner-only controls (the (+)/(-) pair, and the Owner's own row
            // in the roster) get checked first. _tmLoadRoster needs user_id
            // (and topic_owner_user_id, for a delegated Topic) to recognize
            // the Owner at all -- a stub without them made Larry look like a
            // stranger on his own project. Fetch the real row instead.
            var _fullRootRes = _sb ? await _sb.from('ideas').select('id,user_id,text_content,cluster_id,content_type,board_type,org_name,topic_owner_user_id,topic_scope_id,briefing_board_id,owner_notes,assigned_user_id').eq('id',_chainForProject[0].id).maybeSingle() : null;
            currentProjectRowForScope = (_fullRootRes && !_fullRootRes.error && _fullRootRes.data) ? _fullRootRes.data : {id:_chainForProject[0].id, text_content:_chainForProject[0].text};
          }
        }catch(e){ /* leave null — ensure-calls below just skip Purpose this render */ }
      }
      var isAtProjectRoot=!!(currentProjectRowForScope && String(currentProjectRowForScope.id)===String(T2TShared.currentTopicId));
      // PLAN board, Aug 26 2026 -- reflects whichever project (IDEA or
      // PLAN) the traveler is currently anywhere inside, not just at its
      // root, so the front-of-card number badge (_sboardMakeTile) and the
      // IDEA/PLAN dropdown chrome (_sboardSyncBoardKindChrome) stay right
      // at any depth.
      _sboardIsPlanBoard = !!(currentProjectRowForScope && currentProjectRowForScope.storyboard_kind==='PLAN');
      _sboardSyncBoardKindChrome();

      // miscId/purposeId/newAdditionsId default to whatever this tab last
      // resolved them to (Aug 9 2026) -- only actually recomputed below
      // when this render does a real fetch. A cache-only patch render
      // (see fromCache) reuses them as-is: they're per-Topic and this
      // tab can't be looking at a different Topic than the one its last
      // real render resolved these for.
      var miscId=_sboardMiscId, purposeId=_sboardPurposeId, newAdditionsId=_sboardNewAdditionsId;

      if(!fromCache){
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');

        // Ensure-calls run concurrently, added July 12, 2026 — these three
        // are fully independent (none needs another's result), but were
        // previously awaited one after another, each a separate Supabase
        // round trip. That sequential chain is what made opening a project
        // for the first time (Purpose/Ideas being created fresh) feel slow.
        //
        // Landing-zone name, Aug 25 2026 -- Larry: a plain "NEW" label
        // gave no hint what it was actually holding, especially right
        // after promoting a header (with its own loose content already
        // on it) up into its own Topic -- that content lands here, and
        // "NEW" is a poor description of something that already existed.
        // Titling it after the Topic's own name instead, in parentheses,
        // says exactly whose leftover content this is at a glance.
        //
        // First attempt (shipped, then reverted same day) read the
        // Topic's name out of _sboardAllRowsById instead of asking
        // Supabase directly -- looked fine reasoning through the code,
        // but that cache is only ever refilled by the fetch FURTHER DOWN
        // this same function, so at this exact point it still holds
        // whatever the PREVIOUS render left there. Landing on a Topic
        // Supabase hasn't been asked about yet in this tab (e.g. a
        // header just created this same session, or the very first
        // Topic opened after a fresh page load) meant an empty lookup --
        // silently fell back to null/plain "NEW" every time, which
        // Larry then confirmed live: the rename never happened. Fetching
        // this one row directly (indexed by id, effectively free) has no
        // such ordering dependency -- correct regardless of what any
        // earlier render happened to leave cached. Kept concurrent with
        // the other two ensure-calls below by wrapping the two-step
        // fetch-then-ensure sequence in its own async function rather
        // than awaiting it first and serializing everything after it.
        var _sbFetchNewAdditionsDesiredName=async function(){
          if(!T2TShared.currentTopicId) return null;
          try{
            var _sbTopicNameRes=await _sb.from('ideas').select('text_content').eq('id',T2TShared.currentTopicId).maybeSingle();
            if(!_sbTopicNameRes.error && _sbTopicNameRes.data && _sbTopicNameRes.data.text_content){
              return '('+_sbTopicNameRes.data.text_content+')';
            }
          }catch(e){}
          return null;
        };
        // Idea Storyboards root resolved FIRST and on its own, Sept 2
        // 2026 -- deliberately NOT folded into the NEW/Purpose/MISC
        // Promise.all just below, for two reasons. (1) COLLABORATOR/
        // STAKEHOLDER (right after this) need to know the root id before
        // they can even ask, so they can't start concurrently with it
        // anyway. (2) A real bug this avoids: NEW/Purpose/MISC share one
        // per-parent header_defaults_seeded flag with COLLABORATOR/
        // STAKEHOLDER (see ensureCollaboratorHeader's own comment in
        // header-data.js) -- if MISC's ensure-call for this same brand-
        // new root won that race and flipped the flag first, COLLABORATOR/
        // STAKEHOLDER's OWN "not seeded yet" check would then read it as
        // already-seeded and silently skip creating them, forever (the
        // flag never unflips). Ensuring COLLABORATOR/STAKEHOLDER to
        // completion before NEW/Purpose/MISC even start avoids that race
        // outright instead of hoping to win it. Only costs real latency
        // on the rare first-ever visit to a brand new root (creating it);
        // every later render is one cheap indexed select before the rest
        // proceeds as before.
        var rootId=(window.T2TData && T2TData.ensureIdeaStoryboardsRoot) ? await T2TData.ensureIdeaStoryboardsRoot() : null;
        _sboardIdeaStoryboardsRootId=rootId;
        // COLLABORATOR/STAKEHOLDER, Sept 2 2026 -- Larry: "The HEADERS
        // for that board are the PROJECTS plus COLLABORATOR and
        // STAKEHOLDER" -- same always-present-landing-bucket treatment
        // as MISC/Purpose below (ensured on demand, never respawned once
        // removed -- see _parentDefaultsSeeded). Originally gated to fire
        // only while actually standing on the Idea Storyboards root
        // itself -- removed Sept 3 2026, Larry: "Missing Collaborator and
        // Stakeholder headers." Root cause: the everyday "Idea Board"
        // tool button never actually lands you on the root -- it resumes
        // whichever project you were last working in (_ideaOpenBoardResume,
        // idea-media-shared.js), and PROJECT is now a fixed label that
        // opens a popup rather than something you navigate to -- so for
        // any traveler who already has a real project (i.e. everyone past
        // their very first visit), currentTopicId===rootId almost never
        // came true and these two headers never got their one-time
        // creation call. Both ensure-functions already do their own
        // cheap indexed existence check before creating anything (see
        // header-data.js), so calling them on every board render
        // regardless of which topic is on screen costs one indexed
        // select per render, not a repeat insert -- same reasoning
        // already applied to NEW/Purpose/MISC just below, which never
        // had this restriction.
        if(rootId){
          try{
            await Promise.all([
              T2TData.ensureCollaboratorHeader(rootId),
              T2TData.ensureStakeholderHeader(rootId)
            ]);
          }catch(e){ console.warn('Idea Storyboards COLLABORATOR/STAKEHOLDER ensure failed:', e); }
        }
        var _ensureResults=await Promise.all([
          T2TShared.currentTopicId ? _sbFetchNewAdditionsDesiredName().then(function(_sbDesiredName){
            return _sboardEnsureNewAdditionsHeader(T2TShared.currentTopicId, _sbDesiredName);
          }) : Promise.resolve(null),
          currentProjectRowForScope ? _sboardEnsurePurposeHeader(currentProjectRowForScope.id) : Promise.resolve(null),
          T2TData.ensureMiscHeader(T2TShared.currentTopicId)
        ]);
        newAdditionsId=_ensureResults[0];
        _sboardNewAdditionsId=newAdditionsId;
        // Purpose — one per PROJECT, reachable from anywhere inside that
        // project (not just its exact root), never shared across projects
        // and never shown when no project is selected at all.
        purposeId=_ensureResults[1];
        _sboardPurposeId=purposeId;
        miscId=_ensureResults[2];

        // Whole-account fetch (every header, idea, image and link this user
        // owns, across every board) -- unlike the cluster-scoped fetches
        // elsewhere in this file, there's no .eq('cluster_id', ...) here to
        // keep the row count small. limit(300) quietly capped this to the
        // OLDEST 300 rows (ascending order), so once the account passed 300
        // total rows, anything newer -- including a header added just now
        // via [+] -- was silently left out of the fetch and never appeared
        // anywhere, with no error. Raised well past current usage (~350
        // rows and growing) so new content stops vanishing. Fixed Aug 6,
        // 2026 -- Larry: "Added a header but it never showed anywhere."
        //
        // Same bug came back, Aug 21 2026 (Larry: "I added subbers to
        // Organizes Daily Routine... they've disappeared") -- the account
        // had grown to 1016 qualifying rows, and it turns out Supabase's
        // own API server silently caps every request at 1000 rows no
        // matter what limit() the app asks for -- the limit(2000) above
        // was never actually being honored. So this fetch was quietly
        // getting only the OLDEST 1000 rows (ascending order), same
        // "anything newer just vanishes" shape as the July bug, just
        // re-triggered by a higher, server-side ceiling this code couldn't
        // see or raise. Confirmed live: querying the same account
        // newest-first returned the missing notes every time; oldest-first
        // never did.
        //
        // First patch just flipped the order so it'd always be the OLDEST
        // rows getting cut, never whatever was just added -- band-aid, and
        // it still meant every OTHER traveler would hit this exact same
        // "my new stuff vanished" moment the day their own account crossed
        // 1000 items too, plus flipping order risked reshuffling the rare
        // top-level header that's never had a real sort_order written yet
        // (see the fallback-order comment below `contentHeaders`/`orderedTop`).
        // Real fix, same session: page through in chunks of 1000 via
        // .range() until a page comes back short, so this always gets
        // EVERY row regardless of how large any one traveler's account
        // grows -- no ceiling left for anyone to quietly fall off of.
        // Order restored to ascending (oldest-first, the original/intended
        // order) since completeness no longer depends on which end is
        // fetched first.
        //
        // Only runs for a real render, not a cache-only patch (Aug 9 2026)
        // -- a live update from another traveler already hands over the
        // one row that changed (see _sboardApplyRemoteIdea), so re-asking
        // Supabase for the other few hundred rows that didn't change
        // wastes bandwidth for no benefit. _sboardAllRowsById is kept
        // current by that patch instead.
        //
        // user_id is selected here too (Aug 9 2026 fix) -- every row this
        // cache holds already belongs to this traveler (.eq('user_id', ...)
        // below), but the column itself wasn't coming back, so any row read
        // out of _sboardAllRowsById had row.user_id===undefined. That broke
        // every Owner check downstream that reads _sboardCurrentProjectRow()
        // .user_id -- the Cast/Guest roster's crown, the Project quick-menu's
        // owner-only gating, and the People menu's isOwner check all silently
        // failed. Diagnosed Session 196 (Aug 8), fixed Session 198 (Aug 9).
        var _freshRows=[];
        var _sboardFetchPageSize=1000;
        var _sboardFetchFrom=0;
        while(true){
          var pageRes=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board,adds_notes,adds_links,adds_related,adds_flags,storyboard_kind,source_project_id,board_type,org_name,logo_url,logo_w,logo_h,hide_primary_badge,hide_all_initials')
            .in('content_type',['image','text','link','header'])
            .order('created_at',{ascending:true})
            .range(_sboardFetchFrom, _sboardFetchFrom+_sboardFetchPageSize-1);
          if(pageRes.error) throw new Error(pageRes.error.message);
          var pageRows=pageRes.data||[];
          _freshRows=_freshRows.concat(pageRows);
          // A short page (fewer than a full page size back) means this was
          // the last one -- stop. The 50-page (50,000-row) backstop below
          // is just a sanity guard against ever looping forever; no
          // traveler's account is remotely close to that today.
          if(pageRows.length<_sboardFetchPageSize || _sboardFetchFrom>50000) break;
          _sboardFetchFrom+=_sboardFetchPageSize;
        }
        _sboardAllRowsById={}; _freshRows.forEach(function(r){ _sboardAllRowsById[r.id]=r; });
        _sboardCacheReady=true;
      }

      // Derived fresh from _sboardAllRowsById either way -- after a real
      // fetch it was just rebuilt from the network response above; for a
      // cache-only patch it already holds every row it held before plus
      // whatever _sboardApplyRemoteIdea/_sboardApplyRemoteKey just patched
      // in. Order doesn't matter here (nothing downstream relies on fetch
      // order -- everything sorts explicitly off sort_order/name).
      var rows=Object.keys(_sboardAllRowsById).map(function(k){ return _sboardAllRowsById[k]; });
      // Front-of-card badge names, Aug 9 2026 (Session 234: now sourced
      // from the 👥 button's starred primary doer, legacy assigned_user_id
      // as fallback) -- fire-and-forget; only triggers a (cheap,
      // cache-only) re-render if either fetch actually had something new,
      // so this never loops or blocks the render already in progress.
      _sboardEnsureCardPrimary(rows).then(function(fetchedSomething){ if(fetchedSomething) renderSeaBoard(true); });
      _sboardEnsureAssignedInitials(rows).then(function(fetchedSomething){ if(fetchedSomething) renderSeaBoard(true); });
      var headerRows=rows.filter(function(r){ return r.content_type==='header'; });
      _sboardHeadersById={}; headerRows.forEach(function(r){ _sboardHeadersById[r.id]=r; });
      var trashRow=headerRows.find(function(r){ return r.text_content==='Trash'; });
      var miscRow=headerRows.find(function(r){ return String(r.id)===String(miscId); });
      var purposeRow=headerRows.find(function(r){ return String(r.id)===String(purposeId); });
      var newAdditionsRow=headerRows.find(function(r){ return String(r.id)===String(newAdditionsId); });
      _sboardTrashId = trashRow ? trashRow.id : null;
      _sboardMiscId = miscRow ? miscRow.id : null;
      _sboardPurposeId = purposeRow ? purposeRow.id : null;

      // Idea Storyboards role shortcuts, Sept 2 2026 -- the three screens
      // a CAST assignment on someone else's project actually surfaces on:
      // this member's own Idea Storyboards root (Primary promotions, with
      // the ownership eyebrow), and their COLLABORATOR/STAKEHOLDER
      // buckets. Recomputed on a real fetch, or if a cache-only patch
      // somehow lands on a different Topic than the shortcuts were last
      // resolved for (shouldn't normally happen -- drilling in/out always
      // goes through _sboardSpinWhile(renderSeaBoard()), a real fetch --
      // but costs nothing to guard). Left untouched on a same-Topic
      // cache-only patch so a live update elsewhere on the board doesn't
      // make this strip flicker away and back.
      if(!fromCache || String(T2TShared.currentTopicId)!==String(_sboardRoleShortcutsTopicId)){
        _sboardRoleShortcuts=[]; _sboardRoleShortcutsKind=null;
        _sboardRoleShortcutsTopicId=T2TShared.currentTopicId;
        if(T2TShared.currentTopicId && _sboardIdeaStoryboardsRootId && window.T2TData){
          if(String(T2TShared.currentTopicId)===String(_sboardIdeaStoryboardsRootId)){
            _sboardRoleShortcutsKind='promoted';
            try{ _sboardRoleShortcuts=await T2TData.promotedPrimaryEntries()||[]; }catch(e){ console.warn('promotedPrimaryEntries failed:', e); }
          } else {
            var _curTopicRowForShortcuts=_sboardAllRowsById[T2TShared.currentTopicId];
            if(_curTopicRowForShortcuts && String(_curTopicRowForShortcuts.cluster_id)===String(_sboardIdeaStoryboardsRootId)){
              if(_curTopicRowForShortcuts.text_content==='COLLABORATOR'){
                _sboardRoleShortcutsKind='collaborator';
                try{ _sboardRoleShortcuts=await T2TData.collaboratorEntries()||[]; }catch(e){ console.warn('collaboratorEntries failed:', e); }
              } else if(_curTopicRowForShortcuts.text_content==='STAKEHOLDER'){
                _sboardRoleShortcutsKind='stakeholder';
                try{ _sboardRoleShortcuts=await T2TData.stakeholderEntries()||[]; }catch(e){ console.warn('stakeholderEntries failed:', e); }
              }
            }
          }
        }
      }

      var reservedIds=[_sboardTrashId,_sboardMiscId,_sboardPurposeId,newAdditionsId].filter(Boolean).map(String);
      var reservedNames=['Trash','MISC','Purpose','NEW','New Additions'];
      // Name-based backstop, added July 12, 2026 — id-based exclusion above
      // only catches Purpose/MISC/Ideas rows this exact render already
      // resolved for the current project. Any orphaned row still carrying
      // one of these reserved names (pre-cleanup data, or any future
      // drift) is excluded here too, so it can never masquerade as a
      // top-level project.
      //
      // Scoped to orphaned rows only (no cluster_id), Aug 14 2026 -- Larry
      // named a real header "Purpose" underneath an existing board and it
      // never appeared, three tries in a row, refresh included. Root
      // cause: the name backstop above was excluding EVERY header named
      // Trash/MISC/Purpose/NEW/New Additions anywhere in the account, not
      // just the orphaned top-level ones it was written to catch -- a
      // header nested under a real cluster can't "masquerade as a
      // top-level project" (the thing this backstop guards against), so
      // it never needed the name check in the first place. All three
      // "Purpose" headers Larry created were saved correctly the whole
      // time; they were just being hidden by this filter every render.
      var contentHeaders=headerRows.filter(function(r){
        if(reservedIds.indexOf(String(r.id))!==-1) return false;
        if(!r.cluster_id && reservedNames.indexOf(r.text_content)!==-1) return false;
        return true;
      });
      _sboardHeaderList=contentHeaders.concat(newAdditionsRow?[newAdditionsRow]:[]);

      var ideaRows=rows.filter(function(r){ return r.content_type==='image'||r.content_type==='text'||r.content_type==='link'; });
      wrap.innerHTML='';

      var childrenOfHeader={};
      ideaRows.forEach(function(r){
        if(r.cluster_id){ (childrenOfHeader[r.cluster_id]=childrenOfHeader[r.cluster_id]||[]).push(r); }
      });
      if(newAdditionsRow){
        childrenOfHeader[newAdditionsRow.id]=(childrenOfHeader[newAdditionsRow.id]||[]).concat(ideaRows.filter(function(r){ return !r.cluster_id; }));
      }
      var subHeadersOf={};
      contentHeaders.forEach(function(h){
        if(h.cluster_id){ (subHeadersOf[h.cluster_id]=subHeadersOf[h.cluster_id]||[]).push(h); }
      });
      // "Borrow" a nested row into the current Topic's own column row for
      // this render only -- Aug 23 2026, the "ONE level ONLY" PgUp fix
      // (see _sboardViewPromotedId's declaration and climbOut/drillIn in
      // wireSboardUndoKeyboard). Nothing here touches the row's real
      // cluster_id or writes anything to Supabase -- it only moves the
      // SAME row object from its real parent's subHeadersOf array into
      // the current Topic's, so every downstream reader of subHeadersOf
      // this render (the column row below, renderGroup's own nested-subs
      // lookup for its real parent, the CLUSTER child-count tally) sees
      // it as top-level consistently, without needing three separate
      // patches. Stale as soon as it stops matching the live selection --
      // e.g. clicking a different card, or a real Topic change clearing
      // selection entirely -- so this cleans itself up on the very next
      // render without a dedicated callback wired into every place
      // selection can change.
      if(_sboardViewPromotedId && String(_sboardViewPromotedId)!==String(_sboardSelectedHeaderId)){
        _sboardViewPromotedId=null;
      }
      if(_sboardViewPromotedId){
        var _borrowedRow=contentHeaders.find(function(h){ return String(h.id)===String(_sboardViewPromotedId); });
        if(!_borrowedRow || String(_borrowedRow.cluster_id)===String(T2TShared.currentTopicId)){
          // Already gone, or the real Topic already changed under it so
          // it's genuinely top-level now anyway -- nothing left to borrow.
          _sboardViewPromotedId=null;
        } else {
          var _realParentArr=subHeadersOf[_borrowedRow.cluster_id];
          if(_realParentArr){
            var _bi=_realParentArr.indexOf(_borrowedRow);
            if(_bi!==-1) _realParentArr.splice(_bi,1);
          }
          (subHeadersOf[T2TShared.currentTopicId]=subHeadersOf[T2TShared.currentTopicId]||[]).push(_borrowedRow);
        }
      }
      var topLevelHeaders=contentHeaders.filter(function(h){ return !h.cluster_id; });

      // CLUSTER button gating — Logged July 7, 2026. A header only qualifies as
      // a "bucket" (and therefore shows CLUSTER on its SHAPING card) once it has
      // something underneath it — a sub-header or a loose idea — at any depth.
      _sboardChildCountById={};
      headerRows.forEach(function(h){
        var subCount=(subHeadersOf[h.id]||[]).length;
        var directCount=(childrenOfHeader[h.id]||[]).length;
        _sboardChildCountById[h.id]=subCount+directCount;
      });

      var _unordered=topLevelHeaders.filter(function(h){ return h.sort_order===null||h.sort_order===undefined; });
      var _ordered=topLevelHeaders.filter(function(h){ return h.sort_order!==null&&h.sort_order!==undefined; });
      var order=[]; var seen={};
      ideaRows.forEach(function(r){
        if(r.cluster_id){
          var hRow=headerRows.find(function(h){ return String(h.id)===String(r.cluster_id); });
          if(hRow){
            var topId=String(_sboardTopAncestor(hRow, headerRows));
            if(!seen[topId]){ seen[topId]=true; order.push(topId); }
          }
        }
      });
      _unordered.forEach(function(h){ if(!seen[h.id]){ seen[h.id]=true; order.push(String(h.id)); } });
      var fallbackTop=order.map(function(id){ return _unordered.find(function(h){ return String(h.id)===String(id); }); }).filter(Boolean);
      var explicitTop=_ordered.slice().sort(function(a,b){ return (a.sort_order||0)-(b.sort_order||0); });
      var orderedTop=fallbackTop.concat(explicitTop);
      // ORDER # badges always read the REAL order, never the alphabetical
      // display below -- backfill first so that's a genuine persisted
      // position from here on, then set _sboardTopLevelOrder from it
      // (also what drag-reorder itself writes against, unaffected by
      // whatever's currently on screen).
      _sboardBackfillSortOrder(orderedTop);
      _sboardTopLevelOrder=orderedTop.map(function(h){ return h.id; });
      var displayTop=_sboardAlphaHeaderView ? orderedTop.slice().sort(_sboardByAlpha) : orderedTop;

      // Tile/column sizing, scaled by the text-size boost, Aug 11 2026 --
      // Larry: bigger text should mean bigger cards here too, not text
      // clipped inside a card that stayed the same size (this board's
      // cards are fixed-size tiles, not the auto-growing kind Briefing
      // Board uses). Rounded to a whole pixel; base numbers unchanged
      // at Standard (mult 1) so nothing shifts for anyone who's never
      // touched the text-size picker.
      var _tsMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
      // Widened 104->114, Aug 21 2026 -- Larry: a long word (e.g.
      // "Appreciation") was shrinking all the way down but still losing
      // its last letter or two to a 2nd line on Subber tiles. Rather than
      // shrink text even further, a small width bump gives every idea/
      // text/Subber tile (they all share this one constant) a little more
      // room so the shrink-to-fit logic has to give up less ground.
      var SUBBER_W=Math.round(114*_tsMult);
      var SUBBER_H=Math.round(64*_tsMult);
      var HEADER_W=Math.round(152*_tsMult);
      // Aug 21 2026, Larry: header names were shrinking down to tiny type
      // (or clipping to a cramped 3rd line) inside a pill sized like a
      // regular Subber tile. He asked for more room on the card instead of
      // smaller text -- so this is now its own, taller constant, no longer
      // tied to SUBBER_H. Only the named header pill (and its "add header"
      // placeholder, sized to match) uses this; regular idea/Subber tiles
      // are untouched.
      var HEADER_H=Math.round(84*_tsMult);

      function renderGroup(headerRow, depth){
        var name=headerRow.text_content||'(untitled cluster)';
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='NEW');
        // MISC can take a new card just as freely as any content header —
        // it's specifically for ideas that don't relate to the current
        // TOPIC, so excluding it from the [+] made no sense. Purpose picked
        // up the same [+] on Aug 4, 2026 per Larry -- it's still a
        // one-statement header by default, but he wants the option to add
        // cards under it same as any other column. Aug 7 2026, Larry:
        // NEW gets the same [+] now too, same reasoning -- only Trash
        // stays excluded (off-limits, not a place to add anything to).
        var blocksNewSubbers=(name==='Trash');
        var straight=true;
        // Sorted by sort_order, Aug 3 2026 -- previously rendered in
        // whatever order Supabase happened to return them, since nothing
        // ever wrote a meaningful sort_order for Subbers. Now that
        // dragging one Subber onto another actually reorders them (see
        // _sboardReorderOrMoveSubber), the render needs to respect that
        // order instead of ignoring it.
        var subs=(subHeadersOf[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
        // Aug 25 2026, Larry: promoting a header (with its own loose
        // content already on it) up into its own Topic auto-creates a
        // real NEW header there to hold that content while it's being
        // explored -- useful while it's in use, but backing back out to
        // this bigger view then shows that same NEW row as a genuinely
        // empty Subber forever after (its "content" is really the
        // Topic's own direct cards, not children of the NEW row itself,
        // so from one level up it just looks empty). A header Larry
        // names himself always stays put even empty -- that's a
        // deliberate choice -- but the board's own auto-managed
        // placeholders are just administrative scaffolding, so they're
        // hidden here at any depth once they have nothing left inside
        // them (_sboardChildCountById, computed above from the real,
        // unfiltered data -- this is purely a display filter, nothing
        // about the row itself changes, and it reappears the moment it
        // actually holds something again). Recognized two ways: the
        // classic literal reserved names, or -- Aug 25 2026, Larry's own
        // suggestion -- a name wrapped in parentheses, which is what the
        // auto-created landing-zone header is now titled by default (see
        // the NEW-header ensure-call above: "(<the Topic's own name>)"
        // instead of a bare "NEW"), so a traveler can tell at a glance
        // whose loose content it's holding without needing to rename it
        // by hand first.
        var _sbReservedAutoNames=['NEW','New Additions','MISC','Purpose'];
        subs=subs.filter(function(s){
          var _sbAutoManaged=_sbReservedAutoNames.indexOf(s.text_content)!==-1
            || /^\(.*\)$/.test(String(s.text_content||'').trim());
          if(!_sbAutoManaged) return true;
          return (_sboardChildCountById[s.id]||0)>0;
        });
        var directItems=(childrenOfHeader[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
        // Backfill, Aug 3 2026 -- same reasoning as the top-level row:
        // makes each Subber's/idea's ORDER # a real, permanent number
        // instead of a fallback guess, the moment either list still has
        // one relying on it. Subbers/ideas render vertically top to
        // bottom, always in this real order -- there's no alphabetical
        // view for this level (yet), so no separate display copy needed.
        _sboardBackfillSortOrder(subs);
        _sboardBackfillSortOrder(directItems);
        // Unified column order, Aug 22 2026 (Larry: "sub-headers always
        // cluster to the top... I want to mix them into the story"). Used
        // to be two entirely separate 0-based sequences (Subbers, plain
        // cards), always rendered as two stacked blocks -- Subbers first,
        // cards after -- with no way to drag either kind across that line.
        // Starting from exactly today's on-screen order (Subbers, then
        // cards) so nothing jumps the moment this ships,
        // _sboardBackfillColumnOrder renumbers the whole column as ONE
        // real sequence the first time it finds the two old groups'
        // sort_order values colliding (both started at 0) -- from then on
        // dragging either kind can freely land it anywhere in this one
        // shared order (see _sboardReorderOrMoveColumnItem).
        //
        // Bug fix, Aug 22 2026 (Larry: "all sub-headers are remaining
        // above all subbers" -- a Subber dragged in among the cards kept
        // snapping right back above every card, every time). Root cause:
        // this used to check/backfill BEFORE sorting by real sort_order,
        // on the raw subs-then-cards concatenation. Subs and cards are
        // each sorted only WITHIN their own kind above, so that
        // concatenation is "all Subbers (in order), then all cards (in
        // order)" regardless of their real interleaved values -- it is
        // never actually increasing once a Subber and a card are
        // genuinely mixed (e.g. Subber=0, card=1, Subber=2 concatenates
        // as 0,2,1,3 -- not increasing), so the collision check below
        // treated every real interleave as "the old broken data,
        // renumber it" and rewrote it straight back into Subbers-first
        // order on the very next render, immediately undoing the very
        // drag that just interleaved them. Sorting first means the
        // check below only ever sees genuine collisions (true
        // duplicate/out-of-order values, the actual one-time-migration
        // case it was built for), never a false alarm from this
        // concatenation artifact.
        var combined=subs.concat(directItems);
        combined.sort(_sboardBySortOrder);
        _sboardBackfillColumnOrder(combined);
        // Same-type subsets of the line above, kept in sync purely for
        // other code that only ever asks about one type (CLUSTER's own
        // bucket count, the top-level header promote/demote pair) -- see
        // the comment on _sboardColumnOrderByParent's declaration.
        _sboardIdeaOrderByParent[headerRow.id]=combined.filter(function(r){ return r.content_type!=='header'; }).map(function(r){ return r.id; });
        _sboardSubberOrderByParent[headerRow.id]=combined.filter(function(r){ return r.content_type==='header'; }).map(function(r){ return r.id; });
        _sboardColumnOrderByParent[headerRow.id]=combined.map(function(r){ return r.id; });
        // ORDER # display numbering, Aug 3 2026 -- Larry noticed "Long
        // Ideas has 2 number 1's": Subbers and plain idea/text cards
        // render in ONE shared vertical column. As of Aug 22 2026 this is
        // just the real combined order above -- no longer a display-only
        // concat that always put Subbers first regardless of how the
        // column was actually dragged into order.
        _sboardCardOrderByParent[headerRow.id]=combined.map(function(r){ return r.id; });
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('button');
        hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'')+(String(_sboardSelectedHeaderId)===String(headerRow.id)?' sb-kbd-selected':'');
        hd.setAttribute('data-header-id', String(headerRow.id));
        // Floor dropped 10->8, Aug 21 2026 -- taller HEADER_H above should
        // handle nearly everything at a normal size now; this lower floor
        // is just the last-resort backstop for a genuinely long name, so
        // it can still shrink a little further before word-break kicks in.
        // Sept 8 2026, Larry: "DREAM PHASE should display on one line" --
        // top-level phase/project column tiles now shrink text as far as
        // it takes to stay on one line (like Briefing Board's own
        // labels), instead of accepting a 2-line wrap once the height
        // budget allowed it. oneLine:true, see text-fit.js.
        var hdFitSize=_sboardFitFontSize(name, Math.round(20*_tsMult), Math.round(8*_tsMult), HEADER_W-28, HEADER_H-14, 1.2, true);
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+hdFitSize+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(headerRow.color?';background:'+headerRow.color:'');
        hd.textContent=name;
        // Purpose used to have its own separate corner-flip editor; as of
        // July 17, 2026 it's treated exactly like any other header — same
        // dblclick-to-drill-in. Drilling in moved to drag-onto-TOPIC
        // (July 27, 2026); double-click is the color-options shortcut,
        // same as every other card, and is now the only way to open this
        // card -- the corner-flip triangle that used to sit alongside it
        // was removed Sept 6 2026 (Larry: "remove the gray corners flip
        // option from all cards. Just double click to open cards.").
        hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
        // Click to select this header for the Tab/Shift+Tab and
        // Ctrl+Down/Ctrl+Up keyboard shortcuts (see wireSboardUndoKeyboard).
        // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
        hd.addEventListener('click', function(e){
          if(_sboardSelectedHeaderId===headerRow.id) return;
          var prevId=_sboardSelectedHeaderId;
          _sboardSelectedHeaderId=headerRow.id;
          if(prevId){
            var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
            if(prevEl) prevEl.classList.remove('sb-kbd-selected');
          }
          hd.classList.add('sb-kbd-selected');
        });
        // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
        // "remove card numbers from the front of the Idea Cards, leave on
        // back") -- see the matching note on the plain-card tile above.
    // Person Assigned badge, Aug 9 2026 -- top-level column headers (this
    // "hd" pill) are their own third rendering path, separate from both
    // _sboardMakeTile (plain cards) and _sboardMakeHeaderStackTile
    // (Subbers) -- missed the first time through, which is why "Website"
    // and "Marketing" (both top-level headers) weren't showing a badge
    // even though they were genuinely assigned. hd already has
    // position:relative set above, same as front/tile do for the other
    // two paths.
    // Reinstated on PLAN boards only, Aug 26 2026 (Session 251, Larry:
    // "every card needs a number on a planning board -- those are the
    // steps!") -- top-level column headers (Purpose, CONTENT, MISC...)
    // are their own render path (see the matching Person Assigned note
    // just above), so they need their own badge call too, reading
    // _sboardTopLevelOrder -- the one place that already tracks this
    // row's real order, same source the drag-reorder math itself uses.
    if(_sboardIsPlanBoard){
      hd.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardTopLevelOrder, headerRow.id));
    }
    hd.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
    // Bottom-left signal cluster: Lock, Signal Flags -- Aug 15 2026.
    // Signal Flags were here since Aug 3 (Larry: "every card ... Larry
    // wants it everywhere"), but Lock was never added to this
    // particular render path (top-level column headers, this "hd"
    // pill) even after Session 211 built the real Lock feature --
    // Larry: "the header is not [showing locked]" on the Marketing
    // header was this gap, not a data sync problem (checked the
    // database directly: header and its linked Briefing card both
    // show locked, in sync).
    hd.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(headerRow, {lock:true, flags:true}));
        // Locked no longer blocks dragging, Aug 25 2026 -- see the note
        // on _sboardMakeTile above. depth===0 stays: only the top-level
        // pill drags to reorder among its siblings here.
        if(depth===0){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); _sboardDraggingHeaderId=headerRow.id; });
          hd.addEventListener('dragend', function(){ _sboardDraggingHeaderId=null; });
        }
        // Three drop zones, Aug 3 2026 -- left/right edges reorder this
        // Header among its top-level siblings (unchanged); the middle
        // band now nests the dragged Header/Subber under THIS Header
        // instead of doing nothing, matching the reorder-vs-nest zoning
        // idea tiles already use. A plain idea dropped anywhere on this
        // pill still just files under this Header, same as before --
        // ideas don't have a "top level" to reorder into here.
        // Bright green, Aug 3 2026 -- Larry: "Make it a bright green to
        // saw it is OK to release header here." Was the same blue
        // (#2d7dff) used for the reorder line itself, which didn't read
        // as a go/no-go signal -- green is the conventional "this is a
        // valid drop, safe to let go" color (matching, e.g., a traffic
        // light) the same way red reads as "stop/danger," so it was the
        // more effective choice here over red.
        // Named (not anonymous) so the enlarged promote zone below can call
        // the exact same logic directly -- see the note there.
        function hdDragOver(e){
          e.preventDefault();
          var rect=hd.getBoundingClientRect();
          var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
          if(frac<0.3){ hd.style.outline='none'; hd.style.boxShadow='inset 4px 0 0 0 #22c55e'; hd._dropSide='before'; }
          else if(frac>0.7){ hd.style.outline='none'; hd.style.boxShadow='inset -4px 0 0 0 #22c55e'; hd._dropSide='after'; }
          else { hd.style.boxShadow='none'; hd.style.outline='2px solid #22c55e'; hd._dropSide='nest'; }
        }
        function hdDragLeave(){ hd.style.boxShadow='none'; hd.style.outline='none'; hd._dropSide=null; }
        function hdDrop(e){
          e.preventDefault();
          var side=hd._dropSide||'before';
          hd.style.boxShadow='none'; hd.style.outline='none'; hd._dropSide=null;
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw || raw==='sb-goup') return;
          if(raw.indexOf('header:')===0){
            var draggedHeaderId=raw.slice(7);
            if(String(draggedHeaderId)===String(headerRow.id)) return;
            if(side==='nest'){ _sboardMoveCard(draggedHeaderId, headerRow.id); }
            // Larry, Aug 3 2026: "unless this happens faster, we need the
            // clock to feedback that action is happening" -- a header
            // reorder rewrites sort_order on every visible header
            // sequentially (see _sboardReorderHeader), which is fast with
            // a handful of headers but genuinely takes a beat with a
            // full row of them, and the small #sc-status text alone was
            // easy to miss. Wrapping with the same pocket-watch spinner
            // every screen change already shows (_sboardSpinWhile) gives
            // it the same unmistakable "still working" feedback, with no
            // new UI to build.
            else { _sboardSpinWhile(_sboardReorderHeader(draggedHeaderId, headerRow.id, side==='after')); }
          } else {
            _sboardMoveCard(raw, headerRow.id);
          }
        }
        hd.addEventListener('dragover', hdDragOver);
        hd.addEventListener('dragleave', hdDragLeave);
        hd.addEventListener('drop', hdDrop);
        // Enlarged "promote to Header" target, Aug 26 2026 -- Larry:
        // dragging a Subber up towards the header row showed the correct
        // green "safe to release" cue, then it landed inside a
        // NEIGHBORING column's card list instead of promoting, because hd
        // above (the real "promote" target) is a slim strip compared to
        // the tall card list right below/beside it -- easy to miss by a
        // few pixels, especially crossing into an adjacent column on the
        // way up. This adds a CAPTURE-phase listener on the whole column
        // (fires before any card tile's own dragover/drop, so it can
        // intercept and swallow the event with stopPropagation before a
        // tile ever sees it) that treats a Header/Subber drag landing
        // anywhere in the top strip of THIS column -- not just precisely
        // on hd -- exactly like a drop on hd itself. _sboardDraggingHeaderId
        // (set on dragstart/cleared on dragend, since dragover can't read
        // the real payload) keeps this from ever affecting a plain idea
        // card drag, which should keep filing under whatever it's
        // actually dropped on, same as before.
        var PROMOTE_ZONE_H = HEADER_H + 56;
        function inPromoteZone(e){
          if(!_sboardDraggingHeaderId) return false;
          var rect=block.getBoundingClientRect();
          return (e.clientY - rect.top) <= PROMOTE_ZONE_H;
        }
        block.addEventListener('dragover', function(e){
          if(inPromoteZone(e)){ e.stopPropagation(); hdDragOver(e); }
          else if(hd._dropSide){ hdDragLeave(); }
        }, true);
        block.addEventListener('dragleave', function(e){
          if(hd._dropSide && !block.contains(e.relatedTarget)) hdDragLeave();
        }, true);
        block.addEventListener('drop', function(e){
          if(inPromoteZone(e)){ e.stopPropagation(); hdDrop(e); }
        }, true);
        block.appendChild(hd);
        if(directItems.length || subs.length || !blocksNewSubbers){
          var scroll=document.createElement('div');
          scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
          // Renders in the ONE combined order now, Aug 22 2026 (Larry:
          // "mix them into the story") -- Subbers and cards interleaved
          // exactly as dragged, instead of two separate passes (all
          // Subbers, then all cards). The person filter still only ever
          // hides plain cards, never Subbers (structural, not something a
          // traveler is "assigned"), same as before -- just checked
          // per-item instead of pre-filtering a separate list.
          var _sbAllowedDirectIds={};
          _sboardFilterByPerson(directItems).forEach(function(r){ _sbAllowedDirectIds[r.id]=true; });
          combined.forEach(function(r){
            if(r.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(r, SUBBER_W, SUBBER_H, straight)); }
            else if(_sbAllowedDirectIds[r.id]){ scroll.appendChild(_sboardMakeTile(r, SUBBER_W, straight, headerRow.id, SUBBER_H)); }
          });
          // [+] under each header adds a new subber directly here — mirrors
          // the [+] after MISC for headers. MISC included now too (any
          // idea can land there, on-topic or not); Purpose joined them
          // Aug 4, 2026. NEW/Trash stay excluded.
          if(!blocksNewSubbers && !headerRow.locked){
            scroll.appendChild(_sboardMakeAddSubberTile(headerRow.id, SUBBER_W, SUBBER_H));
          }
          block.appendChild(scroll);
        }
        return block;
      }

      // Local "NEW" column for a nested (fractal) board — same visual
      // treatment as renderGroup, but backed by directItems only (no sub-headers,
      // since this bucket is specifically the uncategorized-items catch-all for
      // whichever board is currently open). It's visually virtual — no children
      // are ever filed under its own id — but it borrows color from the real
      // per-level NEW row _sboardEnsureNewAdditionsHeader already ensures exists,
      // so the color picker has something real to save to.
      function renderLocalNewAdditions(directItems, parentIdForDrop, newRow){
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('div');
        hd.className='sc-pill named';
        // Plain "NEW" everywhere, matching the Briefing Board's NEW column
        // — Aug 7 2026, Larry. Used to read "[Topic] Ideas" (e.g. "Website
        // Ideas") whenever a Topic was open, on the reasoning that loose
        // ideas here aren't necessarily freshly typed. Larry wanted one
        // consistent label across every storyboard instead of that.
        //
        // Superseded Aug 25 2026, Larry: this hardcoded label is why
        // FG-fix-20260825a/b's landing-zone renaming never showed up on
        // screen even though it was correctly renaming the real header
        // row underneath (confirmed live -- the row's name in the
        // database was right, this label just never looked at it). Now
        // reads the real row's own name when there is one, falling back
        // to the classic "NEW" only when there genuinely isn't a row to
        // read from yet (e.g. mid-creation).
        var localLabel=(newRow && newRow.text_content) ? newRow.text_content : 'NEW';
        // oneLine:true, Sept 8 2026 -- same one-line preference as the
        // ordinary column header pill just above, so a renamed NEW
        // bucket (e.g. "(Dream Phase)") reads the same way.
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+_sboardFitFontSize(localLabel,Math.round(20*_tsMult),Math.round(8*_tsMult),HEADER_W-28,HEADER_H-14,1.2,true)+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(newRow&&newRow.color?';background:'+newRow.color:'');
        hd.textContent=localLabel;
        if(newRow){
          // Drilling in moved to drag-onto-TOPIC (July 27, 2026); double-click
          // is the color-options shortcut, same as every other card, and is
          // now the only way to open this card -- the corner-flip triangle
          // that used to sit alongside it was removed Sept 6 2026 (Larry:
          // "remove the gray corners flip option from all cards. Just
          // double click to open cards.").
          hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(newRow); });
        }
        // Locked no longer blocks dragging, Aug 25 2026 -- see the note
        // on _sboardMakeTile above.
        if(newRow){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+newRow.id); _sboardDraggingHeaderId=newRow.id; });
          hd.addEventListener('dragend', function(){ _sboardDraggingHeaderId=null; });
        }
        // Same bright green as the main header drop zones above, Aug 3
        // 2026 -- keeps NEW's own reorder feedback consistent with every
        // other header pill's.
        hd.addEventListener('dragover', function(e){
          e.preventDefault();
          var rect=hd.getBoundingClientRect();
          var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
          hd.style.outline='none';
          hd.style.boxShadow = (frac<0.5) ? 'inset 4px 0 0 0 #22c55e' : 'inset -4px 0 0 0 #22c55e';
          hd._dropSide = (frac<0.5) ? 'before' : 'after';
        });
        hd.addEventListener('dragleave', function(){ hd.style.boxShadow='none'; hd._dropSide=null; });
        hd.addEventListener('drop', function(e){
          e.preventDefault();
          var side=hd._dropSide||'before';
          hd.style.boxShadow='none'; hd._dropSide=null;
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw||raw==='sb-goup') return;
          if(raw.indexOf('header:')===0){
            if(newRow) _sboardSpinWhile(_sboardReorderHeader(raw.slice(7), newRow.id, side==='after'));
          } else {
            _sboardMoveCard(raw, parentIdForDrop);
          }
        });
        block.appendChild(hd);
        // Aug 7 2026, Larry: NEW should be able to take a new idea directly,
        // same [+] every other header gets (mirrors renderGroup's own
        // !blocksNewSubbers tile below) -- not just something things land
        // in by sliding down or being demoted. Scroll section now always
        // renders (even with zero items yet) so the [+] has somewhere to
        // sit; only a locked NEW row (shouldn't normally happen) hides it.
        if(directItems.length || (newRow && !newRow.locked)){
          var scroll=document.createElement('div');
          scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
          _sboardFilterByPerson(directItems).forEach(function(item){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, true, parentIdForDrop, SUBBER_H)); });
          if(newRow && !newRow.locked){
            scroll.appendChild(_sboardMakeAddSubberTile(parentIdForDrop, SUBBER_W, SUBBER_H));
          }
          block.appendChild(scroll);
        }
        return block;
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.id='sc-groups-wrap';
      groupsWrap.style.cssText='display:flex;flex-wrap:nowrap;gap:2px;align-items:flex-start';

      if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
        var directIdeas=(childrenOfHeader[T2TShared.currentTopicId]||[]).slice().sort(_sboardBySortOrder);
        _sboardIdeaOrderByParent[T2TShared.currentTopicId]=directIdeas.map(function(r){ return r.id; });
        var childHeaders=subHeadersOf[T2TShared.currentTopicId]||[];
        var childHeadersSorted=childHeaders.slice().sort(_sboardBySortOrder);

        // Unified row — added July 12, 2026. Purpose, the Ideas bucket,
        // ordinary content headers, and MISC now all live in one
        // reorderable row instead of three fixed islands with only the
        // middle section movable. A row member without a real sort_order
        // yet falls back to the familiar default arrangement (Purpose,
        // Ideas, content, MISC) via priority tie-break; the first drag
        // anywhere in the row gives every member a real sort_order and
        // the fallback stops mattering from then on.
        // Purpose shows only on the project's own top-level board — never
        // on nested/fractal boards, which need the room. Reverted July 16,
        // 2026 (previous session had widened this to every board, which
        // was the wrong direction).
        var mergedRow=[];
        if(purposeRow && isAtProjectRoot) mergedRow.push(purposeRow);
        if(newAdditionsRow) mergedRow.push(newAdditionsRow);
        mergedRow=mergedRow.concat(childHeadersSorted);
        if(miscRow) mergedRow.push(miscRow);
        // Fallback priority for a row member with no real sort_order yet.
        // Used to be a flat 0 for every ordinary content header, which
        // only matched the "default arrangement" on a totally fresh board
        // (nothing backfilled yet, so 0 ties everything and original query
        // order wins). Once a board's existing headers HAVE been backfilled
        // with real sort_order values, a flat 0 loses that tie-break to
        // any header whose real value is >0 -- so a header added via [+]
        // after that point sorted itself in near the front instead of at
        // the true end of the row, next to MISC, as the [+] control is
        // documented to do. Now scaled to land after every already-real
        // value in this row instead. Fixed Aug 6, 2026.
        var _rowMaxRealSortOrder=-1;
        mergedRow.forEach(function(h){
          if((h.sort_order!==null&&h.sort_order!==undefined) && !(miscRow&&String(h.id)===String(miscRow.id)) && h.sort_order>_rowMaxRealSortOrder){
            _rowMaxRealSortOrder=h.sort_order;
          }
        });
        var _rowPriority=function(h){
          if(purposeRow && String(h.id)===String(purposeRow.id)) return -2;
          if(newAdditionsRow && String(h.id)===String(newAdditionsRow.id)) return -1;
          if(miscRow && String(h.id)===String(miscRow.id)) return 999;
          return _rowMaxRealSortOrder+1;
        };
        mergedRow.sort(function(a,b){
          var ao=(a.sort_order===null||a.sort_order===undefined)?_rowPriority(a):a.sort_order;
          var bo=(b.sort_order===null||b.sort_order===undefined)?_rowPriority(b):b.sort_order;
          return ao-bo;
        });
        // ORDER # badges always read the REAL order (this mergedRow,
        // backfilled), never whatever's on screen -- Larry, Aug 3 2026:
        // "the order number does NOT change." _sboardTopLevelOrder is
        // also what drag-reorder itself writes against, so it has to
        // stay the real order too, not the alphabetical display below.
        _sboardBackfillSortOrder(mergedRow);
        _sboardTopLevelOrder=mergedRow.map(function(h){ return h.id; });
        _sboardVisibleHeaders=childHeadersSorted;

        if(statusEl) statusEl.textContent=(directIdeas.length===0 && childHeaders.length===0) ? 'Nothing under this Header yet.' : '';

        // Alphabetical view, Aug 3 2026 -- Purpose/NEW stay pinned first
        // and MISC stays pinned last (their real, backfilled relative
        // order is kept exactly as-is); only the content headers between
        // them get rearranged alphabetically for DISPLAY. mergedRow
        // itself -- the real order everything else (badges, drag-reorder)
        // reads from -- is untouched either way.
        var displayMergedRow=mergedRow;
        if(_sboardAlphaHeaderView){
          var _pinFirstIds=[purposeRow&&String(purposeRow.id), newAdditionsRow&&String(newAdditionsRow.id)];
          var _pinLastId=miscRow?String(miscRow.id):null;
          var _pinFirst=mergedRow.filter(function(h){ return _pinFirstIds.indexOf(String(h.id))!==-1; });
          var _pinLast=mergedRow.filter(function(h){ return _pinLastId && String(h.id)===_pinLastId; });
          var _middleAlpha=mergedRow.filter(function(h){ return _pinFirstIds.indexOf(String(h.id))===-1 && !(_pinLastId && String(h.id)===_pinLastId); }).sort(_sboardByAlpha);
          displayMergedRow=_pinFirst.concat(_middleAlpha).concat(_pinLast);
        }

        displayMergedRow.forEach(function(h){
          if(newAdditionsRow && String(h.id)===String(newAdditionsRow.id)){
            groupsWrap.appendChild(renderLocalNewAdditions(directIdeas, T2TShared.currentTopicId, h));
          } else {
            groupsWrap.appendChild(renderGroup(h, 0));
          }
        });
      } else {
        if(newAdditionsRow) groupsWrap.appendChild(renderGroup(newAdditionsRow, 0));
        displayTop.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
        _sboardVisibleHeaders=(newAdditionsRow?[newAdditionsRow]:[]).concat(orderedTop);
        if(statusEl) statusEl.textContent='';
        if(miscRow) groupsWrap.appendChild(renderGroup(miscRow, 0));
      }
      // [+] after MISC — adds a new header at this board's level. Simpler,
      // more discoverable than the 💡 button for this one job. Locked
      // July 16, 2026.
      groupsWrap.appendChild(_sboardMakeAddHeaderTile(HEADER_W, HEADER_H));

      wrap.appendChild(groupsWrap);

      // Idea Storyboards role shortcuts strip, Sept 2 2026 -- see
      // _sboardMakeRoleShortcutTile above and _sboardRoleShortcuts,
      // resolved earlier in this same render. Appended as its own row
      // below the real board content (not mixed into groupsWrap) so it
      // never competes with that row's drag-to-reorder/nest zones. Only
      // shows up on the three screens it applies to, and only once
      // there's actually something to show -- an empty COLLABORATOR/
      // STAKEHOLDER bucket, or a board with no Primary promotions yet,
      // renders exactly as it did before this feature existed.
      if(_sboardRoleShortcuts && _sboardRoleShortcuts.length && String(T2TShared.currentTopicId)===String(_sboardRoleShortcutsTopicId)){
        var shortcutsWrap=document.createElement('div');
        shortcutsWrap.id='sc-role-shortcuts-wrap';
        shortcutsWrap.style.cssText='margin-top:10px;padding-top:10px;border-top:1px dashed #cfc0a0';
        var shortcutsLabel=document.createElement('div');
        var _shortcutsTitle=_sboardRoleShortcutsKind==='promoted' ? 'ALSO YOURS — PRIMARY ON'
          : _sboardRoleShortcutsKind==='collaborator' ? 'COLLABORATOR — CAST MEMBER ON'
          : _sboardRoleShortcutsKind==='stakeholder' ? 'STAKEHOLDER — ASSIGNED ON'
          : '';
        shortcutsLabel.style.cssText='font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#7a6040;margin-bottom:6px';
        shortcutsLabel.textContent=_shortcutsTitle;
        shortcutsWrap.appendChild(shortcutsLabel);
        var shortcutsRow=document.createElement('div');
        shortcutsRow.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
        _sboardRoleShortcuts.forEach(function(entry){
          shortcutsRow.appendChild(_sboardMakeRoleShortcutTile(entry, HEADER_W, HEADER_H));
        });
        shortcutsWrap.appendChild(shortcutsRow);
        wrap.appendChild(shortcutsWrap);
      }

      _sboardUpdateHeaderChrome();
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardBatchUpload(fileList){
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var files=Array.prototype.slice.call(fileList||[]).filter(function(f){ return f.type && f.type.indexOf('image/')===0; });
    if(!files.length) return;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var ok=0, failed=0;
      for(var i=0;i<files.length;i++){
        var f=files[i];
        if(statusEl){ statusEl.classList.remove('err'); statusEl.textContent='Uploading '+(i+1)+' of '+files.length+'…'; }
        try{
          var fname=f.name||('pasted-image-'+Date.now()+'.png');
          var toUpload=await T2TMedia.compressImageFile(f);
          var uploadName=toUpload.name||fname;
          var path=user.id+'/'+Date.now()+'-'+i+'-'+uploadName.replace(/[^a-zA-Z0-9._-]/g,'_');
          var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
          if(up.error) throw up.error;
          var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
          var url=pub.data && pub.data.publicUrl;
          if(!url) throw new Error('No public URL returned.');
          var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'image',image_url:url,cluster_id:T2TShared.filter||null,created_at:new Date().toISOString()}).select().single();
          if(ins.error) throw ins.error;
          _sboardAddRow(ins.data);
          ok++;
        }catch(fileErr){ failed++; }
      }
      if(statusEl){
        statusEl.textContent = failed ? (ok+' uploaded, '+failed+' failed.') : '';
        if(failed) statusEl.classList.add('err');
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent='Upload needs the sea-of-ideas Storage bucket set up in Supabase first: '+err.message; statusEl.classList.add('err'); }
    }
  }

  // Logo/artwork upload, crop, resize, drag, and hover-peek -- see the
  // shared window.T2TLogo controller in idea-media-shared.js and this
  // board's own _sboardLogoCfg (near injectSeaOfIdeasCluster, above).
  // Only positioning (_sboardPositionLogoNearTopic, below -- the one piece
  // that's specific to this board's header layout) stays here.

