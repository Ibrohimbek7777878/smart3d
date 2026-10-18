import React from 'react';
import { s3Load, s3Box, s3cl, s3f1, s3Spec, s3Mats, s3Label, s3Viewer, s3Clear, s3Build, s3Apply, S3_STEPS } from './engine.js';

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
      try{this.initStory()}catch(e){console.warn('story 3D unavailable',e)}
      try{this.initDemo()}catch(e){console.warn('demo 3D unavailable',e);this.demoFallback()}
      this.setState({loaded:true})}).catch(e=>{console.warn('three load failed',e);this.setState({loaded:true});this.demoFallback()});
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
    }catch(e){console.warn('mini 3D',e)}}
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
        <header style={{"position":"sticky","top":"0","zIndex":"50","height":"64px","background":"rgba(15,34,41,.78)","backdropFilter":"blur(16px)","WebkitBackdropFilter":"blur(16px)","borderBottom":"1px solid var(--line)"}}>
          <div style={{"maxWidth":"1280px","height":"100%","margin":"0 auto","padding":"0 clamp(16px,4vw,32px)","display":"flex","alignItems":"center","gap":"16px"}}>
            <a href="#hero" style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--txt)"}}>
              <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"18px"}}>
                {"3D"}
              </div>
              <div style={{"display":"flex","flexDirection":"column","lineHeight":"1.05"}}>
                <span style={{"fontWeight":"800","fontSize":"19px","letterSpacing":"-.02em","color":"var(--txt)"}}>
                  {"Smart3D"}
                </span>
                <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
                  {"by Bittada"}
                </span>
              </div>
            </a>
            <nav data-desk="" style={{"display":"flex","gap":"4px","margin":"0 auto"}}>
              <a href="#kimlar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h0">
                {"Kimlar uchun"}
              </a>
              <a href="#demo" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h1">
                {"3D demo"}
              </a>
              <a href="#qanday" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h2">
                {"Qanday ishlaydi"}
              </a>
              <a href="#imkoniyatlar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h3">
                {"Fayllar"}
              </a>
              <a href="#savollar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h4">
                {"Savollar"}
              </a>
            </nav>
            <div style={{"display":"flex","gap":"8px","alignItems":"center","marginLeft":"auto"}}>
              <a data-desk="" href="app.html#login" onClick={v.goLogin} style={{"height":"44px","padding":"0 18px","borderRadius":"14px","display":"flex","alignItems":"center","whiteSpace":"nowrap","color":"var(--txt)","fontWeight":"700","fontSize":"15px","border":"1px solid var(--line)"}} className="h5">
                {"Kirish"}
              </a>
              <a href="app.html#reg" onClick={v.goReg} style={{"height":"44px","padding":"0 20px","borderRadius":"14px","display":"flex","alignItems":"center","whiteSpace":"nowrap","color":"var(--ink)","fontWeight":"800","fontSize":"15px","background":"var(--acc)"}} className="h6">
                {"Ro'yxatdan o'tish"}
              </a>
              <button data-mob="" onClick={v.toggleMenu} aria-label="Menyu" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"18px","cursor":"pointer"}}>
                {"☰"}
              </button>
            </div>
          </div>
          {v.menu ? (<>
            <div data-mob="" style={{"background":"var(--bg)","borderBottom":"1px solid var(--line)","padding":"8px 16px 16px","display":"flex","flexDirection":"column","gap":"2px"}}>
              <a href="#kimlar" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
                {"Kimlar uchun"}
              </a>
              <a href="#demo" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
                {"3D demo"}
              </a>
              <a href="#qanday" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
                {"Qanday ishlaydi"}
              </a>
              <a href="#savollar" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
                {"Savollar"}
              </a>
              <a href="app.html#login" onClick={v.goLogin} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
                {"Kirish"}
              </a>
            </div>
          </>) : null}
        </header>
        <section id="hero" style={{"position":"relative","height":"520vh","marginTop":"-64px"}}>
          <div style={{"position":"sticky","top":"0","height":"100vh","overflow":"hidden","background":"radial-gradient(ellipse 60% 55% at 66% 52%,rgba(255,122,69,.16),transparent 70%),radial-gradient(ellipse 50% 50% at 20% 80%,rgba(95,225,196,.10),transparent 70%),var(--bg)"}}>
            <div ref={v.storyHost} style={{"position":"absolute","inset":"0"}}>
              <div ref={v.storyOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
            </div>
            {v.notLoaded ? (<>
              <div style={{"position":"absolute","right":"clamp(16px,8vw,120px)","top":"50%","zIndex":"1","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
                {"3D yuklanmoqda…"}
              </div>
            </>) : null}
            <div style={{"position":"absolute","inset":"64px 0 0","zIndex":"3","pointerEvents":"none","opacity":v.st?.io,"transform":v.st?.it}}>
              <div style={{"maxWidth":"1280px","height":"100%","margin":"0 auto","padding":"clamp(24px,6vh,72px) clamp(16px,4vw,32px)","display":"flex","flexDirection":"column","justifyContent":"center","gap":"24px"}}>
                <div style={{"display":"flex","flexDirection":"column","gap":"22px","maxWidth":"600px"}}>
                  <span style={{"alignSelf":"flex-start","padding":"7px 14px","borderRadius":"999px","border":"1px solid var(--line)","background":"rgba(23,50,57,.7)","fontSize":"13px","fontWeight":"700","color":"var(--cyan)"}}>
                    {"Mebel ustalari · dizaynerlar · Bazischilar uchun"}
                  </span>
                  <h1 style={{"margin":"0","fontSize":"clamp(38px,5.4vw,72px)","lineHeight":"1","letterSpacing":"-.045em","fontWeight":"800","textWrap":"balance"}}>
                    {"Mebelni 3D'da chizing. "}
                    <span style={{"color":"var(--acc)"}}>
                      {"Kroy, smeta va stanok fayli"}
                    </span>
                    {" o'zi chiqadi."}
                  </h1>
                  <p style={{"margin":"0","fontSize":"clamp(16px,1.4vw,19px)","color":"var(--mut)","maxWidth":"520px","textWrap":"pretty"}}>
                    {"Zamerdan stanokkacha — bitta brauzer ilovasida, telefoningizda ham. O'rnatish shart emas."}
                  </p>
                  <div style={{"display":"flex","flexWrap":"wrap","gap":"12px","pointerEvents":"auto"}}>
                    <a href="app.html#reg" onClick={v.goReg} style={{"height":"56px","padding":"0 26px","borderRadius":"16px","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","display":"flex","alignItems":"center","transition":"transform .18s ease-out,box-shadow .18s"}} className="h7">
                      {"Ro'yxatdan o'tish"}
                    </a>
                    <button onClick={v.goDemo} style={{"height":"56px","padding":"0 24px","borderRadius":"16px","background":"rgba(23,50,57,.75)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"16px","cursor":"pointer"}} className="h8">
                      {"3D demoni ochish"}
                    </button>
                  </div>
                  <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
                    <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                      <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                        {"121"}
                      </span>
                      {" tayyor modul"}
                    </span>
                    <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                      <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                        {"17"}
                      </span>
                      {" xil fayl"}
                    </span>
                    <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                      {"O'zbek tilida AI"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{"position":"absolute","right":"clamp(16px,4vw,48px)","bottom":"28px","zIndex":"3","opacity":v.st?.io,"display":"flex","flexDirection":"column","alignItems":"center","gap":"8px","fontSize":"13px","color":"var(--mut)","fontWeight":"600","pointerEvents":"none"}}>
              <span>
                {"Aylantiring — modul ochiladi"}
              </span>
              <span style={{"width":"26px","height":"42px","borderRadius":"999px","border":"1.5px solid var(--mut)","display":"flex","justifyContent":"center","paddingTop":"8px"}}>
                <span style={{"width":"4px","height":"9px","borderRadius":"9px","background":"var(--acc)"}}></span>
              </span>
            </div>
            <div style={{"position":"absolute","left":"clamp(16px,4vw,48px)","bottom":"clamp(16px,5vh,48px)","zIndex":"3","width":"min(430px,calc(100% - 32px))","opacity":v.st?.co,"transform":v.st?.ct,"background":"rgba(23,50,57,.82)","backdropFilter":"blur(14px)","WebkitBackdropFilter":"blur(14px)","border":"1px solid var(--line)","borderRadius":"24px","padding":"clamp(18px,2.2vw,26px)","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 24px 60px rgba(0,0,0,.25)"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","fontWeight":"700","color":"var(--acct)"}}>
                  {v.st?.n}{" / 06"}
                </span>
                <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600"}}>
                  {"Pastki shkaf · MC-KP-02"}
                </span>
              </div>
              <h3 style={{"margin":"0","fontSize":"clamp(22px,2.3vw,30px)","lineHeight":"1.1","letterSpacing":"-.02em","fontWeight":"800","textWrap":"balance"}}>
                {v.st?.title}
              </h3>
              <p style={{"margin":"0","color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {v.st?.text}
              </p>
              <div style={{"display":"grid","gridTemplateColumns":"repeat(4,minmax(0,1fr))","gap":"6px"}}>
                <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
                  <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                    {v.st?.c?.detal}
                  </div>
                  <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                    {"detal"}
                  </div>
                </div>
                <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
                  <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                    {v.st?.c?.zap}
                  </div>
                  <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                    {"zapchast"}
                  </div>
                </div>
                <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
                  <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                    {v.st?.c?.krom}
                  </div>
                  <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                    {"m kromka"}
                  </div>
                </div>
                <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
                  <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                    {v.st?.c?.area}
                  </div>
                  <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                    {"m² plita"}
                  </div>
                </div>
              </div>
              <div style={{"display":"flex","gap":"4px"}}>
                {(v.st?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
                  <span style={{"flex":"1","height":"4px","borderRadius":"999px","background":b?.c}}></span>
                </React.Fragment>))}
              </div>
            </div>
          </div>
        </section>
        <section id="kimlar" data-rv-id="s1" data-rv={v.rv?.s1} style={{"maxWidth":"1280px","margin":"0 auto","padding":"clamp(72px,10vw,140px) clamp(16px,4vw,32px) clamp(64px,9vw,120px)","scrollMarginTop":"64px"}}>
          <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"28px"}}>
            <h2 style={{"margin":"0","fontSize":"clamp(32px,4.2vw,56px)","lineHeight":"1.02","letterSpacing":"-.04em","fontWeight":"800","maxWidth":"720px","textWrap":"balance"}}>
              {"Kim uchun qurilgan"}
            </h2>
            <p style={{"margin":"0","color":"var(--mut)","maxWidth":"400px","textWrap":"pretty"}}>
              {"Sexdagi ustadan tortib, mijoz oldidagi dizaynergacha — bitta loyiha, har kimga kerakli ko'rinish."}
            </p>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(280px,1fr))","gap":"14px"}}>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h9">
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
                  {"01"}
                </span>
                <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
                  {"↗"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
                  {"Mebel ustasi"}
                </span>
                <span style={{"fontSize":"15px","color":"var(--mut)"}}>
                  {"Zamerda, telefon qo'lida"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"O'lchamni kiriting — modul o'zi moslashadi"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"Mijozga joyida 3D ko'rsating"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"Smeta zapchasti bilan, bir zumda"}
                  </span>
                </span>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h10">
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
                  {"02"}
                </span>
                <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
                  {"↗"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
                  {"Dizayner"}
                </span>
                <span style={{"fontSize":"15px","color":"var(--mut)"}}>
                  {"Mijoz oldida, planshetda"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"To'liq ekranli 3D ko'rinish"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"Bir tugmada 1080p rasm"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"360° tur havolasini yuboring"}
                  </span>
                </span>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h11">
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
                  {"03"}
                </span>
                <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
                  {"↗"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
                  {"Bazischi"}
                </span>
                <span style={{"fontSize":"15px","color":"var(--mut)"}}>
                  {"Tanish mantiq — o'rnatishsiz"}
                </span>
              </div>
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"Formulali modullar, detal va raskroy"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"GibLab, DXF, G-code, Biesse, Homag"}
                  </span>
                </span>
                <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
                  <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                    {"✓"}
                  </span>
                  <span>
                    {"Brauzerda — kompyuter va telefonda"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="demo" style={{"maxWidth":"1240px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
          <div data-rv-id="s2" data-rv={v.rv?.s2} style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"24px"}}>
            <div style={{"display":"flex","flexDirection":"column","gap":"12px","maxWidth":"680px"}}>
              <span style={{"fontSize":"13px","fontWeight":"700","letterSpacing":".08em","textTransform":"uppercase","color":"var(--acct)"}}>
                {"Haqiqiy MebelCity moduli"}
              </span>
              <h2 style={{"margin":"0","fontSize":"clamp(32px,4.2vw,52px)","lineHeight":"1.05","letterSpacing":"-.035em","fontWeight":"800"}}>
                {"Modul ichida nima bor?"}
              </h2>
            </div>
            <p style={{"margin":"0","color":"var(--mut)","maxWidth":"400px","textWrap":"pretty"}}>
              {"Aylantiring, detalni bosing, enini o'zgartiring — har detal formulasi bo'yicha qayta hisoblanadi."}
            </p>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"16px","alignItems":"flex-start"}}>
            <div style={{"flex":"1.7 1 540px","minWidth":"0","display":"flex","flexDirection":"column","gap":"12px"}}>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
                <button onClick={v.modKP} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.kpB,"color":v.tab?.kpT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                  {"Pastki shkaf · 10 detal"}
                </button>
                <button onClick={v.modKU} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.kuB,"color":v.tab?.kuT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                  {"Osma shkaf · 8 detal"}
                </button>
                <button onClick={v.modSH} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.shB,"color":v.tab?.shT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                  {"Shkaf-kupe · 41 detal"}
                </button>
              </div>
              <div ref={v.demoHost} style={{"position":"relative","width":"100%","aspectRatio":"4/5","maxHeight":"660px","borderRadius":"24px","overflow":"hidden","background":"var(--sfc)","border":"1px solid var(--line)","boxShadow":"var(--shadow)"}}>
                {v.demoNoGL ? (<>
                  <div style={{"position":"absolute","inset":"0","zIndex":"1","background":"repeating-linear-gradient(135deg,var(--sfc2) 0 10px,var(--sfc) 10px 20px)","display":"grid","placeItems":"center","textAlign":"center","padding":"24px","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
                    {"3D bu qurilmada ishlamaydi"}
                    <br />
                    {"modul rasmi — sochilgan ko'rinish"}
                  </div>
                </>) : null}
                <div ref={v.demoOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                <div style={{"position":"absolute","left":"12px","top":"12px","right":"64px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"6px","pointerEvents":"none"}}>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b0,"color":v.ph?.t0,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"1 Rangsiz"}
                  </span>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b1,"color":v.ph?.t1,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"2 Rangli"}
                  </span>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b2,"color":v.ph?.t2,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"3 Sochilish"}
                  </span>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b3,"color":v.ph?.t3,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"4 Zapchast"}
                  </span>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b4,"color":v.ph?.t4,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"5 Hisob"}
                  </span>
                  <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b5,"color":v.ph?.t5,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                    {"6 Yig'ilish"}
                  </span>
                </div>
                <button onClick={v.replay} aria-label="Qayta ko'rish" style={{"position":"absolute","right":"12px","top":"12px","zIndex":"3","width":"44px","height":"44px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"18px","cursor":"pointer"}} className="h12">
                  {"↻"}
                </button>
                <div style={{"position":"absolute","left":"0","right":"0","bottom":"12px","zIndex":"1","textAlign":"center","fontSize":"12px","color":"var(--mut)","pointerEvents":"none"}}>
                  {"Sudrab aylantiring · detalni bosing"}
                </div>
                {v.hasSel ? (<>
                  <div style={{"position":"absolute","right":"12px","top":"60px","zIndex":"4","width":"min(360px,calc(100% - 24px))","maxHeight":"calc(100% - 72px)","overflow":"auto","background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","boxShadow":"0 16px 40px rgba(0,0,0,.28)","display":"flex","flexDirection":"column","gap":"10px"}}>
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
                      <span style={{"fontSize":"18px","fontWeight":"800"}}>
                        {v.sel?.name}
                      </span>
                      <button onClick={v.closeSel} aria-label="Yopish" style={{"width":"36px","height":"36px","borderRadius":"12px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","cursor":"pointer"}}>
                        {"×"}
                      </button>
                    </div>
                    <div ref={v.miniHost} style={{"position":"relative","height":"220px","flex":"0 0 auto","borderRadius":"16px","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,122,69,.16),transparent 70%),var(--bg)","border":"1px solid var(--line)"}}>
                      <div ref={v.miniOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                      <span style={{"position":"absolute","left":"10px","bottom":"8px","zIndex":"3","fontSize":"11px","color":"var(--mut)","fontWeight":"700"}}>
                        {"Detal alohida · aylantiring"}
                      </span>
                    </div>
                    <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"6px 14px","fontSize":"14px"}}>
                      <span style={{"color":"var(--mut)"}}>
                        {"Tayyor o'lcham"}
                      </span>
                      <span style={{"fontWeight":"700","fontVariantNumeric":"tabular-nums"}}>
                        {v.sel?.dim}
                      </span>
                      <span style={{"color":"var(--mut)"}}>
                        {"Material"}
                      </span>
                      <span style={{"fontWeight":"600"}}>
                        {v.sel?.mat}
                      </span>
                      <span style={{"color":"var(--mut)"}}>
                        {"Soni"}
                      </span>
                      <span style={{"fontWeight":"600"}}>
                        {v.sel?.n}
                      </span>
                      <span style={{"color":"var(--mut)"}}>
                        {"Kromka"}
                      </span>
                      <span style={{"fontWeight":"600"}}>
                        {v.sel?.edge}
                      </span>
                    </div>
                  </div>
                </>) : null}
              </div>
              <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"16px 20px","display":"flex","flexWrap":"wrap","gap":"16px 28px","alignItems":"center","boxShadow":"var(--shadow)"}}>
                <div style={{"display":"flex","padding":"4px","borderRadius":"16px","background":"var(--sfc2)","gap":"4px"}}>
                  <button onClick={v.setColored} style={{"height":"40px","padding":"0 16px","borderRadius":"12px","border":"0","background":v.seg?.cB,"color":v.seg?.cT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                    {"Rangli"}
                  </button>
                  <button onClick={v.setPlain} style={{"height":"40px","padding":"0 16px","borderRadius":"12px","border":"0","background":v.seg?.pB,"color":v.seg?.pT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                    {"Rangsiz"}
                  </button>
                </div>
                <label style={{"flex":"1 1 200px","display":"flex","flexDirection":"column","gap":"0"}}>
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"13px","color":"var(--mut)","fontWeight":"600"}}>
                    <span>
                      {"Sochish"}
                    </span>
                    <span style={{"color":"var(--txt)","fontVariantNumeric":"tabular-nums"}}>
                      {v.explode}{"%"}
                    </span>
                  </span>
                  <input type="range" min="0" max="100" step="1" value={v.explode} onChange={v.onExplode} />
                </label>
                {v.isKP ? (<>
                  <label style={{"flex":"1 1 240px","display":"flex","flexDirection":"column","gap":"0"}}>
                    <span style={{"display":"flex","justifyContent":"space-between","fontSize":"13px","color":"var(--mut)","fontWeight":"600"}}>
                      <span>
                        {"Eni · min 600 · max 1070"}
                      </span>
                      <span style={{"color":"var(--txt)","fontVariantNumeric":"tabular-nums"}}>
                        {v.W}{" mm"}
                      </span>
                    </span>
                    <input type="range" min="600" max="1070" step="10" value={v.W} onChange={v.onW} />
                    <span style={{"fontSize":"13px","color":"var(--cyan)","fontWeight":"600","fontVariantNumeric":"tabular-nums"}}>
                      {"Eshik 2 × "}{v.doorW}{" mm · Polka "}{v.polkaW}{" mm"}
                    </span>
                  </label>
                </>) : null}
                {v.notKP ? (<>
                  <span style={{"flex":"1 1 240px","fontSize":"14px","color":"var(--mut)"}}>
                    {"O'lchamni sozlash — ilovada, modul chegarasida: "}{v.spec?.lim}
                  </span>
                </>) : null}
              </div>
            </div>
            <aside style={{"flex":"1 1 300px","minWidth":"0","display":"flex","flexDirection":"column","gap":"12px"}}>
              <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"20px","display":"flex","flexDirection":"column","gap":"14px","boxShadow":"var(--shadow)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","gap":"8px","alignItems":"flex-start"}}>
                  <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                    <span style={{"fontSize":"20px","fontWeight":"800","letterSpacing":"-.01em"}}>
                      {v.spec?.name}
                    </span>
                    <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                      {v.spec?.sub}
                    </span>
                  </div>
                  <span style={{"padding":"4px 10px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","whiteSpace":"nowrap"}}>
                    {v.spec?.code}
                  </span>
                </div>
                <span style={{"fontSize":"15px","fontWeight":"700","color":"var(--cyan)","fontVariantNumeric":"tabular-nums"}}>
                  {v.size}
                </span>
                <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"8px"}}>
                  <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                    <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                      {v.cnt?.detal}
                    </div>
                    <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                      {"detal"}
                    </div>
                  </div>
                  <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                    <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                      {v.cnt?.zap}
                    </div>
                    <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                      {"zapchast"}
                    </div>
                  </div>
                  <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                    <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                      {v.cnt?.krom}
                    </div>
                    <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                      {"m kromka"}
                    </div>
                  </div>
                  <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                    <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                      {v.cnt?.area}
                    </div>
                    <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                      {"m² plita"}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"8px 20px 12px","boxShadow":"var(--shadow)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","padding":"10px 0 6px","fontSize":"12px","color":"var(--mut)","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em"}}>
                  <span>
                    {"Detal"}
                  </span>
                  <span>
                    {"O'lcham, mm"}
                  </span>
                </div>
                {(v.spec?.list || []).map((r, $index) => (<React.Fragment key={$index}>
                  <div style={{"display":"flex","justifyContent":"space-between","gap":"12px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"14px"}}>
                    <span style={{"display":"flex","gap":"8px","minWidth":"0"}}>
                      <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums","width":"22px"}}>
                        {r?.n}{"×"}
                      </span>
                      <span style={{"fontWeight":"600"}}>
                        {r?.name}
                      </span>
                    </span>
                    <span style={{"fontVariantNumeric":"tabular-nums","fontWeight":"600","whiteSpace":"nowrap"}}>
                      {r?.dim}
                    </span>
                  </div>
                </React.Fragment>))}
                <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","paddingTop":"12px","borderTop":"1px solid var(--line)"}}>
                  {(v.spec?.hwList || []).map((h, $index) => (<React.Fragment key={$index}>
                    <span style={{"padding":"5px 10px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"12px","fontWeight":"600"}}>
                      {h?.name}{" "}
                      <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                        {"×"}{h?.cnt}
                      </span>
                    </span>
                  </React.Fragment>))}
                </div>
              </div>
              <a href="app.html#reg" onClick={v.goRegMod} style={{"minHeight":"56px","borderRadius":"18px","background":"var(--acc)","color":"var(--ink)","fontWeight":"700","fontSize":"16px","display":"flex","alignItems":"center","justifyContent":"center","gap":"10px","padding":"0 20px","textAlign":"center","transition":"transform .18s ease-out"}} className="h13">
                {"Bu modulni loyihamga qo'shish →"}
              </a>
              <span style={{"fontSize":"13px","color":"var(--mut)","textAlign":"center","textWrap":"pretty"}}>
                {"Ro'yxatdan keyin modul shu o'lcham bilan yangi loyihada turadi."}
              </span>
            </aside>
          </div>
        </section>
        <section id="qanday" data-rv-id="s3" data-rv={v.rv?.s3} style={{"maxWidth":"1280px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
          <h2 style={{"margin":"0 0 24px","fontSize":"clamp(28px,3.4vw,44px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
            {"5 qadam — zamerdan stanokkacha"}
          </h2>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(200px,1fr))","gap":"12px"}}>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h14">
              <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
                {"01"}
              </span>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"Zamer"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {"Xona o'lchamini kiriting yoki AI'ga ayting"}
              </span>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h15">
              <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
                {"02"}
              </span>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"Mebel"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {"Tayyor modulni tanlang — o'lchami moslashadi"}
              </span>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h16">
              <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
                {"03"}
              </span>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"3D"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {"Mijozga ko'rsating, rasm va 360° tur yuboring"}
              </span>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h17">
              <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
                {"04"}
              </span>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"Narx"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {"Plita, kromka, zapchast — tannarx va mijoz narxi"}
              </span>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h18">
              <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
                {"05"}
              </span>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"Fayllar"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
                {"Kroy xaritasi, Excel va stanok fayli"}
              </span>
            </div>
          </div>
        </section>
        <section id="imkoniyatlar" data-rv-id="s4" data-rv={v.rv?.s4} style={{"maxWidth":"1240px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
          <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"24px"}}>
            <h2 style={{"margin":"0","fontSize":"clamp(28px,3.4vw,40px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
              {"Nimalar olasiz — "}
              <span style={{"color":"var(--acct)"}}>
                {"17 xil fayl"}
              </span>
            </h2>
            <p style={{"margin":"0","color":"var(--mut)","maxWidth":"380px"}}>
              {"Mijoz, sex va stanok uchun — bitta loyihadan."}
            </p>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(260px,1fr))","gap":"12px"}}>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h19">
              <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--cyan)","textTransform":"uppercase","letterSpacing":".08em"}}>
                {"Mijozga"}
              </span>
              <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
                {"Ko'rinishi va narxi tushunarli"}
              </span>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"3D"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"1080p rasm"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"360° tur"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"PDF hisobot"}
                </span>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h20">
              <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--lav)","textTransform":"uppercase","letterSpacing":".08em"}}>
                {"Sexga"}
              </span>
              <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
                {"Detal, kroy va smeta tayyor"}
              </span>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"Detallar ro'yxati"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"Raskroy xaritasi"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
                  {"Excel smeta"}
                </span>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h21">
              <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--acct)","textTransform":"uppercase","letterSpacing":".08em"}}>
                {"Stanokka"}
              </span>
              <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
                {"Alohida dastursiz — bir tugma"}
              </span>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"GibLab"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"DXF"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"G-code"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"Biesse"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"Homag"}
                </span>
                <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
                  {"Altendorf"}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="savollar" data-rv-id="s6" data-rv={v.rv?.s6} style={{"maxWidth":"880px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
          <h2 style={{"margin":"0 0 24px","fontSize":"clamp(28px,3.4vw,40px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
            {"Savollar"}
          </h2>
          <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
              <button onClick={v.fq?.t0} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
                {"Bazis kerakmi?"}
                <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x0,"transition":"transform .2s ease-out"}}>
                  {"+"}
                </span>
              </button>
              <div style={{"display":"grid","gridTemplateRows":v.fq?.r0,"transition":"grid-template-rows .25s ease-out"}}>
                <div style={{"overflow":"hidden"}}>
                  <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                    {"Yo'q, brauzerda ishlaydi. O'rnatish shart emas."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
              <button onClick={v.fq?.t1} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
                {"Telefonda ishlaydimi?"}
                <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x1,"transition":"transform .2s ease-out"}}>
                  {"+"}
                </span>
              </button>
              <div style={{"display":"grid","gridTemplateRows":v.fq?.r1,"transition":"grid-template-rows .25s ease-out"}}>
                <div style={{"overflow":"hidden"}}>
                  <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                    {"Ha, 360 px ekrandan boshlab tekshirilgan — 7 xil qurilmada."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
              <button onClick={v.fq?.t2} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
                {"Narxlar qayerdan olinadi?"}
                <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x2,"transition":"transform .2s ease-out"}}>
                  {"+"}
                </span>
              </button>
              <div style={{"display":"grid","gridTemplateRows":v.fq?.r2,"transition":"grid-template-rows .25s ease-out"}}>
                <div style={{"overflow":"hidden"}}>
                  <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                    {"ERP katalogidagi haqiqiy narxdan — 1 281 plita va 1 978 zapchast, haqiqiy SKU bilan. Narx yo'q bo'lsa, \"narx yo'q\" deb ochiq ko'rsatiladi."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
              <button onClick={v.fq?.t3} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
                {"Internetsiz ishlaydimi?"}
                <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x3,"transition":"transform .2s ease-out"}}>
                  {"+"}
                </span>
              </button>
              <div style={{"display":"grid","gridTemplateRows":v.fq?.r3,"transition":"grid-template-rows .25s ease-out"}}>
                <div style={{"overflow":"hidden"}}>
                  <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                    {"Ochilgan ilova internetsiz ham ochiladi (PWA)."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
              <button onClick={v.fq?.t4} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
                {"Narxi qancha?"}
                <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x4,"transition":"transform .2s ease-out"}}>
                  {"+"}
                </span>
              </button>
              <div style={{"display":"grid","gridTemplateRows":v.fq?.r4,"transition":"grid-template-rows .25s ease-out"}}>
                <div style={{"overflow":"hidden"}}>
                  <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                    <span style={{"padding":"2px 8px","border":"1px dashed var(--mut)","borderRadius":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
                      {"tarif — egasi yozadi"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="royxat" data-rv-id="s7" data-rv={v.rv?.s7} style={{"maxWidth":"1280px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(40px,6vw,72px)","scrollMarginTop":"72px"}}>
          <div style={{"background":"var(--acc)","color":"var(--ink)","borderRadius":"32px","padding":"clamp(32px,6vw,72px)","display":"flex","flexWrap":"wrap","gap":"28px","alignItems":"flex-end","justifyContent":"space-between"}}>
            <div style={{"display":"flex","flexDirection":"column","gap":"14px","maxWidth":"660px"}}>
              <h2 style={{"margin":"0","fontSize":"clamp(32px,4.6vw,60px)","lineHeight":"1","letterSpacing":"-.045em","fontWeight":"800","textWrap":"balance"}}>
                {"Birinchi loyihangizni bugun chizing"}
              </h2>
              <p style={{"margin":"0","fontSize":"18px","fontWeight":"600","color":"var(--ink)"}}>
                {"3D demo — ro'yxatsiz. Saqlash, smeta va fayllar — ro'yxatdan keyin."}
              </p>
            </div>
            <div style={{"display":"flex","flexWrap":"wrap","gap":"10px"}}>
              <a href="app.html#reg" onClick={v.goReg} style={{"height":"56px","padding":"0 26px","borderRadius":"16px","background":"var(--bg)","color":"var(--txt)","fontWeight":"800","fontSize":"16px","display":"flex","alignItems":"center","transition":"transform .18s ease-out"}} className="h22">
                {"Ro'yxatdan o'tish"}
              </a>
              <button onClick={v.goDemo} style={{"height":"56px","padding":"0 22px","borderRadius":"16px","background":"transparent","border":"1.5px solid var(--ink)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
                {"3D demoni ko'rish"}
              </button>
            </div>
          </div>
        </section>
        <footer style={{"borderTop":"1px solid var(--line)"}}>
          <div style={{"maxWidth":"1280px","margin":"0 auto","padding":"28px clamp(16px,4vw,32px) 40px","display":"flex","flexWrap":"wrap","gap":"20px","alignItems":"center","justifyContent":"space-between"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
              <div style={{"width":"36px","height":"36px","borderRadius":"11px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
                {"3D"}
              </div>
              <span style={{"fontWeight":"800"}}>
                {"Bittada"}
              </span>
              <span style={{"color":"var(--mut)","fontSize":"14px"}}>
                {"· Smart3D"}
              </span>
            </div>
            <span style={{"padding":"4px 10px","border":"1px dashed var(--mut)","borderRadius":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","color":"var(--mut)"}}>
              {"aloqa — egasi beradi"}
            </span>
            <span style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","alignItems":"center","fontSize":"14px","fontWeight":"600"}}>
              {"O'zbekcha"}
            </span>
          </div>
        </footer>
      </div>
      </>
    );
  }
}
