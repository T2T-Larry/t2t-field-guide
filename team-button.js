/* team-button.js -- Oct 3 2026.
   Larry (Master BB card "TEAM button"): the head button on every board is
   TEAM. "Every member of the team has a seat on the board," and adding a
   seat is just the dashed (+), no extra words. It existed twice -- once on
   the Briefing Board (bb-view-*), once on Blue Sky (sc-view-*) -- and the
   Blue Sky copy was a simplified imitation that had to be patched with a
   (+) on its own while the Briefing Board never got one.

   This is the one menu body both boards now use. Each board still owns its
   trigger button, where the menu sits on screen, and the facts only it
   knows (who the roster is, how its filter works, how a seat is saved). This
   file owns what the menu LOOKS like and DOES: the TEAM title, the All row,
   a checkbox row per person, and the (+) that opens the add form.

   window.T2TTeam.build(menu, cfg)
     menu  the dropdown element (already in the page; emptied and refilled)
     cfg:
       prefix        'bb' | 'sc'   -- picks the board's existing row classes
       rows          [{user_id, name, email}]  current team
       getFilterIds  () -> array of user_id strings now shown ([] = everyone)
       setFilter     (uid, checked) -> void   check/uncheck one person
       clearFilter   () -> void               the All row
       loadPool      () -> Promise<[{user_id, name, email, is_member}]>
       seatMember    (person) -> Promise<{ok, msg}>   save a seat
       addPerson     (name)   -> Promise<{ok, msg, person}>  (optional)
       rebuild       () -> void  called after a seat is added
       close         () -> void  hide the menu
       esc           (text) -> escaped text
*/
(function(){
  'use strict';

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build(menu, cfg){
    var p = cfg.prefix;
    var X = cfg.esc || esc;
    menu.innerHTML = '';
    // Clicks inside the list (the add form's input, its suggestions) must not
    // reach the page-level "click anywhere closes every dropdown".
    menu.onclick = function(e){ e.stopPropagation(); };

    // Title -- "TEAM" (the head button's own name), with the principle under it.
    var title = document.createElement('div');
    title.className = p + '-team-title';
    title.style.cssText = 'padding:6px 10px 2px;font-size:calc(10px * var(--fg-text-scale,1));font-weight:700;letter-spacing:.12em;opacity:.7;cursor:default';
    title.textContent = 'TEAM';
    title.title = 'Every member of the team has a seat on the board';
    menu.appendChild(title);

    function none(){ var f = cfg.getFilterIds(); return !f || !f.length; }

    var allRow = document.createElement('div');
    allRow.className = p + '-cdrop-row' + (none() ? ' active' : '');
    allRow.textContent = 'All';
    allRow.addEventListener('click', function(e){
      e.stopPropagation();
      cfg.close();
      cfg.clearFilter();
    });
    menu.appendChild(allRow);

    (cfg.rows || []).forEach(function(m){
      var checked = (cfg.getFilterIds() || []).indexOf(String(m.user_id)) >= 0;
      var row = document.createElement('label');
      row.className = p + '-cdrop-row ' + p + '-view-person-row';
      row.innerHTML = '<input type="checkbox" class="' + p + '-view-person-chk"' + (checked ? ' checked' : '') + '> <span>' + X(m.name || m.email || '(unnamed)') + '</span>';
      var chk = row.querySelector('input');
      chk.addEventListener('change', function(){
        cfg.setFilter(String(m.user_id), chk.checked);
        allRow.className = p + '-cdrop-row' + (none() ? ' active' : '');
      });
      row.addEventListener('click', function(e){ e.stopPropagation(); });
      menu.appendChild(row);
    });

    /* ---- the (+): one standard control, always last ---- */
    var addRow = document.createElement('div');
    addRow.className = p + '-cdrop-addrow';
    var addBtn = (window.T2TAddControl)
      ? T2TAddControl.make({ title: 'Add someone to this board', sense: menu })
      : (function(){ var b = document.createElement('button'); b.type = 'button'; b.className = p + '-dotted-add-btn'; b.textContent = '+'; b.title = 'Add someone to this board'; return b; })();
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
      var listed = {}; (cfg.rows || []).forEach(function(r){ listed[String(r.user_id)] = true; });
      var pool = [];
      try { pool = (await cfg.loadPool()) || []; } catch (err) { pool = []; }
      function say(text, bad){ msg.style.display = text ? 'block' : 'none'; msg.textContent = text || ''; msg.style.color = bad ? '#ffb4a2' : '#b7e4c7'; }
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
      }
      box.addEventListener('click', async function(ev){
        ev.stopPropagation();
        var r = ev.target.closest('.tm-add-suggest-row'); if (!r) return;
        var newName = r.getAttribute('data-newname');
        if (newName) {
          var made = await cfg.addPerson(newName);
          if (!made || !made.ok) { say((made && made.msg) || 'Could not add that person.', true); return; }
          say('Added “' + made.person.name + '”. They show in this list once they are on a card here.', false);
          input.value = ''; renderSuggest();
          return;
        }
        var uid = r.getAttribute('data-uid');
        var person = pool.filter(function(x){ return String(x.user_id) === String(uid); })[0];
        if (!person) return;
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
