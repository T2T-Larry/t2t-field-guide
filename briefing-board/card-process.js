/* ============================================================
   card-process.js -- T2T Field Guide - THE PROCESS OPTION, ON EVERY KIND OF CARD

   Oct 24 2026 (Larry): PROCESS is an option on every card back. It is a list of steps you shape yourself, never a rigid checklist.
     - Suggested steps show in LIGHT text. Press Enter, click the tick, or type over one and it darkens: it is yours now.
       Steps nobody accepts stay light and never block anything.
     - The dashed (+) adds a step. Every step can be edited in place, ticked off, removed, and dragged up or down
       (Alt+Up / Alt+Down moves the step you are typing in).
     - A TASK starts with one light "Step 1" and no preset steps. A kind that has a suggested process (an IDEA session) shows those steps instead.
   Steps live in their own table (card_process_steps), keyed to the card's id (every card is a row in ideas), so one module serves every card kind.
   A step is saved the first time you touch the list; until then the light steps are only shown, never stored.

   Public surface: window.FGCardProcess
     .mount(container, { ideaId, kind, before })  -- one block (PROCESS row + steps) into container, ahead of 'before' if given
     .mount(container, { ideaId, kind, headParent, headBefore, bodyParent, scope })  -- split: the row goes into a checklist, its steps into bodyParent
     .SUGGESTED  -- the suggested steps per card kind (edit here to give a kind its own process)
   ============================================================ */
(function(){
  // Suggested steps by card kind. Kinds with no entry fall back to a single light "Step 1".
  var SUGGESTED = {
    idea: ['Warm up', 'Gather ideas', 'Cluster them', 'Pick favorites']
  };
  var FALLBACK = ['Step 1'];

  function sb(){ return window.T2T && window.T2T.sb; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }

  function injectStyle(){
    if(document.getElementById('fg-process-style')) return;
    var st=document.createElement('style'); st.id='fg-process-style';
    st.textContent=''
      +'.fg-process{width:100%;margin:2px 0 8px;padding:4px 0 6px;border-bottom:1px dotted var(--bb-accent)}'
      +'.fg-process-split{margin:0 0 8px;padding:0 0 6px}'
      +'.fg-process-split .fg-process-body{margin:0;padding-left:0}'
      +'.fg-process-headrow label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-process-headrow input[type=checkbox]{margin:0;width:15px;height:15px;cursor:pointer}'
      +'.fg-process-head{display:flex;align-items:center;gap:7px;min-height:24px}'
      +'.fg-process-head label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:calc(11px * var(--fg-text-scale,1));font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--bb-ink)}'
      +'.fg-process-head input[type=checkbox]{margin:0;width:15px;height:15px;cursor:pointer}'
      +'.fg-process-body{margin:4px 0 0;padding-left:4px}'
      +'.fg-process-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}'
      +'.fg-process-step{display:flex;align-items:center;gap:6px;padding:1px 0;border-radius:4px}'
      +'.fg-process-step.fg-over{box-shadow:0 -2px 0 var(--bb-accent)}'
      +'.fg-process-grip{flex:0 0 auto;cursor:grab;opacity:.45;user-select:none;font-size:calc(13px * var(--fg-text-scale,1));line-height:1;color:var(--bb-ink)}'
      +'.fg-process-grip:hover{opacity:.9}'
      +'.fg-process-step input[type=checkbox]{margin:0;width:14px;height:14px;cursor:pointer;flex:0 0 auto}'
      +'.fg-process-text{flex:1 1 auto;min-width:0;font:inherit;font-size:calc(12px * var(--fg-text-scale,1));color:var(--bb-ink);background:transparent;border:0;border-bottom:1px solid transparent;padding:2px 2px}'
      +'.fg-process-text:focus{outline:none;border-bottom-color:var(--bb-accent)}'
      // Light = suggested (not accepted yet).
      +'.fg-process-step.fg-suggested .fg-process-text{opacity:.42;font-style:italic}'
      +'.fg-process-step.fg-done .fg-process-text{text-decoration:line-through;opacity:.6}'
      +'.fg-process-del{flex:0 0 auto;background:transparent;border:0;cursor:pointer;opacity:.4;padding:0 2px;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;color:var(--bb-ink)}'
      +'.fg-process-del:hover{opacity:.9}'
      +'.fg-process-add{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin:4px 0 0 20px;padding:0;background:transparent;border:1px dashed var(--bb-accent);border-radius:50%;cursor:pointer;font-size:calc(14px * var(--fg-text-scale,1));line-height:1;color:var(--bb-ink)}'
      +'.fg-process-add:hover{background:var(--bb-bg)}'
      +'.fg-process-note{margin:3px 0 0 20px;font-size:calc(10px * var(--fg-text-scale,1));color:#b3261e}';
    document.head.appendChild(st);
  }

  function mount(container, opts){
    if(!container || !opts || !opts.ideaId) return;
    injectStyle();
    // One PROCESS per card back: a back that is reused for another card drops the earlier card's list first.
    var scope=opts.scope||container;
    Array.prototype.slice.call(scope.querySelectorAll('[data-fgprocess]')).forEach(function(n){ n.remove(); });

    var ideaId=opts.ideaId, kind=opts.kind||'task';
    var steps=[];            // {id (null until saved), text, state: 'suggested'|'mine'|'done'}
    var saved=false;         // true once the list has been written to the database
    var open=false;

    var bodyHTML='<div class="fg-process-body" style="display:none"><ul class="fg-process-list"></ul><button type="button" class="fg-process-add" title="Add a step">+</button><div class="fg-process-note" style="display:none"></div></div>';
    var headHTML='<label><input type="checkbox"><span>Process</span></label>';
    var wrap=document.createElement('div'); wrap.className='fg-process'; wrap.setAttribute('data-idea', ideaId); wrap.setAttribute('data-fgprocess','1');
    if(opts.headParent && opts.bodyParent){
      // Split layout (task card back): the PROCESS row sits in the OPTIONS checklist, its steps open to the right with the other opened options.
      var head=document.createElement('div'); head.className='fg-fixed-row fg-process-headrow'; head.setAttribute('data-fgprocess','1');
      head.innerHTML=headHTML;
      opts.headParent.insertBefore(head, opts.headBefore||null);
      wrap.className+=' fg-process-split';
      wrap.innerHTML='<div class="fg-back-opt-title">Process</div>'+bodyHTML;
      opts.bodyParent.appendChild(wrap);
      wrap._head=head;
    } else {
      wrap.innerHTML='<div class="fg-process-head">'+headHTML+'</div>'+bodyHTML;
      if(opts.before && opts.before.parentNode===container) container.insertBefore(wrap, opts.before); else container.appendChild(wrap);
    }

    var cb=(wrap._head||wrap).querySelector('input[type=checkbox]'), body=wrap.querySelector('.fg-process-body');
    var ul=wrap.querySelector('.fg-process-list'), addBtn=wrap.querySelector('.fg-process-add'), note=wrap.querySelector('.fg-process-note');

    function say(msg){ note.textContent=msg||''; note.style.display=msg?'':'none'; }
    function fail(label, err){ console.error('Card PROCESS: '+label+' failed', err); say('Could not save that step. Please try again.'); }

    function ghostList(){
      var src=SUGGESTED[kind]||FALLBACK;
      return src.map(function(t){ return {id:null, text:t, state:'suggested'}; });
    }
    function paintOpen(){ cb.checked=open; body.style.display=open?'':'none'; if(wrap._head) wrap.style.display=open?'':'none'; }

    // ---- saving ------------------------------------------------------------------------------------------------------------
    // The first touch writes the whole list (light steps stay light, stored as 'suggested'); after that each change is one small write.
    async function ensureSaved(){
      if(saved) return true;
      var s=sb(); if(!s){ say('Not connected, so steps are not saved yet.'); return false; }
      var rows=steps.map(function(x,i){ return {idea_id:ideaId, sort_order:i, text_content:x.text, state:x.state}; });
      if(!rows.length){ saved=true; return true; }
      var r=await s.from('card_process_steps').insert(rows).select('id,sort_order').order('sort_order',{ascending:true});
      if(r.error){ fail('first save', r.error); return false; }
      (r.data||[]).forEach(function(row){ if(steps[row.sort_order]) steps[row.sort_order].id=row.id; });
      saved=true; say(''); return true;
    }
    async function saveStep(x){
      if(!(await ensureSaved())) return;
      if(!x.id) return;   // it was written (with its current values) by ensureSaved
      var s=sb();
      var r=await s.from('card_process_steps').update({text_content:x.text, state:x.state}).eq('id',x.id);
      if(r.error) fail('update', r.error); else say('');
    }
    async function saveOrder(){
      if(!(await ensureSaved())) return;
      var s=sb(), jobs=[];
      steps.forEach(function(x,i){ if(x.id) jobs.push(s.from('card_process_steps').update({sort_order:i}).eq('id',x.id)); });
      var res=await Promise.all(jobs);
      var bad=res.filter(function(r){ return r.error; })[0];
      if(bad) fail('reorder', bad.error); else say('');
    }
    async function addStep(){
      var x={id:null, text:'', state:'mine'};
      steps.push(x); render();
      var inp=ul.lastChild && ul.lastChild.querySelector('.fg-process-text'); if(inp) inp.focus();
      if(!(await ensureSaved())) return;
      if(!x.id){
        var r=await sb().from('card_process_steps').insert({idea_id:ideaId, sort_order:steps.indexOf(x), text_content:'', state:'mine'}).select('id').single();
        if(r.error) fail('add', r.error); else { x.id=r.data.id; say(''); }
      }
    }
    async function removeStep(x){
      var i=steps.indexOf(x); if(i<0) return;
      steps.splice(i,1); render();
      if(x.id && saved){
        var r=await sb().from('card_process_steps').delete().eq('id',x.id);
        if(r.error) fail('remove', r.error); else { say(''); saveOrder(); }
      }
    }

    // ---- drawing -----------------------------------------------------------------------------------------------------------
    var dragFrom=null;
    function accept(x){ if(x.state==='suggested'){ x.state='mine'; } }
    function render(){
      ul.innerHTML='';
      steps.forEach(function(x,i){
        var li=document.createElement('li');
        li.className='fg-process-step'+(x.state==='suggested'?' fg-suggested':'')+(x.state==='done'?' fg-done':'');
        li.draggable=true;
        li.innerHTML='<span class="fg-process-grip" title="Drag to move this step">&#8942;&#8942;</span>'
          +'<input type="checkbox" class="fg-process-tick" title="Done"'+(x.state==='done'?' checked':'')+'>'
          +'<input type="text" class="fg-process-text" value="'+esc(x.text)+'" placeholder="Step">'
          +'<button type="button" class="fg-process-del" title="Remove this step">&times;</button>';
        var txt=li.querySelector('.fg-process-text'), tick=li.querySelector('.fg-process-tick'), del=li.querySelector('.fg-process-del');

        // Light steps: focusing selects the text so typing overwrites it; Enter keeps it as written.
        txt.addEventListener('focus', function(){ if(x.state==='suggested') txt.select(); });
        txt.addEventListener('input', function(){
          x.text=txt.value;
          if(x.state==='suggested'){ x.state='mine'; li.classList.remove('fg-suggested'); }
        });
        txt.addEventListener('change', function(){ x.text=txt.value; saveStep(x); });
        txt.addEventListener('keydown', function(e){
          if(e.key==='Enter'){
            e.preventDefault();
            if(x.state==='suggested'){ accept(x); li.classList.remove('fg-suggested'); saveStep(x); }
            else { x.text=txt.value; saveStep(x); }
          } else if(e.altKey && (e.key==='ArrowUp' || e.key==='ArrowDown')){
            e.preventDefault();
            var j=i+(e.key==='ArrowUp'?-1:1);
            if(j<0 || j>=steps.length) return;
            steps.splice(i,1); steps.splice(j,0,x); render(); saveOrder();
            var nt=ul.children[j] && ul.children[j].querySelector('.fg-process-text'); if(nt) nt.focus();
          }
        });
        tick.addEventListener('change', function(){
          x.state=tick.checked?'done':'mine'; render(); saveStep(x);
        });
        del.addEventListener('click', function(e){ e.stopPropagation(); removeStep(x); });

        // Drag to rearrange
        li.addEventListener('dragstart', function(e){ dragFrom=x; try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(i)); }catch(_){} });
        li.addEventListener('dragover', function(e){ if(dragFrom){ e.preventDefault(); li.classList.add('fg-over'); } });
        li.addEventListener('dragleave', function(){ li.classList.remove('fg-over'); });
        li.addEventListener('dragend', function(){ dragFrom=null; Array.prototype.forEach.call(ul.children,function(n){ n.classList.remove('fg-over'); }); });
        li.addEventListener('drop', function(e){
          e.preventDefault(); li.classList.remove('fg-over');
          if(!dragFrom || dragFrom===x) { dragFrom=null; return; }
          var from=steps.indexOf(dragFrom), to=steps.indexOf(x);
          steps.splice(from,1); steps.splice(to,0,dragFrom);
          dragFrom=null; render(); saveOrder();
        });
        ul.appendChild(li);
      });
    }

    cb.addEventListener('click', function(e){ e.stopPropagation(); open=cb.checked; paintOpen(); });
    addBtn.addEventListener('click', function(e){ e.stopPropagation(); addStep(); });

    // ---- load --------------------------------------------------------------------------------------------------------------
    steps=ghostList(); render(); paintOpen();
    var s=sb();
    if(s){
      s.from('card_process_steps').select('id,sort_order,text_content,state').eq('idea_id', ideaId).order('sort_order',{ascending:true})
        .then(function(r){
          if(r.error){ console.error('Card PROCESS: load failed', r.error); return; }
          if(r.data && r.data.length){
            steps=r.data.map(function(row){ return {id:row.id, text:row.text_content||'', state:row.state||'mine'}; });
            saved=true; open=true;   // a card that already has steps shows them
            render(); paintOpen();
          }
        });
    }
  }

  window.FGCardProcess = { mount:mount, SUGGESTED:SUGGESTED };
})();
