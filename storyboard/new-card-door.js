/* ============================================================
   new-card-door.js -- T2T Field Guide - THE NEW CARD IS A CARD BACK

   Oct 25 2026 (Larry: "Now that we have redesigned the backs of the IDEA - TASK - NOTES cards, make them the new input cards. For example:
   + new task on the Briefing Board should default to the TASK card but have the option to switch to IDEA or NOTES, each of which are the current backs
   of the cards we just designed.")

   Every (+) on every board still calls IdeaCapture.open(...) -- that one front door did not move. What changed is what it opens: instead of its own
   separate form, it now makes a real, empty card of the chosen kind and opens THAT kind's own back (the TASK back, the IDEA back or the NOTES back).
   So there is one set of card backs and the NEW card is simply one of them -- nothing to keep in step.

     - The kind starts as TASK when the (+) was pressed on the Briefing Board and as IDEA everywhere else.
     - The title in the upper left (TASK / IDEA / NOTES) is the switch: click it, pick another kind, and the empty card becomes that kind.
     - A card closed while still completely empty is removed again, so pressing (+) and changing your mind leaves nothing behind.
     - Where the card lands is what the old form used: the header whose (+) was pressed, else the open topic.

   Public surface: window.FGNewCardDoor  .open(opts) -> Promise<boolean>   .next()   .backClosed(cardId, typedText)   .isPending(cardId)   .whenReady(cardId)
     opts are the same ones IdeaCapture.open takes: {mode, headerId, headerLabel, boardId, projectId, onSaved, onClosed}.
     open() resolves false when it could not make the card, and IdeaCapture then falls back to its older form.
   Reads shared globals by name (openSbDetail, _bbFindCardAnywhere, ...), always behind a typeof check, same as its sibling files.
   ============================================================ */
(function(){
  var KINDS=[ {key:'idea', label:'IDEA'}, {key:'task', label:'TASK'}, {key:'note', label:'NOTES'} ];
  var LOOSE_HEADERS=['NEW','New Additions','Parking Lot','Purpose','Trash'];   // buckets a task is filed under the topic for, not the bucket
  var pending=null;     // {kind, id, ctx} -- the empty card that is open right now
  var switching=false;  // true while the kind is being changed, so closing the old back does not count as "closed for good"
  var busy=false;
  var STASH_KEY='fg_door_pending';   // the id of the empty card that was open, kept so a reload or closed tab cannot leave it behind

  // The ONE place the open empty card is set. The card is claimed here BEFORE its back opens, so the back already knows it is a brand-new card
  // (that is what puts the cursor in Contents). The id is also written down, so the next page load can clear it away if the page went away first.
  function setPending(p){
    pending=p||null;
    if(pending && pending.fast) hideTile(pending.id);   // shown again by settleCard / removeCard once it is decided
    try{ if(pending) localStorage.setItem(STASH_KEY, (pending.kind==='task'?'task:':'')+pending.id); else localStorage.removeItem(STASH_KEY); }catch(e){}   // tasks are written down too (Oct 25 2026: an empty task left by a reload was never cleaned up)
  }

  function sb(){ return window.T2T && window.T2T.sb; }
  function toast(m){
    if(typeof _bbShowToast==='function') _bbShowToast(m);
    else if(typeof _sboardShowToast==='function') _sboardShowToast(m);
  }
  function kindLabel(k){ return KINDS.filter(function(x){ return x.key===k; })[0].label; }
  function defaultKind(ctx){ return (ctx && ctx.mode==='bb') ? 'task' : 'idea'; }

  // ---------- keeping the empty card off the board, and fast ----------
  // An idea card used to be drawn on the board the instant it opened (as '(untitled)') and the board was redrawn for it, which also made every
  // next card slow. Now the new card is made in the browser, its back opens at once, the save happens behind it, and its tile stays hidden
  // until it has something in it (or is removed if it never does).
  var uidCache=null;
  var readyById={};      // card id -> promise that settles true when the card is saved, false if it could not be
  function whenReady(id){ return readyById[id] || Promise.resolve(true); }
  async function userId(){
    if(uidCache) return uidCache;
    var s=sb(); if(!s) throw new Error('Not connected');
    var u=null;
    try{ var r=await s.auth.getSession(); u=r && r.data && r.data.session && r.data.session.user; }catch(e){}   // read from the browser, no round trip
    if(!u){ var g=await s.auth.getUser(); u=g && g.data && g.data.user; }
    if(!u) throw new Error('Not signed in');
    uidCache=u.id; return uidCache;
  }
  function newId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ var r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
  }
  var hiddenIds={};
  function paintHidden(){
    var ids=Object.keys(hiddenIds);
    var st=document.getElementById('fg-new-card-hide');
    if(!st){ if(!ids.length) return; st=document.createElement('style'); st.id='fg-new-card-hide'; document.head.appendChild(st); }
    st.textContent=ids.map(function(id){ return '[data-idea-id="'+id+'"],[data-header-id="'+id+'"]'; }).join(',')+(ids.length?'{display:none!important}':'');
  }
  function hideTile(id){ hiddenIds[id]=true; paintHidden(); }
  function unhideTile(id){ delete hiddenIds[id]; paintHidden(); }
  function isxActive(){ var e=document.getElementById('s-idea-session'); return !!(e && e.classList.contains('active')); }

  // The card has something in it and stays: the board's own filing step (auto-assign to an active Cast filter) runs, and it shows.
  async function commitCard(p){
    if(!p || !p.fast) return;
    var row=(typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById[p.id] : null;
    try{ if(row && typeof _sboardAutoAssignToActiveFilter==='function') await _sboardAutoAssignToActiveFilter(row); }catch(e){}
  }

  // ---------- making the empty card ----------
  async function createTask(ctx, seed, claim){
    seed=seed||{};
    var BB=window.T2TBriefingBoard;
    if(!BB || !BB.isLoaded || !BB.isLoaded() || !BB.canOpenCard || !BB.canOpenCard()) throw new Error('Briefing Board is not loaded on this page');
    // Same filing rule the old form used: a task entered from a header's (+) belongs to that header; loose buckets file under the topic.
    var hdr=(ctx.mode!=='bb' && ctx.headerId && LOOSE_HEADERS.indexOf(ctx.headerLabel)===-1) ? ctx.headerId : null;
    var created=BB.createNewCard({task:seed.text||'', subject:seed.subject||'', projectHeaderId: hdr||ctx.boardId||null});
    if(!created) throw new Error('Could not make the task');
    // With the Briefing Board already loaded the card is in its list the instant it is made, so the back opens at once and the save finishes
    // behind it (Oct 25 2026: the kind switch felt slow). Only when the board is not loaded yet must the save land first.
    var live=(typeof _bbCurrentBoardId!=='undefined' && !!_bbCurrentBoardId);
    var finish=created.ready.then(function(ok){
      if(ok===false){ toast('Sorry — that task could not be saved.'); return false; }
      if(window.T2TTaskMarker && window.T2TTaskMarker.refresh) window.T2TTaskMarker.refresh();
      return true;
    });
    if(!live){ if((await finish)===false) throw new Error('The task could not be saved'); }
    var madeTask={kind:'task', id:created.id, ctx:ctx};
    if(claim) claim(madeTask);
    await BB.openCard(created.id);
    return madeTask;
  }

  async function createIdea(kind, ctx, seed, claim){
    seed=seed||{};
    var s=sb(); if(!s) throw new Error('Not connected');
    var uid=await userId();
    var id=newId();
    var rec={ id:id, user_id:uid, content_type:'text', subject:(seed.subject||null), cluster_id:(ctx.headerId||ctx.boardId||null), created_at:new Date().toISOString() };
    if(kind==='note'){ rec.is_note=true; rec.text_content=seed.text||''; rec.storyboard_kind='IDEA'; }
    else { rec.text_content=seed.text||null; }
    if(typeof openSbDetail!=='function') throw new Error('Card back is not loaded on this page');
    var row=Object.assign({}, rec);
    // The Idea Session screen keeps its own list and draws its own tiles, so it keeps the older step-by-step path.
    var legacy=isxActive();
    var saving=Promise.resolve(s.from('ideas').insert(rec).select().single()).then(function(ins){
      if(ins.error) throw ins.error;
      Object.assign(row, ins.data);   // the same object the back and the board already hold, now carrying the saved values
      return true;
    }).catch(function(e){
      console.warn('NEW card: could not save', e);
      toast('Sorry — that card could not be saved.');
      try{ if(typeof _sboardAllRowsById!=='undefined') delete _sboardAllRowsById[id]; }catch(x){}
      if(pending && pending.id===id){ setPending(null); if(typeof closeSbDetail==='function') closeSbDetail(); }
      return false;
    });
    readyById[id]=saving;
    var made={kind:kind, id:id, ctx:ctx, fast:!legacy};
    if(legacy){
      if((await saving)===false) throw new Error('The card could not be saved');
      if(ctx.mode!=='bb' && typeof ctx.onSaved==='function'){ try{ await ctx.onSaved(row); }catch(e){ console.warn('NEW card: host onSaved failed', e); } }
      else if(typeof _sboardAddRow==='function') _sboardAddRow(row);
    } else if(typeof _sboardAddRow==='function') _sboardAddRow(row);   // known to the board's list, but not drawn until it has something in it
    if(claim) claim(made);   // before the back opens -- see setPending
    openSbDetail(row);
    return made;
  }

  async function create(kind, ctx, seed){
    var claim=function(m){ setPending(m); };
    return kind==='task' ? createTask(ctx, seed, claim) : createIdea(kind, ctx, seed, claim);
  }

  // ---------- the kind switch in the upper-left title ----------
  function injectStyle(){
    if(document.getElementById('fg-new-card-door-style')) return;
    var st=document.createElement('style'); st.id='fg-new-card-door-style';
    st.textContent=''
      +'.fg-kind-toggle{cursor:pointer!important}'
      +'.fg-kind-toggle::after{content:" \\25BE";font-size:.8em}'
      +'.fg-kind-menu{position:fixed;z-index:100001;min-width:120px;display:flex;flex-direction:column;background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);padding:4px}'
      +'.fg-kind-item{display:flex;justify-content:space-between;gap:12px;cursor:pointer;background:transparent;border:0;padding:6px 8px;border-radius:5px;font:inherit;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#222;text-align:left}'
      +'.fg-kind-item:hover{background:#eef3fb}';
    document.head.appendChild(st);
  }
  function closeKindMenu(){ var m=document.getElementById('fg-kind-menu'); if(m) m.remove(); }
  function titleEl(kind){
    if(kind==='task') return document.querySelector('#bb-detail-overlay .bb-overlay-card .fg-back-title');
    return document.querySelector('#sb-detail-overlay #sb-details-eyebrow') || document.querySelector('#sb-detail-overlay .fg-back-title');
  }
  function openKindMenu(el){
    closeKindMenu();
    var m=document.createElement('div'); m.className='fg-kind-menu'; m.id='fg-kind-menu';
    KINDS.forEach(function(k){
      var b=document.createElement('button'); b.type='button'; b.className='fg-kind-item';
      b.innerHTML='<span>'+k.label+'</span><span>'+((pending && pending.kind===k.key)?'✓':'')+'</span>';
      b.addEventListener('click', function(e){ e.stopPropagation(); closeKindMenu(); switchKind(k.key); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    var r=el.getBoundingClientRect();
    m.style.left=Math.max(8, Math.min(r.left, window.innerWidth-8-m.offsetWidth))+'px'; m.style.top=(r.bottom+4)+'px';
    setTimeout(function(){ document.addEventListener('click', function c(){ closeKindMenu(); document.removeEventListener('click', c); }); }, 0);
  }
  // The back builds its title as it opens (and a notes back renames it a moment later), so look for it a few times.
  function decorate(p){
    injectStyle();
    [0,150,500,1200].forEach(function(ms){
      setTimeout(function(){
        if(!pending || pending.id!==p.id) return;
        var el=titleEl(p.kind);
        if(!el || el.getAttribute('data-fg-kind-wired')) return;
        el.setAttribute('data-fg-kind-wired','1');
        el.classList.add('fg-kind-toggle');
        el.title='Kind of card: click to change it to IDEA, TASK or NOTES';
        el.addEventListener('mousedown', function(e){ e.stopPropagation(); });   // the title doubles as a drag handle; a plain click must not start a drag
        el.addEventListener('click', function(e){ e.stopPropagation(); openKindMenu(el); });
      }, ms);
    });
  }

  // ---------- empty or not ----------
  // A saved task is empty only when the card, its task_fields row and everything a person can fill in are all blank.
  async function isEmptyTaskInDatabase(id){
    var s=sb(); if(!s) return false;
    var r=await s.from('ideas').select('*').eq('id',id).maybeSingle();
    var row=r && r.data; if(!row || row.content_type!=='task') return false;
    var f=await s.from('task_fields').select('*').eq('idea_id',id).maybeSingle();
    var t=(f && f.data) || {};
    if(f && f.error) return false;
    return !String(row.text_content||'').trim() && !String(row.subject||'').trim() && !String(row.notes||'').trim() && !row.priority && !row.link_url && !row.image_url
      && !String(t.task||'').trim() && !t.due_date && !t.start_date && !String(t.situation||'').trim() && !t.budget && !t.is_routine && !t.completed_date;
  }
  async function isEmpty(p){
    if(p.kind==='task'){
      var c=(typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(p.id) : null;
      if(!c) return await isEmptyTaskInDatabase(p.id);   // not on the loaded board (reload, other page): look at the saved rows instead
      return !String(c.task||'').trim() && !String(c.subject||'').trim() && !String(c.notes||'').trim() && !c.priority && !c.linkUrl && !c.due && !c.situation;
    }
    var s=sb(); if(!s) return false;
    var r=await s.from('ideas').select('*').eq('id',p.id).maybeSingle();
    var row=r && r.data; if(!row) return false;
    var att=row.attachments; if(typeof att==='string'){ try{ att=JSON.parse(att); }catch(e){ att=[]; } }
    return row.content_type==='text' && !String(row.subject||'').trim() && !String(row.text_content||'').trim() && !row.image_url && !row.link_url
      && !String(row.notes||'').trim() && !(Array.isArray(att) && att.length) && !row.is_gem && !row.source_date && !row.priority;
  }

  // What is typed in the open back's two main fields right now, saved or not -- it travels with the card to the new kind.
  function typedNow(p){
    function v(id){ var e=document.getElementById(id); return e ? String(e.value||'').trim() : ''; }
    return p.kind==='task' ? {subject:v('bb-d-subject'), text:v('bb-d-task')} : {subject:v('sb-subject-input'), text:v('sb-text-input')};
  }

  // Quick check of the open back: true when nothing has been typed into it (used by the kind switch, which must not wait on the database).
  function isBlankNow(p){
    // Only the fields a person actually fills in are looked at (a task back carries pre-filled things like the reviewer and dates, so a blanket
    // scan of every field wrongly called an untouched card "not empty").
    var ids = p.kind==='task' ? ['bb-d-notes','bb-d-situation','bb-d-link-url','bb-d-due','bb-d-start','bb-d-budget']
                              : ['sb-source-date','sb-link-input','sb-notes-input'];
    for(var i=0;i<ids.length;i++){ var e=document.getElementById(ids[i]); if(e && String(e.value||'').trim()) return false; }
    var c=(p.kind==='task' && typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(p.id) : null;
    if(c && (c.priority || c.linkUrl)) return false;
    var row=(p.kind!=='task' && typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById[p.id] : null;
    if(row && (row.priority || row.is_gem || row.image_url || row.link_url || String(row.notes||'').trim() || row.source_date)) return false;
    return true;
  }

  async function removeCard(p){
    var s=sb();
    try{
      if(p.kind==='task'){
        if(typeof _bbCardsList==='function' && typeof _bbSaveLocal==='function' && typeof _bbCurrentBoardId!=='undefined' && _bbCurrentBoardId){
          _bbSaveLocal(_bbCardsList().filter(function(c){ return c.id!==p.id; }), [p.id]);
          if(typeof renderBoard==='function') renderBoard();
        }
        if(s){
          await s.from('card_roles').delete().eq('card_id', p.id);
          await s.from('briefing_cards').delete().eq('id', p.id);
        }
        if(window.T2TTaskMarker && window.T2TTaskMarker.refresh) window.T2TTaskMarker.refresh();
      } else if(s){
        await whenReady(p.id);   // a card removed in its first moments must not be deleted before it is saved
        await s.from('card_roles').delete().eq('card_id', p.id);
        await s.from('ideas').delete().eq('id', p.id);
        if(typeof _sboardAllRowsById!=='undefined') delete _sboardAllRowsById[p.id];
        if(typeof _isxAllRowsById!=='undefined') delete _isxAllRowsById[p.id];
        if(!p.fast){
          if(typeof renderSeaBoard==='function'){ try{ renderSeaBoard(true); }catch(e){} }
          if(typeof _isxRenderBoard==='function'){ try{ _isxRenderBoard(true); }catch(e){} }
        }
      }
    }catch(e){ console.warn('NEW card: could not remove the empty card', e); }
    unhideTile(p.id);
  }

  // Every way a new card can end goes through here: wait for its save, then it is removed if still empty, otherwise filed -- and only then shown.
  async function settleCard(p, typed){
    try{
      await whenReady(p.id);
      if(typed && String(typed).trim()) await commitCard(p);
      else if(await isEmpty(p)) await removeCard(p);
      else await commitCard(p);
    }catch(e){ console.warn('NEW card: cleanup check failed', e); }
    unhideTile(p.id);
  }

  // ---------- close and switch ----------
  // Called by both card backs' close functions. A card that is still empty a moment later (so any last typing has been saved) is removed.
  function backClosed(cardId, typed){
    if(!pending || pending.id!==cardId || switching) return;
    var p=pending; setPending(null);
    setTimeout(async function(){
      await settleCard(p, typed);
      if(p.ctx && typeof p.ctx.onClosed==='function'){ try{ p.ctx.onClosed(); }catch(e){} }
    }, 450);
  }

  async function switchKind(newKey){
    if(!pending || pending.kind===newKey || switching) return;
    var old=pending; switching=true;
    try{
      // Oct 25 2026 (Larry: switching needs to be faster): look at what is on screen right now instead of closing and waiting, open the new kind
      // first, and clear the old empty card away behind it.
      if(!isBlankNow(old)){
        toast('This card has more than a subject and contents on it, so its kind cannot change.');
        return;
      }
      var seed=typedNow(old);   // Subject and Contents go with the card
      var oldBack=(old.kind==='task');
      if(oldBack){ if(typeof closeCardDetail==='function') closeCardDetail(); }
      else if(typeof closeSbDetail==='function') closeSbDetail();
      setPending(null);
      var made=await create(newKey, old.ctx, seed);
      decorate(made);
      removeCard(old);   // not awaited: the new card is already up
    }catch(e){
      console.error('NEW card: could not switch kind', e);
      toast('Sorry — that card could not be changed to '+kindLabel(newKey)+'.');
    }finally{ switching=false; }
  }

  // Rapid fire (Oct 25 2026): the card that is open was just saved with its text; put a fresh empty card of the same kind and place in its
  // spot, still open. The saved one stays on the board; the empty one is removed if the back is then closed without typing.
  async function next(){
    if(!pending || switching || pending.kind==='task') return false;
    var old=pending; switching=true;
    try{
      await commitCard(old);   // the card just saved is filed the way the board files any new card; it shows as soon as the next one is claimed
      var made=await createIdea(old.kind, old.ctx, {}, function(m){ setPending(m); });
      unhideTile(old.id);
      decorate(made);
      return true;
    }catch(e){
      console.warn('NEW card: could not start the next card', e);
      return false;
    }finally{ switching=false; }
  }

  // ---------- sweep: an empty card can never outlive its entry ----------
  // The card is saved the moment it opens (so photos, attachments and people can attach to it), which means an empty one only goes away if
  // something removes it. backClosed does that for a normal close; this covers every other way out (reload, closed tab, lost connection, a
  // crash) by looking, once per page load, for empty cards and removing them. 'Empty' is the one definition in isEmpty above.
  async function sweepEmpty(){
    var s=sb(); if(!s) return false;
    var u=await s.auth.getUser(); var user=u && u.data && u.data.user; if(!user) return false;
    var ids=[];
    var stash=null; try{ stash=localStorage.getItem(STASH_KEY); }catch(e){}
    var stashKind='idea';
    if(stash && stash.indexOf('task:')===0){ stash=stash.slice(5); stashKind='task'; }
    var kinds={};
    if(stash && !(pending && pending.id===stash)){ ids.push(stash); kinds[stash]=stashKind; }   // the card that was open when this page last went away
    // Anything else empty and not made in the last half hour (a card still being typed on another device is left alone).
    var old=new Date(Date.now()-30*60*1000).toISOString();
    var r=await s.from('ideas').select('id').eq('user_id',user.id).eq('content_type','text').is('image_url',null)
      .or('text_content.is.null,text_content.eq.').or('subject.is.null,subject.eq.').lt('created_at',old).limit(50);
    if(r && Array.isArray(r.data)) r.data.forEach(function(x){ if(ids.indexOf(x.id)===-1 && !(pending && pending.id===x.id)) ids.push(x.id); });
    // Empty TASKS left behind the same way (they were never looked for, which is how blank (untitled) cards piled up). isEmpty still has the last word.
    var rt=await s.from('ideas').select('id').eq('user_id',user.id).eq('content_type','task')
      .or('text_content.is.null,text_content.eq.').or('subject.is.null,subject.eq.').lt('created_at',old).limit(50);
    if(rt && Array.isArray(rt.data)) rt.data.forEach(function(x){ if(ids.indexOf(x.id)===-1 && !(pending && pending.id===x.id)){ ids.push(x.id); kinds[x.id]='task'; } });
    for(var i=0;i<ids.length;i++){
      var p={kind:kinds[ids[i]]||'idea', id:ids[i], ctx:null};
      try{ if(await isEmpty(p)) await removeCard(p); }catch(e){}
    }
    try{ if(!pending) localStorage.removeItem(STASH_KEY); }catch(e){}
    return true;
  }
  (function startSweep(n){
    setTimeout(async function(){
      var ok=false; try{ ok=await sweepEmpty(); }catch(e){ console.warn('NEW card: sweep failed', e); }
      if(!ok && n<4) startSweep(n+1);
    }, n===0 ? 3000 : 6000);
  })(0);

  // ---------- the front door ----------
  async function open(opts){
    if(busy) return true;
    busy=true;
    try{
      opts=opts||{};
      // A card from an earlier (+) that is still open is let go first (and removed if it never got anything in it).
      if(pending){ var prev=pending; setPending(null); setTimeout(function(){ settleCard(prev, ''); }, 450); }
      var made=await create(defaultKind(opts), opts);
      decorate(made);
      return true;
    }catch(e){
      console.error('NEW card: could not open as a card back; using the older form', e);
      return false;
    }finally{ busy=false; }
  }

  window.FGNewCardDoor={ open:open, next:next, backClosed:backClosed, whenReady:whenReady, isPending:function(id){ return !!pending && pending.id===id; } };
})();
