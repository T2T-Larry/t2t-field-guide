/* ============================================================
settings-menu.js — Settings Menu (shared). The one place that
knows what the Settings drill-down's HOME screen looks like:
People, Appearance, Preferences, Reload, Jump to Menu, History,
Sign Out, always in that order, always with that icon/label,
disabled items always looking and reading the same way.

Sept 12 2026, Larry: "Utility button on ALL screens should look
exactly the same as on the BB screen" -- then, after the Desktop
and Storyboard Settings screens were each rebuilt separately to
match that goal by hand: "This should be its own file, right? You
are not making multiple copies?" He was right -- the Home screen's
button list had been copy-pasted (with small drift already
starting between them) into drawer-system.js, idea-storyboard-
9710.js, and briefing-board-ops.js, with session.js about to become
a fourth copy. Split out so every one of those four instead builds
its Home screen by calling into ONE shared list, so "all Utility
screens look exactly the same" is something the code actually
guarantees, not just something each file was separately asked to
copy correctly.

Each screen still owns everything BELOW Home -- its own People/
Appearance/Preferences sub-screens (the Briefing Board's are real
project screens; the Storyboard's are real board screens; the
Desktop's and Session's are simply not available yet, which this
file expresses as "disabled" rather than "missing"), its own X/back
navigation stack, its own overlay markup and CSS. This file only
ever produces the seven-button Home list and wires whichever of
those seven a caller actually enables. Nothing here reaches into
Supabase, T2T, or any other file's private state -- purely a
template plus a wiring helper, called BY every screen's own gear
menu, never calling back into any of them.

Loaded once, before the four screen files that use it (Storyboard,
Session, Briefing Board, Drawer System all list it as a dependency
in their own file-header comments the next time they're touched).
============================================================ */

(function(){

  // One item's markup. `cfg` (from the caller's per-key entry) may be
  // undefined -- that's exactly what "not available on this screen"
  // looks like, and canonicalHomeItems below turns that into a
  // disabled button with its own explanation, not a missing one.
  // Sept 12 2026: Sign Out's red styling used to be a different color,
  // written a different way, in each of the three files that had it
  // (a dedicated CSS class in one, an inline style in the others) --
  // baked in here as a plain inline style so all four end up
  // byte-for-byte identical without needing a matching CSS rule added
  // to every screen's own stylesheet.
  var DANGER_STYLE = 'border-color:#b8544a;color:#a8332a;font-weight:700';
  function buttonHTML(it, btnClass, extraStyle){
    var style = 'width:100%' + (extraStyle ? ';' + extraStyle : '') + (it.danger ? ';' + DANGER_STYLE : '') + (it.style ? ';' + it.style : '');
    var attrs = 'type="button" class="' + btnClass + '" id="' + it.id + '"';
    if (it.disabled) attrs += ' disabled';
    if (it.title) attrs += ' title="' + it.title.replace(/"/g,'&quot;') + '"';
    attrs += ' style="' + style + '"';
    return '<button ' + attrs + '>' + it.icon + ' ' + it.label + '</button>';
  }

  // Sept 12 2026, Larry: "gray out. What if Hx is on all screens but
  // grayed out when not relative?" -- every one of the seven always
  // renders; a key the caller doesn't pass a handler for renders
  // disabled with a title explaining why, instead of being left out.
  // `cfg` keys: people, appearance, preferences, reload, menu,
  // history, signout -- each either omitted (disabled) or
  // { onClick, title } (enabled; title optional, e.g. a subtitle-ish
  // hint on an enabled item is rare but allowed).
  function canonicalHomeItems(cfg, idPrefix){
    cfg = cfg || {};
    idPrefix = idPrefix || 'set-go-';
    function item(key, icon, label, disabledTitle, danger){
      var c = cfg[key];
      return {
        id: idPrefix + key,
        icon: icon,
        label: label,
        disabled: !(c && c.onClick),
        title: (c && c.title) || (!(c && c.onClick) ? disabledTitle : undefined),
        onClick: c && c.onClick,
        danger: !!danger
      };
    }
    return [
      // Sept 12 2026, Larry: "remove the People screen ... CAST is our
      // source of truth" -- Idea Storyboard/Desktop/Session no longer
      // pass an onClick for this, so it renders disabled with this
      // explanation (Briefing Board still passes one -- Relationships,
      // a different feature, lives there).
      item('people',      '&#128101;', 'People',       "Add people through a project's own Cast (Call Sheet) instead"),
      item('appearance',  '&#127912;', 'Appearance',   null),
      item('preferences', '&#128295;', 'Preferences',  'Open a project to change its preferences'),
      item('reload',      '&#128260;', 'Reload',       null),
      item('menu',        '&#128269;', 'Jump to Menu', null),
      item('history',     '&#128337;', 'History',      'Board history — open a Briefing Board to use this'),
      item('signout',     '&#128682;', 'Sign Out',     null, true)
    ];
  }

  // Full Home screen: title + "Signed in as ___" line (optional,
  // pass memberName) + the seven buttons, as one HTML string. Callers
  // that want their own heading markup (the Briefing Board and
  // Storyboard both draw their own title-row-with-X, matching the
  // rest of their own overlay chrome) can pass includeHeading:false
  // and just use itemsHTML/wire below directly instead.
  function renderHomeHTML(cfg, opts){
    opts = opts || {};
    var items = canonicalHomeItems(cfg, opts.idPrefix);
    var html = '';
    if (opts.includeHeading !== false){
      html += '<div class="sz-text-title">Settings</div>';
      if (opts.memberName) html += '<div id="sz-util-who">Signed in as <span id="sz-util-name">' + opts.memberName + '</span></div>';
    }
    // wrapClass -- the Briefing Board wraps each button in its own
    // '<div class="bb-field">' (matching every other field on its
    // other Settings screens); Desktop/Storyboard/Session just list
    // bare buttons in a flex column their own overlay CSS provides.
    html += items.map(function(it){
      var btn = buttonHTML(it, opts.btnClass || 'sz-set-btn');
      return opts.wrapClass ? '<div class="' + opts.wrapClass + '">' + btn + '</div>' : btn;
    }).join('');
    return { html: html, items: items };
  }

  // Wires whichever items actually have a handler (disabled ones have
  // none to wire). `root` is the container the Home HTML was just
  // written into.
  function wireHomeItems(root, items){
    items.forEach(function(it){
      if (!it.onClick) return;
      var el = root.querySelector('#' + it.id);
      if (el) el.addEventListener('click', it.onClick);
    });
  }

  // The one true Sign Out confirmation + call, so its wording can't
  // drift between the four places that now offer it (desk-level
  // Utility, Storyboard, Session, Briefing Board). Always routes
  // through window.T2T.signOutOfDevice (backpack.js) -- still just
  // one real sign-out implementation underneath.
  async function confirmSignOut(beforeSignOut){
    if (!confirm('Sign out of the Field Guide on this device? Good for handing it to someone else to sign in, or to create their own account.')) return;
    if (beforeSignOut) beforeSignOut();
    if (window.T2T && window.T2T.signOutOfDevice) await window.T2T.signOutOfDevice();
  }

  window.T2TSettingsMenu = {
    canonicalHomeItems: canonicalHomeItems,
    renderHomeHTML: renderHomeHTML,
    wireHomeItems: wireHomeItems,
    confirmSignOut: confirmSignOut
  };

})();
