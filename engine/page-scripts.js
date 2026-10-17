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
  ['people-team/id-band.js','20261014n'],
  ['controls/alphabetical-sort-toggle.js','20261009a'],
  ['engine/header-order.js','20261010a'],
  ['people-team/id-band-controls.js','20261015v'],
  ['plans-and-tasks/plan-container.js','20261014n'],
  ['controls/subject-only-view.js','20261010a'],
  ['engine/header-data.js','20261016a'],
  ['controls/text-fit.js','20260915a'],
  ['drawer/backpack.js','20261016b'],
  ['people-team/invitations.js','20261016a'],
  ['briefing-board/styles.js','20261015c'],
  ['briefing-board/screens.js','20261010c'],
  ['briefing-board/card.js','20261015c'],
  ['briefing-board/signal-flags.js','20261010f'],
  ['briefing-board/master.js','20261015v'],
  ['maps-and-library/topic-pyramid.js','20261015u'],
  ['briefing-board/master-navigation.js','20261016a'],
  ['people-team/cast-pick-list.js','20261006d'],
  ['people-team/cast-roster.js','20260927hub'],
  ['briefing-board/operations.js','20261015e'],
  ['briefing-board/live-refresh.js','20261016b'],
  ['briefing-board/board.js','20261010j'],
  ['briefing-board/public-api.js','20261010e'],
  ['storyboard/sea-of-ideas-cluster-groups.js','20261007a'],
  ['controls/lasso-select.js','20261007a'],
  ['controls/lasso-adapters.js','20261007a'],
  ['maps-and-library/traveler-map.js','20261009a'],
  ['maps-and-library/developer-map-looking-glass.js','20261009a'],
  ['storyboard/idea-capture.js','20261015t'],
  ['maps-and-library/notebook-open.js','20261010j'],
  ['storyboard/idea-media-shared.js','20261010j'],
  ['plans-and-tasks/task-marker.js','20261010d'],
  ['plans-and-tasks/plan-step-marker.js','20261012a'],
  ['storyboard/idea-storyboard-screens.js','20261016c'],
  ['storyboard/idea-storyboard-screen-markup.js','20261016a'],
  ['plans-and-tasks/needs-plan-goals.js','20261015h'],
  ['storyboard/idea-storyboard-board-columns.js','20261016b'],
  ['storyboard/idea-storyboard-shared.js','20261015b'],
  ['storyboard/idea-storyboard-signal-flags.js','20260912a'],
  ['storyboard/idea-storyboard-people.js','20261016a'],
  ['storyboard/idea-storyboard-cluster.js','20261012d'],
  ['storyboard/story-board-template.js','20261014n'],
  ['storyboard/idea-storyboard-navigation.js','20261016a'],
  ['briefing-board/board-canvas-camera.js','20260929j'],
  ['storyboard/idea-storyboard-tiles.js','20261014m'],
  ['storyboard/idea-storyboard-header.js','20261014m'],
  ['storyboard/idea-storyboard-drag-with-arrows.js','20261016a'],
  ['maps-and-library/document-decomposition.js','20261010j'],
  ['briefing-board/card-back-style.js','20261015v'],
  ['briefing-board/card-back-options.js','20261003g'],
  ['storyboard/idea-storyboard-card-detail.js','20261015w'],
  ['storyboard/idea-storyboard-startup.js','20261014m'],
  ['people-team/sea-of-ideas-id-band.js','20261003f',['index', 'dream']],
  ['engine/session.js','20261014m'],
  ['maps-and-library/focus-front-door.js','20261014m',['index']],
  ['maps-and-library/story-reader.js','20260903a',['index']],
  ['drawer/gems.js','20261010j'],
  ['controls/drag-engine.js','20260912a'],
  ['drawer/drawer-style.js','20260904b'],
  ['engine/desktop-style.js','20260904b'],
  ['drawer/drawer-surprise-tray.js','20260906a'],
  ['maps-and-library/library-readonly.js','20261006a'],
  ['drawer/drawer-system.js','20261014n'],
  ['engine/desktop-screen.js','20260922a'],
  ['engine/tv-frame.js','20260801a'],
  ['controls/screen-fit.js','20260811c'],
  ['drawer/bookmarks.js','20261010j']
  ];
  var out='';
  for(var i=0;i<LIST.length;i++){
    var e=LIST[i];
    if(e[2]&&e[2].indexOf(page)<0)continue;
    out+='<script src="'+e[0]+'?v='+e[1]+'"><\/script>';
  }
  document.write(out);
})();
