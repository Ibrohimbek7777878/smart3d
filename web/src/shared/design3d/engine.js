// Smart3D dizayn 3D dvigateli (three.js) — sayt va ilova uchun bitta. Dizayn prototipidan aynan ko'chirilgan — mantiqni o'zgartirmang.
// TZ-19: ikki nusxa (landing/engine.js va app/engine.js) birlashtirildi; dizayn namunasidagi soxta ma'lumot (loyihalar, katalog narxlari,
// raskroy varaqlari) va ishlatilmagan sahna kodi olib tashlandi — haqiqiy ma'lumot hisob dvigatelidan keladi (qoida 4.3).
let S3_SVG=null;
function s3Load(){return import('three').then(async T=>{let gl=false;try{const c=document.createElement('canvas');gl=!!(c.getContext('webgl2')||c.getContext('webgl'))}catch(_){}
  let force=false;try{force=localStorage.getItem('s3d-force-svg')==='1'}catch(_){}
  if(!gl||force){const m=await import('three/examples/jsm/renderers/SVGRenderer.js');S3_SVG=m.SVGRenderer}return T})}
function s3Box(T,x,y,z){const s=a=>1;return new T.BoxGeometry(x,y,z,s(x),s(y),s(z))}
const s3cl=x=>x<0?0:x>1?1:x;
const s3f1=x=>x.toFixed(1).replace('.',',');
function s3P(name,n,size,pos,dir,mat,dim,lab,edge,deco){const p={name,n,size,pos,dir,mat,dim,lab:lab!==false,edge:edge||''};if(deco){p.deco=true;p.lab=false}return p}
/* deco:true — faqat bezak (stoleshnitsa); detal/zapchast/kromka/maydon/ro'yxatga KIRMAYDI (list s3Spec da lab bo'yicha, stats qo'lda) */

function s3SpecKP(W){
  const D=450,H=708,dw=(W-4)/2,iw=W-32,s=W/2-8,z2=D/2-40,x=W/2-8;
  const parts=[
    s3P('Yon devor',2,[16,692,D],[-s,362,0],[-400,0,0],'ldsp','692×450'),
    s3P('Yon devor',2,[16,692,D],[s,362,0],[400,0,0],'ldsp','692×450',false),
    s3P('Tub (pol)',1,[W,16,D],[0,8,0],[0,-320,0],'ldsp',W+'×450'),
    s3P('Planka',2,[iw,16,80],[0,700,-z2],[0,480,-150],'ldsp',iw+'×80'),
    s3P('Planka',2,[iw,16,80],[0,700,z2],[0,480,150],'ldsp',iw+'×80',false),
    s3P('Old planka',1,[iw,90,16],[0,647,D/2-8],[0,330,430],'ldsp','90×'+W),
    s3P('Polka',1,[iw,16,410],[0,362,-17],[0,250,0],'ldsp',iw+'×410'),
    s3P('Eshik',2,[dw,704,16],[-(dw/2+1),354,D/2+10],[-170,0,560],'wood','704×'+dw,true,'4 tomoni · 2 mm'),
    s3P('Eshik',2,[dw,704,16],[dw/2+1,354,D/2+10],[170,0,560],'wood','704×'+dw,false,'4 tomoni · 2 mm'),
    s3P('Orqa devor',1,[W-2,706,3],[0,355,-(D/2+2)],[0,0,-460],'hdf','706×'+(W-2)),
    s3P('Stoleshnitsa',1,[W,30,D+20],[0,723,10],[0,260,0],'top','',false,'',true)
  ];
  const hw=[
    {name:'Oyoqcha 100 mm',cnt:4,kind:'leg',items:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>({p:[a*(W/2-50),-50,b*(D/2-50)],d:[0,-520,0]}))},
    {name:'Ruchka 160 mm',cnt:2,kind:'handleV',items:[{p:[-42,560,D/2+30],d:[-170,0,640]},{p:[42,560,D/2+30],d:[170,0,640]}]},
    {name:'Polka ushlagich',cnt:6,kind:'pin',items:[-170,-30,110].flatMap(z=>[-1,1].map(a=>({p:[a*(W/2-22),352,z],d:[a*70,250,0]})))},
    {name:'Евро 51 мм',cnt:8,kind:'euro',items:[...[-140,140].flatMap(z=>[-1,1].map(a=>({p:[a*x,8,z],d:[a*200,-170,0]}))),...[-z2,z2].flatMap(z=>[-1,1].map(a=>({p:[a*x,700,z],d:[a*200,250,z>0?75:-75]})))]},
    {name:'Евровинт 7×50',cnt:6,kind:'vint',items:[-1,1].flatMap(a=>[{p:[a*x,647,D/2-8],d:[a*200,170,220]},{p:[a*x,690,0],d:[a*200,250,0]},{p:[a*x,8,0],d:[a*200,-170,0]}])}
  ];
  const area=(2*692*450+W*450+2*iw*80+90*W+iw*410+2*704*dw+706*(W-2))/1e6;
  return {key:'kp',code:'MC-KP-02',name:'Pastki shkaf',sub:'"1 polka, 2 eshik"',W,D,H,parts,hw,dims:true,legs:true,
    stats:{detal:10,zap:26,krom:7.79+(W-600)*0.006,area},lim:'eni 600–1070 · bo\'yi 600–880 · chuqurligi 450–580'};
}
function s3SpecKU(){
  const parts=[
    s3P('Tepa / tub',2,[600,16,300],[0,592,0],[0,360,0],'ldsp','600×300'),
    s3P('Tepa / tub',2,[600,16,300],[0,8,0],[0,-360,0],'ldsp','600×300',false),
    s3P('Yon devor',2,[16,568,300],[-292,300,0],[-380,0,0],'ldsp','568×300'),
    s3P('Yon devor',2,[16,568,300],[292,300,0],[380,0,0],'ldsp','568×300',false),
    s3P('Polka',1,[568,16,270],[0,300,-12],[0,200,0],'ldsp','568×270'),
    s3P('Eshik',2,[298,598,16],[-150,300,159],[-160,0,500],'wood','598×298'),
    s3P('Eshik',2,[298,598,16],[150,300,159],[160,0,500],'wood','598×298',false),
    s3P('Orqa devor',1,[598,598,3],[0,300,-152],[0,0,-420],'hdf','598×598')
  ];
  const hw=[
    {name:'Polka ushlagich',cnt:6,kind:'pin',items:[-110,-10,90].flatMap(z=>[-1,1].map(a=>({p:[a*279,290,z],d:[a*60,200,0]})))},
    {name:'Ruchka 160 mm',cnt:2,kind:'handleH',items:[{p:[-150,50,181],d:[-160,0,590]},{p:[150,50,181],d:[160,0,590]}]},
    {name:'Евро 51 мм',cnt:8,kind:'euro',items:[8,592].flatMap(y=>[-100,100].flatMap(z=>[-1,1].map(a=>({p:[a*292,y,z],d:[a*190,y>300?180:-180,0]}))))},
    {name:'Евровинт 7×50',cnt:4,kind:'vint',items:[8,592].flatMap(y=>[-1,1].map(a=>({p:[a*292,y,0],d:[a*190,y>300?180:-180,0]})))}
  ];
  return {key:'ku',code:'MC-KU-04',name:'Osma shkaf',sub:'"1 polka, 2 eshik"',W:600,D:300,H:600,parts,hw,dims:true,
    stats:{detal:8,zap:20,krom:6.49,area:1.57},lim:'eni 600–1070 · bo\'yi 460–1140 · chuqurligi 290–400'};
}
function s3SpecSH(){
  const D=600,parts=[],hw=[];
  parts.push(s3P('Yon devor',2,[16,2184,D],[-892,1092,0],[-750,0,0],'ldsp','2184×600'));
  parts.push(s3P('Yon devor',2,[16,2184,D],[892,1092,0],[750,0,0],'ldsp','2184×600',false));
  parts.push(s3P('Tom',1,[1800,16,D],[0,2192,0],[0,650,0],'ldsp','1800×600'));
  parts.push(s3P('Tub',1,[1768,16,D],[0,108,0],[0,-450,0],'ldsp','1768×600'));
  parts.push(s3P("O'rta devor",2,[16,2068,D],[-300,1150,0],[0,0,-560],'ldsp','2084 / 376'));
  parts.push(s3P("O'rta devor",2,[16,376,D],[300,304,0],[0,-120,-560],'ldsp','376',false));
  [520,920,1320,1720].forEach((y,i)=>parts.push(s3P('Polka',4,[576,16,550],[-596,y,-22],[-280,0,460],'ldsp','576×550',i===0)));
  parts.push(s3P('Eshik',3,[598,2114,16],[-600,1143,309],[-420,0,1050],'wood','2114 · 1714 ×598'));
  parts.push(s3P('Eshik',3,[598,1714,16],[0,1343,309],[0,0,1050],'wood','1714×598',false));
  parts.push(s3P('Eshik',3,[598,1714,16],[600,1343,309],[420,0,1050],'wood','1714×598',false));
  const dr=[[0,186],[600,186],[0,386],[600,386]];
  dr.forEach(([cx,y],i)=>{const dy=y<300?-220:0,dz=700;
    const add=(nm,s,p,ex,mat,lab,dim)=>parts.push(s3P(nm,4,s,p,[ex[0],dy+ex[1],dz+ex[2]],mat,dim||'',lab));
    add('Tortma fasadi',[596,197,16],[cx,y,309],[0,0,280],'wood',i===0,'197×596');
    add('Tortma yoni',[16,150,500],[cx-262,y,40],[-120,0,0],'ldsp',false);
    add('Tortma yoni',[16,150,500],[cx+262,y,40],[120,0,0],'ldsp',false);
    add('Tortma orqasi',[508,150,16],[cx,y,-202],[0,0,-150],'ldsp',false);
    add('Falsh-panel',[508,150,16],[cx,y,290],[0,0,110],'ldsp',false);
    add('Tortma tubi',[540,3,500],[cx,y-76,40],[0,-90,0],'hdf',false);
  });
  parts.push(s3P('Orqa devor',1,[1798,2114,3],[0,1143,-302],[0,0,-850],'hdf','2114×1798'));
  const hinge=[];[[-880,[-420,0,1050]],[-280,[0,0,1050]],[880,[420,0,1050]]].forEach(([x,d],k)=>[300,900,1500,2050].forEach(y=>hinge.push({p:[x,k===0?y:Math.max(y,640),292],d})));
  hw.push({name:'Petlya',cnt:12,kind:'hinge',items:hinge});
  hw.push({name:'Ruchka',cnt:7,kind:'handleV',items:[{p:[-330,1100,332],d:[-420,0,1050]},{p:[270,1300,332],d:[0,0,1050]},{p:[330,1300,332],d:[420,0,1050]},...dr.map(([cx,y])=>({p:[cx,y,334],d:[0,y<300?-220:0,980],k:'handleH'}))]});
  hw.push({name:"Yo'naltiruvchi L400",cnt:4,kind:'rail',items:dr.map(([cx,y])=>({p:[cx-284,y-20,40],d:[-220,y<300?-220:0,700]}))});
  hw.push({name:'Samorez',cnt:56,kind:'sam',items:dr.flatMap(([cx,y])=>[-1,1].map(a=>({p:[cx+a*262,y+50,282],d:[a*160,y<300?-220:0,800]})))});
  hw.push({name:'Евро',cnt:26,kind:'euro',items:[2192,108].flatMap(y=>[-200,200].flatMap(z=>[-1,1].map(a=>({p:[a*884,y,z],d:[a*600,y>1000?520:-380,0]}))))});
  hw.push({name:'Евровинт',cnt:29,kind:'vint',items:[[-300,2176],[-300,124],[300,124],[300,484]].flatMap(([x,y])=>[-200,200].map(z=>({p:[x,y,z],d:[0,y>1000?300:-200,-560],r:'y'})))});
  return {key:'sh',code:'MC-SH-02',name:'Shkaf-kupe',sub:'3 eshik, 4 tortma',W:1800,D,H:2200,parts,hw,dims:false,hs:2.2,
    stats:{detal:41,zap:134,krom:36.66,area:17.72},lim:'bo\'yi 1780–2590 · chuqurligi 350–600',
    list:[{n:2,name:'Yon devor',dim:'2184×600'},{n:2,name:"O'rta devor",dim:'2084 / 376'},{n:1,name:'Tom',dim:'1800×600'},{n:1,name:'Tub',dim:'1768×600'},{n:4,name:'Polka',dim:'576×550'},{n:3,name:'Eshik',dim:'2114 · 1714 ×598'},{n:4,name:'Tortma (fasad)',dim:'197×596'},{n:1,name:'Orqa devor (HDF)',dim:'2114×1798'}]};
}
function s3Spec(m,W){const s=m==='ku'?s3SpecKU():m==='sh'?s3SpecSH():s3SpecKP(W);
  if(!s.list)s.list=s.parts.filter(p=>p.lab).map(p=>({n:p.n,name:p.name+(p.mat==='hdf'?' (HDF)':''),dim:p.dim}));
  s.hwList=s.hw.map(h=>({name:h.name,cnt:h.cnt}));return s}

function s3WoodTex(T){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle='#B4834F';x.fillRect(0,0,512,512);
  for(let i=0;i<200;i++){const y0=Math.random()*512;x.strokeStyle=`rgba(${70+Math.random()*40|0},${40+Math.random()*25|0},18,${0.05+Math.random()*0.2})`;x.lineWidth=0.5+Math.random()*2.4;x.beginPath();
    for(let X=0;X<=512;X+=16){const y=y0+Math.sin(X/90+i)*6+Math.sin(X/23+i*3)*1.5;X?x.lineTo(X,y):x.moveTo(X,y)}x.stroke()}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.center.set(.5,.5);t.rotation=Math.PI/2;return t}
function s3Mats(T,pC,pP){const wood=s3WoodTex(T);const clip=m=>{if(pC)m.clippingPlanes=pC;return m};
  const plain=new T.MeshLambertMaterial({color:0x8FA9AB});if(pP)plain.clippingPlanes=pP;
  return {plain,
    ldsp:()=>clip(new T.MeshStandardMaterial({color:0xC9BFAE,roughness:.85})),
    white:()=>new T.MeshStandardMaterial({color:0xBDB5A6,roughness:.85}),
    wood:()=>clip(new T.MeshStandardMaterial(S3_SVG?{color:0xB4834F,roughness:.55}:{color:0xffffff,map:wood,roughness:.55})),
    hdf:()=>clip(new T.MeshStandardMaterial({color:0xC4A57F,roughness:.95})),
    top:()=>new T.MeshStandardMaterial({color:0x5C5F68,roughness:.45}),
    stone:()=>new T.MeshStandardMaterial({color:0xA79F92,roughness:.5}),
    dark:()=>new T.MeshStandardMaterial({color:0x2C2B31,roughness:.6}),
    metal:new T.MeshStandardMaterial({color:0xC8CCD3,metalness:.45,roughness:.3}),
    metalD:new T.MeshStandardMaterial({color:0x34343C,metalness:.5,roughness:.35}),
    gold:new T.MeshStandardMaterial({color:0xD8B35A,metalness:.5,roughness:.35}),
    zinc:new T.MeshStandardMaterial({color:0x8E949C,metalness:.5,roughness:.35})};
}
function s3HwMesh(T,M,kind,r){let g,m;
  switch(kind){
    case'leg':g=new T.CylinderGeometry(.017,.021,.1,20);m=M.metal;break;
    case'handleV':g=s3Box(T,.012,.16,.016);m=M.metalD;break;
    case'handleH':g=s3Box(T,.16,.012,.016);m=M.metalD;break;
    case'pin':g=new T.CylinderGeometry(.006,.006,.024,12);m=M.metal;r=r||'x';break;
    case'euro':g=new T.CylinderGeometry(.006,.006,.055,10);m=M.gold;r=r||'x';break;
    case'vint':g=new T.CylinderGeometry(.007,.007,.05,10);m=M.zinc;r=r||'x';break;
    case'sam':g=new T.CylinderGeometry(.004,.004,.035,8);m=M.gold;r=r||'z';break;
    case'hinge':g=new T.CylinderGeometry(.02,.02,.013,20);m=M.metal;r=r||'z';break;
    default:g=s3Box(T,.012,.035,.4);m=M.metal;}
  const me=new T.Mesh(g,m);if(r==='x')me.rotation.z=Math.PI/2;if(r==='z')me.rotation.x=Math.PI/2;return me}
/* TZ-18: yorliq matni tarjimasi — sayt/ilova o'rnatadi (s3SetT), til almashsa s3Retitle(v) yorliqlarni joyida yangilaydi */
let S3_T=x=>x;
const s3SetT=f=>{S3_T=x=>{const m=/^(.*\S) (×\d+)$/.exec(x||'');return m?f(m[1])+' '+m[2]:f(x)}};   // "Yon devor ×2" — nom tarjima qilinadi, soni qoladi
function s3Retitle(v){for(const L of v.labels){if(!L.raw)continue;const sp=L.el.children;if(L.kind==='tag')L.el.textContent=S3_T(L.raw[0])+'  →';else if(sp.length){sp[0].textContent=S3_T(L.raw[0]);if(sp[1])sp[1].textContent=S3_T(L.raw[1])}}}
function s3Label(v,title,sub,obj,kind){const el=document.createElement('div');const raw=[title,sub];title=S3_T(title);sub=S3_T(sub);
  const base='position:absolute;left:0;top:0;opacity:0;white-space:nowrap;font-family:"Plus Jakarta Sans",sans-serif;font-variant-numeric:tabular-nums;will-change:transform,opacity;';
  if(kind==='dim'){el.style.cssText=base+'pointer-events:none;font-size:13px;font-weight:700;color:#5FE1C4;padding:3px 8px;border-radius:8px;background:rgba(15,34,41,.85);border:1px solid rgba(95,225,196,.35)';el.textContent=title}
  else if(kind==='tag'){el.style.cssText=base+'pointer-events:auto;cursor:pointer;font-size:15px;font-weight:700;color:#FFFFFF;background:#5B5BF0;padding:11px 18px;border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,.3);display:flex;gap:8px;align-items:center';el.textContent=title+'  →'}
  else{el.style.cssText=base+'pointer-events:none;font-size:12px;font-weight:600;color:var(--txt);background:var(--sfc);border:1px solid var(--line);padding:5px 6px 5px 10px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.18);display:flex;gap:6px;align-items:center;'+(kind==='hw'?'z-index:2;':'');
    const a=document.createElement('span');a.textContent=title;el.append(a);
    if(sub){const b=document.createElement('span');b.textContent=sub;b.style.cssText=kind==='hw'?'background:#FF7A45;color:#2A1206;font-weight:800;padding:2px 8px;border-radius:999px':'color:var(--mut);font-weight:500;padding-right:4px';el.append(b)}}
  v.overlay.appendChild(el);const L={el,obj,op:0,kind,raw};v.labels.push(L);return L}

function s3Viewer(T,host,overlay){
  let r,svg=false;if(S3_SVG){r=new S3_SVG();svg=true;r.setQuality&&r.setQuality('high');const oc=r.clear.bind(r);r.clear=()=>{oc();r.domElement.style.backgroundColor='transparent'}}
  else{r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.localClippingEnabled=true}
  const el=r.domElement;el.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';host.prepend(el);
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(32,1,.05,100);
  scene.add(new T.HemisphereLight(0xffffff,0x55525e,1.15));
  const key=new T.DirectionalLight(0xffffff,1.7);key.position.set(2.5,4,3.5);scene.add(key);
  const fill=new T.DirectionalLight(0xfff6e8,.55);fill.position.set(-3,2,-1);scene.add(fill);const rim=new T.DirectionalLight(0xFF9466,1.1);rim.position.set(-2.5,1.8,-3);scene.add(rim);
  const root=new T.Group();scene.add(root);if(svg){scene.add(new T.AmbientLight(0xffffff,.42));key.intensity=.7;fill.intensity=.28;rim.intensity=.18}
  const sc=document.createElement('canvas');sc.width=sc.height=256;const g=sc.getContext('2d');const gr=g.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
  const shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;root.add(shadow);if(svg)shadow.visible=false;const grid=new T.GridHelper(8,40,svg?0x24474F:0x3A7A84,svg?0x1A353C:0x214C56);grid.material.transparent=true;grid.material.opacity=.6;grid.renderOrder=-2;root.add(grid);if(svg)grid.visible=false;
  const v={r,scene,cam,root,host,overlay,shadow,grid,svg,theta:-.6,phi:.32,dist:3,target:new T.Vector3(),auto:true,labels:[],visible:true,lastUser:0,sized:false};
  let down=null;
  const NS='http://www.w3.org/2000/svg',lsv=document.createElementNS(NS,'svg');lsv.setAttribute('style','position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;opacity:0');
  const lp1=document.createElementNS(NS,'path');lp1.setAttribute('fill','none');lp1.setAttribute('stroke','rgba(236,244,242,.4)');lp1.setAttribute('stroke-width','1');
  const lp2=document.createElementNS(NS,'path');lp2.setAttribute('fill','#FF7A45');lsv.append(lp1,lp2);overlay.prepend(lsv);v.lead=[lp1,lp2,lsv];
  el.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:v.theta,p:v.phi,moved:false};try{el.setPointerCapture(e.pointerId)}catch(_){};el.style.cursor='grabbing'});
  el.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5)down.moved=true;if(!down.moved)return;v.theta=down.t-dx*.008;v.phi=Math.max(-.05,Math.min(1.1,down.p+dy*.005));v.lastUser=performance.now()});
  el.addEventListener('pointerup',e=>{if(down&&!down.moved&&v.onClick){const b=el.getBoundingClientRect();v.onClick((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1)}down=null;el.style.cursor='grab'});
  el.addEventListener('pointercancel',()=>{down=null;el.style.cursor='grab'});
  v.isDown=()=>!!down;
  /* TZ-18: o'lcham ma'lum bo'lmaguncha chizilmaydi — aks holda SVG zaxirada (WebGL'siz brauzer) yo'llar NaN bo'lib konsolni to'ldiradi */
  const fit=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();v.sized=true};
  const ro=new ResizeObserver(fit);ro.observe(host);
  const io=new IntersectionObserver(es=>{v.visible=es[0].isIntersecting});io.observe(host);
  const tmp=new T.Vector3();let last=performance.now(),raf;
  const loop=now=>{raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(!v.visible||!v.sized)return;
    if(v.auto&&!down&&now-v.lastUser>2500)v.theta+=dt*.28;
    if(v.onTick)v.onTick(dt,now/1000);
    const c=Math.cos(v.phi);cam.position.set(v.target.x+Math.sin(v.theta)*c*v.dist,v.target.y+Math.sin(v.phi)*v.dist,v.target.z+Math.cos(v.theta)*c*v.dist);cam.lookAt(v.target);
    if(!svg||now-(v.lastR||0)>32){v.lastR=now;r.render(scene,cam)}
    const w=host.clientWidth,h=host.clientHeight;
    const cols=[];
    for(const L of v.labels){if(L.op<=.01){if(L.el.style.opacity!=='0')L.el.style.opacity='0';continue}
      L.obj.getWorldPosition(tmp);tmp.project(cam);const px=(tmp.x*.5+.5)*w,py=(-tmp.y*.5+.5)*h;
      if(v.columns&&(L.kind==='part'||L.kind==='hw')){cols.push({L,px,py});continue}
      L.el.style.transform='translate('+px.toFixed(1)+'px,'+py.toFixed(1)+'px) translate(-50%,-50%)';L.el.style.opacity=L.op.toFixed(3)}
    let dl='',dd='',mo=0;
    if(cols.length){cols.sort((a,b)=>a.px-b.px);const half=Math.ceil(cols.length/2),sides=[cols.slice(0,half),cols.slice(half)];
      const gap=w<560?26:32,top=v.colTop||64,bot=h-(v.colBot||40),mx=w<560?8:16;
      sides.forEach((arr,si)=>{if(!arr.length)return;arr.sort((a,b)=>a.py-b.py);let y=-1e9;arr.forEach(c=>{c.y=Math.max(c.py,top,y+gap);y=c.y});
        for(let i=arr.length-1;i>=0;i--){const lim=i===arr.length-1?bot:arr[i+1].y-gap;if(arr[i].y>lim)arr[i].y=lim}
        arr.forEach(c=>{const L=c.L;if(!L.w||L.wt!==L.el.textContent){L.w=L.el.offsetWidth;L.wt=L.el.textContent}
          const x=si?w-mx-L.w:(v.colL||mx),ex=si?x:x+L.w,kx=si?ex-14:ex+14;
          L.el.style.transform='translate('+x.toFixed(1)+'px,'+c.y.toFixed(1)+'px) translate(0,-50%)';L.el.style.opacity=L.op.toFixed(3);mo=Math.max(mo,L.op);
          dl+='M'+ex.toFixed(1)+' '+c.y.toFixed(1)+'L'+kx.toFixed(1)+' '+c.y.toFixed(1)+'L'+c.px.toFixed(1)+' '+c.py.toFixed(1);
          dd+='M'+(c.px-2.5).toFixed(1)+' '+c.py.toFixed(1)+'a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0'})})}
    v.lead[0].setAttribute('d',dl);v.lead[1].setAttribute('d',dd);v.lead[2].style.opacity=mo.toFixed(3)};
  raf=requestAnimationFrame(loop);
  v.dispose=()=>{cancelAnimationFrame(raf);lsv.remove();ro.disconnect();io.disconnect();r.dispose&&r.dispose();el.remove();v.labels.forEach(L=>L.el.remove())};
  return v}

function s3Clear(v,m){v.root.remove(m.g);m.g.traverse(o=>{if(o.geometry)o.geometry.dispose()});v.labels.forEach(L=>L.el.remove());v.labels=[]}
function s3Build(T,v,spec,light){const M=v.M;
    const g=new T.Group(),groups=[],hws=[],pick=[],V=a=>new T.Vector3(a[0]/1000,a[1]/1000,a[2]/1000);
    spec.parts.forEach(p=>{const geo=s3Box(T,p.size[0]/1000,p.size[1]/1000,p.size[2]/1000);const mat=M[p.mat]();
      const pm=M.plain.clone();pm.clippingPlanes=M.plain.clippingPlanes;const c=new T.Mesh(geo,mat),pl=new T.Mesh(geo,pm),em=new T.LineBasicMaterial({color:0x2B3160,transparent:true,opacity:.85});
      const gr=new T.Group();gr.add(c,pl,new T.LineSegments(new T.EdgesGeometry(geo),em));
      gr.userData={base:V(p.pos),dir:V(p.dir),p,mat,em,pm,fa:1};gr.position.copy(gr.userData.base);g.add(gr);groups.push(gr);c.userData.gr=gr;pl.userData.gr=gr;pick.push(c,pl);
      if(p.lab)s3Label(v,p.name+(p.n>1?' ×'+p.n:''),p.dim,gr,'part')});
    spec.hw.forEach(h=>h.items.forEach((it,i)=>{const w=new T.Group();w.add(s3HwMesh(T,M,it.k||h.kind,it.r));w.userData={base:V(it.p),dir:V(it.d)};w.position.copy(w.userData.base);w.scale.setScalar(.0001);g.add(w);hws.push(w);if(i===0)s3Label(v,h.name,'×'+h.cnt,w,'hw')}));
    let dimMat=null;
    if(spec.dims){dimMat=new T.LineBasicMaterial({color:0x5FE1C4,transparent:true});const w=spec.W/1000,d=spec.D/1000,h=spec.H/1000,o=.07,t=.02;
      const seg=pts=>{g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts.map(a=>new T.Vector3(a[0],a[1],a[2]))),dimMat))};
      seg([[-w/2,0,d/2+o],[w/2,0,d/2+o],[-w/2,0,d/2],[-w/2,0,d/2+o+t],[w/2,0,d/2],[w/2,0,d/2+o+t]]);
      seg([[w/2+o,0,-d/2],[w/2+o,0,d/2],[w/2,0,-d/2],[w/2+o+t,0,-d/2],[w/2,0,d/2],[w/2+o+t,0,d/2]]);
      seg([[w/2+o,0,d/2],[w/2+o,h,d/2],[w/2,h,d/2],[w/2+o+t,h,d/2],[w/2,0,d/2],[w/2+o+t,0,d/2]]);
      const an=p=>{const o3=new T.Object3D();o3.position.set(p[0],p[1],p[2]);g.add(o3);return o3};
      s3Label(v,''+spec.W,'',an([0,0,d/2+o+.06]),'dim');s3Label(v,''+spec.D,'',an([w/2+o+.07,0,0]),'dim');s3Label(v,''+spec.H,'',an([w/2+o+.08,h/2,d/2]),'dim')}
    v.root.add(g);
    v.target.set(0,spec.H/2000,0);v.dist=Math.max(spec.W,spec.H)/1000*4+.8;
    v.shadow.position.y=spec.legs?-.101:-.001;v.grid.position.y=v.shadow.position.y-.002;v.shadow.scale.set(spec.W/1000*2.2,spec.D/1000*2.8,1);
    return {g,groups,hws,pick,spec,dimMat}}
function s3Apply(v,m,a){const H=m.spec.H/1000,lv=-1+a.color*(H*1.6+2.6);v.pC.constant=lv;v.pP.constant=-lv;
    for(const g of m.groups){const u=g.userData,ft=m.focus?(g===m.focus?1:.1):1;u.fa+=(ft-u.fa)*.18;const o=u.fa,tr=o<.99;
      for(const mt of [u.mat,u.pm]){mt.transparent=tr;mt.opacity=o;mt.depthWrite=o>.5}
      if(v.svg){g.children[0].visible=a.color>.5;g.children[1].visible=a.color<=.5}g.position.copy(g.userData.base).addScaledVector(g.userData.dir,a.explode);g.userData.em.opacity=(.85-.62*a.color)*Math.max(o,.2)}
    const hs=(m.spec.hs||1)*a.hw;for(const h of m.hws){h.visible=a.hw>.01&&!m.focus;h.scale.setScalar(Math.max(.0001,hs));h.position.copy(h.userData.base).addScaledVector(h.userData.dir,a.explode)}
    const pe=s3cl((a.explode-.5)/.35),dimOp=(1-a.color)*(1-s3cl(a.explode*4));
    for(const L of v.labels)L.op=m.focus?(L.obj===m.focus?1:0):L.kind==='part'?pe:L.kind==='hw'?pe*s3cl((a.hw-.4)/.4):dimOp;
    if(m.dimMat)m.dimMat.opacity=dimOp}

const s3n=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ');
function s3Thumb(w,h,d,col,kind,doors,max){const k=max/Math.max(w,h,d*1.4),fw=w*k,fh=h*k,sw=d*k;
  let bg=col;if(kind==='tortma')bg='linear-gradient(180deg,'+col+' 32%,rgba(0,0,0,.35) 32% 34%,'+col+' 34% 66%,rgba(0,0,0,.35) 66% 68%,'+col+' 68%)';
  else if(doors===2)bg='linear-gradient(90deg,'+col+' 49%,rgba(0,0,0,.4) 49% 51%,'+col+' 51%)';
  if(kind==='glass')bg='linear-gradient(90deg,#9FD3DA 49%,rgba(0,0,0,.4) 49% 51%,#9FD3DA 51%)';
  return {fw:fw+'px',fh:fh+'px',sw:sw+'px',fbg:bg,ft:'translate(-50%,-50%) translateZ('+(sw/2)+'px)',st:'translate(-50%,-50%) translateX('+(fw/2)+'px) rotateY(90deg)',tt:'translate(-50%,-50%) translateY('+(-fh/2)+'px) rotateX(90deg)'}}

export { s3SetT, s3Retitle, S3_SVG, s3Load, s3Box, s3cl, s3f1, s3P, s3SpecKP, s3SpecKU, s3SpecSH, s3Spec, s3WoodTex, s3Mats, s3HwMesh, s3Label, s3Viewer, s3Clear, s3Build, s3Apply, s3n, s3Thumb };   // matnlar (hikoya, maslahatlar) — i18n lug'atida
