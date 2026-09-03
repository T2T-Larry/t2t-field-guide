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

  /* Reserved structural headers — never selectable as a PROJECT/TOPIC
     destination, only ever landing buckets for content.
     COLLABORATOR added Sept 2, 2026 (Session 264/265 design lock,
     IDEA STORYBOARDS): same reserved-header pattern as Purpose, always
     present on a traveler's own top-level Idea Storyboard, holding
     shortcut buttons into everything they were brought INTO rather
     than originated. See ensureCollaboratorHeader/collaboratorEntries
     below. */
  var RESERVED_HEADERS = ['NEW','MISC','Purpose','Trash','Archived','COLLABORATOR','STAKEHOLDER','Idea Storyboards'];

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
  async function ensureIdeaStoryboardsRoot(){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return null;
      var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Idea Storyboards').is('cluster_id',null).limit(1);
      if(existing.error){ console.warn('ensureIdeaStoryboardsRoot select error:', existing.error); return null; }
      var rootId;
      if(existing.data && existing.data.length){
        rootId=existing.data[0].id;
      } else {
        var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Idea Storyboards',cluster_id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error || !ins.data){ console.warn('ensureIdeaStoryboardsRoot insert error:', ins.error); return null; }
        rootId=ins.data.id;
      }
      var candidates=await sb.from('ideas').select('id,text_content,storyboard_kind')
        .eq('user_id',u.id).eq('content_type','header').is('cluster_id',null).neq('id',rootId);
      if(!candidates.error && candidates.data && candidates.data.length){
        var EXCLUDE={'Trash':1,'Archived':1,'MISC':1,'Purpose':1,'COLLABORATOR':1,'STAKEHOLDER':1,'Idea Storyboards':1};
        var toMove=candidates.data.filter(function(r){
          return !EXCLUDE[r.text_content] && (r.storyboard_kind||'IDEA')==='IDEA';
        }).map(function(r){ return r.id; });
        if(toMove.length){
          var mig=await sb.from('ideas').update({cluster_id:rootId}).in('id',toMove);
          if(mig.error) console.warn('ensureIdeaStoryboardsRoot migration error:', mig.error);
        }
      }
      return rootId;
    }catch(e){ console.warn('ensureIdeaStoryboardsRoot exception:', e); return null; }
  }

  /* STAKEHOLDER — mirrors ensureCollaboratorHeader exactly (same reserved-
     bucket mechanic: one shared header per parent, created on first use,
     never respawned once removed). Only call this from the traveler's own
     Idea Storyboards root — like COLLABORATOR, it's a personal filing
     bucket for shortcuts and has no meaning on someone else's project. */
  async function ensureStakeholderHeader(parentId){
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
  }

  /* promotedPrimaryEntries — the PROJECT-list shortcut for every project
     ROOT (not any nested card) where this traveler has been made Primary
     via the 👥 Call Sheet (card_roles.is_primary), on a project someone
     else owns. Two-step manual join, same pattern as collaboratorEntries:
     read this traveler's own card_roles rows, then the referenced ideas
     rows. Scoped to self-scoped rows only (topic_scope_id===id) so a
     Primary assignment on an ordinary nested card doesn't masquerade as a
     whole-project promotion. */
  async function promotedPrimaryEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var roles=await sb.from('card_roles').select('card_id').eq('card_type','idea').eq('user_id',u.id).eq('is_primary',true);
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
     isPrimaryStakeholder (card_roles.is_primary_stakeholder) through so
     the STAKEHOLDER group and the PROJECT popup's fast-access list (Primary
     Stakeholder only) can both read off the same fetch. */
  async function stakeholderEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var roles=await sb.from('card_roles').select('card_id,is_primary_stakeholder').eq('card_type','idea').eq('user_id',u.id).eq('role','stakeholder');
      if(roles.error){ console.warn('stakeholderEntries card_roles error:', roles.error); return []; }
      var rows=roles.data||[];
      if(!rows.length) return [];
      var ids=rows.map(function(r){ return r.card_id; });
      var proj=await sb.from('ideas').select('id,text_content,user_id,topic_scope_id,color').in('id',ids);
      if(proj.error){ console.warn('stakeholderEntries ideas error:', proj.error); return []; }
      var byId={}; (proj.data||[]).forEach(function(p){ byId[p.id]=p; });
      var primaryByCard={}; rows.forEach(function(r){ primaryByCard[r.card_id]=!!r.is_primary_stakeholder; });
      return ids
        .map(function(id){ return byId[id]; })
        .filter(function(p){ return p && p.user_id!==u.id && p.topic_scope_id && String(p.topic_scope_id)===String(p.id); })
        .map(function(p){
          return {id:p.id, text:p.text_content, ownerUserId:p.user_id, color:p.color, isPrimaryStakeholder:!!primaryByCard[p.id]};
        });
    }catch(e){ console.warn('stakeholderEntries exception:', e); return []; }
  }

  /* addStakeholderToCast — the one path that adds a Stakeholder to a
     project's Cast (see _csInsertRole in idea-storyboard-9710.js), so the
     Board-of-Directors starting state can be set atomically with the row
     itself instead of an insert-then-update. Board-of-Directors members
     default to Primary Stakeholder (opt-out from there, see
     setPrimaryStakeholder); an ordinary Stakeholder starts unflagged
     (opt-in later, self-only). */
  async function addStakeholderToCast(cardId, userId, isBoardMember){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {ok:false, msg:'Not signed in.'};
      var ins=await sb.from('card_roles').insert({
        card_type:'idea', card_id:cardId, role:'stakeholder', user_id:userId,
        is_board_member:!!isBoardMember, is_primary_stakeholder:!!isBoardMember,
        added_by:u.id
      }).select().single();
      if(ins.error) return {ok:false, msg:ins.error.message};
      return {ok:true, row:ins.data};
    }catch(e){ return {ok:false, msg:(e&&e.message)||'Could not add them as a Stakeholder.'}; }
  }

  /* setPrimaryStakeholder — self-designation only: a plain Stakeholder can
     flag (or unflag) themselves as Primary Stakeholder on a project.
     Board-of-Directors members start flagged already (addStakeholderToCast
     above); this is the opt-in/opt-out path for everyone else. */
  async function setPrimaryStakeholder(cardId, flag){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {ok:false, msg:'Not signed in.'};
      var upd=await sb.from('card_roles').update({is_primary_stakeholder:!!flag})
        .eq('card_type','idea').eq('card_id',cardId).eq('user_id',u.id).eq('role','stakeholder');
      if(upd.error) return {ok:false, msg:upd.error.message};
      return {ok:true};
    }catch(e){ return {ok:false, msg:(e&&e.message)||'Could not update.'}; }
  }

  /* ── ensure-named-header helpers (find existing under parent, else create) ── */

  async function ensureHeaderNamed(name, parentId){
    try{
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
    }catch(e){ console.warn('ensureHeaderNamed exception:', e); return null; }
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
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    // Shared-project fix, Aug 14 2026 -- see ensureHeaderNamed above: drop
    // the user_id filter on the lookup so every Cast member reuses the
    // same MISC instead of each person spawning their own.
    var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','MISC');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    if(await _parentDefaultsSeeded(parentId)) return null;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'MISC',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('MISC setup failed: '+ins.error.message);
    _markParentDefaultsSeeded(parentId);
    return ins.data.id;
  }

  async function ensurePurposeHeader(parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    // Shared-project fix, Aug 14 2026 -- Larry: 'one shared purpose for
    // every story.' Drop the user_id filter on the lookup so every Cast
    // member reuses the project's one true Purpose header instead of each
    // person who opens it spawning their own. RLS still governs what this
    // user is allowed to see, so this can't leak a Purpose header from a
    // project they're not on.
    var q=sb.from('ideas').select('id').eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    if(await _parentDefaultsSeeded(parentId)) return null;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _markParentDefaultsSeeded(parentId);
    return ins.data.id;
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
  }

  /* collaboratorEntries — the actual list of "brought into" projects
     for COLLABORATOR's shortcut buttons. storyboard_members is the
     existing roster/permission layer for exactly this: a traveler
     ends up with a row there either as a plain Cast Member someone
     added them as, or as a delegated TOPIC's owner (mirrored here
     automatically by the delegate_topic() database function) — either
     way, "is this mine" is decided by the referenced project's own
     user_id, never by who added the row. Two-step manual join
     (fetch storyboard_members, then the referenced ideas rows) rather
     than a PostgREST embed, matching how every other multi-table read
     in this file is written.
     Placement rule (per the design lock): whose root project it is,
     not Primary-vs-not — so this only excludes rows the traveler
     themself owns, it does not try to distinguish Primary from
     Stakeholder from plain Cast Member. Still returns [] for everyone
     today (storyboard_members has no rows in production yet) until a
     real second Cast member exists to test against — verified against
     the live database Sept 2, 2026 before writing this. */
  async function collaboratorEntries(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var mem=await sb.from('storyboard_members').select('project_id,role').eq('user_id',u.id);
      if(mem.error){ console.warn('collaboratorEntries storyboard_members error:', mem.error); return []; }
      var rows=mem.data||[];
      if(!rows.length) return [];
      var ids=rows.map(function(r){ return r.project_id; });
      var proj=await sb.from('ideas').select('id,text_content,user_id,topic_owner_user_id,color').in('id',ids);
      if(proj.error){ console.warn('collaboratorEntries ideas error:', proj.error); return []; }
      var byId={}; (proj.data||[]).forEach(function(p){ byId[p.id]=p; });
      var roleByProject={}; rows.forEach(function(r){ roleByProject[r.project_id]=r.role; });
      return ids
        .map(function(id){ return byId[id]; })
        .filter(function(p){ return p && p.user_id!==u.id; })
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

  async function ensureNewAdditionsHeader(parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    // Matches both the current label and the pre-rename one, so boards built
    // before the NEW rename self-heal the first time they're opened again
    // instead of spawning a duplicate reserved header.
    // Shared-project fix, Aug 14 2026 -- see ensurePurposeHeader above:
    // drop the user_id filter so every Cast member reuses the same NEW
    // header instead of each person spawning their own.
    var q=sb.from('ideas').select('id,text_content').eq('content_type','header').in('text_content',['NEW','New Additions']);
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){
      var row=existing.data[0];
      if(row.text_content!=='NEW'){ try{ await sb.from('ideas').update({text_content:'NEW'}).eq('id',row.id); }catch(e){} }
      return row.id;
    }
    if(await _parentDefaultsSeeded(parentId)) return null;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'NEW',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('NEW setup failed: '+ins.error.message);
    _markParentDefaultsSeeded(parentId);
    return ins.data.id;
  }

  async function ensureTrashHeader(){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Trash').limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Trash',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Trash setup failed: '+ins.error.message);
    return ins.data.id;
  }

  /* Archived mirrors Trash exactly (same reserved-bucket mechanic, same
     recoverability) but means "finished, not wrong" rather than "shouldn't
     exist" — added August 1, 2026 for Project Selection archive/delete. */
  async function ensureArchivedHeader(){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Archived').limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Archived',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Archived setup failed: '+ins.error.message);
    return ins.data.id;
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
  async function ensureWishTank(){
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
    ensureStakeholderHeader: ensureStakeholderHeader,
    stakeholderEntries: stakeholderEntries,
    promotedPrimaryEntries: promotedPrimaryEntries,
    addStakeholderToCast: addStakeholderToCast,
    setPrimaryStakeholder: setPrimaryStakeholder,
    ensureIdeaStoryboardsRoot: ensureIdeaStoryboardsRoot,
    ensureNewAdditionsHeader: ensureNewAdditionsHeader,
    ensureTrashHeader: ensureTrashHeader,
    ensureWishTank: ensureWishTank,
    getLastInputTopic: getLastInputTopic,
    setLastInputTopic: setLastInputTopic,
    ancestorChain: ancestorChain
  };

})();
