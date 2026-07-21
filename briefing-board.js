/* ============================================================
   briefing-board.js -- T2T Field Guide - BRIEFING BOARD (9350)

   Built July 19, 2026. A traveler's own DO / DOING / DONE / HANG-UPS
   board, based on Larry's original Disney Briefing Board booklet. It
   borrows the look and feel of the ISB Storyboard (card shapes, the
   turned-up corner that flips to a detail screen, drag between
   columns) but is deliberately its OWN module, not a mode bolted onto
   idea-storyboard-9710.js -- that file already carries the scars of
   teaching one engine to run two similar-but-different screens
   (9710/9711). A third mode there risked the same class of bug.

   Talks to backpack.js ONLY through window.T2T (registerPageNum,
   registerUtilScreen, registerScreenActivate, wire, nav, goMG,
   returnToMG), same convention every other module in this codebase
   follows.

   Screens, every one individually numbered per Larry's July 19, 2026
   rule -- every traveler-facing screen is a Touch Point:
     9350  s-briefing-board    the board itself (4 fixed columns) --
                                a real nav()'d screen.
     9360  bb-add-overlay      Add a Card
     9370  bb-detail-overlay   Briefing Card (was "Back of the Card" --
                                renamed July 20: it holds everything
                                on or about the card now, not just a
                                flipped-over back face)
     9390  bb-keybuilder-overlay  Add a Key -- builds one Custom Keys
                                library entry (shape+color+meaning).
                                9380 stays reserved for the Done archive.
     9395  bb-keypicker-overlay   Choose a Key -- opened by tapping any
                                of a card's 3 fixed key-slot circles.
                                Lists the library to pick from, Remove
                                (if the slot's filled), or Build a new
                                key (drops into 9390, slot-aware).
   9360/9370 converted from nav()'d screens to overlays July 20, 2026,
   per Larry: the card should sit ON TOP of the board (board stays
   visible/live underneath, dimmed), closed via an explicit X or by
   clicking outside the card -- same convention idea-storyboard-9710.js
   already uses for its own DETAILS card (sb-detail-overlay). Per the
   July 19 rule, overlay screens still get their own Touch Point number,
   they just don't call nav() to get it -- see backpack.js's page-toast
   detection for where 9360/9370 get recognized while active. A third
   overlay, bb-settings-overlay (colors/fonts), joined July 20 -- it
   never carries traveler data, just an appearance choice, so it isn't
   its own Touch Point.
   9380/9390 held in reserve (a Done archive, automation settings,
   whatever earns its place later).

   Trash + hearts, July 20, 2026 -- Larry's framing: a card sitting in
   Do is really just an idea (no inherent value yet), same as anything
   on the ISB before it's proven out. So this board borrows the ISB's
   own two ways of handling that: a fixed round Trash can (bottom-right
   of the board, same "small circle, drag a card onto it" convention as
   9711's isx-trash-fixed) for an idea that turns out not worth doing --
   NOT the same thing as finishing it (that's Done) -- plus a heart
   count (tap to add, hold to remove, same gesture as the ISB's
   sb-heart-pill) on the back of the card, for resonance.

   Priority, July 20, 2026 -- Larry's "3=5" principle: give a group
   three choices (High/Medium/Low) and group discussion almost always
   settles on five real answers, because disagreement between two
   people's H and M becomes MH, between H and L becomes a clean M, etc.
   So the scale here is H / MH / M / ML / L, not just three buttons.
   Each column sorts by priority, H at the top, unset priority at the
   bottom (not yet triaged) -- ties keep whatever order they already
   had (stable sort), same as how the cards landed there. A near or
   passed due date can also pull a card's effective sort rank up (never
   down) even past its stated priority.

   Topic + appearance + Date Added, July 20, 2026:
   - #bb-topic-pill: a rounded, always-WHITE (not themeable -- the one
     constant regardless of color choice) fill-in-the-blank name, right
     next to the "Briefing Board" title on the SAME row (not its own
     bar -- folded in July 20 to save vertical board space) so whichever
     specific board this is (Personal / a project's / the company's /
     a department's) reads at a glance. Tap to edit, saved on blur.
   - Gear icon opens bb-settings-overlay: a handful of preset color
     themes plus a Classic/Clean font choice, applied as CSS custom
     properties on #fg-root (so both the board and its sibling overlays
     pick them up) and remembered in sessionStorage. Deliberately presets
     rather than a full color/font picker -- keeps this buildable now;
     revisit if Larry wants finer control later. The semantic colors
     (Hang-Ups red, flag colors, priority H-L gradient, heart red) stay
     fixed on purpose -- they carry meaning, a theme swap shouldn't
     change what "urgent" looks like.
   - X (bb-close-x) closes the board straight to the MG; the MG-jump
     icon (b-bb-mg) rides along next to gear/X in the same header row.
     The board's own separate bottom bar2 (the old back-arrow/MG-jump
     pair) was dropped entirely July 20 -- Larry: it had become an
     obsolete second toolbar once the header row could do the same job,
     and it was eating vertical space the board itself could use.
   - Date Added (c.assigned, already silently stamped at creation) now
     shows read-only on the back of the card -- useful there even
     though it was pulled off the card face itself.

   Review + Archive, July 20, 2026 -- "A DONE card remains on the board
   until reviewed." Larry's own PRO/GROW vocabulary, refined same day:
   PRO and GROW are both just performance-eval flags (click to tag,
   same one-tap pattern as Signal flag) -- no separate free-text field,
   they ARE the eval. Verified complete is the only thing that signals
   removal to the archive -- no separate Archive button; checking it
   while the card is actually sitting in Done archives it on the spot.
   Elsewhere it's a quiet no-op -- another hidden Mickey, per Larry:
   every action still exists for later without being explained. Priority
   sits above Task now (first thing a reviewer or traveler sees).
   "Reviewed by" is a plain text stand-in for now (no real team roster
   yet -- see the held team-roster discussion); revisit once real
   accounts/roles exist. Archiving hides a card from the board entirely
   (out of the 4 columns, kept in storage as history) rather than
   opening a full browsable Archive screen yet -- Touch Point 9380 stays
   reserved for that if/when it's wanted. Dragging a Done card back out
   to any other column retracts the whole judgment: completed date,
   Verified, PRO, and GROW all clear together.

   Persistence: sessionStorage for now, same local-fallback pattern
   Journal already uses (loadEntriesLocal/saveEntryLocal in
   backpack.js). Real per-traveler storage (a Supabase table,
   matching how Journal/Idea persist) is a follow-up once that
   table exists -- flagged here rather than silently assumed.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  var COLUMNS = [
    {key:'do',      label:'Do'},
    {key:'doing',   label:'Doing'},
    {key:'done',    label:'Done'},
    {key:'hangups', label:'Hang-Ups'}
  ];

  var REVIEWERS = ['Larry']; // stand-in list until the real roster exists
  var PRIORITY_BASE = ['H','M','L'];
  // Rank: lower number sorts higher (H-side), matching the old scale's
  // convention. HHH is the most urgent thing on the board; LLL is the
  // least -- further from the center than plain H/L in both directions.
  var PRI_ORDER = {HHH:0, HH:1, H:2, M:3, L:4, LL:5, LLL:6};
  var PRI_COLOR = {HHH:'#7a0000', HH:'#c0272a', H:'#e0776a', M:'#3F8F3F', L:'#e0c22e', LL:'#eeddaa', LLL:'#f8f2df'};
  var PRI_TEXT = {HHH:'#fff', HH:'#fff', H:'#3B2510', M:'#fff', L:'#3B2510', LL:'#3B2510', LLL:'#3B2510'};
  // Click cycle per base letter -- each click on a button walks its own
  // sequence, wrapping to '' (cleared) at the end. Clicking a DIFFERENT
  // base letter always starts that one fresh at intensity 1, regardless
  // of what was selected before.
  var PRI_CYCLE = { H:['H','HH','HHH',''], M:['M',''], L:['L','LL','LLL',''] };
  function _bbNextPriority(current, base){
    var seq=PRI_CYCLE[base];
    var idx=seq.indexOf(current);
    return idx===-1 ? seq[0] : seq[(idx+1)%seq.length];
  }

  var THEMES = [
    {key:'gold',   label:'Gold',   bg:'#FDF6E8', accent:'#C9A87C', ink:'#3B2510', sub:'#7A5C3A'},
    {key:'forest', label:'Forest', bg:'#EFF5EC', accent:'#8FBE8A', ink:'#1F3A1A', sub:'#3F6B3A'},
    {key:'ocean',  label:'Ocean',  bg:'#EAF3FB', accent:'#6FA8D9', ink:'#16324A', sub:'#3A6485'},
    {key:'rose',   label:'Rose',   bg:'#FBEFF2', accent:'#D98FA8', ink:'#4A1F2E', sub:'#7A4054'}
  ];
  var FONTS = [
    {key:'classic', label:'Classic', head:'"Playfair Display",serif', body:'Georgia,serif'},
    {key:'clean',   label:'Clean',   head:'"Segoe UI",Helvetica,Arial,sans-serif', body:'"Segoe UI",Helvetica,Arial,sans-serif'}
  ];

  // Custom Keys, July 21, 2026 -- replaces the old one-per-board Signal.
  // A board-wide library of up to 6 traveler-defined keys (shape + color
  // + meaning), built from a fixed set of 6 shapes and 6 curated colors
  // so any two library entries stay visually distinct at card-face size.
  // Each card carries up to 3 of them (c.keys, an array of library ids)
  // -- see Larry's July 21 design chat for the 6/6/6/3 reasoning.
  var SIGNAL_SHAPES = ['circle','square','triangle','diamond','star','heart'];
  var KEY_COLORS = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var MAX_KEY_LIBRARY = 6;
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
    if(_bbCurrentBoardId) return _bbKeyLibCache;
    try{
      var r=sessionStorage.getItem('bbKeyLibrary');
      return r?JSON.parse(r):[];
    }catch(e){ return []; }
  }
  function _bbLoadKeyLibraryLegacy(){
    try{ var r=sessionStorage.getItem('bbKeyLibrary'); return r?JSON.parse(r):[]; }catch(e){ return []; }
  }
  function _bbSaveKeyLibrary(lib){
    if(_bbCurrentBoardId) _bbKeyLibCache = lib;
    try{ sessionStorage.setItem('bbKeyLibrary', JSON.stringify(lib)); }catch(e){}
    _bbSyncKeysToSupabase(lib);
  }

  var TRASH_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

  var _bbCards = null;
  var _bbOpenCardId = null;
  var _bbTrashPendingId = null;

  // Supabase-backed multi-board state, added July 21, 2026 (evening).
  var _bbCurrentBoardId = null;
  var _bbBoards = [];
  var _bbKeyLibCache = [];
  var _bbInitStarted = false;

  function _bbUUID(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  }

  function _bbToday(){
    var d=new Date();
    return (d.getMonth()+1)+'/'+d.getDate();
  }

  function _bbLoadLocal(){
    try{ var r=sessionStorage.getItem('bbCards'); return r?JSON.parse(r):null; }
    catch(e){ return null; }
  }
  function _bbSaveLocal(cards){
    _bbCards = cards;
    try{ sessionStorage.setItem('bbCards', JSON.stringify(cards)); }catch(e){}
    _bbSyncCardsToSupabase(cards);
  }
  function _bbSeed(){
    return [
      {id:_bbUUID(), col:'do', assigned:_bbToday(), task:'Drag this card to Doing when you start it', person:_bbCurrentBoardDefaultAssignee(), due:'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false, reviewedBy:REVIEWERS[0], archived:false}
    ];
  }
  function _bbCardsList(){
    if(!_bbCards){ _bbCards = _bbLoadLocal() || _bbSeed(); }
    return _bbCards;
  }

  function _bbCurrentBoardDefaultAssignee(){
    var b=_bbBoards.filter(function(x){ return x.id===_bbCurrentBoardId; })[0];
    return (b && b.default_assignee) || '';
  }

  // ---- Supabase persistence, added July 21, 2026 (evening) -- boards,
  // cards and the key library now live in real per-traveler Supabase
  // tables (briefing_boards / briefing_cards / briefing_board_keys)
  // instead of only sessionStorage. Every existing mutation in this
  // file still just calls _bbSaveLocal/_bbSaveKeyLibrary exactly as
  // before -- those two now ALSO push to Supabase in the background
  // (fire-and-forget) whenever a Supabase board is active, so nothing
  // else in this file had to change. If Supabase is unreachable, or
  // nobody's signed in, the board quietly keeps working exactly as it
  // always did, straight off sessionStorage.

  function _bbToISODate(mdStr){
    var d=_bbParseDue(mdStr);
    if(!d) return null;
    var mm=String(d.getMonth()+1); if(mm.length<2) mm='0'+mm;
    var dd=String(d.getDate()); if(dd.length<2) dd='0'+dd;
    return d.getFullYear()+'-'+mm+'-'+dd;
  }
  function _bbFromISODate(iso){
    if(!iso) return '';
    var parts=String(iso).split('-');
    if(parts.length!==3) return '';
    return parseInt(parts[1],10)+'/'+parseInt(parts[2],10);
  }
  function _bbMDFromTimestamp(ts){
    if(!ts) return _bbToday();
    var d=new Date(ts);
    if(isNaN(d.getTime())) return _bbToday();
    return (d.getMonth()+1)+'/'+d.getDate();
  }

  function _bbCardToRow(c, boardId){
    var keys=c.keys||[];
    return {
      id: c.id, board_id: boardId, col: c.col,
      task: c.task||'', person: c.person||null, reviewed_by: c.reviewedBy||null,
      due_date: _bbToISODate(c.due), start_date: _bbToISODate(c.startDate), completed_date: _bbToISODate(c.completedDate),
      budget: c.budget||null, priority: c.priority||'',
      verified: !!c.verified, pro: !!c.pro, grow: !!c.grow, grow_note: c.growNote||null,
      archived: !!c.archived,
      key_slot_1: keys[0]||null, key_slot_2: keys[1]||null, key_slot_3: keys[2]||null
    };
  }
  function _bbRowToCard(row){
    return {
      id: row.id, col: row.col, assigned: _bbMDFromTimestamp(row.created_at),
      task: row.task||'', person: row.person||'', due: _bbFromISODate(row.due_date),
      startDate: _bbFromISODate(row.start_date), completedDate: _bbFromISODate(row.completed_date),
      budget: row.budget||'', keys: [row.key_slot_1||null, row.key_slot_2||null, row.key_slot_3||null],
      priority: row.priority||'', verified: !!row.verified, pro: !!row.pro, grow: !!row.grow,
      growNote: row.grow_note||'', reviewedBy: row.reviewed_by||REVIEWERS[0], archived: !!row.archived
    };
  }
  function _bbSafeIdList(rows){
    return rows.map(function(r){ return String(r.id).replace(/[^a-zA-Z0-9-]/g,''); });
  }

  async function _bbSyncCardsToSupabase(cards){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var rows=cards.map(function(c){ return _bbCardToRow(c, _bbCurrentBoardId); });
      if(rows.length){
        var res=await sb.from('briefing_cards').upsert(rows);
        if(res.error) throw res.error;
        await sb.from('briefing_cards').delete().eq('board_id', _bbCurrentBoardId).not('id','in','('+_bbSafeIdList(rows).join(',')+')');
      } else {
        await sb.from('briefing_cards').delete().eq('board_id', _bbCurrentBoardId);
      }
    }catch(e){ console.error('Briefing Board: Supabase card sync failed', e); }
  }

  async function _bbSyncKeysToSupabase(lib){
    if(!_bbCurrentBoardId) return;
    var sb=T().sb; if(!sb) return;
    try{
      var rows=lib.map(function(k){ return {id:k.id, board_id:_bbCurrentBoardId, shape:k.shape, color:k.color, meaning:k.meaning||''}; });
      if(rows.length){
        var res=await sb.from('briefing_board_keys').upsert(rows);
        if(res.error) throw res.error;
        await sb.from('briefing_board_keys').delete().eq('board_id', _bbCurrentBoardId).not('id','in','('+_bbSafeIdList(rows).join(',')+')');
      } else {
        await sb.from('briefing_board_keys').delete().eq('board_id', _bbCurrentBoardId);
      }
    }catch(e){ console.error('Briefing Board: Supabase key sync failed', e); }
  }

  async function _bbCurrentUserId(){
    var sb=T().sb; if(!sb) return null;
    try{ var u=await sb.auth.getUser(); return (u&&u.data&&u.data.user)?u.data.user.id:null; }
    catch(e){ return null; }
  }

  async function _bbSwitchToBoard(boardId){
    _bbCurrentBoardId=boardId;
    try{ sessionStorage.setItem('bbCurrentBoardId', boardId); }catch(e){}
    var board=_bbBoards.filter(function(b){ return b.id===boardId; })[0];
    var sb=T().sb;
    var cardRows=[], keyRows=[];
    try{
      var cRes=await sb.from('briefing_cards').select('*').eq('board_id',boardId).order('created_at',{ascending:true});
      if(!cRes.error) cardRows=cRes.data||[];
      var kRes=await sb.from('briefing_board_keys').select('*').eq('board_id',boardId).order('created_at',{ascending:true});
      if(!kRes.error) keyRows=kRes.data||[];
    }catch(e){ console.error('Briefing Board: could not load board data', e); }

    // One-time migration, July 21, 2026 (evening): the first time Field
    // Guide BB is opened empty after named multi-board storage shipped,
    // copy in whatever was still sitting in the old single-board
    // sessionStorage version so nothing Larry already entered is lost.
    if(cardRows.length===0 && board && /field guide/i.test(board.name||'')){
      var already=false;
      try{ already = sessionStorage.getItem('bbMigratedLegacy')==='1'; }catch(e){}
      var legacyCards=_bbLoadLocal();
      if(!already && legacyCards && legacyCards.length){
        try{
          var legacyKeys=_bbLoadKeyLibraryLegacy();
          var keyIdMap={};
          var remappedKeys=legacyKeys.map(function(k){
            var newId=_bbUUID(); keyIdMap[k.id]=newId;
            return {id:newId, shape:k.shape, color:k.color, meaning:k.meaning||''};
          });
          var remappedCards=legacyCards.map(function(c){
            return Object.assign({}, c, {
              id:_bbUUID(),
              keys:(c.keys||[]).map(function(kid){ return kid?(keyIdMap[kid]||null):null; })
            });
          });
          if(remappedKeys.length) await sb.from('briefing_board_keys').upsert(remappedKeys.map(function(k){ return {id:k.id, board_id:boardId, shape:k.shape, color:k.color, meaning:k.meaning}; }));
          if(remappedCards.length) await sb.from('briefing_cards').upsert(remappedCards.map(function(c){ return _bbCardToRow(c, boardId); }));
          try{ sessionStorage.setItem('bbMigratedLegacy','1'); }catch(e2){}
          _bbCards=remappedCards;
          _bbKeyLibCache=remappedKeys;
          _bbRenderBoardPicker();
          renderBoard();
          return;
        }catch(e){ console.error('Briefing Board: legacy migration failed', e); }
      }
    }

    _bbCards = cardRows.length ? cardRows.map(_bbRowToCard) : _bbSeed();
    _bbKeyLibCache = keyRows.map(function(r){ return {id:r.id, shape:r.shape, color:r.color, meaning:r.meaning}; });
    _bbRenderBoardPicker();
    renderBoard();
  }

  async function _bbInitBoardsAndData(){
    var uid=await _bbCurrentUserId();
    if(!uid){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); return; }
    var sb=T().sb;
    try{
      var res=await sb.from('briefing_boards').select('*').eq('user_id',uid).order('created_at',{ascending:true});
      if(res.error) throw res.error;
      _bbBoards=res.data||[];
    }catch(e){
      console.error('Briefing Board: could not load boards, staying local', e);
      _bbCurrentBoardId=null; _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard();
      return;
    }
    if(!_bbBoards.length){
      try{
        var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:'personal', name:'My Board'}).select().single();
        if(!ins.error && ins.data) _bbBoards=[ins.data];
      }catch(e){}
    }
    if(!_bbBoards.length){ _bbCards=_bbLoadLocal()||_bbSeed(); renderBoard(); return; }
    var remembered=null;
    try{ remembered=sessionStorage.getItem('bbCurrentBoardId'); }catch(e){}
    var match=_bbBoards.filter(function(b){ return b.id===remembered; })[0];
    var fallback=_bbBoards.filter(function(b){ return /field guide/i.test(b.name||''); })[0] || _bbBoards[0];
    await _bbSwitchToBoard((match||fallback).id);
  }

  function _bbRenderBoardPicker(){
    var sel=document.getElementById('bb-board-picker'); if(!sel) return;
    var opts=_bbBoards.map(function(b){
      return '<option value="'+_esc(b.id)+'"'+(b.id===_bbCurrentBoardId?' selected':'')+'>'+_esc(b.name||'Untitled Board')+'</option>';
    }).join('');
    sel.innerHTML = opts + '<option value="__add__">+ Add a board&hellip;</option>';
  }

  function wireBoardPicker(){
    var sel=document.getElementById('bb-board-picker'); if(!sel) return;
    sel.addEventListener('change', async function(){
      if(sel.value==='__add__'){
        var name=window.prompt('Name for the new board:');
        _bbRenderBoardPicker();
        if(!name || !name.trim()) return;
        var uid=await _bbCurrentUserId(); if(!uid) return;
        var sb=T().sb;
        try{
          var ins=await sb.from('briefing_boards').insert({user_id:uid, board_type:'personal', name:name.trim()}).select().single();
          if(ins.error || !ins.data) return;
          _bbBoards.push(ins.data);
          await _bbSwitchToBoard(ins.data.id);
        }catch(e){ console.error('Briefing Board: could not create board', e); }
        return;
      }
      await _bbSwitchToBoard(sel.value);
    });
  }

  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
  }

  // Initials for the card-face badge, July 21, 2026 (evening) -- Assigned
  // To is a free-text stand-in field (e.g. "Doc (Larry E. Smithers)"),
  // so the full name never fit in the small round badge. If the text
  // has a parenthetical, that's treated as the real name to derive
  // initials from (favoring "LS" over "D" for "Doc (Larry E. Smithers)");
  // otherwise the initials come from the string as typed. First + last
  // word, matching the same two-letter convention already used for the
  // traveler roster (BF, JG, RB, LM, JB, LS).
  function _bbInitials(person){
    if(!person) return '';
    var m=String(person).match(/\(([^)]+)\)/);
    var src=(m?m[1]:person).trim();
    var letters=src.split(/\s+/).map(function(w){ return w.replace(/[^A-Za-z]/g,''); }).filter(function(w){ return w.length>0; });
    if(!letters.length) return '';
    if(letters.length===1) return letters[0].charAt(0).toUpperCase();
    return (letters[0].charAt(0)+letters[letters.length-1].charAt(0)).toUpperCase();
  }

  // Due date parsing: the field is free text like "7/25" (no year).
  // Assume the current year; if that reading would already be more than
  // ~half a year in the past, it almost certainly means next year (e.g.
  // typing "1/5" in December) rather than last January.
  function _bbParseDue(s){
    if(!s) return null;
    var m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if(!m) return null;
    var mo=parseInt(m[1],10)-1, da=parseInt(m[2],10);
    var now=new Date();
    var yr=m[3] ? (m[3].length===2?2000+parseInt(m[3],10):parseInt(m[3],10)) : now.getFullYear();
    var d=new Date(yr, mo, da);
    if(isNaN(d.getTime())) return null;
    if(!m[3]){
      var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if(d-today < -182*86400000) d=new Date(yr+1, mo, da);
    }
    return d;
  }
  function _bbDaysUntil(d){
    var now=new Date();
    var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((d-today)/86400000);
  }
  function _bbDaysUntilOrInf(c){
    var d=_bbParseDue(c.due);
    return d ? _bbDaysUntil(d) : Infinity;
  }

  // Larry, July 20, 2026: anything WITH a priority outranks anything
  // without one (unset already sorts last, rank 5, below L's 4). On top
  // of that, a near or passed due date pulls a card's effective rank up
  // for sorting purposes -- it might carry an L, but a due date due
  // today (or overdue) says otherwise. This only ever moves a card UP
  // (toward H), never down -- a due date can't make an H card less
  // urgent. The card still shows whatever priority was actually set;
  // this effective rank is for sort order only.
  function _priRank(c){
    var base = PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
    var rank = base;
    var daysUntil = _bbDaysUntilOrInf(c);
    if(daysUntil!==Infinity){
      if(daysUntil<=0) rank=Math.min(rank, 0);      // due today or overdue -> at least HHH
      else if(daysUntil<=2) rank=Math.min(rank, 1); // due very soon -> at least HH
      else if(daysUntil<=5) rank=Math.min(rank, 2); // due soon -> at least H
    }
    // A Start Date that's arrived (or passed) while the card is still
    // sitting in Do -- scheduled to begin, hasn't actually begun --
    // "drop everything" and escalate it too.
    if(c.col==='do'){
      var sd=_bbParseDue(c.startDate);
      if(sd && _bbDaysUntil(sd)<=0) rank=Math.min(rank, 1); // at least HH
    }
    return rank;
  }

  function _bbLoadTopic(){
    try{ return sessionStorage.getItem('bbTopic')||''; }catch(e){ return ''; }
  }
  function _bbSaveTopic(text){
    try{ sessionStorage.setItem('bbTopic', text); }catch(e){}
  }

  function _bbApplyTheme(themeKey){
    var t=THEMES.filter(function(x){ return x.key===themeKey; })[0]; if(!t) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-bg', t.bg);
    fgr.style.setProperty('--bb-accent', t.accent);
    fgr.style.setProperty('--bb-ink', t.ink);
    fgr.style.setProperty('--bb-sub', t.sub);
    try{ sessionStorage.setItem('bbTheme', themeKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbApplyFont(fontKey){
    var f=FONTS.filter(function(x){ return x.key===fontKey; })[0]; if(!f) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-head-font', f.head);
    fgr.style.setProperty('--bb-body-font', f.body);
    try{ sessionStorage.setItem('bbFont', fontKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbCurrentTheme(){
    try{ return sessionStorage.getItem('bbTheme')||'gold'; }catch(e){ return 'gold'; }
  }
  function _bbCurrentFont(){
    try{ return sessionStorage.getItem('bbFont')||'classic'; }catch(e){ return 'classic'; }
  }
  function _bbHighlightAppearance(){
    var curTheme=_bbCurrentTheme(), curFont=_bbCurrentFont();
    document.querySelectorAll('.bb-theme-swatch').forEach(function(el){
      el.classList.toggle('bb-swatch-active', el.getAttribute('data-theme')===curTheme);
    });
    document.querySelectorAll('.bb-font-btn').forEach(function(el){
      el.classList.toggle('bb-flag-active', el.getAttribute('data-font')===curFont);
    });
  }

  // Drag-by-header, July 20, 2026 -- Larry: New Card and Back of the
  // Card should be movable "for visual convenience" (so the board
  // underneath can be peeked at while one is open). Starts centered
  // (the existing flex-centered default) every time it opens; only
  // switches to an explicit fixed position once the traveler actually
  // grabs the header bar and drags. Position resets on next open.
  function _bbResetCardPosition(cardEl){
    if(!cardEl) return;
    cardEl.style.position=''; cardEl.style.left=''; cardEl.style.top=''; cardEl.style.margin='';
  }
  function _bbMakeDraggable(cardEl, headEl){
    if(!cardEl || !headEl) return;
    var dragging=false, startX=0, startY=0, startLeft=0, startTop=0;
    function onDown(e){
      if(e.target.closest('.bb-close')) return; // the X still just closes
      var pt = e.touches ? e.touches[0] : e;
      var rect=cardEl.getBoundingClientRect();
      dragging=true;
      startX=pt.clientX; startY=pt.clientY;
      startLeft=rect.left; startTop=rect.top;
      cardEl.style.position='fixed';
      cardEl.style.margin='0';
      cardEl.style.left=startLeft+'px';
      cardEl.style.top=startTop+'px';
      headEl.style.cursor='grabbing';
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      cardEl.style.left=(startLeft+(pt.clientX-startX))+'px';
      cardEl.style.top=(startTop+(pt.clientY-startY))+'px';
      e.preventDefault();
    }
    function onUp(){ dragging=false; headEl.style.cursor='grab'; }
    headEl.style.cursor='grab';
    headEl.addEventListener('mousedown', onDown);
    headEl.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('mousemove', onMove, {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function injectBriefingBoardStyles(){
    if(document.getElementById('bb-style')) return;
    var style=document.createElement('style');
    style.id='bb-style';
    style.textContent=
       '#fg-root{--bb-bg:#FDF6E8;--bb-accent:#C9A87C;--bb-ink:#3B2510;--bb-sub:#7A5C3A;--bb-head-font:"Playfair Display",serif;--bb-body-font:Georgia,serif}'
      +'#s-briefing-board{position:relative}'
      +'#fg-root.isx-full #s-briefing-board.active{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:column}'
      /* Header, July 20 2026 -- Topic folded into the SAME row as the
         title (a rounded pill, still always plain white so it stands
         out against whichever theme background is active) instead of
         its own bar above it, per Larry: don't spend a whole extra row
         of vertical board space on it. Gear + X ride along on the
         right of that same row. */
      +'.bb-mhead{background:var(--bb-bg);border-bottom:3px solid var(--bb-accent);padding:10px 20px 8px;flex-shrink:0}'
      +'.bb-mhead-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
      +'.bb-mh-group{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
      +'.bb-mh{color:var(--bb-ink);font-size:20px;font-weight:700;line-height:1;font-family:var(--bb-head-font)}'
      +'.bb-board-picker{background:#fff;border:1.5px solid var(--bb-accent);border-radius:999px;padding:4px 10px;font-family:var(--bb-head-font);font-size:14px;font-weight:700;color:var(--bb-ink);cursor:pointer;outline:none;max-width:160px}'
      +'.bb-mhead-actions{display:flex;gap:8px;flex-shrink:0}'
      +'.bb-icon-btn{width:30px;height:30px;border-radius:6px;background:#fff;border:1.5px solid var(--bb-accent);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;color:var(--bb-ink);padding:0}'
      +'.bb-icon-btn:hover{background:var(--bb-bg)}'
      +'.bb-mt{color:var(--bb-sub);font-size:13px;font-style:italic;padding-top:4px}'
      +'#bb-board-wrap{flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 16px;background:var(--bb-bg);display:flex}'
      +'#bb-cols{display:flex;gap:14px;height:100%}'
      +'.bb-col{flex-shrink:0;width:190px;display:flex;flex-direction:column;background:rgba(201,168,124,0.14);border:1px solid var(--bb-accent);border-radius:8px;padding:8px}'
      +'.bb-col-head{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-bg);background:var(--bb-ink);border-radius:4px;text-align:center;padding:7px 4px;margin-bottom:4px}'
      +'.bb-col[data-col="hangups"] .bb-col-head{background:#a3372b;color:#fff}'
      +'.bb-col-cards{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:60px}'
      +'.bb-col-cards.bb-dragover{outline:2px dashed var(--bb-accent);outline-offset:2px}'
      +'.bb-card{position:relative;background:#FFFDF7;border:1px solid var(--bb-accent);border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:12px;line-height:1.3;cursor:grab;font-family:var(--bb-body-font)}'
      +'.bb-card .bb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}'
      +'.bb-card .bb-top-left{display:flex;align-items:center;gap:4px}'
      +'.bb-pri-badge{font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;line-height:1.4}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:13px;color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--bb-body-font);flex-shrink:0}'
      +'.bb-card .bb-task{color:var(--bb-ink);margin:2px 0 5px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:12px;color:var(--bb-sub);min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-done-date{font-family:"Caveat",cursive;font-size:12px;color:#3F6B3A;text-align:right;margin-top:1px}'
      +'.bb-key-badges{position:absolute;bottom:2px;left:4px;display:flex;gap:3px;pointer-events:none}'
      +'.bb-key-badge{width:12px;height:12px;box-shadow:0 1px 2px rgba(0,0,0,.3)}'
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed var(--bb-accent);border-radius:3px;text-align:center;padding:8px;font-size:12px;color:var(--bb-sub);cursor:pointer;font-family:var(--bb-body-font)}'
      +'.bb-add-tile:hover{background:rgba(201,168,124,0.2)}'
      /* Fixed Trash can, July 20, 2026 -- same "small round drop target,
         bottom-right" convention as 9711's isx-trash-fixed. Anchored to
         #s-briefing-board itself (not #bb-board-wrap, which scrolls
         horizontally on narrow screens) so it never drifts off with the
         columns. */
      +'.bb-trash{position:absolute;right:16px;bottom:16px;width:44px;height:44px;border-radius:50%;background:#FFFDF7;border:2px solid var(--bb-ink);box-shadow:0 2px 6px rgba(59,37,16,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:80}'
      +'.bb-trash.bb-trash-dropready{outline:2px solid #a3372b;outline-offset:2px}'
      +'.bbw{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box}'
      +'#bb-detail-overlay .bbw{align-items:flex-start}'
      +'.bb-field{width:100%;max-width:280px;margin-bottom:12px;text-align:left}'
      +'.bb-field label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--bb-sub);margin-bottom:3px}'
      +'.bb-inline-field{display:flex;align-items:baseline;justify-content:flex-start;gap:6px;white-space:nowrap}'
      +'.bb-inline-field label{display:inline;margin:0}'
      +'.bb-inline-field span{font-family:"Caveat",cursive;font-size:16px;color:var(--bb-sub)}'
      +'.bb-field input,.bb-field textarea,.bb-field select{width:100%;font-family:var(--bb-body-font);font-size:14px;border:1.5px solid var(--bb-accent);border-radius:4px;padding:7px 8px;background:#fff;color:var(--bb-ink);box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:16px;resize:vertical}'
      +'.bb-flags,.bb-priorities,.bb-swatches{display:flex;gap:4px}'
      +'.bb-flag-btn,.bb-pri-btn,.bb-font-btn,.bb-shape-btn{flex:1;font-size:11px;padding:6px 2px;border-radius:4px;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;color:var(--bb-sub);font-family:var(--bb-body-font);display:flex;align-items:center;justify-content:center}'
      +'.bb-shape-btn.bb-shape-active{background:var(--bb-bg);border-color:var(--bb-ink)}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}'
      +'#bb-d-verify.bb-flag-active{background:#3F6B3A;border-color:#3F6B3A}'
      +'#bb-d-pro.bb-flag-active{background:#c9a230;border-color:#c9a230}'
      +'#bb-d-grow.bb-flag-active{background:#4a7a95;border-color:#4a7a95}'
      +'.bb-font-btn.bb-flag-active{background:var(--bb-ink);color:#fff;border-color:var(--bb-ink)}'
      +'.bb-theme-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.15)}'
      +'.bb-theme-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-start}'
      +'.bb-key-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bb-accent);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      +'.bb-key-add{font-size:16px;color:var(--bb-sub);border-style:dashed}'
      +'.bb-key-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
      +'.bb-key-swatch.bb-swatch-active{border-color:#3B2510}'
      +'.bb-key-pick-row{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:1px solid var(--bb-accent);border-radius:6px;background:#fff;cursor:pointer;margin-bottom:6px;font-family:var(--bb-body-font);font-size:13px;color:var(--bb-ink);text-align:left}'
      +'.bb-key-pick-swatch{width:16px;height:16px;flex-shrink:0}'
      +'.bb-key-pick-disabled{opacity:.35;pointer-events:none}'
      +'.bb-key-pick-empty-msg{font-size:12px;color:var(--bb-sub);font-style:italic;text-align:center;padding:6px 0}'
      /* Overlay chrome for Add a Card (9360) / the Briefing Card (9370) /
         Board Settings, July 20, 2026 -- same "fixed, dimmed backdrop,
         click-outside-closes" pattern as idea-storyboard-9710.js's
         .sb-overlay. Lives at #fg-root level (see
         injectBriefingBoardScreens), not inside #s-briefing-board, for
         the same reason 9710's overlays live at fg-root: a display:none
         ancestor (the board when it's not the active screen) would hide
         a position:fixed child too. Card is pinned to 340px -- just past
         the 280px field frame -- and tall rather than wide, scrolling
         internally if content runs long. */
      +'.bb-overlay{position:fixed;inset:0;z-index:200;background:rgba(59,37,16,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
      +'.bb-overlay.active{display:flex}'
      +'.bb-overlay-card{width:340px;max-width:90vw;max-height:min(640px,90vh);overflow-y:auto;background:#FFFDF7;border-radius:8px;border-top:6px solid var(--bb-accent);box-shadow:0 10px 30px rgba(59,37,16,0.35);box-sizing:border-box;padding:18px 22px 22px}'
      +'.bb-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;cursor:grab;user-select:none}'
      +'.bb-overlay-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--bb-sub)}'
      +'.bb-close{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid var(--bb-accent);cursor:pointer;font-size:13px;color:var(--bb-ink)}'
      +'.bb-close:hover{background:var(--bb-bg)}';
    document.head.appendChild(style);
  }

  function injectBriefingBoardScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-briefing-board')) return;
    injectBriefingBoardStyles();

    var div=document.createElement('div');
    div.innerHTML=
       '<div class="sc" id="s-briefing-board">'
        +'<div class="bb-mhead">'
          +'<div class="bb-mhead-top">'
            +'<div class="bb-mh-group"><span class="bb-mh">Briefing Board</span><select id="bb-board-picker" class="bb-board-picker" title="Switch boards"></select></div>'
            +'<div class="bb-mhead-actions">'
              +'<button class="bb-icon-btn" id="b-bb-mg" title="Jump to menu">🔍</button>'
              +'<button class="bb-icon-btn" id="bb-gear" title="Colors &amp; fonts">⚙️</button>'
              +'<button class="bb-icon-btn" id="bb-close-x" title="Close">✕</button>'
            +'</div>'
          +'</div>'
          +'<div class="bb-mt">A control and communication tool.</div>'
        +'</div>'
        +'<div id="bb-board-wrap"><div id="bb-cols"></div></div>'
        +'<div class="bb-trash" id="bb-trash" title="Trash">'+TRASH_SVG+'</div>'
      +'</div>';
    while(div.firstChild) fg.appendChild(div.firstChild);

    // Add a Card (9360), the Briefing Card (9370), the Trash confirm, and
    // Board Settings -- all overlays, living as direct children of
    // #fg-root so they render regardless of whether #s-briefing-board
    // happens to be the active .sc screen.
    if(!document.getElementById('bb-add-overlay')){
      var addOv=document.createElement('div');
      addOv.id='bb-add-overlay'; addOv.className='bb-overlay';
      addOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Card</span><button class="bb-close" id="bb-add-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-new-task" placeholder="What needs to be done?"></textarea></div>'
            +'<div class="bb-field"><label>Due date &mdash; only if it’s real</label><input id="bb-new-due" type="text" placeholder="e.g. 7/25"></div>'
            +'<button class="jb" id="b-bb-save-card">Pin it to the board</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(addOv);
      addOv.addEventListener('click', function(e){ if(e.target===addOv) closeAddCard(); });
      _bbMakeDraggable(addOv.querySelector('.bb-overlay-card'), addOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-detail-overlay')){
      var detailOv=document.createElement('div');
      detailOv.id='bb-detail-overlay'; detailOv.className='bb-overlay';
      detailOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Briefing Card</span><button class="bb-close" id="bb-detail-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field bb-inline-field"><label>Date Added</label><span id="bb-d-added">&mdash;</span></div>'
            +'<div class="bb-field"><label>Priority</label><div class="bb-priorities">'
              +PRIORITY_BASE.map(function(p){ return '<button class="bb-pri-btn" data-pri-base="'+p+'">'+p+'</button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Custom Keys</label><div class="bb-key-row" id="bb-d-key-row"></div></div>'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-d-task"></textarea></div>'
            +'<div class="bb-field"><label>Assigned to</label><input id="bb-d-person" type="text"></div>'
            +'<div class="bb-field"><label>Due date</label><input id="bb-d-due" type="text"></div>'
            +'<div class="bb-field"><label>Start date</label><input id="bb-d-start" type="text" placeholder="e.g. 7/22"></div>'
            +'<div class="bb-field"><label>Budget &mdash; time or dollars</label><input id="bb-d-budget" type="text"></div>'
            +'<div class="bb-field"><label>Reviewed by</label><select id="bb-d-reviewer">'+REVIEWERS.map(function(n){ return '<option value="'+n+'">'+n+'</option>'; }).join('')+'</select></div>'
            +'<div class="bb-field"><div class="bb-flags"><button class="bb-flag-btn" id="bb-d-pro">&#11088; PRO</button></div></div>'
            +'<div class="bb-field"><div class="bb-flags"><button class="bb-flag-btn" id="bb-d-grow">&#127793; GROW</button></div></div>'
            +'<div class="bb-field" id="bb-d-grow-note-wrap" style="display:none"><label>GROW comment &mdash; required</label><textarea id="bb-d-grow-note" placeholder="What would make this even better next time?"></textarea></div>'
            +'<div class="bb-field"><div class="bb-flags"><button class="bb-flag-btn" id="bb-d-verify">&#10003; Verified complete</button></div></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(detailOv);
      detailOv.addEventListener('click', function(e){ if(e.target===detailOv) closeCardDetail(); });
      _bbMakeDraggable(detailOv.querySelector('.bb-overlay-card'), detailOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-trash-overlay')){
      var trashOv=document.createElement('div');
      trashOv.id='bb-trash-overlay'; trashOv.className='bb-overlay';
      trashOv.innerHTML=
         '<div class="bb-overlay-card" style="width:280px;text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:18px;font-weight:700;color:#3B2510;margin-bottom:6px">Moose poop?</div>'
          +'<div style="font-size:12px;color:#7A5C3A;font-style:italic;margin-bottom:14px">Off the board for good &mdash; this isn’t the same as Done.</div>'
          +'<div style="display:flex;gap:8px">'
            +'<button class="bb-flag-btn" id="bb-trash-yes" style="background:#a3372b;color:#fff;border-color:#a3372b">Yes</button>'
            +'<button class="bb-flag-btn" id="bb-trash-no">Keep it</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(trashOv);
      trashOv.addEventListener('click', function(e){ if(e.target===trashOv) closeTrashConfirm(); });
    }
    if(!document.getElementById('bb-settings-overlay')){
      var setOv=document.createElement('div');
      setOv.id='bb-settings-overlay'; setOv.className='bb-overlay';
      setOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Board Settings</span><button class="bb-close" id="bb-settings-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Color theme</label><div class="bb-swatches">'
              +THEMES.map(function(t){ return '<button class="bb-theme-swatch" data-theme="'+t.key+'" title="'+t.label+'" style="background:'+t.bg+';border-color:'+t.accent+'"></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Font</label><div class="bb-flags">'
              +FONTS.map(function(f){ return '<button class="bb-font-btn" data-font="'+f.key+'">'+f.label+'</button>'; }).join('')
            +'</div></div>'
          +'</div>'
        +'</div>';
      fg.appendChild(setOv);
      setOv.addEventListener('click', function(e){ if(e.target===setOv) closeSettings(); });
    }
    if(!document.getElementById('bb-keybuilder-overlay')){
      var kbOv=document.createElement('div');
      kbOv.id='bb-keybuilder-overlay'; kbOv.className='bb-overlay';
      kbOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Key</span><button class="bb-close" id="bb-keybuilder-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Shape</label><div class="bb-flags">'
              +SIGNAL_SHAPES.map(function(s){ return '<button class="bb-shape-btn" data-shape="'+s+'" title="'+s+'"><span style="display:inline-block;width:18px;height:18px;'+_bbShapeCSS(s,'#3B2510')+'"></span></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Color</label><div class="bb-swatches">'
              +KEY_COLORS.map(function(col){ return '<button class="bb-key-swatch" data-color="'+col+'" style="background:'+col+'"></button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Meaning</label><input type="text" id="bb-keybuilder-meaning" placeholder="What does this key mean?"></div>'
            +'<button class="bb-flag-btn" id="bb-keybuilder-save" style="width:100%">Save</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(kbOv);
      kbOv.addEventListener('click', function(e){ if(e.target===kbOv) closeKeyBuilder(); });
      _bbMakeDraggable(kbOv.querySelector('.bb-overlay-card'), kbOv.querySelector('.bb-overlay-head'));
    }
    if(!document.getElementById('bb-keypicker-overlay')){
      var kpOv=document.createElement('div');
      kpOv.id='bb-keypicker-overlay'; kpOv.className='bb-overlay';
      kpOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Choose a Key</span><button class="bb-close" id="bb-keypicker-close" aria-label="Close">\u2715</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field" id="bb-keypicker-list"></div>'
            +'<button class="bb-flag-btn" id="bb-keypicker-remove" style="width:100%;margin-bottom:8px">Remove this key</button>'
            +'<button class="bb-flag-btn" id="bb-keypicker-new" style="width:100%">Build a new key</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(kpOv);
      kpOv.addEventListener('click', function(e){ if(e.target===kpOv) closeKeyPicker(); });
      _bbMakeDraggable(kpOv.querySelector('.bb-overlay-card'), kpOv.querySelector('.bb-overlay-head'));
    }

    T().registerPageNum('s-briefing-board', '9350');
    T().registerUtilScreen('s-briefing-board');
    T().registerCtx('s-briefing-board', 'Briefing Board');

    // Appearance (theme/font) restores immediately -- a personal
    // preference shared across all of a traveler's boards, independent
    // of which board is active or whether Supabase is reachable.
    _bbApplyTheme(_bbCurrentTheme());
    _bbApplyFont(_bbCurrentFont());

    T().registerScreenActivate('s-briefing-board', function(){
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.add('isx-full');
      if(!_bbInitStarted){
        _bbInitStarted=true;
        _bbInitBoardsAndData();
      } else {
        renderBoard();
      }
    });

    wireBriefingBoard();
  }

  function renderBoard(){
    var wrap=document.getElementById('bb-cols'); if(!wrap) return;
    wrap.innerHTML='';
    var _keyLib=_bbLoadKeyLibrary();
    var cards=_bbCardsList().filter(function(c){ return !c.archived; });
    COLUMNS.forEach(function(cd){
      var col=document.createElement('div');
      col.className='bb-col';
      col.setAttribute('data-col', cd.key);
      col.innerHTML='<div class="bb-col-head">'+cd.label+'</div>'
        +'<div class="bb-col-cards" data-col="'+cd.key+'"></div>'
        +(cd.key==='do' ? '<div class="bb-add-tile" id="bb-add-tile">+ new card</div>' : '');
      wrap.appendChild(col);
    });
    // Each column sorts by priority -- H at the top, unset priority (not
    // yet triaged) at the bottom -- ties keep their existing relative
    // order (stable sort), same order the cards already landed in.
    COLUMNS.forEach(function(cd){
      var target=wrap.querySelector('.bb-col-cards[data-col="'+cd.key+'"]');
      if(!target) return;
      var colCards=cards.filter(function(c){ return c.col===cd.key; });
      colCards.sort(function(a,b){
        var ra=_priRank(a), rb=_priRank(b);
        if(ra!==rb) return ra-rb;
        return _bbDaysUntilOrInf(a)-_bbDaysUntilOrInf(b);
      });
      colCards.forEach(function(c){
        var el=document.createElement('div');
        el.className='bb-card';
        el.draggable=true;
        el.setAttribute('data-id', c.id);
        var dotHTML = c.person ? ('<span class="bb-dot" style="background:#9c8b73" title="'+_esc(c.person)+'">'+_esc(_bbInitials(c.person))+'</span>') : '';
        var priBadge = c.priority ? '<span class="bb-pri-badge" style="background:'+PRI_COLOR[c.priority]+';color:'+PRI_TEXT[c.priority]+'">'+c.priority+'</span>' : '';
        // Larry, July 20, 2026: no date shown at all until a START DATE
        // exists (manually set in advance, or auto-stamped the moment
        // this card first moves into Doing) -- the quieter "date added
        // to the board" (c.assigned) is still recorded for later, just
        // not displayed here; not important enough to take up card-face
        // space, though it does show read-only on the back of the card.
        var startBadge = c.startDate ? '<span class="bb-date">'+_esc(c.startDate)+'</span>' : '';
        el.innerHTML='<div class="bb-top"><span class="bb-top-left">'+priBadge+startBadge+'</span>'+dotHTML+'</div>'
          +'<div class="bb-task">'+_esc(c.task)+'</div>'
          +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+(c.due?('DUE: '+_esc(c.due)):'')+'</span></div>'
          +(c.col==='done' && c.completedDate ? ('<div class="bb-done-date">COMPLETED: '+_esc(c.completedDate)+'</div>') : '')
          +((c.keys && c.keys.some(function(k){ return k; })) ? ('<div class="bb-key-badges">'+c.keys.filter(function(kid){ return kid; }).map(function(kid){
              var k=_keyLib.filter(function(x){ return x.id===kid; })[0];
              return k ? '<span class="bb-key-badge" style="'+_bbShapeCSS(k.shape,k.color)+'" title="'+_esc(k.meaning||'')+'"></span>' : '';
            }).join('')+'</div>') : '')
          +'<div class="bb-corner" data-flip="'+c.id+'" title="Flip card"></div>';
        el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
        target.appendChild(el);
      });
    });
    wrap.querySelectorAll('.bb-corner').forEach(function(el){
      el.addEventListener('click', function(e){
        e.stopPropagation();
        openCardDetail(el.getAttribute('data-flip'));
      });
    });
    wrap.querySelectorAll('.bb-col-cards').forEach(function(zone){
      zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('bb-dragover'); });
      zone.addEventListener('dragleave', function(){ zone.classList.remove('bb-dragover'); });
      zone.addEventListener('drop', function(e){
        e.preventDefault();
        zone.classList.remove('bb-dragover');
        var id=e.dataTransfer.getData('text/plain');
        var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
        if(c){
          var wasCol=c.col;
          c.col=zone.getAttribute('data-col');
          if(c.col==='doing' && wasCol==='do' && !c.startDate) c.startDate=_bbToday();
          if(c.col==='done' && wasCol!=='done') c.completedDate=_bbToday();
          if(wasCol==='done' && c.col!=='done'){ c.completedDate=''; c.verified=false; c.pro=false; c.grow=false; }
          _bbSaveLocal(_bbCardsList());
        }
        renderBoard();
      });
    });
    var addTile=document.getElementById('bb-add-tile');
    if(addTile) addTile.addEventListener('click', openAddCard);
  }

  function openAddCard(){
    var t=document.getElementById('bb-new-task'); if(t) t.value='';
    var d=document.getElementById('bb-new-due'); if(d) d.value='';
    var ov=document.getElementById('bb-add-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function closeAddCard(){
    var ov=document.getElementById('bb-add-overlay'); if(ov) ov.classList.remove('active');
  }

  function _bbHighlightPriority(priority){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      var base=btns[i].getAttribute('data-pri-base');
      var active = !!priority && priority.charAt(0)===base;
      btns[i].textContent = active ? priority : base;
      if(active){
        btns[i].style.background=PRI_COLOR[priority];
        btns[i].style.borderColor=PRI_COLOR[priority];
        btns[i].style.color = PRI_TEXT[priority];
      } else {
        btns[i].style.background='';
        btns[i].style.borderColor='';
        btns[i].style.color='';
      }
    }
  }

  function openCardDetail(id){
    _bbOpenCardId=id;
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(!c) return;
    document.getElementById('bb-d-added').textContent=c.assigned||'—';
    document.getElementById('bb-d-task').value=c.task||'';
    document.getElementById('bb-d-person').value=c.person||'';
    document.getElementById('bb-d-due').value=c.due||'';
    document.getElementById('bb-d-start').value=c.startDate||'';
    document.getElementById('bb-d-budget').value=c.budget||'';
    document.getElementById('bb-d-reviewer').value=c.reviewedBy||REVIEWERS[0];
    document.getElementById('bb-d-grow-note').value=c.growNote||'';
    document.getElementById('bb-d-grow-note-wrap').style.display=c.grow?'':'none';
    _bbUpdateReviewUI(c);
    _bbHighlightPriority(c.priority||'');
    _bbRenderKeyRow(c);
    var ov=document.getElementById('bb-detail-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function closeCardDetail(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(c){
      c.task=document.getElementById('bb-d-task').value;
      c.person=document.getElementById('bb-d-person').value;
      c.due=document.getElementById('bb-d-due').value;
      c.startDate=document.getElementById('bb-d-start').value;
      c.budget=document.getElementById('bb-d-budget').value;
      c.reviewedBy=document.getElementById('bb-d-reviewer').value;
      c.growNote=document.getElementById('bb-d-grow-note').value;
      _bbSaveLocal(_bbCardsList());
    }
    _bbOpenCardId=null;
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.remove('active');
    renderBoard();
  }

  function openTrashConfirm(id){
    _bbTrashPendingId=id;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.add('active');
  }

  function closeTrashConfirm(){
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
  }

  function doTrashCard(){
    var id=_bbTrashPendingId;
    _bbCards=_bbCardsList().filter(function(x){ return x.id!==id; });
    _bbSaveLocal(_bbCards);
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
    renderBoard();
  }

  function openSettings(){
    _bbHighlightAppearance();
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.add('active');
  }
  function closeSettings(){
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.remove('active');
  }

  function wireTrashIcon(){
    var trash=document.getElementById('bb-trash'); if(!trash) return;
    trash.addEventListener('dragover', function(e){ e.preventDefault(); trash.classList.add('bb-trash-dropready'); });
    trash.addEventListener('dragleave', function(){ trash.classList.remove('bb-trash-dropready'); });
    trash.addEventListener('drop', function(e){
      e.preventDefault();
      trash.classList.remove('bb-trash-dropready');
      var id=e.dataTransfer.getData('text/plain');
      if(id) openTrashConfirm(id);
    });
  }

  // Custom Keys -- a board-wide library of up to 6 traveler-defined
  // keys (shape+color+meaning), built in the Add-a-Key overlay (9390).
  // July 21, 2026 (afternoon), Larry: the card back always shows exactly
  // 3 fixed circles -- not the whole library -- one per slot. An empty
  // slot reads as a dashed "+"; tapping ANY circle (empty or filled)
  // opens Choose a Key (9395), which now does triple duty: assign an
  // existing library entry, remove what's there, or jump into building
  // a brand new one. Meanings stay hover-only by design ("can't
  // remember what it means? hover over it") -- no separate legend, kept
  // intentionally intuitive. Replaces the earlier "show all 6, tap to
  // toggle, three-strikes disable" version from earlier today, which
  // worked but left meanings undiscoverable without a hover, and had no
  // way to browse the library before committing to a new one.
  var _bbKeyDraft = {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
  var _bbOpenSlotIndex = null;

  function _bbRenderKeyRow(c){
    var row=document.getElementById('bb-d-key-row'); if(!row) return;
    var lib=_bbLoadKeyLibrary();
    var keys=c.keys||[];
    var html='';
    for(var i=0;i<MAX_KEYS_PER_CARD;i++){
      var kid=keys[i];
      var k = kid ? lib.filter(function(x){ return x.id===kid; })[0] : null;
      if(k){
        html += '<button class="bb-key-btn" data-slot="'+i+'" title="'+_esc(k.meaning||'')+'">'
          +'<span class="bb-key-shape" style="display:block;width:16px;height:16px;'+_bbShapeCSS(k.shape, k.color)+'"></span>'
          +'</button>';
      } else {
        html += '<button class="bb-key-btn bb-key-add" data-slot="'+i+'" title="Add a key">+</button>';
      }
    }
    row.innerHTML = html;
    row.querySelectorAll('.bb-key-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        openKeyPicker(Number(btn.getAttribute('data-slot')));
      });
    });
  }

  function openKeyPicker(slotIndex){
    _bbOpenSlotIndex = slotIndex;
    _bbRenderKeyPickerList();
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    var hasKey = !!(c && c.keys && c.keys[slotIndex]);
    var removeBtn=document.getElementById('bb-keypicker-remove');
    if(removeBtn) removeBtn.style.display = hasKey ? '' : 'none';
    var ov=document.getElementById('bb-keypicker-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeKeyPicker(){
    var ov=document.getElementById('bb-keypicker-overlay'); if(ov) ov.classList.remove('active');
  }
  // Shows the whole library every time a slot is tapped -- Larry's "so
  // you know what is already possible" ask -- greying out any entry
  // already sitting in one of this card's OTHER two slots, since one
  // card showing the same key twice would just be confusing.
  function _bbRenderKeyPickerList(){
    var list=document.getElementById('bb-keypicker-list'); if(!list) return;
    var lib=_bbLoadKeyLibrary();
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    var keys=(c && c.keys) || [];
    if(!lib.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No keys yet &mdash; build your first one below.</div>';
    } else {
      list.innerHTML = lib.map(function(k){
        var usedElsewhere = keys.indexOf(k.id)>=0 && keys[_bbOpenSlotIndex]!==k.id;
        return '<button class="bb-key-pick-row'+(usedElsewhere?' bb-key-pick-disabled':'')+'" data-key-id="'+k.id+'">'
          +'<span class="bb-key-pick-swatch" style="display:inline-block;'+_bbShapeCSS(k.shape,k.color)+'"></span>'
          +'<span class="bb-key-pick-meaning">'+_esc(k.meaning||'')+'</span>'
          +'</button>';
      }).join('');
      list.querySelectorAll('.bb-key-pick-row').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(btn.classList.contains('bb-key-pick-disabled')) return;
          assignKeyToSlot(btn.getAttribute('data-key-id'));
        });
      });
    }
    var newBtn=document.getElementById('bb-keypicker-new');
    if(newBtn) newBtn.style.display = lib.length>=MAX_KEY_LIBRARY ? 'none' : '';
  }
  function assignKeyToSlot(keyId){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(!c) return;
    c.keys = c.keys || [];
    c.keys[_bbOpenSlotIndex] = keyId;
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
  }
  function removeKeyFromSlot(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(!c || !c.keys) return;
    c.keys[_bbOpenSlotIndex] = null;
    _bbSaveLocal(_bbCardsList());
    closeKeyPicker();
    _bbRenderKeyRow(c);
    renderBoard();
  }

  function openKeyBuilder(){
    _bbKeyDraft = {shape:SIGNAL_SHAPES[0], color:KEY_COLORS[0]};
    var m=document.getElementById('bb-keybuilder-meaning'); if(m) m.value='';
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
  // Always reached through Choose a Key now, so _bbOpenSlotIndex is
  // already set to the slot that triggered it -- saving both grows the
  // library AND fills that slot in one step, no need to reopen the
  // picker afterward.
  function saveNewKey(){
    var lib=_bbLoadKeyLibrary();
    if(lib.length>=MAX_KEY_LIBRARY) return;
    var meaningEl=document.getElementById('bb-keybuilder-meaning');
    var meaning=meaningEl?meaningEl.value.trim():'';
    if(!meaning){ if(meaningEl) meaningEl.focus(); return; }
    var newKey={id:_bbUUID(), shape:_bbKeyDraft.shape, color:_bbKeyDraft.color, meaning:meaning};
    lib.push(newKey);
    _bbSaveKeyLibrary(lib);
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(c){
      c.keys = c.keys || [];
      c.keys[_bbOpenSlotIndex] = newKey.id;
      _bbSaveLocal(_bbCardsList());
    }
    closeKeyBuilder();
    if(c) _bbRenderKeyRow(c);
    renderBoard();
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
      openKeyBuilder();
    });
  }

  function wirePriorityButtons(){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
          if(!c) return;
          var base=btn.getAttribute('data-pri-base');
          c.priority=_bbNextPriority(c.priority||'', base);
          _bbSaveLocal(_bbCardsList());
          _bbHighlightPriority(c.priority);
          renderBoard();
        });
      })(btns[i]);
    }
  }

  function wireTopicBar(){
    wireBoardPicker();
    T().wire('bb-close-x', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    T().wire('bb-gear', openSettings);
    T().wire('bb-settings-close', closeSettings);
    document.querySelectorAll('.bb-theme-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){ _bbApplyTheme(btn.getAttribute('data-theme')); });
    });
    document.querySelectorAll('.bb-font-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _bbApplyFont(btn.getAttribute('data-font')); });
    });
  }

  function _bbUpdateReviewUI(c){
    var vBtn=document.getElementById('bb-d-verify');
    var pBtn=document.getElementById('bb-d-pro');
    var gBtn=document.getElementById('bb-d-grow');
    if(vBtn) vBtn.classList.toggle('bb-flag-active', !!c.verified);
    if(pBtn) pBtn.classList.toggle('bb-flag-active', !!c.pro);
    if(gBtn) gBtn.classList.toggle('bb-flag-active', !!c.grow);
  }

  function wireReviewButtons(){
    // PRO and GROW are performance-eval tags -- click to flag, click
    // again to clear, same pattern as Signal flag. Neither one gates
    // anything; they just ride along on the card's history.
    T().wire('bb-d-pro', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.pro=!c.pro;
      _bbSaveLocal(_bbCardsList());
      _bbUpdateReviewUI(c);
    });
    T().wire('bb-d-grow', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.grow=!c.grow;
      _bbSaveLocal(_bbCardsList());
      _bbUpdateReviewUI(c);
      var wrap=document.getElementById('bb-d-grow-note-wrap');
      if(wrap){
        wrap.style.display=c.grow?'':'none';
        if(c.grow){ var ta=document.getElementById('bb-d-grow-note'); if(ta) ta.focus(); }
      }
    });
    // Verified complete is the ONLY thing that signals removal to the
    // archive -- Larry, July 20: no separate Archive button needed.
    // Only does anything while the card is actually sitting in Done;
    // elsewhere it's a quiet no-op (another hidden Mickey -- the action
    // exists for later, nothing to explain about it now).
    T().wire('bb-d-verify', function(){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c || c.col!=='done') return;
      c.verified=true;
      c.archived=true;
      _bbSaveLocal(_bbCardsList());
      closeCardDetail();
    });
  }

  function wireBriefingBoard(){
    T().wire('b-bb-mg', T().goMG);

    T().wire('bb-add-close', closeAddCard);
    T().wire('b-bb-save-card', function(){
      var t=document.getElementById('bb-new-task');
      var d=document.getElementById('bb-new-due');
      var text=t?t.value.trim():'';
      if(!text) return;
      var cards=_bbCardsList();
      cards.push({id:_bbUUID(), col:'do', assigned:_bbToday(), task:text, person:_bbCurrentBoardDefaultAssignee(), due:d?d.value.trim():'', budget:'', keys:[], priority:'', verified:false, pro:false, grow:false, reviewedBy:REVIEWERS[0], archived:false});
      _bbSaveLocal(cards);
      closeAddCard();
      renderBoard();
    });

    T().wire('bb-detail-close', closeCardDetail);
    wirePriorityButtons();
    wireReviewButtons();
    wireKeyBuilder();
    wireKeyPicker();

    T().wire('bb-trash-yes', doTrashCard);
    T().wire('bb-trash-no', closeTrashConfirm);
    wireTrashIcon();
    wireTopicBar();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
  });

})();
