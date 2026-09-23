/* ============================================================
   cast-roster.js -- T2T Field Guide -- CAST ROSTER (Pyramid + people)

   Added Sept 23 2026. Larry: "I envision the Cast Roster as The
   Project Pyramid with the current TOPIC level open to all team
   members and anyone with permission, the same permissions that a
   person has for viewing or editing projects." Printing: "more like an
   Organization Chart with roles and titles, reserving the call sheet
   for contact info." Titles are per level (Larry: "per level") -- the
   same person can hold a different title on each level.

   What it shows (same shape and size gradient as topic-pyramid.js):
     - the straight line of levels above the current TOPIC (collapsed)
     - the current TOPIC, highlighted, with its whole team open
     - the levels below, doll-in-doll: direct children show first,
       each with its own arrow to open its own children
   Every level row: tap its name to open/close that level's people;
   the arrow after it opens the levels beneath.
   Each person: first name (Disney style, same as the Cast pick list),
   role tags, and a title. Anyone who can edit that project can type a
   title in place; everyone else just reads it.

   Opened by the STORYBOARD dropdown's CAST choice on BOTH boards
   (idea-storyboard-navigation.js and briefing-board-master-nav.js) --
   one screen for both, replacing the Idea Board's flat Project Cast
   Roster and the Briefing Board's older team list as CAST's
   destination (both older screens stay in place, just unused by CAST).

   Data: public.cast_roster_tree(p_topic) and set_level_title(...)
   in Supabase. Viewing follows the project's own view rule; editing
   titles follows the project's own "manage Cast" rule -- no separate
   permission system.

   Self-contained (own IIFE, own styles). Uses window.T2T.sb and,
   when loaded, cast-pick-list.js's _bbCastFirstNames for first names.
   Exposes window.CastRoster.open(topicId).
   ============================================================ */

(function(){

  var STEP_PX = 1.3, FLOOR_PX = 10.5, BASE_PX = 15;   // same gradient as topic-pyramid.js
  function _fontPx(depth){ return Math.max(FLOOR_PX, BASE_PX - depth * STEP_PX); }

  var ROLE_ORDER = { primary:0, key:1, team:2, cast_member:3, facilitator:4, facilitator_qualified:5, stakeholder:6, guest:7 };
  var ROLE_LABEL = { primary:'PRIMARY', team:'Team', cast_member:'Cast', facilitator:'Facilitator',
                     facilitator_qualified:'Facilitator', stakeholder:'Stakeholder', guest:'Guest' };

  function _sb(){ return window.T2T && window.T2T.sb; }
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function _clean(name){ return String(name||'(untitled)').replace(/\s+/g,' ').trim(); }

  // ---------- styles ----------
  function _ensureStyles(){
    if(document.getElementById('cr-styles')) return;
    var css=''
      +'#cr-overlay{display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,20,18,.55);align-items:center;justify-content:center;padding:16px;box-sizing:border-box}'
      +'#cr-card{text-align:left;background:#F5F1E8;color:#2C2C2A;border-radius:14px;padding:16px;box-shadow:0 10px 24px rgba(0,0,0,.3);max-height:88vh;overflow-y:auto;width:min(560px,100%);box-sizing:border-box}'
      +'.cr-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}'
      +'.cr-title{flex:1;font-size:calc(11px * var(--fg-text-scale,1));font-weight:600;letter-spacing:.08em}'
      +'.cr-btn{height:24px;padding:0 9px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));color:#2C2C2A}'
      +'.cr-sub{font-size:calc(10px * var(--fg-text-scale,1));color:#5b5b56;margin-bottom:10px}'
      +'.cr-level{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px}'
      +'.cr-level:hover{background:rgba(0,0,0,.05)}'
      +'.cr-level.cr-current{background:rgba(26,58,92,.12)}'
      +'.cr-level.cr-current .cr-lname{font-weight:700}'
      +'.cr-lname{cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.cr-lead{font-size:.82em;color:#5b5b56;white-space:nowrap}'
      +'.cr-count{font-size:.78em;color:#8a877e;white-space:nowrap}'
      +'.cr-arrow{flex:none;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;opacity:.7;user-select:none}'
      +'.cr-arrow.cr-none{visibility:hidden;cursor:default}'
      +'.cr-people{margin:2px 0 6px;border-left:2px solid rgba(26,58,92,.18)}'
      +'.cr-person{display:flex;align-items:center;gap:8px;padding:3px 8px;font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.cr-pname{font-weight:600;white-space:nowrap}'
      +'.cr-tags{font-size:.85em;color:#5b5b56;white-space:nowrap}'
      +'.cr-star{color:#c9a227}'
      +'.cr-ptitle{flex:1;min-width:60px;font-style:italic;color:#44443f;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'input.cr-ptitle{font:inherit;font-style:italic;border:1px solid transparent;background:transparent;border-radius:4px;padding:1px 4px}'
      +'input.cr-ptitle:hover{border-color:#d8d4c8}'
      +'input.cr-ptitle:focus{border-color:#B4B2A9;background:#fff;outline:none;font-style:normal}'
      +'.cr-empty{padding:3px 8px;font-size:calc(11px * var(--fg-text-scale,1));color:#8a877e}'
      +'.cr-msg{padding:6px;font-size:calc(11px * var(--fg-text-scale,1));color:#5b5b56}'
      +'.cr-err{color:#b8562f}'
      // Org chart (print only)
      +'#cr-print{display:none}'
      +'@media print{'
        +'body.cr-printing *{visibility:hidden}'
        +'body.cr-printing #cr-print,body.cr-printing #cr-print *{visibility:visible}'
        +'body.cr-printing #cr-print{display:block;position:absolute;left:0;top:0;width:100%;padding:.3in;box-sizing:border-box;color:#000;font-family:inherit}'
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
      +'.crp-box{display:inline-block;border:1px solid #555;border-radius:6px;padding:5px 8px;min-width:110px;max-width:200px;font-size:9.5px;background:#fff;page-break-inside:avoid;text-align:left}'
      +'.crp-box.crp-cur{border-width:2px}'
      +'.crp-lv{font-weight:700;font-size:10.5px;text-align:center;border-bottom:1px solid #ccc;padding-bottom:3px;margin-bottom:3px}'
      +'.crp-lead{font-weight:700}'
      +'.crp-p{margin:1px 0}'
      +'.crp-t{font-style:italic;color:#333}'
      +'.crp-r{color:#555}';
    var st=document.createElement('style'); st.id='cr-styles'; st.textContent=css;
    document.head.appendChild(st);
  }

  // ---------- data ----------
  // Builds {levels:{id:level}, order:[...], current, ancestors:[...]} from
  // the flat rows cast_roster_tree returns (one row per level+person, or
  // one bare row for a level with nobody on it yet).
  function _shape(rows, topicId){
    var levels={}, order=[];
    rows.forEach(function(r){
      var id=String(r.level_id);
      var lv=levels[id];
      if(!lv){
        lv=levels[id]={id:id, parentId:r.parent_id?String(r.parent_id):null, name:_clean(r.level_name),
                       rel:r.rel_depth, sort:r.sort_order, canEdit:!!r.can_edit, people:[], kids:[]};
        order.push(lv);
      }
      if(r.user_id){
        lv.people.push({userId:String(r.user_id), name:r.person_name||'(unknown)', roles:r.roles||[],
                        title:r.title||'', isKey:!!r.is_key, thread:!!r.thread, levelPrimary:!!r.level_primary});
      }
    });
    order.forEach(function(lv){
      if(lv.rel>0 && lv.parentId && levels[lv.parentId]) levels[lv.parentId].kids.push(lv);
      _nameAndSortPeople(lv.people);
    });
    order.forEach(function(lv){ lv.kids.sort(function(a,b){ return (a.sort==null?1e18:a.sort)-(b.sort==null?1e18:b.sort); }); });
    var ancestors=order.filter(function(l){ return l.rel<0; }).sort(function(a,b){ return a.rel-b.rel; });
    return {levels:levels, current:levels[String(topicId)]||null, ancestors:ancestors};
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
  function _lead(lv){
    var p=lv.people.filter(function(x){ return x.levelPrimary; })[0];
    return p ? p.shortName : '';
  }

  // ---------- screen ----------
  var _state=null;

  function _ensureOverlay(){
    if(document.getElementById('cr-overlay')) return;
    var ov=document.createElement('div');
    ov.id='cr-overlay';
    ov.innerHTML='<div id="cr-card"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape' && ov.style.display==='flex' && !(document.activeElement && document.activeElement.classList.contains('cr-ptitle'))) close();
    });
    var pr=document.createElement('div'); pr.id='cr-print'; document.body.appendChild(pr);
  }

  async function open(topicId){
    _ensureStyles(); _ensureOverlay();
    var ov=document.getElementById('cr-overlay'), card=document.getElementById('cr-card');
    card.innerHTML='<div class="cr-head"><span class="cr-title">👥 CAST ROSTER</span>'
      +'<button class="cr-btn" id="cr-print-btn" title="Print as an Organization Chart" disabled>🖨 Org Chart</button>'
      +'<button class="cr-btn" id="cr-close" aria-label="Close">✕</button></div>'
      +'<div class="cr-sub">Tap a level to see its people. The arrow opens the levels beneath.</div>'
      +'<div id="cr-body"><div class="cr-msg">Loading…</div></div>';
    ov.style.display='flex';
    document.getElementById('cr-close').onclick=close;
    var body=document.getElementById('cr-body');
    if(!topicId){ body.innerHTML='<div class="cr-msg">Open a project first.</div>'; return; }
    var sb=_sb();
    if(!sb){ body.innerHTML='<div class="cr-msg cr-err">Not connected.</div>'; return; }
    var res;
    try{ res=await sb.rpc('cast_roster_tree', {p_topic:topicId}); }catch(e){ res={error:e}; }
    if(res.error){ body.innerHTML='<div class="cr-msg cr-err">'+_esc(res.error.message||'Could not load the Cast Roster.')+'</div>'; return; }
    _state=_shape(res.data||[], topicId);
    if(!_state.current){ body.innerHTML='<div class="cr-msg">Nothing to show here yet.</div>'; return; }
    _render(body);
    var pb=document.getElementById('cr-print-btn');
    pb.disabled=false; pb.onclick=_printOrgChart;
  }

  function close(){
    var ov=document.getElementById('cr-overlay');
    if(ov) ov.style.display='none';
  }

  function _render(body){
    body.innerHTML='';
    var depth=0;
    _state.ancestors.forEach(function(lv){
      body.appendChild(_levelBlock(lv, depth, 0, false, false));
      depth++;
    });
    body.appendChild(_levelBlock(_state.current, depth, 0, true, true));
    _state.current.kids.forEach(function(kid){
      body.appendChild(_levelBlock(kid, depth+1, 14, false, false));
    });
    var cur=body.querySelector('.cr-current');
    if(cur && cur.scrollIntoView) setTimeout(function(){ try{ cur.scrollIntoView({block:'nearest'}); }catch(e){} }, 0);
  }

  // One level: its row, its (hidden or open) people, and a slot for
  // its children (opened by the arrow; ancestors never show children --
  // the line above is a straight climb, same as the Pyramid).
  function _levelBlock(lv, depth, indent, isCurrent, peopleOpen){
    var wrap=document.createElement('div');
    var row=document.createElement('div');
    row.className='cr-level'+(isCurrent?' cr-current':'');
    row.style.paddingLeft=(6+indent)+'px';
    row.style.fontSize='calc('+_fontPx(depth)+'px * var(--fg-text-scale,1))';
    var lead=_lead(lv);
    row.innerHTML='<span class="cr-lname" title="Show or hide the people on '+_esc(lv.name)+'">'+_esc(lv.name)+'</span>'
      +(lead?'<span class="cr-lead">· '+_esc(lead)+'</span>':'')
      +'<span class="cr-count">('+lv.people.length+')</span>'
      +'<span class="cr-arrow'+((lv.rel>=0 && lv.kids.length)?'':' cr-none')+'">▸</span>';
    wrap.appendChild(row);

    var people=_peopleBlock(lv, indent);
    people.style.display=peopleOpen?'':'none';
    wrap.appendChild(people);
    row.querySelector('.cr-lname').addEventListener('click', function(){
      people.style.display=(people.style.display==='none')?'':'none';
    });

    if(lv.rel>=0 && lv.kids.length){
      var kidsWrap=null, open=false, arrow=row.querySelector('.cr-arrow');
      // The current TOPIC's direct children already show beneath it.
      if(isCurrent){ arrow.classList.add('cr-none'); }
      else arrow.addEventListener('click', function(){
        if(!kidsWrap){
          kidsWrap=document.createElement('div');
          lv.kids.forEach(function(k){ kidsWrap.appendChild(_levelBlock(k, depth+1, indent+14, false, false)); });
          wrap.appendChild(kidsWrap);
        }
        open=!open;
        kidsWrap.style.display=open?'':'none';
        arrow.textContent=open?'▾':'▸';
      });
    }
    return wrap;
  }

  function _peopleBlock(lv, indent){
    var box=document.createElement('div');
    box.className='cr-people';
    box.style.marginLeft=(14+indent)+'px';
    if(!lv.people.length){
      box.innerHTML='<div class="cr-empty">No one on this level yet.</div>';
      return box;
    }
    lv.people.forEach(function(p){
      var r=document.createElement('div');
      r.className='cr-person';
      r.title=p.name;
      var tags=_tags(p);
      r.innerHTML='<span class="cr-pname">'+_esc(p.shortName)+(p.thread?' <span class="cr-star" title="Carried over from the level above">★</span>':'')+'</span>'
        +(tags?'<span class="cr-tags">'+_esc(tags)+'</span>':'');
      if(lv.canEdit){
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
        r.appendChild(inp);
      } else if(p.title){
        var t=document.createElement('span'); t.className='cr-ptitle'; t.textContent=p.title;
        r.appendChild(t);
      }
      box.appendChild(r);
    });
    return box;
  }

  // ---------- Organization Chart (print) ----------
  // The whole Pyramid top-down: the line above, the TOPIC (bold box),
  // and every level below, each box with its PRIMARY first, then its
  // people with roles and titles. Contact details stay on the Call Sheet.
  function _printOrgChart(){
    var pr=document.getElementById('cr-print'); if(!pr || !_state) return;
    function box(lv, isCur){
      var h='<div class="crp-box'+(isCur?' crp-cur':'')+'"><div class="crp-lv">'+_esc(lv.name)+'</div>';
      if(!lv.people.length) h+='<div class="crp-p crp-r">—</div>';
      lv.people.forEach(function(p){
        var tags=_tags(p);
        h+='<div class="crp-p'+(p.levelPrimary?' crp-lead':'')+'">'+_esc(p.name)
          +(p.title?' — <span class="crp-t">'+_esc(p.title)+'</span>':'')
          +(tags?' <span class="crp-r">('+_esc(tags)+')</span>':'')+'</div>';
      });
      return h+'</div>';
    }
    function below(lv){
      if(!lv.kids.length) return '';
      return '<ul>'+lv.kids.map(function(k){ return '<li>'+box(k,false)+below(k)+'</li>'; }).join('')+'</ul>';
    }
    // Ancestors as a single straight line down to the TOPIC.
    var chain=_state.ancestors.concat([_state.current]);
    var html='', close='';
    chain.forEach(function(lv, i){
      var isCur=(i===chain.length-1);
      html+=(i===0?'<ul class="crp-tree">':'<ul>')+'<li>'+box(lv,isCur)+(isCur?below(lv):'');
      close='</li></ul>'+close;
    });
    var d=new Date();
    pr.innerHTML='<div class="crp-h">CAST ROSTER — '+_esc(_state.current.name)+'</div>'
      +'<div class="crp-sub">Organization Chart · '+_esc(d.toLocaleDateString())+' · Contact details are on the Call Sheet.</div>'
      +html+close;
    document.body.classList.add('cr-printing');
    function done(){ document.body.classList.remove('cr-printing'); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function(){ window.print(); setTimeout(done, 1500); }, 50);
  }

  window.CastRoster={open:open, close:close};

})();
