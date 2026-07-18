/* ============================================================
   session.js — T2T Field Guide · ISB SESSION (9711, formerly
   TOPIC IDEAS / "Idea Session", 9215).

   Split out of sea-of-ideas.js on July 17, 2026 (Session 118).
   Behavior is UNCHANGED — this is a structural split, not a rebuild.
   9711 renamed SESSION this same session (was TOPIC IDEAS) to match
   "session view" language already used on 9710.

   Loads THIRD (last) of the three ISB files — composes the final
   window.T2TSea public API (what backpack.js calls) out of pieces
   from all three files, since by load time T2TShared, T2TMedia, and
   T2TStoryboard all already exist.

   Part of the three-file ISB split:
     idea-media-shared.js    (loads FIRST)
     idea-storyboard-9710.js (loads SECOND)
     session.js              (loads THIRD — this file)

   Exposes window.T2TSession = { toggleFullscreen } for
   idea-storyboard-9710.js to call, and composes window.T2TSea
   (openTrash, openBoard, openIdeaCapture, getCurrentBoardContext,
   getDefaultHeaderId, resolveOEmbed) for backpack.js to call.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }
  var T2TShared = window.T2TShared;

  /* ============================================================
     IDEA SESSION (9215) — Logged July 8, 2026.
     Replaces 9210 as the default CREATE-mode entry point. Same
     `ideas` table, same cluster_id targeting, same save functions
     (_ideaSaveCard / _ideaSaveLinkCard / _ideaSaveImageFile) as the
     legacy 9210-9214 family — this screen is a new front end on top
     of proven, already-working save logic, not a parallel system.

     PARENT / TOPIC / HEADER ladder: any header can become a Topic
     ("View as Topic" — same verb, works from HEADER to descend or
     from PARENT to climb back up). At the project apex there is no
     PARENT, but the slot is always rendered (blank), never removed,
     so the toolbar's shape stays identical whether you're deep in a
     Topic or sitting at the top — this is what lets CREATE and SHAPE
     (once built) share one "where am I" position.

     HEADER always defaults to New (= the current Topic's own id as
     cluster_id, the existing NEW convention) — leaving it
     alone or explicitly choosing New are the same save target.

     Legacy 9210-9214 screens are left completely intact and still
     reachable (s-idea's "Add an Idea" trivia link, and as a fallback
     if window.T2TSea.openIdeaCapture is ever unavailable) — nothing
     about them is removed by this addition.
     ============================================================ */

  var _isxStart = null;
  var _isxWired = false;
  var _isxExpanded = {};        // compass: which collapsed sibling groups were opened

  function _isxCurrentTopicId(){ return T2TShared.isxPath && T2TShared.isxPath.length ? T2TShared.isxPath[T2TShared.isxPath.length-1].id : null; }
  function _isxCurrentClusterId(){ return T2TShared.isxHeaderId || _isxCurrentTopicId(); }
  function _isxLocationLabel(){
    if(!T2TShared.isxPath) return '';
    return T2TShared.isxPath.map(function(p){return p.text;}).join(' \u203a ')+' \u2014 '+T2TShared.isxHeaderLabel;
  }

  // 9711 lock (July 13, 2026): no Header rung on this screen at all — every
  // save targets the current Topic's own NEW/Ideas bucket. T2TShared.isxHeaderId is
  // kept as a variable only because _isxCurrentClusterId() reads it, but it
  // is now permanently null; the old dropdown/"View as Topic"-from-Header
  // mechanism that used to set it has been removed below.
  async function _isxPersistLastTopic(){
    try{
      if(window.T2TData && window.T2TData.setLastInputTopic && T2TShared.isxPath && T2TShared.isxPath.length){
        await window.T2TData.setLastInputTopic(T2TShared.isxPath[0].id, _isxCurrentTopicId());
      }
    }catch(e){ console.warn('Persist last Input topic failed:', e); }
  }

  async function _isxInit(ctx){
    if(!T2TShared.isxPath){
      var wt=await T2TMedia.ensureWishTank();
      if(!wt || !wt.id){
        // Wish Tank lookup failed (auth/Supabase not ready yet) — retry once
        // after a short delay rather than silently proceeding with a null id,
        // which was creating orphaned root-level Purpose/MISC/NEW headers.
        await new Promise(function(r){ setTimeout(r,400); });
        wt=await T2TMedia.ensureWishTank();
      }
      if(!wt || !wt.id){
        console.error('Idea capture: Wish Tank unavailable, aborting init', wt&&wt.error);
        throw new Error('Wish Tank unavailable: '+(wt&&wt.error?wt.error:'unknown'));
      }
      T2TShared.isxPath=[{id:wt.id, text:'Wish Tank'}];
      // Sticky state, manual reset only (locked July 13, 2026) — resume
      // wherever this project's Input was last pointed, rather than always
      // reopening at the project apex. Only applies to the plain 💡
      // shortcut (no explicit ctx.boardId passed in).
      if(!ctx || !ctx.boardId){
        try{
          if(window.T2TData && window.T2TData.getLastInputTopic && window.T2TData.ancestorChain){
            var lastId=await window.T2TData.getLastInputTopic(wt.id);
            if(lastId){
              var chain=await window.T2TData.ancestorChain(lastId);
              if(chain && chain.length) T2TShared.isxPath=chain;
            }
          }
        }catch(e){ console.warn('Resume last Input topic failed:', e); }
      }
    }
    if(ctx && ctx.boardId){
      var boards=await T2TData.topLevelBoards();
      var match=boards.filter(function(b){ return String(b.id)===String(ctx.boardId); })[0];
      T2TShared.isxPath=[{id:ctx.boardId, text: match?match.text_content:'Board'}];
    }
    T2TShared.isxHeaderId = null;
    T2TShared.isxHeaderLabel='New';
    if(!_isxStart) _isxStart=Date.now();
  }

  async function renderIdeaSession(){
    var fgr=document.getElementById('fg-root');
    if(fgr) fgr.classList.add('isx-full');
    // An explicit ctx (boardId, optionally headerId) — e.g. the Storyboard's
    // own [+] controls — always wins over whatever Session View happened
    // to already be resting on from an earlier visit. Before this fix, a
    // stale T2TShared.isxPath from a prior visit made the "sticky resume" behavior
    // silently override an explicit "add to this exact header" request,
    // landing on the wrong board/header entirely. Locked July 16, 2026.
    if(T2TShared.ideaCaptureCtx && T2TShared.ideaCaptureCtx.boardId){
      try{
        var _explicitChain=(window.T2TData && window.T2TData.ancestorChain) ? await window.T2TData.ancestorChain(T2TShared.ideaCaptureCtx.boardId) : null;
        if(_explicitChain && _explicitChain.length){ T2TShared.isxPath=_explicitChain; }
        else {
          var _explicitRow=await _isxFetchRow(T2TShared.ideaCaptureCtx.boardId);
          T2TShared.isxPath=[{id:T2TShared.ideaCaptureCtx.boardId, text:_explicitRow?(_explicitRow.text_content||'(untitled)'):'(untitled)'}];
        }
        if(T2TShared.ideaCaptureCtx.headerId){
          var _explicitHeaderRow=await _isxFetchRow(T2TShared.ideaCaptureCtx.headerId);
          T2TShared.isxHeaderId=T2TShared.ideaCaptureCtx.headerId;
          T2TShared.isxHeaderLabel=_explicitHeaderRow?(_explicitHeaderRow.text_content||'(untitled)'):'New';
        } else {
          T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
        }
      }catch(e){ console.warn('Explicit idea-capture ctx failed, falling back to normal init:', e); }
    }
    if(!T2TShared.isxPath){
      try{
        await _isxInit(T2TShared.ideaCaptureCtx);
      }catch(e){
        console.error('renderIdeaSession init failed', e);
        if(fgr){
          var err=document.createElement('div');
          err.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;background:#5a1a1a;color:#fff;font-size:12px;padding:8px 12px;border-radius:8px;z-index:9999';
          err.textContent='Could not open ISB — try again in a moment.';
          fgr.appendChild(err);
          setTimeout(function(){ err.remove(); }, 4000);
        }
        T().returnToMG();
        return;
      }
    }
    T2TShared.ideaCaptureCtx=null;
    await _isxRenderLadder();
    await _isxRenderBoard();
    var pnInit=document.getElementById('isx-pagenum'); if(pnInit) pnInit.textContent='9711';
    if(!_isxWired){
      _isxWired=true;
      T().wire('isx-idea-btn', function(){
        window.IdeaCapture.open({
          headerId: T2TShared.isxHeaderId,
          headerLabel: T2TShared.isxHeaderLabel,
          boardId: _isxCurrentTopicId(),
          onSaved: function(row){
            if(row && row.content_type==='header'){ _isxRenderLadder(); }
            _isxRenderBoard();
          }
        });
      });
      T().wire('isx-gear-btn', _isxOpenGearMenu);
      T().wire('isx-rules-btn', function(){ window.IdeaCapture.openRules(); });
      T().wire('isx-compass-btn', _isxOpenStoryboardView);
      T().wire('isx-end-btn', function(){
        var fgr=document.getElementById('fg-root');
        if(fgr) fgr.classList.remove('isx-full');
        if(document.fullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document); }
        T().returnToMG();
      });
      // PROJECT — July 14, 2026: was display-only/inert on this screen;
      // now a real lateral jump between top-level projects, same intent
      // as 9710's own PROJECT chrome, but isx-scoped (updates T2TShared.isxPath,
      // not T2TShared.currentTopicId) since 9710's openProjectSwitcher()
      // is hardwired to Storyboard-only state.
      T().wire('isx-project-hit', _isxOpenProjectSwitcher);
      // TOPIC — July 14, 2026: same lateral-jump idea as PROJECT above,
      // but among siblings under the current PARENT instead of top-level
      // projects. Reachable at all times, including while the Idea Input
      // card is open on top of the board (see the isx-popup-layer nesting
      // note above — the header row is never covered by a popup).
      T().wire('isx-topic-box', _isxOpenTopicSwitcher);
      var board=document.getElementById('isx-board');
      if(board) board.addEventListener('dblclick', function(e){
        if(e.target.closest('.isx-tile')) return;
        T2TStoryboard.openBoardBgPicker();
      });
      var lassoCanvas=document.getElementById('isx-canvas');
      if(lassoCanvas) _isxWireLasso(lassoCanvas);
      // Triple-click PARENT to reveal the page number badge — same
      // convention as 9710's own sc-parent-hit trick.
      (function(){
        var clicks=0, timer=null;
        var hit=document.getElementById('isx-parent-hit');
        if(hit) hit.addEventListener('click', function(){
          clicks++;
          if(timer) clearTimeout(timer);
          timer=setTimeout(function(){ clicks=0; }, 600);
          if(clicks>=3){
            clicks=0;
            var pn=document.getElementById('isx-pagenum');
            if(pn){ pn.style.opacity='1'; setTimeout(function(){ pn.style.opacity='0'; }, 2000); }
          }
        });
      })();
    }
  }

  function _isxToggleFullscreen(){
    var el=document.documentElement;
    if(!document.fullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document);
    }
  }

  function _isxShowError(msg){
    var board=document.getElementById('isx-board');
    if(!board) return;
    var banner=document.getElementById('isx-error-banner');
    if(!banner){
      banner=document.createElement('div');
      banner.id='isx-error-banner';
      banner.style.cssText='position:absolute;top:14px;left:16px;right:260px;background:#fff3f3;border:2px solid #A32D2D;'
        +'color:#A32D2D;font-size:11px;padding:8px 12px;border-radius:8px;z-index:22;box-shadow:0 2px 6px rgba(0,0,0,.15)';
      board.appendChild(banner);
    }
    banner.textContent=msg;
    banner.style.display='block';
    clearTimeout(banner._isxTimer);
    banner._isxTimer=setTimeout(function(){ banner.style.display='none'; }, 8000);
  }

  async function _isxRenderLadder(){
   try{
    var projectLabel=document.getElementById('isx-project-label');
    var parentHit=document.getElementById('isx-parent-hit');
    var parentLabel=document.getElementById('isx-parent-label');
    var topicBox=document.getElementById('isx-topic-box');
    if(!projectLabel||!parentHit||!parentLabel||!topicBox) return;

    // PROJECT — fixed anchor, display only. Switching projects entirely is
    // FOCUS's job (reopen via 💡), same division of labor as everywhere else.
    projectLabel.textContent=T2TShared.isxPath[0].text;

    // PARENT — one level above TOPIC, click to climb back exactly one level.
    // Blank/inert only when TOPIC === PROJECT (nothing above yet).
    if(T2TShared.isxPath.length>1){
      parentLabel.textContent=T2TShared.isxPath[T2TShared.isxPath.length-2].text;
      parentHit.classList.remove('inert');
      parentHit.onclick=function(){
        T2TShared.isxPath.pop(); T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
      };
      // Double-click PARENT is the explicit gesture for climbing back to
      // TOPIC level — added July 16, 2026, alongside the existing single click.
      parentHit.ondblclick=parentHit.onclick;
    } else {
      parentLabel.textContent='\u2014';
      parentHit.classList.add('inert');
      parentHit.onclick=null;
      parentHit.ondblclick=null;
    }

    // TOPIC — current position, large centered pill, matches 9710's own
    // #sc-topic-box treatment exactly (same class, same look).
    topicBox.textContent=T2TShared.isxPath[T2TShared.isxPath.length-1].text;

    // 9711 lock, July 13, 2026: Header rung removed entirely — every save
    // targets this Topic's own NEW/Ideas bucket (T2TShared.isxHeaderId stays null
    // permanently, see _isxInit). Moving an *existing* idea to a different
    // Header is DETAILS-card-back's job now, not this screen's.
   }catch(e){
     console.error('_isxRenderLadder failed:', e);
     _isxShowError('Something went wrong loading this level: '+(e&&e.message?e.message:String(e)));
   }
  }

  // isx-scoped PROJECT switcher — July 14, 2026. Same UI/UX pattern as
  // 9710's openProjectSwitcher(), but drives T2TShared.isxPath directly instead of
  // T2TShared.currentTopicId/_sboardDrillInto, so it's safe to open from this
  // screen (9711) without touching Storyboard-only state.
  async function _isxOpenProjectSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var boards=await T2TData.topLevelBoards();
    boards=boards.slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var currentProjectId=(T2TShared.isxPath && T2TShared.isxPath.length) ? T2TShared.isxPath[0].id : null;
    var rows=boards.map(function(b){
      var cur=String(b.id)===String(currentProjectId)?' current':'';
      return '<div class="sb-hdr-vitem'+cur+'" data-pid="'+b.id+'">'+(b.text_content||'(untitled)')+'</div>';
    }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No other projects yet.</div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">Switch Project</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Start a new project</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-proj-new-input" type="text" placeholder="Project name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-proj-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-proj-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-proj-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-pid]'), function(row){
      row.addEventListener('click', function(){
        var pid=row.getAttribute('data-pid');
        var boardRow=boards.find(function(b){ return String(b.id)===String(pid); });
        T2TStoryboard.closeDetail();
        if(boardRow){
          T2TShared.isxPath=[{id:boardRow.id, text:boardRow.text_content||'(untitled)'}];
          T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
          _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
        }
      });
    });
    T().wire('sb-proj-cancel', closeSbDetail);
    T().wire('sb-proj-new-go', async function(){
      var errEl=document.getElementById('sb-proj-err');
      var nameInput=document.getElementById('sb-proj-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        T2TStoryboard.closeDetail();
        T2TShared.isxPath=[{id:ins.data.id, text:ins.data.text_content}];
        T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // TOPIC switcher — jumps sideways among siblings under the current
  // PARENT, replacing only the last leg of T2TShared.isxPath so PROJECT/PARENT stay
  // put. At the root (no PARENT yet — TOPIC === PROJECT), there's no
  // sibling scope to speak of, so this falls back to the same top-level
  // project pool PROJECT's own switcher uses. July 14, 2026.
  async function _isxOpenTopicSwitcher(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var _sb=T().sb;
    var parentEntry=(T2TShared.isxPath && T2TShared.isxPath.length>1) ? T2TShared.isxPath[T2TShared.isxPath.length-2] : null;
    var currentTopicId=(T2TShared.isxPath && T2TShared.isxPath.length) ? T2TShared.isxPath[T2TShared.isxPath.length-1].id : null;
    var siblings;
    try{
      siblings = parentEntry
        ? await window.T2TData.activeChildHeaders(parentEntry.id)
        : await T2TData.topLevelBoards();
    }catch(err){ _isxShowError('Couldn\u2019t load topics: '+(err&&err.message?err.message:String(err))); return; }
    siblings=(siblings||[]).slice().sort(function(a,b){
      return (a.text_content||'').toLowerCase().localeCompare((b.text_content||'').toLowerCase());
    });
    var rows=siblings.map(function(s){
      var cur=String(s.id)===String(currentTopicId)?' current':'';
      return '<div class="sb-hdr-vitem'+cur+'" data-tid="'+s.id+'">'+(s.text_content||'(untitled)')+'</div>';
    }).join('') || '<div style="font-size:11px;color:#888;font-style:italic;padding:8px 0">No sibling topics yet.</div>';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:10px">Switch Topic</div>'
      +'<div class="sb-hdr-vlist" style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;margin-bottom:10px">'+rows+'</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">Start a new topic'+(parentEntry?(' under '+parentEntry.text):'')+'</label>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px">'
      +'<input id="sb-topic-new-input" type="text" placeholder="Topic name…" style="flex:1;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;box-sizing:border-box">'
      +'<button class="sc-ov-btn save" id="sb-topic-new-go">Create</button>'
      +'</div>'
      +'<div id="sb-topic-err" style="font-size:10px;color:#b8562f;margin-bottom:6px;min-height:12px"></div>'
      +'<button class="sc-ov-btn" id="sb-topic-cancel" style="width:100%">Cancel</button>'
      +'</div>';
    ov.style.justifyContent='flex-start';
    ov.style.paddingLeft='max(20px, 4vw)';
    ov.classList.add('active');
    Array.prototype.forEach.call(ov.querySelectorAll('.sb-hdr-vitem[data-tid]'), function(row){
      row.addEventListener('click', function(){
        var tid=row.getAttribute('data-tid');
        var sib=siblings.find(function(s){ return String(s.id)===String(tid); });
        T2TStoryboard.closeDetail();
        if(sib){
          T2TShared.isxPath[T2TShared.isxPath.length-1]={id:sib.id, text:sib.text_content||'(untitled)'};
          T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
          _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
        }
      });
    });
    T().wire('sb-topic-cancel', closeSbDetail);
    T().wire('sb-topic-new-go', async function(){
      var errEl=document.getElementById('sb-topic-err');
      var nameInput=document.getElementById('sb-topic-new-input');
      var name=(nameInput&&nameInput.value||'').trim();
      if(!name){ if(errEl) errEl.textContent='Name it first.'; return; }
      try{
        var user=(await _sb.auth.getUser()).data.user;
        if(!user) throw new Error('Not signed in.');
        var ins=await _sb.from('ideas').insert({user_id:user.id,content_type:'header',text_content:name,cluster_id:parentEntry?parentEntry.id:null,created_at:new Date().toISOString()}).select().single();
        if(ins.error) throw ins.error;
        T2TStoryboard.closeDetail();
        T2TShared.isxPath[T2TShared.isxPath.length-1]={id:ins.data.id, text:ins.data.text_content};
        T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
        _isxRenderLadder(); _isxRenderBoard(); _isxPersistLastTopic();
      }catch(err){ if(errEl) errEl.textContent=err.message; }
    });
  }

  // _isxCardPos is now a live cache backed by Supabase (canvas_x/canvas_y
  // on `ideas`), not purely session-only — seeded from the DB on first
  // sight of a row, written through on every drop via _isxSavePos. Header
  // piles use the exact same cache/positioning path as loose ideas now
  // that they live on the freeform canvas instead of a fixed strip.
  // Freeform pile canvas redesign — Larry, July 18, 2026.
  var _isxCardPos = {};
  var _isxFanned = {};       // header ids currently spread open (session-only — every Topic opens with all piles closed)
  var _isxSelected = {};     // lasso-selected row ids, session-only
  var _isxClickTimers = {};  // pending single-click-vs-dblclick disambiguation per header row id
  var _isxColorSwatches = ['#e4e0d8','#fdf6e8','#eaf4ff','#eafaf0','#fdeaea','#f5eaff','#fff3d6','#e8f0f5'];

  function _isxSavePos(rowId, x, y){
    var _sb=T().sb;
    if(!_sb) return;
    _sb.from('ideas').update({canvas_x:Math.round(x), canvas_y:Math.round(y)}).eq('id',rowId)
      .then(function(res){ if(res&&res.error) console.warn('Position save failed for', rowId, res.error.message); })
      .catch(function(e){ console.warn('Position save failed for', rowId, e); });
  }

  // Shared by loose ideas and header piles alike: reuse this row's cached
  // position if we've already placed it this render pass; else its own
  // stored (canvas_x, canvas_y) if it has one; else a fresh spot — near
  // `anchor` (the parent pile it just fanned out from) if given, else
  // scattered anywhere on the canvas, matching the old whole-board random
  // placement. A freshly-chosen spot is persisted immediately so it
  // survives reload instead of reshuffling every visit.
  function _isxResolvePos(row, w, h, anchor){
    var pos=_isxCardPos[row.id];
    if(pos) return pos;
    if(row.canvas_x!=null && row.canvas_y!=null){
      pos={x:row.canvas_x, y:row.canvas_y};
    } else if(anchor){
      pos={
        x: Math.max(8, Math.min(w-120, anchor.x+(Math.random()*160-80))),
        y: Math.max(8, Math.min(h-80, anchor.y+(Math.random()*160-80)))
      };
      _isxSavePos(row.id, pos.x, pos.y);
    } else {
      pos={ x: 16+Math.random()*Math.max(40,w-140), y: 16+Math.random()*Math.max(40,h-100) };
      _isxSavePos(row.id, pos.x, pos.y);
    }
    _isxCardPos[row.id]=pos;
    return pos;
  }

  // Recolor all headers on THIS Topic in one click — same idea as 9710's
  // own 🎨 (_sboardOpenRecolorAll), but computes its own header-id list
  // fresh from the current clusterId rather than reading 9710's globals
  // (_sboardVisibleHeaders etc.), which may be stale or scoped to a
  // different Topic if 9710 hasn't been opened this session. Covers every
  // content subheader plus MISC; Trash is excluded — it's a global bucket,
  // not "on this board" — matching 9710's own exclusion. July 14, 2026.
  // Gear menu — mirrors 9710's own Options consolidation (see
  // _sboardOpenGearMenu in idea-storyboard-9710.js): moves the 🎨 Recolor
  // button that used to sit in the top row behind one Options icon next
  // to ✕. Added July 17, 2026.
  function _isxOpenGearMenu(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:10px">Options</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
      +'<button class="sc-ov-btn" id="isx-gear-recolor" style="width:100%">🎨 Recolor all headers</button>'
      +'</div>'
      +'<button class="sc-ov-btn" id="isx-gear-close" style="width:100%">Close</button>'
      +'</div>';
    ov.classList.add('active');
    T().wire('isx-gear-recolor', function(){ closeSbDetail(); _isxOpenRecolorAll(); });
    T().wire('isx-gear-close', closeSbDetail);
  }

  async function _isxOpenRecolorAll(){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var clusterId=_isxCurrentClusterId();
    if(!clusterId) return;
    var _sb=T().sb;
    try{
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user) throw new Error('Not signed in.');
      var miscId=await T2TStoryboard.ensureMiscHeader(clusterId);
      var res=await _sb.from('ideas').select('id,text_content')
        .eq('user_id',user.id).eq('cluster_id',clusterId).eq('content_type','header');
      if(res.error) throw res.error;
      var excludedNames=['Purpose','NEW','New Additions'];
      var ids=(res.data||[]).filter(function(r){ return excludedNames.indexOf(r.text_content)===-1; })
        .map(function(r){ return r.id; }).concat(miscId?[miscId]:[]);
      var uniq=ids.filter(function(id,idx){ return ids.indexOf(id)===idx; });
      var swatches=_isxColorSwatches.map(function(c){
        return '<button class="sb-swatch" data-c="'+c+'" style="width:26px;height:26px;border-radius:50%;background:'+c+';border:1px solid #cfe4f2;cursor:pointer"></button>';
      }).join('');
      ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
        +'<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:6px">Recolor all headers</div>'
        +'<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:10px">Pick one — every header on this Topic, including MISC, gets it.</div>'
        +'<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+swatches+'</div>'
        +'<button class="sc-ov-btn" id="isx-recolor-close" style="width:100%">Cancel</button>'
        +'</div>';
      ov.classList.add('active');
      T().wire('isx-recolor-close', closeSbDetail);
      ov.querySelectorAll('.sb-swatch').forEach(function(sw){
        sw.onclick=async function(){
          var c=sw.getAttribute('data-c');
          try{
            for(var i=0;i<uniq.length;i++){ await _sb.from('ideas').update({color:c}).eq('id',uniq[i]); }
          }catch(e){}
          T2TStoryboard.closeDetail();
          _isxRenderBoard();
        };
      });
    }catch(err){ _isxShowError('Couldn\u2019t load headers to recolor: '+(err&&err.message?err.message:String(err))); }
  }

  async function _isxRenderBoard(){
    var canvas=document.getElementById('isx-canvas');
    var strip=document.getElementById('isx-header-strip');
    var empty=document.getElementById('isx-empty');
    if(!canvas||!strip) return;
    canvas.innerHTML=''; strip.innerHTML='';
    _isxSelected={};
    if(empty) canvas.appendChild(empty);
    if(T2TStoryboard.applyBoardBg) T2TStoryboard.applyBoardBg();
    var clusterId=_isxCurrentClusterId();
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(!user||!clusterId) return;

      // MISC is per-Topic (same ensure-call 9710 uses); Trash is a single
      // global bucket for the whole account. Both are always shown, even
      // empty — permanent slots, not something that only appears once it
      // has content. July 14, 2026.
      var _ensureResults=await Promise.all([T2TStoryboard.ensureMiscHeader(clusterId), T2TStoryboard.ensureTrashHeader()]);
      var miscId=_ensureResults[0], trashId=_ensureResults[1];

      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,color,cluster_id,heart_count,notes,sort_order,locked,canvas_x,canvas_y')
        .eq('user_id',user.id).eq('cluster_id',clusterId).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(300);
      var excludedNames=['Purpose','NEW','New Additions'];
      var allRows=((res&&res.data)||[]).filter(function(r){
        return r.content_type!=='header' || excludedNames.indexOf(r.text_content)===-1;
      });
      var ideaRows=allRows.filter(function(r){ return r.content_type!=='header'; });
      var contentHeaders=allRows.filter(function(r){ return r.content_type==='header' && String(r.id)!==String(miscId); });
      var miscRow=allRows.find(function(r){ return String(r.id)===String(miscId); }) || await _isxFetchRow(miscId);
      var trashRow=await _isxFetchRow(trashId);

      if(empty) empty.style.display = (ideaRows.length||contentHeaders.length) ? 'none' : 'block';

      // Header piles now live directly on the freeform canvas, at whatever
      // (canvas_x, canvas_y) each was last dropped at — randomly scattered
      // on first-ever appearance, same "loose piles" feel as everything
      // else on the board. Redesigned July 18, 2026 (was a fixed
      // flex-wrap strip above the canvas). MISC then Trash still built
      // last, but free to sit anywhere once dragged.
      var headerRowOrder=contentHeaders.concat(miscRow?[miscRow]:[]).concat(trashRow?[trashRow]:[]);
      var w=Math.max(canvas.clientWidth,600), h=Math.max(canvas.clientHeight,600);

      for(var i=0;i<headerRowOrder.length;i++){
        var r=headerRowOrder[i];
        var icon = String(r.id)===String(trashId) ? '\ud83d\uddd1\ufe0f ' : (String(r.id)===String(miscId) ? '\ud83d\udce6 ' : '');
        await _isxBuildHeaderPile(r, icon, w, h, canvas, null);
      }
      ideaRows.forEach(function(r){ canvas.appendChild(_isxMakeTile(r, w, h)); });
    }catch(e){ console.warn('_isxRenderBoard failed:', e); _isxShowError('Board didn\u2019t load: '+(e&&e.message?e.message:String(e))); }
  }

  // A header pile: the header tile itself, plus its own real contents
  // rendered one of two ways depending on _isxFanned[row.id] — CLOSED
  // (default, every Topic opens this way): the actual child cards cascade
  // tightly behind the header, each nudged a few px further down-right
  // than the last, so only corners/edges peek out and focus stays on the
  // header — capped at a handful of visible slivers plus a "+N" badge for
  // the rest. OPEN: the same real cards scatter loosely around the pile's
  // own position, fully visible and individually draggable/lassoable.
  // Toggled by a single click on the header (see _isxMakeHeaderStackTile);
  // double-click still drills into the header as a Topic, unchanged.
  // Recurses into any nested header that's itself open. Larry, July 18,
  // 2026.
  async function _isxBuildHeaderPile(row, iconPrefix, w, h, canvas, anchor){
    var pileTile=_isxMakeHeaderStackTile(row, iconPrefix, w, h, anchor);
    canvas.appendChild(pileTile);
    var pilePos=_isxCardPos[row.id];
    var _sb=T().sb;
    var children=[];
    try{
      var res=await _sb.from('ideas').select('id,content_type,image_url,text_content,color,cluster_id,heart_count,notes,sort_order,locked,canvas_x,canvas_y')
        .eq('cluster_id',row.id).in('content_type',['image','text','link','header'])
        .order('created_at',{ascending:true}).limit(300);
      children=(res&&res.data)||[];
    }catch(e){ console.warn('_isxBuildHeaderPile children fetch failed', e); }
    if(!children.length) return;

    if(_isxFanned[row.id]){
      for(var i=0;i<children.length;i++){
        var c=children[i];
        if(c.content_type==='header'){ await _isxBuildHeaderPile(c, '', w, h, canvas, pilePos); }
        else { canvas.appendChild(_isxMakeTile(c, w, h, pilePos)); }
      }
    } else {
      var CAP=6, STEP=4;
      var shown=children.slice(0, CAP);
      shown.forEach(function(c, idx){
        var layer=document.createElement('div');
        layer.className='isx-cascade-card';
        layer.style.left=Math.round(pilePos.x+(idx+1)*STEP)+'px';
        layer.style.top=Math.round(pilePos.y+(idx+1)*STEP)+'px';
        layer.style.background=c.color||'#fff';
        layer.style.zIndex=String(CAP-idx);
        canvas.appendChild(layer);
      });
      if(children.length>CAP){
        var badge=document.createElement('div');
        badge.className='isx-cascade-more';
        badge.textContent='+'+(children.length-CAP);
        badge.style.left=Math.round(pilePos.x+(CAP+1)*STEP+6)+'px';
        badge.style.top=Math.round(pilePos.y-10)+'px';
        canvas.appendChild(badge);
      }
      pileTile.style.zIndex=String(CAP+1);
    }
  }

  function _isxMakeTile(row, w, h, anchor){
    var t=document.createElement('div');
    t.className='isx-tile';
    t.dataset.isxId=row.id;
    t.dataset.isxType=row.content_type;
    t.dataset.isxLocked=row.locked?'1':'';
    var pos=_isxResolvePos(row, w, h, anchor);
    t.style.left=Math.round(pos.x)+'px'; t.style.top=Math.round(pos.y)+'px';
    var linkUrl=null;
    if(row.content_type==='image'){
      t.innerHTML='<img src="'+row.image_url+'" style="height:52px">';
    } else if(row.content_type==='link'){
      var parsed=T2TMedia.parseText(row.text_content);
      linkUrl=parsed.url;
      t.classList.add('isx-link-tile');
      t.innerHTML=(row.image_url?'<img src="'+row.image_url+'" style="height:52px">':'')
        +'<div>\ud83d\udd17 '+(parsed.title||parsed.url)+'</div>';
    } else {
      t.innerHTML='<div>'+(row.text_content||'')+'</div>';
    }
    // Same SHAPING card the Storyboard uses — full-size image view, heart,
    // notes, lock — so a card behaves identically on both screens. Reached
    // via the corner-flip (turned-up lower-right corner) instead of
    // dblclick as of July 16, 2026.
    var isxCornerFlip=document.createElement('div');
    isxCornerFlip.className='isx-corner-flip';
    isxCornerFlip.title='Flip card';
    isxCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); T2TStoryboard.openDetail(row); });
    isxCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    t.appendChild(isxCornerFlip);
    _isxWireTileDrag(t, row.id, linkUrl, false);
    return t;
  }

  // Header buckets — redesigned July 18, 2026 as freeform piles: live
  // directly on #isx-canvas at their own persisted (canvas_x, canvas_y)
  // instead of a fixed flex-wrap strip (the #isx-header-strip approach
  // from July 14, 2026 — see the CSS, now hidden/unused). Same
  // stacked-card look as 9710's own header tiles. Built on the isx
  // mouse-drag system so dragging one onto the TOPIC rung drills in, or
  // onto another pile nests it (pinned=true — see _isxWireTileDrag); a
  // plain reposition drop just persists its new spot. Single click
  // toggles the pile open/closed (see _isxBuildHeaderPile); double-click
  // still drills straight into it as a Topic. Always a valid drop target
  // for loose ideas. MISC and Trash are the same tile — Trash is one
  // single bucket for the whole account (matches 9710), MISC is
  // per-Topic.
  function _isxMakeHeaderStackTile(row, iconPrefix, w, h, anchor){
    var t=document.createElement('div');
    t.className='isx-tile isx-stack-tile';
    t.dataset.isxId=row.id;
    t.dataset.isxType=row.content_type;
    t.dataset.isxLocked=row.locked?'1':'';
    var pos=_isxResolvePos(row, w||600, h||600, anchor);
    t.style.left=Math.round(pos.x)+'px'; t.style.top=Math.round(pos.y)+'px';
    var bg=row.color||'#fff';
    t.innerHTML='<div class="isx-stack-layer" style="top:5px;left:5px;background:'+bg+'"></div>'
      +'<div class="isx-stack-layer" style="top:2.5px;left:2.5px;background:'+bg+'"></div>'
      +'<div class="isx-stack-front" style="background:'+bg+'">'
        +(row.locked?'<div class="isx-stack-lock">\ud83d\udd12</div>':'')
        +'<div>'+(iconPrefix||'')+(row.text_content||'(untitled)')+'</div>'
        +'<div class="isx-corner-flip" title="Flip card"></div>'
      +'</div>';
    var isxStackCornerFlip=t.querySelector('.isx-corner-flip');
    if(isxStackCornerFlip){
      isxStackCornerFlip.addEventListener('click', function(e){ e.stopPropagation(); T2TStoryboard.openDetail(row); });
      isxStackCornerFlip.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    }
    // Single click = toggle this pile open/closed (spread its real cards
    // out to view/reorganize, or gather them back into the cascade).
    // Double-click still drills into the header as a Topic — a plain
    // click waits ~250ms to make sure a second one isn't coming before it
    // acts, so a genuine double-click never flashes the pile open first.
    // Larry, July 18, 2026.
    t.addEventListener('click', function(e){
      if(e.target.closest('.isx-corner-flip')) return;
      e.stopPropagation();
      if(_isxClickTimers[row.id]) return;
      _isxClickTimers[row.id]=setTimeout(function(){
        delete _isxClickTimers[row.id];
        if(_isxFanned[row.id]) delete _isxFanned[row.id]; else _isxFanned[row.id]=true;
        _isxRenderBoard();
      }, 250);
    });
    t.addEventListener('dblclick', function(e){
      e.stopPropagation();
      if(_isxClickTimers[row.id]){ clearTimeout(_isxClickTimers[row.id]); delete _isxClickTimers[row.id]; }
      delete _isxFanned[row.id];
      _isxPromoteCardToTopic(row.id);
    });
    _isxWireTileDrag(t, row.id, null, true);
    return t;
  }

  // Manual drag. Positions now persist to Supabase (canvas_x/canvas_y on
  // `ideas`, via _isxSavePos) rather than living only for the browser
  // session — updated as part of the freeform pile canvas redesign, July
  // 18, 2026 (CLUSTER's own starburst is still session-only; this screen
  // diverged from that once positions needed to survive reload). A link
  // tile still needs to open on a genuine click; a small movement
  // threshold is what tells a drag apart from a click on the same element.
  function _isxWireTileDrag(tile, rowId, linkUrl, pinned){
    var startX, startY, origLeft, origTop, moved;
    tile.addEventListener('mousedown', function(e){
      e.preventDefault();
      var board=document.getElementById('isx-board');
      var scroller=document.getElementById('isx-canvas-scroll');
      var canvasEl=document.getElementById('isx-canvas');
      startX=e.clientX; startY=e.clientY; moved=false;
      origLeft=parseFloat(tile.style.left)||0; origTop=parseFloat(tile.style.top)||0;
      var startScrollLeft=scroller?scroller.scrollLeft:0, startScrollTop=scroller?scroller.scrollTop:0;

      // Lasso-selected group (2+) moves together, relative positions kept
      // — same convention as 9710's own CLUSTER lasso. Snapshot every
      // selected tile's starting left/top once, here at drag start. A
      // group drag only ever repositions (no reparent/promote/fan) — same
      // restriction CLUSTER's group-drag has. Freeform pile canvas
      // redesign — Larry, July 18, 2026.
      var isGroup = !!(_isxSelected[rowId] && Object.keys(_isxSelected).length>1);
      var groupEls=null, groupOrig=null;
      if(isGroup && canvasEl){
        groupEls=Array.prototype.filter.call(canvasEl.querySelectorAll('.isx-tile'), function(t){ return _isxSelected[t.dataset.isxId]; });
        groupOrig=groupEls.map(function(t){ return {left:parseFloat(t.style.left)||0, top:parseFloat(t.style.top)||0}; });
      }

      // Sliding-window navigation, added July 12, 2026 — the same free-drag gesture
      // used for repositioning a card on the canvas also doubles as a way to
      // recenter the ladder directly onto this card by dropping it on the
      // TOPIC box (Subber -> Topic in one move). The old Header-rung drop
      // target was removed July 13, 2026 along with the Header rung itself
      // (no bucket selection lives on this screen anymore) — moving a card
      // to a specific Header is DETAILS-card-back's job now.
      var topicRungEl=document.getElementById('isx-topic-box');
      function overEl(el, ev){
        if(!el) return false;
        var r=el.getBoundingClientRect();
        return ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top && ev.clientY<=r.bottom;
      }
      // Drop-onto-another-tile — July 14, 2026. Dropping a loose idea onto
      // an existing header stack moves it there directly (no prompt, it
      // already has a home). Dropping it onto another loose idea groups
      // them: the target becomes a header (name optional — see
      // _isxOfferStackName) and the dragged card nests under it. Locked
      // tiles and the tile being dragged itself are never valid targets.
      function findTileTarget(ev){
        var tiles=board.querySelectorAll('.isx-tile');
        for(var i=0;i<tiles.length;i++){
          var el=tiles[i];
          if(el===tile || el.dataset.isxLocked) continue;
          if(overEl(el, ev)) return el;
        }
        return null;
      }
      function clearRungHighlights(){
        if(topicRungEl) topicRungEl.classList.remove('isx-rung-dropready');
        board.querySelectorAll('.isx-tile-dropready').forEach(function(el){ el.classList.remove('isx-tile-dropready'); });
      }
      // Edge auto-scroll — July 14, 2026. #isx-canvas-scroll is the scroll
      // container for the whole freeform canvas. Dragging a tile near the
      // canvas edge still scrolls to reach more cards, same as 9710's own
      // edge-scroll on its board-wrap.
      var EDGE=56, MAXSPEED=16;
      function edgeScroll(ev){
        if(!scroller) return;
        var r=scroller.getBoundingClientRect();
        var x=ev.clientX, y=ev.clientY;
        if(x>=r.left && x<=r.right){
          if(x-r.left<EDGE) scroller.scrollLeft-=MAXSPEED*(1-(x-r.left)/EDGE);
          else if(r.right-x<EDGE) scroller.scrollLeft+=MAXSPEED*(1-(r.right-x)/EDGE);
        }
        if(y>=r.top && y<=r.bottom){
          if(y-r.top<EDGE) scroller.scrollTop-=MAXSPEED*(1-(y-r.top)/EDGE);
          else if(r.bottom-y<EDGE) scroller.scrollTop+=MAXSPEED*(1-(r.bottom-y)/EDGE);
        }
      }
      function onMove(ev){
        edgeScroll(ev);
        // Compensate for however much the canvas has auto-scrolled since
        // mousedown, or the tile drifts from the cursor as soon as
        // edgeScroll kicks in — raw client-coordinate delta alone stops
        // matching canvas-local position the moment the container scrolls
        // underneath a fixed cursor position.
        var scrollDx=scroller?(scroller.scrollLeft-startScrollLeft):0;
        var scrollDy=scroller?(scroller.scrollTop-startScrollTop):0;
        var dx=(ev.clientX-startX)+scrollDx, dy=(ev.clientY-startY)+scrollDy;
        if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
        tile.style.left=Math.round(origLeft+dx)+'px';
        tile.style.top=Math.round(origTop+dy)+'px';
        if(groupEls){
          groupEls.forEach(function(t,i){
            if(t===tile) return;
            t.style.left=Math.round(groupOrig[i].left+dx)+'px';
            t.style.top=Math.round(groupOrig[i].top+dy)+'px';
          });
          return; // group drag never reparents/promotes/fans — reposition only
        }
        clearRungHighlights();
        if(moved){
          if(overEl(topicRungEl, ev)) topicRungEl.classList.add('isx-rung-dropready');
          else{ var tgt=findTileTarget(ev); if(tgt) tgt.classList.add('isx-tile-dropready'); }
        }
      }
      function onUp(ev){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if(groupEls){
          if(moved){
            groupEls.forEach(function(t){
              var gx=parseFloat(t.style.left)||0, gy=parseFloat(t.style.top)||0;
              _isxCardPos[t.dataset.isxId]={x:gx,y:gy};
              _isxSavePos(t.dataset.isxId, gx, gy);
            });
          }
          return;
        }
        clearRungHighlights();
        var tileTarget = moved ? findTileTarget(ev) : null;
        if(moved && overEl(topicRungEl, ev)){
          delete _isxFanned[rowId];
          _isxPromoteCardToTopic(rowId);
        } else if(moved && tileTarget){
          if(tileTarget.dataset.isxType==='header'){
            delete _isxCardPos[rowId]; delete _isxFanned[rowId];
            T2TStoryboard.moveCard(rowId, tileTarget.dataset.isxId);
          } else {
            _isxFetchRow(tileTarget.dataset.isxId).then(function(targetRow){
              if(targetRow) _isxOfferStackName(rowId, targetRow);
            });
          }
        } else if(moved){
          var finalX=parseFloat(tile.style.left)||0, finalY=parseFloat(tile.style.top)||0;
          _isxCardPos[rowId]={x:finalX,y:finalY};
          _isxSavePos(rowId, finalX, finalY);
          // A moved header pile needs a refresh so its cascade/spread
          // children re-anchor around its new spot; a loose idea doesn't
          // need the whole board reloaded for a nudge.
          if(pinned) _isxRenderBoard();
        } else if(linkUrl){
          window.open(linkUrl, '_blank', 'noopener');
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Lasso-select on blank canvas — mousedown on empty space (not on a
  // tile) draws a selection rectangle; releasing selects every real tile
  // it overlaps (cascade slivers are inert and excluded, since they don't
  // carry the .isx-tile class). Dragging any selected tile then moves the
  // whole selection together — see _isxWireTileDrag. A click with no real
  // movement just clears the current selection. Ported from 9710's
  // CLUSTER lasso — Larry, July 18, 2026.
  function _isxWireLasso(canvas){
    canvas.addEventListener('mousedown', function(e){
      if(e.target!==canvas) return;
      e.preventDefault();
      var r0=canvas.getBoundingClientRect();
      var start={x:e.clientX-r0.left, y:e.clientY-r0.top};
      var moved=false;
      var lasso=document.createElement('div');
      lasso.className='isx-lasso';
      lasso.style.left=start.x+'px'; lasso.style.top=start.y+'px';
      lasso.style.width='0px'; lasso.style.height='0px';
      canvas.appendChild(lasso);
      function applySelection(lb){
        _isxSelected={};
        Array.prototype.forEach.call(canvas.querySelectorAll('.isx-tile'), function(t){
          var tx=parseFloat(t.style.left)||0, ty=parseFloat(t.style.top)||0;
          var tw=t.offsetWidth||112, th=t.offsetHeight||66;
          var overlaps = tx<lb.left+lb.width && tx+tw>lb.left && ty<lb.top+lb.height && ty+th>lb.top;
          if(overlaps) _isxSelected[t.dataset.isxId]=true;
          t.classList.toggle('isx-selected', overlaps);
        });
      }
      function onMove(e2){
        var r=canvas.getBoundingClientRect();
        var cx=e2.clientX-r.left, cy=e2.clientY-r.top;
        if(Math.abs(cx-start.x)>3 || Math.abs(cy-start.y)>3) moved=true;
        var x=Math.min(cx,start.x), y=Math.min(cy,start.y);
        lasso.style.left=x+'px'; lasso.style.top=y+'px';
        lasso.style.width=Math.abs(cx-start.x)+'px';
        lasso.style.height=Math.abs(cy-start.y)+'px';
        // Highlight live as the rectangle passes over tiles, so it's clear
        // before releasing exactly what's about to be grabbed — flagged by
        // Larry, July 18, 2026.
        if(moved) applySelection({left:x, top:y, width:Math.abs(cx-start.x), height:Math.abs(cy-start.y)});
      }
      function onUp(){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        var lb={left:parseFloat(lasso.style.left), top:parseFloat(lasso.style.top), width:parseFloat(lasso.style.width), height:parseFloat(lasso.style.height)};
        if(lasso.parentNode) lasso.parentNode.removeChild(lasso);
        if(moved){
          applySelection(lb);
        } else {
          _isxSelected={};
          Array.prototype.forEach.call(canvas.querySelectorAll('.isx-tile'), function(t){
            t.classList.remove('isx-selected');
          });
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Drop one loose idea onto another — groups them by promoting the target
  // to a header. Naming is optional (Larry, July 14, 2026): Save renames
  // the new header, Skip/blank keeps the target's own existing text as the
  // header name — there is no "cancel and stay loose" path here, unlike
  // CLUSTER's own _clusterOfferStack, which forces a name or nothing
  // happens at all. Renaming later is always available via DETAILS.
  function _isxOfferStackName(draggedId, targetRow){
    var ov=document.getElementById('sb-detail-overlay');
    if(!ov) return;
    var targetName=targetRow.text_content||'(untitled)';
    ov.innerHTML='<div class="sc-overlay-card" style="text-align:center">'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:4px">Name this cluster</div>'
      +'<div style="font-size:11px;color:#7a6040;font-style:italic;margin-bottom:10px">Skip to keep \u201c'+targetName+'\u201d as the header name \u2014 rename anytime from DETAILS.</div>'
      +'<label style="display:block;font-size:10px;font-weight:700;color:#7a6040;margin-bottom:4px;text-align:left">HEADER:</label>'
      +'<input id="isx-stack-name" type="text" placeholder="'+targetName+'" style="width:100%;border:1px solid #cfe4f2;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;margin-bottom:10px;box-sizing:border-box">'
      +'<div style="display:flex;gap:6px"><button class="sc-ov-btn save" id="isx-stack-save" style="flex:1">Save</button><button class="sc-ov-btn" id="isx-stack-skip" style="flex:1">Skip</button></div>'
      +'</div>';
    ov.classList.add('active');
    var input=document.getElementById('isx-stack-name');
    if(input) setTimeout(function(){ input.focus(); }, 50);
    function commit(name){ T2TStoryboard.closeDetail(); _isxCommitStackIntoHeader(draggedId, targetRow, name); }
    T().wire('isx-stack-skip', function(){ commit(null); });
    T().wire('isx-stack-save', function(){
      var name=((document.getElementById('isx-stack-name')||{}).value||'').trim();
      commit(name||null);
    });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ document.getElementById('isx-stack-save').click(); }
      else if(e.key==='Escape'){ document.getElementById('isx-stack-skip').click(); }
    });
  }

  async function _isxCommitStackIntoHeader(draggedId, targetRow, name){
    var _sb=T().sb;
    try{
      if(targetRow.content_type!=='header'){
        var updates={content_type:'header'};
        if(name) updates.text_content=name;
        var upd=await _sb.from('ideas').update(updates).eq('id',targetRow.id);
        if(upd.error) throw upd.error;
      } else if(name){
        var upd2=await _sb.from('ideas').update({text_content:name}).eq('id',targetRow.id);
        if(upd2.error) throw upd2.error;
      }
      delete _isxCardPos[draggedId];
      await T2TStoryboard.moveCard(draggedId, targetRow.id);
    }catch(err){ _isxShowError('Couldn\u2019t group these: '+(err&&err.message?err.message:String(err))); }
  }

  // Drag-to-Topic: recenters the ladder directly onto a floating card, the
  // same destination as if it had first been promoted to Header and then
  // "View as Topic"d — this just skips the intermediate step. No content_type
  // change needed; a Topic doesn't have to already be a header row (same
  // auto-promotion-is-earned principle the board already uses elsewhere).
  async function _isxPromoteCardToTopic(rowId){
    var row=await _isxFetchRow(rowId);
    if(!row) return;
    delete _isxCardPos[rowId];
    delete _isxFanned[rowId];
    T2TShared.isxPath.push({id:row.id, text:row.text_content||'(untitled)'});
    T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
    await _isxRenderLadder();
    await _isxRenderBoard();
    await _isxPersistLastTopic();
  }

  // Drag-to-Header: promotes a floating card to a header row (if it isn't
  // one already) and selects it as the current Header target. Topic doesn't
  // change — this is the one-step version of naming a header then picking
  // it from the dropdown.
  async function _isxPromoteCardToHeader(rowId){
    var row=await _isxFetchRow(rowId);
    if(!row) return;
    if(row.content_type!=='header'){
      var _sb=T().sb;
      try{
        var upd=await _sb.from('ideas').update({content_type:'header'}).eq('id', rowId).select().single();
        if(upd.error) throw upd.error;
        row=upd.data;
      }catch(e){
        _isxShowError('Couldn\u2019t promote to header: '+(e&&e.message?e.message:String(e)));
        return;
      }
    }
    delete _isxCardPos[rowId];
    T2TShared.isxHeaderId=row.id; T2TShared.isxHeaderLabel=row.text_content||'(untitled)';
    await _isxRenderLadder();
    await _isxRenderBoard();
  }

  async function _isxFetchRow(rowId){
    var _sb=T().sb;
    try{
      var res=await _sb.from('ideas').select('id,content_type,text_content,cluster_id,image_url,color,locked,canvas_x,canvas_y').eq('id',rowId).single();
      if(res.error) throw res.error;
      return res.data;
    }catch(e){
      _isxShowError('Couldn\u2019t read that card: '+(e&&e.message?e.message:String(e)));
      return null;
    }
  }

  // Eye replaces the compass this iteration: instead of the text "Where
  // This Sits" tree, it jumps straight to the real visual Storyboard for
  // wherever the traveler currently is in Idea Session.
  function _isxOpenStoryboardView(){
    T2TMedia.openBoard(_isxCurrentTopicId());
  }

  // Compass ("Where This Sits") manages #isx-popup-layer directly rather
  // than through IdeaCapture — it's not part of the 9712-9715 capture
  // family, just a fellow user of the same shared overlay element. This
  // is its own close, scoped to itself. Locked July 16, 2026.
  function _isxCloseCompass(){
    var layer=document.getElementById('isx-popup-layer');
    if(layer){ layer.classList.remove('active'); layer.innerHTML=''; }
  }

  async function _isxOpenCompass(){
    var layer=document.getElementById('isx-popup-layer');
    if(!layer) return;
    var apexId=T2TShared.isxPath[0].id;
    var byId={}, kidsOf={};
    try{
      var _sb=T().sb;
      var u=await _sb.auth.getUser(); var user=u&&u.data&&u.data.user;
      if(user){
        var res=await _sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',user.id).eq('content_type','header');
        (res.data||[]).forEach(function(r){ byId[r.id]=r; (kidsOf[r.cluster_id]=kidsOf[r.cluster_id]||[]).push(r.id); });
      }
    }catch(e){ console.warn('_isxOpenCompass fetch failed:', e); }

    function keyOf(idPath){ return idPath.join('/'); }
    function renderNode(idPath){
      var id=idPath[idPath.length-1];
      var name=byId[id]?byId[id].text_content:T2TShared.isxPath[0].text;
      var isHere = keyOf(idPath)===keyOf(T2TShared.isxPath.map(function(p){return p.id;}));
      var html='<div class="isx-tnode'+(isHere?' here':'')+'" data-path="'+idPath.join('|')+'">'+(isHere?'\ud83d\udccd ':'')+name+'</div>';
      var kids=kidsOf[id]||[];
      if(kids.length){
        var pathIds=T2TShared.isxPath.map(function(p){return p.id;});
        var onPathChild = pathIds.length>idPath.length && keyOf(pathIds.slice(0,idPath.length))===keyOf(idPath) ? pathIds[idPath.length] : null;
        var expanded=_isxExpanded[keyOf(idPath)];
        var shown = expanded ? kids : (onPathChild ? [onPathChild] : []);
        var hidden = kids.filter(function(k){ return shown.indexOf(k)===-1; });
        html+='<div class="isx-tkids">';
        shown.forEach(function(k){ html+=renderNode(idPath.concat([k])); });
        if(hidden.length) html+='<div class="isx-tchip" data-expand="'+keyOf(idPath)+'">+ '+hidden.length+' more here</div>';
        html+='</div>';
      }
      return html;
    }

    layer.innerHTML='<div class="isx-tree-card"><button class="isx-pclose" id="isx-p-close">\u2715</button>'
      +'<div class="isx-ptitle" style="font-size:20px">\ud83e\udded Where This Sits</div>'
      +'<div class="isx-psub">\ud83d\udccd marks you. Tap a name to jump there. Tap "+N more" to reveal the rest.</div>'
      +renderNode([apexId])+'</div>';
    layer.classList.add('active');
    document.getElementById('isx-p-close').onclick=_isxCloseCompass;
    layer.querySelectorAll('.isx-tnode').forEach(function(el){
      el.onclick=async function(){
        var ids=el.getAttribute('data-path').split('|');
        var chain=ids.map(function(id, i){ return {id:id, text: i===0?T2TShared.isxPath[0].text:(byId[id]?byId[id].text_content:'')}; });
        T2TShared.isxPath=chain; T2TShared.isxHeaderId=null; T2TShared.isxHeaderLabel='New';
        _isxCloseCompass();
        await _isxRenderLadder(); await _isxRenderBoard();
      };
    });
    layer.querySelectorAll('.isx-tchip').forEach(function(el){
      el.onclick=function(){ _isxExpanded[el.getAttribute('data-expand')]=true; _isxOpenCompass(); };
    });
  }

  window.T2TSession = {
    toggleFullscreen: _isxToggleFullscreen
  };

  window.T2TSea = {
    openTrash: async function(){
      try{
        var tid=await T2TStoryboard.ensureTrashHeader();
        T2TShared.filter=tid;
      }catch(e){ T2TShared.filter=null; }
      T().nav('s-sea-of-ideas-cluster');
    },
    openBoard: function(boardId){ T2TMedia.openBoard(boardId); },
    openIdeaCapture: function(ctx){
      // Logged July 8, 2026 — now opens the new Idea Session screen (9215)
      // instead of legacy 9210. 9210-9214 are left fully in place and still
      // reachable (s-idea's "Add an Idea" trivia link) as a fallback.
      T2TShared.ideaCaptureCtx=ctx||null;
      T2TShared.returnToBoard=!!(ctx&&ctx.returnToBoard);
      T2TShared.returnBoardId=(ctx&&ctx.boardId!==undefined)?ctx.boardId:null;
      T().nav('s-idea-session');
    },
    getCurrentBoardContext: function(){ return T2TShared.currentTopicId?{boardId:T2TShared.currentTopicId}:null; },
    getDefaultHeaderId: T2TMedia.getDefaultHeaderId,
    resolveOEmbed: T2TMedia.resolveOEmbed
  };

  document.addEventListener('DOMContentLoaded', function(){
    T().registerScreenActivate('s-idea-session', renderIdeaSession);
  });

})();
