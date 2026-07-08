/* ============================================================
   sea-of-ideas.js — T2T Field Guide · Idea Hub / Sea of Ideas module
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
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas"><div class="phase-header" style="text-align:left;display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden"><span class="ph-eyebrow">🌈 DREAM PHASE</span><span class="ph-eyebrow">·</span><span class="ph-eyebrow">CREATE</span></div><div class="sw" style="padding:16px 32px;align-items:center;text-align:center"><div style="font-family:\'Playfair Display\',serif;font-size:26px;font-weight:700;color:#1a3a5c;margin-bottom:2px">Sea of Ideas</div><div style="font-size:13px;font-style:italic;color:#888;margin-bottom:14px;line-height:1.7">Everything captured so far. No order. Just a blast of ideas.</div><div id="sea-thumb" style="width:100%;border:1.5px solid #b0a898;border-radius:10px;margin-bottom:10px;background:#f5f5f5;padding:6px"><div id="sea-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div><div id="sea-empty" style="text-align:center;padding:16px;display:none"><div style="font-size:36px;margin-bottom:6px">🌊</div><div style="font-size:12px;font-style:italic;color:#999">Your Sea of Ideas</div></div></div><div id="b-sea-to-cluster" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:4px">🧩 Try clustering these</div><div class="sp"></div></div><div class="bar2 bar-dream-pp"><button class="tb" id="b-sea-back">⬅️</button><button class="tb" id="b-sea-mg">🔍</button><button class="tb" id="b-sea-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas', '9220');
    T().registerCtx('s-sea-of-ideas', 'Sea of Ideas');
    T().registerGems('s-sea-of-ideas', [
      {text:'The Sea of Ideas holds everything — no commitment, no wrong answers.', attr:'T2T Field Guide · CREATE'}
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
    T().wire('b-sea-to-cluster', function(){ T().nav('s-sea-of-ideas-cluster'); });
    T().wire('b-sea-fwd', function(){
      if(T().currentFile()==='dream.html' && document.getElementById('s-idea-button')){ T().nav('s-idea-button'); }
      else { T().closeMG(); T().returnToMG(); }
    });
    T().registerScreenActivate('s-sea-of-ideas', renderSeaOfIdeas);
  }

  async function renderSeaOfIdeas(){
    var fwdBtn = document.getElementById('b-sea-fwd');
    if(fwdBtn){
      var inChapterFlow = (T().currentFile()==='dream.html' && document.getElementById('s-idea-button') && T().getSeaChapterEntry());
      fwdBtn.style.opacity = inChapterFlow ? '1' : '0.3';
      fwdBtn.style.pointerEvents = inChapterFlow ? 'auto' : 'none';
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
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
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
        +'.sc-tile img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}'
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
        +'#sc-groups-wrap{gap:2px!important}'
        +'.sc-hdr-eyebrow{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px}'
        +'.sc-hdr-side{min-width:72px;min-height:46px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}'
        +'#sc-parent-hit{cursor:pointer}'
        +'#sc-parent-hit.inert{cursor:default}'
        +'#sc-parent-label{font-family:\'Playfair Display\',serif;font-size:12px;font-weight:700;color:#fff;line-height:1.2}'
        +'#b-sc-purpose{width:100%;box-sizing:border-box}'
        +'#sc-topic-box{display:inline-block;max-width:220px;box-sizing:border-box;white-space:normal;word-wrap:break-word}'
        +'.sc-pill.has-children{box-shadow:3px 3px 0 rgba(26,58,92,0.20),6px 6px 0 rgba(26,58,92,0.11)}'
        +'.sc-peek-card{background:#fff;border-radius:14px;padding:14px;width:min(360px,94%);max-height:82vh;overflow-y:auto;box-sizing:border-box}'
        +'.sc-peek-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid #cfe4f2}'
        +'.sc-peek-topbar button{background:#e8f5f2;border:1px solid #a8d8cc;border-radius:8px;padding:6px 10px;font-size:14px;cursor:pointer;flex:0 0 auto}'
        +'.sc-peek-title{font-family:\'Playfair Display\',serif;font-size:15px;font-weight:700;color:#1a3a5c;text-align:center;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        +'.sc-peek-spacer{width:32px;flex:0 0 auto}'
        +'.sb-shape-card{background:#fff;border-radius:16px;padding:16px;width:min(300px,88%);max-height:calc(100vh - 40px);overflow-y:auto;box-shadow:0 10px 24px rgba(0,0,0,0.3);display:flex;flex-direction:column;box-sizing:border-box}'
        +'.sb-crumbs{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;min-height:20px}'
        +'.sb-crumb-parent{font-size:10px;color:#7a6040;font-weight:600;opacity:.8}'
        +'.sb-crumb-sep{font-size:10px;color:#cfc3ae}'
        +'.sb-crumb-topic{font-size:16px;color:#1a3a5c;font-weight:700;font-family:\'Playfair Display\',serif}'
        +'.sb-hdr-eyebrow2{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:6px;text-align:left}'
        +'.sb-hdr-vlist{display:flex;flex-direction:column;gap:3px;max-height:112px;overflow-y:auto;margin-bottom:10px;border:1px solid #eef2f6;border-radius:8px;padding:6px;flex-shrink:0}'
        +'.sb-hdr-vitem{padding:6px 10px;border-radius:8px;font-size:12px;text-align:left;cursor:pointer;color:#1a3a5c;background:transparent}'
        +'.sb-hdr-vitem.current{background:#eaf3fb;font-weight:700}'
        +'.sb-hdr-vitem.newh{color:#5b9bd5;font-weight:700;border-top:1px dashed #cfe4f2;margin-top:2px;padding-top:8px}'
        +'.sb-body-box{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:170px;max-height:50vh;border-radius:10px;background:#f7f9fb;border:1.5px solid #b0a898;padding:14px;box-sizing:border-box;margin-bottom:10px;overflow:hidden;position:relative}'
        +'.sb-body-box img{max-width:100%;max-height:50vh;border-radius:8px;object-fit:contain}'
        +'.sb-body-text{font-family:\'Playfair Display\',serif;color:#1a3a5c;font-weight:700;cursor:pointer;word-break:break-word}'
        +'.sb-blue-row{display:flex;gap:8px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn{box-sizing:border-box;background:#eaf3fb;color:#1a3a5c;border:1px solid #b0a898;border-radius:12px;padding:10px 12px;font-size:15px;cursor:pointer;flex:1 1 auto;min-width:40px}'
        +'.sb-blue-btn:active{transform:scale(0.95)}'
        +'.sb-blue-btn.misc-on{background:#cfe4f7}'
        +'.sb-blue-row-sm{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-sm{box-sizing:border-box;background:#eaf3fb;color:#1a3a5c;border:1px solid #b0a898;border-radius:11px;padding:8px 11px;font-size:12px;cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-sm:active{transform:scale(0.95)}'
        +'.sb-blue-row-md{display:flex;gap:7px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;flex-shrink:0}'
        +'.sb-blue-btn-md{box-sizing:border-box;background:#eaf3fb;color:#1a3a5c;border:1px solid #b0a898;border-radius:11px;padding:9px 10px;font-size:13px;font-weight:600;cursor:pointer;flex:1 1 auto}'
        +'.sb-blue-btn-md:active{transform:scale(0.95)}'
        +'.sb-viewas-eyebrow{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a3907a;text-align:center;margin-bottom:4px}'
        +'.sb-viewas-btn{box-sizing:border-box;background:#efe6d8;color:#7a6040;border:1px solid #cbb99a;border-radius:9px;padding:5px 8px;font-size:10px;font-weight:700;letter-spacing:.5px;cursor:pointer;flex:1 1 auto}'
        +'.sb-viewas-btn:active{transform:scale(0.95)}'
        +'.sb-card-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#5b9bd5;text-align:center;margin-bottom:6px}'
        +'.sb-close-btn{box-sizing:border-box;background:#eaf3fb;color:#000;font-weight:700;border:1px solid #b0a898;border-radius:12px;padding:10px 14px;font-size:14px;cursor:pointer;width:100%;flex-shrink:0}'
        +'.sb-parent-value{font-family:\'Playfair Display\',serif;font-size:13px;font-weight:700;color:#666;margin-bottom:8px}'
        +'.sb-topic-value{display:inline-block;background:#eaf3fb;border:1px solid #a9cce3;border-radius:6px;padding:6px 14px;font-size:18px;font-weight:700;color:#1a3a5c;font-family:\'Playfair Display\',serif;margin-bottom:10px}'
        +'.sb-hdr-current{font-size:12px;color:#000;font-weight:600;cursor:pointer;margin-bottom:6px;padding:6px 10px;border:1px dashed #a9cce3;border-radius:6px;text-align:left}'
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
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:8px 16px 6px;margin-bottom:4px">'
      +'<div style="display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:10px">'
      +'<div id="sc-parent-hit" class="sc-hdr-side" style="text-align:left">'
      +'<div class="sc-hdr-eyebrow">Parent</div>'
      +'<div id="sc-parent-label">Sea of Ideas</div>'
      +'<div id="sc-pagenum" style="font-size:8px;letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">9221</div>'
      +'</div>'
      +'<div style="text-align:center">'
      +'<div class="sc-hdr-eyebrow">Topic</div>'
      +'<div id="sc-topic-box"></div>'
      +'</div>'
      +'<div class="sc-hdr-side" style="text-align:right"><button class="sc-ov-btn" id="b-sc-mode-toggle" title="Desktop size">⛶</button></div>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      +'<div id="sc-board-wrap"></div>'
      +'<div id="sb-detail-overlay" class="sb-overlay"></div>'
      +'<div id="sb-cluster-overlay" class="sb-overlay"></div>'
      +'</div>'
      +'<div class="bar2 bar-dream-pp"><button class="tb" id="b-sc-back">⬅️</button><button class="tb" id="b-sc-mg">🔍</button><button class="tb" id="b-sc-idea">💡</button><button class="tb" id="b-sc-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas-cluster', '9221');
    T().registerCtx('s-sea-of-ideas-cluster', 'Sea of Ideas — Cluster');
    T().wire('b-sc-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      _sboardCurrentTopicId=null; _sboardFilter=null;
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sc-mg', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      T().goMG();
    });
    T().wire('b-sc-idea', function(){
      if(window.T2TSea && window.T2TSea.openIdeaCapture) window.T2TSea.openIdeaCapture({boardId:_sboardCurrentTopicId, returnToBoard:true});
    });
    T().wire('b-sc-fwd', function(){
      _sboardCurrentTopicId=null; _sboardFilter=null;
      if(T().currentFile()==='dream.html' && document.getElementById('s-idea-button')){ T().nav('s-idea-button'); }
      else { T().closeMG(); T().returnToMG(); }
    });
    T().wire('b-sc-mode-toggle', function(){
      _sboardDesktop=!_sboardDesktop;
      var btn=document.getElementById('b-sc-mode-toggle');
      if(btn){ btn.innerHTML=_sboardDesktop?'↩':'⛶'; btn.title=_sboardDesktop?'Back to mobile size':'Desktop size'; }
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop);
      renderSeaBoard();
    });
    var boardWrapBgEl=document.getElementById('sc-board-wrap');
    if(boardWrapBgEl) boardWrapBgEl.addEventListener('dblclick', function(e){ if(e.target===boardWrapBgEl || e.target.id==='sc-groups-wrap') openBoardBgPicker(); });
    _sboardApplyBoardBg();

    var topicBoxEl=document.getElementById('sc-topic-box');
    if(topicBoxEl) topicBoxEl.addEventListener('dblclick', function(e){
      e.stopPropagation();
      if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
        openSbDetail(_sboardAllRowsById[_sboardCurrentTopicId]);
      } else {
        openRootPromptEditor();
      }
    });

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
    var fwdBtn=document.getElementById('b-sc-fwd');
    if(fwdBtn){
      var inChapterFlow=(T().currentFile()==='dream.html' && document.getElementById('s-idea-button') && T().getSeaChapterEntry());
      fwdBtn.style.opacity=inChapterFlow?'1':'.3';
      fwdBtn.style.pointerEvents=inChapterFlow?'auto':'none';
    }
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop);
    return renderSeaBoard();
  }

  function _sboardMakeTile(item, width, straight, groupParentId, height){
    width=width||(_sboardDesktop?76:70);
    height=height||width;
    var rot=straight?0:(Math.random()*8-4).toFixed(1);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'');
    tile.draggable=true;
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
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(item); });
    tile.addEventListener('dragover', function(e){ e.preventDefault(); tile.style.outline='2px solid #5b9bd5'; });
    tile.addEventListener('dragleave', function(){ tile.style.outline='none'; });
    tile.addEventListener('drop', function(e){
      e.preventDefault(); tile.style.outline='none';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw.indexOf('header:')===0) return;
      _sboardReorderOrMoveIdea(raw, item.id, groupParentId!==undefined?groupParentId:(item.cluster_id||null));
    });
    return tile;
  }

  function _sboardMakeHeaderStackTile(headerRow, width, height, straight){
    width=width||(_sboardDesktop?76:70);
    height=height||width;
    var rot=straight?0:(Math.random()*6-3).toFixed(1);
    var wrap=document.createElement('div');
    wrap.className='sc-stack-tile';
    wrap.draggable=true;
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
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(headerRow); });
    wrap.addEventListener('dragover', function(e){ e.preventDefault(); front.style.outline='2px solid #5b9bd5'; });
    wrap.addEventListener('dragleave', function(){ front.style.outline='none'; });
    wrap.addEventListener('drop', function(e){
      e.preventDefault(); front.style.outline='none';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw||raw.indexOf('header:')===0) return;
      _sboardMoveCard(raw, headerRow.id);
    });
    return wrap;
  }

  async function renderSeaBoard(){
    var wrap=document.getElementById('sc-board-wrap');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    if(!wrap||!_sb) return;
    if(statusEl){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var newAdditionsId=await _sboardEnsureNewAdditionsHeader(_sboardCurrentTopicId);
      _sboardNewAdditionsId=newAdditionsId;
      var purposeId=await _sboardEnsurePurposeHeader(_sboardCurrentTopicId);
      var miscId=await _sboardEnsureMiscHeader(_sboardCurrentTopicId);

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color')
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
      var contentHeaders=headerRows.filter(function(r){ return reservedIds.indexOf(String(r.id))===-1; });
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
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='New Additions');
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
        else if(!isReserved){ hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(headerRow); }); }
        if(!isReserved && depth===0){
          hd.draggable=true;
          hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
        }
        hd.addEventListener('dragover', function(e){ e.preventDefault(); hd.style.outline='2px solid #5b9bd5'; });
        hd.addEventListener('dragleave', function(){ hd.style.outline='none'; });
        hd.addEventListener('drop', function(e){
          e.preventDefault(); hd.style.outline='none';
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw) return;
          if(raw.indexOf('header:')===0){
            _sboardReorderHeader(raw.slice(7), headerRow.id);
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

      // Local "New Additions" column for a nested (fractal) board — same visual
      // treatment as renderGroup, but backed by directItems only (no sub-headers,
      // since this bucket is specifically the uncategorized-items catch-all for
      // whichever board is currently open), and with no real DB row of its own.
      function renderLocalNewAdditions(directItems, parentIdForDrop){
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('div');
        hd.className='sc-pill named';
        hd.style.cssText='position:static;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-size:'+_sboardFitFontSize('New Additions',15,10)+'px;font-weight:800;margin-bottom:2px;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:12px';
        hd.textContent='New Additions';
        hd.addEventListener('dragover', function(e){ e.preventDefault(); hd.style.outline='2px solid #5b9bd5'; });
        hd.addEventListener('dragleave', function(){ hd.style.outline='none'; });
        hd.addEventListener('drop', function(e){
          e.preventDefault(); hd.style.outline='none';
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw||raw.indexOf('header:')===0) return;
          _sboardMoveCard(raw, parentIdForDrop);
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

      if(purposeRow) groupsWrap.appendChild(renderGroup(purposeRow, 0));

      if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
        var directIdeas=(childrenOfHeader[_sboardCurrentTopicId]||[]).slice().sort(_sboardBySortOrder);
        _sboardIdeaOrderByParent[_sboardCurrentTopicId]=directIdeas.map(function(r){ return r.id; });
        var childHeaders=subHeadersOf[_sboardCurrentTopicId]||[];
        groupsWrap.appendChild(renderLocalNewAdditions(directIdeas, _sboardCurrentTopicId));
        if(directIdeas.length===0 && childHeaders.length===0){
          if(statusEl) statusEl.textContent='Nothing under this Header yet.';
          _sboardVisibleHeaders=[];
        } else {
          var childHeadersSorted=childHeaders.slice().sort(_sboardBySortOrder);
          _sboardTopLevelOrder=childHeadersSorted.map(function(h){ return h.id; });
          _sboardVisibleHeaders=childHeadersSorted;
          childHeadersSorted.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
          if(statusEl) statusEl.textContent='';
        }
      } else {
        if(newAdditionsRow) groupsWrap.appendChild(renderGroup(newAdditionsRow, 0));
        orderedTop.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
        _sboardVisibleHeaders=(newAdditionsRow?[newAdditionsRow]:[]).concat(orderedTop);
        if(statusEl) statusEl.textContent='';
      }

      if(miscRow) groupsWrap.appendChild(renderGroup(miscRow, 0));

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
    var currentLabel=(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId]) ? _sboardHeadersById[_sboardCurrentTopicId].text_content : 'Sea of Ideas';
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
    // Root Topic never changes — "What do you want?" stays permanent regardless of depth.
    if(_sboardCurrentTopicId && _sboardAllRowsById[_sboardCurrentTopicId]){
      var topicRow=_sboardAllRowsById[_sboardCurrentTopicId];
      if(topicBox) topicBox.textContent=topicRow.text_content||'(untitled)';
      if(areaEl) areaEl.style.background='#3a2564';
      var parentId=topicRow.cluster_id||null;
      var parentRow=parentId?_sboardAllRowsById[parentId]:null;
      var parentFallback=(topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'New Additions');
      if(parentLabel) parentLabel.textContent=parentRow?parentRow.text_content:parentFallback;
      if(parentHit) parentHit.classList.remove('inert');
    } else {
      if(topicBox) topicBox.textContent=_sboardGetRootPrompt();
      if(areaEl) areaEl.style.background='#1a3a5c';
      if(parentLabel) parentLabel.textContent='Sea of Ideas';
      if(parentHit) parentHit.classList.add('inert');
    }
  }

  async function _sboardMoveCard(itemId, headerId){
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

  async function _sboardReorderHeader(draggedId, targetId){
    if(String(draggedId)===String(targetId)) return;
    var statusEl=document.getElementById('sc-status');
    var ids=_sboardTopLevelOrder.slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(fromIdx===-1||toIdx===-1) return;
    ids.splice(fromIdx,1);
    var insertAt=ids.findIndex(function(id){ return String(id)===String(targetId); });
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
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color')
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
      +'<div style="font-size:11px;font-style:italic;color:#888;margin-bottom:10px">'+(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId] ? 'Goes under '+_sboardHeadersById[_sboardCurrentTopicId].text_content : 'Goes into New Additions')+'</div>'
      +'<textarea id="qa-idea-text" placeholder="What if…?" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:4px;min-height:70px"></textarea>'
      +'<div style="font-size:9px;font-style:italic;color:#a3907a;margin-bottom:6px">End with : or ? to make it a Header automatically</div>'
      +'<div id="qa-idea-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="qa-idea-save" style="flex:1">Save</button><button class="sc-ov-btn" id="qa-idea-close" style="flex:1">Close</button></div>'
      +'</div>';
    ov.classList.add('active');
    var ta=document.getElementById('qa-idea-text');
    if(ta) setTimeout(function(){ ta.focus(); },50);
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

  async function openPurposeEditor(){
    var ov=document.getElementById('sb-detail-overlay');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    try{
      var id=await _sboardEnsurePurposeHeader(_sboardCurrentTopicId);
      var row=await _sb.from('ideas').select('notes').eq('id',id).single();
      var curText=(row.data && row.data.notes) || '';
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Purpose</div>'
        +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:8px">Why are we doing this?</div>'
        +'<textarea id="sb-purpose-box" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;min-height:70px">'+curText+'</textarea>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-purpose-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-purpose-close" style="flex:1">Close</button></div>'
        +'</div>';
      ov.classList.add('active');
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

  async function _sboardEnsureNewAdditionsHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var q=_sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','New Additions');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardNewAdditionsId=existing.data[0].id; return _sboardNewAdditionsId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'New Additions',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('New Additions setup failed: '+ins.error.message);
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
    var opts='<option value=""'+(!currentClusterId?' selected':'')+'>New Additions</option>';
    opts+=_sboardHeaderList.filter(function(h){ return String(h.id)!==String(excludeId); })
      .map(function(h){ var sel=(currentClusterId && String(h.id)===String(currentClusterId))?' selected':''; return '<option value="'+h.id+'"'+sel+'>'+(h.text_content||'(untitled)')+'</option>'; }).join('');
    opts+='<option value="__new__">+ Create new header…</option>';
    return opts;
  }

  // Unified SHAPING card — same overlay, same buttons, regardless of whether
  // the card double-clicked is an idea, a header, or a sub-header. Type is a
  // state (has children / ends in : or ?), not a different kind of object.
  function openSbDetail(item){
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var isHeaderType=item.content_type==='header';
    var reservedNames=['Trash','MISC','Purpose','New Additions'];
    var isReservedItem=isHeaderType && reservedNames.indexOf(item.text_content)!==-1;

    if(isReservedItem){
      ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center">'
        + '<div class="sb-card-title">Shape</div>'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:8px">'+item.text_content+'</div>'
        + '<div style="font-size:11px;color:#7a6040;font-style:italic;margin-bottom:10px">This is a system header — it can\'t be renamed, moved, or trashed.</div>'
        + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:block;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px;flex:1"></textarea>'
        + '<button class="sb-close-btn" id="sb-close">Close</button>'
        + '</div>';
      ov.classList.add('active');
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
    var parentFallbackCrumb=(topicRow&&topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'New Additions');
    var parentLabelCrumb=(_sboardCurrentTopicId && topicRow)?(parentRowCrumb?(parentRowCrumb.text_content||'(untitled)'):parentFallbackCrumb):'Sea of Ideas';
    var crumbsHTML='<div class="sb-hdr-eyebrow2">Parent</div><div class="sb-parent-value">'+parentLabelCrumb+'</div>'
      + '<div class="sb-hdr-eyebrow2">Topic</div><div class="sb-topic-value">'+topicLabel+'</div>';

    // HEADER eyebrow: collapsed by default, showing only the current header —
    // tap to reveal the same option list as before (visible-headers-in-context).
    // "New Additions" here means whichever board's own uncategorized bucket is
    // active: null at the root Sea of Ideas, or the current topic id when
    // working inside a nested (fractal) board.
    var localNewAdditionsTarget=_sboardCurrentTopicId||'';
    var isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
    var curHeaderRow=(item.cluster_id && !isInLocalNewAdditions)?_sboardAllRowsById[item.cluster_id]:null;
    var curHeaderLabel=curHeaderRow?(curHeaderRow.text_content||'(untitled)'):'New Additions';
    var headerListHTML='<div class="sb-hdr-eyebrow2">Header</div>'
      + '<div class="sb-hdr-current" id="sb-hdr-current">'+curHeaderLabel+' ▾</div>'
      + '<div class="sb-hdr-vlist" id="sb-hdr-vlist" style="display:none">'
      + '<div class="sb-hdr-vitem'+(isInLocalNewAdditions?' current':'')+'" data-hid="'+localNewAdditionsTarget+'">New Additions</div>'
      + (_sboardPurposeId?('<div class="sb-hdr-vitem'+(String(item.cluster_id||'')===String(_sboardPurposeId)?' current':'')+'" data-hid="'+_sboardPurposeId+'">Purpose</div>'):'')
      + _sboardVisibleHeaders.filter(function(h){ return String(h.id)!==String(item.id) && h.text_content!=='New Additions'; })
          .map(function(h){ var cur=(item.cluster_id && String(h.id)===String(item.cluster_id))?' current':''; return '<div class="sb-hdr-vitem'+cur+'" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>'; }).join('')
      + '<div class="sb-hdr-vitem newh" id="sb-hdr-newh">+ Create new header…</div>'
      + '</div>'
      + '<div class="sb-inline-field" id="sb-newheader-row" style="display:none"><input id="sb-newheader-input" type="text" placeholder="New header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:6px"><button class="sb-blue-btn" id="sb-newheader-go" style="width:100%">Create &amp; move here</button></div>';

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

    ov.innerHTML='<div class="sc-overlay-card sb-shape-card" style="text-align:center">'
      + '<div class="sb-card-title">Shape</div>'
      + apexTag
      + crumbsHTML
      + headerListHTML
      + bodyHTML
      + '<div id="sb-hearts-row" style="font-size:14px;min-height:14px;margin:2px 0">'+_sboardHeartsHTML(heartCount)+'</div>'
      + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:none;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px">'+(item.notes||'')+'</textarea>'
      + '<div id="sb-swatch-row" class="sb-swatch-row2">'+swatches+'</div>'
      + '<div id="sb-note-status" style="font-size:9px;color:#a3907a;margin-bottom:4px;min-height:11px"></div>'
      + '<input type="file" id="sb-img-input" accept="image/*" style="display:none">'
      + '<div class="sb-viewas-eyebrow">View as:</div>'
      + '<div class="sb-blue-row-md">'
      + '<button class="sb-viewas-btn" id="sb-view-topic">TOPIC</button>'
      + '<button class="sb-viewas-btn" id="sb-view-header">HEADER</button>'
      + (isBucket ? '<button class="sb-viewas-btn" id="sb-view-cluster">CLUSTER</button>' : '')
      + '</div>'
      + '<div class="sb-blue-row">'
      + '<button class="sb-blue-btn" id="sb-heart" title="Heart">❤️</button>'
      + '<button class="sb-blue-btn" id="sb-notes" title="Notes">✏️</button>'
      + '<button class="sb-blue-btn'+(isMisc?' misc-on':'')+'" id="sb-misc" title="Misc">'+(isMisc?'MISC ✓':'MISC')+'</button>'
      + (isMisc ? '<button class="sb-blue-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'🗑️')+'</button>' : '')
      + '<button class="sb-blue-btn" id="sb-gear" title="Appearance">⚙️</button>'
      + '</div>'
      + '<button class="sb-close-btn" id="sb-close">Close</button>'
      + '</div>';
    ov.classList.add('active');

    var statusBox=document.getElementById('sb-note-status');

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
    T().wire('sb-hdr-newh', function(){
      document.getElementById('sb-newheader-row').style.display='block';
    });
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
    if(textDisplay) textDisplay.addEventListener('click', function(){
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

    T().wire('sb-heart', async function(){
      try{
        var newCount=(item.heart_count||0)+1;
        var upd=await _sb.from('ideas').update({heart_count:newCount}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.heart_count=newCount;
        var hr=document.getElementById('sb-hearts-row'); if(hr) hr.innerHTML=_sboardHeartsHTML(newCount);
      }catch(err){ if(statusBox) statusBox.textContent='Heart needs the heart_count Supabase column.'; }
    });
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

    if(isMisc){
      T().wire('sb-trash', async function(){
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
      });
    }

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

    T().wire('sb-view-header', function(){ openSbHeaderPeek(item, function(){ openSbDetail(item); }); });
    T().wire('sb-view-topic', function(){ closeSbDetail(); _sboardDrillInto(item); });
    if(isBucket) T().wire('sb-view-cluster', function(){ closeSbDetail(); openClusterView(item); });
    T().wire('sb-close', closeSbDetail);
  }
  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; }
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
     same visual language as New Additions, reused at this fractal level.
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
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color')
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
      img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;pointer-events:none';
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

  async function _ideaEnsureWishTank(){
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) return {id:null, error:'Not signed in'};
      var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Wish Tank').is('cluster_id',null).limit(1);
      if(existing.error) return {id:null, error:'Select failed: '+existing.error.message};
      if(existing.data && existing.data.length) return {id:existing.data[0].id, error:null};
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Wish Tank',cluster_id:null,created_at:new Date().toISOString()}).select().single();
      if(ins.error || !ins.data) return {id:null, error:'Insert failed: '+(ins.error?ins.error.message:'no data returned')};
      var wishTankId=ins.data.id;
      /* One-time migration, only reached on first-ever creation for this member: every
         pre-existing root-level row (their whole original "What do you want?" Sea of
         Ideas) gets pulled into the new Wish Tank, since Wish Tank IS that root question —
         not a sibling of it. Reserved Trash header is left alone. Runs exactly once per
         member, at the moment Wish Tank is born, so it never sweeps up legitimate boards
         created afterward. */
      try{
        var mig=await _sb.from('ideas').update({cluster_id:wishTankId})
          .eq('user_id',user.id).is('cluster_id',null)
          .neq('id',wishTankId).neq('text_content','Trash');
        if(mig.error) console.warn('Wish Tank migration error:', mig.error);
      }catch(migErr){ console.warn('Wish Tank migration exception:', migErr); }
      return {id:wishTankId, error:null};
    }catch(e){ return {id:null, error:'Exception: '+(e&&e.message?e.message:String(e))}; }
  }

  async function _sboardEnsureHeaderNamed(name, parentId){
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user; if(!user) return null;
      var q=_sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content',name);
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q.limit(1);
      if(existing.error) console.warn('_sboardEnsureHeaderNamed select error:', existing.error);
      if(existing.data && existing.data.length) return existing.data[0].id;
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) console.warn('_sboardEnsureHeaderNamed insert error:', ins.error);
      return ins.data?ins.data.id:null;
    }catch(e){ console.warn('_sboardEnsureHeaderNamed exception:', e); return null; }
  }

  async function _sboardTopLevelBoards(){
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user; if(!user) return [];
      var res=await _sb.from('ideas').select('id,text_content').eq('user_id',user.id).eq('content_type','header').is('cluster_id',null);
      if(res.error){ console.warn('_sboardTopLevelBoards error:', res.error); return []; }
      return (res.data||[]).filter(function(r){ return r.text_content!=='Trash'; });
    }catch(e){ console.warn('_sboardTopLevelBoards exception:', e); return []; }
  }

  async function _sboardChildHeaders(parentId){
    if(!parentId) return [];
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user; if(!user) return [];
      var res=await _sb.from('ideas').select('id,text_content').eq('user_id',user.id).eq('content_type','header').eq('cluster_id',parentId);
      if(res.error){ console.warn('_sboardChildHeaders error:', res.error); return []; }
      return res.data||[];
    }catch(e){ console.warn('_sboardChildHeaders exception:', e); return []; }
  }

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
        ? headerSel.options[headerSel.selectedIndex].text : 'New Additions';
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
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type: imageUrl?'image':'text',
          text_content: text||null,
          image_url: imageUrl||null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        });
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_ideaSaveCard insert error:', ins.error); }
        else savedOk=true;
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_ideaSaveCard exception:', e); }

    if(sessionMode){
      if(savedOk){
        _isxClosePopup();
        _isxOptimisticTile(imageUrl?'image':'text', text||'(image)');
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
      var opts='<option value="'+boardId+'">New Additions</option>';
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
      if(ta) ta.addEventListener('input', function(){ _ideaDraftText=this.value; });
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
        ? headerSel.options[headerSel.selectedIndex].text : 'New Additions';
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
      if(savedOk){ _isxClosePopup(); _isxOptimisticTile('link', title||url); }
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
     cluster_id, the existing New Additions convention) — leaving it
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

  async function _isxInit(ctx){
    if(!_isxPath){
      var wt=await _ideaEnsureWishTank();
      _isxPath=[{id:wt.id, text:'Wish Tank'}];
    }
    if(ctx && ctx.boardId){
      var boards=await _sboardTopLevelBoards();
      var match=boards.filter(function(b){ return String(b.id)===String(ctx.boardId); })[0];
      _isxPath=[{id:ctx.boardId, text: match?match.text_content:'Board'}];
    }
    _isxHeaderId = (ctx && ctx.headerId && String(ctx.headerId)!==String(_isxCurrentTopicId())) ? ctx.headerId : null;
    _isxHeaderLabel='New';
    if(!_isxStart) _isxStart=Date.now();
  }

  async function renderIdeaSession(){
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.add('isx-full');
    if(!_isxPath) await _isxInit(_ideaCaptureCtx);
    _ideaCaptureCtx=null;
    await _isxRenderLadder();
    await _isxRenderBoard();
    if(!_isxWired){
      _isxWired=true;
      T().wire('isx-idea-btn', _isxOpenIdeaPanel);
      T().wire('isx-image-btn', _isxOpenImagePanel);
      T().wire('isx-link-btn', _isxOpenLinkPanel);
      T().wire('isx-rules-btn', _isxOpenRulesPanel);
      T().wire('isx-compass-btn', _isxOpenCompass);
      T().wire('isx-end-btn', _isxOpenRecap);
      T().wire('isx-fullscreen-btn', _isxToggleFullscreen);
      document.addEventListener('fullscreenchange', function(){
        var b=document.getElementById('isx-fullscreen-btn');
        if(b) b.textContent = document.fullscreenElement ? '\u21a9' : '\u26f6';
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

  async function _isxRenderLadder(){
    var parentWrap=document.getElementById('isx-rung-parent');
    var topicWrap=document.getElementById('isx-rung-topic');
    var headerSel=document.getElementById('isx-sel-header');
    if(!parentWrap||!topicWrap||!headerSel) return;

    if(_isxPath.length>1){
      var parentName=_isxPath[_isxPath.length-2].text;
      parentWrap.innerHTML='<div class="isx-rung-name">'+parentName+'</div>'
        +'<button class="isx-viewas" id="isx-parent-viewas">View as Topic</button>';
      T().wire('isx-parent-viewas', function(){
        _isxPath.pop(); _isxHeaderId=null; _isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard();
      });
    } else {
      parentWrap.innerHTML='<div class="isx-rung-name isx-blank">\u2014</div>';
    }

    if(_isxPath.length===1){
      var boards=await _sboardTopLevelBoards();
      var opts=boards.map(function(b){
        return '<option value="'+b.id+'"'+(String(b.id)===String(_isxPath[0].id)?' selected':'')+'>'+b.text_content+'</option>';
      }).join('')+'<option value="__add__">+ Add New Storyboard</option>';
      topicWrap.innerHTML='<select class="isx-select" id="isx-sel-topic">'+opts+'</select>';
      document.getElementById('isx-sel-topic').addEventListener('change', async function(){
        if(this.value==='__add__'){
          var name=prompt('Name the new Storyboard (new project):');
          if(name){
            var _sb=T().sb; var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
            var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:null,created_at:new Date().toISOString()}).select().single();
            if(ins.data){ _isxPath=[{id:ins.data.id, text:name}]; }
          } else { await _isxRenderLadder(); return; }
        } else {
          var text=this.options[this.selectedIndex].text;
          _isxPath=[{id:this.value, text:text}];
        }
        _isxHeaderId=null; _isxHeaderLabel='New';
        await _isxRenderLadder(); await _isxRenderBoard();
      });
    } else {
      topicWrap.innerHTML='<div class="isx-rung-name">'+_isxPath[_isxPath.length-1].text+'</div>';
    }

    var children=await _sboardChildHeaders(_isxCurrentTopicId());
    children.sort(function(a,b){ return (a.text_content||'').localeCompare(b.text_content||''); });
    var hOpts='<option value="__new__"'+(!_isxHeaderId?' selected':'')+'>New (default)</option>'
      +children.map(function(c){
        return '<option value="'+c.id+'"'+(String(c.id)===String(_isxHeaderId)?' selected':'')+'>'+c.text_content+'</option>';
      }).join('')
      +'<option value="__add__">+ Add New Header</option>';
    headerSel.innerHTML=hOpts;
    headerSel.onchange=async function(){
      if(this.value==='__add__'){
        var name=prompt('Name the new Header:');
        if(name){
          var newId=await _sboardEnsureHeaderNamed(name, _isxCurrentTopicId());
          if(newId){ _isxHeaderId=newId; _isxHeaderLabel=name; }
        }
        await _isxRenderLadder();
      } else if(this.value==='__new__'){
        _isxHeaderId=null; _isxHeaderLabel='New';
      } else {
        _isxHeaderId=this.value; _isxHeaderLabel=this.options[this.selectedIndex].text;
      }
      await _isxRenderBoard();
    };
    var viewAsBtn=document.getElementById('isx-header-viewas');
    if(viewAsBtn){
      viewAsBtn.disabled=!_isxHeaderId;
      viewAsBtn.onclick=function(){
        if(!_isxHeaderId) return;
        _isxPath.push({id:_isxHeaderId, text:_isxHeaderLabel});
        _isxHeaderId=null; _isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard();
      };
    }
  }

  async function _isxRenderBoard(){
    var canvas=document.getElementById('isx-canvas');
    var empty=document.getElementById('isx-empty');
    if(!canvas) return;
    canvas.innerHTML='';
    var clusterId=_isxCurrentClusterId();
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user||!clusterId) return;
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,color')
        .eq('user_id',user.id).eq('cluster_id',clusterId).in('content_type',['image','text','link'])
        .order('created_at',{ascending:true}).limit(300);
      var rows=(res&&res.data)||[];
      if(empty) empty.style.display = rows.length ? 'none' : 'block';
      var w=Math.max(canvas.clientWidth,600), h=Math.max(canvas.clientHeight,600);
      rows.forEach(function(r){ canvas.appendChild(_isxMakeTile(r, w, h)); });
    }catch(e){ console.warn('_isxRenderBoard failed:', e); }
  }

  function _isxMakeTile(row, w, h){
    var t=document.createElement('div');
    t.className='isx-tile';
    var x=16+Math.random()*Math.max(40,w-140), y=16+Math.random()*Math.max(40,h-100);
    t.style.left=Math.round(x)+'px'; t.style.top=Math.round(y)+'px';
    var body='';
    if(row.content_type==='image'){ body='<img src="'+row.image_url+'" style="width:100%;height:52px;object-fit:cover;border-radius:6px;margin-bottom:4px">'; }
    else if(row.content_type==='link'){ var parsed=_linkParseText(row.text_content); body='<div class="isx-tile-ic">\ud83d\udd17</div>'+(parsed.title||parsed.url); }
    else { body='<div class="isx-tile-ic">\ud83d\udca1</div>'+(row.text_content||''); }
    t.innerHTML=body;
    return t;
  }

  function _isxOptimisticTile(contentType, label){
    var canvas=document.getElementById('isx-canvas');
    var empty=document.getElementById('isx-empty');
    if(!canvas) return;
    if(empty) empty.style.display='none';
    var w=Math.max(canvas.clientWidth,600), h=Math.max(canvas.clientHeight,600);
    var icon = contentType==='link' ? '\ud83d\udd17' : (contentType==='image' ? '\ud83d\udcf7' : '\ud83d\udca1');
    var t=document.createElement('div');
    t.className='isx-tile';
    var x=16+Math.random()*Math.max(40,w-140), y=16+Math.random()*Math.max(40,h-100);
    t.style.left=Math.round(x)+'px'; t.style.top=Math.round(y)+'px';
    t.innerHTML='<div class="isx-tile-ic">'+icon+'</div>'+(label||'');
    canvas.appendChild(t);
    _isxCount++;
    var pill=document.getElementById('isx-count-pill');
    if(pill) pill.textContent='\u2728 '+_isxCount+' caught this session';
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

  function _isxOpenIdeaPanel(){
    _isxOpenPopup('<div class="isx-pcard"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udca1 Idea</div>'
      +'<div class="isx-psub">Ideas are fragile. Write it down before it escapes.</div>'
      +'<div class="isx-ploc">Saving to: '+_isxLocationLabel()+'</div>'
      +'<textarea id="isx-idea-text" placeholder="What if\u2026?"></textarea>'
      +'<button class="isx-save" id="isx-p-save">SAVE</button></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.getElementById('isx-p-save').onclick=function(){ _ideaSaveCard(null); };
    var ta=document.getElementById('isx-idea-text'); if(ta) ta.focus();
  }

  function _isxOpenImagePanel(){
    _isxImgTab='paste'; _isxImgPendingUrl=null; _isxImgPendingFile=null;
    _isxOpenPopup('<div class="isx-pcard"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udcf7 Image</div>'
      +'<div class="isx-psub">Any format in, one clean JPEG out.</div>'
      +'<div class="isx-ploc">Saving to: '+_isxLocationLabel()+'</div>'
      +'<div class="isx-src-row">'
        +'<button class="isx-src-btn on" data-src="paste">Paste / Upload</button>'
        +'<button class="isx-src-btn" data-src="unsplash">Unsplash</button>'
        +'<button class="isx-src-btn" data-src="ai">Generate</button>'
      +'</div>'
      +'<div id="isx-img-body"></div>'
      +'<div class="isx-heic">HEIC, PNG, WebP, etc. \u2014 auto-converted to JPEG.</div>'
      +'</div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.querySelectorAll('.isx-src-btn').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('.isx-src-btn').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on'); _isxImgTab=b.getAttribute('data-src'); _isxRenderImageBody();
      };
    });
    _isxRenderImageBody();
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
    _isxOpenPopup('<div class="isx-pcard"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udd17 Link</div>'
      +'<div class="isx-psub">Point us to it \u2014 video, sound, or any reference.</div>'
      +'<div class="isx-ploc">Saving to: '+_isxLocationLabel()+'</div>'
      +'<input type="text" id="isx-link-url" placeholder="Paste a URL\u2026" style="margin-bottom:8px">'
      +'<div class="isx-dropzone" id="isx-link-preview" style="height:80px">Preview appears here once the link resolves</div>'
      +'<button class="isx-save" id="isx-p-save">SAVE</button></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
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
    _isxOpenPopup('<div class="isx-pcard" style="width:260px"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle" style="font-size:20px">\ud83d\udcdc Rules of Creative Thinking</div>'
      +'<div style="font-size:12px;line-height:1.6;color:#1A3A5C;margin-top:6px">There are no bad ideas here.<br>Quantity over judgment.<br>Half-formed is welcome.<br>Nothing needs solving right now.</div>'
      +'<button class="isx-save" id="isx-p-save">GOT IT</button></div>');
    document.getElementById('isx-p-close').onclick=_isxClosePopup;
    document.getElementById('isx-p-save').onclick=_isxClosePopup;
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

  function _isxOpenRecap(){
    var mins=Math.max(1, Math.round((Date.now()-(_isxStart||Date.now()))/60000));
    var layer=document.getElementById('isx-popup-layer');
    if(!layer) return;
    layer.innerHTML='<div class="isx-recap"><h2>Nice session.</h2>'
      +'<div class="isx-stat"><b>'+_isxCount+'</b> ideas caught</div>'
      +'<div class="isx-stat"><b>'+mins+'</b> minute'+(mins===1?'':'s')+' in Create mode</div>'
      +'<button class="isx-save" id="isx-p-done">DONE</button></div>';
    layer.classList.add('active');
    document.getElementById('isx-p-done').onclick=function(){
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.remove('isx-full');
      if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
      _isxClosePopup(); T().returnToMG();
    };
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
