/* ============================================================
   align-flags.js -- T2T Field Guide - shared by every board

   ALIGN FLAGS AND LIGHT FLAGS. Larry, Oct 27 2026: "Every card on any board
   mentioning ALIGN should have a flag." Nov 20 2026: "ALL FLAGS must be
   adjustable by the user! They must show up as flags!" -- so these are now
   REAL flags, stored on the card like the heart and the gem:

     * Where they live: the card's flag_counts, under the keys below
       (light-green, light-yellow, light-red; the six align-* flags were retired Nov 20 2026).
       Stored on the card itself, so every member sees the same flags, and they
       use up none of a card's three signal flag slots and none of the
       12-flag library.
     * First time only: a card whose words name an ALIGN (or an ALIGN's
       Green/Yellow/Red Light) gets the matching flags stamped on it the first
       time its owner sees it, and ideas.align_flags_set is switched on. After
       that the flags belong to the card: take one away and it stays away.
       (Until a card is stamped, the same flags show as a read-only preview, so
       nothing disappears for a card its owner has not opened yet.)
     * Adjustable: tap a flag in the Choose-a-Signal-Flag picker to add one,
       the minus takes one away, the pencil changes its shape and color.
       A member's own look is saved in profiles.align_flag_styles.
     * Look: an ALIGN is a flag on a pole; a light is a dot in its own color
       ("lights are flag dots for now").

   TO CHANGE A DEFAULT COLOR, NAME OR SHAPE: edit the DEFS list below. It is the
   only place the defaults live.

   Used by: briefing-board/operations.js + briefing-board/signal-flags.js (Briefing Board)
   and storyboard/idea-storyboard-signal-flags.js + idea-storyboard-card-detail.js (every other board).
   ============================================================ */
(function(){
  var DEFS = [
    // Nov 20 2026 (Larry): the six ALIGN flags (Vision, Design, Plan, Resource, Performance, Goal) are retired;
    // only the Green/Yellow/Red lights remain. Old align-* counts still stored on cards are simply never shown.
    { id:'light-green',       light:'green',       name:'Green Light',       color:'#2e9e4f', shape:'circle' },
    { id:'light-yellow',      light:'yellow',      name:'Yellow Light',      color:'#e0b020', shape:'circle' },
    { id:'light-red',         light:'red',         name:'Red Light',         color:'#d6402f', shape:'circle' }
  ];
  var BY_ID = {}; DEFS.forEach(function(d){ BY_ID[d.id] = d; });

  // ---- this member's own look (profiles.align_flag_styles), remembered per tab for instant paint ----
  var _styles = null, _stylesLoaded = false, _userId = null;
  function _readLocal(){ try{ var r = sessionStorage.getItem('t2t_alignFlagStyles'); return r ? JSON.parse(r) : {}; }catch(e){ return {}; } }
  function _writeLocal(){ try{ sessionStorage.setItem('t2t_alignFlagStyles', JSON.stringify(_styles || {})); }catch(e){} }
  function _st(){ if(_styles === null) _styles = _readLocal(); return _styles; }
  // One call per page load, from either board; repaints are up to the caller (onLoaded).
  async function ensureLoaded(sb, onLoaded){
    if(_stylesLoaded || !sb) return;
    _stylesLoaded = true;
    try{
      var u = await sb.auth.getUser(); var user = u && u.data && u.data.user; if(!user) return;
      _userId = user.id;
      var res = await sb.from('profiles').select('align_flag_styles').eq('user_id', user.id).maybeSingle();
      if(res.error) throw res.error;
      var fromDb = (res.data && res.data.align_flag_styles) || {};
      if(JSON.stringify(fromDb) !== JSON.stringify(_st())){ _styles = fromDb; _writeLocal(); if(onLoaded) onLoaded(); }
    }catch(e){ console.error('Align flags: could not load this member\'s flag looks', e); }
  }
  // The flag as this member sees it: default look, overridden by their own choice.
  function def(id){
    var d = BY_ID[id]; if(!d) return null;
    var o = _st()[id];
    return { id:d.id, word:d.word, light:d.light, name:d.name,
             color:(o && o.color) || d.color, shape:(o && o.shape) || d.shape };
  }
  function all(){ return DEFS.map(function(d){ return def(d.id); }); }

  // ---- the look ----
  function css(d){
    var core = window.T2TSignalFlagCore;
    return core ? core.shapeCSS(d.shape, d.color) : ('background:' + d.color + ';');
  }
  // Pre-built mark for a card face or a card back pill. px = the size across.
  function markHTML(d, px){
    var w = px || 10;
    var tall = (d.shape === 'flag') ? Math.round(w * 1.15) : w;
    return '<span class="sb-key-dot bb-key-badge" title="' + String(d.name).replace(/"/g, '&quot;') + '" style="display:inline-block;width:' + w + 'px;height:' + tall + 'px;' + css(d) + '"></span>';
  }

  // ---- what the card's words name ----
  function _text(parts){
    return (Array.isArray(parts) ? parts : [parts]).filter(function(p){ return p != null && p !== ''; }).join(' ');
  }
  // Ids of the flags these words name, in list order.
  function implied(parts){
    var text = _text(parts); if(!text) return [];
    var found = {}, m;
    var lre = /\balign\s+(green|yellow|red)\s+light/gi;
    while((m = lre.exec(text))) found['light-' + m[1].toLowerCase()] = true;
    return DEFS.filter(function(d){ return found[d.id]; }).map(function(d){ return d.id; });
  }

  // ---- what is stored on the card ----
  function _fc(row){
    var f = row && row.flag_counts;
    if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
    return (f && typeof f === 'object') ? f : {};
  }
  function _stored(row){
    var f = _fc(row);
    return DEFS.filter(function(d){ return (f[d.id] | 0) > 0; }).map(function(d){ return d.id; });
  }
  // Ids showing on this card: what is stored, plus (until the card is stamped) what its words name.
  function ids(row, parts){
    var have = _stored(row);
    if(row && !row.align_flags_set){
      implied(parts).forEach(function(id){ if(have.indexOf(id) < 0) have.push(id); });
    }
    return DEFS.filter(function(d){ return have.indexOf(d.id) >= 0; }).map(function(d){ return d.id; });
  }
  function onCard(row, parts){ return ids(row, parts).map(def); }
  function count(row, parts, id){
    if(ids(row, parts).indexOf(id) < 0) return 0;
    var n = _fc(row)[id] | 0;
    return n > 0 ? n : 1;
  }

  // ---- changing what is stored ----
  var _stamping = {};
  // First sight of a card by its owner: store the flags its words name. Quiet; never throws.
  async function stampIfNeeded(sb, row, parts){
    try{
      if(!sb || !row || !row.id || row.align_flags_set || _stamping[row.id]) return;
      var want = implied(parts); if(!want.length) return;
      if(!_userId){ var u = await sb.auth.getUser(); _userId = u && u.data && u.data.user ? u.data.user.id : null; }
      if(!_userId || row.user_id !== _userId) return;          // only the card's owner stamps it
      _stamping[row.id] = true;
      var f = Object.assign({}, _fc(row)); want.forEach(function(id){ if(!(f[id] > 0)) f[id] = 1; });
      var res = await sb.from('ideas').update({ flag_counts: f, align_flags_set: true }).eq('id', row.id);
      if(res.error) throw res.error;
      row.flag_counts = f; row.align_flags_set = true;
    }catch(e){ console.error('Align flags: could not store a card\'s flags', e); }
    finally{ if(row) delete _stamping[row.id]; }
  }
  // Adds or takes away ONE of a flag. Returns the new count.
  async function adjust(sb, row, id, delta, parts){
    var f = Object.assign({}, _fc(row));
    if(!row.align_flags_set) implied(parts).forEach(function(i){ if(!(f[i] > 0)) f[i] = 1; });   // save what was only a preview first
    var n = Math.max(0, (f[id] | 0) + delta);
    if(n > 0) f[id] = n; else delete f[id];
    var res = await sb.from('ideas').update({ flag_counts: f, align_flags_set: true }).eq('id', row.id);
    if(res.error) throw res.error;
    row.flag_counts = f; row.align_flags_set = true;
    return n;
  }

  // ---- the pencil: this member picks a shape and a color ----
  // Larry, Oct 27 2026: the red heart means "I like this!", so no other flag may be a red heart.
  var RED = '#a3372b';
  function reservedReason(shape, color){
    if(shape === 'heart' && String(color).toLowerCase() === RED) return 'The red heart is reserved for “I like this!”. Please pick another color for a heart.';
    return '';
  }
  function openEditor(sb, id, onSaved){
    var d = def(id); if(!d) return;
    var core = window.T2TSignalFlagCore;
    var draft = { shape:d.shape, color:d.color };
    var old = document.getElementById('t2t-alignflag-editor'); if(old) old.remove();
    var ov = document.createElement('div');
    ov.id = 't2t-alignflag-editor';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(26,16,8,.45);display:flex;align-items:center;justify-content:center;font-family:inherit';
    var colors = core.COLORS.slice(); if(colors.indexOf(d.color) < 0) colors.unshift(d.color);
    DEFS.forEach(function(x){ if(colors.indexOf(x.color) < 0) colors.push(x.color); });
    ov.innerHTML = '<div style="background:#fffaf0;border:1px solid #e3d9c6;border-radius:12px;padding:16px;width:min(320px,90vw);text-align:center">'
      + '<div style="font-family:\'Playfair Display\',serif;font-size:15px;color:#1a3a5c;font-weight:700;margin-bottom:4px">' + d.name + '</div>'
      + '<div style="font-size:11px;color:#7a6040;margin-bottom:10px">Pick the shape and color you want to see.</div>'
      + '<div id="af-shapes" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px"></div>'
      + '<div id="af-colors" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px"></div>'
      + '<div id="af-warn" style="font-size:11px;color:#b8562f;min-height:14px;margin-bottom:8px"></div>'
      + '<div style="display:flex;gap:6px"><button id="af-save" style="flex:1;padding:8px;border-radius:8px;border:none;background:#1a3a5c;color:#fff;cursor:pointer">Save</button>'
      + '<button id="af-reset" style="flex:1;padding:8px;border-radius:8px;border:1px solid #cfc3aa;background:#fff;cursor:pointer">Back to default</button>'
      + '<button id="af-cancel" style="flex:1;padding:8px;border-radius:8px;border:1px solid #cfc3aa;background:#fff;cursor:pointer">Cancel</button></div></div>';
    document.body.appendChild(ov);
    function paint(){
      ov.querySelector('#af-shapes').innerHTML = core.SHAPES.map(function(s){
        return '<button data-shape="' + s + '" title="' + s + '" style="width:30px;height:30px;border-radius:6px;background:#fff;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;border:2px solid ' + (s === draft.shape ? '#5b9bd5' : 'transparent') + '"><span style="display:block;width:16px;height:16px;' + core.shapeCSS(s, draft.color) + '"></span></button>';
      }).join('');
      ov.querySelector('#af-colors').innerHTML = colors.map(function(c){
        return '<button data-color="' + c + '" style="width:24px;height:24px;border-radius:50%;cursor:pointer;padding:0;background:' + c + ';border:2px solid ' + (c === draft.color ? '#1a3a5c' : 'transparent') + '"></button>';
      }).join('');
      ov.querySelectorAll('[data-shape]').forEach(function(b){ b.addEventListener('click', function(){ draft.shape = b.getAttribute('data-shape'); paint(); }); });
      ov.querySelectorAll('[data-color]').forEach(function(b){ b.addEventListener('click', function(){ draft.color = b.getAttribute('data-color'); paint(); }); });
      ov.querySelector('#af-warn').textContent = reservedReason(draft.shape, draft.color);
    }
    paint();
    async function persist(next){
      try{
        var u = await sb.auth.getUser(); var user = u && u.data && u.data.user; if(!user) throw new Error('Not signed in.');
        var all2 = Object.assign({}, _st());
        if(next) all2[id] = next; else delete all2[id];
        var res = await sb.from('profiles').update({ align_flag_styles: all2 }).eq('user_id', user.id);
        if(res.error) throw res.error;
        _styles = all2; _writeLocal();
        ov.remove(); if(onSaved) onSaved();
      }catch(e){ console.error('Align flags: could not save this flag\'s look', e); ov.querySelector('#af-warn').textContent = 'Could not save. Please try again.'; }
    }
    ov.querySelector('#af-save').addEventListener('click', function(){
      if(reservedReason(draft.shape, draft.color)) return;
      persist({ shape:draft.shape, color:draft.color });
    });
    ov.querySelector('#af-reset').addEventListener('click', function(){ persist(null); });
    ov.querySelector('#af-cancel').addEventListener('click', function(){ ov.remove(); });
    ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });
  }

  // Kept for any older caller: the flags a card's words name, as looks.
  function list(parts){ return implied(parts).map(def); }

  window.T2TAlignFlags = {
    all: all, def: def, ids: ids, onCard: onCard, count: count, implied: implied, list: list,
    css: css, markHTML: markHTML,
    ensureLoaded: ensureLoaded, stampIfNeeded: stampIfNeeded, adjust: adjust, openEditor: openEditor,
    reservedReason: reservedReason
  };
})();
