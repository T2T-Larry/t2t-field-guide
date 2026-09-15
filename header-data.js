/* ============================================================
   header-data.js — T2T Field Guide shared header/project data layer
   Extracted July 11, 2026 during the FOCUS module rebuild.
   Single source of truth for reading and writing the header tree
   (ideas table, content_type='header'). Both focus.js and
   sea-of-ideas.js depend on this instead of each keeping their own
   copy — that duplication is exactly what caused this session's
   RLS/user-id bugs (one copy used the wrong user object).
   Load this file before sea-of-ideas.js and focus.js.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  function _sb(){ return T().sb; }

  async function _currentUser(){
    var res=await _sb().auth.getUser();
    return (res && res.data && res.data.user) || null;
  }

  /* Sept 13 2026 -- Larry found alfredenewman@madmag.com with two
     "COLLABORATOR" header rows on the same board, created 127ms apart.
     Root cause: ensureCollaboratorHeader/ensureStakeholderHeader are
     plain check-then-insert (select for an existing row, insert if
     none found) with no DB unique constraint and no app-level lock, so
     two near-simultaneous calls for the same parent (e.g. a render that
     fires the ensure twice, or two tabs) both pass the "not found yet"
     check before either insert lands, and both insert. Fixed with an
     in-flight promise cache keyed by header name + parent: the first
     caller's real ensure-work is stored here and every concurrent
     caller for the same key gets that same in-flight promise back
     instead of starting its own select-then-insert race. Cleared once
     the promise settles (success or failure) so a later, non-concurrent
     call still re-checks the DB fresh rather than reusing a stale id
     forever. */
  var _headerEnsureInFlight={};
  function _headerEnsureOnce(key, fn){
    if(_headerEnsureInFlight[key]) return _headerEnsureInFlight[key];
    var p=fn().then(function(v){ delete _headerEnsureInFlight[key]; return v; },
                     function(e){ delete _headerEnsureInFlight[key]; throw e; });
    _headerEnsureInFlight[key]=p;
    return p;
  }

  /* Reserved structural headers — never selectable as a PROJECT/TOPIC
     destination, only ever landing buckets for content.
     COLLABORATOR added Sept 2, 2026 (Session 264/265 design lock,
     IDEA STORYBOARDS): same reserved-header pattern as Purpose, always
     present on a traveler's own top-level Idea Storyboard, holding
     shortcut buttons into everything they were brought INTO rather
     than originated. See ensureCollaboratorHeader/collaboratorEntries
     below. */
  // 'NEW'/'New Additions' kept alongside 'Parking Lot' (Sept 15 2026
  // rename, Larry + Bill) so a board that hasn't self-healed onto the new
  // name yet -- or an old per-Topic "(Thumb Rest)"-style catch-all, see
  // ensureNewAdditionsHeader below -- still gets excluded from ordinary
  // header listings, not just the current name.
  var RESERVED_HEADERS = ['NEW','New Additions','Parking Lot','MISC','Purpose','Trash','Archived','COLLABORATOR','STAKEHOLDER','Idea Storyboards','PROJECTS'];

  /* ── generic tree helpers ── */

  async function fetchAllHeaders(){
    var sb=_sb(); var u=await _currentUser();
    if(!u) return [];
    var res=await sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',u.id).eq('content_type','header');
    if(res && res.error){
      console.warn('fetchAllHeaders error, retrying once:', res.error);
      await new Promise(function(r){ setTimeout(r,400); });
      res=await sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',u.id).eq('content_type','header');
      if(res && res.error) console.error('fetchAllHeaders failed after retry:', res.error);
    }
    return (res && res.data) || [];
  }

  function headerDescendants(allHeaders, rootId){
    var byParent={};
    allHeaders.forEach(function(h){ var p=h.cluster_id; if(!byParent[p]) byParent[p]=[]; byParent[p].push(h); });
    var result=[]; var seen={};
    var queue=(byParent[rootId]||[]).slice();
    while(queue.length){
      var node=queue.shift();
      if(seen[node.id]) continue;
      seen[node.id]=true;
      result.push(node);
      (byParent[node.id]||[]).forEach(function(c){ queue.push(c); });
    }
    return result;
  }

  async function createHeader(name, parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in');
    var ins=await sb.from('ideas').insert({user_id:u.id, content_type:'header', text_content:name, cluster_id:parentId||null, created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Create failed: '+ins.error.message);
    if(!ins.data) throw new Error('Create failed: no row returned');
    return ins.data;
  }

  async function childHeaders(parentId){
    if(!parentId) return [];
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var res=await sb.from('ideas').select('id,text_content').eq('user_id',u.id).eq('content_type','header').eq('cluster_id',parentId);
      if(res.error){ console.warn('childHeaders error:', res.error); return []; }
      return res.data||[];
    }catch(e){ console.warn('childHeaders exception:', e); return []; }
  }

  /* Active (non-reserved) direct children only — the building block for
     one-level-at-a-time TOPIC navigation in FOCUS. */
  async function activeChildHeaders(parentId){
    var kids=await childHeaders(parentId);
    return kids.filter(function(r){ return RESERVED_HEADERS.indexOf(r.text_content)===-1; })
      .sort(function(a,b){ return a.text_content.localeCompare(b.text_content); });
  }

  async function topLevelBoards(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      // Sept 2, 2026 -- IDEA STORYBOARDS placement architecture: real
      // projects no longer sit at the database's true top level (cluster_id
      // null) -- they nest one level down, under this member's own "Idea
      // Storyboards" root (see ensureIdeaStoryboardsRoot below). "This
      // traveler's own top-level Headers" now means that root's direct
      // children, not true root itself. Promoted/Stakeholder placements on
      // someone ELSE's project are a separate list (promotedPrimaryEntries/
      // stakeholderEntries below) -- this stays scoped to the signed-in
      // member's own root, same as it was scoped to their own projects
      // before this change (RLS-sharing note below still applies to
      // whatever comes back for that one root).
      var rootId=await ensureIdeaStoryboardsRoot();
      if(!rootId) return [];
      // Aug 4 2026, Larry: Storyboard sharing -- a member can now be
       // added to someone else's PROJECT tree (see storyboard_members /
       // is_storyboard_member in the DB), so this no longer filters to
       // user_id=u.id. RLS decides what comes back: this traveler's own
       // projects, plus any project someone has added them to. user_id is
       // selected too so the UI can tell an owned project from a shared one.
      var res=await sb.from('ideas').select('id,text_content,user_id,storyboard_kind').eq('content_type','header').eq('cluster_id',rootId);
      if(res.error){ console.warn('topLevelBoards error:', res.error); return []; }
      // Aug 26 2026, Larry: PLAN boards (duplicated off an IDEA project via
      // the board-kind dropdown) are reached from inside their own IDEA
      // project, not picked from PROJECT -- filtered out here so a
      // traveler's project list doesn't grow a second, easy-to-confuse
      // entry every time PLAN gets built out for one of their projects.
      return (res.data||[]).filter(function(r){ return RESERVED_HEADERS.indexOf(r.text_content)===-1 && (r.storyboard_kind||'IDEA')==='IDEA'; });
    }catch(e){ console.warn('topLevelBoards exception:', e); return []; }
  }

  /* ── IDEA STORYBOARDS placement architecture — Sept 2, 2026 (Sessions
     264-266 design lock). Every member has exactly one true top-level
     project now: their own "Idea Storyboards" root. Real projects
     (self-originated) nest one level under it; Primary/★ promotions and
     Stakeholder placements on someone ELSE's project surface as separate
     shortcut lists (promotedPrimaryEntries/stakeholderEntries) rather than
     living in the tree itself, since they point at another traveler's
     rows. ── */

  /* ensureIdeaStoryboardsRoot — self-healing, safe to call every render.
     Finds (or creates, on a member's very first visit) this traveler's own
     "Idea Storyboards" root, a plain reserved header sitting at the
     database's true top level (cluster_id null) — the ONE row still
     allowed to live there. Then sweeps every OTHER true-root header this
     member owns under it, excluding the structural reserved buckets
     (never real projects) and PLAN-kind satellites (reached from inside
     their own IDEA project, never their own PROJECT-list entry). The sweep
     re-runs on every call but is a cheap no-op once nothing still
     qualifies — its own WHERE clause requires cluster_id null, which a
     migrated row no longer has. */
  // Sept 15 2026 -- wrapped in the same in-flight-promise lock as
  // ensureCollaboratorHeader/ensureStakeholderHeader (see the Sept 13
  // 2026 note on _headerEnsureOnce above). This is called from nearly
  // every screen's boot path (Idea Board, Briefing Board, Plan...), so
  // it was the single biggest source of duplicate reserved headers in
  // practice -- Larry and Bill found their own accounts' PROJECTS root
  // itself split into two, each half holding real projects the other
  // didn't (cleaned up in the Sept 15 2026 data pass; see the Master BB
  // "Some boards showing 2 (header) headers" card). One key per tab is
  // fine here (no parentId to key off, unlike the other ensure*
  // functions below) -- this app only ever has one signed-in traveler
  // per tab, so concurrent callers are always racing for the same root.
  var ensureIdeaStoryboardsRoot = function(){
    return _headerEnsureOnce('PROJECTS_ROOT', async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) return null;
      // Sept 6 2026, Larry: "What used to be Idea Storyboards is now
      // PROJECTS" -- same root, same job (the one true top-level anchor
      // every real project nests under), just renamed. Matches on either
      // name so an account that still has the old row self-heals onto
      // the new one instead of spawning a second root; the insert path
      // below only ever creates 'PROJECTS' going forward.
      var existing=await sb.from('ideas').select('id,text_content').eq('user_id',u.id).eq('content_type','header').in('text_content',['PROJECTS','Idea Storyboards']).is('cluster_id',null).limit(1);
      if(existing.error){ console.warn('ensureIdeaStoryboardsRoot select error:', existing.error); return null; }
      var rootId;
      if(existing.data && existing.data.length){
        rootId=existing.data[0].id;
        if(existing.data[0].text_content!=='PROJECTS'){
          try{ await sb.from('ideas').update({text_content:'PROJECTS'}).eq('id',rootId); }catch(e){}
        }
      } else {
        var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'PROJECTS',cluster_id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error || !ins.data){ console.warn('ensureIdeaStoryboardsRoot insert error:', ins.error); return null; }
        rootId=ins.data.id;
      }
      var candidates=await sb.from('ideas').select('id,text_content,storyboard_kind')
        .eq('user_id',u.id).eq('content_type','header').is('cluster_id',null).neq('id',rootId);
      if(!candidates.error && candidates.data && candidates.data.length){
        var EXCLUDE={'Trash':1,'Archived':1,'MISC':1,'Purpose':1,'COLLABORATOR':1,'STAKEHOLDER':1,'Idea Storyboards':1,'PROJECTS':1};
        var toMove=candidates.data.filter(function(r){
          return !EXCLUDE[r.text_content] && (r.storyboard_kind||'IDEA')==='IDEA';
        }).map(function(r){ return r.id; });
        if(toMove.length){
          var mig=await sb.from('ideas').update({cluster_id:rootId}).in('id',toMove);
          if(mig.error) console.warn('ensureIdeaStoryboardsRoot migration error:', mig.error);
        }
      }
      return rootId;
    }).catch(function(e){ console.warn('ensureIdeaStoryboardsRoot exception:', e); return null; });
  };

  /* STAKEHOLDER — mirrors ensureCollaboratorHeader exactly (same reserved-
     bucket mechanic: one shared header per parent, created on first use,
     never respawned once removed). Only call this from the traveler's own
     Idea Storyboards root — like COLLABORATOR, it's a personal filing
     bucket for shortcuts and has no meaning on someone else's project. */
  async function ensureStakeholderHeader(parentId){
    return _headerEnsureOnce('STAKEHOLDER:'+(parentId===null||parentId===undefined?'root':parentId), async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) throw new Error('Not signed in.');
      var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','STAKEHOLDER');
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q.limit(1);
      if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
      if(await _parentDefaultsSeeded(parentId)) return null;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'STAKEHOLDER',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw new Error('STAKEHOLDER setup failed: '+ins.error.message);
      _markParentDefaultsSeeded(parentId);
      return ins.data.id;
    });
  }

  /* promotedPrimaryEntries — the PROJECT-list shortcut for every project
     ROOT (not any nested card) where this traveler has been made PRIMARY
     via the 👥 Call Sheet (card_roles.role='primary' -- the accountable
     one, "responsible for making it happen"), on a project someone else
     owns. Two-step manual join, same pattern as collaboratorEntries:
     read this traveler's own card_roles rows, then the referenced ideas
     rows. Scoped to self-scoped rows only (topic_scope_id===id) so a
     Primary assignment on an ordinary nested card doesn't masquerade as a
     whole-project promotion.
     Sept 12 2026, Larry re-split PRIMARY (accountability) from ★ Primary
     Doer (card_roles.is_primary, "who's actually doing the work" -- his
     example: the building manager is PRIMARY, the plumber is ★). This
     list is specifically about accountability -- "you were made
     responsible for someone else's project" -- so it now reads
     role='primary', not is_primary. Being starred as the doer on someone
     else's project (without being made PRIMARY) doesn't belong here. */
  async function promotedPrimaryEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var roles=await sb.from('card_roles').select('card_id').eq('card_type','idea').eq('user_id',u.id).eq('role','primary');
      if(roles.error){ console.warn('promotedPrimaryEntries card_roles error:', roles.error); return []; }
      var ids=(roles.data||[]).map(function(r){ return r.card_id; });
      if(!ids.length) return [];
      var proj=await sb.from('ideas').select('id,text_content,user_id,topic_scope_id,color').in('id',ids);
      if(proj.error){ console.warn('promotedPrimaryEntries ideas error:', proj.error); return []; }
      return (proj.data||[])
        .filter(function(p){ return p.user_id!==u.id && p.topic_scope_id && String(p.topic_scope_id)===String(p.id); })
        .map(function(p){ return {id:p.id, text:p.text_content, ownerUserId:p.user_id, color:p.color}; });
    }catch(e){ console.warn('promotedPrimaryEntries exception:', e); return []; }
  }

  /* stakeholderEntries — same shape as promotedPrimaryEntries, but for a
     card_roles row of role='stakeholder' rather than is_primary. Carries
     isKeyStakeholder (card_roles.is_key) through so the STAKEHOLDER group
     and the PROJECT popup's fast-access list (Key Stakeholder only) can
     both read off the same fetch.
     Sept 12 2026, Larry: unified the app's two different "special
     stakeholder" flags into one -- this used to read the separate
     is_primary_stakeholder column (added Sept 2 for Board-of-Directors
     auto-flagging, shown only here/the project list/card badges) instead
     of is_key (the original 🔑 Key Stakeholder toggle on the Call Sheet
     roster, "can directly interfere with progress"). No production row
     had is_primary_stakeholder set, so this was a clean cutover, not a
     migration. */
  async function stakeholderEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var roles=await sb.from('card_roles').select('card_id,is_key').eq('card_type','idea').eq('user_id',u.id).eq('role','stakeholder');
      if(roles.error){ console.warn('stakeholderEntries card_roles error:', roles.error); return []; }
      var rows=roles.data||[];
      if(!rows.length) return [];
      var ids=rows.map(function(r){ return r.card_id; });
      var proj=await sb.from('ideas').select('id,text_content,user_id,topic_scope_id,color').in('id',ids);
      if(proj.error){ console.warn('stakeholderEntries ideas error:', proj.error); return []; }
      var byId={}; (proj.data||[]).forEach(function(p){ byId[p.id]=p; });
      var keyByCard={}; rows.forEach(function(r){ keyByCard[r.card_id]=!!r.is_key; });
      return ids
        .map(function(id){ return byId[id]; })
        .filter(function(p){ return p && p.user_id!==u.id && p.topic_scope_id && String(p.topic_scope_id)===String(p.id); })
        .map(function(p){
          return {id:p.id, text:p.text_content, ownerUserId:p.user_id, color:p.color, isKeyStakeholder:!!keyByCard[p.id]};
        });
    }catch(e){ console.warn('stakeholderEntries exception:', e); return []; }
  }

  /* addStakeholderToCast — the one path that adds a Stakeholder to a
     project's Cast (see _csInsertRole in idea-storyboard-9710.js), so the
     Board-of-Directors starting state can be set atomically with the row
     itself instead of an insert-then-update. Board-of-Directors members
     default to 🔑 Key Stakeholder (opt-out from there, see
     setKeyStakeholder); an ordinary Stakeholder starts unflagged (opt-in
     later, self-only). */
  async function addStakeholderToCast(cardId, userId, isBoardMember){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {ok:false, msg:'Not signed in.'};
      var ins=await sb.from('card_roles').insert({
        card_type:'idea', card_id:cardId, role:'stakeholder', user_id:userId,
        is_board_member:!!isBoardMember, is_key:!!isBoardMember,
        added_by:u.id
      }).select().single();
      if(ins.error) return {ok:false, msg:ins.error.message};
      return {ok:true, row:ins.data};
    }catch(e){ return {ok:false, msg:(e&&e.message)||'Could not add them as a Stakeholder.'}; }
  }

  /* setKeyStakeholder (renamed from setPrimaryStakeholder, Sept 12 2026 --
     see stakeholderEntries' comment above) — self-designation only: a
     plain Stakeholder can flag (or unflag) themselves as 🔑 Key
     Stakeholder on a project. Board-of-Directors members start flagged
     already (addStakeholderToCast above); this is the opt-in/opt-out
     path for everyone else. Not currently wired to any button (the Call
     Sheet's own 🔑 checkbox -- _csToggleKey in idea-storyboard-people.js
     -- is the live path for this today); kept as a public API in case a
     self-service toggle is wanted outside the full Call Sheet later. */
  async function setKeyStakeholder(cardId, flag){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {ok:false, msg:'Not signed in.'};
      var upd=await sb.from('card_roles').update({is_key:!!flag})
        .eq('card_type','idea').eq('card_id',cardId).eq('user_id',u.id).eq('role','stakeholder');
      if(upd.error) return {ok:false, msg:upd.error.message};
      return {ok:true};
    }catch(e){ return {ok:false, msg:(e&&e.message)||'Could not update.'}; }
  }

  /* ── ensure-named-header helpers (find existing under parent, else create) ── */

  // Sept 15 2026 -- same in-flight-promise lock as ensureCollaboratorHeader/
  // ensureIdeaStoryboardsRoot above (see the Sept 13 2026 _headerEnsureOnce
  // note); this generic helper was one of the unprotected ones the
  // Sept 15 2026 duplicate-header data pass found actual duplicates from.
  function ensureHeaderNamed(name, parentId){
    return _headerEnsureOnce('NAMED:'+name+':'+(parentId===null||parentId===undefined?'root':parentId), async function(){
      var sb=_sb(); var u=await _currentUser(); if(!u) return null;
      // Shared-project fix, Aug 14 2026: the existence check used to be
      // scoped to rows this same signed-in user created (.eq('user_id',...)),
      // so a teammate opening a project before its Owner ever synced on
      // their device wouldn't recognize the Owner's reserved header as
      // already existing and would quietly spawn a second one. RLS already
      // limits what this query can see to rows this user is allowed to
      // read (own rows, or a project/topic they're a Cast member of), so
      // dropping the extra user_id filter here just lets any Cast member
      // find and reuse the one shared header instead of each person
      // getting their own.
      var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content',name);
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q.limit(1);
      if(existing.error) console.warn('ensureHeaderNamed select error:', existing.error);
      if(existing.data && existing.data.length) return existing.data[0].id;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) console.warn('ensureHeaderNamed insert error:', ins.error);
      return ins.data?ins.data.id:null;
    }).catch(function(e){ console.warn('ensureHeaderNamed exception:', e); return null; });
  }

  /* Deletion-sticks backstop, Aug 18 2026 -- Larry: "Allow NEW and MISC
     headers to be deleted like any other header. Adding headers is only
     a default. If headers already exist, do not add any default
     headers." Before this, ensureMiscHeader/ensureNewAdditionsHeader/
     ensurePurposeHeader ran on every render and silently recreated
     whichever default was missing -- so trashing NEW or MISC never
     actually stuck, it just came back on the next render.
     First attempt checked "does this parent currently have any header
     at all" -- but that breaks the instant a traveler deletes the LAST
     header standing on an otherwise-empty board (a very common shape:
     most boards start with only NEW+MISC and nothing else), because at
     that instant the count legitimately hits zero and looks exactly
     like a genuinely brand-new board again. Larry hit this directly:
     deleting MISC "did nothing" because it came right back.
     Fixed properly with a persisted per-parent flag
     (header_defaults_seeded column, migrated Aug 18 2026) instead of a
     point-in-time count: once a parent has ever had its defaults
     seeded, it stays seeded forever, so a deliberately-removed default
     never comes back no matter how many headers remain. */
  async function _parentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return false;
    var sb=_sb();
    var res=await sb.from('ideas').select('header_defaults_seeded').eq('id',parentId).limit(1);
    if(res.error || !res.data || !res.data.length) return false;
    if(res.data[0].header_defaults_seeded) return true;
    // Session 231 (Aug 20) gap -- Larry: "DO NOT ADD ANY HEADERS
    // AUTOMATICALLY TO ANY BOARD THAT ALREADY HAS HEADERS." The flag
    // above only gets set the first time ONE of NEW/MISC/Purpose is
    // actually auto-inserted -- so a board Larry built by hand (headers
    // with names other than NEW/MISC/Purpose, flag never touched) still
    // looked "unseeded" to this check, and the very next render happily
    // inserted a fresh NEW/MISC/Purpose default into a board that
    // already had real content. Self-heal here instead: if the flag
    // isn't set yet but this parent already has ANY header at all,
    // that's proof it's not a brand-new board -- mark it seeded now
    // (so this only ever costs one extra query, not one per render) and
    // treat it as already seeded. A genuinely empty/new parent still
    // correctly falls through to false and gets its defaults.
    var kids=await sb.from('ideas').select('id').eq('content_type','header').eq('cluster_id',parentId).limit(1);
    if(!kids.error && kids.data && kids.data.length){
      _markParentDefaultsSeeded(parentId);
      return true;
    }
    return false;
  }

  async function _markParentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return;
    try{ await _sb().from('ideas').update({header_defaults_seeded:true}).eq('id',parentId); }catch(e){}
  }

  async function ensureMiscHeader(parentId){
    // Sept 13 2026 -- Larry: "I no longer want Purpose and MISC to
    // autogenerate on boards." Lookup-only now: if a MISC header already
    // exists on this parent, it's still found and used exactly as before
    // (nothing changes for boards that already have one). What's removed
    // is the insert-if-missing branch below it -- a board with no MISC
    // simply gets none, no default ever created. Left _parentDefaultsSeeded
    // untouched (still used by ensureNewAdditionsHeader's own flag check)
    // rather than deleting it here.
    var sb=_sb();
    var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','MISC');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    return null;
  }

  async function ensurePurposeHeader(parentId){
    // Sept 13 2026 -- same change as ensureMiscHeader above: lookup-only,
    // no more auto-create. See that function's comment.
    var sb=_sb();
    var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    return null;
  }

  /* COLLABORATOR — Sept 2, 2026 design lock (IDEA STORYBOARDS /
     Session 264-265), NOT YET WIRED INTO ANY SCREEN as of this write.
     Mirrors ensurePurposeHeader exactly: one shared reserved header per
     parent, created on first use, never respawned once a parent's
     defaults are seeded and the traveler has removed it. Only call
     this from the traveler's own top-level Idea Storyboard root — a
     COLLABORATOR header is a personal filing bucket for shortcuts, it
     has no meaning on someone else's project. */
  async function ensureCollaboratorHeader(parentId){
    return _headerEnsureOnce('COLLABORATOR:'+(parentId===null||parentId===undefined?'root':parentId), async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) throw new Error('Not signed in.');
      var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','COLLABORATOR');
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q.limit(1);
      if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
      if(await _parentDefaultsSeeded(parentId)) return null;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'COLLABORATOR',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw new Error('COLLABORATOR setup failed: '+ins.error.message);
      _markParentDefaultsSeeded(parentId);
      return ins.data.id;
    });
  }

  /* collaboratorEntries — the actual list of "brought into" projects
     for COLLABORATOR's shortcut buttons. Two sources, merged: an explicit
     People-screen invite (storyboard_members — also covers a delegated
     TOPIC's owner, mirrored in automatically by the delegate_topic()
     database function), and a Team / Facilitator / Facilitator-qualified
     placement on the project's own Call Sheet (card_roles — added Sept 12,
     2026, see the function body for why).
     Either way, "is this mine" is decided by the referenced project's own
     user_id, never by who added the row. Manual joins (fetch the roster
     rows, then the referenced ideas rows) rather than a PostgREST embed,
     matching how every other multi-table read in this file is written.
     Placement rule (per the design lock): whose root project it is, not
     Primary-vs-not — so this only excludes rows the traveler themself
     owns, it does not try to distinguish Primary from Stakeholder from
     plain Team. First verified against two real production rows
     (Bill Fritsch + the "Claude" member account, both storyboard_members
     on Larry's "Field Guide" project) Sept 12, 2026.

     Sept 14 2026, Larry: CAST/TEAM split — Cast is everyone on a card's
     roster, Team is the subset with real edit access on that card. The
     role that used to be called 'cast_member' (and granted edit) is now
     'team'; 'cast_member' is the new no-edit default (present on the
     roster, no standing — "an extra"). This list only ever wanted the
     real editors, so it swaps in 'team' here and drops plain
     'cast_member' rows, which no longer belong in a Collaborator list. */
  async function collaboratorEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var mem=await sb.from('storyboard_members').select('project_id,role').eq('user_id',u.id);
      if(mem.error){ console.warn('collaboratorEntries storyboard_members error:', mem.error); return []; }
      var memRows=mem.data||[];

      // Sept 12 2026, Larry: "CAST is our source of truth -- a person
      // listed as a Cast member is a Collaborator, full stop." Before this,
      // only an explicit People-screen invite (storyboard_members) landed
      // here -- a Team / Facilitator / Facilitator-qualified placement on
      // someone else's project already granted real read access
      // (is_storyboard_member()'s card_roles fallback already covers all
      // the working roles), but had no way to ever be FOUND: not shown at
      // the project root (that's Primary-only, see promotedPrimaryEntries),
      // not shown here either. Folded in below, self-scoped to the project
      // root exactly like promotedPrimaryEntries/stakeholderEntries
      // (topic_scope_id===id) so a Cast placement on an ordinary nested
      // card never masquerades as a whole-project placement. (Primary
      // stays root-only/fast-access, and 'stakeholder' stays its own
      // bucket below -- this only adds the real-edit working roles.)
      // Sept 15 2026: a Team/Facilitator/Facilitator-qualified placement
      // now starts 'pending' when someone else made it (see _csInsertRole
      // in idea-storyboard-people.js) -- excluded here until the named
      // person accepts, so it doesn't show as a live collaboration before
      // they've said yes. See pendingCollaboratorEntries below for where
      // it *does* show meanwhile.
      var castRoles=await sb.from('card_roles').select('card_id,role')
        .eq('card_type','idea').eq('user_id',u.id).eq('status','accepted')
        .in('role',['team','facilitator','facilitator_qualified']);
      if(castRoles.error) console.warn('collaboratorEntries card_roles error:', castRoles.error);
      var castRows=castRoles.data||[];
      if(!memRows.length && !castRows.length) return [];

      var roleByProject={};
      memRows.forEach(function(r){ roleByProject[r.project_id]=r.role; });
      castRows.forEach(function(r){ if(!(r.card_id in roleByProject)) roleByProject[r.card_id]=r.role; });

      var allIds={};
      memRows.forEach(function(r){ allIds[r.project_id]=true; });
      castRows.forEach(function(r){ allIds[r.card_id]=true; });
      var ids=Object.keys(allIds);
      if(!ids.length) return [];

      var proj=await sb.from('ideas').select('id,text_content,user_id,topic_owner_user_id,topic_scope_id,color').in('id',ids);
      if(proj.error){ console.warn('collaboratorEntries ideas error:', proj.error); return []; }
      var byId={}; (proj.data||[]).forEach(function(p){ byId[p.id]=p; });
      return ids
        .map(function(id){ return byId[id]; })
        .filter(function(p){ return p && p.user_id!==u.id && p.topic_scope_id && String(p.topic_scope_id)===String(p.id); })
        .map(function(p){
          return {
            id:p.id,
            text:p.text_content,
            ownerUserId:p.user_id,
            isDelegatedTopic:!!p.topic_owner_user_id,
            color:p.color,
            role:roleByProject[p.id]||null
          };
        });
    }catch(e){ console.warn('collaboratorEntries exception:', e); return []; }
  }

  /* pendingCollaboratorEntries -- the flip side of collaboratorEntries'
     Sept 15 2026 change: Team/Facilitator/Facilitator-qualified rows that
     someone else placed for this traveler, sitting at 'pending' until they
     say yes or no. Same manual-join shape as collaboratorEntries above
     (roster rows, then the referenced ideas rows), so the returned entries
     drop straight into _sboardMakePendingCollabTile the same way accepted
     ones drop into _sboardMakeRoleShortcutTile -- the only addition is
     roleId, the card_roles row id respondToCollaboratorInvite acts on. */
  async function pendingCollaboratorEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var pend=await sb.from('card_roles').select('id,card_id,role')
        .eq('card_type','idea').eq('user_id',u.id).eq('status','pending')
        .in('role',['team','facilitator','facilitator_qualified']);
      if(pend.error){ console.warn('pendingCollaboratorEntries card_roles error:', pend.error); return []; }
      var rows=pend.data||[];
      if(!rows.length) return [];

      var ids=rows.map(function(r){ return r.card_id; });
      var proj=await sb.from('ideas').select('id,text_content,user_id,color').in('id',ids);
      if(proj.error){ console.warn('pendingCollaboratorEntries ideas error:', proj.error); return []; }
      var byId={}; (proj.data||[]).forEach(function(p){ byId[p.id]=p; });

      return rows
        .map(function(r){ var p=byId[r.card_id]; return p?{r:r,p:p}:null; })
        .filter(Boolean)
        .map(function(x){
          return {
            id:x.p.id,
            roleId:x.r.id,
            text:x.p.text_content,
            ownerUserId:x.p.user_id,
            color:x.p.color,
            role:x.r.role
          };
        });
    }catch(e){ console.warn('pendingCollaboratorEntries exception:', e); return []; }
  }

  /* respondToCollaboratorInvite -- accept keeps the card_roles row and
     flips it to 'accepted' (so it's picked up by collaboratorEntries'
     status filter above on the next render); decline removes the row
     entirely rather than leaving a 'declined' row sitting on someone
     else's Call Sheet forever. roleId is card_roles.id, from the roleId
     field pendingCollaboratorEntries returns. */
  async function respondToCollaboratorInvite(roleId, accept){
    try{
      if(!roleId) return {ok:false, msg:'Missing invite.'};
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {ok:false, msg:'Not signed in.'};
      if(accept){
        var upd=await sb.from('card_roles').update({status:'accepted'}).eq('id',roleId).eq('user_id',u.id);
        if(upd.error){ console.warn('respondToCollaboratorInvite accept error:', upd.error); return {ok:false, msg:'Could not accept that invite.'}; }
      } else {
        var del=await sb.from('card_roles').delete().eq('id',roleId).eq('user_id',u.id);
        if(del.error){ console.warn('respondToCollaboratorInvite decline error:', del.error); return {ok:false, msg:'Could not decline that invite.'}; }
      }
      return {ok:true};
    }catch(e){ console.warn('respondToCollaboratorInvite exception:', e); return {ok:false, msg:'Something went wrong.'}; }
  }

  /* Board-type color, Sept 15 2026 -- Larry, after the first pass at this
     fix used the wrong unit: "Board color should be different for each
     TYPE of board... should only change a single board type." Shared by
     the Idea Storyboard's Storyboard-background picker and the Briefing
     Board's Color-theme picker (same board_type_color table, same
     owner-only-rows pattern as org_type_hidden above it in this file's
     sibling functions). 'surface' keeps the two screens' different kinds
     of value apart under the same board_type grouping: 'idea_bg' is a
     free hex string, 'bb_theme' is one of THEMES' fixed keys (gold, etc,
     see briefing-board-ops.js) -- never mix the two in one cache entry.
     Cached per surface, loaded once per tab (ensureBoardTypeColorsLoaded),
     read synchronously afterward (getBoardTypeColor) so a picker/repaint
     never has to await mid-render -- exactly the latency-hiding shape
     _sboardHiddenTypesCache/org_type_hidden already uses elsewhere. */
  var _boardTypeColorCache = {};    // "surface:board_type" -> color
  var _boardTypeColorLoaded = {};   // surface -> true once a real fetch has completed
  var _boardTypeColorLoading = {};  // surface -> in-flight promise, so concurrent callers share one fetch
  function _boardTypeColorKey(boardType, surface){ return (surface||'idea_bg')+':'+(boardType||'personal'); }
  function ensureBoardTypeColorsLoaded(surface){
    surface=surface||'idea_bg';
    if(_boardTypeColorLoaded[surface]) return Promise.resolve();
    if(_boardTypeColorLoading[surface]) return _boardTypeColorLoading[surface];
    _boardTypeColorLoading[surface]=(async function(){
      try{
        var sb=_sb(); if(!sb) return;
        var u=await _currentUser(); if(!u) return;
        var res=await sb.from('board_type_color').select('board_type,color').eq('user_id',u.id).eq('surface',surface);
        if(res.error) throw res.error;
        (res.data||[]).forEach(function(r){ _boardTypeColorCache[_boardTypeColorKey(r.board_type,surface)]=r.color; });
        _boardTypeColorLoaded[surface]=true;
      }catch(e){ console.warn('T2TData: could not load board-type colors ('+surface+')', e); }
      _boardTypeColorLoading[surface]=null;
    })();
    return _boardTypeColorLoading[surface];
  }
  function getBoardTypeColor(boardType, surface){
    return _boardTypeColorCache[_boardTypeColorKey(boardType,surface)] || '';
  }
  async function setBoardTypeColor(boardType, surface, color){
    surface=surface||'idea_bg'; boardType=boardType||'personal';
    _boardTypeColorCache[_boardTypeColorKey(boardType,surface)]=color; // paint immediately, don't wait on the round trip
    try{
      var sb=_sb(); if(!sb) return {ok:false};
      var u=await _currentUser(); if(!u) return {ok:false};
      var up=await sb.from('board_type_color').upsert({user_id:u.id, board_type:boardType, surface:surface, color:color, updated_at:new Date().toISOString()});
      if(up.error){ console.warn('T2TData: could not save this board type\'s color', up.error); return {ok:false}; }
      return {ok:true};
    }catch(e){ console.warn('T2TData: could not save this board type\'s color', e); return {ok:false}; }
  }

  // Sept 15 2026 -- same in-flight-promise lock pattern as
  // ensureCollaboratorHeader/ensureIdeaStoryboardsRoot above. NEW was one
  // of the two reserved headers the Sept 15 2026 duplicate-header data
  // pass found actual duplicates of (9 copies on one board).
  //
  // Renamed NEW -> Parking Lot, Sept 15 2026, Larry + Bill (same session,
  // after the duplicate-header pass above): plain "NEW" didn't say what
  // it actually held. Also retires the Idea Storyboard's own separate
  // per-Topic naming attempt at the same problem (titling this header
  // "(Thumb Rest)", "(Ohio Projects)", etc, after whichever Topic it sat
  // under -- see the old _sboardEnsureNewAdditionsHeader in
  // idea-storyboard-header.js) in favor of Bill's one consistent name.
  // Self-heals any of the three: an existing 'NEW'/'New Additions' row,
  // or an old per-Topic "(...)" one -- matched here by shape (starts
  // with "(", ends with ")") since nothing else in this app names a
  // header that way.
  function ensureNewAdditionsHeader(parentId){
    return _headerEnsureOnce('NEW:'+(parentId===null||parentId===undefined?'root':parentId), async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) throw new Error('Not signed in.');
      // Shared-project fix, Aug 14 2026 -- see ensurePurposeHeader above:
      // drop the user_id filter so every Cast member reuses the same
      // Parking Lot header instead of each person spawning their own.
      var q=sb.from('ideas').select('id,text_content').eq('content_type','header');
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q;
      if(!existing.error && existing.data && existing.data.length){
        var row=existing.data.filter(function(r){
          var t=r.text_content||'';
          return t==='NEW'||t==='New Additions'||t==='Parking Lot'||(t.charAt(0)==='('&&t.charAt(t.length-1)===')');
        })[0];
        if(row){
          if(row.text_content!=='Parking Lot'){ try{ await sb.from('ideas').update({text_content:'Parking Lot'}).eq('id',row.id); }catch(e){} }
          return row.id;
        }
      }
      if(await _parentDefaultsSeeded(parentId)) return null;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Parking Lot',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw new Error('Parking Lot setup failed: '+ins.error.message);
      _markParentDefaultsSeeded(parentId);
      return ins.data.id;
    });
  }

  // Sept 15 2026 -- same lock; no parentId here (Trash is always the
  // account's own single top-level bucket), so one constant key covers
  // it, same reasoning as ensureIdeaStoryboardsRoot's 'PROJECTS_ROOT' key.
  function ensureTrashHeader(){
    return _headerEnsureOnce('TRASH', async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) throw new Error('Not signed in.');
      var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Trash').limit(1);
      if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Trash',created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw new Error('Trash setup failed: '+ins.error.message);
      return ins.data.id;
    });
  }

  /* Archived mirrors Trash exactly (same reserved-bucket mechanic, same
     recoverability) but means "finished, not wrong" rather than "shouldn't
     exist" — added August 1, 2026 for Project Selection archive/delete. */
  function ensureArchivedHeader(){
    return _headerEnsureOnce('ARCHIVED', async function(){
      var sb=_sb(); var u=await _currentUser();
      if(!u) throw new Error('Not signed in.');
      var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Archived').limit(1);
      if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Archived',created_at:new Date().toISOString()}).select().single();
      if(ins.error) throw new Error('Archived setup failed: '+ins.error.message);
      return ins.data.id;
    });
  }

  /* Sept 2, 2026 -- resolves through the Idea Storyboards root now, not
     true root. ensureIdeaStoryboardsRoot's own sweep already pulls a
     pre-existing "Wish Tank" (an ordinary IDEA-kind header, same as any
     other real project) under the new root the first time it runs, so this
     no longer needs its own separate migration -- looking for Wish Tank as
     a CHILD of the root, instead of at cluster_id null, finds that same
     migrated row. Without resolving through the root first, this would
     have silently spawned a second, duplicate Wish Tank the first time an
     existing one got swept in as a child out from under the old lookup. */
  // Sept 15 2026 -- same lock; one constant key (Wish Tank is always the
  // one account-wide row under the PROJECTS root, same reasoning as
  // ensureTrashHeader/ensureArchivedHeader above). This function already
  // never throws (every branch returns {id,error}), so the lock just
  // wraps the existing try/catch shape unchanged.
  function ensureWishTank(){
    return _headerEnsureOnce('WISH_TANK', async function(){
      try{
        var sb=_sb(); var u=await _currentUser();
        if(!u) return {id:null, error:'Not signed in'};
        var rootId=await ensureIdeaStoryboardsRoot();
        if(!rootId) return {id:null, error:'Could not resolve the Idea Storyboards root'};
        var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Wish Tank').eq('cluster_id',rootId).limit(1);
        if(existing.error) return {id:null, error:'Select failed: '+existing.error.message};
        if(existing.data && existing.data.length) return {id:existing.data[0].id, error:null};
        var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Wish Tank',cluster_id:rootId,created_at:new Date().toISOString()}).select().single();
        if(ins.error || !ins.data) return {id:null, error:'Insert failed: '+(ins.error?ins.error.message:'no data returned')};
        var wishTankId=ins.data.id;
        // Self-scoped like every other real project root (see
        // _sboardCreateRootBoard's own matching update in
        // idea-storyboard-9710.js) -- otherwise _sboardProjectRowFor would
        // climb straight past a freshly-created Wish Tank into Idea
        // Storyboards itself, now that Wish Tank sits one level deeper.
        try{ await sb.from('ideas').update({project_id:wishTankId, topic_scope_id:wishTankId}).eq('id',wishTankId); }catch(e){}
        return {id:wishTankId, error:null};
      }catch(e){ return {id:null, error:'Exception: '+(e&&e.message?e.message:String(e))}; }
    });
  }

  /* ── 9711 Idea Input — sticky last-topic (Locked July 13, 2026) ──
     Supabase-backed (must survive a full browser-close boundary, not
     just an in-memory variable), scoped per-project — stored as a
     column directly on that project's own root row so switching
     between projects never leaks one project's last-focused Topic
     into another's Input screen.
     Migration required in Supabase (run once):
       alter table ideas add column if not exists last_input_topic_id uuid; */

  async function getLastInputTopic(projectId){
    if(!projectId) return null;
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return null;
      var res=await sb.from('ideas').select('last_input_topic_id').eq('id',projectId).eq('user_id',u.id).single();
      if(res.error){ console.warn('getLastInputTopic error:', res.error); return null; }
      return (res.data && res.data.last_input_topic_id) || null;
    }catch(e){ console.warn('getLastInputTopic exception:', e); return null; }
  }

  async function setLastInputTopic(projectId, topicId){
    if(!projectId) return;
    try{
      var sb=_sb();
      var res=await sb.from('ideas').update({last_input_topic_id: topicId||null}).eq('id',projectId);
      if(res.error) console.warn('setLastInputTopic error:', res.error);
    }catch(e){ console.warn('setLastInputTopic exception:', e); }
  }

  /* Walks cluster_id from a Topic up to its root project, returning
     [{id,text}, ...] ordered apex..topic — the exact shape _isxPath
     needs to resume a session at the right depth, not just the root. */
  async function ancestorChain(topicId){
    var chain=[];
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return chain;
      var curId=topicId, guard=0;
      while(curId && guard<50){
        guard++;
        var res=await sb.from('ideas').select('id,text_content,cluster_id').eq('id',curId).eq('user_id',u.id).single();
        if(res.error || !res.data) break;
        chain.unshift({id:res.data.id, text:res.data.text_content});
        curId=res.data.cluster_id;
      }
    }catch(e){ console.warn('ancestorChain exception:', e); }
    return chain;
  }

  /* ── Project Filter (single-board model) ──
     Sept 8 2026, Larry: "PROJECT FILTER crosses all boards and may have
     new features of its own in the future." Moved here from
     briefing-board.js for exactly that reason -- once a traveler has
     exactly one real board left (see the retired column on
     briefing_boards), "switching boards" is replaced by filtering that
     one board's cards down to a project, and that idea belongs to every
     board kind this app has, not just Briefing Board. This is Tool code:
     generic state + persistence only. Each board file keeps whatever
     reaction to the filter is specific to its own screen (Briefing
     Board's TOPIC eyebrow, for instance) in its own file.

     isSingleBoardMode() answers off a count the board file itself
     reports via setBoardCount() right after it loads its own boards --
     header-data.js has no board table of its own to query, so it can't
     discover this independently. */

  var _projectFilterBoardCount = 0;
  var _projectFilterCurrent = null;

  function setBoardCount(n){ _projectFilterBoardCount = n||0; }
  function isSingleBoardMode(){ return _projectFilterBoardCount===1; }
  function getProjectFilter(){ return _projectFilterCurrent; }

  // normalized: null means "no restriction" (the account/master root --
  // every task, every project); a Header id means "only this project's
  // own cards," exact-match, never a descendant walk -- same "the only
  // cards visible at any layer are those pertaining to that layer" rule
  // Design Notes already locked for every other layer. rootHeaderId is
  // passed in by the caller (each board kind resolves its own root via
  // ensureIdeaStoryboardsRoot) rather than assumed here.
  async function setProjectFilter(headerId, rootHeaderId){
    var normalized = (!headerId || (rootHeaderId && headerId===rootHeaderId)) ? null : headerId;
    _projectFilterCurrent = normalized;
    try{ sessionStorage.setItem('bbCurrentProjectHeaderId', normalized||''); }catch(e){}
    var sb=_sb(); if(!sb) return normalized;
    try{
      var u=await _currentUser();
      if(u) await sb.from('profiles').update({active_project_header_id: normalized}).eq('user_id', u.id);
    }catch(e){ console.error('T2TData: could not persist the active project filter', e); }
    return normalized;
  }

  // projectField defaults to 'projectHeaderId' (Briefing Board's own row
  // shape); pass a different name if another board kind's card objects
  // tag their project under a different key.
  function filterCardsByProject(cards, projectField){
    if(!isSingleBoardMode() || !_projectFilterCurrent || !cards) return cards;
    var want=_projectFilterCurrent, field=projectField||'projectHeaderId';
    return cards.filter(function(c){ return c[field]===want; });
  }

  // The one-time, narrow write that tags a newly-created card with its
  // project. Deliberately never folded into a whole-row save -- see
  // projectHeaderId's own comment in each board file's row-mapping code
  // for why viewing a project must never rewrite its cards' assignment.
  // table names which card table to stamp (e.g. 'briefing_cards'), since
  // different board kinds keep their cards in different tables.
  async function stampCardProject(table, cardId, headerId){
    if(!table || !cardId || !headerId) return;
    var sb=_sb(); if(!sb) return;
    try{ await sb.from(table).update({project_header_id:headerId}).eq('id',cardId); }
    catch(e){ console.error('T2TData: could not tag the new card with its project', e); }
  }

  window.T2TData = {
    RESERVED_HEADERS: RESERVED_HEADERS,
    fetchAllHeaders: fetchAllHeaders,
    headerDescendants: headerDescendants,
    createHeader: createHeader,
    childHeaders: childHeaders,
    activeChildHeaders: activeChildHeaders,
    topLevelBoards: topLevelBoards,
    ensureHeaderNamed: ensureHeaderNamed,
    ensureArchivedHeader: ensureArchivedHeader,
    ensureMiscHeader: ensureMiscHeader,
    ensurePurposeHeader: ensurePurposeHeader,
    ensureCollaboratorHeader: ensureCollaboratorHeader,
    collaboratorEntries: collaboratorEntries,
    pendingCollaboratorEntries: pendingCollaboratorEntries,
    respondToCollaboratorInvite: respondToCollaboratorInvite,
    ensureBoardTypeColorsLoaded: ensureBoardTypeColorsLoaded,
    getBoardTypeColor: getBoardTypeColor,
    setBoardTypeColor: setBoardTypeColor,
    ensureStakeholderHeader: ensureStakeholderHeader,
    stakeholderEntries: stakeholderEntries,
    promotedPrimaryEntries: promotedPrimaryEntries,
    addStakeholderToCast: addStakeholderToCast,
    setKeyStakeholder: setKeyStakeholder,
    ensureIdeaStoryboardsRoot: ensureIdeaStoryboardsRoot,
    ensureNewAdditionsHeader: ensureNewAdditionsHeader,
    ensureTrashHeader: ensureTrashHeader,
    ensureWishTank: ensureWishTank,
    getLastInputTopic: getLastInputTopic,
    setLastInputTopic: setLastInputTopic,
    ancestorChain: ancestorChain,
    setBoardCount: setBoardCount,
    isSingleBoardMode: isSingleBoardMode,
    getProjectFilter: getProjectFilter,
    setProjectFilter: setProjectFilter,
    filterCardsByProject: filterCardsByProject,
    stampCardProject: stampCardProject
  };

})();
