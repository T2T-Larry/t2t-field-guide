/* ============================================================
   idea-storyboard-board-columns.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   BOARD COLUMNS. The three column builders renderSeaBoard uses:
   _sboardRenderGroup (one Header column with its sub-headers and cards),
   _sboardRenderLocalNewAdditions (the local NEW / Parking Lot column of a
   nested board) and _sboardRenderLetterGroup (an A-Z letter column).

   Split out of idea-storyboard-screens.js on Oct 10, 2026 (screens.js
   split, step 2 of the plan on the Code Efficiency Maintenance card).
   These used to be closures nested inside renderSeaBoard. They only ever
   READ seven of its locals (the sizes, text-size multiplier and the two
   header lookup tables), so each function now takes an explicit context
   object (ctx) and unpacks those names in its first line; the bodies are
   otherwise moved unchanged. renderSeaBoard keeps same-named one-line
   wrappers, so none of its call sites changed.

   Like its sibling Idea Storyboard files this lives in the shared
   page-global scope (no wrapper, no namespace). Load order: anywhere
   before idea-storyboard-9710.js, which must load LAST in this family.
   ============================================================ */

function _sboardRenderGroup(ctx, headerRow, depth){
  var subHeadersOf=ctx.subHeadersOf, childrenOfHeader=ctx.childrenOfHeader, HEADER_W=ctx.HEADER_W, _tsMult=ctx._tsMult, HEADER_H=ctx.HEADER_H, SUBBER_W=ctx.SUBBER_W, SUBBER_H=ctx.SUBBER_H;
    var name=headerRow.text_content||'(untitled cluster)';
    var isReserved=(name==='Trash'||name==='MISC'||name==='Purpose'||name==='NEW'||name==='Parking Lot');
    // MISC can take a new card just as freely as any content header —
    // it's specifically for ideas that don't relate to the current
    // TOPIC, so excluding it from the [+] made no sense. Purpose picked
    // up the same [+] on Aug 4, 2026 per Larry -- it's still a
    // one-statement header by default, but he wants the option to add
    // cards under it same as any other column. Aug 7 2026, Larry:
    // NEW gets the same [+] now too, same reasoning -- only Trash
    // stays excluded (off-limits, not a place to add anything to).
    var blocksNewSubbers=(name==='Trash');
    var straight=true;
    // Sorted by sort_order, Aug 3 2026 -- previously rendered in
    // whatever order Supabase happened to return them, since nothing
    // ever wrote a meaningful sort_order for Subbers. Now that
    // dragging one Subber onto another actually reorders them (see
    // _sboardReorderOrMoveSubber), the render needs to respect that
    // order instead of ignoring it.
    var subs=(subHeadersOf[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
    // Aug 25 2026, Larry: promoting a header (with its own loose
    // content already on it) up into its own Topic auto-creates a
    // real NEW header there to hold that content while it's being
    // explored -- useful while it's in use, but backing back out to
    // this bigger view then shows that same NEW row as a genuinely
    // empty Subber forever after (its "content" is really the
    // Topic's own direct cards, not children of the NEW row itself,
    // so from one level up it just looks empty). A header Larry
    // names himself always stays put even empty -- that's a
    // deliberate choice -- but the board's own auto-managed
    // placeholders are just administrative scaffolding, so they're
    // hidden here at any depth once they have nothing left inside
    // them (_sboardChildCountById, computed above from the real,
    // unfiltered data -- this is purely a display filter, nothing
    // about the row itself changes, and it reappears the moment it
    // actually holds something again). Recognized two ways: the
    // classic literal reserved names, or -- Aug 25 2026, Larry's own
    // suggestion -- a name wrapped in parentheses, which is what the
    // auto-created landing-zone header is now titled by default (see
    // the NEW-header ensure-call above: "(<the Topic's own name>)"
    // instead of a bare "NEW"), so a traveler can tell at a glance
    // whose loose content it's holding without needing to rename it
    // by hand first.
    // Sept 15 2026: Parking Lot added alongside the legacy names
    // (Larry + Bill's rename, see the ensure-call above) so a board
    // that hasn't reopened this Topic since still hides its
    // auto-managed placeholder correctly under either name.
    var _sbReservedAutoNames=['NEW','New Additions','Parking Lot','MISC','Purpose'];
    subs=subs.filter(function(s){
      var _sbAutoManaged=_sbReservedAutoNames.indexOf(s.text_content)!==-1
        || /^\(.*\)$/.test(String(s.text_content||'').trim());
      if(!_sbAutoManaged) return true;
      return (_sboardChildCountById[s.id]||0)>0;
    });
    var directItems=(childrenOfHeader[headerRow.id]||[]).slice().sort(_sboardBySortOrder);
    // Backfill, Aug 3 2026 -- same reasoning as the top-level row:
    // makes each Subber's/idea's ORDER # a real, permanent number
    // instead of a fallback guess, the moment either list still has
    // one relying on it. Subbers/ideas render vertically top to
    // bottom, always in this real order -- there's no alphabetical
    // view for this level (yet), so no separate display copy needed.
    // Oct 2 2026, Larry: "ALL NEW ADDITIONS need to start at the bottom."
    // ROOT CAUSE of new headers landing above everything: these two calls
    // numbered each kind SEPARATELY (a brand-new header with no order got
    // 0 among the headers, a new card got 0 among the cards) BEFORE the
    // two lists were merged into one column below, so a new header always
    // came in as 0 and sorted to the top. The column is now ordered ONCE,
    // as one list, by _sboardBackfillColumnOrder further down: rows with
    // no order yet sort last (oldest-created first), so a new header or
    // card lands at the bottom and is then numbered there for good.
    // Unified column order, Aug 22 2026 (Larry: "sub-headers always
    // cluster to the top... I want to mix them into the story"). Used
    // to be two entirely separate 0-based sequences (Subbers, plain
    // cards), always rendered as two stacked blocks -- Subbers first,
    // cards after -- with no way to drag either kind across that line.
    // Starting from exactly today's on-screen order (Subbers, then
    // cards) so nothing jumps the moment this ships,
    // _sboardBackfillColumnOrder renumbers the whole column as ONE
    // real sequence the first time it finds the two old groups'
    // sort_order values colliding (both started at 0) -- from then on
    // dragging either kind can freely land it anywhere in this one
    // shared order (see _sboardReorderOrMoveColumnItem).
    //
    // Bug fix, Aug 22 2026 (Larry: "all sub-headers are remaining
    // above all subbers" -- a Subber dragged in among the cards kept
    // snapping right back above every card, every time). Root cause:
    // this used to check/backfill BEFORE sorting by real sort_order,
    // on the raw subs-then-cards concatenation. Subs and cards are
    // each sorted only WITHIN their own kind above, so that
    // concatenation is "all Subbers (in order), then all cards (in
    // order)" regardless of their real interleaved values -- it is
    // never actually increasing once a Subber and a card are
    // genuinely mixed (e.g. Subber=0, card=1, Subber=2 concatenates
    // as 0,2,1,3 -- not increasing), so the collision check below
    // treated every real interleave as "the old broken data,
    // renumber it" and rewrote it straight back into Subbers-first
    // order on the very next render, immediately undoing the very
    // drag that just interleaved them. Sorting first means the
    // check below only ever sees genuine collisions (true
    // duplicate/out-of-order values, the actual one-time-migration
    // case it was built for), never a false alarm from this
    // concatenation artifact.
    var combined=subs.concat(directItems);
    combined.sort(function(a,b){
      var d=_sboardBySortOrder(a,b);
      if(d===d && d!==0) return d; // both ordered, or one ordered + one not
      // Both have no order yet (NaN from Infinity-Infinity) or tie:
      // oldest-created first, so the newest addition is last.
      return String(a.created_at||'').localeCompare(String(b.created_at||''));
    });
    _sboardBackfillColumnOrder(combined);
    // Same-type subsets of the line above, kept in sync purely for
    // other code that only ever asks about one type (CLUSTER's own
    // bucket count, the top-level header promote/demote pair) -- see
    // the comment on _sboardColumnOrderByParent's declaration.
    _sboardIdeaOrderByParent[headerRow.id]=combined.filter(function(r){ return r.content_type!=='header'; }).map(function(r){ return r.id; });
    _sboardSubberOrderByParent[headerRow.id]=combined.filter(function(r){ return r.content_type==='header'; }).map(function(r){ return r.id; });
    _sboardColumnOrderByParent[headerRow.id]=combined.map(function(r){ return r.id; });
    // ORDER # display numbering, Aug 3 2026 -- Larry noticed "Long
    // Ideas has 2 number 1's": Subbers and plain idea/text cards
    // render in ONE shared vertical column. As of Aug 22 2026 this is
    // just the real combined order above -- no longer a display-only
    // concat that always put Subbers first regardless of how the
    // column was actually dragged into order.
    _sboardCardOrderByParent[headerRow.id]=combined.map(function(r){ return r.id; });
    var block=document.createElement('div');
    block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
    var hd=document.createElement('button');
    // MASTER-level = a real top-level Topic, i.e. a direct child of the
    // hidden PROJECTS_ROOT row (_sboardIdeaStoryboardsRootId) -- NOT
    // cluster_id null. Since the Sept 2 2026 "IDEA STORYBOARDS
    // placement architecture" migration (header-data.js,
    // ensureIdeaStoryboardsRoot), real projects nest one level under
    // that hidden root; cluster_id null is reserved for the root row
    // itself, which never renders as a column here. (The isProjectRoot
    // check in _sboardHeaderQuickMenu -- !headerRow.cluster_id -- looks
    // like it predates that migration and may itself be stale, but
    // that's a separate thing to fix, not touched here.) Sept 27 2026.
    // Oct 3 2026: also true for a not-yet-swept true-root row (cluster_id
    // null, not the root itself, not a reserved bucket) so a header that
    // was just added at MASTER level is framed right away, not only
    // after the next reload migrates it under the root.
    var _isApexTopic=_sboardIdeaStoryboardsRootId && (String(headerRow.cluster_id)===String(_sboardIdeaStoryboardsRootId)
      || (!headerRow.cluster_id && String(headerRow.id)!==String(_sboardIdeaStoryboardsRootId) && !isReserved));
    hd.className='sc-pill named'+((subs.length||directItems.length) && !isReserved ? ' has-children':'')+(_isApexTopic?' apex-topic':'')+(String(_sboardSelectedHeaderId)===String(headerRow.id)?' sb-kbd-selected':'');
    hd.setAttribute('data-header-id', String(headerRow.id));
    // Sept 20 2026, Larry (Master BB do-h card: "Allow headers to
    // occupy 2 lines with larger type size") -- reverses the Sept 8
    // 2026 "DREAM PHASE should display on one line" decision above.
    // That oneLine:true forced a long name (e.g. two/three words) to
    // keep shrinking all the way down to the 8px floor just to avoid
    // ever wrapping -- Larry now wants the opposite trade: a 2-line
    // wrap is fine, so the type can stay bigger. oneLine dropped
    // (text-fit.js's normal per-word-width + height-budget check
    // takes over, same as every other tile on this board), and the
    // floor raised 8->12 so even a name that does need to shrink
    // still lands at a readable size rather than the old backstop.
    var hdFitSize=_sboardFitFontSize(name, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2, false);
    hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+hdFitSize+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(headerRow.color?';background:'+headerRow.color:'');
    var _libRootLook=(typeof _sboardLibraryRootLook==='function')?_sboardLibraryRootLook(headerRow):null; // Oct 10 2026: LIBRARY column header matches its dark-gray cards
    if(_libRootLook){ hd.style.background=_libRootLook.bg; hd.style.color=_libRootLook.fg; }
    // Oct 10 2026 (Larry: carry the Library look over when the LIBRARY is viewed as a topic): its own column headers wear it too
    else { var _libChildLook=(typeof _sboardLibraryLook==='function')?_sboardLibraryLook(headerRow):null; if(_libChildLook){ hd.style.background=_libChildLook.bg; hd.style.color=_libChildLook.fg; } }
    _sboardPaintHeaderFace(hd, headerRow, name, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2);
    // Purpose used to have its own separate corner-flip editor; as of
    // July 17, 2026 it's treated exactly like any other header — same
    // dblclick-to-drill-in. Drilling in moved to drag-onto-TOPIC
    // (July 27, 2026); double-click is the color-options shortcut,
    // same as every other card, and is now the only way to open this
    // card -- the corner-flip triangle that used to sit alongside it
    // was removed Sept 6 2026 (Larry: "remove the gray corners flip
    // option from all cards. Just double click to open cards.").
    hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
    // Click to select this header for the Tab/Shift+Tab and
    // Ctrl+Down/Ctrl+Up keyboard shortcuts (see wireSboardUndoKeyboard).
    // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
    hd.addEventListener('click', function(e){
      if(_sboardSelectedHeaderId===headerRow.id) return;
      var prevId=_sboardSelectedHeaderId;
      _sboardSelectedHeaderId=headerRow.id;
      if(prevId){
        var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
        if(prevEl) prevEl.classList.remove('sb-kbd-selected');
      }
      hd.classList.add('sb-kbd-selected');
    });
    // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
    // "remove card numbers from the front of the Idea Cards, leave on
    // back") -- see the matching note on the plain-card tile above.
// Person Assigned badge, Aug 9 2026 -- top-level column headers (this
// "hd" pill) are their own third rendering path, separate from both
// _sboardMakeTile (plain cards) and _sboardMakeHeaderStackTile
// (Subbers) -- missed the first time through, which is why "Website"
// and "Marketing" (both top-level headers) weren't showing a badge
// even though they were genuinely assigned. hd already has
// position:relative set above, same as front/tile do for the other
// two paths.
// Reinstated on PLAN boards only, Aug 26 2026 (Session 251, Larry:
// "every card needs a number on a planning board -- those are the
// steps!") -- top-level column headers (Purpose, CONTENT, MISC...)
// are their own render path (see the matching Person Assigned note
// just above), so they need their own badge call too, reading
// _sboardTopLevelOrder -- the one place that already tracks this
// row's real order, same source the drag-reorder math itself uses.
if(_sboardIsPlanBoard || headerRow.show_order_front){
  hd.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardTopLevelOrder, headerRow.id, !_sboardIsPlanBoard));
}
hd.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
hd.insertAdjacentHTML('beforeend', _sboardPriorityBadgeHTML(headerRow));
// Bottom-left signal cluster: Lock, Signal Flags -- Aug 15 2026.
// Signal Flags were here since Aug 3 (Larry: "every card ... Larry
// wants it everywhere"), but Lock was never added to this
// particular render path (top-level column headers, this "hd"
// pill) even after Session 211 built the real Lock feature --
// Larry: "the header is not [showing locked]" on the Marketing
// header was this gap, not a data sync problem (checked the
// database directly: header and its linked Briefing card both
// show locked, in sync).
hd.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(headerRow, {lock:true, flags:true}));
    // Locked no longer blocks dragging, Aug 25 2026 -- see the note
    // on _sboardMakeTile above. depth===0 stays: only the top-level
    // pill drags to reorder among its siblings here.
    if(depth===0){
      hd.draggable=true;
      hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); _sboardDraggingHeaderId=headerRow.id; });
      hd.addEventListener('dragend', function(){ _sboardDraggingHeaderId=null; });
    }
    // Three drop zones, Aug 3 2026 -- left/right edges reorder this
    // Header among its top-level siblings (unchanged); the middle
    // band now nests the dragged Header/Subber under THIS Header
    // instead of doing nothing, matching the reorder-vs-nest zoning
    // idea tiles already use. A plain idea dropped anywhere on this
    // pill still just files under this Header, same as before --
    // ideas don't have a "top level" to reorder into here.
    // Bright green, Aug 3 2026 -- Larry: "Make it a bright green to
    // saw it is OK to release header here." Was the same blue
    // (#2d7dff) used for the reorder line itself, which didn't read
    // as a go/no-go signal -- green is the conventional "this is a
    // valid drop, safe to let go" color (matching, e.g., a traffic
    // light) the same way red reads as "stop/danger," so it was the
    // more effective choice here over red.
    // Named (not anonymous) so the enlarged promote zone below can call
    // the exact same logic directly -- see the note there.
    function hdDragOver(e){
      e.preventDefault();
      var rect=hd.getBoundingClientRect();
      var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
      if(frac<0.3){ hd.style.outline='none'; hd.style.boxShadow='inset 4px 0 0 0 #22c55e'; hd._dropSide='before'; }
      else if(frac>0.7){ hd.style.outline='none'; hd.style.boxShadow='inset -4px 0 0 0 #22c55e'; hd._dropSide='after'; }
      else { hd.style.boxShadow='none'; hd.style.outline='2px solid #22c55e'; hd._dropSide='nest'; }
    }
    function hdDragLeave(){ hd.style.boxShadow='none'; hd.style.outline='none'; hd._dropSide=null; }
    function hdDrop(e){
      e.preventDefault();
      var side=hd._dropSide||'before';
      hd.style.boxShadow='none'; hd.style.outline='none'; hd._dropSide=null;
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw==='sb-goup') return;
      if(raw.indexOf('header:')===0){
        var draggedHeaderId=raw.slice(7);
        if(String(draggedHeaderId)===String(headerRow.id)) return;
        if(side==='nest'){ _sboardMoveCard(draggedHeaderId, headerRow.id); }
        // Larry, Aug 3 2026: "unless this happens faster, we need the
        // clock to feedback that action is happening" -- a header
        // reorder rewrites sort_order on every visible header
        // sequentially (see _sboardReorderHeader), which is fast with
        // a handful of headers but genuinely takes a beat with a
        // full row of them, and the small #sc-status text alone was
        // easy to miss. Wrapping with the same pocket-watch spinner
        // every screen change already shows (_sboardSpinWhile) gives
        // it the same unmistakable "still working" feedback, with no
        // new UI to build.
        else { _sboardSpinWhile(_sboardReorderHeader(draggedHeaderId, headerRow.id, side==='after')); }
      } else {
        _sboardMoveCard(raw, headerRow.id);
      }
    }
    hd.addEventListener('dragover', hdDragOver);
    hd.addEventListener('dragleave', hdDragLeave);
    hd.addEventListener('drop', hdDrop);
    // Enlarged "promote to Header" target, Aug 26 2026 -- Larry:
    // dragging a Subber up towards the header row showed the correct
    // green "safe to release" cue, then it landed inside a
    // NEIGHBORING column's card list instead of promoting, because hd
    // above (the real "promote" target) is a slim strip compared to
    // the tall card list right below/beside it -- easy to miss by a
    // few pixels, especially crossing into an adjacent column on the
    // way up. This adds a CAPTURE-phase listener on the whole column
    // (fires before any card tile's own dragover/drop, so it can
    // intercept and swallow the event with stopPropagation before a
    // tile ever sees it) that treats a Header/Subber drag landing
    // anywhere in the top strip of THIS column -- not just precisely
    // on hd -- exactly like a drop on hd itself. _sboardDraggingHeaderId
    // (set on dragstart/cleared on dragend, since dragover can't read
    // the real payload) keeps this from ever affecting a plain idea
    // card drag, which should keep filing under whatever it's
    // actually dropped on, same as before.
    var PROMOTE_ZONE_H = HEADER_H + 56;
    function inPromoteZone(e){
      if(!_sboardDraggingHeaderId) return false;
      var rect=block.getBoundingClientRect();
      return (e.clientY - rect.top) <= PROMOTE_ZONE_H * (_sboardCam ? _sboardCam.getScale() : 1);
    }
    block.addEventListener('dragover', function(e){
      if(inPromoteZone(e)){ e.stopPropagation(); hdDragOver(e); }
      else if(hd._dropSide){ hdDragLeave(); }
    }, true);
    block.addEventListener('dragleave', function(e){
      if(hd._dropSide && !block.contains(e.relatedTarget)) hdDragLeave();
    }, true);
    block.addEventListener('drop', function(e){
      if(inPromoteZone(e)){ e.stopPropagation(); hdDrop(e); }
    }, true);
    block.appendChild(hd);
    if(directItems.length || subs.length || !blocksNewSubbers){
      var scroll=document.createElement('div');
      scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
      // Renders in the ONE combined order now, Aug 22 2026 (Larry:
      // "mix them into the story") -- Subbers and cards interleaved
      // exactly as dragged, instead of two separate passes (all
      // Subbers, then all cards). The person filter still only ever
      // hides plain cards, never Subbers (structural, not something a
      // traveler is "assigned"), same as before -- just checked
      // per-item instead of pre-filtering a separate list.
      var _sbAllowedDirectIds={};
      _sboardFilterByPerson(directItems).forEach(function(r){ _sbAllowedDirectIds[r.id]=true; });
      combined.forEach(function(r){
        if(r.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(r, SUBBER_W, SUBBER_H, straight)); }
        else if(_sbAllowedDirectIds[r.id]){ scroll.appendChild(_sboardMakeTile(r, SUBBER_W, straight, headerRow.id, SUBBER_H)); }
      });
      // Oct 10 2026 (MERGE BB INTO ONE TREE, step 2): read-only marker for any
      // Briefing Board tasks filed under this header. Hidden unless there are some.
      if(!isReserved && window.T2TTaskMarker){
        scroll.appendChild(window.T2TTaskMarker.makeTile(headerRow.id, HEADER_W));
      }
      // [+] under each header adds a new subber directly here — mirrors
      // the [+] after MISC for headers. MISC included now too (any
      // idea can land there, on-topic or not); Purpose joined them
      // Aug 4, 2026. NEW/Trash stay excluded.
      if(!blocksNewSubbers && !headerRow.locked){
        scroll.appendChild(_sboardMakeAddSubberTile(headerRow.id, SUBBER_W, SUBBER_H));
      }
      block.appendChild(scroll);
    }
    return block;
}

// Local "NEW" column for a nested (fractal) board — same visual
// treatment as renderGroup, but backed by directItems only (no sub-headers,
// since this bucket is specifically the uncategorized-items catch-all for
// whichever board is currently open). It's visually virtual — no children
// are ever filed under its own id — but it borrows color from the real
// per-level NEW row _sboardEnsureNewAdditionsHeader already ensures exists,
// so the color picker has something real to save to.
function _sboardRenderLocalNewAdditions(ctx, directItems, parentIdForDrop, newRow){
  var HEADER_W=ctx.HEADER_W, HEADER_H=ctx.HEADER_H, _tsMult=ctx._tsMult, childrenOfHeader=ctx.childrenOfHeader, subHeadersOf=ctx.subHeadersOf, SUBBER_W=ctx.SUBBER_W, SUBBER_H=ctx.SUBBER_H;
    // Oct 4 2026, Larry: "the Parking Lot flashed into view and then
    // disappeared... still nothing under Parking Lot and no frame around
    // it." ROOT CAUSE: this column only ever showed loose cards sitting
    // directly on the open Topic (directItems) -- cards filed under the
    // Parking Lot header's OWN id (e.g. the CONCEPTS-purge leftovers at
    // MASTER) were never read here. The first, cache-only paint (before
    // the ensure-call resolves newAdditionsId) drew the Parking Lot as an
    // ordinary column, so they flashed up; the real render then swapped
    // in this virtual column and they vanished. Now: the row's own
    // children are merged in, and an apex Parking Lot (a direct child of
    // the MASTER root) gets the same apex frame as its sibling columns.
    // Headers/Subbers filed under the Parking Lot (Larry: "A header could
    // be in a Parking Lot") live in subHeadersOf, not childrenOfHeader,
    // so they are merged in separately and drawn as header stack tiles.
    var _lnaHeaderKids=[];
    if(newRow){
      var _ownKids=(childrenOfHeader[newRow.id]||[]);
      if(_ownKids.length){
        var _seenIds={}; directItems.forEach(function(r){ _seenIds[r.id]=true; });
        directItems=directItems.concat(_ownKids.filter(function(r){ return !_seenIds[r.id]; })).sort(_sboardBySortOrder);
      }
      _lnaHeaderKids=(subHeadersOf[newRow.id]||[]).slice();
    }
    var block=document.createElement('div');
    block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
    var hd=document.createElement('div');
    var _lnaApex=!!(newRow && _sboardIdeaStoryboardsRootId && String(newRow.cluster_id)===String(_sboardIdeaStoryboardsRootId));
    hd.className='sc-pill named'+(_lnaApex?' apex-topic':'');
    // Plain "NEW" everywhere, matching the Briefing Board's NEW column
    // — Aug 7 2026, Larry. Used to read "[Topic] Ideas" (e.g. "Website
    // Ideas") whenever a Topic was open, on the reasoning that loose
    // ideas here aren't necessarily freshly typed. Larry wanted one
    // consistent label across every storyboard instead of that.
    //
    // Superseded Aug 25 2026, Larry: this hardcoded label is why
    // FG-fix-20260825a/b's landing-zone renaming never showed up on
    // screen even though it was correctly renaming the real header
    // row underneath (confirmed live -- the row's name in the
    // database was right, this label just never looked at it). Now
    // reads the real row's own name when there is one, falling back
    // to the classic "NEW" only when there genuinely isn't a row to
    // read from yet (e.g. mid-creation).
    var localLabel=(newRow && newRow.text_content) ? newRow.text_content : 'Parking Lot';
    // oneLine:true, Sept 8 2026 -- same one-line preference as the
    // ordinary column header pill just above, so a renamed NEW
    // bucket (e.g. "(Dream Phase)") reads the same way.
    hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+_sboardFitFontSize(localLabel,Math.round(20*_tsMult),Math.round(8*_tsMult),HEADER_W-28,HEADER_H-14,1.2,true)+'px;font-weight:400;margin-bottom:2px;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(newRow&&newRow.color?';background:'+newRow.color:'');
    if(newRow){ _sboardPaintHeaderFace(hd, newRow, localLabel, Math.round(20*_tsMult), Math.round(12*_tsMult), HEADER_W-28, HEADER_H-14, 1.2); }
    else{ hd.textContent=localLabel; }
    if(newRow){
      // Drilling in moved to drag-onto-TOPIC (July 27, 2026); double-click
      // is the color-options shortcut, same as every other card, and is
      // now the only way to open this card -- the corner-flip triangle
      // that used to sit alongside it was removed Sept 6 2026 (Larry:
      // "remove the gray corners flip option from all cards. Just
      // double click to open cards.").
      hd.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(newRow); });
    }
    // Locked no longer blocks dragging, Aug 25 2026 -- see the note
    // on _sboardMakeTile above.
    if(newRow){
      hd.draggable=true;
      hd.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+newRow.id); _sboardDraggingHeaderId=newRow.id; });
      hd.addEventListener('dragend', function(){ _sboardDraggingHeaderId=null; });
    }
    // Same bright green as the main header drop zones above, Aug 3
    // 2026 -- keeps NEW's own reorder feedback consistent with every
    // other header pill's.
    hd.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=hd.getBoundingClientRect();
      var frac=rect.width?(e.clientX-rect.left)/rect.width:0.5;
      hd.style.outline='none';
      hd.style.boxShadow = (frac<0.5) ? 'inset 4px 0 0 0 #22c55e' : 'inset -4px 0 0 0 #22c55e';
      hd._dropSide = (frac<0.5) ? 'before' : 'after';
    });
    hd.addEventListener('dragleave', function(){ hd.style.boxShadow='none'; hd._dropSide=null; });
    hd.addEventListener('drop', function(e){
      e.preventDefault();
      var side=hd._dropSide||'before';
      hd.style.boxShadow='none'; hd._dropSide=null;
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw||raw==='sb-goup') return;
      if(raw.indexOf('header:')===0){
        if(newRow) _sboardSpinWhile(_sboardReorderHeader(raw.slice(7), newRow.id, side==='after'));
      } else {
        _sboardMoveCard(raw, parentIdForDrop);
      }
    });
    block.appendChild(hd);
    // Aug 7 2026, Larry: NEW should be able to take a new idea directly,
    // same [+] every other header gets (mirrors renderGroup's own
    // !blocksNewSubbers tile below) -- not just something things land
    // in by sliding down or being demoted. Scroll section now always
    // renders (even with zero items yet) so the [+] has somewhere to
    // sit; only a locked NEW row (shouldn't normally happen) hides it.
    if(directItems.length || _lnaHeaderKids.length || (newRow && !newRow.locked)){
      var scroll=document.createElement('div');
      scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
      var _lnaAllowed={}; _sboardFilterByPerson(directItems).forEach(function(r){ _lnaAllowed[r.id]=true; });
      _lnaHeaderKids.concat(directItems).sort(_sboardBySortOrder).forEach(function(item){
        if(item.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(item, SUBBER_W, SUBBER_H, true)); }
        else if(_lnaAllowed[item.id]){ scroll.appendChild(_sboardMakeTile(item, SUBBER_W, true, (item.cluster_id||parentIdForDrop), SUBBER_H)); }
      });
      if(newRow && !newRow.locked){
        // Oct 9 2026 (Larry: "into alpha list and never to Parking Lot in A-Z view"): while the A-Z
        // letter view is on, this (+) must not file a loose card into the Parking Lot -- it opens the
        // same "New concept" prompt as the letter columns' (+), so the new entry sorts into its own
        // letter on redraw. Outside A-Z it is unchanged (full capture card, filed here).
        if(_sboardAzLetterView && _sboardAzApplies() && window.T2TAddControl && T2TAddControl.make){
          var _lnaAz=T2TAddControl.make({title:'Add a new concept (it sorts into its letter)', onClick:function(){ _sboardOpenAddHeaderPrompt({azLabel:'A–Z'}); }, sense:block});
          _lnaAz.style.margin='4px auto 8px';
          scroll.appendChild(_lnaAz);
        } else if(!(_sboardAzLetterView && _sboardAzApplies())){
          scroll.appendChild(_sboardMakeAddSubberTile(parentIdForDrop, SUBBER_W, SUBBER_H));
        }
      }
      block.appendChild(scroll);
    }
    return block;
}

// A-Z letter view column, Oct 4 2026 -- one column per letter group (a
// single letter, or a range like "X-Z" for thin letters), built from the
// flat entry list _sboardAzCollectEntries returns. The letter label is inert;
// tiles drag and drop INTO another card (see the handlers below), and each
// column ends in a (+) that adds a new concept.
function _sboardRenderLetterGroup(ctx, group){
  var HEADER_W=ctx.HEADER_W, HEADER_H=ctx.HEADER_H, _tsMult=ctx._tsMult, SUBBER_W=ctx.SUBBER_W, SUBBER_H=ctx.SUBBER_H;
    var block=document.createElement('div');
    block.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;width:'+HEADER_W+'px';
    var hd=document.createElement('div');
    hd.className='sc-pill named';
    hd.setAttribute('data-az-letter', group.label);
    hd.style.cssText='position:relative;transform:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100%;height:'+HEADER_H+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-size:'+Math.round(30*_tsMult)+'px;font-weight:400;margin-bottom:2px;cursor:default;text-align:center;white-space:normal;line-height:1.2;border-radius:0';
    hd.textContent=group.label;
    block.appendChild(hd);
    var scroll=document.createElement('div');
    scroll.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0 8px';
    var _azAllowed={};
    _sboardFilterByPerson(group.entries.filter(function(r){ return r.content_type!=='header'; })).forEach(function(r){ _azAllowed[r.id]=true; });
    group.entries.forEach(function(r){
      if(r.content_type==='header'){ scroll.appendChild(_sboardMakeHeaderStackTile(r, SUBBER_W, SUBBER_H, true)); }
      else if(_azAllowed[r.id]){ scroll.appendChild(_sboardMakeTile(r, SUBBER_W, true, r.cluster_id, SUBBER_H)); }
    });
    // Oct 4 2026 (Larry: "I cannot move or drop them into another card in alpha view"):
    // tiles stay draggable here. A-Z has no manual order to reorder (it is alphabetical),
    // so the top/bottom "reorder" edges the normal tiles use are meaningless; instead the
    // WHOLE card is one drop target that files the dragged card/header IN UNDER it
    // (a plain card is promoted to a header first, same as the middle zone on the normal
    // board). Capture phase, so these run before -- and replace -- each tile's own handlers.
    function _azTargetOf(e){
      var el=e.target && e.target.closest ? e.target.closest('[data-idea-id],[data-header-id]') : null;
      if(!el || !scroll.contains(el)) return null;
      return el;
    }
    function _azClear(el){ if(el){ el.style.outline='none'; el.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; } }
    scroll.addEventListener('dragover', function(e){
      var el=_azTargetOf(e); if(!el) return;
      e.preventDefault(); e.stopPropagation();
      el.style.outline='5px solid #22c55e'; el.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)';
    }, true);
    scroll.addEventListener('dragleave', function(e){
      var el=_azTargetOf(e); if(!el) return;
      e.stopPropagation(); _azClear(el);
    }, true);
    scroll.addEventListener('drop', function(e){
      var el=_azTargetOf(e); if(!el) return;
      e.preventDefault(); e.stopPropagation(); _azClear(el);
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw==='sb-goup') return;
      var draggedId=raw.indexOf('header:')===0 ? raw.slice(7) : raw;
      var targetId=el.getAttribute('data-header-id') || el.getAttribute('data-idea-id');
      var target=_sboardAllRowsById[targetId];
      if(!target || String(draggedId)===String(targetId)) return;
      // never file something inside its own descendant (would orphan both)
      var up=target, guard=0;
      while(up && guard++<50){
        if(String(up.id)===String(draggedId)) return;
        up=up.cluster_id ? _sboardAllRowsById[up.cluster_id] : null;
      }
      if(target.content_type==='header') _sboardMoveCard(draggedId, target.id);
      else _sboardStackIntoHeader(draggedId, target);
    }, true);
    // (+) at the bottom of each letter column -- a new concept can be added right where
    // you are looking (Larry, Oct 4 2026). It is created as a header under the open Topic
    // and sorts into its own letter on its own; the prompt says where it will land.
    var _azAdd=(window.T2TAddControl && T2TAddControl.make)
      ? T2TAddControl.make({title:'Add a new concept under '+group.label, onClick:function(){ _sboardOpenAddHeaderPrompt({azLabel:group.label}); }, sense:block})
      : _sboardMakeAddSubberTile(T2TShared.currentTopicId, SUBBER_W, SUBBER_H);
    if(window.T2TAddControl && T2TAddControl.make){ _azAdd.style.margin='4px auto 8px'; scroll.appendChild(_azAdd); }
    else { _azAdd.onclick=null; scroll.appendChild(_azAdd); }
    block.appendChild(scroll);
    return block;
}

