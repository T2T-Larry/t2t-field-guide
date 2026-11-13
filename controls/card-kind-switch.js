/* CARD KIND SWITCH -- the card-type label in the upper left of every card back (IDEA - TASK - NOTES), Nov 13 2026.
   Larry: "three kinds of cards: IDEA-TASK-NOTES. The card choices now are only IDEA-TASK. Plus, it might help to have a small caret to the right of
   the CARD SELECTOR so we have a hint that there is a choice here?"
   One place makes the label a switch on an EXISTING card: a small caret (the same one the new-card switch shows) and the three choices.
   Each card back only says what its current kind is and what to do when another is picked; the choices and the look live here.

   FGCardKindSwitch.wire(labelEl, { theme:'bb'|'idea', getCurrent():'IDEA'|'TASK'|'NOTES'|null, onPick(value), title })
     getCurrent is read at click time (a card that is not one of the three kinds returns null and the label does nothing).
     Wiring the same label again just replaces what it does, so a card back that is redrawn never keeps an old card's handler.
   A new, uncommitted card keeps its own switch in new-card-door.js (it already shows the caret); this one never touches it. */
(function(){
  var KINDS=[{value:'IDEA',label:'IDEA'},{value:'TASK',label:'TASK'},{value:'NOTES',label:'NOTES'}];

  function injectStyle(){
    if(document.getElementById('fg-card-kind-switch-style')) return;
    var st=document.createElement('style'); st.id='fg-card-kind-switch-style';
    st.textContent='.fg-kind-caret{cursor:pointer}.fg-kind-caret::after{content:" \\25BE";font-size:.8em}';
    document.head.appendChild(st);
  }

  function wire(el, opts){
    if(!el || !opts) return false;
    injectStyle();
    el.__kindSwitch=opts;
    if(!el.getAttribute('data-fg-kind-wired')){
      el.setAttribute('data-fg-kind-wired','2');
      if(!(el.closest && el.closest('.fg-kind-toggle'))) el.classList.add('fg-kind-caret');   // a new card's own switch already draws the caret
      el.style.cursor='pointer';
      el.addEventListener('mousedown', function(e){ e.stopPropagation(); });   // the label doubles as a drag handle; a plain click must not start a drag
      el.addEventListener('click', function(e){
        e.stopPropagation();
        var o=el.__kindSwitch; if(!o || el.getAttribute('data-fg-kind-wired')!=='2') return;
        var cur=o.getCurrent ? o.getCurrent() : null; if(!cur || !window.FGCardBack) return;
        FGCardBack.openKindMenu(el, {theme:o.theme||'idea', current:cur, kinds:KINDS, onPick:function(k){ if(o.onPick) o.onPick(k.value); }});
      });
    }
    el.title=opts.title||'Kind of card: click to change it to IDEA, TASK or NOTES';
    return true;
  }

  window.FGCardKindSwitch={ KINDS:KINDS, wire:wire };
})();
