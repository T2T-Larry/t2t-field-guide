/* shortcuts-list.js -- the SHORTCUTS LIST lives in the Library (Nov 27 2026, Larry: "Shortcuts List needs to be in the library. Move its home there.").
   The list is cards on the board: LIBRARY > RESOURCES > Tools > Shortcuts List. It is held there once and edited there; no copy is kept in code.
   This file only opens that home, for the Utility menus that offer "Shortcuts List": the owner gets the normal board, a member the read-only Library view.
   If a keyboard shortcut is added, changed or removed in the code, change its card in the Library in the same delivery.
   Public surface: window.T2TShortcutsList  .open()  .HOME */
(function(){
  var HOME='53650f89-6cf7-437a-bd5f-921d2253ebd0';   // the "Shortcuts List" header (by id, so renaming it never breaks the link)
  function clearOverlays(){
    Array.prototype.forEach.call(document.querySelectorAll('.bb-overlay.active, #sb-detail-overlay.active'), function(el){ el.classList.remove('active'); });
  }
  async function open(){
    try{
      var c=window.T2T && T2T.sb; if(!c || !window.T2TMedia || !T2TMedia.openBoard) throw new Error('not ready');
      var row=await c.from('ideas').select('user_id').eq('id', HOME).maybeSingle();
      if(row.error) throw row.error;
      if(!row.data) throw new Error('not shared with this account');
      var me=await c.auth.getUser();
      clearOverlays();
      if(me && me.data && me.data.user && me.data.user.id===row.data.user_id) T2TMedia.openBoard(HOME, true);
      else if(window.T2TLibraryView) T2TLibraryView.open(HOME);
    }catch(err){
      console.error('Shortcuts List: could not open its Library board', err);
      window.alert('The Shortcuts List is in the Library, and it could not be opened just now.');
    }
  }
  window.T2TShortcutsList={ open:open, HOME:HOME };
})();
