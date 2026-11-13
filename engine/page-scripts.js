/* One shared script list for every phase page (index, dream, believe, dare, journey).
   Larry, Oct 16 2026: "One tree. One code whenever possible." Each page used to keep its own
   hand-copied list of script tags, so a new feature could be added to some pages and forgotten
   on others (screen-fit.js once missing from believe/dare/journey; six files were stale on
   dream/believe/dare/journey on Oct 16).

   HOW TO USE
   - Add or remove a script, or bump a version, ONLY in the list below. Order matters: scripts
     load top to bottom, exactly as the old tags did.
   - A third item (['index','dream']) means "only these pages"; no third item means every page.
   - Each page loads this file with: <script src="engine/page-scripts.js" data-page="dream"></script>
     (it must sit in the <head>, where the old script tags were). */
(function(){
  var page=(document.currentScript&&document.currentScript.getAttribute('data-page'))||'';
  var LIST=[
  ['engine/supabase-library.js','20260913b'],
  ['engine/shared-t2t-access.js','20261010a'],
  ['controls/add-control.js','20261003a'],
  ['controls/signal-flag-core.js','20261113a'],
  ['controls/align-flags.js','20261108b'],
  ['controls/flag-counts.js','20261028a'],
  ['controls/links.js','20261111d'],
  ['controls/linked-words.js','20261112h'],
  ['controls/window-drag.js','20261112a'],
  ['people-team/team-button.js','20261112b'],
  ['people-team/personnel-page.js','20261031a'],
  ['controls/settings-menu.js','20260922a'],
  ['people-team/member-identity.js','20261010j'],
  ['controls/shortcuts-list.js','20261109a'],
  ['people-team/id-band.js','20261106b'],
  ['controls/card-order.js','20261017a'],
  ['people-team/id-band-controls.js','20261113a'],
  ['people-team/keep-lost-details.js','20261113a'],
  ['controls/card-kind-switch.js','20261113a'],
  ['people-team/id-band-moves.js','20261113c'],
  ['plans-and-tasks/plan-container.js','20261113a'],
  ['controls/subject-only-view.js','20261010a'],
  ['controls/subject-look.js','20261112a'],
  ['controls/card-display-options.js','20261106a'],
  ['engine/header-data.js','20261113a'],
  ['controls/text-fit.js','20260915a'],
  ['controls/auto-grow-field.js','20261106a'],
  ['controls/my-words.js','20261113a'],
  ['controls/glow.js','20261106c'],
  ['drawer/backpack.js','20261028g'],
  ['people-team/invitations.js','20261016a'],
  ['briefing-board/styles.js','20261103f'],
  ['briefing-board/screens.js','20261112b'],
  ['briefing-board/card.js','20261111b'],
  ['briefing-board/signal-flags.js','20261113a'],
  ['briefing-board/master.js','20261113b'],
  ['maps-and-library/topic-pyramid.js','20261113a'],
  ['briefing-board/master-navigation.js','20261112b'],
  ['people-team/cast-pick-list.js','20261112b'],
  ['people-team/cast-roster.js','20261024z'],
  ['briefing-board/operations.js','20261112a'],
  ['briefing-board/live-refresh.js','20261025a'],
  ['briefing-board/board.js','20261103a'],
  ['briefing-board/public-api.js','20261102a'],
  ['storyboard/sea-of-ideas-cluster-groups.js','20261113a'],
  ['controls/lasso-select.js','20261007a'],
  ['controls/lasso-adapters.js','20261029b'],
  ['maps-and-library/traveler-map.js','20261009a'],
  ['maps-and-library/developer-map-looking-glass.js','20261009a'],
  ['storyboard/idea-capture.js','20261105b'],
  ['maps-and-library/notebook-open.js','20261113a'],
  ['storyboard/idea-media-shared.js','20261106a'],
  ['plans-and-tasks/task-marker.js','20261010d'],
  ['plans-and-tasks/plan-step-marker.js','20261012a'],
  ['storyboard/idea-storyboard-saved-copy.js','20261028a'],
  ['storyboard/idea-storyboard-screens.js','20261113b'],
  ['storyboard/idea-storyboard-screen-markup.js','20261113a'],
  ['plans-and-tasks/needs-plan-goals.js','20261102a'],
  ['storyboard/idea-storyboard-board-columns.js','20261113b'],
  ['storyboard/idea-storyboard-shared.js','20261113b'],
  ['storyboard/idea-storyboard-signal-flags.js','20261113a'],
  ['storyboard/idea-storyboard-people.js','20261108a'],
  ['storyboard/idea-storyboard-cluster.js','20261107a'],
  ['storyboard/story-board-template.js','20261014n'],
  ['storyboard/idea-storyboard-navigation.js','20261113a'],
  ['briefing-board/board-canvas-camera.js','20261031a'],
  ['storyboard/idea-storyboard-tiles.js','20261113b'],
  ['storyboard/idea-storyboard-header.js','20261112i'],
  ['storyboard/idea-storyboard-drag-with-arrows.js','20261016a'],
  ['storyboard/idea-storyboard-lasso.js','20261109a'],
  ['maps-and-library/document-decomposition.js','20261010j'],
  ['briefing-board/card-back-style.js','20261113a'],
  ['briefing-board/card-back-options.js','20261106a'],
  ['briefing-board/card-back-fixed-rows.js','20261113a'],
  ['briefing-board/card-go-there.js','20261111a'],
  ['briefing-board/creative-process-badge.js','20261108a'],
  ['briefing-board/card-type-checklists.js','20261024b'],
  ['storyboard/note-hub.js','20261113b'],
  ['storyboard/idea-storyboard-notes-back.js','20261112a'],
  ['storyboard/idea-storyboard-card-detail.js','20261113i'],
  ['storyboard/new-card-door.js','20261104a'],
  ['storyboard/idea-storyboard-startup.js','20261106a'],
  ['people-team/sea-of-ideas-id-band.js','20261003f',['index', 'dream']],
  ['engine/session.js','20261113a'],
  ['maps-and-library/focus-front-door.js','20261014m',['index']],
  ['maps-and-library/story-reader.js','20260903a',['index']],
  ['drawer/gems.js','20261025a'],
  ['controls/drag-engine.js','20261113a'],
  ['drawer/drawer-style.js','20261113a'],
  ['engine/desktop-style.js','20261113a'],
  ['drawer/drawer-surprise-tray.js','20261113a'],
  ['maps-and-library/library-readonly.js','20261021r'],
  ['drawer/drawer-system.js','20261113a'],
  ['engine/t2t-hub-screen.js','20261025p'],
  ['engine/desktop-screen.js','20261113a'],
  ['engine/tv-frame.js','20261113a'],
  ['controls/screen-fit.js','20261107a'],
  ['drawer/bookmarks.js','20261025p'],
  ['engine/update-watcher.js','20261101i']
  ];
  var out='';
  for(var i=0;i<LIST.length;i++){
    var e=LIST[i];
    if(e[2]&&e[2].indexOf(page)<0)continue;
    out+='<script src="'+e[0]+'?v='+e[1]+'"><\/script>';
  }
  document.write(out);
})();
