/* ─────────── Shake ───────────
   ИИ просят перестать ставить длинные тире. Он соглашается, и в ответе их шесть. Телефон трясут,
   как для «Shake to Undo»: тире болтаются в своих гнёздах, выпадают из текста, слова смыкаются,
   а тире падают на поле ввода и ложатся там кучкой (честная физика тонких стержней). Просишь ещё раз,
   ИИ снова «absolutely right», и те же самые шесть тире по одному выпрыгивают из кучки в новый ответ.
   Закон сохранения длинных тире.
   Автопоказ рисуется из одного времени t: физика считается один раз заранее и проигрывается по t,
   поэтому петля замыкается без шва. В живом режиме та же физика идёт в реальном времени. */

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
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}

var ASK='stop using em dashes';
var REPLY='You’re absolutely right — and honestly — that’s on me. No more em dashes — not one — not ever — starting now —';
var TOK=REPLY.split(' ');

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,PADX=22,LH=29;
var FIELD={x:14,y:786,w:374,h:52};
var SENDC={x:FIELD.x+FIELD.w-8-17,y:FIELD.y+8.5+17};
var PIVOT={x:212,y:1160};            // точка, вокруг которой качается телефон (рука ниже корпуса)
var GAP_PILE=46,BUB_GAP=14,EX_GAP=30,KMIN=-4,KMAX=1,PILEX=196;

var phone=document.getElementById('phone'),zoom=document.getElementById('zoom'),screenEl=document.getElementById('screen');
var flow=document.getElementById('flow'),thread=document.getElementById('thread'),rodsEl=document.getElementById('rods');
var typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),ph=document.getElementById('ph'),sendBtn=document.getElementById('send');

var W=TOK.map(function(t,i){
  var s=h('span',null,t);flow.appendChild(s);if(i<TOK.length-1)flow.appendChild(document.createTextNode(' '));
  return {t:t,i:i,fs:s,dash:t==='—',x:0,y:0,w:0,l:0};
});
var SL=[];W.forEach(function(w){if(w.dash)SL.push({i:w.i})});
var NS=SL.length,NT=TOK.length;
var ROD={L:16,T:1.4,cx:8,cy:15,r:.9};
// выпавшее тире ближе к зрителю: длиннее и заметно толще, чем глиф в строке, физика считает его таким
var BIG={L:1.18,T:1.62};
var NL=1,SPW=4.5,BW=0,BH=40,RT=54,EH=170,Y0=600;

/* блоки обменов: k < 0 старые и чистые, 0 текущий, 1 новый */
var EX={};
for(var k=KMIN;k<=KMAX;k++){
  var ex=h('div','ex'),bub=h('div','bub',ASK);ex.appendChild(bub);
  var ws=W.map(function(w){if(w.dash)return null;var e=h('span','w',w.t);ex.appendChild(e);return e});
  thread.appendChild(ex);EX[k]={el:ex,bub:bub,ws:ws};
}
var RODS=[];for(var r=0;r<NS;r++){var e=h('div','rod');rodsEl.appendChild(e);RODS.push(e)}
if(DBG){var dbg=h('div','w');dbg.style.color='red';dbg.style.zIndex=9;dbg.style.position='absolute';thread.appendChild(dbg)}

function measure(){
  W.forEach(function(w){w.x=w.fs.offsetLeft;w.y=w.fs.offsetTop;w.w=w.fs.offsetWidth;w.l=Math.round(w.y/LH)});
  NL=W[NT-1].l+1;
  for(var i=0;i<NT-1;i++)if(W[i].l===W[i+1].l){SPW=W[i+1].x-W[i].x-W[i].w;break}
  // тире рисуется прямоугольником ровно по чернилам глифа: меряем глиф на канвасе
  var cs=getComputedStyle(flow),cv=document.createElement('canvas').getContext('2d');
  cv.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
  var m=cv.measureText('—'),il=-m.actualBoundingBoxLeft,ir=m.actualBoundingBoxRight,as=m.actualBoundingBoxAscent,de=m.actualBoundingBoxDescent;
  var fa=m.fontBoundingBoxAscent,fd=m.fontBoundingBoxDescent,base=(LH-(fa+fd))/2+fa;
  ROD.L=ir-il;ROD.T=as+de;ROD.cx=(il+ir)/2;ROD.cy=base-(as-de)/2;ROD.r=ROD.T/2+.12;
  SL.forEach(function(s){var w=W[s.i];s.l=w.l;s.cx=w.x+ROD.cx;s.cy=w.y+ROD.cy;s.D=w.w+SPW});
  var b=EX[0].bub;BW=b.offsetWidth;BH=b.offsetHeight;
  RT=BH+BUB_GAP;EH=RT+NL*LH+EX_GAP;
  Y0=FIELD.y-GAP_PILE-NL*LH-RT;
  RODS.forEach(function(e){e.style.width=ROD.L.toFixed(3)+'px';e.style.height=ROD.T.toFixed(3)+'px';e.style.borderRadius=(ROD.T*.18).toFixed(2)+'px'});
  for(var k=KMIN;k<=KMAX;k++){
    var X=EX[k];set(X.bub,'transform','translate('+(SW-16-BW)+'px,0px)');
    if(k<0)layoutWords(X,ALL1,1);
  }
  if(DBG){dbg.textContent=REPLY;dbg.style.width='358px';dbg.style.whiteSpace='normal';dbg.style.left=PADX+'px';dbg.style.top=(Y0+RT)+'px'}
}
var ALL1=[1,1,1,1,1,1];

/* сдвиг слова влево, когда тире перед ним на той же строке выпало и щель сомкнулась */
function shiftOf(i,c){var s=0;for(var j=0;j<NS;j++){var q=SL[j];if(q.i<i&&q.l===W[i].l)s+=q.D*c[j]}return s}
function layoutWords(X,c,op){
  W.forEach(function(w,i){
    var e=X.ws[i];if(!e)return;
    var o=typeof op==='number'?op:op[i];
    set(e,'opacity',o<.004?'0':o.toFixed(3));
    var ty=typeof op==='number'?0:(1-o)*2;
    set(e,'transform','translate('+f2(PADX+w.x-shiftOf(i,c))+'px,'+f2(RT+w.y+ty)+'px)');
  });
}
function exTop(k,s){return Y0+(k-s)*EH}
function slotXY(k,j,s,c){var q=SL[j];return {x:PADX+q.cx-(c?shiftOf(q.i,c):0),y:exTop(k,s)+RT+q.cy}}

/* ─────────── движение телефона ───────────
   встряска: несколько размахов, ось вращения ниже корпуса, верх ходит сильнее низа */
var SHK={D:.84,F:5.1,A:21,TH:4.4};
function shakeAt(t){
  if(t<=0||t>=SHK.D)return {X:0,Y:0,th:0};
  var e=Math.pow(Math.sin(Math.PI*t/SHK.D),1.5),w=Math.sin(2*Math.PI*SHK.F*t);
  return {X:SHK.A*e*w,Y:-3.5*e*Math.abs(w),th:SHK.TH*e*Math.sin(2*Math.PI*SHK.F*t-.3)};
}
function worldOf(px,py,m){
  var a=m.th*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=px+11-PIVOT.x,dy=py+11-PIVOT.y;
  return {x:PIVOT.x+c*dx-s*dy+m.X,y:PIVOT.y+s*dx+c*dy+m.Y};
}
/* поле ускорений в системе экрана: тяжесть, повёрнутая вместе с телефоном, и сила инерции
   от его разгона (берётся точка в середине нижней части экрана) */
var G=2500,KF=.055;
function fieldFrom(m0,m1,m2,hh){
  var p0=worldOf(201,700,m0),p1=worldOf(201,700,m1),p2=worldOf(201,700,m2);
  var ax=(p0.x-2*p1.x+p2.x)/(hh*hh),ay=(p0.y-2*p1.y+p2.y)/(hh*hh);
  var a=m1.th*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  var lx=c*ax+s*ay,ly=-s*ax+c*ay;
  return {x:G*s-KF*lx,y:G*c-KF*ly,fx:-KF*lx,fy:-KF*ly};
}
function shakeField(t){var hh=1/600;return fieldFrom(shakeAt(t-hh),shakeAt(t),shakeAt(t+hh),hh)}

/* ─────────── физика тонких стержней ───────────
   Каждое тире: тонкая капсула. Контакты концов с полкой, стенками и с другими тире,
   последовательные импульсы с трением, упреждающие контакты, чтобы тонкое не проскакивало сквозь тонкое. */
function Sim(o){this.B=[];this.fl=o.floor;this.x0=o.x0;this.x1=o.x1;this.L=o.L;this.r=o.r;this.iI=12/(o.L*o.L);this.hits=[];this.t=0}
Sim.prototype.add=function(id,x,y,a,vx,vy,w){var b={id:id,x:x,y:y,a:a,vx:vx,vy:vy,w:w,ht:-1,nc:0};this.B.push(b);return b};
Sim.prototype.get=function(id){for(var i=0;i<this.B.length;i++)if(this.B[i].id===id)return this.B[i];return null};
Sim.prototype.take=function(id){for(var i=0;i<this.B.length;i++)if(this.B[i].id===id)return this.B.splice(i,1)[0];return null};
Sim.prototype.step=function(hh,gx,gy){
  var B=this.B,r=this.r,L2=this.L/2,C=[],i,j,k,b;
  var MG=1.6;
  for(i=0;i<B.length;i++){b=B[i];b.vx+=gx*hh;b.vy+=gy*hh;var d=Math.exp(-.12*hh);b.vx*=d;b.vy*=d;b.w*=Math.exp(-.9*hh);
    var cx=Math.cos(b.a)*L2,cy=Math.sin(b.a)*L2;b.e=[b.x+cx,b.y+cy,b.x-cx,b.y-cy];b.nc=0}
  function mk(A,Bb,nx,ny,px,py,pen){C.push({A:A,B:Bb,nx:nx,ny:ny,px:px,py:py,pen:pen,jn:0,jt:0})}
  for(i=0;i<B.length;i++){
    b=B[i];
    for(k=0;k<4;k+=2){
      var px=b.e[k],py=b.e[k+1],pen;
      pen=py+r-this.fl;if(pen>-MG)mk(b,null,0,-1,px,this.fl,pen);
      pen=this.x0-(px-r);if(pen>-MG)mk(b,null,1,0,this.x0,py,pen);
      pen=(px+r)-this.x1;if(pen>-MG)mk(b,null,-1,0,this.x1,py,pen);
    }
  }
  // конец одного тире против отрезка другого (в 2D ближайшая пара непересекающихся отрезков всегда включает конец)
  function vsSeg(A,Bb){
    var sx=Bb.e[0],sy=Bb.e[1],dx=Bb.e[2]-sx,dy=Bb.e[3]-sy,dd=dx*dx+dy*dy;
    for(var k=0;k<4;k+=2){
      var px=A.e[k],py=A.e[k+1],t=c01(((px-sx)*dx+(py-sy)*dy)/dd),qx=sx+dx*t,qy=sy+dy*t,ex=px-qx,ey=py-qy,dist=Math.sqrt(ex*ex+ey*ey);
      if(dist<2*r+MG){
        var nx,ny;
        if(dist>1e-6){nx=ex/dist;ny=ey/dist}else{nx=-dy/Math.sqrt(dd);ny=dx/Math.sqrt(dd);if((A.x-Bb.x)*nx+(A.y-Bb.y)*ny<0){nx=-nx;ny=-ny}}
        mk(A,Bb,nx,ny,px-nx*r,py-ny*r,2*r-dist);
      }
    }
  }
  for(i=0;i<B.length;i++)for(j=i+1;j<B.length;j++){
    var A=B[i],Bb=B[j];
    if(Math.abs(A.x-Bb.x)>2*L2+4||Math.abs(A.y-Bb.y)>2*L2+4)continue;
    vsSeg(A,Bb);vsSeg(Bb,A);
  }
  var iI=this.iI,MU=.5,E=.28,VTH=55,BETA=.22,SLOP=.04,self=this;
  C.forEach(function(c){
    var A=c.A,Bb=c.B;
    c.rax=c.px-A.x;c.ray=c.py-A.y;
    var rn=c.rax*c.ny-c.ray*c.nx,tx=-c.ny,ty=c.nx,rt=c.rax*ty-c.ray*tx;
    var kn=1+rn*rn*iI,kt=1+rt*rt*iI;
    var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax;
    if(Bb){c.rbx=c.px-Bb.x;c.rby=c.py-Bb.y;var rbn=c.rbx*c.ny-c.rby*c.nx,rbt=c.rbx*ty-c.rby*tx;kn+=1+rbn*rbn*iI;kt+=1+rbt*rbt*iI;
      vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
    c.kn=kn;c.kt=kt;
    var vn=vx*c.nx+vy*c.ny;
    c.bias=c.pen>0?BETA*Math.max(c.pen-SLOP,0)/hh:c.pen/hh;
    if(vn<-VTH&&c.pen-vn*hh>0)c.bias=Math.max(c.bias,-E*vn);
    if(c.pen>-.05){A.nc++;if(Bb)Bb.nc++}
    if(vn<-70&&c.pen-vn*hh>0&&self.t-A.ht>.05){A.ht=self.t;self.hits.push([self.t,A.id,-vn,c.px])}
  });
  for(var it=0;it<12;it++){
    for(k=0;k<C.length;k++){
      var c=C[k],A=c.A,Bb=c.B;
      var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax;
      if(Bb){vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
      var vn=vx*c.nx+vy*c.ny,l=-(vn-c.bias)/c.kn,j0=c.jn;c.jn=Math.max(j0+l,0);l=c.jn-j0;
      var tx=-c.ny,ty=c.nx,vt=vx*tx+vy*ty,lt=-vt/c.kt,t0=c.jt,mx=MU*c.jn;c.jt=clamp(t0+lt,-mx,mx);lt=c.jt-t0;
      var Px=c.nx*l+tx*lt,Py=c.ny*l+ty*lt;
      A.vx+=Px;A.vy+=Py;A.w+=(c.rax*Py-c.ray*Px)*iI;
      if(Bb){Bb.vx-=Px;Bb.vy-=Py;Bb.w-=(c.rbx*Py-c.rby*Px)*iI}
    }
  }
  for(i=0;i<B.length;i++){
    b=B[i];
    // лёгкое трение покоя, чтобы кучка не ползла
    if(b.nc>0&&Math.abs(b.vx)+Math.abs(b.vy)<7&&Math.abs(b.w)<.8){var q=Math.exp(-7*hh);b.vx*=q;b.vy*=q;b.w*=q}
    b.x+=b.vx*hh;b.y+=b.vy*hh;b.a+=b.w*hh;
  }
  this.t+=hh;
};
/* тире выскакивает из строки чуть вверх и летит так, чтобы лечь в общую кучку на поле */
var HEAPO=[-6,5,-1,9,-10,2];
function popVel(p,tx,R){
  var vy=-(70+R()*55),dy=FIELD.y-ROD.T*BIG.T/2-p.y,tf=(-vy+Math.sqrt(vy*vy+2*G*Math.max(dy,1)))/G;
  return {x:(tx-p.x)/tf,y:vy,w:(R()-.5)*20};
}
function newSim(){return new Sim({floor:FIELD.y,x0:FIELD.x+4,x1:FIELD.x+FIELD.w-4,L:ROD.L*BIG.L,r:ROD.T*BIG.T/2+.1})}

/* ─────────── сценарий петли ─────────── */
var TL={},CYCLE=6,FLT=.4,FADE=1.4;
var CLOSE_D=.035;
function closeAt(t){if(t<=0)return 0;var z=.62,w=2*Math.PI*4.2,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}
function buildTL(){
  var order=[2,0,4,1,5,3];
  TL.DET=[];order.forEach(function(j,k){TL.DET[j]=.15+k*.066});
  TL.TY0=1.02;TL.KEYS=[];var t=TL.TY0;
  for(var i=0;i<ASK.length;i++){TL.KEYS.push(t);t+=.019+((i*7)%5)*.004+(ASK[i]===' '?.02:0)}
  TL.TY1=t;
  TL.SEND=TL.TY1+.16;
  TL.BUB0=TL.SEND+.03;TL.BUB1=TL.BUB0+.42;
  TL.SC0=TL.SEND+.03;TL.SC1=TL.SC0+.52;
  TL.ST0=TL.SC1+.02;TL.R=14;
  TL.LAND=[];TL.OFF=[];
  SL.forEach(function(q,j){TL.LAND[j]=TL.ST0+q.i/TL.R;TL.OFF[j]=TL.LAND[j]-FLT});
  TL.ST1=TL.ST0+(NT-1+FADE)/TL.R;
  TL.HOLD=.95;
  CYCLE=TL.ST1+TL.HOLD;
}

/* дребезг тире в гнезде: растёт к моменту, когда оно выпадет */
function rattle(r,u,lv){
  var a=2*Math.PI*u;
  return {
    dx:lv*(.7*Math.sin(a*23+r*1.7)+.4*Math.sin(a*37+r*2.9)),
    dy:lv*(.9*Math.sin(a*29+r*.9)+.5*Math.sin(a*43+r*4.1))-lv*.5,
    da:lv*(.12*Math.sin(a*19+r*2.3)+.07*Math.sin(a*31+r*.4))
  };
}
function closures0(u){var c=[];for(var j=0;j<NS;j++)c.push(closeAt(u-TL.DET[j]-CLOSE_D));return c}
function seatPose0(r,u){
  var c=closures0(u),p=slotXY(0,r,0,c),lv=sm(seg(u,.03,TL.DET[r])),q=rattle(r,u,lv);
  return {x:p.x+q.dx,y:p.y+q.dy,a:q.da};
}

/* физика петли считается один раз: от встряски до последнего прыжка тире обратно в текст */
var TRK=[],FL=[],HITS=[],SR=240;
function precompute(){
  var sim=newSim(),hh=1/1200,R=rng(11),added=[],jolted=false,nf=0;
  TRK=[];FL=[];
  for(var r=0;r<NS;r++)TRK.push({t0:TL.DET[r],m0:Math.ceil(TL.DET[r]*SR-1e-9),d:[],t1:CYCLE});
  var N=Math.ceil((TL.OFF[NS-1]+.01)/hh);
  for(var n=0;n<=N;n++){
    var t=n*hh;sim.t=t;
    for(r=0;r<NS;r++)if(!added[r]&&t>=TL.DET[r]){
      var p=seatPose0(r,t),f=shakeField(t);
      // тире выскакивает из строки чуть вверх и вбок и кувыркается
      var v=popVel(p,PILEX+HEAPO[r],R);sim.add(r,p.x,p.y,p.a,v.x,v.y,v.w);
      added[r]=1;
    }
    if(!jolted&&t>=TL.SEND){
      jolted=true;
      sim.B.forEach(function(b){var d=Math.hypot(b.x-SENDC.x,b.y-SENDC.y);if(d<95){b.vy-=150*(1-d/95);b.w+=(R()-.5)*14}});
    }
    while(nf<NS&&t>=TL.OFF[nf]){
      // к следующему гнезду прыгает верхнее тире кучки (при равной высоте ближнее)
      var tg=slotXY(1,nf,1),best=null,bs=1e9;
      sim.B.forEach(function(b){var s=b.y+Math.abs(b.x-tg.x)*.02;if(s<bs){bs=s;best=b}});
      var b=sim.take(best.id);
      FL[nf]={r:b.id,x:b.x,y:b.y,a:b.a};TRK[b.id].t1=t;nf++;
    }
    if(n%(1200/SR)===0){
      var m=Math.round(t*SR);
      sim.B.forEach(function(b){var T=TRK[b.id];T.d[(m-T.m0)*3]=b.x;T.d[(m-T.m0)*3+1]=b.y;T.d[(m-T.m0)*3+2]=b.a});
    }
    var g=shakeField(t);sim.step(hh,g.x,g.y);
  }
  HITS=sim.hits;
}
function trackPose(r,u){
  var T=TRK[r],m=u*SR-T.m0,n=T.d.length/3-1;
  if(m<=0)return {x:T.d[0],y:T.d[1],a:T.d[2]};
  if(m>=n)return {x:T.d[n*3],y:T.d[n*3+1],a:T.d[n*3+2]};
  var i=Math.floor(m),f=m-i,o=i*3;
  return {x:mix(T.d[o],T.d[o+3],f),y:mix(T.d[o+1],T.d[o+4],f),a:mix(T.d[o+2],T.d[o+5],f)};
}

/* прыжок тире из кучки в гнездо: дуга над прямой, полтора оборота, приземление ровно */
function flightPose(F0,p,tg){
  var dx=tg.x-F0.x,dir=dx>=0?1:-1,H=44+Math.abs(dx)*.12;
  var aT=Math.round((F0.a+dir*1.6*Math.PI)/Math.PI)*Math.PI;
  var x=mix(F0.x,tg.x,p*(.82+.18*p)),y=mix(F0.y,tg.y,p)-H*4*p*(1-p);
  var a=mix(F0.a,aT,eout(p/.86));
  var k=1-sm(seg(p,.55,1));return {x:x,y:y,a:a-aT,big:k,sh:k};
}
function seatBounce(t){return t<=0||t>.3?0:-1.6*Math.exp(-t*16)*Math.sin(t*44)}

/* ─────────── кадр ───────────
   F.ph: телефон; F.s: прокрутка ленты в долях обмена; F.c0: сомкнутость щелей в текущем ответе;
   F.ex1: новый обмен {bub, P}; F.rods: позы тире в точках экрана; F.comp: поле ввода */
function render(F){
  set(phone,'transform','translate('+f2(F.ph.X)+'px,'+f2(F.ph.Y)+'px) rotate('+F.ph.th.toFixed(3)+'deg)');
  set(thread,'transform','translateY('+f2(-F.s*EH)+'px)');
  for(var k=KMIN;k<=KMAX;k++)set(EX[k].el,'transform','translateY('+f2(Y0+k*EH)+'px)');
  layoutWords(EX[0],F.c0,1);
  var X1=EX[1];
  if(!F.ex1){set(X1.el,'visibility','hidden')}
  else{
    set(X1.el,'visibility','visible');
    var ops=W.map(function(w,i){return w.dash?0:sm((F.ex1.P-i)/FADE)});
    layoutWords(X1,[0,0,0,0,0,0],ops);
    // пузырь вылетает из поля ввода на своё место в ленте
    var e=F.ex1.bub,tY=exTop(1,F.s),fx=FIELD.x+44-15,fy=FIELD.y+13-9;
    var dx=(fx-(SW-16-BW))*(1-e),dy=(fy-tY)*(1-e);
    set(X1.bub,'transform','translate('+f2(SW-16-BW+dx)+'px,'+f2(dy)+'px)');
    set(X1.bub,'background',e<.999?tileA(sm(e*1.6)):'');
  }
  for(var r=0;r<NS;r++){
    var q=F.rods[r],el=RODS[r];
    set(el,'transform','translate('+f2(q.x-ROD.L/2)+'px,'+f2(q.y-ROD.T/2)+'px) rotate('+(q.a*180/Math.PI).toFixed(2)+'deg) scale('+mix(1,BIG.L,q.big).toFixed(3)+','+mix(1,BIG.T,q.big).toFixed(3)+')');
    set(el,'boxShadow',q.sh>.02?'0 '+(1.3*q.sh).toFixed(2)+'px '+(1.6*q.sh).toFixed(2)+'px var(--rod-sh)':'none');
  }
  var c=F.comp;
  typedEl.textContent=ASK.slice(0,c.n);
  set(ph,'opacity',c.n>0?'0':'1');
  set(caret,'opacity',c.caret.toFixed(2));
  set(sendBtn,'background',c.send>.5?'var(--blue)':'');
  set(sendBtn,'transform','scale('+(1-.12*c.press).toFixed(3)+')');
}
var TILE=[240,238,234];
function tileA(a){return 'rgba('+TILE[0]+','+TILE[1]+','+TILE[2]+','+a.toFixed(3)+')'}

/* ─────────── автопоказ ─────────── */
function scene(u){
  var F={ph:shakeAt(u),s:eio(seg(u,TL.SC0,TL.SC1)),c0:closures0(u),ex1:null,rods:[],comp:{n:0,caret:0,send:0,press:0}};
  if(u>=TL.SEND)F.ex1={bub:eout(seg(u,TL.BUB0,TL.BUB1)),P:(u-TL.ST0)*TL.R};
  var n=0;for(var i=0;i<TL.KEYS.length;i++)if(u>=TL.KEYS[i])n=i+1;
  if(u>=TL.SEND)n=0;
  F.comp.n=n;F.comp.send=n>0?1:0;
  F.comp.caret=u>=TL.TY0-.35&&u<TL.SEND?(u<TL.TY1+.1||((u-TL.TY1)%1)<.55?1:0):0;
  F.comp.press=pulse(u,TL.SEND-.03,TL.SEND+.04);
  for(var r=0;r<NS;r++){
    var j=-1;for(var q=0;q<NS;q++)if(FL[q]&&FL[q].r===r)j=q;
    var P;
    if(u<TL.DET[r]){P=seatPose0(r,u);P.big=0;P.sh=0}
    else if(j>=0&&u>=TL.OFF[j]){
      var tg=slotXY(1,j,F.s);
      if(u<TL.LAND[j])P=flightPose(FL[j],seg(u,TL.OFF[j],TL.LAND[j]),tg);
      else P={x:tg.x,y:tg.y+seatBounce(u-TL.LAND[j]),a:0,big:0,sh:0};
    }
    else{P=trackPose(r,u);P.big=sm(seg(u,TL.DET[r],TL.DET[r]+.09));P.sh=P.big*(1-.5*sm(seg(u,TL.DET[r]+.5,TL.DET[r]+1.1)))}
    F.rods.push(P);
  }
  return F;
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function panX(x){return clamp((x/SW-.5)*.7,-.6,.6)}
function buildEvents(){
  EVENTS=[];var R=rng(5);
  // взмахи телефона: по одному на каждый ход в сторону
  for(var k=0;k<12;k++){var t=(k+.5)/(2*SHK.F);if(t<SHK.D){var e=Math.pow(Math.sin(Math.PI*t/SHK.D),1.5);EVENTS.push([t-.04,'swish',e,k%2?.25:-.25])}}
  // тире дребезжат в гнёздах всё чаще, потом выскакивают
  for(var r=0;r<NS;r++){
    var t=.04;while(t<TL.DET[r]){var lv=sm(seg(t,.03,TL.DET[r]));EVENTS.push([t,'rattle',r,.25+.75*lv,panX(SL[r].cx)]);t+=.075-.045*lv+R()*.03}
    EVENTS.push([TL.DET[r],'pop',r,panX(SL[r].cx)]);
  }
  HITS.forEach(function(hh){EVENTS.push([hh[0],'hit',hh[1],hh[2],panX(hh[3])])});
  TL.KEYS.forEach(function(t,i){EVENTS.push([t,'key',i])});
  EVENTS.push([TL.SEND-.03,'press'],[TL.SEND+.02,'send']);
  W.forEach(function(w,i){if(!w.dash)EVENTS.push([TL.ST0+i/TL.R,'tick',panX(PADX+w.x),i])});
  for(var j=0;j<NS;j++){EVENTS.push([TL.OFF[j],'fly',j,panX(FL[j]?FL[j].x:200)]);EVENTS.push([TL.LAND[j],'seat',j,panX(PADX+SL[j].cx)])}
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Телефон можно таскать мышью или пальцем, S или кнопка Shake трясут его, на телефоне можно трясти
   сам телефон. Выпало хоть одно тире: в поле набирается просьба, отправка запускает новый ответ,
   и тире прыгают в него из кучки, а если в кучке пусто, выдёргиваются из старого ответа. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveInit(n,u){
  // живое состояние собирается из текущего кадра автопоказа, без скачка
  var F=scene(u),base=n-u;
  LV={n:n,sim:newSim(),ph:{X:F.ph.X,Y:F.ph.Y,th:F.ph.th,vx:0,vy:0},shake:u<SHK.D?base:null,drag:null,
      rods:[],c0t:[],ex1:null,typeT0:null,lastDet:-9,acc:{x:0,y:0},dev:{x:0,y:0},pf:[null,null],R:rng(23)};
  for(var j=0;j<NS;j++)LV.c0t[j]=u>=TL.DET[j]+CLOSE_D?base+TL.DET[j]+CLOSE_D:null;
  if(u>=TL.SEND){
    LV.ex1={t0:base+TL.SEND,pending:[]};
    for(j=0;j<NS;j++)if(u<TL.OFF[j])LV.ex1.pending.push(j);
  }
  if(u>=TL.TY0&&u<TL.SEND)LV.typeT0=base+TL.TY0;
  for(var r=0;r<NS;r++){
    var jj=-1;for(var q=0;q<NS;q++)if(FL[q]&&FL[q].r===r)jj=q;
    var o={st:'seat0',slot:r,loose:0,thr:.85+LV.R()*.35};
    if(u<TL.DET[r]){o.loose=sm(seg(u,.03,TL.DET[r]))*o.thr*.9}
    else if(jj>=0&&u>=TL.OFF[jj]){
      if(u<TL.LAND[jj]){o.st='fly';o.slot=jj;o.fly={t0:base+TL.OFF[jj],x:FL[jj].x,y:FL[jj].y,a:FL[jj].a}}
      else{o.st='seat1';o.slot=jj;o.land=base+TL.LAND[jj]}
    }
    else{
      o.st='free';var a=trackPose(r,u),b=trackPose(r,Math.max(TL.DET[r],u-1/60));
      LV.sim.add(r,a.x,a.y,a.a,(a.x-b.x)*60,(a.y-b.y)*60,(a.a-b.a)*60);
      o.det=base+TL.DET[r];
    }
    LV.rods.push(o);
  }
  if(u<TL.DET[0]||u>=TL.LAND[NS-1]+.3){/* чистое состояние */}
  LV.lastDet=base+Math.max.apply(null,TL.DET.filter(function(d){return d<=u}).concat([-9]));
  mode='live';document.documentElement.classList.add('live');
}
function goLive(){if(mode==='live')return;var n=nowS();liveInit(n,uNow())}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live');setHint()}

function liveShake(){
  Sound.start();goLive();
  if(LV.shake!=null&&LV.n-LV.shake<SHK.D)return;
  LV.shake=LV.n;
}
function canSend(){if(!LV||LV.ex1||LV.typeT0==null)return false;return LV.n-LV.typeT0>=TL.TY1-TL.TY0}
function liveSend(){
  Sound.start();goLive();
  if(!canSend())return;
  var n=LV.n;
  LV.ex1={t0:n,pending:[0,1,2,3,4,5]};LV.typeT0=null;
  Sound.play([0,'press']);Sound.play([0,'send'],.05);
  LV.pressT=n;
  var R=LV.R;
  LV.sim.B.forEach(function(b){var d=Math.hypot(b.x-SENDC.x,b.y-SENDC.y);if(d<95){b.vy-=150*(1-d/95);b.w+=(R()-.5)*14}});
}
function liveSeatXY(o,s,c0){
  if(o.st==='seat0'){var p=slotXY(0,o.slot,s,c0),q=rattle(o.slot,LV.n,Math.min(1,o.loose/o.thr));return {x:p.x+q.dx,y:p.y+q.dy,a:q.da,big:0,sh:0}}
  var t=slotXY(1,o.slot,s);return {x:t.x,y:t.y+seatBounce(LV.n-o.land),a:0,big:0,sh:0};
}
function liveC0(n){var c=[];for(var j=0;j<NS;j++)c.push(LV.c0t[j]==null?0:closeAt(n-LV.c0t[j]));return c}
function liveS(n){return LV.ex1?eio(seg(n-LV.ex1.t0,TL.SC0-TL.SEND,TL.SC1-TL.SEND)):0}

var DRAGK=520,DRAGC=2*Math.sqrt(520);
function liveStep(n,dt){
  var hh=1/1200,steps=Math.max(1,Math.round(dt/hh)),sim=LV.sim;
  for(var k=0;k<steps;k++){
    var t=LV.n+hh;
    // телефон: сценарная встряска или пружина за пальцем
    var m,f;
    if(LV.shake!=null&&t-LV.shake<SHK.D){
      var ts=t-LV.shake;m=shakeAt(ts);f=shakeField(ts);
      LV.ph.X=m.X;LV.ph.Y=m.Y;LV.ph.th=m.th;LV.ph.vx=0;LV.ph.vy=0;
    }else{
      LV.shake=null;
      var P=LV.ph,tx=LV.drag?LV.drag.tx:0,ty=LV.drag?LV.drag.ty:0;
      var ax=DRAGK*(tx-P.X)-DRAGC*P.vx+LV.dev.x*55,ay=DRAGK*(ty-P.Y)-DRAGC*P.vy+LV.dev.y*35;
      P.vx+=ax*hh;P.vy+=ay*hh;P.X+=P.vx*hh;P.Y+=P.vy*hh;
      var thT=clamp(P.vx*.022,-9,9);P.th+=(thT-P.th)*(1-Math.exp(-18*hh));
      var a=P.th*Math.PI/180,c=Math.cos(a),s=Math.sin(a),lx=c*ax+s*ay,ly=-s*ax+c*ay;
      var dfx=-LV.dev.x*190,dfy=LV.dev.y*190;
      f={x:G*s-KF*lx+dfx,y:G*c-KF*ly+dfy,fx:-KF*lx+dfx,fy:-KF*ly+dfy};
      m=P;
    }
    // тряска раскачивает тире в гнёздах текущего ответа, пока ИИ не начал новый
    var fm=Math.hypot(f.fx,f.fy);
    LV.rods.forEach(function(o,r){
      if(o.st!=='seat0'||LV.ex1)return;
      o.loose=Math.max(0,o.loose+(Math.max(0,fm-260)*.0034-.5)*hh);
      if(Math.random()<o.loose*hh*16&&o.loose>.12)Sound.play([0,'rattle',r,clamp(o.loose/o.thr,.2,1),panX(SL[o.slot].cx)]);
      if(o.loose>=o.thr){
        var c0=liveC0(t),p=slotXY(0,o.slot,0,c0),q=rattle(o.slot,t,1),R=LV.R;
        var v=popVel({x:p.x+q.dx,y:p.y+q.dy},PILEX+(R()-.5)*36,R);sim.add(r,p.x+q.dx,p.y+q.dy,q.da,v.x,v.y,v.w);
        o.st='free';o.det=t;LV.c0t[o.slot]=t+CLOSE_D;LV.lastDet=t;
        Sound.play([0,'pop',r,panX(p.x)]);
      }
    });
    // новый ответ: по расписанию тире прыгают в свои гнёзда
    if(LV.ex1){
      var X=LV.ex1;
      while(X.pending.length&&t>=X.t0+TL.OFF[X.pending[0]]-TL.SEND){
        var j=X.pending.shift(),tg=slotXY(1,j,liveS(t)),best=null,bs=1e9;
        sim.B.forEach(function(b){var s2=b.y+Math.abs(b.x-tg.x)*.02;if(s2<bs){bs=s2;best=b}});
        var src;
        if(best){var b=sim.take(best.id);src={r:b.id,x:b.x,y:b.y,a:b.a}}
        else{
          // кучка пуста: тире выдёргивается из старого ответа
          var c0=liveC0(t),pick=-1;
          LV.rods.forEach(function(o,r){if(o.st==='seat0'&&pick<0)pick=r});
          if(pick<0){var fl=-1;LV.rods.forEach(function(o,r){if(o.st==='free'&&fl<0)fl=r});continue}
          var o=LV.rods[pick],p=slotXY(0,o.slot,liveS(t),c0);src={r:pick,x:p.x,y:p.y,a:0};LV.c0t[o.slot]=t+.12;
        }
        var ro=LV.rods[src.r];ro.st='fly';ro.slot=j;ro.fly={t0:t,x:src.x,y:src.y,a:src.a};
        Sound.play([0,'fly',j,panX(src.x)]);
      }
      LV.rods.forEach(function(o){
        if(o.st==='fly'&&t>=o.fly.t0+FLT){o.st='seat1';o.land=o.fly.t0+FLT;Sound.play([0,'seat',o.slot,panX(PADX+SL[o.slot].cx)])}
      });
      // ответ дописан и все тире на местах: новый обмен становится текущим
      if(!X.pending.length&&t>=X.t0+TL.ST1-TL.SEND+.05&&LV.rods.every(function(o){return o.st==='seat1'})){
        LV.rods.forEach(function(o){o.st='seat0';o.loose=0;o.thr=.85+LV.R()*.35});
        LV.ex1=null;for(var q=0;q<NS;q++)LV.c0t[q]=null;LV.typeT0=null;
      }
    }
    if(sim.B.length){sim.t=t;sim.step(hh,f.x,f.y)}
    LV.n=t;
  }
  // звук ударов из живой физики
  while(sim.hits.length){var hi=sim.hits.shift();Sound.play([0,'hit',hi[1],hi[2],panX(hi[3])])}
  // хоть одно тире выпало и всё улеглось: в поле набирается просьба
  if(!LV.ex1&&LV.typeT0==null&&LV.rods.some(function(o){return o.st!=='seat0'})&&n-LV.lastDet>.75)LV.typeT0=n;
}
function liveF(n){
  var F={ph:{X:LV.ph.X,Y:LV.ph.Y,th:LV.ph.th},s:liveS(n),c0:liveC0(n),ex1:null,rods:[],comp:{n:0,caret:0,send:0,press:0}};
  if(LV.ex1){var t0=LV.ex1.t0;F.ex1={bub:eout(seg(n-t0,TL.BUB0-TL.SEND,TL.BUB1-TL.SEND)),P:(n-t0-(TL.ST0-TL.SEND))*TL.R}}
  if(LV.typeT0!=null){
    var el=n-LV.typeT0+TL.TY0,c=0;for(var i=0;i<TL.KEYS.length;i++)if(el>=TL.KEYS[i])c=i+1;
    F.comp.n=c;F.comp.send=c>0?1:0;F.comp.caret=el<TL.TY1+.1||((el-TL.TY1)%1)<.55?1:0;
    if(c>LV.typedN){for(var q=LV.typedN;q<c;q++)Sound.play([0,'key',q])}
    LV.typedN=c;
  }else LV.typedN=0;
  if(LV.pressT!=null)F.comp.press=pulse(n-LV.pressT,0,.07);
  LV.rods.forEach(function(o,r){
    var P;
    if(o.st==='free'){var b=LV.sim.get(r),age=n-(o.det==null?n-2:o.det);P={x:b.x,y:b.y,a:b.a,big:sm(age/.09),sh:sm(age/.09)*(1-.5*sm((age-.5)/.6))}}
    else if(o.st==='fly'){var tg=slotXY(1,o.slot,F.s);P=flightPose(o.fly,seg(n,o.fly.t0,o.fly.t0+FLT),tg)}
    else P=liveSeatXY(o,F.s,F.c0);
    F.rods.push(P);
  });
  return F;
}

/* ввод: тащить телефон, кнопка и клавиши, акселерометр */
var S=1;
phone.addEventListener('pointerdown',function(e){
  if(REC||e.button>0||e.target.closest('#send'))return;
  Sound.start();goLive();
  phone.setPointerCapture(e.pointerId);phone.classList.add('grab');
  LV.drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,X0:LV.ph.X,Y0:LV.ph.Y,tx:LV.ph.X,ty:LV.ph.Y};
});
phone.addEventListener('pointermove',function(e){
  if(!LV||!LV.drag||LV.drag.id!==e.pointerId)return;
  var d=LV.drag,k=1/S;
  d.tx=clamp(d.X0+(e.clientX-d.x0)*k,-110,110);d.ty=clamp(d.Y0+(e.clientY-d.y0)*k*.35,-40,40);
});
function endDrag(e){if(LV&&LV.drag&&LV.drag.id===e.pointerId){LV.drag=null;phone.classList.remove('grab')}}
phone.addEventListener('pointerup',endDrag);phone.addEventListener('pointercancel',endDrag);
sendBtn.addEventListener('click',function(){if(!REC)liveSend()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
  if(e.key==='s'||e.key==='S'||e.key===' '){e.preventDefault();liveShake()}
  if(e.key==='Enter'){e.preventDefault();liveSend()}
});
var motionOn=false;
function onMotion(e){
  var a=e.acceleration;if(!a||!LV)return;
  var x=a.x||0,y=a.y||0;
  LV.dev.x=Math.abs(x)>1.2?x:0;LV.dev.y=Math.abs(y)>1.2?y:0;
}
function askMotion(){
  if(motionOn||!window.DeviceMotionEvent)return;
  var go=function(){motionOn=true;addEventListener('devicemotion',function(e){if(mode!=='live')goLive();onMotion(e)})};
  if(typeof DeviceMotionEvent.requestPermission==='function')DeviceMotionEvent.requestPermission().then(function(s){if(s==='granted')go()}).catch(function(){});
  else go();
}
var touchy=matchMedia('(pointer: coarse)').matches;
var hintEl=document.getElementById('hint');
function setHint(){hintEl.textContent=touchy?'Shake your phone, or drag this one':'Drag the phone side to side, or press S'}

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
    if(dt>0)liveStep(n,Math.min(dt,n-LV.n));
    render(liveF(n));
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;goAuto()};
document.getElementById('shk').onclick=function(){if(touchy)askMotion();liveShake()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start();if(touchy)askMotion()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  TILE=hex(getComputedStyle(document.documentElement).getPropertyValue('--tile'));
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(reduce){SHK.A*=.4;SHK.TH*=.4}

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?w*.83/424:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};
window.__TL=TL;window.__ROD=ROD;

function init(){fit();measure();buildTL();precompute();buildEvents();setHint()}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',function(){fit()});
  requestAnimationFrame(tick);
});
