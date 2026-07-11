/* ============================================================
   header-data.js — T2T Field Guide shared header/project data layer
   Extracted July 11, 2026 during the FOCUS module rebuild.
   Single source of truth for reading and writing the header tree
   (ideas table, content_type='header'). Both focus.js and
   sea-of-ideas.js depend on this instead of each keeping their own
   copy — that duplication is exactly what caused this session's
   RLS/user-id bugs (one copy used the wrong user object).
   Load this file before sea-of-ideas.js and focus.js.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }

  function _sb(){ return T().sb; }

  async function _currentUser(){
    var res=await _sb().auth.getUser();
    return (res && res.data && res.data.user) || null;
  }

  /* Reserved structural headers — never selectable as a PROJECT/TOPIC
     destination, only ever landing buckets for content. */
  var RESERVED_HEADERS = ['NEW','MISC','Purpose','Trash'];

  /* ── generic tree helpers ── */

  async function fetchAllHeaders(){
    var sb=_sb(); var u=await _currentUser();
    if(!u) return [];
    var res=await sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',u.id).eq('content_type','header');
    if(res && res.error){
      console.warn('fetchAllHeaders error, retrying once:', res.error);
      await new Promise(function(r){ setTimeout(r,400); });
      res=await sb.from('ideas').select('id,text_content,cluster_id').eq('user_id',u.id).eq('content_type','header');
      if(res && res.error) console.error('fetchAllHeaders failed after retry:', res.error);
    }
    return (res && res.data) || [];
  }

  function headerDescendants(allHeaders, rootId){
    var byParent={};
    allHeaders.forEach(function(h){ var p=h.cluster_id; if(!byParent[p]) byParent[p]=[]; byParent[p].push(h); });
    var result=[]; var seen={};
    var queue=(byParent[rootId]||[]).slice();
    while(queue.length){
      var node=queue.shift();
      if(seen[node.id]) continue;
      seen[node.id]=true;
      result.push(node);
      (byParent[node.id]||[]).forEach(function(c){ queue.push(c); });
    }
    return result;
  }

  async function createHeader(name, parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in');
    var ins=await sb.from('ideas').insert({user_id:u.id, content_type:'header', text_content:name, cluster_id:parentId||null, created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Create failed: '+ins.error.message);
    if(!ins.data) throw new Error('Create failed: no row returned');
    return ins.data;
  }

  async function childHeaders(parentId){
    if(!parentId) return [];
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var res=await sb.from('ideas').select('id,text_content').eq('user_id',u.id).eq('content_type','header').eq('cluster_id',parentId);
      if(res.error){ console.warn('childHeaders error:', res.error); return []; }
      return res.data||[];
    }catch(e){ console.warn('childHeaders exception:', e); return []; }
  }

  /* Active (non-reserved) direct children only — the building block for
     one-level-at-a-time TOPIC navigation in FOCUS. */
  async function activeChildHeaders(parentId){
    var kids=await childHeaders(parentId);
    return kids.filter(function(r){ return RESERVED_HEADERS.indexOf(r.text_content)===-1; })
      .sort(function(a,b){ return a.text_content.localeCompare(b.text_content); });
  }

  async function topLevelBoards(){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return [];
      var res=await sb.from('ideas').select('id,text_content').eq('user_id',u.id).eq('content_type','header').is('cluster_id',null);
      if(res.error){ console.warn('topLevelBoards error:', res.error); return []; }
      return (res.data||[]).filter(function(r){ return r.text_content!=='Trash'; });
    }catch(e){ console.warn('topLevelBoards exception:', e); return []; }
  }

  /* ── ensure-named-header helpers (find existing under parent, else create) ── */

  async function ensureHeaderNamed(name, parentId){
    try{
      var sb=_sb(); var u=await _currentUser(); if(!u) return null;
      var q=sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content',name);
      q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
      var existing=await q.limit(1);
      if(existing.error) console.warn('ensureHeaderNamed select error:', existing.error);
      if(existing.data && existing.data.length) return existing.data[0].id;
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:name,cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
      if(ins.error) console.warn('ensureHeaderNamed insert error:', ins.error);
      return ins.data?ins.data.id:null;
    }catch(e){ console.warn('ensureHeaderNamed exception:', e); return null; }
  }

  async function ensureMiscHeader(parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    var q=sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','MISC');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'MISC',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('MISC setup failed: '+ins.error.message);
    return ins.data.id;
  }

  async function ensurePurposeHeader(parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    var q=sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Purpose');
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Purpose',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Purpose setup failed: '+ins.error.message);
    return ins.data.id;
  }

  async function ensureNewAdditionsHeader(parentId){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    // Matches both the current label and the pre-rename one, so boards built
    // before the NEW rename self-heal the first time they're opened again
    // instead of spawning a duplicate reserved header.
    var q=sb.from('ideas').select('id,text_content').eq('user_id',u.id).eq('content_type','header').in('text_content',['NEW','New Additions']);
    q=(parentId===null||parentId===undefined)?q.is('cluster_id',null):q.eq('cluster_id',parentId);
    var existing=await q.limit(1);
    if(!existing.error && existing.data && existing.data.length){
      var row=existing.data[0];
      if(row.text_content!=='NEW'){ try{ await sb.from('ideas').update({text_content:'NEW'}).eq('id',row.id); }catch(e){} }
      return row.id;
    }
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'NEW',cluster_id:parentId||null,created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('NEW setup failed: '+ins.error.message);
    return ins.data.id;
  }

  async function ensureTrashHeader(){
    var sb=_sb(); var u=await _currentUser();
    if(!u) throw new Error('Not signed in.');
    var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Trash').limit(1);
    if(!existing.error && existing.data && existing.data.length) return existing.data[0].id;
    var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Trash',created_at:new Date().toISOString()}).select().single();
    if(ins.error) throw new Error('Trash setup failed: '+ins.error.message);
    return ins.data.id;
  }

  async function ensureWishTank(){
    try{
      var sb=_sb(); var u=await _currentUser();
      if(!u) return {id:null, error:'Not signed in'};
      var existing=await sb.from('ideas').select('id').eq('user_id',u.id).eq('content_type','header').eq('text_content','Wish Tank').is('cluster_id',null).limit(1);
      if(existing.error) return {id:null, error:'Select failed: '+existing.error.message};
      if(existing.data && existing.data.length) return {id:existing.data[0].id, error:null};
      var ins=await sb.from('ideas').insert({user_id:u.id,content_type:'header',text_content:'Wish Tank',cluster_id:null,created_at:new Date().toISOString()}).select().single();
      if(ins.error || !ins.data) return {id:null, error:'Insert failed: '+(ins.error?ins.error.message:'no data returned')};
      var wishTankId=ins.data.id;
      /* One-time migration, only reached on first-ever creation for this member: every
         pre-existing root-level row gets pulled into the new Wish Tank. Reserved Trash
         header is left alone. Runs exactly once per member. */
      try{
        var mig=await sb.from('ideas').update({cluster_id:wishTankId})
          .eq('user_id',u.id).is('cluster_id',null)
          .neq('id',wishTankId).neq('text_content','Trash');
        if(mig.error) console.warn('Wish Tank migration error:', mig.error);
      }catch(migErr){ console.warn('Wish Tank migration exception:', migErr); }
      return {id:wishTankId, error:null};
    }catch(e){ return {id:null, error:'Exception: '+(e&&e.message?e.message:String(e))}; }
  }

  window.T2TData = {
    RESERVED_HEADERS: RESERVED_HEADERS,
    fetchAllHeaders: fetchAllHeaders,
    headerDescendants: headerDescendants,
    createHeader: createHeader,
    childHeaders: childHeaders,
    activeChildHeaders: activeChildHeaders,
    topLevelBoards: topLevelBoards,
    ensureHeaderNamed: ensureHeaderNamed,
    ensureMiscHeader: ensureMiscHeader,
    ensurePurposeHeader: ensurePurposeHeader,
    ensureNewAdditionsHeader: ensureNewAdditionsHeader,
    ensureTrashHeader: ensureTrashHeader,
    ensureWishTank: ensureWishTank
  };

})();
