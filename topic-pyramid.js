/* ============================================================
   topic-pyramid.js -- T2T Field Guide - PROJECT PYRAMID
   Shared, board-agnostic renderer for the TOPIC hierarchy popup.

   Added Sept 20, 2026 -- Larry: single click on TOPIC is the right
   gesture (locked Sept 19, both boards), but the popup it opens --
   a flat, fully-expanded list of every header at every depth -- is
   overwhelming once TOPIC is MASTER, because that flattens every
   project's entire tree into one list at once. This replaces that
   flat list with a "pyramid": the straight line of ancestors above
   the current Topic (largest type at the root, shrinking one step
   per level -- there are no siblings in this line, just the direct
   climb up), the current Topic highlighted in the middle, and a
   collapsible, doll-in-doll tree of its descendants below (only the
   direct children show at first; each one gets its own arrow that
   opens its own children, indented and smaller again). One
   continuous size gradient top-to-bottom is what makes the whole
   thing read as a pyramid rather than three separate lists.

   Every row -- ancestor, current, or descendant, at any depth --
   carries a small checkbox-shaped mark. Larry, Sept 20 2026: it's not
   an interactive toggle with its own state, just a symbol meaning
   "this can be chosen as a topic" -- reinforcing that any level, not
   only a leaf header, is a valid pick. Choosing one is still done by
   clicking its name (onNavigate below), same single-click gesture the
   flat list already had -- the mark itself takes no click.

   This file knows nothing about Supabase, ideas.cluster_id, or
   either board's own data shape -- it only renders rows and reports
   clicks. Each board hands it plain {id,name} objects and a
   getChildren(id) function that returns a Promise of the same shape
   (idea-storyboard-navigation.js's version resolves instantly, off
   its own in-memory cache; briefing-board-master-nav.js's version
   awaits a real Supabase fetch, same as its old flat-list version
   did) -- TopicPyramid doesn't care which.

   Load this file before idea-storyboard-navigation.js and before
   briefing-board-master-nav.js (both call TopicPyramid.render).
   ============================================================ */

(function(){

  var STEP_PX = 1.3;     // font-size shrink per pyramid level
  var FLOOR_PX = 10.5;   // never shrink past this
  var BASE_PX = 15;      // root-of-pyramid font size

  function _tpFontSize(depth){
    return Math.max(FLOOR_PX, BASE_PX - depth * STEP_PX);
  }

  function _tpEnsureStyles(){
    if(document.getElementById('tp-pyramid-styles')) return;
    var css=''
      +'.tp-row{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;cursor:default}'
      +'.tp-row:hover{background:rgba(0,0,0,.05)}'
      +'.tp-check{flex:none;width:9px;height:9px;margin:0 1px;border:1.5px solid currentColor;border-radius:2px;opacity:.55;box-sizing:border-box}'
      +'.tp-arrow{flex:none;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:inherit;opacity:.7;transition:transform .15s;user-select:none}'
      +'.tp-arrow.tp-open{transform:rotate(90deg)}'
      +'.tp-arrow.tp-none{visibility:hidden;cursor:default}'
      +'.tp-label{cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.tp-current .tp-label{cursor:default;font-weight:700}'
      +'.tp-current{background:rgba(0,0,0,.08);font-weight:700}'
      +'.tp-children{margin:0}'
      +'.tp-loading{opacity:.6;font-style:italic;padding:3px 6px 3px 26px}'
      +'.tp-here{background:rgba(26,58,92,.10);border-radius:4px}'
      +'.tp-here .tp-label{font-weight:700}';
    var style=document.createElement('style');
    style.id='tp-pyramid-styles';
    style.textContent=css;
    document.head.appendChild(style);
  }

  // Builds one row (ancestor, current, or descendant). depth drives
  // font size only -- indentation is driven separately by indentPx
  // so a descendant's nested children can step in further than the
  // ancestor trail (which never indents; it's a single vertical line).
  function _tpMakeRow(node, depth, indentPx, isCurrent, opts){
    var row=document.createElement('div');
    row.className='tp-row'+(isCurrent?' tp-current':'');
    row.style.paddingLeft=(6+indentPx)+'px';
    row.style.fontSize='calc('+_tpFontSize(depth)+'px * var(--fg-text-scale,1))';

    // Sept 20 2026 -- Larry: the checkbox isn't a toggle with its own
    // state, it's just a symbol on every row (ancestor, current, or
    // descendant) marking "this can be chosen as a topic" -- picking
    // one is still done by clicking its name (onNavigate below), same
    // gesture as the flat list this replaced. A real <input> here would
    // imply a check/uncheck state that does nothing when clicked, which
    // reads as broken -- this is a plain non-interactive mark instead.
    var check=document.createElement('span');
    check.className='tp-check';
    check.setAttribute('aria-hidden','true');
    row.appendChild(check);

    var label=document.createElement('span');
    label.className='tp-label';
    label.textContent=node.name||'(untitled)';
    row.appendChild(label);

    // Sept 20 2026 -- Larry: arrow goes after the name, not before it
    // (checkbox, name, then arrow) -- matches the order he pictured.
    var arrow=document.createElement('span');
    arrow.className='tp-arrow tp-none'; // shown/armed below only for rows that may have children
    row.appendChild(arrow);

    // hereId (optional, Sept 22 2026 -- the Idea card's MOVE picker):
    // marks the row a card currently lives in, so it reads "you are here"
    // inside a tree that's otherwise all destinations.
    if(opts.hereId && String(node.id)===String(opts.hereId)){
      row.classList.add('tp-here');
      label.textContent=(node.name||'(untitled)')+'  ✓ here';
      setTimeout(function(){ try{ row.scrollIntoView({block:'nearest'}); }catch(e){} }, 0);
    }
    if(isCurrent){
      row.title=node.name||'';
    } else {
      row.title='Click to open '+(node.name||'this')+'.';
      label.addEventListener('click', function(e){
        e.stopPropagation();
        if(typeof opts.onNavigate==='function') opts.onNavigate(node.id);
      });
    }

    return {row:row, arrow:arrow};
  }

  // Renders one level of children under parentRow (a doll-in-doll
  // step: further indented, one font-size notch smaller). Lazy --
  // only fetches when the caller's arrow is actually clicked.
  function _tpWireExpand(arrowEl, parentRow, node, depth, indentPx, opts){
    var expanded=false, loaded=false, childWrap=null;
    arrowEl.classList.remove('tp-none');
    arrowEl.textContent='▸';
    arrowEl.addEventListener('click', function(e){
      e.stopPropagation();
      if(!loaded){
        loaded=true;
        childWrap=document.createElement('div');
        childWrap.className='tp-children';
        var loadingRow=document.createElement('div');
        loadingRow.className='tp-loading';
        loadingRow.textContent='Loading…';
        childWrap.appendChild(loadingRow);
        parentRow.insertAdjacentElement('afterend', childWrap);
        Promise.resolve(opts.getChildren(node.id)).then(function(kids){
          childWrap.innerHTML='';
          if(!kids || !kids.length){
            arrowEl.classList.add('tp-none');
            arrowEl.replaceWith(arrowEl.cloneNode(true)); // drop the click handler, nothing to open
            return;
          }
          kids.forEach(function(kid){
            var built=_tpMakeRow(kid, depth+1, indentPx+14, false, opts);
            childWrap.appendChild(built.row);
            _tpWireExpand(built.arrow, built.row, kid, depth+1, indentPx+14, opts);
            _tpAutoExpand(built.arrow, kid, opts);
          });
        }, function(){
          childWrap.innerHTML='<div class="tp-loading">Couldn\'t load — try again.</div>';
        });
      }
      expanded=!expanded;
      arrowEl.classList.toggle('tp-open', expanded);
      arrowEl.textContent=expanded?'▾':'▸';
      if(childWrap) childWrap.style.display=expanded?'':'none';
    });
  }

  // expandPath (optional, Sept 22 2026): ids to open automatically on
  // the way down, top level first -- lets a caller open the tree already
  // unfolded to one spot (the Idea card MOVE picker opens at the card's
  // own location). Each level opens once its parent's children arrive.
  function _tpAutoExpand(arrowEl, node, opts){
    if(!opts.expandPath || opts.expandPath.indexOf(String(node.id))===-1) return;
    // The arrow may have been cloned away (no children); only click a live one.
    if(arrowEl && arrowEl.isConnected && !arrowEl.classList.contains('tp-none')) arrowEl.click();
  }

  // opts = {
  //   ancestors: [{id,name}, ...]  -- root..parent order, current excluded
  //   current: {id,name},
  //   getChildren: function(id) -> Promise<[{id,name}]>,
  //   onNavigate: function(id),
  //   checkedIds: Set (optional, shared/persisted across opens if the caller keeps it),
  //   onCheckChange: function(id, checked)  -- optional
  // }
  function render(menuEl, opts){
    _tpEnsureStyles();
    menuEl.innerHTML='';
    opts.checkedIds=opts.checkedIds||new Set();

    (opts.ancestors||[]).forEach(function(a, i){
      var built=_tpMakeRow(a, i, 0, false, opts);
      menuEl.appendChild(built.row);
    });

    var curDepth=(opts.ancestors||[]).length;
    var curBuilt=_tpMakeRow(opts.current, curDepth, 0, true, opts);
    menuEl.appendChild(curBuilt.row);

    var loadingRow=document.createElement('div');
    loadingRow.className='tp-loading';
    loadingRow.textContent='Loading…';
    menuEl.appendChild(loadingRow);

    Promise.resolve(opts.getChildren(opts.current.id)).then(function(kids){
      loadingRow.remove();
      (kids||[]).forEach(function(kid){
        var built=_tpMakeRow(kid, curDepth+1, 14, false, opts);
        menuEl.appendChild(built.row);
        _tpWireExpand(built.arrow, built.row, kid, curDepth+1, 14, opts);
        _tpAutoExpand(built.arrow, kid, opts);
      });
    }, function(){
      loadingRow.textContent='Couldn\'t load — try again.';
    });

    return curBuilt.row; // for the caller's own scrollIntoView, same as the old flat list
  }

  window.TopicPyramid={render:render};

})();
