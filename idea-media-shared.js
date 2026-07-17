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

  function _ideaOpenBoard(boardId){
    T2TShared.currentTopicId=boardId; T2TShared.filter=boardId;
    T().nav('s-sea-of-ideas-cluster');
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

  // Legacy 9210 save only, now that the 9712 Idea Input card has its own
  // independent save path in idea-capture.js (window.IdeaCapture). This
  // function no longer branches on "session mode" — anything reachable
  // through this screen's own dropdowns. Trimmed July 16, 2026.
  async function _ideaSaveCard(imageUrl){
    var boardSel=document.getElementById('ic-storyboard');
    var headerSel=document.getElementById('ic-header');
    var headerId=headerSel?headerSel.value:null;
    var headerLabel=(headerSel && headerSel.selectedIndex>=0 && headerSel.options[headerSel.selectedIndex])
      ? headerSel.options[headerSel.selectedIndex].text : 'NEW';
    var boardId=boardSel?boardSel.value:null;
    var ta=document.getElementById('idea-text');
    var text=(ta?ta.value:_ideaDraftText).trim();
    if(!text && !imageUrl) return;
    var savedOk=false, saveErr=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){
        saveErr='Not signed in.';
      } else {
        var contentType = imageUrl ? 'image' : 'text';
        if(!imageUrl && T2TStoryboard.isAutoHeaderText(text)) contentType='header';
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
      boards=await T2TData.topLevelBoards();
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

    var defaultBoardId=(T2TShared.ideaCaptureCtx&&T2TShared.ideaCaptureCtx.boardId)?T2TShared.ideaCaptureCtx.boardId:wishTankId;
    if(defaultBoardId) boardSel.value=defaultBoardId;
    if(boardSel.selectedIndex===-1 && boardSel.options.length>1) boardSel.selectedIndex=0;

    async function refreshHeaders(){
      var boardId=boardSel.value;
      if(boardId==='__new__' || !boardId) return;
      var children=[];
      try{
        children=await T2TData.childHeaders(boardId);
      }catch(e){ console.warn('refreshHeaders failed:', e); }
      children.sort(function(a,b){ return (a.text_content||'').localeCompare(b.text_content||''); });
      var opts='<option value="'+boardId+'">NEW</option>';
      opts+=children.map(function(c){ return '<option value="'+c.id+'">'+c.text_content+'</option>'; }).join('');
      opts+='<option value="__new__">+ Create new header</option>';
      headerSel.innerHTML=opts;
      var defaultHeaderId=(T2TShared.ideaCaptureCtx&&String(T2TShared.ideaCaptureCtx.boardId)===String(boardId)&&T2TShared.ideaCaptureCtx.headerId)?T2TShared.ideaCaptureCtx.headerId:boardId;
      if(defaultHeaderId) headerSel.value=defaultHeaderId;
      if(headerSel.selectedIndex===-1 && headerSel.options.length>1) headerSel.selectedIndex=0;
    }
    await refreshHeaders();
    T2TShared.ideaCaptureCtx=null;

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
        if(T2TShared.returnToBoard){
          T2TShared.currentTopicId=T2TShared.returnBoardId; T2TShared.filter=T2TShared.returnBoardId;
          T2TShared.returnToBoard=false;
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

  // Legacy 9210 save only — see the note above _ideaSaveCard. Trimmed
  // July 16, 2026.
  async function _ideaSaveLinkCard(url, thumb, title){
    var boardSel=document.getElementById('ic-storyboard');
    var headerSel=document.getElementById('ic-header');
    var headerId=headerSel?headerSel.value:null;
    var headerLabel=(headerSel && headerSel.selectedIndex>=0 && headerSel.options[headerSel.selectedIndex])
      ? headerSel.options[headerSel.selectedIndex].text : 'NEW';
    var boardId=boardSel?boardSel.value:null;
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
  }

  window.T2TMedia = {
    parseText: _linkParseText,
    ensureWishTank: _ideaEnsureWishTank,
    openBoard: _ideaOpenBoard,
    openIdeaSession: _sboardOpenIdeaSession,
    resolveOEmbed: _linkResolveOEmbed,
    getDefaultHeaderId: _ideaGetDefaultHeaderId,
    compressImageFile: _compressImageFile
  };

  document.addEventListener('DOMContentLoaded', function(){
    wireIdeaCaptureFamily();
  });

})();
