/* header-order.js -- Oct 10 2026.
   Larry: "Parking Lot is always the first header. After that what if they are
   in alpha order from left to right?" ... "Is this a GEAR option?" -- "yes add it."

   Gear (Utility) -> Preferences -> Header order: MY ORDER or A to Z, remembered
   per TOPIC so each traveler can keep their own arrangement on every board and
   every device. Parking Lot stays first in either mode (the board draws that
   pin, see idea-storyboard-screens.js).

   A to Z is a DISPLAY mode only. It never writes sort_order, so every card's real
   ORDER # is untouched and switching back to MY ORDER loses nothing.

   Memory: the table public.header_order_prefs holds one row per (user, TOPIC)
   while A to Z is ON; no row = MY ORDER (the default). localStorage is the
   instant cache so the board never waits on the network: setAlpha writes the
   cache and then the table (best effort), and load() pulls the table into the
   cache once the session is ready and fires 't2t-header-order-synced' if the
   open TOPIC's state changed, so the board can redraw. Same pattern as
   az-toggle.js.

   window.T2THeaderOrder
     isAlpha(topicId)         remembered state for that TOPIC (this browser)
     setAlpha(topicId, on)    remember it (cache now, Supabase right after)
     load()                   pull saved settings from Supabase (runs by itself)
*/
(function(){
  'use strict';

  var KEY = 't2t_hdrorder_';
  var TABLE = 'header_order_prefs';

  function isAlpha(topicId){
    try{ return !!topicId && localStorage.getItem(KEY + topicId) === '1'; }catch(e){ return false; }
  }
  function cacheSet(topicId, on){
    try{
      if(on) localStorage.setItem(KEY + topicId, '1'); else localStorage.removeItem(KEY + topicId);
    }catch(e){}
  }
  function client(){ return (window.T2T && window.T2T.sb) ? window.T2T.sb : null; }
  function currentUserId(sb){
    return sb.auth.getSession().then(function(r){
      return (r && r.data && r.data.session && r.data.session.user) ? r.data.session.user.id : null;
    });
  }

  function setAlpha(topicId, on){
    if(!topicId) return;
    cacheSet(topicId, on);
    var sb = client();
    if(!sb) return;   // not signed in yet: the cache holds it
    currentUserId(sb).then(function(uid){
      if(!uid) return;
      if(on){
        return sb.from(TABLE).upsert({user_id: uid, topic_id: topicId, alpha_on: true, updated_at: new Date().toISOString()});
      }
      return sb.from(TABLE).delete().eq('user_id', uid).eq('topic_id', topicId);
    }).catch(function(){});
  }

  var _loaded = false, _loading = false;
  // Pull this traveler's saved settings into the cache. Safe to call repeatedly;
  // only the first successful pass does anything. The table is the truth: cache
  // entries it does not have are dropped.
  function load(){
    if(_loaded || _loading) return;
    var sb = client();
    if(!sb) return;
    _loading = true;
    currentUserId(sb).then(function(uid){
      if(!uid){ _loading = false; return; }
      return sb.from(TABLE).select('topic_id').eq('user_id', uid).then(function(res){
        if(!res || res.error){ _loading = false; return; }
        var remote = {};
        (res.data || []).forEach(function(r){ remote[r.topic_id] = true; });
        var before = isAlpha(window.T2TShared && T2TShared.currentTopicId);
        try{
          var local = [];
          for(var i = 0; i < localStorage.length; i++){
            var k = localStorage.key(i);
            if(k && k.indexOf(KEY) === 0) local.push(k.slice(KEY.length));
          }
          local.forEach(function(t){ if(!remote[t]) localStorage.removeItem(KEY + t); });
        }catch(e){}
        Object.keys(remote).forEach(function(t){ cacheSet(t, true); });
        _loaded = true; _loading = false;
        var after = isAlpha(window.T2TShared && T2TShared.currentTopicId);
        if(after !== before){
          try{ window.dispatchEvent(new CustomEvent('t2t-header-order-synced')); }catch(e){}
        }
      });
    }).catch(function(){ _loading = false; });
  }

  // The session is not ready the instant this file loads, so try until it is
  // (about 30 seconds at most), then stop.
  (function poll(n){
    load();
    if(!_loaded && n < 60) setTimeout(function(){ poll(n + 1); }, 500);
  })(0);

  window.T2THeaderOrder = {
    isAlpha: isAlpha,
    setAlpha: setAlpha,
    load: load
  };
})();
