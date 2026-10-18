import React from 'react';
import { s3Load, s3Box, s3Spec, s3Mats, s3Label, s3Viewer, s3Build, s3Apply, s3n, S3_LIM, S3_CAT, S3_INS, s3Cat, s3Id, s3Mk, s3Default, s3Price, S3_SHEETS, S3_TIPS, S3_PROJ, s3Thumb, s3Room } from './engine.js';

export default class App extends React.Component {
  state={screen:'reg',f:{name:'',phone:'',pass:'',shop:'',show:false,err:{},tried:false},onbKind:'kitchen',preset:0,
    step:2,done:{1:true},room:{w:3600,d:3000,h:2700},shape:'rect',tg:{stol:true,sokol:true,dobor:false,karniz:true,moyka:true},
    mods:s3Default(),sel:null,open:{},part:null,raw:{},view:'3d',spin:false,tip:3,ai:false,aiText:'',mic:false,cf:null,toast:'',ins:null,
    insA:{ex:0,color:1},cat:'all',q:'',rk:0,miss:false,mat:{k:0,f:0},projName:'Oshxona-Aziza',pq:'',loaded:false};
  openV={};miniHost=React.createRef();miniOv=React.createRef();regHost=React.createRef();regOv=React.createRef();roomHost=React.createRef();roomOv=React.createRef();insHost=React.createRef();insOv=React.createRef();
  componentDidMount(){this.dead=false;document.body.style.background='#0F2229';this.readHandoff();
    this.onHash=()=>this.readHandoff();window.addEventListener('hashchange',this.onHash);
    s3Load().then(T=>{if(this.dead)return;this.T=T;this.setState({loaded:true},()=>this.sync())}).catch(e=>console.warn('three load failed',e))}
  componentWillUnmount(){this.dead=true;this.vMini&&this.vMini.dispose();window.removeEventListener('hashchange',this.onHash);['vReg','vRoom','vIns'].forEach(k=>this[k]&&this[k].dispose());clearTimeout(this.tT)}
  componentDidUpdate(){const s=this.state,p=this._prev||{};const had=!!this.vRoom;this.sync();const pidNow=s.part&&s.part.id;
    if(this.vRoom&&had&&(s.mods!==p.mods||s.sel!==p.sel||s.room!==p.room||s.tg!==p.tg||s.shape!==p.shape||pidNow!==p.pid))this.buildRoom();
    if(this.vRoom&&had&&(s.view!==p.view||s.room!==p.room))this.camHome();
    this._prev={pid:pidNow,mods:s.mods,sel:s.sel,room:s.room,tg:s.tg,shape:s.shape,view:s.view}}
  sync(){if(!this.T)return;const s=this.state,T=this.T;
    if(this.vMini&&(!s.part||this.vMini.pid!==s.part.id)){this.vMini.dispose();this.vMini=null}
    const want={vReg:s.screen==='reg'||s.screen==='login',vRoom:s.screen==='app',vIns:!!s.ins,vMini:s.screen==='app'&&!!s.part};
    const hosts={vReg:[this.regHost,this.regOv],vRoom:[this.roomHost,this.roomOv],vIns:[this.insHost,this.insOv],vMini:[this.miniHost,this.miniOv]};
    for(const k in want){const h=hosts[k][0].current;
      if(this[k]&&(!want[k]||!h||this[k].host!==h)){this[k].dispose();this[k]=null}
      if(want[k]&&h&&!this[k]){try{this['init_'+k](T,h,hosts[k][1].current)}catch(e){console.warn(k,e)}}}}
  init_vReg(T,h,o){const v=s3Viewer(T,h,o);this.vReg=v;v.pC=new T.Plane(new T.Vector3(0,-1,0),0);v.pP=new T.Plane(new T.Vector3(0,1,0),0);v.M=s3Mats(T,[v.pC],[v.pP]);
    const m=s3Build(T,v,s3Spec('kp',600),false);v.dist=2.6;v.phi=.28;const a={color:1,explode:0,hw:1,count:1};
    v.onTick=(dt,t)=>{a.explode=(Math.sin(t*.7-1.5)*.5+.5)*.75;s3Apply(v,m,a);for(const L of v.labels)L.op=0}}
  init_vRoom(T,h,o){const v=s3Viewer(T,h,o);this.vRoom=v;v.M=s3Mats(T,null,null);v.grid.visible=false;v.shadow.visible=false;v.auto=false;
    v.r.toneMappingExposure=1.15;v.goal={theta:.38,phi:.24,dist:6.4};this.buildRoom();this.camHome(true);
    v.onClick=(x,y)=>{if(!this.ray)this.ray=new T.Raycaster();this.ray.setFromCamera(new T.Vector2(x,y),v.cam);this.roomClick(this.ray.intersectObjects(v.pick,false))};
    h.addEventListener('wheel',e=>{e.preventDefault();v.goal.dist=Math.max(2.2,Math.min(12,v.goal.dist*(e.deltaY>0?1.1:.9)))},{passive:false});
    v.onTick=(dt)=>{const ko=1-Math.exp(-dt*6);for(const mv of v.movers||[]){const t=this.state.open[mv.key]?1:0,c=this.openV[mv.key]||0,n=Math.abs(t-c)<.001?t:c+(t-c)*ko;this.openV[mv.key]=n;if(mv.type==='door')mv.obj.rotation.y=-mv.sign*n*1.75;else mv.obj.position.z=mv.d*.0007*n}
      const G=v.goal;if(v.isDown()){G.theta=v.theta;G.phi=v.phi}else{if(this.state.spin)G.theta+=dt*.5;const k=1-Math.exp(-dt*5);v.theta+=(G.theta-v.theta)*k;v.phi+=(G.phi-v.phi)*k}
      v.dist+=(G.dist-v.dist)*(1-Math.exp(-dt*5))}}
  camHome(instant){const v=this.vRoom;if(!v)return;const R=this.state.room,top=this.state.view==='2d';
    v.target.set(-R.w/4000+.9,top?0:1.15,top?R.d/2000:.7);v.goal={theta:top?0:.38,phi:top?1.42:.24,dist:top?Math.max(R.w,R.d)/1000*1.25+1.2:Math.max(5.2,R.w/1000*1.6)};
    if(instant){v.theta=v.goal.theta;v.phi=v.goal.phi;v.dist=v.goal.dist}}
  buildRoom(){const s=this.state;if(this.vRoom)s3Room(this.T,this.vRoom,{room:s.room,tg:s.tg,mods:s.mods,sel:s.sel,shape:s.shape,partId:s.part&&s.part.id})}
  init_vMini(T,h,o){const P=this.state.part,v=s3Viewer(T,h,o);this.vMini=v;v.pid=P.id;v.M=s3Mats(T,null,null);v.grid.visible=false;v.shadow.visible=false;
    const s=P.size.map(x=>x/1000),geo=s3Box(T,s[0],s[1],s[2]),mt=P.mk==='glass'?new T.MeshStandardMaterial({color:0x6FA3AA,roughness:.2}):v.M[P.mk]();
    const g=new T.Group();g.add(new T.Mesh(geo,mt),new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:0xFF7A45})));v.root.add(g);
    v.target.set(0,0,0);v.dist=Math.max(...s)*2.5+.12;const tn=s.indexOf(Math.min(...s));v.phi=tn===1?.9:.32;v.theta=tn===0?1.05:-.5;v.auto=true;
    const an=(x,y,z)=>{const q=new T.Object3D();q.position.set(x,y,z);g.add(q);return q};
    if(P.size[0]>=30)s3Label(v,Math.round(P.size[0])+'','',an(0,-s[1]/2-.02,s[2]/2+.02),'dim').op=1;
    if(P.size[1]>=30)s3Label(v,Math.round(P.size[1])+'','',an(s[0]/2+.03,0,s[2]/2),'dim').op=1;
    if(P.size[2]>=30)s3Label(v,Math.round(P.size[2])+'','',an(s[0]/2+.03,-s[1]/2,0),'dim').op=1}
  roomClick(hits){const s=this.state;if(!hits.length){this.select(null);return}
    let hit=hits[0];if(s.part){const vis=hits.find(x=>x.object.material.opacity>.5);if(vis&&vis.object.userData.part&&vis.object.userData.part.id===s.part.id)return;if(vis)hit=vis}
    const o=hit.object,P=o.userData.part,mid=o.userData.mid;
    if(s.sel!==mid){this.select(mid);return}
    if(!P)return;
    if(P.key&&!s.open[P.key]&&!s.part){this.setState({open:{...s.open,[P.key]:1}});return}
    this.setState({part:P})}
  init_vIns(T,h,o){const v=s3Viewer(T,h,o);this.vIns=v;v.columns=true;v.colTop=80;v.colBot=90;v.pC=new T.Plane(new T.Vector3(0,-1,0),0);v.pP=new T.Plane(new T.Vector3(0,1,0),0);v.M=s3Mats(T,[v.pC],[v.pP]);
    const m=this.state.mods.find(x=>x.id===this.state.ins);const spec=this.insSpec(m);const b=s3Build(T,v,spec,false);v.dist*=1.3;
    const a={color:1,explode:0,hw:0,count:1};this.insT0=performance.now();
    v.onTick=(dt)=>{const st=this.state.insA,age=(performance.now()-this.insT0)/1000;
      let ex=st.ex/100;if(this.insAuto)ex=Math.min(1,Math.max(0,(age-.6)/1.4));const k=1-Math.exp(-dt*5);
      a.explode+=(ex-a.explode)*k;a.color+=(st.color-a.color)*k;a.hw+=((age>1.4?1:0)-a.hw)*k;s3Apply(v,b,a);
      if(this.insAuto&&age>2.2){this.insAuto=false;this.setState({insA:{...this.state.insA,ex:100}})}}}
  insSpec(m){if(!m)return s3Spec('kp',600);return m.type==='kp'?s3Spec('kp',Math.round(Math.min(1070,Math.max(600,m.w))/10)*10):s3Spec('ku')}
  readHandoff(){let h=(location.hash||'').replace(/^#/,'');if(!h){try{h=sessionStorage.getItem('s3d-handoff')||''}catch(_){}}
    try{sessionStorage.removeItem('s3d-handoff')}catch(_){}if(!h)return;
    const q=new URLSearchParams(h.includes('=')?h:'s='+h),s=q.get('s');const st={};
    if(s==='login'||s==='reg')st.screen=s;
    const mod=q.get('mod');if(mod&&s3Cat(mod)){st.pending={mod,w:+q.get('w')||s3Cat(mod).w}}
    let user=null;try{user=JSON.parse(localStorage.getItem('s3d-user')||'null')}catch(_){}
    if(user&&s==='reg'&&!mod){st.screen='login'}
    if(user)st.f={...this.state.f,phone:user.phone||'',name:user.name||''};
    this.setState(st)}
  applyPending(base){const p=this.state.pending;if(!p)return base;const c=s3Cat(p.mod),lim=S3_LIM[c.type].w,m=s3Mk(p.mod,{w:Math.max(lim[0],Math.min(lim[1],p.w))});
    setTimeout(()=>this.toastMsg('Saytdagi modul loyihaga qo\'shildi: '+p.mod+' · '+m.w+' mm'),400);return {mods:[...base,m],sel:m.id,pending:null}}
  toastMsg(t){clearTimeout(this.tT);this.setState({toast:t});this.tT=setTimeout(()=>this.setState({toast:''}),3000)}
  select(id){this.setState({sel:id||null,raw:{},part:null});if(id&&this.state.tip===0)this.setState({tip:1})}
  upd(id,fn){this.setState(s=>({mods:s.mods.map(m=>m.id===id?fn({...m}):m)}))}
  setDim(id,key,val){const m=this.state.mods.find(x=>x.id===id);if(!m)return;const [lo,hi]=S3_LIM[m.type][key];const nm={w:'eni',d:'chuqurligi',h:'bo\'yi'}[key];
    let v=Math.round(+val||0),warn='';if(v>hi){warn=nm+' '+v+' mm > max '+hi+' → '+hi+' ga siqildi';v=hi}else if(v<lo){warn=nm+' '+v+' mm < min '+lo+' → '+lo+' ga siqildi';v=lo}
    this.upd(id,x=>{x[key]=v;x.warn=warn;return x});this.setState(s=>({raw:{...s.raw,[key]:undefined}}))}
  addMod(c){const m=s3Mk(c.code);this.setState(s=>({mods:[...s.mods,m],sel:m.id}));this.toastMsg(c.code+' sahnaga qo\'shildi')}
  confirm(o){this.setState({cf:o})}
  goStep(n){this.setState(s=>{const done={...s.done};for(let i=1;i<n;i++)done[i]=true;return {step:n,done}})}
  submitAuth(){const s=this.state,f=s.f,reg=s.screen==='reg',e={};
    if(reg&&!f.name.trim())e.name='Ismingizni yozing';
    let user=null;try{user=JSON.parse(localStorage.getItem('s3d-user')||'null')}catch(_){}
    if(f.phone.length!==9)e.phone='Telefon 9 raqam bo\'lishi kerak';else if(reg&&(f.phone==='901234567'||(user&&user.phone===f.phone)))e.phone='Bu raqam bilan akkaunt bor — kirish';
    if(f.pass.length<8)e.pass='Parol kamida 8 belgi';
    if(Object.keys(e).length){this.setState({f:{...f,err:e,tried:true}});return}
    if(reg){try{localStorage.setItem('s3d-user',JSON.stringify({name:f.name.trim(),phone:f.phone,shop:f.shop.trim()}))}catch(_){}}
    else if(user&&user.name&&!f.name)f.name=user.name;
    if(!reg&&this.state.pending){this.setState({f:{...f,err:{}},screen:'app',step:2,done:{1:true},tip:3,...this.applyPending(s3Default())});return}
    this.setState({f:{...f,err:{}},screen:reg?'onb1':'projects'})}
  renderVals(){const s=this.state,f=s.f,reg=s.screen==='reg',e=f.err;
    const sc=f.pass.length?[f.pass.length>=8,/\d/.test(f.pass),/[A-ZА-Я]/.test(f.pass),/[^\w]/.test(f.pass)].filter(Boolean).length:0;
    const scC=['var(--sfc3)','var(--danger)','var(--acc)','var(--cyan)','var(--cyan)'][sc];
    const fmt=d=>[d.slice(0,2),d.slice(2,5),d.slice(5,7),d.slice(7,9)].filter(Boolean).join(' ');
    const bd=k=>e[k]?'var(--danger)':'var(--line)';
    const mods=s.mods,sm=mods.find(m=>m.id===s.sel);
    const keysOf=m=>m.kind==='tortma'?[0,1,2].map(j=>m.id+':t'+j):Array.from({length:m.doors||1},(_,j)=>m.id+':d'+j);
    const allKeys=mods.flatMap(keysOf),anyOpen=allKeys.some(k=>s.open[k]),smKeys=sm?keysOf(sm):[],smOpen=smKeys.some(k=>s.open[k]),P=s.part;
    const sub=mods.reduce((a,m)=>a+s3Price(m),0)+(s.tg.stol?420000:0)+(s.tg.sokol?180000:0),cost=sub/1.35,cr=cost/4223039;
    const tgDef=[['stol','Stoleshnitsa','38 mm, yaxlit'],['sokol','Sokol','100 mm'],['dobor','Dobor','shiftgacha'],['karniz','Karniz','60 mm'],['moyka','Moyka','520×420 · MC-KP-08 ustida']];
    const ql=s.q.trim().toLowerCase();
    const catalog=S3_CAT.filter(c=>(s.cat==='all'||c.type===s.cat)&&(!ql||(c.name+' '+c.code).toLowerCase().includes(ql))).map(c=>({name:c.name,dims:c.w+'×'+c.d+'×'+c.h+' mm',lim:'min '+S3_LIM[c.type].w[0]+' · max '+S3_LIM[c.type].w[1],price:'~'+s3n(c.p)+' so\'m',add:()=>this.addMod(c),t:s3Thumb(c.w,c.h,c.d,c.type==='ku'?'#E8E4DA':'#B4834F',c.kind,c.doors,48)}));
    const rect=S3_SHEETS[s.rk];
    const ins=mods.find(m=>m.id===s.ins),ispec=ins?this.insSpec(ins):null;
    const navL=['Xona','Mebel','Narx','Fayllar'];
    const dimRow=(key,label)=>{const [lo,hi]=S3_LIM[sm.type][key];return {label,min:lo,max:hi,val:s.raw[key]??sm[key],
      dec:()=>this.setDim(sm.id,key,sm[key]-10),inc:()=>this.setDim(sm.id,key,sm[key]+10),
      onInput:ev=>{const val=ev.target.value;this.setState(st=>({raw:{...st.raw,[key]:val}}))},
      commit:()=>{if(s.raw[key]!==undefined)this.setDim(sm.id,key,s.raw[key])},key:ev=>{if(ev.key==='Enter')ev.target.blur()}}};
    const pList=S3_PROJ.filter(p=>!s.pq||(p.name+p.client).toLowerCase().includes(s.pq.toLowerCase()));
    const aiEx=['oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf','4.2x3.1 xona, 1 garderob, 1 stol','5x4 mehmonxona, divan, 2 ta toko'];
    const presets=[[3600,3000,'3.6×3 m'],[4200,3100,'4.2×3.1 m'],[5000,4000,'5×4 m'],[6000,4000,'6×4 m']];
    const fileG=[{title:'Mijozga',col:'var(--cyan)',sub:'Bittada logosi bilan',mainLabel:'🖨 Hisobot (PDF)',more:['📸 Rasm','🔄 360°','GLB (3D/AR)']},
      {title:'Sexga',col:'var(--lav)',sub:'82 detal · 6 varaq',mainLabel:'📊 Excel smeta',more:['Detallar (CSV)','Loyiha fayli']},
      {title:'Stanokka',col:'var(--acct)',sub:'alohida dastursiz',mainLabel:'GibLab',more:['DXF','G-code','Biesse','Homag','PTP','NC','XNC','Altendorf','Bazis (BPJ) · tez orada']}];
    return {
      hasPending:!!s.pending,pendingText:s.pending?(s.pending.mod+' · '+s.pending.w+' mm — ro\'yxatdan keyin loyihangizda turadi'):'',
      isAuth:reg||s.screen==='login',isReg:reg,regHost:this.regHost,regOv:this.regOv,
      f:{title:reg?'Ro\'yxatdan o\'tish':'Kirish',sub:reg?'1 daqiqa. Keyin birinchi loyihangizni chizasiz.':'Telefon raqamingiz va parolingiz bilan.',
        cta:reg?'Ro\'yxatdan o\'tish':'Kirish',alt:reg?'Akkauntingiz bormi?':'Akkaunt yo\'qmi?',altCta:reg?'Kirish':'Ro\'yxatdan o\'tish',
        name:f.name,phone:fmt(f.phone),pass:f.pass,shop:f.shop,passType:f.show?'text':'password',eye:f.show?'🙈':'👁',
        bars:[1,2,3,4].map(i=>({c:i<=sc?scC:'var(--sfc2)'})),strength:['','Zaif','O\'rtacha','Yaxshi','Kuchli'][sc],
        eName:!!e.name,eNamet:e.name||'',ePhone:!!e.phone,ePhonet:e.phone||'',ePass:!!e.pass,ePasst:e.pass||'',bName:bd('name'),bPhone:bd('phone'),bPass:bd('pass')},
      onName:ev=>this.setState({f:{...f,name:ev.target.value}}),onShop:ev=>this.setState({f:{...f,shop:ev.target.value}}),
      onPhone:ev=>{let d=ev.target.value.replace(/\D/g,'');if(d.startsWith('998')&&d.length>9)d=d.slice(3);this.setState({f:{...f,phone:d.slice(0,9)}})},
      onPass:ev=>this.setState({f:{...f,pass:ev.target.value}}),toggleEye:()=>this.setState({f:{...f,show:!f.show}}),
      submitAuth:()=>this.submitAuth(),swapAuth:()=>this.setState({screen:reg?'login':'reg',f:{...f,err:{}}}),
      isOnb:s.screen==='onb1'||s.screen==='onb2',isOnb1:s.screen==='onb1',isOnb2:s.screen==='onb2',
      onb:{n:s.screen==='onb1'?1:2,bars:[1,2,3].map(i=>({c:i<=(s.screen==='onb1'?1:2)?'var(--acc)':'var(--sfc2)'})),
        kinds:[['kitchen','🍳','Oshxona','Pastki va osma modullar'],['wardrobe','🚪','Shkaf / garderob','Kupe, penal, garderob'],['other','🛏','Boshqa mebel','Krovat, stol, javon'],['ai','✨','AI\'ga aytib beraman','Matn yoki ovoz bilan']].map(k=>({icon:k[1],label:k[2],sub:k[3],pick:()=>this.setState({onbKind:k[0],screen:'onb2'})})),
        isAi:s.onbKind==='ai',notAi:s.onbKind!=='ai',t2:s.onbKind==='ai'?'AI\'ga aytib bering':'Xona o\'lchami',s2:s.onbKind==='ai'?'Xona va mebelni oddiy so\'z bilan yozing yoki ayting.':'Tayyor o\'lchamni tanlang yoki o\'zingiz yozing.',
        presets:presets.map((p,i)=>{const on=s.room.w===p[0]&&s.room.d===p[1];return {label:p[2],area:((p[0]*p[1])/1e6).toFixed(1).replace('.',',')+' m²',bg:on?'rgba(255,122,69,.14)':'var(--sfc)',bd:on?'var(--acc)':'var(--line)',pick:()=>this.setState({room:{...s.room,w:p[0],d:p[1]}})}})},
      onbBack:()=>this.setState({screen:'onb1'}),openEditor:()=>this.setState({screen:'app',step:2,done:{1:true},tip:0,sel:null,...this.applyPending(s.mods)}),
      aiEx:aiEx.map(t=>({t,pick:()=>this.setState({aiText:t})})),aiText:s.aiText,onAiText:ev=>this.setState({aiText:ev.target.value}),
      toggleMic:()=>this.setState({mic:!s.mic}),micLabel:s.mic?'Tinglanmoqda…':'Ovoz',micBg:s.mic?'var(--danger)':'var(--sfc2)',micT:s.mic?'#2A0A0A':'var(--txt)',
      inShell:s.screen==='app'||s.screen==='projects',isEditor:s.screen==='app',isProjects:s.screen==='projects',
      projName:s.projName,onProjName:ev=>this.setState({projName:ev.target.value}),initials:(f.name.trim()?f.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2):'JA').toUpperCase(),
      price:{total:s3n(sub),cost:s3n(cost),profit:s3n(sub-cost)},goStep3:()=>this.goStep(3),goStep2:()=>this.goStep(2),goStep4:()=>this.goStep(4),
      langToast:()=>this.toastMsg('O\'zbekcha · Русский — tez orada'),settingsToast:()=>this.toastMsg('Sozlamalar: sex logosi, narx ustamasi, stanok profili'),
      goProjects:()=>this.setState({screen:'projects',sel:null}),newProject:()=>this.setState({screen:'onb1',mods:s3Default(),projName:'Yangi loyiha'}),
      pq:s.pq,onPq:ev=>this.setState({pq:ev.target.value}),projEmpty:!pList.length,
      projects:pList.map(p=>({...p,t:s3Thumb(p.fw*1000,p.fh*1000,450,p.col,'door',2,100),open:()=>this.setState({screen:'app',projName:p.name,tip:3})})),
      nav:navL.map((l,i)=>{const n=i+1,on=s.step===n,dn=s.done[n];return {label:l,mark:dn&&!on?'✓':n,go:()=>this.goStep(n),bg:on?'var(--sfc2)':'transparent',c:on?'var(--txt)':'var(--mut)',nb:on?'var(--acc)':dn?'rgba(95,225,196,.18)':'var(--sfc)',nc:on?'var(--ink)':dn?'var(--cyan)':'var(--mut)'}}),
      roomHost:this.roomHost,roomOv:this.roomOv,notLoaded:!s.loaded,
      vw:{b2:s.view==='2d'?'var(--acc)':'transparent',t2:s.view==='2d'?'var(--ink)':'var(--txt)',b3:s.view==='3d'?'var(--acc)':'transparent',t3:s.view==='3d'?'var(--ink)':'var(--txt)',sb:s.spin?'var(--cyan)':'rgba(23,50,57,.9)',st:s.spin?'#06231E':'var(--txt)'},
      set2D:()=>this.setState({view:'2d',spin:false}),set3D:()=>this.setState({view:'3d'}),toggleSpin:()=>this.setState({spin:!s.spin,view:'3d'}),center:()=>this.camHome(),
      shot:()=>this.toastMsg('📸 1080p rasm saqlandi — Bittada logosi bilan'),
      tip:{on:s.screen==='app'&&s.tip<3,text:S3_TIPS[Math.min(s.tip,2)],n:Math.min(s.tip,2)+1,btn:s.tip>=2?'Tushunarli':'Keyingi'},
      tipNext:()=>this.setState({tip:s.tip+1}),tipSkip:()=>this.setState({tip:3}),
      hasSel:!!sm,deselect:()=>this.select(null),
      toggleAllOpen:()=>{const o={};if(!anyOpen)allKeys.forEach(k=>o[k]=1);this.setState({open:o,part:null})},openAllLabel:anyOpen?'Hammasini yopish':'Eshiklarni ochish',
      toggleModOpen:()=>{const o={...s.open};smKeys.forEach(k=>{if(smOpen)delete o[k];else o[k]=1});this.setState({open:o,part:null})},
      hasPart:!!P,showModCard:!!sm&&!P,closePart:()=>this.setState({part:null}),miniHost:this.miniHost,miniOv:this.miniOv,
      pt:P?{name:P.name,dim:P.dim+' mm',mat:P.mat,edge:P.edge,code:P.code,isMov:!!P.key,movLabel:s.open[P.key]?'Yopish':'Ochish'}:{},
      togglePartOpen:()=>{if(!P||!P.key)return;const o={...s.open};if(o[P.key])delete o[P.key];else o[P.key]=1;this.setState({open:o})},
      sm:sm?{openLabel:(smOpen?'Yopish':'Ochish')+(sm.kind==='tortma'?' · tortmalar':' · eshiklar'),canIns:S3_INS.includes(sm.code),noIns:!S3_INS.includes(sm.code),name:sm.name,code:sm.code,warn:sm.warn,hasWarn:!!sm.warn,rows:[dimRow('w','Eni'),dimRow('d','Chuqurligi'),dimRow('h','Bo\'yi')]}:{rows:[]},
      moveL:()=>this.upd(sm.id,x=>{x.off-=50;return x}),moveR:()=>this.upd(sm.id,x=>{x.off+=50;return x}),
      rotate:()=>this.toastMsg('⟳ 90° — burchak devoriga o\'tkazish keyingi versiyada'),
      dup:()=>{const c={...sm,id:s3Id++,off:0,warn:''};const i=mods.indexOf(sm);const nm=[...mods];nm.splice(i+1,0,c);this.setState({mods:nm,sel:c.id});this.toastMsg('Nusxa qo\'shildi')},
      askDel:()=>this.confirm({title:'Modulni o\'chirasizmi?',text:sm.code+' · '+sm.name+' loyihadan olib tashlanadi.',ok:'O\'chirish',danger:true,yes:()=>{this.setState({mods:mods.filter(m=>m.id!==sm.id),sel:null});this.toastMsg('Modul o\'chirildi')}}),
      openInside:()=>{if(!S3_INS.includes(sm.code))return;this.insAuto=true;this.setState({ins:sm.id,insA:{ex:0,color:1}})},
      openAi:()=>this.setState({ai:true}),closeAi:()=>this.setState({ai:false,mic:false}),aiOpen:s.ai,
      aiBuild:()=>{const go=()=>{this.setState({mods:s3Default(),sel:null,ai:false,mic:false,cf:null});this.toastMsg('🪄 AI loyihani qurdi: 7 modul')};
        if(mods.length)this.setState({cf:{title:'Loyihani almashtirasizmi?',text:'Joriy '+mods.length+' ta mebel almashtiriladi. Davom etasizmi?',ok:'Almashtirish',yes:go}});else go()},
      isS1:s.step===1,isS2:s.step===2,isS3:s.step===3,isS4:s.step===4,
      shapes:[['rect','▣ To\'rtburchak'],['L','◩ L-shakl'],['free','✎ Erkin']].map(x=>({label:x[1],bg:s.shape===x[0]?'var(--acc)':'transparent',c:s.shape===x[0]?'var(--ink)':'var(--txt)',pick:()=>x[0]==='free'?this.toastMsg('✎ Erkin shakl: sahnada nuqtalarni bosing'):this.setState({shape:x[0]})})),
      room:s.room,onRoomW:ev=>this.setState({room:{...s.room,w:Math.max(1500,Math.min(9000,+ev.target.value||0))}}),onRoomD:ev=>this.setState({room:{...s.room,d:Math.max(1500,Math.min(9000,+ev.target.value||0))}}),onRoomH:ev=>this.setState({room:{...s.room,h:Math.max(2200,Math.min(4000,+ev.target.value||0))}}),
      roomPresets:presets.map(p=>{const on=s.room.w===p[0]&&s.room.d===p[1];return {label:p[2],bg:on?'var(--acc)':'var(--sfc)',c:on?'var(--ink)':'var(--txt)',pick:()=>this.setState({room:{...s.room,w:p[0],d:p[1]}})}}),
      holes:[{t:'Deraza',d:'1200 mm · chap devor'},{t:'Eshik',d:'900 mm · old devor'},{t:'Quvur',d:'orqa devor · 350 mm · h 500'}],addHole:()=>this.toastMsg('Teshik qo\'shish: turi, kengligi, devori'),
      toggles:tgDef.map(t=>{const on=s.tg[t[0]];return {label:t[1],sub:t[2],bg:on?'var(--acc)':'var(--sfc3)',kx:on?'translateX(20px)':'none',flip:()=>this.setState({tg:{...s.tg,[t[0]]:!on}})}}),
      q:s.q,onQ:ev=>this.setState({q:ev.target.value}),
      cats:[['all','Barchasi'],['kp','Oshxona pastki'],['ku','Oshxona ustki'],['penal','Penal'],['shkaf','Shkaf'],['krovat','Krovat'],['stol','Stol']].map(c=>({label:c[1],bg:s.cat===c[0]?'var(--acc)':'var(--sfc)',c:s.cat===c[0]?'var(--ink)':'var(--txt)',pick:()=>this.setState({cat:c[0]})})),
      mats:[['Korpus',['LDSP 16','LDSP 18','Эггер 18 W1000']],['Fasad',['MDF 18','LDSP 16 dekor','Akril 18']]].map((m,i)=>{const key=i?'f':'k';return {k:m[0],v:m[1][s.mat[key]],cycle:()=>{this.setState({mat:{...s.mat,[key]:(s.mat[key]+1)%3}});this.toastMsg(m[0]+': '+m[1][(s.mat[key]+1)%3]+' — narx yangilandi')}}}),
      catalog,catEmpty:!catalog.length,
      toggleMissing:()=>this.setState({miss:!s.miss}),missOpen:s.miss,missArrow:s.miss?'▴':'▾',
      missing:[{n:'Petlya 110° (vkladnaya)',c:'×8'},{n:'Yo\'naltiruvchi L450 (tortma)',c:'×3 juft'},{n:'Moyka sifoni',c:'×1'}],
      quote:[...mods.map(m=>({name:m.code+' · '+m.name,dim:m.w+'×'+m.d+'×'+m.h,n:1,p:s3n(s3Price(m))})),{name:'Stoleshnitsa va sokol',dim:'3000×600',n:1,p:s3n((s.tg.stol?420000:0)+(s.tg.sokol?180000:0))}],
      costRows:[['Plita','6 varaq · 28,4 m²',2312000],['Kromka','48,6 m',186400],['Zapchast','164 dona',1024639],['Teshiklar','присадка · 312',140000],['Ish haqi','sex',560000]].map(r=>({name:r[0],q:r[1],p:s3n(r[2]*cr)})),
      rk:{n:s.rk+1,rects:rect,dots:[0,1,2,3,4,5].map(i=>({w:i===s.rk?'22px':'6px',c:i===s.rk?'var(--acc)':'var(--sfc3)'}))},
      rkPrev:()=>this.setState({rk:(s.rk+5)%6}),rkNext:()=>this.setState({rk:(s.rk+1)%6}),openParams:()=>this.toastMsg('⚙️ Arra 4 mm · trim 10 mm · qoldiq ≥ 200 mm'),
      detGroups:[{n:'Korpus (LDSP 16)',c:'54 detal'},{n:'Fasad (MDF 18)',c:'17 detal'},{n:'Orqa devor (HDF 3)',c:'7 detal'},{n:'Stoleshnitsa va sokol',c:'4 detal'}],
      fileGroups:fileG.map(g=>({...g,main:()=>this.toastMsg(g.mainLabel+' — fayl tayyorlandi'),more:g.more.map(l=>{const dis=l.includes('tez orada');return {label:l,dis,c:dis?'var(--mut)':'var(--txt)',cur:dis?'not-allowed':'pointer',go:()=>{if(!dis)this.toastMsg(l+' — fayl tayyorlandi')}}})})),
      insOpen:!!ins,insHost:this.insHost,insOv:this.insOv,closeInside:()=>this.setState({ins:null}),
      ins:ispec?{name:ins.name,code:ins.code,size:ispec.W+'×'+ispec.D+'×'+ispec.H+' mm',hasNote:ins.w!==ispec.W||ins.d!==ispec.D||ins.h!==ispec.H,note:'Modulingiz '+ins.w+'×'+ins.d+'×'+ins.h+' — ichki ko\'rinish formula chegarasidagi o\'lchamda',detal:ispec.stats.detal,zap:ispec.stats.zap,list:ispec.list,hw:ispec.hwList,ex:s.insA.ex,
        cB:s.insA.color?'var(--acc)':'transparent',cT:s.insA.color?'var(--ink)':'var(--mut)',pB:s.insA.color?'transparent':'var(--sfc)',pT:s.insA.color?'var(--mut)':'var(--txt)'}:{list:[],hw:[]},
      onInsEx:ev=>{this.insAuto=false;this.setState({insA:{...s.insA,ex:+ev.target.value}})},insColor:()=>this.setState({insA:{...s.insA,color:1}}),insPlain:()=>this.setState({insA:{...s.insA,color:0}}),
      cf:s.cf?{on:true,title:s.cf.title,text:s.cf.text,ok:s.cf.ok,bg:s.cf.danger?'var(--danger)':'var(--acc)',c:s.cf.danger?'#2A0A0A':'var(--ink)'}:{on:false},
      cfNo:()=>this.setState({cf:null}),cfYes:()=>{const y=s.cf&&s.cf.yes;this.setState({cf:null});y&&y()},
      hasToast:!!s.toast,toast:s.toast
    }}

  render() {
    const v = this.renderVals();
    return (
      <>
      <div data-s3a="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased"}}>
        {v.isAuth ? (<>
          <div data-auth="" style={{"minHeight":"100vh","display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr)"}}>
            <aside data-auth-aside="" style={{"position":"relative","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 45%,rgba(255,122,69,.18),transparent 70%),#0C1C22","borderRight":"1px solid var(--line)","display":"flex","flexDirection":"column","padding":"32px 40px"}}>
              <a href="index.html" style={{"display":"flex","alignItems":"center","gap":"10px","position":"relative","zIndex":"2","color":"var(--txt)"}}>
                <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px"}}>
                  {"3D"}
                </div>
                <div style={{"display":"flex","flexDirection":"column","lineHeight":"1.05"}}>
                  <span style={{"fontWeight":"800","fontSize":"19px"}}>
                    {"Smart3D"}
                  </span>
                  <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
                    {"by Bittada"}
                  </span>
                </div>
              </a>
              <div ref={v.regHost} style={{"position":"relative","flex":"1 1 auto","minHeight":"340px"}}>
                <div ref={v.regOv} style={{"position":"absolute","inset":"0","pointerEvents":"none"}}></div>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","position":"relative","zIndex":"2"}}>
                <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
                  <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
                    {"✓"}
                  </span>
                  {"Detal va raskroy — avtomatik"}
                </span>
                <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
                  <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
                    {"✓"}
                  </span>
                  {"Smeta zapchasti bilan, bir zumda"}
                </span>
                <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
                  <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
                    {"✓"}
                  </span>
                  {"Stanok fayli — bir tugmada"}
                </span>
              </div>
            </aside>
            <main style={{"display":"flex","alignItems":"center","justifyContent":"center","padding":"32px 16px"}}>
              <div style={{"width":"min(440px,100%)","display":"flex","flexDirection":"column","gap":"22px"}}>
                <a href="index.html" style={{"alignSelf":"flex-start","color":"var(--mut)","fontWeight":"700","fontSize":"15px","minHeight":"44px","display":"flex","alignItems":"center"}}>
                  {"← Saytga qaytish"}
                </a>
                {v.hasPending ? (<>
                  <div style={{"display":"flex","gap":"12px","alignItems":"center","padding":"12px 14px","borderRadius":"16px","background":"rgba(255,122,69,.12)","border":"1px solid rgba(255,122,69,.4)"}}>
                    <span style={{"width":"36px","height":"36px","flex":"0 0 36px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800"}}>
                      {"+"}
                    </span>
                    <span style={{"fontSize":"14px","fontWeight":"700"}}>
                      {v.pendingText}
                    </span>
                  </div>
                </>) : null}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <h1 style={{"margin":"0","fontSize":"clamp(30px,3.4vw,40px)","lineHeight":"1.05","letterSpacing":"-.035em","fontWeight":"800"}}>
                    {v.f?.title}
                  </h1>
                  <p style={{"margin":"0","color":"var(--mut)"}}>
                    {v.f?.sub}
                  </p>
                </div>
                <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
                  {v.isReg ? (<>
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                        {"Ismingiz"}
                      </span>
                      <input value={v.f?.name} onChange={v.onName} placeholder="Jasur Aliyev" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","borderColor":v.f?.bName}} />
                      {v.f?.eName ? (<>
                        <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                          {v.f?.eNamet}
                        </span>
                      </>) : null}
                    </label>
                  </>) : null}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                      {"Telefon"}
                    </span>
                    <div style={{"display":"flex","alignItems":"center","height":"52px","borderRadius":"14px","background":"var(--bg)","border":`1px solid ${v.f?.bPhone}`,"overflow":"hidden"}}>
                      <span style={{"padding":"0 4px 0 16px","fontWeight":"700","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                        {"+998"}
                      </span>
                      <input value={v.f?.phone} onChange={v.onPhone} inputMode="numeric" placeholder="__ ___ __ __" style={{"flex":"1","minWidth":"0","height":"100%","background":"transparent","border":"0","color":"var(--txt)","fontSize":"16px","fontVariantNumeric":"tabular-nums","outline":"none","padding":"0 12px 0 4px"}} />
                    </div>
                    {v.f?.ePhone ? (<>
                      <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                        {v.f?.ePhonet}
                      </span>
                    </>) : null}
                  </label>
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                      {"Parol"}
                    </span>
                    <div style={{"display":"flex","alignItems":"center","height":"52px","borderRadius":"14px","background":"var(--bg)","border":`1px solid ${v.f?.bPass}`,"overflow":"hidden"}}>
                      <input type={v.f?.passType} value={v.f?.pass} onChange={v.onPass} placeholder="kamida 8 belgi" style={{"flex":"1","minWidth":"0","height":"100%","background":"transparent","border":"0","color":"var(--txt)","fontSize":"16px","outline":"none","padding":"0 16px"}} />
                      <button onClick={v.toggleEye} aria-label="Parolni ko'rsatish" style={{"width":"52px","height":"52px","background":"transparent","border":"0","color":"var(--mut)","fontSize":"18px","cursor":"pointer"}}>
                        {v.f?.eye}
                      </button>
                    </div>
                    {v.isReg ? (<>
                      <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                        <div style={{"flex":"1","display":"flex","gap":"4px"}}>
                          {(v.f?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
                            <span style={{"flex":"1","height":"4px","borderRadius":"9px","background":b?.c,"transition":"background .2s"}}></span>
                          </React.Fragment>))}
                        </div>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","minWidth":"64px","textAlign":"right"}}>
                          {v.f?.strength}
                        </span>
                      </div>
                    </>) : null}
                    {v.f?.ePass ? (<>
                      <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                        {v.f?.ePasst}
                      </span>
                    </>) : null}
                  </label>
                  {v.isReg ? (<>
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                        {"Sex nomi "}
                        <span style={{"color":"var(--mut)","fontWeight":"500"}}>
                          {"· ixtiyoriy"}
                        </span>
                      </span>
                      <input value={v.f?.shop} onChange={v.onShop} placeholder="Mebel-Pro" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none"}} />
                    </label>
                  </>) : null}
                </div>
                <button onClick={v.submitAuth} style={{"height":"56px","borderRadius":"16px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","transition":"transform .15s ease-out"}} className="h0">
                  {v.f?.cta}
                </button>
                <div style={{"display":"flex","justifyContent":"center","gap":"6px","color":"var(--mut)","fontSize":"15px"}}>
                  <span>
                    {v.f?.alt}
                  </span>
                  <button onClick={v.swapAuth} style={{"background":"none","border":"0","padding":"0","color":"var(--acct)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                    {v.f?.altCta}
                  </button>
                </div>
              </div>
            </main>
          </div>
        </>) : null}
        {v.isOnb ? (<>
          <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column","background":"radial-gradient(ellipse 60% 50% at 50% 0%,rgba(255,122,69,.12),transparent 70%),var(--bg)"}}>
            <div style={{"maxWidth":"1080px","width":"100%","margin":"0 auto","padding":"20px clamp(16px,4vw,32px)","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
              <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                <div style={{"width":"36px","height":"36px","borderRadius":"11px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
                  {"3D"}
                </div>
                <span style={{"fontWeight":"800","fontSize":"18px"}}>
                  {"Smart3D"}
                </span>
              </div>
              <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                <div style={{"display":"flex","gap":"4px"}}>
                  {(v.onb?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
                    <span style={{"width":"28px","height":"5px","borderRadius":"9px","background":b?.c}}></span>
                  </React.Fragment>))}
                </div>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
                  {v.onb?.n}{" / 3"}
                </span>
              </div>
            </div>
            <div style={{"flex":"1","maxWidth":"1080px","width":"100%","margin":"0 auto","padding":"clamp(16px,5vh,56px) clamp(16px,4vw,32px) 48px","display":"flex","flexDirection":"column","gap":"28px"}}>
              {v.isOnb1 ? (<>
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <h1 style={{"margin":"0","fontSize":"clamp(30px,4vw,48px)","letterSpacing":"-.04em","lineHeight":"1.05","fontWeight":"800"}}>
                    {"Nima yasaymiz?"}
                  </h1>
                  <p style={{"margin":"0","color":"var(--mut)","fontSize":"17px"}}>
                    {"Tanlang — keyin hammasini o'zgartirsa bo'ladi."}
                  </p>
                </div>
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(220px,1fr))","gap":"12px"}}>
                  {(v.onb?.kinds || []).map((k, $index) => (<React.Fragment key={$index}>
                    <button onClick={k?.pick} style={{"minHeight":"200px","textAlign":"left","borderRadius":"24px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","padding":"24px","cursor":"pointer","display":"flex","flexDirection":"column","justifyContent":"space-between","gap":"16px","transition":"transform .35s cubic-bezier(.2,.8,.2,1),border-color .2s","transform":"perspective(900px)"}} className="h1">
                      <span style={{"width":"64px","height":"64px","borderRadius":"20px","background":"var(--sfc2)","display":"grid","placeItems":"center","fontSize":"32px"}}>
                        {k?.icon}
                      </span>
                      <span style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                          {k?.label}
                        </span>
                        <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                          {k?.sub}
                        </span>
                      </span>
                    </button>
                  </React.Fragment>))}
                </div>
              </>) : null}
              {v.isOnb2 ? (<>
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <button onClick={v.onbBack} style={{"alignSelf":"flex-start","background":"none","border":"0","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","padding":"0"}}>
                    {"← Orqaga"}
                  </button>
                  <h1 style={{"margin":"0","fontSize":"clamp(30px,4vw,48px)","letterSpacing":"-.04em","lineHeight":"1.05","fontWeight":"800"}}>
                    {v.onb?.t2}
                  </h1>
                  <p style={{"margin":"0","color":"var(--mut)","fontSize":"17px"}}>
                    {v.onb?.s2}
                  </p>
                </div>
                {v.onb?.notAi ? (<>
                  <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(170px,1fr))","gap":"10px"}}>
                    {(v.onb?.presets || []).map((p, $index) => (<React.Fragment key={$index}>
                      <button onClick={p?.pick} style={{"minHeight":"96px","borderRadius":"20px","background":p?.bg,"border":`1px solid ${p?.bd}`,"color":"var(--txt)","cursor":"pointer","display":"flex","flexDirection":"column","alignItems":"flex-start","justifyContent":"center","gap":"2px","padding":"16px 20px","transition":"border-color .2s"}}>
                        <span style={{"fontSize":"26px","fontWeight":"800","fontVariantNumeric":"tabular-nums","letterSpacing":"-.02em"}}>
                          {p?.label}
                        </span>
                        <span style={{"fontSize":"13px","color":"var(--mut)"}}>
                          {p?.area}
                        </span>
                      </button>
                    </React.Fragment>))}
                  </div>
                  <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"flex-end"}}>
                    <span style={{"flex":"1 0 100%","fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                      {"Yoki o'z o'lchamingiz"}
                    </span>
                    <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                        {"Eni, mm"}
                      </span>
                      <input type="number" value={v.room?.w} onChange={v.onRoomW} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
                    </label>
                    <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                        {"Chuqurligi, mm"}
                      </span>
                      <input type="number" value={v.room?.d} onChange={v.onRoomD} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
                    </label>
                    <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                        {"Bo'yi, mm"}
                      </span>
                      <input type="number" value={v.room?.h} onChange={v.onRoomH} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
                    </label>
                  </div>
                </>) : null}
                {v.onb?.isAi ? (<>
                  <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","padding":"20px"}}>
                    <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder="oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf" style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"vertical","outline":"none"}}></textarea>
                    <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                      <button onClick={v.toggleMic} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","height":"44px","background":v.micBg,"color":v.micT}}>
                        {"🎤 "}{v.micLabel}
                      </button>
                      {(v.aiEx || []).map((x, $index) => (<React.Fragment key={$index}>
                        <button onClick={x?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600"}}>
                          {x?.t}
                        </button>
                      </React.Fragment>))}
                    </div>
                  </div>
                </>) : null}
                <div style={{"display":"flex","justifyContent":"flex-end"}}>
                  <button onClick={v.openEditor} style={{"height":"56px","padding":"0 28px","borderRadius":"16px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
                    {"Muharrirni ochish →"}
                  </button>
                </div>
              </>) : null}
            </div>
          </div>
        </>) : null}
        {v.inShell ? (<>
          <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
            <header style={{"position":"sticky","top":"0","zIndex":"30","height":"64px","flex":"0 0 64px","background":"rgba(15,34,41,.92)","backdropFilter":"blur(14px)","WebkitBackdropFilter":"blur(14px)","borderBottom":"1px solid var(--line)","display":"flex","alignItems":"center","gap":"12px","padding":"0 clamp(12px,2vw,20px)"}}>
              <button onClick={v.goProjects} style={{"display":"flex","alignItems":"center","gap":"10px","background":"none","border":"0","color":"var(--txt)","cursor":"pointer","padding":"0"}}>
                <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
                  {"3D"}
                </div>
                <span data-hide-m="" style={{"display":"flex","flexDirection":"column","lineHeight":"1.05","textAlign":"left"}}>
                  <span style={{"fontWeight":"800","fontSize":"18px"}}>
                    {"Smart3D"}
                  </span>
                  <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
                    {"by Bittada"}
                  </span>
                </span>
              </button>
              {v.isEditor ? (<>
                <label style={{"display":"flex","alignItems":"center","gap":"6px","minWidth":"0","flex":"0 1 auto","height":"40px","padding":"0 12px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)"}}>
                  <span data-hide-m="" style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                    {"Loyiha:"}
                  </span>
                  <input value={v.projName} onChange={v.onProjName} style={{"width":"150px","minWidth":"0","background":"transparent","border":"0","color":"var(--txt)","fontWeight":"800","fontSize":"15px","outline":"none"}} />
                  <span style={{"color":"var(--mut)"}}>
                    {"✎"}
                  </span>
                </label>
              </>) : null}
              <div style={{"marginLeft":"auto","display":"flex","alignItems":"center","gap":"8px"}}>
                {v.isEditor ? (<>
                  <button onClick={v.goStep3} style={{"height":"44px","padding":"0 14px","borderRadius":"999px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                    {v.price?.total}{" so'm"}
                    <span style={{"fontSize":"13px"}}>
                      {"*"}
                    </span>
                  </button>
                  <span data-hide-m="" style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","whiteSpace":"nowrap"}}>
                    {"* to'liq emas"}
                  </span>
                </>) : null}
                <button onClick={v.langToast} aria-label="Til" data-hide-m="" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto"}}>
                  {"🌐"}
                </button>
                <div style={{"width":"44px","height":"44px","borderRadius":"999px","background":"var(--sfc2)","border":"1px solid var(--line)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px","color":"var(--cyan)"}}>
                  {v.initials}
                </div>
              </div>
            </header>
            {v.isProjects ? (<>
              <main style={{"maxWidth":"1240px","width":"100%","margin":"0 auto","padding":"clamp(20px,4vw,40px) clamp(16px,4vw,32px) 64px","display":"flex","flexDirection":"column","gap":"24px"}}>
                <div style={{"display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"center","justifyContent":"space-between"}}>
                  <h1 style={{"margin":"0","fontSize":"clamp(28px,3.4vw,40px)","letterSpacing":"-.035em","fontWeight":"800"}}>
                    {"Loyihalarim"}
                  </h1>
                  <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","flex":"1 1 320px","justifyContent":"flex-end"}}>
                    <input value={v.pq} onChange={v.onPq} placeholder="Qidirish: nom yoki mijoz" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","height":"48px","flex":"1 1 220px","maxWidth":"340px","background":"var(--sfc)"}} />
                    <button onClick={v.newProject} style={{"height":"48px","padding":"0 20px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","whiteSpace":"nowrap"}}>
                      {"+ Yangi loyiha"}
                    </button>
                  </div>
                </div>
                {v.projEmpty ? (<>
                  <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"48px 24px","display":"flex","flexDirection":"column","alignItems":"center","gap":"14px","textAlign":"center"}}>
                    <span style={{"fontSize":"40px"}}>
                      {"🔍"}
                    </span>
                    <span style={{"fontSize":"18px","fontWeight":"800"}}>
                      {"Topilmadi — boshqa so'z bilan qidiring"}
                    </span>
                  </div>
                </>) : null}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill,minmax(260px,1fr))","gap":"14px"}}>
                  {(v.projects || []).map((X, $index) => (<React.Fragment key={$index}>
                    <button onClick={X?.open} style={{"textAlign":"left","borderRadius":"24px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","padding":"12px","cursor":"pointer","display":"flex","flexDirection":"column","gap":"12px","transition":"transform .35s cubic-bezier(.2,.8,.2,1),border-color .2s","transform":"perspective(900px)"}} className="h2">
                      <div style={{"width":"100%","height":"160px","borderRadius":"16px","display":"grid","placeItems":"center","background":"radial-gradient(circle at 50% 75%,rgba(255,122,69,.2),transparent 70%),var(--bg)"}}>
                        <div style={{"position":"relative","width":"120px","height":"120px","flex":"0 0 auto","background":"transparent","perspective":"600px"}}>
                          <div style={{"position":"absolute","inset":"0","transformStyle":"preserve-3d","transform":"rotateX(-22deg) rotateY(-38deg)"}}>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.fh,"background":X?.t?.fbg,"transform":X?.t?.ft,"border":"1px solid rgba(0,0,0,.25)"}}></div>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.sw,"height":X?.t?.fh,"background":"#D9D3C6","transform":X?.t?.st,"border":"1px solid rgba(0,0,0,.2)"}}></div>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.sw,"background":"#F3F0E9","transform":X?.t?.tt,"border":"1px solid rgba(0,0,0,.15)"}}></div>
                          </div>
                        </div>
                      </div>
                      <div style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 6px"}}>
                        <span style={{"fontSize":"18px","fontWeight":"800"}}>
                          {X?.name}
                        </span>
                        <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                          {X?.client}{" · "}{X?.date}
                        </span>
                      </div>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","padding":"0 6px 6px"}}>
                        <span style={{"padding":"5px 12px","borderRadius":"999px","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"13px","fontVariantNumeric":"tabular-nums"}}>
                          {X?.price}
                        </span>
                        <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                          {X?.mods}
                        </span>
                      </div>
                    </button>
                  </React.Fragment>))}
                </div>
              </main>
            </>) : null}
            {v.isEditor ? (<>
              <div data-ed="" style={{"flex":"1 1 auto","height":"calc(100vh - 64px)","display":"grid","gridTemplateColumns":"200px minmax(0,1fr) 400px"}}>
                <nav data-ednav="" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"16px 12px","borderRight":"1px solid var(--line)","background":"#0C1D23"}}>
                  {(v.nav || []).map((s, $index) => (<React.Fragment key={$index}>
                    <button data-navbtn="" onClick={s?.go} style={{"minHeight":"52px","borderRadius":"14px","border":"0","background":s?.bg,"color":s?.c,"display":"flex","alignItems":"center","gap":"12px","padding":"0 12px","fontWeight":"800","fontSize":"15px","cursor":"pointer","textAlign":"left","transition":"background .2s"}}>
                      <span style={{"width":"30px","height":"30px","flex":"0 0 30px","borderRadius":"999px","display":"grid","placeItems":"center","fontSize":"13px","fontWeight":"800","background":s?.nb,"color":s?.nc}}>
                        {s?.mark}
                      </span>
                      <span>
                        {s?.label}
                      </span>
                    </button>
                  </React.Fragment>))}
                  <div data-ednav-x="" style={{"height":"1px","background":"var(--line)","margin":"10px 4px"}}></div>
                  <button data-ednav-x="" onClick={v.goProjects} style={{"minHeight":"44px","borderRadius":"12px","border":"0","background":"transparent","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","textAlign":"left","padding":"0 12px"}} className="h3">
                    {"Loyihalar"}
                  </button>
                  <button data-ednav-x="" onClick={v.settingsToast} style={{"minHeight":"44px","borderRadius":"12px","border":"0","background":"transparent","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","textAlign":"left","padding":"0 12px"}} className="h4">
                    {"Sozlamalar"}
                  </button>
                </nav>
                <div data-scene="" style={{"position":"relative","minWidth":"0","height":"100%","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 40%,rgba(255,122,69,.10),transparent 70%),#0C1C22"}}>
                  <div ref={v.roomHost} style={{"position":"absolute","inset":"0"}}>
                    <div ref={v.roomOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                  </div>
                  {v.notLoaded ? (<>
                    <div style={{"position":"absolute","inset":"0","display":"grid","placeItems":"center","color":"var(--mut)","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
                      {"3D sahna yuklanmoqda…"}
                    </div>
                  </>) : null}
                  <div style={{"position":"absolute","left":"12px","right":"12px","top":"12px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"8px","pointerEvents":"none"}}>
                    <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","pointerEvents":"auto"}}>
                      <button onClick={v.set2D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b2,"color":v.vw?.t2,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
                        {"2D"}
                      </button>
                      <button onClick={v.set3D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b3,"color":v.vw?.t3,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
                        {"3D"}
                      </button>
                    </div>
                    <button onClick={v.shot} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"📸 Rasm"}
                    </button>
                    <button onClick={v.toggleSpin} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":v.vw?.sb,"border":"1px solid var(--line)","color":v.vw?.st,"fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"🔄 360°"}
                    </button>
                    <button onClick={v.toggleAllOpen} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"🚪 "}{v.openAllLabel}
                    </button>
                    <button onClick={v.center} aria-label="Markazga" style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"⌖ Markazga"}
                    </button>
                  </div>
                  {v.tip?.on ? (<>
                    <div style={{"position":"absolute","left":"50%","top":"72px","zIndex":"5","transform":"translateX(-50%)","width":"min(360px,calc(100% - 24px))","background":"var(--cyan)","color":"#06231E","borderRadius":"18px","padding":"14px 16px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 16px 40px rgba(0,0,0,.35)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontWeight":"800","fontSize":"16px"}}>
                          {v.tip?.text}
                        </span>
                        <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","fontWeight":"700"}}>
                          {v.tip?.n}{"/3"}
                        </span>
                      </div>
                      <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end"}}>
                        <button onClick={v.tipSkip} style={{"height":"36px","padding":"0 12px","borderRadius":"10px","border":"0","background":"transparent","color":"#06231E","fontWeight":"700","cursor":"pointer"}}>
                          {"O'tkazib yuborish"}
                        </button>
                        <button onClick={v.tipNext} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":"#06231E","color":"var(--cyan)","fontWeight":"800","cursor":"pointer"}}>
                          {v.tip?.btn}
                        </button>
                      </div>
                    </div>
                  </>) : null}
                  {v.showModCard ? (<>
                    <div style={{"position":"absolute","left":"12px","bottom":"12px","zIndex":"4","width":"min(350px,calc(100% - 84px))","maxHeight":"calc(100% - 80px)","overflow":"auto","background":"rgba(23,50,57,.96)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 20px 50px rgba(0,0,0,.4)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                          <span style={{"fontSize":"17px","fontWeight":"800","lineHeight":"1.2"}}>
                            {v.sm?.name}
                          </span>
                          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                            {v.sm?.code}
                          </span>
                        </div>
                        <button onClick={v.deselect} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
                          {"×"}
                        </button>
                      </div>
                      {(v.sm?.rows || []).map((r, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                            <span style={{"flex":"1","fontSize":"14px","fontWeight":"700","color":"var(--mut)"}}>
                              {r?.label}
                            </span>
                            <button onClick={r?.dec} aria-label="Kamaytirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
                              {"–"}
                            </button>
                            <input type="number" value={r?.val} onChange={r?.onInput} onBlur={r?.commit} onKeyDown={r?.key} style={{"width":"76px","height":"40px","borderRadius":"12px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","textAlign":"center","fontVariantNumeric":"tabular-nums","outline":"none"}} />
                            <button onClick={r?.inc} aria-label="Oshirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
                              {"+"}
                            </button>
                          </div>
                          <span style={{"fontSize":"12px","color":"var(--mut)","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                            {"min "}{r?.min}{" · max "}{r?.max}
                          </span>
                        </div>
                      </React.Fragment>))}
                      {v.sm?.hasWarn ? (<>
                        <div style={{"padding":"10px 12px","borderRadius":"12px","background":"rgba(255,123,123,.12)","border":"1px solid rgba(255,123,123,.4)","color":"var(--danger)","fontSize":"13px","fontWeight":"700"}}>
                          {"⚠️ "}{v.sm?.warn}
                        </div>
                      </>) : null}
                      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        <button onClick={v.moveL} aria-label="Chapga 50 mm" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"◀"}
                        </button>
                        <button onClick={v.moveR} aria-label="O'ngga 50 mm" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"▶"}
                        </button>
                        <button onClick={v.rotate} aria-label="90 gradus burish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)","fontSize":"14px"}}>
                          {"⟳"}
                        </button>
                        <button onClick={v.dup} aria-label="Nusxa" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"⧉"}
                        </button>
                        <button onClick={v.askDel} aria-label="O'chirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"rgba(255,123,123,.14)","color":"var(--danger)"}}>
                          {"🗑"}
                        </button>
                      </div>
                      <button onClick={v.toggleModOpen} style={{"height":"48px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                        {"🚪 "}{v.sm?.openLabel}
                      </button>
                      <span style={{"fontSize":"12px","color":"var(--mut)","textWrap":"pretty"}}>
                        {"Eshik yoki tortmani bosing — ochiladi. Ochilgan detalni bosing — ma'lumot chiqadi."}
                      </span>
                      {v.sm?.canIns ? (<>
                        <button onClick={v.openInside} style={{"width":"100%","height":"48px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","animation":"s3pulse 2.4s ease-out 2"}}>
                          {"Ichini ko'rish →"}
                        </button>
                      </>) : null}
                      {v.sm?.noIns ? (<>
                        <div style={{"height":"48px","borderRadius":"14px","border":"1px dashed var(--line)","color":"var(--mut)","fontWeight":"700","fontSize":"14px","display":"flex","alignItems":"center","justifyContent":"center"}}>
                          {"Ichki ko'rinish tez orada"}
                        </div>
                      </>) : null}
                    </div>
                  </>) : null}
                  {v.hasPart ? (<>
                    <div style={{"position":"absolute","right":"12px","top":"68px","zIndex":"6","width":"min(330px,calc(100% - 24px))","maxHeight":"calc(100% - 160px)","overflow":"auto","background":"rgba(23,50,57,.97)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"14px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 20px 50px rgba(0,0,0,.45)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                          <span style={{"fontSize":"18px","fontWeight":"800","lineHeight":"1.2"}}>
                            {v.pt?.name}
                          </span>
                          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                            {v.pt?.code}
                          </span>
                        </div>
                        <button onClick={v.closePart} aria-label="Yopish" style={{"width":"36px","height":"36px","flex":"0 0 auto","borderRadius":"12px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontSize":"17px","cursor":"pointer"}}>
                          {"×"}
                        </button>
                      </div>
                      <div ref={v.miniHost} style={{"position":"relative","height":"190px","flex":"0 0 auto","borderRadius":"16px","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,122,69,.16),transparent 70%),var(--bg)","border":"1px solid var(--line)"}}>
                        <div ref={v.miniOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                        <span style={{"position":"absolute","left":"10px","bottom":"8px","zIndex":"3","fontSize":"11px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Detal alohida · aylantiring"}
                        </span>
                      </div>
                      <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"6px 14px","fontSize":"14px"}}>
                        <span style={{"color":"var(--mut)"}}>
                          {"O'lcham"}
                        </span>
                        <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","color":"var(--cyan)"}}>
                          {v.pt?.dim}
                        </span>
                        <span style={{"color":"var(--mut)"}}>
                          {"Material"}
                        </span>
                        <span style={{"fontWeight":"700"}}>
                          {v.pt?.mat}
                        </span>
                        <span style={{"color":"var(--mut)"}}>
                          {"Kromka"}
                        </span>
                        <span style={{"fontWeight":"700"}}>
                          {v.pt?.edge}
                        </span>
                      </div>
                      {v.pt?.isMov ? (<>
                        <button onClick={v.togglePartOpen} style={{"height":"44px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                          {"🚪 "}{v.pt?.movLabel}
                        </button>
                      </>) : null}
                    </div>
                  </>) : null}
                  <button onClick={v.openAi} aria-label="AI" style={{"position":"absolute","right":"16px","bottom":"16px","zIndex":"4","width":"60px","height":"60px","borderRadius":"20px","border":"0","background":"var(--cyan)","color":"#06231E","fontSize":"24px","fontWeight":"800","cursor":"pointer","boxShadow":"0 14px 36px rgba(95,225,196,.3)"}}>
                    {"✨"}
                  </button>
                </div>
                <aside data-panel="" style={{"height":"100%","overflow":"auto","borderLeft":"1px solid var(--line)","background":"var(--bg)","padding":"20px","display":"flex","flexDirection":"column","gap":"16px"}}>
                  {v.isS1 ? (<>
                    <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                        {"① Qadam"}
                      </span>
                      <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                        {"Xona"}
                      </h2>
                    </div>
                    <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"var(--sfc)"}}>
                      {(v.shapes || []).map((x, $index) => (<React.Fragment key={$index}>
                        <button onClick={x?.pick} style={{"flex":"1","height":"40px","borderRadius":"10px","border":"0","background":x?.bg,"color":x?.c,"fontWeight":"800","fontSize":"14px","cursor":"pointer","whiteSpace":"nowrap"}}>
                          {x?.label}
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"8px"}}>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Eni, mm"}
                        </span>
                        <input type="number" value={v.room?.w} onChange={v.onRoomW} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Chuqurligi"}
                        </span>
                        <input type="number" value={v.room?.d} onChange={v.onRoomD} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Bo'yi"}
                        </span>
                        <input type="number" value={v.room?.h} onChange={v.onRoomH} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                    </div>
                    <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                      {(v.roomPresets || []).map((p, $index) => (<React.Fragment key={$index}>
                        <button onClick={p?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":p?.bg,"color":p?.c,"fontVariantNumeric":"tabular-nums"}}>
                          {p?.label}
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"10px"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Teshiklar"}
                        </span>
                        <button onClick={v.addHole} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","minHeight":"32px"}}>
                          {"+ Qo'shish"}
                        </button>
                      </div>
                      {(v.holes || []).map((h, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","justifyContent":"space-between","gap":"8px","padding":"8px 0","borderTop":"1px solid var(--line)","fontSize":"14px"}}>
                          <span style={{"fontWeight":"700"}}>
                            {h?.t}
                          </span>
                          <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                            {h?.d}
                          </span>
                        </div>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"2px"}}>
                      <span style={{"fontWeight":"800","paddingBottom":"6px"}}>
                        {"Oshxona elementlari"}
                      </span>
                      {(v.toggles || []).map((t, $index) => (<React.Fragment key={$index}>
                        <button onClick={t?.flip} style={{"minHeight":"48px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","background":"none","border":"0","borderTop":"1px solid var(--line)","color":"var(--txt)","fontSize":"15px","fontWeight":"700","cursor":"pointer","padding":"0","textAlign":"left"}}>
                          <span style={{"display":"flex","flexDirection":"column"}}>
                            <span>
                              {t?.label}
                            </span>
                            <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600"}}>
                              {t?.sub}
                            </span>
                          </span>
                          <span style={{"width":"48px","height":"28px","flex":"0 0 48px","borderRadius":"999px","background":t?.bg,"position":"relative","transition":"background .2s"}}>
                            <span style={{"position":"absolute","left":"3px","top":"3px","width":"22px","height":"22px","borderRadius":"999px","background":"#fff","transform":t?.kx,"transition":"transform .2s ease-out"}}></span>
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    <button onClick={v.goStep2} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
                      {"Keyingi: Mebel →"}
                    </button>
                  </>) : null}
                  {v.isS2 ? (<>
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","gap":"8px"}}>
                      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                          {"② Qadam"}
                        </span>
                        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                          {"Mebel"}
                        </h2>
                      </div>
                      <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                        {"121 ta modul"}
                      </span>
                    </div>
                    <input value={v.q} onChange={v.onQ} placeholder="shkaf 2 eshik…" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","height":"48px","background":"var(--sfc)","flex":"0 0 auto"}} />
                    <div style={{"display":"flex","gap":"6px","overflowX":"auto","flex":"0 0 auto","paddingBottom":"2px"}}>
                      {(v.cats || []).map((c, $index) => (<React.Fragment key={$index}>
                        <button onClick={c?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","flex":"0 0 auto","background":c?.bg,"color":c?.c,"whiteSpace":"nowrap"}}>
                          {c?.label}
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                      {(v.mats || []).map((m, $index) => (<React.Fragment key={$index}>
                        <button onClick={m?.cycle} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc)","color":"var(--txt)","fontWeight":"600"}}>
                          <span style={{"color":"var(--mut)"}}>
                            {m?.k}{":"}
                          </span>
                          <span style={{"fontWeight":"800"}}>
                            {m?.v}
                          </span>
                          <span style={{"color":"var(--mut)"}}>
                            {"▾"}
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    {v.catEmpty ? (<>
                      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"32px 16px","textAlign":"center","display":"flex","flexDirection":"column","gap":"6px"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Topilmadi — boshqa so'z bilan qidiring"}
                        </span>
                        <span style={{"color":"var(--mut)","fontSize":"14px"}}>
                          {"Masalan: \"pastki\", \"osma\", \"tortma\""}
                        </span>
                      </div>
                    </>) : null}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {(v.catalog || []).map((X, $index) => (<React.Fragment key={$index}>
                        <button onClick={X?.add} style={{"display":"flex","gap":"12px","alignItems":"center","padding":"10px","borderRadius":"18px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","cursor":"pointer","textAlign":"left","transition":"border-color .2s,transform .2s"}} className="h5">
                          <div style={{"position":"relative","width":"76px","height":"76px","flex":"0 0 auto","borderRadius":"14px","background":"radial-gradient(circle at 50% 70%,rgba(255,122,69,.18),transparent 70%),var(--bg)","perspective":"600px"}}>
                            <div style={{"position":"absolute","inset":"0","transformStyle":"preserve-3d","transform":"rotateX(-22deg) rotateY(-38deg)"}}>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.fh,"background":X?.t?.fbg,"transform":X?.t?.ft,"border":"1px solid rgba(0,0,0,.25)"}}></div>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.sw,"height":X?.t?.fh,"background":"#D9D3C6","transform":X?.t?.st,"border":"1px solid rgba(0,0,0,.2)"}}></div>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.sw,"background":"#F3F0E9","transform":X?.t?.tt,"border":"1px solid rgba(0,0,0,.15)"}}></div>
                            </div>
                          </div>
                          <span style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
                            <span style={{"fontWeight":"800","fontSize":"15px","lineHeight":"1.25"}}>
                              {X?.name}
                            </span>
                            <span style={{"fontSize":"13px","color":"var(--cyan)","fontWeight":"700","fontVariantNumeric":"tabular-nums"}}>
                              {X?.dims}
                            </span>
                            <span style={{"fontSize":"12px","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                              {X?.lim}
                            </span>
                          </span>
                          <span style={{"display":"flex","flexDirection":"column","alignItems":"flex-end","gap":"6px"}}>
                            <span style={{"fontSize":"13px","fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                              {X?.price}
                            </span>
                            <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800"}}>
                              {"+"}
                            </span>
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                  </>) : null}
                  {v.isS3 ? (<>
                    <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                        {"③ Qadam"}
                      </span>
                      <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                        {"Narx"}
                      </h2>
                    </div>
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(110px,1fr))","gap":"8px"}}>
                      <div style={{"borderRadius":"18px","padding":"14px","background":"var(--acc)","color":"var(--ink)","display":"flex","flexDirection":"column","gap":"2px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"800"}}>
                          {"Mijozga narx"}
                        </span>
                        <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15"}}>
                          {v.price?.total}
                        </span>
                        <span style={{"fontSize":"12px","fontWeight":"700"}}>
                          {"so'm *"}
                        </span>
                      </div>
                      <div style={{"borderRadius":"18px","padding":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","flexDirection":"column","gap":"2px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"800","color":"var(--mut)"}}>
                          {"Sex tannarxi"}
                        </span>
                        <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15"}}>
                          {v.price?.cost}
                        </span>
                        <span style={{"fontSize":"12px","color":"var(--mut)"}}>
                          {"so'm"}
                        </span>
                      </div>
                      <div style={{"borderRadius":"18px","padding":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","flexDirection":"column","gap":"2px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"800","color":"var(--mut)"}}>
                          {"Foyda (+35%)"}
                        </span>
                        <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15","color":"var(--cyan)"}}>
                          {v.price?.profit}
                        </span>
                        <span style={{"fontSize":"12px","color":"var(--mut)"}}>
                          {"so'm"}
                        </span>
                      </div>
                    </div>
                    <div style={{"borderRadius":"16px","background":"rgba(255,123,123,.10)","border":"1px solid rgba(255,123,123,.38)"}}>
                      <button onClick={v.toggleMissing} style={{"width":"100%","minHeight":"48px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","padding":"10px 14px","background":"none","border":"0","color":"var(--danger)","fontWeight":"800","fontSize":"14px","cursor":"pointer","textAlign":"left"}}>
                        {"⚠️ 12 ta zapchastning narxi bazada yo'q — 0 deb olindi"}
                        <span>
                          {v.missArrow}
                        </span>
                      </button>
                      {v.missOpen ? (<>
                        <div style={{"padding":"0 14px 12px","display":"flex","flexDirection":"column","gap":"4px","fontSize":"13px","color":"var(--txt)"}}>
                          {(v.missing || []).map((m, $index) => (<React.Fragment key={$index}>
                            <span style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
                              <span>
                                {m?.n}
                              </span>
                              <span style={{"color":"var(--mut)"}}>
                                {m?.c}
                              </span>
                            </span>
                          </React.Fragment>))}
                        </div>
                      </>) : null}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","padding":"12px 0 6px"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Mijozga kotirovka"}
                        </span>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"so'm"}
                        </span>
                      </div>
                      {(v.quote || []).map((r, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
                          <span style={{"display":"flex","flexDirection":"column","minWidth":"0"}}>
                            <span style={{"fontWeight":"700"}}>
                              {r?.name}
                            </span>
                            <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                              {r?.dim}{" · "}{r?.n}{" dona"}
                            </span>
                          </span>
                          <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                            {r?.p}
                          </span>
                        </div>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
                      <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
                        {"Sex tannarxi"}
                      </div>
                      {(v.costRows || []).map((r, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
                          <span style={{"display":"flex","flexDirection":"column"}}>
                            <span style={{"fontWeight":"700"}}>
                              {r?.name}
                            </span>
                            <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                              {r?.q}
                            </span>
                          </span>
                          <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                            {r?.p}
                          </span>
                        </div>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"10px"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Raskroy · "}{v.rk?.n}{"-varaq"}
                        </span>
                        <div style={{"display":"flex","gap":"6px"}}>
                          <button onClick={v.rkPrev} aria-label="Oldingi varaq" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
                            {"←"}
                          </button>
                          <button onClick={v.rkNext} aria-label="Keyingi varaq" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
                            {"→"}
                          </button>
                        </div>
                      </div>
                      <div style={{"position":"relative","width":"100%","aspectRatio":"2800/2070","borderRadius":"8px","background":"repeating-linear-gradient(135deg,#2A4D57 0 6px,#244550 6px 12px)","border":"1px solid var(--line)","overflow":"hidden"}}>
                        {(v.rk?.rects || []).map((r, $index) => (<React.Fragment key={$index}>
                          <div style={{"position":"absolute","left":r?.l,"top":r?.t,"width":r?.w,"height":r?.h,"background":r?.c,"borderRadius":"2px","opacity":".92"}}></div>
                        </React.Fragment>))}
                      </div>
                      <div style={{"display":"flex","gap":"4px","justifyContent":"center"}}>
                        {(v.rk?.dots || []).map((d, $index) => (<React.Fragment key={$index}>
                          <span style={{"width":d?.w,"height":"6px","borderRadius":"9px","background":d?.c,"transition":"all .2s"}}></span>
                        </React.Fragment>))}
                      </div>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                        <span style={{"fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                          {"6 varaq · 82 detal · isrof 9%"}
                        </span>
                        <button onClick={v.openParams} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)"}}>
                          {"⚙️ Parametrlar"}
                        </button>
                      </div>
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
                      <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
                        {"Detallar ro'yxati"}
                      </div>
                      {(v.detGroups || []).map((g, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
                          <span style={{"fontWeight":"700"}}>
                            {g?.n}
                          </span>
                          <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                            {g?.c}
                          </span>
                        </div>
                      </React.Fragment>))}
                    </div>
                    <button onClick={v.goStep4} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
                      {"Keyingi: Fayllar →"}
                    </button>
                  </>) : null}
                  {v.isS4 ? (<>
                    <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                        {"④ Qadam"}
                      </span>
                      <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                        {"Fayllar"}
                      </h2>
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"8px"}}>
                      <span style={{"fontWeight":"800"}}>
                        {"Tekshiruv"}
                      </span>
                      <span style={{"display":"flex","gap":"10px","fontSize":"14px"}}>
                        <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                          {"✓"}
                        </span>
                        {"82 detal 6 varaqqa sig'di"}
                      </span>
                      <span style={{"display":"flex","gap":"10px","fontSize":"14px"}}>
                        <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                          {"✓"}
                        </span>
                        {"Hamma o'lcham modul chegarasida"}
                      </span>
                      <span style={{"display":"flex","gap":"10px","fontSize":"14px","color":"var(--danger)"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"⚠️"}
                        </span>
                        {"12 ta zapchastning narxi yo'q"}
                      </span>
                    </div>
                    {(v.fileGroups || []).map((g, $index) => (<React.Fragment key={$index}>
                      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","padding":"18px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                          <span style={{"fontSize":"13px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":g?.col}}>
                            {g?.title}
                          </span>
                          <span style={{"fontSize":"12px","color":"var(--mut)"}}>
                            {g?.sub}
                          </span>
                        </div>
                        <button onClick={g?.main} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
                          {g?.mainLabel}
                        </button>
                        <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","alignSelf":"center"}}>
                            {"Yana:"}
                          </span>
                          {(g?.more || []).map((m, $index) => (<React.Fragment key={$index}>
                            <button onClick={m?.go} disabled={m?.dis} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","minHeight":"34px","background":"var(--sfc2)","color":m?.c,"fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","cursor":m?.cur}}>
                              {m?.label}
                            </button>
                          </React.Fragment>))}
                        </div>
                      </div>
                    </React.Fragment>))}
                  </>) : null}
                </aside>
              </div>
            </>) : null}
          </div>
        </>) : null}
        {v.aiOpen ? (<>
          <div onClick={v.closeAi} style={{"position":"fixed","inset":"0","zIndex":"60","background":"rgba(4,12,15,.55)"}}></div>
          <div style={{"position":"fixed","left":"50%","bottom":"0","zIndex":"61","transform":"translateX(-50%)","width":"min(640px,100%)","background":"var(--sfc)","border":"1px solid var(--line)","borderBottom":"0","borderRadius":"28px 28px 0 0","padding":"12px 20px 24px","display":"flex","flexDirection":"column","gap":"14px","boxShadow":"0 -20px 60px rgba(0,0,0,.4)"}}>
            <span style={{"alignSelf":"center","width":"44px","height":"5px","borderRadius":"9px","background":"var(--sfc3)"}}></span>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"✨ AI'ga aytib bering"}
              </span>
              <button onClick={v.closeAi} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                {"×"}
              </button>
            </div>
            <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder="oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf" style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"none","outline":"none"}}></textarea>
            <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
              {(v.aiEx || []).map((x, $index) => (<React.Fragment key={$index}>
                <button onClick={x?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600","fontSize":"13px","textAlign":"left"}}>
                  {x?.t}
                </button>
              </React.Fragment>))}
            </div>
            <div style={{"display":"flex","gap":"8px"}}>
              <button onClick={v.toggleMic} style={{"height":"52px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":v.micBg,"color":v.micT,"fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                {"🎤 "}{v.micLabel}
              </button>
              <button onClick={v.aiBuild} style={{"flex":"1","height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
                {"🪄 Qurish"}
              </button>
            </div>
          </div>
        </>) : null}
        {v.insOpen ? (<>
          <div style={{"position":"fixed","inset":"0","zIndex":"70","background":"rgba(4,12,15,.72)","backdropFilter":"blur(6px)","WebkitBackdropFilter":"blur(6px)","display":"flex","alignItems":"center","justifyContent":"center","padding":"clamp(0px,2vw,24px)"}}>
            <div style={{"width":"min(1180px,100%)","height":"min(760px,100%)","background":"var(--bg)","border":"1px solid var(--line)","borderRadius":"clamp(0px,2vw,28px)","overflow":"hidden","display":"flex","flexWrap":"wrap"}}>
              <div style={{"position":"relative","flex":"1.6 1 480px","minWidth":"0","minHeight":"360px","background":"radial-gradient(ellipse 70% 60% at 50% 45%,rgba(255,122,69,.14),transparent 70%),#0C1C22"}}>
                <div ref={v.insHost} style={{"position":"absolute","inset":"0"}}>
                  <div ref={v.insOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                </div>
                <div style={{"position":"absolute","left":"16px","top":"16px","zIndex":"3","display":"flex","flexDirection":"column","gap":"2px","pointerEvents":"none"}}>
                  <span style={{"fontSize":"13px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--acct)"}}>
                    {"Ichini ko'rish"}
                  </span>
                  <span style={{"fontSize":"22px","fontWeight":"800"}}>
                    {v.ins?.name}
                  </span>
                </div>
                <div style={{"position":"absolute","left":"16px","right":"16px","bottom":"16px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"center","padding":"10px 16px","borderRadius":"18px","background":"rgba(23,50,57,.92)","border":"1px solid var(--line)"}}>
                  <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"12px","background":"var(--sfc2)"}}>
                    <button onClick={v.insColor} style={{"height":"36px","padding":"0 12px","borderRadius":"9px","border":"0","background":v.ins?.cB,"color":v.ins?.cT,"fontWeight":"800","fontSize":"13px","cursor":"pointer"}}>
                      {"Rangli"}
                    </button>
                    <button onClick={v.insPlain} style={{"height":"36px","padding":"0 12px","borderRadius":"9px","border":"0","background":v.ins?.pB,"color":v.ins?.pT,"fontWeight":"800","fontSize":"13px","cursor":"pointer"}}>
                      {"Rangsiz"}
                    </button>
                  </div>
                  <label style={{"flex":"1 1 180px","display":"flex","flexDirection":"column"}}>
                    <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                      <span>
                        {"Sochish"}
                      </span>
                      <span style={{"color":"var(--txt)"}}>
                        {v.ins?.ex}{"%"}
                      </span>
                    </span>
                    <input type="range" min="0" max="100" value={v.ins?.ex} onChange={v.onInsEx} />
                  </label>
                </div>
              </div>
              <div style={{"flex":"1 1 320px","minWidth":"0","maxHeight":"100%","overflow":"auto","padding":"20px","display":"flex","flexDirection":"column","gap":"12px","borderLeft":"1px solid var(--line)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
                  <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                    <span style={{"padding":"2px 8px","alignSelf":"flex-start","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                      {v.ins?.code}
                    </span>
                    <span style={{"fontSize":"15px","fontWeight":"800","color":"var(--cyan)","fontVariantNumeric":"tabular-nums"}}>
                      {v.ins?.size}
                    </span>
                    {v.ins?.hasNote ? (<>
                      <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600","maxWidth":"240px"}}>
                        {v.ins?.note}
                      </span>
                    </>) : null}
                  </div>
                  <button onClick={v.closeInside} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto"}}>
                    {"×"}
                  </button>
                </div>
                <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"8px"}}>
                  <div style={{"background":"var(--sfc)","borderRadius":"16px","padding":"12px"}}>
                    <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--acct)","lineHeight":"1.1","fontVariantNumeric":"tabular-nums"}}>
                      {v.ins?.detal}
                    </div>
                    <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                      {"detal"}
                    </div>
                  </div>
                  <div style={{"background":"var(--sfc)","borderRadius":"16px","padding":"12px"}}>
                    <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--acct)","lineHeight":"1.1","fontVariantNumeric":"tabular-nums"}}>
                      {v.ins?.zap}
                    </div>
                    <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                      {"zapchast"}
                    </div>
                  </div>
                </div>
                <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 14px 8px"}}>
                  {(v.ins?.list || []).map((r, $index) => (<React.Fragment key={$index}>
                    <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
                      <span>
                        <span style={{"color":"var(--mut)"}}>
                          {r?.n}{"×"}
                        </span>
                        {" "}
                        <span style={{"fontWeight":"700"}}>
                          {r?.name}
                        </span>
                      </span>
                      <span style={{"fontWeight":"700","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                        {r?.dim}
                      </span>
                    </div>
                  </React.Fragment>))}
                </div>
                <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                  {(v.ins?.hw || []).map((h, $index) => (<React.Fragment key={$index}>
                    <span style={{"padding":"5px 10px","borderRadius":"999px","background":"var(--sfc)","fontSize":"12px","fontWeight":"700"}}>
                      {h?.name}{" "}
                      <span style={{"color":"var(--acct)"}}>
                        {"×"}{h?.cnt}
                      </span>
                    </span>
                  </React.Fragment>))}
                </div>
              </div>
            </div>
          </div>
        </>) : null}
        {v.cf?.on ? (<>
          <div style={{"position":"fixed","inset":"0","zIndex":"80","background":"rgba(4,12,15,.6)","display":"grid","placeItems":"center","padding":"16px"}}>
            <div role="dialog" style={{"width":"min(420px,100%)","background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 30px 80px rgba(0,0,0,.5)"}}>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {v.cf?.title}
              </span>
              <span style={{"color":"var(--mut)"}}>
                {v.cf?.text}
              </span>
              <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end","paddingTop":"8px"}}>
                <button onClick={v.cfNo} style={{"height":"48px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","cursor":"pointer"}}>
                  {"Bekor"}
                </button>
                <button onClick={v.cfYes} style={{"height":"48px","padding":"0 18px","borderRadius":"14px","border":"0","background":v.cf?.bg,"color":v.cf?.c,"fontWeight":"800","cursor":"pointer"}}>
                  {v.cf?.ok}
                </button>
              </div>
            </div>
          </div>
        </>) : null}
        {v.hasToast ? (<>
          <div role="status" style={{"position":"fixed","left":"50%","bottom":"92px","zIndex":"90","transform":"translateX(-50%)","maxWidth":"calc(100% - 32px)","padding":"12px 18px","borderRadius":"14px","background":"var(--txt)","color":"var(--bg)","fontWeight":"800","fontSize":"14px","boxShadow":"0 16px 40px rgba(0,0,0,.4)"}}>
            {v.toast}
          </div>
        </>) : null}
      </div>
      </>
    );
  }
}
