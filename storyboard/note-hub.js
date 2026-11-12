/* ============================================================
   note-hub.js -- T2T Field Guide - THE NOTE HUB

   Nov 11 2026 (Larry: "NOTES HUB starts with an ID BAND"; a task with more than one note gets a hub): when a card has two or more notes, its pencil / Notes
   row opens this hub instead of a single note. The hub is not a place of its own -- it is the card's notes, gathered, under the card's own TOPIC and board.
   Look (Larry: "unlike the OPTIONS checklist"): a stack of paper strips, newest on top, each with its date and first line. A tap opens that note.
   A dashed (+) adds another. "select" quietly shows a small circle on each strip so some notes can be picked; PRINT / SAVE prints the picked notes (or all of
   them when none are picked) through the browser's print window, which also saves a document (Save as PDF).
   One job only: show the list and report taps. Opening / adding a note stays in idea-storyboard-notes-back.js (_sboardOpenNoteFor).
   ============================================================ */
(function(){
  var STYLE_ID='fg-note-hub-style';

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function firstLine(t){ var l=String(t||'').trim().split(/\r?\n/)[0]||''; return l.length>150 ? l.slice(0,150)+'…' : l; }
  function dateOf(r){ try{ return new Date(r.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }catch(e){ return ''; } }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=''
      +'.fg-nh-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}'
      +'.fg-nh-card{position:relative;box-sizing:border-box;width:min(520px,94vw);max-height:86vh;display:flex;flex-direction:column;background:#fffdf6;border:1px solid var(--bb-accent,#8a7a4a);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:0 22px 14px;overflow:hidden}'
      +'.fg-nh-card .fg-back-idband{flex:0 0 auto}'
      +'.fg-nh-close{border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;color:inherit}'
      +'.fg-nh-tools{display:flex;align-items:center;gap:10px;padding:2px 0 8px;font-size:12px}'
      +'.fg-nh-tools button{border:0;background:transparent;cursor:pointer;color:inherit;font:inherit;text-decoration:underline;padding:0}'
      +'.fg-nh-spacer{flex:1 1 auto}'
      +'.fg-nh-add{width:26px;height:26px;border:2px dashed var(--bb-accent,#8a7a4a)!important;border-radius:6px;text-decoration:none!important;font-weight:700;font-size:16px!important;line-height:1}'
      +'.fg-nh-list{flex:1 1 auto;overflow:auto;padding:4px 2px 6px}'
      +'.fg-nh-strip{position:relative;display:flex;align-items:center;gap:10px;min-height:38px;margin:0 0 -6px;padding:8px 26px 14px 12px;background:#fff7c9;border:1px solid #d9c96a;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.18);cursor:pointer;overflow:hidden}'
      +'.fg-nh-strip::after{content:"";position:absolute;top:0;right:0;width:16px;height:16px;background:linear-gradient(225deg,#fffdf6 50%,#e6d680 50%);border-bottom-left-radius:3px}'
      +'.fg-nh-strip:hover{background:#fff2a8}'
      +'.fg-nh-date{flex:0 0 auto;font-size:11px;color:#6b6130;white-space:nowrap}'
      +'.fg-nh-line{flex:1 1 auto;min-width:0;font-size:13px;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.fg-nh-pick{display:none;flex:0 0 auto;width:16px;height:16px;border:2px solid #6b6130;border-radius:50%;background:#fff;box-sizing:border-box}'
      +'.fg-nh-select .fg-nh-pick{display:block}'
      +'.fg-nh-pick.on{background:#6b6130;box-shadow:inset 0 0 0 2px #fff}'
      +'.fg-nh-status{font-size:11px;min-height:14px;color:#7a2d2d}';
    document.head.appendChild(s);
  }

  function close(){ var o=document.getElementById('fg-note-hub'); if(o && o.parentNode) o.parentNode.removeChild(o); }

  // A printable page of the notes (browser print window: paper, or Save as PDF for a document).
  function printNotes(title, rows){
    var w=window.open('','_blank');
    if(!w) return false;
    w.document.write('<!doctype html><title>'+esc(title)+'</title>'
      +'<style>body{font:14px Georgia,serif;margin:32px;color:#111}h1{font-size:20px;margin:0 0 14px}.n{border-top:1px solid #999;padding:10px 0;white-space:pre-wrap}.d{font:11px sans-serif;color:#666;margin-bottom:4px}</style>'
      +'<h1>'+esc(title)+'</h1>'
      +rows.map(function(r){ return '<div class="n"><div class="d">'+esc(dateOf(r))+'</div>'+esc(String(r.text_content||'').trim())+'</div>'; }).join(''));
    w.document.close(); w.focus();
    setTimeout(function(){ try{ w.print(); }catch(e){} }, 250);
    return true;
  }

  // opts: {parentName, home:{kind,topic}, notes:[rows with text, newest first], onOpen(row), onAdd()}
  function open(opts){
    injectStyle(); close();
    opts=opts||{};
    var notes=(opts.notes||[]).slice();
    var home=opts.home||{};
    var picked={}, selecting=false;

    var ov=document.createElement('div'); ov.id='fg-note-hub'; ov.className='fg-nh-overlay';
    var card=document.createElement('div'); card.className='fg-nh-card fg-back-3x5 fg-cardback-idea fg-type-journey fg-notes-back';
    var band=(window.FGCardBack && FGCardBack.bandHTML) ? FGCardBack.bandHTML({titleHTML:'NOTES', topicPicker:true, topicPickerId:'fg-nh-topic-btn', kindPicker:true, kindPickerId:'fg-nh-kind-btn', extraHTML:'<button type="button" class="fg-nh-close" title="Close" aria-label="Close">✕</button>'})
      : '<div class="fg-back-idband"><div class="fg-back-idl"><span class="fg-back-title">NOTES</span></div><div class="fg-back-idc"><span class="bb-topic-hit fg-back-topic"></span><span class="bb-boardkind-hit fg-back-kind"></span></div><div class="fg-back-idr"><button type="button" class="fg-nh-close" title="Close" aria-label="Close">✕</button></div></div>';
    card.innerHTML=band
      +'<div class="fg-nh-tools"><button type="button" class="fg-nh-selbtn">select</button><button type="button" class="fg-nh-alltbtn" style="display:none">all</button>'
      +'<span class="fg-nh-spacer"></span><button type="button" class="fg-nh-print" title="Print these notes, or save them as a document">print / save</button>'
      +'<button type="button" class="fg-nh-add" title="Add a note" aria-label="Add a note">+</button></div>'
      +'<div class="fg-nh-list"></div><div class="fg-nh-status"></div>';
    ov.appendChild(card); document.body.appendChild(ov);

    // The ID BAND names the card's own board and TOPIC (the card the notes are about).
    var tEl=card.querySelector('.fg-back-topic'), kEl=card.querySelector('.fg-back-kind');
    if(tEl){ tEl.textContent=home.topic||''; if(!home.topic) tEl.classList.add('fg-back-empty'); }
    if(kEl){ kEl.textContent=home.kind||''; if(!home.kind) kEl.classList.add('fg-back-empty'); }
    // Nov 12 2026 (Larry: "I want the ID BAND to be a universal feature on all cards"): the hub's TOPIC and BOARD are the same real pickers as every other
    // card back, and a pick MOVES the card the notes are about (opts.parent) through the one shared mover (IDBand.moveIdeaTopic / moveIdeaBoard).
    if(opts.parent && window.FGCardBack && window.IDBand && IDBand.moveIdeaBoard){
      var par=opts.parent, ui={rows:opts.rows||null, patch:opts.patch||null, toast:function(m){ status.textContent=m; },
        done:function(m){ close(); if(opts.onMoved) opts.onMoved(m); }};
      var tb=card.querySelector('#fg-nh-topic-btn'), kb=card.querySelector('#fg-nh-kind-btn');
      if(tb) tb.addEventListener('click', function(e){ e.stopPropagation();
        FGCardBack.openTopicMenu(tb, {theme:'idea', sb:window.T2T&&T2T.sb, hereId:par.cluster_id||null, excludeId:par.id, onPick:function(hid){ IDBand.moveIdeaTopic(par, hid, ui); }}); });
      if(kb) kb.addEventListener('click', function(e){ e.stopPropagation();
        var here=opts.rows&&opts.rows[par.cluster_id];
        FGCardBack.openKindMenu(kb, {theme:'idea', current:(IDBand.isParkingLot(here)?'SEA':'IDEA'), onPick:function(k){ IDBand.moveIdeaBoard(par, k.value, ui); }}); });
    }

    var list=card.querySelector('.fg-nh-list'), status=card.querySelector('.fg-nh-status');
    function paint(){
      list.innerHTML='';
      notes.forEach(function(r){
        var s=document.createElement('div'); s.className='fg-nh-strip';
        s.innerHTML='<span class="fg-nh-pick'+(picked[r.id]?' on':'')+'"></span><span class="fg-nh-date">'+esc(dateOf(r))+'</span><span class="fg-nh-line">'+esc(firstLine(r.text_content))+'</span>';
        s.addEventListener('click', function(e){
          e.stopPropagation();
          if(selecting){ picked[r.id]=!picked[r.id]; paint(); return; }
          close(); if(opts.onOpen) opts.onOpen(r);
        });
        list.appendChild(s);
      });
      card.classList.toggle('fg-nh-select', selecting);
    }
    paint();

    card.querySelector('.fg-nh-selbtn').addEventListener('click', function(e){
      e.stopPropagation(); selecting=!selecting; if(!selecting) picked={};
      this.textContent=selecting?'done':'select';
      card.querySelector('.fg-nh-alltbtn').style.display=selecting?'':'none';
      paint();
    });
    card.querySelector('.fg-nh-alltbtn').addEventListener('click', function(e){
      e.stopPropagation();
      var every=notes.every(function(r){ return picked[r.id]; });
      notes.forEach(function(r){ picked[r.id]=!every; }); paint();
    });
    card.querySelector('.fg-nh-print').addEventListener('click', function(e){
      e.stopPropagation();
      var chosen=notes.filter(function(r){ return picked[r.id]; });
      if(!chosen.length) chosen=notes;
      if(!printNotes(opts.parentName||'Notes', chosen)) status.textContent='Your browser blocked the print window. Allow pop-ups for this site and try again.';
    });
    card.querySelector('.fg-nh-add').addEventListener('click', function(e){ e.stopPropagation(); close(); if(opts.onAdd) opts.onAdd(); });
    card.querySelector('.fg-nh-close').addEventListener('click', function(e){ e.stopPropagation(); close(); });
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
  }

  window.FGNoteHub={open:open, close:close};
})();
