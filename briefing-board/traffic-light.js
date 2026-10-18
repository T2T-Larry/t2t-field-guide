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

  function injectStyle(){
    if(document.getElementById('fg-traffic-light-style')) return;
    var st=document.createElement('style'); st.id='fg-traffic-light-style';
    st.textContent=''
      // Card face: one small round light, sitting above the dates on the right edge (below the assignee's initials).
      +'.bb-card .bb-light{display:inline-block;width:11px;height:11px;border-radius:50%;margin:0 0 3px;border:1px solid rgba(0,0,0,.35);box-sizing:border-box;flex:0 0 auto}'
      // Card back: title row (same look as the option titles) and three dots with their words.
      +'.fg-back-light{margin:0 0 8px}'
      +'.fg-back-light-dots{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
      +'.fg-light-btn{display:inline-flex;align-items:center;gap:5px;padding:2px 7px 2px 4px;background:transparent;border:1.5px solid transparent;border-radius:12px;cursor:pointer;color:var(--bb-ink);font-family:inherit;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.5px;line-height:1}'
      +'.fg-light-btn:hover{background:var(--bb-bg)}'
      +'.fg-light-btn .fg-light-dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.35);box-sizing:border-box;opacity:.35}'
      +'.fg-light-btn.fg-light-on{border-color:var(--bb-ink)}'
      +'.fg-light-btn.fg-light-on .fg-light-dot{opacity:1}';
    document.head.appendChild(st);
  }

  function hiddenOnFront(c){
    return !!(window.FGCardBackOptions && FGCardBackOptions.isBackOnly(c && c.frontHidden, 'light'));
  }

  function frontHTML(c){
    if(!c || c.col==='done' || hiddenOnFront(c)) return '';
    var L=LIGHTS[norm(c.light)];
    return '<span class="bb-light" style="background:'+L.color+'" title="'+L.tip+'"></span>';
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
      return '<button type="button" class="fg-light-btn" data-light="'+k+'" title="'+LIGHTS[k].tip+'"><span class="fg-light-dot" style="background:'+LIGHTS[k].color+'"></span><span>'+LIGHTS[k].word+'</span></button>';
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
      b.addEventListener('click', async function(e){
        e.stopPropagation();
        var c=cfg.getCard && cfg.getCard(); if(!c) return;
        var next=b.getAttribute('data-light');
        var prev=norm(c.light);
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
        if(cfg.onChange) cfg.onChange(c);
      });
    });
    _wired={wrap:wrap, paintEye:paintEye};
    paintEye();
  }

  function paintBack(c){
    if(!_wired || !_wired.wrap || !document.body.contains(_wired.wrap)) return;
    var cur=norm(c && c.light);
    Array.prototype.forEach.call(_wired.wrap.querySelectorAll('.fg-light-btn'), function(b){
      b.classList.toggle('fg-light-on', b.getAttribute('data-light')===cur);
    });
    _wired.paintEye();
  }

  injectStyle();
  window.T2TTrafficLight = { frontHTML: frontHTML, wireBack: wireBack, paintBack: paintBack, norm: norm };
})();
