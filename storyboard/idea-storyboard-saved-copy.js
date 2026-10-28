// Saved copy of the board's cards, kept on this device.  Oct 28 2026 (Larry: Reset is too slow).
//
// Why: opening the Field Guide waits for the whole account's cards to download
// (about 9 seconds), and the board cannot draw until they arrive.  This file
// keeps a copy of those cards on this device from the last visit, so the board
// can draw straight away from the copy while the fresh cards download quietly
// behind it.  When the fresh cards arrive they are compared with the copy; if
// anything changed, the board is quietly refreshed (see idea-storyboard-screens.js).
//
// The copy belongs to one signed-in person.  It is used only for that person,
// and it is wiped when they sign out.
(function(){
  var DB_NAME='t2t-saved-board-copy', STORE='copy', KEY='cards';
  var _dbPromise=null;
  function openDb(){
    if(_dbPromise) return _dbPromise;
    _dbPromise=new Promise(function(resolve){
      try{
        var req=indexedDB.open(DB_NAME,1);
        req.onupgradeneeded=function(){ req.result.createObjectStore(STORE); };
        req.onsuccess=function(){ resolve(req.result); };
        req.onerror=function(){ resolve(null); };
        req.onblocked=function(){ resolve(null); };
      }catch(e){ resolve(null); }
    });
    return _dbPromise;
  }
  function run(mode, fn){
    return openDb().then(function(db){
      if(!db) return null;
      return new Promise(function(resolve){
        try{
          var tx=db.transaction(STORE,mode), st=tx.objectStore(STORE), out=fn(st);
          tx.oncomplete=function(){ resolve(out && 'result' in out ? out.result : true); };
          tx.onerror=tx.onabort=function(){ resolve(null); };
        }catch(e){ resolve(null); }
      });
    });
  }
  // Started right away so the copy is already in memory by the time the board asks.
  var _early=run('readonly',function(st){ return st.get(KEY); });
  var _earlyUsed=false;
  function get(userId){
    var p=_earlyUsed ? run('readonly',function(st){ return st.get(KEY); }) : _early;
    _earlyUsed=true;
    return p.then(function(rec){
      if(rec && rec.userId===userId && Array.isArray(rec.rows) && rec.rows.length) return rec.rows;
      return null;
    });
  }
  function save(userId, rows){
    return run('readwrite',function(st){ return st.put({userId:userId, rows:rows, savedAt:Date.now()}, KEY); });
  }
  function clear(){
    return run('readwrite',function(st){ return st.delete(KEY); });
  }
  // A cheap "did anything change" check: one short fingerprint of every card.
  function fingerprint(rows){
    var h=5381, s;
    for(var i=0;i<rows.length;i++){
      s=JSON.stringify(rows[i]);
      for(var j=0;j<s.length;j+=7){ h=((h<<5)+h+s.charCodeAt(j))|0; }
      h=((h<<5)+h+s.length)|0;
    }
    return rows.length+':'+h;
  }
  window.T2TSavedBoardCopy={get:get, save:save, clear:clear, fingerprint:fingerprint};
})();
