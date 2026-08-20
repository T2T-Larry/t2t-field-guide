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
     destination, only ever landing buckets for content. */
  var RESERVED_HEADERS = ['NEW','MISC','Purpose','Trash','Archived'];

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
      // Aug 4 2026, Larry: Storyboard sharing -- a member can now be
       // added to someone else's PROJECT tree (see storyboard_members /
       // is_storyboard_member in the DB), so this no longer filters to
       // user_id=u.id. RLS decides what comes back: this traveler's own
       // projects, plus any project someone has added them to. user_id is
       // selected too so the UI can tell an owned project from a shared one.
      var res=await sb.from('ideas').select('id,text_content,user_id').eq('content_type','header').is('cluster_id',null);
      if(res.error){ console.warn('topLevelBoards error:', res.error); return []; }
      return (res.data||[]).filter(function(r){ return RESERVED_HEADERS.indexOf(r.text_content)===-1; });
    }catch(e){ console.warn('topLevelBoards exception:', e); return []; }
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

  async function ensureWishTank(){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {id:null, error:'Not signed in'};
      var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Wish Tank').is('cluster_id',null).limit(1);
      if(existing.error) return {id:null, error:'Select failed: '+existing.error.message};
      if(existing.data && existing.data.length) return {id:existing.data[0].id, error:null};
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Wish Tank',cluster_id:null,created_at:new Date().toISOString()}).select().single();
      if(ins.error || !ins.data) return {id:null, error:'Insert failed: '+(ins.error?ins.error.message:'no data returned')};
      var wishTankId=ins.data.id;
      /* One-time migration, only reached on first-ever creation for this member: every
         pre-existing root-level row gets pulled into the new Wish Tank. Reserved Trash
         header is left alone. Runs exactly once per member. */
      try{
        var mig=await sb.from('ideas').update({cluster_id:wishTankId})
          .eq('user_id',u.id).is('cluster_id',null)
          .neq('id',wishTankId).neq('text_content','Trash');
        if(mig.error) console.warn('Wish Tank migration error:', mig.error);
      }catch(migErr){ console.warn('Wish Tank migration exception:', migErr); }
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
    ensureNewAdditionsHeader: ensureNewAdditionsHeader,
    ensureTrashHeader: ensureTrashHeader,
    ensureWishTank: ensureWishTank,
    getLastInputTopic: getLastInputTopic,
    setLastInputTopic: setLastInputTopic,
    ancestorChain: ancestorChain
  };

})();
