/* NAME HUB -- double-click your own name in the upper left corner, from anywhere (Nov 27 2026, Larry: "Click name in the upper left corner to access
   personal data as a FUNCTION not a feature" ... "double click name" ... "build hub now but then design the details later?").

   WHAT YOU SEE: your Personal Card hub -- your name, a door to each part of your information, and Sign Out set apart at the bottom.
     - Contact, Teams & NEWS: the Personal Card page (people-team/personnel-page.js), opened on yourself.
     - My Info: organization and logo (people-team/member-identity.js).
     - Sign Out: the one shared confirm and sign-out (controls/settings-menu.js).
   Nothing here is rebuilt; the details of the hub are still to be designed. Add a door with one line in DOORS.

   "FROM ANYWHERE": the name is found by where it sits on screen, so it also works while a card is open over the board (the dimmed layer would
   otherwise take the click and close the card).
   Public surface: window.T2TNameHub  .open()  .close() */
(function(){
  var NAMES='.sc-traveler-eyebrow, .bb-traveler-eyebrow, #sz-member-watermark';
  var DOORS=[
    { id:'card', symbol:'👤', label:'Contact, Teams & NEWS', go:openCard },
    { id:'info', symbol:'🏢', label:'My Info',               go:openInfo }
  ];

  function member(){ return (window.T2T && window.T2T.getMember && window.T2T.getMember()) || {}; }
  function sb(){ return window.T2T && window.T2T.sb; }

  // ---- finding the name ------------------------------------------------------------------------------------------------------
  function shown(el){
    if(!String(el.textContent||'').trim() || !el.getClientRects().length) return false;
    return getComputedStyle(el).visibility!=='hidden';
  }
  function nameAt(x,y){
    var all=document.querySelectorAll(NAMES);
    for(var i=0;i<all.length;i++){
      if(!shown(all[i])) continue;
      var r=all[i].getBoundingClientRect();
      if(x>=r.left-4 && x<=r.right+4 && y>=r.top-4 && y<=r.bottom+4) return all[i];
    }
    return null;
  }
  // The name itself, what it sits in, or a layer covering the whole screen (the dimmed backdrop behind an open card).
  // Anything smaller lying over that corner is its own control and keeps its own clicks.
  function hit(e){
    var t=e.target, n=nameAt(e.clientX, e.clientY);
    if(!n || !t || !t.getBoundingClientRect) return null;
    if(n===t || n.contains(t) || t.contains(n)) return n;
    var r=t.getBoundingClientRect();
    return (r.width>=window.innerWidth-2 && r.height>=window.innerHeight-2) ? n : null;
  }
  // A single click there does nothing else, so the card underneath stays open for the second click.
  ['pointerdown','mousedown','click'].forEach(function(type){
    window.addEventListener(type, function(e){
      if(!hit(e)) return;
      e.stopPropagation();
      if(type==='mousedown') e.preventDefault();   // no text highlighting on the second click
    }, true);
  });
  window.addEventListener('dblclick', function(e){
    if(!hit(e)) return;
    e.stopPropagation(); e.preventDefault();
    open();
  }, true);

  // ---- the hub ----------------------------------------------------------------------------------------------------------------
  function injectStyle(){
    if(document.getElementById('t2t-name-hub-style')) return;
    var st=document.createElement('style'); st.id='t2t-name-hub-style';
    st.textContent=NAMES.split(',').map(function(s){ return s.trim(); }).join(',')+'{cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}'
      +'#sz-member-watermark{pointer-events:auto}'
      +'#t2t-name-hub{position:fixed;inset:0;z-index:99990;background:rgba(20,40,70,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}'
      +'#t2t-name-hub .nh-box{position:relative;background:#f4f8fd;color:#1a3a5c;border-radius:12px;width:100%;max-width:460px;max-height:92vh;overflow-y:auto;padding:18px 20px;box-sizing:border-box;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;text-align:center}'
      +'#t2t-name-hub .nh-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;opacity:.65}'
      +'#t2t-name-hub .nh-name{font-size:30px;font-weight:800;margin:2px 0 14px}'
      +'#t2t-name-hub .nh-x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:#555}'
      +'#t2t-name-hub .nh-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}'
      +'#t2t-name-hub .nh-tile{flex:1 1 150px;max-width:200px;min-height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#d9f2e6;color:inherit;border:1.5px solid #1a3a5c;border-radius:8px;cursor:pointer;font-family:inherit;font-size:15px;font-weight:700;padding:8px}'
      +'#t2t-name-hub .nh-symbol{font-size:24px}'
      +'#t2t-name-hub .nh-foot{border-top:1.5px solid #9bb8d3;margin-top:18px;padding-top:12px}'
      +'#t2t-name-hub .nh-out{border:1.5px solid #b8544a;color:#a8332a;background:#fff;border-radius:8px;padding:8px 22px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer}';
    document.head.appendChild(st);
  }
  // A page opened from the hub sits on top of it and takes Esc first.
  function pageOnTop(){
    var mi=document.getElementById('mi-overlay');
    return !!(document.getElementById('t2t-personnel') || (mi && mi.style.display!=='none'));
  }
  window.addEventListener('keydown', function(e){
    if(e.key!=='Escape' || !document.getElementById('t2t-name-hub') || pageOnTop()) return;
    e.stopPropagation(); e.preventDefault(); close();
  }, true);

  function close(){ var el=document.getElementById('t2t-name-hub'); if(el) el.remove(); }
  function make(tag, cls, text){ var d=document.createElement(tag); if(cls) d.className=cls; if(text!==undefined) d.textContent=text; return d; }
  function open(){
    injectStyle(); close();
    var m=member();
    var ov=make('div'); ov.id='t2t-name-hub';
    var box=make('div','nh-box');
    var x=make('button','nh-x','×'); x.type='button'; x.setAttribute('aria-label','Close'); x.onclick=close;
    box.appendChild(x);
    box.appendChild(make('div','nh-eyebrow','PERSONAL CARD'));
    box.appendChild(make('div','nh-name', m.display_name || 'You'));
    var grid=make('div','nh-grid');
    DOORS.forEach(function(d){
      var b=make('button','nh-tile'); b.type='button'; b.setAttribute('data-door',d.id);
      b.appendChild(make('span','nh-symbol',d.symbol)); b.appendChild(make('span','',d.label));
      b.onclick=function(){ d.go(); };
      grid.appendChild(b);
    });
    box.appendChild(grid);
    var foot=make('div','nh-foot');
    var out=make('button','nh-out','Sign Out'); out.type='button';
    out.onclick=function(){ if(window.T2TSettingsMenu) window.T2TSettingsMenu.confirmSignOut(close); };
    foot.appendChild(out); box.appendChild(foot);
    ov.appendChild(box);
    ov.addEventListener('click', function(e){ e.stopPropagation(); if(e.target===ov) close(); });
    ov.addEventListener('dblclick', function(e){ e.stopPropagation(); });   // the desk color picker listens for double-clicks outside the app
    document.body.appendChild(ov);
  }

  // ---- the doors --------------------------------------------------------------------------------------------------------------
  function openInfo(){ if(window.T2TMemberIdentity) window.T2TMemberIdentity.openEditor(); }
  var _opening=false;
  async function openCard(){
    if(_opening || !window.T2TPersonnel || !sb()) return;
    _opening=true;
    try{
      var u=(await sb().auth.getUser()).data.user;
      if(!u) throw new Error('Not signed in.');
      var r=await sb().from('members').select('user_id,name,email,phone').eq('user_id', u.id).maybeSingle();
      if(r.error) throw r.error;
      var me=r.data || {};
      window.T2TPersonnel.open({
        person:{ user_id:u.id, name:me.name || member().display_name, email:me.email || u.email, phone:me.phone, is_member:true },
        sb:sb(),
        saveContact:async function(uid, phone, email){
          if(typeof _csSaveContact==='function') return _csSaveContact(uid, phone, email);   // the one contact save (storyboard/idea-storyboard-people.js)
          var s=await sb().rpc('update_member_contact', { p_user_id:uid, p_phone:phone, p_email:email });
          if(s.error) throw s.error;
        }
      });
    }catch(err){ alert('Your Personal Card did not open: '+((err && err.message) || 'something went wrong')); }
    _opening=false;
  }

  injectStyle();
  window.T2TNameHub={ open:open, close:close };
})();
