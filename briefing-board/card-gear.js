/* ============================================================
   card-gear.js -- T2T Field Guide - BRIEFING BOARD (9350)

   THE TASK CARD'S SIDE OF THE ONE GEAR. Nov 26 2026 (Larry: "One card code. Features all selectable as OPTIONS").
   The task card opens the same Gear and popups as every card (controls/gear-hub.js). This file only does what is the task card's own business:
   looking up the card's row for the popups, and keeping the Briefing Board's copy of the card (and its Undo) in step with what a popup saves.
   It replaces the old swatch row that the task card's Gear used to show.

   Shares the Briefing Board's one global scope (see screens.js).
   ============================================================ */

  var _bbGearItem=null;   // the open task card's row, as the popups see it (__bb marks it as a task card)

  function _bbGearItemFor(cardId){ return (_bbGearItem && _bbGearItem.id===cardId) ? _bbGearItem : null; }

  // Looks the card's row up fresh. Resolves to null if the card is no longer the open one or its row cannot be read.
  async function _bbGearLoad(cardId){
    var sb=T().sb; if(!sb || !cardId) return null;
    try{
      if(window.FGNewCardDoor && FGNewCardDoor.whenReady) await FGNewCardDoor.whenReady(cardId);
      var r=await sb.from('ideas').select('*').eq('id', cardId).maybeSingle();
      if(r.error || !r.data || _bbOpenCardId!==cardId) return null;
      _bbGearItem=r.data; _bbGearItem.__bb=true;
      if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync();
      return _bbGearItem;
    }catch(e){ console.error('Briefing Board: could not read the card for its Gear', e); return null; }
  }

  // key: nothing = the Gear itself; 'color' / 'text' = that popup straight from the card's OPTIONS.
  async function _bbOpenGear(key){
    var id=_bbOpenCardId; if(!id || !window.FGGearHub) return;
    var anchor=document.getElementById('bb-d-gear');
    var item=await _bbGearLoad(id); if(!item) return;
    if(key) FGGearHub.openCluster(key, item, anchor); else FGGearHub.open(item, anchor);
  }

  // A popup saved something on a task card: keep the board's own copy the same, so a later save never puts the old value back.
  function _bbGearSync(cardId, patch){
    var c=_bbFindCardAnywhere(cardId); if(!c) return;
    if('color' in patch) c.color=patch.color||'';
    var look=Object.assign({}, _bbLookById[cardId]), changed=false;
    ['subject_bold','subject_caps','subject_italic'].forEach(function(k){ if(k in patch){ look[k]=patch[k]; changed=true; } });
    if(changed) _bbLookById[cardId]=look;
    if(_bbGearItem && _bbGearItem.id===cardId) Object.assign(_bbGearItem, patch);
    _bbSaveLocal(_bbCardsList());
    _bbPersistMergedCardById(cardId);
    renderBoard();
    if(window.FGCardBackFixedRows) FGCardBackFixedRows.sync();
  }
  async function _bbGearApply(cardId, patch){
    var sb=T().sb; if(!sb) return;
    var r=await sb.from('ideas').update(patch).eq('id', cardId);
    if(r.error){ console.error('Briefing Board: undo not saved', r.error); return; }
    _bbGearSync(cardId, patch);
  }

  document.addEventListener('fg-card-saved', function(e){
    var d=e.detail||{}; if(!d.id || !d.patch || !_bbFindCardAnywhere(d.id)) return;
    var c=_bbFindCardAnywhere(d.id), before=d.before||null;
    if(!before && ('color' in d.patch)) before={color:c.color||null};
    _bbGearSync(d.id, d.patch);
    if(before && d.item && d.item.__bb){
      var id=d.id, patch=d.patch;
      _bbPushAction({label:'Edit', undo:function(){ _bbGearApply(id, before); }, redo:function(){ _bbGearApply(id, patch); }});
    }
  });
