/* ============================================================
   sea-of-ideas.js — T2T Field Guide · Idea Hub / ISB module
   Extraction pass — July 3, 2026. Behavior is UNCHANGED from the
   version that lived inside backpack.js. IDs, page numbers (9220
   grid / 9221 cluster), and every function name are preserved so
   this is a pure move, not a rebuild.

   Talks to backpack.js ONLY through window.T2T (the existing public
   API) — never reaches into backpack.js internals directly. Loads
   AFTER backpack.js in every phase file that needs the Idea Hub.

   Exposes window.T2TSea = { openTrash } for backpack.js to call
   without needing to know how Trash is implemented.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  /* ── SEA OF IDEAS — 9220 grid view (legacy, still live) ── */
  function injectSeaOfIdeas(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-sea-of-ideas')) return;
    if(!document.getElementById('sea-of-ideas-style')){
      var style=document.createElement('style');
      style.id='sea-of-ideas-style';
      style.textContent='#s-sea-of-ideas .phase-header{background:#fdf8f0;padding:12px 16px 10px;text-align:center;border-bottom:2px solid #5b9bd5;flex-shrink:0}#s-sea-of-ideas .ph-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a6040}#s-sea-of-ideas .bar-dream-pp{background:#1a3a5c!important;border-color:#14305a!important;border-top-color:#2a5080!important}#s-sea-of-ideas .bar-dream-pp .tb{background:#d6eaf8!important;border-color:#a9cce3!important;color:#1a3a5c}#s-sea-of-ideas .bar-dream-pp .tb:hover:not(.dim){background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas"><div class="phase-header" style="text-align:left;display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden"><span class="ph-eyebrow">🌈 DREAM PHASE</span><span class="ph-eyebrow">·</span><span class="ph-eyebrow">CREATE</span></div><div class="sw" style="padding:16px 32px;align-items:center;text-align:center"><div style="font-family:\'Playfair Display\',serif;font-size:26px;font-weight:700;color:#1a3a5c;margin-bottom:2px">ISB</div><div style="font-size:13px;font-style:italic;color:#888;margin-bottom:14px;line-height:1.7">Everything captured so far. No order. Just a blast of ideas.</div><div id="sea-thumb" style="width:100%;border:1.5px solid #b0a898;border-radius:10px;margin-bottom:10px;background:#f5f5f5;padding:6px"><div id="sea-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div><div id="sea-empty" style="text-align:center;padding:16px;display:none"><div style="font-size:36px;margin-bottom:6px">🌊</div><div style="font-size:12px;font-style:italic;color:#999">Your ISB</div></div></div><div id="b-sea-to-cluster" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:4px">🧩 Try clustering these</div><div class="sp"></div></div><div class="bar2 bar-dream-pp"><button class="tb" id="b-sea-back">⬅️</button><button class="tb" id="b-sea-mg">🔍</button><button class="tb" id="b-sea-fwd">➡️</button><button class="tb" id="b-sea-close" style="display:none">✕</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas', '9220');
    T().registerCtx('s-sea-of-ideas', 'ISB');
    T().registerGems('s-sea-of-ideas', [
      {text:'The ISB holds everything — no commitment, no wrong answers.', attr:'T2T Field Guide · CREATE'}
    ]);
    T().registerTrivia('s-sea-of-ideas', [
      { label: 'Purpose', id: 's-sea-trivia-purpose' },
      { label: 'Types of Seas of Ideas', id: 's-sea-trivia-types' },
      { label: 'Add an Idea', id: 's-idea-capture' }
    ]);
    T().wire('b-sea-back', function(){
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sea-mg', T().goMG);
    T().wire('b-sea-close', function(){ T().returnToMG(); });
    T().wire('b-sea-to-cluster', function(){ T().nav('s-sea-of-ideas-cluster'); });
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
          card.style.cssText = 'font-family:Playfair Display,serif;font-style:italic;font-size:12px;color:#333;line-height:1.4;text-align:center';
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
        +'.sc-tile{position:absolute;width:64px;height:64px;border-radius:10px;background:#fff;border:1px solid #cfe4f2;box-shadow:0 3px 8px rgba(26,58,92,0.15);overflow:hidden;cursor:grab;user-select:none}'
        +'.sc-tile.dragging{cursor:grabbing;box-shadow:0 8px 18px rgba(26,58,92,0.28);z-index:50}'
        +'.sc-tile img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}'
        +'.sc-tile.text{padding:5px;display:flex;align-items:center;justify-content:center}'
        +'.sc-tile.text p{margin:0;font-size:8.5px;line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none}'
        +'.sc-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(91,155,213,0.22),transparent 70%);pointer-events:none;z-index:5}'
        +'.sc-pill{position:absolute;z-index:15;transform:translate(-50%,-50%);background:#5b9bd5;color:#fff;border:none;padding:5px 10px;border-radius:14px;font-size:10px;font-weight:700;box-shadow:0 3px 8px rgba(26,58,92,0.2);cursor:pointer;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}'
        +'.sc-pill.named{background:#fff;color:#1a3a5c;border:1px solid #a9cce3;border-radius:4px}'
        +'.sb-icon-btn{flex:1;background:#d6eaf8;border:1px solid #a9cce3;border-radius:10px;box-shadow:0 3px 8px rgba(26,58,92,0.15);padding:10px 0;font-size:19px;line-height:1;cursor:pointer;text-align:center;color:#1a3a5c;transition:transform .1s}'
        +'.sb-icon-btn:active{transform:scale(0.93)}'
        +'.sb-icon-btn.misc{font-size:10px;font-weight:700;letter-spacing:.4px;padding:14px 0}'
        +'#sc-topic-box{text-align:center;background:#eaf3fb;border:1px solid #a9cce3;border-radius:6px;padding:6px 14px;font-size:18px;font-weight:700;color:#1a3a5c;cursor:pointer}'
        +'#s-sea-of-ideas-cluster .sw{align-items:stretch}'
        +'#sc-divider{border-bottom:1.5px solid #cfe4f2;margin:0 0 6px;width:100%}'
        +'#sc-status{font-size:10px;color:#7a6040;text-align:right;margin-bottom:2px;min-height:0}'
        +'#sc-status.err{color:#b8562f}'
        +'.sc-overlay-card{background:#fff;border-radius:14px;padding:16px;width:min(260px,84%);box-shadow:0 10px 24px rgba(0,0,0,0.3)}'
        +'.sc-overlay-card label{display:block;font-size:11px;font-weight:700;color:#1a3a5c;margin-bottom:6px}'
        +'.sc-overlay-card input{width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;color:#1a3a5c;margin-bottom:10px;box-sizing:border-box}'
        +'.sc-overlay-actions{display:flex;gap:8px;justify-content:flex-end}'
        +'.sc-ov-btn{border:1px solid #cfe4f2;background:#fff;padding:6px 12px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;color:#5b9bd5}'
        +'.sc-ov-btn.save{background:#5b9bd5;color:#fff;border-color:#5b9bd5}'
        +'.sb-overlay{position:fixed;inset:0;z-index:200;background:rgba(26,58,92,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
        +'.sb-overlay.active{display:flex}'
        +'#sc-board-wrap{text-align:left;overflow-x:auto;padding-bottom:4px;flex:1}'
        +'#sc-controls{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:4px 0 0}'
        +'#sc-controls .sc-ov-btn{padding:4px 10px;font-size:10px}'
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
        +'.sc-hdr-eyebrow{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px}'
        +'.sc-hdr-side{min-width:72px;min-height:46px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}'
        +'#sc-parent-hit{cursor:pointer}'
        +'#sc-parent-hit.inert{cursor:default}'
        +'#sc-parent-label{font-family:\'Playfair Display\',serif;font-size:12px;font-weight:700;color:#fff;line-height:1.2}'
        +'#sc-project-hit{cursor:pointer}'
        +'#sc-project-label{font-family:\'Playfair Display\',serif;font-size:12px;font-weight:700;color:#fff;line-height:1.2}'
        +'#sc-topic-box.dragover,#sc-parent-hit.dragover,#sc-project-hit.dragover{outline:2px solid #5b9bd5}'
        +'.sc-hdr-frame{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:0 12px;box-sizing:border-box;height:30px}'
        +'.sc-hdr-frame .sc-hdr-eyebrow{color:rgba(169,204,227,.6)}'
        +'.sc-hdr-frame-label{opacity:.72}'
        +'#b-sc-purpose{width:100%;box-sizing:border-box}'
        +'#sc-topic-box{display:inline-block;max-width:220px;box-sizing:border-box;white-space:normal;word-wrap:break-word}'
        +'.sc-pill.has-children{box-shadow:3px 3px 0 rgba(26,58,92,0.20),6px 6px 0 rgba(26,58,92,0.11)}'
        +'.sc-peek-card{background:#fff;border-radius:14px;padding:14px;width:min(360px,94%);max-height:82vh;overflow-y:auto;box-sizing:border-box}'
        +'.sc-peek-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid #cfe4f2}'
        +'.sc-peek-topbar button{background:#e8f5f2;border:1px solid #a8d8cc;border-radius:8px;padding:6px 10px;font-size:14px;cursor:pointer;flex:0 0 auto}'
        +'.sc-peek-title{font-family:\'Playfair Display\',serif;font-size:15px;font-weight:700;color:#1a3a5c;text-align:center;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.sc-peek-spacer{width:32px;flex:0 0 auto}'
        +'.sb-shape-card{background:#F5F1E8;border-radius:16px;padding:16px;width:min(320px,88%);max-height:calc(100vh - 40px);overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;flex-direction:column;box-sizing:border-box}'
        +'.sb-crumbs{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;min-height:20px}'
        +'.sb-crumb-parent{font-size:10px;color:#7a6040;font-weight:600;opacity:.8}'
        +'.sb-crumb-sep{font-size:10px;color:#cfc3ae}'
        +'.sb-crumb-topic{font-size:16px;color:#1a3a5c;font-weight:700;font-family:\'Playfair Display\',serif}'
        +'.sb-hdr-eyebrow2{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#5F5E5A;margin-bottom:3px;text-align:left}'
        +'.sb-hdr-vlist{display:flex;flex-direction:column;gap:3px;max-height:112px;overflow-y:auto;margin-bottom:10px;border:0.5px solid #D3D1C7;border-radius:8px;padding:6px;flex-shrink:0;background:#fff}'
        +'.sb-hdr-vitem{padding:6px 10px;border-radius:8px;font-size:12px;text-align:left;cursor:pointer;color:#2C2C2A;background:transparent}'
        +'.sb-hdr-vitem.current{background:#F5F1E8;font-weight:700}'
        +'.sb-hdr-vitem.newh{color:#0F6E56;font-weight:700;border-top:1px dashed #D3D1C7;margin-top:2px;padding-top:8px}'
        +'.sb-body-box{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:120px;max-height:50vh;border-radius:8px;background:#fff;border:0.5px solid #B4B2A9;padding:10px 12px;box-sizing:border-box;margin-bottom:8px;overflow:hidden;position:relative}'
        +'.sb-body-box img{max-width:100%;max-height:100%;border-radius:8px;object-fit:contain;display:block}'
        +'.sb-body-text{font-family:\'Playfair Display\',serif;color:#2C2C2A;font-weight:500;font-size:14px;cursor:pointer;word-break:break-word}'
        +'.sb-blue-row{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 10px;font-size:14px;cursor:pointer;flex:1 1 auto;min-width:36px}'
        +'.sb-blue-btn:active{transform:scale(0.95)}'
        +'.sb-blue-btn.misc-on{background:#EEECE4}'
        +'.sb-blue-row-sm{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-sm{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-sm:active{transform:scale(0.95)}'
        +'.sb-blue-row-md{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-md{box-sizing:border-box;background:#fff;color:#2C2C2A;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:600;cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-md:active{transform:scale(0.95)}'
        +'.sb-viewas-eyebrow{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#5F5E5A;text-align:center;margin-bottom:4px}'
        +'.sb-viewas-btn{box-sizing:border-box;background:#fff;color:#5F5E5A;border:0.5px solid #D3D1C7;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:700;letter-spacing:.5px;cursor:pointer;flex:1 1 auto}'
        +'.sb-viewas-btn:active{transform:scale(0.95)}'
        +'.sb-slider-project{font-size:10px;font-weight:700;letter-spacing:1px;text-align:center;color:#7c3aed;cursor:pointer;padding:4px 0;margin-bottom:2px}'
        +'.sb-slider-project:active{transform:scale(0.97)}'
        +'.sb-slider-track{display:flex;flex-direction:column;border:1px solid #B4B2A9;border-radius:10px;overflow:hidden}'
        +'.sb-slider-notch{padding:8px 0;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:1px;background:#fff;color:#2C2C2A;cursor:pointer;border-bottom:0.5px solid #e3e0d8}'
        +'.sb-slider-notch:last-child{border-bottom:none}'
        +'.sb-slider-notch:active:not(.sb-slide-disabled){transform:scale(0.98)}'
        +'.sb-slider-notch.sb-slide-current{background:#1a3a5c;color:#fff}'
        +'.sb-slider-notch.sb-slide-disabled{color:#c4c0b8;background:#f5f3ee;cursor:default}'
        +'.sb-card-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#5b9bd5;text-align:center;margin-bottom:6px}'
        +'.sb-close-btn{box-sizing:border-box;background:#fff;color:#2C2C2A;font-weight:700;border:0.5px solid #B4B2A9;border-radius:8px;padding:10px 14px;font-size:14px;cursor:pointer;width:100%;flex-shrink:0}'
        +'.sb-parent-value{font-family:\'Playfair Display\',serif;font-size:12px;font-weight:500;color:#444441;margin-bottom:8px;text-align:left}'
        +'.sb-topic-value{display:block;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:500;color:#2C2C2A;font-family:\'Playfair Display\',serif;margin-bottom:8px;text-align:left}'
        +'.sb-hdr-current{font-size:12px;color:#2C2C2A;font-weight:500;cursor:pointer;margin-bottom:6px;padding:5px 8px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;text-align:left}'
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
        +'.cl-title{font-family:\'Playfair Display\',serif;font-size:15px;font-weight:700;color:#1a3a5c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.cl-topbar-btns{display:flex;gap:6px;flex-shrink:0}'
        +'.cl-close{background:#e8f5f2;border:1px solid #a8d8cc;border-radius:8px;padding:5px 11px;font-size:13px;cursor:pointer;flex-shrink:0}'
        +'.cl-hint{font-size:10px;font-style:italic;color:#7a90a8;text-align:center;margin-bottom:6px;flex-shrink:0}'
        /* cl-body holds the shelf + starburst together so their arrangement can
           flip from stacked (shelf below, mobile/normal) to side-by-side (shelf
           column on the left, wide/desktop) without touching the topbar/hint
           above them. Tied to the same ⛶ toggle that already means "desktop." */
        +'.cl-body{flex:1;display:flex;flex-direction:column;min-height:0}'
        +'.cl-card.cl-wide .cl-body{flex-direction:row;gap:10px}'
        +'.cl-starburst{order:1;flex:1;position:relative;overflow-y:auto;overflow-x:hidden;padding:20px;border-radius:12px;background:radial-gradient(circle,rgba(91,155,213,0.10),transparent 70%);min-height:0}'
        +'.cl-empty{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-style:italic;color:#93a4b5;text-align:center;width:80%}'
        +'.cl-canvas{position:relative;width:100%;cursor:crosshair}'
        +'.cl-lasso{position:absolute;border:1.5px dashed #5b9bd5;background:rgba(91,155,213,0.15);pointer-events:none;z-index:900}'
        +'.sc-tile.cl-selected{box-shadow:0 0 0 3px #5b9bd5}'
        +'.cl-shelf-col{order:2;flex-shrink:0;display:flex;flex-direction:column;min-height:0}'
        +'.cl-card.cl-wide .cl-shelf-col{order:0;width:118px;border-right:1.5px solid #cfe4f2;padding-right:8px}'
        +'.cl-shelf-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#7a6040;text-align:center;margin:8px 0 4px;flex-shrink:0}'
        +'.cl-card.cl-wide .cl-shelf-label{text-align:left;margin:0 0 6px}'
        +'.cl-shelf{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding:4px 2px 2px;border-top:1.5px solid #cfe4f2;flex-shrink:0;align-items:flex-start}'
        +'.cl-card.cl-wide .cl-shelf{flex-direction:column;overflow-x:hidden;overflow-y:auto;border-top:none;flex:1;align-items:stretch}'
        /* Fixed height + 2-line clamp — a long header name used to stretch every
           pill (and the whole shelf row) taller, squeezing the starburst above
           it down to almost nothing. Height is capped no matter how long the
           name is; full text is still available via the title tooltip. Made
           smaller overall per Larry's request — these are wayfinding chips,
           not the main content, and were taking up more room than they earned. */
        +'.cl-bucket{flex:0 0 auto;width:72px;height:36px;padding:3px 6px;border-radius:8px;background:#fff;border:1.5px solid #a9cce3;font-size:9.5px;font-weight:700;color:#1a3a5c;text-align:center;cursor:pointer;box-sizing:border-box;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.1;word-break:break-word;align-items:center;justify-content:center}'
        +'.cl-card.cl-wide .cl-bucket{width:100%;height:34px;font-size:10px}'
        +'.cl-bucket.dragover{outline:2px solid #5b9bd5}'
        +'.cl-newbucket{flex:0 0 auto;min-width:36px;height:36px;padding:0 10px;border-radius:8px;background:#eaf3fb;border:1.5px dashed #a9cce3;font-size:14px;line-height:36px;color:#5b9bd5;cursor:pointer;text-align:center;box-sizing:border-box}'
        +'.cl-card.cl-wide .cl-newbucket{width:100%;box-sizing:border-box}'
        +'.cl-newbucket-input{flex:0 0 auto;width:90px;height:36px;padding:0 8px;border-radius:8px;border:1.5px solid #a9cce3;font-size:10px;font-family:inherit;box-sizing:border-box}'
        +'.cl-card.cl-wide .cl-newbucket-input{width:100%}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:10px 16px 8px;margin-bottom:4px;position:relative;min-height:40px">'
      +'<div style="text-align:center">'
      +'<div class="sc-hdr-eyebrow">Topic</div>'
      +'<div id="sc-topic-box"></div>'
      +'</div>'
      +'<div style="position:absolute;top:10px;left:16px;display:flex;gap:14px;align-items:flex-start">'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Project</div>'
      +'<div id="sc-project-hit" class="sc-hdr-frame" style="display:flex;align-items:center;justify-content:center">'
      +'<div id="sc-project-label" class="sc-hdr-frame-label">ISB</div>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:center">'
      +'<div class="sc-hdr-eyebrow">Parent</div>'
      +'<div id="sc-parent-hit" class="sc-hdr-frame" style="display:flex;align-items:center;justify-content:center">'
      +'<div id="sc-parent-label" class="sc-hdr-frame-label">ISB</div>'
      +'</div>'
      +'<div id="sc-pagenum" style="font-size:8px;letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">9710</div>'
      +'</div>'
      +'</div>'
      +'<div class="sc-hdr-side" style="position:absolute;top:10px;right:16px;text-align:right;display:flex;flex-direction:row;gap:4px;justify-content:flex-end;align-items:flex-start;flex-wrap:wrap">'
        +'<button class="sc-ov-btn" id="b-sc-idea" title="Add an idea">💡</button>'
        +'<button class="sc-ov-btn" id="b-sc-recolor-all" title="Recolor all headers">🎨</button>'
        +'<button class="sc-ov-btn" id="b-sc-fix-orphans" title="Fix Purpose/Ideas headers stuck at the shared root">🔧</button>'
        +'<button class="sc-ov-btn" id="b-sc-mode-toggle" title="Full screen">⛶</button>'
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
    T().registerPageNum('s-sea-of-ideas-cluster', '9710');
    T().registerCtx('s-sea-of-ideas-cluster', 'ISB — Cluster');
    T().wire('b-sc-close', function(){
      var fgr=document.getElementById('fg-root'); if(fgr){ fgr.classList.remove('sb-wide'); fgr.classList.remove('isx-full'); }
      if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
      _sboardCurrentTopicId=null; _sboardFilter=null;
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sc-idea', function(){
      if(window.T2TSea && window.T2TSea.openIdeaCapture) window.T2TSea.openIdeaCapture({boardId:_sboardCurrentTopicId, returnToBoard:true});
    });
    T().wire('b-sc-recolor-all', _sboardOpenRecolorAll);
    T().wire('b-sc-fix-orphans', _sboardOpenFixOrphansConfirm);
    // The Storyboard is always at real-viewport size now (same .isx-full
    // takeover as CREATE's Idea Session) — this button now matches CREATE's
    // own ⛶ exactly: an extra layer, the actual browser/OS Fullscreen API.
    T().wire('b-sc-mode-toggle', _isxToggleFullscreen);
    document.addEventListener('fullscreenchange', function(){
      var b=document.getElementById('b-sc-mode-toggle');
      if(b && document.getElementById('s-sea-of-ideas-cluster') && document.getElementById('s-sea-of-ideas-cluster').classList.contains('active')){
        b.innerHTML = document.fullscreenElement ? '\u21a9' : '\u26f6';
        b.title = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
      }
    });
    var boardWrapBgEl=document.getElementById('sc-board-wrap');
    if(boardWrapBgEl) boardWrapBgEl.addEventListener('dblclick', function(e){ if(e.target===boardWrapBgEl || e.target.id==='sc-groups-wrap') openBoardBgPicker(); });
    _sboardApplyBoardBg();
    _sboardWireAutoScroll();

    var topicBoxEl=document.getElementById('sc-topic-box');
    if(topicBoxEl) topicBoxEl.addEventListener('dblclick', function(e){
      e.stopPropagation();
      if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
        openSbDetail(_sboardAllRowsById[_sboardCurrentTopicId]);
      } else {
        openRootPromptEditor();
      }
    });

    // PROJECT opens the switcher — lets you move to a different top-level
    // project entirely (Wish Tank -> Field Guide), not just back to the
    // current one's own root.
    T().wire('sc-project-hit', openProjectSwitcher);

    // PARENT still climbs one level on a simple click — the DETAILS slider
    // (added July 12, 2026) is now the primary way to move a specific card
    // between Parent/Topic/Header/Subber, so the earlier chrome drag-drop
    // system (drag Topic/Parent/cards onto each other) has been removed;
    // this plain click is the one navigation shortcut that stays outside
    // the slider, since it predates this session and needs no card open.
    T().wire('sc-parent-hit', function(){
      if(_sboardCurrentTopicId){ _sboardGoUpOneLevel(); }
    });

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
  }

  /* ── Board (storyboard) state + rendering ── */
  var _sboardDesktop = false;
  var _sboardFilter = null;
  var _sboardCurrentTopicId = null;
  var _sboardTrashId = null;
  var _sboardMiscId = null;
  var _sboardPurposeId = null;
  var _sboardNewAdditionsId = null;
  var _sboardActiveId = null;
  var _sboardHeadersById = {};
  var _sboardHeaderList = [];
  var _sboardTopLevelOrder = [];
  var _sboardAllRowsById = {};
  var _sboardVisibleHeaders = [];
  var _sboardIdeaOrderByParent = {};
  var _sboardChildCountById = {};
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
    {n:'Cork', c:'#c9a876'},
    {n:'Dark Green', c:'#1e4d3a'},
    {n:'Dark Blue', c:'#16324f'},
    {n:'Purple', c:'#4a2f5e'}
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
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Root prompt</div>'
      +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:8px">Shown when no Topic is selected yet.</div>'
      +'<textarea id="sb-rootprompt-box" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:10px;min-height:50px">'+cur+'</textarea>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-rootprompt-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-rootprompt-close" style="flex:1">Close</button></div>'
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
    var w=document.getElementById('sc-board-wrap');
    if(w) w.style.background=_sboardGetBoardBg()||'transparent';
  }
  function _sboardSetBoardBg(c){
    try{ localStorage.setItem('t2t_seaOfIdeas_boardBg', c); }catch(e){}
    _sboardApplyBoardBg();
  }
  function openBoardBgPicker(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var swHTML=_sboardBoardBgPalette.map(function(p){
      return '<button class="sb-bg-swatch" data-c="'+p.c+'" title="'+p.n+'" style="width:40px;height:40px;border-radius:8px;background:'+p.c+';border:1.5px solid #cfe4f2;cursor:pointer;margin:4px"></button>';
    }).join('');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:10px">Board background</div>'
      +'<div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'+swHTML+'</div>'
      +'<button class="sc-ov-btn" id="sb-bg-close">Close</button>'
      +'</div>';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-bg-swatch'), function(btn){
      btn.addEventListener('click', function(){ _sboardSetBoardBg(btn.getAttribute('data-c')); closeSbDetail(); });
    });
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

  // Project switcher — added July 12, 2026. PROJECT was previously a
  // fixed-anchor label only; this makes it a real lateral jump between
  // top-level projects (the flat Top Banana root list), not just a return
  // to the current project's own root.
  async function openProjectSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var boards=await _sboardTopLevelBoards();
    boards=boards.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var currentProjectId=null;
    if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
      var pr=_sboardProjectRowFor(_sboardAllRowsById[_sboardCurrentTopicId]);
      currentProjectId=pr?pr.id:null;
    }
    var rows=boards.map(function(b){
      var cur=String(b.id)===String(currentProjectId)?' current':'';
      return '<div class="sb-hdr-vitem'+cur+'" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
    }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">Switch Project</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Start a new project</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-proj-new-input" type="text" placeholder="Project name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-proj-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-proj-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-proj-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    // Positioned along the left side, near the Project chrome it was opened
    // from, rather than dead-center — added July 12, 2026. Reset in
    // closeSbDetail so other popups that use this same overlay aren't
    // affected by the override.
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
      row.addEventListener('click', function(){
        var pid=row.getAttribute('data-pid');
        var boardRow=boards.find(function(b){ return String(b.id)===String(pid); });
        closeSbDetail();
        if(boardRow) _sboardDrillInto(boardRow);
      });
    });
    T().wire('sb-proj-cancel', closeSbDetail);
    T().wire('sb-proj-new-go', async function(){
      var errEl=document.getElementById('sb-proj-err');
      var nameInput=document.getElementById('sb-proj-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        closeSbDetail();
        _sboardDrillInto(ins.data);
      }catch(err){ if(errEl) errEl.textContent=err.message; }
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
    tile.draggable=!item.locked;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;border-radius:10px;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s'+(item.color?';background:'+item.color:'');
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    if((item.content_type==='image'||item.content_type==='link') && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
      if(item.content_type==='link'){
        var badge=document.createElement('div');
        badge.style.cssText='position:absolute;top:2px;left:2px;font-size:11px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
        badge.textContent='\ud83d\udd17';
        tile.appendChild(badge);
      }
    } else if(item.content_type==='link'){
      var lp=document.createElement('p');
      lp.textContent='\ud83d\udd17 '+_linkParseText(item.text_content).title;
      lp.style.fontSize=_sboardDesktop?'10.5px':'8.5px';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      p.textContent=item.text_content||'(untitled)';
      p.style.fontSize=_sboardDesktop?'10.5px':'8.5px';
      tile.appendChild(p);
    }
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:14px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent = item.heart_count>=2 ? '💕' : '❤️';
      tile.appendChild(hb);
    }
    if(item.locked){
      var lb=document.createElement('div');
      lb.style.cssText='position:absolute;top:2px;right:2px;font-size:11px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
      lb.textContent='\ud83d\udd12';
      tile.appendChild(lb);
    }
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(item); });
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
    var rot=straight?0:(Math.random()*6-3).toFixed(1);
    var wrap=document.createElement('div');
    wrap.className='sc-stack-tile';
    wrap.draggable=!headerRow.locked;
    wrap.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
    wrap.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;cursor:pointer;transform:rotate('+rot+'deg)';
    var bg=headerRow.color||'#fff';
    var back2=document.createElement('div');
    back2.className='sc-stack-layer';
    back2.style.cssText='position:absolute;top:5px;left:5px;width:100%;height:100%;background:'+bg+';border:1.5px solid #4a4a4a;border-radius:10px';
    var back1=document.createElement('div');
    back1.className='sc-stack-layer';
    back1.style.cssText='position:absolute;top:2.5px;left:2.5px;width:100%;height:100%;background:'+bg+';border:1.5px solid #4a4a4a;border-radius:10px';
    var front=document.createElement('div');
    front.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:'+bg+';border:1.5px solid #4a4a4a;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:5px;box-sizing:border-box;text-align:center;overflow:hidden';
    var p=document.createElement('p');
    p.textContent=headerRow.text_content||'(untitled)';
    var fitSize=_sboardFitFontSize(headerRow.text_content, height>=60?13:11, 8);
    p.style.cssText='margin:0;font-weight:700;line-height:1.15;color:#1a3a5c;white-space:normal;word-break:break-word;font-size:'+fitSize+'px';
    front.appendChild(p);
    if(headerRow.locked){
      var hlb=document.createElement('div');
      hlb.style.cssText='position:absolute;top:2px;right:2px;font-size:11px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
      hlb.textContent='\ud83d\udd12';
      front.appendChild(hlb);
    }
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
    wrap.addEventListener('dragover', function(e){ e.preventDefault(); front.style.outline='2px solid #5b9bd5'; });
    wrap.addEventListener('dragleave', function(){ front.style.outline='none'; });
    wrap.addEventListener('drop', function(e){
      e.preventDefault(); front.style.outline='none';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw||raw==='sb-goup'||raw.indexOf('header:')===0) return;
      _sboardMoveCard(raw, headerRow.id);
    });
    return wrap;
  }

  async function renderSeaBoard(){
    if(_isxActive()){ return _isxRenderBoard(); }
    var wrap=document.getElementById('sc-board-wrap');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    if(!wrap||!_sb) return;
    if(statusEl){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');

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
      // to a shared null root.
      var currentTopicRowForProject=_sboardCurrentTopicId?_sboardAllRowsById[_sboardCurrentTopicId]:null;
      var currentProjectRowForScope=currentTopicRowForProject?_sboardProjectRowFor(currentTopicRowForProject):null;
      var isAtProjectRoot=!!(currentProjectRowForScope && String(currentProjectRowForScope.id)===String(_sboardCurrentTopicId));

      // Ensure-calls run concurrently, added July 12, 2026 — these three
      // are fully independent (none needs another's result), but were
      // previously awaited one after another, each a separate Supabase
      // round trip. That sequential chain is what made opening a project
      // for the first time (Purpose/Ideas being created fresh) feel slow.
      var _ensureResults=await Promise.all([
        _sboardCurrentTopicId ? _sboardEnsureNewAdditionsHeader(
          _sboardCurrentTopicId,
          isAtProjectRoot ? ((currentProjectRowForScope.text_content||'Project')+' Ideas') : null
        ) : Promise.resolve(null),
        currentProjectRowForScope ? _sboardEnsurePurposeHeader(currentProjectRowForScope.id) : Promise.resolve(null),
        _sboardEnsureMiscHeader(_sboardCurrentTopicId)
      ]);
      var newAdditionsId=_ensureResults[0];
      _sboardNewAdditionsId=newAdditionsId;
      // Purpose — one per PROJECT, reachable from anywhere inside that
      // project (not just its exact root), never shared across projects
      // and never shown when no project is selected at all.
      var purposeId=_ensureResults[1];
      _sboardPurposeId=purposeId;
      var miscId=_ensureResults[2];

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked')
        .eq('user_id', user.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(300);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      _sboardAllRowsById={}; rows.forEach(function(r){ _sboardAllRowsById[r.id]=r; });
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
      _sboardTopLevelOrder=orderedTop.map(function(h){ return h.id; });

      var SUBBER_W=104;
      var SUBBER_H=64;
      var HEADER_W=152;
      var HEADER_H=SUBBER_H;

      function renderGroup(headerRow, depth){
        var name=headerRow.text_content||'(untitled cluster)';
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='NEW');
        var straight=true;
        var subs=subHeadersOf[headerRow.id]||[];
        var directItems=(childrenOfHeader[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
        _sboardIdeaOrderByParent[headerRow.id]=directItems.map(function(r){ return r.id; });
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('button');
        hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'');
        var hdFitSize=_sboardFitFontSize(name, 15, 10);
        hd.style.cssText='position:static;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-size:'+hdFitSize+'px;font-weight:800;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:12px'+(headerRow.color?';background:'+headerRow.color:'');
        hd.textContent=name;
        if(name==='Purpose'){ hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openPurposeEditor(); }); }
        else { hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(headerRow); }); }
        if(depth===0 && !headerRow.locked){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
        }
        hd.addEventListener('dragover', function(e){
          e.preventDefault();
          var rect=hd.getBoundingClientRect();
          var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
          hd.style.outline='none';
          hd.style.boxShadow = (frac<0.5) ? 'inset 4px 0 0 0 #2d7dff' : 'inset -4px 0 0 0 #2d7dff';
          hd._dropSide = (frac<0.5) ? 'before' : 'after';
        });
        hd.addEventListener('dragleave', function(){ hd.style.boxShadow='none'; hd._dropSide=null; });
        hd.addEventListener('drop', function(e){
          e.preventDefault();
          var side=hd._dropSide||'before';
          hd.style.boxShadow='none'; hd._dropSide=null;
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw || raw==='sb-goup') return;
          if(raw.indexOf('header:')===0){
            _sboardReorderHeader(raw.slice(7), headerRow.id, side==='after');
          } else {
            _sboardMoveCard(raw, headerRow.id);
          }
        });
        block.appendChild(hd);
        if(directItems.length || subs.length){
          var scroll=document.createElement('div');
          scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
          subs.forEach(function(sub){ scroll.appendChild(_sboardMakeHeaderStackTile(sub, SUBBER_W, SUBBER_H, straight)); });
          directItems.forEach(function(item){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, straight, headerRow.id, SUBBER_H)); });
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
        // Contextual label — added July 12, 2026. Loose ideas under a Topic
        // aren't necessarily "new" (a card can land here by sliding down or
        // a header demoting, not just by being freshly typed), so the
        // bucket now reads "[Topic] Ideas" instead of the generic NEW when
        // there's a real Topic to name it after — e.g. "Website Ideas"
        // when Website is the current Topic. Root level (no Topic selected)
        // keeps the plain NEW label, since there's no single name to attach.
        var topicRowForLabel=_sboardCurrentTopicId?_sboardAllRowsById[_sboardCurrentTopicId]:null;
        var localLabel=topicRowForLabel?((topicRowForLabel.text_content||'Topic')+' Ideas'):'NEW';
        hd.style.cssText='position:static;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-size:'+_sboardFitFontSize(localLabel,15,10)+'px;font-weight:800;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:12px'+(newRow&&newRow.color?';background:'+newRow.color:'');
        hd.textContent=localLabel;
        if(newRow){ hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(newRow); }); }
        if(newRow && !newRow.locked){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+newRow.id); });
        }
        hd.addEventListener('dragover', function(e){
          e.preventDefault();
          var rect=hd.getBoundingClientRect();
          var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
          hd.style.outline='none';
          hd.style.boxShadow = (frac<0.5) ? 'inset 4px 0 0 0 #2d7dff' : 'inset -4px 0 0 0 #2d7dff';
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
            if(newRow) _sboardReorderHeader(raw.slice(7), newRow.id, side==='after');
          } else {
            _sboardMoveCard(raw, parentIdForDrop);
          }
        });
        block.appendChild(hd);
        if(directItems.length){
          var scroll=document.createElement('div');
          scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
          directItems.forEach(function(item){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, true, parentIdForDrop, SUBBER_H)); });
          block.appendChild(scroll);
        }
        return block;
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.id='sc-groups-wrap';
      groupsWrap.style.cssText='display:flex;flex-wrap:nowrap;gap:2px;align-items:flex-start';

      if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
        var directIdeas=(childrenOfHeader[_sboardCurrentTopicId]||[]).slice().sort(_sboardBySortOrder);
        _sboardIdeaOrderByParent[_sboardCurrentTopicId]=directIdeas.map(function(r){ return r.id; });
        var childHeaders=subHeadersOf[_sboardCurrentTopicId]||[];
        var childHeadersSorted=childHeaders.slice().sort(_sboardBySortOrder);

        // Unified row — added July 12, 2026. Purpose, the Ideas bucket,
        // ordinary content headers, and MISC now all live in one
        // reorderable row instead of three fixed islands with only the
        // middle section movable. A row member without a real sort_order
        // yet falls back to the familiar default arrangement (Purpose,
        // Ideas, content, MISC) via priority tie-break; the first drag
        // anywhere in the row gives every member a real sort_order and
        // the fallback stops mattering from then on.
        var mergedRow=[];
        if(purposeRow && isAtProjectRoot) mergedRow.push(purposeRow);
        if(newAdditionsRow) mergedRow.push(newAdditionsRow);
        mergedRow=mergedRow.concat(childHeadersSorted);
        if(miscRow) mergedRow.push(miscRow);
        var _rowPriority=function(h){
          if(purposeRow && String(h.id)===String(purposeRow.id)) return -2;
          if(newAdditionsRow && String(h.id)===String(newAdditionsRow.id)) return -1;
          if(miscRow && String(h.id)===String(miscRow.id)) return 999;
          return 0;
        };
        mergedRow.sort(function(a,b){
          var ao=(a.sort_order===null||a.sort_order===undefined)?_rowPriority(a):a.sort_order;
          var bo=(b.sort_order===null||b.sort_order===undefined)?_rowPriority(b):b.sort_order;
          return ao-bo;
        });
        _sboardTopLevelOrder=mergedRow.map(function(h){ return h.id; });
        _sboardVisibleHeaders=childHeadersSorted;

        if(statusEl) statusEl.textContent=(directIdeas.length===0 && childHeaders.length===0) ? 'Nothing under this Header yet.' : '';

        mergedRow.forEach(function(h){
          if(newAdditionsRow && String(h.id)===String(newAdditionsRow.id)){
            groupsWrap.appendChild(renderLocalNewAdditions(directIdeas, _sboardCurrentTopicId, h));
          } else {
            groupsWrap.appendChild(renderGroup(h, 0));
          }
        });
      } else {
        if(newAdditionsRow) groupsWrap.appendChild(renderGroup(newAdditionsRow, 0));
        orderedTop.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
        _sboardVisibleHeaders=(newAdditionsRow?[newAdditionsRow]:[]).concat(orderedTop);
        if(statusEl) statusEl.textContent='';
        if(miscRow) groupsWrap.appendChild(renderGroup(miscRow, 0));
      }

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
          var toUpload=await _compressImageFile(f);
          var uploadName=toUpload.name||fname;
          var path=user.id+'/'+Date.now()+'-'+i+'-'+uploadName.replace(/[^a-zA-Z0-9._-]/g,'_');
          var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
          if(up.error) throw up.error;
          var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
          var url=pub.data && pub.data.publicUrl;
          if(!url) throw new Error('No public URL returned.');
          var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'image',image_url:url,cluster_id:_sboardFilter||null,created_at:new Date().toISOString()});
          if(ins.error) throw ins.error;
          ok++;
        }catch(fileErr){ failed++; }
      }
      if(statusEl){
        statusEl.textContent = failed ? (ok+' uploaded, '+failed+' failed.') : '';
        if(failed) statusEl.classList.add('err');
      }
      renderSeaBoard();
    }catch(err){
      if(statusEl){ statusEl.textContent='Upload needs the sea-of-ideas Storage bucket set up in Supabase first: '+err.message; statusEl.classList.add('err'); }
    }
  }

  function _sboardTopicOptionsHTML(excludeId){
    var currentLabel=(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId]) ? _sboardHeadersById[_sboardCurrentTopicId].text_content : 'ISB';
    var currentValue=_sboardCurrentTopicId||'';
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
    var apexTag=(!headerRow.cluster_id)?'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">'+headerRow.text_content+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Move under</label>'
      +'<select id="sb-hq-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-hq-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px"><button class="sc-ov-btn save" id="sb-hq-move" style="flex:1">Move here</button><button class="sc-ov-btn" id="sb-hq-open" style="flex:1">Open board</button></div>'
      +'<button class="sc-ov-btn" id="sb-hq-trash" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8">🗑 Trash this header</button>'
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
        closeSbDetail();
        renderSeaBoard();
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
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:8px">Trash "'+safeName+'"?</div>'
      +'<div style="font-size:11px;color:#7a6040;margin-bottom:10px">Anything still nested under it moves to Trash too — you can pull it back out later from Trash.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-trash-go" style="flex:1;background:#b8562f;border-color:#b8562f">Trash it</button><button class="sc-ov-btn" id="sb-trash-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-trash-cancel', closeSbDetail);
    T().wire('sb-trash-go', async function(){
      var _sb=T().sb;
      try{
        var trashId=await _sboardEnsureTrashHeader();
        var upd=await _sb.from('ideas').update({cluster_id:trashId}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:10px;margin-top:6px">'+err.message+'</div>');
      }
    });
  }

  function _sboardDrillInto(headerRow){
    _sboardCurrentTopicId=headerRow.id;
    _sboardFilter=headerRow.id;
    renderSeaBoard();
  }

  function _sboardGoUpOneLevel(){
    var curRow=_sboardCurrentTopicId?_sboardAllRowsById[_sboardCurrentTopicId]:null;
    var parentId=curRow?(curRow.cluster_id||null):null;
    _sboardCurrentTopicId=parentId;
    _sboardFilter=parentId;
    renderSeaBoard();
  }

  function _sboardUpdateHeaderChrome(){
    var topicBox=document.getElementById('sc-topic-box');
    var areaEl=document.getElementById('sc-header-area');
    var parentHit=document.getElementById('sc-parent-hit');
    var parentLabel=document.getElementById('sc-parent-label');
    var projectLabel=document.getElementById('sc-project-label');
    // Root Topic never changes — "What do you want?" stays permanent regardless of depth.
    if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
      var topicRow=_sboardAllRowsById[_sboardCurrentTopicId];
      if(topicBox){ topicBox.textContent=topicRow.text_content||'(untitled)'; topicBox.style.background=topicRow.color||''; }
      if(areaEl) areaEl.style.background='#3a2564';
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
      if(parentLabel) parentLabel.textContent=parentRow?(parentRow.text_content||'(untitled)'):projectName;
      if(parentHit){ parentHit.classList.remove('inert'); }
    } else {
      if(topicBox){ topicBox.textContent=_sboardGetRootPrompt(); topicBox.style.background=''; }
      if(areaEl) areaEl.style.background='#1a3a5c';
      if(projectLabel) projectLabel.textContent='ISB';
      if(parentLabel) parentLabel.textContent='ISB';
      if(parentHit){ parentHit.classList.add('inert'); }
    }
  }

  async function _sboardMoveCard(itemId, headerId){
    if(_sboardAllRowsById[itemId] && _sboardAllRowsById[itemId].locked) return;
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    try{
      var siblingCount=(_sboardIdeaOrderByParent[headerId]||[]).length;
      var upd=await _sb.from('ideas').update({cluster_id:headerId, sort_order:siblingCount}).eq('id',itemId);
      if(upd.error) throw upd.error;
      renderSeaBoard();
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
    var ids=(_sboardIdeaOrderByParent[parentId]||[]).slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    if(fromIdx!==-1) ids.splice(fromIdx,1);
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    ids.splice(toIdx===-1?ids.length:toIdx, 0, draggedId);
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      var updCluster=await _sb.from('ideas').update({cluster_id:parentId}).eq('id',draggedId);
      if(updCluster.error) throw updCluster.error;
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
      }
      renderSeaBoard();
    }catch(err){
      if(statusEl){ statusEl.textContent='Reordering needs the sort_order Supabase column: '+err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardReorderHeader(draggedId, targetId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    var statusEl=document.getElementById('sc-status');
    var ids=_sboardTopLevelOrder.slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(fromIdx===-1||toIdx===-1) return;
    ids.splice(fromIdx,1);
    var insertAt=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(insertAfter) insertAt+=1;
    ids.splice(insertAt,0,draggedId);
    var _sb=T().sb;
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]);
        if(upd.error) throw upd.error;
      }
      renderSeaBoard();
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
    var apexTag=(!headerRow.cluster_id)?'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Name</label>'
      +'<input id="sb-h-name" type="text" value="'+safeName+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:\'Playfair Display\',serif;font-size:14px;color:#1a3a5c;font-weight:700;margin-bottom:10px;box-sizing:border-box">'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Nest under</label>'
      +'<select id="sb-h-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-h-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-h-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-h-close" style="flex:1">Close</button></div>'
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
        closeSbDetail();
        renderSeaBoard();
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
      +'<div id="sb-peek-body" style="text-align:center;font-size:11px;font-style:italic;color:#999;padding:20px 0">Loading…</div>'
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
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked')
        .eq('user_id',user.id).eq('cluster_id',headerRow.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(200);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      if(!rows.length){
        body.textContent='Nothing under this Header yet.';
        return;
      }
      var subRows=rows.filter(function(r){ return r.content_type==='header'; });
      var itemRows=rows.filter(function(r){ return r.content_type!=='header'; });
      var grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(3,84px);gap:10px;justify-content:center';
      subRows.forEach(function(sub){ grid.appendChild(_sboardMakeHeaderStackTile(sub, 84, 84, true)); });
      itemRows.forEach(function(item){ grid.appendChild(_sboardMakeTile(item, 84, true)); });
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
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Add an idea</div>'
      +'<div style="font-size:11px;font-style:italic;color:#888;margin-bottom:10px">'+(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId] ? 'Goes under '+_sboardHeadersById[_sboardCurrentTopicId].text_content : 'Goes into NEW')+'</div>'
      +'<textarea id="qa-idea-text" placeholder="What if…?" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:4px;min-height:70px"></textarea>'
      +'<div style="font-size:9px;font-style:italic;color:#a3907a;margin-bottom:6px">End with : or ? to make it a Header automatically</div>'
      +'<div id="qa-idea-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="qa-idea-save" style="flex:1">Save</button><button class="sc-ov-btn" id="qa-idea-close" style="flex:1">Close</button></div>'
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
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:contentType,text_content:text,cluster_id:_sboardFilter||null,created_at:new Date().toISOString()});
        if(ins.error) throw ins.error;
        closeSbDetail();
        renderSeaBoard();
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
      var wt=await _ideaEnsureWishTank();
      if(!wt || !wt.id) throw new Error('Wish Tank unavailable: '+(wt&&wt.error?wt.error:'unknown'));
      var res=await _sb.from('ideas').select('id,text_content').eq('user_id',user.id)
        .eq('content_type','header').is('cluster_id',null)
        .in('text_content',['Purpose','NEW','New Additions','MISC']);
      if(res.error) throw new Error(res.error.message);
      var orphans=(res.data||[]).filter(function(r){ return String(r.id)!==String(wt.id); });
      var ov2=document.getElementById('sb-detail-overlay');
      if(!orphans.length){
        ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:8px">Nothing to fix</div>'
          +'<div style="font-size:11px;color:#7a6040;margin-bottom:10px">No orphaned Purpose or Ideas headers found at the shared root.</div>'
          +'<button class="sc-ov-btn" id="sb-fix-close" style="width:100%">Close</button></div>';
        ov2.classList.add('active');
        T().wire('sb-fix-close', closeSbDetail);
        return;
      }
      var listHTML=orphans.map(function(o){ return '<div style="font-size:12px;padding:3px 0">• '+(o.text_content||'(untitled)')+'</div>'; }).join('');
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:8px">Found '+orphans.length+' orphaned header(s)</div>'
        +'<div style="font-size:11px;color:#7a6040;margin-bottom:8px">These will move under Wish Tank. The Ideas header will be renamed "Wish Tank Ideas". Field Guide is untouched — it gets its own fresh Purpose and Ideas headers automatically the next time you open it.</div>'
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
          }
          closeSbDetail();
          renderSeaBoard();
        }catch(err){
          var errBox=document.querySelector('.sc-overlay-card');
          if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:10px;margin-top:6px">'+err.message+'</div>');
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
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all headers</div>'
      +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:10px">Pick one — every header on this board, including Purpose, MISC and NEW, gets it.</div>'
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
          for(var i=0;i<uniq.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',uniq[i]); }
        }catch(e){}
        closeSbDetail();
        renderSeaBoard();
      };
    });
  }

  async function openPurposeEditor(){
    var ov=document.getElementById('sb-detail-overlay');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    try{
      var id=await _sboardEnsurePurposeHeader(null);
      var row=await _sb.from('ideas').select('notes,color').eq('id',id).single();
      var curText=(row.data && row.data.notes) || '';
      var curColor=(row.data && row.data.color) || '';
      var pSwatches=_sboardColorPalette.map(function(c){
        var sel=(curColor===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
        return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
      }).join('');
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Purpose</div>'
        +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:8px">Why are we doing this?</div>'
        +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+pSwatches+'</div>'
        +'<textarea id="sb-purpose-box" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;min-height:70px">'+curText+'</textarea>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-purpose-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-purpose-close" style="flex:1">Close</button></div>'
        +'</div>';
      ov.classList.add('active');
      ov.querySelectorAll('.sb-swatch').forEach(function(sw){
        sw.onclick=async function(){
          var c=sw.getAttribute('data-c');
          try{ await _sb.from('ideas').update({color:c}).eq('id',id); }catch(e){}
          closeSbDetail(); renderSeaBoard();
        };
      });
      T().wire('sb-purpose-save', async function(){
        var val=document.getElementById('sb-purpose-box').value;
        var upd=await _sb.from('ideas').update({notes:val}).eq('id',id);
        if(!upd.error){ var btn=document.getElementById('b-sc-purpose'); if(btn) btn.title=val; }
        closeSbDetail();
      });
      T().wire('sb-purpose-close', closeSbDetail);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardEnsureMiscHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var q=_sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','MISC');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardMiscId=existing.data[0].id; return _sboardMiscId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'MISC',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('MISC setup failed: '+ins.error.message);
    _sboardMiscId=ins.data.id;
    return _sboardMiscId;
  }

  async function _sboardEnsurePurposeHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var q=_sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
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
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Ideas header setup failed: '+ins.error.message);
    _sboardNewAdditionsId=ins.data.id;
    return _sboardNewAdditionsId;
  }

  async function _sboardEnsureTrashHeader(){
    if(_sboardTrashId) return _sboardTrashId;
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Trash').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardTrashId=existing.data[0].id; return _sboardTrashId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Trash',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Trash setup failed: '+ins.error.message);
    _sboardTrashId=ins.data.id;
    return _sboardTrashId;
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
      +'border-radius:50%;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.5);color:#fff;font-size:18px;cursor:pointer">\u2715</button>';
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
    var isHeaderType=item.content_type==='header';
    var reservedNames=['Trash','MISC','Purpose','NEW'];
    var isReservedItem=isHeaderType && reservedNames.indexOf(item.text_content)!==-1;

    if(isReservedItem){
      var rSwatches=_sboardColorPalette.map(function(c){
        var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
        return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
      }).join('');
      ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center">'
        + '<div class="sb-card-title">Shape</div>'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:8px">'+item.text_content+'</div>'
        + '<div style="font-size:11px;color:#7a6040;font-style:italic;margin-bottom:10px">This is a system header — it can\'t be renamed, moved, or trashed.</div>'
        + '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+rSwatches+'</div>'
        + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:block;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px;flex:1"></textarea>'
        + '<button class="sb-close-btn" id="sb-close">Close</button>'
        + '</div>';
      ov.classList.add('active');
      ov.querySelectorAll('.sb-swatch').forEach(function(sw){
        sw.onclick=async function(){
          var c=sw.getAttribute('data-c');
          try{ await _sb.from('ideas').update({color:c}).eq('id',item.id); item.color=c; }catch(e){}
          closeSbDetail(); renderSeaBoard();
        };
      });
      var rNotes=document.getElementById('sb-notes-box');
      if(rNotes){ rNotes.value=item.notes||''; rNotes.addEventListener('blur', async function(e){
        try{ await _sb.from('ideas').update({notes:e.target.value}).eq('id',item.id); item.notes=e.target.value; }catch(err){}
      }); }
      T().wire('sb-close', closeSbDetail);
      return;
    }

    var isTrashed=String(item.cluster_id)===String(_sboardTrashId) && _sboardTrashId;
    var isMisc=String(item.cluster_id)===String(_sboardMiscId) && _sboardMiscId;
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
    var _sliderParentRow = item.cluster_id ? _sboardAllRowsById[item.cluster_id] : null;
    var canSlideParent = !!(_sliderParentRow && _sliderParentRow.cluster_id);
    var canSlideHeader = !!item.cluster_id;
    var canSlideSubber = !(isHeaderType && isBucket);
    var isCurrentTopic = String(item.id)===String(_sboardCurrentTopicId);
    var sliderCurrentRank = isCurrentTopic ? 'topic' : (isHeaderType ? 'header' : 'subber');
    var apexTag=(isHeaderType && !item.cluster_id)?'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    var swatches=_sboardColorPalette.map(function(c){
      var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
    }).join('');

    // PARENT / TOPIC eyebrows — computed exactly the way the board's own
    // chrome computes them, so the SHAPING card always agrees with the board.
    var topicRow=_sboardCurrentTopicId?_sboardAllRowsById[_sboardCurrentTopicId]:null;
    var topicLabel=(_sboardCurrentTopicId && topicRow)?(topicRow.text_content||'(untitled)'):_sboardGetRootPrompt();
    var parentIdCrumb=topicRow?(topicRow.cluster_id||null):null;
    var parentRowCrumb=parentIdCrumb?_sboardAllRowsById[parentIdCrumb]:null;
    var parentFallbackCrumb=(topicRow&&topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'NEW');
    var parentLabelCrumb=(_sboardCurrentTopicId && topicRow)?(parentRowCrumb?(parentRowCrumb.text_content||'(untitled)'):parentFallbackCrumb):'ISB';
    var crumbsHTML='<div class="sb-hdr-eyebrow2">Parent</div><div class="sb-parent-value">'+parentLabelCrumb+'</div>'
      + '<div class="sb-hdr-eyebrow2">Topic</div><div class="sb-topic-value">'+topicLabel+'</div>';

    // HEADER eyebrow: collapsed by default, showing only the current header —
    // tap to reveal the same option list as before (visible-headers-in-context).
    // "NEW" here means whichever board's own uncategorized bucket is
    // active: null at the root ISB, or the current topic id when
    // working inside a nested (fractal) board.
    var localNewAdditionsTarget=_sboardCurrentTopicId||'';
    var isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
    var curHeaderRow=(item.cluster_id && !isInLocalNewAdditions)?_sboardAllRowsById[item.cluster_id]:null;
    var curHeaderLabel=curHeaderRow?(curHeaderRow.text_content||'(untitled)'):'NEW';
    var headerListHTML='<div class="sb-hdr-eyebrow2">Move to a different Header</div>'
      + '<div class="sb-hdr-current" id="sb-hdr-current">'+curHeaderLabel+' ▾</div>'
      + '<div class="sb-hdr-vlist" id="sb-hdr-vlist" style="display:none">'
      + '<div class="sb-hdr-vitem'+(isInLocalNewAdditions?' current':'')+'" data-hid="'+localNewAdditionsTarget+'">NEW</div>'
      + (_sboardPurposeId?('<div class="sb-hdr-vitem'+(String(item.cluster_id||'')===String(_sboardPurposeId)?' current':'')+'" data-hid="'+_sboardPurposeId+'">Purpose</div>'):'')
      + _sboardVisibleHeaders.filter(function(h){ return String(h.id)!==String(item.id) && h.text_content!=='NEW'; })
          .map(function(h){ var cur=(item.cluster_id && String(h.id)===String(item.cluster_id))?' current':''; return '<div class="sb-hdr-vitem'+cur+'" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>'; }).join('')
      + '<div class="sb-hdr-vitem newh" id="sb-hdr-newh">+ Create new header…</div>'
      + '</div>'
      + '<div class="sb-inline-field" id="sb-newheader-row" style="display:none"><input id="sb-newheader-input" type="text" placeholder="New header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:6px"><button class="sb-blue-btn" id="sb-newheader-go" style="width:100%">Create &amp; move here</button></div>'
      + '<div style="display:flex;gap:6px;margin-top:6px">'
      + '<button class="sc-ov-btn" id="sb-hdr-othertopic" style="flex:1;font-size:10px">📍 Different Topic…</button>'
      + '<button class="sc-ov-btn" id="sb-hdr-otherproj" style="flex:1;font-size:10px">🔀 Different Project…</button>'
      + '</div>';

    // Body: always the same fixed size and shape, whether it holds an image
    // or a single word. Images get an editable caption/title underneath —
    // this is what becomes the card's name (and Topic label, if drilled into).
    var bodyHTML;
    if(item.content_type==='link'){
      var linkData=_linkParseText(item.text_content);
      bodyHTML='<div class="sb-body-box">'+(item.image_url?'<img id="sb-img-preview" src="'+item.image_url+'">':'<div style="font-size:40px">\ud83d\udd17</div>')+'</div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:13px;margin-bottom:4px;color:'+(linkData.title?'#1a3a5c':'#a3907a')+'" title="Tap to edit the title">'+(linkData.title||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:6px">'+(linkData.title||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>'
        + '<a href="'+linkData.url+'" target="_blank" rel="noopener" style="display:block;font-size:11px;color:#5b9bd5;word-break:break-word;margin-bottom:8px">'+linkData.url+' \u2197</a>';
    } else if(item.content_type==='image' && item.image_url){
      bodyHTML='<div class="sb-body-box"><img id="sb-img-preview" src="'+item.image_url+'"></div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:13px;margin-bottom:8px;color:'+(item.text_content?'#1a3a5c':'#a3907a')+'" title="Tap to add a title">'+(item.text_content||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>';
    } else {
      var fitSize=_sboardFitFontSize(item.text_content||'', 18, 11);
      bodyHTML='<div class="sb-body-box"><div id="sb-text-display" class="sb-body-text" style="font-size:'+fitSize+'px" title="Tap to edit">'+(item.text_content||'(untitled)')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div></div>';
    }

    ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center;background:#F5F1E8;position:relative">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      + '<span id="sb-details-eyebrow" style="font-size:11px;font-weight:500;letter-spacing:0.08em;color:#2C2C2A;cursor:default">DETAILS</span>'
      + '<button id="sb-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:13px;color:#2C2C2A">✕</button>'
      + '</div>'
      + '<div id="sb-pagenum" style="font-size:8px;letter-spacing:2px;color:#a3907a;height:10px;margin:-4px 0 4px;opacity:0;transition:opacity .3s">9636</div>'
      + apexTag
      + crumbsHTML
      + headerListHTML
      + bodyHTML
      + '<div style="display:flex;align-items:center;gap:6px;margin:6px 0">'
      + '<button id="sb-heart" class="sb-heart-pill" aria-label="Tap to add a heart, hold to remove one" style="font-size:12px;padding:5px 9px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;display:flex;align-items:center;gap:4px;cursor:pointer;color:#2C2C2A">'
      + '<span style="color:#D4537E;font-size:13px">❤</span><span id="sb-heart-count">'+heartCount+'</span></button>'
      + '</div>'
      + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:none;width:100%;box-sizing:border-box;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px">'+(item.notes||'')+'</textarea>'
      + '<div id="sb-swatch-row" class="sb-swatch-row2">'+swatches+'</div>'
      + '<div id="sb-note-status" style="font-size:9px;color:#a3907a;margin-bottom:4px;min-height:11px"></div>'
      + '<input type="file" id="sb-img-input" accept="image/*" style="display:none">'
      + '<div class="sb-slider-project" id="sb-slider-project" title="Switch project">PROJECT</div>'
      + '<div class="sb-viewas-eyebrow">VIEW</div>'
      + '<div class="sb-slider-track" style="margin-bottom:8px'+(item.locked?';opacity:.45;pointer-events:none':'')+'">'
      + '<div class="sb-slider-notch'+(!canSlideParent?' sb-slide-disabled':'')+'" id="sb-slide-parent" data-rank="parent">PARENT</div>'
      + '<div class="sb-slider-notch'+(sliderCurrentRank==='topic'?' sb-slide-current':'')+'" id="sb-slide-topic" data-rank="topic">TOPIC</div>'
      + '<div class="sb-slider-notch'+(!canSlideHeader?' sb-slide-disabled':(sliderCurrentRank==='header'?' sb-slide-current':''))+'" id="sb-slide-header" data-rank="header">HEADER</div>'
      + '<div class="sb-slider-notch'+(!canSlideSubber?' sb-slide-disabled':(sliderCurrentRank==='subber'?' sb-slide-current':''))+'" id="sb-slide-subber" data-rank="subber">SUBBER</div>'
      + '</div>'
      + '<div class="sb-blue-row">'
      + '<button class="sb-blue-btn" id="sb-notes" title="Notes">✏️</button>'
      + '<button class="sb-blue-btn'+(isMisc?' misc-on':'')+'" id="sb-misc" title="Misc">'+(isMisc?'MISC ✓':'MISC')+'</button>'
      + '<button class="sb-blue-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'🗑️')+'</button>'
      + '<button class="sb-blue-btn" id="sb-lock" title="'+(item.locked?'Unlock — allow editing and moving':'Lock — read-only, fixed position')+'">'+(item.locked?'🔒':'🔓')+'</button>'
      + '<button class="sb-blue-btn" id="sb-gear" title="Appearance">⚙️</button>'
      + '</div>'
      + '<div id="sb-trash-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.4);border-radius:12px;align-items:center;justify-content:center">'
      + '<div style="background:#fff;border-radius:10px;padding:14px 18px;text-align:center;border:0.5px solid #888780">'
      + '<p style="font-size:14px;font-weight:500;margin:0 0 10px;color:#2C2C2A">Moose poop?</p>'
      + '<div style="display:flex;gap:8px;justify-content:center">'
      + '<button id="sb-trash-yes" style="font-size:12px;padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Yes</button>'
      + '<button id="sb-trash-no" style="font-size:12px;padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Keep it</button>'
      + '</div></div></div>'
      + '</div>';
    ov.classList.add('active');

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

    T().wire('sb-slider-project', openProjectSwitcher);

    T().wire('sb-slide-parent', function(){
      if(!canSlideParent) return;
      var grandparent=_sliderParentRow.cluster_id?_sboardAllRowsById[_sliderParentRow.cluster_id]:null;
      if(!grandparent) return;
      closeSbDetail();
      _sboardDrillInto(grandparent);
    });
    T().wire('sb-slide-topic', function(){
      closeSbDetail();
      _sboardDrillInto(item);
    });
    T().wire('sb-slide-header', async function(){
      if(!canSlideHeader) return;
      try{
        if(item.content_type!=='header'){
          var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id',item.id);
          if(upd.error) throw upd.error;
        }
        closeSbDetail();
        _sboardDrillInto(_sliderParentRow);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });
    T().wire('sb-slide-subber', async function(){
      if(!canSlideSubber) return;
      try{
        if(item.content_type==='header'){
          var upd=await _sb.from('ideas').update({content_type:'text'}).eq('id',item.id);
          if(upd.error) throw upd.error;
        }
        closeSbDetail();
        renderSeaBoard();
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // Header field: collapsed by default, expands to the option list on tap
    T().wire('sb-hdr-current', function(){
      var vlist=document.getElementById('sb-hdr-vlist');
      vlist.style.display=(vlist.style.display==='none')?'flex':'none';
      vlist.style.flexDirection='column';
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
          renderSeaBoard();
        }catch(err){ if(statusBox) statusBox.textContent=err.message; }
      });
    });
    async function openMoveToProjectPicker(){
      var ov2=document.getElementById('sb-detail-overlay');
      if(!ov2) return;
      var boards=(await _sboardTopLevelBoards()).slice().sort(function(a,b){
        return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
      });
      var rows=boards.filter(function(b){ return String(b.id)!==String(item.id); }).map(function(b){
        return '<div class="sb-hdr-vitem" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Move "'+(item.text_content||'(untitled)')+'"</div>'
        +'<div style="font-size:11px;color:#7a6040;margin-bottom:10px">Moves this card — and everything nested underneath it — into the top level of the project you pick.</div>'
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
      var currentProjectRow=(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId])
        ? _sboardProjectRowFor(_sboardAllRowsById[_sboardCurrentTopicId]) : null;
      var reserved=['Trash','MISC','Purpose','NEW','New Additions'];
      var candidates=Object.keys(_sboardHeadersById).map(function(k){ return _sboardHeadersById[k]; })
        .filter(function(h){
          if(String(h.id)===String(item.id)) return false;
          if(reserved.indexOf(h.text_content)!==-1) return false;
          if(!currentProjectRow) return false;
          var proj=_sboardProjectRowFor(h);
          return proj && String(proj.id)===String(currentProjectRow.id);
        })
        .sort(function(a,b){ return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase()); });
      var rows=candidates.map(function(h){
        return '<div class="sb-hdr-vitem" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No other topics in this project yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">Move under a different Topic</div>'
        +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:240px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
        +'<button class="sc-ov-btn" id="sb-movetopic-cancel" style="width:100%">Cancel</button>'
        +'</div>';
      ov2.classList.add('active');
      Array.prototype.forEach.call(ov2.querySelectorAll('.sb-hdr-vitem[data-hid]'), function(row){
        row.addEventListener('click', async function(){
          var hid=row.getAttribute('data-hid');
          var landing=_sboardHeadersById[hid];
          try{
            var upd=await _sb.from('ideas').update({cluster_id:hid}).eq('id',item.id).select();
            if(upd.error) throw upd.error;
            item.cluster_id=hid;
            closeSbDetail();
            if(landing) _sboardDrillInto(landing);
          }catch(err){ console.error(err); }
        });
      });
      T().wire('sb-movetopic-cancel', function(){ openSbDetail(item); });
    }

    T().wire('sb-hdr-newh', function(){
      document.getElementById('sb-newheader-row').style.display='block';
    });
    T().wire('sb-hdr-othertopic', openMoveToTopicPicker);
    T().wire('sb-hdr-otherproj', openMoveToProjectPicker);
    T().wire('sb-newheader-go', async function(){
      var name=(document.getElementById('sb-newheader-input')||{}).value||'';
      name=name.trim() || ('Cluster '+_sboardNextClusterNumber());
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var parentId=_sboardFilter||null;
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw new Error(ins.error.message);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=ins.data.id;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

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
      try{
        var patch;
        if(item.content_type==='link'){
          var curLink=_linkParseText(item.text_content);
          patch={text_content: JSON.stringify({url:curLink.url, title:newText})};
        } else {
          patch={text_content:newText};
          if(item.content_type==='text' && _sboardIsAutoHeaderText(newText)) patch.content_type='header';
        }
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.text_content=patch.text_content;
        if(patch.content_type) item.content_type=patch.content_type;
        closeSbDetail();
        renderSeaBoard();
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
        renderSeaBoard();
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    T().wire('sb-lock', async function(){
      try{
        var newLocked=!item.locked;
        var upd=await _sb.from('ideas').update({locked:newLocked}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.locked=newLocked;
        closeSbDetail();
        renderSeaBoard();
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
    var notesBox=document.getElementById('sb-notes-box');
    if(notesBox) notesBox.addEventListener('blur', async function(e){
      try{
        var upd=await _sb.from('ideas').update({notes:e.target.value}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.notes=e.target.value;
      }catch(err){ if(statusBox) statusBox.textContent='Notes need the notes Supabase column.'; }
    });

    T().wire('sb-misc', async function(){
      try{
        var targetId=await _sboardEnsureMiscHeader(_sboardCurrentTopicId);
        var newCluster=isMisc?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    async function _sbDoTrash(){
      if(isHeaderType){ closeSbDetail(); _sboardConfirmTrashHeader(item); return; }
      try{
        var targetId=await _sboardEnsureTrashHeader();
        var newCluster=isTrashed?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
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
        try{
          var upd=await _sb.from('ideas').update({color:c}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.color=c;
          try{ localStorage.setItem('t2t_seaOfIdeas_'+(isHeaderType?'header':'subber')+'Color', c); }catch(e){}
          renderSeaBoard();
        }catch(err){ if(statusBox) statusBox.textContent='Color needs the color Supabase column: '+err.message; }
      });
    });


    T().wire('sb-close', closeSbDetail);
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
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked')
        .eq('user_id',user.id).eq('cluster_id',headerRow.id).in('content_type',['image','text','link','header'])
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
          function onMove(e2){
            var r=canvas.getBoundingClientRect();
            var cx=e2.clientX-r.left, cy=e2.clientY-r.top;
            if(Math.abs(cx-start.x)>3 || Math.abs(cy-start.y)>3) moved=true;
            var x=Math.min(cx,start.x), y=Math.min(cy,start.y);
            lasso.style.left=x+'px'; lasso.style.top=y+'px';
            lasso.style.width=Math.abs(cx-start.x)+'px';
            lasso.style.height=Math.abs(cy-start.y)+'px';
          }
          function onUp(){
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            var lb={left:parseFloat(lasso.style.left), top:parseFloat(lasso.style.top), width:parseFloat(lasso.style.width), height:parseFloat(lasso.style.height)};
            if(lasso.parentNode) lasso.parentNode.removeChild(lasso);
            _clusterSelected={};
            if(moved){
              Array.prototype.forEach.call(canvas.querySelectorAll('.sc-tile'), function(t){
                var tx=parseFloat(t.style.left), ty=parseFloat(t.style.top);
                var overlaps = tx<lb.left+lb.width && tx+tileSize>lb.left && ty<lb.top+lb.height && ty+tileSize>lb.top;
                if(overlaps) _clusterSelected[t.getAttribute('data-idea-id')]=true;
              });
            }
            Array.prototype.forEach.call(canvas.querySelectorAll('.sc-tile'), function(t){
              t.classList.toggle('cl-selected', !!_clusterSelected[t.getAttribute('data-idea-id')]);
            });
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
      lp.textContent='\ud83d\udd17 '+_linkParseText(item.text_content).title;
      lp.style.cssText='margin:0;font-size:8.5px;line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      p.textContent=item.text_content||'(untitled)';
      p.style.cssText='margin:0;font-size:8.5px;line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none';
      tile.appendChild(p);
    }
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:14px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent=item.heart_count>=2?'💕':'❤️';
      tile.appendChild(hb);
    }
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(item); });
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
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:4px">Name this cluster</div>'
      +'<div style="font-size:11px;color:#7a6040;font-style:italic;margin-bottom:10px">Stacking these '+count+' ideas together — cancel to leave them loose instead.</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">HEADER:</label>'
      +'<input id="cl-stack-name" type="text" placeholder="Name it…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:10px;box-sizing:border-box">'
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
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw ins.error;
      var newHeaderId=ins.data.id;
      for(var i=0;i<allIds.length;i++){
        var upd=await _sb.from('ideas').update({cluster_id:newHeaderId}).eq('id',allIds[i]);
        if(upd.error) throw upd.error;
      }
    }catch(err){}
    allIds.forEach(function(id){ delete _clusterCardPos[id]; delete _clusterSelected[id]; });
    closeSbDetail();
    renderSeaBoard();
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
    }catch(err){}
    renderClusterView(headerRow);
    renderSeaBoard();
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
      }
    }catch(err){}
    ids.forEach(function(id){ delete _clusterCardPos[id]; delete _clusterSelected[id]; });
    renderClusterView(headerRow);
    renderSeaBoard();
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
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString()});
      if(ins.error) throw ins.error;
    }catch(err){}
    renderClusterView(headerRow);
    renderSeaBoard();
  }

  /* Renaming a bucket now happens via the ✏️ button inside openSbHeaderPeek,
     which reuses the existing openSbHeaderDetail dialog (name + nest-under,
     already built) — see above. Kept CLUSTER's own rename code out of here
     on purpose, so there's exactly one rename dialog instead of two. */

  /* ── 9210-9214 · Idea capture family ── */
  var _ideaCaptureCtx = null;
  var _ideaReturnToBoard = false;
  var _ideaReturnBoardId = null;
  var _ideaWired = false;
  var _ideaDraftText = '';
  var _themeWired = false;
  var _pasteWired = false;
  var _pastePendingUrl = null;
  var _pastePendingFile = null;
  var _linkWired = false;
  var _linkPendingUrl = null;
  var _linkPendingThumb = null;
  var _linkPendingTitle = null;
  var _linkResolveTimer = null;
  var _customWired = false;

  // Known oEmbed-capable providers. Each is called as
  // {endpoint}?format=json&url={theOriginalUrl} — all of these accept the
  // full page URL directly (no need to hand-parse video/track IDs) and are
  // reachable with a plain client-side fetch (CORS-enabled).
  var _LINK_OEMBED_PROVIDERS=[
    {hosts:['youtube.com','www.youtube.com','m.youtube.com','youtu.be'], endpoint:'https://www.youtube.com/oembed'},
    {hosts:['vimeo.com','www.vimeo.com'], endpoint:'https://vimeo.com/api/oembed.json'},
    {hosts:['open.spotify.com'], endpoint:'https://open.spotify.com/oembed'},
    {hosts:['soundcloud.com','www.soundcloud.com'], endpoint:'https://soundcloud.com/oembed'},
    {hosts:['tiktok.com','www.tiktok.com'], endpoint:'https://www.tiktok.com/oembed'}
  ];

  function _linkFindProvider(url){
    try{
      var host=new URL(url).hostname.toLowerCase();
      for(var i=0;i<_LINK_OEMBED_PROVIDERS.length;i++){
        if(_LINK_OEMBED_PROVIDERS[i].hosts.indexOf(host)!==-1) return _LINK_OEMBED_PROVIDERS[i];
      }
    }catch(e){}
    return null;
  }

  async function _linkResolveOEmbed(url){
    var provider=_linkFindProvider(url);
    if(!provider) return null;
    try{
      var res=await fetch(provider.endpoint+'?format=json&url='+encodeURIComponent(url));
      if(!res.ok) return null;
      var data=await res.json();
      return {title:data.title||null, thumbnail_url:data.thumbnail_url||null, provider_name:data.provider_name||null};
    }catch(e){ console.warn('_linkResolveOEmbed failed:', e); return null; }
  }

  // ideas.text_content doubles as {url, title} JSON for link cards, so no
  // schema change is needed. Falls back to treating the raw string as the
  // URL itself, for resilience against any older/malformed rows.
  function _linkParseText(text){
    try{
      var parsed=JSON.parse(text);
      if(parsed && parsed.url) return {url:parsed.url, title:parsed.title||parsed.url};
    }catch(e){}
    return {url:text||'', title:text||'Link'};
  }

  /* Delegate to the shared data layer (header-data.js) — canonical logic
     lives there now. Kept as thin wrappers here so every existing call
     site in this file (idea capture, board loading) keeps working
     unchanged. Moved out July 11, 2026 during the FOCUS module split. */
  async function _ideaEnsureWishTank(){ return T2TData.ensureWishTank(); }
  async function _sboardEnsureHeaderNamed(name, parentId){ return T2TData.ensureHeaderNamed(name, parentId); }
  async function _sboardTopLevelBoards(){ return T2TData.topLevelBoards(); }
  async function _sboardChildHeaders(parentId){ return T2TData.childHeaders(parentId); }

  function _ideaOpenBoard(boardId){
    _sboardCurrentTopicId=boardId; _sboardFilter=boardId;
    T().nav('s-sea-of-ideas-cluster');
  }

  function _ideaOpenRoot(){
    _sboardCurrentTopicId=null; _sboardFilter=null;
    T().nav('s-sea-of-ideas-cluster');
  }

  // Shrinks any pasted/uploaded image down to a sane max dimension and
  // re-encodes as JPEG before it ever touches Storage. Clipboard pastes in
  // particular tend to be uncompressed PNGs (multi-MB for a single
  // screenshot), and none of our tiles ever show more than a few hundred
  // px across, so there's no reason to store full-resolution originals.
  function _compressImageFile(file, maxDim, quality){
    maxDim=maxDim||1600; quality=quality||0.82;
    return new Promise(function(resolve){
      try{
        var url=URL.createObjectURL(file);
        var img=new Image();
        img.onload=function(){
          try{
            var w=img.naturalWidth, h=img.naturalHeight;
            if(w<=0||h<=0){ URL.revokeObjectURL(url); resolve(file); return; }
            var scale=Math.min(1, maxDim/Math.max(w,h));
            var cw=Math.max(1,Math.round(w*scale)), ch=Math.max(1,Math.round(h*scale));
            var canvas=document.createElement('canvas');
            canvas.width=cw; canvas.height=ch;
            var ctx=canvas.getContext('2d');
            ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,cw,ch); // flattens transparency
            ctx.drawImage(img,0,0,cw,ch);
            canvas.toBlob(function(blob){
              URL.revokeObjectURL(url);
              if(!blob){ resolve(file); return; }
              // Only use the compressed version if it's actually smaller —
              // tiny/simple images can sometimes grow slightly as JPEG.
              if(blob.size>=file.size && scale===1){ resolve(file); return; }
              var newName=(file.name||'image').replace(/\.[^.]+$/,'')+'.jpg';
              resolve(new File([blob], newName, {type:'image/jpeg'}));
            }, 'image/jpeg', quality);
          }catch(e){ URL.revokeObjectURL(url); resolve(file); }
        };
        img.onerror=function(){ URL.revokeObjectURL(url); resolve(file); };
        img.src=url;
      }catch(e){ resolve(file); }
    });
  }

  async function _ideaSaveImageFile(file){
    var box=document.getElementById('ipaste-drop');
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) throw new Error('Not signed in.');
      if(box) box.innerHTML='Compressing\u2026';
      var toUpload=await _compressImageFile(file);
      if(box) box.innerHTML='Uploading\u2026';
      var fname=toUpload.name||file.name||('pasted-image-'+Date.now()+'.jpg');
      var path=user.id+'/'+Date.now()+'-'+fname.replace(/[^a-zA-Z0-9._-]/g,'_');
      var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
      if(up.error) throw up.error;
      var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
      var url=pub.data && pub.data.publicUrl;
      if(!url) throw new Error('No public URL returned.');
      _pastePendingUrl=null; _pastePendingFile=null;
      await _ideaSaveCard(url);
    }catch(e){
      console.error('_ideaSaveImageFile error:', e);
      if(box) box.innerHTML='Upload failed \u2014 '+(e.message||'try again')+'<br>(Ctrl/Cmd + V)';
    }
  }

  // In Idea Session mode, the ladder (PARENT/TOPIC/HEADER) is the target,
  // not the old 9210 dropdowns — this only applies while that screen is
  // actually on screen, so an idle _isxPath from a previous visit never
  // steals a save that's genuinely happening on the legacy 9210 screen.
  function _isxActive(){
    var s=document.getElementById('s-idea-session');
    return !!(s && s.classList.contains('active') && _isxPath);
  }

  async function _ideaSaveCard(imageUrl){
    var sessionMode=_isxActive();
    var headerId, headerLabel, boardId, text;
    if(sessionMode){
      headerId=_isxCurrentClusterId(); headerLabel=_isxHeaderLabel; boardId=_isxPath[0].id;
      var isxTa=document.getElementById('isx-idea-text');
      text=(isxTa?isxTa.value:'').trim();
    } else {
      var boardSel=document.getElementById('ic-storyboard');
      var headerSel=document.getElementById('ic-header');
      headerId=headerSel?headerSel.value:null;
      headerLabel=(headerSel && headerSel.selectedIndex>=0 && headerSel.options[headerSel.selectedIndex])
        ? headerSel.options[headerSel.selectedIndex].text : 'NEW';
      boardId=boardSel?boardSel.value:null;
      var ta=document.getElementById('idea-text');
      text=(ta?ta.value:_ideaDraftText).trim();
    }
    if(!text && !imageUrl) return;
    var savedOk=false, saveErr=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){
        saveErr='Not signed in.';
      } else {
        var contentType = imageUrl ? 'image' : 'text';
        if(!imageUrl && sessionMode && (_isxIdeaMode==='header' || _sboardIsAutoHeaderText(text))) contentType='header';
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type: contentType,
          text_content: text||null,
          image_url: imageUrl||null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        }).select().single();
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_ideaSaveCard insert error:', ins.error); }
        else savedOk=true;
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_ideaSaveCard exception:', e); }

    if(sessionMode){
      if(savedOk){
        _isxCount++;
        if(contentType==='header'){
          // Refresh the ladder so the new header shows up as a pickable
          // option, but do NOT move the traveler into it — where a capture
          // lands is always a deliberate choice via the toggle/dropdown,
          // never a side effect of creating a header.
          await _isxRenderLadder();
        }
        _isxRenderBoard();
        _isxResetIdeaPanelForNext(contentType==='header');
      } else {
        var isxTa2=document.getElementById('isx-idea-text');
        var errBox=document.querySelector('#isx-popup-layer .isx-pcard');
        if(errBox){
          var errEl=document.createElement('div');
          errEl.style.cssText='color:#A32D2D;font-size:11px;text-align:center;margin-top:6px';
          errEl.textContent='Save failed: '+(saveErr||'unknown error');
          errBox.appendChild(errEl);
        }
      }
      return;
    }

    var ta3=document.getElementById('idea-text');
    if(ta3) ta3.value='';
    _ideaDraftText=''; _pastePendingUrl=null; _linkPendingUrl=null;
    T().nav('s-idea-capture');
    var status=document.getElementById('idea-status');
    if(!status) return;
    if(!savedOk){
      status.textContent='Save failed: '+(saveErr||'unknown error');
      setTimeout(function(){ if(status) status.textContent=''; }, 6000);
      return;
    }
    // Confirms where it actually landed, with a way to go look — otherwise
    // there's no visual proof the card made it into the header you picked,
    // since this screen resets for the next idea rather than showing the board.
    status.innerHTML='Saved to '+headerLabel+'. <span id="idea-status-view" style="text-decoration:underline;cursor:pointer;color:#5b9bd5;font-weight:600">View it →</span>';
    var viewLink=document.getElementById('idea-status-view');
    if(viewLink && boardId && boardId!=='__new__'){
      viewLink.addEventListener('click', function(){ _ideaOpenBoard(boardId); });
    }
    setTimeout(function(){ if(status) status.innerHTML=''; }, 6000);
  }

  async function renderIdeaCapture(){
    var boardSel=document.getElementById('ic-storyboard');
    var headerSel=document.getElementById('ic-header');
    if(!boardSel||!headerSel) return;

    var wishTankId=null, boards=[], loadError=false, errorDetail='';
    try{
      var wtResult=await _ideaEnsureWishTank();
      wishTankId=wtResult.id;
      if(wtResult.error){ loadError=true; errorDetail=wtResult.error; }
      boards=await _sboardTopLevelBoards();
    }catch(e){ console.warn('renderIdeaCapture board load failed:', e); loadError=true; errorDetail=(e&&e.message)?e.message:String(e); }

    var statusEl=document.getElementById('ic-board-status');
    if(statusEl) statusEl.textContent = loadError
      ? ("Couldn't load boards: " + errorDetail)
      : '';

    if(wishTankId && !boards.some(function(b){return String(b.id)===String(wishTankId);})){
      boards.push({id:wishTankId, text_content:'Wish Tank'});
    }
    boards.sort(function(a,b){
      if(String(a.id)===String(wishTankId)) return -1;
      if(String(b.id)===String(wishTankId)) return 1;
      return (a.text_content||'').localeCompare(b.text_content||'');
    });
    boardSel.innerHTML=boards.map(function(b){ return '<option value="'+b.id+'">'+b.text_content+'</option>'; }).join('')
      +'<option value="__new__">+ Create new board</option>';

    var defaultBoardId=(_ideaCaptureCtx&&_ideaCaptureCtx.boardId)?_ideaCaptureCtx.boardId:wishTankId;
    if(defaultBoardId) boardSel.value=defaultBoardId;
    if(boardSel.selectedIndex===-1 && boardSel.options.length>1) boardSel.selectedIndex=0;

    async function refreshHeaders(){
      var boardId=boardSel.value;
      if(boardId==='__new__' || !boardId) return;
      var children=[];
      try{
        children=await _sboardChildHeaders(boardId);
      }catch(e){ console.warn('refreshHeaders failed:', e); }
      children.sort(function(a,b){ return (a.text_content||'').localeCompare(b.text_content||''); });
      var opts='<option value="'+boardId+'">NEW</option>';
      opts+=children.map(function(c){ return '<option value="'+c.id+'">'+c.text_content+'</option>'; }).join('');
      opts+='<option value="__new__">+ Create new header</option>';
      headerSel.innerHTML=opts;
      var defaultHeaderId=(_ideaCaptureCtx&&String(_ideaCaptureCtx.boardId)===String(boardId)&&_ideaCaptureCtx.headerId)?_ideaCaptureCtx.headerId:boardId;
      if(defaultHeaderId) headerSel.value=defaultHeaderId;
      if(headerSel.selectedIndex===-1 && headerSel.options.length>1) headerSel.selectedIndex=0;
    }
    await refreshHeaders();
    _ideaCaptureCtx=null;

    if(!_ideaWired){
      _ideaWired=true;
      boardSel.addEventListener('change', async function(){
        if(this.value==='__new__'){
          var name=prompt('Name your new storyboard:');
          if(name){
            var _sb=T().sb;
            var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
            var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,created_at:new Date().toISOString()}).select().single();
            await renderIdeaCapture();
            if(ins.data) boardSel.value=ins.data.id;
          }
        }
        await refreshHeaders();
      });
      headerSel.addEventListener('change', async function(){
        if(this.value==='__new__'){
          var name=prompt('Name your new header:');
          if(name){
            var _sb=T().sb;
            var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
            var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:boardSel.value,created_at:new Date().toISOString()}).select().single();
            await refreshHeaders();
            if(ins.data) headerSel.value=ins.data.id;
          } else { await refreshHeaders(); }
        }
      });
      T().wire('b-icap-close', function(){
        if(_ideaReturnToBoard){
          _sboardCurrentTopicId=_ideaReturnBoardId; _sboardFilter=_ideaReturnBoardId;
          _ideaReturnToBoard=false;
          T().nav('s-sea-of-ideas-cluster');
        } else {
          T().returnToMG();
        }
      });
      T().wire('ic-peek-board', function(){
        if(boardSel.value && boardSel.value!=='__new__') _ideaOpenBoard(boardSel.value);
        else _ideaOpenRoot();
      });
      T().wire('ic-peek-header', function(){
        if(boardSel.value && boardSel.value!=='__new__') _ideaOpenBoard(boardSel.value);
        else _ideaOpenRoot();
      });
      T().wire('ic-btn-theme', function(){ T().nav('s-idea-theme'); });
      T().wire('ic-btn-paste', function(){ T().nav('s-idea-paste'); });
      T().wire('ic-btn-link', function(){ T().nav('s-idea-link'); });
      T().wire('ic-btn-custom', function(){ T().nav('s-idea-custom'); });
      var ta=document.getElementById('idea-text');
      if(ta){
        ta.addEventListener('input', function(){ _ideaDraftText=this.value; });
        ta.addEventListener('keydown', function(e){
          if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _ideaSaveCard(null); }
        });
      }
      T().wire('b-save-idea', function(){ _ideaSaveCard(null); });
    }
  }

  async function renderIdeaTheme(){
    var grid=document.getElementById('itheme-grid');
    if(!grid) return;
    grid.innerHTML='<div style="grid-column:1/3;text-align:center;color:#3A6080;font-size:12px">Loading…</div>';
    var UNSPLASH_KEY='ka0gIrtPFZ1o4q4JKnSdaaBH5197-tWnFnZkd-zw3ns';
    var photos=[];
    try{
      for(var i=0;i<4;i++){
        var r=await fetch('https://api.unsplash.com/photos/random?content_filter=high&client_id='+UNSPLASH_KEY);
        if(r.ok){ var d=await r.json(); photos.push(d.urls.regular); }
      }
    }catch(e){}
    if(!photos.length){ grid.innerHTML='<div style="grid-column:1/3;text-align:center;color:#3A6080;font-size:12px">Couldn\u2019t load images. Try again.</div>'; return; }
    grid.innerHTML=photos.map(function(url){
      return '<div class="itheme-tile" data-url="'+url+'" style="position:relative;height:72px;border:2px solid #111;border-radius:10px;overflow:hidden;cursor:pointer"><img src="'+url+'" style="width:100%;height:100%;object-fit:cover;display:block"><div style="position:absolute;bottom:2px;right:4px;font-size:16px">\u{1F90D}</div></div>';
    }).join('');
    document.querySelectorAll('.itheme-tile').forEach(function(tile){
      tile.addEventListener('click', function(){
        document.querySelectorAll('.itheme-tile div').forEach(function(h){ h.textContent='\u{1F90D}'; });
        this.querySelector('div').textContent='\u{1F5A4}';
        grid.setAttribute('data-selected', this.getAttribute('data-url'));
      });
    });
    if(!_themeWired){
      _themeWired=true;
      T().wire('b-itheme-close', function(){ T().nav('s-idea-capture'); });
      T().wire('b-itheme-catch', function(){ var url=grid.getAttribute('data-selected'); if(url) _ideaSaveCard(url); });
    }
  }

  function renderIdeaPaste(){
    var box=document.getElementById('ipaste-drop');
    if(!box) return;
    box.innerHTML=_pastePendingUrl?('<img src="'+_pastePendingUrl+'" style="max-width:100%;max-height:100%;border-radius:8px">'):'Paste an image here<br>(Ctrl/Cmd + V)';
    if(!_pasteWired){
      _pasteWired=true;
      document.addEventListener('paste', function(e){
        var screen=document.getElementById('s-idea-paste');
        if(!screen||!screen.classList.contains('active')) return;
        var items=(e.clipboardData&&e.clipboardData.items)||[];
        for(var i=0;i<items.length;i++){
          if(items[i].type&&items[i].type.indexOf('image/')===0){
            var file=items[i].getAsFile();
            _pastePendingFile=file;
            var reader=new FileReader();
            reader.onload=function(ev){ _pastePendingUrl=ev.target.result; renderIdeaPaste(); };
            reader.readAsDataURL(file);
            break;
          }
        }
      });
      T().wire('b-ipaste-close', function(){ _pastePendingUrl=null; _pastePendingFile=null; T().nav('s-idea-capture'); });
      T().wire('b-ipaste-attach', function(){
        if(!_pastePendingFile) return;
        var box=document.getElementById('ipaste-drop');
        if(box) box.innerHTML='Uploading\u2026';
        _ideaSaveImageFile(_pastePendingFile);
      });
    }
  }

  function renderIdeaLink(){
    var preview=document.getElementById('ilink-preview');
    if(preview) preview.innerHTML=_linkPendingThumb
      ? ('<img src="'+_linkPendingThumb+'" style="max-width:100%;max-height:90px;border-radius:8px;object-fit:contain;display:block;margin:0 auto 4px">'
         +'<div style="font-size:10px;color:#3A6080;word-break:break-word">'+(_linkPendingTitle||_linkPendingUrl||'')+'</div>')
      : (_linkPendingUrl?('Ready to attach: '+_linkPendingUrl+' (no preview available)'):'Preview appears here once the link resolves');
    if(!_linkWired){
      _linkWired=true;
      T().wire('b-ilink-close', function(){ _linkPendingUrl=null; _linkPendingThumb=null; _linkPendingTitle=null; T().nav('s-idea-capture'); });
      var input=document.getElementById('ilink-url');
      if(input) input.addEventListener('input', function(){
        var val=this.value.trim();
        _linkPendingUrl=val; _linkPendingThumb=null; _linkPendingTitle=null;
        if(_linkResolveTimer) clearTimeout(_linkResolveTimer);
        if(!val){ renderIdeaLink(); return; }
        if(preview) preview.textContent='Resolving\u2026';
        _linkResolveTimer=setTimeout(async function(){
          var meta=await _linkResolveOEmbed(val);
          if(_linkPendingUrl!==val) return; // url changed while we were resolving
          if(meta){ _linkPendingThumb=meta.thumbnail_url; _linkPendingTitle=meta.title; }
          renderIdeaLink();
        }, 500);
      });
      T().wire('b-ilink-attach', function(){
        if(_linkPendingUrl) _ideaSaveLinkCard(_linkPendingUrl, _linkPendingThumb, _linkPendingTitle);
      });
    }
  }

  async function _ideaSaveLinkCard(url, thumb, title){
    var sessionMode=_isxActive();
    var headerId, headerLabel, boardId;
    if(sessionMode){
      headerId=_isxCurrentClusterId(); headerLabel=_isxHeaderLabel; boardId=_isxPath[0].id;
    } else {
      var boardSel=document.getElementById('ic-storyboard');
      var headerSel=document.getElementById('ic-header');
      headerId=headerSel?headerSel.value:null;
      headerLabel=(headerSel && headerSel.selectedIndex>=0 && headerSel.options[headerSel.selectedIndex])
        ? headerSel.options[headerSel.selectedIndex].text : 'NEW';
      boardId=boardSel?boardSel.value:null;
    }
    var savedOk=false, saveErr=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ saveErr='Not signed in.'; }
      else{
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type:'link',
          text_content: JSON.stringify({url:url, title:title||url}),
          image_url: thumb||null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        });
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_ideaSaveLinkCard insert error:', ins.error); }
        else savedOk=true;
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_ideaSaveLinkCard exception:', e); }

    if(sessionMode){
      if(savedOk){ _isxClosePopup(); _isxCount++; _isxRenderBoard(); }
      else{
        var errBox=document.querySelector('#isx-popup-layer .isx-pcard');
        if(errBox){
          var errEl=document.createElement('div');
          errEl.style.cssText='color:#A32D2D;font-size:11px;text-align:center;margin-top:6px';
          errEl.textContent='Save failed: '+(saveErr||'unknown error');
          errBox.appendChild(errEl);
        }
      }
      return;
    }

    _linkPendingUrl=null; _linkPendingThumb=null; _linkPendingTitle=null;
    T().nav('s-idea-capture');
    var status=document.getElementById('idea-status');
    if(!status) return;
    if(!savedOk){
      status.textContent='Save failed: '+(saveErr||'unknown error');
      setTimeout(function(){ if(status) status.textContent=''; }, 6000);
      return;
    }
    status.innerHTML='Saved to '+headerLabel+'. <span id="idea-status-view" style="text-decoration:underline;cursor:pointer;color:#5b9bd5;font-weight:600">View it \u2192</span>';
    var viewLink=document.getElementById('idea-status-view');
    if(viewLink && boardId && boardId!=='__new__'){
      viewLink.addEventListener('click', function(){ _ideaOpenBoard(boardId); });
    }
    setTimeout(function(){ if(status) status.innerHTML=''; }, 6000);
  }

  function renderIdeaCustom(){
    var box=document.getElementById('icustom-preview');
    if(box) box.textContent='Generated image appears here';
    if(!_customWired){
      _customWired=true;
      T().wire('b-icustom-close', function(){ T().nav('s-idea-capture'); });
      T().wire('b-icustom-generate', function(){
        var b=document.getElementById('icustom-preview');
        if(b) b.textContent='Custom AI image generation isn\u2019t wired up yet \u2014 needs an image-gen API connected.';
      });
      T().wire('b-icustom-use', function(){
        var b=document.getElementById('icustom-preview');
        if(b) b.textContent='Nothing generated yet \u2014 tap Generate first.';
      });
    }
  }

  function wireIdeaCaptureFamily(){
    T().registerScreenActivate('s-idea-capture', renderIdeaCapture);
    T().registerScreenActivate('s-idea-theme', renderIdeaTheme);
    T().registerScreenActivate('s-idea-paste', renderIdeaPaste);
    T().registerScreenActivate('s-idea-link', renderIdeaLink);
    T().registerScreenActivate('s-idea-custom', renderIdeaCustom);
    T().registerScreenActivate('s-idea-session', renderIdeaSession);
  }

  /* ============================================================
     IDEA SESSION (9215) — Logged July 8, 2026.
     Replaces 9210 as the default CREATE-mode entry point. Same
     `ideas` table, same cluster_id targeting, same save functions
     (_ideaSaveCard / _ideaSaveLinkCard / _ideaSaveImageFile) as the
     legacy 9210-9214 family — this screen is a new front end on top
     of proven, already-working save logic, not a parallel system.

     PARENT / TOPIC / HEADER ladder: any header can become a Topic
     ("View as Topic" — same verb, works from HEADER to descend or
     from PARENT to climb back up). At the project apex there is no
     PARENT, but the slot is always rendered (blank), never removed,
     so the toolbar's shape stays identical whether you're deep in a
     Topic or sitting at the top — this is what lets CREATE and SHAPE
     (once built) share one "where am I" position.

     HEADER always defaults to New (= the current Topic's own id as
     cluster_id, the existing NEW convention) — leaving it
     alone or explicitly choosing New are the same save target.

     Legacy 9210-9214 screens are left completely intact and still
     reachable (s-idea's "Add an Idea" trivia link, and as a fallback
     if window.T2TSea.openIdeaCapture is ever unavailable) — nothing
     about them is removed by this addition.
     ============================================================ */

  var _isxPath = null;          // [{id,text}] apex .. current Topic
  var _isxHeaderId = null;      // null = New (defaults to current Topic's own id)
  var _isxHeaderLabel = 'New';
  var _isxCount = 0;
  var _isxIdeaMode = 'idea';    // 9211 toggle: 'idea' or 'header' (manual override)
  var _isxStart = null;
  var _isxWired = false;
  var _isxExpanded = {};        // compass: which collapsed sibling groups were opened
  var _isxImgTab = 'paste';
  var _isxImgPendingUrl = null;
  var _isxImgPendingFile = null;
  var _isxLinkPendingUrl = null;
  var _isxLinkPendingThumb = null;
  var _isxLinkPendingTitle = null;
  var _isxLinkTimer = null;

  function _isxCurrentTopicId(){ return _isxPath && _isxPath.length ? _isxPath[_isxPath.length-1].id : null; }
  function _isxCurrentClusterId(){ return _isxHeaderId || _isxCurrentTopicId(); }
  function _isxLocationLabel(){
    if(!_isxPath) return '';
    return _isxPath.map(function(p){return p.text;}).join(' \u203a ')+' \u2014 '+_isxHeaderLabel;
  }

  // 9711 lock (July 13, 2026): no Header rung on this screen at all — every
  // save targets the current Topic's own NEW/Ideas bucket. _isxHeaderId is
  // kept as a variable only because _isxCurrentClusterId() reads it, but it
  // is now permanently null; the old dropdown/"View as Topic"-from-Header
  // mechanism that used to set it has been removed below.
  async function _isxPersistLastTopic(){
    try{
      if(window.T2TData && window.T2TData.setLastInputTopic && _isxPath && _isxPath.length){
        await window.T2TData.setLastInputTopic(_isxPath[0].id, _isxCurrentTopicId());
      }
    }catch(e){ console.warn('Persist last Input topic failed:', e); }
  }

  async function _isxInit(ctx){
    if(!_isxPath){
      var wt=await _ideaEnsureWishTank();
      if(!wt || !wt.id){
        // Wish Tank lookup failed (auth/Supabase not ready yet) — retry once
        // after a short delay rather than silently proceeding with a null id,
        // which was creating orphaned root-level Purpose/MISC/NEW headers.
        await new Promise(function(r){ setTimeout(r,400); });
        wt=await _ideaEnsureWishTank();
      }
      if(!wt || !wt.id){
        console.error('Idea capture: Wish Tank unavailable, aborting init', wt&&wt.error);
        throw new Error('Wish Tank unavailable: '+(wt&&wt.error?wt.error:'unknown'));
      }
      _isxPath=[{id:wt.id, text:'Wish Tank'}];
      // Sticky state, manual reset only (locked July 13, 2026) — resume
      // wherever this project's Input was last pointed, rather than always
      // reopening at the project apex. Only applies to the plain 💡
      // shortcut (no explicit ctx.boardId passed in).
      if(!ctx || !ctx.boardId){
        try{
          if(window.T2TData && window.T2TData.getLastInputTopic && window.T2TData.ancestorChain){
            var lastId=await window.T2TData.getLastInputTopic(wt.id);
            if(lastId){
              var chain=await window.T2TData.ancestorChain(lastId);
              if(chain && chain.length) _isxPath=chain;
            }
          }
        }catch(e){ console.warn('Resume last Input topic failed:', e); }
      }
    }
    if(ctx && ctx.boardId){
      var boards=await _sboardTopLevelBoards();
      var match=boards.filter(function(b){ return String(b.id)===String(ctx.boardId); })[0];
      _isxPath=[{id:ctx.boardId, text: match?match.text_content:'Board'}];
    }
    _isxHeaderId = null;
    _isxHeaderLabel='New';
    if(!_isxStart) _isxStart=Date.now();
  }

  async function renderIdeaSession(){
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.add('isx-full');
    if(!_isxPath){
      try{
        await _isxInit(_ideaCaptureCtx);
      }catch(e){
        console.error('renderIdeaSession init failed', e);
        if(fgr){
          var err=document.createElement('div');
          err.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;background:#5a1a1a;color:#fff;font-size:12px;padding:8px 12px;border-radius:8px;z-index:9999';
          err.textContent='Could not open ISB — try again in a moment.';
          fgr.appendChild(err);
          setTimeout(function(){ err.remove(); }, 4000);
        }
        T().returnToMG();
        return;
      }
    }
    _ideaCaptureCtx=null;
    await _isxRenderLadder();
    await _isxRenderBoard();
    if(!_isxWired){
      _isxWired=true;
      T().wire('isx-idea-btn', _isxOpenIdeaPanel);
      T().wire('isx-recolor-btn', _isxOpenRecolorAll);
      T().wire('isx-rules-btn', _isxOpenRulesPanel);
      T().wire('isx-compass-btn', _isxOpenStoryboardView);
      T().wire('isx-end-btn', function(){
        var fgr=document.getElementById('fg-root');
        if(fgr) fgr.classList.remove('isx-full');
        if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
        T().returnToMG();
      });
      // PROJECT — July 14, 2026: was display-only/inert on this screen;
      // now a real lateral jump between top-level projects, same intent
      // as 9710's own PROJECT chrome, but isx-scoped (updates _isxPath,
      // not _sboardCurrentTopicId) since 9710's openProjectSwitcher()
      // is hardwired to Storyboard-only state.
      T().wire('isx-project-hit', _isxOpenProjectSwitcher);
      var board=document.getElementById('isx-board');
      if(board) board.addEventListener('dblclick', function(e){
        if(e.target.closest('.isx-tile')) return;
        var rect=board.getBoundingClientRect();
        _isxOpenColorPicker(e.clientX-rect.left, e.clientY-rect.top);
      });
      // Click the backdrop (not the card itself) closes the popup — same
      // result as its own ✕. Covers the Idea Input card and every other
      // popup that uses this shared layer. July 14, 2026.
      var popupLayer=document.getElementById('isx-popup-layer');
      if(popupLayer) popupLayer.addEventListener('click', function(e){
        if(e.target===popupLayer) _isxClosePopup();
      });
    }
  }

  function _isxToggleFullscreen(){
    var el=document.documentElement;
    if(!document.fullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document);
    }
  }

  function _isxShowError(msg){
    var board=document.getElementById('isx-board');
    if(!board) return;
    var banner=document.getElementById('isx-error-banner');
    if(!banner){
      banner=document.createElement('div');
      banner.id='isx-error-banner';
      banner.style.cssText='position:absolute;top:14px;left:16px;right:260px;background:#fff3f3;border:2px solid #A32D2D;'
        +'color:#A32D2D;font-size:11px;padding:8px 12px;border-radius:8px;z-index:22;box-shadow:0 2px 6px rgba(0,0,0,.15)';
      board.appendChild(banner);
    }
    banner.textContent=msg;
    banner.style.display='block';
    clearTimeout(banner._isxTimer);
    banner._isxTimer=setTimeout(function(){ banner.style.display='none'; }, 8000);
  }

  async function _isxRenderLadder(){
   try{
    var projectLabel=document.getElementById('isx-project-label');
    var parentHit=document.getElementById('isx-parent-hit');
    var parentLabel=document.getElementById('isx-parent-label');
    var topicBox=document.getElementById('isx-topic-box');
    if(!projectLabel||!parentHit||!parentLabel||!topicBox) return;

    // PROJECT — fixed anchor, display only. Switching projects entirely is
    // FOCUS's job (reopen via 💡), same division of labor as everywhere else.
    projectLabel.textContent=_isxPath[0].text;

    // PARENT — one level above TOPIC, click to climb back exactly one level.
    // Blank/inert only when TOPIC === PROJECT (nothing above yet).
    if(_isxPath.length>1){
      parentLabel.textContent=_isxPath[_isxPath.length-2].text;
      parentHit.classList.remove('inert');
      parentHit.onclick=function(){
        _isxPath.pop(); _isxHeaderId=null; _isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
      };
    } else {
      parentLabel.textContent='\u2014';
      parentHit.classList.add('inert');
      parentHit.onclick=null;
    }

    // TOPIC — current position, large centered pill, matches 9710's own
    // #sc-topic-box treatment exactly (same class, same look).
    topicBox.textContent=_isxPath[_isxPath.length-1].text;

    // 9711 lock, July 13, 2026: Header rung removed entirely — every save
    // targets this Topic's own NEW/Ideas bucket (_isxHeaderId stays null
    // permanently, see _isxInit). Moving an *existing* idea to a different
    // Header is DETAILS-card-back's job now, not this screen's.
   }catch(e){
     console.error('_isxRenderLadder failed:', e);
     _isxShowError('Something went wrong loading this level: '+(e&&e.message?e.message:String(e)));
   }
  }

  // isx-scoped PROJECT switcher — July 14, 2026. Same UI/UX pattern as
  // 9710's openProjectSwitcher(), but drives _isxPath directly instead of
  // _sboardCurrentTopicId/_sboardDrillInto, so it's safe to open from this
  // screen (9711) without touching Storyboard-only state.
  async function _isxOpenProjectSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var boards=await _sboardTopLevelBoards();
    boards=boards.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var currentProjectId=(_isxPath && _isxPath.length) ? _isxPath[0].id : null;
    var rows=boards.map(function(b){
      var cur=String(b.id)===String(currentProjectId)?' current':'';
      return '<div class="sb-hdr-vitem'+cur+'" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
    }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">Switch Project</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Start a new project</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-proj-new-input" type="text" placeholder="Project name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-proj-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-proj-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-proj-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
      row.addEventListener('click', function(){
        var pid=row.getAttribute('data-pid');
        var boardRow=boards.find(function(b){ return String(b.id)===String(pid); });
        closeSbDetail();
        if(boardRow){
          _isxPath=[{id:boardRow.id, text:boardRow.text_content||'(untitled)'}];
          _isxHeaderId=null; _isxHeaderLabel='New';
          _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
        }
      });
    });
    T().wire('sb-proj-cancel', closeSbDetail);
    T().wire('sb-proj-new-go', async function(){
      var errEl=document.getElementById('sb-proj-err');
      var nameInput=document.getElementById('sb-proj-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        closeSbDetail();
        _isxPath=[{id:ins.data.id, text:ins.data.text_content}];
        _isxHeaderId=null; _isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  var _isxCardPos = {}; // session-only manual drag positions, keyed by idea row id
  var _isxColorSwatches = ['#e4e0d8','#fdf6e8','#eaf4ff','#eafaf0','#fdeaea','#f5eaff','#fff3d6','#e8f0f5'];

  // Recolor all headers on THIS Topic in one click — same idea as 9710's
  // own 🎨 (_sboardOpenRecolorAll), but computes its own header-id list
  // fresh from the current clusterId rather than reading 9710's globals
  // (_sboardVisibleHeaders etc.), which may be stale or scoped to a
  // different Topic if 9710 hasn't been opened this session. Covers every
  // content subheader plus MISC; Trash is excluded — it's a global bucket,
  // not "on this board" — matching 9710's own exclusion. July 14, 2026.
  async function _isxOpenRecolorAll(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var clusterId=_isxCurrentClusterId();
    if(!clusterId) return;
    var _sb=T().sb;
    try{
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) throw new Error('Not signed in.');
      var miscId=await _sboardEnsureMiscHeader(clusterId);
      var res=await _sb.from('ideas').select('id,text_content')
        .eq('user_id',user.id).eq('cluster_id',clusterId).eq('content_type','header');
      if(res.error) throw res.error;
      var excludedNames=['Purpose','NEW','New Additions'];
      var ids=(res.data||[]).filter(function(r){ return excludedNames.indexOf(r.text_content)===-1; })
        .map(function(r){ return r.id; }).concat(miscId?[miscId]:[]);
      var uniq=ids.filter(function(id,idx){ return ids.indexOf(id)===idx; });
      var swatches=_isxColorSwatches.map(function(c){
        return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer"></button>';
      }).join('');
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all headers</div>'
        +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:10px">Pick one — every header on this Topic, including MISC, gets it.</div>'
        +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+swatches+'</div>'
        +'<button class="sc-ov-btn" id="isx-recolor-close" style="width:100%">Cancel</button>'
        +'</div>';
      ov.classList.add('active');
      T().wire('isx-recolor-close', closeSbDetail);
      ov.querySelectorAll('.sb-swatch').forEach(function(sw){
        sw.onclick=async function(){
          var c=sw.getAttribute('data-c');
          try{
            for(var i=0;i<uniq.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',uniq[i]); }
          }catch(e){}
          closeSbDetail();
          _isxRenderBoard();
        };
      });
    }catch(err){ _isxShowError('Couldn\u2019t load headers to recolor: '+(err&&err.message?err.message:String(err))); }
  }

  async function _isxLoadTopicColor(){
    var board=document.getElementById('isx-board');
    if(!board) return;
    board.style.backgroundColor='';
    try{
      var _sb=T().sb;
      var res=await _sb.from('ideas').select('color').eq('id',_isxCurrentTopicId()).single();
      if(res.data && res.data.color) board.style.backgroundColor=res.data.color;
    }catch(e){ /* no color set yet — leave default */ }
  }

  async function _isxRenderBoard(){
    var canvas=document.getElementById('isx-canvas');
    var empty=document.getElementById('isx-empty');
    if(!canvas) return;
    canvas.innerHTML='';
    if(empty) canvas.appendChild(empty);
    _isxLoadTopicColor();
    var clusterId=_isxCurrentClusterId();
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user||!clusterId) return;

      // MISC is per-Topic (same ensure-call 9710 uses); Trash is a single
      // global bucket for the whole account. Both are always shown, even
      // empty — permanent slots at the end of the header row, not
      // something that only appears once it has content. July 14, 2026.
      var _ensureResults=await Promise.all([_sboardEnsureMiscHeader(clusterId), _sboardEnsureTrashHeader()]);
      var miscId=_ensureResults[0], trashId=_ensureResults[1];

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,color,cluster_id,heart_count,notes,sort_order,locked')
        .eq('user_id',user.id).eq('cluster_id',clusterId).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(300);
      var excludedNames=['Purpose','NEW','New Additions'];
      var allRows=((res&&res.data)||[]).filter(function(r){
        return r.content_type!=='header' || excludedNames.indexOf(r.text_content)===-1;
      });
      var ideaRows=allRows.filter(function(r){ return r.content_type!=='header'; });
      var contentHeaders=allRows.filter(function(r){ return r.content_type==='header' && String(r.id)!==String(miscId); });
      var miscRow=allRows.find(function(r){ return String(r.id)===String(miscId); }) || await _isxFetchRow(miscId);
      var trashRow=await _isxFetchRow(trashId);

      if(empty) empty.style.display = (ideaRows.length||contentHeaders.length) ? 'none' : 'block';

      // Headers along the top row, same fixed-position idea as 9710's own
      // column headers — left to right in creation order, MISC then Trash
      // pinned at the end. Loose ideas scatter freely in the space below.
      var HEADER_ROW_Y=16, HEADER_TILE_W=112, HEADER_GAP=12;
      var headerRowOrder=contentHeaders.concat(miscRow?[miscRow]:[]).concat(trashRow?[trashRow]:[]);
      headerRowOrder.forEach(function(r, i){
        var icon = String(r.id)===String(trashId) ? '\ud83d\uddd1\ufe0f ' : (String(r.id)===String(miscId) ? '\ud83d\udce6 ' : '');
        canvas.appendChild(_isxMakeHeaderStackTile(r, 16+i*(HEADER_TILE_W+HEADER_GAP), HEADER_ROW_Y, icon));
      });

      var freeTop=HEADER_ROW_Y+66+24; // clear of the header row
      var w=Math.max(canvas.clientWidth,600), h=Math.max(canvas.clientHeight,600+freeTop);
      ideaRows.forEach(function(r){ canvas.appendChild(_isxMakeTile(r, w, h, freeTop)); });
    }catch(e){ console.warn('_isxRenderBoard failed:', e); _isxShowError('Board didn\u2019t load: '+(e&&e.message?e.message:String(e))); }
  }

  function _isxMakeTile(row, w, h, freeTop){
    var t=document.createElement('div');
    t.className='isx-tile';
    t.dataset.isxId=row.id;
    t.dataset.isxType=row.content_type;
    t.dataset.isxLocked=row.locked?'1':'';
    var pos=_isxCardPos[row.id];
    if(!pos){
      // Cache the very first placement, not just drags — otherwise every
      // un-dragged card gets a brand new random spot on every re-render
      // (e.g. right after adding a new idea), which reshuffles the whole
      // board every time instead of only placing the new arrival.
      var top=freeTop||16;
      pos={ x: 16+Math.random()*Math.max(40,w-140), y: top+Math.random()*Math.max(40,h-top-84) };
      _isxCardPos[row.id]=pos;
    }
    t.style.left=Math.round(pos.x)+'px'; t.style.top=Math.round(pos.y)+'px';
    var linkUrl=null;
    if(row.content_type==='image'){
      t.innerHTML='<img src="'+row.image_url+'" style="height:52px">';
    } else if(row.content_type==='link'){
      var parsed=_linkParseText(row.text_content);
      linkUrl=parsed.url;
      t.classList.add('isx-link-tile');
      t.innerHTML=(row.image_url?'<img src="'+row.image_url+'" style="height:52px">':'')
        +'<div>\ud83d\udd17 '+(parsed.title||parsed.url)+'</div>';
    } else {
      t.innerHTML='<div>'+(row.text_content||'')+'</div>';
    }
    // Same SHAPING card the Storyboard uses — full-size image view, heart,
    // notes, lock — so a card behaves identically on both screens.
    t.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(row); });
    _isxWireTileDrag(t, row.id, linkUrl, false);
    return t;
  }

  // Header buckets — July 14, 2026: pinned along a fixed top row, like
  // 9710's own column headers, instead of scattered among loose ideas.
  // Same stacked-card look as 9710's _sboardMakeHeaderStackTile (three
  // layered, slightly rotated... actually kept straight here, since a row
  // reads better unrotated), built on the isx mouse-drag system so
  // dragging one onto the TOPIC rung still drills in — but a plain
  // reposition drag snaps back to its row slot on release (pinned=true in
  // _isxWireTileDrag) rather than free-floating like a loose idea. Always
  // a valid drop target for loose ideas (see _isxWireTileDrag). MISC and
  // Trash are the same tile, just permanent slots at the end of the row
  // with an icon prefix — Trash is one single bucket for the whole
  // account (matches 9710), MISC is per-Topic.
  function _isxMakeHeaderStackTile(row, x, y, iconPrefix){
    var t=document.createElement('div');
    t.className='isx-tile isx-stack-tile';
    t.dataset.isxId=row.id;
    t.dataset.isxType=row.content_type;
    t.dataset.isxLocked=row.locked?'1':'';
    t.style.left=Math.round(x)+'px'; t.style.top=Math.round(y)+'px';
    var bg=row.color||'#fff';
    t.innerHTML='<div class="isx-stack-layer" style="top:5px;left:5px;background:'+bg+'"></div>'
      +'<div class="isx-stack-layer" style="top:2.5px;left:2.5px;background:'+bg+'"></div>'
      +'<div class="isx-stack-front" style="background:'+bg+'">'
        +(row.locked?'<div class="isx-stack-lock">\ud83d\udd12</div>':'')
        +'<div>'+(iconPrefix||'')+(row.text_content||'(untitled)')+'</div>'
      +'</div>';
    t.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(row); });
    _isxWireTileDrag(t, row.id, null, true);
    return t;
  }

  // Manual drag, same session-only-cache approach CLUSTER already uses (no
  // dedicated position columns on `ideas` — positions live for the life of
  // this browser session, same as CLUSTER's starburst). A link tile still
  // needs to open on a genuine click; a small movement threshold is what
  // tells a drag apart from a click on the same element.
  function _isxWireTileDrag(tile, rowId, linkUrl, pinned){
    var startX, startY, origLeft, origTop, moved, canvas;
    tile.addEventListener('mousedown', function(e){
      e.preventDefault();
      canvas=tile.parentElement;
      var board=document.getElementById('isx-board');
      startX=e.clientX; startY=e.clientY; moved=false;
      origLeft=parseFloat(tile.style.left)||0; origTop=parseFloat(tile.style.top)||0;
      var startScrollLeft=board?board.scrollLeft:0, startScrollTop=board?board.scrollTop:0;
      // Sliding-window navigation, added July 12, 2026 — the same free-drag gesture
      // used for repositioning a card on the canvas also doubles as a way to
      // shift the ladder: release over the Topic rung to recenter directly
      // onto this card (Subber -> Topic in one move), or over the Header
      // rung to promote it and select it as the current Header target
      // (Subber -> Header, staying on the same Topic). Only the Topic and
      // Header rungs are live drop targets for now — the Parent rung stays
      // click-only (its own "View as Topic" climb-back button) until a
      // longer jump like that gets its own design pass.
      // Sliding-window navigation, added July 12, 2026 — the same free-drag gesture
      // used for repositioning a card on the canvas also doubles as a way to
      // recenter the ladder directly onto this card by dropping it on the
      // TOPIC box (Subber -> Topic in one move). The old Header-rung drop
      // target was removed July 13, 2026 along with the Header rung itself
      // (no bucket selection lives on this screen anymore) — moving a card
      // to a specific Header is DETAILS-card-back's job now.
      var topicRungEl=document.getElementById('isx-topic-box');
      function overEl(el, ev){
        if(!el) return false;
        var r=el.getBoundingClientRect();
        return ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top && ev.clientY<=r.bottom;
      }
      // Drop-onto-another-tile — July 14, 2026. Dropping a loose idea onto
      // an existing header stack moves it there directly (no prompt, it
      // already has a home). Dropping it onto another loose idea groups
      // them: the target becomes a header (name optional — see
      // _isxOfferStackName) and the dragged card nests under it. Locked
      // tiles and the tile being dragged itself are never valid targets.
      function findTileTarget(ev){
        var tiles=canvas.querySelectorAll('.isx-tile');
        for(var i=0;i<tiles.length;i++){
          var el=tiles[i];
          if(el===tile || el.dataset.isxLocked) continue;
          if(overEl(el, ev)) return el;
        }
        return null;
      }
      function clearRungHighlights(){
        if(topicRungEl) topicRungEl.classList.remove('isx-rung-dropready');
        canvas.querySelectorAll('.isx-tile-dropready').forEach(function(el){ el.classList.remove('isx-tile-dropready'); });
      }
      // Edge auto-scroll — July 14, 2026. #isx-board is the scroll
      // container; the header row (MISC/Trash pinned at the end) can sit
      // well off-screen on a Topic with several headers, so dragging a
      // card toward the edge needs to scroll to reach it, same as 9710's
      // own edge-scroll on its board-wrap.
      var EDGE=56, MAXSPEED=16;
      function edgeScroll(ev){
        if(!board) return;
        var r=board.getBoundingClientRect();
        var x=ev.clientX, y=ev.clientY;
        if(x>=r.left && x<=r.right){
          if(x-r.left<EDGE) board.scrollLeft-=MAXSPEED*(1-(x-r.left)/EDGE);
          else if(r.right-x<EDGE) board.scrollLeft+=MAXSPEED*(1-(r.right-x)/EDGE);
        }
        if(y>=r.top && y<=r.bottom){
          if(y-r.top<EDGE) board.scrollTop-=MAXSPEED*(1-(y-r.top)/EDGE);
          else if(r.bottom-y<EDGE) board.scrollTop+=MAXSPEED*(1-(r.bottom-y)/EDGE);
        }
      }
      function onMove(ev){
        edgeScroll(ev);
        // Compensate for however much the board has auto-scrolled since
        // mousedown, or the tile drifts from the cursor as soon as
        // edgeScroll kicks in — raw client-coordinate delta alone stops
        // matching canvas-local position the moment the container scrolls
        // underneath a fixed cursor position.
        var scrollDx=board?(board.scrollLeft-startScrollLeft):0;
        var scrollDy=board?(board.scrollTop-startScrollTop):0;
        var dx=(ev.clientX-startX)+scrollDx, dy=(ev.clientY-startY)+scrollDy;
        if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
        tile.style.left=Math.round(origLeft+dx)+'px';
        tile.style.top=Math.round(origTop+dy)+'px';
        clearRungHighlights();
        if(moved){
          if(overEl(topicRungEl, ev)) topicRungEl.classList.add('isx-rung-dropready');
          else{ var tgt=findTileTarget(ev); if(tgt) tgt.classList.add('isx-tile-dropready'); }
        }
      }
      function onUp(ev){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        clearRungHighlights();
        var tileTarget = moved ? findTileTarget(ev) : null;
        if(moved && overEl(topicRungEl, ev)){
          _isxPromoteCardToTopic(rowId);
        } else if(moved && tileTarget){
          if(tileTarget.dataset.isxType==='header'){
            delete _isxCardPos[rowId];
            _sboardMoveCard(rowId, tileTarget.dataset.isxId);
          } else {
            _isxFetchRow(tileTarget.dataset.isxId).then(function(targetRow){
              if(targetRow) _isxOfferStackName(rowId, targetRow);
            });
          }
        } else if(moved){
          if(pinned){ _isxRenderBoard(); } // snap back to its fixed row slot
          else{ _isxCardPos[rowId]={x:parseFloat(tile.style.left), y:parseFloat(tile.style.top)}; }
        } else if(linkUrl){
          window.open(linkUrl, '_blank', 'noopener');
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Drop one loose idea onto another — groups them by promoting the target
  // to a header. Naming is optional (Larry, July 14, 2026): Save renames
  // the new header, Skip/blank keeps the target's own existing text as the
  // header name — there is no "cancel and stay loose" path here, unlike
  // CLUSTER's own _clusterOfferStack, which forces a name or nothing
  // happens at all. Renaming later is always available via DETAILS.
  function _isxOfferStackName(draggedId, targetRow){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var targetName=targetRow.text_content||'(untitled)';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:4px">Name this cluster</div>'
      +'<div style="font-size:11px;color:#7a6040;font-style:italic;margin-bottom:10px">Skip to keep \u201c'+targetName+'\u201d as the header name \u2014 rename anytime from DETAILS.</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">HEADER:</label>'
      +'<input id="isx-stack-name" type="text" placeholder="'+targetName+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:10px;box-sizing:border-box">'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="isx-stack-save" style="flex:1">Save</button><button class="sc-ov-btn" id="isx-stack-skip" style="flex:1">Skip</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('isx-stack-name');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    function commit(name){ closeSbDetail(); _isxCommitStackIntoHeader(draggedId, targetRow, name); }
    T().wire('isx-stack-skip', function(){ commit(null); });
    T().wire('isx-stack-save', function(){
      var name=((document.getElementById('isx-stack-name')||{}).value||'').trim();
      commit(name||null);
    });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ document.getElementById('isx-stack-save').click(); }
      else if(e.key==='Escape'){ document.getElementById('isx-stack-skip').click(); }
    });
  }

  async function _isxCommitStackIntoHeader(draggedId, targetRow, name){
    var _sb=T().sb;
    try{
      if(targetRow.content_type!=='header'){
        var updates={content_type:'header'};
        if(name) updates.text_content=name;
        var upd=await _sb.from('ideas').update(updates).eq('id',targetRow.id);
        if(upd.error) throw upd.error;
      } else if(name){
        var upd2=await _sb.from('ideas').update({text_content:name}).eq('id',targetRow.id);
        if(upd2.error) throw upd2.error;
      }
      delete _isxCardPos[draggedId];
      await _sboardMoveCard(draggedId, targetRow.id);
    }catch(err){ _isxShowError('Couldn\u2019t group these: '+(err&&err.message?err.message:String(err))); }
  }

  // Drag-to-Topic: recenters the ladder directly onto a floating card, the
  // same destination as if it had first been promoted to Header and then
  // "View as Topic"d — this just skips the intermediate step. No content_type
  // change needed; a Topic doesn't have to already be a header row (same
  // auto-promotion-is-earned principle the board already uses elsewhere).
  async function _isxPromoteCardToTopic(rowId){
    var row=await _isxFetchRow(rowId);
    if(!row) return;
    delete _isxCardPos[rowId];
    _isxPath.push({id:row.id, text:row.text_content||'(untitled)'});
    _isxHeaderId=null; _isxHeaderLabel='New';
    await _isxRenderLadder();
    await _isxRenderBoard();
    await _isxPersistLastTopic();
  }

  // Drag-to-Header: promotes a floating card to a header row (if it isn't
  // one already) and selects it as the current Header target. Topic doesn't
  // change — this is the one-step version of naming a header then picking
  // it from the dropdown.
  async function _isxPromoteCardToHeader(rowId){
    var row=await _isxFetchRow(rowId);
    if(!row) return;
    if(row.content_type!=='header'){
      var _sb=T().sb;
      try{
        var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id', rowId).select().single();
        if(upd.error) throw upd.error;
        row=upd.data;
      }catch(e){
        _isxShowError('Couldn\u2019t promote to header: '+(e&&e.message?e.message:String(e)));
        return;
      }
    }
    delete _isxCardPos[rowId];
    _isxHeaderId=row.id; _isxHeaderLabel=row.text_content||'(untitled)';
    await _isxRenderLadder();
    await _isxRenderBoard();
  }

  async function _isxFetchRow(rowId){
    var _sb=T().sb;
    try{
      var res=await _sb.from('ideas').select('id,content_type,text_content,cluster_id,image_url,color,locked').eq('id',rowId).single();
      if(res.error) throw res.error;
      return res.data;
    }catch(e){
      _isxShowError('Couldn\u2019t read that card: '+(e&&e.message?e.message:String(e)));
      return null;
    }
  }

  function _isxOpenColorPicker(x, y){
    var board=document.getElementById('isx-board');
    if(!board) return;
    var existing=document.getElementById('isx-color-popup'); if(existing) existing.remove();
    var pop=document.createElement('div');
    pop.className='isx-color-popup'; pop.id='isx-color-popup';
    pop.style.left=x+'px'; pop.style.top=y+'px';
    pop.innerHTML=_isxColorSwatches.map(function(c){ return '<div class="isx-color-swatch" data-color="'+c+'" style="background:'+c+'"></div>'; }).join('');
    board.appendChild(pop);
    pop.querySelectorAll('.isx-color-swatch').forEach(function(sw){
      sw.onclick=async function(){
        var color=sw.getAttribute('data-color');
        board.style.backgroundColor=color;
        pop.remove();
        try{
          var _sb=T().sb;
          await _sb.from('ideas').update({color:color}).eq('id',_isxCurrentTopicId());
        }catch(e){ console.warn('Saving board color failed:', e); }
      };
    });
    setTimeout(function(){
      document.addEventListener('click', function closeOnce(e){
        if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('click', closeOnce); }
      });
    }, 0);
  }

  /* ---- Popups: Idea / Image / Link / Rules / Compass / Recap ---- */
  function _isxOpenPopup(html){
    var layer=document.getElementById('isx-popup-layer');
    if(!layer) return;
    layer.innerHTML=html; layer.classList.add('active');
  }
  function _isxClosePopup(){
    var layer=document.getElementById('isx-popup-layer');
    if(layer){ layer.classList.remove('active'); layer.innerHTML=''; }
  }

  // Lets a traveler drag the whole capture card aside to peek at the
  // shotgun wall underneath — mousedown anywhere on the card EXCEPT an
  // interactive control (text entry, buttons, the image itself) starts
  // the drag. Position is session-only, same as card drag on the board.
  function _isxWirePopupDrag(card){
    if(!card) return;
    var startX, startY, origLeft, origTop, dragging=false;
    card.addEventListener('mousedown', function(e){
      var tag=e.target.tagName;
      if(tag==='TEXTAREA'||tag==='INPUT'||tag==='SELECT'||tag==='BUTTON'||tag==='IMG') return;
      if(e.target.closest('button')) return;
      var rect=card.getBoundingClientRect();
      startX=e.clientX; startY=e.clientY; origLeft=rect.left; origTop=rect.top;
      card.style.position='fixed'; card.style.margin='0';
      card.style.left=origLeft+'px'; card.style.top=origTop+'px';
      dragging=true;
      function onMove(ev){
        if(!dragging) return;
        card.style.left=(origLeft+ev.clientX-startX)+'px';
        card.style.top=(origTop+ev.clientY-startY)+'px';
      }
      function onUp(){
        dragging=false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  var _isxInputPendingImageFile = null; // set by paste or camera; cleared on save, cancel, or reset
  var _isxInputPendingExternalUrl = null; // set by Unsplash pick — an external URL reference, not a file to upload

  // After a successful save, the 9211 popup stays open and resets itself
  // rather than closing — ideas come in bursts, and closing after every
  // single one breaks that rhythm. Header saves get the same treatment,
  // plus a visible confirmation, since a header row never renders as a
  // board tile and would otherwise look like nothing happened.
  function _isxResetIdeaPanelForNext(wasHeader){
    var ta=document.getElementById('isx-idea-text');
    if(!ta){
      // Not the plain Idea panel (Image/Link saves) — keep prior behavior.
      _isxClosePopup();
      return;
    }
    ta.value=''; ta.focus();
    _isxIdeaMode='idea';
    _isxClearPendingImage();
    _isxClearPendingExternalUrl();
    var modeIdeaBtn=document.getElementById('isx-idea-mode-idea');
    var modeHeaderBtn=document.getElementById('isx-idea-mode-header');
    if(modeIdeaBtn) modeIdeaBtn.classList.add('on');
    if(modeHeaderBtn) modeHeaderBtn.classList.remove('on');
    var card=document.querySelector('#isx-popup-layer .isx-pcard');
    if(card){
      var old=card.querySelector('.isx-save-flash'); if(old) old.remove();
      var flash=document.createElement('div');
      flash.className='isx-save-flash';
      flash.style.cssText='color:#2f7a4f;font-size:11px;text-align:center;margin-top:4px';
      flash.textContent = wasHeader ? 'Header added \u2014 add ideas here \u2193' : 'Saved \u2014 keep going';
      card.appendChild(flash);
      setTimeout(function(){ if(flash && flash.parentNode) flash.parentNode.removeChild(flash); }, 2200);
    }
  }

  // 9711 tune-up, July 13, 2026 (revised): a pasted image no longer saves
  // itself instantly — it shows a preview with CANCEL/SAVE, matching the
  // already-locked rule that non-text content gets an explicit save
  // affordance rather than auto-committing (Enter has no natural meaning
  // for a paste, and neither does "it just appears on the board").
  function _isxShowPendingImage(file){
    _isxInputPendingImageFile=file;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      var url=URL.createObjectURL(file);
      preview.innerHTML='<img src="'+url+'" style="max-width:100%;max-height:140px;border-radius:8px;'
        +'display:block;margin:0 auto 8px;object-fit:contain">';
      preview.style.display='block';
    }
  }

  function _isxClearPendingImage(){
    _isxInputPendingImageFile=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }
  }

  var _isxInputPendingLink = null; // {url, title, thumb} — set by paste; cleared on save, cancel, or reset

  // Same preview-then-confirm shape as the image path: show what the
  // link resolves to (or a bare fallback if unresolved) before it
  // becomes a real card. Loading state first, then fills in once
  // _linkResolveOEmbed returns — allowlisted providers only (YouTube,
  // Vimeo, Spotify, SoundCloud, TikTok), same as the dedicated 🔗 panel.
  function _isxShowPendingLink(url){
    _isxInputPendingLink={url:url, title:null, thumb:null};
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      preview.innerHTML='<div style="font-size:10px;color:#7a90a8;text-align:center;padding:10px 0">Looking up this link\u2026</div>';
      preview.style.display='block';
    }
    _linkResolveOEmbed(url).then(function(meta){
      if(!_isxInputPendingLink || _isxInputPendingLink.url!==url) return; // cancelled or replaced meanwhile
      _isxInputPendingLink.title=meta&&meta.title||url;
      _isxInputPendingLink.thumb=meta&&meta.thumbnail_url||null;
      if(!preview) return;
      preview.innerHTML=(_isxInputPendingLink.thumb
          ? '<img src="'+_isxInputPendingLink.thumb+'" style="max-width:100%;max-height:120px;border-radius:8px;display:block;margin:0 auto 6px;object-fit:contain">'
          : '<div style="font-size:28px;text-align:center;margin-bottom:4px">\ud83d\udd17</div>')
        +'<div style="font-size:12px;color:var(--isx-navy);text-align:center;font-weight:600">'+_isxInputPendingLink.title+'</div>'
        +'<div style="font-size:9.5px;color:#7a90a8;text-align:center;word-break:break-word">'+url+'</div>';
    });
  }

  function _isxClearPendingLink(){
    _isxInputPendingLink=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }
  }

  // A single bare URL, nothing else on the line — conservative on
  // purpose, so pasting a sentence that happens to contain a link still
  // just types normally instead of getting hijacked into link mode.
  function _isxIsBareUrl(text){
    return /^https?:\/\/\S+$/i.test((text||'').trim());
  }

  function _isxCommitIdeaPanel(){
    if(_isxInputPendingImageFile){
      var file=_isxInputPendingImageFile;
      var preview=document.getElementById('isx-paste-preview');
      if(preview) preview.insertAdjacentHTML('beforeend','<div style="font-size:10px;color:#5b9bd5;text-align:center">Uploading\u2026</div>');
      _isxInputPendingImageFile=null;
      _ideaSaveImageFile(file);
    } else if(_isxInputPendingLink){
      var pending=_isxInputPendingLink;
      _isxInputPendingLink=null;
      _ideaSaveLinkCard(pending.url, pending.thumb, pending.title).then(function(){
        // _ideaSaveLinkCard closes the popup on success, but leaves it
        // open with an error message on failure — only reopen a fresh
        // panel in the success case, or we'd wipe out that error.
        var stillOpen=document.querySelector('#isx-popup-layer .isx-pcard');
        if(!stillOpen) _isxOpenIdeaPanel();
      });
    } else if(_isxInputPendingExternalUrl){
      // Unsplash pick — an external URL reference, same as the old
      // dedicated Image popup's Unsplash tab: no download/compress
      // step, _ideaSaveCard already resets the panel in place on
      // success just like a plain text save.
      var extUrl=_isxInputPendingExternalUrl;
      _isxInputPendingExternalUrl=null;
      _ideaSaveCard(extUrl);
    } else {
      _ideaSaveCard(null);
    }
  }

  function _isxClearPendingExternalUrl(){
    _isxInputPendingExternalUrl=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }
  }

  // Loads 4 random high-quality Unsplash photos straight into the card's
  // Loads random high-quality Unsplash photos straight into the card's
  // own preview area — same source/key as the old dedicated Image
  // popup's Unsplash tab, just rendered here so there's no second
  // screen to open. Tapping a thumbnail marks it selected; SAVE/ENTER
  // then commits it as an external-URL image card. "Load more" appends
  // rather than replacing, in a scrollable grid, so this isn't capped
  // at one static batch of 4.
  var UNSPLASH_KEY='ka0gIrtPFZ1o4q4JKnSdaaBH5197-tWnFnZkd-zw3ns';

  async function _isxFetchUnsplashBatch(n){
    var photos=[];
    try{
      for(var i=0;i<n;i++){
        var r=await fetch('https://api.unsplash.com/photos/random?content_filter=high&client_id='+UNSPLASH_KEY);
        if(r.ok){ var d=await r.json(); photos.push(d.urls.regular); }
      }
    }catch(e){}
    return photos;
  }

  function _isxWireUnsplashTiles(){
    document.querySelectorAll('#isx-unsplash-pick-grid .isx-unsplash-tile').forEach(function(tile){
      if(tile._isxWired) return;
      tile._isxWired=true;
      tile.addEventListener('click', function(){
        document.querySelectorAll('#isx-unsplash-pick-grid .isx-unsplash-tile div').forEach(function(h){h.textContent='\ud83e\udd0d';});
        this.querySelector('div').textContent='\ud83e\udda4';
        _isxInputPendingExternalUrl=this.getAttribute('data-url');
      });
    });
  }

  function _isxUnsplashTileHTML(url){
    return '<div class="isx-unsplash-tile" data-url="'+url+'" style="position:relative;height:64px;border:2px solid #111;border-radius:8px;overflow:hidden;cursor:pointer">'
      +'<img src="'+url+'" style="width:100%;height:100%;object-fit:cover">'
      +'<div style="position:absolute;bottom:2px;right:4px;font-size:14px">\ud83e\udd0d</div></div>';
  }

  async function _isxShowUnsplashPicker(){
    _isxClearPendingImage(); _isxClearPendingLink();
    _isxInputPendingExternalUrl=null;
    var preview=document.getElementById('isx-paste-preview');
    if(!preview) return;
    preview.style.display='block';
    preview.innerHTML='<div style="font-size:10px;color:#7a90a8;text-align:center;padding:10px 0">Loading Unsplash\u2026</div>';
    var photos=await _isxFetchUnsplashBatch(4);
    if(!preview) return; // popup may have closed while this was in flight
    if(!photos.length){ preview.innerHTML='<div style="font-size:10px;color:#A32D2D;text-align:center;padding:10px 0">Couldn\u2019t load images. Try again.</div>'; return; }
    preview.innerHTML='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;max-height:200px;overflow-y:auto" id="isx-unsplash-pick-grid">'
      +photos.map(_isxUnsplashTileHTML).join('')+'</div>'
      +'<button type="button" id="isx-unsplash-more" style="width:100%;margin-top:6px;padding:6px;font-size:10px;'
      +'border:1.5px dashed var(--isx-paleblue);border-radius:8px;background:transparent;color:var(--isx-navy);cursor:pointer">\ud83d\udd04 More photos</button>';
    _isxWireUnsplashTiles();
    var moreBtn=document.getElementById('isx-unsplash-more');
    if(moreBtn) moreBtn.onclick=async function(){
      moreBtn.disabled=true; moreBtn.textContent='Loading\u2026';
      var more=await _isxFetchUnsplashBatch(4);
      var grid=document.getElementById('isx-unsplash-pick-grid');
      if(grid){ grid.insertAdjacentHTML('beforeend', more.map(_isxUnsplashTileHTML).join('')); _isxWireUnsplashTiles(); }
      moreBtn.disabled=false; moreBtn.textContent='\ud83d\udd04 More photos';
    };
  }

  // Cancel is a permanent fixture now, not a state-conditional button —
  // it resets the whole card back to blank (typed text, pending image,
  // pending link, or a pending Unsplash pick), not just pasted content.
  // Never closes the popup; that's still the ✕'s job alone.
  function _isxCancelIdeaEntry(){
    _isxClearPendingImage();
    _isxClearPendingLink();
    _isxClearPendingExternalUrl();
    var ta=document.getElementById('isx-idea-text');
    if(ta){ ta.value=''; ta.focus(); }
  }

  function _isxOpenIdeaPanel(){
    _isxIdeaMode='idea';
    _isxInputPendingImageFile=null;
    _isxInputPendingLink=null;
    _isxInputPendingExternalUrl=null;
    _isxOpenPopup('<div class="isx-pcard" data-pagenum="9712"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udca1 Idea</div>'
      +'<div class="isx-psub">Ideas are fragile. Write it down before it escapes.</div>'
      +'<div class="isx-src-row" style="margin-bottom:8px">'
        +'<button class="isx-src-btn on" id="isx-idea-mode-idea" type="button">\ud83d\udca1 Idea</button>'
        +'<button class="isx-src-btn" id="isx-idea-mode-header" type="button">\u274b Header</button>'
      +'</div>'
      +'<div class="isx-src-row" style="margin-bottom:8px">'
        +'<button class="isx-src-btn" id="isx-btn-camera" type="button">\ud83d\udcf7 Camera</button>'
        +'<button class="isx-src-btn" id="isx-btn-attach" type="button">\ud83d\udcce Attach</button>'
        +'<button class="isx-src-btn" id="isx-btn-unsplash" type="button">\ud83c\udf05 Unsplash</button>'
      +'</div>'
      +'<div id="isx-paste-preview" style="display:none"></div>'
      +'<textarea id="isx-idea-text" placeholder="What if\u2026?"></textarea>'
      +'<input type="file" id="isx-camera-input" accept="image/*" capture="environment" style="display:none">'
      +'<input type="file" id="isx-attach-input" accept="image/*" style="display:none">'
      +'<div class="isx-save-row">'
        +'<button class="isx-cancel" id="isx-p-cancel" type="button">CANCEL</button>'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>'
      +'</div></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.getElementById('isx-p-save').onclick=_isxCommitIdeaPanel;
    document.getElementById('isx-p-cancel').onclick=_isxCancelIdeaEntry;
    var cameraBtn=document.getElementById('isx-btn-camera');
    var cameraInput=document.getElementById('isx-camera-input');
    if(cameraBtn && cameraInput){
      cameraBtn.onclick=function(){ cameraInput.click(); };
      cameraInput.addEventListener('change', function(){
        if(this.files && this.files[0]) _isxShowPendingImage(this.files[0]);
      });
    }
    var attachBtn=document.getElementById('isx-btn-attach');
    var attachInput=document.getElementById('isx-attach-input');
    if(attachBtn && attachInput){
      attachBtn.onclick=function(){ attachInput.click(); };
      attachInput.addEventListener('change', function(){
        if(this.files && this.files[0]) _isxShowPendingImage(this.files[0]);
      });
    }
    var unsplashBtn=document.getElementById('isx-btn-unsplash');
    if(unsplashBtn) unsplashBtn.onclick=_isxShowUnsplashPicker;
    _isxWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));

    var modeIdeaBtn=document.getElementById('isx-idea-mode-idea');
    var modeHeaderBtn=document.getElementById('isx-idea-mode-header');
    function _isxSetMode(m){
      _isxIdeaMode=m;
      if(modeIdeaBtn) modeIdeaBtn.classList.toggle('on', m==='idea');
      if(modeHeaderBtn) modeHeaderBtn.classList.toggle('on', m==='header');
    }
    if(modeIdeaBtn) modeIdeaBtn.onclick=function(){ _isxSetMode('idea'); };
    if(modeHeaderBtn) modeHeaderBtn.onclick=function(){ _isxSetMode('header'); };

    var ta=document.getElementById('isx-idea-text');
    if(ta){
      ta.focus();
      ta.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _isxCommitIdeaPanel(); }
      });
      // The magic input field accepts ANY pasted source, not just typed
      // text. An image on the clipboard shows a preview (see
      // _isxShowPendingImage); a bare URL shows a title+thumbnail
      // preview via the same oEmbed pipeline the dedicated 🔗 panel
      // uses (see _isxShowPendingLink). Either way, nothing saves until
      // SAVE/ENTER — matches the locked "explicit save affordance for
      // non-text content" rule, no auto-commit on paste.
      ta.addEventListener('paste', function(e){
        var items=e.clipboardData && e.clipboardData.items;
        if(items){
          for(var i=0;i<items.length;i++){
            if(items[i].type && items[i].type.indexOf('image/')===0){
              var file=items[i].getAsFile();
              if(file){
                e.preventDefault();
                _isxShowPendingImage(file);
              }
              return;
            }
          }
        }
        var text=e.clipboardData && e.clipboardData.getData('text/plain');
        if(text && _isxIsBareUrl(text)){
          e.preventDefault();
          _isxShowPendingLink(text.trim());
        }
      });
    }
  }

  function _isxOpenImagePanel(){
    _isxImgTab='paste'; _isxImgPendingUrl=null; _isxImgPendingFile=null;
    _isxOpenPopup('<div class="isx-pcard" data-pagenum="9713"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udcf7 Image</div>'
      +'<div class="isx-src-row">'
        +'<button class="isx-src-btn on" data-src="paste">Paste / Upload</button>'
        +'<button class="isx-src-btn" data-src="unsplash">Unsplash</button>'
        +'<button class="isx-src-btn" data-src="ai">Generate</button>'
      +'</div>'
      +'<div id="isx-img-body"></div>'
      +'</div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.querySelectorAll('.isx-src-btn').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('.isx-src-btn').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on'); _isxImgTab=b.getAttribute('data-src'); _isxRenderImageBody();
      };
    });
    _isxRenderImageBody();
    _isxWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
  }

  function _isxRenderImageBody(){
    var body=document.getElementById('isx-img-body');
    if(!body) return;
    if(_isxImgTab==='paste'){
      body.innerHTML='<div class="isx-dropzone" id="isx-dropzone">'
        +(_isxImgPendingUrl?'<img src="'+_isxImgPendingUrl+'" style="max-width:100%;max-height:100%;border-radius:8px">':'Paste an image here (Ctrl/Cmd + V)<br>or choose a file below')+'</div>'
        +'<input type="file" id="isx-file-input" accept="image/*" style="width:100%;margin-bottom:8px;font-size:11px;color:#3A6080">'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>';
      var fileInput=document.getElementById('isx-file-input');
      if(fileInput) fileInput.addEventListener('change', function(){
        if(this.files && this.files[0]){
          _isxImgPendingFile=this.files[0];
          var reader=new FileReader();
          reader.onload=function(ev){ _isxImgPendingUrl=ev.target.result; _isxRenderImageBody(); };
          reader.readAsDataURL(this.files[0]);
        }
      });
      document.getElementById('isx-p-save').onclick=function(){
        if(_isxImgPendingFile){
          var dz=document.getElementById('isx-dropzone'); if(dz) dz.innerHTML='Uploading\u2026';
          _ideaSaveImageFile(_isxImgPendingFile);
        }
      };
    } else if(_isxImgTab==='unsplash'){
      body.innerHTML='<div id="isx-unsplash-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">Loading\u2026</div>'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>';
      _isxLoadUnsplash();
      document.getElementById('isx-p-save').onclick=function(){ if(_isxImgPendingUrl) _ideaSaveCard(_isxImgPendingUrl); };
    } else {
      body.innerHTML='<div class="isx-dropzone">Custom AI image generation isn\u2019t wired up yet \u2014 needs an image-gen API connected.</div>';
    }
  }

  async function _isxLoadUnsplash(){
    var grid=document.getElementById('isx-unsplash-grid');
    if(!grid) return;
    var UNSPLASH_KEY='ka0gIrtPFZ1o4q4JKnSdaaBH5197-tWnFnZkd-zw3ns';
    var photos=[];
    try{
      for(var i=0;i<4;i++){
        var r=await fetch('https://api.unsplash.com/photos/random?content_filter=high&client_id='+UNSPLASH_KEY);
        if(r.ok){ var d=await r.json(); photos.push(d.urls.regular); }
      }
    }catch(e){}
    if(!grid) return;
    if(!photos.length){ grid.innerHTML='Couldn\u2019t load images. Try again.'; return; }
    grid.innerHTML=photos.map(function(url){
      return '<div class="isx-unsplash-tile" data-url="'+url+'" style="position:relative;height:72px;border:2px solid #111;border-radius:8px;overflow:hidden;cursor:pointer"><img src="'+url+'" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;bottom:2px;right:4px;font-size:15px">\ud83e\udd0d</div></div>';
    }).join('');
    document.querySelectorAll('.isx-unsplash-tile').forEach(function(tile){
      tile.addEventListener('click', function(){
        document.querySelectorAll('.isx-unsplash-tile div').forEach(function(h){h.textContent='\ud83e\udd0d';});
        this.querySelector('div').textContent='\ud83e\udda4';
        _isxImgPendingUrl=this.getAttribute('data-url');
      });
    });
  }

  function _isxOpenLinkPanel(){
    _isxLinkPendingUrl=null; _isxLinkPendingThumb=null; _isxLinkPendingTitle=null;
    _isxOpenPopup('<div class="isx-pcard" data-pagenum="9714"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udd17 Link</div>'
      +'<input type="text" id="isx-link-url" placeholder="Paste a URL\u2026" style="margin-bottom:8px">'
      +'<div class="isx-dropzone" id="isx-link-preview" style="height:80px">Preview appears here once the link resolves</div>'
      +'<button class="isx-save" id="isx-p-save">SAVE</button></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    _isxWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
    var input=document.getElementById('isx-link-url');
    input.addEventListener('input', function(){
      var val=this.value.trim();
      _isxLinkPendingUrl=val; _isxLinkPendingThumb=null; _isxLinkPendingTitle=null;
      if(_isxLinkTimer) clearTimeout(_isxLinkTimer);
      var preview=document.getElementById('isx-link-preview');
      if(!val){ if(preview) preview.textContent='Preview appears here once the link resolves'; return; }
      if(preview) preview.textContent='Resolving\u2026';
      _isxLinkTimer=setTimeout(async function(){
        var meta=await _linkResolveOEmbed(val);
        if(_isxLinkPendingUrl!==val) return;
        if(meta){ _isxLinkPendingThumb=meta.thumbnail_url; _isxLinkPendingTitle=meta.title; }
        var p=document.getElementById('isx-link-preview');
        if(p) p.innerHTML = _isxLinkPendingThumb
          ? ('<img src="'+_isxLinkPendingThumb+'" style="max-width:100%;max-height:64px;border-radius:6px;display:block;margin:0 auto 4px">'+(_isxLinkPendingTitle||val))
          : ('Ready to attach: '+val+' (no preview available)');
      }, 500);
    });
    document.getElementById('isx-p-save').onclick=function(){
      if(_isxLinkPendingUrl) _ideaSaveLinkCard(_isxLinkPendingUrl, _isxLinkPendingThumb, _isxLinkPendingTitle);
    };
  }

  function _isxOpenRulesPanel(){
    _isxOpenPopup('<div class="isx-pcard" data-pagenum="9715" style="width:260px"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle" style="font-size:20px">\ud83d\udcdc Rules of Creative Thinking</div>'
      +'<div style="font-size:13px;line-height:2;color:#1A3A5C;margin-top:8px">'
        +'<div>1. No criticism.</div>'
        +'<div>2. The more, the better.</div>'
        +'<div>3. The wilder, the better.</div>'
        +'<div>4. Hitch-hike off other ideas.</div>'
      +'</div>'
      +'<button class="isx-save" id="isx-p-save">GOT IT</button></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.getElementById('isx-p-save').onclick=_isxClosePopup;
    _isxWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
  }

  // Eye replaces the compass this iteration: instead of the text "Where
  // This Sits" tree, it jumps straight to the real visual Storyboard for
  // wherever the traveler currently is in Idea Session.
  function _isxOpenStoryboardView(){
    _ideaOpenBoard(_isxCurrentTopicId());
  }

  async function _isxOpenCompass(){
    var layer=document.getElementById('isx-popup-layer');
    if(!layer) return;
    var apexId=_isxPath[0].id;
    var byId={}, kidsOf={};
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(user){
        var res=await _sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',user.id).eq('content_type','header');
        (res.data||[]).forEach(function(r){ byId[r.id]=r; (kidsOf[r.cluster_id]=kidsOf[r.cluster_id]||[]).push(r.id); });
      }
    }catch(e){ console.warn('_isxOpenCompass fetch failed:', e); }

    function keyOf(idPath){ return idPath.join('/'); }
    function renderNode(idPath){
      var id=idPath[idPath.length-1];
      var name=byId[id]?byId[id].text_content:_isxPath[0].text;
      var isHere = keyOf(idPath)===keyOf(_isxPath.map(function(p){return p.id;}));
      var html='<div class="isx-tnode'+(isHere?' here':'')+'" data-path="'+idPath.join('|')+'">'+(isHere?'\ud83d\udccd ':'')+name+'</div>';
      var kids=kidsOf[id]||[];
      if(kids.length){
        var pathIds=_isxPath.map(function(p){return p.id;});
        var onPathChild = pathIds.length>idPath.length && keyOf(pathIds.slice(0,idPath.length))===keyOf(idPath) ? pathIds[idPath.length] : null;
        var expanded=_isxExpanded[keyOf(idPath)];
        var shown = expanded ? kids : (onPathChild ? [onPathChild] : []);
        var hidden = kids.filter(function(k){ return shown.indexOf(k)===-1; });
        html+='<div class="isx-tkids">';
        shown.forEach(function(k){ html+=renderNode(idPath.concat([k])); });
        if(hidden.length) html+='<div class="isx-tchip" data-expand="'+keyOf(idPath)+'">+ '+hidden.length+' more here</div>';
        html+='</div>';
      }
      return html;
    }

    layer.innerHTML='<div class="isx-tree-card"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle" style="font-size:20px">\ud83e\udded Where This Sits</div>'
      +'<div class="isx-psub">\ud83d\udccd marks you. Tap a name to jump there. Tap "+N more" to reveal the rest.</div>'
      +renderNode([apexId])+'</div>';
    layer.classList.add('active');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    layer.querySelectorAll('.isx-tnode').forEach(function(el){
      el.onclick=async function(){
        var ids=el.getAttribute('data-path').split('|');
        var chain=ids.map(function(id, i){ return {id:id, text: i===0?_isxPath[0].text:(byId[id]?byId[id].text_content:'')}; });
        _isxPath=chain; _isxHeaderId=null; _isxHeaderLabel='New';
        _isxClosePopup();
        await _isxRenderLadder(); await _isxRenderBoard();
      };
    });
    layer.querySelectorAll('.isx-tchip').forEach(function(el){
      el.onclick=function(){ _isxExpanded[el.getAttribute('data-expand')]=true; _isxOpenCompass(); };
    });
  }

  async function _ideaGetDefaultHeaderId(){
    var result=await _ideaEnsureWishTank();
    if(!result || !result.id) return null;
    return result.id;
  }

  window.T2TSea = {
    openTrash: async function(){
      try{
        var tid=await _sboardEnsureTrashHeader();
        _sboardFilter=tid;
      }catch(e){ _sboardFilter=null; }
      T().nav('s-sea-of-ideas-cluster');
    },
    openBoard: function(boardId){ _ideaOpenBoard(boardId); },
    openIdeaCapture: function(ctx){
      // Logged July 8, 2026 — now opens the new Idea Session screen (9215)
      // instead of legacy 9210. 9210-9214 are left fully in place and still
      // reachable (s-idea's "Add an Idea" trivia link) as a fallback.
      _ideaCaptureCtx=ctx||null;
      _ideaReturnToBoard=!!(ctx&&ctx.returnToBoard);
      _ideaReturnBoardId=(ctx&&ctx.boardId!==undefined)?ctx.boardId:null;
      T().nav('s-idea-session');
    },
    getCurrentBoardContext: function(){ return _sboardCurrentTopicId?{boardId:_sboardCurrentTopicId}:null; },
    getDefaultHeaderId: _ideaGetDefaultHeaderId
  };

  document.addEventListener('DOMContentLoaded', function(){
    injectSeaOfIdeas();
    injectSeaOfIdeasCluster();
    wireIdeaCaptureFamily();
  });

})();
