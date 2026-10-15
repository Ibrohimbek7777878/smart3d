import React from 'react';
import { s3Load, s3Box, s3Spec, s3Mats, s3Label, s3Viewer, s3Build, s3Apply, s3n, S3_LIM, S3_CAT, S3_INS, s3Cat, s3NewId, s3Mk, s3Default, s3Price, S3_SHEETS, S3_TIPS, S3_PROJ, s3Thumb, s3Room } from './engine.js';
import { createSession } from '../../../app/js/auth-core.js';
import AiOyna from './modals/AiOyna.jsx';
import EditorNav from './editor/EditorNav.jsx';
import Header from './shell/Header.jsx';
import IchiniKorish from './modals/IchiniKorish.jsx';
import Kirish from './screens/Kirish.jsx';
import Loyihalar from './screens/Loyihalar.jsx';
import Onboarding from './screens/Onboarding.jsx';
import QadamFayllar from './editor/QadamFayllar.jsx';
import QadamMebel from './editor/QadamMebel.jsx';
import QadamNarx from './editor/QadamNarx.jsx';
import QadamXona from './editor/QadamXona.jsx';
import Sahna from './editor/Sahna.jsx';
import Tasdiq from './modals/Tasdiq.jsx';
import Toast from './modals/Toast.jsx';

export default class App extends React.Component {
  state={screen:'reg',f:{name:'',email:'',phone:'',pass:'',shop:'',show:false,err:{},tried:false},user:null,save:null,onbKind:'kitchen',preset:0,
    step:2,done:{1:true},room:{w:3600,d:3000,h:2700},shape:'rect',tg:{stol:true,sokol:true,dobor:false,karniz:true,moyka:true},
    mods:s3Default(),sel:null,open:{},part:null,raw:{},view:'3d',spin:false,tip:3,ai:false,aiText:'',mic:false,cf:null,toast:'',ins:null,
    insA:{ex:0,color:1},cat:'all',q:'',rk:0,miss:false,mat:{k:0,f:0},projName:'Oshxona-Aziza',pq:'',loaded:false};
  openV={};miniHost=React.createRef();miniOv=React.createRef();regHost=React.createRef();regOv=React.createRef();roomHost=React.createRef();roomOv=React.createRef();insHost=React.createRef();insOv=React.createRef();
  /* TZ-09: server bilan ishlash — app/js/auth-core.js (eski sayt bilan umumiy: kirish, avtomatik saqlash, navbat) */
  S=createSession({toast:t=>this.toastMsg(t),onState:(kind,title)=>this.setState({save:kind?{kind,title}:null}),
    onUser:(u,why)=>{this.setState({user:u});if(why==='expired'){this.toastMsg('Kirish muddati tugadi — qayta kiring');this.setState({screen:'login'})}},
    getPayload:()=>this.projectPayload(),getTotal:()=>this.projectTotal(),applyPayload:(doc,meta)=>this.applyProject(doc,meta),hasWork:()=>this.hasWork()});
  projectPayload(){return null}   // TZ-09 3–4-bosqich: haqiqiy loyiha
  projectTotal(){return 0}
  applyProject(){}
  hasWork(){return false}
  /** kirgandan keyin: saytdan modul kelgan bo'lsa — muharrir, aks holda — loyihalar */
  afterAuthState(){return this.state.pending?{screen:'app',step:2,done:{1:true},tip:3,...this.applyPending(s3Default())}:{screen:'projects'}}
  /** sahifa ochilganda: saqlangan kirish kaliti hali amal qiladimi */
  async initSession(){const S=this.S;if(!S.loggedIn)return;
    this.setState({user:S.user});
    const go=()=>{if(this.state.screen==='reg'||this.state.screen==='login')this.setState(this.afterAuthState())};
    try{const r=await S.api('/api/me');
      if(r.status===401||r.status===404){S.logout(true);return}
      if(r.ok)this.setState({user:{...S.user,...(await r.json())}});
      go()}
    catch(_){go()}}   // internet yo'q — kirgan holat saqlanadi
  componentDidMount(){this.dead=false;document.body.style.background='#0F2229';this.readHandoff();this.initSession();
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
    /* shu qurilmada avval kirilgan bo'lsa — kirish oynasi, email tayyor (dizayndagi xatti-harakat, haqiqiy akkaunt bilan) */
    let last='';try{last=localStorage.getItem('s3d-last-email')||''}catch(_){}
    if(last&&s==='reg'&&!mod){st.screen='login'}
    if(last)st.f={...this.state.f,email:last};
    this.setState(st,()=>{if(this.S.loggedIn&&(this.state.screen==='reg'||this.state.screen==='login'))this.setState(this.afterAuthState())})}
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
  /* TZ-09 Q2: email + parol (server: /api/register, /api/login). SMS (TZ-07) auth-core.js da tayyor — Eskiz kelgach yoqiladi */
  async submitAuth(){const s=this.state,f=s.f,reg=s.screen==='reg',e={},em=f.email.trim();
    if(reg&&!f.name.trim())e.name='Ismingizni yozing';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))e.email='Emailni to\'g\'ri yozing';
    if(reg&&f.phone.length!==9)e.phone='Telefon 9 raqam bo\'lishi kerak';
    if(f.pass.length<8)e.pass='Parol kamida 8 belgi';
    if(Object.keys(e).length){this.setState({f:{...f,err:e,tried:true}});return}
    if(this.authBusy)return;this.authBusy=true;
    const j=reg?await this.S.register({email:em,password:f.pass,name:f.name.trim(),phone:'998'+f.phone,shop:f.shop.trim()})
               :await this.S.login(em,f.pass);
    this.authBusy=false;
    if(!j.ok){
      if(j.status===0){this.toastMsg('Server bilan aloqa yo\'q — internetni tekshiring');return}
      const t=String(j.error||'');
      if(j.status===409)(/telefon/i.test(t)?e.phone='Bu raqam bilan akkaunt bor — kirish':e.email='Bu email bilan akkaunt bor — kirish');
      else if(j.status===401)e.pass='Email yoki parol noto\'g\'ri';
      else if(/parol/i.test(t))e.pass=t;else if(/telefon/i.test(t))e.phone=t;else if(/ism/i.test(t))e.name=t;else e.email=t;
      this.setState({f:{...f,err:e,tried:true}});return}
    try{localStorage.setItem('s3d-last-email',em)}catch(_){}
    const name=(j.user&&j.user.name)||f.name;
    this.setState({f:{...f,name,pass:'',err:{}},user:j.user});
    if(!reg&&this.state.pending){this.setState(this.afterAuthState());return}
    this.setState({screen:reg?'onb1':'projects'})}
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
      f:{title:reg?'Ro\'yxatdan o\'tish':'Kirish',sub:reg?'1 daqiqa. Keyin birinchi loyihangizni chizasiz.':'Email va parolingiz bilan.',
        cta:reg?'Ro\'yxatdan o\'tish':'Kirish',alt:reg?'Akkauntingiz bormi?':'Akkaunt yo\'qmi?',altCta:reg?'Kirish':'Ro\'yxatdan o\'tish',
        name:f.name,email:f.email,eEmail:!!e.email,eEmailt:e.email||'',bEmail:bd('email'),passAuto:reg?'new-password':'current-password',phone:fmt(f.phone),pass:f.pass,shop:f.shop,passType:f.show?'text':'password',eye:f.show?'🙈':'👁',
        bars:[1,2,3,4].map(i=>({c:i<=sc?scC:'var(--sfc2)'})),strength:['','Zaif','O\'rtacha','Yaxshi','Kuchli'][sc],
        eName:!!e.name,eNamet:e.name||'',ePhone:!!e.phone,ePhonet:e.phone||'',ePass:!!e.pass,ePasst:e.pass||'',bName:bd('name'),bPhone:bd('phone'),bPass:bd('pass')},
      onName:ev=>this.setState({f:{...f,name:ev.target.value}}),onEmail:ev=>this.setState({f:{...f,email:ev.target.value}}),onShop:ev=>this.setState({f:{...f,shop:ev.target.value}}),
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
      projName:s.projName,onProjName:ev=>this.setState({projName:ev.target.value}),initials:(()=>{const u=s.user||{},nm=String(u.name||f.name||'').trim();return (nm?nm.split(/\s+/).map(w=>w[0]).join('').slice(0,2):String(u.email||'').slice(0,2)||'•').toUpperCase()})(),
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
      dup:()=>{const c={...sm,id:s3NewId(),off:0,warn:''};const i=mods.indexOf(sm);const nm=[...mods];nm.splice(i+1,0,c);this.setState({mods:nm,sel:c.id});this.toastMsg('Nusxa qo\'shildi')},
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
        <Kirish v={v} />
        <Onboarding v={v} />
        {v.inShell ? (<>
          <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
            <Header v={v} />
            <Loyihalar v={v} />
            {v.isEditor ? (<>
              <div data-ed="" style={{"flex":"1 1 auto","height":"calc(100vh - 64px)","display":"grid","gridTemplateColumns":"200px minmax(0,1fr) 400px"}}>
                <EditorNav v={v} />
                <Sahna v={v} />
                <aside data-panel="" style={{"height":"100%","overflow":"auto","borderLeft":"1px solid var(--line)","background":"var(--bg)","padding":"20px","display":"flex","flexDirection":"column","gap":"16px"}}>
                  <QadamXona v={v} />
                  <QadamMebel v={v} />
                  <QadamNarx v={v} />
                  <QadamFayllar v={v} />
                </aside>
              </div>
            </>) : null}
          </div>
        </>) : null}
        <AiOyna v={v} />
        <IchiniKorish v={v} />
        <Tasdiq v={v} />
        <Toast v={v} />
      </div>
      </>
    );
  }
}
