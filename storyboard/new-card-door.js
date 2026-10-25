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

   Public surface: window.FGNewCardDoor  .open(opts) -> Promise<boolean>   .backClosed(cardId)   .isPending(cardId)
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

  function sb(){ return window.T2T && window.T2T.sb; }
  function toast(m){
    if(typeof _bbShowToast==='function') _bbShowToast(m);
    else if(typeof _sboardShowToast==='function') _sboardShowToast(m);
  }
  function kindLabel(k){ return KINDS.filter(function(x){ return x.key===k; })[0].label; }
  function defaultKind(ctx){ return (ctx && ctx.mode==='bb') ? 'task' : 'idea'; }

  // ---------- making the empty card ----------
  async function createTask(ctx){
    var BB=window.T2TBriefingBoard;
    if(!BB || !BB.isLoaded || !BB.isLoaded() || !BB.canOpenCard || !BB.canOpenCard()) throw new Error('Briefing Board is not loaded on this page');
    // Same filing rule the old form used: a task entered from a header's (+) belongs to that header; loose buckets file under the topic.
    var hdr=(ctx.mode!=='bb' && ctx.headerId && LOOSE_HEADERS.indexOf(ctx.headerLabel)===-1) ? ctx.headerId : null;
    var created=BB.createNewCard({task:'', subject:'', projectHeaderId: hdr||ctx.boardId||null});
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
    await BB.openCard(created.id);
    return {kind:'task', id:created.id, ctx:ctx};
  }

  async function createIdea(kind, ctx){
    var s=sb(); if(!s) throw new Error('Not connected');
    var u=await s.auth.getUser(); var user=u && u.data && u.data.user;
    if(!user) throw new Error('Not signed in');
    var rec={ user_id:user.id, content_type:'text', cluster_id:(ctx.headerId||ctx.boardId||null), created_at:new Date().toISOString() };
    if(kind==='note'){ rec.is_note=true; rec.text_content=''; rec.storyboard_kind='IDEA'; }
    else { rec.text_content=null; }
    var ins=await s.from('ideas').insert(rec).select().single();
    if(ins.error) throw ins.error;
    var row=ins.data;
    // The host board adds the new tile to its own list the same way it did when the old form saved.
    if(ctx.mode!=='bb' && typeof ctx.onSaved==='function'){ try{ await ctx.onSaved(row); }catch(e){ console.warn('NEW card: host onSaved failed', e); } }
    else if(typeof _sboardAddRow==='function') _sboardAddRow(row);
    if(typeof openSbDetail!=='function') throw new Error('Card back is not loaded on this page');
    openSbDetail(row);
    return {kind:kind, id:row.id, ctx:ctx};
  }

  async function create(kind, ctx){
    return kind==='task' ? createTask(ctx) : createIdea(kind, ctx);
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
  async function isEmpty(p){
    if(p.kind==='task'){
      var c=(typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(p.id) : null;
      if(!c) return false;   // cannot see it -- never delete what cannot be checked
      return !String(c.task||'').trim() && !String(c.subject||'').trim() && !String(c.notes||'').trim() && !c.priority && !c.linkUrl && !c.due && !c.situation;
    }
    var s=sb(); if(!s) return false;
    var r=await s.from('ideas').select('*').eq('id',p.id).maybeSingle();
    var row=r && r.data; if(!row) return false;
    var att=row.attachments; if(typeof att==='string'){ try{ att=JSON.parse(att); }catch(e){ att=[]; } }
    return row.content_type==='text' && !String(row.subject||'').trim() && !String(row.text_content||'').trim() && !row.image_url && !row.link_url
      && !String(row.notes||'').trim() && !(Array.isArray(att) && att.length) && !row.is_gem && !row.source_date && !row.priority;
  }

  // Quick check of the open back: true when nothing has been typed into it (used by the kind switch, which must not wait on the database).
  function isBlankNow(p){
    var root=document.querySelector(p.kind==='task' ? '#bb-detail-overlay .bb-overlay-card' : '#sb-detail-overlay .sb-details-card');
    if(!root) return true;
    var fields=root.querySelectorAll('textarea, input[type=text], input:not([type])');
    for(var i=0;i<fields.length;i++){ if(String(fields[i].value||'').trim()) return false; }
    var c=(p.kind==='task' && typeof _bbFindCardAnywhere==='function') ? _bbFindCardAnywhere(p.id) : null;
    if(c && (c.priority || c.linkUrl)) return false;
    var row=(p.kind!=='task' && typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById[p.id] : null;
    if(row && (row.priority || row.is_gem || row.image_url || row.link_url)) return false;
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
        await s.from('card_roles').delete().eq('card_id', p.id);
        await s.from('ideas').delete().eq('id', p.id);
        if(typeof _sboardAllRowsById!=='undefined') delete _sboardAllRowsById[p.id];
        if(typeof _isxAllRowsById!=='undefined') delete _isxAllRowsById[p.id];
        if(typeof renderSeaBoard==='function'){ try{ renderSeaBoard(true); }catch(e){} }
        if(typeof _isxRenderBoard==='function'){ try{ _isxRenderBoard(true); }catch(e){} }
      }
    }catch(e){ console.warn('NEW card: could not remove the empty card', e); }
  }

  // ---------- close and switch ----------
  // Called by both card backs' close functions. A card that is still empty a moment later (so any last typing has been saved) is removed.
  function backClosed(cardId){
    if(!pending || pending.id!==cardId || switching) return;
    var p=pending; pending=null;
    setTimeout(async function(){
      try{ if(await isEmpty(p)) await removeCard(p); }catch(e){ console.warn('NEW card: cleanup check failed', e); }
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
        toast('This card already has something in it, so its kind cannot change. Clear it first.');
        return;
      }
      var oldBack=(old.kind==='task');
      if(oldBack){ if(typeof closeCardDetail==='function') closeCardDetail(); }
      else if(typeof closeSbDetail==='function') closeSbDetail();
      pending=null;
      var made=await create(newKey, old.ctx);
      pending=made; decorate(made);
      removeCard(old);   // not awaited: the new card is already up
    }catch(e){
      console.error('NEW card: could not switch kind', e);
      toast('Sorry — that card could not be changed to '+kindLabel(newKey)+'.');
    }finally{ switching=false; }
  }

  // ---------- the front door ----------
  async function open(opts){
    if(busy) return true;
    busy=true;
    try{
      opts=opts||{};
      // A card from an earlier (+) that is still open is let go first (and removed if it never got anything in it).
      if(pending){ var prev=pending; pending=null; setTimeout(async function(){ try{ if(await isEmpty(prev)) await removeCard(prev); }catch(e){} }, 450); }
      var made=await create(defaultKind(opts), opts);
      pending=made; decorate(made);
      return true;
    }catch(e){
      console.error('NEW card: could not open as a card back; using the older form', e);
      return false;
    }finally{ busy=false; }
  }

  window.FGNewCardDoor={ open:open, backClosed:backClosed, isPending:function(id){ return !!pending && pending.id===id; } };
})();
