/* ============================================================
   cast-pick-list.js -- T2T Field Guide -- the one shared CAST PICK list

   The single-head 👤 button's list, used by the New Card popup (both
   boards), the back-of-card PRIMARY, and checklist-step assignees.

   Moved out of briefing-board-master-nav.js Sept 23 2026, when the list
   became project-level (Larry: "Cast options are project level") --
   that file was brushing the 2,500-line watch mark, and this list is
   shared by both boards rather than being Master-nav screen code.

   Same shared page scope as the Briefing Board files (no wrapper): it
   uses T(), _esc, _bbSyncMenuTheme, _bbFetchAllMembers,
   _bbCurrentUserId and _castAddPerson by their plain names, and every
   caller reaches _bbOpenCastPickMenu the same way. Load it anywhere
   after supabase-js.js; nothing here runs at load time.

   Data: public.cast_for_level(p_level) in Supabase -- see the notes on
   _bbCastPickRows below.
   ============================================================ */

  // CAST PICK list -- Sept 22 2026, Larry, Master BB (DOING): "Cast
  // selector on new card must look exactly like cast view dropdown on
  // BB. Concept is to include everyone who is currently on some card...
  // and have option to add name." One shared picker, used by BOTH the
  // New Card popup (idea-capture.js, BB mode) and the back-of-card
  // PRIMARY head icon (_bbRenderCardPrimaryField, briefing-board-
  // master.js) -- those two were already told to match each other
  // earlier today, so building one picker keeps them from drifting
  // apart again.
  //
  // Looks exactly like VIEW (_bbWireViewDropdown above): same dark
  // bb-cdrop-menu skin, same checkbox-plus-name rows
  // (bb-view-person-row). Single-select, though -- checking a name picks
  // that person and closes the list.
  //
  // Who's listed: the board roster PLUS everyone who currently holds a
  // role on ANY card this traveler can see (every card_roles row RLS
  // lets them read, Idea or Briefing, any level) -- wider than VIEW's
  // own list, which is deliberately scoped to cards visible at this
  // level because VIEW filters the board. A picker for a brand-new card
  // needs the whole cast, not just whoever happens to be on this level.
  //
  // The dashed (+) at the bottom opens an inline search of every T2T
  // member (list_members_for_picker, same source the Cast/Team screens'
  // own (+) uses). Picking a result picks that person. A typed name that
  // isn't a member yet can't be saved as PRIMARY today -- card_roles
  // only accepts real logins until CAST Phase 2 (Master BB, do-l) moves
  // it onto a cast list that can hold anyone -- so the form says so
  // plainly instead of silently dropping the name.
  // PROJECT-LEVEL CAST, Sept 23 2026 -- Larry: "Cast options are project
  // level." "There is a potential for hundreds of people... The names
  // will change at every level though there should be a thread that
  // connects them: a person from the above team must be PRIMARY on a
  // sub-project plus stakeholders will be common threads." And: "Disney
  // uses first names... Make the list first names only in alphabetical
  // order." Replaces the Sept 22 "everyone on any card, anywhere" list.
  //
  // Who's listed at a level (one database call, cast_for_level):
  //   here        -- anyone holding a role on a card AT this level
  //   above       -- the team one level up (the thread: whoever becomes a
  //                  sub-project's PRIMARY usually comes from here -- a
  //                  training habit, not an enforced rule, per Larry)
  //   stakeholder -- Stakeholders from any higher level, passed down
  //                  unless that card's PRIMARY switched them off
  //                  (card_roles.pass_down, "PRIMARY's choice")
  // Plus the traveler themself, so "assign it to me" is always one tap.
  // level: a header id (PROJECT / TOPIC / sub-project); null = MASTER.
  async function _bbCastPickRows(level){
    var sb=T().sb; if(!sb) return [];
    var pool=await _bbFetchAllMembers();
    function lookup(uid){ return (pool||[]).filter(function(p){ return String(p.user_id)===String(uid); })[0]; }
    var bySrc={};
    try{
      var res=await sb.rpc('cast_for_level', {p_level: level||null});
      (res.data||[]).forEach(function(r){ if(r.user_id) bySrc[String(r.user_id)]=r.source; });
    }catch(e){ console.warn('Cast list: could not load this level', e); }
    try{
      var me=(typeof _bbCurrentUserId==='function') ? await _bbCurrentUserId() : null;
      if(me && !bySrc[String(me)]) bySrc[String(me)]='here';
    }catch(e){}
    var rows=Object.keys(bySrc).map(function(uid){
      var m=lookup(uid);
      return {user_id:uid, name:m?(m.name||m.email):null, email:m?(m.email||''):'', source:bySrc[uid]};
    }).filter(function(r){ return r.name; });
    _bbCastFirstNames(rows);
    rows.sort(function(a,b){
      var c=a.shortName.localeCompare(b.shortName, undefined, {sensitivity:'base'});
      return c || String(a.name).localeCompare(String(b.name));
    });
    return rows;
  }
  // First names only (Disney style). Two people sharing a first name get
  // their last initial so they can still be told apart ("Bill F." /
  // "Bill K."). An email-only person shows the part before the @.
  function _bbCastFirstNames(rows){
    function parts(r){
      var n=String(r.name||'').trim();
      if(n.indexOf('@')>0 && n.indexOf(' ')<0) n=n.split('@')[0];
      return n.split(/\s+/);
    }
    var count={};
    rows.forEach(function(r){ var f=parts(r)[0].toLowerCase(); count[f]=(count[f]||0)+1; });
    rows.forEach(function(r){
      var ps=parts(r), first=ps[0];
      first=first.charAt(0).toUpperCase()+first.slice(1);
      r.shortName = (count[ps[0].toLowerCase()]>1 && ps.length>1) ? (first+' '+ps[ps.length-1].charAt(0).toUpperCase()+'.') : first;
    });
    return rows;
  }
  // menu: the element to fill (caller owns creating/removing it).
  // anchorEl: the 👤 button it hangs under.
  // opts.selectedUid: whoever is currently picked (checked row).
  // opts.level: the project level this pick is for (header id -- the
  //   card's PROJECT/TOPIC/sub-project); null/undefined = MASTER.
  // opts.onPick(person): person = {user_id, name, fromAbove}. fromAbove
  //   is true when they came from the level above (or were passed down
  //   as a Stakeholder) -- the caller marks the new PRIMARY with the gold
  //   ★ "carried over from the parent" so the thread between levels shows.
  // opts.onClear(): optional -- unchecking the picked row clears the
  //   pick. Without it, the picked row just stays checked (the back of
  //   an existing card can change PRIMARY here, not remove it).
  // CAPACITY, Sept 23 2026 -- Larry: "There is a potential for biting off
  // more than one can chew" ... "I like the 5 amber. Some people and AI
  // can handle more but it is good to think about capacity. This number
  // ... should be across all usages." The number beside a person is how
  // many projects they're PRIMARY on (public.primary_load); at 5 or more
  // it turns amber, with the ⚠ (Sept 23 2026 -- Larry: "I really like the
  // triangle with the ! in it" -- ⚠ means "this needs a decision").
  // Shared by this list and the Cast Roster.
  window.T2TLoad = window.T2TLoad || (function(){
    var LIMIT=5, cache=null, at=0, inflight=null;
    function fetchAll(force){
      if(!force && cache && (Date.now()-at)<60000) return Promise.resolve(cache);
      if(inflight) return inflight;
      var sb=window.T2T && window.T2T.sb;
      if(!sb) return Promise.resolve(cache||{});
      inflight=Promise.resolve(sb.rpc('primary_load')).then(function(res){
        var m={}; ((res&&res.data)||[]).forEach(function(r){ m[String(r.user_id)]=r.n; });
        cache=m; at=Date.now(); inflight=null; return m;
      }, function(){ inflight=null; return cache||{}; });
      return inflight;
    }
    function badgeHTML(n){
      n=n||0; if(!n) return '';
      var over=n>=LIMIT;
      return '<span class="t2t-load" title="PRIMARY on '+n+' topic'+(n===1?'':'s')+(over?' — at capacity (5+)':'')+'" style="display:inline-block;min-width:14px;padding:0 4px;border-radius:7px;font-size:9px;line-height:14px;font-weight:700;text-align:center;vertical-align:middle;'
        +(over?'background:#e8a33a;color:#3b2200':'background:rgba(0,0,0,.08);color:#5b5b56')+'">'+(over?'⚠ ':'')+n+'</span>';
    }
    return {limit:LIMIT, fetch:fetchAll, badgeHTML:badgeHTML, invalidate:function(){ cache=null; }};
  })();

  async function _bbOpenCastPickMenu(menu, anchorEl, opts){
    opts=opts||{};
    // The Idea Board can open this before the Briefing Board screen has
    // ever been built -- make sure the list's shared look is on the page.
    if(typeof injectBriefingBoardStyles==='function') injectBriefingBoardStyles();
    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    menu.classList.add('bb-cdrop-menu');
    _bbSyncMenuTheme(menu);
    // Clicks inside the list (checkboxes, the add form's input) must not
    // reach the page-level "click anywhere closes every dropdown" listener.
    menu.onclick=function(e){ e.stopPropagation(); };
    function position(){
      var r=anchorEl.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(160,r.width)+'px';
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      if(mr.bottom>window.innerHeight-8) menu.style.top=Math.max(8,r.top-4-mr.height)+'px';
    }
    function close(){ menu.hidden=true; if(opts.onClose) opts.onClose(); }
    menu.innerHTML='<div class="bb-cdrop-row" style="cursor:default;opacity:.6">Loading…</div>';
    menu.hidden=false;
    position();
    var rows=await _bbCastPickRows(opts.level||null);
    if(menu.hidden) return; // closed while loading
    var selected=opts.selectedUid ? String(opts.selectedUid) : null;
    // Whoever's already picked always shows (checked), even if they
    // don't otherwise belong to this level.
    if(selected && !rows.some(function(r){ return String(r.user_id)===selected; })){
      var pool0=await _bbFetchAllMembers();
      var pm=(pool0||[]).filter(function(p){ return String(p.user_id)===selected; })[0];
      if(pm){
        rows.push({user_id:selected, name:pm.name||pm.email, email:pm.email||'', source:'here'});
        _bbCastFirstNames(rows);
        rows.sort(function(a,b){ return a.shortName.localeCompare(b.shortName, undefined, {sensitivity:'base'}) || String(a.name).localeCompare(String(b.name)); });
      }
    }
    // Everything the list LOOKS like and does inside (TEAM header and eye, name rows,
    // type-to-find, the (+) add form) is the one shared T2TTeam (team-button.js), the
    // same list the boards' TEAM button draws (Larry, Oct 6 2026: "build it right").
    // This function keeps only what is the pick's own: who is listed at this level,
    // first-name labels, and where the list sits on the screen.
    if(!window.T2TTeam){ menu.innerHTML='<div class="bb-cdrop-row" style="cursor:default;opacity:.6">The TEAM list is not loaded on this page.</div>'; return; }
    window.T2TTeam.build(menu, {
      mode:'pick',
      prefix:'bb',
      esc:_esc,
      rows: rows.map(function(m){
        var fromAbove=(m.source==='above' || m.source==='stakeholder');
        return {
          user_id:m.user_id, name:m.name, email:m.email, label:m.shortName, fromAbove:fromAbove,
          tip:m.name+(m.source==='above'?' — from the team one level up':(m.source==='stakeholder'?' — Stakeholder from higher up':''))
        };
      }),
      selectedUid: selected,
      frontEye: opts.frontEye,
      onPick: function(person){
        window.T2TLoad.invalidate();   // their PRIMARY count may change
        if(window.T2TPrimaryStatus) window.T2TPrimaryStatus.invalidate();   // ⚠ may clear
        if(opts.onPick) opts.onPick(person);
      },
      onClear: opts.onClear ? function(){ opts.onClear(); } : null,
      loadPool: function(){ return _bbFetchAllMembers(); },
      addPerson: (typeof _castAddPerson==='function') ? _castAddPerson : null,
      close: close,
      onResize: position
    });
    if(window.T2TAddControl) T2TAddControl.refresh(menu);
    position();
  }
