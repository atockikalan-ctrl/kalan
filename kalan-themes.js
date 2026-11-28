(()=>{'use strict';
const db=window.kalanSupabase;if(!db)return;
const $=id=>document.getElementById(id);
const userThemes={
 rose:{label:'Rose Gold',bg:'#f3e8e7',panel:'#fffaf9',panel2:'#f7eeee',line:'#e5cfd0',text:'#382d30',muted:'#806e70',accent:'#b9787b',soft:'#f0d9d9'},
 amethyst:{label:'Amethyst',bg:'#171421',panel:'#211c30',panel2:'#2b2440',line:'#493c60',text:'#f4edff',muted:'#b7a9ca',accent:'#b18ae8',soft:'#3a2d50'},
 ocean:{label:'Ocean',bg:'#101e2b',panel:'#172b3b',panel2:'#20394b',line:'#34576b',text:'#edf7fc',muted:'#a4bfce',accent:'#55b8e8',soft:'#23475e'},
 forest:{label:'Forest',bg:'#111d17',panel:'#1a2b21',panel2:'#24392c',line:'#3b5a45',text:'#edf8ef',muted:'#a8c3ae',accent:'#70c58a',soft:'#294a35'},
 ember:{label:'Ember',bg:'#211813',panel:'#30221a',panel2:'#402d22',line:'#674633',text:'#fff3e7',muted:'#d2b49c',accent:'#ed9b57',soft:'#563522'},
 monochrome:{label:'Monochrome',bg:'#171717',panel:'#222',panel2:'#2d2d2d',line:'#484848',text:'#f5f5f5',muted:'#b6b6b6',accent:'#d2d2d2',soft:'#393939'},
 arctic:{label:'Arctic',bg:'#e9f2f5',panel:'#fbfeff',panel2:'#e2edf1',line:'#c4d9e0',text:'#20343d',muted:'#627c85',accent:'#398da4',soft:'#d5e9ed'},
 lavender:{label:'Lavender',bg:'#211a2b',panel:'#2c2339',panel2:'#382d49',line:'#57456e',text:'#f7efff',muted:'#c2afd5',accent:'#c49ae8',soft:'#49365f'}
};
const distros={
 arch:{label:'Arch Linux',logo:'Λ',bg:'#080d18',panel:'#101b2b',panel2:'#17263a',line:'#294563',text:'#eaf4ff',muted:'#9db8d2',accent:'#1793d1',soft:'#173b58'},
 debian:{label:'Debian',logo:'◉',bg:'#180c13',panel:'#26131e',panel2:'#351a29',line:'#63324b',text:'#fff0f5',muted:'#d0a7b7',accent:'#d70a53',soft:'#4b1c34'},
 ubuntu:{label:'Ubuntu',logo:'●',bg:'#1b111c',panel:'#2b1b2c',panel2:'#3b2540',line:'#65465f',text:'#fff4ee',muted:'#d0b7c6',accent:'#e95420',soft:'#522a42'},
 cachy:{label:'CachyOS',logo:'C',bg:'#101914',panel:'#19271e',panel2:'#24372b',line:'#3d6049',text:'#edfff2',muted:'#a9c8b2',accent:'#62c98a',soft:'#284a34'},
 fedora:{label:'Fedora',logo:'f',bg:'#0b1928',panel:'#12283d',panel2:'#1a3852',line:'#315c7e',text:'#eff8ff',muted:'#a8c8df',accent:'#51a2da',soft:'#204968'},
 mint:{label:'Linux Mint',logo:'M',bg:'#101c17',panel:'#192a22',panel2:'#233a2e',line:'#3c634e',text:'#effbf3',muted:'#a9c9b4',accent:'#87cf9a',soft:'#294d39'},
 kali:{label:'Kali Linux',logo:'K',bg:'#081724',panel:'#10283a',panel2:'#17374e',line:'#2c607e',text:'#eaf8ff',muted:'#9fc8dc',accent:'#36a9d6',soft:'#1b4963'},
 opensuse:{label:'openSUSE',logo:'S',bg:'#101b13',panel:'#1b2a1d',panel2:'#293d2a',line:'#486d42',text:'#f1ffed',muted:'#b3cda9',accent:'#73ba42',soft:'#34552b'},
 nixos:{label:'NixOS',logo:'N',bg:'#101722',panel:'#1a2637',panel2:'#26364c',line:'#405c7b',text:'#eff5ff',muted:'#afc0d8',accent:'#7aa6df',soft:'#304d70'}
};
function apply(t,adminMode=false){
 const v=t|| (adminMode?distros.arch:userThemes.rose),root=document.documentElement,b=document.body;
 for(const [k,val] of Object.entries({bg:v.bg,panel:v.panel,panel2:v.panel2,line:v.line,text:v.text,muted:v.muted,purple:v.accent,blue:v.accent,green:v.accent}))root.style.setProperty('--'+k,val);
 b.style.background=v.bg;b.style.color=v.text;
 const themeKey=adminMode?(Object.keys(distros).find(k=>distros[k]===v)||'arch'):(Object.keys(userThemes).find(k=>userThemes[k]===v)||'rose');
 b.dataset.kalanTheme=adminMode?'admin-'+themeKey:themeKey;
 if(adminMode){
  b.classList.add('admin-hacker');
  [...b.classList].filter(x=>x.startsWith('admin-')&&x!=='admin-hacker').forEach(x=>b.classList.remove(x));
  b.classList.add('admin-'+themeKey);
 }else{
  [...b.classList].filter(x=>x.startsWith('admin-')).forEach(x=>b.classList.remove(x));
 }
 root.style.colorScheme=['#f3e8e7','#e9f2f5'].includes(v.bg)?'light':'dark';
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=v.bg;
}
function css(){
 if($('kalan-complete-theme-css'))return;
 const s=document.createElement('style');s.id='kalan-complete-theme-css';s.textContent=`
 body[data-kalan-theme] .sidebar,body[data-kalan-theme] .topbar,body[data-kalan-theme] .panel,body[data-kalan-theme] .game,body[data-kalan-theme] .modal,body[data-kalan-theme] .km-preview-panel,body[data-kalan-theme] .km-card,body[data-kalan-theme] .kalan-post,body[data-kalan-theme] .profile,body[data-kalan-theme] .chat-layout{background:var(--panel)!important;color:var(--text)!important;border-color:var(--line)!important}
 body[data-kalan-theme] .sidebar{background:var(--panel2)!important}
 body[data-kalan-theme] .hero{background:linear-gradient(120deg,var(--soft),var(--panel2) 65%,var(--bg))!important;border:1px solid var(--line)}
 body[data-kalan-theme] .search,body[data-kalan-theme] input,body[data-kalan-theme] textarea,body[data-kalan-theme] select,body[data-kalan-theme] .filter,body[data-kalan-theme] .back-game,body[data-kalan-theme] .sidebar-toggle,body[data-kalan-theme] .friend-action{background:var(--panel2)!important;color:var(--text)!important;border-color:var(--line)!important}
 body[data-kalan-theme] .nav button,body[data-kalan-theme] .muted,body[data-kalan-theme] small,body[data-kalan-theme] .crumb,body[data-kalan-theme] .eyebrow{color:var(--muted)}
 body[data-kalan-theme] .nav button:hover,body[data-kalan-theme] .nav button.active,body[data-kalan-theme] .filter.active{background:var(--soft)!important;color:var(--text)!important}
 body[data-kalan-theme] .primary,body[data-kalan-theme] .chat-compose button,body[data-kalan-theme] .km-play{background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important}
 body[data-kalan-theme] .brand-mark,body[data-kalan-theme] .top-avatar{background:var(--accent)!important;color:#fff!important}
 body[data-kalan-theme] .brand em,body[data-kalan-theme] .welcome h1 span,body[data-kalan-theme] .page-head h1 span,body[data-kalan-theme] .link,body[data-kalan-theme] .view{color:var(--accent)!important}
 body[data-kalan-theme] .game-info,body[data-kalan-theme] .activity,body[data-kalan-theme] .person,body[data-kalan-theme] .conversation,body[data-kalan-theme] .profile-stat{border-color:var(--line)!important}
 body[data-kalan-theme] .conversation:hover,body[data-kalan-theme] .conversation.active{background:var(--soft)!important}
 body[data-kalan-theme] .bubble{background:var(--soft)!important;color:var(--text)!important}
 body[data-kalan-theme] .bubble.mine{background:var(--accent)!important;color:#fff!important}
 body[data-kalan-theme] .footer,body[data-kalan-theme] .topbar,body[data-kalan-theme] .user-mini{border-color:var(--line)!important}
 #kalan-global-suite .kgs-theme-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:9px;margin:12px 0}
 #kalan-global-suite .kgs-theme-choice{border:1px solid var(--line);border-radius:10px;padding:11px;background:var(--panel2);color:var(--text);text-align:left;font-weight:700}
 #kalan-global-suite .kgs-theme-choice.active{outline:2px solid var(--accent);background:var(--soft)}
 #kalan-global-suite .kgs-swatch{display:flex;height:10px;border-radius:8px;overflow:hidden;margin-bottom:8px}
 #kalan-global-suite .kgs-swatch i{flex:1}
 #kalan-global-suite .kgs-theme-note{color:var(--muted);font-size:10px}
 body[data-kalan-theme^="admin-"] .brand-mark{background:var(--panel2)!important;border:1px solid var(--accent);box-shadow:0 0 16px color-mix(in srgb,var(--accent) 35%,transparent)}
 body[data-kalan-theme^="admin-"] .brand-mark img{width:27px;height:27px;object-fit:contain}
 @media(max-width:720px){#kalan-global-suite .kgs-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 `;document.head.appendChild(s)
}
function toast(m){const t=$('toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}}
let currentUser=null,isAdmin=false,profile=null;
function mount(){
 const host=$('kalan-global-suite');if(!host)return;
 const old=[...host.querySelectorAll('label')].filter(l=>/Theme|Accent color/.test(l.textContent));old.forEach(l=>l.style.display='none');
 let box=$('kgs-complete-themes');if(!box){box=document.createElement('div');box.id='kgs-complete-themes';box.innerHTML='<div class="eyebrow">KALANGAMER APPEARANCE</div><h3>Choose your website theme</h3><p class="kgs-theme-note">Eight fixed themes. Your choice is saved to your account and changes the entire site.</p><div class="kgs-theme-grid" id="kgs-user-theme-grid"></div>';host.querySelector('.kgs-grid')?.after(box)}
 const grid=$('kgs-user-theme-grid');if(!grid)return;
 grid.innerHTML=Object.entries(userThemes).map(([k,v])=>'<button type="button" class="kgs-theme-choice '+(profile?.theme_config?.preset===k?'active':'')+'" data-user-theme="'+k+'"><span class="kgs-swatch"><i style="background:'+v.bg+'"></i><i style="background:'+v.panel+'"></i><i style="background:'+v.accent+'"></i><i style="background:'+v.text+'"></i></span>'+v.label+'</button>').join('');
 grid.querySelectorAll('[data-user-theme]').forEach(btn=>btn.onclick=()=>saveUserTheme(btn.dataset.userTheme));
}
async function saveUserTheme(key){
 if(!currentUser||!userThemes[key])return;
 const config={preset:key};
 const {error}=await db.from('profiles').update({theme_config:config}).eq('id',currentUser.id);
 if(error){toast('Could not save theme: '+error.message);return}
 profile={...(profile||{}),theme_config:config};apply(userThemes[key]);mount();toast(userThemes[key].label+' theme saved.');
}
async function load(){
 const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;
 if(!currentUser){isAdmin=false;document.body.removeAttribute('data-kalan-theme');return}
 const [{data:p},{data:a,error:ae}]=await Promise.all([db.from('profiles').select('theme_config').eq('id',currentUser.id).maybeSingle(),db.rpc('is_kalangamer_admin')]);
 profile=p||{};isAdmin=!ae&&a===true;window.kalanIsAdmin=isAdmin;
 if(isAdmin){
  const key=profile.theme_config?.distro||'arch';apply(distros[key]||distros.arch,true);applyAdminLogo(key);
 }else{
  const key=profile.theme_config?.preset||'rose';apply(userThemes[key]||userThemes.rose);mount();
 }
}
function applyAdminLogo(key){
 const brand=document.querySelector('.brand-mark');if(!brand)return;
 const svg={arch:'<svg viewBox="0 0 256 256" width="27" height="27" aria-label="Arch Linux"><path fill="currentColor" d="M128 0C105 55 87 91 0 256c44-24 76-36 105-42-8-37 4-73 25-73s33 36 25 73c29 6 61 18 101 42C177 125 151 55 128 0Z"/></svg>',debian:'<span style="font-size:28px;color:#d70a53">◉</span>',ubuntu:'<span style="font-size:27px;color:#e95420">●</span>',cachy:'<span style="font-size:22px;color:#62c98a">C</span>',fedora:'<span style="font-size:25px;color:#51a2da">f</span>',mint:'<span style="font-size:23px;color:#87cf9a">M</span>',kali:'<span style="font-size:22px;color:#36a9d6">K</span>',opensuse:'<span style="font-size:23px;color:#73ba42">S</span>',nixos:'<span style="font-size:23px;color:#7aa6df">N</span>'};
 brand.innerHTML=svg[key]||svg.arch;brand.setAttribute('aria-label',(distros[key]||distros.arch).label);
}
function bindAdmin(){
 document.querySelectorAll('.distro-theme-choice').forEach(btn=>{
  const key=btn.dataset.distroTheme;const v=distros[key];if(v){btn.querySelector('.distro-theme-mark').textContent=v.logo;btn.querySelector('small').textContent='Full '+v.label+' website skin'}
  btn.onclick=async()=>{
   if(!isAdmin||!currentUser||!distros[key])return;
   apply(distros[key],true);applyAdminLogo(key);
   document.querySelectorAll('.distro-theme-choice').forEach(x=>x.classList.toggle('active',x.dataset.distroTheme===key));
   const status=$('distro-theme-status');if(status)status.textContent=distros[key].label+' theme selected. Saving…';
   const config={distro:key};const {error}=await db.from('profiles').update({theme_config:config}).eq('id',currentUser.id);
   if(error){toast('Could not save admin theme: '+error.message);return}
   profile={...(profile||{}),theme_config:config};apply(distros[key],true);applyAdminLogo(key);
   document.querySelectorAll('.distro-theme-choice').forEach(x=>x.classList.toggle('active',x.dataset.distroTheme===key));
   const status=$('distro-theme-status');if(status)status.textContent=distros[key].label+' full-site theme saved to your admin account.';
   toast(distros[key].label+' theme saved.');
  };
 });
}
css();
const oldApply=window.addEventListener('kalan-admin-theme',()=>{if(isAdmin)load()});
document.addEventListener('DOMContentLoaded',()=>{mount();bindAdmin()});
db.auth.onAuthStateChange(()=>setTimeout(load,0));
load().then(()=>{mount();bindAdmin()});
})();