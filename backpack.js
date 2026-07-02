/* ============================================================
   backpack.js — T2T Field Guide shared infrastructure v1.0
   Loaded by index.html, dream.html, and all future phase files.
   Injects MG overlay, wires backpack, manages all shared state.
   ============================================================ */

(function(){

  /* ── SUPABASE ── */
  const SB_URL = 'https://jyvvbjxqmxdgsxfcrfdn.supabase.co';
  const SB_KEY = 'sb_publishable_LADU6bQTx91yLtXdm4Xb4g_jLjQ6meh';
  const _sb = supabase.createClient(SB_URL, SB_KEY);

  const MIRO_TOKEN = "eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_Iy_RI5tvgF-kztbeMcvBiJUU50I";

  /* ── MEMBER PROFILE ── */
  var _member = {
    user_id:null, email:null, display_name:null,
    miro_board_id:null, journal_board_id:null,
    gems_board_id:null, briefing_board_id:null
  };

  async function loadMemberProfile(userId) {
    try {
      var res = await _sb.from('profiles').select('*').eq('user_id', userId).single();
      if (res.data) {
        _member.user_id          = userId;
        _member.display_name     = res.data.display_name      || '';
        _member.miro_board_id    = res.data.miro_board_id     || null;
        _member.journal_board_id = res.data.journal_board_id  || null;
        _member.gems_board_id    = res.data.gems_board_id     || null;
        _member.briefing_board_id= res.data.briefing_board_id || null;
        var nameEl = document.getElementById('jcov-member-name');
        if (nameEl && _member.display_name) nameEl.textContent = _member.display_name.toUpperCase();
      }
    } catch(e) {}
  }

  /* ── NAV STATE ── persisted across phase transitions via sessionStorage */
  var cur         = 's-signin';
  var stack       = [];
  var primaryPage = null;
  var mgOrigin    = null;
  var seaChapterEntry = false; /* true only when Sea of Ideas was entered via the normal CREATE chapter flow (not via the 🔍 backpack) */
  var _primaryPages = [];

  (function restoreNavState(){
    try {
      var saved = sessionStorage.getItem('bp_nav');
      if (saved) {
        var s = JSON.parse(saved);
        stack       = s.stack       || [];
        primaryPage = s.primaryPage || null;
        mgOrigin    = s.mgOrigin    || null;
        sessionStorage.removeItem('bp_nav');
      }
    } catch(e) {}
  })();

  function persistNavState() {
    try {
      sessionStorage.setItem('bp_nav', JSON.stringify({
        stack:stack, primaryPage:primaryPage, mgOrigin:mgOrigin
      }));
    } catch(e) {}
  }

  /* ── GEMS REGISTRY ── */
  var _gemsRegistry = {};

  function registerGems(screenId, candidates) {
    _gemsRegistry[screenId] = candidates || [];
  }

  function getGemCandidates() {
    return _gemsRegistry[cur] || [];
  }

  /* ── TRIVIA REGISTRY ── */
  var _triviaRegistry = {};
  var _triviaScreens = [];   /* all screen IDs registered as trivia targets */
  var _triviaOverride = null; /* forces renderTrivia() to use this screen's registry instead of
                                  primaryPage/mgOrigin — for hub screens (Idea/Journal/Gems) whose
                                  own trivia should show regardless of which primary page launched
                                  the MG. Persists across repeat visits to the Trivia hub while
                                  browsing that hub's cards; cleared in goMG() the moment the MG is
                                  genuinely opened from a real (non-utility) primary page. */

  function registerTrivia(screenId, links) {
    _triviaRegistry[screenId] = links || [];
    /* track the target screen IDs so goBack() can identify trivia pages */
    (links||[]).forEach(function(link){
      if(link.id && _triviaScreens.indexOf(link.id)===-1)
        _triviaScreens.push(link.id);
    });
  }

  function renderTrivia() {
    var el = document.getElementById('trivia-links');
    if (!el) return;
    el.innerHTML = '';
    var ctxLbl = document.getElementById('trivia-ctx-label');
    if (ctxLbl) ctxLbl.textContent = getCtx() + ' · TRIVIA';
    // Hub trivia (Idea/Journal/Gems) takes priority when set; otherwise primary page or mgOrigin — no stack walk
    var links = (_triviaOverride && _triviaRegistry[_triviaOverride]) || _triviaRegistry[primaryPage] || _triviaRegistry[mgOrigin] || [];
    if (!links.length) {
      el.innerHTML = '<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-style:italic;color:#aaa;padding:16px 0">Nothing here yet.</div>';
      return;
    }
    links.forEach(function(link) {
      var div = document.createElement('div');
      var pn = _pageNums[link.id];
      div.className = 'more-link' + (pn && getVisited().indexOf(pn)!==-1 ? ' visited' : '');
      div.innerHTML =
        '<div class="more-link-left">' +
          '<div class="more-link-icon">' + (link.icon || '✦') + '</div>' +
          '<div><div class="more-link-label">' + link.label + '</div>' +
          (link.sub ? '<div class="more-link-sub">' + link.sub + '</div>' : '') +
          '</div></div>' +
        '<div class="more-link-arrow"></div>';
      div.addEventListener('click', function() { nav(link.id); });
      el.appendChild(div);
    });
  }

  /* ── CONTEXT MAP ── */
  var _ctxMap = {};
  function registerCtx(screenId, label) { _ctxMap[screenId] = label; }
  function getCtx() {
    if (_ctxMap[cur]) return _ctxMap[cur];
    for (var i = stack.length - 1; i >= 0; i--) { if (_ctxMap[stack[i]]) return _ctxMap[stack[i]]; }
    return 'Field Guide';
  }

  /* ── MAP + MORE CONFIG ── */
  var _mapMap  = {};
  var _moreMap = {};
  function registerMap(screenId, mapScreenId)   { _mapMap[screenId]  = mapScreenId; }
  function registerMore(screenId, moreScreenId) { _moreMap[screenId] = moreScreenId; }

  /* ── PAGE NUMBERS ── */
  var _pageNums = {};
  var _pageNumsReverse = {};
  function registerPageNum(screenId, num) { _pageNums[screenId] = num; _pageNumsReverse[num] = screenId; }

  /* ── UTILITY SCREENS ── */
  var _utilScreens = [
    's-trivia','s-cover-more','s-invention-more','s-want-more','s-know-more',
    's-what-is-t2t','s-t2t-goals','s-authors',
    's-thoughts-1','s-thoughts-2','s-thoughts-3',
    's-idea','s-idea-capture',
    's-journal','s-journal-capture','s-journal-cover',
    's-journal-view','s-journal-entry','s-journal-miro',
    's-gems','s-gem-add','s-gems-list','s-gems-miro',
    's-tools','s-question','s-create','s-shape-tools','s-share','s-dare',
    's-configure','s-change-password','s-sea-of-ideas','s-sea-of-ideas-cluster'
  ];
  function registerUtilScreen(screenId) {
    if (_utilScreens.indexOf(screenId) === -1) _utilScreens.push(screenId);
  }

  /* ── VISITED PAGES ── */
  function getVisited() { try { var v=sessionStorage.getItem('visitedPages'); return v?JSON.parse(v):[]; } catch(e){ return []; } }
  function addVisited(num) {
    if (!num) return;
    try { var v=getVisited(); if(v.indexOf(num)===-1){ v.push(num); sessionStorage.setItem('visitedPages',JSON.stringify(v)); upsertVisited(num); } } catch(e){}
  }
  async function upsertVisited(num) {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return;
      await _sb.from('visited_pages').upsert({user_id:user.data.user.id,page_num:num},{onConflict:'user_id,page_num'});
    } catch(e){}
  }
  async function loadVisitedFromSupabase() {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return;
      var res=await _sb.from('visited_pages').select('page_num').eq('user_id',user.data.user.id);
      if(res.data){ sessionStorage.setItem('visitedPages',JSON.stringify(res.data.map(function(r){return r.page_num;}))); }
    } catch(e){}
  }

  /* ── CORE NAV ── */
  function nav(id, push) {
    var t=document.getElementById(id); if(!t) return;
    var fg=document.getElementById('fg-root');
    var pool=document.getElementById('bp-util-pool');
    if(pool&&fg&&t.parentNode===pool){ fg.appendChild(t); }
    document.querySelectorAll('.sc').forEach(function(s){ s.classList.remove('active'); });
    t.classList.add('active');
    if (push!==false) stack.push(cur);
    cur=id;
    if (_primaryPages.indexOf(id)!==-1) primaryPage=id;
    var pn=_pageNums[id]; if(pn) addVisited(pn);
    if (id==='s-trivia')          renderTrivia();
    if (id==='s-journal')         { var jc=document.getElementById('journal-view-choices'); if(jc) jc.style.display='none'; }
    if (id==='s-gems')            { var gc=document.getElementById('gems-view-choices');    if(gc) gc.style.display='none'; }
    if (id==='s-journal-view')    renderJournalView();
    if (id==='s-journal-cover')   initJournalCover();
    if (id==='s-gems-list')       renderGemsView();
    if (id==='s-sea-of-ideas')    renderSeaOfIdeas();
    if (id==='s-sea-of-ideas-cluster') renderSeaOfIdeasCluster();
    if (id==='s-change-password') initChangePassword();
    window.scrollTo(0,0);
  }

  function goBack() {
    var ov=document.getElementById('mg-overlay');
    if (ov&&ov.classList.contains('active')){ ov.classList.remove('active'); return; }
    /* trivia content page → always return to trivia hub */
    if (_triviaScreens.indexOf(cur)!==-1){ nav('s-trivia',false); return; }
    /* utility hub → reopen MG overlay */
    if (_utilScreens.indexOf(cur)!==-1){ goMG(); return; }
    /* PP → go to previous PP by page number */
    goBackByNum();
  }

  /* ── NUMERIC BACK NAV ── */
  function currentFile() {
    var path = window.location.pathname;
    return path.substring(path.lastIndexOf('/')+1) || 'index.html';
  }

  async function navToPageNum(num) {
    // Local registry first — no Supabase needed if screen is in this file
    var localId = _pageNumsReverse[num];
    if (localId && document.getElementById(localId)) {
      nav(localId, false);
      return;
    }
    // Not found locally — cross-file nav via Supabase
    try {
      var res = await _sb.from('pages').select('*').eq('page_num',num).single();
      if (!res.data) return;
      var page = res.data;
      if (page.phase_file === currentFile()) {
        nav(page.screen_id, false);
      } else {
        sessionStorage.setItem('bp_target', num);
        goPhase(page.phase_file);
      }
    } catch(e) { console.warn('navToPageNum failed:', e); }
  }

  async function goBackByNum() {
    var curNum = _pageNums[cur];
    if (!curNum) { if(stack.length>0) nav(stack.pop(),false); return; }
    // Find nearest lower page number in local registry first
    var nums = Object.keys(_pageNumsReverse).sort();
    var lower = null;
    for (var i = nums.length-1; i >= 0; i--) {
      if (nums[i] < curNum) { lower = nums[i]; break; }
    }
    if (lower) {
      var localId = _pageNumsReverse[lower];
      if (localId && document.getElementById(localId)) {
        nav(localId, false);
        return;
      }
    }
    // Not found locally — try Supabase for cross-file back nav
    try {
      var res = await _sb.from('pages')
        .select('*')
        .in('page_type', ['pp','phase'])
        .lt('page_num', curNum)
        .order('page_num', {ascending:false})
        .limit(1)
        .single();
      if (!res.data) { if(stack.length>0) nav(stack.pop(),false); return; }
      var page = res.data;
      if (page.phase_file === currentFile()) {
        nav(page.screen_id, false);
      } else {
        sessionStorage.setItem('bp_target', page.page_num);
        goPhase(page.phase_file);
      }
    } catch(e) { if(stack.length>0) nav(stack.pop(),false); }
  }

  function goMG() {
    if (_utilScreens.indexOf(cur)===-1) { mgOrigin=cur; _triviaOverride=null; }
    var ov=document.getElementById('mg-overlay');
    if (ov) ov.classList.add('active');
  }

  function closeMG(){ var ov=document.getElementById('mg-overlay'); if(ov) ov.classList.remove('active'); }

  /* ── RETURN TO MG ── used by every backpack screen's ⬅️ (Map, Idea, Journal,
     Gems, Tools, Trivia). Goes back to the origin page AND reopens the MG
     overlay on top of it, restoring exactly the state the traveler left. */
  function returnToMG(){
    if (mgOrigin){ nav(mgOrigin,false); goMG(); }
    else { goBack(); }
  }

  function goMap() {
    closeMG();
    var srcNum=_pageNums[cur]||null;
    var m=_mapMap[cur];
    if(!m){ for(var i=stack.length-1;i>=0;i--){ if(_mapMap[stack[i]]){ m=_mapMap[stack[i]]; break; } } }
    nav(m||'s-cover-map');
    renderMap(srcNum);
  }

  function goMore() {
    closeMG();
    var m=_moreMap[primaryPage]||_moreMap[cur];
    if(!m) return;
    nav(m);
  }

  function goPhase(url) { persistNavState(); window.location.href=url; }

  /* ── HIDDEN MICKEY — triple-tap reveals page number ── */
  (function(){
    var _tapCount = 0, _tapTimer = null;
    function showPageToast(num) {
      var existing = document.getElementById('hm-toast');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.id = 'hm-toast';
      toast.textContent = '📍 ' + num;
      toast.style.cssText = [
        'position:fixed','bottom:72px','left:50%','transform:translateX(-50%)',
        'background:rgba(10,74,56,0.92)','color:#C9A87C',
        'font-family:Playfair Display,serif','font-size:13px','font-weight:700',
        'letter-spacing:4px','padding:8px 20px','border-radius:20px',
        'box-shadow:0 4px 16px rgba(0,0,0,0.35)','z-index:9999',
        'pointer-events:none','opacity:0','transition:opacity 0.2s'
      ].join(';');
      document.body.appendChild(toast);
      requestAnimationFrame(function(){
        toast.style.opacity = '1';
        setTimeout(function(){
          toast.style.opacity = '0';
          setTimeout(function(){ toast.remove(); }, 220);
        }, 1800);
      });
    }
    document.addEventListener('click', function(e){
      if (e.target.closest('button, a, input, textarea, select, [role="button"], .mg-btn, .mg-ret, .spark-door, .ib, .jb, .gb, .tb, .more-link, .tool-row, .save-btn, .jsave-btn, .gsave-btn')) return;
      _tapCount++;
      clearTimeout(_tapTimer);
      _tapTimer = setTimeout(function(){ _tapCount = 0; }, 500);
      if (_tapCount >= 3){
        _tapCount = 0;
        var ov=document.getElementById('mg-overlay');
        var mgOpen = ov && ov.classList.contains('active');
        var num = mgOpen ? '9000' : (_pageNums[cur] || '—');
        showPageToast(num);
      }
    });
  })();

  function wire(id,fn){ var el=document.getElementById(id); if(el) el.addEventListener('click',fn); }

  function togglePh(id){
    var el=document.getElementById(id),tog=document.getElementById(id+'-tog'); if(!el) return;
    var hidden=el.classList.contains('phd')||el.style.display==='none';
    if(hidden){ el.classList.remove('phd'); el.style.display='flex'; if(tog) tog.textContent='▲'; }
    else      { el.classList.add('phd');    el.style.display='none'; if(tog) tog.textContent='▼'; }
  }

  function setPhOpen(id, open){
    var el=document.getElementById(id),tog=document.getElementById(id+'-tog'); if(!el) return;
    if(open){ el.classList.remove('phd'); el.style.display='flex'; if(tog) tog.textContent='▲'; }
    else     { el.classList.add('phd');    el.style.display='none'; if(tog) tog.textContent='▼'; }
  }

  function autoOpenMapPhase(curNum){
    var allSections = ['map-intro-steps','map-dream','map-believe','map-dare','map-journey'];
    var target = 'map-intro-steps';
    if(curNum){
      var lead=curNum.charAt(0);
      if(lead==='1') target='map-dream';
      else if(lead==='2') target='map-believe';
      else if(lead==='3') target='map-dare';
      else if(lead==='4') target='map-journey';
    }
    allSections.forEach(function(id){ setPhOpen(id, id===target); });
  }

  /* ── MAP RENDER ── */
  var _introSteps = [
    {num:'0100',label:'Field Guide',                                  id:'s-cover'},
    {num:'0200',label:'Every great invention started as a thought.',  id:'s-invention'},
    {num:'0300',label:'What do you want?',                            id:'s-want'},
    {num:'0400',label:'Do you know what you want?',                   id:'s-know'}
  ];

  var _dreamSteps = [
    {num:'1000',label:'The Dream Phase',   id:'s-dream'},
    {num:'1100',label:'CREATE',            id:'s-create-hub'},
    {num:'1110',label:'Creative License',  id:'s-cl-intro'},
    {num:'1130',label:'Inklings',          id:'s-what-i-want'},
    {num:'1140',label:'Creative Sparks',   id:'s-lightning-bug'},
    {num:'1150',label:'Sea of Ideas',      id:'s-sea-of-ideas'},
    {num:'1160',label:'PLUSing',           id:'s-plusing'}
  ];

  function renderStepList(containerId, steps, curNum, visited) {
    var el=document.getElementById(containerId); if(!el) return;
    el.innerHTML='';
    steps.forEach(function(step){
      var div=document.createElement('div');
      var isCur=(step.num===curNum), isVis=visited.indexOf(step.num)!==-1&&!isCur;
      div.className='st'+(isCur?' here':isVis?' vis':' unv');
      div.innerHTML='<span class="sn">'+(isCur?'📍':isVis?'👣':step.num)+'</span><span class="sl">'+step.label+'</span>';
      /* visited and current stops are tappable — navigate there */
      if (isCur||isVis) {
        div.style.cursor='pointer';
        div.addEventListener('click',(function(n){ return function(){ closeMG(); navToPageNum(n); }; })(step.num));
      }
      el.appendChild(div);
    });
  }

  function renderMap(curNum) {
    var visited=getVisited();
    if(curNum===undefined) curNum=_pageNums[cur]||null;
    renderStepList('map-intro-steps', _introSteps, curNum, visited);
    renderStepList('map-dream',       _dreamSteps, curNum, visited);
    autoOpenMapPhase(curNum);
  }

  /* ── MIRO HELPERS ── */
  function _bid(id){ if(!id) return null; return id.endsWith('=')?id:id+'='; }

  async function postIdeaToMiro(text,ctx) {
    var boardId=_bid(_member.miro_board_id); if(!boardId) return false;
    var statusEl=document.getElementById('idea-status');
    if(statusEl) statusEl.textContent='Sending to Sea of Ideas\u2026';
    var COLORS=['light_yellow','yellow','light_green','cyan','light_pink','light_blue','orange'];
    var color=COLORS[Math.floor(Math.random()*COLORS.length)];
    var content='<p>\uD83D\uDCA1</p><p>'+text+'</p>';
    try {
      var res=await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{content:content,shape:'square'},
          style:{fillColor:color,textAlign:'left',textAlignVertical:'top'},
          geometry:{width:220},
          position:{x:Math.floor(Math.random()*1200)-600,y:Math.floor(Math.random()*800)-400,origin:'center'}
        })
      });
      if(statusEl){ statusEl.textContent=res.ok?'\uD83C\uDF0A In your Sea of Ideas!':''; if(res.ok) setTimeout(function(){if(statusEl)statusEl.textContent='';},3000); }
      return res.ok;
    } catch(e){ if(statusEl) statusEl.textContent=''; return false; }
  }

  async function postImageToMiro(imageUrl,credit) {
    var boardId=_bid(_member.miro_board_id); if(!boardId) return false;
    var x=Math.floor(Math.random()*1200)-600, y=Math.floor(Math.random()*800)-400;
    try {
      var res=await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/images',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{url:imageUrl},
          position:{x:x,y:y,origin:'center'},
          geometry:{width:300}
        })
      });
      if(res.ok && credit){
        await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/texts',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
          body:JSON.stringify({
            data:{content:'<p>'+credit+'</p>'},
            style:{fontSize:'10',color:'#888888'},
            position:{x:x,y:y+170,origin:'center'},
            geometry:{width:300}
          })
        });
      }
      return res.ok;
    } catch(e){ return false; }
  }

  async function postGemToMiro(text,attr) {
    var boardId=_bid(_member.gems_board_id); if(!boardId) return;
    var attrLine=(attr&&attr!==_member.display_name&&attr!=='T2T Field Guide')?'<p><em>\u2014 '+attr+'</em></p>':'';
    var content='<p>\uD83D\uDC8E</p><p>'+text+'</p>'+attrLine;
    try {
      await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{content:content,shape:'square'},
          style:{fillColor:'violet',textAlign:'left',textAlignVertical:'top'},
          geometry:{width:440},
          position:{x:Math.floor(Math.random()*1200)-600,y:Math.floor(Math.random()*800)-400,origin:'center'}
        })
      });
    } catch(e){}
  }

  async function postJournalToMiro(text,topic) {
    var boardId=_bid(_member.journal_board_id); if(!boardId) return null;
    var topicLine=topic?'<p><strong>'+topic.toUpperCase()+'</strong></p>':'';
    var content=topicLine+'<p>'+text+'</p>';
    try {
      var res=await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{content:content,shape:'rectangle'},
          style:{fillColor:'light_yellow',textAlign:'left',textAlignVertical:'top'},
          geometry:{width:260},
          position:{x:Math.floor(Math.random()*1200)-600,y:Math.floor(Math.random()*800)-400,origin:'center'}
        })
      });
      if(res.ok){ var saved=await res.json(); return saved&&saved.id||null; }
    } catch(e){}
    return null;
  }

  /* ── ESC REMINDER CARD ── black/white sticky, posted once per board.
     Checks for an existing one first so repeat visits (and multiple
     embeds of the same board) never duplicate it — and repositions an
     existing card if it's drifted from the visible spot. */
  var _reminderChecked = {};
  var _reminderPos = {x:0,y:-560,origin:'center'};
  async function ensureMiroReminder(boardId) {
    if (!boardId || _reminderChecked[boardId]) return;
    _reminderChecked[boardId] = true;
    var marker = 'Press ESC to exit fullscreen';
    try {
      var res = await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes?limit=50',{
        headers:{'Authorization':'Bearer '+MIRO_TOKEN}
      });
      if (res.ok) {
        var listed = await res.json();
        var items = (listed && listed.data) || [];
        var existing = items.find(function(item){
          return item.data && item.data.content && item.data.content.indexOf(marker)!==-1;
        });
        if (existing) {
          try {
            await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes/'+existing.id,{
              method:'PATCH',
              headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
              body:JSON.stringify({position:_reminderPos})
            });
          } catch(e){}
          return;
        }
      }
    } catch(e){ return; }
    try {
      await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{content:'<p>\u238B <strong>'+marker+'</strong></p>',shape:'rectangle'},
          style:{fillColor:'black',textAlign:'center',textAlignVertical:'middle'},
          geometry:{width:260},
          position:_reminderPos
        })
      });
    } catch(e){}
  }

  /* ── MIRO EMBED OPENERS ── */
  function openJournalMiro() {
    var boardId=_bid(_member.journal_board_id);
    if(!boardId){alert('No Journal board connected yet. Contact your facilitator.');return;}
    var embed=document.getElementById('journal-miro-embed');
    if(embed) embed.src='https://miro.com/app/live-embed/'+boardId+'/?embedAutoplay=true&moveToViewport=-2000,-1000,4000,2000';
    ensureMiroReminder(boardId);
    nav('s-journal-miro');
  }
  function openGemsMiro() {
    var boardId=_bid(_member.gems_board_id);
    if(!boardId){alert('No Gems board connected yet. Contact your facilitator.');return;}
    var embed=document.getElementById('gems-miro-embed');
    if(embed) embed.src='https://miro.com/app/live-embed/'+boardId+'/?embedAutoplay=true&moveToViewport=-2000,-1000,4000,2000';
    ensureMiroReminder(boardId);
    nav('s-gems-miro');
  }


  /* ── JOURNAL ── */
  var _jeEntries=[],_jeIndex=0;

  async function loadEntriesFromSupabase() {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var res=await _sb.from('journal_notes').select('*').eq('user_id',user.data.user.id).order('created_at',{ascending:true});
      if(res.error) return null;
      return res.data||[];
    } catch(e){ return null; }
  }
  async function saveEntryToSupabase(text,pageCtx,topic) {
    try {
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var now=new Date();
      var dateStr=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      var res=await _sb.from('journal_notes').insert({
        user_id:user.data.user.id,note_text:text,topic:topic||null,
        page_context:pageCtx,entry_date:dateStr,created_at:now.toISOString()
      }).select('id').single();
      if(res.error) return null;
      return res.data.id;
    } catch(e){ return null; }
  }
  async function suggestTopic(noteId,text) {
    try {
      var response=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',max_tokens:40,
          system:'You are a journal assistant. Reply with ONLY a short topic label — 3 to 5 words, title case, no punctuation. Nothing else.',
          messages:[{role:'user',content:'Suggest a topic for this journal note: '+text}]
        })
      });
      var data=await response.json();
      var suggested=(data.content&&data.content[0]&&data.content[0].text||'').trim();
      if(!suggested) return;
      await _sb.from('journal_notes').update({suggested_topic:suggested}).eq('id',noteId);
    } catch(e){}
  }
  function loadEntriesLocal(){ try{ var r=sessionStorage.getItem('jentries'); return r?JSON.parse(r):[]; }catch(e){ return []; } }
  function saveEntryLocal(e){ try{ var a=loadEntriesLocal(); a.push(e); sessionStorage.setItem('jentries',JSON.stringify(a)); }catch(e){} }

  function showEntryAt(entries,idx) {
    if(!entries||!entries.length) return;
    idx=Math.max(0,Math.min(idx,entries.length-1));
    _jeEntries=entries; _jeIndex=idx;
    var e=entries[idx];
    var numEl=document.getElementById('je-num');    if(numEl)  numEl.textContent=String(idx+1).padStart(3,'0');
    var textEl=document.getElementById('je-text');  if(textEl) textEl.textContent=e.note_text||e.text||'';
    var topEl=document.getElementById('je-topic');  if(topEl){ topEl.textContent=e.topic||''; topEl.style.display=e.topic?'block':'none'; }
    var eyeEl=document.getElementById('je-eyebrow');if(eyeEl)  eyeEl.textContent=(e.entry_date||e.date||'')+(e.page_context||e.page?' \u00b7 '+(e.page_context||e.page):'');
    var countEl=document.getElementById('je-nav-count'); if(countEl) countEl.textContent=(idx+1)+' of '+entries.length;
    var prevBtn=document.getElementById('b-je-prev'),nextBtn=document.getElementById('b-je-next');
    if(prevBtn) prevBtn.classList.remove('dim');
    if(nextBtn) nextBtn.classList.toggle('dim',idx===entries.length-1);
  }

  async function renderJournalView() {
    var list=document.getElementById('jv-entries-list'),count=document.getElementById('jv-count');
    if(!list) return;
    list.innerHTML='<div class="jv-empty" style="opacity:.5">Loading\u2026</div>';
    var entries=await loadEntriesFromSupabase();
    if(!entries){ entries=loadEntriesLocal().map(function(e){return{note_text:e.text,entry_date:e.date,page_context:e.page};}); }
    _jeEntries=entries;
    if(!entries.length){ list.innerHTML='<div class="jv-empty">No entries yet.<br>Every journey starts with a first note.</div>'; if(count) count.textContent='Your entries'; return; }
    if(count) count.textContent=entries.length+' '+(entries.length===1?'entry':'entries');
    list.innerHTML='';
    entries.forEach(function(e,i){
      var card=document.createElement('div'); card.className='jcard';
      var text=e.note_text||e.text||'', topic=e.topic||'', suggested=e.suggested_topic||'';
      var preview=text.length>120?text.substring(0,120)+'\u2026':text;
      var eyebrow=(e.entry_date||e.date||'')+(e.page_context||e.page?' \u00b7 '+(e.page_context||e.page):'');
      var topicHtml=topic?'<div class="jcard-topic">'+topic+'</div>':(suggested?'<div class="jcard-suggested">\u2756 '+suggested+'</div>':'');
      card.innerHTML='<div class="jcard-num">'+String(i+1).padStart(3,'0')+'</div>'+topicHtml+'<div class="jcard-text">'+preview+'</div><div class="jcard-eyebrow">'+eyebrow+'</div>';
      card.addEventListener('click',(function(idx){return function(){showEntryAt(_jeEntries,idx);nav('s-journal-entry');};})(i));
      list.appendChild(card);
    });
  }

  async function openJournalView() {
    nav('s-journal-view');
    var attempts=0;
    function tryOpenLatest(){
      if(_jeEntries.length>0){showEntryAt(_jeEntries,_jeEntries.length-1);nav('s-journal-entry');}
      else if(attempts<20){attempts++;setTimeout(tryOpenLatest,100);}
    }
    setTimeout(tryOpenLatest,200);
  }

  function initJournalCover() {
    try{
      var s=sessionStorage.getItem('jstarted');
      if(!s){s=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});sessionStorage.setItem('jstarted',s);}
      var el=document.getElementById('jcov-start'); if(el) el.textContent='Started '+s;
    }catch(e){}
  }

  /* ── GEMS ── */
  function openGemAdd() {
    var candidates=getGemCandidates();
    var ctxEl=document.getElementById('gc-ctx-label'); if(ctxEl) ctxEl.textContent=getCtx();
    var candEl=document.getElementById('gc-candidates');
    if(candEl){
      candEl.innerHTML='';
      candidates.forEach(function(c,i){
        var div=document.createElement('div'); div.className='gc-option';
        div.innerHTML='<input type="checkbox" id="gc-chk-'+i+'" data-idx="'+i+'"><label for="gc-chk-'+i+'" style="flex:1;cursor:pointer"><div class="gc-option-text">'+c.text+'</div>'+(c.attr?'<div class="gc-option-attr">'+c.attr+'</div>':'')+'</label>';
        div.addEventListener('click',function(e){
          if(e.target.tagName!=='INPUT'){var chk=div.querySelector('input');chk.checked=!chk.checked;}
          div.classList.toggle('selected',div.querySelector('input').checked);
          updateGemSaveBtn();
        });
        candEl.appendChild(div);
      });
    }
    var ownTA=document.getElementById('gc-own-text'); if(ownTA) ownTA.value='';
    var status=document.getElementById('gc-status'); if(status) status.textContent='';
    var btn=document.getElementById('b-save-gem'); if(btn) btn.classList.remove('active');
    nav('s-gem-add');
  }

  function updateGemSaveBtn(){
    var anyChecked=document.querySelectorAll('#gc-candidates input:checked').length>0;
    var ownText=(document.getElementById('gc-own-text')||{}).value||'';
    var btn=document.getElementById('b-save-gem');
    if(btn) btn.classList.toggle('active',anyChecked||ownText.trim().length>0);
  }

  async function saveGemToSupabase(text,attr){
    try{
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user) return null;
      var res=await _sb.from('gems').insert({
        user_id:user.data.user.id,gem_text:text,attribution:attr||null,
        page_context:getCtx(),created_at:new Date().toISOString()
      }).select('id').single();
      if(res.error) return null;
      return res.data.id;
    }catch(e){return null;}
  }

  async function renderGemsView(){
    var list=document.getElementById('gv-entries-list'),count=document.getElementById('gv-count');
    if(!list) return;
    list.innerHTML='<div class="gv-empty" style="opacity:.5">Loading\u2026</div>';
    try{
      var user=await _sb.auth.getUser();
      if(!user||!user.data||!user.data.user){list.innerHTML='<div class="gv-empty">Sign in to see your Gems.</div>';return;}
      var res=await _sb.from('gems').select('*').eq('user_id',user.data.user.id).order('created_at',{ascending:false});
      var gems=res.data||[];
      if(!gems.length){list.innerHTML='<div class="gv-empty">No Gems yet.<br>They surface when you\'re ready.</div>';if(count) count.textContent='Your gems';return;}
      if(count) count.textContent=gems.length+' '+(gems.length===1?'gem':'gems');
      list.innerHTML='';
      gems.forEach(function(g,i){
        var card=document.createElement('div'); card.className='gcard';
        var text=g.gem_text||'',attr=g.attribution||'';
        var preview=text.length>120?text.substring(0,120)+'\u2026':text;
        card.innerHTML='<div class="gcard-num">'+String(i+1).padStart(3,'0')+'</div><div class="gcard-text">'+preview+'</div>'+(attr?'<div class="gcard-attr">'+attr+'</div>':'');
        list.appendChild(card);
      });
    }catch(e){list.innerHTML='<div class="gv-empty">Could not load Gems.</div>';}
  }

  /* ── TOOLS PENTAGON ── */
  function drawPentagonArrows(){
    var arrowG=document.getElementById('orb-arrows'); if(!arrowG) return;
    var cx=160,cy=160,r=105,ns='http://www.w3.org/2000/svg';
    for(var i=0;i<5;i++){
      var midRad=(-90+i*72+36)*Math.PI/180;
      var px=cx+r*Math.cos(midRad),py=cy+r*Math.sin(midRad);
      var tx=-Math.sin(midRad),ty=Math.cos(midRad),nx=Math.cos(midRad),ny=Math.sin(midRad),s=7;
      var poly=document.createElementNS(ns,'polygon');
      poly.setAttribute('points',(px+tx*s)+','+(py+ty*s)+' '+(px-tx*s-nx*(s*.7))+','+(py-ty*s-ny*(s*.7))+' '+(px-tx*s+nx*(s*.7))+','+(py-ty*s+ny*(s*.7)));
      arrowG.appendChild(poly);
    }
  }

  /* ── CHANGE PASSWORD ── */
  function initChangePassword(){
    var input=document.getElementById('cp-new-password'),btn=document.getElementById('b-cp-save'),msg=document.getElementById('cp-msg');
    if(input) input.value=''; if(btn) btn.classList.remove('active'); if(msg){msg.textContent='';msg.className='cp-msg';}
  }

  /* ── MG OVERLAY INJECTION ── */
  function injectSeaOfIdeas(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-sea-of-ideas')) return;
    if(!document.getElementById('sea-of-ideas-style')){
      var style=document.createElement('style');
      style.id='sea-of-ideas-style';
      style.textContent='#s-sea-of-ideas .phase-header{background:#fdf8f0;padding:12px 16px 10px;text-align:center;border-bottom:2px solid #5b9bd5;flex-shrink:0}#s-sea-of-ideas .ph-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a6040}#s-sea-of-ideas .bar-dream-pp{background:#1a3a5c!important;border-color:#14305a!important;border-top-color:#2a5080!important}#s-sea-of-ideas .bar-dream-pp .tb{background:#d6eaf8!important;border-color:#a9cce3!important;color:#1a3a5c}#s-sea-of-ideas .bar-dream-pp .tb:hover:not(.dim){background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas"><div class="phase-header" style="text-align:left;display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden"><span class="ph-eyebrow">🌈 DREAM PHASE</span><span class="ph-eyebrow">·</span><span class="ph-eyebrow">CREATE</span></div><div class="sw" style="padding:16px 32px;align-items:center;text-align:center"><div style="font-family:\'Playfair Display\',serif;font-size:26px;font-weight:700;color:#1a3a5c;margin-bottom:2px">Sea of Ideas</div><div style="font-size:13px;font-style:italic;color:#888;margin-bottom:14px;line-height:1.7">Everything captured so far. No order. Just a blast of ideas.</div><div id="sea-thumb" style="width:100%;border:1.5px solid #b0a898;border-radius:10px;margin-bottom:10px;background:#f5f5f5;padding:6px"><div id="sea-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div><div id="sea-empty" style="text-align:center;padding:16px;display:none"><div style="font-size:36px;margin-bottom:6px">🌊</div><div style="font-size:12px;font-style:italic;color:#999">Your Sea of Ideas</div></div></div><div id="b-sea-to-cluster" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:4px">🧩 Try clustering these</div><div class="sp"></div></div><div class="bar2 bar-dream-pp"><button class="tb" id="b-sea-back">⬅️</button><button class="tb" id="b-sea-mg">🔍</button><button class="tb" id="b-sea-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    registerPageNum('s-sea-of-ideas', '9220');
    registerCtx('s-sea-of-ideas', 'Sea of Ideas');
    registerGems('s-sea-of-ideas', [
      {text:'The Sea of Ideas holds everything — no commitment, no wrong answers.', attr:'T2T Field Guide · CREATE'}
    ]);
    registerTrivia('s-sea-of-ideas', [
      { label: 'Purpose', id: 's-sea-trivia-purpose' },
      { label: 'Types of Seas of Ideas', id: 's-sea-trivia-types' },
      { label: 'Add an Idea', id: 's-idea-capture' }
    ]);
    wire('b-sea-back', function(){
      var viaChapter = seaChapterEntry; seaChapterEntry = false;
      if(currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ nav('s-create-toc'); }
      else { returnToMG(); }
    });
    wire('b-sea-mg', goMG);
    wire('b-sea-to-cluster', function(){ nav('s-sea-of-ideas-cluster'); });
    wire('b-sea-fwd', function(){
      if(currentFile()==='dream.html' && document.getElementById('s-idea-button')){ nav('s-idea-button'); }
      else { closeMG(); returnToMG(); }
    });
  }

  async function renderSeaOfIdeas(){
    var fwdBtn = document.getElementById('b-sea-fwd');
    if(fwdBtn){
      var inChapterFlow = (currentFile()==='dream.html' && document.getElementById('s-idea-button') && seaChapterEntry);
      fwdBtn.style.opacity = inChapterFlow ? '1' : '0.3';
      fwdBtn.style.pointerEvents = inChapterFlow ? 'auto' : 'none';
    }
    var grid = document.getElementById('sea-grid');
    var empty = document.getElementById('sea-empty');
    if(!grid || !_sb) return;
    grid.innerHTML = '';
    try{
      var u = (await _sb.auth.getUser()).data.user;
      if(!u) return;
      var res = await _sb.from('ideas').select('content_type,image_url,text_content').eq('user_id', u.id).order('created_at', {ascending:false});
      var rows = res.data || [];
      if(rows.length === 0){ if(empty) empty.style.display='block'; return; }
      if(empty) empty.style.display='none';
      rows.forEach(function(row){
        if(row.content_type === 'image' && row.image_url){
          var tile = document.createElement('div');
          tile.style.cssText = 'aspect-ratio:1/1;border-radius:6px;overflow:hidden;background:#eee';
          var img = document.createElement('img');
          img.src = row.image_url;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
          tile.appendChild(img);
          grid.appendChild(tile);
        } else if(row.text_content){
          var tile = document.createElement('div');
          tile.style.cssText = 'aspect-ratio:1/1;border-radius:6px;background:#fff;border:1px solid #ddd;padding:10px;display:flex;align-items:center;justify-content:center;overflow:hidden';
          var card = document.createElement('div');
          card.style.cssText = 'font-family:Playfair Display,serif;font-style:italic;font-size:12px;color:#333;line-height:1.4;text-align:center';
          card.textContent = row.text_content;
          tile.appendChild(card);
          grid.appendChild(tile);
        }
      });
    }catch(e){}
  }

  /* ── SEA OF IDEAS: CLUSTER (9221) ──
     Two views on the same clustered ideas:
     - BOARD (default): storyboard grouped by saved cluster_id — wide cluster
       header cards with square idea cards beneath, tap a header to isolate
       that cluster, "Desktop size" toggle for a bigger layout, Trash is just
       another cluster (hidden unless "Show trash" is on).
     - CANVAS: the original freeform proximity drag-canvas, reached via
       "Cluster new ideas" — this is still how new clusters get named. */
  function injectSeaOfIdeasCluster(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-sea-of-ideas-cluster')) return;
    if(!document.getElementById('sea-cluster-style')){
      var style=document.createElement('style');
      style.id='sea-cluster-style';
      style.textContent='#s-sea-of-ideas-cluster .bar-dream-pp{background:#1a3a5c!important;border-color:#14305a!important;border-top-color:#2a5080!important}#s-sea-of-ideas-cluster .bar-dream-pp .tb{background:#d6eaf8!important;border-color:#a9cce3!important;color:#1a3a5c}#s-sea-of-ideas-cluster .bar-dream-pp .tb:hover:not(.dim){background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff}'
        +'#sc-canvas{position:relative;width:100%;height:330px;border:1.5px solid #b0a898;border-radius:10px;background:#f0f7fc;background-image:radial-gradient(circle,rgba(91,155,213,0.18) 1px,transparent 1px);background-size:22px 22px;overflow:hidden;touch-action:none}'
        +'.sc-tile{position:absolute;width:64px;height:64px;border-radius:10px;background:#fff;border:1px solid #cfe4f2;box-shadow:0 3px 8px rgba(26,58,92,0.15);overflow:hidden;cursor:grab;user-select:none}'
        +'.sc-tile.dragging{cursor:grabbing;box-shadow:0 8px 18px rgba(26,58,92,0.28);z-index:50}'
        +'.sc-tile img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}'
        +'.sc-tile.text{padding:5px;display:flex;align-items:center;justify-content:center}'
        +'.sc-tile.text p{margin:0;font-size:8.5px;line-height:1.25;color:#1a3a5c;font-weight:600;text-align:center;pointer-events:none}'
        +'.sc-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(91,155,213,0.22),transparent 70%);pointer-events:none;z-index:5}'
        +'.sc-pill{position:absolute;z-index:15;transform:translate(-50%,-50%);background:#5b9bd5;color:#fff;border:none;padding:5px 10px;border-radius:14px;font-size:10px;font-weight:700;box-shadow:0 3px 8px rgba(26,58,92,0.2);cursor:pointer;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}'
        +'.sc-pill.named{background:#fff;color:#1a3a5c;border:1px solid #a9cce3;border-radius:4px}'
        +'.sb-icon-btn{flex:1;background:#d6eaf8;border:1px solid #a9cce3;border-radius:10px;box-shadow:0 3px 8px rgba(26,58,92,0.15);padding:10px 0;font-size:19px;line-height:1;cursor:pointer;text-align:center;color:#1a3a5c;transition:transform .1s}'
        +'.sb-icon-btn:active{transform:scale(0.93)}'
        +'.sb-icon-btn.misc{font-size:10px;font-weight:700;letter-spacing:.4px;padding:14px 0}'
        +'#sc-topic-box{text-align:center;background:#eaf3fb;border:1px solid #a9cce3;border-radius:6px;padding:6px 14px;font-size:18px;font-weight:700;color:#1a3a5c}'
        +'#s-sea-of-ideas-cluster .sw{align-items:stretch}'
        +'#sc-divider{border-bottom:1.5px solid #cfe4f2;margin:0 0 12px;width:100%}'
        +'#sc-status{font-size:10px;color:#7a6040;text-align:right;margin-bottom:6px}'
        +'#sc-status.err{color:#b8562f}'
        +'.sc-overlay{position:absolute;inset:0;z-index:100;background:rgba(26,58,92,0.4);display:none;align-items:center;justify-content:center}'
        +'.sc-overlay.active{display:flex}'
        +'.sc-overlay-card{background:#fff;border-radius:14px;padding:16px;width:min(260px,84%);box-shadow:0 10px 24px rgba(0,0,0,0.3)}'
        +'.sc-overlay-card label{display:block;font-size:11px;font-weight:700;color:#1a3a5c;margin-bottom:6px}'
        +'.sc-overlay-card input{width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;color:#1a3a5c;margin-bottom:10px;box-sizing:border-box}'
        +'.sc-overlay-actions{display:flex;gap:8px;justify-content:flex-end}'
        +'.sc-ov-btn{border:1px solid #cfe4f2;background:#fff;padding:6px 12px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;color:#5b9bd5}'
        +'.sc-ov-btn.save{background:#5b9bd5;color:#fff;border-color:#5b9bd5}'
        +'.sb-overlay{position:fixed;inset:0;z-index:200;background:rgba(26,58,92,0.45);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
        +'.sb-overlay.active{display:flex}'
        +'#sc-board-wrap{text-align:left}'
        +'#sc-controls{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0 2px}'
        +'#sc-controls .sc-ov-btn{padding:5px 11px}'
        +'#fg-root.sb-wide{max-width:1200px!important}'
        +'#fg-root.sb-wide #sc-board-wrap{display:flex;flex-wrap:wrap;gap:22px}'
        +'#fg-root.sb-wide #sc-board-wrap>div{flex:0 0 auto}';
      document.head.appendChild(style);
    }
    var div=document.createElement('div');
    div.innerHTML='<div class="sc card" id="s-sea-of-ideas-cluster"><div class="sw" style="padding:16px 20px;align-items:stretch;text-align:center;position:relative">'
      +'<div id="sc-header-area" style="background:#1a3a5c;border-radius:10px;padding:12px 16px 10px;margin-bottom:6px">'
      +'<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px">'
      +'<div id="sc-title-hit" style="cursor:default;user-select:none;text-align:left">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;font-weight:700;color:#fff;margin-bottom:1px">Sea of Ideas</div>'
      +'<div style="font-size:11px;font-style:italic;color:#b8d2ea;margin-bottom:2px">An idea storyboard</div>'
      +'<div id="sc-pagenum" style="font-size:9px;letter-spacing:2px;color:#7fa8cc;height:12px;opacity:0;transition:opacity .3s">9221</div>'
      +'</div>'
      +'<div style="text-align:center">'
      +'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px">Topic</div>'
      +'<div id="sc-topic-box">What do you want?</div>'
      +'</div>'
      +'<div style="text-align:right"><button class="sc-ov-btn" id="b-sc-purpose">Purpose</button></div>'
      +'</div>'
      +'</div>'
      +'<div id="sc-divider"></div>'
      +'<div id="sc-status">Loading…</div>'
      +'<div id="sc-board-wrap"></div>'
      +'<div id="sc-canvas-wrap" style="display:none">'
      +'<div id="sc-canvas"><div class="sc-overlay" id="sc-overlay"><div class="sc-overlay-card"><label for="sc-name-input">What do you see here?</label><input id="sc-name-input" type="text" maxlength="60" placeholder="e.g. Time with people I love"><div class="sc-overlay-actions"><button class="sc-ov-btn" id="sc-name-cancel">Cancel</button><button class="sc-ov-btn save" id="sc-name-save">Save</button></div></div></div></div>'
      +'<div style="display:flex;gap:14px;justify-content:center;margin-top:10px">'
      +'<span id="b-sc-shuffle" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer">↻ New batch</span>'
      +'<span id="b-sc-back-to-board" style="font-size:12px;color:#5b9bd5;font-weight:600;cursor:pointer">↩ Back to storyboard</span>'
      +'</div>'
      +'</div>'
      +'<div id="sb-detail-overlay" class="sb-overlay"></div>'
      +'<div id="sc-controls">'
      +'<button class="sc-ov-btn" id="b-sc-filterback" style="display:none">⬅ All clusters</button>'
      +'<button class="sc-ov-btn" id="b-sc-mode-toggle">⛶ Desktop size</button>'
      +'<button class="sc-ov-btn" id="b-sc-newcluster">✋ Cluster new ideas</button>'
      +'<button class="sc-ov-btn" id="b-sc-upload">📤 Add your photos</button>'
      +'<input type="file" id="sc-upload-input" accept="image/*" multiple style="display:none">'
      +'</div>'
      +'<div class="sp"></div></div>'
      +'<div class="bar2 bar-dream-pp"><button class="tb" id="b-sc-back">⬅️</button><button class="tb" id="b-sc-mg">🔍</button><button class="tb" id="b-sc-fwd">➡️</button></div></div>';
    fg.appendChild(div.firstChild);
    registerPageNum('s-sea-of-ideas-cluster', '9221');
    registerCtx('s-sea-of-ideas-cluster', 'Sea of Ideas — Cluster');
    wire('b-sc-back', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      var viaChapter = seaChapterEntry; seaChapterEntry = false;
      if(currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ nav('s-create-toc'); }
      else { returnToMG(); }
    });
    wire('b-sc-mg', function(){
      var fgr=document.getElementById('fg-root'); if(fgr) fgr.classList.remove('sb-wide');
      goMG();
    });
    wire('b-sc-fwd', function(){
      if(currentFile()==='dream.html' && document.getElementById('s-idea-button')){ nav('s-idea-button'); }
      else { closeMG(); returnToMG(); }
    });
    wire('b-sc-shuffle', function(){ renderSeaCanvas(true); });
    wire('b-sc-back-to-board', function(){ _sboardMode='board'; renderSeaOfIdeasCluster(); });
    wire('b-sc-newcluster', function(){ _sboardMode='canvas'; renderSeaOfIdeasCluster(); });
    wire('b-sc-mode-toggle', function(){
      _sboardDesktop=!_sboardDesktop;
      document.getElementById('b-sc-mode-toggle').innerHTML=_sboardDesktop?'↩ Back to mobile size':'⛶ Desktop size';
      var fgr=document.getElementById('fg-root');
      if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop && _sboardMode==='board');
      renderSeaBoard();
    });
    wire('b-sc-filterback', function(){ _sboardFilter=null; renderSeaBoard(); });
    wire('b-sc-purpose', openPurposeEditor);
    wire('b-sc-upload', function(){ document.getElementById('sc-upload-input').click(); });
    var uploadInput=document.getElementById('sc-upload-input');
    if(uploadInput) uploadInput.addEventListener('change', function(e){ _sboardBatchUpload(e.target.files); e.target.value=''; });

    (function(){
      var clicks=0, timer=null;
      var hit=document.getElementById('sc-title-hit');
      if(hit) hit.addEventListener('click', function(){
        clicks++;
        if(timer) clearTimeout(timer);
        timer=setTimeout(function(){ clicks=0; }, 600);
        if(clicks>=3){
          clicks=0;
          var pn=document.getElementById('sc-pagenum');
          if(pn){ pn.style.opacity='1'; setTimeout(function(){ pn.style.opacity='0'; }, 2000); }
        }
      });
    })();

    var overlay=document.getElementById('sc-overlay');
    var nameInput=document.getElementById('sc-name-input');
    var activeGroupIds=null;
    function openNameOverlay(groupIds, existingText){
      activeGroupIds=groupIds;
      nameInput.value=existingText||'';
      overlay.classList.add('active');
      setTimeout(function(){ nameInput.focus(); },50);
    }
    function closeNameOverlay(){ overlay.classList.remove('active'); activeGroupIds=null; }
    wire('sc-name-cancel', closeNameOverlay);
    wire('sc-name-save', async function(){
      var text=nameInput.value.trim();
      if(!text||!activeGroupIds){ closeNameOverlay(); return; }
      var groupIds=activeGroupIds; closeNameOverlay();
      var statusEl=document.getElementById('sc-status');
      if(statusEl){ statusEl.textContent='Saving header…'; statusEl.classList.remove('err'); }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:text,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw new Error('Header insert failed: '+ins.error.message);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).in('id',groupIds);
        if(upd.error) throw new Error('cluster_id update failed: '+upd.error.message+' — the `cluster_id` column may still need to be added to `ideas`.');
        groupIds.forEach(function(gid){
          var item=_scCurrentBatch.find(function(i){ return String(i.id)===String(gid); });
          if(item) item._headerText=text;
        });
        if(statusEl) statusEl.textContent=_scCurrentBatch.length+' ideas · header saved ✓';
        _scUpdateGlows();
      }catch(err){
        if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
      }
    });
    window._scOpenNameOverlay = openNameOverlay;
  }

  /* ── Board (storyboard) state + rendering ── */
  var _sboardMode = 'board';
  var _sboardDesktop = false;
  var _sboardFilter = null;
  var _sboardTrashId = null;
  var _sboardMiscId = null;
  var _sboardPurposeId = null;
  var _sboardNewAdditionsId = null;
  var _sboardActiveId = null;
  var _sboardHeadersById = {};
  var _sboardHeaderList = [];

  function _sboardTopAncestor(h, headerRows){
    var cur=h, guard=0;
    while(cur.cluster_id && guard<20){
      var parent=headerRows.find(function(x){ return String(x.id)===String(cur.cluster_id); });
      if(!parent) break;
      cur=parent; guard++;
    }
    return cur.id;
  }
  function _sboardHeartsHTML(count){
    if(!count) return '';
    var shown=Math.min(count,8), s='';
    for(var i=0;i<shown;i++) s+='❤️';
    if(count>8) s+=' +'+(count-8);
    return s;
  }

  async function renderSeaOfIdeasCluster(reshuffle){
    var boardWrap=document.getElementById('sc-board-wrap');
    var canvasWrap=document.getElementById('sc-canvas-wrap');
    if(!boardWrap||!canvasWrap) return;
    var fwdBtn=document.getElementById('b-sc-fwd');
    if(fwdBtn){
      var inChapterFlow=(currentFile()==='dream.html' && document.getElementById('s-idea-button') && seaChapterEntry);
      fwdBtn.style.opacity=inChapterFlow?'1':'.3';
      fwdBtn.style.pointerEvents=inChapterFlow?'auto':'none';
    }
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.toggle('sb-wide', _sboardDesktop && _sboardMode==='board');
    if(_sboardMode==='canvas'){
      boardWrap.style.display='none';
      canvasWrap.style.display='block';
      return renderSeaCanvas(reshuffle);
    } else {
      canvasWrap.style.display='none';
      boardWrap.style.display='block';
      return renderSeaBoard();
    }
  }

  function _sboardMakeTile(item, size, straight){
    size=size||(_sboardDesktop?76:70);
    var rot=straight?0:(Math.random()*8-4).toFixed(1);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'');
    tile.draggable=true;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;width:'+size+'px;height:'+size+'px;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s';
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    if(item.content_type==='image' && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
    } else {
      var p=document.createElement('p');
      p.textContent=item.text_content||'(untitled)';
      p.style.fontSize=_sboardDesktop?'10.5px':'8.5px';
      tile.appendChild(p);
    }
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:14px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent = item.heart_count>=2 ? '💕' : '❤️';
      tile.appendChild(hb);
    }
    tile.addEventListener('dblclick', function(){ openSbDetail(item); });
    return tile;
  }

  async function renderSeaBoard(){
    var wrap=document.getElementById('sc-board-wrap');
    var statusEl=document.getElementById('sc-status');
    if(!wrap||!_sb) return;
    if(statusEl){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var newAdditionsId=await _sboardEnsureNewAdditionsHeader();
      _sboardNewAdditionsId=newAdditionsId;

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id,heart_count,notes')
        .eq('user_id', user.id).in('content_type',['image','text','header'])
        .order('created_at',{ascending:true}).limit(300);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      var headerRows=rows.filter(function(r){ return r.content_type==='header'; });
      _sboardHeadersById={}; headerRows.forEach(function(r){ _sboardHeadersById[r.id]=r; });
      var trashRow=headerRows.find(function(r){ return r.text_content==='Trash'; });
      var miscRow=headerRows.find(function(r){ return r.text_content==='MISC'; });
      var purposeRow=headerRows.find(function(r){ return r.text_content==='Purpose'; });
      var newAdditionsRow=headerRows.find(function(r){ return String(r.id)===String(newAdditionsId); });
      _sboardTrashId = trashRow ? trashRow.id : null;
      _sboardMiscId = miscRow ? miscRow.id : null;
      _sboardPurposeId = purposeRow ? purposeRow.id : null;
      var purposeBtn=document.getElementById('b-sc-purpose');
      if(purposeBtn) purposeBtn.title = (purposeRow && purposeRow.notes) ? purposeRow.notes : 'Why are we doing this?';

      var reservedIds=[_sboardTrashId,_sboardMiscId,_sboardPurposeId,newAdditionsId].filter(Boolean).map(String);
      var contentHeaders=headerRows.filter(function(r){ return reservedIds.indexOf(String(r.id))===-1; });
      _sboardHeaderList=contentHeaders.concat(newAdditionsRow?[newAdditionsRow]:[]);

      var ideaRows=rows.filter(function(r){ return r.content_type==='image'||r.content_type==='text'; });
      wrap.innerHTML='';
      if(ideaRows.length===0){
        if(statusEl) statusEl.textContent='No ideas saved yet — add a few first.';
        document.getElementById('b-sc-filterback').style.display='none';
        return;
      }

      var childrenOfHeader={};
      ideaRows.forEach(function(r){
        if(r.cluster_id){ (childrenOfHeader[r.cluster_id]=childrenOfHeader[r.cluster_id]||[]).push(r); }
      });
      if(newAdditionsRow){
        childrenOfHeader[newAdditionsRow.id]=(childrenOfHeader[newAdditionsRow.id]||[]).concat(ideaRows.filter(function(r){ return !r.cluster_id; }));
      }
      var subHeadersOf={};
      contentHeaders.forEach(function(h){
        if(h.cluster_id){ (subHeadersOf[h.cluster_id]=subHeadersOf[h.cluster_id]||[]).push(h); }
      });
      var topLevelHeaders=contentHeaders.filter(function(h){ return !h.cluster_id; });

      var order=[]; var seen={};
      ideaRows.forEach(function(r){
        if(r.cluster_id){
          var hRow=headerRows.find(function(h){ return String(h.id)===String(r.cluster_id); });
          if(hRow){
            var topId=String(_sboardTopAncestor(hRow, headerRows));
            if(!seen[topId]){ seen[topId]=true; order.push(topId); }
          }
        }
      });
      topLevelHeaders.forEach(function(h){ if(!seen[h.id]){ seen[h.id]=true; order.push(String(h.id)); } });
      var orderedTop=order.map(function(id){ return topLevelHeaders.find(function(h){ return String(h.id)===String(id); }); }).filter(Boolean);

      var cellSize=_sboardDesktop?92:78;
      var cols=2;

      function renderGroup(headerRow, depth){
        var name=headerRow.text_content||'(untitled cluster)';
        var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='New Additions');
        var straight=(name!=='New Additions');
        var block=document.createElement('div');
        block.style.cssText='flex:0 0 auto;margin-left:'+(depth*14)+'px';
        var hd=document.createElement('button');
        hd.className='sc-pill named';
        hd.style.cssText='position:static;transform:none;display:block;width:100%;box-sizing:border-box;padding:6px 10px;font-size:11px;margin-bottom:6px;cursor:pointer;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
        hd.textContent=name;
        if(!isReserved) hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbHeaderDetail(headerRow); });
        hd.addEventListener('dragover', function(e){ e.preventDefault(); hd.style.outline='2px solid #5b9bd5'; });
        hd.addEventListener('dragleave', function(){ hd.style.outline='none'; });
        hd.addEventListener('drop', function(e){
          e.preventDefault(); hd.style.outline='none';
          var itemId=e.dataTransfer.getData('text/plain');
          if(itemId) _sboardMoveCard(itemId, headerRow.id);
        });
        block.appendChild(hd);
        var grid=document.createElement('div');
        grid.style.cssText='display:grid;grid-template-columns:repeat('+cols+','+cellSize+'px);gap:8px';
        (childrenOfHeader[headerRow.id]||[]).forEach(function(item){ grid.appendChild(_sboardMakeTile(item, cellSize, straight)); });
        block.appendChild(grid);
        groupsWrap.appendChild(block);
        (subHeadersOf[headerRow.id]||[]).forEach(function(sub){ renderGroup(sub, depth+1); });
      }

      var groupsWrap=document.createElement('div');
      groupsWrap.style.cssText='display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start';
      if(newAdditionsRow) renderGroup(newAdditionsRow, 0);
      orderedTop.forEach(function(h){ renderGroup(h, 0); });
      wrap.appendChild(groupsWrap);

      document.getElementById('b-sc-filterback').style.display='none';
      if(statusEl) statusEl.textContent='';
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardBatchUpload(fileList){
    var statusEl=document.getElementById('sc-status');
    var files=Array.prototype.slice.call(fileList||[]).filter(function(f){ return f.type && f.type.indexOf('image/')===0; });
    if(!files.length) return;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var ok=0, failed=0;
      for(var i=0;i<files.length;i++){
        var f=files[i];
        if(statusEl){ statusEl.classList.remove('err'); statusEl.textContent='Uploading '+(i+1)+' of '+files.length+'…'; }
        try{
          var path=user.id+'/'+Date.now()+'-'+i+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
          var up=await _sb.storage.from('sea-of-ideas').upload(path, f);
          if(up.error) throw up.error;
          var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
          var url=pub.data && pub.data.publicUrl;
          if(!url) throw new Error('No public URL returned.');
          var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'image',image_url:url,created_at:new Date().toISOString()});
          if(ins.error) throw ins.error;
          ok++;
        }catch(fileErr){ failed++; }
      }
      if(statusEl){
        statusEl.textContent = failed ? (ok+' uploaded, '+failed+' failed.') : '';
        if(failed) statusEl.classList.add('err');
      }
      renderSeaBoard();
    }catch(err){
      if(statusEl){ statusEl.textContent='Upload needs the sea-of-ideas Storage bucket set up in Supabase first: '+err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardMoveCard(itemId, headerId){
    var statusEl=document.getElementById('sc-status');
    try{
      var upd=await _sb.from('ideas').update({cluster_id:headerId}).eq('id',itemId);
      if(upd.error) throw upd.error;
      renderSeaBoard();
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  function openSbHeaderDetail(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var options='<option value="">— Top level —</option>'+_sboardHeaderList
      .filter(function(h){ return String(h.id)!==String(headerRow.id); })
      .map(function(h){ return '<option value="'+h.id+'">'+h.text_content+'</option>'; }).join('');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">'+headerRow.text_content+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Nest under</label>'
      +'<select id="sb-h-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-h-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-h-close" style="flex:1">Close</button></div>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-h-parent');
    if(sel) sel.value=headerRow.cluster_id||'';
    wire('sb-h-save', async function(){
      try{
        var newParent=sel.value||null;
        var upd=await _sb.from('ideas').update({cluster_id:newParent}).eq('id',headerRow.id);
        if(upd.error) throw upd.error;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){}
    });
    wire('sb-h-close', closeSbDetail);
  }

  async function openPurposeEditor(){
    var ov=document.getElementById('sb-detail-overlay');
    var statusEl=document.getElementById('sc-status');
    try{
      var id=await _sboardEnsurePurposeHeader();
      var row=await _sb.from('ideas').select('notes').eq('id',id).single();
      var curText=(row.data && row.data.notes) || '';
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Purpose</div>'
        +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:8px">Why are we doing this?</div>'
        +'<textarea id="sb-purpose-box" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:10px;min-height:70px">'+curText+'</textarea>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-purpose-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-purpose-close" style="flex:1">Close</button></div>'
        +'</div>';
      ov.classList.add('active');
      wire('sb-purpose-save', async function(){
        var val=document.getElementById('sb-purpose-box').value;
        var upd=await _sb.from('ideas').update({notes:val}).eq('id',id);
        if(!upd.error){ var btn=document.getElementById('b-sc-purpose'); if(btn) btn.title=val; }
        closeSbDetail();
      });
      wire('sb-purpose-close', closeSbDetail);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  async function _sboardEnsureMiscHeader(){
    if(_sboardMiscId) return _sboardMiscId;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','MISC').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardMiscId=existing.data[0].id; return _sboardMiscId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'MISC',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('MISC setup failed: '+ins.error.message);
    _sboardMiscId=ins.data.id;
    return _sboardMiscId;
  }

  async function _sboardEnsurePurposeHeader(){
    if(_sboardPurposeId) return _sboardPurposeId;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Purpose').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _sboardPurposeId=ins.data.id;
    return _sboardPurposeId;
  }

  async function _sboardEnsureNewAdditionsHeader(){
    if(_sboardNewAdditionsId) return _sboardNewAdditionsId;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','New Additions').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardNewAdditionsId=existing.data[0].id; return _sboardNewAdditionsId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'New Additions',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('New Additions setup failed: '+ins.error.message);
    _sboardNewAdditionsId=ins.data.id;
    return _sboardNewAdditionsId;
  }

  async function _sboardEnsureTrashHeader(){
    if(_sboardTrashId) return _sboardTrashId;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var existing=await _sb.from('ideas').select('id').eq('user_id',user.id).eq('content_type','header').eq('text_content','Trash').limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardTrashId=existing.data[0].id; return _sboardTrashId; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Trash',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Trash setup failed: '+ins.error.message);
    _sboardTrashId=ins.data.id;
    return _sboardTrashId;
  }

  function openSbDetail(item){
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var isTrashed=String(item.cluster_id)===String(_sboardTrashId) && _sboardTrashId;
    var isMisc=String(item.cluster_id)===String(_sboardMiscId) && _sboardMiscId;
    var curHeaderRow = item.cluster_id ? _sboardHeadersById[item.cluster_id] : null;
    var curHeaderText = curHeaderRow ? curHeaderRow.text_content : '';
    var headerLabel = curHeaderText || 'New Additions';
    var heartCount = item.heart_count||0;

    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a9cce3;margin-bottom:3px">Cluster</div>'
      + '<div id="sb-header-field" style="font-size:11px;color:#5b9bd5;font-weight:600;cursor:pointer;margin-bottom:10px;padding:4px 10px;border:1px dashed #a9cce3;border-radius:6px;display:inline-block">'+headerLabel+' ✎</div>'
      + '<div id="sb-header-edit" style="display:none;margin-bottom:10px">'
      + '<input id="sb-header-input" list="sb-header-options" type="text" placeholder="Header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:6px">'
      + '<datalist id="sb-header-options">'+_sboardHeaderList.map(function(h){ return '<option value="'+h.text_content+'">'; }).join('')+'</datalist>'
      + '<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-header-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-header-cancel" style="flex:1">Cancel</button></div>'
      + '</div>'
      + (item.content_type==='image' && item.image_url
          ? '<img src="'+item.image_url+'" style="width:100%;border-radius:10px;margin-bottom:10px">'
          : '<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">'+(item.text_content||'(untitled)')+'</div>')
      + '<div id="sb-hearts-row" style="font-size:14px;min-height:18px;margin-bottom:6px">'+_sboardHeartsHTML(heartCount)+'</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + '<button class="sb-icon-btn" id="sb-heart" title="Heart">❤️</button>'
      + '<button class="sb-icon-btn" id="sb-notes" title="Notes">✏️</button>'
      + '<button class="sb-icon-btn misc" id="sb-misc" title="Misc">'+(isMisc?'MISC ✓':'MISC')+'</button>'
      + '<button class="sb-icon-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'🗑️')+'</button>'
      + '</div>'
      + '<textarea id="sb-notes-box" placeholder="Add a note…" style="display:none;width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;margin-bottom:8px">'+(item.notes||'')+'</textarea>'
      + '<div id="sb-note-status" style="font-size:9px;color:#a3907a;margin-bottom:6px;min-height:11px"></div>'
      + '<button class="sc-ov-btn" id="sb-close" style="width:100%">Close</button>'
      + '</div>';
    ov.classList.add('active');

    wire('sb-header-field', function(){
      document.getElementById('sb-header-edit').style.display='block';
      var inp=document.getElementById('sb-header-input'); inp.value=curHeaderText; inp.focus();
    });
    wire('sb-header-cancel', function(){ document.getElementById('sb-header-edit').style.display='none'; });
    wire('sb-header-save', async function(){
      var name=document.getElementById('sb-header-input').value.trim();
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=null;
        if(name){
          var existing=_sboardHeaderList.find(function(h){ return h.text_content.toLowerCase()===name.toLowerCase(); });
          if(existing){ targetId=existing.id; }
          else {
            var user=(await _sb.auth.getUser()).data.user;
            if(!user) throw new Error('Not signed in.');
            var parentId=_sboardFilter||null;
            var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString()}).select().single();
            if(ins.error) throw new Error(ins.error.message);
            targetId=ins.data.id;
          }
        }
        var upd=await _sb.from('ideas').update({cluster_id:targetId}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=targetId;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    wire('sb-heart', async function(){
      try{
        var newCount=(item.heart_count||0)+1;
        var upd=await _sb.from('ideas').update({heart_count:newCount}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.heart_count=newCount;
        var hr=document.getElementById('sb-hearts-row'); if(hr) hr.innerHTML=_sboardHeartsHTML(newCount);
      }catch(err){
        document.getElementById('sb-note-status').textContent='Heart needs the heart_count Supabase column.';
      }
    });
    wire('sb-notes', function(){
      document.getElementById('sb-notes-box').style.display='block';
    });
    var notesBox=document.getElementById('sb-notes-box');
    if(notesBox) notesBox.addEventListener('blur', async function(e){
      try{
        var upd=await _sb.from('ideas').update({notes:e.target.value}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.notes=e.target.value;
      }catch(err){
        document.getElementById('sb-note-status').textContent='Notes need the notes Supabase column.';
      }
    });
    wire('sb-misc', async function(){
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=await _sboardEnsureMiscHeader();
        var newCluster=isMisc?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    wire('sb-trash', async function(){
      var statusBox=document.getElementById('sb-note-status');
      try{
        var targetId=await _sboardEnsureTrashHeader();
        var newCluster=isTrashed?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard();
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
      }
    });
    wire('sb-close', closeSbDetail);
  }
  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; }
    _sboardActiveId=null;
  }

  /* ── Canvas (freeform proximity) — unchanged mechanic, used to create new clusters ── */
  var _scPositions = {};
  var _scCurrentBatch = [];
  var _scTileSize = 64;
  var _scClusterRadius = 90;

  function _scRandomStart(w, h){
    var margin = 8;
    return {
      x: margin + Math.random() * (w - _scTileSize - margin*2),
      y: margin + Math.random() * (h - _scTileSize - margin*2)
    };
  }

  function _scUpdateGlows(){
    var canvas=document.getElementById('sc-canvas'); if(!canvas) return;
    canvas.querySelectorAll('.sc-glow,.sc-pill').forEach(function(el){ el.remove(); });
    var ids=Object.keys(_scPositions).filter(function(id){
      return _scCurrentBatch.some(function(item){ return String(item.id)===id; });
    });
    var visited={};
    ids.forEach(function(id){
      if(visited[id]) return;
      var group=[id];
      var p1=_scPositions[id];
      ids.forEach(function(otherId){
        if(otherId===id||visited[otherId]) return;
        var p2=_scPositions[otherId];
        var dx=p1.x-p2.x, dy=p1.y-p2.y;
        if(Math.sqrt(dx*dx+dy*dy) < _scClusterRadius) group.push(otherId);
      });
      if(group.length>1){
        group.forEach(function(gid){ visited[gid]=true; });
        var xs=group.map(function(g){ return _scPositions[g].x + _scTileSize/2; });
        var ys=group.map(function(g){ return _scPositions[g].y + _scTileSize/2; });
        var cx=xs.reduce(function(a,b){return a+b;},0)/xs.length;
        var cy=ys.reduce(function(a,b){return a+b;},0)/ys.length;
        var spread=Math.max.apply(null, group.map(function(g){
          var dx=_scPositions[g].x+_scTileSize/2-cx, dy=_scPositions[g].y+_scTileSize/2-cy;
          return Math.sqrt(dx*dx+dy*dy);
        })) + _scTileSize*0.8;
        var glow=document.createElement('div');
        glow.className='sc-glow';
        glow.style.width=glow.style.height=(spread*2)+'px';
        glow.style.left=(cx-spread)+'px';
        glow.style.top=(cy-spread)+'px';
        canvas.insertBefore(glow, canvas.firstChild);
        var namedItem=group.map(function(g){ return _scCurrentBatch.find(function(i){ return String(i.id)===g; }); }).find(function(item){ return item && item._headerText; });
        var pill=document.createElement('button');
        pill.className='sc-pill'+(namedItem?' named':'');
        pill.textContent=namedItem?namedItem._headerText:'+ name this';
        pill.style.left=cx+'px';
        pill.style.top=Math.max(12,(cy-spread-10))+'px';
        pill.addEventListener('click', function(){ if(window._scOpenNameOverlay) window._scOpenNameOverlay(group, namedItem?namedItem._headerText:''); });
        canvas.appendChild(pill);
      } else {
        visited[id]=true;
      }
    });
  }

  function _scMakeDraggable(tile, canvas){
    var offsetX=0, offsetY=0, dragging=false;
    tile.addEventListener('pointerdown', function(e){
      dragging=true; tile.classList.add('dragging');
      var r=tile.getBoundingClientRect();
      offsetX=e.clientX-r.left; offsetY=e.clientY-r.top;
      tile.setPointerCapture(e.pointerId);
    });
    tile.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var cr=canvas.getBoundingClientRect();
      var x=e.clientX-cr.left-offsetX, y=e.clientY-cr.top-offsetY;
      x=Math.max(2, Math.min(canvas.clientWidth-_scTileSize-2, x));
      y=Math.max(2, Math.min(canvas.clientHeight-_scTileSize-2, y));
      tile.style.left=x+'px'; tile.style.top=y+'px';
      _scPositions[tile.dataset.id]={x:x,y:y};
      _scUpdateGlows();
    });
    function up(e){ dragging=false; tile.classList.remove('dragging'); try{ tile.releasePointerCapture(e.pointerId); }catch(err){} }
    tile.addEventListener('pointerup', up);
    tile.addEventListener('pointercancel', up);
  }

  async function renderSeaCanvas(reshuffle){
    var canvas=document.getElementById('sc-canvas');
    var statusEl=document.getElementById('sc-status');
    if(!canvas||!_sb) return;
    if(statusEl){ statusEl.textContent='Loading…'; statusEl.classList.remove('err'); }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,cluster_id')
        .eq('user_id', user.id).in('content_type',['image','text'])
        .order('created_at',{ascending:false}).limit(80);
      if(res.error) throw new Error(res.error.message);
      var pool=res.data||[];
      if(pool.length===0){ if(statusEl) statusEl.textContent='No ideas saved yet — add a few first.'; return; }
      var shuffled=pool.slice().sort(function(){ return Math.random()-0.5; });
      _scCurrentBatch=shuffled.slice(0, Math.min(9,shuffled.length));
      if(reshuffle) _scPositions={};
      canvas.querySelectorAll('.sc-tile,.sc-glow,.sc-pill').forEach(function(el){ el.remove(); });
      var w=canvas.clientWidth, h=canvas.clientHeight;
      _scCurrentBatch.forEach(function(item){
        var pos=_scPositions[item.id] || _scRandomStart(w,h);
        _scPositions[item.id]=pos;
        var tile=document.createElement('div');
        tile.className='sc-tile'+(item.content_type==='text'?' text':'');
        tile.dataset.id=item.id;
        tile.style.left=pos.x+'px'; tile.style.top=pos.y+'px';
        if(item.content_type==='image' && item.image_url){
          var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
        } else {
          var p=document.createElement('p'); p.textContent=item.text_content||'(untitled)'; tile.appendChild(p);
        }
        canvas.appendChild(tile);
        _scMakeDraggable(tile, canvas);
      });
      _scUpdateGlows();
      if(statusEl) statusEl.textContent=_scCurrentBatch.length+' ideas';
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  function injectMGOverlay(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('mg-overlay')) return;
    var div=document.createElement('div');
    div.innerHTML='<div class="mg-overlay" id="mg-overlay"><div class="mg-modal"><div class="mg-wrap"><div class="mg-head"><div class="mg-ring">🔍</div><div class="mg-ttl">Details</div><div class="mg-desc">Plus places to keep what matters.</div></div><div class="mg-hrule"></div><div class="mg-body"><div class="mg-row"><div class="mg-btn" id="b-mg-map">🗺️</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-idea">💡</div><div class="mg-btn" id="b-mg-journal">✏️</div><div class="mg-btn" id="b-mg-gems">💎</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-trivia">🌸</div><div class="mg-btn" id="b-mg-tools">🛠️</div></div></div></div><div class="mg-bar"><div class="mg-ret" id="b-mg-ret">⬅️</div></div></div></div>';
    fg.appendChild(div.firstChild);
    wireMGOverlay();
  }

  function wireMGOverlay(){
    var mgOv=document.getElementById('mg-overlay');
    if(mgOv) mgOv.addEventListener('click',function(e){if(e.target===mgOv) closeMG();});
    wire('b-mg-ret',function(){
      var behind=_utilScreens.indexOf(cur)!==-1;
      closeMG();
      if(behind){ if(mgOrigin){ nav(mgOrigin,false); } else { goBack(); } }
    });
    wire('b-mg-map',goMap);
    wire('b-mg-idea',   function(){closeMG();nav('s-idea',   false);});
    wire('b-mg-journal',function(){closeMG();nav('s-journal',false);});
    wire('b-mg-gems',   function(){closeMG();nav('s-gems',   false);});
    wire('b-mg-trivia', function(){closeMG();nav('s-trivia', false);});
    wire('b-trivia-back', returnToMG);
    wire('b-trivia-mg',   goMG);
    wire('b-mg-tools',  function(){closeMG();nav('s-tools',  false);});
  }

  /* ── BACKPACK SCREEN WIRING ── */
  function wireBackpack(){
    /* ── BACKPACK PAGE NUMBERS (per Notion 9000 series) ── */
    registerPageNum('s-cover-map',   '9100');
    registerPageNum('s-idea',        '9200');
    registerPageNum('s-idea-capture','9210');
    registerPageNum('s-journal',        '9300');
    registerPageNum('s-journal-capture','9310');
    registerPageNum('s-journal-view',   '9320');
    registerPageNum('s-journal-miro',   '9330');
    registerPageNum('s-gems',      '9400');
    registerPageNum('s-gem-add',   '9410');
    registerPageNum('s-gems-list', '9420');
    registerPageNum('s-gems-miro', '9430');
    registerPageNum('s-trivia', '9500');
    registerPageNum('s-tools',  '9600');
    registerPageNum('s-question', '9610');
    registerPageNum('s-create',   '9620');
    registerPageNum('s-shape-tools', '9630');
    registerPageNum('s-share', '9640');
    /* s-dare has no Notion page number assigned yet */

    /* MAP */
    wire('b-map-back',returnToMG);
    wire('b-map-mg',goMG);
    wire('tog-map-intro',   function(){togglePh('map-intro-steps');});
    wire('tog-map-dream',  function(){togglePh('map-dream');});
    wire('tog-map-believe',function(){togglePh('map-believe');});
    wire('tog-map-dare',   function(){togglePh('map-dare');});
    wire('tog-map-journey',function(){togglePh('map-journey');});

    /* IDEA HUB */
    wire('b-idea-back',returnToMG);
    wire('b-idea-mg',goMG);
    wire('b-idea-trivia',function(){ _triviaOverride='s-idea'; nav('s-trivia',false); });
    wire('b-capture-idea',function(){
      nav('s-idea-capture');
      setTimeout(function(){
        var t=document.getElementById('idea-text');if(t)t.value='';
        var b=document.getElementById('b-save-idea');if(b)b.classList.remove('active');
        var s=document.getElementById('idea-status');if(s)s.textContent='';
        var p=document.getElementById('idea-posted');if(p)p.style.display='none';
        var ta=document.getElementById('idea-text');if(ta)ta.style.display='block';
      },50);
    });
    wire('b-sea-ideas',function(){ seaChapterEntry = false; nav('s-sea-of-ideas-cluster'); });
    wire('b-icap-back',function(){nav('s-idea');}); wire('b-icap-mg',goMG);
    var ideaTA=document.getElementById('idea-text');
    if(ideaTA) ideaTA.addEventListener('input',function(){var b=document.getElementById('b-save-idea');if(b)b.classList.toggle('active',this.value.trim().length>0);});
    wire('b-save-idea',async function(){
      var t=document.getElementById('idea-text');if(!t)return;
      var text=t.value.trim();if(!text)return;
      var ctx=getCtx();
      var btn=document.getElementById('b-save-idea');
      btn.classList.remove('active');btn.textContent='SAVING\u2026';
      try{var user=await _sb.auth.getUser();if(user&&user.data&&user.data.user){await _sb.from('ideas').insert({user_id:user.data.user.id,content_type:'text',text_content:text,page_context:ctx,created_at:new Date().toISOString()});}}catch(e){}
      await postIdeaToMiro(text,ctx);
      t.value='';t.style.display='none';btn.textContent='SAVE';
      var posted=document.getElementById('idea-posted');if(posted)posted.style.display='flex';
      setTimeout(function(){if(posted)posted.style.display='none';t.style.display='block';btn.classList.remove('active');},2000);
    });

    /* JOURNAL HUB */
    wire('b-journal-back',returnToMG);
    wire('b-journal-mg',goMG);
    wire('b-add-note',function(){
      nav('s-journal-capture');
      setTimeout(function(){
        var t=document.getElementById('journal-text');if(t)t.value='';
        var tp=document.getElementById('journal-topic');if(tp)tp.value='';
        var b=document.getElementById('b-save-journal');if(b)b.classList.remove('active');
      },50);
    });
    wire('b-view-journal',openJournalView);
    wire('b-jview-list',openJournalView); wire('b-jview-miro',openJournalMiro);
    wire('b-jcap-back',function(){nav('s-journal');}); wire('b-jcap-mg',goMG);
    wire('b-jcov-back',function(){nav('s-journal');}); wire('b-jcov-mg',goMG);
    wire('b-jcov-next',function(){if(_jeEntries.length>0){showEntryAt(_jeEntries,0);nav('s-journal-entry');}});
    wire('b-jview-back',function(){nav('s-journal');}); wire('b-jview-mg',goMG);
    wire('b-jentry-back',function(){nav('s-journal-view');}); wire('b-jentry-mg',goMG);
    wire('b-je-back',function(){nav('s-journal-view');});
    wire('b-je-prev',function(){if(_jeIndex>0)showEntryAt(_jeEntries,_jeIndex-1);else nav('s-journal-cover');});
    wire('b-je-next',function(){if(_jeIndex<_jeEntries.length-1)showEntryAt(_jeEntries,_jeIndex+1);});
    wire('b-save-journal',async function(){
      var t=document.getElementById('journal-text');if(!t)return;
      var text=t.value.trim();if(!text)return;
      var topicEl=document.getElementById('journal-topic'),topic=topicEl?topicEl.value.trim():'';
      var ctx=getCtx();
      var noteId=await saveEntryToSupabase(text,ctx,topic);
      if(noteId){if(!topic)suggestTopic(noteId,text);}
      else{saveEntryLocal({text:text,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),page:ctx,topic:topic});}
      postJournalToMiro(text,topic);
      t.value='';if(topicEl)topicEl.value='';
      var btn=document.getElementById('b-save-journal');if(btn)btn.classList.remove('active');
    });
    var journalTA=document.getElementById('journal-text');
    if(journalTA) journalTA.addEventListener('input',function(){var b=document.getElementById('b-save-journal');if(b)b.classList.toggle('active',this.value.trim().length>0);});
    wire('b-jmiro-back',function(){var e=document.getElementById('journal-miro-embed');if(e)e.src='';nav('s-journal',false);});
    wire('b-jmiro-mg',goMG);
    wire('b-jmiro-full',function(){var e=document.getElementById('journal-miro-embed');if(!e)return;if(e.requestFullscreen)e.requestFullscreen();else if(e.webkitRequestFullscreen)e.webkitRequestFullscreen();});

    /* GEMS HUB */
    wire('b-gems-back',returnToMG);
    wire('b-gems-mg',goMG);
    wire('b-add-gem',openGemAdd);
    wire('b-gadd-back',function(){nav('s-gems');}); wire('b-gadd-mg',goMG);
    var gcOwnTA=document.getElementById('gc-own-text');
    if(gcOwnTA) gcOwnTA.addEventListener('input',updateGemSaveBtn);
    wire('b-save-gem',async function(){
      var btn=document.getElementById('b-save-gem'),status=document.getElementById('gc-status');
      btn.classList.remove('active');btn.textContent='SAVING\u2026';
      var saved=0, candidates=getGemCandidates();
      var checked=document.querySelectorAll('#gc-candidates input:checked');
      for(var i=0;i<checked.length;i++){
        var idx=parseInt(checked[i].getAttribute('data-idx'));
        var c=candidates[idx];
        if(c){await saveGemToSupabase(c.text,c.attr);await postGemToMiro(c.text,c.attr);saved++;}
      }
      var ownText=(document.getElementById('gc-own-text')||{}).value||'';
      if(ownText.trim()){await saveGemToSupabase(ownText.trim(),null);await postGemToMiro(ownText.trim(),_member.display_name||null);saved++;}
      btn.textContent='SAVE';
      if(status) status.textContent=saved+(saved===1?' Gem saved.':' Gems saved.');
      setTimeout(function(){
        document.querySelectorAll('#gc-candidates input').forEach(function(c){c.checked=false;});
        document.querySelectorAll('#gc-candidates .gc-option').forEach(function(d){d.classList.remove('selected');});
        var ownEl=document.getElementById('gc-own-text');if(ownEl)ownEl.value='';
        if(status)status.textContent='';
        updateGemSaveBtn();
      },2000);
    });
    wire('b-view-gems',function(){nav('s-gems-list');renderGemsView();});
    wire('b-gview-list',function(){nav('s-gems-list');renderGemsView();});
    wire('b-gview-miro',openGemsMiro);
    wire('b-glist-back',function(){nav('s-gems');}); wire('b-glist-mg',goMG);
    wire('b-gmiro-back',function(){var e=document.getElementById('gems-miro-embed');if(e)e.src='';nav('s-gems',false);});
    wire('b-gmiro-mg',goMG);
    wire('b-gmiro-full',function(){var e=document.getElementById('gems-miro-embed');if(!e)return;if(e.requestFullscreen)e.requestFullscreen();else if(e.webkitRequestFullscreen)e.webkitRequestFullscreen();});

    /* TOOLS */
    wire('b-tools-back',returnToMG); wire('b-tools-mg',goMG);
    wire('pb-question',function(){nav('s-question');}); wire('pb-create',function(){nav('s-create');});
    wire('pb-shape',function(){nav('s-shape-tools');}); wire('pb-share',function(){nav('s-share');});
    wire('pb-dare',function(){nav('s-dare');}); wire('btn-configure',function(){nav('s-configure');});
    wire('b-q-back',function(){nav('s-tools');});  wire('b-q-mg',goMG);
    wire('b-c-back',function(){nav('s-tools');});  wire('b-c-mg',goMG);
    wire('b-sh-back',function(){nav('s-tools');}); wire('b-sh-mg',goMG);
    wire('b-sr-back',function(){nav('s-tools');}); wire('b-sr-mg',goMG);
    wire('b-d-back',function(){nav('s-tools');});  wire('b-d-mg',goMG);
    wire('b-cfg-back',function(){nav('s-tools');}); wire('b-cfg-mg',goMG);
    wire('b-tools-trash', async function(){
      _sboardMode='board';
      try{ var tid=await _sboardEnsureTrashHeader(); _sboardFilter=tid; }catch(e){ _sboardFilter=null; }
      nav('s-sea-of-ideas-cluster');
    });
    wire('b-go-change-pw',function(){nav('s-change-password');});

    /* CHANGE PASSWORD */
    wire('b-cp-back',function(){nav('s-configure');}); wire('b-cp-mg',goMG);
    var cpInput=document.getElementById('cp-new-password');
    if(cpInput) cpInput.addEventListener('input',function(){var btn=document.getElementById('b-cp-save');if(btn)btn.classList.toggle('active',this.value.trim().length>=6);});
    wire('b-cp-save',async function(){
      var input=document.getElementById('cp-new-password'),msg=document.getElementById('cp-msg'),btn=document.getElementById('b-cp-save');
      var pw=input?input.value.trim():'';
      if(!pw||pw.length<6){if(msg){msg.textContent='Password must be at least 6 characters.';msg.className='cp-msg err';}return;}
      btn.textContent='Saving\u2026';btn.disabled=true;
      var res=await _sb.auth.updateUser({password:pw});
      btn.textContent='Save Password';btn.disabled=false;
      if(res.error){if(msg){msg.textContent=res.error.message;msg.className='cp-msg err';}}
      else{if(msg){msg.textContent='Password updated successfully.';msg.className='cp-msg';}if(input)input.value='';btn.classList.remove('active');}
    });

    drawPentagonArrows();
  }

  /* ── PUBLIC API on window.T2T ── */
  window.T2T = {
    nav:nav, goBack:goBack, goMG:goMG, closeMG:closeMG, returnToMG:returnToMG,
    goPhase:goPhase, wire:wire, togglePh:togglePh,
    markSeaChapterEntry:function(){ seaChapterEntry = true; },
    openSeaTrash:async function(){
      _sboardMode='board';
      try{
        var trashId=await _sboardEnsureTrashHeader();
        _sboardFilter=trashId;
      }catch(e){ _sboardFilter=null; }
      nav('s-sea-of-ideas-cluster');
    },
    registerGems:registerGems, registerCtx:registerCtx,
    registerMap:registerMap, registerMore:registerMore,
    registerPageNum:registerPageNum, registerUtilScreen:registerUtilScreen,
    registerTrivia:registerTrivia,
    setPrimaryPages:function(arr){_primaryPages=arr;},
    loadMemberProfile:loadMemberProfile,
    loadVisitedFromSupabase:loadVisitedFromSupabase,
    sb:_sb, getMember:function(){return _member;},
    getCtx:getCtx, renderMap:renderMap,
    openJournalMiro:openJournalMiro,
    openGemsMiro:openGemsMiro, openGemAdd:openGemAdd,
    ensureMiroReminder:ensureMiroReminder,
    openJournalView:openJournalView,
    postIdeaToMiro:postIdeaToMiro, postImageToMiro:postImageToMiro,
    navToPageNum:navToPageNum, currentFile:currentFile
  };

  document.addEventListener('DOMContentLoaded',function(){
    injectMGOverlay();
    injectSeaOfIdeas();
    injectSeaOfIdeasCluster();
    wireBackpack();
    /* cross-file landing — check if we were sent here to a specific page */
    var bpTarget = sessionStorage.getItem('bp_target');
    if (bpTarget) {
      sessionStorage.removeItem('bp_target');
      navToPageNum(bpTarget);
    }
  });

})();
