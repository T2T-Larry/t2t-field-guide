/* ============================================================
   linked-words.js -- T2T Field Guide
   Larry, Nov 12 2026: "a linked word would be in italics ... clicking it travels to the home explanation or definition."
   One tree: every TOPIC has one HOME header; the rest are italic LINKS (ideas.subject_italic + card_links).
   This file finds those homes once, then in card text on the Story / Vision boards italicizes the FIRST mention of a home's
   name on each card. Clicking the word uses the same LINK jump (T2TLinks.jump) so the RETURN arrow works exactly as it does
   for the colored arrows. Display only: card text in the database is never changed.
   Skipped: names under 4 letters, words in SKIP (NEW is a word, not a TOPIC), the card that IS the home.
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
            out[k]={id:x.id,name:n};
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
    s.textContent='.fg-lw{pointer-events:auto;font-style:italic;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}.fg-lw:hover{text-decoration:underline}';
    document.head.appendChild(s);
  }

  function mark(el, cardId){
    if(el.querySelector('.fg-lw') || el.getAttribute('data-lw')) return;
    el.setAttribute('data-lw','1');
    if(el.childNodes.length!==1 || el.firstChild.nodeType!==3) return;
    var txt=el.firstChild.nodeValue, m=rx.exec(txt);
    if(!m) return;
    var home=homes[m[2].toUpperCase()];
    if(!home || String(home.id)===String(cardId)) return;
    var start=m.index+m[1].length, end=start+m[2].length;
    var span=document.createElement('span'); span.className='fg-lw'; span.textContent=txt.slice(start,end);
    span.title='Go to the home of '+home.name;
    ['mousedown','dblclick'].forEach(function(ev){ span.addEventListener(ev,function(e){ e.stopPropagation(); }); });
    span.addEventListener('click',function(e){
      e.stopPropagation();
      if(window.T2TLinks) T2TLinks.jump({slot:1, topicId:home.id, kind:'IDEA', fromKind:'SB', cardId:cardId, glowHeaderId:home.id});
    });
    var f=document.createDocumentFragment();
    f.appendChild(document.createTextNode(txt.slice(0,start))); f.appendChild(span); f.appendChild(document.createTextNode(txt.slice(end)));
    el.replaceChild(f, el.firstChild);
  }

  async function run(){
    timer=null;
    if(!ON) return;
    var tiles=document.querySelectorAll('.sc-tile[data-idea-id]:not([data-lw-done])');
    if(!tiles.length) return;
    await load();
    if(!rx) return;
    style();
    Array.prototype.forEach.call(tiles,function(t){
      t.setAttribute('data-lw-done','1');
      var id=t.getAttribute('data-idea-id');
      Array.prototype.some.call(t.querySelectorAll('p, .sc-tile-caption'),function(el){ mark(el,id); return el.querySelector('.fg-lw'); });
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
