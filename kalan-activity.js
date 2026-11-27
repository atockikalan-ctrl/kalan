(() => {
'use strict';
const db=window.kalanSupabase;
if(!db)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Recently':d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
const empty=s=>'<div class="empty">'+esc(s)+'</div>';
let me=null,friendIds=[],filter='all',channel=null,loading=false;
let events=[];
function profileName(p){return p?.display_name||p?.username||'KALAN player';}
function card(e){
 const name=esc(profileName(e.profile)),handle=esc(e.profile?.username||'player'),date=esc(when(e.created_at));
 const head='<div class="ka-activity-head"><div class="ka-activity-avatar">'+esc(profileName(e.profile).slice(0,1).toUpperCase())+'</div><div class="ka-activity-author"><b>'+name+'</b><small>@'+handle+' · '+date+'</small></div></div>';
 let body='';
 if(e.type==='games')body='<div class="ka-activity-event"><span class="ka-activity-icon">🎮</span><div><b>Started playing '+esc(e.game_title)+'</b><small>Game session</small></div></div>';
 if(e.type==='achievements')body='<div class="ka-activity-event"><span class="ka-activity-icon">'+esc(e.achievement?.icon||'🏆')+'</span><div><b>Unlocked '+esc(e.achievement?.name||e.achievement_id)+'</b><small>'+esc(e.achievement?.description||'Achievement unlocked')+'</small></div></div>';
 if(e.type==='posts')body='<p class="ka-activity-post">'+esc(e.body).replace(/\n/g,'<br>')+'</p>'+(e.game_key?'<small class="ka-activity-context">Playing '+esc(e.game_title||e.game_key)+'</small>':'');
 if(e.type==='media')body='<div class="ka-activity-event"><span class="ka-activity-icon">'+(e.media_type==='audio'?'♫':'▶')+'</span><div><b>Shared '+(e.media_type==='audio'?'audio':'a video')+': '+esc(e.title)+'</b><small>'+esc(e.description||'Shared through KALAN Media')+'</small></div></div><button class="ka-activity-open-media" data-activity-open-media>View in KALAN Media ↗</button>';
 return '<article class="ka-activity-card" data-activity-type="'+e.type+'">'+head+body+'</article>';
}
function render(){
 const root=$('kalan-activity-list');if(!root)return;
 const shown=filter==='all'?events:events.filter(e=>e.type===filter);
 root.innerHTML=shown.length?shown.map(card).join(''):empty(filter==='all'?'Nothing has happened yet. When you or your friends play, post, unlock achievements, or share media, it will show up here.':'No '+filter+' activity to show yet.');
}
async function load(){
 const root=$('kalan-activity-list');if(!root||!me||loading)return;
 loading=true;root.innerHTML='<div class="empty">Gathering your KALAN activity…</div>';
 try{
  const ids=[me.id,...friendIds];
  const [games,achievements,posts,media]=await Promise.all([
   db.from('player_activity').select('id,user_id,game_title,created_at').in('user_id',ids).order('created_at',{ascending:false}).limit(50),
   db.from('user_achievements').select('user_id,achievement_id,unlocked_at,achievements(name,description,icon)').in('user_id',ids).order('unlocked_at',{ascending:false}).limit(40),
   db.from('feed_posts').select('id,user_id,body,game_key,visibility,created_at').order('created_at',{ascending:false}).limit(40),
   db.from('media_items').select('id,user_id,title,description,media_type,visibility,created_at').in('visibility',['public','shared']).order('created_at',{ascending:false}).limit(40)
  ]);
  const errors=[games.error,achievements.error,posts.error,media.error].filter(Boolean);
  if(errors.length)console.warn('KALAN Activity partial data:',errors);
  const rows=[
   ...(games.data||[]).map(x=>({...x,type:'games',created_at:x.created_at})),
   ...(achievements.data||[]).map(x=>({...x,type:'achievements',created_at:x.unlocked_at,achievement:x.achievements})),
   ...(posts.data||[]).map(x=>({...x,type:'posts'})),
   ...(media.data||[]).map(x=>({...x,type:'media'}))
  ];
  const visibleIds=[...new Set(rows.map(x=>x.user_id))];
  const {data:profiles,error:profileError}=visibleIds.length?await db.from('profiles').select('id,username,display_name').in('id',visibleIds):{data:[],error:null};
  if(profileError)console.warn('KALAN Activity profiles:',profileError);
  const people=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  const gameNames={undertale:'Undertale',deltarune:'Deltarune',minecraft:'Minecraft',ultra:'ULTRAKILL','hollow-knight':'Hollow Knight','among-us':'Among Us',fnaf:'Five Nights at Freddy’s','retro-bowl':'Retro Bowl','salty-seas':'Salty Seas',other:'Something else'};
  events=rows.map(x=>({...x,profile:people[x.user_id],game_title:x.game_title||gameNames[x.game_key]||x.game_key})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);
  if(errors.length&&!events.length)root.innerHTML=empty('Activity is temporarily unavailable. Please try again.');
  else render();
 }catch(err){console.error('KALAN Activity load failed:',err);root.innerHTML=empty('Activity is temporarily unavailable. Please try again.');}
 finally{loading=false;}
}
async function identity(){
 const {data:{session}}=await db.auth.getSession();me=session?.user||null;
 if(!me){friendIds=[];events=[];if(channel){db.removeChannel(channel);channel=null;}const root=$('kalan-activity-list');if(root)root.innerHTML=empty('Sign in to see activity from your friends.');return;}
 const {data,error}=await db.from('friend_requests').select('sender_id,recipient_id').eq('status','accepted').or('sender_id.eq.'+me.id+',recipient_id.eq.'+me.id);
 friendIds=error?[]:[...new Set((data||[]).map(x=>x.sender_id===me.id?x.recipient_id:x.sender_id))];
 await load();
 if(channel)db.removeChannel(channel);
 channel=db.channel('kalan-activity:'+me.id)
  .on('postgres_changes',{event:'*',schema:'public',table:'player_activity'},load)
  .on('postgres_changes',{event:'*',schema:'public',table:'user_achievements'},load)
  .on('postgres_changes',{event:'*',schema:'public',table:'feed_posts'},load)
  .on('postgres_changes',{event:'*',schema:'public',table:'media_items'},load)
  .subscribe();
}
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-activity-filter]');
 if(f){filter=f.dataset.activityFilter;document.querySelectorAll('[data-activity-filter]').forEach(b=>b.classList.toggle('active',b===f));render();return;}
 if(e.target.closest('#kalan-activity-refresh')){load();return;}
 if(e.target.closest('[data-activity-open-media]')){document.querySelector('[data-page="media"]')?.click();return;}
});
db.auth.onAuthStateChange(()=>setTimeout(identity,0));
identity();
})();
