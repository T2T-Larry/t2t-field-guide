// subject-only-view.js -- Oct 10 2026 (Master BB card "BB reaches into Storyboard privates").
// The universal Subject-only view switch (Sept 27 2026) is a traveler-side viewing
// preference shared by the Storyboard, Session and Briefing Board. It used to live
// inside idea-storyboard-shared.js as the private _sboardSubjectOnlyView, and
// briefing-board-ops.js reached into it directly. It now lives here as a small public
// module both board families call openly: window.T2TViewPrefs.
// Stored in localStorage (not a DB field), same key as before, so nothing a traveler
// already chose is lost.
(function(){
  var KEY='t2t-subject-only-view';
  var _on=(function(){ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } })();
  window.T2TViewPrefs={
    isSubjectOnly: function(){ return _on; },
    setSubjectOnly: function(on){
      _on=!!on;
      try{ localStorage.setItem(KEY, _on?'1':'0'); }catch(e){}
    }
  };
})();
