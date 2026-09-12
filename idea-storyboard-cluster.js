/* ============================================================
   idea-storyboard-cluster.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   CLUSTER / STARBURST VIEW. The alternate zoomed-out view of a topic's cards arranged in a starburst, including drag-to-stack, drag-to-nest, and creating new clusters.

   Split out of idea-storyboard-9710.js Sept 12, 2026 -- the file had
   grown to 11,463 lines (Code Growth Watch flags a split well before
   that; idea-storyboard-9710.js itself was already the product of an
   earlier split of sea-of-ideas.js back on July 17, 2026). Behavior
   is UNCHANGED -- this is a structural split, not a rebuild.

   All ten pieces share one global scope on the page (same pattern
   used for the briefing-board.js split on Sept 9, 2026) -- there's
   no per-file wrapper and no namespace object, so every
   function/variable here is reachable by its plain name from any of
   the other nine files. Load order does not matter for anything
   except idea-storyboard-9710.js itself, which must load LAST among
   this family.

   Sibling files: idea-storyboard-screens.js, idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js, idea-storyboard-navigation.js,
   idea-storyboard-tiles.js, idea-storyboard-header.js, idea-storyboard-card-detail.js,
   idea-storyboard-9710.js (boot -- loads last)
   ============================================================ */

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
    // Full-screen toggle -- CLUSTER's own "give me more room" button.
    // Used to reuse the storyboard's own class name (sb-wide) on the
    // theory that CLUSTER just wanted the same treatment the storyboard
    // got; renamed to its own 'cl-widescreen' Sept 5 2026 after that
    // sharing turned out to be the actual cause of a real bug (see the
    // Skeleton comment further up this file) -- the storyboard's own
    // full-screen state is the shared Skeleton rule alone now, and
    // CLUSTER's expand button has no business touching it, even by
    // borrowing its name.
    T().wire('cl-full', function(){
      _clusterWide=!_clusterWide;
      var btn=document.getElementById('cl-full');
      if(btn){ btn.innerHTML=_clusterWide?'↩':'⛶'; btn.title=_clusterWide?'Back to normal size':'Full screen'; }
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('cl-widescreen', _clusterWide);
      var card=ov.querySelector('.cl-card');
      if(card) card.classList.toggle('cl-wide', _clusterWide);
      renderClusterView(headerRow);
    });
    renderClusterView(headerRow);
  }

  function closeClusterView(){
    var ov=document.getElementById('sb-cluster-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; }
    // Turn CLUSTER's own widescreen back off on the way out -- it's
    // solely CLUSTER's own state now (no storyboard desktop toggle to
    // restore to; see the removed _sboardDesktop, Sept 5 2026), so
    // leaving always means off.
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.remove('cl-widescreen');
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
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board,adds_notes,adds_links,adds_related,adds_flags,storyboard_kind,source_project_id,board_type,org_name,hide_primary_badge,hide_all_initials')
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
        var bucketName=b.text_content||'(untitled)';
        // Shrink before splitting a word, Aug 28 2026 (Larry, standing rule
        // -- "never split words, shrink text to fit space") -- this shelf
        // pill was the one remaining spot showing a Header/Subber name at a
        // fixed font-size with plain CSS word-break as its only defense.
        // Every other card/pill on this board already shrinks first (see
        // FGFitFontSize / _sboardFitFontSize and the Aug 18-21 history on
        // those). word-break stays as the CSS fallback for the rare word
        // that's too wide even at the floor size, same as everywhere else.
        var bucketMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
        var bucketW=_clusterWide?110:72, bucketH=_clusterWide?34:36;
        var bucketBase=Math.round((_clusterWide?10:9.5)*bucketMult);
        pill.style.fontSize=_sboardFitFontSize(bucketName, bucketBase, Math.max(6,Math.round(6*bucketMult)), bucketW-14, bucketH-8, 1.1)+'px';
        pill.textContent=bucketName;
        pill.title=bucketName+' — tap to see what\'s inside · drag here to sort an idea in · drag onto another bucket to nest it';
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
    // 2026) -- opens the same DETAILS back every other card's double-click
    // reaches, but jumps straight to the color swatches instead of leaving
    // them collapsed behind the Appearance gear. Double-click is this
    // tile's only way to open the back (this Starburst tile never had its
    // own corner-flip, unlike the shared tile type).
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
      // Genuinely a Subber (nested under headerRow, a real Header), not a
      // top-level Header -- Aug 25 2026, Larry: headers and subbers should
      // default to different colors. Uses the Subber default, not the
      // Header one.
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString(),color:T().getDefaultSubberColor()}).select().single();
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
      // Same reasoning as _clusterCommitStack above -- this is a Subber
      // nested under headerRow, so it gets the Subber default color, not
      // the Header one.
      var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:headerRow.id,created_at:new Date().toISOString(),color:T().getDefaultSubberColor()}).select().single();
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
