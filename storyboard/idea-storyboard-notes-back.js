/* ============================================================
   idea-storyboard-notes-back.js -- T2T Field Guide - THE NOTES CARD BACK

   Oct 25 2026 (Larry: "ID BAND same as all other cards. SUBJECT BAND same. CONTENTS open text field. OPTIONS: Source (includes date) -
   Attachments - Gem. UTILITIES: Gear and Trash (this is the Notes card). GEM and CONTENTS have an eyeball.")

   A NOTES back is the SAME back as every other card (openSbDetail in idea-storyboard-card-detail.js: one ID BAND, one SUBJECT BAND, one Contents
   field, one bottom row). Only the OPTIONS differ, so this file holds only what is special about notes:
     - which board kinds make a card a NOTE      (FGCardBack.isNotesLabel, card-back-style.js -- STORY, JOURNEY and GEMS boards)
     - the Attachments and Gem option blocks     (_sboardNotesAdditionsHTML) and the Source date (_sboardNotesSourceDateHTML)
     - the three OPTIONS rows, in order          (_sboardNotesOptionRows) -- Source reuses the card's existing link fields
     - saving them                               (_sboardNotesBackWire): source_date, attachments, is_gem on the ideas row
     - the gem mark on the card face             (_sboardGemBadgeHTML, drawn by _sboardSignalRowHTML)
   Same global scope as the other idea-storyboard files, so it can use T(), _sboardPatchRow, renderSeaBoard and _sboardEsc by plain name.
   Database columns: database-changes/2026-10-25 notes card back.sql
   ============================================================ */

  // Is the card being opened a NOTE? Two ways: it was written with a pencil (ideas.is_note), or it sits on a board that holds notes (STORY, JOURNEY, GEMS --
  // read from that board's own ID BAND, the same place the card back's title and color come from, so the back and its title can never disagree).
  // A header is never a note.
  function _sboardIsNotesBack(item){
    if(item && item.is_note) return true;
    var el=document.getElementById('sc-board-kind-trigger');
    var label=el ? (el.textContent||'').replace(/\s+/g,' ').trim() : '';
    return !!(window.FGCardBack && FGCardBack.isNotesLabel && FGCardBack.isNotesLabel(label));
  }

  // THE PENCIL (Oct 25 2026, Larry: "All pencils!!!!"): the pencil on any card opens a NOTES card for that card. The note is a card of its own that lives in
  // the bucket of the card it was written on. An empty note already waiting there is reused, so pressing the pencil twice never leaves clutter.
  // home (optional, Oct 25 2026, Larry: a note written on a STORY task said MASTER VISION): {kind, topic} -- the board and topic of the card the pencil was
  // pressed on, when that is not the board on screen behind the note (a Briefing Board task). The note's ID BAND then names where its parent card lives.
  var _sboardNoteHome=null;
  async function _sboardOpenNoteFor(parentId, home){
    var sb=T().sb; if(!sb || !parentId) return;
    _sboardNoteHome=home||null;
    try{
      var u=await sb.auth.getUser(); var user=u&&u.data&&u.data.user; if(!user) return;
      var kids=await sb.from('ideas').select('*').eq('cluster_id',parentId).eq('is_note',true).order('created_at',{ascending:false}).limit(5);
      var list=(!kids.error && kids.data) ? kids.data : [];
      var row=list.filter(function(r){ return !String(r.text_content||'').trim(); })[0] || null;
      if(!row){
        var par=await sb.from('ideas').select('id,project_id,topic_scope_id,storyboard_kind').eq('id',parentId).single();
        var p=(par && par.data) || {};
        var ins=await sb.from('ideas').insert({
          user_id:user.id, cluster_id:parentId, content_type:'text', storyboard_kind:p.storyboard_kind||'IDEA',
          project_id:p.project_id||null, topic_scope_id:p.topic_scope_id||null, is_note:true, text_content:'', sort_order:list.length+1
        }).select().single();
        if(ins.error) throw ins.error;
        row=ins.data;
      }
      if(typeof _sboardAddRow==='function') _sboardAddRow(row);
      openSbDetail(row);
    }catch(e){ console.error('_sboardOpenNoteFor', e); }
  }

  // The name a note carries for the card it was written on: SUBJECT first, else its contents (a link card's contents are JSON, so its title).
  function _sboardNoteParentName(row){
    if(!row) return '';
    var nm=String(row.subject||'').trim();
    if(!nm){
      var t=String(row.text_content||'').trim();
      if(t.charAt(0)==='{'){ try{ var o=JSON.parse(t); t=String((o&&o.title)||'').trim(); }catch(e){} }
      nm=t;
    }
    return nm.length>60 ? nm.slice(0,57)+'…' : nm;
  }
  // On the note's face: a small chip naming the card it is about.
  function _sboardNoteParentBadgeHTML(item){
    if(!item || !item.is_note || !item.cluster_id || typeof _sboardAllRowsById==='undefined') return '';
    var nm=_sboardNoteParentName(_sboardAllRowsById[item.cluster_id]);
    if(nm) _sboardNotesInjectStyle();   // the chip's look is injected the first time one is drawn, not only when a notes back opens
    return nm ? '<span class="sb-note-parent-badge" title="About: '+_sboardEsc(nm)+'">'+_sboardEsc(nm)+'</span>' : '';
  }

  // The gem mark on a card's face. Its eye on the back decides whether it shows ('gem' in front_hidden = back only).
  function _sboardGemBadgeHTML(item){
    if(!item || !item.is_gem) return '';
    var gn=(window.T2TFlagCounts)?T2TFlagCounts.count(item,'gem'):1;
    return '<span class="sb-gem-badge" title="Gem'+(gn>=2?' x'+gn:'')+'">'+T2TFlagCounts.gemIcon(13)+(gn>=2?'<span style="font-size:9px;font-weight:700;margin-left:1px">'+gn+'</span>':'')+'</span>';
  }

  function _sboardNotesAttachments(item){
    var a=item && item.attachments;
    if(typeof a==='string'){ try{ a=JSON.parse(a); }catch(e){ a=[]; } }
    return Array.isArray(a) ? a : [];
  }

  // The date that goes with the Source (inside the Source body, under the link line).
  function _sboardNotesSourceDateHTML(item){
    return '<input id="sb-source-date" type="text" autocomplete="off" placeholder="Date, e.g. Oct 25 2026" style="width:100%;box-sizing:border-box;margin-top:6px" value="'+_sboardEsc(item.source_date||'')+'">';
  }

  // Attachments and Gem, built like every other addition: a real checkbox plus its body, so the shared OPTIONS builders can drive them.
  function _sboardNotesAdditionsHTML(item){
    var list=_sboardNotesAttachments(item);
    var attachOpen=list.length>0;
    return ''
      + '<div class="bb-field bb-addition" id="sb-add-attach-wrap"><label class="bb-addition-label" for="sb-add-attach"><input type="checkbox" id="sb-add-attach"'+(attachOpen?' checked':'')+'><span class="bb-addition-eyebrow">Attachments</span></label>'
      +   '<div class="bb-addition-body" id="sb-attach-body" style="display:'+(attachOpen?'':'none')+'">'
      +     '<div id="sb-attach-list"></div>'
      +     '<button type="button" class="bb-icon-btn" id="sb-attach-add" title="Add a file" aria-label="Add a file">+</button>'
      +     '<input type="file" id="sb-attach-input" multiple style="display:none">'
      +   '</div></div>';
  }

  // The OPTIONS checklist of a NOTES back, in Larry's order. Oct 28 2026 (Larry): a gem is a Signal Flag like on every other card, so the old Gem
  // option is gone; Signal Flags (heart, gem, custom flags) takes its place and its eye decides whether the flags show on the face.
  function _sboardNotesOptionRows(){
    return [
      { id:'source', label:'Source',       boxes:['sb-add-links'],  eyeKeys:[],        bodies:['sb-links-body'] },
      { id:'attach', label:'Attachments',  boxes:['sb-add-attach'], eyeKeys:[],        bodies:['sb-attach-body'] },
      { id:'flags',  label:'Signal Flags', boxes:['sb-add-flags'],  eyeKeys:['flags'], bodies:['sb-flags-body'] }
    ];
  }

  function _sboardNotesInjectStyle(){
    if(document.getElementById('fg-notes-back-style')) return;
    var st=document.createElement('style'); st.id='fg-notes-back-style';
    st.textContent=''
      +'.sb-gem-badge{display:inline-block;font-size:calc(12px * var(--fg-text-scale,1));line-height:1;color:#7B4FB8;margin-right:3px}'
      +'.sb-note-parent-badge{display:inline-block;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;color:var(--bb-sub,#8A7420);margin-right:4px}'
      +'.sb-gem-line{font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink)}'
      +'.fg-notes-back .fg-back-viewslot{display:none}'
      +'#sb-attach-list{display:flex;flex-direction:column;gap:3px;margin-bottom:4px}'
      +'.sb-attach-row{display:flex;align-items:center;gap:6px;font-size:calc(11px * var(--fg-text-scale,1));color:var(--bb-ink);min-width:0}'
      +'.sb-attach-row a{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit}'
      +'.sb-attach-row button{flex:0 0 auto;border:0;background:transparent;color:var(--bb-ink);cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1))}'
      +'#sb-attach-add{width:24px;height:24px;min-width:0;padding:0;font-weight:700}';
    document.head.appendChild(st);
  }

  // Wire the notes-only controls of an opened NOTES back. Everything saves straight to the card's own row (same path as the other card-back fields).
  function _sboardNotesBackWire(card, item){
    if(!card) return;
    _sboardNotesInjectStyle();
    card.classList.add('fg-notes-back');
    // A note written on a card of another kind still wears the NOTES title and color (the board's own NOTES colors win where it has them).
    // Oct 28 2026 (Larry: a note started from the Briefing Board's (+) said MASTER VISION -- "the ID BAND should default to the appropriate board"):
    // a note belongs on the JOURNEY board, so when the board behind it is not one that holds notes, the band names JOURNEY and the card wears its color.
    var _offNotesBoard=!['story','journey','gems'].some(function(n){ return card.classList.contains('fg-type-'+n); });
    if(_offNotesBoard){
      ['idea','plan'].forEach(function(n){ card.classList.remove('fg-type-'+n); });
      card.classList.add('fg-type-journey');
      var ttl=card.querySelector('#sb-details-eyebrow') || card.querySelector('.fg-back-title'); if(ttl) ttl.textContent='NOTES';
    }
    // TOPIC on the band (Oct 25 2026, Larry: Notes was missing the TOPIC selector): when the board's own band had no topic name to copy, name the card's own topic.
    var topicBtn=card.querySelector('#sb-d-topic-btn');
    var home=_sboardNoteHome; _sboardNoteHome=null;
    if(!(home && home.kind) && _offNotesBoard) home={kind:'JOURNEY'};   // no board of its own named: the appropriate one for a note is JOURNEY
    if(home && home.kind){
      var kindBtn=card.querySelector('#sb-d-kind-btn');
      if(kindBtn){ kindBtn.textContent=home.kind; kindBtn.title=home.kind; kindBtn.classList.remove('fg-back-empty'); }
    }
    // Oct 25 2026 (Larry: "the note is most likely about the SUBJECT of that card rather than the TOPIC"): a note written with a pencil lives in the card it
    // was written on, and its TOPIC selector names THAT card by its SUBJECT (its contents when it has no subject). The same name shows on the note's face.
    if(topicBtn && item.is_note && item.cluster_id){
      var nameIt=function(row){
        var nm=_sboardNoteParentName(row); if(!nm) return;
        topicBtn.textContent=nm; topicBtn.title=nm; topicBtn.classList.remove('fg-back-empty');
      };
      var cached=(typeof _sboardAllRowsById!=='undefined') ? _sboardAllRowsById[item.cluster_id] : null;
      if(cached) nameIt(cached);
      else T().sb.from('ideas').select('id,subject,text_content').eq('id',item.cluster_id).maybeSingle().then(function(r){ if(r && r.data) nameIt(r.data); });
    } else if(topicBtn && item.topic_scope_id){
      setTimeout(function(){
        if((topicBtn.textContent||'').trim()!=='TOPIC') return;
        T().sb.from('ideas').select('id,subject,text_content').eq('id',item.topic_scope_id).maybeSingle().then(function(r){
          var row=r && r.data; var nm=row ? (String(row.subject||'').trim()||String(row.text_content||'').trim()) : '';
          if(nm && (topicBtn.textContent||'').trim()==='TOPIC'){ topicBtn.textContent=nm; topicBtn.title=nm; }
        });
      }, 0);
    }
    function status(msg){ var s=document.getElementById('sb-note-status'); if(s) s.textContent=msg||''; }
    function save(patch){
      var prev={}; Object.keys(patch).forEach(function(k){ prev[k]=item[k]; item[k]=patch[k]; });
      return T().sb.from('ideas').update(patch).eq('id',item.id).then(function(r){
        if(r.error){ Object.keys(prev).forEach(function(k){ item[k]=prev[k]; }); status(r.error.message); return false; }
        _sboardPatchRow(item.id, patch); renderSeaBoard(true); return true;
      });
    }
    // Source date.
    var dateIn=card.querySelector('#sb-source-date');
    if(dateIn) dateIn.addEventListener('change', function(){ save({source_date:dateIn.value.trim()||null}); });
    // Attachments.
    var listEl=card.querySelector('#sb-attach-list'), addBtn=card.querySelector('#sb-attach-add'), fileIn=card.querySelector('#sb-attach-input'), attachCb=card.querySelector('#sb-add-attach');
    function paintList(){
      if(!listEl) return;
      listEl.innerHTML='';
      _sboardNotesAttachments(item).forEach(function(a, idx){
        var row=document.createElement('div'); row.className='sb-attach-row';
        var link=document.createElement('a'); link.href=a.url; link.target='_blank'; link.rel='noopener'; link.textContent=a.name||'file'; link.title=a.name||'file';
        var x=document.createElement('button'); x.type='button'; x.textContent='✕'; x.title='Remove from this note'; x.setAttribute('aria-label','Remove from this note');
        x.addEventListener('click', function(e){
          e.stopPropagation();
          var cur=_sboardNotesAttachments(item).slice(); cur.splice(idx,1);
          save({attachments:cur}).then(paintList);
        });
        row.appendChild(link); row.appendChild(x); listEl.appendChild(row);
      });
    }
    paintList();
    if(addBtn && fileIn){
      addBtn.addEventListener('click', function(e){ e.stopPropagation(); fileIn.click(); });
      fileIn.addEventListener('change', async function(){
        var files=Array.prototype.slice.call(fileIn.files||[]); fileIn.value='';
        if(!files.length) return;
        status('Uploading…');
        try{
          var u=await T().sb.auth.getUser(); var user=u&&u.data&&u.data.user;
          if(!user) throw new Error('Not signed in.');
          var cur=_sboardNotesAttachments(item).slice();
          for(var i=0;i<files.length;i++){
            var f=files[i], safe=(f.name||('file-'+Date.now())).replace(/[^a-zA-Z0-9._-]/g,'_');
            var path=user.id+'/'+Date.now()+'-'+safe;
            var up=await T().sb.storage.from('sea-of-ideas').upload(path, f);
            if(up.error) throw up.error;
            var pub=T().sb.storage.from('sea-of-ideas').getPublicUrl(path);
            var url=pub.data && pub.data.publicUrl; if(!url) throw new Error('No public URL returned.');
            cur.push({url:url, name:f.name||safe, size:f.size||0});
          }
          var ok=await save({attachments:cur});
          if(ok){ status(''); if(attachCb && !attachCb.checked){ attachCb.checked=true; attachCb.dispatchEvent(new Event('change',{bubbles:true})); } }
          paintList();
        }catch(err){ status('Upload failed: '+((err&&err.message)||err)); }
      });
    }
  }
