/* KEEP LOST DETAILS -- the one question asked when a card changes type and some of its details would not fit the new card (Nov 13 2026).
   Larry: "Features which might disappear could have a disposition choice like deleting a header? Save as a Note on the card, delete or ???"
   then "Save as note rather than hide. build these feature options."
   Three answers, one place, used by every card type through IDBand.moveCardToBoard (id-band-moves.js):
     SAVE AS A NOTE  (the default)  the details are written into the card's note, in plain words, so nothing is lost
     DROP THEM                      the card changes type without them
     CANCEL                         nothing changes
   The question only appears when the card actually has details that would be lost; a card with none just changes type.

   IDBand.detailsOfTask(card)   -> [{label, value}]   a Briefing Board card's details (priority, dates, budget, ...)
   IDBand.detailsOfIdea(row)    -> [{label, value}]   an idea card's details (priority, link, organization, ...)
   IDBand.askAboutLostDetails(details, {to}) -> Promise<'note'|'drop'|'cancel'>
   IDBand.notesWithDetails(notes, details)   -> the old note text with the details added underneath */
(function(){
  function has(v){ return v!==undefined && v!==null && String(v).trim()!=='' && v!==false; }
  function pack(pairs){
    return pairs.filter(function(p){ return has(p[1]); }).map(function(p){ return {label:p[0], value:String(p[1]).trim()}; });
  }

  window.IDBand = window.IDBand || {};

  // A Briefing Board card (camelCase, as the board holds it).
  window.IDBand.detailsOfTask = function(c){
    if(!c) return [];
    var keys=(c.keys||[]).filter(Boolean);
    return pack([
      ['Priority', c.priority], ['Assigned to', c.person], ['Start date', c.startDate], ['Start time', c.startTime],
      ['Due date', c.due], ['Due time', c.dueTime],
      ['Routine', c.routine ? ([c.routineFreq, c.routineCustom].filter(has).join(' ') || 'yes') : ''],
      ['Budget', c.budget], ['Organization', c.orgName], ['Situation', c.situation],
      ['Link', [c.linkTitle, c.linkUrl].filter(has).join(' - ')],
      ['Hearts', c.heart_count>0 ? c.heart_count : '']
    ]);
  };

  // An idea card row (snake_case, as the Story Board holds it).
  window.IDBand.detailsOfIdea = function(r){
    if(!r) return [];
    return pack([
      ['Priority', r.priority], ['Organization', r.org_name],
      ['Link', [r.link_title, r.link_url].filter(has).join(' - ')],
      ['Hearts', r.heart_count>0 ? r.heart_count : '']
    ]);
  };

  window.IDBand.notesWithDetails = function(notes, details){
    var old=String(notes||'').trim();
    if(!details || !details.length) return old;
    var lines=details.map(function(d){ return d.label+': '+d.value; }).join('\n');
    return (old ? old+'\n\n' : '')+'Details kept from the old card:\n'+lines;
  };

  var open=null;
  window.IDBand.askAboutLostDetails = function(details, opts){
    opts=opts||{};
    if(!details || !details.length) return Promise.resolve('drop');   // nothing to lose: no question
    if(open){ try{ open.close('cancel'); }catch(e){} }
    return new Promise(function(resolve){
      var ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;';
      var box=document.createElement('div');
      box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true');
      box.style.cssText='background:#fff;color:#222;border-radius:10px;max-width:380px;width:100%;padding:16px 18px;box-shadow:0 8px 30px rgba(0,0,0,.35);font:14px/1.4 system-ui,sans-serif;';
      var h=document.createElement('div'); h.style.cssText='font-weight:700;font-size:15px;margin-bottom:6px;';
      h.textContent='Some details will not fit'+(opts.to ? ' a '+opts.to+' card' : '');
      var p=document.createElement('div'); p.style.cssText='margin-bottom:8px;';
      p.textContent='This card has details the new card cannot hold:';
      var ul=document.createElement('ul'); ul.style.cssText='margin:0 0 12px 18px;padding:0;max-height:160px;overflow:auto;';
      details.forEach(function(d){ var li=document.createElement('li'); li.textContent=d.label+': '+d.value; ul.appendChild(li); });
      var row=document.createElement('div'); row.style.cssText='display:flex;flex-direction:column;gap:6px;';
      var done=false;
      function finish(v){ if(done) return; done=true; document.removeEventListener('keydown', onKey, true); if(ov.parentNode) ov.parentNode.removeChild(ov); open=null; resolve(v); }
      function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); finish('cancel'); } }
      function btn(label, value, primary){
        var b=document.createElement('button'); b.type='button'; b.textContent=label;
        b.style.cssText='padding:8px 10px;border-radius:6px;cursor:pointer;font:inherit;border:1.5px solid #0075ff;'+(primary ? 'background:#0075ff;color:#fff;font-weight:700;' : 'background:#fff;color:#0075ff;');
        b.addEventListener('click', function(e){ e.stopPropagation(); finish(value); });
        row.appendChild(b); return b;
      }
      var first=btn('Save as a Note on the card', 'note', true);
      btn('Drop them', 'drop', false);
      btn('Cancel', 'cancel', false);
      ov.addEventListener('click', function(e){ if(e.target===ov) finish('cancel'); });
      box.appendChild(h); box.appendChild(p); box.appendChild(ul); box.appendChild(row); ov.appendChild(box);
      document.body.appendChild(ov);
      document.addEventListener('keydown', onKey, true);
      open={close:finish};
      try{ first.focus(); }catch(e){}
    });
  };
})();
