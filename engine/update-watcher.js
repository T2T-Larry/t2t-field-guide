/* Update watcher -- Oct 18 2026 (Larry: "make it automatic").
   A page keeps running the scripts it loaded when it opened, so a fix pushed to the site
   never reached an open tab until someone hard-refreshed. This quietly re-reads the shared
   script list (engine/page-scripts.js, which carries every file's version) and compares it
   with what this tab loaded. When it has changed:
     - if the traveler is idle (not typing, no clicks or keys for 20 seconds), the page
       reloads itself;
     - otherwise a small "new version ready" bar appears with a Reload button, so nothing
       being typed is ever lost.
   Checks run when the page opens, every 2 minutes, and when the tab comes back into view.

   Oct 28 2026 (Larry: "I like quiet. Feels like magic."): the moment a new version is seen, this
   tab keeps running the old one and quietly downloads only the files that changed into the
   browser's cache. The reload (when idle) then finds almost everything already on hand, so the
   swap is much shorter. Nothing on screen changes while that happens.

   Oct 29 2026 (Larry: "I only like the bar IF the update cannot be completed behind the curtains. If a reset can occur
   invisibly, that is my preference."): the swap now happens by itself only where nobody can see it --
     - the moment a page opens (it is still on its opening screen, nothing typed yet), or
     - while the tab is in the background (hidden), with no card open and nothing being typed.
   Any other time, the small bar appears instead. A page now also compares what it loaded with the newest list the first time it
   checks, instead of treating whatever it finds as already loaded (that is how an old cached page could miss an update). */
(function(){
  if(window.__t2tUpdateWatcher) return;
  window.__t2tUpdateWatcher=true;

  var CHECK_MS=120000, IDLE_MS=20000, LOOP_GUARD_MS=60000;
  var baseline=null, lastActivity=Date.now(), bar=null, waiting=false, checking=false;
  var newText=null, preloadState='none';   // none -> loading -> done

  ['keydown','pointerdown','input','wheel'].forEach(function(ev){
    window.addEventListener(ev, function(){ lastActivity=Date.now(); }, {passive:true, capture:true});
  });

  function fingerprint(){
    return fetch('engine/page-scripts.js?check='+Date.now(), {cache:'no-store'})
      .then(function(r){ return r.ok ? r.text() : null; })
      .catch(function(){ return null; });
  }

  function typingNow(){
    var a=document.activeElement;
    if(!a) return false;
    var tag=(a.tagName||'').toLowerCase();
    return tag==='input' || tag==='textarea' || tag==='select' || a.isContentEditable===true;
  }

  // A card back being open means a draft may be in progress: never swap under it.
  function cardBackOpen(){
    var ids=['sb-detail-overlay','bb-detail-overlay'];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el){ try{ var cs=getComputedStyle(el); if(cs.display!=='none' && cs.visibility!=='hidden') return true; }catch(e){ return true; } }
    }
    return false;
  }
  var openedAt=Date.now();
  // What this page actually loaded: path -> version stamp, read from its own script tags.
  function loadedEntries(freshEntries){
    var out={}, scripts=document.scripts;
    Object.keys(freshEntries).forEach(function(path){
      for(var i=0;i<scripts.length;i++){
        var src=scripts[i].src||''; if(!src) continue;
        var u; try{ u=new URL(src, location.href); }catch(e){ continue; }
        if(u.pathname.slice(-(path.length+1))==='/'+path){ out[path]=(u.searchParams.get('v')||''); break; }
      }
    });
    return out;
  }
  // Only a swap nobody can see may happen by itself.
  function invisibleMoment(){
    if(typingNow() || cardBackOpen()) return false;
    var justOpened=(Date.now()-openedAt) < 15000 && (Date.now()-lastActivity) > 1500;
    return document.hidden || justOpened;
  }
  function recentlyReloaded(){
    try{ var t=parseInt(sessionStorage.getItem('t2tUpdateReloadAt')||'0',10); return t && (Date.now()-t) < LOOP_GUARD_MS; }catch(e){ return false; }
  }

  function reloadNow(){
    try{ sessionStorage.setItem('t2tUpdateReloadAt', String(Date.now())); }catch(e){}
    // Oct 28 2026: the same quiet switch as Reset (old page stays until the new one is ready).
    try{ if(window.T2T && typeof window.T2T.resetAndReturn==='function'){ window.T2T.resetAndReturn(); return; } }catch(e){}
    location.reload();
  }

  // Oct 30 2026 (Larry: the bar was partly off the screen, and Reload gave no sign it had been pressed).
  // Centered with left/right auto margins (the old left:50% + translate squeezed it to half the width and pushed
  // it past the edge on narrow screens), kept inside the screen with a max width and the phone's bottom safe area.
  // Pressing Reload now looks pressed at once, shows a spinning clock (and the pocket-watch screen when the page has
  // it) until the new version takes over; if nothing has happened after 15 seconds it reloads the plain way.
  function showBar(){
    if(bar || !document.body) return;
    if(!document.getElementById('t2t-uw-style')){
      var st=document.createElement('style'); st.id='t2t-uw-style';
      st.textContent='@keyframes t2t-uw-spin{to{transform:rotate(360deg)}}'
        +'.t2t-uw-clock{display:inline-block;animation:t2t-uw-spin 1s linear infinite;margin-right:6px}';
      document.head.appendChild(st);
    }
    bar=document.createElement('div');
    bar.setAttribute('role','status');
    bar.style.cssText='position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;'
      +'bottom:calc(18px + env(safe-area-inset-bottom, 0px));z-index:2147483000;'
      +'background:#3b2a1a;color:#fff3e0;padding:10px 16px;border-radius:10px;font:600 14px Georgia,serif;'
      +'box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;flex-wrap:wrap;justify-content:center;gap:10px 14px;align-items:center';
    bar.innerHTML='<span>A new version is ready</span>'
      +'<button type="button" style="background:#fff3e0;color:#3b2a1a;border:0;border-radius:6px;padding:5px 12px;font:700 13px Georgia,serif;cursor:pointer">Reload</button>';
    var btn=bar.querySelector('button');
    btn.addEventListener('click', function(){
      if(btn.disabled) return;
      btn.disabled=true;
      btn.style.cssText='background:#d9c7a8;color:#3b2a1a;border:0;border-radius:6px;padding:5px 12px;font:700 13px Georgia,serif;cursor:default;'
        +'box-shadow:inset 0 2px 5px rgba(0,0,0,.45);transform:translateY(1px)';
      btn.innerHTML='<span class="t2t-uw-clock">\u23F1\uFE0F</span>Reloading\u2026';
      try{ var sp=document.getElementById('travel-spinner'); if(sp) sp.classList.add('active'); }catch(e){}
      setTimeout(function(){ reloadNow(); }, 60);   // let the pressed look paint before the swap starts
      setTimeout(function(){ location.reload(); }, 15000);   // backup: if the quiet swap has not happened, reload plainly
    });
    document.body.appendChild(bar);
  }

  // Every [path,stamp] pair in a page-scripts.js text that this page loads.
  function entriesOf(txt){
    var page=''; try{ var sc=document.querySelector('script[data-page]'); page=(sc&&sc.getAttribute('data-page'))||''; }catch(e){}
    var out={}, re=/\[\s*'([^']+\.js)'\s*,\s*'([0-9a-z]+)'\s*(?:,\s*\[([^\]]*)\])?\s*\]/g, m;
    while((m=re.exec(txt||''))){
      if(m[3] && m[3].indexOf("'"+page+"'")<0) continue;
      out[m[1]]=m[2];
    }
    return out;
  }
  // Download (into the browser's cache only) every file whose version changed.
  function preloadChanged(){
    if(preloadState!=='none' || !newText) return;
    preloadState='loading';
    var now=entriesOf(newText), old=baseline ? entriesOf(baseline) : loadedEntries(now), urls=[];
    Object.keys(now).forEach(function(path){ if(old[path]!==now[path]) urls.push(path+'?v='+now[path]); });
    // The page itself names the newest page-scripts.js and style.css versions.
    var pageUrl=location.pathname.split('/').pop()||'index.html';
    fetch(pageUrl+'?check='+Date.now(), {cache:'no-store'}).then(function(r){ return r.ok ? r.text() : ''; }).catch(function(){ return ''; })
      .then(function(html){
        var a=/engine\/page-scripts\.js\?v=([0-9a-z]+)/.exec(html), c=/style\/style\.css\?v=([0-9a-z]+)/.exec(html);
        if(a) urls.push('engine/page-scripts.js?v='+a[1]);
        if(c) urls.push('style/style.css?v='+c[1]);
        return Promise.all(urls.map(function(u){ return fetch(u).then(function(r){ return r.text(); }).catch(function(){}); }));
      })
      .then(function(){ preloadState='done'; onNewVersion(); },
            function(){ preloadState='done'; onNewVersion(); });
  }

  function onNewVersion(){
    if(!waiting){ waiting=true; }
    // Get the new files on hand first; this tab keeps running the old version meanwhile.
    if(preloadState==='none'){ preloadChanged(); return; }
    if(preloadState==='loading') return;
    // Oct 29 2026: swap by itself only when it cannot be seen (see the note at the top); otherwise the bar, and the traveler chooses.
    if(invisibleMoment() && !recentlyReloaded()){ reloadNow(); return; }
    if(!document.hidden) showBar();
  }

  function check(){
    if(checking) return;
    checking=true;
    fingerprint().then(function(txt){
      checking=false;
      if(txt===null) return;
      if(baseline===null){
        baseline=txt;
        // Compare with what this page really loaded, not with whatever is found now.
        var fresh=entriesOf(txt), loaded=loadedEntries(fresh), stale=false;
        Object.keys(loaded).forEach(function(path){ if(loaded[path] && loaded[path]!==fresh[path]) stale=true; });
        if(stale){ baseline=''; newText=txt; onNewVersion(); }
        return;
      }
      if(txt!==baseline){ newText=txt; onNewVersion(); }
    });
  }

  check();
  setInterval(function(){ if(!document.hidden) check(); }, CHECK_MS);
  // While a new version is waiting, keep looking for an idle moment to apply it.
  setInterval(function(){ if(waiting && !document.hidden) onNewVersion(); }, 10000);
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ if(waiting) onNewVersion(); } else check(); });
})();
