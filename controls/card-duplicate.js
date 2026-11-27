/* CARD DUPLICATE -- a copy of one card (Nov 27 2026, Larry approved: Duplicate is a feature, off until checked, on every card; it copies only that card).
   A task card on the Briefing Board keeps its own copy button (briefing-board/card.js doDuplicateCard); every other card is copied here.
   WHAT IS COPIED: the card's own row and its link arrows. NOT copied: the cards beneath it. The copy sits right after the original, named "... (copy)",
   and is not tracked on the Briefing Board until you say so. The top card of a tree cannot be copied.
   Public surface: window.T2TCardDuplicate  .run(cardId) -> the new card's row, or null */
(function(){
  var busy=false;
  function say(msg){ if(typeof _sboardShowToast==='function') _sboardShowToast(msg); else alert(msg); }
  // The saved row for the copy: everything the card holds, less what belongs to the original alone.
  function copyOf(row, userId){
    var c=JSON.parse(JSON.stringify(row));
    delete c.id; delete c.created_at;
    c.user_id=userId;
    c.track_on_briefing_board=false; c.briefing_board_id=null;
    if(typeof c.sort_order==='number') c.sort_order=c.sort_order+1;
    var named=function(v){ return String(v).replace(/\s+$/,'')+' (copy)'; };
    if(String(c.subject||'').trim()) c.subject=named(c.subject);
    else {
      if(String(c.text_content||'').trim()) c.text_content=named(c.text_content);
      if(String(c.idea_text||'').trim()) c.idea_text=named(c.idea_text);
    }
    return c;
  }
  async function run(id){
    if(busy || !id) return null;
    var sb=window.T2T && window.T2T.sb; if(!sb){ say('Not signed in.'); return null; }
    busy=true;
    try{
      if(window.FGNewCardDoor && FGNewCardDoor.whenReady) await FGNewCardDoor.whenReady(id);
      var got=await sb.from('ideas').select('*').eq('id', id).maybeSingle();
      if(got.error) throw got.error;
      var row=got.data; if(!row) throw new Error('card not found');
      if(!row.cluster_id && row.project_id===row.id){ say('The top card cannot be duplicated.'); return null; }
      var me=await sb.auth.getUser(); var uid=me && me.data && me.data.user ? me.data.user.id : null;
      if(!uid) throw new Error('not signed in');
      var made=await sb.from('ideas').insert(copyOf(row, uid)).select().single();
      if(made.error) throw made.error;
      var links=await sb.from('card_links').select('*').eq('idea_id', id);
      if(!links.error && links.data && links.data.length){
        var put=await sb.from('card_links').insert(links.data.map(function(l){ var n=Object.assign({}, l, { idea_id:made.data.id, user_id:uid }); delete n.created_at; return n; }));
        if(put.error) console.error('Duplicate: the link arrows were not copied', put.error);
      }
      if(typeof _sboardAddRow==='function') _sboardAddRow(made.data);
      if(typeof closeSbDetail==='function') closeSbDetail();
      if(typeof renderSeaBoard==='function') renderSeaBoard(false);
      say('Card duplicated');
      return made.data;
    }catch(err){ console.error('Duplicate failed', err); say('The card was not duplicated: '+((err && err.message) || err)); return null; }
    finally{ busy=false; }
  }
  window.T2TCardDuplicate={ run:run };
})();
