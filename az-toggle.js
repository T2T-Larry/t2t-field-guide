/* az-toggle.js -- Oct 4 2026.
   Larry (CONCEPTS purge): "How can we toggle between this view and a single
   alpha order with headers of a single letter or a group of letters?" ...
   "A-Z is grayed when not in use, with no description of an alternative
   storyboard view" ... "if this is an ID BAND button, it should work for ALL
   boards if applicable ... it is only on or off but sometimes it is N/A."

   The A-Z button lives in every board's ID Band icon row (leftmost, so it sits
   left of TEAM). It has exactly two states a traveler can toggle -- off (gray)
   and on (lit) -- plus N/A, which LOOKS the same as off but does nothing on
   click; the hover tooltip says it is not available on that board.

   This file owns the pieces every board shares: the button's markup and look,
   the on/off memory (per TOPIC, so CONCEPTS can be A-Z while the rest of the
   board stays clustered), and the letter grouping itself. Each board still
   owns whether A-Z applies to it and how it draws the result -- today only
   Blue Sky (idea-storyboard-screens.js) does.

   A-Z is a DISPLAY mode only. It never writes sort_order, so every card's real
   ORDER # is untouched and switching back loses nothing.

   window.T2TAZ
     buttonHTML(id, cls)      markup for the band's icon row (starts as N/A)
     sync(btn, {applies,on})  set the button to off / on / N/A
     isOn(topicId)            remembered state for that TOPIC (this browser)
     setOn(topicId, on)       remember it
     sortKey(name)            lowercased, accents and leading The/A/An dropped
     letterOf(name)           'A'..'Z', or '#' for anything else
     groupLetters(entries, nameOf, minGroup)
                              -> [{label, entries}] in A-Z order; thin letters
                                 share a group (e.g. "X-Z"), a busy letter
                                 stands alone
*/
(function(){
  'use strict';

  var KEY = 't2t_az_';
  var MIN_GROUP = 8;   // a letter with this many entries gets its own group

  // ---- look (injected once; the band's own button classes supply the box) ----
  function ensureStyle(){
    if(document.getElementById('az-toggle-style')) return;
    var s = document.createElement('style');
    s.id = 'az-toggle-style';
    s.textContent =
      '.az-btn{font-size:10px;font-weight:700;letter-spacing:0;padding:0;line-height:1;opacity:.5;cursor:pointer}'
      + '.az-btn[data-az="na"]{cursor:default}'
      + '.az-btn.az-on{opacity:1;background:#5b9bd5!important;border-color:#5b9bd5!important;color:#fff!important}';
    (document.head || document.documentElement).appendChild(s);
  }
  ensureStyle();

  function buttonHTML(id, cls){
    return '<button type="button" class="' + cls + ' az-btn" id="' + id + '" data-az="na"'
      + ' title="Alphabetical order isn’t available on this board" aria-label="Alphabetical order">A-Z</button>';
  }

  function sync(btn, st){
    if(!btn) return;
    st = st || {};
    var applies = !!st.applies, on = applies && !!st.on;
    btn.setAttribute('data-az', applies ? (on ? 'on' : 'off') : 'na');
    btn.classList.toggle('az-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = applies ? 'Alphabetical order' : 'Alphabetical order isn’t available on this board';
  }

  // ---- memory, per TOPIC ----
  function isOn(topicId){
    try{ return !!topicId && localStorage.getItem(KEY + topicId) === '1'; }catch(e){ return false; }
  }
  function setOn(topicId, on){
    try{
      if(!topicId) return;
      if(on) localStorage.setItem(KEY + topicId, '1'); else localStorage.removeItem(KEY + topicId);
    }catch(e){}
  }

  // ---- ordering and letters ----
  function sortKey(name){
    var s = String(name == null ? '' : name).toLowerCase();
    try{ s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }catch(e){}
    s = s.replace(/^[^a-z0-9]+/, '');
    s = s.replace(/^(the|a|an)\s+/, '');
    return s;
  }
  function letterOf(name){
    var c = sortKey(name).charAt(0);
    return (c >= 'a' && c <= 'z') ? c.toUpperCase() : '#';
  }
  function byName(nameOf){
    return function(a, b){
      return sortKey(nameOf(a)).localeCompare(sortKey(nameOf(b)), undefined, {numeric:true, sensitivity:'base'});
    };
  }

  // Sorted entries -> letter groups. A letter with minGroup or more entries
  // stands alone; thinner letters join their neighbors until a group reaches
  // minGroup. A small leftover at the very end folds into the group before it.
  function groupLetters(entries, nameOf, minGroup){
    var min = minGroup || MIN_GROUP;
    var sorted = (entries || []).slice().sort(byName(nameOf));
    var order = [], buckets = {};
    sorted.forEach(function(e){
      var L = letterOf(nameOf(e));
      if(!buckets[L]){ buckets[L] = []; order.push(L); }
      buckets[L].push(e);
    });
    // '#' (digits, symbols) is its own group, always last, never merged into a letter range
    var hasHash = !!buckets['#'];
    order = order.filter(function(L){ return L !== '#'; });
    order.sort(function(a, b){ return a < b ? -1 : 1; });

    var groups = [], cur = null;
    function push(g){ if(g && g.entries.length) groups.push(g); }
    order.forEach(function(L){
      var b = buckets[L];
      if(b.length >= min){
        push(cur); cur = null;
        push({letters:[L], entries:b.slice()});
        return;
      }
      if(!cur) cur = {letters:[], entries:[]};
      cur.letters.push(L);
      cur.entries = cur.entries.concat(b);
      if(cur.entries.length >= min){ push(cur); cur = null; }
    });
    if(cur && cur.entries.length){
      var last = groups[groups.length - 1];
      if(last && cur.entries.length < Math.ceil(min / 2)){
        last.letters = last.letters.concat(cur.letters);
        last.entries = last.entries.concat(cur.entries);
      } else {
        push(cur);
      }
    }
    groups.forEach(function(g){
      var a = g.letters[0], z = g.letters[g.letters.length - 1];
      g.label = (a === z) ? a : (a + '–' + z);
    });
    if(hasHash) groups.push({letters:['#'], entries:buckets['#'].slice(), label:'#'});
    return groups;
  }

  window.T2TAZ = {
    MIN_GROUP: MIN_GROUP,
    buttonHTML: buttonHTML,
    sync: sync,
    isOn: isOn,
    setOn: setOn,
    sortKey: sortKey,
    letterOf: letterOf,
    groupLetters: groupLetters
  };
})();
