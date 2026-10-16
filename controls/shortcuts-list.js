/* ============================================================
   shortcuts-list.js — "Shortcuts List" overlay for the Utilities
   menu. Added Sept 21 2026, Larry: "Add SHORTCUTS LIST to Utilities
   button containing all shortcuts currently in use on website."

   This is a plain reference card of every keyboard shortcut actually
   wired up across the Field Guide (Idea Storyboard, Session board,
   Briefing Board) -- not the separate "Shortcuts" rail feature
   (bookmarks.js), which is a traveler's own tagged-screen dots and
   already shows itself on the desk. Confirmed with Larry which one
   this button means before building, to avoid the name collision.

   Content is hand-written from what's actually wired in
   idea-storyboard-shared.js (Idea Storyboard), session.js (Session
   board) and briefing-board-card.js / briefing-board-ops.js
   (Briefing Board) as of Sept 21 2026. If a future session adds,
   removes, or changes a keyboard shortcut in any of those files,
   update the SECTIONS list below in the same delivery -- this file
   has no way to discover shortcuts on its own, it's just their
   write-up.

   Self-contained (inline styles only), same pattern as
   member-identity.js's "My Info" overlay, so it looks the same on
   every screen that offers Utility regardless of that screen's own
   CSS. Wired into settings-menu.js's canonical Home list exactly
   like "My Info" -- no per-screen setup needed, it just appears.
   ============================================================ */

(function(){

  // One entry per shortcut: { keys, does }. Grouped under the screen
  // it works on. Order matches how each screen's own keydown handler
  // checks them (see the file-header note above for exactly where).
  var SECTIONS = [
    {
      title: 'Idea Storyboard',
      note: 'Click a card to select it first, then use any of these (typing in a text box always turns them off):',
      items: [
        { keys: 'Tab', does: 'Nest the selected card under the header just before it' },
        { keys: 'Shift + Tab', does: 'Un-nest the selected card back out to top level' },
        { keys: '↑  or  Page Up  or  Ctrl/Cmd + ↑', does: 'Step the view out one level' },
        { keys: '↓  or  Page Down  or  Ctrl/Cmd + ↓', does: 'Step the view in one level' },
        { keys: 'Delete  or  Backspace', does: 'Send the selected card to Trash' },
        { keys: 'Alt + M', does: 'Move the selected card — opens the project pyramid; tap any project or topic to send it there' },
        { keys: 'Alt + T', does: 'Make the selected header or Subber the Topic' },
        { keys: 'Alt + H', does: 'View the selected card as a Header' },
        { keys: 'Alt + S', does: 'View the selected card as a Subber' },
        { keys: 'Ctrl/Cmd + Z', does: 'Undo' },
        { keys: 'Ctrl/Cmd + Shift + Z', does: 'Redo' }
      ]
    },
    {
      title: 'Session Board',
      note: null,
      items: [
        { keys: 'Alt + N', does: 'Open a new idea input for the current bucket' },
        { keys: 'Ctrl/Cmd + Z', does: 'Undo' },
        { keys: 'Ctrl/Cmd + Shift + Z  or  Ctrl + Y', does: 'Redo' },
        { keys: 'Ctrl/Cmd + C', does: 'Copy the selected card' },
        { keys: 'Ctrl/Cmd + V', does: 'Paste' },
        { keys: 'Ctrl/Cmd + D', does: 'Duplicate the selected card' },
        { keys: 'Ctrl/Cmd + A', does: 'Select all cards' },
        { keys: 'Delete  or  Backspace', does: 'Send the selected card to Trash' }
      ]
    },
    {
      title: 'Briefing Board',
      note: null,
      items: [
        { keys: 'Alt + N', does: 'Open the Add Card box' },
        { keys: 'Ctrl/Cmd + Z', does: 'Undo' },
        { keys: 'Ctrl/Cmd + Shift + Z', does: 'Redo' },
        { keys: 'Esc', does: 'Clear the current card selection' }
      ]
    }
  ];

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderSectionsHTML(){
    return SECTIONS.map(function(sec){
      var rows = sec.items.map(function(it){
        return '<div style="display:flex;gap:12px;padding:7px 0;border-bottom:1px solid #eee;align-items:baseline">'
          + '<div style="flex:0 0 auto;min-width:150px;font-weight:700;font-size:13px;color:#3B2510;font-family:monospace,monospace">' + esc(it.keys) + '</div>'
          + '<div style="flex:1 1 auto;font-size:13px;color:#444;line-height:1.4">' + esc(it.does) + '</div>'
          + '</div>';
      }).join('');
      return '<div style="margin-bottom:18px">'
        + '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7a6040;font-weight:700;margin-bottom:4px">' + esc(sec.title) + '</div>'
        + (sec.note ? '<div style="font-size:12px;color:#888;margin-bottom:6px">' + esc(sec.note) + '</div>' : '')
        + '<div>' + rows + '</div>'
        + '</div>';
    }).join('');
  }

  var _ov = null;
  function ensureOverlay(){
    if(_ov && document.body.contains(_ov)) return _ov;
    _ov = document.createElement('div');
    _ov.id = 'scl-overlay';
    _ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    _ov.innerHTML =
       '<div style="background:#fff;color:#2b2b2b;border-radius:12px;width:100%;max-width:460px;max-height:82vh;padding:18px 18px 16px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;box-sizing:border-box;display:flex;flex-direction:column">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex:0 0 auto">'
        +'<div style="font-size:18px;font-weight:700">Shortcuts List</div>'
        +'<button type="button" id="scl-close" aria-label="Close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1;color:#555">✕</button>'
      +'</div>'
      +'<div style="font-size:12px;color:#777;margin-bottom:12px;flex:0 0 auto">Every keyboard shortcut built into the Field Guide right now.</div>'
      +'<div id="scl-body" style="overflow-y:auto;flex:1 1 auto">' + renderSectionsHTML() + '</div>'
      +'</div>';
    document.body.appendChild(_ov);
    _ov.addEventListener('click', function(e){ if(e.target === _ov) close(); });
    _ov.querySelector('#scl-close').addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && _ov && _ov.style.display !== 'none') close(); });
    return _ov;
  }
  function open(){
    ensureOverlay();
    _ov.style.display = 'flex';
  }
  function close(){ if(_ov) _ov.style.display = 'none'; }

  window.T2TShortcutsList = { open: open, close: close };

})();
