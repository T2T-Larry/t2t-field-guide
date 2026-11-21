/* HEADER / SUBBER TOGGLE -- the one button on a card back that flips a card between Header and Subber, Nov 21 2026.
   Larry: "make header inverse look to Subber with blue background and white text so it stands out" and "do not default back to Subber but default to
   last usage so that we can rapid fire headers or subbers during creative session". And "One tree. One code": the NEW card is a card back
   (new-card-door.js), so this is the only toggle; the card back draws it here and the front door asks here for the last kind used.

   FGHeaderSubberToggle.html(isHeader, disabled)  the button's markup (id sb-view-btn); a Header wears the inverse look: blue, white text
   FGHeaderSubberToggle.remember(isHeader)        write down which kind was used last (kept in the browser, so a refresh does not undo it)
   FGHeaderSubberToggle.lastIsHeader()            true when the last kind used was Header
   What a click DOES (change the card, ask where its items go) stays with the card back, because that needs the card. */
(function(){
  var KEY='fg-last-idea-mode';
  var TIP='Header: something to think or talk about. Subber: a thought that sits under a header. Click to switch.';

  function lastIsHeader(){ try{ return localStorage.getItem(KEY)==='header'; }catch(e){ return false; } }   // storage can be blocked; Subber is the fallback
  function remember(isHeader){ try{ localStorage.setItem(KEY, isHeader?'header':'idea'); }catch(e){} }

  function injectStyle(){
    if(document.getElementById('fg-header-subber-toggle-style')) return;
    var st=document.createElement('style'); st.id='fg-header-subber-toggle-style';
    st.textContent='.sb-view-wrap .sb-view-frame.is-header,.fg-cardback-idea .sb-view-frame.is-header{background:#378ADD;color:#fff;border-color:#378ADD}';
    document.head.appendChild(st);
  }

  function html(isHeader, disabled){
    injectStyle();
    return '<button class="sb-view-frame'+(isHeader?' is-header':'')+'" id="sb-view-btn" type="button"'+(disabled?' disabled':'')
      +' title="'+(disabled?'Move its cards out first':TIP)+'">'+(isHeader?'Header':'Subber')+'</button>';
  }

  window.FGHeaderSubberToggle={ html:html, remember:remember, lastIsHeader:lastIsHeader };
})();
