// plan-container.js -- Oct 14 2026 (Larry: "add the 7 plan containers to the one tree ... make sure that does not happen again").
// A BOARD CONTAINER is the one row that holds a Topic's Plan board (storyboard_kind 'PLAN') or its STORY board (storyboard_kind 'SHARE'),
// tagged (source_project_id) to the Topic it serves. It used to be a parentless root outside the one tree. It now lives directly UNDER the
// Topic it serves (cluster_id === source_project_id). This module is the single place that says what a board container is, so every list
// that walks the tree can leave it out of Topic and column lists and every lookup can find it in either layout (parentless or under its
// Topic) while the move is in progress.
// Oct 14 2026 (STORY board): a STORY board container is the same kind of row as a Plan container, so isContainer covers both and every
// list that already leaves Plan containers out leaves STORY containers out too. isShareContainer / isPlanContainer say which one it is.
(function(){
  function hasKind(r, kind){
    if(!r || r.storyboard_kind!==kind || !r.source_project_id) return false;
    return !r.cluster_id || String(r.cluster_id)===String(r.source_project_id);
  }
  window.T2TPlan={
    isContainer: function(r){ return hasKind(r,'PLAN') || hasKind(r,'SHARE'); },
    isPlanContainer: function(r){ return hasKind(r,'PLAN'); },
    isShareContainer: function(r){ return hasKind(r,'SHARE'); },
    // rows that are not board containers (use on any list of a Topic's child headers)
    withoutContainers: function(rows){
      return (rows||[]).filter(function(r){ return !window.T2TPlan.isContainer(r); });
    }
  };
})();
