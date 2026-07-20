/* ============================================================
   briefing-board.js -- T2T Field Guide - BRIEFING BOARD (9350)

   Built July 19, 2026. A traveler's own DO / DOING / DONE / HANG-UPS
   board, based on Larry's original Disney Briefing Board booklet. It
   borrows the look and feel of the ISB Storyboard (card shapes, the
   turned-up corner that flips to a detail screen, drag between
   columns) but is deliberately its OWN module, not a mode bolted onto
   idea-storyboard-9710.js -- that file already carries the scars of
   teaching one engine to run two similar-but-different screens
   (9710/9711). A third mode there risked the same class of bug.

   Talks to backpack.js ONLY through window.T2T (registerPageNum,
   registerUtilScreen, registerScreenActivate, wire, nav, goMG,
   returnToMG), same convention every other module in this codebase
   follows.

   Screens, every one individually numbered per Larry's July 19, 2026
   rule -- every traveler-facing screen is a Touch Point:
     9350  s-briefing-board    the board itself (4 fixed columns) --
                                a real nav()'d screen.
     9360  bb-add-overlay      Add a Card
     9370  bb-detail-overlay   Back of the Card
   9360/9370 converted from nav()'d screens to overlays July 20, 2026,
   per Larry: the card should sit ON TOP of the board (board stays
   visible/live underneath, dimmed), closed via an explicit X or by
   clicking outside the card -- same convention idea-storyboard-9710.js
   already uses for its own DETAILS card (sb-detail-overlay). Per the
   July 19 rule, overlay screens still get their own Touch Point number,
   they just don't call nav() to get it -- see backpack.js's page-toast
   detection for where 9360/9370 get recognized while active.
   9380/9390 held in reserve (a Done archive, automation settings,
   whatever earns its place later).

   Trash + hearts, July 20, 2026 -- Larry's framing: a card sitting in
   Do is really just an idea (no inherent value yet), same as anything
   on the ISB before it's proven out. So this board borrows the ISB's
   own two ways of handling that: a fixed round Trash can (bottom-right
   of the board, same "small circle, drag a card onto it" convention as
   9711's isx-trash-fixed) for an idea that turns out not worth doing --
   NOT the same thing as finishing it (that's Done) -- plus a heart
   count (tap to add, hold to remove, same gesture as the ISB's
   sb-heart-pill) on the back of the card, for resonance.

   Priority, July 20, 2026 -- Larry's "3=5" principle: give a group
   three choices (High/Medium/Low) and group discussion almost always
   settles on five real answers, because disagreement between two
   people's H and M becomes MH, between H and L becomes a clean M, etc.
   So the scale here is H / MH / M / ML / L, not just three buttons.
   Each column sorts by priority, H at the top, unset priority at the
   bottom (not yet triaged) -- ties keep whatever order they already
   had (stable sort), same as how the cards landed there.

   Persistence: sessionStorage for now, same local-fallback pattern
   Journal already uses (loadEntriesLocal/saveEntryLocal in
   backpack.js). Real per-traveler storage (a Supabase table,
   matching how Journal/Idea persist) is a follow-up once that
   table exists -- flagged here rather than silently assumed.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  var COLUMNS = [
    {key:'do',      label:'Do'},
    {key:'doing',   label:'Doing'},
    {key:'done',    label:'Done'},
    {key:'hangups', label:'Hang-Ups'}
  ];

  var PRIORITIES = ['H','MH','M','ML','L'];
  var PRI_ORDER = {H:0, MH:1, M:2, ML:3, L:4};
  var PRI_COLOR = {H:'#a3372b', MH:'#c9743f', M:'#7A5C3A', ML:'#8fa9b8', L:'#c9a87c'};

  var TRASH_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B2510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

  var _bbCards = null;
  var _bbOpenCardId = null;
  var _bbTrashPendingId = null;

  function _bbToday(){
    var d=new Date();
    return (d.getMonth()+1)+'/'+d.getDate();
  }

  function _bbLoadLocal(){
    try{ var r=sessionStorage.getItem('bbCards'); return r?JSON.parse(r):null; }
    catch(e){ return null; }
  }
  function _bbSaveLocal(cards){
    try{ sessionStorage.setItem('bbCards', JSON.stringify(cards)); }catch(e){}
  }
  function _bbSeed(){
    return [
      {id:1, col:'do', assigned:_bbToday(), task:'Drag this card to Doing when you start it', person:'', due:'', budget:'', notes:'', flag:'none', hearts:0, priority:''}
    ];
  }
  function _bbCardsList(){
    if(!_bbCards){ _bbCards = _bbLoadLocal() || _bbSeed(); }
    return _bbCards;
  }

  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
  }

  function _priRank(c){ return PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 5; }

  function injectBriefingBoardStyles(){
    if(document.getElementById('bb-style')) return;
    var style=document.createElement('style');
    style.id='bb-style';
    style.textContent=
       '#s-briefing-board{position:relative}'
      +'#fg-root.isx-full #s-briefing-board.active{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:column}'
      +'.bb-mhead{background:#FDF6E8;border-bottom:3px solid #C9A87C;padding:14px 20px 10px;flex-shrink:0}'
      +'.bb-mh{color:#3B2510;font-size:32px;font-weight:700;line-height:1;padding-bottom:6px;font-family:"Playfair Display",serif}'
      +'.bb-mt{color:#7A5C3A;font-size:13px;font-style:italic}'
      +'#bb-board-wrap{flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 16px;background:#FDF6E8;display:flex}'
      +'#bb-cols{display:flex;gap:14px;height:100%}'
      +'.bb-col{flex-shrink:0;width:190px;display:flex;flex-direction:column;background:rgba(201,168,124,0.14);border:1px solid #C9A87C;border-radius:8px;padding:8px}'
      +'.bb-col-head{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#FDF6E8;background:#3B2510;border-radius:4px;text-align:center;padding:7px 4px;margin-bottom:4px}'
      +'.bb-col[data-col="hangups"] .bb-col-head{background:#a3372b}'
      +'.bb-col-note{font-family:"Caveat",cursive;font-size:13px;color:#7A5C3A;text-align:center;margin:0 0 6px}'
      +'.bb-col-cards{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:60px}'
      +'.bb-col-cards.bb-dragover{outline:2px dashed #C9A87C;outline-offset:2px}'
      +'.bb-card{position:relative;background:#FFFDF7;border:1px solid #d9c9a3;border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:12px;line-height:1.3;cursor:grab;font-family:Georgia,serif}'
      +'.bb-card .bb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}'
      +'.bb-card .bb-top-left{display:flex;align-items:center;gap:4px}'
      +'.bb-pri-badge{font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;line-height:1.4}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:13px;color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;flex-shrink:0}'
      +'.bb-card .bb-task{color:#3B2510;margin:2px 0 5px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:12px;color:#7A5C3A;min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-heart-badge{position:absolute;bottom:2px;left:4px;font-size:13px;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.3);pointer-events:none}'
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed #C9A87C;border-radius:3px;text-align:center;padding:8px;font-size:12px;color:#6b4a2e;cursor:pointer;font-family:Georgia,serif}'
      +'.bb-add-tile:hover{background:rgba(201,168,124,0.2)}'
      /* Fixed Trash can, July 20, 2026 -- same "small round drop target,
         bottom-right" convention as 9711's isx-trash-fixed. Anchored to
         #s-briefing-board itself (not #bb-board-wrap, which scrolls
         horizontally on narrow screens) so it never drifts off with the
         columns and never has to fight the bar2 strip below it. */
      +'.bb-trash{position:absolute;right:16px;bottom:76px;width:44px;height:44px;border-radius:50%;background:#FFFDF7;border:2px solid #3B2510;box-shadow:0 2px 6px rgba(59,37,16,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:80}'
      +'.bb-trash.bb-trash-dropready{outline:2px solid #a3372b;outline-offset:2px}'
      +'.bbw{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box}'
      +'.bb-field{width:100%;max-width:280px;margin-bottom:12px;text-align:left}'
      +'.bb-field label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7A5C3A;margin-bottom:3px}'
      +'.bb-field input,.bb-field textarea{width:100%;font-family:Georgia,serif;font-size:14px;border:1.5px solid #C9A87C;border-radius:4px;padding:7px 8px;background:#fff;color:#3B2510;box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:16px;resize:vertical}'
      +'.bb-flags,.bb-priorities{display:flex;gap:4px}'
      +'.bb-flag-btn,.bb-pri-btn{flex:1;font-size:11px;padding:6px 2px;border-radius:4px;border:1.5px solid #C9A87C;background:#fff;cursor:pointer;color:#7A5C3A;font-family:Georgia,serif}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}'
      +'.bb-heart-pill{font-size:12px;padding:5px 10px;background:#fff;border:1.5px solid #C9A87C;border-radius:8px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;color:#3B2510;font-family:Georgia,serif}'
      /* Overlay chrome for Add a Card (9360) / Back of the Card (9370),
         July 20, 2026 -- same "fixed, dimmed backdrop, click-outside-
         closes" pattern as idea-storyboard-9710.js's .sb-overlay. Lives
         at #fg-root level (see injectBriefingBoardScreens), not inside
         #s-briefing-board, for the same reason 9710's overlays live at
         fg-root: a display:none ancestor (the board when it's not the
         active screen) would hide a position:fixed child too. Card is
         pinned to 340px -- just past the 280px field frame -- and tall
         rather than wide, scrolling internally if content runs long. */
      +'.bb-overlay{position:fixed;inset:0;z-index:200;background:rgba(59,37,16,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
      +'.bb-overlay.active{display:flex}'
      +'.bb-overlay-card{width:340px;max-width:90vw;max-height:min(640px,90vh);overflow-y:auto;background:#FFFDF7;border-radius:8px;border-top:6px solid #C9A87C;box-shadow:0 10px 30px rgba(59,37,16,0.35);box-sizing:border-box;padding:18px 22px 22px}'
      +'.bb-overlay-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}'
      +'.bb-overlay-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7A5C3A}'
      +'.bb-close{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #C9A87C;cursor:pointer;font-size:13px;color:#3B2510}'
      +'.bb-close:hover{background:#FDF6E8}';
    document.head.appendChild(style);
  }

  function injectBriefingBoardScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-briefing-board')) return;
    injectBriefingBoardStyles();

    var div=document.createElement('div');
    div.innerHTML=
       '<div class="sc" id="s-briefing-board">'
        +'<div class="bb-mhead"><div class="bb-mh">Briefing Board</div><div class="bb-mt">A control and communication tool.</div></div>'
        +'<div id="bb-board-wrap"><div id="bb-cols"></div></div>'
        +'<div class="bb-trash" id="bb-trash" title="Trash">'+TRASH_SVG+'</div>'
        +'<div class="bar2"><button class="tb" id="b-bb-back">⬅️</button><button class="tb" id="b-bb-mg">🔍</button></div>'
      +'</div>';
    while(div.firstChild) fg.appendChild(div.firstChild);

    // Add a Card (9360), Back of the Card (9370) and the Trash confirm --
    // all overlays, living as direct children of #fg-root so they render
    // regardless of whether #s-briefing-board happens to be the active
    // .sc screen.
    if(!document.getElementById('bb-add-overlay')){
      var addOv=document.createElement('div');
      addOv.id='bb-add-overlay'; addOv.className='bb-overlay';
      addOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Add a Card</span><button class="bb-close" id="bb-add-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-new-task" placeholder="What needs to be done?"></textarea></div>'
            +'<div class="bb-field"><label>Due date &mdash; only if it’s real</label><input id="bb-new-due" type="text" placeholder="e.g. 7/25"></div>'
            +'<button class="jb" id="b-bb-save-card">Pin it to the board</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(addOv);
      addOv.addEventListener('click', function(e){ if(e.target===addOv) closeAddCard(); });
    }
    if(!document.getElementById('bb-detail-overlay')){
      var detailOv=document.createElement('div');
      detailOv.id='bb-detail-overlay'; detailOv.className='bb-overlay';
      detailOv.innerHTML=
         '<div class="bb-overlay-card">'
          +'<div class="bb-overlay-head"><span class="bb-overlay-title">Back of the Card</span><button class="bb-close" id="bb-detail-close" aria-label="Close">✕</button></div>'
          +'<div class="bbw">'
            +'<div class="bb-field"><label>Task</label><textarea id="bb-d-task"></textarea></div>'
            +'<div class="bb-field"><label>Assigned to</label><input id="bb-d-person" type="text"></div>'
            +'<div class="bb-field"><label>Due date</label><input id="bb-d-due" type="text"></div>'
            +'<div class="bb-field"><label>Budget &mdash; time or dollars</label><input id="bb-d-budget" type="text"></div>'
            +'<div class="bb-field"><label>Notes / plussing</label><textarea id="bb-d-notes" placeholder="How could this go better next time?"></textarea></div>'
            +'<div class="bb-field"><label>Priority</label><div class="bb-priorities">'
              +PRIORITIES.map(function(p){ return '<button class="bb-pri-btn" data-pri="'+p+'">'+p+'</button>'; }).join('')
            +'</div></div>'
            +'<div class="bb-field"><label>Signal flag</label><div class="bb-flags">'
              +'<button class="bb-flag-btn" data-flag="none">none</button>'
              +'<button class="bb-flag-btn" data-flag="red">red</button>'
              +'<button class="bb-flag-btn" data-flag="green">green</button>'
              +'<button class="bb-flag-btn" data-flag="blue">blue</button>'
            +'</div></div>'
            +'<div class="bb-field" style="text-align:center">'
              +'<label>Resonance</label>'
              +'<button class="bb-heart-pill" id="bb-d-heart" aria-label="Tap to add a heart, hold to remove one">'
                +'<span style="color:#a3372b;font-size:13px">❤</span><span id="bb-d-heart-count">0</span>'
              +'</button>'
            +'</div>'
          +'</div>'
        +'</div>';
      fg.appendChild(detailOv);
      detailOv.addEventListener('click', function(e){ if(e.target===detailOv) closeCardDetail(); });
    }
    if(!document.getElementById('bb-trash-overlay')){
      var trashOv=document.createElement('div');
      trashOv.id='bb-trash-overlay'; trashOv.className='bb-overlay';
      trashOv.innerHTML=
         '<div class="bb-overlay-card" style="width:280px;text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:18px;font-weight:700;color:#3B2510;margin-bottom:6px">Moose poop?</div>'
          +'<div style="font-size:12px;color:#7A5C3A;font-style:italic;margin-bottom:14px">Off the board for good &mdash; this isn’t the same as Done.</div>'
          +'<div style="display:flex;gap:8px">'
            +'<button class="bb-flag-btn" id="bb-trash-yes" style="background:#a3372b;color:#fff;border-color:#a3372b">Yes</button>'
            +'<button class="bb-flag-btn" id="bb-trash-no">Keep it</button>'
          +'</div>'
        +'</div>';
      fg.appendChild(trashOv);
      trashOv.addEventListener('click', function(e){ if(e.target===trashOv) closeTrashConfirm(); });
    }

    T().registerPageNum('s-briefing-board', '9350');
    T().registerUtilScreen('s-briefing-board');
    T().registerCtx('s-briefing-board', 'Briefing Board');

    T().registerScreenActivate('s-briefing-board', function(){
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.add('isx-full');
      renderBoard();
    });

    wireBriefingBoard();
  }

  function renderBoard(){
    var wrap=document.getElementById('bb-cols'); if(!wrap) return;
    wrap.innerHTML='';
    var cards=_bbCardsList();
    COLUMNS.forEach(function(cd){
      var col=document.createElement('div');
      col.className='bb-col';
      col.setAttribute('data-col', cd.key);
      var note = cd.key==='done' ? '<div class="bb-col-note">stays here until reviewed</div>'
               : cd.key==='hangups' ? '<div class="bb-col-note">a card here says &quot;help!&quot;</div>' : '';
      col.innerHTML='<div class="bb-col-head">'+cd.label+'</div>'+note
        +'<div class="bb-col-cards" data-col="'+cd.key+'"></div>'
        +(cd.key==='do' ? '<div class="bb-add-tile" id="bb-add-tile">+ new card</div>' : '');
      wrap.appendChild(col);
    });
    // Each column sorts by priority -- H at the top, unset priority (not
    // yet triaged) at the bottom -- ties keep their existing relative
    // order (stable sort), same order the cards already landed in.
    COLUMNS.forEach(function(cd){
      var target=wrap.querySelector('.bb-col-cards[data-col="'+cd.key+'"]');
      if(!target) return;
      var colCards=cards.filter(function(c){ return c.col===cd.key; });
      colCards.sort(function(a,b){ return _priRank(a)-_priRank(b); });
      colCards.forEach(function(c){
        var el=document.createElement('div');
        el.className='bb-card';
        el.draggable=true;
        el.setAttribute('data-id', c.id);
        var dot = c.flag==='red' ? '#a3372b' : '#3B2510';
        var priBadge = c.priority ? '<span class="bb-pri-badge" style="background:'+PRI_COLOR[c.priority]+'">'+c.priority+'</span>' : '';
        el.innerHTML='<div class="bb-top"><span class="bb-top-left">'+priBadge+'<span class="bb-date">'+_esc(c.assigned)+'</span></span><span class="bb-dot" style="background:'+dot+'">'+_esc(c.person||'')+'</span></div>'
          +'<div class="bb-task">'+_esc(c.task)+'</div>'
          +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+_esc(c.due||'')+'</span></div>'
          +(c.hearts?('<div class="bb-heart-badge">'+(c.hearts>=2?'💕':'❤️')+'</div>'):'')
          +'<div class="bb-corner" data-flip="'+c.id+'" title="Flip card"></div>';
        el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
        target.appendChild(el);
      });
    });
    wrap.querySelectorAll('.bb-corner').forEach(function(el){
      el.addEventListener('click', function(e){
        e.stopPropagation();
        openCardDetail(Number(el.getAttribute('data-flip')));
      });
    });
    wrap.querySelectorAll('.bb-col-cards').forEach(function(zone){
      zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('bb-dragover'); });
      zone.addEventListener('dragleave', function(){ zone.classList.remove('bb-dragover'); });
      zone.addEventListener('drop', function(e){
        e.preventDefault();
        zone.classList.remove('bb-dragover');
        var id=Number(e.dataTransfer.getData('text/plain'));
        var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
        if(c){
          var wasCol=c.col;
          c.col=zone.getAttribute('data-col');
          if(c.col==='doing' && wasCol==='do' && !c.startDate) c.startDate=_bbToday();
          if(c.col==='done' && wasCol!=='done') c.completedDate=_bbToday();
          _bbSaveLocal(_bbCardsList());
        }
        renderBoard();
      });
    });
    var addTile=document.getElementById('bb-add-tile');
    if(addTile) addTile.addEventListener('click', openAddCard);
  }

  function openAddCard(){
    var t=document.getElementById('bb-new-task'); if(t) t.value='';
    var d=document.getElementById('bb-new-due'); if(d) d.value='';
    var ov=document.getElementById('bb-add-overlay'); if(ov) ov.classList.add('active');
  }

  function closeAddCard(){
    var ov=document.getElementById('bb-add-overlay'); if(ov) ov.classList.remove('active');
  }

  function _bbHighlightPriority(priority){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      var p=btns[i].getAttribute('data-pri');
      if(p===priority){
        btns[i].style.background=PRI_COLOR[p];
        btns[i].style.borderColor=PRI_COLOR[p];
        btns[i].style.color='#fff';
      } else {
        btns[i].style.background='';
        btns[i].style.borderColor='';
        btns[i].style.color='';
      }
    }
  }

  function openCardDetail(id){
    _bbOpenCardId=id;
    var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
    if(!c) return;
    document.getElementById('bb-d-task').value=c.task||'';
    document.getElementById('bb-d-person').value=c.person||'';
    document.getElementById('bb-d-due').value=c.due||'';
    document.getElementById('bb-d-budget').value=c.budget||'';
    document.getElementById('bb-d-notes').value=c.notes||'';
    var heartCountEl=document.getElementById('bb-d-heart-count');
    if(heartCountEl) heartCountEl.textContent=c.hearts||0;
    _bbHighlightPriority(c.priority||'');
    var flags=document.querySelectorAll('#bb-detail-overlay .bb-flag-btn');
    for(var i=0;i<flags.length;i++){
      flags[i].classList.toggle('bb-flag-active', flags[i].getAttribute('data-flag')===(c.flag||'none'));
    }
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.add('active');
  }

  function closeCardDetail(){
    var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
    if(c){
      c.task=document.getElementById('bb-d-task').value;
      c.person=document.getElementById('bb-d-person').value;
      c.due=document.getElementById('bb-d-due').value;
      c.budget=document.getElementById('bb-d-budget').value;
      c.notes=document.getElementById('bb-d-notes').value;
      _bbSaveLocal(_bbCardsList());
    }
    _bbOpenCardId=null;
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.remove('active');
    renderBoard();
  }

  function openTrashConfirm(id){
    _bbTrashPendingId=id;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.add('active');
  }

  function closeTrashConfirm(){
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
  }

  function doTrashCard(){
    var id=_bbTrashPendingId;
    _bbCards=_bbCardsList().filter(function(x){ return x.id!==id; });
    _bbSaveLocal(_bbCards);
    _bbTrashPendingId=null;
    var ov=document.getElementById('bb-trash-overlay'); if(ov) ov.classList.remove('active');
    renderBoard();
  }

  function wireTrashIcon(){
    var trash=document.getElementById('bb-trash'); if(!trash) return;
    trash.addEventListener('dragover', function(e){ e.preventDefault(); trash.classList.add('bb-trash-dropready'); });
    trash.addEventListener('dragleave', function(){ trash.classList.remove('bb-trash-dropready'); });
    trash.addEventListener('drop', function(e){
      e.preventDefault();
      trash.classList.remove('bb-trash-dropready');
      var id=Number(e.dataTransfer.getData('text/plain'));
      if(id) openTrashConfirm(id);
    });
  }

  function wireHeartPill(){
    var heartBtn=document.getElementById('bb-d-heart');
    var heartCountEl=document.getElementById('bb-d-heart-count');
    if(!heartBtn) return;
    var holdTimer=null, held=false;
    function applyDelta(delta){
      var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
      if(!c) return;
      c.hearts=Math.max(0,(c.hearts||0)+delta);
      _bbSaveLocal(_bbCardsList());
      if(heartCountEl) heartCountEl.textContent=c.hearts;
    }
    function startHold(){ held=false; holdTimer=setTimeout(function(){ held=true; applyDelta(-1); }, 550); }
    function cancelHold(){ clearTimeout(holdTimer); }
    heartBtn.addEventListener('mousedown', startHold);
    heartBtn.addEventListener('touchstart', startHold);
    heartBtn.addEventListener('mouseup', cancelHold);
    heartBtn.addEventListener('mouseleave', cancelHold);
    heartBtn.addEventListener('touchend', cancelHold);
    heartBtn.addEventListener('click', function(){ if(!held) applyDelta(1); held=false; });
  }

  function wirePriorityButtons(){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
          if(!c) return;
          var p=btn.getAttribute('data-pri');
          c.priority = (c.priority===p) ? '' : p; // tap the active one again to clear it
          _bbSaveLocal(_bbCardsList());
          _bbHighlightPriority(c.priority);
          renderBoard();
        });
      })(btns[i]);
    }
  }

  function wireBriefingBoard(){
    T().wire('b-bb-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    T().wire('b-bb-mg', T().goMG);

    T().wire('bb-add-close', closeAddCard);
    T().wire('b-bb-save-card', function(){
      var t=document.getElementById('bb-new-task');
      var d=document.getElementById('bb-new-due');
      var text=t?t.value.trim():'';
      if(!text) return;
      var cards=_bbCardsList();
      cards.push({id:Date.now(), col:'do', assigned:_bbToday(), task:text, person:'', due:d?d.value.trim():'', budget:'', notes:'', flag:'none', hearts:0, priority:''});
      _bbSaveLocal(cards);
      closeAddCard();
      renderBoard();
    });

    T().wire('bb-detail-close', closeCardDetail);
    var flagBtns=document.querySelectorAll('#bb-detail-overlay .bb-flag-btn');
    for(var i=0;i<flagBtns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
          if(c) c.flag=btn.getAttribute('data-flag');
          var all=document.querySelectorAll('#bb-detail-overlay .bb-flag-btn');
          for(var j=0;j<all.length;j++) all[j].classList.remove('bb-flag-active');
          btn.classList.add('bb-flag-active');
        });
      })(flagBtns[i]);
    }
    wireHeartPill();
    wirePriorityButtons();

    T().wire('bb-trash-yes', doTrashCard);
    T().wire('bb-trash-no', closeTrashConfirm);
    wireTrashIcon();
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
  });

})();
