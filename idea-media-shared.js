/* ============================================================
   idea-media-shared.js — T2T Field Guide · ISB shared state +
   media/idea-capture family (9210-9215 legacy + current capture flow).

   Split out of sea-of-ideas.js on July 17, 2026 (Session 118).
   Behavior is UNCHANGED — this is a structural split, not a rebuild.

   Loads FIRST of the three ISB files. Hosts window.T2TShared, the
   canonical shared-state object for the pieces of state that get
   written from more than one of the three files (current topic id,
   active filter, idea-capture context, and the 9711 SESSION path/
   header selection). idea-storyboard-9710.js and session.js both
   read/write through T2TShared instead of keeping their own copies —
   mirrors the header-data.js canonical-file pattern.

   Part of the three-file ISB split:
     idea-media-shared.js    (loads FIRST — this file)
     idea-storyboard-9710.js (loads SECOND)
     session.js              (loads THIRD)

   Exposes window.T2TMedia = {
     parseText, ensureWishTank, openBoard, openIdeaSession,
     resolveOEmbed, getDefaultHeaderId
   } for the other two ISB files to call.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  // Canonical shared state — the only pieces of ISB state written
  // from more than one file. Read AND write through this object;
  // never re-declare local copies of these names in the other files.
  window.T2TShared = window.T2TShared || {
    currentTopicId: null,
    filter: null,
    ideaCaptureCtx: null,
    returnToBoard: false,
    returnBoardId: null,
    isxPath: null,          // [{id,text}] apex .. current Topic
    isxHeaderId: null,      // null = New (defaults to current Topic's own id)
    isxHeaderLabel: 'New'
  };
  var T2TShared = window.T2TShared;

  async function _ideaGetDefaultHeaderId(){
    var result=await T2TMedia.ensureWishTank();
    if(!result || !result.id) return null;
    return result.id;
  }

  /* ── 9210-9214 · Idea capture family ── */
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

  // Larry, August 1 2026 (second report): "closed Field Guide but it
  // reopened to Wish Tank again." getLastInputTopic is scoped per
  // project (last_input_topic_id lives on that project's own row, by
  // design, so Session's own resume never leaks one project's Topic
  // into another's) -- but the desk's resume path had no way to know
  // WHICH project to even ask, so it always asked Wish Tank specifically
  // regardless of which project was actually last open. This remembers
  // the last active project itself, device-local (same pattern as the
  // board-color/tool-order/widget-position settings already stored this
  // way -- it's a "where was I sitting" convenience, not data that needs
  // to travel with the account).
  var _ideaLastProjectKey='t2t_lastActiveProjectId';
  function _ideaRememberProject(projectId){
    try{ if(projectId) localStorage.setItem(_ideaLastProjectKey, projectId); }catch(e){}
  }
  function _ideaRecallProject(){
    try{ return localStorage.getItem(_ideaLastProjectKey)||null; }catch(e){ return null; }
  }

  // Fire-and-forget — every entry point into 1010 (FOCUS, the PROJECT
  // switcher, DETAILS' Move panel, the desk resume path above) funnels
  // through _ideaOpenBoard, so persisting here covers all of them, on
  // top of the Storyboard's own drill/climb persistence in
  // idea-storyboard-9710.js. Larry, August 1 2026: "Leave everything
  // where it was put."
  async function _ideaPersistLastTopic(topicId){
    try{
      if(!topicId || !T2TData || !T2TData.setLastInputTopic || !T2TData.ancestorChain) return;
      var chain=await T2TData.ancestorChain(topicId);
      if(chain && chain.length){ T2TData.setLastInputTopic(chain[0].id, topicId); _ideaRememberProject(chain[0].id); }
    }catch(e){ console.warn('Idea Board persist-last-topic failed:', e); }
  }

  // push -- optional, defaults to true (normal nav() behavior, pushing
  // the current screen onto the back-stack). Aug 3 2026: the sign-in/
  // reload resume path (backpack.js's resumeToLastPageOr) needs this to
  // be false the one time it calls through here, same as every other
  // screen it resumes -- otherwise 's-signin' (still `cur` at that exact
  // moment) gets pushed onto the stack, and closing the Storyboard would
  // wrongly go back to the sign-in screen instead of wherever it should
  // (the exact Aug 1 2026 bug this file's push:false convention already
  // exists to prevent, just never plumbed through this particular path).
  function _ideaOpenBoard(boardId, push){
    T2TShared.currentTopicId=boardId; T2TShared.filter=boardId;
    _ideaPersistLastTopic(boardId);
    T().nav('s-sea-of-ideas-cluster', push);
  }

  // Larry, August 1 2026: "There is no ISB project, no ISB parent and no
  // What do you want? TOPIC — this board needs to be deleted." Root
  // cause: the desk's own Idea Board tool button called T2T.nav()
  // directly with no boardId, so currentTopicId stayed null and 1010
  // rendered its blank/no-topic fallback labels (ISB / ISB / "What do
  // you want?") — which looks exactly like a real empty project even
  // though nothing like that exists in the data (confirmed). 9711
  // already resumes the traveler's last topic on plain entry (see
  // _isxInit's Resume last Input topic block) — this mirrors that same
  // logic for 1010, so the desk button lands somewhere real instead.
  async function _ideaOpenBoardResume(push){
    // Deep-link override, Aug 11 2026 -- a Briefing Card's "Open on Idea
    // Storyboard" button (new-tab version) sets this before opening the
    // tab; if present, it wins over the normal last-topic resume below.
    // This is the one guaranteed entry point for landing on 1010
    // whenever bp_target routes here (see navToPageNum's guard), so
    // hooking here covers both the in-app nav and the new-tab case.
    try{
      var deepLinkHeaderId=sessionStorage.getItem('fg_open_header_id');
      if(deepLinkHeaderId){
        sessionStorage.removeItem('fg_open_header_id');
        _ideaOpenBoard(deepLinkHeaderId, push);
        return;
      }
    }catch(e){ console.warn('Idea Board deep-link check failed:', e); }
    var wt=await T2TData.ensureWishTank();
    if(!wt || !wt.id){
      await new Promise(function(r){ setTimeout(r,400); });
      wt=await T2TData.ensureWishTank();
    }
    if(!wt || !wt.id){
      console.error('Idea Board: Wish Tank unavailable, opening blank');
      T2TShared.currentTopicId=null; T2TShared.filter=null;
      T().nav('s-sea-of-ideas-cluster', push);
      return;
    }
    // Ask whichever project was actually last active, not Wish Tank
    // specifically -- falls back to Wish Tank only if nothing's been
    // remembered yet (a brand-new traveler, or a cleared browser).
    var projectId=_ideaRecallProject()||wt.id;
    var targetId=projectId;
    try{
      if(T2TData.getLastInputTopic){
        var lastId=await T2TData.getLastInputTopic(projectId);
        if(lastId) targetId=lastId;
      }
    }catch(e){ console.warn('Idea Board resume-last-topic failed:', e); }
    _ideaOpenBoard(targetId, push);
  }

  // Reciprocal of _isxOpenStoryboardView (9711 → 9710). Carries the current
  // TOPIC over into Session View by seeding T2TShared.isxPath with the full ancestor
  // chain (same helper the isx side already uses to resume a specific
  // board), so the traveler lands on the same Topic instead of back at the
  // Wish Tank apex. Locked July 16, 2026.
  async function _sboardOpenIdeaSession(){
    var topicId=T2TShared.currentTopicId;
    if(!topicId){ T2TShared.isxPath=null; T().nav('s-idea-session'); return; }
    try{
      var chain=(window.T2TData && window.T2TData.ancestorChain) ? await window.T2TData.ancestorChain(topicId) : null;
      if(chain && chain.length){ T2TShared.isxPath=chain; }
      else {
        var row=T2TStoryboard.getRow(topicId);
        T2TShared.isxPath=[{id:topicId, text:row?(row.text_content||'(untitled)'):'(untitled)'}];
      }
    }catch(e){
      var row2=T2TStoryboard.getRow(topicId);
      T2TShared.isxPath=[{id:topicId, text:row2?(row2.text_content||'(untitled)'):'(untitled)'}];
    }
    T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
    T().nav('s-idea-session');
  }

  function _ideaOpenRoot(){
    T2TShared.currentTopicId=null; T2TShared.filter=null;
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

  // Legacy 9210-9214 idea-capture family (_ideaSaveImageFile,
  // _ideaSaveCard, renderIdeaCapture/Theme/Paste/Link/Custom,
  // _ideaSaveLinkCard, wireIdeaCaptureFamily) removed July 18, 2026 —
  // Larry hit the old 9210 screen live via a stale fallback path and
  // asked for it gone outright, not just made unreachable. The current
  // capture flow (1170 Idea / 9713 Image / 9714 Link / 9715 Rules) is
  // window.IdeaCapture in idea-capture.js and never depended on any of
  // this — confirmed no other file called any of the removed names.

  window.T2TMedia = {
    parseText: _linkParseText,
    ensureWishTank: _ideaEnsureWishTank,
    openBoard: _ideaOpenBoard,
    openBoardResume: _ideaOpenBoardResume,
    rememberProject: _ideaRememberProject,
    openIdeaSession: _sboardOpenIdeaSession,
    resolveOEmbed: _linkResolveOEmbed,
    getDefaultHeaderId: _ideaGetDefaultHeaderId,
    compressImageFile: _compressImageFile
  };


})();

/* ============================================================
   T2TLogo — shared Logo/artwork controller, Aug 30 2026.

   Built first for the Briefing Board (Aug 28 2026: upload -> crop ->
   resize-handle -> drag -> hover-peek), then the Idea Storyboard grew
   its own separate but nearly-identical copy of the same feature
   (Aug 26-29 2026). Larry, Aug 30: "Delete all logo code on other
   boards but leave BB logo code. Add BB logo code to all other
   boards" -- rather than two parallel implementations that have to be
   fixed twice every time (exactly the kind of duplication that slows
   future changes down and makes it easy to fix one and forget the
   other), this is the one shared version both boards now call into.
   Lives here, in the file that loads before every other Field Guide
   screen (see this file's own header comment), for the same reason
   window.T2TShared/T2TMedia do -- both consumers (briefing-board.js,
   idea-storyboard-9710.js) need it defined before they wire their own
   headers.

   What's shared (identical everywhere): upload pipeline, the free-crop
   tool's drag/resize-corner math, the resize-handle's hover-to-reveal
   and drag-to-scale, the logo image's own drag-to-move, and the LOGO
   eyebrow label that lives on the logo itself (travels with drag/
   resize automatically, since it's a child of the same frame) and
   peeks out on hover instead of staying permanently covered.

   What stays per-board (passed in via the `cfg` object each board
   builds for itself): which table/row the logo fields live on and how
   to read/save it (BB: one row per Briefing Board on `briefing_boards`;
   Idea/Plan: the project's own root row on `ideas`, shared by both --
   "one logo per project, not per board"), the DOM element ids for that
   board's own markup, min/max resize size (BB 20-90, Idea/Plan
   28-140), the crop overlay's own visual chrome (BB's light-themed
   bb-logo-crop-overlay shell vs Idea/Plan's shared dark-themed
   sb-detail-overlay), and -- Idea/Plan only -- a `positionAnchor` hook
   that re-measures Logo's gap off Parent every render (see
   _sboardPositionLogoNearTopic in idea-storyboard-9710.js); the
   Briefing Board's own anchor is already fixed in the header's normal
   flex layout and needs no such hook.

   Model note: drag and resize both act ONLY on the slot element's own
   CSS transform/width/height -- never on the anchor/wrap that holds
   the slot's base position. That base position is set once per render
   (statically for BB, by positionAnchor for Idea/Plan) and the saved
   logo_dx/logo_dy offset rides on top of it purely as a transform, the
   same way on both boards. This is what let Idea/Plan's own drag
   handler drop its old "force a fresh reposition right before
   measuring the drag's start point" workaround (Aug 29 2026 bugfix,
   idea-storyboard-9710.js) -- the whole class of staleness bug that
   fix was patching can't happen once the offset is a transform layered
   on top of a base position, instead of drag math re-deriving the base
   position itself from whatever the DOM happened to already say.
   ============================================================ */
(function(){

  var PEEK_CLASS='t2t-logo-eyebrow-peek';

  function toast(cfg, msg){ if(cfg.showToast) cfg.showToast(msg); }

  // Reflects whichever row cfg.getRow() currently returns into the DOM
  // -- called after every wire-up's own header re-render, same as
  // _bbRenderLogo/the old _sboardUpdateHeaderChrome inline block used
  // to run standalone. A loaded logo hides the (+) and becomes the
  // click target for swapping it out; no logo means the (+) shows
  // instead. cfg.positionAnchor (Idea/Plan only) runs after the frame's
  // own size is set and before the drag transform is applied, since its
  // own gap-off-Parent measurement reads the slot's current rendered
  // width.
  function render(cfg){
    var slot=document.getElementById(cfg.slotId);
    var img=document.getElementById(cfg.imgId);
    var btn=document.getElementById(cfg.addBtnId);
    var handle=document.getElementById(cfg.resizeHandleId);
    var topEyebrow=cfg.eyebrowTopId ? document.getElementById(cfg.eyebrowTopId) : null;
    if(!slot) return;
    var row=cfg.getRow();
    var url=row && row.logo_url;
    // Once a logo exists, the traveling on-logo label (see
    // t2t-logo-eyebrow-onlogo below) is the one actually next to the
    // artwork -- the original above-the-anchor label stays in the
    // layout (keeps Logo lined up with the header's other fields) but
    // goes invisible rather than showing a second, stationary "Logo"
    // that never moves. visibility, not display, so it still reserves
    // its row's height.
    if(topEyebrow) topEyebrow.style.visibility=url?'hidden':'visible';
    var w=(row && row.logo_w)||cfg.defaultSize, h=(row && row.logo_h)||cfg.defaultSize;
    slot.style.width=w+'px'; slot.style.height=h+'px';
    if(cfg.positionAnchor) cfg.positionAnchor();
    var dx=(row && row.logo_dx)||0, dy=(row && row.logo_dy)||0;
    slot.style.transform=(dx||dy)?('translate('+dx+'px,'+dy+'px)'):'';
    if(img){
      img.src=url||'';
      img.style.display=url?'block':'none';
      img.style.cursor=url?'pointer':'';
      img.title=url?'Click to replace the logo':'';
    }
    if(btn) btn.style.display=url?'none':'';
    // The handle never sits visible permanently once a logo exists --
    // every render resets it to hidden; hovering the slot (see
    // wireHoverPeek below) brings it back when there's actually a logo
    // to resize.
    if(handle) handle.style.display='none';
  }

  // Upload pipeline -- compress, push to the shared sea-of-ideas
  // bucket, grab the public URL, save logo_url/logo_w/logo_h onto
  // whichever row cfg.getRow()/cfg.saveLogo point at. Takes the
  // already-cropped file plus that crop's own natural pixel width/
  // height (crop and resize are separate steps) so the frame opens at
  // a sensible starting size before the resize handle takes over.
  async function uploadLogo(cfg, file, cropW, cropH){
    if(!file) return;
    var row=cfg.getRow();
    if(!row){ toast(cfg, 'Open a '+cfg.subjectLabel+' first.'); return; }
    try{
      var sb=T().sb;
      var user=(await sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var toUpload=await window.T2TMedia.compressImageFile(file);
      var uploadName=toUpload.name||file.name||(cfg.uploadPrefix+'-'+Date.now()+'.png');
      var path=user.id+'/'+cfg.uploadPrefix+'-'+Date.now()+'-'+uploadName.replace(/[^a-zA-Z0-9._-]/g,'_');
      var up=await sb.storage.from('sea-of-ideas').upload(path, toUpload);
      if(up.error) throw up.error;
      var pub=sb.storage.from('sea-of-ideas').getPublicUrl(path);
      var url=pub.data && pub.data.publicUrl;
      if(!url) throw new Error('No public URL returned.');
      var longSide=cfg.defaultSize, frameW=longSide, frameH=longSide;
      if(cropW>0 && cropH>0){
        if(cropW>=cropH){ frameW=longSide; frameH=Math.max(cfg.minFrameFromCrop,Math.round(longSide*cropH/cropW)); }
        else{ frameH=longSide; frameW=Math.max(cfg.minFrameFromCrop,Math.round(longSide*cropW/cropH)); }
      }
      await cfg.saveLogo({logo_url:url, logo_w:frameW, logo_h:frameH});
      render(cfg);
    }catch(err){
      toast(cfg, 'Couldn’t save the logo: '+err.message);
    }
  }

  // Free-crop tool -- a free-aspect-ratio rectangle you can drag to
  // move and drag any corner to resize ("any shape" means any
  // rectangle, not a freehand outline). cfg.crop.mount(doClose) builds
  // that board's own themed overlay chrome (title/instructions/button
  // classes all stay board-specific) and hands back the two elements
  // this function actually needs: an empty `stage` container to size
  // and fill in once the image has loaded, and the `useBtn` that
  // commits the crop. Everything from there -- stage sizing, the crop
  // box's own move/resize-corner math, canvas crop, handing the
  // cropped file to uploadLogo -- is identical for every board.
  function openCropper(cfg, file){
    var objUrl=URL.createObjectURL(file);
    var onMove=null, onUp=null;
    function cleanupListeners(){
      if(onMove) document.removeEventListener('pointermove', onMove);
      if(onUp) document.removeEventListener('pointerup', onUp);
    }
    function doClose(){
      cleanupListeners();
      URL.revokeObjectURL(objUrl);
      cfg.crop.close();
    }
    var mounted=cfg.crop.mount(doClose);
    if(!mounted || !mounted.stage || !mounted.useBtn){ URL.revokeObjectURL(objUrl); return; }

    var img=new Image();
    img.onload=function(){
      var stage=mounted.stage;
      if(!stage){ URL.revokeObjectURL(objUrl); return; }
      var maxW=cfg.crop.stageMaxW||320, maxH=cfg.crop.stageMaxH||320;
      var scale=Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight);
      if(!isFinite(scale) || scale<=0) scale=1;
      scale=Math.min(scale, 6); // don't blow up a tiny source image absurdly
      var dispW=Math.max(60, Math.round(img.naturalWidth*scale));
      var dispH=Math.max(60, Math.round(img.naturalHeight*scale));
      stage.style.width=dispW+'px';
      stage.style.height=dispH+'px';
      var handleColor=cfg.crop.handleColor||'#5b9bd5';
      var handleBorderColor=cfg.crop.handleBorderColor||'#fff';
      stage.innerHTML='<img src="'+objUrl+'" style="position:absolute;top:0;left:0;width:'+dispW+'px;height:'+dispH+'px;display:block;pointer-events:none">'
        +'<div class="t2t-lc-box" style="position:absolute;border:2px dashed #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.55);cursor:move"></div>';
      var box=stage.querySelector('.t2t-lc-box');
      ['nw','ne','sw','se'].forEach(function(corner){
        var h=document.createElement('div');
        h.className='t2t-lc-handle'; h.setAttribute('data-corner',corner);
        h.style.cssText='position:absolute;width:14px;height:14px;background:'+handleColor+';border:2px solid '+handleBorderColor+';border-radius:3px;z-index:2;touch-action:none;'
          +(corner.indexOf('n')>-1?'top:-8px;':'bottom:-8px;')
          +(corner.indexOf('w')>-1?'left:-8px;':'right:-8px;')
          +'cursor:'+(corner==='nw'||corner==='se'?'nwse-resize':'nesw-resize');
        box.appendChild(h);
      });

      var bx=Math.round(dispW*0.1), by=Math.round(dispH*0.1), bw=Math.round(dispW*0.8), bh=Math.round(dispH*0.8);
      var MIN=20;
      function clampBox(){
        if(bw<MIN) bw=MIN; if(bh<MIN) bh=MIN;
        if(bw>dispW) bw=dispW; if(bh>dispH) bh=dispH;
        if(bx<0) bx=0; if(by<0) by=0;
        if(bx+bw>dispW) bx=dispW-bw; if(by+bh>dispH) by=dispH-bh;
      }
      function paint(){ box.style.left=bx+'px'; box.style.top=by+'px'; box.style.width=bw+'px'; box.style.height=bh+'px'; }
      paint();

      var mode=null, startX=0, startY=0, ob=null;
      box.addEventListener('pointerdown', function(ev){
        if(ev.target!==box) return; // corner handles carry their own listener below
        mode='move'; startX=ev.clientX; startY=ev.clientY; ob={x:bx,y:by};
        try{ box.setPointerCapture(ev.pointerId); }catch(_e){}
      });
      Array.prototype.forEach.call(box.querySelectorAll('.t2t-lc-handle'), function(h){
        h.addEventListener('pointerdown', function(ev){
          ev.stopPropagation();
          mode='resize-'+h.getAttribute('data-corner');
          startX=ev.clientX; startY=ev.clientY; ob={x:bx,y:by,w:bw,h:bh};
          try{ h.setPointerCapture(ev.pointerId); }catch(_e){}
        });
      });
      onMove=function(ev){
        if(!mode) return;
        var dx=ev.clientX-startX, dy=ev.clientY-startY;
        if(mode==='move'){ bx=ob.x+dx; by=ob.y+dy; }
        else{
          var c=mode.slice(7);
          if(c==='se'){ bw=ob.w+dx; bh=ob.h+dy; }
          else if(c==='sw'){ bx=ob.x+dx; bw=ob.w-dx; bh=ob.h+dy; }
          else if(c==='ne'){ by=ob.y+dy; bw=ob.w+dx; bh=ob.h-dy; }
          else if(c==='nw'){ bx=ob.x+dx; by=ob.y+dy; bw=ob.w-dx; bh=ob.h-dy; }
        }
        clampBox();
        paint();
      };
      onUp=function(){ mode=null; };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);

      mounted.useBtn.onclick=function(){
        cleanupListeners();
        var sx=Math.round(bx/scale), sy=Math.round(by/scale);
        var sw=Math.round(bw/scale), sh=Math.round(bh/scale);
        sw=Math.max(1,Math.min(sw, img.naturalWidth-sx));
        sh=Math.max(1,Math.min(sh, img.naturalHeight-sy));
        var canvas=document.createElement('canvas');
        canvas.width=sw; canvas.height=sh;
        var ctx=canvas.getContext('2d');
        ctx.drawImage(img, sx,sy,sw,sh, 0,0,sw,sh);
        canvas.toBlob(function(blob){
          URL.revokeObjectURL(objUrl);
          cfg.crop.close();
          if(!blob){ toast(cfg, 'Crop failed -- try again.'); return; }
          var croppedName=(file.name||'logo').replace(/\.[^.]+$/,'')+'-cropped.png';
          var croppedFile=new File([blob], croppedName, {type:'image/png'});
          uploadLogo(cfg, croppedFile, sw, sh);
        }, 'image/png');
      };
    };
    img.onerror=function(){
      URL.revokeObjectURL(objUrl);
      toast(cfg, 'Couldn’t open that image.');
    };
    img.src=objUrl;
  }

  // Resize handle -- hidden until the slot is hovered (see
  // wireHoverPeek), drag-to-scale locked to whatever aspect ratio the
  // frame currently has so the logo never stretches. cfg._resizeActive
  // is this cfg's own "stay visible, I'm busy" flag, checked by
  // wireHoverPeek so a mid-drag pointerleave on the slot (easy to
  // trigger, since dragging the corner naturally pulls the pointer off
  // it) doesn't hide (and thereby drop pointer capture on) the handle
  // out from under an active drag.
  function wireResizeHandle(cfg){
    var handle=document.getElementById(cfg.resizeHandleId);
    var slot=document.getElementById(cfg.slotId);
    if(!handle||!slot) return;
    var MIN=cfg.minSize, MAX=cfg.maxSize;
    var dragging=false, startX=0, startY=0, startW=0, startH=0, aspect=1;
    handle.addEventListener('pointerdown', function(ev){
      ev.preventDefault(); ev.stopPropagation();
      var rect=slot.getBoundingClientRect();
      startX=ev.clientX; startY=ev.clientY;
      startW=rect.width; startH=rect.height;
      aspect=startW/(startH||1) || 1;
      dragging=true;
      cfg._resizeActive=true;
      try{ handle.setPointerCapture(ev.pointerId); }catch(_e){}
    });
    handle.addEventListener('pointermove', function(ev){
      if(!dragging) return;
      var dx=ev.clientX-startX, dy=ev.clientY-startY;
      var newW=(Math.abs(dx)>=Math.abs(dy)) ? (startW+dx) : (startH+dy)*aspect;
      newW=Math.max(MIN, Math.min(MAX, newW));
      var newH=newW/aspect;
      slot.style.width=newW+'px';
      slot.style.height=newH+'px';
    });
    handle.addEventListener('pointerup', async function(ev){
      if(!dragging) return;
      dragging=false;
      cfg._resizeActive=false;
      try{ handle.releasePointerCapture(ev.pointerId); }catch(_e){}
      var w=Math.round(parseFloat(slot.style.width)||startW);
      var h=Math.round(parseFloat(slot.style.height)||startH);
      if(cfg.getRow()){
        try{ await cfg.saveLogo({logo_w:w, logo_h:h}); }catch(_e){}
      }
      // Larry: "remove resize tab after crop and resize edited" -- once
      // a resize drag finishes, the handle goes back to hidden-until-
      // hover instead of sitting on the corner permanently. Idea/Plan's
      // own gap-off-Parent measurement can shift once the frame's size
      // has actually changed (a wider/taller frame changes the wrap's
      // own box -- see positionAnchor's doc comment in
      // idea-storyboard-9710.js), so re-run it here; a no-op for the
      // Briefing Board, which has no positionAnchor hook.
      if(cfg.positionAnchor) cfg.positionAnchor();
      if(ev.pointerType==='touch') handle.style.display='none';
    });
  }

  // Drag-to-move -- dragging the loaded logo image slides its frame
  // via a CSS transform on the slot itself, layered on top of whatever
  // base position the anchor/wrap already has (see this file's own
  // header comment above for why that split matters). A plain click
  // (little to no pointer movement) still opens the file picker to
  // swap the image; only a real drag (more than a few pixels) counts
  // as a move. The offset is saved via cfg.saveLogo so it stays put
  // next time this board/project opens.
  function wireDrag(cfg){
    var img=document.getElementById(cfg.imgId);
    var slot=document.getElementById(cfg.slotId);
    if(!img||!slot) return;
    img.style.touchAction='none';
    var CLICK_SLOP=4;
    var dragging=false, moved=false, startX=0, startY=0, startDx=0, startDy=0;
    img.addEventListener('pointerdown', function(ev){
      if(img.style.display==='none') return; // no logo loaded -- nothing to drag
      ev.preventDefault(); ev.stopPropagation();
      var row=cfg.getRow();
      startX=ev.clientX; startY=ev.clientY;
      startDx=(row && row.logo_dx)||0; startDy=(row && row.logo_dy)||0;
      dragging=true; moved=false;
      cfg._dragActive=true;
      try{ img.setPointerCapture(ev.pointerId); }catch(_e){}
    });
    img.addEventListener('pointermove', function(ev){
      if(!dragging) return;
      var dx=ev.clientX-startX, dy=ev.clientY-startY;
      if(Math.abs(dx)>CLICK_SLOP || Math.abs(dy)>CLICK_SLOP) moved=true;
      if(moved) slot.style.transform='translate('+(startDx+dx)+'px,'+(startDy+dy)+'px)';
    });
    img.addEventListener('pointerup', async function(ev){
      if(!dragging) return;
      dragging=false;
      cfg._dragActive=false;
      try{ img.releasePointerCapture(ev.pointerId); }catch(_e){}
      if(!moved){
        // Genuine click, no drag -- open the file picker to swap the
        // logo, same behavior this always had.
        var input=document.getElementById(cfg.inputId);
        if(input) input.click();
        return;
      }
      if(!cfg.getRow()) return;
      var dx=ev.clientX-startX, dy=ev.clientY-startY;
      var newDx=Math.round(startDx+dx), newDy=Math.round(startDy+dy);
      try{ await cfg.saveLogo({logo_dx:newDx, logo_dy:newDy}); }catch(_e){}
    });
  }

  // Hover-to-reveal, Aug 30 2026 -- both the resize handle (built Aug
  // 28) and the on-logo LOGO eyebrow (built Aug 30) now toggle
  // together on the same slot hover: hidden/covered by default once a
  // logo exists, reachable the moment the pointer is actually over it.
  function wireHoverPeek(cfg){
    var slot=document.getElementById(cfg.slotId);
    var handle=document.getElementById(cfg.resizeHandleId);
    var eyebrow=cfg.eyebrowOnLogoId ? document.getElementById(cfg.eyebrowOnLogoId) : null;
    if(!slot) return;
    slot.addEventListener('pointerenter', function(){
      var row=cfg.getRow();
      if(row && row.logo_url){
        if(handle) handle.style.display='block';
        if(eyebrow) eyebrow.classList.add(PEEK_CLASS);
      }
    });
    slot.addEventListener('pointerleave', function(){
      if(cfg._resizeActive || cfg._dragActive) return;
      if(handle) handle.style.display='none';
      if(eyebrow) eyebrow.classList.remove(PEEK_CLASS);
    });
  }

  function wireUpload(cfg){
    T().wire(cfg.addBtnId, function(){ var el=document.getElementById(cfg.inputId); if(el) el.click(); });
    (function(){
      var input=document.getElementById(cfg.inputId);
      if(input) input.addEventListener('change', function(e){
        var file=e.target.files && e.target.files[0];
        e.target.value='';
        if(!file) return;
        if(!cfg.getRow()){ toast(cfg, 'Open a '+cfg.subjectLabel+' first.'); return; }
        openCropper(cfg, file);
      });
    })();
  }

  window.T2TLogo = {
    render: render,
    // Wires the (+)/image click-to-upload, drag-to-move, and the
    // resize handle once at board setup -- mirrors the old per-board
    // wireLogoUpload functions, now shared.
    wire: function(cfg){
      wireUpload(cfg);
      wireResizeHandle(cfg);
      wireDrag(cfg);
      wireHoverPeek(cfg);
    }
  };

})();
