/* ============================================================
   briefing-board-signal-flags.js -- T2T Field Guide - BRIEFING BOARD (9350)

   SIGNAL FLAGS. The shared flag library (shape + color + meaning)
   that crosses every board -- picking one for a card, building a
   new one, and the shared library manager (view/edit/delete). Not
   board-specific and not card-specific: this is its own thing on
   purpose, same as it already was inside the single file.

   Split out of briefing-board.js Sept 9, 2026 -- the file had grown
   past 8,000 lines (Code Growth Watch flags a split well before
   that). One earlier partial attempt at this split (Sept 5, 2026)
   left briefing-board-styles.js / briefing-board-screens.js /
   briefing-board-archive.js in the repo but never finished wiring
   them in -- briefing-board.js kept its own internal copies the
   whole time and nothing ever loaded those three files. This split
   replaces that abandoned attempt: styles.js and screens.js are
   regenerated fresh from the current code, archive.js's contents
   now live inside briefing-board-card.js, and archive.js itself is
   deleted.

   All eight pieces below share one global scope on the page (same
   as the single file did internally) -- there's no per-file wrapper
   and no namespace object, so every function/variable here is
   reachable by its plain name from any of the other seven files.
   Load order does not matter: nothing at the top level of any of
   these files calls into another file's code immediately -- it's
   all either a definition, a constant, or an event-listener
   registration whose callback runs later, once every file is
   already loaded.

   Sibling files: called from briefing-board-card.js (key-link counts) and briefing-board-ops.js (card detail's key slots).
   ============================================================ */



  // Signal Flags, July 21, 2026 -- replaces the old one-per-board Signal.
  // A shared library of up to 12 traveler-defined keys (shape + color
  // + meaning), built from a fixed set of 6 shapes and 6 curated colors
  // so any two library entries stay visually distinct at card-face size.
  // Each card carries up to 3 of them (c.keys, an array of library ids)
  // -- see Larry's July 21 design chat for the 6/6/6/3 reasoning.
  var SIGNAL_SHAPES = ['circle','square','triangle','diamond','star','heart'];
  var KEY_COLORS = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var MAX_KEY_LIBRARY = 12; // raised from 6 -- Aug 4 2026, after merging Storyboard + Briefing Board libraries into one shared pool, the old per-board cap of 6 was too low for the combined set
  var MAX_KEYS_PER_CARD = 3;
  var SIGNAL_CLIP = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  function _bbShapeCSS(shape, color){
    var css='background:'+color+';';
    if(shape==='circle') css+='border-radius:50%;';
    else if(shape==='square') css+='border-radius:2px;';
    else if(SIGNAL_CLIP[shape]) css+='clip-path:'+SIGNAL_CLIP[shape]+';';
    return css;
  }
  function _bbLoadKeyLibrary(){
    return _bbKeyLibCache;
  }
  // Old per-board sessionStorage key, kept read-only so the one legacy
  // migration path below (a "field guide"-named board found empty)
  // can still recover any keys a traveler entered before named
  // multi-board storage shipped -- nothing else writes this key anymore.
  function _bbLoadKeyLibraryLegacy(){
    try{ var r=sessionStorage.getItem('bbKeyLibrary'); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  async function _bbEnsureKeyLibraryLoaded(){
    if(_bbKeyLibraryLoaded) return;
    _bbKeyLibraryLoaded=true;
    var sb=T().sb; if(!sb) return;
    try{
      var uid=await _bbCurrentUserId(); if(!uid) return;
      var res=await sb.from('custom_keys').select('*').eq('user_id',uid).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _bbKeyLibCache=res.data||[];
    }catch(e){ console.error('Briefing Board: could not load key library', e); }
  }
  async function _bbEnsureHiddenTypesLoaded(){
    if(_bbHiddenTypesLoaded) return;
    _bbHiddenTypesLoaded=true;
    var sb=T().sb; if(!sb) return;
    try{
      var uid=await _bbCurrentUserId(); if(!uid) return;
      var res=await sb.from('org_type_hidden').select('value').eq('user_id',uid);
      if(res.error) throw res.error;
      _bbHiddenTypesCache=(res.data||[]).map(function(r){ return r.value; });
    }catch(e){ console.error('Briefing Board: could not load hidden Types', e); }
  }
  // Fixed Types minus whatever's hidden -- but a value still in use by
  // one of the traveler's own boards always shows regardless, so hiding
  // a preset can never strand access to an existing board.
  function _bbVisibleFixedTypes(){
    var hidden={}; (_bbHiddenTypesCache||[]).forEach(function(v){ hidden[v]=true; });
    var inUse={}; _bbBoards.forEach(function(b){ inUse[(b.board_type||'personal')]=true; });
    return BB_BOARD_TYPES.filter(function(t){ return !hidden[t.value] || inUse[t.value]; });
  }
  async function _bbHideType(value){
    var uid=await _bbCurrentUserId(); if(!uid || !value) return;
    if(_bbHiddenTypesCache.indexOf(value)===-1) _bbHiddenTypesCache.push(value);
    var sb=T().sb;
    try{
      var ins=await sb.from('org_type_hidden').upsert({user_id:uid, value:value});
      if(ins.error) console.error('Briefing Board: could not hide Type', ins.error);
    }catch(e){ console.error('Briefing Board: could not hide Type', e); }
    _bbRenderTypePicker();
    _bbRenderOrgName();
  }
  async function _bbCreateKey(shape, color, meaning){
    var sb=T().sb;
    var uid=await _bbCurrentUserId();
    if(!uid) throw new Error('Not signed in.');
    var ins=await sb.from('custom_keys').insert({user_id:uid, shape:shape, color:color, meaning:meaning}).select().single();
    if(ins.error) throw ins.error;
    _bbKeyLibCache.push(ins.data);
    return ins.data;
  }
  async function _bbUpdateKey(keyId, shape, color, meaning){
    var sb=T().sb;
    var upd=await sb.from('custom_keys').update({shape:shape, color:color, meaning:meaning}).eq('id', keyId).select().single();
    if(upd.error) throw upd.error;
    var idx=_bbKeyLibCache.findIndex ? _bbKeyLibCache.findIndex(function(k){ return String(k.id)===String(keyId); }) : -1;
    if(idx===-1){ for(var i=0;i<_bbKeyLibCache.length;i++){ if(String(_bbKeyLibCache[i].id)===String(keyId)){ idx=i; break; } } }
    if(idx!==-1) _bbKeyLibCache[idx]=upd.data;
    return upd.data;
  }
  async function _bbDeleteKey(keyId){
    var sb=T().sb;
    var del=await sb.from('custom_keys').delete().eq('id', keyId);
    if(del.error) throw del.error;
    _bbKeyLibCache=_bbKeyLibCache.filter(function(k){ return String(k.id)!==String(keyId); });
  }
  // Hidden presets, Aug 15 2026 -- a traveler can remove a seeded Type
  // they don't want cluttering the list (e.g. Jonny drops "Client" and
  // keeps only "Partner"). Only ever hides *unused* presets -- a value
  // still in use by one of the traveler's own boards always keeps
  // showing regardless (see _bbVisibleFixedTypes), so removing one
  // never strands access to an existing board.
  var _bbHiddenTypesCache = [];
  var _bbHiddenTypesLoaded = false;
  // Signal Flags, Aug 3 2026 -- merged into the Storyboard's shared,
  // traveler-wide custom_keys table (was its own board-scoped
  // briefing_board_keys). Loaded once per session (_bbKeyLibraryLoaded
  // guards it), not re-fetched on every board switch -- see
  // _bbEnsureKeyLibraryLoaded, called from _bbInitBoardsAndData.
  var _bbKeyLibCache = [];
  var _bbKeyLibraryLoaded = false;

  // Signal Flags -- a shared library of up to 12 traveler-defined
  // signal flags (shape+color+meaning), built in the Add-a-Signal-Flag overlay (9390).
  // A card holds up to 3 (c.keys, always kept gap-free -- see
  // removeKeyFromSlot). Tapping ANY circle (empty or filled) opens
  // Choose a Signal Flag (9395), which does triple duty: assign an existing
  // library entry, remove what's there, or jump into building a brand
  // new one. Meanings stay hover-only by design ("can't remember what
  // it means? hover over it") -- no separate legend, kept intentionally
  // intuitive.
  // July 22, 2026, Larry: only ONE open "+" shows at a time, never all
  // 3 circles up front -- a fresh card shows a single +, filling it
  // reveals the next, filling that reveals the third. Once all 3 are
  // filled, no separate + appears; tapping any of the 3 still swaps
  // that slot for a different key (or removes it, or builds a new one
  // in its place) -- same picker as always, just no 4th add icon.
  // Before this, all 3 circles (empty ones dashed "+") showed at once
  // per Larry's July 21 (afternoon) call -- replaced today per his ask
  // to keep only one + visible.
  var _bbKeyDraft = {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
  var _bbOpenSlotIndex = null;

  function _bbRenderKeyRow(c){
    var row=document.getElementById('bb-d-key-row'); if(!row) return;
    var lib=_bbLoadKeyLibrary();
    // July 22, 2026, Larry: show filled slots plus exactly ONE open "+" --
    // never all 3 circles up front. c.keys is kept gap-free (see
    // removeKeyFromSlot), so "next open slot" is always keys.length.
    var keys=(c.keys||[]).filter(function(id){ return !!id; });
    var html='';
    for(var i=0;i<keys.length;i++){
      var k = lib.filter(function(x){ return x.id===keys[i]; })[0];
      if(!k) continue;
      html += '<button class="bb-key-btn" data-slot="'+i+'" title="'+_esc(k.meaning||'')+'">'
        +'<span class="bb-key-shape" style="display:block;width:16px;height:16px;'+_bbShapeCSS(k.shape, k.color)+'"></span>'
        +'</button>';
    }
    if(keys.length < MAX_KEYS_PER_CARD){
      html += '<button class="bb-key-btn bb-key-add" data-slot="'+keys.length+'" title="Add a signal flag">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.bb-key-btn').forEach(function(btn){
      var slotIdx=Number(btn.getAttribute('data-slot'));
      var isFilled = !btn.classList.contains('bb-key-add');
      // Click-and-hold a filled Signal Flag to see every other card
      // carrying that same flag -- Aug 15 2026 (Larry: "click to travel
      // from one to another... like the header stack but even from
      // board to board"). Same 550ms hold as the Idea Storyboard's own
      // flag peek, so the gesture reads the same on either board. A
      // short click/tap still opens the picker as before.
      if(isFilled){
        var keyId=keys[slotIdx];
        var kHoldTimer=null, kHeld=false, kStartX=0, kStartY=0;
        // Aug 15 2026 fix -- a real finger (or trackpad click) drifts a
        // few pixels even when someone means to hold still, and the
        // header-stack peek's plain touchmove-cancels-everything version
        // got away with that because it has a fallback doorway (the
        // CLUSTER pill). This flag peek has no second doorway, so a
        // twitchy cancel would silently make it unreachable on touch.
        // Only cancel once the press has actually moved (10px), not on
        // the first touchmove event.
        function kStartHold(e){
          kHeld=false;
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          kStartX=pt.clientX; kStartY=pt.clientY;
          kHoldTimer=setTimeout(function(){ kHeld=true; var k=lib.filter(function(x){ return x.id===keyId; })[0]; if(k) openKeyPeek(k); }, 550);
        }
        function kCancelHold(){ clearTimeout(kHoldTimer); }
        function kMoveCheck(e){
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          if(Math.abs(pt.clientX-kStartX)>10 || Math.abs(pt.clientY-kStartY)>10) kCancelHold();
        }
        btn.addEventListener('mousedown', kStartHold);
        btn.addEventListener('touchstart', kStartHold);
        btn.addEventListener('mouseup', kCancelHold);
        btn.addEventListener('mouseleave', kCancelHold);
        btn.addEventListener('touchend', kCancelHold);
        btn.addEventListener('touchmove', kMoveCheck);
        btn.addEventListener('click', function(){ if(!kHeld) openKeyPicker(slotIdx); kHeld=false; });
      } else {
        btn.addEventListener('click', function(){ openKeyPicker(slotIdx); });
      }
    });
  }

  function openKeyPicker(slotIndex){
    _bbOpenSlotIndex = slotIndex;
    _bbRenderKeyPickerList();
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    var hasKey = !!(c && c.keys && c.keys[slotIndex]);
    var removeBtn=document.getElementById('bb-keypicker-remove');
    if(removeBtn) removeBtn.style.display = hasKey ? '' : 'none';
    var ov=document.getElementById('bb-keypicker-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyPicker(){
    var ov=document.getElementById('bb-keypicker-overlay'); if(ov) ov.classList.remove('active');
  }

  // Signal Flag peek, Aug 15 2026 (Larry: "click to travel from one to
  // another... like the header stack but even from board to board") --
  // twin of the Idea Storyboard's openSbKeyPeek. Shows every other
  // Briefing card carrying the same flag (opens right in place, same
  // tab, switching boards first if needed), plus any Idea Storyboard
  // matches as a jump-list to a new tab -- headers open straight to
  // their own board (the existing fg_open_header_id handoff); a plain
  // subber has no board of its own, so it opens the board it lives on
  // (its parent header) rather than nothing at all.
  async function openKeyPeek(keyObj){
    var titleEl=document.getElementById('bb-keypeek-title');
    if(titleEl){
      titleEl.innerHTML='<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;'+_bbShapeCSS(keyObj.shape,keyObj.color)+'"></span>'+_esc(keyObj.meaning||'Signal Flag');
    }
    var body=document.getElementById('bb-keypeek-body');
    if(body){ body.textContent='Loading…'; body.style.color=''; }
    var ov=document.getElementById('bb-keypeek-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
    var sb=T().sb;
    if(!sb || !body) return;
    try{
      // Aug 15 2026 (Larry: "there might be many different boards of
      // each type... must include the TITLE") -- embeds the parent
      // board's own name via the existing board_id foreign key, so
      // matches can be grouped and labeled by their real board instead
      // of a generic "the Briefing Board" bucket.
      var cardRes=await sb.from('briefing_cards').select('id,board_id,task,briefing_boards!board_id(name)')
        .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
        .eq('archived',false).limit(200);
      if(cardRes.error) throw new Error(cardRes.error.message);
      var cardRows=cardRes.data||[];

      var ideaRows=[];
      try{
        var ideaRes=await sb.from('ideas').select('id,content_type,text_content,cluster_id,topic_scope_id')
          .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
          .limit(200);
        if(!ideaRes.error) ideaRows=ideaRes.data||[];
      }catch(e){}

      if(!cardRows.length && !ideaRows.length){
        body.textContent='No other cards carry this Signal Flag yet.';
        return;
      }
      body.innerHTML='';
      body.style.cssText='';

      // Aug 15 2026 (Larry: "looks awkward... more like cards than
      // document links") -- each match renders as an actual small card,
      // reusing the real .bb-card look for Briefing Board matches (same
      // board, same card style) and the Idea Board's own blue/navy card
      // language for Idea Board matches -- so which board a match lives
      // on reads from its color alone, before you even read the label
      // above it. Grouped and labeled by each match's real board name,
      // since a traveler can have several boards of the same type.
      if(cardRows.length){
        var byBoard={}; var boardOrder=[];
        cardRows.forEach(function(c){
          var bid=c.board_id||'';
          if(!byBoard[bid]){ byBoard[bid]=[]; boardOrder.push(bid); }
          byBoard[bid].push(c);
        });
        var bbOuter=document.createElement('div');
        bbOuter.style.cssText='margin-bottom:'+(ideaRows.length?'14px':'0');
        boardOrder.forEach(function(bid, idx){
          var groupCards=byBoard[bid];
          var boardName=(groupCards[0].briefing_boards && groupCards[0].briefing_boards.name) || 'Untitled Board';
          var bbLbl=document.createElement('div');
          bbLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px;text-align:left';
          bbLbl.textContent='On the '+boardName+' Briefing Board:';
          bbOuter.appendChild(bbLbl);
          var bbGrid=document.createElement('div');
          bbGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupCards.forEach(function(c){
            var card=document.createElement('div');
            card.className='bb-card';
            card.style.cssText='width:100%;box-sizing:border-box;cursor:pointer';
            card.textContent=c.task||'(untitled)';
            card.addEventListener('click', async function(){
              closeKeyPeek();
              await _bbSwitchToBoard(c.board_id);
              openCardDetail(c.id);
            });
            bbGrid.appendChild(card);
          });
          bbOuter.appendChild(bbGrid);
        });
        body.appendChild(bbOuter);
      }

      if(ideaRows.length){
        // Same grouping on the Idea Board side -- topic_scope_id is the
        // nearest TOPIC-or-root ancestor, same id briefing_boards'
        // storyboard_project_id keys off of, and that ancestor's own
        // text_content is the board's real title (same resolution the
        // header<->card sync already uses).
        var scopeIds=[]; var seenScope={};
        ideaRows.forEach(function(r){
          if(r.topic_scope_id && !seenScope[r.topic_scope_id]){ seenScope[r.topic_scope_id]=true; scopeIds.push(r.topic_scope_id); }
        });
        var scopeNameById={};
        if(scopeIds.length){
          try{
            var scopeRes=await sb.from('ideas').select('id,text_content').in('id', scopeIds);
            (scopeRes.data||[]).forEach(function(s){ scopeNameById[s.id]=s.text_content||'Untitled Board'; });
          }catch(e){}
        }
        var byScope={}; var scopeOrder=[];
        ideaRows.forEach(function(r){
          var sid=r.topic_scope_id||'';
          if(!byScope[sid]){ byScope[sid]=[]; scopeOrder.push(sid); }
          byScope[sid].push(r);
        });
        var ibOuter=document.createElement('div');
        scopeOrder.forEach(function(sid, idx){
          var groupRows=byScope[sid];
          var boardName=scopeNameById[sid]||'Idea Board';
          var ibLbl=document.createElement('div');
          ibLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#a3907a;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px;text-align:left';
          ibLbl.textContent='On the '+boardName+' Idea Board:';
          ibOuter.appendChild(ibLbl);
          var ibGrid=document.createElement('div');
          ibGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupRows.forEach(function(row){
            var targetHeaderId = (row.content_type==='header') ? row.id : row.cluster_id;
            var card=document.createElement('div');
            // Aug 15 2026 (Larry: "make the Idea Board flag card look
            // just like the BB flag card") -- same .bb-card look on
            // both groups now; the board name is already carried by
            // the label above each group, so the card itself doesn't
            // need to carry it too via color.
            card.className='bb-card';
            card.style.cssText='width:100%;box-sizing:border-box;cursor:pointer';
            card.textContent=row.text_content||'(untitled)';
            card.addEventListener('click', function(){
              try{
                sessionStorage.setItem('bp_target','1010');
                if(targetHeaderId) sessionStorage.setItem('fg_open_header_id', targetHeaderId);
              }catch(e){}
              window.open(location.pathname+location.search, '_blank');
            });
            ibGrid.appendChild(card);
          });
          ibOuter.appendChild(ibGrid);
        });
        body.appendChild(ibOuter);
      }
    }catch(err){
      body.textContent=err.message;
      body.style.color='#a3372b';
    }
  }

  function closeKeyPeek(){
    var ov=document.getElementById('bb-keypeek-overlay'); if(ov) ov.classList.remove('active');
  }
  // Shows the whole library every time a slot is tapped -- Larry's "so
  // you know what is already possible" ask -- greying out any entry
  // already sitting in one of this card's OTHER two slots, since one
  // card showing the same key twice would just be confusing.
  function _bbRenderKeyPickerList(){
    var list=document.getElementById('bb-keypicker-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    var keys=(c && c.keys) || [];
    if(!lib.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No signal flags yet &mdash; build your first one below.</div>';
    } else {
      list.innerHTML = lib.map(function(k){
        var usedElsewhere = keys.indexOf(k.id)>=0 && keys[_bbOpenSlotIndex]!==k.id;
        return '<div class="bb-key-pick-row-wrap">'
          +'<button class="bb-key-pick-row'+(usedElsewhere?' bb-key-pick-disabled':'')+'" data-key-id="'+k.id+'">'
          +'<span class="bb-key-pick-swatch" style="display:inline-block;'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-key-pick-meaning">'+_esc(k.meaning||'')+'</span>'
          +'</button>'
          // Pencil-to-edit, Aug 4 2026 -- Larry: "I must have a way to
          // edit or change the meaning of any one of them" from
          // wherever he actually runs into a signal flag, not just Board
          // Settings' library manager. Same edit form (openKeyBuilder
          // with existingKey), reached straight from the card's own
          // Choose-a-Signal-Flag picker too.
          +'<button class="bb-key-pick-edit" data-key-id="'+k.id+'" title="Edit this signal flag">&#9998;</button>'
          +'</div>';
      }).join('');
      list.querySelectorAll('.bb-key-pick-row').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(btn.classList.contains('bb-key-pick-disabled')) return;
          assignKeyToSlot(btn.getAttribute('data-key-id'));
        });
      });
      list.querySelectorAll('.bb-key-pick-edit').forEach(function(btn){
        btn.addEventListener('click', function(){
          var k=lib.filter(function(x){ return String(x.id)===btn.getAttribute('data-key-id'); })[0];
          if(k){ var slot=_bbOpenSlotIndex; closeKeyPicker(); openKeyBuilder(k, function(){ openKeyPicker(slot); }); }
        });
      });
    }
    var newBtn=document.getElementById('bb-keypicker-new');
    if(newBtn) newBtn.style.display = lib.length>=MAX_KEY_LIBRARY ? 'none' : '';
  }
  async function assignKeyToSlot(keyId){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(!c) return;
    c.keys = c.keys || [];
    c.keys[_bbOpenSlotIndex] = keyId;
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
    // Auto-link, Aug 3 2026 -- reconcile once the key's own database
    // row is confirmed current, so _bbSyncKeyLinks sees this card among
    // the key's holders.
    await _bbPersistCardKeysNow(c);
    await _bbSyncKeyLinks(keyId);
    await _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }));
    renderBoard();
  }
  async function removeKeyFromSlot(){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(!c || !c.keys) return;
    var removedKeyId=c.keys[_bbOpenSlotIndex];
    // Splice, don't null out -- keeps the array gap-free so the next
    // render shows the remaining keys packed left plus one "+", instead
    // of a hole where the removed key used to sit.
    c.keys.splice(_bbOpenSlotIndex, 1);
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
    await _bbPersistCardKeysNow(c);
    if(removedKeyId) await _bbSyncKeyLinks(removedKeyId);
    await _bbLoadKeyLinkCounts(_bbCardsList().map(function(x){ return x.id; }));
    renderBoard();
  }

  // existingKey -- optional (Aug 3 2026, pencil-to-edit on the Signal Flags
  // manager). Pre-fills the draft from a real key row and
  // switches saveNewKey (below) into update mode instead of insert.
  // onSaved(savedKeyRow) -- what to do once it's actually saved: assign
  // it to the card slot that opened this (bb-keypicker-new's case,
  // below), or just refresh whatever list is showing it (Signal Flags
  // manager, Task 8). Always explicit now -- no implicit "guess from
  // whatever card/slot happens to still be open" fallback, since that
  // got fragile once this overlay had more than one way in.
  var _bbKeyBuilderOnSaved = null;
  function openKeyBuilder(existingKey, onSaved){
    _bbKeyDraft = existingKey
      ? {shape:existingKey.shape, color:existingKey.color, editingId:existingKey.id}
      : {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
    _bbKeyBuilderOnSaved = onSaved || null;
    var m=document.getElementById('bb-keybuilder-meaning'); if(m) m.value=existingKey?(existingKey.meaning||''):'';
    var t=document.querySelector('#bb-keybuilder-overlay .bb-overlay-title'); if(t) t.textContent=existingKey?'Edit Signal Flag':'Add a Signal Flag';
    var s=document.getElementById('bb-keybuilder-save'); if(s) s.textContent=existingKey?'Save changes':'Save';
    _bbHighlightKeyBuilderShape(_bbKeyDraft.shape);
    _bbHighlightKeyBuilderColor(_bbKeyDraft.color);
    var ov=document.getElementById('bb-keybuilder-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyBuilder(){
    var ov=document.getElementById('bb-keybuilder-overlay'); if(ov) ov.classList.remove('active');
  }
  function _bbHighlightKeyBuilderShape(shape){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-shape-btn').forEach(function(btn){
      btn.classList.toggle('bb-shape-active', btn.getAttribute('data-shape')===shape);
    });
  }
  function _bbHighlightKeyBuilderColor(color){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-key-swatch').forEach(function(btn){
      btn.classList.toggle('bb-swatch-active', btn.getAttribute('data-color')===color);
    });
  }
  // Handles both create (fresh _bbKeyDraft) and edit (_bbKeyDraft.editingId
  // set) -- Aug 3 2026, "we need to be able to edit or trash any custom
  // key." Calls back via _bbKeyBuilderOnSaved rather than hardcoding
  // what happens next, since this overlay now opens from more than one
  // place (a card's Choose-a-Signal-Flag, and the Signal Flags manager).
  async function saveNewKey(){
    var meaningEl=document.getElementById('bb-keybuilder-meaning');
    var meaning=meaningEl?meaningEl.value.trim():'';
    if(!meaning){ if(meaningEl) meaningEl.focus(); return; }
    if(!_bbKeyDraft.editingId && _bbKeyLibCache.length>=MAX_KEY_LIBRARY) return;
    var savedKey;
    try{
      if(_bbKeyDraft.editingId){
        savedKey=await _bbUpdateKey(_bbKeyDraft.editingId, _bbKeyDraft.shape, _bbKeyDraft.color, meaning);
      } else {
        savedKey=await _bbCreateKey(_bbKeyDraft.shape, _bbKeyDraft.color, meaning);
      }
    }catch(e){
      console.error('Briefing Board: could not save signal flag', e);
      window.alert('Could not save that signal flag. Error: '+(e&&e.message?e.message:String(e))+'. Please try again.');
      return;
    }
    closeKeyBuilder();
    if(_bbKeyBuilderOnSaved) _bbKeyBuilderOnSaved(savedKey);
  }
  function wireKeyBuilder(){
    document.querySelectorAll('#bb-keybuilder-overlay .bb-shape-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        _bbKeyDraft.shape=btn.getAttribute('data-shape');
        _bbHighlightKeyBuilderShape(_bbKeyDraft.shape);
      });
    });
    document.querySelectorAll('#bb-keybuilder-overlay .bb-key-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){
        _bbKeyDraft.color=btn.getAttribute('data-color');
        _bbHighlightKeyBuilderColor(_bbKeyDraft.color);
      });
    });
    T().wire('bb-keybuilder-save', saveNewKey);
    T().wire('bb-keybuilder-close', closeKeyBuilder);
  }
  function wireKeyPicker(){
    T().wire('bb-keypicker-close', closeKeyPicker);
    T().wire('bb-keypicker-remove', removeKeyFromSlot);
    T().wire('bb-keypicker-new', function(){
      closeKeyPicker();
      openKeyBuilder(null, function(newKey){ assignKeyToSlot(newKey.id); });
    });
  }

  // ---- Signal Flags manager (9397) ----

  function _bbRenderKeyLibManager(){
    var list=document.getElementById('bb-keylib-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    if(!lib.length){
      list.innerHTML='<div class="bb-links-empty">No signal flags yet. Build one below.</div>';
    } else {
      list.innerHTML=lib.map(function(k){
        return '<div class="bb-keylib-row">'
          +'<span class="bb-keylib-swatch" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-keylib-meaning">'+_esc(k.meaning||'')+'</span>'
          +'<button class="bb-keylib-edit" data-key-id="'+_esc(k.id)+'" title="Edit this signal flag">&#9998;</button>'
          +'<button class="bb-keylib-del" data-key-id="'+_esc(k.id)+'" title="Delete this signal flag">&#128465;&#65039;</button>'
          +'</div>';
      }).join('');
      list.querySelectorAll('.bb-keylib-edit').forEach(function(btn){
        btn.addEventListener('click', function(){
          var key=lib.filter(function(k){ return String(k.id)===btn.getAttribute('data-key-id'); })[0];
          if(key){ closeKeyLibManager(); openKeyBuilder(key, function(){ openKeyLibManager(); }); }
        });
      });
      list.querySelectorAll('.bb-keylib-del').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var id=btn.getAttribute('data-key-id');
          if(!window.confirm('Delete this signal flag? It will be removed from every card and Storyboard item currently using it, and any links that exist only because of it.')) return;
          try{ await _bbDeleteKey(id); }
          catch(e){ console.error('Briefing Board: could not delete signal flag', e); window.alert('Could not delete that signal flag. Please try again.'); return; }
          _bbRenderKeyLibManager();
          renderBoard();
        });
      });
    }
    var addBtn=document.getElementById('bb-keylib-add');
    if(addBtn) addBtn.style.display = lib.length>=MAX_KEY_LIBRARY ? 'none' : '';
  }

  function openKeyLibManager(){
    _bbRenderKeyLibManager();
    var ov=document.getElementById('bb-keylibmanager-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyLibManager(){
    var ov=document.getElementById('bb-keylibmanager-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireKeyLibManager(){
    T().wire('bb-keylibmanager-close', closeKeyLibManager);
    T().wire('bb-keylib-add', function(){ closeKeyLibManager(); openKeyBuilder(null, function(){ openKeyLibManager(); }); });
  }
  function _bbApplyRemoteKey(evt, row, oldRow){
    if (!_bbKeyLibraryLoaded) return; // library not fetched in this tab yet -- nothing cached to patch
    if (evt === 'DELETE') {
      if (!oldRow) return;
      _bbKeyLibCache = _bbKeyLibCache.filter(function(k){ return String(k.id) !== String(oldRow.id); });
    } else {
      var idx = -1;
      for (var i=0;i<_bbKeyLibCache.length;i++){ if (String(_bbKeyLibCache[i].id) === String(row.id)) { idx=i; break; } }
      if (idx !== -1) _bbKeyLibCache[idx] = row; else _bbKeyLibCache.push(row);
    }
    _bbRtSafeRender();
  }
