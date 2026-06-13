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

  const MIRO_TOKEN = "eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_kDvch8cD8LvE03N3iIkzust4bjo";

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

  function registerTrivia(screenId, links) {
    _triviaRegistry[screenId] = links || [];
  }

  function renderTrivia() {
    var el = document.getElementById('trivia-links');
    if (!el) return;
    el.innerHTML = '';
    // Only show trivia registered for the exact primary page or mgOrigin — no stack walk
    var links = _triviaRegistry[primaryPage] || _triviaRegistry[mgOrigin] || [];
    if (!links.length) {
      el.innerHTML = '<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-style:italic;color:#aaa;padding:16px 0">Nothing here yet.</div>';
      return;
    }
    links.forEach(function(link) {
      var div = document.createElement('div');
      div.className = 'more-link';
      div.innerHTML =
        '<div class="more-link-left">' +
          '<div class="more-link-icon">' + link.icon + '</div>' +
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
  function registerPageNum(screenId, num) { _pageNums[screenId] = num; }

  /* ── UTILITY SCREENS ── */
  var _utilScreens = [
    's-trivia','s-cover-more','s-invention-more','s-want-more','s-know-more',
    's-what-is-t2t','s-t2t-goals','s-authors',
    's-thoughts-1','s-thoughts-2','s-thoughts-3',
    's-idea','s-idea-capture','s-sea-ideas',
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
    document.querySelectorAll('.sc').forEach(function(s){ s.classList.remove('active'); });
    t.classList.add('active');
    if (push!==false) stack.push(cur);
    cur=id;
    if (_primaryPages.indexOf(id)!==-1) primaryPage=id;
    var pn=_pageNums[id]; if(pn) addVisited(pn);
    if (id==='s-trivia')          renderTrivia();
    if (id==='s-journal-view')    renderJournalView();
    if (id==='s-journal-cover')   initJournalCover();
    if (id==='s-gems-list')       renderGemsView();
    if (id==='s-change-password') initChangePassword();
    window.scrollTo(0,0);
  }

  function goBack() {
    var ov=document.getElementById('mg-overlay');
    if (ov&&ov.classList.contains('active')){ ov.classList.remove('active'); return; }
    if (stack.length>0){ var d=stack.pop(); nav(d,false); }
  }

  function goMG() {
    if (_utilScreens.indexOf(cur)===-1) mgOrigin=cur;
    var ov=document.getElementById('mg-overlay');
    if (ov) ov.classList.add('active');
  }

  function closeMG(){ var ov=document.getElementById('mg-overlay'); if(ov) ov.classList.remove('active'); }

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

  function renderMap(curNum) {
    var visited=getVisited();
    if(curNum===undefined) curNum=_pageNums[cur]||null;
    var el=document.getElementById('map-intro-steps'); if(!el) return;
    el.innerHTML='';
    _introSteps.forEach(function(step){
      var div=document.createElement('div');
      var isCur=(step.num===curNum), isVis=visited.indexOf(step.num)!==-1&&!isCur;
      div.className='st'+(isCur?' here':isVis?' vis':' unv');
      div.innerHTML='<span class="sn">'+(isCur?'📍':isVis?'👣':step.num)+'</span><span class="sl">'+step.label+'</span>';
      el.appendChild(div);
    });
  }

  /* ── MIRO HELPERS ── */
  function _bid(id){ if(!id) return null; return id.endsWith('=')?id:id+'='; }

  async function postIdeaToMiro(text,ctx) {
    var boardId=_bid(_member.miro_board_id); if(!boardId) return;
    var statusEl=document.getElementById('idea-status');
    if(statusEl) statusEl.textContent='Sending to Sea of Ideas\u2026';
    var COLORS=['light_yellow','yellow','light_green','cyan','light_pink','light_blue','orange'];
    var color=COLORS[Math.floor(Math.random()*COLORS.length)];
    var tag=_member.display_name?'['+_member.display_name+'] ':'';
    var content='<p>\uD83D\uDCA1 <strong>'+tag+'</strong></p><p>'+text+'</p><p><em>\u2014 '+ctx+'</em></p>';
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
    } catch(e){ if(statusEl) statusEl.textContent=''; }
  }

  async function postGemToMiro(text,attr) {
    var boardId=_bid(_member.gems_board_id); if(!boardId) return;
    var attrLine=(attr&&attr!==_member.display_name)?'<p><em>\u2014 '+attr+'</em></p>':'';
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
    var boardId=_bid(_member.journal_board_id); if(!boardId) return;
    var topicLine=topic?'<p><em>'+topic+'</em></p>':'';
    var content='<p>\u270F\uFE0F</p><p>'+text+'</p>'+topicLine;
    try {
      await fetch('https://api.miro.com/v2/boards/'+encodeURIComponent(boardId)+'/sticky_notes',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+MIRO_TOKEN},
        body:JSON.stringify({
          data:{content:content,shape:'rectangle'},
          style:{fillColor:'light_yellow',textAlign:'left',textAlignVertical:'top'},
          geometry:{width:260},
          position:{x:Math.floor(Math.random()*1200)-600,y:Math.floor(Math.random()*800)-400,origin:'center'}
        })
      });
    } catch(e){}
  }

  /* ── MIRO EMBED OPENERS ── */
  function openSeaOfIdeas() {
    var boardId=_bid(_member.miro_board_id);
    if(!boardId){alert('No Sea of Ideas board connected yet. Contact your facilitator.');return;}
    var embed=document.getElementById('miro-embed');
    if(embed) embed.src='https://miro.com/app/live-embed/'+boardId+'/?embedAutoplay=true&moveToViewport=-2000,-1000,4000,2000';
    nav('s-sea-ideas');
  }
  function openJournalMiro() {
    var boardId=_bid(_member.journal_board_id);
    if(!boardId){alert('No Journal board connected yet. Contact your facilitator.');return;}
    var embed=document.getElementById('journal-miro-embed');
    if(embed) embed.src='https://miro.com/app/live-embed/'+boardId+'/?embedAutoplay=true&moveToViewport=-2000,-1000,4000,2000';
    nav('s-journal-miro');
  }
  function openGemsMiro() {
    var boardId=_bid(_member.gems_board_id);
    if(!boardId){alert('No Gems board connected yet. Contact your facilitator.');return;}
    var embed=document.getElementById('gems-miro-embed');
    if(embed) embed.src='https://miro.com/app/live-embed/'+boardId+'/?embedAutoplay=true&moveToViewport=-2000,-1000,4000,2000';
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
    div.innerHTML='<div class="mg-overlay" id="mg-overlay"><div class="mg-modal"><div class="mg-wrap"><div class="mg-head"><div class="mg-ring">🔍</div><div class="mg-ttl">Details</div><div class="mg-desc">More about this page, plus places to keep what matters.</div></div><div class="mg-hrule"></div><div class="mg-body"><div class="mg-row"><div class="mg-btn" id="b-mg-map">🗺️</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-idea">💡</div><div class="mg-btn" id="b-mg-journal">✏️</div><div class="mg-btn" id="b-mg-gems">💎</div></div><div class="mg-row"><div class="mg-btn" id="b-mg-trivia">🌸</div><div class="mg-btn" id="b-mg-tools">🛠️</div></div></div></div><div class="mg-bar"><div class="mg-ret" id="b-mg-ret">⬅️</div></div></div></div>';
    fg.appendChild(div.firstChild);
    wireMGOverlay();
  }

  function wireMGOverlay(){
    var mgOv=document.getElementById('mg-overlay');
    if(mgOv) mgOv.addEventListener('click',function(e){if(e.target===mgOv) closeMG();});
    wire('b-mg-ret',function(){
      var behind=_utilScreens.indexOf(cur)!==-1;
      closeMG();
      if(behind&&mgOrigin){nav(mgOrigin,false);mgOrigin=null;}
    });
    wire('b-mg-map',goMap);
    wire('b-mg-idea',   function(){closeMG();nav('s-idea',   false);});
    wire('b-mg-journal',function(){closeMG();nav('s-journal',false);});
    wire('b-mg-gems',   function(){closeMG();nav('s-gems',   false);});
    wire('b-mg-trivia', function(){closeMG();nav('s-trivia', false);});
    wire('b-mg-tools',  function(){closeMG();nav('s-tools',  false);});
  }

  /* ── BACKPACK SCREEN WIRING ── */
  function wireBackpack(){
    /* MAP */
    wire('b-map-back',function(){if(mgOrigin){nav(mgOrigin,false);}goMG();});
    wire('b-map-mg',goMG);
    wire('tog-map-dream',  function(){togglePh('map-dream');});
    wire('tog-map-believe',function(){togglePh('map-believe');});
    wire('tog-map-dare',   function(){togglePh('map-dare');});
    wire('tog-map-journey',function(){togglePh('map-journey');});

    /* IDEA HUB */
    wire('b-idea-back',function(){if(mgOrigin){nav(mgOrigin,false);}goMG();});
    wire('b-idea-mg',goMG);
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
    wire('b-sea-ideas',openSeaOfIdeas);
    wire('b-sea-back',function(){var e=document.getElementById('miro-embed');if(e)e.src='';nav('s-idea',false);});
    wire('b-sea-mg',goMG);
    wire('b-sea-full',function(){var e=document.getElementById('miro-embed');if(!e)return;if(e.requestFullscreen)e.requestFullscreen();else if(e.webkitRequestFullscreen)e.webkitRequestFullscreen();});
    wire('b-icap-back',goBack); wire('b-icap-mg',goMG);
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
    wire('b-journal-back',function(){if(mgOrigin){nav(mgOrigin,false);}goMG();});
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
    wire('b-jcap-back',goBack); wire('b-jcap-mg',goMG);
    wire('b-jcov-back',goBack); wire('b-jcov-mg',goMG);
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
    wire('b-gems-back',function(){if(mgOrigin){nav(mgOrigin,false);}goMG();});
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
    wire('b-tools-back',function(){if(mgOrigin){nav(mgOrigin,false);}goMG();}); wire('b-tools-mg',goMG);
    wire('pb-question',function(){nav('s-question');}); wire('pb-create',function(){nav('s-create');});
    wire('pb-shape',function(){nav('s-shape');}); wire('pb-share',function(){nav('s-share');});
    wire('pb-dare',function(){nav('s-dare');}); wire('btn-configure',function(){nav('s-configure');});
    wire('b-q-back',goBack);  wire('b-q-mg',goMG);
    wire('b-c-back',goBack);  wire('b-c-mg',goMG);
    wire('b-sh-back',goBack); wire('b-sh-mg',goMG);
    wire('b-sr-back',goBack); wire('b-sr-mg',goMG);
    wire('b-d-back',goBack);  wire('b-d-mg',goMG);
    wire('b-cfg-back',goBack); wire('b-cfg-mg',goMG);
    wire('b-go-change-pw',function(){nav('s-change-password');});

    /* CHANGE PASSWORD */
    wire('b-cp-back',goBack); wire('b-cp-mg',goMG);
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
    nav:nav, goBack:goBack, goMG:goMG, closeMG:closeMG,
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
    openSeaOfIdeas:openSeaOfIdeas, openJournalMiro:openJournalMiro,
    openGemsMiro:openGemsMiro, openGemAdd:openGemAdd,
    openJournalView:openJournalView
  };

  function injectUtilityScreens(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-cover-map')) return; // already in DOM (index.html)
    var html='';
    html+='<div class="sc" id="s-cover-map"><div class="card"><div class="mw"><div class="mg-mhead"><div class="mg-mh" style="font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">🗺️ Map</div><div class="mg-mt">You are here. Your position on the path.</div></div><div class="mg-band"></div><div class="pr"><span class="pl2">🚪 Introduction</span></div><div class="ps" id="map-intro-steps"></div><div class="pr tap" id="tog-map-dream"><span class="pl2">🌈 Phase 1: Dream</span><span class="ptg" id="map-dream-tog">▼</span></div><div id="map-dream" class="ps phd"><div class="st"><span class="sn" style="color:#aaa">1000</span><span class="sl" style="color:#aaa">The Dream Phase</span></div></div><div class="pr tap" id="tog-map-believe"><span class="pl2">🔬 Phase 2: Believe</span><span class="ptg" id="map-believe-tog">▼</span></div><div id="map-believe" class="ps phd"><div class="cm">Coming soon.</div></div><div class="pr tap" id="tog-map-dare"><span class="pl2">⚖️ Phase 3: Dare</span><span class="ptg" id="map-dare-tog">▼</span></div><div id="map-dare" class="ps phd"><div class="cm">Coming soon.</div></div><div class="pr tap" id="tog-map-journey"><span class="pl2">🚀 Phase 4: Journey</span><span class="ptg" id="map-journey-tog">▼</span></div><div id="map-journey" class="ps phd"><div class="cm">Coming soon.</div></div></div></div><div class="bar2"><button class="tb" id="b-map-back">⬅️</button><button class="tb" id="b-map-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-idea"><div class="card"><div class="iw"><div class="mg-mhead" style="background:#EBF4FF;border-bottom:3px solid #378ADD"><div class="mg-mh" style="color:#1A3A5C;font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">💡 Idea</div><div class="mg-mt" style="color:#3A6080">Sparks caught along the way — wild, half-formed, completely unrelated. All welcome.</div></div><div style="background:#d4e8ff;padding:7px 24px 6px;border-bottom:.5px solid #A8CAFE;width:100%"></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:24px"><button class="ib" id="b-capture-idea">Capture an Idea</button><button class="ib" id="b-sea-ideas">Sea of Ideas</button></div></div></div><div class="bar2"><button class="tb" id="b-idea-back">⬅️</button><button class="tb" id="b-idea-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-idea-capture"><div class="card"><div class="icw"><div class="icit">💡 Idea</div><hr class="icr"><div class="icq">Ideas are so fragile. Write this one down before it\'s gone.</div><textarea class="ict" id="idea-text" placeholder="What if…?"></textarea><div class="sp"></div><div class="idea-status" id="idea-status"></div><div id="idea-posted" style="display:none;flex:1;align-items:center;justify-content:center;flex-direction:column;gap:12px"><div style="font-size:52px">🌊</div><div style="font-family:\'Playfair Display\',serif;font-size:24px;font-weight:700;color:#1A3A5C">Posted!</div><div style="font-size:13px;font-style:italic;color:#3A6080">Your idea is in the Sea of Ideas.</div></div></div></div><div class="bar2" style="gap:10px"><button class="tb" id="b-icap-back">⬅️</button><button class="tb" id="b-icap-mg">🔍</button><button class="save-btn" id="b-save-idea">SAVE</button></div></div>';
    html+='<div class="sc" id="s-sea-ideas"><div class="card" style="min-height:440px;background:#EBF4FF;display:flex;flex-direction:column"><div class="mg-mhead" style="background:#EBF4FF;border-bottom:3px solid #378ADD;flex-shrink:0"><div class="mg-mh" style="color:#1A3A5C">🌊 Sea of Ideas</div><div class="mg-mt" style="color:#3A6080">Your ideas, live on the board.</div></div><iframe id="miro-embed" src="" style="flex:1;border:none;min-height:360px" allowfullscreen></iframe></div><div class="bar2" style="gap:6px"><button class="tb" id="b-sea-back">⬅️</button><button class="tb" id="b-sea-mg">🔍</button><div style="display:flex;align-items:center;gap:4px"><button class="tb" id="b-sea-full">⛶</button><span style="font-size:10px;color:#9FE1CB;letter-spacing:1px;white-space:nowrap">esc to exit</span></div></div></div>';
    html+='<div class="sc" id="s-journal"><div class="card"><div class="jw"><div class="mg-mhead" style="background:#FDF6E8;border-bottom:3px solid #C9A87C"><div class="mg-mh" style="color:#3B2510;font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">✏️ Journal</div><div class="mg-mt" style="color:#7A5C3A">Your personal record of the adventure.</div></div><div style="background:#f0e6d0;padding:7px 24px 6px;border-bottom:.5px solid #C9A87C;width:100%"></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:24px"><button class="jb" id="b-add-note">Add Note to Journal</button><button class="jb" id="b-view-journal">View Journal</button><div id="journal-view-choices" style="display:none;flex-direction:row;gap:12px;margin-top:4px"><button class="jb" id="b-jview-list" style="width:100px;font-size:13px;margin-bottom:0">List</button><button class="jb" id="b-jview-miro" style="width:100px;font-size:13px;margin-bottom:0">Miro</button></div></div></div></div><div class="bar2"><button class="tb" id="b-journal-back">⬅️</button><button class="tb" id="b-journal-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-journal-capture"><div class="card"><div class="jcw"><div class="jcit">✏️ Journal</div><div class="jcq">For collecting personal questions, comments, or thoughts.</div><hr class="jcr"><label class="jtopic-lbl">Topic <span style="font-weight:400;letter-spacing:0;text-transform:none;font-style:italic;color:#C9A87C">— optional</span></label><input class="jtopic" type="text" id="journal-topic" placeholder="What\'s this about?"><label class="jtopic-lbl" style="margin-top:4px">Notes</label><textarea class="jct" id="journal-text" placeholder="Anything…"></textarea><div class="sp"></div></div></div><div class="bar2" style="gap:10px"><button class="tb" id="b-jcap-back">⬅️</button><button class="tb" id="b-jcap-mg">🔍</button><button class="jsave-btn" id="b-save-journal">SAVE</button></div></div>';
    html+='<div class="sc" id="s-journal-cover"><div class="card"><div class="jcov"><div class="jcov-name" id="jcov-member-name">MEMBER</div><div class="jcov-frame"><div class="jcov-title">Field Guide Journal</div><div class="jcov-proj">Project #1</div><hr class="jcov-rule"><div class="jcov-sub">A journey from thought to thing.</div></div><div class="jcov-dates"><span id="jcov-start">Started —</span><span style="color:#C9A87C">·</span><span>Ongoing</span></div></div></div><div class="bar2"><button class="tb" id="b-jcov-back">⬅️</button><button class="tb" id="b-jcov-mg">🔍</button><button class="tb" id="b-jcov-next">➡️</button></div></div>';
    html+='<div class="sc" id="s-journal-view"><div class="card" style="height:440px;max-height:440px;min-height:0;overflow:hidden;flex:none"><div class="jvw"><div class="jvh">Field Guide Journal</div><div class="jvs" id="jv-count">Your entries</div><hr class="jvr"><div id="jv-entries-list"><div class="jv-empty">No entries yet.<br>Every journey starts with a first note.</div></div></div></div><div class="bar2"><button class="tb" id="b-jview-back">⬅️</button><button class="tb" id="b-jview-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-journal-entry"><div class="card"><div class="jew"><div class="je-back-link" id="b-je-back">‹ Back to Journal</div><div class="je-num" id="je-num">001</div><div class="je-topic" id="je-topic" style="display:none"></div><div class="je-text" id="je-text"></div><hr class="je-rule"><div class="je-eyebrow" id="je-eyebrow"></div><div class="sp"></div><div class="je-nav"><button class="je-nav-btn dim" id="b-je-prev"><svg viewBox="0 0 14 14"><polygon points="10,2 4,7 10,12"/></svg></button><span class="je-nav-count" id="je-nav-count">1 of 1</span><button class="je-nav-btn dim" id="b-je-next"><svg viewBox="0 0 14 14"><polygon points="4,2 10,7 4,12"/></svg></button></div></div></div><div class="bar2"><button class="tb" id="b-jentry-back">⬅️</button><button class="tb" id="b-jentry-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-journal-miro"><div class="card" style="min-height:440px;background:#FDF6E8;display:flex;flex-direction:column"><div class="mg-mhead" style="background:#FDF6E8;border-bottom:3px solid #C9A87C;flex-shrink:0"><div class="mg-mh" style="color:#3B2510">✏️ Journal Board</div><div class="mg-mt" style="color:#7A5C3A">Your journal entries, live on the board.</div></div><iframe id="journal-miro-embed" src="" style="flex:1;border:none;min-height:360px" allowfullscreen></iframe></div><div class="bar2" style="gap:6px"><button class="tb" id="b-jmiro-back">⬅️</button><button class="tb" id="b-jmiro-mg">🔍</button><div style="display:flex;align-items:center;gap:4px"><button class="tb" id="b-jmiro-full">⛶</button><span style="font-size:10px;color:#9FE1CB;letter-spacing:1px;white-space:nowrap">esc to exit</span></div></div></div>';
    html+='<div class="sc" id="s-gems"><div class="card"><div class="ghw"><div class="mg-mhead" style="background:#F5F3FF;border-bottom:3px solid #7c3aed"><div class="mg-mh" style="color:#5B21B6;font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">💎 Gems</div><div class="mg-mt" style="color:#7c3aed">Wisdom and values discovered along the way.</div></div><div style="background:#ede9fe;padding:7px 24px 6px;border-bottom:.5px solid #c4b5fd;width:100%"></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:24px"><button class="gb" id="b-add-gem">Add a Gem</button><button class="gb" id="b-view-gems">View Gems</button><div id="gems-view-choices" style="display:none;flex-direction:row;gap:12px;margin-top:4px"><button class="gb" id="b-gview-list" style="width:100px;font-size:13px;margin-bottom:0">List</button><button class="gb" id="b-gview-miro" style="width:100px;font-size:13px;margin-bottom:0">Miro</button></div></div></div></div><div class="bar2"><button class="tb" id="b-gems-back">⬅️</button><button class="tb" id="b-gems-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-gem-add"><div class="card" style="min-height:0;overflow:hidden;flex:1"><div class="gcw"><div class="gc-title">💎 Add a Gem</div><div class="gc-ctx" id="gc-ctx-label"></div><hr class="gc-rule"><span class="gc-label">Select what resonates</span><div id="gc-candidates"></div><span class="gc-label" style="margin-top:8px">Or write your own</span><textarea class="gc-own" id="gc-own-text" placeholder="A thought worth keeping…"></textarea><div class="gc-status" id="gc-status"></div></div></div><div class="bar2" style="gap:10px"><button class="tb" id="b-gadd-back">⬅️</button><button class="tb" id="b-gadd-mg">🔍</button><button class="gsave-btn" id="b-save-gem">SAVE</button></div></div>';
    html+='<div class="sc" id="s-gems-list"><div class="card" style="height:440px;max-height:440px;min-height:0;overflow:hidden;flex:none"><div class="gvw"><div class="gvh">💎 Gems</div><div class="gvs" id="gv-count">Your gems</div><hr class="gvr"><div id="gv-entries-list"><div class="gv-empty">No Gems yet.<br>They surface when you\'re ready.</div></div></div></div><div class="bar2"><button class="tb" id="b-glist-back">⬅️</button><button class="tb" id="b-glist-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-gems-miro"><div class="card" style="min-height:440px;background:#F5F3FF;display:flex;flex-direction:column"><div class="mg-mhead" style="background:#F5F3FF;border-bottom:3px solid #7c3aed;flex-shrink:0"><div class="mg-mh" style="color:#5B21B6">💎 Gems Board</div><div class="mg-mt" style="color:#7c3aed">Your gems, live on the board.</div></div><iframe id="gems-miro-embed" src="" style="flex:1;border:none;min-height:360px" allowfullscreen></iframe></div><div class="bar2" style="gap:6px"><button class="tb" id="b-gmiro-back">⬅️</button><button class="tb" id="b-gmiro-mg">🔍</button><div style="display:flex;align-items:center;gap:4px"><button class="tb" id="b-gmiro-full">⛶</button><span style="font-size:10px;color:#9FE1CB;letter-spacing:1px;white-space:nowrap">esc to exit</span></div></div></div>';
    html+='<div class="sc" id="s-trivia"><div class="card"><div class="more-hub"><div class="mg-mhead"><div class="mg-mh" style="font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">🌸 Trivia</div><div class="mg-mt">Stories, quotes, opinions — and things that might have nothing to do with T2T.</div></div><div class="mg-band"></div><div id="trivia-links"></div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-trivia-back">⬅️</button><button class="tb" id="b-trivia-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-tools"><div class="card"><div class="tools-wrap"><div class="mg-mhead"><div class="mg-mh" style="font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">🛠️ Tools</div><div class="mg-mt">The T2T process. Choose where you are.</div></div><div class="tools-orbital"><svg class="orb-svg" id="orb-svg" width="320" height="320" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg"><defs><filter id="btn-glow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.28)"/><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.18)"/></filter></defs><circle cx="160" cy="160" r="105" fill="none" stroke="#c8b89a" stroke-width="1" stroke-dasharray="4,6"/><g id="orb-arrows" fill="#c8b89a"></g><circle cx="160" cy="160" r="34" fill="#0a4a38" stroke="#1a7a5e" stroke-width="2" filter="url(#btn-glow)" id="btn-configure" style="cursor:pointer"/><text x="160" y="169" text-anchor="middle" font-size="26" dominant-baseline="middle" style="pointer-events:none">⚙️</text><g class="btn-group" id="pb-question" transform="translate(160,55)"><rect x="-39" y="-19" width="78" height="38" rx="10" fill="#C9A87C" stroke="#1a1a1a" stroke-width="2" filter="url(#btn-glow)"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display,serif" font-size="22" font-weight="700" fill="#3B2510" style="pointer-events:none">?</text></g><g class="btn-group" id="pb-create" transform="translate(259.8,130.3)"><rect x="-39" y="-19" width="78" height="38" rx="10" fill="#C9A87C" stroke="#1a1a1a" stroke-width="2" filter="url(#btn-glow)"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display,serif" font-size="13" font-weight="700" fill="#3B2510" letter-spacing="1" style="pointer-events:none">CREATE</text></g><g class="btn-group" id="pb-shape" transform="translate(221.8,245.7)"><rect x="-39" y="-19" width="78" height="38" rx="10" fill="#C9A87C" stroke="#1a1a1a" stroke-width="2" filter="url(#btn-glow)"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display,serif" font-size="13" font-weight="700" fill="#3B2510" letter-spacing="1" style="pointer-events:none">SHAPE</text></g><g class="btn-group" id="pb-share" transform="translate(98.2,245.7)"><rect x="-39" y="-19" width="78" height="38" rx="10" fill="#C9A87C" stroke="#1a1a1a" stroke-width="2" filter="url(#btn-glow)"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display,serif" font-size="13" font-weight="700" fill="#3B2510" letter-spacing="1" style="pointer-events:none">SHARE</text></g><g class="btn-group" id="pb-dare" transform="translate(60.2,130.3)"><rect x="-39" y="-19" width="78" height="38" rx="10" fill="#C9A87C" stroke="#1a1a1a" stroke-width="2" filter="url(#btn-glow)"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display,serif" font-size="13" font-weight="700" fill="#3B2510" letter-spacing="1" style="pointer-events:none">DARE</text></g></svg></div></div></div><div class="bar2"><button class="tb" id="b-tools-back">⬅️</button><button class="tb" id="b-tools-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-question"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Tools</div><div class="cat-title">❓</div><div class="cat-desc">Spans all phases — the question is always present.</div><button class="tool-row">Clarifying Questions <span class="arr">→</span></button><button class="tool-row">Reality Check <span class="arr">→</span></button><div class="soon">More tools coming.</div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-q-back">⬅️</button><button class="tb" id="b-q-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-create"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Tools</div><div class="cat-title">💡</div><div class="cat-desc">Dream Phase. The spark that starts everything.</div><button class="tool-row">Wishing Well <span class="arr">→</span></button><button class="tool-row">Vision Board <span class="arr">→</span></button><div class="soon">More tools coming.</div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-c-back">⬅️</button><button class="tb" id="b-c-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-shape"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Tools</div><div class="cat-title">🔬</div><div class="cat-desc">Believe Phase. Turning imagination into a plan.</div><button class="tool-row">Design Canvas <span class="arr">→</span></button><button class="tool-row">Prototype Kit <span class="arr">→</span></button><div class="soon">More tools coming.</div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-sh-back">⬅️</button><button class="tb" id="b-sh-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-share"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Tools</div><div class="cat-title">🗣️</div><div class="cat-desc">Dare Phase. Putting it out into the world.</div><button class="tool-row">Briefing Board <span class="arr">→</span></button><button class="tool-row">Pitch Builder <span class="arr">→</span></button><div class="soon">More tools coming.</div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-sr-back">⬅️</button><button class="tb" id="b-sr-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-dare"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Tools</div><div class="cat-title">⚖️</div><div class="cat-desc">Journey Phase. Committing and doing.</div><button class="tool-row">Briefing Board <span class="arr">→</span></button><button class="tool-row">Planning Tools <span class="arr">→</span></button><div class="soon">More tools coming.</div><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-d-back">⬅️</button><button class="tb" id="b-d-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-configure"><div class="card"><div class="cat-body"><div class="cat-eyebrow">Settings</div><div class="cat-title">⚙️</div><div class="cat-desc">Set conditions for your session.</div><button class="tool-row">Session Setup <span class="arr">→</span></button><button class="tool-row" id="b-go-change-pw">Change Password <span class="arr">→</span></button><div class="sp"></div></div></div><div class="bar2"><button class="tb" id="b-cfg-back">⬅️</button><button class="tb" id="b-cfg-mg">🔍</button></div></div>';
    html+='<div class="sc" id="s-change-password"><div class="card"><div class="cpw"><div class="cp-eyebrow">Settings</div><div class="cp-title">Change Password</div><div class="cp-desc">Enter a new password for your account.</div><label class="cp-lbl">New Password</label><input class="cp-input" type="password" id="cp-new-password" placeholder="at least 6 characters"><button class="cp-btn active" id="b-cp-save">Save Password</button><div class="cp-msg" id="cp-msg"></div></div></div><div class="bar2"><button class="tb" id="b-cp-back">⬅️</button><button class="tb" id="b-cp-mg">🔍</button></div></div>';
    var wrap=document.createElement('div');
    wrap.innerHTML=html;
    while(wrap.firstChild) fg.appendChild(wrap.firstChild);
  }

  document.addEventListener('DOMContentLoaded',function(){
    injectMGOverlay();
    injectUtilityScreens();
    wireBackpack();
  });

})();
