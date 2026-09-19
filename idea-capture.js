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

   Unified drop zone, Sept 2026 (Session 285/286) — the 1170 Idea card
   is now a real drop target, not just a paste target: an image file
   dropped on it goes through the same pending-preview-then-SAVE path
   as a pasted image; a dropped/dragged link (from a browser tab, a
   file's own URL, etc.) goes through the same path as a pasted URL.
   Any other raw file (a document, a video) gets a plain "not supported
   yet, paste a link instead" message — V1 deliberately does not host
   raw documents/video. See _icHandleIdeaDrop.
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
  var _icIdeaMode='idea';       // manual idea/header override -- wired to the isx-p-header-toggle button, Aug 7, 2026
  var _icInputPendingImageFile=null;
  var _icInputPendingLink=null; // {url, title, thumb}

  // ── NEW card fields, Sept 19 2026 (Larry's "NEW CARD" spec) ──
  var _icProjectLabel='-';      // PROJECT eyebrow -- opts.projectLabel, or '-' (Parking Lot) if none given
  var _icTopicLabel='-';        // TOPIC field -- opts.topicLabel, or '-' (Parking Lot) if none given
  var _icEntryType='idea';      // 'idea' | 'task' | 'note' -- the O IDEA/TASK/NOTES selector
  var _icCastOn=false;          // single head-cast button -- assign PRIMARY right after this saves

  // ── Image (9713) card state — kept for completeness; this panel has
  //    no live entry point right now (superseded by paste-in
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

  // NEW card, Sept 19 2026 — SUBJECT has no column of its own on `ideas`,
  // so it saves as the entry's own first line rather than a new field
  // (avoids a schema change for a V1 pass); blank when no subject was typed.
  function _icComposeText(body){
    var subjEl=document.getElementById('isx-p-subject');
    var subject=subjEl?subjEl.value.trim():'';
    return subject ? (subject+'\n\n'+body) : body;
  }

  async function _icSaveCard(imageUrl){
    var headerId=_icHeaderId||_icBoardId;
    var ta=document.getElementById('isx-idea-text');
    var rawText=(ta?ta.value:'').trim();
    if(!rawText && !imageUrl) return;
    var text=_icComposeText(rawText);
    var savedOk=false, saveErr=null, row=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){
        saveErr='Not signed in.';
      } else {
        // HEADER/SUBBER wins over the IDEA/TASK/NOTES selector -- HEADER
        // is a structural choice (this becomes a bucket other cards file
        // under), not a content flavor, same precedence the old
        // Make-this-a-Header toggle already had.
        var contentType = imageUrl ? 'image' : 'text';
        if(!imageUrl && (_icIdeaMode==='header' || _icIsAutoHeaderText(rawText))) contentType='header';
        else if(!imageUrl) contentType = (_icEntryType==='task') ? 'task' : (_icEntryType==='note') ? 'note' : 'text';
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
      _icMaybeOpenCastPicker(row);
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
    // NEW card, Sept 19 2026 -- a typed SUBJECT wins over the auto-fetched
    // oEmbed title, same "author's own words beat the automatic guess" call
    // as elsewhere in this file.
    var subjEl=document.getElementById('isx-p-subject');
    var subject=subjEl?subjEl.value.trim():'';
    var finalTitle=subject||title||url;
    var savedOk=false, saveErr=null, row=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ saveErr='Not signed in.'; }
      else{
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type:'link',
          text_content: JSON.stringify({url:url, title:finalTitle}),
          image_url: thumb||null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        }).select().single();
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_icSaveLinkCard insert error:', ins.error); }
        else { savedOk=true; row=ins.data; }
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_icSaveLinkCard exception:', e); }

    if(savedOk){
      // Aug 11 2026 bug: _icClosePopup() nulls _icOnSaved as part of its
      // own cleanup (see below), so checking _icOnSaved AFTER closing
      // always found it already gone -- the callback that adds the new
      // card into the board's cache and re-renders never fired for link
      // (video/audio/etc.) cards, unlike _icSaveCard's text/image path
      // which checks onSaved before any cleanup. That's why a pasted
      // video sat invisible until the next manual refresh. Grab the
      // callback first, close, then call it.
      var _onSavedCb=_icOnSaved;
      var wantCast=_icCastOn;
      _icClosePopup();
      if(_onSavedCb) _onSavedCb(row);
      if(wantCast) _icMaybeOpenCastPicker(row, true);
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
    _icProjectLabel='-'; _icTopicLabel='-'; _icEntryType='idea'; _icCastOn=false;
    if(cb) cb();
  }

  // Single head-cast button, Sept 19 2026 -- rather than build a second,
  // parallel person-picker just for this small card, the cast button
  // hands off to the real Cast/Call Sheet picker (idea-storyboard-
  // people.js's openCallSheet) the instant the new card has a saved row
  // to attach PRIMARY to. That's the same picker every other card in the
  // app already uses to assign PRIMARY, so there's only one such picker
  // to keep working, not two. `keepOpenCard` is true for the link-save
  // path, which already closed the popup itself before this runs.
  function _icMaybeOpenCastPicker(row, keepOpenCard){
    if(!_icCastOn || !row || !row.id) { _icCastOn=false; return; }
    _icCastOn=false;
    if(typeof window.openCallSheet==='function'){
      window.openCallSheet(row, null, 'idea', null, null, null);
    }
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
      var toggleBtn=card.querySelector('#isx-p-header-toggle');
      if(toggleBtn) toggleBtn.classList.remove('on');
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
      preview.dataset.icRole='image';
    }
  }

  function _icClearPendingImage(){
    _icInputPendingImageFile=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; preview.dataset.icRole=''; }
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
      preview.dataset.icRole='link';
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
    if(preview){ preview.innerHTML=''; preview.style.display='none'; preview.dataset.icRole=''; }
  }

  // A single bare URL, nothing else on the line — conservative on
  // purpose, so pasting a sentence that happens to contain a link still
  // just types normally instead of getting hijacked into link mode.
  function _icIsBareUrl(text){
    return /^https?:\/\/\S+$/i.test((text||'').trim());
  }

  // Unified drop zone, Sept 2026 — the card already accepted a pasted
  // image or a pasted bare URL (Ctrl/Cmd+V, above); this is the same two
  // outcomes reached by dragging instead of pasting, plus the one new
  // case paste can't produce: a raw file (not an image) dropped from the
  // desktop. V1 scope only (Session 285, Sept 15 2026) — images upload,
  // any link saves as a link reference, everything else (a .docx, an
  // .mp4, any other raw file) gets a plain boundary message rather than
  // silently failing or pretending to handle it.
  function _icShowFormatBoundaryMessage(){
    var preview=document.getElementById('isx-paste-preview');
    if(!preview) return;
    preview.innerHTML='<div style="font-size:11px;color:var(--brand-blue-gray);text-align:center;padding:6px 4px">'
      +'That file type isn’t supported yet — paste a link instead.</div>';
    preview.style.display='block';
    if(preview._icBoundaryTimer) clearTimeout(preview._icBoundaryTimer);
    preview._icBoundaryTimer=setTimeout(function(){
      // Only clear it if nothing else (an image/link preview) took over
      // the box in the meantime.
      if(preview.dataset.icRole!=='boundary') return;
      preview.innerHTML=''; preview.style.display='none';
    }, 3200);
    preview.dataset.icRole='boundary';
  }

  // First line of a dragged text/uri-list payload (browsers append
  // '#'-prefixed comment lines after the real URL per the drag-and-drop
  // spec) — falls back to text/plain for sources (e.g. some in-page drag
  // handles) that only set that.
  function _icExtractDraggedUrl(dt){
    var uriList=dt.getData('text/uri-list');
    if(uriList){
      var line=uriList.split(/\r?\n/).map(function(l){return l.trim();})
        .filter(function(l){ return l && l.charAt(0)!=='#'; })[0];
      if(line) return line;
    }
    var plain=(dt.getData('text/plain')||'').trim();
    return plain;
  }

  function _icHandleIdeaDrop(e){
    e.preventDefault();
    var card=document.querySelector('#isx-popup-layer .isx-pcard');
    if(card) card.classList.remove('isx-drop-ready');
    var dt=e.dataTransfer;
    if(!dt) return;
    if(dt.files && dt.files.length){
      var file=dt.files[0];
      if(file.type && file.type.indexOf('image/')===0){
        _icShowPendingImage(file);
      } else {
        _icShowFormatBoundaryMessage();
      }
      return;
    }
    var dragged=_icExtractDraggedUrl(dt);
    if(_icIsBareUrl(dragged)){
      _icShowPendingLink(dragged.trim());
      return;
    }
    // Plain dragged text that isn't a URL (e.g. a text selection dragged
    // in from elsewhere) — drop it into the idea field itself rather
    // than discarding it; SAVE/ENTER still decides what happens to it,
    // same as typing it directly.
    if(dragged){
      var ta=document.getElementById('isx-idea-text');
      if(ta){ ta.value = ta.value ? (ta.value+'\n'+dragged) : dragged; ta.focus(); }
    }
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

  // ── 1170 — NEW card (Larry's "NEW CARD" spec, Sept 19 2026) ──
  // PROJECT/TOPIC default to wherever this card was opened from (see
  // open()'s projectLabel/topicLabel opts) -- '-' means Parking Lot, same
  // meaning '-' has everywhere else in the app. The O IDEA/TASK/NOTES
  // selector picks the entry's flavor; HEADER/SUBBER is the same
  // structural choice the old Make-a-Header toggle made, just shown as
  // two plain buttons instead of one toggle-with-words. The cast button
  // (head icon) is optional -- see _icMaybeOpenCastPicker for what it does.
  function _icEsc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function _icRenderIdeaPanel(){
    _icIdeaMode='idea';
    _icEntryType='idea';
    _icCastOn=false;
    _icInputPendingImageFile=null;
    _icInputPendingLink=null;
    _icOpenPopup('<div class="isx-pcard" data-pagenum="1170"><button class="isx-pclose" id="isx-p-close">✕</button>'
      +'<div class="isx-ptitle" style="text-align:center;margin:0 0 4px">NEW</div>'
      +'<div class="isx-p-project" id="isx-p-project">'+_icEsc(_icProjectLabel)+'</div>'
      +'<div class="isx-p-topic" id="isx-p-topic">'+_icEsc(_icTopicLabel)+'</div>'
      +'<div class="isx-p-type-row">'
        +'<button class="isx-src-btn on" type="button" data-type="idea">○ IDEA</button>'
        +'<button class="isx-src-btn" type="button" data-type="task">○ TASK</button>'
        +'<button class="isx-src-btn" type="button" data-type="note">○ NOTES</button>'
      +'</div>'
      +'<div class="isx-p-subject"><input type="text" id="isx-p-subject" placeholder="Subject (optional)"></div>'
      +'<div id="isx-paste-preview" style="display:none"></div>'
      +'<textarea id="isx-idea-text" placeholder="What if…? (type, paste, or drop anything)"></textarea>'
      +'<div class="isx-p-bottom-row">'
        +'<button class="isx-p-hs-btn" type="button" id="isx-p-header-btn">HEADER</button>'
        +'<button class="isx-p-hs-btn on" type="button" id="isx-p-subber-btn">SUBBER</button>'
        +'<button class="isx-p-cast-btn" type="button" id="isx-p-cast-btn" title="Assign PRIMARY once saved">👤</button>'
      +'</div>'
      +'<div class="isx-save-row">'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>'
        +'<button class="isx-cancel" id="isx-p-cancel" type="button">CANCEL</button>'
      +'</div></div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    document.getElementById('isx-p-save').onclick=_icCommitIdeaPanel;
    document.getElementById('isx-p-cancel').onclick=_icCancelIdeaEntry;

    // O IDEA / TASK / NOTES -- one selected at a time.
    (function(){
      var typeBtns=document.querySelectorAll('.isx-p-type-row .isx-src-btn');
      typeBtns.forEach(function(b){
        b.onclick=function(){
          _icEntryType=b.getAttribute('data-type');
          typeBtns.forEach(function(x){ x.classList.toggle('on', x===b); });
        };
      });
    })();

    // HEADER / SUBBER -- wires the same _icIdeaMode variable _icSaveCard
    // already checks; SUBBER (adds under the current header) is the
    // default, matching how this card is opened everywhere today.
    (function(){
      var hBtn=document.getElementById('isx-p-header-btn');
      var sBtn=document.getElementById('isx-p-subber-btn');
      function paint(){
        if(hBtn) hBtn.classList.toggle('on', _icIdeaMode==='header');
        if(sBtn) sBtn.classList.toggle('on', _icIdeaMode!=='header');
      }
      if(hBtn) hBtn.onclick=function(){ _icIdeaMode='header'; paint(); };
      if(sBtn) sBtn.onclick=function(){ _icIdeaMode='idea'; paint(); };
      paint();
    })();

    // Cast button -- just arms/disarms _icCastOn here; the actual person
    // picker only opens once this entry has a saved row (see
    // _icMaybeOpenCastPicker), since PRIMARY has to attach to something.
    (function(){
      var castBtn=document.getElementById('isx-p-cast-btn');
      if(castBtn) castBtn.onclick=function(){
        _icCastOn=!_icCastOn;
        castBtn.classList.toggle('on', _icCastOn);
      };
    })();

    _icWirePopupDrag(document.querySelector('#isx-popup-layer .isx-pcard'));

    var subjectInput=document.getElementById('isx-p-subject');
    if(subjectInput){
      subjectInput.addEventListener('keydown', function(e){
        if(e.key==='Enter'){ e.preventDefault(); var ta2=document.getElementById('isx-idea-text'); if(ta2) ta2.focus(); }
      });
    }

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

    // Unified drop zone — the whole card is the target, not just the
    // textarea, so dropping doesn't depend on hitting a small hit area.
    // dragover must preventDefault too, or the browser never fires drop
    // at all (it just opens the dropped file as its own page/tab).
    var dropCard=document.querySelector('#isx-popup-layer .isx-pcard');
    if(dropCard){
      var dragDepth=0; // dragenter/dragleave fire on every child crossed, not just the card's own edge
      dropCard.addEventListener('dragenter', function(e){
        e.preventDefault();
        dragDepth++;
        dropCard.classList.add('isx-drop-ready');
      });
      dropCard.addEventListener('dragover', function(e){ e.preventDefault(); });
      dropCard.addEventListener('dragleave', function(){
        dragDepth=Math.max(0, dragDepth-1);
        if(dragDepth===0) dropCard.classList.remove('isx-drop-ready');
      });
      dropCard.addEventListener('drop', function(e){
        dragDepth=0;
        _icHandleIdeaDrop(e);
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
    } else {
      body.innerHTML='<div class="isx-dropzone">Custom AI image generation isn\u2019t wired up yet \u2014 needs an image-gen API connected.</div>';
    }
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
    // Opens 1170 (the NEW card), preconditioned to opts.headerId. Any
    // screen can call this the same way — it never navigates, it just
    // puts the card on top of whatever's currently showing.
    // opts.projectLabel/opts.topicLabel (Sept 19 2026) — the PROJECT/TOPIC
    // eyebrow text to show; omit or pass null/'' for Parking Lot ('-').
    open: function(opts){
      opts=opts||{};
      _icHeaderId=opts.headerId||null;
      _icHeaderLabel=opts.headerLabel||'New';
      _icBoardId=opts.boardId||null;
      _icProjectLabel=opts.projectLabel||'-';
      _icTopicLabel=opts.topicLabel||'-';
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
