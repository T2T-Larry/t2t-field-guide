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
  // it turns amber. Shared by this list and the Cast Roster.
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
      return '<span class="t2t-load" title="PRIMARY on '+n+' project'+(n===1?'':'s')+(over?' — at capacity (5+)':'')+'" style="display:inline-block;min-width:14px;padding:0 4px;border-radius:7px;font-size:9px;line-height:14px;font-weight:700;text-align:center;vertical-align:middle;'
        +(over?'background:#e8a33a;color:#3b2200':'background:rgba(0,0,0,.08);color:#5b5b56')+'">'+n+'</span>';
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
    var loadP=window.T2TLoad.fetch();
    var rows=await _bbCastPickRows(opts.level||null);
    var loads=await loadP;
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
    menu.innerHTML='';
    // Type-to-filter, Sept 23 2026 -- a level can hold hundreds of
    // people, so a long list gets a filter box at the top.
    var filterInput=null;
    if(rows.length>8){
      var fwrap=document.createElement('div');
      fwrap.className='bb-view-addform';
      fwrap.innerHTML='<input type="text" placeholder="Type to find…" autocomplete="off">';
      filterInput=fwrap.querySelector('input');
      menu.appendChild(fwrap);
    }
    var listWrap=document.createElement('div');
    listWrap.style.cssText='max-height:min(60vh,420px);overflow-y:auto';
    menu.appendChild(listWrap);
    if(!rows.length){
      var empty=document.createElement('div');
      empty.className='bb-cdrop-row';
      empty.style.cssText='cursor:default;opacity:.6';
      empty.textContent='No one at this level yet.';
      listWrap.appendChild(empty);
    }
    rows.forEach(function(m){
      var isSel=selected && selected===String(m.user_id);
      var fromAbove=(m.source==='above' || m.source==='stakeholder');
      var row=document.createElement('label');
      row.className='bb-cdrop-row bb-view-person-row';
      row.title=m.name+(m.source==='above'?' — from the team one level up':(m.source==='stakeholder'?' — Stakeholder from higher up':''));
      row.setAttribute('data-find', (String(m.name||'')+' '+String(m.email||'')).toLowerCase());
      row.innerHTML='<input type="checkbox" class="bb-view-person-chk"'+(isSel?' checked':'')+'> <span>'+_esc(m.shortName)+'</span>'
        +(fromAbove?' <span class="cs-parent-star" style="color:#c9a227;font-size:.85em">★</span>':'')
        +' '+window.T2TLoad.badgeHTML(loads[String(m.user_id)]);
      var chk=row.querySelector('input');
      chk.addEventListener('change', function(){
        if(chk.checked){
          close();
          window.T2TLoad.invalidate();   // their PRIMARY count may change
          opts.onPick && opts.onPick({user_id:m.user_id, name:m.name||m.email||'(unnamed)', fromAbove:fromAbove && !isSel});
        } else if(opts.onClear){
          close();
          opts.onClear();
        } else {
          chk.checked=true;
        }
      });
      listWrap.appendChild(row);
    });
    if(filterInput){
      filterInput.addEventListener('input', function(){
        var q=filterInput.value.trim().toLowerCase();
        Array.prototype.forEach.call(listWrap.querySelectorAll('.bb-view-person-row'), function(r){
          r.style.display=(!q || r.getAttribute('data-find').indexOf(q)>=0)?'':'none';
        });
      });
      filterInput.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } });
      setTimeout(function(){ try{ filterInput.focus(); }catch(e){} }, 0);
    }
    // Add a name -- dashed (+), same button every other BB dropdown uses.
    var addRow=document.createElement('div');
    addRow.className='bb-cdrop-addrow';
    var addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='bb-dotted-add-btn';
    addBtn.title='Add a name';
    addBtn.textContent='+';
    addRow.appendChild(addBtn);
    menu.appendChild(addRow);
    addBtn.addEventListener('click', async function(){
      addRow.remove();
      var form=document.createElement('div');
      form.className='bb-view-addform';
      form.innerHTML='<input type="text" placeholder="Type a name or email…" autocomplete="off"><div class="tm-add-suggest" style="display:none"></div>';
      menu.appendChild(form);
      var input=form.querySelector('input'), box=form.querySelector('.tm-add-suggest');
      var listed={}; rows.forEach(function(r){ listed[String(r.user_id)]=true; });
      var pool=await _bbFetchAllMembers();
      function renderSuggest(){
        var q=input.value.trim().toLowerCase();
        var matches=(pool||[]).filter(function(p){
          if(!p.user_id) return false;
          if(!q) return !listed[String(p.user_id)];
          return (p.name||'').toLowerCase().indexOf(q)>=0 || (p.email||'').toLowerCase().indexOf(q)>=0;
        });
        // CAST Phase 2 (Sept 22 2026): a typed name with no exact match
        // gets a "+ Add" row -- creates a Cast person (not a member yet)
        // and picks them, same as picking anyone else.
        var typed=input.value.trim();
        var exact=typed && (pool||[]).some(function(p){ return String(p.name||'').toLowerCase()===typed.toLowerCase(); });
        var html=matches.map(function(p){
          return '<div class="tm-add-suggest-row" data-uid="'+_esc(p.user_id)+'">'
            +'<div class="tm-add-suggest-name">'+_esc(p.name||p.email||'')+(p.is_member===false?' <span style="opacity:.6;font-size:.85em">(not a member yet)</span>':'')+'</div>'
            +(p.email?'<div class="tm-add-suggest-email">'+_esc(p.email)+'</div>':'')
          +'</div>';
        }).join('');
        if(typed && !exact){
          html+='<div class="tm-add-suggest-row" data-newname="'+_esc(typed)+'"><div class="tm-add-suggest-name">+ Add “'+_esc(typed)+'”</div><div class="tm-add-suggest-email">new person — not a T2T member yet</div></div>';
        }
        box.innerHTML = html || '<div class="tm-add-suggest-empty">Everyone’s already listed above.</div>';
        box.style.display='block';
        position();
      }
      box.addEventListener('click', async function(e){
        var r=e.target.closest('.tm-add-suggest-row'); if(!r) return;
        var newName=r.getAttribute('data-newname');
        if(newName){
          if(typeof _castAddPerson!=='function') return;
          var made=await _castAddPerson(newName);
          if(!made.ok){ box.innerHTML='<div class="tm-add-suggest-empty">'+_esc(made.msg)+'</div>'; return; }
          close();
          opts.onPick && opts.onPick({user_id:made.person.user_id, name:made.person.name});
          return;
        }
        var uid=r.getAttribute('data-uid');
        var p=(pool||[]).filter(function(x){ return String(x.user_id)===String(uid); })[0];
        close();
        opts.onPick && opts.onPick({user_id:uid, name:p?(p.name||p.email):'(unnamed)'});
      });
      input.addEventListener('input', renderSuggest);
      input.addEventListener('keydown', function(e){
        if(e.key==='Escape'){ e.stopPropagation(); close(); }
        if(e.key==='Enter'){
          e.preventDefault();
          var first=box.querySelector('.tm-add-suggest-row'); if(first) first.click();
        }
      });
      renderSuggest();
      input.focus();
    });
    position();
  }
