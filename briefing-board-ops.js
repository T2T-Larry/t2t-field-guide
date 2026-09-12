/* ============================================================
   briefing-board-ops.js -- T2T Field Guide - BRIEFING BOARD (9350)

   OPS. Running the board that's already on screen: drawing the
   columns with real cards (renderBoard), drag-and-drop, the H/M/L
   priority cycle and its columns, opening/closing Add-a-Card and
   the Briefing Card detail, the Settings screen (theme/font/warn-
   days/rollup depth), due/start-date math and the auto-escalation
   that bumps a card's priority, and the live-sync safe-render guard.

   Split out of briefing-board.js Sept 9, 2026 -- the file had grown
   past 8,000 lines (Code Growth Watch flags a split well before
   that). One earlier partial attempt at this split (Sept 5, 2026)
   left briefing-board-styles.js / briefing-board-screens.js /
   briefing-board-archive.js in the repo but never finished wiring
   them in -- briefing-board.js kept its own internal copies the
   whole time and nothing ever loaded those three files. This split
   replaces that abandoned attempt: styles.js and screens.js are
   regenerated fresh from the current code, archive.js's contents
   now live inside briefing-board-card.js, and archive.js itself is
   deleted.

   All eight pieces below share one global scope on the page (same
   as the single file did internally) -- there's no per-file wrapper
   and no namespace object, so every function/variable here is
   reachable by its plain name from any of the other seven files.
   Load order does not matter: nothing at the top level of any of
   these files calls into another file's code immediately -- it's
   all either a definition, a constant, or an event-listener
   registration whose callback runs later, once every file is
   already loaded.

   Sibling files: calls into briefing-board-card.js (card data), briefing-board-signal-flags.js (a card's key slots), and briefing-board-master.js (which board/cards are showing).
   ============================================================ */



  // July 22, 2026, Larry: Do split into 3 side-by-side columns by
  // priority family, so priority is visible on the board itself instead
  // of needing to flip a card -- "makes more visible on the BB screen."
  // H DO = HH/H, M DO = MH/M, L DO = ML/L. Doing/Done/Hang-Ups stay
  // single columns. See _bbDoFamily/_bbDoColKey/_bbIsDoCol just below
  // COLUMNS for the shared logic every other place in this file uses
  // to stay in sync with this split.
  // July 23, 2026 (later), Larry: originally ML lived in the M DO
  // column (rank-based split put HH/H | MH/M/ML | L). Larry now wants
  // dragging a card to the top of L DO to escalate it too ("L becomes
  // ML," same as H->HH and M->MH), so the split now matches the H/M/L
  // priority buttons' own pairing (PRI_BASE_OF / PRI_CYCLE below,
  // which already treated L:[L,ML] as a pair) -- H DO = HH/H, M DO =
  // MH/M, L DO = ML/L. Keeps the buttons and the drag columns agreeing
  // on where a card lands instead of fighting each other.
  var COLUMNS = [
    // July 23, 2026, Larry: DO-L used to double as the no-priority
    // bucket ("as an incentive to prioritize"), but Larry wants a real
    // 4th column for it instead -- NEW now holds anything that hasn't
    // been given a priority yet, and DO-L goes back to meaning plain L
    // only. Sits first so an untriaged card is the first thing seen.
    {key:'new',     label:'NEW'},
    // July 22, 2026 (later): Larry likes the red/green/yellow header
    // colors enough to drop the H/M/L letters entirely -- color alone
    // reads as priority now, plain "DO" on all 3.
    {key:'do-h',    label:'DO'},
    {key:'do-m',    label:'DO'},
    {key:'do-l',    label:'DO'},
    {key:'doing',   label:'Doing'},
    {key:'done',    label:'Done'},
    {key:'hangups', label:'Hang-Ups'}
  ];
  // Priority, corrected July 21, 2026 (second pass) -- 3 buttons (H, M,
  // L), each its own 3-click cycle that always escalates toward more
  // urgent: H:[H,HH,off], M:[M,MH,off], L:[L,ML,off]. PRI_BASE_OF maps
  // any stored value back to which of the 3 buttons "owns" it -- needed
  // because ML starts with the letter M but belongs to the L button.
  var PRIORITY_BASE = ['H','M','L'];
  var PRI_CYCLE = { H:['H','HH',''], M:['M','MH',''], L:['L','ML',''] };
  var PRI_BASE_OF = { H:'H', HH:'H', M:'M', MH:'M', L:'L', ML:'L' };
  // Rank: lower number sorts higher (H-side). HH is the most urgent
  // thing on the board; L is the least -- there's no lower rung than
  // plain L, since nothing escalates a low priority further down.
  var PRI_ORDER = {HH:0, H:1, MH:2, M:3, ML:4, L:5};
  // July 23, 2026 (later), Larry: MH/ML recolored off the H/L blend
  // onto a straight green gradient with M -- dark green (MH) -> medium
  // green (M, unchanged) -> light green (ML) -- easier to read at a
  // glance than the old red/yellow-tinted versions.
  var PRI_COLOR = {HH:'#7a0000', H:'#c0272a', MH:'#1f5c1f', M:'#3F8F3F', ML:'#b8ddb0', L:'#eeddaa'};
  var PRI_TEXT = {HH:'#fff', H:'#fff', MH:'#fff', M:'#fff', ML:'#1f3a1a', L:'#3B2510'};
  function _bbNextPriority(current, base){
    var seq=PRI_CYCLE[base];
    var idx = PRI_BASE_OF[current]===base ? seq.indexOf(current) : -1;
    return idx===-1 ? seq[0] : seq[(idx+1)%seq.length];
  }

  // July 22, 2026, Larry: the 3 Do columns (H DO / M DO / L DO). Family
  // is by RANK (see COLUMNS comment above), a different split than
  // PRI_BASE_OF's button-ownership grouping -- don't reuse PRI_BASE_OF
  // here, they answer different questions.
  function _bbDoFamily(priority){
    var rank = PRI_ORDER.hasOwnProperty(priority) ? PRI_ORDER[priority] : 7;
    if(rank<=1) return 'h';   // HH, H
    if(rank<=3) return 'm';   // MH, M
    if(rank<=5) return 'l';   // ML, L
    return 'new';             // unset -- no priority chosen yet (July 23, 2026)
  }
  // July 23, 2026: 'new' is the one family whose column key isn't
  // 'do-'+family (there's no "do-new") -- it's just 'new'.
  function _bbDoColKey(priority){
    var fam=_bbDoFamily(priority);
    return fam==='new' ? 'new' : 'do-'+fam;
  }
  function _bbIsDoCol(colKey){ return colKey==='new' || colKey==='do-h' || colKey==='do-m' || colKey==='do-l'; }
  // The representative priority a drag-drop into a given Do column sets
  // -- coarse (family only); the H/M/L buttons on the card back remain
  // the fine control for HH vs H, MH vs M vs ML, etc. Only overwrites
  // when the card's CURRENT priority isn't already in the target family,
  // so dragging a card within the family it's already in (reordering,
  // or a drop that lands back in the same column) never resets an
  // escalated value like HH or ML back down to its base.
  // July 23, 2026: DO-L's base is now 'L' (it no longer doubles as the
  // no-priority bucket -- that's NEW's job, base '').
  var _bbDoColBasePriority = {'new':'', 'do-h':'H', 'do-m':'M', 'do-l':'L'};
  function _bbPriorityForDrop(colKey, currentPriority){
    var fam = colKey==='new' ? 'new' : colKey.slice(3);
    if(_bbDoFamily(currentPriority)===fam) return currentPriority;
    return _bbDoColBasePriority[colKey];
  }
  // Aug 7 2026 -- Larry moved a card to MH at the top of the M column,
  // and on the very next render _bbAutoEscalateDates silently knocked it
  // back down to H/do-h -- the card had an arrived Start Date that had
  // never triggered the one-time date nudge yet, so the nudge fired for
  // the first time right on top of Larry's own fresh manual placement,
  // undoing it without any visible sign of what happened. The July 23
  // startEscalatedFor/dueEscalatedFor fields already stop the nudge from
  // firing a SECOND time once it's fired once -- this closes the gap for
  // the FIRST time: any manual priority/column decision (drag-drop or
  // the H/M/L buttons) stamps the card's current dates as already
  // handled, so a coincidentally-arrived date can't immediately override
  // a choice the traveler just made.
  function _bbStampDateEscalationHandled(c){
    if(c.startDate) c.startEscalatedFor=c.startDate;
    if(c.due) c.dueEscalatedFor=c.due;
  }

  var THEMES = [
    {key:'gold',   label:'Gold',   bg:'#FDF6E8', accent:'#C9A87C', ink:'#3B2510', sub:'#7A5C3A'},
    {key:'forest', label:'Forest', bg:'#EFF5EC', accent:'#8FBE8A', ink:'#1F3A1A', sub:'#3F6B3A'},
    {key:'ocean',  label:'Ocean',  bg:'#EAF3FB', accent:'#6FA8D9', ink:'#16324A', sub:'#3A6485'},
    {key:'rose',   label:'Rose',   bg:'#FBEFF2', accent:'#D98FA8', ink:'#4A1F2E', sub:'#7A4054'}
  ];
  var FONTS = [
    {key:'classic', label:'Classic', head:'"Playfair Display",serif', body:'Georgia,serif'},
    {key:'clean',   label:'Clean',   head:'"Segoe UI",Helvetica,Arial,sans-serif', body:'"Segoe UI",Helvetica,Arial,sans-serif'}
  ];
  var _bbOpenCardId = null;
  var _bbAddStatusTimer = null;
  // Overdue pink-flash, Aug 15 2026 -- ids that _bbAutoEscalateDates just
  // discovered are newly overdue on THIS pass, so renderBoard's card
  // loop knows to play the one-time flash animation instead of just the
  // steady pink face it draws every time regardless.
  var _bbOverdueFlashIds = [];

  // Initials for the card-face badge, July 21, 2026 (evening) -- Assigned
  // To is a free-text stand-in field (e.g. "Doc (Larry E. Smithers)"),
  // so the full name never fit in the small round badge. If the text
  // has a parenthetical, that's treated as the real name to derive
  // initials from (favoring "LS" over "D" for "Doc (Larry E. Smithers)");
  // otherwise the initials come from the string as typed. First + last
  // word, matching the same two-letter convention already used for the
  // traveler roster (BF, JG, RB, LM, JB, LS).
  function _bbInitialsFromName(name){
    var letters=String(name||'').trim().split(/\s+/).map(function(w){ return w.replace(/[^A-Za-z]/g,''); }).filter(function(w){ return w.length>0; });
    if(!letters.length) return '';
    if(letters.length===1) return letters[0].charAt(0).toUpperCase();
    return (letters[0].charAt(0)+letters[letters.length-1].charAt(0)).toUpperCase();
  }

  // Assigned To / member roster picker -- retired Session 234 (Aug 21,
  // Larry: "add the same bottom row as on the IDEA CARD to the BB
  // Cards... twin heads"). Used to populate a select from a
  // 'briefing_roster' table that never actually existed in Supabase
  // (confirmed via list_tables -- always silently failed, caught by its
  // own try/catch), so nothing here was ever really live; the 👥 people
  // dropdown (wireBbDetailActions, T2TStoryboard.openPeopleDropdown)
  // is the one place to put someone on a card now, same as the Idea
  // Card. _bbInitials just below used to be kept on as the legacy-
  // fallback initials source for any card nobody's starred yet in Cast
  // -- Aug 30 2026, that fallback turned out to be the whole bug (see
  // the corner-badge comment in renderBoard above), so it's no longer
  // called from anywhere. Left in place, unused, rather than deleted --
  // harmless either way, and removing it isn't part of this fix.

  function _bbInitials(person){
    if(!person) return '';
    var m=String(person).match(/\(([^)]+)\)/);
    var src=(m?m[1]:person).trim();
    var letters=src.split(/\s+/).map(function(w){ return w.replace(/[^A-Za-z]/g,''); }).filter(function(w){ return w.length>0; });
    if(!letters.length) return '';
    if(letters.length===1) return letters[0].charAt(0).toUpperCase();
    return (letters[0].charAt(0)+letters[letters.length-1].charAt(0)).toUpperCase();
  }

  // Due date parsing: the field is free text like "7/25" (no year).
  // Assume the current year; if that reading would already be more than
  // ~half a year in the past, it almost certainly means next year (e.g.
  // typing "1/5" in December) rather than last January.
  function _bbParseDue(s){
    if(!s) return null;
    var m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if(!m) return null;
    var mo=parseInt(m[1],10)-1, da=parseInt(m[2],10);
    var now=new Date();
    var yr=m[3] ? (m[3].length===2?2000+parseInt(m[3],10):parseInt(m[3],10)) : now.getFullYear();
    var d=new Date(yr, mo, da);
    if(isNaN(d.getTime())) return null;
    if(!m[3]){
      var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if(d-today < -182*86400000) d=new Date(yr+1, mo, da);
    }
    return d;
  }
  function _bbDaysUntil(d){
    var now=new Date();
    var today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((d-today)/86400000);
  }
  function _bbDaysUntilOrInf(c){
    var d=_bbParseDue(c.due);
    return d ? _bbDaysUntil(d) : Infinity;
  }

  // Overdue pink-face signal, Aug 15 2026, Larry: "pink faced card" for
  // anything whose due date has passed. Deliberately independent of
  // priority (see the HH bump in _bbAutoEscalateDates below) -- Larry
  // pulled a card back down from an auto-escalated HH once already, so
  // this reads the calendar fact on its own rather than piggybacking on
  // a priority the traveler may have deliberately overridden. Excludes
  // Done (finished work can't be overdue) and Hang-Ups (already owns
  // its own red signal) -- matches the Do/Doing scope of the HH bump
  // plus Hang-Ups' existing color. "Overdue" means the date has fully
  // passed, not just arrived today (_bbDaysUntil < 0, not <= 0).
  function _bbIsOverdue(c){
    if(!c || c.archived || c.trashedAt) return false;
    if(c.col==='done' || c.col==='hangups') return false;
    var d=_bbParseDue(c.due);
    if(!d) return false;
    return _bbDaysUntil(d) < 0;
  }

  // Missed Start Date pink-face, Aug 27 2026, Larry: "What if a missed
  // START DATE turns a card pink like a missed DUE DATE and moves it to
  // HIGH priority?" -- the HIGH-priority part already existed (July 22
  // 2026, the startEscalatedFor bump in _bbAutoEscalateDates below), so
  // this only adds the pink half, same "fully passed, not just arrived
  // today" rule as _bbIsOverdue. Scoped to _bbIsDoCol (new/do-h/do-m/
  // do-l) rather than done/hangups like the due-date version -- a
  // missed START only means anything while the card genuinely hasn't
  // started yet; once it's in Doing it has started, late or not, so
  // there's nothing left to flag.
  function _bbIsStartOverdue(c){
    if(!c || c.archived || c.trashedAt) return false;
    if(!_bbIsDoCol(c.col)) return false;
    var d=_bbParseDue(c.startDate);
    if(!d) return false;
    return _bbDaysUntil(d) < 0;
  }

  // Larry, July 20, 2026: anything WITH a priority outranks anything
  // without one (unset already sorts last, rank 7, below L's 5). On top
  // of that, a near or passed due date pulls a card's effective rank up
  // for sorting purposes -- it might carry an L, but a due date due
  // today (or overdue) says otherwise. This only ever moves a card UP
  // (toward HH), never down -- a due date can't make an HH card less
  // urgent. The card still shows whatever priority was actually set;
  // this effective rank is for sort order only.
  // (A Start Date that's arrived while still in Do used to get this
  // same sort-only treatment -- July 22, 2026, Larry asked for that one
  // to be a real change instead: see _bbAutoEscalateDates, called
  // from renderBoard, which actually sets c.priority to H so the card's
  // own badge tells the truth, not just its position in the list.)
  function _priRank(c){
    var base = PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
    var rank = base;
    var daysUntil = _bbDaysUntilOrInf(c);
    if(daysUntil!==Infinity){
      if(daysUntil<=0) rank=Math.min(rank, 0);      // due today or overdue -> at least HH
      else if(daysUntil<=2) rank=Math.min(rank, 1); // due very soon -> at least H
      else if(daysUntil<=5) rank=Math.min(rank, 2); // due soon -> at least MH
    }
    return rank;
  }

  // July 23, 2026 (later), Larry: caught a real bug -- an ML card had
  // drifted to sort_order 0 in DO-M, tied with an MH card and sitting
  // above two plain M cards. Escalating/de-escalating a card's priority
  // (drag-to-top/bottom, the H/M/L buttons, or the date auto-escalation
  // below) was only ever changing the badge, never its actual position
  // -- "HH over H" / "MH over M over ML" was true in theory but not
  // enforced on the board. This re-sorts one Do column by priority rank
  // (HH/H in do-h, MH/M/ML in do-m -- do-l and new are single-value
  // families, always a no-op) and renumbers sort_order sequentially.
  // Stable sort, so cards that share a priority keep whatever relative
  // order they already had -- this only fixes rank violations, it
  // doesn't reshuffle same-priority cards against each other. Called
  // after anything that can change a Do-column card's priority.
  function _bbResortDoColumnByPriority(colKey){
    if(!_bbIsDoCol(colKey) || colKey==='new') return;
    var all=_bbCardsList();
    var colCards=all.filter(function(c){ return !c.archived && !c.locked && c.col===colKey; });
    colCards.sort(function(a,b){
      var soa=(typeof a.sortOrder==='number')?a.sortOrder:Infinity;
      var sob=(typeof b.sortOrder==='number')?b.sortOrder:Infinity;
      return (soa-sob) || 0;
    });
    colCards.sort(function(a,b){
      var ra=PRI_ORDER.hasOwnProperty(a.priority)?PRI_ORDER[a.priority]:7;
      var rb=PRI_ORDER.hasOwnProperty(b.priority)?PRI_ORDER[b.priority]:7;
      return ra-rb; // stable -- ties keep the sortOrder-based order set above
    });
    colCards.forEach(function(c, idx){ c.sortOrder=idx; });
  }

  // July 22, 2026, Larry: an arrived Start Date while a card sits in Do
  // ("scheduled to begin, hasn't actually begun") now bumps its ACTUAL
  // priority to H, not just its sort position -- the badge itself
  // should say H, so anyone glancing at the card sees why it jumped.
  // Only escalates (never overrides an already-more-urgent H or HH),
  // and only touches Do -- moving into Doing/Done stops the escalation
  // from re-triggering (the card just keeps whatever priority it had
  // when it moved). Runs every render; harmless to repeat since once a
  // card is at H or HH this is a no-op.
  function _bbAutoEscalateDates(){
    // Always scans + saves the FULL unfiltered list (not whatever
    // subset renderBoard happens to be working with) -- _bbSaveLocal
    // replaces _bbCards wholesale, so handing it a filtered array would
    // quietly drop every archived card from storage.
    // July 22, 2026, Larry: extended same day to Due Date -> HH (while
    // still in Do or Doing -- due date matters right up until the work
    // is actually done, not just before it starts), and made the
    // advance notice a traveler choice in Gear instead of a fixed "on
    // the day" rule -- "how much advance notice do I need to get
    // something done?" differs by person. bb-start-warn-days /
    // bb-due-warn-days (0 by default, matching the original on-the-day
    // behavior) control how many days BEFORE the date each fires. This
    // sits alongside, not instead of, the older graduated due-date
    // sort-only nudges in _priRank (5 days / 2 days out) -- those still
    // just nudge sort position; this is the point the badge itself
    // actually changes.
    // July 23, 2026 (later), Larry: real bug -- this ran on every
    // render, so a card with a past-due start/due date got pulled back
    // to H/HH and DO-H the instant a traveler dragged it anywhere else
    // ("Items in H cannot be moved to other priorities"). It's meant to
    // be a one-time nudge the moment a date arrives, not a standing rule
    // that overrides a manual decision forever. c.startEscalatedFor /
    // c.dueEscalatedFor now remember which date value already triggered
    // the bump, so it only fires again if the date itself changes to
    // something new -- a traveler's manual drag/reprioritization after
    // the nudge sticks.
    var all=_bbCardsList();
    var changed=false;
    var startWarn=_bbStartWarnDays(), dueWarn=_bbDueWarnDays();
    _bbOverdueFlashIds = [];
    all.forEach(function(c){
      if(c.archived) return;
      // Overdue pink-flash, Aug 15 2026 -- stamped independently of the
      // HH priority bump just below (see _bbIsOverdue). Only remembers
      // c.due's value, same pattern as startEscalatedFor/dueEscalatedFor,
      // so it fires again if the due date itself changes to something new.
      if(_bbIsOverdue(c) && c.overdueFlashShownFor!==c.due){
        _bbOverdueFlashIds.push(c.id);
        c.overdueFlashShownFor=c.due;
        changed=true;
      }
      // Missed Start Date pink-flash, Aug 27 2026 -- same one-time-per-
      // value pattern, its own remembered stamp (startOverdueFlashShownFor)
      // since it's keyed off startDate, not due. Pushed into the same
      // _bbOverdueFlashIds list as the due-date flash above -- the
      // render code just checks membership, it doesn't care which date
      // caused it, so one card can't double-flash for having both.
      if(_bbIsStartOverdue(c) && c.startOverdueFlashShownFor!==c.startDate){
        if(_bbOverdueFlashIds.indexOf(c.id)===-1) _bbOverdueFlashIds.push(c.id);
        c.startOverdueFlashShownFor=c.startDate;
        changed=true;
      }
      // July 22, 2026: c.col is now one of do-h/do-m/do-l, not a single
      // 'do' -- _bbIsDoCol covers all 3. When priority changes here,
      // also move the card into whichever Do column now matches (if
      // it's still in Do at all -- Due Date's HH bump can fire from
      // Doing too, and a card sitting in Doing doesn't jump back into
      // a Do column just because its priority changed).
      if(_bbIsDoCol(c.col) && c.startDate && c.startEscalatedFor!==c.startDate){
        var sd=_bbParseDue(c.startDate);
        if(sd && _bbDaysUntil(sd)<=startWarn){
          var curRank=PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
          if(curRank>PRI_ORDER.H){ c.priority='H'; c.col=_bbDoColKey(c.priority); changed=true; }
          c.startEscalatedFor=c.startDate;
        }
      }
      if((_bbIsDoCol(c.col) || c.col==='doing') && c.due && c.dueEscalatedFor!==c.due){
        var dd=_bbParseDue(c.due);
        if(dd && _bbDaysUntil(dd)<=dueWarn){
          var curRank2=PRI_ORDER.hasOwnProperty(c.priority) ? PRI_ORDER[c.priority] : 7;
          if(curRank2>PRI_ORDER.HH){
            c.priority='HH';
            if(_bbIsDoCol(c.col)) c.col=_bbDoColKey(c.priority);
            changed=true;
          }
          c.dueEscalatedFor=c.due;
        }
      }
    });
    if(changed){
      _bbResortDoColumnByPriority('do-h');
      _bbResortDoColumnByPriority('do-m');
      _bbResortDoColumnByPriority('do-l');
      _bbSaveLocal(all);
    }
    return changed;
  }

  function _bbApplyTheme(themeKey){
    var t=THEMES.filter(function(x){ return x.key===themeKey; })[0]; if(!t) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-bg', t.bg);
    fgr.style.setProperty('--bb-accent', t.accent);
    fgr.style.setProperty('--bb-ink', t.ink);
    fgr.style.setProperty('--bb-sub', t.sub);
    try{ sessionStorage.setItem('bbTheme', themeKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbApplyFont(fontKey){
    var f=FONTS.filter(function(x){ return x.key===fontKey; })[0]; if(!f) return;
    var fgr=document.getElementById('fg-root'); if(!fgr) return;
    fgr.style.setProperty('--bb-head-font', f.head);
    fgr.style.setProperty('--bb-body-font', f.body);
    try{ sessionStorage.setItem('bbFont', fontKey); }catch(e){}
    _bbHighlightAppearance();
  }
  function _bbCurrentTheme(){
    try{ return sessionStorage.getItem('bbTheme')||'gold'; }catch(e){ return 'gold'; }
  }
  function _bbCurrentFont(){
    try{ return sessionStorage.getItem('bbFont')||'classic'; }catch(e){ return 'classic'; }
  }
  // July 22, 2026, Larry: advance-warning windows are a traveler choice,
  // not a fixed rule -- "how much advance notice do I need to get
  // something done?" differs by person. Stored in localStorage (unlike
  // theme/font, which are session-only) since this is a "set it and
  // forget it" preference, not a quick per-visit pick. 0 reproduces the
  // original hardcoded behavior (escalate exactly on/after the date).
  function _bbStartWarnDays(){
    try{ var v=parseInt(localStorage.getItem('bbStartWarnDays'),10); return isNaN(v)?0:Math.max(0,v); }
    catch(e){ return 0; }
  }
  function _bbDueWarnDays(){
    try{ var v=parseInt(localStorage.getItem('bbDueWarnDays'),10); return isNaN(v)?0:Math.max(0,v); }
    catch(e){ return 0; }
  }
  function _bbSetStartWarnDays(n){
    try{ localStorage.setItem('bbStartWarnDays', String(Math.max(0, parseInt(n,10)||0))); }catch(e){}
  }
  function _bbSetDueWarnDays(n){
    try{ localStorage.setItem('bbDueWarnDays', String(Math.max(0, parseInt(n,10)||0))); }catch(e){}
  }
  function _bbHighlightAppearance(){
    var curTheme=_bbCurrentTheme(), curFont=_bbCurrentFont();
    document.querySelectorAll('.bb-theme-swatch').forEach(function(el){
      el.classList.toggle('bb-swatch-active', el.getAttribute('data-theme')===curTheme);
    });
    document.querySelectorAll('.bb-font-btn').forEach(function(el){
      el.classList.toggle('bb-flag-active', el.getAttribute('data-font')===curFont);
    });
  }

  // Drag-by-header, July 20, 2026 -- Larry: New Card and Back of the
  // Card should be movable "for visual convenience" (so the board
  // underneath can be peeked at while one is open). Starts centered
  // (the existing flex-centered default) every time it opens; only
  // switches to an explicit fixed position once the traveler actually
  // grabs the header bar and drags. Position resets on next open.
  function _bbResetCardPosition(cardEl){
    if(!cardEl) return;
    cardEl.style.position=''; cardEl.style.left=''; cardEl.style.top=''; cardEl.style.margin='';
  }
  function _bbMakeDraggable(cardEl, headEl){
    if(!cardEl || !headEl) return;
    var dragging=false, startX=0, startY=0, startLeft=0, startTop=0;
    function onDown(e){
      if(e.target.closest('.bb-close')) return; // the X still just closes
      var pt = e.touches ? e.touches[0] : e;
      var rect=cardEl.getBoundingClientRect();
      dragging=true;
      startX=pt.clientX; startY=pt.clientY;
      startLeft=rect.left; startTop=rect.top;
      cardEl.style.position='fixed';
      cardEl.style.margin='0';
      cardEl.style.left=startLeft+'px';
      cardEl.style.top=startTop+'px';
      headEl.style.cursor='grabbing';
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      cardEl.style.left=(startLeft+(pt.clientX-startX))+'px';
      cardEl.style.top=(startTop+(pt.clientY-startY))+'px';
      e.preventDefault();
    }
    function onUp(){ dragging=false; headEl.style.cursor='grab'; }
    headEl.style.cursor='grab';
    headEl.addEventListener('mousedown', onDown);
    headEl.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('mousemove', onMove, {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  function renderBoard(){
    var wrap=document.getElementById('bb-cols'); if(!wrap) return;
    wrap.innerHTML='';
    // Board-name eyebrow fallback, Sept 5 2026 -- the currently-open
    // board's own name, used below so a plain hand-typed card (no
    // header link, no topic_label) still gets a board-name eyebrow
    // like header-derived cards already have.
    var _bbHomeBoardRow=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
    var _bbHomeBoardName=_bbHomeBoardRow ? (_bbHomeBoardRow.name||'') : '';
    var _keyLib=_bbLoadKeyLibrary();
    _bbAutoEscalateDates();
    var cards=_bbCardsList().filter(function(c){ return !c.archived && !c.trashedAt; });
    if(_bbForeignCards && _bbForeignCards.length) cards = cards.concat(_bbForeignCards.filter(function(c){ return !c.archived && !c.trashedAt; }));
    if(_bbSharedInCards && _bbSharedInCards.length) cards = cards.concat(_bbSharedInCards.filter(function(c){ return !c.archived && !c.trashedAt; }));
    // Master Briefing Board rollup, Sept 5 2026 -- only ever populated
    // (_bbLoadMasterRollupCards, called from _bbSwitchToBoard right
    // after _bbRenderTopicField) when this board's own TOPIC is a
    // project root; empty everywhere else, so a descended-into layer's
    // board stays exactly what Larry asked for -- "the only cards
    // visible at any layer are those pertaining to that layer."
    if(_bbRollupCards && _bbRollupCards.length) cards = cards.concat(_bbRollupCards.filter(function(c){ return !c.archived && !c.trashedAt; }));
    cards = _bbProjectFilterCards(cards);
    cards = _bbSourceFilterCards(cards);
    // Primary-doer warm-up, Session 234 (Aug 21) -- same fire-and-forget
    // fetch-then-conditional-re-render pattern session.js already uses
    // for the Idea Board (T2TStoryboard.ensureCardPrimary), generalized
    // here via ensureCardPrimaryRaw for card_type:'briefing_card'. Feeds
    // both the corner badge (dotHTML below) and _bbSourceFilterCards's
    // person-mode match.
    if(window.T2TStoryboard && T2TStoryboard.ensureCardPrimaryRaw){
      var _bbPrimaryIds=cards.map(function(c){ return c.id; }).filter(Boolean);
      T2TStoryboard.ensureCardPrimaryRaw('briefing_card', _bbPrimaryIds).then(function(fetchedSomething){ if(fetchedSomething) renderBoard(); });
    }
    COLUMNS.forEach(function(cd){
      var col=document.createElement('div');
      col.className='bb-col';
      col.setAttribute('data-col', cd.key);
      col.innerHTML='<div class="bb-col-head">'+cd.label+'</div>'
        +'<div class="bb-col-cards" data-col="'+cd.key+'"></div>'
        +(cd.key==='new' ? '<div class="bb-add-tile" id="bb-add-tile">+ new card</div>' : '');
      wrap.appendChild(col);
    });
    // July 22, 2026 (later), Larry: wants to freely drag a card to a
    // new position WITHIN a column, not just between columns. Position
    // is now c.sortOrder (manual, set by dragging -- see the drop
    // handler below), primary sort key. Priority/due-date rank is only
    // the fallback for a card that doesn't have a sortOrder yet (brand
    // new, or not yet migrated) -- it no longer governs position for
    // anything that's actually been placed. Which Do column a card is
    // IN is still priority-driven (see _bbDoColKey); this only affects
    // order WITHIN whichever column it's already in.
    COLUMNS.forEach(function(cd){
      var target=wrap.querySelector('.bb-col-cards[data-col="'+cd.key+'"]');
      if(!target) return;
      var colCards=cards.filter(function(c){ return c.col===cd.key; });
      colCards.sort(function(a,b){
        var soa=(typeof a.sortOrder==='number')?a.sortOrder:Infinity;
        var sob=(typeof b.sortOrder==='number')?b.sortOrder:Infinity;
        if(soa!==sob) return soa-sob;
        var ra=_priRank(a), rb=_priRank(b);
        if(ra!==rb) return ra-rb;
        return _bbDaysUntilOrInf(a)-_bbDaysUntilOrInf(b);
      });
      colCards.forEach(function(c){
        var el=document.createElement('div');
        // Overdue pink-face, Aug 15 2026 -- bb-overdue is the steady
        // state (recomputed fresh every render, so it's always right
        // even for a card nobody's touched since it went overdue);
        // bb-overdue-flash only lands on whichever cards
        // _bbAutoEscalateDates just discovered are newly overdue THIS
        // pass, so the alarm-flash animation plays once, not every
        // reload.
        // Aug 27 2026 -- a missed Start Date reads as the same pink
        // signal as a missed Due Date; see _bbIsStartOverdue above.
        var _bbStartIsOverdue=_bbIsStartOverdue(c);
        var cardIsOverdue=_bbIsOverdue(c)||_bbStartIsOverdue;
        var cardJustWentOverdue=_bbOverdueFlashIds.indexOf(c.id)!==-1;
        el.className='bb-card'+(c._foreign?' bb-card-foreign':'')
          +(cardIsOverdue?' bb-overdue':'')+(cardJustWentOverdue?' bb-overdue-flash':'');
        el.draggable=true;
        el.setAttribute('data-id', c.id);
        if(c.color) el.style.background=c.color;
        // Corner badge, Session 234 (Aug 21) -- 👥's ★ primary doer is
        // the one and only source (same as the Idea Card's own badge).
        // cardPrimaryUidRaw returns undefined before this pass's
        // ensureCardPrimaryRaw fetch lands (reads as "nothing yet" until
        // then -- next re-render fills it in), null once fetched with
        // nobody starred, or a uid.
        //
        // Aug 30 2026 fix (Larry: "I opened a BB card with my initials on
        // it. When I looked at the Cast card, it says Nobody yet?") --
        // this used to fall back to the legacy `person` free-text field
        // (pre-Cast, retired as a picker back in Session 234) whenever
        // Cast itself was empty. Since essentially no Briefing Card had
        // ever been given a real Cast entry, that fallback was firing on
        // ~50 cards board-wide: the corner showed initials pulled from
        // the old text field, while Cast -- the only place initials can
        // actually be added or removed -- had nothing on it and
        // correctly said "Nobody yet." Removing someone in Cast could
        // never make the badge disappear, because the badge was never
        // reading Cast in the first place. Fixed at the data level (every
        // affected card's legacy `person` value was matched to a real
        // member and written as a genuine Cast Primary row, one time, so
        // nothing visibly changed for Larry) and here at the display
        // level: the badge now reads Cast only, so it can never again
        // show someone Cast itself doesn't know about.
        var _bbPrimaryUid = (window.T2TStoryboard && T2TStoryboard.cardPrimaryUidRaw) ? T2TStoryboard.cardPrimaryUidRaw('briefing_card', c.id) : undefined;
        var _bbPrimaryInfo = (_bbPrimaryUid && window.T2TStoryboard && T2TStoryboard.memberInfo) ? T2TStoryboard.memberInfo(_bbPrimaryUid) : null;
        // "Hide initials on front" (Aug 28 2026) -- checked first, same as
        // the Idea Card's own badge-render function, so the per-card switch
        // on the assignment screen actually suppresses this corner badge.
        var dotHTML = (c.hidePrimaryBadge || !_bbPrimaryInfo) ? '' : ('<span class="bb-dot" style="background:#9c8b73" title="'+_esc(_bbPrimaryInfo.name||'')+'">'+_esc(_bbPrimaryInfo.initials||'')+'</span>');
        var foreignBadge = c._foreign ? ('<span class="bb-foreign-badge" title="From '+_esc(c._homeBoardName)+' — open it there to edit. Priority here is independent; moving it into or out of Doing/Done/Hang-Ups updates both boards.">'+_esc(c._homeBoardName)+'</span>') : '';
        var priBadge = c.priority ? '<span class="bb-pri-badge" style="background:'+PRI_COLOR[c.priority]+';color:'+PRI_TEXT[c.priority]+'">'+c.priority+'</span>' : '';
        var routineBadge = c.routine ? '<span class="bb-routine-badge" title="Routine card">🔄</span>' : '';
        // Lock badge moved into the bottom-left signal cluster, Aug 15
        // 2026 (Larry: "is the LOCK not just another FLAG?") -- was up
        // top with priority/routine/date; now reads as one more signal
        // alongside Signal Flags/Notes/Link, same corner every time.
        var lockBadge = c.locked ? '<span class="bb-lock-badge" title="Locked — parked here, paused before its turn. Was in progress; worth asking why.">🔒</span>' : '';
        // Notes badge moved into the bottom-left corner alongside the
        // Signal Flags, Aug 11 2026 (Larry: move it down "with other
        // signal flags") -- was up top with the other card badges;
        // now renders inside .bb-key-badges below instead, so every
        // per-card "signal" lives in the same corner.
        var notesBadge = (c.notes && c.notes.trim()) ? '<span class="bb-notes-badge" title="Has notes">✏️</span>' : '';
        var linkBadge = (c.linkUrl && c.linkUrl.trim()) ? '<a class="bb-link-badge" href="'+_esc(c.linkUrl)+'" target="_blank" rel="noopener" draggable="false" title="Open link">🎬</a>' : '';
        // Larry, July 20, 2026: no date shown at all until a START DATE
        // exists (manually set in advance, or auto-stamped the moment
        // this card first moves into Doing) -- the quieter "date added
        // to the board" (c.assigned) is still recorded for later, just
        // not displayed here; not important enough to take up card-face
        // space, though it does show read-only on the back of the card.
        var startBadge = c.startDate ? '<span class="bb-date">'+_esc(c.startDate)+'</span>' : '';
        // Aug 30 2026, Larry: "When date passes intended START DATE, Add
        // START DUE: (date) to front of pink card" -- then, seeing the
        // first pass land it as a relabel of the top-row date badge
        // (next to priority/routine): "No. the START DUE date should
        // appear under the task and above the DUE date, if any." So
        // this is its own line instead, matching where bb-done-date
        // already sits relative to bb-task/bb-bottom, and only shows up
        // once the Start Date has actually passed (the same
        // _bbIsStartOverdue check that turns the card pink) -- the
        // top-row badge above goes back to always just the bare date,
        // exactly as it was before this feature existed.
        var startDueLine = _bbStartIsOverdue ? ('<div class="bb-start-due">START DUE: '+_esc(c.startDate)+'</div>') : '';
        // Signal Flags row, bottom-left corner -- Notes badge joined
        // this group Aug 11 2026 (Larry: move it down "with other
        // signal flags") instead of sitting up top with the rest of
        // the badges, so the pencil-if-there-are-Notes marker and the
        // card's actual Signal Flags read together as one cluster.
        var keyBadgesHTML = (c.keys && c.keys.some(function(k){ return k; })) ? c.keys.filter(function(kid){ return kid; }).map(function(kid){
              var k=_keyLib.filter(function(x){ return x.id===kid; })[0];
              if(!k) return '';
              // Link count removed from the card front, Aug 15 2026
              // (Larry: "delete number of like flags from front of
              // every type of card") -- the count still comes through
              // on hover, via the title tooltip below; only the visible
              // on-face number is gone. A key's count is exactly how
              // many other cards/ideas currently share that same key
              // (that's what auto-linking connects), read straight from
              // _bbKeyLinkCountCache rather than the card-wide total
              // badge, which lumps every key together.
              var lc=(_bbKeyLinkCountCache[c.id] && _bbKeyLinkCountCache[c.id][kid]) || 0;
              return '<span class="bb-key-badge-wrap" title="'+_esc(k.meaning||'')+(lc?' — '+lc+' linked via this flag':'')+'">'
                +'<span class="bb-key-badge" style="'+_bbShapeCSS(k.shape,k.color)+'"></span>'
                +'</span>';
            }).join('') : '';
        // TOPIC eyebrow, Aug 11 2026 (Larry) -- header-linked task cards
        // (c.topicLabel set by the DB trigger, see _bbRowToCard) show which
        // TOPIC they came from right above the task line, same small-caps
        // treatment as the board-header eyebrows elsewhere on this screen.
        // Skip it when it would just repeat the task line verbatim (Aug 16
        // 2026 -- Larry found a card reading its own name twice, once in
        // the eyebrow and once as the task, after the task line had been
        // hand-edited to drop its usual "Develop " prefix) -- the eyebrow
        // only earns its place on the card when it's telling you something
        // the task line doesn't already say.
        //
        // Extended Sept 5 2026 (Larry: "what if every BB card listed its
        // BB with an eyebrow above the task") -- a plain hand-typed native
        // card has no topic_label, so it used to show nothing here at
        // all. Now it falls back to naming the board it's actually
        // sitting on. Foreign/merged cards are deliberately left out of
        // this fallback (corrected same day -- a foreign card with no
        // topic_label was showing its home board name here AND in the
        // dashed-border badge just below, same text twice on one card)
        // -- foreignBadge already names a foreign card's home board, so
        // this line only needs the fallback for cards that actually live
        // here.
        // One-board model fix, Sept 8 2026 -- since Session 275 put every
        // project onto one shared board literally named "PROJECTS," the
        // old fallback (home board name) made every card missing a
        // topicLabel show the same generic "PROJECTS" eyebrow, no matter
        // which real project it belonged to -- backwards from the whole
        // point of an eyebrow. Falls back to the card's own project name
        // (via projectHeaderId, resolved through _bbProjectNameById)
        // first; only a card with no project assigned at all falls
        // through to the shared board's name now.
        var topicEyebrowText = (c.topicLabel||'').trim()
          || (c.projectHeaderId && _bbProjectNameById[c.projectHeaderId])
          || (c._foreign ? '' : _bbHomeBoardName);
        var topicEyebrow = (topicEyebrowText && topicEyebrowText.toLowerCase()!==String(c.task||'').trim().toLowerCase())
          ? ('<div class="bb-card-eyebrow">'+_esc(topicEyebrowText)+'</div>') : '';
        el.innerHTML='<div class="bb-top"><span class="bb-top-left">'+routineBadge+priBadge+startBadge+'</span>'+dotHTML+'</div>'
          +(foreignBadge ? ('<div class="bb-foreign-row">'+foreignBadge+'</div>') : '')
          +topicEyebrow
          +'<div class="bb-task">'+_esc(c.task)+'</div>'
          +startDueLine
          +'<div class="bb-bottom"><span>'+_esc(c.budget||'')+'</span><span class="bb-due">'+(c.due?('DUE: '+_esc(c.due)):'')+'</span></div>'
          +(c.col==='done' && c.completedDate ? ('<div class="bb-done-date">COMPLETED: '+_esc(c.completedDate)+'</div>') : '')
          +((lockBadge || notesBadge || linkBadge || keyBadgesHTML) ? ('<div class="bb-key-badges">'+lockBadge+keyBadgesHTML+notesBadge+linkBadge+'</div>') : '');
        el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', String(c.id)); });
        // Double-click opens the card (Aug 11 2026, Larry). Used to be a
        // second, faster way in alongside a corner-flip triangle; the
        // corner-flip was removed Sept 6 2026 (Larry: "remove the gray
        // corners flip option from all cards. Just double click to open
        // cards.") so double-click is now the only way in.
        el.addEventListener('dblclick', function(e){ e.stopPropagation(); openCardDetail(c.id); });
        target.appendChild(el);
      });
    });
    // July 22, 2026, Larry: dragging a card should be able to land it at
    // a specific spot within a column, not just change which column it's
    // in. Standard "closest sibling by vertical midpoint" technique --
    // compares the drop's Y position against each existing card's
    // midpoint to find which one it belongs before (null = belongs at
    // the end, after everything).
    function _bbCardBefore(zone, y, excludeId){
      var els=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
        .filter(function(el){ return el.getAttribute('data-id')!==excludeId; });
      var closest={offset:-Infinity, el:null};
      els.forEach(function(el){
        var box=el.getBoundingClientRect();
        var offset=y-box.top-box.height/2;
        if(offset<0 && offset>closest.offset) closest={offset:offset, el:el};
      });
      return closest.el;
    }
    wrap.querySelectorAll('.bb-col-cards').forEach(function(zone){
      zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('bb-dragover'); });
      zone.addEventListener('dragleave', function(){ zone.classList.remove('bb-dragover'); });
      zone.addEventListener('drop', function(e){
        e.preventDefault();
        zone.classList.remove('bb-dragover');
        var id=e.dataTransfer.getData('text/plain');
        var c=_bbCardsList().filter(function(x){ return x.id===id; })[0];
        if(!c){
          var fc=_bbForeignCards.filter(function(x){ return x.id===id; })[0];
          if(fc){ _bbHandlePersonalBoardDrop(zone, e, id); return; }
          var sc=_bbSharedInCards.filter(function(x){ return x.id===id; })[0];
          if(sc){ _bbHandleSharedInDrop(zone, e, id); return; }
          // Sept 7 2026 fix (Larry) -- the exact same missed-source gap
          // as the open/edit lookups above, just on the drop side: a
          // rolled-up card dragged between columns used to hit this
          // same dead end and silently do nothing (the very thing that
          // made a NEW-column rollup card look stuck -- no visible way
          // to move it into a priority column at all).
          var rc=_bbRollupCards.filter(function(x){ return x.id===id; })[0];
          if(rc){ _bbHandleRollupDrop(zone, id, rc); return; }
          return;
        }
        if(c){
          var wasCol=c.col;
          var _bbMoveBefore=_bbSnapshotCard(c);
          c.col=zone.getAttribute('data-col');
          // July 22, 2026: dropping a card into one of the 3 Do columns
          // sets its priority to match (coarse -- H DO/M DO/L DO), same
          // as the H/M/L buttons but reachable by drag now too. Doesn't
          // touch priority when dragging into Doing/Done/Hang-Ups --
          // only the 3 Do columns are priority-linked.
          if(_bbIsDoCol(c.col)) c.priority=_bbPriorityForDrop(c.col, c.priority);
          // Start Date addition, Aug 27 2026 -- auto-stamping it (below,
          // pre-existing) is pointless if the checkbox that shows it
          // stays unchecked, so open it here too.
          if(c.col==='doing' && _bbIsDoCol(wasCol) && !c.startDate){ c.startDate=_bbToday(); c.addStart=true; }
          if(c.col==='done' && wasCol!=='done') c.completedDate=_bbToday();
          if(wasCol==='done' && c.col!=='done'){ c.completedDate=''; c.verified=false; c.pro=false; c.grow=false; }
          // Hang-Ups, July 21, 2026: stamp when a card lands here, clear
          // when it leaves -- the stamp tracks the *current* stuck streak.
          // Situation and the linked storyboard Header are left alone on
          // exit (that record stays even after it's unstuck).
          if(c.col==='hangups' && wasCol!=='hangups') c.hangupSince=_bbToday();
          if(wasCol==='hangups' && c.col!=='hangups') c.hangupSince='';
          // Land it at the exact drop position, then renumber this
          // column's sortOrder sequentially so everyone's position is
          // consistent (avoids float-precision drift from repeated
          // between-two-numbers interpolation over many reorders).
          var beforeEl=_bbCardBefore(zone, e.clientY, id);
          var order=Array.prototype.slice.call(zone.querySelectorAll('.bb-card'))
            .map(function(el){ return el.getAttribute('data-id'); })
            .filter(function(cid){ return cid!==id; });
          var insertAt=beforeEl ? order.indexOf(beforeEl.getAttribute('data-id')) : order.length;
          // The card it's landing directly above -- i.e. the one it
          // displaces downward. Captured before the splice below so it
          // still reflects the pre-drop layout. Null when dropped at
          // the very bottom (nothing to land above).
          var neighborAfterId=beforeEl ? beforeEl.getAttribute('data-id') : null;
          order.splice(insertAt, 0, id);
          var allCards=_bbCardsList();
          order.forEach(function(cid, idx){
            var cc=allCards.filter(function(x){ return x.id===cid; })[0];
            if(cc) cc.sortOrder=idx;
          });
          // July 23, 2026, Larry: landing a card at the very top or
          // bottom of one of the 3 Do columns (H/M/L) further escalates
          // or de-escalates its priority within that column's family --
          // on top of the coarse family already set by _bbPriorityForDrop
          // above. Top always pushes toward the family's most urgent
          // value (H->HH, M->MH, L->ML); bottom pushes toward its least
          // urgent (H->H, M->M, L->L). Each family's top value has
          // nothing further to escalate to, so top just stays there;
          // same for each family's bottom value. A single-card column
          // counts as "top" (escalate wins the tie), not bottom.
          // Aug 6, 2026, Larry: landing in the middle used to leave the
          // card's priority alone -- now it matches whatever it's
          // physically dropped among instead, same escalate/de-escalate
          // as top and bottom ("HH moved between H's becomes H," same
          // for MH/M and ML/L). _bbResortDoColumnByPriority (called just
          // below) always keeps each family's cards grouped into two
          // contiguous blocks -- escalated on top, base on the bottom --
          // so landing directly above a given card means landing in
          // that card's block; reading its priority is enough to know
          // which block that is. Top/bottom still force the outright
          // escalated/base value regardless of neighbors (unchanged),
          // so dragging to the bottom of an all-HH column still lands
          // on plain H even though every neighbor is HH.
          if(_bbIsDoCol(c.col) && c.col!=='new' && order.length>0){
            var famKey=c.col.slice(3); // 'h' | 'm' | 'l'
            var isTop=(insertAt===0);
            var isBottom=(!isTop && insertAt===order.length-1);
            var famEscalated={h:'HH', m:'MH', l:'ML'}[famKey];
            var famBase={h:'H', m:'M', l:'L'}[famKey];
            if(isTop){
              c.priority=famEscalated;
            } else if(isBottom){
              c.priority=famBase;
            } else if(neighborAfterId){
              var neighborCard=allCards.filter(function(x){ return x.id===neighborAfterId; })[0];
              if(neighborCard && (neighborCard.priority===famEscalated || neighborCard.priority===famBase)){
                c.priority=neighborCard.priority;
              }
            }
          }
          if(_bbIsDoCol(c.col)) _bbResortDoColumnByPriority(c.col);
          _bbStampDateEscalationHandled(c);
          _bbSaveLocal(_bbCardsList());
          _bbLogCardMove(c, _bbMoveBefore);
        }
        renderBoard();
      });
    });
    var addTile=document.getElementById('bb-add-tile');
    if(addTile) addTile.addEventListener('click', openAddCard);
    _bbFitTaskText();
  }

  // Shrink-to-fit for card task text -- Aug 18 2026, Larry: "can we
  // shrink text size when necessary to prevent splitting words on all
  // boards?" Runs after every renderBoard() (and after a text-size-boost
  // change) so each card's task line checks its OWN real, laid-out
  // width and shrinks its font just enough that its longest word still
  // fits, before ever falling back to .bb-task's word-break:break-word.
  // Resets to the natural CSS size first so this is safe to call
  // repeatedly (e.g. after the text-size boost changes) without ratcheting
  // a card smaller and smaller across repeated calls.
  function _bbFitTaskText(){
    var els=document.querySelectorAll('.bb-card .bb-task');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      el.style.fontSize='';
      var w=el.clientWidth;
      if(!w) continue;
      var cs=getComputedStyle(el);
      var baseSize=parseFloat(cs.fontSize)||14;
      // Floor lowered Aug 21 2026, same SOP as the storyboard's card text --
      // a long word (e.g. "Appreciation") shrinking further is better than
      // it wrapping/splitting, so the floor here is no longer 9px/60%.
      var fitted=window.FGFitFontSize ? window.FGFitFontSize(el.textContent, w, {base:baseSize, min:Math.max(7, Math.round(baseSize*0.45)), step:0.5, fontFamily:cs.fontFamily, fontWeight:cs.fontWeight}) : baseSize;
      if(fitted<baseSize) el.style.fontSize=fitted+'px';
    }
  }

  // Text-size boost changes the CSS variable most card text scales off
  // (calc(...px * var(--fg-text-scale,1))) automatically, no JS needed --
  // but the fit pass above bakes in a fixed px value, so it has to
  // re-run whenever the boost changes or it'd go stale. Safe to call any
  // time; _bbFitTaskText() itself no-ops on any board that isn't showing
  // (querySelectorAll just finds nothing).
  window.addEventListener('fg-text-scale-changed', function(){
    try { _bbFitTaskText(); } catch(e){}
  });

  function openAddCard(){
    var t=document.getElementById('bb-new-task'); if(t) t.value='';
    var ov=document.getElementById('bb-add-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function closeAddCard(){
    var ov=document.getElementById('bb-add-overlay'); if(ov) ov.classList.remove('active');
  }

  function _bbHighlightPriority(priority){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      var base=btns[i].getAttribute('data-pri-base');
      var active = !!priority && PRI_BASE_OF[priority]===base;
      btns[i].textContent = active ? priority : base;
      if(active){
        btns[i].style.background=PRI_COLOR[priority];
        btns[i].style.borderColor=PRI_COLOR[priority];
        btns[i].style.color = PRI_TEXT[priority];
      } else {
        btns[i].style.background='';
        btns[i].style.borderColor='';
        btns[i].style.color='';
      }
    }
  }

  function openCardDetail(id){
    _bbOpenCardId=id;
    // Aug 14 2026 fix -- see _bbFindCardAnywhere above: this used to only
    // check _bbCardsList(), so a merged card (Personal BB read-through or
    // a project board's shared-in card) never opened at all.
    var c=_bbFindCardAnywhere(id);
    if(!c) return;
    _bbDetailBeforeCardId=id;
    _bbDetailBeforeSnapshot=_bbSnapshotCardDetail(c);
    document.getElementById('bb-d-added').textContent=c.assigned||'—';
    _bbRenderCardProjectField(c);
    document.getElementById('bb-d-situation').value=c.situation||'';
    document.getElementById('bb-d-hangup-since').textContent=c.hangupSince||'—';
    document.getElementById('bb-d-hangup-wrap').style.display = (c.col==='hangups') ? '' : 'none';
    // Idea Board button, Aug 11 2026 -- one button, every card, doing
    // one of two things depending on whether this card is already
    // linked (c.sourceHeaderId): a linked card opens its existing
    // header in a new tab (was the separate "Open on Idea Storyboard"
    // button); an unlinked card creates a brand-new blank Idea Board
    // named after its own task text and links to that instead --
    // Larry's "Idea" this session: a Briefing Card with no home on any
    // board yet (e.g. "Routine Cards protocol") gets one on the spot,
    // with its own task text promoted straight into the TOPIC name.
    // Replaces the old Hang-Up-only "Unhooking Ideas" button -- same
    // Situation-seeding behavior, just folded into this one control
    // instead of a second, differently-named button. Reset here since
    // this is a permanent overlay element, never re-created between
    // cards -- its disabled/"Opening…" state from a previous click
    // would otherwise stick on the next card opened.
    var _bbOpenHdrBtn=document.getElementById('bb-d-open-header');
    if(_bbOpenHdrBtn){
      _bbOpenHdrBtn.disabled=false;
      _bbOpenHdrBtn.title = c.sourceHeaderId ? 'Open on Idea Storyboard' : 'Idea Board';
    }
    // Problem-red back, July 21, 2026 (evening) -- Larry: the card back
    // itself should read as a problem card while it's sitting in
    // HANG-UPS, not just the field that's revealed. Reuses the same
    // fixed Hang-Ups red (#a3372b) already used on the column header and
    // flag buttons -- one semantic color for "this is stuck," everywhere.
    var _bbDetailCard=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCard) _bbDetailCard.classList.toggle('bb-hangup-active', c.col==='hangups');
    if(_bbDetailCard) _bbDetailCard.classList.toggle('bb-overdue-active', _bbIsOverdue(c)||_bbIsStartOverdue(c));
    document.getElementById('bb-d-task').value=c.task||'';
    _bbRenderColorSwatches(c);
    // Color row starts collapsed on every open -- Gear (bb-d-gear) toggles
    // it, same as the Idea Card's Appearance gear.
    (function(){ var row=document.getElementById('bb-d-color-row'); if(row) row.style.display='none'; })();
    // Mirror boards, part 2, Aug 9 2026 -- "Also show on" only makes
    // sense for a card native to a PERSONAL board (tagging it onto a
    // project/departmental/company board this member belongs to).
    // Options come straight from _bbBoards, already RLS-scoped to
    // boards this member can actually see.
    (function(){
      var wrap=document.getElementById('bb-d-shared-wrap');
      var sel=document.getElementById('bb-d-shared-board');
      if(!wrap || !sel) return;
      var board=_bbBoards.filter(function(b){ return b.id===_bbCurrentBoardId; })[0];
      // Aug 14 2026 -- also require !c._foreign now that a merged
      // (assigned-to-me) card can be opened from a Personal BB too: this
      // field only makes sense for a card actually native here, not one
      // just passing through on its way from someone else's board.
      if(board && board.board_type==='personal' && !c._foreign){
        var targets=_bbBoards.filter(function(b){ return b.board_type!=='personal'; });
        sel.innerHTML='<option value="">Just here</option>'+targets.map(function(b){
          return '<option value="'+b.id+'">'+_esc(b.name||'Untitled Board')+'</option>';
        }).join('');
        sel.value=c.sharedToBoardId||'';
        wrap.style.display='';
      } else {
        wrap.style.display='none';
      }
    })();
    document.getElementById('bb-d-due').value=c.due||'';
    document.getElementById('bb-d-due-time').value=c.dueTime||'';
    document.getElementById('bb-d-start').value=c.startDate||'';
    document.getElementById('bb-d-start-time').value=c.startTime||'';
    document.getElementById('bb-d-routine').value=c.routineFreq||'';
    document.getElementById('bb-d-routine-custom').value=c.routineCustom||'';
    document.getElementById('bb-d-routine-custom').style.display=(c.routineFreq==='custom')?'':'none';
    var _bbDetailCardR=document.querySelector('#bb-detail-overlay .bb-overlay-card');
    if(_bbDetailCardR) _bbDetailCardR.classList.toggle('bb-routine-active', !!c.routine);
    document.getElementById('bb-d-budget').value=c.budget||'';
    document.getElementById('bb-d-notes').value=c.notes||'';
    _bbAutoGrowNotes();
    document.getElementById('bb-d-link-url').value=c.linkUrl||'';
    _bbLinkPendingUrl=c.linkUrl||null; _bbLinkPendingThumb=c.linkThumb||null; _bbLinkPendingTitle=c.linkTitle||null;
    if(_bbLinkTimer){ clearTimeout(_bbLinkTimer); _bbLinkTimer=null; }
    _bbRenderLinkPreview(_bbLinkPendingUrl, _bbLinkPendingThumb, _bbLinkPendingTitle);
    document.getElementById('bb-d-reviewer').value=c.reviewedBy||REVIEWERS[0];
    document.getElementById('bb-d-grow-note').value=c.growNote||'';
    document.getElementById('bb-d-grow-note-wrap').style.display=c.grow?'':'none';
    _bbUpdateReviewUI(c);
    _bbHighlightPriority(c.priority||'');
    _bbRenderKeyRow(c);
    _bbChecklistCache=[];
    var clInput=document.getElementById('bb-d-checklist-new'); if(clInput) clInput.value='';
    _bbRenderChecklist();
    _bbLoadChecklistForCard(id);
    // Additions, Aug 27 2026 -- each checkbox/body pair just mirrors
    // this card's own addFlag; values were already written into their
    // fields above, so this only ever controls whether that section is
    // showing, never what's in it.
    BB_ADDITIONS.forEach(function(a){
      var open=!!c[a.flag];
      var cb=document.getElementById(a.cb); if(cb) cb.checked=open;
      var body=document.getElementById(a.body); if(body) body.style.display=open?'':'none';
    });
    var ov=document.getElementById('bb-detail-overlay');
    if(ov){ _bbResetCardPosition(ov.querySelector('.bb-overlay-card')); ov.classList.add('active'); }
  }

  function openDoorSoon(label){
    var t=document.getElementById('bb-door-soon-title');
    if(t) t.textContent=label;
    var ov=document.getElementById('bb-door-soon-overlay');
    if(ov) ov.classList.add('active');
  }
  function closeDoorSoon(){
    var ov=document.getElementById('bb-door-soon-overlay');
    if(ov) ov.classList.remove('active');
  }
  function closeCardDetail(){
    var c=_bbFindCardAnywhere(_bbOpenCardId);
    if(c){
      c.task=document.getElementById('bb-d-task').value;
      c.situation=document.getElementById('bb-d-situation').value;
      // c.person (Assigned to) no longer has a field on this screen --
      // retired Session 234, see the comment above _bbInitials. It's
      // left untouched here (never cleared) purely as the legacy
      // fallback source for any card nobody's starred a 👥 primary
      // doer on yet.
      c.due=document.getElementById('bb-d-due').value;
      c.dueTime=document.getElementById('bb-d-due-time').value;
      c.startDate=document.getElementById('bb-d-start').value;
      c.startTime=document.getElementById('bb-d-start-time').value;
      c.routineFreq=document.getElementById('bb-d-routine').value;
      c.routineCustom=document.getElementById('bb-d-routine-custom').value;
      c.budget=document.getElementById('bb-d-budget').value;
      c.notes=document.getElementById('bb-d-notes').value;
      (function(){
        var linkInput=document.getElementById('bb-d-link-url');
        var val=linkInput?linkInput.value.trim():'';
        if(!val){ c.linkUrl=null; c.linkTitle=null; c.linkThumb=null; }
        else if(val===_bbLinkPendingUrl){ c.linkUrl=val; c.linkTitle=_bbLinkPendingTitle||val; c.linkThumb=_bbLinkPendingThumb||null; }
        else { c.linkUrl=val; c.linkTitle=val; c.linkThumb=null; }
      })();
      c.reviewedBy=document.getElementById('bb-d-reviewer').value;
      c.growNote=document.getElementById('bb-d-grow-note').value;
      var sharedWrap=document.getElementById('bb-d-shared-wrap');
      if(sharedWrap && sharedWrap.style.display!=='none'){
        var newSharedTo=document.getElementById('bb-d-shared-board').value || null;
        if(newSharedTo!==(c.sharedToBoardId||null)){
          _bbHandleSharedTagChange(c, newSharedTo);
          c.sharedToBoardId=newSharedTo;
        }
      }
      if(_bbDetailBeforeSnapshot && _bbDetailBeforeCardId===_bbOpenCardId){
        var afterSnap=_bbSnapshotCardDetail(c);
        if(JSON.stringify(_bbDetailBeforeSnapshot)!==JSON.stringify(afterSnap)){
          (function(){
            var cardId=_bbOpenCardId, beforeSnap=_bbDetailBeforeSnapshot;
            _bbPushAction({label:'Edit', undo:function(){ _bbApplyCardDetail(cardId, beforeSnap); }, redo:function(){ _bbApplyCardDetail(cardId, afterSnap); }});
          })();
        }
      }
      _bbSaveLocal(_bbCardsList());
    }
    _bbOpenCardId=null;
    var ov=document.getElementById('bb-detail-overlay'); if(ov) ov.classList.remove('active');
    var openDp=document.querySelector('.bb-datepicker-pop'); if(openDp) openDp.remove();
    // Refresh per-key link counts before redrawing -- the card that was
    // just open may have gained or lost a Signal Flag, and the board-
    // face badge needs to reflect that the moment you're back looking.
    _bbLoadKeyLinkCounts(_bbCardsList().map(function(c){ return c.id; })).then(renderBoard);
  }

  // Settings screen stack, Aug 8 2026 -- Larry: Settings should be a
  // simple drill-down (Settings home -> People -> Cast/Guests), not a
  // tab bar, with X always meaning "back one screen" until you're back
  // at the top, where X closes for real. One overlay div, body content
  // re-rendered per screen -- same idea as the Storyboard's single
  // sb-detail-overlay, just scoped to Settings here.
  var _bbSettingsScreen='home';
  function _bbRenderSettingsScreen(screen){
    _bbSettingsScreen=screen;
    var body=document.getElementById('bb-settings-body'); if(!body) return;
    var titleEl=document.getElementById('bb-settings-title');
    if(screen==='home'){
      if(titleEl) titleEl.textContent='Settings';
      body.innerHTML=
         '<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-people" style="width:100%">&#128101; People</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-appearance" style="width:100%">&#127912; Appearance</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-preferences" style="width:100%">&#128295; Preferences</button></div>'
        // Aug 30 2026, Larry: Reload and Jump to Menu used to be their
        // own icons next to Utility/Close in the header row -- moved in
        // here so the header stays down to just Utility and X. History
        // moves in too, right next to its own Archive/Log destinations
        // it already used to launch (see openHX). Relationships was
        // ALSO its own header icon, but it already had a home under
        // People below, so that duplicate icon is just gone, not
        // re-added here.
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-reload" style="width:100%">&#128260; Reload</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-menu" style="width:100%">&#128269; Jump to Menu</button></div>'
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-history" style="width:100%">&#128337; History</button></div>'
        // Sign Out, Sept 12 2026 -- Larry: every Utility/Settings screen
        // should end in the same Sign Out option, at the bottom. Reuses
        // the one true sign-out path (T().signOutOfDevice, backpack.js)
        // that drawer-system.js's Utility popup already uses, so there's
        // still just one real sign-out implementation, now offered from
        // a third place. Same red styling as that popup's button.
        +'<div class="bb-field"><button class="bb-flag-btn" id="bb-settings-go-signout" style="width:100%;border-color:#b8544a;color:#a8332a">&#128682; Sign Out</button></div>';
      T().wire('bb-settings-go-people', function(){ _bbRenderSettingsScreen('people'); });
      T().wire('bb-settings-go-appearance', function(){ _bbRenderSettingsScreen('appearance'); });
      T().wire('bb-settings-go-preferences', function(){ _bbRenderSettingsScreen('preferences'); });
      T().wire('bb-settings-go-reload', function(){ closeSettings(); T().resetAndReturn(); });
      T().wire('bb-settings-go-menu', function(){ closeSettings(); T().goMG(); });
      T().wire('bb-settings-go-history', function(){ closeSettings(); openHX(); });
      T().wire('bb-settings-go-signout', async function(){
        if(!confirm('Sign out of the Field Guide on this device? Good for handing it to someone else to sign in, or to create their own account.')) return;
        closeSettings();
        if(T().signOutOfDevice) await T().signOutOfDevice();
      });
    } else if(screen==='people'){
      if(titleEl) titleEl.textContent='People';
      body.innerHTML=
         '<div class="bb-field" id="bb-sharing-field">'
          +'<button class="bb-flag-btn" id="bb-open-sharing" style="width:100%">&#127915; Guests</button>'
        +'</div>'
        +'<div class="bb-field" id="bb-relations-field">'
          +'<button class="bb-flag-btn" id="bb-open-relations" style="width:100%">&#128279; Relationships</button>'
        +'</div>';
      // Aug 30 2026, Larry: "Delete Cast from Utility button" -- CAST is
      // now its own destination on the board-kind dropdown up top (same
      // roster either way, openTeamRoster/_tmAddMember), so the nested
      // People -> Cast entry that used to duplicate it is gone.
      T().wire('bb-open-sharing', function(){ closeSettings(); openSharingManager(); });
      T().wire('bb-open-relations', function(){ closeSettings(); openRelationsManager(); });
      _bbLoadSharing();
    } else if(screen==='appearance'){
      if(titleEl) titleEl.textContent='Appearance';
      body.innerHTML=
         '<div class="bb-field"><label>Color theme</label><div class="bb-swatches">'
          +THEMES.map(function(t){ return '<button class="bb-theme-swatch" data-theme="'+t.key+'" title="'+t.label+'" style="background:'+t.bg+';border-color:'+t.accent+'"></button>'; }).join('')
        +'</div></div>'
        +'<div class="bb-field"><label>Font</label><div class="bb-flags">'
          +FONTS.map(function(f){ return '<button class="bb-font-btn" data-font="'+f.key+'">'+f.label+'</button>'; }).join('')
        +'</div></div>'
        +'<div class="bb-field"><label>Text size</label>'
          +'<button class="bb-flag-btn" id="bb-open-textsize" style="width:100%">&#128288; Adjust text size</button>'
        +'</div>';
      // Aug 3 2026: Briefing Board is full-screen (.isx-full), so the
      // desk's own gear/text-size picker is hidden here -- same shared
      // picker as Storyboard/Session's Options menus.
      var tsBtn=document.getElementById('bb-open-textsize');
      if(tsBtn) tsBtn.addEventListener('click', function(){ if (window.openFGTextSizePicker) window.openFGTextSizePicker(); });
      document.querySelectorAll('#bb-settings-body .bb-theme-swatch').forEach(function(btn){
        btn.addEventListener('click', function(){ _bbApplyTheme(btn.getAttribute('data-theme')); });
      });
      document.querySelectorAll('#bb-settings-body .bb-font-btn').forEach(function(btn){
        btn.addEventListener('click', function(){ _bbApplyFont(btn.getAttribute('data-font')); });
      });
      _bbHighlightAppearance();
    } else if(screen==='preferences'){
      if(titleEl) titleEl.textContent='Preferences';
      body.innerHTML=
         '<div class="bb-field"><label>Start Date warning (days before, auto-sets H)</label>'
          +'<input type="number" min="0" step="1" id="bb-start-warn-days" style="width:80px">'
        +'</div>'
        +'<div class="bb-field"><label>Due Date warning (days before, auto-sets HH)</label>'
          +'<input type="number" min="0" step="1" id="bb-due-warn-days" style="width:80px">'
        +'</div>'
        // Master Briefing Board depth, Sept 5 2026 -- Larry, after
        // floating "might we want to limit the Master view to a number
        // of levels?": "traveler choice for number of levels to include
        // in MASTER view." Same "a traveler choice, not a fixed rule"
        // shape as the two warning-days fields just above (localStorage,
        // not sessionStorage -- set-it-and-forget-it, not a per-visit
        // pick). 0 means "just this layer, no rollup at all"; there's no
        // upper bound field for "every level, uncapped" yet -- worth
        // adding if a plain high number turns out to be an awkward way
        // to ask for that.
        +'<div class="bb-field"><label>Master Briefing Board depth (layers rolled up into the top level)</label>'
          +'<input type="number" min="0" step="1" id="bb-master-rollup-depth" style="width:80px">'
        +'</div>'
        +'<div class="bb-field"><label>Signal Flags</label>'
          +'<button class="bb-flag-btn" id="bb-open-keylib" style="width:100%">&#128681; Manage Signal Flags</button>'
        +'</div>';
      var sw=document.getElementById('bb-start-warn-days'); if(sw) sw.value=_bbStartWarnDays();
      var dw=document.getElementById('bb-due-warn-days'); if(dw) dw.value=_bbDueWarnDays();
      var mrd=document.getElementById('bb-master-rollup-depth'); if(mrd) mrd.value=_bbMasterRollupDepth();
      if(sw) sw.addEventListener('change', function(){ _bbSetStartWarnDays(sw.value); sw.value=_bbStartWarnDays(); renderBoard(); });
      if(dw) dw.addEventListener('change', function(){ _bbSetDueWarnDays(dw.value); dw.value=_bbDueWarnDays(); renderBoard(); });
      if(mrd) mrd.addEventListener('change', function(){
        _bbSetMasterRollupDepth(mrd.value); mrd.value=_bbMasterRollupDepth();
        if(_bbCurrentTopicIsRoot) _bbLoadMasterRollupCards().then(function(){ _bbSyncMasterSubtitle(true); renderBoard(); });
      });
      T().wire('bb-open-keylib', function(){ closeSettings(); openKeyLibManager(); });
    }
  }
  function _bbOpenSettingsAt(screen){
    _bbRenderSettingsScreen(screen);
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.add('active');
  }
  function openSettings(){
    _bbOpenSettingsAt('home');
  }
  function closeSettings(){
    var ov=document.getElementById('bb-settings-overlay'); if(ov) ov.classList.remove('active');
  }

  function wirePriorityButtons(){
    var btns=document.querySelectorAll('#bb-detail-overlay .bb-pri-btn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(){
          var c=_bbFindCardAnywhere(_bbOpenCardId);
          if(!c) return;
          var _bbMoveBefore=_bbSnapshotCard(c);
          var base=btn.getAttribute('data-pri-base');
          c.priority=_bbNextPriority(c.priority||'', base);
          // July 22, 2026: keep the card in the Do column matching its
          // new priority family, IF it's currently sitting in one of
          // the 3 Do columns at all (a card in Doing/Done/Hang-Ups can
          // still have its priority changed here without being yanked
          // back into Do).
          if(_bbIsDoCol(c.col)){ c.col=_bbDoColKey(c.priority); _bbResortDoColumnByPriority(c.col); }
          _bbStampDateEscalationHandled(c);
          _bbSaveLocal(_bbCardsList());
          _bbLogCardMove(c, _bbMoveBefore);
          _bbHighlightPriority(c.priority);
          renderBoard();
        });
      })(btns[i]);
    }
  }

  // ── LIVE SYNC (Aug 4 2026) ── reacts to changes pushed by backpack.js's
  // shared realtime channel (see startRealtimeSync there). A remote
  // change updates this board's own in-memory state the same way a
  // local save already does, then re-renders -- deferred/coalesced so
  // a burst of events (e.g. someone else's whole-board save, which
  // upserts every card row) doesn't hammer the DOM with a render per
  // row, and paused entirely while a card is mid-drag.
  var _bbRtPendingRender = false, _bbRtTimer = null;
  function _bbRtSafeRender(){
    if (T().isDragActive()) { _bbRtPendingRender = true; return; }
    if (_bbRtTimer) clearTimeout(_bbRtTimer);
    _bbRtTimer = setTimeout(function(){ _bbRtTimer = null; renderBoard(); }, 300);
  }
  window.addEventListener('t2t:drag-end', function(){
    if (_bbRtPendingRender) { _bbRtPendingRender = false; _bbRtSafeRender(); }
  });
