/* ============================================================
   flag-front-tap.js -- T2T Field Guide - shared by every board

   TAP A FLAG ON THE FRONT TO HIDE IT. Larry, Nov 20 2026: "Clicking the flag on the front
   is just another way to turn off the front of card view" -- the Signal Flags check on the
   card back that shows a card's flags on its front. The Notes pencil works the same way
   (data-fg-hide="notes": it switches off the Notes check instead).

     * Nothing new is stored. The check on the back already lives in the card's front_hidden
       list (the word 'flags' = back only). A tap on a flag mark on the front adds that same
       word, so the check on the back switches off by itself, and checking it again brings
       the flags back. The flags themselves stay on the card.
     * One check, so every flag on the card hides together (hearts, gems, lights, custom flags).
     * One code: each board only says how to find the card behind a tapped mark (register
       below); the tap, the save and the redraw are done here, once.

   A board marks its flag marks with the class 'fg-flag-front-tap' and registers an adapter:
     T2TFlagFrontTap.register({
       cardOf: function(markEl){ return { id, item, hidden(), setHidden(str), redraw() } or null; }
     })

   Used by: briefing-board/operations.js (Briefing Board) and storyboard/idea-storyboard-signal-flags.js (every other board).
   ============================================================ */
(function(){
  var adapters = [];
  var CLASS = 'fg-flag-front-tap';
  try{ var st=document.createElement('style'); st.textContent='.'+CLASS+'{cursor:pointer}'; document.head.appendChild(st); }catch(e){}

  function register(adapter){ if(adapter && typeof adapter.cardOf === 'function') adapters.push(adapter); }

  function parse(str){
    return String(str || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  }

  async function hideOnFront(ctx, key){
    var words = parse(ctx.hidden());
    if(words.indexOf(key) >= 0) return;
    words.push(key);
    if(key === 'flags' && ctx.alsoHide){ ctx.alsoHide.forEach(function(w){ if(words.indexOf(w) < 0) words.push(w); }); }
    var next = words.join(',');
    var prev = ctx.hidden();
    ctx.setHidden(next);                       // the card on screen changes first, so the tap feels instant
    ctx.redraw();
    try{
      var sb = window.T2TFlagFrontTap.sb && window.T2TFlagFrontTap.sb();
      if(!sb) throw new Error('No database connection.');
      var res = await sb.from('ideas').update({ front_hidden: next }).eq('id', ctx.id);
      if(res.error) throw res.error;
    }catch(e){
      console.error('Tap to hide: could not hide this on the front of the card', e);
      ctx.setHidden(prev == null ? null : prev); // put the card back the way it was
      ctx.redraw();
    }
  }

  // Capture phase, so a tap on a flag does this and does not also open the card.
  document.addEventListener('click', function(e){
    var mark = e.target && e.target.closest ? e.target.closest('.' + CLASS) : null;
    if(!mark) return;
    for(var i = 0; i < adapters.length; i++){
      var ctx = null;
      try{ ctx = adapters[i].cardOf(mark); }catch(err){ console.error('Flags: adapter failed', err); }
      if(ctx){ e.preventDefault(); e.stopPropagation(); hideOnFront(ctx, mark.getAttribute('data-fg-hide') || 'flags'); return; }
    }
  }, true);

  window.T2TFlagFrontTap = { register: register, CLASS: CLASS, sb: null };
})();
