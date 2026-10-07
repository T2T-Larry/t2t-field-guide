/* sea-cluster-groups.js -- Oct 7 2026.
   Larry: "Lasso a group to move them for clustering. Attach a header to a
   cluster but without reorganizing them until we switch to BLUE SKY view."

   On the Sea of Ideas a lassoed set of cards can be NAMED without being
   moved anywhere: the cards stay at their x,y, and the board just draws a
   dashed frame with the name around them. Behind the scenes this is a row in
   sea_groups plus ideas.group_id on each member -- no real header exists yet,
   so no other board (Blue Sky, Briefing Board, DETAILS lists) sees anything
   different until the traveler opens the topic in Blue Sky.

   The moment Blue Sky is opened for a topic, commit(topicId) turns every
   named group into a REAL header under that topic and moves its cards into
   it (reading order: top to bottom, left to right), then removes the group
   rows. That is the "transition": the free-form Sea becomes ordered Blue Sky.

   Public API (window.T2TGroups), all promises except has():
     load(topicId)                 -> [{id,name}]   (cached per topic)
     has(topicId)                  -> true when the cache knows this topic has groups
     create(topicId, name, ids)    -> group row; stamps group_id on ids
     rename(groupId, name)
     setMembers(ids, groupIdOrNull)-> stamp / clear group_id on cards
     remove(topicId, groupId)      -> frame gone, cards stay loose
     prune(topicId, liveGroupIds)  -> drop groups that have no cards left
     commit(topicId)               -> number of headers created
*/
(function(){
  'use strict';

  var cache = {};     // topicId -> [{id,name}]

  function sb(){ return window.T && T().sb; }

  async function load(topicId){
    if (!topicId || !sb()) return [];
    var res = await sb().from('sea_groups').select('id,name,created_at').eq('topic_id', topicId).order('created_at', { ascending: true });
    if (res.error) { console.warn('sea_groups load failed', res.error.message); return cache[topicId] || []; }
    cache[topicId] = res.data || [];
    return cache[topicId];
  }

  function cached(topicId){ return cache[topicId] || []; }
  function has(topicId){ return !!(cache[topicId] && cache[topicId].length); }

  async function setMembers(ids, groupId){
    if (!ids || !ids.length) return;
    var res = await sb().from('ideas').update({ group_id: groupId || null }).in('id', ids);
    if (res.error) throw res.error;
  }

  async function create(topicId, name, ids){
    var res = await sb().from('sea_groups').insert({ topic_id: topicId, name: name }).select('id,name,created_at').single();
    if (res.error) throw res.error;
    (cache[topicId] = cache[topicId] || []).push(res.data);
    await setMembers(ids, res.data.id);
    return res.data;
  }

  async function rename(groupId, name){
    var res = await sb().from('sea_groups').update({ name: name }).eq('id', groupId);
    if (res.error) throw res.error;
    Object.keys(cache).forEach(function(t){ cache[t].forEach(function(g){ if (g.id === groupId) g.name = name; }); });
  }

  async function remove(topicId, groupId){
    // on delete set null clears group_id on every member
    var res = await sb().from('sea_groups').delete().eq('id', groupId);
    if (res.error) throw res.error;
    if (cache[topicId]) cache[topicId] = cache[topicId].filter(function(g){ return g.id !== groupId; });
  }

  async function prune(topicId, liveIds){
    var list = (cache[topicId] || []).slice();
    for (var i = 0; i < list.length; i++) {
      if (liveIds.indexOf(list[i].id) === -1) await remove(topicId, list[i].id);
    }
  }

  // Sea -> Blue Sky: every named group becomes a real header with its cards inside.
  async function commit(topicId){
    if (!topicId || !sb()) return 0;
    var groups = await load(topicId);
    var made = 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var mem = await sb().from('ideas').select('id,canvas_x,canvas_y').eq('group_id', g.id);
      if (mem.error) throw mem.error;
      var rows = (mem.data || []).slice().sort(function(a, b){
        var ay = Number(a.canvas_y) || 0, by = Number(b.canvas_y) || 0;
        if (Math.abs(ay - by) > 60) return ay - by;           // same visual row = within 60px
        return (Number(a.canvas_x) || 0) - (Number(b.canvas_x) || 0);
      });
      if (!rows.length) { await remove(topicId, g.id); continue; }
      var hdr = await window.T2TData.createHeader(g.name, topicId);
      var hid = hdr && hdr.id ? hdr.id : hdr;
      for (var k = 0; k < rows.length; k++) {
        var up = await sb().from('ideas').update({ cluster_id: hid, group_id: null, canvas_x: null, canvas_y: null, sort_order: k }).eq('id', rows[k].id);
        if (up.error) throw up.error;
      }
      await remove(topicId, g.id);
      made++;
    }
    cache[topicId] = [];
    return made;
  }

  window.T2TGroups = { load: load, cached: cached, has: has, create: create, rename: rename, setMembers: setMembers, remove: remove, prune: prune, commit: commit };
})();
