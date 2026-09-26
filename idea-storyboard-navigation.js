/* ============================================================
   idea-storyboard-navigation.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   BOARD + PROJECT SWITCHING. Everything about which project/board is on screen: the board-kind/parent/topic dropdowns, creating or duplicating Plan boards, the project hub and switcher, share management, renaming/deleting a project, and board background/title pickers.

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

  var _sboardBoardBgPalette = [
    {n:'White', c:'#ffffff'},
    {n:'Cream', c:'#f5f1e8'},
    {n:'Cork', c:'#c9a876'},
    {n:'Sand', c:'#e3d5b8'},
    {n:'Sage', c:'#a8b89a'},
    {n:'Dark Green', c:'#1e4d3a'},
    {n:'Teal', c:'#0f6e56'},
    {n:'Sky', c:'#5b9bd5'},
    {n:'Dark Blue', c:'#16324f'},
    {n:'Navy', c:'#1a3a5c'},
    {n:'Slate', c:'#3d4a5c'},
    {n:'Purple', c:'#4a2f5e'},
    {n:'Plum', c:'#6b3a5e'},
    {n:'Rose', c:'#c98a9c'},
    {n:'Coral', c:'#d97b5f'},
    {n:'Mustard', c:'#d4a72c'},
    {n:'Charcoal', c:'#2c2c2a'},
    {n:'Black', c:'#000000'}
  ];
  // Sept 15 2026, Larry (Master BB session with Bill): "Board color
  // should be different for each type of board. Now a color change
  // changes all boards to the same color." This used to be one shared
  // localStorage key -- every Idea/Plan Storyboard in the browser read
  // and painted the exact same value, so picking a color on one project
  // silently repainted every other project too (the July 18 2026 note
  // below on 9711 SESSION even records that a real per-Topic
  // Supabase-stored color existed before that simplification).
  //
  // First pass at this fix (same session) keyed it off the individual
  // project's own root row instead -- too narrow, and it referenced a
  // column (ideas.board_bg_color) that was never actually migrated in,
  // which broke this screen's main board fetch outright. Larry's
  // follow-up made the real unit clear: board_type (Personal/Client/...,
  // see IB_BOARD_TYPES below) -- a traveler's three Client boards should
  // look alike as a set, distinct from their Personal set. Now reads
  // T2TData's shared board_type_color store (surface 'idea_bg'),
  // keyed by _sboardActiveBoardType() -- loaded once per tab (see the
  // Promise.all in idea-storyboard-screens.js) and read synchronously
  // here afterward, same latency-hiding shape as the hidden-Types cache
  // just below in this file.
  // Sept 20 2026, Larry (Master BB do-m card, with the full list of
  // wanted board-variety defaults in the notes: Idea=blue sky,
  // Task=cream, Plan=light brown, Share=yellow, Journey=light green,
  // Dare=pink, Cast=light orange). That list is a different axis than
  // the board_type_color store above -- board_type there is the
  // ownership category (Personal/Client/Departmental/...), not which
  // BOARD VARIETY this is, and there's no existing per-variety color
  // mechanism to hang Share/Journey/Dare/Cast off yet (those aren't
  // board_type_color surfaces, and Journey/Dare are whole separate
  // pages, not a board kind this picker touches at all -- that's real
  // new design, not a color swap, and shouldn't be guessed at blind).
  // What IS a real, already-distinguished pair right here: IDEA vs
  // PLAN (_sboardIsPlanBoard, shared global, idea-storyboard-shared.js)
  // -- until now both fell back to the same navy default the moment no
  // custom color was picked. Given a distinct out-of-the-box default
  // for each, matching Larry's list, ahead of any custom pick.
  // Task/Briefing Board already lands close to "cream" via its own
  // default theme ('gold', bg #FDF6E8 -- briefing-board-ops.js THEMES).
  // Share/Journey/Dare/Cast intentionally left alone -- see the do-m
  // card's notes for what's still open there.
  function _sboardDefaultBoardBg(){
    return _sboardIsPlanBoard ? '#c9a876' /* light brown, "down to earth" */ : '#5b9bd5' /* blue sky */;
  }
  function _sboardGetBoardBg(){
    return T2TData.getBoardTypeColor(_sboardActiveBoardType(), 'idea_bg');
  }
  // Sept 19 2026, Master BB do-h card: "'What do you want?' ghost keeps
  // showing up when opening the MASTER idea board. There is NO PROJECT
  // called that! This needs to be deleted so it cannot accidentally
  // appear." Root cause: TOPIC's root-level fallback text used to be a
  // traveler-editable "Shape > Root prompt" field (openRootPromptEditor,
  // removed below), stored in localStorage and defaulting to "What do
  // you want?" -- shown right next to PROJECT reading "MASTER", which
  // reads exactly like a real (but bogus) project/topic name, and could
  // persist across sessions once typed since it lived in localStorage.
  // That's the same rendering-artifact ghost Larry already flagged once
  // (Aug 1 2026, see _ideaOpenBoardResume) -- this was the one remaining
  // path that could still produce it. The editor and its localStorage
  // key are removed outright, not just hidden, per "cannot accidentally
  // appear" -- _sboardGetRootPrompt now always returns the same fixed
  // 'MASTER' label PROJECT already shows at this exact state, so any
  // TOPIC/PARENT breadcrumb that falls back to it reads as the real
  // destination name, never a placeholder question.
  function _sboardGetRootPrompt(){
    return 'MASTER';
  }
  function _sboardApplyBoardBg(){
    var c=_sboardGetBoardBg();
    var w=document.getElementById('sc-board-wrap');
    var areaEl=document.getElementById('sc-header-area');
    var clusterEl=document.getElementById('s-sea-of-ideas-cluster');
    var swEl=clusterEl?clusterEl.querySelector('.sw'):null;
    // One single color for the header band and the board — no more
    // separate purple (#3a2564) default just on the header, clashing with
    // whatever the board itself was showing. Larry, August 1 2026: "make
    // the header panel part of the storyboard color... drop the purple
    // band." Both default together now; picking a custom Storyboard
    // background recolors both the same way, same as before. Default
    // itself changed Sept 20 2026 -- was one flat navy for every board;
    // now Idea/Plan get their own defaults (_sboardDefaultBoardBg above).
    var bg=c||_sboardDefaultBoardBg();
    if(w) w.style.background=bg;
    if(areaEl) areaEl.style.background=bg;
    if(clusterEl) clusterEl.style.background=c||'';
    if(swEl) swEl.style.background=c||'';
    // 9711 SESSION shares this same whole-screen background as of the
    // family-resemblance pass, July 18, 2026 — one color, either screen's
    // picker updates both. Was its own per-Topic Supabase-stored color
    // before this (see removed _isxLoadTopicColor in session.js).
    var isxBoard=document.getElementById('isx-board');
    var isxArea=document.getElementById('isx-header-area');
    if(isxBoard) isxBoard.style.background=bg;
    if(isxArea) isxArea.style.background=bg;
  }
  function _sboardSetBoardBg(c){
    T2TData.setBoardTypeColor(_sboardActiveBoardType(), 'idea_bg', c); // caches + paints immediately, saves in the background
    _sboardApplyBoardBg();
  }
  function openBoardBgPicker(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var swHTML=_sboardBoardBgPalette.map(function(p){
      return '<button class="sb-bg-swatch" data-c="'+p.c+'" title="'+p.n+'" style="width:36px;height:36px;border-radius:8px;background:'+p.c+';border:1.5px solid #cfe4f2;cursor:pointer;margin:3px"></button>';
    }).join('');
    var cur=_sboardGetBoardBg()||_sboardDefaultBoardBg();
    var typeLabelForBg=_sboardTypeLabel(_sboardActiveBoardType());
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">Storyboard background</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">One color for every '+_esc(typeLabelForBg)+' board. Stays until you change it -- other Types keep their own.</div>'
      +'<div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'+swHTML+'</div>'
      +'<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">'
      +'<label for="sb-bg-custom" style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Custom:</label>'
      +'<input type="color" id="sb-bg-custom" value="'+cur+'" style="width:44px;height:36px;border:1.5px solid #cfe4f2;border-radius:8px;padding:0;cursor:pointer">'
      +'</div>'
      +'<button class="sc-ov-btn" id="sb-bg-close" aria-label="Close">✕</button>'
      +'</div>';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-bg-swatch'), function(btn){
      btn.addEventListener('click', function(){ _sboardSetBoardBg(btn.getAttribute('data-c')); closeSbDetail(); });
    });
    var customInput=document.getElementById('sb-bg-custom');
    if(customInput) customInput.addEventListener('input', function(){ _sboardSetBoardBg(customInput.value); });
    T().wire('sb-bg-close', closeSbDetail);
  }

  function _sboardTopAncestor(h, headerRows){
    var cur=h, guard=0;
    while(cur.cluster_id && guard<20){
      var parent=headerRows.find(function(x){ return String(x.id)===String(cur.cluster_id); });
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur.id;
  }
  // PROJECT is the fixed root anchor above Parent/Topic — never changes as a
  // traveler drags/drills deeper. Walks the same cluster_id chain
  // _sboardTopAncestor already walks for headerRows, but off the full
  // _sboardAllRowsById map so it works for any row (idea or header), not
  // just header rows. Added July 12, 2026.
  // Sept 2, 2026 -- Idea Storyboards: stop climbing at the nearest
  // SELF-SCOPED row (topic_scope_id===its own id) rather than climbing
  // all the way to true root (cluster_id null). Every real project root
  // is already self-scoped (set at creation -- _sboardCreateRootBoard
  // and friends), including every existing one checked against the live
  // database before this change, so this returns exactly what it always
  // did for anything that predates Idea Storyboards. What changes is
  // real projects no longer sit at the database's true top level (they
  // nest under a member's own Idea Storyboards root, which is a
  // container, not itself self-scoped) -- climbing to true root would
  // now overshoot past the actual project and return Idea Storyboards
  // itself for everything, which is what this guards against.
  // Sept 21 2026, Larry: "MASTER should never show as a PROJECT unless
  // TOPIC = PROJECTS." CAST and SHARE (and any other structural header
  // pinned directly under MASTER, like FIELD GUIDE) were never given
  // their own self-scoping the way a real project root is -- their
  // topic_scope_id points at the shared MASTER root, not at themselves
  // -- so the old self-scoped-only stop condition climbed straight
  // past them and didn't stop until it reached MASTER itself, which is
  // exactly the true root and made PROJECT read MASTER for anything
  // nested under one of these headers (CAST showed PROJECT=MASTER
  // instead of PROJECT=SHARE, its real direct parent). Now also stops
  // the moment the climb reaches a row whose own parent (cluster_id) IS
  // the MASTER root -- that row is a direct child of MASTER, so it's
  // the right thing to show as PROJECT whether or not it happens to be
  // self-scoped, same as SHARE being CAST's answer here. Self-scoped
  // real projects (Field Guide, T2T, etc.) are unaffected -- they still
  // stop immediately at their own root, before this check is ever
  // reached.
  function _sboardProjectRowFor(row){
    var cur=row, guard=0;
    while(cur && !(cur.topic_scope_id && String(cur.topic_scope_id)===String(cur.id)) && cur.cluster_id && guard<25){
      if(_sboardIdeaStoryboardsRootId && String(cur.cluster_id)===String(_sboardIdeaStoryboardsRootId)) break;
      var parent=_sboardAllRowsById[cur.cluster_id];
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur;
  }

  // Board Type / switching between separate trees, Aug 13 2026 -- Larry:
  // "What do you want?" was never a real project, just placeholder text
  // for the empty state -- every root-level header (cluster_id null) is
  // already its own independent tree in the data (self-scoped: its
  // project_id and topic_scope_id both point at its own id), because a
  // traveler can be mid-flight on several completely separate boards
  // (different projects, companies, clients, or their own personal one).
  // This section gives that already-real structure an actual front
  // door: a Type picker that switches which of your root trees you're
  // looking at, matching Briefing Board's Type exactly, including the
  // same "(+) Add a type..." open-ended pattern. Parent/child (Fractal
  // Casting) is a completely separate, independent thing -- it only
  // ever comes from a HEADER being delegated into its own Topic, at any
  // depth, inside whichever board this is.
  // Expanded Aug 15 2026 to the fuller starter set from the
  // Organization design conversation, matching the Briefing Board's
  // own BB_BOARD_TYPES exactly -- Project dropped from the seeded list
  // (it's its own PROJECT eyebrow now, not a Type), but any root
  // already using 'project' keeps working -- _sboardExtraBoardTypes
  // always re-adds whatever's actually in use, seeded or not.
  var IB_BOARD_TYPES = [
    {value:'organization', label:'Organization'},
    {value:'company', label:'Company'},
    {value:'departmental', label:'Department'},
    {value:'client', label:'Client'},
    {value:'partner', label:'Partner'},
    {value:'supplier', label:'Supplier'},
    {value:'customer', label:'Customer'},
    {value:'personal', label:'Personal'}
  ];
  // Hidden presets, Aug 15 2026 -- mirrors the Briefing Board's own
  // _bbHiddenTypesCache/org_type_hidden exactly (same table, shared
  // per traveler across both boards).
  var _sboardHiddenTypesCache = [];
  var _sboardHiddenTypesLoaded = false;
  // Reserved/nested names, Aug 13 2026 -- Larry: NEW, MISC and Trash are
  // consistent bucket elements every board gets, not boards themselves;
  // Purpose and Idea Session Protocol are real headers that live nested
  // inside a board, not independent boards either. None of the five
  // should ever show up as a Type/Title picker option, no matter whose
  // account they're under -- exact-name match, case-insensitive.
  var IB_RESERVED_ROOT_NAMES = {'new':1,'misc':1,'trash':1,'purpose':1,'idea session protocol':1};
  function _sboardIsRealBoard(r){
    var name=String((r&&r.text_content)||'').trim().toLowerCase();
    return !IB_RESERVED_ROOT_NAMES[name];
  }
  var _sboardMyRoots = null;
  var _sboardMyRootsLoadedFor = null;
  // Adoption edges, Aug 16 2026 -- board unification work. Loaded
  // alongside _sboardMyRoots so the Project picker can fold a
  // board's adopted children in, same as the Briefing Board's
  // _bbRelationsCache/_bbChildBoardsOf. Keyed on briefing_boards ids,
  // not ideas ids -- see ideas.briefing_board_id.
  var _sboardRelationsCache = [];
  // Empty-Type browsing, Aug 16 2026 -- mirrors the Briefing
  // Board's _bbPendingTypeOverride exactly. Set when a Type with
  // zero roots is picked, so Type/Org Name/Project can all still
  // show as dropdowns instead of an immediate prompt(). Reset the
  // moment a real root opens (_sboardSwitchToRootBoard).
  var _sboardPendingTypeOverride = null;

  async function _sboardLoadMyRoots(force){
    var _sb=T().sb; if(!_sb){ _sboardMyRoots=_sboardMyRoots||[]; return _sboardMyRoots; }
    var user=(await _sb.auth.getUser()).data.user;
    // Sept 13 2026 fix (Larry: whole site frozen solid for any signed-out
    // visitor) -- this used to just RETURN _sboardMyRoots||[] here without
    // ever ASSIGNING it, so the module-level _sboardMyRoots stayed
    // undefined forever whenever there was no signed-in user yet.
    // _sboardRenderTypePicker() (below) treats "still undefined" as "go
    // fetch it," so it kept calling straight back into this function on
    // every resolution -- an unbroken .then()-to-.then() recursion with
    // no real async gap once backpack.js's same-day getUser() cache made
    // this resolve instantly instead of over a real network round trip.
    // That's a runaway microtask loop: it never yields to the browser's
    // event loop, so nothing else -- not a repaint, not another script,
    // not even a totally unrelated click -- ever got a turn. Assigning
    // the empty array here (same pattern the catch block below already
    // uses) makes "signed out" a stable, final answer instead of "keep
    // asking," which is what actually stops the recursion.
    if(!user){ _sboardMyRoots=_sboardMyRoots||[]; return _sboardMyRoots; }
    if(!force && _sboardMyRoots && _sboardMyRootsLoadedFor===user.id) return _sboardMyRoots;
    try{
      // Sept 2, 2026 -- consolidation: this used to run its own copy of
      // the "what are my top-level projects" query, independent of
      // topLevelBoards() in header-data.js. A comment left here on Aug
      // 26 documents exactly the risk of that: a fix (excluding PLAN
      // boards from the picker) landed in topLevelBoards() and was
      // missed here, so a project that had been through PLAN briefly
      // showed up twice. Now there's one query, not two, so a fix in one
      // place reaches every picker that reads project lists -- content_
      // type='header' (Aug 13 fix) and the PLAN exclusion (Aug 26 fix)
      // both already live inside topLevelBoards() and are inherited for
      // free. This picker stays owner-only (unlike PROJECT's popup,
      // which also shows projects shared with the traveler) by filtering
      // to rows this user actually owns.
      var all=await T2TData.topLevelBoards();
      var res={data:all.filter(function(r){ return r.user_id===user.id; })};
      _sboardMyRoots=(res.data||[]).filter(_sboardIsRealBoard).filter(function(r){ return (r.storyboard_kind||'IDEA')==='IDEA'; }).map(function(r){ return {id:r.id, text_content:r.text_content, board_type:r.board_type||'personal', org_name:r.org_name||'', created_at:r.created_at, briefing_board_id:r.briefing_board_id||null}; });
      _sboardMyRootsLoadedFor=user.id;
      // Aug 16 2026 -- same source of truth the Briefing Board reads
      // (board_relations, RLS-scoped to boards this traveler owns),
      // so an adoption made on one screen shows on both.
      try{
        var relRes=await _sb.from('board_relations').select('*').eq('status','approved');
        _sboardRelationsCache=relRes.error?[]:(relRes.data||[]);
      }catch(e){ _sboardRelationsCache=[]; console.warn('Idea Board: could not load board relations', e); }
    }catch(e){ console.warn('Idea Board: could not load your boards', e); _sboardMyRoots=_sboardMyRoots||[]; }
    return _sboardMyRoots;
  }

  function _sboardExtraBoardTypes(roots){
    var fixed={}; IB_BOARD_TYPES.forEach(function(t){ fixed[t.value]=true; });
    var seen={}, extra=[];
    (roots||[]).forEach(function(r){
      var v=r.board_type||'personal';
      if(!fixed[v] && !seen[v]){ seen[v]=true; extra.push(v); }
    });
    return extra;
  }

  function _sboardTypeLabel(value){
    var hit=IB_BOARD_TYPES.filter(function(t){ return t.value===value; })[0];
    if(hit) return hit.label;
    return String(value||'').replace(/(^|[_\s]+)([a-z])/g, function(m,p1,p2){ return (p1?' ':'')+p2.toUpperCase(); }).trim();
  }

  async function _sboardEnsureHiddenTypesLoaded(){
    if(_sboardHiddenTypesLoaded) return;
    _sboardHiddenTypesLoaded=true;
    var _sb=T().sb; if(!_sb) return;
    try{
      var user=(await _sb.auth.getUser()).data.user; if(!user) return;
      var res=await _sb.from('org_type_hidden').select('value').eq('user_id',user.id);
      if(res.error) throw res.error;
      _sboardHiddenTypesCache=(res.data||[]).map(function(r){ return r.value; });
    }catch(e){ console.error('Idea Board: could not load hidden Types', e); }
  }
  // Fixed Types minus whatever's hidden -- a value still in use by one
  // of the traveler's own root boards always shows regardless (see
  // Briefing Board's own _bbVisibleFixedTypes for the same rule).
  function _sboardVisibleFixedTypes(roots){
    var hidden={}; (_sboardHiddenTypesCache||[]).forEach(function(v){ hidden[v]=true; });
    var inUse={}; (roots||[]).forEach(function(r){ inUse[(r.board_type||'personal')]=true; });
    return IB_BOARD_TYPES.filter(function(t){ return !hidden[t.value] || inUse[t.value]; });
  }
  async function _sboardHideType(value){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user; if(!user || !value) return;
    if(_sboardHiddenTypesCache.indexOf(value)===-1) _sboardHiddenTypesCache.push(value);
    try{
      var ins=await _sb.from('org_type_hidden').upsert({user_id:user.id, value:value});
      if(ins.error) console.error('Idea Board: could not hide Type', ins.error);
    }catch(e){ console.error('Idea Board: could not hide Type', e); }
    _sboardRenderTypePicker();
    _sboardRenderOrgName();
  }

  // Switches straight to a different root tree -- same shape as
  // _sboardDrillInto/_sboardGoUpOneLevel below, just targeting a root id
  // directly instead of climbing from the current position. Persists via
  // the root's own id (a root is always its own project_id per the
  // self-scoping pattern above), not _sboardPersistLastTopic's row
  // lookup, since a freshly created or just-loaded root may not be warm
  // in _sboardAllRowsById yet.
  function _sboardSwitchToRootBoard(rootId){
    _sboardPendingTypeOverride=null;
    T2TShared.currentTopicId=rootId;
    T2TShared.filter=rootId;
    try{
      if(window.T2TData && window.T2TData.setLastInputTopic) window.T2TData.setLastInputTopic(rootId, rootId);
      if(window.T2TMedia && window.T2TMedia.rememberProject) window.T2TMedia.rememberProject(rootId);
    }catch(e){}
    _sboardSpinWhile(renderSeaBoard());
  }

  // Aug 30 2026 fix -- Larry: "when I changed to Company on the PLAN
  // board, the entire board changed to IDEA." Type and Title both pick
  // their target from _sboardMyRoots, which only ever holds IDEA-kind
  // roots (Plan boards are deliberately left out of that list -- see
  // the Aug 26 comment inside _sboardLoadMyRoots above), so jumping
  // straight to the matched root via _sboardSwitchToRootBoard always
  // landed on that project's IDEA board, even when you started on a
  // Plan board and only meant to browse to a different project. This
  // wrapper checks _sboardIsPlanBoard first: off a Plan board it
  // behaves exactly as before, but from a Plan board it routes the
  // jump to the matched project's own Plan board when one already
  // exists, or offers the same Duplicate/Start Blank choice used by
  // the IDEA/PLAN dropdown when it doesn't -- so switching Type or
  // Title never silently drops you back into IDEA.
  async function _sboardSwitchToRootBoardPreservingKind(rootId){
    if(!_sboardIsPlanBoard){ _sboardSwitchToRootBoard(rootId); return; }
    _sboardPendingTypeOverride=null;
    var _sb=T().sb;
    try{
      var existing=await _sb.from('ideas').select('id').eq('content_type','header').is('cluster_id',null)
        .eq('storyboard_kind','PLAN').eq('source_project_id', rootId).limit(1);
      if(existing.error) throw existing.error;
      if(existing.data && existing.data.length){
        var freshPlan=await _sb.from('ideas').select('*').eq('id', existing.data[0].id).maybeSingle();
        if(freshPlan.error) throw freshPlan.error;
        if(freshPlan.data){ _sboardDrillInto(freshPlan.data); return; }
      }
      var freshIdea=_sboardAllRowsById[rootId];
      if(!freshIdea){
        var ir=await _sb.from('ideas').select('*').eq('id', rootId).maybeSingle();
        if(ir.error) throw ir.error;
        freshIdea=ir.data;
      }
      if(!freshIdea){ _sboardShowToast('Could not open that project.'); return; }
      _sboardOpenPlanStartChoice(freshIdea);
    }catch(err){
      _sboardShowToast('Could not open that Plan board — '+(err&&err.message?err.message:'try again'));
    }
  }

  async function _sboardCreateRootBoard(name, boardType){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user){
      window.alert('Could not add a board: your sign-in session appears to have expired. Please refresh the page and sign in again, then try adding the board.');
      return null;
    }
    try{
      // Sept 2, 2026 -- Idea Storyboards: a new project lands as a child
      // of this member's own Idea Storyboards root, not at the database's
      // true top level -- ensureIdeaStoryboardsRoot creates that root
      // (self-healing, one-time) the first time any member needs it.
      var ideaStoryboardsRootId=await T2TData.ensureIdeaStoryboardsRoot();
      var ins=await _sb.from('ideas').insert({user_id:user.id, content_type:'header', text_content:name, cluster_id:ideaStoryboardsRootId||null, board_type:boardType||'personal', created_at:new Date().toISOString(), color:T().getDefaultHeaderColor?T().getDefaultHeaderColor():null}).select().single();
      if(ins.error || !ins.data){
        console.error('Idea Board: could not create board', ins.error);
        window.alert('Could not add the board "'+name+'". Error: '+(ins.error&&ins.error.message?ins.error.message:'unknown error')+'. Nothing was saved -- please try again or refresh the page.');
        return null;
      }
      // Self-scoping, matching every existing root: a root's own
      // project_id and topic_scope_id both point at its own id.
      await _sb.from('ideas').update({project_id:ins.data.id, topic_scope_id:ins.data.id}).eq('id',ins.data.id);
      // Sept 8 2026 -- one-board model: a traveler who's been through the
      // Session 275 merge has exactly one true Briefing Board, and it
      // must never grow a second, un-retired one just because a new
      // project got added here. Larry: "Adding a new project should
      // automatically add a HEADER to the PROJECTS idea board" -- a
      // Header only. The mirror insert below (Aug 16 2026, pre-single-
      // board) is skipped entirely for a single-board traveler; this is
      // also the confirmed root cause of the stray duplicate "Wish Tank"
      // Header found live on Sept 8 (created the same second as this
      // traveler's own PROJECTS root, with zero cards behind it --
      // repaired directly in the data, this stops it happening again).
      // Multi-board travelers (Rachel/Kelly Arnold/LifeWave, still on
      // the old per-project-board world) keep the mirror exactly as
      // before.
      if(!(window.T2TData && T2TData.isSingleBoardMode && T2TData.isSingleBoardMode())){
      // Aug 16 2026 -- mirror onto the Briefing Board the moment a board
      // is created here too, linked by briefing_board_id, so ownership/
      // PROJECT/adoption always resolve from one shared record no
      // matter which screen created the board. Best-effort, matching
      // the Briefing Board's own mirror in _bbCreateBoard.
      // Sept 5 2026 -- now also toasts on failure instead of only logging
      // a console warning, matching the Briefing Board's own mirror fix
      // today. This best-effort mirror can still fail (the boardType
      // fallback above should prevent the specific not-null gap that
      // caused it for three real projects, but nothing here guarantees
      // no other failure mode exists) -- when it does, Larry should see
      // it happened rather than getting a project with no Briefing Board
      // and no sign anything went wrong.
      try{
        // Sept 6 2026 -- fixed: this insert set the mirror board's name
        // and type but never wrote storyboard_project_id back onto it,
        // so PROJECT's own picker (_bbRenderBoardPicker in
        // briefing-board.js, which treats any board with no
        // storyboard_project_id as a separate "personal board" choice)
        // had no way to know this board already belonged to the project
        // it was just mirrored from -- it showed up as a second,
        // identically-named entry alongside the real project every
        // time. Found live on "Mouse Criteria" (two boards, same name,
        // both storyboard_project_id null) -- data repaired directly;
        // this stops it happening to the next new project.
        var bbIns=await _sb.from('briefing_boards').insert({user_id:user.id, board_type:boardType||'personal', name:name, storyboard_project_id:ins.data.id}).select().single();
        if(!bbIns.error && bbIns.data){
          await _sb.from('ideas').update({briefing_board_id:bbIns.data.id}).eq('id',ins.data.id);
        } else {
          console.warn('Idea Board: could not mirror new board onto the Briefing Board', bbIns.error);
          _sboardShowToast('Project saved, but its Briefing Board could not be created -- tell Claude so it can add one.');
        }
      }catch(e){ console.warn('Idea Board: could not mirror new board onto the Briefing Board', e); _sboardShowToast('Project saved, but its Briefing Board could not be created -- tell Claude so it can add one.'); }
      }
      await _sboardLoadMyRoots(true);
      return ins.data.id;
    }catch(e){
      console.error('Idea Board: could not create board', e);
      window.alert('Could not add the board "'+name+'". Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again or refresh the page.');
      return null;
    }
  }

  // Aug 13 2026, Larry: TYPE reverting to Personal after picking Project
  // was this function reading the <select>'s own DOM value right after
  // that same select's innerHTML got rebuilt (which resets a <select> to
  // its first option before the real value gets reapplied) -- a stale
  // read racing its own render, not a real conflict with the old PROJECT
  // field. Fixed by deriving straight from the real current board's own
  // board_type (same approach Briefing Board's _bbActiveBoardType/
  // _bbRenderTypePicker already used correctly), no DOM value in the loop.
  // Org context, Aug 16 2026 -- mirrors the Briefing Board's
  // _bbOrgContextBoard exactly (same bug, same fix, same day): a
  // project's own Type/org_name were never really its own, they
  // belong to whichever board it's an adopted project OF. Returns the
  // root itself if it has no approved parent; otherwise the parent's
  // own root row, resolved through briefing_board_id since that's
  // what board_relations actually links on, not the ideas id.
  // Aug 30 2026 fix -- Larry: "now I switched from personal to company
  // and it stayed on personal." rootId can be a PLAN board's own id,
  // which never appears in _sboardMyRoots (Plan boards are deliberately
  // excluded from that IDEA-only list -- see the Aug 26 comment inside
  // _sboardLoadMyRoots above). Type, Title and Org Name are one shared
  // identity per project, IDEA and PLAN alike (Design Notes), so when
  // the row itself isn't in the list, fall back to its
  // source_project_id and look THAT up instead of silently returning
  // null -- otherwise every picker reading off this function quietly
  // defaults to Personal (or whichever root happened to load first)
  // the instant you're standing on a Plan board, even though the Plan
  // board's own row already carries the real board_type/org_name
  // directly. Split out of _sboardOrgContextRoot (below) the same day
  // -- that function's extra climb to the organizational PARENT is
  // right for gathering a family list, but wrong for "what board is
  // actually on screen" -- see that function's own comment.
  function _sboardSelfRoot(rootId){
    var roots=_sboardMyRoots||[];
    var root=roots.filter(function(r){ return String(r.id)===String(rootId); })[0];
    if(!root){
      var planRow=_sboardAllRowsById[rootId];
      if(planRow && planRow.storyboard_kind==='PLAN' && planRow.source_project_id){
        root=roots.filter(function(r){ return String(r.id)===String(planRow.source_project_id); })[0];
      }
    }
    return root||null;
  }

  function _sboardOrgContextRoot(rootId){
    var root=_sboardSelfRoot(rootId);
    if(!root) return null;
    if(!root.briefing_board_id) return root;
    var roots=_sboardMyRoots||[];
    // Aug 30 2026 fix -- Larry: "I changed T2T project to Field Guide
    // project and nothing happened." This function climbs from a board
    // to its organizational PARENT (Field Guide -> T2T, say), which is
    // exactly what _sboardRenderTitlePicker needs to gather the whole
    // adopted family into one list (its original Aug 16 purpose -- see
    // that function). But every OTHER caller was using this same climb
    // to decide what Type/Title/Org Name should show as the CURRENT
    // value -- so opening an adopted child's Plan board (which is what
    // today's earlier fix made reachable for the first time) displayed
    // its parent's name/type instead of its own, and clicking the
    // child you were already standing on looked like a dead click.
    // Callers that want "what's actually on screen" now call
    // _sboardSelfRoot directly instead; this function is reserved for
    // the one caller that genuinely wants the parent.
    var parentRel=_sboardRelationsCache.filter(function(r){ return r.child_board_id===root.briefing_board_id; })[0];
    if(!parentRel) return root;
    var parentRoot=roots.filter(function(r){ return r.briefing_board_id===parentRel.parent_board_id; })[0];
    return parentRoot || root;
  }

  function _sboardActiveBoardType(){
    if(_sboardPendingTypeOverride) return _sboardPendingTypeOverride;
    var curRoot=_sboardCurrentRootRow();
    // Aug 30 2026 fix -- self, not the organizational parent (see
    // _sboardOrgContextRoot's own comment): Type has to describe the
    // board actually on screen, or an adopted child whose Type differs
    // from its parent's would show the wrong one.
    var match=curRoot?_sboardSelfRoot(curRoot.id):null;
    return (match && match.board_type) || 'personal';
  }

  // Root of whatever's currently on screen -- climbs cluster_id from the
  // live in-memory map when warm, falls back to T2TData.ancestorChain
  // (already used elsewhere in this file for the same cold-cache case)
  // so this works right after a page load/reload too.
  function _sboardCurrentRootRow(){
    if(!T2TShared.currentTopicId) return null;
    var row=_sboardAllRowsById[T2TShared.currentTopicId];
    if(row) return _sboardProjectRowFor(row);
    return null;
  }

  // Custom dropdown, Aug 13 2026 -- Larry: "the (+) should be at the
  // bottom of each dropdown list, not to the side" AND "the + in a
  // dotted line circle just like every other add." A native <select>
  // can only show plain text options -- there's no way to make one row
  // render as a real dashed circle. So Type and Title are no longer
  // native <select> elements: each is a small trigger button that opens
  // a real, CSS-built menu, and that menu's own last row is the literal
  // dashed-circle (+), same shape as the header/subber add tiles.
  // Shared by both Type and Title below; closeAll() also lives here so
  // opening one closes the other, and a page click anywhere closes both.
  function _sboardCloseAllDropdowns(exceptMenuId){
    ['sc-type-menu','sc-org-name-menu','sc-title-menu','sc-board-kind-menu','sc-parent-menu','sc-topic-child-menu','sc-topic-menu','sc-view-menu','sb-people-menu','bb-people-menu'].forEach(function(id){
      if(id===exceptMenuId) return;
      var m=document.getElementById(id);
      if(m) m.hidden=true;
    });
  }
  document.addEventListener('click', function(){ _sboardCloseAllDropdowns(null); });

  // Board-kind dropdown (IDEA/PLAN/BRIEFING BOARD/SHARE/CAST), Aug 30
  // 2026 -- Larry: one dropdown should reach every board, not just
  // Idea/Plan. BRIEFING BOARD reuses the exact nav call the Screen 0000
  // wheel's own "Briefing Board" tile already uses (screen-zero.js);
  // CAST reuses the same whole-project Cast/team roster popup already
  // reachable from the Utility gear (_sboardOpenTeam) -- Idea/Plan and
  // their linked Briefing Board share one roster (see _tmAddMember), so
  // this opens the same people, not a second list. SHARE stays a stub
  // until that board exists. ORG retired -- wasn't on Larry's list.
  // Deliberately NOT built on _sboardRenderDropdown: that helper always
  // appends a dashed-circle (+) "add" row, which makes sense for a
  // user-editable list (Type, Title, View) but not for this fixed menu
  // -- there's nothing to add here. Wired once at board init since the
  // list never changes; open/close/position logic mirrors
  // _sboardRenderDropdown's trigger.onclick exactly, just without the
  // addRow.
  // Sept 15 2026 -- Larry renamed the STORYBOARD options everywhere on
  // screen: BRIEFING BOARD -> TASKS, CAST -> ROLES. Only the display
  // label changes here -- value stays the original internal name since
  // every handler below (and the row's own storyboard_project_id, the
  // file names, etc.) still keys off it; renaming those too would be a
  // much bigger, purely backstage change with no visible upside.
  // Sept 19 2026 -- Larry: change BRIEFING BOARD's display label back
  // from TASKS to BRIEFING (BB for short). CAST stays ROLES.
  // Sept 23 2026 -- Larry: "change Roles to Cast on storyboard dropdown."
  // ROLES -> CAST, matching the locked name for the one list of people.
  // Sept 26 2026 -- Larry: rename the board-kind labels -- IDEAS -> BLUE
  // SKY, PLAN -> PATHFINDER, SHARE -> STORYBOARD (freed up by PROJECT/
  // STORYBOARD's own eyebrow rename to TOPIC/BOARD the same session).
  // value stays the internal name every handler below keys off; only
  // label (the displayed word) changes. Kept in sync with briefing-
  // board-master-nav.js's own copy of this list.
  var _sboardBoardKinds=[
    {value:'IDEA', label:'BLUE SKY', soon:null},
    {value:'PLAN', label:'PATHFINDER', soon:null},
    {value:'BRIEFING BOARD', label:'BRIEFING', soon:null},
    {value:'SHARE', label:'STORYBOARD', soon:'Storyboard coming soon'},
    {value:'CAST', label:'CAST', soon:null}
  ];
  function _sboardWireBoardKindDropdown(){
    var trigger=document.getElementById('sc-board-kind-trigger'), menu=document.getElementById('sc-board-kind-menu');
    if(!trigger || !menu) return;
    menu.innerHTML='';
    _sboardBoardKinds.forEach(function(k){
      var row=document.createElement('div');
      row.className='sc-cdrop-row';
      row.setAttribute('data-kind', k.value);
      row.textContent=k.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        if(k.value==='PLAN'){ IDBand.recordReturn('IDEA', T2TShared.currentTopicId); _sboardOpenOrCreatePlanBoard(); return; }
        if(k.value==='IDEA'){ _sboardReturnToIdeaBoard(); return; }
        if(k.value==='BRIEFING BOARD'){
          // Sept 5 2026, Larry: "if an Idea Board changes a PROJECT or a
          // level, jumping to the BB should instantly go to the same
          // project and level" -- then, same day: "what if TOPIC is
          // exactly the same [as the Idea Board's]? If DREAM PHASE is the
          // TOPIC on the Idea Board, then DREAM PHASE is the BB." So this
          // hands off the traveler's exact current TOPIC (whatever
          // T2TShared.currentTopicId is right now, at any depth -- the
          // project root itself counts, same as everywhere else that
          // treats "standing at the root" as just TOPIC's own value being
          // the root row), not the project it climbs up to -- briefing-
          // board.js's jumpToTopic lands on (or creates) that exact
          // layer's own Briefing Board instead of just nav()'ing here and
          // leaving whatever board was already open in place.
          var bbTopicId=T2TShared.currentTopicId;
          if(!bbTopicId){ _sboardShowToast('Open a project first.'); return; }
          IDBand.recordReturn('IDEA', bbTopicId);
          if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic){
            window.T2TBriefingBoard.jumpToTopic(bbTopicId);
          } else if(window.T2T && window.T2T.nav){
            window.T2T.nav('s-briefing-board');
          }
          return;
        }
        if(k.value==='CAST'){
          // Sept 14 2026, Larry: CAST is a board choice like Idea/Plan/
          // Briefing Board/Share, not a small icon buried inside every
          // card's Call Sheet -- picking it here, with the current card
          // as TOPIC (project), opens the full Project Cast Roster
          // (idea-storyboard-people.js's _csOpenProjectRoster): everyone
          // on this project and everything below it, roles and contact,
          // one screen. Replaces the older storyboard_members-only Team
          // Roster (_sboardOpenTeam) as this menu's destination -- that
          // function stays in place for now (nothing else calls it yet),
          // but CAST-the-board-choice now means the real Cast, same
          // source of truth as everywhere else.
          var castRow=_sboardCurrentProjectRow();
          // Sept 23 2026 -- Larry: the Cast Roster is the Project Pyramid
          // with people on it, opened at the current TOPIC
          // (cast-roster.js). Same screen as the Briefing Board's CAST.
          // The flat Project Cast Roster below stays as a fallback.
          var castTopic=T2TShared.currentTopicId || (castRow ? castRow.id : null);
          if(!castTopic){ _sboardShowToast('Open a project first.'); return; }
          if(window.CastRoster){ window.CastRoster.open(castTopic); return; }
          if(castRow) _csOpenProjectRoster(castRow);
          return;
        }
        if(k.soon) _sboardShowToast(k.soon);
      });
      menu.appendChild(row);
    });
    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-board-kind-menu':null);
      if(willOpen){
        _sboardSyncBoardKindChrome();
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(120,r.width)+'px';
        menu.hidden=false;
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
    // sc-board-kind-caret, Sept 15 2026 -- same forward-to-trigger pattern
    // as sc-project-caret: no independent behavior, just a wider/visible
    // click target now that STORYBOARD has its own arrow instead of
    // relying on the whole word being clickable.
    var kindCaret=document.getElementById('sc-board-kind-caret');
    if(kindCaret) kindCaret.onclick=function(e){
      e.stopPropagation();
      trigger.click();
    };
    _sboardSyncBoardKindChrome();
  }

  // Keeps the IDEA/PLAN/SHARE/ORG trigger text and the menu's checkmark
  // honest about which board is actually on screen -- Aug 26 2026. Called
  // once at wire-time and again on every render (see the isAtProjectRoot
  // block below), since which project (and which of its kinds) is current
  // can change without this dropdown ever being touched (drilling in/out,
  // PROJECT switcher, a TOC link...).
  function _sboardSyncBoardKindChrome(){
    var trigger=document.getElementById('sc-board-kind-trigger'), menu=document.getElementById('sc-board-kind-menu');
    var kindNow=_sboardIsPlanBoard?'PLAN':'IDEA';
    // Sept 6 2026, Larry: "change IDEA to IDEAS" -- kindNow stays 'IDEA'
    // internally (matches storyboard_kind and every k.value comparison
    // above), only the displayed word changes. Sept 26 2026 -- IDEAS ->
    // BLUE SKY, PLAN -> PATHFINDER (kept in sync with _sboardBoardKinds).
    if(trigger) trigger.textContent=(kindNow==='IDEA'?'BLUE SKY':(kindNow==='PLAN'?'PATHFINDER':kindNow));
    if(menu){
      Array.prototype.forEach.call(menu.querySelectorAll('.sc-cdrop-row[data-kind]'), function(row){
        row.classList.toggle('active', row.getAttribute('data-kind')===kindNow);
      });
    }
  }

  // PROJECT's ▾ arrow, Sept 3 2026 -- Larry: pressing the arrow to the
  // right of Idea Storyboards should show the Headers (other PROJECTS) as
  // choices, in the order they appear under the Idea Storyboards TOPIC,
  // not just act like Parent and drill straight in with no choices. Built
  // the same way as _sboardWireBoardKindDropdown right above (open/close/
  // position mirrors _sboardRenderDropdown's trigger.onclick, no addRow --
  // there's nothing to create here, that's still what double-clicking the
  // label itself opens via openProjectSwitcher) with one real difference:
  // the row list can't be built once at wire-time like board-kind's fixed
  // five options -- projects get renamed, reordered, added and removed
  // all the time -- so this rebuilds sc-title-menu's rows fresh, from
  // whatever's actually cached in _sboardAllRowsById, every time the
  // arrow is pressed, not just once at board init.
  //
  // "In the order they appear under the Idea Storyboards TOPIC" means the
  // exact same list, same order, as childHeadersSorted -- the real
  // on-board tile order (_sboardBySortOrder off each Header's own
  // sort_order) -- would show if you were standing at Idea Storyboards
  // itself right now (see the mergedRow block in renderSeaBoard). Reading
  // it straight off the whole-account cache instead of requiring you to
  // actually be standing there is what makes the arrow useful anywhere in
  // the app, not just from the Idea Storyboards board itself. COLLABORATOR/
  // STAKEHOLDER/NEW/MISC/Purpose are real Headers under that same root too,
  // but they're reserved buckets, not "other PROJECTS" -- excluded here as
  // with everywhere else.
  function _sboardProjectHeaderChoices(){
    var rootId=_sboardIdeaStoryboardsRootId;
    if(!rootId) return [];
    var RESERVED={'NEW':1,'New Additions':1,'Parking Lot':1,'COLLABORATOR':1,'STAKEHOLDER':1,'MISC':1,'Purpose':1,'Trash':1,'Archived':1};
    // Sept 8 2026, Larry: "Idea Board PROJECT LIST is not alphabetical."
    // This used to sort by _sboardBySortOrder (on-board tile order), which
    // made sense back when the arrow's own comment described the goal as
    // "the order they appear under the Idea Storyboards TOPIC" -- but
    // every other project list on the account (openProjectSwitcher just
    // above, and briefing-board.js's own _bbProjectPickerOptions/
    // _bbProjectPickerOptions comment: "sorted the same alphabetical way
    // that popup already uses") is alphabetical, so this was the one
    // holdout still reading on-board order. Matched to the same
    // case-insensitive localeCompare every other project picker uses.
    return Object.keys(_sboardAllRowsById)
      .map(function(k){ return _sboardAllRowsById[k]; })
      .filter(function(r){ return r && r.content_type==='header' && String(r.cluster_id)===String(rootId) && !RESERVED[r.text_content]; })
      .sort(function(a,b){ return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase()); });
  }
  function _sboardWireProjectHeaderDropdown(){
    // Sept 19 2026 -- re-pointed at sc-title-trigger (PROJECT's only
    // element now, sc-project-caret is gone): a single click on PROJECT
    // opens this same list, matching STORYBOARD's sc-board-kind-trigger.
    var trigger=document.getElementById('sc-title-trigger'), menu=document.getElementById('sc-title-menu');
    if(!trigger || !menu) return;
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-title-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      var choices=_sboardProjectHeaderChoices();
      menu.innerHTML='';
      // PROJECTS row restored, Sept 6 2026 -- Larry, later the same day:
      // "What used to be Idea Storyboards is now PROJECTS and should top
      // the projects list." Pinned back above the real projects, same
      // spot the old "Idea Storyboards" row held before it was pulled
      // earlier today -- just renamed and re-added.
      // Sept 7 2026, Larry: relabeled MASTER, matching the PROJECT
      // eyebrow's own root label and the Briefing Board's equivalent
      // pinned dropdown row (see briefing-board.js's own Sept 7 note) --
      // this is the "go to root" link inside PROJECT's dropdown, same
      // word PROJECT itself now reads at rest when standing at root.
      if(_sboardIdeaStoryboardsRootId){
        var pinned=document.createElement('div');
        pinned.className='sc-cdrop-row';
        pinned.style.fontWeight='700';
        pinned.textContent='MASTER';
        // Ensure-root-then-drill-in, Sept 19 2026 -- carried over from the
        // old direct-click handler this dropdown replaced (see the boot
        // wiring's own note, idea-storyboard-screens.js): this is also
        // what actually RUNS the one-time migration for a member who's
        // never opened MASTER before (no "Idea Storyboards" row yet).
        pinned.addEventListener('click', async function(ev){
          ev.stopPropagation();
          menu.hidden=true;
          var rootId=await T2TData.ensureIdeaStoryboardsRoot();
          if(rootId) _sboardDrillInto({id:rootId});
        });
        menu.appendChild(pinned);
        if(choices.length){
          var sep=document.createElement('div');
          sep.style.cssText='border-top:1px solid rgba(255,255,255,.15);margin:2px 0';
          menu.appendChild(sep);
        }
      }
      if(!choices.length){
        var empty=document.createElement('div');
        empty.className='sc-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent='No other projects yet.';
        menu.appendChild(empty);
      } else {
        choices.forEach(function(h){
          var row=document.createElement('div');
          row.className='sc-cdrop-row';
          row.textContent=h.text_content||'(untitled)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.hidden=true;
            _sboardDrillInto(h);
          });
          menu.appendChild(row);
        });
      }
      // (+) Add a new PROJECT, Sept 19 2026 -- carried over from the old
      // _sboardRenderTitlePicker (retired when this hand-built dropdown
      // replaced it -- see that function's own now-dead code, above),
      // which was built on the shared _sboardRenderDropdown component and
      // got its (+) row for free. This dropdown is hand-built instead
      // (see this function's own opening comment) so it lost that row
      // along the way -- Master BB card, do-h: "Not on Idea board." Same
      // create-then-switch flow as before: prompt for a name, create the
      // root board, jump straight into it.
      var addRow=document.createElement('div');
      addRow.className='sc-cdrop-addrow';
      var addBtn=document.createElement('button');
      addBtn.type='button';
      addBtn.className='sc-dotted-add-btn';
      addBtn.title='Add a board';
      addBtn.textContent='+';
      addBtn.addEventListener('click', async function(ev){
        ev.stopPropagation();
        menu.hidden=true;
        var typeLabel=_sboardTypeLabel(_sboardActiveBoardType());
        var name=window.prompt('Name for the new '+typeLabel+' board:');
        if(!name || !name.trim()) return;
        var newId=await _sboardCreateRootBoard(name.trim(), _sboardActiveBoardType());
        if(newId) _sboardSwitchToRootBoard(newId);
      });
      addRow.appendChild(addBtn);
      menu.appendChild(addRow);
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    };
  }

  // PARENT's fast-jump arrow, Sept 5 2026 -- Larry: "matching arrow and
  // vertical dropdown list, just like PROJECT dropdown." Walks cluster_id
  // up from the current Topic through the in-memory whole-account cache
  // (_sboardAllRowsById -- same cache _sboardProjectHeaderChoices just
  // above reads off of, and the same one _sboardGoUpOneLevel/
  // _sboardCanGoUpFromTopic already climb one link at a time), collecting
  // every ancestor along the way. Stops naturally at the current
  // project's own root (a root row's cluster_id is null, same boundary
  // _sboardCanGoUpFromTopic already checks) rather than climbing on into
  // other projects -- PROJECT's own dropdown already owns that job, and
  // letting PARENT climb past the project root was exactly the behavior
  // the July 16 2026 fix removed (see the comment on the plain PARENT
  // click wiring, above) because it duplicated PROJECT. The root row
  // itself IS included as the furthest entry, though -- it's still one
  // real, single click away today, so it belongs in "every level above,"
  // same reach as clicking Parent repeatedly would eventually get you.
  //
  // Same day, follow-up -- Larry: "the top parent on the list should be
  // the highest level." Walking cluster_id naturally collects nearest-
  // ancestor-first (immediate parent, then its parent, and so on up to
  // the root last) -- reversed before returning so the list itself reads
  // top-to-bottom as highest-to-nearest, matching how the arrow now sits
  // on the LEFT of Parent (see the header markup above): the levels that
  // come before the current parent, read in that order.
  //
  // Sept 6 2026, Larry: "the up arrow never needs to go above the actual
  // project ... it simply addresses the parents in this specific
  // project" -- the root row itself (Idea Storyboards) used to be
  // included as the furthest, topmost entry; it no longer is. A
  // candidate ancestor is only added while it still has a cluster_id of
  // its own (i.e. it's a real level inside this project) -- the moment
  // the climb reaches the shared account-wide root, that break happens
  // before the push, so the list stops at the project's own root card
  // (e.g. "Field Guide") and never shows one level past it. Standing
  // right at that root card now correctly shows "Nothing above this."
  function _sboardParentAncestorChoices(){
    var list=[];
    var row=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    var curId=row?(row.cluster_id||null):null;
    var guard=0;
    while(curId && guard<50){
      guard++;
      var ancestor=_sboardAllRowsById[curId];
      if(!ancestor || !ancestor.cluster_id) break;
      list.push(ancestor);
      curId=ancestor.cluster_id||null;
    }
    return list.reverse();
  }
  function _sboardWireParentAncestorDropdown(){
    var trigger=document.getElementById('sc-parent-caret'), menu=document.getElementById('sc-parent-menu');
    if(!trigger || !menu) return;
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-parent-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      var choices=_sboardParentAncestorChoices();
      menu.innerHTML='';
      if(!choices.length){
        var empty=document.createElement('div');
        empty.className='sc-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent='Nothing above this.';
        menu.appendChild(empty);
      } else {
        choices.forEach(function(h){
          var row=document.createElement('div');
          row.className='sc-cdrop-row';
          row.textContent=h.text_content||'(untitled)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.hidden=true;
            _sboardDrillInto(h);
          });
          menu.appendChild(row);
        });
      }
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    };
  }

  // TOPIC's down-arrow, Sept 6 2026 -- Larry: "UP and DOWN ARROWS, just
  // like on BB." Descend counterpart to the up-arrow just above (this
  // board already had "jump to any level above"; it never had a
  // matching "jump straight to a child layer by name" until now).
  // Mirrors BB's own bb-topic-caret/_bbTopicChildChoices exactly --
  // direct children of the current TOPIC (cluster_id = the topic's own
  // id), content_type 'header' only, same reserved-bucket exclusion as
  // every other Header list on this board (_sboardProjectHeaderChoices,
  // above), sorted the same real on-board order (_sboardBySortOrder).
  // Reads off the already-cached _sboardAllRowsById rather than a fresh
  // query -- BB has to query live since it doesn't keep this board's
  // whole-account cache around, but Idea Board already does (same
  // shortcut _sboardParentAncestorChoices takes for the up-arrow).
  var SBOARD_TOPIC_CHILD_RESERVED={'NEW':1,'New Additions':1,'Parking Lot':1,'COLLABORATOR':1,'STAKEHOLDER':1,'MISC':1,'Purpose':1,'Trash':1,'Archived':1};
  function _sboardTopicChildChoices(){
    var topicId=T2TShared.currentTopicId;
    if(!topicId) return [];
    return Object.keys(_sboardAllRowsById)
      .map(function(k){ return _sboardAllRowsById[k]; })
      .filter(function(r){ return r && r.content_type==='header' && String(r.cluster_id)===String(topicId) && !SBOARD_TOPIC_CHILD_RESERVED[r.text_content]; })
      .sort(_sboardBySortOrder);
  }
  function _sboardWireTopicChildDropdown(){
    var trigger=document.getElementById('sc-topic-caret-down'), menu=document.getElementById('sc-topic-child-menu');
    if(!trigger || !menu) return;
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-topic-child-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      var choices=_sboardTopicChildChoices();
      menu.innerHTML='';
      if(!choices.length){
        var empty=document.createElement('div');
        empty.className='sc-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent='No layers beneath this one yet.';
        menu.appendChild(empty);
      } else {
        choices.forEach(function(h){
          var row=document.createElement('div');
          row.className='sc-cdrop-row';
          row.textContent=h.text_content||'(untitled)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.hidden=true;
            _sboardDrillInto(h);
          });
          menu.appendChild(row);
        });
      }
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    };
  }

  // TOPIC hierarchy menu, Sept 19 2026 -- Larry: "make the Idea Board's
  // ID Band exactly like BB's." Mirrors BB's own _bbTopicTreeRows/
  // _bbWireTopicTree (briefing-board-master-nav.js, itself Larry's same-
  // day "What if click on TOPIC displays the hierarchy of headers for
  // entire project with highlight on current header in TOPIC position?"),
  // just synchronous -- the Idea Board already keeps every row cached in
  // _sboardAllRowsById (BB has to query live, level by level, since it
  // doesn't keep this board's whole-account cache around; see that
  // function's own comment), so the whole tree can be walked straight
  // off the cache with no round trip. Same reserved-name exclusion every
  // other header list on this board already uses (SBOARD_TOPIC_CHILD_
  // RESERVED, just above), same on-board sort order (_sboardBySortOrder).
  // Capped at 8 levels / 400 headers, same guard BB's own version uses,
  // so a runaway cluster_id cycle can never lock the page up.
  function _sboardTopicTreeRows(){
    var curId=T2TShared.currentTopicId;
    if(!curId || !_sboardAllRowsById[curId]) return [];
    // 1. Climb to this project's own root -- same stop rule as
    //    _sboardParentAncestorChoices/BB's own _bbTopicTreeRows: the root
    //    is the header whose parent has no parent of its own (that
    //    parent is the shared account root, not a real level of the
    //    project).
    var rootId=curId, guard=0;
    while(guard<50){
      guard++;
      var info=_sboardAllRowsById[rootId];
      if(!info || !info.cluster_id) break;
      var parentInfo=_sboardAllRowsById[info.cluster_id];
      if(!parentInfo || !parentInfo.cluster_id) break;
      rootId=info.cluster_id;
    }
    if(!_sboardAllRowsById[rootId]) return [];
    // 2. Walk the tree depth-first straight off the cache.
    var rows=[], total=0;
    (function walk(id, depth){
      if(depth>8 || total>=400) return;
      var row=_sboardAllRowsById[id];
      if(!row) return;
      rows.push({id:id, name:row.text_content||'(untitled)', depth:depth});
      total++;
      var children=Object.keys(_sboardAllRowsById)
        .map(function(k){ return _sboardAllRowsById[k]; })
        .filter(function(r){ return r && r.content_type==='header' && String(r.cluster_id)===String(id) && !SBOARD_TOPIC_CHILD_RESERVED[r.text_content]; })
        .sort(_sboardBySortOrder);
      children.forEach(function(c){ walk(c.id, depth+1); });
    })(rootId, 0);
    return rows;
  }
  // PROJECT PYRAMID, Sept 20 2026 -- Larry: the flat, fully-expanded
  // list _sboardTopicTreeRows produced (still just above, left as-is
  // and no longer called) reads fine for one project but is
  // overwhelming once TOPIC is MASTER, since it flattens every
  // project's whole tree into one list at once. These two helpers feed
  // window.TopicPyramid (topic-pyramid.js) instead: the straight climb
  // of ancestors above the current Topic, and (lazily, one level at a
  // time as each row's arrow is opened) its descendants below. Both
  // read off the same already-cached _sboardAllRowsById the old flat
  // list did -- no extra fetch, any depth, instantly.
  function _sboardPyramidAncestors(topicId){
    var chain=[], guard=0;
    var curRow=topicId?_sboardAllRowsById[topicId]:null;
    var parentId=curRow?curRow.cluster_id:null;
    while(parentId && guard<50){
      guard++;
      var row=_sboardAllRowsById[parentId];
      if(!row) break;
      chain.unshift({id:row.id, name:row.text_content||'(untitled)', priority:row.priority||''});
      parentId=row.cluster_id;
    }
    return chain;
  }
  function _sboardPyramidChildren(parentId){
    return Object.keys(_sboardAllRowsById)
      .map(function(k){ return _sboardAllRowsById[k]; })
      .filter(function(r){ return r && r.content_type==='header' && String(r.cluster_id)===String(parentId) && !SBOARD_TOPIC_CHILD_RESERVED[r.text_content]; })
      .sort(_sboardBySortOrder)
      .map(function(r){ return {id:r.id, name:r.text_content||'(untitled)', priority:r.priority||''}; });
  }
  function _sboardWireTopicTree(){
    var trigger=document.getElementById('sc-topic-box'), menu=document.getElementById('sc-topic-menu');
    if(!trigger || !menu) return;
    // addEventListener, not .onclick -- sc-topic-box already carries its
    // own triple-click page-number reveal listener (wired separately,
    // near injectSeaOfIdeasCluster's own end), and this needs to run
    // alongside it, not replace it.
    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      if(!T2TShared.currentTopicId) return; // root prompt -- nothing to show
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-topic-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      var curRow=_sboardAllRowsById[T2TShared.currentTopicId];
      if(!curRow || !window.TopicPyramid) return;
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      var currentRow=window.TopicPyramid.render(menu, {
        ancestors:_sboardPyramidAncestors(T2TShared.currentTopicId),
        current:{id:curRow.id, name:curRow.text_content||'(untitled)', priority:curRow.priority||''},
        getChildren:function(id){ return _sboardPyramidChildren(id); },
        onNavigate:function(id){
          menu.hidden=true;
          if(_sboardAllRowsById[id]) _sboardDrillInto(_sboardAllRowsById[id]);
        }
      });
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(200,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      if(currentRow && currentRow.scrollIntoView) currentRow.scrollIntoView({block:'center'});
    });
  }

  // ID Band row layout, Sept 19 2026 -- Larry: "make the Idea Board's ID
  // Band exactly like BB's." Mirrors BB's own _bbPositionIdBandRow
  // (briefing-board-master-nav.js) in full: PROJECT-TOPIC-STORYBOARD as
  // one left-to-right chain, SC_ID_BAND_GAP apart, centered as a group on
  // the header -- clamped so it never runs under the identity block on
  // the left or the Logo/Utility/Close row on the right -- replacing the
  // old 3-column grid (TOPIC) and fixed top:50%/left:75% position
  // (STORYBOARD) that used to drift apart on a narrow window or a long
  // project/topic name. Same "measure the real boxes, clamp against a
  // hard edge" shape, same ResizeObserver safety net for any future
  // async width change (a late member name, a font swap), same
  // document.fonts.ready re-run once real fonts have actually loaded.
  var SC_ID_BAND_GAP = 10;
  var _sboardIdBandObserverSetUp=false;
  function _sboardSetUpIdBandObserver(projectWrap, topicWrap, idnEl, actionsEl, container){
    if(_sboardIdBandObserverSetUp || typeof ResizeObserver==='undefined') return;
    _sboardIdBandObserverSetUp=true;
    var pending=false;
    var ro=new ResizeObserver(function(){
      if(pending) return;
      pending=true;
      requestAnimationFrame(function(){
        pending=false;
        try{
          var scr=document.getElementById('s-sea-of-ideas-cluster');
          if(scr && scr.classList.contains('active')) _sboardPositionIdBandRow();
        }catch(e){}
      });
    });
    [projectWrap, topicWrap, idnEl, actionsEl, container].forEach(function(el){ if(el) ro.observe(el); });
  }
  // Shrink STORYBOARD's own label to whatever room is actually left once
  // Project, Topic, and the two gaps between all three are accounted
  // for -- same shared FGFitFontSize one-line shrink every other board
  // title already uses (text-fit.js), mirroring _bbFitBoardKindLabel.
  function _sboardFitBoardKindLabel(availableWidthPx){
    var trigger=document.getElementById('sc-board-kind-trigger');
    if(!trigger || !window.FGFitFontSize) return;
    trigger.style.fontSize='';
    if(!availableWidthPx || availableWidthPx<=0) return;
    var cs=getComputedStyle(trigger);
    var baseSize=parseFloat(cs.fontSize)||36;
    var fitted=window.FGFitFontSize(trigger.textContent, availableWidthPx, {
      base:baseSize, min:Math.max(14, Math.round(baseSize*0.4)), step:0.5,
      fontFamily:cs.fontFamily, fontWeight:cs.fontWeight, oneLine:true
    });
    if(fitted<baseSize) trigger.style.fontSize=fitted+'px';
  }
  function _sboardPositionIdBandRow(){
    var projectWrap=document.getElementById('sc-project-wrap');
    var topicWrap=document.getElementById('sc-topic-wrap');
    var boardkindWrap=document.getElementById('sc-boardkind-wrap');
    var idnEl=document.getElementById('sc-idn');
    var actionsEl=document.querySelector('#s-sea-of-ideas-cluster .sc-hdr-side');
    var container=document.getElementById('sc-header-area');
    if(!projectWrap || !topicWrap || !boardkindWrap || !actionsEl || !container) return;
    _sboardSetUpIdBandObserver(projectWrap, topicWrap, idnEl, actionsEl, container);
    var containerRect=container.getBoundingClientRect();
    // Guard against a not-yet-laid-out screen -- nothing real to measure
    // yet, leave the CSS fallback (top:0;left:0) in place.
    if(!containerRect.width) return;

    var pr=projectWrap.getBoundingClientRect();
    var tr=topicWrap.getBoundingClientRect();
    var ar=actionsEl.getBoundingClientRect();
    if(!pr.width || !tr.width) return;

    var available=containerRect.width-pr.width-tr.width-(SC_ID_BAND_GAP*3);
    _sboardFitBoardKindLabel(Math.max(24, available));

    var br=boardkindWrap.getBoundingClientRect();
    if(!br.width) return;

    var totalWidth=pr.width+SC_ID_BAND_GAP+tr.width+SC_ID_BAND_GAP+br.width;
    var rightLimit=ar.left-SC_ID_BAND_GAP;
    var leftLimit=containerRect.left;
    if(idnEl){
      var idr=idnEl.getBoundingClientRect();
      if(idr.width) leftLimit=Math.max(leftLimit, idr.right+SC_ID_BAND_GAP);
    }
    var preferredLeft=containerRect.left+(containerRect.width-totalWidth)/2;
    var groupLeft=Math.min(Math.max(preferredLeft, leftLimit), Math.max(leftLimit, rightLimit-totalWidth));

    var x=groupLeft;
    projectWrap.style.left=(x-containerRect.left)+'px'; x+=pr.width+SC_ID_BAND_GAP;
    topicWrap.style.left=(x-containerRect.left)+'px'; x+=tr.width+SC_ID_BAND_GAP;
    boardkindWrap.style.left=(x-containerRect.left)+'px';

    // PROJECT and STORYBOARD bottom-justify with the Logo/Utility/Close
    // row's own real bottom edge; TOPIC centers vertically on the band --
    // same vertical-alignment rule BB locked in Sept 16 2026 (see that
    // function's own comment, briefing-board-master-nav.js).
    if(ar.height){
      [projectWrap, boardkindWrap].forEach(function(el){
        var r=el.getBoundingClientRect();
        if(r.height) el.style.top=(ar.bottom-r.height-containerRect.top)+'px';
      });
    }
    var trNow=topicWrap.getBoundingClientRect();
    if(trNow.height && containerRect.height){
      topicWrap.style.top=((containerRect.height-trNow.height)/2)+'px';
    }
  }
  window.addEventListener('resize', function(){
    try{
      var scr=document.getElementById('s-sea-of-ideas-cluster');
      if(scr && scr.classList.contains('active')) _sboardPositionIdBandRow();
    }catch(e){}
  });
  if(window.document && document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      try{
        var scr=document.getElementById('s-sea-of-ideas-cluster');
        if(scr && scr.classList.contains('active')) _sboardPositionIdBandRow();
      }catch(e){}
    });
  }

  // Picking PLAN, Aug 26 2026 (Larry: "duplicate a Project Idea Board, put
  // the card numbers on the front of the cards and make every card
  // without a verb pink," clarified: the PLAN board this dropdown already
  // promised, built as a one-time duplicate of the current IDEA project).
  // First pick builds it; every pick after that just reopens the same
  // Plan board -- later Idea-board edits are never pulled in automatically
  // (Larry's call), so nothing done there is ever silently overwritten.
  async function _sboardOpenOrCreatePlanBoard(){
    var ideaRow=_sboardCurrentProjectRow();
    if(!ideaRow){ _sboardShowToast('Open a project first.'); return; }
    if(ideaRow.storyboard_kind==='PLAN') return; // already there -- no-op, matches IDEA's own re-pick behavior
    var _sb=T().sb;
    try{
      var existing=await _sb.from('ideas').select('id').eq('content_type','header').is('cluster_id',null)
        .eq('storyboard_kind','PLAN').eq('source_project_id', ideaRow.id).limit(1);
      if(existing.error) throw existing.error;
      if(existing.data && existing.data.length){
        var freshExisting=await _sb.from('ideas').select('*').eq('id', existing.data[0].id).maybeSingle();
        if(freshExisting.error) throw freshExisting.error;
        // Sept 21 2026 fix -- Larry: "Selected Website project, then Plan
        // but topic changed to PROJECTS as did the project?? Should have
        // been Website Plan." Root cause: this row is fetched straight
        // from Supabase and was never written into _sboardAllRowsById
        // (the account-wide cache _sboardProjectRowFor/chrome-render climb
        // off), so the very next chrome refresh couldn't find it, fell
        // into the "unknown topic" branch of _sboardUpdateHeaderChrome,
        // and showed the root-level MASTER/PROJECTS labels instead of the
        // Plan board's own project. _sboardJumpToProjectKind already does
        // this caching correctly (line ~1430) -- same fix, applied here.
        if(freshExisting.data){
          _sboardAllRowsById[freshExisting.data.id]=freshExisting.data;
          _sboardDrillInto(freshExisting.data);
        }
        return;
      }
      // Aug 27 2026, Larry: first time building a Plan board for a project,
      // offer a choice instead of always duplicating -- Duplicate carries
      // over every Header/Subber/card from the Idea board (the original
      // Aug 26 behavior, unchanged); Start Blank makes only the root row
      // (same project identity -- color/logo/board_type/org_name/name --
      // since Design Notes already treats those as one-per-project, shared
      // by Idea and Plan) with no cards under it. Same "duplicates/creates
      // once, then only reopens" rule either way -- this choice only shows
      // when no Plan board exists yet for this project.
      _sboardOpenPlanStartChoice(ideaRow);
    }catch(err){
      _sboardShowToast('Could not open the Plan board — '+(err&&err.message?err.message:'try again'));
    }
  }

  // Reusable first-time "how do you want to start this board" chooser.
  // Built for PLAN today; any future board type (e.g. an untimed
  // Path/Roadmap kind, if that gets built) can call this the same way --
  // just pass its own kindLabel/duplicateFn/blankFn.
  function _sboardOpenPlanStartChoice(ideaRow){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Start this Plan board</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">Copy everything over from the Idea board to build on, or start from a clean slate.</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px">'
      +'<button class="sc-ov-btn save" id="sb-plan-start-copy" style="width:100%">Duplicate from Idea board</button>'
      +'<button class="sc-ov-btn" id="sb-plan-start-blank" style="width:100%">Start Blank</button>'
      +'<button class="sc-ov-btn" id="sb-plan-start-cancel" style="width:100%">Cancel</button>'
      +'</div></div>';
    ov.classList.add('active');
    T().wire('sb-plan-start-cancel', closeSbDetail);
    T().wire('sb-plan-start-copy', async function(){
      closeSbDetail();
      _sboardShowToast('Building your Plan board…');
      try{
        var newRoot=await _sboardDuplicateProjectAsPlan(ideaRow);
        // Sept 21 2026 fix -- see the matching comment in
        // _sboardOpenOrCreatePlanBoard above: a brand-new row has to be
        // cached before drilling into it, or the chrome can't find it and
        // falls back to the root-level MASTER/PROJECTS labels.
        _sboardAllRowsById[newRoot.id]=newRoot;
        _sboardDrillInto(newRoot);
      }catch(err){
        _sboardShowToast('Could not open the Plan board — '+(err&&err.message?err.message:'try again'));
      }
    });
    T().wire('sb-plan-start-blank', async function(){
      closeSbDetail();
      _sboardShowToast('Building your Plan board…');
      try{
        var newRoot=await _sboardCreateBlankPlanBoard(ideaRow);
        _sboardAllRowsById[newRoot.id]=newRoot;
        _sboardDrillInto(newRoot);
      }catch(err){
        _sboardShowToast('Could not open the Plan board — '+(err&&err.message?err.message:'try again'));
      }
    });
  }

  // Blank-start counterpart to _sboardDuplicateProjectAsPlan below: same
  // root row (same project identity), but no child Headers/Subbers/cards
  // copied over -- an empty Plan board ready to build from scratch.
  async function _sboardCreateBlankPlanBoard(ideaRoot){
    var _sb=T().sb;
    var authRes=await _sb.auth.getUser();
    var user=authRes && authRes.data && authRes.data.user;
    if(!user) throw new Error('not signed in');
    var rootIns=await _sb.from('ideas').insert({
      user_id:user.id, content_type:'header', text_content:ideaRoot.text_content||'(untitled)',
      cluster_id:null, color:ideaRoot.color||null, board_type:ideaRoot.board_type||null,
      org_name:ideaRoot.org_name||null, locked:!!ideaRoot.locked,
      logo_url:ideaRoot.logo_url||null, logo_w:ideaRoot.logo_w||null, logo_h:ideaRoot.logo_h||null,
      storyboard_kind:'PLAN', source_project_id:ideaRoot.id,
      track_on_briefing_board:false, created_at:new Date().toISOString()
    }).select().single();
    if(rootIns.error) throw rootIns.error;
    return rootIns.data;
  }

  // Picking IDEA while standing on a PLAN board jumps back to the IDEA
  // project it was duplicated from (the only way back in, since PLAN
  // boards are deliberately left out of the PROJECT switcher -- see
  // topLevelBoards() in header-data.js). A no-op anywhere else, matching
  // IDEA's original "needs no action when re-picked" behavior.
  async function _sboardReturnToIdeaBoard(){
    var row=_sboardCurrentProjectRow();
    if(!row || row.storyboard_kind!=='PLAN' || !row.source_project_id) return;
    var cached=_sboardAllRowsById[row.source_project_id];
    if(cached){ _sboardDrillInto(cached); return; }
    try{
      var _sb=T().sb;
      var fresh=await _sb.from('ideas').select('*').eq('id', row.source_project_id).maybeSingle();
      if(fresh.data) _sboardDrillInto(fresh.data);
      else _sboardShowToast('Could not find the original Idea board.');
    }catch(err){ _sboardShowToast('Could not find the original Idea board.'); }
  }

  // Cross-file jump, Aug 30 2026 -- bridged as window.T2TStoryboard.
  // jumpToProjectKind so briefing-board.js's own top-center board-kind
  // dropdown can land on a specific project's Idea or Plan board from a
  // completely different screen. Does its own fetch-then-navigate
  // instead of trusting the caller to already have the row or to have
  // switched screens first: fetches the one project row fresh (it's a
  // project root, so _sboardProjectRowFor below resolves to itself with
  // no ancestor climb -- no need to wait on the full account-wide cache
  // _sboardCurrentProjectRow() usually depends on), switches to the
  // Storyboard screen, then either drills straight in (IDEA), hands off
  // to the existing Plan-board opener (PLAN) -- same "duplicate or
  // start blank" first-time choice that opener already gives when
  // there's no Plan board yet -- or opens the project's Cast (team
  // roster) popup on top of it (CAST, added Sept 4 2026 for the
  // STORYBOARDS tray's own Cast button -- same popup every card's
  // 👥 icon already opens, just aimed at the project root itself
  // instead of one particular card). Returns true/false so the caller
  // can toast on failure; never throws.
  async function _sboardJumpToProjectKind(projectId, kind){
    if(!projectId) return false;
    // Sept 4 2026 (later session), Larry: "going to the Idea Board, all
    // boards is critical!" -- same instant-feedback fix as
    // _ideaOpenBoardResume (idea-media-shared.js): this function fetches
    // the project row over the network BEFORE it ever calls nav(), so a
    // click on Plan or Cast (STORYBOARDS tray) sat there with nothing
    // visible happening for however long that fetch took, same silent-
    // stall risk Larry hit on Idea. Spinner now shows the instant the
    // click happens, not just once the fetch resolves.
    if (window.T2T && window.T2T.showTravelSpinner) window.T2T.showTravelSpinner();
    var _sb=T().sb;
    try{
      var res=await _sb.from('ideas').select('*').eq('id', projectId).maybeSingle();
      if(res.error || !res.data) return false;
      var row=res.data;
      if(window.T2T && window.T2T.nav) window.T2T.nav('s-sea-of-ideas-cluster');
      _sboardAllRowsById[row.id]=row;
      _sboardDrillInto(row);
      if(kind==='CAST') await openCallSheet(row, null, 'idea', null, null, null);
      if(kind==='PLAN') await _sboardOpenOrCreatePlanBoard();
      return true;
    }catch(err){ return false; }
  }

  // Full recursive copy of an IDEA project into a brand-new PLAN project:
  // every Header/Subber/idea card, in the same shape, under fresh ids.
  // Runs off _sboardAllRowsById (already holds every row this traveler can
  // see, account-wide -- see the paged fetch above), so no extra network
  // round-trip is needed just to find what's in this project.
  //
  // Deliberate choices, all Aug 26 2026:
  // - track_on_briefing_board is force-cleared on every duplicated row.
  //   The DB's own ideas_sync_header_task_card trigger auto-creates a real
  //   Briefing Board + cards for any top-row Header with that flag set --
  //   duplicating a project with it left on would silently spawn a second,
  //   shadow Briefing Board the moment this insert lands. The Plan
  //   Storyboard is its own thing; it doesn't feed that system.
  // - heart_count resets to 0 -- hearts are an ideation-favoriting signal,
  //   not meaningful groundwork for a plan.
  // - assigned_user_id, color, locked, and text all carry over as-is.
  // - a card's color is overridden to PLAN_NO_VERB_COLOR only when
  //   _planCardHasVerb() finds nothing verb-like in its text (headers are
  //   never checked -- "Purpose"/"MEDIA" aren't task phrasing).
  // - key_slot_1/2/3 are remapped to their new-id counterpart when the
  //   card they point at was also duplicated (a second pass, once every
  //   id in the project has one), otherwise dropped -- a slot pointing
  //   outside this project has nothing sensible to remap to.
  // - collaborators (storyboard_members) are NOT copied -- the Plan board
  //   starts owned solely by whoever duplicated it; Larry can add people
  //   back via the same Manage Access flow as any other project.
  async function _sboardDuplicateProjectAsPlan(ideaRoot){
    var _sb=T().sb;
    var authRes=await _sb.auth.getUser();
    var user=authRes && authRes.data && authRes.data.user;
    if(!user) throw new Error('not signed in');

    var childrenByParent={};
    Object.keys(_sboardAllRowsById).forEach(function(id){
      var r=_sboardAllRowsById[id];
      if(r && r.cluster_id){ (childrenByParent[r.cluster_id]=childrenByParent[r.cluster_id]||[]).push(r); }
    });
    function bySortOrder(a,b){ return (a.sort_order||0)-(b.sort_order||0); }

    var rootIns=await _sb.from('ideas').insert({
      user_id:user.id, content_type:'header', text_content:ideaRoot.text_content||'(untitled)',
      cluster_id:null, color:ideaRoot.color||null, board_type:ideaRoot.board_type||null,
      org_name:ideaRoot.org_name||null, locked:!!ideaRoot.locked,
      // Logo/artwork, Aug 26 2026 -- carried over at duplicate time same as
      // color/board_type/org_name above, so a brand-new Plan board opens
      // already showing its project's logo instead of blank. One-time
      // copy only, same "duplicates once, never resyncs" rule as the rest
      // of PLAN -- swapping the logo on one board doesn't touch the other.
      // logo_w/logo_h (Aug 27 2026, resize build) ride along the same way --
      // a Plan board opens at whatever size the Idea board's logo was last
      // dragged to, not forced back to the 46px default.
      logo_url:ideaRoot.logo_url||null,
      logo_w:ideaRoot.logo_w||null, logo_h:ideaRoot.logo_h||null,
      storyboard_kind:'PLAN', source_project_id:ideaRoot.id,
      track_on_briefing_board:false, created_at:new Date().toISOString()
    }).select().single();
    if(rootIns.error) throw rootIns.error;
    var newRoot=rootIns.data;

    var idMap={}; idMap[ideaRoot.id]=newRoot.id;
    var oldRowById={}; oldRowById[ideaRoot.id]=ideaRoot;

    var frontier=[ideaRoot.id], guard=0;
    while(frontier.length && guard<40){
      guard++;
      var nextFrontier=[];
      for(var f=0; f<frontier.length; f++){
        var oldParentId=frontier[f];
        var kids=(childrenByParent[oldParentId]||[]).slice().sort(bySortOrder);
        for(var i=0;i<kids.length;i++){
          var k=kids[i];
          var hasVerb = k.content_type==='header' ? true : _planCardHasVerb(k.text_content);
          var kIns=await _sb.from('ideas').insert({
            user_id:user.id,
            content_type:k.content_type,
            image_url:k.image_url||null,
            text_content:k.text_content||null,
            cluster_id:idMap[oldParentId],
            notes:k.notes||null,
            heart_count:0,
            sort_order:k.sort_order||0,
            color: hasVerb ? (k.color||null) : PLAN_NO_VERB_COLOR,
            locked:!!k.locked,
            assigned_user_id:k.assigned_user_id||null,
            link_url:k.link_url||null,
            link_title:k.link_title||null,
            link_thumb:k.link_thumb||null,
            track_on_briefing_board:false,
            storyboard_kind:'PLAN',
            created_at:new Date().toISOString()
          }).select().single();
          if(kIns.error) throw kIns.error;
          idMap[k.id]=kIns.data.id;
          oldRowById[k.id]=k;
          nextFrontier.push(k.id);
        }
      }
      frontier=nextFrontier;
    }

    // Second pass: remap key_slot_1/2/3 for every duplicated row that had
    // one, now that idMap is complete.
    var remaps=Object.keys(oldRowById).filter(function(oldId){
      var r=oldRowById[oldId];
      return r.key_slot_1||r.key_slot_2||r.key_slot_3;
    });
    for(var m=0;m<remaps.length;m++){
      var oldId=remaps[m], oldRow=oldRowById[oldId];
      var patch={};
      if(oldRow.key_slot_1 && idMap[oldRow.key_slot_1]) patch.key_slot_1=idMap[oldRow.key_slot_1];
      if(oldRow.key_slot_2 && idMap[oldRow.key_slot_2]) patch.key_slot_2=idMap[oldRow.key_slot_2];
      if(oldRow.key_slot_3 && idMap[oldRow.key_slot_3]) patch.key_slot_3=idMap[oldRow.key_slot_3];
      if(Object.keys(patch).length){ await _sb.from('ideas').update(patch).eq('id', idMap[oldId]); }
    }

    return newRoot;
  }

  function _sboardRenderDropdown(triggerId, menuId, options, currentValue, onSelect, onAdd, addTitle, onRemove, removeTitle){
    var trigger=document.getElementById(triggerId), menu=document.getElementById(menuId);
    if(!trigger || !menu) return;
    var current=options.filter(function(o){ return String(o.value)===String(currentValue); })[0];
    trigger.textContent = current ? current.label : (options[0] ? options[0].label : '—');
    menu.innerHTML='';
    options.forEach(function(o){
      var row=document.createElement('div');
      row.className='sc-cdrop-row'+(current && String(current.value)===String(o.value) ? ' active' : '');
      row.textContent=o.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onSelect(o.value);
      });
      menu.appendChild(row);
    });
    var addRow=document.createElement('div');
    addRow.className='sc-cdrop-addrow';
    var addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='sc-dotted-add-btn';
    addBtn.title=addTitle||'Add';
    addBtn.textContent='+';
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      menu.hidden=true;
      onAdd();
    });
    addRow.appendChild(addBtn);
    if(onRemove){
      var removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='sc-dotted-add-btn sc-dotted-remove-btn';
      removeBtn.title=removeTitle||'Remove';
      removeBtn.textContent='\u2212';
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onRemove();
      });
      addRow.appendChild(removeBtn);
    }
    menu.appendChild(addRow);
    // Moved to <body> so position:fixed has nothing above it in the DOM
    // that could re-trap it in a low stacking context -- see the
    // .sc-cdrop-menu CSS note above. Idempotent: harmless if already there.
    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?menuId:null);
      if(willOpen){
        var r=trigger.getBoundingClientRect();
        menu.style.left=r.left+'px';
        menu.style.top=(r.bottom+4)+'px';
        menu.style.minWidth=Math.max(120,r.width)+'px';
        menu.hidden=false;
        // Clamp to the viewport's right edge for longer Title names.
        var mr=menu.getBoundingClientRect();
        if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      } else {
        menu.hidden=true;
      }
    };
  }

  // ORGANIZATION, Aug 15 2026, corrected again -- mirrors the
  // Briefing Board's own fix exactly: the eyebrow WORD ITSELF is the
  // dropdown (clicking "ORGANIZATION" opens the category menu, and the
  // word then becomes whatever category was chosen -- e.g.
  // "DEPARTMENT"). The field below is a separate, plain name for that
  // category (e.g. "Accounting"), no longer combined into one button.
  // sc-type-trigger/sc-type-menu now live on the eyebrow button itself
  // (_sboardRenderTypePicker, unchanged) -- this function only handles
  // the plain Name box underneath.
  // Org Name, Aug 16 2026 -- same fix as the Briefing Board, same day:
  // Type/Title/View all open as a real dropdown, Org Name alone jumped
  // straight to a prompt(). Rebuilt on _sboardRenderDropdown like the
  // other three -- lists other names already used on roots of this
  // same Type, (+) still opens the rename prompt, (-) clears the name.
  function _sboardOrgNameOptions(boardType){
    var seen={}, opts=[];
    (_sboardMyRoots||[]).forEach(function(r){
      if((r.board_type||'personal')!==boardType) return;
      var n=(r.org_name||'').trim();
      if(!n || seen[n]) return;
      seen[n]=true; opts.push({value:n, label:n});
    });
    return opts;
  }
  function _sboardRenderOrgName(){
    var trigger=document.getElementById('sc-org-name-trigger');
    if(_sboardPendingTypeOverride){
      // Browsing an empty Type, Aug 16 2026 -- no real root exists to
      // attach a name to, so (+) has to create the first root of this
      // Type rather than just save a field on one.
      var typeVal=_sboardPendingTypeOverride;
      var opts0=_sboardOrgNameOptions(typeVal);
      _sboardRenderDropdown('sc-org-name-trigger','sc-org-name-menu', opts0, null, function(){ /* nothing to select onto yet */ }, async function(){
        var typeLabel0=_sboardTypeLabel(typeVal);
        var name0=window.prompt('Name for this '+typeLabel0+' (e.g. "Accounting" or "Denver Broncos"):', '');
        if(!name0 || !name0.trim()) return;
        var trimmed0=name0.trim();
        var newId=await _sboardCreateRootBoard(trimmed0, typeVal);
        if(newId){
          _sboardSwitchToRootBoard(newId);
          var created=(_sboardMyRoots||[]).filter(function(r){ return r.id===newId; })[0];
          if(created) await _sboardSaveOrgName(trimmed0, created);
        }
      }, 'Add a name', function(){
        // (-) while browsing an empty Type, Aug 16 2026 -- same fix as
        // the Briefing Board, same day: both (+) and (-) always show.
        // Nothing to delete yet, so this backs out of the browse.
        _sboardPendingTypeOverride=null;
        _sboardRenderTypePicker();
        _sboardRenderOrgName();
        _sboardRenderTitlePicker();
      }, 'Stop browsing this Type');
      if(trigger) trigger.textContent='Add a name';
      return;
    }
    var curRoot=_sboardCurrentRootRow();
    // Aug 30 2026 fix -- self, not the organizational parent (see
    // _sboardOrgContextRoot's own comment): an adopted child's own Org
    // Name field, not its parent's.
    var match=curRoot?_sboardSelfRoot(curRoot.id):null;
    if(!match) return;
    var current=(match.org_name||'').trim();
    var opts=_sboardOrgNameOptions(match.board_type||'personal');
    _sboardRenderDropdown('sc-org-name-trigger','sc-org-name-menu', opts, current||null, function(newName){
      _sboardSaveOrgName(newName, match);
    }, async function(){
      var typeLabel=_sboardTypeLabel(match.board_type||'personal');
      var name=window.prompt('Name for this '+typeLabel+' (e.g. "Accounting" or "Denver Broncos"):', match.org_name||'');
      if(name===null) return;
      await _sboardSaveOrgName(name, match);
      _sboardRenderOrgName();
    }, 'Add a name', current ? function(){
      _sboardSaveOrgName('', match);
    } : null, 'Remove this name');
    if(trigger && !current) trigger.textContent='Add a name';
  }
  async function _sboardSaveOrgName(value, rootOverride){
    var curRoot=_sboardCurrentRootRow();
    var match=rootOverride || (curRoot?_sboardSelfRoot(curRoot.id):null);
    if(!match) return;
    var trimmed=(value||'').trim();
    if((match.org_name||'')===trimmed) return;
    match.org_name=trimmed;
    _sboardRenderOrgName();
    var _sb=T().sb;
    try{
      var upd=await _sb.from('ideas').update({org_name:trimmed||null}).eq('id', match.id);
      if(upd.error) console.error('Idea Board: could not save Organization name', upd.error);
    }catch(e){ console.error('Idea Board: could not save Organization name', e); }
  }

  // Sept 13 2026 -- belt-and-suspenders alongside the _sboardLoadMyRoots
  // fix above: even with that fixed, nothing stopped some OTHER future
  // gap in _sboardLoadMyRoots from putting this same re-trigger-on-every-
  // call shape back into a same-tab-freezing loop. This flag makes that
  // failure mode impossible regardless of what _sboardLoadMyRoots does or
  // doesn't set: at most one fetch-and-retry is ever in flight, so even a
  // _sboardMyRoots that never becomes truthy just leaves the picker empty
  // once, instead of spinning the tab forever.
  var _sboardTypePickerRootsPending=false;
  function _sboardRenderTypePicker(){
    var roots=_sboardMyRoots;
    if(!roots){
      if(!_sboardTypePickerRootsPending){
        _sboardTypePickerRootsPending=true;
        _sboardLoadMyRoots().then(function(){ _sboardTypePickerRootsPending=false; _sboardRenderTypePicker(); _sboardRenderOrgName(); _sboardRenderTitlePicker(); });
      }
      roots=[];
    }
    var extra=_sboardExtraBoardTypes(roots);
    var opts=_sboardVisibleFixedTypes(roots).concat(extra.map(function(v){ return {value:v, label:_sboardTypeLabel(v)}; }));
    var activeType=_sboardActiveBoardType();
    _sboardRenderDropdown('sc-type-trigger','sc-type-menu', opts, activeType, async function(newType){
      var rts=await _sboardLoadMyRoots();
      var matching=rts.filter(function(r){ return (r.board_type||'personal')===newType; });
      if(matching.length){
        _sboardPendingTypeOverride=null;
        await _sboardSwitchToRootBoardPreservingKind(matching[0].id);
      } else {
        // Aug 16 2026 -- same fix as the Briefing Board, same day: an
        // empty Type browses the same as a full one, dropdown and all.
        _sboardPendingTypeOverride=newType;
        _sboardRenderTypePicker();
        _sboardRenderOrgName();
        _sboardRenderTitlePicker();
      }
    }, async function(){
      var typeName=window.prompt('Name for the new Type (e.g. "Client", "Household"):');
      if(!typeName || !typeName.trim()) return;
      var typeValue=typeName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || ('type_'+Date.now());
      var firstBoardName=window.prompt('Name for the first '+typeName.trim()+' board:');
      if(!firstBoardName || !firstBoardName.trim()) return;
      var newId=await _sboardCreateRootBoard(firstBoardName.trim(), typeValue);
      if(newId) _sboardSwitchToRootBoard(newId);
    }, 'Add a type', function(){
      // Remove, Aug 15 2026 -- mirrors the Briefing Board's own
      // _bbHideType exactly (same shared org_type_hidden table).
      var removable=_sboardVisibleFixedTypes(roots).filter(function(t){ return t.value!==activeType; });
      if(!removable.length){ window.alert('Nothing left to remove.'); return; }
      var listText=removable.map(function(t){ return t.label; }).join(', ');
      var typeName=window.prompt('Which Type would you like to remove from the list? ('+listText+')\n\nAny board already using it keeps working either way.');
      if(!typeName || !typeName.trim()) return;
      var hit=removable.filter(function(t){ return t.label.toLowerCase()===typeName.trim().toLowerCase(); })[0];
      if(!hit){ window.alert('Didn\'t recognize "'+typeName.trim()+'" -- type the name exactly as shown.'); return; }
      _sboardHideType(hit.value);
    }, 'Remove a type');
  }

  // TITLE picker, Aug 13 2026 -- Larry: "the next field is TITLE." Lists
  // this traveler's real boards (headers already filtered through
  // _sboardIsRealBoard, so NEW/MISC/Trash/Purpose/Idea Session Protocol
  // never show up here) scoped to whichever Type is currently selected --
  // same relationship Briefing Board's Title/Type pair already has.
  // Adopted children of a given board (Aug 16 2026), resolved through
  // briefing_board_id -- mirrors the Briefing Board's _bbChildBoardsOf.
  // A child not yet linked (no briefing_board_id set, e.g. an older
  // board from before this pass) is silently skipped rather than
  // shown as broken; run the link backfill instead of guessing here.
  function _sboardChildBoardsOf(briefingBoardId){
    if(!briefingBoardId) return [];
    var childBBIds=_sboardRelationsCache.filter(function(r){ return r.parent_board_id===briefingBoardId; }).map(function(r){ return r.child_board_id; });
    return (_sboardMyRoots||[]).filter(function(r){ return r.briefing_board_id && childBBIds.indexOf(r.briefing_board_id)!==-1; });
  }

  function _sboardRenderTitlePicker(){
    // Retired from the visible chrome, Sept 2 2026 -- Larry: "Top Project
    // for each member = IDEA STORYBOARDS. The HEADERS for that board are
    // the PROJECTS plus COLLABORATOR and STAKEHOLDER." PROJECT no longer
    // switches between several separate top-level roots (that's what
    // this whole picker was for) -- every member has exactly one root
    // now (their Idea Storyboards board, see ensureIdeaStoryboardsRoot in
    // header-data.js), and what used to be separate "projects" are just
    // Headers reached by drilling in, same as any other Header. The
    // sc-title-trigger button in the chrome is now a fixed "Idea
    // Storyboards" label that opens openProjectSwitcher (the real global
    // shortcut popup) on click -- see the one-time wiring in
    // injectSeaOfIdeasCluster and _sboardRenderMemberName's sibling call
    // in _sboardUpdateHeaderChrome. Left as a real no-op rather than
    // deleted -- several other flows in this file still call this
    // defensively (after creating/hiding a board, etc.); those calls are
    // harmless now. Full removal of this function, and of the Type/Org
    // Name plumbing it was paired with, is the already-planned org_name/
    // board_type retirement task, not part of today's change.
    return;
    // eslint-disable-next-line no-unreachable
    var roots=_sboardMyRoots;
    if(!roots){
      _sboardLoadMyRoots().then(function(){ _sboardRenderTitlePicker(); });
      roots=[];
    }
    var activeType=_sboardActiveBoardType();
    var curRoot=_sboardCurrentRootRow();
    // Aug 30 2026 fix -- same root cause as _sboardOrgContextRoot above:
    // curRoot.id can be a PLAN board's own id, which never appears in
    // `roots` (IDEA-only). selfRoot resolves the shared identity (the
    // PLAN -> source_project_id hop) WITHOUT the extra climb to an
    // organizational parent -- that's what gets matched/selected below,
    // since the board actually open has to be the one that shows as
    // current, or clicking the very board you're standing on (its
    // parent's label showing instead) looks like a dead click (Larry:
    // "I changed T2T project to Field Guide project and nothing
    // happened" -- he was already on Field Guide, its parent T2T was
    // just showing in the label). orgRoot keeps the parent climb --
    // still needed just below to pull in the rest of the family.
    var selfRoot=curRoot?_sboardSelfRoot(curRoot.id):null;
    var orgRoot=curRoot?_sboardOrgContextRoot(curRoot.id):null;
    var filtered=roots.filter(function(r){ return (r.board_type||'personal')===activeType; });
    // Adopted children ride along too, Aug 16 2026 -- Larry: PROJECT must
    // be identical no matter which screen a board is opened from. Same
    // dedup-by-id as the Briefing Board's matching fix. Resolved off the
    // org-context root (later same day), not the literally-open one, so
    // opening a project shows the same family list as opening its parent.
    // Skipped while browsing an empty Type (_sboardPendingTypeOverride) --
    // there's no real context root yet.
    if(!_sboardPendingTypeOverride){
      var children=_sboardChildBoardsOf(orgRoot&&orgRoot.briefing_board_id);
      children.forEach(function(c){ if(!filtered.some(function(r){ return r.id===c.id; })) filtered=filtered.concat([c]); });
    }
    var opts=filtered.map(function(r){ return {value:r.id, label:r.text_content||'(untitled)'}; });
    // (-) on the PROJECT field, Aug 16 2026 -- mirrors the Briefing
    // Board's own hub exactly (Larry: "3 choices even if they do not
    // all work yet"). Only offered when a real, currently-open root is
    // actually showing in this list -- not while browsing an empty
    // Type.
    var canRemoveRoot=!_sboardPendingTypeOverride && selfRoot && filtered.some(function(r){ return r.id===selfRoot.id; });
    _sboardRenderDropdown('sc-title-trigger','sc-title-menu', opts, selfRoot?selfRoot.id:null, function(id){
      _sboardSwitchToRootBoardPreservingKind(id);
    }, async function(){
      var typeLabel=_sboardTypeLabel(_sboardActiveBoardType());
      var name=window.prompt('Name for the new '+typeLabel+' board:');
      if(!name || !name.trim()) return;
      var newId=await _sboardCreateRootBoard(name.trim(), _sboardActiveBoardType());
      if(newId) _sboardSwitchToRootBoard(newId);
    }, 'Add a board', canRemoveRoot ? function(){
      openSbProjectHub(selfRoot.id);
    } : null, 'Remove this project');
  }

  // Project Hub, Aug 16 2026 -- Storyboard mirror of the Briefing
  // Board's own hub. Reuses the shared one-off popup shell
  // (#sb-detail-overlay/closeSbDetail) rather than a dedicated overlay,
  // matching how every other small Storyboard dialog is built. Move
  // detaches this project from its current parent via
  // detach_board_relation (same RPC, same shared board_relations data
  // as the Briefing Board) -- but the Storyboard doesn't have its own
  // Relationships manager to pick a *new* parent yet, so Move hands
  // that step off to the Briefing Board's existing 🔗 Relationships
  // button rather than duplicating that whole request/approve UI here.
  // Archive/Trash are stubs, same as the Briefing Board's.
  async function _sboardReloadRelationsCache(){
    var sb=T().sb; if(!sb) return;
    try{
      var relRes=await sb.from('board_relations').select('*').eq('status','approved');
      _sboardRelationsCache=relRes.error?_sboardRelationsCache:(relRes.data||[]);
    }catch(e){ console.warn('Idea Board: could not reload board relations', e); }
  }
  function openSbProjectHub(rootId){
    var root=(_sboardMyRoots||[]).filter(function(r){ return r.id===rootId; })[0];
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">Remove Project</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">'+_sboardEsc(root?(root.text_content||'This project'):'This project')+'</div>'
      +'<button class="sc-ov-btn" id="sb-hub-move-btn" style="width:100%;margin-bottom:8px;padding:10px">🔀 Move to another parent</button>'
      +'<button class="sc-ov-btn" id="sb-hub-archive-btn" style="width:100%;margin-bottom:8px;padding:10px">📁 Archive this project</button>'
      +'<button class="sc-ov-btn" id="sb-hub-trash-btn" style="width:100%;margin-bottom:8px;padding:10px">🗑️ Trash this project</button>'
      +'<div id="sb-hub-msg" style="font-size:calc(10px * var(--fg-text-scale,1));color:#5b9bd5;margin-bottom:8px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-hub-close" style="width:100%">Close</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-hub-close', closeSbDetail);
    T().wire('sb-hub-move-btn', async function(){
      var msg=document.getElementById('sb-hub-msg');
      var bbId=root&&root.briefing_board_id;
      var parentRel=bbId?_sboardRelationsCache.filter(function(r){ return r.child_board_id===bbId; })[0]:null;
      if(parentRel){
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('detach_board_relation', {p_relation_id: parentRel.id});
          if(res.error){ if(msg) msg.textContent=res.error.message||'Could not detach from the current parent.'; return; }
        }catch(e){ console.warn('Idea Board: could not detach board relation', e); if(msg) msg.textContent='Could not detach from the current parent.'; return; }
        await _sboardReloadRelationsCache();
        _sboardRenderTitlePicker();
        _sboardRenderOrgName();
      }
      if(msg) msg.textContent='Detached. Open the Briefing Board\'s 🔗 Relationships button to pick a new parent for this project.';
    });
    T().wire('sb-hub-archive-btn', function(){
      var msg=document.getElementById('sb-hub-msg');
      if(msg) msg.textContent='Archiving a whole project isn\'t built yet -- for now you can archive individual cards inside it.';
    });
    // Session 251 (Aug 26), Larry: "When someone says to TRASH a
    // project, TRASH it! but give them one chance to change their
    // mind." Real delete via the trash_project() RPC (added this same
    // session) -- one confirm, then gone: every header/Subber/card in
    // the project, its Briefing Board, and (recursively) any PLAN board
    // duplicated off it. No undo, same as trashing a single header.
    T().wire('sb-hub-trash-btn', function(){
      var name=_sboardEsc(root?(root.text_content||'this project'):'this project');
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:8px">Trash &ldquo;'+name+'&rdquo;?</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">This permanently deletes the whole project -- every header, Subber, and card in it, plus its Briefing Board. This can\'t be undone.</div>'
        +'<div id="sb-hub-trash-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-hub-trash-go" style="flex:1;background:#b8562f;border-color:#b8562f">Trash it</button><button class="sc-ov-btn" id="sb-hub-trash-cancel" style="flex:1">Cancel</button></div>'
        +'</div>';
      T().wire('sb-hub-trash-cancel', closeSbDetail);
      T().wire('sb-hub-trash-go', async function(){
        var sb=T().sb; if(!sb) return;
        var errBox=document.getElementById('sb-hub-trash-err');
        try{
          var res=await sb.rpc('trash_project', {p_project_id: rootId});
          if(res.error) throw res.error;
          closeSbDetail();
          await _sboardLoadMyRoots(true);
          var fallback=(_sboardMyRoots||[])[0];
          if(fallback) _sboardSwitchToRootBoard(fallback.id);
          else _sboardShowToast('Project trashed.');
        }catch(err){
          if(errBox) errBox.textContent=(err&&err.message)?err.message:'Could not trash this project.';
        }
      });
    });
  }

  // VIEW-by-person filter (Aug 9 2026, Larry): the board-level counterpart
  // to Person Assigned above -- same roster source (_tmAllRosterRows).
  // Purely a display filter: narrows which idea/text/image/link cards
  // render, never touches sort_order or what's saved, and never hides
  // headers/Subbers (they're navigation scaffolding, not person-filterable
  // content). Session 255: the header's own VIEW/Team dropdown (and
  // Briefing Board's matching one) is gone -- checking someone in the Cast
  // popup (👥, on every card) is now the only way to set this filter.
  // Session 255: any role counts now, not just the ★ primary doer --
  // Larry: being recognized as a Stakeholder carries its own weight, not
  // just the doing roles. _sboardFilterMatchCardIds is resolved by
  // _sboardRecomputeFilterMatches (a real card_roles query, since "any
  // role, any checked person" can't be read off the cheap primary-doer
  // cache the old single-person filter used) -- called right before
  // renderSeaBoard(true) wherever the checked set changes.
  function _sboardFilterByPerson(items){
    if(!_sboardPersonFilterIds || !_sboardPersonFilterIds.length) return items;
    if(!_sboardFilterMatchCardIds) return items;
    return items.filter(function(r){ return _sboardFilterMatchCardIds.has(String(r.id)); });
  }

  async function _sboardRecomputeFilterMatches(){
    if(!_sboardPersonFilterIds || !_sboardPersonFilterIds.length){ _sboardFilterMatchCardIds=null; return; }
    var _sb=T().sb; if(!_sb){ _sboardFilterMatchCardIds=new Set(); return; }
    try{
      var res=await _sb.from('card_roles').select('card_id').eq('card_type','idea').in('user_id', _sboardPersonFilterIds);
      var set=new Set();
      (res.data||[]).forEach(function(r){ set.add(String(r.card_id)); });
      _sboardFilterMatchCardIds=set;
    }catch(e){ _sboardFilterMatchCardIds=new Set(); }
  }

  // VIEW head-icon button, Sept 19 2026 -- Larry: "Drop LOGO field to left
  // of return and replace with single head icon button just like on BB.
  // People can be assigned headers on an IDEA board too." Same idea as
  // BB's own bb-view-trigger (_bbSyncViewTriggerLabel/_bbWireViewDropdown,
  // briefing-board-master-nav.js), scaled to what the Idea Board already
  // has rather than rebuilt from scratch: the roster comes from
  // _tmAllRosterRows (idea-storyboard-people.js) -- the same Cast roster
  // the Call Sheet popup already loads via _tmLoadRoster -- and checking a
  // row here writes straight into the board's own existing
  // _sboardPersonFilterIds and calls _sboardRecomputeFilterMatches, the
  // exact two calls the Cast popup's own checkboxes already make
  // (idea-storyboard-people.js:2019-2023). Deliberately simpler than BB's
  // _bbAssignedRosterRows: this doesn't also union in people who only have
  // a card_roles row without a roster seat -- the board roster (Owner +
  // Cast) is what "assigned a header" means here, and can be widened later
  // if that turns out to matter.
  var _sboardViewMenuRowsCache = [];
  function _sboardSyncViewTriggerLabel(){
    var trigger=document.getElementById('sc-view-trigger');
    if(!trigger) return;
    var ids=_sboardPersonFilterIds||[];
    trigger.classList.toggle('sc-view-on', ids.length>0);
    var label;
    if(!ids.length){
      label='everyone';
    } else {
      var pool=_sboardViewMenuRowsCache||[];
      var row=ids.length===1 ? pool.filter(function(m){ return String(m.user_id)===String(ids[0]); })[0] : null;
      label=ids.length===1 ? ((row&&(row.name||row.email))||'1 person') : ids.length+' people';
    }
    trigger.title='View: '+label;
    trigger.setAttribute('aria-label','View — showing '+label);
  }
  function _sboardWireViewFilterDropdown(){
    var trigger=document.getElementById('sc-view-trigger'), menu=document.getElementById('sc-view-menu');
    if(!trigger || !menu) return;
    async function openMenu(){
      var projectRow=_sboardCurrentProjectRow();
      if(projectRow) await _tmLoadRoster(projectRow);
      var rows=projectRow ? _tmAllRosterRows(projectRow) : [];
      _sboardViewMenuRowsCache=rows;
      menu.innerHTML='';
      var allRow=document.createElement('div');
      allRow.className='sc-cdrop-row'+((!_sboardPersonFilterIds || !_sboardPersonFilterIds.length) ? ' active' : '');
      allRow.textContent='All';
      allRow.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        _sboardPersonFilterIds=[];
        _sboardPersistViewFilter();
        _sboardSyncViewTriggerLabel();
        _sboardRecomputeFilterMatches().then(function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); });
      });
      menu.appendChild(allRow);
      rows.forEach(function(m){
        var checked=!!(_sboardPersonFilterIds && _sboardPersonFilterIds.indexOf(String(m.user_id))>=0);
        var row=document.createElement('label');
        row.className='sc-cdrop-row sc-view-person-row';
        row.innerHTML='<input type="checkbox" class="sc-view-person-chk"'+(checked?' checked':'')+'> <span>'+_esc9710(m.name||m.email||'(unnamed)')+'</span>';
        var chk=row.querySelector('input');
        chk.addEventListener('change', function(){
          var uid=String(m.user_id);
          _sboardPersonFilterIds=_sboardPersonFilterIds||[];
          var idx=_sboardPersonFilterIds.indexOf(uid);
          if(chk.checked && idx<0) _sboardPersonFilterIds.push(uid);
          if(!chk.checked && idx>=0) _sboardPersonFilterIds.splice(idx,1);
          _sboardPersistViewFilter();
          allRow.className='sc-cdrop-row'+((!_sboardPersonFilterIds || !_sboardPersonFilterIds.length) ? ' active' : '');
          _sboardSyncViewTriggerLabel();
          _sboardRecomputeFilterMatches().then(function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); });
        });
        row.addEventListener('click', function(e){ e.stopPropagation(); });
        menu.appendChild(row);
      });
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(120,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    }
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sc-view-menu':null);
      if(willOpen) openMenu(); else menu.hidden=true;
    };
    _sboardSyncViewTriggerLabel();
  }

  // Project switcher — added July 12, 2026. PROJECT was previously a
  // fixed-anchor label only; this makes it a real lateral jump between
  // top-level projects (the flat Top Banana root list), not just a return
  // to the current project's own root.
  // PROJECT (Selection) — renamed from "Project switcher" and reshaped
  // August 1, 2026 per Larry's PROJECT screen spec: title is simply
  // PROJECT, current project marked with a checkmark, X-only dismiss (no
  // Cancel button), and a clearly separate "+ NEW PROJECT" section. Two
  // parts on one screen: pick an existing project, or start a new one.
  // Sept 2, 2026 -- IDEA STORYBOARDS placement architecture (Sessions
  // 264-265 design lock): PROJECT becomes the global shortcut into all
  // of it. The flat list now mixes this traveler's own top-level
  // Headers (self-originated, from topLevelBoards -- unchanged) with
  // Headers they've been promoted into as PRIMARY (T2TData.
  // promotedPrimaryEntries -- carries an ownership eyebrow, since it
  // isn't their own project) and any project where they're a 🔑 Key
  // Stakeholder (one-click fast access, per the design lock -- plain
  // Stakeholder and Cast Member placements still require opening the
  // STAKEHOLDER/COLLABORATOR group below). Both group rows are always
  // shown, same as any other reserved header (Purpose, MISC) always
  // being present, so they're a predictable, discoverable part of the
  // list rather than appearing only once something lands in them.
  async function openProjectSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var boards=await T2TData.topLevelBoards();
    var promoted=[]; var collab=[]; var stake=[];
    try{ promoted=await T2TData.promotedPrimaryEntries(); }catch(e){ console.warn('promotedPrimaryEntries failed:', e); }
    try{ collab=await T2TData.collaboratorEntries(); }catch(e){ console.warn('collaboratorEntries failed:', e); }
    try{ stake=await T2TData.stakeholderEntries(); }catch(e){ console.warn('stakeholderEntries failed:', e); }
    // Sept 12 2026, Larry: unified the app's two "special stakeholder"
    // flags into one -- isKeyStakeholder (card_roles.is_key), same 🔑
    // Key Stakeholder toggle already on the Call Sheet roster. Not
    // exclusive -- Larry: a whole board of directors can each hold it at
    // once ("we cannot have just one and not the others -- politics").
    // ★ is its own separate thing again (Primary Doer, card_roles.
    // is_primary) -- reserved for whoever's actually doing the work, not
    // shown in this popup's eyebrow at all; PRIMARY here means the
    // accountable role (promotedPrimaryEntries, above).
    var keyStakeItems=stake.filter(function(s){ return s.isKeyStakeholder; });

    // One normalized shape for every row this popup can show: id,
    // text_content, user_id (so the existing owner-only quick-menu
    // logic keeps working unchanged), and an optional small label
    // (the ownership eyebrow, or a Key Stakeholder tag).
    var allTop=boards.map(function(b){
      return {id:b.id, text_content:b.text_content, user_id:b.user_id, label:null};
    }).concat(promoted.map(function(p){
      return {id:p.id, text_content:p.text, user_id:p.ownerUserId, label:(p.ownerName||p.ownerInitials||'shared with you')};
    })).concat(keyStakeItems.map(function(s){
      return {id:s.id, text_content:s.text, user_id:s.ownerUserId, label:'🔑 Key Stakeholder — '+(s.ownerName||s.ownerInitials||'shared')};
    }));
    allTop=allTop.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var currentProjectId=null;
    if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
      var pr=_sboardProjectRowFor(_sboardAllRowsById[T2TShared.currentTopicId]);
      currentProjectId=pr?pr.id:null;
    }
    var rows=allTop.map(function(b){
      var isCur=String(b.id)===String(currentProjectId);
      var cur=isCur?' current':'';
      var mark=isCur?'<span style="color:#0F6E56;margin-right:4px">✓</span>':'';
      var eyebrow=b.label?('<div style="font-size:calc(9px * var(--fg-text-scale,1));color:#a89a80;line-height:1.2">'+b.label.replace(/</g,'&lt;')+'</div>'):'';
      return '<div class="sb-hdr-vitem'+cur+'" data-pid="'+b.id+'"><div>'+mark+(b.text_content||'(untitled)')+'</div>'+eyebrow+'</div>';
    }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
    // MASTER, pinned above the real projects, Sept 6 2026 -- Larry:
    // "What used to be Idea Storyboards is now PROJECTS and should top
    // the projects list." Its own row, own click wiring (below) -- not
    // part of allTop, so it skips the Rename/Archive/Delete quick menu
    // every real project gets on double-click (there's nothing to
    // rename/archive/delete here, it's the shared root every project
    // sits under).
    // Sept 7 2026, Larry: relabeled MASTER, matching the plain PROJECT
    // eyebrow and the caret dropdown's own pinned root row (see this
    // file's other Sept 7 notes) -- the "+ NEW PROJECT" add control
    // further down in this same popup is untouched, still there exactly
    // as before, this only changes the pinned row's own displayed word.
    var isAtRoot=_sboardIdeaStoryboardsRootId && String(currentProjectId)===String(_sboardIdeaStoryboardsRootId);
    var pinnedRow=_sboardIdeaStoryboardsRootId
      ? '<div class="sb-hdr-vitem'+(isAtRoot?' current':'')+'" id="sb-proj-pinned-root" style="font-weight:700;border-bottom:1px solid #e0dcd0;margin-bottom:4px;padding-bottom:8px"><div>'+(isAtRoot?'<span style="color:#0F6E56;margin-right:4px">✓</span>':'')+'MASTER</div></div>'
      : '';
    rows=pinnedRow+rows;
    var groupRows=''
      +'<div class="sb-hdr-vitem" data-group="collaborator">COLLABORATOR<span style="float:right;color:#a89a80">'+collab.length+'</span></div>'
      +'<div class="sb-hdr-vitem" data-group="stakeholder">STAKEHOLDER<span style="float:right;color:#a89a80">'+stake.length+'</span></div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="position:relative;margin-bottom:10px">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;letter-spacing:1px">PROJECT</div>'
      +'<button class="sc-ov-btn" id="sb-proj-close-x" aria-label="Close" style="position:absolute;right:-4px;top:-6px;padding:2px 8px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1">✕</button>'
      +'</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:6px">'+rows+'</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;margin-bottom:10px">'+groupRows+'</div>'
      +'<div style="font-size:calc(9px * var(--fg-text-scale,1));color:#a89a80;text-align:left;margin-bottom:10px">Double-click a project you own to rename, archive, or delete it.</div>'
      +'<div style="border-top:1px solid #e0dcd0;margin:0 0 10px"></div>'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;color:#7a6040;margin-bottom:4px;text-align:left">+ NEW PROJECT</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-proj-new-input" type="text" placeholder="Project name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-proj-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-proj-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:0;min-height:12px"></div>'
      +'</div>';
    // Positioned along the left side, near the Project chrome it was opened
    // from, rather than dead-center — added July 12, 2026. Reset in
    // closeSbDetail so other popups that use this same overlay aren't
    // affected by the override.
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
      // Single click switches (after a short window to give a following
      // click the chance to become a double-click instead); double-click
      // opens the Rename/Archive/Delete quick menu. Added August 1, 2026.
      row.addEventListener('click', function(e){
        // e.detail is 2 (or more) on the second click of a double-click --
        // fires synchronously, before the browser's separate 'dblclick'
        // event, so this cancels the pending single-click switch right
        // away instead of racing it. Fixes a bug where a fast double-click
        // still switched into the project as TOPIC because the switch
        // timer won the race against 'dblclick' arriving. Fixed August 1,
        // 2026.
        if(e.detail && e.detail>1){
          if(row._sbProjClickTimer){ clearTimeout(row._sbProjClickTimer); row._sbProjClickTimer=null; }
          return;
        }
        if(row._sbProjClickTimer) return;
        row._sbProjClickTimer=setTimeout(function(){
          row._sbProjClickTimer=null;
          var pid=row.getAttribute('data-pid');
          var boardRow=allTop.find(function(b){ return String(b.id)===String(pid); });
          closeSbDetail();
          if(boardRow) _sboardDrillInto(boardRow);
        }, 300);
      });
      row.addEventListener('dblclick', function(e){
        e.stopPropagation();
        if(row._sbProjClickTimer){ clearTimeout(row._sbProjClickTimer); row._sbProjClickTimer=null; }
        var pid=row.getAttribute('data-pid');
        var boardRow=allTop.find(function(b){ return String(b.id)===String(pid); });
        if(boardRow) _sboardProjectQuickMenu(boardRow);
      });
    });
    (function(){
      var pinnedEl=document.getElementById('sb-proj-pinned-root');
      if(pinnedEl) pinnedEl.addEventListener('click', function(e){
        e.stopPropagation();
        closeSbDetail();
        if(_sboardIdeaStoryboardsRootId) _sboardDrillInto({id:_sboardIdeaStoryboardsRootId});
      });
    })();
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-group]'), function(row){
      row.addEventListener('click', async function(){
        var which=row.getAttribute('data-group');
        closeSbDetail();
        try{
          var rootId=await T2TData.ensureIdeaStoryboardsRoot();
          if(!rootId) return;
          var groupId=(which==='collaborator')
            ? await T2TData.ensureCollaboratorHeader(rootId)
            : await T2TData.ensureStakeholderHeader(rootId);
          if(groupId) _sboardDrillInto({id:groupId});
        }catch(err){ _sboardShowToast('Could not open '+which+' — try again.'); }
      });
    });
    T().wire('sb-proj-close-x', closeSbDetail);
    T().wire('sb-proj-new-go', async function(){
      var errEl=document.getElementById('sb-proj-err');
      var nameInput=document.getElementById('sb-proj-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        // Sept 5 2026 -- routed through the same _sboardCreateRootBoard
        // every other "new project" entry point already uses (Add-a-board
        // in the PROJECT dropdown, the empty-Type prompt), instead of this
        // box's own separate insert. That old insert skipped two things
        // the shared path handles: giving the project a real board_type
        // (was landing as null here) and creating its paired Briefing
        // Board at all -- the mirror insert in _sboardCreateRootBoard
        // requires a board_type (not-null column), so a project with no
        // type silently never got a Briefing Board, with nothing telling
        // Larry it happened. Found when three projects made through this
        // exact box (Art Class, Everything = Energy, Laptop Considerations)
        // turned out to have no Briefing Board behind them -- backfilled
        // separately; this is what stops it happening again.
        var newId=await _sboardCreateRootBoard(name, _sboardActiveBoardType());
        if(!newId) return;
        closeSbDetail();
        _sboardDrillInto({id:newId});
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // Project quick menu — Rename / Archive / Delete, reached only by
  // double-clicking a row in PROJECT (never a bare single click, matching
  // the same "nothing can be trashed directly" gating already locked for
  // Headers). Cancel returns to the PROJECT list, not a full close — a
  // traveler cleaning up several projects in one sitting shouldn't have to
  // reopen PROJECT from scratch each time. Added August 1, 2026.
  // Aug 4 2026, Larry: Storyboard sharing -- a member added to someone
  // else's PROJECT can reach this same quick menu, but Rename/Archive/
  // Delete stay owner-only (RLS already blocks the writes; this just
  // avoids showing controls that would only fail). Manage Access is
  // owner-only too, same split already locked for the Briefing Board.
  async function _sboardProjectQuickMenu(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(boardRow.text_content||'(untitled)').replace(/</g,'&lt;');
    var _sb=T().sb;
    var me=null; try{ me=(await _sb.auth.getUser()).data.user; }catch(e){}
    var isOwner=!!me && boardRow.user_id===me.id;
    var body='<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+safeName+'</div>';
    if(isOwner){
      body+='<button class="sc-ov-btn" id="sb-pq-rename" style="width:100%;margin-bottom:6px">Rename</button>'
        +'<button class="sc-ov-btn" id="sb-pq-archive" style="width:100%;margin-bottom:6px">Archive</button>'
        +'<button class="sc-ov-btn" id="sb-pq-delete" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Delete</button>';
    } else {
      // Guests/View Access retired Sept 12 2026, Larry: "remove the
      // People screen ... CAST is our source of truth" -- a shared
      // project's own Cast (Call Sheet) is the one place access is
      // granted or checked now.
      body+='<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Shared with you -- only the owner can rename, archive, or delete this project.</div>';
    }
    body+='<button class="sc-ov-btn" id="sb-pq-cancel" style="width:100%">Cancel</button>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'+body+'</div>';
    ov.classList.add('active');
    T().wire('sb-pq-cancel', openProjectSwitcher);
    if(isOwner){
      T().wire('sb-pq-rename', function(){ _sboardProjectRenamePrompt(boardRow); });
      T().wire('sb-pq-archive', async function(){
        try{
          var archivedId=await T2TData.ensureArchivedHeader();
          var upd=await _sb.from('ideas').update({cluster_id:archivedId}).eq('id',boardRow.id).select();
          if(upd.error) throw upd.error;
          if(String(T2TShared.currentTopicId||'')===String(boardRow.id)){
            T2TShared.currentTopicId=null; T2TShared.filter=null;
          }
          openProjectSwitcher();
        }catch(err){
          var errBox=document.querySelector('.sc-overlay-card');
          if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
        }
      });
      T().wire('sb-pq-delete', function(){ _sboardConfirmDeleteProject(boardRow); });
    }
  }

  // Manage Access / Guests retired Sept 12 2026, Larry: "remove the
  // People screen ... CAST is our source of truth." storyboard_members
  // still exists in the database (nothing there was deleted), but
  // nothing in the app writes to it anymore -- a project's own Cast
  // (Call Sheet) is the one door in now.

  // Rename a Project in place — same "nothing is permanent" treatment as
  // Header rename. Returns to the (refreshed) PROJECT list on save or
  // close, not a full dismiss. Added August 1, 2026.
  function _sboardProjectRenamePrompt(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeVal=(boardRow.text_content||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">Rename Project</div>'
      +'<input id="sb-proj-rename-input" type="text" value="'+safeVal+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div id="sb-proj-rename-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-proj-rename-go" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-proj-rename-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('sb-proj-rename-input');
    if(input) setTimeout(function(){ input.focus(); input.select(); }, 0);
    T().wire('sb-proj-rename-close', openProjectSwitcher);
    T().wire('sb-proj-rename-go', async function(){
      var errEl=document.getElementById('sb-proj-rename-err');
      var name=(input&&input.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var _sb=T().sb;
        var upd=await _sb.from('ideas').update({text_content:name}).eq('id',boardRow.id).select();
        if(upd.error) throw upd.error;
        boardRow.text_content=name;
        openProjectSwitcher();
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // Delete a Project — gated behind an explicit second confirmation, same
  // pattern already locked for Header trash. Reuses the exact same Trash
  // mechanic (reparent under the reserved Trash bucket) rather than a hard
  // delete, so nothing is ever unrecoverable. Added August 1, 2026.
  //
  // Session 247 (Aug 26), Larry: "Trashing a whole project isn't built yet
  // — for now you can trash individual cards inside it." This function and
  // the PROJECT switcher screen it lives behind (openProjectSwitcher) sat
  // as real code with no live entry point anywhere in the UI for several
  // sessions. Sept 2 2026: now wired live -- the chrome's PROJECT field
  // (sc-title-trigger) opens openProjectSwitcher on click (see the
  // one-time wiring in injectSeaOfIdeasCluster). Whole-project delete/
  // rename/archive (this function, _sboardProjectRenamePrompt,
  // _sboardProjectQuickMenu) are reachable from there now too.
  function _sboardConfirmDeleteProject(boardRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(boardRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Delete "'+safeName+'"?</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Everything in it moves to Trash too — you can pull it back out later from Trash.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-pdel-go" style="flex:1;background:#b8562f;border-color:#b8562f">Delete it</button><button class="sc-ov-btn" id="sb-pdel-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-pdel-cancel', openProjectSwitcher);
    T().wire('sb-pdel-go', async function(){
      try{
        var trashId=await T2TData.ensureTrashHeader();
        var _sb=T().sb;
        var upd=await _sb.from('ideas').update({cluster_id:trashId}).eq('id',boardRow.id).select();
        if(upd.error) throw upd.error;
        if(String(T2TShared.currentTopicId||'')===String(boardRow.id)){
          T2TShared.currentTopicId=null; T2TShared.filter=null;
        }
        openProjectSwitcher();
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
      }
    });
  }

  function _sboardNextClusterNumber(){
    var max=0;
    _sboardHeaderList.forEach(function(h){
      var m=/^Cluster (\d+)$/i.exec(h.text_content||'');
      if(m){ var n=parseInt(m[1],10); if(n>max) max=n; }
    });
    return max+1;
  }

  function _sboardBySortOrder(a,b){
    var ao=(a.sort_order===null||a.sort_order===undefined)?Infinity:a.sort_order;
    var bo=(b.sort_order===null||b.sort_order===undefined)?Infinity:b.sort_order;
    return ao-bo;
  }

  function _sboardByAlpha(a,b){
    return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase(), undefined, {numeric:true, sensitivity:'base'});
  }

  // Makes a sibling group's ORDER # real and permanent -- Larry, Aug 3
  // 2026: "What if every card has an ORDER #... the order number does NOT
  // change." A number that only ever comes from the null-sort_order
  // fallback (creation order / priority tie-break) isn't a stable number
  // yet -- the moment ANY member of a group is still relying on that
  // fallback, this writes the group's current (already-correct) order
  // as real sort_order values for every member, fire-and-forget, so from
  // this render on the badge below is reading a genuine persisted
  // position, not a guess that could shift if the fallback's own
  // tie-break ever changed.
  function _sboardBackfillSortOrder(orderedRows){
    var needsBackfill=orderedRows.some(function(r){ return r.sort_order===null||r.sort_order===undefined; });
    if(!needsBackfill) return;
    var _sb=T().sb;
    orderedRows.forEach(function(r,i){
      if(r.sort_order!==i){
        r.sort_order=i;
        _sb.from('ideas').update({sort_order:i}).eq('id',r.id).then(function(){}, function(){});
      }
    });
  }

  // Same idea as _sboardBackfillSortOrder just above, but for a column
  // that used to be TWO independently-numbered groups (Subbers, then plain
  // cards) now being treated as ONE. Aug 22 2026 (Larry: "sub-headers
  // always cluster to the top... I want to mix them into the story").
  // Straight reuse of _sboardBackfillSortOrder would miss the real
  // problem here: every row already HAS a real sort_order (no nulls), it's
  // just that the two old groups each started counting from 0, so a
  // Subber and a card can easily share the same number -- sorting the
  // combined list by that alone still clusters them. This checks that the
  // given order (whatever it already is -- callers pass it in exactly
  // today's on-screen order, Subbers then cards, so nothing visually jumps
  // the first time this runs) is a real, strictly increasing sequence with
  // no collisions, and only if it isn't, renumbers every row 0..n-1 to
  // match that order for good. Once a column's been through this, its
  // values stay strictly increasing on their own (every reorder writes a
  // fresh clean 0..n-1 sequence), so this is a one-time migration per
  // column, not a rewrite on every render.
  function _sboardBackfillColumnOrder(orderedRows){
    var needsWrite=false, prev=-Infinity;
    for(var i=0;i<orderedRows.length;i++){
      var so=orderedRows[i].sort_order;
      if(so===null||so===undefined||so<=prev){ needsWrite=true; break; }
      prev=so;
    }
    if(!needsWrite) return;
    var _sb=T().sb;
    orderedRows.forEach(function(r,i){
      if(r.sort_order!==i){
        r.sort_order=i;
        _sb.from('ideas').update({sort_order:i}).eq('id',r.id).then(function(){}, function(){});
      }
    });
  }

  // Small on-card badge -- Larry, Aug 3 2026: "small, no bigger that Notes
  // field" (see .sb-notes-pill, 12px). orderedIds must always be the REAL
  // persisted order (post-backfill), never whatever order the row is
  // currently being DISPLAYED in -- that's what keeps this number
  // unchanged while a board is being viewed alphabetically.
