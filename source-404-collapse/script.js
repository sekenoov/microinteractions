/* ─────────── Source ───────────
   Уверенный ответ ИИ, в конце ссылка на источник. Жмёшь на неё: 404, ссылка лопается,
   и ответ буквально разваливается. Строки падают досками на поле ввода (своя 2D-физика капсул),
   потом ИИ собирает из тех же досок тот же ответ: число подрастает, источник новый.
   На третий раз источник «trust me». Автопоказ рисуется из одного времени t: физика каждого обвала
   считается один раз заранее и проигрывается по t, поэтому петля замыкается без шва. */

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
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function txt(el,v){if(el.__t!==v){el.__t=v;el.textContent=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
function wrapA(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}

var TEXT='Yes, and the effect is bigger than most people think. Drinking two cups of coffee a day raises your IQ by about {N} points within a month, and the boost lasts for decades. Researchers call it the caffeine dividend.';
// каждый раз, когда источник не находится, ИИ не отступает, а поднимает ставку
var VER=[{n:'14',src:'stanford.edu'},{n:'19',src:'harvard.edu'},{n:'27',src:'trust me'}];
var LH=22,FADE=1.4,RATE=30,R=8.5;          // R: полутолщина доски для физики
var G=2600,SIMT=1.3,SDT=1/240;           // гравитация px/с², длина записи обвала, шаг записи
var FLY={D:.46,ST:.06};                  // сборка: длительность полёта доски и сдвиг между досками
var PHY={ST:.035,WR:4.5,VX:160,HW:3.4};    // обвал: сдвиг отпускания, разброс вращения и сноса, вращение нижней доски

/* ─────────── разметка ─────────── */
var chat=document.getElementById('chat'),mover=document.getElementById('mover'),zoom=document.getElementById('zoom');
var thread=document.getElementById('thread'),ans=document.getElementById('ans'),flow=document.getElementById('flow'),planksEl=document.getElementById('planks');
var field=document.getElementById('field'),chip=document.getElementById('chip'),ctx=document.getElementById('ctx'),cur=document.getElementById('cur');

var TOK=TEXT.split(' '),NW=TOK.length,NUMI=TOK.indexOf('{N}');
var WD=[],LINES=[],CPH,NUMW=0,DIGW=0;
var M={ax:0,ay:0,floor:480,cx:0,cy:0,W:360};
var CHW={};
function build(){
  TOK.forEach(function(t,i){
    var s=h('span',null,i===NUMI?VER[0].n:t);flow.appendChild(s);flow.appendChild(document.createTextNode(' '));
    WD.push({t:t,i:i,fs:s});
  });
  // место под ссылку: по самой широкой надписи, чтобы перенос строк не зависел от версии
  VER.concat([{src:'404'}]).forEach(function(v){txt(ctx,v.src);CHW[v.src]=Math.ceil(chip.scrollWidth)});
  CPH=h('span','cph');CPH.style.width=Math.max(CHW[VER[0].src],CHW[VER[1].src],CHW[VER[2].src])+'px';flow.appendChild(CPH);
}
function measure(){
  WD.forEach(function(w){w.x=w.fs.offsetLeft;w.y=w.fs.offsetTop;w.w=w.fs.offsetWidth;w.l=Math.round(w.y/LH)});
  NUMW=WD[NUMI].w;DIGW=NUMW/VER[0].n.length;
  var nl=WD[NW-1].l+1;
  planksEl.innerHTML='';LINES=[];
  // каждая строка ломается на два куска разной длины: целая строка почти во всю карточку не кувыркается
  var CUTF=[.58,.4,.64,.45,.55];
  for(var l=0;l<nl;l++){
    var ws=WD.filter(function(w){return w.l===l}),x0=ws[0].x,x1=ws[ws.length-1].x+ws[ws.length-1].w,parts=[ws];
    if(x1-x0>190&&ws.length>2){
      var tgt=x0+(x1-x0)*CUTF[l%CUTF.length],bj=1,bd=1e9;
      for(var j=1;j<ws.length;j++){var d=Math.abs(ws[j].x-tgt);if(d<bd){bd=d;bj=j}}
      parts=[ws.slice(0,bj),ws.slice(bj)];
    }
    parts.forEach(function(pw){LINES.push(mkPlank(pw,l))});
  }
  var tx=thread.offsetLeft,ty=thread.offsetTop;
  M.ax=tx+ans.offsetLeft;M.ay=ty+ans.offsetTop;
  LINES.forEach(function(L){L.rx=M.ax+L.x+L.w/2;L.ry=M.ay+L.y+LH/2});
  var comp=field.parentNode;M.floor=comp.offsetTop+field.offsetTop-.5;
  M.cx=M.ax+CPH.offsetLeft;M.cy=M.ay+Math.floor((CPH.offsetTop+6)/LH)*LH+(LH-20)/2;
  M.W=chat.clientWidth;
}
function mkPlank(ws,l){
  var x0=ws[0].x,x1=ws[ws.length-1].x+ws[ws.length-1].w;
  var el=h('div','pl'),L={line:l,ws:ws,x:x0,y:ws[0].y,w:x1-x0,el:el};
  ws.forEach(function(w,j){
    if(j)el.appendChild(document.createTextNode(' '));
    if(w.i===NUMI){
      var n=h('span','wd num');n.style.width=NUMW+'px';w.dg=[];
      for(var d=0;d<VER[0].n.length;d++){
        var col=h('span','num');col.style.width=DIGW+'px';var a=h('i'),b=h('i');col.appendChild(a);col.appendChild(b);n.appendChild(col);
        w.dg.push({col:col,a:a,b:b});
      }
      w.el=n;el.appendChild(n);L.num=true;
    }else{w.el=h('span','wd',w.t);el.appendChild(w.el)}
  });
  el.style.width=L.w+'px';
  planksEl.appendChild(el);
  return L;
}
var S=1;
function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight,H=chat.offsetHeight||500;
  S=REC||STILL?Math.min(w/360*.84,hh/H*.84):clamp(Math.min((w-32)/360,(hh-110)/H),.6,1.6);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

/* ─────────── физика досок ───────────
   Каждая строка: капсула (отрезок с радиусом R), масса по длине. Контакты концов с полом, стенками
   и с отрезками других досок, последовательные импульсы с трением, упреждающие контакты.
   Пока доска не отпущена, она стоит на месте и держит остальных как неподвижное тело. */
function Sim(o){this.B=[];this.fl=o.floor;this.x0=o.x0;this.x1=o.x1;this.hits=[];this.t=0}
Sim.prototype.add=function(o){
  var m=o.w/100,b={id:o.id,x:o.x,y:o.y,a:0,vx:0,vy:0,w:0,L:Math.max(2,o.w-2*R),rel:o.rel,iv:o.iv,dyn:false,ht:-1,nc:0};
  b.im0=1/m;b.iI0=12/(m*(o.w*o.w+4*R*R));b.im=0;b.iI=0;
  this.B.push(b);return b;
};
Sim.prototype.step=function(hh){
  var B=this.B,C=[],i,j,k,b,MG=1.6,t=this.t,self=this;
  for(i=0;i<B.length;i++){
    b=B[i];
    if(!b.dyn&&t>=b.rel){b.dyn=true;b.im=b.im0;b.iI=b.iI0;b.vx=b.iv[0];b.vy=b.iv[1];b.w=b.iv[2]}
    if(b.dyn){b.vy+=G*hh;var d=Math.exp(-.1*hh);b.vx*=d;b.vy*=d;b.w*=Math.exp(-.8*hh)}
    var cx=Math.cos(b.a)*b.L/2,cy=Math.sin(b.a)*b.L/2;b.e=[b.x+cx,b.y+cy,b.x-cx,b.y-cy];b.nc=0;
  }
  function mk(A,Bb,nx,ny,px,py,pen){C.push({A:A,B:Bb,nx:nx,ny:ny,px:px,py:py,pen:pen,jn:0,jt:0})}
  for(i=0;i<B.length;i++){
    b=B[i];if(!b.dyn)continue;
    for(k=0;k<4;k+=2){
      var px=b.e[k],py=b.e[k+1],pen;
      pen=py+R-this.fl;if(pen>-MG)mk(b,null,0,-1,px,this.fl,pen);
      pen=this.x0-(px-R);if(pen>-MG)mk(b,null,1,0,this.x0,py,pen);
      pen=(px+R)-this.x1;if(pen>-MG)mk(b,null,-1,0,this.x1,py,pen);
    }
  }
  // конец одной доски против отрезка другой
  function vsSeg(A,Bb){
    var sx=Bb.e[0],sy=Bb.e[1],dx=Bb.e[2]-sx,dy=Bb.e[3]-sy,dd=dx*dx+dy*dy;
    for(var k=0;k<4;k+=2){
      var px=A.e[k],py=A.e[k+1],t=c01(((px-sx)*dx+(py-sy)*dy)/dd),qx=sx+dx*t,qy=sy+dy*t,ex=px-qx,ey=py-qy,dist=Math.sqrt(ex*ex+ey*ey);
      if(dist<2*R+MG){
        var nx,ny;
        if(dist>1e-6){nx=ex/dist;ny=ey/dist}else{nx=-dy/Math.sqrt(dd);ny=dx/Math.sqrt(dd);if((A.x-Bb.x)*nx+(A.y-Bb.y)*ny<0){nx=-nx;ny=-ny}}
        mk(A,Bb,nx,ny,px-nx*R,py-ny*R,2*R-dist);
      }
    }
  }
  for(i=0;i<B.length;i++)for(j=i+1;j<B.length;j++){
    var A=B[i],Bb=B[j];
    if(!A.dyn&&!Bb.dyn)continue;
    if(Math.abs(A.x-Bb.x)>(A.L+Bb.L)/2+2*R+4||Math.abs(A.y-Bb.y)>(A.L+Bb.L)/2+2*R+4)continue;
    vsSeg(A,Bb);vsSeg(Bb,A);
  }
  var MU=.55,E=.22,VTH=60,BETA=.22,SLOP=.04;
  C.forEach(function(c){
    var A=c.A,Bb=c.B;
    c.rax=c.px-A.x;c.ray=c.py-A.y;
    var tx=-c.ny,ty=c.nx,rn=c.rax*c.ny-c.ray*c.nx,rt=c.rax*ty-c.ray*tx;
    var kn=A.im+rn*rn*A.iI,kt=A.im+rt*rt*A.iI;
    var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax;
    if(Bb){c.rbx=c.px-Bb.x;c.rby=c.py-Bb.y;var rbn=c.rbx*c.ny-c.rby*c.nx,rbt=c.rbx*ty-c.rby*tx;kn+=Bb.im+rbn*rbn*Bb.iI;kt+=Bb.im+rbt*rbt*Bb.iI;
      vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
    c.kn=kn;c.kt=kt;
    var vn=vx*c.nx+vy*c.ny;
    c.bias=c.pen>0?BETA*Math.max(c.pen-SLOP,0)/hh:c.pen/hh;
    if(vn<-VTH&&c.pen-vn*hh>0)c.bias=Math.max(c.bias,-E*vn);
    if(c.pen>-.05){A.nc++;if(Bb)Bb.nc++}
    var hb=A.dyn?A:Bb;
    if(vn<-90&&c.pen-vn*hh>0&&self.t-hb.ht>.06){hb.ht=self.t;self.hits.push([self.t,hb.id,-vn,c.px])}
  });
  for(var it=0;it<12;it++){
    for(k=0;k<C.length;k++){
      var c=C[k],A=c.A,Bb=c.B;if(c.kn<=0)continue;
      var vx=A.vx-A.w*c.ray,vy=A.vy+A.w*c.rax;
      if(Bb){vx-=Bb.vx-Bb.w*c.rby;vy-=Bb.vy+Bb.w*c.rbx}
      var vn=vx*c.nx+vy*c.ny,l=-(vn-c.bias)/c.kn,j0=c.jn;c.jn=Math.max(j0+l,0);l=c.jn-j0;
      var tx=-c.ny,ty=c.nx,vt=vx*tx+vy*ty,lt=-vt/c.kt,t0=c.jt,mx=MU*c.jn;c.jt=clamp(t0+lt,-mx,mx);lt=c.jt-t0;
      var Px=c.nx*l+tx*lt,Py=c.ny*l+ty*lt;
      A.vx+=Px*A.im;A.vy+=Py*A.im;A.w+=(c.rax*Py-c.ray*Px)*A.iI;
      if(Bb){Bb.vx-=Px*Bb.im;Bb.vy-=Py*Bb.im;Bb.w-=(c.rbx*Py-c.rby*Px)*Bb.iI}
    }
  }
  for(i=0;i<B.length;i++){
    b=B[i];if(!b.dyn)continue;
    // трение покоя, чтобы куча не ползла
    if(b.nc>0&&Math.abs(b.vx)+Math.abs(b.vy)<8&&Math.abs(b.w)<.9){var q=Math.exp(-8*hh);b.vx*=q;b.vy*=q;b.w*=q}
    b.x+=b.vx*hh;b.y+=b.vy*hh;b.a+=b.w*hh;
  }
  this.t+=hh;
};

/* обвал: ссылка была в конце нижней строки, поэтому нижняя доска первой проседает правым концом
   (поворот вокруг левого), остальные отпускаются снизу вверх с небольшим разбросом */
function collapse(seed){
  var Rn=rng(seed),N=LINES.length,sim=new Sim({floor:M.floor,x0:5,x1:M.W-5});
  LINES.forEach(function(L,k){
    var d=N-1-k,rel=d*PHY.ST+Rn()*.02,w0,vx=(Rn()-.5)*2*PHY.VX,vy=0;
    if(k===N-1){w0=PHY.HW*(.85+Rn()*.3);vy=w0*L.w/2*.9;vx=0;rel=0}
    else w0=(Rn()-.4)*2*PHY.WR;
    sim.add({id:k,x:L.rx,y:L.ry,w:L.w,rel:rel,iv:[vx,vy,w0]});
  });
  var hh=1/1200,per=Math.round(SDT/hh),nf=Math.ceil(SIMT/SDT)+1,fr=new Float32Array(nf*N*3);
  for(var f=0;f<nf;f++){
    for(var k=0;k<N;k++){var b=sim.B[k];fr[(f*N+k)*3]=b.x;fr[(f*N+k)*3+1]=b.y;fr[(f*N+k)*3+2]=b.a}
    for(var s=0;s<per;s++)sim.step(hh);
  }
  var end=[];for(var k=0;k<N;k++){var o=((nf-1)*N+k)*3;end.push({x:fr[o],y:fr[o+1],a:wrapA(fr[o+2])})}
  // сборка: сверху кучи вниз
  var order=end.map(function(e,k){return k}).sort(function(a,b){return end[a].y-end[b].y});
  var rank=[];order.forEach(function(k,r){rank[k]=r});
  return {fr:fr,nf:nf,N:N,hits:sim.hits,end:end,rank:rank};
}
function simPose(sim,k,s){
  var f=clamp(s/SDT,0,sim.nf-1),f0=Math.floor(f),f1=Math.min(sim.nf-1,f0+1),q=f-f0,N=sim.N,a=(f0*N+k)*3,b=(f1*N+k)*3,fr=sim.fr;
  return {x:mix(fr[a],fr[b],q),y:mix(fr[a+1],fr[b+1],q),a:mix(fr[a+2],fr[b+2],q)};
}

/* ─────────── один обвал со сборкой ─────────── */
function mkK(tap,from,to,sim){
  var K={tap:tap,from:from,to:to,sim:sim};
  K.err=tap+.05;K.burst=tap+.46;K.rel=K.burst+.05;K.rb=K.rel+1.12;
  K.fs=LINES.map(function(L,k){return K.rb+sim.rank[k]*FLY.ST});
  K.p0=LINES.map(function(L,k){var p=simPose(sim,k,K.fs[k]-K.rel);p.a=wrapA(p.a);return p});
  K.done=K.rb+(LINES.length-1)*FLY.ST+FLY.D;
  K.chip=K.done+.04;
  var nk=LINES.findIndex(function(L){return L.num});K.numLand=K.fs[nk]+FLY.D*.8;
  return K;
}
function backOut(e){var c1=.9,c3=c1+1;return 1+c3*Math.pow(e-1,3)+c1*Math.pow(e-1,2)}
function plankPose(k,u,K){
  var L=LINES[k],rest={x:L.rx,y:L.ry,a:0};
  if(!K||u<K.rel)return rest;
  var fs=K.fs[k];
  if(u<fs)return simPose(K.sim,k,u-K.rel);
  var e=(u-fs)/FLY.D;
  if(e>=1){var s=u-fs-FLY.D;rest.y+=s<.4?1.4*Math.exp(-s*12)*Math.sin(s*38):0;return rest}
  var p0=K.p0[k],q=backOut(e),mx=mix(p0.x,L.rx,.3),my=mix(p0.y,L.ry,.85);
  var x=(1-q)*(1-q)*p0.x+2*(1-q)*q*mx+q*q*L.rx,y=(1-q)*(1-q)*p0.y+2*(1-q)*q*my+q*q*L.ry;
  return {x:x,y:y,a:p0.a*(1-eout(Math.min(1,e*1.25)))};
}

/* ─────────── тема ─────────── */
var TH={};
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function readTheme(){var cs=getComputedStyle(document.documentElement);['chip','chip-hot','amber','amber-bg','sub','ink'].forEach(function(k){TH[k]=hex(cs.getPropertyValue('--'+k))})}
function mixc(a,b,t){return 'rgb('+Math.round(mix(a[0],b[0],t))+','+Math.round(mix(a[1],b[1],t))+','+Math.round(mix(a[2],b[2],t))+')'}

/* ─────────── кадр ───────────
   F.u: время; F.K: текущий обвал или null; F.v: версия, если обвала нет; F.p: сколько слов выдано;
   F.chipA: появление ссылки без обвала; F.wipe: стирание перед повтором; F.cur: курсор */
function popS(t){return t<=0?0:1-Math.exp(-t*13)*Math.cos(t*21)}
function render(F){
  var u=F.u,K=F.K;
  // слова
  WD.forEach(function(w,i){
    var op=sm((F.p-i)/FADE);
    if(F.wipe>0){var d=(NW-1-i)/NW*.45,k=sm(seg(F.wipe,d,d+.55));op*=1-k}
    set(w.el,'opacity',op.toFixed(3));
  });
  // доски
  LINES.forEach(function(L,k){
    var q=plankPose(k,u,K);
    set(L.el,'transform','translate('+f2(q.x-L.w/2)+'px,'+f2(q.y-LH/2)+'px) rotate('+(q.a*180/Math.PI).toFixed(2)+'deg)');
  });
  // число: барабан по разрядам справа налево
  var nw=WD[NUMI],a=K?VER[K.from].n:VER[F.v].n,b=K?VER[K.to].n:a,rt=K?u-K.numLand:-1;
  nw.dg.forEach(function(d,j){
    var D=nw.dg.length-1-j,ch=a[j]!==b[j],r=ch?eio(seg(rt,D*.09,D*.09+.3)):0;
    txt(d.a,a[j]);txt(d.b,b[j]);
    set(d.a,'transform','translateY('+f2(-22*r)+'px)');set(d.b,'transform','translateY('+f2(-22*r)+'px)');
  });
  // ссылка
  var src,sc=1,op=1,err=0,dx=0,hot=0,org='0% 50%';
  if(!K||u>=K.burst+.25){
    var v=K?K.to:F.v,pt=K?u-K.chip:F.chipT;src=VER[v].src;
    sc=popS(pt);op=sm(pt/.08);
    if(F.wipe>0)op*=1-sm(seg(F.wipe,0,.25));
  }else{
    src=VER[K.from].src;
    err=sm(seg(u,K.err,K.err+.14));
    var te=u-K.err;dx=te>0?4.5*Math.exp(-te*7)*Math.sin(te*46):0;
    var bt=u-K.burst;
    if(bt>0){org='50% 50%';sc=bt<.06?1+.14*sm(bt/.06):1.14*(1-eout(seg(bt,.06,.2)));op=1-sm(seg(bt,.08,.2))}
  }
  var c=F.cur;
  var wA=CHW[src],wE=CHW['404'],cw=mix(wA,wE,err);
  if(c&&c.a>.5&&!err){var rx=c.x-M.cx-1,ry=c.y-M.cy-1;hot=rx>-2&&rx<cw+2&&ry>-2&&ry<22?1:0}
  txt(ctx,err<.5?src:'404');
  set(ctx,'opacity',(Math.abs(2*err-1)).toFixed(3));
  set(chip,'width',cw.toFixed(2)+'px');
  set(chip,'opacity',op.toFixed(3));
  set(chip,'transformOrigin',org);
  set(chip,'transform','translate('+f2(M.cx+dx)+'px,'+f2(M.cy)+'px) scale('+Math.max(0,sc*(1-.08*(F.press||0))).toFixed(3)+')');
  set(chip,'background',err>0?mixc(TH.chip,TH['amber-bg'],err):mixc(TH.chip,TH['chip-hot'],hot));
  set(chip,'color',err>0?mixc(TH.sub,TH.amber,err):mixc(TH.sub,TH.ink,hot*.6));
  chip.setAttribute('aria-label','Source: '+(err<.5?src:'page not found'));
  drawCur(c);
}
function drawCur(c){
  if(!c||c.a<=.001){set(cur,'opacity','0');return}
  set(cur,'opacity',c.a.toFixed(3));
  set(cur,'transform','translate('+(c.x-5).toFixed(2)+'px,'+(c.y-2.6).toFixed(2)+'px) scale('+c.s.toFixed(3)+')');
  set(cur,'transformOrigin','5px 2.6px');
}

/* ─────────── автопоказ ───────────
   ответ дописывается, появляется ссылка, курсор жмёт: 404, обвал, сборка с новым источником;
   ещё раз; на «trust me» курсор подходит, зависает и передумывает. Потом стирание и стрим заново. */
var TL={},SEEDS=[130,9];           // сиды подобраны перебором: куча проваливается внутрь и успевает улечься
function buildTL(){
  TL.P0=27;                          // столько слов уже на экране в первом кадре
  TL.SD=(NW+FADE-TL.P0)/RATE;
  TL.C0=TL.SD+.02;
  TL.K=[];
  var tap=1.08;
  for(var j=0;j<2;j++){var K=mkK(tap,j,j+1,collapse(SEEDS[j]));TL.K.push(K);tap=K.chip+.82}
  var K2=TL.K[1];
  TL.H0=K2.chip+.3;TL.H1=TL.H0+.6;   // подход к «trust me»
  TL.END=TL.H1+1.05;                 // ролик кончается тут
  TL.W0=TL.END;TL.W1=TL.W0+.36;
  TL.S1=TL.W1+.14;
  CYCLE=TL.S1+TL.P0/RATE;
}
var CYCLE=10;
function scene(u){
  var F={u:u,K:null,v:0,p:NW+FADE,chipT:u-TL.C0,wipe:0,press:0,cur:null};
  if(u<TL.SD+.1)F.p=TL.P0+u*RATE;
  for(var i=0;i<TL.K.length;i++)if(u>=TL.K[i].tap)F.K=TL.K[i];
  if(u>=TL.W0){F.wipe=seg(u,TL.W0,TL.W1);}
  if(u>=TL.S1){F.K=null;F.v=0;F.wipe=0;F.p=(u-TL.S1)*RATE;F.chipT=-1}
  var K1=TL.K[0],K2=TL.K[1];
  F.press=Math.max(pulse(u,K1.tap-.03,K1.tap+.04),pulse(u,K2.tap-.03,K2.tap+.04));
  // курсор
  var cx=M.cx+1+CHW[VER[0].src]*.55,cy=M.cy+1+10,park={x:cx+24,y:cy+34};
  if(u>.3&&u<TL.W1){
    var c={x:cx,y:cy,a:sm(seg(u,.3,.45))*(1-sm(seg(u,TL.W0,TL.W1))),s:1-.12*F.press};
    if(u<K1.tap){var e=eout(seg(u,.3,K1.tap-.12));c.x=mix(cx+80,cx,e);c.y=mix(cy+190,cy,e)}
    else{
      var o1=eio(seg(u,K1.tap+.12,K1.tap+.6)),b1=eio(seg(u,K2.tap-.62,K2.tap-.1)),o2=eio(seg(u,K2.tap+.12,K2.tap+.6));
      var cx3=M.cx+1+CHW[VER[2].src]*.9,cy3=cy+7,b2=eio(seg(u,TL.H0,TL.H1)),back=eio(seg(u,TL.END-.42,TL.END-.1));
      var k=o1*(1-b1)+o2*(1-b2);
      c.x=mix(cx,park.x,k);c.y=mix(cy,park.y,k);
      if(b2>0){c.x=mix(c.x,cx3,b2);c.y=mix(c.y,cy3,b2)}
      // передумал: чуть отводит руку
      c.x+=10*back;c.y+=16*back;
    }
    F.cur=c;
  }
  return F;
}

/* ─────────── звук: события [время, тип, …] ─────────── */
var EVENTS=[];
function panX(x){return clamp((x/M.W-.5)*.7,-.6,.6)}
function kEvents(K,out){
  out.push([K.tap-.03,'press'],[K.tap+.05,'release'],[K.err,'err'],[K.burst+.04,'burst']);
  K.sim.hits.forEach(function(hh){out.push([K.rel+hh[0],'hit',hh[2],LINES[hh[1]].w,panX(hh[3])])});
  LINES.forEach(function(L,k){out.push([K.fs[k],'lift',panX(L.rx),K.sim.rank[k]],[K.fs[k]+FLY.D*.62,'seat',panX(L.rx),K.sim.rank[k]])});
  if(VER[K.from].n!==VER[K.to].n)out.push([K.numLand,'roll']);
  out.push([K.chip,'pop',K.to]);
}
function buildEvents(){
  EVENTS=[];
  WD.forEach(function(w,i){
    var a=(i-TL.P0)/RATE;if(a>=0)EVENTS.push([a,'tick',panX(M.ax+w.x),i]);
    var b=TL.S1+i/RATE;if(b<CYCLE)EVENTS.push([b,'tick',panX(M.ax+w.x),i]);
  });
  EVENTS.push([TL.C0,'pop',0]);
  TL.K.forEach(function(K){kEvents(K,EVENTS)});
  EVENTS.push([TL.W0,'wipe']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим: на ссылку жмёт сам зритель ─────────── */
var mode='auto',LV=null,seedN=101;
function nowS(){return performance.now()/1000}
function liveF(n){
  var u=n-LV.t0,F={u:u,K:LV.K,v:LV.v,p:NW+FADE,chipT:u-LV.chip0,wipe:0,press:LV.press,cur:null};
  if(LV.K&&u>=LV.K.done+.5){LV.v=LV.K.to;LV.chip0=LV.K.chip;LV.K=null;F.K=null;F.v=LV.v;F.chipT=u-LV.chip0}
  return F;
}
function busy(F){return F.K&&F.u<F.K.chip+.15}
function tapNow(){
  Sound.start();
  var n=nowS();
  if(mode==='auto'){
    var F=scene(uNow());
    if(F.u>=TL.S1||F.chipT<.15||busy(F)||F.wipe>0)return;
    var v=F.K?F.K.to:F.v;
    mode='live';LV={t0:n,K:null,v:v,chip0:-10,press:0};
    document.documentElement.classList.add('live');
  }
  var u=n-LV.t0,G0=liveF(n);if(busy(G0))return;
  var K=mkK(u,LV.v,(LV.v+1)%VER.length,collapse(seedN++));
  K.tap=u;LV.K=K;
  var ev=[];kEvents(K,ev);ev.forEach(function(e){Sound.play(e,Math.max(0,e[0]-u))});
  LV.press=1;setTimeout(function(){if(LV)LV.press=0},90);
}
chip.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();tapNow()});
chip.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();tapNow()}});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();tapNow()}
});
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(scene(u));
    if(!REC&&!paused)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=TL.END-PH-1e-6)window.__done=true;
  }else render(liveF(nowS()));
  requestAnimationFrame(tick);
}

var playBtn=document.getElementById('play');
playBtn.onclick=function(){Sound.start();paused=false;goAuto()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  readTheme();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,TL.END-PH)};
window.__TL=TL;

function init(){build();fit();measure();buildTL();buildEvents();render(scene(REC?PH:0))}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',fit);
  requestAnimationFrame(tick);
});
