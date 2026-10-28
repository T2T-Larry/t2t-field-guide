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

  // Alt+M (Sept 22 2026) -- open the MOVE pyramid for a card straight
  // from the board. See the Alt+M handler in idea-storyboard-shared.js.
  var _sbOpenMoveOnOpen=false, _sbMoveFromBoard=false;
  function _sboardOpenMoveFor(item){
    if(!item) return;
    _sbOpenMoveOnOpen=true; _sbMoveFromBoard=true;
    openSbDetail(item);
  }
  function openSbDetail(item){
    // Oct 6 2026: in the read-only Library view a card opens the plain reader, never the editable back.
    if(_sboardIsReadOnly()){ if(window.T2TLibraryView && item) T2TLibraryView.showCard(item); return; }
    _sboardActiveId=item.id;
    var ov=document.getElementById('sb-detail-overlay');
    var _sb=T().sb;
    // Card-details sweep, July 19, 2026: hoisted up from further down so
    // isTrashed/isthe Purpose row below can also be screen-aware, not
    // just the Current Location breadcrumb.
    var isxScreenEl=document.getElementById('s-idea-session');
    var isOn9711=!!(isxScreenEl && isxScreenEl.classList.contains('active'));
    var isHeaderType=item.content_type==='header';
    // Reserved system headers (Trash/NEW) used to short-circuit here
    // into a stripped-down "Shape" card (color + notes only, no rename/
    // move/trash) while Purpose and ordinary headers got the full DETAILS
    // card below. Larry, Aug 16 2026: "New, Purpose and Parking Lot headers are
    // headers and should have insides just like any other card... on
    // every board. SOP." -- removed the special case entirely. All
    // headers, reserved or not, now render the same full DETAILS card
    // and can be renamed, moved, and trashed like any other card.

    // Card-details sweep, July 19, 2026: _sboardTrashId/
    // _sboardPurposeId are only ever populated by 9710's own renderSeaBoard
    // fetch -- stale or unset entirely if 9710 never rendered this session.
    // Same bug class as Current Location (fixed July 18); prefer 9711's own
    // context (setIsxContext) when it's the active screen.
    var _effTrashId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.trashId : _sboardTrashId;
    var _effPurposeId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.purposeId : _sboardPurposeId;
    // Aug 25 2026 -- same reasoning as the three above. Needed once the
    // landing-zone header could be named something other than literally
    // "NEW" (see the Move panel below): that panel already lists this
    // header once as its own pinned "NEW" row, so the real header row
    // has to be excluded from the general list by id now, not by a name
    // match that no longer holds.
    var _effNewAdditionsId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.newAdditionsId : _sboardNewAdditionsId;
    var isTrashed=String(item.cluster_id)===String(_effTrashId) && _effTrashId;
    // Oct 10 2026 -- Larry: no more automatic Purpose headers; "Parking Lot
    // replaces Parking Lot need." The old Send to Parking Lot button went through
    // the retired ensure-call, which has been lookup-only since Sept 13, so on any board
    // without a Parking Lot it resolved to null and quietly moved the card OUT to the
    // loose root. The button now targets the Parking Lot (isParked = already in it).
    var isParked=!!_effNewAdditionsId && String(item.cluster_id)===String(_effNewAdditionsId);
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
    var swatches=_sboardColorPalette.map(function(c, i){
      var sel=(item.color===c)?'box-shadow:0 0 0 2px #1a3a5c;' : '';
      return '<button class="sb-swatch" data-i="'+i+'" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer;'+sel+'"></button>';
    }).join('');
    // Color wheel = "change these circles", Sept 22 2026 -- Larry: "What
    // if color wheel allows traveler to custom select colors ... to
    // change colors in circles?" Tap the rainbow circle to start; tap
    // any circle to pick a new color for it; tap the rainbow again when
    // done. Saved for this traveler (CardPalette, idea-storyboard-
    // tiles.js), shared with Briefing Cards. Picking a circle in normal
    // mode still just colors this card.
    swatches += '<button type="button" id="sb-palette-edit" class="sb-swatch-wheel" title="Change these colors" style="width:26px;height:26px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);border:1px solid #cfe4f2;cursor:pointer;padding:0"></button>'
      + '<input type="color" id="sb-palette-input" tabindex="-1" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0">'
      + '<div id="sb-palette-hint" style="display:none;width:100%;font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;text-align:center;margin-top:2px">Tap a circle to change its color. Tap the rainbow when done.</div>';

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
      curHeaderLabel=curHeaderRow9711?((curHeaderRow9711.subject||curHeaderRow9711.text_content)||'(untitled)'):(isHeaderType?topicLabel:'Parking Lot');
    } else {
      var topicRow=T2TShared.currentTopicId?_sboardAllRowsById[T2TShared.currentTopicId]:null;
      topicLabel=(T2TShared.currentTopicId && topicRow)?((topicRow.subject||topicRow.text_content)||'(untitled)'):_sboardGetRootPrompt();
      var parentIdCrumb=topicRow?(topicRow.cluster_id||null):null;
      var parentRowCrumb=parentIdCrumb?_sboardAllRowsById[parentIdCrumb]:null;
      var parentFallbackCrumb=(topicRow&&topicRow.content_type==='header')?_sboardGetRootPrompt():(_sboardNewAdditionsId&&_sboardAllRowsById[_sboardNewAdditionsId]?_sboardAllRowsById[_sboardNewAdditionsId].text_content:'Parking Lot');
      parentLabelCrumb=(T2TShared.currentTopicId && topicRow)?(parentRowCrumb?((parentRowCrumb.subject||parentRowCrumb.text_content)||'(untitled)'):parentFallbackCrumb):'Wish Tank';

      // HEADER: "NEW" here means whichever board's own uncategorized bucket is
      // active: null at the root ISB, or the current topic id when working
      // inside a nested (fractal) board.
      localNewAdditionsTarget=T2TShared.currentTopicId||'';
      isInLocalNewAdditions=String(item.cluster_id||'')===String(localNewAdditionsTarget||'');
      var curHeaderRow=(item.cluster_id && !isInLocalNewAdditions)?_sboardAllRowsById[item.cluster_id]:null;
      // Same Header-vs-loose-card fix as the 9711 branch above.
      curHeaderLabel=curHeaderRow?((curHeaderRow.subject||curHeaderRow.text_content)||'(untitled)'):(isHeaderType?topicLabel:'Parking Lot');
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
    // Oct 23 2026 (Larry): no longer grayed out when the header holds items -- turning it into a subber now asks what to do with them
    // (Trash / Parking Lot / Leave here / Cancel), see _sboardAskContentsFate in idea-storyboard-header.js.
    var viewSwitchDisabled = false;
    // Oct 3 2026 (Larry: "drop IS A completely. Click subber should change text to Header, no extra words. like an on off switch") -- the
    // button IS the switch: it shows what the card is now, one click flips it. No label, no menu. Hover explains the two choices.
    var viewWidgetHTML = '<div class="sb-view-wrap" id="sb-view-wrap">'
      + '<button class="sb-view-frame" id="sb-view-btn" type="button"'+(viewSwitchDisabled?' disabled':'')+' title="'+(viewSwitchDisabled?'Move its cards out first':'Header: something to think or talk about. Subber: a thought that sits under a header. Click to switch.')+'">'+(isHeaderType?'Header':'Subber')+'</button>'
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

    // MOVE column retired Sept 30 2026 (Larry: TOPIC and board type on the ID Band should always let a card move, so "MOVE field ... might not
    // be needed any more"). The TOPIC box now opens the same pyramid (FGCardBack.openTopicMenu, the one shared TOPIC list) and the
    // board-type box moves the card to another board. Alt+M still opens the pyramid.
    var topRowHTML='<div class="sb-eyebrow-row">'
      + '<div class="sb-eyebrow-col">'+viewWidgetHTML+'</div>'
      + '<div class="sb-eyebrow-col">'
      + '<div class="sb-hdr-eyebrow2">Order</div>'
      + '<div style="display:flex;flex-wrap:nowrap;align-items:center;gap:4px;justify-content:center;width:100%">'
      + '<button id="sb-order-up" type="button" aria-label="Move earlier"'+(orderCanUp?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanUp?'pointer':'default')+';opacity:'+(orderCanUp?'1':'0.3')+'">▲</button>'
      + '<div class="sb-view-frame" style="cursor:default;padding:5px 8px;white-space:nowrap" title="Order #">🔢 <span id="sb-order-value">'+(/^(\d+) of (\d+)$/.test(orderValueText)
        ? '<input id="sb-order-input" type="number" min="1" max="'+RegExp.$2+'" value="'+RegExp.$1+'" aria-label="Order number"'+((_sbOrderList && _sbOrderIdx>-1 && !item.locked)?'':' disabled')+'> of '+RegExp.$2
        : orderValueText)+'</span></div>'
      + '<button id="sb-order-down" type="button" aria-label="Move later"'+(orderCanDown?'':' disabled')+' style="flex-shrink:0;border:0.5px solid #B4B2A9;background:#fff;border-radius:6px;width:20px;height:20px;line-height:1;padding:0;font-size:inherit;color:inherit;cursor:'+(orderCanDown?'pointer':'default')+';opacity:'+(orderCanDown?'1':'0.3')+'">▼</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    // Person Assigned (Aug 9 2026) removed Session 234 (Aug 21, Larry:
    // "covered by the twin heads button") -- the 👥 people dropdown is now
    // the one place to put someone on a card. Its star toggle sets
    // card_roles.is_primary, which is what the corner badge and the Team
    // filter read now (see _sboardEnsureCardPrimary / _csSetPrimary).

    // The old move panel (headers on this board, Parking Lot, + new header,
    // Different Topic, Different Project, Anywhere) was retired Sept 22
    // 2026 when the PARENT field became MOVE -- everything it offered now
    // lives in the one project pyramid (FGCardBack.openTopicMenu).
    var headerListHTML='';

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
      // Oct 25 2026 (Larry: "Untitled is not the right message for the contents. Just say 'Notes:' in the upper left corner of the field"): an empty NOTES
      // back shows a light "Notes:" at the top left of the Contents field instead of "(untitled)".
      var _emptyNote=!item.text_content && !isHeaderType && (typeof _sboardIsNotesBack==='function') && _sboardIsNotesBack(item);
      bodyHTML='<div class="sb-body-box"><div id="sb-text-display" class="sb-body-text sb-body-text-clamp" style="font-size:calc(18px * var(--fg-text-scale,1))'+(_emptyNote?';text-align:left;align-self:flex-start;width:100%;color:#a3907a':'')+(item.text_content?'':';min-height:1.6em;width:100%')+'" title="Tap to edit">'+(item.text_content||(_emptyNote?'Notes:':''))+'</div>'
        + '<div id="sb-text-edit" style="display:none;width:100%"><textarea id="sb-text-input"'+(_emptyNote?' placeholder="Notes:"':'')+' style="width:100%;box-sizing:border-box;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:6px">'+(item.text_content||'')+'</textarea>'
        + '<div style="display:flex;gap:6px"><button class="sb-blue-btn" id="sb-text-save">Save</button><button class="sb-blue-btn" id="sb-text-cancel" style="background:#aab8c2">Cancel</button></div></div></div>';
      // PICTURE on a HEADER, Oct 9 2026 -- a header keeps its own picture (ideas.image_url) and both header faces draw it
      // (_sboardPaintHeaderFace, idea-storyboard-tiles.js). Icon buttons only, hover tooltips, no words (Larry's standing rule).
      // The upload itself is the existing sb-img-input handler below; Remove is its own small handler.
      if(isHeaderType){
        bodyHTML+='<div id="sb-hdr-pic-row" style="display:flex;align-items:center;gap:8px;margin-top:6px">'
          + (item.image_url?'<img id="sb-hdr-pic-preview" src="'+_sboardEsc(item.image_url)+'" alt="" style="width:44px;height:44px;object-fit:cover;object-position:center 25%;border-radius:4px;border:1px solid var(--bb-accent)">':'')
          + '<button type="button" class="bb-icon-btn" id="sb-img-swap" title="'+(item.image_url?'Replace picture':'Add a picture')+'">\ud83d\uddbc\ufe0f</button>'
          + (item.image_url?'<button type="button" class="bb-icon-btn" id="sb-hdr-pic-remove" title="Remove picture">\u2715</button>':'')
          + '</div>';
      }
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
    // Oct 7 2026 (Larry): on an IMAGE card the Links block is the card's SOURCE -- it opens by itself whenever a source is saved.
    var isImgSrc=(item.content_type==='image');
    var addLinksOpen=isImgSrc?false:(item.adds_links!=null?!!item.adds_links:!!item.link_url);
    var addRelatedOpen=(item.adds_related!=null?!!item.adds_related:!!item.track_on_briefing_board);
    var addFlagsOpen=(item.adds_flags!=null?!!item.adds_flags:(heartCount>0||hasKeys));
    // Organization, Sept 26 2026 -- see the sb-add-org markup below.
    var addOrgOpen=!!item.adds_org;
    // Oct 25 2026 (Larry: the NOTES card): a card on a board that holds notes gets the NOTES options -- Source, Attachments, Gem -- and no Notes pencil.
    // Everything NOTES-only lives in idea-storyboard-notes-back.js; the rest of this back is the same as every other card.
    var notesBack=(typeof _sboardIsNotesBack==='function') && _sboardIsNotesBack(item) && !isHeaderType;
    // ONE CARD BACK, Sept 23 2026 -- Larry: "merge the backs of the Idea
    // cards and the BB Task cards for a similar look with unique items
    // only visible on appropriate cards and a simple color to signify
    // where we are. Light blue for ideas and keep BB as is." The Idea
    // Card's back now wears the Briefing Card's own building blocks
    // (bb-overlay-card / bb-overlay-head / bb-field / bb-front-toggle /
    // bb-pri-btn / bb-addition / bb-action-row, from
    // briefing-board-styles.js) -- same shapes, same order, same fonts.
    // The only thing that changes is the color, via .fg-cardback-idea
    // (card-back-style.js), which re-points the BB color variables at
    // light blue for this card only. Idea-only items (Move / View /
    // Order, the picture/text/link contents, hearts) stay here only;
    // BB-only items (dates, budget, checklist, reviewed by) stay on BB.
    if(typeof injectBriefingBoardStyles==='function') injectBriefingBoardStyles();
    if(window.FGCardBack) FGCardBack.inject();
    ov.innerHTML='<div class="sc-overlay-card sb-details-card bb-overlay-card fg-cardback-idea fg-back-3x5" style="position:relative">'
      // 3x5 shape + ID Band on top of the back, Sept 29 2026 (Larry) -- see card-back-style.js.
      // Sept 30 2026 (Larry: "backs of the cards need some consistency... a look like the BB cards but for BLUE SKY cards") -- the old
      // title head is gone: the ID Band carries the title (upper left), the PRIMARY head and the X, exactly like the Briefing Card back.
      // Same ids (sb-close, sb-primary-trigger/-menu, sb-details-eyebrow) so every existing handler keeps working.
      + (window.FGCardBack
          ? FGCardBack.bandHTML({board:'idea', topicPicker:true, topicPickerId:'sb-d-topic-btn', kindPicker:true, kindPickerId:'sb-d-kind-btn', titleHTML:'<span id="sb-details-eyebrow">IDEA</span>', extraHTML:'<div class="bb-cdrop" id="sb-primary-cdrop" style="position:relative;flex-shrink:0"><button type="button" class="bb-icon-btn" id="sb-primary-trigger" title="PRIMARY: unassigned" aria-label="PRIMARY — who is accountable for this card">👤</button><div class="bb-cdrop-menu" id="sb-primary-menu" hidden></div></div><button id="sb-close" class="bb-close" aria-label="Close">✕</button>'})
          : '<div id="sb-details-head" class="bb-overlay-head"><span id="sb-details-eyebrow" class="bb-overlay-title" style="cursor:default">Vision Card</span><button id="sb-close" class="bb-close" aria-label="Close">✕</button></div>')
      + '<div class="bbw">'
      + '<div id="sb-pagenum" style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:2px;color:var(--bb-sub);height:10px;margin:-4px 0 4px;opacity:0;transition:opacity .3s">1011</div>'
      // Priority, Sept 22 2026 -- Larry, Master BB (DOING): "The BB cards
      // have priority options at the top of the cards. Make Idea cards
      // exactly the same. Below the HML choice, add yes / no toggle to
      // show on face of card." Same 3-click cycles (H->HH->off,
      // M->MH->off, L->ML->off) and colors -- _bbNextPriority/PRI_COLOR
      // come straight from briefing-board-ops.js so the two never disagree.
      // Yes/No = ideas.hide_priority_front (No hides the tag on the face).
      + '<div class="fg-back-toprow">'
      + '<div class="bb-field sb-pri-field"><label>Priority</label>'
      +   '<div id="sb-pri-btns" class="bb-priorities">'
      +     ['H','M','L'].map(function(p){ return '<button type="button" class="bb-pri-btn sb-pri-btn" data-pri-base="'+p+'">'+p+'</button>'; }).join('')
      +   '</div>'
      + '</div>'
      + '<div class="bb-field sb-subject-field"><label>Subject</label>'
      +   '<input type="text" id="sb-subject-input" autocomplete="off" style="width:100%;min-width:0;box-sizing:border-box" value="'+String(item.subject||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'
      + '</div>'
      // Plan step time, Oct 11 2026 (Larry, Plan card corners): PLAN boards only. Plain text like "1 day" / "1-2 days"; shows lower right on the face.
      + ((typeof _sboardIsPlanBoard!=='undefined' && _sboardIsPlanBoard)
          ? '<div class="bb-field sb-steptime-field"><label>Time</label><input type="text" id="sb-steptime-input" autocomplete="off" placeholder="1 day" maxlength="20" style="width:100%;min-width:0;box-sizing:border-box" value="'+String(item.step_time||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'
            // Oct 12 2026 (Larry): TIME gets the eye like every other option; default is back only. Becomes the eye beside the label via eyeBesideLabels.
            + '<label class="bb-front-check" id="sb-steptime-front-row"><input type="checkbox" id="sb-steptime-front"'+(item.show_time_front?' checked':'')+'><span>Show on front</span></label></div>'
            // Oct 12 2026: tap-to-check for steps that never become BB cards (decisions, approvals). BB-linked steps are set by the database.
            + '<div class="bb-field sb-stepdone-field"><label class="bb-front-check"><input type="checkbox" id="sb-stepdone-input"'+(item.step_done?' checked':'')+'><span>Step done</span></label></div>'
          : '')
      + '</div>'
      // The TOP LEVEL caption is gone from the back (Oct 24 2026, Larry: the Subject band is the same on every card); the ID Band's TOPIC already shows the root.
      // SUBJECT + contents on face, Sept 22 2026 (Larry: "Idea Board
      // should have the same Subject with optional content on face" --
      // same as the Briefing Card). Laid out exactly like the Briefing
      // Card as of Sept 23 2026: SUBJECT field, then the card's contents
      // (where BB has Task), with the "Show on face of card" Yes/No right
      // under the contents. No SUBJECT = contents always show, so a card
      // face is never blank.
      // PRIMARY head icon, Sept 26 2026 -- Larry: same single-head 👤
      // button as the Briefing Card's own back-of-card PRIMARY
      // (bb-d-primary-trigger, briefing-board-master.js), same line as
      // SUBJECT, right after it. Reuses the one shared CAST PICK list
      // (_castPickOpenMenu, cast-pick-list.js) and the card-type-
      // agnostic T2TStoryboard.assignPrimaryDirect (defaults to 'idea')
      // -- see _sbRenderCardPrimaryField below, wired the same way
      // _bbRenderCardPrimaryField wires the Briefing Card's.
      + '<div class="bb-field sb-contents-field"><label>Contents</label>'
      + bodyHTML
      // "Show on front" checkbox, Sept 23 2026 -- replaces the Yes/No
      // pill; same quiet lower-right checkbox as the Briefing Card.
      +   '<label class="bb-front-check" id="sb-contents-front-row"><input type="checkbox" id="sb-contents-front"><span>Show on front</span></label>'
      + '</div>'
      // MOVE - VIEW - ORDER now sit below Contents (Larry, Sept 30 2026).
      + topRowHTML
      + headerListHTML
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
      + (notesBack ? '' : '<div class="bb-field bb-addition" id="sb-add-notes-wrap"><label class="bb-addition-label" for="sb-add-notes"><input type="checkbox" id="sb-add-notes"'+(addNotesOpen?' checked':'')+'><span class="bb-addition-eyebrow">Notes</span></label><div class="bb-addition-body" id="sb-notes-body" style="display:'+(addNotesOpen?'':'none')+'"><textarea id="sb-notes-box" placeholder="Add a note…">'+(item.notes||'')+'</textarea></div></div>')
      + '<div class="bb-field bb-addition" id="sb-add-links-wrap"><label class="bb-addition-label" for="sb-add-links"><input type="checkbox" id="sb-add-links"'+(addLinksOpen?' checked':'')+'><span class="bb-addition-eyebrow">'+((isImgSrc||notesBack)?'Source':'Links')+'</span></label><div class="bb-addition-body" id="sb-links-body" style="display:'+(addLinksOpen?'':'none')+'">'
      + '<div class="bb-link-row">'
      + '<input id="sb-link-url" type="text" placeholder="'+(isImgSrc?'Where this image came from…':(notesBack?'Where this came from…':'Paste a YouTube, Vimeo, or other link…'))+'" value="'+_sboardEsc(item.link_url||'')+'">'
      + '<button id="sb-link-clear" class="bb-icon-btn" type="button" title="Remove">✕</button>'
      + '</div>'
      + '<div id="sb-link-preview" style="display:'+((item.link_url)?'block':'none')+';margin-top:6px;font-size:calc(11px * var(--fg-text-scale,1));text-align:center;font-style:italic;color:var(--bb-ink)">'+((item.link_thumb)?('<img src="'+_sboardEsc(item.link_thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+(isImgSrc&&item.link_url?('<a href="'+_sboardEsc(item.link_url)+'" target="_blank" rel="noopener" style="color:inherit">'+_sboardEsc(item.link_title||item.link_url)+' \u2197</a>'):_sboardEsc(item.link_title||item.link_url||''))+'</div>'
      + (notesBack ? _sboardNotesSourceDateHTML(item) : '')
      + '</div></div>'
      + (notesBack ? _sboardNotesAdditionsHTML(item) : '')
      + (isTopRowHeader ? ('<div class="bb-field bb-addition" id="sb-add-related-wrap"><label class="bb-addition-label" for="sb-add-related"><input type="checkbox" id="sb-add-related"'+(addRelatedOpen?' checked':'')+'><span class="bb-addition-eyebrow">Related Storyboards</span></label><div class="bb-addition-body" id="sb-related-body" style="display:'+(addRelatedOpen?'':'none')+'"><div class="sb-blue-row-sm">'
        + '<button class="sb-blue-btn-sm" id="sb-bb-assign" title="'+(item.track_on_briefing_board?'Unassign from Briefing Board':'Assign to Briefing Board')+'">'+(item.track_on_briefing_board?'📌 Unassign from Briefing Board':'📋 Assign to Briefing Board')+'</button>'
        + (item.track_on_briefing_board ? '<button class="sb-blue-btn-sm" id="sb-bb-open" title="Open Briefing Card (new tab)">🧭 Open Briefing Card</button>' : '')
      + '</div></div></div>') : '')
      + '<div class="bb-field bb-addition" id="sb-add-flags-wrap"><label class="bb-addition-label" for="sb-add-flags"><input type="checkbox" id="sb-add-flags"'+(addFlagsOpen?' checked':'')+'><span class="bb-addition-eyebrow">Signal Flags</span></label><div class="bb-addition-body" id="sb-flags-body" style="display:'+(addFlagsOpen?'':'none')+'"><div class="sb-below-content-row" id="sb-flags-row" style="margin:0">'
      + '<button id="sb-heart" class="sb-heart-pill" aria-label="Tap to add a heart, hold to remove one" style="font-size:calc(12px * var(--fg-text-scale,1));padding:5px 9px;background:#fff;border:1.5px solid var(--bb-accent);border-radius:4px;display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--bb-ink)">'
      + '<span style="color:#D4537E;font-size:calc(13px * var(--fg-text-scale,1))">❤</span><span id="sb-heart-count">'+heartCount+'</span></button>'
      + '<span id="sb-keys-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"></span>'
      + '</div></div></div>'
      // Organization, Sept 26 2026 -- Larry: an org name + eyebrow
      // descriptor ("A Shine Partner") + small logo, sitting right under
      // Signal Flags. Unchecked = fully inherited from the nearest
      // ancestor card that HAS checked this (Link, not Copy -- live, not
      // a snapshot; see _orgResolveForCard below); checking it makes
      // THIS card the new source for everything under it that hasn't
      // overridden. Replaces the old flat, non-inheriting project-level
      // Organization Name picker (sc-org-name-trigger/ideas.org_name) --
      // org_name/logo_url/logo_w/logo_h are the same columns that picker
      // used, just given real per-card, inheritable meaning now.
      + '<div class="bb-field bb-addition" id="sb-add-org-wrap"><label class="bb-addition-label" for="sb-add-org"><input type="checkbox" id="sb-add-org"'+(addOrgOpen?' checked':'')+'><span class="bb-addition-eyebrow">Organization</span></label><div class="bb-addition-body" id="sb-org-body" style="display:'+(addOrgOpen?'':'none')+'">'
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +     '<input type="text" id="sb-org-name-input" autocomplete="off" placeholder="Organization name" style="flex:1 1 auto;min-width:0" value="'+_sboardEsc(item.org_name||'')+'">'
      +     '<div id="sb-org-logo-slot" title="Tap to upload a logo" style="flex-shrink:0;width:36px;height:36px;border:1px solid #cfe4f2;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff">'
      +       (item.logo_url ? '<img id="sb-org-logo-img" src="'+_sboardEsc(item.logo_url)+'" style="max-width:100%;max-height:100%;object-fit:contain">' : '<span id="sb-org-logo-plus" style="font-size:calc(8px * var(--fg-text-scale,1));font-weight:600;letter-spacing:0.3px;color:#a3907a">LOGO</span>')
      +     '</div>'
      +     '<input type="file" id="sb-org-logo-input" accept="image/*" style="display:none">'
      +   '</div>'
      +   '<input type="text" id="sb-org-eyebrow-input" autocomplete="off" placeholder="Descriptor — e.g. A Shine Partner" style="width:100%;box-sizing:border-box" value="'+_sboardEsc(item.org_eyebrow||'')+'">'
      +   '<div id="sb-org-status" style="font-size:calc(9px * var(--fg-text-scale,1));color:var(--bb-sub);margin-top:4px;min-height:11px"></div>'
      + '</div></div>'
      + '<div id="sb-swatch-row" class="sb-swatch-row2">'+swatches+'</div>'
      // Links live under the gear (Utility), same as Budget/Links on the Briefing Card back -- moved in by the layout block below.
      + '<div class="fg-back-util-extra" id="sb-util-extra"></div>'
      + '<div id="sb-note-status" style="font-size:calc(9px * var(--fg-text-scale,1));color:var(--bb-sub);margin-bottom:4px;min-height:11px"></div>'
      + '<input type="file" id="sb-img-input" accept="image/*" style="display:none">'
      + '<div class="bb-doors-row bb-action-row fg-utilities-band" aria-label="UTILITIES BAND">'
      + '<button class="bb-icon-btn" id="sb-lock" title="'+(item.locked?'Unlock — allow editing':'Lock — read-only text, still drag to move')+'">'+(item.locked?'🔒':'🔓')+'</button>'
      + '<button class="bb-icon-btn" id="sb-people-btn" title="Who\'s on this card">👥</button>'
      + '<div class="sc-cdrop-menu" id="sb-people-menu" hidden></div>'
      + '<button class="bb-icon-btn" id="sb-gear" title="Utility">⚙️</button>'
      + (notesBack ? '' : '<button class="bb-icon-btn" id="sb-notes-pencil" type="button" title="Notes">✏️</button>')
      + '<button class="bb-icon-btn" id="sb-trash" title="Trash">'+(isTrashed?'↩️':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>')+'</button>'
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
      + '</div>'
      + '</div>';
    // 5x3 back layout, Sept 30 2026 -- same recipe as the Briefing Card back (briefing-board-screens.js): one full-width column,
    // only the checkbox region is two columns, Notes is the pencil in the bottom row, Links sit under the gear.
    (function(){
      var card=ov.querySelector('.sb-details-card'); if(!card || !window.FGCardBack) return;
      var bbw=card.querySelector('.bbw'); if(!bbw) return;
      // Oct 3 2026 -- same OPTIONS (+) popup + "selected items" field as the Briefing Card back (card-back-options.js).
      // Oct 8 2026 -- the slashed eye is on now for Signal Flags and Notes: the Blue Sky face honors back-only for both
      // (_sboardSignalRowHTML in idea-storyboard-people.js). Source/Links keep their own eye (image Source popup below).
      if(window.FGCardBackOptions){
        FGCardBackOptions.optionsRegion(bbw, {
          skip: notesBack ? [] : ['sb-add-links-wrap'],
          noPopup: ['notes'],
          universal: ['flags','org'],
          ownLabel: 'Vision card',
          // Oct 7 2026 (Larry): an image's Source sits on the back with an eye -- open eye = badge also shows on the front, slashed = back only.
          frontKeys: notesBack ? [] : ['flags','notes'],
          getHidden: function(){ return FGCardBackOptions.parseHidden(item.front_hidden); },
          setHidden: function(arr){
            var prev=item.front_hidden==null?null:item.front_hidden, v=arr.join(','), patch={front_hidden:v};
            item.front_hidden=v;
            var _sbx=T().sb;
            _sbx.from('ideas').update(patch).eq('id',item.id).then(function(r){
              if(r.error){ item.front_hidden=prev; var sb0=document.getElementById('sb-note-status'); if(sb0) sb0.textContent=r.error.message; return; }
              _sboardPatchRow(item.id, patch);
              renderSeaBoard(true);
            });
          },
          actionRow: bbw.querySelector('.bb-action-row')
        });
      } else {
        FGCardBack.checkRegion(bbw, ['sb-add-links-wrap']);
      }
      // Oct 3 2026 (Larry) -- ORDER moves up to the Priority/Subject line, right edge ("a finer selection over priority"); the Header/Subber
      // toggle moves to the bottom center of the card ("such a key choice"). Pure DOM moves: every id and its wiring stays exactly as it was.
      (function(){
        var cols=bbw.querySelectorAll('.sb-eyebrow-row > .sb-eyebrow-col');
        var viewWrap=bbw.querySelector('#sb-view-wrap');
        var toprow=bbw.querySelector('.fg-back-toprow');
        var arow=bbw.querySelector('.bb-action-row');
        if(cols.length>1 && toprow){
          // Oct 3 2026 (Larry: "ORDER ... same level and boldness as PRIORITY with fields same vertical size as HML") -- the order column is rebuilt
          // from Priority's own pieces: a real field label, buttons carrying Priority's own button class (so size/border can never drift), and the
          // same quiet eye underneath. Ids stay (sb-order-up/-value/-down), so the existing nudge wiring is untouched.
          var oc=cols[1];
          oc.className='bb-field sb-order-top';
          var eb=oc.querySelector('.sb-hdr-eyebrow2'); if(eb){ var lb=document.createElement('label'); lb.textContent='Order'; eb.replaceWith(lb); }
          var ctl=oc.querySelector('div'); if(ctl){ ctl.removeAttribute('style'); ctl.className='bb-priorities'; }
          ['sb-order-up','sb-order-down'].forEach(function(id){ var b=oc.querySelector('#'+id); if(b){ b.removeAttribute('style'); b.classList.add('bb-pri-btn'); b.style.opacity=b.disabled?'0.3':'1'; b.style.cursor=b.disabled?'default':'pointer'; } });
          var fr=oc.querySelector('.sb-view-frame'); if(fr){
            fr.removeAttribute('style'); fr.className='bb-pri-btn sb-order-num';
            Array.prototype.slice.call(fr.childNodes).forEach(function(n){ if(n.nodeType===3) n.remove(); });   // drop the 🔢 so it is the same height as H/M/L
          }
          var eyeRow=document.createElement('label'); eyeRow.className='bb-front-check'; eyeRow.id='sb-order-front-row';
          eyeRow.innerHTML='<input type="checkbox" id="sb-order-front"><span></span>';
          oc.appendChild(eyeRow);
          // Oct 24 2026 (Larry): ORDER is one of the OPTIONS -- a row in the OPTIONS checklist (built below, same builder as the task card back).
          // Checked, its control opens on the right with the other opened options. That leaves Priority - Subject - Workspace alone on the top line.
          var selReg=bbw.querySelector('.fg-back-selected'), optStore=bbw.querySelector('.fg-back-optstore');
          if(notesBack){ var _ordHide=document.createElement('div'); _ordHide.style.display='none'; _ordHide.appendChild(oc); bbw.appendChild(_ordHide); }   // Oct 25 2026: a NOTES back has no ORDER option; the control stays parked out of sight so its wiring still finds it
          else if(selReg && optStore){
            var ordBody=document.createElement('div'); ordBody.id='sb-order-body'; ordBody.className='bb-addition-body'; ordBody.style.display='none';
            ordBody.appendChild(oc); selReg.insertBefore(ordBody, selReg.firstChild);
            var ordCb=document.createElement('input'); ordCb.type='checkbox'; ordCb.id='sb-add-order'; optStore.appendChild(ordCb);
            ordCb.addEventListener('change', function(){ ordBody.style.display=ordCb.checked?'':'none'; });
          } else { toprow.appendChild(oc); }   // no options region on this back: keep ORDER on the top line as before
        }
        if(viewWrap && arow){
          var slot=document.createElement('div'); slot.className='fg-back-viewslot';
          slot.appendChild(viewWrap); arow.appendChild(slot);
        }
        var er=bbw.querySelector('.sb-eyebrow-row'); if(er && !er.querySelector('#sb-view-wrap, #sb-order-value')) er.remove();
        if(window.FGCardBackOptions) FGCardBackOptions.eyeBesideLabels(bbw);   // Priority / Contents / Order eyes sit right of their labels
      })();
      // PROCESS, Oct 24 2026 (Larry): an option on every kind of card -- a list of steps you shape yourself (card-process.js). An IDEA starts with its session steps in light text.
      // OPTIONS checklist, Oct 24 2026 (Larry: "OPTIONS are in a checklist. When an OPTION is checked, it displays on the right half of the screen
      // EXACTLY like on the TASK card which is the template"): the same builder as the task card back makes the checklist (eyebrow OPTIONS, three-click
      // rows, slashed eyes); each row drives the real checkbox that was already on this back, and its body opens in the right-hand column.
      var _optBlock=null;
      if(window.FGCardBackFixedRows && window.FGCardBackOptions && bbw.querySelector('.fg-back-selected')){
        var _idRows=notesBack ? _sboardNotesOptionRows() : [
          { id:'order', label:'Order',        boxes:['sb-add-order'], eyeKeys:[],        bodies:['sb-order-body'] },
          { id:'flags', label:'Signal Flags', boxes:['sb-add-flags'], eyeKeys:['flags'], bodies:['sb-flags-body'] }
        ];
        if(!notesBack && document.getElementById('sb-add-related')) _idRows.splice(2,0,{ id:'related', label:'Related Storyboards', boxes:['sb-add-related'], eyeKeys:[], bodies:['sb-related-body'] });
        FGCardBackFixedRows.build(bbw, {
          key:'idea', eyebrow:true, className:'fg-idea-options', rows:_idRows,
          getHidden: function(){ return FGCardBackOptions.parseHidden(item.front_hidden); },
          setHidden: function(arr){
            var prev=item.front_hidden==null?null:item.front_hidden, v=arr.join(','), patch={front_hidden:v};
            item.front_hidden=v;
            T().sb.from('ideas').update(patch).eq('id',item.id).then(function(r){
              if(r.error){ item.front_hidden=prev; var sb0=document.getElementById('sb-note-status'); if(sb0) sb0.textContent=r.error.message; return; }
              _sboardPatchRow(item.id, patch);
              renderSeaBoard(true);
            });
          }
        });
        _optBlock=bbw.querySelector('.fg-back-fixed.fg-idea-options');
      }
      if(window.FGCardProcess && !notesBack){
        var _pSel=bbw.querySelector('.fg-back-selected');
        if(_optBlock && _pSel){
          FGCardProcess.mount(_optBlock, {ideaId:item.id, kind:'idea', headParent:_optBlock, headBefore:null, bodyParent:_pSel, scope:bbw});
        } else {
          var _pAnchor=bbw.querySelector('#sb-swatch-row');
          FGCardProcess.mount(bbw, {ideaId:item.id, kind:'idea', before:(_pAnchor && _pAnchor.parentNode===bbw)?_pAnchor:bbw.querySelector('.bb-action-row')});
        }
      }
      var ux=card.querySelector('#sb-util-extra'), lw=card.querySelector('#sb-add-links-wrap');
      if(ux && lw && !isImgSrc && !notesBack) ux.appendChild(lw);
      // The Gear's rows, same as the task card back (Oct 24 2026, Larry: "ALL CARDS are exactly the same EXCEPT for the OPTIONS"): Organization and Links
      // are Gear rows, built by the same code; their opened bodies drop in underneath inside the Gear.
      if(ux && window.FGCardBackFixedRows && window.FGCardBackOptions){
        var _orgW=card.querySelector('#sb-add-org-wrap'), _orgBody=card.querySelector('#sb-org-body');
        if(_orgBody) ux.appendChild(_orgBody);
        var _gRows=[{ id:'org', label:'Organization', boxes:['sb-add-org'], eyeKeys:[], bodies:['sb-org-body'] }];
        if(lw && !isImgSrc && !notesBack) _gRows.push({ id:'links', label:'Links', boxes:['sb-add-links'], eyeKeys:[], bodies:['sb-links-body'] });
        FGCardBackFixedRows.build(bbw, {
          key:'idea-gear', rows:_gRows, className:'fg-gear-rows',
          mount:function(block){ ux.insertBefore(block, ux.firstChild); },
          getHidden: function(){ return FGCardBackOptions.parseHidden(item.front_hidden); },
          setHidden: function(arr){
            var prev=item.front_hidden==null?null:item.front_hidden, v=arr.join(','), patch={front_hidden:v};
            item.front_hidden=v;
            T().sb.from('ideas').update(patch).eq('id',item.id).then(function(r){
              if(r.error){ item.front_hidden=prev; var sb0=document.getElementById('sb-note-status'); if(sb0) sb0.textContent=r.error.message; return; }
              _sboardPatchRow(item.id, patch);
              renderSeaBoard(true);
            });
          }
        });
      }
      // Lock and People ride a small icon row at the top of the Gear, exactly like the task card back (Oct 24 2026, Larry). Same buttons, same ids,
      // so their wiring is untouched; the bottom row keeps only Gear, Notes and Trash.
      if(ux){
        var _gIcons=document.createElement('div'); _gIcons.className='fg-gear-iconrow';
        ['sb-lock','sb-people-btn','sb-people-menu'].forEach(function(id){ var el=card.querySelector('#'+id); if(el) _gIcons.appendChild(el); });
        ux.insertBefore(_gIcons, ux.firstChild);
      }
      // A-Z (Oct 17 2026): every card that can hold cards has an A-Z / CUSTOM toggle in its Gear. It orders the cards directly under it
      // (display only). A card with nothing under it can still be set; its tooltip says why nothing moves yet.
      if(ux && isHeaderType && window.T2TCardOrder){
        var _azEmpty=!Object.keys(_sboardAllRowsById||{}).some(function(k){ var r=_sboardAllRowsById[k]; return r && String(r.cluster_id)===String(item.id); });
        ux.appendChild(T2TCardOrder.makeToggle(item.id, {empty:_azEmpty, onChange:function(){ if(typeof renderSeaBoard==='function') renderSeaBoard(true); }}));
      }
      // Oct 7 2026 (Larry): an image's SOURCE is a popup, only on the back, opened by its own button. The eye inside it puts a source
      // symbol on the front (default: nothing on the front). The block is moved onto the card as a floating panel; ids and saving are untouched.
      if(isImgSrc && lw){
        var srcBody=lw.querySelector('#sb-links-body'), srcRow=card.querySelector('.bb-action-row');
        if(srcBody && srcRow){
          var srcLab=lw.querySelector('.bb-addition-eyebrow');
          var srcTitle=document.createElement('div'); srcTitle.className='fg-back-opt-title';
          var srcTx=document.createElement('span'); srcTx.textContent='Source'; srcTitle.appendChild(srcTx);
          var srcEye=document.createElement('button'); srcEye.type='button'; srcEye.className='fg-back-eye'; srcTitle.appendChild(srcEye);
          srcBody.insertBefore(srcTitle, srcBody.firstChild);
          function srcShown(){ return item.front_hidden!=null && FGCardBackOptions.parseHidden(item.front_hidden).indexOf('links')<0; }
          function paintSrcEye(){
            var on=srcShown();
            srcEye.innerHTML=on?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';
            srcEye.title=on?'Source symbol shows on the front \u2014 click to keep it on the back only':'Back only \u2014 click to show the source symbol on the front';
            srcEye.setAttribute('aria-label', srcEye.title);
          }
          paintSrcEye();
          srcEye.addEventListener('click', function(e){
            e.stopPropagation();
            var prev=item.front_hidden==null?null:item.front_hidden, v=srcShown()?'links':'', patch={front_hidden:v};
            item.front_hidden=v; paintSrcEye();
            T().sb.from('ideas').update(patch).eq('id',item.id).then(function(r){
              if(r.error){ item.front_hidden=prev; paintSrcEye(); return; }
              _sboardPatchRow(item.id, patch); renderSeaBoard(true);
            });
          });
          srcBody.style.cssText='display:none;position:absolute;left:12px;right:12px;bottom:58px;z-index:30;background:var(--bb-bg,#fff);border:1px solid var(--bb-ink,#888);border-radius:6px;padding:8px 10px;box-shadow:0 6px 18px rgba(0,0,0,.28)';
          card.appendChild(srcBody);
          var srcBtn=document.createElement('button'); srcBtn.type='button'; srcBtn.id='sb-source-btn'; srcBtn.className='bb-icon-btn';
          srcBtn.title='Source'; srcBtn.setAttribute('aria-label','Source'); srcBtn.textContent='\uD83D\uDD17';
          srcRow.insertBefore(srcBtn, srcRow.firstChild);
          function closeSrc(){ srcBody.style.display='none'; srcBtn.classList.remove('fg-on'); }
          srcBtn.addEventListener('click', function(e){
            e.stopPropagation();
            var open=srcBody.style.display!=='none'; if(open) closeSrc(); else { srcBody.style.display='block'; srcBtn.classList.add('fg-on'); }
          });
          srcBody.addEventListener('click', function(e){ e.stopPropagation(); });
          card.addEventListener('click', function(e){ if(srcBody.style.display!=='none' && e.target!==srcBtn) closeSrc(); });
        }
      }
      // Oct 25 2026 (Larry: "All pencils!!!!"): the pencil opens a NOTES card for this card (_sboardOpenNoteFor, idea-storyboard-notes-back.js).
      var pen=card.querySelector('#sb-notes-pencil');
      if(pen){
        pen.title='Write a note on this card';
        pen.addEventListener('click', function(e){ e.stopPropagation(); _sboardOpenNoteFor(item.id); });
      }
    })();
    if(window.FGCardBack) FGCardBack.paintBand(ov.querySelector('.sb-details-card'), 'idea');
    if(notesBack) _sboardNotesBackWire(ov.querySelector('.sb-details-card'), item);   // Source date, Attachments, Gem (idea-storyboard-notes-back.js)
    // HEADER / WORKSPACE row, Oct 24 2026 (Larry: "HEADER / WORKSPACE row goes on all types of cards"). The same row the task card back has
    // (card-go-there.js); this card just tells it how to name, save and leave its card. A header card is its own workspace.
    (function(){
      if(!window.FGBBGoThere || !FGBBGoThere.mount) return;
      var field=ov.querySelector('.sb-subject-field'), input=ov.querySelector('#sb-subject-input');
      if(!field || !input) return;
      var wsCard={};
      Object.defineProperties(wsCard, {
        id:{ get:function(){ return item.id; } },
        subject:{ get:function(){ var i=document.getElementById('sb-subject-input'); return String((i?i.value:item.subject)||''); } },
        task:{ get:function(){ return String(item.text_content||''); } },
        frontHidden:{ get:function(){ return item.front_hidden; }, set:function(v){ item.front_hidden=v; } }
      });
      function kindValue(){
        var el=document.getElementById('sc-board-kind-trigger'), t=el ? (el.textContent||'').replace(/\s+/g,' ').trim().toUpperCase() : '';
        var list=(window.IDBand && IDBand.BOARD_KINDS) || [];
        for(var i=0;i<list.length;i++){ if(String(list[i].label).toUpperCase()===t) return list[i].value; }
        return 'IDEA';
      }
      FGBBGoThere.mount(field, input, {
        generic:true,
        getCard:function(){ return wsCard; },
        topicId:function(){ return item.cluster_id || null; },
        nameOf:function(c){ return (c.subject||c.task||'').trim(); },
        isHeader:function(){ return item.content_type==='header'; },
        persistHidden:function(c){
          var patch={front_hidden:c.frontHidden};
          T().sb.from('ideas').update(patch).eq('id',item.id).then(function(r){
            if(r && r.error){ console.error('Card workspace badge save failed', r.error); return; }
            if(typeof _sboardPatchRow==='function') _sboardPatchRow(item.id, patch);
            if(typeof renderSeaBoard==='function') renderSeaBoard(true);
          });
        },
        leave:function(){
          try{ if(window.IDBand && IDBand.recordReturn && item.cluster_id) IDBand.recordReturn(kindValue(), item.cluster_id); }catch(e){}
          closeSbDetail();
        }
      });
    })();
    ov.classList.add('active');
    // Drag, Aug 19 2026 (Larry): IDEA CARD never had this -- every Briefing
    // Card overlay drags via _bbMakeDraggable in briefing-board.js, this
    // just never got the same treatment. Ported the same pattern rather
    // than screen-zero.js's makeDraggable, which is built for desktop
    // icons, not modal overlay cards. Position resets on close/reopen
    // (innerHTML is rebuilt from scratch) -- no saved-position persistence
    // yet, matching what was asked for.
    _sbMakeDraggable(ov.querySelector('.sb-details-card'), ov.querySelector('.sb-details-card .fg-back-idband') || document.getElementById('sb-details-head'));

    (function(){
      var clicks=0, timer=null;
      var eyebrow=document.querySelector('#sb-details-eyebrow') || ov.querySelector('.sb-details-card .fg-back-idl');
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

    // PRIMARY head icon, Sept 26 2026 -- see the HTML comment on the
    // SUBJECT field above for the "why." Mirrors _bbRenderCardPrimaryField
    // (briefing-board-master.js) as closely as possible: same shared CAST
    // PICK list (_castPickOpenMenu, cast-pick-list.js), same paint
    // helper (_bbPaintPrimaryTrigger), same card-type-agnostic
    // T2TStoryboard.assignPrimaryDirect (defaults to 'idea'). Scoped by
    // this card's own PROJECT (_sboardCurrentProjectRow -- the same
    // ambient project lookup the New Card popup already uses for its own
    // Cast picker, idea-storyboard-tiles.js), not a per-card stored
    // project id -- the Idea Board doesn't have one, and BB's own
    // PROJECT field is likewise the board's ambient ID Band answer, not
    // stored per card either.
    _sbRenderCardPrimaryField(item);

    // Fractal Casting entry point (Aug 9 2026 -- Sept 26 2026: removed).
    // Used to render a "sprout" (Make this a TOPIC) / mask (Cast for
    // this TOPIC) button here (sb-topic-btn), right before Trash in the
    // bottom row. Larry, Sept 26 2026: "delete sprout icon button. leave
    // four buttons across bottom of screen" -- the row is now
    // lock/people/gear/trash. Promotion to TOPIC still works the same as
    // it always has via Alt+T / dragging a card onto the TOPIC box
    // (_sboardDrillInto); a header that's already a delegated TOPIC is
    // still reachable through the people button (sb-people-btn), which
    // opens the same Call Sheet this button used to open directly.

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
      // One move for everything (Oct 22 2026, Larry: "cards have an order. arrows change the order. Make changing the order number also change the
      // order"): the arrows and the typed number both land here. The card goes to position newIdx, the cards between shift one place, and every
      // sort_order that changed is rewritten so the list stays 0..n-1.
      function showOrder(){
        var inp=document.getElementById('sb-order-input'), valEl=document.getElementById('sb-order-value');
        if(inp) inp.value=_sbOrderIdx+1;
        else if(valEl) valEl.textContent=(_sbOrderIdx+1)+' of '+_sbOrderList.length;
        setArrowState(upBtn, _sbOrderIdx>0);
        setArrowState(downBtn, _sbOrderIdx<_sbOrderList.length-1);
      }
      async function moveToIndex(newIdx){
        if(!_sbOrderList || item.locked) return;
        if(newIdx<0) newIdx=0;
        if(newIdx>_sbOrderList.length-1) newIdx=_sbOrderList.length-1;
        if(newIdx===_sbOrderIdx){ showOrder(); return; }
        var oldIds=_sbOrderList.slice();
        var ids=oldIds.slice();
        ids.splice(_sbOrderIdx,1); ids.splice(newIdx,0,item.id);
        var before=_sboardSnapshotRow(item.id);
        try{
          // .select() + row-count check (Aug 22 2026): Supabase reports success even when a write matches zero rows, so check the real count.
          var lo=Math.min(_sbOrderIdx,newIdx), hi=Math.max(_sbOrderIdx,newIdx);
          for(var k=lo;k<=hi;k++){
            var upd=await _sb.from('ideas').update({sort_order:k}).eq('id',ids[k]).select('id');
            if(upd.error) throw upd.error;
            if(!upd.data || !upd.data.length) throw new Error('Save was blocked (no rows matched) -- order not changed.');
          }
          for(var j=lo;j<=hi;j++) _sboardPatchRow(ids[j], {sort_order:j});
          if(_sbOrderIsTopHeader) _sboardTopLevelOrder=ids;
          else _sboardColumnOrderByParent[item.cluster_id||'']=ids;
          _sbOrderList=ids; _sbOrderIdx=newIdx;
          if(before){
            var after=_sboardSnapshotRow(item.id);
            _sboardPushAction({label:'Reorder', undo:function(){ return _sboardApplyRowSnapshot(item.id, before); }, redo:function(){ return _sboardApplyRowSnapshot(item.id, after); }});
          }
          showOrder();
          renderSeaBoard(true);
        }catch(err){
          showOrder();
          if(statusBox) statusBox.textContent='Reordering needs the sort_order Supabase column: '+err.message;
        }
      }
      function nudgeOrder(dir){ return moveToIndex(_sbOrderIdx+dir); }
      var numInp=document.getElementById('sb-order-input');
      if(numInp){
        numInp.addEventListener('click', function(e){ e.stopPropagation(); });
        numInp.addEventListener('keydown', function(e){
          e.stopPropagation();
          if(e.key==='Enter'){ e.preventDefault(); numInp.blur(); }
          else if(e.key==='Escape'){ numInp.value=_sbOrderIdx+1; numInp.blur(); }
        });
        numInp.addEventListener('change', function(){
          var n=parseInt(numInp.value,10);
          if(isNaN(n)){ showOrder(); return; }
          moveToIndex(n-1);
        });
      }
      if(upBtn) upBtn.addEventListener('click', function(){ nudgeOrder(-1); });
      if(downBtn) downBtn.addEventListener('click', function(){ nudgeOrder(1); });
    })();

    // Order eye, Oct 3 2026 (Larry: "eyeball option allowing card number to show in the upper right corner of a card ... board as presentation
    // script"). Checked = the card's order number shows in the upper right of its face. Only live when the card has a place in an order.
    (function(){
      var cb=document.getElementById('sb-order-front'), row=document.getElementById('sb-order-front-row');
      if(!cb || !row) return;
      var live=!!(_sbOrderList && _sbOrderIdx>-1);
      cb.checked=!!item.show_order_front; cb.disabled=!live;
      row.classList.toggle('bb-disabled', !live);
      function tip(){ row.title = !live ? 'This card has no place in an order yet' : (cb.checked ? 'Card number shows in the upper right of the card \u2014 click to hide it' : 'Card number is back only \u2014 click to show it in the upper right of the card'); }
      tip();
      cb.addEventListener('change', async function(){
        tip();
        var show=cb.checked, patch={show_order_front:show};
        try{
          var upd=await _sb.from('ideas').update(patch).eq('id',item.id).select('id');
          if(upd.error) throw upd.error;
          item.show_order_front=show;
          _sboardPatchRow(item.id, patch);
          renderSeaBoard(true);
        }catch(err){ cb.checked=!show; tip(); if(statusBox) statusBox.textContent=err.message; }
      });
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
    T().wire('sb-view-btn', async function(e){
      e.stopPropagation();
      if(viewSwitchDisabled) return;
      var newType = isHeaderType ? (item.image_url ? 'image' : 'text') : 'header';
      try{
        var fateRes=null, oldType=item.content_type;
        if(isHeaderType && isBucket){
          var fate=await _sboardAskContentsFate(item);
          if(!fate){ openSbDetail(item); return; }
          fateRes=await _sboardApplyContentsFate(item, fate);
        }
        var upd=await _sb.from('ideas').update({content_type:newType}).eq('id',item.id).select();
        if(upd.error) throw upd.error;
        item.content_type=newType;
        if(fateRes){
          var _itemId=item.id;
          async function _setType(t){ var u=await _sb.from('ideas').update({content_type:t}).eq('id',_itemId).select(); if(!u.error){ _sboardPatchRow(_itemId,{content_type:t}); } }
          _sboardPushAction({label:'Subber',
            undo:async function(){ await _setType(oldType); await fateRes.undo(); renderSeaBoard(true); },
            redo:async function(){ await fateRes.redo(); await _setType(newType); renderSeaBoard(true); }});
          _sboardShowToast('Turned into a subber — Ctrl/Cmd+Z to undo.');
        }
        renderSeaBoard(true);
        openSbDetail(item);   // reopen this card's back as its new type -- the button now reads the other word
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    });

    // ID Band on the back (Sept 30 2026, Larry: "All TOPIC and Board type should work and look the same on all boards and cards").
    // Both boxes open the SHARED menus in card-back-style.js (FGCardBack.openTopicMenu / openKindMenu) -- the same code the Briefing Card back
    // uses, drawn with this board's own dropdown look. What a pick does is this card's part: move under a header, or go to another board.
    // Oct 15 2026 -- Larry's rule: changing the ID BAND moves the card and all its children (a header's subbers and sub-headers hang under it by
    // cluster_id, so they travel with it), and a note records where it came from: "Moved from TOPIC: <old header>."
    // Oct 15 2026 (Larry: STORY PRESENTATION MODE and PRIMARY Control never left WEBSITE): a PLAN header belongs to the TOPIC it is tagged to
    // (source_project_id), and its plan board is the one inside that TOPIC. Changing the TOPIC on its back has to retag it AND file it in the
    // new TOPIC's own PLAN container (made if the TOPIC has none yet); changing only cluster_id left the tag on WEBSITE, so it kept showing there.
    // Its steps and Parking Lot cards hang under it by cluster_id and travel with it.
    function _sbIsPlanHeader(){
      if(!item || item.content_type!=='header' || !item.source_project_id) return false;
      if(window.T2TPlan && T2TPlan.isContainer(item)) return false;
      return true;
    }
    async function _sbPlanContainerFor(topicId){
      var q=await _sb.from('ideas').select('*').eq('content_type','header').eq('storyboard_kind','PLAN').eq('source_project_id',topicId).limit(1);
      if(q.error) throw q.error;
      if(q.data && q.data[0]) return q.data[0];
      var tr=await _sb.from('ideas').select('*').eq('id',topicId).maybeSingle();
      if(tr.error) throw tr.error;
      var proj=tr.data; if(!proj) throw new Error('Topic not found');
      var uid=(await _sb.auth.getUser()).data.user.id;
      var mk=await _sb.from('ideas').insert({
        user_id:uid, content_type:'header', text_content:proj.text_content||'(untitled)', cluster_id:proj.id, color:proj.color||null,
        board_type:proj.board_type||null, org_name:proj.org_name||null, locked:!!proj.locked, logo_url:proj.logo_url||null,
        logo_w:proj.logo_w||null, logo_h:proj.logo_h||null, storyboard_kind:'PLAN', source_project_id:proj.id,
        track_on_briefing_board:false, created_at:new Date().toISOString()
      }).select().single();
      if(mk.error) throw mk.error;
      try{ if(window._sboardPatchRow) _sboardPatchRow(mk.data.id, mk.data); }catch(e){}
      return mk.data;
    }
    async function _sbMovedFromNote(){
      try{
        if(!item.cluster_id) return null;
        if(_sbIsPlanHeader()){
          var sr=await _sb.from('ideas').select('text_content,subject,idea_text').eq('id', item.source_project_id).maybeSingle();
          var sd=sr && sr.data; var sn=sd && ((sd.subject||'').trim() || (sd.idea_text||'').trim() || (sd.text_content||'').trim());
          if(sn){ var sl='Moved from TOPIC: '+sn+'.', so=(item.notes||'').trim(); return so ? (so+'\n'+sl) : sl; }
        }
        var pr=await _sb.from('ideas').select('text_content,subject,idea_text').eq('id', item.cluster_id).maybeSingle();
        var d=pr && pr.data; var nm=d && ((d.subject||'').trim() || (d.idea_text||'').trim() || (d.text_content||'').trim());
        if(!nm) return null;
        var line='Moved from TOPIC: '+nm+'.', old=(item.notes||'').trim();
        return old ? (old+'\n'+line) : line;
      }catch(e){ return null; }
    }
    async function moveCardToHeader(hid){
      // A plan header is "here" by its TOPIC tag, not by where its row happens to sit (a header whose row already sits under STORY but is still
      // tagged to WEBSITE must be movable to STORY).
      if(_sbIsPlanHeader() ? String(hid||'')===String(item.source_project_id||'') : String(hid||'')===String(item.cluster_id||'')){ closeSbDetail(); return; }
      var before={cluster_id:item.cluster_id, sort_order:item.sort_order, notes:item.notes||null, adds_notes:!!item.adds_notes};
      var isPlanHdr=_sbIsPlanHeader();
      if(isPlanHdr) before.source_project_id=item.source_project_id;
      try{
        var newNotes=await _sbMovedFromNote();
        var f={cluster_id:hid};
        if(isPlanHdr){
          var tgt=_sboardAllRowsById[hid];
          // Picking a TOPIC re-homes the plan into that TOPIC's PLAN board; picking a place inside a plan board just moves it there.
          if(!(tgt && (T2TPlan.isContainer(tgt) || tgt.storyboard_kind==='PLAN'))){
            var pc=await _sbPlanContainerFor(hid);
            f.cluster_id=pc.id; f.source_project_id=hid;
          }
        }
        if(newNotes){ f.notes=newNotes; f.adds_notes=true; }
        var upd=await _sb.from('ideas').update(f).eq('id',item.id).select();
        if(upd.error) throw upd.error;
        item.cluster_id=f.cluster_id;
        if(f.source_project_id) item.source_project_id=f.source_project_id;
        if(newNotes){ item.notes=newNotes; item.adds_notes=true; }
        _sboardPatchRow(item.id, f);
        (function(){
          var itemId=item.id, after={cluster_id:f.cluster_id, sort_order:before.sort_order, notes:newNotes||before.notes, adds_notes:newNotes?true:before.adds_notes};
          if(isPlanHdr) after.source_project_id=f.source_project_id||item.source_project_id;
          _sboardPushAction({label:'Move', undo:function(){ return _sboardApplyRowSnapshot(itemId, before); }, redo:function(){ return _sboardApplyRowSnapshot(itemId, after); }});
        })();
        _sbMoveFromBoard=false;
        closeSbDetail();
        renderSeaBoard(true);
        _sboardShowToast('Moved — Ctrl/Cmd+Z to undo.');
      }catch(err){ console.error(err); }
    }
    function openTopicPicker(ev){
      if(ev && ev.stopPropagation) ev.stopPropagation();
      if(!window.FGCardBack) return;
      var topicForNew=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : (T2TShared.filter||T2TShared.currentTopicId||null);
      FGCardBack.openTopicMenu(document.getElementById('sb-d-topic-btn'), {theme:'idea', sb:_sb, hereId:(_sbIsPlanHeader()?item.source_project_id:item.cluster_id), excludeId:item.id, onPick:moveCardToHeader, addParentId:topicForNew, onAdded:(topicForNew ? _sbMoveIntoNewHeader : null)});
    }
    function openKindPicker(ev){
      if(ev && ev.stopPropagation) ev.stopPropagation();
      if(!window.FGCardBack) return;
      FGCardBack.openKindMenu(document.getElementById('sb-d-kind-btn'), {theme:'idea', current:'IDEA', onPick:function(k){
        if(k.value==='BRIEFING BOARD'){ sendToBriefingBoard(); return; }
        _sboardShowToast('Moving a card to '+k.label+' is not built yet.');
      }});
    }
    // Blue Sky card -> new Briefing card in the Parking Lot (col 'new', no Signal Flag), tagged with this card's topic. A move (see below).
    async function sendToBriefingBoard(){
      try{
        if(item.content_type==='header'){ _sboardShowToast('Headers reach the Briefing Board through their own assign button.'); openSbDetail(item); return; }
        var text=(item.text_content||'').trim(), subj=(item.subject||'').trim();
        if(!text && !subj){ _sboardShowToast('This card has no text to send.'); openSbDetail(item); return; }
        var au=await _sb.auth.getUser(); var uid=(au&&au.data&&au.data.user)?au.data.user.id:null;
        if(!uid) throw new Error('Not signed in');
        var topicId=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : (T2TShared.currentTopicId||null);
        var br=await _sb.from('briefing_boards').select('id,board_type,storyboard_project_id,created_at').eq('user_id',uid).order('created_at',{ascending:true});
        if(br.error) throw br.error;
        var boards=br.data||[];
        var board=boards.filter(function(b){ return topicId && String(b.storyboard_project_id)===String(topicId); })[0]
               || boards.filter(function(b){ return (b.board_type||'personal')==='personal'; })[0] || boards[0];
        if(!board){ _sboardShowToast('Open the Briefing Board once first, so it has a board to receive this.'); openSbDetail(item); return; }
        var top=await _sb.from('briefing_cards').select('sort_order').eq('board_id',board.id).eq('col','new').order('sort_order',{ascending:true,nullsFirst:false}).limit(1);
        var minSort=(top.data && top.data[0] && typeof top.data[0].sort_order==='number') ? top.data[0].sort_order : 1;
        // Oct 15 2026 (Larry: "This is a move request"): the Blue Sky card is MOVED, not copied. The new Briefing card carries this card's Notes plus
        // a "Moved from the Blue Sky board (TOPIC: ...)" line, and only after it is safely written does this card go to the Trash header
        // (recoverable there, same as the Trash button).
        var fromName='';
        try{
          if(topicId){
            var tr=await _sb.from('ideas').select('text_content,subject,idea_text').eq('id',topicId).maybeSingle();
            var td=tr && tr.data; fromName=td ? ((td.subject||'').trim()||(td.idea_text||'').trim()||(td.text_content||'').trim()) : '';
          }
        }catch(e){}
        var moveLine='Moved from the Vision board'+(fromName?(' (TOPIC: '+fromName+')'):'')+'.', oldNotes=(item.notes||'').trim();
        var row={board_id:board.id, col:'new', task:text||subj, subject:subj||null, hide_contents_front:!!item.hide_contents_front, priority:'', sort_order:minSort-1,
                 notes:(oldNotes?(oldNotes+'\n'):'')+moveLine, adds_notes:true};
        if(topicId) row.project_header_id=topicId;
        var ins=await _sb.from('briefing_cards').insert(row).select('id').single();
        if(ins.error) throw ins.error;
        var trashId=await T2TData.ensureTrashHeader();
        if(trashId){
          var tup=await _sb.from('ideas').update({cluster_id:trashId}).eq('id',item.id);
          if(tup.error) throw tup.error;
          item.cluster_id=trashId;
          _sboardPatchRow(item.id, {cluster_id:trashId});
        }
        closeSbDetail();
        renderSeaBoard(true);
        _sboardShowToast('Moved to the Briefing Board Parking Lot. The Trash keeps the Vision card.');
      }catch(err){
        console.error('Send to Briefing Board failed', err);
        _sboardShowToast('Could not send it: '+(err && err.message ? err.message : 'unknown error'));
        try{ openSbDetail(item); }catch(e){}
      }
    }
    T().wire('sb-d-topic-btn', openTopicPicker);
    T().wire('sb-d-kind-btn', openKindPicker);
    // Alt+M from the board (idea-storyboard-shared.js) opens the card and
    // then asks for the move picker straight away.
    if(_sbOpenMoveOnOpen){ _sbOpenMoveOnOpen=false; openTopicPicker(); }
    // "+ New header here" (inside the MOVE pyramid): creates a header on
    // the board being viewed and moves this card into it. Same ENTER +
    // Saving… feedback as the standalone New Header prompt.
    async function _sbMoveIntoNewHeader(row){
      try{
        _sboardAddRow(row);
        var upd=await _sb.from('ideas').update({cluster_id:row.id}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=row.id;
        _sboardPatchRow(item.id, {cluster_id:row.id});
        _sbMoveFromBoard=false;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ console.error(err); _sboardShowToast((err&&err.message)||'Could not move the card.'); }
    }

    // Text editing (auto-promotes to header if punctuation says so)
    var textDisplay=document.getElementById('sb-text-display');
    // Oct 25 2026 (Larry: "cannot entry the contents on an Idea card") -- the editor used to open only from the thin text strip inside the
    // Contents box, so on an empty card most of the box did nothing when clicked. Now the whole box opens it, and a brand-new empty card from
    // a (+) opens already in edit mode with the cursor in the field.
    function _sbOpenTextEdit(){
      var ed=document.getElementById('sb-text-edit'), ta=document.getElementById('sb-text-input');
      if(!ed || !ta || !textDisplay || ed.style.display==='block') return;
      ed.style.display='block';
      textDisplay.style.display='none';
      ta.focus();
    }
    if(textDisplay && !item.locked){
      textDisplay.addEventListener('click', _sbOpenTextEdit);
      var _sbBodyBox=textDisplay.closest ? textDisplay.closest('.sb-body-box') : null;
      if(_sbBodyBox) _sbBodyBox.addEventListener('click', function(e){
        if(e.target && e.target.closest && e.target.closest('#sb-text-edit, a, button')) return;
        _sbOpenTextEdit();
      });
      if(!String(item.text_content||'').trim() && window.FGNewCardDoor && FGNewCardDoor.isPending && FGNewCardDoor.isPending(item.id) && !isHeaderType){
        setTimeout(_sbOpenTextEdit, 0);
      }
    }
    // Oct 25 2026 (Larry: "Just entry field with enter as finished. Trash can cancel") -- the Contents editor is one entry field: Enter finishes
    // (Shift+Enter makes a new line), Esc cancels, and the Save / Cancel buttons are gone (the card's own trash can already exists).
    (function(){
      var ta=document.getElementById('sb-text-input'), sv=document.getElementById('sb-text-save'), cn=document.getElementById('sb-text-cancel');
      if(!ta || !sv || !cn) return;
      var original=ta.value;
      sv.style.display='none';
      cn.style.display='none';   // the card already has its own trash can; no second one here
      cn.addEventListener('click', function(){ ta.value=original; });
      ta.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); sv.click(); }
        else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); cn.click(); }
      });
      // Oct 27 2026 (Larry: a header changed, then click-away did not save -- "should work either way"): leaving the field runs the SAME save Enter
      // runs, for cards that already exist. The card stays open (a click on another field must not close it); closing is still a click outside.
      // Brand-new cards keep their own click-away path in closeSbDetail, so they are skipped here.
      ta.addEventListener('blur', function(){
        if(item.locked) return;
        if(window.FGNewCardDoor && FGNewCardDoor.isPending && FGNewCardDoor.isPending(item.id)) return;
        var now=String(ta.value||'').trim();
        if(!now || now===String(item.text_content||'').trim()) return;
        _sbBlurSaving=true; sv.click();
      });
    })();
    T().wire('sb-text-cancel', function(){
      document.getElementById('sb-text-edit').style.display='none';
      if(textDisplay) textDisplay.style.display='block';
    });
    T().wire('sb-text-save', async function(){
      var newText=document.getElementById('sb-text-input').value.trim();
      if(!newText){ _sbSavingOnClose=false; if(statusBox) statusBox.textContent='Text can\'t be empty.'; return; }
      var beforeFields={text_content:item.text_content, content_type:item.content_type};
      var _sbFromBlur=_sbBlurSaving; _sbBlurSaving=false;
      var becameNote=false;
      try{
        var patch;
        if(item.content_type==='link'){
          var curLink=T2TMedia.parseText(item.text_content);
          patch={text_content: JSON.stringify({url:curLink.url, title:newText})};
        } else {
          patch={text_content:newText};
          // Oct 25 2026 (Larry: "What if CONTENTS field says Note:?" -- yes): Contents that begin with "Note:" make this card a NOTE. The marker is
          // taken out of the text (it was only the switch) and the card reopens as a NOTES back, with the TOPIC selector and the Source/Attachments/Gem options.
          if(item.content_type==='text' && !item.is_note && /^\s*note\s*:/i.test(newText)){
            patch.text_content=newText.replace(/^\s*note\s*:\s*/i,''); patch.is_note=true; becameNote=true;
          } else if(item.content_type==='text' && _sboardIsAutoHeaderText(newText)) patch.content_type='header';
        }
        if(window.FGNewCardDoor && FGNewCardDoor.whenReady) await FGNewCardDoor.whenReady(item.id);   // a card made a moment ago is still being saved
        var upd=await _sb.from('ideas').update(patch).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.text_content=patch.text_content;
        if(patch.content_type) item.content_type=patch.content_type;
        if(becameNote) item.is_note=true;
        _sboardPatchRow(item.id, patch);
        (function(){
          var itemId=item.id, before=beforeFields, after={text_content:patch.text_content, content_type:patch.content_type||beforeFields.content_type};
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
        })();
        renderSeaBoard(true);
        // Oct 25 2026 (Larry: "We need to be able to add rapid fire ideas. keep entry screen open until clicked outside the screen") -- Enter on a
        // brand-new card saves it and puts a fresh empty card of the same kind in its place, still open. Closing is a click outside the card.
        var _sbRapid=false, _sbLeaving=_sbSavingOnClose; _sbSavingOnClose=false;
        if(!_sbLeaving && !_sbFromBlur && !becameNote && window.FGNewCardDoor && FGNewCardDoor.isPending && FGNewCardDoor.isPending(item.id) && FGNewCardDoor.next){
          try{ _sbRapid=await FGNewCardDoor.next(); }catch(e){ _sbRapid=false; }
        }
        if(becameNote){ openSbDetail(item); } else if(!_sbRapid && !_sbFromBlur){ _sbCloseBypass=true; try{ closeSbDetail(); }finally{ _sbCloseBypass=false; } }
      }catch(err){ _sbSavingOnClose=false; if(statusBox) statusBox.textContent=err.message; }
    });

    // Remove a header's picture, Oct 9 2026 (see the Picture row in the Contents body above).
    T().wire('sb-hdr-pic-remove', async function(){
      try{
        var rm=await _sb.from('ideas').update({image_url:null}).eq('id',item.id);
        if(rm.error) throw rm.error;
        item.image_url=null;
        _sboardPatchRow(item.id, {image_url:null});
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
    // SUBJECT + "Show contents on face of card" -- Sept 22 2026. See the
    // HTML comment on .sb-subject-field above. Saved straight to this
    // card's own ideas row (subject / hide_contents_front), with undo,
    // the same way the Priority block just below saves.
    (function(){
      var input=document.getElementById('sb-subject-input');
      if(!input) return;
      async function saveSubjectFields(fields, before){
        try{
          var upd=await _sb.from('ideas').update(fields).eq('id',item.id);
          if(upd.error) throw upd.error;
          for(var k in fields) item[k]=fields[k];
          _sboardPatchRow(item.id, fields);
          (function(){
            var itemId=item.id, after=fields;
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          paintFront();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Could not save subject: '+err.message; }
      }
      function paintFront(){
        var hasSubject=!!input.value.trim();
        var showing=!hasSubject || !item.hide_contents_front;
        if(window.FGFrontCheck) FGFrontCheck.paint(document.getElementById('sb-contents-front-row'), document.getElementById('sb-contents-front'), showing, hasSubject, 'contents');
      }
      function commitSubject(){
        var val=input.value.trim();
        if(val===(item.subject||'')) return;
        saveSubjectFields({subject:val||null}, {subject:item.subject||null});
      }
      input.addEventListener('input', paintFront);
      input.addEventListener('blur', commitSubject);
      input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); input.blur(); } });
      (function(){
        var cb=document.getElementById('sb-contents-front');
        if(cb) cb.addEventListener('change', function(e){
          e.stopPropagation();
          var hide=!cb.checked;
          if(hide===!!item.hide_contents_front) return;
          saveSubjectFields({hide_contents_front:hide}, {hide_contents_front:!!item.hide_contents_front});
        });
      })();
      paintFront();
    })();

    // Organization fields -- Sept 26 2026. Same save-on-blur shape as
    // SUBJECT just above (org_name/org_eyebrow straight onto this card's
    // own ideas row), plus a plain upload-and-replace for the logo (no
    // crop/resize/drag -- deliberately simpler than the old retired
    // T2TLogo interaction; Larry can ask for that back on top of this if
    // wanted). Any successful save re-renders the ID Band's org display
    // (_sboardRenderOrgDisplay, idea-storyboard-navigation.js) so a Link
    // change is visible immediately if this card is (or is an ancestor
    // of) whatever TOPIC is currently on screen.
    (function(){
      var eyebrowInput=document.getElementById('sb-org-eyebrow-input');
      var nameInput=document.getElementById('sb-org-name-input');
      var logoSlot=document.getElementById('sb-org-logo-slot');
      var logoInput=document.getElementById('sb-org-logo-input');
      var orgStatus=document.getElementById('sb-org-status');
      if(!eyebrowInput && !nameInput && !logoSlot) return;
      async function saveOrgFields(fields){
        try{
          var upd=await _sb.from('ideas').update(fields).eq('id',item.id);
          if(upd.error) throw upd.error;
          for(var k in fields) item[k]=fields[k];
          _sboardPatchRow(item.id, fields);
          if(typeof _sboardRenderOrgDisplay==='function') _sboardRenderOrgDisplay();
        }catch(err){ if(orgStatus) orgStatus.textContent='Could not save: '+err.message; }
      }
      if(eyebrowInput) eyebrowInput.addEventListener('blur', function(){
        var val=eyebrowInput.value.trim();
        if(val===(item.org_eyebrow||'')) return;
        saveOrgFields({org_eyebrow:val||null});
      });
      if(nameInput) nameInput.addEventListener('blur', function(){
        var val=nameInput.value.trim();
        if(val===(item.org_name||'')) return;
        saveOrgFields({org_name:val||null});
      });
      [eyebrowInput,nameInput].forEach(function(inp){
        if(!inp) return;
        inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } });
      });
      if(logoSlot && logoInput){
        logoSlot.addEventListener('click', function(){ logoInput.click(); });
        logoInput.addEventListener('change', async function(){
          var file=logoInput.files && logoInput.files[0]; if(!file) return;
          if(orgStatus) orgStatus.textContent='Uploading…';
          try{
            var toUpload=await window.T2TMedia.compressImageFile(file);
            var user=(await _sb.auth.getUser()).data.user;
            if(!user) throw new Error('Not signed in.');
            var path=user.id+'/org-logo-'+item.id+'-'+Date.now()+'.png';
            var up=await _sb.storage.from('sea-of-ideas').upload(path, toUpload);
            if(up.error) throw up.error;
            var pub=_sb.storage.from('sea-of-ideas').getPublicUrl(path);
            var url=pub.data && pub.data.publicUrl;
            if(!url) throw new Error('No public URL returned.');
            await saveOrgFields({logo_url:url});
            logoSlot.innerHTML='<img id="sb-org-logo-img" src="'+_sboardEsc(url)+'" style="max-width:100%;max-height:100%;object-fit:contain">';
            if(orgStatus) orgStatus.textContent='';
          }catch(err){ if(orgStatus) orgStatus.textContent='Logo upload failed: '+err.message; }
        });
      }
    })();

    // Priority buttons + "Show on front" -- Sept 22 2026. See the HTML
    // comment on .sb-pri-field above.
    (function(){
      var PRI_BASE_LOCAL={H:'H',HH:'H',M:'M',MH:'M',L:'L',ML:'L'};
      function nextPri(cur, base){
        var _bbNext=(window.T2TBriefingBoard && window.T2TBriefingBoard.nextPriority) ? window.T2TBriefingBoard.nextPriority(cur, base) : undefined;
        if(_bbNext!==undefined) return _bbNext;
        var seq={H:['H','HH',''],M:['M','MH',''],L:['L','ML','']}[base];
        var idx=PRI_BASE_LOCAL[cur]===base ? seq.indexOf(cur) : -1;
        return idx===-1 ? seq[0] : seq[(idx+1)%seq.length];
      }
      function paint(){
        var pri=item.priority||'';
        Array.prototype.forEach.call(document.querySelectorAll('#sb-pri-btns .sb-pri-btn'), function(b){
          var base=b.getAttribute('data-pri-base');
          var active=!!pri && PRI_BASE_LOCAL[pri]===base;
          b.textContent=active?pri:base;
          // Inactive = cleared, so the shared Briefing Card button look
          // (and this card's light-blue edge) shows through.
          b.style.background=active && typeof PRI_COLOR!=='undefined' ? PRI_COLOR[pri] : '';
          b.style.borderColor=active && typeof PRI_COLOR!=='undefined' ? PRI_COLOR[pri] : '';
          b.style.color=active && typeof PRI_TEXT!=='undefined' ? PRI_TEXT[pri] : '';
        });
      }
      async function saveFields(fields, before){
        try{
          var upd=await _sb.from('ideas').update(fields).eq('id',item.id);
          if(upd.error) throw upd.error;
          for(var k in fields) item[k]=fields[k];
          _sboardPatchRow(item.id, fields);
          (function(){
            var itemId=item.id, after=fields;
            _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, after); }});
          })();
          paint();
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Could not save priority: '+err.message; }
      }
      Array.prototype.forEach.call(document.querySelectorAll('#sb-pri-btns .sb-pri-btn'), function(b){
        b.addEventListener('click', function(e){
          e.stopPropagation();
          var before={priority:item.priority||''};
          saveFields({priority:nextPri(item.priority||'', b.getAttribute('data-pri-base'))}, before);
        });
      });
      var _band=FGCardBack.topBand(document.querySelector('.sb-pri-field').closest('.bbw'), document.querySelector('.sb-pri-field'), document.querySelector('.sb-subject-field'), {
        id:'sb-pri-eye',
        // Same place as the task card: 'priority' in the card's hidden-from-front list (ideas.front_hidden).
        isShown:function(){ return !FGCardBackOptions.isBackOnly(item.front_hidden,'priority'); },
        setShown:function(show){
          var cur=FGCardBackOptions.parseHidden(item.front_hidden).slice(), i=cur.indexOf('priority');
          if(show && i>=0) cur.splice(i,1); else if(!show && i<0) cur.push('priority'); else return;
          return saveFields({front_hidden:cur.join(',')}, {front_hidden:item.front_hidden||''});
        }
      });
      function paintFront(){ _band.paintEye(); }
      paint();
      paintFront();
    })();

    // Plan step time field, Oct 11 2026 -- saves on change/blur, undoable like the other back-of-card edits.
    (function(){
      var inp=document.getElementById('sb-steptime-input');
      if(!inp) return;
      inp.addEventListener('click', function(e){ e.stopPropagation(); });
      inp.addEventListener('keydown', function(e){ e.stopPropagation(); if(e.key==='Enter'){ inp.blur(); } });
      inp.addEventListener('change', async function(){
        var next=inp.value.trim(), before={step_time:item.step_time||''};
        if(next===before.step_time) return;
        try{
          var upd=await _sb.from('ideas').update({step_time:next}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.step_time=next;
          _sboardPatchRow(item.id, {step_time:next});
          var itemId=item.id;
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, {step_time:next}); }});
          renderSeaBoard(true);
        }catch(err){ if(statusBox) statusBox.textContent='Could not save time: '+err.message; }
      });
    })();

    // Time eye, Oct 12 2026 -- checked = the step's time shows lower right on the face; default off (back only).
    (function(){
      var cb=document.getElementById('sb-steptime-front'), row=document.getElementById('sb-steptime-front-row');
      if(!cb) return;
      function tip(){ if(row) row.title = cb.checked ? 'Time shows on the card face \u2014 click to hide it' : 'Time is back only \u2014 click to show it on the card face'; }
      tip();
      cb.addEventListener('change', async function(){
        tip();
        var show=cb.checked, before={show_time_front:!show};
        try{
          var upd=await _sb.from('ideas').update({show_time_front:show}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.show_time_front=show;
          _sboardPatchRow(item.id, {show_time_front:show});
          var itemId=item.id;
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, {show_time_front:show}); }});
          renderSeaBoard(true);
        }catch(err){ cb.checked=!show; tip(); if(statusBox) statusBox.textContent='Could not save: '+err.message; }
      });
    })();

    // Plan step done checkbox, Oct 12 2026 -- same save/undo pattern as the Time field just above.
    (function(){
      var cb=document.getElementById('sb-stepdone-input');
      if(!cb) return;
      cb.addEventListener('click', function(e){ e.stopPropagation(); });
      cb.addEventListener('change', async function(){
        var next=!!cb.checked, before={step_done:!!item.step_done};
        if(next===before.step_done) return;
        try{
          var upd=await _sb.from('ideas').update({step_done:next}).eq('id',item.id);
          if(upd.error) throw upd.error;
          item.step_done=next;
          _sboardPatchRow(item.id, {step_done:next});
          var itemId=item.id;
          _sboardPushAction({label:'Edit', undo:function(){ return _sboardApplyFields(itemId, before); }, redo:function(){ return _sboardApplyFields(itemId, {step_done:next}); }});
          renderSeaBoard(true);
        }catch(err){ cb.checked=!next; if(statusBox) statusBox.textContent='Could not save: '+err.message; }
      });
    })();

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
        linkPreview.innerHTML=(thumb?('<img src="'+_sboardEsc(thumb)+'" style="max-width:100%;max-height:80px;border-radius:6px;display:block;margin:0 auto 4px;object-fit:contain">'):'')+(isImgSrc?('<a href="'+_sboardEsc(url)+'" target="_blank" rel="noopener" style="color:inherit">'+_sboardEsc(title||url)+' \u2197</a>'):_sboardEsc(title||url));
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

    // Send to Parking Lot -- offered at the bottom of the MOVE pyramid.
    // (Function keeps its old name, _sbSendToParkingLot, so the three call sites stay put.)
    async function _sbSendToParkingLot(){
      try{
        // Card-details sweep, July 19, 2026: T2TShared.currentTopicId is
        // 9710-only (never set by 9711's own navigation) -- use 9711's
        // handed-over Topic id when it's the active screen, same as the
        // rest of this sweep.
        var _parkTopic=(isOn9711 && _isxDetailCtx) ? _isxDetailCtx.topicId : T2TShared.currentTopicId;
        // Find this topic's Parking Lot (also matches legacy NEW / New Additions);
        // if there is none yet, an explicit Send creates one -- the traveler asked for it.
        var targetId=await T2TData.ensureNewAdditionsHeader(_parkTopic);
        if(!targetId && T2TData.ensureHeaderNamed) targetId=await T2TData.ensureHeaderNamed('Parking Lot', _parkTopic);
        if(!targetId && !isParked) throw new Error('Could not find or create a Parking Lot here.');
        var newCluster=isParked?null:targetId;
        var upd=await _sb.from('ideas').update({cluster_id:newCluster}).eq('id',item.id);
        if(upd.error) throw upd.error;
        item.cluster_id=newCluster;
        closeSbDetail();
        renderSeaBoard(true);
      }catch(err){ if(statusBox) statusBox.textContent=err.message; }
    }

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

    // LIBRARY ACCESS, Oct 6 2026 (Larry): a visibility choice on each LIBRARY header -- INHERIT (follow the header above),
    // CAST (only people seated on that branch can see it) or MEMBER (every traveler with an account can read it).
    // No public/anonymous access exists. The database (ideas.library_access plus the library_shared trigger) does the real
    // enforcing and cascades down the branch; this control only sets the choice. Shown to the card's owner on headers inside LIBRARY.
    (function _sbWireLibraryAccess(){
      try{
        if(!isHeaderType || typeof _sb==='undefined' || !_sb) return;
        var meId=(window.T2TShared && window.T2TShared._meId) || null;
        if(!meId || item.user_id!==meId) return;
        var rows=(typeof _sboardAllRowsById!=='undefined' && _sboardAllRowsById) || {};
        function isLibRoot(r){ return r && r.content_type==='header' && r.library_shared===true && /^\s*library\s*$/i.test(r.text_content||''); }
        var n=rows[item.cluster_id], g=0, inLib=false, inherited='member';
        var foundInherited=false;
        while(n && g++<60){
          if(!foundInherited && (n.library_access==='cast' || n.library_access==='member')){ inherited=n.library_access; foundInherited=true; }
          if(isLibRoot(n)){ inLib=true; break; }
          n=rows[n.cluster_id];
        }
        if(!inLib && !isLibRoot(item)) return;
        var actionRow=document.getElementById('sb-lock') && document.getElementById('sb-lock').parentNode;
        if(!actionRow || !actionRow.parentNode) return;
        var box=document.createElement('div');
        box.id='sb-library-access';
        box.style.cssText='display:flex;align-items:center;gap:6px;margin:4px 0;font-size:calc(10px * var(--fg-text-scale,1));color:var(--bb-sub)';
        var tips={
          inherit:'Follows the header above it ('+inherited.toUpperCase()+' right now). A lower header can override.',
          cast:'CAST: only people seated on this branch can see it.',
          member:'MEMBER: every traveler with an account can read it. Never public.'
        };
        var cur=item.library_access||'inherit';
        function paint(){
          Array.prototype.forEach.call(box.querySelectorAll('button'), function(b){
            var on=b.getAttribute('data-v')===cur;
            b.style.background=on?'#1a3a5c':'transparent';
            b.style.color=on?'#fff':'inherit';
          });
        }
        box.innerHTML='<span style="letter-spacing:1px;text-transform:uppercase" title="Who can see this header and everything under it. No public access.">Access</span>'
          + ['inherit','cast','member'].map(function(v){
              return '<button type="button" data-v="'+v+'" title="'+tips[v].replace(/"/g,'&quot;')+'" style="font-size:inherit;padding:2px 8px;border:0.5px solid #B4B2A9;border-radius:10px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px">'+v+'</button>';
            }).join('');
        actionRow.parentNode.insertBefore(box, actionRow);
        paint();
        box.addEventListener('click', async function(ev){
          var b=ev.target.closest && ev.target.closest('button[data-v]'); if(!b) return;
          var v=b.getAttribute('data-v'); if(v===cur) return;
          var val=(v==='inherit')?null:v;
          var upd=await _sb.from('ideas').update({library_access:val}).eq('id', item.id).select('id,library_access,library_shared');
          if(upd.error || !upd.data || !upd.data.length){ _sboardShowToast('Could not change access.'); return; }
          cur=v; item.library_access=val; item.library_shared=upd.data[0].library_shared;
          _sboardPatchRow(item.id, {library_access:val, library_shared:upd.data[0].library_shared});
          paint();
          _sboardShowToast(v==='cast'?'CAST: only people seated on this branch can see it.':v==='member'?'MEMBER: every traveler with an account can read it.':'Access now follows the header above.');
        });
      }catch(err){ console.error('Library access control', err); }
    })();

    // Gear → color swatches
    T().wire('sb-gear', function(){
      var row=document.getElementById('sb-swatch-row');
      row.style.display=(row.style.display==='none'||!row.style.display)?'flex':'none';
    });
    // Palette edit mode (Sept 22 2026) -- see the swatches comment above.
    var _sbPaletteEditing=false;
    function _sbRepaintSwatches(){
      Array.prototype.forEach.call(document.querySelectorAll('#sb-swatch-row .sb-swatch'), function(btn){
        var i=+btn.getAttribute('data-i'), c=_sboardColorPalette[i];
        btn.setAttribute('data-c', c);
        btn.style.background=c;
        btn.style.boxShadow=(!_sbPaletteEditing && item.color===c)?'0 0 0 2px #1a3a5c':'';
        btn.style.outline=_sbPaletteEditing?'2px dashed #a3907a':'';
        btn.style.outlineOffset='2px';
      });
      var ed=document.getElementById('sb-palette-edit'); if(ed) ed.style.boxShadow=_sbPaletteEditing?'0 0 0 2px #1a3a5c':'';
      var hint=document.getElementById('sb-palette-hint'); if(hint) hint.style.display=_sbPaletteEditing?'block':'none';
    }
    if(window.CardPalette) CardPalette.load().then(_sbRepaintSwatches);
    Array.prototype.forEach.call(document.querySelectorAll('.sb-swatch'), function(btn){
      btn.addEventListener('click', function(){
        if(_sbPaletteEditing){
          var inp=document.getElementById('sb-palette-input'); if(!inp) return;
          inp.value=btn.getAttribute('data-c');
          inp.setAttribute('data-i', btn.getAttribute('data-i'));
          inp.click();
          return;
        }
        _sbApplyCardColor(btn.getAttribute('data-c'));
      });
    });
    T().wire('sb-palette-edit', function(e){ if(e) e.stopPropagation(); _sbPaletteEditing=!_sbPaletteEditing; _sbRepaintSwatches(); });
    (function(){
      var inp=document.getElementById('sb-palette-input');
      if(inp) inp.addEventListener('change', async function(){
        var i=+inp.getAttribute('data-i');
        if(isNaN(i) || !window.CardPalette) return;
        await CardPalette.setColor(i, inp.value);
        _sbRepaintSwatches();
      });
    })();
    async function _sbApplyCardColor(c){
      {
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
      }
    }

    T().wire('sb-close', closeSbDetail);
  }

  // PRIMARY head icon on the Idea card back, Sept 26 2026 -- Larry: "BB
  // had PRIMARY single head button. Add this to Idea card back on same
  // line as SUBJECT." Deliberately mirrors _bbRenderCardPrimaryField
  // (briefing-board-master.js) line for line, rather than a shared
  // helper both call -- the two already read/write the same
  // card_roles table and the same shared CAST PICK list/paint helper,
  // only the card_type ('idea' vs 'briefing_card') and the field it
  // sits beside (SUBJECT vs PROJECT) differ.
  async function _sbRenderCardPrimaryField(item){
    var trigger=document.getElementById('sb-primary-trigger'), menu=document.getElementById('sb-primary-menu');
    if(!trigger || !menu) return;
    var sb=T().sb;
    var currentUid=null;
    if(sb){
      try{
        var res=await sb.from('card_roles').select('user_id').eq('card_type','idea').eq('card_id', item.id).eq('role','primary').maybeSingle();
        if(!res.error && res.data) currentUid=res.data.user_id;
      }catch(e){ console.error('Idea card: could not load current PRIMARY', e); }
    }
    if(_sboardActiveId!==item.id) return; // a different card opened while this was loading

    // Oct 6 2026, Larry: "Why are my initials visible on front when Team button says unassigned?"
    // The front badge shows the PRIMARY inherited from up the chain (Delegate, never abdicate);
    // this button only read the card's OWN role, so it said "unassigned" beside visible initials.
    // With no PRIMARY of its own, the button now names the inherited one, dimmed, "from above".
    // Who actually resolves as PRIMARY is untouched -- this only reads the same resolver the badge uses.
    async function paint(){
      await window.T2TBriefingBoard.paintPrimaryTrigger(trigger, currentUid);
      trigger.style.opacity='';
      if(currentUid) return;
      try{
        await _sboardEnsureEffectivePrimaryRaw('idea', [item.id]);
        if(_sboardActiveId!==item.id) return;
        var inh=_sboardEffectivePrimaryUidRaw('idea', item.id);
        var nm=inh && _sboardAssignedCache[inh] && _sboardAssignedCache[inh].name;
        if(inh && nm){
          trigger.classList.add('bb-view-on');
          trigger.style.opacity='.6';
          trigger.title='PRIMARY: '+nm+', from above';
          trigger.setAttribute('aria-label','PRIMARY — '+nm+', from above — click to choose one for this card');
        }
      }catch(e){}
    }
    await paint();

    // Eye in the TEAM list the head button opens (Larry, Oct 6 2026): show this card's PRIMARY initials on the front,
    // or keep them back-only. Same switch as the Call Sheet's initials ON/OFF (ideas.show_primary_badge: a member's opt-in; the default is no initials on the front).
    function boardInitialsOff(){
      var pr=(typeof _sboardCurrentProjectRow==='function') ? _sboardCurrentProjectRow() : null;
      return !!(pr && pr.hide_all_initials);
    }
    async function toggleFront(){
      var wantShow=!(item.show_primary_badge && !boardInitialsOff());
      if(!sb) return;
      try{
        if(wantShow && boardInitialsOff()) await _sboardSetHideAllInitials(false);
        var upd=await sb.from('ideas').update({show_primary_badge:wantShow}).eq('id', item.id);
        if(upd.error){ _sboardShowToast('Could not change that.'); return; }
        item.show_primary_badge=wantShow;
        _sboardPatchRow(item.id, {show_primary_badge:wantShow});
        renderSeaBoard(true);
      }catch(err){ console.error('Idea card: could not change initials visibility', err); }
    }

    function openMenu(){
      var projectRow=(typeof _sboardCurrentProjectRow==='function') ? _sboardCurrentProjectRow() : null;
      window.T2TBriefingBoard.openCastPickMenu(menu, trigger, {
        level: projectRow ? projectRow.id : null,   // project-level Cast, same ambient lookup the New Card popup uses
        selectedUid: currentUid,
        frontEye: {
          isOn: function(){ return !!item.show_primary_badge && !boardInitialsOff(); },
          tip: function(on){ return boardInitialsOff() ? 'Initials are off for this whole board — click to show them on this card' : (on ? 'PRIMARY initials: shown on the front — click for back only' : 'PRIMARY initials: back only — click to show on the front'); },
          onToggle: toggleFront
        },
        onPick: async function(person){
          if(_sboardActiveId!==item.id) return;
          if(!window.T2TStoryboard || typeof window.T2TStoryboard.assignPrimaryDirect!=='function') return;
          var res=await window.T2TStoryboard.assignPrimaryDirect(item, 'idea', person.user_id, {fromAbove:!!person.fromAbove});
          if(!res || !res.ok){ _sboardShowToast((res&&res.msg)||'Could not assign PRIMARY.'); return; }
          currentUid=person.user_id;
          await paint();
          renderSeaBoard(true);
        }
      });
    }
    trigger.onclick=function(e){
      e.stopPropagation();
      var willOpen=menu.hidden;
      _sboardCloseAllDropdowns(willOpen?'sb-primary-menu':null);
      if(willOpen) openMenu(); else menu.hidden=true;
    };
  }

  // Traveler color-options shortcut -- opens the normal DETAILS back but
  // auto-expands the swatch row so a double-click lands directly on color
  // choices instead of requiring an extra tap on the Appearance gear.
  function openSbDetailToColor(item){
    openSbDetail(item);
    // Sept 30 2026 (Larry: "Gear default is to show color options on headers. Make it not the default -- open gear to find colors"):
    // a header opens with the gear closed; the gear opens the colors. Other cards keep the double-click-to-colors shortcut.
    if(item && item.content_type==='header') return;
    // Oct 7 2026 (Larry: "color choice on the back of an image card has no meaning. default should be not visible"): a picture with no Subject
    // is shown bare -- there is no card to color -- so its back opens with the gear closed, like a header's.
    if(item && item.content_type==='image' && !String(item.subject||'').trim()) return;
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
        +'<span style="display:inline-block;width:12px;height:12px;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>'+T2TFlagCounts.badgeDark(T2TFlagCounts.count(item,keys[i]))+'</button>';
    }
    var _gemN=T2TFlagCounts.count(item,'gem');
    if(_gemN>0) html += '<button class="sb-notes-pill sb-gem-pill-btn" title="Important (gem)">'+T2TFlagCounts.gemIcon(14)+(_gemN>=2?' '+_gemN:'')+'</button>';
    if(true){
      // Classic (+), Aug 7 2026 (Larry) -- swapped out the "🔑 +" pill for
      // the same dashed-circle plus every other [+] add control on the
      // board already uses (see .sc-add-subber-tile), just sized to sit
      // level with the heart pill and flag badges in this row.
      html += '<button class="sb-flag-add-btn sb-key-slot-btn" data-slot="'+keys.length+'" title="Add a flag">+</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('.sb-gem-pill-btn').forEach(function(b){ b.addEventListener('click', function(){ _sboardOpenKeyPicker(item, keys.length); }); });
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
    var FC=window.T2TFlagCounts;
    // Oct 27 2026 (Larry): every flag works the same -- tap to add one, the count is the resonance. Heart and gem
    // sit on top of the custom flags; a small minus takes one away.
    function pickRow(flagKey, swatchHTML, label, n, disabled, editable){
      return '<div class="sb-key-pick-row">'
        +'<button class="sb-key-pick-select" data-flag="'+flagKey+'"'+(disabled?' disabled':'')+'>'
        +swatchHTML
        +'<span style="font-size:calc(12px * var(--fg-text-scale,1))">'+label+'</span>'
        +(n>0?'<span style="margin-left:auto;font-weight:700;font-size:calc(12px * var(--fg-text-scale,1))">&times;'+n+'</span>':'')
        +'</button>'
        +(n>0?'<button class="sb-key-pick-edit sb-flag-minus" data-flag="'+flagKey+'" title="Take one away">&minus;</button>':'')
        +(editable?'<button class="sb-key-pick-edit sb-flag-pencil" data-key-id="'+flagKey+'" title="Edit this signal flag">✏️</button>':'')
        +'</div>';
    }
    var listHTML=pickRow('heart','<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS('heart','#a3372b')+'"></span>','I like this!',FC.count(item,'heart'),false,false)
      +pickRow('gem','<span style="display:inline-block;width:16px;flex-shrink:0;text-align:center;line-height:16px">'+T2TFlagCounts.gemIcon(16)+'</span>','This is important!',FC.count(item,'gem'),false,false);
    listHTML+=_sboardKeyLib.map(function(k){
      var onCard=keys.indexOf(k.id)>=0;
      return pickRow(k.id,'<span style="display:inline-block;width:16px;height:16px;flex-shrink:0;'+_sboardKeyShapeCSS(k.shape,k.color)+'"></span>',_sboardEsc(k.meaning||''),onCard?FC.count(item,k.id):0,(!onCard && keys.length>=MAX_KEYS_PER_CARD),true);
    }).join('');
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(15px * var(--fg-text-scale,1));color:#1a3a5c;font-weight:700;margin-bottom:6px">Choose a Signal Flag</div>'
      +'<div style="font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:6px">Tap a flag to add one. More means more.</div>'
      +'<div style="max-height:260px;overflow-y:auto;margin-bottom:8px">'+listHTML+'</div>'
      +'<button class="sc-ov-btn save" id="sb-key-build-new" style="width:100%;margin-bottom:6px"'+(_sboardKeyLib.length>=MAX_KEY_LIBRARY?' disabled':'')+'>+ Build a new signal flag</button>'
      +'<button class="sc-ov-btn" id="sb-key-cancel" style="width:100%">Done</button>'
      +'</div>';
    ov.classList.add('active');
    ov.querySelectorAll('.sb-key-pick-select').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(btn.hasAttribute('disabled')) return;
        _sboardAdjustFlag(item, btn.getAttribute('data-flag'), 1);
      });
    });
    ov.querySelectorAll('.sb-flag-minus').forEach(function(btn){
      btn.addEventListener('click', function(){ _sboardAdjustFlag(item, btn.getAttribute('data-flag'), -1); });
    });
    ov.querySelectorAll('.sb-flag-pencil').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key=_sboardKeyById(btn.getAttribute('data-key-id'));
        if(key) _sboardOpenKeyBuilder(function(){ _sboardOpenKeyPicker(item, slotIndex); renderSeaBoard(true); }, key);
      });
    });
    T().wire('sb-key-build-new', function(){ _sboardOpenKeyBuilder(function(newKey){ _sboardAdjustFlag(item, newKey.id, 1); }); });
    T().wire('sb-key-cancel', function(){ openSbDetail(item); });
  }

  // Adds or takes away ONE of a flag (heart, gem or a custom flag) -- Oct 27 2026. A custom flag joins the card's
  // flag list on its first one and leaves it when the count reaches zero (links between cards that share it follow).
  async function _sboardAdjustFlag(item, flagKey, delta){
    var FC=window.T2TFlagCounts, sb=T().sb;
    var cached=_sboardAllRowsById[item.id];
    try{
      if(flagKey==='heart' || flagKey==='gem'){
        await FC.adjust(sb, item, flagKey, delta);
      } else {
        var keys=_sboardItemKeys(item);
        var onCard=keys.indexOf(flagKey)>=0;
        if(!onCard){
          if(delta<0 || keys.length>=MAX_KEYS_PER_CARD) return;
          keys.push(flagKey);
          await _sboardWriteItemKeys(item.id, keys);
          item.key_slot_1=keys[0]||null; item.key_slot_2=keys[1]||null; item.key_slot_3=keys[2]||null;
          await FC.adjust(sb, item, flagKey, 0);
        } else {
          var n=await FC.adjust(sb, item, flagKey, delta);
          if(n===0){
            keys.splice(keys.indexOf(flagKey),1);
            await _sboardWriteItemKeys(item.id, keys);
            item.key_slot_1=keys[0]||null; item.key_slot_2=keys[1]||null; item.key_slot_3=keys[2]||null;
          }
        }
      }
    }catch(err){ console.error('Signal Flags: could not change count', err); }
    if(cached && cached!==item){ cached.heart_count=item.heart_count; cached.is_gem=item.is_gem; cached.flag_counts=item.flag_counts; cached.key_slot_1=item.key_slot_1; cached.key_slot_2=item.key_slot_2; cached.key_slot_3=item.key_slot_3; }
    renderSeaBoard(true);
    _sboardOpenKeyPicker(item, 0);
    if(flagKey!=='heart' && flagKey!=='gem') _sboardSyncKeyLinks(flagKey);
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
      var _reserved = window.T2TAlignFlags ? T2TAlignFlags.reservedReason(_sboardKeyDraft.shape, _sboardKeyDraft.color) : '';
      if(_reserved){ window.alert(_reserved); return; }
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
      if(e.target.closest('#sb-close, .bb-icon-btn, .bb-cdrop-menu')) return;
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

  // Oct 25 2026 (Larry: "Click outside card should = enter to save text"): leaving a new card with text typed in runs the SAME save Enter runs
  // (the Contents editor's save button), then closes -- one save path, not a second copy of it. Enter keeps going to a fresh card; leaving closes.
  var _sbSavingOnClose=false, _sbCloseBypass=false, _sbBlurSaving=false;
  function closeSbDetail(){
    // The New header box: a name that was typed is made (same as Enter) before the box closes; if it cannot be saved the box stays open.
    if(!_sbCloseBypass){
      var _ahi=document.getElementById('sb-addheader-input');
      if(_ahi && String(_ahi.value||'').trim() && typeof window._sboardAddHeaderPromptSave==='function'){
        var _ahSave=window._sboardAddHeaderPromptSave; window._sboardAddHeaderPromptSave=null;
        Promise.resolve(_ahSave()).then(function(ok){
          if(ok===false){ window._sboardAddHeaderPromptSave=_ahSave; return; }   // could not save: leave the box open with its message
          _ahi.value=''; _sbCloseBypass=true; try{ closeSbDetail(); }finally{ _sbCloseBypass=false; }
        });
        return;
      }
    }
    if(!_sbCloseBypass && !_sbSavingOnClose){
      try{
        var _ta0=document.getElementById('sb-text-input'), _sv0=document.getElementById('sb-text-save');
        if(_sboardActiveId && _ta0 && _sv0 && String(_ta0.value||'').trim() && window.FGNewCardDoor && FGNewCardDoor.isPending && FGNewCardDoor.isPending(_sboardActiveId)){
          _sbSavingOnClose=true; _sv0.click(); return;
        }
      }catch(e){ _sbSavingOnClose=false; }
    }
    var _sbClosedId=_sboardActiveId;   // Oct 25 2026: the new-card door removes a card closed while still empty (new-card-door.js)
    var _sbTypedAtClose='';
    // Oct 25 2026 (Larry: keep the entry screen open until clicked outside) -- clicking outside is how an entry ends, so whatever is typed in a
    // new card's Contents is kept, not lost.
    try{
      var _ta=document.getElementById('sb-text-input');
      if(_sbClosedId && _ta && String(_ta.value||'').trim() && window.FGNewCardDoor && FGNewCardDoor.isPending && FGNewCardDoor.isPending(_sbClosedId)){
        var _typed=_ta.value.trim(); _sbTypedAtClose=_typed;
        Promise.resolve(FGNewCardDoor.whenReady ? FGNewCardDoor.whenReady(_sbClosedId) : true).then(function(){ return T().sb.from('ideas').update({text_content:_typed}).eq('id',_sbClosedId); }).then(function(r){
          if(r && r.error) return;
          _sboardPatchRow(_sbClosedId,{text_content:_typed});
          try{ renderSeaBoard(true); }catch(e){}
        });
      }
    }catch(e){}
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
    if(_sbClosedId && window.FGNewCardDoor) window.FGNewCardDoor.backClosed(_sbClosedId, _sbTypedAtClose);
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

