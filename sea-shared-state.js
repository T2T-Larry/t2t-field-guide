/* ============================================================
   sea-shared-state.js — T2T Field Guide shared mutable state for
   the Idea Hub family (STORYBOARD / SESSION / media capture).
   Extracted July 17, 2026 while splitting sea-of-ideas.js (4,325
   lines, past the 3,500-line threshold) into three files:
   idea-storyboard-9710.js, session.js, idea-media-shared.js.

   Those three files do NOT share a closure anymore, but their
   behavior genuinely depends on shared state — which Topic/board
   is current, what path SESSION resumed at, what context idea
   capture was opened with. Rather than have each file poke at
   another file's module-scope variables (which is what the single
   sea-of-ideas.js closure let them do), every one of those shared
   variables now lives here, behind get/set accessors, plus a small
   set of "transition" helpers for the handful of actions that were
   really just writing this state and navigating (open a board, open
   the trash view, hand off from STORYBOARD into SESSION or back).

   Function-level behavior owned by one section but called from
   another (_sboardMoveCard, _isxToggleFullscreen, etc.) does NOT
   live here — those stay in their home file and get exposed via
   that file's own public surface (window.T2TStoryboard / window.T2TSession).
   This file is state + cross-section transitions ONLY.

   Load this file after header-data.js and before idea-media-shared.js,
   idea-storyboard-9710.js, and session.js — all three depend on it.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  /* ── shared state ──
     Same variables, same names, as when they lived directly in
     sea-of-ideas.js's closure — only their home has moved. */
  var _sboardCurrentTopicId = null;
  var _sboardFilter = null;
  var _isxPath = null;          // [{id,text}] apex .. current Topic
  var _isxHeaderId = null;      // null = New (defaults to current Topic's own id)
  var _isxHeaderLabel = 'New';
  var _ideaCaptureCtx = null;
  var _ideaReturnToBoard = false;
  var _ideaReturnBoardId = null;

  /* ── raw accessors ──
     For call sites that just need to read or write one piece of
     state without also navigating (e.g. SESSION reading the current
     Topic to render a ladder, media writing the Topic back after a
     save completes). */

  function getCurrentTopicId(){ return _sboardCurrentTopicId; }
  function setCurrentTopicId(v){ _sboardCurrentTopicId=v; }

  function getFilter(){ return _sboardFilter; }
  function setFilter(v){ _sboardFilter=v; }

  function getIsxPath(){ return _isxPath; }
  function setIsxPath(v){ _isxPath=v; }

  function getIsxHeaderId(){ return _isxHeaderId; }
  function setIsxHeaderId(v){ _isxHeaderId=v; }

  function getIsxHeaderLabel(){ return _isxHeaderLabel; }
  function setIsxHeaderLabel(v){ _isxHeaderLabel=v; }

  function getIdeaCaptureCtx(){ return _ideaCaptureCtx; }
  function setIdeaCaptureCtx(v){ _ideaCaptureCtx=v; }

  function getIdeaReturnToBoard(){ return _ideaReturnToBoard; }
  function setIdeaReturnToBoard(v){ _ideaReturnToBoard=v; }

  function getIdeaReturnBoardId(){ return _ideaReturnBoardId; }
  function setIdeaReturnBoardId(v){ _ideaReturnBoardId=v; }

  /* ── transition helpers ──
     The handful of actions that were previously scattered across
     sea-of-ideas.js as _ideaOpenBoard / _ideaOpenRoot / the guts of
     _sboardOpenIdeaSession / window.T2TSea's board-and-capture
     entry points. Each one is entirely "write shared state, then
     navigate" — it didn't belong to STORYBOARD or SESSION or media
     specifically, so it belongs here. Behavior is UNCHANGED from the
     original functions; only the location and, where noted, the
     removal of a same-file closure reference (replaced with an
     injected fallback or a direct T2TData call) has changed. */

  // Was _ideaOpenBoard.
  function openBoard(boardId){
    _sboardCurrentTopicId=boardId; _sboardFilter=boardId;
    T().nav('s-sea-of-ideas-cluster');
  }

  // Was _ideaOpenRoot.
  function openRoot(){
    _sboardCurrentTopicId=null; _sboardFilter=null;
    T().nav('s-sea-of-ideas-cluster');
  }

  // Was window.T2TSea.openTrash. Previously routed through the
  // _sboardEnsureTrashHeader thin wrapper around T2TData — that
  // wrapper is gone now, this calls T2TData directly.
  async function openTrash(){
    try{
      var tid=await window.T2TData.ensureTrashHeader();
      _sboardFilter=tid;
    }catch(e){ _sboardFilter=null; }
    T().nav('s-sea-of-ideas-cluster');
  }

  // Was window.T2TSea.openIdeaCapture.
  function openIdeaCapture(ctx){
    _ideaCaptureCtx=ctx||null;
    _ideaReturnToBoard=!!(ctx&&ctx.returnToBoard);
    _ideaReturnBoardId=(ctx&&ctx.boardId!==undefined)?ctx.boardId:null;
    T().nav('s-idea-session');
  }

  // Was the guts of _sboardOpenIdeaSession (9710 → 9711 hand-off).
  // STORYBOARD used to fall back to its own _sboardAllRowsById cache
  // if T2TData.ancestorChain came back empty/errored — this file has
  // no such cache, so that lookup is now injected by the caller
  // (idea-storyboard-9710.js keeps a one-line wrapper that passes its
  // own cache in as fallbackRowLookup). Behavior is unchanged.
  async function openIdeaSessionFromBoard(topicId, fallbackRowLookup){
    if(!topicId){ _isxPath=null; T().nav('s-idea-session'); return; }
    try{
      var chain=(window.T2TData && window.T2TData.ancestorChain) ? await window.T2TData.ancestorChain(topicId) : null;
      if(chain && chain.length){ _isxPath=chain; }
      else{
        var row=fallbackRowLookup?fallbackRowLookup(topicId):null;
        _isxPath=[{id:topicId, text:row?(row.text_content||'(untitled)'):'(untitled)'}];
      }
    }catch(e){
      var row2=fallbackRowLookup?fallbackRowLookup(topicId):null;
      _isxPath=[{id:topicId, text:row2?(row2.text_content||'(untitled)'):'(untitled)'}];
    }
    _isxHeaderId=null; _isxHeaderLabel='New';
    T().nav('s-idea-session');
  }

  // Was window.T2TSea.getCurrentBoardContext.
  function getCurrentBoardContext(){
    return _sboardCurrentTopicId?{boardId:_sboardCurrentTopicId}:null;
  }

  window.T2TSeaState = {
    // raw accessors
    getCurrentTopicId: getCurrentTopicId,
    setCurrentTopicId: setCurrentTopicId,
    getFilter: getFilter,
    setFilter: setFilter,
    getIsxPath: getIsxPath,
    setIsxPath: setIsxPath,
    getIsxHeaderId: getIsxHeaderId,
    setIsxHeaderId: setIsxHeaderId,
    getIsxHeaderLabel: getIsxHeaderLabel,
    setIsxHeaderLabel: setIsxHeaderLabel,
    getIdeaCaptureCtx: getIdeaCaptureCtx,
    setIdeaCaptureCtx: setIdeaCaptureCtx,
    getIdeaReturnToBoard: getIdeaReturnToBoard,
    setIdeaReturnToBoard: setIdeaReturnToBoard,
    getIdeaReturnBoardId: getIdeaReturnBoardId,
    setIdeaReturnBoardId: setIdeaReturnBoardId,
    // transition helpers
    openBoard: openBoard,
    openRoot: openRoot,
    openTrash: openTrash,
    openIdeaCapture: openIdeaCapture,
    openIdeaSessionFromBoard: openIdeaSessionFromBoard,
    getCurrentBoardContext: getCurrentBoardContext
  };

})();
