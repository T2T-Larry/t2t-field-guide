/* ============================================================
   cast-roster.js -- T2T Field Guide -- CAST ROSTER (Pyramid + people)

   Added Sept 23 2026. Larry: "I envision the Cast Roster as The
   Project Pyramid with the current TOPIC level open to all team
   members and anyone with permission, the same permissions that a
   person has for viewing or editing projects." Printing: "more like an
   Organization Chart with roles and titles, reserving the call sheet
   for contact info." Titles are per level (Larry: "per level") -- the
   same person can hold a different title on each level.

   Round 2, same day. Larry: "What if we number the primary projects?
   There is a potential for biting off more than one can chew. Might
   this also be where we identify project priorities? ... this view
   points out where no one has the responsibility yet? Should we be
   able to modify the Cast here with edit and (+)?" Then: "I like both
   numbers and HML priorities ... I like the 5 amber ... This number
   and priority system should be across all usages." So:
     - H/M/L priority (the cards' own six steps, HH..L) on every level,
       levels listed highest priority first (T2TPriority, topic-pyramid.js)
     - the number beside a person = how many projects they're PRIMARY
       on, amber at 5+ (T2TLoad, cast-pick-list.js)
     - a level with no PRIMARY says so, in amber, and the top of the
       screen counts them
     - (+) adds someone to a level; tapping a person changes their role
       or removes them -- only for people who can edit that project

   What it shows (same shape and size gradient as topic-pyramid.js):
     - the straight line of levels above the current TOPIC (collapsed)
     - the current TOPIC, highlighted, with its whole team open
     - the levels below, doll-in-doll: direct children show first,
       each with its own arrow to open its own children
   Every level row: tap its name to open/close that level's people;
   the arrow after it opens the levels beneath.

   Opened by the STORYBOARD dropdown's CAST choice on BOTH boards
   (idea-storyboard-navigation.js and briefing-board-master-nav.js).

   Data (Supabase): cast_roster_tree, set_level_title, set_level_role,
   set_level_priority, primary_load. Viewing follows the project's own
   view rule; every change follows the project's own "manage Cast"
   rule -- no separate permission system. Making someone PRIMARY goes
   through the boards' existing PRIMARY hand-off
   (T2TStoryboard.assignPrimaryDirect) so the old PRIMARY stays on as a
   🔑 Key Stakeholder and the chain above is added, same as everywhere.

   Round 3, same day. Larry: "If no one has been assigned, isn't the
   PRIMARY person from the next higher level the automatic PRIMARY on
   the level below until he or she changes that?" Yes -- the boards'
   own rule. An empty level now shows that inherited PRIMARY ("↑ Name",
   lighter) instead of a warning. "I really like the triangle with the
   ! in it" -- ⚠ now means "needs a decision": a level with people but
   no PRIMARY picked, the top of a branch nobody owns, or a person at
   capacity. The count at the top is tappable and opens those levels.
   One shared lookup decides all of it (public.primary_status, via
   T2TPrimaryStatus in topic-pyramid.js) so this screen and every
   Pyramid agree.

   Solo rule, same day: the first person added to an empty level is its
   PRIMARY (the boards' existing rule), and a level's only person shows
   as PRIMARY.

   Self-contained (own IIFE, own styles). Uses window.T2T.sb,
   T2TPriority, T2TLoad, _bbCastFirstNames and _bbOpenCastPickMenu
   when loaded. Exposes window.CastRoster.open(topicId).

   Sept 26 2026 (Master BB "CAST Storyboard" card, first pass): added a
   Board View -- the current level and its direct children as classic
   cards (like a hand of Briefing Cards) instead of the tree list. Any
   empty role slot shows as a dashed, tappable blank ("fill in the
   blank") rather than a warning. Toggle button swaps with the old tree
   (now called Pyramid View); Board is the default. Ancestors above the
   current level still collapse to a breadcrumb line, same straight-
   climb rule as before. Everything underneath (data shape, add/change/
   remove people, priority, PRIMARY hand-off, print) is shared with the
   Pyramid unchanged -- this only adds a second way to look at it.
   ============================================================ */

(function(){

  var STEP_PX = 1.3, FLOOR_PX = 10.5, BASE_PX = 15;   // same gradient as topic-pyramid.js
  function _fontPx(depth){ return Math.max(FLOOR_PX, BASE_PX - depth * STEP_PX); }

  var ROLE_ORDER = { primary:0, key:1, team:2, cast_member:3, facilitator:4, facilitator_qualified:5, stakeholder:6, guest:7 };
  var ROLE_LABEL = { primary:'PRIMARY', team:'Team', cast_member:'Cast', facilitator:'Facilitator',
                     facilitator_qualified:'Facilitator', stakeholder:'Stakeholder', guest:'Guest' };
  var PRI_STEPS = ['HH','H','MH','M','ML','L'];

  function _sb(){ return window.T2T && window.T2T.sb; }
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function _clean(name){ return String(name||'(untitled)').replace(/\s+/g,' ').trim(); }
  function _pri(){ return window.T2TPriority || {rank:function(){return 9;}, badgeHTML:function(){return '';}, sort:function(l){return l;}, ensureStyles:function(){}}; }
  function _load(){ return window.T2TLoad || {limit:5, fetch:function(){ return Promise.resolve({}); }, badgeHTML:function(){ return ''; }, invalidate:function(){}}; }

  // ---------- styles ----------
  function _ensureStyles(){
    _pri().ensureStyles();
    if(document.getElementById('cr-styles')) return;
    var css=''
      +'#cr-overlay{display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,20,18,.55);align-items:center;justify-content:center;padding:16px;box-sizing:border-box}'
      +'#cr-card{text-align:left;background:#F5F1E8;color:#2C2C2A;border-radius:14px;padding:16px;box-shadow:0 10px 24px rgba(0,0,0,.3);max-height:88vh;overflow-y:auto;width:min(580px,100%);box-sizing:border-box}'
      +'.cr-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}'
      +'.cr-title{flex:1;font-size:calc(11px * var(--fg-text-scale,1));font-weight:600;letter-spacing:.08em}'
      +'.cr-btn{height:24px;padding:0 9px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));color:#2C2C2A}'
      +'.cr-sub{font-size:calc(10px * var(--fg-text-scale,1));color:#5b5b56;margin-bottom:6px}'
      +'.cr-alert{font-size:calc(10.5px * var(--fg-text-scale,1));color:#8a4b00;background:#fbe9c8;border-radius:6px;padding:4px 8px;margin-bottom:8px;display:inline-block}'
      +'.cr-level{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px}'
      +'.cr-level:hover{background:rgba(0,0,0,.05)}'
      +'.cr-level.cr-current{background:rgba(26,58,92,.12)}'
      +'.cr-level.cr-current .cr-lname{font-weight:700}'
      +'.cr-lname{cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.cr-lead{font-size:.82em;color:#5b5b56;white-space:nowrap}'
      +'.cr-nolead{font-size:.78em;color:#8a4b00;background:#fbe9c8;border-radius:4px;padding:0 5px;white-space:nowrap}'
      +'.cr-inherit{font-size:.8em;color:#8a877e;font-style:italic;white-space:nowrap}'
      +'.cr-alert.cr-tap{cursor:pointer}.cr-alert.cr-tap:hover{filter:brightness(.96)}'
      +'.cr-level.cr-flash{animation:crflash 1.6s ease-out}'
      +'@keyframes crflash{0%{background:#fbe0a8}100%{background:transparent}}'
      +'.cr-count{font-size:.78em;color:#8a877e;white-space:nowrap}'
      +'.cr-prihit{cursor:pointer;display:inline-flex;align-items:center}'
      +'.cr-pri-empty{font-size:9px;line-height:14px;padding:0 4px;border:1px dashed #b4b2a9;border-radius:4px;color:#8a877e}'
      +'.cr-arrow{flex:none;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;opacity:.7;user-select:none}'
      +'.cr-arrow.cr-none{visibility:hidden;cursor:default}'
      +'.cr-people{margin:2px 0 6px;border-left:2px solid rgba(26,58,92,.18)}'
      +'.cr-person{display:flex;align-items:center;gap:6px;padding:3px 8px;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.cr-pname{font-weight:600;white-space:nowrap}'
      +'.cr-pname.cr-editable{cursor:pointer;text-decoration:underline dotted rgba(0,0,0,.25);text-underline-offset:3px}'
      +'.cr-tags{font-size:.85em;color:#5b5b56;white-space:nowrap}'
      +'.cr-star{color:#c9a227}'
      +'.cr-ptitle{flex:1;min-width:60px;font-style:italic;color:#44443f;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'input.cr-ptitle{font:inherit;font-style:italic;border:1px solid transparent;background:transparent;border-radius:4px;padding:1px 4px}'
      +'input.cr-ptitle:hover{border-color:#d8d4c8}'
      +'input.cr-ptitle:focus{border-color:#B4B2A9;background:#fff;outline:none;font-style:normal}'
      +'.cr-add{margin:2px 8px 2px;width:22px;height:22px;border-radius:50%;border:1.5px dashed #9a978d;background:transparent;color:#5b5b56;cursor:pointer;font-size:14px;line-height:18px;padding:0}'
      +'.cr-empty{padding:3px 8px;font-size:calc(11px * var(--fg-text-scale,1));color:#8a877e}'
      +'.cr-msg{padding:6px;font-size:calc(11px * var(--fg-text-scale,1));color:#5b5b56}'
      +'.cr-err{color:#b8562f}'
      +'.cr-pop{position:fixed;z-index:10002;background:#fff;border:1px solid #B4B2A9;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,.2);padding:4px;min-width:170px;font-size:calc(12px * var(--fg-text-scale,1));color:#2C2C2A}'
      +'.cr-pop-row{padding:5px 9px;border-radius:5px;cursor:pointer;white-space:nowrap}'
      +'.cr-pop-row:hover{background:rgba(0,0,0,.06)}'
      +'.cr-pop-row.cr-on{font-weight:700}'
      +'.cr-pop-row.cr-danger{color:#b8562f}'
      +'.cr-pop-sep{height:1px;background:#e4e0d6;margin:3px 2px}'
      +'.cr-pop-pri{display:flex;gap:4px;padding:4px;flex-wrap:wrap}'
      +'.cr-pop-pri .t2t-pri{cursor:pointer;font-size:11px;line-height:20px;min-width:24px}'
      +'.cr-pop-pri .cr-pri-clear{cursor:pointer;font-size:11px;line-height:20px;padding:0 6px;border:1px solid #d8d4c8;border-radius:4px}'
      // Org chart (print only)
      +'#cr-print{display:none}'
      +'@media print{'
        +'body.cr-printing *{visibility:hidden}'
        +'body.cr-printing #cr-print,body.cr-printing #cr-print *{visibility:visible}'
        +'body.cr-printing #cr-print{display:block;position:absolute;left:0;top:0;width:100%;padding:.3in;box-sizing:border-box;color:#000;background:#fff;font-family:inherit}'
        +'body.cr-printing #cr-print *{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
        +'@page{size:landscape}'
      +'}'
      +'.crp-h{font-size:16px;font-weight:700;letter-spacing:.06em;margin:0 0 2px}'
      +'.crp-sub{font-size:10px;color:#555;margin:0 0 14px}'
      +'.crp-tree,.crp-tree ul{list-style:none;margin:0;padding:0;display:flex;justify-content:center;position:relative}'
      +'.crp-tree ul{padding-top:14px}'
      +'.crp-tree li{position:relative;padding:14px 6px 0;text-align:center}'
      +'.crp-tree li::before,.crp-tree li::after{content:"";position:absolute;top:0;right:50%;width:50%;height:14px;border-top:1px solid #777}'
      +'.crp-tree li::after{right:auto;left:50%;border-left:1px solid #777}'
      +'.crp-tree li:only-child::before,.crp-tree li:only-child::after{display:none}'
      +'.crp-tree li:only-child{padding-top:0}'
      +'.crp-tree li:first-child::before,.crp-tree li:last-child::after{border:0 none}'
      +'.crp-tree li:last-child::before{border-right:1px solid #777}'
      +'.crp-tree ul ul::before{content:"";position:absolute;top:0;left:50%;height:14px;border-left:1px solid #777}'
      +'.crp-tree>li{padding-top:0}.crp-tree>li::before,.crp-tree>li::after{display:none}'
      +'.crp-box{display:inline-block;border:1px solid #555;border-radius:6px;padding:5px 8px;min-width:110px;max-width:210px;font-size:9.5px;background:#fff;page-break-inside:avoid;text-align:left}'
      +'.crp-box.crp-cur{border-width:2px}'
      +'.crp-box.crp-open{border-color:#c77a00}'
      +'.crp-lv{font-weight:700;font-size:10.5px;text-align:center;border-bottom:1px solid #ccc;padding-bottom:3px;margin-bottom:3px}'
      +'.crp-lead{font-weight:700}'
      +'.crp-p{margin:1px 0}'
      +'.crp-t{font-style:italic;color:#333}'
      +'.crp-r{color:#555}'
      +'.crp-none{color:#8a4b00;font-weight:700}'
      +'.crp-inh{color:#777;font-style:italic}'
      // Board view -- classic card grid, fill-in-the-blank style
      +'.cr-board-crumbs{font-size:.8em;color:#8a877e;padding:2px 4px 8px}'
      +'.cr-board-grid{display:flex;flex-wrap:wrap;gap:10px;padding:2px}'
      +'.cr-bcard{width:210px;flex:none;background:#fff;border:1px solid #d8d4c8;border-radius:10px;padding:8px;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,.06)}'
      +'.cr-bcard-cur{border-color:#1A3A5C;border-width:2px}'
      +'.cr-bcard-blank{border-style:dashed;background:#fbfaf6}'
      +'.cr-bhead{display:flex;align-items:center;gap:6px;border-bottom:1px solid #eee6d6;padding-bottom:5px;margin-bottom:5px}'
      +'.cr-bname{font-weight:700;font-size:calc(12px * var(--fg-text-scale,1));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.cr-bpri{cursor:pointer}'
      +'.cr-bbody{display:flex;flex-direction:column;gap:3px}'
      +'.cr-brow{display:flex;align-items:baseline;gap:5px;font-size:calc(11.5px * var(--fg-text-scale,1));padding:2px 3px;border-radius:5px}'
      +'.cr-brow-primary{font-weight:600}'
      +'.cr-blabel{flex:none;font-size:.78em;letter-spacing:.04em;color:#8a877e;text-transform:uppercase;min-width:52px}'
      +'.cr-blabel-role{min-width:0}'
      +'.cr-bval{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.cr-bval.cr-editable{cursor:pointer;text-decoration:underline dotted rgba(0,0,0,.25);text-underline-offset:3px}'
      +'.cr-bval.cr-nolead{color:#8a4b00}'
      +'.cr-bval.cr-inherit{color:#8a877e;font-style:italic}'
      +'.cr-bblank{cursor:pointer;color:#8a877e}'
      +'.cr-bblank:hover{background:rgba(0,0,0,.05)}'
      +'.cr-bfill{border:1px dashed #b4b2a9;border-radius:5px;padding:0 6px;font-style:italic}'
      +'.cr-badd{justify-content:center;margin-top:2px}'
      +'.cr-badd .cr-bfill{border-style:solid;border-color:transparent}'
      +'.cr-bempty{font-size:.85em;color:#8a877e;padding:2px 3px}';
    var st=document.createElement('style'); st.id='cr-styles'; st.textContent=css;
    document.head.appendChild(st);
  }

  // ---------- data ----------
  // Builds {levels:{id:level}, current, ancestors:[...]} from the flat
  // rows cast_roster_tree returns (one row per level+person, or one bare
  // row for a level with nobody on it yet).
  function _shape(rows, topicId, loads){
    var levels={}, order=[];
    rows.forEach(function(r){
      var id=String(r.level_id);
      var lv=levels[id];
      if(!lv){
        lv=levels[id]={id:id, parentId:r.parent_id?String(r.parent_id):null, name:_clean(r.level_name),
                       rel:r.rel_depth, sort:r.sort_order, canEdit:!!r.can_edit, priority:r.level_priority||'',
                       people:[], kids:[]};
        order.push(lv);
      }
      if(r.user_id){
        lv.people.push({userId:String(r.user_id), name:r.person_name||'(unknown)', roles:r.roles||[],
                        title:r.title||'', isKey:!!r.is_key, thread:!!r.thread, levelPrimary:!!r.level_primary,
                        onLevelCard:!!r.on_level_card, load:loads[String(r.user_id)]||0});
      }
    });
    order.forEach(function(lv){
      if(lv.rel>0 && lv.parentId && levels[lv.parentId]) levels[lv.parentId].kids.push(lv);
      // Solo rule (Larry, Sept 23 2026: "the first person assigned is
      // PRIMARY unless changed" -- the boards' _csAutoPrimaryIfSolo): the
      // only person on a level's own Cast is its PRIMARY.
      var own=lv.people.filter(function(x){ return x.onLevelCard; });
      if(own.length===1 && !own[0].levelPrimary) own[0].levelPrimary=true;
      _nameAndSortPeople(lv.people);
    });
    order.forEach(function(lv){
      lv.kids.sort(function(a,b){ return (a.sort==null?1e18:a.sort)-(b.sort==null?1e18:b.sort); });
      lv.kids=_pri().sort(lv.kids, function(k){ return k.priority; });   // highest priority first
    });
    var ancestors=order.filter(function(l){ return l.rel<0; }).sort(function(a,b){ return a.rel-b.rel; });
    return {levels:levels, order:order, current:levels[String(topicId)]||null, ancestors:ancestors};
  }

  // A person's rank at a level: the level's own PRIMARY first, then
  // 🔑 Key Stakeholders, Team, and so on.
  function _rank(p){
    if(p.levelPrimary) return 0;
    if(p.isKey) return 1;
    var best=9;
    p.roles.forEach(function(r){ if(r==='primary') r='team'; if(ROLE_ORDER[r]!=null && ROLE_ORDER[r]<best) best=ROLE_ORDER[r]; });
    return best;
  }
  function _nameAndSortPeople(people){
    var rows=people.map(function(p){ return {name:p.name, _p:p}; });
    if(typeof window._bbCastFirstNames==='function'){ try{ window._bbCastFirstNames(rows); }catch(e){} }
    rows.forEach(function(r){ r._p.shortName=r.shortName||String(r.name).split(/\s+/)[0]; });
    people.sort(function(a,b){ return (_rank(a)-_rank(b)) || a.shortName.localeCompare(b.shortName, undefined, {sensitivity:'base'}); });
  }
  // Role words beside a name. A 'primary' on a card inside this level
  // (not the level itself) reads as Team here -- they lead a card, the
  // level's own PRIMARY leads the level.
  function _tags(p){
    var out=[];
    if(p.levelPrimary) out.push('PRIMARY');
    var seen={};
    p.roles.forEach(function(r){
      if(r==='primary') r='team';
      if(r==='stakeholder' && p.isKey){ if(!seen.key){ seen.key=1; out.push('🔑 Key Stakeholder'); } return; }
      var l=ROLE_LABEL[r]||r;
      if(p.levelPrimary && l==='Team') return;
      if(!seen[l]){ seen[l]=1; out.push(l); }
    });
    return out.join(' · ');
  }
  // The role a person holds on the level's own card, for the edit menu's check mark.
  function _levelRole(p){
    if(p.levelPrimary) return 'primary';
    if(!p.onLevelCard) return '';
    if(p.isKey) return 'key';
    if(p.roles.indexOf('team')>=0) return 'team';
    if(p.roles.indexOf('stakeholder')>=0) return 'stakeholder';
    if(p.roles.indexOf('cast_member')>=0) return 'cast_member';
    return '';
  }
  function _leadOf(lv){ return lv.people.filter(function(x){ return x.levelPrimary; })[0]||null; }
  // What a level's PRIMARY situation is (public.primary_status):
  //   own -> "· Name"; inherited -> "↑ Name" (lighter);
  //   warn -> ⚠ Needs a PRIMARY; blocked / quiet unowned -> nothing.
  // Falls back to "own PRIMARY or ⚠" if the lookup didn't come back.
  function _status(lv){
    if(lv.pstatus) return lv.pstatus;
    return _leadOf(lv) ? {status:'own'} : {status:'needs', warn:true};
  }
  function _firstName(full){
    var n=String(full||'').trim().split(/\s+/)[0]||'';
    return n.charAt(0).toUpperCase()+n.slice(1);
  }
  function _warnLevels(){ return _state ? _state.order.filter(function(l){ return _status(l).warn; }) : []; }

  // ---------- screen ----------
  var _state=null, _topicId=null;
  var _openPeople={}, _openKids={};   // remembered across refreshes
  var _viewMode='board';   // 'board' (classic fill-in-the-blank cards) or 'pyramid' (tree)

  function _ensureOverlay(){
    if(document.getElementById('cr-overlay')) return;
    var ov=document.createElement('div');
    ov.id='cr-overlay';
    ov.innerHTML='<div id="cr-card"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    document.addEventListener('keydown', function(e){
      if(e.key!=='Escape' || ov.style.display!=='flex') return;
      if(document.activeElement && document.activeElement.classList.contains('cr-ptitle')) return;
      if(_closePop()) return;
      close();
    });
    document.addEventListener('click', function(e){
      var pop=document.getElementById('cr-pop');
      if(pop && !pop.contains(e.target) && !e.target.closest('.cr-pophost')) _closePop();
    }, true);
    var pr=document.createElement('div'); pr.id='cr-print'; document.body.appendChild(pr);
  }

  async function open(topicId){
    _ensureStyles(); _ensureOverlay();
    if(String(topicId)!==String(_topicId)){ _openPeople={}; _openKids={}; }
    _topicId=topicId;
    var ov=document.getElementById('cr-overlay'), card=document.getElementById('cr-card');
    card.innerHTML='<div class="cr-head"><span class="cr-title">👥 CAST ROSTER</span>'
      +'<button class="cr-btn" id="cr-view-toggle"></button>'
      +'<button class="cr-btn" id="cr-print-btn" title="Print as an Organization Chart" disabled>🖨 Org Chart</button>'
      +'<button class="cr-btn" id="cr-close" aria-label="Close">✕</button></div>'
      +'<div class="cr-sub" id="cr-sub"></div>'
      +'<div id="cr-alert-slot"></div>'
      +'<div id="cr-body"><div class="cr-msg">Loading…</div></div>';
    ov.style.display='flex';
    document.getElementById('cr-close').onclick=close;
    _paintSub();
    document.getElementById('cr-view-toggle').onclick=function(){
      _viewMode=(_viewMode==='board')?'pyramid':'board';
      _paintSub();
      _render(document.getElementById('cr-body'), false);
    };
    await _reload(true);
  }

  // Loads (or reloads after a change) and redraws, keeping what's open.
  async function _reload(first){
    var body=document.getElementById('cr-body'); if(!body) return;
    if(!_topicId){ body.innerHTML='<div class="cr-msg">Open a project first.</div>'; return; }
    var sb=_sb();
    if(!sb){ body.innerHTML='<div class="cr-msg cr-err">Not connected.</div>'; return; }
    if(!first) _load().invalidate();
    var loadsP=_load().fetch(!first);
    var res;
    try{ res=await sb.rpc('cast_roster_tree', {p_topic:_topicId}); }catch(e){ res={error:e}; }
    if(res.error){ body.innerHTML='<div class="cr-msg cr-err">'+_esc(res.error.message||'Could not load the Cast Roster.')+'</div>'; return; }
    var loads=await loadsP;
    _state=_shape(res.data||[], _topicId, loads||{});
    if(!_state.current){ body.innerHTML='<div class="cr-msg">Nothing to show here yet.</div>'; return; }
    if(first) _openPeople[_state.current.id]=true;
    if(window.T2TPrimaryStatus){
      if(!first) window.T2TPrimaryStatus.invalidate();
      try{
        var smap=await window.T2TPrimaryStatus.fetch(_state.order.map(function(l){ return l.id; }));
        _state.order.forEach(function(l){ if(smap[l.id]) l.pstatus=smap[l.id]; });
      }catch(e){}
    }
    _paintAlert();
    var scroller=document.getElementById('cr-card'), keep=scroller?scroller.scrollTop:0;
    _render(body, first);
    if(!first && scroller) scroller.scrollTop=keep;
    var pb=document.getElementById('cr-print-btn');
    if(pb){ pb.disabled=false; pb.onclick=_printOrgChart; }
  }

  // "⚠ 2 need a PRIMARY" -- tap it to open those levels (and the path
  // down to them) and flash them.
  function _paintAlert(){
    var slot=document.getElementById('cr-alert-slot'); if(!slot) return;
    var w=_warnLevels();
    slot.innerHTML='';
    if(!w.length) return;
    var a=document.createElement('div');
    a.className='cr-alert cr-tap';
    a.textContent='⚠ '+w.length+' need'+(w.length===1?'s':'')+' a PRIMARY — tap to show';
    a.title=w.map(function(l){ return l.name; }).join(' · ');
    a.addEventListener('click', function(){
      w.forEach(function(l){
        _openPeople[l.id]=true;
        var p=_state.levels[l.parentId];
        while(p && p.rel>=0 && p.id!==_state.current.id){ _openKids[p.id]=true; p=_state.levels[p.parentId]; }
      });
      var body=document.getElementById('cr-body');
      _render(body, false);
      var first=null;
      w.forEach(function(l){
        var el=body.querySelector('.cr-level[data-lid="'+l.id+'"]');
        if(el){ el.classList.remove('cr-flash'); void el.offsetWidth; el.classList.add('cr-flash'); if(!first) first=el; }
      });
      if(first && first.scrollIntoView) first.scrollIntoView({block:'center', behavior:'smooth'});
    });
    slot.appendChild(a);
  }

  function close(){
    _closePop();
    var ov=document.getElementById('cr-overlay');
    if(ov) ov.style.display='none';
  }

  // Toggle button + helper line swap with the view; kept in one place so
  // both stay honest about which mode is showing.
  function _paintSub(){
    var btn=document.getElementById('cr-view-toggle'), sub=document.getElementById('cr-sub');
    if(btn) btn.textContent=(_viewMode==='board')?'🔺 Pyramid View':'📋 Board View';
    if(!sub) return;
    sub.textContent=(_viewMode==='board')
      ? 'A card for the current level and each level below it. Dashed lines are blank — tap to fill them in.'
      : 'Tap a level to see its people. The arrow opens the levels beneath. The number beside a name is how many projects they\'re PRIMARY on (amber at '+_load().limit+'+).';
  }

  function _render(body, first){
    if(_viewMode==='board') _renderBoard(body, first);
    else _renderPyramid(body, first);
  }

  function _renderPyramid(body, first){
    body.innerHTML='';
    var depth=0;
    _state.ancestors.forEach(function(lv){
      body.appendChild(_levelBlock(lv, depth, 0, false));
      depth++;
    });
    body.appendChild(_levelBlock(_state.current, depth, 0, true));
    _state.current.kids.forEach(function(kid){
      body.appendChild(_levelBlock(kid, depth+1, 14, false));
    });
    if(first){
      var cur=body.querySelector('.cr-current');
      if(cur && cur.scrollIntoView) setTimeout(function(){ try{ cur.scrollIntoView({block:'nearest'}); }catch(e){} }, 0);
    }
  }

  // Classic board: the current level and its direct children as cards,
  // laid out like a hand of Briefing Cards. Ancestors collapse to a
  // breadcrumb (same straight-climb rule as the Pyramid). Every role
  // slot with nobody in it shows as a dashed, tappable blank instead of
  // a warning -- "fill in the blank" rather than "something's wrong."
  function _renderBoard(body, first){
    body.innerHTML='';
    if(_state.ancestors.length){
      var bc=document.createElement('div');
      bc.className='cr-board-crumbs';
      bc.textContent=_state.ancestors.map(function(a){ return a.name; }).join(' › ');
      body.appendChild(bc);
    }
    var grid=document.createElement('div');
    grid.className='cr-board-grid';
    grid.appendChild(_boardCard(_state.current, true));
    _state.current.kids.forEach(function(kid){ grid.appendChild(_boardCard(kid, false)); });
    body.appendChild(grid);
  }

  function _boardCard(lv, isCurrent){
    var card=document.createElement('div');
    card.className='cr-bcard'+(isCurrent?' cr-bcard-cur':'')+(!lv.people.length?' cr-bcard-blank':'');
    card.setAttribute('data-lid', lv.id);

    var priHTML=_pri().badgeHTML(lv.priority);
    var priSlot=lv.canEdit
      ? '<span class="cr-bpri cr-pophost">'+(priHTML||'<span class="cr-pri-empty" title="Set priority">H/M/L</span>')+'</span>'
      : (priHTML||'');
    var head=document.createElement('div');
    head.className='cr-bhead';
    head.innerHTML=priSlot+'<span class="cr-bname" title="'+_esc(lv.name)+'">'+_esc(lv.name)+'</span>';
    card.appendChild(head);
    var priEl=head.querySelector('.cr-bpri');
    if(priEl && lv.canEdit) priEl.addEventListener('click', function(e){ e.stopPropagation(); _priorityPop(priEl, lv); });

    var body=document.createElement('div');
    body.className='cr-bbody';

    var lead=_leadOf(lv), st=_status(lv);
    var leadRow=document.createElement('div');
    leadRow.className='cr-brow cr-brow-primary';
    if(lead){
      leadRow.innerHTML='<span class="cr-blabel">Primary</span><span class="cr-bval">'+_esc(lead.shortName)+'</span>';
    } else if(st.status==='inherited' && st.primary_name){
      leadRow.innerHTML='<span class="cr-blabel">Primary</span><span class="cr-bval cr-inherit">↑ '+_esc(_firstName(st.primary_name))+'</span>';
    } else if(lv.canEdit){
      leadRow.classList.add('cr-bblank');
      leadRow.innerHTML='<span class="cr-blabel">Primary</span><span class="cr-bfill">— fill in —</span>';
      leadRow.title='Tap to add a PRIMARY';
      leadRow.addEventListener('click', function(){ _addPerson(leadRow, lv); });
    } else {
      leadRow.innerHTML='<span class="cr-blabel">Primary</span><span class="cr-bval cr-nolead">⚠ none yet</span>';
    }
    body.appendChild(leadRow);

    lv.people.filter(function(p){ return !p.levelPrimary; }).forEach(function(p){
      var r=document.createElement('div');
      r.className='cr-brow';
      var tags=_tags(p);
      r.innerHTML='<span class="cr-blabel cr-blabel-role" title="'+_esc(tags||'Cast')+'">'+_esc(tags||'Cast')+'</span>'
        +'<span class="cr-bval'+(lv.canEdit?' cr-editable cr-pophost':'')+'">'+_esc(p.shortName)+'</span>';
      if(lv.canEdit){
        var val=r.querySelector('.cr-bval');
        val.title='Change '+p.shortName+'\'s role on '+lv.name;
        val.addEventListener('click', function(e){ e.stopPropagation(); _personPop(val, lv, p); });
      }
      body.appendChild(r);
    });

    if(lv.canEdit){
      var add=document.createElement('div');
      add.className='cr-brow cr-bblank cr-badd';
      add.innerHTML='<span class="cr-bfill">+ add someone</span>';
      add.addEventListener('click', function(){ _addPerson(add, lv); });
      body.appendChild(add);
    } else if(!lv.people.length){
      var em=document.createElement('div'); em.className='cr-brow cr-bempty'; em.textContent='No one on this level yet.';
      body.appendChild(em);
    }

    card.appendChild(body);
    return card;
  }

  // One level: its row, its people (open or hidden), and its children
  // (opened by the arrow; ancestors never show children -- the line
  // above is a straight climb, same as the Pyramid).
  function _levelBlock(lv, depth, indent, isCurrent){
    var wrap=document.createElement('div');
    var row=document.createElement('div');
    row.className='cr-level'+(isCurrent?' cr-current':'');
    row.setAttribute('data-lid', lv.id);
    row.style.paddingLeft=(6+indent)+'px';
    row.style.fontSize='calc('+_fontPx(depth)+'px * var(--fg-text-scale,1))';
    var lead=_leadOf(lv), st=_status(lv), leadHTML='';
    if(lead) leadHTML='<span class="cr-lead">· '+_esc(lead.shortName)+'</span>';
    else if(st.status==='inherited' && st.primary_name)
      leadHTML='<span class="cr-inherit" title="No one assigned here yet, so '+_esc(st.primary_name)+' (PRIMARY above) is responsible until they hand it to someone">↑ '+_esc(_firstName(st.primary_name))+'</span>';
    else if(st.warn)
      leadHTML='<span class="cr-nolead" title="'+(st.status==='needs'?'People are on this level but no one is PRIMARY yet — pick one':'No one is responsible for this branch yet')+'">⚠ Needs a PRIMARY</span>';
    var priHTML=_pri().badgeHTML(lv.priority) || (lv.canEdit ? '<span class="cr-pri-empty" title="Set priority">H/M/L</span>' : '');
    row.innerHTML=(priHTML?'<span class="cr-prihit cr-pophost">'+priHTML+'</span>':'')
      +'<span class="cr-lname" title="Show or hide the people on '+_esc(lv.name)+'">'+_esc(lv.name)+'</span>'
      +leadHTML
      +'<span class="cr-count">('+lv.people.length+')</span>'
      +'<span class="cr-arrow'+((lv.rel>=0 && lv.kids.length && !isCurrent)?'':' cr-none')+'">'+(_openKids[lv.id]?'▾':'▸')+'</span>';
    wrap.appendChild(row);

    var hit=row.querySelector('.cr-prihit');
    if(hit && lv.canEdit){ hit.addEventListener('click', function(e){ e.stopPropagation(); _priorityPop(hit, lv); }); }
    else if(hit){ hit.style.cursor='default'; }

    var people=_peopleBlock(lv, indent);
    people.style.display=_openPeople[lv.id]?'':'none';
    wrap.appendChild(people);
    row.querySelector('.cr-lname').addEventListener('click', function(){
      _openPeople[lv.id]=!_openPeople[lv.id];
      people.style.display=_openPeople[lv.id]?'':'none';
    });

    if(lv.rel>=0 && lv.kids.length && !isCurrent){
      var kidsWrap=null, arrow=row.querySelector('.cr-arrow');
      function build(){
        kidsWrap=document.createElement('div');
        lv.kids.forEach(function(k){ kidsWrap.appendChild(_levelBlock(k, depth+1, indent+14, false)); });
        wrap.appendChild(kidsWrap);
      }
      if(_openKids[lv.id]) build();
      arrow.addEventListener('click', function(){
        if(!kidsWrap) build();
        _openKids[lv.id]=!_openKids[lv.id];
        kidsWrap.style.display=_openKids[lv.id]?'':'none';
        arrow.textContent=_openKids[lv.id]?'▾':'▸';
      });
    }
    return wrap;
  }

  function _peopleBlock(lv, indent){
    var box=document.createElement('div');
    box.className='cr-people';
    box.style.marginLeft=(14+indent)+'px';
    if(!lv.people.length){
      var em=document.createElement('div'); em.className='cr-empty'; em.textContent='No one on this level yet.';
      box.appendChild(em);
    }
    lv.people.forEach(function(p){
      var r=document.createElement('div');
      r.className='cr-person';
      r.title=p.name;
      var tags=_tags(p);
      r.innerHTML='<span class="cr-pname'+(lv.canEdit?' cr-editable cr-pophost':'')+'">'+_esc(p.shortName)+'</span>'
        +(p.thread?'<span class="cr-star" title="Carried over from the level above">★</span>':'')
        +_load().badgeHTML(p.load)
        +(tags?'<span class="cr-tags">'+_esc(tags)+'</span>':'');
      if(lv.canEdit){
        var nm=r.querySelector('.cr-pname');
        nm.title='Change '+p.shortName+'\'s role on '+lv.name;
        nm.addEventListener('click', function(e){ e.stopPropagation(); _personPop(nm, lv, p); });
        r.appendChild(_titleInput(lv, p));
      } else if(p.title){
        var t=document.createElement('span'); t.className='cr-ptitle'; t.textContent=p.title;
        r.appendChild(t);
      }
      box.appendChild(r);
    });
    if(lv.canEdit){
      var add=document.createElement('button');
      add.className='cr-add cr-pophost'; add.type='button'; add.textContent='+';
      add.title='Add someone to '+lv.name;
      add.addEventListener('click', function(e){ e.stopPropagation(); _addPerson(add, lv); });
      box.appendChild(add);
    }
    return box;
  }

  function _titleInput(lv, p){
    var inp=document.createElement('input');
    inp.className='cr-ptitle'; inp.type='text'; inp.value=p.title; inp.placeholder='add title';
    inp.title='Title on '+lv.name+' — press Enter to save';
    var saved=p.title;
    function save(){
      var v=inp.value.trim();
      if(v===saved) return;
      var sb=_sb(); if(!sb) return;
      inp.disabled=true;
      sb.rpc('set_level_title', {p_level:lv.id, p_user:p.userId, p_title:v}).then(function(res){
        inp.disabled=false;
        if(res.error){ inp.value=saved; inp.title=res.error.message||'Could not save.'; return; }
        saved=v; p.title=v;
      }, function(){ inp.disabled=false; inp.value=saved; });
    }
    inp.addEventListener('keydown', function(e){
      e.stopPropagation();
      if(e.key==='Enter'){ inp.blur(); }
      else if(e.key==='Escape'){ inp.value=saved; inp.blur(); }
    });
    inp.addEventListener('blur', save);
    return inp;
  }

  // ---------- small pop-up menus ----------
  function _closePop(){
    var pop=document.getElementById('cr-pop');
    if(pop){ pop.remove(); return true; }
    return false;
  }
  function _openPop(anchor){
    _closePop();
    var pop=document.createElement('div');
    pop.id='cr-pop'; pop.className='cr-pop';
    document.body.appendChild(pop);
    setTimeout(function(){
      var r=anchor.getBoundingClientRect(), mr=pop.getBoundingClientRect();
      var left=Math.min(r.left, window.innerWidth-8-mr.width), top=r.bottom+4;
      if(top+mr.height>window.innerHeight-8) top=Math.max(8, r.top-4-mr.height);
      pop.style.left=Math.max(8,left)+'px'; pop.style.top=top+'px';
    }, 0);
    pop.style.left='-9999px'; pop.style.top='0';
    return pop;
  }
  function _flash(msg){
    var slot=document.getElementById('cr-alert-slot'); if(!slot) return;
    var d=document.createElement('div'); d.className='cr-alert'; d.style.background='#f3dcd2'; d.style.color='#7a2d12';
    d.textContent=msg; slot.appendChild(d);
    setTimeout(function(){ try{ d.remove(); }catch(e){} }, 5000);
  }

  function _priorityPop(anchor, lv){
    var pop=_openPop(anchor);
    var h='<div class="cr-pop-pri">';
    PRI_STEPS.forEach(function(s){ h+='<span data-p="'+s+'">'+_pri().badgeHTML(s)+'</span>'; });
    h+='<span class="cr-pri-clear" data-p="">✕ none</span></div>';
    pop.innerHTML=h;
    Array.prototype.forEach.call(pop.querySelectorAll('[data-p]'), function(el){
      el.addEventListener('click', async function(){
        var v=el.getAttribute('data-p');
        _closePop();
        var res=await _sb().rpc('set_level_priority', {p_level:lv.id, p_priority:v});
        if(res.error){ _flash(res.error.message||'Could not set priority.'); return; }
        _reload(false);
      });
    });
  }

  function _personPop(anchor, lv, p){
    var pop=_openPop(anchor);
    var cur=_levelRole(p);
    var opts=[['primary','PRIMARY'],['team','Team'],['cast_member','Cast'],['stakeholder','Stakeholder'],['key','🔑 Key Stakeholder']];
    var h='<div class="cr-pop-row" style="cursor:default;opacity:.65;font-size:.9em">'+_esc(p.name)+' on '+_esc(lv.name)+'</div><div class="cr-pop-sep"></div>';
    opts.forEach(function(o){ h+='<div class="cr-pop-row'+(cur===o[0]?' cr-on':'')+'" data-r="'+o[0]+'">'+(cur===o[0]?'✓ ':'')+_esc(o[1])+'</div>'; });
    if(!p.levelPrimary) h+='<div class="cr-pop-sep"></div><div class="cr-pop-row cr-danger" data-r="remove">Remove from this level</div>';
    pop.innerHTML=h;
    Array.prototype.forEach.call(pop.querySelectorAll('[data-r]'), function(el){
      el.addEventListener('click', async function(){
        var role=el.getAttribute('data-r');
        _closePop();
        if(role===cur) return;
        if(role==='primary'){ await _makePrimary(lv, p.userId, p.thread); return; }
        if(p.levelPrimary){ _flash('Pick a new PRIMARY first — '+p.shortName+' then stays on as a 🔑 Key Stakeholder.'); return; }
        var res=await _sb().rpc('set_level_role', {p_level:lv.id, p_user:p.userId, p_role:role});
        if(res.error){ _flash(res.error.message||'Could not change that.'); return; }
        if(res.data==='still_on_cards') _flash(p.shortName+' still holds a role on cards inside '+lv.name+' — change those on the cards themselves.');
        _reload(false);
      });
    });
  }

  async function _makePrimary(lv, userId, fromAbove){
    var sb=_sb();
    if(window.T2TStoryboard && typeof window.T2TStoryboard.assignPrimaryDirect==='function'){
      var r=await window.T2TStoryboard.assignPrimaryDirect({id:lv.id, content_type:'header', text_content:lv.name}, 'idea', userId, {fromAbove:!!fromAbove});
      if(r && r.ok===false){ _flash(r.msg||'Could not make them PRIMARY.'); return; }
    } else {
      _flash('PRIMARY can\'t be changed from this page yet — open the board.'); return;
    }
    _reload(false);
  }

  function _addPerson(anchor, lv){
    if(typeof window._bbOpenCastPickMenu!=='function'){ _flash('The Cast list isn\'t loaded on this page.'); return; }
    _closePop();
    var menu=document.createElement('div');
    menu.id='cr-pop'; menu.className='cr-pophost';
    menu.style.zIndex='10002';
    document.body.appendChild(menu);
    window._bbOpenCastPickMenu(menu, anchor, {
      level: lv.id,
      onPick: async function(person){
        try{ menu.remove(); }catch(e){}
        var sb=_sb();
        var exists=lv.people.some(function(x){ return String(x.userId)===String(person.user_id) && x.onLevelCard; });
        if(exists){ _flash((person.name||'They')+' is already on '+lv.name+'.'); return; }
        // First person on an empty level becomes its PRIMARY -- through the
        // boards' own hand-off, so the chain above lands as 🔑 Key too.
        if(!lv.people.some(function(x){ return x.onLevelCard; })){
          _openPeople[lv.id]=true;
          await _makePrimary(lv, person.user_id, person.fromAbove);
          return;
        }
        var me=null; try{ var u=await sb.auth.getUser(); me=u&&u.data&&u.data.user?u.data.user.id:null; }catch(e){}
        // New adds are Cast (the no-edit floor, same as every other
        // add since Sept 14 2026) -- tap their name after to change it.
        var ins=await sb.from('card_roles').insert({card_type:'idea', card_id:lv.id, role:'cast_member', user_id:person.user_id,
                                                    added_by:me, status:'accepted', is_parent_connection:!!person.fromAbove});
        if(ins.error){ _flash(ins.error.message||'Could not add them.'); return; }
        _openPeople[lv.id]=true;
        _reload(false);
      },
      onClose: function(){ try{ menu.remove(); }catch(e){} }
    });
  }

  // ---------- Organization Chart (print) ----------
  // The whole Pyramid top-down: the line above, the TOPIC (bold box),
  // and every level below (highest priority first), each box with its
  // priority, its PRIMARY first, then its people with roles and titles;
  // a level with no PRIMARY says so. Contact details stay on the Call Sheet.
  function _printOrgChart(){
    var pr=document.getElementById('cr-print'); if(!pr || !_state) return;
    function box(lv, isCur){
      var lead=_leadOf(lv), st=_status(lv), open=!lead && !!st.warn;
      var h='<div class="crp-box'+(isCur?' crp-cur':'')+(open?' crp-open':'')+'"><div class="crp-lv">'+(_pri().badgeHTML(lv.priority)?_pri().badgeHTML(lv.priority)+' ':'')+_esc(lv.name)+'</div>';
      if(open) h+='<div class="crp-p crp-none">⚠ Needs a PRIMARY</div>';
      else if(!lead && st.status==='inherited' && st.primary_name) h+='<div class="crp-p crp-inh">↑ '+_esc(st.primary_name)+' (PRIMARY above)</div>';
      if(!lv.people.length && !open && !(st.status==='inherited' && st.primary_name)) h+='<div class="crp-p crp-r">—</div>';
      lv.people.forEach(function(p){
        var tags=_tags(p);
        h+='<div class="crp-p'+(p.levelPrimary?' crp-lead':'')+'">'+_esc(p.name)
          +(p.levelPrimary && p.load ? ' '+_load().badgeHTML(p.load) : '')
          +(p.title?' — <span class="crp-t">'+_esc(p.title)+'</span>':'')
          +(tags?' <span class="crp-r">('+_esc(tags)+')</span>':'')+'</div>';
      });
      return h+'</div>';
    }
    function below(lv){
      if(!lv.kids.length) return '';
      return '<ul>'+lv.kids.map(function(k){ return '<li>'+box(k,false)+below(k)+'</li>'; }).join('')+'</ul>';
    }
    // Levels above run as a single straight line down to the TOPIC.
    var chain=_state.ancestors.concat([_state.current]);
    var html='', closeTags='';
    chain.forEach(function(lv, i){
      var isCur=(i===chain.length-1);
      html+=(i===0?'<ul class="crp-tree">':'<ul>')+'<li>'+box(lv,isCur)+(isCur?below(lv):'');
      closeTags='</li></ul>'+closeTags;
    });
    var d=new Date();
    pr.innerHTML='<div class="crp-h">CAST ROSTER — '+_esc(_state.current.name)+'</div>'
      +'<div class="crp-sub">Organization Chart · '+_esc(d.toLocaleDateString())
      +(_warnLevels().length?' · ⚠ '+_warnLevels().length+' need'+(_warnLevels().length===1?'s':'')+' a PRIMARY':'')
      +' · Number beside a PRIMARY = projects they lead (⚠ amber at '+_load().limit+'+) · ↑ = PRIMARY carried down from above · Contact details are on the Call Sheet.</div>'
      +html+closeTags;
    document.body.classList.add('cr-printing');
    function done(){ document.body.classList.remove('cr-printing'); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function(){ window.print(); setTimeout(done, 1500); }, 50);
  }

  window.CastRoster={open:open, close:close};

})();
