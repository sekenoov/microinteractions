/* ─────────── Typing ───────────
   Спрашиваешь «are you mad at me?». У собеседника появляются три точки, и пузырь «печатает»
   надувается, как воздушный шарик: каждая волна набора добавляет воздуха, стирание чуть сдувает,
   хвостик из двух кружков работает узелком. Потом черновик стирают целиком: узелок отпускает,
   шарик с треском носится по экрану, сдувается, и на место садится крошечное «no.».
   Автопоказ рисуется из одного времени t: полёт считается один раз заранее и проигрывается по t,
   поэтому петля замыкается без шва. В живом режиме зритель сам держит палец, пока Alex печатает. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0),SEED=+(QS.get('seed')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(R){var u=Math.max(1e-9,R()),v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: появление пузыря, падение ленты
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

var ASK='are you mad at me?',NO='no.',READ_AT='11:52 PM';

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,YB=768,RX=20,MEX=382,BH=40,GQ=12,GL=21,GB=16,YTOP=300,KMIN=-6;
var N0={x:RX+4,y:YB-4};                         // горлышко шарика, оно же угол пузыря у хвостика
var K1={x:RX+2,y:YB-1,r:7},K2={x:RX-5,y:YB+7.5,r:3.5};
var NPT=96,TILT=.86,PW0=33;
var FIELDTXT={x:64+16,y:786+9};
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z';

var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom');
var thread=document.getElementById('thread'),skin=document.getElementById('skin'),knotG=document.getElementById('knot');
var k1=document.getElementById('k1'),k2=document.getElementById('k2'),dotsG=document.getElementById('dots'),shredsG=document.getElementById('shreds');
var DOTS=[].slice.call(dotsG.querySelectorAll('circle')),wordEl=document.getElementById('word');
var typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),ph=document.getElementById('ph'),mic=document.getElementById('mic'),sendBtn=document.getElementById('send');

function tailSvg(me){return '<svg class="tail" viewBox="0 0 20 20" aria-hidden="true"><path d="'+TAILP+'"'+(me?' transform="matrix(-1 0 0 1 20 0)"':'')+'/></svg>'}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}

/* блоки ленты: k < 0 старые обмены, 0 текущий */
var BL={};
for(var k=KMIN;k<=0;k++){
  var q=h('div','msg me');q.innerHTML=esc(ASK)+tailSvg(1);
  var r=h('div','msg them');r.innerHTML='<span class="t"></span>'+tailSvg(0);
  thread.appendChild(q);thread.appendChild(r);
  BL[k]={q:q,r:r,rt:r.querySelector('.t'),word:null};
}
var LBA=h('div','lbl'),LBB=h('div','lbl');thread.appendChild(LBA);thread.appendChild(LBB);
LBB.innerHTML='<b>Read</b> '+READ_AT;
var probe=h('div','msg them');probe.style.visibility='hidden';thread.appendChild(probe);
var QW=0,WW={},LW={};
function wordW(w){if(WW[w]==null){probe.textContent=w;WW[w]=probe.offsetWidth}return WW[w]}
function measure(){
  QW=BL[0].q.offsetWidth;WW={};
  LBA.innerHTML='Delivered';LW.d=LBA.offsetWidth;LBA.innerHTML='<b>Read</b> '+READ_AT;LW.r=LBA.offsetWidth;
}

/* ─────────── форма шарика ───────────
   Один и тот же замкнутый контур из NPT точек. Параметр φ отсчитывается от горлышка.
   При L = 1 это пилюля индикатора набора (66 × 40), дальше она растёт от горлышка
   и перетекает в каплю воздушного шара, наклонённую вправо. */
var PHI=[];for(var i=0;i<NPT;i++)PHI.push(2*Math.PI*i/NPT);
function restShape(L,pw,mo){
  var P=new Float64Array(NPT*2);
  var cpx=N0.x+(RX+pw-N0.x)*L,cpy=N0.y+(YB-20-N0.y)*L,hw=pw*L,hh=20*L,rr=hh,s=Math.max(0,hw-rr);
  var thp=Math.atan2(N0.y-cpy,N0.x-cpx);
  var B=19*L,A=B*1.06,ext=A*.07,thu=Math.PI/2+TILT,ux=Math.cos(thu),uy=Math.sin(thu),vx=-uy,vy=ux;
  var cbx=N0.x-ux*(A+ext),cby=N0.y-uy*(A+ext);
  var m=sm((L-1.3)/(3.4-1.3));if(mo!=null)m=Math.max(m,mo);
  for(var i=0;i<NPT;i++){
    var f=PHI[i],dx=Math.cos(thp+f),dy=Math.sin(thp+f),adx=Math.abs(dx),ady=Math.abs(dy),t;
    if(ady>1e-9&&adx*(rr/ady)<=s)t=rr/ady;else t=s*adx+Math.sqrt(Math.max(0,s*s*adx*adx-s*s+rr*rr));
    var px=cpx+dx*t,py=cpy+dy*t;
    var c=(1+Math.cos(f))/2,w=Math.pow(c,5),pu=A*Math.cos(f)+ext*Math.pow(c,10),pv=B*Math.sin(f)*(1-.72*w)*(1-.1*Math.cos(f));
    var bx=cbx+ux*pu+vx*pv,by=cby+uy*pu+vy*pv;
    P[i*2]=mix(px,bx,m);P[i*2+1]=mix(py,by,m);
  }
  // точки печатаются на резине: растягиваются вместе с ней
  var sp=15*Math.pow(L,.9),dr=5*Math.pow(L,.9),D=[];
  for(var j=0;j<3;j++){
    var ox=cpx+(j-1)*sp,oy=cpy,bx2=cbx+(j-1)*sp-ux*B*.06,by2=cby-uy*B*.06;
    D.push([mix(ox,bx2,m),mix(oy,by2,m),dr]);
  }
  var cx=0,cy=0,top=1e9;for(i=0;i<NPT;i++){cx+=P[i*2];cy+=P[i*2+1];if(P[i*2+1]<top)top=P[i*2+1]}
  cx/=NPT;cy/=NPT;
  return {P:P,D:D,cx:cx,cy:cy,top:top,m:m,ux:ux,uy:uy,bx:mix(cpx,cbx,m),by:mix(cpy,cby,m),B:mix(hh,B,m)};
}
function restInfo(L,pw,mo){
  var S=restShape(L,pw,mo),r=0;
  for(var i=0;i<NPT;i++)r=Math.max(r,Math.hypot(S.P[i*2]-S.cx,S.P[i*2+1]-S.cy));
  return {cx:S.cx,cy:S.cy,r:r,top:S.top};
}
function slotOf(L){return YB-restInfo(L,PW0).top}

/* ─────────── полёт ───────────
   Воздух выходит через горлышко, тяга толкает тело от него. Ось крутит шумом (так шарик
   и рыскает), сопротивление воздуха большое, стены экрана мягкие. Размер сдувается
   по степени, тяга идёт от давления. В конце траектория плавно сводится к месту ответа. */
var FLY={D:1.2,TH:10500,DR:4.6,GR:1300,TQ:280,TC:.06,AD:3.4,KW:1100,CW:9,LG:.3,PWR:1.35};
function simFlight(seed,L0,pwEnd){
  var R=rng(seed),dt=1/1200,D=FLY.D,o={x:[],y:[],r:[],L:[],p:[],v:[],pw:[],SR:240,D:D};
  var c=restInfo(L0,PW0),x=c.cx,y=c.cy,vx=0,vy=0,rho=0,w=0,n=gauss(R)*.6;
  var steps=Math.round(D/dt);
  for(var s=0;s<=steps;s++){
    var tau=s*dt,q=Math.max(0,1-tau/D),L=1+(L0-1)*Math.pow(q,FLY.PWR),p=(L-1)/Math.max(.01,L0-1);
    var pw=mix(PW0,pwEnd,sm(seg(tau,D-.32,D))),mo=moAt(tau,D);
    var ri=restInfo(L,pw,mo),nx=N0.x-ri.cx,ny=N0.y-ri.cy,nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
    var co=Math.cos(rho),si=Math.sin(rho),wx=co*nx-si*ny,wy=si*nx+co*ny;
    var T=FLY.TH*(.22+.78*Math.pow(p,.55));
    var ax=-wx*T-FLY.DR*vx,ay=-wy*T-FLY.DR*vy+FLY.GR*(1-p);
    var rr=ri.r*.55,rx=ri.r*.78;
    if(x<rx+4){ax+=FLY.KW*(rx+4-x);if(vx<0)ax-=FLY.CW*vx}
    if(x>SW-4-rx){ax-=FLY.KW*(x-SW+4+rx);if(vx>0)ax-=FLY.CW*vx}
    if(y<YTOP+rr){ay+=FLY.KW*(YTOP+rr-y);if(vy<0)ay-=FLY.CW*vy}
    if(y>YB-rr*.7){ay-=FLY.KW*(y-YB+rr*.7);if(vy>0)ay-=FLY.CW*vy}
    n+=-n*dt/FLY.TC+Math.sqrt(2*dt/FLY.TC)*gauss(R);
    // маленький крутится легче: момент инерции падает быстрее тяги
    w+=(n*FLY.TQ*(.55+.9*(1-p))-FLY.AD*w)*dt;
    vx+=ax*dt;vy+=ay*dt;x+=vx*dt;y+=vy*dt;rho+=w*dt;
    if(s%5===0){o.x.push(x);o.y.push(y);o.r.push(rho);o.L.push(L);o.p.push(p);o.v.push(Math.hypot(vx,vy));o.pw.push(pw)}
  }
  var land=restInfo(1,pwEnd,0),N=o.x.length,rT=Math.round(o.r[N-1]/(2*Math.PI))*2*Math.PI;
  for(var i=0;i<N;i++){
    var b=eio(seg(i/o.SR,D-FLY.LG,D));
    o.x[i]=mix(o.x[i],land.cx,b);o.y[i]=mix(o.y[i],land.cy,b);o.r[i]=mix(o.r[i],rT,b);
  }
  return o;
}
// в полёте это всё ещё сдутый шарик, обратно в пилюлю он собирается только на посадке
function moAt(tau,D){return 1-sm(seg(tau,D-.3,D-.04))}
function flAt(o,tau){
  var m=clamp(tau*o.SR,0,o.x.length-1),i=Math.min(Math.floor(m),o.x.length-2),f=m-i;
  function g(a){return mix(a[i],a[i+1],f)}
  return {x:g(o.x),y:g(o.y),r:g(o.r),L:g(o.L),p:g(o.p),v:g(o.v),pw:g(o.pw)};
}

/* ─────────── раунд ───────────
   Один вопрос и один ответ. И автопоказ, и живой режим описывают раунд одними и теми же
   временами, а кадр считается из раунда и момента t. */
function Lat(R,t){
  var a=R.Lk;if(!a.length||t<=a[0][0])return a.length?a[0][1]:1;
  if(t>=a[a.length-1][0])return a[a.length-1][1];
  var lo=0,hi=a.length-1;while(hi-lo>1){var md=(lo+hi)>>1;if(a[md][0]<=t)lo=md;else hi=md}
  return mix(a[lo][1],a[hi][1],(t-a[lo][0])/(a[hi][0]-a[lo][0]));
}
function jigAt(R,t){var j=0;R.jig.forEach(function(q){var d=t-q[0];if(d>0&&d<1.2)j+=q[1]*Math.exp(-d*7)*Math.sin(2*Math.PI*5.6*d)});return j}
function burstAt(R,t){for(var i=R.bursts.length-1;i>=0;i--){var b=R.bursts[i];if(t>=b[0]&&(b[1]==null||t<b[1]))return b}return null}

var AUTO=null,TL={},CYCLE=6.6;
function buildAuto(){
  var R={tSend:0,tDel:.42,tRead:.8,tTI:.98,Lk:[],jig:[],bursts:[],word:NO,auto:true};
  var T=R.tTI,B=[[.26,.72,1,1,2.05],[.9,1.5,1,2.05,3.75],[1.6,1.9,-1,3.75,3.05],[2,2.84,1,3.05,8.8]];
  R.Lk.push([T,1]);
  B.forEach(function(b){
    var t0=T+b[0],t1=T+b[1];R.bursts.push([t0,t1,b[2]]);
    for(var t=t0;t<=t1+1e-9;t+=1/240){var p=seg(t,t0,t1),e=b[2]>0?mix(p,eio(p),.55):eout(p);R.Lk.push([t,mix(b[3],b[4],e)])}
    R.jig.push([t0,b[2]>0?.025:-.035]);R.jig.push([t1,b[2]>0?.055:.03]);
  });
  R.tStr=T+B[3][1];R.tRel=R.tStr+.3;
  R.Lk.push([R.tRel,9.1]);
  R.pw=wordW(R.word)/2;
  R.fl=simFlight(SEED||FLY.seed,Lat(R,R.tRel),R.pw);
  R.tLand=R.tRel+FLY.D;
  R.tTy0=R.tLand+.78;R.keys=[];var t=R.tTy0;
  for(var i=0;i<ASK.length;i++){R.keys.push(t);t+=.024+((i*7)%5)*.004+(ASK[i]===' '?.018:0)}
  R.tTy1=t;R.tNext=t+.17;
  CYCLE=R.tNext;
  TL={TI:R.tTI,REL:R.tRel,LAND:R.tLand,TY0:R.tTy0,CYCLE:CYCLE,bursts:R.bursts};
  AUTO=R;
}
FLY.seed=176;

/* ─────────── кадр из раунда ─────────── */
function frame(R,t,hist){
  var F={qe:0,lb0:0,lbRead:0,lbOld:0,slotH:0,bal:null,replyDom:false,word:R.word,hist:hist,field:{n:0,caret:0,send:0,press:0}};
  F.qe=eout(seg(t,R.tSend,R.tSend+.4));
  F.lbOld=1-eout(seg(t,R.tSend,R.tSend+.26));
  F.lb0=R.tDel!=null?eout(seg(t,R.tDel,R.tDel+.24)):0;
  F.lbRead=R.tRead!=null?sm(seg(t,R.tRead-.05,R.tRead+.07)):0;
  // поле ввода: следующий вопрос набирается после ответа
  if(R.keys){
    var n=0;for(var i=0;i<R.keys.length;i++)if(t>=R.keys[i])n=i+1;
    F.field.n=n;F.field.send=n>0?1:0;
    F.field.caret=t>=R.tTy0-.32?(t<R.tTy1+.1||((t-R.tTy1)%1)<.55?1:0):0;
  }
  F.field.press=Math.max(pulse(t,R.tSend-.05,R.tSend+.02),R.tNext!=null?pulse(t,R.tNext-.05,R.tNext+.02):0);
  F.field.sendOut=1-seg(t,R.tSend,R.tSend+.14);

  if(R.tTI==null||t<R.tTI)return F;
  var pin=spring(t-R.tTI,.5,3.4);
  if(R.tRel==null||t<R.tRel){
    // надувается
    var L=Lat(R,t),b=burstAt(R,t),kp=0;
    if(b){var d=t-b[0],fe=sm(d/.08)*(b[1]==null?1:sm((b[1]-t)/.08));kp=b[2]*fe*(.5-.5*Math.cos(2*Math.PI*(b[2]>0?11:8.5)*d))}
    var Lv=L*(1+.022*kp);
    var st=R.tStr!=null?sm(seg(t,R.tStr,R.tStr+.12)):0;
    if(R.tPop!=null)st=0;
    F.slotH=slotOf(L)*pin;
    F.bal={L:Lv,pw:PW0,pin:pin,jig:jigAt(R,t),wr:0,st:st,fl:null,knot:pin,dOp:pin,dph:t,ddir:b?b[2]:1,tail:0,sq:0,wOp:0,t:t};
    if(R.tPop!=null&&t>=R.tPop)F.bal=null;
    if(R.tPop!=null){var hp=slotOf(Lat(R,R.tPop));if(t>=R.tPop)F.slotH=BH+(hp-BH)*(1-spring(t-R.tPop,.42,2.6))}
    if(R.tPop!=null&&t>=R.tPop){
      F.shreds={k:t-R.tPop,S:R.shreds};
      if(t>=R.tPop+.18){var e=spring(t-R.tPop-.18,.5,3.2);F.bal={L:1,pw:R.pw,pin:e,jig:0,wr:0,st:0,fl:null,knot:0,dOp:0,dph:t,ddir:1,tail:e,sq:0,wOp:sm(seg(t,R.tPop+.24,R.tPop+.38)),t:t}}
      if(t>=R.tPop+.6){F.bal=null;F.replyDom=true}
    }
    return F;
  }
  var hr=slotOf(Lat(R,R.tRel));
  F.slotH=BH+(hr-BH)*(1-spring(t-R.tRel,.42,2.6));
  if(t<R.tLand){
    var tau=t-R.tRel,fp=flAt(R.fl,tau);
    F.bal={L:fp.L,pw:fp.pw,mo:moAt(tau,R.fl.D),pin:1,jig:0,wr:.085*Math.pow(1-fp.p,.7)*(1-sm(seg(tau,R.fl.D-.22,R.fl.D))),st:0,
           fl:{x:fp.x,y:fp.y,r:fp.r},knot:1-sm(seg(t,R.tRel,R.tRel+.16)),dOp:1,dph:t,ddir:0,tail:0,sq:0,wOp:0,t:t,flt:tau};
    return F;
  }
  var dl=t-R.tLand;
  if(dl<.42){
    F.bal={L:1,pw:R.pw,pin:1,jig:0,wr:0,st:0,fl:null,knot:0,dOp:1-sm(dl/.07),dph:t,ddir:0,tail:sm(dl/.14),
           sq:.13*Math.exp(-dl*13)*Math.cos(dl*38),wOp:sm(seg(dl,.03,.14)),t:t};
    return F;
  }
  F.replyDom=true;
  return F;
}

/* ─────────── отрисовка ─────────── */
var BLUE=[10,124,255],INK=[13,13,14],RECV=[233,233,235],RECVH=[244,244,246];
function rgb(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+(a==null?1:a).toFixed(3)+')'}
function mixc(a,b,t){return [Math.round(mix(a[0],b[0],t)),Math.round(mix(a[1],b[1],t)),Math.round(mix(a[2],b[2],t))]}

function render(F){
  // лента снизу вверх: текущий обмен, под ним старые
  var y=YB,H=F.slotH,pr=c01(H/BH);
  var r0=y-H;y-=H+GQ*pr;
  y-=GL*F.lb0;var l0=y;
  y-=BH*F.qe;var q0=y;y-=GB*F.qe;
  var b0=BL[0];
  // свой вопрос вылетает из поля ввода
  var tx=MEX-QW,e=F.qe,qx=mix(FIELDTXT.x-15,tx,e),qy=mix(FIELDTXT.y-7,q0,e);
  set(b0.q,'transform','translate('+f2(qx)+'px,'+f2(qy)+'px)');
  set(b0.q,'visibility',F.qe>0?'visible':'hidden');
  var a=sm(e*2.4);
  set(b0.q,'background',a<.999?rgb(BLUE,a):'');
  set(b0.q,'color',a<.999?rgb(mixc(INK,[255,255,255],a)):'');
  set(b0.q.querySelector('.tail'),'opacity',a.toFixed(3));
  // ответ в ленте
  if(F.replyDom){
    if(b0.word!==F.word){b0.rt.textContent=F.word;b0.word=F.word}
    set(b0.r,'visibility','visible');set(b0.r,'transform','translate('+RX+'px,'+f2(YB-BH)+'px)');
  }else set(b0.r,'visibility','hidden');
  // метка доставки у текущего вопроса
  var lw=F.lbRead>.5?LW.r:LW.d,lt=F.lbRead>.5?'<b>Read</b> '+READ_AT:'Delivered';
  if(LBA.__t!==lt){LBA.innerHTML=lt;LBA.__t=lt}
  var lop=F.lb0*(1-Math.min(F.lbRead,1-F.lbRead)*2);
  set(LBA,'opacity',lop.toFixed(3));
  set(LBA,'transform','translate('+f2(MEX-lw)+'px,'+f2(l0+3)+'px)');
  // старые обмены
  for(var k=-1;k>=KMIN;k--){
    var B=BL[k],rt=y-BH;y=rt-GQ;
    if(k===-1){y-=GL*F.lbOld;set(LBB,'opacity',F.lbOld.toFixed(3));set(LBB,'transform','translate('+f2(MEX-LW.r)+'px,'+f2(y+3)+'px)')}
    var qt=y-BH;y=qt-GB;
    var w=F.hist[-k-1]||NO;if(B.word!==w){B.rt.textContent=w;B.word=w}
    var vis=rt>-60?'visible':'hidden';
    set(B.r,'visibility',vis);set(B.q,'visibility',qt>-60?'visible':'hidden');
    set(B.r,'transform','translate('+RX+'px,'+f2(rt)+'px)');
    set(B.q,'transform','translate('+f2(MEX-QW)+'px,'+f2(qt)+'px)');
  }
  drawBalloon(F.bal,F.shreds);
  // поле ввода
  var c=F.field;
  typedEl.textContent=ASK.slice(0,c.n);
  set(ph,'opacity',c.n>0?'0':'1');set(mic,'opacity',c.n>0?'0':'1');
  set(caret,'opacity',c.caret.toFixed(2));
  var so=c.n>0?1:c.sendOut;
  set(sendBtn,'opacity',so.toFixed(3));
  set(sendBtn,'transform','scale('+(1-.14*c.press).toFixed(3)+')');
}

var PATHBUF=[];
function drawBalloon(Bp,SH){
  drawShreds(SH);
  if(!Bp){set(shine,'visibility','hidden');set(skin,'visibility','hidden');set(knotG,'visibility','hidden');set(dotsG,'visibility','hidden');set(wordEl,'opacity','0');return}
  set(skin,'visibility','visible');set(dotsG,'visibility','visible');
  var S=restShape(Bp.L,Bp.pw,Bp.mo),P=S.P,cx=S.cx,cy=S.cy,ux=S.ux,uy=S.uy,t=Bp.t;
  var j=Bp.jig,wr=Bp.wr,pin=Bp.pin;
  var a1=t*23,a2=-t*31,a3=t*47;
  var X=new Float64Array(NPT),Y=new Float64Array(NPT);
  // дрожь перед тем, как отпустить: мелко и часто
  var sx=0,sy=0;
  if(Bp.st>0){sx=Bp.st*(.9*Math.sin(t*157)+.5*Math.sin(t*251+1));sy=Bp.st*(.9*Math.sin(t*181+2)+.5*Math.sin(t*229))}
  var co=1,si=0,ox=0,oy=0;
  if(Bp.fl){co=Math.cos(Bp.fl.r);si=Math.sin(Bp.fl.r);ox=Bp.fl.x;oy=Bp.fl.y}
  function place(px,py){
    // колыхание и морщины вокруг центра, горлышко держит узелок
    var dx=px-cx,dy=py-cy;
    // посадка: пузырь сплющивается о своё место
    if(Bp.sq){dx*=1+Bp.sq*.55;py=YB-(YB-py)*(1-Bp.sq);dy=py-cy}
    // появление: растёт из хвостика
    if(pin!==1){dx=(px-N0.x)*pin+N0.x-cx;dy=(py-N0.y)*pin+N0.y-cy}
    var X0,Y0;
    if(Bp.fl){X0=ox+co*dx-si*dy;Y0=oy+si*dx+co*dy}else{X0=cx+dx+sx;Y0=cy+dy+sy}
    return [X0,Y0];
  }
  for(var i=0;i<NPT;i++){
    var f=PHI[i],c=(1+Math.cos(f))/2,hold=1-Math.pow(c,4);
    var d=j*Math.cos(2*f)*hold+j*.3*Math.cos(3*f+1)*hold;
    if(wr)d+=wr*(.5*Math.sin(5*f+a1)+.38*Math.sin(7*f+a2)+.24*Math.sin(11*f+a3))*(1-.7*c*c);
    var px=cx+(P[i*2]-cx)*(1+d),py=cy+(P[i*2+1]-cy)*(1+d);
    var q=place(px,py);X[i]=q[0];Y[i]=q[1];
  }
  // мягкие стены экрана: шарик расплющивается о край
  for(i=0;i<NPT;i++){X[i]=softMin(softMax(X[i],4,11),SW-4,11);Y[i]=softMin(Y[i],784,9)}
  var dstr='M'+X[0].toFixed(2)+','+Y[0].toFixed(2);
  for(i=0;i<NPT;i++){
    var i0=(i-1+NPT)%NPT,i2=(i+1)%NPT,i3=(i+2)%NPT;
    dstr+='C'+(X[i]+(X[i2]-X[i0])/6).toFixed(2)+','+(Y[i]+(Y[i2]-Y[i0])/6).toFixed(2)+' '+(X[i2]-(X[i3]-X[i])/6).toFixed(2)+','+(Y[i2]-(Y[i3]-Y[i])/6).toFixed(2)+' '+X[i2].toFixed(2)+','+Y[i2].toFixed(2);
  }
  dstr+='Z';
  // хвостик ответа после посадки
  if(Bp.tail>0){
    var k=Bp.tail,bx=RX-6,by=YB-20;
    dstr+=TAILP.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g,function(_,a,b){var p=place(bx+(+a),by+(+b));return mix(N0.x,p[0],k).toFixed(2)+','+mix(N0.y,p[1],k).toFixed(2)});
  }
  skin.setAttribute('d',dstr);
  // растянутая резина светлеет
  var stv=sm((Bp.L-1)/6.4);
  skin.style.fill=rgb(mixc(RECV,RECVH,stv*.45));
  // блик на натянутой резине: свет сверху слева, поэтому блик не крутится вместе с шариком
  var sa=SHINE*m01(S.m)*sm((Bp.L-1.6)/3.2)*Math.min(1,Bp.pin);
  if(sa>.004){
    var bc=place(S.bx,S.by),Rb=S.B*(Bp.fl?1:pin),hx=bc[0]-Rb*.5,hy=bc[1]-Rb*.48,la=Rb*.26,lb=Rb*.085,ca=Math.cos(-.85),sn=Math.sin(-.85),hs='';
    for(var e=0;e<24;e++){var th=2*Math.PI*e/24,ex=la*Math.cos(th),ey=lb*Math.sin(th)*(1+.35*Math.cos(th));hs+=(e?'L':'M')+(hx+ca*ex-sn*ey).toFixed(2)+','+(hy+sn*ex+ca*ey).toFixed(2)}
    shine.setAttribute('d',hs+'Z');shine.setAttribute('opacity',sa.toFixed(3));set(shine,'visibility','visible');
  }else set(shine,'visibility','hidden');
  // узелок
  if(Bp.knot>0){
    set(knotG,'visibility','visible');
    var kq=place(K1.x,K1.y),kr=place(K2.x,K2.y),ks=Bp.knot;
    if(Bp.fl){kq=[K1.x,K1.y];kr=[K2.x,K2.y]}
    k1.setAttribute('cx',kq[0].toFixed(2));k1.setAttribute('cy',kq[1].toFixed(2));k1.setAttribute('r',(K1.r*ks*(Bp.fl?1:Math.min(1,pin))).toFixed(2));
    k2.setAttribute('cx',kr[0].toFixed(2));k2.setAttribute('cy',(kr[1]+(Bp.fl?6*(1-ks):0)).toFixed(2));k2.setAttribute('r',(K2.r*Math.sqrt(ks)*(Bp.fl?1:Math.min(1,pin))).toFixed(2));
  }else set(knotG,'visibility','hidden');
  // три точки: волна по очереди, при стирании идёт обратно
  var dop=Bp.dOp*(1-.35*stv);
  S.D.forEach(function(D0,n){
    var q=place(D0[0],D0[1]);
    var idx=Bp.ddir<0?2-n:n,ph=((Bp.dph*1.35-idx*.17)%1+1)%1,bump=ph<.42?Math.pow(Math.sin(Math.PI*ph/.42),2):0;
    var o=(.42+.58*bump)*dop,el=DOTS[n];
    el.setAttribute('cx',q[0].toFixed(2));el.setAttribute('cy',q[1].toFixed(2));el.setAttribute('r',(D0[2]*(Bp.fl?1:pin)*(1+.06*bump)).toFixed(2));
    el.setAttribute('opacity',o.toFixed(3));
  });
  // слово ответа
  set(wordEl,'opacity',Bp.wOp.toFixed(3));
  if(Bp.wOp>0){
    if(wordEl.textContent!==F_word)wordEl.textContent=F_word;
    set(wordEl,'transform','translate('+f2(RX+15)+'px,'+f2(YB-BH+7+Bp.sq*12)+'px)');
  }
}
var F_word=NO,SHINE=.8,shine=document.getElementById('shine');
function m01(v){return c01(v)}
function softMax(x,lo,k){return lo+k*Math.log(1+Math.exp((x-lo)/k))}
function softMin(x,hi,k){return hi-k*Math.log(1+Math.exp((hi-x)/k))}

/* лопнул (только в живом режиме): клочья резины разлетаются */
function makeShreds(R,L,seed){
  var S=restShape(L,PW0),rn=rng(seed),out=[];
  for(var i=0;i<11;i++){
    var k=Math.floor(rn()*NPT),x=S.P[k*2],y=S.P[k*2+1],dx=x-S.cx,dy=y-S.cy,dl=Math.hypot(dx,dy)||1,sp=380+rn()*520;
    out.push({x:x,y:y,vx:dx/dl*sp+(rn()-.5)*120,vy:dy/dl*sp-120*rn(),a:rn()*6,w:(rn()-.5)*28,s:8+rn()*12,sh:rn()});
  }
  return out;
}
function drawShreds(SH){
  if(!SH){if(shredsG.childNodes.length)shredsG.innerHTML='';return}
  var t=SH.k;
  if(t>.7){if(shredsG.childNodes.length)shredsG.innerHTML='';return}
  if(shredsG.childNodes.length!==SH.S.length){shredsG.innerHTML='';SH.S.forEach(function(){shredsG.appendChild(document.createElementNS('http://www.w3.org/2000/svg','path'))})}
  SH.S.forEach(function(s,i){
    var dr=Math.exp(-3*t),x=s.x+s.vx*(1-dr)/3,y=s.y+s.vy*(1-dr)/3+900*t*t,a=s.a+s.w*t,z=s.s*(1-sm(seg(t,.35,.7)));
    var p=shredsG.childNodes[i];
    p.setAttribute('d','M'+(-z*.6)+','+(-z*.3)+'Q0,'+(-z*.7)+' '+(z*.55)+','+(-z*.2)+'L'+(z*.3)+','+(z*.45)+'Q'+(-z*.1)+','+(z*.2)+' '+(-z*.6)+','+(-z*.3)+'Z');
    p.setAttribute('transform','translate('+x.toFixed(2)+','+y.toFixed(2)+') rotate('+(a*57.3).toFixed(1)+')');
  });
}

/* ─────────── автопоказ ─────────── */
var AUTOHIST=[NO,NO,NO,NO,NO,NO,NO];
function scene(u){F_word=AUTO.word;return frame(AUTO,u,AUTOHIST)}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function raspCurve(o){
  // кривая для звука сдувания: давление и скорость по 100 точкам в секунду
  var n=Math.round(o.D*100),P=[],V=[];
  for(var i=0;i<=n;i++){var f=flAt(o,i/100);P.push(f.p);V.push(f.v)}
  return {p:P,v:V,D:o.D};
}
function buildEvents(){
  var R=AUTO;EVENTS=[];
  EVENTS.push([R.tSend+.01,'send']);
  EVENTS.push([R.tTI+.02,'blip']);
  R.bursts.forEach(function(b,i){
    var L0=Lat(R,b[0]+.001),L1=Lat(R,b[1]-.001);
    if(b[2]>0)EVENTS.push([b[0],'puff',b[1]-b[0],L0,L1,i]);else EVENTS.push([b[0],'leak',b[1]-b[0],L0,L1]);
  });
  EVENTS.push([R.tStr,'strain',R.tRel-R.tStr]);
  EVENTS.push([R.tRel,'untie']);
  EVENTS.push([R.tRel+.005,'rasp',raspCurve(R.fl)]);
  EVENTS.push([R.tLand,'land']);
  R.keys.forEach(function(t,i){EVENTS.push([t,'key',i])});
  EVENTS.push([R.tNext-.04,'press']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Держишь палец на экране: вопрос уходит, Alex печатает, пока держишь. Отпускаешь: черновик
   стирают, шарик улетает, ответ зависит от того, сколько надули. Передержишь: лопнет. */
var mode='auto',LV=null,LPOP=9.4;
function nowS(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var n=nowS(),u=uNow(),base=n-u,A=AUTO,R;
  // живой раунд собирается из текущего кадра автопоказа, без скачка
  R={tSend:base+A.tSend,tDel:base+A.tDel,tRead:base+A.tRead,tTI:base+A.tTI,Lk:[],jig:[],bursts:[],word:A.word,pw:A.pw};
  if(u<A.tRel){
    A.Lk.forEach(function(q){if(q[0]<=u)R.Lk.push([base+q[0],q[1]])});
    if(!R.Lk.length)R.Lk.push([base+A.tTI,1]);
    A.jig.forEach(function(q){if(q[0]<=u)R.jig.push([base+q[0],q[1]])});
    A.bursts.forEach(function(b){if(b[0]<=u)R.bursts.push([base+b[0],Math.min(b[1],u)+base,b[2]])});
    R.Lk.push([n,Lat(A,u)]);
    if(u>=A.tStr)R.tStr=base+A.tStr;
  }else{
    R.Lk=A.Lk.map(function(q){return [base+q[0],q[1]]});R.jig=[];R.bursts=[];
    R.tRel=base+A.tRel;R.fl=A.fl;R.tLand=base+A.tLand;R.tStr=base+A.tStr;
    R.relL=Lat(A,A.tRel);
    if(u>=A.tTy0){R.tTy0=base+A.tTy0;R.keys=A.keys.map(function(k){return base+k});R.tTy1=base+A.tTy1}
  }
  LV={R:R,hist:AUTOHIST.slice(),hold:false,lastPuff:0};
  mode='live';document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function roundDone(R){return R.tLand!=null||R.tPop!=null}
function newRound(n){
  var R=LV.R;
  LV.hist.unshift(R.word);LV.hist.length=8;
  // поле дописывается мгновенно, если ещё не успело
  LV.R={tSend:n,tDel:n+.28,tRead:n+.5,tTI:n+.62,Lk:[[n+.62,1]],jig:[],bursts:[],word:NO};
  Sound.play([0,'press']);Sound.play([0,'send'],.01);Sound.play([0,'blip'],.63);
}
function pressDown(){
  Sound.start();goLive();
  var n=nowS(),R=LV.R;
  if(R.tRel!=null&&n<R.tLand+.25)return;
  if(R.tPop!=null&&n<R.tPop+.5)return;
  if(roundDone(R))newRound(n);
  LV.hold=true;LV.holdT=n;
}
function pressUp(){
  if(!LV||!LV.hold)return;
  LV.hold=false;
  var n=nowS(),R=LV.R,b=R.bursts[R.bursts.length-1];
  if(b&&b[1]==null){b[1]=n;R.jig.push([n,.05]);R.Lk.push([n,Lat(R,n)])}
  var L=Lat(R,n);
  if(R.tRel==null&&R.tPop==null&&L>=1.3){
    // отпустили: черновик стирают, шарик улетает
    R.tStr=n;R.tRel=n+.12;R.Lk.push([R.tRel,L*1.01]);
    R.word=L<2.4?'no lol':NO;R.pw=wordW(R.word)/2;
    R.fl=simFlight(1+Math.floor(Math.random()*1e6),L*1.01,R.pw);R.tLand=R.tRel+R.fl.D;
    Sound.play([0,'strain',.12]);Sound.play([0,'untie'],.12);Sound.play([0,'rasp',raspCurve(R.fl)],.125);
    LV.landSnd=R.tLand;
  }
}
function liveStep(n,dt){
  var R=LV.R;
  if(LV.hold&&R.tTI!=null&&n>=R.tTI+.12&&R.tRel==null&&R.tPop==null){
    var b=R.bursts[R.bursts.length-1];
    if(!b||b[1]!=null){R.bursts.push([n,null,1]);R.jig.push([n,.025])}
    var L=Lat(R,n),rate=.9+.42*L;
    L=Math.min(LPOP,L+rate*dt);R.Lk.push([n,L]);
    if(n-LV.lastPuff>.26){LV.lastPuff=n;Sound.play([0,'puff',.34,L,L+rate*.3,Math.floor(n*7)%4])}
    if(L>=LPOP){
      // лопнул
      R.bursts[R.bursts.length-1][1]=n;R.tPop=n;R.word='i’m fine.';R.pw=wordW(R.word)/2;R.shreds=makeShreds(R,L,Math.floor(n*1000));
      LV.hold=false;Sound.play([0,'pop']);
      LV.landSnd=n+.18;
    }
  }
  if(LV.landSnd!=null&&n>=LV.landSnd){Sound.play([0,'land']);LV.landSnd=null}
  // ответ пришёл: следующий вопрос набирается сам и ждёт, пока его отправят
  var tl=R.tLand!=null?R.tLand:R.tPop!=null?R.tPop+.18:null;
  if(tl!=null&&!R.keys&&n>tl+.7){
    R.tTy0=n;R.keys=[];var t=n;for(var i=0;i<ASK.length;i++){R.keys.push(t);t+=.024+((i*7)%5)*.004+(ASK[i]===' '?.018:0)}R.tTy1=t;
    R.keys.forEach(function(k,i){Sound.play([0,'key',i],k-n)});
  }
}

/* ввод */
var S=1;
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();screenEl.setPointerCapture(e.pointerId);pressDown()});
screenEl.addEventListener('pointerup',function(){pressUp()});
screenEl.addEventListener('pointercancel',function(){pressUp()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();pressDown()}
});
addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();pressUp()}});
addEventListener('blur',function(){pressUp()});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Hold the screen while Alex types, then let go':'Hold the screen or Space while Alex types, then let go';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(scene(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();
    liveStep(n,dt);
    F_word=LV.R.word;
    render(frame(LV.R,n,LV.hist));
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;goAuto()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var cs=getComputedStyle(document.documentElement);
  BLUE=hex(cs.getPropertyValue('--blue'));INK=hex(cs.getPropertyValue('--ink'));
  RECV=hex(cs.getPropertyValue('--recv'));RECVH=hex(cs.getPropertyValue('--recv-hi'));
  SHINE=+cs.getPropertyValue('--shine')||.8;
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?w*.83/424:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};
window.__sim=function(seed){return simFlight(seed,9.1,wordW(NO)/2)};

function init(){fit();measure();buildAuto();buildEvents();window.__TL=TL}
function boot(){
  init();
  addEventListener('resize',function(){fit()});
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(scene(((PH%CYCLE)+CYCLE)%CYCLE));
  requestAnimationFrame(tick);
}
// шрифт системный, при записи ждать загрузки шрифтов не нужно
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
