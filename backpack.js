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
  var seaChapterEntry = false; /* true only when ISB was entered via the normal CREATE chapter flow (not via the 🔍 backpack) */
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
      if(link.target && _triviaScreens.indexOf(link.target)===-1)
        _triviaScreens.push(link.target);
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
      var pn = _pageNums[link.target];
      div.className = 'more-link' + (pn && getVisited().indexOf(pn)!==-1 ? ' visited' : '');
      div.innerHTML =
        '<div class="more-link-left">' +
          '<div class="more-link-icon">' + (link.icon || '✦') + '</div>' +
          '<div><div class="more-link-label">' + link.label + '</div>' +
          (link.sub ? '<div class="more-link-sub">' + link.sub + '</div>' : '') +
          '</div></div>' +
        '<div class="more-link-arrow"></div>';
      div.addEventListener('click', function() { nav(link.target); });
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

  /* ── SCREEN ACTIVATE REGISTRY ── lets a standalone module (e.g. sea-of-ideas.js)
     hook a render function to its own screen ID without backpack.js needing to
     know that screen exists. nav() calls this generically for every screen. */
  var _screenActivate = {};
  function registerScreenActivate(screenId, fn) { _screenActivate[screenId] = fn; }

  /* ── UTILITY SCREENS ── */
  var _utilScreens = [
    's-trivia','s-cover-more','s-invention-more','s-want-more','s-know-more',
    's-what-is-t2t','s-t2t-goals','s-authors',
    's-thoughts-1','s-thoughts-2','s-thoughts-3',
    's-idea',
    's-journal','s-journal-landing','s-journal-capture','s-journal-cover',
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

  /* ── TRAVEL SPINNER — pocket watch ──
     Shown the instant a screen switches, hidden once that screen's own
     activate function is done — instantly for static screens (no visible
     flash), or until the data actually arrives for ones that fetch. A
     safety-net timeout hides it regardless if something never resolves, so
     it can never get stuck spinning forever. Locked July 16, 2026. */
  var _spinnerHideTimer=null;
  function showTravelSpinner(){
    var sp=document.getElementById('travel-spinner');
    if(!sp) return;
    sp.classList.add('active');
    if(_spinnerHideTimer) clearTimeout(_spinnerHideTimer);
    _spinnerHideTimer=setTimeout(hideTravelSpinner, 5000);
  }
  function hideTravelSpinner(){
    var sp=document.getElementById('travel-spinner');
    if(sp) sp.classList.remove('active');
    if(_spinnerHideTimer){ clearTimeout(_spinnerHideTimer); _spinnerHideTimer=null; }
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
    showTravelSpinner();
    if (id==='s-trivia')          renderTrivia();
    if (id==='s-journal-landing') { var jc=document.getElementById('journal-view-choices'); if(jc) jc.style.display='none'; }
    if (id==='s-gems')            { var gc=document.getElementById('gems-view-choices');    if(gc) gc.style.display='none'; }
    if (id==='s-journal-view')    renderJournalView();
    if (id==='s-journal-cover')   initJournalCover();
    if (id==='s-gems-list')       renderGemsView();
    var _activateResult = _screenActivate[id] ? _screenActivate[id]() : null;
    if (id==='s-change-password') initChangePassword();
    window.scrollTo(0,0);
    if(_activateResult && typeof _activateResult.then==='function'){
      _activateResult.then(hideTravelSpinner, hideTravelSpinner);
    } else {
      hideTravelSpinner();
    }
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
    if (window.T2T && window.T2T.renderMap) window.T2T.renderMap(srcNum);
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
        // 9712/13/14/15 capture cards never call nav() — by design, they sit
        // on top of whatever screen is active without disturbing it (see
        // idea-capture.js header). That means `cur` still points at the
        // HOST screen (9710 or 9711) while one of these is open, so this
        // toast kept reporting the host's number instead of the card's own.
        // Fixed July 17, 2026 — same priority pattern as mgOpen above,
        // using the public IdeaCapture.isOpen()/currentPageNum() API.
        var icOpen = window.IdeaCapture && window.IdeaCapture.isOpen && window.IdeaCapture.isOpen();
        // DETAILS (9716, the shared Storyboard/Session card-back overlay)
        // has the exact same "sits on top without calling nav()" problem
        // the 9712-9715 fix above already covers -- just never got added
        // to this check, so triple-clicking the card back still reported
        // whatever host screen (9710/9711) was underneath it. Larry, July
        // 18, 2026.
        var detailOv=document.getElementById('sb-detail-overlay');
        var detailOpen = !!(detailOv && detailOv.classList.contains('active'));
        // CLUSTER (9717) and the trash confirmation (9718) have the exact
        // same "sits on top without calling nav()" problem DETAILS (9716)
        // had - same fix, same reasoning. Every screen is a Touch Point and
        // gets its own number, no exceptions. Larry, July 19, 2026.
        var clusterOv=document.getElementById('sb-cluster-overlay');
        var clusterOpen = !!(clusterOv && clusterOv.classList.contains('active'));
        var trashOv=document.getElementById('sb-trash-overlay');
        var trashOpen = !!(trashOv && trashOv.style.display==='flex');
        var num = mgOpen ? '9000' : (icOpen ? window.IdeaCapture.currentPageNum() : (trashOpen ? '9718' : (clusterOpen ? '9717' : (detailOpen ? '9716' : (_pageNums[cur] || '—')))));
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

  /* autoOpenMapPhase moved to tmap.js, July 14, 2026 — setPhOpen stays here
     and is exported below since it's a small generic utility, not Map-specific. */

  /* ── MAP RENDER ── moved to tmap.js, July 14, 2026 (Tmap/Dmap split — see
     FG Standards). backpack.js exposes getCurNum/setPhOpen/getPageNumsReverse
     below so tmap.js (and optionally dmap.js) can build the Map screen
     without needing backpack.js's private closure state directly. */

  /* ── MIRO HELPERS ── */
  function _bid(id){ if(!id) return null; return id.endsWith('=')?id:id+'='; }

  async function postIdeaToMiro(text,ctx) {
    var boardId=_bid(_member.miro_board_id); if(!boardId) return false;
    var statusEl=document.getElementById('idea-status');
    if(statusEl) statusEl.textContent='Sending to ISB\u2026';
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
      if(statusEl){ statusEl.textContent=res.ok?'\uD83C\uDF0A In your ISB!':''; if(res.ok) setTimeout(function(){if(statusEl)statusEl.textContent='';},3000); }
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
    wire('b-mg-idea',   function(){
      closeMG();
      // 9611 FOCUS retired from this entry point, July 13, 2026 — 9711 now
      // handles its own sticky last-Topic resume, so the extra gate screen
      // in front of it is redundant. FOCUS is still used elsewhere (e.g.
      // entering the Storyboard directly, b-sea-ideas below).
      if(window.T2TSea && window.T2TSea.openIdeaCapture){
        var ctx=(window.T2TSea.getCurrentBoardContext)?window.T2TSea.getCurrentBoardContext():null;
        ctx=ctx||{};
        // Clicking 💡 in the backpack means "I want to add an idea," not
        // "show me the board" — Locked July 18, 2026. 9712 auto-opens on
        // top of 9711 the moment it lands, rather than requiring a second
        // tap once there.
        ctx.autoOpenCapture=true;
        window.T2TSea.openIdeaCapture(ctx);
      } else console.error('Idea capture unavailable — window.T2TSea.openIdeaCapture is missing (session.js failed to load?). The old 9210-legacy fallback screen was removed July 18, 2026, so there is no longer a second path here.');
    });
    wire('b-mg-journal',function(){closeMG();nav('s-journal',false);});
    wire('b-mg-gems',   function(){closeMG();nav('s-gems-board', false);});
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
    // s-idea-capture/theme/paste/link/custom (9210-legacy, 9211-9214)
    // registrations removed July 18, 2026 along with the screens
    // themselves — see idea-media-shared.js.
    registerPageNum('s-idea-session','9711'); /* was 9210 — renumbered July 13, 2026 into the 9700-9799 Storyboard family, right after ISB (9710) */
    registerPageNum('s-journal',        '9300');
    // 9300 became the NOTES chooser (Journal vs Briefing Board) July 19,
    // 2026 -- the Add Note/View Journal buttons that used to live directly
    // on 9300 moved one step deeper onto their own screen, so they get
    // their own number too: 9300.1, decimal off the Notes hub, same
    // pattern as Trivia (0100.1, 1110.1). Larry: every screen is a Touch
    // Point, no exceptions.
    registerPageNum('s-journal-landing','9300.1');
    registerPageNum('s-journal-capture','9310');
    registerPageNum('s-journal-view',   '9320');
    // Every screen a traveler can land on is its own Touch Point and gets
    // its own number — Larry, July 19, 2026. Cover and Entry are states
    // within the View flow (9320), so they take decimals off it, matching
    // the established Trivia pattern (0100.1, 1110.1, etc.) rather than a
    // whole new ten-block, since neither will ever need Trivia-style
    // multiplication of siblings.
    registerPageNum('s-journal-cover',  '9320.1');
    registerPageNum('s-journal-entry',  '9320.2');
    registerPageNum('s-journal-miro',   '9330');
    registerPageNum('s-gems',      '9400');
    registerPageNum('s-gem-add',   '9410');
    /* s-gems-list previously held 9420 — freed for the new gems.js
       board (July 9, 2026). s-gems-list itself is untouched, just
       no longer numbered/reachable from the default backpack path. */
    registerPageNum('s-gems-miro', '9430');
    registerPageNum('s-trivia', '9500');
    registerPageNum('s-tools',  '9600');
    registerPageNum('s-question', '9610');
    registerPageNum('s-create',   '9620');
    registerPageNum('s-shape-tools', '9630');
    registerPageNum('s-share', '9640');
    /* s-dare has no Notion page number assigned yet */

    /* MAP — wired by tmap.js against its own injected elements, not here */

    /* IDEA HUB */
    wire('b-idea-back',returnToMG);
    wire('b-idea-mg',goMG);
    wire('b-idea-trivia',function(){ _triviaOverride='s-idea'; nav('s-trivia',false); });
    /* NOTE: capture flow (selects, close, save, image buttons) is wired
       entirely inside sea-of-ideas.js via renderIdeaSession() — registered
       against 's-idea-session' through registerScreenActivate. This keeps
       all Idea/board schema logic (boards, headers, cluster_id) in one
       file. The 9200 hub screen ('s-idea') is no longer the default entry
       point (💡 now opens 9711 directly, see b-mg-idea above) but is left
       in place and still reachable; its "Capture an Idea" button below
       just forwards into the same 9711 flow. 9611 FOCUS retired from this
       entry point July 13, 2026 — same reasoning as b-mg-idea above. */
    wire('b-capture-idea',function(){
      if(window.T2TSea&&window.T2TSea.openIdeaCapture) window.T2TSea.openIdeaCapture(null);
      else console.error('Idea capture unavailable — window.T2TSea.openIdeaCapture is missing (session.js failed to load?). The old 9210-legacy fallback screen was removed July 18, 2026, so there is no longer a second path here.');
    });
    wire('b-sea-ideas',function(){
      seaChapterEntry = false;
      nav('s-sea-of-ideas-cluster');
    });

    /* JOURNAL HUB */
    wire('b-journal-back',function(){nav('s-journal');});
    wire('b-journal-mg',goMG);
    /* NOTES chooser (9300) -- Journal vs Briefing Board, added July 19, 2026 */
    wire('b-notes-back',returnToMG);
    wire('b-notes-mg',goMG);
    wire('b-notes-journal',function(){nav('s-journal-landing');});
    wire('b-notes-bb',function(){nav('s-briefing-board');});
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
    wire('b-jcap-back',function(){nav('s-journal-landing');}); wire('b-jcap-mg',goMG);
    wire('b-jcov-back',function(){nav('s-journal-landing');}); wire('b-jcov-mg',goMG);
    wire('b-jcov-next',function(){if(_jeEntries.length>0){showEntryAt(_jeEntries,0);nav('s-journal-entry');}});
    wire('b-jview-back',function(){nav('s-journal-landing');}); wire('b-jview-mg',goMG);
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
    wire('b-jmiro-back',function(){var e=document.getElementById('journal-miro-embed');if(e)e.src='';nav('s-journal-landing',false);});
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
    wire('b-tools-sea-ideas', function(){
      nav('s-sea-of-ideas-cluster');
    });
    wire('b-tools-trash', function(){
      if (window.T2TSea) window.T2TSea.openTrash();
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
    showTravelSpinner:showTravelSpinner, hideTravelSpinner:hideTravelSpinner,
    markSeaChapterEntry:function(){ seaChapterEntry = true; },
    getSeaChapterEntry:function(){ return seaChapterEntry; },
    consumeSeaChapterEntry:function(){ var v=seaChapterEntry; seaChapterEntry=false; return v; },
    openSeaTrash:function(){
      if (window.T2TSea) return window.T2TSea.openTrash();
    },
    registerGems:registerGems, registerCtx:registerCtx,
    registerMap:registerMap, registerMore:registerMore,
    registerPageNum:registerPageNum, registerUtilScreen:registerUtilScreen,
    registerTrivia:registerTrivia, registerScreenActivate:registerScreenActivate,
    setPrimaryPages:function(arr){_primaryPages=arr;},
    loadMemberProfile:loadMemberProfile,
    loadVisitedFromSupabase:loadVisitedFromSupabase,
    getVisited:getVisited,
    sb:_sb, getMember:function(){return _member;},
    getCtx:getCtx,
    openJournalMiro:openJournalMiro,
    openGemsMiro:openGemsMiro, openGemAdd:openGemAdd,
    ensureMiroReminder:ensureMiroReminder,
    openJournalView:openJournalView,
    postIdeaToMiro:postIdeaToMiro, postImageToMiro:postImageToMiro,
    navToPageNum:navToPageNum, currentFile:currentFile,
    getCurNum:function(){ return _pageNums[cur]||null; },
    setPhOpen:setPhOpen,
    getPageNumsReverse:function(){ return _pageNumsReverse; }
  };

  document.addEventListener('DOMContentLoaded',function(){
    injectMGOverlay();
    wireBackpack();
    /* cross-file landing — check if we were sent here to a specific page */
    var bpTarget = sessionStorage.getItem('bp_target');
    if (bpTarget) {
      sessionStorage.removeItem('bp_target');
      navToPageNum(bpTarget);
    }
  });

})();
