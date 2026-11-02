/* ============================================================
   topic-pyramid.js -- T2T Field Guide - PROJECT PYRAMID
   Shared, board-agnostic renderer for the TOPIC hierarchy popup.

   Added Sept 20, 2026 -- Larry: single click on TOPIC is the right
   gesture (locked Sept 19, both boards), but the popup it opens --
   a flat, fully-expanded list of every header at every depth -- is
   overwhelming once TOPIC is MASTER, because that flattens every
   project's entire tree into one list at once. This replaces that
   flat list with a "pyramid": the straight line of ancestors above
   the current Topic (largest type at the root, shrinking one step
   per level -- there are no siblings in this line, just the direct
   climb up), the current Topic highlighted in the middle, and a
   collapsible, doll-in-doll tree of its descendants below (only the
   direct children show at first; each one gets its own arrow that
   opens its own children, indented and smaller again). One
   continuous size gradient top-to-bottom is what makes the whole
   thing read as a pyramid rather than three separate lists.

   Every row -- ancestor, current, or descendant, at any depth --
   carries a small check box. Oct 22 2026, Larry: "the check boxes in the
   topic selector [are] two click toggle boxes. Open or completed with a
   checkmark." It is now a real two-state toggle: an empty box is OPEN, a
   green box with a checkmark is COMPLETED, and each click flips it (the
   state is the topic's own ideas.step_done, the same "done" flag every
   card already has -- one flag, one meaning). Choosing a topic is still
   done by clicking its name (onNavigate below); the box only toggles.

   This file knows nothing about Supabase, ideas.cluster_id, or
   either board's own data shape -- it only renders rows and reports
   clicks. Each board hands it plain {id,name} objects and a
   getChildren(id) function that returns a Promise of the same shape
   (idea-storyboard-navigation.js's version resolves instantly, off
   its own in-memory cache; briefing-board-master-nav.js's version
   awaits a real Supabase fetch, same as its old flat-list version
   did) -- TopicPyramid doesn't care which.

   Load this file before idea-storyboard-navigation.js and before
   briefing-board-master-nav.js (both call TopicPyramid.render).
   ============================================================ */

(function(){

  var STEP_PX = 1.3;     // font-size shrink per pyramid level
  var FLOOR_PX = 10.5;   // never shrink past this
  var BASE_PX = 15;      // root-of-pyramid font size

  // PRIORITY, Sept 23 2026 -- Larry: H/M/L priority "should be across all
  // usages." One shared helper every screen uses (this Pyramid, the Cast
  // Roster, its Org Chart): same six values and colors the cards already
  // use (briefing-board-ops.js PRI_COLOR), highest first, and projects
  // with a priority listed ahead of those without, keeping their own
  // order inside each step.
  var PRI_RANK={HH:0,H:1,MH:2,M:3,ML:4,L:5};
  var PRI_BG={HH:'#7a0000', H:'#c0272a', MH:'#1f5c1f', M:'#3F8F3F', ML:'#b8ddb0', L:'#eeddaa'};
  var PRI_FG={HH:'#fff', H:'#fff', MH:'#fff', M:'#fff', ML:'#1f3a1a', L:'#3B2510'};
  var T2TPriority={
    rank:function(p){ return (p && PRI_RANK[p]!=null) ? PRI_RANK[p] : 9; },
    colors:function(p){ return {bg:PRI_BG[p]||'#9c8b73', fg:PRI_FG[p]||'#fff'}; },
    badgeHTML:function(p){
      if(!p || PRI_RANK[p]==null) return '';
      return '<span class="t2t-pri" title="Priority '+p+'" style="background:'+PRI_BG[p]+';color:'+PRI_FG[p]+'">'+p+'</span>';
    },
    // Stable: equal priorities keep the order they came in.
    sort:function(list, getP){
      return list.map(function(x,i){ return {x:x,i:i}; }).sort(function(a,b){
        return (T2TPriority.rank(getP(a.x))-T2TPriority.rank(getP(b.x))) || (a.i-b.i);
      }).map(function(o){ return o.x; });
    },
    ensureStyles:function(){
      if(document.getElementById('t2t-pri-styles')) return;
      var st=document.createElement('style'); st.id='t2t-pri-styles';
      st.textContent='.t2t-pri{flex:none;display:inline-block;min-width:14px;padding:0 4px;border-radius:4px;font-size:9px;line-height:14px;font-weight:700;text-align:center;letter-spacing:.02em;vertical-align:middle}';
      document.head.appendChild(st);
    }
  };
  window.T2TPriority=T2TPriority;

  // NEEDS A PRIMARY, Sept 23 2026 -- Larry: "If no one has been assigned,
  // isn't the PRIMARY person from the next higher level the automatic
  // PRIMARY on the level below?" (yes -- the boards' own rule) and "I
  // really like the triangle with the ! in it." ⚠ = this needs a decision:
  // a level with people on it but no PRIMARY picked, or the top of a
  // branch nobody owns. An empty level quietly inherits the PRIMARY above
  // and gets no ⚠. One shared lookup (public.primary_status) so the
  // Pyramid and the Cast Roster always agree. The only Supabase call in
  // this file -- skipped silently if there's no connection.
  var T2TPrimaryStatus=(function(){
    var cache={}, at={};
    function fetch(ids){
      var sb=window.T2T && window.T2T.sb;
      ids=(ids||[]).map(String).filter(function(id){ return id && id.indexOf('__')!==0; });
      var now=Date.now(), need=ids.filter(function(id){ return !cache[id] || now-at[id]>30000; });
      if(!sb || !need.length) return Promise.resolve(cache);
      return Promise.resolve(sb.rpc('primary_status', {p_ids:need})).then(function(res){
        ((res&&res.data)||[]).forEach(function(r){ cache[String(r.level_id)]=r; at[String(r.level_id)]=now; });
        return cache;
      }, function(){ return cache; });
    }
    return {fetch:fetch, invalidate:function(){ cache={}; at={}; }};
  })();
  window.T2TPrimaryStatus=T2TPrimaryStatus;

  // COMPLETED / OPEN, Oct 22 2026 -- one shared lookup and one shared write for the check boxes.
  // fetch(ids) -> Promise<{id: true|false}>; set(id, done) -> Promise<boolean saved>.
  var T2TTopicDone=(function(){
    var cache={};
    function realIds(ids){ return (ids||[]).map(String).filter(function(id){ return id && id!=='null' && id.indexOf('__')!==0; }); }
    function fetch(ids){
      var sb=window.T2T && window.T2T.sb;
      var need=realIds(ids).filter(function(id){ return !(id in cache); });
      if(!sb || !need.length) return Promise.resolve(cache);
      return Promise.resolve(sb.from('ideas').select('id,step_done').in('id',need)).then(function(res){
        ((res&&res.data)||[]).forEach(function(r){ cache[String(r.id)]=!!r.step_done; });
        return cache;
      }, function(){ return cache; });
    }
    function set(id, done){
      var sb=window.T2T && window.T2T.sb;
      if(!sb) return Promise.resolve(false);
      return Promise.resolve(sb.from('ideas').update({step_done:!!done}).eq('id',id).select('id')).then(function(res){
        var ok=!!(res && !res.error && res.data && res.data.length);
        if(ok) cache[String(id)]=!!done;
        return ok;
      }, function(){ return false; });
    }
    return {fetch:fetch, set:set, known:function(id){ return cache[String(id)]; }};
  })();
  window.T2TTopicDone=T2TTopicDone;

  function _tpPaintCheck(box, done){
    box.classList.toggle('tp-done', !!done);
    box.setAttribute('aria-checked', done ? 'true' : 'false');
    box.textContent=done ? '\u2713' : '';
    box.title=done ? 'Completed \u2014 click to reopen' : 'Open \u2014 click to mark completed';
  }
  function _tpDecorate(rows){
    if(!rows.length) return;
    T2TTopicDone.fetch(rows.map(function(r){ return r.getAttribute('data-tp-id'); })).then(function(map){
      rows.forEach(function(row){
        var box=row.querySelector('.tp-check');
        var id=row.getAttribute('data-tp-id');
        if(box && id in map) _tpPaintCheck(box, map[id]);
      });
    });
    T2TPrimaryStatus.fetch(rows.map(function(r){ return r.getAttribute('data-tp-id'); })).then(function(map){
      rows.forEach(function(row){
        var st=map[row.getAttribute('data-tp-id')];
        if(!st || !st.warn || row.querySelector('.tp-warn')) return;
        var w=document.createElement('span');
        w.className='tp-warn';
        w.textContent='⚠';
        w.title=st.status==='needs' ? 'Needs a PRIMARY — people are on it but no one is responsible yet' : 'No one is responsible for this branch yet';
        w.style.cssText='flex:none;color:#c77a00;font-size:.9em';
        var arrow=row.querySelector('.tp-arrow');
        row.insertBefore(w, arrow);
      });
    });
  }

  function _tpFontSize(depth){
    return Math.max(FLOOR_PX, BASE_PX - depth * STEP_PX);
  }

  function _tpEnsureStyles(){
    if(document.getElementById('tp-pyramid-styles')) return;
    var css=''
      +'.tp-row{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;cursor:default}'
      +'.tp-row:hover{background:rgba(0,0,0,.05)}'
      +'.tp-check{flex:none;width:14px;height:14px;margin:0 1px;border:1.5px solid currentColor;border-radius:3px;opacity:.6;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;font-weight:700;color:inherit;user-select:none}'
      +'.tp-check:hover{opacity:1}'
      +'.tp-check.tp-done{background:#1f9d55;border-color:#1f9d55;color:#fff;opacity:1}'
      +'.tp-arrow{flex:none;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:inherit;opacity:.7;transition:transform .15s;user-select:none}'
      +'.tp-arrow.tp-open{transform:rotate(90deg)}'
      +'.tp-arrow.tp-none{visibility:hidden;cursor:default}'
      +'.tp-label{cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tp-current .tp-label{cursor:default;font-weight:700}'
      +'.tp-current{background:rgba(0,0,0,.08);font-weight:700}'
      +'.tp-children{margin:0}'
      +'.tp-loading{opacity:.6;font-style:italic;padding:3px 6px 3px 26px}'
      +'.tp-here{background:rgba(26,58,92,.10);border-radius:4px}'
      +'.tp-here .tp-label{font-weight:700}';
    var style=document.createElement('style');
    style.id='tp-pyramid-styles';
    style.textContent=css;
    document.head.appendChild(style);
  }

  // Builds one row (ancestor, current, or descendant). depth drives
  // font size only -- indentation is driven separately by indentPx
  // so a descendant's nested children can step in further than the
  // ancestor trail (which never indents; it's a single vertical line).
  function _tpMakeRow(node, depth, indentPx, isCurrent, opts){
    if(opts.fullTree && opts.current && String(node.id)===String(opts.current.id)) isCurrent=true;
    var row=document.createElement('div');
    row.className='tp-row'+(isCurrent?' tp-current':'');
    if(node.id!=null) row.setAttribute('data-tp-id', String(node.id));
    row.style.paddingLeft=(6+indentPx)+'px';
    row.style.fontSize='calc('+_tpFontSize(depth)+'px * var(--fg-text-scale,1))';

    // Oct 22 2026 -- Larry: the box is a real two-state toggle, OPEN (empty) or COMPLETED (green with a checkmark);
    // each click flips it and saves at once. (Sept 20 it was a plain symbol; he now wants it to do something.)
    var check=document.createElement('span');
    check.className='tp-check';
    check.setAttribute('role','checkbox');
    _tpPaintCheck(check, T2TTopicDone.known(node.id)===true);
    if(node.id!=null && String(node.id).indexOf('__')!==0){
      check.addEventListener('click', function(e){
        e.stopPropagation();
        var was=check.classList.contains('tp-done'), next=!was;
        _tpPaintCheck(check, next);                       // shows at once
        T2TTopicDone.set(node.id, next).then(function(ok){
          if(!ok){ _tpPaintCheck(check, was); check.title='Could not save \u2014 try again'; return; }
          // Oct 25 2026 -- tell the story boards so the matching header wears (or loses) its green check at once.
          try{ window.dispatchEvent(new CustomEvent('t2t:topic-done', {detail:{id:node.id, done:next}})); }catch(_e){}
          // The database moves the topic's task to or from DONE; have the board re-read so it shows at once.
          if(typeof window._bbRefreshSoon==='function'){ window._bbRefreshSoon(600); setTimeout(function(){ window._bbRefreshSoon(0); }, 3000); }
        });
      });
    } else { check.style.visibility='hidden'; }
    row.appendChild(check);

    var label=document.createElement('span');
    label.className='tp-label';
    label.textContent=node.name||'(untitled)';
    row.appendChild(label);

    // Priority badge (Sept 23 2026) -- shows when the level has one.
    if(node.priority && T2TPriority.badgeHTML(node.priority)){
      T2TPriority.ensureStyles();
      var pri=document.createElement('span');
      pri.innerHTML=T2TPriority.badgeHTML(node.priority);
      row.appendChild(pri.firstChild);
    }

    // Sept 20 2026 -- Larry: arrow goes after the name, not before it
    // (checkbox, name, then arrow) -- matches the order he pictured.
    var arrow=document.createElement('span');
    arrow.className='tp-arrow tp-none'; // shown/armed below only for rows that may have children
    row.appendChild(arrow);

    // hereId (optional, Sept 22 2026 -- the Idea card's MOVE picker):
    // marks the row a card currently lives in, so it reads "you are here"
    // inside a tree that's otherwise all destinations.
    if(opts.hereId && String(node.id)===String(opts.hereId)){
      row.classList.add('tp-here');
      label.textContent=(node.name||'(untitled)')+'  ✓ here';
      setTimeout(function(){ try{ row.scrollIntoView({block:'nearest'}); }catch(e){} }, 0);
    }
    if(isCurrent && !opts.pickCurrent){
      row.title=node.name||'';
    } else {
      row.title='Click to open '+(node.name||'this')+'.';
      label.addEventListener('click', function(e){
        e.stopPropagation();
        if(typeof opts.onNavigate==='function') opts.onNavigate(node.id);
      });
    }

    return {row:row, arrow:arrow};
  }

  // Renders one level of children under parentRow (a doll-in-doll
  // step: further indented, one font-size notch smaller). Lazy --
  // only fetches when the caller's arrow is actually clicked.
  function _tpWireExpand(arrowEl, parentRow, node, depth, indentPx, opts){
    var expanded=false, loaded=false, childWrap=null;
    arrowEl.classList.remove('tp-none');
    arrowEl.textContent='▸';
    arrowEl.addEventListener('click', function(e){
      e.stopPropagation();
      if(!loaded){
        loaded=true;
        childWrap=document.createElement('div');
        childWrap.className='tp-children';
        var loadingRow=document.createElement('div');
        loadingRow.className='tp-loading';
        loadingRow.textContent='Loading…';
        childWrap.appendChild(loadingRow);
        parentRow.insertAdjacentElement('afterend', childWrap);
        Promise.resolve(opts.getChildren(node.id)).then(function(kids){
          childWrap.innerHTML='';
          if(!kids || !kids.length){
            arrowEl.classList.add('tp-none');
            arrowEl.replaceWith(arrowEl.cloneNode(true)); // drop the click handler, nothing to open
            return;
          }
          // fullTree (Oct 11 2026, Larry: "A-Z makes finding the desired topic easier"): always A to Z; priority stays a badge, never an order.
          kids=opts.fullTree ? kids.slice().sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''), undefined, {sensitivity:'base'}); }) : T2TPriority.sort(kids, function(k){ return k.priority; });
          var made=[];
          kids.forEach(function(kid){
            var built=_tpMakeRow(kid, depth+1, indentPx+14, false, opts);
            childWrap.appendChild(built.row);
            made.push(built.row);
            _tpWireExpand(built.arrow, built.row, kid, depth+1, indentPx+14, opts);
            _tpAutoExpand(built.arrow, kid, opts);
          });
          _tpDecorate(made);
          if(opts.fullTree && opts._menuEl){ var cr=opts._menuEl.querySelector('.tp-current'); if(cr && cr.scrollIntoView) cr.scrollIntoView({block:'center'}); }
        }, function(){
          childWrap.innerHTML='<div class="tp-loading">Couldn\'t load — try again.</div>';
        });
      }
      expanded=!expanded;
      arrowEl.classList.toggle('tp-open', expanded);
      arrowEl.textContent=expanded?'▾':'▸';
      if(childWrap) childWrap.style.display=expanded?'':'none';
    });
  }

  // expandPath (optional, Sept 22 2026): ids to open automatically on
  // the way down, top level first -- lets a caller open the tree already
  // unfolded to one spot (the Idea card MOVE picker opens at the card's
  // own location). Each level opens once its parent's children arrive.
  function _tpAutoExpand(arrowEl, node, opts){
    if(!opts.expandPath || opts.expandPath.indexOf(String(node.id))===-1) return;
    // The arrow may have been cloned away (no children); only click a live one.
    if(arrowEl && arrowEl.isConnected && !arrowEl.classList.contains('tp-none')) arrowEl.click();
  }

  // ---- SEARCH THE TOPIC LIST (Nov 2 2026) -----------------------------------
  // Larry: a magnifying glass ("it always says look deeper") is the only button at the bottom right of the TOPIC selector. It opens a search
  // popup: type a subject, see the existing TOPIC by that name and near matches (numbered), peek inside each before choosing, or add a new
  // topic with the dashed (+). The (+) has no visible home line -- its tooltip says where the new topic will go (the topic you were standing
  // on, or the one you opened a peek on and chose to add under).
  // The caller supplies: opts.onSearch(text) -> Promise<[{id,name,path,inside}]>, opts.onPeek(id) -> Promise<{items:[{name,header}],more}>,
  // opts.onAdd(parentId, typedName, explicit) (optional), opts.getHomeName() -> Promise<string> (optional).
  function _tpSearchRow(menuEl, opts){
    var wrap=document.createElement('div');
    wrap.className='tp-addrow';
    wrap.style.cssText='display:flex;justify-content:flex-end;padding:6px 6px 2px;margin-top:4px;border-top:1px solid rgba(128,128,128,.3)';
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='tp-search-btn';
    btn.title='Search the topics';
    btn.setAttribute('aria-label','Search the topics');
    btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><line x1="15" y1="15" x2="21" y2="21"/></svg>';
    var col=window.T2TAddControl ? T2TAddControl.ink(menuEl) : '#3d3326';
    btn.style.cssText='width:26px;height:26px;display:flex;align-items:center;justify-content:center;padding:0;background:transparent;border:0;border-radius:50%;cursor:pointer;opacity:.8;color:'+col;
    btn.addEventListener('mouseenter', function(){ btn.style.opacity='1'; btn.style.background='rgba(128,128,128,.18)'; });
    btn.addEventListener('mouseleave', function(){ btn.style.opacity='.8'; btn.style.background='transparent'; });
    btn.addEventListener('click', function(e){ e.stopPropagation(); _tpOpenSearch(menuEl, opts); });
    wrap.appendChild(btn);
    menuEl.appendChild(wrap);
  }

  function _tpOpenSearch(menuEl, opts){
    if(menuEl.querySelector('.tp-search-panel')) return;
    var hidden=[];
    Array.prototype.slice.call(menuEl.children).forEach(function(ch){ hidden.push({el:ch, d:ch.style.display}); ch.style.display='none'; });
    var panel=document.createElement('div');
    panel.className='tp-search-panel';
    panel.style.cssText='padding:6px';
    panel.addEventListener('click', function(e){ e.stopPropagation(); });

    var top=document.createElement('div');
    top.style.cssText='display:flex;align-items:center;gap:6px';
    var input=document.createElement('input');
    input.type='text';
    input.placeholder='Search topics…';
    input.setAttribute('aria-label','Search topics');
    // Nov 2 2026 (Larry): the typed text was black on dark blue. On a dark list it is now white (placeholder softer white) so it stands out; on a light list, dark ink.
    var darkMenu=window.T2TAddControl ? T2TAddControl.isDark(menuEl) : false;
    var typedInk=darkMenu ? '#ffffff' : '#1f1a12';
    input.classList.add('tp-search-input');
    input.style.cssText='flex:1;min-width:0;box-sizing:border-box;padding:5px 8px;border:1px solid '+(darkMenu ? 'rgba(255,255,255,.6)' : 'rgba(128,128,128,.55)')+';border-radius:6px;background:'+(darkMenu ? 'rgba(255,255,255,.08)' : 'transparent')+';color:'+typedInk+';caret-color:'+typedInk+';font:inherit';
    if(!document.getElementById('tp-search-input-styles')){
      var st=document.createElement('style'); st.id='tp-search-input-styles';
      st.textContent='.tp-search-panel .tp-search-input::placeholder{color:inherit;opacity:.65}';
      document.head.appendChild(st);
    }
    var close=document.createElement('button');
    close.type='button'; close.textContent='×'; close.title='Close search'; close.setAttribute('aria-label','Close search');
    close.style.cssText='flex:none;width:24px;height:24px;padding:0;background:transparent;border:0;color:inherit;font-size:18px;line-height:1;cursor:pointer;opacity:.7';
    top.appendChild(input); top.appendChild(close);
    panel.appendChild(top);

    var results=document.createElement('div');
    results.style.cssText='margin-top:6px';
    panel.appendChild(results);

    var foot=document.createElement('div');
    foot.style.cssText='display:flex;justify-content:center;padding:6px 0 2px;margin-top:4px;border-top:1px solid rgba(128,128,128,.3)';
    var addBtn=null;
    var homeName=(opts.current && opts.current.name) || 'this topic';
    if(typeof opts.onAdd==='function'){
      addBtn=window.T2TAddControl
        ? T2TAddControl.make({title:'Add a new topic under '+homeName, sense:menuEl})
        : (function(){ var b=document.createElement('button'); b.type='button'; b.textContent='+'; b.title='Add a new topic under '+homeName; return b; })();
      addBtn.addEventListener('click', function(e){ e.stopPropagation(); opts.onAdd(opts.current.id, input.value.trim(), false); });
      foot.appendChild(addBtn);
      panel.appendChild(foot);
      if(typeof opts.getHomeName==='function'){
        Promise.resolve(opts.getHomeName()).then(function(n){ if(n && addBtn) addBtn.title='Add a new topic under '+n; }, function(){});
      }
    }
    menuEl.appendChild(panel);

    function closePanel(){
      panel.remove();
      hidden.forEach(function(h){ h.el.style.display=h.d; });
    }
    close.addEventListener('click', function(e){ e.stopPropagation(); closePanel(); });
    input.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.stopPropagation(); closePanel(); } });

    function note(msg){ results.innerHTML=''; var d=document.createElement('div'); d.className='tp-loading'; d.style.paddingLeft='6px'; d.textContent=msg; results.appendChild(d); }
    function addPeek(m, rowWrap){
      var peekBox=null, open=false, loaded=false;
      var tog=document.createElement('button');
      tog.type='button'; tog.textContent='▸'; tog.title='Peek inside '+m.name;
      tog.style.cssText='flex:none;width:20px;height:20px;padding:0;background:transparent;border:0;color:inherit;cursor:pointer;opacity:.7;font-size:11px';
      tog.addEventListener('click', function(e){
        e.stopPropagation();
        open=!open; tog.textContent=open?'▾':'▸';
        if(!peekBox){ peekBox=document.createElement('div'); peekBox.style.cssText='margin:2px 0 4px 26px;font-size:12px;opacity:.85'; rowWrap.appendChild(peekBox); }
        peekBox.style.display=open?'':'none';
        if(open && !loaded){
          loaded=true; peekBox.textContent='Loading…';
          Promise.resolve(typeof opts.onPeek==='function' ? opts.onPeek(m.id) : {items:[],more:false}).then(function(p){
            peekBox.innerHTML='';
            var items=(p && p.items) || [];
            if(!items.length){ peekBox.textContent='Nothing inside yet.'; }
            items.forEach(function(it){ var li=document.createElement('div'); li.style.cssText='white-space:nowrap;overflow:hidden;text-overflow:ellipsis'+(it.header?';font-weight:600':''); li.textContent='• '+it.name; peekBox.appendChild(li); });
            if(p && p.more){ var mo=document.createElement('div'); mo.textContent='… and more'; mo.style.opacity='.7'; peekBox.appendChild(mo); }
            // The (+) in the peek: put the new topic HERE (Larry: "search for a home and add it where it fits best").
            if(typeof opts.onAdd==='function'){
              var plus=window.T2TAddControl
                ? T2TAddControl.make({title:'Add a new topic under '+m.name, sense:menuEl, size:18})
                : (function(){ var b=document.createElement('button'); b.type='button'; b.textContent='+'; b.title='Add a new topic under '+m.name; return b; })();
              plus.style.marginTop='4px';
              plus.addEventListener('click', function(ev){ ev.stopPropagation(); opts.onAdd(m.id, input.value.trim(), true); });
              peekBox.appendChild(plus);
            }
          }, function(){ peekBox.textContent='Couldn’t look inside — try again.'; });
        }
      });
      return tog;
    }
    function show(list){
      results.innerHTML='';
      if(!list || !list.length){ note('No topic by that name.'); return; }
      list.forEach(function(m, i){
        var rowWrap=document.createElement('div');
        var row=document.createElement('div');
        row.className='tp-row';
        row.style.fontSize='calc(13px * var(--fg-text-scale,1))';
        var num=document.createElement('span'); num.textContent=(i+1)+'.'; num.style.cssText='flex:none;min-width:16px;opacity:.7';
        // Nov 2 2026 (Larry): each match reads MASTER > topic > header > ... > its own name (bold), wrapping onto more lines so nothing is cut off.
        row.style.alignItems='flex-start';
        var label=document.createElement('span'); label.className='tp-label';
        label.style.cssText='white-space:normal;overflow:visible;text-overflow:clip;word-break:break-word;line-height:1.3';
        if(m.path){ var pt=document.createElement('span'); pt.style.opacity='.75'; pt.textContent=m.path+' > '; label.appendChild(pt); }
        var nm=document.createElement('strong'); nm.textContent=m.name; label.appendChild(nm);
        if(typeof m.inside==='number'){ var ins=document.createElement('span'); ins.style.opacity='.7'; ins.textContent='  ('+m.inside+' inside)'; label.appendChild(ins); }
        label.title='Click to open '+m.name+'.';
        label.addEventListener('click', function(e){ e.stopPropagation(); if(typeof opts.onNavigate==='function') opts.onNavigate(m.id); });
        row.appendChild(num); row.appendChild(label); row.appendChild(addPeek(m, rowWrap));
        rowWrap.insertBefore(row, rowWrap.firstChild);
        results.appendChild(rowWrap);
      });
    }

    var timer=null, token=0;
    input.addEventListener('input', function(){
      clearTimeout(timer);
      var text=input.value.trim();
      if(!text){ token++; results.innerHTML=''; return; }
      timer=setTimeout(function(){
        var mine=++token;
        note('Searching…');
        Promise.resolve(opts.onSearch(text)).then(function(list){ if(mine===token) show(list); }, function(){ if(mine===token) note('Couldn’t search — try again.'); });
      }, 250);
    });
    setTimeout(function(){ try{ input.focus(); }catch(e){} }, 0);
  }

  // (+) at the bottom of the current Topic's children, Sept 29 2026 -- Larry:
  // "show all the current topics with a (+) at the bottom to add a new topic
  // if desired." Same dashed-circle (+) every other dropdown ends with.
  // Only drawn when the caller supplies opts.onAdd(parentId); the pyramid
  // itself still knows nothing about how a topic gets created.
  function _tpAddRow(menuEl, opts){
    // Nov 2 2026 (Larry): when the caller can search, the magnifying glass is the ONLY button at the bottom; the (+) lives inside the search popup.
    if(typeof opts.onSearch==='function'){ _tpSearchRow(menuEl, opts); return; }
    if(typeof opts.onAdd!=='function') return;
    var wrap=document.createElement('div');
    wrap.className='tp-addrow';
    wrap.style.cssText='display:flex;justify-content:center;padding:6px 0 2px;margin-top:4px;border-top:1px solid rgba(128,128,128,.3)';
    // The (+) is the one shared control (add-control.js): white on a dark
    // list, dark ink on a light one, sensed from this menu's own background.
    var btn=window.T2TAddControl
      ? T2TAddControl.make({title:'Add a new topic under '+(opts.current.name||'this'), sense:menuEl})
      : (function(){ var b=document.createElement('button'); b.type='button'; b.textContent='+'; b.title='Add a new topic under '+(opts.current.name||'this'); return b; })();
    btn.addEventListener('click', function(e){ e.stopPropagation(); opts.onAdd(opts.current.id); });
    wrap.appendChild(btn);
    menuEl.appendChild(wrap);
  }

  // Every {id,name} may also carry priority ('HH'..'L') -- Sept 23 2026:
  // shown as a badge, and children are listed highest priority first.
  // opts = {
  //   ancestors: [{id,name}, ...]  -- root..parent order, current excluded
  //   current: {id,name},
  //   getChildren: function(id) -> Promise<[{id,name}]>,
  //   onNavigate: function(id),
  //   checkedIds: Set (optional, shared/persisted across opens if the caller keeps it),
  //   onCheckChange: function(id, checked)  -- optional
  // }
  function render(menuEl, opts){
    _tpEnsureStyles();
    menuEl.innerHTML='';
    opts.checkedIds=opts.checkedIds||new Set();

    // fullTree (Oct 11 2026, Larry: "the full one tree with carrots to expand
    // to any topic or subtopic ... the same on every ID BAND"): the whole tree
    // from its top row, a caret on every row, the path to the current topic
    // already open and the current topic highlighted. Same rows, same carets
    // on every board.
    if(opts.fullTree){
      opts._menuEl=menuEl;
      var path=(opts.ancestors||[]).concat([opts.current]);
      // Oct 15 2026 (Larry: "all topics should remain collapsed unless the current topic is a child"): open only the line of ANCESTORS
      // down to the current topic, so it shows among its siblings with its own children closed. At the very top (MASTER) the top row opens.
      opts.expandPath=(opts.ancestors && opts.ancestors.length ? opts.ancestors : [opts.current]).map(function(n){ return String(n.id); });
      var top=path[0];
      var topBuilt=_tpMakeRow(top, 0, 0, false, opts);
      menuEl.appendChild(topBuilt.row);
      _tpWireExpand(topBuilt.arrow, topBuilt.row, top, 0, 0, opts);
      _tpDecorate([topBuilt.row]);
      _tpAddRow(menuEl, opts);
      _tpAutoExpand(topBuilt.arrow, top, opts);
      return topBuilt.row;
    }

    (opts.ancestors||[]).forEach(function(a, i){
      var built=_tpMakeRow(a, i, 0, false, opts);
      menuEl.appendChild(built.row);
    });

    var curDepth=(opts.ancestors||[]).length;
    var curBuilt=_tpMakeRow(opts.current, curDepth, 0, true, opts);
    menuEl.appendChild(curBuilt.row);
    var topRows=Array.prototype.slice.call(menuEl.querySelectorAll('.tp-row'));

    var loadingRow=document.createElement('div');
    loadingRow.className='tp-loading';
    loadingRow.textContent='Loading…';
    menuEl.appendChild(loadingRow);

    Promise.resolve(opts.getChildren(opts.current.id)).then(function(kids){
      loadingRow.remove();
      kids=T2TPriority.sort(kids||[], function(k){ return k.priority; });
      kids.forEach(function(kid){
        var built=_tpMakeRow(kid, curDepth+1, 14, false, opts);
        menuEl.appendChild(built.row);
        topRows.push(built.row);
        _tpWireExpand(built.arrow, built.row, kid, curDepth+1, 14, opts);
        _tpAutoExpand(built.arrow, kid, opts);
      });
      _tpDecorate(topRows);
      _tpAddRow(menuEl, opts);
    }, function(){
      loadingRow.textContent='Couldn\'t load — try again.';
      _tpDecorate(topRows);
    });

    return curBuilt.row; // for the caller's own scrollIntoView, same as the old flat list
  }

  window.TopicPyramid={render:render};

})();
