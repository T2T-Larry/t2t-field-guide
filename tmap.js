/* ============================================================
   tmap.js — T2T Field Guide traveler Map (Tmap)
   Builds and renders the traveler-facing Map screen. Injected
   once at runtime (same pattern as backpack.js's MG overlay via
   injectMGOverlay) — never duplicated as static HTML in phase
   files. Loaded by every phase file, right after backpack.js.

   Exposes window.T2T.renderMap and window.T2T.registerMapExtension
   so optional modules (e.g. dmap.js, the developer-only Looking
   Glass) can extend the Map screen without this file — or
   backpack.js — needing to know they exist. To remove all
   developer tooling from a build, delete dmap.js's <script> tag;
   this file requires no changes either way.
   ============================================================ */

(function(){

  var _mapExtensions = [];

  function registerMapExtension(fn) {
    if (typeof fn === 'function') _mapExtensions.push(fn);
  }

  function injectMapOverlay(){
    var fg=document.getElementById('fg-root'); if(!fg) return;
    if(document.getElementById('s-cover-map')) return; // idempotent
    var div=document.createElement('div');
    div.innerHTML =
      '<div class="sc" id="s-cover-map">'+
        '<div class="card"><div class="mw">'+
          '<div class="mg-mhead"><div class="mg-mh" style="font-size:48px;font-weight:700;line-height:1;padding-bottom:6px">🧭 Map</div><div class="mg-mt">You are here. Your position on the path.</div></div>'+
          '<div class="mg-band"></div>'+
          '<div class="pr tap" id="tog-map-intro"><span class="pl2">🚪 Introduction</span><span class="ptg" id="map-intro-steps-tog">▼</span></div>'+
          '<div class="ps" id="map-intro-steps"></div>'+
          '<div class="pr tap" id="tog-map-dream"><span class="pl2">🌈 Phase 1: Dream</span><span class="ptg" id="map-dream-tog">▼</span></div>'+
          '<div id="map-dream" class="ps phd"></div>'+
          '<div class="pr tap" id="tog-map-believe"><span class="pl2">🔬 Phase 2: Believe</span><span class="ptg" id="map-believe-tog">▼</span></div>'+
          '<div id="map-believe" class="ps phd"></div>'+
          '<div class="pr tap" id="tog-map-dare"><span class="pl2">⚖️ Phase 3: Dare</span><span class="ptg" id="map-dare-tog">▼</span></div>'+
          '<div id="map-dare" class="ps phd"></div>'+
          '<div class="pr tap" id="tog-map-journey"><span class="pl2">🚀 Phase 4: Journey</span><span class="ptg" id="map-journey-tog">▼</span></div>'+
          '<div id="map-journey" class="ps phd"></div>'+
        '</div></div>'+
        '<div class="bar2">'+
          '<button class="tb" id="b-map-back">⬅️</button>'+
          '<button class="tb" id="b-map-mg">🔍</button>'+
        '</div>'+
      '</div>';
    fg.appendChild(div.firstChild);
    wireMapOverlay();
  }

  function wireMapOverlay(){
    var T=window.T2T;
    T.wire('tog-map-intro',   function(){ T.togglePh('map-intro-steps'); });
    T.wire('tog-map-dream',   function(){ T.togglePh('map-dream'); });
    T.wire('tog-map-believe', function(){ T.togglePh('map-believe'); });
    T.wire('tog-map-dare',    function(){ T.togglePh('map-dare'); });
    T.wire('tog-map-journey', function(){ T.togglePh('map-journey'); });
    T.wire('b-map-back', T.returnToMG);
    T.wire('b-map-mg',   T.goMG);
  }

  var _introSteps = [
    {num:'0100',label:'Field Guide',                                  id:'s-cover'},
    {num:'0200',label:'Every great invention started as a thought.',  id:'s-invention'},
    {num:'0300',label:'What do you want?',                            id:'s-want'},
    {num:'0400',label:'Do you know what you want?',                   id:'s-know'}
  ];

  var _dreamSteps = [
    {num:'1000',label:'The Dream Phase',   id:'s-dream'},
    {num:'1010',label:'Idea Storyboard',   id:'s-sea-of-ideas-cluster'}, // Larry, July 29 2026: was 1150 -> the archived 9220 legacy grid; renumbered to match the live 1010 screen and moved up to sit right after 1000
    {num:'1100',label:'CREATE',            id:'s-create-hub'},
    {num:'1110',label:'Creative License',  id:'s-cl-intro'},
    {num:'1130',label:'Inklings',          id:'s-what-i-want'},
    {num:'1140',label:'Creative Sparks',   id:'s-lightning-bug'},
    {num:'1160',label:'PLUSing',           id:'s-plusing'}
  ];

  var _believeSteps = [
    {num:'2000',label:'The Believe Phase', id:'s-believe-phase'} // Larry, July 29 2026: phase-entry screen only -- no chapter breakdown built yet
  ];

  var _dareSteps = [
    {num:'3000',label:'The Dare Phase',    id:'s-dare-phase'}
  ];

  var _journeySteps = [
    {num:'4000',label:'The Journey Phase', id:'s-journey-phase'}
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
        div.addEventListener('click',(function(n){ return function(){ window.T2T.closeMG(); window.T2T.navToPageNum(n); }; })(step.num));
      }
      el.appendChild(div);
    });
  }

  function autoOpenMapPhase(curNum){
    var T=window.T2T;
    var allSections = ['map-intro-steps','map-dream','map-believe','map-dare','map-journey'];
    var target = 'map-intro-steps';
    if(curNum){
      var lead=curNum.charAt(0);
      if(lead==='1') target='map-dream';
      else if(lead==='2') target='map-believe';
      else if(lead==='3') target='map-dare';
      else if(lead==='4') target='map-journey';
    }
    allSections.forEach(function(id){ T.setPhOpen(id, id===target); });
  }

  function renderMap(curNum){
    var T=window.T2T;
    injectMapOverlay(); // safety net — no-op if already injected
    var visited=T.getVisited();
    if(curNum===undefined) curNum=T.getCurNum();
    renderStepList('map-intro-steps', _introSteps, curNum, visited);
    renderStepList('map-dream',       _dreamSteps, curNum, visited);
    renderStepList('map-believe',     _believeSteps, curNum, visited);
    renderStepList('map-dare',        _dareSteps, curNum, visited);
    renderStepList('map-journey',     _journeySteps, curNum, visited);
    autoOpenMapPhase(curNum);
    _mapExtensions.forEach(function(fn){
      try { fn(curNum); } catch(e){ console.warn('Map extension error:', e); }
    });
  }

  document.addEventListener('DOMContentLoaded', injectMapOverlay);

  window.T2T = window.T2T || {};
  window.T2T.renderMap = renderMap;
  window.T2T.registerMapExtension = registerMapExtension;

})();
