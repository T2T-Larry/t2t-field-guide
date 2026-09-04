/* ============================================================
   drawer-legacy-fixes.js — Drawer Legacy Fixes. Five small, one-time
   cleanup patches, all from the same July 31 2026 session, that
   correct stray saved positions left over from earlier bugs (now
   fixed at the source elsewhere). Each one runs at most once ever per
   browser -- after that it's a permanent no-op.

   Split out into its own file (Sept 4 2026) specifically so it's easy
   to remove as a whole, on its own schedule, separate from the rest
   of the Sept 4 code-hygiene split. Larry's call: he's essentially the
   only person using the live site (plus a new laptop to test with),
   so rather than guessing whether these are still needed, each fix
   below now also quietly notes whether it actually found something
   stale to clean up, or found things already fine. Check back around
   September 18, 2026 (two weeks out) -- if none of the five have
   logged a real fix on either machine by then, they're dead weight
   and this whole file can come out, with its one <script> tag removed
   from each phase page.

   To check the log from the browser console at any point:
     JSON.parse(localStorage.getItem('t2t_legacyPatchLog') || '[]')
   Each entry: { key, ranAt, foundSomethingToFix }.

   No dependency on any of the other five split files -- everything
   here reads/writes localStorage directly, exactly as it always has.
   Exposed as window.SZLegacyFixes.runAll(), called once from Desktop
   Screen's init().
   ============================================================ */

(function(){

  var LOG_KEY = 't2t_legacyPatchLog';

  function logPatchRun(key, foundSomethingToFix){
    try {
      var log = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
      log.push({ key: key, ranAt: new Date().toISOString(), foundSomethingToFix: !!foundSomethingToFix });
      // Keep it small -- this is a diagnostic breadcrumb, not a real log.
      if (log.length > 50) log = log.slice(log.length - 50);
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch(e){}
  }

  // First one-time cleanup, July 31 2026: gear/menu could get dropped
  // somewhere invisible before later fixes existed -- missing from the
  // Sign In hide rule, or claimed by a drawer slot that happened to be
  // collapsed at that instant, no feedback either way. If that already
  // happened on this browser, clear the stuck saved spot once so
  // gear/menu come back home on the very next load, same as a
  // traveler who'd never touched them.
  function fixStuckGearMenuOnce(){
    try {
      if (localStorage.getItem('t2t_gearMenuFix_20260731')) return;
      var keys = ['t2t_gearPos','t2t_claimSlot_t2t_gearPos','t2t_menuPos','t2t_claimSlot_t2t_menuPos'];
      var foundSomething = keys.some(function(k){ return localStorage.getItem(k) != null; });
      keys.forEach(function(k){ localStorage.removeItem(k); });
      localStorage.setItem('t2t_gearMenuFix_20260731', '1');
      logPatchRun('fixStuckGearMenuOnce', foundSomething);
    } catch(e){}
  }

  // Second one-time cleanup, same day -- Larry: "the nametag has been
  // changed to a weird Field Guide button that is supposed to be in
  // the missing left drawer." Not actually the nameplate (since
  // removed entirely, Sept 4 2026) -- the real Field Guide TOOL button
  // had been dragged out independently at some point and left riding
  // its own saved desktop spot, which happened to sit near the
  // nameplate's old default position. Clears Field Guide's stray saved
  // position/riding slot once so it lands back in the tool tray.
  function fixStuckFieldGuideOnce(){
    try {
      if (localStorage.getItem('t2t_fgHomeFix_20260731')) return;
      var keys = ['t2t_toolBtnPos_field-guide','t2t_claimSlot_t2t_toolBtnPos_field-guide'];
      var foundSomething = keys.some(function(k){ return localStorage.getItem(k) != null; });
      keys.forEach(function(k){ localStorage.removeItem(k); });
      localStorage.setItem('t2t_fgHomeFix_20260731', '1');
      logPatchRun('fixStuckFieldGuideOnce', foundSomething);
    } catch(e){}
  }

  // Third one-time cleanup, same day -- Larry: "those loose buttons
  // are supposed to be added to a Library tray... those loose buttons
  // seem to have a remote connection to the tools tray." Three
  // placeholder tool buttons (Excellence, Storytelling, Library) had
  // each picked up a stray claim on an earlier drop that never landed
  // cleanly. Puts all three where Larry always meant them to end up:
  // genuinely riding the right drawer's Library page as their own
  // cluster. Field Guide is deliberately left alone -- it's the real
  // navigation button, not part of this personal cluster idea.
  function fixLibraryTrayMembersOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayFix_20260731')) return;
      var ids = ['excellence', 'storytelling', 'library'];
      var foundSomething = ids.some(function(id){
        return localStorage.getItem('t2t_toolBtnPos_' + id) != null;
      });
      ids.forEach(function(id, i){
        var storeKey = 't2t_toolBtnPos_' + id;
        localStorage.removeItem(storeKey);
        localStorage.setItem('t2t_claimSlot_' + storeKey, 'right-2');
        localStorage.setItem('t2t_claimOffset_' + storeKey,
          JSON.stringify({ x: 15, y: 40 + i * 46 }));
      });
      localStorage.setItem('t2t_libraryTrayFix_20260731', '1');
      logPatchRun('fixLibraryTrayMembersOnce', foundSomething);
    } catch(e){}
  }

  // Fourth one-time cleanup, same day -- the right tray's own group
  // offset was left over from an earlier drag attempt on the grip
  // that never actually worked. Zeroing it once gives the
  // newly-migrated Library members a clean, non-overlapping starting
  // layout.
  function fixLibraryTrayOffsetOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayOffsetFix_20260731')) return;
      var prev = localStorage.getItem('t2t_trayGroupOffset_right');
      var foundSomething = !!(prev && prev !== '{"x":0,"y":0}');
      localStorage.setItem('t2t_trayGroupOffset_right', JSON.stringify({ x: 0, y: 0 }));
      localStorage.setItem('t2t_libraryTrayOffsetFix_20260731', '1');
      logPatchRun('fixLibraryTrayOffsetOnce', foundSomething);
    } catch(e){}
  }

  // Fifth one-time cleanup, same day -- Larry, testing the tray grip
  // once it finally became grabbable, hit the offset-doubling bug
  // fixed at its source elsewhere: "moving the handle moves the three
  // buttons...even on top of each other." Whatever got saved during
  // that testing is unreliable data, produced by a bug that's since
  // fixed. Re-running the same clean, stacked layout gives them a sane
  // starting point again.
  function fixLibraryTrayLayoutAgainOnce(){
    try {
      if (localStorage.getItem('t2t_libraryTrayLayoutFix2_20260731')) return;
      var ids = ['excellence', 'storytelling', 'library'];
      var foundSomething = ids.some(function(id){
        return localStorage.getItem('t2t_toolBtnPos_' + id) != null;
      });
      ids.forEach(function(id, i){
        var storeKey = 't2t_toolBtnPos_' + id;
        localStorage.removeItem(storeKey);
        localStorage.setItem('t2t_claimSlot_' + storeKey, 'right-2');
        localStorage.setItem('t2t_claimOffset_' + storeKey,
          JSON.stringify({ x: 15, y: 40 + i * 46 }));
      });
      localStorage.setItem('t2t_trayGroupOffset_right', JSON.stringify({ x: 0, y: 0 }));
      localStorage.setItem('t2t_libraryTrayLayoutFix2_20260731', '1');
      logPatchRun('fixLibraryTrayLayoutAgainOnce', foundSomething);
    } catch(e){}
  }

  window.SZLegacyFixes = {
    runAll: function(){
      fixStuckGearMenuOnce();
      fixStuckFieldGuideOnce();
      fixLibraryTrayMembersOnce();
      fixLibraryTrayOffsetOnce();
      fixLibraryTrayLayoutAgainOnce();
    }
  };

})();
