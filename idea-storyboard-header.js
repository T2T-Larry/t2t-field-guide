/* ============================================================
   idea-storyboard-header.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   HEADER CHROME + MENUS. Everything about the currently-open topic header: its quick menu, drilling in/out and promoting/demoting, chrome and logo positioning, moving/reordering cards, the header detail/peek panels, and the gear-icon menus (Team, Appearance, Preferences, delegate-topic) plus new-topic default seeding.

   Split out of idea-storyboard-9710.js Sept 12, 2026 -- the file had
   grown to 11,463 lines (Code Growth Watch flags a split well before
   that; idea-storyboard-9710.js itself was already the product of an
   earlier split of sea-of-ideas.js back on July 17, 2026). Behavior
   is UNCHANGED -- this is a structural split, not a rebuild.

   All ten pieces share one global scope on the page (same pattern
   used for the briefing-board.js split on Sept 9, 2026) -- there's
   no per-file wrapper and no namespace object, so every
   function/variable here is reachable by its plain name from any of
   the other nine files. Load order does not matter for anything
   except idea-storyboard-9710.js itself, which must load LAST among
   this family.

   Sibling files: idea-storyboard-screens.js, idea-storyboard-shared.js, idea-storyboard-signal-flags.js,
   idea-storyboard-people.js, idea-storyboard-cluster.js, idea-storyboard-navigation.js,
   idea-storyboard-tiles.js, idea-storyboard-header.js, idea-storyboard-card-detail.js,
   idea-storyboard-9710.js (boot -- loads last)
   ============================================================ */

  function _sboardTopicOptionsHTML(excludeId){
    var currentLabel=(T2TShared.currentTopicId && _sboardHeadersById[T2TShared.currentTopicId]) ? _sboardHeadersById[T2TShared.currentTopicId].text_content : 'Wish Tank';
    var currentValue=T2TShared.currentTopicId||'';
    var opts='<option value="'+currentValue+'">Topic ('+currentLabel+')</option>';
    opts+=_sboardHeaderList
      .filter(function(h){ return String(h.id)!==String(excludeId) && String(h.id)!==String(currentValue); })
      .map(function(h){ return '<option value="'+h.id+'">'+h.text_content+'</option>'; }).join('');
    return opts;
  }

  // Session 247 (Aug 26), Larry: tried to delete a project and "was
  // denied" — he'd opened this same Header Quick Menu on his project's own
  // top-level header (the "Top Level" tag below already meant exactly
  // that: a project root) and hit "Trash this header," which routes to
  // _sboardConfirmTrashHeader — a real, no-undo DELETE the database
  // deliberately blocks for any project root, surfacing a raw error with
  // no way forward. First attempt at a fix routed project roots to
  // _sboardConfirmDeleteProject instead, on the assumption that function's
  // PROJECT-switcher screen was a working, reachable feature — Larry
  // corrected that: whole-project trash isn't actually built yet, only
  // individual cards inside a project can be trashed for now. So instead
  // of offering a delete path that doesn't really exist, a project root
  // simply doesn't get a delete/trash button here at all — an honest
  // explanatory line takes its place, so the dead-end error can never be
  // hit in the first place. Ordinary (non-project) headers are unchanged.
  function _sboardHeaderQuickMenu(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var options=_sboardTopicOptionsHTML(headerRow.id);
    var isProjectRoot=!headerRow.cluster_id;
    var apexTag=isProjectRoot?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    var deleteBtnHTML=isProjectRoot
      ?'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px;text-align:left">Whole-project delete isn\'t built yet — trash the cards inside it instead.</div>'
      :'<button class="sc-ov-btn" id="sb-hq-trash" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Trash this header</button>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+headerRow.text_content+'</div>'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Move under</label>'
      +'<select id="sb-hq-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-hq-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px;margin-bottom:6px"><button class="sc-ov-btn save" id="sb-hq-move" style="flex:1">Move here</button><button class="sc-ov-btn" id="sb-hq-open" style="flex:1">Open board</button></div>'
      +deleteBtnHTML
      +'<button class="sc-ov-btn" id="sb-hq-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-hq-parent');
    T().wire('sb-hq-move', async function(){
      var errEl=document.getElementById('sb-hq-err');
      var newParent=sel.value||null;
      if(String(newParent)===String(headerRow.cluster_id||'')){ closeSbDetail(); return; }
      try{
        var upd=await _sb.from('ideas').update({cluster_id:newParent}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Nothing changed — the header may not have matched.');
        _sboardPatchRow(headerRow.id, {cluster_id:newParent});
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
    T().wire('sb-hq-open', function(){
      closeSbDetail();
      _sboardDrillInto(headerRow);
    });
    T().wire('sb-hq-trash', function(){ _sboardConfirmTrashHeader(headerRow); });
    T().wire('sb-hq-cancel', closeSbDetail);
  }

  // Session 231 (Aug 20) -- Larry, in Hang-Ups: "DELETE ANY HEADER WHEN
  // SENT TO TRASH." This used to be a soft move (cluster_id -> the
  // reserved Trash header, recoverable via undo or by digging it back
  // out of Trash) -- now it's a real delete the moment "Trash it" is
  // confirmed, matching what Larry actually asked for. A DB migration
  // this same session made ideas.cluster_id (the parent-child tree) and
  // briefing_cards' source_header_id/hangup_header_id cascade, so one
  // DELETE here also removes everything genuinely nested under this
  // header (child headers, cards) and its own Briefing task-card
  // mirror, atomically. Two things deliberately still block the delete
  // with a normal Postgres error instead of silently cascading further:
  // a header that's actually a project root (ideas.project_id) or has
  // its own linked Briefing Board (briefing_boards.storyboard_project_id)
  // -- those stay NO ACTION on purpose so trashing one ordinary header
  // can never take out a whole project or Briefing Board as a side
  // effect. No undo after this -- a real delete can't be undone by the
  // existing snapshot/update mechanism, so the dialog says so plainly
  // instead of pretending otherwise.
  function _sboardConfirmTrashHeader(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Delete "'+safeName+'"?</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">This permanently deletes it and anything nested under it. This can\'t be undone.</div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-trash-go" style="flex:1;background:#b8562f;border-color:#b8562f">Delete it</button><button class="sc-ov-btn" id="sb-trash-cancel" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-trash-cancel', closeSbDetail);
    T().wire('sb-trash-go', async function(){
      var _sb=T().sb;
      try{
        var del=await _sb.from('ideas').delete().eq('id',headerRow.id);
        if(del.error) throw del.error;
        // A real fetch, not fromCache=true -- the DB cascade above may
        // have just removed a whole subtree of descendant rows (and any
        // linked Briefing task-card mirrors) that this tab's in-memory
        // cache still holds. A cache-only render would keep drawing
        // those as ghosts until something else forced a real refetch.
        closeSbDetail();
        renderSeaBoard(false);
      }catch(err){
        var errBox=document.querySelector('.sc-overlay-card');
        var msg=err.message||String(err);
        if(/foreign key|violates/i.test(msg)) msg='Can\'t delete this one — it\'s a project root or has its own linked Briefing Board with content depending on it.';
        if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+msg+'</div>');
      }
    });
  }

  // Larry, August 1 2026: "I just closed the Field Guide storyboard but
  // when I reopened it, it opened to the Wish Tank instead. almost
  // there!" — the desk's Idea Board button (see _ideaOpenBoardResume in
  // idea-media-shared.js) already resumes T2TData's getLastInputTopic,
  // but nothing on 1010 itself was ever writing to it — only 9711
  // (Session) did, via its own _isxPersistLastTopic. So reopening 1010
  // fell back to the project apex (Wish Tank) unless Session happened to
  // have saved something more specific. This mirrors that same write on
  // every actual move within the Storyboard (drilling into a header,
  // climbing back up, or switching projects — all three route through
  // _sboardDrillInto/_sboardGoUpOneLevel), so "where you left off" means
  // the same thing whichever screen you were actually using.
  function _sboardPersistLastTopic(topicId){
    try{
      if(!topicId || !window.T2TData || !window.T2TData.setLastInputTopic) return;
      var row=_sboardAllRowsById[topicId];
      var projRow=row?_sboardProjectRowFor(row):null;
      if(projRow && projRow.id){
        window.T2TData.setLastInputTopic(projRow.id, topicId);
        // Larry, August 1 2026 (second report): "closed Field Guide but
        // it reopened to Wish Tank again" — the desk's resume path needs
        // to know WHICH project was last active, not just the topic
        // within a fixed Wish Tank anchor. See _ideaRememberProject in
        // idea-media-shared.js.
        if(window.T2TMedia && window.T2TMedia.rememberProject) window.T2TMedia.rememberProject(projRow.id);
      }
    }catch(e){ console.warn('Storyboard persist-last-topic failed:', e); }
  }

  // Larry, August 1 2026: "the delay makes me wonder if anything is
  // happening. If you have to take more than a blink, show pocket
  // watch." Switching projects/topics in place (drilling in, climbing
  // up) re-fetches from Supabase but never went through nav()'s own
  // showTravelSpinner/hideTravelSpinner wrap — that only fires on a
  // real screen change, not a same-screen refresh. This was also the
  // window where "What do you want?" could flash as TOPIC: the chrome
  // briefly re-reads the OLD project's cached rows for the NEW
  // topicId until the fetch lands. The spinner covers that same gap.
  function _sboardSpinWhile(promise){
    var t2=T();
    if(t2 && t2.showTravelSpinner) t2.showTravelSpinner();
    var done=function(){ if(t2 && t2.hideTravelSpinner) t2.hideTravelSpinner(); };
    if(promise && typeof promise.then==='function'){ promise.then(done, done); }
    else { done(); }
  }

  // Clears the current selection AND its visual highlight. A plain
  // "_sboardSelectedHeaderId=null" isn't enough on its own once the TOPIC
  // card can be selected (Aug 21 2026) -- unlike a Header/Subheader tile,
  // the Topic card's DOM node is never rebuilt on re-render, so a
  // highlight left on it by _SBOARD_TOPIC_SENTINEL would otherwise stick
  // around forever, no longer matching the (now-null) selection state.
  function _sboardClearHeaderSelection(){
    if(_sboardSelectedHeaderId){
      var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(_sboardSelectedHeaderId))+'"]');
      if(prevEl) prevEl.classList.remove('sb-kbd-selected');
    }
    _sboardSelectedHeaderId=null;
  }

  function _sboardDrillInto(headerRow){
    // A selection from the board you're leaving doesn't mean anything on
    // the board you're drilling into -- clear it so a stray Tab/Ctrl+Down
    // afterward can't act on a header that's no longer even in view.
    _sboardClearHeaderSelection();
    T2TShared.currentTopicId=headerRow.id;
    T2TShared.filter=headerRow.id;
    _sboardPersistLastTopic(headerRow.id);
    _sboardSpinWhile(renderSeaBoard());
  }

  function _sboardGoUpOneLevel(){
    _sboardClearHeaderSelection();
    var curRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
    var parentId=curRow?(curRow.cluster_id||null):null;
    T2TShared.currentTopicId=parentId;
    T2TShared.filter=parentId;
    _sboardPersistLastTopic(parentId);
    _sboardSpinWhile(renderSeaBoard());
  }

  // Ctrl+Up on a selected card -- unlike _sboardGoUpOneLevel (which always
  // climbs from the board's current Topic), this climbs from the SELECTED
  // card's own parent, whatever tier that card happens to be showing at.
  // Net effect: the selected card rises one level in the display (a
  // Subheader now renders as a Header, a Header now renders as the Topic)
  // while its former parent becomes the new Topic. Keeps the same card
  // selected afterward -- still a valid id on the freshly rendered board,
  // one tier shallower -- so repeated Ctrl+Up keeps climbing that card's
  // lineage. Aug 21 2026 (Larry: "any card, including topic").
  function _sboardDrillUpFrom(row){
    if(!row) return;
    // Bug fix, Aug 21 2026 (Larry: "ctrl-up on History of BB header --
    // nothing happened"): a top-level Header's own parent IS the current
    // Topic already, so climbing to row.cluster_id below was a silent
    // no-op for every top-level Header -- it set currentTopicId to the
    // same value it already had. A top-level Header rising one tier
    // means the row itself becomes the new Topic (the same destination
    // Ctrl+Down reaches on this same card) -- there's no shallower tier
    // to land it on above that. Only a nested Subheader (whose parent is
    // a Header, not the Topic) actually climbs to row.cluster_id below.
    if(String(row.cluster_id)===String(T2TShared.currentTopicId)){
      _sboardDrillInto(row);
      // row is now the Topic -- select the Topic card itself (Aug 21
      // 2026 sentinel) so repeated Ctrl+Up can keep climbing from here
      // without needing a fresh click on the Topic card first.
      _sboardSelectedHeaderId=_SBOARD_TOPIC_SENTINEL;
      var topicBoxEl=document.getElementById('sc-topic-box');
      if(topicBoxEl) topicBoxEl.classList.add('sb-kbd-selected');
      return;
    }
    var parentId=row.cluster_id||null;
    if(!parentId){ _sboardShowToast('Already at the top of this board.'); return; }
    var keepSelectedId=row.id;
    T2TShared.currentTopicId=parentId;
    T2TShared.filter=parentId;
    _sboardPersistLastTopic(parentId);
    _sboardSelectedHeaderId=keepSelectedId;
    _sboardSpinWhile(renderSeaBoard());
  }

  // MOVE shortcuts (Tab/Shift+Tab) -- restructures the hierarchy, unlike
  // Ctrl+Down/Ctrl+Up above which only change what you're looking at.
  // Deliberately scoped to exactly the two levels this board actually
  // renders as clickable tiles (top-level Header <-> Subber-of-a-top-
  // level-Header) -- a Subber's own children aren't drawn as tiles here,
  // so nesting a header a 3rd level deep would make it silently
  // disappear from the board; these two functions refuse rather than do
  // that. Same DB write shape (cluster_id + sort_order) and same
  // undo/redo participation as every drag-based move already in this
  // file (_sboardMoveCard, _sboardReorderHeader, etc.).
  // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
  function _sboardHeaderIsTopLevel(id){
    return _sboardTopLevelOrder.some(function(x){ return String(x)===String(id); });
  }
  async function _sboardDemoteSelectedHeader(){
    var id=_sboardSelectedHeaderId;
    var row=id && _sboardAllRowsById[id];
    var statusEl=document.getElementById('sc-status');
    function fail(msg){ if(statusEl){ statusEl.textContent=msg; statusEl.classList.add('err'); } }
    if(!row){ fail('Click a header to select it first.'); return; }
    if(row.locked){ fail('That header is locked.'); return; }
    if(!_sboardHeaderIsTopLevel(id)){ fail('That header is already nested as far as this board supports.'); return; }
    var idx=_sboardTopLevelOrder.findIndex(function(x){ return String(x)===String(id); });
    if(idx<=0){ fail('Nothing above this header to nest it under.'); return; }
    var prevId=_sboardTopLevelOrder[idx-1];
    var prevRow=_sboardAllRowsById[prevId];
    if(!prevRow || prevRow.locked){ fail('Can’t nest under a locked header.'); return; }
    var _sb=T().sb;
    var before=_sboardSnapshotRow(id);
    // Aug 22 2026: was _sboardSubberOrderByParent's own length (only
    // counted existing Subbers) -- with Subbers and cards now sharing one
    // column order, this needs the combined column's length so a newly
    // nested header doesn't land on top of a card that already holds
    // that same position number.
    var newOrder=(_sboardColumnOrderByParent[prevId]||[]).length;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:prevId, sort_order:newOrder}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:prevId, sort_order:newOrder});
      var after=_sboardSnapshotRow(id);
      _sboardPushAction({label:'Nest header', undo:function(){ return _sboardApplyRowSnapshot(id, before); }, redo:function(){ return _sboardApplyRowSnapshot(id, after); }});
      if(statusEl){ statusEl.textContent='Nested under “'+(prevRow.text_content||'that header')+'”.'; statusEl.classList.remove('err'); }
      renderSeaBoard(true);
    }catch(err){ fail('Couldn’t nest that header: '+err.message); }
  }
  async function _sboardPromoteSelectedHeader(){
    var id=_sboardSelectedHeaderId;
    var row=id && _sboardAllRowsById[id];
    var statusEl=document.getElementById('sc-status');
    function fail(msg){ if(statusEl){ statusEl.textContent=msg; statusEl.classList.add('err'); } }
    if(!row){ fail('Click a header to select it first.'); return; }
    if(row.locked){ fail('That header is locked.'); return; }
    if(_sboardHeaderIsTopLevel(id)){ fail('Already at the top level for this board.'); return; }
    if(!T2TShared.currentTopicId){ fail('Can’t make a new project this way — use + NEW PROJECT.'); return; }
    var _sb=T().sb;
    var before=_sboardSnapshotRow(id);
    var newOrder=_sboardTopLevelOrder.length;
    try{
      var upd=await _sb.from('ideas').update({cluster_id:T2TShared.currentTopicId, sort_order:newOrder}).eq('id',id);
      if(upd.error) throw upd.error;
      _sboardPatchRow(id, {cluster_id:T2TShared.currentTopicId, sort_order:newOrder});
      var after=_sboardSnapshotRow(id);
      _sboardPushAction({label:'Un-nest header', undo:function(){ return _sboardApplyRowSnapshot(id, before); }, redo:function(){ return _sboardApplyRowSnapshot(id, after); }});
      if(statusEl){ statusEl.textContent='Moved up to the top level.'; statusEl.classList.remove('err'); }
      renderSeaBoard(true);
    }catch(err){ fail('Couldn’t promote that header: '+err.message); }
  }

  // Member name, Sept 2 2026 -- fills in the embossed #sc-member-name
  // label that replaced the Organization Type/Name fields in the chrome
  // (see the header markup and the one-time PROJECT wiring above). Reads
  // the same window.T2T.getMember() the app-wide nameplate (screen-zero.js
  // buildNameplate) already uses, so this shows exactly the same name in
  // exactly the same case -- no separate lookup, no risk of drifting out
  // of sync with what the nameplate says. A no-op (leaves whatever text
  // was already there) until the member profile has actually loaded --
  // called again off the t2t:member-loaded event for that race, same
  // pattern the nameplate itself uses.
  function _sboardRenderMemberName(){
    // Sept 3 2026: the wrapper (#sc-member-name) became the badge box
    // itself (gold gradient, border, "Thoughts to Things" header line) --
    // the name text now lands in the inner #sc-member-name-text line, not
    // the wrapper, so it doesn't clobber the header line's own markup.
    // Sept 5 2026: the gold badge itself is retired (hidden, not deleted
    // -- see the header markup above), but #sc-member-name-text still
    // gets filled in here so the badge shows the right name immediately
    // if it's ever switched back on. The traveler's name now actually
    // shows via the plain ice-blue #sc-traveler-name eyebrow instead --
    // filled in alongside it, same source, same case.
    var m=(window.T2T && window.T2T.getMember) ? window.T2T.getMember() : null;
    var el=document.getElementById('sc-member-name-text');
    if(el && m && m.display_name) el.textContent=m.display_name.toUpperCase();
    var travelerEl=document.getElementById('sc-traveler-name');
    if(travelerEl && m && m.display_name) travelerEl.textContent=m.display_name.toUpperCase();
  }

  // PROJECT label, Sept 5 2026 -- Larry: "Field Guide is a project but the
  // project list shows Idea Storyboard which should only appear if NO
  // Project is identified." Called from _sboardUpdateHeaderChrome on
  // every chrome refresh (topicRow is whatever the current Topic resolves
  // to, or null while sitting above any topic at all) -- same pattern
  // already used for Parent/Topic -- rather than the name being set once
  // at boot in injectSeaOfIdeasCluster and never touched again.
  // _sboardProjectRowFor climbs from topicRow to its nearest self-scoped
  // ancestor, which is either the real project's own root (Field Guide,
  // say) or the account-wide root itself if nothing more specific has
  // been drilled into.
  //
  // Sept 6 2026, Larry: "delete any reference to Idea Storyboards, that
  // is now not going to be used" -- the atRoot case no longer names it:
  // "Projects" reads as "you're looking at your projects" without
  // surfacing the retired internal name. PARENT (below) got the same
  // treatment the same day, so nothing on this screen still shows that
  // name.
  function _sboardRenderProjectLabel(topicRow){
    var titleTrigger=document.getElementById('sc-title-trigger');
    if(!titleTrigger) return;
    var projRow=topicRow?_sboardProjectRowFor(topicRow):null;
    var atRoot=!projRow || !_sboardIdeaStoryboardsRootId || String(projRow.id)===String(_sboardIdeaStoryboardsRootId);
    if(atRoot){
      // Sept 7 2026, Larry: PROJECT reads MASTER at root (not PROJECTS --
      // that duplicated TOPIC's own root label, which stays PROJECTS).
      // Uniform across every board kind, not just the Idea Board.
      titleTrigger.textContent='MASTER';
      titleTrigger.title='Click to open your projects; double-click for the fast-jump list';
    } else {
      titleTrigger.textContent=projRow.text_content||'(untitled)';
      titleTrigger.title='Click to open '+(projRow.text_content||'this project')+'; double-click for the fast-jump list';
    }
  }

  function _sboardUpdateHeaderChrome(){
    var topicBox=document.getElementById('sc-topic-box');
    var topicText=document.getElementById('sc-topic-text');
    var topicBadge=document.getElementById('sc-topic-badge');
    var areaEl=document.getElementById('sc-header-area');
    // sc-parent-hit/sc-parent-label retired Sept 6 2026 along with the
    // PARENT eyebrow/field -- the up-arrow (sc-parent-caret, now living
    // on TOPIC's own row) is disabled instead, same real-disabled-button
    // treatment BB uses for its own up-arrow (_bbSyncTopicUpCaret).
    var parentCaret=document.getElementById('sc-parent-caret');
    // Root Topic never changes — "What do you want?" stays permanent regardless of depth.
    if(T2TShared.currentTopicId && _sboardAllRowsById[T2TShared.currentTopicId]){
      var topicRow=_sboardAllRowsById[T2TShared.currentTopicId];
      if(topicText){ topicText.textContent=topicRow.text_content||'(untitled)'; }
      if(topicBox){ topicBox.style.background=topicRow.color||''; }
      if(topicBadge){
        // Signal flags (lock/flags/notes/link), Aug 22 2026 -- Larry: "it
        // isn't working for TOPIC cards and they are cards." The TOPIC box
        // only ever rendered the assigned-person badge here; every other
        // card front (plain, header, sub-header) gets the shared
        // .sb-signal-row cluster via _sboardSignalRowHTML (see the Aug 15
        // 2026 centralization above). #sc-topic-badge sits inside
        // #sc-topic-box, which is already position:relative, so the
        // person badge (top-right) and signal row (bottom-left) both
        // position correctly as siblings here, same as on any other tile.
        topicBadge.innerHTML=_sboardAssignedBadgeHTML(topicRow)
          + _sboardSignalRowHTML(topicRow, {lock:true, flags:true, notes:true, link:true});
        if(!_sboardEffPrimaryCache.hasOwnProperty(_sboardEffKey('idea', topicRow.id))){
          _sboardEnsureCardPrimary([topicRow]).then(function(fetched){
            if(fetched) _sboardUpdateHeaderChrome();
          });
        }
        if(topicRow.assigned_user_id && !_sboardAssignedCache[topicRow.assigned_user_id]){
          _sboardEnsureAssignedInitials([topicRow]).then(function(fetched){
            if(fetched) _sboardUpdateHeaderChrome();
          });
        }
      }
      // Member name, Sept 2 2026 -- replaces the old Type/Title re-render
      // pair here (Organization removed from the chrome).
      _sboardRenderMemberName();
      // PROJECT, Sept 5 2026 -- re-rendered every chrome refresh (same as
      // Parent/Topic) instead of the fixed label wired once at boot --
      // Larry: PROJECT should show whichever project is actually on
      // screen (Field Guide, etc.), not a fixed "Idea Storyboards" label.
      // See _sboardRenderProjectLabel, defined just below this function.
      _sboardRenderProjectLabel(topicRow);
      var parentId=topicRow.cluster_id||null;
      var parentRow=parentId?_sboardAllRowsById[parentId]:null;
      // PARENT is inert once there's nothing above the current Topic (i.e.
      // sitting at a project's own root) — fixed July 16, 2026. It used to
      // stay clickable here and climb all the way out to the cross-project
      // apex, which behaves like a project chooser and duplicated PROJECT.
      // Sept 6 2026 fix -- this inert check went stale the moment every
      // project started nesting under the shared Idea Storyboards root
      // (Sept 2): parentRow was never null at a project's own root
      // anymore, it was that shared root row itself, so this kept
      // reading as "not inert" and showing "Idea Storyboards" as
      // PARENT's label right at the one place it was supposed to go
      // dim. parentIsAccountRoot (parentRow with no cluster_id of its
      // own -- the one thing that's true only of that shared root)
      // restores the original intent, and matches "delete any reference
      // to Idea Storyboards" / "the up arrow never needs to go above the
      // actual project" from today.
      var parentIsAccountRoot = parentRow && !parentRow.cluster_id;
      if(parentCaret){ parentCaret.disabled = !(parentId && parentRow && !parentIsAccountRoot); }
    } else {
      if(topicText){ topicText.textContent=_sboardGetRootPrompt(); }
      if(topicBadge){ topicBadge.innerHTML=''; }
      if(topicBox){ topicBox.style.background=''; }
      _sboardRenderProjectLabel(null);
      if(parentCaret){ parentCaret.disabled=true; }
    }
    // One traveler-chosen color paints the whole screen (header strip +
    // board area) — no more separate hardcoded navy/purple fighting it.
    // Locked July 16, 2026.
    _sboardApplyBoardBg();
    // Logo/artwork, Aug 26 2026 -- reflect whatever the current project's
    // ROOT row carries (or doesn't) every time header chrome refreshes,
    // same as every other header field above. A loaded logo hides the
    // (+) and becomes the click target for swapping it out; no logo
    // means the (+) shows instead, same as before upload existed.
    //
    // Aug 30 2026 -- the actual logo behavior (frame size, img/(+)/
    // handle visibility, the on-logo eyebrow, and -- via cfg.
    // positionAnchor -- the gap-off-Parent reposition that used to be a
    // separate call right after this block) all moved to the shared
    // window.T2TLogo controller (idea-media-shared.js), also used by
    // the Briefing Board. _sboardLogoCfg (near injectSeaOfIdeasCluster,
    // above) is this board's own description of itself for that
    // controller.
    T2TLogo.render(_sboardLogoCfg);
    // PROJECT, Sept 3 2026 -- used to re-run _sboardPositionProjectMidwayToLogo
    // here, after T2TLogo.render, so PROJECT's midpoint math read Logo's
    // just-updated box rather than a stale one. Sept 5 2026: no longer
    // needed -- PROJECT nests under the traveler name in a fixed column
    // now instead of being positioned off Name/Logo's boxes (see the
    // Sept 5 note on sc-project-wrap in the header markup above).
  }

  // Aug 18 2026, Larry: "allow Logo to keep same relative distance from
  // Topic as Parent." Parent sits right up against Topic's left edge with
  // a fixed column-gap (see the 3-column grid comment above, in the
  // header markup) -- that gap already tracks Topic's own box naturally,
  // since CSS grid handles it. Logo, being positioned independently by a
  // fixed percentage of the header's total width, didn't: a longer or
  // shorter Topic name changed Topic's box without moving Logo, so the
  // visual gap on Logo's side drifted out of sync with Parent's.
  //
  // Fix: measure the real gap Parent currently keeps (its right edge to
  // Topic's left edge) and re-place Logo's own frame that same distance
  // off Topic's right edge, mirrored. Two-pass measure-then-adjust
  // (place, measure where the frame actually landed, correct by the
  // difference) rather than computing Logo-wrap's left directly, because
  // the wrap is centered around its content (the frame plus the LOGO
  // label above it) -- if the label text is ever wider than the frame,
  // the wrap's own left edge and the frame's left edge aren't the same
  // point, and only the frame's position is what "distance from Topic"
  // actually means here.
  // Aug 30 2026 -- dx/dy moved off wrap.style.left/top and onto
  // sc-logo-slot's own CSS transform (shared T2TLogo controller,
  // idea-media-shared.js -- same split the Briefing Board's Logo
  // already used). Measuring slotRect below has to see the frame's true
  // UNoffset position or the gap-off-Parent math drifts by whatever
  // transform is currently sitting on it, so this clears the transform
  // before measuring and puts the correct one back before returning --
  // makes this function fully self-contained (safe to call on its own,
  // not just from a render that's about to reapply the transform right
  // after) and removes the old staleness trap entirely: T2TLogo's own
  // drag handler no longer needs to force a fresh reposition before
  // reading a start point, since the offset is never derived from
  // wrap's own possibly-stale position anymore, only ever from the row's
  // own saved logo_dx/logo_dy.
  function _sboardPositionLogoNearTopic(){
    var wrap=document.getElementById('sc-logo-wrap');
    var slot=document.getElementById('sc-logo-slot');
    var topicBox=document.getElementById('sc-topic-box');
    var parentHit=document.getElementById('sc-parent-hit');
    var areaEl=document.getElementById('sc-header-area');
    if(!wrap||!slot||!topicBox||!parentHit||!areaEl) return;
    var root=_sboardCurrentRootRow();
    var dx=(root && root.logo_dx)||0;
    var dy=(root && root.logo_dy)||0;
    var savedTransform=slot.style.transform;
    slot.style.transform='';
    var topicRect=topicBox.getBoundingClientRect();
    var parentRect=parentHit.getBoundingClientRect();
    var areaRect=areaEl.getBoundingClientRect();
    // Guard against a not-yet-laid-out screen (zero-width rects) --
    // nothing to measure yet, leave the left:57% fallback in place.
    if(!topicRect.width || !areaRect.width){ slot.style.transform=savedTransform; return; }
    var gap=topicRect.left-parentRect.right;
    if(!(gap>=0)) gap=14; // sane fallback -- matches the grid's own column-gap
    var slotRect=slot.getBoundingClientRect();
    // Aug 29 2026, Larry: move Logo to the LEFT side of the header, next
    // to Parent, to match where it sits on the Briefing Board (right
    // after PROJECT, ahead of everything else) -- reverses the Aug 16/18
    // placement (which put Logo the same distance off Topic's RIGHT as
    // Parent sits off its LEFT).
    //
    // Sept 5 2026, Larry: back to the right side of TOPIC (Idea Board
    // only -- see the Sept 5 note on sc-logo-wrap in the header markup
    // above for why). Same mirrored-gap approach, just flipped back:
    // Logo's frame now sits that same measured gap off Topic's RIGHT
    // edge instead of Parent's left edge.
    //
    // Same day, follow-up -- Larry: "Logo keeps drifting, needs to stay
    // where it is put." Root cause: Topic sits in a centered, content-
    // sized grid column (the 1fr/auto/1fr row set up Aug 16, above), so
    // topicRect.right -- the live, actual right edge used here -- moves
    // with every topic's own title length, even though Topic itself
    // always stays centered. Anchoring Logo off that live edge meant it
    // visibly slid sideways every time a shorter- or longer-titled card
    // opened, though nothing about Logo changed. Fixed by anchoring off
    // Topic's own reserved slot -- its CSS max-width, i.e. the width
    // Topic would have if it were as long as its box ever allows --
    // instead of its current shrink-to-fit size. Since Topic is always
    // centered in sc-header-area regardless of title length, "half that
    // reserved width off the header's own center" lands on the exact
    // same pixel for every topic, while a real window resize or
    // text-scale change (which should still move things) keeps working,
    // since areaRect and the max-width itself (it reads the live
    // --fg-text-scale variable) are both re-measured fresh every call.
    var topicMaxWidth=parseFloat(getComputedStyle(topicBox).maxWidth)||topicRect.width;
    var topicSlotRight=(areaRect.left+areaRect.width/2)+topicMaxWidth/2;
    var desiredSlotLeft=topicSlotRight+gap;
    var wrapRect=wrap.getBoundingClientRect();
    var delta=desiredSlotLeft-slotRect.left;
    var baseLeft=(wrapRect.left-areaRect.left)+delta;
    // Base position only now -- no +dx/+dy here (see this function's own
    // header comment above). wrap never moves again once this settles;
    // the saved offset rides on top purely as slot's own transform,
    // reapplied right below.
    wrap.style.left=baseLeft+'px';
    wrap.style.top='10px';
    slot.style.transform=(dx||dy)?('translate('+dx+'px,'+dy+'px)'):'';
  }
  // PROJECT, Sept 3 2026, Larry: "PROJECT is too close to my name -- it
  // should be half the distance between name and LOGO." Same measure-the-
  // real-boxes approach as _sboardPositionLogoNearTopic just above (a
  // fixed pixel/percent guess drifts the moment either neighbor's own
  // width changes -- a longer member name, or Logo's own gap-off-Parent
  // shifting on a resize): reads sc-member-name's actual right edge and
  // sc-logo-wrap's actual left edge, and sets sc-project-wrap's own
  // horizontal center to the midpoint between them. Must run AFTER Logo
  // has already been positioned for this render (see the call right after
  // T2TLogo.render in _sboardUpdateHeaderChrome, above) -- reading Logo's
  // box any earlier would measure last render's stale position.
  function _sboardPositionProjectMidwayToLogo(){
    var wrap=document.getElementById('sc-project-wrap');
    var nameEl=document.getElementById('sc-member-name');
    var logoWrap=document.getElementById('sc-logo-wrap');
    var areaEl=document.getElementById('sc-header-area');
    if(!wrap||!nameEl||!logoWrap||!areaEl) return;
    var nameRect=nameEl.getBoundingClientRect();
    var logoRect=logoWrap.getBoundingClientRect();
    var areaRect=areaEl.getBoundingClientRect();
    // Guard against a not-yet-laid-out screen or an empty nameplate (the
    // member profile hasn't loaded yet -- see _sboardRenderMemberName)  --
    // nothing real to measure yet, leave the left:30% fallback in place.
    if(!nameRect.width || !logoRect.width || !areaRect.width) return;
    var wrapRect=wrap.getBoundingClientRect();
    var midpoint=nameRect.right+(logoRect.left-nameRect.right)/2;
    var desiredLeft=midpoint-(wrapRect.width/2);
    wrap.style.left=(desiredLeft-areaRect.left)+'px';
    wrap.style.top='10px';
  }
  // Window resize, Aug 18 2026 -- this screen goes edge-to-edge
  // (isx-full, see screen-fit.js's own note on why it skips the global
  // auto-fit transform), so an actual browser-window resize changes
  // Topic's real rendered width directly, not just the text-scale boost
  // that renderSeaBoard already re-renders through. Same "each tool
  // decides for itself whether it's currently on screen" approach as
  // screen-fit.js's fg-text-scale-changed listener above -- no-ops
  // instantly whenever this screen isn't the one showing.
  window.addEventListener('resize', function(){
    try{
      var scr=document.getElementById('s-sea-of-ideas-cluster');
      if(scr && scr.classList.contains('active')){
        // _sboardPositionLogoNearTopic no longer called here, Sept 6 2026
        // -- Logo moved into sc-hdr-side's normal flex row (see the Sept 6
        // note near sc-logo-wrap in the header markup) so it no longer
        // needs a resize-triggered reposition; left in place, not
        // deleted, in case Logo's placement ever changes back.
        // _sboardPositionProjectMidwayToLogo no longer called here, Sept
        // 5 2026 -- PROJECT nests under the traveler name in a fixed
        // column now, not positioned off Logo's box (see the Sept 5 note
        // on sc-project-wrap in the header markup, near injectSeaOfIdeasCluster).
      }
    }catch(e){}
  });

  async function _sboardMoveCard(itemId, headerId){
    // Locked no longer blocks moving, Aug 25 2026 -- see the note on
    // _sboardMakeTile above (this used to silently refuse to move a
    // locked card at all).
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(itemId);
    try{
      // Aug 22 2026: was _sboardIdeaOrderByParent's own length (only
      // counted plain cards) -- with Subbers and cards now sharing one
      // column order, "the bottom of the column" has to mean past both,
      // or a fresh drop could land in the middle of the Subbers instead
      // of truly at the end.
      var siblingCount=(_sboardColumnOrderByParent[headerId]||[]).length;
      // .select() + row-count check, Aug 22 2026 -- same fix as the
      // reorder functions above (Larry: moves that silently didn't
      // save). Without this, a write that matches zero rows still comes
      // back with no .error, so it looked like the move worked even
      // when nothing was touched.
      var upd=await _sb.from('ideas').update({cluster_id:headerId, sort_order:siblingCount}).eq('id',itemId).select('id');
      if(upd.error) throw upd.error;
      if(!upd.data || !upd.data.length) throw new Error('Save was blocked (no rows matched) -- nothing moved.');
      _sboardPatchRow(itemId, {cluster_id:headerId, sort_order:siblingCount});
      if(before){
        var after=_sboardSnapshotRow(itemId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(itemId, before); }, redo:function(){ return _sboardApplyRowSnapshot(itemId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  // Drop a card OR a Subber onto another card/Subber in the same column --
  // unified Aug 22 2026 (Larry: "sub-headers always cluster to the top...
  // I want to mix them into the story"). Used to be two separate
  // functions (_sboardReorderOrMoveIdea / _sboardReorderOrMoveSubber),
  // each only able to reorder within its own kind, matching the two
  // separately-numbered lists the column used to render from. This one
  // reorders against the single shared _sboardColumnOrderByParent instead,
  // so a Subber and a plain card can trade places freely and land exactly
  // where dropped, interleaved. Reorders among siblings if the dragged
  // card is already in this column, or moves + inserts at that position
  // if it's coming from somewhere else — one gesture covers both, same as
  // the two functions it replaces.
  async function _sboardReorderOrMoveColumnItem(draggedId, targetId, parentId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    // Locked no longer blocks moving, Aug 25 2026 -- see the note on
    // _sboardMakeTile above.
    var statusEl=document.getElementById('sc-status');
    var _sb=T().sb;
    var before=_sboardSnapshotRow(draggedId);
    var ids=(_sboardColumnOrderByParent[parentId]||[]).slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    if(fromIdx!==-1) ids.splice(fromIdx,1);
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    var insertAt=toIdx===-1?ids.length:(insertAfter?toIdx+1:toIdx);
    ids.splice(insertAt, 0, draggedId);
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      // .select() added Aug 22 2026 -- Larry: "moved word wall sub-header
      // to card order number 4. It did not move" (and, separately, a
      // subber wouldn't move above it either). Without .select(), Supabase
      // returns success with zero rows touched if a write gets filtered
      // out for any reason (RLS, a stale/mismatched id, etc.) -- the old
      // code only checked .error, which stays null in that case, so the
      // screen showed the reorder as done while nothing was actually
      // saved. Now checks the real row count and surfaces a visible error
      // (see statusEl below) the moment a write silently no-ops, instead
      // of pretending it worked.
      var updCluster=await _sb.from('ideas').update({cluster_id:parentId}).eq('id',draggedId).select('id');
      if(updCluster.error) throw updCluster.error;
      if(!updCluster.data || !updCluster.data.length) throw new Error('Save was blocked for this card (no rows matched) -- nothing moved.');
      _sboardPatchRow(draggedId, {cluster_id:parentId});
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]).select('id');
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Save was blocked for one of the cards in this column (no rows matched) -- reorder stopped partway.');
        _sboardPatchRow(ids[i], {sort_order:i});
      }
      if(before){
        var after=_sboardSnapshotRow(draggedId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(draggedId, before); }, redo:function(){ return _sboardApplyRowSnapshot(draggedId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent='Reordering needs the sort_order Supabase column: '+err.message; statusEl.classList.add('err'); }
    }
  }

  // Reorders top-level Headers among each other. Also handles promoting a
  // Subber up to Header level, Aug 3 2026 -- dropping a Subber onto a
  // Header's left/right edge (see the 'hd' drop handler below) used to
  // silently do nothing, because this function only ever knew how to
  // reshuffle cards that were already top-level (fromIdx===-1 bailed out
  // immediately). Now a dragged card that isn't already top-level is
  // treated as a promotion: its parent link is cleared (making it a real
  // standalone Header) on top of the normal reorder.
  async function _sboardReorderHeader(draggedId, targetId, insertAfter){
    if(String(draggedId)===String(targetId)) return;
    var statusEl=document.getElementById('sc-status');
    var before=_sboardSnapshotRow(draggedId);
    var ids=_sboardTopLevelOrder.slice();
    var fromIdx=ids.findIndex(function(id){ return String(id)===String(draggedId); });
    var toIdx=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(toIdx===-1) return;
    var wasTopLevel=fromIdx!==-1;
    if(wasTopLevel) ids.splice(fromIdx,1);
    var insertAt=ids.findIndex(function(id){ return String(id)===String(targetId); });
    if(insertAfter) insertAt+=1;
    ids.splice(insertAt,0,draggedId);
    var _sb=T().sb;
    if(statusEl){ statusEl.textContent='Reordering…'; statusEl.classList.remove('err'); }
    try{
      if(!wasTopLevel){
        // Bug fix, Aug 3 2026 -- Larry: "I think a header was just made a
        // subber instead of changing order? I moved it back to header
        // level and it might have disappeared." Root cause: this always
        // promoted a dragged Subber with cluster_id:null, which is only
        // correct when "header level" means the absolute project apex.
        // On a real Topic's own board -- the normal case -- its headers
        // all share that Topic's own id as cluster_id, not null.
        // Promoting to null yanked the Subber all the way out to become
        // its own brand-new top-level project, invisible from wherever
        // it was actually being viewed -- exactly what read as
        // "disappeared."
        //
        // Second pass, same day -- Larry, after the immediate fix: "it
        // was just a test header for moving in various locations, none
        // of which were to create a new project which should ONLY happen
        // in one spot." That's a stronger rule than "use the right id" --
        // this drag gesture must never be able to spawn a new top-level
        // project at all, full stop; that's the "+ NEW PROJECT" flow's
        // job alone. So rather than falling back to cluster_id:null at
        // the true apex (still technically "creating a project" via a
        // drag), promoting with nowhere real to land is refused outright
        // -- same shape as every other guarded action in this file, a
        // status message instead of a silent wrong result.
        if(!T2TShared.currentTopicId){
          if(statusEl){ statusEl.textContent='Can\'t make a new project this way — use + NEW PROJECT.'; statusEl.classList.add('err'); }
          return;
        }
        var updCluster=await _sb.from('ideas').update({cluster_id:T2TShared.currentTopicId}).eq('id',draggedId).select('id');
        if(updCluster.error) throw updCluster.error;
        if(!updCluster.data || !updCluster.data.length) throw new Error('Save was blocked for this card (no rows matched) -- nothing moved.');
        _sboardPatchRow(draggedId, {cluster_id:T2TShared.currentTopicId});
      }
      // .select() + row-count check, Aug 22 2026 -- same silent-no-op fix
      // as the nested-column reorder functions above.
      for(var i=0;i<ids.length;i++){
        var upd=await _sb.from('ideas').update({sort_order:i}).eq('id',ids[i]).select('id');
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Save was blocked for one of the headers in this row (no rows matched) -- reorder stopped partway.');
        _sboardPatchRow(ids[i], {sort_order:i});
      }
      if(before){
        var after=_sboardSnapshotRow(draggedId);
        _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(draggedId, before); }, redo:function(){ return _sboardApplyRowSnapshot(draggedId, after); }});
      }
      renderSeaBoard(true);
    }catch(err){
      if(statusEl){ statusEl.textContent='Reordering needs the sort_order Supabase column: '+err.message; statusEl.classList.add('err'); }
    }
  }

  function openSbHeaderDetail(headerRow){
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    var options='<option value="">— Top level —</option>'+_sboardHeaderList
      .filter(function(h){ return String(h.id)!==String(headerRow.id); })
      .map(function(h){ return '<option value="'+h.id+'">'+h.text_content+'</option>'; }).join('');
    var safeName=(headerRow.text_content||'').replace(/"/g,'&quot;');
    var apexTag=(!headerRow.cluster_id)?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +apexTag
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Name</label>'
      +'<input id="sb-h-name" type="text" value="'+safeName+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px;box-sizing:border-box">'
      +'<label style="display:block;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Nest under</label>'
      +'<select id="sb-h-parent" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'+options+'</select>'
      +'<div id="sb-h-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-h-save" style="flex:1">Save</button><button class="sc-ov-btn" id="sb-h-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var sel=document.getElementById('sb-h-parent');
    if(sel) sel.value=headerRow.cluster_id||'';
    T().wire('sb-h-save', async function(){
      var errEl=document.getElementById('sb-h-err');
      var newName=(document.getElementById('sb-h-name')||{}).value||'';
      newName=newName.trim();
      if(!newName){ if(errEl) errEl.textContent='Name can\'t be empty.'; return; }
      try{
        var newParent=sel.value||null;
        var upd=await _sb.from('ideas').update({cluster_id:newParent,text_content:newName}).eq('id',headerRow.id).select();
        if(upd.error) throw upd.error;
        if(!upd.data || !upd.data.length) throw new Error('Nothing changed — the header may not have matched.');
        _sboardPatchRow(headerRow.id, {cluster_id:newParent,text_content:newName});
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
    T().wire('sb-h-close', closeSbDetail);
  }

  async function openSbHeaderPeek(headerRow, onBack){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=(headerRow.text_content||'(untitled)').replace(/</g,'&lt;');
    ov.innerHTML='<div class="sc-peek-card">'
      +'<div class="sc-peek-topbar"><button id="sb-peek-back">⬅️</button><div class="sc-peek-title">'+safeName+'</div><button id="sb-peek-edit" title="Rename or move">✏️</button></div>'
      +'<div id="sb-peek-body" style="text-align:center;font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;padding:20px 0">Loading…</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-peek-back', onBack||closeSbDetail);
    // Rename/reparent lives here now, reusing the existing dialog — one place
    // to edit a header's name or nest it elsewhere, reachable from both the
    // board's own HEADER view-as button and CLUSTER's bucket peek.
    T().wire('sb-peek-edit', function(){ openSbHeaderDetail(headerRow); });
    var body=document.getElementById('sb-peek-body');
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board,adds_notes,adds_links,adds_related,adds_flags,storyboard_kind,source_project_id,board_type,org_name,hide_primary_badge,hide_all_initials')
        .eq('cluster_id',headerRow.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(200);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];
      if(!rows.length){
        body.textContent='Nothing under this Header yet.';
        return;
      }
      var subRows=rows.filter(function(r){ return r.content_type==='header'; });
      var itemRows=rows.filter(function(r){ return r.content_type!=='header'; });
      var _peekMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
      // Aug 11 2026 -- Larry (bug report): "Subber Peek screen on Apple
      // needs to clearly view every card." Root cause -- tile size here
      // grew with the text-size boost multiplier, but nothing ever checked
      // that three tiles + two gaps still fit inside the peek card. On an
      // iPhone-width screen with Larger/Largest boost on, the 3rd column
      // got pushed past the card's edge and, at the largest step, off the
      // screen entirely with no way to scroll to it. Cap tile size to
      // whatever the peek card can actually hold so all three columns
      // always fit, on any screen, at any boost level -- boost still grows
      // tiles wherever there's slack, it just can't push cards out of view
      // anymore.
      var _peekOverlayContentW=window.innerWidth-40; // .sb-overlay's 20px padding, both sides
      var _peekCardW=Math.min(360,_peekOverlayContentW*0.94)-28; // .sc-peek-card's width:min(360px,94%) minus its own 14px*2 padding
      var _peekMaxTile=Math.floor((_peekCardW-20)/3); // minus two 10px gaps, split three ways
      var _peekTile=Math.max(56, Math.min(Math.round(84*_peekMult), _peekMaxTile));
      var grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(3,'+_peekTile+'px);gap:10px;justify-content:center';
      subRows.forEach(function(sub){ grid.appendChild(_sboardMakeHeaderStackTile(sub, _peekTile, _peekTile, true)); });
      itemRows.forEach(function(item){ grid.appendChild(_sboardMakeTile(item, _peekTile, true)); });
      body.innerHTML='';
      body.style.cssText='';
      body.appendChild(grid);
    }catch(err){
      body.textContent=err.message;
      body.style.color='#b8562f';
    }
  }

  // Signal Flag peek, Aug 15 2026 (Larry: click-and-hold a flag to see
  // "all the cards with blue stars," same 550ms hold as the header-stack
  // peek above -- "consistent process to see what is inside"). Twin of
  // openSbHeaderPeek: same overlay, same grid, same tile renderers --
  // just filtered by key_slot_1/2/3 instead of cluster_id. Signal Flags
  // are a genuinely shared concept (one custom_keys table, both boards --
  // see _sboardSyncKeyLinks above), so this also checks briefing_cards
  // and lists any matches there as a simple jump-list underneath the
  // grid, rather than building a second full tile-grid renderer for a
  // different card shape.
  async function openSbKeyPeek(keyObj, onBack){
    var ov=document.getElementById('sb-detail-overlay');
    var safeName=_sboardEsc(keyObj.meaning||'Signal Flag');
    var swatchHTML='<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;'+_sboardKeyShapeCSS(keyObj.shape,keyObj.color)+'"></span>';
    // Aug 15 2026 (Larry: "does not look the same -- Idea Board has
    // return arrow, BB has X... make it like BB card") -- topbar now
    // matches the Briefing Board overlay's own layout: title on the
    // left, a single X on the right, no back-arrow.
    ov.innerHTML='<div class="sc-peek-card">'
      +'<div class="sc-peek-topbar" style="justify-content:space-between"><div class="sc-peek-title" style="text-align:left;flex:1">'+swatchHTML+safeName+'</div><button id="sb-keypeek-back" title="Close" style="width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #1a3a5c;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#1a3a5c">\u2715</button></div>'
      +'<div id="sb-keypeek-body" style="text-align:center;font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;padding:20px 0">Loading…</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-keypeek-back', onBack||closeSbDetail);
    var body=document.getElementById('sb-keypeek-body');
    var _sb=T().sb;
    // Aug 15 2026 (Larry: "make it like BB card") -- every match in
    // this peek, from either board, now renders with the exact same
    // card look (the Briefing Board's own warm/brown .bb-card style,
    // hand-matched here since this file doesn't share BB's stylesheet)
    // instead of the native square tile grid. The group label above
    // each set already says which board it's from, so the card itself
    // doesn't need a different shape or color to say it again.
    function _skpCardStyle(){
      return 'width:100%;box-sizing:border-box;cursor:pointer;background:#FFFDF7;border:1px solid #9c8b73;border-radius:3px;box-shadow:1px 2px 4px rgba(59,37,16,0.18);padding:8px 8px 12px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1.3;color:#3B2510;font-family:inherit';
    }
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var res=await _sb.from('ideas').select('id,user_id,content_type,image_url,text_content,cluster_id,heart_count,notes,sort_order,color,locked,assigned_user_id,key_slot_1,key_slot_2,key_slot_3,topic_owner_user_id,topic_scope_id,link_url,link_title,link_thumb,track_on_briefing_board,adds_notes,adds_links,adds_related,adds_flags,storyboard_kind,source_project_id,board_type,org_name,hide_primary_badge,hide_all_initials')
        .or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id)
        .order('created_at',{ascending:true}).limit(200);
      if(res.error) throw new Error(res.error.message);
      var rows=res.data||[];

      var cardRows=[];
      try{
        // Aug 15 2026 (Larry: "there might be many different boards of
        // each type... must include the TITLE") -- embeds the parent
        // board's own name via the existing board_id foreign key, so
        // each match can be grouped and labeled by its real board,
        // never a generic bucket. Disambiguated !board_id since
        // briefing_cards has a second FK into briefing_boards
        // (shared_to_board_id) that would otherwise make this ambiguous.
        var cardRes=await _sb.from('briefing_cards').select('id,task,board_id,briefing_boards!board_id(name)').or('key_slot_1.eq.'+keyObj.id+',key_slot_2.eq.'+keyObj.id+',key_slot_3.eq.'+keyObj.id).eq('archived',false).limit(200);
        if(!cardRes.error) cardRows=cardRes.data||[];
      }catch(e){}

      if(!rows.length && !cardRows.length){
        body.textContent='No cards carry this Signal Flag yet.';
        return;
      }
      body.innerHTML='';
      body.style.cssText='';

      if(rows.length){
        // Group Idea Board matches by which board (TOPIC) they actually
        // live on -- topic_scope_id is the nearest TOPIC-or-root
        // ancestor, same id briefing_boards.storyboard_project_id keys
        // off of, and that ancestor's own text_content is the board's
        // real title (same resolution the header->card sync already
        // uses). A traveler can have many independent boards of this
        // type (Field Guide, LifeWave, a delegated TOPIC, etc.), so one
        // ungrouped list would blur matches from unrelated boards
        // together.
        var scopeIds=[]; var seenScope={};
        rows.forEach(function(r){
          if(r.topic_scope_id && !seenScope[r.topic_scope_id]){ seenScope[r.topic_scope_id]=true; scopeIds.push(r.topic_scope_id); }
        });
        var scopeNameById={};
        if(scopeIds.length){
          try{
            var scopeRes=await _sb.from('ideas').select('id,text_content').in('id', scopeIds);
            (scopeRes.data||[]).forEach(function(s){ scopeNameById[s.id]=s.text_content||'Untitled Board'; });
          }catch(e){}
        }
        var byScope={}; var scopeOrder=[];
        rows.forEach(function(r){
          var sid=r.topic_scope_id||'';
          if(!byScope[sid]){ byScope[sid]=[]; scopeOrder.push(sid); }
          byScope[sid].push(r);
        });
        scopeOrder.forEach(function(sid, idx){
          var groupRows=byScope[sid];
          var boardName=scopeNameById[sid]||'Idea Board';
          var lbl=document.createElement('div');
          lbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:700;margin:'+(idx?'14px':'0')+' 0 6px;text-align:left';
          lbl.textContent='On the '+boardName+' Idea Board:';
          body.appendChild(lbl);
          var grid=document.createElement('div');
          grid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupRows.forEach(function(r){
            var isHeader=(r.content_type==='header');
            var card=document.createElement('div');
            card.style.cssText=_skpCardStyle();
            card.textContent=r.text_content||'(untitled)';
            card.addEventListener('click', function(){
              if(isHeader) openSbHeaderDetail(r); else openSbDetail(r);
            });
            grid.appendChild(card);
          });
          body.appendChild(grid);
        });
      } else {
        var noneMsg=document.createElement('div');
        noneMsg.style.cssText='font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#999;margin-bottom:8px';
        noneMsg.textContent='No Idea Board cards carry this flag yet.';
        body.appendChild(noneMsg);
      }

      if(cardRows.length){
        var byBoard={}; var boardOrder=[];
        cardRows.forEach(function(c){
          var bid=c.board_id||'';
          if(!byBoard[bid]){ byBoard[bid]=[]; boardOrder.push(bid); }
          byBoard[bid].push(c);
        });
        var bbOuter=document.createElement('div');
        bbOuter.style.cssText='margin-top:12px;text-align:left;border-top:1px solid #e3d9c6;padding-top:8px';
        boardOrder.forEach(function(bid, idx){
          var groupCards=byBoard[bid];
          var boardName=(groupCards[0].briefing_boards && groupCards[0].briefing_boards.name) || 'Untitled Board';
          var bbLbl=document.createElement('div');
          bbLbl.style.cssText='font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:700;margin:'+(idx?'12px':'0')+' 0 6px';
          bbLbl.textContent='On the '+boardName+' Briefing Board:';
          bbOuter.appendChild(bbLbl);
          var bbGrid=document.createElement('div');
          bbGrid.style.cssText='display:flex;flex-direction:column;gap:8px';
          groupCards.forEach(function(c){
            var b=document.createElement('div');
            b.style.cssText=_skpCardStyle();
            b.textContent=c.task||'(untitled)';
            b.addEventListener('click', function(){
              try{
                sessionStorage.setItem('bp_target','4010');
                sessionStorage.setItem('fg_open_card_id', c.id);
              }catch(e){}
              window.open(location.pathname+location.search, '_blank');
            });
            bbGrid.appendChild(b);
          });
          bbOuter.appendChild(bbGrid);
        });
        body.appendChild(bbOuter);
      }
    }catch(err){
      body.textContent=err.message;
      body.style.color='#b8562f';
    }
  }

  function _sboardIsAutoHeaderText(text){
    return /[:?]\s*$/.test(text);
  }

  function openQuickAddIdea(){
    var ov=document.getElementById('sb-detail-overlay');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Add an idea</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">'+(T2TShared.currentTopicId && _sboardHeadersById[T2TShared.currentTopicId] ? 'Goes under '+_sboardHeadersById[T2TShared.currentTopicId].text_content : 'Goes into NEW')+'</div>'
      +'<textarea id="qa-idea-text" placeholder="What if…?" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:4px;min-height:70px"></textarea>'
      +'<div style="font-size:calc(9px * var(--fg-text-scale,1));font-style:italic;color:#a3907a;margin-bottom:6px">End with : or ? to make it a Header automatically</div>'
      +'<div id="qa-idea-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="qa-idea-save" style="flex:1">Save</button><button class="sc-ov-btn" id="qa-idea-close" style="flex:1" aria-label="Close">✕</button></div>'
      +'</div>';
    ov.classList.add('active');
    var ta=document.getElementById('qa-idea-text');
    if(ta){
      setTimeout(function(){ ta.focus(); },50);
      ta.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('qa-idea-save').click(); }
      });
    }
    T().wire('qa-idea-close', closeSbDetail);
    T().wire('qa-idea-save', async function(){
      var text=(document.getElementById('qa-idea-text')||{}).value||'';
      text=text.trim();
      if(!text) return;
      var errEl=document.getElementById('qa-idea-err');
      var _sb=T().sb;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var contentType=_sboardIsAutoHeaderText(text)?'header':'text';
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:contentType,text_content:text,cluster_id:T2TShared.filter||null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        _sboardAddRow(ins.data);
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(errEl) errEl.textContent=err.message;
      }
    });
  }

  // One click, one swatch — recolors every header currently on this board
  // level (Purpose, MISC, NEW, and every visible content header) instead of
  // opening each one's SHAPING card individually.
  // Fix orphaned Purpose/Ideas headers — added July 12, 2026. Purpose and
  // the Ideas bucket used to be scoped to cluster_id=null, back when there
  // was only ever one project — that assumption broke the moment a second
  // real project (Field Guide) existed, since null stopped meaning "the
  // project" and started meaning "no project," with both projects'
  // top-level pills rendering alongside orphaned Purpose/Ideas rows that
  // looked like they belonged to a shared fake container. The ongoing
  // render logic is already fixed (see renderSeaBoard); this is the
  // one-time sweep for rows that were already created under the old rule.
  // Scans first, shows exactly what it found, only touches rows on
  // explicit confirm — never moves arbitrary idea content, only the three
  // known reserved header types this bug could have produced.
  async function _sboardOpenFixOrphansConfirm(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    try{
      var user=(await _sb.auth.getUser()).data.user;
      if(!user) throw new Error('Not signed in.');
      var wt=await T2TMedia.ensureWishTank();
      if(!wt || !wt.id) throw new Error('Wish Tank unavailable: '+(wt&&wt.error?wt.error:'unknown'));
      var res=await _sb.from('ideas').select('id,text_content').eq('user_id',user.id)
        .eq('content_type','header').is('cluster_id',null)
        .in('text_content',['Purpose','NEW','New Additions','MISC']);
      if(res.error) throw new Error(res.error.message);
      var orphans=(res.data||[]).filter(function(r){ return String(r.id)!==String(wt.id); });
      var ov2=document.getElementById('sb-detail-overlay');
      if(!orphans.length){
        ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
          +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Nothing to fix</div>'
          +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">No orphaned Purpose or Ideas headers found at the shared root.</div>'
          +'<button class="sc-ov-btn" id="sb-fix-close" style="width:100%" aria-label="Close">✕</button></div>';
        ov2.classList.add('active');
        T().wire('sb-fix-close', closeSbDetail);
        return;
      }
      var listHTML=orphans.map(function(o){ return '<div style="font-size:calc(12px * var(--fg-text-scale,1));padding:3px 0">• '+(o.text_content||'(untitled)')+'</div>'; }).join('');
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Found '+orphans.length+' orphaned header(s)</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:8px">These will move under Wish Tank. The Ideas header will be renamed "Wish Tank Ideas". Field Guide is untouched — it gets its own fresh Purpose and Ideas headers automatically the next time you open it.</div>'
        +'<div style="text-align:left;margin-bottom:10px">'+listHTML+'</div>'
        +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-fix-go" style="flex:1">Fix it</button><button class="sc-ov-btn" id="sb-fix-cancel" style="flex:1">Cancel</button></div>'
        +'</div>';
      ov2.classList.add('active');
      T().wire('sb-fix-cancel', closeSbDetail);
      T().wire('sb-fix-go', async function(){
        try{
          for(var i=0;i<orphans.length;i++){
            var o=orphans[i];
            var newName=(o.text_content==='Purpose')?'Purpose':(o.text_content==='MISC'?'MISC':'Wish Tank Ideas');
            var upd=await _sb.from('ideas').update({cluster_id:wt.id,text_content:newName}).eq('id',o.id);
            if(upd.error) throw upd.error;
            _sboardPatchRow(o.id, {cluster_id:wt.id,text_content:newName});
          }
          closeSbDetail();
          renderSeaBoard(true);
        }catch(err){
          var errBox=document.querySelector('.sc-overlay-card');
          if(errBox) errBox.insertAdjacentHTML('beforeend','<div style="color:#b8562f;font-size:calc(10px * var(--fg-text-scale,1));margin-top:6px">'+err.message+'</div>');
        }
      });
    }catch(err){
      var statusEl=document.getElementById('sc-status');
      if(statusEl){ statusEl.textContent='Fix failed: '+err.message; statusEl.classList.add('err'); }
    }
  }

  function _sboardOpenRecolorAll(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var swatches=_sboardColorPalette.map(function(c){
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer"></button>';
    }).join('');
    // Aug 25 2026, Larry: "Option should be to change all HEADERS ...OR...
    // change all SUBBERS" -- these are two genuinely different sets of
    // tiles that can both be showing on the SAME screen at once (see
    // renderGroup: each Header's own column mixes its Subber tiles in
    // with its plain idea cards, right there under that Header's row) --
    // this dialog only ever reaches the top-row Header tiles
    // (_sboardVisibleHeaders below), never the Subber tiles nested inside
    // each column. An earlier pass here just relabeled this one dialog to
    // say "headers/subbers," on the wrong assumption that it already
    // reached both depending on which screen you were on -- it didn't.
    // Reverted back to Header-only wording now that Recolor-all-SUBBERS
    // (right below) is its own separate, real action.
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all headers</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">Pick one — every header on this board, including Purpose, MISC and NEW, gets it. Subbers (nested inside a header) and individually-colored cards are untouched.</div>'
      +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+swatches+'</div>'
      +'<button class="sc-ov-btn" id="sb-recolor-close" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-recolor-close', closeSbDetail);
    ov.querySelectorAll('.sb-swatch').forEach(function(sw){
      sw.onclick=async function(){
        var c=sw.getAttribute('data-c');
        var ids=[_sboardPurposeId,_sboardMiscId,_sboardNewAdditionsId]
          .concat((_sboardVisibleHeaders||[]).map(function(h){ return h.id; }))
          .filter(Boolean);
        var uniq=ids.filter(function(id,idx){ return ids.indexOf(id)===idx; });
        var _sb=T().sb;
        try{
          for(var i=0;i<uniq.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',uniq[i]); _sboardPatchRow(uniq[i], {color:c}); }
        }catch(e){}
        T().setDefaultHeaderColor(c);
        closeSbDetail();
        renderSeaBoard(true);
      };
    });
  }

  // Recolor all SUBBERS — Aug 25 2026. Larry's own vocabulary, confirmed
  // against the project's original glossary entry for "Subber" ("a
  // storyboarding term for a vertical list of thoughts and ideas about a
  // given header... if a header is something you want to think about or
  // talk about, a subber holds what you wanted to say"): a SUBBER is
  // everything nested directly under an active Header, as a visual
  // location, regardless of what kind of row it is -- an individual
  // story/idea card (content_type:'text') just as much as a further
  // named cluster underneath that Header (what Larry calls a
  // SUB-HEADER, content_type:'header' nested one level down). Two
  // earlier passes here got this wrong by only reaching the
  // SUB-HEADER kind and missing plain cards entirely -- which is
  // exactly why Larry saw "nothing happened" recoloring People Too
  // Busy: that Header's only real content is 5 loose story cards, no
  // Sub-Header clusters at all, so the content_type:'header'-only
  // version had nothing to touch there. Gathers every row (any
  // content_type) whose cluster_id points at a Header actually showing
  // on this screen right now (Purpose/MISC/any visible content header).
  // Still excludes an auto-managed bucket (NEW/MISC/a parenthetical
  // auto-name) while it's genuinely empty -- same hidden-until-used
  // rule renderGroup itself follows -- since that one specific row type
  // is never actually on screen to look recolored either way.
  function _sboardVisibleSubberIds(){
    var parentIds=[_sboardPurposeId,_sboardMiscId]
      .concat((_sboardVisibleHeaders||[]).map(function(h){ return h.id; }))
      .filter(Boolean);
    var parentSet={};
    parentIds.forEach(function(id){ parentSet[String(id)]=true; });
    var _sbReservedAutoNames=['NEW','New Additions','MISC','Purpose'];
    return Object.keys(_sboardAllRowsById).filter(function(id){
      var r=_sboardAllRowsById[id];
      if(!(r && r.cluster_id!=null && parentSet[String(r.cluster_id)])) return false;
      if(r.content_type!=='header') return true; // a plain card -- on screen the moment it exists
      var isAutoManaged=_sbReservedAutoNames.indexOf(r.text_content)!==-1
        || /^\(.*\)$/.test(String(r.text_content||'').trim());
      if(!isAutoManaged) return true;
      return (_sboardChildCountById[r.id]||0)>0;
    });
  }

  function _sboardOpenRecolorAllSubbers(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var subberIds=_sboardVisibleSubberIds();
    if(!subberIds.length){
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:8px">No Subbers here yet</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">None of the headers on this board have anything under them right now -- no story cards, no clusters -- so there\'s nothing for this to visibly change.</div>'
        +'<button class="sc-ov-btn" id="sb-recolor-subbers-close" style="width:100%">OK</button>'
        +'</div>';
      ov.classList.add('active');
      T().wire('sb-recolor-subbers-close', closeSbDetail);
      return;
    }
    var swatches=_sboardColorPalette.map(function(c){
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer"></button>';
    }).join('');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all subbers</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">Pick one — everything nested under a header on this board gets it: story cards and any of their own clusters alike. Only the Headers themselves stay as they are.</div>'
      +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+swatches+'</div>'
      +'<button class="sc-ov-btn" id="sb-recolor-subbers-close" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-recolor-subbers-close', closeSbDetail);
    ov.querySelectorAll('.sb-swatch').forEach(function(sw){
      sw.onclick=async function(){
        var c=sw.getAttribute('data-c');
        var _sb=T().sb;
        try{
          for(var i=0;i<subberIds.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',subberIds[i]); _sboardPatchRow(subberIds[i], {color:c}); }
        }catch(e){}
        T().setDefaultSubberColor(c);
        closeSbDetail();
        renderSeaBoard(true);
      };
    });
  }

  // Sort headers — Larry, Aug 3 2026: "I would like to toggle headers into
  // alphabetical order or number order in gear." Dragging one header at a
  // time already works but is slow to arrange a whole row by hand; this
  // computes the full order in one pass and writes it in one bulk
  // operation, wrapped in the same pocket-watch spinner
  // _sboardSpinWhile already gives every screen change (see the header
  // drag-drop handlers above) so a long row doesn't look frozen while the
  // sequential Supabase writes run.
  //
  // Only the real content headers move -- Purpose, NEW ("New Additions"),
  // and MISC are auto-managed, reserved headers with their own fixed
  // conventional spots (first, second, and always-last respectively —
  // see _rowPriority in renderSeaBoard) and are deliberately left exactly
  // where they already sit.
  function _sboardOpenSortHeadersPicker(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var headers=(_sboardVisibleHeaders||[]).filter(function(h){
      return String(h.id)!==String(_sboardNewAdditionsId);
    });
    if(headers.length<2){
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:8px">Nothing to sort</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">This board needs at least two headers before an order means anything.</div>'
        +'<button class="sc-ov-btn" id="sb-sort-close" style="width:100%" aria-label="Close">✕</button></div>';
      ov.classList.add('active');
      T().wire('sb-sort-close', closeSbDetail);
      return;
    }
    // Larry, Aug 3 2026: "If headers or subbers are sorted alphabetically
    // the order number does NOT change, allowing to resort to number
    // order." Redesigned around that: A -> Z is now a temporary, unsaved
    // DISPLAY-only rearrangement (_sboardAlphaHeaderView, consulted by
    // renderSeaBoard) -- it never writes sort_order, so every card's real
    // ORDER # badge keeps showing its true position the whole time it's
    // active. Number order simply switches that view back off -- also no
    // write, since the real order was never touched to begin with.
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Sort headers</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;margin-bottom:10px">A → Z is just a look -- it never changes anyone\'s ORDER #. Number order always brings back the real arrangement.</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
      +'<button class="sc-ov-btn" id="sb-sort-alpha" style="width:100%">A → Z</button>'
      +'<button class="sc-ov-btn" id="sb-sort-number" style="width:100%">Number order</button>'
      +'</div>'
      +'<button class="sc-ov-btn" id="sb-sort-close" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-sort-close', closeSbDetail);
    T().wire('sb-sort-alpha', function(){ closeSbDetail(); _sboardSetAlphaHeaderView(true); });
    T().wire('sb-sort-number', function(){ closeSbDetail(); _sboardSetAlphaHeaderView(false); });
  }

  // No Supabase round trip either way now, so no spinner needed -- this
  // is purely an in-memory view flag plus a re-render, done before the
  // click handler above even returns.
  function _sboardSetAlphaHeaderView(on){
    _sboardAlphaHeaderView=!!on;
    renderSeaBoard(true);
  }

  // Gear menu — consolidates the traveler options that used to be separate
  // top-row buttons (recolor all headers, fix orphaned Purpose/Ideas
  // headers, full screen) into one place, leaving only Gear and X visible.
  // Locked July 16, 2026.
  // Named (not inline) as of Aug 3 2026 so the desk's own Idea Board
  // toggle button (screen-zero.js, second tap while the Storyboard is
  // already open) can call this exact same close routine via
  // T2TStoryboard.closeBoard, instead of the generic T2T.goBack() --
  // that generic path still treats 1010 as an old backpack-hub utility
  // screen (still listed in backpack.js's _utilScreens) and reopens the
  // obsolete \u2630 backpack menu instead of actually closing the board.
  // Larry, Aug 3 2026: "closing storyboard went to obsolete backpack
  // rather than to storyboard button." Moved to this outer scope (was
  // an inline handler inside injectSeaOfIdeasCluster) specifically so
  // T2TStoryboard.closeBoard, assigned further down in this same outer
  // scope, can actually reference it.
  function _sboardCloseBoard(){
    var fgr=document.getElementById('fg-root'); if(fgr){ fgr.classList.remove('cl-widescreen'); fgr.classList.remove('isx-full'); }
    if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
    T2TShared.currentTopicId=null; T2TShared.filter=null;
    // Return override, added July 21, 2026 for the Briefing Board's
    // Unhooking Ideas hand-off -- if whoever sent us here asked to be
    // returned to specifically (e.g. the Hang-Up card that opened
    // this board), honor that before falling back to the normal
    // chapter-flow / backpack rules below.
    var returnOverride = T().consumeReturnOverride && T().consumeReturnOverride();
    if(returnOverride){ returnOverride(); return; }
    var viaChapter = T().consumeSeaChapterEntry();
    if(T().currentFile()==='dream.html' && document.getElementById('s-create-toc') && viaChapter){ T().nav('s-create-toc'); }
    else { T().goBackStack(); }
  }

  // Team Roster (Aug 8 2026) -- same locked design as the Briefing
  // Board's Settings > Team: reads like it would print, email/phone
  // always visible, an always-on Notes field per person, role symbol
  // doubles as the picker trigger. Scoped to the current PROJECT (the
  // fractal root storyboard_members already keys off of), resolved via
  // the same climb-to-root helper the PROJECT switcher uses.
  function _sboardOpenTeam(scopeRow, backFn){
    var projectRow=scopeRow||_sboardCurrentProjectRow();
    var ov=document.getElementById('sb-detail-overlay'); if(!ov || !projectRow) return;
    ov.innerHTML='<div class="sc-overlay-card sb-team-print" style="text-align:center;width:min(400px,92vw)">'
      +'<div style="display:flex;justify-content:flex-end;margin-bottom:2px"><button class="sc-ov-btn" id="tm-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<input type="text" class="tm-groupname" id="tm-groupname" value="'+_esc9710(projectRow.text_content||'')+'">'
      +'<div id="tm-list-view"></div>'
      +'<div class="tm-addrow">'
        +'<div class="tm-add-tile" id="tm-add-tile" title="Add a cast member">+</div>'
        +'<div class="tm-print-tile" id="tm-print-tile" title="Print roster">&#128438;</div>'
      +'</div>'
      +'<div id="tm-add-row" style="display:none;margin-top:10px;gap:6px">'
        +'<div class="tm-add-wrap">'
          +'<input type="text" id="tm-add-email" placeholder="Type a name or email..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:calc(12px * var(--fg-text-scale,1));padding:6px 8px;border:1px solid #cfe4f2;border-radius:6px">'
          +'<div class="tm-add-suggest" id="tm-add-suggest" style="display:none"></div>'
        +'</div>'
        +'<button class="sc-ov-btn save" id="tm-add-confirm">Add</button>'
      +'</div>'
      +'<div id="tm-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin-top:6px;display:none"></div>'
    +'</div>';
    ov.classList.add('active');
    _tmLoadRoster(projectRow).then(function(){ _tmRenderRoster(projectRow); });
    T().wire('tm-close', function(){ closeSbDetail(); (backFn||_sboardOpenPeopleMenu)(); });
    T().wire('tm-print-tile', function(){ window.print(); });
    async function _tmConfirmAddMember(email){
      var input=document.getElementById('tm-add-email');
      var errEl=document.getElementById('tm-error');
      var sugg=document.getElementById('tm-add-suggest');
      if(!email) return;
      var res=await _tmAddMember(projectRow, email);
      if(!res.ok){ if(errEl){ errEl.textContent=res.msg; errEl.style.display='block'; } return; }
      if(errEl) errEl.style.display='none';
      if(input) input.value='';
      if(sugg) sugg.style.display='none';
      var row=document.getElementById('tm-add-row'); if(row) row.style.display='none';
      await _tmLoadRoster(projectRow); _tmRenderRoster(projectRow);
    }
    T().wire('tm-add-tile', function(){
      if(!_tmRosterCanManage) return;
      var row=document.getElementById('tm-add-row');
      var opening = row && row.style.display==='none';
      if(row) row.style.display = opening ? 'flex' : 'none';
      if(opening){
        _tmFetchAllMembers().then(function(){ _tmRenderMemberSuggestions(projectRow, ''); });
      } else {
        var sugg=document.getElementById('tm-add-suggest'); if(sugg) sugg.style.display='none';
      }
    });
    var tmEmailInput=document.getElementById('tm-add-email');
    if(tmEmailInput){
      tmEmailInput.addEventListener('input', function(){ _tmRenderMemberSuggestions(projectRow, tmEmailInput.value); });
      tmEmailInput.addEventListener('focus', function(){ _tmRenderMemberSuggestions(projectRow, tmEmailInput.value); });
    }
    var tmSuggBox=document.getElementById('tm-add-suggest');
    if(tmSuggBox){
      tmSuggBox.addEventListener('click', function(e){
        var row=e.target.closest('.tm-add-suggest-row'); if(!row) return;
        _tmConfirmAddMember(row.getAttribute('data-email'));
      });
    }
    var gnEl=document.getElementById('tm-groupname');
    if(gnEl) gnEl.addEventListener('change', async function(){
      if(!_tmRosterIsOwner) return;
      var _sb=T().sb; if(!_sb) return;
      projectRow.text_content=gnEl.value;
      try{ await _sb.from('ideas').update({text_content: gnEl.value}).eq('id', projectRow.id); }catch(e){}
    });
    var confirmBtn=document.getElementById('tm-add-confirm');
    if(confirmBtn) confirmBtn.addEventListener('click', async function(){
      var input=document.getElementById('tm-add-email');
      var email=input?input.value.trim():'';
      await _tmConfirmAddMember(email);
    });
    var wrap=document.getElementById('tm-list-view');
    if(wrap){
      wrap.addEventListener('click', function(e){
        var sym=e.target.closest('.tm-clickable'); if(!sym) return;
        var p=document.getElementById('tm-rp-'+sym.getAttribute('data-uid'));
        if(p) p.style.display = (p.style.display==='none') ? 'block' : 'none';
      });
      wrap.addEventListener('change', async function(e){
        var t=e.target;
        if(t.classList.contains('tm-r-sponsor') || t.classList.contains('tm-r-leader') || t.classList.contains('tm-r-canfac') || t.classList.contains('tm-r-fac')){
          var uid=t.getAttribute('data-uid');
          var panel=document.getElementById('tm-rp-'+uid); if(!panel) return;
          if(t.classList.contains('tm-r-sponsor') && t.checked){ panel.querySelector('.tm-r-leader').checked=false; }
          if(t.classList.contains('tm-r-leader') && t.checked){ panel.querySelector('.tm-r-sponsor').checked=false; }
          var role = panel.querySelector('.tm-r-sponsor').checked ? 'sponsor' : (panel.querySelector('.tm-r-leader').checked ? 'leader' : null);
          var canFac = panel.querySelector('.tm-r-canfac').checked;
          var isFac = panel.querySelector('.tm-r-fac').checked;
          await _tmSaveMemberRole(projectRow, uid, role, canFac, isFac);
        } else if(t.classList.contains('tm-owner-notes')){
          await _tmSaveOwnerNotes(projectRow, t.value);
        } else if(t.classList.contains('tm-owner-phone')){
          await _tmSaveOwnerPhone(t.value);
        } else if(t.classList.contains('tm-notes-input')){
          await _tmSaveMemberNotes(projectRow, t.getAttribute('data-uid'), t.value);
        }
      });
    }
  }

  // Sept 12 2026 (later same day), Larry: "This should be its own
  // file, right? You are not making multiple copies?" -- the seven-
  // item Home list (icons, labels, order, disabled look, Sign Out's
  // confirm+call) now comes from settings-menu.js, shared with
  // Desktop/Session/Briefing Board, instead of being hand-typed here.
  // This file still owns its own title-row-with-X heading and its own
  // People/Appearance/Preferences screens below Home -- those are
  // real Storyboard features, not something to share.
  function _sboardOpenGearMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var built = window.T2TSettingsMenu.renderHomeHTML({
      // People/Guests retired Sept 12 2026, Larry: "remove the People
      // screen ... CAST is our source of truth." No onClick passed here
      // now, same as Desktop/Session -- settings-menu.js's canonical
      // Home list renders it disabled with its own explanation rather
      // than leaving it out (per the "gray out, don't omit" lock from
      // earlier the same day).
      appearance:  { onClick: _sboardOpenAppearanceMenu },
      preferences: { onClick: _sboardOpenPreferencesMenu },
      reload:      { onClick: function(){ closeSbDetail(); T().resetAndReturn(); } },
      menu:        { onClick: function(){ closeSbDetail(); T().goMG(); } },
      // History has no Storyboard equivalent (the Briefing Board's
      // History is its own card-move log), so it shows here disabled
      // rather than omitted, same convention as People/Preferences on
      // the plain desktop.
      signout:     { onClick: function(){ window.T2TSettingsMenu.confirmSignOut(closeSbDetail); } }
    }, { idPrefix: 'sb-set-go-', btnClass: 'sc-ov-btn', includeHeading: false });
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Settings</span><button class="sc-ov-btn" id="sb-gear-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        + built.html
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    window.T2TSettingsMenu.wireHomeItems(ov, built.items);
    T().wire('sb-gear-close', closeSbDetail);
  }
  // People/Guests screen retired Sept 12 2026, Larry: "remove the People
  // screen ... CAST is our source of truth." Both old entry points (the
  // gear menu's People item, above, and the TOPIC button in
  // idea-storyboard-card-detail.js) are gone; this screen and its
  // Manage-Access/Guests flow have no caller left.

  async function _sboardOpenDelegateTopicPicker(headerRow, scopeRow){
    var ov=document.getElementById('sb-detail-overlay'); if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Make this a TOPIC</span><button class="sc-ov-btn" id="sb-deleg-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:8px">Pick who owns it. They\u2019ll get their own independent Cast to build \u2014 you\u2019ll become their Sponsor. Only people already on your own current team can be picked.</div>'
      +'<div id="sb-deleg-list" style="display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto;margin-bottom:8px"><div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">Loading your team\u2026</div></div>'
      +'<div id="sb-deleg-error" style="font-size:calc(11px * var(--fg-text-scale,1));color:#b8562f;margin-top:4px;display:none"></div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-deleg-close', function(){ closeSbDetail(); openSbDetail(headerRow); });

    await _tmLoadRoster(scopeRow);
    var candidates=_tmAllRosterRows(scopeRow).filter(function(m){ return !m.isOwner; });
    var list=document.getElementById('sb-deleg-list'); if(!list) return;
    if(!candidates.length){
      list.innerHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">Nobody\u2019s on your team yet \u2014 add a Cast Member first.</div>';
      return;
    }
    list.innerHTML=candidates.map(function(m){
      return '<div class="sb-hdr-vitem sb-deleg-cand" data-uid="'+_esc9710(m.user_id)+'" style="text-align:left;cursor:pointer">'
        +'<div style="font-weight:600">'+_esc9710(m.name||m.email||'')+'</div>'
        +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#888">'+_esc9710(m.email||'')+'</div>'
      +'</div>';
    }).join('');
    list.querySelectorAll('.sb-deleg-cand').forEach(function(row){
      row.addEventListener('click', async function(){
        var uid=row.getAttribute('data-uid');
        var errEl=document.getElementById('sb-deleg-error'); if(errEl) errEl.style.display='none';
        var _sb=T().sb;
        try{
          var res=await _sb.rpc('delegate_topic', {p_header_id: headerRow.id, p_new_owner_user_id: uid});
          if(res.error) throw res.error;
        }catch(e){
          if(errEl){ errEl.textContent=(e&&e.message)||'Could not delegate this TOPIC.'; errEl.style.display='block'; }
          return;
        }
        try{
          var fresh=await _sb.from('ideas').select('*').eq('id',headerRow.id).maybeSingle();
          if(!fresh.error && fresh.data){
            _sboardAllRowsById[headerRow.id]=fresh.data;
            headerRow=fresh.data;
          }
        }catch(e){}
        closeSbDetail(); openSbDetail(headerRow);
      });
    });
  }
  function _sboardOpenAppearanceMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var fsIcon=document.fullscreenElement?'\u21a9':'\u26f6';
    var fsLabel=document.fullscreenElement?'Exit full screen':'Full screen';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Appearance</span><button class="sc-ov-btn" id="sb-appearance-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-gear-recolor" style="width:100%">🎨 Recolor all headers</button>'
        +'<button class="sc-ov-btn" id="sb-gear-recolor-subbers" style="width:100%">🎨 Recolor all subbers</button>'
        +'<button class="sc-ov-btn" id="sb-gear-fullscreen" style="width:100%">'+fsIcon+' '+fsLabel+'</button>'
        +'<button class="sc-ov-btn" id="sb-gear-textsize" style="width:100%">🔠 Text size</button>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-gear-recolor', function(){ closeSbDetail(); _sboardOpenRecolorAll(); });
    T().wire('sb-gear-recolor-subbers', function(){ closeSbDetail(); _sboardOpenRecolorAllSubbers(); });
    T().wire('sb-gear-fullscreen', function(){ closeSbDetail(); T2TSession.toggleFullscreen(); });
    // Aug 3 2026: Storyboard is full-screen (.isx-full), so the desk's own
    // gear/text-size picker is hidden here -- this reaches the same shared
    // picker screen-zero.js owns, so the choice stays one control, not two.
    T().wire('sb-gear-textsize', function(){ closeSbDetail(); if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
    T().wire('sb-appearance-close', _sboardOpenGearMenu);
  }
  function _sboardOpenPreferencesMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    // Aug 29 2026, Larry: board-wide "turn initials on or off all the
    // cards at one time... if I am the only person on the project, there
    // is no need to have initials on any cards." Scoped to whichever
    // project is currently open -- see _sboardSetHideAllInitials.
    var _sbPrefsProjRow=_sboardCurrentProjectRow();
    var _sbAllInitialsHidden=!!(_sbPrefsProjRow && _sbPrefsProjRow.hide_all_initials);
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c">Preferences</span><button class="sc-ov-btn" id="sb-preferences-close" aria-label="Close" style="padding:4px 10px">\u2715</button></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
        +'<button class="sc-ov-btn" id="sb-gear-sort" style="width:100%">🔤 Sort headers</button>'
        +'<button class="sc-ov-btn" id="sb-gear-keys" style="width:100%">🚩 Signal Flags</button>'
        +'<button class="sc-ov-btn" id="sb-gear-fix-orphans" style="width:100%">🔧 Fix Purpose/Ideas headers</button>'
      +'</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(12px * var(--fg-text-scale,1));color:#1a3a5c;padding:8px 4px;border-top:1px solid #dce7f0;margin-bottom:4px">'
        +'<span>&#128373; Initials on cards<br><span style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;font-weight:400">This whole project, all cards at once</span></span>'
        +'<div class="sb-gear-tabs" id="sb-prefs-initials-toggle" style="margin-bottom:0;width:auto;min-width:88px;flex-shrink:0">'
          +'<button type="button" class="sb-gear-tab'+(_sbAllInitialsHidden?'':' active')+'" data-hide="0" style="padding:5px 8px">ON</button>'
          +'<button type="button" class="sb-gear-tab'+(_sbAllInitialsHidden?' active':'')+'" data-hide="1" style="padding:5px 8px">OFF</button>'
        +'</div>'
      +'</div>'
      +'</div>';
    ov.classList.add('active');
    T().wire('sb-gear-sort', function(){ closeSbDetail(); _sboardOpenSortHeadersPicker(); });
    T().wire('sb-gear-keys', function(){ closeSbDetail(); _sboardOpenKeyLibraryManager(); });
    T().wire('sb-gear-fix-orphans', function(){ closeSbDetail(); _sboardOpenFixOrphansConfirm(); });
    var initialsToggle=document.getElementById('sb-prefs-initials-toggle');
    if(initialsToggle) initialsToggle.addEventListener('click', function(e){
      var btn=e.target.closest('.sb-gear-tab'); if(!btn) return;
      var hide=(btn.getAttribute('data-hide')==='1');
      initialsToggle.querySelectorAll('.sb-gear-tab').forEach(function(b){ b.classList.toggle('active', b===btn); });
      _sboardSetHideAllInitials(hide);
    });
    T().wire('sb-preferences-close', _sboardOpenGearMenu);
  }

  /* Deletion-sticks backstop, Aug 18 2026 -- same rule as header-data.js's
     _parentDefaultsSeeded (Larry: "adding headers is only a default; if
     headers already exist, do not add any default headers"). This file
     keeps its own local copy of the Purpose/NEW ensure-calls instead of
     going through T2TData, so the guard has to be duplicated here too or
     a deliberately-trashed Purpose/NEW header on the Idea Storyboard
     would just get silently recreated on the next render.
     First cut checked "does this parent currently have any header at
     all" -- broke the instant a traveler deleted the LAST header on an
     otherwise-empty board (the common NEW+MISC-only shape), since the
     count legitimately hits zero right when a deletion should be
     sticking. Larry hit exactly this trying to delete MISC. Fixed with
     the same persisted header_defaults_seeded column header-data.js
     uses -- once a parent's defaults have ever been seeded, that stays
     true forever, independent of how many headers remain. */
  async function _sboardParentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return false;
    var _sb=T().sb;
    var res=await _sb.from('ideas').select('header_defaults_seeded').eq('id',parentId).limit(1);
    if(res.error || !res.data || !res.data.length) return false;
    if(res.data[0].header_defaults_seeded) return true;
    // Session 231 (Aug 20) -- same gap and same self-heal as
    // header-data.js's _parentDefaultsSeeded (this file keeps its own
    // local copy of the Purpose/NEW ensure-calls instead of going
    // through T2TData, so the fix has to be duplicated here too): the
    // flag only gets set on an actual auto-insert, so a board Larry
    // built by hand still read as "unseeded" and kept getting a fresh
    // default header shoved into it. If this parent already has ANY
    // header at all, that's proof it's not brand-new -- mark it seeded
    // and stop inserting.
    var kids=await _sb.from('ideas').select('id').eq('content_type','header').eq('cluster_id',parentId).limit(1);
    if(!kids.error && kids.data && kids.data.length){
      _sboardMarkParentDefaultsSeeded(parentId);
      return true;
    }
    return false;
  }

  async function _sboardMarkParentDefaultsSeeded(parentId){
    if(parentId===null||parentId===undefined) return;
    try{ await T().sb.from('ideas').update({header_defaults_seeded:true}).eq('id',parentId); }catch(e){}
  }

  async function _sboardEnsurePurposeHeader(parentId){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    // Shared-project fix, Aug 14 2026 -- Larry: 'one shared purpose for
    // every story.' Drop the user_id filter on the lookup so every Cast
    // member reuses the project's one true Purpose header instead of each
    // person who opens it spawning their own. RLS still governs what this
    // user is allowed to see, so this can't leak a Purpose header from a
    // project they're not on.
    var q=_sb.from('ideas').select('id').eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){ _sboardPurposeId=existing.data[0].id; return _sboardPurposeId; }
    if(await _sboardParentDefaultsSeeded(parentId)){ _sboardPurposeId=null; return null; }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    _sboardPurposeId=ins.data.id;
    _sboardMarkParentDefaultsSeeded(parentId);
    return _sboardPurposeId;
  }

  async function _sboardEnsureNewAdditionsHeader(parentId, desiredName){
    var _sb=T().sb;
    var user=(await _sb.auth.getUser()).data.user;
    if(!user) throw new Error('Not signed in.');
    var name=desiredName||'NEW';
    // Matches the current label, the desired label, and the pre-rename one,
    // so boards from any earlier naming era self-heal instead of spawning
    // a duplicate reserved header.
    // Shared-project fix, Aug 14 2026 -- see _sboardEnsurePurposeHeader
    // above: drop the user_id filter so every Cast member reuses the same
    // NEW header instead of each person spawning their own.
    var q=_sb.from('ideas').select('id,text_content').eq('content_type','header').in('text_content',['NEW','New Additions',name]);
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){
      var row=existing.data[0];
      _sboardNewAdditionsId=row.id;
      if(row.text_content!==name){ try{ await _sb.from('ideas').update({text_content:name}).eq('id',row.id); }catch(e){} }
      return _sboardNewAdditionsId;
    }
    // Bug fix, Aug 25 2026 (Larry: "Moved up 'People Too Busy' header but
    // saw NO subbers as previously designed" -- really its own loose
    // cards, which is worse: they weren't hidden, the whole board came up
    // blank). Root cause: header_defaults_seeded is a one-way flag --
    // once true, it never resets -- so a header whose auto-created NEW
    // bucket ever got deleted (leftover from earlier testing, a manual
    // cleanup) can never get a fresh one again, even much later when it's
    // promoted to a real Topic with real loose content that genuinely
    // needs a home. Direct loose content only ever displays THROUGH this
    // bucket (see renderLocalNewAdditions in renderSeaBoard) -- with no
    // bucket to hold it, it isn't just unlabeled, it's invisible. Found
    // live on Larry's own account: "People Too Busy" and "Out of the
    // Office" both already carry this flag with zero header children,
    // meaning both would have gone blank the moment either was ever
    // promoted. The seeded flag should only ever skip creating an EMPTY
    // bucket nobody needs; it should never be able to make real,
    // already-existing content vanish. So: if this parent already has
    // loose, unbucketed content sitting directly on it, that alone is
    // proof a bucket is needed right now, regardless of what the flag
    // says.
    var seeded=await _sboardParentDefaultsSeeded(parentId);
    if(seeded){
      var looseCheck=(parentId===null||parentId===undefined) ? null
        : await _sb.from('ideas').select('id').eq('cluster_id',parentId).in('content_type',['image','text','link']).limit(1);
      if(!(looseCheck && !looseCheck.error && looseCheck.data && looseCheck.data.length)){
        _sboardNewAdditionsId=null; return null;
      }
    }
    var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
    if(ins.error) throw new Error('Ideas header setup failed: '+ins.error.message);
    _sboardNewAdditionsId=ins.data.id;
    _sboardMarkParentDefaultsSeeded(parentId);
    return _sboardNewAdditionsId;
  }

  function _sboardMoveOptionsHTML(excludeId, currentClusterId){
    var opts='<option value=""'+(!currentClusterId?' selected':'')+'>NEW</option>';
    opts+=_sboardHeaderList.filter(function(h){ return String(h.id)!==String(excludeId); })
      .map(function(h){ var sel=(currentClusterId && String(h.id)===String(currentClusterId))?' selected':''; return '<option value="'+h.id+'"'+sel+'>'+(h.text_content||'(untitled)')+'</option>'; }).join('');
    opts+='<option value="__new__">+ Create new header…</option>';
    return opts;
  }

  // Unified SHAPING card — same overlay, same buttons, regardless of whether
  // the card double-clicked is an idea, a header, or a sub-header. Type is a
  // state (has children / ends in : or ?), not a different kind of object.
  // Full-viewport zoom for a single image — dismissed by clicking
  // anywhere on the overlay, the ✕, or Escape. Built fresh and torn
  // down each time rather than living in static markup, since it's
  // only ever needed for as long as one image is being examined.
  function _sbOpenImageLightbox(url){
    var lb=document.createElement('div');
    lb.id='sb-img-lightbox';
    lb.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;'
      +'display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    lb.innerHTML='<img src="'+url+'" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;pointer-events:none">'
      +'<button id="sb-img-lightbox-close" aria-label="Close" style="position:absolute;top:16px;right:16px;width:38px;height:38px;'
      +'border-radius:50%;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.5);color:#fff;font-size:calc(18px * var(--fg-text-scale,1));cursor:pointer">\u2715</button>';
    document.body.appendChild(lb);
    function close(){
      if(lb.parentNode) lb.parentNode.removeChild(lb);
      document.removeEventListener('keydown', onKey);
    }
    lb.addEventListener('click', close);
    var closeBtn=lb.querySelector('#sb-img-lightbox-close');
    if(closeBtn) closeBtn.addEventListener('click', function(e){ e.stopPropagation(); close(); });
    function onKey(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown', onKey);
  }

  // Additions, Aug 27 2026 -- Idea Card counterpart to BB_ADDITIONS/
  // wireAdditionToggles in briefing-board.js. Each entry names the
  // Supabase column (flag), the checkbox id (cb), and the body it gates
  // (body). Checking a box opens its section and saves immediately
  // (same immediate-save convention Notes/Video-Link already use here,
  // not the bundled save-on-close batching Briefing Board's DETAILS
  // uses); unchecking just hides the section again -- whatever was
  // already typed in there stays put, so re-checking it later brings it
  // right back.
  var IC_ADDITIONS = [
    {flag:'adds_notes', cb:'sb-add-notes', body:'sb-notes-body'},
    {flag:'adds_links', cb:'sb-add-links', body:'sb-links-body'},
    {flag:'adds_related', cb:'sb-add-related', body:'sb-related-body'},
    {flag:'adds_flags', cb:'sb-add-flags', body:'sb-flags-body'}
  ];
  function wireIcAdditionToggles(item, statusBox){
    var _sb=T().sb;
    IC_ADDITIONS.forEach(function(a){
      var cb=document.getElementById(a.cb);
      if(!cb) return;
      cb.addEventListener('change', async function(){
        var body=document.getElementById(a.body);
        if(body) body.style.display=cb.checked?'':'none';
        var patch={}; patch[a.flag]=cb.checked;
        try{
          var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
          if(upd.error) throw upd.error;
          item[a.flag]=cb.checked;
          _sboardPatchRow(item.id, patch);
        }catch(err){ if(statusBox) statusBox.textContent='Needs the '+a.flag+' Supabase column.'; }
      });
    });
  }
