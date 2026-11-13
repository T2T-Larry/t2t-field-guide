/* ID BAND MOVES -- the ONE place a card's BOARD pick is carried out, for every card back (Nov 12 2026).
   Larry: "The ID BAND should be universal, regardless of the types of card" and "One code for ID BAND that works for all cards and boards?"
   Before this the task card back and the idea card back each kept their own copy of "what happens when BOARD is picked", so they disagreed.
   Now both call IDBand.moveCardToBoard and only say how to take the old card away and how to refresh the screen.

   IDBand.moveCardToBoard(src, dest, hooks)
     src   = { id, origin:'task'|'idea', text, subject, notes, hideFront, hasPlan:fn()->Promise<bool>,
               details:[{label,value}] optional -- what a new card could not hold (IDBand.detailsOfTask / detailsOfIdea, keep-lost-details.js) }
     dest  = { kind:'SEA'|'IDEA'|'PLAN'|'BRIEFING BOARD', topicId }   (kind is an IDBand.BOARD_KINDS value)
     hooks = { retire():Promise   -- take the old card away (task: soft trash; idea: Trash header). Not called when moveRow handles the move.
               moveRow(parkId):Promise -- optional; an idea card that only changes header is MOVED in place, not copied (keeps its children, undo).
               done(msg)          -- close the back, redraw, show the toast text
               toast(msg) }
   Returns true when the card moved. Sea of Ideas = the topic's Parking Lot (Oct 21 rule), so SEA and IDEA land in the same place. */
(function(){
  async function client(){ return (window.T2T && window.T2T.sb) || null; }
  async function uid(sb){ var a=await sb.auth.getUser(); return (a && a.data && a.data.user) ? a.data.user.id : null; }
  function nameOf(row){ return (window.IDBand && IDBand.rowName) ? IDBand.rowName(row) : (row.subject||row.text_content||'this topic'); }

  async function toParking(sb, u, src, dest, hooks){
    var rootId=(window.T2TData && T2TData.ensureIdeaStoryboardsRoot) ? await T2TData.ensureIdeaStoryboardsRoot().catch(function(){return null;}) : null;
    var parentId=dest.topicId || rootId || null;
    var parkId=await T2TData.ensureNewAdditionsHeader(parentId);
    if(!parkId) throw new Error('No Parking Lot found for that topic');
    var msg=(dest.kind==='SEA' ? 'Moved to the Sea of Ideas (its Parking Lot). ' : 'Moved to the Vision Parking Lot. ');
    if(src.origin==='idea' && hooks.moveRow){ await hooks.moveRow(parkId); hooks.done(''); return true; }
    var row={user_id:u, content_type:'text', text_content:src.text||src.subject, cluster_id:parkId, created_at:new Date().toISOString(),
             notes:(src.notes||'').trim()||null, adds_notes:!!(src.notes||'').trim()};
    if(src.subject && src.text) row.subject=src.subject;
    var ins=await sb.from('ideas').insert(row); if(ins.error) throw ins.error;
    await hooks.retire();
    hooks.done(msg+(src.origin==='task'?'Recently Deleted keeps the Briefing card.':'The Trash keeps the old card.'));
    return true;
  }

  async function toPlan(sb, u, src, dest, hooks){
    if(!dest.topicId){ hooks.toast('Pick a Topic first, then change the Board to PLAN.'); return false; }
    var rootId=(window.T2TData && T2TData.ensureIdeaStoryboardsRoot) ? await T2TData.ensureIdeaStoryboardsRoot().catch(function(){return null;}) : null;
    // Climb from the topic to its project root (a direct child of MASTER, a self-scoped topic, or a true root).
    var proj=null, cur=dest.topicId, guard=0;
    while(cur && guard<25){
      guard++;
      var pr=await sb.from('ideas').select('*').eq('id',cur).maybeSingle(); if(pr.error) throw pr.error;
      var row=pr.data; if(!row) break;
      proj=row;
      if(!row.cluster_id || (rootId && String(row.cluster_id)===String(rootId)) || (row.topic_scope_id && String(row.topic_scope_id)===String(row.id))) break;
      cur=row.cluster_id;
    }
    if(!proj){ hooks.toast('Could not find that Topic.'); return false; }
    var pl=await sb.from('ideas').select('*').eq('content_type','header').eq('storyboard_kind','PLAN').eq('source_project_id',proj.id).limit(1);
    if(pl.error) throw pl.error;
    var planRoot=pl.data && pl.data[0];
    if(!planRoot){
      var mk=await sb.from('ideas').insert(T2TPlan.containerFields(proj,'PLAN',u)).select().single(); if(mk.error) throw mk.error;
      planRoot=mk.data;
    }
    var parkId=await T2TData.ensureNewAdditionsHeader(planRoot.id);
    if(!parkId){ hooks.toast('That Plan board has no Parking Lot to receive this card.'); return false; }
    var ins=await sb.from('ideas').insert({
      user_id:u, content_type:'text', text_content:src.text||src.subject, subject:(src.subject && src.text)?src.subject:null,
      hide_contents_front:src.hideFront!==false, cluster_id:parkId, storyboard_kind:'PLAN',
      notes:(src.notes||'').trim()||null, adds_notes:!!(src.notes||'').trim(),
      track_on_briefing_board:false, created_at:new Date().toISOString()
    });
    if(ins.error) throw ins.error;
    await hooks.retire();
    hooks.done('Moved to the Plan board Parking Lot for '+nameOf(proj)+'. '+(src.origin==='task'?'Recently Deleted keeps the Briefing card.':'The Trash keeps the old card.'));
    return true;
  }

  async function toBriefing(sb, u, src, dest, hooks){
    var br=await sb.from('briefing_boards').select('id,board_type,storyboard_project_id,created_at').eq('user_id',u).order('created_at',{ascending:true}); if(br.error) throw br.error;
    var boards=br.data||[], topicId=dest.topicId;
    var board=boards.filter(function(b){ return topicId && String(b.storyboard_project_id)===String(topicId); })[0]
           || boards.filter(function(b){ return (b.board_type||'personal')==='personal'; })[0] || boards[0];
    if(!board){ hooks.toast('Open the Briefing Board once first, so it has a board to receive this.'); return false; }
    var top=await sb.from('briefing_cards').select('sort_order').eq('board_id',board.id).eq('col','new').order('sort_order',{ascending:true,nullsFirst:false}).limit(1);
    var minSort=(top.data && top.data[0] && typeof top.data[0].sort_order==='number') ? top.data[0].sort_order : 1;
    var row={board_id:board.id, col:'new', task:src.text||src.subject, subject:src.subject||null, hide_contents_front:!!src.hideFront, priority:'', sort_order:minSort-1,
             notes:(src.notes||'').trim()||null, adds_notes:!!(src.notes||'').trim()};
    if(topicId) row.project_header_id=topicId;
    var ins=await sb.from('briefing_cards').insert(row).select('id').single(); if(ins.error) throw ins.error;
    await hooks.retire();
    hooks.done('Moved to the Briefing Board Parking Lot. The Trash keeps the Vision card.');
    return true;
  }

  window.IDBand = window.IDBand || {};
  window.IDBand.moveCardToBoard = async function(src, dest, hooks){
    try{
      if(!src.text && !src.subject){ hooks.toast('This card has no text to move.'); return false; }
      if(src.hasPlan && await src.hasPlan()){ hooks.toast('This card is tied to a plan (waiting for a plan, or that plan\'s GOAL), so it cannot leave its board. Change its TOPIC instead.'); return false; }
      var sb=await client(), u=sb ? await uid(sb) : null;
      if(!sb || !u) throw new Error('Not signed in');
      var k=dest.kind;
      // Nov 13 2026 (Larry: "Save as note rather than hide"): a move that makes a NEW card (everything except an idea simply re-filed in place)
      // can leave details behind -- priority, dates, budget, link. keep-lost-details.js asks once: Save as a Note / Drop them / Cancel.
      var copies=!(src.origin==='idea' && (k==='SEA' || k==='IDEA') && hooks.moveRow);
      if(copies && src.details && src.details.length && window.IDBand.askAboutLostDetails){
        var toLabel=(k==='BRIEFING BOARD') ? 'TASK' : (k==='PLAN') ? 'PLAN' : 'IDEA';
        var answer=await window.IDBand.askAboutLostDetails(src.details, {to:toLabel});
        if(answer==='cancel') return false;
        if(answer==='note') src=Object.assign({}, src, {notes: window.IDBand.notesWithDetails(src.notes, src.details)});
      }
      if(k==='SEA' || k==='IDEA') return await toParking(sb,u,src,dest,hooks);
      if(k==='PLAN') return await toPlan(sb,u,src,dest,hooks);
      if(k==='BRIEFING BOARD') return await toBriefing(sb,u,src,dest,hooks);
      hooks.toast('Moving a card to that board is not built yet. It stays where it is.');
      return false;
    }catch(err){
      console.error('ID BAND move failed', err);
      hooks.toast('Could not move it: '+(err && err.message ? err.message : 'unknown error'));
      return false;
    }
  };

  // ---- Idea rows (Nov 12 2026): the same two band picks for ANY row of the one tree -- the Note Hub's parent card, an idea card, a note ----
  // IDBand.isParkingLot(row)          -> true for a topic's Parking Lot header (the Sea of Ideas)
  // IDBand.moveIdeaTopic(row, hid, ui) -> the TOPIC pick: re-file the row under header hid
  // IDBand.moveIdeaBoard(row, kind, ui) -> the BOARD pick (SEA / IDEA / PLAN / BRIEFING BOARD)
  //   ui = { rows: id->row cache (optional), patch(id,fields), toast(msg), done(msg), moveRow(parkId) (optional: the card's own move with undo) }
  window.IDBand.isParkingLot = function(row){
    return !!(row && row.content_type==='header' && !String(row.subject||'').trim() && String(row.text_content||'').trim().toLowerCase()==='parking lot');
  };
  async function rowOf(id, ui){
    if(!id) return null;
    if(ui.rows && ui.rows[id]) return ui.rows[id];
    var sb=await client(); var r=await sb.from('ideas').select('*').eq('id',id).maybeSingle();
    return r && r.data || null;
  }
  async function plainMove(row, hid, ui){
    var sb=await client();
    var upd=await sb.from('ideas').update({cluster_id:hid}).eq('id',row.id); if(upd.error) throw upd.error;
    row.cluster_id=hid; if(ui.patch) ui.patch(row.id,{cluster_id:hid});
  }
  window.IDBand.moveIdeaTopic = async function(row, hid, ui){
    try{
      if(String(hid||'')===String(row.cluster_id||'')){ ui.toast('It is already there.'); return false; }
      if(ui.moveRow){ await ui.moveRow(hid); return true; }
      await plainMove(row, hid, ui); ui.done('Moved.'); return true;
    }catch(e){ console.error(e); ui.toast('Could not move it: '+((e&&e.message)||'unknown error')); return false; }
  };
  window.IDBand.moveIdeaBoard = async function(row, kind, ui){
    if(row.content_type==='header'){ ui.toast('A header moves with its TOPIC. Change the TOPIC instead.'); return false; }
    var here=await rowOf(row.cluster_id, ui), inPark=window.IDBand.isParkingLot(here);
    if((kind==='SEA'||kind==='IDEA') && inPark){ ui.toast('This card is already in the Parking Lot (the Sea of Ideas) of its topic.'); return false; }
    var topicId=(kind==='BRIEFING BOARD') ? (ui.topicId||null) : (inPark ? (here.cluster_id||null) : row.cluster_id);
    return await window.IDBand.moveCardToBoard(
      {id:row.id, origin:'idea', text:(row.text_content||'').trim(), subject:(row.subject||'').trim(), notes:row.notes, hideFront:row.hide_contents_front, details:(window.IDBand.detailsOfIdea ? window.IDBand.detailsOfIdea(row) : [])},
      {kind:kind, topicId:topicId},
      {moveRow:ui.moveRow||async function(parkId){ await plainMove(row, parkId, ui); },
       retire:async function(){
         var trashId=await T2TData.ensureTrashHeader();
         if(trashId) await plainMove(row, trashId, ui);
       },
       toast:ui.toast, done:ui.done});
  };
})();
