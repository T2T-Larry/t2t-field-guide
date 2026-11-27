/* GEAR BOARD TOOLS -- the board-wide switches and the account buttons the card Gear offers (from Nov 21 2026, Larry: "if we merged the gears together").

   WHERE EACH ONE SHOWS (Nov 27 2026: SCREEN LOOK and PREFERENCES are retired -- "yes" to the proposal, then "Move FEATURES to GEAR. Drop PREFERENCES.")
   - Gear > Utilities > Text size (controls/feature-place.js), until the TEXT SELECTOR carries size.
   - Subject-only view and Linked words: ON / OFF switches in Card display (controls/card-display-options.js).
   - Initials on cards: an ON / OFF switch in the People feature's popup (controls/feature-place.js).
   - Gear > Account: My Info, Sign Out (registered here).
   - Recolor all headers / subbers are gone from the Gear (the Color popup's HEADERS and SUBBERS choices cover them, controls/color-selector.js), and so is
     Full screen (the browser has its own).
   - Bold, CAPS and the header colon are not screen switches: they are the card's own Text choice (controls/subject-look.js).
   Nothing here is rebuilt: each control calls the same function it always called.
   Public surface: window.FGGearBoardTools  .onoff(box, label, isOn, set)  .openTextSize()  .initialsSwitch(back) */
(function(){
  if(!window.FGGearHub || !FGGearHub.addFeature) return;

  function leave(){ try{ FGGearHub.close(); }catch(e){} try{ if(typeof closeSbDetail==='function') closeSbDetail(); }catch(e){} }
  function btn(box, text, fn){
    var b=document.createElement('button'); b.type='button'; b.className='fg-gh-hubbtn'; b.textContent=text;
    b.onclick=function(e){ e.stopPropagation(); fn(); };
    box.appendChild(b); return b;
  }
  // One ON / OFF row, the same wherever a switch shows.
  function onoff(box, label, isOn, set){
    var row=document.createElement('div'); row.className='fg-gh-row'; row.style.cssText='justify-content:space-between;margin:2px 0 6px';
    var l=document.createElement('span'); l.textContent=label;
    var tg=document.createElement('div'); tg.className='sb-gear-tabs'; tg.style.cssText='margin-bottom:0;width:auto;min-width:80px;flex-shrink:0';
    tg.innerHTML='<button type="button" class="sb-gear-tab" data-on="1" style="padding:4px 8px">ON</button><button type="button" class="sb-gear-tab" data-on="0" style="padding:4px 8px">OFF</button>';
    function paint(){ var on=!!isOn(); tg.querySelectorAll('.sb-gear-tab').forEach(function(b){ b.classList.toggle('active', (b.getAttribute('data-on')==='1')===on); }); }
    tg.addEventListener('click', async function(e){ var b=e.target.closest('.sb-gear-tab'); if(!b) return; e.stopPropagation(); await set(b.getAttribute('data-on')==='1'); paint(); });
    paint(); row.appendChild(l); row.appendChild(tg); box.appendChild(row); return row;
  }
  function openTextSize(){ if(window.openFGTextSizePicker) window.openFGTextSizePicker(); }
  // The board-wide initials switch (ideas.hide_all_initials on the board's top card, storyboard/idea-storyboard-people.js). Task cards do not follow it, so
  // they get no switch; neither does a screen with no board open. Returns the row, or null.
  function initialsSwitch(back){
    if(back && back.querySelector('#bb-d-duplicate')) return null;
    if(typeof _sboardCurrentProjectRow!=='function' || typeof _sboardSetHideAllInitials!=='function' || !_sboardCurrentProjectRow()) return null;
    var holder=document.createElement('div');
    onoff(holder, 'Initials on cards', function(){ var r=_sboardCurrentProjectRow(); return !(r && r.hide_all_initials); }, function(on){ return _sboardSetHideAllInitials(!on); });
    holder.firstChild.style.fontSize='calc(12px * var(--fg-text-scale,1))';   // the same size as the other lines in the People popup
    return holder.firstChild;
  }

  // ACCOUNT (Nov 21 2026, Larry: "delete it" -- the upper-right screen Gear is retired). The account items it still held move here so nothing is lost:
  // My Info (name, organization, logo) and Sign Out sit together. Nov 26 2026: its own Gear button, so Sign Out is there whatever the People feature says. Same overlay and same sign-out as before (people-team/member-identity.js, settings-menu.js).
  FGGearHub.addFeature({ key:'account', label:'Account', cluster:'account', body:function(item, box){
    if(window.T2TMemberIdentity) btn(box, 'My Info', function(){ leave(); window.T2TMemberIdentity.openEditor(); });
    var so=btn(box, 'Sign Out', function(){ leave(); if(window.T2TSettingsMenu) window.T2TSettingsMenu.confirmSignOut(); });
    so.style.cssText='border-color:#b8544a;color:#a8332a';
  }});

  window.FGGearBoardTools={ onoff:onoff, openTextSize:openTextSize, initialsSwitch:initialsSwitch };
})();
