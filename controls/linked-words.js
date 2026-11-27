/* ============================================================
   linked-words.js -- T2T Field Guide
   Larry, Nov 12 2026: "a linked word would be in italics ... clicking it travels to the home explanation or definition."
   One tree: every TOPIC has one HOME header; the rest are italic LINKS (ideas.subject_italic + card_links).
   This file finds those homes once, then in card text on the Story / Vision boards italicizes the FIRST mention of a home's
   name on each card. Clicking the word uses the same LINK jump (T2TLinks.jump) so the RETURN arrow works exactly as it does
   for the colored arrows. Display only: card text in the database is never changed.
   Skipped: names under 4 letters, words in SKIP (NEW is a word, not a TOPIC), the card that IS the home.
   Nov 12 2026: hover shows the home's short explanation + "Click for more." (Hover Bubble); also marks words on Briefing Board cards (.bb-card).
   Nov 14 2026 (Larry, KEEP): a PAPERCLIP toggle in the hover bubble attaches / unattaches the word, just on that card. Unattached = plain look, no travel;
   hover it again to clip it back on. Saved in public.unattached_words (shared, one row per card + home), so it lasts on every device.
   Nov 14 2026 (Larry, KEEP): a header with nothing inside it is a hover DEFINITION -- subject = the word, contents = the definition. Empty = hover only
   (no "Click for more", no trip); add anything under it and it is a full link again.
   Nov 27 2026 (Larry approved the simpler Gear): linked words follow the LINK feature. A card with Link switched off shows plain text; there is no screen switch.
   ============================================================ */
(function(){
  var SKIP={ 'NEW':1, 'IDEA':1, 'IDEAS':1, 'TRASH':1 };
  var homes=null, loading=null, rx=null, timer=null, off=null, offLoading=null, noLink=null, noLinkLoading=null;
  function sb(){ return (window.T2T && window.T2T.sb) || null; }
  function esc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function nameOf(r){ return String(r.subject||r.text_content||r.idea_text||'').split('\n')[0].trim(); }

  function clip(t){ t=String(t||'').replace(/\s+/g,' ').trim(); return t.length>170 ? t.slice(0,170).replace(/\s+\S*$/,'')+'\u2026' : t; }
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
            out[k]={id:x.id,name:n,desc:clip(x.subject? String(x.text_content||x.idea_text||'') : String(x.idea_text||''))};
          });
        }
        // Nov 14 2026 (Larry, KEEP): a header with nothing inside it is a hover DEFINITION. Its SUBJECT is the word, its CONTENTS the definition.
        // Any header that carries a definition becomes a word the same way a link target does (a real link, with its own home, still wins).
        var from2=0;
        for(;;){
          var dr=await c.from('ideas').select('id,subject,text_content,idea_text,content_type').eq('content_type','header').or('subject.not.is.null,idea_text.not.is.null').range(from2,from2+999);
          if(dr.error||!dr.data) break;
          dr.data.forEach(function(x){
            var n=nameOf(x), k=n.toUpperCase();
            if(n.length<4 || /[?:]/.test(n) || SKIP[k] || out[k]) return;
            var d=clip(x.subject? String(x.text_content||x.idea_text||'') : String(x.idea_text||''));
            if(d) out[k]={id:x.id,name:n,desc:d};
          });
          if(dr.data.length<1000) break; from2+=1000;
        }
        // A home's short explanation is its first text card (or the header's own words when it has a subject).
        var byId={}; Object.keys(out).forEach(function(k){ byId[out[k].id]=out[k]; });
        var hid=Object.keys(byId).filter(function(i){ return !byId[i].desc; });
        for(var q=0;q<hid.length;q+=100){
          var kids=await c.from('ideas').select('cluster_id,text_content,sort_order').in('cluster_id',hid.slice(q,q+100)).eq('content_type','text').order('sort_order',{ascending:true});
          (kids.data||[]).forEach(function(kd){ var h=byId[kd.cluster_id], t=clip(kd.text_content); if(h && !h.desc && t) h.desc=t; });
        }
        // EMPTY homes (nothing inside them) are pure definitions: hover only, no "Click for more", no trip. The moment something is added
        // under one, it is a full link again with no switch to flip. If the check fails, nothing is treated as empty (the old behavior).
        var allIds=Object.keys(out).map(function(k){ return out[k].id; }), hasKids={};
        for(var z=0;z<allIds.length;z+=100){
          var chunk=allIds.slice(z,z+100), from3=0;
          for(;;){
            var kr=await c.from('ideas').select('cluster_id').in('cluster_id',chunk).range(from3,from3+999);
            if(kr.error) throw kr.error;
            (kr.data||[]).forEach(function(kd){ hasKids[kd.cluster_id]=1; });
            if(!kr.data || kr.data.length<1000) break; from3+=1000;
          }
        }
        Object.keys(out).forEach(function(k){ out[k].empty=!hasKids[out[k].id]; });
        // Nov 14 2026 (Larry: "A header without a content does not qualify as a hover definition"): nothing inside AND no definition of its own = nothing to
        // show, so it is not a word at all. (A header with things inside still works as a link even without a definition.)
        Object.keys(out).forEach(function(k){ if(out[k].empty && !out[k].desc) delete out[k]; });
      }catch(e){ console.error('Linked words: could not read homes', e); return null; }
      homes=out;
      var names=Object.keys(out).sort(function(a,b){ return b.length-a.length; });
      rx=names.length ? new RegExp('(^|[^A-Za-z0-9])('+names.map(esc).join('|')+')(?![A-Za-z0-9])','i') : null;
      return homes;
    })();
    return loading;
  }


  // Nov 14 2026: which words are unclipped on which card (card id + '|' + home id).
  async function loadOff(){
    if(off) return off;
    if(offLoading) return offLoading;
    offLoading=(async function(){
      var c=sb(), o={};
      if(c){
        try{
          var from=0;
          for(;;){
            var r=await c.from('unattached_words').select('card_id,home_id').range(from,from+999);
            if(r.error||!r.data) break;
            r.data.forEach(function(x){ o[x.card_id+'|'+x.home_id]=1; });
            if(r.data.length<1000) break; from+=1000;
          }
        }catch(e){ console.error('Linked words: could not read unattached words', e); }
      }
      off=o; return off;
    })();
    return offLoading;
  }
  // The cards whose LINK feature is switched off (the 'off-links' word in ideas.features, controls/card-options-list.js).
  function linkOff(features){ return (','+String(features||'')+',').indexOf(',off-links,')>=0; }
  async function loadNoLink(){
    if(noLink) return noLink;
    if(noLinkLoading) return noLinkLoading;
    noLinkLoading=(async function(){
      var c=sb(), o={};
      if(c){
        try{
          var from=0;
          for(;;){
            var r=await c.from('ideas').select('id,features').ilike('features','%off-links%').range(from,from+999);
            if(r.error||!r.data) break;
            r.data.forEach(function(x){ if(linkOff(x.features)) o[x.id]=1; });
            if(r.data.length<1000) break; from+=1000;
          }
        }catch(e){ console.error('Linked words: could not read which cards have Link off', e); }
      }
      noLink=o; return noLink;
    })();
    return noLinkLoading;
  }
  function isOff(cardId, home){ return !!(off && off[cardId+'|'+home.id]); }
  async function setAttached(cardId, home, attached){
    var k=cardId+'|'+home.id, c=sb();
    if(!off) off={};
    if(attached) delete off[k]; else off[k]=1;
    if(!c) return;
    try{
      var r = attached
        ? await c.from('unattached_words').delete().eq('card_id',cardId).eq('home_id',home.id)
        : await c.from('unattached_words').upsert({card_id:cardId, home_id:home.id},{onConflict:'card_id,home_id'});
      if(r && r.error) throw r.error;
    }catch(e){
      console.error('Linked words: could not save the paperclip', e);
      if(attached) off[k]=1; else delete off[k];   // put it back so the screen tells the truth
    }
  }
  var CLIP='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.4 11.1l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8"/></svg>';

  function style(){
    if(document.getElementById('fg-lw-style')) return;
    var s=document.createElement('style'); s.id='fg-lw-style';
    s.textContent='#fg-hb{position:fixed;z-index:9999;max-width:260px;padding:8px 11px;border-radius:8px;background:#2b2b2b;color:#fff;font:13px/1.35 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3)}#fg-hb b{font-weight:700}#fg-hb i{opacity:.75}'+
      '#fg-hb .fg-clip{display:flex;align-items:center;gap:6px;margin-top:7px;padding:3px 8px;border:1px solid rgba(255,255,255,.35);border-radius:6px;background:transparent;color:#fff;font:12px system-ui,sans-serif;cursor:pointer}#fg-hb .fg-clip:hover{background:rgba(255,255,255,.15)}#fg-hb .fg-clip.is-off{opacity:.85}#fg-hb .fg-clip.is-off svg{opacity:.55}'+
      '.fg-lw.fg-lw-off{font-style:normal;cursor:inherit;text-decoration:none}'+
      '.fg-lw{pointer-events:auto;font-style:italic;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}.fg-lw:hover{text-decoration:underline}.fg-lw.fg-lw-def{cursor:help}';
    document.head.appendChild(s);
  }

  // Nov 12 2026 (Larry): hovering a linked word shows its home's short explanation, ending with "Click for more." Gone when the mouse moves off.
  var hbTimer=null, hbHide=null;
  function hideBubble(){ clearTimeout(hbTimer); clearTimeout(hbHide); var b=document.getElementById('fg-hb'); if(b) b.remove(); }
  function hideSoon(){ clearTimeout(hbTimer); clearTimeout(hbHide); hbHide=setTimeout(hideBubble,220); }
  function showBubble(span, home, cardId){
    hideBubble();
    hbTimer=setTimeout(function(){
      var b=document.createElement('div'); b.id='fg-hb';
      var nm=document.createElement('b'); nm.textContent=home.name;
      b.appendChild(nm);
      if(home.desc) b.appendChild(document.createTextNode(' \u2014 '+home.desc));
      var more=document.createElement('i'); more.textContent=' Click for more.';
      var btn=document.createElement('button'); btn.type='button'; btn.className='fg-clip';
      function paint(){
        var o=isOff(cardId,home);
        if(!o && !home.empty) b.insertBefore(more, btn); else if(more.parentNode) more.remove();
        btn.className='fg-clip'+(o?' is-off':'');
        btn.innerHTML=CLIP+'<span>'+(o?'Not attached \u2014 click to attach':'Attached \u2014 click to unattach')+'</span>';
        span.classList.toggle('fg-lw-off', o);
      }
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        setAttached(cardId, home, isOff(cardId,home)).then(paint);
        paint();
      });
      ['mousedown','dblclick'].forEach(function(ev){ b.addEventListener(ev,function(e){ e.stopPropagation(); }); });
      b.addEventListener('mouseenter',function(){ clearTimeout(hbHide); });
      b.addEventListener('mouseleave',hideSoon);
      b.appendChild(btn);
      paint();
      document.body.appendChild(b);
      var r=span.getBoundingClientRect(), w=b.offsetWidth, h=b.offsetHeight;
      var x=Math.max(8,Math.min(window.innerWidth-w-8, r.left)), y=r.bottom+2;
      if(y+h>window.innerHeight-8) y=Math.max(8, r.top-h-2);
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
    var span=document.createElement('span'); span.className='fg-lw'+(isOff(cardId,home)?' fg-lw-off':'')+(home.empty?' fg-lw-def':''); span.textContent=txt.slice(start,end);
    span.addEventListener('mouseenter',function(){ showBubble(span, home, cardId); });
    span.addEventListener('mouseleave',hideSoon);
    ['mousedown','dblclick'].forEach(function(ev){ span.addEventListener(ev,function(e){ if(!isOff(cardId,home) && !home.empty) e.stopPropagation(); }); });
    span.addEventListener('click',function(e){
      if(isOff(cardId,home) || home.empty) return;   // unattached, or a definition with nothing more to see: the card gets the click as usual
      e.stopPropagation(); hideBubble();
      if(window.T2TLinks) T2TLinks.jump({slot:1, topicId:home.id, kind:'IDEA', fromKind:fromKind||'SB', cardId:cardId, glowHeaderId:home.id});
    });
    var f=document.createDocumentFragment();
    f.appendChild(document.createTextNode(txt.slice(0,start))); f.appendChild(span); f.appendChild(document.createTextNode(txt.slice(end)));
    el.replaceChild(f, el.firstChild);
  }

  async function run(){
    timer=null;
    var tiles=document.querySelectorAll('.sc-tile[data-idea-id]:not([data-lw-done]), .bb-card[data-id]:not([data-lw-done])');
    if(!tiles.length) return;
    await load(); await loadOff(); await loadNoLink();
    if(!rx) return;
    style();
    Array.prototype.forEach.call(tiles,function(t){
      t.setAttribute('data-lw-done','1');
      var bb=t.classList.contains('bb-card'), id=t.getAttribute(bb?'data-id':'data-idea-id');
      if(noLink[id]) return;
      Array.prototype.some.call(t.querySelectorAll('p, .sc-tile-caption, .bb-card-subject, .bb-task'),function(el){ mark(el,id,bb?'BB':'SB'); return el.querySelector('.fg-lw'); });
    });
  }

  // Take the marks off and draw them again.
  function redraw(){
    hideBubble();
    document.querySelectorAll('.fg-lw').forEach(function(s){ var p=s.parentNode; s.replaceWith(document.createTextNode(s.textContent)); if(p) p.normalize(); });
    document.querySelectorAll('[data-lw-done]').forEach(function(t){ t.removeAttribute('data-lw-done'); });
    document.querySelectorAll('[data-lw]').forEach(function(t){ t.removeAttribute('data-lw'); });
    run();
  }
  // Link switched on or off: the event carries each changed card's new word list.
  document.addEventListener('fg-features-changed', function(e){
    var words=e.detail && e.detail.words; if(!words || !noLink) return;
    var changed=false;
    Object.keys(words).forEach(function(id){
      var no=linkOff(words[id]); if(!!noLink[id]===no) return;
      if(no) noLink[id]=1; else delete noLink[id];
      changed=true;
    });
    if(changed) redraw();
  });
  try{ new MutationObserver(function(){ if(!timer) timer=setTimeout(run,400); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
  window.T2TLinkedWords={reload:function(){ homes=null; loading=null; rx=null; off=null; offLoading=null; noLink=null; noLinkLoading=null; }};
})();
