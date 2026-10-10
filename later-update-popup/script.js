/* ─────────── Later ───────────
   Понедельник приходит как обновление macOS. Курсор жмёт Later, окно мотает головой «нет»,
   и каждое нажатие отдаёт кусок ширины кнопке Install Now. На третьем нажатии Later
   сплющивается в нитку и лопается, остаётся одна Install Now. Кнопка стягивается в полосу
   установки «About 5 days remaining», экран светлеет, и поверх пишется прописью «good luck»,
   как hello при первом запуске мака. Автопоказ считается из одного времени u, петля без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function setVar(el,k,v){if(!el.__v)el.__v={};if(el.__v[k]!==v){el.__v[k]=v;el.style.setProperty(k,v)}}
function px(v){return v.toFixed(2)+'px'}
// затухающая пружина от 0 к 1: a затухание, b частота
function spring(t,a,b){if(t<=0)return 0;return 1-Math.exp(-a*t)*(Math.cos(b*t)+a/b*Math.sin(b*t))}
function bump(t,d){return t<0||t>d?0:Math.sin(Math.PI*t/d)}
function jolt(t,a,b){return t<0?0:Math.exp(-a*t)*Math.sin(b*t)}

/* штрихи «good luck»: Hershey Script 1-stroke, наклон чуть выпрямлен, пробел сужен, мировые точки */
var INK=[[-124.5,-3.9,-127.7,-9,-133.2,-11.6,-138.3,-11.6,-143.2,-9,-145.5,-6.4,-147.5,-1.3,-146.8,3.9,-143.6,9.1,-138.2,11.6,-133,11.6,-128.1,9.1,-125.8,6.5],[-122.9,-11.6,-125.8,6.5,-132.7,34.9,-134.7,40,-139.6,42.6,-142.5,40,-143.1,34.9,-141.5,27.1,-134.6,19.4,-127.5,14.2,-122.7,11.6,-115.5,6.5,-108.7,-1.3],[-94.5,-11.6,-99.6,-11.6,-104.5,-9,-106.8,-6.4,-108.8,-1.3,-108.1,3.9,-104.9,9.1,-99.4,11.6,-94.3,11.6,-89.4,9.1,-87.1,6.5,-85.2,1.3,-85.8,-3.9,-89,-9,-94.5,-11.6,-96.8,-9,-96.1,-3.9,-93,1.3,-87.4,3.9,-79.7,3.9,-74.9,1.3,-72.6,-1.3],[-58.4,-11.6,-63.5,-11.6,-68.3,-9,-70.6,-6.4,-72.6,-1.3,-72,3.9,-68.8,9.1,-63.3,11.6,-58.1,11.6,-53.3,9.1,-51,6.5,-49,1.3,-49.6,-3.9,-52.8,-9,-58.4,-11.6,-60.6,-9,-60,-3.9,-56.8,1.3,-51.3,3.9,-43.6,3.9,-38.7,1.3,-36.5,-1.3],[-13.5,-3.9,-16.6,-9,-22.2,-11.6,-27.3,-11.6,-32.2,-9,-34.5,-6.4,-36.4,-1.3,-35.8,3.9,-32.6,9.1,-27.1,11.6,-22,11.6,-17.1,9.1,-15.1,3.9,-5.3,-42.6],[-11.9,-11.6,-12.9,1.3,-11.9,9.1,-9.1,11.6,-6.5,11.6,-1.6,9.1,0.6,6.5,4.9,-1.3],[23.6,-1.3,27.8,-9,34,-22,36,-27.1,37.7,-34.9,37,-40,34.1,-42.6,29.3,-40,27.3,-34.9,26,-24.5,25.6,-6.4,27.4,9.1,30.3,11.6,32.9,11.6,37.8,9.1,40,6.5,44.3,-1.3],[44.3,-1.3,48.2,-11.6,44.9,3.9,45.5,9.1,48.4,11.6,53.6,11.6,58.4,9.1,63,3.9,67.2,-3.9],[68.8,-11.6,65.6,3.9,66.2,9.1,69.1,11.6,71.6,11.6,76.5,9.1,78.8,6.5,83,-1.3],[100.4,-6.4,100.1,-9,97.2,-11.6,92.1,-11.6,87.2,-9,84.9,-6.4,83,-1.3,83.6,3.9,86.8,9.1,92.3,11.6,100,11.6,107.1,6.5,111.4,-1.3],[111.3,-1.3,115.6,-9,121.8,-22,123.7,-27.1,125.4,-34.9,124.8,-40,121.8,-42.6,117.1,-40,115.1,-34.9,113.7,-24.5,113,-9,112.9,11.6],[112.9,11.6,114.5,3.9,116.5,-1.3,120.8,-9,125.6,-11.6,130.8,-11.6,133.7,-9,134.3,-3.9,129.4,-1.3,121.7,-1.3],[121.7,-1.3,127.1,1.3,130.7,9.1,133.6,11.6,136.1,11.6,141,9.1,143.3,6.5,147.5,-1.3]];

/* ─────────── раскладка окна, точки ─────────── */
var AW=264,AH0=208,AH1=168,AX=-132,AY=-104,BW=224,GAP=8,BH=30,BAR=6;
var BT0=158,BT1=112;                 // верх ряда кнопок до и после превращения в полосу
var BY=AY+BT0+BH/2;                  // центр кнопок по вертикали в мире
var FS=[.5,.3,.12,0];               // доля Later после каждого нажатия

/* ─────────── время ─────────── */
var TL={A:.06,C:[.62,1.04,1.42],I:2.14};
// всё после Install Now считается от момента нажатия
var R={M0:.1,M1:.62,P0:.42,P1:1.6,H0:1.35,W0:1.7,WD:1.6};
R.W1=R.W0+R.WD;R.OUT=R.W1+.8;R.END=R.OUT+.37;
var CYCLE=TL.I+R.END;
TL.C_=CYCLE;TL.R=R;
var AUTO={laters:TL.C,install:TL.I};

/* ─────────── кадр сюжета ─────────── */
function scene(u,P){
  var F={},k,n=P.laters.length,I=P.install;
  F.ap=c01((u-TL.A)/.14);F.as=mix(.9,1,spring(u-TL.A,13,21));
  // ширина Later: каждое нажатие отдаёт кусок Install Now, окно мотает головой
  var f=FS[0],sh=0,pl=0;
  for(k=0;k<n;k++){
    var c=P.laters[k];
    f-=(FS[k]-FS[k+1])*spring(u-c,k===2?13:10,22);
    sh+=jolt(u-c-.01,8.5,40)*(k===2?1.15:1);
    pl=Math.max(pl,bump(u-c+.06,.15));
  }
  if(I!=null&&n<3)f-=FS[n]*spring(u-I,14,26);   // Install раньше времени: Later уходит сразу
  F.fr=f;F.f=Math.max(0,f);F.sh=sh;F.pl=pl;
  var r=I!=null?u-I:-9;F.r=r;
  F.pi=I!=null?bump(r+.06,.17):0;
  F.m=eio(seg(r,R.M0,R.M1));
  F.t1=eio(seg(r,.06,.3));F.t2=eio(seg(r,.2,.5));
  F.eta=eio(seg(r,.4,.66));
  F.p=.012*eout(seg(r,R.P0,R.P0+.3))+.016*sm(seg(r,R.P0+.2,R.P1));
  F.hl=I!=null?bump(r-R.P0,R.P1-R.P0+.2)*.55:0;
  F.wash=eio(seg(r,R.H0,R.H0+.45))*(1-eio(seg(r,R.OUT,R.OUT+.35)));
  F.af=1-eio(seg(r,R.H0,R.H0+.3));
  F.w=seg(r,R.W0,R.W1);
  F.inkA=1-eio(seg(r,R.OUT,R.OUT+.3));
  return F;
}

/* курсор автопоказа: подходит к Later, ловит его, пока он съёживается, потом ищет и жмёт Install */
function laterX(f){return AX+20+(BW-GAP*c01(f/.06))*f/2}
function curPath(u){
  var C=TL.C,I=TL.I,x,y=BY+2,q,k;
  var X=FS.map(laterX);
  if(u<C[0]){q=eio(seg(u,.12,C[0]-.06));x=mix(150,X[0],q)+22*Math.sin(Math.PI*q);y=mix(250,BY+2,q)}
  else if(u<C[2]){k=u<C[1]?0:1;q=eio(seg(u,C[k]+.1,C[k+1]-.06));x=mix(X[k],X[k+1],q)}
  else{
    // Later пропал из-под курсора: короткий поиск влево, потом в центр Install Now
    q=eio(seg(u,C[2]+.42,I-.06));
    x=mix(X[2],0,q)-16*bump(u-C[2]-.1,.34);
    y=BY+2-4*bump(u-C[2]-.1,.34);
  }
  var pr=0;C.concat([I]).forEach(function(c){pr=Math.max(pr,bump(u-c+.06,.13))});
  return {x:x,y:y,a:c01((u-.1)/.1)*(1-eio(seg(u,I+.42,I+.72))),pr:pr};
}

/* ─────────── DOM ─────────── */
var zoom=document.getElementById('zoom'),alertEl=document.getElementById('alert');
var t1=document.getElementById('t1'),t2=document.getElementById('t2'),msg=document.getElementById('msg'),eta=document.getElementById('eta');
var btns=document.getElementById('btns'),later=document.getElementById('later'),install=document.getElementById('install');
var laterLb=document.getElementById('laterLb'),installLb=document.getElementById('installLb'),fill=document.getElementById('fill'),hl=document.getElementById('hl');
var washEl=document.getElementById('wash'),inkEl=document.getElementById('ink'),cur=document.getElementById('cur');

/* пропись: гладкие пути через точки, длины, расписание пера */
var PATHS=[],LENS=[],TS=[],TE=[],LTOT=0,LIFT=.045;
function crPath(a){
  var p=[],i;for(i=0;i<a.length;i+=2)p.push([a[i],a[i+1]]);
  var s='M'+p[0][0]+' '+p[0][1];
  for(i=0;i<p.length-1;i++){
    var p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2;
    s+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(2)+' '+(p1[1]+(p2[1]-p0[1])/6).toFixed(2)+' '+
      (p2[0]-(p3[0]-p1[0])/6).toFixed(2)+' '+(p2[1]-(p3[1]-p1[1])/6).toFixed(2)+' '+p2[0]+' '+p2[1];
  }
  return s;
}
function buildInk(){
  INK.forEach(function(a){
    var e=document.createElementNS('http://www.w3.org/2000/svg','path');
    e.setAttribute('d',crPath(a));inkEl.appendChild(e);PATHS.push(e);
    var L=e.getTotalLength();LENS.push(L);LTOT+=L;
    e.style.strokeDasharray=L.toFixed(2)+' '+(L+20).toFixed(2);
  });
  // время пера пропорционально длине, между штрихами короткий отрыв
  var lifts=LIFT*(PATHS.length-1)/R.WD,draw=1-lifts,t=0;
  LENS.forEach(function(L,i){TS.push(t);t+=draw*L/LTOT;TE.push(t);t+=LIFT/R.WD});
}
// перо мягко трогается и мягко встаёт
function warp(t){return t-.12*Math.sin(2*Math.PI*t)/(2*Math.PI)}
function inkProg(w){var tw=warp(c01(w));return TS.map(function(s,i){return seg(tw,s,TE[i])})}

var LW=32;
function measure(){LW=laterLb.offsetWidth||32}

/* ─────────── камера и подгонка ─────────── */
var VW=1080,VH=1350,SF=1;
function fit(){VW=innerWidth;VH=innerHeight;SF=clamp(Math.min((VH-130)/260,(VW-40)/330),.8,2.2)}

/* ─────────── отрисовка ─────────── */
function render(F,C){
  var S,cy=mix(0,(AH1-AH0)/2,F.m),ty0;
  if(REC||STILL){S=VW*.8/AW;ty0=VH/2}else{S=SF;ty0=(VH-56)/2}
  S*=mix(1,.93,F.wash)*(1+.025*sm(F.w));
  cy=mix(cy,0,F.wash);
  set(zoom,'transform','translate('+px(VW/2)+','+px(ty0-cy*S)+') scale('+S.toFixed(4)+')');

  // окно
  var sc=F.as*mix(.96,1,F.af);
  set(alertEl,'transform','translate('+px(AX+9*F.sh)+','+px(AY)+') scale('+sc.toFixed(4)+')');
  set(alertEl,'opacity',(F.ap*F.af).toFixed(3));
  set(alertEl,'height',px(mix(AH0,AH1,F.m)));
  set(alertEl,'visibility',F.ap*F.af<.002?'hidden':'visible');
  set(t1,'transform','translateY('+px(-9*F.t1)+')');set(t1,'opacity',(1-F.t1).toFixed(3));
  set(t2,'transform','translateY('+px(9*(1-F.t2))+')');set(t2,'opacity',F.t2.toFixed(3));
  set(msg,'opacity',(1-F.t1).toFixed(3));set(msg,'transform','translateY('+px(-5*F.t1)+')');

  // кнопки: Later отдаёт ширину, Install Now растёт, потом стягивается в полосу
  var bt=mix(BT0,BT1,F.m);set(btns,'top',px(bt));
  var g=GAP*c01(F.f/.06),av=BW-g,wL=av*F.f,wI=av*(1-F.f);
  var vis=sm(c01(F.f/.035));
  set(later,'width',px(Math.max(0,wL)));
  set(later,'borderRadius',px(Math.min(15,wL/2)));
  set(later,'opacity',vis.toFixed(3));
  // сжатая кнопка вспучивается по вертикали, как резина
  var bul=1+.16*Math.pow(c01(1-wL/70),1.5);
  set(later,'transform','scale('+(mix(.5,1,vis)*(1-.03*F.pl)).toFixed(4)+','+(mix(.2,1,vis)*bul*(1-.03*F.pl)).toFixed(4)+')');
  set(later,'visibility',vis<.002?'hidden':'visible');
  setVar(later,'--pr',F.pl.toFixed(3));
  // надпись не обрезается, а сплющивается вместе с кнопкой
  var sx=clamp((wL-14)/LW,.05,1);
  set(laterLb,'transform','translate(-50%,-50%) scaleX('+sx.toFixed(4)+')');
  set(laterLb,'opacity',c01((wL-5)/12).toFixed(3));
  later.disabled=F.f<.03;

  var h=mix(BH,BAR,F.m),over=Math.max(0,-F.fr);
  set(install,'left',px(wL+g));set(install,'width',px(wI));
  set(install,'height',px(h));set(install,'top',px((BH-h)/2));set(install,'borderRadius',px(h/2));
  set(install,'transform','scale('+(1+over*.35).toFixed(4)+','+(1+over*.12).toFixed(4)+')');
  setVar(install,'--pr',F.pi.toFixed(3));
  set(installLb,'opacity',(1-c01(F.m*3)).toFixed(3));
  var fw=mix(wI,Math.max(h,wI*F.p),F.m);
  set(fill,'width',px(fw));
  set(hl,'opacity',F.hl.toFixed(3));
  install.disabled=F.r>-9;
  set(eta,'top',px(bt+BH/2+BAR/2+8));set(eta,'opacity',F.eta.toFixed(3));

  // смена экрана и пропись
  set(washEl,'opacity',F.wash.toFixed(3));
  var ip=inkProg(F.w);
  PATHS.forEach(function(e,i){
    set(e,'strokeDashoffset',(LENS[i]*(1-ip[i])).toFixed(2));
    set(e,'visibility',ip[i]>0?'visible':'hidden');
  });
  set(inkEl,'opacity',F.inkA.toFixed(3));

  // курсор
  if(C&&C.a>0){
    set(cur,'opacity',C.a.toFixed(3));
    set(cur,'transform','translate('+px(C.x-4)+','+px(C.y-2)+') scale('+(1-.12*C.pr).toFixed(3)+')');
  }else set(cur,'opacity','0');
}

/* ─────────── звук: события по сценарию ─────────── */
function penCurve(){
  var N=180,a=[],prev=0,mx=0,i,k;
  for(i=0;i<=N;i++){var p=inkProg(i/N),L=0;for(k=0;k<p.length;k++)L+=p[k]*LENS[k];a.push(Math.max(0,L-prev));prev=L}
  a[0]=a[1];
  // сглаживание: отрывы пера становятся короткими провалами, а не обрывами
  var b=a.map(function(v,i){var s=0,c=0;for(var j=-3;j<=3;j++){var x=a[i+j];if(x!=null){s+=x;c++}}return s/c});
  b[0]=0;b[b.length-1]=0;
  b.forEach(function(v){mx=Math.max(mx,v)});
  return b.map(function(v){return v/mx});
}
var PEN=null;
function buildEvents(P){
  var E=[],n=P.laters.length,I=P.install;
  E.push([TL.A,'appear']);
  P.laters.forEach(function(c,k){
    E.push([c-.05,'down']);E.push([c,'up']);E.push([c+.01,'nope',k]);E.push([c+.03,'squeeze',k]);
    if(k===2)E.push([c+.12,'pop']);
  });
  if(I!=null){
    if(n<3)E.push([I+.08,'pop']);
    E.push([I-.05,'down']);E.push([I,'ok']);E.push([I+R.M0+.02,'morph']);
    E.push([I+R.H0,'chord']);E.push([I+R.W0,'pen',PEN,R.WD]);E.push([I+R.W1+.04,'done']);
  }
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EV_AUTO=[],EV_LIVE=[];
function fireBetween(E,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(E,u0,cyc+1e-9);u0=-1e-9}
  E.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── режимы: автопоказ и живой, где жмёт сам зритель ─────────── */
var mode='auto',acc=0,prev=null,lastU=0,lu=0,LP=null,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function goLive(){
  if(mode==='live')return;
  var u=uNow();mode='live';lu=u;lastU=u;
  LP={laters:AUTO.laters.filter(function(c){return c<=u}),install:AUTO.install<=u?AUTO.install:null};
  EV_LIVE=buildEvents(LP);
}
function pressLater(){
  Sound.start();goLive();
  if(LP.install!=null||LP.laters.length>=3)return;
  LP.laters.push(lu+.05);EV_LIVE=buildEvents(LP);
}
function pressInstall(){
  Sound.start();goLive();
  if(LP.install!=null)return;
  LP.install=lu+.05;EV_LIVE=buildEvents(LP);
}
later.addEventListener('pointerdown',function(e){if(e.button>0||REC)return;e.preventDefault();pressLater()});
install.addEventListener('pointerdown',function(e){if(e.button>0||REC)return;e.preventDefault();pressInstall()});
later.addEventListener('click',function(e){if(e.detail===0)pressLater()});
install.addEventListener('click',function(e){if(e.detail===0)pressInstall()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('.tools'))return;
  if(e.key==='Escape'){e.preventDefault();pressLater()}
  if(e.key==='Enter'){e.preventDefault();pressInstall()}
});

/* ─────────── часы ─────────── */
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  var u;
  if(REC){
    u=((now/1000+PH)%CYCLE+CYCLE)%CYCLE;render(scene(u,AUTO),curPath(u));
    if(now/1000>=CYCLE-1e-6)window.__done=true;
  }else if(mode==='live'){
    lu+=dt;
    fireBetween(EV_LIVE,lastU,lu);lastU=lu;
    render(scene(lu,LP),null);
    // неделя началась: новое окно, зритель снова может жать Later
    if(LP.install!=null&&lu-LP.install>R.END){lu=0;lastU=0;LP={laters:[],install:null};EV_LIVE=buildEvents(LP)}
  }else{
    var run=!paused&&!reduce;
    if(run)acc+=dt;
    u=reduce&&!paused?TL.I+R.W1+.3:uNow();
    render(scene(u,AUTO),curPath(u));
    if(run)fireBetween(EV_AUTO,lastU,u,CYCLE);
    lastU=u;
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();Sound.cut();mode='auto';paused=false;acc=0;lastU=0};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});
if(matchMedia('(pointer: coarse)').matches)document.getElementById('hint').textContent='Tap Later as many times as you like';

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

// для проверки кадров: __seek(секунды петли); для записи: __renderAudio
window.__seek=function(t){mode='auto';paused=true;acc=t;var u=uNow();render(scene(u,AUTO),curPath(u))};
window.__renderAudio=function(){return Sound.renderLoop(EV_AUTO,CYCLE,PH+1/60)};
window.__TL=TL;

(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  fit();measure();buildInk();PEN=penCurve();EV_AUTO=buildEvents(AUTO);
  addEventListener('resize',fit);
  if(REC)render(scene(PH%CYCLE,AUTO),curPath(PH%CYCLE));
  requestAnimationFrame(tick);
});
