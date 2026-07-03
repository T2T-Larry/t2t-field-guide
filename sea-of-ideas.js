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
        +'#sc-canvas{position:relative;width:100%;height:330px;border:1.5px solid #b0a898;border-radius:10px;background:#f0f7fc;background-image:radial-gradient(circle,rgba(91,155,213,0.18) 1px,transparent 1px);background-size:22px 22px;overflow:hidden;touch-action:none}'
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
        +'#sc-topic-box{text-align:center;background:#eaf3fb;border:1px solid #a9cce3;border-radius:6px;padding:6px 14px;font-size:18px;font-weight:700;color:#1a3a5c}'
        +'#s-sea-of-ideas-cluster .sw{align-items:stretch}'
        +'#sc-divider{border-bottom:1.5px solid #cfe4f2;margin:0 0 12px;width:100%}'
        +'#sc-status{font-size:10px;color:#7a6040;text-align:right;margin-bottom:6px}'
        +'#sc-status.err{color:#b8562f}'
        +'.sc-overlay{position:absolute;inset:0;z-index:100;background:rgba(26,58,92,0.4);display:none;align-items:center;justify-content:center}'
        +'.sc-overlay.active{display:flex}'
        +'.sc-overlay-card{background:#fff;border-radius:14px;padding:16px;width:min(260px,84%);box-shadow:0 10px 24px rgba(0,0,0,0.3)}'
        +'.sc-overlay-card label{display:block;font-size:11px;font-weight:700;color:#1a3a5c;margin-bottom:6px}'
        +'.sc-overlay-card input{width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;color:#1a3a5c;margin-bottom:10px;box-sizing:border-box}'
        +'.sc-overlay-actions{display:flex;gap:8px;justify-content:flex-end}'
        +'.sc-ov-btn{border:1px solid #cfe4f2;background:#fff;padding:6px 12px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;color:#5b9bd5}'
        +'.sc-ov-btn.save{background:#5b9bd5;color:#fff;border-color:#5b9bd5}'
        +'.sb-overlay{position:fixed;inset:0;z-index:200;background:rgba(26,58,92,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
        +'.sb-overlay.active{display:flex}'
        +'#sc-board-wrap{text-align:left;overflow-x:auto;padding-bottom:8px}'
        +'#sc-controls{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0 2px}'
        +'#sc-controls .sc-ov-btn{padding:5px 11px}'
        +'#fg-root.sb-wide{max-width:1200px!important}'
        +'#fg-root.sb-wide #sc-board-wrap{display:flex;flex-wrap:wrap;gap:22px}'
        +'#fg-root.sb-wide #sc-board-wrap>div{flex:0 0 auto}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:12px 16px 10px;margin-bottom:6px">'
      +'<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px">'
      +'<div id="sc-title-hit" style="cursor:default;user-select:none;text-align:left">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;font-weight:700;color:#fff;margin-bottom:1px">Sea of Ideas</div>'
      +'<div style="font-size:11px;font-style:italic;color:#b8d2ea;margin-bottom:2px">An idea storyboard</div>'
      +'<div id="sc-pagenum" style="font-size:9px;letter-spacing:2px;color:#7fa8cc;height:12px;opacity:0;transition:opacity .3s">9221</div>'
      +'</div>'
      +'<div style="text-align:center">'
      +'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px">Topic</div>'
      +'<div id="sc-topic-box">What do you want?</div>'
      +'</div>'
      +'<div style="text-align:right"><button class="sc-ov-btn" id="b-sc-purpose">Purpose</button></div>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      +'<div id="sc-board-wrap"></div>'
      +'<div id="sc-canvas-wrap" style="display:none">'
      +'<div id="sc-canvas"><div class="sc-overlay" id="sc-overlay"><div class="sc-overlay-card"><label for="sc-name-input">What do you see here?</label><input id="sc-name-input" type="text" maxlength="60" placeholder="e.g. Time with people I love"><div class="sc-overlay-actions"><button class="sc-ov-btn" id="sc-name-cancel">Cancel</button><button class="sc-ov-btn save" id="sc-name-save">Save</button></div></div></div></div>'
      +'<div style="display:flex;gap:14px;justify-content:center;margin-top:10px">'
      +'<span id="b-sc-shuffle" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer">↻ New batch</span>'
      +'<span id="b-sc-back-to-board" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer">↩ Back to storyboard</span>'
      +'</div>'
      +'</div>'
      +'<div id="sb-detail-overlay" class="sb-overlay"></div>'
      +'<div id="sc-controls">'
      +'<button class="sc-ov-btn" id="b-sc-filterback" style="display:none">⬅ All clusters</button>'
      +'<button class="sc-ov-btn" id="b-sc-mode-toggle">⛶ Desktop size</button>'
      +'<button class="sc-ov-btn" id="b-sc-newcluster">✋ Cluster new ideas</button>'
      +'<button class="sc-ov-btn" id="b-sc-upload">📤 Add your photos</button>'
      +'<input type="file" id="sc-upload-input" accept="image/*" multiple style="display:none">'
      +'</div>'
      +'<div class="sp"></div></div>'
      +'<div class="bar2 bar-dream-pp"><button class="tb" id="b-sc-back">⬅️</button><button class="tb" id="b-sc-mg">🔍</button><button class="tb" id="b-sc-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    T().registerPageNum('s-sea-of-ideas-cluster', '9221');
    T().registerCtx('s-sea-of-ideas-cluster', 'Sea of Ideas — Cluster');
    T().wire('b-sc-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      var viaChapter = T().consumeSeaChapterEntry();
      if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
      else { T().returnToMG(); }
    });
    T().wire('b-sc-mg', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      T().goMG();
    });
    T().wire('b-sc-fwd', function(){
      if(T().currentFile()==='dream.html' && document.getElementById('s-idea-button')){ T().nav('s-idea-button'); }
      else { T().closeMG(); T().returnToMG(); }
    });
    T().wire('b-sc-shuffle', function(){ renderSeaCanvas(true); });
    T().wire('b-sc-back-to-board', function(){ _sboardMode='board'; renderSeaOfIdeasCluster(); });
    T().wire('b-sc-newcluster', function(){ _sboardMode='canvas'; renderSeaOfIdeasCluster(); });
    T().wire('b-sc-mode-toggle', function(){
      _sboardDesktop=!_sboardDesktop;
      document.getElementById('b-sc-mode-toggle').innerHTML=_sboardDesktop?'↩ Back to mobile size':'⛶ Desktop size';
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop && _sboardMode==='board');
      renderSeaBoard();
    });
    T().wire('b-sc-filterback', function(){ _sboardFilter=null; renderSeaBoard(); });
    T().wire('b-sc-purpose', openPurposeEditor);
    T().wire('b-sc-upload', function(){ document.getElementById('sc-upload-input').click(); });
    var uploadInput=document.getElementById('sc-upload-input');
    if(uploadInput) uploadInput.addEventListener('change', function(e){ _sboardBatchUpload(e.target.files); e.target.value=''; });

    (function(){
      var clicks=0, timer=null;
      var hit=document.getElementById('sc-title-hit');
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

    var overlay=document.getElementById('sc-overlay');
    var nameInput=document.getElementById('sc-name-input');
    var activeGroupIds=null;
    function openNameOverlay(groupIds, existingText){
      activeGroupIds=groupIds;
      nameInput.value=existingText||'';
      overlay.classList.add('active');
      setTimeout(function(){ nameInput.focus(); },50);
    }
    function closeNameOverlay(){ overlay.classList.remove('active'); activeGroupIds=null; }
    T().wire('sc-name-cancel', closeNameOverlay);
    T().wire('sc-name-save', async function(){
      var text=nameInput.value.trim();
      if(!text||!activeGroupIds){ closeNameOverlay(); return; }
      var groupIds=activeGroupIds; closeNameOverlay();
      var statusEl=document.getElementById('sc-status');
      if(statusEl){ statusEl.textContent='Saving header…'; statusEl.classList.remove('err'); }
      try{
        var _sb=T().sb;
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:text,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw new Error('Header insert failed: '+ins.error.message);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).in('id',groupIds);
        if(upd.error) throw new Error('cluster_id update failed: '+upd.error.message+' — the `cluster_id` column may still need to be added to `ideas`.');
        groupIds.forEach(function(gid){
          var item=_scCurrentBatch.find(function(i){ return String(i.id)===String(gid); });
          if(item) item._headerText=text;
        });
        if(statusEl) statusEl.textContent=_scCurrentBatch.length+' ideas · header saved ✓';
        _scUpdateGlows();
      }catch(err){
        if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
      }
    });
    window._scOpenNameOverlay = openNameOverlay;
    T().registerScreenActivate('s-sea-of-ideas-cluster', renderSeaOfIdeasCluster);
  }

  /* ── Board (storyboard) state + rendering ── */
  var _sboardMode = 'board';
  var _sboardDesktop = false;
  var _sboardFilter = null;
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
  function _sboardHeartsHTML(count){
    if(!count) return '';
    var shown=Math.min(count,8), s='';
    for(var i=0;i<shown;i++) s+='❤️';
    if(count>8) s+=' +'+(count-8);
    return s;
  }

  async function renderSeaOfIdeasCluster(reshuffle){
    var boardWrap=document.getElementById('sc-board-wrap');
    var canvasWrap=document.getElementById('sc-canvas-wrap');
    if(!boardWrap||!canvasWrap) return;
    var fwdBtn=document.getElementById('b-sc-fwd');
    if(fwdBtn){
      var inChapterFlow=(T().currentFile()==='dream.html' && document.getElementById('s-idea-button') && T().getSeaChapterEntry());
      fwdBtn.style.opacity=inChapterFlow?'1':'.3';
      fwdBtn.style.pointerEvents=inChapterFlow?'auto':'none';
    }
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop && _sboardMode==='board');
    if(_sboardMode==='canvas'){
      boardWrap.style.display='none';
      canvasWrap.style.display='block';
      return renderSeaCanvas(reshuffle);
    } else {
      canvasWrap.style.display='none';
      boardWrap.style.display='block';
      return renderSeaBoard();
    }
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
        document.getElementById('b-sc-filterback').style.display='none';
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
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;margin-left:'+(depth*14)+'px';
        var hd=document.createElement('button');
        hd.className='sc-pill named';
        hd.style.cssText='position:static;transform:none;display:block;width:100%;box-sizing:border-box;padding:6px 10px;font-size:11px;margin-bottom:6px;cursor:pointer;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
        hd.textContent=name;
        if(!isReserved) hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbHeaderDetail(headerRow); });
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
        var grid=document.createElement('div');
        grid.style.cssText='display:grid;grid-template-columns:repeat('+cols+','+cellSize+'px);gap:8px';
        (childrenOfHeader[headerRow.id]||[]).forEach(function(item){ grid.appendChild(_sboardMakeTile(item, cellSize, straight)); });
        block.appendChild(grid);
        groupsWrap.appendChild(block);
        (subHeadersOf[headerRow.id]||[]).forEach(function(sub){ renderGroup(sub, depth+1); });
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.style.cssText='display:flex;flex-wrap:nowrap;gap:18px;align-items:flex-start';
      if(newAdditionsRow) renderGroup(newAdditionsRow, 0);
      orderedTop.forEach(function(h){ renderGroup(h, 0); });
      wrap.appendChild(groupsWrap);

      document.getElementById('b-sc-filterback').style.display='none';
      if(statusEl) statusEl.textContent='';
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
          var path=user.id+'/'+Date.now()+'-'+i+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
          var up=await _sb.storage.from('sea-of-ideas').upload(path, f);
          if(up.error) throw up.error;
          var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
          var url=pub.data && pub.data.publicUrl;
          if(!url) throw new Error('No public URL returned.');
          var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'image',image_url:url,created_at:new Date().toISOString()});
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
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">'+headerRow.text_content+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Nest under</label>'
      +'<select id="sb-h-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-h-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-h-close" style="flex:1">Close</button></div>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-h-parent');
    if(sel) sel.value=headerRow.cluster_id||'';
    T().wire('sb-h-save', async function(){
      try{
        var newParent=sel.value||null;
        var upd=await _sb.from('ideas').update({cluster_id:newParent}).eq('id',headerRow.id);
        if(upd.error) throw upd.error;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){}
    });
    T().wire('sb-h-close', closeSbDetail);
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
      + '<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-header-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-header-cancel" style="flex:1">Cancel</button></div>'
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
    T().wire('sb-header-save', async function(){
      var name=document.getElementById('sb-header-input').value.trim();
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=null;
        if(name){
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

  /* ── Canvas (freeform proximity) — unchanged mechanic, used to create new clusters ── */
  var _scPositions = {};
  var _scCurrentBatch = [];
  var _scTileSize = 64;
  var _scClusterRadius = 90;

  function _scRandomStart(w, h){
    var margin = 8;
    return {
      x: margin + Math.random() * (w - _scTileSize - margin*2),
      y: margin + Math.random() * (h - _scTileSize - margin*2)
    };
  }

  function _scUpdateGlows(){
    var canvas=document.getElementById('sc-canvas'); if(!canvas) return;
    canvas.querySelectorAll('.sc-glow,.sc-pill').forEach(function(el){ el.remove(); });
    var ids=Object.keys(_scPositions).filter(function(id){
      return _scCurrentBatch.some(function(item){ return String(item.id)===id; });
    });
    var visited={};
    ids.forEach(function(id){
      if(visited[id]) return;
      var group=[id];
      var p1=_scPositions[id];
      ids.forEach(function(otherId){
        if(otherId===id||visited[otherId]) return;
        var p2=_scPositions[otherId];
        var dx=p1.x-p2.x, dy=p1.y-p2.y;
        if(Math.sqrt(dx*dx+dy*dy) < _scClusterRadius) group.push(otherId);
      });
      if(group.length>1){
        group.forEach(function(gid){ visited[gid]=true; });
        var xs=group.map(function(g){ return _scPositions[g].x + _scTileSize/2; });
        var ys=group.map(function(g){ return _scPositions[g].y + _scTileSize/2; });
        var cx=xs.reduce(function(a,b){return a+b;},0)/xs.length;
        var cy=ys.reduce(function(a,b){return a+b;},0)/ys.length;
        var spread=Math.max.apply(null, group.map(function(g){
          var dx=_scPositions[g].x+_scTileSize/2-cx, dy=_scPositions[g].y+_scTileSize/2-cy;
          return Math.sqrt(dx*dx+dy*dy);
        })) + _scTileSize*0.8;
        var glow=document.createElement('div');
        glow.className='sc-glow';
        glow.style.width=glow.style.height=(spread*2)+'px';
        glow.style.left=(cx-spread)+'px';
        glow.style.top=(cy-spread)+'px';
        canvas.insertBefore(glow, canvas.firstChild);
        var namedItem=group.map(function(g){ return _scCurrentBatch.find(function(i){ return String(i.id)===g; }); }).find(function(item){ return item && item._headerText; });
        var pill=document.createElement('button');
        pill.className='sc-pill'+(namedItem?' named':'');
        pill.textContent=namedItem?namedItem._headerText:'+ name this';
        pill.style.left=cx+'px';
        pill.style.top=Math.max(12,(cy-spread-10))+'px';
        pill.addEventListener('click', function(){ if(window._scOpenNameOverlay) window._scOpenNameOverlay(group, namedItem?namedItem._headerText:''); });
        canvas.appendChild(pill);
      } else {
        visited[id]=true;
      }
    });
  }

  function _scMakeDraggable(tile, canvas){
    var offsetX=0, offsetY=0, dragging=false;
    tile.addEventListener('pointerdown', function(e){
      dragging=true; tile.classList.add('dragging');
      var r=tile.getBoundingClientRect();
      offsetX=e.clientX-r.left; offsetY=e.clientY-r.top;
      tile.setPointerCapture(e.pointerId);
    });
    tile.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var cr=canvas.getBoundingClientRect();
      var x=e.clientX-cr.left-offsetX, y=e.clientY-cr.top-offsetY;
      x=Math.max(2, Math.min(canvas.clientWidth-_scTileSize-2, x));
      y=Math.max(2, Math.min(canvas.clientHeight-_scTileSize-2, y));
      tile.style.left=x+'px'; tile.style.top=y+'px';
      _scPositions[tile.dataset.id]={x:x,y:y};
      _scUpdateGlows();
    });
    function up(e){ dragging=false; tile.classList.remove('dragging'); try{ tile.releasePointerCapture(e.pointerId); }catch(err){} }
    tile.addEventListener('pointerup', up);
    tile.addEventListener('pointercancel', up);
  }

  async function renderSeaCanvas(reshuffle){
    var canvas=document.getElementById('sc-canvas');
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    if(!canvas||!_sb) return;
    if(statusEl){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id')
        .eq('user_id', user.id).in('content_type',['image','text'])
        .order('created_at',{ascending:false}).limit(80);
      if(res.error) throw new Error(res.error.message);
      var pool=res.data||[];
      if(pool.length===0){ if(statusEl) statusEl.textContent='No ideas saved yet — add a few first.'; return; }
      var shuffled=pool.slice().sort(function(){ return Math.random()-0.5; });
      _scCurrentBatch=shuffled.slice(0, Math.min(9,shuffled.length));
      if(reshuffle) _scPositions={};
      canvas.querySelectorAll('.sc-tile,.sc-glow,.sc-pill').forEach(function(el){ el.remove(); });
      var w=canvas.clientWidth, h=canvas.clientHeight;
      _scCurrentBatch.forEach(function(item){
        var pos=_scPositions[item.id] || _scRandomStart(w,h);
        _scPositions[item.id]=pos;
        var tile=document.createElement('div');
        tile.className='sc-tile'+(item.content_type==='text'?' text':'');
        tile.dataset.id=item.id;
        tile.style.left=pos.x+'px'; tile.style.top=pos.y+'px';
        if(item.content_type==='image' && item.image_url){
          var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
        } else {
          var p=document.createElement('p'); p.textContent=item.text_content||'(untitled)'; tile.appendChild(p);
        }
        canvas.appendChild(tile);
        _scMakeDraggable(tile, canvas);
      });
      _scUpdateGlows();
      if(statusEl) statusEl.textContent=_scCurrentBatch.length+' ideas';
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  /* ── PUBLIC API for backpack.js to call without knowing internals ── */
  window.T2TSea = {
    openTrash: async function(){
      _sboardMode='board';
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
