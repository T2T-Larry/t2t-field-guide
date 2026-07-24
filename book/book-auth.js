
(function () {
  var SB_URL = 'https://jyvvbjxqmxdgsxfcrfdn.supabase.co';
  var SB_KEY = 'sb_publishable_LADU6bQTx91yLtXdm4Xb4g_jLjQ6meh';
  var _sb = null;

  function client() {
    if (!_sb && window.supabase) {
      _sb = window.supabase.createClient(SB_URL, SB_KEY);
    }
    return _sb;
  }

  async function getMemberDisplayName(fallback) {
    try {
      var sb = client();
      if (!sb) return fallback;
      var userRes = await sb.auth.getUser();
      var user = userRes && userRes.data && userRes.data.user;
      if (!user) return fallback;
      var profRes = await sb.from('profiles').select('display_name').eq('user_id', user.id).single();
      var name = profRes && profRes.data && profRes.data.display_name;
      return name ? name.toUpperCase() : fallback;
    } catch (e) {
      return fallback;
    }
  }

  window.T2TBookAuth = { getMemberDisplayName: getMemberDisplayName, client: client };
})();
