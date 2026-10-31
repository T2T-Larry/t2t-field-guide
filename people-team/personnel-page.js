/* personnel-page.js -- the PERSONNEL PAGE (Oct 31 2026, Larry).
   Double-click a name in the TEAM selector and this opens: name, contact info (phone, email),
   every team the person takes part in (and whether they are PRIMARY there), the NEWS fields
   (Needs, Expectations, Wants, Strong opinions), and the (-) Remove from team.
   Larry: "what if the (-) is on the Personnel page, keeping the team selector clean looking?"
   Larry: "Personnel Page needs to show all the teams for which the person is participating and if they are PRIMARY."

   window.T2TPersonnel.open(cfg)
     cfg.person   {user_id, name, email, phone, is_member}
     cfg.sb       the page's authenticated Supabase client
     cfg.topicId  the topic on screen (Remove acts here)
     cfg.headers  [{id, subject}] the headers on screen (a PRIMARY there needs a replacement first)
     cfg.getRow   (id) -> the in-memory idea row (for assignPrimaryDirect)
     cfg.members  () -> Promise<[{user_id,name,email,is_member}]>  replacement candidates
     cfg.saveContact (uid, phone, email) -> Promise
     cfg.assignPrimary (row, uid) -> Promise<{ok,msg}>
     cfg.onChanged () -> void   the team changed; redraw
   NEWS is stored in card_roles (needs, expectations, desires = Wants, strong_opinions) on the person's
   "home" row: their oldest PRIMARY seat, else their oldest seat. No new tables or columns. */
(function(){
  'use strict';
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var ROLE_WORD={primary:'PRIMARY',team:'Team',stakeholder:'Stakeholder',cast_member:'Cast'};

  async function loadSeats(sb, uid){
    var rs=await sb.from('card_roles').select('id,card_id,role,is_key,needs,expectations,desires,strong_opinions,title,notes,created_at')
      .eq('card_type','idea').eq('user_id',uid).order('created_at',{ascending:true});
    var seats=rs.data||[];
    var ids=seats.map(function(s){ return s.card_id; });
    var names={};
    for(var i=0;i<ids.length;i+=100){
      var r=await sb.from('ideas').select('id,subject').in('id',ids.slice(i,i+100));
      (r.data||[]).forEach(function(x){ names[x.id]=x.subject; });
    }
    seats.forEach(function(s){ s.subject=names[s.card_id]||'(untitled card)'; });
    return seats;
  }
  function homeSeat(seats){
    return seats.filter(function(s){ return s.role==='primary'; })[0] || seats[0] || null;
  }

  function open(cfg){
    var old=document.getElementById('t2t-personnel'); if(old) old.remove();
    var P=cfg.person, sb=cfg.sb;
    var ov=document.createElement('div');
    ov.id='t2t-personnel';
    ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px';
    var box=document.createElement('div');
    box.style.cssText='background:#fff;color:#1c1c1c;border-radius:12px;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;padding:18px 20px;font-family:inherit;box-shadow:0 10px 40px rgba(0,0,0,.35)';
    ov.appendChild(box);
    ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
    function close(){ ov.remove(); document.removeEventListener('keydown',onKey,true); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
    document.addEventListener('keydown',onKey,true);
    document.body.appendChild(ov);

    var FIELD='width:100%;box-sizing:border-box;border:1px solid #bbb;border-radius:6px;padding:6px 8px;font:inherit;font-size:14px;color:#1c1c1c;background:#fff';
    var LBL='display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin:10px 0 3px';

    async function draw(){
      box.innerHTML='<div style="opacity:.6">Loading…</div>';
      var seats=[]; try{ seats=await loadSeats(sb,P.user_id); }catch(e){}
      var home=homeSeat(seats);
      var primaries=seats.filter(function(s){ return s.role==='primary'; });
      var teamsHtml=seats.length ? seats.map(function(s){
        var isP=s.role==='primary';
        var word=isP?'PRIMARY':(s.is_key?'Key Stakeholder':(ROLE_WORD[s.role]||s.role));
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid #eee;font-size:14px">'
          +'<span style="'+(isP?'font-weight:800':'')+'">'+esc(s.subject)+'</span>'
          +'<span style="white-space:nowrap;font-size:12px;'+(isP?'font-weight:800;color:#8a5a00':'opacity:.65')+'">'+esc(word)+'</span></div>';
      }).join('') : '<div style="opacity:.6;font-size:14px">Not on any card yet.</div>';

      box.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
        +'<div><div style="font-size:11px;font-weight:700;letter-spacing:.12em;opacity:.6">PERSONNEL</div>'
        +'<div style="font-size:22px;font-weight:800">'+esc(P.name||P.email||'(unnamed)')+'</div>'
        +'<div style="font-size:12px;opacity:.65">'+(primaries.length?('PRIMARY on '+primaries.length+' card'+(primaries.length>1?'s':'')+' · '):'')+'on '+seats.length+' card'+(seats.length===1?'':'s')+'</div></div>'
        +'<button type="button" id="pp-x" style="border:0;background:none;font-size:22px;cursor:pointer;color:#555" aria-label="Close">×</button></div>'
        +'<label style="'+LBL+'">Phone</label><input id="pp-phone" style="'+FIELD+'" value="'+esc(P.phone||'')+'">'
        +'<label style="'+LBL+'">Email</label><input id="pp-email" style="'+FIELD+'" value="'+esc(P.email||'')+'">'
        +'<label style="'+LBL+'">Teams</label>'+teamsHtml
        +'<div style="margin-top:14px;font-size:13px;font-weight:800;letter-spacing:.1em">NEWS</div>'
        +'<label style="'+LBL+'">Needs</label><textarea id="pp-needs" rows="2" style="'+FIELD+'">'+esc(home&&home.needs||'')+'</textarea>'
        +'<label style="'+LBL+'">Expectations</label><textarea id="pp-exp" rows="2" style="'+FIELD+'">'+esc(home&&home.expectations||'')+'</textarea>'
        +'<label style="'+LBL+'">Wants</label><textarea id="pp-wants" rows="2" style="'+FIELD+'">'+esc(home&&home.desires||'')+'</textarea>'
        +'<label style="'+LBL+'">Strong opinions</label><textarea id="pp-opin" rows="2" style="'+FIELD+'">'+esc(home&&home.strong_opinions||'')+'</textarea>'
        +'<div id="pp-msg" style="display:none;margin-top:10px;padding:6px 9px;border-radius:5px;font-size:13px;font-weight:700"></div>'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px">'
        +'<button type="button" id="pp-remove" title="Remove from team" style="border:1px solid #a3372b;color:#a3372b;background:#fff;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">(−) Remove from team</button>'
        +'<button type="button" id="pp-save" style="border:0;background:#2d6a4f;color:#fff;border-radius:6px;padding:7px 18px;font-weight:700;cursor:pointer">Save</button></div>'
        +'<div id="pp-replace"></div>';

      var $=function(id){ return box.querySelector('#'+id); };
      function say(t,bad){ var m=$('pp-msg'); m.style.display=t?'block':'none'; m.textContent=t||''; m.style.background=bad?'#a3372b':'#2d6a4f'; m.style.color='#fff'; }
      $('pp-x').onclick=close;

      $('pp-save').onclick=async function(){
        try{
          var ph=$('pp-phone').value.trim(), em=$('pp-email').value.trim();
          if(ph!==(P.phone||'') || em!==(P.email||'')){
            await cfg.saveContact(P.user_id, ph, em); P.phone=ph; P.email=em;
          }
          if(home){
            var u=await sb.from('card_roles').update({ needs:$('pp-needs').value, expectations:$('pp-exp').value, desires:$('pp-wants').value, strong_opinions:$('pp-opin').value }).eq('id',home.id);
            if(u.error) throw u.error;
          } else if($('pp-needs').value||$('pp-exp').value||$('pp-wants').value||$('pp-opin').value){
            say('NEWS notes are kept on a card seat. Put them on a card first, then save.',true); return;
          }
          say('Saved.',false);
        }catch(e){ say('Could not save: '+((e&&e.message)||'something went wrong'),true); }
      };

      $('pp-remove').onclick=async function(){
        // Headers on screen where this person is PRIMARY need a replacement first.
        var heads=(cfg.headers||[]).concat([{id:cfg.topicId,subject:'this topic'}]);
        var held=heads.filter(function(h){ return h.id && primaries.some(function(s){ return s.card_id===h.id; }); });
        var seen={}; held=held.filter(function(h){ if(seen[h.id]) return false; seen[h.id]=true; return true; });
        var wrap=$('pp-replace');
        if(!held.length){ await finish(); return; }
        var pool=[]; try{ pool=(await cfg.members())||[]; }catch(e){}
        pool=pool.filter(function(m){ return m.user_id && String(m.user_id)!==String(P.user_id); });
        wrap.innerHTML='<div style="margin-top:14px;padding:10px;border:1px solid #a3372b;border-radius:8px">'
          +'<div style="font-weight:800;margin-bottom:6px">'+esc(P.name||'They')+' is PRIMARY here. Pick who takes over:</div>'
          +held.map(function(h){
            return '<div style="margin:6px 0;font-size:14px">'+esc(h.subject||'(header)')+'<select data-h="'+esc(h.id)+'" style="'+FIELD+';margin-top:3px"><option value="">Choose a new PRIMARY…</option>'
              +pool.map(function(m){ return '<option value="'+esc(m.user_id)+'">'+esc(m.name||m.email)+'</option>'; }).join('')+'</select></div>';
          }).join('')
          +'<button type="button" id="pp-go" style="margin-top:6px;border:0;background:#a3372b;color:#fff;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer">Replace and remove</button></div>';
        wrap.querySelector('#pp-go').onclick=async function(){
          var sels=wrap.querySelectorAll('select[data-h]');
          for(var i=0;i<sels.length;i++){ if(!sels[i].value){ say('Choose a new PRIMARY for every header listed.',true); return; } }
          for(var j=0;j<sels.length;j++){
            var row=cfg.getRow(sels[j].getAttribute('data-h'));
            if(!row){ say('Could not find that header on screen.',true); return; }
            var res=await cfg.assignPrimary(row, sels[j].value);
            if(res && res.ok===false){ say(res.msg||'Could not change the PRIMARY.',true); return; }
          }
          await finish();
        };
      };

      async function finish(){
        try{
          // After a replacement the old PRIMARY stays on as a Key Stakeholder; set_level_role 'remove' clears the non-primary seat.
          var r=await sb.rpc('set_level_role',{p_level:cfg.topicId,p_user:P.user_id,p_role:'remove'});
          if(r.error) throw r.error;
          if(cfg.onChanged) cfg.onChanged();
          close();
        }catch(e){ say('Could not remove: '+((e&&e.message)||'something went wrong'),true); }
      }
    }
    draw();
  }

  window.T2TPersonnel={ open:open, loadSeats:loadSeats, homeSeat:homeSeat };
})();
