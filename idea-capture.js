/* ============================================================
   T2T FIELD GUIDE — IDEA CAPTURE FAMILY (1170 Idea · 9713 Image ·
   9714 Link · 9715 Rules)

   Extracted out of sea-of-ideas.js July 16, 2026. Previously this
   lived entirely inside 9711's own code, reaching into 9711's private
   state (_isxPath, _isxHeaderId, _isxActive()) to know what it was
   saving into — which is exactly what made the 9710 [+] circles hard
   to fix correctly: to open this card from 9710 without navigating
   away, 9710 had to fake being "9711" by setting that private state,
   a fragile trick (_isxStoryboardQuickCapture) that had to be
   threaded through half a dozen functions.

   This file knows nothing about 9710 or 9711. It only knows: which
   header to save into, and who to tell when it's done. Any screen —
   9710, 9711, or a future SHAPE screen — opens it the same way:

     window.IdeaCapture.open({
       headerId:   '...',       // required — the target bucket
       headerLabel:'Images',    // for the "Saved to Images" feel, optional
       boardId:    '...',       // the Topic this header lives under
       onSaved:    function(row){ ... },   // called after each successful save
       onClosed:   function(){ ... }       // called once, when the card closes
     });

   Exposes: open(opts), openRules(), isOpen(), currentPageNum().
   Talks to the rest of the app only through window.T2T (T().sb,
   T().nav is not used here at all — this never navigates) and
   window.T2TSea.resolveOEmbed (the shared link-preview lookup).
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  // ── Target + callbacks for whatever is currently open ──
  var _icHeaderId=null;
  var _icHeaderLabel='New';
  var _icBoardId=null;
  var _icOnSaved=null;
  var _icOnClosed=null;

  // ── Idea (1170) card state ──
  var _icIdeaMode='idea';       // manual 💡/❋ override, still respected if ever wired to a toggle
  var _icInputPendingImageFile=null;
  var _icInputPendingLink=null; // {url, title, thumb}

  // ── Image (9713) card state — kept for completeness; this panel has
  //    no live entry point right now (superseded by paste/Unsplash
  //    living inside the Idea card itself), but stays wired in case a
  //    future screen wants a dedicated Image button. ──
  var _icImgTab='paste';
  var _icImgPendingUrl=null;
  var _icImgPendingFile=null;

  // ── Link (9714) card state — same "kept, currently unreachable" note
  //    as Image above. ──
  var _icLinkPendingUrl=null;
  var _icLinkPendingThumb=null;
  var _icLinkPendingTitle=null;
  var _icLinkTimer=null;

  var UNSPLASH_KEY='ka0gIrtPFZ1o4q4JKnSdaaBH5197-tWnFnZkd-zw3ns';

  // A trailing : or ? auto-promotes a typed idea to a header — same rule
  // as the Storyboard's own quick-add, duplicated here (one line) rather
  // than reaching back into sea-of-ideas.js for it.
  function _icIsAutoHeaderText(text){
    return /[:?]\s*$/.test(text);
  }

  function _icResolveOEmbed(url){
    return (window.T2TSea && window.T2TSea.resolveOEmbed) ? window.T2TSea.resolveOEmbed(url) : Promise.resolve(null);
  }

  function _icCompressImageFile(file, maxDim, quality){
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

  // ── SAVE — the three insert paths. Each targets _icHeaderId (falling
  //    back to _icBoardId, the header's own "New" bucket, if no
  //    sub-header was picked), and calls _icOnSaved(row) on success. No
  //    branching on which screen is open — the caller decided that by
  //    what it passed to open(). ──

  async function _icSaveCard(imageUrl){
    var headerId=_icHeaderId||_icBoardId;
    var ta=document.getElementById('isx-idea-text');
    var text=(ta?ta.value:'').trim();
    if(!text && !imageUrl) return;
    var savedOk=false, saveErr=null, row=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){
        saveErr='Not signed in.';
      } else {
        var contentType = imageUrl ? 'image' : 'text';
        if(!imageUrl && (_icIdeaMode==='header' || _icIsAutoHeaderText(text))) contentType='header';
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type: contentType,
          text_content: text||null,
          image_url: imageUrl||null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        }).select().single();
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_icSaveCard insert error:', ins.error); }
        else { savedOk=true; row=ins.data; }
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_icSaveCard exception:', e); }

    if(savedOk){
      if(_icOnSaved) _icOnSaved(row);
      _icResetIdeaPanelForNext(row && row.content_type==='header');
    } else {
      var errBox=document.querySelector('#isx-popup-layer .isx-pcard');
      if(errBox){
        var errEl=document.createElement('div');
        errEl.style.cssText='color:#A32D2D;font-size:11px;text-align:center;margin-top:6px';
        errEl.textContent='Save failed: '+(saveErr||'unknown error');
        errBox.appendChild(errEl);
      }
    }
  }

  async function _icSaveImageFile(file){
    var box=document.getElementById('ipaste-drop');
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) throw new Error('Not signed in.');
      if(box) box.innerHTML='Compressing\u2026';
      var toUpload=await _icCompressImageFile(file);
      if(box) box.innerHTML='Uploading\u2026';
      var fname=toUpload.name||file.name||('pasted-image-'+Date.now()+'.jpg');
      var path=user.id+'/'+Date.now()+'-'+fname.replace(/[^a-zA-Z0-9._-]/g,'_');
      var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
      if(up.error) throw up.error;
      var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
      var url=pub.data && pub.data.publicUrl;
      if(!url) throw new Error('No public URL returned.');
      await _icSaveCard(url);
    }catch(e){
      console.error('_icSaveImageFile error:', e);
      if(box) box.innerHTML='Upload failed \u2014 '+(e.message||'try again')+'<br>(Ctrl/Cmd + V)';
    }
  }

  async function _icSaveLinkCard(url, thumb, title){
    var headerId=_icHeaderId||_icBoardId;
    var savedOk=false, saveErr=null, row=null;
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
        }).select().single();
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_icSaveLinkCard insert error:', ins.error); }
        else { savedOk=true; row=ins.data; }
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_icSaveLinkCard exception:', e); }

    if(savedOk){
      _icClosePopup();
      if(_icOnSaved) _icOnSaved(row);
    } else {
      var errBox=document.querySelector('#isx-popup-layer .isx-pcard');
      if(errBox){
        var errEl=document.createElement('div');
        errEl.style.cssText='color:#A32D2D;font-size:11px;text-align:center;margin-top:6px';
        errEl.textContent='Save failed: '+(saveErr||'unknown error');
        errBox.appendChild(errEl);
      }
    }
  }

  // ── Popup shell — open/close/badge/drag. Same #isx-popup-layer DOM id
  //    as before; it's now a global overlay (see index.html) so it can
  //    sit on top of whatever screen is active. ──

  function _icOpenPopup(html){
    var layer=document.getElementById('isx-popup-layer');
    if(!layer) return;
    layer.innerHTML=html; layer.classList.add('active');
  }

  function _icClosePopup(){
    var layer=document.getElementById('isx-popup-layer');
    if(layer){ layer.classList.remove('active'); layer.innerHTML=''; }
    var cb=_icOnClosed;
    _icHeaderId=null; _icHeaderLabel='New'; _icBoardId=null;
    _icOnSaved=null; _icOnClosed=null;
    if(cb) cb();
  }

  // RULE: every screen reveals its OWN number on triple-click — never a
  // neighbor's. July 17, 2026: this used to be "fixed" here with a
  // per-popup badge + its own triple-click hotspot on the title. That
  // was solving the wrong problem — the actual triple-click reveal
  // ("Hidden Mickey") is a single GLOBAL listener in backpack.js that
  // shows a toast for whatever `cur` screen is active. Since these
  // capture cards deliberately never call nav() (see file header —
  // they sit on top of the host screen without disturbing it), `cur`
  // still pointed at the host (9710/9711) while a card was open, so
  // the toast reported the HOST's number, not the card's own — no
  // local badge in this file could ever have fixed that. The real fix
  // is in backpack.js's toast handler, which now checks
  // IdeaCapture.isOpen()/currentPageNum() (below) the same way it
  // already checked the MG overlay. Removed the dead local badge code
  // so there's only one triple-click reveal system in the app, not two.

  // Lets a traveler drag the whole capture card aside to peek at the
  // shotgun wall underneath — mousedown anywhere on the card EXCEPT an
  // interactive control (text entry, buttons, the image itself) starts
  // the drag. Position is session-only, same as card drag on the board.
  function _icWirePopupDrag(card){
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

  // After a successful save, the Idea card stays open and resets itself
  // rather than closing — ideas come in bursts, and closing after every
  // single one breaks that rhythm. Header saves get the same treatment,
  // plus a visible confirmation, since a header row never renders as a
  // board tile and would otherwise look like nothing happened.
  function _icResetIdeaPanelForNext(wasHeader){
    var ta=document.getElementById('isx-idea-text');
    if(!ta){
      _icClosePopup();
      return;
    }
    ta.value=''; ta.focus();
    _icIdeaMode='idea';
    _icClearPendingImage();
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

  // A pasted image or link no longer saves itself instantly — it shows a
  // preview with CANCEL/SAVE, matching the locked rule that non-text
  // content gets an explicit save affordance rather than auto-committing.
  function _icShowPendingImage(file){
    _icInputPendingImageFile=file;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      var url=URL.createObjectURL(file);
      preview.innerHTML='<img src="'+url+'" style="max-width:100%;max-height:140px;border-radius:8px;'
        +'display:block;margin:0 auto 8px;object-fit:contain">';
      preview.style.display='block';
    }
  }

  function _icClearPendingImage(){
    _icInputPendingImageFile=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }
  }

  // Same preview-then-confirm shape as the image path: show what the
  // link resolves to (or a bare fallback if unresolved) before it
  // becomes a real card. Loading state first, then fills in once the
  // shared oEmbed lookup returns — allowlisted providers only (YouTube,
  // Vimeo, Spotify, SoundCloud, TikTok).
  function _icShowPendingLink(url){
    _icInputPendingLink={url:url, title:null, thumb:null};
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      preview.innerHTML='<div style="font-size:10px;color:#7a90a8;text-align:center;padding:10px 0">Looking up this link\u2026</div>';
      preview.style.display='block';
    }
    _icResolveOEmbed(url).then(function(meta){
      if(!_icInputPendingLink || _icInputPendingLink.url!==url) return; // cancelled or replaced meanwhile
      _icInputPendingLink.title=meta&&meta.title||url;
      _icInputPendingLink.thumb=meta&&meta.thumbnail_url||null;
      if(!preview) return;
      preview.innerHTML=(_icInputPendingLink.thumb
          ? '<img src="'+_icInputPendingLink.thumb+'" style="max-width:100%;max-height:120px;border-radius:8px;display:block;margin:0 auto 6px;object-fit:contain">'
          : '<div style="font-size:28px;text-align:center;margin-bottom:4px">\ud83d\udd17</div>')
        +'<div style="font-size:12px;color:var(--isx-navy);text-align:center;font-weight:600">'+_icInputPendingLink.title+'</div>'
        +'<div style="font-size:9.5px;color:#7a90a8;text-align:center;word-break:break-word">'+url+'</div>';
    });
  }

  function _icClearPendingLink(){
    _icInputPendingLink=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }
  }

  // A single bare URL, nothing else on the line — conservative on
  // purpose, so pasting a sentence that happens to contain a link still
  // just types normally instead of getting hijacked into link mode.
  function _icIsBareUrl(text){
    return /^https?:\/\/\S+$/i.test((text||'').trim());
  }

  function _icCommitIdeaPanel(){
    if(_icInputPendingImageFile){
      var file=_icInputPendingImageFile;
      var preview=document.getElementById('isx-paste-preview');
      if(preview) preview.insertAdjacentHTML('beforeend','<div style="font-size:10px;color:#5b9bd5;text-align:center">Uploading\u2026</div>');
      _icInputPendingImageFile=null;
      _icSaveImageFile(file);
    } else if(_icInputPendingLink){
      var pending=_icInputPendingLink;
      _icInputPendingLink=null;
      _icSaveLinkCard(pending.url, pending.thumb, pending.title).then(function(){
        // _icSaveLinkCard closes the popup on success, but leaves it open
        // with an error message on failure — only reopen a fresh panel in
        // the success case, or we'd wipe out that error.
        var stillOpen=document.querySelector('#isx-popup-layer .isx-pcard');
        if(!stillOpen) _icRenderIdeaPanel();
      });
    } else {
      _icSaveCard(null);
    }
  }

  // Cancel is a permanent fixture, not a state-conditional button — it
  // resets the whole card back to blank (typed text, pending image, or
  // pending link), not just pasted content. Never closes the popup;
  // that's still the ✕'s job alone.
  function _icCancelIdeaEntry(){
    _icClearPendingImage();
    _icClearPendingLink();
    var ta=document.getElementById('isx-idea-text');
    if(ta){ ta.value=''; ta.focus(); }
  }

  // ── 1170 — Idea ──
  function _icRenderIdeaPanel(){
    _icIdeaMode='idea';
    _icInputPendingImageFile=null;
    _icInputPendingLink=null;
    _icOpenPopup('<div class="isx-pcard" data-pagenum="1170"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udca1 Idea</div>'
      +'<div class="isx-psub">Ideas are fragile. Write it down before it escapes.</div>'
      +'<button class="isx-src-btn" id="isx-p-rules" type="button" style="width:100%;margin-bottom:8px">\ud83d\udcdc Rules</button>'
      +'<div id="isx-paste-preview" style="display:none"></div>'
      +'<textarea id="isx-idea-text" placeholder="What if\u2026?"></textarea>'
      +'<div class="isx-save-row">'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>'
        +'<button class="isx-cancel" id="isx-p-cancel" type="button">CANCEL</button>'
      +'</div></div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    document.getElementById('isx-p-save').onclick=_icCommitIdeaPanel;
    document.getElementById('isx-p-cancel').onclick=_icCancelIdeaEntry;
    // RULES moved here from 9711's header, July 18, 2026 — ground rules
    // apply to the act of capturing an idea, not to viewing the board.
    document.getElementById('isx-p-rules').onclick=_icRenderRulesPanel;
    _icWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));

    var ta=document.getElementById('isx-idea-text');
    if(ta){
      ta.focus();
      ta.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _icCommitIdeaPanel(); }
      });
      // The magic input field accepts ANY pasted source, not just typed
      // text. An image on the clipboard shows a preview; a bare URL shows
      // a title+thumbnail preview via the shared oEmbed pipeline. Either
      // way, nothing saves until SAVE/ENTER — no auto-commit on paste.
      ta.addEventListener('paste', function(e){
        var items=e.clipboardData && e.clipboardData.items;
        if(items){
          for(var i=0;i<items.length;i++){
            if(items[i].type && items[i].type.indexOf('image/')===0){
              var file=items[i].getAsFile();
              if(file){
                e.preventDefault();
                _icShowPendingImage(file);
              }
              return;
            }
          }
        }
        var text=e.clipboardData && e.clipboardData.getData('text/plain');
        if(text && _icIsBareUrl(text)){
          e.preventDefault();
          _icShowPendingLink(text.trim());
        }
      });
    }
  }

  // ── 9713 — Image (currently unreachable; kept for a future dedicated
  //    entry point) ──
  function _icRenderImagePanel(){
    _icImgTab='paste'; _icImgPendingUrl=null; _icImgPendingFile=null;
    _icOpenPopup('<div class="isx-pcard" data-pagenum="9713"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udcf7 Image</div>'
      +'<div class="isx-src-row">'
        +'<button class="isx-src-btn on" data-src="paste">Paste / Upload</button>'
        +'<button class="isx-src-btn" data-src="unsplash">Unsplash</button>'
        +'<button class="isx-src-btn" data-src="ai">Generate</button>'
      +'</div>'
      +'<div id="isx-img-body"></div>'
      +'</div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    document.querySelectorAll('.isx-src-btn').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('.isx-src-btn').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on'); _icImgTab=b.getAttribute('data-src'); _icRenderImageBody();
      };
    });
    _icRenderImageBody();
    _icWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
  }

  function _icRenderImageBody(){
    var body=document.getElementById('isx-img-body');
    if(!body) return;
    if(_icImgTab==='paste'){
      body.innerHTML='<div class="isx-dropzone" id="isx-dropzone">'
        +(_icImgPendingUrl?'<img src="'+_icImgPendingUrl+'" style="max-width:100%;max-height:100%;border-radius:8px">':'Paste an image here (Ctrl/Cmd + V)<br>or choose a file below')+'</div>'
        +'<input type="file" id="isx-file-input" accept="image/*" style="width:100%;margin-bottom:8px;font-size:11px;color:#3A6080">'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>';
      var fileInput=document.getElementById('isx-file-input');
      if(fileInput) fileInput.addEventListener('change', function(){
        if(this.files && this.files[0]){
          _icImgPendingFile=this.files[0];
          var reader=new FileReader();
          reader.onload=function(ev){ _icImgPendingUrl=ev.target.result; _icRenderImageBody(); };
          reader.readAsDataURL(this.files[0]);
        }
      });
      document.getElementById('isx-p-save').onclick=function(){
        if(_icImgPendingFile){
          var dz=document.getElementById('isx-dropzone'); if(dz) dz.innerHTML='Uploading\u2026';
          _icSaveImageFile(_icImgPendingFile);
        }
      };
    } else if(_icImgTab==='unsplash'){
      body.innerHTML='<div id="isx-unsplash-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">Loading\u2026</div>'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>';
      _icLoadUnsplash();
      document.getElementById('isx-p-save').onclick=function(){ if(_icImgPendingUrl) _icSaveCard(_icImgPendingUrl); };
    } else {
      body.innerHTML='<div class="isx-dropzone">Custom AI image generation isn\u2019t wired up yet \u2014 needs an image-gen API connected.</div>';
    }
  }

  async function _icLoadUnsplash(){
    var grid=document.getElementById('isx-unsplash-grid');
    if(!grid) return;
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
        _icImgPendingUrl=this.getAttribute('data-url');
      });
    });
  }

  // ── 9714 — Link (currently unreachable; kept for a future dedicated
  //    entry point) ──
  function _icRenderLinkPanel(){
    _icLinkPendingUrl=null; _icLinkPendingThumb=null; _icLinkPendingTitle=null;
    _icOpenPopup('<div class="isx-pcard" data-pagenum="9714"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle">\ud83d\udd17 Link</div>'
      +'<input type="text" id="isx-link-url" placeholder="Paste a URL\u2026" style="margin-bottom:8px">'
      +'<div class="isx-dropzone" id="isx-link-preview" style="height:80px">Preview appears here once the link resolves</div>'
      +'<button class="isx-save" id="isx-p-save">SAVE</button></div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    _icWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
    var input=document.getElementById('isx-link-url');
    input.addEventListener('input', function(){
      var val=this.value.trim();
      _icLinkPendingUrl=val; _icLinkPendingThumb=null; _icLinkPendingTitle=null;
      if(_icLinkTimer) clearTimeout(_icLinkTimer);
      var preview=document.getElementById('isx-link-preview');
      if(!val){ if(preview) preview.textContent='Preview appears here once the link resolves'; return; }
      if(preview) preview.textContent='Resolving\u2026';
      _icLinkTimer=setTimeout(async function(){
        var meta=await _icResolveOEmbed(val);
        if(_icLinkPendingUrl!==val) return;
        if(meta){ _icLinkPendingThumb=meta.thumbnail_url; _icLinkPendingTitle=meta.title; }
        var p=document.getElementById('isx-link-preview');
        if(p) p.innerHTML = _icLinkPendingThumb
          ? ('<img src="'+_icLinkPendingThumb+'" style="max-width:100%;max-height:64px;border-radius:6px;display:block;margin:0 auto 4px">'+(_icLinkPendingTitle||val))
          : ('Ready to attach: '+val+' (no preview available)');
      }, 500);
    });
    document.getElementById('isx-p-save').onclick=function(){
      if(_icLinkPendingUrl) _icSaveLinkCard(_icLinkPendingUrl, _icLinkPendingThumb, _icLinkPendingTitle);
    };
  }

  // ── 9715 — Rules ──
  function _icRenderRulesPanel(){
    _icOpenPopup('<div class="isx-pcard" data-pagenum="9715" style="width:260px"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle" style="font-size:20px">\ud83d\udcdc Rules of Creative Thinking</div>'
      +'<div style="font-size:13px;line-height:2;color:#1A3A5C;margin-top:8px">'
        +'<div>1. No criticism.</div>'
        +'<div>2. The more, the better.</div>'
        +'<div>3. The wilder, the better.</div>'
        +'<div>4. Hitch-hike off other ideas.</div>'
      +'</div>'
      +'<button class="isx-save" id="isx-p-save">GOT IT</button></div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    document.getElementById('isx-p-save').onclick=_icClosePopup;
    _icWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));
  }

  // Click the backdrop (not the card itself) closes the popup — same
  // result as its own ✕. Wired once here, at module load, rather than by
  // whichever host screen happens to open first — that was a latent gap
  // before this file existed: a 9710 quick-capture opened before 9711 was
  // ever visited this session had no backdrop-click close at all, since
  // the old listener only got wired inside 9711's own first-render setup.
  document.addEventListener('DOMContentLoaded', function(){
    var popupLayer=document.getElementById('isx-popup-layer');
    if(popupLayer) popupLayer.addEventListener('click', function(e){
      if(e.target===popupLayer) _icClosePopup();
    });
  });

  // ── PUBLIC INTERFACE ──
  window.IdeaCapture = {
    // Opens 1170 (Idea), preconditioned to opts.headerId. Any screen can
    // call this the same way — it never navigates, it just puts the card
    // on top of whatever's currently showing.
    open: function(opts){
      opts=opts||{};
      _icHeaderId=opts.headerId||null;
      _icHeaderLabel=opts.headerLabel||'New';
      _icBoardId=opts.boardId||null;
      _icOnSaved=typeof opts.onSaved==='function'?opts.onSaved:null;
      _icOnClosed=typeof opts.onClosed==='function'?opts.onClosed:null;
      _icRenderIdeaPanel();
    },
    // Opens 9715 (Rules) — informational only, no header targeting needed.
    openRules: function(){
      _icRenderRulesPanel();
    },
    isOpen: function(){
      var layer=document.getElementById('isx-popup-layer');
      return !!(layer && layer.classList.contains('active'));
    },
    // Larry, July 29 2026: the TV remote's ⬅️ knob needed a real way to
    // close whichever card (1170/9713/9714/9715) is open, instead of
    // reaching through to the hidden host screen's own back button (see
    // tv-frame.js onKnob). Just exposes the same close every ✕/backdrop
    // click already uses.
    close: _icClosePopup,
    currentPageNum: function(){
      var openCard=document.querySelector('#isx-popup-layer .isx-pcard[data-pagenum]');
      return openCard ? openCard.getAttribute('data-pagenum') : null;
    }
  };

})();
