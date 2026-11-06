// card-display-options.js -- Nov 6 2026 (Larry: "In the gear, the customization is for all cards and for visibility anywhere on a card. Eyeballs on the card back are only
// for front view options. If a feature never shows on a card, there is no eyeball on the card back. Build this option in card gear with popup custom choices.")
// ONE place that decides which card features this traveler wants to see at all, so every card face and every card back follows the same list.
//   Gear level (this file): a viewing preference, kept on this device like the Subject look (controls/subject-look.js). Each feature has an eyeball.
//     Open eye = the feature shows on cards as before.  Slashed eye = the feature never shows anywhere on a card: its row on the back is hidden,
//     its face badge is gone, and the card back's own eyeball for it goes away (nothing is left to choose).
//   Card level (unchanged): a card back's eyeball still only chooses front or back-only, for the features that are showing.
// Nothing is stored on any card and no database column is needed. Every card is untouched, so turning a feature back on brings it back exactly as it was.
// How it reaches the cards, in two places only:
//   1. FGCardBackOptions.isBackOnly(hidden,key) also answers true for a feature hidden here, so every card face that already asks it follows.
//   2. Any element on a card back that carries data-fg-feature="<feature>" is hidden by one generated style rule while that feature is off.
// Public surface: window.T2TCardDisplay
//   .FEATURES                       the list: {key, label, keys (the front keys it covers), hint}
//   .isFeatureHidden(feature)       true when the Gear says never show it
//   .isHiddenKey(frontKey)          true when a front key (start, due, routine ...) belongs to a hidden feature
//   .setFeatureHidden(feature,on)   change it (stored on this device, repainted at once)
//   .showAll()                      turn every feature back on
//   .openPopup()                    the Gear's popup of custom choices
(function(){
  var STORE_KEY='t2t-card-display-hidden';
  // To add a feature later: one line here, then tag its back element with data-fg-feature (or give it a selector in EXTRA_SELECTORS).
  var FEATURES=[
    { key:'priority', label:'Priority',      keys:['priority'],        hint:'H M L' },
    { key:'dates',    label:'Dates',         keys:['start','due'],     hint:'Start and due dates' },
    { key:'time',     label:'Time',          keys:[],                  hint:'The time boxes beside a date' },
    { key:'flags',    label:'Signal flags',  keys:['flags'],           hint:'Flags and hearts' },
    { key:'routine',  label:'Routine',       keys:['routine'],         hint:'The ROUTINE word and its row' },
    { key:'link',     label:'Link arrows',   keys:['link'],            hint:'The colored go-to arrows' },
    { key:'org',      label:'Organization',  keys:[],                  hint:'The organization name and logo row' },
    { key:'budget',   label:'Budget',        keys:[],                  hint:'The budget row' },
    { key:'links',    label:'Video / PDF link', keys:[],               hint:'The video or PDF link row' },
    { key:'plan',     label:'Plan badge',    keys:['plan'],            hint:'PLAN on the card face' },
    { key:'vision',   label:'Vision badge',  keys:['vision'],          hint:'VISION on the card face' },
    { key:'notes',    label:'Notes pencil',  keys:['notes'],           hint:'The pencil that says a card has notes' }
  ];
  // Features that are not a single tagged element: a plain selector on the card back.
  var EXTRA_SELECTORS={ time:['.bb-date-time'] };

  var _hidden=read();
  function read(){
    try{ var a=JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); return Array.isArray(a) ? a.filter(function(k){ return typeof k==='string'; }) : []; }catch(e){ return []; }
  }
  function write(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(_hidden)); }catch(e){} }
  function featureOf(key){ for(var i=0;i<FEATURES.length;i++){ if(FEATURES[i].key===key) return FEATURES[i]; } return null; }
  function isFeatureHidden(f){ return _hidden.indexOf(f)>=0; }
  function isHiddenKey(frontKey){
    if(!_hidden.length) return false;
    for(var i=0;i<_hidden.length;i++){ var f=featureOf(_hidden[i]); if(f && f.keys.indexOf(frontKey)>=0) return true; }
    return false;
  }

  function paintStyle(){
    var st=document.getElementById('fg-card-display-style');
    if(!st){ st=document.createElement('style'); st.id='fg-card-display-style'; document.head.appendChild(st); }
    st.textContent=_hidden.map(function(f){
      var sels=['[data-fg-feature="'+f+'"]'].concat(EXTRA_SELECTORS[f]||[]);
      return sels.join(',')+'{display:none!important}';
    }).join('\n');
  }
  // Card faces are drawn by each board's own renderer; ask whichever are on screen to draw again.
  function repaintCards(){
    try{ if(typeof renderBoard==='function') renderBoard(); }catch(e){}
    try{ if(typeof renderSeaBoard==='function') renderSeaBoard(true); }catch(e){}
    try{ if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync(); }catch(e){}
    document.dispatchEvent(new CustomEvent('fg-card-display-changed'));
  }
  function setFeatureHidden(f, on){
    if(!featureOf(f)) return;
    var i=_hidden.indexOf(f);
    if(on && i<0) _hidden.push(f); else if(!on && i>=0) _hidden.splice(i,1); else return;
    write(); paintStyle(); repaintCards();
  }
  function showAll(){ if(!_hidden.length) return; _hidden=[]; write(); paintStyle(); repaintCards(); }

  // ---- the popup -------------------------------------------------------------------------------------------------------------
  var pop=null;
  function closePopup(){
    if(pop && pop.parentNode) pop.parentNode.removeChild(pop);
    pop=null; document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); closePopup(); } }
  function eyeIcon(off){
    var ic=window.FGCardBackOptions && FGCardBackOptions.eyeIcons;
    return ic ? (off ? ic.slash : ic.open) : (off ? '⊘' : '◉');
  }
  function injectStyle(){
    if(document.getElementById('fg-card-display-pop-style')) return;
    var st=document.createElement('style'); st.id='fg-card-display-pop-style';
    st.textContent=''
      +'.fg-cd-wrap{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}'
      +'.fg-cd-panel{width:min(340px,92vw);max-height:86vh;overflow:auto;background:var(--bb-bg,#fffdf6);color:var(--bb-ink,#2b2b2b);border:1.5px solid var(--bb-accent,#8a7a4a);border-radius:10px;padding:12px 14px 10px;box-shadow:0 8px 28px rgba(0,0,0,.3);font-size:calc(12px * var(--fg-text-scale,1))}'
      +'.fg-cd-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px}'
      +'.fg-cd-title{font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase}'
      +'.fg-cd-x{background:transparent;border:0;cursor:pointer;color:inherit;font-size:calc(16px * var(--fg-text-scale,1));line-height:1;padding:2px 6px}'
      +'.fg-cd-sub{opacity:.75;margin:0 0 8px;line-height:1.35}'
      +'.fg-cd-row{display:flex;align-items:center;gap:8px;min-height:28px;border-bottom:1px dotted var(--bb-accent,#8a7a4a)}'
      +'.fg-cd-row:last-of-type{border-bottom:0}'
      +'.fg-cd-eye{flex:0 0 auto;width:24px;height:24px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:4px;color:inherit;cursor:pointer}'
      +'.fg-cd-eye:hover{background:rgba(0,0,0,.07)}'
      +'.fg-cd-eye svg{width:15px;height:15px}'
      +'.fg-cd-lab{flex:1 1 auto;min-width:0;font-weight:700}'
      +'.fg-cd-hint{display:block;font-weight:400;opacity:.65;font-size:calc(10.5px * var(--fg-text-scale,1))}'
      +'.fg-cd-row.fg-cd-off .fg-cd-lab{opacity:.5;text-decoration:line-through}'
      +'.fg-cd-foot{display:flex;justify-content:flex-end;margin-top:8px}'
      +'.fg-cd-all{background:transparent;border:1px solid var(--bb-accent,#8a7a4a);border-radius:6px;color:inherit;cursor:pointer;padding:3px 10px;font:inherit;font-weight:700}';
    document.head.appendChild(st);
  }
  function openPopup(){
    if(pop){ closePopup(); return; }
    injectStyle();
    pop=document.createElement('div'); pop.className='fg-cd-wrap';
    var panel=document.createElement('div'); panel.className='fg-cd-panel';
    panel.innerHTML='<div class="fg-cd-head"><span class="fg-cd-title">Card display</span><button type="button" class="fg-cd-x" aria-label="Close">✕</button></div>'
      +'<p class="fg-cd-sub">For every card. A slashed eye means that feature never shows on a card, front or back.</p>';
    var rows=[];
    FEATURES.forEach(function(f){
      var row=document.createElement('div'); row.className='fg-cd-row';
      var eye=document.createElement('button'); eye.type='button'; eye.className='fg-cd-eye';
      var lab=document.createElement('span'); lab.className='fg-cd-lab'; lab.textContent=f.label;
      if(f.hint){ var h=document.createElement('span'); h.className='fg-cd-hint'; h.textContent=f.hint; lab.appendChild(h); }
      row.appendChild(eye); row.appendChild(lab); panel.appendChild(row);
      eye.addEventListener('click', function(e){ e.stopPropagation(); setFeatureHidden(f.key, !isFeatureHidden(f.key)); paint(); });
      rows.push({f:f,row:row,eye:eye});
    });
    var foot=document.createElement('div'); foot.className='fg-cd-foot';
    var all=document.createElement('button'); all.type='button'; all.className='fg-cd-all'; all.textContent='Show all';
    all.addEventListener('click', function(e){ e.stopPropagation(); showAll(); paint(); });
    foot.appendChild(all); panel.appendChild(foot);
    function paint(){
      rows.forEach(function(x){
        var off=isFeatureHidden(x.f.key);
        x.eye.innerHTML=eyeIcon(off); x.row.classList.toggle('fg-cd-off', off);
        x.eye.title=off ? 'Never shows on a card: click to show it again' : 'Shows on cards: click to hide it everywhere';
        x.eye.setAttribute('aria-label', x.eye.title);
      });
      all.style.visibility=_hidden.length ? 'visible' : 'hidden';
    }
    paint();
    pop.appendChild(panel); document.body.appendChild(pop);
    pop.addEventListener('mousedown', function(e){ if(e.target===pop) closePopup(); });
    panel.querySelector('.fg-cd-x').addEventListener('click', function(e){ e.stopPropagation(); closePopup(); });
    document.addEventListener('keydown', onKey, true);
  }

  paintStyle();
  window.T2TCardDisplay={ FEATURES:FEATURES, isFeatureHidden:isFeatureHidden, isHiddenKey:isHiddenKey, setFeatureHidden:setFeatureHidden, showAll:showAll, openPopup:openPopup };
})();
