// plan-container.js -- Oct 14 2026 (Larry: "add the 7 plan containers to the one tree ... make sure that does not happen again").
// A PLAN CONTAINER is the one row that holds a Topic's Plan board: storyboard_kind 'PLAN', tagged (source_project_id) to the Topic it serves.
// It used to be a parentless root outside the one tree. It now lives directly UNDER the Topic it serves (cluster_id === source_project_id).
// This module is the single place that says what a plan container is, so every list that walks the tree can leave it out of Topic and column
// lists and every lookup can find it in either layout (parentless or under its Topic) while the move is in progress.
(function(){
  window.T2TPlan={
    isContainer: function(r){
      if(!r || r.storyboard_kind!=='PLAN' || !r.source_project_id) return false;
      return !r.cluster_id || String(r.cluster_id)===String(r.source_project_id);
    },
    // rows that are not plan containers (use on any list of a Topic's child headers)
    withoutContainers: function(rows){
      return (rows||[]).filter(function(r){ return !window.T2TPlan.isContainer(r); });
    }
  };
})();
