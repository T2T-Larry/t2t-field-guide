/* GEAR BOARD TOOLS -- what the old screen Gear (upper right, Appearance and Preferences) held, now living in the card Gear (Nov 21 2026).
   Larry: "Since every card is a potential TOPIC card, what if we merged the gears together ... Then we no longer need the redundant screen GEAR."

   WHAT YOU SEE (in the card Gear's popups)
   - PREFERENCES > SCREEN LOOK (moved from the retired APPEARANCE, Nov 24 2026): Recolor all headers, Recolor all subbers, Text size, Full screen, and the ON/OFF switches for Subject-only view,
     Linked words and Initials on cards.
   - TOOLS is retired (Nov 27 2026, Larry: "TOOLS are all redundant or not needed"): flags are managed in the Signal Flags feature, the Shortcuts
     List lives in the Library, and a document is split into cards from the new idea card.
   - Bold, CAPS and the header colon are no longer screen switches: they are the card's own Text choice, and every card beneath follows it
     (controls/subject-look.js). The topic at the top of the screen plays the part the screen switches used to.
   Nothing here is rebuilt: each button calls the same function the old screen Gear called.
   Registers its features with FGGearHub (controls/gear-hub.js). */
(function(){
  if(!window.FGGearHub || !FGGearHub.addFeature) return;

  function leave(){ try{ FGGearHub.close(); }catch(e){} try{ if(typeof closeSbDetail==='function') closeSbDetail(); }catch(e){} }
  function has(name){ return typeof window[name]==='function' || (function(){ try{ return typeof eval(name)==='function'; }catch(e){ return false; } })(); }
  function btn(box, text, fn){
    var b=document.createElement('button'); b.type='button'; b.className='fg-gh-hubbtn'; b.textContent=text;
    b.onclick=function(e){ e.stopPropagation(); fn(); };
    box.appendChild(b); return b;
  }
  function onoff(box, label, isOn, set){
    var row=document.createElement('div'); row.className='fg-gh-row'; row.style.cssText='justify-content:space-between;margin:2px 0 6px';
    var l=document.createElement('span'); l.textContent=label;
    var tg=document.createElement('div'); tg.className='sb-gear-tabs'; tg.style.cssText='margin-bottom:0;width:auto;min-width:80px;flex-shrink:0';
    tg.innerHTML='<button type="button" class="sb-gear-tab" data-on="1" style="padding:4px 8px">ON</button><button type="button" class="sb-gear-tab" data-on="0" style="padding:4px 8px">OFF</button>';
    function paint(){ var on=!!isOn(); tg.querySelectorAll('.sb-gear-tab').forEach(function(b){ b.classList.toggle('active', (b.getAttribute('data-on')==='1')===on); }); }
    tg.addEventListener('click', function(e){ var b=e.target.closest('.sb-gear-tab'); if(!b) return; e.stopPropagation(); set(b.getAttribute('data-on')==='1'); paint(); });
    paint(); row.appendChild(l); row.appendChild(tg); box.appendChild(row);
  }

  FGGearHub.addFeature({ key:'screen-look', label:'Screen look', cluster:'preferences', body:function(item, box){
    if(has('_sboardOpenRecolorAll')) btn(box, 'Recolor all headers', function(){ leave(); _sboardOpenRecolorAll(); });
    if(has('_sboardOpenRecolorAllSubbers')) btn(box, 'Recolor all subbers', function(){ leave(); _sboardOpenRecolorAllSubbers(); });
    btn(box, 'Text size', function(){ leave(); if(window.openFGTextSizePicker) window.openFGTextSizePicker(); });
    btn(box, document.fullscreenElement ? 'Exit full screen' : 'Full screen', function(){ leave(); if(window.T2TSession && T2TSession.toggleFullscreen) T2TSession.toggleFullscreen(); });
    if(has('_sboardIsSubjectOnlyView')) onoff(box, 'Subject-only view', function(){ return _sboardIsSubjectOnlyView(); }, function(on){ _sboardSetSubjectOnlyView(on); if(typeof renderSeaBoard==='function') renderSeaBoard(true); });
    if(window.T2TLinkedWords) onoff(box, 'Linked words', function(){ return T2TLinkedWords.isOn(); }, function(on){ T2TLinkedWords.set(on); });
    var peopleOn=!window.FGCardOptions || !item || FGCardOptions.isOn(item.id,'people');   // People off = no initials anywhere, so no switch for them
    if(peopleOn && has('_sboardCurrentProjectRow') && has('_sboardSetHideAllInitials')) onoff(box, 'Initials on cards', function(){ var r=_sboardCurrentProjectRow(); return !(r && r.hide_all_initials); }, function(on){ _sboardSetHideAllInitials(!on); });
  }});

  // ACCOUNT (Nov 21 2026, Larry: "delete it" -- the upper-right screen Gear is retired). The account items it still held move here so nothing is lost:
  // My Info (name, organization, logo) and Sign Out sit together. Nov 26 2026: its own Gear button, so Sign Out is there whatever the People feature says. Same overlay and same sign-out as before (people-team/member-identity.js, settings-menu.js).
  FGGearHub.addFeature({ key:'account', label:'Account', cluster:'account', body:function(item, box){
    if(window.T2TMemberIdentity) btn(box, 'My Info', function(){ leave(); window.T2TMemberIdentity.openEditor(); });
    var so=btn(box, 'Sign Out', function(){ leave(); if(window.T2TSettingsMenu) window.T2TSettingsMenu.confirmSignOut(); });
    so.style.cssText='border-color:#b8544a;color:#a8332a';
  }});

})();
