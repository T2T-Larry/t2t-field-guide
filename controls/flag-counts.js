/* ============================================================
   flag-counts.js -- T2T Field Guide - shared by every board

   COUNTABLE FLAGS. Larry, Oct 27 2026: every signal flag works the same way --
   add as many of each as you like; the count is the resonance. Hearts, gems and
   every custom flag all use this one helper (One tree, one code).

   Where the numbers live (on the card's ideas row):
     heart  -> heart_count (the column hearts always used)
     gem    -> flag_counts.gem  (is_gem stays true while the count is above 0, so the GEMS list keeps working)
     custom -> flag_counts[<flag id>]  (a flag on a card with no number yet counts as 1)
   Works on either kind of card object: the board rows and the Briefing Board cards both carry heart_count, is_gem and flag_counts.
   ============================================================ */
(function(){
  function _fc(row){
    var f = row && row.flag_counts;
    if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
    return (f && typeof f === 'object') ? f : {};
  }
  // key: 'heart', 'gem', or a custom flag id
  function count(row, key){
    if(!row) return 0;
    if(key === 'heart') return row.heart_count || 0;
    var f = _fc(row);
    if(key === 'gem') return f.gem != null ? (f.gem | 0) : (row.is_gem ? 1 : 0);
    return f[key] != null ? (f[key] | 0) : 1;
  }
  // Adds (or takes away) one. Saves, updates the card object, returns the new count (never below 0).
  async function adjust(sb, row, key, delta){
    var n = Math.max(0, count(row, key) + delta);
    var patch = {};
    if(key === 'heart'){
      patch.heart_count = n;
    } else {
      var f = Object.assign({}, _fc(row));
      if(n > 0) f[key] = n; else delete f[key];
      patch.flag_counts = f;
      if(key === 'gem') patch.is_gem = n > 0;
    }
    var res = await sb.from('ideas').update(patch).eq('id', row.id);
    if(res.error) throw res.error;
    for(var k in patch) row[k] = patch[k];
    return n;
  }
  // Small number shown beside a flag on a card face, only when there is more than one.
  function badge(n){
    return n >= 2 ? '<span style="font-size:9px;font-weight:700;line-height:1;margin-left:1px;text-shadow:0 1px 2px rgba(0,0,0,.45);color:#fff">' + n + '</span>' : '';
  }
  // Same number for a light background (the card back's flag pills).
  function badgeDark(n){
    return n >= 2 ? '<span style="font-size:10px;font-weight:700;line-height:1;margin-left:3px;color:#3B2510">' + n + '</span>' : '';
  }
  window.T2TFlagCounts = { count: count, adjust: adjust, badge: badge, badgeDark: badgeDark };
})();
