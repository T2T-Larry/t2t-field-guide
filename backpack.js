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
    's-tools','s-question','s-create','s-shape','s-share','s-dare',
    's-configure','s-change-password'
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
        var num = _pageNums[cur] || '—';
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
      if(behind&&mgOrigin){nav(mgOrigin,false);}
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
    /* MAP */
    wire('b-map-back',returnToMG);
    wire('b-map-mg',goMG);
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
    wire('b-sea-ideas',function(){nav('s-sea-of-ideas');});
    wire('b-icap-back',function(){nav('s-idea');}); wire('b-icap-mg',goMG);
    var ideaTA=document.getElementById('idea-text');
    if(ideaTA) ideaTA.addEventListener('input',function(){var b=document.getElementById('b-save-idea');if(b)b.classList.toggle('active',this.value.trim().length>0);});
    wire('b-save-idea',async function(){
      var t=document.getElementById('idea-text');if(!t)return;
      var text=t.value.trim();if(!text)return;
      var ctx=getCtx();
      var btn=document.getElementById('b-save-idea');
      btn.classList.remove('active');btn.textContent='SAVING\u2026';
      try{var user=await _sb.auth.getUser();if(user&&user.data&&user.data.user){await _sb.from('ideas').insert({user_id:user.data.user.id,idea_text:text,page_context:ctx,created_at:new Date().toISOString()});}}catch(e){}
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
    wire('b-view-journal',function(){var choices=document.getElementById('journal-view-choices');if(!choices)return;choices.style.display=choices.style.display==='flex'?'none':'flex';});
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
    wire('b-view-gems',function(){var choices=document.getElementById('gems-view-choices');if(!choices)return;choices.style.display=choices.style.display==='flex'?'none':'flex';});
    wire('b-gview-list',function(){nav('s-gems-list');renderGemsView();});
    wire('b-gview-miro',openGemsMiro);
    wire('b-glist-back',function(){nav('s-gems');}); wire('b-glist-mg',goMG);
    wire('b-gmiro-back',function(){var e=document.getElementById('gems-miro-embed');if(e)e.src='';nav('s-gems',false);});
    wire('b-gmiro-mg',goMG);
    wire('b-gmiro-full',function(){var e=document.getElementById('gems-miro-embed');if(!e)return;if(e.requestFullscreen)e.requestFullscreen();else if(e.webkitRequestFullscreen)e.webkitRequestFullscreen();});

    /* TOOLS */
    wire('b-tools-back',returnToMG); wire('b-tools-mg',goMG);
    wire('pb-question',function(){nav('s-question');}); wire('pb-create',function(){nav('s-create');});
    wire('pb-shape',function(){nav('s-shape');}); wire('pb-share',function(){nav('s-share');});
    wire('pb-dare',function(){nav('s-dare');}); wire('btn-configure',function(){nav('s-configure');});
    wire('b-q-back',function(){nav('s-tools');});  wire('b-q-mg',goMG);
    wire('b-c-back',function(){nav('s-tools');});  wire('b-c-mg',goMG);
    wire('b-sh-back',function(){nav('s-tools');}); wire('b-sh-mg',goMG);
    wire('b-sr-back',function(){nav('s-tools');}); wire('b-sr-mg',goMG);
    wire('b-d-back',function(){nav('s-tools');});  wire('b-d-mg',goMG);
    wire('b-cfg-back',function(){nav('s-tools');}); wire('b-cfg-mg',goMG);
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
    wireBackpack();
    /* cross-file landing — check if we were sent here to a specific page */
    var bpTarget = sessionStorage.getItem('bp_target');
    if (bpTarget) {
      sessionStorage.removeItem('bp_target');
      navToPageNum(bpTarget);
    }
  });

})();
