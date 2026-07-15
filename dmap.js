/* ============================================================
   dmap.js — T2T Field Guide developer Map (Dmap / Looking Glass)
   Optional. Plugs into tmap.js's registerMapExtension hook —
   tmap.js and backpack.js require no changes to load or unload
   this file. To remove all developer tooling from a build,
   delete this file's <script> tag. Nothing else needs to change,
   and no residue (DOM elements, dead code paths) is left behind
   in tmap.js or backpack.js.

   Owner-only — the Looking Glass section only ever appears when
   the logged-in Supabase account matches OWNER_EMAIL. Simple but
   secret for now; see FG Standards, "Doors," logged July 14, 2026,
   for the plan to strengthen this before the site goes fully public.
   ============================================================ */

(function(){

  var OWNER_EMAIL = 'larry@thoughts2things.net';

  async function _isOwner() {
    try {
      var T=window.T2T;
      var u = await T.sb.auth.getUser();
      var email = u && u.data && u.data.user && u.data.user.email;
      return !!(email && email.toLowerCase() === OWNER_EMAIL);
    } catch(e) { return false; }
  }

  function ensureGlassDom(){
    if (document.getElementById('map-glass')) return;
    var card = document.querySelector('#s-cover-map .mw'); if(!card) return;
    var tog = document.createElement('div');
    tog.className = 'pr tap'; tog.id = 'tog-map-glass'; tog.style.display = 'none';
    tog.innerHTML = '<span class="pl2">🔮 Looking Glass</span><span class="ptg" id="map-glass-tog">▼</span>';
    var content = document.createElement('div');
    content.id = 'map-glass'; content.className = 'ps phd';
    card.appendChild(tog);
    card.appendChild(content);
    window.T2T.wire('tog-map-glass', function(){ window.T2T.togglePh('map-glass'); });
  }

  function renderLookingGlass(reverseMap){
    var el=document.getElementById('map-glass'); if(!el) return;
    el.innerHTML='';
    var nums=Object.keys(reverseMap).sort();
    nums.forEach(function(num){
      var screenId=reverseMap[num];
      var div=document.createElement('div');
      div.className='st glass';
      div.style.cursor='pointer';
      div.innerHTML='<span class="sn">🔮 '+num+'</span><span class="sl">'+screenId+'</span>';
      div.addEventListener('click',(function(n){ return function(){ window.T2T.closeMG(); window.T2T.navToPageNum(n); }; })(num));
      el.appendChild(div);
    });
  }

  async function mapExtension(){
    ensureGlassDom();
    var togEl=document.getElementById('tog-map-glass');
    var glassEl=document.getElementById('map-glass');
    var owner = await _isOwner();
    if (owner) {
      if (togEl) togEl.style.display='flex';
      renderLookingGlass(window.T2T.getPageNumsReverse());
    } else {
      if (togEl) togEl.style.display='none';
      if (glassEl) { glassEl.innerHTML=''; glassEl.classList.add('phd'); glassEl.style.display='none'; }
    }
  }

  if (window.T2T && window.T2T.registerMapExtension) {
    window.T2T.registerMapExtension(mapExtension);
  }

})();
