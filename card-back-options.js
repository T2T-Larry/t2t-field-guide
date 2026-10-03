/* ============================================================
   card-back-options.js -- T2T Field Guide - UNIVERSAL CARD BACK: OPTIONS

   Oct 3 2026 -- Larry: the BB card's always-on checkbox list is bulky.
   "What if there is a popup button called OPTIONS which might be
   different for each type of board? ... the universal options along
   the bottom of the card and the unique ones in the body or the
   options popup." Also: a checked option stays visible on the back,
   and each one gets a slashed-eye toggle for front vs back-only
   (hover tooltip, no words on the card).

   How it works (nothing is rebuilt -- it re-homes what is already there):
   - Every back already builds its additions as .bb-addition wrappers
     (a real checkbox + a .bb-addition-body). Ids and change-handlers
     are untouched, so all existing saving/showing keeps working.
   - optionsRegion() moves each opened body into ONE "selected items"
     field on the back (shown only while its checkbox is checked, with
     its own small title), and parks the real checkboxes out of sight.
   - A dashed (+) OPTIONS button joins the bottom icon row. Its popup
     lists the options as proxy rows (a click flips the real checkbox
     and fires its normal change event). Two groups: universal options
     first, then the ones that belong to this board type.
   - The slashed eye (front visibility) appears only on options that
     actually draw something on the card face (cfg.frontKeys), and only
     when the card supplies getHidden/setHidden -- so no back ever
     shows a control that does nothing.

   Each board type supplies a short config (cfg). Adding a board type =
   one more config, no new back. Shared look lives in card-back-style.js.
   ============================================================ */

(function(){
  var EYE_OPEN='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_SLASH='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';

  function injectStyle(){
    if(document.getElementById('fg-cardback-options-style')) return;
    var st=document.createElement('style');
    st.id='fg-cardback-options-style';
    st.textContent=''
      // Selected-items field: the opened bodies, full width, each with a small title row.
      +'.fg-back-selected{display:flex;flex-direction:column;width:100%;min-width:0}'
      +'.fg-back-selected .bb-addition-body{margin:0 0 8px;padding:0 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      +'.fg-back-selected .bb-addition-body[data-fg-title]::before{content:attr(data-fg-title);display:block;font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink);margin-bottom:3px;padding-right:26px}'
      +'.fg-back-selected .bb-addition-body{position:relative}'
      // Slashed eye rides the right edge of its block's title row.
      +'.fg-back-eye{position:absolute;top:-3px;right:0;width:22px;height:22px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:4px;color:var(--bb-ink);cursor:pointer;opacity:.85}'
      +'.fg-back-eye:hover{opacity:1;background:var(--bb-bg)}'
      +'.fg-back-eye.fg-eye-off{opacity:.6}'
      // The real checkboxes live here, out of sight; the popup rows drive them.
      +'.fg-back-optstore{display:none!important}'
      // OPTIONS button: the dashed (+) -- the standard "add something here" symbol, no words.
      +'.fg-back-3x5 .bb-action-row .fg-opt-btn{margin-right:auto;flex:0 0 auto;width:24px;height:24px;min-width:0;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed var(--bb-ink);border-radius:50%;color:var(--bb-ink);font-size:calc(15px * var(--fg-text-scale,1));line-height:1;cursor:pointer;font-weight:700}'
      +'.fg-back-3x5 .bb-action-row .fg-opt-btn:hover,.fg-back-3x5 .bb-action-row .fg-opt-btn.fg-on{background:var(--bb-bg)}'
      // Active-count dot: shows how many options are on without opening the popup.
      +'.fg-opt-btn{position:relative}'
      +'.fg-opt-count{position:absolute;top:-6px;right:-6px;min-width:13px;height:13px;padding:0 3px;border-radius:7px;background:var(--bb-ink);color:var(--bb-bg);font-size:calc(9px * var(--fg-text-scale,1));line-height:13px;font-weight:700;text-align:center;box-sizing:border-box}'
      // The popup. Lives on <body> so the card's own scroll area can never clip it.
      +'.fg-opt-pop{position:fixed;z-index:100000;min-width:170px;max-width:240px;max-height:min(60vh,380px);overflow-y:auto;background:#fff;border:2px solid var(--fg-opt-ink,#444);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:4px 0;font-family:Georgia,serif;font-size:calc(13px * var(--fg-text-scale,1));color:var(--fg-opt-ink,#333)}'
      +'.fg-opt-group{font-size:calc(9px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.65;padding:6px 12px 2px}'
      +'.fg-opt-group+.fg-opt-row{margin-top:0}'
      +'.fg-opt-row{display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;user-select:none}'
      +'.fg-opt-row:hover{background:rgba(128,128,128,.14)}'
      +'.fg-opt-box{flex:0 0 auto;width:13px;height:13px;border:1.5px solid currentColor;border-radius:3px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1}'
      +'.fg-opt-row.fg-opt-checked .fg-opt-box::after{content:"\\2713";font-weight:700}'
      +'.fg-opt-sep{height:1px;background:rgba(128,128,128,.35);margin:4px 0}'
      ;
    document.head.appendChild(st);
  }

  // key for an addition wrapper: "bb-d-add-due-wrap" -> "due", "sb-add-flags-wrap" -> "flags".
  function keyOf(w){
    var id=w.id||'';
    var m=id.match(/-add-([a-z]+)-wrap$/);
    return m ? m[1] : id;
  }

  function closePop(){
    var p=document.getElementById('fg-opt-pop'); if(p) p.remove();
    var b=document.querySelectorAll('.fg-opt-btn.fg-on'); Array.prototype.forEach.call(b, function(x){ x.classList.remove('fg-on'); });
  }

  /* cfg:
       universal:  ['flags','due','start',...]  option keys shown under "Every card"
       ownLabel:   'Briefing card' | 'Blue Sky card'  heading for the board's own group
       skip:       wrapper ids that live somewhere else on the back (e.g. under the gear)
       noPopup:    keys driven by another control (BB Notes is the bottom pencil)
       frontKeys:  keys that draw something on the card face (they get the slashed eye)
       getHidden(): array of keys currently back-only        } both required for
       setHidden(arr): persist the new back-only key list    } the eye to appear
       actionRow:  the .bb-action-row element that gets the OPTIONS button
     returns {region, refresh} or null                                       */
  function optionsRegion(bbw, cfg){
    cfg=cfg||{};
    if(!bbw || bbw.querySelector('.fg-back-selected')) return null;
    injectStyle();
    var skip=cfg.skip||[], noPopup=cfg.noPopup||[], universal=cfg.universal||[], frontKeys=cfg.frontKeys||[];
    var adds=Array.prototype.slice.call(bbw.querySelectorAll('.bb-addition')).filter(function(w){ return skip.indexOf(w.id)<0; });
    if(!adds.length) return null;

    var selected=document.createElement('div'); selected.className='fg-back-selected';
    var store=document.createElement('div'); store.className='fg-back-optstore';
    adds[0].parentNode.insertBefore(selected, adds[0]);
    selected.parentNode.insertBefore(store, selected.nextSibling);

    var canEye = typeof cfg.getHidden==='function' && typeof cfg.setHidden==='function';
    var items=[];
    adds.forEach(function(w){
      var key=keyOf(w);
      var cb=w.querySelector('input[type=checkbox]');
      var eb=w.querySelector('.bb-addition-eyebrow');
      var body=w.querySelector('.bb-addition-body');
      var label=eb ? eb.textContent : key;
      if(body){
        body.setAttribute('data-fg-title', label);
        selected.appendChild(body);
        if(canEye && frontKeys.indexOf(key)>=0){
          var eye=document.createElement('button');
          eye.type='button'; eye.className='fg-back-eye'; eye.setAttribute('data-fg-key', key);
          body.insertBefore(eye, body.firstChild);
          eye.addEventListener('click', function(e){
            e.stopPropagation();
            var cur=(cfg.getHidden()||[]).slice(), i=cur.indexOf(key);
            if(i>=0) cur.splice(i,1); else cur.push(key);
            cfg.setHidden(cur);
            paintEyes();
          });
        }
      }
      store.appendChild(w);
      items.push({key:key, cb:cb, label:label, wrap:w});
    });

    function paintEyes(){
      var hid=canEye ? (cfg.getHidden()||[]) : [];
      Array.prototype.forEach.call(selected.querySelectorAll('.fg-back-eye'), function(eye){
        var off=hid.indexOf(eye.getAttribute('data-fg-key'))>=0;
        eye.innerHTML = off ? EYE_SLASH : EYE_OPEN;
        eye.classList.toggle('fg-eye-off', off);
        eye.title = off ? 'Back only — click to show on the front' : 'Shows on the front — click to show on the back only';
        eye.setAttribute('aria-label', eye.title);
      });
    }
    paintEyes();

    // OPTIONS button in the bottom icon row.
    var btn=null, countEl=null;
    var row=cfg.actionRow || bbw.querySelector('.bb-action-row') || (bbw.parentNode && bbw.parentNode.querySelector('.bb-action-row'));
    if(row){
      btn=document.createElement('button');
      btn.type='button'; btn.className='bb-icon-btn fg-opt-btn'; btn.id='fg-opt-btn-'+Math.random().toString(36).slice(2,7);
      btn.title='Options — add something to this card'; btn.setAttribute('aria-label','Options');
      btn.innerHTML='+<span class="fg-opt-count" style="display:none"></span>';
      countEl=btn.querySelector('.fg-opt-count');
      row.insertBefore(btn, row.firstChild);
      btn.addEventListener('click', function(e){ e.stopPropagation(); togglePop(); });
    }

    function refresh(){
      var n=items.filter(function(it){ return it.cb && it.cb.checked && noPopup.indexOf(it.key)<0; }).length;
      if(countEl){ countEl.textContent=String(n); countEl.style.display=n?'':'none'; }
      paintEyes();
    }
    items.forEach(function(it){ if(it.cb) it.cb.addEventListener('change', refresh); });
    refresh();

    function togglePop(){
      if(document.getElementById('fg-opt-pop')){ closePop(); return; }
      closePop();
      var pop=document.createElement('div'); pop.id='fg-opt-pop'; pop.className='fg-opt-pop';
      var card=btn && btn.closest('.fg-back-3x5');
      if(card){ var cs=getComputedStyle(card); pop.style.setProperty('--fg-opt-ink', cs.getPropertyValue('--bb-ink')||'#333'); }
      pop.addEventListener('click', function(e){ e.stopPropagation(); });
      function group(title, list){
        if(!list.length) return;
        var g=document.createElement('div'); g.className='fg-opt-group'; g.textContent=title; pop.appendChild(g);
        list.forEach(function(it){
          var r=document.createElement('div'); r.className='fg-opt-row'+((it.cb&&it.cb.checked)?' fg-opt-checked':'');
          r.innerHTML='<span class="fg-opt-box"></span><span></span>';
          r.lastChild.textContent=it.label;
          r.addEventListener('click', function(e){
            e.stopPropagation();
            if(!it.cb) return;
            it.cb.checked=!it.cb.checked;
            it.cb.dispatchEvent(new Event('change',{bubbles:true}));
            r.classList.toggle('fg-opt-checked', it.cb.checked);
            refresh();
          });
          pop.appendChild(r);
        });
      }
      var shown=items.filter(function(it){ return noPopup.indexOf(it.key)<0 && it.wrap.style.display!=='none'; });
      var uni=shown.filter(function(it){ return universal.indexOf(it.key)>=0; });
      var own=shown.filter(function(it){ return universal.indexOf(it.key)<0; });
      group('Every card', uni);
      if(uni.length && own.length){ var sep=document.createElement('div'); sep.className='fg-opt-sep'; pop.appendChild(sep); }
      group(cfg.ownLabel||'This card type', own);
      document.body.appendChild(pop);
      var r=btn.getBoundingClientRect(), pr=pop.getBoundingClientRect();
      var left=Math.min(Math.max(8, r.left), window.innerWidth-pr.width-8);
      var top=r.top-pr.height-6; if(top<8) top=Math.min(r.bottom+6, window.innerHeight-pr.height-8);
      pop.style.left=left+'px'; pop.style.top=top+'px';
      btn.classList.add('fg-on');
      setTimeout(function(){ document.addEventListener('click', function c(){ closePop(); document.removeEventListener('click', c); }); }, 0);
    }

    return {region:selected, refresh:refresh, closePop:closePop};
  }

  // Front-face helper for the boards: is this option set to back-only on this card?
  // hidden may be an array or the stored comma-separated string.
  function isBackOnly(hidden, key){
    if(!hidden) return false;
    var arr = Array.isArray(hidden) ? hidden : String(hidden).split(',');
    return arr.indexOf(key)>=0;
  }
  function parseHidden(str){
    return String(str||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  }

  injectStyle();
  window.FGCardBackOptions = { optionsRegion: optionsRegion, isBackOnly: isBackOnly, parseHidden: parseHidden, closePop: closePop };
})();
