/* ============================================================
   member-identity.js — T2T Field Guide shared member identity
   (organization name + logo) for the ID Band.
   Created Sept 19 2026, Larry (ID BAND redesign): "left upper corner:
   now has member name only. What if name is below organization name
   in larger letters than member name (which could be smaller)?
   Immediately to the right of the org name would be the LOGO but only
   if there is one. What if there are two ways to enter the org and
   logo? 1) New member entry info, 2) personal info in the Utilities
   button?"

   This file is the one place that knows about a member's organization
   identity. It lives on the member (profiles.org_name / profiles.logo_url)
   -- NOT on any one board or project -- so every board's ID Band shows
   the same thing without each board keeping its own copy:

     T2TMemberIdentity.fill(ids)       -- paint org name / logo / member
                                          name into whichever ID Band
                                          elements a board passes in
     T2TMemberIdentity.openEditor()    -- the "My Info" overlay (opened
                                          from Utility on every screen)
     T2TMemberIdentity.saveOrgName(s)  -- used by signup + the editor
     T2TMemberIdentity.uploadLogoFile(file) -- used by signup + the editor

   Nothing here reaches into a board's private state. Boards call in,
   and listen for the 't2t:identity-changed' event to repaint when the
   member edits their info.
   ============================================================ */

(function(){

  function T(){ return window.T2T; }
  function member(){ return (T() && T().getMember && T().getMember()) || {}; }
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function announce(){
    try{ window.dispatchEvent(new CustomEvent('t2t:identity-changed', { detail: member() })); }catch(e){}
  }

  // ---- Painting -------------------------------------------------
  // ids: { wrap, org, logo, name } -- element ids. Any may be missing.
  // Rules (Larry, Sept 19 2026): member name always shows; org name
  // shows above it only if one is set; logo shows right of the org
  // name only if one is set. With no org name, a logo (if any) simply
  // sits beside the member name so it is never orphaned.
  function fill(ids){
    ids = ids || {};
    var m = member();
    var wrap = ids.wrap && document.getElementById(ids.wrap);
    var orgEl = ids.org && document.getElementById(ids.org);
    var logoEl = ids.logo && document.getElementById(ids.logo);
    var nameEl = ids.name && document.getElementById(ids.name);
    var org = (m.org_name || '').trim();
    var logo = (m.logo_url || '').trim();
    if(nameEl && m.display_name) nameEl.textContent = m.display_name.toUpperCase();
    if(orgEl){
      orgEl.textContent = org;
      orgEl.style.display = org ? '' : 'none';
    }
    // Sept 19 2026 (later, Larry live on Master BB): "remove the LOGOs
    // from the ID BAND -- same for ALL boards, including BB." This
    // identity-block logo is the other Logo besides the per-board one
    // (see T2TLogo.render, idea-media-shared.js, disabled the same
    // session) -- always hidden now regardless of whether the member
    // has one on file, so neither Logo can appear in the ID Band on any
    // board. logo_url itself is left alone (not cleared) so this is a
    // display-only change, reversible without asking anyone to re-upload.
    if(logoEl){
      logoEl.removeAttribute('src');
      logoEl.style.display = 'none';
    }
    // Sept 19 2026: only the organization name changes the name's size;
    // the logo no longer sits in this block (it's placed midway between
    // this block and PROJECT, with its own drag/resize -- see each board's
    // logo wiring).
    if(wrap) wrap.classList.toggle('has-org', !!org);
  }

  // ---- Saving ---------------------------------------------------
  async function currentUserId(){
    var sb = T() && T().sb;
    if(!sb) throw new Error('Not connected.');
    var u = (await sb.auth.getUser()).data.user;
    if(!u) throw new Error('Not signed in.');
    return u.id;
  }
  // silent: skip the 'identity changed' repaint -- used by the logo's own
  // drag/resize saves, which have already painted the new frame themselves.
  async function saveProfilePatch(patch, silent){
    var sb = T().sb;
    var uid = await currentUserId();
    var res = await sb.from('profiles').update(patch).eq('user_id', uid);
    if(res.error) throw res.error;
    var m = member();
    Object.keys(patch).forEach(function(k){
      var v = patch[k];
      m[k] = (v == null) ? (/^logo_(w|h|dx|dy)$/.test(k) ? null : '') : v;
    });
    if(!silent) announce();
  }
  async function saveOrgName(value){
    var v = (value || '').trim();
    await saveProfilePatch({ org_name: v || null });
  }
  async function uploadLogoFile(file){
    if(!file) return;
    if(!/^image\//.test(file.type || '')) throw new Error('Please choose an image file.');
    var sb = T().sb;
    var uid = await currentUserId();
    var toUpload = (window.T2TMedia && window.T2TMedia.compressImageFile) ? await window.T2TMedia.compressImageFile(file) : file;
    var nm = (toUpload.name || file.name || 'logo.png').replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = uid + '/member-logo-' + Date.now() + '-' + nm;
    var up = await sb.storage.from('sea-of-ideas').upload(path, toUpload);
    if(up.error) throw up.error;
    var pub = sb.storage.from('sea-of-ideas').getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;
    if(!url) throw new Error('No public URL returned.');
    await saveProfilePatch({ logo_url: url });
  }
  async function removeLogo(){
    await saveProfilePatch({ logo_url: null });
  }

  // ---- "My Info" overlay ----------------------------------------
  // Self-contained (inline styles only) so it looks the same on every
  // screen that offers Utility, with no dependency on any board's CSS.
  var _ov = null;
  function ensureOverlay(){
    if(_ov && document.body.contains(_ov)) return _ov;
    _ov = document.createElement('div');
    _ov.id = 'mi-overlay';
    _ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    _ov.innerHTML =
       '<div style="background:#fff;color:#2b2b2b;border-radius:12px;width:100%;max-width:380px;padding:18px 18px 16px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;box-sizing:border-box">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
        +'<div style="font-size:18px;font-weight:700">My Info</div>'
        +'<button type="button" id="mi-close" aria-label="Close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1;color:#555">✕</button>'
      +'</div>'
      +'<div id="mi-who" style="font-size:12px;color:#777;margin-bottom:12px"></div>'
      +'<label style="display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#777;margin-bottom:4px">Organization (optional)</label>'
      +'<input id="mi-org" type="text" maxlength="80" placeholder="e.g. Thoughts to Things" style="width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px solid #c9c9c9;border-radius:8px;font-size:15px;margin-bottom:14px">'
      +'<label style="display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#777;margin-bottom:4px">Logo (optional)</label>'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
        +'<div id="mi-logo-box" style="width:56px;height:56px;border:1.5px dashed #c9c9c9;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fafafa;overflow:hidden;flex-shrink:0"><img id="mi-logo-img" alt="" style="max-width:100%;max-height:100%;display:none"><span id="mi-logo-none" style="font-size:11px;color:#aaa">none</span></div>'
        +'<div style="display:flex;flex-direction:column;gap:6px">'
          +'<button type="button" id="mi-logo-pick" style="padding:7px 12px;border:1.5px solid #999;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">Choose logo…</button>'
          +'<button type="button" id="mi-logo-remove" style="padding:5px 12px;border:none;background:none;cursor:pointer;font-size:12px;color:#a8332a;text-align:left">Remove logo</button>'
        +'</div>'
        +'<input type="file" id="mi-logo-file" accept="image/*" style="display:none">'
      +'</div>'
      +'<div id="mi-status" style="min-height:16px;font-size:12px;color:#5a7a3a;margin-bottom:8px"></div>'
      +'<button type="button" id="mi-save" style="width:100%;padding:10px;border:none;border-radius:8px;background:#3B2510;color:#fff;font-size:14px;font-weight:600;cursor:pointer">Save</button>'
      +'</div>';
    document.body.appendChild(_ov);
    _ov.addEventListener('click', function(e){ if(e.target === _ov) close(); });
    _ov.querySelector('#mi-close').addEventListener('click', close);
    _ov.querySelector('#mi-logo-pick').addEventListener('click', function(){ _ov.querySelector('#mi-logo-file').click(); });
    _ov.querySelector('#mi-logo-file').addEventListener('change', async function(e){
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if(!f) return;
      status('Uploading logo…');
      try{ await uploadLogoFile(f); refresh(); status('Logo saved.'); }
      catch(err){ status('Couldn’t save the logo: ' + (err.message || err), true); }
    });
    _ov.querySelector('#mi-logo-remove').addEventListener('click', async function(){
      try{ await removeLogo(); refresh(); status('Logo removed.'); }
      catch(err){ status('Couldn’t remove the logo: ' + (err.message || err), true); }
    });
    _ov.querySelector('#mi-save').addEventListener('click', async function(){
      status('Saving…');
      try{ await saveOrgName(_ov.querySelector('#mi-org').value); status('Saved.'); setTimeout(close, 500); }
      catch(err){ status('Couldn’t save: ' + (err.message || err), true); }
    });
    _ov.querySelector('#mi-org').addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); _ov.querySelector('#mi-save').click(); }
    });
    return _ov;
  }
  function status(msg, isErr){
    var el = _ov && _ov.querySelector('#mi-status');
    if(!el) return;
    el.textContent = msg || '';
    el.style.color = isErr ? '#a8332a' : '#5a7a3a';
  }
  function refresh(){
    if(!_ov) return;
    var m = member();
    _ov.querySelector('#mi-who').textContent = m.display_name ? ('Signed in as ' + m.display_name) : '';
    var orgIn = _ov.querySelector('#mi-org');
    if(document.activeElement !== orgIn) orgIn.value = m.org_name || '';
    var img = _ov.querySelector('#mi-logo-img'), none = _ov.querySelector('#mi-logo-none');
    var rm = _ov.querySelector('#mi-logo-remove');
    if(m.logo_url){ img.src = m.logo_url; img.style.display = ''; none.style.display = 'none'; rm.style.display = ''; }
    else { img.removeAttribute('src'); img.style.display = 'none'; none.style.display = ''; rm.style.display = 'none'; }
  }
  function openEditor(){
    ensureOverlay();
    status('');
    refresh();
    _ov.style.display = 'flex';
    var orgIn = _ov.querySelector('#mi-org');
    try{ orgIn.focus(); }catch(e){}
  }
  function close(){ if(_ov) _ov.style.display = 'none'; }

  window.T2TMemberIdentity = {
    fill: fill,
    openEditor: openEditor,
    closeEditor: close,
    saveOrgName: saveOrgName,
    uploadLogoFile: uploadLogoFile,
    removeLogo: removeLogo,
    savePatch: saveProfilePatch
  };

})();
