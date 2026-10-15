import React from 'react';
import Header from './sections/Header.jsx';
import Hero from './sections/Hero.jsx';
import Kimlar from './sections/Kimlar.jsx';
import Demo from './sections/Demo.jsx';
import Qanday from './sections/Qanday.jsx';
import Imkoniyatlar from './sections/Imkoniyatlar.jsx';
import Savollar from './sections/Savollar.jsx';
import Royxat from './sections/Royxat.jsx';
import Footer from './sections/Footer.jsx';
import { report } from '../shared/lib/jurnal.js';
import { s3Load, s3Box, s3cl, s3f1, s3Spec, s3Mats, s3Label, s3Viewer, s3Clear, s3Build, s3Apply, S3_STEPS } from '../shared/design3d/engine.js';

export default class Landing extends React.Component {
  state={menu:false,mod:'kp',W:600,ui:{explode:0,color:0,count:0,phase:-1},sel:null,faq:-1,seen:{},loaded:false,sv:{step:-1,c:0,p:0}};
  miniHost=React.createRef();miniOv=React.createRef();storyHost=React.createRef();storyOv=React.createRef();demoHost=React.createRef();demoOv=React.createRef();storyP=0;
  a={color:0,explode:0,hw:0,count:0};tg={color:0,explode:0,hw:0,count:0};
  componentDidMount(){this.dead=false;
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;document.body.style.background='#0F2229';
    this.setupReveal();
    this.onScroll=()=>{const st=document.getElementById('hero');if(st){const r=st.getBoundingClientRect();this.storyP=s3cl(-r.top/Math.max(1,r.height-window.innerHeight))}};
    window.addEventListener('scroll',this.onScroll,{passive:true});this.onScroll();
    s3Load().then(T=>{if(this.dead)return;this.T=T;
      try{this.initStory()}catch(e){report('S3D-SCENE-102',{modul:'landing/hero',err:e})}
      try{this.initDemo()}catch(e){report('S3D-SCENE-102',{modul:'landing/demo',err:e});this.demoFallback()}
      this.setState({loaded:true})}).catch(e=>{report('S3D-SCENE-102',{modul:'landing',xabar:'three.js yuklanmadi',err:e});this.setState({loaded:true});this.demoFallback()});
  }
  componentWillUnmount(){this.dead=true;this.mini&&this.mini.dispose();window.removeEventListener('scroll',this.onScroll);this.story&&this.story.dispose();this.demo&&this.demo.dispose();this.rvIO&&this.rvIO.disconnect();this.dIO&&this.dIO.disconnect()}
  goApp(screen,extra){const q=new URLSearchParams({s:screen,...(extra||{})});const u=new URL('app.html',location.href);u.hash=q.toString();
    try{sessionStorage.setItem('s3d-handoff',q.toString())}catch(_){}location.href=u.href}
  componentDidUpdate(){if(this._lastSel!==this.state.sel){this._lastSel=this.state.sel;this.syncMini()}}
  syncMini(){const T=this.T,h=this.miniHost.current,gr=this.state.sel?this.selGr:null;
    if(this.mini&&(!gr||this.mini.host!==h||this.mini.gr!==gr)){this.mini.dispose();this.mini=null}
    if(!T||!h||!gr||this.mini)return;
    try{const v=s3Viewer(T,h,this.miniOv.current);this.mini=v;v.gr=gr;v.M=s3Mats(T,null,null);v.grid.visible=false;v.shadow.visible=false;
      const p=gr.userData.p,s=p.size.map(x=>x/1000),geo=s3Box(T,s[0],s[1],s[2]),g=new T.Group();
      g.add(new T.Mesh(geo,v.M[p.mat]()),new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:0xFF7A45})));v.root.add(g);
      v.target.set(0,0,0);v.dist=Math.max(...s)*2.5+.12;const tn=s.indexOf(Math.min(...s));v.phi=tn===1?.9:.32;v.theta=tn===0?1.05:-.5;v.auto=true;
      const an=(x,y,z)=>{const o=new T.Object3D();o.position.set(x,y,z);g.add(o);return o};
      if(p.size[0]>=30)s3Label(v,p.size[0]+'','',an(0,-s[1]/2-.02,s[2]/2+.02),'dim').op=1;
      if(p.size[1]>=30)s3Label(v,p.size[1]+'','',an(s[0]/2+.03,0,s[2]/2),'dim').op=1;
      if(p.size[2]>=30)s3Label(v,p.size[2]+'','',an(s[0]/2+.03,-s[1]/2,0),'dim').op=1;
    }catch(e){report('S3D-SCENE-102',{modul:'landing/demo',err:e})}}
  setupReveal(){const els=document.querySelectorAll('[data-rv-id]');
    this.rvIO=new IntersectionObserver(es=>{const add={};es.forEach(e=>{if(e.isIntersecting){add[e.target.getAttribute('data-rv-id')]=true;this.rvIO.unobserve(e.target)}});if(Object.keys(add).length)this.setState(s=>({seen:{...s.seen,...add}}))},{threshold:.06});
    els.forEach(e=>this.rvIO.observe(e))}
  initStory(){const T=this.T,v=s3Viewer(T,this.storyHost.current,this.storyOv.current);this.story=v;v.auto=false;v.columns=true;v.colTop=90;
    v.pC=new T.Plane(new T.Vector3(0,-1,0),0);v.pP=new T.Plane(new T.Vector3(0,1,0),0);v.M=s3Mats(T,[v.pC],[v.pP]);
    const m=s3Build(T,v,s3Spec('kp',600),false);v.thOff=0;const sa={color:1,explode:0,hw:1,count:0};let sp=this.storyP;
    v.onTick=(dt,t)=>{sp+=(this.storyP-sp)*(1-Math.exp(-dt*6));const io0=s3cl(1-sp/.07),p=sp,g=(a,b)=>s3cl((p-a)/(b-a)),mob=window.innerWidth<1100;
      sa.color=s3cl(1-g(.08,.16)+g(.24,.34));sa.hw=s3cl(1-g(.08,.14)+g(.55,.64));sa.explode=Math.min(g(.38,.5),1-g(.84,.96));sa.count=g(.68,.8);
      const base=-.75+p*3.1+(this.reduced?0:Math.sin(t*.35)*.12);if(v.isDown())v.thOff=v.theta-base;else v.theta=base+v.thOff;
      v.phi=.2+Math.sin(p*Math.PI)*.26;v.dist=(mob?4.4:3.1)+sa.explode*.7;
      v.target.set(mob?0:-.42+sa.explode*.08,mob?.95-sa.explode*.5*(1-io0):.36,0);
      v.colL=mob?8:Math.min(500,window.innerWidth*.36);v.colBot=mob?Math.round(window.innerHeight*.5):40;s3Apply(v,m,sa);
      const step=p<.08?-1:p<.24?0:p<.38?1:p<.55?2:p<.68?3:p<.84?4:5,c=Math.round(sa.count*100)/100,pp=Math.round(p*200)/200;
      const ss=this.state.sv;if(ss.step!==step||ss.c!==c||ss.p!==pp)this.setState({sv:{step,c,p:pp}})}}
  initDemo(){const T=this.T,v=s3Viewer(T,this.demoHost.current,this.demoOv.current);this.demo=v;v.columns=true;v.colTop=64;v.colBot=40;
    v.pC=new T.Plane(new T.Vector3(0,-1,0),0);v.pP=new T.Plane(new T.Vector3(0,1,0),0);v.M=s3Mats(T,[v.pC],[v.pP]);
    this.buildMod();v.onTick=(dt,t)=>this.demoTick(dt,t);v.onClick=(x,y)=>this.pick(x,y);
    this.dIO=new IntersectionObserver(es=>{if(es[0].isIntersecting&&!this.played){this.played=true;if(this.props.autoplay??true)this.play();else this.finish()}},{threshold:.4});
    this.dIO.observe(this.demoHost.current)}
  demoFallback(){this.demo=null;this.cur=null;this.setState(s=>({ui:{...s.ui,count:1,color:1,phase:6}}))}
  finish(){Object.assign(this.tg,{color:1,explode:0,hw:1,count:1});this.scen=null;this.setState(s=>({ui:{...s.ui,color:1,phase:6}}))}
  play(){if(!this.demo){this.demoFallback();return}if(this.reduced){Object.assign(this.a,{color:1,explode:0,hw:1,count:1});this.finish();return}
    this.highlight(null);Object.assign(this.a,{color:0,explode:0,hw:0,count:0});Object.assign(this.tg,this.a);this.scen={t0:performance.now()/1000}}

  buildMod(){const v=this.demo;if(!v)return;if(this.cur)s3Clear(v,this.cur);this.selGr=null;
    this.cur=s3Build(this.T,v,s3Spec(this.state.mod,this.state.W),this.state.theme==='light');this.demoTick(0,performance.now()/1000)}
  demoTick(dt,t){const v=this.demo,a=this.a,tg=this.tg,m=this.cur;if(!m)return;let phase=this.state.ui.phase;
    if(this.scen){const e=t-this.scen.t0;tg.color=e>1.5?1:0;tg.explode=(e>2.7&&e<8.8)?1:0;tg.hw=e>4.2?1:0;tg.count=e>5.4?1:0;
      phase=e<1.5?0:e<2.7?1:e<4.2?2:e<5.4?3:e<8.8?4:5;if(e>10.4){this.scen=null;phase=6}}
    const k=dt?1-Math.exp(-dt*4.5):1;for(const key in tg)a[key]+=(tg[key]-a[key])*k;
    s3Apply(v,m,a);
    if(t-(this.lastUi||0)>.05){const ex=Math.round(a.explode*100),c=Math.round(a.count*1000)/1000,u=this.state.ui;
      if(u.explode!==ex||Math.abs(u.count-c)>.0005||u.phase!==phase||u.color!==tg.color){this.lastUi=t;this.setState({ui:{explode:ex,count:c,phase,color:tg.color}})}}}
  pick(x,y){const T=this.T,v=this.demo;if(!this.cur)return;if(!this.ray)this.ray=new T.Raycaster();this.ray.setFromCamera(new T.Vector2(x,y),v.cam);
    const hit=this.ray.intersectObjects(this.cur.pick,false)[0];this.highlight(hit?hit.object.userData.gr:null)}
  highlight(gr){if(this.cur)this.cur.focus=gr||null;if(this.selGr){this.selGr.userData.mat.emissive.set(0x000000);this.selGr.userData.em.color.set(0x2B3160)}
    this.selGr=gr;if(!gr){if(this.state.sel)this.setState({sel:null});return}
    gr.userData.mat.emissive.set(0x8a3000);gr.userData.mat.emissiveIntensity=.22;gr.userData.em.color.set(0xFF7A45);
    const p=gr.userData.p;this.setState({sel:{name:p.name,dim:p.dim?p.dim+' mm':'—',mat:{ldsp:'LDSP 16 mm',wood:"LDSP 16 mm · yog'och dekor",hdf:'HDF 3 mm'}[p.mat],edge:p.edge||'—',n:p.n+' dona'}})}

  setColor(c){this.scen=null;this.tg.color=c;if(this.a.explode>.3)this.tg.hw=1;this.tg.count=1;this.setState(s=>({ui:{...s.ui,color:c,phase:6}}))}
  setExplode(e){this.scen=null;const x=e/100;this.tg.explode=x;this.a.explode=x;this.tg.hw=1;this.tg.count=1;this.setState(s=>({ui:{...s.ui,explode:e,phase:6}}))}
  setW(W){this.scen=null;Object.assign(this.tg,{hw:1,count:1});this.a.count=1;this.setState(s=>({W,sel:null,ui:{...s.ui,count:1,phase:6}}),()=>this.buildMod())}
  setMod(m){if(m===this.state.mod)return;this.setState({mod:m,W:600,sel:null},()=>{this.buildMod();this.play()})}
  goDemo(){const el=document.getElementById('demo');if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-72,behavior:'smooth'});if(this.played)setTimeout(()=>this.play(),600)}

  renderVals(){const s=this.state,u=s.ui,spec=s3Spec(s.mod,s.W),c=u.count,st=spec.stats,sv=s.sv;
    const rv=k=>s.seen[k]?'1':'0';
    const tabB=k=>s.mod===k?'var(--acc)':'var(--sfc)',tabT=k=>s.mod===k?'var(--ink)':'var(--txt)';
    const ph={};for(let i=0;i<6;i++){const p=u.phase;ph['b'+i]=p===i?'var(--acc)':(p>i&&p<6)?'var(--sfc2)':'var(--bg)';ph['t'+i]=p===i?'var(--ink)':(p>i&&p<6)?'var(--txt)':'var(--mut)'}
    const fq={};for(let i=0;i<5;i++){const o=s.faq===i;fq['t'+i]=()=>this.setState({faq:o?-1:i});fq['r'+i]=o?'1fr':'0fr';fq['x'+i]=o?'rotate(45deg)':'none'}
    const io=s3cl(1-sv.p/.07),k=s3Spec('kp',600).stats,si=Math.max(0,sv.step);
    return {
      goLogin:e=>{e.preventDefault();this.goApp('login')},goReg:e=>{e.preventDefault();this.goApp('reg')},
      goRegMod:e=>{e.preventDefault();this.goApp('reg',{mod:spec.code,w:spec.W})},
      menu:s.menu,toggleMenu:()=>this.setState({menu:!s.menu}),closeMenu:()=>this.setState({menu:false}),
      miniHost:this.miniHost,miniOv:this.miniOv,storyHost:this.storyHost,storyOv:this.storyOv,demoHost:this.demoHost,demoOv:this.demoOv,notLoaded:!s.loaded,
      st:{io:io.toFixed(3),it:'translateY('+(-(1-io)*60).toFixed(1)+'px)',co:(1-io).toFixed(3),ct:'translateY('+(io*30).toFixed(1)+'px)',
        n:'0'+(si+1),title:S3_STEPS[si][0],text:S3_STEPS[si][1],
        c:{detal:Math.round(k.detal*sv.c),zap:Math.round(k.zap*sv.c),krom:s3f1(k.krom*sv.c),area:s3f1(k.area*sv.c)},
        bars:[0,1,2,3,4,5].map(i=>({c:i<=sv.step?'var(--acc)':'var(--sfc2)'}))},
      goDemo:()=>this.goDemo(),
      rv:{s1:rv('s1'),s2:rv('s2'),s3:rv('s3'),s4:rv('s4'),s6:rv('s6'),s7:rv('s7')},
      tab:{kpB:tabB('kp'),kpT:tabT('kp'),kuB:tabB('ku'),kuT:tabT('ku'),shB:tabB('sh'),shT:tabT('sh')},
      modKP:()=>this.setMod('kp'),modKU:()=>this.setMod('ku'),modSH:()=>this.setMod('sh'),
      spec,size:spec.W+'×'+spec.D+'×'+spec.H+' mm',
      seg:{cB:u.color?'var(--acc)':'transparent',cT:u.color?'var(--ink)':'var(--mut)',pB:u.color?'transparent':'var(--sfc)',pT:u.color?'var(--mut)':'var(--txt)'},
      setColored:()=>this.setColor(1),setPlain:()=>this.setColor(0),
      explode:u.explode,onExplode:e=>this.setExplode(+e.target.value),
      W:s.W,onW:e=>this.setW(+e.target.value),isKP:s.mod==='kp',notKP:s.mod!=='kp',doorW:(s.W-4)/2,polkaW:s.W-32,
      cnt:{detal:Math.round(st.detal*c),zap:Math.round(st.zap*c),krom:s3f1(st.krom*c),area:s3f1(st.area*c)},
      ph,replay:()=>this.play(),demoNoGL:!!s.demoNoGL,
      sel:s.sel||{},hasSel:!!s.sel,closeSel:()=>this.highlight(null),fq
    }}

  render() {
    const v = this.renderVals();
    return (
      <>
      <div data-s3d="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased","overflowX":"clip"}}>
        <Header v={v} />
        <Hero v={v} />
        <Kimlar v={v} />
        <Demo v={v} />
        <Qanday v={v} />
        <Imkoniyatlar v={v} />
        <Savollar v={v} />
        <Royxat v={v} />
        <Footer v={v} />
      </div>
      </>
    );
  }
}
