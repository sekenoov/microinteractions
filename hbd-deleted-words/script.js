/* ─────────── Hbd ───────────
   День рождения бывшего, 11:59 вечера. Пишешь длинное, держишь delete, и стёртое буквально
   вылетает из поля и падает на клавиатуру. Сначала по букве, потом целыми словами.
   Три черновика, клавиатура завалена «still», «miss», «remember», потом три буквы: hbd.
   Отправил, клавиатура уезжает вниз и уносит всё несказанное. Приходит «ty».
   Выше в переписке каждый год одно и то же.
   Автопоказ рисуется из одного времени t: физика кучи считается один раз при загрузке
   и проигрывается по t, поэтому петля замыкается без шва. В живом режиме delete держит зритель. */

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
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: z затухание, f частота в Гц
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

var DRAFTS=[
  'happy birthday!! i know it’s been a while but i still think about you',
  'i hope you’re happy. i really do. i miss',
  'remember last year when we'
],SENT='hbd',REPLY='ty',AT='11:59 PM',YEARS=[2021,2022,2023,2024,2025];

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,FS=21,LH=26,BH=40,RX=20,MEX=382,GX=10;
var KH=292,KBY=SH-KH,KX=3.5,KG=6,KW=(SW-2*KX-9*KG)/10,KHH=44,KP=55,KT=9;
var FX=64,FW=324,FTX=FX+16,FTW=FW-16-44,FUP=KBY-8,FDOWN=832,FH0=46;
var TAIL=new Path2D('M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z');
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
var G=2300,GHOST=.16;

// клавиши: координаты от верха клавиатуры
var KEYS={},SPK={};
(function(){
  var rows=['qwertyuiop','asdfghjkl','zxcvbnm'],x0=[KX,KX+(KW+KG)/2,KX+1.5*(KW+KG)];
  rows.forEach(function(r,j){for(var i=0;i<r.length;i++)KEYS[r[i]]={x:x0[j]+i*(KW+KG),y:KT+j*KP,w:KW,h:KHH}});
  SPK.shift={x:KX,y:KT+2*KP,w:44,h:KHH};SPK.del={x:SW-KX-44,y:KT+2*KP,w:44,h:KHH};
  SPK.n123={x:KX,y:KT+3*KP,w:92,h:KHH};SPK.ret={x:SW-KX-92,y:KT+3*KP,w:92,h:KHH};
  SPK.space={x:KX+92+KG,y:KT+3*KP,w:SW-2*KX-184-2*KG,h:KHH};
})();

/* ─────────── поле ввода: перенос по словам ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),COL={},KDPR=1;
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt,ls){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
var MWC={};
function mw(s){var v=MWC[s];if(v==null){setFont(FS);v=MWC[s]=ctx.measureText(s).width}return v}
function layout(s){
  var L={words:[],n:1,cx:0,cl:0},re=/\S+/g,m,x=0,ln=0,sp=mw(' ');
  while((m=re.exec(s))){
    var w={s:m[0],i0:m.index,w:mw(m[0])};
    if(x>0&&x+w.w>FTW){ln++;x=0}
    w.x=x;w.ln=ln;L.words.push(w);x+=w.w+sp;
  }
  L.n=ln+1;
  if(L.words.length){
    var lw=L.words[L.words.length-1],tr=s.length-(lw.i0+lw.s.length);
    L.cx=lw.x+lw.w+tr*sp;L.cl=lw.ln;
  }
  return L;
}

/* ─────────── сценарий петли ───────────
   Опы: [время, текст после, что нажато]. Стёртое уходит в кучу телом (sp). */
var TL={},CYCLE=9;
function Round(){return{ops:[],holds:[],tSend:null,tDis:null,tRead:null,tTy:null,tUp:null,bodies:[]}}
function opAt(R,t){var a=R.ops,lo=0,hi=a.length-1,k=-1;while(lo<=hi){var md=(lo+hi)>>1;if(a[md].t<=t){k=md;lo=md+1}else hi=md-1}return k}
function textAt(R,t){var k=opAt(R,t);return k<0?'':R.ops[k].s}
// что уходит при одном нажатии delete: буква или (в режиме слов) слово с пробелом перед ним
function delUnit(s,word){
  var L=layout(s),lw=L.words[L.words.length-1],sp=null,ns;
  if(word){var m=s.match(/\s*\S+\s*$/);ns=s.slice(0,s.length-m[0].length);if(lw)sp={s:lw.s,x:lw.x+lw.w/2,ln:lw.ln}}
  else{
    var c=s[s.length-1];ns=s.slice(0,-1);
    if(c!==' '&&lw){var k=s.length-1-lw.i0,cx=lw.x+mw(lw.s.slice(0,k));sp={s:c,x:cx+mw(c)/2,ln:lw.ln}}
  }
  return{s:ns,sp:sp};
}
function typeOps(R,s,str,t,dt,rnd){
  for(var i=0;i<str.length;i++){s+=str[i];R.ops.push({t:t,s:s,k:'key',ch:str[i]});t+=dt*(.7+.6*rnd())+(str[i]===' '?dt*.5:0)}
  return t;
}
// держишь delete: несколько букв, потом слова всё чаще
function delOps(R,s,t,nc,cg,w0,w1){
  var t0=t,k=0,nw=0,total=s.match(/\S+/g).length;
  while(s.length){
    var word=k>=nc,u=delUnit(s,word);s=u.s;
    R.ops.push({t:t,s:s,k:'del',sp:u.sp});
    if(word)nw++;
    t+=word?mix(w0,w1,Math.min(1,nw/Math.max(1,total-2))):cg[Math.min(k,cg.length-1)];k++;
  }
  R.holds.push([t0-.04,R.ops[R.ops.length-1].t+.07]);
  return R.ops[R.ops.length-1].t;
}
var AUTO=null;
function buildScript(){
  var R=Round(),rnd=rng(7),t=.3;
  t=typeOps(R,'',DRAFTS[0],t,.0165,rnd);TL.A1=t;
  t=delOps(R,DRAFTS[0],t+.3,4,[.17,.12,.1,.09],.1,.06);TL.DA1=t;
  t=typeOps(R,'',DRAFTS[1],t+.24,.015,rnd);
  t=delOps(R,DRAFTS[1],t+.2,4,[.13,.1,.08,.07],.07,.05);
  t=typeOps(R,'',DRAFTS[2],t+.2,.0135,rnd);
  t=delOps(R,DRAFTS[2],t+.16,0,[.07],.075,.055);
  TL.H0=t+.32;
  R.ops.push({t:TL.H0,s:'h',k:'key',ch:'h'});R.ops.push({t:TL.H0+.17,s:'hb',k:'key',ch:'b'});R.ops.push({t:TL.H0+.32,s:'hbd',k:'key',ch:'d'});
  R.tSend=TL.H0+.66;R.ops.push({t:R.tSend,s:'',k:'send'});
  R.tDis=R.tSend+.16;R.tRead=R.tDis+.6;R.tTy=R.tRead+.18;R.tUp=R.tTy+.9;
  CYCLE=R.tUp+.36+.14;
  TL.SEND=R.tSend;TL.DIS=R.tDis;TL.TY=R.tTy;TL.UP=R.tUp;TL.CYCLE=CYCLE;
  AUTO=R;
}

/* ─────────── клавиатура уезжает и возвращается ───────────
   kd: 0 поднята, 1 спрятана. Перед уходом она чуть подбрасывает кучу. */
function kdAt(R,t){
  if(R.tDis==null||t<R.tDis)return 0;
  if(R.tUp!=null&&t>=R.tUp)return 1-eout(seg(t,R.tUp,R.tUp+.36));
  return eio(seg(t,R.tDis,R.tDis+.44));
}
function bumpAt(R,t){return R.tDis==null?0:-9*Math.sin(Math.PI*seg(t,R.tDis-.1,R.tDis+.02))}
function kbOff(R,t){return kdAt(R,t)*(KH+30)+bumpAt(R,t)}
function fieldBottom(R,t){return Math.min(FUP+kbOff(R,t),FDOWN)}
function floorAt(R,t){return SH-12+kbOff(R,t)}

/* ─────────── физика слов ───────────
   Слово это капсула по ширине текста. Контакты концов с полом, стенками и скруглёнными углами
   экрана, концов одной капсулы с отрезком другой; последовательные импульсы с трением.
   Только что вылетевшее слово пролетает сквозь чужие, иначе дуги из поля рвутся. */
function Sim(){this.B=[];this.t=0;this.floor=SH-12;this.fv=0;this.hits=[];this.warm=new Map();this.sep=new Set()}
Sim.prototype.add=function(b){
  var r=b.r,hl=b.hl,ar=4*hl*r,ac=Math.PI*r*r,m=(ar+ac)/600;
  var I=(ar/600)*(4*hl*hl+4*r*r)/12+(ac/600)*(r*r/2+hl*hl);
  b.im=1/m;b.ii=1/I;b.ht=-1;b.nc=0;this.B.push(b);return b;
};
Sim.prototype.step=function(hh){
  var B=this.B,C=[],i,j,k,b,MG=1.5,fl=this.floor,fv=this.fv,self=this,CR=57;
  for(i=0;i<B.length;i++){
    b=B[i];b.vy+=G*hh;var d=Math.exp(-.08*hh);b.vx*=d;b.vy*=d;b.w*=Math.exp(-.5*hh);
    var cx=Math.cos(b.a)*b.hl,cy=Math.sin(b.a)*b.hl;b.e=b.hl>.5?[b.x+cx,b.y+cy,b.x-cx,b.y-cy]:[b.x,b.y];b.nc=0;
  }
  // ключ контакта: тело, с чем (тело или стенка), какой конец; по нему тёплый старт импульсов
  function mk(A,Bb,nx,ny,px,py,pen,vb,key){C.push({A:A,B:Bb,nx:nx,ny:ny,px:px,py:py,pen:pen,jn:0,jt:0,vb:vb||0,key:key})}
  for(i=0;i<B.length;i++){
    b=B[i];var r=b.r;
    for(k=0;k<b.e.length;k+=2){
      var px=b.e[k],py=b.e[k+1],pen;
      var kk=b.id*1e5+k;
      pen=py+r-fl;if(pen>-MG)mk(b,null,0,-1,px,py+r,pen,fv,kk);
      pen=4-(px-r);if(pen>-MG)mk(b,null,1,0,px-r,py,pen,0,kk+10);
      pen=(px+r)-(SW-4);if(pen>-MG)mk(b,null,-1,0,px+r,py,pen,0,kk+20);
      // нижние углы экрана скруглены: дуга радиуса CR, едет вместе с полом
      var ccy=fl+12-CR;
      for(var sd=-1;sd<=1;sd+=2){
        var ccx=sd<0?CR:SW-CR;
        if((sd<0?px<ccx:px>ccx)&&py>ccy){
          var ex=px-ccx,ey=py-ccy,dl=Math.hypot(ex,ey)||1;pen=dl+r-(CR-4);
          if(pen>-MG)mk(b,null,-ex/dl,-ey/dl,px+ex/dl*r,py+ey/dl*r,pen,fv*(ey/dl),kk+40+sd*5);
        }
      }
    }
  }
  function vsSeg(A,Bb){
    var sx=Bb.e[0],sy=Bb.e[1],dx=(Bb.e[2]!=null?Bb.e[2]:sx)-sx,dy=(Bb.e[3]!=null?Bb.e[3]:sy)-sy,dd=dx*dx+dy*dy,rr=A.r+Bb.r;
    for(var k=0;k<A.e.length;k+=2){
      var px=A.e[k],py=A.e[k+1],tt=dd>1e-6?c01(((px-sx)*dx+(py-sy)*dy)/dd):0,qx=sx+dx*tt,qy=sy+dy*tt,ex=px-qx,ey=py-qy,dist=Math.sqrt(ex*ex+ey*ey);
      if(dist<rr+MG){
        var nx,ny,pen=rr-dist;
        if(dist>1e-6){nx=ex/dist;ny=ey/dist}else{nx=0;ny=-1}
        // конец ушёл за ось другого слова: толкаем на сторону своего центра, а не насквозь
        if(dd>1e-6&&tt>0&&tt<1){
          var bl=Math.sqrt(dd),qx2=-dy/bl,qy2=dx/bl,se=(px-sx)*qx2+(py-sy)*qy2,sc=(A.x-sx)*qx2+(A.y-sy)*qy2;
          if(se*sc<0){var sg=sc>=0?1:-1;nx=qx2*sg;ny=qy2*sg;pen=rr+Math.abs(se)}
        }
        mk(A,Bb,nx,ny,px-nx*A.r,py-ny*A.r,pen,0,A.id*1e5+(Bb.id+1)*100+k);
      }
    }
  }
  // отрезки уже перекрестились: концы далеко, поэтому выталкиваем по более короткой из двух нормалей
  function side(P,ax,ay,dx,dy,dl){return((P[0]-ax)*dy-(P[1]-ay)*dx)/dl}
  function cross(A,Bb){
    var a=A.e,b=Bb.e,adx=a[2]-a[0],ady=a[3]-a[1],bdx=b[2]-b[0],bdy=b[3]-b[1],al=Math.hypot(adx,ady),bl=Math.hypot(bdx,bdy);
    var s1=side([a[0],a[1]],b[0],b[1],bdx,bdy,bl),s2=side([a[2],a[3]],b[0],b[1],bdx,bdy,bl),s3=side([b[0],b[1]],a[0],a[1],adx,ady,al),s4=side([b[2],b[3]],a[0],a[1],adx,ady,al);
    if(s1*s2>=0||s3*s4>=0)return false;
    var u=s1/(s1-s2),ix=a[0]+adx*u,iy=a[1]+ady*u;
    // ось B: A уходит на сторону своего центра
    var sc=side([A.x,A.y],b[0],b[1],bdx,bdy,bl),sg=sc>=0?1:-1,dB=Math.max(-s1*sg,-s2*sg,0),pB=dB+A.r+Bb.r;
    var nBx=-bdy/bl*sg,nBy=bdx/bl*sg;
    // ось A: B уходит на сторону своего центра, нормаль от B к A против неё
    var sc2=side([Bb.x,Bb.y],a[0],a[1],adx,ady,al),sg2=sc2>=0?1:-1,dA=Math.max(-s3*sg2,-s4*sg2,0),pA=dA+A.r+Bb.r;
    var nAx=ady/al*sg2,nAy=-adx/al*sg2;
    if(pB<=pA)mk(A,Bb,nBx,nBy,ix,iy,pB,0,A.id*1e5+(Bb.id+1)*100+9);
    else mk(A,Bb,nAx,nAy,ix,iy,pA,0,A.id*1e5+(Bb.id+1)*100+8);
    return true;
  }
  for(i=0;i<B.length;i++){
    var A=B[i];if(this.t-A.t0<GHOST)continue;
    for(j=i+1;j<B.length;j++){
      var Bb=B[j];if(this.t-Bb.t0<GHOST)continue;
      var ext=A.hl+A.r+Bb.hl+Bb.r+4;
      if(Math.abs(A.x-Bb.x)>ext||Math.abs(A.y-Bb.y)>ext)continue;
      // пара начинает сталкиваться, только когда хоть раз разошлась после вылета
      var pk=Math.min(A.id,Bb.id)*1e6+Math.max(A.id,Bb.id);
      if(!this.sep.has(pk)){
        if(this.t-A.t0<.7&&this.t-Bb.t0<.7&&capGap(A,Bb)<0)continue;
        this.sep.add(pk);
      }
      if(A.hl>.5&&Bb.hl>.5&&cross(A,Bb))continue;
      vsSeg(A,Bb);vsSeg(Bb,A);
    }
  }
  var MU=.55,E=.22,VTH=60,BETA=.2,SLOP=.05;
  C.forEach(function(c){
    var A=c.A,Bb=c.B,tx=-c.ny,ty=c.nx;
    c.rax=c.px-A.x;c.ray=c.py-A.y;
    var rn=c.rax*c.ny-c.ray*c.nx,rt=c.rax*ty-c.ray*tx;
    var kn=A.im+rn*rn*A.ii,kt=A.im+rt*rt*A.ii;
    var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax-(Bb?0:c.vb*(c.ny<0?1:0));
    if(Bb){c.rbx=c.px-Bb.x;c.rby=c.py-Bb.y;var rbn=c.rbx*c.ny-c.rby*c.nx,rbt=c.rbx*ty-c.rby*tx;kn+=Bb.im+rbn*rbn*Bb.ii;kt+=Bb.im+rbt*rbt*Bb.ii;
      vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
    c.kn=kn;c.kt=kt;
    var vn=vx*c.nx+vy*c.ny;
    c.bias=c.pen>0?Math.min(BETA*Math.max(c.pen-SLOP,0)/hh,Bb?320:600):c.pen/hh;
    if(vn<-VTH&&c.pen-vn*hh>0)c.bias=Math.max(c.bias,-E*vn);
    if(c.pen>-.05){A.nc++;if(Bb)Bb.nc++}
    if(vn<-75&&c.pen-vn*hh>0&&self.t-A.ht>.06){A.ht=self.t;self.hits.push([self.t,A.id,-vn,c.px,A.fs])}
  });
  var warm=this.warm,nw=new Map();
  C.forEach(function(c){
    var p=warm.get(c.key);if(!p)return;
    c.jn=p[0]*.85;c.jt=clamp(p[1]*.85,-MU*c.jn,MU*c.jn);
    var A=c.A,Bb=c.B,tx=-c.ny,ty=c.nx,Px=c.nx*c.jn+tx*c.jt,Py=c.ny*c.jn+ty*c.jt;
    A.vx+=Px*A.im;A.vy+=Py*A.im;A.w+=(c.rax*Py-c.ray*Px)*A.ii;
    if(Bb){Bb.vx-=Px*Bb.im;Bb.vy-=Py*Bb.im;Bb.w-=(c.rbx*Py-c.rby*Px)*Bb.ii}
  });
  for(var it=0;it<14;it++){
    for(k=0;k<C.length;k++){
      var c=C[k],A=c.A,Bb=c.B,tx=-c.ny,ty=c.nx;
      var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax-(Bb?0:c.vb*(c.ny<0?1:0));
      if(Bb){vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
      var vn=vx*c.nx+vy*c.ny,l=-(vn-c.bias)/c.kn,j0=c.jn;c.jn=Math.max(j0+l,0);l=c.jn-j0;
      var vt=vx*tx+vy*ty,lt=-vt/c.kt,t0=c.jt,mx=MU*c.jn;c.jt=clamp(t0+lt,-mx,mx);lt=c.jt-t0;
      var Px=c.nx*l+tx*lt,Py=c.ny*l+ty*lt;
      A.vx+=Px*A.im;A.vy+=Py*A.im;A.w+=(c.rax*Py-c.ray*Px)*A.ii;
      if(Bb){Bb.vx-=Px*Bb.im;Bb.vy-=Py*Bb.im;Bb.w-=(c.rbx*Py-c.rby*Px)*Bb.ii}
    }
  }
  C.forEach(function(c){if(c.jn>0)nw.set(c.key,[c.jn,c.jt])});this.warm=nw;
  for(i=0;i<B.length;i++){
    b=B[i];
    // трение покоя, чтобы куча не ползла
    if(b.nc>0&&Math.abs(b.vx)+Math.abs(b.vy-fv)<9&&Math.abs(b.w)<.9){var q=Math.exp(-8*hh);b.vx*=q;b.vy=fv+(b.vy-fv)*q;b.w*=q}
    b.x+=b.vx*hh;b.y+=b.vy*hh;b.a+=b.w*hh;
  }
  this.t+=hh;
};
function capGap(A,B){
  var a=A.e,b=B.e,ax2=a.length>2?a[2]:a[0],ay2=a.length>2?a[3]:a[1],bx2=b.length>2?b[2]:b[0],by2=b.length>2?b[3]:b[1];
  return(segX(a[0],a[1],ax2,ay2,b[0],b[1],bx2,by2)?0:segDist(a[0],a[1],ax2,ay2,b[0],b[1],bx2,by2))-A.r-B.r;
}
// стёртое слово становится телом: крупнее, чем в поле, с небольшим разбросом размера
var BID=0;
function makeBody(sp,x0,y0,t,R){
  var k=1.62+R()*.4,fs=FS*k,W=mw(sp.s)*k,r=.4*fs,hl=Math.max(0,W/2+1.5-r);
  var sd=BID%2?1:-1,vy=-(450+R()*200)-(sd>0?60:0),tx=201+sd*(24+150*Math.sqrt(R())),dy=Math.max(40,792-y0),tf=(-vy+Math.sqrt(vy*vy+2*G*dy))/G;
  return{id:BID++,s:sp.s,fs:fs,r:r,hl:hl,x:x0,y:y0,a:(R()-.5)*.12,vx:(tx-x0)/tf,vy:vy,w:(R()-.5)*6.5,t0:t};
}
function fieldTextY(ft,ln){return ft+10+ln*LH+LH/2}
// клавиатура дёргается вниз: каждое слово получает свой толчок и рассыпается, а не едет блоком
function kick(sim,R){sim.B.forEach(function(b){b.vy-=60+R()*170;b.vx+=(R()-.5)*90;b.w+=(R()-.5)*4.5});sim.sep.clear()}

/* ─────────── предрасчёт автопоказа: высота поля и куча, 240 кадров в секунду ─────────── */
var TR=240,FHA=null,HITS=[],OVL=[];
function segDist(ax,ay,bx,by,cx,cy,dx,dy){function pd(px,py,sx,sy,ex,ey){var vx=ex-sx,vy=ey-sy,l=vx*vx+vy*vy,t=l>1e-9?c01(((px-sx)*vx+(py-sy)*vy)/l):0;return Math.hypot(px-sx-vx*t,py-sy-vy*t)}return Math.min(pd(ax,ay,cx,cy,dx,dy),pd(bx,by,cx,cy,dx,dy),pd(cx,cy,ax,ay,bx,by),pd(dx,dy,ax,ay,bx,by))}
function segX(ax,ay,bx,by,cx,cy,dx,dy){function o(px,py,qx,qy,rx,ry){return(qx-px)*(ry-py)-(qy-py)*(rx-px)}return o(ax,ay,bx,by,cx,cy)*o(ax,ay,bx,by,dx,dy)<0&&o(cx,cy,dx,dy,ax,ay)*o(cx,cy,dx,dy,bx,by)<0}
function capDist(A,B){if(segX(A.x+Math.cos(A.a)*A.hl,A.y+Math.sin(A.a)*A.hl,A.x-Math.cos(A.a)*A.hl,A.y-Math.sin(A.a)*A.hl,B.x+Math.cos(B.a)*B.hl,B.y+Math.sin(B.a)*B.hl,B.x-Math.cos(B.a)*B.hl,B.y-Math.sin(B.a)*B.hl))return 0;var ac=Math.cos(A.a)*A.hl,as=Math.sin(A.a)*A.hl,bc=Math.cos(B.a)*B.hl,bs=Math.sin(B.a)*B.hl;return segDist(A.x+ac,A.y+as,A.x-ac,A.y-as,B.x+bc,B.y+bs,B.x-bc,B.y-bs)}
function precompute(){
  var R=AUTO,n,NF=Math.ceil(CYCLE*TR)+2,sim=new Sim(),rnd=rng(31),oi=0,H=FH0,SUB=4,hh=1/(TR*SUB),kicked=false;
  FHA=new Float32Array(NF);BID=0;
  for(n=0;n<NF;n++){
    var t=n/TR;
    while(oi<R.ops.length&&R.ops[oi].t<=t){
      var o=R.ops[oi++];
      if(o.sp){
        var ft=fieldBottom(R,t)-H,b=makeBody(o.sp,FTX+o.sp.x,fieldTextY(ft,o.sp.ln),t,rnd);
        b.tr=[];b.n0=n;sim.add(b);R.bodies.push(b);
      }
    }
    var tg=FH0+LH*(layout(textAt(R,t)).n-1);H+=(tg-H)*(1-Math.exp(-30/TR));FHA[n]=H;
    sim.t=t;
    if(R.tDis!=null&&!kicked&&t>=R.tDis-.03){kicked=true;kick(sim,rnd)}
    for(var s=0;s<SUB;s++){var ts=t+s*hh;sim.floor=floorAt(R,ts);sim.fv=(floorAt(R,ts+.002)-floorAt(R,ts-.002))/.004;sim.step(hh)}
    sim.B.forEach(function(b){b.tr.push(b.x,b.y,b.a)});
    if(n%24===0){var mx=0;for(var i=0;i<sim.B.length;i++)for(var j=i+1;j<sim.B.length;j++){var A=sim.B[i],Bq=sim.B[j];if(t-A.t0<.3||t-Bq.t0<.3)continue;var d=capDist(A,Bq);mx=Math.max(mx,A.r+Bq.r-d)}OVL.push([+t.toFixed(2),+mx.toFixed(1)])}
    // клавиатура уехала: всё, что на ней было, ушло вниз за экран
    if(R.tDis!=null&&t>R.tDis+.9&&sim.B.length){sim.B.forEach(function(b){b.t1=t});sim.B=[]}
  }
  sim.B.forEach(function(b){b.t1=CYCLE+1});
  R.bodies.forEach(function(b){b.tr=new Float32Array(b.tr);b.t0=b.n0/TR});
  HITS=sim.hits;
  window.__ovl=OVL;
  R.fh=function(t){var f=clamp(t*TR,0,NF-1.001),i=Math.floor(f);return mix(FHA[i],FHA[i+1],f-i)};
}
var _p={x:0,y:0,a:0};
function bodyPose(R,b,t){
  if(R.live){_p.x=b.x;_p.y=b.y;_p.a=b.a;return true}
  if(t<b.t0||t>=b.t1)return false;
  var n=b.tr.length/3-1,f=clamp((t-b.t0)*TR,0,n),i=Math.min(n-1,Math.floor(f)),q=f-i;
  if(n<1){_p.x=b.tr[0];_p.y=b.tr[1];_p.a=b.tr[2];return true}
  _p.x=mix(b.tr[i*3],b.tr[i*3+3],q);_p.y=mix(b.tr[i*3+1],b.tr[i*3+4],q);_p.a=mix(b.tr[i*3+2],b.tr[i*3+5],q);
  return true;
}

/* ─────────── отрисовка ─────────── */
var LW={};
function measure(){
  setFont(13,600,0);LW.rb=ctx.measureText('Read ').width;setFont(13,400,0);LW.r=LW.rb+ctx.measureText(AT).width;LW.d=ctx.measureText('Delivered').width;
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
function msgW(s){setFont(21);return ctx.measureText(s).width+30}
function yearLabel(y){return y==null?'Today':'Oct 10, '+y}
function drawDate(top,head,op){
  if(op<=.004)return;
  ctx.save();ctx.globalAlpha=op;ctx.textBaseline='middle';ctx.textAlign='left';
  var rest=head==='Today'?' '+AT:' at '+AT;
  setFont(13,600,0);var w1=ctx.measureText(head).width;setFont(13,400,0);var w2=ctx.measureText(rest).width,x=SW/2-(w1+w2)/2,y=top+8;
  ctx.fillStyle=COL.sub;setFont(13,600,0);ctx.fillText(head,x,y);setFont(13,400,0);ctx.fillText(rest,x+w1,y);
  ctx.restore();
}
function drawReceipt(top,rd,op){
  if(op<=.004)return;
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';var y=top+8;
  var q=Math.min(rd,1-rd)*2;ctx.globalAlpha=op*(1-q);
  if(rd>.5){setFont(13,600,0);ctx.fillStyle=COL.sub;ctx.fillText('Read',MEX-LW.r,y);setFont(13,400,0);ctx.fillText(' '+AT,MEX-LW.r+LW.rb-ctx.measureText(' ').width,y)}
  else{setFont(13,400,0);ctx.fillStyle=COL.sub;ctx.fillText('Delivered',MEX-LW.d,y)}
  ctx.restore();
}

/* переписка снизу вверх: сегодняшний обмен, над ним прошлые годы.
   На шве петли подписи сдвигаются на год, сегодняшний обмен становится прошлогодним */
var FLY=null;
function drawChat(R,t,bottom,fb,fh){
  FLY=null;
  var y=bottom,LBH=44;
  var sent=R.tSend!=null&&t>=R.tSend;
  // старая подпись гаснет, новая проявляется, не одновременно
  var sw0=R.tUp!=null?sm(seg(t,R.tUp+.02,R.tUp+.16)):0,sw1=R.tUp!=null?sm(seg(t,R.tUp+.18,R.tUp+.34)):0;
  if(sent){
    var sTy=R.tTy!=null?spring(t-R.tTy,.55,3.3):0,qe=eout(seg(t,R.tSend,R.tSend+.36)),lb=eout(seg(t,R.tSend,R.tSend+.3));
    var sRc=eout(seg(t,R.tSend+.2,R.tSend+.4)),rd=R.tRead!=null?sm(seg(t,R.tRead-.05,R.tRead+.07)):0;
    var tyTop=y-BH;y-=(BH+GX)*sTy;
    y-=20*sRc;var rcTop=y;
    y-=BH*qe;var qTop=y;
    y-=LBH*lb;var lTop=y;
    drawDate(lTop+20,'Today',lb*(1-sw0));drawDate(lTop+20,yearLabel(YEARS[YEARS.length-1]),lb*sw1);
    // сообщение вылетает из поля ввода
    var w=msgW(SENT),fy=fb-fh+3,e2=qe,qx=mix(FTX-15,MEX-w,e2),qy=mix(fy,qTop,e2),a=sm(e2*2.4);
    var bg='rgba('+COL.blueC.join(',')+','+a.toFixed(3)+')',ink='rgb('+COL.inkC.map(function(c){return Math.round(mix(c,255,a))}).join(',')+')';
    FLY=qe<1?[qx,qy,a,bg,ink]:null;if(!FLY)textMsg(qx,qy,SENT,true,a,bg,ink);
    drawReceipt(rcTop,rd,sRc);
    if(sTy>0){ctx.save();ctx.translate(RX,tyTop+BH);ctx.scale(sTy,sTy);ctx.translate(-RX,-(tyTop+BH));textMsg(RX,tyTop,REPLY,false,1);ctx.restore()}
  }
  var col=sent?eout(seg(t,R.tSend,R.tSend+.28)):0;
  for(var k=YEARS.length-1;k>=0;k--){
    var tTop=y-BH;y=tTop-GX;
    var rh=k===YEARS.length-1?20*(1-col):0;y-=rh;var rcT=y;
    var mT=y-BH;y=mT-LBH;
    if(tTop+BH<100)break;
    textMsg(MEX-msgW(SENT),mT,SENT,true,1);
    if(rh>.5)drawReceipt(rcT,1,1-col);
    textMsg(RX,tTop,REPLY,false,1);
    drawDate(y+20,yearLabel(YEARS[k]),1-sw0);if(k>0)drawDate(y+20,yearLabel(YEARS[k-1]),sw1);
  }
}

function drawComposer(R,t,fb,fh,s){
  var ft=fb-fh;
  ctx.fillStyle=COL.card;ctx.fillRect(0,ft-8,SW,SH-ft+8);
  // плюс
  ctx.fillStyle=COL.plus;ctx.beginPath();ctx.arc(35,fb-23,21,0,7);ctx.fill();
  ctx.strokeStyle=COL.sub;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(35,fb-28.5);ctx.lineTo(35,fb-17.5);ctx.moveTo(29.5,fb-23);ctx.lineTo(40.5,fb-23);ctx.stroke();
  // поле
  ctx.fillStyle=COL.card;rr(FX,ft,FW,fh,23);ctx.fill();
  ctx.strokeStyle=COL.line;ctx.lineWidth=.75;rr(FX+.375,ft+.375,FW-.75,fh-.75,22.6);ctx.stroke();
  var L=layout(s);
  setFont(FS);ctx.textBaseline='middle';ctx.textAlign='left';
  if(!s.length){ctx.fillStyle=COL.sub2;ctx.fillText('Message',FTX,fieldTextY(ft,0)+1);drawMic(FX+FW-23,fb-23)}
  else{
    ctx.fillStyle=COL.ink;
    L.words.forEach(function(w){ctx.fillText(w.s,FTX+w.x,fieldTextY(ft,w.ln)+1)});
  }
  // каретка: горит, пока печатают и стирают, иначе мигает
  var k=opAt(R,t),last=k>=0?R.ops[k].t:-9,busy=t-last<.45||(R.holdNow&&R.holdNow(t));
  var on=R.tSend!=null&&t>=R.tSend-.02&&(R.tUp==null||t<R.tUp+.3)?0:(busy||((t-last)%1.1)<.55?1:0);
  if(on){ctx.fillStyle=COL.blue;rr(FTX+L.cx+1,fieldTextY(ft,L.cl)-12.5,2,25,1);ctx.fill()}
  // отправить
  if(s.length||(R.tSend!=null&&t>=R.tSend&&t<R.tSend+.14)){
    var pr=R.tSend!=null?pulse(t,R.tSend-.06,R.tSend+.01):0,op=s.length?1:1-seg(t,R.tSend,R.tSend+.14),sc=1-.14*pr;
    ctx.save();ctx.globalAlpha=op;ctx.translate(FX+FW-22,fb-22);ctx.scale(sc,sc);
    ctx.fillStyle=COL.blue;ctx.beginPath();ctx.arc(0,0,17,0,7);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(0,5.6);ctx.lineTo(0,-5.2);ctx.moveTo(-4.8,-.6);ctx.lineTo(0,-5.4);ctx.lineTo(4.8,-.6);ctx.stroke();
    ctx.restore();
  }
}
function drawMic(x,y){
  ctx.save();ctx.strokeStyle=COL.sub;ctx.lineWidth=1.7;ctx.lineCap='round';
  rr(x-3,y-8,6,10,3);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y-1,5.5,.15,Math.PI-.15);ctx.moveTo(x,y+4.5);ctx.lineTo(x,y+7);ctx.stroke();ctx.restore();
}

/* клавиатура */
function keyRect(k,ky,fill){
  ctx.fillStyle=COL.keysh;rr(k.x,ky+k.y+1,k.w,k.h,5.5);ctx.fill();
  ctx.fillStyle=fill;rr(k.x,ky+k.y,k.w,k.h,5.5);ctx.fill();
}
function drawKeyboard(R,t,ky,press){
  if(ky>=SH)return;
  ctx.fillStyle=COL.kb;ctx.fillRect(0,ky,SW,SH-ky+40);
  setFont(23,400,0);ctx.textBaseline='middle';ctx.textAlign='center';
  for(var c in KEYS){var k=KEYS[c];keyRect(k,ky,COL.key);ctx.fillStyle=COL.keyink;ctx.fillText(c,k.x+k.w/2,ky+k.y+k.h/2-1)}
  keyRect(SPK.shift,ky,COL.key2);keyRect(SPK.del,ky,press.del?COL.key:COL.key2);
  keyRect(SPK.n123,ky,COL.key2);keyRect(SPK.ret,ky,COL.key2);keyRect(SPK.space,ky,press.space?COL.key2:COL.key);
  setFont(16,400,0);ctx.fillStyle=COL.keyink;
  [['n123','123'],['ret','return'],['space','space']].forEach(function(q){var k=SPK[q[0]];ctx.fillText(q[1],k.x+k.w/2,ky+k.y+k.h/2)});
  ctx.strokeStyle=COL.keyink;ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.lineCap='round';
  // shift: контур стрелки
  var s=SPK.shift,cx=s.x+s.w/2,cy=ky+s.y+s.h/2;
  ctx.beginPath();ctx.moveTo(cx,cy-9);ctx.lineTo(cx+9,cy+.5);ctx.lineTo(cx+4.5,cy+.5);ctx.lineTo(cx+4.5,cy+8);ctx.lineTo(cx-4.5,cy+8);ctx.lineTo(cx-4.5,cy+.5);ctx.lineTo(cx-9,cy+.5);ctx.closePath();ctx.stroke();
  // delete: пятиугольник с крестиком
  var d=SPK.del;cx=d.x+d.w/2+1;cy=ky+d.y+d.h/2;
  ctx.beginPath();ctx.moveTo(cx-12,cy);ctx.lineTo(cx-5.5,cy-8);ctx.lineTo(cx+11,cy-8);ctx.lineTo(cx+11,cy+8);ctx.lineTo(cx-5.5,cy+8);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-1,cy-3.6);ctx.lineTo(cx+6.2,cy+3.6);ctx.moveTo(cx+6.2,cy-3.6);ctx.lineTo(cx-1,cy+3.6);ctx.stroke();
  // смайлик и микрофон под клавишами
  var by=ky+KT+3*KP+KHH+36;
  ctx.strokeStyle=COL.sub;ctx.fillStyle=COL.sub;ctx.lineWidth=1.7;
  ctx.beginPath();ctx.arc(34,by,11,0,7);ctx.stroke();
  ctx.beginPath();ctx.arc(30,by-3,1.4,0,7);ctx.arc(38,by-3,1.4,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(34,by+1,5.5,.25,Math.PI-.25);ctx.stroke();
  var mx=SW-34;rr(mx-4,by-11,8,13,4);ctx.stroke();
  ctx.beginPath();ctx.arc(mx,by-2,7,.15,Math.PI-.15);ctx.moveTo(mx,by+5);ctx.lineTo(mx,by+9);ctx.stroke();
}
// всплывающая клавиша над нажатой буквой
function drawPopup(ch,ky,op){
  var k=KEYS[ch];if(!k||op<=0)return;
  var x=k.x,y=ky+k.y,w=k.w,h=k.h,ex=11,th=56,ty=y-th+2;
  ctx.save();ctx.globalAlpha=op;
  ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=7;ctx.shadowOffsetY=1;
  ctx.fillStyle=COL.key;
  ctx.beginPath();
  ctx.moveTo(x-ex+10,ty);ctx.lineTo(x+w+ex-10,ty);ctx.quadraticCurveTo(x+w+ex,ty,x+w+ex,ty+10);
  ctx.lineTo(x+w+ex,ty+th-24);ctx.bezierCurveTo(x+w+ex,ty+th-10,x+w,ty+th-8,x+w,y+12);
  ctx.lineTo(x+w,y+h-5.5);ctx.quadraticCurveTo(x+w,y+h,x+w-5.5,y+h);ctx.lineTo(x+5.5,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-5.5);
  ctx.lineTo(x,y+12);ctx.bezierCurveTo(x,ty+th-8,x-ex,ty+th-10,x-ex,ty+th-24);
  ctx.lineTo(x-ex,ty+10);ctx.quadraticCurveTo(x-ex,ty,x-ex+10,ty);ctx.closePath();ctx.fill();
  ctx.shadowColor='transparent';
  setFont(33,400,0);ctx.fillStyle=COL.keyink;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(ch,x+w/2,ty+22);
  ctx.restore();
}
function drawBodies(R,t,ky){
  ctx.textBaseline='middle';ctx.textAlign='center';ctx.lineJoin='round';
  for(var i=0;i<R.bodies.length;i++){
    var b=R.bodies[i];if(!bodyPose(R,b,t))continue;
    if(_p.y-b.r-b.hl>SH+10)continue;
    var age=t-b.t0,vs=mix(FS/b.fs,1,eout(age/.16));
    ctx.save();ctx.translate(_p.x,_p.y);ctx.rotate(_p.a);ctx.scale(vs,vs);
    setFont(b.fs,500);
    ctx.lineWidth=5;ctx.strokeStyle=_p.y<ky-6?COL.card:COL.kb;ctx.strokeText(b.s,0,b.fs*.03);
    ctx.fillStyle=COL.ink;ctx.fillText(b.s,0,b.fs*.03);
    ctx.restore();
  }
}

function render(R,t){
  ctx.setTransform(KDPR,0,0,KDPR,0,0);
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,SH);
  var off=kbOff(R,t),ky=KBY+off,fb=fieldBottom(R,t),fh=R.fh(t),s=textAt(R,t);
  drawChat(R,t,fb-fh-12,fb,fh);
  drawComposer(R,t,fb,fh,s);
  if(FLY)textMsg(FLY[0],FLY[1],SENT,true,FLY[2],FLY[3],FLY[4]);
  // что нажато: буква всплывает, пробел темнеет, delete светлеет, пока держат
  var press={del:R.holdNow?R.holdNow(t):holdAt(R,t),space:false},pop=null,k=opAt(R,t);
  if(k>=0){var o=R.ops[k];if(o.k==='key'&&t-o.t<.1){if(o.ch===' ')press.space=true;else if(KEYS[o.ch])pop=o.ch}}
  drawKeyboard(R,t,ky,press);
  drawBodies(R,t,ky);
  if(pop)drawPopup(pop,ky,1);
}
function holdAt(R,t){for(var i=0;i<R.holds.length;i++)if(t>=R.holds[i][0]&&t<=R.holds[i][1])return true;return false}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function panX(x){return clamp((x/SW-.5)*.7,-.6,.6)}
function buildEvents(){
  var R=AUTO;EVENTS=[];
  var lastK=-9;
  R.ops.forEach(function(o,i){
    // быстрый набор: щелчки тише, иначе сливаются в треск
    if(o.k==='key'){EVENTS.push([o.t,o.ch===' '?'space':'key',i,clamp((o.t-lastK)/.07,.3,1)]);lastK=o.t}
    else if(o.k==='del'){EVENTS.push([o.t,'del',i]);if(o.sp)EVENTS.push([o.t+.004,'pop',o.sp.s.length,panX(FTX+o.sp.x)])}
  });
  HITS.forEach(function(h){EVENTS.push([h[0],'hit',h[2],h[4],panX(h[3])])});
  EVENTS.push([R.tSend-.04,'press']);EVENTS.push([R.tSend+.01,'send']);
  EVENTS.push([R.tDis-.06,'drop']);
  EVENTS.push([R.tTy,'recv']);
  EVENTS.push([R.tUp,'kbup']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Держишь экран или пробел: delete. Стёр всё, отпустил: печатается следующий черновик.
   После трёх черновиков печатается hbd, тап отправляет. Куча живая. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveRound(n){
  var R=Round();R.live=true;R.sim=new Sim();R.sim.t=n;R.bodies=R.sim.B;R.fhv=FH0;R.fh=function(){return R.fhv};
  R.holdNow=function(){return LV&&LV.del};
  return R;
}
function goLive(){
  if(mode==='live')return;
  var n=nowS();LV={R:liveRound(n),hold:false,del:false,di:0,next:0,draft:0,rnd:rng(n*1000|0),wait:null};
  mode='live';Sound.stopAll();
  // поле подхватывает тот черновик, что был на экране в автопоказе
  var u=uNow(),s=textAt(AUTO,u),R=LV.R;
  if(AUTO.tSend!=null&&u>=AUTO.tSend-.05){s='';LV.draft=0}
  else{var k=opAt(AUTO,u),d=0;for(var i=0;i<=k;i++)if(AUTO.ops[i].k==='del'&&AUTO.ops[i].s==='')d++;LV.draft=Math.min(d,3)}
  R.ops.push({t:n-1,s:s,k:'set'});
  if(!s.length)queueDraft(n+.25);
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0}
function curText(){return textAt(LV.R,nowS())}
function queueDraft(t0){
  var R=LV.R,str=LV.draft<3?DRAFTS[LV.draft]:SENT,dt=LV.draft<3?.0165:.15;
  var t=t0;for(var i=0;i<str.length;i++){var s=str.slice(0,i+1);R.ops.push({t:t,s:s,k:'key',ch:str[i]});Sound.play([0,str[i]===' '?'space':'key',i,clamp(dt/.07,.3,1)],t-nowS());t+=LV.draft<3?dt*(.7+.6*LV.rnd())+(str[i]===' '?dt*.5:0):dt}
  LV.typedAt=t;LV.draft++;
}
function dropFuture(n){var R=LV.R;while(R.ops.length&&R.ops[R.ops.length-1].t>n)R.ops.pop();Sound.stopAll()}
function pressDown(){
  Sound.start();goLive();
  var n=nowS(),R=LV.R;
  if(R.tSend!=null)return;
  var s=curText();
  if(s===SENT&&n>=LV.typedAt){sendLive(n);return}
  dropFuture(n);s=curText();
  if(!s.length)return;
  LV.hold=true;LV.del=true;LV.di=0;LV.next=n;
}
function pressUp(){
  if(!LV)return;LV.hold=false;LV.del=false;
  var n=nowS();if(LV.R.tSend==null&&!curText().length)queueDraft(n+.3);
}
function sendLive(n){
  var R=LV.R;R.tSend=n;R.ops.push({t:n,s:'',k:'send'});R.tDis=n+.16;R.tRead=R.tDis+.6;R.tTy=R.tRead+.18;R.tUp=R.tTy+.9;
  Sound.play([0,'press']);Sound.play([0,'send'],.01);Sound.play([0,'drop'],R.tDis-.06-n);Sound.play([0,'recv'],R.tTy-n);Sound.play([0,'kbup'],R.tUp-n);
}
function liveStep(n,dt){
  var R=LV.R,sim=R.sim;
  if(LV.del){
    var s=curText();
    while(LV.del&&n>=LV.next&&s.length){
      var word=LV.di>=4,u=delUnit(s,word),fh=R.fhv,ft=fieldBottom(R,n)-fh;
      R.ops.push({t:n,s:u.s,k:'del',sp:u.sp});Sound.play([0,'del',LV.di]);
      if(u.sp){var b=makeBody(u.sp,FTX+u.sp.x,fieldTextY(ft,u.sp.ln),sim.t,LV.rnd);sim.add(b);Sound.play([0,'pop',u.sp.s.length,panX(FTX+u.sp.x)],.004)}
      s=u.s;LV.next+=word?mix(.1,.06,Math.min(1,(LV.di-4)/10)):[.17,.12,.1,.09][LV.di];LV.di++;
    }
    if(!s.length)LV.del=false;
  }
  var tg=FH0+LH*(layout(curText()).n-1);R.fhv+=(tg-R.fhv)*(1-Math.exp(-30*dt));
  // физика с постоянным шагом
  LV.acc=(LV.acc||0)+dt;var hh=1/960,nh=sim.hits.length;
  while(LV.acc>=hh){var ts=sim.t;sim.floor=floorAt(R,ts);sim.fv=(floorAt(R,ts+.002)-floorAt(R,ts-.002))/.004;sim.step(hh);LV.acc-=hh}
  for(var i=nh;i<sim.hits.length;i++){var h=sim.hits[i];Sound.play([0,'hit',h[2],h[4],panX(h[3])])}
  if(sim.hits.length>200)sim.hits.length=0;
  for(i=sim.B.length-1;i>=0;i--)if(sim.B[i].y>SH+400)sim.B.splice(i,1);
  // обмен закончился: подписи сдвинулись на год, всё по новой
  if(R.tDis!=null&&!R.kicked&&n>=R.tDis-.03){R.kicked=true;kick(sim,LV.rnd)}
  if(R.tUp!=null&&n>=R.tUp+.4){var nr=liveRound(n);nr.ops.push({t:n-1,s:'',k:'set'});LV.R=nr;LV.draft=0;queueDraft(n+.2)}
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
document.getElementById('hint').textContent=touchy?'Hold the screen to delete, tap to send':'Hold the screen or Space to delete, tap to send';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(AUTO,u);
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();liveStep(n,dt);LV.R.sim.t=n;render(LV.R,n);
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
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),sub2:g('--sub-2'),line:g('--line'),blue:g('--blue'),recv:g('--recv'),plus:g('--plus'),
       kb:g('--kb'),key:g('--key'),key2:g('--key2'),keysh:g('--keysh'),keyink:g('--keyink'),blueC:hexc(g('--blue')),inkC:hexc(g('--ink'))};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?(hh-40)/846:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  KDPR=S*Math.min(3,devicePixelRatio||1);
  var bw=Math.round(SW*KDPR),bh=Math.round(SH*KDPR);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  KDPR=bw/SW;
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(AUTO,uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();measure();buildScript();precompute();buildEvents();window.__TL=TL;
  addEventListener('resize',fit);
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(AUTO,((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
