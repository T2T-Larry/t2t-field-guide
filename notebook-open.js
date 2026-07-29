/* ============================================================
   T2T FIELD GUIDE — NOTEBOOK OVERLAY (the floating #sz-notebook
   icon's double-click target)

   Added July 29, 2026, replacing the old "double-click opens the
   full-screen Journal (s-journal channel change)" behaviour.

   Reworked same day, same session, once Larry clarified: this must
   NOT behave like a dimmed modal blocking the TV (which is how the
   Idea-input card's shared #isx-popup-layer works). The Notebook
   gets its OWN layer, #nb-layer -- no dim backdrop, no click-outside
   -to-close, pointer-events:none on the layer itself so clicks pass
   straight through to the TV everywhere except where the card visibly
   sits. It floats ON TOP of whatever's showing (0000, a Phase page, a
   TV-frame output) *and* stays fully moveable (see _nbWireDrag below
   -- drag from the "📓 Notebook" title bar) so the traveler can drag
   it clear of whatever they need to see, or leave it overlapping the
   TV and keep writing right through that overlap. nav() is still
   never called -- the screen behind it never changes.

   This is a COMBO viewer, not a fresh blank page: the left page
   shows every past entry (click one to open it on the right), the
   right page is the currently open page -- today by default, but
   any past page opened from the left list becomes "the currently
   open page" and is just as editable. There's no read-only state
   anywhere in this file.

   Storage: this notebook IS the Journal. Same Supabase table
   (journal_notes), same columns backpack.js's own save/load already
   uses (user_id, note_text, topic, page_context, entry_date,
   created_at) -- see backpack.js's loadEntriesFromSupabase /
   saveEntryToSupabase (~line 663). Those functions live inside
   backpack.js's own closure and aren't exposed on window.T2T, so
   this file talks to the same table directly with the same column
   shape rather than reaching in for them -- reading/writing the
   same rows either way, keyed by entry_date (the same "Jul 3, 2026"
   -style string backpack.js already stamps every row with).

   journal_notes has no separate image/link column the way the
   ideas table does (image_url) -- a Journal note has only ever been
   a block of text. Pasting an image here (see the paste handler
   below, copied faithfully from idea-capture.js's own) uploads to
   the same 'sea-of-ideas' storage bucket idea-capture.js already
   uses and stores the resulting URL as the LAST LINE of note_text
   (an optional caption on the line(s) before it); pasting a bare
   link stores "title\nurl" the same way. On reopen, _nbExtractImageUrl
   / _nbExtractBareLinkLine notice that trailing URL line and render
   it back as an image/link chip instead of plain handwriting. The
   old full-screen Journal view (s-journal-view/entry) doesn't know
   about this convention and will just show the raw text/URL for
   such a row -- harmless, and out of scope to change (Larry: the
   s-journal* screens stay exactly as they are).

   Exposes: window.NotebookOpen.open({onClosed}), isOpen(), close().
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  // ── State for whatever's currently open ──
  var _nbOnClosed=null;
  var _nbEntries=[];        // every journal_notes row for this user, ascending by created_at
  var _nbActiveRow=null;    // the row currently open on the right page, or null = a fresh/unsaved page
  var _nbLoadedText='';     // snapshot of the right page's text as last loaded/saved -- dirty-check baseline
  var _nbPendingImageFile=null;
  var _nbPendingLink=null;  // {url, title, thumb}
  var _nbStatusTimer=null;

  function _nbEsc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _nbTodayKey(){
    // Matches backpack.js's own entry_date format exactly (saveEntryToSupabase) --
    // this is the "keyed by date" join between the two UIs.
    return new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }
  function _nbTodayLongStr(){
    // Larry wants the fresh/unwritten page to read like "July 29, 2026" --
    // a nicer display-only format than the short form used as the actual
    // storage key above.
    return new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  }

  function _nbIsBareUrl(text){
    return /^https?:\/\/\S+$/i.test((text||'').trim());
  }
  function _nbResolveOEmbed(url){
    return (window.T2TSea && window.T2TSea.resolveOEmbed) ? window.T2TSea.resolveOEmbed(url) : Promise.resolve(null);
  }

  // A saved row's note_text may end in a bare image/link URL (see file
  // header) -- these two helpers notice that on reopen and split it back
  // out from any caption text before it, so the page renders as a
  // photo/link chip instead of showing a raw URL in the handwriting font.
  function _nbExtractImageUrl(text){
    if(!text) return null;
    var lines=String(text).split('\n');
    var last=lines[lines.length-1].trim();
    var looksLikeUpload = /^https?:\/\/\S+$/i.test(last) && last.indexOf('/sea-of-ideas/')!==-1;
    if(/^https?:\/\/\S+\.(jpe?g|png|gif|webp)(\?\S*)?$/i.test(last) || looksLikeUpload){
      lines.pop();
      return {url:last, rest:lines.join('\n').trim()};
    }
    return null;
  }
  function _nbExtractBareLinkLine(text){
    if(!text) return null;
    var lines=String(text).split('\n');
    var last=lines[lines.length-1].trim();
    if(_nbIsBareUrl(last)){
      lines.pop();
      return {url:last, rest:lines.join('\n').trim()};
    }
    return null;
  }

  // ── Same compression algorithm as idea-capture.js's _icCompressImageFile
  //    (private to that file's closure, so replicated here rather than
  //    invented differently -- see file header). ──
  function _nbCompressImageFile(file, maxDim, quality){
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
            ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,cw,ch);
            ctx.drawImage(img,0,0,cw,ch);
            canvas.toBlob(function(blob){
              URL.revokeObjectURL(url);
              if(!blob){ resolve(file); return; }
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

  function _nbShowStatus(msg, isError){
    var el=document.getElementById('nb-status');
    if(!el) return;
    el.textContent=msg;
    el.style.color = isError ? '#A32D2D' : '#2f7a4f';
    if(_nbStatusTimer) clearTimeout(_nbStatusTimer);
    _nbStatusTimer=setTimeout(function(){ if(el) el.textContent=''; }, 2200);
  }

  // ── Pending paste preview (image or link), before it's actually saved --
  //    same "show a preview, nothing commits until SAVE" shape as
  //    idea-capture.js's own _icShowPendingImage/_icShowPendingLink. ──
  function _nbShowPendingImage(file){
    _nbPendingImageFile=file; _nbPendingLink=null;
    var preview=document.getElementById('nb-paste-preview');
    if(preview){
      var url=URL.createObjectURL(file);
      preview.innerHTML='<img src="'+url+'" style="max-width:100%;max-height:140px;border-radius:8px;'
        +'display:block;margin:0 auto 8px;object-fit:contain">';
      preview.style.display='block';
    }
  }

  function _nbShowPendingLink(url){
    _nbPendingLink={url:url, title:null, thumb:null}; _nbPendingImageFile=null;
    var preview=document.getElementById('nb-paste-preview');
    if(preview){
      preview.innerHTML='<div class="nb-loading">Looking up this link…</div>';
      preview.style.display='block';
    }
    _nbResolveOEmbed(url).then(function(meta){
      if(!_nbPendingLink || _nbPendingLink.url!==url) return; // cancelled/replaced meanwhile
      _nbPendingLink.title=(meta&&meta.title)||url;
      _nbPendingLink.thumb=(meta&&meta.thumbnail_url)||null;
      if(!preview) return;
      preview.innerHTML=(_nbPendingLink.thumb
          ? '<img src="'+_nbPendingLink.thumb+'" style="max-width:100%;max-height:120px;border-radius:8px;display:block;margin:0 auto 6px;object-fit:contain">'
          : '<div style="font-size:26px;text-align:center;margin-bottom:4px">🔗</div>')
        +'<div style="font-size:12px;color:var(--brand-brown-dark);text-align:center;font-weight:600">'+_nbEsc(_nbPendingLink.title)+'</div>'
        +'<div style="font-size:9.5px;color:#7A5C3A;text-align:center;word-break:break-word">'+_nbEsc(url)+'</div>';
    });
  }

  function _nbClearPending(){
    _nbPendingImageFile=null; _nbPendingLink=null;
  }

  // ── SAVE — mirrors idea-capture.js's own priority (pending image, then
  //    pending link, then plain typed text); journal_notes only has one
  //    text column, so an image/link save folds any typed caption text
  //    into note_text alongside the URL rather than a separate column. ──
  async function _nbSaveImage(file, caption){
    var preview=document.getElementById('nb-paste-preview');
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) throw new Error('Not signed in.');
      if(preview) preview.insertAdjacentHTML('beforeend','<div class="nb-loading">Compressing…</div>');
      var toUpload=await _nbCompressImageFile(file);
      if(preview) preview.insertAdjacentHTML('beforeend','<div class="nb-loading">Uploading…</div>');
      var fname=toUpload.name||file.name||('pasted-image-'+Date.now()+'.jpg');
      var path=user.id+'/'+Date.now()+'-'+fname.replace(/[^a-zA-Z0-9._-]/g,'_');
      var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
      if(up.error) throw up.error;
      var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
      var url=pub.data && pub.data.publicUrl;
      if(!url) throw new Error('No public URL returned.');
      var combined = caption ? (caption+'\n'+url) : url;
      _nbPendingImageFile=null;
      await _nbCommitText(combined);
    }catch(e){
      console.error('_nbSaveImage error:', e);
      _nbShowStatus('Upload failed — '+((e&&e.message)||'try again'), true);
    }
  }

  async function _nbCommitText(text){
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ _nbShowStatus('Not signed in.', true); return; }
      if(_nbActiveRow && _nbActiveRow.id){
        var res=await _sb.from('journal_notes').update({note_text:text}).eq('id',_nbActiveRow.id).select().single();
        if(res.error) throw res.error;
        _nbActiveRow=res.data;
        for(var i=0;i<_nbEntries.length;i++){ if(_nbEntries[i].id===_nbActiveRow.id){ _nbEntries[i]=_nbActiveRow; break; } }
      } else {
        var now=new Date();
        var dateStr=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var ins=await _sb.from('journal_notes').insert({
          user_id:user.id,
          note_text:text,
          topic:null,
          page_context:'Notebook',
          entry_date:dateStr,
          created_at:now.toISOString()
        }).select().single();
        if(ins.error) throw ins.error;
        _nbActiveRow=ins.data;
        _nbEntries.push(_nbActiveRow);
      }
      _nbPendingImageFile=null; _nbPendingLink=null;
      _nbRenderHistoryList();
      _nbRenderActivePage();
      _nbShowStatus('Saved', false);
    }catch(e){
      console.error('_nbCommitText error:', e);
      _nbShowStatus('Save failed — '+((e&&e.message)||'unknown error'), true);
    }
  }

  async function _nbSaveActivePage(){
    var ta=document.getElementById('nb-text');
    var text=(ta?ta.value:'').trim();
    if(_nbPendingImageFile){ return _nbSaveImage(_nbPendingImageFile, text); }
    if(_nbPendingLink){
      var link=_nbPendingLink;
      var combined=(link.title && link.title!==link.url) ? (link.title+'\n'+link.url) : link.url;
      return _nbCommitText(combined);
    }
    if(!text) return; // nothing to save, matches idea-capture's own "no text, no image, no-op" rule
    return _nbCommitText(text);
  }

  function _nbIsDirty(){
    var ta=document.getElementById('nb-text');
    var curText=(ta?ta.value:'').trim();
    return (curText!==(_nbLoadedText||'').trim()) || !!_nbPendingImageFile || !!_nbPendingLink;
  }

  // ── GEM -- Larry, July 29: a highlighted line in an entry can feel
  //    significant enough to pull out on its own, same idea as the
  //    Gems board's curated/traveler entries (gems.js). Doesn't touch
  //    that file's own private helpers -- just writes to the same
  //    'gems' table with the same column shape, tagged
  //    source_type:'journal' (new value, alongside gems.js's own
  //    'curated'/'traveler') so a future pass can filter "gems that
  //    came out of the Journal" specifically, same as Larry described
  //    wanting to do. source_page carries the entry's own date string,
  //    so a future filter can trace a Gem back to which page it came
  //    from. For now a Gem is just this: something you marked as
  //    significant while writing -- no extraction/analysis happens
  //    here, that's future work. ──
  var _nbGemShapes=['circle','square','triangle','pentagon','hexagon'];
  var _nbGemColors=['#E9D8FD','#FDE8D8','#D8F3E9','#FDE0EC','#DCE8FD','#F5E8D0'];

  async function _nbSaveSelectionAsGem(){
    var ta=document.getElementById('nb-text');
    if(!ta) return;
    var start=ta.selectionStart, end=ta.selectionEnd;
    var picked=(start!=null && end!=null) ? ta.value.substring(start,end).trim() : '';
    if(!picked){
      _nbShowStatus('Highlight a line first, then tap 💎', true);
      return;
    }
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){ _nbShowStatus('Not signed in.', true); return; }
      var dateHdr=document.getElementById('nb-active-date');
      var dateLabel=dateHdr?dateHdr.textContent:_nbTodayLongStr();
      var entryDateKey=(_nbActiveRow && _nbActiveRow.entry_date) ? _nbActiveRow.entry_date : _nbTodayKey();
      await _sb.from('gems').insert({
        user_id:user.id,
        gem_text:picked,
        attribution:'From Notebook · '+dateLabel,
        source_type:'journal',
        source_page:entryDateKey,
        shape:_nbGemShapes[Math.floor(Math.random()*_nbGemShapes.length)],
        color:_nbGemColors[Math.floor(Math.random()*_nbGemColors.length)],
        hearted:false,
        trashed:false
      });

      // Mark the entry itself with a leading 💎 right where it was chosen --
      // Larry, July 29: the marker IN the text is the confirmation now, no
      // separate "saved as a gem" message needed (that's hidden for now).
      // In-memory edit only -- it rides the same dirty-check/save-on-close
      // path every other Notebook edit already uses, not a forced commit.
      var after=ta.value.slice(start);
      if(!/^💎/.test(after)){
        var marker='💎 ';
        ta.value = ta.value.slice(0,start) + marker + after;
        // marker.length, not a hardcoded count -- 💎 is a surrogate pair
        // (2 UTF-16 code units) + the space, so the real shift is 3, and
        // textarea selectionStart/End are measured in code units, same
        // units String.length already uses.
        ta.selectionStart = start + marker.length;
        ta.selectionEnd = end + marker.length;
      }
    }catch(e){
      console.error('_nbSaveSelectionAsGem error:', e);
      _nbShowStatus('Could not save that Gem — try again.', true);
    }
  }

  // ── Flipping to a different page (past entry or back to today) saves
  //    whatever's dirty on the CURRENT page first -- a real notebook
  //    doesn't let you flip past a page you were mid-sentence on without
  //    it sticking. ──
  function _nbGoToEntry(row){
    var doSwitch=function(){
      _nbActiveRow=row||null;
      _nbClearPending();
      _nbRenderActivePage();
    };
    if(_nbIsDirty()){
      _nbSaveActivePage().then(doSwitch).catch(doSwitch);
    } else {
      doSwitch();
    }
  }

  function _nbGoToToday(){
    var key=_nbTodayKey(), row=null;
    for(var i=_nbEntries.length-1;i>=0;i--){ if(_nbEntries[i].entry_date===key){ row=_nbEntries[i]; break; } }
    _nbGoToEntry(row);
  }

  function _nbHighlightHistorySelection(row){
    var items=document.querySelectorAll('#nb-history-list .nb-hist-item');
    items.forEach(function(el){
      el.classList.toggle('active', !!(row && String(row.id)===el.getAttribute('data-id')));
    });
  }

  function _nbRenderHistoryList(){
    var list=document.getElementById('nb-history-list');
    if(!list) return;
    if(!_nbEntries.length){
      list.innerHTML='<div class="nb-empty">No entries yet — today’s page is the first.</div>';
      return;
    }
    var sorted=_nbEntries.slice().reverse(); // most recent first
    list.innerHTML='';
    sorted.forEach(function(row){
      var div=document.createElement('div');
      div.className='nb-hist-item';
      div.setAttribute('data-id', String(row.id));
      var raw=row.note_text||'';
      var img=_nbExtractImageUrl(raw);
      var link=_nbExtractBareLinkLine(raw);
      var label;
      if(img) label='🖼 Photo'+(img.rest?(': '+img.rest):'');
      else if(link) label='🔗 Link'+(link.rest?(': '+link.rest):'');
      else label=raw.replace(/\n/g,' ').trim();
      if(label.length>64) label=label.substring(0,64)+'…';
      div.innerHTML='<div class="nb-hist-date">'+_nbEsc(row.entry_date||'')+'</div>'
        +'<div class="nb-hist-preview">'+_nbEsc(label||'(blank)')+'</div>';
      div.addEventListener('click', function(){ _nbGoToEntry(row); });
      list.appendChild(div);
    });
    _nbHighlightHistorySelection(_nbActiveRow);
  }

  function _nbRenderActivePage(){
    var row=_nbActiveRow;
    var todayKey=_nbTodayKey();
    var isToday = row ? (row.entry_date===todayKey) : true;

    var dateHdr=document.getElementById('nb-active-date');
    if(dateHdr) dateHdr.textContent = row ? row.entry_date : _nbTodayLongStr();

    var todayBtn=document.getElementById('nb-today-btn');
    if(todayBtn) todayBtn.style.display = isToday ? 'none' : '';

    var preview=document.getElementById('nb-paste-preview');
    var ta=document.getElementById('nb-text');
    if(preview){ preview.innerHTML=''; preview.style.display='none'; }

    var raw = row ? (row.note_text||'') : '';
    var text = raw;
    var img=_nbExtractImageUrl(raw);
    if(img && preview){
      preview.innerHTML='<img src="'+img.url+'" style="max-width:100%;max-height:150px;border-radius:8px;'
        +'display:block;margin:0 auto 8px;object-fit:contain">';
      preview.style.display='block';
      text=img.rest;
    } else {
      var link=_nbExtractBareLinkLine(raw);
      if(link && preview){
        preview.innerHTML='<div class="nb-link-chip">🔗 <a href="'+_nbEsc(link.url)+'" target="_blank" rel="noopener">'+_nbEsc(link.url)+'</a></div>';
        preview.style.display='block';
        text=link.rest;
      }
    }

    if(ta) ta.value=text;
    _nbLoadedText=text;
    _nbHighlightHistorySelection(row);
  }

  function _nbWirePaste(ta){
    if(!ta) return;
    // Same detection/priority as idea-capture.js's own paste handler on
    // #isx-idea-text: a pasted image wins outright; otherwise a single
    // bare URL (nothing else on the clipboard text) becomes a link
    // preview; anything else just types normally. Nothing auto-commits --
    // SAVE/close is still what actually writes it.
    ta.addEventListener('paste', function(e){
      var items=e.clipboardData && e.clipboardData.items;
      if(items){
        for(var i=0;i<items.length;i++){
          if(items[i].type && items[i].type.indexOf('image/')===0){
            var file=items[i].getAsFile();
            if(file){
              e.preventDefault();
              _nbShowPendingImage(file);
            }
            return;
          }
        }
      }
      var text=e.clipboardData && e.clipboardData.getData('text/plain');
      if(text && _nbIsBareUrl(text)){
        e.preventDefault();
        _nbShowPendingLink(text.trim());
      }
    });
  }

  // ── Close: save-on-close is a deliberate addition beyond idea-capture's
  //    own pattern (which never auto-saves) -- a notebook page you were
  //    mid-sentence on when you hit X shouldn't just evaporate. Explicit
  //    SAVE still exists and still works exactly like idea-capture's own;
  //    this is a safety net on TOP of it, not a replacement for it. ──
  function _nbCloseAndSave(){
    var finish=function(){
      var cb=_nbOnClosed; _nbOnClosed=null;
      _nbTeardown();
      var layer=document.getElementById('nb-layer');
      if(layer){ layer.classList.remove('active'); layer.innerHTML=''; }
      if(cb) cb();
    };
    if(_nbIsDirty()){
      _nbSaveActivePage().then(finish).catch(finish);
    } else {
      finish();
    }
  }

  function _nbTeardown(){
    _nbEntries=[]; _nbActiveRow=null; _nbPendingImageFile=null; _nbPendingLink=null; _nbLoadedText='';
  }

  function _nbRenderShell(){
    var layer=document.getElementById('nb-layer');
    if(!layer) return;
    layer.innerHTML =
      '<div class="nb-pcard" data-notebook-card="1">'
        +'<button class="nb-close" id="nb-close" type="button" title="Close">✕</button>'
        +'<div class="nb-cover-title">📓 Notebook</div>'
        +'<div class="nb-spread">'
          +'<div class="nb-page nb-page-left">'
            +'<div class="nb-page-hdr">Past Entries</div>'
            +'<div class="nb-history-list" id="nb-history-list"><div class="nb-empty">Loading…</div></div>'
          +'</div>'
          +'<div class="nb-spine"></div>'
          +'<div class="nb-page nb-page-right">'
            +'<div class="nb-page-hdr" id="nb-active-date"></div>'
            +'<button class="nb-today-btn" id="nb-today-btn" type="button" style="display:none">↺ Back to Today</button>'
            +'<div class="nb-paste-preview" id="nb-paste-preview" style="display:none"></div>'
            +'<textarea id="nb-text" class="nb-textarea" placeholder="What happened today…"></textarea>'
            +'<div class="nb-save-row">'
              +'<button class="nb-gem" id="nb-gem" type="button" title="Highlight a line above, then tap this to save it as a Gem">💎</button>'
              +'<button class="nb-save" id="nb-save" type="button">SAVE</button>'
              +'<button class="nb-cancel" id="nb-cancel" type="button">CANCEL</button>'
            +'</div>'
            +'<div class="nb-status" id="nb-status"></div>'
          +'</div>'
        +'</div>'
      +'</div>';
    layer.classList.add('active');

    document.getElementById('nb-close').onclick=_nbCloseAndSave;
    document.getElementById('nb-save').onclick=function(){ _nbSaveActivePage(); };
    document.getElementById('nb-cancel').onclick=function(){ _nbClearPending(); _nbRenderActivePage(); };
    document.getElementById('nb-today-btn').onclick=_nbGoToToday;
    document.getElementById('nb-gem').onclick=function(){ _nbSaveSelectionAsGem(); };

    var ta=document.getElementById('nb-text');
    if(ta){
      ta.focus();
      _nbWirePaste(ta);
    }

    // Fresh card always opens centered (CSS default); any drag from a
    // previous open doesn't carry over -- simplest thing that works,
    // and matches "the same object, now open" each time.
    var card=layer.querySelector('.nb-pcard');
    if(card){
      card.style.position='fixed'; card.style.left=''; card.style.top='';
      card.style.transform='translate(-50%,-50%)';
      card.style.right='auto'; card.style.bottom='auto';
    }
  }

  async function _nbLoadAndShow(){
    var list=document.getElementById('nb-history-list');
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user){
        if(list) list.innerHTML='<div class="nb-empty">Sign in to use your notebook.</div>';
        var ta=document.getElementById('nb-text');
        if(ta){ ta.disabled=true; ta.placeholder='Sign in to write in your notebook.'; }
        var saveBtn=document.getElementById('nb-save'); if(saveBtn) saveBtn.disabled=true;
        var dateHdr=document.getElementById('nb-active-date'); if(dateHdr) dateHdr.textContent=_nbTodayLongStr();
        return;
      }
      var res=await _sb.from('journal_notes').select('*').eq('user_id',user.id).order('created_at',{ascending:true});
      _nbEntries = (!res.error && res.data) ? res.data : [];
    }catch(e){
      _nbEntries=[];
    }
    _nbRenderHistoryList();
    _nbGoToToday();
  }

  // No dimmed backdrop on #nb-layer (see CSS: pointer-events:none on the
  // layer itself) -- so there's nothing to click "outside" the card to
  // close it. Closing is the X button only, same as Larry's original
  // spec ("closed by X"). See _nbWireDrag below for how the card gets
  // moved instead of closed when the traveler drags its title bar.

  // ── Drag -- pick the card up by its "📓 Notebook" title bar and move
  //    it anywhere, including on top of the TV. Wired once at module
  //    load (not per-render) so repeated opens never pile up duplicate
  //    document-level listeners; onDown/onMove always look up whichever
  //    .nb-pcard is live right now rather than closing over a stale one. ──
  (function(){
    var dragging=false, moved=false, startX=0, startY=0, startLeft=0, startTop=0;
    function pointOf(e){ return e.touches ? e.touches[0] : e; }
    function activeCard(){ return document.querySelector('#nb-layer .nb-pcard'); }
    function onDown(e){
      if(!e.target.closest || !e.target.closest('.nb-cover-title')) return;
      var card=activeCard(); if(!card) return;
      var p=pointOf(e);
      dragging=true; moved=false;
      var rect=card.getBoundingClientRect();
      startLeft=rect.left; startTop=rect.top;
      startX=p.clientX; startY=p.clientY;
      document.body.style.userSelect='none';
    }
    function onMove(e){
      if(!dragging) return;
      var card=activeCard();
      if(!card){ dragging=false; return; }
      var p=pointOf(e);
      var dx=p.clientX-startX, dy=p.clientY-startY;
      if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
      if(!moved) return;
      if(e.cancelable) e.preventDefault();
      card.style.position='fixed';
      card.style.transform='none';
      card.style.left=(startLeft+dx)+'px';
      card.style.top=(startTop+dy)+'px';
      card.style.right='auto'; card.style.bottom='auto';
    }
    function onUp(){
      dragging=false;
      document.body.style.userSelect='';
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, {passive:true});
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  })();

  // ── PUBLIC INTERFACE ──
  window.NotebookOpen = {
    open: function(opts){
      opts=opts||{};
      // Don't open on top of an already-open idea-capture card (1170/9713/
      // 9714/9715) -- they're on separate layers now (#isx-popup-layer vs
      // #nb-layer) so they can't visually stomp each other, but having both
      // capture UIs open at once is still confusing, so this guard stays.
      if(window.IdeaCapture && window.IdeaCapture.isOpen && window.IdeaCapture.isOpen()) return;
      _nbOnClosed=typeof opts.onClosed==='function' ? opts.onClosed : null;
      _nbTeardown();
      _nbRenderShell();
      _nbLoadAndShow();
    },
    isOpen: function(){
      var layer=document.getElementById('nb-layer');
      return !!(layer && layer.classList.contains('active') && layer.querySelector('.nb-pcard'));
    },
    close: _nbCloseAndSave
  };

})();
