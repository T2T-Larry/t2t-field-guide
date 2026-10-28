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
   swap is much shorter. Nothing on screen changes while that happens. */
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

  function reloadNow(){
    try{ sessionStorage.setItem('t2tUpdateReloadAt', String(Date.now())); }catch(e){}
    location.reload();
  }

  function showBar(){
    if(bar || !document.body) return;
    bar=document.createElement('div');
    bar.setAttribute('role','status');
    bar.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;'
      +'background:#3b2a1a;color:#fff3e0;padding:10px 16px;border-radius:10px;font:600 14px Georgia,serif;'
      +'box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;gap:14px;align-items:center';
    bar.innerHTML='<span>A new version is ready</span>'
      +'<button type="button" style="background:#fff3e0;color:#3b2a1a;border:0;border-radius:6px;padding:5px 12px;font:700 13px Georgia,serif;cursor:pointer">Reload</button>';
    bar.querySelector('button').addEventListener('click', reloadNow);
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
    var old=entriesOf(baseline), now=entriesOf(newText), urls=[];
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
    var recentReload=false;
    try{ recentReload=(Date.now()-Number(sessionStorage.getItem('t2tUpdateReloadAt')||0))<LOOP_GUARD_MS; }catch(e){}
    var idle=(Date.now()-lastActivity)>=IDLE_MS && !typingNow();
    if(idle && !recentReload && !document.hidden) reloadNow(); else showBar();
  }

  function check(){
    if(checking) return;
    checking=true;
    fingerprint().then(function(txt){
      checking=false;
      if(txt===null) return;
      if(baseline===null){ baseline=txt; return; }
      if(txt!==baseline){ newText=txt; onNewVersion(); }
    });
  }

  check();
  setInterval(function(){ if(!document.hidden) check(); }, CHECK_MS);
  // While a new version is waiting, keep looking for an idle moment to apply it.
  setInterval(function(){ if(waiting && !document.hidden) onNewVersion(); }, 10000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(); });
})();
