/* ============================================================
   focus.js — 9611 FOCUS, front door for the whole Tools chapter
   Extracted from sea-of-ideas.js July 11, 2026 as its own module —
   FOCUS gates entry into any board, it was never a Sea of Ideas
   concern specifically.

   Locked design (July 11, 2026):
   - PROJECT: the root anchor. Fixed while you navigate, but
     interactive — tap it to switch to a different project or
     create a new one (a lateral jump, not a step in the drill).
   - TOPIC: your current position. Its dropdown shows only the
     ACTIVE (non-reserved) direct children of wherever you
     currently stand — one real level, never the whole tree.
     Picking one, or creating a new one, steps you one level
     deeper. Reserved headers (Purpose/MISC/NEW/Trash) never
     appear as choices at any depth — they're content buckets,
     not destinations.
   - PARENT: whatever is one level directly above TOPIC. Tap it
     to step back up exactly one level. Blank/inert only when
     TOPIC === PROJECT, since there's genuinely nothing above.
   - Begin: opens the shotgun board for whatever TOPIC currently
     is, at whatever depth that happens to be.

   No separate HEADER rung — Purpose/MISC/NEW/custom headers are
   the board's concern once you're inside a TOPIC, not FOCUS's.
   ============================================================ */

(function(){

  var _returnTarget = 's-sea-of-ideas-cluster';
  var _state = null;
  var _openDropdown = null;

  function injectFocusScreen(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-focus')) return;
    if(!document.getElementById('focus-style')){
      var style=document.createElement('style');
      style.id='focus-style';
      style.textContent='#s-focus{background:#e4e0d8}#s-focus .fc-eyebrow{font-family:sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#7a6040;margin-bottom:4px}#s-focus .fc-frame{background:#fff;border:1.5px solid #b0a898;border-radius:9px;padding:9px 10px 9px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px}#s-focus .fc-val{font-family:"Playfair Display",Georgia,serif;font-size:16px;color:#3B2510;cursor:pointer}#s-focus .fc-val.inert{color:#a39a8c;cursor:default}#s-focus .fc-lock{width:30px;height:30px;flex-shrink:0;border-radius:50%;border:none;background:transparent;font-size:15px;cursor:pointer}#s-focus .fc-lock.inert{opacity:.35;cursor:default}#s-focus .fc-begin{width:100%;margin-top:8px;padding:11px;border-radius:9px;background:#0a4a38;color:#fff;border:none;font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:700;cursor:pointer}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc xw" id="s-focus" style="padding:1.75rem;position:relative">'
      +'<button id="fc-close" aria-label="Close" style="position:absolute;top:14px;right:14px;width:26px;height:26px;border-radius:50%;background:#f0ede8;border:1.5px solid #b0a898;font-family:sans-serif;font-size:13px;color:#3B2510;cursor:pointer">✕</button>'
      +'<div style="text-align:center;font-family:\'Playfair Display\',Georgia,serif;font-size:20px;font-weight:700;color:#3B2510;margin:0 0 1.5rem">What are we working on?</div>'
      +'<div id="fc-rows" style="display:flex;flex-direction:column;gap:16px"></div>'
      +'<button class="fc-begin" id="fc-begin">Begin</button>'
      +'</div>';
    fg.appendChild(div.firstChild);
    document.getElementById('fc-close').onclick=function(){ _closeDropdowns(); T().returnToMG(); };
    T().registerUtilScreen('s-focus');
    T().registerPageNum('s-focus','9611');
  }

  function _closeDropdowns(){
    var panels=document.querySelectorAll('#s-focus .fc-panel');
    panels.forEach(function(p){ p.remove(); });
    _openDropdown=null;
  }

  /* ── state ── path is the breadcrumb from PROJECT down to current
     TOPIC: path[0] is always PROJECT, path[path.length-1] is always
     current TOPIC. PARENT is path[path.length-2] when it exists. ── */

  async function _buildState(){
    var projects=await T2TData.topLevelBoards();
    var wishTank=projects.filter(function(p){return p.text_content==='Wish Tank';})[0] || projects[0];
    var root = wishTank ? {id:wishTank.id, name:wishTank.text_content} : {id:null, name:'Wish Tank'};
    var topicChildren = root.id ? await T2TData.activeChildHeaders(root.id) : [];
    return {
      projects: projects,
      path: [root],
      topicChildren: topicChildren,
      projectLocked:false,
      topicLocked:false,
      onEnter:null
    };
  }

  function _project(state){ return state.path[0]; }
  function _topic(state){ return state.path[state.path.length-1]; }
  function _parent(state){ return state.path.length>1 ? state.path[state.path.length-2] : null; }

  async function _refreshTopicChildren(state){
    state.topicChildren = await T2TData.activeChildHeaders(_topic(state).id);
  }

  function _renderRow(container, opts){
    // opts: {label, value, inert, clickable, showLock, locked, earned, onValueClick, getOptions, onCreate, onSelect}
    var wrap=document.createElement('div');
    wrap.innerHTML='<div class="fc-eyebrow">'+opts.label+'</div>';
    var frame=document.createElement('div'); frame.className='fc-frame';
    var val=document.createElement('div'); val.className='fc-val'+(opts.inert?' inert':'');
    val.innerHTML=(opts.value||'—')+(opts.clickable?' <span style="font-family:sans-serif;font-size:11px;color:#9a9285">▾</span>':'');
    if(opts.clickable){
      val.onclick=function(e){
        e.stopPropagation();
        if(opts.onValueClick){ opts.onValueClick(); return; }
        if(_openDropdown===opts.label){ _closeDropdowns(); return; }
        _closeDropdowns();
        _openDropdown=opts.label;
        _openPanel(wrap, opts.label, opts.getOptions(), opts.onCreate, function(row){
          _closeDropdowns();
          opts.onSelect(row);
        });
      };
    }
    frame.appendChild(val);
    if(opts.showLock){
      var lock=document.createElement('button'); lock.className='fc-lock'+(opts.earned?'':' inert');
      lock.setAttribute('aria-label', opts.locked ? 'Locked, tap to unlock' : (opts.earned?'Unlocked, tap to lock':'Nothing to lock yet'));
      lock.textContent = opts.locked ? '🔒' : '🔓';
      if(opts.earned && opts.onLockToggle){
        lock.onclick=function(e){ e.stopPropagation(); opts.onLockToggle(); };
      }
      frame.appendChild(lock);
    }
    wrap.appendChild(frame);
    container.appendChild(wrap);
  }

  function _openPanel(anchorEl, label, options, onCreate, onSelect){
    var panel=document.createElement('div'); panel.className='fc-panel';
    panel.style.cssText='background:#fff;border:1.5px solid #b0a898;border-radius:9px;margin-top:6px;padding:6px;max-height:180px;overflow-y:auto';
    options.forEach(function(o){
      var item=document.createElement('div');
      item.textContent=o.text_content;
      item.style.cssText='padding:8px 10px;font-family:"Playfair Display",Georgia,serif;font-size:15px;color:#3B2510;cursor:pointer;border-radius:6px';
      item.onmouseenter=function(){ item.style.background='#f0ede8'; };
      item.onmouseleave=function(){ item.style.background='transparent'; };
      item.onclick=function(e){ e.stopPropagation(); onSelect(o); };
      panel.appendChild(item);
    });
    if(onCreate){
      var addRow=document.createElement('div');
      addRow.style.cssText='display:flex;gap:6px;padding:8px 4px 2px;border-top:'+(options.length?'1px solid #e4e0d8;':'none;')+'margin-top:'+(options.length?'4px':'0');
      var input=document.createElement('input');
      input.placeholder='+ New '+label.toLowerCase();
      input.style.cssText='flex:1;font-family:sans-serif;font-size:13px;border:1.5px solid #b0a898;border-radius:6px;padding:6px 8px';
      var addBtn=document.createElement('button');
      addBtn.textContent='Add';
      addBtn.style.cssText='font-family:sans-serif;font-size:13px;border:1.5px solid #b0a898;border-radius:6px;background:#f0ede8;padding:6px 12px;cursor:pointer';
      function doAdd(){
        var name=input.value.trim(); if(!name) return;
        addBtn.disabled=true;
        onCreate(name).then(function(row){ onSelect(row); }).catch(function(e){
          console.error('FOCUS add failed', e);
          addBtn.disabled=false;
          var msg=document.createElement('div');
          msg.style.cssText='color:#a33;font-size:11px;font-family:sans-serif;padding:4px 4px 0';
          msg.textContent='Could not create — '+(e&&e.message?e.message:'try again');
          addRow.parentNode.insertBefore(msg, addRow.nextSibling);
          setTimeout(function(){ msg.remove(); }, 4000);
        });
      }
      addBtn.onclick=function(e){ e.stopPropagation(); doAdd(); };
      input.onclick=function(e){ e.stopPropagation(); };
      input.onkeydown=function(e){ if(e.key==='Enter') doAdd(); };
      addRow.appendChild(input); addRow.appendChild(addBtn);
      panel.appendChild(addRow);
    }
    anchorEl.appendChild(panel);
  }

  function _renderRows(state){
    var rows=document.getElementById('fc-rows'); if(!rows) return;
    rows.innerHTML='';

    /* PROJECT — fixed root while navigating, but tap to switch/create */
    _renderRow(rows, {
      label:'PROJECT', value:_project(state).name, clickable:true,
      showLock:true, locked:state.projectLocked, earned: state.projects.length>1,
      onLockToggle:function(){ state.projectLocked=!state.projectLocked; _renderRows(state); },
      getOptions:function(){ return state.projects; },
      onCreate:function(name){
        return T2TData.createHeader(name, null).then(function(row){
          state.projects.push(row);
          return Promise.all([
            T2TData.ensurePurposeHeader(row.id),
            T2TData.ensureMiscHeader(row.id),
            T2TData.ensureNewAdditionsHeader(row.id)
          ]).catch(function(e){ console.warn('Default header seed failed for new project:', e); })
            .then(function(){ return row; });
        });
      },
      onSelect:function(row){
        state.path=[{id:row.id, name:row.text_content}];
        state.topicLocked=false;
        _refreshTopicChildren(state).then(function(){ _renderRows(state); });
      }
    });

    /* PARENT — one level above TOPIC. Inert at root (nothing above PROJECT). */
    var parent=_parent(state);
    _renderRow(rows, {
      label:'PARENT', value: parent?parent.name:'', inert: !parent, clickable: !!parent,
      showLock:false,
      onValueClick: parent ? function(){
        _closeDropdowns();
        state.path.pop();
        state.topicLocked=false;
        _refreshTopicChildren(state).then(function(){ _renderRows(state); });
      } : null
    });

    /* TOPIC — current position. Dropdown = active children of current TOPIC only. */
    _renderRow(rows, {
      label:'TOPIC', value:_topic(state).name, clickable:true,
      showLock:true, locked:state.topicLocked, earned: state.topicChildren.length>0,
      onLockToggle:function(){ state.topicLocked=!state.topicLocked; _renderRows(state); },
      getOptions:function(){ return state.topicChildren; },
      onCreate:function(name){ return T2TData.createHeader(name, _topic(state).id); },
      onSelect:function(row){
        state.path.push({id:row.id, name:row.text_content});
        state.topicLocked=false;
        _refreshTopicChildren(state).then(function(){ _renderRows(state); });
      }
    });

    document.getElementById('fc-begin').onclick=function(){
      _closeDropdowns();
      var targetId=_topic(state).id;
      if(state.onEnter){ state.onEnter(targetId); return; }
      if(window.T2TSea && window.T2TSea.openBoard && targetId) window.T2TSea.openBoard(targetId);
      T().nav(_returnTarget);
    };
  }

  async function openFocusGate(returnTarget, forceShow, onEnter){
    _returnTarget = returnTarget || 's-sea-of-ideas-cluster';
    var T2=T();
    var sb=T2 && T2.sb;
    var member=T2 && T2.getMember ? T2.getMember() : null;
    if(!sb || !member){
      console.error('FOCUS gate skipped — sb or member not ready', {sb:!!sb, member:!!member});
      if(onEnter) onEnter(null); else T().nav(_returnTarget);
      return;
    }
    try{
      var state=await _buildState();
      state.onEnter = onEnter || null;
      var projectEarned = state.projects.length>1;
      var topicEarned = state.topicChildren.length>0;
      if(!forceShow && !(projectEarned || topicEarned)){
        if(onEnter) onEnter(null); else T().nav(_returnTarget);
        return;
      }
      _state=state;
      injectFocusScreen();
      _renderRows(state);
      T().nav('s-focus');
    }catch(e){
      console.error('FOCUS gate failed', e);
      var fg=document.getElementById('fg-root');
      if(fg){
        var err=document.createElement('div');
        err.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;background:#5a1a1a;color:#fff;font-size:12px;padding:8px 12px;border-radius:8px;z-index:9999';
        err.textContent='FOCUS failed: '+(e&&e.message?e.message:e);
        fg.appendChild(err);
        setTimeout(function(){ err.remove(); }, 4000);
      }
      if(onEnter) onEnter(null); else T().nav(_returnTarget);
    }
  }

  window.T2TFocus = {
    openFocusGate: openFocusGate
  };

})();
