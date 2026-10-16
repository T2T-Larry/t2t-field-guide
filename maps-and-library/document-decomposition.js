/* ============================================================
   DOCUMENT DECOMPOSITION — document-decomposition.js
   Sept 27 2026 (Master BB card "Document Decomposition", added Sept 26
   2026 Session — spec: "Build Document Decomposition: paste-and-split
   raw text (transcript/highlights) into sentence/paragraph fragment
   cards with Subject, auto-cluster into proposed headers by inferred
   subject, traveler edits from there.")

   Traveler pastes raw text (a transcript, meeting highlights, notes).
   This file:
     1. Splits it into fragments — one per sentence (or per line, for
        text with no real paragraph structure) — each fragment becomes
        one proposed Idea card, with a short auto Subject headline.
     2. Groups fragments into proposed Headers ("clusters") by inferred
        subject: paragraph breaks are the strongest signal a human
        already gave us, so a blank-line-separated block becomes one
        cluster; text with no blank lines (a raw line-by-line highlight
        dump) is clustered by keyword overlap between fragments instead.
     3. Shows the traveler an editable review — rename any proposed
        header, edit or delete any fragment — before anything is saved.
        Nothing touches Supabase until the traveler hits Save.

   Talks to the rest of the app only through window.T2T (nav/sb) and
   window.T2TData (createHeader) — the same seams idea-capture.js and
   header-data.js already use. Doesn't reach into 9710's private state;
   the caller hands in the parentHeaderId to cluster under, the same
   pattern IdeaCapture.open() uses.

   Usage:
     window.DocDecomp.open({
       parentHeaderId: '...',      // required — where proposed headers land
       onDone: function(){ ... }   // called after a successful Save, so the
                                    // caller can refresh its own board view
     });
   ============================================================ */
(function(){

  function _sb(){ return T().sb; }

  var _ddParentHeaderId=null;
  var _ddOnDone=null;
  var _ddGroups=null;   // [{name, fragments:[text,...]}, ...] — working review state
  var _ddLastPastedText=''; // so Back (from review) can restore the paste box

  var STOPWORDS = {
    'the':1,'a':1,'an':1,'and':1,'or':1,'but':1,'of':1,'to':1,'in':1,'on':1,
    'for':1,'with':1,'is':1,'are':1,'was':1,'were':1,'be':1,'been':1,'being':1,
    'this':1,'that':1,'these':1,'those':1,'it':1,'its':1,'as':1,'at':1,'by':1,
    'from':1,'so':1,'we':1,'i':1,'you':1,'he':1,'she':1,'they':1,'them':1,
    'his':1,'her':1,'their':1,'our':1,'your':1,'not':1,'no':1,'if':1,'then':1,
    'than':1,'also':1,'just':1,'about':1,'into':1,'out':1,'up':1,'down':1,
    'can':1,'will':1,'would':1,'should':1,'could':1,'do':1,'does':1,'did':1,
    'have':1,'has':1,'had':1,'there':1,'here':1,'what':1,'which':1,'who':1,
    'when':1,'where':1,'why':1,'how':1,'all':1,'each':1,'other':1,'some':1
  };

  // ── Splitting ──

  function _ddSplitParagraphs(text){
    return text.split(/\n\s*\n+/).map(function(p){ return p.trim(); }).filter(Boolean);
  }

  function _ddSplitSentences(block){
    // No lookbehind (Safari/WebKit history in this codebase) -- match each
    // run up to and including its terminal punctuation instead.
    var m = block.replace(/\s+/g,' ').trim().match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
    if(!m) return block.trim() ? [block.trim()] : [];
    return m.map(function(s){ return s.trim(); }).filter(Boolean);
  }

  function _ddSignificantWords(s){
    var words=(s.toLowerCase().match(/[a-z0-9']+/g)||[]);
    return words.filter(function(w){ return w.length>3 && !STOPWORDS[w]; });
  }

  function _ddInferHeaderName(fragments){
    var freq={};
    fragments.forEach(function(f){
      _ddSignificantWords(f).forEach(function(w){ freq[w]=(freq[w]||0)+1; });
    });
    var words=Object.keys(freq).sort(function(a,b){ return freq[b]-freq[a]; });
    if(words.length){
      var top=words.slice(0,2).map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); });
      return top.join(' / ');
    }
    return _ddFragmentSubject(fragments[0]||'Untitled');
  }

  function _ddFragmentSubject(text){
    var t=text.trim();
    if(t.length<=48) return t;
    var cut=t.slice(0,48);
    var lastSpace=cut.lastIndexOf(' ');
    if(lastSpace>20) cut=cut.slice(0,lastSpace);
    return cut+'…';
  }

  // Greedy keyword-overlap clustering for text with no paragraph structure
  // (a flat line-by-line highlight dump). Each line/sentence joins the
  // first existing cluster it shares >=1 significant word with; otherwise
  // it starts a new cluster. Simple, deterministic, no network call --
  // the traveler edits the result either way, so this only has to get
  // them a reasonable starting point, not a perfect one.
  function _ddClusterByKeywords(fragments){
    var clusters=[]; // [{words:Set-as-obj, fragments:[...]}]
    fragments.forEach(function(f){
      var fw=_ddSignificantWords(f);
      var home=null;
      for(var i=0;i<clusters.length;i++){
        var c=clusters[i];
        for(var j=0;j<fw.length;j++){ if(c.words[fw[j]]){ home=c; break; } }
        if(home) break;
      }
      if(!home){ home={words:{}, fragments:[]}; clusters.push(home); }
      fw.forEach(function(w){ home.words[w]=(home.words[w]||0)+1; });
      home.fragments.push(f);
    });
    return clusters.map(function(c){ return c.fragments; });
  }

  function _ddBuildGroups(rawText){
    var paragraphs=_ddSplitParagraphs(rawText);
    var fragmentGroups; // array of arrays of fragment strings
    if(paragraphs.length>1){
      fragmentGroups = paragraphs.map(function(p){ return _ddSplitSentences(p); }).filter(function(g){ return g.length; });
    } else {
      // No blank-line structure -- fall back to one fragment per line if
      // the paste looks line-delimited (a highlight list), else per
      // sentence, then cluster by keyword overlap.
      var lines=rawText.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
      var flat = (lines.length>2) ? lines : _ddSplitSentences(rawText);
      fragmentGroups = _ddClusterByKeywords(flat);
    }
    return fragmentGroups.map(function(frags){
      return { name:_ddInferHeaderName(frags), fragments:frags };
    });
  }

  // ── Styles (injected once) ──

  function _ddEnsureStyles(){
    if(document.getElementById('dd-styles')) return;
    var css = ''
      +'#dd-overlay{position:fixed;inset:0;background:rgba(26,58,92,.55);z-index:9000;display:none;align-items:center;justify-content:center;padding:20px}'
      +'#dd-overlay.active{display:flex}'
      +'.dd-card{background:#fdf6e8;border-radius:16px;padding:20px;width:min(560px,94vw);max-height:88vh;overflow:auto;box-shadow:0 14px 34px rgba(0,0,0,.35)}'
      +'.dd-title{font-family:\'Playfair Display\',serif;font-weight:700;color:#1a3a5c;font-size:calc(16px * var(--fg-text-scale,1));margin-bottom:4px}'
      +'.dd-sub{font-size:calc(11px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:12px}'
      +'.dd-textarea{width:100%;min-height:220px;border:1px solid #cfe4f2;border-radius:10px;padding:10px;font-size:calc(13px * var(--fg-text-scale,1));font-family:inherit;resize:vertical;box-sizing:border-box}'
      +'.dd-row{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}'
      +'.dd-btn{border:1px solid #cfe4f2;background:#fff;padding:8px 16px;border-radius:14px;font-size:calc(12px * var(--fg-text-scale,1));cursor:pointer;color:#1a3a5c}'
      +'.dd-btn:hover{background:#eaf3fb}'
      +'.dd-btn-primary{background:#1a3a5c;color:#fff;border-color:#1a3a5c}'
      +'.dd-btn-primary:hover{background:#254e79}'
      +'.dd-group{border:1px solid #e3d3b0;border-radius:12px;padding:10px;margin-bottom:10px;background:#fffdf7}'
      +'.dd-group-name{width:100%;font-family:\'Playfair Display\',serif;font-weight:700;color:#1a3a5c;border:1px solid #cfe4f2;border-radius:8px;padding:6px 8px;font-size:calc(13px * var(--fg-text-scale,1));box-sizing:border-box;margin-bottom:8px}'
      +'.dd-frag{display:flex;gap:6px;align-items:flex-start;margin-bottom:6px}'
      +'.dd-frag textarea{flex:1;min-height:40px;border:1px solid #e3d3b0;border-radius:8px;padding:6px 8px;font-size:calc(12px * var(--fg-text-scale,1));font-family:inherit;resize:vertical;box-sizing:border-box}'
      +'.dd-frag-del{border:none;background:none;color:#A32D2D;cursor:pointer;font-size:14px;padding:4px}'
      +'.dd-count{font-size:calc(10px * var(--fg-text-scale,1));color:#7a6040;margin-bottom:14px}'
      +'.dd-empty{font-size:calc(12px * var(--fg-text-scale,1));color:#a33;margin-top:8px}';
    var style=document.createElement('style');
    style.id='dd-styles'; style.textContent=css;
    document.head.appendChild(style);
  }

  function _ddEnsureLayer(){
    var layer=document.getElementById('dd-overlay');
    if(layer) return layer;
    layer=document.createElement('div');
    layer.id='dd-overlay';
    document.body.appendChild(layer);
    return layer;
  }

  // ── Screen 1: paste ──

  function _ddRenderPaste(){
    var layer=_ddEnsureLayer();
    layer.innerHTML = '<div class="dd-card">'
      +'<div class="dd-title">Decompose a document</div>'
      +'<div class="dd-sub">Paste a transcript, meeting notes, or highlights. Each sentence becomes its own card, grouped into proposed headers you can rename or fix before saving.</div>'
      +'<textarea class="dd-textarea" id="dd-input" placeholder="Paste raw text here…">'+_ddEsc(_ddLastPastedText)+'</textarea>'
      +'<div class="dd-row">'
        +'<button class="dd-btn" id="dd-cancel">Cancel</button>'
        +'<button class="dd-btn dd-btn-primary" id="dd-next">Decompose →</button>'
      +'</div>'
    +'</div>';
    layer.classList.add('active');
    T().wire('dd-cancel', _ddClose);
    T().wire('dd-next', function(){
      var raw=(document.getElementById('dd-input')||{}).value||'';
      if(!raw.trim()) return;
      _ddLastPastedText=raw;
      _ddGroups=_ddBuildGroups(raw);
      _ddRenderReview();
    });
  }

  // ── Screen 2: review ──

  function _ddRenderReview(){
    var layer=_ddEnsureLayer();
    var total=_ddGroups.reduce(function(n,g){ return n+g.fragments.length; },0);
    var html = '<div class="dd-card">'
      +'<div class="dd-title">Review before saving</div>'
      +'<div class="dd-count">'+_ddGroups.length+' proposed header'+(_ddGroups.length===1?'':'s')+', '+total+' card'+(total===1?'':'s')+'. Edit any name or text, or remove a card, before saving.</div>';
    _ddGroups.forEach(function(g, gi){
      html += '<div class="dd-group" data-gi="'+gi+'">'
        +'<input class="dd-group-name" data-gi="'+gi+'" value="'+_ddEsc(g.name)+'">';
      g.fragments.forEach(function(f, fi){
        html += '<div class="dd-frag"><textarea data-gi="'+gi+'" data-fi="'+fi+'">'+_ddEsc(f)+'</textarea>'
          +'<button class="dd-frag-del" data-gi="'+gi+'" data-fi="'+fi+'" title="Remove">✕</button></div>';
      });
      html += '</div>';
    });
    html += '<div class="dd-row">'
        +'<button class="dd-btn" id="dd-back">← Back</button>'
        +'<button class="dd-btn" id="dd-cancel2">Cancel</button>'
        +'<button class="dd-btn dd-btn-primary" id="dd-save">Save all</button>'
      +'</div>'
    +'</div>';
    layer.innerHTML=html;
    layer.classList.add('active');

    layer.querySelectorAll('.dd-group-name').forEach(function(inp){
      inp.addEventListener('input', function(){ _ddGroups[+inp.getAttribute('data-gi')].name=inp.value; });
    });
    layer.querySelectorAll('.dd-frag textarea').forEach(function(ta){
      ta.addEventListener('input', function(){
        _ddGroups[+ta.getAttribute('data-gi')].fragments[+ta.getAttribute('data-fi')]=ta.value;
      });
    });
    layer.querySelectorAll('.dd-frag-del').forEach(function(btn){
      btn.addEventListener('click', function(){
        var gi=+btn.getAttribute('data-gi'), fi=+btn.getAttribute('data-fi');
        _ddGroups[gi].fragments.splice(fi,1);
        if(!_ddGroups[gi].fragments.length) _ddGroups.splice(gi,1);
        _ddRenderReview();
      });
    });
    T().wire('dd-back', _ddRenderPaste);
    T().wire('dd-cancel2', _ddClose);
    T().wire('dd-save', _ddSaveAll);
  }

  function _ddEsc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Save ──

  async function _ddSaveAll(){
    var layer=document.getElementById('dd-overlay');
    var saveBtn=document.getElementById('dd-save');
    if(saveBtn){ saveBtn.disabled=true; saveBtn.textContent='Saving…'; }
    try{
      var sb=_sb();
      var userRes=await sb.auth.getUser();
      var uid=userRes && userRes.data && userRes.data.user && userRes.data.user.id;
      if(!uid) throw new Error('Not signed in');

      var savedRows=[];
      for(var gi=0; gi<_ddGroups.length; gi++){
        var g=_ddGroups[gi];
        if(!g.fragments.length) continue;
        var headerRow = await window.T2TData.createHeader(g.name||'Untitled', _ddParentHeaderId);
        savedRows.push(headerRow);
        for(var fi=0; fi<g.fragments.length; fi++){
          var text=g.fragments[fi];
          var ins = await sb.from('ideas').insert({
            user_id:uid,
            content_type:'idea',
            subject:_ddFragmentSubject(text),
            text_content:text,
            cluster_id:headerRow.id,
            created_at:new Date().toISOString()
          }).select().single();
          if(ins.error) throw new Error(ins.error.message);
          savedRows.push(ins.data);
        }
      }
      _ddClose();
      if(typeof _ddOnDone==='function') _ddOnDone(savedRows);
    } catch(e){
      if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='Save all'; }
      var card=document.querySelector('#dd-overlay .dd-card');
      if(card){
        var err=document.createElement('div');
        err.className='dd-empty';
        err.textContent='Save failed: '+((e&&e.message)||String(e));
        card.appendChild(err);
      }
    }
  }

  function _ddClose(){
    var layer=document.getElementById('dd-overlay');
    if(layer){ layer.classList.remove('active'); layer.innerHTML=''; }
    _ddParentHeaderId=null; _ddOnDone=null; _ddGroups=null; _ddLastPastedText='';
  }

  function open(opts){
    opts=opts||{};
    if(!opts.parentHeaderId){ console.warn('[document-decomposition] open() needs parentHeaderId'); return; }
    _ddEnsureStyles();
    _ddParentHeaderId=opts.parentHeaderId;
    _ddOnDone=opts.onDone||null;
    _ddGroups=null;
    if(opts.initialText && opts.initialText.trim()){
      // Sept 27 2026 -- reached from the Idea card's own "Split it into
      // cards instead?" banner (idea-capture.js), which already has the
      // pasted text in hand: skip straight to the review screen instead
      // of making the traveler paste it again into an empty box here.
      _ddLastPastedText=opts.initialText;
      _ddGroups=_ddBuildGroups(opts.initialText);
      _ddRenderReview();
    } else {
      _ddLastPastedText='';
      _ddRenderPaste();
    }
  }

  window.DocDecomp = { open:open };

})();
