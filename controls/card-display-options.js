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
    { key:'notes',    label:'Notes pencil',  keys:['notes'],           hint:'The pencil that says a card has notes' },
    { key:'library',  label:'Library ribbon', keys:['library'],        hint:'The small ribbon for a Library shelf' }
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
  // Nov 26 2026 (Larry: "One card code"): it opens in the same popup, at the same standard size inside the card, as every other feature (controls/gear-hub.js).
  var LEVEL=4;      // one layer above the Gear's Utilities popup, which holds the button that opens it
  var openBox=null;
  function eyeIcon(off){
    var ic=window.FGCardBackOptions && FGCardBackOptions.eyeIcons;
    return ic ? (off ? ic.slash : ic.open) : (off ? '⊘' : '◉');
  }
  function injectStyle(){
    if(document.getElementById('fg-card-display-pop-style')) return;
    var st=document.createElement('style'); st.id='fg-card-display-pop-style';
    st.textContent=''
      +'.fg-cd-list{column-width:98px;column-gap:6px}'
      +'.fg-cd-row{display:flex;align-items:center;gap:3px;min-height:calc(20px * var(--fg-text-scale,1));break-inside:avoid;line-height:1.1}'
      +'.fg-cd-eye{flex:0 0 auto;width:20px;height:18px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:4px;color:inherit;cursor:pointer}'
      +'.fg-cd-eye:hover{background:rgba(0,0,0,.07)}'
      +'.fg-cd-eye svg{width:14px;height:14px}'
      +'.fg-cd-lab{flex:1 1 auto;min-width:0;font-weight:700;font-size:calc(10.5px * var(--fg-text-scale,1))}'
      +'.fg-cd-row.fg-cd-off .fg-cd-lab{opacity:.5;text-decoration:line-through}'
      +'.fg-cd-all{background:transparent;border:1px solid var(--bb-accent,#8a7a4a);border-radius:6px;color:inherit;cursor:pointer;padding:1px 8px;font:700 calc(10.5px * var(--fg-text-scale,1)) Georgia,serif}';
    document.head.appendChild(st);
  }
  function fill(box){
    openBox=box;
    var list=document.createElement('div'); list.className='fg-cd-list'; list.title='For every card. A slashed eye means that feature never shows on a card, front or back'; box.appendChild(list);
    var rows=[];
    FEATURES.forEach(function(f){
      var row=document.createElement('div'); row.className='fg-cd-row'; row.title=f.hint||f.label;
      var eye=document.createElement('button'); eye.type='button'; eye.className='fg-cd-eye';
      var lab=document.createElement('span'); lab.className='fg-cd-lab'; lab.textContent=f.label;
      row.appendChild(eye); row.appendChild(lab); list.appendChild(row);
      eye.addEventListener('click', function(e){ e.stopPropagation(); setFeatureHidden(f.key, !isFeatureHidden(f.key)); paint(); });
      rows.push({f:f,row:row,eye:eye});
    });
    var foot=document.createElement('div'); foot.className='fg-cd-row';
    var all=document.createElement('button'); all.type='button'; all.className='fg-cd-all'; all.textContent='Show all';
    all.addEventListener('click', function(e){ e.stopPropagation(); showAll(); paint(); });
    foot.appendChild(all); list.appendChild(foot);
    boardSwitches(box);
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
  }
  // Two board-wide views that also belong to what shows on a card (Nov 27 2026, from the retired SCREEN LOOK). ON / OFF rows under a line, below the eyes.
  function boardSwitches(box){
    var t=window.FGGearBoardTools; if(!t) return;
    var wrap=document.createElement('div'); wrap.style.cssText='border-top:1px solid var(--bb-accent,#8a7a4a);margin-top:4px;padding-top:3px'; box.appendChild(wrap);
    if(window.T2TViewPrefs) t.onoff(wrap, 'Subject-only view', function(){ return T2TViewPrefs.isSubjectOnly(); }, function(on){ T2TViewPrefs.setSubjectOnly(on); repaintCards(); });
    if(window.T2TLinkedWords) t.onoff(wrap, 'Linked words', function(){ return T2TLinkedWords.isOn(); }, function(on){ T2TLinkedWords.set(on); });
  }
  function openPopup(){
    if(!window.FGGearHub || !FGGearHub.showPopup) return;
    if(openBox && openBox.isConnected){ FGGearHub.closeLevel(LEVEL); openBox=null; return; }   // the same button again closes it
    injectStyle();
    FGGearHub.showPopup(LEVEL, 'Gear', 'Card display', fill, null);
  }

  paintStyle();
  // Its button sits in Gear > Utilities (controls/feature-place.js).
  window.T2TCardDisplay={ FEATURES:FEATURES, isFeatureHidden:isFeatureHidden, isHiddenKey:isHiddenKey, setFeatureHidden:setFeatureHidden, showAll:showAll, openPopup:openPopup };
})();
