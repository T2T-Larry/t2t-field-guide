/* ============================================================
   traffic-light.js -- T2T Field Guide - TRAFFIC LIGHT ON TASK CARDS

   Oct 18 2026 (Larry): every task card carries a traffic light.
     RED    = a HANG UP: the task cannot be finished as it is, and the issue is on the card.
     YELLOW = more to do before green is given (the VISION / GOAL / PLAN checklist is under way).
     GREEN  = go. Every task starts green, so an empty light means green.
   The light is set on the card BACK (three dots) with an eyeball beside its title: the eye chooses
   whether the light also shows on the card FRONT, the same slashed-eye every other option uses.

   Storage: task_fields.light ('red' | 'yellow' | 'green' | empty = green), exposed on the briefing_cards view.
   Written straight to task_fields by this file (a narrow write, same as needs_plan), and deliberately NOT part of the
   whole-card save, so a routine board save can never change a card's light by accident.
   Front visibility: key 'light' in the card's back-only list (ideas.front_hidden); not in the list = shows on the front.

   Public surface: window.T2TTrafficLight
     .frontHTML(c)       -> the small light for the card face ('' when the eye is off or the card is done)
     .cycle(c, onChange) -> click on the face light: green, yellow, red, green
     .wireBack(bbw, cfg) -> builds the back control once; cfg = {getCard, getHidden, setHidden, onChange}
     .paintBack(c)       -> shows this card's light on the back (call every time a card back opens)
   ============================================================ */
(function(){
  var LIGHTS = {
    red:    { color:'#c0392b', word:'RED: HANG UP',            tip:'Red: a hang-up. The task cannot be finished as it is.' },
    yellow: { color:'#e0a800', word:'YELLOW: MORE TO DO',      tip:'Yellow: more to do before green is given.' },
    green:  { color:'#2e8b57', word:'GREEN: GO',               tip:'Green: go.' }
  };
  var ORDER = ['red','yellow','green'];

  function norm(v){ return LIGHTS[v] ? v : 'green'; }   // empty or unknown means green
  // Larry, Oct 18 2026: "A hang up is a red light." A card sitting in HANG UPS always shows red, whatever is stored;
  // when it leaves HANG UPS it goes back to its own stored light (green unless it was set otherwise).
  function inHangups(c){ return !!(c && c.col==='hangups'); }
  function effective(c){ return inHangups(c) ? 'red' : norm(c && c.light); }

  // A tiny real traffic light with side hoods (the "four way" look): black body, three round lamps, a hood beside each lamp.
  // Only the current lamp is lit; the other two stay visible but dimmed. One drawing for the card face and the back, so they always match.
  // (Larry, Oct 18 2026: "an actual tiny traffic light symbol"; clicking it changes the light.)
  var DIM = { red:'#7a3a35', yellow:'#7a6a25', green:'#2d6a45' };
  function signalSVG(state, w, h){
    var cy={red:4.6, yellow:12, green:19.4};
    var hoods=ORDER.map(function(k){
      var y=cy[k];
      return '<path d="M6.2 '+(y-3.5)+'H2.4Q2 '+(y+1)+' 6.2 '+(y+3.3)+'Z" fill="#111"/>'
        +'<path d="M13.8 '+(y-3.5)+'H17.6Q18 '+(y+1)+' 13.8 '+(y+3.3)+'Z" fill="#111"/>';
    }).join('');
    var lamps=ORDER.map(function(k){
      var lit = k===state;
      return '<circle cx="10" cy="'+cy[k]+'" r="2.8" fill="'+(lit?LIGHTS[k].color:DIM[k])+'"'+(lit?' stroke="#fff" stroke-opacity=".7" stroke-width=".6"':' fill-opacity=".75"')+'/>';
    }).join('');
    return '<svg class="fg-signal" width="'+w+'" height="'+h+'" viewBox="0 0 20 24" aria-hidden="true">'
      +hoods+'<rect x="5.6" y=".3" width="8.8" height="23.4" rx="1.2" fill="#111"/>'+lamps+'</svg>';
  }

  // Set a card's light (null/empty = green) and save it straight to task_fields; undo on a failed save.
  async function setLight(c, next, onChange){
    if(inHangups(c)) return;   // a hang-up is red; move the card out of HANG UPS to change its light
    var prev=norm(c.light);
    next=norm(next);
    if(next===prev) return;
    c.light = next==='green' ? '' : next;
    paintBack(c);
    try{
      var sb=window.T2T && window.T2T.sb;
      if(sb){
        var res=await sb.from('task_fields').update({light: next==='green' ? null : next}).eq('idea_id', c.id);
        if(res.error){ console.error('Traffic light save failed', res.error); c.light = prev==='green' ? '' : prev; paintBack(c); }
      }
    }catch(err){ console.error('Traffic light save failed', err); c.light = prev==='green' ? '' : prev; paintBack(c); }
    if(onChange) onChange(c);
  }
  // One click on the light moves it on: green, then yellow, then red, then back to green.
  var CYCLE = { green:'yellow', yellow:'red', red:'green' };
  function cycle(c, onChange){ return setLight(c, CYCLE[norm(c && c.light)], onChange); }   // (does nothing in HANG UPS, where the light is always red)

  function injectStyle(){
    if(document.getElementById('fg-traffic-light-style')) return;
    var st=document.createElement('style'); st.id='fg-traffic-light-style';
    st.textContent=''
      // Card face: the tiny signal sits above the dates on the right edge (below the assignee's initials). Clicking it changes the light.
      +'.bb-card .bb-light{display:inline-block;line-height:0;margin:0 0 3px;flex:0 0 auto;cursor:pointer}'
      +'.bb-card .bb-light svg{display:block}'
      // Card back: title row (same look as the option titles) and the three signals with their words.
      +'.fg-back-light{margin:0 0 8px}'
      +'.fg-back-light-dots{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
      +'.fg-light-btn{display:inline-flex;align-items:center;gap:5px;padding:2px 7px 2px 4px;background:transparent;border:1.5px solid transparent;border-radius:12px;cursor:pointer;color:var(--bb-ink);font-family:inherit;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;line-height:1}'
      +'.fg-light-btn:hover{background:var(--bb-bg)}'
      +'.fg-light-btn svg{display:block;opacity:.55}'
      +'.fg-light-btn.fg-light-on{border-color:var(--bb-ink)}'
      +'.fg-light-btn.fg-light-on svg{opacity:1}';
    document.head.appendChild(st);
  }

  function hiddenOnFront(c){
    return !!(window.FGCardBackOptions && FGCardBackOptions.isBackOnly(c && c.frontHidden, 'light'));
  }

  function frontHTML(c){
    if(!c || c.col==='done' || hiddenOnFront(c)) return '';
    var L=LIGHTS[effective(c)];
    return '<span class="bb-light" title="'+(inHangups(c) ? 'Red: a hang-up. The light is red while the card is in HANG UPS.' : L.tip+' Click to change.')+'"'+'>'+signalSVG(effective(c), 16, 19)+'</span>';
  }

  var _wired=null;   // the back control, built once per card back

  function wireBack(bbw, cfg){
    if(!bbw || bbw.querySelector('.fg-back-light')) return;
    injectStyle();
    var icons=(window.FGCardBackOptions && FGCardBackOptions.eyeIcons) || {open:'o', slash:'x'};
    var wrap=document.createElement('div'); wrap.className='fg-back-light'; wrap.id='bb-d-light-wrap';
    var title='<div class="fg-back-opt-title"><span>Traffic light</span>'
      +'<button type="button" class="fg-back-eye" id="bb-d-light-eye"></button></div>';
    var dots='<div class="fg-back-light-dots">'+ORDER.map(function(k){
      return '<button type="button" class="fg-light-btn" data-light="'+k+'" title="'+LIGHTS[k].tip+'">'+signalSVG(k, 20, 24)+'<span>'+LIGHTS[k].word+'</span></button>';
    }).join('')+'</div>';
    wrap.innerHTML=title+dots;
    var anchor=bbw.querySelector('.fg-back-selected') || (bbw.querySelector('#bb-d-needs-plan-wrap'));
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor);
    else bbw.appendChild(wrap);

    var eye=wrap.querySelector('#bb-d-light-eye');
    function paintEye(){
      var hid=(cfg.getHidden && cfg.getHidden())||[];
      var off=hid.indexOf('light')>=0;
      eye.innerHTML = off ? icons.slash : icons.open;
      eye.classList.toggle('fg-eye-off', off);
      eye.title = off ? 'Back only — click to show the light on the front' : 'Shows on the front — click to show on the back only';
      eye.setAttribute('aria-label', eye.title);
    }
    eye.addEventListener('click', function(e){
      e.stopPropagation();
      var cur=((cfg.getHidden && cfg.getHidden())||[]).slice(), i=cur.indexOf('light');
      if(i>=0) cur.splice(i,1); else cur.push('light');
      cfg.setHidden(cur);
      paintEye();
    });

    Array.prototype.forEach.call(wrap.querySelectorAll('.fg-light-btn'), function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        var c=cfg.getCard && cfg.getCard(); if(!c) return;
        setLight(c, b.getAttribute('data-light'), cfg.onChange);
      });
    });
    _wired={wrap:wrap, paintEye:paintEye};
    paintEye();
  }

  function paintBack(c){
    if(!_wired || !_wired.wrap || !document.body.contains(_wired.wrap)) return;
    var cur=effective(c);
    Array.prototype.forEach.call(_wired.wrap.querySelectorAll('.fg-light-btn'), function(b){
      b.classList.toggle('fg-light-on', b.getAttribute('data-light')===cur);
    });
    _wired.paintEye();
  }

  injectStyle();
  window.T2TTrafficLight = { effective: effective, frontHTML: frontHTML, wireBack: wireBack, paintBack: paintBack, cycle: cycle, setLight: setLight, norm: norm };
})();
