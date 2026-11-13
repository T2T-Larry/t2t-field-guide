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
    isContainer: function(r){ return hasKind(r,'PLAN') || hasKind(r,'SHARE') || hasKind(r,'SEA'); },
    isPlanContainer: function(r){ return hasKind(r,'PLAN'); },
    isShareContainer: function(r){ return hasKind(r,'SHARE'); },
    // Nov 13 2026 (Larry: "SEA OF IDEAS is a board type, so any topic can have a SEA board"): a Sea is a board container too, kept off every Topic and
    // column list like a Plan or STORY container. Its cards sit directly under it; it has no headers, and it is the Sea's one large Parking Lot.
    isSeaContainer: function(r){ return hasKind(r,'SEA'); },
    // Nov 10 2026 (Larry: switching II. DESIGN to its PLAN board showed "A practical vision", the Topic's CONTENTS, with nothing in SUBJECT).
    // The ONE place that builds a new board container row from its Topic. It carries the Topic's SUBJECT (and the SUBJECT look) along with
    // the contents, so the container's face and the Topic read the same -- the SUBJECT is the title whenever it is not empty. Every site that
    // makes a Plan or STORY container (blank, duplicate, Briefing Board hand-off, card back, STORY board) calls this instead of hand-copying fields.
    containerFields: function(topic, kind, userId, nowIso){
      return {
        user_id:userId, content_type:'header',
        text_content:topic.text_content||'(untitled)',
        subject:topic.subject||null, subject_bold:topic.subject_bold||null, subject_caps:topic.subject_caps||null,
        subject_italic:topic.subject_italic||null, subject_colon:topic.subject_colon||null,
        cluster_id:topic.id /* a container lives UNDER the Topic it serves -- never parentless */,
        color:topic.color||null, board_type:topic.board_type||null, org_name:topic.org_name||null, locked:!!topic.locked,
        logo_url:topic.logo_url||null, logo_w:topic.logo_w||null, logo_h:topic.logo_h||null,
        storyboard_kind:kind, source_project_id:topic.id,
        track_on_briefing_board:false, created_at:nowIso||new Date().toISOString()
      };
    },
    // rows that are not board containers (use on any list of a Topic's child headers)
    withoutContainers: function(rows){
      return (rows||[]).filter(function(r){ return !window.T2TPlan.isContainer(r); });
    }
  };
})();
