/* ============================================================
   id-band.js — T2T Field Guide shared ID Band tokens
   Created Sept 8 2026 (Session 275/276), Larry: "Before leaving the
   ID BAND: the band crosses all types of boards. Does it have its
   own files?" ... "They will apply on PLAN and SHARE boards soon as
   well. Simplify now for future expansion and possible features."

   The ID Band is the header identity strip every board carries --
   TOPIC's chip, the big board-kind name (IDEA / Briefing Board /
   Plan / Share), the small arrow chips beside TOPIC and PROJECT, and
   the popup menu those arrows open. Since the Sept 6 2026 "make all
   ID bands exactly the same look (other than color)" pass, briefing-
   board.js and idea-storyboard-9710.js have each carried their OWN
   hand-typed copy of the numbers that are supposed to match, kept in
   sync only by a comment in each file pointing at the other. Change
   one, forget the other, and the bands quietly drift again -- which
   is exactly what already happened to the logo's minFrameFromCrop
   value (10 on Briefing Board, 12 on the Idea Board; flagged for
   Larry to pick one, not silently resolved here).

   This file is the one place those shared numbers live now. Board
   files read IDBand.TOKENS instead of carrying their own copy of a
   number that's meant to be identical everywhere. Every value below
   was pulled from the CURRENT LIVE code (Briefing Board is the
   canonical side per the "when they drift, Idea Board is brought up
   to match BB" rule) -- this file only reorganizes where the number
   lives, it does not change what either board looks like today.

   Board-specific things stay board-specific and are NOT here: each
   board's own colors, its accent/ink/bg CSS variables, font-family
   choice, and its own grid/flex layout. Only the numbers explicitly
   called out as "matched to X" moved.

   Not yet wired into the not-yet-built Plan and Share boards -- this
   is where their ID Band numbers should come from once those boards
   exist, instead of each starting its own hand-copied set.

   Load this file before briefing-board.js and idea-storyboard-9710.js
   (and before whatever Plan/Share end up being called).
   ============================================================ */

(function(){

  window.IDBand = {
    TOKENS: {
      // TOPIC's own chip (bb-topic-hit / #sc-topic-box). boxShadow added
      // Sept 27 2026 -- Larry liked the "glow" the Idea/Blue Sky board's
      // TOPIC box already had (its own hand-copied box-shadow, never on
      // BB's matching chip) and asked for it on every board; pulled into
      // this shared token, same fix as the rest of this file's own
      // opening comment, rather than copying the value into BB's rule by
      // hand a second time.
      topicBox: { fontSize:44, radius:8, padding:'2px 16px', lineHeight:1.15, boxShadow:'0 3px 10px rgba(0,0,0,0.28)' },

      // The big centered board-kind name (bb-mh / sc-board-kind-trigger):
      // "Briefing Board", "IDEA", and (soon) "Plan" / "Share".
      boardKindLabel: { fontSize:36 },

      // The up/down chevrons riding right against TOPIC itself
      // (bb-topic-caret / sc-topic-caret).
      topicCaret: { width:34, glyphSize:18 },

      // The small standalone arrow chip beside PROJECT/PARENT
      // (bb-parent-caret / sc-project-caret).
      pickerCaret: { width:24, height:30, glyphSize:14 },

      // The popup menu shell every ID Band dropdown opens into
      // (bb-cdrop-menu / sc-cdrop-menu), plus its row.
      dropdownMenu: { radius:8, zIndex:99999, padding:4, maxHeight:240, minWidth:120 },
      dropdownRow: { padding:'6px 10px', fontSize:11, radius:6 },

      // Logo footprint -- T2TLogo already shares the render/crop
      // code itself; this is just the size range every board's own
      // *LogoCfg describes. minFrameFromCrop deliberately NOT
      // included here yet: Briefing Board currently uses 10, the
      // Idea Board 12 -- a real drift, not a formatting difference,
      // and not this file's call to pick one silently.
      logo: { minSize:20, maxSize:90, defaultSize:30 },

      // PROJECT and STORYBOARD (formerly the board-kind label), Sept 15
      // 2026 -- Larry: "all the actual fields should look like the TOPIC
      // field with white background and frame... PROJECT and Board Type
      // [now STORYBOARD] are the same size and smaller than TOPIC."
      // Same look template as topicBox (white bg, board's-own-color
      // frame, same font/radius family) at a smaller size, with a single
      // down-arrow only -- neither field has an "up" the way TOPIC does
      // (PROJECT always mirrors TOPIC's own top-of-hierarchy ancestor;
      // STORYBOARD's five options are a flat set, not a hierarchy).
      // fontSize corrected 30->14 same day, once PROJECT/STORYBOARD/VIEW
      // actually got wired to this token (briefing-board-styles.js
      // .bb-mh-field-trigger) instead of each carrying its own ad hoc
      // inline style -- 14/30/120 is PROJECT's real, already-live size
      // (bb-board-trigger's Sept 5 2026 bump), which is what "PROJECT
      // and Board Type are the same size" actually means; 30 here was
      // this token's first pass, written before anything read it.
      fieldBox: { fontSize:14, height:30, maxWidth:120, radius:8, padding:'2px 12px', lineHeight:1.15 },
      fieldCaret: { width:24, glyphSize:14 },

      // The VIEW/RETURN/GEAR/CLOSE icon row riding the far right of
      // every ID Band (bb-icon-btn / sc-hdr-btn-muted+sc-hdr-btn-icon).
      // Sept 20 2026, Larry: "ID BAND buttons need white backgrounds.
      // Same for ALL boards now and in future" -- Briefing Board's own
      // .bb-icon-btn (white bg, 30x30, 6px radius, board-accent frame)
      // was already right; the Idea Board's version had drifted to a
      // near-transparent "muted" look (readable on BB's own top band,
      // not on the Idea Board's) plus a solid-gray one-off for VIEW.
      // Both are brought up to this token now, and it's the one place
      // a future Plan/Share board's own icon row should read from
      // instead of hand-copying either board's numbers again.
      iconBtn: { size:30, radius:6, borderWidth:1.5 }
    }
  };

  // RETURN button, Sept 15 2026 -- Bill: "a RETURN button to jump back
  // to the last screen." Scoped to the one concrete case this ID Band
  // itself creates: switching STORYBOARD kind (IDEAS/PLAN/TASKS/SHARE/
  // ROLES) navigates you away from wherever you were. recordReturn is
  // called right before that jump, from each board's own STORYBOARD
  // dropdown handler; consumeReturn is read once by the RETURN button
  // and clears itself so a second press doesn't jump again with stale
  // state. Deliberately a single remembered stop, not a full history
  // stack -- "the last screen," not "every screen."
  var _lastBoard = null;
  window.IDBand.recordReturn = function(kind, topicId){
    _lastBoard = { kind: kind, topicId: topicId||null };
  };
  window.IDBand.consumeReturn = function(){
    var v = _lastBoard;
    _lastBoard = null;
    return v;
  };
  window.IDBand.hasReturn = function(){ return !!_lastBoard; };

  // The Board Type list every ID Band's dropdown offers, in display order.
  // Sept 29 2026 -- Larry: "ALL boards should have exactly the same ID
  // BAND," and SEA OF IDEAS belongs above BLUE SKY. This used to be two
  // hand-copied arrays (idea-storyboard-navigation.js's _sboardBoardKinds
  // and briefing-board-master-nav.js's _bbBoardKinds, each with a comment
  // saying "kept in sync with the other") -- the same change-one-forget-
  // the-other drift this file exists to stop. Every board's dropdown reads
  // this one list now, so adding or reordering a board type is one edit.
  // value is the internal name each board's own click handler keys off;
  // label is the displayed word; soon (optional) is the toast for a board
  // type that has no screen yet.
  window.IDBand.BOARD_KINDS = [
    {value:'SEA',            label:'SEA OF IDEAS', soon:null},
    {value:'IDEA',           label:'BLUE SKY',     soon:null},
    {value:'PLAN',           label:'PATHFINDER',   soon:null},
    {value:'BRIEFING BOARD', label:'BRIEFING',     soon:null},
    {value:'SHARE',          label:'STORY',        soon:'STORY BOARD coming soon'},
    {value:'CAST',           label:'CAST',         soon:null}
  ];

  // Shared RETURN click handler -- both boards' RETURN button call this
  // directly rather than each re-implementing the same dispatch.
  window.IDBand.jumpToRecorded = function(){
    var v=window.IDBand.consumeReturn();
    if(!v) return false;
    if(v.kind==='BRIEFING BOARD'){
      if(window.T2TBriefingBoard && window.T2TBriefingBoard.jumpToTopic) window.T2TBriefingBoard.jumpToTopic(v.topicId);
      return true;
    }
    if(v.kind==='IDEA' || v.kind==='PLAN'){
      if(window.T2TStoryboard && window.T2TStoryboard.jumpToProjectKind) window.T2TStoryboard.jumpToProjectKind(v.topicId, v.kind);
      return true;
    }
    // Sept 29 2026 -- SEA OF IDEAS is a board type too: T2TMedia.openIdeaSession
    // reads the topic to open from T2TShared.currentTopicId.
    if(v.kind==='SEA'){
      if(window.T2TShared && v.topicId) window.T2TShared.currentTopicId=v.topicId;
      if(window.T2TMedia && window.T2TMedia.openIdeaSession) window.T2TMedia.openIdeaSession();
      return true;
    }
    return false;
  };

  // isAccountRoot, Sept 22 2026 -- Larry, after the MASTER-mislabel bug
  // report: "Does it have its own files? Do we have duplicate files?"
  // This file already stopped the visual numbers (fontSize, radius, etc.)
  // from being hand-copied per board; the MASTER/root TEST itself was
  // never brought in here though, so it had quietly drifted the same way
  // those numbers used to. Briefing Board's own copy called any row with
  // no parent "root" -- which also matches a real top-level project like
  // "Share" that simply has no parent of its own -- so it showed MASTER
  // for Share too. The Idea Board's copy already did this the safe way:
  // compare the row's actual id against the real, fetched root id, not
  // just "does it have a parent." One shared function now, so Plan and
  // Share (still to be built) read the same rule instead of a third
  // hand-typed copy, and so a future fix here reaches every board at once.
  //
  // row: {id, cluster_id} for whatever header/project is currently in
  // view -- null/undefined if nothing's resolved yet.
  // rootId: the board's own already-fetched account-root id (each board
  // still fetches this itself, via T2TData.ensureIdeaStoryboardsRoot --
  // that part was always identical and isn't what drifted).
  // PROJECT naming rule, Sept 22 2026 -- Larry: "PROJECTS is never a
  // project. MASTER is the highest project. Parking Lot is never a
  // project." PROJECTS is only the internal name of the account-root
  // row (and of the one shared MASTER Briefing Board); Parking Lot is a
  // bucket inside a project, never a project itself. So anywhere a
  // PROJECT is NAMED (eyebrows, PROJECT fields, pickers), those names --
  // or no project at all, or the account root itself -- read MASTER.
  // One shared rule so every board reads it the same way.
  window.IDBand.isNonProjectName = function(name){
    var n=String(name==null?'':name).trim().toLowerCase();
    return n==='projects' || n==='parking lot' || n==='-' || n==='\u2013' || n==='master';
  };
  window.IDBand.projectLabel = function(name, id, rootId){
    if(id && rootId && String(id)===String(rootId)) return 'MASTER';
    var n=String(name==null?'':name).trim();
    if(!n || window.IDBand.isNonProjectName(n)) return 'MASTER';
    return n;
  };

  // TOPIC label, Sept 26 2026 -- Larry: "PROJECTS carries a competitive
  // connotation with PM apps... change it to TOPICS." The account-root
  // row's stored text_content stays the internal name 'PROJECTS' (every
  // reserved-word check across the codebase -- RESERVED_HEADERS,
  // isNonProjectName, the various EXCLUDE/ANYWHERE_RESERVED lists --
  // keys off that literal string, same as PROJECT already keeps 'MASTER'
  // display-only rather than renaming the row). So this mirrors
  // projectLabel exactly: display-only override at the one spot TOPIC is
  // rendered, real name untouched underneath.
  //
  // Sept 27 2026 -- Larry, one day later: "always 2 fields on the top:
  // the first is the topic pyramid with MASTER at the apex. Second field
  // is the board type. ANY topic can be viewed via any board type." So
  // TOPIC stays permanently visible (no more hiding it at the root, and
  // no more moving MASTER onto Board Type -- Board Type is independent of
  // which Topic you're viewing, never MASTER-prefixed) -- it just reads
  // MASTER instead of TOPICS once you're standing at the very top of the
  // pyramid, same as PROJECT's own root label always has.
  window.IDBand.topicLabel = function(name, id, rootId){
    if(id && rootId && String(id)===String(rootId)) return 'MASTER';
    var n=String(name==null?'':name).trim();
    if(!n) return 'MASTER';
    return n;
  };

  window.IDBand.isAccountRoot = function(row, rootId){
    // Nothing to compare yet -- both boards already treated this as "root"
    // (nothing narrower to show), so that stays the shared behavior.
    if(!row) return true;
    // Root id itself never resolved (a failed fetch) -- degrade to the
    // old pre-migration "has no parent" test rather than guessing either
    // way. Documented original rationale (briefing-board-master.js,
    // _bbIsProjectRoot): "a failed fetch shouldn't mark every real
    // project as a nested layer" -- kept here as the one shared fallback.
    if(!rootId) return !row.cluster_id;
    return String(row.id)===String(rootId);
  };

  // ============================================================
  // Shared ID Band ROW LAYOUT, Sept 27 2026 -- Larry, after noticing BB
  // and the Idea Board's ID Bands had drifted apart again (the PROJECT-
  // field retirement shipped to BB but not to the Idea Board): "When a
  // change is made to the ID BAND, it should apply to all boards... can
  // we consolidate codes?"
  //
  // This is the second kind of drift this file exists to stop -- the
  // first (TOKENS, topicLabel/projectLabel/isAccountRoot, above) covered
  // the numbers and naming rules; this covers the actual pixel-geometry
  // functions (position the chain, shrink the STORYBOARD label to fit,
  // watch for resizes) that BB and the Idea Board had each hand-copied
  // into their own file -- _bbPositionIdBandRow/_bbFitBoardKindLabel/
  // _bbSetUpIdBandObserver (briefing-board-master-nav.js) and
  // _sboardPositionIdBandRow/_sboardFitBoardKindLabel/_sboardSetUp-
  // IdBandObserver (idea-storyboard-navigation.js) were byte-for-byte
  // the same math under different variable names. One board's Sept 27
  // simplification (three fields down to two) updated its own copy and
  // silently left the other's three-field version in place -- exactly
  // the "change one, forget the other" failure this file's own opening
  // comment already warned about.
  //
  // Each board keeps its own small wrapper function under its own old
  // name (_bbPositionIdBandRow, _sboardPositionIdBandRow, ...) -- every
  // existing call site across both boards' files keeps working
  // unchanged -- but the wrapper's BODY now just hands its own DOM
  // elements to the one shared implementation below. A future geometry
  // fix (or a third board's Plan/Share ID Band) changes it here once,
  // for everyone, instead of needing the same hand-copy-and-hope
  // treatment a third time.

  // Generic shrink-to-fit for a board-kind-style label. Resets to the
  // stylesheet's natural size first so this never ratchets smaller
  // across repeated calls, then only shrinks -- never grows past what
  // the stylesheet already sets. Reuses window.FGFitFontSize
  // (text-fit.js), the same one-line shrink every board title uses.
  window.IDBand.fitLabelToWidth = function(triggerId, availableWidthPx, defaultBaseSize){
    var trigger=document.getElementById(triggerId);
    if(!trigger || !window.FGFitFontSize) return;
    trigger.style.fontSize='';
    if(!availableWidthPx || availableWidthPx<=0) return;
    var cs=getComputedStyle(trigger);
    var baseSize=parseFloat(cs.fontSize)||defaultBaseSize||36;
    var fitted=window.FGFitFontSize(trigger.textContent, availableWidthPx, {
      base:baseSize, min:Math.max(14, Math.round(baseSize*0.4)), step:0.5,
      fontFamily:cs.fontFamily, fontWeight:cs.fontWeight, oneLine:true
    });
    if(fitted<baseSize) trigger.style.fontSize=fitted+'px';
  };

  // Positions a left-to-right chain of ID Band fields (cfg.fields, real
  // elements already resolved by the caller -- not ids, since BB finds
  // its container by class/querySelector while the Idea Board's has an
  // id, and forcing one lookup style on both boards would be exactly
  // the kind of "make the boards identical" overreach Larry's own
  // board-should-look-unique note (Sept 27 2026, t2t-field-guide memory)
  // warns against; only the MATH is shared here, never the markup or
  // colors) as one group, centered on cfg.container, clamped so it
  // never runs under cfg.actionsEl (Logo/Utility/Close, pinned to the
  // header's right edge) or past cfg.idnEl (the top-left identity
  // block) on the left. Every field vertical-centers on the container --
  // the shape both boards converged on once each board's own PROJECT-
  // style field was retired and TOPIC/STORYBOARD became a plain matched
  // pair (no more of the old center/bottom-justify split that existed
  // only to reconcile TOPIC's bigger box against a smaller PROJECT).
  //
  // cfg: {container, actionsEl, idnEl, gap, fields:[el,...],
  //       fitLabelId, fitBaseSize}
  // fitLabelId (optional): id of the LAST field's own label trigger,
  // shrunk to whatever width is left once every other field's real
  // width is accounted for -- same "measure the fixed boxes first, fit
  // the flexible one into what's left" order both boards always used.
  // Returns false (nothing moved) when an element hasn't laid out yet
  // -- same not-ready guard both boards' own versions already had.
  window.IDBand.positionRow = function(cfg){
    var gap=cfg.gap||10;
    var container=cfg.container, actionsEl=cfg.actionsEl, idnEl=cfg.idnEl;
    var wraps=cfg.fields||[];
    if(!container || !actionsEl || !wraps.length || wraps.some(function(w){return !w;})) return false;

    var containerRect=container.getBoundingClientRect();
    if(!containerRect.width) return false;

    var rects=wraps.map(function(w){ return w.getBoundingClientRect(); });
    for(var i=0;i<rects.length-(cfg.fitLabelId?1:0);i++){ if(!rects[i].width) return false; }

    if(cfg.fitLabelId){
      var fixedWidth=0;
      for(var j=0;j<rects.length-1;j++) fixedWidth+=rects[j].width;
      var available=containerRect.width-fixedWidth-(gap*rects.length);
      window.IDBand.fitLabelToWidth(cfg.fitLabelId, Math.max(24, available), cfg.fitBaseSize);
      rects[rects.length-1]=wraps[wraps.length-1].getBoundingClientRect();
    }
    if(!rects[rects.length-1].width) return false;

    var totalWidth=0;
    rects.forEach(function(r,i){ totalWidth+=r.width; if(i<rects.length-1) totalWidth+=gap; });

    var rightLimit=actionsEl.getBoundingClientRect().left-gap;
    var leftLimit=containerRect.left;
    if(idnEl){
      var idr=idnEl.getBoundingClientRect();
      if(idr.width) leftLimit=Math.max(leftLimit, idr.right+gap);
    }
    var preferredLeft=containerRect.left+(containerRect.width-totalWidth)/2;
    var groupLeft=Math.min(Math.max(preferredLeft, leftLimit), Math.max(leftLimit, rightLimit-totalWidth));

    var x=groupLeft;
    wraps.forEach(function(w,i){
      w.style.left=(x-containerRect.left)+'px';
      x+=rects[i].width+gap;
    });
    wraps.forEach(function(w){
      var r=w.getBoundingClientRect();
      if(r.height && containerRect.height) w.style.top=((containerRect.height-r.height)/2)+'px';
    });
    return true;
  };

  // ResizeObserver wiring shared the same way -- both boards had hand-
  // copied this too. Keyed by screenId (not a single shared boolean) so
  // BB's own setup and the Idea Board's own setup don't stomp on each
  // other the one time both screens have ever been built in the same
  // page load. positionFn is the board's OWN wrapper (so it still reads
  // that board's own current DOM ids, not a hard-coded shared one).
  var _idBandObserverSetUp={};
  window.IDBand.observeRow = function(screenId, positionFn, els){
    if(_idBandObserverSetUp[screenId] || typeof ResizeObserver==='undefined') return;
    _idBandObserverSetUp[screenId]=true;
    var pending=false;
    var ro=new ResizeObserver(function(){
      if(pending) return;
      pending=true;
      requestAnimationFrame(function(){
        pending=false;
        try{
          var scr=document.getElementById(screenId);
          if(scr && scr.classList.contains('active')) positionFn();
        }catch(e){}
      });
    });
    els.forEach(function(el){ if(el) ro.observe(el); });
  };

})();
