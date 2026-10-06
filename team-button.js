/* team-button.js -- the ONE TEAM list.
   Oct 3 2026, Larry (Master BB card "TEAM button"): the head button on every
   board is TEAM. "Every member of the team has a seat on the board," and
   adding a seat is just the dashed (+), no extra words.

   Oct 6 2026, Larry: "our job is to build it right, not just fix it." There
   were TWO lists wearing the TEAM name -- this one (the board's TEAM filter
   button) and the 👤 head's PRIMARY picker in cast-pick-list.js -- each with
   its own copy of the header, the name rows, the type-to-find box and the
   (+) add form, and they had begun to drift apart. This is now the only
   place that draws any of it. Each caller supplies only what is its own: who
   the people are, and what a click on a name DOES.

   window.T2TTeam.build(menu, cfg)
     menu  the dropdown element (already in the page; emptied and refilled)
     cfg:
       mode          'filter' (default) -- the board's TEAM button: an All row
                     and a checkbox per person, any number checked, each one
                     filters the board.
                     'pick' -- the 👤 head: checking a name picks that one
                     person and closes the list.
       prefix        'bb' | 'sc'   -- picks the board's existing row classes
       esc           (text) -> escaped text
       rows          [{user_id, name, email, label?, fromAbove?, tip?}]
                     label = what the row shows (default name, else email);
                     fromAbove draws the gold star (a person carried down
                     from the level above); tip = hover text for the row
       frontEye      optional. {isOn(), onToggle(), tip(on)} -- the eye in the
                     header: open = shown on the card's front, slashed = back only
       loadPool      () -> Promise<[{user_id, name, email, is_member}]>  (the (+))
       addPerson     (name) -> Promise<{ok, msg, person}>  optional; a typed
                     name nobody has yet
       close         () -> void   hide the menu
       onResize      () -> void   optional; the list grew (the add form opened)
     filter mode:
       getFilterIds  () -> array of user_id strings now shown ([] = everyone)
       setFilter     (uid, checked) -> void
       clearFilter   () -> void               the All row
       seatMember    (person) -> Promise<{ok, msg}>   save a seat
       rebuild       () -> void  called after a seat is added
     pick mode:
       selectedUid   whoever is picked now (their row is checked)
       onPick        ({user_id, name, fromAbove}) -> void
       onClear       optional; unchecking the picked row clears the pick.
                     Without it the picked row simply stays checked.
*/
(function(){
  'use strict';

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var EYE_ON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';

  function build(menu, cfg){
    var p = cfg.prefix || 'bb';
    var X = cfg.esc || esc;
    var pick = (cfg.mode === 'pick');
    var rows = cfg.rows || [];
    menu.innerHTML = '';
    // Clicks inside the list (the add form's input, its suggestions) must not
    // reach the page-level "click anywhere closes every dropdown".
    menu.onclick = function(e){ e.stopPropagation(); };
    function label(m){ return m.label || m.name || m.email || '(unnamed)'; }

    /* ---- header: TEAM eyebrow left, the eye right, a divider beneath both ---- */
    var head = document.createElement('div');
    head.className = p + '-team-title';
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:2px 6px 2px 10px;margin-bottom:4px;border-bottom:1px solid rgba(128,128,128,.4)';
    var lbl = document.createElement('span');
    lbl.textContent = 'TEAM';
    lbl.title = 'Every member of the team has a seat on the board';
    lbl.style.cssText = 'font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.12em;opacity:.7;cursor:default';
    head.appendChild(lbl);
    if (cfg.frontEye) {
      var eye = document.createElement('button');
      eye.type = 'button'; eye.className = 'bb-icon-btn';
      eye.style.cssText = 'width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center';
      var paintEye = function(){
        var on = !!cfg.frontEye.isOn();
        eye.innerHTML = on ? EYE_ON : EYE_OFF;
        eye.style.opacity = on ? '1' : '.55';
        var tip = cfg.frontEye.tip ? cfg.frontEye.tip(on) : (on ? 'Shown on the front — click for back only' : 'Back only — click to show on the front');
        eye.title = tip; eye.setAttribute('aria-label', tip);
      };
      paintEye();
      eye.addEventListener('click', async function(e){
        e.stopPropagation(); e.preventDefault();
        await cfg.frontEye.onToggle();
        paintEye();
      });
      head.appendChild(eye);
    }
    menu.appendChild(head);

    /* ---- the people ---- */
    function none(){ var f = cfg.getFilterIds && cfg.getFilterIds(); return !f || !f.length; }
    var allRow = null;
    if (!pick) {
      allRow = document.createElement('div');
      allRow.className = p + '-cdrop-row' + (none() ? ' active' : '');
      allRow.textContent = 'All';
      allRow.addEventListener('click', function(e){
        e.stopPropagation();
        cfg.close();
        cfg.clearFilter();
      });
      menu.appendChild(allRow);
    }

    // Type-to-find: a level can hold hundreds of people (Sept 23 2026).
    var findInput = null;
    if (rows.length > 8) {
      var fwrap = document.createElement('div');
      fwrap.className = p + '-view-addform';
      fwrap.innerHTML = '<input type="text" placeholder="Type to find…" autocomplete="off">';
      findInput = fwrap.querySelector('input');
      menu.appendChild(fwrap);
    }
    var listWrap = document.createElement('div');
    listWrap.style.cssText = 'max-height:min(60vh,420px);overflow-y:auto';
    menu.appendChild(listWrap);

    if (pick && !rows.length) {
      var empty = document.createElement('div');
      empty.className = p + '-cdrop-row';
      empty.style.cssText = 'cursor:default;opacity:.6';
      empty.textContent = 'No one at this level yet.';
      listWrap.appendChild(empty);
    }

    function personRow(m, checked, onChange){
      var row = document.createElement('label');
      row.className = p + '-cdrop-row ' + p + '-view-person-row';
      if (m.tip) row.title = m.tip;
      row.setAttribute('data-find', (String(m.name || '') + ' ' + String(m.email || '')).toLowerCase());
      row.innerHTML = '<input type="checkbox" class="' + p + '-view-person-chk"' + (checked ? ' checked' : '') + '> <span>' + X(label(m)) + '</span>'
        + (m.fromAbove ? ' <span class="cs-parent-star" style="color:#c9a227;font-size:.85em">★</span>' : '');
      var chk = row.querySelector('input');
      chk.addEventListener('change', function(){ onChange(chk); });
      row.addEventListener('click', function(e){ e.stopPropagation(); });
      return row;
    }

    var selected = pick && cfg.selectedUid ? String(cfg.selectedUid) : null;
    rows.forEach(function(m){
      if (pick) {
        var isSel = selected && selected === String(m.user_id);
        listWrap.appendChild(personRow(m, isSel, function(chk){
          if (chk.checked) {
            cfg.close();
            cfg.onPick({ user_id: m.user_id, name: m.name || m.email || '(unnamed)', fromAbove: !!m.fromAbove && !isSel });
          } else if (cfg.onClear) {
            cfg.close();
            cfg.onClear();
          } else {
            chk.checked = true;
          }
        }));
      } else {
        var checked = (cfg.getFilterIds() || []).indexOf(String(m.user_id)) >= 0;
        listWrap.appendChild(personRow(m, checked, function(chk){
          cfg.setFilter(String(m.user_id), chk.checked);
          allRow.className = p + '-cdrop-row' + (none() ? ' active' : '');
        }));
      }
    });

    if (findInput) {
      findInput.addEventListener('input', function(){
        var q = findInput.value.trim().toLowerCase();
        Array.prototype.forEach.call(listWrap.querySelectorAll('.' + p + '-view-person-row'), function(r){
          r.style.display = (!q || r.getAttribute('data-find').indexOf(q) >= 0) ? '' : 'none';
        });
      });
      findInput.addEventListener('keydown', function(e){ if (e.key === 'Escape') { e.stopPropagation(); cfg.close(); } });
      setTimeout(function(){ try { findInput.focus(); } catch (e) {} }, 0);
    }

    /* ---- the (+): one standard control, always last ---- */
    var addRow = document.createElement('div');
    addRow.className = p + '-cdrop-addrow';
    var addBtn = (window.T2TAddControl)
      ? T2TAddControl.make({ title: pick ? 'Add a name' : 'Add someone to this board', sense: menu })
      : (function(){ var b = document.createElement('button'); b.type = 'button'; b.className = p + '-dotted-add-btn'; b.textContent = '+'; b.title = pick ? 'Add a name' : 'Add someone to this board'; return b; })();
    addRow.appendChild(addBtn);
    menu.appendChild(addRow);

    addBtn.addEventListener('click', async function(e){
      e.stopPropagation();
      addRow.remove();
      var form = document.createElement('div');
      form.className = p + '-view-addform';
      form.innerHTML = '<input type="text" placeholder="Type a name or email…" autocomplete="off"><div class="tm-add-suggest" style="display:none"></div><div class="' + p + '-view-add-error" style="display:none"></div>';
      menu.appendChild(form);
      var input = form.querySelector('input'), box = form.querySelector('.tm-add-suggest'), msg = form.querySelector('.' + p + '-view-add-error');
      var listed = {}; rows.forEach(function(r){ listed[String(r.user_id)] = true; });
      var pool = [];
      try { pool = (await cfg.loadPool()) || []; } catch (err) { pool = []; }
      function say(text, bad){ msg.style.display = text ? 'block' : 'none'; msg.textContent = text || ''; msg.style.color = bad ? '#ffb4a2' : '#b7e4c7'; }
      function grew(){ if (cfg.onResize) cfg.onResize(); }
      function renderSuggest(){
        var q = input.value.trim().toLowerCase();
        var matches = pool.filter(function(x){
          if (!x.user_id || listed[String(x.user_id)]) return false;
          if (!q) return true;
          return (x.name || '').toLowerCase().indexOf(q) >= 0 || (x.email || '').toLowerCase().indexOf(q) >= 0;
        });
        var typed = input.value.trim();
        var exact = typed && pool.some(function(x){ return String(x.name || '').toLowerCase() === typed.toLowerCase(); });
        var html = matches.map(function(x){
          return '<div class="tm-add-suggest-row" data-uid="' + X(x.user_id) + '">'
            + '<div class="tm-add-suggest-name">' + X(x.name || x.email || '') + (x.is_member === false ? ' <span style="opacity:.6;font-size:.85em">(not a member yet)</span>' : '') + '</div>'
            + (x.email ? '<div class="tm-add-suggest-email">' + X(x.email) + '</div>' : '')
            + '</div>';
        }).join('');
        if (typed && !exact && typeof cfg.addPerson === 'function') {
          html += '<div class="tm-add-suggest-row" data-newname="' + X(typed) + '"><div class="tm-add-suggest-name">+ Add “' + X(typed) + '”</div><div class="tm-add-suggest-email">new person — not a T2T member yet</div></div>';
        }
        box.innerHTML = html || '<div class="tm-add-suggest-empty">Everyone’s already listed above.</div>';
        box.style.display = 'block';
        grew();
      }
      box.addEventListener('click', async function(ev){
        ev.stopPropagation();
        var r = ev.target.closest('.tm-add-suggest-row'); if (!r) return;
        var newName = r.getAttribute('data-newname');
        if (newName) {
          var made = await cfg.addPerson(newName);
          if (!made || !made.ok) { say((made && made.msg) || 'Could not add that person.', true); return; }
          if (pick) { cfg.close(); cfg.onPick({ user_id: made.person.user_id, name: made.person.name }); return; }
          say('Added “' + made.person.name + '”. They show in this list once they are on a card here.', false);
          input.value = ''; renderSuggest();
          return;
        }
        var uid = r.getAttribute('data-uid');
        var person = pool.filter(function(x){ return String(x.user_id) === String(uid); })[0];
        if (!person) return;
        if (pick) { cfg.close(); cfg.onPick({ user_id: person.user_id, name: person.name || person.email || '(unnamed)' }); return; }
        if (person.is_member === false) {
          say('“' + (person.name || 'That person') + '” is not a T2T member yet, so they can’t be seated on the board itself. Assign them to a card and they will show up here.', true);
          return;
        }
        var res = await cfg.seatMember(person);
        if (!res || !res.ok) { say((res && res.msg) || 'Could not add them.', true); return; }
        cfg.rebuild();           // rebuild so the new name shows as a row
      });
      input.addEventListener('input', renderSuggest);
      input.addEventListener('keydown', function(ev){
        if (ev.key === 'Escape') { ev.stopPropagation(); cfg.close(); }
        if (ev.key === 'Enter') { ev.preventDefault(); var first = box.querySelector('.tm-add-suggest-row'); if (first) first.click(); }
      });
      renderSuggest();
      input.focus();
    });
  }

  window.T2TTeam = { build: build };
})();
