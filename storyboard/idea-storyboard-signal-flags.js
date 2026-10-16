/* ============================================================
   idea-storyboard-signal-flags.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   SIGNAL FLAGS / KEYS. The shape+color+meaning "key" system used to flag cards (create, edit, delete, sync to cards) and its small shared library, plus the dot badges that show a card's assigned keys.

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

  var _sboardKeyShapes = ['circle','square','triangle','diamond','star','heart'];
  var _sboardKeyColors = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var _sboardKeyClip = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  var MAX_KEY_LIBRARY = 12; // raised from 6 -- Aug 4 2026, after merging Storyboard + Briefing Board libraries into one shared pool, the old per-board cap of 6 was too low for the combined set
  var MAX_KEYS_PER_CARD = 3;
  function _sboardKeyShapeCSS(shape, color){
    var css='background:'+color+';';
    if(shape==='circle') css+='border-radius:50%;';
    else if(shape==='square') css+='border-radius:2px;';
    else if(_sboardKeyClip[shape]) css+='clip-path:'+_sboardKeyClip[shape]+';';
    return css;
  }
  function _sboardEsc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _sboardKeyLibLocal(){
    try{ var r=sessionStorage.getItem('t2t_customKeyLibrary'); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  function _sboardSaveKeyLibLocal(lib){
    try{ sessionStorage.setItem('t2t_customKeyLibrary', JSON.stringify(lib)); }catch(e){}
  }
  // Instant paint from whatever sessionStorage remembers from last time,
  // same two-step pattern Shortcuts already uses for its own
  // traveler-wide key library, so the very first render of a board never
  // waits on a round trip just to know which keys already exist. A real
  // fetch (_sboardEnsureKeyLibraryLoaded, called once from renderSeaBoard)
  // corrects it moments later.
  var _sboardKeyLib = _sboardKeyLibLocal();
  var _sboardKeyLibLoaded = false;
  async function _sboardEnsureKeyLibraryLoaded(){
    if(_sboardKeyLibLoaded) return;
    _sboardKeyLibLoaded = true;
    var _sb=T().sb; if(!_sb) return;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) return;
      var res=await _sb.from('custom_keys').select('id,shape,color,meaning').eq('user_id',user.id).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _sboardKeyLib = res.data||[];
      _sboardSaveKeyLibLocal(_sboardKeyLib);
      renderSeaBoard();
    }catch(e){ console.error('Signal Flags: load failed', e); }
  }
  function _sboardKeyById(id){
    for(var i=0;i<_sboardKeyLib.length;i++){ if(String(_sboardKeyLib[i].id)===String(id)) return _sboardKeyLib[i]; }
    return null;
  }
  async function _sboardCreateKey(shape, color, meaning){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var ins=await _sb.from('custom_keys').insert({user_id:user.id,shape:shape,color:color,meaning:meaning}).select().single();
    if(ins.error) throw ins.error;
    _sboardKeyLib.push(ins.data);
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    return ins.data;
  }
  async function _sboardDeleteKey(keyId){
    var _sb=T().sb;
    var del=await _sb.from('custom_keys').delete().eq('id',keyId);
    if(del.error) throw del.error;
    _sboardKeyLib = _sboardKeyLib.filter(function(k){ return String(k.id)!==String(keyId); });
    _sboardSaveKeyLibLocal(_sboardKeyLib);
  }
  // Aug 3 2026 -- "we need to be able to edit or trash any custom key."
  // Trash already existed here (_sboardDeleteKey); this is the pencil.
  async function _sboardUpdateKey(keyId, shape, color, meaning){
    var _sb=T().sb;
    var upd=await _sb.from('custom_keys').update({shape:shape,color:color,meaning:meaning}).eq('id',keyId).select().single();
    if(upd.error) throw upd.error;
    var idx=-1;
    for(var i=0;i<_sboardKeyLib.length;i++){ if(String(_sboardKeyLib[i].id)===String(keyId)){ idx=i; break; } }
    if(idx!==-1) _sboardKeyLib[idx]=upd.data;
    _sboardSaveKeyLibLocal(_sboardKeyLib);
    return upd.data;
  }
  // "Place same symbol on cards and they automatically link" -- Larry,
  // Aug 3 2026. Twin of briefing-board.js's own _bbSyncKeyLinks -- same
  // table (briefing_card_links), same reconciliation logic, kept as a
  // separate copy rather than a cross-file call (this codebase's
  // convention: Storyboard and Briefing Board only ever talk through
  // window.T2T / window.T2TShared, never straight into each other's
  // functions). Reconciles every source='key' via_key_id=keyId row
  // against reality -- every Briefing Card and every idea/header
  // currently carrying this key -- adding rows for pairs that should be
  // linked and haven't yet, removing rows for pairs that no longer
  // share the key. Idea-to-idea pairs are skipped on purpose: they're
  // already sitting together right here on the board, a "jump to it"
  // link between two ideas that are both already on screen wouldn't do
  // anything useful.
  async function _sboardSyncKeyLinks(keyId){
    if(!keyId) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var ir=await _sb.from('ideas').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var ideaIds=(ir.data||[]).map(function(r){ return r.id; });
      var cr=await _sb.from('briefing_cards').select('id').or('key_slot_1.eq.'+keyId+',key_slot_2.eq.'+keyId+',key_slot_3.eq.'+keyId);
      var cardIds=(cr.data||[]).map(function(r){ return r.id; });

      var desired={};
      var i, j;
      for(i=0;i<cardIds.length;i++){
        for(j=i+1;j<cardIds.length;j++){
          var a=cardIds[i], b=cardIds[j];
          var lo=a<b?a:b, hi=a<b?b:a;
          desired['card|'+lo+'|'+hi]={target_type:'card', card_id:lo, target_card_id:hi};
        }
      }
      for(i=0;i<cardIds.length;i++){
        for(j=0;j<ideaIds.length;j++){
          desired['story|'+cardIds[i]+'|'+ideaIds[j]]={target_type:'storyboard', card_id:cardIds[i], target_idea_id:ideaIds[j]};
        }
      }

      var existRes=await _sb.from('briefing_card_links').select('*').eq('source','key').eq('via_key_id', keyId);
      var existing=existRes.data||[];
      var existingByKey={};
      existing.forEach(function(row){
        if(row.target_type==='card'){
          var a2=row.card_id, b2=row.target_card_id;
          var lo2=a2<b2?a2:b2, hi2=a2<b2?b2:a2;
          existingByKey['card|'+lo2+'|'+hi2]=row;
        } else {
          existingByKey['story|'+row.card_id+'|'+row.target_idea_id]=row;
        }
      });

      var toInsert=[], toDeleteIds=[];
      Object.keys(desired).forEach(function(k){
        if(!existingByKey[k]){
          var d=desired[k];
          toInsert.push({card_id:d.card_id, target_type:d.target_type, target_card_id:d.target_card_id||null, target_idea_id:d.target_idea_id||null, source:'key', via_key_id:keyId});
        }
      });
      Object.keys(existingByKey).forEach(function(k){
        if(!desired[k]) toDeleteIds.push(existingByKey[k].id);
      });

      if(toInsert.length) await _sb.from('briefing_card_links').insert(toInsert);
      if(toDeleteIds.length) await _sb.from('briefing_card_links').delete().in('id', toDeleteIds);
    }catch(e){ console.error('Storyboard: could not sync key-driven links', e); }
  }
  function _sboardItemKeys(item){
    return [item.key_slot_1, item.key_slot_2, item.key_slot_3].filter(function(k){ return !!k; });
  }
  // Writes all 3 slot columns from a gap-free array -- same "splice,
  // don't null out" approach the Briefing Board's own Signal Flags use,
  // so removing key #2 of 3 shifts #3 left instead of leaving an empty
  // middle slot.
  async function _sboardWriteItemKeys(itemId, keysArr){
    var _sb=T().sb;
    var upd=await _sb.from('ideas').update({
      key_slot_1: keysArr[0]||null,
      key_slot_2: keysArr[1]||null,
      key_slot_3: keysArr[2]||null
    }).eq('id', itemId);
    if(upd.error) throw upd.error;
    var row=_sboardAllRowsById[itemId];
    if(row){ row.key_slot_1=keysArr[0]||null; row.key_slot_2=keysArr[1]||null; row.key_slot_3=keysArr[2]||null; }
  }
  // On-card badge, Aug 3 2026 -- small shape+color dots tucked just left
  // of the heart, bottom-right -- Larry: "Custom key goes on the outside
  // of the card like the heart," after an earlier top-center placement
  // didn't read right. title=meaning gives the "visible on hover" Larry
  // asked for, for free, via the native browser tooltip.
  function _sboardKeyDotsHTML(item){
    var keys=_sboardItemKeys(item);
    if(!keys.length) return '';
    return '<div class="sb-key-dots">'+keys.map(function(kid){
      var k=_sboardKeyById(kid);
      if(!k) return '';
      return '<span class="sb-key-dot" style="'+_sboardKeyShapeCSS(k.shape,k.color)+'" title="'+_sboardEsc(k.meaning||'')+'"></span>';
    }).join('')+'</div>';
  }

  // Front-of-card badge (Aug 9 2026, Larry). Tile rendering
  // (_sboardMakeTile/_sboardMakeHeaderStackTile, and 9711's own
  // _isxMakeTile/_isxMakeHeaderStackTile via the T2TStoryboard bridge
  // below) is synchronous, but the name behind a user_id lives in the
  // members table -- a separate round trip. Rather than block every
  // render on that, _sboardEnsureMemberInitials fetches whatever's
  // missing in the background and the caller re-renders (fromCache=true,
  // so it's cheap) once new names actually land. Cache is keyed by
  // user_id and never invalidated -- a member's initials essentially
  // never change mid-session, same assumption _bbMembersCache already
  // makes on the Briefing Board side.
