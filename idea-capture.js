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

   Accept-anything, Sept 28 2026 (universal input card) — ANY other file
   (document, sheet, slide, audio, video, archive, unfamiliar type) now
   waits as a chip until SAVE and is saved as a link-type card carrying
   file:true (see _icSaveFileCard). Only programs/installers/scripts and
   files over 50 MB are turned away, each with a plain message — see
   _icAcceptFile, the one door drop, paste and the ATTACH button share.
   The ID Band also changed: a NEW chip (flips to the assigned person's
   first name), TOPIC (one field opening the shared topic pyramid,
   replacing the old separate PROJECT and TOPIC pickers), and BOARD
   (Blue Sky / Briefing / Notebook, which replaces the old
   IDEA/TASK/NOTES row), and the
   HEADER/SUBBER buttons are gone — a trailing ? or : makes a header.
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
  // Sept 28 2026 (universal input card) -- ANY other file (document, sheet,
  // slide, audio, video, archive, anything unfamiliar) waits here as a chip
  // until SAVE, same hold-then-confirm shape as a pending image or link.
  var _icInputPendingFile=null;
  // Board Type, Sept 28 2026 -- the ID Band's second field. It replaces the
  // old IDEA/TASK/NOTES row because the board already implies the kind:
  // BLUE SKY -> idea, BRIEFING -> task, NOTEBOOK -> note. _icEntryType stays
  // as the internal flavor every save path below already reads; picking a
  // Board Type just sets both together (see _icSetBoardKind).
  var _icBoardKind='IDEA';      // 'IDEA' (BLUE SKY) | 'BRIEFING BOARD' | 'NOTEBOOK'
  var _IC_BOARD_KINDS=[
    // Sept 29 2026 -- Larry: SEA OF IDEAS goes above BLUE SKY. The board
    // itself exists now; saving a NEW card straight into it isn't built.
    {value:'SEA',            label:'SEA OF IDEAS', soon:'Saving straight into SEA OF IDEAS isn’t built yet — pick another board for now.'},
    {value:'IDEA',           label:'BLUE SKY',   entry:'idea'},
    {value:'BRIEFING BOARD', label:'BRIEFING',   entry:'task'},
    {value:'NOTEBOOK',       label:'NOTEBOOK',   entry:'note'},
    // Shown so the full set is visible, but nothing to save into yet --
    // picking one explains that instead of silently saving elsewhere.
    {value:'PLAN',           label:'PATHFINDER',   soon:'PATHFINDER cards are coming soon — pick another board for now.'},
    {value:'SHARE',          label:'STORY',        soon:'STORY BOARD is coming soon — pick another board for now.'}
  ];

  // ── NEW card fields, Sept 19 2026 (Larry's "NEW CARD" spec) ──
  // Sept 20 2026, Larry: the top project level is always MASTER, never a
  // '-' -- a caller with no real project row underneath it (the true
  // account-wide root, above every project) is still MASTER, not "no
  // project". '-' now means Parking Lot only in the TOPIC field, which
  // legitimately can be project-less.
  var _icProjectLabel='MASTER'; // PROJECT eyebrow -- opts.projectLabel, or 'MASTER' if none given
  var _icTopicLabel='-';        // TOPIC field -- opts.topicLabel, or '-' (Parking Lot) if none given
  var _icEntryType='idea';      // 'idea' | 'task' | 'note' -- the O IDEA/TASK/NOTES selector
  // Cast, Sept 19 2026 round 5 -- Larry: one button only, styled exactly
  // like the VIEW list at the top of the board (same roster, same dark
  // .sc-cdrop-menu look), with a (+) at the bottom to add someone not
  // on it yet. Picking a name assigns PRIMARY directly. The round-4
  // double-head "open the full Call Sheet" button is gone -- Larry
  // pointed out that's redundant with the Cast/Call Sheet picker
  // already on the back of a card. Only fires once this entry has a
  // saved row to attach a card_roles row to -- see _icMaybeApplyCast
  // (renamed from _icMaybeOpenCastPicker back in round 4).
  var _icCastPersonId=null;     // user_id to assign PRIMARY to directly
  var _icCastFromAbove=false;   // picked from the level above -> gold ★ thread (Sept 23 2026)
  var _icCastPersonName='';     // label shown on the button once picked
  // PROJECT/TOPIC picker, Sept 19 2026 round 3 -- _icProjectId is the
  // real row id behind PROJECT (needed to look up that project's own
  // TOPIC list); picking a PROJECT re-points _icBoardId at that
  // project's own root (its Parking Lot) until a TOPIC is also picked,
  // same "PROJECT changes, TOPIC cascades under it" rule Larry described.
  var _icProjectId=null;
  // Which board this open() targets, Sept 19 2026 round 3 -- 'idea'
  // (default) saves into the ideas table exactly as before; 'bb' saves a
  // real Briefing Board card instead, via _icSaveBBCard. HEADER/SUBBER
  // and image/link attachments only apply in 'idea' mode -- BB cards
  // have no header/subber concept and (like the rest of Briefing Board
  // today) are text-only.
  var _icMode='idea';

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
        //
        // Sept 20 2026: TASK and NOTES no longer reach this function at
        // all -- _icCommitIdeaPanel now diverts them to the Briefing
        // Board (_icSaveBBCard) and the Notebook (_icSaveNotebookCard)
        // respectively before this is ever called, using this same
        // HEADER-wins check. So contentType here only ever needs
        // 'image', 'header', or plain 'text' -- the ideas table's
        // content_type column was never widened to allow 'task'/'note'
        // (see content_type_check) and doesn't need to be, now that
        // neither value is ever written to it.
        var contentType = imageUrl ? 'image' : 'text';
        if(!imageUrl && (_icIdeaMode==='header' || _icIsAutoHeaderText(rawText))) contentType='header';
        // SUBJECT has its own column on ideas now (Sept 22 2026) -- it
        // rides the card face as a bold headline with the contents
        // optional underneath (see idea-storyboard-tiles.js). Headers
        // keep the old folded-in text: a header's text IS its name.
        var _icSubjEl2=document.getElementById('isx-p-subject');
        var _icSubject=(contentType!=='header' && _icSubjEl2) ? _icSubjEl2.value.trim() : '';
        if(contentType!=='header') text=rawText;
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type: contentType,
          subject: _icSubject||null,
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
      _icMaybeApplyCast(row);
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
          subject: subject||null,
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
      var wantCastPersonId=_icCastPersonId, wantCastFromAbove=_icCastFromAbove;
      _icClosePopup();
      if(_onSavedCb) _onSavedCb(row);
      _icCastFromAbove=wantCastFromAbove;
      _icMaybeApplyCast(row, true, wantCastPersonId);
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

  // Any other file (Sept 28 2026). Uploads the raw file as-is (no
  // compression -- that only makes sense for images) to the same public
  // bucket images use, then saves it as a LINK-type card whose JSON carries
  // file:true plus the name/extension/size/kind. Riding the existing 'link'
  // content type means no schema change and no new tile code: the card
  // already opens its URL, and the tile shows a paperclip instead of the
  // link glyph when file is true (see T2TMedia.parseText). Stays open for
  // the next entry, same as the image path. Typed text becomes the card's
  // title when there's no SUBJECT, so nothing typed is thrown away.
  async function _icSaveFileCard(file){
    var headerId=_icHeaderId||_icBoardId;
    var subjEl=document.getElementById('isx-p-subject');
    var subject=subjEl?subjEl.value.trim():'';
    var ta=document.getElementById('isx-idea-text');
    var typed=(ta?ta.value:'').trim();
    var savedOk=false, saveErr=null, row=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ saveErr='Not signed in.'; }
      else{
        var fname=file.name||('file-'+Date.now());
        var path=user.id+'/'+Date.now()+'-'+fname.replace(/[^a-zA-Z0-9._-]/g,'_');
        var up=await _sb.storage.from('sea-of-ideas').upload(path, file);
        if(up.error) throw up.error;
        var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
        var url=pub.data && pub.data.publicUrl;
        if(!url) throw new Error('No public URL returned.');
        var k=_icFileKind(file);
        var title=subject || typed.split('\n')[0].slice(0,120) || fname;
        var ins=await _sb.from('ideas').insert({
          user_id:user.id,
          content_type:'link',
          subject: subject||null,
          text_content: JSON.stringify({url:url, title:title, file:true, name:fname, ext:_icFileExt(fname), size:file.size, kind:k.kind}),
          image_url: null,
          cluster_id: headerId||null,
          created_at:new Date().toISOString()
        }).select().single();
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_icSaveFileCard insert error:', ins.error); }
        else { savedOk=true; row=ins.data; }
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_icSaveFileCard exception:', e); }

    if(savedOk){
      if(_icOnSaved) _icOnSaved(row);
      _icMaybeApplyCast(row);
      _icResetIdeaPanelForNext(false, 'File attached — keep going');
    } else {
      // Put the chip back so the traveler can retry without re-dropping it.
      _icShowPendingFile(file);
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
    _icProjectLabel='MASTER'; _icTopicLabel='-'; _icProjectId=null; _icEntryType='idea'; _icBoardKind='IDEA'; _icInputPendingFile=null; _icCastPersonId=null; _icCastPersonName=''; _icCastFromAbove=false; _icMode='idea';
    var stray=document.getElementById('isx-p-field-menu'); if(stray) stray.remove();
    if(cb) cb();
  }

  // Cast, Sept 19 2026 round 5 -- one button, one job: _icCastPersonId
  // was picked from the same roster the VIEW button lists (see the
  // roster-dropdown wiring below). Assigns that person PRIMARY directly
  // via T2TStoryboard.assignPrimaryDirect, no extra screen -- the
  // picking already happened before SAVE. (Round 4's second, double-
  // head button that opened the full Call Sheet is gone -- Larry:
  // that's already on the back of the card, this button doesn't need
  // to duplicate it.) Only fires once the entry has a saved row to
  // attach a card_roles row to. `keepOpenCard` is unused now but kept
  // in the signature so both call sites below don't need touching
  // again; personIdOverride lets the link-save path pass in the value
  // it captured BEFORE _icClosePopup() reset _icCastPersonId.
  function _icMaybeApplyCast(row, keepOpenCard, personIdOverride, cardTypeOverride){
    var personId = (personIdOverride!==undefined) ? personIdOverride : _icCastPersonId;
    var fromAbove=_icCastFromAbove;
    _icCastPersonId=null; _icCastPersonName=''; _icCastFromAbove=false;
    if(!row || !row.id || !personId) return;
    var cardType = cardTypeOverride || ((_icMode==='bb') ? 'briefing_card' : 'idea');
    if(window.T2TStoryboard && typeof window.T2TStoryboard.assignPrimaryDirect==='function'){
      window.T2TStoryboard.assignPrimaryDirect(row, cardType, personId, {fromAbove:fromAbove})
        .then(function(res){ if(res && !res.ok) console.warn('NEW card: PRIMARY assign failed', res.msg); });
    }
  }

  // Briefing Board save path, Sept 19 2026 -- Larry: "YES save to BB!!
  // That is the point. Think of it and it goes there." Mirrors
  // briefing-board.js's own _bbSaveNewCard (same card shape, same
  // project-tag + auto-assign sequencing) rather than inventing a
  // second way to create a BB card; this is just a second DOOR into
  // that same save path. PROJECT/TOPIC picked on this card become the
  // card's projectHeaderId tag -- '-' (Parking Lot) leaves it untagged,
  // same meaning Parking Lot already has everywhere else.
  function _icSaveBBCard(){
    var ta=document.getElementById('isx-idea-text');
    var rawText=(ta?ta.value:'').trim();
    if(!rawText) return;
    // SUBJECT gets its own column on briefing_cards now (Sept 22 2026) --
    // it rides the card front as a headline under the PROJECT eyebrow,
    // so it's kept separate here instead of folded into the task text
    // the way _icComposeText still does for Idea-board entries.
    var text=rawText;
    var _icSubjEl=document.getElementById('isx-p-subject');
    var subject=_icSubjEl?_icSubjEl.value.trim():'';
    if(typeof _bbCardsList!=='function' || typeof _bbSaveLocal!=='function' || typeof _bbUUID!=='function'){
      console.error('NEW card (BB): Briefing Board save functions are not loaded on this page.');
      return;
    }
    var cards=_bbCardsList();
    var maxOrder=cards.filter(function(c){ return c.col==='new' && typeof c.sortOrder==='number'; })
      .reduce(function(m,c){ return Math.max(m,c.sortOrder); }, -1);
    var newCardId=_bbUUID();
    var projectHeaderId=_icBoardId||null;
    cards.push({id:newCardId, col:'new', sortOrder:maxOrder+1, assigned:(typeof _bbToday==='function'?_bbToday():''),
      task:text, subject:subject, person:(typeof _bbCurrentBoardDefaultAssignee==='function'?_bbCurrentBoardDefaultAssignee():''),
      due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false,
      reviewedBy:(typeof REVIEWERS!=='undefined'?REVIEWERS[0]:''), archived:false, projectHeaderId:projectHeaderId});
    var sync=_bbSaveLocal(cards);
    if(projectHeaderId && typeof _bbStampCardProject==='function'){
      if(sync && sync.then) sync.then(function(){ return _bbStampCardProject(newCardId, projectHeaderId); })
        .catch(function(e){ console.error('NEW card (BB): could not tag project', e); });
      else _bbStampCardProject(newCardId, projectHeaderId);
    }
    if(typeof _bbAutoAssignToActiveFilter==='function'){
      if(sync && sync.then) sync.then(function(){ return _bbAutoAssignToActiveFilter(newCardId); })
        .catch(function(e){ console.error('NEW card (BB): could not auto-assign', e); });
      else _bbAutoAssignToActiveFilter(newCardId);
    }
    if(typeof renderBoard==='function') renderBoard();
    var row={id:newCardId};
    // Only the Briefing Board's own NEW door passes an onSaved that
    // expects a BB card back (today it passes none at all -- see
    // openAddCard). A save diverted here from another screen's NEW
    // button (Sept 20 2026: TASK entries) carries THAT screen's own
    // onSaved, built to add an *ideas*-table row to its own board --
    // calling it with this synthetic {id} would add a broken tile
    // there for a card that doesn't belong on that board at all, so
    // it's skipped whenever this save wasn't opened as a genuine 'bb'
    // card to begin with.
    if(_icMode==='bb' && _icOnSaved) _icOnSaved(row);
    _icMaybeApplyCast(row, false, undefined, 'briefing_card');
    _icResetIdeaPanelForNext(false, 'Sent to Briefing Board');
  }

  // Notebook save path, Sept 20 2026 -- Larry, asked where NOTES should
  // go: "Where is the Notebook data kept? That is where this info
  // goes." journal_notes is that table -- the exact same one
  // notebook-open.js's own save and backpack.js's saveEntryToSupabase
  // already write to (user_id, note_text, topic, page_context,
  // entry_date, created_at -- see notebook-open.js's file header for
  // the shared shape). This is a fresh insert every time, same as
  // backpack.js's own quick-save -- multiple NOTES cards saved the same
  // day become multiple rows, same as writing them by hand straight
  // into the Notebook would, and they show up in the Notebook's own
  // history list next time it's opened. No card_roles concept exists
  // for a journal note, so unlike _icSaveBBCard this doesn't touch
  // Cast/PRIMARY at all -- just clears whatever was armed so a stray
  // pick doesn't leak into the next card.
  async function _icSaveNotebookCard(){
    var ta=document.getElementById('isx-idea-text');
    var rawText=(ta?ta.value:'').trim();
    if(!rawText) return;
    var text=_icComposeText(rawText);
    var savedOk=false, saveErr=null;
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ saveErr='Not signed in.'; }
      else{
        var now=new Date();
        var dateStr=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var ins=await _sb.from('journal_notes').insert({
          user_id:user.id, note_text:text, topic:null,
          page_context:'Idea Board', entry_date:dateStr, created_at:now.toISOString()
        });
        if(ins.error){ saveErr=ins.error.message||String(ins.error); console.error('_icSaveNotebookCard insert error:', ins.error); }
        else savedOk=true;
      }
    }catch(e){ saveErr=(e&&e.message)?e.message:String(e); console.error('_icSaveNotebookCard exception:', e); }

    if(savedOk){
      _icCastPersonId=null; _icCastPersonName=''; _icCastFromAbove=false;
      _icResetIdeaPanelForNext(false, 'Sent to Notebook');
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
  function _icResetIdeaPanelForNext(wasHeader, flashText){
    var ta=document.getElementById('isx-idea-text');
    if(!ta){
      _icClosePopup();
      return;
    }
    ta.value=''; ta.focus();
    _icIdeaMode='idea';
    _icClearPendingImage();
    _icClearPendingFile();
    // Sept 27 2026 fix (Larry: subject carried over into the next add) --
    // Subject is per-entry, same as the idea text itself, so it has to
    // clear here too instead of sitting there for whatever gets typed next.
    var subjEl=document.getElementById('isx-p-subject');
    if(subjEl) subjEl.value='';
    // The head button's pick is spent once the entry is saved (see
    // _icMaybeApplyCast), so the band's NEW chip goes back to NEW too.
    var newChip=document.getElementById('isx-p-newchip-txt');
    if(newChip) newChip.textContent='NEW';
    var castBtnReset=document.getElementById('isx-p-cast-btn');
    if(castBtnReset){ castBtnReset.classList.remove('on'); castBtnReset.title='Pick who’s PRIMARY'; }
    _icSyncKindLine();
    var card=document.querySelector('#isx-popup-layer .isx-pcard');
    if(card){
      // (HEADER/SUBBER buttons were retired Sept 28 2026 -- a trailing ? or
      // : makes a header now -- so there's nothing to repaint here.)
      var old=card.querySelector('.isx-save-flash'); if(old) old.remove();
      var flash=document.createElement('div');
      flash.className='isx-save-flash';
      flash.style.cssText='color:#2f7a4f;font-size:11px;text-align:center;margin-top:4px';
      // flashText lets a caller name a different destination (Sept 20
      // 2026: a TASK save routed to the Briefing Board) -- defaults to
      // the plain same-board confirmation otherwise.
      flash.textContent = flashText || (wasHeader ? 'Header added \u2014 add ideas here \u2193' : 'Saved \u2014 keep going');
      card.appendChild(flash);
      setTimeout(function(){ if(flash && flash.parentNode) flash.parentNode.removeChild(flash); }, 2200);
    }
  }

  // A pasted image or link no longer saves itself instantly — it shows a
  // preview with CANCEL/SAVE, matching the locked rule that non-text
  // content gets an explicit save affordance rather than auto-committing.
  function _icShowPendingImage(file){
    _icInputPendingFile=null;
    _icInputPendingImageFile=file;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      var url=URL.createObjectURL(file);
      preview.innerHTML='<img src="'+url+'" style="max-width:100%;max-height:140px;border-radius:8px;'
        +'display:block;margin:0 auto 8px;object-fit:contain">';
      preview.style.display='block';
      preview.dataset.icRole='image';
    }
    _icSyncKindLine();
  }

  function _icClearPendingImage(){
    _icInputPendingImageFile=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; preview.dataset.icRole=''; }
    _icSyncKindLine();
  }

  // Same preview-then-confirm shape as the image path: show what the
  // link resolves to (or a bare fallback if unresolved) before it
  // becomes a real card. Loading state first, then fills in once the
  // shared oEmbed lookup returns — allowlisted providers only (YouTube,
  // Vimeo, Spotify, SoundCloud, TikTok).
  function _icShowPendingLink(url){
    _icInputPendingFile=null;
    _icInputPendingLink={url:url, title:null, thumb:null};
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      preview.innerHTML='<div style="font-size:10px;color:#7a90a8;text-align:center;padding:10px 0">Looking up this link\u2026</div>';
      preview.style.display='block';
      preview.dataset.icRole='link';
    }
    _icSyncKindLine();
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
    _icSyncKindLine();
  }

  // A single bare URL, nothing else on the line — conservative on
  // purpose, so pasting a sentence that happens to contain a link still
  // just types normally instead of getting hijacked into link mode.
  function _icIsBareUrl(text){
    return /^https?:\/\/\S+$/i.test((text||'').trim());
  }

  // Sept 27 2026 -- Larry: "why can't we paste a document into the new
  // card content area?" Cheap heuristic, not a real parse: long enough,
  // AND either real paragraph breaks or several sentences, that it's
  // more plausibly a document than a single short idea. Only decides
  // whether to show the offer banner -- the traveler still chooses.
  function _icLooksLikeDocument(text){
    var t=(text||'').trim();
    if(t.length<220) return false;
    var hasParagraphs = /\n\s*\n/.test(t);
    var sentenceCount = (t.match(/[.!?](?=\s|$)/g)||[]).length;
    return hasParagraphs || sentenceCount>=3;
  }

  // ── Attachments: accept anything, with a short block list, Sept 28 2026
  // (Larry: "I would like to accept anything with rare exceptions noted by
  // message"). Known kinds get their own chip label and icon; everything
  // else is a plain "file" chip, so nothing is turned away for being
  // unfamiliar. The exceptions are files that can RUN on someone's computer
  // (programs, installers, scripts) and files over the size ceiling. Both
  // checks run on the name AND the first bytes, so renaming a program to
  // .txt doesn't get it past.
  var _IC_MAX_FILE_BYTES=50*1024*1024; // Supabase's default per-upload ceiling on this project
  var _IC_BLOCKED_EXT=/^(exe|msi|bat|cmd|com|scr|pif|app|dmg|apk|jar|vbs|vbe|wsf|ps1|sh|cpl|reg|lnk|js)$/i;
  var _IC_BLOCKED_MSG='That file type can’t be attached — it can run programs on a computer. Try zipping it, or describing it in a note.';
  var _IC_FILE_KINDS=[
    {kind:'image',    icon:'🖼', ext:/^(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i, mime:/^image\//},
    {kind:'document', icon:'📄', ext:/^(pdf|docx?|txt|md|rtf|odt|pages|epub)$/i},
    {kind:'sheet',    icon:'📊', ext:/^(xlsx?|csv|tsv|ods|numbers)$/i},
    {kind:'slide',    icon:'📽', ext:/^(pptx?|key|odp)$/i},
    {kind:'audio',    icon:'🎵', ext:/^(mp3|m4a|wav|aac|flac|ogg|oga|aiff?)$/i, mime:/^audio\//},
    {kind:'video',    icon:'🎬', ext:/^(mp4|mov|m4v|webm|avi|mkv|mpe?g)$/i, mime:/^video\//}
  ];

  function _icFileExt(name){
    var m=/\.([A-Za-z0-9]{1,8})$/.exec(name||'');
    return m ? m[1].toLowerCase() : '';
  }

  function _icFileKind(file){
    var ext=_icFileExt(file && file.name), type=(file && file.type)||'';
    for(var i=0;i<_IC_FILE_KINDS.length;i++){
      var k=_IC_FILE_KINDS[i];
      if((k.ext && k.ext.test(ext)) || (k.mime && k.mime.test(type))) return {kind:k.kind, icon:k.icon};
    }
    return {kind:'file', icon:'📎'};
  }

  function _icFormatBytes(n){
    if(n<1024) return n+' B';
    if(n<1024*1024) return Math.round(n/1024)+' KB';
    return (n/(1024*1024)).toFixed(n>=10*1024*1024?0:1)+' MB';
  }

  // First bytes only -- enough to recognise a Windows/Linux/Mac executable
  // or a shebang script no matter what the file was renamed to.
  function _icLooksExecutable(file){
    return new Promise(function(resolve){
      try{
        var reader=new FileReader();
        reader.onload=function(){
          var b=new Uint8Array(reader.result||new ArrayBuffer(0));
          var hex=Array.prototype.map.call(b.subarray(0,4), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
          resolve(hex.indexOf('4d5a')===0            // MZ -- Windows program
            || hex==='7f454c46'                        // ELF -- Linux program
            || hex==='feedface' || hex==='feedfacf' || hex==='cefaedfe' || hex==='cffaedfe' // Mach-O -- Mac program
            || hex.indexOf('2321')===0);               // #! -- shebang script
        };
        reader.onerror=function(){ resolve(false); };
        reader.readAsArrayBuffer(file.slice(0,4));
      }catch(e){ resolve(false); }
    });
  }

  // HEIC/HEIF won't display in most browsers, so it rides as a file chip
  // rather than a broken image card; every other image/* keeps the existing
  // compress-and-upload image path.
  function _icIsRenderableImage(file){
    var t=(file && file.type)||'', ext=_icFileExt(file && file.name);
    return t.indexOf('image/')===0 && !/^(heic|heif)$/i.test(ext) && !/heic|heif/i.test(t);
  }

  // One door for every file that arrives by drop, paste, or the attach
  // button. Validates first, then routes: a renderable image goes to the
  // existing pending-image preview, anything else becomes a file chip.
  async function _icAcceptFile(file, extraCount){
    if(!file) return;
    if(_IC_BLOCKED_EXT.test(_icFileExt(file.name)) || await _icLooksExecutable(file)){
      _icShowFormatBoundaryMessage(_IC_BLOCKED_MSG);
      return;
    }
    if(file.size>_IC_MAX_FILE_BYTES){
      _icShowFormatBoundaryMessage('That file is '+_icFormatBytes(file.size)+' — the limit is '+_icFormatBytes(_IC_MAX_FILE_BYTES)+'. Try a smaller version or a link to it.');
      return;
    }
    if(_icIsRenderableImage(file)) _icShowPendingImage(file);
    else _icShowPendingFile(file, extraCount);
  }

  function _icShowPendingFile(file, extraCount){
    _icClearPendingImage(); _icClearPendingLink();
    _icInputPendingFile=file;
    var k=_icFileKind(file), ext=_icFileExt(file.name);
    var preview=document.getElementById('isx-paste-preview');
    if(preview){
      preview.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border:1.5px solid var(--isx-paleblue);border-radius:8px;margin-bottom:8px">'
        +'<div style="font-size:26px;line-height:1">'+k.icon+'</div>'
        +'<div style="min-width:0;flex:1;text-align:left">'
          +'<div style="font-size:12px;font-weight:700;color:var(--isx-navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_icEsc(file.name||'file')+'</div>'
          +'<div style="font-size:9.5px;letter-spacing:.6px;text-transform:uppercase;color:#7a90a8">'+k.kind+(ext?' · '+_icEsc(ext):'')+' · '+_icFormatBytes(file.size)
            +(extraCount>0?' · 1 of '+(extraCount+1)+' — add the rest one at a time':'')+'</div>'
        +'</div></div>';
      preview.style.display='block';
      preview.dataset.icRole='file';
    }
    _icSyncKindLine();
  }

  function _icClearPendingFile(){
    _icInputPendingFile=null;
    var preview=document.getElementById('isx-paste-preview');
    if(preview && preview.dataset.icRole==='file'){ preview.innerHTML=''; preview.style.display='none'; preview.dataset.icRole=''; }
    _icSyncKindLine();
  }

  // The eyebrow line under the divider ("image · document · ...") is a
  // hint, so it's only shown while the card is empty -- once there's text or
  // something attached, the entry itself is the message. Larry, Sept 27
  // 2026: "I also like the input options visible until an entry is made."
  function _icSyncKindLine(){
    var el=document.getElementById('isx-p-kindline');
    if(!el) return;
    var ta=document.getElementById('isx-idea-text');
    var empty=!(ta && ta.value.trim()) && !_icInputPendingImageFile && !_icInputPendingLink && !_icInputPendingFile;
    el.style.visibility = empty ? 'visible' : 'hidden'; // hidden, not display:none, so the card doesn't jump in height
  }

  // Keeps Board Type and the internal entry flavor in step -- see the
  // comment on _IC_BOARD_KINDS above.
  function _icSetBoardKind(value){
    var k=_IC_BOARD_KINDS.filter(function(x){ return x.value===value && !x.soon; })[0];
    if(!k) return false;
    _icBoardKind=k.value; _icEntryType=k.entry;
    var txt=document.getElementById('isx-p-board-txt'); if(txt) txt.textContent=k.label;
    // Live recolor (Sept 28 2026, Larry): the card wears the color of the
    // board it is going to -- light blue for Blue Sky, tan for Briefing,
    // green for Notebook -- so color always says where the entry lands.
    var cardEl=document.querySelector('#isx-popup-layer .isx-pcard-uni');
    if(cardEl){
      cardEl.classList.toggle('isx-pcard-bb', k.value==='BRIEFING BOARD');
      cardEl.classList.toggle('isx-pcard-nb', k.value==='NOTEBOOK');
    }
    return true;
  }

  // Unified drop zone, Sept 2026 — the card already accepted a pasted
  // image or a pasted bare URL (Ctrl/Cmd+V, above); this is the same two
  // outcomes reached by dragging instead of pasting, plus the one new
  // case paste can't produce: a raw file (not an image) dropped from the
  // desktop. V1 scope only (Session 285, Sept 15 2026) — images upload,
  // any link saves as a link reference, everything else (a .docx, an
  // .mp4, any other raw file) gets a plain boundary message rather than
  // silently failing or pretending to handle it.
  function _icShowFormatBoundaryMessage(msg){
    var preview=document.getElementById('isx-paste-preview');
    if(!preview) return;
    preview.innerHTML='<div style="font-size:11px;color:var(--brand-blue-gray);text-align:center;padding:6px 4px">'
      +(msg||'That file type isn’t supported yet — paste a link instead.')+'</div>';
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
      // Any file is welcome now (Sept 28 2026) -- _icAcceptFile decides
      // between an image preview, a file chip, or a plain message for the
      // few blocked types. Only the first file is taken per drop.
      _icAcceptFile(dt.files[0], dt.files.length-1);
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
    // Briefing Board cards are text-only today (see _icMode's own
    // comment) -- a pending image/link is a dead end there rather than
    // silently mis-saving, so it stops here with a plain explanation
    // instead of reaching the ideas-table-only save paths below.
    //
    // Sept 20 2026, Larry: "At any moment a person might think of an
    // idea or a task -- items should move to the appropriate board
    // immediately." So TASK now routes to the Briefing Board through
    // the same _icSaveBBCard door the BB screen's own NEW button uses
    // (Sept 19), no matter which screen's NEW button this card was
    // opened from -- not only when _icMode is already 'bb'. NOTES
    // routes the same way to the Notebook (journal_notes -- Larry:
    // "That is where this info goes"), via the new _icSaveNotebookCard
    // below. HEADER still wins over either -- a header is a structural
    // bucket on the Idea board's own hierarchy, never a BB card or a
    // Notebook page -- matching HEADER's existing precedence over
    // IDEA/TASK/NOTES in _icSaveCard, auto-detected header text
    // (trailing : or ?) included, same as that precedence already
    // checks.
    var _icCommitRawText=(function(){ var t=document.getElementById('isx-idea-text'); return t?t.value:''; })();
    var _icCommitIsHeader = (_icIdeaMode==='header') || (!_icInputPendingImageFile && _icIsAutoHeaderText(_icCommitRawText));
    var wantsBB = (_icMode==='bb') || (_icEntryType==='task' && !_icCommitIsHeader);
    if(wantsBB){
      if(_icInputPendingImageFile || _icInputPendingLink || _icInputPendingFile){
        _icShowFormatBoundaryMessage('Briefing Board cards are text-only for now — type it in as text instead.');
        return;
      }
      _icSaveBBCard();
      return;
    }
    if(_icEntryType==='note' && !_icCommitIsHeader){
      if(_icInputPendingImageFile || _icInputPendingLink || _icInputPendingFile){
        _icShowFormatBoundaryMessage('Notebook cards are text-only for now — type it in as text instead.');
        return;
      }
      _icSaveNotebookCard();
      return;
    }
    if(_icInputPendingFile){
      var pendingFile=_icInputPendingFile;
      var fpreview=document.getElementById('isx-paste-preview');
      if(fpreview) fpreview.insertAdjacentHTML('beforeend','<div style="font-size:10px;color:#5b9bd5;text-align:center">Uploading…</div>');
      _icInputPendingFile=null;
      _icSaveFileCard(pendingFile);
      return;
    }
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
    _icClearPendingFile();
    var ta=document.getElementById('isx-idea-text');
    if(ta){ ta.value=''; ta.focus(); }
    _icSyncKindLine();
  }

  // ── 1170 — NEW card (Larry's "NEW CARD" spec, Sept 19 2026) ──
  // PROJECT/TOPIC default to wherever this card was opened from (see
  // open()'s projectLabel/topicLabel opts) -- '-' means Parking Lot, same
  // meaning '-' has everywhere else in the app. The O IDEA/TASK/NOTES
  // selector picks the entry's flavor; HEADER/SUBBER is the same
  // structural choice the old Make-a-Header toggle made, just shown as
  // two plain buttons instead of one toggle-with-words. The cast button
  // (head icon) is optional -- see _icMaybeApplyCast for what it does.
  function _icEsc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // Small popup list, anchored under whichever field opened it -- same
  // shape as every other ID Band dropdown (fixed position, closes on an
  // outside click), just local to this file so PROJECT/TOPIC don't have
  // to reach into briefing-board-master-nav.js's own copy of this idea.
  // Cast picker, Sept 19 2026 round 5 -- Larry: this needs to look
  // EXACTLY like the VIEW list at the top of the board (same roster,
  // same dark dropdown skin), not the plain white PROJECT/TOPIC popup
  // _icOpenFieldDropdown builds. Reuses the app's own shared
  // .sc-cdrop-menu/.sc-cdrop-row/.sc-cdrop-addrow/.sc-dotted-add-btn CSS
  // (defined once, globally, in idea-storyboard-screens.js -- the same
  // rules VIEW's own dropdown and every PROJECT/TOPIC/ORG NAME picker on
  // the board already use) rather than duplicating that look here.
  // Roster comes from the same place VIEW's list does
  // (T2TStoryboard.currentProjectRow/loadRoster/allRosterRows -- idea-
  // storyboard-people.js's _tmLoadRoster/_tmAllRosterRows, bridged). The
  // (+) at the bottom adds an existing T2T member to this project by
  // email (T2TStoryboard.addMember -- the same add_storyboard_member
  // call the Team screen's own (+) uses), then refreshes this same open
  // list in place so the new name is pickable right away.
  function _icOpenCastDropdown(anchorEl, onPick){
    var old=document.getElementById('isx-p-cast-menu');
    if(old) old.remove();
    var bridge=window.T2TStoryboard;
    // Sept 22 2026 fix -- Larry, Master BB do-m: "Tried to add you to a
    // new BB card but no options were available. It wanted an email for
    // new person... The new card should always offer EXACTLY the same as
    // the MASTER view cast button." A Briefing Board card has no Idea/Plan
    // PROJECT underneath it (this NEW-card popup's own PROJECT field is
    // for tagging, not a real storyboard row), so the branch below --
    // asking the storyboard bridge for a project's roster, "Pick a
    // PROJECT first" when there isn't one, "+" to add-by-email -- never
    // had anything to show for a BB card and fell straight to that empty/
    // email-prompt state every time. BB mode now reads the exact same
    // board-wide roster the MASTER view's own Cast/VIEW dropdown reads
    // (_bbAllRosterRows, briefing-board-master-nav.js) instead, with no
    // add-by-email row -- membership on that roster is the board's
    // Sharing manager's job, not this popup's.
    // Sept 23 2026 -- Larry: "buttons with single head display a common
    // list of potential PRIMARY assignees... Cast options are project
    // level." Both modes (Idea and BB) now open the one shared list,
    // scoped to the level this new card is going into: TOPIC if one is
    // picked, else PROJECT, else MASTER (_icBoardId -- the same id the
    // save writes as the card's home). The older Idea-only project-roster
    // list below stays only as a fallback if the shared list isn't loaded.
    {
      // Sept 22 2026 (later) -- Larry, Master BB DOING: "Cast selector on
      // new card must look exactly like cast view dropdown on BB. Concept
      // is to include everyone who is currently on some card...and have
      // option to add name." Now opens the one shared CAST PICK list
      // (_bbOpenCastPickMenu, briefing-board-master-nav.js) -- the same
      // list the back-of-card PRIMARY head icon opens, so the two can't
      // drift apart again. VIEW's exact look (checkbox rows, dark board
      // skin), everyone who holds a role on any card, and a (+) that
      // finds any T2T member. Nothing is written until this entry saves
      // (see _icMaybeApplyCast) -- the pick is just armed here.
      if(typeof _bbOpenCastPickMenu==='function'){
        var bbMenu=document.createElement('div');
        bbMenu.id='isx-p-cast-menu';
        document.body.appendChild(bbMenu);
        _bbOpenCastPickMenu(bbMenu, anchorEl, {
          level:_icBoardId||null,
          selectedUid:_icCastPersonId,
          onPick:function(person){ onPick({id:person.user_id, label:person.name, fromAbove:!!person.fromAbove}); },
          onClear:function(){ onPick({id:null, label:''}); },
          onClose:function(){ bbMenu.remove(); }
        });
        setTimeout(function(){
          document.addEventListener('click', function closeBbOnce(){
            var m=document.getElementById('isx-p-cast-menu'); if(m) m.remove();
          }, {once:true});
        }, 0);
        return;
      }
    }
    // Sept 19 2026 fix -- this used to ask the BOARD's ambient "current
    // project" (bridge.currentProjectRow()), which has nothing to do with
    // whatever PROJECT the traveler just picked inside this card's own
    // PROJECT field. Picking a PROJECT here only ever updated _icProjectId/
    // _icProjectLabel (see _icWireTopicPicker above) -- it never
    // touched the board's ambient state -- so the cast picker kept asking
    // the wrong place, over and over, and "Pick a PROJECT first." never
    // cleared no matter how many times a PROJECT was picked. Build the row
    // straight from this card's own selection instead.
    var projRow=_icProjectId ? {id:_icProjectId, text_content:_icProjectLabel} : null;
    var menu=document.createElement('div');
    menu.id='isx-p-cast-menu';
    menu.className='sc-cdrop-menu';
    document.body.appendChild(menu);
    function positionMenu(){
      var r=anchorEl.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    }
    function renderRows(people, loading){
      menu.innerHTML='';
      if(loading){
        var l=document.createElement('div');
        l.className='sc-cdrop-row';
        l.style.cssText='cursor:default;opacity:.6';
        l.textContent='Loading…';
        menu.appendChild(l);
      } else if(!people.length){
        var empty=document.createElement('div');
        empty.className='sc-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent=projRow?'No one on this topic yet.':'Pick a TOPIC first.';
        menu.appendChild(empty);
      } else {
        people.forEach(function(p){
          var row=document.createElement('div');
          row.className='sc-cdrop-row';
          row.textContent=p.name||p.email||'(unnamed)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.remove();
            onPick({id:p.user_id, label:p.name||p.email||'(unnamed)'});
          });
          menu.appendChild(row);
        });
      }
      if(projRow && bridge && typeof bridge.addMember==='function'){
        var addRow=document.createElement('div');
        addRow.className='sc-cdrop-addrow';
        var addBtn=document.createElement('button');
        addBtn.type='button';
        addBtn.className='sc-dotted-add-btn';
        addBtn.title='Add someone to this topic';
        addBtn.textContent='+';
        addBtn.addEventListener('click', async function(ev){
          ev.stopPropagation();
          var email=window.prompt('Email of the T2T member to add to this topic:');
          if(!email || !email.trim()) return;
          var res=await bridge.addMember(projRow, email.trim());
          if(!res.ok){ window.alert(res.msg||'Could not add them.'); return; }
          await bridge.loadRoster(projRow);
          renderRows(bridge.allRosterRows(projRow)||[]);
        });
        addRow.appendChild(addBtn);
        menu.appendChild(addRow);
      }
      positionMenu();
    }
    renderRows([], true);
    positionMenu();
    if(projRow && bridge && bridge.loadRoster && bridge.allRosterRows){
      bridge.loadRoster(projRow).then(function(){
        renderRows(bridge.allRosterRows(projRow)||[]);
      });
    } else {
      renderRows([]);
    }
    setTimeout(function(){
      document.addEventListener('click', function closeOnce(){
        var m=document.getElementById('isx-p-cast-menu'); if(m) m.remove();
        document.removeEventListener('click', closeOnce);
      }, {once:true});
    }, 0);
  }

  function _icOpenFieldDropdown(anchorEl, rows, onPick){
    var old=document.getElementById('isx-p-field-menu');
    if(old) old.remove();
    var menu=document.createElement('div');
    menu.id='isx-p-field-menu';
    menu.style.cssText='position:fixed;z-index:100000;background:#fff;border:1.5px solid #b0a898;border-radius:8px;'
      +'box-shadow:0 6px 18px rgba(0,0,0,.18);max-height:220px;overflow:auto;min-width:140px;padding:4px;'
      +'font-family:"Playfair Display",serif';
    if(!rows.length){
      var e=document.createElement('div');
      e.style.cssText='padding:6px 10px;font-size:11px;color:#93a4b5';
      e.textContent='Nothing here yet.';
      menu.appendChild(e);
    } else {
      rows.forEach(function(r){
        var row=document.createElement('div');
        row.style.cssText='padding:6px 10px;font-size:12px;color:var(--isx-navy);cursor:pointer;border-radius:5px';
        row.textContent=r.label;
        row.addEventListener('mouseenter', function(){ row.style.background='#eef2f6'; });
        row.addEventListener('mouseleave', function(){ row.style.background=''; });
        row.addEventListener('click', function(ev){
          ev.stopPropagation();
          menu.remove();
          onPick(r);
        });
        menu.appendChild(row);
      });
    }
    document.body.appendChild(menu);
    var r=anchorEl.getBoundingClientRect();
    menu.style.left=r.left+'px';
    menu.style.top=(r.bottom+4)+'px';
    menu.style.minWidth=Math.max(140,r.width)+'px';
    var mr=menu.getBoundingClientRect();
    if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    setTimeout(function(){
      document.addEventListener('click', function closeOnce(){
        var m=document.getElementById('isx-p-field-menu'); if(m) m.remove();
        document.removeEventListener('click', closeOnce);
      }, {once:true});
    }, 0);
  }

  // TOPIC picker, Sept 28 2026 -- Larry: the boards' ID Band is TOPIC + Board
  // Type, and this card's band is the same band in miniature, so PROJECT
  // and TOPIC collapse into one TOPIC field that opens the same pyramid
  // popup the boards use (topic-pyramid.js): the straight line of ancestors
  // up to MASTER, the current Topic highlighted, and its children below,
  // each openable in turn. Any level is a valid pick -- "just because you
  // are in a given project... doesn't mean you might not think of an idea
  // for a completely different project" (Sept 19 2026) -- so a pick simply
  // becomes the entry's home (_icBoardId, the same id every save path
  // already writes). MASTER is the apex and means "no Topic yet".
  //
  // TopicPyramid knows nothing about Supabase, so this hands it plain
  // {id,name,priority} nodes: ancestors are found by walking cluster_id up
  // until the hidden account-root row (which reads as MASTER), children are
  // that Topic's own header rows minus the reserved bucket names (same
  // reserved list the Idea Board's pyramid hides). Fetched fresh on each
  // open, so a header added a moment ago always shows up.
  function _icWireTopicPicker(){
    var topicEl=document.getElementById('isx-p-topic');
    if(!topicEl) return;
    var MASTER_ID='__master__';
    var RESERVED={'NEW':1,'New Additions':1,'Parking Lot':1,'COLLABORATOR':1,'STAKEHOLDER':1,'MISC':1,'Purpose':1,'Trash':1,'Archived':1};
    var names={};

    function fetchRow(id){
      return T().sb.from('ideas').select('id,text_content,cluster_id,priority').eq('id',id).limit(1)
        .then(function(res){ return (!res.error && res.data && res.data[0]) || null; });
    }
    async function loadAncestors(row){
      var chain=[], parentId=row.cluster_id, guard=0;
      while(parentId && guard<50){
        guard++;
        var p=await fetchRow(parentId);
        if(!p) break;
        if(window.IDBand && IDBand.isNonProjectName(p.text_content)) break; // the account root -- shown as MASTER below
        chain.unshift({id:p.id, name:p.text_content||'(untitled)', priority:p.priority||''});
        parentId=p.cluster_id;
      }
      chain.unshift({id:MASTER_ID, name:'MASTER', priority:''});
      return chain;
    }
    async function loadChildren(id){
      var kids;
      if(id===MASTER_ID){
        var roots=[];
        try{ roots=(typeof _sboardLoadMyRoots==='function') ? (await _sboardLoadMyRoots())||[] : []; }
        catch(e){ console.warn('NEW card: could not load top-level topics', e); }
        kids=roots.filter(function(r){ return !(window.IDBand && IDBand.isNonProjectName(r.text_content)); })
          .map(function(r){ return {id:r.id, name:r.text_content||'(untitled)', priority:r.priority||''}; });
      } else {
        var res=await T().sb.from('ideas').select('id,text_content,priority,storyboard_kind')
          .eq('content_type','header').eq('cluster_id',id).order('sort_order',{ascending:true}).order('text_content');
        if(res.error) throw res.error;
        kids=(res.data||[])
          .filter(function(r){ return !RESERVED[r.text_content] && (r.storyboard_kind||'IDEA')==='IDEA'; })
          .map(function(r){ return {id:r.id, name:r.text_content||'(untitled)', priority:r.priority||''}; });
      }
      kids.forEach(function(k){ names[k.id]=k.name; });
      return kids;
    }
    function pick(id){
      var isMaster=(id===MASTER_ID);
      var label=isMaster ? 'MASTER' : (names[id]||'(untitled)');
      _icBoardId=isMaster?null:id; _icProjectId=isMaster?null:id; _icHeaderId=null;
      _icTopicLabel=label; _icProjectLabel=label;
      var tt=document.getElementById('isx-p-topic-txt'); if(tt) tt.textContent=label;
    }

    topicEl.addEventListener('click', async function(ev){
      ev.stopPropagation();
      if(!window.TopicPyramid) return;
      var old=document.getElementById('isx-p-field-menu'); if(old) old.remove();
      var menu=document.createElement('div');
      menu.id='isx-p-field-menu';
      menu.style.cssText='position:fixed;z-index:100000;background:#fff;color:#1a3a5c;border:1.5px solid #b0a898;border-radius:8px;'
        +'box-shadow:0 6px 18px rgba(0,0,0,.18);max-height:min(360px,60vh);overflow:auto;min-width:220px;padding:6px;'
        +'font-family:"Playfair Display",serif';
      menu.textContent='Loading…';
      document.body.appendChild(menu);
      var r=topicEl.getBoundingClientRect();
      menu.style.left=r.left+'px'; menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(220,r.width)+'px';

      var curId=_icBoardId||_icProjectId||null, current, ancestors=[];
      try{
        if(curId){
          var row=await fetchRow(curId);
          current={id:curId, name:(row&&row.text_content)||(_icTopicLabel!=='-'?_icTopicLabel:_icProjectLabel)||'(untitled)', priority:(row&&row.priority)||''};
          ancestors=row ? await loadAncestors(row) : [{id:MASTER_ID, name:'MASTER', priority:''}];
        } else {
          current={id:MASTER_ID, name:'MASTER', priority:''};
        }
      }catch(e){
        console.warn('NEW card: could not load topic pyramid', e);
        menu.textContent='Couldn’t load — try again.';
        return;
      }
      names[current.id]=current.name;
      ancestors.forEach(function(a){ names[a.id]=a.name; });
      var currentRow=window.TopicPyramid.render(menu, {
        ancestors:ancestors,
        current:current,
        getChildren:loadChildren,
        onNavigate:function(id){ menu.remove(); pick(id); }
      });
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      if(currentRow && currentRow.scrollIntoView) currentRow.scrollIntoView({block:'center'});
      // Clicks inside the pyramid (its expand arrows) must not close it --
      // only a click outside does.
      setTimeout(function(){
        document.addEventListener('click', function closeOutside(e){
          var m=document.getElementById('isx-p-field-menu');
          if(m && m.contains(e.target)) return;
          if(m) m.remove();
          document.removeEventListener('click', closeOutside);
        });
      }, 0);
    });
  }

  function _icRenderIdeaPanel(){
    _icIdeaMode='idea';
    // NEW card should default to whatever card type matches the board
    // it was opened from, not always IDEA -- Sept 22 2026, Larry: on the
    // Briefing Board this should default to TASK. 'bb' mode means this
    // card was opened from the Briefing Board (openAddCard), so TASK is
    // the sensible starting selection there; every other opener (Idea
    // Storyboard, etc.) keeps the previous IDEA default.
    _icBoardKind=(_icMode==='bb')?'BRIEFING BOARD':'IDEA';
    _icEntryType=(_icMode==='bb')?'task':'idea';
    _icCastPersonId=null; _icCastPersonName=''; _icCastFromAbove=false;
    _icInputPendingImageFile=null;
    _icInputPendingLink=null;
    _icInputPendingFile=null;
    var _icBoardKindNow=_IC_BOARD_KINDS.filter(function(k){ return k.value===_icBoardKind; })[0];
    _icOpenPopup('<div class="isx-pcard isx-pcard-uni'+(_icMode==='bb'?' isx-pcard-bb':'')+'" data-pagenum="1170">'
      // Sept 28 2026 (Larry, round 2): the card is the Idea/Briefing card
      // back's shape (340px, 8px corners, colored top stripe) and its top is
      // the boards' ID Band in miniature: NEW is a plain title (not a
      // field) on the left -- it flips to the assigned person's first name
      // once the head button picks someone, see paintCast -- and the same
      // head / utility / X buttons ride the upper right as on a board.
      // Under it, the two ID Band fields: TOPIC (the boards' shared topic
      // pyramid, MASTER at the apex) and BOARD TYPE. Board Type replaces the
      // old IDEA/TASK/NOTES row: the board already implies the kind. In
      // bb mode it is fixed to BRIEFING, since everything opened from
      // the Briefing Board saves to it.
      +'<div class="isx-p-head" id="isx-p-head">'
        +'<span class="isx-p-newtitle" id="isx-p-newchip-txt">NEW</span>'
        +'<div class="isx-p-topic isx-p-idfield isx-p-head-topic" id="isx-p-topic"><span id="isx-p-topic-txt">'+_icEsc(_icTopicLabel!=='-' ? _icTopicLabel : _icProjectLabel)+'</span><span class="isx-p-caret">▾</span></div>'
        +'<div class="isx-p-idfield isx-p-head-board'+(_icMode==='bb'?' isx-p-idfield-static':'')+'" id="isx-p-board"><span id="isx-p-board-txt">'+_icBoardKindNow.label+'</span>'+(_icMode==='bb'?'':'<span class="isx-p-caret">▾</span>')+'</div>'
        +'<div class="isx-p-head-btns">'
          +'<button class="isx-p-hbtn" type="button" id="isx-p-cast-btn" title="Pick who’s PRIMARY" aria-label="Pick who’s PRIMARY">👤</button>'
          +'<button class="isx-p-hbtn" type="button" id="isx-p-util-btn" title="Utility" aria-label="Utility">⚙️</button>'
          +'<button class="isx-p-hbtn" type="button" id="isx-p-close" title="Close" aria-label="Close">✕</button>'
        +'</div>'
      +'</div>'
      +'<div class="isx-p-band-rule"></div>'
      +'<div class="isx-p-subject-row">'
        +'<input type="text" id="isx-p-subject" autocomplete="off" autocorrect="off" spellcheck="true" placeholder="Subject (optional)">'
      +'</div>'
      +'<div id="isx-paste-preview" style="display:none"></div>'
      // A trailing ? or : makes the entry a header (see _icIsAutoHeaderText)
      // -- no HEADER/SUBBER buttons any more (Sept 28 2026, Larry: "header
      // and subber distinguished only by ? and :"), so the placeholder
      // carries the habit. Briefing Board has no headers, so no hint there.
      +'<textarea id="isx-idea-text" placeholder="Content"></textarea>'
      +'<div id="isx-doc-banner" style="display:none;font-size:11px;color:#1a3a5c;background:#eaf3fb;border:1px solid #cfe4f2;border-radius:8px;padding:6px 8px;margin:-4px 0 6px;text-align:center">'
        +'That looks like a whole document. '
        +'<button type="button" id="isx-doc-decompose" style="border:none;background:none;color:#1a3a5c;font-weight:700;text-decoration:underline;cursor:pointer;padding:0">Split it into cards instead?</button>'
      +'</div>'
      // ATTACH A FILE with the kinds it takes written directly beneath it
      // (Larry, Sept 28 2026: "move the attachment options up directly under
      // Attach... delete ANYTHING"). Shown only while the card is empty.
      +(_icMode==='bb' ? '' :
        '<div class="isx-p-attach-row"><button class="isx-p-attach-btn" type="button" id="isx-p-attach-btn">📎 ATTACH A FILE</button>'
        +'<input type="file" id="isx-p-file-input" style="display:none"></div>')
      +'<div class="isx-p-kindline" id="isx-p-kindline">text · image · document · sheet · slide · audio · video · link</div>'
      +'<div class="isx-save-row">'
        +'<button class="isx-save" id="isx-p-save">SAVE</button>'
        +'<button class="isx-cancel" id="isx-p-cancel" type="button">CANCEL</button>'
      +'</div>'
      +'</div>');
    document.getElementById('isx-p-close').onclick=_icClosePopup;
    document.getElementById('isx-p-save').onclick=_icCommitIdeaPanel;
    document.getElementById('isx-p-cancel').onclick=_icCancelIdeaEntry;

    // BOARD TYPE -- picks where this entry goes and, with it, what kind of
    // card it is (see _IC_BOARD_KINDS). Boards with nothing to save into
    // yet are listed but explain themselves instead of saving elsewhere.
    (function(){
      var boardEl=document.getElementById('isx-p-board');
      if(!boardEl || _icMode==='bb') return;
      boardEl.addEventListener('click', function(ev){
        ev.stopPropagation();
        var rows=_IC_BOARD_KINDS.map(function(k){ return {id:k.value, label:k.label+(k.soon?' · soon':''), kind:k}; });
        _icOpenFieldDropdown(boardEl, rows, function(picked){
          if(picked.kind.soon){ _icShowFormatBoundaryMessage(picked.kind.soon); return; }
          _icSetBoardKind(picked.kind.value);
        });
      });
    })();

    // ATTACH A FILE -- the picker has no accept filter on purpose; the
    // block list and size ceiling live in _icAcceptFile, so drop, paste and
    // this button all get exactly the same rules.
    (function(){
      var btn=document.getElementById('isx-p-attach-btn'), inp=document.getElementById('isx-p-file-input');
      if(!btn || !inp) return;
      btn.onclick=function(){ inp.click(); };
      inp.addEventListener('change', function(){
        if(inp.files && inp.files.length) _icAcceptFile(inp.files[0], inp.files.length-1);
        inp.value='';
      });
    })();

    // Cast, Sept 19 2026 round 5 -- one button: opens the same roster
    // the VIEW button lists, styled exactly like VIEW's own dropdown
    // (see _icOpenCastDropdown), with a (+) at the bottom to add
    // someone not on the project yet. Picking a name just arms
    // _icCastPersonId -- doesn't write anything until this entry has a
    // saved row to attach a card_roles row to (see _icMaybeApplyCast).
    // Sept 28 2026: the ID Band's NEW chip flips to that person's first
    // name once one is picked (the roster already lists first names), so
    // the card visibly says who it's for before it's saved.
    (function(){
      var castBtn=document.getElementById('isx-p-cast-btn');
      function paintCast(){
        if(!castBtn) return;
        castBtn.classList.toggle('on', !!_icCastPersonId);
        castBtn.title=_icCastPersonId ? ('PRIMARY: '+_icCastPersonName+' — click to change') : 'Pick who’s PRIMARY';
        var chip=document.getElementById('isx-p-newchip-txt');
        if(chip) chip.textContent=_icCastPersonId ? String(_icCastPersonName||'NEW').trim().split(/\s+/)[0] : 'NEW';
      }
      if(castBtn) castBtn.onclick=function(ev){
        ev.stopPropagation();
        _icOpenCastDropdown(castBtn, function(picked){
          _icCastPersonId=picked.id; _icCastPersonName=picked.label; _icCastFromAbove=!!picked.fromAbove;
          paintCast();
        });
      };
      paintCast();
    })();

    // TOPIC picker -- one field, the boards' shared topic pyramid (see
    // _icWireTopicPicker). It replaced the separate PROJECT and TOPIC
    // pickers of Sept 19 2026, which cascaded one into the other.
    _icWireTopicPicker();

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
                // Through the shared door so HEIC and the size ceiling get
                // the same rules as a dropped or attached image.
                _icAcceptFile(file, 0);
              }
              return;
            }
            // Any other pasted file (copied from Finder/Explorer, etc.) --
            // Sept 28 2026, accept-anything.
            if(items[i].kind==='file'){
              var pastedFile=items[i].getAsFile();
              if(pastedFile){
                e.preventDefault();
                _icAcceptFile(pastedFile, 0);
              }
              return;
            }
          }
        }
        var text=e.clipboardData && e.clipboardData.getData('text/plain');
        if(text && _icIsBareUrl(text)){
          e.preventDefault();
          _icShowPendingLink(text.trim());
          return;
        }
        // Sept 27 2026, Larry: "why can't we paste a document into the
        // new card content area?" -- until now, plain text just landed
        // here as one card's literal content, same as a short idea.
        // Doesn't preventDefault -- the paste still lands normally, this
        // only offers the smarter route alongside it, so nothing breaks
        // for someone who really did just paste a short idea that
        // happens to cross the threshold.
        var banner=document.getElementById('isx-doc-banner');
        if(banner) banner.style.display = (text && _icLooksLikeDocument(text)) ? 'block' : 'none';
      });
      ta.addEventListener('input', function(){
        _icSyncKindLine();
        var banner=document.getElementById('isx-doc-banner');
        if(banner && banner.style.display!=='none' && !_icLooksLikeDocument(ta.value)) banner.style.display='none';
      });
    }
    // Split-a-document, shared by the banner link (shown when a paste looks
    // like a whole document) and the UTILITY button's menu.
    function openDecompose(){
      var ta2=document.getElementById('isx-idea-text');
      var text=ta2 ? ta2.value : '';
      if(!text.trim() || !window.DocDecomp) return false;
      var targetHeaderId=_icHeaderId;
      _icClosePopup();
      window.DocDecomp.open({
        parentHeaderId: targetHeaderId,
        initialText: text,
        // false, not true -- renderSeaBoard's arg is fromCache; these
        // rows were just written straight to Supabase, bypassing the
        // local board cache, so this needs a real refetch (same as the
        // gear-menu entry point in idea-storyboard-header.js).
        onDone: function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(false); }
      });
      return true;
    }
    var decomposeBtn=document.getElementById('isx-doc-decompose');
    if(decomposeBtn) decomposeBtn.onclick=openDecompose;

    // UTILITY button (the gear in the card's ID Band, same place as on a
    // board): the card-level tools. Split-a-document only exists on the
    // idea boards (the Briefing Board has no headers to split into);
    // Clear card is everywhere.
    (function(){
      var utilBtn=document.getElementById('isx-p-util-btn');
      if(!utilBtn) return;
      utilBtn.addEventListener('click', function(ev){
        ev.stopPropagation();
        var rows=[];
        if(_icMode!=='bb') rows.push({id:'split', label:'Split a document into cards'});
        rows.push({id:'clear', label:'Clear this card'});
        _icOpenFieldDropdown(utilBtn, rows, function(picked){
          var taU=document.getElementById('isx-idea-text');
          if(picked.id==='split'){
            if(!openDecompose() && taU){
              taU.placeholder='Paste a document here first, then choose Utility again.';
              taU.focus();
            }
          } else if(picked.id==='clear'){
            if(taU){ taU.value=''; taU.focus(); }
            var subjU=document.getElementById('isx-p-subject'); if(subjU) subjU.value='';
            _icClearPendingImage(); _icClearPendingFile(); _icClearPendingLink();
            var bannerU=document.getElementById('isx-doc-banner'); if(bannerU) bannerU.style.display='none';
            _icSyncKindLine();
          }
        });
      });
    })();

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
    // eyebrow text to show; PROJECT omitted or null/'' falls back to
    // 'MASTER' (Sept 20 2026 -- top project level is always MASTER, never
    // '-'), TOPIC omitted or null/'' falls back to '-' (Parking Lot).
    // opts.projectId (round 3) — the real row id behind projectLabel, so
    // the PROJECT/TOPIC fields can be repicked from inside the card; a
    // caller that omits it just means those fields render read-only.
    // opts.mode (round 3) — 'idea' (default) or 'bb'; see _icMode's own
    // comment above for what changes in 'bb' mode.
    open: function(opts){
      opts=opts||{};
      _icHeaderId=opts.headerId||null;
      _icHeaderLabel=opts.headerLabel||'New';
      _icBoardId=opts.boardId||null;
      _icProjectLabel=window.IDBand ? IDBand.projectLabel(opts.projectLabel) : (opts.projectLabel||'MASTER');
      _icTopicLabel=opts.topicLabel ? (window.IDBand ? IDBand.projectLabel(opts.topicLabel) : opts.topicLabel) : '-';
      _icProjectId=opts.projectId||null;
      _icMode=opts.mode==='bb'?'bb':'idea';
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
