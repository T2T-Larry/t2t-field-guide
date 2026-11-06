/* glow.js -- T2T Field Guide - THE SHARED GLOW ("here is what you were sent to find")
   Nov 6 2026 (Larry): "What if the link always blinks the target header or topic? Return blinks the original source card." KEEP, build it.
   The glow stays on until your first click, as the Briefing Board's go-there glow always has ("I looked all over for the header").

   Public surface: window.FGGlow
     .show(selectors)   selectors = one CSS selector or a list; the first VISIBLE match glows (gold outline, soft pulse). It scrolls into view once.
                        The board may still be drawing, so it keeps looking for about 8 seconds and puts the glow back if the board redraws.
     .clear()           puts it out (the first click anywhere does this by itself, after a moment so the click that brought you here does not)
   One glow at a time. The Briefing Board's own card glow (FGBBGoThere.glow, card-go-there.js) is the same look; it follows that board's card redraws, so it stays its own routine. */
(function(){
  if(window.FGGlow) return;
  var cur=null;

  function injectStyle(){
    if(document.getElementById('fg-glow-style')) return;
    var st=document.createElement('style'); st.id='fg-glow-style';
    st.textContent='.fg-glow{outline:3px solid #f2b705!important;outline-offset:2px;box-shadow:0 0 0 5px rgba(242,183,5,.35),0 0 20px 8px rgba(242,183,5,.7)!important;animation:fg-glow-pulse-shared 2.4s ease-in-out infinite}'
      +'@keyframes fg-glow-pulse-shared{0%,100%{box-shadow:0 0 0 5px rgba(242,183,5,.35),0 0 14px 5px rgba(242,183,5,.55)}50%{box-shadow:0 0 0 7px rgba(242,183,5,.4),0 0 24px 10px rgba(242,183,5,.85)}}';
    document.head.appendChild(st);
  }
  function all(){ return Array.prototype.slice.call(document.querySelectorAll('.fg-glow')); }
  function visible(el){ return !!(el && el.getClientRects().length); }
  function pick(sels){
    for(var i=0;i<sels.length;i++){
      var list=[]; try{ list=Array.prototype.slice.call(document.querySelectorAll(sels[i])); }catch(e){}
      for(var j=0;j<list.length;j++) if(visible(list[j])) return list[j];
    }
    return null;
  }

  function clear(){
    if(!cur) return;
    var g=cur; cur=null; g.dead=true;
    clearInterval(g.look); clearTimeout(g.armT); clearTimeout(g.endT);
    if(g.obs) g.obs.disconnect();
    document.removeEventListener('mousedown', g.onDown, true);
    all().forEach(function(el){ el.classList.remove('fg-glow'); });
  }

  function show(selectors){
    var sels=[].concat(selectors||[]).filter(Boolean);
    clear();
    if(!sels.length) return;
    injectStyle();
    var g={dead:false, scrolled:false}; cur=g;
    function apply(){
      if(g.dead) return false;
      var el=pick(sels); if(!el) return false;
      all().forEach(function(x){ if(x!==el) x.classList.remove('fg-glow'); });
      if(!el.classList.contains('fg-glow')) el.classList.add('fg-glow');
      if(!g.scrolled){ g.scrolled=true; try{ el.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'}); }catch(e){} }
      return true;
    }
    apply();
    var tries=0;
    g.look=setInterval(function(){ if(apply() || ++tries>50) clearInterval(g.look); }, 160);   // about 8 seconds of looking
    var pending=false;
    g.obs=new MutationObserver(function(){
      if(pending || g.dead) return;
      pending=true; requestAnimationFrame(function(){ pending=false; apply(); });
    });
    g.obs.observe(document.body, {childList:true, subtree:true});
    g.onDown=function(){ clear(); };
    g.armT=setTimeout(function(){ if(!g.dead) document.addEventListener('mousedown', g.onDown, true); }, 800);
    g.endT=setTimeout(clear, 10*60*1000);   // a glow nobody ever clicks away still ends
  }

  window.FGGlow={show:show, clear:clear};
})();
