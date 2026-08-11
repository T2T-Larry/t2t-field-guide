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
        +'.sb-key-dots{position:absolute;bottom:2px;right:18px;display:flex;gap:2px;pointer-events:none;z-index:5}'
        // Person Assigned badge (Aug 9 2026, Larry: "look like the BB card
        // with the initials on the front") -- same small circle-with-
        // initials look as the Briefing Board's .bb-dot, scaled down to
        // fit this board's much smaller ~70-76px tile. Bottom-left is the
        // one corner nothing else on the tile claims (order badge is
        // top-left, lock/link are top-right/top-left-ish, heart+key dots+
        // corner-flip share the bottom-right).
        +'.sb-person-badge{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#9c8b73;color:#fff;font-size:calc(7px * var(--fg-text-scale,1));font-weight:700;font-family:sans-serif;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;box-shadow:0 1px 2px rgba(0,0,0,.35)}'
        // Notes badge (Larry, Aug 11 2026: "pencil as signal flag on the
        // front of any card if there are Notes inside") -- bottom-left is
        // the one corner nothing else on the tile claims (order badge is
        // top-left, person/lock share top-right, heart+key-dots+corner-flip
        // share bottom-right).
        +'.sb-notes-badge{position:absolute;bottom:2px;left:2px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none;z-index:6}'
        // Video/Link flag, Aug 11 2026 (Larry: "make link usable, move
        // link flag to lower left corner") -- shares the bottom-left
        // slot with Notes (left:2 / left:18, same stacking convention as
        // heart+key-dots on the bottom-right), and is a real clickable
        // link (not just a pointer-events:none marker) -- opens the
        // attached URL in a new tab. draggable=false keeps a native link
        // drag from hijacking the tile's own drag-to-reorder gesture.
        +'.sb-link-badge{position:absolute;bottom:2px;left:18px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);cursor:pointer;text-decoration:none;z-index:6}'
        // pointer-events:auto here, Aug 4 2026 -- same fix as the
        // Briefing Board's .bb-key-badge: the wrapping .sb-key-dots
        // stays click-through (so it never grabs a card drag), but a
        // dot inherits that "none" too unless it opts back in, which
        // was silently killing its own title-on-hover meaning tooltip.
        +'.sb-key-dot{display:inline-block;width:8px;height:8px;box-shadow:0 1px 2px rgba(0,0,0,.35);pointer-events:auto;cursor:default}'
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
        +'@media print{body *{visibility:hidden}.sb-team-print,.sb-team-print *{visibility:visible}.sb-team-print{position:absolute;left:0;top:0;width:100%!important;box-shadow:none!important}@page{size:landscape}}'
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
        +'#sc-project-hit{cursor:pointer}'
        +'#sc-project-label{font-family:\'Playfair Display\',serif;font-size:calc(12px * var(--fg-text-scale,1));font-weight:700;color:#fff;line-height:1.2}'
        +'#sc-topic-box.dragover,#sc-parent-hit.dragover,#sc-project-hit.dragover{outline:2px solid #5b9bd5}'
        +'.sc-hdr-frame{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:0 12px;box-sizing:border-box;height:30px}'
        +'.sc-hdr-btn-muted{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:0 12px;height:30px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.03em;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;opacity:.85;transition:background .15s,opacity .15s}'
        +'.sc-hdr-btn-muted:hover{background:rgba(255,255,255,.14);opacity:1}'
        +'.sc-hdr-btn-icon{padding:0;width:30px;font-size:calc(14px * var(--fg-text-scale,1))}'
        +'.sc-hdr-frame .sc-hdr-eyebrow{color:rgba(169,204,227,.6)}'
        +'.sc-hdr-frame-label{opacity:.72}'
        // VIEW-by-person filter, Aug 9 2026 (Larry): a dropdown next to
        // PARENT, same idea as the Briefing Board's own VIEW filter
        // (Session 198) -- pulls the current project's real Cast roster
        // and narrows which idea cards show. Purely a display filter,
        // same rule as BB's: never touches sort_order/what's saved, and
        // headers/Subbers always stay visible (they're navigation, not
        // person-filterable content) -- only leaf idea/text/image/link
        // cards get hidden when they don't match.
        +'.sc-hdr-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:0 8px;box-sizing:border-box;height:30px;font-size:calc(11px * var(--fg-text-scale,1));font-family:inherit;max-width:calc(104px * var(--fg-text-scale,1));cursor:pointer;opacity:.85}'
        +'.sc-hdr-select:hover{opacity:1}'
        +'.sc-hdr-select option{color:#2C2C2A}'
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
        +'.sb-blue-row{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
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
        +'.cl-card.cl-wide .cl-newbucket-input{width:100%}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:10px 16px 4px;margin-bottom:0;position:relative;min-height:40px">'
      +'<div style="text-align:center">'
      +'<div class="sc-hdr-eyebrow">Topic</div>'
      +'<div id="sc-topic-box"><span id="sc-topic-text"></span><div id="sc-topic-badge"></div><div class="sc-corner-flip" id="sc-topic-corner-flip" title="Flip card"></div></div>'
      +'</div>'
      +'<div style="position:absolute;top:10px;left:16px;display:flex;gap:14px;align-items:flex-start;z-index:3">'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Project</div>'
      +'<div id="sc-project-hit" class="sc-hdr-frame" style="display:flex;align-items:center;justify-content:center">'
      +'<div id="sc-project-label" class="sc-hdr-frame-label">Wish Tank</div>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Parent</div>'
      +'<div id="sc-parent-hit" class="sc-hdr-frame" style="display:flex;align-items:center;justify-content:center">'
      +'<div id="sc-parent-label" class="sc-hdr-frame-label">Wish Tank</div>'
      +'</div>'
      +'<div id="sc-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">1010</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">View</div>'
      +'<select id="sc-viewfilter-select" class="sc-hdr-select" title="Filter by person assigned"><option value="">Team</option></select>'
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

    var topicCornerFlip=document.getElementById('sc-topic-corner-flip');
    if(topicCornerFlip) topicCornerFlip.addEventListener('click', function(e){
      e.stopPropagation();
      if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
        openSbDetail(_sboardAllRowsById[T2TShared.currentTopicId]);
      } else {
        openRootPromptEditor();
      }
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

    // PROJECT opens the switcher — lets you move to a different top-level
    // project entirely (Wish Tank -> Field Guide), not just back to the
    // current one's own root.
    T().wire('sc-project-hit', openProjectSwitcher);

    // VIEW-by-person filter select -- change re-renders from cache (cheap,
    // no re-fetch) with the new filter applied. Aug 9 2026, Larry.
    (function(){
      var sel=document.getElementById('sc-viewfilter-select');
      if(sel) sel.addEventListener('change', function(){
        _sboardPersonFilterId = sel.value || null;
        renderSeaBoard(true);
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
    function _sboardCanGoUpFromTopic(){
      var row=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
      return !!(row && row.cluster_id);
    }
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
  function wireSboardUndoKeyboard(){
    document.addEventListener('keydown', function(e){
      var screen=document.getElementById('s-sea-of-ideas-cluster');
      if(!screen || !screen.classList.contains('active')) return;
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||(e.target&&e.target.isContentEditable)) return;
      var mod=e.metaKey||e.ctrlKey;
      if(!mod) return;
      var k=e.key.toLowerCase();
      if(k==='z'){ e.preventDefault(); if(e.shiftKey) _sboardRedo(); else _sboardUndo(); }
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
  // Aug 3 2026 -- combined Subber+idea display order per parent, used only
  // by the ORDER # badge (and the DETAILS card's order pill) so the whole
  // visual column numbers 1,2,3... straight down with no repeats. See the
  // long comment in renderGroup for why this has to be separate from
  // _sboardIdeaOrderByParent/_sboardSubberOrderByParent.
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

  // Person Assigned front-of-card badge (Aug 9 2026, Larry). Tile
  // rendering (_sboardMakeTile/_sboardMakeHeaderStackTile, and 9711's own
  // _isxMakeTile/_isxMakeHeaderStackTile via the T2TStoryboard bridge
  // below) is synchronous, but the name behind an assigned_user_id lives
  // in the members table -- a separate round trip. Rather than block
  // every render on that, _sboardEnsureAssignedInitials fetches whatever's
  // missing in the background and the caller re-renders (fromCache=true,
  // so it's cheap) once new names actually land. Cache is keyed by
  // user_id and never invalidated -- a member's initials essentially
  // never change mid-session, same assumption _bbMembersCache already
  // makes on the Briefing Board side.
  var _sboardAssignedCache = {};
  var _sboardAssignedFetchInFlight = {};
  async function _sboardEnsureAssignedInitials(rows){
    var missing=[], seen={};
    (rows||[]).forEach(function(r){
      var uid=r&&r.assigned_user_id;
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
  function _sboardAssignedBadgeHTML(item){
    var uid=item&&item.assigned_user_id;
    if(!uid) return '';
    var m=_sboardAssignedCache[uid];
    if(!m) return ''; // not fetched yet this pass -- next re-render (see _sboardEnsureAssignedInitials) fills it in
    return '<div class="sb-person-badge" title="'+_sboardEsc(m.name||'')+'">'+_sboardEsc(m.initials||'')+'</div>';
  }
  function _sboardNotesBadgeHTML(item){
    if(!item || !item.notes || !item.notes.trim()) return '';
    return '<div class="sb-notes-badge" title="Has notes">✏️</div>';
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

  // Same climb as _sboardProjectRowFor, but takes the rows-by-id map as an
  // argument instead of always reading the global _sboardAllRowsById --
  // needed for Person Assigned (Aug 9 2026) since openSbDetail can be
  // reached from 9711's Idea Session screen, where _sboardAllRowsById is
  // stale/unset and the live map lives on _isxDetailCtx.rowsById instead
  // (same staleness bug already documented above openSbDetail).
  function _sbProjectRowForAny(row, rowsById){
    var cur=row, guard=0;
    while(cur && cur.cluster_id && guard<25){
      var parent=(rowsById||{})[cur.cluster_id];
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur;
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
    return items.filter(function(r){ return String(r.assigned_user_id||'')===String(_sboardPersonFilterId); });
  }

  function _sboardRenderPersonFilterPicker(projectRow){
    var sel=document.getElementById('sc-viewfilter-select'); if(!sel || !projectRow) return;
    var rows=_tmAllRosterRows(projectRow);
    var cur=_sboardPersonFilterId||'';
    var opts=['<option value="">Team</option>'];
    var stillPresent=false;
    rows.forEach(function(m){
      if(String(m.user_id)===String(cur)) stillPresent=true;
      opts.push('<option value="'+_esc9710(m.user_id)+'"'+(String(m.user_id)===String(cur)?' selected':'')+'>'+_esc9710(m.name||m.email||'')+'</option>');
    });
    sel.innerHTML=opts.join('');
    if(cur && !stillPresent){ _sboardPersonFilterId=null; sel.value=''; }
  }

  // Person Assigned (Aug 9 2026, Larry): every card gets a dropdown of the
  // card's own PROJECT's real Cast roster, same "real roster, not free
  // text" convention as the Briefing Board's VIEW dropdown fix (Session
  // 198) -- reuses the Team Roster's own _tmLoadRoster/_tmAllRosterRows
  // rather than a second parallel roster fetch.
  function _sbRenderPersonSelect(item, projectRow){
    var sel=document.getElementById('sb-person-select'); if(!sel) return;
    var rows=_tmAllRosterRows(projectRow);
    var cur=item.assigned_user_id||'';
    var opts=['<option value="">Unassigned</option>'];
    rows.forEach(function(m){
      opts.push('<option value="'+_esc9710(m.user_id)+'"'+(String(m.user_id)===String(cur)?' selected':'')+'>'+_esc9710(m.name||m.email||'')+'</option>');
    });
    sel.innerHTML=opts.join('');
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

  function _sboardFitFontSize(text, base, min){
    var len=(text||'').length;
    if(len<=14) return base;
    var reduced=base-Math.floor((len-14)/5);
    return Math.max(min, reduced);
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
    tile.className='sc-tile'+(item.content_type==='text'?' text':'');
    tile.setAttribute('data-idea-id', String(item.id));
    tile.draggable=!item.locked;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;border-radius:0;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s'+(item.color?';background:'+item.color:'');
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    if((item.content_type==='image'||item.content_type==='link') && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
      if(item.content_type==='link'){
        var badge=document.createElement('div');
        badge.style.cssText='position:absolute;top:2px;left:20px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
        badge.textContent='\ud83d\udd17';
        tile.appendChild(badge);
      }
    } else if(item.content_type==='link'){
      var lp=document.createElement('p');
      lp.textContent='\ud83d\udd17 '+T2TMedia.parseText(item.text_content).title;
      lp.style.fontSize='calc('+((height>=60?17:14)*2/3)+'px * var(--fg-text-scale,1))';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      p.textContent=item.text_content||'(untitled)';
      p.style.fontSize='calc('+((height>=60?17:14)*2/3)+'px * var(--fg-text-scale,1))';
      tile.appendChild(p);
    }
    tile.insertAdjacentHTML('beforeend', _sboardLinkBadgeHTML(item));
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent = item.heart_count>=2 ? '💕' : '❤️';
      tile.appendChild(hb);
    }
    if(item.locked){
      var lb=document.createElement('div');
      // Nudged from right:2px to right:18px, Aug 9 2026 -- Person
      // Assigned now owns the top-right corner itself (Larry: "consistent
      // assignment spot on all cards"), same pairing convention the
      // heart/key-dots badges already use in the opposite corner.
      lb.style.cssText='position:absolute;top:2px;right:18px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
      lb.textContent='\ud83d\udd12';
      tile.appendChild(lb);
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
    // ORDER # badge, Aug 3 2026 -- Larry: "What if every card has an
    // ORDER #" -- plain idea cards get one too, numbered in the same
    // single top-to-bottom sequence as this parent's Subbers (see
    // _sboardCardOrderByParent, set in renderGroup) so a Subber and a
    // loose card sitting in the same visual column never both show "1".
    tile.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardCardOrderByParent[groupParentId]||[], item.id));
    // Signal Flags badge, Aug 3 2026 -- Larry: "Custom key goes on the
    // outside of the card like the heart." Sits just left of the heart
    // badge, same bottom-right corner, so the two "how I feel about this
    // card" markers read together.
    tile.insertAdjacentHTML('beforeend', _sboardKeyDotsHTML(item));
    // Person Assigned badge, Aug 9 2026 -- Larry: "look like the BB card
    // with the initials on the front." Bottom-left, the one corner
    // nothing else claims.
    tile.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(item));
    // Notes badge, Aug 11 2026 -- pencil shows on the front whenever
    // this card has Notes saved on its back, bottom-left corner.
    tile.insertAdjacentHTML('beforeend', _sboardNotesBadgeHTML(item));
    // Reorder-vs-stack zoning, added July 12, 2026. The middle band of the
    // tile nests (stacks the dragged card under this one, promoting this
    // one to a header if it wasn't already — same "first card placed stays
    // the header" rule CLUSTER already uses). The top/bottom edges keep the
    // plain reorder/move behavior that was already here. Splitting the same
    // drop target into zones, rather than adding new DOM between tiles,
    // resolves the reorder-vs-nest ambiguity flagged July 7 without
    // restructuring the column layout.
    tile.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      if(frac<0.3){ tile.style.outline='none'; tile.style.boxShadow='inset 0 3px 0 0 #5b9bd5'; }
      else if(frac>0.7){ tile.style.outline='none'; tile.style.boxShadow='inset 0 -3px 0 0 #5b9bd5'; }
      else { tile.style.boxShadow='none'; tile.style.outline='2px solid #5b9bd5'; }
    });
    tile.addEventListener('dragleave', function(){ tile.style.outline='none'; tile.style.boxShadow='none'; });
    tile.addEventListener('drop', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      tile.style.outline='none'; tile.style.boxShadow='none';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw==='sb-goup' || raw.indexOf('header:')===0) return;
      if(frac>=0.3 && frac<=0.7){
        _sboardStackIntoHeader(raw, item);
      } else {
        _sboardReorderOrMoveIdea(raw, item.id, groupParentId!==undefined?groupParentId:(item.cluster_id||null));
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
    wrap.className='sc-stack-tile';
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
    var fitSize=_sboardFitFontSize(headerRow.text_content, Math.round((height>=60?17:14)*_stMult), Math.round(13*_stMult));
    p.style.cssText='margin:0;font-weight:400;line-height:1.15;color:#1a3a5c;white-space:normal;word-break:break-word;font-size:'+fitSize+'px';
    front.appendChild(p);
    if(headerRow.locked){
      var hlb=document.createElement('div');
      // Nudged from right:2px to right:18px, Aug 9 2026 -- same reasoning
      // as the plain-card lock badge above: Person Assigned now owns the
      // top-right corner consistently on every card.
      hlb.style.cssText='position:absolute;top:2px;right:18px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
      hlb.textContent='\ud83d\udd12';
      front.appendChild(hlb);
    }
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    var stackCornerFlip=document.createElement('div');
    stackCornerFlip.className='sc-corner-flip';
    stackCornerFlip.title='Flip card';
    stackCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
    stackCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    stackCornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
    front.appendChild(stackCornerFlip);
    // ORDER # badge, Aug 3 2026 -- Larry: "Subbers are numbered vertically
    // top to bottom." Reads from _sboardCardOrderByParent (Subbers +
    // loose cards under this Subber's own real parent, in one shared
    // sequence -- see renderGroup) -- empty/no badge if that map hasn't
    // been populated for this parent yet (e.g. the small peek-grid view,
    // which doesn't render through the main board and has no order to
    // report here).
    front.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardCardOrderByParent[headerRow.cluster_id]||[], headerRow.id));
    front.insertAdjacentHTML('beforeend', _sboardKeyDotsHTML(headerRow));
    front.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
    front.insertAdjacentHTML('beforeend', _sboardNotesBadgeHTML(headerRow));
    // Double-click a HEADER or sub-header card to drill into it — that
    // card becomes the new TOPIC. Locked July 16, 2026.
    // Drilling in is now done by dragging this card onto the TOPIC box
    // (locked July 27, 2026, replacing double-click so double-click can
    // mean color everywhere with zero header exceptions). Double-click here
    // is the same color-options shortcut every other card has.
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
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
    // Reorder/move zoning, Aug 3 2026 -- top/bottom half of this Subber
    // tile reorders it among its siblings under the same Header (or moves
    // it in from a different Header entirely, inserting at this
    // position) -- same "drag one card onto another" language plain idea
    // cards already use, just applied to Subbers, which previously had
    // no drop behavior at all for another Subber dragged onto them (the
    // drop was silently ignored). A plain idea dropped here still just
    // files under this Subber, unchanged.
    wrap.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=wrap.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      front.style.outline='2px solid #5b9bd5';
      front.style.boxShadow = (frac<0.5) ? 'inset 0 3px 0 0 #5b9bd5' : 'inset 0 -3px 0 0 #5b9bd5';
      wrap._dropSide = (frac<0.5) ? 'before' : 'after';
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
        _sboardReorderOrMoveSubber(draggedHeaderId, headerRow.id, headerRow.cluster_id||null, side==='after');
      } else {
        _sboardMoveCard(raw, headerRow.id);
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
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">New header</div>'
      +'<input id="sb-addheader-input" type="text" placeholder="Header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div id="sb-addheader-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-addheader-go" style="flex:1">Create</button><button class="sc-ov-btn" id="sb-addheader-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('sb-addheader-input');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    T().wire('sb-addheader-cancel', closeSbDetail);
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
    var goBtn=document.getElementById('sb-addheader-go');
    async function _sbAddHeaderGo(){
      var errEl=document.getElementById('sb-addheader-err');
      var name=((input&&input.value)||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name can\'t be empty.'; return; }
      if(goBtn){ goBtn.disabled=true; goBtn.textContent='Saving...'; }
      var _sb=T().sb;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:T2TShared.currentTopicId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw ins.error;
        _sboardAddRow(ins.data);
        closeSbDetail();
        await renderSeaBoard(true);
        _sboardVerifyAdded(ins.data&&ins.data.id, 'Your new header "'+name+'"');
      }catch(err){
        if(errEl) errEl.textContent=err.message;
        if(goBtn){ goBtn.disabled=false; goBtn.textContent='Create'; }
      }
    }
    T().wire('sb-addheader-go', _sbAddHeaderGo);
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); _sbAddHeaderGo(); }
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
            currentProjectRowForScope={id:_chainForProject[0].id, text_content:_chainForProject[0].text};
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
        var _ensureResults=await Promise.all([
          T2TShared.currentTopicId ? _sboardEnsureNewAdditionsHeader(
            T2TShared.currentTopicId,
            null
          ) : Promise.resolve(null),
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
        var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb')
          .in('content_type',['image','text','link','header'])
          .order('created_at',{ascending:true}).limit(2000);
        if(res.error) throw new Error(res.error.message);
        var _freshRows=res.data||[];
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
      // Person Assigned badge names, Aug 9 2026 -- fire-and-forget; only
      // triggers a (cheap, cache-only) re-render if it actually had new
      // names to go fetch, so this never loops or blocks the render
      // that's already in progress.
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
      var contentHeaders=headerRows.filter(function(r){
        return reservedIds.indexOf(String(r.id))===-1 && reservedNames.indexOf(r.text_content)===-1;
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
      var SUBBER_W=Math.round(104*_tsMult);
      var SUBBER_H=Math.round(64*_tsMult);
      var HEADER_W=Math.round(152*_tsMult);
      var HEADER_H=SUBBER_H;

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
        var directItems=(childrenOfHeader[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
        // Backfill, Aug 3 2026 -- same reasoning as the top-level row:
        // makes each Subber's/idea's ORDER # a real, permanent number
        // instead of a fallback guess, the moment either list still has
        // one relying on it. Subbers/ideas render vertically top to
        // bottom, always in this real order -- there's no alphabetical
        // view for this level (yet), so no separate display copy needed.
        _sboardBackfillSortOrder(subs);
        _sboardBackfillSortOrder(directItems);
        _sboardIdeaOrderByParent[headerRow.id]=directItems.map(function(r){ return r.id; });
        _sboardSubberOrderByParent[headerRow.id]=subs.map(function(r){ return r.id; });
        // ORDER # display numbering, Aug 3 2026 -- Larry noticed "Long
        // Ideas has 2 number 1's": Subbers and plain idea/text cards
        // render in ONE shared vertical column here (Subbers on top,
        // then loose cards below), but their ORDER # badges came from
        // two separate sequences that both start at 1 -- so the first
        // Subber and the first loose card could both show badge "1"
        // even though they're two different rows in the same visual
        // stack. Larry's Planning Board use case (cards as steps in a
        // plan) needs one continuous count straight down the column.
        // _sboardIdeaOrderByParent/_sboardSubberOrderByParent above stay
        // exactly as they were -- they're what the actual drag-reorder
        // math (_sboardReorderOrMoveIdea/_sboardReorderOrMoveSubber)
        // uses to rewrite sort_order, and mixing Subber ids into an
        // idea-only reorder (or vice versa) would corrupt that. This
        // separate map is ONLY for what number a badge shows.
        _sboardCardOrderByParent[headerRow.id]=subs.concat(directItems).map(function(r){ return r.id; });
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('button');
        hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'');
        hd.setAttribute('data-header-id', String(headerRow.id));
        var hdFitSize=_sboardFitFontSize(name, Math.round(20*_tsMult), Math.round(13*_tsMult));
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+hdFitSize+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(headerRow.color?';background:'+headerRow.color:'');
        hd.textContent=name;
        // Purpose used to have its own separate corner-flip editor; as of
        // July 17, 2026 it's treated exactly like any other header — same
        // dblclick-to-drill-in, same corner-flip into openSbDetail().
        // Drilling in moved to drag-onto-TOPIC (July 27, 2026); double-click
        // is the color-options shortcut, same as every other card.
        hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
        var hdCornerFlip=document.createElement('div');
        hdCornerFlip.className='sc-corner-flip';
        hdCornerFlip.title='Flip card';
        hdCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
        hdCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
        hdCornerFlip.addEventListener('dragstart', function(e){ e.preventDefault(); e.stopPropagation(); });
        hd.appendChild(hdCornerFlip);
        // ORDER # badge, Aug 3 2026 -- Larry: "Headers are numbered
        // horizontally left to right and includes ALL headers." Reads
        // straight from _sboardTopLevelOrder, the REAL (backfilled)
        // order computed just above -- Purpose/NEW/MISC included, and
        // unaffected by the alphabetical display toggle.
        hd.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardTopLevelOrder, headerRow.id));
    // Signal Flags, Aug 3 2026 (widened scope) -- Larry: "every card,
    // maybe like a briefing card on the back of the card instead of in
    // the gear?" Headers (top-level and Subbers alike) now get the same
    // Signal Flags row on their own DETAILS/back card and the same on-card dots
    // as plain idea cards -- originally scoped out to match hearts, but
    // Larry wants it everywhere.
    hd.insertAdjacentHTML('beforeend', _sboardKeyDotsHTML(headerRow));
    // Person Assigned badge, Aug 9 2026 -- top-level column headers (this
    // "hd" pill) are their own third rendering path, separate from both
    // _sboardMakeTile (plain cards) and _sboardMakeHeaderStackTile
    // (Subbers) -- missed the first time through, which is why "Website"
    // and "Marketing" (both top-level headers) weren't showing a badge
    // even though they were genuinely assigned. hd already has
    // position:relative set above, same as front/tile do for the other
    // two paths.
    hd.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
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
          subs.forEach(function(sub){ scroll.appendChild(_sboardMakeHeaderStackTile(sub, SUBBER_W, SUBBER_H, straight)); });
          _sboardFilterByPerson(directItems).forEach(function(item){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, straight, headerRow.id, SUBBER_H)); });
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
        // ideas here aren't necessarily freshly typed. Larry wants one
        // consistent label across every storyboard instead.
        var localLabel='NEW';
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+_sboardFitFontSize(localLabel,Math.round(20*_tsMult),Math.round(13*_tsMult))+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(newRow&&newRow.color?';background:'+newRow.color:'');
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

  function _sboardConfirmTrashHeader(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Trash "'+safeName+'"?</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Anything still nested under it moves to Trash too — you can pull it back out later from Trash.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-trash-go" style="flex:1;background:#b8562f;border-color:#b8562f">Trash it</button><button class="sc-ov-btn" id="sb-trash-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-trash-cancel', closeSbDetail);
    T().wire('sb-trash-go', async function(){
      var _sb=T().sb;
      var before=_sboardSnapshotRow(headerRow.id);
      try{
        var trashId=await T2TData.ensureTrashHeader();
        var upd=await _sb.from('ideas').update({cluster_id:trashId}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        _sboardPatchRow(headerRow.id, {cluster_id:trashId});
        if(before){
          _sboardPushAction({label:'Delete', undo:function(){ return _sboardApplyRowSnapshot(headerRow.id, before); }, redo:function(){ return _sboardApplyRowSnapshot(headerRow.id, {cluster_id:trashId, sort_order:before.sort_order}); }});
        }
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
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

  function _sboardDrillInto(headerRow){
    T2TShared.currentTopicId=headerRow.id;
    T2TShared.filter=headerRow.id;
    _sboardPersistLastTopic(headerRow.id);
    _sboardSpinWhile(renderSeaBoard());
  }

  function _sboardGoUpOneLevel(){
    var curRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    var parentId=curRow?(curRow.cluster_id||null):null;
    T2TShared.currentTopicId=parentId;
    T2TShared.filter=parentId;
    _sboardPersistLastTopic(parentId);
    _sboardSpinWhile(renderSeaBoard());
  }

  function _sboardUpdateHeaderChrome(){
    var topicBox=document.getElementById('sc-topic-box');
    var topicText=document.getElementById('sc-topic-text');
    var topicBadge=document.getElementById('sc-topic-badge');
    var areaEl=document.getElementById('sc-header-area');
    var parentHit=document.getElementById('sc-parent-hit');
    var parentLabel=document.getElementById('sc-parent-label');
    var projectLabel=document.getElementById('sc-project-label');
    // Root Topic never changes — "What do you want?" stays permanent regardless of depth.
    if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
      var topicRow=_sboardAllRowsById[T2TShared.currentTopicId];
      if(topicText){ topicText.textContent=topicRow.text_content||'(untitled)'; }
      if(topicBox){ topicBox.style.background=topicRow.color||''; }
      if(topicBadge){
        topicBadge.innerHTML=_sboardAssignedBadgeHTML(topicRow);
        if(topicRow.assigned_user_id && !_sboardAssignedCache[topicRow.assigned_user_id]){
          _sboardEnsureAssignedInitials([topicRow]).then(function(fetched){
            if(fetched) _sboardUpdateHeaderChrome();
          });
        }
      }
      // PROJECT — fixed root anchor, walks the cluster_id chain all the way
      // up regardless of how deep Topic currently is. Locked July 12, 2026:
      // at the project apex (nothing above Topic yet), Project/Parent/Topic
      // all read the same name — e.g. viewing Wish Tank itself shows
      // "PROJECT Wish Tank · PARENT Wish Tank · TOPIC Wish Tank" — rather
      // than Parent falling back to generic placeholder text.
      var projectRow=_sboardProjectRowFor(topicRow);
      var projectName=(projectRow?projectRow.text_content:topicRow.text_content)||'(untitled)';
      if(projectLabel) projectLabel.textContent=projectName;
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
      // Larry, Aug 3 2026 (bug report): "It claims to be in the Wish
      // Tank project but that is not true!!" This branch only runs
      // when there's genuinely no real Topic selected (currentTopicId
      // null/unresolved) -- PROJECT was hardcoded to the literal text
      // "Wish Tank" here, which reads as a real (wrong) answer instead
      // of the same "nothing selected" state PARENT already shows
      // correctly with an em dash. Match that instead of naming any
      // specific project when none is actually chosen.
      if(projectLabel) projectLabel.textContent='\u2014';
      if(parentLabel) parentLabel.textContent='\u2014';
      if(parentHit){ parentHit.classList.add('inert'); }
    }
    // One traveler-chosen color paints the whole screen (header strip +
    // board area) — no more separate hardcoded navy/purple fighting it.
    // Locked July 16, 2026.
    _sboardApplyBoardBg();
  }

  async function _sboardMoveCard(itemId, headerId){
    if(_sboardAllRowsById[itemId] && _sboardAllRowsById[itemId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(itemId);
    try{
      var siblingCount=(_sboardIdeaOrderByParent[headerId]||[]).length;
      var upd=await _sb.from('ideas').update({cluster_id:headerId, sort_order:siblingCount}).eq('id',itemId);
      if(upd.error) throw upd.error;
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

  // Drop an idea onto another idea tile: reorders among siblings if already
  // in the same header, or moves + inserts at that position if dragged in
  // from somewhere else — one gesture covers both cases.
  async function _sboardReorderOrMoveIdea(draggedId, targetId, parentId){
    if(String(draggedId)===String(targetId)) return;
    if(_sboardAllRowsById[draggedId] && _sboardAllRowsById[draggedId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(draggedId);
    var ids=(_sboardIdeaOrderByParent[parentId]||[]).slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    if(fromIdx!==-1) ids.splice(fromIdx,1);
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    ids.splice(toIdx===-1?ids.length:toIdx, 0, draggedId);
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      var updCluster=await _sb.from('ideas').update({cluster_id:parentId}).eq('id',draggedId);
      if(updCluster.error) throw updCluster.error;
      _sboardPatchRow(draggedId, {cluster_id:parentId});
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
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

  // Drop a Subber onto another Subber tile, Aug 3 2026 -- same gesture as
  // _sboardReorderOrMoveIdea just above, but for Subbers (nested Header
  // cards) instead of plain ideas: reorders among siblings under the same
  // Header if the dragged Subber is already there, or moves it in (and
  // inserts it at that position) if it's coming from a different Header
  // entirely. One gesture covers both, matching how plain-idea cards
  // already behave -- this was the missing piece that made moving a
  // Subber require opening its DETAILS card instead of just dragging it.
  async function _sboardReorderOrMoveSubber(draggedId, targetId, parentId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    if(_sboardAllRowsById[draggedId] && _sboardAllRowsById[draggedId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(draggedId);
    var ids=(_sboardSubberOrderByParent[parentId]||[]).slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    if(fromIdx!==-1) ids.splice(fromIdx,1);
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    var insertAt=toIdx===-1?ids.length:(insertAfter?toIdx+1:toIdx);
    ids.splice(insertAt, 0, draggedId);
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      var updCluster=await _sb.from('ideas').update({cluster_id:parentId}).eq('id',draggedId);
      if(updCluster.error) throw updCluster.error;
      _sboardPatchRow(draggedId, {cluster_id:parentId});
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
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
        var updCluster=await _sb.from('ideas').update({cluster_id:T2TShared.currentTopicId}).eq('id',draggedId);
        if(updCluster.error) throw updCluster.error;
        _sboardPatchRow(draggedId, {cluster_id:T2TShared.currentTopicId});
      }
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
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
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb')
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
  function _tmRenderMemberSuggestions(projectRow, query){
    var box=document.getElementById('tm-add-suggest'); if(!box) return;
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
      var clickable = (!m.isOwner && _tmRosterIsOwner);
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
    if(addTile) addTile.style.display = _tmRosterIsOwner ? 'flex' : 'none';
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
      var myUser=(await _sb.auth.getUser()).data.user;
      var ins=await _sb.from('storyboard_members').insert({project_id: projectRow.id, user_id: match.user_id, added_by: myUser?myUser.id:null, access_level: 'edit'});
      if(ins.error) return {ok:false,msg:ins.error.message||'Could not add them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not add them.'}; }
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
      if(!_tmRosterIsOwner) return;
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

  async function _sboardEnsurePurposeHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var q=_sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _sboardPurposeId=ins.data.id;
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
    var q=_sb.from('ideas').select('id,text_content').eq('user_id',user.id).eq('content_type','header').in('text_content',['NEW','New Additions',name]);
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){
      var row=existing.data[0];
      _sboardNewAdditionsId=row.id;
      if(row.text_content!==name){ try{ await _sb.from('ideas').update({text_content:name}).eq('id',row.id); }catch(e){} }
      return _sboardNewAdditionsId;
    }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Ideas header setup failed: '+ins.error.message);
    _sboardNewAdditionsId=ins.data.id;
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
    var reservedNames=['Trash','MISC','NEW'];
    var isReservedItem=isHeaderType && reservedNames.indexOf(item.text_content)!==-1;

    if(isReservedItem){
      var rSwatches=_sboardColorPalette.map(function(c){
        var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
        return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
      }).join('');
      ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center">'
        + '<div class="sb-card-title">Shape</div>'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:8px">'+item.text_content+'</div>'
        + '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;font-style:italic;margin-bottom:10px">This is a system header — it can\'t be renamed, moved, or trashed.</div>'
        + '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+rSwatches+'</div>'
        + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:block;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:8px;flex:1"></textarea>'
        + '<button class="sb-close-btn" id="sb-close" aria-label="Close">✕</button>'
        + '</div>';
      ov.classList.add('active');
      ov.querySelectorAll('.sb-swatch').forEach(function(sw){
        sw.onclick=async function(){
          var c=sw.getAttribute('data-c');
          try{ await _sb.from('ideas').update({color:c}).eq('id',item.id); item.color=c; }catch(e){}
          closeSbDetail(); renderSeaBoard(true);
        };
      });
      var rNotes=document.getElementById('sb-notes-box');
      if(rNotes){ rNotes.value=item.notes||''; rNotes.addEventListener('blur', async function(e){
        try{ await _sb.from('ideas').update({notes:e.target.value}).eq('id',item.id); item.notes=e.target.value; }catch(err){}
      }); }
      T().wire('sb-close', closeSbDetail);
      return;
    }

    // Card-details sweep, July 19, 2026: _sboardTrashId/_sboardMiscId/
    // _sboardPurposeId are only ever populated by 9710's own renderSeaBoard
    // fetch -- stale or unset entirely if 9710 never rendered this session.
    // Same bug class as Current Location (fixed July 18); prefer 9711's own
    // context (setIsxContext) when it's the active screen.
    var _effTrashId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.trashId : _sboardTrashId;
    var _effMiscId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.miscId : _sboardMiscId;
    var _effPurposeId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.purposeId : _sboardPurposeId;
    var isTrashed=String(item.cluster_id)===String(_effTrashId) && _effTrashId;
    var isMisc=String(item.cluster_id)===String(_effMiscId) && _effMiscId;
    var heartCount=item.heart_count||0;
    // CLUSTER view-as option — Logged July 7, 2026. Only appears when this card
    // is a bucket (has something underneath it, at any depth). Never shown for
    // a lone card — there's nothing to sort into groups yet.
    var isBucket=isHeaderType && (_sboardChildCountById[item.id]||0)>0;
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
    // Header). _sbOrderList/_sbOrderIdx below are the REAL per-type
    // sibling list the drag-reorder math uses (_sboardIdeaOrderByParent/
    // _sboardSubberOrderByParent/_sboardTopLevelOrder) -- deliberately
    // NOT the same as _sboardCardOrderByParent just below, which mixes
    // Subbers+cards into one display-only combined count and can't be
    // written back to safely (see its own comment, above in renderGroup).
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
        : isHeaderType ? (_sboardSubberOrderByParent[item.cluster_id]||null)
        : (_sboardIdeaOrderByParent[item.cluster_id||'']||null);
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

    // Person Assigned (Aug 9 2026, Larry): full-width row of its own,
    // not a fourth eyebrow column -- the overlay card is only 260px wide
    // (see .sc-overlay-card), so a 4-way split next to Parent/View/Order
    // would leave no room for a real name. Options are filled in async
    // right after this HTML lands (see _sbRenderPersonSelect below) --
    // the roster fetch can't finish before ov.innerHTML is set.
    var personRowHTML='<div class="sb-eyebrow-row">'
      + '<div class="sb-eyebrow-col" style="flex:1;align-items:flex-start">'
      + '<div class="sb-hdr-eyebrow2" style="text-align:left">Person Assigned</div>'
      + '<select id="sb-person-select" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box"><option value="">Loading…</option></select>'
      + '</div>'
      + '</div>';

    var headerListHTML='<div class="sb-inline-field" id="sb-move-panel" style="display:none">'
      + '<div class="sb-hdr-eyebrow2">Move to a different Header</div>'
      + '<div class="sb-hdr-vitem'+(isMisc?' current':'')+'" id="sb-misc-pinned" style="border:0.5px solid #D3D1C7;border-radius:8px;margin-bottom:6px;font-weight:600">'+(isMisc?'📦 Misc ✓ — tap to move out':'📦 Misc (project archive)')+'</div>'
      + '<div class="sb-hdr-vlist" id="sb-hdr-vlist">'
      + '<div class="sb-hdr-vitem'+(isInLocalNewAdditions?' current':'')+'" data-hid="'+localNewAdditionsTarget+'">NEW</div>'
      + (_effPurposeId?('<div class="sb-hdr-vitem'+(String(item.cluster_id||'')===String(_effPurposeId)?' current':'')+'" data-hid="'+_effPurposeId+'">Purpose</div>'):'')
      + _sboardVisibleHeaders.filter(function(h){ return String(h.id)!==String(item.id) && h.text_content!=='NEW'; })
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
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      + '<span id="sb-details-eyebrow" style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:500;letter-spacing:0.08em;color:#2C2C2A;cursor:default">DETAILS</span>'
      + '<button id="sb-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#2C2C2A">✕</button>'
      + '</div>'
      + '<div id="sb-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#a3907a;height:10px;margin:-4px 0 4px;opacity:0;transition:opacity .3s">9716</div>'
      + apexTag
      + topRowHTML
      + personRowHTML
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
      + '<button class="sb-blue-btn" id="sb-gear" title="Appearance">⚙️</button>'
      + (isHeaderType ? '<button class="sb-blue-btn" id="sb-topic-btn" style="display:none">🎭</button>' : '')
      + '<button class="sb-blue-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>')+'</button>'
      + '</div>'
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

    // Person Assigned -- roster fetch can't finish before ov.innerHTML
    // above already rendered "Loading...", so fill the real options in
    // once _tmLoadRoster resolves, then save straight to the row on
    // change (same immediate-save pattern as the VIEW toggle just below,
    // not the field-by-field detail-save flow the Notes textarea uses).
    (function(){
      var effRowsById=(isOn9711 && _isxDetailCtx && _isxDetailCtx.rowsById) ? _isxDetailCtx.rowsById : _sboardAllRowsById;
      var assignProjectRow=_sbProjectRowForAny(item, effRowsById);
      var personSel=document.getElementById('sb-person-select');
      if(!assignProjectRow){
        if(personSel) personSel.innerHTML='<option value="">Unassigned</option>';
      } else {
        _tmLoadRoster(assignProjectRow).then(function(){ _sbRenderPersonSelect(item, assignProjectRow); });
      }
      if(personSel) personSel.addEventListener('change', async function(){
        var newVal=personSel.value||null;
        try{
          var upd=await _sb.from('ideas').update({assigned_user_id:newVal}).eq('id',item.id).select();
          if(upd.error) throw upd.error;
          item.assigned_user_id=newVal;
        }catch(err){ if(statusBox) statusBox.textContent=err.message; }
      });
    })();

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
          var updA=await _sb.from('ideas').update({sort_order:_sbOrderIdx}).eq('id',ids[_sbOrderIdx]);
          if(updA.error) throw updA.error;
          var updB=await _sb.from('ideas').update({sort_order:swapIdx}).eq('id',ids[swapIdx]);
          if(updB.error) throw updB.error;
          _sboardPatchRow(ids[_sbOrderIdx], {sort_order:_sbOrderIdx});
          _sboardPatchRow(ids[swapIdx], {sort_order:swapIdx});
          if(_sbOrderIsTopHeader) _sboardTopLevelOrder=ids;
          else if(isHeaderType) _sboardSubberOrderByParent[item.cluster_id]=ids;
          else _sboardIdeaOrderByParent[item.cluster_id||'']=ids;
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
        var upd=await _sb.from('ideas').update({locked:newLocked}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.locked=newLocked;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent='Lock needs the locked Supabase column: '+err.message; }
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
  // Reserved system headers (Trash/MISC/NEW) already show swatches with
  // no gear at all, so the extra step is a harmless no-op there.
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
      btn.addEventListener('click', function(){
        _sboardOpenKeyPicker(item, Number(btn.getAttribute('data-slot')));
      });
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

  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; ov.style.justifyContent=''; ov.style.paddingLeft=''; }
    _sboardActiveId=null;
    // If CLUSTER is open behind this SHAPING card, refresh it — whatever was
    // just edited (moved, renamed, trashed) may have changed what belongs here.
    var clOv=document.getElementById('sb-cluster-overlay');
    if(clOv && clOv.classList.contains('active') && _clusterOpenHeaderId && _sboardAllRowsById[_clusterOpenHeaderId]){
      renderClusterView(_sboardAllRowsById[_clusterOpenHeaderId]);
    }
  }

  /* ── CLUSTER view (9240 family) — Logged July 7, 2026 ──
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
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb')
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
    tile.insertAdjacentHTML('beforeend', _sboardLinkBadgeHTML(item));
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
    ensureAssignedInitials: _sboardEnsureAssignedInitials,
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
