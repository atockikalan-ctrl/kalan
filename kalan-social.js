(() => {
const db=window.kalanSupabase;if(!db)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=s=>{const t=$('toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}};
const empty=s=>'<div class="empty">'+esc(s)+'</div>';
const games=[['undertale','Undertale'],['deltarune','Deltarune'],['minecraft','Minecraft'],['ultra','ULTRAKILL'],['hollow-knight','Hollow Knight'],['among-us','Among Us'],['fnaf',"Five Nights at Freddy's"],['retro-bowl','Retro Bowl'],['salty-seas','Salty Seas'],['other','Something else']];
const gameSelect=id=>'<select id="'+id+'" required>'+games.map(g=>'<option value="'+g[0]+'">'+g[1]+'</option>').join('')+'</select>';
let me=null, friends=[], noticeChannel=null;
const levelMin=l=>100*(l-1)*l/2,levelMax=l=>100*l*(l+1)/2;
async function identity(){
 const {data:{session}}=await db.auth.getSession();me=session?.user||null;
 if(!me){['feed-posts','party-list','game-night-list','notification-list','friend-groups-list'].forEach(id=>{if($(id))$(id).innerHTML=empty('Sign in to use this part of KALAN.')});return;}
 const [{data:p},{data:f}]=await Promise.all([
  db.from('profiles').select('id,username,display_name,profile_theme').eq('id',me.id).maybeSingle(),
  db.from('friend_requests').select('sender_id,recipient_id').eq('status','accepted').or('sender_id.eq.'+me.id+',recipient_id.eq.'+me.id)
 ]);
 friends=(f||[]).map(r=>r.sender_id===me.id?r.recipient_id:r.sender_id);
 document.body.dataset.kalanTheme=p?.profile_theme||'sage';
 await Promise.all([progress(),feed(),notices(),parties(),nights(),groups()]);
 if(noticeChannel)db.removeChannel(noticeChannel);
 noticeChannel=db.channel('kalan-notices-'+me.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+me.id},notices).subscribe();
}
async function progress(){
 const [{data:p},{data:a}]=await Promise.all([
  db.from('player_progress').select('xp,level').eq('user_id',me.id).maybeSingle(),
  db.from('user_achievements').select('achievement_id,unlocked_at,achievements(name,description,icon)').eq('user_id',me.id).order('unlocked_at',{ascending:false})
 ]);
 const xp=Number(p?.xp||0),lvl=Number(p?.level||1),pct=Math.max(0,Math.min(100,(xp-levelMin(lvl))/(levelMax(lvl)-levelMin(lvl))*100));
 if($('player-level'))$('player-level').textContent=lvl;
 if($('player-xp'))$('player-xp').textContent=xp.toLocaleString()+' XP';
 if($('xp-progress'))$('xp-progress').style.width=pct+'%';
 if($('xp-next'))$('xp-next').textContent=Math.max(0,levelMax(lvl)-xp)+' XP to level '+(lvl+1);
 if($('achievement-list'))$('achievement-list').innerHTML=(a||[]).length?(a||[]).map(x=>'<div class="kalan-achievement"><span>'+esc(x.achievements?.icon||'✦')+'</span><div><b>'+esc(x.achievements?.name||x.achievement_id)+'</b><small>'+esc(x.achievements?.description||'Unlocked')+'</small></div></div>').join(''):empty('Your achievements will appear here as you play.');
}
async function feed(){
 if(!me)return;const {data,error}=await db.from('feed_posts').select('id,user_id,body,game_key,visibility,created_at').order('created_at',{ascending:false}).limit(40);
 if(error){$('feed-posts').innerHTML=empty('The feed is temporarily unavailable.');return;}
 const rows=data||[],ids=[...new Set(rows.map(x=>x.user_id))];
 const [{data:ps},{data:ls}]=await Promise.all([ids.length?db.from('profiles').select('id,username,display_name').in('id',ids):{data:[]},rows.length?db.from('post_likes').select('post_id,user_id').in('post_id',rows.map(x=>x.id)):{data:[]}]);
 const people=Object.fromEntries((ps||[]).map(x=>[x.id,x]));
 $('feed-posts').innerHTML=rows.length?rows.map(p=>{
  const u=people[p.user_id]||{},likes=(ls||[]).filter(x=>x.post_id===p.id),liked=likes.some(x=>x.user_id===me.id);
  const game=games.find(g=>g[0]===p.game_key)?.[1]||'';
  return '<article class="kalan-post"><div class="kalan-post-head"><div class="kalan-feed-avatar">'+esc((u.display_name||u.username||'P')[0].toUpperCase())+'</div><div class="kalan-post-author"><b>'+esc(u.display_name||u.username||'Player')+'</b><small>@'+esc(u.username||'player')+' · '+new Date(p.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</small></div>'+(p.user_id===me.id?'<button class="kalan-subtle" data-delete-post="'+p.id+'">Delete</button>':'')+'</div><p>'+esc(p.body).replace(/\n/g,'<br>')+'</p>'+(game?'<small class="kalan-post-game">Playing '+esc(game)+'</small>':'')+'<div class="kalan-post-actions"><button class="kalan-like '+(liked?'liked':'')+'" data-like-post="'+p.id+'">'+(liked?'♥':'♡')+' '+likes.length+' likes</button><span class="kalan-post-privacy">'+(p.visibility==='friends'?'Friends':'Community')+'</span></div></article>';
 }).join(''):empty('It is quiet here for now. Share the first little update.');
}
async function notices(){
 if(!me)return;const {data,error}=await db.from('notifications').select('id,message,read_at,created_at').order('created_at',{ascending:false}).limit(40);
 if(error)return;const rows=data||[],unread=rows.filter(x=>!x.read_at).length;
 if($('notification-count')){$('notification-count').textContent=unread||'';$('notification-count').hidden=!unread;}
 if($('notification-list'))$('notification-list').innerHTML=rows.length?rows.map(n=>'<div class="kalan-notification '+(!n.read_at?'unread':'')+'"><div><b>'+esc(n.message)+'</b><small>'+new Date(n.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</small></div>'+(!n.read_at?'<button class="kalan-subtle" data-read-notice="'+n.id+'">Mark read</button>':'')+'</div>').join(''):empty('Nothing new. You are all caught up.');
}
async function parties(){
 if(!me)return;const {data,error}=await db.from('parties').select('id,owner_id,title,game_key,visibility').eq('status','open').order('created_at',{ascending:false}).limit(30);
 if(error){$('party-list').innerHTML=empty('Parties are unavailable right now.');return;}
 const rows=data||[],ids=[...new Set(rows.map(x=>x.owner_id))];
 const [{data:ps},{data:ms}]=await Promise.all([ids.length?db.from('profiles').select('id,username,display_name').in('id',ids):{data:[]},rows.length?db.from('party_members').select('party_id,user_id').in('party_id',rows.map(x=>x.id)):{data:[]}]);
 const people=Object.fromEntries((ps||[]).map(x=>[x.id,x]));
 $('party-list').innerHTML=rows.length?rows.map(p=>{
  const owner=people[p.owner_id]||{},joined=(ms||[]).some(m=>m.party_id===p.id&&m.user_id===me.id),count=(ms||[]).filter(m=>m.party_id===p.id).length;
  return '<article class="kalan-event"><div><small>'+(p.visibility==='open'?'OPEN PARTY':'FRIENDS')+'</small><h3>'+esc(p.title)+'</h3><p>'+esc(games.find(g=>g[0]===p.game_key)?.[1]||'Game')+' · '+esc(owner.display_name||owner.username||'Player')+' · '+count+' joined</p></div>'+(p.owner_id===me.id?'<button class="kalan-subtle" data-close-party="'+p.id+'">Close</button>':joined?'<button class="kalan-subtle" data-leave-party="'+p.id+'">Leave</button>':'<button class="kalan-action" data-join-party="'+p.id+'">Join party</button>')+'</article>';
 }).join(''):empty('No parties are open. Start one and invite your friends.');
}
async function nights(){
 if(!me)return;const {data,error}=await db.from('game_nights').select('id,host_id,title,game_key,description,starts_at,max_players').gte('starts_at',new Date().toISOString()).order('starts_at').limit(30);
 if(error){$('game-night-list').innerHTML=empty('Game Nights are unavailable right now.');return;}
 const rows=data||[],ids=[...new Set(rows.map(x=>x.host_id))];
 const [{data:ps},{data:rs}]=await Promise.all([ids.length?db.from('profiles').select('id,username,display_name').in('id',ids):{data:[]},rows.length?db.from('game_night_rsvps').select('game_night_id,user_id').in('game_night_id',rows.map(x=>x.id)):{data:[]}]);
 const people=Object.fromEntries((ps||[]).map(x=>[x.id,x]));
 $('game-night-list').innerHTML=rows.length?rows.map(g=>{
  const host=people[g.host_id]||{},count=(rs||[]).filter(x=>x.game_night_id===g.id).length,going=(rs||[]).some(x=>x.game_night_id===g.id&&x.user_id===me.id);
  return '<article class="kalan-event"><div><small>'+new Date(g.starts_at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</small><h3>'+esc(g.title)+'</h3><p>'+esc(games.find(x=>x[0]===g.game_key)?.[1]||'Game')+' · Host '+esc(host.display_name||host.username||'Player')+' · '+count+'/'+g.max_players+' players</p><p>'+esc(g.description||'')+'</p></div>'+(g.host_id===me.id?'<button class="kalan-subtle" data-delete-night="'+g.id+'">Cancel</button>':going?'<button class="kalan-subtle" data-unrsvp-night="'+g.id+'">Can&#39;t make it</button>':'<button class="kalan-action" data-rsvp-night="'+g.id+'" '+(count>=g.max_players?'disabled':'')+'>I’m in</button>')+'</article>';
 }).join(''):empty('No upcoming Game Nights. Be the one who starts something.');
}
async function groups(){
 if(!me)return;const {data,error}=await db.from('friend_groups').select('id,name').eq('owner_id',me.id).order('created_at');
 if(error){$('friend-groups-list').innerHTML=empty('Friend groups are unavailable.');return;}
 const rows=data||[];
 const {data:friendProfiles}=friends.length?await db.from('profiles').select('id,username,display_name').in('id',friends):{data:[]};$('friend-group-friend').innerHTML=friends.length?'<option value="">Choose a friend…</option>'+(friendProfiles||[]).map(p=>'<option value="'+p.id+'">'+esc(p.display_name||p.username||'Friend')+'</option>').join(''):'<option value="">Add friends first</option>';
 if(!rows.length){$('friend-groups-list').innerHTML=empty('Make little circles for your favorite people.');return;}
 const {data:ms}=await db.from('friend_group_members').select('group_id,user_id').in('group_id',rows.map(x=>x.id));
 const ids=[...new Set((ms||[]).map(x=>x.user_id))],{data:ps}=ids.length?await db.from('profiles').select('id,username,display_name').in('id',ids):{data:[]},people=Object.fromEntries((ps||[]).map(x=>[x.id,x]));
 $('friend-groups-list').innerHTML=rows.map(g=>'<article class="kalan-event"><div><h3>'+esc(g.name)+'</h3><p>'+((ms||[]).filter(x=>x.group_id===g.id).map(x=>esc(people[x.user_id]?.display_name||people[x.user_id]?.username||'Friend')).join(', ')||'No friends added yet')+'</p></div><button class="kalan-subtle" data-add-fgroup="'+g.id+'">Add friend</button><button class="kalan-subtle" data-delete-fgroup="'+g.id+'">Delete</button></article>').join('');
}
async function findPlayers(){
 if(!me)return toast('Sign in first.');const q=$('finder-query').value.trim();if(q.length<2)return toast('Enter at least two characters.');
 const {data,error}=await db.from('profiles').select('id,username,display_name,bio,favorite_game').ilike('username',q.replace(/[%_]/g,'')+'%').neq('id',me.id).limit(15);
 if(error){$('finder-results').innerHTML=empty('Player search is temporarily unavailable.');return;}
 const rows=data||[],{data:rels}=rows.length?await db.from('friend_requests').select('id,sender_id,recipient_id,status').or('sender_id.eq.'+me.id+',recipient_id.eq.'+me.id):{data:[]};
 $('finder-results').innerHTML=rows.length?rows.map(p=>{
  const r=(rels||[]).find(x=>(x.sender_id===p.id&&x.recipient_id===me.id)||(x.sender_id===me.id&&x.recipient_id===p.id));
  const action=r?.status==='accepted'?'<span class="kalan-muted">Friends</span>':r?.status==='pending'?(r.sender_id===me.id?'<span class="kalan-muted">Request sent</span>':'<button class="kalan-action" data-accept-friend="'+r.id+'">Accept</button>'):'<button class="kalan-action" data-finder-add="'+p.id+'">Add friend</button>';
  return '<article class="kalan-event"><div><h3>'+esc(p.display_name||p.username)+'</h3><p>@'+esc(p.username)+(p.favorite_game?' · Likes '+esc(p.favorite_game):'')+'</p><p>'+esc(p.bio||'')+'</p></div><div class="kalan-inline">'+action+'<button class="kalan-subtle" data-view-profile="'+p.id+'">Profile</button></div></article>';
 }).join(''):empty('No players found. Try another username.');
}
$('feed-compose-form')?.addEventListener('submit',async e=>{e.preventDefault();const body=$('feed-compose-text').value.trim();if(!body)return toast('Write something first.');const {error}=await db.from('feed_posts').insert({user_id:me.id,body,game_key:$('feed-compose-game').value||null,visibility:$('feed-compose-visibility').value});if(error)toast(error.message);else{$('feed-compose-text').value='';toast('Posted.');await Promise.all([feed(),progress()]);}});
$('party-create-form')?.addEventListener('submit',async e=>{e.preventDefault();const {data,error}=await db.from('parties').insert({owner_id:me.id,title:$('party-title').value.trim(),game_key:$('party-game').value,visibility:$('party-visibility').value}).select('id').single();if(error)return toast(error.message);await db.from('party_members').insert({party_id:data.id,user_id:me.id});$('party-create-form').reset();toast('Party created.');parties();});
$('night-create-form')?.addEventListener('submit',async e=>{e.preventDefault();const start=new Date($('night-start').value);if(!Number.isFinite(start.getTime())||start<=new Date())return toast('Choose a future time.');const {error}=await db.from('game_nights').insert({host_id:me.id,title:$('night-title').value.trim(),game_key:$('night-game').value,description:$('night-description').value.trim(),starts_at:start.toISOString(),max_players:Number($('night-capacity').value)});if(error)toast(error.message);else{$('night-create-form').reset();toast('Game Night scheduled.');nights();}});
$('friend-group-form')?.addEventListener('submit',async e=>{e.preventDefault();const {data,error}=await db.from('friend_groups').insert({owner_id:me.id,name:$('friend-group-name').value.trim()}).select('id').single();if(error)return toast(error.message);const friend=$('friend-group-friend').value;if(friend)await db.from('friend_group_members').insert({group_id:data.id,user_id:friend});$('friend-group-form').reset();groups();});
$('finder-search')?.addEventListener('click',findPlayers);$('finder-query')?.addEventListener('keydown',e=>{if(e.key==='Enter')findPlayers();});
document.addEventListener('click',async e=>{
 const like=e.target.closest('[data-like-post]');if(like){const id=like.dataset.likePost,{data}=await db.from('post_likes').select('post_id').eq('post_id',id).eq('user_id',me.id).maybeSingle();const r=data?await db.from('post_likes').delete().eq('post_id',id).eq('user_id',me.id):await db.from('post_likes').insert({post_id:id,user_id:me.id});if(r.error)toast(r.error.message);else feed();}
 const del=e.target.closest('[data-delete-post]');if(del&&confirm('Delete this post?')){const r=await db.from('feed_posts').delete().eq('id',del.dataset.deletePost);if(r.error)toast(r.error.message);else feed();}
 const read=e.target.closest('[data-read-notice]');if(read){await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',read.dataset.readNotice);notices();}
 const join=e.target.closest('[data-join-party]');if(join){const r=await db.from('party_members').insert({party_id:join.dataset.joinParty,user_id:me.id});if(r.error)toast(r.error.message);else parties();}
 const leave=e.target.closest('[data-leave-party]');if(leave){await db.from('party_members').delete().eq('party_id',leave.dataset.leaveParty).eq('user_id',me.id);parties();}
 const close=e.target.closest('[data-close-party]');if(close){await db.from('parties').update({status:'closed'}).eq('id',close.dataset.closeParty).eq('owner_id',me.id);parties();}
 const rsvp=e.target.closest('[data-rsvp-night]');if(rsvp){const r=await db.from('game_night_rsvps').insert({game_night_id:rsvp.dataset.rsvpNight,user_id:me.id});if(r.error)toast(r.error.message);else{nights();progress();}}
 const un=e.target.closest('[data-unrsvp-night]');if(un){await db.from('game_night_rsvps').delete().eq('game_night_id',un.dataset.unrsvpNight).eq('user_id',me.id);nights();}
 const dn=e.target.closest('[data-delete-night]');if(dn&&confirm('Cancel this Game Night?')){await db.from('game_nights').delete().eq('id',dn.dataset.deleteNight).eq('host_id',me.id);nights();}
 const ag=e.target.closest('[data-add-fgroup]');if(ag){const friend=$('friend-group-friend').value;if(!friend)return toast('Choose a friend first.');const r=await db.from('friend_group_members').insert({group_id:ag.dataset.addFgroup,user_id:friend});toast(r.error?r.error.message:'Friend added to group.');groups();}const dg=e.target.closest('[data-delete-fgroup]');if(dg&&confirm('Delete this friend group?')){await db.from('friend_groups').delete().eq('id',dg.dataset.deleteFgroup).eq('owner_id',me.id);groups();}
 const add=e.target.closest('[data-finder-add]');if(add){const r=await db.from('friend_requests').insert({sender_id:me.id,recipient_id:add.dataset.finderAdd});toast(r.error?r.error.message:'Friend request sent.');findPlayers();}
 const accept=e.target.closest('[data-accept-friend]');if(accept){const r=await db.from('friend_requests').update({status:'accepted',updated_at:new Date().toISOString()}).eq('id',accept.dataset.acceptFriend);toast(r.error?r.error.message:'Friend added.');identity();}
 const view=e.target.closest('[data-view-profile]');if(view){const target=view.dataset.viewProfile;setTimeout(()=>{const box=$('public-profile-content');if(box&&!box.querySelector('[data-block-player]')){const tools=document.createElement('div');tools.className='kalan-profile-safety';tools.innerHTML='<button class="kalan-subtle" data-block-player="'+target+'">Block player</button><button class="kalan-subtle" data-report-player="'+target+'">Report player</button>';box.appendChild(tools);}},350);}
 const block=e.target.closest('[data-block-player]');if(block&&confirm('Block this player? They will no longer be able to contact you.')){const r=await db.from('blocks').insert({blocker_id:me.id,blocked_id:block.dataset.blockPlayer});toast(r.error?r.error.message:'Player blocked.');$('public-profile-modal').classList.remove('open');}
 const report=e.target.closest('[data-report-player]');if(report){const reason=prompt('Tell us why you are reporting this player.');if(reason&&reason.trim().length>=3){const r=await db.from('reports').insert({reporter_id:me.id,reported_user_id:report.dataset.reportPlayer,reason:reason.trim().slice(0,1000)});toast(r.error?r.error.message:'Report submitted. Thank you.');}}
});
const profileForm=$('profile-form');
if(profileForm&&!$('edit-theme')){const label=document.createElement('label');label.innerHTML='Profile color<select id="edit-theme"><option value="sage">Soft sage</option><option value="ocean">Quiet blue</option><option value="lavender">Lavender</option><option value="sunset">Warm sunset</option></select>';profileForm.querySelector('.art-upload-grid')?.before(label);}
$('edit-player-profile')?.addEventListener('click',async()=>{if(!me)return;const {data}=await db.from('profiles').select('profile_theme').eq('id',me.id).maybeSingle();if($('edit-theme'))$('edit-theme').value=data?.profile_theme||'sage';});
profileForm?.addEventListener('submit',async()=>{if(!me)return;const theme=$('edit-theme')?.value||'sage';const {error}=await db.from('profiles').update({profile_theme:theme}).eq('id',me.id);if(!error)document.body.dataset.kalanTheme=theme;});
document.querySelectorAll('[data-page="feed"],[data-page="parties"],[data-page="game-nights"],[data-page="player-finder"],[data-page="notifications"]').forEach(b=>b.addEventListener('click',()=>{if(!me)return;if(b.dataset.page==='feed')feed();if(b.dataset.page==='parties')parties();if(b.dataset.page==='game-nights')nights();if(b.dataset.page==='notifications')notices();}));
db.auth.onAuthStateChange(()=>setTimeout(identity,0));identity();
})();