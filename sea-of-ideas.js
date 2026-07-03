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
        +'#sc-divider{border-bottom:1.5px solid #cfe4f2;margin:0 0 12px;width:100%}'
        +'#sc-status{font-size:10px;color:#7a6040;text-align:right;margin-bottom:6px}'
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
        +'#fg-root.sb-wide #sc-board-wrap{display:flex;flex-wrap:wrap;gap:22px}'
        +'#fg-root.sb-wide #sc-board-wrap>div{flex:0 0 auto}'
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
        +'.sc-peek-spacer{width:32px;flex:0 0 auto}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:12px 16px 10px;margin-bottom:6px">'
      +'<div style="display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:10px">'
      +'<div id="sc-parent-hit" class="sc-hdr-side" style="text-align:left">'
      +'<div class="sc-hdr-eyebrow">Parent</div>'
      +'<div id="sc-parent-label">Sea of Ideas</div>'
      +'<div id="sc-pagenum" style="font-size:8px;letter-spacing:2px;color:#7fa8cc;height:10px;opacity:0;transition:opacity .3s">9221</div>'
      +'</div>'
      +'<div style="text-align:center">'
      +'<div class="sc-hdr-eyebrow">Topic</div>'
      +'<div id="sc-topic-box">What do you want?</div>'
      +'</div>'
      +'<div class="sc-hdr-side" style="text-align:right"><button class="sc-ov-btn" id="b-sc-purpose">Purpose</button></div>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      +'<div id="sc-board-wrap"></div>'
      +'<div id="sb-detail-overlay" class="sb-overlay"></div>'
      +'<div id="sc-controls">'
      +'<button class="sc-ov-btn" id="b-sc-promote">🔧 Fix old headers</button>'
      +'<button class="sc-ov-btn" id="b-sc-mode-toggle">⛶ Desktop size</button>'
      +'<button class="sc-ov-btn" id="b-sc-quickadd">+ Add idea</button>'
      +'<button class="sc-ov-btn" id="b-sc-upload">📤 Add your photos</button>'
      +'<input type="file" id="sc-upload-input" accept="image/*" multiple style="display:none">'
      +'</div>'
      +'</div>'
      +'<div class="bar2 bar-dream-pp"><button class="tb" id="b-sc-back">⬅️</button><button class="tb" id="b-sc-mg">🔍</button><button class="tb" id="b-sc-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas-cluster', '9221');
    T().registerCtx('s-sea-of-ideas-cluster', 'Sea of Ideas — Cluster');
    T().wire('b-sc-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      _sboardCurrentTopicId=null; _sboardBoardStack=[]; _sboardFilter=null;
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sc-mg', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      T().goMG();
    });
    T().wire('b-sc-fwd', function(){
      _sboardCurrentTopicId=null; _sboardBoardStack=[]; _sboardFilter=null;
      if(T().currentFile()==='dream.html' && document.getElementById('s-idea-button')){ T().nav('s-idea-button'); }
      else { T().closeMG(); T().returnToMG(); }
    });
    T().wire('b-sc-mode-toggle', function(){
      _sboardDesktop=!_sboardDesktop;
      document.getElementById('b-sc-mode-toggle').innerHTML=_sboardDesktop?'↩ Back to mobile size':'⛶ Desktop size';
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop);
      renderSeaBoard();
    });
    T().wire('b-sc-purpose', openPurposeEditor);
    T().wire('b-sc-promote', openSbPromoteConfirm);
    T().wire('b-sc-quickadd', openQuickAddIdea);
    T().wire('b-sc-upload', function(){ document.getElementById('sc-upload-input').click(); });
    var uploadInput=document.getElementById('sc-upload-input');
    if(uploadInput) uploadInput.addEventListener('change', function(e){ _sboardBatchUpload(e.target.files); e.target.value=''; });

    T().wire('sc-topic-box', function(e){
      e.stopPropagation();
      if(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId]){
        openSbHeaderDetail(_sboardHeadersById[_sboardCurrentTopicId]);
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
  var _sboardBoardStack = [];
  var _sboardTrashId = null;
  var _sboardMiscId = null;
  var _sboardPurposeId = null;
  var _sboardNewAdditionsId = null;
  var _sboardActiveId = null;
  var _sboardHeadersById = {};
  var _sboardHeaderList = [];
  var _sboardTopLevelOrder = [];

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

  function _sboardMakeTile(item, size, straight){
    size=size||(_sboardDesktop?76:70);
    var rot=straight?0:(Math.random()*8-4).toFixed(1);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'');
    tile.draggable=true;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;width:'+size+'px;height:'+size+'px;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s';
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    if(item.content_type==='image' && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
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
    tile.addEventListener('dblclick', function(){ openSbDetail(item); });
    return tile;
  }

  function _sboardMakeHeaderStackTile(headerRow, size, straight){
    size=size||(_sboardDesktop?76:70);
    var rot=straight?0:(Math.random()*6-3).toFixed(1);
    var wrap=document.createElement('div');
    wrap.className='sc-stack-tile';
    wrap.draggable=true;
    wrap.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); });
    wrap.style.cssText='position:relative;width:'+size+'px;height:'+size+'px;cursor:pointer;transform:rotate('+rot+'deg)';
    var back2=document.createElement('div');
    back2.className='sc-stack-layer';
    back2.style.cssText='position:absolute;top:5px;left:5px;width:100%;height:100%;background:#fff;border:1.5px solid #111;border-radius:10px';
    var back1=document.createElement('div');
    back1.className='sc-stack-layer';
    back1.style.cssText='position:absolute;top:2.5px;left:2.5px;width:100%;height:100%;background:#fff;border:1.5px solid #111;border-radius:10px';
    var front=document.createElement('div');
    front.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;border:1.5px solid #111;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:5px;box-sizing:border-box;text-align:center;overflow:hidden';
    var p=document.createElement('p');
    p.textContent=headerRow.text_content||'(untitled)';
    var fitSize=_sboardFitFontSize(headerRow.text_content, size>=90?15:13, 8);
    p.style.cssText='margin:0;font-weight:700;line-height:1.15;color:#1a3a5c;white-space:normal;word-break:break-word;font-size:'+fitSize+'px';
    front.appendChild(p);
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    wrap.addEventListener('click', function(e){ e.stopPropagation(); openSbHeaderPeek(headerRow); });
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); _sboardHeaderQuickMenu(headerRow); });
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
      var newAdditionsId=await _sboardEnsureNewAdditionsHeader();
      _sboardNewAdditionsId=newAdditionsId;

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order')
        .eq('user_id', user.id).in('content_type',['image','text','header'])
        .order('created_at',{ascending:true}).limit(300);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      var headerRows=rows.filter(function(r){ return r.content_type==='header'; });
      _sboardHeadersById={}; headerRows.forEach(function(r){ _sboardHeadersById[r.id]=r; });
      var trashRow=headerRows.find(function(r){ return r.text_content==='Trash'; });
      var miscRow=headerRows.find(function(r){ return r.text_content==='MISC'; });
      var purposeRow=headerRows.find(function(r){ return r.text_content==='Purpose'; });
      var newAdditionsRow=headerRows.find(function(r){ return String(r.id)===String(newAdditionsId); });
      _sboardTrashId = trashRow ? trashRow.id : null;
      _sboardMiscId = miscRow ? miscRow.id : null;
      _sboardPurposeId = purposeRow ? purposeRow.id : null;
      var purposeBtn=document.getElementById('b-sc-purpose');
      if(purposeBtn) purposeBtn.title = (purposeRow && purposeRow.notes) ? purposeRow.notes : 'Why are we doing this?';

      var reservedIds=[_sboardTrashId,_sboardMiscId,_sboardPurposeId,newAdditionsId].filter(Boolean).map(String);
      var contentHeaders=headerRows.filter(function(r){ return reservedIds.indexOf(String(r.id))===-1; });
      _sboardHeaderList=contentHeaders.concat(newAdditionsRow?[newAdditionsRow]:[]);

      var ideaRows=rows.filter(function(r){ return r.content_type==='image'||r.content_type==='text'; });
      wrap.innerHTML='';
      if(ideaRows.length===0){
        if(statusEl) statusEl.textContent='No ideas saved yet — add a few first.';
        _sboardUpdateHeaderChrome();
        return;
      }

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

      var cellSize=_sboardDesktop?92:78;
      var cols=2;

      function renderGroup(headerRow, depth){
        var name=headerRow.text_content||'(untitled cluster)';
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='New Additions');
        var straight=(name!=='New Additions');
        var subs=subHeadersOf[headerRow.id]||[];
        var directItems=childrenOfHeader[headerRow.id]||[];
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto';
        var hd=document.createElement('button');
        hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'');
        var hdFitSize=_sboardFitFontSize(name, 14, 9);
        hd.style.cssText='position:static;transform:none;display:block;width:100%;box-sizing:border-box;padding:7px 10px;font-size:'+hdFitSize+'px;font-weight:700;margin-bottom:6px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2';
        hd.textContent=name;
        if(!isReserved) hd.addEventListener('dblclick', function(e){ e.stopPropagation(); _sboardHeaderQuickMenu(headerRow); });
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
          var grid=document.createElement('div');
          grid.style.cssText='display:grid;grid-template-columns:repeat('+cols+','+cellSize+'px);gap:8px';
          subs.forEach(function(sub){ grid.appendChild(_sboardMakeHeaderStackTile(sub, cellSize, straight)); });
          directItems.forEach(function(item){ grid.appendChild(_sboardMakeTile(item, cellSize, straight)); });
          block.appendChild(grid);
        }
        return block;
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.style.cssText='display:flex;flex-wrap:nowrap;gap:12px;align-items:flex-start';

      if(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId]){
        var directIdeas=childrenOfHeader[_sboardCurrentTopicId]||[];
        var childHeaders=subHeadersOf[_sboardCurrentTopicId]||[];
        if(directIdeas.length===0 && childHeaders.length===0){
          if(statusEl) statusEl.textContent='Nothing under this Header yet.';
        } else {
          if(directIdeas.length){
            var directBlock=document.createElement('div');
            directBlock.style.cssText='flex:0 0 auto';
            var directGrid=document.createElement('div');
            directGrid.style.cssText='display:grid;grid-template-columns:repeat('+cols+','+cellSize+'px);gap:8px';
            directIdeas.forEach(function(item){ directGrid.appendChild(_sboardMakeTile(item, cellSize, true)); });
            directBlock.appendChild(directGrid);
            groupsWrap.appendChild(directBlock);
          }
          var childHeadersSorted=childHeaders.slice().sort(function(a,b){
            var ao=(a.sort_order===null||a.sort_order===undefined)?Infinity:a.sort_order;
            var bo=(b.sort_order===null||b.sort_order===undefined)?Infinity:b.sort_order;
            return ao-bo;
          });
          _sboardTopLevelOrder=childHeadersSorted.map(function(h){ return h.id; });
          childHeadersSorted.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
          if(statusEl) statusEl.textContent='';
        }
      } else {
        if(newAdditionsRow) groupsWrap.appendChild(renderGroup(newAdditionsRow, 0));
        orderedTop.forEach(function(h){ groupsWrap.appendChild(renderGroup(h, 0)); });
        if(statusEl) statusEl.textContent='';
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
          var path=user.id+'/'+Date.now()+'-'+i+'-'+fname.replace(/[^a-zA-Z0-9._-]/g,'_');
          var up=await _sb.storage.from('sea-of-ideas').upload(path, f);
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
    _sboardBoardStack.push(_sboardCurrentTopicId);
    _sboardCurrentTopicId=headerRow.id;
    _sboardFilter=headerRow.id;
    renderSeaBoard();
  }

  function _sboardGoUpOneLevel(){
    var parentId=_sboardBoardStack.length?_sboardBoardStack.pop():null;
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
    if(_sboardCurrentTopicId && _sboardHeadersById[_sboardCurrentTopicId]){
      var topicRow=_sboardHeadersById[_sboardCurrentTopicId];
      if(topicBox) topicBox.textContent=topicRow.text_content||'(untitled)';
      if(areaEl) areaEl.style.background='#3a2564';
      var parentId=_sboardBoardStack[_sboardBoardStack.length-1];
      var parentRow=parentId?_sboardHeadersById[parentId]:null;
      if(parentLabel) parentLabel.textContent=parentRow?parentRow.text_content:'Sea of Ideas';
      if(parentHit) parentHit.classList.remove('inert');
    } else {
      if(topicBox) topicBox.textContent='What do you want?';
      if(areaEl) areaEl.style.background='#1a3a5c';
      if(parentLabel) parentLabel.textContent='Sea of Ideas';
      if(parentHit) parentHit.classList.add('inert');
    }
  }

  async function _sboardMoveCard(itemId, headerId){
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:headerId}).eq('id',itemId);
      if(upd.error) throw upd.error;
      renderSeaBoard();
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
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

  async function openSbHeaderPeek(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-peek-card">'
      +'<div class="sc-peek-topbar"><button id="sb-peek-back">⬅️</button><div class="sc-peek-title">'+safeName+'</div><div class="sc-peek-spacer"></div></div>'
      +'<div id="sb-peek-body" style="text-align:center;font-size:11px;font-style:italic;color:#999;padding:20px 0">Loading…</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-peek-back', closeSbDetail);
    var body=document.getElementById('sb-peek-body');
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order')
        .eq('user_id',user.id).eq('cluster_id',headerRow.id).in('content_type',['image','text','header'])
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
      subRows.forEach(function(sub){ grid.appendChild(_sboardMakeHeaderStackTile(sub, 84, true)); });
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

  async function openSbPromoteConfirm(){
    var ov=document.getElementById('sb-detail-overlay');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">Checking for old ideas ending in : or ?…</div>';
    ov.classList.add('active');
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,text_content')
        .eq('user_id',user.id).eq('content_type','text');
      if(res.error) throw new Error(res.error.message);
      var matches=(res.data||[]).filter(function(r){ return _sboardIsAutoHeaderText(r.text_content||''); });
      if(!matches.length){
        ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
          +'<div style="font-size:12px;color:#7a6040;margin-bottom:10px">No old ideas ending in : or ? found — nothing to fix.</div>'
          +'<button class="sc-ov-btn" id="sb-promote-close">Close</button></div>';
        T().wire('sb-promote-close', closeSbDetail);
        return;
      }
      var list=matches.slice(0,8).map(function(r){ return '<div style="font-size:11px;color:#1a3a5c;text-align:left;padding:2px 0">• '+(r.text_content||'').replace(/</g,'&lt;')+'</div>'; }).join('');
      var more=matches.length>8?'<div style="font-size:10px;color:#999;margin-top:4px">…and '+(matches.length-8)+' more</div>':'';
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:8px">Turn these into Headers?</div>'
        +'<div style="max-height:160px;overflow-y:auto;margin-bottom:10px">'+list+more+'</div>'
        +'<div style="font-size:10px;font-style:italic;color:#a3907a;margin-bottom:10px">'+matches.length+' idea'+(matches.length===1?'':'s')+' ending in : or ? — this changes them everywhere, in every cluster.</div>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-promote-go" style="flex:1">Yes, fix them</button><button class="sc-ov-btn" id="sb-promote-cancel" style="flex:1">Cancel</button></div>'
        +'</div>';
      T().wire('sb-promote-cancel', closeSbDetail);
      T().wire('sb-promote-go', async function(){
        var goBtn=document.getElementById('sb-promote-go');
        if(goBtn){ goBtn.disabled=true; goBtn.textContent='Fixing…'; }
        var failCount=0;
        for(var i=0;i<matches.length;i++){
          var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id',matches[i].id);
          if(upd.error) failCount++;
        }
        closeSbDetail();
        renderSeaBoard();
        var statusEl=document.getElementById('sc-status');
        if(statusEl){
          statusEl.textContent=failCount?('Fixed '+(matches.length-failCount)+', '+failCount+' failed.'):('Fixed '+matches.length+' header'+(matches.length===1?'':'s')+'.');
          statusEl.classList.toggle('err', !!failCount);
        }
      });
    }catch(err){
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center"><div style="color:#b8562f;font-size:11px;margin-bottom:10px">'+err.message+'</div><button class="sc-ov-btn" id="sb-promote-close">Close</button></div>';
      T().wire('sb-promote-close', closeSbDetail);
    }
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
      var id=await _sboardEnsurePurposeHeader();
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

  async function _sboardEnsureMiscHeader(){
    if(_sboardMiscId) return _sboardMiscId;
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','MISC').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardMiscId=existing.data[0].id; return _sboardMiscId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'MISC',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('MISC setup failed: '+ins.error.message);
    _sboardMiscId=ins.data.id;
    return _sboardMiscId;
  }

  async function _sboardEnsurePurposeHeader(){
    if(_sboardPurposeId) return _sboardPurposeId;
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Purpose').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _sboardPurposeId=ins.data.id;
    return _sboardPurposeId;
  }

  async function _sboardEnsureNewAdditionsHeader(){
    if(_sboardNewAdditionsId) return _sboardNewAdditionsId;
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','New Additions').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardNewAdditionsId=existing.data[0].id; return _sboardNewAdditionsId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'New Additions',created_at:new Date().toISOString()}).select().single();
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

  function openSbDetail(item){
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var isTrashed=String(item.cluster_id)===String(_sboardTrashId) && _sboardTrashId;
    var isMisc=String(item.cluster_id)===String(_sboardMiscId) && _sboardMiscId;
    var curHeaderRow = item.cluster_id ? _sboardHeadersById[item.cluster_id] : null;
    var curHeaderText = curHeaderRow ? curHeaderRow.text_content : '';
    var headerLabel = curHeaderText || 'New Additions';
    var heartCount = item.heart_count||0;

    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px">Cluster</div>'
      + '<div id="sb-header-field" style="font-size:11px;color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:10px;padding:4px 10px;border:1px dashed #a9cce3;border-radius:6px;display:inline-block">'+headerLabel+' ✎</div>'
      + '<div id="sb-header-edit" style="display:none;margin-bottom:10px">'
      + '<input id="sb-header-input" list="sb-header-options" type="text" placeholder="Header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:6px">'
      + '<datalist id="sb-header-options">'+_sboardHeaderList.map(function(h){ return '<option value="'+h.text_content+'">'; }).join('')+'</datalist>'
      + '<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-header-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-header-newcluster" style="flex:1">+ New cluster</button><button class="sc-ov-btn" id="sb-header-cancel" style="flex:1">Cancel</button></div>'
      + '</div>'
      + (item.content_type==='image' && item.image_url
          ? '<img src="'+item.image_url+'" style="width:100%;border-radius:10px;margin-bottom:10px">'
          : '<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">'+(item.text_content||'(untitled)')+'</div>')
      + '<div id="sb-hearts-row" style="font-size:14px;min-height:18px;margin-bottom:6px">'+_sboardHeartsHTML(heartCount)+'</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + '<button class="sb-icon-btn" id="sb-heart" title="Heart">❤️</button>'
      + '<button class="sb-icon-btn" id="sb-notes" title="Notes">✏️</button>'
      + '<button class="sb-icon-btn misc" id="sb-misc" title="Misc">'+(isMisc?'MISC ✓':'MISC')+'</button>'
      + '<button class="sb-icon-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'🗑️')+'</button>'
      + '</div>'
      + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:none;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px">'+(item.notes||'')+'</textarea>'
      + '<div id="sb-note-status" style="font-size:9px;color:#a3907a;margin-bottom:6px;min-height:11px"></div>'
      + '<button class="sc-ov-btn" id="sb-close" style="width:100%">Close</button>'
      + '</div>';
    ov.classList.add('active');

    T().wire('sb-header-field', function(){
      document.getElementById('sb-header-edit').style.display='block';
      var inp=document.getElementById('sb-header-input'); inp.value=curHeaderText; inp.focus();
    });
    T().wire('sb-header-cancel', function(){ document.getElementById('sb-header-edit').style.display='none'; });
    T().wire('sb-header-newcluster', async function(){
      var statusBox=document.getElementById('sb-note-status');
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var name='Cluster '+_sboardNextClusterNumber();
        var parentId=_sboardFilter||null;
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw new Error(ins.error.message);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=ins.data.id;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    T().wire('sb-header-save', async function(){
      var name=document.getElementById('sb-header-input').value.trim();
      var statusBox=document.getElementById('sb-note-status');
      if(!name){
        document.getElementById('sb-header-edit').style.display='none';
        return;
      }
      try{
        var targetId=null;
        var existing=_sboardHeaderList.find(function(h){ return h.text_content.toLowerCase()===name.toLowerCase(); });
        if(existing){ targetId=existing.id; }
        else {
          var user=(await _sb.auth.getUser()).data.user;
          if(!user) throw new Error('Not signed in.');
          var parentId=_sboardFilter||null;
          var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString()}).select().single();
          if(ins.error) throw new Error(ins.error.message);
          targetId=ins.data.id;
        }
        var upd=await _sb.from('ideas').update({cluster_id:targetId}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=targetId;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    T().wire('sb-heart', async function(){
      try{
        var newCount=(item.heart_count||0)+1;
        var upd=await _sb.from('ideas').update({heart_count:newCount}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.heart_count=newCount;
        var hr=document.getElementById('sb-hearts-row'); if(hr) hr.innerHTML=_sboardHeartsHTML(newCount);
      }catch(err){
        document.getElementById('sb-note-status').textContent='Heart needs the heart_count Supabase column.';
      }
    });
    T().wire('sb-notes', function(){
      document.getElementById('sb-notes-box').style.display='block';
    });
    var notesBox=document.getElementById('sb-notes-box');
    if(notesBox) notesBox.addEventListener('blur', async function(e){
      try{
        var upd=await _sb.from('ideas').update({notes:e.target.value}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.notes=e.target.value;
      }catch(err){
        document.getElementById('sb-note-status').textContent='Notes need the notes Supabase column.';
      }
    });
    T().wire('sb-misc', async function(){
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=await _sboardEnsureMiscHeader();
        var newCluster=isMisc?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    T().wire('sb-trash', async function(){
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=await _sboardEnsureTrashHeader();
        var newCluster=isTrashed?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    T().wire('sb-close', closeSbDetail);
  }
  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; }
    _sboardActiveId=null;
  }

  window.T2TSea = {
    openTrash: async function(){
      try{
        var tid=await _sboardEnsureTrashHeader();
        _sboardFilter=tid;
      }catch(e){ _sboardFilter=null; }
      T().nav('s-sea-of-ideas-cluster');
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    injectSeaOfIdeas();
    injectSeaOfIdeasCluster();
  });

})();
