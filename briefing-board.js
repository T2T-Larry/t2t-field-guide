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
     9350  s-briefing-board   the board itself (4 fixed columns)
     9360  s-briefing-add     Add a Card
     9370  s-briefing-detail  Back of the Card
   9380/9390 held in reserve (a Done archive, automation settings,
   whatever earns its place later).

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

  var _bbCards = null;
  var _bbOpenCardId = null;

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
      {id:1, col:'do', assigned:_bbToday(), task:'Drag this card to Doing when you start it', person:'', due:'', budget:'', notes:'', flag:'none'}
    ];
  }
  function _bbCardsList(){
    if(!_bbCards){ _bbCards = _bbLoadLocal() || _bbSeed(); }
    return _bbCards;
  }

  function _esc(s){
    return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
  }

  function injectBriefingBoardStyles(){
    if(document.getElementById('bb-style')) return;
    var style=document.createElement('style');
    style.id='bb-style';
    style.textContent=
       '#fg-root.isx-full #s-briefing-board.active{height:100%!important;min-height:0!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:column}'
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
      +'.bb-card .bb-top{display:flex;justify-content:space-between;margin-bottom:3px}'
      +'.bb-card .bb-date{font-family:"Caveat",cursive;font-size:13px;color:#6b4a2e}'
      +'.bb-card .bb-dot{width:16px;height:16px;border-radius:50%;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;flex-shrink:0}'
      +'.bb-card .bb-task{color:#3B2510;margin:2px 0 5px}'
      +'.bb-card .bb-bottom{display:flex;justify-content:space-between;font-family:"Caveat",cursive;font-size:12px;color:#7A5C3A;min-height:12px}'
      +'.bb-card .bb-bottom .bb-due{color:#a3372b}'
      +'.bb-corner{position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 13px 13px;border-color:transparent transparent rgba(59,37,16,0.35) transparent;cursor:pointer}'
      +'.bb-corner:hover{border-width:0 0 17px 17px;border-color:transparent transparent rgba(59,37,16,0.6) transparent}'
      +'.bb-add-tile{border:1.5px dashed #C9A87C;border-radius:3px;text-align:center;padding:8px;font-size:12px;color:#6b4a2e;cursor:pointer;font-family:Georgia,serif}'
      +'.bb-add-tile:hover{background:rgba(201,168,124,0.2)}'
      +'.bbw{flex:1;display:flex;flex-direction:column;align-items:center;padding:20px 24px;background:#FDF6E8;width:100%;box-sizing:border-box}'
      +'.bb-field{width:100%;max-width:280px;margin-bottom:12px;text-align:left}'
      +'.bb-field label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7A5C3A;margin-bottom:3px}'
      +'.bb-field input,.bb-field textarea{width:100%;font-family:Georgia,serif;font-size:14px;border:1.5px solid #C9A87C;border-radius:4px;padding:7px 8px;background:#fff;color:#3B2510;box-sizing:border-box}'
      +'.bb-field textarea{min-height:60px;font-family:"Caveat",cursive;font-size:16px;resize:vertical}'
      +'.bb-flags{display:flex;gap:6px}'
      +'.bb-flag-btn{flex:1;font-size:11px;padding:6px 2px;border-radius:4px;border:1.5px solid #C9A87C;background:#fff;cursor:pointer;color:#7A5C3A;font-family:Georgia,serif}'
      +'.bb-flag-btn.bb-flag-active{background:#a3372b;color:#fff;border-color:#a3372b}';
    document.head.appendChild(style);
  }

  function injectBriefingBoardScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-briefing-board')) return;
    injectBriefingBoardStyles();

    var div=document.createElement('div');
    div.innerHTML=
       '<div class="sc" id="s-briefing-board">'
        +'<div class="bb-mhead"><div class="bb-mh">Briefing Board</div><div class="bb-mt">Do &middot; Doing &middot; Done &middot; Hang-Ups &mdash; what’s happening right now.</div></div>'
        +'<div id="bb-board-wrap"><div id="bb-cols"></div></div>'
        +'<div class="bar2"><button class="tb" id="b-bb-back">⬅️</button><button class="tb" id="b-bb-mg">🔍</button></div>'
      +'</div>'
      +'<div class="sc" id="s-briefing-add">'
        +'<div class="card"><div class="bbw">'
          +'<div class="bb-field"><label>Task</label><textarea id="bb-new-task" placeholder="What needs to be done?"></textarea></div>'
          +'<div class="bb-field"><label>Due date &mdash; only if it’s real</label><input id="bb-new-due" type="text" placeholder="e.g. 7/25"></div>'
          +'<button class="jb" id="b-bb-save-card">Pin it to the board</button>'
        +'</div></div>'
        +'<div class="bar2"><button class="tb" id="b-bb-add-back">⬅️</button><button class="tb" id="b-bb-add-mg">🔍</button></div>'
      +'</div>'
      +'<div class="sc" id="s-briefing-detail">'
        +'<div class="card"><div class="bbw">'
          +'<div class="bb-field"><label>Task</label><textarea id="bb-d-task"></textarea></div>'
          +'<div class="bb-field"><label>Assigned to</label><input id="bb-d-person" type="text"></div>'
          +'<div class="bb-field"><label>Due date</label><input id="bb-d-due" type="text"></div>'
          +'<div class="bb-field"><label>Budget &mdash; time or dollars</label><input id="bb-d-budget" type="text"></div>'
          +'<div class="bb-field"><label>Notes / plussing</label><textarea id="bb-d-notes" placeholder="How could this go better next time?"></textarea></div>'
          +'<div class="bb-field"><label>Signal flag</label><div class="bb-flags">'
            +'<button class="bb-flag-btn" data-flag="none">none</button>'
            +'<button class="bb-flag-btn" data-flag="red">red</button>'
            +'<button class="bb-flag-btn" data-flag="green">green</button>'
            +'<button class="bb-flag-btn" data-flag="blue">blue</button>'
          +'</div></div>'
        +'</div></div>'
        +'<div class="bar2"><button class="tb" id="b-bb-d-back">⬅️</button><button class="tb" id="b-bb-d-mg">🔍</button></div>'
      +'</div>';
    while(div.firstChild) fg.appendChild(div.firstChild);

    T().registerPageNum('s-briefing-board',  '9350');
    T().registerPageNum('s-briefing-add',    '9360');
    T().registerPageNum('s-briefing-detail', '9370');
    T().registerUtilScreen('s-briefing-board');
    T().registerUtilScreen('s-briefing-add');
    T().registerUtilScreen('s-briefing-detail');
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
    cards.forEach(function(c){
      var target=wrap.querySelector('.bb-col-cards[data-col="'+c.col+'"]');
      if(!target) return;
      var el=document.createElement('div');
      el.className='bb-card';
      el.draggable=true;
      el.setAttribute('data-id', c.id);
      var dot = c.flag==='red' ? '#a3372b' : '#3B2510';
      el.innerHTML='<div class="bb-top"><span class="bb-date">'+_esc(c.assigned)+'</span><span class="bb-dot" style="background:'+dot+'">'+_esc(c.person||'')+'</span></div>'
        +'<div class="bb-task">'+_esc(c.task)+'</div>'
        +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+_esc(c.due||'')+'</span></div>'
        +'<div class="bb-corner" data-flip="'+c.id+'" title="Flip card"></div>';
      el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
      target.appendChild(el);
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
    if(addTile) addTile.addEventListener('click', function(){
      var t=document.getElementById('bb-new-task'); if(t) t.value='';
      var d=document.getElementById('bb-new-due'); if(d) d.value='';
      T().nav('s-briefing-add');
    });
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
    var flags=document.querySelectorAll('#s-briefing-detail .bb-flag-btn');
    for(var i=0;i<flags.length;i++){
      flags[i].classList.toggle('bb-flag-active', flags[i].getAttribute('data-flag')===(c.flag||'none'));
    }
    T().nav('s-briefing-detail');
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
    T().nav('s-briefing-board');
  }

  function wireBriefingBoard(){
    T().wire('b-bb-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('isx-full');
      T().returnToMG();
    });
    T().wire('b-bb-mg', T().goMG);

    T().wire('b-bb-add-back', function(){ T().nav('s-briefing-board'); });
    T().wire('b-bb-add-mg', T().goMG);
    T().wire('b-bb-save-card', function(){
      var t=document.getElementById('bb-new-task');
      var d=document.getElementById('bb-new-due');
      var text=t?t.value.trim():'';
      if(!text) return;
      var cards=_bbCardsList();
      cards.push({id:Date.now(), col:'do', assigned:_bbToday(), task:text, person:'', due:d?d.value.trim():'', budget:'', notes:'', flag:'none'});
      _bbSaveLocal(cards);
      T().nav('s-briefing-board');
    });

    T().wire('b-bb-d-back', closeCardDetail);
    T().wire('b-bb-d-mg', T().goMG);
    var flagBtns=document.querySelectorAll('#s-briefing-detail .bb-flag-btn');
    for(var i=0;i<flagBtns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbCardsList().filter(function(x){ return x.id===_bbOpenCardId; })[0];
          if(c) c.flag=btn.getAttribute('data-flag');
          var all=document.querySelectorAll('#s-briefing-detail .bb-flag-btn');
          for(var j=0;j<all.length;j++) all[j].classList.remove('bb-flag-active');
          btn.classList.add('bb-flag-active');
        });
      })(flagBtns[i]);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    injectBriefingBoardScreens();
  });

})();
