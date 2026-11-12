/* ============================================================
   linked-words.js -- T2T Field Guide
   Larry, Nov 12 2026: "a linked word would be in italics ... clicking it travels to the home explanation or definition."
   One tree: every TOPIC has one HOME header; the rest are italic LINKS (ideas.subject_italic + card_links).
   This file finds those homes once, then in card text on the Story / Vision boards italicizes the FIRST mention of a home's
   name on each card. Clicking the word uses the same LINK jump (T2TLinks.jump) so the RETURN arrow works exactly as it does
   for the colored arrows. Display only: card text in the database is never changed.
   Skipped: names under 4 letters, words in SKIP (NEW is a word, not a TOPIC), the card that IS the home.
   Nov 12 2026: hover shows the home's short explanation + "Click for more." (Hover Bubble); also marks words on Briefing Board cards (.bb-card).
   Switch: T2TLinkedWords.set(false) / set(true), remembered on this browser (default on).
   ============================================================ */
(function(){
  var SKIP={ 'NEW':1, 'IDEA':1, 'IDEAS':1, 'TRASH':1 };
  var homes=null, loading=null, rx=null, timer=null, ON=true;
  try{ if(localStorage.getItem('fg-linked-words')==='off') ON=false; }catch(e){}
  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function esc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function nameOf(r){ return String(r.subject||r.text_content||r.idea_text||'').split('\n')[0].trim(); }

  async function load(){
    if(homes) return homes;
    if(loading) return loading;
    loading=(async function(){
      var c=sb(); if(!c) return null;
      var out={};
      try{
        var heads=[], from=0;
        for(;;){
          var r=await c.from('ideas').select('id').eq('content_type','header').eq('subject_italic',true).range(from,from+999);
          if(r.error||!r.data) break;
          heads=heads.concat(r.data.map(function(x){ return x.id; }));
          if(r.data.length<1000) break; from+=1000;
        }
        var targets={};
        for(var i=0;i<heads.length;i+=150){
          var l=await c.from('card_links').select('target_idea_id').in('idea_id',heads.slice(i,i+150)).not('target_idea_id','is',null);
          (l.data||[]).forEach(function(x){ targets[x.target_idea_id]=1; });
        }
        var ids=Object.keys(targets);
        for(var j=0;j<ids.length;j+=150){
          var t=await c.from('ideas').select('id,subject,text_content,idea_text,content_type').in('id',ids.slice(j,j+150));
          (t.data||[]).forEach(function(x){
            if(x.content_type!=='header') return;
            var n=nameOf(x), k=n.toUpperCase();
            if(n.length<4 || SKIP[k] || out[k]) return;
            var d=(x.subject? String(x.text_content||x.idea_text||'') : String(x.idea_text||'')).replace(/\s+/g,' ').trim();
            if(d.length>170) d=d.slice(0,170).replace(/\s+\S*$/,'')+'\u2026';
            out[k]={id:x.id,name:n,desc:d};
          });
        }
      }catch(e){ console.error('Linked words: could not read homes', e); return null; }
      homes=out;
      var names=Object.keys(out).sort(function(a,b){ return b.length-a.length; });
      rx=names.length ? new RegExp('(^|[^A-Za-z0-9])('+names.map(esc).join('|')+')(?![A-Za-z0-9])','i') : null;
      return homes;
    })();
    return loading;
  }

  function style(){
    if(document.getElementById('fg-lw-style')) return;
    var s=document.createElement('style'); s.id='fg-lw-style';
    s.textContent='#fg-hb{position:fixed;z-index:9999;max-width:260px;padding:8px 11px;border-radius:8px;background:#2b2b2b;color:#fff;font:13px/1.35 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:none}#fg-hb b{font-weight:700}#fg-hb i{opacity:.75}'+
      '.fg-lw{pointer-events:auto;font-style:italic;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}.fg-lw:hover{text-decoration:underline}';
    document.head.appendChild(s);
  }

  // Nov 12 2026 (Larry): hovering a linked word shows its home's short explanation, ending with "Click for more." Gone when the mouse moves off.
  var hbTimer=null;
  function hideBubble(){ clearTimeout(hbTimer); var b=document.getElementById('fg-hb'); if(b) b.remove(); }
  function showBubble(span, home){
    hideBubble();
    hbTimer=setTimeout(function(){
      var b=document.createElement('div'); b.id='fg-hb';
      var nm=document.createElement('b'); nm.textContent=home.name;
      b.appendChild(nm);
      if(home.desc) b.appendChild(document.createTextNode(' \u2014 '+home.desc));
      var more=document.createElement('i'); more.textContent=' Click for more.';
      b.appendChild(more);
      document.body.appendChild(b);
      var r=span.getBoundingClientRect(), w=b.offsetWidth, h=b.offsetHeight;
      var x=Math.max(8,Math.min(window.innerWidth-w-8, r.left)), y=r.bottom+6;
      if(y+h>window.innerHeight-8) y=Math.max(8, r.top-h-6);
      b.style.left=x+'px'; b.style.top=y+'px';
    },250);
  }

  function mark(el, cardId, fromKind){
    if(el.querySelector('.fg-lw') || el.getAttribute('data-lw')) return;
    el.setAttribute('data-lw','1');
    if(el.childNodes.length!==1 || el.firstChild.nodeType!==3) return;
    var txt=el.firstChild.nodeValue, m=rx.exec(txt);
    if(!m) return;
    var home=homes[m[2].toUpperCase()];
    if(!home || String(home.id)===String(cardId)) return;
    var start=m.index+m[1].length, end=start+m[2].length;
    var span=document.createElement('span'); span.className='fg-lw'; span.textContent=txt.slice(start,end);
    span.addEventListener('mouseenter',function(){ showBubble(span, home); });
    span.addEventListener('mouseleave',hideBubble);
    ['mousedown','dblclick'].forEach(function(ev){ span.addEventListener(ev,function(e){ e.stopPropagation(); }); });
    span.addEventListener('click',function(e){
      e.stopPropagation(); hideBubble();
      if(window.T2TLinks) T2TLinks.jump({slot:1, topicId:home.id, kind:'IDEA', fromKind:fromKind||'SB', cardId:cardId, glowHeaderId:home.id});
    });
    var f=document.createDocumentFragment();
    f.appendChild(document.createTextNode(txt.slice(0,start))); f.appendChild(span); f.appendChild(document.createTextNode(txt.slice(end)));
    el.replaceChild(f, el.firstChild);
  }

  async function run(){
    timer=null;
    if(!ON) return;
    var tiles=document.querySelectorAll('.sc-tile[data-idea-id]:not([data-lw-done]), .bb-card[data-id]:not([data-lw-done])');
    if(!tiles.length) return;
    await load();
    if(!rx) return;
    style();
    Array.prototype.forEach.call(tiles,function(t){
      t.setAttribute('data-lw-done','1');
      var bb=t.classList.contains('bb-card'), id=t.getAttribute(bb?'data-id':'data-idea-id');
      Array.prototype.some.call(t.querySelectorAll('p, .sc-tile-caption, .bb-card-subject, .bb-task'),function(el){ mark(el,id,bb?'BB':'SB'); return el.querySelector('.fg-lw'); });
    });
  }

  function set(on){
    ON=!!on;
    try{ localStorage.setItem('fg-linked-words', ON?'on':'off'); }catch(e){}
    document.querySelectorAll('.fg-lw').forEach(function(s){ s.replaceWith(document.createTextNode(s.textContent)); });
    document.querySelectorAll('[data-lw-done]').forEach(function(t){ t.removeAttribute('data-lw-done'); });
    document.querySelectorAll('[data-lw]').forEach(function(t){ t.removeAttribute('data-lw'); });
    if(ON) run();
  }
  try{ new MutationObserver(function(){ if(!timer) timer=setTimeout(run,400); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
  window.T2TLinkedWords={isOn:function(){ return ON; }, set:set, reload:function(){ homes=null; loading=null; rx=null; }};
})();
