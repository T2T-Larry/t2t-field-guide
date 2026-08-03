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
