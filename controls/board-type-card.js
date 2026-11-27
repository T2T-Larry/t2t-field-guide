// board-type-card.js -- Nov 27 2026 (Larry: "Double click Board Selector in ID BAND to open card and allow color changes to field." and "allow any features if desired").
// Every Board Type (VISION, PLAN, BRIEFING ...) has ONE card in the one tree: its home. Double-clicking the Board Selector opens that card, an ordinary
// card with the ordinary Gear and features, and the card's own color paints the Board Selector field on every ID BAND.
//
// DATA: the card is marked ideas.page_context = 'board-type:<KIND>' (KIND = IDBand.BOARD_KINDS value). One per member. A member who has none gets one
// made under MASTER > BOARD TYPES the first time it is double-clicked, with Color already switched on. Nothing else is stored: the field reads the card.
//   color                       -> the field's background (RESET in the Color popup, or Color switched off, returns the standard white field)
//   subject_bold / italic       -> the field's lettering, only when the card has made its own choice in the Text popup
//
// Public surface: window.T2TBoardTypeCard  .open(kind)  .watch(fieldElement)  .refresh()
(function(){
  var MARK='board-type:';
  var CARD_NAMES={SEA:'Sea of Ideas', IDEA:'VISION BOARD', PLAN:'PLAN BOARD', 'BRIEFING BOARD':'BRIEFING BOARD', SHARE:'STORY BOARD', CAST:'JOURNEY BOARD'};
  var rows={};            // kind -> the card's row
  var loaded=false, loading=null, opening=false;
  var watched=[];

  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  async function me(){
    var c=sb(); if(!c) return null;
    try{ var r=await c.auth.getUser(); return (r && r.data && r.data.user) || null; }catch(e){ return null; }
  }
  // The field shows the board's name, so the name says which Board Type it is.
  function kindOfField(el){
    var t=String(el.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
    var list=(window.IDBand && IDBand.BOARD_KINDS) || [];
    for(var i=0;i<list.length;i++){ if(IDBand.boardName(list[i].value)===t) return list[i].value; }
    return null;
  }
  function isDark(hex){
    var m=/^#([0-9a-f]{6})$/i.exec(hex||''); if(!m) return false;
    var n=parseInt(m[1],16);
    return (0.299*(n>>16&255) + 0.587*(n>>8&255) + 0.114*(n&255)) < 140;
  }
  function set(el, prop, value){ if(value) el.style.setProperty(prop, value, 'important'); else el.style.removeProperty(prop); }
  function paint(el){
    var kind=kindOfField(el), row=kind ? rows[kind] : null;
    var F=window.FGFeatureBreakers;
    var color=(row && /^#[0-9a-f]{6}$/i.test(row.color||'') && !(F && F.isOffRow && F.isOffRow(row,'color'))) ? row.color : '';
    var textOn=!!row && !(F && F.isOffRow && F.isOffRow(row,'text'));
    set(el, 'background', color);
    set(el, 'color', isDark(color) ? '#ffffff' : '');
    set(el, 'font-weight', (textOn && row.subject_bold===false) ? '400' : '');
    set(el, 'font-style', (textOn && row.subject_italic===true) ? 'italic' : '');
  }
  function paintAll(){
    watched=watched.filter(function(el){ return el.isConnected; });
    watched.forEach(paint);
  }

  function refresh(){
    if(loading) return loading;
    loading=(async function(){
      try{
        var u=await me(); if(!u) return;
        var r=await sb().from('ideas').select('id,page_context,color,features,subject_bold,subject_italic').eq('user_id', u.id).like('page_context', MARK+'%');
        if(r.error) throw r.error;
        var next={};
        (r.data||[]).forEach(function(x){ next[String(x.page_context).slice(MARK.length)]=x; });
        rows=next; loaded=true; paintAll();
      }catch(e){ console.warn('Board Type card: could not read the field colors', e); }
    })().then(function(){ loading=null; });
    return loading;
  }

  // Keep a Board Selector field painted: now, and each time the board writes a different name into it.
  function watch(el){
    if(!el || el.__fgBoardTypeWatched) return;
    el.__fgBoardTypeWatched=true;
    watched.push(el);
    if(window.MutationObserver) new MutationObserver(function(){ if(!loaded) refresh(); paint(el); }).observe(el, {childList:true, characterData:true, subtree:true});
    paint(el);
    if(!loaded) refresh();
  }

  async function find(userId, kind){
    var r=await sb().from('ideas').select('*').eq('user_id', userId).eq('page_context', MARK+kind).limit(1);
    if(r.error) throw r.error;
    return (r.data && r.data[0]) || null;
  }
  async function make(userId, kind){
    var d=window.T2TData; if(!d) throw new Error('not ready');
    var root=await d.ensureIdeaStoryboardsRoot(); if(!root) throw new Error('no MASTER');
    var home=await d.ensureHeaderNamed('BOARD TYPES', root); if(!home) throw new Error('could not make BOARD TYPES');
    var id=await d.ensureHeaderNamed(CARD_NAMES[kind], home); if(!id) throw new Error('could not make the card');
    var r=await sb().from('ideas').update({page_context:MARK+kind, features:'on-color,opt-color'}).eq('id', id);
    if(r.error) throw r.error;
    return find(userId, kind);
  }

  async function open(kind){
    if(opening || !CARD_NAMES[kind]) return;
    opening=true;
    function say(t){
      try{
        if(document.querySelector('#s-briefing-board.active') && typeof _bbShowToast==='function') _bbShowToast(t);
        else if(typeof _sboardShowToast==='function') _sboardShowToast(t);
      }catch(e){}
    }
    try{
      var u=await me(); if(!u){ say('Sign in to open this card.'); return; }
      var row=await find(u.id, kind) || await make(u.id, kind);
      if(!row) throw new Error('no card');
      rows[kind]=row; paintAll();
      if(window.T2TStoryboard && window.T2TStoryboard.openDetail && document.getElementById('sb-detail-overlay')) window.T2TStoryboard.openDetail(row);
      else say('This card is not available on this screen yet.');
    }catch(e){ console.warn('Board Type card: could not open', e); say('Could not open that board’s card. Please try again.'); }
    finally{ opening=false; }
  }

  // A pick in the card's Color or Text popup repaints the field at once.
  document.addEventListener('fg-card-saved', function(e){
    var d=e.detail||{};
    Object.keys(rows).forEach(function(k){ if(String(rows[k].id)===String(d.id)){ Object.assign(rows[k], d.patch||{}); paintAll(); } });
  });
  document.addEventListener('fg-features-changed', function(){ refresh(); });
  window.addEventListener('t2t:member-loaded', function(){ refresh(); });

  window.T2TBoardTypeCard={ open:open, watch:watch, refresh:refresh };
})();
