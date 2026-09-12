/* ============================================================
   idea-storyboard-card-detail.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   CARD DETAIL (BACK OF THE CARD). The full back-of-card detail view (openSbDetail) and everything reachable from it: the key picker/builder/library manager, image lightbox, drag-to-reorder within the detail view, and closing it.

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

  function openSbDetail(item){
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    // Card-details sweep, July 19, 2026: hoisted up from further down so
    // isTrashed/isMisc/the Purpose row below can also be screen-aware, not
    // just the Current Location breadcrumb.
    var isxScreenEl=document.getElementById('s-idea-session');
    var isOn9711=!!(isxScreenEl && isxScreenEl.classList.contains('active'));
    var isHeaderType=item.content_type==='header';
    // Reserved system headers (Trash/MISC/NEW) used to short-circuit here
    // into a stripped-down "Shape" card (color + notes only, no rename/
    // move/trash) while Purpose and ordinary headers got the full DETAILS
    // card below. Larry, Aug 16 2026: "New, Purpose and MISC headers are
    // headers and should have insides just like any other card... on
    // every board. SOP." -- removed the special case entirely. All
    // headers, reserved or not, now render the same full DETAILS card
    // and can be renamed, moved, and trashed like any other card.

    // Card-details sweep, July 19, 2026: _sboardTrashId/_sboardMiscId/
    // _sboardPurposeId are only ever populated by 9710's own renderSeaBoard
    // fetch -- stale or unset entirely if 9710 never rendered this session.
    // Same bug class as Current Location (fixed July 18); prefer 9711's own
    // context (setIsxContext) when it's the active screen.
    var _effTrashId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.trashId : _sboardTrashId;
    var _effMiscId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.miscId : _sboardMiscId;
    var _effPurposeId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.purposeId : _sboardPurposeId;
    // Aug 25 2026 -- same reasoning as the three above. Needed once the
    // landing-zone header could be named something other than literally
    // "NEW" (see the Move panel below): that panel already lists this
    // header once as its own pinned "NEW" row, so the real header row
    // has to be excluded from the general list by id now, not by a name
    // match that no longer holds.
    var _effNewAdditionsId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.newAdditionsId : _sboardNewAdditionsId;
    var isTrashed=String(item.cluster_id)===String(_effTrashId) && _effTrashId;
    var isMisc=String(item.cluster_id)===String(_effMiscId) && _effMiscId;
    var heartCount=item.heart_count||0;
    // CLUSTER view-as option — Logged July 7, 2026. Only appears when this card
    // is a bucket (has something underneath it, at any depth). Never shown for
    // a lone card — there's nothing to sort into groups yet.
    var isBucket=isHeaderType && (_sboardChildCountById[item.id]||0)>0;
    // Briefing Board tracking, Aug 11 2026 -- only a TOP-ROW header
    // (its own parent is a root board, same rule the DB trigger uses)
    // can be assigned; sub-headers never qualify, so the button doesn't
    // even show for them rather than appearing to do something it can't.
    var _bbAssignParent = item.cluster_id ? (_sboardHeadersById[item.cluster_id] || _sboardAllRowsById[item.cluster_id]) : null;
    var isTopRowHeader = isHeaderType && !!item.cluster_id && !!_bbAssignParent && !_bbAssignParent.cluster_id;
    // Fractal-view slider gating — added July 12, 2026. PARENT needs a real
    // grandparent to land on (climbing two levels from this card's home);
    // HEADER needs a real parent to promote-into-view under; SUBBER is
    // blocked while this card is a header actively holding content (same
    // rule the old demote button used, now just a grayed notch instead of
    // a separate button). TOPIC is always reachable — any card can become
    // the viewed board.
    var apexTag=(isHeaderType && !item.cluster_id)?'<div style="font-size:calc(9px * var(--fg-text-scale,1));letter-spacing:2px;text-transform:uppercase;color:#c9a87c;margin-bottom:2px">Top Level</div>':'';
    var swatches=_sboardColorPalette.map(function(c){
      var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
      return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
    }).join('');

    // PARENT / TOPIC eyebrows — computed exactly the way the board's own
    // chrome computes them, so the SHAPING card always agrees with the board.
    // 9711 SESSION branch: DETAILS is shared, but T2TShared.currentTopicId
    // and _sboardAllRowsById only ever get set by 9710's own renderSeaBoard
    // — stale (or entirely unset, showing the old "What do you want?"
    // placeholder) whenever DETAILS is opened from 9711 instead. Use the
    // live context 9711 hands over after every render (setIsxContext)
    // when 9711 is the screen actually on screen. July 18, 2026.
    var topicLabel, parentLabelCrumb, localNewAdditionsTarget, isInLocalNewAdditions, curHeaderLabel;
    if(isOn9711 && _isxDetailCtx){
      topicLabel=_isxDetailCtx.topicText||_sboardGetRootPrompt();
      parentLabelCrumb=_isxDetailCtx.parentText||'Wish Tank';
      localNewAdditionsTarget=_isxDetailCtx.topicId||'';
      isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
      var curHeaderRow9711=(item.cluster_id && !isInLocalNewAdditions)?(_isxDetailCtx.rowsById||{})[item.cluster_id]:null;
      // Aug 11 2026 (Larry): a HEADER sitting directly on a Topic (no
      // further sub-header wrapping it) was showing PARENT = "NEW" --
      // "NEW" is only meaningful for a loose idea card living in the
      // Topic's uncategorized bucket. A Header's parent is always the
      // Topic it lives on ("The Parent of any Header is the TOPIC" --
      // Larry's own Briefing Board card, Aug 9). Loose idea cards keep
      // the "NEW" fallback unchanged.
      curHeaderLabel=curHeaderRow9711?(curHeaderRow9711.text_content||'(untitled)'):(isHeaderType?topicLabel:'NEW');
    } else {
      var topicRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
      topicLabel=(T2TShared.currentTopicId && topicRow)?(topicRow.text_content||'(untitled)'):_sboardGetRootPrompt();
      var parentIdCrumb=topicRow?(topicRow.cluster_id||null):null;
      var parentRowCrumb=parentIdCrumb?_sboardAllRowsById[parentIdCrumb]:null;
      var parentFallbackCrumb=(topicRow&&topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'NEW');
      parentLabelCrumb=(T2TShared.currentTopicId && topicRow)?(parentRowCrumb?(parentRowCrumb.text_content||'(untitled)'):parentFallbackCrumb):'Wish Tank';

      // HEADER: "NEW" here means whichever board's own uncategorized bucket is
      // active: null at the root ISB, or the current topic id when working
      // inside a nested (fractal) board.
      localNewAdditionsTarget=T2TShared.currentTopicId||'';
      isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
      var curHeaderRow=(item.cluster_id && !isInLocalNewAdditions)?_sboardAllRowsById[item.cluster_id]:null;
      // Same Header-vs-loose-card fix as the 9711 branch above.
      curHeaderLabel=curHeaderRow?(curHeaderRow.text_content||'(untitled)'):(isHeaderType?topicLabel:'NEW');
    }

    // TOP ROW -- PARENT / VIEW / ORDER, Aug 7 2026 (Larry). Replaces the
    // old "Current Location" breadcrumb (Parent Project > Topic > Header)
    // plus its separate MOVE button, and pulls the ORDER # up from down
    // by Notes -- three compact eyebrow+field columns in one row instead,
    // matching the board's own PROJECT/PARENT/VIEW header chrome.
    //
    // PARENT shows just the immediate parent Header (curHeaderLabel) --
    // the one piece of the old breadcrumb that actually matters for
    // "where does this live" at a glance. Tapping it reveals the same
    // move-to-header panel the old MOVE button did (headerListHTML right
    // below, untouched -- id="sb-move-btn" just moved onto this field).
    //
    // VIEW is the Header/Subber toggle added earlier today.
    //
    // ORDER, not RANK -- Larry asked which reads better. Keeping ORDER:
    // this is a plain sequence position ("3 of 8"), not a priority score,
    // and it matches the ORDER # badges already used everywhere else on
    // the board (_sboardOrderBadgeHTML) and in this file's own comments.
    // RANK would suggest importance, which isn't what this number means.
    var viewOtherLabel = isHeaderType ? 'Subber' : 'Header';
    var viewSwitchDisabled = isHeaderType && isBucket;
    var viewWidgetHTML = '<div class="sb-view-wrap" id="sb-view-wrap">'
      + '<div class="sb-hdr-eyebrow2">View</div>'
      + '<button class="sb-view-frame" id="sb-view-btn" type="button">'+(isHeaderType?'Header':'Subber')+'</button>'
      + '<div class="sb-view-menu" id="sb-view-menu">'
      + '<div class="sb-view-menu-item'+(viewSwitchDisabled?' disabled':'')+'" id="sb-view-switch"'+(viewSwitchDisabled?' title="Move its cards out first"':'')+'>Switch to '+viewOtherLabel+'</div>'
      + '</div>'
      + '</div>';

    var orderValueText='—';
    // ORDER nudge, Aug 11 2026 (Larry: wants to change a card's order
    // from the back of the card too, not just move it to a different
    // Header). _sbOrderList/_sbOrderIdx below are the REAL sibling list
    // the drag-reorder math uses (_sboardTopLevelOrder for a top-level
    // Header, _sboardColumnOrderByParent for anything nested one level
    // in). Until Aug 22 2026 this deliberately avoided
    // _sboardCardOrderByParent, back when that was just a display-only
    // Subbers-then-cards concat that couldn't be written back to safely
    // (see its own comment, above in renderGroup) -- now that Subbers and
    // cards share one real combined order, _sboardCardOrderByParent IS
    // that real order, so the nudge arrows use the same
    // _sboardColumnOrderByParent it's built from and can swap a Subber
    // past a card (or vice versa), same as dragging can.
    var _sbOrderList=null, _sbOrderIdx=-1;
    var _sbOrderIsTopHeader=(isHeaderType && !item.cluster_id);
    (function(){
      function findIdx(list){
        for(var i=0;i<list.length;i++){ if(String(list[i])===String(item.id)) return i; }
        return -1;
      }
      var list=null, idx=-1;
      if(isHeaderType && _sboardTopLevelOrder && findIdx(_sboardTopLevelOrder)!==-1){
        list=_sboardTopLevelOrder; idx=findIdx(list);
      } else if(item.cluster_id && _sboardCardOrderByParent[item.cluster_id]){
        list=_sboardCardOrderByParent[item.cluster_id]; idx=findIdx(list);
      }
      if(list && idx!==-1){ orderValueText=(idx+1)+' of '+list.length; }
      var realList=_sbOrderIsTopHeader ? _sboardTopLevelOrder
        : (_sboardColumnOrderByParent[item.cluster_id||'']||null);
      if(realList){ _sbOrderList=realList; _sbOrderIdx=findIdx(realList); }
    })();
    var orderCanUp=(_sbOrderList && _sbOrderIdx>0);
    var orderCanDown=(_sbOrderList && _sbOrderIdx>-1 && _sbOrderIdx<_sbOrderList.length-1);

    var topRowHTML='<div class="sb-eyebrow-row">'
      + '<div class="sb-eyebrow-col">'
      + '<div class="sb-hdr-eyebrow2">Parent</div>'
      + '<button class="sb-view-frame" id="sb-move-btn" type="button">'+curHeaderLabel+'</button>'
      + '</div>'
      + '<div class="sb-eyebrow-col">'+viewWidgetHTML+'</div>'
      + '<div class="sb-eyebrow-col">'
      + '<div class="sb-hdr-eyebrow2">Order</div>'
      + '<div style="display:flex;flex-wrap:nowrap;align-items:center;gap:4px;justify-content:center;width:100%">'
      + '<button id="sb-order-up" type="button" aria-label="Move earlier"'+(orderCanUp?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanUp?'pointer':'default')+';opacity:'+(orderCanUp?'1':'0.3')+'">▲</button>'
      + '<div class="sb-view-frame" style="cursor:default;padding:5px 8px;white-space:nowrap" title="Order #">🔢 <span id="sb-order-value">'+orderValueText+'</span></div>'
      + '<button id="sb-order-down" type="button" aria-label="Move later"'+(orderCanDown?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanDown?'pointer':'default')+';opacity:'+(orderCanDown?'1':'0.3')+'">▼</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    // Person Assigned (Aug 9 2026) removed Session 234 (Aug 21, Larry:
    // "covered by the twin heads button") -- the 👥 people dropdown is now
    // the one place to put someone on a card. Its star toggle sets
    // card_roles.is_primary, which is what the corner badge and the Team
    // filter read now (see _sboardEnsureCardPrimary / _csSetPrimary).

    var headerListHTML='<div class="sb-inline-field" id="sb-move-panel" style="display:none">'
      + '<div class="sb-hdr-eyebrow2">Move to a different Header</div>'
      + '<div class="sb-hdr-vitem'+(isMisc?' current':'')+'" id="sb-misc-pinned" style="border:0.5px solid #D3D1C7;border-radius:8px;margin-bottom:6px;font-weight:600">'+(isMisc?'📦 Misc ✓ — tap to move out':'📦 Misc (project archive)')+'</div>'
      + '<div class="sb-hdr-vlist" id="sb-hdr-vlist">'
      + '<div class="sb-hdr-vitem'+(isInLocalNewAdditions?' current':'')+'" data-hid="'+localNewAdditionsTarget+'">NEW</div>'
      + (_effPurposeId?('<div class="sb-hdr-vitem'+(String(item.cluster_id||'')===String(_effPurposeId)?' current':'')+'" data-hid="'+_effPurposeId+'">Purpose</div>'):'')
      + _sboardVisibleHeaders.filter(function(h){ return String(h.id)!==String(item.id) && h.text_content!=='NEW' && !(_effNewAdditionsId && String(h.id)===String(_effNewAdditionsId)); })
          .map(function(h){ var cur=(item.cluster_id && String(h.id)===String(item.cluster_id))?' current':''; return '<div class="sb-hdr-vitem'+cur+'" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>'; }).join('')
      + '<div class="sb-hdr-vitem newh" id="sb-hdr-newh">+ Create new header…</div>'
      + '</div>'
      + '<div class="sb-inline-field" id="sb-newheader-row" style="display:none"><input id="sb-newheader-input" type="text" placeholder="New header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));box-sizing:border-box;margin-bottom:6px"><button class="sb-blue-btn" id="sb-newheader-go" style="width:100%">Create &amp; move here</button></div>'
      + '<div style="display:flex;gap:6px;margin-top:6px">'
      + '<button class="sc-ov-btn" id="sb-hdr-othertopic" style="flex:1;font-size:calc(10px * var(--fg-text-scale,1))">📍 Different Topic…</button>'
      + '<button class="sc-ov-btn" id="sb-hdr-otherproj" style="flex:1;font-size:calc(10px * var(--fg-text-scale,1))">🔀 Different Project…</button>'
      + '</div>'
      + '</div>';

    // Body: always the same fixed size and shape, whether it holds an image
    // or a single word. Images get an editable caption/title underneath —
    // this is what becomes the card's name (and Topic label, if drilled into).
    var bodyHTML;
    if(item.content_type==='link'){
      var linkData=T2TMedia.parseText(item.text_content);
      bodyHTML='<div class="sb-body-box">'+(item.image_url?'<img id="sb-img-preview" src="'+item.image_url+'">':'<div style="font-size:calc(40px * var(--fg-text-scale,1))">\ud83d\udd17</div>')+'</div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:4px;color:'+(linkData.title?'#000':'#a3907a')+'" title="Tap to edit the title">'+(linkData.title||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(linkData.title||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>'
        + '<a href="'+linkData.url+'" target="_blank" rel="noopener" style="display:block;font-size:calc(11px * var(--fg-text-scale,1));color:#5b9bd5;word-break:break-word;margin-bottom:8px">'+linkData.url+' \u2197</a>';
    } else if(item.content_type==='image' && item.image_url){
      bodyHTML='<div class="sb-body-box"><img id="sb-img-preview" src="'+item.image_url+'"></div>'
        + '<div id="sb-text-display" class="sb-body-text" style="font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:8px;color:'+(item.text_content?'#000':'#a3907a')+'" title="Tap to add a title">'+(item.text_content||'+ Add a title')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div>';
    } else {
      bodyHTML='<div class="sb-body-box"><div id="sb-text-display" class="sb-body-text sb-body-text-clamp" style="font-size:calc(18px * var(--fg-text-scale,1))" title="Tap to edit">'+(item.text_content||'(untitled)')+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div></div>';
    }

    // Additions, Aug 27 2026 (Larry: same checkbox-gated system as the
    // Briefing Card, minus Priority/Dates/Budget which don't apply here)
    // -- Notes, Links, Related Storyboards, and Signal Flags each open
    // by default when the card already has real content on that field
    // (adds_* backfilled by the Supabase migration for existing cards;
    // the OR fallback here just covers a card whose adds_* column hasn't
    // synced locally yet, same reasoning as BB's own migration note).
    var hasKeys=!!(item.key_slot_1||item.key_slot_2||item.key_slot_3);
    var addNotesOpen=(item.adds_notes!=null?!!item.adds_notes:!!(item.notes&&item.notes.trim()));
    var addLinksOpen=(item.adds_links!=null?!!item.adds_links:!!item.link_url);
    var addRelatedOpen=(item.adds_related!=null?!!item.adds_related:!!item.track_on_briefing_board);
    var addFlagsOpen=(item.adds_flags!=null?!!item.adds_flags:(heartCount>0||hasKeys));
    ov.innerHTML='<div class="sc-overlay-card sb-shape-card sb-details-card" style="text-align:center;background:#F5F1E8;position:relative">'
      + '<div id="sb-details-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:grab">'
      + '<span id="sb-details-eyebrow" style="font-size:calc(11px * var(--fg-text-scale,1));font-weight:500;letter-spacing:0.08em;color:#2C2C2A;cursor:default">IDEA CARD</span>'
      + '<button id="sb-close" aria-label="Close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#fff;border:1px solid #B4B2A9;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#2C2C2A">✕</button>'
      + '</div>'
      + '<div id="sb-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:#a3907a;height:10px;margin:-4px 0 4px;opacity:0;transition:opacity .3s">1011</div>'
      + apexTag
      + topRowHTML
      + headerListHTML
      + bodyHTML
      // Additions, Aug 27 2026 (Larry: "very similar to BRIEFING CARD but
      // no PRIORITY and no DATES and no BUDGET... IDEA - NOTES - LINKS -
      // RELATED STORYBOARDS - SIGNAL FLAGS, especially option for
      // multiple HEARTS, and of course the PARENT - VIEW - and ORDER
      // number") -- replaces the old always-visible Notes/Video-Link/
      // Signal-Flags row with the same checkbox-gated pattern the
      // Briefing Card just got: each is a checkbox riding its own field
      // label, real content sits in a .sb-addition-body directly under
      // it, hidden by default and shown for exactly as long as the box
      // is checked. Related Storyboards is the old 📋/🧭 Briefing Board
      // pair, relocated here from the bottom action row -- Idea Card's
      // own version of the BB doors row, gated the same way. Multiple
      // hearts stay exactly as they were (tap the pill to add one, hold
      // to remove one, 💕 shows automatically at 2+ -- see
      // _sboardHeartsHTML) -- just wrapped in Signal Flags' own checkbox
      // now instead of always showing. See IC_ADDITIONS/
      // wireIcAdditionToggles below for the shared plumbing.
      + '<div class="sb-addition" id="sb-add-notes-wrap"><label class="sb-addition-label" for="sb-add-notes"><input type="checkbox" id="sb-add-notes"'+(addNotesOpen?' checked':'')+'><span class="sb-hdr-eyebrow2">Notes</span></label><div class="sb-addition-body" id="sb-notes-body" style="display:'+(addNotesOpen?'':'none')+'"><textarea id="sb-notes-box" placeholder="Add a note…" style="width:100%;box-sizing:border-box;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1))">'+(item.notes||'')+'</textarea></div></div>'
      + '<div class="sb-addition" id="sb-add-links-wrap"><label class="sb-addition-label" for="sb-add-links"><input type="checkbox" id="sb-add-links"'+(addLinksOpen?' checked':'')+'><span class="sb-hdr-eyebrow2">Links</span></label><div class="sb-addition-body" id="sb-links-body" style="display:'+(addLinksOpen?'':'none')+'">'
      + '<div style="display:flex;gap:6px">'
      + '<input id="sb-link-url" type="text" placeholder="Paste a YouTube, Vimeo, or other link…" value="'+_sboardEsc(item.link_url||'')+'" style="flex:1;box-sizing:border-box;border:0.5px solid #B4B2A9;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));background:#fff">'
      + '<button id="sb-link-clear" type="button" title="Remove" style="width:28px;height:28px;flex-shrink:0;border-radius:6px;background:#fff;border:0.5px solid #B4B2A9;cursor:pointer;font-size:calc(12px * var(--fg-text-scale,1))">✕</button>'
      + '</div>'
      + '<div id="sb-link-preview" style="display:'+((item.link_url)?'block':'none')+';margin-top:6px;font-size:calc(11px * var(--fg-text-scale,1));text-align:center;font-style:italic;color:#2C2C2A">'+((item.link_thumb)?('<img src="'+_sboardEsc(item.link_thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+_sboardEsc(item.link_title||item.link_url||'')+'</div>'
      + '</div></div>'
      + (isTopRowHeader ? ('<div class="sb-addition" id="sb-add-related-wrap"><label class="sb-addition-label" for="sb-add-related"><input type="checkbox" id="sb-add-related"'+(addRelatedOpen?' checked':'')+'><span class="sb-hdr-eyebrow2">Related Storyboards</span></label><div class="sb-addition-body" id="sb-related-body" style="display:'+(addRelatedOpen?'':'none')+'"><div class="sb-blue-row-sm">'
        + '<button class="sb-blue-btn-sm" id="sb-bb-assign" title="'+(item.track_on_briefing_board?'Unassign from Briefing Board':'Assign to Briefing Board')+'">'+(item.track_on_briefing_board?'📌 Unassign from Briefing Board':'📋 Assign to Briefing Board')+'</button>'
        + (item.track_on_briefing_board ? '<button class="sb-blue-btn-sm" id="sb-bb-open" title="Open Briefing Card (new tab)">🧭 Open Briefing Card</button>' : '')
      + '</div></div></div>') : '')
      + '<div class="sb-addition" id="sb-add-flags-wrap"><label class="sb-addition-label" for="sb-add-flags"><input type="checkbox" id="sb-add-flags"'+(addFlagsOpen?' checked':'')+'><span class="sb-hdr-eyebrow2">Signal Flags</span></label><div class="sb-addition-body" id="sb-flags-body" style="display:'+(addFlagsOpen?'':'none')+'"><div class="sb-below-content-row" id="sb-flags-row" style="margin:0">'
      + '<button id="sb-heart" class="sb-heart-pill" aria-label="Tap to add a heart, hold to remove one" style="font-size:calc(12px * var(--fg-text-scale,1));padding:5px 9px;background:#fff;border:0.5px solid #B4B2A9;border-radius:8px;display:flex;align-items:center;gap:4px;cursor:pointer;color:#2C2C2A">'
      + '<span style="color:#D4537E;font-size:calc(13px * var(--fg-text-scale,1))">❤</span><span id="sb-heart-count">'+heartCount+'</span></button>'
      + '<span id="sb-keys-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"></span>'
      + '</div></div></div>'
      + '<div id="sb-swatch-row" class="sb-swatch-row2">'+swatches+'</div>'
      + '<div id="sb-note-status" style="font-size:calc(9px * var(--fg-text-scale,1));color:#a3907a;margin-bottom:4px;min-height:11px"></div>'
      + '<input type="file" id="sb-img-input" accept="image/*" style="display:none">'
      + '<div class="sb-blue-row">'
      + '<button class="sb-blue-btn" id="sb-lock" title="'+(item.locked?'Unlock — allow editing':'Lock — read-only text, still drag to move')+'">'+(item.locked?'🔒':'🔓')+'</button>'
      + '<button class="sb-blue-btn" id="sb-people-btn" title="Who\'s on this card">👥</button>'
      + '<div class="sc-cdrop-menu" id="sb-people-menu" hidden></div>'
      + '<button class="sb-blue-btn" id="sb-gear" title="Utility">⚙️</button>'
      + (isHeaderType ? '<button class="sb-blue-btn" id="sb-topic-btn" style="display:none">🎭</button>' : '')
      + '<button class="sb-blue-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>')+'</button>'
      + '</div>'
      // sb-trash-overlay ("Moose poop?" confirm) — renumbered 9718 → 1221
      // (Aug 19, 2026, Larry): the Moose Poop step of the Dream-phase
      // methodology family (1200/1210/1220/1230/1240 — see FG Design
      // Notes), not a generic utility despite living inline on the card.
      // "Don't ask me again" checkbox added Aug 25 2026 (Larry: "allow
      // checkbox to not show it again... let Delete or Trash be final") --
      // same style/pattern as 9711's own isx-trash-skip checkbox. Checking
      // it + Yes sets sbSkipTrashConfirm in localStorage; see sb-trash's
      // click handler below for where that's read.
      + '<div id="sb-trash-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.4);border-radius:12px;align-items:center;justify-content:center">'
      + '<div style="background:#fff;border-radius:10px;padding:14px 18px;text-align:center;border:0.5px solid #888780">'
      + '<p style="font-size:calc(14px * var(--fg-text-scale,1));font-weight:500;margin:0 0 10px;color:#2C2C2A">Moose poop?</p>'
      + '<label style="display:flex;align-items:center;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;justify-content:center;margin-bottom:10px;cursor:pointer"><input type="checkbox" id="sb-trash-skip"> Don’t ask me again</label>'
      + '<div style="display:flex;gap:8px;justify-content:center">'
      + '<button id="sb-trash-yes" style="font-size:calc(12px * var(--fg-text-scale,1));padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Yes</button>'
      + '<button id="sb-trash-no" style="font-size:calc(12px * var(--fg-text-scale,1));padding:6px 12px;background:#fff;border:0.5px solid #B4B2A9;border-radius:6px;cursor:pointer">Keep it</button>'
      + '</div></div></div>'
      + '</div>';
    ov.classList.add('active');
    // Drag, Aug 19 2026 (Larry): IDEA CARD never had this -- every Briefing
    // Card overlay drags via _bbMakeDraggable in briefing-board.js, this
    // just never got the same treatment. Ported the same pattern rather
    // than screen-zero.js's makeDraggable, which is built for desktop
    // icons, not modal overlay cards. Position resets on close/reopen
    // (innerHTML is rebuilt from scratch) -- no saved-position persistence
    // yet, matching what was asked for.
    _sbMakeDraggable(ov.querySelector('.sb-details-card'), document.getElementById('sb-details-head'));

    (function(){
      var clicks=0, timer=null;
      var eyebrow=document.getElementById('sb-details-eyebrow');
      if(eyebrow) eyebrow.addEventListener('click', function(){
        clicks++;
        if(timer) clearTimeout(timer);
        timer=setTimeout(function(){ clicks=0; }, 600);
        if(clicks>=3){
          clicks=0;
          var pn=document.getElementById('sb-pagenum');
          if(pn){ pn.style.opacity='1'; setTimeout(function(){ pn.style.opacity='0'; }, 2000); }
        }
      });
    })();

    var statusBox=document.getElementById('sb-note-status');

    // Fractal Casting entry point (Aug 9 2026) -- shown only for headers,
    // and only once we know whether this one's already a TOPIC (offer its
    // Cast/Guests) or this viewer is the current Owner of whatever's
    // directly above it (offer to delegate it into a new one). Async
    // because both need a roster/user lookup that can't finish before
    // ov.innerHTML above already landed -- same pattern as Person
    // Assigned just above.
    if(isHeaderType){
      (function(){
        var btn=document.getElementById('sb-topic-btn'); if(!btn) return;
        var effRowsById=(isOn9711 && _isxDetailCtx && _isxDetailCtx.rowsById) ? _isxDetailCtx.rowsById : _sboardAllRowsById;
        (async function(){
          if(item.topic_owner_user_id){
            btn.title='Cast / Guests for this TOPIC';
            btn.style.display='';
            btn.onclick=function(){ _sboardOpenPeopleMenuForTopic(item); };
            return;
          }
          var me=null; try{ me=(await _sb.auth.getUser()).data.user; }catch(e){}
          var myId=me?me.id:null; if(!myId) return;
          var scopeRow=item.topic_scope_id?effRowsById[item.topic_scope_id]:null;
          var isScopeOwner=!!scopeRow && (scopeRow.topic_owner_user_id?scopeRow.topic_owner_user_id===myId:scopeRow.user_id===myId);
          if(isScopeOwner){
            btn.title='Make this a TOPIC';
            btn.textContent='\uD83C\uDF31';
            btn.style.display='';
            btn.onclick=function(){ _sboardOpenDelegateTopicPicker(item, scopeRow); };
          }
        })();
      })();
    }

    // Double-click-to-zoom lightbox — Locked July 13, 2026. The DETAILS
    // back is already the larger view of an image; some images (a
    // whiteboard photo, a screenshot with small text) still need more
    // than that to actually read. Double-clicking the image here zooms
    // it again, near full-screen, dismissed by clicking anywhere or ✕.
    var imgPreview=document.getElementById('sb-img-preview');
    if(imgPreview){
      imgPreview.style.cursor='zoom-in';
      imgPreview.title='Double-click to zoom in';
      imgPreview.addEventListener('dblclick', function(){ _sbOpenImageLightbox(imgPreview.src); });
    }

    // MOVE — single entry point. Reveals the same header/topic/project
    // pickers that used to sit always-partly-visible on the card.
    T().wire('sb-move-btn', function(){
      var panel=document.getElementById('sb-move-panel');
      if(panel) panel.style.display=(panel.style.display==='none')?'block':'none';
    });

    // ORDER nudge -- up/down arrows, Aug 11 2026 (Larry). Swaps this card
    // with its immediate same-type sibling (one step, same shape as a
    // one-notch drag reorder) and rewrites both sort_order values. Stays
    // open afterward instead of closing (like the heart pill just below),
    // since nudging more than once in a row is the normal case -- only
    // the Order number + arrow states update in place here, plus a
    // background board refresh so the front stays in sync. Undo/redo
    // follows the same single-row convention as every other move in this
    // file (_sboardApplyRowSnapshot) -- restores THIS card's own position,
    // doesn't try to re-thread the sibling it swapped with.
    (function(){
      var upBtn=document.getElementById('sb-order-up');
      var downBtn=document.getElementById('sb-order-down');
      if(!upBtn && !downBtn) return;
      function setArrowState(btn, can){
        if(!btn) return;
        btn.disabled=!can;
        btn.style.opacity=can?'1':'0.3';
        btn.style.cursor=can?'pointer':'default';
      }
      async function nudgeOrder(dir){
        if(!_sbOrderList || item.locked) return;
        var swapIdx=_sbOrderIdx+dir;
        if(swapIdx<0 || swapIdx>=_sbOrderList.length) return;
        var ids=_sbOrderList.slice();
        var tmp=ids[_sbOrderIdx]; ids[_sbOrderIdx]=ids[swapIdx]; ids[swapIdx]=tmp;
        var before=_sboardSnapshotRow(item.id);
        try{
          // .select() + row-count check added Aug 22 2026 -- Larry: "moved
          // word wall sub-header to card order number 4. It did not
          // move" -- the ORDER number on this very card was updating
          // ("2 of 7") right after clicking, but the database never
          // actually changed. Root cause: without .select(), Supabase
          // reports success (no .error) even when a write matches zero
          // rows -- so this always trusted the write and updated the
          // on-screen number regardless of whether anything really
          // saved. Now checks the actual row count and shows a real
          // error via statusBox (below) instead of a number that lies.
          var updA=await _sb.from('ideas').update({sort_order:_sbOrderIdx}).eq('id',ids[_sbOrderIdx]).select('id');
          if(updA.error) throw updA.error;
          if(!updA.data || !updA.data.length) throw new Error('Save was blocked (no rows matched) -- order not changed.');
          var updB=await _sb.from('ideas').update({sort_order:swapIdx}).eq('id',ids[swapIdx]).select('id');
          if(updB.error) throw updB.error;
          if(!updB.data || !updB.data.length) throw new Error('Save was blocked (no rows matched) -- order not changed.');
          _sboardPatchRow(ids[_sbOrderIdx], {sort_order:_sbOrderIdx});
          _sboardPatchRow(ids[swapIdx], {sort_order:swapIdx});
          // Aug 22 2026: was two separate maps depending on isHeaderType --
          // now one shared column order, so a Subber can nudge past a
          // card (or vice versa) the same way dragging can.
          if(_sbOrderIsTopHeader) _sboardTopLevelOrder=ids;
          else _sboardColumnOrderByParent[item.cluster_id||'']=ids;
          _sbOrderList=ids; _sbOrderIdx=swapIdx;
          if(before){
            var after=_sboardSnapshotRow(item.id);
            _sboardPushAction({label:'Reorder', undo:function(){ return _sboardApplyRowSnapshot(item.id, before); }, redo:function(){ return _sboardApplyRowSnapshot(item.id, after); }});
          }
          var valEl=document.getElementById('sb-order-value');
          if(valEl) valEl.textContent=(swapIdx+1)+' of '+ids.length;
          setArrowState(upBtn, _sbOrderIdx>0);
          setArrowState(downBtn, _sbOrderIdx<ids.length-1);
          renderSeaBoard(true);
        }catch(err){
          if(statusBox) statusBox.textContent='Reordering needs the sort_order Supabase column: '+err.message;
        }
      }
      if(upBtn) upBtn.addEventListener('click', function(){ nudgeOrder(-1); });
      if(downBtn) downBtn.addEventListener('click', function(){ nudgeOrder(1); });
    })();

    // VIEW -- Header/Subber toggle, Aug 7 2026 (Larry) -- replaces the old
    // one-way MAKE HEADER button above with a two-way control matching the
    // board's own VIEW pattern: tap the frame to reveal the one other
    // state, tap it to switch. Promoting (Subber -> Header) is the same
    // promotion the drag-a-card-onto-another-card path already does
    // (_sboardStackIntoHeader sets content_type:'header'). Demoting
    // (Header -> Subber) reverses it -- picks back up as an image card if
    // it still has an image_url (i.e. was promoted from one), plain text
    // otherwise, since the original type isn't separately stored. Blocked
    // via viewSwitchDisabled (menu item greyed out, click no-ops) whenever
    // the header is still actively holding content -- move it out first,
    // so demoting can never silently orphan anything.
    T().wire('sb-view-btn', function(e){
      e.stopPropagation();
      var m=document.getElementById('sb-view-menu');
      if(m) m.classList.toggle('open');
    });
    T().wire('sb-view-switch', async function(){
      if(viewSwitchDisabled) return;
      var newType = isHeaderType ? (item.image_url ? 'image' : 'text') : 'header';
      try{
        var upd=await _sb.from('ideas').update({content_type:newType}).eq('id',item.id).select();
        if(upd.error) throw upd.error;
        item.content_type=newType;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // Header list: tap to reassign immediately
    Array.prototype.forEach.call(document.querySelectorAll('.sb-hdr-vitem[data-hid]'), function(row){
      row.addEventListener('click', async function(){
        var newCluster=row.getAttribute('data-hid')||null;
        if(String(newCluster||'')===String(item.cluster_id||'')) return;
        try{
          var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id).select();
          if(upd.error) throw upd.error;
          item.cluster_id=newCluster;
          closeSbDetail();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent=err.message; }
      });
    });
    async function openMoveToProjectPicker(){
      var ov2=document.getElementById('sb-detail-overlay');
      if(!ov2) return;
      var boards=(await T2TData.topLevelBoards()).slice().sort(function(a,b){
        return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
      });
      var rows=boards.filter(function(b){ return String(b.id)!==String(item.id); }).map(function(b){
        return '<div class="sb-hdr-vitem" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Move "'+(item.text_content||'(untitled)')+'"</div>'
        +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:10px">Moves this card — and everything nested underneath it — into the top level of the project you pick.</div>'
        +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
        +'<button class="sc-ov-btn" id="sb-moveproj-cancel" style="width:100%">Cancel</button>'
        +'</div>';
      ov2.classList.add('active');
      Array.prototype.forEach.call(ov2.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
        row.addEventListener('click', async function(){
          var pid=row.getAttribute('data-pid');
          try{
            var upd=await _sb.from('ideas').update({cluster_id:pid}).eq('id',item.id).select();
            if(upd.error) throw upd.error;
            item.cluster_id=pid;
            closeSbDetail();
            var landing=boards.find(function(b){ return String(b.id)===String(pid); });
            if(landing) _sboardDrillInto(landing);
          }catch(err){ console.error(err); }
        });
      });
      T().wire('sb-moveproj-cancel', function(){ openSbDetail(item); });
    }

    // Different Topic — added July 12, 2026. Broader reach than the Header
    // picker above (which only lists what's already visible in the current
    // local view): searches every header anywhere in the current project,
    // at any depth, so you can move a card straight to a Topic you aren't
    // currently standing near, without having to navigate there first.
    async function openMoveToTopicPicker(){
      var ov2=document.getElementById('sb-detail-overlay');
      if(!ov2) return;
      // Card-details sweep, July 19, 2026: this used to search
      // _sboardHeadersById/_sboardAllRowsById, both 9710-only caches that
      // sit empty all session if 9710's own board never rendered -- opening
      // this picker from 9711 always showed "No other topics in this
      // project yet.", even when there were plenty. Fetches its own live,
      // screen-agnostic header list instead (same pattern already used by
      // openMoveToProjectPicker just above), so this works regardless of
      // which screen opened DETAILS.
      var reserved=['Trash','MISC','Purpose','NEW','New Additions'];
      var topicIdForProject=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : T2TShared.currentTopicId;
      var candidates=[];
      if(topicIdForProject && window.T2TData && window.T2TData.ancestorChain && window.T2TData.fetchAllHeaders && window.T2TData.headerDescendants){
        try{
          var chain=await window.T2TData.ancestorChain(topicIdForProject);
          var projectId=chain.length?chain[0].id:null;
          if(projectId){
            var allHeadersLive=await window.T2TData.fetchAllHeaders();
            candidates=window.T2TData.headerDescendants(allHeadersLive, projectId)
              .filter(function(h){ return String(h.id)!==String(item.id) && reserved.indexOf(h.text_content)===-1; });
          }
        }catch(e){ console.warn('openMoveToTopicPicker project lookup failed:', e); }
      }
      candidates=candidates.slice().sort(function(a,b){ return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase()); });
      var rows=candidates.map(function(h){
        return '<div class="sb-hdr-vitem" data-hid="'+h.id+'">'+(h.text_content||'(untitled)')+'</div>';
      }).join('') || '<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#888;font-style:italic;padding:8px 0">No other topics in this project yet.</div>';
      ov2.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">Move under a different Topic</div>'
        +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:240px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
        +'<button class="sc-ov-btn" id="sb-movetopic-cancel" style="width:100%">Cancel</button>'
        +'</div>';
      ov2.classList.add('active');
      Array.prototype.forEach.call(ov2.querySelectorAll('.sb-hdr-vitem[data-hid]'), function(row){
        row.addEventListener('click', async function(){
          var hid=row.getAttribute('data-hid');
          // Card-details sweep, July 19, 2026: landing now comes from the
          // live candidates list above (was _sboardHeadersById, same stale
          // 9710-only cache this whole picker just got fixed away from).
          var landing=candidates.find(function(c){ return String(c.id)===String(hid); });
          try{
            var upd=await _sb.from('ideas').update({cluster_id:hid}).eq('id',item.id).select();
            if(upd.error) throw upd.error;
            item.cluster_id=hid;
            closeSbDetail();
            // Note (found during this sweep, not fixed): _sboardDrillInto
            // navigates 9710's own board (sets T2TShared.currentTopicId).
            // From 9711 this refreshes the board you're still standing on
            // rather than following the card to its new Topic -- lower
            // priority, same posture as the isMisc/isTrashed item already
            // deferred July 18.
            if(landing) _sboardDrillInto(landing);
          }catch(err){ console.error(err); }
        });
      });
      T().wire('sb-movetopic-cancel', function(){ openSbDetail(item); });
    }

    T().wire('sb-hdr-newh', function(){
      document.getElementById('sb-newheader-row').style.display='block';
      var nhInput=document.getElementById('sb-newheader-input');
      if(nhInput) setTimeout(function(){ nhInput.focus(); }, 50);
    });
    T().wire('sb-hdr-othertopic', openMoveToTopicPicker);
    T().wire('sb-hdr-otherproj', openMoveToProjectPicker);
    // Aug 7 2026 -- same ENTER + no-feedback-on-Save fix as the standalone
    // New Header prompt above (_sboardOpenAddHeaderPrompt), applied here
    // too since this is the other place a header gets created and Larry's
    // two DOING cards didn't say which screen he'd hit it on.
    var newHeaderGoBtn=document.getElementById('sb-newheader-go');
    async function _sbNewHeaderGo(){
      var name=(document.getElementById('sb-newheader-input')||{}).value||'';
      name=name.trim() || ('Cluster '+_sboardNextClusterNumber());
      if(newHeaderGoBtn){ newHeaderGoBtn.disabled=true; newHeaderGoBtn.textContent='Saving...'; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var parentId=T2TShared.filter||null;
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentId,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw new Error(ins.error.message);
        _sboardAddRow(ins.data);
        var upd=await _sb.from('ideas').update({cluster_id:ins.data.id}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=ins.data.id;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){
        if(statusBox) statusBox.textContent=err.message;
        if(newHeaderGoBtn){ newHeaderGoBtn.disabled=false; newHeaderGoBtn.textContent='Create & move here'; }
      }
    }
    T().wire('sb-newheader-go', _sbNewHeaderGo);
    (function(){
      var nhInput=document.getElementById('sb-newheader-input');
      if(nhInput) nhInput.addEventListener('keydown', function(e){
        if(e.key==='Enter'){ e.preventDefault(); _sbNewHeaderGo(); }
      });
    })();

    // Text editing (auto-promotes to header if punctuation says so)
    var textDisplay=document.getElementById('sb-text-display');
    if(textDisplay && !item.locked) textDisplay.addEventListener('click', function(){
      document.getElementById('sb-text-edit').style.display='block';
      textDisplay.style.display='none';
      var ta=document.getElementById('sb-text-input'); ta.focus();
    });
    T().wire('sb-text-cancel', function(){
      document.getElementById('sb-text-edit').style.display='none';
      if(textDisplay) textDisplay.style.display='block';
    });
    T().wire('sb-text-save', async function(){
      var newText=document.getElementById('sb-text-input').value.trim();
      if(!newText){ if(statusBox) statusBox.textContent='Text can\'t be empty.'; return; }
      var beforeFields={text_content:item.text_content, content_type:item.content_type};
      try{
        var patch;
        if(item.content_type==='link'){
          var curLink=T2TMedia.parseText(item.text_content);
          patch={text_content: JSON.stringify({url:curLink.url, title:newText})};
        } else {
          patch={text_content:newText};
          if(item.content_type==='text' && _sboardIsAutoHeaderText(newText)) patch.content_type='header';
        }
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.text_content=patch.text_content;
        if(patch.content_type) item.content_type=patch.content_type;
        _sboardPatchRow(item.id, patch);
        (function(){
          var itemId=item.id, before=beforeFields, after={text_content:patch.text_content, content_type:patch.content_type||beforeFields.content_type};
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
        })();
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // Photo — works from any card type; attaching a photo to a text idea
    // converts it to an image card, an image card just gets a new photo.
    T().wire('sb-img-swap', function(){ document.getElementById('sb-img-input').click(); });
    var imgInput=document.getElementById('sb-img-input');
    if(imgInput) imgInput.addEventListener('change', async function(e){
      var f=e.target.files && e.target.files[0]; if(!f) return;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var path=user.id+'/'+Date.now()+'-'+(f.name||'photo.png').replace(/[^a-zA-Z0-9._-]/g,'_');
        var up=await _sb.storage.from('sea-of-ideas').upload(path, f);
        if(up.error) throw up.error;
        var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
        var url=pub.data && pub.data.publicUrl;
        if(!url) throw new Error('No public URL returned.');
        var patch={image_url:url};
        if(!isHeaderType && item.content_type!=='image' && item.content_type!=='link') patch.content_type='image';
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.image_url=url;
        if(patch.content_type) item.content_type=patch.content_type;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    T().wire('sb-lock', async function(){
      try{
        var newLocked=!item.locked;
        if(!newLocked){
          // Unlocking never needs a prompt -- if it was parking a real
          // card, the linked card's own locked flag clears via the
          // ideas_sync_header_lock DB trigger the moment this write lands.
          var upd0=await _sb.from('ideas').update({locked:false}).eq('id',item.id);
          if(upd0.error) throw upd0.error;
          item.locked=false;
          closeSbDetail();
          renderSeaBoard(true);
          return;
        }
        // Locking, Session 211 (Aug 15) -- a header with no linked,
        // active Briefing card yet is a no-op for the card side: just
        // park the idea, nothing to cascade to. Only when a real card
        // exists does this become the two-outcome choice (Done vs
        // genuinely-parked-mid-work, i.e. a Hang-Up).
        var cardRes=await _sb.from('briefing_cards').select('id,col').eq('source_header_id',item.id).eq('archived',false).limit(1);
        var linkedCard=cardRes.data && cardRes.data[0];
        if(linkedCard){
          if(!window.confirm('Lock this header? Its Briefing card will pause too, until you unlock it.')) return;
          var isDone=window.confirm('Is the work actually finished? OK = Yes, move its card to Done. Cancel = No, it still needs to happen -- park the card until its time.');
          if(isDone){
            var cardUpd={col:'done'};
            var colRes=await _sb.from('briefing_cards').select('completed_date,hangup_since').eq('id',linkedCard.id).limit(1);
            var row0=colRes.data && colRes.data[0];
            if(row0 && !row0.completed_date) cardUpd.completed_date=new Date().toISOString().slice(0,10);
            if(linkedCard.col==='hangups') cardUpd.hangup_since=null;
            var upd1=await _sb.from('briefing_cards').update(cardUpd).eq('id',linkedCard.id);
            if(upd1.error) throw upd1.error;
          } else {
            var upd2=await _sb.from('briefing_cards').update({locked:true, lock_reason:'in_process'}).eq('id',linkedCard.id);
            if(upd2.error) throw upd2.error;
          }
        }
        var upd=await _sb.from('ideas').update({locked:true}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.locked=true;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent='Lock needs the locked Supabase column: '+err.message; }
    });

    // Session 255: opens the full Cast popup directly now, instead of the
    // small dropdown-then-☎️-for-more-detail two-step -- the popup now
    // does everything that dropdown did (add/remove/star) plus role
    // editing, notes, contact info and print in one place. The card's own
    // back stays open underneath; closing the popup just reveals it again
    // (see closeCallSheet), so there's no navigation to unwind here.
    T().wire('sb-people-btn', function(e){
      e.stopPropagation();
      openCallSheet(item, null, 'idea');
    });

    // Briefing Board tracking, Aug 11 2026 -- deliberately its own
    // button, separate from Lock (Larry: "lock is not the most
    // effective selector" -- Lock already means read-only/fixed-
    // position, unrelated to this). Toggling re-runs the DB trigger
    // (ideas_sync_header_task_card) that actually creates/archives the
    // task card; this just flips the flag and re-opens the same panel
    // so the Open Briefing Card button appears/disappears immediately.
    T().wire('sb-bb-assign', async function(){
      try{
        var newVal=!item.track_on_briefing_board;
        var upd=await _sb.from('ideas').update({track_on_briefing_board:newVal}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.track_on_briefing_board=newVal;
        openSbDetail(item);
      }catch(err){ if(statusBox) statusBox.textContent='Could not update Briefing Board tracking: '+err.message; }
    });
    // Opens in a new tab, Aug 11 2026 (Larry) -- same sessionStorage
    // handoff bp_target already uses for cross-file landing (cloned
    // into the new tab automatically since it's same-origin), plus a
    // second key the Briefing Board's own boot path
    // (_bbInitBoardsAndData, briefing-board.js) checks for and
    // consumes to land on the right card's board instead of whatever
    // it would resume by default.
    T().wire('sb-bb-open', function(){
      if(!item.track_on_briefing_board) return;
      try{
        sessionStorage.setItem('bp_target','4010');
        sessionStorage.setItem('fg_open_card_header_id', item.id);
      }catch(e){}
      window.open(location.pathname+location.search, '_blank');
    });

    (function(){
      var heartBtn=document.getElementById('sb-heart');
      var heartCountEl=document.getElementById('sb-heart-count');
      if(!heartBtn) return;
      var holdTimer=null, held=false;
      async function applyHeartDelta(delta){
        try{
          var newCount=Math.max(0,(item.heart_count||0)+delta);
          var upd=await _sb.from('ideas').update({heart_count:newCount}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.heart_count=newCount;
          if(heartCountEl) heartCountEl.textContent=newCount;
        }catch(err){ if(statusBox) statusBox.textContent='Heart needs the heart_count Supabase column.'; }
      }
      function startHold(){ held=false; holdTimer=setTimeout(function(){ held=true; applyHeartDelta(-1); }, 550); }
      function cancelHold(){ clearTimeout(holdTimer); }
      heartBtn.addEventListener('mousedown', startHold);
      heartBtn.addEventListener('touchstart', startHold);
      heartBtn.addEventListener('mouseup', cancelHold);
      heartBtn.addEventListener('mouseleave', cancelHold);
      heartBtn.addEventListener('touchend', cancelHold);
      heartBtn.addEventListener('click', function(){ if(!held) applyHeartDelta(1); held=false; });
    })();
    wireIcAdditionToggles(item, statusBox);
    _sboardRenderKeyRow(item);
    var notesBox=document.getElementById('sb-notes-box');
    if(notesBox) notesBox.addEventListener('blur', async function(e){
      var beforeNotes=item.notes||'';
      var newNotes=e.target.value;
      if(newNotes===beforeNotes) return;
      try{
        var upd=await _sb.from('ideas').update({notes:newNotes}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.notes=newNotes;
        _sboardPatchRow(item.id, {notes:newNotes});
        (function(){
          var itemId=item.id, before={notes:beforeNotes}, after={notes:newNotes};
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
        })();
      }catch(err){ if(statusBox) statusBox.textContent='Notes need the notes Supabase column.'; }
    });

    // Video/Link, Aug 11 2026 (Larry: "just like on Briefing Card") --
    // mirrors the Briefing Card DETAILS field, reusing the same shared
    // oEmbed resolver (T2TMedia.resolveOEmbed) this file's own 'link'
    // content-type cards already use. Deliberately independent of
    // content_type -- any card (text, image, header) can carry one link
    // attachment, same as a pure link-card can. Saves on blur, same
    // immediate-save convention as Notes just above (not the
    // save-on-close batching Briefing Board's DETAILS uses), then
    // re-renders the board so the tile badge picks it up with no
    // refresh -- the bug fixed earlier this session (idea-capture.js's
    // onSaved ordering) only covered creating a brand-new link card;
    // this is the separate "attach a link to an existing card" path.
    (function(){
      var linkInput=document.getElementById('sb-link-url');
      var linkPreview=document.getElementById('sb-link-preview');
      var _sbLinkPendingUrl=item.link_url||null, _sbLinkPendingThumb=item.link_thumb||null, _sbLinkPendingTitle=item.link_title||null, _sbLinkTimer=null;
      function renderLinkPreview(url, thumb, title){
        if(!linkPreview) return;
        if(!url){ linkPreview.style.display='none'; linkPreview.innerHTML=''; return; }
        linkPreview.style.display='block';
        linkPreview.innerHTML=(thumb?('<img src="'+_sboardEsc(thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+_sboardEsc(title||url);
      }
      async function saveLinkField(){
        var val=linkInput?linkInput.value.trim():'';
        var newUrl=val||null, newTitle=null, newThumb=null;
        if(newUrl){
          if(newUrl===_sbLinkPendingUrl){ newTitle=_sbLinkPendingTitle||newUrl; newThumb=_sbLinkPendingThumb||null; }
          else { newTitle=newUrl; newThumb=null; }
        }
        if(newUrl===(item.link_url||null) && newTitle===(item.link_title||null) && newThumb===(item.link_thumb||null)) return;
        var beforeFields={link_url:item.link_url||null, link_title:item.link_title||null, link_thumb:item.link_thumb||null};
        var patch={link_url:newUrl, link_title:newTitle, link_thumb:newThumb};
        try{
          var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.link_url=newUrl; item.link_title=newTitle; item.link_thumb=newThumb;
          _sboardPatchRow(item.id, patch);
          (function(){
            var itemId=item.id, before=beforeFields, after=patch;
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Video/Link needs the link_url Supabase column: '+err.message; }
      }
      if(linkInput) linkInput.addEventListener('input', function(){
        var val=linkInput.value.trim();
        if(_sbLinkTimer) clearTimeout(_sbLinkTimer);
        if(!val){ _sbLinkPendingUrl=null; _sbLinkPendingThumb=null; _sbLinkPendingTitle=null; renderLinkPreview(null); return; }
        if(!/^https?:\/\/\S+$/i.test(val)) return;
        _sbLinkTimer=setTimeout(async function(){
          var meta=(window.T2TMedia && window.T2TMedia.resolveOEmbed) ? await window.T2TMedia.resolveOEmbed(val) : null;
          if(linkInput.value.trim()!==val) return;
          _sbLinkPendingUrl=val; _sbLinkPendingThumb=(meta&&meta.thumbnail_url)||null; _sbLinkPendingTitle=(meta&&meta.title)||val;
          renderLinkPreview(_sbLinkPendingUrl,_sbLinkPendingThumb,_sbLinkPendingTitle);
        }, 500);
      });
      if(linkInput) linkInput.addEventListener('blur', saveLinkField);
      T().wire('sb-link-clear', function(){
        if(_sbLinkTimer){ clearTimeout(_sbLinkTimer); _sbLinkTimer=null; }
        _sbLinkPendingUrl=null; _sbLinkPendingThumb=null; _sbLinkPendingTitle=null;
        if(linkInput) linkInput.value='';
        renderLinkPreview(null);
        saveLinkField();
      });
    })();

    T().wire('sb-misc-pinned', async function(){
      try{
        // Card-details sweep, July 19, 2026: T2TShared.currentTopicId is
        // 9710-only (never set by 9711's own navigation) -- use 9711's
        // handed-over Topic id when it's the active screen, same as the
        // rest of this sweep.
        var targetId=await T2TData.ensureMiscHeader((isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : T2TShared.currentTopicId);
        var newCluster=isMisc?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    async function _sbDoTrash(){
      if(isHeaderType){ closeSbDetail(); _sboardConfirmTrashHeader(item); return; }
      var beforeCluster=item.cluster_id, beforeSort=item.sort_order;
      try{
        var targetId=await T2TData.ensureTrashHeader();
        var newCluster=isTrashed?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        _sboardPatchRow(item.id, {cluster_id:newCluster});
        (function(){
          var itemId=item.id, before={cluster_id:beforeCluster, sort_order:beforeSort}, after={cluster_id:newCluster, sort_order:beforeSort};
          _sboardPushAction({label:isTrashed?'Restore':'Delete', undo:function(){ return _sboardApplyRowSnapshot(itemId, before); }, redo:function(){ return _sboardApplyRowSnapshot(itemId, after); }});
        })();
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    }
    var trashOverlay=document.getElementById('sb-trash-overlay');
    var lastTrashClick=0;
    T().wire('sb-trash', function(){
      // sbSkipTrashConfirm, Aug 25 2026 (Larry: "Moose Poop popup: allow
      // checkbox to not show it again... let Delete or Trash be final") --
      // once opted out via the checkbox below, this button goes straight
      // to trashing, same as the existing double-click fast path and same
      // as dragging a card onto the Trash pile already does with no
      // confirm at all. Header-type items are unaffected either way --
      // _sbDoTrash always redirects them to _sboardConfirmTrashHeader's
      // own separate, deliberately non-skippable confirm (bigger blast
      // radius: trashes the header's contents too).
      if(localStorage.getItem('sbSkipTrashConfirm')==='1'){ _sbDoTrash(); return; }
      var now=Date.now();
      if(now-lastTrashClick<350){
        // Double click — skip the confirm, trash it now.
        if(trashOverlay) trashOverlay.style.display='none';
        _sbDoTrash();
      } else if(trashOverlay){
        trashOverlay.style.display='flex';
      }
      lastTrashClick=now;
    });
    T().wire('sb-trash-yes', function(){
      var skipCb=document.getElementById('sb-trash-skip');
      if(skipCb && skipCb.checked) localStorage.setItem('sbSkipTrashConfirm','1');
      if(trashOverlay) trashOverlay.style.display='none';
      _sbDoTrash();
    });
    T().wire('sb-trash-no', function(){ if(trashOverlay) trashOverlay.style.display='none'; });

    // Gear → color swatches
    T().wire('sb-gear', function(){
      var row=document.getElementById('sb-swatch-row');
      row.style.display=(row.style.display==='none'||!row.style.display)?'flex':'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sb-swatch'), function(btn){
      btn.addEventListener('click', async function(){
        var c=btn.getAttribute('data-c');
        var beforeColor=item.color;
        try{
          var upd=await _sb.from('ideas').update({color:c}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.color=c;
          _sboardPatchRow(item.id, {color:c});
          (function(){
            var itemId=item.id, before={color:beforeColor}, after={color:c};
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          try{ localStorage.setItem('t2t_seaOfIdeas_'+(isHeaderType?'header':'subber')+'Color', c); }catch(e){}
          // 9711 SESSION: patch the one on-screen tile directly instead of
          // a full board reload for a single-card color change — Larry,
          // July 18, 2026. isxPatchColor only exists (and only returns
          // true) when 9711 is active and the tile is actually on screen;
          // otherwise fall back to the old full-refresh delegation.
          var patchedInPlace = window.T2TStoryboard && T2TStoryboard.isxPatchColor && T2TStoryboard.isxPatchColor(item.id, c);
          if(!patchedInPlace) renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Color needs the color Supabase column: '+err.message; }
      });
    });

    T().wire('sb-close', closeSbDetail);
  }
  // Traveler color-options shortcut -- opens the normal DETAILS back but
  // auto-expands the swatch row so a double-click lands directly on color
  // choices instead of requiring an extra tap on the Appearance gear.
  function openSbDetailToColor(item){
    openSbDetail(item);
    var row=document.getElementById('sb-swatch-row');
    if(row) row.style.display='flex';
  }

  // Signal Flags UI, Aug 3 2026 -- three small pieces reached from a
  // card's DETAILS card: the Signal Flags row itself (up to 3 slots + one "+"),
  // the picker that opens when any slot is tapped (assign/remove/build
  // new), and the builder (shape+color+meaning) reached either from the
  // picker or straight from the gear menu's library manager. Mirrors the
  // Briefing Board's own Signal Flags flow (Choose a Signal Flag / Add a Signal Flag)
  // almost exactly -- proven UX, just pointed at the new shared
  // custom_keys table instead of a board-scoped one.
  var _sboardKeyDraft = {shape:_sboardKeyShapes[0], color:_sboardKeyColors[0]};

  function _sboardRenderKeyRow(item){
    var row=document.getElementById('sb-keys-row'); if(!row) return;
    var keys=_sboardItemKeys(item);
    var html='';
    for(var i=0;i<keys.length;i++){
      var k=_sboardKeyById(keys[i]);
      if(!k) continue;
      html += '<button class="sb-notes-pill sb-key-slot-btn" data-slot="'+i+'" title="'+_sboardEsc(k.meaning||'')+'">'
        +'<span style="display:inline-block;width:12px;height:12px;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span></button>';
    }
    if(keys.length<MAX_KEYS_PER_CARD){
      // Classic (+), Aug 7 2026 (Larry) -- swapped out the "🔑 +" pill for
      // the same dashed-circle plus every other [+] add control on the
      // board already uses (see .sc-add-subber-tile), just sized to sit
      // level with the heart pill and flag badges in this row.
      html += '<button class="sb-flag-add-btn sb-key-slot-btn" data-slot="'+keys.length+'" title="Add a flag">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.sb-key-slot-btn').forEach(function(btn){
      var slotIdx=Number(btn.getAttribute('data-slot'));
      var isFilled = slotIdx<keys.length;
      // Click-and-hold a filled Signal Flag to see every other card
      // carrying that same flag -- Aug 15 2026 (Larry: "consistent
      // process to see what is 'inside'," same 550ms hold as the
      // header-stack peek and the heart-pill tap/hold). A short
      // click/tap still opens the picker as before; this is purely
      // additive, and only applies to a slot that already has a flag
      // in it -- the empty "+" slot has nothing to peek at.
      if(isFilled){
        var keyId=keys[slotIdx];
        var kHoldTimer=null, kHeld=false, kStartX=0, kStartY=0;
        // Aug 15 2026 fix -- only cancel the hold once a touch has
        // actually drifted (10px), not on the first touchmove event.
        // Natural finger jitter fires touchmove almost immediately even
        // when someone means to hold still, and unlike the header-stack
        // peek (which has the CLUSTER pill as a fallback doorway), this
        // is the only way in -- a twitchy cancel would make it silently
        // unreachable on touch.
        function kStartHold(e){
          kHeld=false;
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          kStartX=pt.clientX; kStartY=pt.clientY;
          kHoldTimer=setTimeout(function(){ kHeld=true; var k=_sboardKeyById(keyId); if(k) openSbKeyPeek(k); }, 550);
        }
        function kCancelHold(){ clearTimeout(kHoldTimer); }
        function kMoveCheck(e){
          var pt=(e.touches && e.touches[0]) ? e.touches[0] : e;
          if(Math.abs(pt.clientX-kStartX)>10 || Math.abs(pt.clientY-kStartY)>10) kCancelHold();
        }
        btn.addEventListener('mousedown', kStartHold);
        btn.addEventListener('touchstart', kStartHold);
        btn.addEventListener('mouseup', kCancelHold);
        btn.addEventListener('mouseleave', kCancelHold);
        btn.addEventListener('touchend', kCancelHold);
        btn.addEventListener('touchmove', kMoveCheck);
        btn.addEventListener('click', function(){ if(!kHeld) _sboardOpenKeyPicker(item, slotIdx); kHeld=false; });
      } else {
        btn.addEventListener('click', function(){
          _sboardOpenKeyPicker(item, slotIdx);
        });
      }
    });
  }

  // Shows the whole shared library every time a slot is tapped, same as
  // the Briefing Board ("so you know what's already possible") --
  // greying out any key already sitting in one of this card's OTHER
  // slots, since the same key showing twice on one card would just be
  // confusing.
  function _sboardOpenKeyPicker(item, slotIndex){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var keys=_sboardItemKeys(item);
    var hasKey=!!keys[slotIndex];
    var listHTML;
    if(!_sboardKeyLib.length){
      listHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:6px">No signal flags yet — build your first one below.</div>';
    } else {
      listHTML=_sboardKeyLib.map(function(k){
        var usedElsewhere = keys.indexOf(k.id)>=0 && keys[slotIndex]!==k.id;
        return '<div class="sb-key-pick-row">'
          +'<button class="sb-key-pick-select" data-key-id="'+k.id+'"'+(usedElsewhere?' disabled':'')+'>'
          +'<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>'
          +'<span style="font-size:calc(12px * var(--fg-text-scale,1))">'+_sboardEsc(k.meaning||'')+'</span>'
          +'</button>'
          // Pencil-to-edit, Aug 4 2026 -- Larry: "I must have a way to
          // edit or change the meaning of any one of them" from wherever
          // he actually runs into a key, not just the library manager
          // buried in the gear menu. Same edit form as the library
          // manager (_sboardOpenKeyBuilder with existingKey), just
          // reachable from the Choose-a-Signal-Flag picker too.
          +'<button class="sb-key-pick-edit" data-key-id="'+k.id+'" title="Edit this signal flag">✏️</button>'
          +'</div>';
      }).join('');
    }
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Choose a Signal Flag</div>'
      +'<div style="max-height:220px;overflow-y:auto;margin-bottom:8px">'+listHTML+'</div>'
      +'<button class="sc-ov-btn save" id="sb-key-build-new" style="width:100%;margin-bottom:6px"'+(_sboardKeyLib.length>=MAX_KEY_LIBRARY?' disabled':'')+'>+ Build a new signal flag</button>'
      +(hasKey?'<button class="sc-ov-btn" id="sb-key-remove" style="width:100%;margin-bottom:6px;color:#b8562f;border-color:#e0b8a8">Remove this signal flag</button>':'')
      +'<button class="sc-ov-btn" id="sb-key-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.classList.add('active');
    ov.querySelectorAll('.sb-key-pick-select').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(btn.hasAttribute('disabled')) return;
        _sboardAssignKeyToSlot(item, slotIndex, btn.getAttribute('data-key-id'));
      });
    });
    ov.querySelectorAll('.sb-key-pick-edit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key=_sboardKeyById(btn.getAttribute('data-key-id'));
        if(key) _sboardOpenKeyBuilder(function(){ _sboardOpenKeyPicker(item, slotIndex); renderSeaBoard(true); }, key);
      });
    });
    T().wire('sb-key-build-new', function(){ _sboardOpenKeyBuilder(function(newKey){ _sboardAssignKeyToSlot(item, slotIndex, newKey.id); }); });
    T().wire('sb-key-remove', function(){ _sboardAssignKeyToSlot(item, slotIndex, null); });
    T().wire('sb-key-cancel', function(){ openSbDetail(item); });
  }

  async function _sboardAssignKeyToSlot(item, slotIndex, keyIdOrNull){
    var keys=_sboardItemKeys(item);
    // Aug 3 2026: capture whichever key is actually changing (the new
    // one on assign, the outgoing one on remove) before the splice, so
    // _sboardSyncKeyLinks below reconciles the right key either way.
    var affectedKeyId = (keyIdOrNull===null) ? keys[slotIndex] : keyIdOrNull;
    if(keyIdOrNull===null){
      keys.splice(slotIndex,1); // gap-free removal -- matches Briefing Board
    } else {
      keys[slotIndex]=keyIdOrNull;
    }
    try{ await _sboardWriteItemKeys(item.id, keys); }catch(err){}
    openSbDetail(item);
    // Bug, Aug 3 2026 -- Larry: "not seeing custom key on front of card
    // yet?" _sboardWriteItemKeys updates the cached row in memory, but
    // the actual tile sitting on the board was already built (and its
    // badge HTML already inserted) by an earlier renderSeaBoard() call --
    // mutating the JS object after the fact doesn't touch DOM that's
    // already on screen. Every other card edit (move, trash, recolor)
    // already calls renderSeaBoard() to pick up its own change; this one
    // was missing it.
    renderSeaBoard(true);
    // "Place same symbol on cards and they automatically link" -- Larry,
    // Aug 3 2026. _sboardWriteItemKeys above already awaited, so this
    // key's own database row is current by the time _sboardSyncKeyLinks
    // goes looking for who holds it.
    if(affectedKeyId) await _sboardSyncKeyLinks(affectedKeyId);
  }

  // Reached either from a card's Choose-a-Signal-Flag ("+ Build a new signal flag") or
  // straight from the gear menu's library manager -- onSaved(newKeyRow)
  // decides what happens next in either case (assign it to the slot that
  // opened the picker, or just refresh the library list).
  // existingKey -- optional (Aug 3 2026, pencil-to-edit from the Signal Flags
  // manager). Pre-fills shape/color/meaning from a real row and
  // switches the Save button into update mode instead of insert.
  function _sboardOpenKeyBuilder(onSaved, existingKey){
    _sboardKeyDraft = existingKey
      ? {shape:existingKey.shape, color:existingKey.color, editingId:existingKey.id}
      : {shape:_sboardKeyShapes[0], color:_sboardKeyColors[0]};
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:10px">'+(existingKey?'Edit Signal Flag':'Add a Signal Flag')+'</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px">Shape</div>'
      +'<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">'
        +_sboardKeyShapes.map(function(s){ return '<button class="sb-key-shape-btn" data-shape="'+s+'" title="'+s+'"><span style="display:block;width:16px;height:16px;'+_sboardKeyShapeCSS(s,'#3B2510')+'"></span></button>'; }).join('')
      +'</div>'
      +'<div style="font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px">Color</div>'
      +'<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">'
        +_sboardKeyColors.map(function(c){ return '<button class="sb-key-swatch-btn" data-color="'+c+'" style="background:'+c+'"></button>'; }).join('')
      +'</div>'
      +'<input type="text" id="sb-key-meaning" placeholder="What does this mean?" value="'+(existingKey?_sboardEsc(existingKey.meaning||''):'')+'" style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(12px * var(--fg-text-scale,1));margin-bottom:10px">'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-key-save" style="flex:1">'+(existingKey?'Save changes':'Save')+'</button><button class="sc-ov-btn" id="sb-key-cancel2" style="flex:1">Cancel</button></div>'
      +'</div>';
    ov.classList.add('active');
    function highlightShape(){ ov.querySelectorAll('.sb-key-shape-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-shape')===_sboardKeyDraft.shape); }); }
    function highlightColor(){ ov.querySelectorAll('.sb-key-swatch-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-color')===_sboardKeyDraft.color); }); }
    highlightShape(); highlightColor();
    ov.querySelectorAll('.sb-key-shape-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _sboardKeyDraft.shape=btn.getAttribute('data-shape'); highlightShape(); });
    });
    ov.querySelectorAll('.sb-key-swatch-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ _sboardKeyDraft.color=btn.getAttribute('data-color'); highlightColor(); });
    });
    T().wire('sb-key-cancel2', closeSbDetail);
    T().wire('sb-key-save', async function(){
      var meaningEl=document.getElementById('sb-key-meaning');
      var meaning=meaningEl?meaningEl.value.trim():'';
      if(!meaning){ if(meaningEl) meaningEl.focus(); return; }
      try{
        var savedKey = _sboardKeyDraft.editingId
          ? await _sboardUpdateKey(_sboardKeyDraft.editingId, _sboardKeyDraft.shape, _sboardKeyDraft.color, meaning)
          : await _sboardCreateKey(_sboardKeyDraft.shape, _sboardKeyDraft.color, meaning);
        if(onSaved) onSaved(savedKey); else closeSbDetail();
      }catch(err){
        if(meaningEl) meaningEl.style.borderColor='#b8562f';
      }
    });
  }

  // Gear menu entry, Aug 3 2026 -- Larry: "This option could be in every
  // gear?" View the whole shared library, delete signal flags nobody needs
  // anymore (un-tags any card that had it -- the database does that
  // automatically, see the key_slot_1/2/3 foreign keys), or add a new
  // one straight from here without needing a card open first.
  function _sboardOpenKeyLibraryManager(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var listHTML;
    if(!_sboardKeyLib.length){
      listHTML='<div style="font-size:calc(11px * var(--fg-text-scale,1));font-style:italic;color:#888;margin-bottom:10px">No signal flags yet. Build one below — then tap any card\'s Signal Flags row to use it.</div>';
    } else {
      listHTML=_sboardKeyLib.map(function(k){
        return '<div class="sb-key-lib-row">'
          +'<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>'
          +'<span style="font-size:calc(12px * var(--fg-text-scale,1));flex:1;text-align:left">'+_sboardEsc(k.meaning||'')+'</span>'
          +'<button class="sb-key-lib-edit" data-key-id="'+k.id+'" title="Edit this signal flag" style="border:none;background:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#5b9bd5">✏️</button>'
          +'<button class="sb-key-lib-del" data-key-id="'+k.id+'" title="Delete this signal flag" style="border:none;background:none;cursor:pointer;font-size:calc(13px * var(--fg-text-scale,1));color:#b8562f">🗑️</button>'
          +'</div>';
      }).join('');
    }
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:4px">Signal Flags</div>'
      +'<div style="font-size:calc(10px * var(--fg-text-scale,1));font-style:italic;color:#a3907a;margin-bottom:10px">One shared set, usable on any card, any board. Hover a flag on a card to see what it means.</div>'
      +'<div style="max-height:220px;overflow-y:auto;margin-bottom:8px">'+listHTML+'</div>'
      +'<button class="sc-ov-btn save" id="sb-keylib-add" style="width:100%;margin-bottom:6px"'+(_sboardKeyLib.length>=MAX_KEY_LIBRARY?' disabled':'')+'>+ Add a signal flag</button>'
      +'<button class="sc-ov-btn" id="sb-keylib-close" style="width:100%">Close</button>'
      +'</div>';
    ov.classList.add('active');
    ov.querySelectorAll('.sb-key-lib-edit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key=_sboardKeyById(btn.getAttribute('data-key-id'));
        if(key) _sboardOpenKeyBuilder(function(){ _sboardOpenKeyLibraryManager(); renderSeaBoard(true); }, key);
      });
    });
    ov.querySelectorAll('.sb-key-lib-del').forEach(function(btn){
      btn.addEventListener('click', async function(){
        try{ await _sboardDeleteKey(btn.getAttribute('data-key-id')); }catch(e){}
        _sboardOpenKeyLibraryManager();
        renderSeaBoard(true);
      });
    });
    T().wire('sb-keylib-add', function(){ _sboardOpenKeyBuilder(function(){ _sboardOpenKeyLibraryManager(); renderSeaBoard(true); }); });
    T().wire('sb-keylib-close', closeSbDetail);
  }

  // Drag helper for IDEA CARD (1011), Aug 19 2026 -- same behavior as
  // briefing-board.js's _bbMakeDraggable, but NOT the same wiring: the
  // Briefing Card overlay is built once and its DOM node reused on every
  // open, so binding fresh document-level mousemove/mouseup listeners
  // per-open is harmless there. IDEA CARD's ov.innerHTML is rebuilt from
  // scratch every single time a card is opened (different card, different
  // content) -- copying _bbMakeDraggable verbatim would stack up a new
  // set of document listeners on every open, forever, since document
  // itself never goes away. Fixed here by binding the document-level
  // move/up listeners exactly once (module-level, guarded), and keeping
  // only the per-open state (which card is moving) in a shared variable
  // that mousedown on the fresh headEl sets and mouseup clears. The
  // mousedown/touchstart listeners still get added to the current headEl
  // each open, but that element (and its listeners) is discarded along
  // with it when the overlay's innerHTML is cleared on close.
  var _sbDragListenersBound=false, _sbDragState=null;
  function _sbMakeDraggable(cardEl, headEl){
    if(!cardEl || !headEl) return;
    function onDown(e){
      if(e.target.closest('#sb-close')) return;
      var pt = e.touches ? e.touches[0] : e;
      var rect=cardEl.getBoundingClientRect();
      _sbDragState={cardEl:cardEl, headEl:headEl, startX:pt.clientX, startY:pt.clientY, startLeft:rect.left, startTop:rect.top};
      cardEl.style.position='fixed';
      cardEl.style.margin='0';
      cardEl.style.left=rect.left+'px';
      cardEl.style.top=rect.top+'px';
      headEl.style.cursor='grabbing';
      e.preventDefault();
    }
    headEl.style.cursor='grab';
    headEl.addEventListener('mousedown', onDown);
    headEl.addEventListener('touchstart', onDown, {passive:false});
    if(_sbDragListenersBound) return;
    _sbDragListenersBound=true;
    document.addEventListener('mousemove', function(e){
      if(!_sbDragState) return;
      var pt = e.touches ? e.touches[0] : e;
      var st=_sbDragState;
      st.cardEl.style.left=(st.startLeft+(pt.clientX-st.startX))+'px';
      st.cardEl.style.top=(st.startTop+(pt.clientY-st.startY))+'px';
      e.preventDefault();
    }, {passive:false});
    document.addEventListener('touchmove', function(e){
      if(!_sbDragState) return;
      var pt = e.touches ? e.touches[0] : e;
      var st=_sbDragState;
      st.cardEl.style.left=(st.startLeft+(pt.clientX-st.startX))+'px';
      st.cardEl.style.top=(st.startTop+(pt.clientY-st.startY))+'px';
      e.preventDefault();
    }, {passive:false});
    function onUp(){
      if(_sbDragState) _sbDragState.headEl.style.cursor='grab';
      _sbDragState=null;
    }
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function closeSbDetail(){
    var ov=document.getElementById('sb-detail-overlay');
    if(ov){ ov.classList.remove('active'); ov.innerHTML=''; ov.style.justifyContent=''; ov.style.paddingLeft=''; }
    // The 👥 dropdown (if this card had it open) lives outside `ov` by
    // this point -- see _sbPeopleMenuEl above -- so clearing ov's own
    // markup doesn't touch it. Without this it's left floating,
    // visible, on the board after the card itself is gone. Session 230.
    if(typeof _sbPeopleMenuEl!=='undefined' && _sbPeopleMenuEl && _sbPeopleMenuEl.parentNode){
      _sbPeopleMenuEl.parentNode.removeChild(_sbPeopleMenuEl);
      _sbPeopleMenuEl=null;
    }
    _sboardActiveId=null;
    // If CLUSTER is open behind this SHAPING card, refresh it — whatever was
    // just edited (moved, renamed, trashed) may have changed what belongs here.
    var clOv=document.getElementById('sb-cluster-overlay');
    if(clOv && clOv.classList.contains('active') && _clusterOpenHeaderId && _sboardAllRowsById[_clusterOpenHeaderId]){
      renderClusterView(_sboardAllRowsById[_clusterOpenHeaderId]);
    }
  }

  /* ── CLUSTER view — Logged July 7, 2026. Renumbered 9717 → 1211 (Aug 19,
     2026, Larry): joins the Dream-phase methodology family (Perceptions
     1200 / Cluster 1210 / Moose Poop 1220 / Resonance 1230 / Sort to
     Simplicity 1240 — see FG Design Notes) as the built screen for the
     Cluster step, not just a Storyboard-proximity number. ──
     A per-bucket sense-making screen, opened from the SHAPING card's VIEW AS
     row. Center = the bucket's own loose ideas, rendered wobbly/unordered —
     same visual language as NEW, reused at this fractal level.
     Shelf (bottom) = the bucket's existing sub-headers, alphabetical — a
     findability tool only, never part of the starburst metaphor. Populating
     a bucket never moves its shelf position; only naming/renaming does,
     since the shelf re-sorts alphabetically on every render. */

