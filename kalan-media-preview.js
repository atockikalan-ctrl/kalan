(() => {
'use strict';
const db=window.kalanSupabase;if(!db)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='kalan-media-playlists-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}};
const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){alert('Browser storage is unavailable.')}};
let me=null, rows=[], currentQueue=[], queueIndex=-1;
function toast(s){const t=$('toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}}
function ensurePanels(){
 const tabs=document.querySelector('.km-tabs');if(!tabs)return;
 if(!$('km-playlists')){const p=document.createElement('section');p.id='km-playlists';p.className='km-preview-panel';p.innerHTML='<div class="km-preview-heading"><div><span class="eyebrow">YOUR PERSONAL MIXES</span><h2>Playlists</h2></div><button class="primary" id="km-new-playlist">＋ New playlist</button></div><div id="km-playlist-list" class="km-playlist-list"></div>';tabs.after(p);}
 if(!$('km-creator-dashboard')){const p=document.createElement('section');p.id='km-creator-dashboard';p.className='km-preview-panel';p.innerHTML='<div class="km-preview-heading"><div><span class="eyebrow">YOUR CREATOR SPACE</span><h2>Creator dashboard</h2></div><span class="muted">Your uploads at a glance</span></div><div id="km-creator-stats" class="km-creator-stats"><div class="empty">Loading your creator stats…</div></div>';const upload=$('media-upload-panel');(upload||tabs).after(p);}
}
function renderPlaylists(){
 const root=$('km-playlist-list');if(!root)return;const lists=read(),keys=Object.keys(lists);
 root.innerHTML=keys.length?keys.map(k=>'<article class="km-playlist"><div><b>'+esc(k)+'</b><small>'+lists[k].length+' saved items</small></div><div class="km-playlist-actions"><button data-km-playlist-play="'+esc(k)+'">Play mix</button><button data-km-playlist-delete="'+esc(k)+'">Delete</button></div></article>').join(''):'<p class="muted">Create a playlist, then add your uploads from their media cards.</p>';
}
async function loadCreator(){
 const root=$('km-creator-stats');if(!root||!me)return;
 const {data,error}=await db.from('media_items').select('id,file_size,visibility,media_type').eq('user_id',me.id);
 if(error){root.innerHTML='<p class="muted">Creator stats are temporarily unavailable.</p>';return;}
 const a=data||[],bytes=a.reduce((n,x)=>n+(Number(x.file_size)||0),0),fmt=n=>n<1024*1024?(n/1024).toFixed(0)+' KB':(n/1024/1024).toFixed(1)+' MB';
 root.innerHTML=[['Uploads',a.length],['Storage used',fmt(bytes)],['Public',a.filter(x=>x.visibility==='public').length],['Private / shared',a.filter(x=>x.visibility!=='public').length]].map(x=>'<div class="km-stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
}
function decorateCards(){
 document.querySelectorAll('#media-grid [data-media-play]').forEach(b=>{
  const card=b.closest('.km-card');if(!card||card.querySelector('[data-km-add]'))return;
  const add=document.createElement('button');add.className='km-queue-add';add.dataset.kmAdd=b.dataset.mediaPlay;add.textContent='＋ Add to playlist';b.after(add);
 });
}
function decoratePlayer(){
 const root=$('media-player'),player=$('km-active-player');if(!root||root.hidden||!player||$('km-player-options'))return;
 const bar=document.createElement('div');bar.id='km-player-options';bar.className='km-player-options';
 bar.innerHTML='<label>Playback speed <select id="km-speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><span class="muted">Playback controls</span>';
 player.after(bar);$('km-speed').addEventListener('change',e=>{player.playbackRate=Number(e.target.value)});
}
function playQueue(name){const list=read()[name]||[];if(!list.length){toast('This playlist is empty.');return;}currentQueue=list;queueIndex=0;playCurrent();}
function playCurrent(){const item=currentQueue[queueIndex];if(!item)return;const card=document.querySelector('#media-grid [data-media-play="'+CSS.escape(item.id)+'"]');if(card){card.click();toast('Playing '+(queueIndex+1)+' of '+currentQueue.length);}else toast('Open the matching media tab to play this playlist item.');}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-km-add]');if(add){const title=prompt('Add to which playlist?',Object.keys(read())[0]||'');if(title===null||!title.trim())return;const lists=read(),name=title.trim().slice(0,40);lists[name]=lists[name]||[];if(!lists[name].some(x=>x.id===add.dataset.kmAdd)){const row=rows.find(x=>x.id===add.dataset.kmAdd)||{id:add.dataset.kmAdd};lists[name].push(row);save(lists);}renderPlaylists();toast('Added to '+name);return;}
 const create=e.target.closest('#km-new-playlist');if(create){const name=prompt('Name your playlist');if(!name||!name.trim())return;const lists=read();lists[name.trim().slice(0,40)]=lists[name.trim().slice(0,40)]||[];save(lists);renderPlaylists();return;}
 const play=e.target.closest('[data-km-playlist-play]');if(play){playQueue(play.dataset.kmPlaylistPlay);return;}
 const del=e.target.closest('[data-km-playlist-delete]');if(del&&confirm('Delete this playlist?')){const lists=read();delete lists[del.dataset.kmPlaylistDelete];save(lists);renderPlaylists();return;}
});
const observer=new MutationObserver(()=>{decorateCards();decoratePlayer();});
function start(){
 ensurePanels();renderPlaylists();
 const grid=$('media-grid');if(grid)observer.observe(grid,{childList:true,subtree:true});
 const player=$('media-player');if(player)observer.observe(player,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 db.auth.getSession().then(({data})=>{me=data?.session?.user||null;loadCreator()});
 db.auth.onAuthStateChange((_e,s)=>{me=s?.user||null;loadCreator()});
 document.querySelectorAll('[data-media-tab]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{rows=[...document.querySelectorAll('#media-grid .km-card')].map(c=>({id:c.querySelector('[data-media-play]')?.dataset.mediaPlay}));decorateCards()},250)));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();