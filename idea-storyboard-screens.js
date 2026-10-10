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
    uploadPrefix:'logo', subjectLabel:'topic',
    // Sept 13 2026 fix -- was a direct reference (showToast:_sboardShowToast),
    // which reads _sboardShowToast's value the instant this object literal
    // runs (this file's own top-level code, executed as the script loads).
    // _sboardShowToast itself lives in idea-storyboard-shared.js, which
    // loads AFTER this file in every page's <script> list -- so at that
    // instant it didn't exist yet, threw a ReferenceError, and aborted the
    // rest of this file's top-level code before _sboardLogoCfg finished
    // being assigned. Every later call site (injectSeaOfIdeasCluster's
    // T2TLogo.wire(_sboardLogoCfg)) then found _sboardLogoCfg itself
    // undefined, which is what actually froze the Idea Board: the crash
    // landed BEFORE the PROJECT/TOPIC/PARENT dropdown-wiring calls further
    // down in injectSeaOfIdeasCluster, so none of them ever got wired up.
    // Wrapping it in a function (same pattern getRow/saveLogo already use
    // below) defers the lookup until a toast is actually shown, by which
    // time every script has loaded -- no HTML script-order change needed.
    showToast:function(msg){ _sboardShowToast(msg); },
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

  // injectSeaOfIdeasCluster (the 9710 screen markup + CSS + one-time wiring) moved to
  // idea-storyboard-screen-markup.js on Oct 10 2026 (screens.js split, step 1).
  // Same shared global scope, so every caller still reaches it by plain name.

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
  // Infinite canvas camera for Blue Sky, Sept 29 2026 (Larry: every board is
  // its own world on the infinite canvas, wheel to zoom). Blue Sky stores
  // cards by header column and rank, not x,y, so it plugs into the camera as
  // a computed layout: the camera is told how big the laid-out board is and
  // how big one card is, and nothing about storage or rendering changes.
  var _sboardCam=null;
  function _sboardAttachCamera(){
    if(_sboardCam || !window.T2TCanvasCamera || !T2TCanvasCamera.create) return;
    var vp=document.getElementById('sc-board-viewport');
    var wrap=document.getElementById('sc-board-wrap');
    var screen=document.getElementById('s-sea-of-ideas-cluster');
    if(!vp || !wrap || !screen) return;
    _sboardCam=T2TCanvasCamera.create({
      board:vp, scroller:vp, canvas:wrap,
      // Everything the board drew, in wrap-local layout pixels (offset sizes
      // ignore the camera's scale, so this is the same at any zoom).
      contentBox:function(){
        // scrollWidth/scrollHeight, not offsetHeight: the row container is
        // stretched to the viewport height while a tall column overflows it,
        // so its own offset size hides the bottom of the tallest column and
        // its (+) (found live Sept 29 2026: Concepts, 660px in a 562px row).
        var x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
        Array.prototype.forEach.call(wrap.children,function(k){
          var x=k.offsetLeft, y=k.offsetTop;
          var w=Math.max(k.offsetWidth,k.scrollWidth), h=Math.max(k.offsetHeight,k.scrollHeight);
          if(!w && !h) return;
          if(x<x0) x0=x; if(y<y0) y0=y;
          if(x+w>x1) x1=x+w; if(y+h>y1) y1=y+h;
        });
        return x0===Infinity ? null : {x:x0,y:y0,w:x1-x0,h:y1-y0};
      },
      // One header card sets how close the closest zoom goes.
      cardSize:function(){
        var t=wrap.querySelector('.sc-stack-tile');
        return t ? {w:t.offsetWidth,h:t.offsetHeight} : null;
      },
      // Empty board: the viewport past the columns, the wrap, and the row
      // or strip containers that only hold cards.
      isBackground:function(t){
        return t===vp || t===wrap || t.id==='sc-groups-wrap' || t.id==='sc-role-shortcuts-wrap' || t.id==='sc-pending-collab-wrap';
      }
    });
  }

  function _sboardWireAutoScroll(){
    var hWrap=document.getElementById('sc-board-wrap');
    var vWrap=document.getElementById('s-sea-of-ideas-cluster');
    var EDGE=56, MAXSPEED=16;
    // Under the camera nothing scrolls natively, so a drag near any edge of
    // the viewport pans the camera instead (Sept 29 2026).
    function edgePanCamera(e){
      if(!_sboardCam) return false;
      var vp=document.getElementById('sc-board-viewport');
      if(!vp) return false;
      var rect=vp.getBoundingClientRect();
      var x=e.clientX, y=e.clientY;
      if(x<rect.left || x>rect.right || y<rect.top || y>rect.bottom) return true;
      var dx=0, dy=0;
      if(x-rect.left<EDGE) dx=MAXSPEED*(1-(x-rect.left)/EDGE);
      else if(rect.right-x<EDGE) dx=-MAXSPEED*(1-(rect.right-x)/EDGE);
      if(y-rect.top<EDGE) dy=MAXSPEED*(1-(y-rect.top)/EDGE);
      else if(rect.bottom-y<EDGE) dy=-MAXSPEED*(1-(rect.bottom-y)/EDGE);
      if(dx||dy) _sboardCam.panBy(dx, dy);
      return true;
    }
    function edgeScrollX(e){
      if(!hWrap) return;
      if(edgePanCamera(e)) return;
      var rect=hWrap.getBoundingClientRect();
      var x=e.clientX;
      if(x<rect.left || x>rect.right) return;
      if(x-rect.left<EDGE) hWrap.scrollLeft -= MAXSPEED*(1-(x-rect.left)/EDGE);
      else if(rect.right-x<EDGE) hWrap.scrollLeft += MAXSPEED*(1-(rect.right-x)/EDGE);
    }
    function edgeScrollY(e){
      if(!vWrap) return;
      if(_sboardCam) return;
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
    try{ document.body.classList.toggle('fg-readonly', _sboardIsReadOnly()); }catch(e){} // Oct 6 2026: Library view hides editing controls (library-readonly.js)
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
      // Header order (gear -> Preferences) is remembered per TOPIC too
      // (header-order.js, Oct 10 2026), so landing on a Topic restores its
      // saved MY ORDER / A to Z choice instead of always snapping back.
      _sboardAlphaHeaderView=!!(window.T2THeaderOrder && T2THeaderOrder.isAlpha(T2TShared.currentTopicId));
      // A-Z letter view is remembered per TOPIC (az-toggle.js), so landing on a
      // Topic restores whatever that Topic was last set to.
      _sboardAzLetterView=!!(window.T2TAZ && T2TAZ.isOn(T2TShared.currentTopicId));
      _sboardLastRenderedTopicId=T2TShared.currentTopicId;
      if(_sboardCam) _sboardCam.reset(false);   // a different board starts from the top-left, same as Sea of Ideas
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
        // Landing-zone name -- was titled after the Topic's own name in
        // parentheses (Aug 25 2026 -- Larry: a plain "NEW" label gave no
        // hint what it was actually holding), retired Sept 15 2026 in
        // favor of one consistent "Parking Lot" name (Larry + Bill; see
        // _sboardEnsureNewAdditionsHeader in idea-storyboard-header.js,
        // which now also self-heals any board still carrying an old
        // per-Topic "(...)" name from that scheme).
        //
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
        // Sept 13 2026 -- Larry: "if alfred is not on any other boards,
        // he is not a collaborator on anybody's board, nor is he a
        // stakeholder. Those headers are likely to be very confusing
        // and should only appear when person is added to someone's
        // board." Before this, both headers were ensured unconditionally
        // for every traveler on every render -- so a solo traveler with
        // zero actual collaborator/stakeholder relationships still saw
        // two empty reserved buckets with no shortcuts in them. Now
        // gated on the same entries-lists the headers exist to hold:
        // only ensure (and thus only ever create) a header once this
        // traveler actually has at least one real entry for it. A
        // header that already exists keeps working exactly as before
        // (ensureCollaboratorHeader/ensureStakeholderHeader still just
        // find and return it -- this only stops the FIRST creation from
        // happening for someone who'll never have anything to put in it).
        if(rootId){
          try{
            var _collabAndStakeEntries=await Promise.all([T2TData.collaboratorEntries(), T2TData.stakeholderEntries()]);
            var _ensureHeaderCalls=[];
            if(_collabAndStakeEntries[0] && _collabAndStakeEntries[0].length) _ensureHeaderCalls.push(T2TData.ensureCollaboratorHeader(rootId));
            if(_collabAndStakeEntries[1] && _collabAndStakeEntries[1].length) _ensureHeaderCalls.push(T2TData.ensureStakeholderHeader(rootId));
            if(_ensureHeaderCalls.length) await Promise.all(_ensureHeaderCalls);
          }catch(e){ console.warn('Idea Storyboards COLLABORATOR/STAKEHOLDER ensure failed:', e); }
        }
        // Oct 6 2026: in the read-only Library view never create anything -- only look up the Parking Lot header that already exists.
        var _roView=_sboardIsReadOnly();
        var _ensureResults=_roView ? await Promise.all([
          (async function(){
            try{
              var q=await _sb.from('ideas').select('id,text_content').eq('content_type','header').eq('cluster_id',T2TShared.currentTopicId).in('text_content',['Parking Lot','NEW','New Additions']).limit(1);
              return (q.data && q.data[0]) ? q.data[0].id : null;
            }catch(e){ return null; }
          })(),
          Promise.resolve(null),
          Promise.resolve(null)
        ]) : await Promise.all([
          T2TShared.currentTopicId ? _sboardEnsureNewAdditionsHeader(T2TShared.currentTopicId) : Promise.resolve(null),
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
          var pageRes=await _sb.from('ideas').select('id,created_at,user_id,content_type,image_url,text_content,idea_text,library_shared,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board,adds_notes,adds_links,adds_related,adds_flags,storyboard_kind,source_project_id,board_type,org_name,logo_url,logo_w,logo_h,hide_primary_badge,show_primary_badge,priority,hide_priority_front,hide_all_initials,subject,hide_contents_front,show_order_front,library_access,front_hidden,opens_as_sea,concept_group')
            .in('content_type',['image','text','link','header'])
            .order('created_at',{ascending:true})
            .range(_sboardFetchFrom, _sboardFetchFrom+_sboardFetchPageSize-1);
          if(pageRes.error) throw new Error(pageRes.error.message);
          var pageRows=pageRes.data||[];
          // Oct 6 2026 (Master BB bug): a header filed with its title only in idea_text drew as "(untitled)".
          // Every renderer reads text_content, so fill it here once, at load, from idea_text / link_title.
          pageRows.forEach(function(r){ if(r && r.content_type==='header' && !String(r.text_content||'').trim()){ var _t=String(r.idea_text||r.link_title||'').trim(); if(_t) r.text_content=_t; } });
          _freshRows=_freshRows.concat(pageRows);
          // A short page (fewer than a full page size back) means this was
          // the last one -- stop. The 50-page (50,000-row) backstop below
          // is just a sanity guard against ever looping forever; no
          // traveler's account is remotely close to that today.
          if(pageRows.length<_sboardFetchPageSize || _sboardFetchFrom>50000) break;
          _sboardFetchFrom+=_sboardFetchPageSize;
        }
        _sboardAllRowsById={}; _freshRows.forEach(function(r){ _sboardAllRowsById[r.id]=r; });
        // Oct 10 2026 (Larry: the LIBRARY is a filter, not a place): in the read-only Library view only, concepts that live under
        // their home topics are shown back under CONCEPTS, grouped by their concept_group tag. In-memory only; nothing is written.
        try{ if(window.T2TLibraryView && T2TLibraryView.overlay) T2TLibraryView.overlay(_sboardAllRowsById); }catch(e){ console.warn('library overlay failed', e); }
        try{ document.body.classList.toggle('fg-readonly', _sboardIsReadOnly()); }catch(e){}
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
        _sboardRoleShortcuts=[]; _sboardRoleShortcutsKind=null; _sboardPendingCollabEntries=[];
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
                // Pending invites, Sept 15 2026 -- "Collaborator Projects
                // need accept/reject toggle by person assigned." A Team/
                // Facilitator assignment on someone else's project now
                // lands 'pending' (see idea-storyboard-people.js
                // _csInsertRole) until the person it names responds, so
                // this bucket is the one place they see and act on it.
                try{ _sboardPendingCollabEntries=await T2TData.pendingCollaboratorEntries()||[]; }catch(e){ console.warn('pendingCollaboratorEntries failed:', e); }
              } else if(_curTopicRowForShortcuts.text_content==='STAKEHOLDER'){
                _sboardRoleShortcutsKind='stakeholder';
                try{ _sboardRoleShortcuts=await T2TData.stakeholderEntries()||[]; }catch(e){ console.warn('stakeholderEntries failed:', e); }
              }
            }
          }
        }
      }

      var reservedIds=[_sboardTrashId,_sboardMiscId,_sboardPurposeId,newAdditionsId].filter(Boolean).map(String);
      var reservedNames=['Trash','MISC','Purpose','NEW','New Additions','Parking Lot'];
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
      // Oct 2 2026, Larry: ALL additions go to the BOTTOM of a list, header or
      // subber alike. A brand-new top-level header has no sort_order yet, and
      // this used to put every such row FIRST (fallbackTop before explicitTop),
      // so each new header landed at the top. Rows that already have a real
      // order now come first and the not-yet-ordered ones follow, so a new
      // header lands last; the backfill just below then makes that position
      // permanent. (Subber columns and nested rows already sorted
      // null-sort_order last, so they needed no change.)
      var orderedTop=explicitTop.concat(fallbackTop);
      // ORDER # badges always read the REAL order, never the alphabetical
      // display below -- backfill first so that's a genuine persisted
      // position from here on, then set _sboardTopLevelOrder from it
      // (also what drag-reorder itself writes against, unaffected by
      // whatever's currently on screen).
      _sboardBackfillSortOrder(orderedTop);
      _sboardTopLevelOrder=orderedTop.map(function(h){ return h.id; });
      var displayTop=_sboardAlphaHeaderView ? orderedTop.slice().sort(_sboardByAlpha) : orderedTop;
      if(_sboardAlphaHeaderView){ // Oct 10 2026 (Larry): LIBRARY is the last header in A to Z, in spite of alpha order (display only)
        var _libTop=displayTop.filter(function(h){ return String(h.text_content||'').trim().toUpperCase()==='LIBRARY'; });
        if(_libTop.length) displayTop=displayTop.filter(function(h){ return _libTop.indexOf(h)===-1; }).concat(_libTop);
      }

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
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='NEW'||name==='Parking Lot');
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
        // Sept 15 2026: Parking Lot added alongside the legacy names
        // (Larry + Bill's rename, see the ensure-call above) so a board
        // that hasn't reopened this Topic since still hides its
        // auto-managed placeholder correctly under either name.
        var _sbReservedAutoNames=['NEW','New Additions','Parking Lot','MISC','Purpose'];
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
        // Oct 2 2026, Larry: "ALL NEW ADDITIONS need to start at the bottom."
        // ROOT CAUSE of new headers landing above everything: these two calls
        // numbered each kind SEPARATELY (a brand-new header with no order got
        // 0 among the headers, a new card got 0 among the cards) BEFORE the
        // two lists were merged into one column below, so a new header always
        // came in as 0 and sorted to the top. The column is now ordered ONCE,
        // as one list, by _sboardBackfillColumnOrder further down: rows with
        // no order yet sort last (oldest-created first), so a new header or
        // card lands at the bottom and is then numbered there for good.
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
        combined.sort(function(a,b){
          var d=_sboardBySortOrder(a,b);
          if(d===d && d!==0) return d; // both ordered, or one ordered + one not
          // Both have no order yet (NaN from Infinity-Infinity) or tie:
          // oldest-created first, so the newest addition is last.
          return String(a.created_at||'').localeCompare(String(b.created_at||''));
        });
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
        // MASTER-level = a real top-level Topic, i.e. a direct child of the
        // hidden PROJECTS_ROOT row (_sboardIdeaStoryboardsRootId) -- NOT
        // cluster_id null. Since the Sept 2 2026 "IDEA STORYBOARDS
        // placement architecture" migration (header-data.js,
        // ensureIdeaStoryboardsRoot), real projects nest one level under
        // that hidden root; cluster_id null is reserved for the root row
        // itself, which never renders as a column here. (The isProjectRoot
        // check in _sboardHeaderQuickMenu -- !headerRow.cluster_id -- looks
        // like it predates that migration and may itself be stale, but
        // that's a separate thing to fix, not touched here.) Sept 27 2026.
        // Oct 3 2026: also true for a not-yet-swept true-root row (cluster_id
        // null, not the root itself, not a reserved bucket) so a header that
        // was just added at MASTER level is framed right away, not only
        // after the next reload migrates it under the root.
        var _isApexTopic=_sboardIdeaStoryboardsRootId && (String(headerRow.cluster_id)===String(_sboardIdeaStoryboardsRootId)
          || (!headerRow.cluster_id && String(headerRow.id)!==String(_sboardIdeaStoryboardsRootId) && !isReserved));
        hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'')+(_isApexTopic?' apex-topic':'')+(String(_sboardSelectedHeaderId)===String(headerRow.id)?' sb-kbd-selected':'');
        hd.setAttribute('data-header-id', String(headerRow.id));
        // Sept 20 2026, Larry (Master BB do-h card: "Allow headers to
        // occupy 2 lines with larger type size") -- reverses the Sept 8
        // 2026 "DREAM PHASE should display on one line" decision above.
        // That oneLine:true forced a long name (e.g. two/three words) to
        // keep shrinking all the way down to the 8px floor just to avoid
        // ever wrapping -- Larry now wants the opposite trade: a 2-line
        // wrap is fine, so the type can stay bigger. oneLine dropped
        // (text-fit.js's normal per-word-width + height-budget check
        // takes over, same as every other tile on this board), and the
        // floor raised 8->12 so even a name that does need to shrink
        // still lands at a readable size rather than the old backstop.
        var hdFitSize=_sboardFitFontSize(name, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2, false);
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+hdFitSize+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(headerRow.color?';background:'+headerRow.color:'');
        var _libRootLook=(typeof _sboardLibraryRootLook==='function')?_sboardLibraryRootLook(headerRow):null; // Oct 10 2026: LIBRARY column header matches its dark-gray cards
        if(_libRootLook){ hd.style.background=_libRootLook.bg; hd.style.color=_libRootLook.fg; }
        // Oct 10 2026 (Larry: carry the Library look over when the LIBRARY is viewed as a topic): its own column headers wear it too
        else { var _libChildLook=(typeof _sboardLibraryLook==='function')?_sboardLibraryLook(headerRow):null; if(_libChildLook){ hd.style.background=_libChildLook.bg; hd.style.color=_libChildLook.fg; } }
        _sboardPaintHeaderFace(hd, headerRow, name, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2);
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
    if(_sboardIsPlanBoard || headerRow.show_order_front){
      hd.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardTopLevelOrder, headerRow.id, !_sboardIsPlanBoard));
    }
    hd.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
    hd.insertAdjacentHTML('beforeend', _sboardPriorityBadgeHTML(headerRow));
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
          return (e.clientY - rect.top) <= PROMOTE_ZONE_H * (_sboardCam ? _sboardCam.getScale() : 1);
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
          // Oct 10 2026 (MERGE BB INTO ONE TREE, step 2): read-only marker for any
          // Briefing Board tasks filed under this header. Hidden unless there are some.
          if(!isReserved && window.T2TTaskMarker){
            scroll.appendChild(window.T2TTaskMarker.makeTile(headerRow.id, HEADER_W));
          }
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
        // Oct 4 2026, Larry: "the Parking Lot flashed into view and then
        // disappeared... still nothing under Parking Lot and no frame around
        // it." ROOT CAUSE: this column only ever showed loose cards sitting
        // directly on the open Topic (directItems) -- cards filed under the
        // Parking Lot header's OWN id (e.g. the CONCEPTS-purge leftovers at
        // MASTER) were never read here. The first, cache-only paint (before
        // the ensure-call resolves newAdditionsId) drew the Parking Lot as an
        // ordinary column, so they flashed up; the real render then swapped
        // in this virtual column and they vanished. Now: the row's own
        // children are merged in, and an apex Parking Lot (a direct child of
        // the MASTER root) gets the same apex frame as its sibling columns.
        // Headers/Subbers filed under the Parking Lot (Larry: "A header could
        // be in a Parking Lot") live in subHeadersOf, not childrenOfHeader,
        // so they are merged in separately and drawn as header stack tiles.
        var _lnaHeaderKids=[];
        if(newRow){
          var _ownKids=(childrenOfHeader[newRow.id]||[]);
          if(_ownKids.length){
            var _seenIds={}; directItems.forEach(function(r){ _seenIds[r.id]=true; });
            directItems=directItems.concat(_ownKids.filter(function(r){ return !_seenIds[r.id]; })).sort(_sboardBySortOrder);
          }
          _lnaHeaderKids=(subHeadersOf[newRow.id]||[]).slice();
        }
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('div');
        var _lnaApex=!!(newRow && _sboardIdeaStoryboardsRootId && String(newRow.cluster_id)===String(_sboardIdeaStoryboardsRootId));
        hd.className='sc-pill named'+(_lnaApex?' apex-topic':'');
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
        var localLabel=(newRow && newRow.text_content) ? newRow.text_content : 'Parking Lot';
        // oneLine:true, Sept 8 2026 -- same one-line preference as the
        // ordinary column header pill just above, so a renamed NEW
        // bucket (e.g. "(Dream Phase)") reads the same way.
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+_sboardFitFontSize(localLabel,Math.round(20*_tsMult),Math.round(8*_tsMult),HEADER_W-28,HEADER_H-14,1.2,true)+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(newRow&&newRow.color?';background:'+newRow.color:'');
        if(newRow){ _sboardPaintHeaderFace(hd, newRow, localLabel, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2); }
        else{ hd.textContent=localLabel; }
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
        if(directItems.length || _lnaHeaderKids.length || (newRow && !newRow.locked)){
          var scroll=document.createElement('div');
          scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
          var _lnaAllowed={}; _sboardFilterByPerson(directItems).forEach(function(r){ _lnaAllowed[r.id]=true; });
          _lnaHeaderKids.concat(directItems).sort(_sboardBySortOrder).forEach(function(item){
            if(item.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(item, SUBBER_W, SUBBER_H, true)); }
            else if(_lnaAllowed[item.id]){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, true, (item.cluster_id||parentIdForDrop), SUBBER_H)); }
          });
          if(newRow && !newRow.locked){
            // Oct 9 2026 (Larry: "into alpha list and never to Parking Lot in A-Z view"): while the A-Z
            // letter view is on, this (+) must not file a loose card into the Parking Lot -- it opens the
            // same "New concept" prompt as the letter columns' (+), so the new entry sorts into its own
            // letter on redraw. Outside A-Z it is unchanged (full capture card, filed here).
            if(_sboardAzLetterView && _sboardAzApplies() && window.T2TAddControl && T2TAddControl.make){
              var _lnaAz=T2TAddControl.make({title:'Add a new concept (it sorts into its letter)', onClick:function(){ _sboardOpenAddHeaderPrompt({azLabel:'A–Z'}); }, sense:block});
              _lnaAz.style.margin='4px auto 8px';
              scroll.appendChild(_lnaAz);
            } else if(!(_sboardAzLetterView && _sboardAzApplies())){
              scroll.appendChild(_sboardMakeAddSubberTile(parentIdForDrop, SUBBER_W, SUBBER_H));
            }
          }
          block.appendChild(scroll);
        }
        return block;
      }

      // A-Z letter view column, Oct 4 2026 -- one column per letter group (a
      // single letter, or a range like "X-Z" for thin letters), built from the
      // flat entry list _sboardAzCollectEntries returns. The letter label is inert;
      // tiles drag and drop INTO another card (see the handlers below), and each
      // column ends in a (+) that adds a new concept.
      function renderLetterGroup(group){
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
        var hd=document.createElement('div');
        hd.className='sc-pill named';
        hd.setAttribute('data-az-letter', group.label);
        hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+Math.round(30*_tsMult)+'px;font-weight:400;margin-bottom:2px;cursor:default;text-align:center;white-space:normal;line-height:1.2;border-radius:0';
        hd.textContent=group.label;
        block.appendChild(hd);
        var scroll=document.createElement('div');
        scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
        var _azAllowed={};
        _sboardFilterByPerson(group.entries.filter(function(r){ return r.content_type!=='header'; })).forEach(function(r){ _azAllowed[r.id]=true; });
        group.entries.forEach(function(r){
          if(r.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(r, SUBBER_W, SUBBER_H, true)); }
          else if(_azAllowed[r.id]){ scroll.appendChild(_sboardMakeTile(r, SUBBER_W, true, r.cluster_id, SUBBER_H)); }
        });
        // Oct 4 2026 (Larry: "I cannot move or drop them into another card in alpha view"):
        // tiles stay draggable here. A-Z has no manual order to reorder (it is alphabetical),
        // so the top/bottom "reorder" edges the normal tiles use are meaningless; instead the
        // WHOLE card is one drop target that files the dragged card/header IN UNDER it
        // (a plain card is promoted to a header first, same as the middle zone on the normal
        // board). Capture phase, so these run before -- and replace -- each tile's own handlers.
        function _azTargetOf(e){
          var el=e.target && e.target.closest ? e.target.closest('[data-idea-id],[data-header-id]') : null;
          if(!el || !scroll.contains(el)) return null;
          return el;
        }
        function _azClear(el){ if(el){ el.style.outline='none'; el.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; } }
        scroll.addEventListener('dragover', function(e){
          var el=_azTargetOf(e); if(!el) return;
          e.preventDefault(); e.stopPropagation();
          el.style.outline='5px solid #22c55e'; el.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)';
        }, true);
        scroll.addEventListener('dragleave', function(e){
          var el=_azTargetOf(e); if(!el) return;
          e.stopPropagation(); _azClear(el);
        }, true);
        scroll.addEventListener('drop', function(e){
          var el=_azTargetOf(e); if(!el) return;
          e.preventDefault(); e.stopPropagation(); _azClear(el);
          var raw=e.dataTransfer.getData('text/plain');
          if(!raw || raw==='sb-goup') return;
          var draggedId=raw.indexOf('header:')===0 ? raw.slice(7) : raw;
          var targetId=el.getAttribute('data-header-id') || el.getAttribute('data-idea-id');
          var target=_sboardAllRowsById[targetId];
          if(!target || String(draggedId)===String(targetId)) return;
          // never file something inside its own descendant (would orphan both)
          var up=target, guard=0;
          while(up && guard++<50){
            if(String(up.id)===String(draggedId)) return;
            up=up.cluster_id ? _sboardAllRowsById[up.cluster_id] : null;
          }
          if(target.content_type==='header') _sboardMoveCard(draggedId, target.id);
          else _sboardStackIntoHeader(draggedId, target);
        }, true);
        // (+) at the bottom of each letter column -- a new concept can be added right where
        // you are looking (Larry, Oct 4 2026). It is created as a header under the open Topic
        // and sorts into its own letter on its own; the prompt says where it will land.
        var _azAdd=(window.T2TAddControl && T2TAddControl.make)
          ? T2TAddControl.make({title:'Add a new concept under '+group.label, onClick:function(){ _sboardOpenAddHeaderPrompt({azLabel:group.label}); }, sense:block})
          : _sboardMakeAddSubberTile(T2TShared.currentTopicId, SUBBER_W, SUBBER_H);
        if(window.T2TAddControl && T2TAddControl.make){ _azAdd.style.margin='4px auto 8px'; scroll.appendChild(_azAdd); }
        else { _azAdd.onclick=null; scroll.appendChild(_azAdd); }
        block.appendChild(scroll);
        return block;
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.id='sc-groups-wrap';
      groupsWrap.style.cssText='display:flex;flex-wrap:nowrap;gap:2px;align-items:flex-start';
      var _azActive=false;   // true only while the A-Z letter view is actually drawn this render

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
        var _azGroups=null;
        if(_sboardAzLetterView && _sboardAzApplies()){
          // A-Z letter view: Purpose/NEW (Parking Lot) stay pinned first and MISC
          // last, exactly like the gear's A -> Z; everything between is replaced
          // by the letter columns. mergedRow (the real order) is untouched.
          var _azFirstIds=[purposeRow&&String(purposeRow.id), newAdditionsRow&&String(newAdditionsRow.id)];
          var _azLastId=miscRow?String(miscRow.id):null;
          var _azPinFirst=mergedRow.filter(function(h){ return _azFirstIds.indexOf(String(h.id))!==-1; });
          var _azPinLast=mergedRow.filter(function(h){ return _azLastId && String(h.id)===_azLastId; });
          var _azEntries=_sboardAzCollectEntries(T2TShared.currentTopicId, subHeadersOf, childrenOfHeader);
          _azGroups=T2TAZ.groupLetters(_azEntries, _sboardAzEntryName, T2TAZ.MIN_GROUP);
          _azActive=true;
          displayMergedRow=_azPinFirst.concat([{__azLetters:true}]).concat(_azPinLast);
        } else if(_sboardAlphaHeaderView){
          var _pinFirstIds=[purposeRow&&String(purposeRow.id), newAdditionsRow&&String(newAdditionsRow.id)];
          var _pinLastId=miscRow?String(miscRow.id):null;
          var _pinFirst=mergedRow.filter(function(h){ return _pinFirstIds.indexOf(String(h.id))!==-1; });
          var _pinLast=mergedRow.filter(function(h){ return _pinLastId && String(h.id)===_pinLastId; });
          // Oct 10 2026 (Larry): in A to Z the LIBRARY header is the last header -- the reference shelf closes the board, the way
          // Parking Lot opens it -- "in spite of alpha order". Display only; MY ORDER is untouched (the traveler's own order stands).
          var _middleAlpha=mergedRow.filter(function(h){ return _pinFirstIds.indexOf(String(h.id))===-1 && !(_pinLastId && String(h.id)===_pinLastId); }).sort(_sboardByAlpha);
          var _libLast=_middleAlpha.filter(function(h){ return String(h.text_content||'').trim().toUpperCase()==='LIBRARY'; });
          if(_libLast.length) _middleAlpha=_middleAlpha.filter(function(h){ return _libLast.indexOf(h)===-1; }).concat(_libLast);
          displayMergedRow=_pinFirst.concat(_middleAlpha).concat(_pinLast);
        }

        displayMergedRow.forEach(function(h){
          if(h.__azLetters){
            (_azGroups||[]).forEach(function(g){ groupsWrap.appendChild(renderLetterGroup(g)); });
            return;
          }
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
      if(!_azActive) groupsWrap.appendChild(_sboardMakeAddHeaderTile(HEADER_W, HEADER_H));
      _sboardSyncAzButton();

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

      // Pending Collaborator invites, Sept 15 2026 -- its own row,
      // independent of the accepted-shortcuts block above (has to show
      // even when that one's empty -- a brand-new invite with nothing
      // else accepted yet). Rendered below the accepted row.
      if(_sboardPendingCollabEntries && _sboardPendingCollabEntries.length && _sboardRoleShortcutsKind==='collaborator' && String(T2TShared.currentTopicId)===String(_sboardRoleShortcutsTopicId)){
        var pendingWrap=document.createElement('div');
        pendingWrap.id='sc-pending-collab-wrap';
        pendingWrap.style.cssText='margin-top:10px;padding-top:10px;border-top:1px dashed #d99a3a';
        var pendingLabel=document.createElement('div');
        pendingLabel.style.cssText='font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#a3702b;margin-bottom:6px';
        pendingLabel.textContent='PENDING — RESPOND';
        pendingWrap.appendChild(pendingLabel);
        var pendingRow=document.createElement('div');
        pendingRow.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
        _sboardPendingCollabEntries.forEach(function(entry){
          pendingRow.appendChild(_sboardMakePendingCollabTile(entry, HEADER_W, HEADER_H));
        });
        pendingWrap.appendChild(pendingRow);
        wrap.appendChild(pendingWrap);
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
          var url=await T2TMedia.uploadImageWithThumb(_sb, user.id, f, f.name);
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

