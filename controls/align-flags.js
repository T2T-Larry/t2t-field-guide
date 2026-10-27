/* ============================================================
   align-flags.js -- T2T Field Guide - shared by every board

   ALIGN FLAGS. Larry, Oct 27 2026: "Every card on any board mentioning
   ALIGN should have a flag." A small pennant appears on the face of any
   card whose subject or text names one of the five ALIGNs -- Vision Align,
   Plan Align, Resource Align, Performance Align or Journey Align.

   Automatic, not stored: the flag is worked out from the card's words each
   time the card is drawn, so it never uses up one of a card's three signal
   flag slots or the 12-flag library, never changes anyone's data, and
   follows the card if its words change. The plain word "align" on its own
   (as in "align every detail") does not count -- only the five named ALIGNs.

   TO CHANGE A COLOR, NAME OR SHAPE: edit the list or the PENNANT line below.
   It is the only place they live.

   Used by: briefing-board/operations.js (Briefing Board card faces) and
   storyboard/idea-storyboard-signal-flags.js (Story/Vision/Plan board cards).
   ============================================================ */
(function(){
  var ALIGNS = [
    { word:'vision',      name:'Vision Align',      color:'#c9a230' },
    { word:'plan',        name:'Plan Align',        color:'#4a7a95' },
    { word:'resource',    name:'Resource Align',    color:'#3F6B3A' },
    { word:'performance', name:'Performance Align', color:'#a3372b' },
    { word:'journey',     name:'Journey Align',     color:'#7a4a95' }
  ];
  var PENNANT = 'polygon(0% 0%, 100% 50%, 0% 100%)';

  // Which ALIGNs do these words name? Always returned in the list order above.
  function list(parts){
    var text = (Array.isArray(parts) ? parts : [parts])
      .filter(function(p){ return p != null && p !== ''; }).join(' ');
    if(!text) return [];
    var found = {};
    var re = /\b(vision|plan|resource|performance|journey)\s+align/gi, m;
    while((m = re.exec(text))) found[m[1].toLowerCase()] = true;
    return ALIGNS.filter(function(a){ return found[a.word]; });
  }

  // Inline look for one flag (a pennant in that ALIGN's color).
  function css(def){
    return 'background:' + def.color + ';clip-path:' + PENNANT + ';';
  }

  // Larry, Oct 27 2026: the red heart means "I like this!" for everyone (more hearts = more resonance), so a
  // custom signal flag can be a heart in any color except red. Returns a plain-words reason, or '' when allowed.
  // (There is no gem shape in the custom shape list, so the gem stays the one official "important" mark.)
  var RED = '#a3372b';
  function reservedReason(shape, color){
    if(shape === 'heart' && String(color).toLowerCase() === RED) return 'The red heart is reserved for \u201cI like this!\u201d. Please pick another color for a heart.';
    return '';
  }

  window.T2TAlignFlags = { list: list, css: css, all: ALIGNS, reservedReason: reservedReason };
})();
