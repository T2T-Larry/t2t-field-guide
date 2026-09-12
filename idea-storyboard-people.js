/* ============================================================
   idea-storyboard-people.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   PEOPLE + ROLES. Who is on a card or project: member-initials caching, the effective-primary-person resolution engine, assigned/notes/lock badges, the Cast/Team roster editor, per-card role management, the people-picker dropdown, and the printable Call Sheet.

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

  var _sboardAssignedCache = {};
  var _sboardAssignedFetchInFlight = {};
  async function _sboardEnsureMemberInitials(uids){
    var missing=[], seen={};
    (uids||[]).forEach(function(uid){
      if(!uid || _sboardAssignedCache[uid] || _sboardAssignedFetchInFlight[uid] || seen[uid]) return;
      seen[uid]=true; missing.push(uid);
    });
    if(!missing.length) return false;
    missing.forEach(function(uid){ _sboardAssignedFetchInFlight[uid]=true; });
    var _sb=T().sb;
    if(!_sb){ missing.forEach(function(uid){ delete _sboardAssignedFetchInFlight[uid]; }); return false; }
    try{
      var res=await _sb.from('members').select('user_id,name,initials').in('user_id', missing);
      if(!res.error && res.data){
        res.data.forEach(function(m){ _sboardAssignedCache[m.user_id]={name:m.name||'', initials:(m.initials||'').toUpperCase()}; });
      }
    }catch(e){}
    missing.forEach(function(uid){ delete _sboardAssignedFetchInFlight[uid]; });
    return true;
  }
  // Legacy path -- still feeds the badge for any card nobody has starred
  // a primary doer on yet via the 👥 button (see _sboardCardPrimaryCache/
  // _sboardEnsureCardPrimary below, which is now the primary source).
  function _sboardEnsureAssignedInitials(rows){
    var uids=(rows||[]).map(function(r){ return r&&r.assigned_user_id; }).filter(Boolean);
    return _sboardEnsureMemberInitials(uids);
  }

  // Primary doer (Session 234, Aug 21) -- who the 👥 dropdown's star is
  // on for a given card. Cache is keyed by "cardType:cardId" -- Session
  // 234's extension to Briefing Cards (via the T2TStoryboard bridge) means
  // this cache can hold entries for more than one card_roles.card_type at
  // once, and a compound key keeps them from ever colliding even though
  // idea/briefing_card ids come from separate uuid columns already.
  // Aug 28 2026: the old is_primary-only fetch/lookup pair that used to
  // live here (_sboardEnsureCardPrimaryRaw/_sboardCardPrimaryUidRaw) was
  // replaced outright by the tacit-assignment resolver just below, which
  // does everything the old pair did plus the two new rules -- nothing
  // else called them by name, so they're gone rather than kept as a
  // second, now-redundant path. _sboardCardPrimaryCache/_sboardCpKey stay:
  // _csTogglePrimary below still uses them to drop a single card's stale
  // entry after a manual star/unstar.
  var _sboardCardPrimaryCache = {};
  function _sboardCpKey(cardType, cardId){ return (cardType||'idea')+':'+cardId; }

  // --- Tacit assignment (Aug 28 2026) -----------------------------------
  // Larry's Session 235 idea, greenlit and built this session: "not
  // assigning a specific person is a tacit assignment to the person at
  // the next higher level." Two rules layer on top of the explicit ★
  // above, and an explicit ★ always wins over both:
  //   1. A card whose Call Sheet has exactly one person on it (any role,
  //      nobody starred) needs no manual tap -- see _csAutoPrimaryIfSolo
  //      further down, which actually writes is_primary=true the moment
  //      a card's roster narrows to one, same as if that star got tapped
  //      by hand. That covers the "one person -> PRIMARY" half.
  //   2. A card with NOBODY on its own Call Sheet inherits whichever
  //      primary its nearest ancestor resolves to -- walking up an Idea
  //      Header's own parent chain (ideas.cluster_id) as many levels as
  //      it takes, all the way to the top ("FIELD GUIDE > CONTENT >
  //      DREAM PHASE", Larry's own example) if that's what it takes to
  //      find someone. This half is display-only: it never writes a
  //      card_roles row onto the empty card (that person isn't actually
  //      on that card's own Cast) -- it only feeds the corner badge and
  //      the board's Team/person filter, the same two things the ★
  //      already fed. A level with two-or-more people and nobody starred
  //      is left alone (ambiguous -- needs a human pick) and the climb
  //      stops there rather than reaching past it.
  // Briefing Cards don't nest under their own Headers the way Idea/Plan
  // cards do (they're a flat list -- see briefing-board.js), so rule 2
  // instead climbs the Idea Header a Briefing Card was spun off from
  // (its source_header_id), when it has one.
  var _sboardEffPrimaryCache = {};
  var _sboardEffPrimaryInFlight = {};
  function _sboardEffKey(cardType, cardId){ return (cardType||'idea')+':'+cardId; }
  // Any card_roles roster change anywhere (add/remove/role-edit/star)
  // can change what a *different*, already-cached card ought to inherit
  // -- e.g. starring someone on a Header should immediately cascade to
  // every child card that was climbing up to it. Rather than track that
  // dependency graph, the whole effective-primary cache is cheap to
  // rebuild (one batched query per screen's worth of visible cards), so
  // every mutation just clears it outright and lets the next render
  // re-warm it.
  function _sboardInvalidateEffPrimary(){ _sboardEffPrimaryCache={}; _sboardEffPrimaryInFlight={}; }

  // Aug 29 2026 -- small fixed-size worker pool so a large batch of async
  // jobs (the ancestor climbs below, when a board's worth of empty cards
  // all need one at once) runs several at a time instead of either fully
  // sequential (slow) or fully unbounded parallel (opens as many
  // concurrent requests as there are jobs -- fine for a few dozen, but
  // thousands of them at once blows past what the browser allows and
  // throws "Failed to fetch" for the overflow). Returns results in the
  // same order as items, same shape as Promise.all(items.map(worker)).
  function _sboardRunLimited(items, limit, worker){
    return new Promise(function(resolve){
      var results=new Array(items.length);
      var next=0, running=0, done=0;
      if(!items.length){ resolve(results); return; }
      function launch(){
        while(running<limit && next<items.length){
          (function(i){
            running++;
            Promise.resolve(worker(items[i], i)).then(function(val){
              results[i]=val;
            }).catch(function(){
              results[i]=null;
            }).then(function(){
              running--; done++;
              if(done===items.length){ resolve(results); } else { launch(); }
            });
          })(next);
          next++;
        }
      }
      launch();
    });
  }

  // One query, every requested card_id's full Cast (not just the starred
  // row) -- reduced to {starred: uid|null, people: [uid,...]} per card so
  // the "exactly one" / "nobody" / "ambiguous" cases below can tell apart
  // without a second round trip for the common cases.
  async function _sboardFetchRoleSummaries(cardType, ids){
    var out={};
    (ids||[]).forEach(function(id){ out[id]={starred:null, people:[], roles:{}}; });
    var _sb=T().sb;
    if(!_sb || !ids || !ids.length) return out;
    // Aug 29 2026 fix: this used to be one .in('card_id', ids) call built
    // from every idea in the whole account -- fine at small scale, but
    // once a traveler's library grows into the thousands (bookmarks, MISC
    // piles, etc., not just the board actually on screen) the id list
    // makes a request URL far past what Supabase's API gateway accepts.
    // That request was failing outright, and because both the try/catch
    // here and the .error check above swallow it silently, every card in
    // the batch fell back to the empty-summary default -- which is what
    // was emptying corner-badge initials board-wide: not a data problem,
    // a request-too-large problem. Chunking keeps each request's id list
    // small enough to always succeed; running the chunks in parallel
    // keeps this just as fast as the single call was meant to be.
    var CHUNK=200;
    var chunks=[];
    for(var i=0;i<ids.length;i+=CHUNK){ chunks.push(ids.slice(i,i+CHUNK)); }
    try{
      var results=await Promise.all(chunks.map(function(chunk){
        return _sb.from('card_roles').select('card_id,user_id,is_primary,role').eq('card_type',cardType).in('card_id', chunk);
      }));
      results.forEach(function(res){
        if(!res.error && res.data){
          res.data.forEach(function(r){
            var bucket=out[r.card_id]; if(!bucket) return;
            if(r.is_primary) bucket.starred=r.user_id;
            if(bucket.people.indexOf(r.user_id)===-1){ bucket.people.push(r.user_id); bucket.roles[r.user_id]=r.role; }
          });
        }
      });
    }catch(e){}
    return out;
  }

  // Sept 9 2026, Larry: when a card has more than one person on its Call
  // Sheet and nobody's starred a Primary, stop leaving the corner badge
  // blank -- default to whoever sits at the top of that same roster the
  // Call Sheet screen shows (see CS_ROLE_ORDER below: Stakeholder before
  // Cast Member, etc.), so the badge always shows someone at a glance.
  // Purely a fallback guess -- starring someone by hand on the Call Sheet
  // screen still overrides this immediately, same as it always has.
  var _sboardRoleRankOrder = ['stakeholder','primary','cast_member','facilitator','facilitator_qualified'];
  function _sboardTopRosterUid(summary){
    var people=(summary&&summary.people)||[];
    if(!people.length) return null;
    var roles=(summary&&summary.roles)||{};
    var best=people[0], bestRank=_sboardRoleRankOrder.indexOf(roles[best]);
    if(bestRank<0) bestRank=_sboardRoleRankOrder.length;
    for(var i=1;i<people.length;i++){
      var r=_sboardRoleRankOrder.indexOf(roles[people[i]]);
      if(r<0) r=_sboardRoleRankOrder.length;
      if(r<bestRank){ best=people[i]; bestRank=r; }
    }
    return best;
  }

  // Walks a single Idea row's own cluster_id chain, one level per await,
  // until a level resolves (starred, or exactly one person) or there's
  // nowhere higher left to go. Every id visited along the way gets the
  // same final answer cached (they all share it by definition), so a
  // second card climbing through the same empty Sub-header/Header later
  // this session is an instant cache hit rather than a re-climb. Capped
  // at 25 levels as a sanity guard -- no real board nests anywhere close
  // to that deep.
  async function _sboardClimbForPrimary(startCardId){
    var _sb=T().sb;
    var cardId=startCardId, visited=[], guard=0, resolved=null;
    while(cardId && guard<25){
      guard++;
      var key=_sboardEffKey('idea', cardId);
      if(_sboardEffPrimaryCache.hasOwnProperty(key)){ resolved=_sboardEffPrimaryCache[key]; break; }
      visited.push(cardId);
      var summaries=await _sboardFetchRoleSummaries('idea', [cardId]);
      var s=summaries[cardId]||{starred:null,people:[]};
      if(s.starred){ resolved=s.starred; break; }
      if(s.people.length===1){ resolved=s.people[0]; break; }
      if(s.people.length>1){ resolved=null; break; } // ambiguous here -- stop, don't reach past it
      if(!_sb){ resolved=null; break; }
      var row=await _sb.from('ideas').select('cluster_id').eq('id',cardId).maybeSingle();
      var parentId=(!row.error && row.data)?row.data.cluster_id:null;
      if(!parentId){ resolved=null; break; } // top of the chain -- truly nobody anywhere above
      cardId=parentId;
    }
    visited.forEach(function(id){ _sboardEffPrimaryCache[_sboardEffKey('idea',id)]=resolved; });
    return resolved;
  }

  // Batched entry point -- same shape as the plain is_primary-only fetch
  // above, now layered with both tacit-assignment rules.
  // sourceHeaderIdByCardId is Briefing Board's own map of
  // {cardId: sourceHeaderId}; ignored (and unnecessary) for cardType
  // 'idea', which climbs its own rows directly.
  async function _sboardEnsureEffectivePrimaryRaw(cardType, ids, sourceHeaderIdByCardId){
    cardType=cardType||'idea';
    var need=[];
    (ids||[]).forEach(function(id){
      var key=_sboardEffKey(cardType,id);
      if(id && !_sboardEffPrimaryCache.hasOwnProperty(key) && !_sboardEffPrimaryInFlight[key]) need.push(id);
    });
    if(!need.length) return false;
    need.forEach(function(id){ _sboardEffPrimaryInFlight[_sboardEffKey(cardType,id)]=true; });
    var summaries=await _sboardFetchRoleSummaries(cardType, need);
    var climbNeeded=[], toWarm=[];
    need.forEach(function(id){
      var s=summaries[id]||{starred:null,people:[]};
      var key=_sboardEffKey(cardType,id);
      if(s.starred){ _sboardEffPrimaryCache[key]=s.starred; toWarm.push(s.starred); }
      else if(s.people.length===1){ _sboardEffPrimaryCache[key]=s.people[0]; toWarm.push(s.people[0]); }
      else if(s.people.length>1){
        var _topUid=_sboardTopRosterUid(s);
        _sboardEffPrimaryCache[key]=_topUid;
        if(_topUid) toWarm.push(_topUid);
      }
      else { climbNeeded.push(id); }
    });
    // Aug 29 2026 fix: these used to climb one card at a time (await
    // inside a plain for-loop) -- harmless for a handful of cards, but
    // once hundreds/thousands of cards need the tacit-assignment climb at
    // once (see _sboardFetchRoleSummaries above), doing them one at a
    // time meant several minutes of sequential network round trips before
    // the last card's badge ever appeared. Every climb here is a read
    // with no side effects, so running a bounded number together at once
    // is safe -- and siblings sharing an ancestor still short-circuit off
    // each other via _sboardEffPrimaryCache as soon as the first one
    // resolves it.
    //
    // Same day, caught minutes later: firing ALL of them at once
    // (Promise.all over the full list, unbounded) is what actually
    // shipped first -- fine for a normal board, but with a few thousand
    // cards needing a climb simultaneously it opens a few thousand
    // concurrent requests at once, which blows past what the browser
    // allows and throws "TypeError: Failed to fetch" for the overflow
    // (and can leave the board stuck on Loading). A small fixed pool
    // (_sboardRunLimited) gets the same speed for a normal-size climb
    // batch while capping how many requests are ever in flight together.
    if(climbNeeded.length){
      var climbResults=await _sboardRunLimited(climbNeeded, 20, function(id){
        var startId = (cardType==='idea') ? id : ((sourceHeaderIdByCardId && sourceHeaderIdByCardId[id]) || null);
        return startId ? _sboardClimbForPrimary(startId) : Promise.resolve(null);
      });
      climbNeeded.forEach(function(id, idx){
        var val=climbResults[idx];
        _sboardEffPrimaryCache[_sboardEffKey(cardType,id)]=val;
        if(val) toWarm.push(val);
      });
    }
    if(toWarm.length) await _sboardEnsureMemberInitials(toWarm);
    need.forEach(function(id){ delete _sboardEffPrimaryInFlight[_sboardEffKey(cardType,id)]; });
    return true;
  }
  function _sboardEffectivePrimaryUidRaw(cardType, cardId){
    var key=_sboardEffKey(cardType||'idea', cardId);
    return _sboardEffPrimaryCache.hasOwnProperty(key) ? _sboardEffPrimaryCache[key] : undefined;
  }

  // Idea Board's own convenience wrappers -- unchanged signatures, every
  // existing call site in this file/session.js keeps working as-is. Now
  // routed through the tacit-assignment resolver above instead of the
  // plain is_primary-only cache.
  async function _sboardEnsureCardPrimary(rows){
    var ids=(rows||[]).map(function(r){ return r&&r.id; }).filter(Boolean);
    return _sboardEnsureEffectivePrimaryRaw('idea', ids);
  }
  function _sboardCardPrimaryUid(item){
    if(!item) return '';
    var uid=_sboardEffectivePrimaryUidRaw('idea', item.id);
    return uid || item.assigned_user_id || '';
  }
  function _sboardAssignedBadgeHTML(item){
    // Aug 28 2026, Larry: "if initials are on the front, someone has
    // clearly been assigned" -- a card can legitimately show nobody's
    // OWN Call Sheet is empty and still display an inherited primary
    // from up the chain (see the tacit-assignment block above), which
    // read as a contradiction/bug to him. This per-card switch (on the
    // assignment screen) lets him force the front blank on a specific
    // card without touching who resolves as primary underneath -- the
    // resolution itself, and everything that depends on it (filtering,
    // the Call Sheet screen), is untouched; only this one badge is
    // suppressed.
    if(item && item.hide_primary_badge) return '';
    // Aug 29 2026, Larry: a board-wide master switch (Utility -> Preferences
    // -> Initials) -- "if I am the only person on the project, there is no
    // need to have initials on any cards." Lives on the project's own root
    // row (ideas.hide_all_initials, same pattern as logo_url/hide_primary_badge)
    // so it's scoped to the current project, not every project account-wide.
    // Checked here rather than only at fetch time so it takes effect the
    // moment it's flipped, without needing a fresh page load.
    var _sbProjRow=_sboardCurrentProjectRow();
    if(_sbProjRow && _sbProjRow.hide_all_initials) return '';
    var uid=_sboardCardPrimaryUid(item);
    if(!uid) return '';
    var m=_sboardAssignedCache[uid];
    if(!m) return ''; // not fetched yet this pass -- next re-render (see _sboardEnsureCardPrimary/_sboardEnsureAssignedInitials) fills it in
    return '<div class="sb-person-badge" title="'+_sboardEsc(m.name||'')+'">'+_sboardEsc(m.initials||'')+'</div>';
  }
  function _sboardNotesBadgeHTML(item){
    if(!item || !item.notes || !item.notes.trim()) return '';
    return '<div class="sb-notes-badge" title="Has notes">✏️</div>';
  }
  // Lock badge, Aug 15 2026 -- previously an ad-hoc top-right icon built
  // separately in _sboardMakeTile/_sboardMakeHeaderStackTile; centralized
  // here so it's just another signal-flag-style helper, matching
  // _sboardNotesBadgeHTML above. Larry: "is the LOCK not just another
  // FLAG? ... all signal flags are added to the lower left corner."
  function _sboardLockBadgeHTML(item){
    if(!item || !item.locked) return '';
    return '<span class="sb-lock-badge" title="Locked — parked here, paused before its turn. Was in progress; worth asking why.">🔒</span>';
  }
  // Shared bottom-left signal cluster wrapper, Aug 15 2026 -- Larry
  // caught the fixed-offset version leaving a stranded gap whenever a
  // card was missing one of Lock/Notes/Link (e.g. a header with only
  // Lock + one Signal Flag showed the flag stuck halfway across the
  // card, at its old fixed left:44 spot, instead of snug against Lock).
  // Every call site below now asks for exactly the badges it wants
  // (matching what each one showed before this refactor -- this is a
  // positioning fix, not a new-content change) and gets them back
  // packed together with no dead space, wrapped in one .sb-signal-row
  // div so they're positioned as a single unit.
  function _sboardSignalRowHTML(item, include){
    include = include || {};
    var parts = '';
    if(include.lock) parts += _sboardLockBadgeHTML(item);
    if(include.flags) parts += _sboardKeyDotsHTML(item);
    if(include.notes) parts += _sboardNotesBadgeHTML(item);
    if(include.link) parts += _sboardLinkBadgeHTML(item);
    if(!parts) return '';
    return '<div class="sb-signal-row">'+parts+'</div>';
  }
  var _tmRosterCache = [];
  var _tmRosterOwner = null;
  var _tmRosterIsOwner = false;
  var _tmRosterIsLeader = false; // Aug 13 2026, Larry: Owner-or-Leader can now manage the Cast too
  var _tmRosterCanManage = false; // = _tmRosterIsOwner || _tmRosterIsLeader
  var _tmAllMembersCache = null; // list_members_for_picker() results, fetched once per session
  async function _tmFetchAllMembers(){
    if(_tmAllMembersCache) return _tmAllMembersCache;
    var _sb=T().sb; if(!_sb) return [];
    try{
      var res=await _sb.rpc('list_members_for_picker');
      _tmAllMembersCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _tmAllMembersCache=[]; }
    return _tmAllMembersCache;
  }
  function _tmRenderMemberSuggestions(projectRow, query, targetId){
    var box=document.getElementById(targetId||'tm-add-suggest'); if(!box) return;
    var already={}; _tmAllRosterRows(projectRow).forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    var pool=(_tmAllMembersCache||[]).filter(function(m){ return !already[m.user_id]; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone\u2019s already in this Cast.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc9710(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc9710(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc9710(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  function _sboardCurrentProjectRow(){
    if(!T2TShared.currentTopicId || !_sboardAllRowsById[T2TShared.currentTopicId]) return null;
    return _sboardProjectRowFor(_sboardAllRowsById[T2TShared.currentTopicId]);
  }

  function _tmRoleSymbol(m){
    if(m.isOwner) return '\uD83D\uDC51';
    if(m.role==='sponsor') return '\uD83C\uDF31';
    if(m.role==='leader') return '\uD83C\uDFAF';
    if(m.is_facilitator) return '\uD83C\uDFA4';
    if(m.can_facilitate) return '\u2726';
    return '\u2610';
  }
  function _tmRoleTitle(m){
    if(m.isOwner) return 'Owner';
    if(m.role==='sponsor') return 'Sponsor';
    if(m.role==='leader') return 'Leader';
    if(m.is_facilitator) return 'Facilitator';
    if(m.can_facilitate) return 'Facilitator-qualified';
    return 'Cast Member';
  }

  async function _tmLoadRoster(projectRow){
    var _sb=T().sb; if(!_sb || !projectRow) return;
    var uid=(await _sb.auth.getUser()).data.user;
    uid=uid?uid.id:null;
    // Fractal Casting (Aug 9 2026): a delegated TOPIC's Owner isn't the
    // header row's original creator (user_id) -- it's whoever it was
    // delegated to, tracked via topic_owner_user_id and mirrored into
    // storyboard_members (role='owner') by delegate_topic() so the same
    // roster RPC already returns it. Root PROJECTs and plain headers are
    // unaffected -- same creator-is-Owner convention as always.
    var isTopic = !!projectRow.topic_owner_user_id;
    _tmRosterIsOwner = !!uid && (isTopic ? projectRow.topic_owner_user_id===uid : projectRow.user_id===uid);
    try{
      var res=await _sb.rpc('list_storyboard_members', {p_project_id: projectRow.id});
      var all=(!res.error && res.data) ? res.data : [];
      if(isTopic){
        var ownerRow=all.find(function(m){ return m.role==='owner'; });
        _tmRosterOwner = ownerRow ? {user_id:ownerRow.user_id, name:ownerRow.name, email:ownerRow.email, initials:ownerRow.initials, phone:ownerRow.phone} : null;
        // View-only visitors (Aug 8 2026) aren't Team members -- they show
        // up in People > Manage Access only, not in the role-based roster.
        // The owner row is pulled out above so it renders via the crown
        // bucket instead of doubling as a regular Cast row.
        _tmRosterCache = all.filter(function(m){ return m.role!=='owner' && (m.access_level||'edit')==='edit'; });
      } else {
        try{
          var ownerRes=await _sb.from('members').select('user_id,name,email,initials,phone').eq('user_id', projectRow.user_id).maybeSingle();
          _tmRosterOwner = (!ownerRes.error && ownerRes.data) ? ownerRes.data : null;
        }catch(e){ _tmRosterOwner=null; }
        _tmRosterCache = all.filter(function(m){ return (m.access_level||'edit')==='edit'; });
      }
    }catch(e){ _tmRosterCache=[]; _tmRosterOwner=null; }
    // Owner-or-Leader (Aug 13 2026, Larry): a Leader can now add members
    // and change others' roles too, everywhere that ability exists --
    // Gear's Team screen and the VIEW dropdown's own add-row.
    _tmRosterIsLeader = !!uid && (_tmRosterCache||[]).some(function(m){ return String(m.user_id)===String(uid) && m.role==='leader'; });
    _tmRosterCanManage = _tmRosterIsOwner || _tmRosterIsLeader;
  }

  function _tmAllRosterRows(projectRow){
    var rows=[];
    if(_tmRosterOwner) rows.push({user_id:_tmRosterOwner.user_id, name:_tmRosterOwner.name, email:_tmRosterOwner.email, phone:_tmRosterOwner.phone, isOwner:true, role:null, can_facilitate:true, is_facilitator:false, notes:(projectRow&&projectRow.owner_notes)||''});
    (_tmRosterCache||[]).forEach(function(m){ rows.push({user_id:m.user_id, name:m.name, email:m.email, phone:m.phone, isOwner:false, role:m.role, can_facilitate:m.can_facilitate, is_facilitator:m.is_facilitator, notes:m.notes||''}); });
    return rows;
  }

  function _esc9710(s){ return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  function _tmRenderRoster(projectRow){
    var wrap=document.getElementById('tm-list-view'); if(!wrap) return;
    var rows=_tmAllRosterRows(projectRow);
    wrap.innerHTML = rows.map(function(m){
      var clickable = (!m.isOwner && _tmRosterCanManage);
      var panel = (!m.isOwner) ? (
        '<div class="tm-rolepanel" id="tm-rp-'+_esc9710(m.user_id)+'" style="display:none">'
          +'<label><input type="radio" name="tm-sp" class="tm-r-sponsor" data-uid="'+_esc9710(m.user_id)+'"'+(m.role==='sponsor'?' checked':'')+'> \uD83C\uDF31 Sponsor</label>'
          +'<label><input type="radio" name="tm-tl" class="tm-r-leader" data-uid="'+_esc9710(m.user_id)+'"'+(m.role==='leader'?' checked':'')+'> \uD83C\uDFAF Leader</label>'
          +'<label><input type="checkbox" class="tm-r-canfac" data-uid="'+_esc9710(m.user_id)+'"'+(m.can_facilitate?' checked':'')+'> \u2726 Facilitator-qualified</label>'
          +'<label><input type="radio" name="tm-fac" class="tm-r-fac" data-uid="'+_esc9710(m.user_id)+'"'+(m.is_facilitator?' checked':'')+'> \uD83C\uDFA4 Facilitator</label>'
        +'</div>'
      ) : '';
      var contactLine, notesLine;
      if(m.isOwner){
        contactLine = '<div class="tm-contact">\u2709 '+_esc9710(m.email||'')+' &nbsp;&nbsp; \u260E <input type="text" class="tm-phone-input tm-owner-phone" placeholder="Add phone" value="'+_esc9710(m.phone||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input tm-owner-notes" placeholder="\u2014" value="'+_esc9710(m.notes||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
      } else {
        var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc9710(m.phone)) : '';
        contactLine = '<div class="tm-contact">\u2709 '+_esc9710(m.email||'')+phoneLine+'</div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input" data-uid="'+_esc9710(m.user_id)+'" placeholder="\u2014" value="'+_esc9710(m.notes||'')+'" '+(_tmRosterIsOwner?'':'disabled')+'></div>';
      }
      return '<div class="tm-row">'
        +'<div class="tm-sym'+(clickable?' tm-clickable':'')+'" '+(clickable?'data-uid="'+_esc9710(m.user_id)+'"':'')+'>'+_tmRoleSymbol(m)+'</div>'
        +'<div class="tm-body">'
          +'<div class="tm-name">'+_esc9710(m.name||m.email||'')+' <span class="tm-role">&middot; '+_tmRoleTitle(m)+'</span></div>'
          +contactLine
          +notesLine
          +panel
        +'</div>'
      +'</div>';
    }).join('');
    var addTile=document.getElementById('tm-add-tile');
    if(addTile) addTile.style.display = _tmRosterCanManage ? 'flex' : 'none';
  }

  async function _tmSaveMemberRole(projectRow, uid, role, canFac, isFac){
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.rpc('update_storyboard_member', {p_project_id: projectRow.id, p_user_id: uid, p_role: role, p_can_facilitate: canFac, p_is_facilitator: isFac}); }catch(e){}
    await _tmLoadRoster(projectRow); _tmRenderRoster(projectRow);
  }
  async function _tmSaveMemberNotes(projectRow, uid, notes){
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.rpc('update_storyboard_member_notes', {p_project_id: projectRow.id, p_user_id: uid, p_notes: notes}); }catch(e){}
  }
  async function _tmSaveOwnerNotes(projectRow, notes){
    if(!_tmRosterIsOwner) return;
    var _sb=T().sb; if(!_sb) return;
    projectRow.owner_notes=notes;
    try{ await _sb.from('ideas').update({owner_notes: notes}).eq('id', projectRow.id); }catch(e){}
  }
  async function _tmSaveOwnerPhone(phone){
    if(!_tmRosterIsOwner) return;
    var _sb=T().sb; if(!_sb) return;
    if(_tmRosterOwner) _tmRosterOwner.phone=phone;
    try{ await _sb.rpc('update_board_owner_contact', {p_phone: phone}); }catch(e){}
  }
  async function _tmAddMember(projectRow, email){
    var rows=_tmAllRosterRows(projectRow);
    var cap=(projectRow&&projectRow.member_cap) || 7;
    if(rows.length>=cap) return {ok:false,msg:'This board is at its '+cap+'-person cap.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await _sb.rpc('find_member_by_email', {p_email: String(email||'').trim().toLowerCase()});
      var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
      if(!match) return {ok:false,msg:'No T2T member found with that email.'};
      // Aug 16 2026, Larry: a root project linked to a Briefing Board
      // shares that board's Cast now -- one roster, not two that can
      // drift apart (this used to write straight to storyboard_members,
      // independent of the Briefing Board's own board_members). The RPC
      // resolves which table that actually is server-side, same as
      // list/update_storyboard_member(_notes) below -- never trust a
      // client-cached briefing_board_id for this.
      var ins=await _sb.rpc('add_storyboard_member', {p_project_id: projectRow.id, p_user_id: match.user_id});
      if(ins.error) return {ok:false,msg:ins.error.message||'Could not add them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not add them.'}; }
  }

  async function _tmRemoveMember(projectRow, uid){
    if(!projectRow) return {ok:false,msg:'No project selected.'};
    if(_tmRosterOwner && String(uid)===String(_tmRosterOwner.user_id)) return {ok:false,msg:'The Owner can\'t be removed.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var del=await _sb.rpc('remove_storyboard_member', {p_project_id: projectRow.id, p_user_id: uid});
      if(del.error) return {ok:false,msg:del.error.message||'Could not remove them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not remove them.'}; }
  }

  // ---- Role / Call Sheet -- Session 222 (Aug 18) design, built Session
  // 223 (Aug 19) after the DB table (card_roles, created live Session
  // 222) survived a lost-code restart untouched. One shared screen,
  // callable from any card (Subber/Header/TOPIC) via the 📋 button on
  // its DETAILS back -- 🎬 was already taken by the Video/Link toggle,
  // so Call Sheet gets its own icon instead of colliding with it.
  // Reuses card_roles and the same name/email/notes row look as Team
  // Roster (tm-* classes), grouped into three boxes per Larry's design:
  // Stakeholders (invested, not doing), The Doers (Leader + Cast
  // Member), and Facilitator (process, not outcome) with
  // Facilitator-qualified alongside it. Idea Storyboard only so far --
  // the Briefing Board rollout (card_type='briefing_card') is a later
  // step.
  // Session 228 (Aug 19): Principal folded into Stakeholder -- Larry's
  // insight was that everyone in that box is really a Stakeholder,
  // some just happen to be KEY (able to directly interfere with
  // progress). Migrated live: card_roles gained an is_key boolean, the
  // one existing 'principal' row became stakeholder+is_key=true, and
  // 'principal' was dropped from the role check constraint. is_key is
  // a per-row toggle (🔑, click to star/unstar) shown only on
  // Stakeholder rows -- deliberately a different mark from
  // is_parent_connection's gold ★ ("carried over from the parent" via
  // Fractal Casting) so the two meanings can't be confused on the same
  // row. Not yet built: auto-defaulting a new card's Stakeholder to
  // whoever assigned it, and auto-marking a Fractal Casting delegator
  // as is_parent_connection in the first place -- both still flagged
  // open in Design Notes.
  var _csRoles = [];
  var _csItem = null;
  // Which card_roles.card_type the module-level _csItem/_csRoles state
  // above belongs to right now -- 'idea' unless something outside this
  // file (briefing-board.js, via the T2TStoryboard bridge) opened the
  // 👥 dropdown for its own card type. Session 234 (Aug 21).
  var _csCardType = 'idea';
  // Whichever board opened the Cast popup owns its own checked-people
  // filter array (Idea/Plan share _sboardPersonFilterIds; Briefing Board
  // has its own) -- openCallSheet points this at the right one so the
  // popup's checkboxes read/reflect the correct board's filter state.
  // Session 255.
  var _csActiveFilterIds = [];
  // Aug 28 2026 -- "please redraw the board now" callback, set by
  // whichever caller (compact dropdown or full Call Sheet) opened this
  // roster, so a roster/star change is visible on the card's own
  // corner badge the moment the popup closes rather than only after
  // some unrelated action happens to re-render the board. Idea/Plan and
  // Briefing Board each have their own render pipeline (renderSeaBoard
  // vs. briefing-board.js's own renderBoard) -- this is deliberately a
  // plain callback rather than a hardcoded function name so both work.
  // Distinct from onFilterChange below, which is specifically for the
  // Cast popup's own person-filter checkboxes, not for this.
  var _csOnRosterChange = null;
  // Session 255 (Aug 28 2026), Larry: three basic roles -- Stakeholder,
  // Primary, Cast Member -- with Facilitator and Facilitator-qualified
  // (backup) as the two Cast Member variants that matter enough to call
  // out on their own. PRIMARY replaces the old "Leader" role AND absorbs
  // the separate ★ primary-doer star into one idea: "the person
  // responsible for making it happen." See _csSaveRole for how it keeps
  // the existing is_primary/★ plumbing (corner badge, board filter
  // fallback) in sync without rewiring those call sites.
  // Guest added Sept 12 2026, Larry: the role screen (this same panel --
  // Call Sheet full view and the compact 👥 dropdown both read off this
  // one list) needed a lightest-weight option for someone along for
  // visibility only, no responsibility on the card. Appended at the end
  // -- least involved, listed last -- rather than inserted among the
  // four working roles above it. Needs 'guest' allowed by the
  // card_roles_role_check constraint in Supabase (added same day).
  var CS_ROLE_ORDER = ['stakeholder','primary','cast_member','facilitator','facilitator_qualified','guest'];
  var CS_ROLE_LABEL = {
    stakeholder:'Stakeholder', primary:'Primary',
    cast_member:'Cast Member', facilitator:'Facilitator',
    facilitator_qualified:'Facilitator-qualified (backup)',
    guest:'Guest'
  };
  var CS_ROLE_SYM = {
    stakeholder:'👤', primary:'🎯',
    cast_member:'☐', facilitator:'🎤', facilitator_qualified:'✦',
    guest:'🎫'
  };

  async function _csLoadRoles(item){
    var _sb=T().sb; if(!_sb || !item){ _csRoles=[]; return; }
    try{
      var res=await _sb.from('card_roles').select('*').eq('card_type',_csCardType||'idea').eq('card_id', item.id);
      _csRoles = (!res.error && res.data) ? res.data : [];
    }catch(e){ _csRoles=[]; }
  }

  function _csRowsForRole(role){
    return (_csRoles||[]).filter(function(r){ return r.role===role; });
  }

  function _csMemberLookup(uid){
    var pool=_tmAllMembersCache||[];
    for(var i=0;i<pool.length;i++){ if(String(pool[i].user_id)===String(uid)) return pool[i]; }
    return null;
  }

  // Flat Cast list, Session 255 -- replaces the old three-box grouping
  // (Stakeholders/Doers/Facilitator) with one list, same tm-row look the
  // board-level Team/Cast screens already use. Sort: primary doer first
  // (the one person most worth seeing at a glance), then by CS_ROLE_ORDER,
  // then by name, so the list doesn't reshuffle on every render.
  function _csAllRolesFlat(){
    var rows=(_csRoles||[]).slice();
    rows.sort(function(a,b){
      if(!!a.is_primary!==!!b.is_primary) return a.is_primary?-1:1;
      var ra=CS_ROLE_ORDER.indexOf(a.role), rb=CS_ROLE_ORDER.indexOf(b.role);
      if(ra!==rb) return ra-rb;
      var ma=_csMemberLookup(a.user_id), mb=_csMemberLookup(b.user_id);
      var na=(ma?(ma.name||ma.email):'')||'', nb=(mb?(mb.name||mb.email):'')||'';
      return na.localeCompare(nb);
    });
    return rows;
  }

  function _csRenderRow(r){
    var m=_csMemberLookup(r.user_id);
    var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
    var email=m?(m.email||''):'';
    var phone=m?(m.phone||''):'';
    var star=r.is_parent_connection?'<span class="cs-parent-star" title="Carried over from the parent">★</span>':'';
    // Primary doer star, Session 234 -- same toggle as the compact 👥
    // dropdown (_sbPeopleRenderList); both read/write the same
    // card_roles.is_primary column via _csTogglePrimary.
    // Passive now, Session 255 -- PRIMARY is picked from the role panel
    // like any other role (see CS_ROLE_ORDER comment); this is just the
    // at-a-glance ★ for whoever currently holds it, not a click target.
    var primaryMark=r.role==='primary'?'<span class="cs-primary-toggle cs-primary-on" title="Primary — the person responsible for making it happen">★</span>':'';
    // Board-wide filter checkbox, Session 255 -- Larry: check one or more
    // people and the whole board narrows to their assignments (any role,
    // Stakeholder included -- being recognized as a Stakeholder carries
    // its own communication expectation, not just the doing roles). See
    // _sboardPersonFilterIds / _sboardFilterByPerson.
    var checked=(_csActiveFilterIds||[]).indexOf(String(r.user_id))>=0;
    var filterChk='<input type="checkbox" class="cs-filter-chk" data-uid="'+_esc9710(r.user_id)+'" title="Show this person’s cards across the whole board"'+(checked?' checked':'')+'>';
    var hasNotes=!!(r.notes && String(r.notes).length);
    var pencil='<span class="cs-notes-pencil'+(hasNotes?' cs-notes-has':'')+'" data-rowid="'+_esc9710(r.id)+'" title="Notes">✏️</span>';
    // Role choices only show once the name is clicked, Session 255 --
    // Larry: "role choices only show when clicking the name." Still the
    // card's own five roles (kept as-is: "every card is its own potential
    // PROJECT," not folded into the board's Sponsor/Leader vocabulary).
    // One role per row -- picking a new one updates this same card_roles
    // row rather than adding a second row for the same person.
    var panel='<div class="tm-rolepanel" id="cs-rp-'+_esc9710(r.id)+'" style="display:none">'
      + CS_ROLE_ORDER.map(function(role){
          return '<label><input type="radio" name="cs-role-'+_esc9710(r.id)+'" class="cs-r-role" data-rowid="'+_esc9710(r.id)+'" value="'+role+'"'+(r.role===role?' checked':'')+'> '+CS_ROLE_SYM[role]+' '+CS_ROLE_LABEL[role]+'</label>';
        }).join('')
      + (r.role==='stakeholder' ? '<label><input type="checkbox" class="cs-key-chk" data-rowid="'+_esc9710(r.id)+'"'+(r.is_key?' checked':'')+'> 🔑 Key Stakeholder — can directly interfere with progress</label>' : '')
    +'</div>';
    // Session 255, Larry: "every Stakeholder has expectations...
    // boundaries" -- reuses this same Notes spot rather than a separate
    // field; it just relabels and re-prompts itself for a Stakeholder row
    // so what gets written there is naturally framed as what they expect
    // and what's off-limits, not a generic scratch note.
    var isStakeholder=r.role==='stakeholder';
    var notesLbl=isStakeholder?'EXPECTATIONS / BOUNDARIES:':'NOTES:';
    var notesPh=isStakeholder?'What do they expect? What’s off-limits?':'—';
    return '<div class="tm-row">'
      +'<div class="tm-sym">'+filterChk+'</div>'
      +'<div class="tm-body">'
        +'<div class="tm-name">'+primaryMark+star+'<span class="cs-name-click" data-rowid="'+_esc9710(r.id)+'" style="cursor:pointer">'+_esc9710(name)+'</span> <span class="cs-role-tag">· '+CS_ROLE_LABEL[r.role]+'</span>'+pencil+' <span class="cs-remove-x" data-rowid="'+_esc9710(r.id)+'" title="Remove">✕</span></div>'
        +'<div class="tm-contact">✉ <input type="text" class="cs-contact-input cs-contact-email" data-uid="'+_esc9710(r.user_id)+'" value="'+_esc9710(email)+'" placeholder="email"> &nbsp; ☎ <input type="text" class="cs-contact-input cs-contact-phone" data-uid="'+_esc9710(r.user_id)+'" value="'+_esc9710(phone)+'" placeholder="phone"></div>'
        +'<div class="tm-notes-row cs-notes-row" id="cs-nr-'+_esc9710(r.id)+'" style="display:'+(hasNotes?'flex':'none')+'"><span class="tm-notes-lbl">'+notesLbl+'</span><input type="text" class="tm-notes-input cs-notes-input" data-rowid="'+_esc9710(r.id)+'" placeholder="'+_esc9710(notesPh)+'" value="'+_esc9710(r.notes||'')+'"></div>'
        +panel
      +'</div>'
    +'</div>';
  }

  function _csRenderFlatRoster(){
    var wrap=document.getElementById('cs-rows-all'); if(!wrap) return;
    var rows=_csAllRolesFlat();
    wrap.innerHTML = rows.length ? rows.map(_csRenderRow).join('') : '<div class="cs-empty-role">Nobody yet</div>';
  }

  // Single add tile, Session 255 -- used to be one (+) per role box
  // (you picked the role by which box you clicked); now there's one
  // Cast, one add, and the role gets picked afterward by clicking the
  // new person's name. New adds default to Cast Member.
  function _csRenderAddRow(){
    return '<div class="tm-addrow" style="margin-top:4px;justify-content:flex-start">'
        +'<div class="tm-add-tile cs-add-tile" id="cs-add-tile" title="Add to this card’s Cast">+</div>'
      +'</div>'
      +'<div class="cs-add-form" id="cs-add-form" style="display:none;margin:4px 0 2px">'
        +'<div class="tm-add-wrap">'
          +'<input type="text" class="cs-add-email" id="cs-add-email" placeholder="Type a name or email..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:calc(12px * var(--fg-text-scale,1));padding:6px 8px;border:1px solid #cfe4f2;border-radius:6px">'
          +'<div class="tm-add-suggest cs-add-suggest" id="cs-add-suggest" style="display:none"></div>'
        +'</div>'
      +'</div>';
  }

  // Session 255: dropped the role param -- with one row per person per
  // card now, "already here" means anywhere on the card, not just this
  // one role's old box. Still used unchanged by the compact 👥 dropdown
  // (_sbPeopleAddRole callers below), which is why the signature stays
  // query-only rather than folding cardType in too.
  function _csRenderSuggestions(query){
    var box=document.getElementById('cs-add-suggest')||document.getElementById('sb-people-add-suggest'); if(!box) return;
    var already={}; (_csRoles||[]).forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    var pool=(_tmAllMembersCache||[]).filter(function(m){ return !already[m.user_id]; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone’s already on this card.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc9710(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc9710(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc9710(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  // _csRefreshUI redraws whichever of the flat Cast screen / compact
  // dropdown is actually open after any card_roles change -- at most one
  // of the two is ever on screen at once, both checks are no-ops when
  // their own DOM isn't present.
  function _csRefreshUI(){
    _csRenderFlatRoster();
    _sbPeopleRenderList();
  }

  // "Hide badge on this card's front" (Aug 28 2026) -- a plain per-card
  // switch on the assignment screen, independent of who's actually
  // Primary/on the Cast. Written straight to the card's own table
  // (ideas for card_type 'idea'/'plan', briefing_cards for
  // 'briefing_card') rather than card_roles, since it describes the
  // card, not a person on it. _sboardPatchRow keeps the Idea/Plan
  // board's own in-memory row in sync so a render before the next full
  // fetch doesn't show stale state; briefing-board.js's _csItem is
  // already a live reference into its own cards array (see
  // _bbFindCardAnywhere), so mutating it directly here is enough there.
  async function _csSetHideBadge(hidden){
    if(!_csItem) return;
    var _sb=T().sb; if(!_sb) return;
    var table = (_csCardType==='briefing_card') ? 'briefing_cards' : 'ideas';
    try{
      var upd=await _sb.from(table).update({hide_primary_badge:hidden}).eq('id', _csItem.id);
      if(upd.error) return;
      // Both spellings: idea-storyboard-9710.js reads raw snake_case
      // Supabase fields straight off item (item.hide_primary_badge);
      // briefing-board.js maps rows into camelCase card objects
      // (c.hidePrimaryBadge, see _bbRowToCard) -- _csItem is a live
      // reference into whichever board's own object, so both need
      // setting here rather than guessing which one the caller reads.
      _csItem.hide_primary_badge=hidden;
      _csItem.hidePrimaryBadge=hidden;
      if(_csCardType!=='briefing_card') _sboardPatchRow(_csItem.id, {hide_primary_badge:hidden});
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){}
  }

  // Board-wide master switch for corner-badge initials, Aug 29 2026,
  // Larry: "we have it set to hide on individual cards... I would also
  // like a board toggle in the Utility button on the page to turn
  // initials on or off all the cards at one time. If I am the only
  // person on the project, there is no need to have initials on any
  // cards." Lives on the project's own root row (ideas.hide_all_initials,
  // same pattern as logo_url) so it's scoped to the current project, not
  // every project account-wide. OFF hides every card's initials on this
  // project regardless of each card's own per-card setting (see
  // _sboardAssignedBadgeHTML's own check, which reads this first); ON
  // (the default) leaves every card free to decide for itself, same as
  // before this switch existed. Reached from Utility -> Preferences.
  async function _sboardSetHideAllInitials(hidden){
    var projectRow=_sboardCurrentProjectRow();
    if(!projectRow) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('ideas').update({hide_all_initials:hidden}).eq('id', projectRow.id);
      if(upd.error) return;
      _sboardPatchRow(projectRow.id, {hide_all_initials:hidden});
      if(typeof renderSeaBoard==='function') renderSeaBoard(true);
    }catch(e){}
  }

  // Tacit assignment, rule 1 (Aug 28 2026, see the block above
  // _sboardEnsureEffectivePrimaryRaw): a card with exactly one person on
  // its Call Sheet needs no manual star -- this makes it real the moment
  // that becomes true, rather than leaving it as a display-only guess.
  // Called after every roster change (add/remove/role-edit); a no-op
  // whenever the card has zero, 2+, or an already-starred sole person.
  async function _csAutoPrimaryIfSolo(){
    if(!_csItem) return;
    if(!_csRoles || _csRoles.length!==1 || _csRoles[0].is_primary) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('card_roles').update({is_primary:true}).eq('id', _csRoles[0].id);
      if(upd.error) return;
      await _csLoadRoles(_csItem);
      _sboardInvalidateEffPrimary();
      // Stakeholder cascade (Aug 28 2026, see _csApplyAncestorStakeholders
      // below) -- this card just landed its own explicit Primary, which is
      // exactly the "specifically assigned to another person" moment Larry
      // described, so whatever the ancestor chain would otherwise have
      // resolved for this spot now owes a Stakeholder credit here.
      await _csApplyAncestorStakeholders(_csCardType||'idea', _csItem.id, _csRoles[0].user_id);
      // Aug 28 2026 -- this can fire on its own (not just from an
      // explicit edit -- see the two "opening the roster catches up a
      // stale card" call sites below), so it needs its own redraw call
      // rather than relying on whichever caller invoked it to also do one.
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){}
  }

  // Tacit assignment, rule 2 made real (Aug 29 2026, Larry): "MEDIA
  // rightfully has my initials on the card but the CAST card says Nobody
  // yet. I should be automatically added as PRIMARY. If another person is
  // assigned, I would automatically become a STAKEHOLDER." Rule 2 as
  // originally built (see the block above _sboardEnsureEffectivePrimaryRaw)
  // was deliberately display-only -- it fed the corner badge and board
  // filter but never touched card_roles, so a truly empty card's own Cast
  // still read "Nobody yet" even though the badge already showed the
  // climbed-to person. This is the missing half: the moment a card is
  // found genuinely empty (Call Sheet opened, or a roster edit leaves it
  // at zero -- same two call-site shapes _csAutoPrimaryIfSolo already
  // uses), resolve the exact same climb the badge already trusts and write
  // it as a REAL role:'primary'+is_primary:true row, not just a display
  // guess. Written with both fields set together (unlike the older
  // solo-case above, which only ever toggled is_primary) so this row is
  // indistinguishable from a deliberate human pick -- including showing
  // the ★ Primary tag in the full Call Sheet, and properly handing off to
  // Stakeholder rather than being silently ignored the moment someone else
  // IS explicitly assigned (see _csPriorPrimaryToStakeholder, used from both
  // _csSaveRole and _csTogglePrimary below).
  async function _csAutoPrimaryIfEmpty(){
    if(!_csItem) return;
    if(_csRoles && _csRoles.length) return; // only the true-empty case
    var cardType=_csCardType||'idea';
    var sourceMap=null;
    var _sb=T().sb; if(!_sb) return;
    if(cardType==='briefing_card'){
      var bc=await _sb.from('briefing_cards').select('source_header_id').eq('id',_csItem.id).maybeSingle();
      sourceMap={}; sourceMap[_csItem.id]=(!bc.error && bc.data) ? bc.data.source_header_id : null;
    }
    await _sboardEnsureEffectivePrimaryRaw(cardType, [_csItem.id], sourceMap);
    var uid=_sboardEffectivePrimaryUidRaw(cardType, _csItem.id);
    if(!uid) return; // truly nobody anywhere above either -- stays "Nobody yet"
    try{
      var meRes=await _sb.auth.getUser();
      var me=meRes && meRes.data ? meRes.data.user : null;
      var ins=await _sb.from('card_roles').insert({card_type:cardType, card_id:_csItem.id, role:'primary', is_primary:true, user_id:uid, added_by: me?me.id:null});
      if(ins.error) return;
      await _csLoadRoles(_csItem);
      _sboardInvalidateEffPrimary();
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){}
  }

  // Flip side of the cascade below, Aug 29 2026 (Larry, same request as
  // _csAutoPrimaryIfEmpty above): displacing a card's own PRIMARY -- by
  // picking a new one from the role panel, or starring someone else in the
  // compact dropdown -- must hand off whoever held it to Stakeholder, not
  // just clear their is_primary flag and leave their role field still
  // reading "Primary" (which used to leave a stale ★ Primary tag showing
  // in the Cast list for someone who wasn't primary anymore, and quietly
  // blocked _csApplyAncestorStakeholders from ever crediting them, since
  // it only inserts a Stakeholder row for someone with NO existing row on
  // this card). Larry, Aug 29: "PRIMARY is by definition a STAKEHOLDER" --
  // not a demotion, there's a real sense in which PRIMARY reports to the
  // Stakeholders to do the role well, so this is PRIMARY handing the card
  // back to that reporting relationship, not losing standing on it. The
  // one-is_primary-per-card DB constraint guarantees at most one row can
  // match role:'primary' here.
  async function _csPriorPrimaryToStakeholder(cardType, cardId, keepRowId){
    var _sb=T().sb; if(!_sb) return;
    try{
      var prior=await _sb.from('card_roles').select('id').eq('card_type',cardType).eq('card_id',cardId).eq('role','primary').neq('id',keepRowId);
      var rows=(!prior.error && prior.data) ? prior.data : [];
      for(var i=0;i<rows.length;i++){
        await _sb.from('card_roles').update({role:'stakeholder', is_primary:false, is_key:false}).eq('id', rows[i].id);
      }
    }catch(e){}
  }

  // Stakeholder cascade (Aug 28 2026, Larry): "The PRIMARY person is
  // responsible for that card AND all child cards UNLESS specifically
  // assigned to another person. If another person is assigned, the
  // PRIMARY person from the level above is automatically a STAKEHOLDER
  // as they are responsible for the larger hierarchy." Fires the moment a
  // card lands its own explicit Primary (solo tacit-assignment above, or
  // a manual star in _csTogglePrimary) -- walks every ancestor level all
  // the way to the top of the chain, and for each level whose own
  // effective primary (reusing the same climb-if-empty resolver
  // everything else here uses) differs from this card's own primary,
  // writes a REAL card_roles row (role:'stakeholder') for that person on
  // THIS card -- not just a display computation, so it shows up on the
  // Call Sheet, can be removed by hand if Larry disagrees on a specific
  // card, and doesn't silently change again if the ancestor's own primary
  // is reassigned later. Briefing Cards have no cluster_id chain of their
  // own -- same as the empty-badge climb, starts at the card's own
  // source_header_id (the Idea Header it was spun off from) and climbs
  // the normal Idea chain from there.
  async function _csApplyAncestorStakeholders(cardType, cardId, ownPrimaryUid){
    if(!cardId || !ownPrimaryUid) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var rolesRes=await _sb.from('card_roles').select('user_id').eq('card_type',cardType).eq('card_id',cardId);
      var have={}; (rolesRes.data||[]).forEach(function(r){ have[r.user_id]=true; });
      have[ownPrimaryUid]=true;

      var startId=null;
      if(cardType==='briefing_card'){
        var bc=await _sb.from('briefing_cards').select('source_header_id').eq('id',cardId).maybeSingle();
        startId=(!bc.error && bc.data) ? bc.data.source_header_id : null;
      } else {
        var idea=await _sb.from('ideas').select('cluster_id').eq('id',cardId).maybeSingle();
        startId=(!idea.error && idea.data) ? idea.data.cluster_id : null;
      }

      var toAdd=[], curId=startId, guard=0;
      while(curId && guard<25){
        guard++;
        await _sboardEnsureEffectivePrimaryRaw('idea', [curId]);
        var levelPrimary=_sboardEffectivePrimaryUidRaw('idea', curId);
        if(levelPrimary && !have[levelPrimary] && toAdd.indexOf(levelPrimary)===-1) toAdd.push(levelPrimary);
        var next=await _sb.from('ideas').select('cluster_id').eq('id',curId).maybeSingle();
        curId=(!next.error && next.data) ? next.data.cluster_id : null;
      }
      if(!toAdd.length) return;
      for(var i=0;i<toAdd.length;i++){
        try{ await _sb.from('card_roles').insert({card_type:cardType, card_id:cardId, role:'stakeholder', user_id:toAdd[i]}); }catch(e){}
      }
      await _sboardEnsureMemberInitials(toAdd);
      if(_csItem && String(cardId)===String(_csItem.id)) await _csLoadRoles(_csItem);
    }catch(e){}
  }

  async function _csInsertRole(role, email, isBoardMember){
    if(!email || !_csItem) return {ok:false,msg:'Type a name or email.'};
    var match=(_tmAllMembersCache||[]).filter(function(m){ return String(m.email||'').toLowerCase()===String(email).toLowerCase(); })[0];
    if(!match) return {ok:false,msg:'No T2T member found with that email.'};
    var _sb=T().sb; if(!_sb) return {ok:false,msg:'Not connected.'};
    try{
      var meRes=await _sb.auth.getUser();
      var me=meRes && meRes.data ? meRes.data.user : null;
      // Board of Directors capture, Sept 2 2026 (Idea Storyboards, design
      // lock second amendment): a Stakeholder starts flagged Primary
      // Stakeholder automatically when added as a Board of Directors
      // member (opt-out from there); an ordinary Stakeholder starts
      // unflagged (opt-in later, self-only -- see setPrimaryStakeholder).
      // Routed through T2TData.addStakeholderToCast, which sets that
      // starting state atomically with the row itself, instead of the
      // bare insert every other role still uses here.
      if(role==='stakeholder'){
        var sres=await T2TData.addStakeholderToCast(_csItem.id, match.user_id, !!isBoardMember);
        if(!sres.ok) return sres;
      } else {
        var ins=await _sb.from('card_roles').insert({card_type:_csCardType||'idea', card_id:_csItem.id, role:role, user_id:match.user_id, added_by: me?me.id:null});
        if(ins.error) throw ins.error;
      }
      await _csLoadRoles(_csItem);
      _sboardInvalidateEffPrimary();
      await _csAutoPrimaryIfSolo();
      await _csAutoPrimaryIfEmpty();
      if(_csOnRosterChange) _csOnRosterChange();
      return {ok:true};
    }catch(e){ return {ok:false,msg:(e&&e.message)||'Could not add them.'}; }
  }

  // New adds default to Cast Member -- Session 255, replacing the old
  // per-role add buttons. Click the name afterward to pick a different
  // role; nothing forces Cast Member to stick.
  async function _csConfirmAdd(email){
    var errEl=document.getElementById('cs-error');
    if(!email || !_csItem) return;
    var res=await _csInsertRole('cast_member', email);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    var form=document.getElementById('cs-add-form'); if(form) form.style.display='none';
    var input=document.getElementById('cs-add-email'); if(input) input.value='';
    _csRefreshUI();
  }

  // Change a person's role in place, Session 255 -- one card_roles row
  // per person per card now, so this updates that same row's role
  // instead of inserting a second one. Clears is_key if they're moved
  // off Stakeholder, since the toggle only makes sense there.
  //
  // PRIMARY now absorbs the ★ star (see CS_ROLE_ORDER comment above), so
  // picking Primary here also sets is_primary=true on this row -- clearing
  // it off anyone else on the card first, same order _csTogglePrimary
  // already used, so the one-star-per-card constraint never trips -- and
  // moving someone OFF Primary clears their own is_primary. This keeps
  // the corner badge and the board's person-filter fallback (both still
  // keyed off is_primary) correct without touching that code.
  async function _csSaveRole(rowId, newRole){
    if(!rowId || !_csItem) return;
    var _sb=T().sb; if(!_sb) return;
    // Captured before any of the writes below -- this row's user_id
    // doesn't change here (only its role/is_primary do), and the
    // Stakeholder cascade at the bottom needs it once newRole is
    // 'primary'. Same style _csTogglePrimary already uses.
    var row=(_csRoles||[]).filter(function(r){ return String(r.id)===String(rowId); })[0];
    try{
      if(newRole==='primary'){
        // Aug 29 2026, Larry: "PRIMARY is by definition a STAKEHOLDER
        // (responsible for making whatever it is happen)" -- so whoever
        // held Primary before this pick doesn't just lose the star, they
        // fall back to being a Stakeholder on this same card, not a role
        // left dangling as "Primary" with is_primary quietly false. See
        // _csPriorPrimaryToStakeholder.
        await _csPriorPrimaryToStakeholder(_csCardType||'idea', _csItem.id, rowId);
        var clear=await _sb.from('card_roles').update({is_primary:false}).eq('card_type',_csCardType||'idea').eq('card_id',_csItem.id).neq('id', rowId);
        if(clear.error) throw clear.error;
      }
      var patch={role:newRole, is_primary:(newRole==='primary')};
      if(newRole!=='stakeholder') patch.is_key=false;
      var upd=await _sb.from('card_roles').update(patch).eq('id', rowId);
      if(upd.error) throw upd.error;
      if(newRole==='primary' && row){
        // Stakeholder cascade (Aug 28 2026, see _csApplyAncestorStakeholders)
        // -- missing here until Aug 29 2026 (Session 259 follow-up, Larry:
        // "BOOK was assigned to Rachel... I should automatically be a
        // Stakeholder on Rachel's card"). Picking Primary from this same
        // role panel is exactly as much "specifically assigned to another
        // person" as the compact-dropdown star (_csTogglePrimary) or the
        // solo-tacit case (_csAutoPrimaryIfSolo) -- both of those already
        // called this; this panel just never had. Only on the pick-Primary
        // branch, using the row's own user_id captured above.
        await _csApplyAncestorStakeholders(_csCardType||'idea', _csItem.id, row.user_id);
      }
      await _csLoadRoles(_csItem);
      _sboardInvalidateEffPrimary();
      await _csAutoPrimaryIfSolo();
      await _csAutoPrimaryIfEmpty();
      _csRefreshUI();
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not update their role.'; errEl.style.display='block'; } }
  }

  // Contact info, Session 255 -- Larry: anyone can edit anyone's phone or
  // email right from the card, not just that person editing their own.
  // Writes to members.phone/members.email (see update_member_contact),
  // so it's a real, board-wide update to that person's directory entry,
  // not a per-card copy -- the same value shows up everywhere they appear.
  async function _csSaveContact(uid, phone, email){
    if(!uid) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var res=await _sb.rpc('update_member_contact', {p_user_id:uid, p_phone:(phone===undefined?null:phone), p_email:(email===undefined?null:email)});
      if(res.error) throw res.error;
      await _tmFetchAllMembers();
    }catch(e){
      var errEl=document.getElementById('cs-error');
      if(errEl){ errEl.textContent=(e&&e.message)||'Could not save that.'; errEl.style.display='block'; }
    }
  }

  async function _csRemoveRole(rowId){
    if(!rowId || !_csItem) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var del=await _sb.from('card_roles').delete().eq('id', rowId);
      if(del.error) throw del.error;
      await _csLoadRoles(_csItem);
      _sboardInvalidateEffPrimary();
      await _csAutoPrimaryIfSolo();
      // A removal is exactly how a card can newly land at zero people --
      // Aug 29 2026, Larry: an empty card owes its own real Primary row
      // just as much right after a removal as it does on first open.
      await _csAutoPrimaryIfEmpty();
      _csRefreshUI();
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not remove them.'; errEl.style.display='block'; } }
  }

  async function _csSaveNotes(rowId, notes){
    if(!rowId) return;
    var _sb=T().sb; if(!_sb) return;
    try{ await _sb.from('card_roles').update({notes:notes}).eq('id', rowId); }catch(e){}
  }

  async function _csToggleKey(rowId){
    if(!rowId) return;
    var row=(_csRoles||[]).filter(function(r){ return String(r.id)===String(rowId); })[0];
    if(!row) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      var upd=await _sb.from('card_roles').update({is_key: !row.is_key}).eq('id', rowId);
      if(upd.error) throw upd.error;
      await _csLoadRoles(_csItem);
      _csRefreshUI();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not update them.'; errEl.style.display='block'; } }
  }

  // Primary doer star, Session 234 (Aug 21) -- replaces the old Person
  // Assigned dropdown. card_roles.is_primary has a DB constraint allowing
  // at most one true row per card (card_roles_one_primary_per_card), so
  // setting a new primary clears any other starred row on this card FIRST
  // -- setting the new one true before that clear would trip the
  // constraint. Un-starring the current primary (tap it again) just
  // leaves nobody starred; the corner badge/Team filter fall back to
  // whatever pre-twin-heads assigned_user_id the card already had, if any
  // (see _sboardEnsureCardPrimary).
  async function _csTogglePrimary(rowId){
    if(!rowId || !_csItem) return;
    var row=(_csRoles||[]).filter(function(r){ return String(r.id)===String(rowId); })[0];
    if(!row) return;
    var _sb=T().sb; if(!_sb) return;
    try{
      if(row.is_primary){
        var off=await _sb.from('card_roles').update({is_primary:false}).eq('id', rowId);
        if(off.error) throw off.error;
      } else {
        // Aug 29 2026, Larry: "PRIMARY is by definition a STAKEHOLDER" --
        // same hand-off as _csSaveRole's role-panel pick, so starring
        // someone from the compact dropdown doesn't leave the person they
        // replaced stuck showing "Primary" with is_primary already false.
        await _csPriorPrimaryToStakeholder(_csCardType||'idea', _csItem.id, rowId);
        var clear=await _sb.from('card_roles').update({is_primary:false}).eq('card_type',_csCardType||'idea').eq('card_id',_csItem.id).neq('id', rowId);
        if(clear.error) throw clear.error;
        var on=await _sb.from('card_roles').update({is_primary:true}).eq('id', rowId);
        if(on.error) throw on.error;
        // Stakeholder cascade (Aug 28 2026, see _csApplyAncestorStakeholders)
        // -- a manual star is "specifically assigned to another person"
        // exactly like the solo-tacit case, so it owes the same credit up
        // the ancestor chain. Only on the star-ON branch; un-starring
        // (row.is_primary branch above) doesn't undo any Stakeholder rows
        // it already earned -- those were real, deliberate credits, not a
        // display guess that should vanish the moment the star does.
        await _csApplyAncestorStakeholders(_csCardType||'idea', _csItem.id, row.user_id);
      }
      await _csLoadRoles(_csItem);
      _csRefreshUI();
      // The card's own tile(s) on the board carry a cached primary/badge
      // (see _sboardCardPrimaryCache) that predates this change -- drop it
      // so the next render re-fetches instead of showing a stale star.
      delete _sboardCardPrimaryCache[_sboardCpKey(_csCardType, _csItem.id)];
      // Aug 28 2026 -- a manual star/unstar can change what OTHER cards
      // ought to inherit too (tacit assignment climbs up to whichever
      // ancestor is starred), so the whole effective-primary cache needs
      // dropping here, not just this one card's. Deliberately does NOT
      // call _csAutoPrimaryIfSolo -- if Larry taps a lone assignee's own
      // star off, that's a real choice to leave the card blank, and rule
      // 1 shouldn't immediately fight it back on.
      _sboardInvalidateEffPrimary();
      if(_csOnRosterChange) _csOnRosterChange();
    }catch(e){ var errEl=document.getElementById('cs-error'); if(errEl){ errEl.textContent=(e&&e.message)||'Could not update them.'; errEl.style.display='block'; } }
  }

  // ---- 👥 People dropdown -- Session 226 (Aug 19) design, built Aug 19
  // 2026 after the four-role Stakeholder model shipped (Session 228).
  // Reached from the card back's own 👥 icon (was 📋, jumping straight to
  // the full Call Sheet -- see the sb-people-btn wiring below), this opens
  // in place exactly like the board's own VIEW/Type/Title dropdowns: a
  // small list right where you clicked, not a jump to a full screen,
  // showing everyone currently on the card across all five roles. Bottom
  // row carries Larry's three actions: (+) add someone -- pick a role
  // first (defaults to Cast Member, the most common "put someone on this"
  // case), then the same name/email picker/suggest-list every other add
  // flow on this board uses (_csRenderSuggestions, reused as-is by
  // pointing its data-role-suggest at whichever role is picked) -- ☎️ to
  // open the full three-box Call Sheet screen when more detail (notes,
  // KEY toggle) is actually needed, and (−) to reveal a ✕ next to each
  // row so someone can be removed right here, no trip to the full screen.
  // Shares _csRoles/_csItem and the card_roles helpers above with the
  // full screen -- this is a second, lighter doorway onto the same data,
  // not a parallel system, and _csRefreshUI keeps both in sync if a
  // change happens to come from the other one.
  var _sbPeopleRemoveMode = false;
  var _sbPeopleAddRole = 'cast_member';
  // Board of Directors capture, Sept 2 2026 -- only meaningful while
  // _sbPeopleAddRole==='stakeholder' (see the checkbox this backs,
  // wired in _sboardOpenPeopleDropdown below); reset false whenever the
  // add form opens or the role picker moves off Stakeholder, so a stale
  // checked state from a previous add can never silently carry over.
  var _sbPeopleAddIsBoardMember = false;
  var _sbPeopleBackFn = null;
  // Session 230 (Aug 20) bug: the menu below is part of THIS card's own
  // overlay markup (rebuilt fresh every open, see id="sb-people-menu"
  // a bit further down), but the moment it's used it gets reparented
  // onto <body> so position:fixed works -- and reparenting never gets
  // undone when the card closes. Opening a second card renders a
  // second, independent element with the same id, so the DOM ends up
  // with two #sb-people-menu nodes at once. getElementById only ever
  // returns the FIRST one in document order, which after a reparent is
  // whichever was appended to <body> earliest -- not necessarily the
  // one that belongs to the card that's open right now. That's what
  // made the dropdown look like it "never closes" (a click meant to
  // toggle the current card's menu can silently open/repopulate a
  // stale leftover from an earlier card instead) and left orphaned
  // toolbars floating on the board after the card itself was closed.
  // Tracking the live element by reference (not by re-querying the id)
  // sidesteps the ambiguity, and removing the previous one before
  // swapping to a new card's menu keeps at most one ever in the DOM.
  var _sbPeopleMenuEl = null;

  function _sbPeopleRenderList(){
    var listEl=document.getElementById('sb-people-list');
    if(!listEl) return; // dropdown not open -- no-op, safe to call from anywhere
    var rows=(_csRoles||[]).slice().sort(function(a,b){
      return CS_ROLE_ORDER.indexOf(a.role)-CS_ROLE_ORDER.indexOf(b.role);
    });
    if(!rows.length){
      listEl.innerHTML='<div class="sc-cdrop-row sb-people-row" style="cursor:default;opacity:.6">Nobody yet</div>';
      return;
    }
    listEl.innerHTML=rows.map(function(r){
      var m=_csMemberLookup(r.user_id);
      var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
      var star=r.is_parent_connection?'<span class="cs-parent-star" title="Carried over from the parent">★</span>':'';
      var key=(r.role==='stakeholder'&&r.is_key)?'<span class="cs-pr-keytag">KEY</span>':'';
      return '<div class="sc-cdrop-row sb-people-row">'
        +'<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+CS_ROLE_SYM[r.role]+' '+key+star+_esc9710(name)+'</span>'
        +'<span style="display:flex;align-items:center;flex-shrink:0">'
          // Primary doer star, Session 234 (Aug 21, replaces the old
          // Person Assigned dropdown): tap to make this person the one
          // whose initials show on the card's corner badge and who the
          // board's Team filter matches. At most one starred per card --
          // _csTogglePrimary clears any other before setting this one.
          +'<button type="button" class="sb-people-star'+(r.is_primary?' active':'')+'" data-rowid="'+_esc9710(r.id)+'" title="'+(r.is_primary?'Primary doer — tap to unstar':'Tap to make primary doer')+'">'+(r.is_primary?'★':'☆')+'</button>'
          +'<span class="sc-view-row-role">'+CS_ROLE_LABEL[r.role]+'</span>'
          +(_sbPeopleRemoveMode?'<button type="button" class="sb-people-x" data-rowid="'+_esc9710(r.id)+'" title="Remove">✕</button>':'')
        +'</span>'
      +'</div>';
    }).join('');
  }

  function _sbPeopleRenderRolePicker(){
    var wrap=document.getElementById('sb-people-rolepick'); if(!wrap) return;
    wrap.innerHTML=CS_ROLE_ORDER.map(function(role){
      return '<button type="button" class="sb-people-rolepick-btn'+(role===_sbPeopleAddRole?' active':'')+'" data-role="'+role+'" title="Add as '+CS_ROLE_LABEL[role]+'">'+CS_ROLE_SYM[role]+'</button>';
    }).join('');
  }

  async function _sbPeopleConfirmAdd(email){
    var errEl=document.getElementById('sb-people-error');
    if(!email) return;
    var res=await _csInsertRole(_sbPeopleAddRole, email, _sbPeopleAddIsBoardMember);
    if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
    if(errEl) errEl.style.display='none';
    var form=document.getElementById('sb-people-addform'); if(form) form.style.display='none';
    var input=document.getElementById('sb-people-add-email'); if(input) input.value='';
    _sbPeopleAddIsBoardMember=false;
    var boardCb=document.getElementById('sb-people-board-cb'); if(boardCb) boardCb.checked=false;
    _csRefreshUI();
  }

  // Generalized Session 234 (Aug 21) to work for any card_type, not just
  // 'idea' -- Larry wants the same 👥 button/dropdown on Briefing Cards
  // too. cardType/menuEl let a caller outside this file (briefing-board.js,
  // via the T2TStoryboard bridge) supply its own card_roles card_type and
  // its own menu element instead of always assuming the Idea Card's own
  // #sb-people-menu. The full ☎️ Call Sheet screen stays Idea-Card-only
  // for now (it leans on Idea-Card-specific chrome like closeSbDetail/
  // openCallSheet's breadcrumb) -- omitted from the dropdown entirely for
  // any other card type rather than half-wiring a button that'd break.
  async function _sboardOpenPeopleDropdown(triggerEl, item, backFn, cardType, menuEl){
    cardType = cardType || 'idea';
    var menu = menuEl || document.getElementById('sb-people-menu');
    // If the card that's open now rendered a DIFFERENT people-menu than
    // the one we last touched, the old one is a dead leftover -- still
    // sitting in <body>, possibly still visible -- so remove it before
    // it can confuse getElementById/reuse on some later click.
    if(_sbPeopleMenuEl && _sbPeopleMenuEl!==menu && _sbPeopleMenuEl.parentNode){
      _sbPeopleMenuEl.parentNode.removeChild(_sbPeopleMenuEl);
    }
    _sbPeopleMenuEl=menu;
    if(!triggerEl || !menu || !item) return;
    var willOpen=menu.hidden;
    _sboardCloseAllDropdowns(willOpen?menu.id:null);
    if(!willOpen){ menu.hidden=true; return; }

    // _csItem/_csCardType drive every card_roles read/write below
    // (_csLoadRoles, _csInsertRole, _csRemoveRole, _csToggleKey,
    // _csTogglePrimary) -- setting them here (not just inside
    // openCallSheet) fixes a real bug: add/remove/star from this compact
    // dropdown silently did nothing if the full Call Sheet screen had
    // never been opened first this session, since _csItem stayed null.
    _csItem=item;
    _csCardType=cardType;
    // Aug 28 2026 -- this compact dropdown is only ever opened from the
    // Idea Board's own tiles (Briefing Board uses the full Call Sheet
    // screen exclusively, see openCallSheet's own comment), so it always
    // has renderSeaBoard in scope to redraw the badge with once closed.
    _csOnRosterChange=function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); };
    _sbPeopleBackFn=backFn||function(){ openSbDetail(item); };
    _sbPeopleRemoveMode=false;
    _sbPeopleAddRole='cast_member';
    _sbPeopleAddIsBoardMember=false;

    var isIdea=(cardType==='idea');
    menu.innerHTML='<div id="sb-people-list"></div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(10px * var(--fg-text-scale,1));color:#5b5b56;padding:4px 2px;border-top:1px solid #e4ded0">'
        +'<span>Initials on front</span>'
        +'<div class="sb-gear-tabs" id="sb-people-hide-badge-toggle" style="margin-bottom:0;width:auto;min-width:88px">'
          +'<button type="button" class="sb-gear-tab'+(item.hide_primary_badge?'':' active')+'" data-hide="0" style="padding:3px 8px">ON</button>'
          +'<button type="button" class="sb-gear-tab'+(item.hide_primary_badge?' active':'')+'" data-hide="1" style="padding:3px 8px">OFF</button>'
        +'</div>'
      +'</div>'
      +'<div class="sc-cdrop-addrow">'
        +'<button type="button" class="sc-dotted-add-btn" id="sb-people-add-btn" title="Add someone">+</button>'
        +(isIdea?'<button type="button" class="sc-dotted-add-btn sb-people-call" id="sb-people-call-btn" title="Open the full Call Sheet">☎️</button>':'')
        +'<button type="button" class="sc-dotted-add-btn sc-dotted-remove-btn" id="sb-people-remove-btn" title="Remove someone">−</button>'
      +'</div>'
      +'<div class="sc-view-addform" id="sb-people-addform" style="display:none">'
        +'<div class="sb-people-rolepick" id="sb-people-rolepick"></div>'
        // Board of Directors, Sept 2 2026 -- only shown while adding as
        // Stakeholder (see the rolePick handler below, which toggles
        // this and _sbPeopleAddIsBoardMember together). Board members
        // default to the Primary Stakeholder rank automatically (opt-
        // out from there); this checkbox is that one starting decision,
        // captured at add time, not a permanent designation anyone but
        // the Stakeholder themselves can change afterward.
        +'<div id="sb-people-board-toggle" style="display:none;margin:2px 0 6px">'
          +'<label style="font-size:calc(10px * var(--fg-text-scale,1));color:#5b5b56;display:flex;align-items:center;gap:6px;cursor:pointer">'
            +'<input type="checkbox" id="sb-people-board-cb"> Board of Directors'
          +'</label>'
        +'</div>'
        +'<div class="tm-add-wrap">'
          +'<input type="text" id="sb-people-add-email" placeholder="Type a name or email..." autocomplete="off">'
          +'<div class="tm-add-suggest cs-add-suggest" data-role-suggest="cast_member" id="sb-people-add-suggest" style="display:none"></div>'
        +'</div>'
        +'<button type="button" class="sc-ov-btn save sc-view-add-confirm" id="sb-people-add-confirm">Add</button>'
        +'<div id="sb-people-error" class="sc-view-add-error" style="display:none"></div>'
      +'</div>';

    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    menu.onclick=function(e){
      e.stopPropagation();
      var star=e.target.closest('.sb-people-star');
      if(star){ _csTogglePrimary(star.getAttribute('data-rowid')); return; }
      var x=e.target.closest('.sb-people-x');
      if(x){ _csRemoveRole(x.getAttribute('data-rowid')); }
    };

    var r=triggerEl.getBoundingClientRect();
    menu.style.left=r.left+'px';
    menu.style.top=(r.bottom+4)+'px';
    menu.style.minWidth=Math.max(210,r.width)+'px';
    menu.hidden=false;
    var mr=menu.getBoundingClientRect();
    if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';

    await _tmFetchAllMembers();
    await _csLoadRoles(item);
    // Aug 28 2026 -- catches a card that's sat at exactly one assignee
    // since before this rule existed (or since the last edit): opening
    // the dropdown is enough to make the star real, not just an edit.
    await _csAutoPrimaryIfSolo();
    // Aug 29 2026, Larry -- same backfill for a card that's sat completely
    // empty: opening the dropdown resolves the climb and writes it as a
    // real Primary row, so the Cast stops saying "Nobody yet" the moment
    // anyone looks, not just after the next edit.
    await _csAutoPrimaryIfEmpty();
    _sbPeopleRenderList();
    _sbPeopleRenderRolePicker();

    var addBtn=document.getElementById('sb-people-add-btn');
    var addForm=document.getElementById('sb-people-addform');
    var emailInput=document.getElementById('sb-people-add-email');
    var suggBox=document.getElementById('sb-people-add-suggest');
    var rolePick=document.getElementById('sb-people-rolepick');
    var boardToggle=document.getElementById('sb-people-board-toggle');
    var boardCb=document.getElementById('sb-people-board-cb');
    var confirmBtn=document.getElementById('sb-people-add-confirm');
    var callBtn=document.getElementById('sb-people-call-btn');
    var removeBtn=document.getElementById('sb-people-remove-btn');
    // Aug 29 2026, Larry: "that should be a toggle: ON or OFF" -- replaced
    // the old "Hide initials on front" checkbox with an explicit ON/OFF
    // pair (ON = initials show, matching hide_primary_badge=false) so the
    // state reads directly rather than through a double negative.
    var hideBadgeToggle=document.getElementById('sb-people-hide-badge-toggle');
    if(hideBadgeToggle) hideBadgeToggle.addEventListener('click', function(e){
      var btn=e.target.closest('.sb-gear-tab'); if(!btn) return;
      var hide=(btn.getAttribute('data-hide')==='1');
      hideBadgeToggle.querySelectorAll('.sb-gear-tab').forEach(function(b){ b.classList.toggle('active', b===btn); });
      _csSetHideBadge(hide);
    });

    if(addBtn) addBtn.addEventListener('click', function(){
      _sbPeopleRemoveMode=false; _sbPeopleRenderList();
      var opening=addForm.style.display==='none';
      addForm.style.display=opening?'block':'none';
      if(opening){ _csRenderSuggestions(''); }
    });
    if(rolePick) rolePick.addEventListener('click', function(e){
      var btn=e.target.closest('.sb-people-rolepick-btn'); if(!btn) return;
      _sbPeopleAddRole=btn.getAttribute('data-role');
      _sbPeopleRenderRolePicker();
      if(suggBox) suggBox.setAttribute('data-role-suggest', _sbPeopleAddRole);
      _csRenderSuggestions(emailInput?emailInput.value:'');
      // Board of Directors checkbox only makes sense while adding as
      // Stakeholder -- hide (and clear) it the moment the picker moves
      // to any other role, so a stale checked state can't silently
      // carry into a Primary/Cast Member add.
      var isStake=(_sbPeopleAddRole==='stakeholder');
      if(boardToggle) boardToggle.style.display=isStake?'block':'none';
      if(!isStake){ _sbPeopleAddIsBoardMember=false; if(boardCb) boardCb.checked=false; }
    });
    if(boardCb) boardCb.addEventListener('change', function(){ _sbPeopleAddIsBoardMember=!!boardCb.checked; });
    if(emailInput){
      emailInput.addEventListener('input', function(){ _csRenderSuggestions(emailInput.value); });
      emailInput.addEventListener('focus', function(){ _csRenderSuggestions(emailInput.value); });
      emailInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); _sbPeopleConfirmAdd(emailInput.value.trim()); } });
    }
    if(suggBox) suggBox.addEventListener('click', function(e){
      var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
      _sbPeopleConfirmAdd(row.getAttribute('data-email'));
    });
    if(confirmBtn) confirmBtn.addEventListener('click', function(){ _sbPeopleConfirmAdd(emailInput?emailInput.value.trim():''); });
    if(callBtn) callBtn.addEventListener('click', function(){
      menu.hidden=true;
      closeSbDetail();
      openCallSheet(item, _sbPeopleBackFn);
    });
    if(removeBtn) removeBtn.addEventListener('click', function(){
      if(addForm) addForm.style.display='none';
      _sbPeopleRemoveMode=!_sbPeopleRemoveMode;
      _sbPeopleRenderList();
    });
  }

  // Call Sheet print, Session 228 (Aug 19) -- a proper single-page
  // portrait document, not a screenshot of the editable overlay (that's
  // the tm-print-tile/sb-team-print pattern Team Roster uses, forced
  // landscape). Builds a hidden #cs-print-doc from the same _csRoles
  // data, revealed only for the print job via a body.cs-printing class
  // scoped @media print rule -- kept fully separate from the existing
  // sb-team-print print rule (own @page override, injected and removed
  // around the print call) so neither print flow can bleed into the
  // other's page orientation.
  // Session 255: regrouped for print to match the new three-basic-roles
  // shape (Stakeholder / Primary / Cast Member, with Facilitator and
  // Facilitator-qualified as the two Cast Member variants worth calling
  // out) -- the on-screen list is flat now, but a printed call sheet
  // still reads better grouped.
  // Guest group added Sept 12 2026, alongside the new CS_ROLE_ORDER entry
  // -- without its own group here a Guest would silently vanish from the
  // printed Call Sheet even though they still show on-screen.
  var CS_PRINT_GROUPS = [
    {title:'Stakeholders', sub:'Invested, not doing — who controls or is affected by this. KEY = can directly interfere with progress. EXPECTATIONS/BOUNDARIES shown in place of Notes.', roles:['stakeholder']},
    {title:'Primary', sub:'The person responsible for making it happen', roles:['primary']},
    {title:'Cast Member', sub:'Facilitator-qualified = backup', roles:['cast_member','facilitator','facilitator_qualified']},
    {title:'Guest', sub:'Along for visibility only — no responsibility on this card', roles:['guest']}
  ];

  function _csFmtToday(){
    try{ return new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
    catch(e){ return ''; }
  }

  function _csPrintRoleRows(role){
    var rows=_csRowsForRole(role);
    if(!rows.length){
      return '<tr class="cs-pr-row"><td class="cs-pr-role">'+_esc9710(CS_ROLE_LABEL[role])+'</td><td class="cs-pr-name"><div class="cs-pr-empty">Nobody yet</div></td></tr>';
    }
    return rows.map(function(r,i){
      var m=_csMemberLookup(r.user_id);
      var name=m?(m.name||m.email||'(unknown)'):'(unknown)';
      var email=m?(m.email||''):'';
      var star=r.is_parent_connection?'<span class="cs-pr-star">★</span>':'';
      var keytag=r.is_key?'<span class="cs-pr-keytag">KEY</span>':'';
      var notesPrefix=role==='stakeholder'?'Expectations/boundaries: ':'Notes: ';
      return '<tr class="cs-pr-row">'
        +'<td class="cs-pr-role">'+(i===0?_esc9710(CS_ROLE_LABEL[role]):'')+'</td>'
        +'<td class="cs-pr-name">'
          +'<div class="cs-pr-nameline">'+keytag+star+_esc9710(name)+'</div>'
          +(email?('<div class="cs-pr-email">'+_esc9710(email)+'</div>'):'')
          +(r.notes?('<div class="cs-pr-notes">'+notesPrefix+_esc9710(r.notes)+'</div>'):'')
        +'</td>'
      +'</tr>';
    }).join('');
  }

  function _csPrintGroupHTML(g){
    return '<div class="cs-pr-group">'
      +'<div class="cs-pr-group-title">'+g.title+'</div>'
      +'<div class="cs-pr-group-sub">'+g.sub+'</div>'
      +'<table>'+g.roles.map(_csPrintRoleRows).join('')+'</table>'
    +'</div>';
  }

  async function _csBuildPrintDoc(){
    // See _csCrumbText's own comment (Aug 30 2026 fix) for why this can't
    // just be item.id/item.text_content for a Briefing Card.
    var crumbText=await _csCrumbText(_csItem, _csCardType);
    var doc=document.getElementById('cs-print-doc');
    if(!doc){ doc=document.createElement('div'); doc.id='cs-print-doc'; doc.className='cs-print-doc'; document.body.appendChild(doc); }
    var today=_csFmtToday();
    doc.innerHTML='<div class="cs-pr-masthead">'
        +'<div class="cs-pr-mast-left"><h1>📋 Call Sheet</h1><div class="cs-pr-sub">T2T Field Guide</div></div>'
        +'<div class="cs-pr-mast-right"><div class="cs-pr-date">'+today+'</div><div>Printed from the Idea Storyboard</div></div>'
      +'</div>'
      +'<div class="cs-pr-crumb">'+_esc9710(crumbText)+'</div>'
      +CS_PRINT_GROUPS.map(_csPrintGroupHTML).join('')
      +'<div class="cs-pr-footer"><span>T2T Field Guide — Call Sheet</span><span>Generated '+today+'</span></div>';
  }

  function _csPrint(){
    _csBuildPrintDoc().then(function(){
      var styleId='cs-print-page-style';
      var old=document.getElementById(styleId); if(old) old.remove();
      var st=document.createElement('style'); st.id=styleId;
      st.textContent='@page{size:portrait;margin:0.6in}';
      document.head.appendChild(st);
      document.body.classList.add('cs-printing');
      var cleaned=false;
      function cleanup(){
        if(cleaned) return; cleaned=true;
        document.body.classList.remove('cs-printing');
        var s=document.getElementById(styleId); if(s) s.remove();
        window.removeEventListener('afterprint', cleanup);
      }
      window.addEventListener('afterprint', cleanup);
      window.print();
    });
  }

  // Session 255: the Cast popup, reachable directly from every card's
  // bottom-row 👥 icon (Idea, Plan, Briefing Board alike) instead of a
  // small dropdown with a ☎️ button one step further in. Manages its own
  // overlay div appended to <body> -- unlike the old Idea-only version,
  // this no longer assumes #sb-detail-overlay exists, since briefing-
  // board.js calls it through the T2TStoryboard bridge on a page that
  // has no such element. onFilterChange is specifically for the popup's
  // own person-filter checkboxes (called as (uid, checked)); onRosterChange
  // (Aug 28 2026) is the separate, no-args "please redraw the board now"
  // callback for when who's-on-the-card itself changes (add/remove/role/
  // star) -- see _csOnRosterChange's own comment above. Idea/Plan and
  // Briefing Board each have their own render pipeline, so both are
  // plain callbacks rather than a hardcoded function name.
  function closeCallSheet(){
    var ov=document.getElementById('cs-callsheet-overlay');
    if(ov){ ov.style.display='none'; ov.classList.remove('active'); }
  }

  // Breadcrumb text for both the Cast popup and its printed Call Sheet --
  // pulled out to one place so the two stay in sync. Aug 30 2026 fix
  // (Larry, on a card with a full paragraph of real typed text): this used
  // to always call ancestorChain(item.id) and fall back to
  // item.text_content. Both assumptions are Idea-card-only -- a Briefing
  // Card's id is a briefing_cards.id, not an ideas.id, so ancestorChain
  // (which queries the ideas table) always came back empty for one; and a
  // Briefing Card object has no text_content field at all (that's an
  // Idea-row-only column -- a Briefing Card's own text lives in
  // item.task). Together that meant every single Briefing Card showed
  // "(untitled)" here regardless of what was actually typed on it.
  // item.topicLabel (already denormalized onto the row by the Aug 11
  // header-linked-task-card sync) stands in for the ancestor chain when
  // there is one.
  async function _csCrumbText(item, cardType){
    if(!item) return '';
    if(cardType==='briefing_card'){
      var parts=[];
      if(item.topicLabel) parts.push(item.topicLabel);
      parts.push(item.task||'(untitled)');
      return parts.join(' / ');
    }
    try{
      var chain=(window.T2TData && window.T2TData.ancestorChain) ? await window.T2TData.ancestorChain(item.id) : [];
      var text=(chain||[]).map(function(c){ return c.text||'(untitled)'; }).join(' / ');
      return text||(item.text_content||'(untitled)');
    }catch(e){ return item.text_content||''; }
  }

  async function openCallSheet(item, backFn, cardType, onFilterChange, currentFilterIds, onRosterChange){
    _csItem=item;
    _csCardType=cardType||'idea';
    _csActiveFilterIds=currentFilterIds||_sboardPersonFilterIds||[];
    // Idea/Plan cards (cardType 'idea', the default) always have
    // renderSeaBoard in scope here to fall back on; Briefing Board must
    // supply its own renderBoard explicitly since this file has no idea
    // what that page's render function is called.
    _csOnRosterChange = onRosterChange || ((_csCardType==='idea') ? function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); } : null);
    if(!document.getElementById('cs-callsheet-overlay')){
      var ovEl=document.createElement('div');
      ovEl.id='cs-callsheet-overlay';
      ovEl.style.cssText='display:none;position:fixed;inset:0;z-index:9999;background:rgba(20,20,18,0.45);align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
      // Styled fully inline (not the .sc-overlay-card class), Session
      // 255 -- that class only exists on pages that load this file's own
      // stylesheet; this popup needs to look right on Briefing Board
      // pages too, reached only through the T2TStoryboard bridge.
      ovEl.innerHTML='<div id="cs-callsheet-card" style="text-align:center;background:#F5F1E8;border-radius:14px;padding:16px;box-shadow:0 10px 24px rgba(0,0,0,0.3);max-height:88vh;overflow-y:auto;width:min(400px,100%);position:relative;box-sizing:border-box"></div>';
      document.body.appendChild(ovEl);
      ovEl.addEventListener('click', function(e){ if(e.target===ovEl) closeCallSheet(); });
    }
    var ov=document.getElementById('cs-callsheet-overlay');
    var cardEl=document.getElementById('cs-callsheet-card');
    if(!ov || !cardEl || !item) return;
    // Aug 28 2026 -- read whichever spelling this card type actually
    // carries (see _csSetHideBadge's own comment for why there are two).
    var _csHideBadgeNow = (_csCardType==='briefing_card') ? !!item.hidePrimaryBadge : !!item.hide_primary_badge;
    cardEl.innerHTML='<div id="cs-body">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<span style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:500;letter-spacing:0.08em;color:#2C2C2A">🎭 CAST</span>'
        +'<div style="display:flex;align-items:center;gap:6px">'
          +'<div class="tm-print-tile" id="cs-print-tile" title="Print Call Sheet">&#128438;</div>'
          +'<button id="cs-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#2C2C2A">✕</button>'
        +'</div>'
      +'</div>'
      +'<div class="cs-crumb" id="cs-crumb">Loading…</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(11px * var(--fg-text-scale,1));color:#5b5b56;margin:2px 0 8px">'
        +'<span>Initials on front</span>'
        +'<div class="sb-gear-tabs" id="cs-hide-badge-toggle" style="margin-bottom:0;width:auto;min-width:88px">'
          +'<button type="button" class="sb-gear-tab'+(_csHideBadgeNow?'':' active')+'" data-hide="0" style="padding:3px 8px">ON</button>'
          +'<button type="button" class="sb-gear-tab'+(_csHideBadgeNow?' active':'')+'" data-hide="1" style="padding:3px 8px">OFF</button>'
        +'</div>'
      +'</div>'
      +'<div id="cs-rows-all"></div>'
      + _csRenderAddRow()
      +'<div id="cs-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin:4px 0;display:none"></div>'
    +'</div>';
    ov.style.display='flex';
    ov.classList.add('active');
    var body=document.getElementById('cs-body');
    // Aug 29 2026, Larry: "that should be a toggle: ON or OFF" -- same
    // ON/OFF pair as the compact People dropdown, replacing the old
    // "Hide initials on front" checkbox here too.
    var hideBadgeToggle=document.getElementById('cs-hide-badge-toggle');
    if(hideBadgeToggle) hideBadgeToggle.addEventListener('click', function(e){
      var btn=e.target.closest('.sb-gear-tab'); if(!btn) return;
      var hide=(btn.getAttribute('data-hide')==='1');
      hideBadgeToggle.querySelectorAll('.sb-gear-tab').forEach(function(b){ b.classList.toggle('active', b===btn); });
      _csSetHideBadge(hide);
    });
    function goBack(){ closeCallSheet(); (backFn||function(){})(); }
    T().wire('cs-close', goBack);
    T().wire('cs-print-tile', _csPrint);

    // Breadcrumb -- same ancestor walk header-data.js already uses to
    // resume a session at depth (ancestorChain), reused here purely for
    // display: Organization/Project/.../this card's own name. See
    // _csCrumbText above for the Aug 30 2026 Briefing Card fix.
    (function(){
      var crumbEl=document.getElementById('cs-crumb');
      if(!crumbEl) return;
      (async function(){
        crumbEl.textContent=await _csCrumbText(item, cardType);
      })();
    })();

    await _tmFetchAllMembers();
    await _csLoadRoles(item);
    // Aug 28 2026 -- catches a card that's sat at exactly one assignee
    // since before this rule existed (or since the last edit): opening
    // the full Call Sheet is enough to make the star real, not just an
    // edit made from inside it.
    await _csAutoPrimaryIfSolo();
    // Aug 29 2026, Larry: "MEDIA rightfully has my initials on the card
    // but the CAST card says Nobody yet. I should be automatically added
    // as PRIMARY." Same backfill, for the fully-empty case -- opening the
    // full Call Sheet is what Larry actually hit this on, so this is the
    // call site that matters most.
    await _csAutoPrimaryIfEmpty();
    _csRenderFlatRoster();

    if(body){
      var addTile=document.getElementById('cs-add-tile');
      if(addTile) addTile.addEventListener('click', function(){
        var form=document.getElementById('cs-add-form'); if(!form) return;
        var opening=form.style.display==='none';
        form.style.display=opening?'block':'none';
        if(opening) _csRenderSuggestions('');
      });
      var addInput=document.getElementById('cs-add-email');
      if(addInput){
        addInput.addEventListener('input', function(){ _csRenderSuggestions(addInput.value); });
        addInput.addEventListener('focus', function(){ _csRenderSuggestions(addInput.value); });
        addInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); _csConfirmAdd(addInput.value.trim()); } });
      }
      var addSuggest=document.getElementById('cs-add-suggest');
      if(addSuggest) addSuggest.addEventListener('click', function(e){
        var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
        _csConfirmAdd(row.getAttribute('data-email'));
      });

      body.addEventListener('click', function(e){
        var nm=e.target.closest('.cs-name-click');
        if(nm){
          var panel=document.getElementById('cs-rp-'+nm.getAttribute('data-rowid'));
          if(panel) panel.style.display=(panel.style.display==='none')?'block':'none';
          return;
        }
        var pencil=e.target.closest('.cs-notes-pencil');
        if(pencil){
          var nrow=document.getElementById('cs-nr-'+pencil.getAttribute('data-rowid'));
          if(nrow) nrow.style.display=(nrow.style.display==='none')?'flex':'none';
          return;
        }
        var x=e.target.closest('.cs-remove-x'); if(x){ _csRemoveRole(x.getAttribute('data-rowid')); return; }
      });

      body.addEventListener('change', function(e){
        var t=e.target;
        if(t.classList.contains('cs-notes-input')){ _csSaveNotes(t.getAttribute('data-rowid'), t.value); return; }
        if(t.classList.contains('cs-r-role')){ _csSaveRole(t.getAttribute('data-rowid'), t.value); return; }
        if(t.classList.contains('cs-key-chk')){ _csToggleKey(t.getAttribute('data-rowid')); return; }
        if(t.classList.contains('cs-filter-chk')){
          var uid=String(t.getAttribute('data-uid'));
          if(onFilterChange){
            // Briefing Board (or any other caller) owns its own filter
            // array and render pipeline -- just hand back which person
            // was toggled and to what state, and let it do the rest.
            onFilterChange(uid, t.checked);
          } else {
            _sboardPersonFilterIds=_sboardPersonFilterIds||[];
            var idx=_sboardPersonFilterIds.indexOf(uid);
            if(t.checked && idx<0) _sboardPersonFilterIds.push(uid);
            if(!t.checked && idx>=0) _sboardPersonFilterIds.splice(idx,1);
            _sboardRecomputeFilterMatches().then(function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); });
          }
          return;
        }
        if(t.classList.contains('cs-contact-email') || t.classList.contains('cs-contact-phone')){
          var uid2=t.getAttribute('data-uid');
          var emailEl=document.querySelector('.cs-contact-email[data-uid="'+uid2+'"]');
          var phoneEl=document.querySelector('.cs-contact-phone[data-uid="'+uid2+'"]');
          _csSaveContact(uid2, phoneEl?phoneEl.value:undefined, emailEl?emailEl.value:undefined);
          return;
        }
      });
    }
  }

