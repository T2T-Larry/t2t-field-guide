// my-words.js -- Nov 13 2026 (Larry: "my fingers do not always keep up with my mind ... I hate letting typos out in public ...
// is there any way we can build in a learning feature that corrects frequent typos?")  Build it.
//
// ONE shared behavior (one tree, one code): it watches every text field on every screen from a single place, so no screen
// needs its own copy and a field built later is covered the moment it exists.
//
// What the traveler sees:  nothing, until a typo they make often is fixed quietly as they finish the word. No flash, no popup.
//   - STARTER LIST  a short list of very common slips (teh, adn, recieve ...) is fixed from day one.
//   - LEARNING      when the traveler goes back and fixes a word they already finished, that fix is remembered. The same
//                   slip seen again is fixed on its own once it has been corrected by hand twice (LEARN_AFTER).
//   - UNDO          if a fix was not wanted and the traveler puts the old word back, that word is never "fixed" again.
//   - YOUR WORDS    capitalised names, ALL-CAPS shorthand (BB, SEA, T2T), words with digits, web addresses and anything in
//                   the traveler's protected list are never touched.
//   - NEVER GUESSES it only swaps a word for a fix it has SEEN (starter list or the traveler's own correction), so a real
//                   word is never rewritten by a guess.
// Memory: kept on this device at once, and saved to the traveler's account (table my_words) so it follows them to every device.
//
// Public surface: window.T2TMyWords
//   .list()                       {learned:{typo:{to,n}}, never:[...], protect:[...]}
//   .protect(word) .unprotect(word)   add / remove a word of the traveler's own that must never be changed
//   .forget(typo)                 drop one learned fix
//   .enabled() .setEnabled(on)    master switch (on by default), stored on this device
//   .checkText(text)              returns the text with fixes applied (for code that sets a value without typing)
(function(){
  'use strict';
  if(window.T2TMyWords) return;

  var LS_KEY='t2t_my_words_v1', LS_ON='t2t_my_words_on';
  var LEARN_AFTER=2;          // hand corrections of the same slip before it is fixed on its own
  var MAX_LEARNED=2000;       // keeps the list small enough to travel with the account
  var SAVE_DELAY=4000;        // ms of quiet before the list is saved to the account

  // Starter list: unmistakable slips only. A word that can also be a real word (form/from, quiet/quite) is NOT here.
  var STARTER={
    teh:'the', adn:'and', nad:'and', taht:'that', thta:'that', hte:'the', waht:'what', wiht:'with', whit:'with', jsut:'just',
    recieve:'receive', recieved:'received', definately:'definitely', seperate:'separate', occured:'occurred', untill:'until',
    wich:'which', becuase:'because', beacuse:'because', thier:'their', alot:'a lot', accomodate:'accommodate',
    tommorow:'tomorrow', tomorow:'tomorrow', begining:'beginning', beleive:'believe', freind:'friend', wierd:'weird',
    thign:'thing', thigns:'things', somthing:'something', everthing:'everything', diffrent:'different', probaly:'probably',
    realy:'really', actualy:'actually', usualy:'usually', finaly:'finally', oppurtunity:'opportunity', environement:'environment',
    knowlege:'knowledge', sucessful:'successful', succesful:'successful', responsability:'responsibility', 'dont':"don't",
    'cant':"can't", 'wont':"won't", 'didnt':"didn't", 'doesnt':"doesn't", 'isnt':"isn't", 'wasnt':"wasn't", 'couldnt':"couldn't",
    'wouldnt':"wouldn't", 'shouldnt':"shouldn't", 'im':"I'm", 'ive':"I've", 'youre':"you're"
  };

  var state={learned:{}, never:{}, protect:{}, updated:0};
  var dirty=false, saveTimer=null, loadedFromAccount=false;

  /* ---------- memory: this device + the account ---------- */
  function readLocal(){
    try{
      var raw=localStorage.getItem(LS_KEY); if(!raw) return;
      var o=JSON.parse(raw)||{};
      state.learned=o.learned||{}; state.never=o.never||{}; state.protect=o.protect||{}; state.updated=o.updated||0;
    }catch(e){}
  }
  function writeLocal(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){}
  }
  function client(){ return window.T2T && window.T2T.sb; }
  function userId(){
    try{ var m=window.T2T && window.T2T.getMember && window.T2T.getMember(); return m && (m.user_id||m.id) || null; }catch(e){ return null; }
  }
  function mergeIn(o){            // the account's list and this device's list are joined; counts keep the larger, protections and "never" add up
    if(!o) return;
    var k;
    for(k in (o.learned||{})){
      var a=state.learned[k], b=o.learned[k];
      if(!a || (b && b.n>a.n)) state.learned[k]=b;
    }
    for(k in (o.never||{})){ state.never[k]=1; delete state.learned[k]; }
    for(k in (o.protect||{})){ state.protect[k]=1; }
  }
  function loadFromAccount(){
    var sb=client(), uid=userId();
    if(!sb || !uid || loadedFromAccount) return;
    loadedFromAccount=true;
    sb.from('my_words').select('words').eq('user_id',uid).maybeSingle().then(function(res){
      if(res && res.data && res.data.words){ mergeIn(res.data.words); writeLocal(); }
      if(dirty) scheduleSave();
    }, function(){ loadedFromAccount=false; });
  }
  function saveToAccount(){
    var sb=client(), uid=userId();
    if(!sb || !uid) return;
    sb.from('my_words').upsert({user_id:uid, words:{learned:state.learned, never:state.never, protect:state.protect}, updated_at:new Date().toISOString()})
      .then(function(){ dirty=false; }, function(){});
  }
  function scheduleSave(){
    dirty=true; writeLocal();
    clearTimeout(saveTimer); saveTimer=setTimeout(saveToAccount, SAVE_DELAY);
  }

  function enabled(){ try{ return localStorage.getItem(LS_ON)!=='0'; }catch(e){ return true; } }
  function setEnabled(on){ try{ localStorage.setItem(LS_ON, on?'1':'0'); }catch(e){} }

  /* ---------- words ---------- */
  var WORD=/[A-Za-zÀ-ɏ']+/g;
  function isProtected(w){
    if(!w || w.length<2) return true;
    if(/\d/.test(w)) return true;                               // T2T, 2026, v2
    if(w===w.toUpperCase() && /[A-Z]/.test(w)) return true;     // BB, SEA, T2T, DARE
    if(state.protect[w.toLowerCase()]) return true;
    return false;
  }
  function keepCase(from, to){                                   // Teh -> The, TEH -> THE
    if(from===from.toUpperCase() && from.length>1) return to.toUpperCase();
    if(from.charAt(0)===from.charAt(0).toUpperCase()) return to.charAt(0).toUpperCase()+to.slice(1);
    return to;
  }
  function fixFor(w){                                            // the fix for one finished word, or null
    var low=w.toLowerCase();
    if(state.never[low]) return null;
    if(state.protect[low]) return null;
    var L=state.learned[low];
    if(L && L.n>=LEARN_AFTER) return keepCase(w, L.to);
    if(Object.prototype.hasOwnProperty.call(STARTER, low)){   // starter slips are unmistakable, so even a sentence-start "Teh" is fixed
      if(isProtected(w)) return null;
      return keepCase(w, STARTER[low]);
    }
    return null;
  }
  function checkText(text){
    if(!enabled()||!text) return text;
    return String(text).replace(WORD, function(w){ return isProtected(w) ? w : (fixFor(w)||w); });
  }

  // Damerau-Levenshtein distance, capped small: only near-misses count as "a fix of the same word".
  function dist(a,b){
    var al=a.length, bl=b.length;
    if(Math.abs(al-bl)>2) return 9;
    var d=[], i, j;
    for(i=0;i<=al;i++){ d[i]=[i]; }
    for(j=0;j<=bl;j++){ d[0][j]=j; }
    for(i=1;i<=al;i++){
      for(j=1;j<=bl;j++){
        var c=a.charAt(i-1)===b.charAt(j-1)?0:1;
        d[i][j]=Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+c);
        if(i>1&&j>1&&a.charAt(i-1)===b.charAt(j-2)&&a.charAt(i-2)===b.charAt(j-1)) d[i][j]=Math.min(d[i][j], d[i-2][j-2]+1);
      }
    }
    return d[al][bl];
  }

  /* ---------- watching the fields ---------- */
  // Per field we keep: base = the words as they stood when last settled, editIdx/ = the one finished word being edited right now.
  // A hand correction is only "learned" once the caret has LEFT the word, so a word still being typed is never mistaken for one.
  var track=new WeakMap();
  var lastFix=null;              // the most recent automatic fix, so an undo can be recognised
  var BOUNDARY=/[\s.,;:!?)\]}"”’]/;

  function typable(el){
    if(!el || el.disabled || el.readOnly) return false;
    var t=el.tagName;
    if(t==='TEXTAREA') return true;
    if(t==='INPUT'){ var ty=(el.type||'text').toLowerCase(); return ty==='text'||ty==='search'||ty===''; }
    return false;
  }
  function wordsOf(v){ return (v.match(WORD)||[]); }
  function T(el){ var t=track.get(el); if(!t){ t={base:wordsOf(el.value||''), editIdx:-1}; track.set(el,t); } return t; }
  function caretWordIndex(el){                       // index of the word the caret is in or touching, or -1 (caret in a gap)
    var pos=el.selectionStart; if(pos==null) return -1;
    var head=el.value.slice(0,pos);
    if(!/[A-Za-zÀ-ɏ']$/.test(head)) return -1;
    return wordsOf(head).length-1;
  }
  function pureAppend(o,n){ return n.length>o.length && n.indexOf(o)===0; }

  function learn(typo, to){
    typo=typo.toLowerCase(); to=to.toLowerCase();
    if(typo===to || typo.length<3 || to.length<3) return;
    if(isProtected(typo)||isProtected(to)) return;
    if(dist(typo,to)>2) return;
    if(pureAppend(typo,to) || pureAppend(to,typo)) return;     // adding or removing the end of a word is a different word, not a slip
    if(state.never[typo]) return;
    var L=state.learned[typo];
    if(L && L.to===to) L.n++;
    else if(!L || L.n<=1) state.learned[typo]={to:to, n:1};
    else return;
    if(Object.keys(state.learned).length>MAX_LEARNED) return;
    state.learned[typo].t=Date.now();
    scheduleSave();
  }

  function resolve(el){                               // the caret left the edited word (or the field lost focus): decide what the edit was
    var t=T(el);
    if(t.editIdx>=0){
      var now=wordsOf(el.value), o=t.base[t.editIdx], nw=now[t.editIdx];
      if(now.length===t.base.length && o && nw && o!==nw){
        if(lastFix && lastFix.el===el && o.toLowerCase()===lastFix.to.toLowerCase() && nw.toLowerCase()===lastFix.from.toLowerCase()){
          var low=nw.toLowerCase(); state.never[low]=1; delete state.learned[low]; scheduleSave();   // UNDO: the old word was put back on purpose
          lastFix=null;
        } else learn(o, nw);
      }
    }
    t.base=wordsOf(el.value); t.editIdx=-1;
  }

  function tryFixFinishedWord(el, e){
    var v=el.value, pos=el.selectionStart;
    if(pos==null || pos<2) return false;
    var head=v.slice(0,pos-1), m=head.match(/([A-Za-zÀ-ɏ']+)$/);
    if(!m) return false;
    var w=m[1], before=head.slice(0, head.length-w.length);
    if(/[\/@.#:\\_-]$/.test(before) || /https?:\/\/\S*$/.test(head)) return false;       // inside a web address, e-mail, file name
    if(isProtected(w)) return false;
    var fix=fixFor(w);
    if(!fix || fix===w) return false;
    var start=pos-1-w.length, next=v.slice(0,start)+fix+v.slice(pos-1), delta=fix.length-w.length, st=el.scrollTop;
    el.value=next;                                    // swap the word; the caret stays exactly where the traveler was
    try{ el.setSelectionRange(pos+delta, pos+delta); }catch(x){}
    el.scrollTop=st;
    lastFix={el:el, from:w, to:fix};
    var t=T(el); t.base=wordsOf(next); t.editIdx=-1;
    el.dispatchEvent(new Event('input',{bubbles:true}));   // the screen's own save / auto-grow sees the fixed text
    return true;
  }

  var busy=false;
  function onInput(e){
    var el=e.target;
    if(busy || !typable(el) || !enabled()) return;
    busy=true;
    try{
      var type=e.inputType||'', t=T(el);
      if(/^insert(Text|CompositionText)$/.test(type) && e.data && e.data.length===1 && BOUNDARY.test(e.data)){
        // a boundary after a word: first settle any edit of an older word, then fix this one if it is a known slip
        var idx0=t.editIdx; if(idx0>=0) resolve(el);
        if(tryFixFinishedWord(el,e)) return;
        t.base=wordsOf(el.value); t.editIdx=-1; return;
      }
      var now=wordsOf(el.value);
      if(/^insertFromPaste|^insertFromDrop|^deleteByCut|^deleteByDrag/.test(type) || now.length!==t.base.length){
        if(t.editIdx>=0) resolve(el);                 // words were added or removed: nothing to learn from this edit
        t.base=now; t.editIdx=-1; return;
      }
      var diffs=[], i;
      for(i=0;i<now.length;i++){ if(now[i]!==t.base[i]) diffs.push(i); }
      if(diffs.length===0){ t.editIdx=-1; return; }
      if(diffs.length>1){ t.base=now; t.editIdx=-1; return; }
      var d=diffs[0], caretIdx=caretWordIndex(el);
      if(t.editIdx>=0 && t.editIdx!==d){ resolve(el); t.base=now; t.editIdx=-1; return; }
      if(d===caretIdx){ t.editIdx=d; }                // still inside the word: wait until the caret leaves it
      else { t.editIdx=d; resolve(el); }
    } finally { busy=false; }
  }
  function onCaretMove(e){
    var el=e.target; if(!typable(el)) return;
    var t=T(el); if(t.editIdx>=0 && caretWordIndex(el)!==t.editIdx) resolve(el);
  }
  function onFocus(e){
    var el=e.target; if(!typable(el)) return;
    if(el.getAttribute('spellcheck')==null) el.setAttribute('spellcheck','true');   // the browser's own red underline for words we are not sure of
    var t=T(el); t.base=wordsOf(el.value||''); t.editIdx=-1;
  }
  function onBlur(e){ var el=e.target; if(typable(el)) resolve(el); }

  function start(){
    readLocal();
    document.addEventListener('input', onInput, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('focusout', onBlur, true);
    document.addEventListener('click', onCaretMove, true);
    document.addEventListener('keyup', onCaretMove, true);
    loadFromAccount();
    // the account may not be signed in yet when this file loads: try again a few times, then stop
    var tries=0, iv=setInterval(function(){ loadFromAccount(); if(loadedFromAccount||++tries>20) clearInterval(iv); }, 3000);
  }

  window.T2TMyWords={
    list:function(){ return {learned:state.learned, never:Object.keys(state.never), protect:Object.keys(state.protect)}; },
    protect:function(w){ w=String(w||'').toLowerCase().trim(); if(w){ state.protect[w]=1; delete state.learned[w]; scheduleSave(); } },
    unprotect:function(w){ delete state.protect[String(w||'').toLowerCase().trim()]; scheduleSave(); },
    forget:function(t){ delete state.learned[String(t||'').toLowerCase()]; scheduleSave(); },
    enabled:enabled, setEnabled:setEnabled, checkText:checkText
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
