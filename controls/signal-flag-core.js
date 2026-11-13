/* ============================================================
   signal-flag-core.js -- T2T Field Guide - one shared home for the Signal Flags basics.
   Larry, Oct 16 2026: "One tree. One code whenever possible."
   The Briefing Board (briefing-board/signal-flags.js) and the Storyboard
   (storyboard/idea-storyboard-signal-flags.js) each kept their own copy of the
   shapes, colors, caps, shape-drawing CSS and the create/edit/delete calls on
   the custom_keys table. Those now live here once; both files read from this core.
   Nov 13 2026 -- structural only, behavior unchanged.
   ============================================================ */
(function(){
  var SHAPES = ['circle','square','triangle','diamond','star','heart'];
  var COLORS = ['#a3372b','#3F6B3A','#4a7a95','#c9a230','#7a4a95','#3B2510'];
  var CLIP = {
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    heart: 'polygon(50% 20%, 60% 0%, 80% 0%, 100% 20%, 100% 40%, 50% 100%, 0% 40%, 0% 20%, 20% 0%, 40% 0%)'
  };
  // raised from 6 -- Aug 4 2026, after merging Storyboard + Briefing Board libraries into one shared pool
  var MAX_KEY_LIBRARY = 12;
  var MAX_KEYS_PER_CARD = 3;

  function shapeCSS(shape, color){
    var css = 'background:' + color + ';';
    if(shape === 'circle') css += 'border-radius:50%;';
    else if(shape === 'square') css += 'border-radius:2px;';
    else if(CLIP[shape]) css += 'clip-path:' + CLIP[shape] + ';';
    return css;
  }

  // Database calls on the custom_keys table. Each takes the Supabase client
  // (sb) so the core never reaches into either board's own globals.
  async function createKey(sb, userId, shape, color, meaning){
    if(!userId) throw new Error('Not signed in.');
    var ins = await sb.from('custom_keys').insert({user_id:userId, shape:shape, color:color, meaning:meaning}).select().single();
    if(ins.error) throw ins.error;
    return ins.data;
  }
  async function updateKey(sb, keyId, shape, color, meaning){
    var upd = await sb.from('custom_keys').update({shape:shape, color:color, meaning:meaning}).eq('id', keyId).select().single();
    if(upd.error) throw upd.error;
    return upd.data;
  }
  async function deleteKey(sb, keyId){
    var del = await sb.from('custom_keys').delete().eq('id', keyId);
    if(del.error) throw del.error;
  }

  window.T2TSignalFlagCore = {
    SHAPES: SHAPES, COLORS: COLORS, CLIP: CLIP,
    MAX_KEY_LIBRARY: MAX_KEY_LIBRARY, MAX_KEYS_PER_CARD: MAX_KEYS_PER_CARD,
    shapeCSS: shapeCSS, createKey: createKey, updateKey: updateKey, deleteKey: deleteKey
  };
})();
