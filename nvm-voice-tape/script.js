/* ─────────── Nvm ───────────
   Спрашиваешь «how was your day?». Alex записывает голосовое, и волна выезжает из пузыря
   лентой, как чек из кассы: змейкой через весь экран, переписка уезжает вверх, поле ввода
   выдавливает вниз. На 7:48 запись кончается, и лента втягивается обратно рулеткой:
   складки распрямляются по очереди, хвост хлещет и щёлкает о пузырь. Следом приходит «nvm».
   Выше в истории каждый раз одно и то же.
   Автопоказ рисуется из одного времени t: рулетка считается один раз заранее и проигрывается
   по t, поэтому петля замыкается без шва. В живом режиме зритель держит палец, пока Alex
   говорит, и отпускает. */

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
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: z затухание, f частота в Гц
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

var ASK='how was your day?',WORD='nvm',READ_AT='4:47 PM',DUR=468;

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,YB=768,RX=20,MEX=382,BH=40,VH=44,GQ=12,GV=4,GX=16,GL=21;
var FIELDTXT={x:64+16,y:786+9};
// лента: толщина, шаг рядов, радиус разворота, края рядов, пузырь записи и готового голосового
var TP={w:38,pitch:48,r:24,xl:46,xr:356,bw:118,vw:246,sp:4,slk:1.12,v0:1500,acc:30000,free:.26,SMAX:556,PMAX:92,bar:6};
var VY=YB-VH,CY=YB-VH/2,AX=RX+TP.bw-18;
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z',TAIL=new Path2D(TAILP);
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

/* змейка: ряд через весь экран, разворот полукругом вниз, ряды чуть гуляют по высоте.
   Путь хранится с шагом 1 pt по длине, d = 0 у горлышка пузыря */
var PATH,PN,NEED,SMF,LMAX;
function buildPath(){
  var R=rng(23),pts=[],x=AX,y=CY,dir=1,i;
  for(var row=0;row<22;row++){
    var xe=dir>0?TP.xr:TP.xl,ye=y+(R()*2-1)*1.6,n=Math.ceil(Math.abs(xe-x)/.5);
    for(i=0;i<n;i++)pts.push(mix(x,xe,i/n),mix(y,ye,i/n));
    x=xe;y=ye;var m=Math.ceil(Math.PI*TP.r/.5);
    for(i=0;i<m;i++){var a=Math.PI*i/m;pts.push(x+dir*TP.r*Math.sin(a),y+TP.r-TP.r*Math.cos(a))}
    y+=2*TP.r;dir=-dir;
  }
  pts.push(x,y);
  var out=[pts[0],pts[1]],acc=0,need=1;
  for(i=2;i<pts.length;i+=2){
    var ax=pts[i-2],ay=pts[i-1],bx=pts[i],by=pts[i+1],d=Math.hypot(bx-ax,by-ay);
    while(acc+d>=need){var f=(need-acc)/d;out.push(mix(ax,bx,f),mix(ay,by,f));need++}
    acc+=d;
  }
  PATH=new Float32Array(out);PN=out.length/2;
  // сколько ленте не хватает места снизу: столько прокручивается переписка
  NEED=new Float32Array(PN);var my=-1e9;
  for(i=0;i<PN;i++){my=Math.max(my,PATH[i*2+1]);NEED[i]=my+TP.w/2+6-776}
  // прокрутка идёт ровно, а не ступеньками на разворотах: среднее по окну в ряд длиной
  var pre=new Float64Array(PN+1);for(i=0;i<PN;i++)pre[i+1]=pre[i]+NEED[i];
  SMF=new Float32Array(PN);var Wn=200;
  for(i=0;i<PN;i++){var lo=Math.max(0,i-Wn),hi=Math.min(PN,i+Wn+1);SMF[i]=(pre[hi]-pre[lo])/(hi-lo)}
  LMAX=PN-1;for(i=0;i<PN;i++)if(SMF[i]>=TP.SMAX+TP.PMAX-6){LMAX=i;break}
}
function pathAt(d,o){d=clamp(d,0,PN-1.001);var i=Math.floor(d),f=d-i;o.x=mix(PATH[i*2],PATH[i*2+2],f);o.y=mix(PATH[i*2+1],PATH[i*2+3],f);return o}
function scrollOf(L){var v=SMF[clamp(Math.floor(L),0,PN-1)];return{S:clamp(v,0,TP.SMAX),P:clamp(v-TP.SMAX,0,TP.PMAX)}}

/* ─────────── речь ───────────
   Слоги разложены по длине ленты, а не по времени: столбик волны появляется у горлышка
   ровно тогда, когда звучит его слог. Между словами паузы, иногда вдох. */
var SYL=[],BARS;
function buildSpeech(){
  var R=rng(77),m=8,w=0,wl=2+Math.floor(R()*3);
  while(m<PN+400){
    var len=74+R()*52,a=.5+.5*R();
    SYL.push({m0:m,m1:m+len,a:a,v:Math.floor(R()*5),f:.9+.25*R(),g:R()*2-1});
    m+=len;w++;
    if(w>=wl){m+=R()<.18?58+R()*30:24+R()*22;w=0;wl=2+Math.floor(R()*3)}
  }
  // высота столбиков: огибающая слога и разброс внутри
  var nb=Math.ceil((PN+400)/TP.bar);BARS=new Float32Array(nb);var k=0,R2=rng(5);
  for(var j=0;j<nb;j++){
    var mm=j*TP.bar;while(k<SYL.length-1&&SYL[k].m1<mm)k++;
    var s=SYL[k],e=0;
    if(mm>=s.m0&&mm<=s.m1){var u=(mm-s.m0)/(s.m1-s.m0);e=s.a*Math.pow(Math.sin(Math.PI*u),.55)}
    BARS[j]=e>0?3+25*e*(.45+.55*R2()):2.4+R2()*1.2;
  }
}
function barAt(m){return BARS[clamp(Math.round(m/TP.bar),0,BARS.length-1)]}

/* ─────────── рулетка ───────────
   Голова ленты втягивается в пузырь с ускорением. Нить только тянет, лента лежит с запасом,
   поэтому складки распрямляются по очереди. Трения нет, инерцию даём только последней четверти:
   там хвост хлещет. Кадры по 1/120 с, проигрываются по t. */
function simReel(L){
  var sp=TP.sp,rest=sp*TP.slk,N=Math.floor(L/sp)+1,x=new Float64Array(N),y=new Float64Array(N),px=new Float64Array(N),py=new Float64Array(N),o={x:0,y:0};
  for(var i=0;i<N;i++){pathAt(L-i*sp,o);x[i]=px[i]=o.x;y[i]=py[i]=o.y}
  var SUB=960,dt=1/SUB,fr=[],Lt=(N-1)*rest+(L-(N-1)*sp),R=0,v=TP.v0,step=0;
  for(;;){
    v+=TP.acc*dt;R+=v*dt;
    var k=Math.ceil((Lt-R)/rest)-1;if(k<0)break;
    var e=Lt-k*rest-R,fk=k/N,damp=fk>TP.free?0:mix(.9995,0,fk/TP.free);
    for(i=0;i<k;i++){var vx=(x[i]-px[i])*damp,vy=(y[i]-py[i])*damp;px[i]=x[i];py[i]=y[i];x[i]+=vx;y[i]+=vy}
    var dx=x[k]-AX,dy=y[k]-CY,dl=Math.hypot(dx,dy)||1,q=Math.min(dl,e)/dl;
    x[k]=AX+dx*q;y[k]=CY+dy*q;px[k]=x[k];py[k]=y[k];
    for(var it=0;it<2;it++)for(i=k-1;i>=0;i--){
      var ex=x[i]-x[i+1],ey=y[i]-y[i+1],d=Math.hypot(ex,ey);
      if(d>rest){var f=rest/d;x[i]=x[i+1]+ex*f;y[i]=y[i+1]+ey*f}
    }
    if(step%8===0){var a=new Float32Array((k+1)*2);for(i=0;i<=k;i++){a[i*2]=x[i];a[i*2+1]=y[i]}fr.push(a)}
    step++;
  }
  return {fr:fr,TR:fr.length/120,L:L,N:N};
}
// когда кусок ленты с материалом m уходит в горлышко (для звука перемотки)
function reelTimeOf(L,m){var r=(L-m)*TP.slk,a=TP.acc/2,b=TP.v0;return(-b+Math.sqrt(b*b+4*a*r))/(2*a)}

/* ─────────── раунд ───────────
   Один вопрос, одно голосовое, один ответ. Автопоказ и живой режим описывают раунд одними
   и теми же временами, а кадр считается из раунда и момента t. */
function Lat(R,t){
  var a=R.Lk;if(!a.length||t<=a[0][0])return 0;
  if(t>=a[a.length-1][0])return a[a.length-1][1];
  var lo=0,hi=a.length-1;while(hi-lo>1){var md=(lo+hi)>>1;if(a[md][0]<=t)lo=md;else hi=md}
  return mix(a[lo][1],a[hi][1],(t-a[lo][0])/(a[hi][0]-a[lo][0]));
}
function typeKeys(R,t0){R.tTy0=t0;R.keys=[];var t=t0;for(var i=0;i<ASK.length;i++){R.keys.push(t);t+=.027+((i*7)%5)*.005+(ASK[i]===' '?.02:0)}R.tTy1=t}
function finishRound(R,tStop){
  R.tStop=tStop;R.Lf=Lat(R,tStop);R.sim=R.Lf>=LMAX-1&&SIMMAX?SIMMAX:simReel(R.Lf);
  R.tSnap=tStop+.24;R.tClack=R.tSnap+R.sim.TR;R.tNvm=R.tClack+.6;
}
var AUTO=null,SIMMAX=null,TL={},CYCLE=7.5;
function buildAuto(){
  var R={tSend:0,tDel:.4,tRead:.72,tBub:.86,r0:1.02,r1:4.62,Lk:[],auto:true};
  for(var t=R.r0;t<=R.r1+1e-9;t+=1/240){var p=seg(t,R.r0,R.r1);R.Lk.push([t,LMAX*mix(p,p*p,.22)])}
  R.Lk.push([R.r1+1e-6,LMAX]);
  SIMMAX=simReel(LMAX);
  finishRound(R,R.r1+1e-5);
  typeKeys(R,R.tNvm+.62);
  R.tNext=R.tTy1+.18;CYCLE=R.tNext;
  TL={BUB:R.tBub,R0:R.r0,STOP:R.tStop,SNAP:R.tSnap,CLACK:R.tClack,NVM:R.tNvm,CYCLE:CYCLE};
  AUTO=R;
}

/* ─────────── кадр из раунда ─────────── */
function frame(R,t){
  var F={t:t,qe:0,lbOld:0,lb0:0,lbRead:0,sV:0,sN:0,L:0,ph:'none',S:0,P:0,shake:0,jolt:0,morph:0,rec:false,vu:0,field:{n:0,caret:0,send:0,press:0,sendOut:1}};
  F.qe=eout(seg(t,R.tSend,R.tSend+.4));
  F.lbOld=1-eout(seg(t,R.tSend,R.tSend+.26));
  F.lb0=R.tDel!=null?eout(seg(t,R.tDel,R.tDel+.24)):0;
  F.lbRead=R.tRead!=null?sm(seg(t,R.tRead-.05,R.tRead+.07)):0;
  if(R.keys){
    var n=0;for(var i=0;i<R.keys.length;i++)if(t>=R.keys[i])n=i+1;
    F.field.n=n;F.field.caret=t>=R.tTy0-.32?(t<R.tTy1+.1||((t-R.tTy1)%1)<.55?1:0):0;
  }
  F.field.press=Math.max(pulse(t,R.tSend-.05,R.tSend+.02),R.tNext!=null?pulse(t,R.tNext-.05,R.tNext+.02):0);
  F.field.sendOut=1-seg(t,R.tSend,R.tSend+.14);
  if(R.tBub==null||t<R.tBub)return F;
  F.sV=spring(t-R.tBub,.5,3.2);
  if(R.tStop==null||t<R.tStop){
    F.ph='rec';F.rec=true;F.L=Lat(R,t);var s=scrollOf(F.L);F.S=s.S;F.P=s.P;
    F.vu=vuAt(F.L);return F;
  }
  var s0=scrollOf(R.Lf);F.L=R.Lf;
  if(t<R.tSnap){F.ph='hold';F.S=s0.S;F.P=s0.P;F.hold=t-R.tStop;return F}
  if(t<R.tClack){F.ph='reel';F.S=s0.S;F.P=s0.P;F.reel=t-R.tSnap;return F}
  F.ph='done';var dc=t-R.tClack,k=1-spring(dc-.03,.72,1.55);
  F.S=Math.max(-16,s0.S*k);F.P=s0.P*k;
  F.shake=dc;F.jolt=dc;F.morph=eout(seg(dc,.05,.36));
  if(R.tNvm!=null&&t>=R.tNvm)F.sN=spring(t-R.tNvm,.5,3.2);
  return F;
}
// громкость у горлышка: красная точка дышит в такт речи
function vuAt(L){
  for(var i=0;i<SYL.length;i++){var s=SYL[i];if(L<s.m0)return 0;if(L<=s.m1)return s.a*Math.sin(Math.PI*(L-s.m0)/(s.m1-s.m0))}
  return 0;
}

/* ─────────── отрисовка ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),COL={},KDPR=1;
var compEl=document.getElementById('comp'),typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),phEl=document.getElementById('ph'),mic=document.getElementById('mic'),sendBtn=document.getElementById('send');
var QW=0,LW={};
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt,ls){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
function measure(){
  setFont(21);QW=ctx.measureText(ASK).width+30;
  setFont(13,600);LW.rb=ctx.measureText('Read ').width;setFont(13);LW.r=LW.rb+ctx.measureText(READ_AT).width;LW.d=ctx.measureText('Delivered').width;
  setFont(21);LW.nvm=ctx.measureText(WORD).width+30;
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function bubble(x,y,w,h,me,col,tail){
  ctx.fillStyle=col;rr(x,y,w,h,Math.min(20,h/2));ctx.fill();
  if(tail>0){
    ctx.save();ctx.globalAlpha*=tail;
    if(me){ctx.translate(x+w+6,y+h-20);ctx.scale(-1,1)}else ctx.translate(x-6,y+h-20);
    ctx.fill(TAIL);ctx.restore();
  }
}
function textMsg(x,y,s,me,tail,bg,ink){
  setFont(21);var w=ctx.measureText(s).width+30;
  bubble(x,y,w,BH,me,bg||(me?COL.blue:COL.recv),tail);
  ctx.fillStyle=ink||(me?'#fff':COL.ink);ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(s,x+15,y+BH/2+1);
  return w;
}
function clock(sec){sec=Math.floor(sec);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
// цифры таймера одной ширины, чтобы он не дёргался
function tabText(s,x,y,sz,wt,col){
  setFont(sz,wt,0);var dw=ctx.measureText('0').width,cw=ctx.measureText(':').width;ctx.fillStyle=col;ctx.textBaseline='middle';ctx.textAlign='center';
  for(var i=0;i<s.length;i++){var c=s[i],w=c===':'?cw:dw;ctx.fillText(c,x+w/2,y);x+=w}
}
// готовое голосовое: значок, сжатая волна той же ленты, длительность
function voiceContent(x,y,L){
  ctx.fillStyle=COL.ink;ctx.beginPath();ctx.moveTo(x+17,y+14);ctx.lineTo(x+30,y+22);ctx.lineTo(x+17,y+30);ctx.closePath();ctx.fill();
  ctx.strokeStyle=COL.bar;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();
  var n=27,x0=x+46,x1=x+182;
  for(var i=0;i<n;i++){
    var m0=i/n*L,m1=(i+1)/n*L,hmax=0;for(var m=m0;m<m1;m+=TP.bar)hmax=Math.max(hmax,barAt(m));
    var h=Math.max(3,hmax*.78),bx=mix(x0,x1,i/(n-1));ctx.moveTo(bx,y+22-h/2);ctx.lineTo(bx,y+22+h/2);
  }
  ctx.stroke();
  setFont(15,400,0);ctx.fillStyle=COL.sub;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(clock(DUR*L/LMAX),x+TP.vw-15,y+22.5);
}
var _o={x:0,y:0},_a={x:0,y:0},_b={x:0,y:0},RXS=new Float32Array(8000),RYS=new Float32Array(8000);
function ribbonStroke(n){
  ctx.strokeStyle=COL.recv;ctx.lineWidth=TP.w;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(RXS[0],RYS[0]);for(var i=1;i<n;i++)ctx.lineTo(RXS[i],RYS[i]);ctx.stroke();
}
function barsBegin(){ctx.strokeStyle=COL.bar;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath()}
function barLine(x,y,tx,ty,h){var tl=Math.hypot(tx,ty)||1,nx=-ty/tl*h/2,ny=tx/tl*h/2;ctx.moveTo(x-nx,y-ny);ctx.lineTo(x+nx,y+ny)}

// лента во время записи: лежит по змейке, новый материал выходит из горлышка
function drawTapeRec(L,dy,t,shiver){
  if(L<1)return;
  var n=0;
  for(var d=0;d<L;d+=3){pathAt(d,_o);RXS[n]=_o.x;RYS[n]=_o.y+dy;n++}
  pathAt(L,_o);RXS[n]=_o.x;RYS[n]=_o.y+dy;n++;
  if(shiver){for(var i=0;i<n;i++)RYS[i]+=shiver*Math.sin(t*95+i*.21)}
  ribbonStroke(n);
  barsBegin();
  for(var j=0;j*TP.bar<L-10;j++){
    var m=j*TP.bar,dd=L-m;
    pathAt(dd,_o);pathAt(dd-1,_a);pathAt(dd+1,_b);
    var yy=_o.y+dy+(shiver?shiver*Math.sin(t*95+dd/3*.21):0);
    barLine(_o.x,yy,_b.x-_a.x,_b.y-_a.y,BARS[j]);
  }
  ctx.stroke();
}
// лента во время перемотки: кадры симуляции, в последней четверти хвост хлещет
function drawTapeReel(sim,tau){
  var F=sim.fr[Math.min(sim.fr.length-1,Math.floor(tau*120))],k=F.length/2-1;
  var r=k/sim.N,lash=r<.3?38*Math.pow(1-r/.3,1.4):0,n=0;
  for(var i=0;i<=k;i++){
    var x=F[i*2],y=F[i*2+1];
    if(lash>0&&i<k){
      var j=Math.min(i+1,k),i0=Math.max(0,i-1),tx=F[j*2]-F[i0*2],ty=F[j*2+1]-F[i0*2+1],tl=Math.hypot(tx,ty)||1;
      var o=lash*Math.exp(-i*TP.sp/150)*Math.sin(i*.07-tau*46);x+=-ty/tl*o;y+=tx/tl*o;
    }
    RXS[n]=x;RYS[n]=y;n++;
  }
  RXS[n]=AX;RYS[n]=CY;n++;
  ribbonStroke(n);
  barsBegin();
  for(var b=0;;b++){
    var mm=b*TP.bar/TP.sp,ii=Math.floor(mm);if(ii>=k)break;
    var f=mm-ii,x0=mix(RXS[ii],RXS[ii+1],f),y0=mix(RYS[ii],RYS[ii+1],f);
    barLine(x0,y0,RXS[ii+1]-RXS[ii],RYS[ii+1]-RYS[ii],BARS[b]);
  }
  ctx.stroke();
}

function render(F,R){
  var t=F.t;
  ctx.setTransform(KDPR,0,0,KDPR,0,0);
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,SH);
  // удар о пузырь трясёт экран
  var sx=0,sy=0;
  if(F.ph==='done'&&F.shake<.5){var e=Math.exp(-F.shake*11);sx=4.5*e*Math.sin(F.shake*83);sy=3*e*Math.sin(F.shake*61+1)}
  ctx.save();ctx.translate(sx,-F.S+sy);

  // раскладка снизу вверх: текущий обмен, над ним старые
  var y=YB,nvH=(BH+GV)*F.sN,nvY=YB-BH;y-=nvH;
  var vY=y-VH;y-=(VH+GQ)*F.sV;
  y-=GL*F.lb0;var l0=y;
  y-=BH*F.qe;var q0=y;y-=GX*F.qe;
  // старые обмены: вопрос, голосовое 7:48, «nvm»
  for(var k=1;k<=6;k++){
    var nT=y-BH,vT=nT-GV-VH;y=vT-GQ;
    if(k===1){y-=GL*F.lbOld;var lb=y;if(F.lbOld>.01)drawLabel(lb,true,F.lbOld)}
    var qT=y-BH;y=qT-GX;
    if(nT+BH<F.S+40)break;
    textMsg(MEX-QW,qT,ASK,true,1);
    bubble(RX,vT,TP.vw,VH,false,COL.recv,0);voiceContent(RX,vT,LMAX);
    textMsg(RX,nT,WORD,false,1);
  }
  // свой вопрос вылетает из поля ввода
  if(F.qe>0){
    var e2=F.qe,qx=mix(FIELDTXT.x-15,MEX-QW,e2),qy=mix(FIELDTXT.y-7+F.S,q0,e2),a=sm(e2*2.4);
    var bg='rgba('+COL.blueC.join(',')+','+a.toFixed(3)+')',ink='rgb('+COL.inkC.map(function(c){return Math.round(mix(c,255,a))}).join(',')+')';
    textMsg(qx,qy,ASK,true,a,bg,ink);
  }
  if(F.lb0>0)drawLabel(l0,false,F.lb0,F.lbRead);

  // лента и пузырь
  if(F.sV>0){
    var dy=vY-VY;
    if(F.ph==='rec')drawTapeRec(F.L,dy,t,0);
    else if(F.ph==='hold')drawTapeRec(F.L,dy,t,1.1*Math.exp(-F.hold*9)+.35);
    else if(F.ph==='reel')drawTapeReel(R.sim,F.reel);
    drawVoice(F,R,vY);
  }
  if(F.sN>0){
    ctx.save();ctx.translate(RX,nvY+BH);ctx.scale(F.sN,F.sN);ctx.translate(-RX,-(nvY+BH));
    textMsg(RX,nvY,WORD,false,1);ctx.restore();
  }
  ctx.restore();

  // поле ввода: дописывается следующий вопрос, лента может выдавить его вниз
  set(compEl,'transform','translateY('+f2(F.P)+'px)');
  var c=F.field;
  if(typedEl.__n!==c.n){typedEl.textContent=ASK.slice(0,c.n);typedEl.__n=c.n}
  set(phEl,'opacity',c.n>0?'0':'1');set(mic,'opacity',c.n>0?'0':'1');
  set(caret,'opacity',c.caret.toFixed(2));
  set(sendBtn,'opacity',(c.n>0?1:c.sendOut).toFixed(3));
  set(sendBtn,'transform','scale('+(1-.14*c.press).toFixed(3)+')');
}
function drawLabel(top,old,op,rd){
  ctx.save();ctx.globalAlpha=op;ctx.textBaseline='middle';ctx.textAlign='left';
  var y=top+3+8,read=old||rd>.5;
  if(!old){var q=Math.min(rd,1-rd)*2;ctx.globalAlpha=op*(1-q)}
  if(read){setFont(13,600,0);ctx.fillStyle=COL.sub;ctx.fillText('Read',MEX-LW.r,y);setFont(13,400,0);ctx.fillText(' '+READ_AT,MEX-LW.r+LW.rb-ctx.measureText(' ').width,y)}
  else{setFont(13,400,0);ctx.fillStyle=COL.sub;ctx.fillText('Delivered',MEX-LW.d,y)}
  ctx.restore();
}
function drawVoice(F,R,vY){
  var t=F.t,dc=F.jolt,x=RX,w=TP.bw,sc=F.sV,sqx=1,sqy=1;
  if(F.ph==='done'){
    // хвост ленты щёлкнул о пузырь: отскок влево, сплющивание, потом раскрывается в готовое голосовое
    var e=Math.exp(-dc*8);x-=12*e*Math.cos(dc*26);sqx=1-.1*e*Math.cos(dc*30);sqy=1+.12*e*Math.cos(dc*30);
    w=mix(TP.bw,TP.vw,F.morph)+10*Math.exp(-dc*7)*Math.sin(dc*20)*F.morph;
  }
  // пока Alex говорит, пузырь чуть дрожит
  if(F.rec)x+=.7*F.vu*Math.sin(t*70);
  ctx.save();
  ctx.translate(RX,vY+VH);ctx.scale(sc*sqx,sc*sqy);ctx.translate(-RX,-(vY+VH));
  bubble(x,vY,w,VH,false,COL.recv,1-F.sN);
  ctx.save();rr(x,vY,w,VH,22);ctx.clip();
  var m=F.morph;
  if(m<.45){
    ctx.globalAlpha=1-sm(m/.45);
    var live=F.rec,r=6*(live?1+.28*F.vu:1);
    ctx.fillStyle=live?COL.red:COL.sub;ctx.beginPath();ctx.arc(x+23,vY+22,r,0,7);ctx.fill();
    tabText(clock(DUR*F.L/LMAX),x+38,vY+22.5,19,600,COL.ink);
  }
  if(m>.3){ctx.globalAlpha=sm((m-.3)/.6);voiceContent(x,vY,F.L)}
  ctx.restore();ctx.restore();
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function invL(R,m){var a=R.Lk;for(var i=1;i<a.length;i++)if(a[i][1]>=m){var p=(m-a[i-1][1])/Math.max(1e-6,a[i][1]-a[i-1][1]);return mix(a[i-1][0],a[i][0],p)}return a[a.length-1][0]}
function speechEvents(R,out){
  SYL.forEach(function(s){
    if(s.m0>=R.Lf)return;
    var t0=invL(R,s.m0),t1=invL(R,Math.min(s.m1,R.Lf));
    out.push([t0,'syl',Math.max(.03,t1-t0),s.a,s.v,s.f,1,s.g]);
  });
}
function rewindEvents(R,out){
  var rate=R.Lf/Math.max(.3,R.tStop-R.r0||3.6);
  SYL.forEach(function(s){
    if(s.m0>=R.Lf)return;
    var a=reelTimeOf(R.Lf,Math.min(s.m1,R.Lf)),b=reelTimeOf(R.Lf,s.m0);
    if(b>R.sim.TR)b=R.sim.TR;if(a>=b)return;
    var v=(TP.v0+TP.acc*(a+b)/2)/TP.slk;
    out.push([R.tSnap+a,'syl',b-a,s.a*.8,s.v,s.f,v/rate,s.g,1]);
  });
}
function buildEvents(){
  var R=AUTO;EVENTS=[];
  EVENTS.push([R.tSend+.01,'send']);
  EVENTS.push([R.tBub+.01,'recon']);
  EVENTS.push([R.r0,'motor',R.r1-R.r0]);
  speechEvents(R,EVENTS);
  EVENTS.push([R.tStop,'recoff']);
  EVENTS.push([R.tSnap,'zip',R.sim.TR]);
  rewindEvents(R,EVENTS);
  EVENTS.push([R.tClack,'clack']);
  EVENTS.push([R.tNvm,'land']);
  R.keys.forEach(function(t,i){EVENTS.push([t,'key',i])});
  EVENTS.push([R.tNext-.04,'press']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Держишь палец: Alex говорит, пока держишь, лента лезет. Отпустил: запись кончилась,
   рулетка, «nvm». Если экран кончился, запись обрывается сама. */
var mode='auto',LV=null,LRATE=1500;
function nowS(){return performance.now()/1000}
function shiftRound(A,base,u){
  var R={tSend:base+A.tSend,tDel:base+A.tDel,tRead:base+A.tRead,tBub:base+A.tBub,r0:base+A.r0,Lk:[]};
  A.Lk.forEach(function(q){if(q[0]<=u)R.Lk.push([base+q[0],q[1]])});
  if(u>=A.tStop){
    R.Lk=A.Lk.map(function(q){return[base+q[0],q[1]]});
    ['tStop','tSnap','tClack','tNvm','Lf','sim'].forEach(function(k){R[k]=typeof A[k]==='number'&&k!=='Lf'?base+A[k]:A[k]});
    if(u>=A.tTy0){R.tTy0=base+A.tTy0;R.keys=A.keys.map(function(k){return base+k});R.tTy1=base+A.tTy1}
  }
  return R;
}
function goLive(){
  if(mode==='live')return;
  var n=nowS(),u=uNow(),base=n-u;
  LV={R:shiftRound(AUTO,base,u),hold:false,sched:0};
  var R=LV.R;
  if(R.tStop==null){R.Lk.push([n,Lat(AUTO,u)]);LV.sched=Lat(AUTO,u)}
  mode='live';Sound.stopAll();
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0}
function newRound(n){
  var R={tSend:n,tDel:n+.3,tRead:n+.52,tBub:n+.64,r0:n+.78,Lk:[]};
  LV.R=R;LV.sched=0;
  Sound.play([0,'press']);Sound.play([0,'send'],.01);Sound.play([0,'recon'],.65);
}
function pressDown(){
  Sound.start();goLive();
  var n=nowS(),R=LV.R;
  if(R.tStop!=null){if(R.tNvm==null||n<R.tNvm+.3)return;newRound(n)}
  LV.hold=true;
}
function pressUp(){if(LV)LV.hold=false}
function stopLive(n){
  var R=LV.R;R.Lk.push([n,Lat(R,n)]);finishRound(R,n);
  Sound.stopAll();Sound.play([0,'recoff']);
  var ev=[];rewindEvents(R,ev);
  Sound.play([0,'zip',R.sim.TR],R.tSnap-n);ev.forEach(function(e){Sound.play(e,e[0]-n)});
  LV.clack=R.tClack;LV.land=R.tNvm;
}
function liveStep(n,dt){
  var R=LV.R;
  if(R.tStop==null&&n>=R.r0){
    var L=Lat(R,n);
    if(!R.Lk.length)R.Lk.push([R.r0,0]);
    // запись идёт, пока держишь; короткий тап всё равно даёт Alex сказать пару слов
    if(LV.hold||L<520){
      var rate=LRATE*(.8+.4*sm(L/1500));L=Math.min(LMAX,L+rate*dt);R.Lk.push([n,L]);
      // слоги, которые выйдут из горлышка в ближайшие 60 мс
      var ahead=L+rate*.06;
      SYL.forEach(function(s){if(s.m0>LV.sched&&s.m0<=ahead)Sound.play([0,'syl',(s.m1-s.m0)/rate,s.a,s.v,s.f,1,s.g],Math.max(0,(s.m0-L)/rate))});
      LV.sched=ahead;
      if(!LV.motor){LV.motor=true;Sound.play([0,'motor',30])}
      if(L>=LMAX)stopLive(n);
    }else stopLive(n);
  }
  if(LV.clack!=null&&n>=LV.clack){Sound.play([0,'clack']);LV.clack=null}
  if(LV.land!=null&&n>=LV.land){Sound.play([0,'land']);LV.land=null;LV.motor=false}
  // ответ пришёл: следующий вопрос набирается сам и ждёт, пока его отправят
  if(R.tNvm!=null&&!R.keys&&n>R.tNvm+.6){typeKeys(R,n);R.keys.forEach(function(k,i){Sound.play([0,'key',i],k-n)})}
}

/* ввод */
var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),S=1;
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();screenEl.setPointerCapture(e.pointerId);pressDown()});
screenEl.addEventListener('pointerup',pressUp);screenEl.addEventListener('pointercancel',pressUp);
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();pressDown()}
});
addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();pressUp()}});
addEventListener('blur',pressUp);
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Hold the screen while Alex talks, then let go':'Hold the screen or Space while Alex talks, then let go';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(frame(AUTO,u),AUTO);
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();liveStep(n,dt);render(frame(LV.R,n),LV.R);
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
function hexc(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return[n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var cs=getComputedStyle(document.documentElement),g=function(k){return cs.getPropertyValue(k).trim()};
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),blue:g('--blue'),recv:g('--recv'),bar:g('--bar'),red:g('--red'),
       blueC:hexc(g('--blue')),inkC:hexc(g('--ink'))};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  // при записи видна вся переписка от шапки до поля ввода
  S=REC||STILL?(hh-40)/846:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  KDPR=S*Math.min(3,devicePixelRatio||1);
  var bw=Math.round(SW*KDPR),bh=Math.round(SH*KDPR);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  KDPR=bw/SW;
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(frame(AUTO,uNow()),AUTO)};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();measure();buildPath();buildSpeech();buildAuto();buildEvents();window.__TL=TL;
  addEventListener('resize',fit);
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(frame(AUTO,((PH%CYCLE)+CYCLE)%CYCLE),AUTO);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
