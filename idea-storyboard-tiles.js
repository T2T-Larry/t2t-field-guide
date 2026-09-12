/* ============================================================
   idea-storyboard-tiles.js -- T2T Field Guide - IDEA STORYBOARD (9710)
   CARD TILES. Building the individual card tiles shown on the board (including header-stack tiles and the "+" add-header/add-subber tiles), the color palette and Plan-card verb-completion coloring, order badges, and font-fit sizing.

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

  var _sboardColorPalette = ['#d6eaf8','#d9f2e6','#fdf3d0','#f8d9e3','#e6d9f2','#fbe3d0','#d0f2ec','#f0ebe0'];
  // PLAN board: cards with no verb in their text get force-pinked at
  // duplicate time, Aug 26 2026 (Larry). Reuses the existing rose swatch
  // above (index 3, '#f8d9e3') rather than a new one-off color, so it
  // still reads as a normal pick if Larry later opens that card's own
  // color swatches.
  var PLAN_NO_VERB_COLOR = '#f8d9e3';
  // Short phrases ("Call the vendor", "Follow up with Kelly"), not full
  // sentences -- this is a plain word-list heuristic, not real grammar
  // parsing. Covers auxiliaries/modals, the common irregular verbs, and
  // ~180 everyday task/action verbs, plus regular -s/-es/-ed/-ing
  // inflections handled by _planStemsFor below (including the doubled-
  // consonant case: "planning"/"planned" -> "plan"). Good enough to flag
  // a plainly noun-only idea ("Budget", "Team photo") without false-
  // flagging the vast majority of real task phrasing.
  var _planVerbSet = (function(){
    var words = ('is am are was were be been being has have had do does did '
      +'will would can could shall should may might must '
      +'go went gone come came make made say said get got gotten give gave given '
      +'take took taken find found think thought bring brought buy bought catch caught '
      +'teach taught sell sold tell told send sent spend spent build built begin began begun '
      +'break broke broken choose chose chosen draw drew drawn drive drove driven eat ate eaten '
      +'fall fell fallen fly flew flown forget forgot forgotten grow grew grown know knew known '
      +'throw threw thrown wear wore worn win won write wrote written see saw seen hear heard '
      +'keep kept leave left meet met pay paid run ran sit sat speak spoke spoken stand stood '
      +'understand understood hold held lead led feel felt lend lent lose lost mean meant '
      +'put let cut hit shut read set '
      +'plan build write create design develop review test fix update launch ship publish send '
      +'email call schedule meet discuss decide research investigate analyze draft edit revise '
      +'finalize approve submit present prepare organize coordinate contact check verify confirm '
      +'cancel book order purchase invoice budget hire interview train learn listen watch record '
      +'upload download backup deploy configure install setup migrate integrate automate monitor '
      +'track measure evaluate assess audit document outline brainstorm sketch prototype code '
      +'program debug release market promote advertise post share distribute print mail deliver '
      +'sort file archive delete remove add insert upgrade downgrade renew register sign apply '
      +'request ask answer respond reply comment note gather collect compile summarize report '
      +'pitch sell negotiate close open start finish complete stop pause resume continue wait '
      +'maintain repair clean declutter label tag categorize rename move relocate transfer copy '
      +'duplicate merge combine split divide separate join connect link attach detach uninstall '
      +'enable disable activate deactivate lock unlock secure protect restore recover resolve '
      +'solve address handle manage oversee supervise lead guide mentor coach support help assist '
      +'empower encourage motivate celebrate recognize thank acknowledge welcome greet introduce '
      +'onboard transition adjust adapt modify change alter tweak refine polish improve enhance '
      +'optimize streamline simplify clarify explain define describe demonstrate show display '
      +'highlight remind notify alert inform brief sync align collaborate delegate assign allocate '
      +'prioritize rank reserve forecast estimate fund invest save spend benchmark compare iterate '
      +'rewrite practice rehearse perform execute implement enforce comply follow commit promise '
      +'choose select pick vote reject decline postpone reschedule delay visit travel drive walk '
      +'cook wash paint film shoot mix draft').split(/\s+/);
    var set={}; words.forEach(function(w){ if(w) set[w]=true; });
    return set;
  })();
  function _planStemsFor(w){
    var stems=[];
    if(/ing$/.test(w)){
      var b1=w.slice(0,-3);
      stems.push(b1, b1+'e');
      if(b1.length>2 && b1[b1.length-1]===b1[b1.length-2]) stems.push(b1.slice(0,-1));
    }
    if(/ed$/.test(w)){
      var b2=w.slice(0,-2), b3=w.slice(0,-1);
      stems.push(b2, b3);
      if(b2.length>2 && b2[b2.length-1]===b2[b2.length-2]) stems.push(b2.slice(0,-1));
    }
    if(/ies$/.test(w)) stems.push(w.slice(0,-3)+'y');
    else if(/es$/.test(w)) stems.push(w.slice(0,-2));
    if(/s$/.test(w) && w.length>3) stems.push(w.slice(0,-1));
    return stems;
  }
  function _planCardHasVerb(text){
    if(!text) return false;
    var words=String(text).toLowerCase().replace(/[^a-z\s'-]/g,' ').split(/\s+/).filter(Boolean);
    for(var i=0;i<words.length;i++){
      var w=words[i];
      if(_planVerbSet[w]) return true;
      var stems=_planStemsFor(w);
      for(var j=0;j<stems.length;j++){ if(_planVerbSet[stems[j]]) return true; }
    }
    return false;
  }
  function _sboardOrderBadgeHTML(orderedIds, itemId){
    var idx=-1;
    for(var i=0;i<orderedIds.length;i++){ if(String(orderedIds[i])===String(itemId)){ idx=i; break; } }
    return idx===-1 ? '' : '<div class="sb-order-badge">'+(idx+1)+'</div>';
  }

  // maxWidthPx is the real available width inside the tile (tile width
  // minus its own left+right padding) -- Aug 18 2026: swapped the old
  // character-count guess for FGFitFontSize's real per-word measurement,
  // so a tile actually checks whether ITS longest word fits, not just how
  // long the whole label is. word-break:break-word stays as the fallback
  // wherever this is used, for the rare word that's too wide even at the
  // floor size.
  //
  // Aug 20 2026 -- two fixes, both from Larry hitting live cases the Aug
  // 18 version missed:
  // 1. This used to Math.round() the size FGFitFontSize returned. That
  //    fit size is already exactly as large as it can be while still
  //    fitting -- rounding it UP (JS rounds .5 up) could push the actual
  //    rendered width back past the box edge by a hair, which was enough
  //    for "Performance"/"Appreciation" etc. to split again despite the
  //    fit logic having done its job correctly. Dropped the rounding --
  //    fractional px font-size is fine, and FGFitFontSize's own built-in
  //    safety margin covers the rest.
  // 2. Optional maxHeightPx/lineHeight (5th/6th args) let a caller that
  //    knows its box's real height also guard against a short-worded but
  //    long sentence wrapping to more lines than the box is tall for --
  //    see FGFitFontSize's own comment for why that's a separate check
  //    from the per-word width one this function already did.
  function _sboardFitFontSize(text, base, min, maxWidthPx, maxHeightPx, lineHeight, oneLine){
    if(!maxWidthPx){
      var len=(text||'').length;
      if(len<=14) return base;
      var reduced=base-Math.floor((len-14)/5);
      return Math.max(min, reduced);
    }
    // Root cause of words still splitting after every earlier "fixed the
    // floor/rounding" pass (Aug 18-21), found Aug 28 2026: this measured
    // against the browser's generic fallback 'serif' (Times New Roman on
    // most systems), but every tile this function sizes actually renders
    // in 'Playfair Display' (inherited from #fg-root/.fg's own font-
    // family, set in index.html -- no tile ever overrides it, this file's
    // "hd" header pill even says font-family:inherit explicitly). Playfair
    // Display's letterforms run wider than generic serif at the same
    // point size, so the canvas measurement was quietly finding a size
    // that "fit" in the WRONG font, then the real DOM text -- rendered in
    // the RIGHT font -- was still too wide and fell through to
    // word-break:break-word anyway, no matter how low the floor went.
    // Matches the font stack Briefing Board's own caller already gets
    // right by reading getComputedStyle(el).fontFamily (see
    // briefing-board.js) -- this file's tiles are built and measured
    // before they're in the DOM, so there's no live computed style to
    // read; the site only ever uses one board font, so naming it directly
    // is exact rather than a guess.
    return window.FGFitFontSize(text, maxWidthPx, {base:base, min:min, step:0.5, fontFamily:'\'Playfair Display\',Georgia,serif', fontWeight:'400', maxHeightPx:maxHeightPx, lineHeight:lineHeight, oneLine:!!oneLine});
  }

  function _sboardHeartsHTML(count){
    if(!count) return '';
    var shown=Math.min(count,8), s='';
    for(var i=0;i<shown;i++) s+='❤️';
    if(count>8) s+=' +'+(count-8);
    return s;
  }

  function _sboardMakeRoleShortcutTile(entry, width, height){
    var tile=document.createElement('button');
    tile.type='button';
    tile.className='sc-pill named';
    tile.style.cssText='position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;width:'+width+'px;height:'+height+'px;box-sizing:border-box;padding:6px 10px;font-family:inherit;font-weight:400;cursor:pointer;text-align:center;white-space:normal;word-break:break-word;line-height:1.2;border-radius:0'+(entry.color?';background:'+entry.color:';background:#f4ede0')+';border:1px dashed #b89968';
    var ownerLine=entry.ownerName?('👤 '+entry.ownerName):(entry.ownerInitials?('👤 '+entry.ownerInitials):'👤 —');
    var star=entry.isPrimaryStakeholder?'★ ':'';
    tile.innerHTML='<div style="font-size:calc(8px * var(--fg-text-scale,1));letter-spacing:1px;text-transform:uppercase;color:#7a6040;margin-bottom:3px">'+star+ownerLine+'</div>'
      +'<div style="font-size:calc(13px * var(--fg-text-scale,1));color:#1a3a5c">'+(entry.text||'(untitled)')+'</div>';
    tile.title=entry.isDelegatedTopic?'Delegated TOPIC — owned by '+(entry.ownerName||'another traveler'):'Owned by '+(entry.ownerName||'another traveler');
    tile.addEventListener('click', function(e){
      e.stopPropagation();
      _sboardDrillInto({id:entry.id});
    });
    return tile;
  }

  function _sboardMakeTile(item, width, straight, groupParentId, height){
    width=width||70;
    height=height||width;
    var rot=straight?0:(Math.random()*8-4).toFixed(1);
    var tile=document.createElement('div');
    tile.className='sc-tile'+(item.content_type==='text'?' text':'')+(String(_sboardSelectedHeaderId)===String(item.id)?' sb-kbd-selected':'');
    tile.setAttribute('data-idea-id', String(item.id));
    // Also tagged data-header-id, Aug 22 2026 fix (Larry: "click ctrl-down
    // does not seem to be working") -- every OTHER selectable card
    // (Header/Subheader tiles, the TOPIC box) is looked up by this
    // attribute when clearing the previous selection's highlight (see
    // _sboardClearHeaderSelection and the click handlers below). Plain
    // idea-card tiles never got a click listener that sets
    // _sboardSelectedHeaderId at all, so Ctrl+Down/Up had nothing to act
    // on for the single most common card type on the board -- selecting a
    // Header/Subheader/TOPIC worked exactly as designed, it was only
    // plain cards that silently did nothing. Reusing the same attribute
    // name (rather than teaching the lookup a second attribute) keeps
    // this a one-spot fix.
    tile.setAttribute('data-header-id', String(item.id));
    // Locked no longer blocks dragging, Aug 25 2026 (Larry: "allow all
    // Idea Cards and Briefing Cards to drag") -- Lock still keeps a
    // card's text read-only (see the sb-lock button below), but a
    // locked card can now be picked up and moved like any other.
    tile.draggable=true;
    tile.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(item.id)); });
    tile.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;border-radius:0;cursor:pointer;transform:rotate('+rot+'deg);transition:transform .15s'+(item.color?';background:'+item.color:'');
    tile.addEventListener('mouseenter', function(){ tile.style.transform='rotate(0deg) scale(1.05)'; tile.style.zIndex='10'; });
    tile.addEventListener('mouseleave', function(){ tile.style.transform='rotate('+rot+'deg)'; tile.style.zIndex='1'; });
    // Click to select this card for the Ctrl+Down/Ctrl+Up keyboard
    // shortcuts (see wireSboardUndoKeyboard) -- same pattern as the
    // Header/Subheader tile click handlers elsewhere in this file.
    // Aug 22 2026 fix (see comment on the data-header-id line above).
    tile.addEventListener('click', function(e){
      if(_sboardSelectedHeaderId===item.id) return;
      var prevId=_sboardSelectedHeaderId;
      _sboardSelectedHeaderId=item.id;
      if(prevId){
        var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
        if(prevEl) prevEl.classList.remove('sb-kbd-selected');
      }
      tile.classList.add('sb-kbd-selected');
    });
    if((item.content_type==='image'||item.content_type==='link') && item.image_url){
      var img=document.createElement('img'); img.src=item.image_url; tile.appendChild(img);
      if(item.content_type==='link'){
        var badge=document.createElement('div');
        badge.style.cssText='position:absolute;top:2px;left:20px;font-size:calc(11px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none';
        badge.textContent='\ud83d\udd17';
        tile.appendChild(badge);
      }
      // Title on the outside of an image card, Aug 12 2026 -- the text a
      // traveler typed alongside the image (text_content) was always
      // saved, just never shown on the tile face -- only the picture
      // rendered. Skipped for link cards, which already caption
      // themselves with the parsed link title below.
      if(item.content_type==='image' && item.text_content){
        var cap=document.createElement('div');
        cap.className='sc-tile-caption';
        cap.textContent=item.text_content;
        tile.appendChild(cap);
      }
    } else if(item.content_type==='link'){
      var lp=document.createElement('p');
      var lpText='\ud83d\udd17 '+T2TMedia.parseText(item.text_content).title;
      lp.textContent=lpText;
      var lpBase=Math.round((height>=60?17:14)*2/3*(window.FGTextSize&&window.FGTextSize.getMult?window.FGTextSize.getMult():1));
      // Floor lowered Aug 21 2026 (Larry: long words like "Appreciation"
      // were still splitting onto a 2nd line on these small tiles) --
      // 8px/55% wasn't always low enough to get a long single word under
      // the tile's real width, so it fell through to word-break more
      // than it should have. Letting it shrink further first keeps the
      // word intact and readable at a smaller size, which is what Larry
      // asked for over splitting it.
      lp.style.cssText='margin:0;word-break:break-word;font-size:'+_sboardFitFontSize(lpText, lpBase, Math.max(6,Math.round(lpBase*0.4)), width-16, height-12, 1.25)+'px';
      tile.appendChild(lp);
    } else {
      var p=document.createElement('p');
      var pText=item.text_content||'(untitled)';
      p.textContent=pText;
      var pBase=Math.round((height>=60?17:14)*2/3*(window.FGTextSize&&window.FGTextSize.getMult?window.FGTextSize.getMult():1));
      // Floor lowered, same reasoning as the link tile above.
      p.style.cssText='margin:0;word-break:break-word;font-size:'+_sboardFitFontSize(pText, pBase, Math.max(6,Math.round(pBase*0.4)), width-16, height-12, 1.25)+'px';
      tile.appendChild(p);
    }
    if(item.heart_count){
      var hb=document.createElement('div');
      hb.style.cssText='position:absolute;bottom:2px;right:2px;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none';
      hb.textContent = item.heart_count>=2 ? '💕' : '❤️';
      tile.appendChild(hb);
    }
    // Double-click opens the card (Aug 11 2026, Larry). Used to be a
    // second, faster way in alongside a corner-flip triangle; the
    // corner-flip was removed Sept 6 2026 (Larry: "remove the gray
    // corners flip option from all cards. Just double click to open
    // cards.") so double-click is now the only way in.
    tile.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetail(item); });
    // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
    // "remove card numbers from the front of the Idea Cards, leave on
    // back") -- the back/DETAILS view keeps its own separate ORDER
    // field (see openSbDetail's "ORDER, not RANK" block), this was just
    // the face-of-the-card duplicate. _sboardOrderBadgeHTML/
    // _sboardCardOrderByParent stay in place; they still feed that back
    // view and the other order bookkeeping this file does.
    // Reinstated on PLAN boards only, Aug 26 2026 (Larry: "put the card
    // numbers on the front of the cards," while building the PLAN
    // Storyboard) -- IDEA boards are untouched, still back-only per the
    // Aug 20 decision above.
    if(_sboardIsPlanBoard){
      tile.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardCardOrderByParent[groupParentId]||[], item.id));
    }
    // Person Assigned badge, Aug 9 2026 -- Larry: "look like the BB card
    // with the initials on the front."
    tile.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(item));
    // Bottom-left signal cluster: Lock, Signal Flags, Notes, Link --
    // Aug 15 2026 (Larry: "is the LOCK not just another FLAG? ... all
    // signal flags are added to the lower left corner on all types of
    // boards"). Signal Flags moved here from bottom-right (was paired
    // with the heart); Lock and Link moved here from their own
    // standalone spots. One wrapped call so the whole cluster packs
    // together with no dead space for whichever of the four aren't
    // present on this particular card.
    tile.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(item, {lock:true, flags:true, notes:true, link:true}));
    // Reorder-vs-stack zoning, added July 12, 2026. The middle band of the
    // tile nests (stacks the dragged card under this one, promoting this
    // one to a header if it wasn't already — same "first card placed stays
    // the header" rule CLUSTER already uses). The top/bottom edges keep the
    // plain reorder/move behavior that was already here. Splitting the same
    // drop target into zones, rather than adding new DOM between tiles,
    // resolves the reorder-vs-nest ambiguity flagged July 7 without
    // restructuring the column layout.
    //
    // Colors/weight, Aug 16 2026 -- Larry: "make slot availability more
    // obvious" when moving a card, then "bright green is fine but can it
    // be larger?" as a same-day follow-up. This target was still on the
    // original thin blue (#5b9bd5) cue from July 12 -- the same header
    // drop zones got upgraded to a thicker bright green on Aug 3 (Larry,
    // then: blue "didn't read as a go/no-go signal," green is the
    // conventional "safe to let go" color), but that fix never made it
    // back to plain card tiles. Sized well past that first pass now:
    // insert lines are a 7px inset border, nest zone is a 5px outline plus
    // an 11px soft green halo (box-shadow glow) around the whole card so
    // the valid-nest target reads as a clearly highlighted slot on a busy
    // board, not a thin ring. dragleave restores the tile's real resting
    // shadow (.sc-tile's own 0 3px 10px) instead of dropping it to 'none'.
    tile.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      if(frac<0.3){ tile.style.outline='none'; tile.style.boxShadow='inset 0 7px 0 0 #22c55e'; }
      else if(frac>0.7){ tile.style.outline='none'; tile.style.boxShadow='inset 0 -7px 0 0 #22c55e'; }
      else { tile.style.outline='5px solid #22c55e'; tile.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)'; }
    });
    tile.addEventListener('dragleave', function(){ tile.style.outline='none'; tile.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; });
    tile.addEventListener('drop', function(e){
      e.preventDefault();
      var rect=tile.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      tile.style.outline='none'; tile.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)';
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw || raw==='sb-goup') return;
      var parentId=groupParentId!==undefined?groupParentId:(item.cluster_id||null);
      if(raw.indexOf('header:')===0){
        // A Subber dropped onto a plain card -- Aug 22 2026 (Larry: "sub-
        // headers always cluster to the top... I want to mix them into
        // the story"). Used to be silently ignored (this whole branch
        // didn't exist -- a dragged Subber over a plain-card tile just
        // did nothing on drop). Always a sibling reorder here, never the
        // middle "stack into a header" zone plain-idea-on-idea gets --
        // that zone specifically converts the TARGET card into a brand
        // new header, which isn't what dragging an EXISTING Subber onto
        // it should trigger. (Nesting a Subber under another header is a
        // perfectly normal move elsewhere -- Larry corrected an earlier,
        // wrong pass here that treated it as something to avoid -- it's
        // just not what this particular gesture is for.) So this simply
        // goes by which half of the card it landed on.
        var draggedHeaderId=raw.slice(7);
        if(String(draggedHeaderId)===String(item.id)) return;
        _sboardReorderOrMoveColumnItem(draggedHeaderId, item.id, parentId, frac>=0.5);
      } else if(frac>=0.3 && frac<=0.7){
        _sboardStackIntoHeader(raw, item);
      } else {
        _sboardReorderOrMoveColumnItem(raw, item.id, parentId, frac>0.7);
      }
    });
    return tile;
  }

  // Drop-to-stack — added July 12, 2026. Dropping card A onto the center of
  // card B promotes B to a header in place (if it wasn't one already) and
  // moves A underneath it — same rule already locked for CLUSTER's own
  // stacking gesture ("the first card placed stays the header, never the
  // most recently added"), now reachable directly on the main board via the
  // tile's own center zone instead of only inside CLUSTER view.
  async function _sboardStackIntoHeader(draggedId, targetItem){
    if(String(draggedId)===String(targetItem.id)) return;
    if(targetItem.locked) return;
    var _sb=T().sb;
    var statusEl=document.getElementById('sc-status');
    try{
      if(targetItem.content_type!=='header'){
        var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id',targetItem.id);
        if(upd.error) throw upd.error;
      }
      await _sboardMoveCard(draggedId, targetItem.id);
    }catch(err){
      if(statusEl){ statusEl.textContent=err.message; statusEl.classList.add('err'); }
    }
  }

  function _sboardMakeHeaderStackTile(headerRow, width, height, straight){
    width=width||70;
    height=height||width;
    var _stMult=(window.FGTextSize && window.FGTextSize.getMult) ? window.FGTextSize.getMult() : 1;
    var rot=straight?0:(Math.random()*6-3).toFixed(1);
    var wrap=document.createElement('div');
    wrap.className='sc-stack-tile'+(String(_sboardSelectedHeaderId)===String(headerRow.id)?' sb-kbd-selected':'');
    wrap.setAttribute('data-header-id', String(headerRow.id));
    // Locked no longer blocks dragging, Aug 25 2026 -- see the matching
    // note on _sboardMakeTile above.
    wrap.draggable=true;
    wrap.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain','header:'+headerRow.id); _sboardDraggingHeaderId=headerRow.id; });
    wrap.addEventListener('dragend', function(){ _sboardDraggingHeaderId=null; });
    wrap.style.cssText='position:relative;flex-shrink:0;width:'+width+'px;height:'+height+'px;cursor:pointer;transform:rotate('+rot+'deg)';
    var bg=headerRow.color||'#fff';
    var back2=document.createElement('div');
    back2.className='sc-stack-layer';
    back2.style.cssText='position:absolute;top:5px;left:5px;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0';
    var back1=document.createElement('div');
    back1.className='sc-stack-layer';
    back1.style.cssText='position:absolute;top:2.5px;left:2.5px;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0';
    var front=document.createElement('div');
    front.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:'+bg+';border:2px solid #1a3a5c;border-radius:0;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;padding:5px;box-sizing:border-box;text-align:center;overflow:hidden';
    var p=document.createElement('p');
    p.textContent=headerRow.text_content||'(untitled)';
    // Floor lowered Aug 21 2026, same reasoning as the idea/link tiles --
    // a long single word (a Subber name) shrinking further beats it
    // wrapping in this small, fixed, overflow-hidden card.
    var fitSize=_sboardFitFontSize(headerRow.text_content, Math.round((height>=60?17:14)*_stMult), Math.max(6,Math.round(8*_stMult)), width-18, height-14, 1.15);
    p.style.cssText='margin:0;font-weight:400;line-height:1.15;color:#1a3a5c;white-space:normal;word-break:break-word;font-size:'+fitSize+'px';
    front.appendChild(p);
    // Lock badge moved to the bottom-left signal cluster below, Aug 15
    // 2026 (Larry: "is the LOCK not just another FLAG?") -- was a
    // standalone top-right icon.
    wrap.appendChild(back2); wrap.appendChild(back1); wrap.appendChild(front);
    // ORDER # badge removed from the card front, Aug 20 2026 (Larry:
    // "remove card numbers from the front of the Idea Cards, leave on
    // back") -- see the matching note on the plain-card tile above.
    // Reinstated on PLAN boards only, Aug 26 2026 (Session 251, Larry:
    // "every card is a step in a PLAN, including headers and
    // sub-headers" / "every card needs a number on a planning board")
    // -- Subbers/sub-headers only got this on the plain-card tile and
    // the top-level column pill (hd, below); this stack tile was the
    // one path still missing it. Reads its own position from
    // headerRow.cluster_id, the same combined order its parent column
    // just computed in renderGroup (subs and cards share one sequence
    // as of Aug 22 2026), so a Subber's number matches its place in
    // that same interleaved order, not a Subbers-only count.
    if(_sboardIsPlanBoard){
      front.insertAdjacentHTML('beforeend', _sboardOrderBadgeHTML(_sboardCardOrderByParent[headerRow.cluster_id]||[], headerRow.id));
    }
    front.insertAdjacentHTML('beforeend', _sboardAssignedBadgeHTML(headerRow));
    // Bottom-left signal cluster: Lock, Signal Flags, Notes -- same
    // order and reasoning as the plain-card tile above (no Link here,
    // matching this tile's behavior before the Aug 15 2026 refactor).
    front.insertAdjacentHTML('beforeend', _sboardSignalRowHTML(headerRow, {lock:true, flags:true, notes:true}));
    // Double-click a HEADER or sub-header card to drill into it — that
    // card becomes the new TOPIC. Locked July 16, 2026.
    // Drilling in is now done by dragging this card onto the TOPIC box
    // (locked July 27, 2026, replacing double-click so double-click can
    // mean color everywhere with zero header exceptions). Double-click
    // opens the card straight to its color options, same as every other
    // card, and is now the only way to open this card -- the corner-flip
    // triangle that used to sit alongside it was removed Sept 6 2026
    // (Larry: "remove the gray corners flip option from all cards. Just
    // double click to open cards.").
    wrap.addEventListener('dblclick', function(e){ e.stopPropagation(); openSbDetailToColor(headerRow); });
    // Click to select this Subber for the Tab/Shift+Tab and
    // Ctrl+Down/Ctrl+Up keyboard shortcuts (see wireSboardUndoKeyboard).
    // Aug 20 2026 (Larry: MOVE vs VIEW shortcuts).
    wrap.addEventListener('click', function(e){
      if(_sboardSelectedHeaderId===headerRow.id) return;
      var prevId=_sboardSelectedHeaderId;
      _sboardSelectedHeaderId=headerRow.id;
      if(prevId){
        var prevEl=document.querySelector('[data-header-id="'+CSS.escape(String(prevId))+'"]');
        if(prevEl) prevEl.classList.remove('sb-kbd-selected');
      }
      wrap.classList.add('sb-kbd-selected');
    });
    // Click-and-hold a sub-header to peek at its subber cards, Aug 11 2026
    // (Larry) -- reuses openSbHeaderPeek, the same grid view CLUSTER's
    // bucket pill already opens on a plain click, so there's no new screen
    // to build, just a second doorway into it. Same 550ms hold threshold
    // as the heart-pill tap/hold pattern below, so the two "hold to do
    // something different" gestures on this board feel consistent. A
    // short click/tap still does nothing dedicated here (double-click
    // opens the back, to color) -- this is purely additive.
    var stackHoldTimer=null;
    function stackStartHold(e){
      if(e && e.type==='mousedown' && e.button!==0) return;
      clearTimeout(stackHoldTimer);
      stackHoldTimer=setTimeout(function(){ openSbHeaderPeek(headerRow); }, 550);
    }
    function stackCancelHold(){ clearTimeout(stackHoldTimer); }
    wrap.addEventListener('mousedown', stackStartHold);
    wrap.addEventListener('touchstart', stackStartHold);
    wrap.addEventListener('mouseup', stackCancelHold);
    wrap.addEventListener('mouseleave', stackCancelHold);
    wrap.addEventListener('touchend', stackCancelHold);
    wrap.addEventListener('touchmove', stackCancelHold);
    wrap.addEventListener('dragstart', stackCancelHold);
    // Reorder/move/bucket zoning, Aug 3 2026, reworked Aug 22 2026 (Larry:
    // "Sub-headers are still buckets. Dropping a card into a sub-header
    // should still be possible") -- Subbers are real containers, same as
    // any Header: a card filed under one is meant to be found by drilling
    // into that Subber (making it the Topic), not by staying on this
    // board and expecting it to show as a tile here. That's how the
    // Topic/Header/Subber system already works everywhere else (see
    // Ctrl+Up/Ctrl+Down), not a trap. So this now gets the SAME 3-zone
    // split the plain idea tile already uses (top/bottom edge = reorder,
    // middle = bucket) instead of the top/bottom-half-only split a
    // same-day-earlier pass had narrowed it to:
    //  - top/bottom edge: sibling reorder, same as before -- the dropped
    //    card or Subber lands right next to this Subber, in this same
    //    visible column.
    //  - middle: a plain card files IN UNDER this Subber (the restored
    //    "bucket" gesture); a Subber dropped in the middle of another
    //    Subber just reorders too (no drag gesture nests one Subber
    //    under another -- that stays Tab/Shift+Tab/DETAILS-panel-only).
    // Colors/weight, Aug 16 2026 -- Larry: "make slot availability more
    // obvious." Matches the same green/thicker upgrade applied to the
    // plain idea tile's own drop zones the same day (was thin blue,
    // matching what the header drop zones moved off of back on Aug 3).
    wrap.addEventListener('dragover', function(e){
      e.preventDefault();
      var rect=wrap.getBoundingClientRect();
      var frac=rect.height?(e.clientY-rect.top)/rect.height:0.5;
      if(frac<0.3){ front.style.outline='none'; front.style.boxShadow='inset 0 7px 0 0 #22c55e'; wrap._dropSide='before'; }
      else if(frac>0.7){ front.style.outline='none'; front.style.boxShadow='inset 0 -7px 0 0 #22c55e'; wrap._dropSide='after'; }
      else { front.style.outline='5px solid #22c55e'; front.style.boxShadow='0 0 0 11px rgba(34,197,94,.28)'; wrap._dropSide='bucket'; }
    });
    wrap.addEventListener('dragleave', function(){ front.style.outline='none'; front.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'; wrap._dropSide=null; });
    wrap.addEventListener('drop', function(e){
      e.preventDefault(); front.style.outline='none'; front.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)';
      var side=wrap._dropSide||'before'; wrap._dropSide=null;
      var raw=e.dataTransfer.getData('text/plain');
      if(!raw||raw==='sb-goup') return;
      if(raw.indexOf('header:')===0){
        var draggedHeaderId=raw.slice(7);
        if(String(draggedHeaderId)===String(headerRow.id)) return;
        // No drag gesture nests one Subber under another -- a "bucket"
        // drop here just reorders (treated as 'after'), same as it did
        // before this zoning got a middle band.
        _sboardReorderOrMoveColumnItem(draggedHeaderId, headerRow.id, headerRow.cluster_id||null, side!=='before');
      } else if(side==='bucket'){
        _sboardMoveCard(raw, headerRow.id);
      } else {
        _sboardReorderOrMoveColumnItem(raw, headerRow.id, headerRow.cluster_id||null, side==='after');
      }
    });
    return wrap;
  }

  // [+] control — adds a new header at whatever board is currently open,
  // landing right where MISC sits (far right). Simpler and more direct
  // than routing through the 💡 idea-capture flow just to make a header.
  // Kept small and understated (a control, not a card) after feedback
  // that a full card-sized dashed box felt cluttered. Locked July 16, 2026.
  function _sboardMakeAddHeaderTile(width, height){
    height=height||64;
    var tile=document.createElement('button');
    tile.className='sc-add-header-tile';
    tile.title='Add a new header';
    // align-self:flex-start + a top margin sized to center the circle
    // within the header row's own height — was align-self:center, which
    // vertically centered it against the *tallest column* (i.e. down by
    // the subbers) instead of sitting level with the header cards
    // themselves. Fixed July 16, 2026.
    tile.style.cssText='flex-shrink:0;width:36px;height:36px;align-self:flex-start;margin-top:'+Math.max(0,(height-36)/2)+'px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #a9cce3;border-radius:50%;color:#5b9bd5;font-size:calc(18px * var(--fg-text-scale,1));font-weight:700;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s';
    tile.textContent='+';
    tile.addEventListener('click', function(e){ e.stopPropagation(); _sboardOpenAddHeaderPrompt(); });
    return tile;
  }

  // Saved-but-not-visible reassurance, Aug 6 2026 -- prompted by a real
  // incident: Larry added headers and a card that were genuinely saved
  // (confirmed in the database) but didn't show up on screen because
  // GitHub's own Actions/Pages service was down and couldn't ship the
  // fix that would've displayed them. From in here there's no way to
  // know WHY something didn't render -- could be that, could be a slow
  // network, could be a future bug nobody's found yet -- so this doesn't
  // try to diagnose it. It just checks, after any add finishes, whether
  // the new header or card actually landed in the DOM. If it didn't,
  // it says so plainly: saved, just not visible yet, not something you
  // did, not a sign anything's broken. Deliberately calm, not red/error
  // styled -- this is a "hang on" message, not a warning.
  function _sboardVerifyAdded(newId, label){
    if(!newId) return;
    // renderSeaBoard() hands off entirely to the Idea Session (9711)
    // screen's own ring-layout renderer when that's what's on screen --
    // a different DOM shape this check doesn't know how to read yet.
    // Skip rather than risk a false "didn't show up" there.
    var isxScreen=document.getElementById('s-idea-session');
    if(isxScreen && isxScreen.classList.contains('active')) return;
    var statusEl=document.getElementById('sc-status');
    if(!statusEl) return;
    var found=document.querySelector('[data-header-id="'+newId+'"], [data-idea-id="'+newId+'"]');
    if(!found){
      statusEl.textContent=(label||'What you just added')+' is saved safely — it just hasn\'t shown up on screen yet. That\'s not something you did, and nothing\'s broken. Give it a moment, or refresh, and it\'ll be there.';
      statusEl.className='pending';
    }
  }

  function _sboardOpenAddHeaderPrompt(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center;position:relative">'
      +'<button class="sc-ov-btn" id="sb-addheader-close" aria-label="Close" style="position:absolute;right:-4px;top:-6px;padding:2px 8px;font-size:calc(12px * var(--fg-text-scale,1));line-height:1">✕</button>'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:calc(14px * var(--fg-text-scale,1));font-weight:700;color:#1a3a5c;margin-bottom:10px">New header</div>'
      +'<input id="sb-addheader-input" type="text" placeholder="Header name…" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:calc(13px * var(--fg-text-scale,1));margin-bottom:10px;box-sizing:border-box">'
      +'<div id="sb-addheader-err" style="font-size:calc(10px * var(--fg-text-scale,1));color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="sb-addheader-go" style="flex:1">Create</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('sb-addheader-input');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    T().wire('sb-addheader-close', closeSbDetail);
    // Aug 7 2026 -- Larry filed two DOING cards after using this screen:
    // ENTER should act as Create, and Create/Save felt like it "did
    // nothing" and only Cancel actually closed the screen. Root cause of
    // the second one, confirmed live: there was no keydown handler at
    // all (so ENTER truly did nothing), and Create gave no immediate
    // feedback while the save round-tripped to the database -- a slow
    // moment looked identical to a broken button, so Larry closed it
    // himself before the save had a chance to land. Fix: ENTER now
    // triggers the same Create path, and the button visibly goes into a
    // "Saving..." state (and can't be double-clicked) the instant it's
    // pressed, so there's always something to see happening.
    // Aug 16 2026 -- Larry: ENTER (or Create) shouldn't close this
    // screen at all -- only the ✕ or clicking outside should. The old
    // behavior closed on every successful save, which meant adding
    // several headers in a row required reopening this prompt each
    // time. Now a successful save clears the field, shows a quiet
    // "Added" confirmation, and leaves the screen open so the next
    // header name can be typed and Entered right away.
    var goBtn=document.getElementById('sb-addheader-go');
    async function _sbAddHeaderGo(){
      var errEl=document.getElementById('sb-addheader-err');
      var name=((input&&input.value)||'').trim();
      if(!name){ if(errEl){ errEl.style.color='#b8562f'; errEl.textContent='Name can\'t be empty.'; } return; }
      if(goBtn){ goBtn.disabled=true; goBtn.textContent='Saving...'; }
      var _sb=T().sb;
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:T2TShared.currentTopicId||null,created_at:new Date().toISOString(),color:T().getDefaultHeaderColor()}).select().single();
        if(ins.error) throw ins.error;
        _sboardAddRow(ins.data);
        await renderSeaBoard(true);
        _sboardVerifyAdded(ins.data&&ins.data.id, 'Your new header "'+name+'"');
        if(input){ input.value=''; input.focus(); }
        if(errEl){ errEl.style.color='#3a7d3a'; errEl.textContent='Added "'+name+'" ✓'; }
        if(goBtn){ goBtn.disabled=false; goBtn.textContent='Create'; }
      }catch(err){
        if(errEl){ errEl.style.color='#b8562f'; errEl.textContent=err.message; }
        if(goBtn){ goBtn.disabled=false; goBtn.textContent='Create'; }
      }
    }
    T().wire('sb-addheader-go', _sbAddHeaderGo);
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); _sbAddHeaderGo(); }
    });
    if(input) input.addEventListener('input', function(){
      var errEl=document.getElementById('sb-addheader-err');
      if(errEl && errEl.style.color==='rgb(58, 125, 58)') errEl.textContent='';
    });
  }

  // [+] tile at the end of a header's own subber list — quick text-only
  // add, landing directly under that header. Full capture (camera/
  // paste/link) still lives behind 💡 for anything beyond plain text.
  // Locked July 16, 2026.
  // [+] control at the end of a header's own subber list — quick text-only
  // add, landing directly under that header. Full capture (camera/
  // paste/link) still lives behind 💡 for anything beyond plain text.
  // Kept small and understated, same reasoning as the header [+] above.
  // Locked July 16, 2026.
  // [+] control at the end of a header's own subber list — opens the same
  // full capture card everything else uses (camera/attach, paste,
  // link), pre-targeted at this specific header, then returns to this
  // board on save. No more separate lightweight text-only dialog — one
  // input experience everywhere. Locked July 16, 2026.
  function _sboardMakeAddSubberTile(headerId, width, height){
    var tile=document.createElement('button');
    tile.className='sc-add-subber-tile';
    tile.title='Add a new card here';
    tile.style.cssText='flex-shrink:0;width:30px;height:30px;margin:2px 0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px dashed #cfe4f2;border-radius:50%;color:#5b9bd5;font-size:calc(15px * var(--fg-text-scale,1));font-weight:700;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s';
    tile.textContent='+';
    tile.addEventListener('click', function(e){
      e.stopPropagation();
      _sboardOpenQuickCapture(headerId);
    });
    return tile;
  }

  // Opens the 1170 Idea Input card directly on top of 9710 — no navigation
  // to 9711 first, no shared state with it either. IdeaCapture doesn't
  // know or care which screen called it. Locked July 16, 2026.
  function _sboardOpenQuickCapture(headerId){
    var headerRow=_sboardHeadersById && _sboardHeadersById[headerId];
    window.IdeaCapture.open({
      headerId: headerId,
      headerLabel: headerRow ? (headerRow.text_content||'(untitled)') : 'New',
      boardId: T2TShared.currentTopicId,
      onSaved: async function(row){
        _sboardAddRow(row);
        await renderSeaBoard(true);
        _sboardVerifyAdded(row&&row.id, 'What you just added');
      }
    });
  }

