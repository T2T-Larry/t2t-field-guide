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
  ['people-team/team-button.js','20261016a'],
  ['controls/settings-menu.js','20260922a'],
  ['people-team/member-identity.js','20261010j'],
  ['controls/shortcuts-list.js','20260922p'],
  ['people-team/id-band.js','20261021h'],
  ['controls/card-order.js','20261017a'],
  ['people-team/id-band-controls.js','20261021h'],
  ['plans-and-tasks/plan-container.js','20261014n'],
  ['controls/subject-only-view.js','20261010a'],
  ['engine/header-data.js','20261021q'],
  ['controls/text-fit.js','20260915a'],
  ['drawer/backpack.js','20261021h'],
  ['people-team/invitations.js','20261016a'],
  ['briefing-board/styles.js','20261020q'],
  ['briefing-board/screens.js','20261021e'],
  ['briefing-board/card.js','20261020p'],
  ['briefing-board/signal-flags.js','20261021p'],
  ['briefing-board/master.js','20261021p'],
  ['maps-and-library/topic-pyramid.js','20261015u'],
  ['briefing-board/master-navigation.js','20261021p'],
  ['people-team/cast-pick-list.js','20261006d'],
  ['people-team/cast-roster.js','20260927hub'],
  ['briefing-board/operations.js','20261021o'],
  ['briefing-board/live-refresh.js','20261016b'],
  ['briefing-board/board.js','20261020c'],
  ['briefing-board/public-api.js','20261018a'],
  ['storyboard/sea-of-ideas-cluster-groups.js','20261021f'],
  ['controls/lasso-select.js','20261007a'],
  ['controls/lasso-adapters.js','20261018a'],
  ['maps-and-library/traveler-map.js','20261009a'],
  ['maps-and-library/developer-map-looking-glass.js','20261009a'],
  ['storyboard/idea-capture.js','20261021b'],
  ['maps-and-library/notebook-open.js','20261010j'],
  ['storyboard/idea-media-shared.js','20261021f'],
  ['plans-and-tasks/task-marker.js','20261010d'],
  ['plans-and-tasks/plan-step-marker.js','20261012a'],
  ['storyboard/idea-storyboard-screens.js','20261021p'],
  ['storyboard/idea-storyboard-screen-markup.js','20261021f'],
  ['plans-and-tasks/needs-plan-goals.js','20261018a'],
  ['storyboard/idea-storyboard-board-columns.js','20261021o'],
  ['storyboard/idea-storyboard-shared.js','20261017a'],
  ['storyboard/idea-storyboard-signal-flags.js','20260912a'],
  ['storyboard/idea-storyboard-people.js','20261016a'],
  ['storyboard/idea-storyboard-cluster.js','20261021o'],
  ['storyboard/story-board-template.js','20261014n'],
  ['storyboard/idea-storyboard-navigation.js','20261021o'],
  ['briefing-board/board-canvas-camera.js','20260929j'],
  ['storyboard/idea-storyboard-tiles.js','20261021o'],
  ['storyboard/idea-storyboard-header.js','20261021p'],
  ['storyboard/idea-storyboard-drag-with-arrows.js','20261016a'],
  ['maps-and-library/document-decomposition.js','20261010j'],
  ['briefing-board/card-back-style.js','20261020a'],
  ['briefing-board/card-back-options.js','20261018b'],
  ['briefing-board/card-back-fixed-rows.js','20261020e'],
  ['storyboard/idea-storyboard-card-detail.js','20261021a'],
  ['storyboard/idea-storyboard-startup.js','20261018a'],
  ['people-team/sea-of-ideas-id-band.js','20261003f',['index', 'dream']],
  ['engine/session.js','20261021q'],
  ['maps-and-library/focus-front-door.js','20261014m',['index']],
  ['maps-and-library/story-reader.js','20260903a',['index']],
  ['drawer/gems.js','20261010j'],
  ['controls/drag-engine.js','20260912a'],
  ['drawer/drawer-style.js','20260904b'],
  ['engine/desktop-style.js','20261021i'],
  ['drawer/drawer-surprise-tray.js','20260906a'],
  ['maps-and-library/library-readonly.js','20261021r'],
  ['drawer/drawer-system.js','20261021j'],
  ['engine/t2t-hub-screen.js','20261021p'],
  ['engine/desktop-screen.js','20261021i'],
  ['engine/tv-frame.js','20260801a'],
  ['controls/screen-fit.js','20260811c'],
  ['drawer/bookmarks.js','20261010j'],
  ['engine/update-watcher.js','20261018a']
  ];
  var out='';
  for(var i=0;i<LIST.length;i++){
    var e=LIST[i];
    if(e[2]&&e[2].indexOf(page)<0)continue;
    out+='<script src="'+e[0]+'?v='+e[1]+'"><\/script>';
  }
  document.write(out);
})();
