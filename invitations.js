/* ============================================================
   invitations.js — T2T Field Guide · MEMBERSHIP INVITATIONS
   Oct 10 2026 (Larry: "adding someone to a board just inserts a row and
   the person is never told" -- found when Bill was added to MASTER).

   Adding a person to a board or topic no longer creates their seat. It
   creates a PENDING invitation (membership_invitations); the seat is
   created only when the invitee clicks Accept. Decline leaves nothing
   behind. All writes go through SECURITY DEFINER functions
   (invite_member, accept_invitation, decline_invitation,
   cancel_invitation) that re-check ownership server-side, so nothing in
   this file can grant access the database would not.

   Exposes window.T2T.invitations = { invite, listPending, cancel,
   showNotice }. Loaded on every page that can add a person
   (index/dream/believe/dare/journey). On sign-in it lists the traveler's
   own pending invitations in a notice with Accept / Decline.

   Not here yet (own cards): invitation EMAIL (needs an email service),
   and carrying the PRIMARY role on an invitation.
   ============================================================ */
(function(){

  function T(){ return window.T2T; }
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ---- Inviter side -------------------------------------------------
  // targetType: 'board' | 'topic'.  access: 'edit' | 'view'.
  async function invite(targetType, targetId, userId, access){
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await sb.rpc('invite_member', {p_target_type: targetType, p_target_id: targetId, p_invitee: userId, p_access: access||'edit'});
      if(res.error) return {ok:false,msg:res.error.message||'Could not send the invitation.'};
      return {ok:true, id:res.data, invited:true};
    }catch(e){ return {ok:false,msg:'Could not send the invitation.'}; }
  }

  async function listPending(targetType, targetId){
    var sb=T().sb; if(!sb || !targetId) return [];
    try{
      var res=await sb.rpc('list_pending_invitations', {p_target_type: targetType, p_target_id: targetId});
      return (!res.error && res.data) ? res.data : [];
    }catch(e){ return []; }
  }

  async function cancel(invitationId){
    var sb=T().sb; if(!sb) return {ok:false,msg:'Not connected.'};
    try{
      var res=await sb.rpc('cancel_invitation', {p_invitation_id: invitationId});
      if(res.error) return {ok:false,msg:res.error.message||'Could not cancel.'};
      return {ok:true};
    }catch(e){ return {ok:false,msg:'Could not cancel.'}; }
  }

  // Pending strip: under a roster list, shows who the signed-in inviter has
  // invited and who has not answered yet, each with Cancel. Only the inviter
  // sees their own pending invitations (the RPC filters on invited_by).
  async function mountPending(listEl, targetType, targetId){
    if(!listEl || !listEl.parentNode) return;
    var old=listEl.parentNode.querySelector('.t2t-inv-pending[data-for="'+listEl.id+'"]');
    var rows=await listPending(targetType, targetId);
    if(old && old.parentNode) old.parentNode.removeChild(old);
    if(!rows.length) return;
    var strip=document.createElement('div');
    strip.className='t2t-inv-pending'; strip.setAttribute('data-for', listEl.id);
    strip.style.cssText='margin-top:10px;padding:8px 10px;border:1px dashed rgba(59,37,16,0.35);border-radius:6px;font-size:12px';
    strip.innerHTML='<div style="font-weight:bold;margin-bottom:4px">⏳ Invited, waiting to accept</div>'
      +rows.map(function(r){
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:2px 0">'
          +'<span>'+_esc(r.invitee_name||r.invitee_email||'')+' <i>('+(r.access_level==='view'?'guest':'team')+')</i></span>'
          +'<button class="t2t-inv-btn" data-cancel="'+_esc(r.id)+'" style="padding:2px 8px;font-size:11px">Cancel</button></div>';
      }).join('');
    listEl.parentNode.insertBefore(strip, listEl.nextSibling);
    strip.querySelectorAll('[data-cancel]').forEach(function(b){
      b.addEventListener('click', async function(){
        b.disabled=true;
        var res=await cancel(b.getAttribute('data-cancel'));
        if(!res.ok){ window.alert(res.msg); b.disabled=false; return; }
        mountPending(listEl, targetType, targetId);
      });
    });
  }

  // ---- Invitee side -------------------------------------------------
  var _STYLE_ID='t2t-invite-style';
  function _ensureStyle(){
    if(document.getElementById(_STYLE_ID)) return;
    var st=document.createElement('style'); st.id=_STYLE_ID;
    st.textContent=
      '#t2t-invite-overlay{position:fixed;inset:0;background:rgba(40,28,14,0.55);z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}'
      +'#t2t-invite-overlay.active{display:flex}'
      +'#t2t-invite-card{width:420px;max-width:100%;max-height:85vh;overflow-y:auto;background:#FFFDF7;border-radius:8px;border-top:6px solid #8b6b3d;box-shadow:0 10px 30px rgba(59,37,16,0.4);padding:18px 22px 20px;box-sizing:border-box;font-family:inherit;color:#3b2510}'
      +'#t2t-invite-card h3{margin:0 0 4px;font-size:18px}'
      +'#t2t-invite-card .t2t-inv-sub{font-size:12px;opacity:.75;margin-bottom:12px}'
      +'.t2t-inv-row{border-top:1px solid rgba(59,37,16,0.15);padding:10px 0}'
      +'.t2t-inv-what{font-size:14px;line-height:1.35;margin-bottom:8px}'
      +'.t2t-inv-btns{display:flex;gap:8px}'
      +'.t2t-inv-btn{border:1px solid #8b6b3d;background:#fff;color:#3b2510;border-radius:6px;padding:6px 14px;font-size:13px;cursor:pointer}'
      +'.t2t-inv-btn.t2t-inv-accept{background:#8b6b3d;color:#fff}'
      +'.t2t-inv-btn:disabled{opacity:.5;cursor:default}'
      +'.t2t-inv-err{color:#a3372b;font-size:12px;margin-top:6px}'
      +'#t2t-invite-later{margin-top:12px;text-align:right}';
    document.head.appendChild(st);
  }

  var _shownKey='t2t_invites_later';
  function _laterIds(){ try{ return JSON.parse(sessionStorage.getItem(_shownKey)||'[]'); }catch(e){ return []; } }
  function _addLater(ids){ try{ sessionStorage.setItem(_shownKey, JSON.stringify(_laterIds().concat(ids))); }catch(e){} }

  function _accessWords(a){ return a==='view' ? 'as a guest (view only)' : 'as a team member (can edit)'; }
  function _kindWord(t){ return t==='board' ? 'board' : 'topic'; }

  async function _loadMine(){
    var sb=T().sb; if(!sb) return [];
    try{
      var res=await sb.rpc('list_my_invitations');
      return (!res.error && res.data) ? res.data : [];
    }catch(e){ return []; }
  }

  function _render(rows){
    _ensureStyle();
    var ov=document.getElementById('t2t-invite-overlay');
    if(!ov){
      ov=document.createElement('div'); ov.id='t2t-invite-overlay';
      ov.innerHTML='<div id="t2t-invite-card" role="dialog" aria-modal="true" aria-label="Invitations"></div>';
      document.body.appendChild(ov);
    }
    var card=document.getElementById('t2t-invite-card');
    card.innerHTML=
      '<h3>🎫 You’ve been invited</h3>'
      +'<div class="t2t-inv-sub">Nothing changes for you until you accept.</div>'
      +rows.map(function(r){
        return '<div class="t2t-inv-row" data-id="'+_esc(r.id)+'">'
          +'<div class="t2t-inv-what"><b>'+_esc(r.inviter_name||'Someone')+'</b> invited you to join the '
          +_esc(_kindWord(r.target_type))+' <b>'+_esc(r.target_name||'(untitled)')+'</b> '+_esc(_accessWords(r.access_level))+'.</div>'
          +'<div class="t2t-inv-btns">'
            +'<button class="t2t-inv-btn t2t-inv-accept" data-act="accept">Accept</button>'
            +'<button class="t2t-inv-btn" data-act="decline">Decline</button>'
          +'</div>'
          +'<div class="t2t-inv-err" style="display:none"></div>'
        +'</div>';
      }).join('')
      +'<div id="t2t-invite-later"><button class="t2t-inv-btn" data-act="later">Decide later</button></div>';
    ov.classList.add('active');

    var accepted=false;
    function _done(){
      if(!card.querySelector('.t2t-inv-row')){
        ov.classList.remove('active');
        // A new seat changes which boards and topics this traveler can see;
        // a reload is the one sure way every screen picks that up.
        if(accepted) window.location.reload();
      }
    }
    card.querySelectorAll('.t2t-inv-btn').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act=btn.getAttribute('data-act');
        if(act==='later'){
          _addLater(rows.map(function(r){ return r.id; }));
          ov.classList.remove('active');
          if(accepted) window.location.reload();
          return;
        }
        var row=btn.closest('.t2t-inv-row'); var id=row.getAttribute('data-id');
        var errEl=row.querySelector('.t2t-inv-err');
        row.querySelectorAll('.t2t-inv-btn').forEach(function(b){ b.disabled=true; });
        var sb=T().sb;
        try{
          var res=await sb.rpc(act==='accept'?'accept_invitation':'decline_invitation', {p_invitation_id: id});
          if(res.error){
            errEl.textContent=res.error.message||'That did not work. Please try again.'; errEl.style.display='block';
            row.querySelectorAll('.t2t-inv-btn').forEach(function(b){ b.disabled=false; });
            return;
          }
          if(act==='accept') accepted=true;
          row.parentNode.removeChild(row);
          _done();
        }catch(e){
          errEl.textContent='That did not work. Please try again.'; errEl.style.display='block';
          row.querySelectorAll('.t2t-inv-btn').forEach(function(b){ b.disabled=false; });
        }
      });
    });
  }

  // Shows the notice if this traveler has pending invitations they have not
  // already postponed this session. force=true ignores "Decide later".
  async function showNotice(force){
    var openOv=document.getElementById('t2t-invite-overlay');
    if(openOv && openOv.classList.contains('active')) return 0;   // already showing
    var rows=await _loadMine();
    if(!force){ var later=_laterIds(); rows=rows.filter(function(r){ return later.indexOf(r.id)<0; }); }
    if(rows.length) _render(rows);
    return rows.length;
  }

  // ---- Sign-in hook ---------------------------------------------------
  function _boot(){
    var sb=T() && T().sb; if(!sb) return;
    sb.auth.getSession().then(function(res){
      var s=res && res.data && res.data.session;
      if(s && s.user) showNotice(false);
    }).catch(function(){});
    // A traveler who signs in on this page load (rather than arriving already signed in).
    sb.auth.onAuthStateChange(function(evt, session){
      if(evt==='SIGNED_IN' && session && session.user) setTimeout(function(){ showNotice(false); }, 600);
    });
  }

  window.T2T = Object.assign(window.T2T || {}, { invitations: { invite:invite, listPending:listPending, cancel:cancel, mountPending:mountPending, showNotice:showNotice } });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();

})();
