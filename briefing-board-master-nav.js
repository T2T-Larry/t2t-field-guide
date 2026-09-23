/* ============================================================
   briefing-board-master-nav.js -- T2T Field Guide - BRIEFING BOARD (9350)

   MASTER NAV. The screens a traveler uses to move around the
   Master tree: the TOPIC bar and its up/down dropdowns, the board-
   kind dropdown, org name/logo/board-type chrome, the Sharing
   manager, Relations (parent/child board links), the Project Hub,
   and Team Roster.

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

   Sibling files: reads/writes state owned by briefing-board-master.js (which board is active, the project filter, etc.)
   ============================================================ */



  var BB_THEME_VARS=['--bb-bg','--bb-accent','--bb-ink','--bb-sub','--bb-head-font','--bb-body-font'];
  function _bbSyncMenuTheme(menu){
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    var cs=getComputedStyle(fgr);
    BB_THEME_VARS.forEach(function(v){
      var val=cs.getPropertyValue(v);
      if(val) menu.style.setProperty(v, val.trim());
    });
  }

  // Custom dropdown, Aug 13 2026 -- Larry: "the (+) should be at the
  // bottom of each dropdown list, not to the side" AND "the + in a
  // dotted line circle just like every other add." A native <select>
  // can't render a real dashed circle as one of its own options, so
  // Type and Title are a small trigger button + a real styled menu
  // instead, ending in that literal dashed-circle (+). Mirrors the Idea
  // Board's own _sboardRenderDropdown, same shape, BB's own light theme.
  function _bbCloseAllDropdowns(exceptMenuId){
    // Sept 6 2026 fix -- bb-topic-menu (TOPIC's descend caret, added Sept
    // 5) was never added to this list, so a plain click elsewhere on the
    // page never closed it via the document-level listener below; its
    // own trigger's onclick happened to mask this whenever another
    // dropdown opened, but not otherwise. Adding it, plus the new
    // bb-topic-ancestor-menu (TOPIC's up-arrow, today), so both close
    // the same way every other dropdown here already does.
    ['bb-type-menu','bb-org-name-menu','bb-board-menu','bb-boardkind-menu','bb-view-menu','bb-parent-menu','bb-topic-menu','bb-topic-ancestor-menu','bb-d-project-menu','bb-d-primary-menu'].forEach(function(id){
      if(id===exceptMenuId) return;
      var m=document.getElementById(id);
      if(m) m.hidden=true;
    });
  }
  document.addEventListener('click', function(){ _bbCloseAllDropdowns(null); });

  // onRemove, Aug 15 2026 -- optional 8th param, so far only used by
  // the Organization Type picker. When present, a second dashed-circle
  // button (−) sits next to the existing (+) at the bottom of the
  // menu; clicking it hands back to the caller, which decides what
  // "remove" means for that particular list (Type hides an unused
  // preset -- see _bbHideType).
  function _bbRenderDropdown(triggerId, menuId, options, currentValue, onSelect, onAdd, addTitle, onRemove, removeTitle){
    var trigger=document.getElementById(triggerId), menu=document.getElementById(menuId);
    if(!trigger || !menu) return;
    var current=options.filter(function(o){ return String(o.value)===String(currentValue); })[0];
    trigger.textContent = current ? current.label : (options[0] ? options[0].label : '—');
    menu.innerHTML='';
    options.forEach(function(o){
      var row=document.createElement('div');
      row.className='bb-cdrop-row'+(current && String(current.value)===String(o.value) ? ' active' : '');
      row.textContent=o.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onSelect(o.value);
      });
      menu.appendChild(row);
    });
    var addRow=document.createElement('div');
    addRow.className='bb-cdrop-addrow';
    // Sept 8 2026 -- defensive: a caller passing onAdd as null (meaning
    // "no + here") used to still get this button built and wired, which
    // threw the moment anyone actually clicked it (onAdd is not a
    // function). Every known caller now always passes a real function,
    // but this stays cheap insurance rather than a second silent way
    // for a future "goes inert" caller to crash the same way.
    if(onAdd){
    var addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='bb-dotted-add-btn';
    addBtn.title=addTitle||'Add';
    addBtn.textContent='+';
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      menu.hidden=true;
      onAdd();
    });
    addRow.appendChild(addBtn);
    }
    if(onRemove){
      var removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='bb-dotted-add-btn bb-dotted-remove-btn';
      removeBtn.title=removeTitle||'Remove';
      removeBtn.textContent='−';
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        onRemove();
      });
      addRow.appendChild(removeBtn);
    }
    menu.appendChild(addRow);
    // Moved to <body>, same reasoning as the Idea Board's own dropdown --
    // see the .bb-cdrop-menu CSS note above. Idempotent. Theme vars
    // (--bb-accent etc.) live only on #fg-root, so re-synced onto the
    // menu every time -- see _bbSyncMenuTheme.
    if(menu.parentElement!==document.body){ document.body.appendChild(menu); }
    _bbSyncMenuTheme(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?menuId:null);
      if(willOpen){
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
  }

  // ORGANIZATION, Aug 15 2026, corrected again -- Larry: the eyebrow
  // WORD ITSELF should be the dropdown (clicking "ORGANIZATION" opens
  // the category menu, and the word then becomes whatever category was
  // chosen -- e.g. "DEPARTMENT"). The field below is a separate, plain
  // name for that category (e.g. "Accounting"), no longer combined
  // into the same button. bb-type-trigger/bb-type-menu now live on the
  // eyebrow button itself (_bbRenderTypePicker, unchanged) -- this
  // function only handles the plain Name box underneath.
  // Org Name, Aug 16 2026 -- Larry: Type/Project/View all open as a
  // real dropdown when clicked, even empty ones (dashed-circle (+) at
  // the bottom either way) -- Org Name alone jumped straight to a
  // prompt() on click, no menu step first. Rebuilt on the same
  // _bbRenderDropdown component as the other three, for that same
  // consistent feel: the dropdown lists any other names already used
  // on boards of this same Type (so a repeat name is one click, not
  // retyped), the current name is highlighted if it's among them, (+)
  // still opens the rename prompt (unchanged flow, just reached one
  // click later now), and (-) clears the name off this board.
  function _bbOrgNameOptions(boardType){
    var seen={}, opts=[];
    _bbBoards.forEach(function(b){
      if((b.board_type||'personal')!==boardType) return;
      var n=(b.org_name||'').trim();
      if(!n || seen[n]) return;
      seen[n]=true; opts.push({value:n, label:n});
    });
    return opts;
  }
  function _bbRenderOrgName(){
    var trigger=document.getElementById('bb-org-name-trigger');
    if(_bbPendingTypeOverride){
      // Browsing a Type with nothing in it yet, Aug 16 2026 -- no real
      // board exists to attach a name to, so (+) has to create the
      // first board of this Type rather than just save a field on one.
      var typeVal=_bbPendingTypeOverride;
      var opts0=_bbOrgNameOptions(typeVal);
      _bbRenderDropdown('bb-org-name-trigger','bb-org-name-menu', opts0, null, function(){ /* nothing to select onto yet */ }, async function(){
        var typeLabel0=_bbTypeLabel(typeVal);
        var name0=window.prompt('Name for this '+typeLabel0+' (e.g. "Accounting" or "Denver Broncos"):', '');
        if(!name0 || !name0.trim()) return;
        var trimmed0=name0.trim();
        var ok=await _bbCreateBoard(trimmed0, typeVal);
        if(ok){
          var created=_bbBoards.filter(function(b){ return b.name===trimmed0 && b.board_type===typeVal; }).slice(-1)[0];
          if(created) await _bbSaveOrgName(trimmed0, created);
        }
      }, 'Add a name', function(){
        // (-) while browsing an empty Type, Aug 16 2026 -- Larry: both
        // (+) and (-) always show, no exceptions for blank. Nothing to
        // delete yet, so this backs out of the browse instead -- the
        // screen returns to whichever real board was open before.
        _bbPendingTypeOverride=null;
        _bbRenderTypePicker();
        _bbRenderOrgName();
        _bbRenderBoardPicker();
        _bbRenderLogo();
      }, 'Stop browsing this Type');
      if(trigger) trigger.textContent='Add a name';
      return;
    }
    var board=_bbOrgContextBoard(_bbCurrentBoardId);
    if(!board) return;
    var current=(board.org_name||'').trim();
    var opts=_bbOrgNameOptions(board.board_type||'personal');
    _bbRenderDropdown('bb-org-name-trigger','bb-org-name-menu', opts, current||null, function(newName){
      _bbSaveOrgName(newName, board);
    }, async function(){
      var typeLabel=_bbTypeLabel(board.board_type||'personal');
      var name=window.prompt('Name for this '+typeLabel+' (e.g. "Accounting" or "Denver Broncos"):', board.org_name||'');
      if(name===null) return;
      await _bbSaveOrgName(name, board);
      _bbRenderOrgName();
    }, 'Add a name', current ? function(){
      _bbSaveOrgName('', board);
    } : null, 'Remove this name');
    // _bbRenderDropdown falls back to the first option's label when
    // nothing matches currentValue -- not what an unnamed board should
    // show, so this overrides the trigger text directly afterward.
    if(trigger && !current) trigger.textContent='Add a name';
  }
  async function _bbSaveOrgName(value, boardOverride){
    var board=boardOverride || _bbOrgContextBoard(_bbCurrentBoardId);
    if(!board) return;
    var trimmed=(value||'').trim();
    if((board.org_name||'')===trimmed) return;
    board.org_name=trimmed;
    _bbRenderOrgName();
    var sb=T().sb;
    try{
      var upd=await sb.from('briefing_boards').update({org_name:trimmed||null}).eq('id', board.id);
      if(upd.error) console.error('Briefing Board: could not save Organization name', upd.error);
    }catch(e){ console.error('Briefing Board: could not save Organization name', e); }
  }

  function _bbRenderTypePicker(){
    var extra=_bbExtraBoardTypes();
    var opts=_bbVisibleFixedTypes().concat(extra.map(function(v){ return {value:v, label:_bbTypeLabel(v)}; }));
    var activeType=_bbActiveBoardType();
    _bbRenderDropdown('bb-type-trigger','bb-type-menu', opts, activeType, async function(newType){
      var matching=_bbBoards.filter(function(b){ return (b.board_type||'personal')===newType; });
      if(matching.length){
        _bbPendingTypeOverride=null;
        await _bbSwitchToBoard(matching[0].id);
      } else {
        // Aug 16 2026 -- Larry: an empty Type should browse the same as
        // a full one, dropdown and all, not jump straight to a prompt.
        // No board content to show yet (nothing exists), so whatever
        // was open stays open underneath; only the header switches.
        _bbPendingTypeOverride=newType;
        _bbRenderTypePicker();
        _bbRenderOrgName();
        _bbRenderBoardPicker();
        _bbRenderLogo();
      }
    }, async function(){
      var typeName=window.prompt('Name for the new Type (e.g. "Client", "Household"):');
      if(!typeName || !typeName.trim()) return;
      var typeValue=typeName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || ('type_'+Date.now());
      var firstBoardName=window.prompt('Name for the first '+typeName.trim()+' board:');
      if(!firstBoardName || !firstBoardName.trim()) return;
      await _bbCreateBoard(firstBoardName.trim(), typeValue);
    }, 'Add a type', function(){
      // Remove, Aug 15 2026 -- only ever hides an unused preset (see
      // _bbHideType/_bbVisibleFixedTypes); a Type still in use by one
      // of the traveler's own boards keeps showing no matter what.
      var removable=_bbVisibleFixedTypes().filter(function(t){ return t.value!==activeType; });
      if(!removable.length){ window.alert('Nothing left to remove.'); return; }
      var listText=removable.map(function(t){ return t.label; }).join(', ');
      var typeName=window.prompt('Which Type would you like to remove from the list? ('+listText+')\n\nAny board already using it keeps working either way.');
      if(!typeName || !typeName.trim()) return;
      var hit=removable.filter(function(t){ return t.label.toLowerCase()===typeName.trim().toLowerCase(); })[0];
      if(!hit){ window.alert('Didn\'t recognize "'+typeName.trim()+'" -- type the name exactly as shown.'); return; }
      _bbHideType(hit.value);
    }, 'Remove a type');
  }

  // Sept 6 2026 rewrite, Larry: "BB PROJECTS under the traveler name
  // should be EXACTLY the same as on the IDEA BOARD! ... The BB still
  // has the wrong projects." Root cause: this list used to be built from
  // _bbBoards -- only projects that already happened to have a Briefing
  // Board row of their own -- filtered by the now-fixed but previously
  // stale _bbRootHeaderIdSet (see its own Sept 6 note, above). A real
  // Idea Board project with no Briefing Board yet was simply invisible
  // here no matter what; one that DID have a Briefing Board could still
  // get wrongly excluded by the stale check. Sourced straight from
  // T2TData.ensureIdeaStoryboardsRoot + a live query for that root's
  // children now -- the exact same "this member's real top-level
  // projects" data the Idea Board's own PROJECT popup (openProjectSwitcher,
  // idea-storyboard-9710.js) reads via T2TData.topLevelBoards, sorted the
  // same alphabetical way that popup already uses. Personal/org boards
  // with no linked Idea project (storyboard_project_id null) still ride
  // along too -- those were never the part that was wrong. Options are
  // tagged 'hdr:'/'brd:' so onSelect knows whether it's landing on a real
  // project (resolve-or-create that project's Briefing Board, same as
  // TOPIC's own jumpToTopic) or an existing personal board directly.
  // Sept 7 2026 -- factored out of _bbRenderBoardPicker's own inline
  // build so the per-card Project field (openCardDetail's
  // _bbRenderCardProjectField, below) can offer the exact same list of
  // real projects/boards without a second hand-maintained copy. Nothing
  // about the list itself changed by pulling it out -- same MASTER pin,
  // same personal boards, same adopted children -- only the board
  // switcher's own current-selection/add/remove handling stayed behind
  // in _bbRenderBoardPicker, since a single card doesn't need those.
  async function _bbProjectPickerOptions(){
    var realProjects=[];
    try{ realProjects=await T2TData.topLevelBoards(); }
    catch(e){ console.warn('Briefing Board: could not load top-level projects', e); }
    realProjects=realProjects.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    realProjects=realProjects.filter(function(h){ return !(window.IDBand && IDBand.isNonProjectName(h.text_content)) && h.id!==_bbIdeaStoryboardsRootId; });
    var opts=realProjects.map(function(h){ return {value:'hdr:'+h.id, label:h.text_content||'(untitled)'}; });
    // MASTER, pinned first, Sept 6 2026 -- Larry: "What used to be Idea
    // Storyboards is now PROJECTS and should top the projects list..."
    // The shared root every real project nests under
    // (_bbIdeaStoryboardsRootId, same row the Idea Board itself now
    // calls PROJECTS) is a real Header like any other, so it already
    // resolves/creates its own linked board through the same 'hdr:'
    // path below.
    // Sept 7 2026, Larry: relabeled from "MASTER BRIEFING BOARD" to
    // plain MASTER -- PROJECT reads MASTER at root on every board kind
    // now (see idea-storyboard-9710.js's own root PROJECT label), not a
    // board-specific name. TOPIC (bb-topic-hit) still reads PROJECTS at
    // this same root, same as the Idea Board.
    if(_bbIdeaStoryboardsRootId) opts.unshift({value:'hdr:'+_bbIdeaStoryboardsRootId, label:'MASTER'});
    // Sept 22 2026 -- a board named PROJECTS is the shared MASTER board
    // itself, never a project of its own (MASTER, pinned above, already
    // is that entry); same for anything named Parking Lot.
    var personalBoards=_bbBoards.filter(function(b){ return !b.storyboard_project_id && !(window.IDBand && IDBand.isNonProjectName(b.name)); });
    personalBoards.forEach(function(b){ opts.push({value:'brd:'+b.id, label:b.name||'Untitled Board'}); });
    // Adopted children ride along too, Aug 16 2026 -- Larry: opening
    // T2T should list Field Guide and Professional History as its
    // projects, not just other boards that happen to share T2T's own
    // Type. Deduped by id (or by linked project, if it has one) in case
    // a child's own project already matched above. Aug 16 2026 (later
    // same day) -- resolved off the org-context board, not the
    // literally-open one, so opening Field Guide shows the same
    // T2T-family list as opening T2T itself. Skipped entirely while
    // browsing an empty Type (_bbPendingTypeOverride) -- there's no real
    // context board yet, so _bbCurrentBoardId is just whatever was open
    // before and its children don't belong in this list.
    if(!_bbPendingTypeOverride){
      var contextBoard=_bbOrgContextBoard(_bbCurrentBoardId);
      var children=_bbChildBoardsOf(contextBoard ? contextBoard.id : _bbCurrentBoardId);
      children.forEach(function(c){
        var key=c.storyboard_project_id?('hdr:'+c.storyboard_project_id):('brd:'+c.id);
        if(!opts.some(function(o){ return o.value===key; })) opts.push({value:'brd:'+c.id, label:c.name||'Untitled Board'});
      });
    }
    return opts;
  }

  async function _bbRenderBoardPicker(){
    var opts=await _bbProjectPickerOptions();
    // (-) on the PROJECT field, Aug 16 2026 -- Larry: "how do we handle
    // a (-) with a full project? Sounds like we need a hub screen, 3
    // choices even if they do not all work yet." Only offered when a
    // real, currently-open board exists at all -- not while browsing an
    // empty Type (nothing real to remove).
    var currentBoardForRemove=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var canRemoveBoard=!_bbPendingTypeOverride && !!currentBoardForRemove;
    // Which option is "here" right now -- climb from the open board's
    // own linked Header up to its real project root (same ceiling
    // _bbClimbToProjectRoot now correctly stops at, per its own Sept 6
    // fix above) so a nested layer like Dream Phase still shows Field
    // Guide selected, exactly like PROJECT already reads everywhere
    // else. A personal board with no linked project selects on its own
    // 'brd:' option directly.
    var pickerCurrentId=null, pickerFallbackName=null;
    // One-board model, Sept 8 2026 -- the master board's own
    // storyboard_project_id is fixed at the account root, so it can't
    // say which project is actually on screen any more; whichever
    // project _bbProjectFilter() names (root included) is the real
    // answer in that world.
    var pickerHeaderId=_bbSingleBoardMode() ? (_bbProjectFilter() || _bbIdeaStoryboardsRootId) : (currentBoardForRemove && currentBoardForRemove.storyboard_project_id);
    if(pickerHeaderId && _bbIdeaStoryboardsRootId && pickerHeaderId===_bbIdeaStoryboardsRootId){
      // Standing at MASTER root itself -- _bbClimbToProjectRoot only
      // knows how to climb UP FROM a real project to its root, and the
      // root has no clusterId of its own to climb from, so it can't
      // answer this one; match the pinned MASTER option directly.
      pickerCurrentId='hdr:'+_bbIdeaStoryboardsRootId;
    } else if(pickerHeaderId){
      var climb=_bbClimbToProjectRoot(pickerHeaderId);
      if(climb.rootHeaderId){
        var key='hdr:'+climb.rootHeaderId;
        if(opts.some(function(o){ return o.value===key; })) pickerCurrentId=key;
        else pickerFallbackName=climb.rootName;
      } else if(climb.pendingHeaderId){
        // Ancestor not in cache yet (rare -- usually already warmed by
        // _bbRefreshRootHeaderIdSet/_bbResolveOrCreateBoardForHeader
        // before this ever renders) -- fetch it once and re-render;
        // this pass falls through to the fallback-name display below.
        _bbFetchHeaderInfo(climb.pendingHeaderId).then(function(info){ if(info) _bbRenderBoardPicker(); });
      }
    } else if(currentBoardForRemove){
      pickerCurrentId='brd:'+currentBoardForRemove.id;
    }
    // One-board model, Sept 8 2026 -- "Add a board" and "Remove this
    // project" both meant something else (a new/existing briefing_boards
    // row) that no longer applies once there's only one true board. A
    // new project now comes from adding a Header on the Idea Board
    // itself (unrelated to this dropdown); removing "the project" here
    // would mean removing the only board a single-board traveler has,
    // which is never right. Both go inert in that world rather than
    // quietly doing the wrong thing.
    _bbRenderDropdown('bb-board-trigger','bb-board-menu', opts, pickerCurrentId, async function(value){
      var v=String(value);
      if(v.indexOf('hdr:')===0){
        var board=await _bbResolveOrCreateBoardForHeader(v.slice(4));
        if(board) await _bbSwitchToBoard(board.id);
      } else if(v.indexOf('brd:')===0){
        await _bbSwitchToBoard(v.slice(4));
      }
    }, _bbSingleBoardMode() ? async function(){
      // One-board model, Sept 8 2026 -- Larry: "The list should have a
      // (+) at the bottom of the list for a new project entry, no
      // matter where you see this list. Adding a new project should
      // automatically add a HEADER to the PROJECTS idea board." No new
      // board row here (there's only ever the one true board in this
      // world) -- just a new Header under PROJECTS, then land straight
      // on it, same as picking any other project from this same menu.
      var name=window.prompt('Name for the new project:');
      if(!name || !name.trim()) return;
      var rootId=_bbIdeaStoryboardsRootId;
      if(!rootId){ try{ rootId=await T2TData.ensureIdeaStoryboardsRoot(); }catch(e){} }
      if(!rootId){ window.alert('Could not add a project right now. Try again in a moment.'); return; }
      var hdr;
      try{ hdr=await T2TData.createHeader(name.trim(), rootId); }
      catch(e){ console.error('Briefing Board: could not add project header', e); window.alert('Could not add the project "'+name.trim()+'". Try again.'); return; }
      _bbProjectNameById[hdr.id]=hdr.text_content||name.trim();
      var board=await _bbResolveOrCreateBoardForHeader(hdr.id);
      if(board) await _bbSwitchToBoard(board.id);
    } : async function(){
      var typeLabel=_bbTypeLabel(_bbActiveBoardType());
      var name=window.prompt('Name for the new '+typeLabel+' board:');
      if(!name || !name.trim()) return;
      await _bbCreateBoard(name.trim(), _bbActiveBoardType());
    }, _bbSingleBoardMode() ? 'Add a project' : 'Add a board', (canRemoveBoard && !_bbSingleBoardMode()) ? function(){
      openProjectHub(currentBoardForRemove.id);
    } : null, 'Remove this project');
    if(pickerFallbackName){
      var triggerEl=document.getElementById('bb-board-trigger');
      if(triggerEl) triggerEl.textContent=pickerFallbackName;
    }
    // bb-project-caret, Sept 5 2026 -- the label-then-arrow shape Larry
    // wanted to match the Idea Board's own PROJECT field exactly. No new
    // behavior: forwards straight to the label button's own click, which
    // _bbRenderDropdown just wired above to open this same menu. Rewired
    // every render, same as the label itself.
    var projCaret=document.getElementById('bb-project-caret');
    if(projCaret) projCaret.onclick=function(e){
      e.stopPropagation();
      var t=document.getElementById('bb-board-trigger');
      if(t) t.click();
    };
  }

  // Logo/artwork, Aug 28 2026 -- reflect whichever board is currently
  // open (_bbCurrentBoardId) every time the header re-renders. A loaded
  // logo hides the (+) and becomes the click target for swapping it
  // out; no logo means the (+) shows instead.
  //
  // Aug 30 2026 -- all of the actual logo behavior (upload, crop,
  // resize handle, drag, hover-peek eyebrow) moved to the shared
  // window.T2TLogo controller in idea-media-shared.js, now also used
  // by the Idea/Plan Storyboard (see idea-storyboard-9710.js's own
  // _sboardLogoCfg). This board's only remaining job is describing
  // itself to that controller: which row holds this board's logo
  // fields (briefing_boards, keyed by _bbCurrentBoardId -- one logo per
  // Briefing Board, independent of any linked Idea project's own logo),
  // this board's own element ids, size bounds, and its own light-themed
  // crop-overlay chrome (bb-logo-crop-overlay). The Briefing Board has
  // no positionAnchor hook -- its anchor already sits in the header's
  // normal flex layout (see .bb-logo-anchor above) and needs no
  // per-render repositioning the way Idea/Plan's does.
  var _bbLogoCfg={
    slotId:'bb-logo-slot', imgId:'bb-logo-img', addBtnId:'bb-logo-add-btn',
    inputId:'bb-logo-input', resizeHandleId:'bb-logo-resize-handle',
    eyebrowTopId:'bb-logo-eyebrow', eyebrowOnLogoId:'bb-logo-eyebrow-onlogo',
    minSize:IDBand.TOKENS.logo.minSize, maxSize:IDBand.TOKENS.logo.maxSize, defaultSize:IDBand.TOKENS.logo.defaultSize, minFrameFromCrop:10,
    uploadPrefix:'bb-logo', subjectLabel:'board',
    showToast:_bbShowToast,
    getRow:function(){ return _bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; },
    saveLogo:async function(patch){
      var board=_bbLogoCfg.getRow();
      if(!board) return;
      var sb=T().sb;
      var upd=await sb.from('briefing_boards').update(patch).eq('id', board.id);
      if(upd.error) throw upd.error;
      Object.keys(patch).forEach(function(k){ board[k]=patch[k]; });
    },
    crop:{
      stageMaxW:320, stageMaxH:320, handleColor:'#C9A87C', handleBorderColor:'#fff',
      mount:function(doClose){
        var ov=document.getElementById('bb-logo-crop-overlay');
        var card=ov.querySelector('.bb-overlay-card');
        if(!card) return null;
        card.innerHTML=
           '<div class="bb-overlay-head"><span class="bb-overlay-title">Crop your logo</span><button class="bb-close" id="bb-lc-cancel-x" aria-label="Close">✕</button></div>'
          +'<div class="bbw" style="text-align:center">'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#a3907a;font-style:italic;margin-bottom:10px">Drag the box to choose what to keep. Drag a corner to reshape it -- any rectangle, not just square.</div>'
          +'<div id="bb-lc-stage" style="position:relative;margin:0 auto 14px;background:#3B2510;border-radius:8px;overflow:hidden"></div>'
          +'<div style="display:flex;gap:6px">'
          +'<button type="button" class="jb" id="bb-lc-use" style="flex:1">Use this crop</button>'
          +'<button type="button" class="bb-flag-btn" id="bb-lc-cancel" style="flex:1">Cancel</button>'
          +'</div>'
          +'</div>';
        ov.classList.add('active');
        _bbResetCardPosition(card);
        var cancelBtn=document.getElementById('bb-lc-cancel'); if(cancelBtn) cancelBtn.onclick=doClose;
        var cancelX=document.getElementById('bb-lc-cancel-x'); if(cancelX) cancelX.onclick=doClose;
        ov.onclick=function(e){ if(e.target===ov) doClose(); };
        return { stage:document.getElementById('bb-lc-stage'), useBtn:document.getElementById('bb-lc-use') };
      },
      close:function(){
        var ov=document.getElementById('bb-logo-crop-overlay');
        if(ov) ov.classList.remove('active');
      }
    }
  };

  function _bbRenderLogo(){ T2TLogo.render(_bbLogoCfg); }

  // Wires the (+)/image click-to-upload, drag-to-move, and the resize
  // handle once at board setup (see injectBriefingBoardScreens below).
  function wireLogoUpload(){ T2TLogo.wire(_bbLogoCfg); }

  function _bbLoadTopic(){
    try{ return sessionStorage.getItem('bbTopic')||''; }catch(e){ return ''; }
  }
  function _bbSaveTopic(text){
    try{ sessionStorage.setItem('bbTopic', text); }catch(e){}
  }

  // ---- Board Sharing manager (Aug 4 2026) ----
  // Larry: Project/Departmental/Company boards should support more than
  // one signed-in member on the same board. Whoever owns the board (its
  // user_id) is the only one who can add or remove other members; anyone
  // they add gets full, equal edit access to the board's cards, same as
  // the owner -- no separate viewer/editor tiers for now. Backed by the
  // board_members table + RLS (Supabase migration "add_board_sharing").
  // Personal boards stay single-traveler and hide this control entirely.
  var _bbSharingCache = [];
  var _bbSharingIsOwner = false;

  async function _bbLoadSharing(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var fieldEl=document.getElementById('bb-sharing-field');
    var summaryEl=document.getElementById('bb-sharing-summary');
    if(!board || (board.board_type||'personal')==='personal'){
      if(fieldEl) fieldEl.style.display='none';
      return;
    }
    if(fieldEl) fieldEl.style.display='';
    var uid=await _bbCurrentUserId();
    _bbSharingIsOwner = !!uid && board.user_id===uid;
    var sb=T().sb; if(!sb) return;
    try{
      var res=await sb.rpc('list_board_members', {p_board_id: board.id});
      _bbSharingCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _bbSharingCache=[]; }
    if(summaryEl){
      if(!_bbSharingCache.length){
        summaryEl.textContent = _bbSharingIsOwner ? 'Only you can see this board right now.' : 'Shared with you.';
      } else {
        var names=_bbSharingCache.map(function(m){ return m.name||m.email; });
        summaryEl.textContent = (_bbSharingIsOwner?'Shared with: ':'Also shared with: ')+names.join(', ');
      }
    }
    var openBtn=document.getElementById('bb-open-sharing');
    if(openBtn) openBtn.innerHTML = '\uD83C\uDFAB Guests';
  }

  function _bbRenderSharingList(){
    var list=document.getElementById('bb-sharing-list'); if(!list) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var addRow=document.getElementById('bb-sharing-add-row');
    if(addRow) addRow.style.display = _bbSharingIsOwner ? 'block' : 'none';
    if(!_bbSharingCache.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">Nobody else has access yet.</div>';
      return;
    }
    var _bbGuestsOnly=(_bbSharingCache||[]).filter(function(m){ return m.access_level==='view'; });
    if(!_bbGuestsOnly.length){
      list.innerHTML='<div class="bb-key-pick-empty-msg">No guests yet.</div>';
      return;
    }
    list.innerHTML=_bbGuestsOnly.map(function(m){
      var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc(m.phone)) : '';
      var sponsorLine = m.sponsor_name ? '<div style="font-size:calc(10px * var(--fg-text-scale,1));color:var(--bb-sub);font-style:italic;margin-top:2px">Cast sponsor: '+_esc(m.sponsor_name)+'</div>' : '';
      return '<div class="bb-keylib-row" data-user-id="'+_esc(m.user_id)+'" style="align-items:flex-start">'
        +'<span class="bb-keylib-meaning"><div>'+_esc(m.name||m.email)+'</div><div style="font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-sub)">\u2709 '+_esc(m.email||'')+phoneLine+'</div>'+sponsorLine+'</span>'
        +(_bbSharingIsOwner ? '<button class="bb-keylib-del" data-user-id="'+_esc(m.user_id)+'" title="Remove">&#128465;&#65039;</button>' : '')
        +'</div>';
    }).join('');
    if(!_bbSharingIsOwner || !board) return;
    list.querySelectorAll('.bb-keylib-del').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var uidToRemove=btn.getAttribute('data-user-id');
        var row=_bbSharingCache.filter(function(m){ return m.user_id===uidToRemove; })[0];
        if(!window.confirm('Remove '+(row?(row.name||row.email):'this person')+' from this board? They will lose access immediately.')) return;
        var sb=T().sb; if(!sb) return;
        await sb.from('board_members').delete().eq('board_id', board.id).eq('user_id', uidToRemove);
        await _bbLoadSharing();
        _bbRenderSharingList();
      });
    });
  }

  function openSharingManager(){
    _bbLoadSharing().then(_bbRenderSharingList);
    var ov=document.getElementById('bb-sharing-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeSharingManager(){
    var ov=document.getElementById('bb-sharing-overlay'); if(ov) ov.classList.remove('active');
    _bbOpenSettingsAt('people');
  }
  function wireSharingManager(){
    T().wire('bb-sharing-close', closeSharingManager);
    var addBtn=document.getElementById('bb-sharing-add-btn');
    if(addBtn) addBtn.addEventListener('click', async function(){
      if(!_bbSharingIsOwner){ window.alert('Only the board owner can add people.'); return; }
      var input=document.getElementById('bb-sharing-add-email');
      var email=input?input.value.trim().toLowerCase():'';
      if(!email) return;
      var accessLevel='view';
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      var sb=T().sb; if(!sb || !board) return;
      try{
        var res=await sb.rpc('find_member_by_email', {p_email: email});
        var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
        if(!match){
          window.alert('No T2T member found with that email. They need an active Field Guide account first -- ask them to sign up, then try adding them again.');
          return;
        }
        var myUid=await _bbCurrentUserId();
        var ins=await sb.from('board_members').insert({board_id: board.id, user_id: match.user_id, added_by: myUid, access_level: accessLevel});
        if(ins.error){
          window.alert('Could not add '+(match.name||email)+'. '+(ins.error.message||'Please try again.'));
          return;
        }
        if(input) input.value='';
        await _bbLoadSharing();
        _bbRenderSharingList();
      }catch(e){
        console.error('Briefing Board: could not add member', e);
        window.alert('Could not add that person. Please try again.');
      }
    });
  }

  // Relationships (Aug 16 2026) -- the Organization Board work: a real
  // on-screen way to form and accept the parent-child adoption links
  // that board_relations has supported since Session 214-215, so this
  // stops being something only Claude can do from the database. Every
  // write here goes through request_board_adoption/respond_board_
  // adoption -- both SECURITY DEFINER functions that re-check ownership
  // and the mutual-consent rule server-side, so this UI can't bypass
  // anything the database itself wouldn't allow.
  var _bbRelationsFullCache = null;
  async function _bbLoadRelationsFull(force){
    var sb=T().sb; if(!sb) return [];
    if(!force && _bbRelationsFullCache) return _bbRelationsFullCache;
    try{
      var res=await sb.rpc('list_my_board_relations');
      _bbRelationsFullCache = res.error ? [] : (res.data||[]);
    }catch(e){ console.error('Briefing Board: could not load relationships', e); _bbRelationsFullCache=[]; }
    return _bbRelationsFullCache;
  }

  function _bbRelBoardLabel(name, type){
    return (name||'(untitled)')+' — '+_bbTypeLabel(type||'personal');
  }

  // Persistent Parent header field, Sept 5 2026 -- see the header markup
  // above for the "why now" (Larry: every board, present and future,
  // should carry the same PROJECT and PARENT fields). Reads the exact
  // same list_my_board_relations RPC the Links popup (_bbRenderRelations,
  // above) already uses -- that RPC returns the parent's name even when
  // this traveler doesn't otherwise have access to that board's row
  // (RLS still lets a child see its own approved parent's name), which
  // is exactly the case a cross-owner adoption (e.g. a department board
  // adopted by a company board someone else owns) needs.
  //
  // One real open question this surfaced rather than guessed at: today,
  // a parent board this traveler isn't a member of can't actually be
  // opened -- _bbBoards only ever holds boards they own or are a member
  // of, and RLS wouldn't return that board's cards either. Whether
  // adopting a parent should also grant the child's owner a peek into
  // it is a real access-control decision, not a UI one -- left for
  // Larry, not decided here. Until then, that case shows the parent's
  // name (so "where does this sit" is always visible, per today's
  // design lock) but explains why clicking it doesn't go anywhere yet,
  // rather than failing silently or pretending it isn't there.
  function _bbCanOpenBoard(boardId){
    return _bbBoards.some(function(b){ return b.id===boardId; });
  }
  function _bbOpenAncestorBoard(boardId){
    if(_bbCanOpenBoard(boardId)) _bbSwitchToBoard(boardId);
    else _bbShowToast("This board isn't shared with you yet — its owner needs to add you before you can open it.");
  }
  async function _bbRenderParentField(){
    var hit=document.getElementById('bb-parent-hit');
    if(!hit || !_bbCurrentBoardId) return;
    var rel=await _bbLoadRelationsFull();
    var parentRow=rel.filter(function(r){ return r.status==='approved' && r.child_board_id===_bbCurrentBoardId; })[0];
    if(!parentRow){
      // Sept 5 2026 fix -- an approved board_relations row is one real
      // kind of parent (a deliberate org-adoption, e.g. a Client board
      // adopted under a Company board), but it's not the only kind now
      // that ANY Header can stand in for a board (see
      // _bbResolveOrCreateBoardForHeader's Sept 5 note): a layer like
      // Dream Phase was never "adopted" by anything -- its real parent is
      // just one step up its own Idea-tree cluster_id chain, exactly what
      // PARENT already means on the Idea Board. "No parent yet" is only
      // correct for a true root/personal/org board; for a nested layer
      // that simply hasn't been through the adoption flow, fall back to
      // that Idea-tree ancestor instead of flatly saying it has none.
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      var headerId=board && board.storyboard_project_id;
      var isNestedLayer=headerId && _bbRootHeaderIdSet[headerId]===false;
      if(isNestedLayer){
        var info=_bbHeaderInfoById[headerId] || await _bbFetchHeaderInfo(headerId);
        var ancestorHeaderId=info && info.clusterId;
        if(ancestorHeaderId){
          var ancestorBoard=await _bbResolveOrCreateBoardForHeader(ancestorHeaderId);
          if(ancestorBoard){
            hit.textContent=ancestorBoard.name||'(untitled)';
            hit.style.cursor=_bbCanOpenBoard(ancestorBoard.id)?'pointer':'default';
            hit.onclick=function(){ _bbOpenAncestorBoard(ancestorBoard.id); };
            return;
          }
        }
      }
      hit.textContent='No parent yet';
      hit.style.cursor='default';
      hit.onclick=null;
      return;
    }
    hit.textContent=parentRow.parent_board_name||'(untitled)';
    hit.style.cursor=_bbCanOpenBoard(parentRow.parent_board_id)?'pointer':'default';
    hit.onclick=function(){ _bbOpenAncestorBoard(parentRow.parent_board_id); };
  }
  // PARENT's fast-jump arrow -- same "walk the chain, collect every
  // ancestor, reverse so the highest level reads first" approach as the
  // Idea board's own _sboardParentAncestorChoices, just walking
  // parent_board_id via the RPC's rows instead of cluster_id via the
  // in-memory topic cache. Reads _bbRelationsFullCache directly (already
  // warmed by _bbRenderParentField above) rather than re-fetching, so
  // opening the menu is instant.
  function _bbParentAncestorChoices(){
    var list=[];
    var rel=_bbRelationsFullCache||[];
    var curId=_bbCurrentBoardId;
    var guard=0;
    while(curId && guard<50){
      guard++;
      var parentRow=rel.filter(function(r){ return r.status==='approved' && r.child_board_id===curId; })[0];
      if(!parentRow) break;
      list.push({id:parentRow.parent_board_id, name:parentRow.parent_board_name});
      curId=parentRow.parent_board_id;
    }
    return list.reverse();
  }
  function _bbWireParentAncestorDropdown(){
    var trigger=document.getElementById('bb-parent-caret'), menu=document.getElementById('bb-parent-menu');
    if(!trigger || !menu) return;
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-parent-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      var choices=_bbParentAncestorChoices();
      menu.innerHTML='';
      if(!choices.length){
        var empty=document.createElement('div');
        empty.className='bb-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent='Nothing above this.';
        menu.appendChild(empty);
      } else {
        choices.forEach(function(h){
          var row=document.createElement('div');
          row.className='bb-cdrop-row';
          if(!_bbCanOpenBoard(h.id)) row.style.opacity='.55';
          row.textContent=h.name||'(untitled)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.hidden=true;
            _bbOpenAncestorBoard(h.id);
          });
          menu.appendChild(row);
        });
      }
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      _bbSyncMenuTheme(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    };
  }

  // TOPIC, Sept 5 2026 -- Larry: "Need TOPIC just like Idea Board...
  // what if it is exactly the same?" Unlike PARENT (org-hierarchy
  // adoption, board_relations table), TOPIC tracks the same tree PROJECT
  // does -- the ideas table's own cluster_id chain -- just centered on
  // whichever Header THIS board is linked to (storyboard_project_id)
  // rather than that Header's project root. _bbCurrentTopicHeaderId/
  // _bbCurrentTopicIsRoot are read by the caret's dropdown and by
  // renderBoard's Master rollup (_bbMasterRollupCardsIfAny) below.
  var _bbCurrentTopicHeaderId = null;
  var _bbCurrentTopicIsRoot = false;
  async function _bbRenderTopicField(){
    var hit=document.getElementById('bb-topic-hit');
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!hit || !board){ return; }
    // One-board model, Sept 8 2026 -- the master board's own
    // storyboard_project_id never changes (it's always the account
    // root), so in single-board mode TOPIC reads whichever project is
    // actually being viewed right now (_bbProjectFilter(), already
    // kept current by _bbSetProjectFilter) instead of re-deriving a
    // fixed value off the board row every time.
    var headerId=_bbSingleBoardMode() ? (_bbProjectFilter() || _bbIdeaStoryboardsRootId) : board.storyboard_project_id;
    _bbCurrentTopicHeaderId=headerId;
    _bbCurrentTopicIsRoot=false;
    if(!headerId){
      // A personal/org board that was never tied to an Idea project --
      // TOPIC has nothing to show or descend from. Matches PROJECT's own
      // "isn't linked to a project" toast elsewhere for the same case.
      hit.textContent='(not linked)';
      hit.style.cursor='default';
      _bbSyncMasterSubtitle(false);
      _bbSyncTopicUpCaret(true); // nothing to climb from here either
      _bbFitTopicText();
      return;
    }
    try{
      var sb=T().sb;
      var res=await sb.from('ideas').select('id,cluster_id,text_content').eq('id',headerId).maybeSingle();
      if(res.error || !res.data){ hit.textContent=board.name||'(untitled)'; _bbFitTopicText(); return; }
      // Sept 22 2026 fix -- Larry: "BB topic is Share but project has
      // shifted to MASTER" (a top-level project with no parent of its own,
      // like Share, was being mistaken for the true account root just
      // because both have no cluster_id). Then, same session: "Does it
      // have its own files? Do we have duplicate files?" -- it did: this
      // board and the Idea Board each hand-carried their own copy of the
      // root test, and this one had quietly drifted from the Idea Board's
      // safer version (which compares the row's actual id against the
      // real root id, not just "does it have a parent"). Both boards now
      // call the one shared test in id-band.js (IDBand.isAccountRoot)
      // instead, so they can't drift apart again -- falls back to the old
      // inline version only if id-band.js somehow isn't loaded.
      _bbCurrentTopicIsRoot = window.IDBand
        ? IDBand.isAccountRoot({id:headerId, cluster_id:res.data.cluster_id}, _bbIdeaStoryboardsRootId)
        : (_bbIdeaStoryboardsRootId ? (String(headerId)===String(_bbIdeaStoryboardsRootId)) : !res.data.cluster_id);
      hit.textContent = res.data.text_content || board.name || '(untitled)';
      _bbSyncMasterSubtitle(_bbCurrentTopicIsRoot);
      _bbSyncTopicUpCaret(_bbCurrentTopicIsRoot);
      _bbFitTopicText();
    }catch(e){
      console.warn('Briefing Board: could not load TOPIC field', e);
      hit.textContent=board.name||'(untitled)';
      _bbFitTopicText();
    }
  }
  // Sept 6 2026 -- goes inert (same treatment Parent's own hit-box used
  // to get, see .bb-topic-caret:disabled above) once TOPIC is standing
  // at a project's own root, since there's nothing left above it to jump
  // to. A real disabled button rather than a style-only gray-out, so a
  // stray click can't pop an empty menu.
  function _bbSyncTopicUpCaret(isRoot){
    var up=document.getElementById('bb-topic-caret-up');
    if(!up) return;
    up.disabled=!!isRoot;
  }
  // Master Briefing Board label, Sept 5 2026 -- Larry: "the top level of
  // the BB = MASTER BRIEFING BOARD which includes everything at all
  // levels." Reuses the subtitle under the big "Briefing Board" title
  // (bb-mh-subtitle) rather than TOPIC's own eyebrow, so TOPIC's label
  // stays the plain, permanent "Topic" the Idea Board itself uses, and
  // the Master distinction lives next to the title it's actually
  // describing.
  function _bbSyncMasterSubtitle(isMaster){
    var sub=document.getElementById('bb-mh-subtitle');
    if(sub){
      // Sept 8 2026 -- a single-board traveler's root (PROJECTS/MASTER)
      // shows every task unfiltered now (_bbProjectFilterCards, driven by
      // _bbProjectFilter()), not a depth-capped walk, so its own
      // subtitle says so instead of citing a depth number that no longer
      // applies to it.
      var isAccountRoot = isMaster && _bbSingleBoardMode() && !_bbProjectFilter();
      sub.textContent = !isMaster
        ? 'A control and communication tool.'
        : isAccountRoot
          ? 'Master Briefing Board — every task, every project, unfiltered.'
          : 'Master Briefing Board — every layer below, up to '+_bbMasterRollupDepth()+' deep.';
    }
    // Sept 20 2026 -- _bbRenderTravelerName's own hideOrg check reads
    // _bbCurrentTopicIsRoot, which this function's caller (_bbRenderTopicField)
    // only just finished setting; _bbRenderTravelerName itself already ran
    // earlier in the same chrome refresh (with the PREVIOUS board's value),
    // so it's repainted again here, right where isMaster becomes current,
    // rather than reordering every call site above.
    _bbRenderTravelerName();
  }
  // Children of the current TOPIC, Sept 5 2026 -- same reserved-name
  // exclusion and sort order as the Idea Board's own
  // _sboardProjectHeaderChoices, just scoped to one Header's own
  // children (cluster_id = headerId) instead of the whole account's
  // top-level project roots. Queried live rather than off a cache --
  // briefing-board.js doesn't keep the Idea Board's account-wide
  // _sboardAllRowsById around, and this is only needed the moment the
  // caret is actually pressed.
  var BB_RESERVED_HEADER_NAMES = {'NEW':1,'New Additions':1,'Parking Lot':1,'COLLABORATOR':1,'STAKEHOLDER':1,'MISC':1,'Purpose':1,'Trash':1,'Archived':1};
  async function _bbTopicChildChoices(headerId){
    if(!headerId) return [];
    var sb=T().sb;
    try{
      var res=await sb.from('ideas').select('id,text_content,sort_order').eq('cluster_id',headerId).eq('content_type','header').order('sort_order',{ascending:true});
      if(res.error) return [];
      return (res.data||[]).filter(function(r){ return !BB_RESERVED_HEADER_NAMES[r.text_content]; });
    }catch(e){ return []; }
  }
  // TOPIC hierarchy menu, Sept 19 2026 -- Larry (ID Band redesign): "What
  // if click on TOPIC displays the hierarchy of headers for entire
  // project with highlight on current header in TOPIC position?" This
  // replaces TOPIC's separate down-arrow (children only) and up-arrow
  // (ancestors only, retired in place below) with one click on TOPIC
  // itself that shows the whole project tree at once: the project's root
  // header at the top, every header beneath it indented by depth, the
  // header currently in TOPIC highlighted. Click any row to jump there
  // (same jumpToTopic the old arrows used). Same ideas.cluster_id tree
  // and same reserved-name exclusion (Parking Lot, MISC, Trash...) the
  // arrows already read. Capped at 8 levels / 400 headers so a huge
  // account root (the Master board) can never lock the page up.
  async function _bbTopicTreeRows(){
    var curId=_bbCurrentTopicHeaderId;
    if(!curId) return [];
    // 1. Climb to this project's own root -- same stop rule as
    //    _bbTopicAncestorChoices: the root is the header whose parent
    //    has no parent of its own (that parent is the shared account
    //    root, not a real level of the project).
    var rootId=curId, guard=0;
    while(guard<50){
      guard++;
      var info=await _bbFetchHeaderInfo(rootId);
      if(!info || !info.clusterId) break;
      var parentInfo=await _bbFetchHeaderInfo(info.clusterId);
      if(!parentInfo || !parentInfo.clusterId) break;
      rootId=info.clusterId;
    }
    // 2. Walk down level by level, one batched query per level.
    var sb=T().sb;
    var rootInfo=await _bbFetchHeaderInfo(rootId);
    var nodes={}; nodes[rootId]={id:rootId, name:(rootInfo&&rootInfo.name)||'(untitled)', children:[]};
    var level=[rootId], depth=0, total=1;
    while(level.length && depth<8 && total<400){
      var res=await sb.from('ideas').select('id,text_content,cluster_id,sort_order').in('cluster_id',level).eq('content_type','header').order('sort_order',{ascending:true});
      if(res.error) break;
      var next=[];
      (res.data||[]).forEach(function(r){
        if(BB_RESERVED_HEADER_NAMES[r.text_content] || total>=400 || !nodes[r.cluster_id]) return;
        var n={id:r.id, name:r.text_content||'(untitled)', children:[]};
        nodes[r.id]=n; nodes[r.cluster_id].children.push(n); next.push(r.id); total++;
      });
      level=next; depth++;
    }
    // 3. Flatten depth-first, carrying each row's depth for indenting.
    var rows=[];
    (function walk(n,d){ rows.push({id:n.id,name:n.name,depth:d}); n.children.forEach(function(c){ walk(c,d+1); }); })(nodes[rootId],0);
    return rows;
  }
  // PROJECT PYRAMID, Sept 20 2026 -- Larry: the flat, fully-expanded
  // list _bbTopicTreeRows produced (still just above, left as-is and
  // no longer called) reads fine for one project but is overwhelming
  // once TOPIC is MASTER, since it flattens every project's whole tree
  // into one list at once. This climbs the same ideas.cluster_id chain
  // _bbTopicTreeRows already climbed, but feeds window.TopicPyramid
  // (topic-pyramid.js) instead -- ancestors above the current Topic,
  // and (lazily, one level at a time) descendants below, reusing
  // _bbFetchHeaderInfo's own memoized cache so re-opening the popup on
  // the same Topic costs no extra round trips.
  async function _bbPyramidAncestors(topicId){
    var chain=[], guard=0;
    var info=await _bbFetchHeaderInfo(topicId);
    var parentId=info?info.clusterId:null;
    while(parentId && guard<50){
      guard++;
      var pinfo=await _bbFetchHeaderInfo(parentId);
      if(!pinfo) break;
      chain.unshift({id:parentId, name:pinfo.name});
      parentId=pinfo.clusterId;
    }
    return chain;
  }
  function _bbWireTopicTree(){
    var trigger=document.getElementById('bb-topic-hit'), menu=document.getElementById('bb-topic-menu');
    if(!trigger || !menu) return;
    trigger.onclick=async function(e){
      e.stopPropagation();
      if(!_bbCurrentTopicHeaderId) return; // '(not linked)' -- nothing to show
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-topic-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      menu.innerHTML='<div class="bb-cdrop-row" style="cursor:default;opacity:.6">Loading…</div>';
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      _bbSyncMenuTheme(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(200,r.width)+'px';
      menu.hidden=false;
      var curInfo=await _bbFetchHeaderInfo(_bbCurrentTopicHeaderId);
      if(menu.hidden || !curInfo || !window.TopicPyramid) return; // closed again while this was in flight
      var ancestors=await _bbPyramidAncestors(_bbCurrentTopicHeaderId);
      if(menu.hidden) return;
      var curTopicId=_bbCurrentTopicHeaderId;
      var currentRow=window.TopicPyramid.render(menu, {
        ancestors:ancestors,
        current:{id:curTopicId, name:curInfo.name},
        getChildren:function(id){
          return _bbTopicChildChoices(id).then(function(rows){
            return rows.map(function(r){ return {id:r.id, name:r.text_content||'(untitled)'}; });
          });
        },
        onNavigate:function(id){
          menu.hidden=true;
          if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(id);
        }
      });
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
      if(currentRow && currentRow.scrollIntoView) currentRow.scrollIntoView({block:'center'});
    };
  }
  // Kept under its old name so briefing-board.js's existing wire-up call
  // keeps working without a matching edit there.
  function _bbWireTopicDropdown(){ _bbWireTopicTree(); }

  // TOPIC's up-arrow, Sept 6 2026 -- ascend counterpart to the descend
  // caret just above (_bbTopicChildChoices/_bbWireTopicDropdown), folding
  // in the "jump to any level above" job the retired Parent field used
  // to do (see the Sept 6 note on that field's old markup, above).
  // Deliberately walks the same ideas.cluster_id chain the descend caret
  // already reads -- the real project/idea tree, "exactly what PARENT
  // already means on the Idea Board" per the Sept 5 fix comment on
  // _bbRenderParentField -- rather than reusing _bbParentAncestorChoices
  // (the separate board_relations org-adoption chain that backed Parent's
  // own dropdown): Larry's own framing today ("the hierarchy is set when
  // a PROJECT is chosen") is squarely about the project tree, and TOPIC's
  // two arrows reading off one consistent data source, one direction
  // each, is worth more than folding in that rarer adoption case too.
  // Read-only while building the list (_bbFetchHeaderInfo never writes)
  // -- same discipline as _bbTopicChildChoices below: a board only ever
  // gets created for a specific ancestor if the traveler actually clicks
  // it (jumpToTopic), never just from opening this menu to look.
  //
  // Sept 6 2026, Larry (second note): "the up arrow never needs to go
  // above the actual project ... it simply addresses the parents in this
  // specific project" -- stops one step short of walking all the way to
  // the account-wide Idea Storyboards root every real project nests
  // under. A candidate ancestor is included right up through the
  // project's own root card (e.g. "Field Guide") but not one step
  // further: parentInfo.clusterId null means the candidate we're about
  // to add has no parent of its own, i.e. it IS that shared root, not a
  // real level of this project -- break before pushing it. Same
  // "Idea Storyboards doesn't surface as a destination anywhere anymore"
  // read as the PROJECT-dropdown and label changes elsewhere today.
  async function _bbTopicAncestorChoices(){
    var list=[];
    var curId=_bbCurrentTopicHeaderId;
    var guard=0;
    while(curId && guard<50){
      guard++;
      var info=await _bbFetchHeaderInfo(curId);
      if(!info || !info.clusterId) break;
      var parentInfo=await _bbFetchHeaderInfo(info.clusterId);
      if(!parentInfo || !parentInfo.clusterId) break;
      list.push({id:info.clusterId, name:parentInfo.name});
      curId=info.clusterId;
    }
    return list.reverse();
  }
  function _bbWireTopicAncestorDropdown(){
    var trigger=document.getElementById('bb-topic-caret-up'), menu=document.getElementById('bb-topic-ancestor-menu');
    if(!trigger || !menu) return;
    trigger.onclick=async function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-topic-ancestor-menu':null);
      if(!willOpen){ menu.hidden=true; return; }
      menu.innerHTML='<div class="bb-cdrop-row" style="cursor:default;opacity:.6">Loading…</div>';
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      _bbSyncMenuTheme(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(140,r.width)+'px';
      menu.hidden=false;
      var choices=await _bbTopicAncestorChoices();
      if(menu.hidden) return; // closed again while this was in flight
      menu.innerHTML='';
      if(!choices.length){
        var empty=document.createElement('div');
        empty.className='bb-cdrop-row';
        empty.style.cssText='cursor:default;opacity:.6';
        empty.textContent='Nothing above this.';
        menu.appendChild(empty);
      } else {
        choices.forEach(function(h){
          var row=document.createElement('div');
          row.className='bb-cdrop-row';
          row.textContent=h.name||'(untitled)';
          row.addEventListener('click', function(ev){
            ev.stopPropagation();
            menu.hidden=true;
            if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(h.id);
          });
          menu.appendChild(row);
        });
      }
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    };
  }

  // "Type of board" title, Sept 6 2026 -- Larry: "the type of board
  // should sit halfway between the TOPIC and arrow set and the LOGO."
  // Same measure-the-real-boxes approach as the Idea Board's own
  // (currently unused) _sboardPositionProjectMidwayToLogo -- a fixed
  // percentage drifts the moment TOPIC's text or Logo's own size changes
  // -- just reading bb-topic-cdrop's right edge and bb-logo-slot's left
  // edge instead of Name/Logo, and using bb-boardkind-wrap's own
  // left:50%+translateX(-50%) (see its CSS above) to center on that
  // midpoint instead of subtracting half its measured width by hand.
  // Must run after both TOPIC and Logo have rendered for real content
  // (see the call sites right after _bbRenderTopicField, below) --
  // reading either box any earlier measures last render's stale size.
  // Shrink-to-fit for the "Briefing Board"/"Idea"/"Plan"/etc label, Sept 13
  // 2026 (Master BB card, do-h: "Shrink text to fit Board Type between
  // TOPIC and Utility button") -- the Sept 9 fix below only ever clamped
  // the label's POSITION so its box couldn't overlap TOPIC's arrow or
  // Logo; it never touched the label's own font-size, so on a narrow
  // desktop window (TOPIC pushed wide, Logo pushed in) the fixed 42px
  // text could still visually crowd or touch its neighbors even while
  // "fitting" by the position clamp's math. Reuses the same
  // window.FGFitFontSize one-line shrink every other board title already
  // uses (text-fit.js) rather than inventing a second shrink mechanism.
  // Resets to the natural CSS size first so this never ratchets smaller
  // across repeated calls, then only shrinks -- never grows past what the
  // stylesheet already sets.
  function _bbFitBoardKindLabel(availableWidthPx){
    var trigger=document.getElementById('bb-boardkind-trigger');
    if(!trigger || !window.FGFitFontSize) return;
    trigger.style.fontSize='';
    if(!availableWidthPx || availableWidthPx<=0) return;
    var cs=getComputedStyle(trigger);
    var baseSize=parseFloat(cs.fontSize)||42;
    var fitted=window.FGFitFontSize(trigger.textContent, availableWidthPx, {
      base:baseSize, min:Math.max(14, Math.round(baseSize*0.4)), step:0.5,
      fontFamily:cs.fontFamily, fontWeight:cs.fontWeight, oneLine:true
    });
    if(fitted<baseSize) trigger.style.fontSize=fitted+'px';
  }
  // TOPIC's own shrink-to-fit, Sept 15 2026 -- Larry (Master BB session
  // with Bill): a long TOPIC title was cutting off with "..." instead of
  // shrinking. bb-topic-hit has a hard max-width and used only the
  // ellipsis fallback; this makes it actually shrink first, same shared
  // helper the Idea Board's own sc-topic-box now uses too (text-fit.js:
  // FGFitBoxTextOneLine). Called right after every hit.textContent write
  // above, in _bbRenderTopicField.
  function _bbFitTopicText(){
    var hit=document.getElementById('bb-topic-hit');
    if(hit && window.FGFitBoxTextOneLine) window.FGFitBoxTextOneLine(hit, hit);
  }
  // Shared gap between every link in the PROJECT-TOPIC-STORYBOARD-VIEW
  // chain below, Sept 15 2026 -- matches .bb-mhead-top's old grid
  // `gap:10px` (PROJECT to TOPIC), so TOPIC-to-STORYBOARD and
  // STORYBOARD-to-VIEW read as the identical distance -- Larry: "board
  // type field needs to be the same distance from the TOPIC as the
  // PROJECT field." One constant instead of three separately-typed
  // numbers so it can't drift apart a second time.
  var ID_BAND_GAP = 10;
  // ID Band row layout, Sept 15 2026 rewrite (renamed from
  // _bbPositionBoardKindMidway) -- Larry: "Move PROJECT - TOPIC -
  // STORYBOARD - VIEW to now center on the BB again." The old version
  // only ever placed Board Type at the midpoint between TOPIC and Logo,
  // with VIEW chasing along after it and PROJECT/TOPIC left pinned to
  // the grid's own flush-left edge (see briefing-board-styles.js for the
  // grid removal this replaces) -- nothing ever centered all four as one
  // group. This positions all four (now all position:absolute, same
  // file) as a single left-to-right chain, ID_BAND_GAP apart, then
  // centers that chain's total width on the header -- clamped so it
  // never runs under Logo/Utility/Close on the right or off the
  // container's own left edge, same "measure the real boxes, clamp
  // against a hard edge" shape every positioning fix in this file has
  // used since Sept 6.
  // Sept 16 2026 fix -- Larry, live-site, still jumbled after the Sept 15
  // member-name patch: PROJECT/TOPIC were still landing overlapped even
  // though the member-name race that patch targeted wasn't the only way
  // these boxes' widths change after this function's already run once.
  // Chasing each async cause one at a time (member name, board picker
  // text, font swap, logo load...) is exactly the whack-a-mole the Sept
  // 15 comments below already describe losing to -- a ResizeObserver on
  // the boxes whose CONTENT (not this function) can change their size
  // catches every future cause the same way, without knowing what it is.
  // boardkindWrap is deliberately NOT observed -- this function itself
  // resizes it (_bbFitBoardKindLabel), so observing it would just be
  // watching its own output; it's re-measured fresh on every pass
  // regardless. Set up once, lazily, the first time real elements exist.
  var _bbIdBandObserverSetUp=false;
  function _bbSetUpIdBandObserver(projectWrap, topicWrap, idnEl, actionsEl, container){
    if(_bbIdBandObserverSetUp || typeof ResizeObserver==='undefined') return;
    _bbIdBandObserverSetUp=true;
    var pending=false;
    var ro=new ResizeObserver(function(){
      if(pending) return;
      pending=true;
      requestAnimationFrame(function(){
        pending=false;
        try{
          var scr=document.getElementById('s-briefing-board');
          if(scr && scr.classList.contains('active')) _bbPositionIdBandRow();
        }catch(e){}
      });
    });
    [projectWrap, topicWrap, idnEl, actionsEl, container].forEach(function(el){ if(el) ro.observe(el); });
  }
  function _bbPositionIdBandRow(){
    var projectWrap=document.getElementById('bb-project-wrap');
    var topicWrap=document.getElementById('bb-topic-wrap');
    var boardkindWrap=document.getElementById('bb-boardkind-wrap');
    // Sept 19 2026 -- VIEW left this chain (now a head icon in the
    // upper-right actions row), and the top-left identity block (#bb-idn:
    // organization / logo / member name) joined it as something the chain
    // must never run underneath.
    var idnEl=document.getElementById('bb-idn');
    var actionsEl=document.querySelector('#s-briefing-board .bb-mhead-actions');
    var container=document.querySelector('#s-briefing-board .bb-mhead-top');
    if(!projectWrap || !topicWrap || !boardkindWrap || !actionsEl || !container) return;
    _bbSetUpIdBandObserver(projectWrap, topicWrap, idnEl, actionsEl, container);
    var containerRect=container.getBoundingClientRect();
    // Guard against a not-yet-laid-out screen -- nothing real to measure
    // yet, leave the left:0/top:0 CSS fallback in place.
    if(!containerRect.width) return;

    var pr=projectWrap.getBoundingClientRect();
    var tr=topicWrap.getBoundingClientRect();
    var ar=actionsEl.getBoundingClientRect();
    if(!pr.width || !tr.width) return;

    // Shrink Board Type's own label to whatever room is actually left
    // once Project, Topic, View, and the three gaps between all four are
    // accounted for -- same "measure the real boxes before fitting"
    // order the Sept 13 2026 version used, just budgeted against the
    // whole chain now instead of only the Topic-to-Logo gap. Floored at
    // 24px for the same reason as before: _bbFitBoardKindLabel treats
    // anything <=0 as "don't shrink," which is exactly the overflow this
    // exists to prevent.
    var available=containerRect.width-pr.width-tr.width-(ID_BAND_GAP*3);
    _bbFitBoardKindLabel(Math.max(24, available));

    var br=boardkindWrap.getBoundingClientRect();
    if(!br.width) return;

    var totalWidth=pr.width+ID_BAND_GAP+tr.width+ID_BAND_GAP+br.width;
    // Preferred: the whole chain centered on the header's real width
    // ("center on the BB"). Never let it run under Logo/Utility/Close
    // (actionsEl, already pinned to the header's own right edge) or off
    // the container's own left edge -- same min/max clamp shape the old
    // midpoint math used, just applied to the chain's total width.
    var rightLimit=ar.left-ID_BAND_GAP;
    // Never run under the top-left identity block (organization / logo /
    // member name) either -- on a wide window the centered chain sits far
    // to its right and this changes nothing; on a narrow one it nudges the
    // chain over instead of overlapping the name.
    var leftLimit=containerRect.left;
    if(idnEl){
      var idr=idnEl.getBoundingClientRect();
      if(idr.width) leftLimit=Math.max(leftLimit, idr.right+ID_BAND_GAP);
    }
    var preferredLeft=containerRect.left+(containerRect.width-totalWidth)/2;
    var groupLeft=Math.min(Math.max(preferredLeft, leftLimit), Math.max(leftLimit, rightLimit-totalWidth));

    var x=groupLeft;
    projectWrap.style.left=(x-containerRect.left)+'px'; x+=pr.width+ID_BAND_GAP;
    topicWrap.style.left=(x-containerRect.left)+'px'; x+=tr.width+ID_BAND_GAP;
    boardkindWrap.style.left=(x-containerRect.left)+'px';

    // Sept 6 2026, Larry: "lower Briefing Board on the BB ID band to
    // bottom-justify with the upper right corner buttons" -- unchanged
    // rule, now applied to PROJECT/STORYBOARD/VIEW so they share one
    // bottom edge with Logo/Utility/Close. actionsEl's real bottom edge
    // isn't a constant pixel value (Logo's eyebrow+frame stack is taller
    // than a plain bb-icon-btn), so this reads it live rather than
    // guessing.
    //
    // TOPIC is the one exception now, Sept 16 2026 (Larry, live-site
    // third look: TOPIC should center vertically on the band, PROJECT
    // should bottom-justify with the other buttons after all). This
    // flips the Sept 15 version of this same rule, which had PROJECT as
    // the lone center-vertical exception and TOPIC bottom-justifying
    // with STORYBOARD/VIEW -- swapped in place, same shape. The
    // traveler-name eyebrow that PROJECT's own center-justify used to
    // protect is no longer PROJECT's problem either way: it moved out to
    // its own fixed top-left-corner position Sept 16 (see the markup
    // comment on bb-traveler-name, briefing-board-screens.js), so it no
    // longer moves when PROJECT does.
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
  // Window resize, Sept 6 2026 -- mirrors the Idea Board's own resize
  // listener for the same reason (idea-storyboard-9710.js, near
  // _sboardPositionProjectMidwayToLogo): a real browser-window resize
  // changes TOPIC's and Logo's actual rendered positions, not just the
  // text-scale re-render screen-fit.js already handles. No-ops instantly
  // whenever the Briefing Board isn't the active screen.
  window.addEventListener('resize', function(){
    try{
      var scr=document.getElementById('s-briefing-board');
      if(scr && scr.classList.contains('active')) _bbPositionIdBandRow();
    }catch(e){}
  });
  // Font-load race, Sept 15 2026 -- root cause of "distances between
  // PROJECT/TOPIC/STORYBOARD/VIEW look right sometimes, wrong other
  // times, with no code change in between" (looked correct only right
  // after forcing a real browser resize). PROJECT/TOPIC/STORYBOARD/VIEW
  // all render in the Playfair Display head font (var(--bb-head-font)),
  // loaded from Google Fonts with display:swap (index.html's <link>) --
  // the very first paint shows a fallback system font, and
  // _bbPositionIdBandRow's very first call (right after board data
  // loads, above) usually lands before Playfair Display has actually
  // finished loading, so it measures every box's width in the WRONG
  // font. Nothing ever re-measured after the real font swapped in,
  // since only an actual window resize ever re-triggered this function
  // -- a plain page load, with no resize in between, kept the fallback-
  // font positions forever. document.fonts.ready fires once the swap
  // has genuinely happened (immediately, if it already had); this
  // re-runs the same position pass the resize listener above uses,
  // once, right when the real widths become known.
  if(window.document && document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      try{
        var scr=document.getElementById('s-briefing-board');
        if(scr && scr.classList.contains('active')) _bbPositionIdBandRow();
      }catch(e){}
    });
  }

  // Traveler name, Sept 5 2026 -- same shared member profile the Idea
  // board's own _sboardRenderMemberName reads (T().getMember(), backed
  // by the same t2t:member-loaded event), just filling in this board's
  // own eyebrow instead of that one's.
  // Sept 19 2026 (ID Band redesign, Larry): this now paints the whole
  // top-left identity block -- organization name (large), its logo (only
  // if one exists), and the member's own name (smaller) underneath --
  // from the member's profile via the shared member-identity.js, instead
  // of only the name. Name-only fallback kept for the moment before that
  // file has loaded.
  function _bbRenderTravelerName(){
    if(window.T2TMemberIdentity){
      // Sept 20 2026, Larry: "MASTER lists can have NO org as they include
      // all orgs associated with a member including a personal projects."
      // _bbCurrentTopicIsRoot (set by _bbRenderTopicField, just below) is
      // the same flag PROJECT/TOPIC already key MASTER's label off of, so
      // reusing it here keeps this in lockstep with wherever MASTER is
      // showing rather than tracking it separately.
      window.T2TMemberIdentity.fill({wrap:'bb-idn', org:'bb-idn-org', logo:'bb-idn-logo', name:'bb-traveler-name'}, {hideOrg:_bbCurrentTopicIsRoot});
      return;
    }
    var m=T().getMember && T().getMember();
    var el=document.getElementById('bb-traveler-name');
    if(el && m && m.display_name) el.textContent=m.display_name.toUpperCase();
  }

  async function _bbRenderRelations(){
    var body=document.getElementById('bb-relations-body'); if(!body) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board){ body.innerHTML='Open a board first.'; return; }
    var myUid=await _bbCurrentUserId();
    var rel=await _bbLoadRelationsFull(true);

    var parentRow=rel.filter(function(r){ return r.status==='approved' && r.child_board_id===board.id; })[0];
    var childRows=rel.filter(function(r){ return r.status==='approved' && r.parent_board_id===board.id; });
    // Every pending request touching ANY board this member owns, not
    // just the one open right now -- Larry: this should also work as
    // one place to see everything, not just a per-board popup.
    var allIncoming=rel.filter(function(r){
      if(r.status!=='pending') return false;
      if(r.child_owner_id===myUid && !r.child_approved_by) return true;
      if(r.parent_owner_id===myUid && !r.parent_approved_by) return true;
      return false;
    });
    var allOutgoing=rel.filter(function(r){ return r.status==='pending' && r.requested_by===myUid && allIncoming.indexOf(r)===-1; });

    var html='<div class="bb-links-empty" style="margin-bottom:10px">'+_esc(board.name||'This board')+' — '+_bbTypeLabel(board.board_type||'personal')+'</div>';

    html+='<div class="bb-field"><label>Parent</label>'
      +(parentRow ? '<div class="bb-cdrop-row active" style="cursor:default">'+_esc(_bbRelBoardLabel(parentRow.parent_board_name, parentRow.parent_board_type))+'</div>'
                  : '<div class="bb-links-empty">No parent yet.</div>')
      +'</div>';

    html+='<div class="bb-field"><label>Children ('+childRows.length+')</label>'
      +(childRows.length ? childRows.map(function(r){ return '<div class="bb-cdrop-row active" style="cursor:default">'+_esc(_bbRelBoardLabel(r.child_board_name, r.child_board_type))+'</div>'; }).join('')
                          : '<div class="bb-links-empty">None yet.</div>')
      +'</div>';

    if(allIncoming.length){
      html+='<div class="bb-field"><label>Waiting on you</label>'
        +allIncoming.map(function(r){
          var otherName=(r.child_owner_id===myUid) ? r.parent_board_name : r.child_board_name;
          var thisName=(r.child_owner_id===myUid) ? r.child_board_name : r.parent_board_name;
          return '<div class="bb-cdrop-row" style="cursor:default;display:flex;justify-content:space-between;align-items:center;gap:8px">'
            +'<span>'+_esc(otherName)+' → '+_esc(thisName)+'</span>'
            +'<span style="display:flex;gap:4px">'
              +'<button class="bb-icon-btn bb-icon-btn-add" data-relid="'+r.id+'" data-approve="1" title="Approve">✓</button>'
              +'<button class="bb-icon-btn bb-dotted-remove-btn" data-relid="'+r.id+'" data-approve="0" title="Decline">✕</button>'
            +'</span></div>';
        }).join('')
        +'</div>';
    }
    if(allOutgoing.length){
      html+='<div class="bb-field"><label>Waiting on them</label>'
        +allOutgoing.map(function(r){ return '<div class="bb-cdrop-row" style="cursor:default">'+_esc(r.child_board_name)+' → '+_esc(r.parent_board_name)+'</div>'; }).join('')
        +'</div>';
    }

    html+='<div class="bb-field"><label>Start a new relationship</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
        +'<select id="bb-rel-direction" style="flex:1;min-width:160px">'
          +'<option value="child">Adopt another board as a child of this one</option>'
          +'<option value="parent">Make this board a child of another</option>'
        +'</select>'
      +'</div>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
        +'<select id="bb-rel-source" style="flex:1;min-width:160px">'
          +'<option value="own">One of my own boards</option>'
          +'<option value="email">Someone else’s, by email</option>'
        +'</select>'
      +'</div>'
      +'<div id="bb-rel-own-row" style="margin-bottom:6px">'
        +'<select id="bb-rel-own-board" style="width:100%">'
          +_bbBoards.filter(function(b){ return b.id!==board.id; }).map(function(b){ return '<option value="'+b.id+'">'+_esc(_bbRelBoardLabel(b.name,b.board_type))+'</option>'; }).join('')
        +'</select>'
      +'</div>'
      +'<div id="bb-rel-email-row" style="display:none;margin-bottom:6px">'
        +'<div style="display:flex;gap:6px;margin-bottom:6px">'
          +'<input id="bb-rel-email" type="email" placeholder="Their email address" style="flex:1">'
          +'<button class="bb-icon-btn bb-icon-btn-add" id="bb-rel-email-search" title="Find their boards">🔍</button>'
        +'</div>'
        +'<select id="bb-rel-email-board" style="width:100%" disabled><option>Search an email first</option></select>'
      +'</div>'
      +'<button class="bb-flag-btn" id="bb-rel-submit" style="width:100%">Send Request</button>'
      +'<div id="bb-rel-msg" class="bb-links-empty" style="margin-top:6px"></div>'
    +'</div>';

    body.innerHTML=html;
    _bbWireRelationsForm(board);
    body.querySelectorAll('[data-relid]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var relId=btn.getAttribute('data-relid'), approve=btn.getAttribute('data-approve')==='1';
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('respond_board_adoption', {p_relation_id: relId, p_approve: approve});
          if(res.error){ window.alert(res.error.message||'Could not respond to that request.'); return; }
          await _bbLoadRelationsFull(true);
          await _bbRenderRelations();
          _bbRenderBoardPicker();
          _bbRenderParentField();
        }catch(e){ console.error('Briefing Board: could not respond to relationship request', e); window.alert('Could not respond to that request.'); }
      });
    });
  }

  function _bbWireRelationsForm(board){
    var sourceSel=document.getElementById('bb-rel-source');
    var ownRow=document.getElementById('bb-rel-own-row');
    var emailRow=document.getElementById('bb-rel-email-row');
    if(sourceSel) sourceSel.addEventListener('change', function(){
      var useEmail=sourceSel.value==='email';
      if(ownRow) ownRow.style.display=useEmail?'none':'';
      if(emailRow) emailRow.style.display=useEmail?'':'none';
    });
    var searchBtn=document.getElementById('bb-rel-email-search');
    if(searchBtn) searchBtn.addEventListener('click', async function(){
      var input=document.getElementById('bb-rel-email');
      var email=input?input.value.trim().toLowerCase():'';
      var sel=document.getElementById('bb-rel-email-board');
      var msg=document.getElementById('bb-rel-msg');
      if(!email || !sel) return;
      var sb=T().sb; if(!sb) return;
      try{
        var res=await sb.rpc('find_member_boards_by_email', {p_email: email});
        if(res.error || !res.data || !res.data.length){
          sel.innerHTML='<option>No boards found for that email</option>'; sel.disabled=true;
          if(msg) msg.textContent='No T2T member with an active board was found at that email.';
          return;
        }
        sel.innerHTML=res.data.map(function(r){ return '<option value="'+r.board_id+'">'+_esc(r.board_name)+' — '+_esc(_bbTypeLabel(r.board_type))+' ('+_esc(r.member_name)+')</option>'; }).join('');
        sel.disabled=false;
        if(msg) msg.textContent='';
      }catch(e){ console.error('Briefing Board: could not search for member boards', e); }
    });
    var submitBtn=document.getElementById('bb-rel-submit');
    if(submitBtn) submitBtn.addEventListener('click', async function(){
      var direction=document.getElementById('bb-rel-direction').value;
      var useEmail=document.getElementById('bb-rel-source').value==='email';
      var otherId=useEmail
        ? (document.getElementById('bb-rel-email-board')||{}).value
        : (document.getElementById('bb-rel-own-board')||{}).value;
      var msg=document.getElementById('bb-rel-msg');
      if(!otherId){ if(msg) msg.textContent='Pick a board first.'; return; }
      var childId = direction==='child' ? otherId : board.id;
      var parentId = direction==='child' ? board.id : otherId;
      var sb=T().sb; if(!sb) return;
      try{
        var res=await sb.rpc('request_board_adoption', {p_child_board_id: childId, p_parent_board_id: parentId, p_relation_label: 'project of'});
        if(res.error){ if(msg) msg.textContent=res.error.message||'Could not send that request.'; return; }
        if(msg) msg.textContent = (res.data && res.data.status==='approved') ? 'Connected.' : 'Request sent -- waiting on the other Owner.';
        await _bbLoadRelationsFull(true);
        await _bbRenderRelations();
        _bbRenderBoardPicker();
        _bbRenderParentField();
      }catch(e){ console.error('Briefing Board: could not request relationship', e); if(msg) msg.textContent='Could not send that request.'; }
    });
  }

  function openRelationsManager(){
    _bbRenderRelations();
    var ov=document.getElementById('bb-relations-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeRelationsManager(){
    var ov=document.getElementById('bb-relations-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireRelationsManager(){
    T().wire('bb-relations-close', closeRelationsManager);
    // bb-relations-btn (the standalone header icon) is gone, Aug 30 2026
    // -- Relationships is reached through Utility -> People now instead
    // (bb-open-relations, wired in _bbRenderSettingsScreen).
  }

  // Project Hub, Aug 16 2026 -- backs the PROJECT field's (-) button.
  // Reloads the approved-relations cache fresh (not the cached
  // _bbRelationsFullCache) so Move always sees the true current parent
  // even if something changed in another tab.
  var _bbProjectHubBoardId = null;
  async function _bbReloadRelationsCache(){
    var sb=T().sb; if(!sb) return;
    try{
      var relRes=await sb.from('board_relations').select('*').eq('status','approved');
      _bbRelationsCache=relRes.error?_bbRelationsCache:(relRes.data||[]);
    }catch(e){ console.error('Briefing Board: could not reload board relations', e); }
  }
  function openProjectHub(boardId){
    _bbProjectHubBoardId = boardId;
    var board=_bbBoards.filter(function(b){ return b.id===boardId; })[0];
    var label=document.getElementById('bb-hub-board-label');
    if(label) label.textContent = board ? ((board.name||'This project')+' — '+_bbTypeLabel(board.board_type||'personal')) : 'This project';
    var msg=document.getElementById('bb-hub-msg'); if(msg) msg.textContent='';
    var ov=document.getElementById('bb-project-hub-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeProjectHub(){
    var ov=document.getElementById('bb-project-hub-overlay'); if(ov) ov.classList.remove('active');
  }
  function wireProjectHub(){
    T().wire('bb-hub-close', closeProjectHub);
    T().wire('bb-hub-move-btn', async function(){
      var boardId=_bbProjectHubBoardId; if(!boardId) return;
      var msg=document.getElementById('bb-hub-msg');
      var parentRel=_bbRelationsCache.filter(function(r){ return r.child_board_id===boardId; })[0];
      if(parentRel){
        var sb=T().sb; if(!sb) return;
        try{
          var res=await sb.rpc('detach_board_relation', {p_relation_id: parentRel.id});
          if(res.error){ if(msg) msg.textContent=res.error.message||'Could not detach from the current parent.'; return; }
        }catch(e){ console.error('Briefing Board: could not detach board relation', e); if(msg) msg.textContent='Could not detach from the current parent.'; return; }
        await _bbReloadRelationsCache();
        _bbRelationsFullCache=null;
        _bbRenderBoardPicker();
        _bbRenderOrgName();
      }
      closeProjectHub();
      openRelationsManager();
    });
    T().wire('bb-hub-archive-btn', function(){
      var msg=document.getElementById('bb-hub-msg');
      if(msg) msg.textContent='Archiving a whole project isn\'t built yet -- for now you can archive individual cards inside it.';
    });
    T().wire('bb-hub-trash-btn', function(){
      var msg=document.getElementById('bb-hub-msg');
      if(msg) msg.textContent='Trashing a whole project isn\'t built yet -- for now you can trash individual cards inside it.';
    });
  }

  // Team Roster -- board-level roles (Owner/Leader/Facilitator/Member),
  // separate from the Sharing list above (Sharing is just "who can see
  // this board," Team Roster is "what's their role on it"). Owner is
  // never a board_members row -- it's implicit via briefing_boards.user_id
  // -- so it's read separately and shown first, non-editable except by
  // being who they are.
  var _bbRosterCache = [];
  var _bbRosterOwner = null;
  var _bbRosterIsOwner = false;
  var _bbRosterIsLeader = false; // Aug 13 2026, Larry: Owner-or-Leader can now manage the Cast too
  var _bbRosterCanManage = false; // = _bbRosterIsOwner || _bbRosterIsLeader
  var _bbAllMembersCache = null; // list_members_for_picker() results, fetched once per session
  async function _bbFetchAllMembers(){
    if(_bbAllMembersCache) return _bbAllMembersCache;
    var sb=T().sb; if(!sb) return [];
    try{
      var res=await sb.rpc('list_members_for_picker');
      _bbAllMembersCache = (!res.error && res.data) ? res.data : [];
    }catch(e){ _bbAllMembersCache=[]; }
    return _bbAllMembersCache;
  }
  function _bbRenderMemberSuggestions(query, targetId){
    var box=document.getElementById(targetId||'bb-team-add-suggest'); if(!box) return;
    var already={}; _bbAllRosterRows().forEach(function(r){ already[r.user_id]=true; });
    var q=String(query||'').trim().toLowerCase();
    // Board access is for T2T logins only (CAST Phase 2 people can be on
    // cards but can't be given board access until they join).
    var pool=(_bbAllMembersCache||[]).filter(function(m){ return !already[m.user_id] && m.is_member!==false; });
    var matches = q ? pool.filter(function(m){
      return (m.name||'').toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0;
    }) : pool;
    if(!matches.length){
      box.innerHTML='<div class="tm-add-suggest-empty">'+(pool.length?'No one matches that.':'Everyone\u2019s already in this Cast.')+'</div>';
    } else {
      box.innerHTML=matches.map(function(m){
        return '<div class="tm-add-suggest-row" data-email="'+_esc(m.email||'')+'">'
          +'<div class="tm-add-suggest-name">'+_esc(m.name||m.email||'')+'</div>'
          +'<div class="tm-add-suggest-email">'+_esc(m.email||'')+'</div>'
        +'</div>';
      }).join('');
    }
    box.style.display='block';
  }

  function _bbRoleSymbol(m){
    if(m.isOwner) return '\uD83D\uDC51';
    if(m.role==='sponsor') return '\uD83C\uDF31';
    if(m.role==='leader') return '\uD83C\uDFAF';
    if(m.is_facilitator) return '\uD83C\uDFA4';
    if(m.can_facilitate) return '\u2726';
    return '\u2610';
  }
  function _bbRoleTitle(m){
    if(m.isOwner) return 'Owner';
    if(m.role==='sponsor') return 'Sponsor';
    if(m.role==='leader') return 'Leader';
    if(m.is_facilitator) return 'Facilitator';
    if(m.can_facilitate) return 'Facilitator-qualified';
    return 'Cast Member';
  }

  async function _bbLoadRoster(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return;
    var uid=await _bbCurrentUserId();
    _bbRosterIsOwner = !!uid && board.user_id===uid;
    var sb=T().sb; if(!sb) return;
    try{
      var ownerRes=await sb.from('members').select('user_id,name,email,initials,phone').eq('user_id', board.user_id).maybeSingle();
      _bbRosterOwner = (!ownerRes.error && ownerRes.data) ? ownerRes.data : null;
    }catch(e){ _bbRosterOwner=null; }
    try{
      var res=await sb.rpc('list_board_members', {p_board_id: board.id});
      // View-only visitors (Aug 8 2026) aren't Team members -- they show
      // up in Sharing/Manage Access only, not in the role-based roster.
      _bbRosterCache = (!res.error && res.data) ? res.data.filter(function(m){ return (m.access_level||'edit')==='edit'; }) : [];
    }catch(e){ _bbRosterCache=[]; }
    // Owner-or-Leader (Aug 13 2026, Larry): a Leader can now add members
    // and change others' roles too, everywhere that ability exists --
    // Gear's Team screen and the VIEW dropdown's own add-row.
    _bbRosterIsLeader = !!uid && (_bbRosterCache||[]).some(function(m){ return String(m.user_id)===String(uid) && m.role==='leader'; });
    _bbRosterCanManage = _bbRosterIsOwner || _bbRosterIsLeader;
  }

  function _bbAllRosterRows(){
    var rows=[];
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(_bbRosterOwner) rows.push({user_id:_bbRosterOwner.user_id, name:_bbRosterOwner.name, email:_bbRosterOwner.email, phone:_bbRosterOwner.phone, isOwner:true, role:null, can_facilitate:true, is_facilitator:false, notes:(board&&board.owner_notes)||''});
    (_bbRosterCache||[]).forEach(function(m){ rows.push({user_id:m.user_id, name:m.name, email:m.email, phone:m.phone, isOwner:false, role:m.role, can_facilitate:m.can_facilitate, is_facilitator:m.is_facilitator, notes:m.notes||''}); });
    return rows;
  }

  function _bbRenderRoster(){
    var wrap=document.getElementById('bb-team-list-view'); if(!wrap) return;
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var nameEl=document.getElementById('bb-team-groupname');
    if(nameEl){ nameEl.value=(board && (board.topic||board.name))||''; nameEl.disabled=!_bbRosterIsOwner; }
    var rows=_bbAllRosterRows();
    wrap.innerHTML = rows.map(function(m){
      var clickable = (!m.isOwner && _bbRosterCanManage);
      var panel = (!m.isOwner) ? (
        '<div class="tm-rolepanel" id="tm-rp-'+_esc(m.user_id)+'" style="display:none">'
          +'<label><input type="radio" name="tm-sp" class="tm-r-sponsor" data-uid="'+_esc(m.user_id)+'"'+(m.role==='sponsor'?' checked':'')+'> \uD83C\uDF31 Sponsor</label>'
          +'<label><input type="radio" name="tm-tl" class="tm-r-leader" data-uid="'+_esc(m.user_id)+'"'+(m.role==='leader'?' checked':'')+'> \uD83C\uDFAF Leader</label>'
          +'<label><input type="checkbox" class="tm-r-canfac" data-uid="'+_esc(m.user_id)+'"'+(m.can_facilitate?' checked':'')+'> \u2726 Facilitator-qualified</label>'
          +'<label><input type="radio" name="tm-fac" class="tm-r-fac" data-uid="'+_esc(m.user_id)+'"'+(m.is_facilitator?' checked':'')+'> \uD83C\uDFA4 Facilitator</label>'
        +'</div>'
      ) : '';
      var contactLine, notesLine;
      if(m.isOwner){
        contactLine = '<div class="tm-contact">\u2709 '+_esc(m.email||'')+' &nbsp;&nbsp; \u260E <input type="text" class="tm-phone-input tm-owner-phone" placeholder="Add phone" value="'+_esc(m.phone||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input tm-owner-notes" placeholder="\u2014" value="'+_esc(m.notes||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
      } else {
        var phoneLine = m.phone ? (' &nbsp;&nbsp; \u260E '+_esc(m.phone)) : '';
        contactLine = '<div class="tm-contact">\u2709 '+_esc(m.email||'')+phoneLine+'</div>';
        notesLine = '<div class="tm-notes-row"><span class="tm-notes-lbl">NOTES:</span><input type="text" class="tm-notes-input" data-uid="'+_esc(m.user_id)+'" placeholder="\u2014" value="'+_esc(m.notes||'')+'" '+(_bbRosterIsOwner?'':'disabled')+'></div>';
      }
      return '<div class="tm-row">'
        +'<div class="tm-sym'+(clickable?' tm-clickable':'')+'" '+(clickable?'data-uid="'+_esc(m.user_id)+'"':'')+'>'+_bbRoleSymbol(m)+'</div>'
        +'<div class="tm-body">'
          +'<div class="tm-name">'+_esc(m.name||m.email||'')+' <span class="tm-role">&middot; '+_bbRoleTitle(m)+'</span></div>'
          +contactLine
          +notesLine
          +panel
        +'</div>'
      +'</div>';
    }).join('');
    var addTile=document.getElementById('bb-team-add');
    if(addTile) addTile.style.display = _bbRosterCanManage ? 'flex' : 'none';
  }

  async function _bbSaveMemberRole(uid, role, canFac, isFac){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
    var sb=T().sb; if(!sb) return;
    try{ await sb.rpc('update_board_member', {p_board_id: board.id, p_user_id: uid, p_role: role, p_can_facilitate: canFac, p_is_facilitator: isFac}); }catch(e){}
    await _bbLoadRoster(); _bbRenderRoster();
  }

  async function _bbSaveMemberNotes(uid, notes){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
    var sb=T().sb; if(!sb) return;
    try{ await sb.rpc('update_board_member_notes', {p_board_id: board.id, p_user_id: uid, p_notes: notes}); }catch(e){}
  }

  async function _bbSaveOwnerNotes(notes){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board || !_bbRosterIsOwner) return;
    var sb=T().sb; if(!sb) return;
    board.owner_notes=notes;
    try{ await sb.from('briefing_boards').update({owner_notes: notes}).eq('id', board.id); }catch(e){}
  }

  async function _bbSaveOwnerPhone(phone){
    if(!_bbRosterIsOwner) return;
    var sb=T().sb; if(!sb) return;
    if(_bbRosterOwner) _bbRosterOwner.phone=phone;
    try{ await sb.rpc('update_board_owner_contact', {p_phone: phone}); }catch(e){}
  }

  async function _bbTeamAddMember(email){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return {ok:false,msg:'No board selected.'};
    var rows=_bbAllRosterRows();
    var cap=board.member_cap||7;
    if(rows.length>=cap) return {ok:false,msg:'This board is at its '+cap+'-person cap.'};
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await sb.rpc('find_member_by_email', {p_email: String(email||'').trim().toLowerCase()});
      var match=(!res.error && res.data && res.data.length) ? res.data[0] : null;
      if(!match) return {ok:false,msg:'No T2T member found with that email.'};
      var myUid=await _bbCurrentUserId();
      var ins=await sb.from('board_members').insert({board_id: board.id, user_id: match.user_id, added_by: myUid, access_level: 'edit'});
      if(ins.error) return {ok:false,msg:ins.error.message||'Could not add them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not add them.'}; }
  }

  async function _bbTeamRemoveMember(uid){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board) return {ok:false,msg:'No board selected.'};
    if(String(uid)===String(board.user_id)) return {ok:false,msg:'The Owner can\'t be removed.'};
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var del=await sb.from('board_members').delete().eq('board_id', board.id).eq('user_id', uid);
      if(del.error) return {ok:false,msg:del.error.message||'Could not remove them.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not remove them.'}; }
  }

  function openTeamRoster(){
    _bbLoadRoster().then(_bbRenderRoster);
    var ov=document.getElementById('bb-team-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }
  function closeTeamRoster(){
    var ov=document.getElementById('bb-team-overlay'); if(ov) ov.classList.remove('active');
    var addRow=document.getElementById('bb-team-add-row'); if(addRow) addRow.style.display='none';
    var errEl=document.getElementById('bb-team-error'); if(errEl) errEl.style.display='none';
    var sugg=document.getElementById('bb-team-add-suggest'); if(sugg) sugg.style.display='none';
    _bbOpenSettingsAt('people');
  }

  async function _bbConfirmAddMember(email){
    var input=document.getElementById('bb-team-add-email');
    var errEl=document.getElementById('bb-team-error');
    var sugg=document.getElementById('bb-team-add-suggest');
    if(!email) return;
    var res=await _bbTeamAddMember(email);
    if(!res.ok){
      if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; }
      return;
    }
    if(errEl) errEl.style.display='none';
    if(input) input.value='';
    if(sugg) sugg.style.display='none';
    var row=document.getElementById('bb-team-add-row'); if(row) row.style.display='none';
    await _bbLoadRoster(); _bbRenderRoster();
  }

  function wireTeamRoster(){
    T().wire('bb-team-close', closeTeamRoster);
    T().wire('bb-team-print', function(){ window.print(); });
    T().wire('bb-team-add', function(){
      if(!_bbRosterCanManage) return;
      var row=document.getElementById('bb-team-add-row');
      var opening = row && row.style.display==='none';
      if(row) row.style.display = opening ? 'flex' : 'none';
      if(opening){
        _bbFetchAllMembers().then(function(){ _bbRenderMemberSuggestions(''); });
      } else {
        var sugg=document.getElementById('bb-team-add-suggest'); if(sugg) sugg.style.display='none';
      }
    });
    var emailInput=document.getElementById('bb-team-add-email');
    if(emailInput){
      emailInput.addEventListener('input', function(){ _bbRenderMemberSuggestions(emailInput.value); });
      emailInput.addEventListener('focus', function(){ _bbRenderMemberSuggestions(emailInput.value); });
    }
    var suggBox=document.getElementById('bb-team-add-suggest');
    if(suggBox){
      suggBox.addEventListener('click', function(e){
        var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
        _bbConfirmAddMember(row.getAttribute('data-email'));
      });
    }
    var confirmBtn=document.getElementById('bb-team-add-confirm');
    if(confirmBtn) confirmBtn.addEventListener('click', async function(){
      var input=document.getElementById('bb-team-add-email');
      var email=input?input.value.trim():'';
      await _bbConfirmAddMember(email);
    });
    var nameEl=document.getElementById('bb-team-groupname');
    if(nameEl) nameEl.addEventListener('change', async function(){
      if(!_bbRosterIsOwner) return;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0]; if(!board) return;
      var sb=T().sb; if(!sb) return;
      board.topic=nameEl.value;
      try{ await sb.from('briefing_boards').update({topic: nameEl.value}).eq('id', board.id); }catch(e){}
    });
    var wrap=document.getElementById('bb-team-list-view');
    if(wrap){
      wrap.addEventListener('click', function(e){
        var sym=e.target.closest('.tm-clickable'); if(!sym) return;
        var p=document.getElementById('tm-rp-'+sym.getAttribute('data-uid'));
        if(p) p.style.display = (p.style.display==='none') ? 'block' : 'none';
      });
      wrap.addEventListener('change', async function(e){
        var t=e.target;
        if(t.classList.contains('tm-r-sponsor') || t.classList.contains('tm-r-leader') || t.classList.contains('tm-r-canfac') || t.classList.contains('tm-r-fac')){
          var uid=t.getAttribute('data-uid');
          var panel=document.getElementById('tm-rp-'+uid); if(!panel) return;
          if(t.classList.contains('tm-r-sponsor') && t.checked){ panel.querySelector('.tm-r-leader').checked=false; }
          if(t.classList.contains('tm-r-leader') && t.checked){ panel.querySelector('.tm-r-sponsor').checked=false; }
          var role = panel.querySelector('.tm-r-sponsor').checked ? 'sponsor' : (panel.querySelector('.tm-r-leader').checked ? 'leader' : null);
          var canFac = panel.querySelector('.tm-r-canfac').checked;
          var isFac = panel.querySelector('.tm-r-fac').checked;
          await _bbSaveMemberRole(uid, role, canFac, isFac);
        } else if(t.classList.contains('tm-owner-notes')){
          await _bbSaveOwnerNotes(t.value);
        } else if(t.classList.contains('tm-owner-phone')){
          await _bbSaveOwnerPhone(t.value);
        } else if(t.classList.contains('tm-notes-input')){
          await _bbSaveMemberNotes(t.getAttribute('data-uid'), t.value);
        }
      });
    }
  }

  // Rename, Aug 3 2026 -- Larry: "How can a traveler edit the name of
  // the Briefing Board?" There wasn't a way; the only place a name ever
  // got typed in was "+ Add a board...". Originally a small pencil
  // button next to NAME; Aug 13 2026 (Larry, "exactly like the Idea
  // Board"): the pencil is gone, double-click the Title trigger instead
  // -- same rename-in-place result, same interaction as the Idea
  // Board's own Title (see wireTopicBar's dblclick wiring below).
  async function _bbRenameCurrentBoard(){
    var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    if(!board){ window.alert('No board is open yet -- nothing to rename.'); return; }
    var newName=window.prompt('Rename this board:', board.name||'');
    if(newName===null) return;
    newName=newName.trim();
    if(!newName || newName===board.name) return;
    var sb=T().sb;
    try{
      var res=await sb.from('briefing_boards').update({name:newName}).eq('id', board.id).select().single();
      if(res.error){
        console.error('Briefing Board: could not rename board', res.error);
        window.alert('Could not rename the board. Error: '+(res.error.message||'unknown error')+'. Nothing was saved -- please try again.');
        return;
      }
      board.name = newName;
      _bbRenderBoardPicker();
    }catch(e){
      console.error('Briefing Board: could not rename board', e);
      window.alert('Could not rename the board. Error: '+(e&&e.message?e.message:String(e))+'. Nothing was saved -- please try again.');
    }
  }

  // Board-kind dropdown mirrored onto the Briefing Board's own top-center
  // label, Aug 30 2026 -- Larry: "the top center of the Briefing Board
  // could be the dropdown to return to one of the other boards." Closes
  // the loop the Idea board's own dropdown started (see
  // idea-storyboard-9710.js's _sboardWireBoardKindDropdown -- same fixed-
  // menu approach, deliberately not built on _bbRenderDropdown since
  // there's nothing to add here). IDEA/PLAN jump to whichever Idea
  // project this specific Briefing Board is linked to
  // (briefing_boards.storyboard_project_id -- null for a personal/org
  // board that was never tied to one, in which case those two just toast
  // instead of erroring). CAST opens this file's own Team roster popup,
  // the exact same one Utility -> Cast already opens -- one roster, not
  // a second entry point to a different one. SHARE is still a stub, same
  // wording as the Idea board's. BRIEFING BOARD is a no-op re-pick,
  // matching IDEA's own behavior when re-picked on its own board. Wired
  // once (wireTopicBar) since the menu itself never changes -- every
  // handler reads _bbBoards/_bbCurrentBoardId fresh at click time, not
  // at wire time, so it's always accurate even after switching boards.
  // Sept 15 2026 -- Larry renamed the STORYBOARD options everywhere on
  // screen: BRIEFING BOARD -> TASKS, CAST -> ROLES (display label only,
  // same reasoning as idea-storyboard-navigation.js's own copy of this
  // list -- value stays the internal name every handler below keys off).
  // Sept 19 2026 -- Larry: change it back to BRIEFING. Kept in sync with
  // idea-storyboard-navigation.js's copy of this same list.
  // Sept 23 2026 -- Larry: "change Roles to Cast on storyboard dropdown."
  // ROLES -> CAST, matching the locked name for the one list of people.
  var _bbBoardKinds=[
    {value:'IDEA', label:'IDEAS'},
    {value:'PLAN', label:'PLAN'},
    {value:'BRIEFING BOARD', label:'BRIEFING'},
    {value:'SHARE', label:'SHARE'},
    {value:'CAST', label:'CAST'}
  ];
  function _bbWireBoardKindDropdown(){
    var trigger=document.getElementById('bb-boardkind-trigger'), menu=document.getElementById('bb-boardkind-menu');
    if(!trigger || !menu) return;
    menu.innerHTML='';
    _bbBoardKinds.forEach(function(k){
      var row=document.createElement('div');
      row.className='bb-cdrop-row'+(k.value==='BRIEFING BOARD' ? ' active' : '');
      row.textContent=k.label;
      row.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        if(k.value==='BRIEFING BOARD') return;
        if(k.value==='CAST'){ openTeamRoster(); return; }
        if(k.value==='SHARE'){ _bbShowToast('Share Storyboard coming soon'); return; }
        if(k.value==='IDEA' || k.value==='PLAN'){
          var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
          // Sept 8 2026 fix -- one-board model, same reasoning as
          // _bbRenderTopicField (line ~6387): board.storyboard_project_id
          // is always the account root now, so in single-board mode this
          // must read whichever project is actually being viewed right
          // now (_bbProjectFilter()) instead of the fixed board-row value,
          // or IDEA/PLAN always dropped you back at the root project
          // regardless of which header's Briefing Board you were on.
          var projectId=_bbSingleBoardMode() ? (_bbProjectFilter() || _bbIdeaStoryboardsRootId) : (board && board.storyboard_project_id);
          if(!projectId){ _bbShowToast('This board isn’t linked to a project.'); return; }
          IDBand.recordReturn('BRIEFING BOARD', projectId);
          if(window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind){
            window.T2TStoryboard.jumpToProjectKind(projectId, k.value);
          }
          return;
        }
      });
      menu.appendChild(row);
    });
    if(menu.parentElement!==document.body) document.body.appendChild(menu);
    _bbSyncMenuTheme(menu);
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-boardkind-menu':null);
      if(willOpen){
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
    // bb-boardkind-caret, Sept 15 2026 -- same forward-to-trigger pattern
    // as bb-project-caret above: no independent behavior, just widens the
    // click target now that STORYBOARD has a visible arrow of its own.
    var kindCaret=document.getElementById('bb-boardkind-caret');
    if(kindCaret) kindCaret.onclick=function(e){
      e.stopPropagation();
      trigger.click();
    };
  }

  // VIEW dropdown, rebuilt Sept 13 2026 (Master BB card, do-m -- see the
  // HTML comment on bb-view-wrap in briefing-board-screens.js for the
  // full "why"). Reads/writes the exact same filter state the Cast
  // popup's checkboxes already write (_bbPersonFilterIds / _bbSourceFilter
  // / _bbRecomputeFilterMatches, briefing-board-master.js) -- checking a
  // name here is exactly like checking that same box in Cast.
  //
  // Sept 14 2026, Larry: two problems with the single-select version
  // this replaces. (1) It only ever listed board members (_bbAllRosterRows,
  // sourced from board sharing/access) -- someone cast onto a task
  // through a card's own 👥 Cast popup without also being added to the
  // board's roster never showed up as a name to pick, even though they
  // plainly have a task "on that level." (2) It could only hold one
  // person at a time, forcing anyone who wanted two people's cards
  // together to go find the Cast popup instead. Fixed both: the list now
  // comes from _bbAssignedRosterRows (roster, plus anyone with an actual
  // card_roles row on a card visible at this level -- see that function
  // below), and every row gets a real checkbox wired to the same
  // _bbCastFilterChange the Cast popup uses, so multiple people can be
  // checked at once straight from VIEW.
  //
  // _bbViewMenuRowsCache holds whatever name list the menu was last built
  // from, so the trigger label can resolve an assigned-only person's name
  // too (_bbAllRosterRows alone wouldn't know them).
  var _bbViewMenuRowsCache = [];
  // Sept 19 2026 (ID Band redesign): VIEW is a single head-icon button now
  // (Larry: "Turn VIEW into a single head icon button"), so there is no
  // text left to relabel. Instead it lights up (.bb-view-on) whenever a
  // person filter is applied, and its hover title spells out who is being
  // shown ("View: everyone" / "View: Bill Fritsch" / "View: 3 people"),
  // which is exactly what the old "All" / name / "N people" label said.
  function _bbSyncViewTriggerLabel(){
    var trigger=document.getElementById('bb-view-trigger');
    if(!trigger) return;
    var ids=_bbPersonFilterIds||[];
    trigger.classList.toggle('bb-view-on', ids.length>0);
    var label;
    if(!ids.length){
      // (Sept 14 2026: unfiltered state is "everyone", never "Team" --
      // Team is now a distinct role, idea-storyboard-people.js.)
      label='everyone';
    } else {
      var pool=(_bbViewMenuRowsCache&&_bbViewMenuRowsCache.length)?_bbViewMenuRowsCache:_bbAllRosterRows();
      var row=ids.length===1 ? pool.filter(function(m){ return String(m.user_id)===String(ids[0]); })[0] : null;
      label=ids.length===1 ? ((row&&(row.name||row.email))||'1 person') : ids.length+' people';
    }
    trigger.title='View: '+label;
    trigger.setAttribute('aria-label','View — showing '+label);
  }
  // Everyone selectable from VIEW at this level: the board roster
  // (_bbAllRosterRows) plus anyone who has an actual card_roles row on a
  // card _bbLevelCards() says is visible here right now but who never got
  // added to the board's own roster/sharing list. Merged and de-duped by
  // user_id; roster wins when someone's in both (it already has their
  // name/email/phone on file).
  async function _bbAssignedRosterRows(){
    var rows=_bbAllRosterRows().slice();
    var sb=T().sb; if(!sb || typeof _bbLevelCards!=='function') return rows;
    var have={}; rows.forEach(function(r){ have[String(r.user_id)]=true; });
    var ids=_bbLevelCards().map(function(c){ return c.id; }).filter(Boolean);
    if(!ids.length) return rows;
    try{
      var res=await sb.from('card_roles').select('user_id').eq('card_type','briefing_card').in('card_id', ids);
      var seen={}, extraIds=[];
      (res.data||[]).forEach(function(r){
        var uid=String(r.user_id);
        if(have[uid] || seen[uid]) return;
        seen[uid]=true; extraIds.push(uid);
      });
      if(!extraIds.length) return rows;
      var pool=await _bbFetchAllMembers();
      extraIds.forEach(function(uid){
        var m=(pool||[]).filter(function(p){ return String(p.user_id)===uid; })[0];
        rows.push({user_id:uid, name:m?(m.name||m.email):null, email:m?(m.email||''):'', phone:m?(m.phone||''):'', isOwner:false, role:null, can_facilitate:false, is_facilitator:false, notes:'', assignedOnly:true});
      });
      return rows;
    }catch(e){ return rows; }
  }
  function _bbWireViewDropdown(){
    var trigger=document.getElementById('bb-view-trigger'), caret=document.getElementById('bb-view-caret'), menu=document.getElementById('bb-view-menu');
    if(!trigger || !menu) return;
    async function openMenu(){
      await _bbLoadRoster();
      var rows=await _bbAssignedRosterRows();
      _bbViewMenuRowsCache=rows;
      menu.innerHTML='';
      var teamRow=document.createElement('div');
      teamRow.className='bb-cdrop-row'+((!_bbPersonFilterIds || !_bbPersonFilterIds.length) ? ' active' : '');
      teamRow.textContent='All';
      teamRow.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden=true;
        // In-place clear (.length=0), not a reassignment -- shared with
        // the Idea/Plan Storyboard's own name for this same array (Sept
        // 20 2026 unification, briefing-board-master.js) -- a plain
        // "=[]" would swap this LOCAL name onto a new array and quietly
        // break the sync.
        _bbPersonFilterIds.length=0;
        _bbPersistViewFilter();
        _bbSourceFilter=null;
        _bbSyncViewTriggerLabel();
        _bbRecomputeFilterMatches().then(renderBoard);
      });
      menu.appendChild(teamRow);
      rows.forEach(function(m){
        var checked=_bbPersonFilterIds && _bbPersonFilterIds.indexOf(String(m.user_id))>=0;
        var row=document.createElement('label');
        row.className='bb-cdrop-row bb-view-person-row';
        // "• task only" tag dropped, Sept 20 2026 (Larry, Master BB:
        // "list only the names... Call Sheet can ID roles and contact
        // info") -- VIEW just needs a name to check, not a status label;
        // anyone in this list already has a real task at this level
        // (that's how _bbAssignedRosterRows put them here), and the Call
        // Sheet (👥) is the one place that spells out roles/contact
        // detail. m.assignedOnly itself is untouched -- still exactly
        // how this list decides who to include, just no longer shown.
        row.innerHTML='<input type="checkbox" class="bb-view-person-chk"'+(checked?' checked':'')+'> <span>'+_esc(m.name||m.email||'(unnamed)')+'</span>';
        var chk=row.querySelector('input');
        chk.addEventListener('change', function(){
          _bbCastFilterChange(m.user_id, chk.checked);
          teamRow.className='bb-cdrop-row'+((!_bbPersonFilterIds || !_bbPersonFilterIds.length) ? ' active' : '');
        });
        row.addEventListener('click', function(e){ e.stopPropagation(); });
        menu.appendChild(row);
      });
      if(menu.parentElement!==document.body) document.body.appendChild(menu);
      _bbSyncMenuTheme(menu);
      var r=trigger.getBoundingClientRect();
      menu.style.left=r.left+'px';
      menu.style.top=(r.bottom+4)+'px';
      menu.style.minWidth=Math.max(120,r.width)+'px';
      menu.hidden=false;
      var mr=menu.getBoundingClientRect();
      if(mr.right>window.innerWidth-8) menu.style.left=Math.max(8,window.innerWidth-8-mr.width)+'px';
    }
    function toggle(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _bbCloseAllDropdowns(willOpen?'bb-view-menu':null);
      if(willOpen) openMenu(); else menu.hidden=true;
    }
    trigger.onclick=toggle;
    if(caret) caret.onclick=toggle;
  }

  // CAST PICK list moved to cast-pick-list.js, Sept 23 2026 (project-level
  // Cast). Same shared page scope -- _bbOpenCastPickMenu is still called
  // by its plain name from every file that used it.

  function wireTopicBar(){
    // Type/Title dropdowns wire themselves fresh on every render now
    // (Aug 13 2026 -- see _bbRenderDropdown), no separate wire step.
    // Title's double-click-to-rename is wired once here instead, same
    // as the Idea Board's own Title trigger -- the button element
    // itself is never replaced across renders, only its text/menu.
    var boardTrigger=document.getElementById('bb-board-trigger');
    if(boardTrigger) boardTrigger.addEventListener('dblclick', function(e){
      e.stopPropagation();
      _bbRenameCurrentBoard();
    });
    // Organization's Name click-to-edit is wired fresh on every render
    // in _bbRenderOrgName() itself (bb-org-name-trigger.onclick), same
    // pattern as the Type dropdown -- nothing to wire once here anymore.
    T().wire('bb-close-x', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    // bb-hx-btn (the standalone header icon) is gone, Aug 30 2026 --
    // History now opens from Utility instead (bb-settings-go-history).
    T().wire('bb-hx-close', closeHX);
    T().wire('bb-hx-archive-btn', function(){ closeHX(); openArchive(); });
    T().wire('bb-hx-briefinglog-btn', function(){ closeHX(); openBriefingLog(); });
    T().wire('bb-archive-close', closeArchive);
    T().wire('bb-archive-back', function(){ closeArchive(); openHX(); });
    T().wire('bb-briefinglog-close', closeBriefingLog);
    T().wire('bb-briefinglog-back', function(){ closeBriefingLog(); openHX(); });
    T().wire('bb-gear', openSettings);
    T().wire('bb-return', function(){
      if(!IDBand.jumpToRecorded()) _bbShowToast('Nothing to return to yet');
    });
    // Double-click the board's own background (not a card) opens the same
    // Board Settings the gear does -- Color Theme is the first field in that
    // panel, so this is BB's version of the traveler color-options shortcut
    // locked July 27, 2026 (matches the Storyboard/Session board-background
    // double-click, which opens its own bg picker the same way).
    var bbBoardWrapEl=document.getElementById('bb-board-wrap');
    if(bbBoardWrapEl) bbBoardWrapEl.addEventListener('dblclick', function(e){
      if(e.target.closest('.bb-card')) return;
      openSettings();
    });
    T().wire('bb-settings-close', function(){
      if(_bbSettingsScreen==='home') closeSettings();
      else _bbRenderSettingsScreen('home');
    });
  }
