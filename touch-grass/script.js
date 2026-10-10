/* ─────────── Touch grass ───────────
   Спрашиваешь ИИ, чем заняться на выходных. Он отвечает двумя словами, и они растут травой:
   каждая буква это дёрн, из которого торчат тысячи травинок. Ветер гонит по газону волну,
   палец его гладит: травинки расходятся, ложатся по ходу пальца и потом медленно встают.
   Retry ничего не меняет: ответ скашивается слева направо, обрезки летят, и трава отрастает
   теми же словами, буква за буквой, как стрим.
   Ветер, рост и покос это функции времени. След пальца это пружина в каждой травинке,
   она считается шагами от начала петли, поэтому на любой кадр можно перемотать. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0),DBG=QS.has('dbg');
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

var LINES=['touch','grass.'];

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874;
var LX=17,FS=122,LG=110,LS=0;   // левый край ответа, кегль, шаг строк, трекинг
var B1=290,B2=392,ACTY=431;         // базовые линии и ряд кнопок считаются от пузыря
var LW=[0,0];                        // ширина строк

var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),canvas=document.getElementById('lawn');
var bub=document.getElementById('bub'),acts=document.getElementById('acts'),retryBtn=document.getElementById('retry');
var spinEl=document.getElementById('spin'),touchEl=document.getElementById('touch'),mtext=document.getElementById('mtext');

/* ─────────── сценарий петли ───────────
   u: время петли. τ: время с последнего нажатия retry, от него зависят покос и рост.
   В автопоказе τ = u − TAP по модулю петли, поэтому рост начинается ровно в u = 0. */
var TL={
  GUST0:1.15,GUSTD:1.1,    // порыв ветра проходит по газону слева направо
  TD:1.95,TU:3.6,          // палец: касание и отрыв, между ними мазок через обе строки
  TAP:4.35,                // палец жмёт retry
  MOW0:.12,MOW1:.56,       // покос по τ: от левого края до правого
  GD:.36,                  // рост одной травинки
  CL:1.05                  // жизнь обрезка
};
var CYCLE=5.4;
TL.REG=CYCLE-TL.TAP;       // рост по τ начинается там, где петля начинается заново
function tauOf(u){return((u-TL.TAP)%CYCLE+CYCLE)%CYCLE}

/* ─────────── газон ───────────
   Маска букв рисуется в канвас тем же шрифтом, по ней считается расстояние до края,
   корни травинок раскидываются по сетке с дрожанием. У края травинки короче и клонятся наружу. */
var N=0,STAT,DYN,PB,WB,SQ,DEL,TCUT,PH1,PH2,CLIP=[],NC=0,CDYN;
var MASK={y0:0,w:SW,h:0,R:3,cv:null};
var LET=[];

function buildLawn(){
  var cs=getComputedStyle(mtext),R=MASK.R;
  var font=cs.fontWeight+' '+FS+'px '+cs.fontFamily;
  var y0=Math.floor(B1-FS*.95-20),y1=Math.ceil(B2+FS*.3+12);
  MASK.y0=y0;MASK.h=y1-y0;
  var cv=document.createElement('canvas');cv.width=MASK.w*R;cv.height=MASK.h*R;
  var x=cv.getContext('2d');
  x.setTransform(R,0,0,R,0,-y0*R);
  x.font=font;if('letterSpacing' in x)x.letterSpacing=(LS*FS).toFixed(2)+'px';
  x.fillStyle='#fff';x.textBaseline='alphabetic';
  x.fillText(LINES[0],LX,B1);x.fillText(LINES[1],LX,B2);
  MASK.cv=cv;
  // границы букв для порядка роста
  LET=[];
  LINES.forEach(function(s,l){
    var row=[];for(var k=0;k<s.length;k++){row.push({x0:LX+x.measureText(s.slice(0,k)).width,x1:LX+x.measureText(s.slice(0,k+1)).width})}
    LET.push(row);LW[l]=x.measureText(s).width;
  });
  var img=x.getImageData(0,0,cv.width,cv.height).data,CW=cv.width;
  function alphaAt(px,py){var i=Math.floor((py-y0)*R),j=Math.floor(px*R);if(i<0||j<0||i>=cv.height||j>=CW)return 0;return img[(i*CW+j)*4+3]}
  // поле расстояний до края, внутри букв, шаг 1 pt
  var W=MASK.w,H=MASK.h,Din=new Float32Array(W*H);
  for(var j=0;j<H;j++)for(var i=0;i<W;i++)Din[j*W+i]=alphaAt(i+.5,y0+j+.5)>127?1e6:0;
  chamfer(Din,W,H);
  function dAt(px,py){
    var fx=clamp(px-.5,0,W-1.001),fy=clamp(py-y0-.5,0,H-1.001),ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy,o=iy*W+ix;
    return mix(mix(Din[o],Din[o+1],ax),mix(Din[o+W],Din[o+W+1],ax),ay);
  }
  var r=rng(7),SP=1.62,list=[];
  for(var gy=y0;gy<y1;gy+=SP)for(var gx=0;gx<W;gx+=SP){
    var px=gx+r()*SP,py=gy+r()*SP;
    if(alphaAt(px,py)<150)continue;
    var d=dAt(px,py),gxd=dAt(px+1,py)-dAt(px-1,py),gyd=dAt(px,py+1)-dAt(px,py-1),gl2=Math.hypot(gxd,gyd)||1;
    var nx=-gxd/gl2,ny=-gyd/gl2;
    var line=py<B1+10?0:1,row=LET[line],li=0;
    for(var k=0;k<row.length;k++)if(px>=row[k].x0-1)li=k;
    var gi=line===0?li:LINES[0].length+li;
    var edge=Math.exp(-d/3.2);
    var L=(8.6+6.2*Math.pow(r(),1.3))*(.7+.3*(1-edge));
    var th=(r()-.5)*.5+nx*.5*edge+(ny>0?0:nx*.15*edge);
    var hue=(r()-.5)*1.3;if(r()<.08)hue=.95;else if(r()<.06)hue=-.9;
    var B=line===0?B1:B2;
    list.push({x:px,y:py,L:L,w:1.25+.95*r(),th:th,hue:clamp(hue,-1,1),shade:r(),
      del:gi*.06+r()*.12+.07*c01((py-(B-FS*.75))/(FS*.75)),ph1:r()*.9,ph2:r()*1.4,clip:r()<.42,cr:[r(),r(),r(),r()]});
  }
  list.sort(function(a,b){return a.y-b.y});
  N=list.length;
  STAT=new Float32Array(N*8);DYN=new Float32Array(N*4);
  PB=new Float32Array(N);WB=new Float32Array(N);SQ=new Float32Array(N);
  DEL=new Float32Array(N);TCUT=new Float32Array(N);PH1=new Float32Array(N);PH2=new Float32Array(N);
  CLIP=[];
  var mx0=LX-6,mx1=LX+Math.max(LW[0],LW[1])+6;
  list.forEach(function(b,i){
    var o=i*8;
    STAT[o]=b.x;STAT[o+1]=b.y;STAT[o+2]=b.L;STAT[o+3]=b.w;
    STAT[o+4]=b.th;STAT[o+5]=b.hue;STAT[o+6]=b.shade;STAT[o+7]=0;
    DEL[i]=b.del;PH1[i]=b.ph1;PH2[i]=b.ph2;
    TCUT[i]=mix(TL.MOW0,TL.MOW1,c01((b.x-mx0)/(mx1-mx0)))+(b.cr[3]-.5)*.016;
    if(b.clip){
      // обрезок: куда летит, как крутится
      CLIP.push({i:i,vx:20+260*b.cr[0]*b.cr[0],vy:-(90+340*b.cr[1]),w:(b.cr[2]-.5)*30,k:2.4+1.8*b.cr[2]});
    }
  });
  NC=CLIP.length;CDYN=new Float32Array(NC*8);
  if(DBG)console.log('blades',N,'clips',NC);
}
function chamfer(D,W,H){
  var i,x,y,d,a=1,b=1.4142;
  for(y=0;y<H;y++)for(x=0;x<W;x++){i=y*W+x;d=D[i];if(!d)continue;
    if(x>0)d=Math.min(d,D[i-1]+a);
    if(y>0){d=Math.min(d,D[i-W]+a);if(x>0)d=Math.min(d,D[i-W-1]+b);if(x<W-1)d=Math.min(d,D[i-W+1]+b)}
    D[i]=d}
  for(y=H-1;y>=0;y--)for(x=W-1;x>=0;x--){i=y*W+x;d=D[i];if(!d)continue;
    if(x<W-1)d=Math.min(d,D[i+1]+a);
    if(y<H-1){d=Math.min(d,D[i+W]+a);if(x<W-1)d=Math.min(d,D[i+W+1]+b);if(x>0)d=Math.min(d,D[i+W-1]+b)}
    D[i]=d}
}

/* ─────────── ветер: всё кратно петле, чтобы она замыкалась без шва ─────────── */
var WIND={a1:.085,a2:.048,n1:3,n2:5,k1:.019,k2:.029,g:.56,gs:78,gx0:-170,gx1:560};
var TWO_PI=Math.PI*2;
function gustAt(x,wu){
  var s=0;
  for(var c=-1;c<=0;c++){
    var t=wu+c*CYCLE-TL.GUST0;if(t<0||t>TL.GUSTD)continue;
    var xg=mix(WIND.gx0,WIND.gx1,t/TL.GUSTD),z=(x-xg)/WIND.gs,e=Math.sin(Math.PI*t/TL.GUSTD);
    // гребень порыва и лёгкий откат за ним
    s+=WIND.g*e*(Math.exp(-z*z)-.32*Math.exp(-(z+1.3)*(z+1.3)));
  }
  return s;
}

/* ─────────── рост и покос ─────────── */
var STUB=2.1;
function grow(p){if(p<=0)return 0;if(p>=1)return 1;var q=p-1;return 1+2.4*q*q*q+1.4*q*q}
function lenAt(i,tau){
  var L=STAT[i*8+2],st=STUB/L;
  if(tau<TCUT[i])return 1;
  var tg=TL.REG+DEL[i];
  if(tau<tg)return st;
  return mix(st,1,grow((tau-tg)/TL.GD));
}

/* ─────────── след пальца ───────────
   Под пальцем травинка жёстко тянется к своей цели: на месте палец её отводит в сторону,
   в движении увлекает по ходу. Без пальца она медленно встаёт на мягкой пружине, поэтому
   за пальцем остаётся след, как на бархате. */
var BR={K:16,C:7.2,KC:520,R:24,part:1.05,comb:1.1,sq:.55};
var SIMDT=1/240,SQIN=1-Math.exp(-SIMDT/.035),SQOUT=1-Math.exp(-SIMDT/.9);
var SIM={u:-1};
function simReset(){PB.fill(0);WB.fill(0);SQ.fill(0);SIM.u=0;SIM.awake=false}
function simStep(dt,fg){
  var K=BR.K,C=BR.C,R2=BR.R*BR.R,lim=6.5*R2,act=fg&&fg.p>.001,any=false;
  if(!act&&!SIM.awake)return 0;
  var touched=0,m=0,cv=0;
  if(act){var sp=Math.hypot(fg.vx,fg.vy);m=c01(sp/180);cv=clamp(fg.vx/260,-1,1)*BR.comb}
  for(var i=0;i<N;i++){
    var p=PB[i],w=WB[i],s=SQ[i],kc=0,tg=0,sqt=0;
    if(act){
      var o=i*8,L=STAT[o+2],th=STAT[o+4]+p;
      var mx=STAT[o]+Math.sin(th)*L*.55,my=STAT[o+1]-Math.cos(th)*L*.55;
      var dx=mx-fg.x,dy=my-fg.y,d2=dx*dx+dy*dy;
      if(d2<lim){
        var g=Math.exp(-d2/R2)*fg.p;
        kc=BR.KC*g;tg=((1-m)*BR.part*Math.tanh(dx/8)+m*cv)*(.72+.56*STAT[o+6]);
        sqt=BR.sq*g;if(g>.3)touched++;
      }
    }
    if(kc===0&&sqt===0&&p<1e-4&&p>-1e-4&&w<1e-3&&w>-1e-3&&s<1e-4){PB[i]=0;WB[i]=0;SQ[i]=0;continue}
    any=true;
    w+=(-K*p-C*w+kc*(tg-p)-Math.sqrt(kc)*1.2*w)*dt;p+=w*dt;
    if(p>1.3){p=1.3;if(w>0)w=0}else if(p<-1.3){p=-1.3;if(w<0)w=0}
    PB[i]=p;WB[i]=w;SQ[i]=s+(sqt-s)*(sqt>s?SQIN:SQOUT);
  }
  SIM.awake=any;
  return touched;
}
function simTo(u){
  if(SIM.u<0||u<SIM.u-1e-6)simReset();
  while(SIM.u+SIMDT<=u+1e-9){simStep(SIMDT,fingerAt(SIM.u+SIMDT));SIM.u+=SIMDT}
}

/* ─────────── палец ───────────
   Мазок: слева направо по первой строке, дугой вниз и справа налево по второй. */
var STROKE=null,RETRYC={x:143,y:448};
function buildStroke(){
  var y1=B1-FS*.37,y2=B2-FS*.34,w1=LW[0],w2=LW[1];
  var P=[[LX+4,y1+8],[LX+w1*.28,y1-3],[LX+w1*.6,y1+2],[LX+w1-8,y1+4],[LX+w1+10,(y1+y2)/2-6],[LX+w2-26,y2-6],[LX+w2*.62,y2+1],[LX+w2*.3,y2-3],[LX+6,y2+4]];
  var pts=[];
  for(var k=0;k<P.length-1;k++){
    var p0=P[Math.max(0,k-1)],p1=P[k],p2=P[k+1],p3=P[Math.min(P.length-1,k+2)];
    for(var q=0;q<24;q++){var t=q/24,t2=t*t,t3=t2*t;
      pts.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                .5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)])}
  }
  pts.push(P[P.length-1]);
  var cum=[0];for(var i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  STROKE={pts:pts,cum:cum,len:cum[cum.length-1]};
  var rb=retryBtn;RETRYC={x:acts.offsetLeft+rb.offsetLeft+rb.offsetWidth/2,y:acts.offsetTop+rb.offsetTop+rb.offsetHeight/2};
}
function strokeAt(q){
  var s=c01(q)*STROKE.len,c=STROKE.cum,lo=0,hi=c.length-1;
  while(hi-lo>1){var m=(lo+hi)>>1;if(c[m]<=s)lo=m;else hi=m}
  var f=(s-c[lo])/((c[hi]-c[lo])||1),a=STROKE.pts[lo],b=STROKE.pts[hi];
  return [mix(a[0],b[0],f),mix(a[1],b[1],f)];
}
// ход по мазку: плавный разгон и торможение, в середине ровно
function strokeQ(t){var x=c01((t-TL.TD)/(TL.TU-TL.TD));return x-.72*Math.sin(TWO_PI*x)/TWO_PI}
function fingerAt(u){
  if(u>=TL.TD-.02&&u<=TL.TU+.14){
    var q=strokeQ(u),p=strokeAt(q),h=1/240,p2=strokeAt(strokeQ(u+h)),p0=strokeAt(strokeQ(u-h));
    var pr=sm(seg(u,TL.TD,TL.TD+.06))*(1-sm(seg(u,TL.TU-.04,TL.TU+.04)));
    return {x:p[0],y:p[1],vx:(p2[0]-p0[0])/(2*h),vy:(p2[1]-p0[1])/(2*h),p:pr};
  }
  return null;
}
function touchView(u){
  // индикатор касания: появляется в момент касания и гаснет при отрыве
  var a=null;
  if(u>=TL.TD-.02&&u<=TL.TU+.14){var f=fingerAt(u);a={x:f.x,y:f.y,o:sm(seg(u,TL.TD-.01,TL.TD+.05))*(1-sm(seg(u,TL.TU-.02,TL.TU+.12))),k:1+.2*(1-eout(seg(u,TL.TD,TL.TD+.14)))-.06*f.p}}
  else if(u>=TL.TAP-.08&&u<=TL.TAP+.24){a={x:RETRYC.x,y:RETRYC.y,o:sm(seg(u,TL.TAP-.08,TL.TAP-.03))*(1-sm(seg(u,TL.TAP+.08,TL.TAP+.22))),k:1+.2*(1-eout(seg(u,TL.TAP-.08,TL.TAP+.06)))-.06*pulseP(u)}}
  return a;
}
function pulseP(u){return sm(seg(u,TL.TAP-.07,TL.TAP-.03))*(1-sm(seg(u,TL.TAP+.05,TL.TAP+.1)))}

/* ─────────── WebGL ─────────── */
var gl=canvas.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:REC||STILL});
var PR={},VA={},BUF={},UN={},TEX=null,IDXN=0;
var HEAD='#version 300 es\nprecision highp float;\n';
var VS_BLADE=HEAD+[
'layout(location=0) in vec2 aV;layout(location=1) in vec4 iA;layout(location=2) in vec4 iB;layout(location=3) in vec4 iD;',
'uniform vec2 uRes;uniform vec3 uC0,uC1,uC2,uCw,uCc;uniform float uSheen;',
'out vec3 vC;out float vS;',
'void main(){',
'  float s=aV.x,side=aV.y,len=iD.y,sq=iD.z;vS=side;',
'  float L=iA.z*len*(1.-.42*sq);',
'  float th=iB.x+iD.x,th0=iB.x+iD.x*.3;',
'  vec2 d0=vec2(sin(th0),-cos(th0)),d1=vec2(sin(th),-cos(th));',
'  vec2 R=iA.xy,P1=R+d0*L*.5,P2=P1+d1*L*.55;',
'  float v=1.-s;',
'  vec2 B=v*v*R+2.*s*v*P1+s*s*P2;',
'  vec2 T=normalize(2.*v*(P1-R)+2.*s*(P2-P1)+vec2(1e-5,-1e-4));',
'  vec2 Nn=vec2(-T.y,T.x);',
'  float w=iA.w*pow(v,.85)*mix(.55,1.,clamp(len*1.6,0.,1.));',
'  vec2 P=B+Nn*side*w*.5;',
'  gl_Position=vec4(P.x/uRes.x*2.-1.,1.-P.y/uRes.y*2.,0.,1.);',
'  vec3 tip=iB.y<0.?mix(uC2,uCc,-iB.y):mix(uC2,uCw,iB.y);',
'  float hh=s*len;',
'  vec3 c=mix(mix(uC0,uC1,smoothstep(0.,.42,hh)),tip,smoothstep(.32,1.,hh));',
'  float lean=sin(th);',
'  c*=(.8+.4*iB.z)*(1.+uSheen*max(lean,0.)*hh-.45*uSheen*max(-lean,0.)*hh)+iD.w;',
'  vC=c;',
'}'].join('\n');
var FS_FLAT=HEAD+'in vec3 vC;in float vS;out vec4 o;void main(){o=vec4(vC*(.9+.17*smoothstep(-.9,.9,vS)),1.);}';
var VS_CLIP=HEAD+[
'layout(location=0) in vec2 aV;layout(location=1) in vec4 iP;layout(location=2) in vec4 iQ;',
'uniform vec2 uRes;uniform vec3 uC1,uC2,uCw,uCc;',
'out vec4 vC;',
'void main(){',
'  float s=aV.x,side=aV.y;',
'  vec2 d=vec2(sin(iP.z),-cos(iP.z)),n=vec2(-d.y,d.x);',
'  float w=iQ.x*pow(1.-s,.8);',
'  vec2 P=iP.xy+d*(s-.4)*iP.w+n*side*w*.5;',
'  gl_Position=vec4(P.x/uRes.x*2.-1.,1.-P.y/uRes.y*2.,0.,1.);',
'  vec3 tip=iQ.y<0.?mix(uC2,uCc,-iQ.y):mix(uC2,uCw,iQ.y);',
'  vec3 c=mix(uC1,tip,smoothstep(0.,1.,s))*(.82+.36*iQ.z);',
'  vC=vec4(c*iQ.w,iQ.w);',
'}'].join('\n');
var FS_CLIP=HEAD+'in vec4 vC;out vec4 o;void main(){o=vC;}';
var VS_TURF=HEAD+[
'layout(location=0) in vec2 a;uniform vec4 uRect;uniform vec2 uRes;out vec2 vUv;',
'void main(){vUv=a;vec2 p=uRect.xy+a*uRect.zw;gl_Position=vec4(p.x/uRes.x*2.-1.,1.-p.y/uRes.y*2.,0.,1.);}'].join('\n');
var FS_TURF=HEAD+[
'in vec2 vUv;out vec4 o;uniform sampler2D uM;uniform vec3 uTurf;uniform float uShA,uLod;uniform vec2 uShO;',
'void main(){',
'  float m=texture(uM,vUv).a;',
'  float s=textureLod(uM,vUv-uShO,uLod).a*uShA;',
'  o=vec4(uTurf*m,m)+vec4(0.,0.,0.,s)*(1.-m);',
'}'].join('\n');

function shd(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function prog(vs,fs){var p=gl.createProgram();gl.attachShader(p,shd(gl.VERTEX_SHADER,vs));gl.attachShader(p,shd(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function uni(p,names){var o={};names.forEach(function(n){o[n]=gl.getUniformLocation(p,n)});return o}

function glInit(){
  PR.blade=prog(VS_BLADE,FS_FLAT);UN.blade=uni(PR.blade,['uRes','uC0','uC1','uC2','uCw','uCc','uSheen']);
  PR.clip=prog(VS_CLIP,FS_CLIP);UN.clip=uni(PR.clip,['uRes','uC1','uC2','uCw','uCc']);
  PR.turf=prog(VS_TURF,FS_TURF);UN.turf=uni(PR.turf,['uRect','uRes','uM','uTurf','uShA','uLod','uShO']);
  // травинка: 6 сечений по длине, по две вершины в сечении
  var geo=[],idx=[],NSG=6;
  for(var k=0;k<NSG;k++){var s=k/(NSG-1);geo.push(s,-1,s,1)}
  for(k=0;k<NSG-1;k++){var a=2*k;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
  IDXN=idx.length;
  BUF.geo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,BUF.geo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geo),gl.STATIC_DRAW);
  BUF.idx=gl.createBuffer();
  BUF.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,BUF.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
  VA.turf=gl.createVertexArray();gl.bindVertexArray(VA.turf);
  gl.bindBuffer(gl.ARRAY_BUFFER,BUF.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
  BUF.idxData=new Uint16Array(idx);
}
function glLawn(){
  // буферы под текущий газон
  VA.blade=gl.createVertexArray();gl.bindVertexArray(VA.blade);
  gl.bindBuffer(gl.ARRAY_BUFFER,BUF.geo);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  BUF.stat=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,BUF.stat);gl.bufferData(gl.ARRAY_BUFFER,STAT,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(1,1);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(2,1);
  BUF.dyn=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,BUF.dyn);gl.bufferData(gl.ARRAY_BUFFER,DYN.byteLength,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(3,1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,BUF.idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,BUF.idxData,gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  VA.clip=gl.createVertexArray();gl.bindVertexArray(VA.clip);
  gl.bindBuffer(gl.ARRAY_BUFFER,BUF.geo);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  BUF.cdyn=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,BUF.cdyn);gl.bufferData(gl.ARRAY_BUFFER,CDYN.byteLength,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(1,1);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(2,1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,BUF.idx);
  gl.bindVertexArray(null);

  if(TEX)gl.deleteTexture(TEX);
  TEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TEX);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,MASK.cv);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}

/* палитры травы: светлая и тёмная тема, своя у каждой */
var PAL={
  light:{c0:[.09,.2,.06],c1:[.2,.43,.12],c2:[.43,.71,.22],cw:[.66,.76,.28],cc:[.24,.58,.3],turf:[.12,.25,.08],sh:.2,sheen:.6,brush:.2},
  dark:{c0:[.06,.14,.04],c1:[.19,.41,.11],c2:[.49,.78,.26],cw:[.72,.81,.34],cc:[.28,.64,.35],turf:[.075,.16,.05],sh:.55,sheen:.7,brush:.26}
};
var THEME='light';

/* ─────────── кадр ─────────── */
function drawLawn(F){
  var pal=PAL[THEME],i,o;
  for(i=0;i<N;i++){
    o=i*8;
    var x=STAT[o],y=STAT[o+1];
    var wv=WIND.a1*Math.sin(TWO_PI*WIND.n1*F.wu/CYCLE-WIND.k1*x+PH1[i])+WIND.a2*Math.sin(TWO_PI*WIND.n2*F.wu/CYCLE+WIND.k2*x-.013*y+PH2[i]);
    var g=F.gust?gustAt(x,F.wu):0;
    var j=i*4;
    var pb=PB[i];DYN[j]=wv+g+pb;DYN[j+1]=lenAt(i,F.tau);DYN[j+2]=SQ[i];DYN[j+3]=pal.brush*(Math.min(1,Math.abs(pb))+.6*SQ[i]);
  }
  // обрезки: у каждого своё время среза, дальше полёт с сопротивлением воздуха
  var nc=0,G=1300;
  for(var c=0;c<NC;c++){
    var C=CLIP[c],bi=C.i,age=F.tau-TCUT[bi];
    if(age<0||age>TL.CL)continue;
    o=bi*8;
    var L=STAT[o+2],th=STAT[o+4]+WIND.a1*Math.sin(TWO_PI*WIND.n1*(F.wu-age)/CYCLE-WIND.k1*STAT[o]+PH1[bi]);
    var cl=L-STUB,mid=STUB+cl*.5;
    var x0=STAT[o]+Math.sin(th)*mid,y0=STAT[o+1]-Math.cos(th)*mid;
    var e=1-Math.exp(-C.k*age);
    var px=x0+C.vx/C.k*e,py=y0+G*age/C.k+(C.vy-G/C.k)*e/C.k;
    var a=th+C.w/C.k*e;
    var al=1-sm(seg(age,TL.CL*.45,TL.CL));
    var q=nc*8;
    CDYN[q]=px;CDYN[q+1]=py;CDYN[q+2]=a;CDYN[q+3]=cl;
    CDYN[q+4]=STAT[o+3]*.9;CDYN[q+5]=STAT[o+5];CDYN[q+6]=STAT[o+6];CDYN[q+7]=al;
    nc++;
  }
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  // дёрн и его мягкая тень
  gl.useProgram(PR.turf);gl.bindVertexArray(VA.turf);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,TEX);
  gl.uniform1i(UN.turf.uM,0);gl.uniform4f(UN.turf.uRect,0,MASK.y0,MASK.w,MASK.h);gl.uniform2f(UN.turf.uRes,SW,SH);
  gl.uniform3fv(UN.turf.uTurf,pal.turf);gl.uniform1f(UN.turf.uShA,pal.sh);gl.uniform1f(UN.turf.uLod,3.2);
  gl.uniform2f(UN.turf.uShO,0,4/MASK.h);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  // травинки
  gl.useProgram(PR.blade);gl.bindVertexArray(VA.blade);
  gl.bindBuffer(gl.ARRAY_BUFFER,BUF.dyn);gl.bufferSubData(gl.ARRAY_BUFFER,0,DYN);
  var U=UN.blade;gl.uniform2f(U.uRes,SW,SH);
  gl.uniform3fv(U.uC0,pal.c0);gl.uniform3fv(U.uC1,pal.c1);gl.uniform3fv(U.uC2,pal.c2);gl.uniform3fv(U.uCw,pal.cw);gl.uniform3fv(U.uCc,pal.cc);
  gl.uniform1f(U.uSheen,pal.sheen);
  gl.drawElementsInstanced(gl.TRIANGLES,IDXN,gl.UNSIGNED_SHORT,0,N);
  // обрезки
  if(nc){
    gl.useProgram(PR.clip);gl.bindVertexArray(VA.clip);
    gl.bindBuffer(gl.ARRAY_BUFFER,BUF.cdyn);gl.bufferSubData(gl.ARRAY_BUFFER,0,CDYN,0,nc*8);
    U=UN.clip;gl.uniform2f(U.uRes,SW,SH);
    gl.uniform3fv(U.uC1,pal.c1);gl.uniform3fv(U.uC2,pal.c2);gl.uniform3fv(U.uCw,pal.cw);gl.uniform3fv(U.uCc,pal.cc);
    gl.drawElementsInstanced(gl.TRIANGLES,IDXN,gl.UNSIGNED_SHORT,0,nc);
  }
  gl.bindVertexArray(null);
}

function render(F){
  drawLawn(F);
  var t=F.touch;
  if(t&&t.o>.003){set(touchEl,'opacity',t.o.toFixed(3));set(touchEl,'transform','translate('+f2(t.x)+'px,'+f2(t.y)+'px) scale('+t.k.toFixed(3)+')')}
  else set(touchEl,'opacity','0');
  retryBtn.classList.toggle('hot',F.hot>.5);
  set(spinEl,'transform',F.spin?'rotate('+F.spin.toFixed(1)+'deg)':'');
}

/* ─────────── автопоказ ─────────── */
function scene(u){
  return {wu:u,tau:tauOf(u),gust:true,touch:touchView(u),
    hot:u>=TL.TAP-.06&&u<TL.TAP+.42?1:0,spin:-360*eio(seg(u,TL.TAP-.02,TL.TAP+.5))};
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function panX(x){return clamp((x/SW-.5)*.8,-.7,.7)}
function buildEvents(){
  EVENTS=[];
  // рост: каждая буква всходит своим щелчком, как токен в стриме
  var nl=LINES[0].length+LINES[1].length;
  for(var g=0;g<nl;g++){
    var l=g<LINES[0].length?0:1,k=l?g-LINES[0].length:g,row=LET[l][k];
    EVENTS.push([g*.06+.08,'sprout',g,panX((row.x0+row.x1)/2)]);
  }
  EVENTS.push([TL.GUST0+.05,'gust',TL.GUSTD]);
  EVENTS.push([TL.TD,'down',panX(STROKE.pts[0][0])]);
  // шорох под пальцем: по скорости и по тому, сколько травинок он задевает
  for(var t=TL.TD;t<TL.TU;t+=1/45){
    var f=fingerAt(t);if(!f)continue;var v=Math.hypot(f.vx,f.vy);
    EVENTS.push([t,'rustle',clamp(v/420,.15,1)*f.p,panX(f.x)]);
  }
  EVENTS.push([TL.TU,'lift',panX(STROKE.pts[STROKE.pts.length-1][0])]);
  EVENTS.push([TL.TAP-.03,'tap'],[TL.TAP+.02,'spin']);
  // покос: жужжание и щелчки срезов
  EVENTS.push([TL.TAP+TL.MOW0,'mow',TL.MOW1-TL.MOW0]);
  for(var s=0;s<26;s++){var q=s/26;EVENTS.push([TL.TAP+mix(TL.MOW0,TL.MOW1,q),'snip',panX(mix(LX,LX+LW[1],q)),s])}
  EVENTS.forEach(function(e){e[0]=((e[0]%CYCLE)+CYCLE)%CYCLE});
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Газон можно гладить пальцем или мышью, retry косит и выращивает ответ заново. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var u=uNow(),n=nowS();
  simTo(u);
  LV={n:n,n0:n,wu0:u,tau0:tauOf(u),tapN:null,fg:null,ptr:null,lastRustle:0};
  // если петля была в покосе или росте, живое состояние продолжает его же
  if(u>=TL.TAP||LV.tau0<TL.REG+2)LV.tapN=n-LV.tau0;
  mode='live';document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;SIM.u=-1;document.documentElement.classList.remove('live')}
function liveTau(n){return LV.tapN==null?99:n-LV.tapN}
function liveRetry(){
  Sound.start();goLive();
  var n=nowS();
  // пока трава не выросла, повторное нажатие не косит
  if(LV.tapN!=null&&n-LV.tapN<TL.REG+1.2)return;
  LV.tapN=n;LV.spin0=n;
  Sound.play([0,'tap']);Sound.play([0,'spin'],.04);
  Sound.play([0,'mow',TL.MOW1-TL.MOW0],TL.MOW0);
  for(var s=0;s<26;s++){var q=s/26;Sound.play([0,'snip',panX(mix(LX,LX+LW[1],q)),s],mix(TL.MOW0,TL.MOW1,q))}
  var nl=LINES[0].length+LINES[1].length;
  for(var g=0;g<nl;g++){var l=g<LINES[0].length?0:1,k=l?g-LINES[0].length:g,row=LET[l][k];Sound.play([0,'sprout',g,panX((row.x0+row.x1)/2)],TL.REG+g*.06+.08)}
}
function liveFrame(n){
  var dt=Math.min(.05,n-LV.n),steps=Math.max(0,Math.round(dt/SIMDT));
  var P=LV.ptr,touched=0;
  if(P){
    // скорость пальца сглаживается, чтобы рывки мыши не ломали траву
    var vx=(P.x-P.px)/Math.max(dt,1/240),vy=(P.y-P.py)/Math.max(dt,1/240);
    P.vx=mix(P.vx,vx,.35);P.vy=mix(P.vy,vy,.35);P.px=P.x;P.py=P.y;
    P.pr=Math.min(1,P.pr+dt/.06);
  }
  for(var k=0;k<steps;k++)touched=Math.max(touched,simStep(SIMDT,P?{x:P.x,y:P.y,vx:P.vx,vy:P.vy,p:P.pr}:null));
  LV.n=n;
  if(P&&touched>4&&n-LV.lastRustle>1/45){
    LV.lastRustle=n;var v=Math.hypot(P.vx,P.vy);
    if(v>25)Sound.play([0,'rustle',clamp(v/420,.12,1)*clamp(touched/40,.3,1),panX(P.x)]);
  }
  var wu=((LV.wu0+(n-LV.n0))%CYCLE+CYCLE)%CYCLE,sp=LV.spin0!=null?n-LV.spin0:9;
  return {wu:wu,tau:liveTau(n),gust:true,
    touch:P?{x:P.x,y:P.y,o:1,k:1-.06*P.pr}:null,
    hot:sp<.42?1:0,spin:sp<.6?-360*eio(seg(sp,-.02,.5)):0};
}

/* ввод */
var S=1;
function toPt(e){var r=screenEl.getBoundingClientRect();return {x:(e.clientX-r.left)/S,y:(e.clientY-r.top)/S}}
screenEl.addEventListener('pointerdown',function(e){
  if(REC||e.button>0||e.target.closest('button'))return;
  Sound.start();goLive();
  var p=toPt(e);
  screenEl.setPointerCapture(e.pointerId);
  LV.ptr={id:e.pointerId,x:p.x,y:p.y,px:p.x,py:p.y,vx:0,vy:0,pr:0};
  Sound.play([0,'down',panX(p.x)]);
});
screenEl.addEventListener('pointermove',function(e){
  if(!LV||!LV.ptr||LV.ptr.id!==e.pointerId)return;
  var p=toPt(e);LV.ptr.x=p.x;LV.ptr.y=p.y;
});
function endPtr(e){if(LV&&LV.ptr&&LV.ptr.id===e.pointerId){Sound.play([0,'lift',panX(LV.ptr.x)]);LV.ptr=null}}
screenEl.addEventListener('pointerup',endPtr);screenEl.addEventListener('pointercancel',endPtr);
retryBtn.addEventListener('click',function(){if(!REC)liveRetry()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
  if(e.key==='r'||e.key==='R'||e.key==='Enter'){e.preventDefault();liveRetry()}
});
var touchy=matchMedia('(pointer: coarse)').matches;
var hintEl=document.getElementById('hint');
function setHint(){hintEl.textContent=touchy?'Brush the grass, then tap retry':'Brush the grass, then hit retry'}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    simTo(u);
    render(scene(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    render(liveFrame(nowS()));
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
function applyTheme(th){
  THEME=th;
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(reduce){WIND.a1*=.4;WIND.a2*=.4;WIND.g*=.5}

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?w*.88/424:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform',(REC||STILL?'translateY('+Math.round(hh*.088)+'px) ':'')+'scale('+S.toFixed(4)+')');
  var dpr=REC||STILL?1:Math.min(2,devicePixelRatio||1);
  canvas.width=Math.round(SW*S*dpr);canvas.height=Math.round(SH*S*dpr);
}

/* раскладка: ответ встаёт под пузырь, кнопки под ответ */
function layout(){
  var bb=bub.offsetTop+bub.offsetHeight;
  B1=Math.round(bb+22+FS*.74+12);B2=B1+LG;
  ACTY=Math.round(B2+FS*.22+16);
  set(acts,'top',ACTY+'px');
}

window.__seek=function(t){goAuto();paused=true;acc=t;var u=uNow();simTo(u);render(scene(u))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};
window.__TL=TL;window.__info=function(){return {N:N,NC:NC,B1:B1,B2:B2,LW:LW,ACTY:ACTY,CYCLE:CYCLE}};

function init(){fit();layout();buildLawn();glInit();glLawn();buildStroke();buildEvents();setHint()}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',function(){fit()});
  requestAnimationFrame(tick);
});
