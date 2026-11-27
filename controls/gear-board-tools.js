/* GEAR BOARD TOOLS -- the account buttons and the one board-wide switch that feature popups borrow (from Nov 21 2026, Larry: "if we merged the gears together").

   WHERE EACH ONE SHOWS (Nov 27 2026: the Gear is the FEATURES list)
   - ACCOUNT feature's popup (controls/feature-place.js): My Info, Sign Out.
   - PEOPLE feature's popup: the Initials on cards ON / OFF switch.
   - Text size lives in the TEXT feature's popup (controls/text-selector.js).
   - Subject-only is each card's own contents eye, and Linked words follow the Link feature, so neither has a screen switch.
   - Bold, CAPS and the header colon are the card's own Text choice (controls/subject-look.js).
   Nothing here is rebuilt: each control calls the same function it always called.
   Public surface: window.FGGearBoardTools  .onoff(box, label, isOn, set)  .accountButtons(box)  .initialsSwitch(back) */
(function(){
  if(!window.FGGearHub) return;

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

  // ACCOUNT (Nov 21 2026, Larry: "delete it" -- the upper-right screen Gear is retired). The account items it still held live here so nothing is lost:
  // My Info (name, organization, logo) and Sign Out sit together. Same overlay and same sign-out as before (people-team/member-identity.js, settings-menu.js).
  function accountButtons(box){
    if(window.T2TMemberIdentity) btn(box, 'My Info', function(){ leave(); window.T2TMemberIdentity.openEditor(); });
    var so=btn(box, 'Sign Out', function(){ leave(); if(window.T2TSettingsMenu) window.T2TSettingsMenu.confirmSignOut(); });
    so.style.cssText='border-color:#b8544a;color:#a8332a';
  }

  window.FGGearBoardTools={ onoff:onoff, accountButtons:accountButtons, initialsSwitch:initialsSwitch };
})();
