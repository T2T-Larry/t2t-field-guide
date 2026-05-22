/**
 * spec-panel.js — T2T Field Guide ✳ Spec Panel
 * Drop into any Field Guide page with: <script src="/spec-panel.js"></script>
 * Reads data-text-id attributes automatically. No other setup needed.
 * Persists settings via localStorage.
 */
(function () {

  /* ── Zone label map ─────────────────────────────────────── */
  const ZONE_LABELS = {
    title:    'Title',
    eyebrow:  'Eyebrow',
    subtitle: 'Subtitle',
    body:     'Body',
    btn1:     'Button 1',
    btn2:     'Button 2',
    btn3:     'Button 3',
    caption:  'Caption',
    label:    'Label',
    tagline:  'Tagline'
  };

  /* ── Inject styles ──────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #fg-ast-btn {
      position: fixed;
      bottom: 18px;
      right: 18px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      color: rgba(255,255,255,0.75);
      font-family: system-ui, sans-serif;
      font-weight: 400;
      z-index: 9999;
      transition: background 0.15s, opacity 0.15s;
      user-select: none;
      backdrop-filter: blur(4px);
    }
    #fg-ast-btn:hover { background: rgba(255,255,255,0.25); color: #fff; }
    #fg-ast-btn.open  { background: rgba(255,255,255,0.28); color: #fff; }

    #fg-ast-panel {
      position: fixed;
      bottom: 62px;
      right: 14px;
      width: 252px;
      max-height: 70vh;
      background: #fff;
      border: 0.5px solid rgba(0,0,0,0.14);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.13);
      z-index: 9998;
      display: none;
      font-family: system-ui, -apple-system, sans-serif;
      overflow-y: auto;
      overflow-x: hidden;
    }
    #fg-ast-panel.open { display: block; }

    .fg-ast-tabs {
      display: flex;
      border-bottom: 0.5px solid rgba(0,0,0,0.09);
      background: #fafafa;
    }
    .fg-ast-tab {
      flex: 1;
      padding: 9px 4px;
      font-size: 11px;
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      color: #888;
      border-bottom: 2px solid transparent;
      transition: color 0.1s, border-color 0.1s;
      letter-spacing: 0.02em;
    }
    .fg-ast-tab:hover { color: #444; }
    .fg-ast-tab.on { color: #2C2C2A; border-bottom: 2px solid #7F77DD; }

    .fg-ast-body { padding: 14px 14px 16px; }
    .fg-ast-pane { display: none; }
    .fg-ast-pane.on { display: block; }

    .fg-ast-lbl {
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #aaa;
      margin: 0 0 6px;
    }
    .fg-ast-section { margin-bottom: 14px; }
    .fg-ast-section:last-child { margin-bottom: 0; }
    .fg-ast-div { height: 0.5px; background: rgba(0,0,0,0.07); margin: 12px 0; }

    /* Text rows */
    .fg-ast-text-row {
      display: grid;
      grid-template-columns: 72px minmax(0,1fr) 26px;
      align-items: center;
      gap: 7px;
      margin-bottom: 7px;
    }
    .fg-ast-text-row:last-child { margin-bottom: 0; }
    .fg-ast-zone-lbl { font-size: 10.5px; color: #999; font-weight: 500; }
    .fg-ast-val {
      font-size: 11.5px;
      color: #2C2C2A;
      padding: 4px 7px;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 6px;
      background: #f5f5f3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: text;
      outline: none;
      line-height: 1.4;
    }
    .fg-ast-val[contenteditable="true"] {
      border-color: #7F77DD;
      background: #fff;
      white-space: normal;
      box-shadow: 0 0 0 2px rgba(127,119,221,0.15);
    }
    .fg-ast-edit-btn {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 13px;
      color: #aaa;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
      flex-shrink: 0;
    }
    .fg-ast-edit-btn:hover { background: #f0f0ef; color: #555; }
    .fg-ast-edit-btn.saving { color: #3B6D11; border-color: #9FE1CB; }

    .fg-ast-hint {
      font-size: 10.5px; color: #bbb;
      margin: 0 0 10px; line-height: 1.5;
    }
    .fg-ast-toast {
      font-size: 10.5px; color: #3B6D11;
      text-align: right; margin-top: 8px;
      opacity: 0; transition: opacity 0.3s;
    }
    .fg-ast-toast.show { opacity: 1; }

    /* Button rows */
    .fg-ast-btn-row { display: flex; gap: 5px; }
    .fg-ast-xbtn {
      flex: 1; padding: 5px 4px; font-size: 11.5px;
      border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 7px;
      background: #fff;
      color: #777;
      cursor: pointer; text-align: center;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
      font-family: inherit;
    }
    .fg-ast-xbtn:hover { background: #f5f5f3; }
    .fg-ast-xbtn.on { background: #f5f5f3; border-color: rgba(0,0,0,0.25); color: #2C2C2A; font-weight: 600; }

    /* Theme swatches */
    .fg-ast-themes { display: flex; gap: 5px; }
    .fg-ast-swatch {
      flex: 1; border-radius: 7px;
      border: 0.5px solid rgba(0,0,0,0.15);
      padding: 7px 4px; font-size: 10.5px; text-align: center;
      cursor: pointer; transition: border-width 0.1s;
      font-family: inherit;
    }
    .fg-ast-swatch.on { border: 2px solid #7F77DD; }
    .fg-ast-sw-light { background:#fff;     color:#2C2C2A; }
    .fg-ast-sw-dark  { background:#1e1e1e;  color:#D3D1C7; }
    .fg-ast-sw-sepia { background:#F4ECD8;  color:#4A3728; }

    /* Font buttons */
    .fg-ast-font-col { display: flex; flex-direction: column; gap: 5px; }
    .fg-ast-font-btn {
      padding: 6px 9px; font-size: 12px;
      border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 7px;
      background: #fff; color: #777;
      cursor: pointer; text-align: left;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
      font-family: inherit;
    }
    .fg-ast-font-btn:hover { background: #f5f5f3; }
    .fg-ast-font-btn.on { background: #f5f5f3; border-color: rgba(0,0,0,0.25); color: #2C2C2A; font-weight: 600; }
  `;
  document.head.appendChild(style);

  /* ── Build panel HTML ───────────────────────────────────── */
  const btn = document.createElement('div');
  btn.id = 'fg-ast-btn';
  btn.setAttribute('aria-label', 'Spec settings');
  btn.setAttribute('title', 'Spec settings');
  btn.textContent = '✳';

  const panel = document.createElement('div');
  panel.id = 'fg-ast-panel';
  panel.innerHTML = `
    <div class="fg-ast-tabs">
      <div class="fg-ast-tab on" data-tab="text">Text</div>
      <div class="fg-ast-tab" data-tab="design">Design</div>
    </div>
    <div class="fg-ast-body">

      <div class="fg-ast-pane on" id="fg-ast-pane-text">
        <p class="fg-ast-hint">Click ✏ to edit. Press Enter or ✓ to save.</p>
        <div id="fg-ast-text-list"></div>
        <div class="fg-ast-toast" id="fg-ast-toast">✓ Saved</div>
      </div>

      <div class="fg-ast-pane" id="fg-ast-pane-design">

        <div class="fg-ast-section">
          <p class="fg-ast-lbl">Font</p>
          <div class="fg-ast-font-col">
            <button class="fg-ast-font-btn on" data-font="playfair" style="font-family:'Playfair Display',Georgia,serif">Playfair Display</button>
            <button class="fg-ast-font-btn" data-font="inter" style="font-family:'Inter',system-ui,sans-serif">Inter</button>
          </div>
        </div>

        <div class="fg-ast-div"></div>

        <div class="fg-ast-section">
          <p class="fg-ast-lbl">Theme</p>
          <div class="fg-ast-themes">
            <div class="fg-ast-swatch fg-ast-sw-light on" data-theme="light">Light</div>
            <div class="fg-ast-swatch fg-ast-sw-dark"  data-theme="dark">Dark</div>
            <div class="fg-ast-swatch fg-ast-sw-sepia" data-theme="sepia">Sepia</div>
          </div>
        </div>

        <div class="fg-ast-div"></div>

        <div class="fg-ast-section">
          <p class="fg-ast-lbl">Text size</p>
          <div class="fg-ast-btn-row">
            <button class="fg-ast-xbtn" data-size="small">S</button>
            <button class="fg-ast-xbtn on" data-size="medium">M</button>
            <button class="fg-ast-xbtn" data-size="large">L</button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  /* ── Tab switching ──────────────────────────────────────── */
  panel.querySelectorAll('.fg-ast-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.fg-ast-tab').forEach(t => t.classList.remove('on'));
      panel.querySelectorAll('.fg-ast-pane').forEach(p => p.classList.remove('on'));
      tab.classList.add('on');
      document.getElementById('fg-ast-pane-' + tab.dataset.tab).classList.add('on');
      if (tab.dataset.tab === 'text') buildTextList();
    });
  });

  /* ── Toggle panel ───────────────────────────────────────── */
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    btn.classList.toggle('open', open);
    if (open) buildTextList();
  });

  /* ── Close on outside click ─────────────────────────────── */
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  /* ── Text tab ───────────────────────────────────────────── */
  function buildTextList() {
    const list = document.getElementById('fg-ast-text-list');
    list.innerHTML = '';
    const activeScreen = document.querySelector('.sc.active') || document.body;
    const nodes = activeScreen.querySelectorAll('[data-text-id]');
    if (!nodes.length) {
      list.innerHTML = '<p style="font-size:11px;color:#bbb;text-align:center;padding:8px 0;">No text zones found on this page.</p>';
      return;
    }
    nodes.forEach(el => {
      const id = el.dataset.textId;
      const row = document.createElement('div');
      row.className = 'fg-ast-text-row';

      const lbl = document.createElement('div');
      lbl.className = 'fg-ast-zone-lbl';
      lbl.textContent = ZONE_LABELS[id] || id;

      const val = document.createElement('div');
      val.className = 'fg-ast-val';
      val.textContent = el.textContent.trim();
      val.setAttribute('contenteditable', 'false');

      const editBtn = document.createElement('div');
      editBtn.className = 'fg-ast-edit-btn';
      editBtn.innerHTML = '✏';
      editBtn.setAttribute('aria-label', 'Edit ' + (ZONE_LABELS[id] || id));

      let editing = false;
      editBtn.addEventListener('click', () => {
        if (!editing) {
          editing = true;
          val.setAttribute('contenteditable', 'true');
          val.focus();
          const range = document.createRange();
          range.selectNodeContents(val);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          editBtn.classList.add('saving');
          editBtn.innerHTML = '✓';
        } else {
          save();
        }
      });

      val.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { cancel(); }
      });

      function save() {
        editing = false;
        val.setAttribute('contenteditable', 'false');
        editBtn.classList.remove('saving');
        editBtn.innerHTML = '✏';
        el.textContent = val.textContent;
        persistText(id, val.textContent);
        showToast();
      }

      function cancel() {
        editing = false;
        val.setAttribute('contenteditable', 'false');
        val.textContent = el.textContent.trim();
        editBtn.classList.remove('saving');
        editBtn.innerHTML = '✏';
      }

      row.appendChild(lbl);
      row.appendChild(val);
      row.appendChild(editBtn);
      list.appendChild(row);
    });
  }

  function showToast() {
    const toast = document.getElementById('fg-ast-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  /* ── Design tab ─────────────────────────────────────────── */
  const fonts = {
    playfair: "'Playfair Display', Georgia, serif",
    inter:    "'Inter', system-ui, sans-serif"
  };
  const sizes = { small: '14px', medium: '16px', large: '19px' };

  panel.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', () => {
    panel.querySelectorAll('[data-font]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    document.body.style.fontFamily = fonts[b.dataset.font];
    persist('font', b.dataset.font);
  }));

  panel.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    panel.querySelectorAll('[data-size]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    document.documentElement.style.fontSize = sizes[b.dataset.size];
    persist('size', b.dataset.size);
  }));

  panel.querySelectorAll('[data-theme]').forEach(s => s.addEventListener('click', () => {
    panel.querySelectorAll('[data-theme]').forEach(x => x.classList.remove('on'));
    s.classList.add('on');
    applyTheme(s.dataset.theme);
    persist('theme', s.dataset.theme);
  }));

  const themes = {
    light: { '--fg-bg':'#fff',     '--fg-text':'#2C2C2A', '--fg-muted':'#5F5E5A' },
    dark:  { '--fg-bg':'#1e1e1e',  '--fg-text':'#E8E6DF', '--fg-muted':'#A0A09A' },
    sepia: { '--fg-bg':'#F4ECD8',  '--fg-text':'#3A2A1E', '--fg-muted':'#7A6253' }
  };

  function applyTheme(name) {
    const t = themes[name];
    if (!t) return;
    Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }

  /* ── Persistence ─────────────────────────────────────────── */
  const STORE_KEY = 'fg-spec-settings';
  const TEXT_KEY  = 'fg-spec-text';

  function persist(key, val) {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      s[key] = val;
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch(e) {}
  }

  function persistText(id, val) {
    try {
      const page = window.location.pathname;
      const s = JSON.parse(localStorage.getItem(TEXT_KEY) || '{}');
      if (!s[page]) s[page] = {};
      s[page][id] = val;
      localStorage.setItem(TEXT_KEY, JSON.stringify(s));
    } catch(e) {}
  }

  function restoreSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (s.font) {
        const b = panel.querySelector(`[data-font="${s.font}"]`);
        if (b) { panel.querySelectorAll('[data-font]').forEach(x => x.classList.remove('on')); b.classList.add('on'); document.body.style.fontFamily = fonts[s.font]; }
      }
      if (s.size) {
        const b = panel.querySelector(`[data-size="${s.size}"]`);
        if (b) { panel.querySelectorAll('[data-size]').forEach(x => x.classList.remove('on')); b.classList.add('on'); document.documentElement.style.fontSize = sizes[s.size]; }
      }
      if (s.theme) {
        const sw = panel.querySelector(`[data-theme="${s.theme}"]`);
        if (sw) { panel.querySelectorAll('[data-theme]').forEach(x => x.classList.remove('on')); sw.classList.add('on'); applyTheme(s.theme); }
      }
    } catch(e) {}
  }

  function restoreText() {
    try {
      const page = window.location.pathname;
      const s = JSON.parse(localStorage.getItem(TEXT_KEY) || '{}');
      const pageText = s[page];
      if (!pageText) return;
      Object.entries(pageText).forEach(([id, val]) => {
        const el = document.querySelector(`[data-text-id="${id}"]`);
        if (el) el.textContent = val;
      });
    } catch(e) {}
  }

  /* ── Init ────────────────────────────────────────────────── */
  restoreSettings();
  restoreText();

})();
