/* ============================================================
   idea-storyboard-9710.js — T2T Field Guide · ISB STORYBOARD (9710)
   + legacy 9220/9221 SEA OF IDEAS grid/cluster views.

   Split out of sea-of-ideas.js on July 17, 2026 (Session 118) once
   that file passed the 3,500-line threshold (was 4,325 lines).
   Behavior is UNCHANGED — this is a structural split, not a rebuild.

   Part of the three-file ISB split:
     idea-media-shared.js   (loads FIRST  — shared state + capture/media)
     idea-storyboard-9710.js (loads SECOND — this file)
     session.js              (loads THIRD  — 9711 SESSION + public API)
   Script tag order in every phase file matters — T2TShared and
   T2TMedia must exist before this file's top-level code runs, and
   this file's T2TStoryboard must exist before session.js runs.

   Talks to backpack.js ONLY through window.T2T. Talks to the other
   two ISB files ONLY through window.T2TShared (shared mutable state)
   and window.T2TMedia (exposed media/capture functions) — never
   reaches into their closures directly.

   Exposes window.T2TStoryboard = {
     ensureMiscHeader, ensureTrashHeader, moveCard,
     isAutoHeaderText, getRow
   } for idea-media-shared.js and session.js to call.
   ============================================================ */

(function(){

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
        // Corner-flip dog-ear — added July 16, 2026. Turned-up lower-right
        // corner on every card (idea/subber + header, any size). Click
        // opens the back of the card (openSbDetail). Kept separate from
        // dblclick on purpose — dblclick is reserved for HEADER/sub-header
        // drill-to-TOPIC navigation, and this avoids any collision with
        // that or with the DETAILS image lightbox's own dblclick.
        +'.sc-corner-flip{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 15px 15px;border-color:transparent transparent rgba(26,58,92,0.32) transparent;cursor:pointer;z-index:6;transition:border-width .12s}'
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
        +'.sc-corner-flip:hover{border-width:0 0 20px 20px;border-color:transparent transparent rgba(26,58,92,0.55) transparent}'
        +'.sb-icon-btn{flex:1;background:#d6eaf8;border:1px solid #a9cce3;border-radius:10px;box-shadow:0 3px 8px rgba(26,58,92,0.15);padding:10px 0;font-size:calc(19px * var(--fg-text-scale,1));line-height:1;cursor:pointer;text-align:center;color:#1a3a5c;transition:transform .1s}'
        +'.sb-icon-btn:active{transform:scale(0.93)}'
        +'.sb-icon-btn.misc{font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.4px;padding:14px 0}'
        +'#sc-topic-box{text-align:center;background:#eaf3fb;border:2px solid #1a3a5c;border-radius:0;padding:8px 18px;font-size:calc(23px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;cursor:pointer;position:relative;box-shadow:0 3px 10px rgba(0,0,0,0.28)}'
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
        +'#fg-root.sb-wide{max-width:1200px!important}'
        +'#fg-root.sb-wide #s-sea-of-ideas-cluster{min-height:calc(100vh - 24px)!important;max-height:calc(100vh - 24px)!important}'
        +'#fg-root.sb-wide #sc-board-wrap{display:flex}'
        // Storyboard fullscreen — Logged July 8, 2026. Same real-viewport
        // takeover as the CREATE Idea Session's .isx-full (position:fixed,
        // 100vw/100vh), applied whenever the Storyboard is the active screen.
        // Deliberately NOT reusing sb-wide's max-width:1200px cap for this —
        // sb-wide stays reserved for CLUSTER's own separate wide toggle.
        +'#fg-root.isx-full #s-sea-of-ideas-cluster{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important}'
        +'#fg-root.isx-full #s-sea-of-ideas-cluster #sc-board-wrap{display:flex}'
        +'#sc-groups-wrap{gap:2px!important}'
        +'.sc-hdr-eyebrow{font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px}'
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
        +'.sc-cdrop-menu{position:fixed;background:#1a3a5c;border:1px solid rgba(255,255,255,.24);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:99999;padding:4px;box-sizing:border-box;max-height:240px;overflow-y:auto;min-width:120px}'
        +'.sc-cdrop-row{padding:6px 10px;font-size:calc(11px * var(--fg-text-scale,1));color:#fff;border-radius:6px;cursor:pointer;white-space:nowrap}'
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
        +'.sc-hdr-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-size:calc(11px * var(--fg-text-scale,1));font-family:inherit;max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        +'.sc-org-name-cdrop{margin-top:3px}'
        +'.sc-hdr-select:hover{opacity:1}'
        +'.sc-hdr-select option{color:#2C2C2A}'
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
        +'#sc-topic-box{display:inline-block;max-width:calc(320px * (0.6 + 0.4 * var(--fg-text-scale,1)));box-sizing:border-box;white-space:normal;word-wrap:break-word;position:relative;z-index:1}'
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
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:10px 16px 4px;margin-bottom:0;position:relative;min-height:70px">'
      // Header row, Aug 16 2026 -- Larry: "Center TOPIC horizontally. Move
      // parent to left of topic. Add field to right of topic for logo or
      // artwork. To right of logo say IDEA in light blue letters." 3-column
      // grid (1fr auto 1fr): Parent in the left column, Topic in the middle
      // auto column -- mathematically centered in the header no matter what
      // either side holds, since both side tracks are equal 1fr. The right
      // 1fr column is left empty on purpose (no child placed in it) just to
      // hold its share of width so Topic's centering math stays balanced.
      +'<div style="display:grid;grid-template-columns:1fr auto 1fr;column-gap:14px;align-items:start">'
      // justify-self:end, not start -- Larry, same day: "parent went to the
      // left of the screen" -- start put Parent at the FAR edge of its own
      // wide 1fr column; end puts it at that column's near edge, right up
      // against Topic, which is what "left of Topic" actually meant.
      +'<div style="display:flex;flex-direction:column;align-items:center;justify-self:end">'
      +'<div class="sc-hdr-eyebrow">Parent</div>'
      +'<div id="sc-parent-hit" class="sc-hdr-frame" style="display:flex;align-items:center;justify-content:center">'
      +'<div id="sc-parent-label" class="sc-hdr-frame-label">Wish Tank</div>'
      +'</div>'
      +'<div id="sc-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">1010</div>'
      +'</div>'
      +'<div style="text-align:center">'
      +'<div class="sc-hdr-eyebrow">Topic</div>'
      +'<div id="sc-topic-box" data-header-id="__topic__"><span id="sc-topic-text"></span><div id="sc-topic-badge"></div><div class="sc-corner-flip" id="sc-topic-corner-flip" title="Flip card"></div></div>'
      +'</div>'
      +'</div>'
      // Logo frame + IDEA label, Aug 16 2026 -- Larry: IDEA should read
      // larger than Topic and sit half way from Topic to the header's right
      // edge, with a large square rounded-corner logo frame in the room
      // between them. Positioned independently of the grid above (percent
      // offsets against the full header width, header-area is already
      // position:relative): Topic sits at the header's horizontal center
      // (50%), so half way from there to the right edge (100%) is 75% --
      // that's IDEA's position. The logo frame sits at 62.5%, the midpoint
      // of the room between Topic and IDEA.
      //
      // Same day, follow-up -- Larry: "(+) in the center of logo area?
      // Eyebrow LOGO above it?" Both yes. Logo frame now top-anchored with
      // its own LOGO eyebrow, same pattern as Parent/Topic, instead of
      // floating centered on the header band. A dashed-circle (+) sits in
      // the frame's middle -- same .sc-dotted-add-btn shape used for every
      // other add on this board -- wired to a toast for now (real
      // upload/storage wiring is a separate build, not just layout). Once
      // an image is actually loaded, the (+) can be swapped out/hidden;
      // not needed until upload lands for real.
      //
      // Aug 18 2026, Larry: "keep Logo the same relative distance from
      // Topic as Parent is." The 57% figure above was a one-time guess
      // against the header's total width -- it held still even as
      // Topic's own box grew/shrank with a longer or shorter name, so
      // Logo could end up sitting closer to (or farther from) Topic than
      // Parent does. Given an id here so _sboardPositionLogoNearTopic
      // (below) can measure Parent's actual gap off Topic's left edge
      // and mirror that same gap on Topic's right edge for Logo, instead
      // of a fixed percentage. left:57% stays only as the pre-JS fallback
      // position for the first paint; the position function overwrites
      // it (and drops the translateX centering, since positioning is now
      // done by measuring Logo's own frame, not by centering the wrapper).
      +'<div id="sc-logo-wrap" style="position:absolute;top:10px;left:57%;display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Logo</div>'
      +'<div id="sc-logo-slot" style="position:relative;width:46px;height:46px;box-sizing:border-box;border-radius:12px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center">'
      +'<img id="sc-logo-img" src="" alt="Logo" style="display:none;max-width:100%;max-height:100%;object-fit:contain;border-radius:12px">'
      +'<button type="button" class="sc-dotted-add-btn" id="sc-logo-add-btn" title="Add a logo or artwork" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">+</button>'
      +'</div>'
      +'</div>'
      // Board-kind label -- static per board type. This file (the Idea
      // Storyboard) always reads IDEA; the not-yet-built Planning
      // Storyboard gets the same slot/styling reading PLAN. Raised/embossed
      // look (Larry, same day: "make IDEA look raised") via a light
      // highlight above + dark shadow below -- classic emboss technique,
      // no new color needed.
      +'<div id="sc-board-kind-label" style="position:absolute;top:50%;left:75%;transform:translate(-50%,-50%);font-family:\'Playfair Display\',serif;font-weight:700;font-size:calc(42px * var(--fg-text-scale,1));letter-spacing:1px;color:#5b9bd5;white-space:nowrap;text-shadow:-1px -1px 0 rgba(255,255,255,.3),1px 1px 2px rgba(0,0,0,.5)">IDEA</div>'
      +'<div style="position:absolute;top:10px;left:16px;display:flex;gap:14px;align-items:flex-start;z-index:3">'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<button type="button" class="sc-hdr-eyebrow sc-cdrop-trigger" id="sc-type-trigger" title="Click to change category (Client, Department, Partner...)"></button>'
      +'<div class="sc-cdrop-menu" id="sc-type-menu" hidden></div>'
      +'<button type="button" class="sc-hdr-select sc-cdrop-trigger" id="sc-org-name-trigger" title="Click to set a name, e.g. Accounting or Denver Broncos"></button>'
      +'<div class="sc-cdrop-menu" id="sc-org-name-menu" hidden></div>'
      +'</div>'
      // Title, Aug 13 2026 -- Larry: PROJECT field dropped entirely,
      // Title now covers what it used to (picking which board is open),
      // scoped to Type instead of listing every board at once. Aug 13
      // 2026: no separate manage/pencil button -- double-click Title the
      // same way you'd double-click Topic to open its DETAILS card and
      // rename it right there (see the dblclick wiring below).
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Project</div>'
      +'<div class="sc-cdrop" id="sc-title-cdrop">'
      +'<button type="button" class="sc-hdr-select sc-cdrop-trigger" id="sc-title-trigger" title="Double-click to rename; click to switch boards"></button>'
      +'<div class="sc-cdrop-menu" id="sc-title-menu" hidden></div>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">View</div>'
      +'<div class="sc-cdrop" id="sc-view-cdrop">'
      +'<button type="button" class="sc-hdr-select sc-cdrop-trigger" id="sc-view-trigger" title="Filter by person assigned">Team</button>'
      +'<div class="sc-cdrop-menu" id="sc-view-menu" hidden></div>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'<div class="sc-hdr-side" style="position:absolute;top:10px;right:16px;display:flex;flex-direction:row;gap:6px;align-items:center">'
        // Storyboard/Session toggle removed here, Aug 9 2026 (Larry): this
        // header is the Idea Storyboard's own, Session-specific chrome
        // stays out of it -- Session gets its own entry point dealt with
        // separately later, not a switch living on this screen.
        +'<button class="sc-hdr-btn-muted sc-hdr-btn-icon" id="b-sc-gear" title="Options">⚙️</button>'
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
    // Logo/artwork (+) , Aug 16 2026 -- Larry: '(+) in the center of logo
    // area?' Real upload/storage isn't built yet, so this just lets a
    // traveler know it's coming rather than doing nothing when clicked.
    T().wire('sc-logo-add-btn', function(){ _sboardShowToast('Logo & artwork upload coming soon'); });
    // PROJECT field dropped, Aug 13 2026 (Larry: "completely drop
    // PROJECT") -- Title now covers picking a board. Renaming it is a
    // double-click, same as Topic's own corner-flip: opens that board's
    // own DETAILS card (openSbDetail), same editable-title field every
    // header/subber card already has. No separate pencil/manage button.
    (function(){
      var titleTrigger=document.getElementById('sc-title-trigger');
      if(titleTrigger) titleTrigger.addEventListener('dblclick', function(e){
        e.stopPropagation();
        var rootRow=_sboardCurrentRootRow();
        if(rootRow) openSbDetail(rootRow);
      });
      // Organization's Name click-to-edit is wired fresh on every render
      // in _sboardRenderOrgName() itself (sc-org-name-trigger.onclick),
      // same pattern as the Type dropdown -- nothing to wire once here.
    })();
    Promise.all([_sboardLoadMyRoots(), _sboardEnsureHiddenTypesLoaded()]).then(function(){ _sboardRenderTypePicker(); _sboardRenderOrgName(); _sboardRenderTitlePicker(); });
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
    // the TOPIC card") -- the corner-flip triangle was the only way in;
    // double-click is a second way to the same place, same "second way
    // in, not a replacement" rule already locked for Subber/Briefing
    // cards. Kept separate from the plain-click drill-in that used to
    // live here -- that was replaced by drag-and-drop onto TOPIC
    // (locked July 27, 2026) and stays that way; this only opens the
    // card, never changes what board is being viewed.
    function _sboardOpenTopicCard(){
      if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
        openSbDetail(_sboardAllRowsById[T2TShared.currentTopicId]);
      } else {
        openRootPromptEditor();
      }
    }
    var topicCornerFlip=document.getElementById('sc-topic-corner-flip');
    if(topicCornerFlip) topicCornerFlip.addEventListener('click', function(e){
      e.stopPropagation();
      _sboardOpenTopicCard();
    });

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

    (function(){
      var clicks=0, timer=null;
      var hit=document.getElementById('sc-parent-hit');
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
  var _sboardDesktop = false;
  var _sboardTrashId = null;
  var _sboardMiscId = null;
  var _sboardPurposeId = null;
  var _sboardNewAdditionsId = null;
  var _sboardActiveId = null;
  // Which header/Subber tile is "selected" for the Tab/Shift+Tab (nest/
  // un-nest) and Ctrl+Down/Ctrl+Up (drill in/out) keyboard shortcuts --
  // set by clicking a header or Subber tile (see renderGroup and
  // _sboardMakeHeaderStackTile). Aug 20 2026 (Larry: MOVE vs VIEW
  // shortcuts). Cleared whenever the board's current Topic changes (see
  // _sboardDrillInto/_sboardGoUpOneLevel) since a selection from the old
  // board wouldn't mean anything on the new one.
  var _sboardSelectedHeaderId = null;
  // Sentinel value for _sboardSelectedHeaderId meaning "the TOPIC card
  // itself is selected" -- not a real row id (there's nothing to look up
  // in _sboardAllRowsById for it), so every place that reads
  // _sboardSelectedHeaderId to act on a card must check for this sentinel
  // BEFORE doing the normal row lookup. Aug 21 2026 (Larry: "make the
  // Topic card selectable and highlightable like headers are").
  var _SBOARD_TOPIC_SENTINEL = '__topic__';
  // Aug 23 2026 (Larry: "ONE level ONLY!" -- PgUp on a card nested two
  // tiers below the current Topic, e.g. a Subber inside a column, was
  // jumping it straight to becoming the Topic itself in a single press,
  // skipping the middle step of just showing as a plain top-level header
  // of the SAME (unchanged) Topic first). Holds the id of the ONE row
  // (if any) currently being displayed as a top-level header purely for
  // VIEW purposes, even though its real cluster_id still points at its
  // actual, deeper parent -- nothing in the database changes, this is
  // read by renderSeaBoard to temporarily borrow it into the current
  // Topic's column row for this render only. A second PgUp on it (now
  // that it reads as top-level) promotes it for real via _sboardDrillInto.
  // Goes stale (and gets dropped) the moment it no longer matches
  // _sboardSelectedHeaderId -- see the check in renderSeaBoard -- so
  // selecting something else, or a real Topic change clearing selection,
  // automatically cleans this up without needing its own callback wired
  // into every place selection can change.
  var _sboardViewPromotedId = null;
  var _sboardHeadersById = {};
  var _sboardHeaderList = [];
  var _sboardTopLevelOrder = [];
  // VIEW-by-person filter state -- Aug 9 2026. Null = everyone (default).
  // Resets whenever the current project changes, same as BB resetting its
  // own VIEW filter on a board switch.
  var _sboardPersonFilterId = null;
  var _sboardViewFilterProjectId = null;
  var _sboardAllRowsById = {};
  var _sboardVisibleHeaders = [];
  var _sboardCacheReady = false;
  // Merges known-good field values straight into the cached row instead
  // of re-fetching it from Supabase to find out what it now looks like --
  // safe specifically because these are fields THIS tab itself just wrote
  // (we already know the new values without asking), unlike a realtime
  // patch (_sboardApplyRemoteIdea) which has to trust whatever payload
  // Supabase hands over instead. Aug 9 2026 (Supabase egress fix, local
  // edits). No-ops harmlessly if the row isn't in the cache yet for some
  // reason -- falls back to whatever the next real render fetches.
  function _sboardPatchRow(id, fields){
    if(!id || !_sboardAllRowsById[id]) return;
    var row=_sboardAllRowsById[id];
    for(var k in fields){ if(Object.prototype.hasOwnProperty.call(fields,k)) row[k]=fields[k]; }
  }
  // Same idea for a row THIS tab just inserted -- Supabase hands back the
  // full new row (id, created_at, etc.) via .select(), so there's no need
  // to re-fetch the account just to learn about the row we ourselves just
  // created.
  function _sboardAddRow(row){
    if(row && row.id) _sboardAllRowsById[row.id]=row;
  }
  // Shared with session.js's own tile renderer (_isxMakeTile), same
  // bridge pattern as keyDotsHTML/assignedBadgeHTML below -- a card can
  // carry a video/link attachment (Aug 11 2026) independent of its
  // content_type, so both screens' tiles need to show it, not just
  // 9710's own. Skipped for content_type==='link' cards themselves --
  // those already show their own built-in 🔗 marker.
  function _sboardLinkBadgeHTML(item){
    if(!item.link_url || item.content_type==='link') return '';
    return '<a class="sb-link-badge" href="'+_sboardEsc(item.link_url)+'" target="_blank" rel="noopener" draggable="false" title="Open link">🎬</a>';
  }

  // ---- Ctrl/Cmd+Z undo (single-step), Aug 11 2026 -- same shape as the
  // Briefing Board's own slot (briefing-board.js, _bbPushAction/_bbUndo/
  // _bbRedo), itself modeled on the Idea Session's (session.js, _isx*).
  // Covers moves and deletes -- restores the ONE row that moved/was
  // deleted to its exact previous cluster_id+sort_order, same fidelity
  // as Briefing Board's move-undo (doesn't try to re-thread every
  // sibling's order, just this row's own position). Text/color/detail
  // edits are a separate follow-up, not covered here.
  var _sboardLastAction = null;
  var _sboardLastUndone = null;
  function _sboardPushAction(entry){ _sboardLastAction=entry; _sboardLastUndone=null; }
  function _sboardShowToast(msg){
    var banner=document.getElementById('sb-undo-toast');
    if(!banner){
      banner=document.createElement('div');
      banner.id='sb-undo-toast';
      banner.style.cssText='position:fixed;top:14px;right:16px;width:200px;background:#eaf6ea;border:2px solid #2d7a3d;'
        +'color:#2d7a3d;font-size:calc(10px * var(--fg-text-scale,1));padding:6px 9px;border-radius:8px;z-index:9999;box-shadow:0 2px 6px rgba(0,0,0,.15)';
      document.body.appendChild(banner);
    }
    banner.textContent=msg;
    banner.style.display='block';
    clearTimeout(banner._sboardTimer);
    banner._sboardTimer=setTimeout(function(){ banner.style.display='none'; }, 3000);
  }
  async function _sboardUndo(){
    if(!_sboardLastAction){ _sboardShowToast('Nothing to undo.'); return; }
    var a=_sboardLastAction; _sboardLastAction=null;
    await a.undo();
    _sboardLastUndone=a;
    _sboardShowToast(a.label+' undone.');
  }
  async function _sboardRedo(){
    if(!_sboardLastUndone){ _sboardShowToast('Nothing to redo.'); return; }
    var a=_sboardLastUndone; _sboardLastUndone=null;
    await a.redo();
    _sboardLastAction=a;
    _sboardShowToast(a.label+' redone.');
  }
  function _sboardSnapshotRow(id){
    var row=_sboardAllRowsById[id];
    return row ? {cluster_id:row.cluster_id, sort_order:row.sort_order} : null;
  }
  // Shared write-back for undo AND redo -- writes the row's cluster_id+
  // sort_order straight to Supabase, patches the cache, redraws. Doesn't
  // replay any of the guarded logic in the move functions below (e.g.
  // _sboardReorderHeader's "can't create a new project this way" rule)
  // -- restoring a row to a state it has already legitimately been in
  // before doesn't need to pass those gates again.
  async function _sboardApplyRowSnapshot(id, snap){
    if(!snap) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:snap.cluster_id, sort_order:snap.sort_order}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:snap.cluster_id, sort_order:snap.sort_order});
      renderSeaBoard(true);
    }catch(e){ console.error('Storyboard: undo/redo write failed', e); }
  }
  // General-purpose version of the above for edit undo (text/color/notes)
  // -- writes whatever fields are given, straight to Supabase + cache,
  // then redraws. Added Aug 11 2026 alongside the move/delete undo.
  async function _sboardApplyFields(id, fields){
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('ideas').update(fields).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, fields);
      renderSeaBoard(true);
    }catch(e){ console.error('Storyboard: undo/redo write failed', e); }
  }
  // Moved here Aug 24 2026 (see the long comment where this used to live,
  // just above the PARENT click wiring) so climbOut()/drillIn() below can
  // actually see it -- it used to be nested one function deeper, out of
  // reach, which silently broke Page Down (and Page Up from a selected
  // TOPIC card) with a ReferenceError.
  function _sboardCanGoUpFromTopic(){
    var row=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    return !!(row && row.cluster_id);
  }
  function wireSboardUndoKeyboard(){
    // climbOut/drillIn hold the actual VIEW navigation -- doesn't move or
    // rename anything, purely which level of the board you're looking at.
    // History: Aug 20 2026 (Larry: MOVE vs VIEW shortcuts -- Tab/Shift+Tab
    // below is the separate MOVE gesture). Aug 21 2026 (Larry: "any card,
    // including topic") -- both pivot off whatever's currently selected
    // (a real row, or the TOPIC card itself via _SBOARD_TOPIC_SENTINEL,
    // checked first since it's not a real row id). With nothing selected,
    // both fall back to the existing PARENT breadcrumb climb -- an empty
    // selection reads as "the Parent" itself. From the TOPIC card there's
    // nothing to drill further into, so it always just climbs.
    // Direction swapped Aug 22 2026 (Larry, live-testing: "ctrl-down moved
    // the card UP instead" -- Down drilling IN read as backwards to him).
    // climbOut is now what Down triggers; drillIn is what Up triggers.
    // Second same-day fix: climbOut used to call _sboardDrillUpFrom
    // directly, but that function has its own fallback for a top-level
    // Header (whose parent already IS the current Topic -- nowhere
    // shallower to climb to) that promotes it to Topic anyway, the exact
    // "becomes Topic" result Larry flagged as wrong for Down. climbOut now
    // checks for that case itself first and shows the "already at the
    // top" toast instead -- it can never promote a card to Topic.
    //
    // Third fix, Aug 23 2026 (Larry: "ONE level ONLY!") through fifth fix
    // (Larry: "PgDn moved the view UP not down") -- several attempts at
    // making drillIn() (going down) a card-selection-based mirror of
    // climbOut() (going up). All superseded by the final shape below,
    // which came from Larry stating the actual rule directly: "The issue
    // is only which HEADER to PROMOTE to TOPIC going UP! If I click
    // down, the current topic becomes a header, EXACTLY like clicking on
    // the parent! Therefore, PgDn = click parent! PgUp requires highlight
    // on header to promote OR header of the highlighted card!"
    //
    // Going UP is genuinely ambiguous without a selection -- a Topic can
    // have several Headers, so promoting one to be the new Topic needs
    // to know WHICH one. climbOut() resolves that from whatever's
    // selected: a selected Header promotes directly; a selected Subheader
    // promotes its OWN Header (via _sboardDrillUpFrom, unchanged); with
    // nothing selected there's no way to know which Header is meant, so
    // it now asks for a click instead of guessing.
    //
    // Going DOWN is never actually ambiguous: the board only ever has one
    // current Topic, and that Topic has exactly one parent -- the same
    // single destination the PARENT breadcrumb (sc-parent-hit) already
    // climbs to. drillIn() doesn't need to know what's selected at all;
    // it's just that same climb, every time, full stop.
    function climbOut(){
      if(_sboardSelectedHeaderId===_SBOARD_TOPIC_SENTINEL){
        if(_sboardCanGoUpFromTopic()){ _sboardGoUpOneLevel(); _sboardSelectedHeaderId=_SBOARD_TOPIC_SENTINEL; }
        else _sboardShowToast('Already at the top of this board.');
        return;
      }
      var selRow=_sboardSelectedHeaderId && _sboardAllRowsById[_sboardSelectedHeaderId];
      if(selRow) _sboardDrillUpFrom(selRow);
      else _sboardShowToast('Click a card first -- Page Up promotes its header to the top.');
    }
    function drillIn(){
      if(_sboardCanGoUpFromTopic()) _sboardGoUpOneLevel();
      else _sboardShowToast('Already at the widest view on this board.');
    }
    document.addEventListener('keydown', function(e){
      var screen=document.getElementById('s-sea-of-ideas-cluster');
      if(!screen || !screen.classList.contains('active')) return;
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||(e.target&&e.target.isContentEditable)) return;
      var k=e.key.toLowerCase();
      // Tab / Shift+Tab -- MOVE: nest the selected header under the
      // previous top-level header, or un-nest it back to top-level. Same
      // "change level" key every outliner (Notion, Workflowy, Word's
      // outline view) already uses, so no new modifier to learn. Only
      // takes over Tab once a header is actually selected (click one
      // first) -- otherwise Tab still does normal focus-cycling, so this
      // never breaks keyboard access to the rest of the screen.
      // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
      if(k==='tab' && _sboardSelectedHeaderId && _sboardSelectedHeaderId!==_SBOARD_TOPIC_SENTINEL){
        e.preventDefault();
        if(e.shiftKey) _sboardPromoteSelectedHeader(); else _sboardDemoteSelectedHeader();
        return;
      }
      // PageDown/PageUp, Aug 22 2026 (Larry: "would click PgUp and PgDn
      // work better?" -- asked after Ctrl+Down still didn't fire for him
      // even once the logic bug above was found, fixed, and confirmed
      // deployed live). Added as a second, no-modifier way to trigger the
      // exact same climbOut/drillIn -- checked here, before the Ctrl/Cmd
      // gate below, since these two don't need a modifier at all.
      //
      // Fixed Aug 23 2026 (Larry: "PgUp should shift the entire VIEW up
      // one page... I just want to change the limited VIEW, not move
      // stuff around individually"). The original pairing above mirrored
      // Ctrl+Down/Ctrl+Up's mapping (Down=climbOut, Up=drillIn) onto the
      // Page keys without checking whether that direction reads right for
      // THIS pair -- for Page keys, "Up" universally means back toward
      // the top/start, i.e. the shallower, parent-ward direction
      // (climbOut), not deeper (drillIn). PageUp was doing the opposite
      // of what its name says. Swapped: PageUp now calls climbOut(),
      // PageDown now calls drillIn() -- same two functions as before,
      // just on the correctly-named keys.
      //
      // Two more same-day fixes to climbOut()/drillIn() themselves (an
      // over-eager bypass of the selected card, then drillIn() not
      // actually being climbOut()'s inverse) -- see their own history
      // comment above wireSboardUndoKeyboard's function bodies for the
      // full story. This pairing (PageUp=climbOut, PageDown=drillIn)
      // hasn't changed since the swap above.
      if(k==='pageup'){ e.preventDefault(); climbOut(); return; }
      if(k==='pagedown'){ e.preventDefault(); drillIn(); return; }
      // Plain Down arrow, added Aug 23 2026 (Larry: "the down arrow
      // should work exactly like this too... it is all the same action!
      // Only UP requires knowing directly or indirectly"). Going down is
      // never ambiguous (see climbOut/drillIn's own comment above), so
      // unlike Up it doesn't need a modifier to guard against an
      // accidental press -- checked here, before the Ctrl/Cmd gate
      // below, same tier as the Page keys above. This one line covers
      // plain Down AND Ctrl+Down (Ctrl+Down still matches 'arrowdown'
      // here regardless of the modifier, so it never falls through to
      // the gated block below) -- both are just drillIn(), same as
      // Page Down.
      if(k==='arrowdown'){ e.preventDefault(); drillIn(); return; }
      // Plain Up arrow, added Aug 25 2026 (Larry: "delete the need for
      // ctrl with up or down arrows -- shift view with a simple highlight
      // + appropriate arrow"). Up used to require Ctrl/Cmd on the theory
      // that promoting a card needs a highlight to know WHICH header, so a
      // stray plain Up shouldn't risk doing that by accident -- but
      // climbOut() already refuses to act without a selection (shows the
      // "Click a card first" toast instead), so the modifier was never
      // actually the thing guarding against a mistaken promote; the
      // highlight itself is. Moved up here, same tier as plain Down, so
      // the whole gesture is just: highlight a card, press the arrow that
      // matches the direction you want the view to shift -- no modifier
      // key at all. Ctrl+Up/Ctrl+Down still work too, since they also
      // match 'arrowup'/'arrowdown' here regardless of modifier and never
      // fall through to the gated block below.
      if(k==='arrowup'){ e.preventDefault(); climbOut(); return; }
      var mod=e.metaKey||e.ctrlKey;
      if(!mod) return;
      if(k==='z'){ e.preventDefault(); if(e.shiftKey) _sboardRedo(); else _sboardUndo(); return; }
    });
  }
  // Set true the first time this tab has done a real (network) render of
  // the Storyboard. Realtime-triggered renders (see _sboardRtSafeRefresh)
  // patch the changed row straight into _sboardAllRowsById and re-render
  // from that cache instead of re-fetching the whole account from
  // Supabase -- but only once there's something real in the cache to
  // render from. Aug 9 2026 (Supabase egress fix).
  // Set by 9711 (session.js, setIsxContext) after every render — lets the
  // shared DETAILS card compute an accurate "Current Location" breadcrumb
  // and header lookup when opened from 9711, instead of reading 9710's own
  // (often stale or empty) T2TShared.currentTopicId / _sboardAllRowsById.
  // Larry, July 18, 2026 ("'What do you want?' is no longer a project...
  // that isn't right").
  var _isxDetailCtx = null;
  var _sboardIdeaOrderByParent = {};
  // Subber order within their own Header, added Aug 3 2026 -- same idea
  // as _sboardIdeaOrderByParent just above, but for nested Header cards
  // (Subbers) instead of plain ideas. Lets dragging one Subber onto
  // another reorder them, the same way dragging a plain idea onto
  // another already reorders those.
  var _sboardSubberOrderByParent = {};
  // Aug 22 2026 (Larry: "sub-headers always cluster to the top... I want
  // to mix them into the story") -- the ONE real shared order for a
  // column's Subbers and plain cards together, per parent Header. Until
  // this, Subbers and cards each had their own independently-numbered
  // sequence (_sboardSubberOrderByParent / _sboardIdeaOrderByParent) and
  // always rendered as two stacked blocks, Subbers first -- no drag could
  // cross that line. This map is what dragging either kind now reorders
  // against, and what the column actually renders from (see renderGroup);
  // _sboardIdeaOrderByParent/_sboardSubberOrderByParent are still kept in
  // sync (as same-type subsets of this) purely for other, unrelated code
  // that only ever asks about one type (CLUSTER's own bucket count, the
  // top-level header promote/demote pair).
  var _sboardColumnOrderByParent = {};
  // Aug 3 2026 -- combined Subber+idea DISPLAY order per parent, used by
  // the ORDER # badge and the DETAILS card's order pill so the whole
  // visual column numbers 1,2,3... straight down with no repeats. As of
  // Aug 22 2026 this is simply set equal to _sboardColumnOrderByParent
  // each render (the real order now IS the display order) -- kept as its
  // own map since some callers still read it by this name.
  var _sboardCardOrderByParent = {};
  var _sboardChildCountById = {};
  // Alphabetical header view -- Larry, Aug 3 2026: "If headers or subbers
  // are sorted alphabetically the order number does NOT change, allowing
  // to resort to number order." This is a pure DISPLAY toggle, never
  // written anywhere -- true by default means "showing A-Z instead of
  // the real order," reset to false any time the traveler leaves this
  // board (see _sboardDrillInto/_sboardGoUpOneLevel) so a freshly opened
  // board never inherits a leftover alphabetical view from somewhere else.
  var _sboardAlphaHeaderView = false;
  var _sboardLastRenderedTopicId = undefined;
  // Signal Flags, Aug 3 2026 -- Larry: "We use red hearts to mean I like
  // this one. What about a blue heart? or a yellow triangle with custom
  // meanings visible on hover? This option could be in every gear?"
  // Follow-up, when asked how far to take it: one shared library, usable
  // "anywhere a traveler makes a note or adds an idea." This reuses the
  // exact shape+color+meaning system already proven on the Briefing
  // Board (its own board-scoped briefing_board_keys) and on Shortcuts
  // (traveler-wide bookmark_keys) -- this one is modeled on Shortcuts'
  // traveler-wide scope (one shared custom_keys table, not tied to a
  // single board), same 6 shapes / 6 colors, 12-key-library-cap (raised from 6 Aug 4 2026 after the library merge) /
  // 3-keys-per-card-cap so the visual language matches everywhere it
  // shows up. The existing red heart is untouched, per Larry's explicit
  // call -- Signal Flags are a second, optional marker, not a
  // replacement.
  var _sboardKeyShapes = ['circle','square','triangle','diamond','star','heart'];
  var _sboardKeyColors = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var _sboardKeyClip = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  var MAX_KEY_LIBRARY = 12; // raised from 6 -- Aug 4 2026, after merging Storyboard + Briefing Board libraries into one shared pool, the old per-board cap of 6 was too low for the combined set
  var MAX_KEYS_PER_CARD = 3;
  function _sboardKeyShapeCSS(shape, color){
    var css='background:'+color+';';
    if(shape==='circle') css+='border-radius:50%;';
    else if(shape==='square') css+='border-radius:2px;';
    else if(_sboardKeyClip[shape]) css+='clip-path:'+_sboardKeyClip[shape]+';';
    return css;
  }
  function _sboardEsc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _sboardKeyLibLocal(){
    try{ var r=sessionStorage.getItem('t2t_customKeyLibrary'); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  function _sboardSaveKeyLibLocal(lib){
    try{ sessionStorage.setItem('t2t_customKeyLibrary', JSON.stringify(lib)); }catch(e){}
  }
  // Instant paint from whatever sessionStorage remembers from last time,
  // same two-step pattern Shortcuts already uses for its own
  // traveler-wide key library, so the very first render of a board never
  // waits on a round trip just to know which keys already exist. A real
  // fetch (_sboardEnsureKeyLibraryLoaded, called once from renderSeaBoard)
  // corrects it moments later.
  var _sboardKeyLib = _sboardKeyLibLocal();
  var _sboardKeyLibLoaded = false;
  async function _sboardEnsureKeyLibraryLoaded(){
    if(_sboardKeyLibLoaded) return;
    _sboardKeyLibLoaded = true;
    var _sb=T().sb; if(!_sb) return;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) return;
      var res=await _sb.from('custom_keys').select('id,shape,color,meaning').eq('user_id',user.id).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _sboardKeyLib = res.data||[];
      _sboardSaveKeyLibLocal(_sboardKeyLib);
      renderSeaBoard();
    }catch(e){ console.error('Signal Flags: load failed', e); }
  }
  function _sboardKeyById(id){
    for(var i=0;i<_sboardKeyLib.length;i++){ if(String(_sboardKeyLib[i].id)===String(id)) return _sboardKeyLib[i]; }
    return null;
  }
  async function _sboardCreateKey(shape, color, meaning){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var ins=await _sb.from('custom_keys').insert({user_id:user.id,shape:shape,color:color,meaning:meaning}).select().single();
    if(ins.error) throw ins.error;
    _sboardKeyLib.push(ins.data);
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    return ins.data;
  }
  async function _sboardDeleteKey(keyId){
    var _sb=T().sb;
    var del=await _sb.from('custom_keys').delete().eq('id',keyId);
    if(del.error) throw del.error;
    _sboardKeyLib = _sboardKeyLib.filter(function(k){ return String(k.id)!==String(keyId); });
    _sboardSaveKeyLibLocal(_sboardKeyLib);
  }
  // Aug 3 2026 -- "we need to be able to edit or trash any custom key."
  // Trash already existed here (_sboardDeleteKey); this is the pencil.
  async function _sboardUpdateKey(keyId, shape, color, meaning){
    var _sb=T().sb;
    var upd=await _sb.from('custom_keys').update({shape:shape,color:color,meaning:meaning}).eq('id',keyId).select().single();
    if(upd.error) throw upd.error;
    var idx=-1;
    for(var i=0;i<_sboardKeyLib.length;i++){ if(String(_sboardKeyLib[i].id)===String(keyId)){ idx=i; break; } }
    if(idx!==-1) _sboardKeyLib[idx]=upd.data;
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    return upd.data;
  }
  // "Place same symbol on cards and they automatically link" -- Larry,
  // Aug 3 2026. Twin of briefing-board.js's own _bbSyncKeyLinks -- same
  // table (briefing_card_links), same reconciliation logic, kept as a
  // separate copy rather than a cross-file call (this codebase's
  // convention: Storyboard and Briefing Board only ever talk through
  // window.T2T / window.T2TShared, never straight into each other's
  // functions). Reconciles every source='key' via_key_id=keyId row
  // against reality -- every Briefing Card and every idea/header
  // currently carrying this key -- adding rows for pairs that should be
  // linked and haven't yet, removing rows for pairs that no longer
  // share the key. Idea-to-idea pairs are skipped on purpose: they're
  // already sitting together right here on the board, a "jump to it"
  // link between two ideas that are both already on screen wouldn't do
  // anything useful.
  async function _sboardSyncKeyLinks(keyId){
    if(!keyId) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var ir=await _sb.from('ideas').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var ideaIds=(ir.data||[]).map(function(r){ return r.id; });
      var cr=await _sb.from('briefing_cards').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var cardIds=(cr.data||[]).map(function(r){ return r.id; });

      var desired={};
      var i, j;
      for(i=0;i<cardIds.length;i++){
        for(j=i+1;j<cardIds.length;j++){
          var a=cardIds[i], b=cardIds[j];
          var lo=a<b?a:b, hi=a<b?b:a;
          desired['card|'+lo+'|'+hi]={target_type:'card', card_id:lo, target_card_id:hi};
        }
      }
      for(i=0;i<cardIds.length;i++){
        for(j=0;j<ideaIds.length;j++){
          desired['story|'+cardIds[i]+'|'+ideaIds[j]]={target_type:'storyboard', card_id:cardIds[i], target_idea_id:ideaIds[j]};
        }
      }

      var existRes=await _sb.from('briefing_card_links').select('*').eq('source','key').eq('via_key_id', keyId);
      var existing=existRes.data||[];
      var existingByKey={};
      existing.forEach(function(row){
        if(row.target_type==='card'){
          var a2=row.card_id, b2=row.target_card_id;
          var lo2=a2<b2?a2:b2, hi2=a2<b2?b2:a2;
          existingByKey['card|'+lo2+'|'+hi2]=row;
        } else {
          existingByKey['story|'+row.card_id+'|'+row.target_idea_id]=row;
        }
      });

      var toInsert=[], toDeleteIds=[];
      Object.keys(desired).forEach(function(k){
        if(!existingByKey[k]){
          var d=desired[k];
          toInsert.push({card_id:d.card_id, target_type:d.target_type, target_card_id:d.target_card_id||null, target_idea_id:d.target_idea_id||null, source:'key', via_key_id:keyId});
        }
      });
      Object.keys(existingByKey).forEach(function(k){
        if(!desired[k]) toDeleteIds.push(existingByKey[k].id);
      });

      if(toInsert.length) await _sb.from('briefing_card_links').insert(toInsert);
      if(toDeleteIds.length) await _sb.from('briefing_card_links').delete().in('id', toDeleteIds);
    }catch(e){ console.error('Storyboard: could not sync key-driven links', e); }
  }
  function _sboardItemKeys(item){
    return [item.key_slot_1, item.key_slot_2, item.key_slot_3].filter(function(k){ return !!k; });
  }
  // Writes all 3 slot columns from a gap-free array -- same "splice,
  // don't null out" approach the Briefing Board's own Signal Flags use,
  // so removing key #2 of 3 shifts #3 left instead of leaving an empty
  // middle slot.
  async function _sboardWriteItemKeys(itemId, keysArr){
    var _sb=T().sb;
    var upd=await _sb.from('ideas').update({
      key_slot_1: keysArr[0]||null,
      key_slot_2: keysArr[1]||null,
      key_slot_3: keysArr[2]||null
    }).eq('id', itemId);
    if(upd.error) throw upd.error;
    var row=_sboardAllRowsById[itemId];
    if(row){ row.key_slot_1=keysArr[0]||null; row.key_slot_2=keysArr[1]||null; row.key_slot_3=keysArr[2]||null; }
  }
  // On-card badge, Aug 3 2026 -- small shape+color dots tucked just left
  // of the heart, bottom-right -- Larry: "Custom key goes on the outside
  // of the card like the heart," after an earlier top-center placement
  // didn't read right. title=meaning gives the "visible on hover" Larry
  // asked for, for free, via the native browser tooltip.
  function _sboardKeyDotsHTML(item){
    var keys=_sboardItemKeys(item);
    if(!keys.length) return '';
    return '<div class="sb-key-dots">'+keys.map(function(kid){
      var k=_sboardKeyById(kid);
      if(!k) return '';
      return '<span class="sb-key-dot" style="'+_sboardKeyShapeCSS(k.shape,k.color)+'" title="'+_sboardEsc(k.meaning||'')+'"></span>';
    }).join('')+'</div>';
  }

  // Front-of-card badge (Aug 9 2026, Larry). Tile rendering
  // (_sboardMakeTile/_sboardMakeHeaderStackTile, and 9711's own
  // _isxMakeTile/_isxMakeHeaderStackTile via the T2TStoryboard bridge
  // below) is synchronous, but the name behind a user_id lives in the
  // members table -- a separate round trip. Rather than block every
  // render on that, _sboardEnsureMemberInitials fetches whatever's
  // missing in the background and the caller re-renders (fromCache=true,
  // so it's cheap) once new names actually land. Cache is keyed by
  // user_id and never invalidated -- a member's initials essentially
  // never change mid-session, same assumption _bbMembersCache already
  // makes on the Briefing Board side.
  var _sboardAssignedCache = {};
  var _sboardAssignedFetchInFlight = {};
  async function _sboardEnsureMemberInitials(uids){
    var missing=[], seen={};
    (uids||[]).forEach(function(uid){
      if(!uid || _sboardAssignedCache[uid] || _sboardAssignedFetchInFlight[uid] || seen[uid]) return;
      seen[uid]=true; missing.push(uid);
    });
    if(!missing.length) return false;
    missing.forEach(function(uid){ _sboardAssignedFetchInFlight[uid]=true; });
    var _sb=T().sb;
    if(!_sb){ missing.forEach(function(uid){ delete _sboardAssignedFetchInFlight[uid]; }); return false; }
    try{
      var res=await _sb.from('members').select('user_id,name,initials').in('user_id', missing);
      if(!res.error && res.data){
        res.data.forEach(function(m){ _sboardAssignedCache[m.user_id]={name:m.name||'', initials:(m.initials||'').toUpperCase()}; });
      }
    }catch(e){}
    missing.forEach(function(uid){ delete _sboardAssignedFetchInFlight[uid]; });
    return true;
  }
  // Legacy path -- still feeds the badge for any card nobody has starred
  // a primary doer on yet via the 👥 button (see _sboardCardPrimaryCache/
  // _sboardEnsureCardPrimary below, which is now the primary source).
  function _sboardEnsureAssignedInitials(rows){
    var uids=(rows||[]).map(function(r){ return r&&r.assigned_user_id; }).filter(Boolean);
    return _sboardEnsureMemberInitials(uids);
  }

  // Primary doer (Session 234, Aug 21) -- who the 👥 dropdown's star is
  // on for a given card. Replaces the old single-field Person Assigned as
  // the source for both this badge and the board's Team filter
  // (_sboardFilterByPerson). Cache is keyed by "cardType:cardId" -- Session
  // 234's extension to Briefing Cards (via the T2TStoryboard bridge) means
  // this cache can hold entries for more than one card_roles.card_type at
  // once, and a compound key keeps them from ever colliding even though
  // idea/briefing_card ids come from separate uuid columns already. A
  // cached value of null means "fetched, nobody's starred" (as opposed to
  // undefined/absent, "haven't asked yet"), so a card only falls back to
  // its legacy single-field value while genuinely unstarred -- not just
  // before the fetch lands.
  var _sboardCardPrimaryCache = {};
  var _sboardCardPrimaryFetchInFlight = {};
  function _sboardCpKey(cardType, cardId){ return (cardType||'idea')+':'+cardId; }
  // Raw, card_type-generic fetch -- exposed on the T2TStoryboard bridge as
  // ensureCardPrimaryRaw so briefing-board.js can warm its own cards'
  // primaries the same way the Idea Board does for its own.
  async function _sboardEnsureCardPrimaryRaw(cardType, ids){
    cardType = cardType||'idea';
    var missing=[], seen={};
    (ids||[]).forEach(function(id){
      var key=_sboardCpKey(cardType, id);
      if(!id || _sboardCardPrimaryCache.hasOwnProperty(key) || _sboardCardPrimaryFetchInFlight[key] || seen[key]) return;
      seen[key]=true; missing.push(id);
    });
    if(!missing.length) return false;
    missing.forEach(function(id){ _sboardCardPrimaryFetchInFlight[_sboardCpKey(cardType,id)]=true; });
    var _sb=T().sb;
    if(!_sb){ missing.forEach(function(id){ delete _sboardCardPrimaryFetchInFlight[_sboardCpKey(cardType,id)]; }); return false; }
    try{
      var res=await _sb.from('card_roles').select('card_id,user_id').eq('card_type',cardType).eq('is_primary',true).in('card_id', missing);
      var found={};
      if(!res.error && res.data){
        res.data.forEach(function(row){ found[row.card_id]=row.user_id; _sboardCardPrimaryCache[_sboardCpKey(cardType,row.card_id)]=row.user_id; });
      }
      missing.forEach(function(id){ if(!(id in found)) _sboardCardPrimaryCache[_sboardCpKey(cardType,id)]=null; });
      var uids=Object.keys(found).map(function(id){ return found[id]; });
      if(uids.length) await _sboardEnsureMemberInitials(uids);
    }catch(e){
      missing.forEach(function(id){ var key=_sboardCpKey(cardType,id); if(!_sboardCardPrimaryCache.hasOwnProperty(key)) _sboardCardPrimaryCache[key]=null; });
    }
    missing.forEach(function(id){ delete _sboardCardPrimaryFetchInFlight[_sboardCpKey(cardType,id)]; });
    return true;
  }
  // Raw lookup -- undefined means "not fetched yet" (caller's choice what
  // to show meanwhile), null means "fetched, nobody starred" (caller
  // applies its own legacy fallback), a uuid string means "this person".
  function _sboardCardPrimaryUidRaw(cardType, cardId){
    var key=_sboardCpKey(cardType, cardId);
    return _sboardCardPrimaryCache.hasOwnProperty(key) ? _sboardCardPrimaryCache[key] : undefined;
  }
  // Idea Board's own convenience wrappers -- unchanged signatures, every
  // existing call site in this file/session.js keeps working as-is.
  async function _sboardEnsureCardPrimary(rows){
    var ids=(rows||[]).map(function(r){ return r&&r.id; }).filter(Boolean);
    return _sboardEnsureCardPrimaryRaw('idea', ids);
  }
  function _sboardCardPrimaryUid(item){
    if(!item) return '';
    var uid=_sboardCardPrimaryUidRaw('idea', item.id);
    return uid || item.assigned_user_id || '';
  }
  function _sboardAssignedBadgeHTML(item){
    var uid=_sboardCardPrimaryUid(item);
    if(!uid) return '';
    var m=_sboardAssignedCache[uid];
    if(!m) return ''; // not fetched yet this pass -- next re-render (see _sboardEnsureCardPrimary/_sboardEnsureAssignedInitials) fills it in
    return '<div class="sb-person-badge" title="'+_sboardEsc(m.name||'')+'">'+_sboardEsc(m.initials||'')+'</div>';
  }
  function _sboardNotesBadgeHTML(item){
    if(!item || !item.notes || !item.notes.trim()) return '';
    return '<div class="sb-notes-badge" title="Has notes">✏️</div>';
  }
  // Lock badge, Aug 15 2026 -- previously an ad-hoc top-right icon built
  // separately in _sboardMakeTile/_sboardMakeHeaderStackTile; centralized
  // here so it's just another signal-flag-style helper, matching
  // _sboardNotesBadgeHTML above. Larry: "is the LOCK not just another
  // FLAG? ... all signal flags are added to the lower left corner."
  function _sboardLockBadgeHTML(item){
    if(!item || !item.locked) return '';
    return '<span class="sb-lock-badge" title="Locked — parked here, paused before its turn. Was in progress; worth asking why.">🔒</span>';
  }
  // Shared bottom-left signal cluster wrapper, Aug 15 2026 -- Larry
  // caught the fixed-offset version leaving a stranded gap whenever a
  // card was missing one of Lock/Notes/Link (e.g. a header with only
  // Lock + one Signal Flag showed the flag stuck halfway across the
  // card, at its old fixed left:44 spot, instead of snug against Lock).
  // Every call site below now asks for exactly the badges it wants
  // (matching what each one showed before this refactor -- this is a
  // positioning fix, not a new-content change) and gets them back
  // packed together with no dead space, wrapped in one .sb-signal-row
  // div so they're positioned as a single unit.
  function _sboardSignalRowHTML(item, include){
    include = include || {};
    var parts = '';
    if(include.lock) parts += _sboardLockBadgeHTML(item);
    if(include.flags) parts += _sboardKeyDotsHTML(item);
    if(include.notes) parts += _sboardNotesBadgeHTML(item);
    if(include.link) parts += _sboardLinkBadgeHTML(item);
    if(!parts) return '';
    return '<div class="sb-signal-row">'+parts+'</div>';
  }
  var _clusterOpenHeaderId = null;
  var _clusterReturnFn = null;
  var _clusterWide = false;
  // Positions a traveler has manually dragged a loose card to, this CLUSTER
  // session only — keyed by idea id. Not written to Supabase; this is a
  // reading/arranging aid, not committed data. Lets someone spread cards out
  // to read them, or nudge related ones near each other, without that being
  // mistaken for an actual cluster — dropping directly ONTO another card is
  // still the only thing that asks to name and commit a real bucket.
  // Every loose card's position on the starburst canvas, once computed —
  // whether it was the initial random scatter placement or a traveler's own
  // drag. Cached for the life of this CLUSTER session so a bucket action
  // (creating a bucket, sorting a card in, renaming) never reshuffles cards
  // that are already sitting somewhere. Only a card CLUSTER has never shown
  // before gets a fresh random placement; after that, it's remembered too.
  var _clusterCardPos = {};
  // Ids currently lasso-selected on the starburst, this session only.
  var _clusterSelected = {};
  var _sboardColorPalette = ['#d6eaf8','#d9f2e6','#fdf3d0','#f8d9e3','#e6d9f2','#fbe3d0','#d0f2ec','#f0ebe0'];
  var _sboardBoardBgPalette = [
    {n:'White', c:'#ffffff'},
    {n:'Cream', c:'#f5f1e8'},
    {n:'Cork', c:'#c9a876'},
    {n:'Sand', c:'#e3d5b8'},
    {n:'Sage', c:'#a8b89a'},
    {n:'Dark Green', c:'#1e4d3a'},
    {n:'Teal', c:'#0f6e56'},
    {n:'Sky', c:'#5b9bd5'},
    {n:'Dark Blue', c:'#16324f'},
    {n:'Navy', c:'#1a3a5c'},
    {n:'Slate', c:'#3d4a5c'},
    {n:'Purple', c:'#4a2f5e'},
    {n:'Plum', c:'#6b3a5e'},
    {n:'Rose', c:'#c98a9c'},
    {n:'Coral', c:'#d97b5f'},
    {n:'Mustard', c:'#d4a72c'},
    {n:'Charcoal', c:'#2c2c2a'},
    {n:'Black', c:'#000000'}
  ];
  function _sboardGetBoardBg(){
    try{ return localStorage.getItem('t2t_seaOfIdeas_boardBg')||''; }catch(e){ return ''; }
  }
  function _sboardGetRootPrompt(){
    try{ return localStorage.getItem('t2t_seaOfIdeas_rootPrompt')||'What do you want?'; }catch(e){ return 'What do you want?'; }
  }
  function _sboardSetRootPrompt(text){
    try{ localStorage.setItem('t2t_seaOfIdeas_rootPrompt', text||'What do you want?'); }catch(e){}
  }
  function openRootPromptEditor(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var cur=_sboardGetRootPrompt();
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div class="sb-card-title">Shape</div>'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Root prompt</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:8px">Shown when no Topic is selected yet.</div>'
      +'<textarea id="sb-rootprompt-box" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:10px;min-height:50px">'+cur+'</textarea>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-rootprompt-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-rootprompt-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-rootprompt-save', function(){
      var val=(document.getElementById('sb-rootprompt-box')||{}).value||'';
      _sboardSetRootPrompt(val.trim());
      closeSbDetail();
      _sboardUpdateHeaderChrome();
    });
    T().wire('sb-rootprompt-close', closeSbDetail);
  }
  function _sboardApplyBoardBg(){
    var c=_sboardGetBoardBg();
    var w=document.getElementById('sc-board-wrap');
    var areaEl=document.getElementById('sc-header-area');
    var clusterEl=document.getElementById('s-sea-of-ideas-cluster');
    var swEl=clusterEl?clusterEl.querySelector('.sw'):null;
    // One single color for the header band and the board — no more
    // separate purple (#3a2564) default just on the header, clashing with
    // whatever the board itself was showing. Larry, August 1 2026: "make
    // the header panel part of the storyboard color... drop the purple
    // band." Both default to navy together now; picking a custom
    // Storyboard background recolors both the same way, same as before.
    var bg=c||'#1a3a5c';
    if(w) w.style.background=bg;
    if(areaEl) areaEl.style.background=bg;
    if(clusterEl) clusterEl.style.background=c||'';
    if(swEl) swEl.style.background=c||'';
    // 9711 SESSION shares this same whole-screen background as of the
    // family-resemblance pass, July 18, 2026 — one color, either screen's
    // picker updates both. Was its own per-Topic Supabase-stored color
    // before this (see removed _isxLoadTopicColor in session.js).
    var isxBoard=document.getElementById('isx-board');
    var isxArea=document.getElementById('isx-header-area');
    if(isxBoard) isxBoard.style.background=bg;
    if(isxArea) isxArea.style.background=bg;
  }
  function _sboardSetBoardBg(c){
    try{ localStorage.setItem('t2t_seaOfIdeas_boardBg', c); }catch(e){}
    _sboardApplyBoardBg();
  }
  function openBoardBgPicker(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var swHTML=_sboardBoardBgPalette.map(function(p){
      return '<button class="sb-bg-swatch" data-c="'+p.c+'" title="'+p.n+'" style="width:36px;height:36px;border-radius:8px;background:'+p.c+';border:1.5px solid #cfe4f2;cursor:pointer;margin:3px"></button>';
    }).join('');
    var cur=_sboardGetBoardBg()||'#1a3a5c';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">Storyboard background</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">One color for the whole screen. Stays until you change it.</div>'
      +'<div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'+swHTML+'</div>'
      +'<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">'
      +'<label for="sb-bg-custom" style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Custom:</label>'
      +'<input type="color" id="sb-bg-custom" value="'+cur+'" style="width:44px;height:36px;border:1.5px solid #cfe4f2;border-radius:8px;padding:0;cursor:pointer">'
      +'</div>'
      +'<button class="sc-ov-btn" id="sb-bg-close" aria-label="Close">✕</button>'
      +'</div>';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-bg-swatch'), function(btn){
      btn.addEventListener('click', function(){ _sboardSetBoardBg(btn.getAttribute('data-c')); closeSbDetail(); });
    });
    var customInput=document.getElementById('sb-bg-custom');
    if(customInput) customInput.addEventListener('input', function(){ _sboardSetBoardBg(customInput.value); });
    T().wire('sb-bg-close', closeSbDetail);
  }

  function _sboardTopAncestor(h, headerRows){
    var cur=h, guard=0;
    while(cur.cluster_id && guard<20){
      var parent=headerRows.find(function(x){ return String(x.id)===String(cur.cluster_id); });
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur.id;
  }
  // PROJECT is the fixed root anchor above Parent/Topic — never changes as a
  // traveler drags/drills deeper. Walks the same cluster_id chain
  // _sboardTopAncestor already walks for headerRows, but off the full
  // _sboardAllRowsById map so it works for any row (idea or header), not
  // just header rows. Added July 12, 2026.
  function _sboardProjectRowFor(row){
    var cur=row, guard=0;
    while(cur && cur.cluster_id && guard<25){
      var parent=_sboardAllRowsById[cur.cluster_id];
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur;
  }

  // Board Type / switching between separate trees, Aug 13 2026 -- Larry:
  // "What do you want?" was never a real project, just placeholder text
  // for the empty state -- every root-level header (cluster_id null) is
  // already its own independent tree in the data (self-scoped: its
  // project_id and topic_scope_id both point at its own id), because a
  // traveler can be mid-flight on several completely separate boards
  // (different projects, companies, clients, or their own personal one).
  // This section gives that already-real structure an actual front
  // door: a Type picker that switches which of your root trees you're
  // looking at, matching Briefing Board's Type exactly, including the
  // same "(+) Add a type..." open-ended pattern. Parent/child (Fractal
  // Casting) is a completely separate, independent thing -- it only
  // ever comes from a HEADER being delegated into its own Topic, at any
  // depth, inside whichever board this is.
  // Expanded Aug 15 2026 to the fuller starter set from the
  // Organization design conversation, matching the Briefing Board's
  // own BB_BOARD_TYPES exactly -- Project dropped from the seeded list
  // (it's its own PROJECT eyebrow now, not a Type), but any root
  // already using 'project' keeps working -- _sboardExtraBoardTypes
  // always re-adds whatever's actually in use, seeded or not.
  var IB_BOARD_TYPES = [
    {value:'organization', label:'Organization'},
    {value:'company', label:'Company'},
    {value:'departmental', label:'Department'},
    {value:'client', label:'Client'},
    {value:'partner', label:'Partner'},
    {value:'supplier', label:'Supplier'},
    {value:'customer', label:'Customer'},
    {value:'personal', label:'Personal'}
  ];
  // Hidden presets, Aug 15 2026 -- mirrors the Briefing Board's own
  // _bbHiddenTypesCache/org_type_hidden exactly (same table, shared
  // per traveler across both boards).
  var _sboardHiddenTypesCache = [];
  var _sboardHiddenTypesLoaded = false;
  // Reserved/nested names, Aug 13 2026 -- Larry: NEW, MISC and Trash are
  // consistent bucket elements every board gets, not boards themselves;
  // Purpose and Idea Session Protocol are real headers that live nested
  // inside a board, not independent boards either. None of the five
  // should ever show up as a Type/Title picker option, no matter whose
  // account they're under -- exact-name match, case-insensitive.
  var IB_RESERVED_ROOT_NAMES = {'new':1,'misc':1,'trash':1,'purpose':1,'idea session protocol':1};
  function _sboardIsRealBoard(r){
    var name=String((r&&r.text_content)||'').trim().toLowerCase();
    return !IB_RESERVED_ROOT_NAMES[name];
  }
  var _sboardMyRoots = null;
  var _sboardMyRootsLoadedFor = null;
  // Adoption edges, Aug 16 2026 -- board unification work. Loaded
  // alongside _sboardMyRoots so the Project picker can fold a
  // board's adopted children in, same as the Briefing Board's
  // _bbRelationsCache/_bbChildBoardsOf. Keyed on briefing_boards ids,
  // not ideas ids -- see ideas.briefing_board_id.
  var _sboardRelationsCache = [];
  // Empty-Type browsing, Aug 16 2026 -- mirrors the Briefing
  // Board's _bbPendingTypeOverride exactly. Set when a Type with
  // zero roots is picked, so Type/Org Name/Project can all still
  // show as dropdowns instead of an immediate prompt(). Reset the
  // moment a real root opens (_sboardSwitchToRootBoard).
  var _sboardPendingTypeOverride = null;

  async function _sboardLoadMyRoots(force){
    var _sb=T().sb; if(!_sb) return _sboardMyRoots||[];
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) return _sboardMyRoots||[];
    if(!force && _sboardMyRoots && _sboardMyRootsLoadedFor===user.id) return _sboardMyRoots;
    try{
      // content_type='header' added Aug 13 2026 (Larry: "the Mike Vance
      // video as boards... they are not boards") -- this query only
      // checked cluster_id IS NULL, so any orphaned non-header row (a
      // stray image, link, or blank test card with no parent) also
      // qualified as a "root" and showed up in Type/Title as if it were
      // a real board. Only real headers are boards.
      var res=await _sb.from('ideas').select('id,text_content,board_type,org_name,created_at,briefing_board_id').eq('user_id',user.id).eq('content_type','header').is('cluster_id',null).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _sboardMyRoots=(res.data||[]).filter(_sboardIsRealBoard).map(function(r){ return {id:r.id, text_content:r.text_content, board_type:r.board_type||'personal', org_name:r.org_name||'', created_at:r.created_at, briefing_board_id:r.briefing_board_id||null}; });
      _sboardMyRootsLoadedFor=user.id;
      // Aug 16 2026 -- same source of truth the Briefing Board reads
      // (board_relations, RLS-scoped to boards this traveler owns),
      // so an adoption made on one screen shows on both.
      try{
        var relRes=await _sb.from('board_relations').select('*').eq('status','approved');
        _sboardRelationsCache=relRes.error?[]:(relRes.data||[]);
      }catch(e){ _sboardRelationsCache=[]; console.warn('Idea Board: could not load board relations', e); }
    }catch(e){ console.warn('Idea Board: could not load your boards', e); _sboardMyRoots=_sboardMyRoots||[]; }
    return _sboardMyRoots;
  }

  function _sboardExtraBoardTypes(roots){
    var fixed={}; IB_BOARD_TYPES.forEach(function(t){ fixed[t.value]=true; });
    var seen={}, extra=[];
    (roots||[]).forEach(function(r){
      var v=r.board_type||'personal';
      if(!fixed[v] && !seen[v]){ seen[v]=true; extra.push(v); }
    });
    return extra;
  }

  function _sboardTypeLabel(value){
    var hit=IB_BOARD_TYPES.filter(function(t){ return t.value===value; })[0];
    if(hit) return hit.label;
    return String(value||'').replace(/(^|[_\s]+)([a-z])/g, function(m,p1,p2){ return (p1?' ':'')+p2.toUpperCase(); }).trim();
  }

  async function _sboardEnsureHiddenTypesLoaded(){
    if(_sboardHiddenTypesLoaded) return;
    _sboardHiddenTypesLoaded=true;
    var _sb=T().sb; if(!_sb) return;
    try{
      var user=(await _sb.auth.getUser()).data.user; if(!user) return;
      var res=await _sb.from('org_type_hidden').select('value').eq('user_id',user.id);
      if(res.error) throw res.error;
      _sboardHiddenTypesCache=(res.data||[]).map(function(r){ return r.value; });
    }catch(e){ console.error('Idea Board: could not load hidden Types', e); }
  }
  // Fixed Types minus whatever's hidden -- a value still in use by one
  // of the traveler's own root boards always shows regardless (see
  // Briefing Board's own _bbVisibleFixedTypes for the same rule).
  function _sboardVisibleFixedTypes(roots){
    var hidden={}; (_sboardHiddenTypesCache||[]).forEach(function(v){ hidden[v]=true; });
    var inUse={}; (roots||[]).forEach(function(r){ inUse[(r.board_type||'personal')]=true; });
    return IB_BOARD_TYPES.filter(function(t){ return !hidden[t.value] || inUse[t.value]; });
  }
  async function _sboardHideType(value){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user; if(!user || !value) return;
    if(_sboardHiddenTypesCache.indexOf(value)===-1) _sboardHiddenTypesCache.push(value);
    try{
      var ins=await _sb.from('org_type_hidden').upsert({user_id:user.id, value:value});
      if(ins.error) console.error('Idea Board: could not hide Type', ins.error);
    }catch(e){ console.error('Idea Board: could not hide Type', e); }
    _sboardRenderTypePicker();
    _sboardRenderOrgName();
  }

  // Switches straight to a different root tree -- same shape as
  // _sboardDrillInto/_sboardGoUpOneLevel below, just targeting a root id
  // directly instead of climbing from the current position. Persists via
  // the root's own id (a root is always its own project_id per the
  // self-scoping pattern above), not _sboardPersistLastTopic's row
  // lookup, since a freshly created or just-loaded root may not be warm
  // in _sboardAllRowsById yet.
  function _sboardSwitchToRootBoard(rootId){
    _sboardPendingTypeOverride=null;
    T2TShared.currentTopicId=rootId;
    T2TShared.filter=rootId;
    try{
      if(window.T2TData && window.T2TData.setLastInputTopic) window.T2TData.setLastInputTopic(rootId, rootId);
      if(window.T2TMedia && window.T2TMedia.rememberProject) window.T2TMedia.rememberProject(rootId);
    }catch(e){}
    _sboardSpinWhile(renderSeaBoard());
  }

  async function _sboardCreateRootBoard(name, boardType){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user){
      window.alert('Could not add a board: your sign-in session appears to have expired. Please refresh the page and sign in again, then try adding the board.');
      return null;
    }
    try{
      var ins=await _sb.from('ideas').insert({user_id:user.id, content_type:'header', text_content:name, cluster_id:null, board_type:boardType||'personal', created_at:new Date().toISOString(), color:T().getDefaultHeaderColor?T().getDefaultHeaderColor():null}).select().single();
      if(ins.error || !ins.data){
        console.error('Idea Board: could not create board', ins.error);
        window.alert('Could not add the board "'+name+'". Error: '+(ins.error&&ins.error.message?ins.error.message:'unknown error')+'. Nothing was saved -- please try again or refresh the page.');
        return null;
      }
      // Self-scoping, matching every existing root: a root's own
      // project_id and topic_scope_id both point at its own id.
      await _sb.from('ideas').update({project_id:ins.data.id, topic_scope_id:ins.data.id}).eq('id',ins.data.id);
      // Aug 16 2026 -- mirror onto the Briefing Board the moment a board
      // is created here too, linked by briefing_board_id, so ownership/
      // PROJECT/adoption always resolve from one shared record no
      // matter which screen created the board. Best-effort, matching
      // the Briefing Board's own mirror in _bbCreateBoard.
      try{
        var bbIns=await _sb.from('briefing_boards').insert({user_id:user.id, board_type:boardType||'personal', name:name}).select().single();
        if(!bbIns.error && bbIns.data){
          await _sb.from('ideas').update({briefing_board_id:bbIns.data.id}).eq('id',ins.data.id);
        } else {
          console.warn('Idea Board: could not mirror new board onto the Briefing Board', bbIns.error);
        }
      }catch(e){ console.warn('Idea Board: could not mirror new board onto the Briefing Board', e); }
      await _sboardLoadMyRoots(true);
      return ins.data.id;
    }catch(e){
      console.error('Idea Board: could not create board', e);
      window.alert('Could not add the board "'+name+'". Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again or refresh the page.');
      return null;
    }
  }

  // Aug 13 2026, Larry: TYPE reverting to Personal after picking Project
  // was this function reading the <select>'s own DOM value right after
  // that same select's innerHTML got rebuilt (which resets a <select> to
  // its first option before the real value gets reapplied) -- a stale
  // read racing its own render, not a real conflict with the old PROJECT
  // field. Fixed by deriving straight from the real current board's own
  // board_type (same approach Briefing Board's _bbActiveBoardType/
  // _bbRenderTypePicker already used correctly), no DOM value in the loop.
  // Org context, Aug 16 2026 -- mirrors the Briefing Board's
  // _bbOrgContextBoard exactly (same bug, same fix, same day): a
  // project's own Type/org_name were never really its own, they
  // belong to whichever board it's an adopted project OF. Returns the
  // root itself if it has no approved parent; otherwise the parent's
  // own root row, resolved through briefing_board_id since that's
  // what board_relations actually links on, not the ideas id.
  function _sboardOrgContextRoot(rootId){
    var roots=_sboardMyRoots||[];
    var root=roots.filter(function(r){ return String(r.id)===String(rootId); })[0];
    if(!root) return null;
    if(!root.briefing_board_id) return root;
    var parentRel=_sboardRelationsCache.filter(function(r){ return r.child_board_id===root.briefing_board_id; })[0];
    if(!parentRel) return root;
    var parentRoot=roots.filter(function(r){ return r.briefing_board_id===parentRel.parent_board_id; })[0];
    return parentRoot || root;
  }

  function _sboardActiveBoardType(){
    if(_sboardPendingTypeOverride) return _sboardPendingTypeOverride;
    var curRoot=_sboardCurrentRootRow();
    var match=curRoot?_sboardOrgContextRoot(curRoot.id):null;
    return (match && match.board_type) || 'personal';
  }

  // Root of whatever's currently on screen -- climbs cluster_id from the
  // live in-memory map when warm, falls back to T2TData.ancestorChain
  // (already used elsewhere in this file for the same cold-cache case)
  // so this works right after a page load/reload too.
  function _sboardCurrentRootRow(){
    if(!T2TShared.currentTopicId) return null;
    var row=_sboardAllRowsById[T2TShared.currentTopicId];
    if(row) return _sboardProjectRowFor(row);
    return null;
  }

  // Custom dropdown, Aug 13 2026 -- Larry: "the (+) should be at the
  // bottom of each dropdown list, not to the side" AND "the + in a
  // dotted line circle just like every other add." A native <select>
  // can only show plain text options -- there's no way to make one row
  // render as a real dashed circle. So Type and Title are no longer
  // native <select> elements: each is a small trigger button that opens
  // a real, CSS-built menu, and that menu's own last row is the literal
  // dashed-circle (+), same shape as the header/subber add tiles.
  // Shared by both Type and Title below; closeAll() also lives here so
  // opening one closes the other, and a page click anywhere closes both.
  function _sboardCloseAllDropdowns(exceptMenuId){
    ['sc-type-menu','sc-org-name-menu','sc-title-menu','sc-view-menu','sb-people-menu','bb-people-menu'].forEach(function(id){
      if(id===exceptMenuId) return;
      var m=document.getElementById(id);
      if(m) m.hidden=true;
    });
  }
  document.addEventListener('click', function(){ _sboardCloseAllDropdowns(null); });

  function _sboardRenderDropdown(triggerId, menuId, options, currentValue, onSelect, onAdd, addTitle, onRemove, removeTitle){
    var trigger=document.getElementById(triggerId), menu=document.getElementById(menuId);
    if(!trigger || !menu) return;
    var current=options.filter(function(o){ return String(o.value)===String(currentValue); })[0];
    trigger.textContent = current ? current.label : (options[0] ? options[0].label : '—');
    menu.innerHTML='';
    options.forEach(function(o){
      var row=document.createElement('div');
      row.className='sc-cdrop-row'+(current && String(current.value)===String(o.value) ? ' active' : '');
      row.textContent=o.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onSelect(o.value);
      });
      menu.appendChild(row);
    });
    var addRow=document.createElement('div');
    addRow.className='sc-cdrop-addrow';
    var addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='sc-dotted-add-btn';
    addBtn.title=addTitle||'Add';
    addBtn.textContent='+';
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      menu.hidden=true;
      onAdd();
    });
    addRow.appendChild(addBtn);
    if(onRemove){
      var removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='sc-dotted-add-btn sc-dotted-remove-btn';
      removeBtn.title=removeTitle||'Remove';
      removeBtn.textContent='\u2212';
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onRemove();
      });
      addRow.appendChild(removeBtn);
    }
    menu.appendChild(addRow);
    // Moved to <body> so position:fixed has nothing above it in the DOM
    // that could re-trap it in a low stacking context -- see the
    // .sc-cdrop-menu CSS note above. Idempotent: harmless if already there.
    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?menuId:null);
      if(willOpen){
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(120,r.width)+'px';
        menu.hidden=false;
        // Clamp to the viewport's right edge for longer Title names.
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
  }

  // ORGANIZATION, Aug 15 2026, corrected again -- mirrors the
  // Briefing Board's own fix exactly: the eyebrow WORD ITSELF is the
  // dropdown (clicking "ORGANIZATION" opens the category menu, and the
  // word then becomes whatever category was chosen -- e.g.
  // "DEPARTMENT"). The field below is a separate, plain name for that
  // category (e.g. "Accounting"), no longer combined into one button.
  // sc-type-trigger/sc-type-menu now live on the eyebrow button itself
  // (_sboardRenderTypePicker, unchanged) -- this function only handles
  // the plain Name box underneath.
  // Org Name, Aug 16 2026 -- same fix as the Briefing Board, same day:
  // Type/Title/View all open as a real dropdown, Org Name alone jumped
  // straight to a prompt(). Rebuilt on _sboardRenderDropdown like the
  // other three -- lists other names already used on roots of this
  // same Type, (+) still opens the rename prompt, (-) clears the name.
  function _sboardOrgNameOptions(boardType){
    var seen={}, opts=[];
    (_sboardMyRoots||[]).forEach(function(r){
      if((r.board_type||'personal')!==boardType) return;
      var n=(r.org_name||'').trim();
      if(!n || seen[n]) return;
      seen[n]=true; opts.push({value:n, label:n});
    });
    return opts;
  }
  function _sboardRenderOrgName(){
    var trigger=document.getElementById('sc-org-name-trigger');
    if(_sboardPendingTypeOverride){
      // Browsing an empty Type, Aug 16 2026 -- no real root exists to
      // attach a name to, so (+) has to create the first root of this
      // Type rather than just save a field on one.
      var typeVal=_sboardPendingTypeOverride;
      var opts0=_sboardOrgNameOptions(typeVal);
      _sboardRenderDropdown('sc-org-name-trigger','sc-org-name-menu', opts0, null, function(){ /* nothing to select onto yet */ }, async function(){
        var typeLabel0=_sboardTypeLabel(typeVal);
        var name0=window.prompt('Name for this '+typeLabel0+' (e.g. "Accounting" or "Denver Broncos"):', '');
        if(!name0 || !name0.trim()) return;
        var trimmed0=name0.trim();
        var newId=await _sboardCreateRootBoard(trimmed0, typeVal);
        if(newId){
          _sboardSwitchToRootBoard(newId);
          var created=(_sboardMyRoots||[]).filter(function(r){ return r.id===newId; })[0];
          if(created) await _sboardSaveOrgName(trimmed0, created);
        }
      }, 'Add a name', function(){
        // (-) while browsing an empty Type, Aug 16 2026 -- same fix as
        // the Briefing Board, same day: both (+) and (-) always show.
        // Nothing to delete yet, so this backs out of the browse.
        _sboardPendingTypeOverride=null;
        _sboardRenderTypePicker();
        _sboardRenderOrgName();
        _sboardRenderTitlePicker();
      }, 'Stop browsing this Type');
      if(trigger) trigger.textContent='Add a name';
      return;
    }
    var curRoot=_sboardCurrentRootRow();
    var match=curRoot?_sboardOrgContextRoot(curRoot.id):null;
    if(!match) return;
    var current=(match.org_name||'').trim();
    var opts=_sboardOrgNameOptions(match.board_type||'personal');
    _sboardRenderDropdown('sc-org-name-trigger','sc-org-name-menu', opts, current||null, function(newName){
      _sboardSaveOrgName(newName, match);
    }, async function(){
      var typeLabel=_sboardTypeLabel(match.board_type||'personal');
      var name=window.prompt('Name for this '+typeLabel+' (e.g. "Accounting" or "Denver Broncos"):', match.org_name||'');
      if(name===null) return;
      await _sboardSaveOrgName(name, match);
      _sboardRenderOrgName();
    }, 'Add a name', current ? function(){
      _sboardSaveOrgName('', match);
    } : null, 'Remove this name');
    if(trigger && !current) trigger.textContent='Add a name';
  }
  async function _sboardSaveOrgName(value, rootOverride){
    var curRoot=_sboardCurrentRootRow();
    var match=rootOverride || (curRoot?_sboardOrgContextRoot(curRoot.id):null);
    if(!match) return;
    var trimmed=(value||'').trim();
    if((match.org_name||'')===trimmed) return;
    match.org_name=trimmed;
    _sboardRenderOrgName();
    var _sb=T().sb;
    try{
      var upd=await _sb.from('ideas').update({org_name:trimmed||null}).eq('id', match.id);
      if(upd.error) console.error('Idea Board: could not save Organization name', upd.error);
    }catch(e){ console.error('Idea Board: could not save Organization name', e); }
  }

  function _sboardRenderTypePicker(){
    var roots=_sboardMyRoots;
    if(!roots){
      _sboardLoadMyRoots().then(function(){ _sboardRenderTypePicker(); _sboardRenderOrgName(); _sboardRenderTitlePicker(); });
      roots=[];
    }
    var extra=_sboardExtraBoardTypes(roots);
    var opts=_sboardVisibleFixedTypes(roots).concat(extra.map(function(v){ return {value:v, label:_sboardTypeLabel(v)}; }));
    var activeType=_sboardActiveBoardType();
    _sboardRenderDropdown('sc-type-trigger','sc-type-menu', opts, activeType, async function(newType){
      var rts=await _sboardLoadMyRoots();
      var matching=rts.filter(function(r){ return (r.board_type||'personal')===newType; });
      if(matching.length){
        _sboardPendingTypeOverride=null;
        _sboardSwitchToRootBoard(matching[0].id);
      } else {
        // Aug 16 2026 -- same fix as the Briefing Board, same day: an
        // empty Type browses the same as a full one, dropdown and all.
        _sboardPendingTypeOverride=newType;
        _sboardRenderTypePicker();
        _sboardRenderOrgName();
        _sboardRenderTitlePicker();
      }
    }, async function(){
      var typeName=window.prompt('Name for the new Type (e.g. "Client", "Household"):');
      if(!typeName || !typeName.trim()) return;
      var typeValue=typeName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || ('type_'+Date.now());
      var firstBoardName=window.prompt('Name for the first '+typeName.trim()+' board:');
      if(!firstBoardName || !firstBoardName.trim()) return;
      var newId=await _sboardCreateRootBoard(firstBoardName.trim(), typeValue);
      if(newId) _sboardSwitchToRootBoard(newId);
    }, 'Add a type', function(){
      // Remove, Aug 15 2026 -- mirrors the Briefing Board's own
      // _bbHideType exactly (same shared org_type_hidden table).
      var removable=_sboardVisibleFixedTypes(roots).filter(function(t){ return t.value!==activeType; });
      if(!removable.length){ window.alert('Nothing left to remove.'); return; }
      var listText=removable.map(function(t){ return t.label; }).join(', ');
      var typeName=window.prompt('Which Type would you like to remove from the list? ('+listText+')\n\nAny board already using it keeps working either way.');
      if(!typeName || !typeName.trim()) return;
      var hit=removable.filter(function(t){ return t.label.toLowerCase()===typeName.trim().toLowerCase(); })[0];
      if(!hit){ window.alert('Didn\'t recognize "'+typeName.trim()+'" -- type the name exactly as shown.'); return; }
      _sboardHideType(hit.value);
    }, 'Remove a type');
  }

  // TITLE picker, Aug 13 2026 -- Larry: "the next field is TITLE." Lists
  // this traveler's real boards (headers already filtered through
  // _sboardIsRealBoard, so NEW/MISC/Trash/Purpose/Idea Session Protocol
  // never show up here) scoped to whichever Type is currently selected --
  // same relationship Briefing Board's Title/Type pair already has.
  // Adopted children of a given board (Aug 16 2026), resolved through
  // briefing_board_id -- mirrors the Briefing Board's _bbChildBoardsOf.
  // A child not yet linked (no briefing_board_id set, e.g. an older
  // board from before this pass) is silently skipped rather than
  // shown as broken; run the link backfill instead of guessing here.
  function _sboardChildBoardsOf(briefingBoardId){
    if(!briefingBoardId) return [];
    var childBBIds=_sboardRelationsCache.filter(function(r){ return r.parent_board_id===briefingBoardId; }).map(function(r){ return r.child_board_id; });
    return (_sboardMyRoots||[]).filter(function(r){ return r.briefing_board_id && childBBIds.indexOf(r.briefing_board_id)!==-1; });
  }

  function _sboardRenderTitlePicker(){
    var roots=_sboardMyRoots;
    if(!roots){
      _sboardLoadMyRoots().then(function(){ _sboardRenderTitlePicker(); });
      roots=[];
    }
    var activeType=_sboardActiveBoardType();
    var curRoot=_sboardCurrentRootRow();
    var filtered=roots.filter(function(r){ return (r.board_type||'personal')===activeType; });
    // Adopted children ride along too, Aug 16 2026 -- Larry: PROJECT must
    // be identical no matter which screen a board is opened from. Same
    // dedup-by-id as the Briefing Board's matching fix. Resolved off the
    // org-context root (later same day), not the literally-open one, so
    // opening a project shows the same family list as opening its parent.
    // Skipped while browsing an empty Type (_sboardPendingTypeOverride) --
    // there's no real context root yet.
    if(!_sboardPendingTypeOverride){
      var contextRoot=curRoot?_sboardOrgContextRoot(curRoot.id):null;
      var children=_sboardChildBoardsOf(contextRoot&&contextRoot.briefing_board_id);
      children.forEach(function(c){ if(!filtered.some(function(r){ return r.id===c.id; })) filtered=filtered.concat([c]); });
    }
    var opts=filtered.map(function(r){ return {value:r.id, label:r.text_content||'(untitled)'}; });
    // (-) on the PROJECT field, Aug 16 2026 -- mirrors the Briefing
    // Board's own hub exactly (Larry: "3 choices even if they do not
    // all work yet"). Only offered when a real, currently-open root is
    // actually showing in this list -- not while browsing an empty
    // Type.
    var canRemoveRoot=!_sboardPendingTypeOverride && curRoot && filtered.some(function(r){ return r.id===curRoot.id; });
    _sboardRenderDropdown('sc-title-trigger','sc-title-menu', opts, curRoot?curRoot.id:null, function(id){
      _sboardSwitchToRootBoard(id);
    }, async function(){
      var typeLabel=_sboardTypeLabel(_sboardActiveBoardType());
      var name=window.prompt('Name for the new '+typeLabel+' board:');
      if(!name || !name.trim()) return;
      var newId=await _sboardCreateRootBoard(name.trim(), _sboardActiveBoardType());
      if(newId) _sboardSwitchToRootBoard(newId);
    }, 'Add a board', canRemoveRoot ? function(){
      openSbProjectHub(curRoot.id);
    } : null, 'Remove this project');
  }

  // Project Hub, Aug 16 2026 -- Storyboard mirror of the Briefing
  // Board's own hub. Reuses the shared one-off popup shell
  // (#sb-detail-overlay/closeSbDetail) rather than a dedicated overlay,
  // matching how every other small Storyboard dialog is built. Move
  // detaches this project from its current parent via
  // detach_board_relation (same RPC, same shared board_relations data
  // as the Briefing Board) -- but the Storyboard doesn't have its own
  // Relationships manager to pick a *new* parent yet, so Move hands
  // that step off to the Briefing Board's existing 🔗 Relationships
  // button rather than duplicating that whole request/approve UI here.
  // Archive/Trash are stubs, same as the Briefing Board's.
  async function _sboardReloadRelationsCache(){
    var sb=T().sb; if(!sb) return;
    try{
      var relRes=await sb.from('board_relations').select('*').eq('status','approved');
      _sboardRelationsCache=relRes.error?_sboardRelationsCache:(relRes.data||[]);
    }catch(e){ console.warn('Idea Board: could not reload board relations', e); }
  }
  function openSbProjectHub(rootId){
    var root=(_sboardMyRoots||[]).filter(function(r){ return r.id===rootId; })[0];
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">Remove Project</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">'+_sboardEsc(root?(root.text_content||'This project'):'This project')+'</div>'
      +'<button class="sc-ov-btn" id="sb-hub-move-btn" style="width:100%;margin-bottom:8px;padding:10px">🔀 Move to another parent</button>'
      +'<button class="sc-ov-btn" id="sb-hub-archive-btn" style="width:100%;margin-bottom:8px;padding:10px">📁 Archive this project</button>'
      +'<button class="sc-ov-btn" id="sb-hub-trash-btn" style="width:100%;margin-bottom:8px;padding:10px">🗑️ Trash this project</button>'
      +'<div id="sb-hub-msg" style="font-size:calc(10px * var(--fg-text-scale,1));color:#5b9bd5;margin-bottom:8px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-hub-close" style="width:100%">Close</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-hub-close', closeSbDetail);
    T().wire('sb-hub-move-btn', async function(){
      var msg=document.getElementById('sb-hub-msg');
      var bbId=root&&root.briefing_board_id;
      var parentRel=bbId?_sboardRelationsCache.filter(function(r){ return r.child_board_id===bbId; })[0]:null;
      if(parentRel){
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('detach_board_relation', {p_relation_id: parentRel.id});
          if(res.error){ if(msg) msg.textContent=res.error.message||'Could not detach from the current parent.'; return; }
        }catch(e){ console.warn('Idea Board: could not detach board relation', e); if(msg) msg.textContent='Could not detach from the current parent.'; return; }
        await _sboardReloadRelationsCache();
        _sboardRenderTitlePicker();
        _sboardRenderOrgName();
      }
      if(msg) msg.textContent='Detached. Open the Briefing Board\'s 🔗 Relationships button to pick a new parent for this project.';
    });
    T().wire('sb-hub-archive-btn', function(){
      var msg=document.getElementById('sb-hub-msg');
      if(msg) msg.textContent='Archiving a whole project isn\'t built yet -- for now you can archive individual cards inside it.';
    });
    T().wire('sb-hub-trash-btn', function(){
      var msg=document.getElementById('sb-hub-msg');
      if(msg) msg.textContent='Trashing a whole project isn\'t built yet -- for now you can trash individual cards inside it.';
    });
  }

  // VIEW-by-person filter (Aug 9 2026, Larry): the board-level counterpart
  // to Person Assigned above -- same roster source (_tmAllRosterRows), same
  // "real Cast roster, not free text" rule the Briefing Board's own VIEW
  // dropdown follows (Session 198). Purely a display filter: narrows which
  // idea/text/image/link cards render, never touches sort_order or what's
  // saved, and never hides headers/Subbers (they're navigation scaffolding,
  // not person-filterable content). Only re-fetches the roster when the
  // project actually changes (_sboardViewFilterProjectId), not on every
  // render, to avoid re-querying on every drag/reorder.
  function _sboardFilterByPerson(items){
    if(!_sboardPersonFilterId) return items;
    // Session 234: matches the same starred primary doer the corner badge
    // shows (see _sboardCardPrimaryUid) instead of the old, now-removed
    // Person Assigned field directly -- falls back to a card's legacy
    // assigned_user_id only if nobody's been starred on it yet.
    return items.filter(function(r){ return String(_sboardCardPrimaryUid(r))===String(_sboardPersonFilterId); });
  }

  async function _sboardViewConfirmAddMember(projectRow, email){
    var input=document.getElementById('sc-view-add-email');
    var errEl=document.getElementById('sc-view-add-error');
    var sugg=document.getElementById('sc-view-add-suggest');
    if(!email) return;
    var res=await _tmAddMember(projectRow, email);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    if(input) input.value='';
    if(sugg) sugg.style.display='none';
    await _tmLoadRoster(projectRow);
    _sboardRenderPersonFilterPicker(projectRow);
  }

  function _sboardRenderPersonFilterPicker(projectRow){
    var trigger=document.getElementById('sc-view-trigger'), menu=document.getElementById('sc-view-menu');
    if(!trigger || !menu || !projectRow) return;
    var rows=_tmAllRosterRows(projectRow);
    var cur=_sboardPersonFilterId||'';
    var stillPresent=!cur;
    rows.forEach(function(m){ if(String(m.user_id)===String(cur)) stillPresent=true; });
    if(cur && !stillPresent){ _sboardPersonFilterId=null; cur=''; }
    var curRow = cur ? rows.filter(function(m){ return String(m.user_id)===String(cur); })[0] : null;
    trigger.textContent = curRow ? (curRow.name||curRow.email||'') : 'Team';

    menu.innerHTML='';
    var teamRow=document.createElement('div');
    teamRow.className='sc-cdrop-row'+(!cur?' active':'');
    teamRow.textContent='Team';
    teamRow.addEventListener('click', function(e){
      e.stopPropagation(); menu.hidden=true;
      _sboardPersonFilterId=null; renderSeaBoard(true);
    });
    menu.appendChild(teamRow);

    rows.forEach(function(m){
      var row=document.createElement('div');
      row.className='sc-cdrop-row sc-view-row'+(String(m.user_id)===String(cur)?' active':'');
      var nameSpan=document.createElement('span');
      nameSpan.className='sc-view-row-name';
      nameSpan.textContent=m.name||m.email||'';
      var roleSpan=document.createElement('span');
      roleSpan.className='sc-view-row-role';
      roleSpan.textContent=_tmRoleTitle(m);
      row.appendChild(nameSpan); row.appendChild(roleSpan);
      row.addEventListener('click', function(e){
        e.stopPropagation(); menu.hidden=true;
        _sboardPersonFilterId=m.user_id; renderSeaBoard(true);
      });
      menu.appendChild(row);
    });

    if(_tmRosterCanManage){
      var addRow=document.createElement('div');
      addRow.className='sc-cdrop-addrow';
      var addBtn=document.createElement('button');
      addBtn.type='button'; addBtn.className='sc-dotted-add-btn';
      addBtn.title='Add a Cast Member'; addBtn.textContent='+';
      addRow.appendChild(addBtn);
      // (-) Remove a Cast Member, Aug 16 2026 (Larry): the mirror of
      // (+), same pattern as the Briefing Board's own VIEW dropdown --
      // pick someone off this project's roster (never the Owner) and
      // take them off the team.
      var removeBtn=document.createElement('button');
      removeBtn.type='button'; removeBtn.className='sc-dotted-add-btn sc-dotted-remove-btn';
      removeBtn.title='Remove a Cast Member'; removeBtn.textContent='−';
      addRow.appendChild(removeBtn);
      var addForm=document.createElement('div');
      addForm.className='sc-view-addform'; addForm.style.display='none';
      addForm.innerHTML='<input type="text" id="sc-view-add-email" placeholder="Type a name or email..." autocomplete="off">'
        +'<div class="tm-add-suggest" id="sc-view-add-suggest" style="display:none"></div>'
        +'<button type="button" class="sc-ov-btn save sc-view-add-confirm" id="sc-view-add-confirm">Add</button>'
        +'<div id="sc-view-add-error" class="sc-view-add-error" style="display:none"></div>';
      addForm.addEventListener('click', function(e){ e.stopPropagation(); });
      addBtn.addEventListener('click', function(e){
        e.stopPropagation();
        removeForm.style.display='none';
        var opening=addForm.style.display==='none';
        addForm.style.display=opening?'block':'none';
        if(opening){ _tmFetchAllMembers().then(function(){ _tmRenderMemberSuggestions(projectRow, '', 'sc-view-add-suggest'); }); }
      });
      var addInput=addForm.querySelector('#sc-view-add-email');
      addInput.addEventListener('input', function(){ _tmRenderMemberSuggestions(projectRow, addInput.value, 'sc-view-add-suggest'); });
      addInput.addEventListener('focus', function(){ _tmRenderMemberSuggestions(projectRow, addInput.value, 'sc-view-add-suggest'); });
      addInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); _sboardViewConfirmAddMember(projectRow, addInput.value.trim()); } });
      var addSugg=addForm.querySelector('#sc-view-add-suggest');
      addSugg.addEventListener('click', function(e){
        var r=e.target.closest('.tm-add-suggest-row'); if(!r) return;
        _sboardViewConfirmAddMember(projectRow, r.getAttribute('data-email'));
      });
      var addConfirmBtn=addForm.querySelector('#sc-view-add-confirm');
      addConfirmBtn.addEventListener('click', function(){ _sboardViewConfirmAddMember(projectRow, addInput.value.trim()); });

      var removable=rows.filter(function(m){ return !m.isOwner; });
      var removeForm=document.createElement('div');
      removeForm.className='sc-view-addform sc-view-removeform'; removeForm.style.display='none';
      if(!removable.length){
        removeForm.innerHTML='<div class="sc-view-remove-empty">No one to remove yet.</div>';
      } else {
        removeForm.innerHTML=removable.map(function(m){
          return '<div class="sc-view-remove-row" data-uid="'+_esc9710(m.user_id)+'">'
            +'<span>'+_esc9710(m.name||m.email||'')+'</span>'
            +'<button type="button" class="sc-ov-btn save sc-view-remove-confirm" data-uid="'+_esc9710(m.user_id)+'" style="background:#a3372b;border-color:#a3372b;flex:0 0 auto;padding:3px 8px">Remove</button>'
          +'</div>';
        }).join('')+'<div id="sc-view-remove-error" class="sc-view-add-error" style="display:none"></div>';
      }
      removeForm.addEventListener('click', function(e){
        e.stopPropagation();
        var btn=e.target.closest('.sc-view-remove-confirm'); if(!btn) return;
        var uid=btn.getAttribute('data-uid');
        var row=btn.closest('.sc-view-remove-row');
        var name=row ? row.querySelector('span').textContent : 'this person';
        if(!window.confirm('Remove '+name+' from this Cast?')) return;
        _sboardViewConfirmRemoveMember(projectRow, uid);
      });
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        addForm.style.display='none';
        var opening=removeForm.style.display==='none';
        removeForm.style.display=opening?'block':'none';
      });
      menu.appendChild(addRow);
      menu.appendChild(addForm);
      menu.appendChild(removeForm);
    }

    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-view-menu':null);
      if(willOpen){
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(160,r.width)+'px';
        menu.hidden=false;
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
  }

  // Project switcher — added July 12, 2026. PROJECT was previously a
  // fixed-anchor label only; this makes it a real lateral jump between
  // top-level projects (the flat Top Banana root list), not just a return
  // to the current project's own root.
  // PROJECT (Selection) — renamed from "Project switcher" and reshaped
  // August 1, 2026 per Larry's PROJECT screen spec: title is simply
  // PROJECT, current project marked with a checkmark, X-only dismiss (no
  // Cancel button), and a clearly separate "+ NEW PROJECT" section. Two
  // parts on one screen: pick an existing project, or start a new one.
  async function openProjectSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var boards=await T2TData.topLevelBoards();
    boards=boards.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var currentProjectId=null;
    if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
      var pr=_sboardProjectRowFor(_sboardAllRowsById[T2TShared.currentTopicId]);
      currentProjectId=pr?pr.id:null;
    }
    var rows=boards.map(function(b){
      var isCur=String(b.id)===String(currentProjectId);
      var cur=isCur?' current':'';
      var mark=isCur?'<span style="color:#0F6E56;margin-right:4px">✓</span>':'';
      return '<div class="sb-hdr-vitem'+cur+'" data-pid="'+b.id+'">'+mark+(b.text_content||'(untitled)')+'</div>';
    }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="position:relative;margin-bottom:10px">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;letter-spacing:1px">PROJECT</div>'
      +'<button class="sc-ov-btn" id="sb-proj-close-x" aria-label="Close" style="position:absolute;right:-4px;top:-6px;padding:2px 8px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1">✕</button>'
      +'</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
      +'<div style="font-size:calc(9px * var(--fg-text-scale,1));color:#a89a80;text-align:left;margin-bottom:10px">Double-click a project to rename, archive, or delete it.</div>'
      +'<div style="border-top:1px solid #e0dcd0;margin:0 0 10px"></div>'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;color:#7a6040;margin-bottom:4px;text-align:left">+ NEW PROJECT</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-proj-new-input" type="text" placeholder="Project name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-proj-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-proj-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:0;min-height:12px"></div>'
      +'</div>';
    // Positioned along the left side, near the Project chrome it was opened
    // from, rather than dead-center — added July 12, 2026. Reset in
    // closeSbDetail so other popups that use this same overlay aren't
    // affected by the override.
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
      // Single click switches (after a short window to give a following
      // click the chance to become a double-click instead); double-click
      // opens the Rename/Archive/Delete quick menu. Added August 1, 2026.
      row.addEventListener('click', function(e){
        // e.detail is 2 (or more) on the second click of a double-click --
        // fires synchronously, before the browser's separate 'dblclick'
        // event, so this cancels the pending single-click switch right
        // away instead of racing it. Fixes a bug where a fast double-click
        // still switched into the project as TOPIC because the switch
        // timer won the race against 'dblclick' arriving. Fixed August 1,
        // 2026.
        if(e.detail && e.detail>1){
          if(row._sbProjClickTimer){ clearTimeout(row._sbProjClickTimer); row._sbProjClickTimer=null; }
          return;
        }
        if(row._sbProjClickTimer) return;
        row._sbProjClickTimer=setTimeout(function(){
          row._sbProjClickTimer=null;
          var pid=row.getAttribute('data-pid');
          var boardRow=boards.find(function(b){ return String(b.id)===String(pid); });
          closeSbDetail();
          if(boardRow) _sboardDrillInto(boardRow);
        }, 300);
      });
      row.addEventListener('dblclick', function(e){
        e.stopPropagation();
        if(row._sbProjClickTimer){ clearTimeout(row._sbProjClickTimer); row._sbProjClickTimer=null; }
        var pid=row.getAttribute('data-pid');
        var boardRow=boards.find(function(b){ return String(b.id)===String(pid); });
        if(boardRow) _sboardProjectQuickMenu(boardRow);
      });
    });
    T().wire('sb-proj-close-x', closeSbDetail);
    T().wire('sb-proj-new-go', async function(){
      var errEl=document.getElementById('sb-proj-err');
      var nameInput=document.getElementById('sb-proj-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw ins.error;
        closeSbDetail();
        _sboardDrillInto(ins.data);
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // Project quick menu — Rename / Archive / Delete, reached only by
  // double-clicking a row in PROJECT (never a bare single click, matching
  // the same "nothing can be trashed directly" gating already locked for
  // Headers). Cancel returns to the PROJECT list, not a full close — a
  // traveler cleaning up several projects in one sitting shouldn't have to
  // reopen PROJECT from scratch each time. Added August 1, 2026.
  // Aug 4 2026, Larry: Storyboard sharing -- a member added to someone
  // else's PROJECT can reach this same quick menu, but Rename/Archive/
  // Delete stay owner-only (RLS already blocks the writes; this just
  // avoids showing controls that would only fail). Manage Access is
  // owner-only too, same split already locked for the Briefing Board.
  async function _sboardProjectQuickMenu(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(boardRow.text_content||'(untitled)').replace(/</g,'&lt;');
    var _sb=T().sb;
    var me=null; try{ me=(await _sb.auth.getUser()).data.user; }catch(e){}
    var isOwner=!!me && boardRow.user_id===me.id;
    var body='<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+safeName+'</div>';
    if(isOwner){
      body+='<button class="sc-ov-btn" id="sb-pq-rename" style="width:100%;margin-bottom:6px">Rename</button>'
        +'<button class="sc-ov-btn" id="sb-pq-archive" style="width:100%;margin-bottom:6px">Archive</button>'
        +'<button class="sc-ov-btn" id="sb-pq-share" style="width:100%;margin-bottom:6px">\uD83C\uDFAB Guests</button>'
        +'<button class="sc-ov-btn" id="sb-pq-delete" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Delete</button>';
    } else {
      body+='<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Shared with you -- only the owner can rename, archive, or delete this project.</div>'
        +'<button class="sc-ov-btn" id="sb-pq-share" style="width:100%;margin-bottom:6px">\uD83E\uDD1D View Access</button>';
    }
    body+='<button class="sc-ov-btn" id="sb-pq-cancel" style="width:100%">Cancel</button>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'+body+'</div>';
    ov.classList.add('active');
    T().wire('sb-pq-cancel', openProjectSwitcher);
    T().wire('sb-pq-share', function(){ _sboardOpenShareManager(boardRow, isOwner); });
    if(isOwner){
      T().wire('sb-pq-rename', function(){ _sboardProjectRenamePrompt(boardRow); });
      T().wire('sb-pq-archive', async function(){
        try{
          var archivedId=await T2TData.ensureArchivedHeader();
          var upd=await _sb.from('ideas').update({cluster_id:archivedId}).eq('id',boardRow.id).select();
          if(upd.error) throw upd.error;
          if(String(T2TShared.currentTopicId||'')===String(boardRow.id)){
            T2TShared.currentTopicId=null; T2TShared.filter=null;
          }
          openProjectSwitcher();
        }catch(err){
          var errBox=document.querySelector('.sc-overlay-card');
          if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
        }
      });
      T().wire('sb-pq-delete', function(){ _sboardConfirmDeleteProject(boardRow); });
    }
  }

  // Manage Access (Aug 4 2026) -- lets a PROJECT's owner add other signed-
  // in members so they can see and edit everything in it (equal access,
  // same as the owner) -- everything except renaming/archiving/deleting
  // the PROJECT itself, which stays owner-only. Backed by
  // storyboard_members + RLS (Supabase migration "add_storyboard_sharing").
  async function _sboardRenderShareList(boardRow, isOwner){
    var list=document.getElementById('sb-share-list'); if(!list) return;
    var _sb=T().sb;
    var res=await _sb.rpc('list_storyboard_members', {p_project_id: boardRow.id});
    var rows=(!res.error && res.data) ? res.data.filter(function(m){ return m.access_level==='view'; }) : [];
    var addRow=document.getElementById('sb-share-add-row');
    if(addRow) addRow.style.display = isOwner ? 'block' : 'none';
    if(!rows.length){
      list.innerHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#a89a80;font-style:italic;padding:6px 0">No guests yet.</div>';
      return;
    }
    list.innerHTML=rows.map(function(m){
      var safeLabel=(m.name||m.email||'').replace(/</g,'&lt;');
      var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+String(m.phone).replace(/</g,'&lt;')) : '';
      var sponsorLine = m.sponsor_name ? '<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#a89a80;font-style:italic;margin-top:2px">Cast sponsor: '+String(m.sponsor_name).replace(/</g,'&lt;')+'</div>' : '';
      return '<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e0dcd0;font-size:calc(12px * var(--fg-text-scale,1))">'
        +'<span><div>'+safeLabel+'</div><div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040">\u2709 '+(m.email||'').replace(/</g,'&lt;')+phoneLine+'</div>'+sponsorLine+'</span>'
        +(isOwner ? '<button class="sb-share-remove" data-user-id="'+m.user_id+'" style="background:none;border:none;color:#b8562f;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1))" title="Remove">&#10005;</button>' : '')
        +'</div>';
    }).join('');
    if(!isOwner) return;
    Array.prototype.forEach.call(list.querySelectorAll('.sb-share-remove'), function(btn){
      btn.addEventListener('click', async function(){
        var uidToRemove=btn.getAttribute('data-user-id');
        if(!window.confirm('Remove this person from the project? They will lose access immediately.')) return;
        await _sb.from('storyboard_members').delete().eq('project_id', boardRow.id).eq('user_id', uidToRemove);
        await _sboardRenderShareList(boardRow, isOwner);
      });
    });
  }

  function _sboardOpenShareManager(boardRow, isOwner, backFn){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(boardRow.text_content||'(untitled)').replace(/</g,'&lt;');
    var goBack = backFn || function(){ _sboardProjectQuickMenu(boardRow); };
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Guests</span><button class="sc-ov-btn" id="sb-share-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">'+safeName+'</div>'
      +'<div id="sb-share-list" style="text-align:left;margin-bottom:10px"></div>'
      +'<div id="sb-share-add-row" style="margin-bottom:10px">'
        +'<div style="display:flex;gap:6px;margin-bottom:6px">'
          +'<input id="sb-share-add-email" type="email" placeholder="Their email address" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box">'
          +'<button class="sc-ov-btn save" id="sb-share-add-go">Add</button>'
        +'</div>'
      +'</div>'
      +'<div id="sb-share-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'</div>';
    ov.classList.add('active');
    _sboardRenderShareList(boardRow, isOwner);
    T().wire('sb-share-close', goBack);
    T().wire('sb-share-add-go', async function(){
      if(!isOwner) return;
      var errEl=document.getElementById('sb-share-err');
      var input=document.getElementById('sb-share-add-email');
      var email=(input&&input.value||'').trim().toLowerCase();
      if(!email){ if(errEl) errEl.textContent='Enter an email first.'; return; }
      var accessLevel='view';
      var _sb=T().sb;
      try{
        var res=await _sb.rpc('find_member_by_email', {p_email: email});
        var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
        if(!match){ if(errEl) errEl.textContent='No T2T member found with that email -- they need an active Field Guide account first.'; return; }
        var myUser=(await _sb.auth.getUser()).data.user;
        var ins=await _sb.from('storyboard_members').insert({project_id: boardRow.id, user_id: match.user_id, added_by: myUser?myUser.id:null, access_level: accessLevel});
        if(ins.error){ if(errEl) errEl.textContent=ins.error.message||'Could not add that person.'; return; }
        if(input) input.value='';
        if(errEl) errEl.textContent='';
        await _sboardRenderShareList(boardRow, isOwner);
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // Rename a Project in place — same "nothing is permanent" treatment as
  // Header rename. Returns to the (refreshed) PROJECT list on save or
  // close, not a full dismiss. Added August 1, 2026.
  function _sboardProjectRenamePrompt(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeVal=(boardRow.text_content||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">Rename Project</div>'
      +'<input id="sb-proj-rename-input" type="text" value="'+safeVal+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div id="sb-proj-rename-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-proj-rename-go" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-proj-rename-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('sb-proj-rename-input');
    if(input) setTimeout(function(){ input.focus(); input.select(); }, 0);
    T().wire('sb-proj-rename-close', openProjectSwitcher);
    T().wire('sb-proj-rename-go', async function(){
      var errEl=document.getElementById('sb-proj-rename-err');
      var name=(input&&input.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var _sb=T().sb;
        var upd=await _sb.from('ideas').update({text_content:name}).eq('id',boardRow.id).select();
        if(upd.error) throw upd.error;
        boardRow.text_content=name;
        openProjectSwitcher();
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // Delete a Project — gated behind an explicit second confirmation, same
  // pattern already locked for Header trash. Reuses the exact same Trash
  // mechanic (reparent under the reserved Trash bucket) rather than a hard
  // delete, so nothing is ever unrecoverable. Added August 1, 2026.
  function _sboardConfirmDeleteProject(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(boardRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Delete "'+safeName+'"?</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Everything in it moves to Trash too — you can pull it back out later from Trash.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-pdel-go" style="flex:1;background:#b8562f;border-color:#b8562f">Delete it</button><button class="sc-ov-btn" id="sb-pdel-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-pdel-cancel', openProjectSwitcher);
    T().wire('sb-pdel-go', async function(){
      try{
        var trashId=await T2TData.ensureTrashHeader();
        var _sb=T().sb;
        var upd=await _sb.from('ideas').update({cluster_id:trashId}).eq('id',boardRow.id).select();
        if(upd.error) throw upd.error;
        if(String(T2TShared.currentTopicId||'')===String(boardRow.id)){
          T2TShared.currentTopicId=null; T2TShared.filter=null;
        }
        openProjectSwitcher();
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
      }
    });
  }

  function _sboardNextClusterNumber(){
    var max=0;
    _sboardHeaderList.forEach(function(h){
      var m=/^Cluster (\d+)$/i.exec(h.text_content||'');
      if(m){ var n=parseInt(m[1],10); if(n>max) max=n; }
    });
    return max+1;
  }

  function _sboardBySortOrder(a,b){
    var ao=(a.sort_order===null||a.sort_order===undefined)?Infinity:a.sort_order;
    var bo=(b.sort_order===null||b.sort_order===undefined)?Infinity:b.sort_order;
    return ao-bo;
  }

  function _sboardByAlpha(a,b){
    return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase(), undefined, {numeric:true, sensitivity:'base'});
  }

  // Makes a sibling group's ORDER # real and permanent -- Larry, Aug 3
  // 2026: "What if every card has an ORDER #... the order number does NOT
  // change." A number that only ever comes from the null-sort_order
  // fallback (creation order / priority tie-break) isn't a stable number
  // yet -- the moment ANY member of a group is still relying on that
  // fallback, this writes the group's current (already-correct) order
  // as real sort_order values for every member, fire-and-forget, so from
  // this render on the badge below is reading a genuine persisted
  // position, not a guess that could shift if the fallback's own
  // tie-break ever changed.
  function _sboardBackfillSortOrder(orderedRows){
    var needsBackfill=orderedRows.some(function(r){ return r.sort_order===null||r.sort_order===undefined; });
    if(!needsBackfill) return;
    var _sb=T().sb;
    orderedRows.forEach(function(r,i){
      if(r.sort_order!==i){
        r.sort_order=i;
        _sb.from('ideas').update({sort_order:i}).eq('id',r.id).then(function(){}, function(){});
      }
    });
  }

  // Same idea as _sboardBackfillSortOrder just above, but for a column
  // that used to be TWO independently-numbered groups (Subbers, then plain
  // cards) now being treated as ONE. Aug 22 2026 (Larry: "sub-headers
  // always cluster to the top... I want to mix them into the story").
  // Straight reuse of _sboardBackfillSortOrder would miss the real
  // problem here: every row already HAS a real sort_order (no nulls), it's
  // just that the two old groups each started counting from 0, so a
  // Subber and a card can easily share the same number -- sorting the
  // combined list by that alone still clusters them. This checks that the
  // given order (whatever it already is -- callers pass it in exactly
  // today's on-screen order, Subbers then cards, so nothing visually jumps
  // the first time this runs) is a real, strictly increasing sequence with
  // no collisions, and only if it isn't, renumbers every row 0..n-1 to
  // match that order for good. Once a column's been through this, its
  // values stay strictly increasing on their own (every reorder writes a
  // fresh clean 0..n-1 sequence), so this is a one-time migration per
  // column, not a rewrite on every render.
  function _sboardBackfillColumnOrder(orderedRows){
    var needsWrite=false, prev=-Infinity;
    for(var i=0;i<orderedRows.length;i++){
      var so=orderedRows[i].sort_order;
      if(so===null||so===undefined||so<=prev){ needsWrite=true; break; }
      prev=so;
    }
    if(!needsWrite) return;
    var _sb=T().sb;
    orderedRows.forEach(function(r,i){
      if(r.sort_order!==i){
        r.sort_order=i;
        _sb.from('ideas').update({sort_order:i}).eq('id',r.id).then(function(){}, function(){});
      }
    });
  }

  // Small on-card badge -- Larry, Aug 3 2026: "small, no bigger that Notes
  // field" (see .sb-notes-pill, 12px). orderedIds must always be the REAL
  // persisted order (post-backfill), never whatever order the row is
  // currently being DISPLAYED in -- that's what keeps this number
  // unchanged while a board is being viewed alphabetically.
  function _sboardOrderBadgeHTML(orderedIds, itemId){
    var idx=-1;
    for(var i=0;i<orderedIds.length;i++){ if(String(orderedIds[i])===String(itemId)){ idx=i; break; } }
    return idx===-1 ? '' : '<div class="sb-order-badge">'+(idx+1)+'</div>';
  }

  // maxWidthPx is the real available width inside the tile (tile width
  // minus its own left+right padding) -- Aug 18 2026: swapped the old
  // character-count guess for FGFitFontSize's real per-word measurement,
  // so a tile actually checks whether ITS longest word fits, not just how
  // long the whole label is. word-break:break-word stays as the fallback
  // wherever this is used, for the rare word that's too wide even at the
  // floor size.
  //
  // Aug 20 2026 -- two fixes, both from Larry hitting live cases the Aug
  // 18 version missed:
  // 1. This used to Math.round() the size FGFitFontSize returned. That
  //    fit size is already exactly as large as it can be while still
  //    fitting -- rounding it UP (JS rounds .5 up) could push the actual
  //    rendered width back past the box edge by a hair, which was enough
  //    for "Performance"/"Appreciation" etc. to split again despite the
  //    fit logic having done its job correctly. Dropped the rounding --
  //    fractional px font-size is fine, and FGFitFontSize's own built-in
  //    safety margin covers the rest.
  // 2. Optional maxHeightPx/lineHeight (5th/6th args) let a caller that
  //    knows its box's real height also guard against a short-worded but
  //    long sentence wrapping to more lines than the box is tall for --
  //    see FGFitFontSize's own comment for why that's a separate check
  //    from the per-word width one this function already did.
  function _sboardFitFontSize(text, base, min, maxWidthPx, maxHeightPx, lineHeight){
    if(!maxWidthPx){
      var len=(text||'').length;
      if(len<=14) return base;
      var reduced=base-Math.floor((len-14)/5);
      return Math.max(min, reduced);
    }
    return window.FGFitFontSize(text, maxWidthPx, {base:base, min:min, step:0.5, fontFamily:'serif', fontWeight:'400', maxHeightPx:maxHeightPx, lineHeight:lineHeight});
  }

  function _sboardHeartsHTML(count){
    if(!count) return '';
    var shown=Math.min(count,8), s='';
    for(var i=0;i<shown;i++) s+='❤️';
    if(count>8) s+=' +'+(count-8);
    return s;
  }

  async function renderSeaOfIdeasCluster(){
    var boardWrap=document.getElementById('sc-board-wrap');
    if(!boardWrap) return;
    var fgr=document.getElementById('fg-root');
    if(fgr){ fgr.classList.add('isx-full'); fgr.classList.toggle('sb-wide', _sboardDesktop); }
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

  function _sboardMakeTile(item, width, straight, groupParentId, height){
    width=width||(_sboardDesktop?76:70);
    height=height||width;
    var rot=straight?0:(Math.random()*8-4).toFixed(1);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'')+(String(_sboardSelectedHeaderId)===String(item.id)?' sb-kbd-selected':'');
    tile.setAttribute('data-idea-id', String(item.id));
    // Also tagged data-header-id, Aug 22 2026 fix (Larry: "click ctrl-down
    // does not seem to be working") -- every OTHER selectable card
    // (Header/Subheader tiles, the TOPIC box) is looked up by this
    // attribute when clearing the previous selection's highlight (see
    // _sboardClearHeaderSelection and the click handlers below). Plain
    // idea-card tiles never got a click listener that sets
    // _sboardSelectedHeaderId at all, so Ctrl+Down/Up had nothing to act
    // on for the single most common card type on the board -- selecting a
    // Header/Subheader/TOPIC worked exactly as designed, it was only
    // plain cards that silently did nothing. Reusing the same attribute
    // name (rather than teaching the lookup a second attribute) keeps
    // this a one-spot fix.
    tile.setAttribute('data-header-id', String(item.id));
    tile.draggable=!item.locked;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;border-radius:0;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s'+(item.color?';background:'+item.color:'');
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    // Click to select this card for the Ctrl+Down/Ctrl+Up keyboard
    // shortcuts (see wireSboardUndoKeyboard) -- same pattern as the
    // Header/Subheader tile click handlers elsewhere in this file.
    // Aug 22 2026 fix (see comment on the data-header-id line above).
    tile.addEventListener('click', function(e){
      if(_sboardSelectedHeaderId===item.id) return;
      var prevId=_sboardSelectedHeaderId;
      _sboardSelectedHeaderId=item.id;
      if(prevId){
        var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
        if(prevEl) prevEl.classList.remove('sb-kbd-selected');
      }
      tile.classList.add('sb-kbd-selected');
    });
    if((item.content_type==='image'||item.content_type==='link') && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
      if(item.content_type==='link'){
        var badge=document.createElement('div');
        badge.style.cssText='position:absolute;top:2px;left:20px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
        badge.textContent='\ud83d\udd17';
        tile.appendChild(badge);
      }
      // Title on the outside of an image card, Aug 12 2026 -- the text a
      // traveler typed alongside the image (text_content) was always
      // saved, just never shown on the tile face -- only the picture
      // rendered. Skipped for link cards, which already caption
      // themselves with the parsed link title below.
      if(item.content_type==='image' && item.text_content){
        var cap=document.createElement('div');
        cap.className='sc-tile-caption';
        cap.textContent=item.text_content;
        tile.appendChild(cap);
      }
    } else if(item.content_type==='link'){
      var lp=document.createElement('p');
      var lpText='\ud83d\udd17 '+T2TMedia.parseText(item.text_content).title;
      lp.textContent=lpText;
      var lpBase=Math.round((height>=60?17:14)*2/3*(window.FGTextSize&&window.FGTextSize.getMult?window.FGTextSize.getMult():1));
      // Floor lowered Aug 21 2026 (Larry: long words like "Appreciation"
      // were still splitting onto a 2nd line on these small tiles) --
      // 8px/55% wasn't always low enough to get a long single word under
      // the tile's real width, so it fell through to word-break more
      // than it should have. Letting it shrink further first keeps the
      // word intact and readable at a smaller size, which is what Larry
      // asked for over splitting it.
      lp.style.cssText='margin:0;word-break:break-word;font-size:'+_sboardFitFontSize(lpText, lpBase, Math.max(6,Math.round(lpBase*0.4)), width-16, height-12, 1.25)+'px';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      var pText=item.text_content||'(untitled)';
      p.textContent=pText;
      var pBase=Math.round((height>=60?17:14)*2/3*(window.FGTextSize&&window.FGTextSize.getMult?window.FGTextSize.getMult():1));
      // Floor lowered, same reasoning as the link tile above.
      p.style.cssText='margin:0;word-break:break-word;font-size:'+_sboardFitFontSize(pText, pBase, Math.max(6,Math.round(pBase*0.4)), width-16, height-12, 1.25)+'px';
      tile.appendChild(p);
    }
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent = item.heart_count>=2 ? '💕' : '❤️';
      tile.appendChild(hb);
    }
    var cornerFlip=document.createElement('div');
    cornerFlip.className='sc-corner-flip';
    cornerFlip.title='Flip card';
    cornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(item); });
    cornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    cornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
    tile.appendChild(cornerFlip);
    // Double-click also opens the card, Aug 11 2026 (Larry) -- same
    // openSbDetail the corner-flip already triggers, just a second,
    // faster way to get there on a subber (plain idea card). The
    // corner-flip stays as-is; this doesn't replace it.
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(item); });
    // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
    // "remove card numbers from the front of the Idea Cards, leave on
    // back") -- the back/DETAILS view keeps its own separate ORDER
    // field (see openSbDetail's "ORDER, not RANK" block), this was just
    // the face-of-the-card duplicate. _sboardOrderBadgeHTML/
    // _sboardCardOrderByParent stay in place; they still feed that back
    // view and the other order bookkeeping this file does.
    // Person Assigned badge, Aug 9 2026 -- Larry: "look like the BB card
    // with the initials on the front."
    tile.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(item));
    // Bottom-left signal cluster: Lock, Signal Flags, Notes, Link --
    // Aug 15 2026 (Larry: "is the LOCK not just another FLAG? ... all
    // signal flags are added to the lower left corner on all types of
    // boards"). Signal Flags moved here from bottom-right (was paired
    // with the heart); Lock and Link moved here from their own
    // standalone spots. One wrapped call so the whole cluster packs
    // together with no dead space for whichever of the four aren't
    // present on this particular card.
    tile.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(item, {lock:true, flags:true, notes:true, link:true}));
    // Reorder-vs-stack zoning, added July 12, 2026. The middle band of the
    // tile nests (stacks the dragged card under this one, promoting this
    // one to a header if it wasn't already — same "first card placed stays
    // the header" rule CLUSTER already uses). The top/bottom edges keep the
    // plain reorder/move behavior that was already here. Splitting the same
    // drop target into zones, rather than adding new DOM between tiles,
    // resolves the reorder-vs-nest ambiguity flagged July 7 without
    // restructuring the column layout.
    //
    // Colors/weight, Aug 16 2026 -- Larry: "make slot availability more
    // obvious" when moving a card, then "bright green is fine but can it
    // be larger?" as a same-day follow-up. This target was still on the
    // original thin blue (#5b9bd5) cue from July 12 -- the same header
    // drop zones got upgraded to a thicker bright green on Aug 3 (Larry,
    // then: blue "didn't read as a go/no-go signal," green is the
    // conventional "safe to let go" color), but that fix never made it
    // back to plain card tiles. Sized well past that first pass now:
    // insert lines are a 7px inset border, nest zone is a 5px outline plus
    // an 11px soft green halo (box-shadow glow) around the whole card so
    // the valid-nest target reads as a clearly highlighted slot on a busy
    // board, not a thin ring. dragleave restores the tile's real resting
    // shadow (.sc-tile's own 0 3px 10px) instead of dropping it to 'none'.
    tile.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      if(frac<0.3){ tile.style.outline='none'; tile.style.boxShadow='inset 0 7px 0 0 #22c55e'; }
      else if(frac>0.7){ tile.style.outline='none'; tile.style.boxShadow='inset 0 -7px 0 0 #22c55e'; }
      else { tile.style.outline='5px solid #22c55e'; tile.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)'; }
    });
    tile.addEventListener('dragleave', function(){ tile.style.outline='none'; tile.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; });
    tile.addEventListener('drop', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      tile.style.outline='none'; tile.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw==='sb-goup') return;
      var parentId=groupParentId!==undefined?groupParentId:(item.cluster_id||null);
      if(raw.indexOf('header:')===0){
        // A Subber dropped onto a plain card -- Aug 22 2026 (Larry: "sub-
        // headers always cluster to the top... I want to mix them into
        // the story"). Used to be silently ignored (this whole branch
        // didn't exist -- a dragged Subber over a plain-card tile just
        // did nothing on drop). Always a sibling reorder here, never the
        // middle "stack into a header" zone plain-idea-on-idea gets --
        // that zone specifically converts the TARGET card into a brand
        // new header, which isn't what dragging an EXISTING Subber onto
        // it should trigger. (Nesting a Subber under another header is a
        // perfectly normal move elsewhere -- Larry corrected an earlier,
        // wrong pass here that treated it as something to avoid -- it's
        // just not what this particular gesture is for.) So this simply
        // goes by which half of the card it landed on.
        var draggedHeaderId=raw.slice(7);
        if(String(draggedHeaderId)===String(item.id)) return;
        _sboardReorderOrMoveColumnItem(draggedHeaderId, item.id, parentId, frac>=0.5);
      } else if(frac>=0.3 && frac<=0.7){
        _sboardStackIntoHeader(raw, item);
      } else {
        _sboardReorderOrMoveColumnItem(raw, item.id, parentId, frac>0.7);
      }
    });
    return tile;
  }

  // Drop-to-stack — added July 12, 2026. Dropping card A onto the center of
  // card B promotes B to a header in place (if it wasn't one already) and
  // moves A underneath it — same rule already locked for CLUSTER's own
  // stacking gesture ("the first card placed stays the header, never the
  // most recently added"), now reachable directly on the main board via the
  // tile's own center zone instead of only inside CLUSTER view.
  async function _sboardStackIntoHeader(draggedId, targetItem){
    if(String(draggedId)===String(targetItem.id)) return;
    if(targetItem.locked) return;
    var _sb=T().sb;
    var statusEl=document.getElementById('sc-status');
    try{
      if(targetItem.content_type!=='header'){
        var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id',targetItem.id);
        if(upd.error) throw upd.error;
      }
      await _sboardMoveCard(draggedId, targetItem.id);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  function _sboardMakeHeaderStackTile(headerRow, width, height, straight){
    width=width||(_sboardDesktop?76:70);
    height=height||width;
    var _stMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
    var rot=straight?0:(Math.random()*6-3).toFixed(1);
    var wrap=document.createElement('div');
    wrap.className='sc-stack-tile'+(String(_sboardSelectedHeaderId)===String(headerRow.id)?' sb-kbd-selected':'');
    wrap.setAttribute('data-header-id', String(headerRow.id));
    wrap.draggable=!headerRow.locked;
    wrap.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
    wrap.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;cursor:pointer;transform:rotate('+rot+'deg)';
    var bg=headerRow.color||'#fff';
    var back2=document.createElement('div');
    back2.className='sc-stack-layer';
    back2.style.cssText='position:absolute;top:5px;left:5px;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0';
    var back1=document.createElement('div');
    back1.className='sc-stack-layer';
    back1.style.cssText='position:absolute;top:2.5px;left:2.5px;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0';
    var front=document.createElement('div');
    front.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;padding:5px;box-sizing:border-box;text-align:center;overflow:hidden';
    var p=document.createElement('p');
    p.textContent=headerRow.text_content||'(untitled)';
    // Floor lowered Aug 21 2026, same reasoning as the idea/link tiles --
    // a long single word (a Subber name) shrinking further beats it
    // wrapping in this small, fixed, overflow-hidden card.
    var fitSize=_sboardFitFontSize(headerRow.text_content, Math.round((height>=60?17:14)*_stMult), Math.max(6,Math.round(8*_stMult)), width-18, height-14, 1.15);
    p.style.cssText='margin:0;font-weight:400;line-height:1.15;color:#1a3a5c;white-space:normal;word-break:break-word;font-size:'+fitSize+'px';
    front.appendChild(p);
    // Lock badge moved to the bottom-left signal cluster below, Aug 15
    // 2026 (Larry: "is the LOCK not just another FLAG?") -- was a
    // standalone top-right icon.
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    var stackCornerFlip=document.createElement('div');
    stackCornerFlip.className='sc-corner-flip';
    stackCornerFlip.title='Flip card';
    stackCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
    stackCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    stackCornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
    front.appendChild(stackCornerFlip);
    // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
    // "remove card numbers from the front of the Idea Cards, leave on
    // back") -- see the matching note on the plain-card tile above.
    front.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
    // Bottom-left signal cluster: Lock, Signal Flags, Notes -- same
    // order and reasoning as the plain-card tile above (no Link here,
    // matching this tile's behavior before the Aug 15 2026 refactor).
    front.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(headerRow, {lock:true, flags:true, notes:true}));
    // Double-click a HEADER or sub-header card to drill into it — that
    // card becomes the new TOPIC. Locked July 16, 2026.
    // Drilling in is now done by dragging this card onto the TOPIC box
    // (locked July 27, 2026, replacing double-click so double-click can
    // mean color everywhere with zero header exceptions). Double-click here
    // is the same color-options shortcut every other card has.
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
    // Click to select this Subber for the Tab/Shift+Tab and
    // Ctrl+Down/Ctrl+Up keyboard shortcuts (see wireSboardUndoKeyboard).
    // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
    wrap.addEventListener('click', function(e){
      if(_sboardSelectedHeaderId===headerRow.id) return;
      var prevId=_sboardSelectedHeaderId;
      _sboardSelectedHeaderId=headerRow.id;
      if(prevId){
        var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
        if(prevEl) prevEl.classList.remove('sb-kbd-selected');
      }
      wrap.classList.add('sb-kbd-selected');
    });
    // Click-and-hold a sub-header to peek at its subber cards, Aug 11 2026
    // (Larry) -- reuses openSbHeaderPeek, the same grid view CLUSTER's
    // bucket pill already opens on a plain click, so there's no new screen
    // to build, just a second doorway into it. Same 550ms hold threshold
    // as the heart-pill tap/hold pattern below, so the two "hold to do
    // something different" gestures on this board feel consistent. A
    // short click/tap still does nothing dedicated here (double-click for
    // color, corner-flip to open the back) -- this is purely additive.
    var stackHoldTimer=null;
    function stackStartHold(e){
      if(e && e.type==='mousedown' && e.button!==0) return;
      clearTimeout(stackHoldTimer);
      stackHoldTimer=setTimeout(function(){ openSbHeaderPeek(headerRow); }, 550);
    }
    function stackCancelHold(){ clearTimeout(stackHoldTimer); }
    wrap.addEventListener('mousedown', stackStartHold);
    wrap.addEventListener('touchstart', stackStartHold);
    wrap.addEventListener('mouseup', stackCancelHold);
    wrap.addEventListener('mouseleave', stackCancelHold);
    wrap.addEventListener('touchend', stackCancelHold);
    wrap.addEventListener('touchmove', stackCancelHold);
    wrap.addEventListener('dragstart', stackCancelHold);
    // Reorder/move/bucket zoning, Aug 3 2026, reworked Aug 22 2026 (Larry:
    // "Sub-headers are still buckets. Dropping a card into a sub-header
    // should still be possible") -- Subbers are real containers, same as
    // any Header: a card filed under one is meant to be found by drilling
    // into that Subber (making it the Topic), not by staying on this
    // board and expecting it to show as a tile here. That's how the
    // Topic/Header/Subber system already works everywhere else (see
    // Ctrl+Up/Ctrl+Down), not a trap. So this now gets the SAME 3-zone
    // split the plain idea tile already uses (top/bottom edge = reorder,
    // middle = bucket) instead of the top/bottom-half-only split a
    // same-day-earlier pass had narrowed it to:
    //  - top/bottom edge: sibling reorder, same as before -- the dropped
    //    card or Subber lands right next to this Subber, in this same
    //    visible column.
    //  - middle: a plain card files IN UNDER this Subber (the restored
    //    "bucket" gesture); a Subber dropped in the middle of another
    //    Subber just reorders too (no drag gesture nests one Subber
    //    under another -- that stays Tab/Shift+Tab/DETAILS-panel-only).
    // Colors/weight, Aug 16 2026 -- Larry: "make slot availability more
    // obvious." Matches the same green/thicker upgrade applied to the
    // plain idea tile's own drop zones the same day (was thin blue,
    // matching what the header drop zones moved off of back on Aug 3).
    wrap.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=wrap.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      if(frac<0.3){ front.style.outline='none'; front.style.boxShadow='inset 0 7px 0 0 #22c55e'; wrap._dropSide='before'; }
      else if(frac>0.7){ front.style.outline='none'; front.style.boxShadow='inset 0 -7px 0 0 #22c55e'; wrap._dropSide='after'; }
      else { front.style.outline='5px solid #22c55e'; front.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)'; wrap._dropSide='bucket'; }
    });
    wrap.addEventListener('dragleave', function(){ front.style.outline='none'; front.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; wrap._dropSide=null; });
    wrap.addEventListener('drop', function(e){
      e.preventDefault(); front.style.outline='none'; front.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)';
      var side=wrap._dropSide||'before'; wrap._dropSide=null;
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw||raw==='sb-goup') return;
      if(raw.indexOf('header:')===0){
        var draggedHeaderId=raw.slice(7);
        if(String(draggedHeaderId)===String(headerRow.id)) return;
        // No drag gesture nests one Subber under another -- a "bucket"
        // drop here just reorders (treated as 'after'), same as it did
        // before this zoning got a middle band.
        _sboardReorderOrMoveColumnItem(draggedHeaderId, headerRow.id, headerRow.cluster_id||null, side!=='before');
      } else if(side==='bucket'){
        _sboardMoveCard(raw, headerRow.id);
      } else {
        _sboardReorderOrMoveColumnItem(raw, headerRow.id, headerRow.cluster_id||null, side==='after');
      }
    });
    return wrap;
  }

  // [+] control — adds a new header at whatever board is currently open,
  // landing right where MISC sits (far right). Simpler and more direct
  // than routing through the 💡 idea-capture flow just to make a header.
  // Kept small and understated (a control, not a card) after feedback
  // that a full card-sized dashed box felt cluttered. Locked July 16, 2026.
  function _sboardMakeAddHeaderTile(width, height){
    height=height||64;
    var tile=document.createElement('button');
    tile.className='sc-add-header-tile';
    tile.title='Add a new header';
    // align-self:flex-start + a top margin sized to center the circle
    // within the header row's own height — was align-self:center, which
    // vertically centered it against the *tallest column* (i.e. down by
    // the subbers) instead of sitting level with the header cards
    // themselves. Fixed July 16, 2026.
    tile.style.cssText='flex-shrink:0;width:36px;height:36px;align-self:flex-start;margin-top:'+Math.max(0,(height-36)/2)+'px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #a9cce3;border-radius:50%;color:#5b9bd5;font-size:calc(18px * var(--fg-text-scale,1));font-weight:700;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s';
    tile.textContent='+';
    tile.addEventListener('click', function(e){ e.stopPropagation(); _sboardOpenAddHeaderPrompt(); });
    return tile;
  }

  // Saved-but-not-visible reassurance, Aug 6 2026 -- prompted by a real
  // incident: Larry added headers and a card that were genuinely saved
  // (confirmed in the database) but didn't show up on screen because
  // GitHub's own Actions/Pages service was down and couldn't ship the
  // fix that would've displayed them. From in here there's no way to
  // know WHY something didn't render -- could be that, could be a slow
  // network, could be a future bug nobody's found yet -- so this doesn't
  // try to diagnose it. It just checks, after any add finishes, whether
  // the new header or card actually landed in the DOM. If it didn't,
  // it says so plainly: saved, just not visible yet, not something you
  // did, not a sign anything's broken. Deliberately calm, not red/error
  // styled -- this is a "hang on" message, not a warning.
  function _sboardVerifyAdded(newId, label){
    if(!newId) return;
    // renderSeaBoard() hands off entirely to the Idea Session (9711)
    // screen's own ring-layout renderer when that's what's on screen --
    // a different DOM shape this check doesn't know how to read yet.
    // Skip rather than risk a false "didn't show up" there.
    var isxScreen=document.getElementById('s-idea-session');
    if(isxScreen && isxScreen.classList.contains('active')) return;
    var statusEl=document.getElementById('sc-status');
    if(!statusEl) return;
    var found=document.querySelector('[data-header-id="'+newId+'"], [data-idea-id="'+newId+'"]');
    if(!found){
      statusEl.textContent=(label||'What you just added')+' is saved safely — it just hasn\'t shown up on screen yet. That\'s not something you did, and nothing\'s broken. Give it a moment, or refresh, and it\'ll be there.';
      statusEl.className='pending';
    }
  }

  function _sboardOpenAddHeaderPrompt(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center;position:relative">'
      +'<button class="sc-ov-btn" id="sb-addheader-close" aria-label="Close" style="position:absolute;right:-4px;top:-6px;padding:2px 8px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1">✕</button>'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">New header</div>'
      +'<input id="sb-addheader-input" type="text" placeholder="Header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div id="sb-addheader-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-addheader-go" style="flex:1">Create</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('sb-addheader-input');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    T().wire('sb-addheader-close', closeSbDetail);
    // Aug 7 2026 -- Larry filed two DOING cards after using this screen:
    // ENTER should act as Create, and Create/Save felt like it "did
    // nothing" and only Cancel actually closed the screen. Root cause of
    // the second one, confirmed live: there was no keydown handler at
    // all (so ENTER truly did nothing), and Create gave no immediate
    // feedback while the save round-tripped to the database -- a slow
    // moment looked identical to a broken button, so Larry closed it
    // himself before the save had a chance to land. Fix: ENTER now
    // triggers the same Create path, and the button visibly goes into a
    // "Saving..." state (and can't be double-clicked) the instant it's
    // pressed, so there's always something to see happening.
    // Aug 16 2026 -- Larry: ENTER (or Create) shouldn't close this
    // screen at all -- only the ✕ or clicking outside should. The old
    // behavior closed on every successful save, which meant adding
    // several headers in a row required reopening this prompt each
    // time. Now a successful save clears the field, shows a quiet
    // "Added" confirmation, and leaves the screen open so the next
    // header name can be typed and Entered right away.
    var goBtn=document.getElementById('sb-addheader-go');
    async function _sbAddHeaderGo(){
      var errEl=document.getElementById('sb-addheader-err');
      var name=((input&&input.value)||'').trim();
      if(!name){ if(errEl){ errEl.style.color='#b8562f'; errEl.textContent='Name can\'t be empty.'; } return; }
      if(goBtn){ goBtn.disabled=true; goBtn.textContent='Saving...'; }
      var _sb=T().sb;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:T2TShared.currentTopicId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw ins.error;
        _sboardAddRow(ins.data);
        await renderSeaBoard(true);
        _sboardVerifyAdded(ins.data&&ins.data.id, 'Your new header "'+name+'"');
        if(input){ input.value=''; input.focus(); }
        if(errEl){ errEl.style.color='#3a7d3a'; errEl.textContent='Added "'+name+'" ✓'; }
        if(goBtn){ goBtn.disabled=false; goBtn.textContent='Create'; }
      }catch(err){
        if(errEl){ errEl.style.color='#b8562f'; errEl.textContent=err.message; }
        if(goBtn){ goBtn.disabled=false; goBtn.textContent='Create'; }
      }
    }
    T().wire('sb-addheader-go', _sbAddHeaderGo);
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); _sbAddHeaderGo(); }
    });
    if(input) input.addEventListener('input', function(){
      var errEl=document.getElementById('sb-addheader-err');
      if(errEl && errEl.style.color==='rgb(58, 125, 58)') errEl.textContent='';
    });
  }

  // [+] tile at the end of a header's own subber list — quick text-only
  // add, landing directly under that header. Full capture (camera/
  // paste/link) still lives behind 💡 for anything beyond plain text.
  // Locked July 16, 2026.
  // [+] control at the end of a header's own subber list — quick text-only
  // add, landing directly under that header. Full capture (camera/
  // paste/link) still lives behind 💡 for anything beyond plain text.
  // Kept small and understated, same reasoning as the header [+] above.
  // Locked July 16, 2026.
  // [+] control at the end of a header's own subber list — opens the same
  // full capture card everything else uses (camera/attach, paste,
  // link), pre-targeted at this specific header, then returns to this
  // board on save. No more separate lightweight text-only dialog — one
  // input experience everywhere. Locked July 16, 2026.
  function _sboardMakeAddSubberTile(headerId, width, height){
    var tile=document.createElement('button');
    tile.className='sc-add-subber-tile';
    tile.title='Add a new card here';
    tile.style.cssText='flex-shrink:0;width:30px;height:30px;margin:2px 0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #cfe4f2;border-radius:50%;color:#5b9bd5;font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s';
    tile.textContent='+';
    tile.addEventListener('click', function(e){
      e.stopPropagation();
      _sboardOpenQuickCapture(headerId);
    });
    return tile;
  }

  // Opens the 1170 Idea Input card directly on top of 9710 — no navigation
  // to 9711 first, no shared state with it either. IdeaCapture doesn't
  // know or care which screen called it. Locked July 16, 2026.
  function _sboardOpenQuickCapture(headerId){
    var headerRow=_sboardHeadersById && _sboardHeadersById[headerId];
    window.IdeaCapture.open({
      headerId: headerId,
      headerLabel: headerRow ? (headerRow.text_content||'(untitled)') : 'New',
      boardId: T2TShared.currentTopicId,
      onSaved: async function(row){
        _sboardAddRow(row);
        await renderSeaBoard(true);
        _sboardVerifyAdded(row&&row.id, 'What you just added');
      }
    });
  }

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
      // VIEW-by-person filter picker -- only re-fetch the roster when the
      // project actually changed (not on every render, which would mean
      // every drag/reorder re-querying members). Aug 9 2026, Larry.
      if(currentProjectRowForScope){
        if(String(currentProjectRowForScope.id)!==String(_sboardViewFilterProjectId)){
          _sboardViewFilterProjectId=currentProjectRowForScope.id;
          _sboardPersonFilterId=null;
          _tmLoadRoster(currentProjectRowForScope).then(function(){ _sboardRenderPersonFilterPicker(currentProjectRowForScope); });
        } else {
          _sboardRenderPersonFilterPicker(currentProjectRowForScope);
        }
      }

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
          var pageRes=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board')
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
        var hdFitSize=_sboardFitFontSize(name, Math.round(20*_tsMult), Math.round(8*_tsMult), HEADER_W-28, HEADER_H-14, 1.2);
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+hdFitSize+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(headerRow.color?';background:'+headerRow.color:'');
        hd.textContent=name;
        // Purpose used to have its own separate corner-flip editor; as of
        // July 17, 2026 it's treated exactly like any other header — same
        // dblclick-to-drill-in, same corner-flip into openSbDetail().
        // Drilling in moved to drag-onto-TOPIC (July 27, 2026); double-click
        // is the color-options shortcut, same as every other card.
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
        var hdCornerFlip=document.createElement('div');
        hdCornerFlip.className='sc-corner-flip';
        hdCornerFlip.title='Flip card';
        hdCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
        hdCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
        hdCornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
        hd.appendChild(hdCornerFlip);
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
        if(depth===0 && !headerRow.locked){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
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
        hd.addEventListener('dragover', function(e){
          e.preventDefault();
          var rect=hd.getBoundingClientRect();
          var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
          if(frac<0.3){ hd.style.outline='none'; hd.style.boxShadow='inset 4px 0 0 0 #22c55e'; hd._dropSide='before'; }
          else if(frac>0.7){ hd.style.outline='none'; hd.style.boxShadow='inset -4px 0 0 0 #22c55e'; hd._dropSide='after'; }
          else { hd.style.boxShadow='none'; hd.style.outline='2px solid #22c55e'; hd._dropSide='nest'; }
        });
        hd.addEventListener('dragleave', function(){ hd.style.boxShadow='none'; hd.style.outline='none'; hd._dropSide=null; });
        hd.addEventListener('drop', function(e){
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
        });
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
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+_sboardFitFontSize(localLabel,Math.round(20*_tsMult),Math.round(8*_tsMult),HEADER_W-28,HEADER_H-14,1.2)+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(newRow&&newRow.color?';background:'+newRow.color:'');
        hd.textContent=localLabel;
        if(newRow){
          // Drilling in moved to drag-onto-TOPIC (July 27, 2026); double-click
          // is the color-options shortcut, same as every other card.
          hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(newRow); });
          var newCornerFlip=document.createElement('div');
          newCornerFlip.className='sc-corner-flip';
          newCornerFlip.title='Flip card';
          newCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(newRow); });
          newCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
          newCornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
          hd.appendChild(newCornerFlip);
        }
        if(newRow && !newRow.locked){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+newRow.id); });
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

  function _sboardTopicOptionsHTML(excludeId){
    var currentLabel=(T2TShared.currentTopicId && _sboardHeadersById[T2TShared.currentTopicId]) ? _sboardHeadersById[T2TShared.currentTopicId].text_content : 'Wish Tank';
    var currentValue=T2TShared.currentTopicId||'';
    var opts='<option value="'+currentValue+'">Topic ('+currentLabel+')</option>';
    opts+=_sboardHeaderList
      .filter(function(h){ return String(h.id)!==String(excludeId) && String(h.id)!==String(currentValue); })
      .map(function(h){ return '<option value="'+h.id+'">'+h.text_content+'</option>'; }).join('');
    return opts;
  }

  function _sboardHeaderQuickMenu(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var options=_sboardTopicOptionsHTML(headerRow.id);
    var apexTag=(!headerRow.cluster_id)?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+headerRow.text_content+'</div>'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Move under</label>'
      +'<select id="sb-hq-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-hq-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px"><button class="sc-ov-btn save" id="sb-hq-move" style="flex:1">Move here</button><button class="sc-ov-btn" id="sb-hq-open" style="flex:1">Open board</button></div>'
      +'<button class="sc-ov-btn" id="sb-hq-trash" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Trash this header</button>'
      +'<button class="sc-ov-btn" id="sb-hq-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-hq-parent');
    T().wire('sb-hq-move', async function(){
      var errEl=document.getElementById('sb-hq-err');
      var newParent=sel.value||null;
      if(String(newParent)===String(headerRow.cluster_id||'')){ closeSbDetail(); return; }
      try{
        var upd=await _sb.from('ideas').update({cluster_id:newParent}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Nothing changed — the header may not have matched.');
        _sboardPatchRow(headerRow.id, {cluster_id:newParent});
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
    T().wire('sb-hq-open', function(){
      closeSbDetail();
      _sboardDrillInto(headerRow);
    });
    T().wire('sb-hq-trash', function(){ _sboardConfirmTrashHeader(headerRow); });
    T().wire('sb-hq-cancel', closeSbDetail);
  }

  // Session 231 (Aug 20) -- Larry, in Hang-Ups: "DELETE ANY HEADER WHEN
  // SENT TO TRASH." This used to be a soft move (cluster_id -> the
  // reserved Trash header, recoverable via undo or by digging it back
  // out of Trash) -- now it's a real delete the moment "Trash it" is
  // confirmed, matching what Larry actually asked for. A DB migration
  // this same session made ideas.cluster_id (the parent-child tree) and
  // briefing_cards' source_header_id/hangup_header_id cascade, so one
  // DELETE here also removes everything genuinely nested under this
  // header (child headers, cards) and its own Briefing task-card
  // mirror, atomically. Two things deliberately still block the delete
  // with a normal Postgres error instead of silently cascading further:
  // a header that's actually a project root (ideas.project_id) or has
  // its own linked Briefing Board (briefing_boards.storyboard_project_id)
  // -- those stay NO ACTION on purpose so trashing one ordinary header
  // can never take out a whole project or Briefing Board as a side
  // effect. No undo after this -- a real delete can't be undone by the
  // existing snapshot/update mechanism, so the dialog says so plainly
  // instead of pretending otherwise.
  function _sboardConfirmTrashHeader(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Delete "'+safeName+'"?</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">This permanently deletes it and anything nested under it. This can\'t be undone.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-trash-go" style="flex:1;background:#b8562f;border-color:#b8562f">Delete it</button><button class="sc-ov-btn" id="sb-trash-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-trash-cancel', closeSbDetail);
    T().wire('sb-trash-go', async function(){
      var _sb=T().sb;
      try{
        var del=await _sb.from('ideas').delete().eq('id',headerRow.id);
        if(del.error) throw del.error;
        // A real fetch, not fromCache=true -- the DB cascade above may
        // have just removed a whole subtree of descendant rows (and any
        // linked Briefing task-card mirrors) that this tab's in-memory
        // cache still holds. A cache-only render would keep drawing
        // those as ghosts until something else forced a real refetch.
        closeSbDetail();
        renderSeaBoard(false);
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        var msg=err.message||String(err);
        if(/foreign key|violates/i.test(msg)) msg='Can\'t delete this one — it\'s a project root or has its own linked Briefing Board with content depending on it.';
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+msg+'</div>');
      }
    });
  }

  // Larry, August 1 2026: "I just closed the Field Guide storyboard but
  // when I reopened it, it opened to the Wish Tank instead. almost
  // there!" — the desk's Idea Board button (see _ideaOpenBoardResume in
  // idea-media-shared.js) already resumes T2TData's getLastInputTopic,
  // but nothing on 1010 itself was ever writing to it — only 9711
  // (Session) did, via its own _isxPersistLastTopic. So reopening 1010
  // fell back to the project apex (Wish Tank) unless Session happened to
  // have saved something more specific. This mirrors that same write on
  // every actual move within the Storyboard (drilling into a header,
  // climbing back up, or switching projects — all three route through
  // _sboardDrillInto/_sboardGoUpOneLevel), so "where you left off" means
  // the same thing whichever screen you were actually using.
  function _sboardPersistLastTopic(topicId){
    try{
      if(!topicId || !window.T2TData || !window.T2TData.setLastInputTopic) return;
      var row=_sboardAllRowsById[topicId];
      var projRow=row?_sboardProjectRowFor(row):null;
      if(projRow && projRow.id){
        window.T2TData.setLastInputTopic(projRow.id, topicId);
        // Larry, August 1 2026 (second report): "closed Field Guide but
        // it reopened to Wish Tank again" — the desk's resume path needs
        // to know WHICH project was last active, not just the topic
        // within a fixed Wish Tank anchor. See _ideaRememberProject in
        // idea-media-shared.js.
        if(window.T2TMedia && window.T2TMedia.rememberProject) window.T2TMedia.rememberProject(projRow.id);
      }
    }catch(e){ console.warn('Storyboard persist-last-topic failed:', e); }
  }

  // Larry, August 1 2026: "the delay makes me wonder if anything is
  // happening. If you have to take more than a blink, show pocket
  // watch." Switching projects/topics in place (drilling in, climbing
  // up) re-fetches from Supabase but never went through nav()'s own
  // showTravelSpinner/hideTravelSpinner wrap — that only fires on a
  // real screen change, not a same-screen refresh. This was also the
  // window where "What do you want?" could flash as TOPIC: the chrome
  // briefly re-reads the OLD project's cached rows for the NEW
  // topicId until the fetch lands. The spinner covers that same gap.
  function _sboardSpinWhile(promise){
    var t2=T();
    if(t2 && t2.showTravelSpinner) t2.showTravelSpinner();
    var done=function(){ if(t2 && t2.hideTravelSpinner) t2.hideTravelSpinner(); };
    if(promise && typeof promise.then==='function'){ promise.then(done, done); }
    else { done(); }
  }

  // Clears the current selection AND its visual highlight. A plain
  // "_sboardSelectedHeaderId=null" isn't enough on its own once the TOPIC
  // card can be selected (Aug 21 2026) -- unlike a Header/Subheader tile,
  // the Topic card's DOM node is never rebuilt on re-render, so a
  // highlight left on it by _SBOARD_TOPIC_SENTINEL would otherwise stick
  // around forever, no longer matching the (now-null) selection state.
  function _sboardClearHeaderSelection(){
    if(_sboardSelectedHeaderId){
      var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(_sboardSelectedHeaderId))+'"]');
      if(prevEl) prevEl.classList.remove('sb-kbd-selected');
    }
    _sboardSelectedHeaderId=null;
  }

  function _sboardDrillInto(headerRow){
    // A selection from the board you're leaving doesn't mean anything on
    // the board you're drilling into -- clear it so a stray Tab/Ctrl+Down
    // afterward can't act on a header that's no longer even in view.
    _sboardClearHeaderSelection();
    T2TShared.currentTopicId=headerRow.id;
    T2TShared.filter=headerRow.id;
    _sboardPersistLastTopic(headerRow.id);
    _sboardSpinWhile(renderSeaBoard());
  }

  function _sboardGoUpOneLevel(){
    _sboardClearHeaderSelection();
    var curRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    var parentId=curRow?(curRow.cluster_id||null):null;
    T2TShared.currentTopicId=parentId;
    T2TShared.filter=parentId;
    _sboardPersistLastTopic(parentId);
    _sboardSpinWhile(renderSeaBoard());
  }

  // Ctrl+Up on a selected card -- unlike _sboardGoUpOneLevel (which always
  // climbs from the board's current Topic), this climbs from the SELECTED
  // card's own parent, whatever tier that card happens to be showing at.
  // Net effect: the selected card rises one level in the display (a
  // Subheader now renders as a Header, a Header now renders as the Topic)
  // while its former parent becomes the new Topic. Keeps the same card
  // selected afterward -- still a valid id on the freshly rendered board,
  // one tier shallower -- so repeated Ctrl+Up keeps climbing that card's
  // lineage. Aug 21 2026 (Larry: "any card, including topic").
  function _sboardDrillUpFrom(row){
    if(!row) return;
    // Bug fix, Aug 21 2026 (Larry: "ctrl-up on History of BB header --
    // nothing happened"): a top-level Header's own parent IS the current
    // Topic already, so climbing to row.cluster_id below was a silent
    // no-op for every top-level Header -- it set currentTopicId to the
    // same value it already had. A top-level Header rising one tier
    // means the row itself becomes the new Topic (the same destination
    // Ctrl+Down reaches on this same card) -- there's no shallower tier
    // to land it on above that. Only a nested Subheader (whose parent is
    // a Header, not the Topic) actually climbs to row.cluster_id below.
    if(String(row.cluster_id)===String(T2TShared.currentTopicId)){
      _sboardDrillInto(row);
      // row is now the Topic -- select the Topic card itself (Aug 21
      // 2026 sentinel) so repeated Ctrl+Up can keep climbing from here
      // without needing a fresh click on the Topic card first.
      _sboardSelectedHeaderId=_SBOARD_TOPIC_SENTINEL;
      var topicBoxEl=document.getElementById('sc-topic-box');
      if(topicBoxEl) topicBoxEl.classList.add('sb-kbd-selected');
      return;
    }
    var parentId=row.cluster_id||null;
    if(!parentId){ _sboardShowToast('Already at the top of this board.'); return; }
    var keepSelectedId=row.id;
    T2TShared.currentTopicId=parentId;
    T2TShared.filter=parentId;
    _sboardPersistLastTopic(parentId);
    _sboardSelectedHeaderId=keepSelectedId;
    _sboardSpinWhile(renderSeaBoard());
  }

  // MOVE shortcuts (Tab/Shift+Tab) -- restructures the hierarchy, unlike
  // Ctrl+Down/Ctrl+Up above which only change what you're looking at.
  // Deliberately scoped to exactly the two levels this board actually
  // renders as clickable tiles (top-level Header <-> Subber-of-a-top-
  // level-Header) -- a Subber's own children aren't drawn as tiles here,
  // so nesting a header a 3rd level deep would make it silently
  // disappear from the board; these two functions refuse rather than do
  // that. Same DB write shape (cluster_id + sort_order) and same
  // undo/redo participation as every drag-based move already in this
  // file (_sboardMoveCard, _sboardReorderHeader, etc.).
  // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
  function _sboardHeaderIsTopLevel(id){
    return _sboardTopLevelOrder.some(function(x){ return String(x)===String(id); });
  }
  async function _sboardDemoteSelectedHeader(){
    var id=_sboardSelectedHeaderId;
    var row=id && _sboardAllRowsById[id];
    var statusEl=document.getElementById('sc-status');
    function fail(msg){ if(statusEl){ statusEl.textContent=msg; statusEl.classList.add('err'); } }
    if(!row){ fail('Click a header to select it first.'); return; }
    if(row.locked){ fail('That header is locked.'); return; }
    if(!_sboardHeaderIsTopLevel(id)){ fail('That header is already nested as far as this board supports.'); return; }
    var idx=_sboardTopLevelOrder.findIndex(function(x){ return String(x)===String(id); });
    if(idx<=0){ fail('Nothing above this header to nest it under.'); return; }
    var prevId=_sboardTopLevelOrder[idx-1];
    var prevRow=_sboardAllRowsById[prevId];
    if(!prevRow || prevRow.locked){ fail('Can’t nest under a locked header.'); return; }
    var _sb=T().sb;
    var before=_sboardSnapshotRow(id);
    // Aug 22 2026: was _sboardSubberOrderByParent's own length (only
    // counted existing Subbers) -- with Subbers and cards now sharing one
    // column order, this needs the combined column's length so a newly
    // nested header doesn't land on top of a card that already holds
    // that same position number.
    var newOrder=(_sboardColumnOrderByParent[prevId]||[]).length;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:prevId, sort_order:newOrder}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:prevId, sort_order:newOrder});
      var after=_sboardSnapshotRow(id);
      _sboardPushAction({label:'Nest header', undo:function(){ return _sboardApplyRowSnapshot(id, before); }, redo:function(){ return _sboardApplyRowSnapshot(id, after); }});
      if(statusEl){ statusEl.textContent='Nested under “'+(prevRow.text_content||'that header')+'”.'; statusEl.classList.remove('err'); }
      renderSeaBoard(true);
    }catch(err){ fail('Couldn’t nest that header: '+err.message); }
  }
  async function _sboardPromoteSelectedHeader(){
    var id=_sboardSelectedHeaderId;
    var row=id && _sboardAllRowsById[id];
    var statusEl=document.getElementById('sc-status');
    function fail(msg){ if(statusEl){ statusEl.textContent=msg; statusEl.classList.add('err'); } }
    if(!row){ fail('Click a header to select it first.'); return; }
    if(row.locked){ fail('That header is locked.'); return; }
    if(_sboardHeaderIsTopLevel(id)){ fail('Already at the top level for this board.'); return; }
    if(!T2TShared.currentTopicId){ fail('Can’t make a new project this way — use + NEW PROJECT.'); return; }
    var _sb=T().sb;
    var before=_sboardSnapshotRow(id);
    var newOrder=_sboardTopLevelOrder.length;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:T2TShared.currentTopicId, sort_order:newOrder}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:T2TShared.currentTopicId, sort_order:newOrder});
      var after=_sboardSnapshotRow(id);
      _sboardPushAction({label:'Un-nest header', undo:function(){ return _sboardApplyRowSnapshot(id, before); }, redo:function(){ return _sboardApplyRowSnapshot(id, after); }});
      if(statusEl){ statusEl.textContent='Moved up to the top level.'; statusEl.classList.remove('err'); }
      renderSeaBoard(true);
    }catch(err){ fail('Couldn’t promote that header: '+err.message); }
  }

  function _sboardUpdateHeaderChrome(){
    var topicBox=document.getElementById('sc-topic-box');
    var topicText=document.getElementById('sc-topic-text');
    var topicBadge=document.getElementById('sc-topic-badge');
    var areaEl=document.getElementById('sc-header-area');
    var parentHit=document.getElementById('sc-parent-hit');
    var parentLabel=document.getElementById('sc-parent-label');
    // Root Topic never changes — "What do you want?" stays permanent regardless of depth.
    if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
      var topicRow=_sboardAllRowsById[T2TShared.currentTopicId];
      if(topicText){ topicText.textContent=topicRow.text_content||'(untitled)'; }
      if(topicBox){ topicBox.style.background=topicRow.color||''; }
      if(topicBadge){
        // Signal flags (lock/flags/notes/link), Aug 22 2026 -- Larry: "it
        // isn't working for TOPIC cards and they are cards." The TOPIC box
        // only ever rendered the assigned-person badge here; every other
        // card front (plain, header, sub-header) gets the shared
        // .sb-signal-row cluster via _sboardSignalRowHTML (see the Aug 15
        // 2026 centralization above). #sc-topic-badge sits inside
        // #sc-topic-box, which is already position:relative, so the
        // person badge (top-right) and signal row (bottom-left) both
        // position correctly as siblings here, same as on any other tile.
        topicBadge.innerHTML=_sboardAssignedBadgeHTML(topicRow)
          + _sboardSignalRowHTML(topicRow, {lock:true, flags:true, notes:true, link:true});
        if(!_sboardCardPrimaryCache.hasOwnProperty(_sboardCpKey('idea', topicRow.id))){
          _sboardEnsureCardPrimary([topicRow]).then(function(fetched){
            if(fetched) _sboardUpdateHeaderChrome();
          });
        }
        if(topicRow.assigned_user_id && !_sboardAssignedCache[topicRow.assigned_user_id]){
          _sboardEnsureAssignedInitials([topicRow]).then(function(fetched){
            if(fetched) _sboardUpdateHeaderChrome();
          });
        }
      }
      // PROJECT field dropped, Aug 13 2026 -- Title now shows/switches
      // the current board; TYPE/TITLE both re-render on every Topic
      // change so they stay in sync with whatever's actually on screen.
      _sboardRenderTypePicker();
      _sboardRenderOrgName();
      _sboardRenderTitlePicker();
      var parentId=topicRow.cluster_id||null;
      var parentRow=parentId?_sboardAllRowsById[parentId]:null;
      // PARENT is inert once there's nothing above the current Topic (i.e.
      // sitting at a project's own root) — fixed July 16, 2026. It used to
      // stay clickable here and climb all the way out to the cross-project
      // apex, which behaves like a project chooser and duplicated PROJECT.
      if(parentId && parentRow){
        if(parentLabel) parentLabel.textContent=parentRow.text_content||'(untitled)';
        if(parentHit){ parentHit.classList.remove('inert'); }
      } else {
        if(parentLabel) parentLabel.textContent='\u2014';
        if(parentHit){ parentHit.classList.add('inert'); }
      }
    } else {
      if(topicText){ topicText.textContent=_sboardGetRootPrompt(); }
      if(topicBadge){ topicBadge.innerHTML=''; }
      if(topicBox){ topicBox.style.background=''; }
      if(parentLabel) parentLabel.textContent='\u2014';
      if(parentHit){ parentHit.classList.add('inert'); }
    }
    // One traveler-chosen color paints the whole screen (header strip +
    // board area) — no more separate hardcoded navy/purple fighting it.
    // Locked July 16, 2026.
    _sboardApplyBoardBg();
    // Keep Logo the same distance off Topic as Parent, Aug 18 2026 --
    // Parent/Topic content (and their widths) just changed above, so
    // re-measure and reposition Logo every time this runs.
    _sboardPositionLogoNearTopic();
  }

  // Aug 18 2026, Larry: "allow Logo to keep same relative distance from
  // Topic as Parent." Parent sits right up against Topic's left edge with
  // a fixed column-gap (see the 3-column grid comment above, in the
  // header markup) -- that gap already tracks Topic's own box naturally,
  // since CSS grid handles it. Logo, being positioned independently by a
  // fixed percentage of the header's total width, didn't: a longer or
  // shorter Topic name changed Topic's box without moving Logo, so the
  // visual gap on Logo's side drifted out of sync with Parent's.
  //
  // Fix: measure the real gap Parent currently keeps (its right edge to
  // Topic's left edge) and re-place Logo's own frame that same distance
  // off Topic's right edge, mirrored. Two-pass measure-then-adjust
  // (place, measure where the frame actually landed, correct by the
  // difference) rather than computing Logo-wrap's left directly, because
  // the wrap is centered around its content (the frame plus the LOGO
  // label above it) -- if the label text is ever wider than the frame,
  // the wrap's own left edge and the frame's left edge aren't the same
  // point, and only the frame's position is what "distance from Topic"
  // actually means here.
  function _sboardPositionLogoNearTopic(){
    var wrap=document.getElementById('sc-logo-wrap');
    var slot=document.getElementById('sc-logo-slot');
    var topicBox=document.getElementById('sc-topic-box');
    var parentHit=document.getElementById('sc-parent-hit');
    var areaEl=document.getElementById('sc-header-area');
    if(!wrap||!slot||!topicBox||!parentHit||!areaEl) return;
    var topicRect=topicBox.getBoundingClientRect();
    var parentRect=parentHit.getBoundingClientRect();
    var areaRect=areaEl.getBoundingClientRect();
    // Guard against a not-yet-laid-out screen (zero-width rects) --
    // nothing to measure yet, leave the left:57% fallback in place.
    if(!topicRect.width || !areaRect.width) return;
    var gap=topicRect.left-parentRect.right;
    if(!(gap>=0)) gap=14; // sane fallback -- matches the grid's own column-gap
    var desiredSlotLeft=topicRect.right+gap;
    var slotRect=slot.getBoundingClientRect();
    var wrapRect=wrap.getBoundingClientRect();
    var delta=desiredSlotLeft-slotRect.left;
    wrap.style.left=((wrapRect.left-areaRect.left)+delta)+'px';
  }
  // Window resize, Aug 18 2026 -- this screen goes edge-to-edge
  // (isx-full, see screen-fit.js's own note on why it skips the global
  // auto-fit transform), so an actual browser-window resize changes
  // Topic's real rendered width directly, not just the text-scale boost
  // that renderSeaBoard already re-renders through. Same "each tool
  // decides for itself whether it's currently on screen" approach as
  // screen-fit.js's fg-text-scale-changed listener above -- no-ops
  // instantly whenever this screen isn't the one showing.
  window.addEventListener('resize', function(){
    try{
      var scr=document.getElementById('s-sea-of-ideas-cluster');
      if(scr && scr.classList.contains('active')) _sboardPositionLogoNearTopic();
    }catch(e){}
  });

  async function _sboardMoveCard(itemId, headerId){
    if(_sboardAllRowsById[itemId] && _sboardAllRowsById[itemId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(itemId);
    try{
      // Aug 22 2026: was _sboardIdeaOrderByParent's own length (only
      // counted plain cards) -- with Subbers and cards now sharing one
      // column order, "the bottom of the column" has to mean past both,
      // or a fresh drop could land in the middle of the Subbers instead
      // of truly at the end.
      var siblingCount=(_sboardColumnOrderByParent[headerId]||[]).length;
      // .select() + row-count check, Aug 22 2026 -- same fix as the
      // reorder functions above (Larry: moves that silently didn't
      // save). Without this, a write that matches zero rows still comes
      // back with no .error, so it looked like the move worked even
      // when nothing was touched.
      var upd=await _sb.from('ideas').update({cluster_id:headerId, sort_order:siblingCount}).eq('id',itemId).select('id');
      if(upd.error) throw upd.error;
      if(!upd.data || !upd.data.length) throw new Error('Save was blocked (no rows matched) -- nothing moved.');
      _sboardPatchRow(itemId, {cluster_id:headerId, sort_order:siblingCount});
      if(before){
        var after=_sboardSnapshotRow(itemId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(itemId, before); }, redo:function(){ return _sboardApplyRowSnapshot(itemId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  // Drop a card OR a Subber onto another card/Subber in the same column --
  // unified Aug 22 2026 (Larry: "sub-headers always cluster to the top...
  // I want to mix them into the story"). Used to be two separate
  // functions (_sboardReorderOrMoveIdea / _sboardReorderOrMoveSubber),
  // each only able to reorder within its own kind, matching the two
  // separately-numbered lists the column used to render from. This one
  // reorders against the single shared _sboardColumnOrderByParent instead,
  // so a Subber and a plain card can trade places freely and land exactly
  // where dropped, interleaved. Reorders among siblings if the dragged
  // card is already in this column, or moves + inserts at that position
  // if it's coming from somewhere else — one gesture covers both, same as
  // the two functions it replaces.
  async function _sboardReorderOrMoveColumnItem(draggedId, targetId, parentId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    if(_sboardAllRowsById[draggedId] && _sboardAllRowsById[draggedId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(draggedId);
    var ids=(_sboardColumnOrderByParent[parentId]||[]).slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    if(fromIdx!==-1) ids.splice(fromIdx,1);
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    var insertAt=toIdx===-1?ids.length:(insertAfter?toIdx+1:toIdx);
    ids.splice(insertAt, 0, draggedId);
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      // .select() added Aug 22 2026 -- Larry: "moved word wall sub-header
      // to card order number 4. It did not move" (and, separately, a
      // subber wouldn't move above it either). Without .select(), Supabase
      // returns success with zero rows touched if a write gets filtered
      // out for any reason (RLS, a stale/mismatched id, etc.) -- the old
      // code only checked .error, which stays null in that case, so the
      // screen showed the reorder as done while nothing was actually
      // saved. Now checks the real row count and surfaces a visible error
      // (see statusEl below) the moment a write silently no-ops, instead
      // of pretending it worked.
      var updCluster=await _sb.from('ideas').update({cluster_id:parentId}).eq('id',draggedId).select('id');
      if(updCluster.error) throw updCluster.error;
      if(!updCluster.data || !updCluster.data.length) throw new Error('Save was blocked for this card (no rows matched) -- nothing moved.');
      _sboardPatchRow(draggedId, {cluster_id:parentId});
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]).select('id');
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Save was blocked for one of the cards in this column (no rows matched) -- reorder stopped partway.');
        _sboardPatchRow(ids[i], {sort_order:i});
      }
      if(before){
        var after=_sboardSnapshotRow(draggedId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(draggedId, before); }, redo:function(){ return _sboardApplyRowSnapshot(draggedId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent='Reordering needs the sort_order Supabase column: '+err.message; statusEl.classList.add('err'); }
    }
  }

  // Reorders top-level Headers among each other. Also handles promoting a
  // Subber up to Header level, Aug 3 2026 -- dropping a Subber onto a
  // Header's left/right edge (see the 'hd' drop handler below) used to
  // silently do nothing, because this function only ever knew how to
  // reshuffle cards that were already top-level (fromIdx===-1 bailed out
  // immediately). Now a dragged card that isn't already top-level is
  // treated as a promotion: its parent link is cleared (making it a real
  // standalone Header) on top of the normal reorder.
  async function _sboardReorderHeader(draggedId, targetId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    var statusEl=document.getElementById('sc-status');
    var before=_sboardSnapshotRow(draggedId);
    var ids=_sboardTopLevelOrder.slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(toIdx===-1) return;
    var wasTopLevel=fromIdx!==-1;
    if(wasTopLevel) ids.splice(fromIdx,1);
    var insertAt=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(insertAfter) insertAt+=1;
    ids.splice(insertAt,0,draggedId);
    var _sb=T().sb;
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      if(!wasTopLevel){
        // Bug fix, Aug 3 2026 -- Larry: "I think a header was just made a
        // subber instead of changing order? I moved it back to header
        // level and it might have disappeared." Root cause: this always
        // promoted a dragged Subber with cluster_id:null, which is only
        // correct when "header level" means the absolute project apex.
        // On a real Topic's own board -- the normal case -- its headers
        // all share that Topic's own id as cluster_id, not null.
        // Promoting to null yanked the Subber all the way out to become
        // its own brand-new top-level project, invisible from wherever
        // it was actually being viewed -- exactly what read as
        // "disappeared."
        //
        // Second pass, same day -- Larry, after the immediate fix: "it
        // was just a test header for moving in various locations, none
        // of which were to create a new project which should ONLY happen
        // in one spot." That's a stronger rule than "use the right id" --
        // this drag gesture must never be able to spawn a new top-level
        // project at all, full stop; that's the "+ NEW PROJECT" flow's
        // job alone. So rather than falling back to cluster_id:null at
        // the true apex (still technically "creating a project" via a
        // drag), promoting with nowhere real to land is refused outright
        // -- same shape as every other guarded action in this file, a
        // status message instead of a silent wrong result.
        if(!T2TShared.currentTopicId){
          if(statusEl){ statusEl.textContent='Can\'t make a new project this way — use + NEW PROJECT.'; statusEl.classList.add('err'); }
          return;
        }
        var updCluster=await _sb.from('ideas').update({cluster_id:T2TShared.currentTopicId}).eq('id',draggedId).select('id');
        if(updCluster.error) throw updCluster.error;
        if(!updCluster.data || !updCluster.data.length) throw new Error('Save was blocked for this card (no rows matched) -- nothing moved.');
        _sboardPatchRow(draggedId, {cluster_id:T2TShared.currentTopicId});
      }
      // .select() + row-count check, Aug 22 2026 -- same silent-no-op fix
      // as the nested-column reorder functions above.
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]).select('id');
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Save was blocked for one of the headers in this row (no rows matched) -- reorder stopped partway.');
        _sboardPatchRow(ids[i], {sort_order:i});
      }
      if(before){
        var after=_sboardSnapshotRow(draggedId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(draggedId, before); }, redo:function(){ return _sboardApplyRowSnapshot(draggedId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent='Reordering needs the sort_order Supabase column: '+err.message; statusEl.classList.add('err'); }
    }
  }

  function openSbHeaderDetail(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var options='<option value="">— Top level —</option>'+_sboardHeaderList
      .filter(function(h){ return String(h.id)!==String(headerRow.id); })
      .map(function(h){ return '<option value="'+h.id+'">'+h.text_content+'</option>'; }).join('');
    var safeName=(headerRow.text_content||'').replace(/"/g,'&quot;');
    var apexTag=(!headerRow.cluster_id)?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Name</label>'
      +'<input id="sb-h-name" type="text" value="'+safeName+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px;box-sizing:border-box">'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Nest under</label>'
      +'<select id="sb-h-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-h-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-h-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-h-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-h-parent');
    if(sel) sel.value=headerRow.cluster_id||'';
    T().wire('sb-h-save', async function(){
      var errEl=document.getElementById('sb-h-err');
      var newName=(document.getElementById('sb-h-name')||{}).value||'';
      newName=newName.trim();
      if(!newName){ if(errEl) errEl.textContent='Name can\'t be empty.'; return; }
      try{
        var newParent=sel.value||null;
        var upd=await _sb.from('ideas').update({cluster_id:newParent,text_content:newName}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Nothing changed — the header may not have matched.');
        _sboardPatchRow(headerRow.id, {cluster_id:newParent,text_content:newName});
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
    T().wire('sb-h-close', closeSbDetail);
  }

  async function openSbHeaderPeek(headerRow, onBack){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-peek-card">'
      +'<div class="sc-peek-topbar"><button id="sb-peek-back">⬅️</button><div class="sc-peek-title">'+safeName+'</div><button id="sb-peek-edit" title="Rename or move">✏️</button></div>'
      +'<div id="sb-peek-body" style="text-align:center;font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;padding:20px 0">Loading…</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-peek-back', onBack||closeSbDetail);
    // Rename/reparent lives here now, reusing the existing dialog — one place
    // to edit a header's name or nest it elsewhere, reachable from both the
    // board's own HEADER view-as button and CLUSTER's bucket peek.
    T().wire('sb-peek-edit', function(){ openSbHeaderDetail(headerRow); });
    var body=document.getElementById('sb-peek-body');
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board')
        .eq('cluster_id',headerRow.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(200);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      if(!rows.length){
        body.textContent='Nothing under this Header yet.';
        return;
      }
      var subRows=rows.filter(function(r){ return r.content_type==='header'; });
      var itemRows=rows.filter(function(r){ return r.content_type!=='header'; });
      var _peekMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
      // Aug 11 2026 -- Larry (bug report): "Subber Peek screen on Apple
      // needs to clearly view every card." Root cause -- tile size here
      // grew with the text-size boost multiplier, but nothing ever checked
      // that three tiles + two gaps still fit inside the peek card. On an
      // iPhone-width screen with Larger/Largest boost on, the 3rd column
      // got pushed past the card's edge and, at the largest step, off the
      // screen entirely with no way to scroll to it. Cap tile size to
      // whatever the peek card can actually hold so all three columns
      // always fit, on any screen, at any boost level -- boost still grows
      // tiles wherever there's slack, it just can't push cards out of view
      // anymore.
      var _peekOverlayContentW=window.innerWidth-40; // .sb-overlay's 20px padding, both sides
      var _peekCardW=Math.min(360,_peekOverlayContentW*0.94)-28; // .sc-peek-card's width:min(360px,94%) minus its own 14px*2 padding
      var _peekMaxTile=Math.floor((_peekCardW-20)/3); // minus two 10px gaps, split three ways
      var _peekTile=Math.max(56, Math.min(Math.round(84*_peekMult), _peekMaxTile));
      var grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(3,'+_peekTile+'px);gap:10px;justify-content:center';
      subRows.forEach(function(sub){ grid.appendChild(_sboardMakeHeaderStackTile(sub, _peekTile, _peekTile, true)); });
      itemRows.forEach(function(item){ grid.appendChild(_sboardMakeTile(item, _peekTile, true)); });
      body.innerHTML='';
      body.style.cssText='';
      body.appendChild(grid);
    }catch(err){
      body.textContent=err.message;
      body.style.color='#b8562f';
    }
  }

  // Signal Flag peek, Aug 15 2026 (Larry: click-and-hold a flag to see
  // "all the cards with blue stars," same 550ms hold as the header-stack
  // peek above -- "consistent process to see what is inside"). Twin of
  // openSbHeaderPeek: same overlay, same grid, same tile renderers --
  // just filtered by key_slot_1/2/3 instead of cluster_id. Signal Flags
  // are a genuinely shared concept (one custom_keys table, both boards --
  // see _sboardSyncKeyLinks above), so this also checks briefing_cards
  // and lists any matches there as a simple jump-list underneath the
  // grid, rather than building a second full tile-grid renderer for a
  // different card shape.
  async function openSbKeyPeek(keyObj, onBack){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=_sboardEsc(keyObj.meaning||'Signal Flag');
    var swatchHTML='<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;'+_sboardKeyShapeCSS(keyObj.shape,keyObj.color)+'"></span>';
    // Aug 15 2026 (Larry: "does not look the same -- Idea Board has
    // return arrow, BB has X... make it like BB card") -- topbar now
    // matches the Briefing Board overlay's own layout: title on the
    // left, a single X on the right, no back-arrow.
    ov.innerHTML='<div class="sc-peek-card">'
      +'<div class="sc-peek-topbar" style="justify-content:space-between"><div class="sc-peek-title" style="text-align:left;flex:1">'+swatchHTML+safeName+'</div><button id="sb-keypeek-back" title="Close" style="width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #1a3a5c;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#1a3a5c">\u2715</button></div>'
      +'<div id="sb-keypeek-body" style="text-align:center;font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;padding:20px 0">Loading…</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-keypeek-back', onBack||closeSbDetail);
    var body=document.getElementById('sb-keypeek-body');
    var _sb=T().sb;
    // Aug 15 2026 (Larry: "make it like BB card") -- every match in
    // this peek, from either board, now renders with the exact same
    // card look (the Briefing Board's own warm/brown .bb-card style,
    // hand-matched here since this file doesn't share BB's stylesheet)
    // instead of the native square tile grid. The group label above
    // each set already says which board it's from, so the card itself
    // doesn't need a different shape or color to say it again.
    function _skpCardStyle(){
      return 'width:100%;box-sizing:border-box;cursor:pointer;background:#FFFDF7;border:1px solid #9c8b73;border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1.3;color:#3B2510;font-family:inherit';
    }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board')
        .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
        .order('created_at',{ascending:true}).limit(200);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];

      var cardRows=[];
      try{
        // Aug 15 2026 (Larry: "there might be many different boards of
        // each type... must include the TITLE") -- embeds the parent
        // board's own name via the existing board_id foreign key, so
        // each match can be grouped and labeled by its real board,
        // never a generic bucket. Disambiguated !board_id since
        // briefing_cards has a second FK into briefing_boards
        // (shared_to_board_id) that would otherwise make this ambiguous.
        var cardRes=await _sb.from('briefing_cards').select('id,task,board_id,briefing_boards!board_id(name)').or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id).eq('archived',false).limit(200);
        if(!cardRes.error) cardRows=cardRes.data||[];
      }catch(e){}

      if(!rows.length && !cardRows.length){
        body.textContent='No cards carry this Signal Flag yet.';
        return;
      }
      body.innerHTML='';
      body.style.cssText='';

      if(rows.length){
        // Group Idea Board matches by which board (TOPIC) they actually
        // live on -- topic_scope_id is the nearest TOPIC-or-root
        // ancestor, same id briefing_boards.storyboard_project_id keys
        // off of, and that ancestor's own text_content is the board's
        // real title (same resolution the header->card sync already
        // uses). A traveler can have many independent boards of this
        // type (Field Guide, LifeWave, a delegated TOPIC, etc.), so one
        // ungrouped list would blur matches from unrelated boards
        // together.
        var scopeIds=[]; var seenScope={};
        rows.forEach(function(r){
          if(r.topic_scope_id && !seenScope[r.topic_scope_id]){ seenScope[r.topic_scope_id]=true; scopeIds.push(r.topic_scope_id); }
        });
        var scopeNameById={};
        if(scopeIds.length){
          try{
            var scopeRes=await _sb.from('ideas').select('id,text_content').in('id', scopeIds);
            (scopeRes.data||[]).forEach(function(s){ scopeNameById[s.id]=s.text_content||'Untitled Board'; });
          }catch(e){}
        }
        var byScope={}; var scopeOrder=[];
        rows.forEach(function(r){
          var sid=r.topic_scope_id||'';
          if(!byScope[sid]){ byScope[sid]=[]; scopeOrder.push(sid); }
          byScope[sid].push(r);
        });
        scopeOrder.forEach(function(sid, idx){
          var groupRows=byScope[sid];
          var boardName=scopeNameById[sid]||'Idea Board';
          var lbl=document.createElement('div');
          lbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:700;margin:'+(idx?'14px':'0')+' 0 6px;text-align:left';
          lbl.textContent='On the '+boardName+' Idea Board:';
          body.appendChild(lbl);
          var grid=document.createElement('div');
          grid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupRows.forEach(function(r){
            var isHeader=(r.content_type==='header');
            var card=document.createElement('div');
            card.style.cssText=_skpCardStyle();
            card.textContent=r.text_content||'(untitled)';
            card.addEventListener('click', function(){
              if(isHeader) openSbHeaderDetail(r); else openSbDetail(r);
            });
            grid.appendChild(card);
          });
          body.appendChild(grid);
        });
      } else {
        var noneMsg=document.createElement('div');
        noneMsg.style.cssText='font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;margin-bottom:8px';
        noneMsg.textContent='No Idea Board cards carry this flag yet.';
        body.appendChild(noneMsg);
      }

      if(cardRows.length){
        var byBoard={}; var boardOrder=[];
        cardRows.forEach(function(c){
          var bid=c.board_id||'';
          if(!byBoard[bid]){ byBoard[bid]=[]; boardOrder.push(bid); }
          byBoard[bid].push(c);
        });
        var bbOuter=document.createElement('div');
        bbOuter.style.cssText='margin-top:12px;text-align:left;border-top:1px solid #e3d9c6;padding-top:8px';
        boardOrder.forEach(function(bid, idx){
          var groupCards=byBoard[bid];
          var boardName=(groupCards[0].briefing_boards && groupCards[0].briefing_boards.name) || 'Untitled Board';
          var bbLbl=document.createElement('div');
          bbLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px';
          bbLbl.textContent='On the '+boardName+' Briefing Board:';
          bbOuter.appendChild(bbLbl);
          var bbGrid=document.createElement('div');
          bbGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupCards.forEach(function(c){
            var b=document.createElement('div');
            b.style.cssText=_skpCardStyle();
            b.textContent=c.task||'(untitled)';
            b.addEventListener('click', function(){
              try{
                sessionStorage.setItem('bp_target','4010');
                sessionStorage.setItem('fg_open_card_id', c.id);
              }catch(e){}
              window.open(location.pathname+location.search, '_blank');
            });
            bbGrid.appendChild(b);
          });
          bbOuter.appendChild(bbGrid);
        });
        body.appendChild(bbOuter);
      }
    }catch(err){
      body.textContent=err.message;
      body.style.color='#b8562f';
    }
  }

  function _sboardIsAutoHeaderText(text){
    return /[:?]\s*$/.test(text);
  }

  function openQuickAddIdea(){
    var ov=document.getElementById('sb-detail-overlay');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Add an idea</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">'+(T2TShared.currentTopicId && _sboardHeadersById[T2TShared.currentTopicId] ? 'Goes under '+_sboardHeadersById[T2TShared.currentTopicId].text_content : 'Goes into NEW')+'</div>'
      +'<textarea id="qa-idea-text" placeholder="What if…?" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:4px;min-height:70px"></textarea>'
      +'<div style="font-size:calc(9px * var(--fg-text-scale,1));font-style:italic;color:#a3907a;margin-bottom:6px">End with : or ? to make it a Header automatically</div>'
      +'<div id="qa-idea-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="qa-idea-save" style="flex:1">Save</button><button class="sc-ov-btn" id="qa-idea-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var ta=document.getElementById('qa-idea-text');
    if(ta){
      setTimeout(function(){ ta.focus(); },50);
      ta.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('qa-idea-save').click(); }
      });
    }
    T().wire('qa-idea-close', closeSbDetail);
    T().wire('qa-idea-save', async function(){
      var text=(document.getElementById('qa-idea-text')||{}).value||'';
      text=text.trim();
      if(!text) return;
      var errEl=document.getElementById('qa-idea-err');
      var _sb=T().sb;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var contentType=_sboardIsAutoHeaderText(text)?'header':'text';
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:contentType,text_content:text,cluster_id:T2TShared.filter||null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        _sboardAddRow(ins.data);
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
  }

  // One click, one swatch — recolors every header currently on this board
  // level (Purpose, MISC, NEW, and every visible content header) instead of
  // opening each one's SHAPING card individually.
  // Fix orphaned Purpose/Ideas headers — added July 12, 2026. Purpose and
  // the Ideas bucket used to be scoped to cluster_id=null, back when there
  // was only ever one project — that assumption broke the moment a second
  // real project (Field Guide) existed, since null stopped meaning "the
  // project" and started meaning "no project," with both projects'
  // top-level pills rendering alongside orphaned Purpose/Ideas rows that
  // looked like they belonged to a shared fake container. The ongoing
  // render logic is already fixed (see renderSeaBoard); this is the
  // one-time sweep for rows that were already created under the old rule.
  // Scans first, shows exactly what it found, only touches rows on
  // explicit confirm — never moves arbitrary idea content, only the three
  // known reserved header types this bug could have produced.
  async function _sboardOpenFixOrphansConfirm(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var wt=await T2TMedia.ensureWishTank();
      if(!wt || !wt.id) throw new Error('Wish Tank unavailable: '+(wt&&wt.error?wt.error:'unknown'));
      var res=await _sb.from('ideas').select('id,text_content').eq('user_id',user.id)
        .eq('content_type','header').is('cluster_id',null)
        .in('text_content',['Purpose','NEW','New Additions','MISC']);
      if(res.error) throw new Error(res.error.message);
      var orphans=(res.data||[]).filter(function(r){ return String(r.id)!==String(wt.id); });
      var ov2=document.getElementById('sb-detail-overlay');
      if(!orphans.length){
        ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Nothing to fix</div>'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">No orphaned Purpose or Ideas headers found at the shared root.</div>'
          +'<button class="sc-ov-btn" id="sb-fix-close" style="width:100%" aria-label="Close">✕</button></div>';
        ov2.classList.add('active');
        T().wire('sb-fix-close', closeSbDetail);
        return;
      }
      var listHTML=orphans.map(function(o){ return '<div style="font-size:calc(12px * var(--fg-text-scale,1));padding:3px 0">• '+(o.text_content||'(untitled)')+'</div>'; }).join('');
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Found '+orphans.length+' orphaned header(s)</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:8px">These will move under Wish Tank. The Ideas header will be renamed "Wish Tank Ideas". Field Guide is untouched — it gets its own fresh Purpose and Ideas headers automatically the next time you open it.</div>'
        +'<div style="text-align:left;margin-bottom:10px">'+listHTML+'</div>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-fix-go" style="flex:1">Fix it</button><button class="sc-ov-btn" id="sb-fix-cancel" style="flex:1">Cancel</button></div>'
        +'</div>';
      ov2.classList.add('active');
      T().wire('sb-fix-cancel', closeSbDetail);
      T().wire('sb-fix-go', async function(){
        try{
          for(var i=0;i<orphans.length;i++){
            var o=orphans[i];
            var newName=(o.text_content==='Purpose')?'Purpose':(o.text_content==='MISC'?'MISC':'Wish Tank Ideas');
            var upd=await _sb.from('ideas').update({cluster_id:wt.id,text_content:newName}).eq('id',o.id);
            if(upd.error) throw upd.error;
            _sboardPatchRow(o.id, {cluster_id:wt.id,text_content:newName});
          }
          closeSbDetail();
          renderSeaBoard(true);
        }catch(err){
          var errBox=document.querySelector('.sc-overlay-card');
          if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
        }
      });
    }catch(err){
      var statusEl=document.getElementById('sc-status');
      if(statusEl){ statusEl.textContent='Fix failed: '+err.message; statusEl.classList.add('err'); }
    }
  }

  function _sboardOpenRecolorAll(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var swatches=_sboardColorPalette.map(function(c){
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer"></button>';
    }).join('');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all headers</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">Pick one — every header on this board, including Purpose, MISC and NEW, gets it.</div>'
      +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+swatches+'</div>'
      +'<button class="sc-ov-btn" id="sb-recolor-close" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-recolor-close', closeSbDetail);
    ov.querySelectorAll('.sb-swatch').forEach(function(sw){
      sw.onclick=async function(){
        var c=sw.getAttribute('data-c');
        var ids=[_sboardPurposeId,_sboardMiscId,_sboardNewAdditionsId]
          .concat((_sboardVisibleHeaders||[]).map(function(h){ return h.id; }))
          .filter(Boolean);
        var uniq=ids.filter(function(id,idx){ return ids.indexOf(id)===idx; });
        var _sb=T().sb;
        try{
          for(var i=0;i<uniq.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',uniq[i]); _sboardPatchRow(uniq[i], {color:c}); }
        }catch(e){}
        T().setDefaultHeaderColor(c);
        closeSbDetail();
        renderSeaBoard(true);
      };
    });
  }

  // Sort headers — Larry, Aug 3 2026: "I would like to toggle headers into
  // alphabetical order or number order in gear." Dragging one header at a
  // time already works but is slow to arrange a whole row by hand; this
  // computes the full order in one pass and writes it in one bulk
  // operation, wrapped in the same pocket-watch spinner
  // _sboardSpinWhile already gives every screen change (see the header
  // drag-drop handlers above) so a long row doesn't look frozen while the
  // sequential Supabase writes run.
  //
  // Only the real content headers move -- Purpose, NEW ("New Additions"),
  // and MISC are auto-managed, reserved headers with their own fixed
  // conventional spots (first, second, and always-last respectively —
  // see _rowPriority in renderSeaBoard) and are deliberately left exactly
  // where they already sit.
  function _sboardOpenSortHeadersPicker(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var headers=(_sboardVisibleHeaders||[]).filter(function(h){
      return String(h.id)!==String(_sboardNewAdditionsId);
    });
    if(headers.length<2){
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Nothing to sort</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">This board needs at least two headers before an order means anything.</div>'
        +'<button class="sc-ov-btn" id="sb-sort-close" style="width:100%" aria-label="Close">✕</button></div>';
      ov.classList.add('active');
      T().wire('sb-sort-close', closeSbDetail);
      return;
    }
    // Larry, Aug 3 2026: "If headers or subbers are sorted alphabetically
    // the order number does NOT change, allowing to resort to number
    // order." Redesigned around that: A -> Z is now a temporary, unsaved
    // DISPLAY-only rearrangement (_sboardAlphaHeaderView, consulted by
    // renderSeaBoard) -- it never writes sort_order, so every card's real
    // ORDER # badge keeps showing its true position the whole time it's
    // active. Number order simply switches that view back off -- also no
    // write, since the real order was never touched to begin with.
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Sort headers</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">A → Z is just a look -- it never changes anyone\'s ORDER #. Number order always brings back the real arrangement.</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
      +'<button class="sc-ov-btn" id="sb-sort-alpha" style="width:100%">A → Z</button>'
      +'<button class="sc-ov-btn" id="sb-sort-number" style="width:100%">Number order</button>'
      +'</div>'
      +'<button class="sc-ov-btn" id="sb-sort-close" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-sort-close', closeSbDetail);
    T().wire('sb-sort-alpha', function(){ closeSbDetail(); _sboardSetAlphaHeaderView(true); });
    T().wire('sb-sort-number', function(){ closeSbDetail(); _sboardSetAlphaHeaderView(false); });
  }

  // No Supabase round trip either way now, so no spinner needed -- this
  // is purely an in-memory view flag plus a re-render, done before the
  // click handler above even returns.
  function _sboardSetAlphaHeaderView(on){
    _sboardAlphaHeaderView=!!on;
    renderSeaBoard(true);
  }

  // Gear menu — consolidates the traveler options that used to be separate
  // top-row buttons (recolor all headers, fix orphaned Purpose/Ideas
  // headers, full screen) into one place, leaving only Gear and X visible.
  // Locked July 16, 2026.
  // Named (not inline) as of Aug 3 2026 so the desk's own Idea Board
  // toggle button (screen-zero.js, second tap while the Storyboard is
  // already open) can call this exact same close routine via
  // T2TStoryboard.closeBoard, instead of the generic T2T.goBack() --
  // that generic path still treats 1010 as an old backpack-hub utility
  // screen (still listed in backpack.js's _utilScreens) and reopens the
  // obsolete \u2630 backpack menu instead of actually closing the board.
  // Larry, Aug 3 2026: "closing storyboard went to obsolete backpack
  // rather than to storyboard button." Moved to this outer scope (was
  // an inline handler inside injectSeaOfIdeasCluster) specifically so
  // T2TStoryboard.closeBoard, assigned further down in this same outer
  // scope, can actually reference it.
  function _sboardCloseBoard(){
    var fgr=document.getElementById('fg-root'); if(fgr){ fgr.classList.remove('sb-wide'); fgr.classList.remove('isx-full'); }
    if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
    T2TShared.currentTopicId=null; T2TShared.filter=null;
    // Return override, added July 21, 2026 for the Briefing Board's
    // Unhooking Ideas hand-off -- if whoever sent us here asked to be
    // returned to specifically (e.g. the Hang-Up card that opened
    // this board), honor that before falling back to the normal
    // chapter-flow / backpack rules below.
    var returnOverride = T().consumeReturnOverride && T().consumeReturnOverride();
    if(returnOverride){ returnOverride(); return; }
    var viaChapter = T().consumeSeaChapterEntry();
    if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
    else { T().goBackStack(); }
  }

  // Team Roster (Aug 8 2026) -- same locked design as the Briefing
  // Board's Settings > Team: reads like it would print, email/phone
  // always visible, an always-on Notes field per person, role symbol
  // doubles as the picker trigger. Scoped to the current PROJECT (the
  // fractal root storyboard_members already keys off of), resolved via
  // the same climb-to-root helper the PROJECT switcher uses.
  var _tmRosterCache = [];
  var _tmRosterOwner = null;
  var _tmRosterIsOwner = false;
  var _tmRosterIsLeader = false; // Aug 13 2026, Larry: Owner-or-Leader can now manage the Cast too
  var _tmRosterCanManage = false; // = _tmRosterIsOwner || _tmRosterIsLeader
  var _tmAllMembersCache = null; // list_members_for_picker() results, fetched once per session
  async function _tmFetchAllMembers(){
    if(_tmAllMembersCache) return _tmAllMembersCache;
    var _sb=T().sb; if(!_sb) return [];
    try{
      var res=await _sb.rpc('list_members_for_picker');
      _tmAllMembersCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _tmAllMembersCache=[]; }
    return _tmAllMembersCache;
  }
  function _tmRenderMemberSuggestions(projectRow, query, targetId){
    var box=document.getElementById(targetId||'tm-add-suggest'); if(!box) return;
    var already={}; _tmAllRosterRows(projectRow).forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    var pool=(_tmAllMembersCache||[]).filter(function(m){ return !already[m.user_id]; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone\u2019s already in this Cast.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc9710(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc9710(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc9710(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  function _sboardCurrentProjectRow(){
    if(!T2TShared.currentTopicId || !_sboardAllRowsById[T2TShared.currentTopicId]) return null;
    return _sboardProjectRowFor(_sboardAllRowsById[T2TShared.currentTopicId]);
  }

  function _tmRoleSymbol(m){
    if(m.isOwner) return '\uD83D\uDC51';
    if(m.role==='sponsor') return '\uD83C\uDF31';
    if(m.role==='leader') return '\uD83C\uDFAF';
    if(m.is_facilitator) return '\uD83C\uDFA4';
    if(m.can_facilitate) return '\u2726';
    return '\u2610';
  }
  function _tmRoleTitle(m){
    if(m.isOwner) return 'Owner';
    if(m.role==='sponsor') return 'Sponsor';
    if(m.role==='leader') return 'Leader';
    if(m.is_facilitator) return 'Facilitator';
    if(m.can_facilitate) return 'Facilitator-qualified';
    return 'Cast Member';
  }

  async function _tmLoadRoster(projectRow){
    var _sb=T().sb; if(!_sb || !projectRow) return;
    var uid=(await _sb.auth.getUser()).data.user;
    uid=uid?uid.id:null;
    // Fractal Casting (Aug 9 2026): a delegated TOPIC's Owner isn't the
    // header row's original creator (user_id) -- it's whoever it was
    // delegated to, tracked via topic_owner_user_id and mirrored into
    // storyboard_members (role='owner') by delegate_topic() so the same
    // roster RPC already returns it. Root PROJECTs and plain headers are
    // unaffected -- same creator-is-Owner convention as always.
    var isTopic = !!projectRow.topic_owner_user_id;
    _tmRosterIsOwner = !!uid && (isTopic ? projectRow.topic_owner_user_id===uid : projectRow.user_id===uid);
    try{
      var res=await _sb.rpc('list_storyboard_members', {p_project_id: projectRow.id});
      var all=(!res.error && res.data) ? res.data : [];
      if(isTopic){
        var ownerRow=all.find(function(m){ return m.role==='owner'; });
        _tmRosterOwner = ownerRow ? {user_id:ownerRow.user_id, name:ownerRow.name, email:ownerRow.email, initials:ownerRow.initials, phone:ownerRow.phone} : null;
        // View-only visitors (Aug 8 2026) aren't Team members -- they show
        // up in People > Manage Access only, not in the role-based roster.
        // The owner row is pulled out above so it renders via the crown
        // bucket instead of doubling as a regular Cast row.
        _tmRosterCache = all.filter(function(m){ return m.role!=='owner' && (m.access_level||'edit')==='edit'; });
      } else {
        try{
          var ownerRes=await _sb.from('members').select('user_id,name,email,initials,phone').eq('user_id', projectRow.user_id).maybeSingle();
          _tmRosterOwner = (!ownerRes.error && ownerRes.data) ? ownerRes.data : null;
        }catch(e){ _tmRosterOwner=null; }
        _tmRosterCache = all.filter(function(m){ return (m.access_level||'edit')==='edit'; });
      }
    }catch(e){ _tmRosterCache=[]; _tmRosterOwner=null; }
    // Owner-or-Leader (Aug 13 2026, Larry): a Leader can now add members
    // and change others' roles too, everywhere that ability exists --
    // Gear's Team screen and the VIEW dropdown's own add-row.
    _tmRosterIsLeader = !!uid && (_tmRosterCache||[]).some(function(m){ return String(m.user_id)===String(uid) && m.role==='leader'; });
    _tmRosterCanManage = _tmRosterIsOwner || _tmRosterIsLeader;
  }

  function _tmAllRosterRows(projectRow){
    var rows=[];
    if(_tmRosterOwner) rows.push({user_id:_tmRosterOwner.user_id, name:_tmRosterOwner.name, email:_tmRosterOwner.email, phone:_tmRosterOwner.phone, isOwner:true, role:null, can_facilitate:true, is_facilitator:false, notes:(projectRow&&projectRow.owner_notes)||''});
    (_tmRosterCache||[]).forEach(function(m){ rows.push({user_id:m.user_id, name:m.name, email:m.email, phone:m.phone, isOwner:false, role:m.role, can_facilitate:m.can_facilitate, is_facilitator:m.is_facilitator, notes:m.notes||''}); });
    return rows;
  }

  function _esc9710(s){ return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  function _tmRenderRoster(projectRow){
    var wrap=document.getElementById('tm-list-view'); if(!wrap) return;
    var rows=_tmAllRosterRows(projectRow);
    wrap.innerHTML = rows.map(function(m){
      var clickable = (!m.isOwner && _tmRosterCanManage);
      var panel = (!m.isOwner) ? (
        '<div class="tm-rolepanel" id="tm-rp-'+_esc9710(m.user_id)+'" style="display:none">'
          +'<label><input type="radio" name="tm-sp" class="tm-r-sponsor" data-uid="'+_esc9710(m.user_id)+'"'+(m.role==='sponsor'?' checked':'')+'> \uD83C\uDF31 Sponsor</label>'
          +'<label><input type="radio" name="tm-tl" class="tm-r-leader" data-uid="'+_esc9710(m.user_id)+'"'+(m.role==='leader'?' checked':'')+'> \uD83C\uDFAF Leader</label>'
          +'<label><input type="checkbox" class="tm-r-canfac" data-uid="'+_esc9710(m.user_id)+'"'+(m.can_facilitate?' checked':'')+'> \u2726 Facilitator-qualified</label>'
          +'<label><input type="radio" name="tm-fac" class="tm-r-fac" data-uid="'+_esc9710(m.user_id)+'"'+(m.is_facilitator?' checked':'')+'> \uD83C\uDFA4 Facilitator</label>'
        +'</div>'
      ) : '';
      var contactLine, notesLine;
      if(m.isOwner){
        contactLine = '<div class="tm-contact">\u2709 '+_esc9710(m.email||'')+' &nbsp;&nbsp; \u260E <input type="text" class="tm-phone-input tm-owner-phone" placeholder="Add phone" value="'+_esc9710(m.phone||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input tm-owner-notes" placeholder="\u2014" value="'+_esc9710(m.notes||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
      } else {
        var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc9710(m.phone)) : '';
        contactLine = '<div class="tm-contact">\u2709 '+_esc9710(m.email||'')+phoneLine+'</div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input" data-uid="'+_esc9710(m.user_id)+'" placeholder="\u2014" value="'+_esc9710(m.notes||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
      }
      return '<div class="tm-row">'
        +'<div class="tm-sym'+(clickable?' tm-clickable':'')+'" '+(clickable?'data-uid="'+_esc9710(m.user_id)+'"':'')+'>'+_tmRoleSymbol(m)+'</div>'
        +'<div class="tm-body">'
          +'<div class="tm-name">'+_esc9710(m.name||m.email||'')+' <span class="tm-role">&middot; '+_tmRoleTitle(m)+'</span></div>'
          +contactLine
          +notesLine
          +panel
        +'</div>'
      +'</div>';
    }).join('');
    var addTile=document.getElementById('tm-add-tile');
    if(addTile) addTile.style.display = _tmRosterCanManage ? 'flex' : 'none';
  }

  async function _tmSaveMemberRole(projectRow, uid, role, canFac, isFac){
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.rpc('update_storyboard_member', {p_project_id: projectRow.id, p_user_id: uid, p_role: role, p_can_facilitate: canFac, p_is_facilitator: isFac}); }catch(e){}
    await _tmLoadRoster(projectRow); _tmRenderRoster(projectRow);
  }
  async function _tmSaveMemberNotes(projectRow, uid, notes){
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.rpc('update_storyboard_member_notes', {p_project_id: projectRow.id, p_user_id: uid, p_notes: notes}); }catch(e){}
  }
  async function _tmSaveOwnerNotes(projectRow, notes){
    if(!_tmRosterIsOwner) return;
    var _sb=T().sb; if(!_sb) return;
    projectRow.owner_notes=notes;
    try{ await _sb.from('ideas').update({owner_notes: notes}).eq('id', projectRow.id); }catch(e){}
  }
  async function _tmSaveOwnerPhone(phone){
    if(!_tmRosterIsOwner) return;
    var _sb=T().sb; if(!_sb) return;
    if(_tmRosterOwner) _tmRosterOwner.phone=phone;
    try{ await _sb.rpc('update_board_owner_contact', {p_phone: phone}); }catch(e){}
  }
  async function _tmAddMember(projectRow, email){
    var rows=_tmAllRosterRows(projectRow);
    var cap=(projectRow&&projectRow.member_cap) || 7;
    if(rows.length>=cap) return {ok:false,msg:'This board is at its '+cap+'-person cap.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await _sb.rpc('find_member_by_email', {p_email: String(email||'').trim().toLowerCase()});
      var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
      if(!match) return {ok:false,msg:'No T2T member found with that email.'};
      // Aug 16 2026, Larry: a root project linked to a Briefing Board
      // shares that board's Cast now -- one roster, not two that can
      // drift apart (this used to write straight to storyboard_members,
      // independent of the Briefing Board's own board_members). The RPC
      // resolves which table that actually is server-side, same as
      // list/update_storyboard_member(_notes) below -- never trust a
      // client-cached briefing_board_id for this.
      var ins=await _sb.rpc('add_storyboard_member', {p_project_id: projectRow.id, p_user_id: match.user_id});
      if(ins.error) return {ok:false,msg:ins.error.message||'Could not add them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not add them.'}; }
  }

  async function _tmRemoveMember(projectRow, uid){
    if(!projectRow) return {ok:false,msg:'No project selected.'};
    if(_tmRosterOwner && String(uid)===String(_tmRosterOwner.user_id)) return {ok:false,msg:'The Owner can\'t be removed.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var del=await _sb.rpc('remove_storyboard_member', {p_project_id: projectRow.id, p_user_id: uid});
      if(del.error) return {ok:false,msg:del.error.message||'Could not remove them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not remove them.'}; }
  }

  async function _sboardViewConfirmRemoveMember(projectRow, uid){
    var errEl=document.getElementById('sc-view-remove-error');
    var res=await _tmRemoveMember(projectRow, uid);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    await _tmLoadRoster(projectRow);
    _sboardRenderPersonFilterPicker(projectRow);
  }

  // ---- Role / Call Sheet -- Session 222 (Aug 18) design, built Session
  // 223 (Aug 19) after the DB table (card_roles, created live Session
  // 222) survived a lost-code restart untouched. One shared screen,
  // callable from any card (Subber/Header/TOPIC) via the 📋 button on
  // its DETAILS back -- 🎬 was already taken by the Video/Link toggle,
  // so Call Sheet gets its own icon instead of colliding with it.
  // Reuses card_roles and the same name/email/notes row look as Team
  // Roster (tm-* classes), grouped into three boxes per Larry's design:
  // Stakeholders (invested, not doing), The Doers (Leader + Cast
  // Member), and Facilitator (process, not outcome) with
  // Facilitator-qualified alongside it. Idea Storyboard only so far --
  // the Briefing Board rollout (card_type='briefing_card') is a later
  // step.
  // Session 228 (Aug 19): Principal folded into Stakeholder -- Larry's
  // insight was that everyone in that box is really a Stakeholder,
  // some just happen to be KEY (able to directly interfere with
  // progress). Migrated live: card_roles gained an is_key boolean, the
  // one existing 'principal' row became stakeholder+is_key=true, and
  // 'principal' was dropped from the role check constraint. is_key is
  // a per-row toggle (🔑, click to star/unstar) shown only on
  // Stakeholder rows -- deliberately a different mark from
  // is_parent_connection's gold ★ ("carried over from the parent" via
  // Fractal Casting) so the two meanings can't be confused on the same
  // row. Not yet built: auto-defaulting a new card's Stakeholder to
  // whoever assigned it, and auto-marking a Fractal Casting delegator
  // as is_parent_connection in the first place -- both still flagged
  // open in Design Notes.
  var _csRoles = [];
  var _csItem = null;
  // Which card_roles.card_type the module-level _csItem/_csRoles state
  // above belongs to right now -- 'idea' unless something outside this
  // file (briefing-board.js, via the T2TStoryboard bridge) opened the
  // 👥 dropdown for its own card type. Session 234 (Aug 21).
  var _csCardType = 'idea';
  var CS_ROLE_ORDER = ['stakeholder','leader','cast_member','facilitator','facilitator_qualified'];
  var CS_ROLE_LABEL = {
    stakeholder:'Stakeholder', leader:'Leader',
    cast_member:'Cast Member', facilitator:'Facilitator',
    facilitator_qualified:'Facilitator-qualified'
  };
  var CS_ROLE_SYM = {
    stakeholder:'👤', leader:'🎯',
    cast_member:'☐', facilitator:'🎤', facilitator_qualified:'✦'
  };

  async function _csLoadRoles(item){
    var _sb=T().sb; if(!_sb || !item){ _csRoles=[]; return; }
    try{
      var res=await _sb.from('card_roles').select('*').eq('card_type',_csCardType||'idea').eq('card_id', item.id);
      _csRoles = (!res.error && res.data) ? res.data : [];
    }catch(e){ _csRoles=[]; }
  }

  function _csRowsForRole(role){
    return (_csRoles||[]).filter(function(r){ return r.role===role; });
  }

  function _csMemberLookup(uid){
    var pool=_tmAllMembersCache||[];
    for(var i=0;i<pool.length;i++){ if(String(pool[i].user_id)===String(uid)) return pool[i]; }
    return null;
  }

  function _csRenderRoleRows(role){
    var rows=_csRowsForRole(role);
    if(!rows.length) return '<div class="cs-empty-role">Nobody yet</div>';
    return rows.map(function(r){
      var m=_csMemberLookup(r.user_id);
      var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
      var email=m?(m.email||''):'';
      var star=r.is_parent_connection?'<span class="cs-parent-star" title="Carried over from the parent">★</span>':'';
      var keyToggle = role==='stakeholder'
        ? '<span class="cs-key-toggle'+(r.is_key?' cs-key-on':'')+'" data-rowid="'+_esc9710(r.id)+'" title="'+(r.is_key?'Key Stakeholder — can directly interfere with progress. Click to unmark.':'Mark as a Key Stakeholder — can directly interfere with progress')+'">🔑</span>'
        : '';
      // Primary doer star, Session 234 -- same toggle as the compact 👥
      // dropdown (_sbPeopleRenderList); both read/write the same
      // card_roles.is_primary column via _csTogglePrimary.
      var primaryToggle='<span class="cs-primary-toggle'+(r.is_primary?' cs-primary-on':'')+'" data-rowid="'+_esc9710(r.id)+'" title="'+(r.is_primary?'Primary doer — click to unstar':'Mark as the primary doer')+'">'+(r.is_primary?'★':'☆')+'</span>';
      return '<div class="tm-row">'
        +'<div class="tm-sym">'+CS_ROLE_SYM[role]+'</div>'
        +'<div class="tm-body">'
          +'<div class="tm-name">'+primaryToggle+keyToggle+star+_esc9710(name)+' <span class="cs-remove-x" data-rowid="'+_esc9710(r.id)+'" title="Remove">✕</span></div>'
          +(email?('<div class="tm-contact">✉ '+_esc9710(email)+'</div>'):'')
          +'<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input cs-notes-input" data-rowid="'+_esc9710(r.id)+'" placeholder="—" value="'+_esc9710(r.notes||'')+'"></div>'
        +'</div>'
      +'</div>';
    }).join('');
  }

  function _csRenderAddRow(role){
    return '<div class="tm-addrow" style="margin-top:4px;justify-content:flex-start">'
        +'<div class="tm-add-tile cs-add-tile" data-role="'+role+'" title="Add to '+CS_ROLE_LABEL[role]+'">+</div>'
      +'</div>'
      +'<div class="cs-add-form" data-role-form="'+role+'" style="display:none;margin:4px 0 2px">'
        +'<div class="tm-add-wrap">'
          +'<input type="text" class="cs-add-email" data-role="'+role+'" placeholder="Type a name or email..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:calc(12px * var(--fg-text-scale,1));padding:6px 8px;border:1px solid #cfe4f2;border-radius:6px">'
          +'<div class="tm-add-suggest cs-add-suggest" data-role-suggest="'+role+'" style="display:none"></div>'
        +'</div>'
      +'</div>';
  }

  function _csRenderAllRoles(){
    CS_ROLE_ORDER.forEach(function(role){
      var el=document.getElementById('cs-rows-'+role);
      if(el) el.innerHTML=_csRenderRoleRows(role);
    });
  }

  function _csRenderSuggestions(role, query){
    var box=document.querySelector('.cs-add-suggest[data-role-suggest="'+role+'"]'); if(!box) return;
    var already={}; _csRowsForRole(role).forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    var pool=(_tmAllMembersCache||[]).filter(function(m){ return !already[m.user_id]; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone’s already in this role.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc9710(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc9710(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc9710(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  // Split into a DOM-free _csInsertRole (the actual card_roles write) plus
  // a thin _csConfirmAdd wrapper that only knows about the full Call
  // Sheet screen's own DOM, Aug 19 2026 -- added so the new 👥 dropdown
  // (below) can reuse the exact same insert without dragging the full
  // screen's form-hiding/input-clearing logic along with it. _csRefreshUI
  // now redraws both the full screen (if open) and the compact dropdown
  // (if open) after any card_roles change, whichever happens to be
  // showing -- at most one of the two is ever on screen at once, both
  // checks are no-ops when their own DOM isn't present.
  function _csRefreshUI(){
    _csRenderAllRoles();
    _sbPeopleRenderList();
  }

  async function _csInsertRole(role, email){
    if(!email || !_csItem) return {ok:false,msg:'Type a name or email.'};
    var match=(_tmAllMembersCache||[]).filter(function(m){ return String(m.email||'').toLowerCase()===String(email).toLowerCase(); })[0];
    if(!match) return {ok:false,msg:'No T2T member found with that email.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var meRes=await _sb.auth.getUser();
      var me=meRes && meRes.data ? meRes.data.user : null;
      var ins=await _sb.from('card_roles').insert({card_type:_csCardType||'idea', card_id:_csItem.id, role:role, user_id:match.user_id, added_by: me?me.id:null});
      if(ins.error) throw ins.error;
      await _csLoadRoles(_csItem);
      return {ok:true};
    }catch(e){ return {ok:false,msg:(e&&e.message)||'Could not add them.'}; }
  }

  async function _csConfirmAdd(role, email){
    var errEl=document.getElementById('cs-error');
    if(!email || !_csItem) return;
    var res=await _csInsertRole(role, email);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    var form=document.querySelector('.cs-add-form[data-role-form="'+role+'"]'); if(form) form.style.display='none';
    var input=document.querySelector('.cs-add-email[data-role="'+role+'"]'); if(input) input.value='';
    _csRefreshUI();
  }

  async function _csRemoveRole(rowId){
    if(!rowId || !_csItem) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var del=await _sb.from('card_roles').delete().eq('id', rowId);
      if(del.error) throw del.error;
      await _csLoadRoles(_csItem);
      _csRefreshUI();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not remove them.'; errEl.style.display='block'; } }
  }

  async function _csSaveNotes(rowId, notes){
    if(!rowId) return;
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.from('card_roles').update({notes:notes}).eq('id', rowId); }catch(e){}
  }

  async function _csToggleKey(rowId){
    if(!rowId) return;
    var row=(_csRoles||[]).filter(function(r){ return String(r.id)===String(rowId); })[0];
    if(!row) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('card_roles').update({is_key: !row.is_key}).eq('id', rowId);
      if(upd.error) throw upd.error;
      await _csLoadRoles(_csItem);
      _csRefreshUI();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not update them.'; errEl.style.display='block'; } }
  }

  // Primary doer star, Session 234 (Aug 21) -- replaces the old Person
  // Assigned dropdown. card_roles.is_primary has a DB constraint allowing
  // at most one true row per card (card_roles_one_primary_per_card), so
  // setting a new primary clears any other starred row on this card FIRST
  // -- setting the new one true before that clear would trip the
  // constraint. Un-starring the current primary (tap it again) just
  // leaves nobody starred; the corner badge/Team filter fall back to
  // whatever pre-twin-heads assigned_user_id the card already had, if any
  // (see _sboardEnsureCardPrimary).
  async function _csTogglePrimary(rowId){
    if(!rowId || !_csItem) return;
    var row=(_csRoles||[]).filter(function(r){ return String(r.id)===String(rowId); })[0];
    if(!row) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      if(row.is_primary){
        var off=await _sb.from('card_roles').update({is_primary:false}).eq('id', rowId);
        if(off.error) throw off.error;
      } else {
        var clear=await _sb.from('card_roles').update({is_primary:false}).eq('card_type',_csCardType||'idea').eq('card_id',_csItem.id).neq('id', rowId);
        if(clear.error) throw clear.error;
        var on=await _sb.from('card_roles').update({is_primary:true}).eq('id', rowId);
        if(on.error) throw on.error;
      }
      await _csLoadRoles(_csItem);
      _csRefreshUI();
      // The card's own tile(s) on the board carry a cached primary/badge
      // (see _sboardCardPrimaryCache) that predates this change -- drop it
      // so the next render re-fetches instead of showing a stale star.
      delete _sboardCardPrimaryCache[_sboardCpKey(_csCardType, _csItem.id)];
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not update them.'; errEl.style.display='block'; } }
  }

  // ---- 👥 People dropdown -- Session 226 (Aug 19) design, built Aug 19
  // 2026 after the four-role Stakeholder model shipped (Session 228).
  // Reached from the card back's own 👥 icon (was 📋, jumping straight to
  // the full Call Sheet -- see the sb-people-btn wiring below), this opens
  // in place exactly like the board's own VIEW/Type/Title dropdowns: a
  // small list right where you clicked, not a jump to a full screen,
  // showing everyone currently on the card across all five roles. Bottom
  // row carries Larry's three actions: (+) add someone -- pick a role
  // first (defaults to Cast Member, the most common "put someone on this"
  // case), then the same name/email picker/suggest-list every other add
  // flow on this board uses (_csRenderSuggestions, reused as-is by
  // pointing its data-role-suggest at whichever role is picked) -- ☎️ to
  // open the full three-box Call Sheet screen when more detail (notes,
  // KEY toggle) is actually needed, and (−) to reveal a ✕ next to each
  // row so someone can be removed right here, no trip to the full screen.
  // Shares _csRoles/_csItem and the card_roles helpers above with the
  // full screen -- this is a second, lighter doorway onto the same data,
  // not a parallel system, and _csRefreshUI keeps both in sync if a
  // change happens to come from the other one.
  var _sbPeopleRemoveMode = false;
  var _sbPeopleAddRole = 'cast_member';
  var _sbPeopleBackFn = null;
  // Session 230 (Aug 20) bug: the menu below is part of THIS card's own
  // overlay markup (rebuilt fresh every open, see id="sb-people-menu"
  // a bit further down), but the moment it's used it gets reparented
  // onto <body> so position:fixed works -- and reparenting never gets
  // undone when the card closes. Opening a second card renders a
  // second, independent element with the same id, so the DOM ends up
  // with two #sb-people-menu nodes at once. getElementById only ever
  // returns the FIRST one in document order, which after a reparent is
  // whichever was appended to <body> earliest -- not necessarily the
  // one that belongs to the card that's open right now. That's what
  // made the dropdown look like it "never closes" (a click meant to
  // toggle the current card's menu can silently open/repopulate a
  // stale leftover from an earlier card instead) and left orphaned
  // toolbars floating on the board after the card itself was closed.
  // Tracking the live element by reference (not by re-querying the id)
  // sidesteps the ambiguity, and removing the previous one before
  // swapping to a new card's menu keeps at most one ever in the DOM.
  var _sbPeopleMenuEl = null;

  function _sbPeopleRenderList(){
    var listEl=document.getElementById('sb-people-list');
    if(!listEl) return; // dropdown not open -- no-op, safe to call from anywhere
    var rows=(_csRoles||[]).slice().sort(function(a,b){
      return CS_ROLE_ORDER.indexOf(a.role)-CS_ROLE_ORDER.indexOf(b.role);
    });
    if(!rows.length){
      listEl.innerHTML='<div class="sc-cdrop-row sb-people-row" style="cursor:default;opacity:.6">Nobody yet</div>';
      return;
    }
    listEl.innerHTML=rows.map(function(r){
      var m=_csMemberLookup(r.user_id);
      var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
      var star=r.is_parent_connection?'<span class="cs-parent-star" title="Carried over from the parent">★</span>':'';
      var key=(r.role==='stakeholder'&&r.is_key)?'<span class="cs-pr-keytag">KEY</span>':'';
      return '<div class="sc-cdrop-row sb-people-row">'
        +'<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+CS_ROLE_SYM[r.role]+' '+key+star+_esc9710(name)+'</span>'
        +'<span style="display:flex;align-items:center;flex-shrink:0">'
          // Primary doer star, Session 234 (Aug 21, replaces the old
          // Person Assigned dropdown): tap to make this person the one
          // whose initials show on the card's corner badge and who the
          // board's Team filter matches. At most one starred per card --
          // _csTogglePrimary clears any other before setting this one.
          +'<button type="button" class="sb-people-star'+(r.is_primary?' active':'')+'" data-rowid="'+_esc9710(r.id)+'" title="'+(r.is_primary?'Primary doer — tap to unstar':'Tap to make primary doer')+'">'+(r.is_primary?'★':'☆')+'</button>'
          +'<span class="sc-view-row-role">'+CS_ROLE_LABEL[r.role]+'</span>'
          +(_sbPeopleRemoveMode?'<button type="button" class="sb-people-x" data-rowid="'+_esc9710(r.id)+'" title="Remove">✕</button>':'')
        +'</span>'
      +'</div>';
    }).join('');
  }

  function _sbPeopleRenderRolePicker(){
    var wrap=document.getElementById('sb-people-rolepick'); if(!wrap) return;
    wrap.innerHTML=CS_ROLE_ORDER.map(function(role){
      return '<button type="button" class="sb-people-rolepick-btn'+(role===_sbPeopleAddRole?' active':'')+'" data-role="'+role+'" title="Add as '+CS_ROLE_LABEL[role]+'">'+CS_ROLE_SYM[role]+'</button>';
    }).join('');
  }

  async function _sbPeopleConfirmAdd(email){
    var errEl=document.getElementById('sb-people-error');
    if(!email) return;
    var res=await _csInsertRole(_sbPeopleAddRole, email);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    var form=document.getElementById('sb-people-addform'); if(form) form.style.display='none';
    var input=document.getElementById('sb-people-add-email'); if(input) input.value='';
    _csRefreshUI();
  }

  // Generalized Session 234 (Aug 21) to work for any card_type, not just
  // 'idea' -- Larry wants the same 👥 button/dropdown on Briefing Cards
  // too. cardType/menuEl let a caller outside this file (briefing-board.js,
  // via the T2TStoryboard bridge) supply its own card_roles card_type and
  // its own menu element instead of always assuming the Idea Card's own
  // #sb-people-menu. The full ☎️ Call Sheet screen stays Idea-Card-only
  // for now (it leans on Idea-Card-specific chrome like closeSbDetail/
  // openCallSheet's breadcrumb) -- omitted from the dropdown entirely for
  // any other card type rather than half-wiring a button that'd break.
  async function _sboardOpenPeopleDropdown(triggerEl, item, backFn, cardType, menuEl){
    cardType = cardType || 'idea';
    var menu = menuEl || document.getElementById('sb-people-menu');
    // If the card that's open now rendered a DIFFERENT people-menu than
    // the one we last touched, the old one is a dead leftover -- still
    // sitting in <body>, possibly still visible -- so remove it before
    // it can confuse getElementById/reuse on some later click.
    if(_sbPeopleMenuEl && _sbPeopleMenuEl!==menu && _sbPeopleMenuEl.parentNode){
      _sbPeopleMenuEl.parentNode.removeChild(_sbPeopleMenuEl);
    }
    _sbPeopleMenuEl=menu;
    if(!triggerEl || !menu || !item) return;
    var willOpen=menu.hidden;
    _sboardCloseAllDropdowns(willOpen?menu.id:null);
    if(!willOpen){ menu.hidden=true; return; }

    // _csItem/_csCardType drive every card_roles read/write below
    // (_csLoadRoles, _csInsertRole, _csRemoveRole, _csToggleKey,
    // _csTogglePrimary) -- setting them here (not just inside
    // openCallSheet) fixes a real bug: add/remove/star from this compact
    // dropdown silently did nothing if the full Call Sheet screen had
    // never been opened first this session, since _csItem stayed null.
    _csItem=item;
    _csCardType=cardType;
    _sbPeopleBackFn=backFn||function(){ openSbDetail(item); };
    _sbPeopleRemoveMode=false;
    _sbPeopleAddRole='cast_member';

    var isIdea=(cardType==='idea');
    menu.innerHTML='<div id="sb-people-list"></div>'
      +'<div class="sc-cdrop-addrow">'
        +'<button type="button" class="sc-dotted-add-btn" id="sb-people-add-btn" title="Add someone">+</button>'
        +(isIdea?'<button type="button" class="sc-dotted-add-btn sb-people-call" id="sb-people-call-btn" title="Open the full Call Sheet">☎️</button>':'')
        +'<button type="button" class="sc-dotted-add-btn sc-dotted-remove-btn" id="sb-people-remove-btn" title="Remove someone">−</button>'
      +'</div>'
      +'<div class="sc-view-addform" id="sb-people-addform" style="display:none">'
        +'<div class="sb-people-rolepick" id="sb-people-rolepick"></div>'
        +'<div class="tm-add-wrap">'
          +'<input type="text" id="sb-people-add-email" placeholder="Type a name or email..." autocomplete="off">'
          +'<div class="tm-add-suggest cs-add-suggest" data-role-suggest="cast_member" id="sb-people-add-suggest" style="display:none"></div>'
        +'</div>'
        +'<button type="button" class="sc-ov-btn save sc-view-add-confirm" id="sb-people-add-confirm">Add</button>'
        +'<div id="sb-people-error" class="sc-view-add-error" style="display:none"></div>'
      +'</div>';

    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    menu.onclick=function(e){
      e.stopPropagation();
      var star=e.target.closest('.sb-people-star');
      if(star){ _csTogglePrimary(star.getAttribute('data-rowid')); return; }
      var x=e.target.closest('.sb-people-x');
      if(x){ _csRemoveRole(x.getAttribute('data-rowid')); }
    };

    var r=triggerEl.getBoundingClientRect();
    menu.style.left=r.left+'px';
    menu.style.top=(r.bottom+4)+'px';
    menu.style.minWidth=Math.max(210,r.width)+'px';
    menu.hidden=false;
    var mr=menu.getBoundingClientRect();
    if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';

    await _tmFetchAllMembers();
    await _csLoadRoles(item);
    _sbPeopleRenderList();
    _sbPeopleRenderRolePicker();

    var addBtn=document.getElementById('sb-people-add-btn');
    var addForm=document.getElementById('sb-people-addform');
    var emailInput=document.getElementById('sb-people-add-email');
    var suggBox=document.getElementById('sb-people-add-suggest');
    var rolePick=document.getElementById('sb-people-rolepick');
    var confirmBtn=document.getElementById('sb-people-add-confirm');
    var callBtn=document.getElementById('sb-people-call-btn');
    var removeBtn=document.getElementById('sb-people-remove-btn');

    if(addBtn) addBtn.addEventListener('click', function(){
      _sbPeopleRemoveMode=false; _sbPeopleRenderList();
      var opening=addForm.style.display==='none';
      addForm.style.display=opening?'block':'none';
      if(opening){ _csRenderSuggestions(_sbPeopleAddRole, ''); }
    });
    if(rolePick) rolePick.addEventListener('click', function(e){
      var btn=e.target.closest('.sb-people-rolepick-btn'); if(!btn) return;
      _sbPeopleAddRole=btn.getAttribute('data-role');
      _sbPeopleRenderRolePicker();
      if(suggBox) suggBox.setAttribute('data-role-suggest', _sbPeopleAddRole);
      _csRenderSuggestions(_sbPeopleAddRole, emailInput?emailInput.value:'');
    });
    if(emailInput){
      emailInput.addEventListener('input', function(){ _csRenderSuggestions(_sbPeopleAddRole, emailInput.value); });
      emailInput.addEventListener('focus', function(){ _csRenderSuggestions(_sbPeopleAddRole, emailInput.value); });
      emailInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); _sbPeopleConfirmAdd(emailInput.value.trim()); } });
    }
    if(suggBox) suggBox.addEventListener('click', function(e){
      var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
      _sbPeopleConfirmAdd(row.getAttribute('data-email'));
    });
    if(confirmBtn) confirmBtn.addEventListener('click', function(){ _sbPeopleConfirmAdd(emailInput?emailInput.value.trim():''); });
    if(callBtn) callBtn.addEventListener('click', function(){
      menu.hidden=true;
      closeSbDetail();
      openCallSheet(item, _sbPeopleBackFn);
    });
    if(removeBtn) removeBtn.addEventListener('click', function(){
      if(addForm) addForm.style.display='none';
      _sbPeopleRemoveMode=!_sbPeopleRemoveMode;
      _sbPeopleRenderList();
    });
  }

  // Call Sheet print, Session 228 (Aug 19) -- a proper single-page
  // portrait document, not a screenshot of the editable overlay (that's
  // the tm-print-tile/sb-team-print pattern Team Roster uses, forced
  // landscape). Builds a hidden #cs-print-doc from the same _csRoles
  // data, revealed only for the print job via a body.cs-printing class
  // scoped @media print rule -- kept fully separate from the existing
  // sb-team-print print rule (own @page override, injected and removed
  // around the print call) so neither print flow can bleed into the
  // other's page orientation.
  var CS_PRINT_GROUPS = [
    {title:'Stakeholders', sub:'Invested, not doing — who controls or is affected by this. KEY = can directly interfere with progress.', roles:['stakeholder']},
    {title:'The Doers', sub:'Leader stays accountable even if the work gets delegated', roles:['leader','cast_member']},
    {title:'Facilitator', sub:'Responsible for the session, not the outcome', roles:['facilitator','facilitator_qualified']}
  ];

  function _csFmtToday(){
    try{ return new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
    catch(e){ return ''; }
  }

  function _csPrintRoleRows(role){
    var rows=_csRowsForRole(role);
    if(!rows.length){
      return '<tr class="cs-pr-row"><td class="cs-pr-role">'+_esc9710(CS_ROLE_LABEL[role])+'</td><td class="cs-pr-name"><div class="cs-pr-empty">Nobody yet</div></td></tr>';
    }
    return rows.map(function(r,i){
      var m=_csMemberLookup(r.user_id);
      var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
      var email=m?(m.email||''):'';
      var star=r.is_parent_connection?'<span class="cs-pr-star">★</span>':'';
      var keytag=r.is_key?'<span class="cs-pr-keytag">KEY</span>':'';
      return '<tr class="cs-pr-row">'
        +'<td class="cs-pr-role">'+(i===0?_esc9710(CS_ROLE_LABEL[role]):'')+'</td>'
        +'<td class="cs-pr-name">'
          +'<div class="cs-pr-nameline">'+keytag+star+_esc9710(name)+'</div>'
          +(email?('<div class="cs-pr-email">'+_esc9710(email)+'</div>'):'')
          +(r.notes?('<div class="cs-pr-notes">Notes: '+_esc9710(r.notes)+'</div>'):'')
        +'</td>'
      +'</tr>';
    }).join('');
  }

  function _csPrintGroupHTML(g){
    return '<div class="cs-pr-group">'
      +'<div class="cs-pr-group-title">'+g.title+'</div>'
      +'<div class="cs-pr-group-sub">'+g.sub+'</div>'
      +'<table>'+g.roles.map(_csPrintRoleRows).join('')+'</table>'
    +'</div>';
  }

  async function _csBuildPrintDoc(){
    var crumbText='';
    try{
      var chain=(window.T2TData && window.T2TData.ancestorChain && _csItem) ? await window.T2TData.ancestorChain(_csItem.id) : [];
      crumbText=(chain||[]).map(function(c){ return c.text||'(untitled)'; }).join(' / ');
    }catch(e){}
    if(!crumbText) crumbText=(_csItem&&_csItem.text_content)||'';
    var doc=document.getElementById('cs-print-doc');
    if(!doc){ doc=document.createElement('div'); doc.id='cs-print-doc'; doc.className='cs-print-doc'; document.body.appendChild(doc); }
    var today=_csFmtToday();
    doc.innerHTML='<div class="cs-pr-masthead">'
        +'<div class="cs-pr-mast-left"><h1>📋 Call Sheet</h1><div class="cs-pr-sub">T2T Field Guide</div></div>'
        +'<div class="cs-pr-mast-right"><div class="cs-pr-date">'+today+'</div><div>Printed from the Idea Storyboard</div></div>'
      +'</div>'
      +'<div class="cs-pr-crumb">'+_esc9710(crumbText)+'</div>'
      +CS_PRINT_GROUPS.map(_csPrintGroupHTML).join('')
      +'<div class="cs-pr-footer"><span>T2T Field Guide — Call Sheet</span><span>Generated '+today+'</span></div>';
  }

  function _csPrint(){
    _csBuildPrintDoc().then(function(){
      var styleId='cs-print-page-style';
      var old=document.getElementById(styleId); if(old) old.remove();
      var st=document.createElement('style'); st.id=styleId;
      st.textContent='@page{size:portrait;margin:0.6in}';
      document.head.appendChild(st);
      document.body.classList.add('cs-printing');
      var cleaned=false;
      function cleanup(){
        if(cleaned) return; cleaned=true;
        document.body.classList.remove('cs-printing');
        var s=document.getElementById(styleId); if(s) s.remove();
        window.removeEventListener('afterprint', cleanup);
      }
      window.addEventListener('afterprint', cleanup);
      window.print();
    });
  }

  async function openCallSheet(item, backFn){
    _csItem=item;
    _csCardType='idea'; // this full-screen path is Idea-Card-only (see _sboardOpenPeopleDropdown)
    var ov=document.getElementById('sb-detail-overlay'); if(!ov || !item) return;
    ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center;background:#F5F1E8;max-height:82vh;overflow-y:auto;position:relative">'
      +'<div id="cs-body">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<span style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:500;letter-spacing:0.08em;color:#2C2C2A">📋 CALL SHEET</span>'
        +'<div style="display:flex;align-items:center;gap:6px">'
          +'<div class="tm-print-tile" id="cs-print-tile" title="Print Call Sheet">&#128438;</div>'
          +'<button id="cs-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#2C2C2A">✕</button>'
        +'</div>'
      +'</div>'
      +'<div class="cs-crumb" id="cs-crumb">Loading…</div>'
      +'<div class="cs-group">'
        +'<div class="cs-group-title">Stakeholders</div>'
        +'<div class="cs-group-sub">Invested, not doing — who controls or is affected by this. Tap 🔑 to mark a Key Stakeholder, someone who can directly interfere with progress.</div>'
        +'<div id="cs-rows-stakeholder"></div>'+_csRenderAddRow('stakeholder')
      +'</div>'
      +'<div class="cs-group cs-doers">'
        +'<div class="cs-group-title">The Doers</div>'
        +'<div class="cs-group-sub">Leader stays accountable even if the work gets delegated</div>'
        +'<div class="cs-role-label">Leader</div><div id="cs-rows-leader"></div>'+_csRenderAddRow('leader')
        +'<div class="cs-role-label">Cast Member</div><div id="cs-rows-cast_member"></div>'+_csRenderAddRow('cast_member')
      +'</div>'
      +'<div class="cs-group">'
        +'<div class="cs-group-title">Facilitator</div>'
        +'<div class="cs-group-sub">Responsible for the session, not the outcome</div>'
        +'<div class="cs-role-label">Facilitator</div><div id="cs-rows-facilitator"></div>'+_csRenderAddRow('facilitator')
        +'<div class="cs-role-label">Facilitator-qualified</div><div id="cs-rows-facilitator_qualified"></div>'+_csRenderAddRow('facilitator_qualified')
      +'</div>'
      +'<div id="cs-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin:4px 0;display:none"></div>'
      +'</div>'
      +'<div class="sc-corner-flip" id="cs-corner-flip" title="Flip back"></div>'
    +'</div>';
    ov.classList.add('active');
    var body=document.getElementById('cs-body');
    function goBack(){ closeSbDetail(); (backFn||function(){})(); }
    T().wire('cs-close', goBack);
    T().wire('cs-corner-flip', goBack);
    T().wire('cs-print-tile', _csPrint);

    // Breadcrumb -- same ancestor walk header-data.js already uses to
    // resume a session at depth (ancestorChain), reused here purely for
    // display: Organization/Project/.../this card's own name.
    (function(){
      var crumbEl=document.getElementById('cs-crumb');
      if(!crumbEl) return;
      (async function(){
        try{
          var chain=(window.T2TData && window.T2TData.ancestorChain) ? await window.T2TData.ancestorChain(item.id) : [];
          var text=(chain||[]).map(function(c){ return c.text||'(untitled)'; }).join(' / ');
          crumbEl.textContent=text||(item.text_content||'(untitled)');
        }catch(e){ crumbEl.textContent=item.text_content||''; }
      })();
    })();

    await _tmFetchAllMembers();
    await _csLoadRoles(item);
    _csRenderAllRoles();

    if(body){
      body.querySelectorAll('.cs-add-tile').forEach(function(tile){
        tile.addEventListener('click', function(){
          var role=tile.getAttribute('data-role');
          var form=body.querySelector('.cs-add-form[data-role-form="'+role+'"]');
          if(!form) return;
          var opening=form.style.display==='none';
          body.querySelectorAll('.cs-add-form').forEach(function(f){ f.style.display='none'; });
          if(opening){ form.style.display='block'; _csRenderSuggestions(role, ''); }
        });
      });
      body.querySelectorAll('.cs-add-email').forEach(function(input){
        var role=input.getAttribute('data-role');
        input.addEventListener('input', function(){ _csRenderSuggestions(role, input.value); });
        input.addEventListener('focus', function(){ _csRenderSuggestions(role, input.value); });
        input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); } });
      });
      body.querySelectorAll('.cs-add-suggest').forEach(function(box){
        box.addEventListener('click', function(e){
          var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
          var role=box.getAttribute('data-role-suggest');
          _csConfirmAdd(role, row.getAttribute('data-email'));
        });
      });
      body.addEventListener('click', function(e){
        var x=e.target.closest('.cs-remove-x'); if(x){ _csRemoveRole(x.getAttribute('data-rowid')); return; }
        var k=e.target.closest('.cs-key-toggle'); if(k){ _csToggleKey(k.getAttribute('data-rowid')); return; }
        var p=e.target.closest('.cs-primary-toggle'); if(p){ _csTogglePrimary(p.getAttribute('data-rowid')); return; }
      });
      body.addEventListener('change', function(e){
        if(e.target.classList.contains('cs-notes-input')){
          _csSaveNotes(e.target.getAttribute('data-rowid'), e.target.value);
        }
      });
    }
  }

  function _sboardOpenTeam(scopeRow, backFn){
    var projectRow=scopeRow||_sboardCurrentProjectRow();
    var ov=document.getElementById('sb-detail-overlay'); if(!ov || !projectRow) return;
    ov.innerHTML='<div class="sc-overlay-card sb-team-print" style="text-align:center;width:min(400px,92vw)">'
      +'<div style="display:flex;justify-content:flex-end;margin-bottom:2px"><button class="sc-ov-btn" id="tm-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<input type="text" class="tm-groupname" id="tm-groupname" value="'+_esc9710(projectRow.text_content||'')+'">'
      +'<div id="tm-list-view"></div>'
      +'<div class="tm-addrow">'
        +'<div class="tm-add-tile" id="tm-add-tile" title="Add a cast member">+</div>'
        +'<div class="tm-print-tile" id="tm-print-tile" title="Print roster">&#128438;</div>'
      +'</div>'
      +'<div id="tm-add-row" style="display:none;margin-top:10px;gap:6px">'
        +'<div class="tm-add-wrap">'
          +'<input type="text" id="tm-add-email" placeholder="Type a name or email..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:calc(12px * var(--fg-text-scale,1));padding:6px 8px;border:1px solid #cfe4f2;border-radius:6px">'
          +'<div class="tm-add-suggest" id="tm-add-suggest" style="display:none"></div>'
        +'</div>'
        +'<button class="sc-ov-btn save" id="tm-add-confirm">Add</button>'
      +'</div>'
      +'<div id="tm-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin-top:6px;display:none"></div>'
    +'</div>';
    ov.classList.add('active');
    _tmLoadRoster(projectRow).then(function(){ _tmRenderRoster(projectRow); });
    T().wire('tm-close', function(){ closeSbDetail(); (backFn||_sboardOpenPeopleMenu)(); });
    T().wire('tm-print-tile', function(){ window.print(); });
    async function _tmConfirmAddMember(email){
      var input=document.getElementById('tm-add-email');
      var errEl=document.getElementById('tm-error');
      var sugg=document.getElementById('tm-add-suggest');
      if(!email) return;
      var res=await _tmAddMember(projectRow, email);
      if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
      if(errEl) errEl.style.display='none';
      if(input) input.value='';
      if(sugg) sugg.style.display='none';
      var row=document.getElementById('tm-add-row'); if(row) row.style.display='none';
      await _tmLoadRoster(projectRow); _tmRenderRoster(projectRow);
    }
    T().wire('tm-add-tile', function(){
      if(!_tmRosterCanManage) return;
      var row=document.getElementById('tm-add-row');
      var opening = row && row.style.display==='none';
      if(row) row.style.display = opening ? 'flex' : 'none';
      if(opening){
        _tmFetchAllMembers().then(function(){ _tmRenderMemberSuggestions(projectRow, ''); });
      } else {
        var sugg=document.getElementById('tm-add-suggest'); if(sugg) sugg.style.display='none';
      }
    });
    var tmEmailInput=document.getElementById('tm-add-email');
    if(tmEmailInput){
      tmEmailInput.addEventListener('input', function(){ _tmRenderMemberSuggestions(projectRow, tmEmailInput.value); });
      tmEmailInput.addEventListener('focus', function(){ _tmRenderMemberSuggestions(projectRow, tmEmailInput.value); });
    }
    var tmSuggBox=document.getElementById('tm-add-suggest');
    if(tmSuggBox){
      tmSuggBox.addEventListener('click', function(e){
        var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
        _tmConfirmAddMember(row.getAttribute('data-email'));
      });
    }
    var gnEl=document.getElementById('tm-groupname');
    if(gnEl) gnEl.addEventListener('change', async function(){
      if(!_tmRosterIsOwner) return;
      var _sb=T().sb; if(!_sb) return;
      projectRow.text_content=gnEl.value;
      try{ await _sb.from('ideas').update({text_content: gnEl.value}).eq('id', projectRow.id); }catch(e){}
    });
    var confirmBtn=document.getElementById('tm-add-confirm');
    if(confirmBtn) confirmBtn.addEventListener('click', async function(){
      var input=document.getElementById('tm-add-email');
      var email=input?input.value.trim():'';
      await _tmConfirmAddMember(email);
    });
    var wrap=document.getElementById('tm-list-view');
    if(wrap){
      wrap.addEventListener('click', function(e){
        var sym=e.target.closest('.tm-clickable'); if(!sym) return;
        var p=document.getElementById('tm-rp-'+sym.getAttribute('data-uid'));
        if(p) p.style.display = (p.style.display==='none') ? 'block' : 'none';
      });
      wrap.addEventListener('change', async function(e){
        var t=e.target;
        if(t.classList.contains('tm-r-sponsor') || t.classList.contains('tm-r-leader') || t.classList.contains('tm-r-canfac') || t.classList.contains('tm-r-fac')){
          var uid=t.getAttribute('data-uid');
          var panel=document.getElementById('tm-rp-'+uid); if(!panel) return;
          if(t.classList.contains('tm-r-sponsor') && t.checked){ panel.querySelector('.tm-r-leader').checked=false; }
          if(t.classList.contains('tm-r-leader') && t.checked){ panel.querySelector('.tm-r-sponsor').checked=false; }
          var role = panel.querySelector('.tm-r-sponsor').checked ? 'sponsor' : (panel.querySelector('.tm-r-leader').checked ? 'leader' : null);
          var canFac = panel.querySelector('.tm-r-canfac').checked;
          var isFac = panel.querySelector('.tm-r-fac').checked;
          await _tmSaveMemberRole(projectRow, uid, role, canFac, isFac);
        } else if(t.classList.contains('tm-owner-notes')){
          await _tmSaveOwnerNotes(projectRow, t.value);
        } else if(t.classList.contains('tm-owner-phone')){
          await _tmSaveOwnerPhone(t.value);
        } else if(t.classList.contains('tm-notes-input')){
          await _tmSaveMemberNotes(projectRow, t.getAttribute('data-uid'), t.value);
        }
      });
    }
  }

  // Manage Access, reached from the gear menu's People tab (Aug 8 2026)
  // -- same screen the PROJECT quick menu's own Manage Access opens,
  // just a second door in. Computes isOwner itself since the gear menu
  // doesn't already have it handy the way the quick menu does.
  async function _sboardOpenShareManagerFromGear(scopeRow, backFn){
    var projectRow=scopeRow||_sboardCurrentProjectRow();
    if(!projectRow) return;
    var _sb=T().sb;
    var me=null; try{ me=(await _sb.auth.getUser()).data.user; }catch(e){}
    var isOwner=!!me && (projectRow.topic_owner_user_id ? projectRow.topic_owner_user_id===me.id : projectRow.user_id===me.id);
    _sboardOpenShareManager(projectRow, isOwner, backFn||function(){ _sboardOpenPeopleMenu(); });
  }

  // Settings screen stack, Aug 8 2026 -- Larry: Settings should be a
  // simple drill-down (Settings home -> People -> Cast/Guests), not a
  // tab bar, with X always meaning "back one screen" until you're back
  // at the top, where X closes for real. Each screen is its own render
  // into the shared sb-detail-overlay, same pattern this file already
  // uses everywhere else.
  function _sboardOpenGearMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Settings</span><button class="sc-ov-btn" id="sb-gear-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-set-go-people" style="width:100%">&#128101; People</button>'
        +'<button class="sc-ov-btn" id="sb-set-go-appearance" style="width:100%">&#127912; Appearance</button>'
        +'<button class="sc-ov-btn" id="sb-set-go-preferences" style="width:100%">&#128295; Preferences</button>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-set-go-people', function(){ _sboardOpenPeopleMenu(); });
    T().wire('sb-set-go-appearance', _sboardOpenAppearanceMenu);
    T().wire('sb-set-go-preferences', _sboardOpenPreferencesMenu);
    T().wire('sb-gear-close', closeSbDetail);
  }
  function _sboardOpenPeopleMenu(scopeRow, backFn){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    // Fractal Casting (Aug 9 2026): this same screen now also opens
    // scoped to a delegated TOPIC header instead of always the root
    // PROJECT -- a small subtitle makes clear whose Cast/Guests this is.
    var isTopicScope=!!(scopeRow && scopeRow.topic_owner_user_id);
    var subtitle=isTopicScope ? '<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin:-6px 0 8px">'+_esc9710(scopeRow.text_content||'this TOPIC')+'</div>' : '';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(isTopicScope?'2px':'10px')+'"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">People</span><button class="sc-ov-btn" id="sb-people-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +subtitle
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-gear-team" style="width:100%">🎭 Cast</button>'
        +'<button class="sc-ov-btn" id="sb-gear-share" style="width:100%">🎫 Guests</button>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-gear-team', function(){ closeSbDetail(); _sboardOpenTeam(scopeRow, function(){ closeSbDetail(); _sboardOpenPeopleMenu(scopeRow, backFn); }); });
    T().wire('sb-gear-share', function(){ closeSbDetail(); _sboardOpenShareManagerFromGear(scopeRow, function(){ closeSbDetail(); _sboardOpenPeopleMenu(scopeRow, backFn); }); });
    T().wire('sb-people-close', backFn||_sboardOpenGearMenu);
  }

  // Fractal Casting entry points (Aug 9 2026) -- reuse every screen above
  // completely unchanged, just handed a header row instead of always the
  // root PROJECT. "Same pattern repeating at every scale."
  function _sboardOpenPeopleMenuForTopic(headerRow){
    _sboardOpenPeopleMenu(headerRow, function(){ closeSbDetail(); openSbDetail(headerRow); });
  }

  async function _sboardOpenDelegateTopicPicker(headerRow, scopeRow){
    var ov=document.getElementById('sb-detail-overlay'); if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Make this a TOPIC</span><button class="sc-ov-btn" id="sb-deleg-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:8px">Pick who owns it. They\u2019ll get their own independent Cast to build \u2014 you\u2019ll become their Sponsor. Only people already on your own current team can be picked.</div>'
      +'<div id="sb-deleg-list" style="display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto;margin-bottom:8px"><div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">Loading your team\u2026</div></div>'
      +'<div id="sb-deleg-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin-top:4px;display:none"></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-deleg-close', function(){ closeSbDetail(); openSbDetail(headerRow); });

    await _tmLoadRoster(scopeRow);
    var candidates=_tmAllRosterRows(scopeRow).filter(function(m){ return !m.isOwner; });
    var list=document.getElementById('sb-deleg-list'); if(!list) return;
    if(!candidates.length){
      list.innerHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">Nobody\u2019s on your team yet \u2014 add a Cast Member first.</div>';
      return;
    }
    list.innerHTML=candidates.map(function(m){
      return '<div class="sb-hdr-vitem sb-deleg-cand" data-uid="'+_esc9710(m.user_id)+'" style="text-align:left;cursor:pointer">'
        +'<div style="font-weight:600">'+_esc9710(m.name||m.email||'')+'</div>'
        +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#888">'+_esc9710(m.email||'')+'</div>'
      +'</div>';
    }).join('');
    list.querySelectorAll('.sb-deleg-cand').forEach(function(row){
      row.addEventListener('click', async function(){
        var uid=row.getAttribute('data-uid');
        var errEl=document.getElementById('sb-deleg-error'); if(errEl) errEl.style.display='none';
        var _sb=T().sb;
        try{
          var res=await _sb.rpc('delegate_topic', {p_header_id: headerRow.id, p_new_owner_user_id: uid});
          if(res.error) throw res.error;
        }catch(e){
          if(errEl){ errEl.textContent=(e&&e.message)||'Could not delegate this TOPIC.'; errEl.style.display='block'; }
          return;
        }
        try{
          var fresh=await _sb.from('ideas').select('*').eq('id',headerRow.id).maybeSingle();
          if(!fresh.error && fresh.data){
            _sboardAllRowsById[headerRow.id]=fresh.data;
            headerRow=fresh.data;
          }
        }catch(e){}
        closeSbDetail(); openSbDetail(headerRow);
      });
    });
  }
  function _sboardOpenAppearanceMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var fsIcon=document.fullscreenElement?'\u21a9':'\u26f6';
    var fsLabel=document.fullscreenElement?'Exit full screen':'Full screen';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Appearance</span><button class="sc-ov-btn" id="sb-appearance-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-gear-recolor" style="width:100%">🎨 Recolor all headers</button>'
        +'<button class="sc-ov-btn" id="sb-gear-fullscreen" style="width:100%">'+fsIcon+' '+fsLabel+'</button>'
        +'<button class="sc-ov-btn" id="sb-gear-textsize" style="width:100%">🔠 Text size</button>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-gear-recolor', function(){ closeSbDetail(); _sboardOpenRecolorAll(); });
    T().wire('sb-gear-fullscreen', function(){ closeSbDetail(); T2TSession.toggleFullscreen(); });
    // Aug 3 2026: Storyboard is full-screen (.isx-full), so the desk's own
    // gear/text-size picker is hidden here -- this reaches the same shared
    // picker screen-zero.js owns, so the choice stays one control, not two.
    T().wire('sb-gear-textsize', function(){ closeSbDetail(); if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
    T().wire('sb-appearance-close', _sboardOpenGearMenu);
  }
  function _sboardOpenPreferencesMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Preferences</span><button class="sc-ov-btn" id="sb-preferences-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-gear-sort" style="width:100%">🔤 Sort headers</button>'
        +'<button class="sc-ov-btn" id="sb-gear-keys" style="width:100%">🚩 Signal Flags</button>'
        +'<button class="sc-ov-btn" id="sb-gear-fix-orphans" style="width:100%">🔧 Fix Purpose/Ideas headers</button>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-gear-sort', function(){ closeSbDetail(); _sboardOpenSortHeadersPicker(); });
    T().wire('sb-gear-keys', function(){ closeSbDetail(); _sboardOpenKeyLibraryManager(); });
    T().wire('sb-gear-fix-orphans', function(){ closeSbDetail(); _sboardOpenFixOrphansConfirm(); });
    T().wire('sb-preferences-close', _sboardOpenGearMenu);
  }

  /* Deletion-sticks backstop, Aug 18 2026 -- same rule as header-data.js's
     _parentDefaultsSeeded (Larry: "adding headers is only a default; if
     headers already exist, do not add any default headers"). This file
     keeps its own local copy of the Purpose/NEW ensure-calls instead of
     going through T2TData, so the guard has to be duplicated here too or
     a deliberately-trashed Purpose/NEW header on the Idea Storyboard
     would just get silently recreated on the next render.
     First cut checked "does this parent currently have any header at
     all" -- broke the instant a traveler deleted the LAST header on an
     otherwise-empty board (the common NEW+MISC-only shape), since the
     count legitimately hits zero right when a deletion should be
     sticking. Larry hit exactly this trying to delete MISC. Fixed with
     the same persisted header_defaults_seeded column header-data.js
     uses -- once a parent's defaults have ever been seeded, that stays
     true forever, independent of how many headers remain. */
  async function _sboardParentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return false;
    var _sb=T().sb;
    var res=await _sb.from('ideas').select('header_defaults_seeded').eq('id',parentId).limit(1);
    if(res.error || !res.data || !res.data.length) return false;
    if(res.data[0].header_defaults_seeded) return true;
    // Session 231 (Aug 20) -- same gap and same self-heal as
    // header-data.js's _parentDefaultsSeeded (this file keeps its own
    // local copy of the Purpose/NEW ensure-calls instead of going
    // through T2TData, so the fix has to be duplicated here too): the
    // flag only gets set on an actual auto-insert, so a board Larry
    // built by hand still read as "unseeded" and kept getting a fresh
    // default header shoved into it. If this parent already has ANY
    // header at all, that's proof it's not brand-new -- mark it seeded
    // and stop inserting.
    var kids=await _sb.from('ideas').select('id').eq('content_type','header').eq('cluster_id',parentId).limit(1);
    if(!kids.error && kids.data && kids.data.length){
      _sboardMarkParentDefaultsSeeded(parentId);
      return true;
    }
    return false;
  }

  async function _sboardMarkParentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return;
    try{ await T().sb.from('ideas').update({header_defaults_seeded:true}).eq('id',parentId); }catch(e){}
  }

  async function _sboardEnsurePurposeHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    // Shared-project fix, Aug 14 2026 -- Larry: 'one shared purpose for
    // every story.' Drop the user_id filter on the lookup so every Cast
    // member reuses the project's one true Purpose header instead of each
    // person who opens it spawning their own. RLS still governs what this
    // user is allowed to see, so this can't leak a Purpose header from a
    // project they're not on.
    var q=_sb.from('ideas').select('id').eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    if(await _sboardParentDefaultsSeeded(parentId)){ _sboardPurposeId=null; return null; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _sboardPurposeId=ins.data.id;
    _sboardMarkParentDefaultsSeeded(parentId);
    return _sboardPurposeId;
  }

  async function _sboardEnsureNewAdditionsHeader(parentId, desiredName){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var name=desiredName||'NEW';
    // Matches the current label, the desired label, and the pre-rename one,
    // so boards from any earlier naming era self-heal instead of spawning
    // a duplicate reserved header.
    // Shared-project fix, Aug 14 2026 -- see _sboardEnsurePurposeHeader
    // above: drop the user_id filter so every Cast member reuses the same
    // NEW header instead of each person spawning their own.
    var q=_sb.from('ideas').select('id,text_content').eq('content_type','header').in('text_content',['NEW','New Additions',name]);
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){
      var row=existing.data[0];
      _sboardNewAdditionsId=row.id;
      if(row.text_content!==name){ try{ await _sb.from('ideas').update({text_content:name}).eq('id',row.id); }catch(e){} }
      return _sboardNewAdditionsId;
    }
    if(await _sboardParentDefaultsSeeded(parentId)){ _sboardNewAdditionsId=null; return null; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Ideas header setup failed: '+ins.error.message);
    _sboardNewAdditionsId=ins.data.id;
    _sboardMarkParentDefaultsSeeded(parentId);
    return _sboardNewAdditionsId;
  }

  function _sboardMoveOptionsHTML(excludeId, currentClusterId){
    var opts='<option value=""'+(!currentClusterId?' selected':'')+'>NEW</option>';
    opts+=_sboardHeaderList.filter(function(h){ return String(h.id)!==String(excludeId); })
      .map(function(h){ var sel=(currentClusterId && String(h.id)===String(currentClusterId))?' selected':''; return '<option value="'+h.id+'"'+sel+'>'+(h.text_content||'(untitled)')+'</option>'; }).join('');
    opts+='<option value="__new__">+ Create new header…</option>';
    return opts;
  }

  // Unified SHAPING card — same overlay, same buttons, regardless of whether
  // the card double-clicked is an idea, a header, or a sub-header. Type is a
  // state (has children / ends in : or ?), not a different kind of object.
  // Full-viewport zoom for a single image — dismissed by clicking
  // anywhere on the overlay, the ✕, or Escape. Built fresh and torn
  // down each time rather than living in static markup, since it's
  // only ever needed for as long as one image is being examined.
  function _sbOpenImageLightbox(url){
    var lb=document.createElement('div');
    lb.id='sb-img-lightbox';
    lb.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;'
      +'display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    lb.innerHTML='<img src="'+url+'" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;pointer-events:none">'
      +'<button id="sb-img-lightbox-close" aria-label="Close" style="position:absolute;top:16px;right:16px;width:38px;height:38px;'
      +'border-radius:50%;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.5);color:#fff;font-size:calc(18px * var(--fg-text-scale,1));cursor:pointer">\u2715</button>';
    document.body.appendChild(lb);
    function close(){
      if(lb.parentNode) lb.parentNode.removeChild(lb);
      document.removeEventListener('keydown', onKey);
    }
    lb.addEventListener('click', close);
    var closeBtn=lb.querySelector('#sb-img-lightbox-close');
    if(closeBtn) closeBtn.addEventListener('click', function(e){ e.stopPropagation(); close(); });
    function onKey(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown', onKey);
  }

  function openSbDetail(item){
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    // Card-details sweep, July 19, 2026: hoisted up from further down so
    // isTrashed/isMisc/the Purpose row below can also be screen-aware, not
    // just the Current Location breadcrumb.
    var isxScreenEl=document.getElementById('s-idea-session');
    var isOn9711=!!(isxScreenEl && isxScreenEl.classList.contains('active'));
    var isHeaderType=item.content_type==='header';
    // Reserved system headers (Trash/MISC/NEW) used to short-circuit here
    // into a stripped-down "Shape" card (color + notes only, no rename/
    // move/trash) while Purpose and ordinary headers got the full DETAILS
    // card below. Larry, Aug 16 2026: "New, Purpose and MISC headers are
    // headers and should have insides just like any other card... on
    // every board. SOP." -- removed the special case entirely. All
    // headers, reserved or not, now render the same full DETAILS card
    // and can be renamed, moved, and trashed like any other card.

    // Card-details sweep, July 19, 2026: _sboardTrashId/_sboardMiscId/
    // _sboardPurposeId are only ever populated by 9710's own renderSeaBoard
    // fetch -- stale or unset entirely if 9710 never rendered this session.
    // Same bug class as Current Location (fixed July 18); prefer 9711's own
    // context (setIsxContext) when it's the active screen.
    var _effTrashId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.trashId : _sboardTrashId;
    var _effMiscId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.miscId : _sboardMiscId;
    var _effPurposeId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.purposeId : _sboardPurposeId;
    // Aug 25 2026 -- same reasoning as the three above. Needed once the
    // landing-zone header could be named something other than literally
    // "NEW" (see the Move panel below): that panel already lists this
    // header once as its own pinned "NEW" row, so the real header row
    // has to be excluded from the general list by id now, not by a name
    // match that no longer holds.
    var _effNewAdditionsId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.newAdditionsId : _sboardNewAdditionsId;
    var isTrashed=String(item.cluster_id)===String(_effTrashId) && _effTrashId;
    var isMisc=String(item.cluster_id)===String(_effMiscId) && _effMiscId;
    var heartCount=item.heart_count||0;
    // CLUSTER view-as option — Logged July 7, 2026. Only appears when this card
    // is a bucket (has something underneath it, at any depth). Never shown for
    // a lone card — there's nothing to sort into groups yet.
    var isBucket=isHeaderType && (_sboardChildCountById[item.id]||0)>0;
    // Briefing Board tracking, Aug 11 2026 -- only a TOP-ROW header
    // (its own parent is a root board, same rule the DB trigger uses)
    // can be assigned; sub-headers never qualify, so the button doesn't
    // even show for them rather than appearing to do something it can't.
    var _bbAssignParent = item.cluster_id ? (_sboardHeadersById[item.cluster_id] || _sboardAllRowsById[item.cluster_id]) : null;
    var isTopRowHeader = isHeaderType && !!item.cluster_id && !!_bbAssignParent && !_bbAssignParent.cluster_id;
    // Fractal-view slider gating — added July 12, 2026. PARENT needs a real
    // grandparent to land on (climbing two levels from this card's home);
    // HEADER needs a real parent to promote-into-view under; SUBBER is
    // blocked while this card is a header actively holding content (same
    // rule the old demote button used, now just a grayed notch instead of
    // a separate button). TOPIC is always reachable — any card can become
    // the viewed board.
    var apexTag=(isHeaderType && !item.cluster_id)?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    var swatches=_sboardColorPalette.map(function(c){
      var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
    }).join('');

    // PARENT / TOPIC eyebrows — computed exactly the way the board's own
    // chrome computes them, so the SHAPING card always agrees with the board.
    // 9711 SESSION branch: DETAILS is shared, but T2TShared.currentTopicId
    // and _sboardAllRowsById only ever get set by 9710's own renderSeaBoard
    // — stale (or entirely unset, showing the old "What do you want?"
    // placeholder) whenever DETAILS is opened from 9711 instead. Use the
    // live context 9711 hands over after every render (setIsxContext)
    // when 9711 is the screen actually on screen. July 18, 2026.
    var topicLabel, parentLabelCrumb, localNewAdditionsTarget, isInLocalNewAdditions, curHeaderLabel;
    if(isOn9711 && _isxDetailCtx){
      topicLabel=_isxDetailCtx.topicText||_sboardGetRootPrompt();
      parentLabelCrumb=_isxDetailCtx.parentText||'Wish Tank';
      localNewAdditionsTarget=_isxDetailCtx.topicId||'';
      isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
      var curHeaderRow9711=(item.cluster_id && !isInLocalNewAdditions)?(_isxDetailCtx.rowsById||{})[item.cluster_id]:null;
      // Aug 11 2026 (Larry): a HEADER sitting directly on a Topic (no
      // further sub-header wrapping it) was showing PARENT = "NEW" --
      // "NEW" is only meaningful for a loose idea card living in the
      // Topic's uncategorized bucket. A Header's parent is always the
      // Topic it lives on ("The Parent of any Header is the TOPIC" --
      // Larry's own Briefing Board card, Aug 9). Loose idea cards keep
      // the "NEW" fallback unchanged.
      curHeaderLabel=curHeaderRow9711?(curHeaderRow9711.text_content||'(untitled)'):(isHeaderType?topicLabel:'NEW');
    } else {
      var topicRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
      topicLabel=(T2TShared.currentTopicId && topicRow)?(topicRow.text_content||'(untitled)'):_sboardGetRootPrompt();
      var parentIdCrumb=topicRow?(topicRow.cluster_id||null):null;
      var parentRowCrumb=parentIdCrumb?_sboardAllRowsById[parentIdCrumb]:null;
      var parentFallbackCrumb=(topicRow&&topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'NEW');
      parentLabelCrumb=(T2TShared.currentTopicId && topicRow)?(parentRowCrumb?(parentRowCrumb.text_content||'(untitled)'):parentFallbackCrumb):'Wish Tank';

      // HEADER: "NEW" here means whichever board's own uncategorized bucket is
      // active: null at the root ISB, or the current topic id when working
      // inside a nested (fractal) board.
      localNewAdditionsTarget=T2TShared.currentTopicId||'';
      isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
      var curHeaderRow=(item.cluster_id && !isInLocalNewAdditions)?_sboardAllRowsById[item.cluster_id]:null;
      // Same Header-vs-loose-card fix as the 9711 branch above.
      curHeaderLabel=curHeaderRow?(curHeaderRow.text_content||'(untitled)'):(isHeaderType?topicLabel:'NEW');
    }

    // TOP ROW -- PARENT / VIEW / ORDER, Aug 7 2026 (Larry). Replaces the
    // old "Current Location" breadcrumb (Parent Project > Topic > Header)
    // plus its separate MOVE button, and pulls the ORDER # up from down
    // by Notes -- three compact eyebrow+field columns in one row instead,
    // matching the board's own PROJECT/PARENT/VIEW header chrome.
    //
    // PARENT shows just the immediate parent Header (curHeaderLabel) --
    // the one piece of the old breadcrumb that actually matters for
    // "where does this live" at a glance. Tapping it reveals the same
    // move-to-header panel the old MOVE button did (headerListHTML right
    // below, untouched -- id="sb-move-btn" just moved onto this field).
    //
    // VIEW is the Header/Subber toggle added earlier today.
    //
    // ORDER, not RANK -- Larry asked which reads better. Keeping ORDER:
    // this is a plain sequence position ("3 of 8"), not a priority score,
    // and it matches the ORDER # badges already used everywhere else on
    // the board (_sboardOrderBadgeHTML) and in this file's own comments.
    // RANK would suggest importance, which isn't what this number means.
    var viewOtherLabel = isHeaderType ? 'Subber' : 'Header';
    var viewSwitchDisabled = isHeaderType && isBucket;
    var viewWidgetHTML = '<div class="sb-view-wrap" id="sb-view-wrap">'
      + '<div class="sb-hdr-eyebrow2">View</div>'
      + '<button class="sb-view-frame" id="sb-view-btn" type="button">'+(isHeaderType?'Header':'Subber')+'</button>'
      + '<div class="sb-view-menu" id="sb-view-menu">'
      + '<div class="sb-view-menu-item'+(viewSwitchDisabled?' disabled':'')+'" id="sb-view-switch"'+(viewSwitchDisabled?' title="Move its cards out first"':'')+'>Switch to '+viewOtherLabel+'</div>'
      + '</div>'
      + '</div>';

    var orderValueText='—';
    // ORDER nudge, Aug 11 2026 (Larry: wants to change a card's order
    // from the back of the card too, not just move it to a different
    // Header). _sbOrderList/_sbOrderIdx below are the REAL sibling list
    // the drag-reorder math uses (_sboardTopLevelOrder for a top-level
    // Header, _sboardColumnOrderByParent for anything nested one level
    // in). Until Aug 22 2026 this deliberately avoided
    // _sboardCardOrderByParent, back when that was just a display-only
    // Subbers-then-cards concat that couldn't be written back to safely
    // (see its own comment, above in renderGroup) -- now that Subbers and
    // cards share one real combined order, _sboardCardOrderByParent IS
    // that real order, so the nudge arrows use the same
    // _sboardColumnOrderByParent it's built from and can swap a Subber
    // past a card (or vice versa), same as dragging can.
    var _sbOrderList=null, _sbOrderIdx=-1;
    var _sbOrderIsTopHeader=(isHeaderType && !item.cluster_id);
    (function(){
      function findIdx(list){
        for(var i=0;i<list.length;i++){ if(String(list[i])===String(item.id)) return i; }
        return -1;
      }
      var list=null, idx=-1;
      if(isHeaderType && _sboardTopLevelOrder && findIdx(_sboardTopLevelOrder)!==-1){
        list=_sboardTopLevelOrder; idx=findIdx(list);
      } else if(item.cluster_id && _sboardCardOrderByParent[item.cluster_id]){
        list=_sboardCardOrderByParent[item.cluster_id]; idx=findIdx(list);
      }
      if(list && idx!==-1){ orderValueText=(idx+1)+' of '+list.length; }
      var realList=_sbOrderIsTopHeader ? _sboardTopLevelOrder
        : (_sboardColumnOrderByParent[item.cluster_id||'']||null);
      if(realList){ _sbOrderList=realList; _sbOrderIdx=findIdx(realList); }
    })();
    var orderCanUp=(_sbOrderList && _sbOrderIdx>0);
    var orderCanDown=(_sbOrderList && _sbOrderIdx>-1 && _sbOrderIdx<_sbOrderList.length-1);

    var topRowHTML='<div class="sb-eyebrow-row">'
      + '<div class="sb-eyebrow-col">'
      + '<div class="sb-hdr-eyebrow2">Parent</div>'
      + '<button class="sb-view-frame" id="sb-move-btn" type="button">'+curHeaderLabel+'</button>'
      + '</div>'
      + '<div class="sb-eyebrow-col">'+viewWidgetHTML+'</div>'
      + '<div class="sb-eyebrow-col">'
      + '<div class="sb-hdr-eyebrow2">Order</div>'
      + '<div style="display:flex;flex-wrap:nowrap;align-items:center;gap:4px;justify-content:center;width:100%">'
      + '<button id="sb-order-up" type="button" aria-label="Move earlier"'+(orderCanUp?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanUp?'pointer':'default')+';opacity:'+(orderCanUp?'1':'0.3')+'">▲</button>'
      + '<div class="sb-view-frame" style="cursor:default;padding:5px 8px;white-space:nowrap" title="Order #">🔢 <span id="sb-order-value">'+orderValueText+'</span></div>'
      + '<button id="sb-order-down" type="button" aria-label="Move later"'+(orderCanDown?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanDown?'pointer':'default')+';opacity:'+(orderCanDown?'1':'0.3')+'">▼</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    // Person Assigned (Aug 9 2026) removed Session 234 (Aug 21, Larry:
    // "covered by the twin heads button") -- the 👥 people dropdown is now
    // the one place to put someone on a card. Its star toggle sets
    // card_roles.is_primary, which is what the corner badge and the Team
    // filter read now (see _sboardEnsureCardPrimary / _csSetPrimary).

    var headerListHTML='<div class="sb-inline-field" id="sb-move-panel" style="display:none">'
      + '<div class="sb-hdr-eyebrow2">Move to a different Header</div>'
      + '<div class="sb-hdr-vitem'+(isMisc?' current':'')+'" id="sb-misc-pinned" style="border:0.5px solid #D3D1C7;border-radius:8px;margin-bottom:6px;font-weight:600">'+(isMisc?'📦 Misc ✓ — tap to move out':'📦 Misc (project archive)')+'</div>'
      + '<div class="sb-hdr-vlist" id="sb-hdr-vlist">'
      + '<div class="sb-hdr-vitem'+(isInLocalNewAdditions?' current':'')+'" data-hid="'+localNewAdditionsTarget+'">NEW</div>'
      + (_effPurposeId?('<div class="sb-hdr-vitem'+(String(item.cluster_id||'')===String(_effPurposeId)?' current':'')+'" data-hid="'+_effPurposeId+'">Purpose</div>'):'')
      + _sboardVisibleHeaders.filter(function(h){ return String(h.id)!==String(item.id) && h.text_content!=='NEW' && !(_effNewAdditionsId && String(h.id)===String(_effNewAdditionsId)); })
          .map(function(h){ var cur=(item.cluster_id && String(h.id)===String(item.cluster_id))?' current':''; return '<div class="sb-hdr-vitem'+cur+'" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>'; }).join('')
      + '<div class="sb-hdr-vitem newh" id="sb-hdr-newh">+ Create new header…</div>'
      + '</div>'
      + '<div class="sb-inline-field" id="sb-newheader-row" style="display:none"><input id="sb-newheader-input" type="text" placeholder="New header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box;margin-bottom:6px"><button class="sb-blue-btn" id="sb-newheader-go" style="width:100%">Create &amp; move here</button></div>'
      + '<div style="display:flex;gap:6px;margin-top:6px">'
      + '<button class="sc-ov-btn" id="sb-hdr-othertopic" style="flex:1;font-size:calc(10px * var(--fg-text-scale,1))">📍 Different Topic…</button>'
      + '<button class="sc-ov-btn" id="sb-hdr-otherproj" style="flex:1;font-size:calc(10px * var(--fg-text-scale,1))">🔀 Different Project…</button>'
      + '</div>'
      + '</div>';

    // Body: always the same fixed size and shape, whether it holds an image
    // or a single word. Images get an editable caption/title underneath —
    // this is what becomes the card's name (and Topic label, if drilled into).
    var bodyHTML;
    if(item.content_type==='link'){
      var linkData=T2TMedia.parseText(item.text_content);
      bodyHTML='<div class="sb-body-box">'+(item.image_url?'<img id="sb-img-preview" src="'+item.image_url+'">':'<div style="font-size:calc(40px * var(--fg-text-scale,1))">\ud83d\udd17</div>')+'</div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:4px;color:'+(linkData.title?'#000':'#a3907a')+'" title="Tap to edit the title">'+(linkData.title||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(linkData.title||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>'
        + '<a href="'+linkData.url+'" target="_blank" rel="noopener" style="display:block;font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;word-break:break-word;margin-bottom:8px">'+linkData.url+' \u2197</a>';
    } else if(item.content_type==='image' && item.image_url){
      bodyHTML='<div class="sb-body-box"><img id="sb-img-preview" src="'+item.image_url+'"></div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:8px;color:'+(item.text_content?'#000':'#a3907a')+'" title="Tap to add a title">'+(item.text_content||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>';
    } else {
      bodyHTML='<div class="sb-body-box"><div id="sb-text-display" class="sb-body-text sb-body-text-clamp" style="font-size:calc(18px * var(--fg-text-scale,1))" title="Tap to edit">'+(item.text_content||'(untitled)')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div></div>';
    }

    ov.innerHTML='<div class="sc-overlay-card sb-shape-card sb-details-card" style="text-align:center;background:#F5F1E8;position:relative">'
      + '<div id="sb-details-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:grab">'
      + '<span id="sb-details-eyebrow" style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:500;letter-spacing:0.08em;color:#2C2C2A;cursor:default">IDEA CARD</span>'
      + '<button id="sb-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#2C2C2A">✕</button>'
      + '</div>'
      + '<div id="sb-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#a3907a;height:10px;margin:-4px 0 4px;opacity:0;transition:opacity .3s">1011</div>'
      + apexTag
      + topRowHTML
      + headerListHTML
      + bodyHTML
      // NOTES + SIGNAL FLAGS, Aug 7 2026 (Larry): Notes moved onto the same
      // row as Signal Flags, matching the eyebrow-over-field look the
      // PARENT/VIEW/ORDER row uses -- NOTES eyebrow over the pencil icon
      // (icon only now; the eyebrow itself supplies the "Notes" label, so
      // the button text is redundant), Signal Flags eyebrow over the heart
      // + flag row, side by side. The heart isn't part of the picker (it's
      // the one fixed, "non-choice" flag every card gets, tap to add / hold
      // to remove, same as always); any custom flags follow, then the add
      // control -- a plain classic (+), same dashed-circle look the
      // board's own [+] add-a-card tiles use everywhere else. Flags row
      // populated by _sboardRenderKeyRow right after this HTML lands
      // (needs the real DOM node to attach click handlers to). Headers and
      // Subbers get this same row too -- only the heart stays
      // content-cards-only.
      + '<div class="sb-eyebrow-row">'
      + '<div class="sb-eyebrow-col" style="flex:0 0 auto">'
      + '<div class="sb-hdr-eyebrow2">Notes</div>'
      + '<button id="sb-notes" class="sb-notes-pill" title="Notes">✏️</button>'
      + '</div>'
      + '<div class="sb-eyebrow-col" style="flex:0 0 auto">'
      + '<div class="sb-hdr-eyebrow2">Video/Link</div>'
      + '<button id="sb-link-toggle" class="sb-notes-pill" title="Video/Link">🎬</button>'
      + '</div>'
      + '<div class="sb-eyebrow-col" style="flex:1;align-items:flex-start">'
      + '<div class="sb-hdr-eyebrow2" style="text-align:left">Signal Flags</div>'
      + '<div class="sb-below-content-row" id="sb-flags-row" style="margin:0">'
      + '<button id="sb-heart" class="sb-heart-pill" aria-label="Tap to add a heart, hold to remove one" style="font-size:calc(12px * var(--fg-text-scale,1));padding:5px 9px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;display:flex;align-items:center;gap:4px;cursor:pointer;color:#2C2C2A">'
      + '<span style="color:#D4537E;font-size:calc(13px * var(--fg-text-scale,1))">❤</span><span id="sb-heart-count">'+heartCount+'</span></button>'
      + '<span id="sb-keys-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"></span>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:none;width:100%;box-sizing:border-box;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:8px">'+(item.notes||'')+'</textarea>'
      + '<div id="sb-link-box" style="display:'+((item.link_url)?'block':'none')+';width:100%;box-sizing:border-box;margin-bottom:8px">'
      + '<div style="display:flex;gap:6px">'
      + '<input id="sb-link-url" type="text" placeholder="Paste a YouTube, Vimeo, or other link…" value="'+_sboardEsc(item.link_url||'')+'" style="flex:1;box-sizing:border-box;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));background:#fff">'
      + '<button id="sb-link-clear" type="button" title="Remove" style="width:28px;height:28px;flex-shrink:0;border-radius:6px;background:#fff;border:0.5px solid #B4B2A9;cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1))">✕</button>'
      + '</div>'
      + '<div id="sb-link-preview" style="display:'+((item.link_url)?'block':'none')+';margin-top:6px;font-size:calc(11px * var(--fg-text-scale,1));text-align:center;font-style:italic;color:#2C2C2A">'+((item.link_thumb)?('<img src="'+_sboardEsc(item.link_thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+_sboardEsc(item.link_title||item.link_url||'')+'</div>'
      + '</div>'
      + '<div id="sb-swatch-row" class="sb-swatch-row2">'+swatches+'</div>'
      + '<div id="sb-note-status" style="font-size:calc(9px * var(--fg-text-scale,1));color:#a3907a;margin-bottom:4px;min-height:11px"></div>'
      + '<input type="file" id="sb-img-input" accept="image/*" style="display:none">'
      + '<div class="sb-blue-row">'
      + '<button class="sb-blue-btn" id="sb-lock" title="'+(item.locked?'Unlock — allow editing and moving':'Lock — read-only, fixed position')+'">'+(item.locked?'🔒':'🔓')+'</button>'
      + '<button class="sb-blue-btn" id="sb-people-btn" title="Who\'s on this card">👥</button>'
      + '<div class="sc-cdrop-menu" id="sb-people-menu" hidden></div>'
      + '<button class="sb-blue-btn" id="sb-gear" title="Appearance">⚙️</button>'
      + (isHeaderType ? '<button class="sb-blue-btn" id="sb-topic-btn" style="display:none">🎭</button>' : '')
      + (isTopRowHeader ? '<button class="sb-blue-btn" id="sb-bb-assign" title="'+(item.track_on_briefing_board?'Unassign from Briefing Board':'Assign to Briefing Board')+'">'+(item.track_on_briefing_board?'📌':'📋')+'</button>' : '')
      + (isTopRowHeader && item.track_on_briefing_board ? '<button class="sb-blue-btn" id="sb-bb-open" title="Open Briefing Card (new tab)">🧭</button>' : '')
      + '<button class="sb-blue-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>')+'</button>'
      + '</div>'
      // sb-trash-overlay ("Moose poop?" confirm) — renumbered 9718 → 1221
      // (Aug 19, 2026, Larry): the Moose Poop step of the Dream-phase
      // methodology family (1200/1210/1220/1230/1240 — see FG Design
      // Notes), not a generic utility despite living inline on the card.
      + '<div id="sb-trash-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.4);border-radius:12px;align-items:center;justify-content:center">'
      + '<div style="background:#fff;border-radius:10px;padding:14px 18px;text-align:center;border:0.5px solid #888780">'
      + '<p style="font-size:calc(14px * var(--fg-text-scale,1));font-weight:500;margin:0 0 10px;color:#2C2C2A">Moose poop?</p>'
      + '<div style="display:flex;gap:8px;justify-content:center">'
      + '<button id="sb-trash-yes" style="font-size:calc(12px * var(--fg-text-scale,1));padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Yes</button>'
      + '<button id="sb-trash-no" style="font-size:calc(12px * var(--fg-text-scale,1));padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Keep it</button>'
      + '</div></div></div>'
      + '<div class="sc-corner-flip" id="sb-detail-corner-flip" title="Flip back to front"></div>'
      + '</div>';
    ov.classList.add('active');
    T().wire('sb-detail-corner-flip', closeSbDetail);
    // Drag, Aug 19 2026 (Larry): IDEA CARD never had this -- every Briefing
    // Card overlay drags via _bbMakeDraggable in briefing-board.js, this
    // just never got the same treatment. Ported the same pattern rather
    // than screen-zero.js's makeDraggable, which is built for desktop
    // icons, not modal overlay cards. Position resets on close/reopen
    // (innerHTML is rebuilt from scratch) -- no saved-position persistence
    // yet, matching what was asked for.
    _sbMakeDraggable(ov.querySelector('.sb-details-card'), document.getElementById('sb-details-head'));

    (function(){
      var clicks=0, timer=null;
      var eyebrow=document.getElementById('sb-details-eyebrow');
      if(eyebrow) eyebrow.addEventListener('click', function(){
        clicks++;
        if(timer) clearTimeout(timer);
        timer=setTimeout(function(){ clicks=0; }, 600);
        if(clicks>=3){
          clicks=0;
          var pn=document.getElementById('sb-pagenum');
          if(pn){ pn.style.opacity='1'; setTimeout(function(){ pn.style.opacity='0'; }, 2000); }
        }
      });
    })();

    var statusBox=document.getElementById('sb-note-status');

    // Fractal Casting entry point (Aug 9 2026) -- shown only for headers,
    // and only once we know whether this one's already a TOPIC (offer its
    // Cast/Guests) or this viewer is the current Owner of whatever's
    // directly above it (offer to delegate it into a new one). Async
    // because both need a roster/user lookup that can't finish before
    // ov.innerHTML above already landed -- same pattern as Person
    // Assigned just above.
    if(isHeaderType){
      (function(){
        var btn=document.getElementById('sb-topic-btn'); if(!btn) return;
        var effRowsById=(isOn9711 && _isxDetailCtx && _isxDetailCtx.rowsById) ? _isxDetailCtx.rowsById : _sboardAllRowsById;
        (async function(){
          if(item.topic_owner_user_id){
            btn.title='Cast / Guests for this TOPIC';
            btn.style.display='';
            btn.onclick=function(){ _sboardOpenPeopleMenuForTopic(item); };
            return;
          }
          var me=null; try{ me=(await _sb.auth.getUser()).data.user; }catch(e){}
          var myId=me?me.id:null; if(!myId) return;
          var scopeRow=item.topic_scope_id?effRowsById[item.topic_scope_id]:null;
          var isScopeOwner=!!scopeRow && (scopeRow.topic_owner_user_id?scopeRow.topic_owner_user_id===myId:scopeRow.user_id===myId);
          if(isScopeOwner){
            btn.title='Make this a TOPIC';
            btn.textContent='\uD83C\uDF31';
            btn.style.display='';
            btn.onclick=function(){ _sboardOpenDelegateTopicPicker(item, scopeRow); };
          }
        })();
      })();
    }

    // Double-click-to-zoom lightbox — Locked July 13, 2026. The DETAILS
    // back is already the larger view of an image; some images (a
    // whiteboard photo, a screenshot with small text) still need more
    // than that to actually read. Double-clicking the image here zooms
    // it again, near full-screen, dismissed by clicking anywhere or ✕.
    var imgPreview=document.getElementById('sb-img-preview');
    if(imgPreview){
      imgPreview.style.cursor='zoom-in';
      imgPreview.title='Double-click to zoom in';
      imgPreview.addEventListener('dblclick', function(){ _sbOpenImageLightbox(imgPreview.src); });
    }

    // MOVE — single entry point. Reveals the same header/topic/project
    // pickers that used to sit always-partly-visible on the card.
    T().wire('sb-move-btn', function(){
      var panel=document.getElementById('sb-move-panel');
      if(panel) panel.style.display=(panel.style.display==='none')?'block':'none';
    });

    // ORDER nudge -- up/down arrows, Aug 11 2026 (Larry). Swaps this card
    // with its immediate same-type sibling (one step, same shape as a
    // one-notch drag reorder) and rewrites both sort_order values. Stays
    // open afterward instead of closing (like the heart pill just below),
    // since nudging more than once in a row is the normal case -- only
    // the Order number + arrow states update in place here, plus a
    // background board refresh so the front stays in sync. Undo/redo
    // follows the same single-row convention as every other move in this
    // file (_sboardApplyRowSnapshot) -- restores THIS card's own position,
    // doesn't try to re-thread the sibling it swapped with.
    (function(){
      var upBtn=document.getElementById('sb-order-up');
      var downBtn=document.getElementById('sb-order-down');
      if(!upBtn && !downBtn) return;
      function setArrowState(btn, can){
        if(!btn) return;
        btn.disabled=!can;
        btn.style.opacity=can?'1':'0.3';
        btn.style.cursor=can?'pointer':'default';
      }
      async function nudgeOrder(dir){
        if(!_sbOrderList || item.locked) return;
        var swapIdx=_sbOrderIdx+dir;
        if(swapIdx<0 || swapIdx>=_sbOrderList.length) return;
        var ids=_sbOrderList.slice();
        var tmp=ids[_sbOrderIdx]; ids[_sbOrderIdx]=ids[swapIdx]; ids[swapIdx]=tmp;
        var before=_sboardSnapshotRow(item.id);
        try{
          // .select() + row-count check added Aug 22 2026 -- Larry: "moved
          // word wall sub-header to card order number 4. It did not
          // move" -- the ORDER number on this very card was updating
          // ("2 of 7") right after clicking, but the database never
          // actually changed. Root cause: without .select(), Supabase
          // reports success (no .error) even when a write matches zero
          // rows -- so this always trusted the write and updated the
          // on-screen number regardless of whether anything really
          // saved. Now checks the actual row count and shows a real
          // error via statusBox (below) instead of a number that lies.
          var updA=await _sb.from('ideas').update({sort_order:_sbOrderIdx}).eq('id',ids[_sbOrderIdx]).select('id');
          if(updA.error) throw updA.error;
          if(!updA.data || !updA.data.length) throw new Error('Save was blocked (no rows matched) -- order not changed.');
          var updB=await _sb.from('ideas').update({sort_order:swapIdx}).eq('id',ids[swapIdx]).select('id');
          if(updB.error) throw updB.error;
          if(!updB.data || !updB.data.length) throw new Error('Save was blocked (no rows matched) -- order not changed.');
          _sboardPatchRow(ids[_sbOrderIdx], {sort_order:_sbOrderIdx});
          _sboardPatchRow(ids[swapIdx], {sort_order:swapIdx});
          // Aug 22 2026: was two separate maps depending on isHeaderType --
          // now one shared column order, so a Subber can nudge past a
          // card (or vice versa) the same way dragging can.
          if(_sbOrderIsTopHeader) _sboardTopLevelOrder=ids;
          else _sboardColumnOrderByParent[item.cluster_id||'']=ids;
          _sbOrderList=ids; _sbOrderIdx=swapIdx;
          if(before){
            var after=_sboardSnapshotRow(item.id);
            _sboardPushAction({label:'Reorder', undo:function(){ return _sboardApplyRowSnapshot(item.id, before); }, redo:function(){ return _sboardApplyRowSnapshot(item.id, after); }});
          }
          var valEl=document.getElementById('sb-order-value');
          if(valEl) valEl.textContent=(swapIdx+1)+' of '+ids.length;
          setArrowState(upBtn, _sbOrderIdx>0);
          setArrowState(downBtn, _sbOrderIdx<ids.length-1);
          renderSeaBoard(true);
        }catch(err){
          if(statusBox) statusBox.textContent='Reordering needs the sort_order Supabase column: '+err.message;
        }
      }
      if(upBtn) upBtn.addEventListener('click', function(){ nudgeOrder(-1); });
      if(downBtn) downBtn.addEventListener('click', function(){ nudgeOrder(1); });
    })();

    // VIEW -- Header/Subber toggle, Aug 7 2026 (Larry) -- replaces the old
    // one-way MAKE HEADER button above with a two-way control matching the
    // board's own VIEW pattern: tap the frame to reveal the one other
    // state, tap it to switch. Promoting (Subber -> Header) is the same
    // promotion the drag-a-card-onto-another-card path already does
    // (_sboardStackIntoHeader sets content_type:'header'). Demoting
    // (Header -> Subber) reverses it -- picks back up as an image card if
    // it still has an image_url (i.e. was promoted from one), plain text
    // otherwise, since the original type isn't separately stored. Blocked
    // via viewSwitchDisabled (menu item greyed out, click no-ops) whenever
    // the header is still actively holding content -- move it out first,
    // so demoting can never silently orphan anything.
    T().wire('sb-view-btn', function(e){
      e.stopPropagation();
      var m=document.getElementById('sb-view-menu');
      if(m) m.classList.toggle('open');
    });
    T().wire('sb-view-switch', async function(){
      if(viewSwitchDisabled) return;
      var newType = isHeaderType ? (item.image_url ? 'image' : 'text') : 'header';
      try{
        var upd=await _sb.from('ideas').update({content_type:newType}).eq('id',item.id).select();
        if(upd.error) throw upd.error;
        item.content_type=newType;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // Header list: tap to reassign immediately
    Array.prototype.forEach.call(document.querySelectorAll('.sb-hdr-vitem[data-hid]'), function(row){
      row.addEventListener('click', async function(){
        var newCluster=row.getAttribute('data-hid')||null;
        if(String(newCluster||'')===String(item.cluster_id||'')) return;
        try{
          var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id).select();
          if(upd.error) throw upd.error;
          item.cluster_id=newCluster;
          closeSbDetail();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent=err.message; }
      });
    });
    async function openMoveToProjectPicker(){
      var ov2=document.getElementById('sb-detail-overlay');
      if(!ov2) return;
      var boards=(await T2TData.topLevelBoards()).slice().sort(function(a,b){
        return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
      });
      var rows=boards.filter(function(b){ return String(b.id)!==String(item.id); }).map(function(b){
        return '<div class="sb-hdr-vitem" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Move "'+(item.text_content||'(untitled)')+'"</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Moves this card — and everything nested underneath it — into the top level of the project you pick.</div>'
        +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
        +'<button class="sc-ov-btn" id="sb-moveproj-cancel" style="width:100%">Cancel</button>'
        +'</div>';
      ov2.classList.add('active');
      Array.prototype.forEach.call(ov2.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
        row.addEventListener('click', async function(){
          var pid=row.getAttribute('data-pid');
          try{
            var upd=await _sb.from('ideas').update({cluster_id:pid}).eq('id',item.id).select();
            if(upd.error) throw upd.error;
            item.cluster_id=pid;
            closeSbDetail();
            var landing=boards.find(function(b){ return String(b.id)===String(pid); });
            if(landing) _sboardDrillInto(landing);
          }catch(err){ console.error(err); }
        });
      });
      T().wire('sb-moveproj-cancel', function(){ openSbDetail(item); });
    }

    // Different Topic — added July 12, 2026. Broader reach than the Header
    // picker above (which only lists what's already visible in the current
    // local view): searches every header anywhere in the current project,
    // at any depth, so you can move a card straight to a Topic you aren't
    // currently standing near, without having to navigate there first.
    async function openMoveToTopicPicker(){
      var ov2=document.getElementById('sb-detail-overlay');
      if(!ov2) return;
      // Card-details sweep, July 19, 2026: this used to search
      // _sboardHeadersById/_sboardAllRowsById, both 9710-only caches that
      // sit empty all session if 9710's own board never rendered -- opening
      // this picker from 9711 always showed "No other topics in this
      // project yet.", even when there were plenty. Fetches its own live,
      // screen-agnostic header list instead (same pattern already used by
      // openMoveToProjectPicker just above), so this works regardless of
      // which screen opened DETAILS.
      var reserved=['Trash','MISC','Purpose','NEW','New Additions'];
      var topicIdForProject=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : T2TShared.currentTopicId;
      var candidates=[];
      if(topicIdForProject && window.T2TData && window.T2TData.ancestorChain && window.T2TData.fetchAllHeaders && window.T2TData.headerDescendants){
        try{
          var chain=await window.T2TData.ancestorChain(topicIdForProject);
          var projectId=chain.length?chain[0].id:null;
          if(projectId){
            var allHeadersLive=await window.T2TData.fetchAllHeaders();
            candidates=window.T2TData.headerDescendants(allHeadersLive, projectId)
              .filter(function(h){ return String(h.id)!==String(item.id) && reserved.indexOf(h.text_content)===-1; });
          }
        }catch(e){ console.warn('openMoveToTopicPicker project lookup failed:', e); }
      }
      candidates=candidates.slice().sort(function(a,b){ return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase()); });
      var rows=candidates.map(function(h){
        return '<div class="sb-hdr-vitem" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other topics in this project yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">Move under a different Topic</div>'
        +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:240px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
        +'<button class="sc-ov-btn" id="sb-movetopic-cancel" style="width:100%">Cancel</button>'
        +'</div>';
      ov2.classList.add('active');
      Array.prototype.forEach.call(ov2.querySelectorAll('.sb-hdr-vitem[data-hid]'), function(row){
        row.addEventListener('click', async function(){
          var hid=row.getAttribute('data-hid');
          // Card-details sweep, July 19, 2026: landing now comes from the
          // live candidates list above (was _sboardHeadersById, same stale
          // 9710-only cache this whole picker just got fixed away from).
          var landing=candidates.find(function(c){ return String(c.id)===String(hid); });
          try{
            var upd=await _sb.from('ideas').update({cluster_id:hid}).eq('id',item.id).select();
            if(upd.error) throw upd.error;
            item.cluster_id=hid;
            closeSbDetail();
            // Note (found during this sweep, not fixed): _sboardDrillInto
            // navigates 9710's own board (sets T2TShared.currentTopicId).
            // From 9711 this refreshes the board you're still standing on
            // rather than following the card to its new Topic -- lower
            // priority, same posture as the isMisc/isTrashed item already
            // deferred July 18.
            if(landing) _sboardDrillInto(landing);
          }catch(err){ console.error(err); }
        });
      });
      T().wire('sb-movetopic-cancel', function(){ openSbDetail(item); });
    }

    T().wire('sb-hdr-newh', function(){
      document.getElementById('sb-newheader-row').style.display='block';
      var nhInput=document.getElementById('sb-newheader-input');
      if(nhInput) setTimeout(function(){ nhInput.focus(); }, 50);
    });
    T().wire('sb-hdr-othertopic', openMoveToTopicPicker);
    T().wire('sb-hdr-otherproj', openMoveToProjectPicker);
    // Aug 7 2026 -- same ENTER + no-feedback-on-Save fix as the standalone
    // New Header prompt above (_sboardOpenAddHeaderPrompt), applied here
    // too since this is the other place a header gets created and Larry's
    // two DOING cards didn't say which screen he'd hit it on.
    var newHeaderGoBtn=document.getElementById('sb-newheader-go');
    async function _sbNewHeaderGo(){
      var name=(document.getElementById('sb-newheader-input')||{}).value||'';
      name=name.trim() || ('Cluster '+_sboardNextClusterNumber());
      if(newHeaderGoBtn){ newHeaderGoBtn.disabled=true; newHeaderGoBtn.textContent='Saving...'; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var parentId=T2TShared.filter||null;
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw new Error(ins.error.message);
        _sboardAddRow(ins.data);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=ins.data.id;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
        if(newHeaderGoBtn){ newHeaderGoBtn.disabled=false; newHeaderGoBtn.textContent='Create & move here'; }
      }
    }
    T().wire('sb-newheader-go', _sbNewHeaderGo);
    (function(){
      var nhInput=document.getElementById('sb-newheader-input');
      if(nhInput) nhInput.addEventListener('keydown', function(e){
        if(e.key==='Enter'){ e.preventDefault(); _sbNewHeaderGo(); }
      });
    })();

    // Text editing (auto-promotes to header if punctuation says so)
    var textDisplay=document.getElementById('sb-text-display');
    if(textDisplay && !item.locked) textDisplay.addEventListener('click', function(){
      document.getElementById('sb-text-edit').style.display='block';
      textDisplay.style.display='none';
      var ta=document.getElementById('sb-text-input'); ta.focus();
    });
    T().wire('sb-text-cancel', function(){
      document.getElementById('sb-text-edit').style.display='none';
      if(textDisplay) textDisplay.style.display='block';
    });
    T().wire('sb-text-save', async function(){
      var newText=document.getElementById('sb-text-input').value.trim();
      if(!newText){ if(statusBox) statusBox.textContent='Text can\'t be empty.'; return; }
      var beforeFields={text_content:item.text_content, content_type:item.content_type};
      try{
        var patch;
        if(item.content_type==='link'){
          var curLink=T2TMedia.parseText(item.text_content);
          patch={text_content: JSON.stringify({url:curLink.url, title:newText})};
        } else {
          patch={text_content:newText};
          if(item.content_type==='text' && _sboardIsAutoHeaderText(newText)) patch.content_type='header';
        }
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.text_content=patch.text_content;
        if(patch.content_type) item.content_type=patch.content_type;
        _sboardPatchRow(item.id, patch);
        (function(){
          var itemId=item.id, before=beforeFields, after={text_content:patch.text_content, content_type:patch.content_type||beforeFields.content_type};
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
        })();
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // Photo — works from any card type; attaching a photo to a text idea
    // converts it to an image card, an image card just gets a new photo.
    T().wire('sb-img-swap', function(){ document.getElementById('sb-img-input').click(); });
    var imgInput=document.getElementById('sb-img-input');
    if(imgInput) imgInput.addEventListener('change', async function(e){
      var f=e.target.files && e.target.files[0]; if(!f) return;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var path=user.id+'/'+Date.now()+'-'+(f.name||'photo.png').replace(/[^a-zA-Z0-9._-]/g,'_');
        var up=await _sb.storage.from('sea-of-ideas').upload(path, f);
        if(up.error) throw up.error;
        var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
        var url=pub.data && pub.data.publicUrl;
        if(!url) throw new Error('No public URL returned.');
        var patch={image_url:url};
        if(!isHeaderType && item.content_type!=='image' && item.content_type!=='link') patch.content_type='image';
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.image_url=url;
        if(patch.content_type) item.content_type=patch.content_type;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    T().wire('sb-lock', async function(){
      try{
        var newLocked=!item.locked;
        if(!newLocked){
          // Unlocking never needs a prompt -- if it was parking a real
          // card, the linked card's own locked flag clears via the
          // ideas_sync_header_lock DB trigger the moment this write lands.
          var upd0=await _sb.from('ideas').update({locked:false}).eq('id',item.id);
          if(upd0.error) throw upd0.error;
          item.locked=false;
          closeSbDetail();
          renderSeaBoard(true);
          return;
        }
        // Locking, Session 211 (Aug 15) -- a header with no linked,
        // active Briefing card yet is a no-op for the card side: just
        // park the idea, nothing to cascade to. Only when a real card
        // exists does this become the two-outcome choice (Done vs
        // genuinely-parked-mid-work, i.e. a Hang-Up).
        var cardRes=await _sb.from('briefing_cards').select('id,col').eq('source_header_id',item.id).eq('archived',false).limit(1);
        var linkedCard=cardRes.data && cardRes.data[0];
        if(linkedCard){
          if(!window.confirm('Lock this header? Its Briefing card will pause too, until you unlock it.')) return;
          var isDone=window.confirm('Is the work actually finished? OK = Yes, move its card to Done. Cancel = No, it still needs to happen -- park the card until its time.');
          if(isDone){
            var cardUpd={col:'done'};
            var colRes=await _sb.from('briefing_cards').select('completed_date,hangup_since').eq('id',linkedCard.id).limit(1);
            var row0=colRes.data && colRes.data[0];
            if(row0 && !row0.completed_date) cardUpd.completed_date=new Date().toISOString().slice(0,10);
            if(linkedCard.col==='hangups') cardUpd.hangup_since=null;
            var upd1=await _sb.from('briefing_cards').update(cardUpd).eq('id',linkedCard.id);
            if(upd1.error) throw upd1.error;
          } else {
            var upd2=await _sb.from('briefing_cards').update({locked:true, lock_reason:'in_process'}).eq('id',linkedCard.id);
            if(upd2.error) throw upd2.error;
          }
        }
        var upd=await _sb.from('ideas').update({locked:true}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.locked=true;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent='Lock needs the locked Supabase column: '+err.message; }
    });

    T().wire('sb-people-btn', function(e){
      e.stopPropagation();
      _sboardOpenPeopleDropdown(document.getElementById('sb-people-btn'), item, function(){ openSbDetail(item); });
    });

    // Briefing Board tracking, Aug 11 2026 -- deliberately its own
    // button, separate from Lock (Larry: "lock is not the most
    // effective selector" -- Lock already means read-only/fixed-
    // position, unrelated to this). Toggling re-runs the DB trigger
    // (ideas_sync_header_task_card) that actually creates/archives the
    // task card; this just flips the flag and re-opens the same panel
    // so the Open Briefing Card button appears/disappears immediately.
    T().wire('sb-bb-assign', async function(){
      try{
        var newVal=!item.track_on_briefing_board;
        var upd=await _sb.from('ideas').update({track_on_briefing_board:newVal}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.track_on_briefing_board=newVal;
        openSbDetail(item);
      }catch(err){ if(statusBox) statusBox.textContent='Could not update Briefing Board tracking: '+err.message; }
    });
    // Opens in a new tab, Aug 11 2026 (Larry) -- same sessionStorage
    // handoff bp_target already uses for cross-file landing (cloned
    // into the new tab automatically since it's same-origin), plus a
    // second key the Briefing Board's own boot path
    // (_bbInitBoardsAndData, briefing-board.js) checks for and
    // consumes to land on the right card's board instead of whatever
    // it would resume by default.
    T().wire('sb-bb-open', function(){
      if(!item.track_on_briefing_board) return;
      try{
        sessionStorage.setItem('bp_target','4010');
        sessionStorage.setItem('fg_open_card_header_id', item.id);
      }catch(e){}
      window.open(location.pathname+location.search, '_blank');
    });

    (function(){
      var heartBtn=document.getElementById('sb-heart');
      var heartCountEl=document.getElementById('sb-heart-count');
      if(!heartBtn) return;
      var holdTimer=null, held=false;
      async function applyHeartDelta(delta){
        try{
          var newCount=Math.max(0,(item.heart_count||0)+delta);
          var upd=await _sb.from('ideas').update({heart_count:newCount}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.heart_count=newCount;
          if(heartCountEl) heartCountEl.textContent=newCount;
        }catch(err){ if(statusBox) statusBox.textContent='Heart needs the heart_count Supabase column.'; }
      }
      function startHold(){ held=false; holdTimer=setTimeout(function(){ held=true; applyHeartDelta(-1); }, 550); }
      function cancelHold(){ clearTimeout(holdTimer); }
      heartBtn.addEventListener('mousedown', startHold);
      heartBtn.addEventListener('touchstart', startHold);
      heartBtn.addEventListener('mouseup', cancelHold);
      heartBtn.addEventListener('mouseleave', cancelHold);
      heartBtn.addEventListener('touchend', cancelHold);
      heartBtn.addEventListener('click', function(){ if(!held) applyHeartDelta(1); held=false; });
    })();
    T().wire('sb-notes', function(){ document.getElementById('sb-notes-box').style.display='block'; });
    _sboardRenderKeyRow(item);
    var notesBox=document.getElementById('sb-notes-box');
    if(notesBox) notesBox.addEventListener('blur', async function(e){
      var beforeNotes=item.notes||'';
      var newNotes=e.target.value;
      if(newNotes===beforeNotes) return;
      try{
        var upd=await _sb.from('ideas').update({notes:newNotes}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.notes=newNotes;
        _sboardPatchRow(item.id, {notes:newNotes});
        (function(){
          var itemId=item.id, before={notes:beforeNotes}, after={notes:newNotes};
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
        })();
      }catch(err){ if(statusBox) statusBox.textContent='Notes need the notes Supabase column.'; }
    });

    // Video/Link, Aug 11 2026 (Larry: "just like on Briefing Card") --
    // mirrors the Briefing Card DETAILS field, reusing the same shared
    // oEmbed resolver (T2TMedia.resolveOEmbed) this file's own 'link'
    // content-type cards already use. Deliberately independent of
    // content_type -- any card (text, image, header) can carry one link
    // attachment, same as a pure link-card can. Saves on blur, same
    // immediate-save convention as Notes just above (not the
    // save-on-close batching Briefing Board's DETAILS uses), then
    // re-renders the board so the tile badge picks it up with no
    // refresh -- the bug fixed earlier this session (idea-capture.js's
    // onSaved ordering) only covered creating a brand-new link card;
    // this is the separate "attach a link to an existing card" path.
    T().wire('sb-link-toggle', function(){ document.getElementById('sb-link-box').style.display='block'; });
    (function(){
      var linkInput=document.getElementById('sb-link-url');
      var linkPreview=document.getElementById('sb-link-preview');
      var _sbLinkPendingUrl=item.link_url||null, _sbLinkPendingThumb=item.link_thumb||null, _sbLinkPendingTitle=item.link_title||null, _sbLinkTimer=null;
      function renderLinkPreview(url, thumb, title){
        if(!linkPreview) return;
        if(!url){ linkPreview.style.display='none'; linkPreview.innerHTML=''; return; }
        linkPreview.style.display='block';
        linkPreview.innerHTML=(thumb?('<img src="'+_sboardEsc(thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+_sboardEsc(title||url);
      }
      async function saveLinkField(){
        var val=linkInput?linkInput.value.trim():'';
        var newUrl=val||null, newTitle=null, newThumb=null;
        if(newUrl){
          if(newUrl===_sbLinkPendingUrl){ newTitle=_sbLinkPendingTitle||newUrl; newThumb=_sbLinkPendingThumb||null; }
          else { newTitle=newUrl; newThumb=null; }
        }
        if(newUrl===(item.link_url||null) && newTitle===(item.link_title||null) && newThumb===(item.link_thumb||null)) return;
        var beforeFields={link_url:item.link_url||null, link_title:item.link_title||null, link_thumb:item.link_thumb||null};
        var patch={link_url:newUrl, link_title:newTitle, link_thumb:newThumb};
        try{
          var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.link_url=newUrl; item.link_title=newTitle; item.link_thumb=newThumb;
          _sboardPatchRow(item.id, patch);
          (function(){
            var itemId=item.id, before=beforeFields, after=patch;
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Video/Link needs the link_url Supabase column: '+err.message; }
      }
      if(linkInput) linkInput.addEventListener('input', function(){
        var val=linkInput.value.trim();
        if(_sbLinkTimer) clearTimeout(_sbLinkTimer);
        if(!val){ _sbLinkPendingUrl=null; _sbLinkPendingThumb=null; _sbLinkPendingTitle=null; renderLinkPreview(null); return; }
        if(!/^https?:\/\/\S+$/i.test(val)) return;
        _sbLinkTimer=setTimeout(async function(){
          var meta=(window.T2TMedia && window.T2TMedia.resolveOEmbed) ? await window.T2TMedia.resolveOEmbed(val) : null;
          if(linkInput.value.trim()!==val) return;
          _sbLinkPendingUrl=val; _sbLinkPendingThumb=(meta&&meta.thumbnail_url)||null; _sbLinkPendingTitle=(meta&&meta.title)||val;
          renderLinkPreview(_sbLinkPendingUrl,_sbLinkPendingThumb,_sbLinkPendingTitle);
        }, 500);
      });
      if(linkInput) linkInput.addEventListener('blur', saveLinkField);
      T().wire('sb-link-clear', function(){
        if(_sbLinkTimer){ clearTimeout(_sbLinkTimer); _sbLinkTimer=null; }
        _sbLinkPendingUrl=null; _sbLinkPendingThumb=null; _sbLinkPendingTitle=null;
        if(linkInput) linkInput.value='';
        renderLinkPreview(null);
        saveLinkField();
      });
    })();

    T().wire('sb-misc-pinned', async function(){
      try{
        // Card-details sweep, July 19, 2026: T2TShared.currentTopicId is
        // 9710-only (never set by 9711's own navigation) -- use 9711's
        // handed-over Topic id when it's the active screen, same as the
        // rest of this sweep.
        var targetId=await T2TData.ensureMiscHeader((isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : T2TShared.currentTopicId);
        var newCluster=isMisc?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    async function _sbDoTrash(){
      if(isHeaderType){ closeSbDetail(); _sboardConfirmTrashHeader(item); return; }
      var beforeCluster=item.cluster_id, beforeSort=item.sort_order;
      try{
        var targetId=await T2TData.ensureTrashHeader();
        var newCluster=isTrashed?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        _sboardPatchRow(item.id, {cluster_id:newCluster});
        (function(){
          var itemId=item.id, before={cluster_id:beforeCluster, sort_order:beforeSort}, after={cluster_id:newCluster, sort_order:beforeSort};
          _sboardPushAction({label:isTrashed?'Restore':'Delete', undo:function(){ return _sboardApplyRowSnapshot(itemId, before); }, redo:function(){ return _sboardApplyRowSnapshot(itemId, after); }});
        })();
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    }
    var trashOverlay=document.getElementById('sb-trash-overlay');
    var lastTrashClick=0;
    T().wire('sb-trash', function(){
      var now=Date.now();
      if(now-lastTrashClick<350){
        // Double click — skip the confirm, trash it now.
        if(trashOverlay) trashOverlay.style.display='none';
        _sbDoTrash();
      } else if(trashOverlay){
        trashOverlay.style.display='flex';
      }
      lastTrashClick=now;
    });
    T().wire('sb-trash-yes', function(){ if(trashOverlay) trashOverlay.style.display='none'; _sbDoTrash(); });
    T().wire('sb-trash-no', function(){ if(trashOverlay) trashOverlay.style.display='none'; });

    // Gear → color swatches
    T().wire('sb-gear', function(){
      var row=document.getElementById('sb-swatch-row');
      row.style.display=(row.style.display==='none'||!row.style.display)?'flex':'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sb-swatch'), function(btn){
      btn.addEventListener('click', async function(){
        var c=btn.getAttribute('data-c');
        var beforeColor=item.color;
        try{
          var upd=await _sb.from('ideas').update({color:c}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.color=c;
          _sboardPatchRow(item.id, {color:c});
          (function(){
            var itemId=item.id, before={color:beforeColor}, after={color:c};
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          try{ localStorage.setItem('t2t_seaOfIdeas_'+(isHeaderType?'header':'subber')+'Color', c); }catch(e){}
          // 9711 SESSION: patch the one on-screen tile directly instead of
          // a full board reload for a single-card color change — Larry,
          // July 18, 2026. isxPatchColor only exists (and only returns
          // true) when 9711 is active and the tile is actually on screen;
          // otherwise fall back to the old full-refresh delegation.
          var patchedInPlace = window.T2TStoryboard && T2TStoryboard.isxPatchColor && T2TStoryboard.isxPatchColor(item.id, c);
          if(!patchedInPlace) renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Color needs the color Supabase column: '+err.message; }
      });
    });

    T().wire('sb-close', closeSbDetail);
  }
  // Traveler color-options shortcut -- opens the normal DETAILS back but
  // auto-expands the swatch row so a double-click lands directly on color
  // choices instead of requiring an extra tap on the Appearance gear.
  function openSbDetailToColor(item){
    openSbDetail(item);
    var row=document.getElementById('sb-swatch-row');
    if(row) row.style.display='flex';
  }

  // Signal Flags UI, Aug 3 2026 -- three small pieces reached from a
  // card's DETAILS card: the Signal Flags row itself (up to 3 slots + one "+"),
  // the picker that opens when any slot is tapped (assign/remove/build
  // new), and the builder (shape+color+meaning) reached either from the
  // picker or straight from the gear menu's library manager. Mirrors the
  // Briefing Board's own Signal Flags flow (Choose a Signal Flag / Add a Signal Flag)
  // almost exactly -- proven UX, just pointed at the new shared
  // custom_keys table instead of a board-scoped one.
  var _sboardKeyDraft = {shape:_sboardKeyShapes[0], color:_sboardKeyColors[0]};

  function _sboardRenderKeyRow(item){
    var row=document.getElementById('sb-keys-row'); if(!row) return;
    var keys=_sboardItemKeys(item);
    var html='';
    for(var i=0;i<keys.length;i++){
      var k=_sboardKeyById(keys[i]);
      if(!k) continue;
      html += '<button class="sb-notes-pill sb-key-slot-btn" data-slot="'+i+'" title="'+_sboardEsc(k.meaning||'')+'">'
        +'<span style="display:inline-block;width:12px;height:12px;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span></button>';
    }
    if(keys.length<MAX_KEYS_PER_CARD){
      // Classic (+), Aug 7 2026 (Larry) -- swapped out the "🔑 +" pill for
      // the same dashed-circle plus every other [+] add control on the
      // board already uses (see .sc-add-subber-tile), just sized to sit
      // level with the heart pill and flag badges in this row.
      html += '<button class="sb-flag-add-btn sb-key-slot-btn" data-slot="'+keys.length+'" title="Add a flag">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.sb-key-slot-btn').forEach(function(btn){
      var slotIdx=Number(btn.getAttribute('data-slot'));
      var isFilled = slotIdx<keys.length;
      // Click-and-hold a filled Signal Flag to see every other card
      // carrying that same flag -- Aug 15 2026 (Larry: "consistent
      // process to see what is 'inside'," same 550ms hold as the
      // header-stack peek and the heart-pill tap/hold). A short
      // click/tap still opens the picker as before; this is purely
      // additive, and only applies to a slot that already has a flag
      // in it -- the empty "+" slot has nothing to peek at.
      if(isFilled){
        var keyId=keys[slotIdx];
        var kHoldTimer=null, kHeld=false, kStartX=0, kStartY=0;
        // Aug 15 2026 fix -- only cancel the hold once a touch has
        // actually drifted (10px), not on the first touchmove event.
        // Natural finger jitter fires touchmove almost immediately even
        // when someone means to hold still, and unlike the header-stack
        // peek (which has the CLUSTER pill as a fallback doorway), this
        // is the only way in -- a twitchy cancel would make it silently
        // unreachable on touch.
        function kStartHold(e){
          kHeld=false;
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          kStartX=pt.clientX; kStartY=pt.clientY;
          kHoldTimer=setTimeout(function(){ kHeld=true; var k=_sboardKeyById(keyId); if(k) openSbKeyPeek(k); }, 550);
        }
        function kCancelHold(){ clearTimeout(kHoldTimer); }
        function kMoveCheck(e){
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          if(Math.abs(pt.clientX-kStartX)>10 || Math.abs(pt.clientY-kStartY)>10) kCancelHold();
        }
        btn.addEventListener('mousedown', kStartHold);
        btn.addEventListener('touchstart', kStartHold);
        btn.addEventListener('mouseup', kCancelHold);
        btn.addEventListener('mouseleave', kCancelHold);
        btn.addEventListener('touchend', kCancelHold);
        btn.addEventListener('touchmove', kMoveCheck);
        btn.addEventListener('click', function(){ if(!kHeld) _sboardOpenKeyPicker(item, slotIdx); kHeld=false; });
      } else {
        btn.addEventListener('click', function(){
          _sboardOpenKeyPicker(item, slotIdx);
        });
      }
    });
  }

  // Shows the whole shared library every time a slot is tapped, same as
  // the Briefing Board ("so you know what's already possible") --
  // greying out any key already sitting in one of this card's OTHER
  // slots, since the same key showing twice on one card would just be
  // confusing.
  function _sboardOpenKeyPicker(item, slotIndex){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var keys=_sboardItemKeys(item);
    var hasKey=!!keys[slotIndex];
    var listHTML;
    if(!_sboardKeyLib.length){
      listHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:6px">No signal flags yet — build your first one below.</div>';
    } else {
      listHTML=_sboardKeyLib.map(function(k){
        var usedElsewhere = keys.indexOf(k.id)>=0 && keys[slotIndex]!==k.id;
        return '<div class="sb-key-pick-row">'
          +'<button class="sb-key-pick-select" data-key-id="'+k.id+'"'+(usedElsewhere?' disabled':'')+'>'
          +'<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>'
          +'<span style="font-size:calc(12px * var(--fg-text-scale,1))">'+_sboardEsc(k.meaning||'')+'</span>'
          +'</button>'
          // Pencil-to-edit, Aug 4 2026 -- Larry: "I must have a way to
          // edit or change the meaning of any one of them" from wherever
          // he actually runs into a key, not just the library manager
          // buried in the gear menu. Same edit form as the library
          // manager (_sboardOpenKeyBuilder with existingKey), just
          // reachable from the Choose-a-Signal-Flag picker too.
          +'<button class="sb-key-pick-edit" data-key-id="'+k.id+'" title="Edit this signal flag">✏️</button>'
          +'</div>';
      }).join('');
    }
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Choose a Signal Flag</div>'
      +'<div style="max-height:220px;overflow-y:auto;margin-bottom:8px">'+listHTML+'</div>'
      +'<button class="sc-ov-btn save" id="sb-key-build-new" style="width:100%;margin-bottom:6px"'+(_sboardKeyLib.length>=MAX_KEY_LIBRARY?' disabled':'')+'>+ Build a new signal flag</button>'
      +(hasKey?'<button class="sc-ov-btn" id="sb-key-remove" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8">Remove this signal flag</button>':'')
      +'<button class="sc-ov-btn" id="sb-key-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    ov.querySelectorAll('.sb-key-pick-select').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(btn.hasAttribute('disabled')) return;
        _sboardAssignKeyToSlot(item, slotIndex, btn.getAttribute('data-key-id'));
      });
    });
    ov.querySelectorAll('.sb-key-pick-edit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key=_sboardKeyById(btn.getAttribute('data-key-id'));
        if(key) _sboardOpenKeyBuilder(function(){ _sboardOpenKeyPicker(item, slotIndex); renderSeaBoard(true); }, key);
      });
    });
    T().wire('sb-key-build-new', function(){ _sboardOpenKeyBuilder(function(newKey){ _sboardAssignKeyToSlot(item, slotIndex, newKey.id); }); });
    T().wire('sb-key-remove', function(){ _sboardAssignKeyToSlot(item, slotIndex, null); });
    T().wire('sb-key-cancel', function(){ openSbDetail(item); });
  }

  async function _sboardAssignKeyToSlot(item, slotIndex, keyIdOrNull){
    var keys=_sboardItemKeys(item);
    // Aug 3 2026: capture whichever key is actually changing (the new
    // one on assign, the outgoing one on remove) before the splice, so
    // _sboardSyncKeyLinks below reconciles the right key either way.
    var affectedKeyId = (keyIdOrNull===null) ? keys[slotIndex] : keyIdOrNull;
    if(keyIdOrNull===null){
      keys.splice(slotIndex,1); // gap-free removal -- matches Briefing Board
    } else {
      keys[slotIndex]=keyIdOrNull;
    }
    try{ await _sboardWriteItemKeys(item.id, keys); }catch(err){}
    openSbDetail(item);
    // Bug, Aug 3 2026 -- Larry: "not seeing custom key on front of card
    // yet?" _sboardWriteItemKeys updates the cached row in memory, but
    // the actual tile sitting on the board was already built (and its
    // badge HTML already inserted) by an earlier renderSeaBoard() call --
    // mutating the JS object after the fact doesn't touch DOM that's
    // already on screen. Every other card edit (move, trash, recolor)
    // already calls renderSeaBoard() to pick up its own change; this one
    // was missing it.
    renderSeaBoard(true);
    // "Place same symbol on cards and they automatically link" -- Larry,
    // Aug 3 2026. _sboardWriteItemKeys above already awaited, so this
    // key's own database row is current by the time _sboardSyncKeyLinks
    // goes looking for who holds it.
    if(affectedKeyId) await _sboardSyncKeyLinks(affectedKeyId);
  }

  // Reached either from a card's Choose-a-Signal-Flag ("+ Build a new signal flag") or
  // straight from the gear menu's library manager -- onSaved(newKeyRow)
  // decides what happens next in either case (assign it to the slot that
  // opened the picker, or just refresh the library list).
  // existingKey -- optional (Aug 3 2026, pencil-to-edit from the Signal Flags
  // manager). Pre-fills shape/color/meaning from a real row and
  // switches the Save button into update mode instead of insert.
  function _sboardOpenKeyBuilder(onSaved, existingKey){
    _sboardKeyDraft = existingKey
      ? {shape:existingKey.shape, color:existingKey.color, editingId:existingKey.id}
      : {shape:_sboardKeyShapes[0], color:_sboardKeyColors[0]};
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+(existingKey?'Edit Signal Flag':'Add a Signal Flag')+'</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px">Shape</div>'
      +'<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">'
        +_sboardKeyShapes.map(function(s){ return '<button class="sb-key-shape-btn" data-shape="'+s+'" title="'+s+'"><span style="display:block;width:16px;height:16px;'+_sboardKeyShapeCSS(s,'#3B2510')+'"></span></button>'; }).join('')
      +'</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px">Color</div>'
      +'<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">'
        +_sboardKeyColors.map(function(c){ return '<button class="sb-key-swatch-btn" data-color="'+c+'" style="background:'+c+'"></button>'; }).join('')
      +'</div>'
      +'<input type="text" id="sb-key-meaning" placeholder="What does this mean?" value="'+(existingKey?_sboardEsc(existingKey.meaning||''):'')+'" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px">'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-key-save" style="flex:1">'+(existingKey?'Save changes':'Save')+'</button><button class="sc-ov-btn" id="sb-key-cancel2" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    function highlightShape(){ ov.querySelectorAll('.sb-key-shape-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-shape')===_sboardKeyDraft.shape); }); }
    function highlightColor(){ ov.querySelectorAll('.sb-key-swatch-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-color')===_sboardKeyDraft.color); }); }
    highlightShape(); highlightColor();
    ov.querySelectorAll('.sb-key-shape-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _sboardKeyDraft.shape=btn.getAttribute('data-shape'); highlightShape(); });
    });
    ov.querySelectorAll('.sb-key-swatch-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _sboardKeyDraft.color=btn.getAttribute('data-color'); highlightColor(); });
    });
    T().wire('sb-key-cancel2', closeSbDetail);
    T().wire('sb-key-save', async function(){
      var meaningEl=document.getElementById('sb-key-meaning');
      var meaning=meaningEl?meaningEl.value.trim():'';
      if(!meaning){ if(meaningEl) meaningEl.focus(); return; }
      try{
        var savedKey = _sboardKeyDraft.editingId
          ? await _sboardUpdateKey(_sboardKeyDraft.editingId, _sboardKeyDraft.shape, _sboardKeyDraft.color, meaning)
          : await _sboardCreateKey(_sboardKeyDraft.shape, _sboardKeyDraft.color, meaning);
        if(onSaved) onSaved(savedKey); else closeSbDetail();
      }catch(err){
        if(meaningEl) meaningEl.style.borderColor='#b8562f';
      }
    });
  }

  // Gear menu entry, Aug 3 2026 -- Larry: "This option could be in every
  // gear?" View the whole shared library, delete signal flags nobody needs
  // anymore (un-tags any card that had it -- the database does that
  // automatically, see the key_slot_1/2/3 foreign keys), or add a new
  // one straight from here without needing a card open first.
  function _sboardOpenKeyLibraryManager(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var listHTML;
    if(!_sboardKeyLib.length){
      listHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">No signal flags yet. Build one below — then tap any card\'s Signal Flags row to use it.</div>';
    } else {
      listHTML=_sboardKeyLib.map(function(k){
        return '<div class="sb-key-lib-row">'
          +'<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>'
          +'<span style="font-size:calc(12px * var(--fg-text-scale,1));flex:1;text-align:left">'+_sboardEsc(k.meaning||'')+'</span>'
          +'<button class="sb-key-lib-edit" data-key-id="'+k.id+'" title="Edit this signal flag" style="border:none;background:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#5b9bd5">✏️</button>'
          +'<button class="sb-key-lib-del" data-key-id="'+k.id+'" title="Delete this signal flag" style="border:none;background:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#b8562f">🗑️</button>'
          +'</div>';
      }).join('');
    }
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:4px">Signal Flags</div>'
      +'<div style="font-size:calc(10px * var(--fg-text-scale,1));font-style:italic;color:#a3907a;margin-bottom:10px">One shared set, usable on any card, any board. Hover a flag on a card to see what it means.</div>'
      +'<div style="max-height:220px;overflow-y:auto;margin-bottom:8px">'+listHTML+'</div>'
      +'<button class="sc-ov-btn save" id="sb-keylib-add" style="width:100%;margin-bottom:6px"'+(_sboardKeyLib.length>=MAX_KEY_LIBRARY?' disabled':'')+'>+ Add a signal flag</button>'
      +'<button class="sc-ov-btn" id="sb-keylib-close" style="width:100%">Close</button>'
      +'</div>';
    ov.classList.add('active');
    ov.querySelectorAll('.sb-key-lib-edit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key=_sboardKeyById(btn.getAttribute('data-key-id'));
        if(key) _sboardOpenKeyBuilder(function(){ _sboardOpenKeyLibraryManager(); renderSeaBoard(true); }, key);
      });
    });
    ov.querySelectorAll('.sb-key-lib-del').forEach(function(btn){
      btn.addEventListener('click', async function(){
        try{ await _sboardDeleteKey(btn.getAttribute('data-key-id')); }catch(e){}
        _sboardOpenKeyLibraryManager();
        renderSeaBoard(true);
      });
    });
    T().wire('sb-keylib-add', function(){ _sboardOpenKeyBuilder(function(){ _sboardOpenKeyLibraryManager(); renderSeaBoard(true); }); });
    T().wire('sb-keylib-close', closeSbDetail);
  }

  // Drag helper for IDEA CARD (1011), Aug 19 2026 -- same behavior as
  // briefing-board.js's _bbMakeDraggable, but NOT the same wiring: the
  // Briefing Card overlay is built once and its DOM node reused on every
  // open, so binding fresh document-level mousemove/mouseup listeners
  // per-open is harmless there. IDEA CARD's ov.innerHTML is rebuilt from
  // scratch every single time a card is opened (different card, different
  // content) -- copying _bbMakeDraggable verbatim would stack up a new
  // set of document listeners on every open, forever, since document
  // itself never goes away. Fixed here by binding the document-level
  // move/up listeners exactly once (module-level, guarded), and keeping
  // only the per-open state (which card is moving) in a shared variable
  // that mousedown on the fresh headEl sets and mouseup clears. The
  // mousedown/touchstart listeners still get added to the current headEl
  // each open, but that element (and its listeners) is discarded along
  // with it when the overlay's innerHTML is cleared on close.
  var _sbDragListenersBound=false, _sbDragState=null;
  function _sbMakeDraggable(cardEl, headEl){
    if(!cardEl || !headEl) return;
    function onDown(e){
      if(e.target.closest('#sb-close')) return;
      var pt = e.touches ? e.touches[0] : e;
      var rect=cardEl.getBoundingClientRect();
      _sbDragState={cardEl:cardEl, headEl:headEl, startX:pt.clientX, startY:pt.clientY, startLeft:rect.left, startTop:rect.top};
      cardEl.style.position='fixed';
      cardEl.style.margin='0';
      cardEl.style.left=rect.left+'px';
      cardEl.style.top=rect.top+'px';
      headEl.style.cursor='grabbing';
      e.preventDefault();
    }
    headEl.style.cursor='grab';
    headEl.addEventListener('mousedown', onDown);
    headEl.addEventListener('touchstart', onDown, {passive:false});
    if(_sbDragListenersBound) return;
    _sbDragListenersBound=true;
    document.addEventListener('mousemove', function(e){
      if(!_sbDragState) return;
      var pt = e.touches ? e.touches[0] : e;
      var st=_sbDragState;
      st.cardEl.style.left=(st.startLeft+(pt.clientX-st.startX))+'px';
      st.cardEl.style.top=(st.startTop+(pt.clientY-st.startY))+'px';
      e.preventDefault();
    }, {passive:false});
    document.addEventListener('touchmove', function(e){
      if(!_sbDragState) return;
      var pt = e.touches ? e.touches[0] : e;
      var st=_sbDragState;
      st.cardEl.style.left=(st.startLeft+(pt.clientX-st.startX))+'px';
      st.cardEl.style.top=(st.startTop+(pt.clientY-st.startY))+'px';
      e.preventDefault();
    }, {passive:false});
    function onUp(){
      if(_sbDragState) _sbDragState.headEl.style.cursor='grab';
      _sbDragState=null;
    }
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; ov.style.justifyContent=''; ov.style.paddingLeft=''; }
    // The 👥 dropdown (if this card had it open) lives outside `ov` by
    // this point -- see _sbPeopleMenuEl above -- so clearing ov's own
    // markup doesn't touch it. Without this it's left floating,
    // visible, on the board after the card itself is gone. Session 230.
    if(typeof _sbPeopleMenuEl!=='undefined' && _sbPeopleMenuEl && _sbPeopleMenuEl.parentNode){
      _sbPeopleMenuEl.parentNode.removeChild(_sbPeopleMenuEl);
      _sbPeopleMenuEl=null;
    }
    _sboardActiveId=null;
    // If CLUSTER is open behind this SHAPING card, refresh it — whatever was
    // just edited (moved, renamed, trashed) may have changed what belongs here.
    var clOv=document.getElementById('sb-cluster-overlay');
    if(clOv && clOv.classList.contains('active') && _clusterOpenHeaderId && _sboardAllRowsById[_clusterOpenHeaderId]){
      renderClusterView(_sboardAllRowsById[_clusterOpenHeaderId]);
    }
  }

  /* ── CLUSTER view — Logged July 7, 2026. Renumbered 9717 → 1211 (Aug 19,
     2026, Larry): joins the Dream-phase methodology family (Perceptions
     1200 / Cluster 1210 / Moose Poop 1220 / Resonance 1230 / Sort to
     Simplicity 1240 — see FG Design Notes) as the built screen for the
     Cluster step, not just a Storyboard-proximity number. ──
     A per-bucket sense-making screen, opened from the SHAPING card's VIEW AS
     row. Center = the bucket's own loose ideas, rendered wobbly/unordered —
     same visual language as NEW, reused at this fractal level.
     Shelf (bottom) = the bucket's existing sub-headers, alphabetical — a
     findability tool only, never part of the starburst metaphor. Populating
     a bucket never moves its shelf position; only naming/renaming does,
     since the shelf re-sorts alphabetically on every render. */

  function openClusterView(headerRow, onClose){
    var ov=document.getElementById('sb-cluster-overlay');
    if(!ov) return;
    _clusterOpenHeaderId=headerRow.id;
    _clusterReturnFn=onClose || function(){ openSbDetail(headerRow); };
    _clusterWide=false;
    _clusterCardPos={};
    _clusterSelected={};
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="cl-card">'
      +'<div class="cl-topbar"><div class="cl-title">'+safeName+'</div><div class="cl-topbar-btns"><button class="cl-close" id="cl-full" title="Full screen">⛶</button><button class="cl-close" id="cl-close">✕</button></div></div>'
      +'<div class="cl-hint">Drag one card onto a bucket to sort it in. Drag on empty space to lasso-select several, then move them together. Positions stay put once set.</div>'
      +'<div class="cl-body">'
      +'<div class="cl-shelf-col"><div class="cl-shelf-label">Buckets — A–Z</div><div class="cl-shelf" id="cl-shelf"></div></div>'
      +'<div class="cl-starburst" id="cl-starburst"><div class="cl-empty">Loading…</div></div>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('cl-close', closeClusterView);
    // Full-screen toggle — same underlying mechanism as the storyboard's own
    // ⛶ button (fg-root.sb-wide), so CLUSTER can use the exact same expanded
    // real estate the storyboard already gets, plus its own larger card/tile
    // sizing on top of that.
    T().wire('cl-full', function(){
      _clusterWide=!_clusterWide;
      var btn=document.getElementById('cl-full');
      if(btn){ btn.innerHTML=_clusterWide?'↩':'⛶'; btn.title=_clusterWide?'Back to normal size':'Full screen'; }
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('sb-wide', _clusterWide);
      var card=ov.querySelector('.cl-card');
      if(card) card.classList.toggle('cl-wide', _clusterWide);
      renderClusterView(headerRow);
    });
    renderClusterView(headerRow);
  }

  function closeClusterView(){
    var ov=document.getElementById('sb-cluster-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; }
    // Restore fg-root's width to whatever the storyboard's OWN desktop toggle
    // says it should be — CLUSTER's fullscreen toggle borrows that same class
    // while open, but shouldn't leave it stuck on (or off) once you leave.
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop);
    var fn=_clusterReturnFn;
    _clusterOpenHeaderId=null; _clusterReturnFn=null; _clusterWide=false;
    if(fn) fn();
  }

  async function renderClusterView(headerRow){
    var burst=document.getElementById('cl-starburst');
    var shelf=document.getElementById('cl-shelf');
    var _sb=T().sb;
    if(!burst || !shelf || !_sb) return;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board')
        .eq('cluster_id',headerRow.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(300);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      rows.forEach(function(r){ _sboardAllRowsById[r.id]=r; });

      var looseCards=rows.filter(function(r){ return r.content_type==='text'||r.content_type==='image'; }).sort(_sboardBySortOrder);
      var buckets=rows.filter(function(r){ return r.content_type==='header'; })
        .sort(function(a,b){ return (a.text_content||'').localeCompare(b.text_content||''); });

      _sboardIdeaOrderByParent[headerRow.id]=looseCards.map(function(r){ return r.id; });

      var tileSize=_clusterWide?92:66;
      burst.innerHTML='';
      if(!looseCards.length){
        burst.innerHTML='<div class="cl-empty">Nothing loose here — every idea has found a bucket.</div>';
      } else {
        // Genuine scatter, not a wrapped row: build a canvas taller than the
        // visible viewport when there are enough cards to need it (scrolls),
        // then drop each tile at a randomized (x, y) — not a grid cell, not
        // a row — with light rejection sampling so cards don't all pile on
        // top of each other.
        var canvas=document.createElement('div');
        var canvasW=Math.max(220, burst.clientWidth-4);
        var viewportH=Math.max(220, burst.clientHeight-4);
        var areaPerCard=tileSize*tileSize*2.5; // breathing room per card
        var neededH=Math.ceil((looseCards.length*areaPerCard)/canvasW);
        var canvasH=Math.max(viewportH, neededH);
        canvas.className='cl-canvas';
        canvas.style.height=canvasH+'px';
        burst.appendChild(canvas);

        var maxX=Math.max(0, canvasW-tileSize);
        var maxY=Math.max(0, canvasH-tileSize);
        var placedCenters=[];

        // Anything CLUSTER has already placed this session — either the
        // random spot it got the first time it appeared, or somewhere a
        // traveler dragged it — keeps that exact spot. Nothing reshuffles on
        // a re-render; only a card CLUSTER has genuinely never shown before
        // gets a fresh random placement.
        var knownItems=[], newItems=[];
        looseCards.forEach(function(item){
          if(_clusterCardPos[item.id]) knownItems.push(item); else newItems.push(item);
        });
        knownItems.forEach(function(item){
          var pos=_clusterCardPos[item.id];
          var x=Math.max(0,Math.min(maxX,pos.x)), y=Math.max(0,Math.min(maxY,pos.y));
          _clusterCardPos[item.id]={x:x,y:y};
          placedCenters.push([x+tileSize/2, y+tileSize/2]);
          canvas.appendChild(_clusterMakeStarburstTile(item, headerRow, tileSize, Math.round(x), Math.round(y)));
        });

        // Uses its own tile factory, not the shared _sboardMakeTile — dropping
        // one loose idea onto another here means "form a new cluster," not
        // "reorder," which is what the same drop already means on the main
        // storyboard. Two different meanings for the same gesture would be
        // ambiguous on one screen, so CLUSTER gets its own drop behavior.
        newItems.forEach(function(item){
          var best=null, bestMinDist=-1;
          for(var attempt=0; attempt<10; attempt++){
            var x=Math.random()*maxX, y=Math.random()*maxY;
            var cx=x+tileSize/2, cy=y+tileSize/2;
            if(!placedCenters.length){ best={x:x,y:y,cx:cx,cy:cy}; break; }
            var minDist=Infinity;
            for(var k=0;k<placedCenters.length;k++){
              var dx=cx-placedCenters[k][0], dy=cy-placedCenters[k][1];
              var d=Math.sqrt(dx*dx+dy*dy);
              if(d<minDist) minDist=d;
            }
            if(minDist>bestMinDist){ bestMinDist=minDist; best={x:x,y:y,cx:cx,cy:cy}; }
            if(minDist>=tileSize*0.6) break;
          }
          placedCenters.push([best.cx,best.cy]);
          _clusterCardPos[item.id]={x:Math.round(best.x), y:Math.round(best.y)};
          canvas.appendChild(_clusterMakeStarburstTile(item, headerRow, tileSize, Math.round(best.x), Math.round(best.y)));
        });

        // Lasso select: mousedown on empty canvas (not on a tile) starts a
        // drag-select rectangle. Releasing selects every tile it overlaps.
        // A click with no real movement just clears the current selection.
        canvas.addEventListener('mousedown', function(e){
          if(e.target!==canvas) return;
          e.preventDefault();
          var startRect=canvas.getBoundingClientRect();
          var start={x:e.clientX-startRect.left, y:e.clientY-startRect.top};
          var moved=false;
          var lasso=document.createElement('div');
          lasso.className='cl-lasso';
          lasso.style.left=start.x+'px'; lasso.style.top=start.y+'px';
          lasso.style.width='0px'; lasso.style.height='0px';
          canvas.appendChild(lasso);
          function applySelection(lb){
            _clusterSelected={};
            Array.prototype.forEach.call(canvas.querySelectorAll('.sc-tile'), function(t){
              var tx=parseFloat(t.style.left), ty=parseFloat(t.style.top);
              var overlaps = tx<lb.left+lb.width && tx+tileSize>lb.left && ty<lb.top+lb.height && ty+tileSize>lb.top;
              if(overlaps) _clusterSelected[t.getAttribute('data-idea-id')]=true;
              t.classList.toggle('cl-selected', overlaps);
            });
          }
          function onMove(e2){
            var r=canvas.getBoundingClientRect();
            var cx=e2.clientX-r.left, cy=e2.clientY-r.top;
            if(Math.abs(cx-start.x)>3 || Math.abs(cy-start.y)>3) moved=true;
            var x=Math.min(cx,start.x), y=Math.min(cy,start.y);
            lasso.style.left=x+'px'; lasso.style.top=y+'px';
            lasso.style.width=Math.abs(cx-start.x)+'px';
            lasso.style.height=Math.abs(cy-start.y)+'px';
            // Highlight live as the rectangle passes over tiles, so it's
            // clear before releasing exactly what's about to be grabbed —
            // flagged by Larry, July 18, 2026.
            if(moved) applySelection({left:x, top:y, width:Math.abs(cx-start.x), height:Math.abs(cy-start.y)});
          }
          function onUp(){
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            var lb={left:parseFloat(lasso.style.left), top:parseFloat(lasso.style.top), width:parseFloat(lasso.style.width), height:parseFloat(lasso.style.height)};
            if(lasso.parentNode) lasso.parentNode.removeChild(lasso);
            if(moved){
              applySelection(lb);
            } else {
              _clusterSelected={};
              Array.prototype.forEach.call(canvas.querySelectorAll('.sc-tile'), function(t){
                t.classList.remove('cl-selected');
              });
            }
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        // Dropping onto empty canvas space (not onto another card) just moves
        // the card(s) there and remembers the position(s) — lets a traveler
        // spread cards out to read them, or nudge related ones near each
        // other to think about grouping them, without that being mistaken
        // for actually forming a cluster. If several cards are lasso-selected
        // and one of them is dragged, the whole group moves together,
        // keeping their relative arrangement. Only a direct drop ONTO
        // another card (tile's own drop handler, which stops propagation)
        // asks to name and commit a real bucket.
        canvas.addEventListener('dragover', function(e){ e.preventDefault(); });
        canvas.addEventListener('drop', function(e){
          e.preventDefault();
          var raw=e.dataTransfer.getData('text/plain');
          var ids=_clusterParseDragIds(raw);
          if(!ids.length) return;
          var anchorId=ids[0];
          var anchorTile=canvas.querySelector('[data-idea-id="'+anchorId+'"]');
          if(!anchorTile) return;
          var canvasRect=canvas.getBoundingClientRect();
          var dropX=Math.max(0, Math.min(maxX, e.clientX-canvasRect.left-tileSize/2));
          var dropY=Math.max(0, Math.min(maxY, e.clientY-canvasRect.top-tileSize/2));
          var anchorOld=_clusterCardPos[anchorId]||{x:parseFloat(anchorTile.style.left), y:parseFloat(anchorTile.style.top)};
          var dx=dropX-anchorOld.x, dy=dropY-anchorOld.y;
          ids.forEach(function(id){
            var tileEl=canvas.querySelector('[data-idea-id="'+id+'"]');
            if(!tileEl) return;
            var cur=_clusterCardPos[id]||{x:parseFloat(tileEl.style.left), y:parseFloat(tileEl.style.top)};
            var nx=Math.max(0, Math.min(maxX, cur.x+dx));
            var ny=Math.max(0, Math.min(maxY, cur.y+dy));
            _clusterCardPos[id]={x:Math.round(nx), y:Math.round(ny)};
            tileEl.style.left=Math.round(nx)+'px';
            tileEl.style.top=Math.round(ny)+'px';
          });
        });
      }

      shelf.innerHTML='';
      buckets.forEach(function(b){
        var pill=document.createElement('div');
        pill.className='cl-bucket';
        pill.textContent=b.text_content||'(untitled)';
        pill.title=(b.text_content||'(untitled)')+' — tap to see what\'s inside · drag here to sort an idea in · drag onto another bucket to nest it';
        // Draggable too — lets one bucket be dropped onto another to nest it,
        // same "header:"-prefixed payload convention the storyboard itself
        // already uses for header drags.
        pill.draggable=true;
        pill.addEventListener('dragstart', function(e){ e.stopPropagation(); e.dataTransfer.setData('text/plain','header:'+b.id); });
        // Click = peek inside (existing openSbHeaderPeek, shared with the
        // board's own HEADER view-as button). Renaming lives inside the peek
        // now (✏️ button) rather than on the pill itself — putting rename on
        // click AND drag on the same element caused exactly the click/dblclick
        // race the main board already hit and fixed once before.
        pill.addEventListener('click', function(){ openSbHeaderPeek(b); });
        pill.addEventListener('dragover', function(e){ e.preventDefault(); pill.classList.add('dragover'); });
        pill.addEventListener('dragleave', function(){ pill.classList.remove('dragover'); });
        pill.addEventListener('drop', function(e){
          e.preventDefault(); e.stopPropagation(); pill.classList.remove('dragover');
          var raw=e.dataTransfer.getData('text/plain');
          _clusterHandleDrop(raw, b.id, headerRow);
        });
        shelf.appendChild(pill);
      });

      var newBtn=document.createElement('div');
      newBtn.className='cl-newbucket';
      newBtn.textContent='+';
      newBtn.title='Name a new bucket';
      newBtn.addEventListener('click', function(){ _clusterStartNewBucket(newBtn, headerRow); });
      shelf.appendChild(newBtn);
    }catch(err){
      burst.innerHTML='<div class="cl-empty" style="color:#b8562f">'+err.message+'</div>';
    }
  }

  // Starburst tile — deliberately NOT the shared _sboardMakeTile. On the main
  // storyboard, dropping one idea tile onto another means "reorder." Here it
  // means "form a new cluster" — same gesture, different screen, different
  // meaning, so it needs its own drop wiring rather than overloading the
  // shared one. Visuals (image/text, heart badge) mirror the shared tile so
  // the two screens still feel like the same object.
  //
  // Positioned absolutely at (left, top) on the canvas the caller computed —
  // NOT flowed via flex-wrap. Flex-wrap, even with per-tile jitter, still
  // places tiles left-to-right in rows under the hood, so it always reads as
  // a row with a wobble rather than genuine scatter. True randomness needs
  // real (x, y) freedom, not paint-only jitter on top of a row layout.
  function _clusterMakeStarburstTile(item, headerRow, size, left, top){
    var rot=(Math.random()*44-22).toFixed(1);
    var scale=(0.90+Math.random()*0.22).toFixed(2);
    var restTransform='rotate('+rot+'deg) scale('+scale+')';
    var baseZ=1+Math.floor(Math.random()*30);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'')+(_clusterSelected[item.id]?' cl-selected':'');
    tile.setAttribute('data-idea-id', String(item.id));
    tile.draggable=true;
    // Dragging a lasso-selected card carries the whole selection with it —
    // dragging any other card (selected or not part of a multi-selection)
    // behaves exactly as before, just that one card.
    tile.addEventListener('dragstart', function(e){
      e.stopPropagation();
      var selectedIds=Object.keys(_clusterSelected);
      if(selectedIds.length>1 && _clusterSelected[item.id]){
        var rest=selectedIds.filter(function(id){ return String(id)!==String(item.id); });
        e.dataTransfer.setData('text/plain', 'group:'+[item.id].concat(rest).join(','));
      } else {
        e.dataTransfer.setData('text/plain', String(item.id));
      }
    });
    tile.style.cssText='position:absolute;left:'+left+'px;top:'+top+'px;width:'+size+'px;height:'+size+'px;border-radius:10px;cursor:pointer;transform:'+restTransform+';transition:transform .15s;z-index:'+baseZ+(item.color?';background:'+item.color:'');
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.18)'; tile.style.zIndex='999'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform=restTransform; tile.style.zIndex=String(baseZ); });
    if((item.content_type==='image'||item.content_type==='link') && item.image_url){
      var img=document.createElement('img');
      img.src=item.image_url;
      img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;pointer-events:none';
      tile.appendChild(img);
      if(item.content_type==='image' && item.text_content){
        var cap=document.createElement('div');
        cap.className='sc-tile-caption';
        cap.textContent=item.text_content;
        tile.appendChild(cap);
      }
    } else if(item.content_type==='link'){
      var lp=document.createElement('p');
      lp.textContent='\ud83d\udd17 '+T2TMedia.parseText(item.text_content).title;
      lp.style.cssText='margin:0;font-size:calc(8.5px * var(--fg-text-scale,1));line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      p.textContent=item.text_content||'(untitled)';
      p.style.cssText='margin:0;font-size:calc(8.5px * var(--fg-text-scale,1));line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none';
      tile.appendChild(p);
    }
    // Video/Link flag only here (matches this tile's behavior before
    // the Aug 15 2026 signal-cluster refactor -- this small CLUSTER
    // starburst tile never showed Lock/Flags/Notes).
    tile.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(item, {link:true}));
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent=item.heart_count>=2?'💕':'❤️';
      tile.appendChild(hb);
    }
    // Double-click is the traveler color-options shortcut (locked July 27,
    // 2026) -- opens the same DETAILS back the corner-flip does, but jumps
    // straight to the color swatches instead of leaving them collapsed
    // behind the Appearance gear. The corner-flip remains the only way to
    // open the back generally; this dblclick used to just duplicate it.
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(item); });
    tile.addEventListener('dragover', function(e){ e.preventDefault(); tile.style.outline='2px solid #5b9bd5'; });
    tile.addEventListener('dragleave', function(){ tile.style.outline='none'; });
    tile.addEventListener('drop', function(e){
      e.preventDefault(); e.stopPropagation(); tile.style.outline='none';
      var raw=e.dataTransfer.getData('text/plain');
      var ids=_clusterParseDragIds(raw).filter(function(id){ return String(id)!==String(item.id); });
      if(!ids.length) return;
      _clusterOfferStack(ids, item.id, headerRow);
    });
    return tile;
  }

  // Reads a drop payload set by dragstart above: a plain idea id, or
  // "group:id1,id2,id3" when a multi-card lasso selection was dragged.
  // Header drags ("header:"-prefixed) are never groups and are handled by
  // their own callers, so this returns nothing for those.
  function _clusterParseDragIds(raw){
    if(!raw) return [];
    if(raw.indexOf('header:')===0) return [];
    if(raw.indexOf('group:')===0) return raw.slice(6).split(',').filter(Boolean);
    return [raw];
  }

  // Drop one or more loose ideas onto another — forces a name before
  // anything is created. Cancel, or leave it blank, and every card stays
  // exactly as it was: loose, unstacked, nothing written. There is no
  // unnamed-stack state.
  function _clusterOfferStack(draggedIds, targetId, headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var count=draggedIds.length+1;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:4px">Name this cluster</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;font-style:italic;margin-bottom:10px">Stacking these '+count+' ideas together — cancel to leave them loose instead.</div>'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">HEADER:</label>'
      +'<input id="cl-stack-name" type="text" placeholder="Name it…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="cl-stack-save" style="flex:1">Save</button><button class="sc-ov-btn" id="cl-stack-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('cl-stack-name');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    T().wire('cl-stack-cancel', closeSbDetail);
    T().wire('cl-stack-save', function(){
      var name=((document.getElementById('cl-stack-name')||{}).value||'').trim();
      if(!name){ closeSbDetail(); return; } // no entry = cancel, nothing written
      _clusterCommitStack(draggedIds, targetId, name, headerRow);
    });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ document.getElementById('cl-stack-save').click(); }
      else if(e.key==='Escape'){ document.getElementById('cl-stack-cancel').click(); }
    });
  }

  async function _clusterCommitStack(draggedIds, targetId, name, headerRow){
    var _sb=T().sb;
    var allIds=draggedIds.concat([targetId]);
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
      if(ins.error) throw ins.error;
      _sboardAddRow(ins.data);
      var newHeaderId=ins.data.id;
      for(var i=0;i<allIds.length;i++){
        var upd=await _sb.from('ideas').update({cluster_id:newHeaderId}).eq('id',allIds[i]);
        if(upd.error) throw upd.error;
        _sboardPatchRow(allIds[i], {cluster_id:newHeaderId});
      }
    }catch(err){}
    allIds.forEach(function(id){ delete _clusterCardPos[id]; delete _clusterSelected[id]; });
    closeSbDetail();
    renderSeaBoard(true);
  }

  // Router for anything dropped onto a shelf bucket — a loose idea (plain id
  // or "group:" of several) sorts in; another bucket ("header:"-prefixed id)
  // nests under it. Previously only the single-idea case was handled, so
  // dragging one bucket onto another did nothing — the drop silently
  // no-op'd. Fixed July 7, 2026.
  function _clusterHandleDrop(raw, targetBucketId, headerRow){
    if(!raw) return;
    if(raw.indexOf('header:')===0){
      var draggedId=raw.slice(7);
      if(String(draggedId)===String(targetBucketId)) return;
      _clusterNestHeader(draggedId, targetBucketId, headerRow);
      return;
    }
    var ids=_clusterParseDragIds(raw);
    if(!ids.length) return;
    _clusterMoveCards(ids, targetBucketId, headerRow);
  }

  // Nest one bucket under another — the drag-a-header-onto-a-header gesture.
  // The moved header keeps its own name and everything already nested under
  // it; it simply becomes a subber one level deeper, exactly like dragging it
  // onto a header in the main storyboard already does.
  async function _clusterNestHeader(headerId, targetBucketId, headerRow){
    var _sb=T().sb;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:targetBucketId}).eq('id',headerId);
      if(upd.error) throw upd.error;
      _sboardPatchRow(headerId, {cluster_id:targetBucketId});
    }catch(err){}
    renderClusterView(headerRow);
    renderSeaBoard(true);
  }

  // Drag one or more loose ideas onto a shelf bucket — re-renders CLUSTER (so
  // the card(s) leave the starburst) and the board underneath stays in sync
  // for whenever the traveler exits. Position cache and selection are
  // cleared for anything that moved, since it no longer lives in this
  // starburst.
  async function _clusterMoveCards(ids, bucketId, headerRow){
    var _sb=T().sb;
    try{
      var siblingCount=(_sboardIdeaOrderByParent[bucketId]||[]).length;
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({cluster_id:bucketId, sort_order:siblingCount+i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
        _sboardPatchRow(ids[i], {cluster_id:bucketId, sort_order:siblingCount+i});
      }
    }catch(err){}
    ids.forEach(function(id){ delete _clusterCardPos[id]; delete _clusterSelected[id]; });
    renderClusterView(headerRow);
    renderSeaBoard(true);
  }

  // "+ new bucket" — Name the Baby, ADD flow. Swaps the button for an inline
  // input in place; committing creates a new header nested under this bucket,
  // which then takes its correct alphabetical slot on next render.
  function _clusterStartNewBucket(newBtn, headerRow){
    var shelf=document.getElementById('cl-shelf');
    if(!shelf) return;
    var input=document.createElement('input');
    input.className='cl-newbucket-input';
    input.type='text';
    input.placeholder='Name it…';
    shelf.replaceChild(input, newBtn);
    input.focus();
    var done=false;
    function commit(){
      if(done) return; done=true;
      var name=input.value.trim();
      if(!name){ renderClusterView(headerRow); return; }
      _clusterCreateBucket(name, headerRow);
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ input.blur(); }
      else if(e.key==='Escape'){ done=true; renderClusterView(headerRow); }
    });
  }

  async function _clusterCreateBucket(name, headerRow){
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
      if(ins.error) throw ins.error;
      _sboardAddRow(ins.data);
    }catch(err){}
    renderClusterView(headerRow);
    renderSeaBoard(true);
  }

  /* Renaming a bucket now happens via the ✏️ button inside openSbHeaderPeek,
     which reuses the existing openSbHeaderDetail dialog (name + nest-under,
     already built) — see above. Kept CLUSTER's own rename code out of here
     on purpose, so there's exactly one rename dialog instead of two. */

  // ── LIVE SYNC (Aug 4 2026; row-merge added Aug 9 2026) ── used to just
  // call renderSeaBoard() again on every remote change, which re-fetches
  // this whole account's ideas from Supabase (up to 2000 rows) from
  // scratch -- fine for one traveler working alone, but with several
  // people on a board at once, every single edit anyone makes re-fetches
  // the whole board on every OTHER open tab too, including the tab of
  // whoever just made the edit (their own write echoes back to them).
  // That's what was actually driving the Supabase usage warning, and it
  // gets worse the more people collaborate live -- exactly the direction
  // this project is headed. Now patches the one row Supabase already
  // handed over straight into _sboardAllRowsById (same row-merge
  // approach the Briefing Board's card list already used) and re-renders
  // from that updated cache -- no network round trip. renderSeaBoard()
  // itself is unchanged for every real navigation/local-edit call site;
  // only this live-sync path renders from cache.
  // Coalesced/deferred the same way as the Briefing Board's live sync,
  // so a burst of remote changes doesn't fire a re-render per row, and
  // paused while a card/header is mid-drag.
  var _sboardRtPendingRender = false, _sboardRtTimer = null;
  function _sboardRtSafeRefresh(){
    if (T().isDragActive()) { _sboardRtPendingRender = true; return; }
    if (_sboardRtTimer) clearTimeout(_sboardRtTimer);
    _sboardRtTimer = setTimeout(function(){ _sboardRtTimer = null; renderSeaBoard(true); }, 300);
  }
  window.addEventListener('t2t:drag-end', function(){
    if (_sboardRtPendingRender) { _sboardRtPendingRender = false; _sboardRtSafeRefresh(); }
  });
  function _sboardApplyRemoteIdea(evt, row, oldRow){
    if (evt === 'DELETE') {
      if (oldRow) delete _sboardAllRowsById[oldRow.id];
    } else if (row) {
      // The whole-account fetch this cache was built from is always
      // scoped to this traveler's own rows (.eq('user_id', user.id)) --
      // matters once a Storyboard can be shared (storyboard_members),
      // since RLS may let this tab legitimately *see* a collaborator's
      // row over the realtime channel even though the account-scoped
      // fetch itself would never have pulled it in. Guarding here keeps
      // the patched cache matching exactly what a real re-fetch would
      // have contained.
      var _me=T().getMember && T().getMember();
      if (!_me || String(row.user_id) === String(_me.user_id)) {
        _sboardAllRowsById[row.id] = row;
      }
    }
    // 9711 (session.js) keeps its own separate cache of the same 'ideas'
    // rows -- this is the only place either screen learns about a live
    // change, so both need patching here regardless of which one is
    // actually on screen right now. Aug 9 2026.
    if(window.T2TSea && window.T2TSea.applyRemoteIdeaPatch) window.T2TSea.applyRemoteIdeaPatch(evt, row, oldRow);
    _sboardRtSafeRefresh();
  }
  function _sboardApplyRemoteKey(evt, row, oldRow){
    if (!_sboardKeyLibLoaded) return; // library not fetched in this tab yet -- nothing cached to patch
    if (evt === 'DELETE') {
      if (!oldRow) return;
      _sboardKeyLib = _sboardKeyLib.filter(function(k){ return String(k.id) !== String(oldRow.id); });
    } else {
      var idx = -1;
      for (var i=0;i<_sboardKeyLib.length;i++){ if (String(_sboardKeyLib[i].id) === String(row.id)) { idx=i; break; } }
      if (idx !== -1) _sboardKeyLib[idx] = row; else _sboardKeyLib.push(row);
    }
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    _sboardRtSafeRefresh();
  }

  window.T2TStoryboard = {
    ensureMiscHeader: T2TData.ensureMiscHeader,
    ensureTrashHeader: T2TData.ensureTrashHeader,
    moveCard: _sboardMoveCard,
    isAutoHeaderText: _sboardIsAutoHeaderText,
    getRow: function(id){ return _sboardAllRowsById[id]; },
    openDetail: openSbDetail,
    closeDetail: closeSbDetail,
    applyBoardBg: _sboardApplyBoardBg,
    openBoardBgPicker: openBoardBgPicker,
    // DETAILS' "Move to a different Header" list (openSbDetail, above)
    // reads _sboardVisibleHeaders directly -- populated only by 9710's own
    // renderSeaBoard, so opening DETAILS from 9711 always showed 9710's
    // last-rendered headers (often empty, or from the wrong Topic
    // entirely) instead of the Topic actually on screen. Lets 9711 hand
    // over its own current header list right after it renders, so MOVE
    // works correctly no matter which screen opened DETAILS. Larry, July
    // 18, 2026 ("unable to drop some of the ideas into an existing
    // header, nor can I move it on the back of the card").
    setVisibleHeaders: function(list){ _sboardVisibleHeaders = list||[]; },
    setIsxContext: function(ctx){ _isxDetailCtx = ctx||null; },
    openDetailToColor: openSbDetailToColor,
    drillInto: _sboardDrillInto,
    openKeyLibraryManager: _sboardOpenKeyLibraryManager,
    keyDotsHTML: _sboardKeyDotsHTML,
    assignedBadgeHTML: _sboardAssignedBadgeHTML,
    linkBadgeHTML: _sboardLinkBadgeHTML,
    lockBadgeHTML: _sboardLockBadgeHTML,
    signalRowHTML: _sboardSignalRowHTML,
    ensureAssignedInitials: _sboardEnsureAssignedInitials,
    ensureCardPrimary: _sboardEnsureCardPrimary,
    // Session 234 (Aug 21) -- generalized so briefing-board.js can bring
    // the same 👥 people/Call Sheet system + primary-doer star to
    // Briefing Cards (card_type:'briefing_card') without duplicating any
    // of this logic. See _sboardOpenPeopleDropdown's own comment.
    openPeopleDropdown: _sboardOpenPeopleDropdown,
    ensureCardPrimaryRaw: _sboardEnsureCardPrimaryRaw,
    cardPrimaryUidRaw: _sboardCardPrimaryUidRaw,
    ensureMemberInitials: _sboardEnsureMemberInitials,
    memberInfo: function(uid){ return _sboardAssignedCache[uid]||null; },
    closeBoard: _sboardCloseBoard
  };

  document.addEventListener('DOMContentLoaded', function(){
    injectSeaOfIdeas();
    injectSeaOfIdeasCluster();
    if (T().onRealtimeChange) {
      T().onRealtimeChange('ideas', _sboardApplyRemoteIdea);
      T().onRealtimeChange('custom_keys', _sboardApplyRemoteKey);
    }
  });

})();
