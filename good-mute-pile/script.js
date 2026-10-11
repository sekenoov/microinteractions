/* ─────────── Good ───────────
   Понедельник, 9:02, созвон «Monday standup». Камеры у всех выключены, сабы включены.
   Sarah спрашивает «how was everyone’s weekend?», и я рассказываю. Только микрофон выключен:
   слова не уходят в звонок, а плашками падают в мою же плитку и копятся кучей, плитку
   распирает. «you’re on mute». Жму микрофон, и всё накопленное разом вылетает на весь экран
   и осыпается вниз. «sorry, can you repeat that?» Отвечаю: «good.»
   Кадр рисуется из одного t. Куча считается один раз при загрузке: плашки это капсулы,
   твёрдые тела на позиционной динамике (XPBD), 480 шагов в секунду. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');
if(QS.get('theme'))document.documentElement.setAttribute('data-theme',QS.get('theme'));

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.04,a+.03)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: z затухание, f частота в Гц
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874;
var TW=187,TH=262,TR=22,GX=10,GY=118,GAP=8;
// звонок на троих: двое сверху, моя плитка снизу на всю ширину
var TILES=[
  {n:'Sarah',i:'S',x:GX,y:GY,w:TW,h:TH},
  {n:'Mike',i:'M',x:GX+TW+GAP,y:GY,w:TW,h:TH,mute:true},
  {n:'You',i:'A',x:GX,y:GY+TH+GAP,w:TW*2+GAP,h:TH,me:true}
];
var ME=TILES[2],AVR=36;
function avC(T){return {x:T.x+T.w/2,y:T.y+T.h*.45}}
var CAPT=664,CAPH=44,CAPP=14;
var CTY=790,BR=27,BTNX=[47,124,201,278,355],MICX=124;
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
var CF=15,CH=28,CPAD=11;

// что я рассказываю в выключенный микрофон
var WORDS=['ok so','saturday','car broke down','met this guy','steve had a boat','and a goat','the goat',
  'ate my phone','so we called','the cops','from the boat','cop shows up','steve proposes','to the cop','she says yes',
  'so sunday','wedding','on the boat','goat was','best man','i cried','anyway'];
// сабы: кто, текст, первое слово, последнее слово
var CAPS=[
  {who:0,s:'how was everyone’s weekend?',t0:.15,t1:.92},
  {who:0,s:'you’re on mute',t0:2.98,t1:3.36},
  {who:0,s:'sorry, can you repeat that?',t0:5.3,t1:5.98},
  {who:3,s:'good.',t0:6.62,t1:6.62}
];

/* ─────────── сценарий петли ─────────── */
var TL={SP0:1.05,SPAWN:[],FIN0:3.7,TAP1:4.0,BURST:4.03,FIN2:7.44,TAP2:7.74,CAPX:7.96,CYCLE:8.5};
(function(){
  var R=rng(5),t=TL.SP0;
  WORDS.forEach(function(w,i){TL.SPAWN.push(t);t+=.08+.034*R()+([1,3,7,10,15,19].indexOf(i)>=0?.06:0)});
})();
// точки покоя живого режима: перед включением микрофона и перед выключением
var SEGS=[0,TL.TAP1-.01,TL.TAP2-.01,TL.CYCLE];

var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),zoom=document.getElementById('zoom'),screenEl=document.getElementById('screen');
var K=2,S=1,COL={},SHX=0,SHY=0;
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function M0(){ctx.setTransform(K,0,0,K,K*SHX,K*SHY)}
function setFont(sz,wt,ls){ctx.font=(wt||400)+' '+sz+'px '+FONT;if('letterSpacing'in ctx)ctx.letterSpacing=(ls==null?-.01*sz:ls)+'px'}

/* ─────────── плашки ─────────── */
var CHIPS=[];
function buildChips(){
  setFont(CF,500);
  CHIPS=WORDS.map(function(s){
    var w=Math.round(ctx.measureText(s).width+CPAD*2),m=w*CH/1000;
    return {s:s,w:w,h:CH,r:CH/2,hl:(w-CH)/2,m:m,im:1/m,iI:12/(m*(w*w+CH*CH))};
  });
}

/* ─────────── куча: капсулы на XPBD ───────────
   Нормаль контакта смотрит от B к A, проникновение (pB − pA)·n. Стены: плоскости
   с нормалью внутрь. До удара это стенки моей плитки, после него края экрана без пола. */
var SIM={hz:120,frames:[],fill:[],hits:[],T:0,T0:0};
function ptSeg(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy),0,1);return [ax+dx*t,ay+dy*t]}
function segSeg(p1x,p1y,q1x,q1y,p2x,p2y,q2x,q2y){
  var d1x=q1x-p1x,d1y=q1y-p1y,d2x=q2x-p2x,d2y=q2y-p2y,rx=p1x-p2x,ry=p1y-p2y;
  var a=d1x*d1x+d1y*d1y,e=d2x*d2x+d2y*d2y,f=d2x*rx+d2y*ry,c=d1x*rx+d1y*ry,b=d1x*d2x+d1y*d2y,den=a*e-b*b,s,t;
  s=den>1e-9?clamp((b*f-c*e)/den,0,1):0;
  t=(b*s+f)/e;
  if(t<0){t=0;s=clamp(-c/a,0,1)}else if(t>1){t=1;s=clamp((b-c)/a,0,1)}
  return [p1x+d1x*s,p1y+d1y*s,p2x+d2x*t,p2y+d2y*t];
}
function tileWalls(){
  var x0=ME.x+3,x1=ME.x+ME.w-3,y0=ME.y+3,y1=ME.y+ME.h-3;
  return [{nx:1,ny:0,px:x0,py:0},{nx:-1,ny:0,px:x1,py:0},{nx:0,ny:1,px:0,py:y0},{nx:0,ny:-1,px:0,py:y1}];
}
function screenWalls(){return [{nx:1,ny:0,px:0,py:0},{nx:-1,ny:0,px:SW,py:0},{nx:0,ny:1,px:0,py:0}]}

function simulate(){
  var R=rng(11),HZ=960,dt=1/HZ,G=2400,MUS=.75,MUD=.5,E=.14;
  var T0=TL.SPAWN[0],bodies=[],walls=tileWalls(),burst=false,t=0,step=0,next=0,n=CHIPS.length,av=avC(ME);
  SIM.frames=[];SIM.fill=[];SIM.hits=[];SIM.T0=T0;

  function wpt(b,lx,ly,prev){
    var a=prev?b.pa:b.a,c=Math.cos(a),s=Math.sin(a);
    return [(prev?b.px:b.x)+c*lx-s*ly,(prev?b.py:b.y)+s*lx+c*ly];
  }
  function ends(b){var c=Math.cos(b.a),s=Math.sin(b.a);return [b.x-c*b.hl,b.y-s*b.hl,b.x+c*b.hl,b.y+s*b.hl]}
  function vAt(b,rx,ry){return b?[b.vx-b.w*ry,b.vy+b.w*rx]:[0,0]}
  function push(b,px,py,rx,ry){if(!b)return;b.x+=px*b.im;b.y+=py*b.im;b.a+=b.iI*(rx*py-ry*px)}
  function kick(b,jx,jy,rx,ry){if(!b)return;b.vx+=jx*b.im;b.vy+=jy*b.im;b.w+=b.iI*(rx*jy-ry*jx)}
  function wgt(b,rx,ry,nx,ny){if(!b)return 0;var rn=rx*ny-ry*nx;return b.im+b.iI*rn*rn}

  var cs=[];
  function addC(A,B,nx,ny,pax,pay,pbx,pby){
    var c={A:A,B:B,nx:nx,ny:ny,lam:0},ca=Math.cos(A.a),sa=Math.sin(A.a),dx=pax-A.x,dy=pay-A.y;
    c.ax=ca*dx+sa*dy;c.ay=-sa*dx+ca*dy;
    if(B){var cb=Math.cos(B.a),sb=Math.sin(B.a),ex=pbx-B.x,ey=pby-B.y;c.bx=cb*ex+sb*ey;c.by=-sb*ex+cb*ey}
    else{c.bx=pbx;c.by=pby}
    var va=vAt(A,pax-A.x,pay-A.y),vb=B?vAt(B,pbx-B.x,pby-B.y):[0,0];
    c.vn0=(va[0]-vb[0])*nx+(va[1]-vb[1])*ny;
    cs.push(c);
  }
  function pair(A,B){
    if(Math.abs(A.x-B.x)>A.hl+B.hl+A.r+B.r+2||Math.abs(A.y-B.y)>A.hl+B.hl+A.r+B.r+2)return;
    var ea=ends(A),eb=ends(B),Rr=A.r+B.r,found=0,k,q,dx,dy,d;
    for(k=0;k<2;k++){
      var px=ea[2*k],py=ea[2*k+1];q=ptSeg(px,py,eb[0],eb[1],eb[2],eb[3]);dx=px-q[0];dy=py-q[1];d=Math.hypot(dx,dy);
      if(d<Rr&&d>1e-6){var nx=dx/d,ny=dy/d;addC(A,B,nx,ny,px-nx*A.r,py-ny*A.r,q[0]+nx*B.r,q[1]+ny*B.r);found++}
    }
    for(k=0;k<2;k++){
      var bx=eb[2*k],by=eb[2*k+1];q=ptSeg(bx,by,ea[0],ea[1],ea[2],ea[3]);dx=q[0]-bx;dy=q[1]-by;d=Math.hypot(dx,dy);
      if(d<Rr&&d>1e-6){var mx=dx/d,my=dy/d;addC(A,B,mx,my,q[0]-mx*A.r,q[1]-my*A.r,bx+mx*B.r,by+my*B.r);found++}
    }
    var sg=segSeg(ea[0],ea[1],ea[2],ea[3],eb[0],eb[1],eb[2],eb[3]);dx=sg[0]-sg[2];dy=sg[1]-sg[3];d=Math.hypot(dx,dy);
    {
      if(!found&&d<Rr&&d>1e-3){
        var ux=dx/d,uy=dy/d;
        addC(A,B,ux,uy,sg[0]-ux*A.r,sg[1]-uy*A.r,sg[2]+ux*B.r,sg[3]+uy*B.r);
      }else if(d<=1e-3){
        // крест-накрест: выталкиваем по нормали к B самый глубокий конец A
        var lx=eb[2]-eb[0],ly=eb[3]-eb[1],ll=Math.hypot(lx,ly),nx2=-ly/ll,ny2=lx/ll;
        if((A.x-B.x)*nx2+(A.y-B.y)*ny2<0){nx2=-nx2;ny2=-ny2}
        var s0=(ea[0]-eb[0])*nx2+(ea[1]-eb[1])*ny2,s1=(ea[2]-eb[0])*nx2+(ea[3]-eb[1])*ny2,kk=s0<s1?0:1,sd=Math.min(s0,s1),px2=ea[2*kk],py2=ea[2*kk+1];
        addC(A,B,nx2,ny2,px2-nx2*A.r,py2-ny2*A.r,px2-nx2*sd+nx2*B.r,py2-ny2*sd+ny2*B.r);
      }
    }
  }
  function wall(A,W){
    var e=ends(A);
    for(var k=0;k<2;k++){
      var cx=e[2*k],cy=e[2*k+1],dist=(cx-W.px)*W.nx+(cy-W.py)*W.ny;
      if(dist<A.r)addC(A,null,W.nx,W.ny,cx-W.nx*A.r,cy-W.ny*A.r,cx-W.nx*dist,cy-W.ny*dist);
    }
  }
  function arms(c){
    var A=c.A,B=c.B,pa=wpt(A,c.ax,c.ay),pb=B?wpt(B,c.bx,c.by):[c.bx,c.by];
    return {pax:pa[0],pay:pa[1],pbx:pb[0],pby:pb[1],rax:pa[0]-A.x,ray:pa[1]-A.y,rbx:B?pb[0]-B.x:0,rby:B?pb[1]-B.y:0};
  }
  function solvePos(c){
    var A=c.A,B=c.B,m=arms(c),d=(m.pbx-m.pax)*c.nx+(m.pby-m.pay)*c.ny;
    if(d<=0)return;
    var w=wgt(A,m.rax,m.ray,c.nx,c.ny)+wgt(B,m.rbx,m.rby,c.nx,c.ny),dl=d/w;c.lam+=dl;
    push(A,c.nx*dl,c.ny*dl,m.rax,m.ray);push(B,-c.nx*dl,-c.ny*dl,m.rbx,m.rby);
    // трение покоя: снимаем сдвиг точек контакта за шаг, если он меньше порога
    m=arms(c);
    var a0=wpt(A,c.ax,c.ay,true),b0=B?wpt(B,c.bx,c.by,true):[c.bx,c.by];
    var dx=(m.pax-a0[0])-(m.pbx-b0[0]),dy=(m.pay-a0[1])-(m.pby-b0[1]),dn=dx*c.nx+dy*c.ny;
    var tx=dx-dn*c.nx,ty=dy-dn*c.ny,tl=Math.hypot(tx,ty);
    if(tl<1e-9)return;
    tx/=tl;ty/=tl;
    var wt=wgt(A,m.rax,m.ray,tx,ty)+wgt(B,m.rbx,m.rby,tx,ty),dt2=tl/wt;
    if(dt2<MUS*c.lam){push(A,-tx*dt2,-ty*dt2,m.rax,m.ray);push(B,tx*dt2,ty*dt2,m.rbx,m.rby)}
  }
  var lastHit={};
  function solveVel(c){
    if(c.lam<=0)return;
    var A=c.A,B=c.B,m=arms(c),va=vAt(A,m.rax,m.ray),vb=B?vAt(B,m.rbx,m.rby):[0,0];
    var vx=va[0]-vb[0],vy=va[1]-vb[1],vn=vx*c.nx+vy*c.ny,vtx=vx-vn*c.nx,vty=vy-vn*c.ny,vt=Math.hypot(vtx,vty);
    if(vt>1e-6){
      var tx=vtx/vt,ty=vty/vt,dv=Math.min(MUD*c.lam/dt,vt),wt=wgt(A,m.rax,m.ray,tx,ty)+wgt(B,m.rbx,m.rby,tx,ty),j=dv/wt;
      kick(A,-tx*j,-ty*j,m.rax,m.ray);kick(B,tx*j,ty*j,m.rbx,m.rby);
    }
    var e=c.vn0<-2*G*dt*3?E:0,dvn=-vn+Math.max(-e*c.vn0,0),wn=wgt(A,m.rax,m.ray,c.nx,c.ny)+wgt(B,m.rbx,m.rby,c.nx,c.ny),jn=dvn/wn;
    kick(A,c.nx*jn,c.ny*jn,m.rax,m.ray);kick(B,-c.nx*jn,-c.ny*jn,m.rbx,m.rby);
    // удар для звука и для дрожи плитки
    if(c.vn0<-150){
      var key=A.i+'_'+(B?B.i:'w');
      if(!(t-(lastHit[key]||-1)<.06)){lastHit[key]=t;SIM.hits.push({t:t,v:-c.vn0,x:m.pax,y:m.pay,wall:!B,free:burst})}
    }
  }

  var MAXT=TL.BURST-T0+2.4,done=false;
  while(t<MAXT&&!done){
    var tt=T0+t;
    while(next<n&&TL.SPAWN[next]<=tt+1e-9){
      // слово выпадает над тем местом кучи, где ниже всего, ближе к аватарке
      var C=CHIPS[next],lo=ME.x+5+C.w/2,hi=ME.x+ME.w-5-C.w/2,best=null;
      for(var c=0;c<11;c++){
        var x=clamp(av.x+(c-5)*26+(R()-.5)*18,lo,hi),tp=ME.y+ME.h-3;
        bodies.forEach(function(b){
          var ex=Math.abs(Math.cos(b.a))*b.hl+b.r,ey=Math.abs(Math.sin(b.a))*b.hl+b.r;
          if(Math.abs(b.x-x)<ex+C.w/2+2)tp=Math.min(tp,b.y-ey);
        });
        var sc=tp-Math.abs(x-av.x)*.22+R()*14;
        if(!best||sc>best.s)best={x:x,top:tp,s:sc};
      }
      var sx=best.x,top=best.top;
      var sy=Math.max(Math.min(av.y+10,top-C.r-5),ME.y+4+C.r);
      bodies.push({i:next,x:sx,y:sy,a:(R()-.5)*.3,vx:(R()-.5)*170,vy:-(240+R()*180),w:(R()-.5)*4,hl:C.hl,r:C.r,im:C.im,iI:C.iI,born:t});
      next++;
    }
    if(!burst&&tt>=TL.BURST){
      burst=true;walls=screenWalls();
      var cx=ME.x+ME.w/2,cy=ME.y+ME.h*.62;
      bodies.forEach(function(b){
        var dx=(b.x-cx)/(ME.w/2),dy=(b.y-cy)/(ME.h/2);
        b.vx=dx*(260+R()*420)+(R()-.5)*420;b.vy=-(820+R()*720)+dy*120;b.w=(R()-.5)*18;
      });
    }
    bodies.forEach(function(b){
      b.px=b.x;b.py=b.y;b.pa=b.a;
      b.vy+=G*dt;b.w*=1-(burst?.6:5)*dt;
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
    });
    cs=[];
    for(var i=0;i<bodies.length;i++){
      if(!burst)for(var j=i+1;j<bodies.length;j++)pair(bodies[i],bodies[j]);
      for(var k=0;k<walls.length;k++)wall(bodies[i],walls[k]);
    }
    cs.forEach(solvePos);
    bodies.forEach(function(b){b.vx=(b.x-b.px)/dt;b.vy=(b.y-b.py)/dt;b.w=(b.a-b.pa)/dt});
    cs.forEach(solveVel);
    if(step%8===0){
      var F=new Float32Array(n*3).fill(NaN),top2=ME.y+ME.h;
      bodies.forEach(function(b){
        F[b.i*3]=b.x;F[b.i*3+1]=b.y;F[b.i*3+2]=b.a;
        if(!burst)top2=Math.min(top2,b.y-Math.abs(Math.sin(b.a))*b.hl-b.r);
      });
      SIM.frames.push(F);SIM.fill.push(burst?0:(ME.y+ME.h-top2)/ME.h);
    }
    if(burst&&bodies.every(function(b){return b.y-b.hl-b.r>SH+20}))done=true;
    t+=dt;step++;
  }
  SIM.T=t;
}
function simIdx(st){var x=clamp(st*SIM.hz,0,SIM.frames.length-1),i=Math.floor(x);return [i,x-i]}
function poseAt(t){
  var st=t-SIM.T0;
  if(st<0||st>SIM.T)return null;
  var q=simIdx(st),A=SIM.frames[q[0]],B=SIM.frames[Math.min(q[0]+1,SIM.frames.length-1)],f=q[1],out=[];
  for(var i=0;i<CHIPS.length;i++){
    var x=A[i*3];if(x!==x){out.push(null);continue}
    var bx=B[i*3];if(bx!==bx)bx=x;
    out.push([mix(x,bx,f),mix(A[i*3+1],B[i*3+1],f),mix(A[i*3+2],B[i*3+2],f)]);
  }
  return out;
}
function fillAt(t){var st=t-SIM.T0;if(st<0)return 0;var q=simIdx(st);return mix(SIM.fill[q[0]],SIM.fill[Math.min(q[0]+1,SIM.fill.length-1)],q[1])}

/* ─────────── состояние кадра ─────────── */
function saidAt(t){
  // сколько уже сказано, плавно: доля плашек с задержкой на падение
  var S=TL.SPAWN,n=0,u=t-.18;
  for(var i=0;i<S.length;i++){if(u>=S[i])n=i+c01((u-S[i])/(i<S.length-1?S[i+1]-S[i]:.15))}
  return n/S.length;
}
function bulgeOf(t){
  var b=9*sm(seg(saidAt(t),.3,1));
  // каждая упавшая плашка толкает стенки
  var st=t-SIM.T0;
  SIM.hits.forEach(function(h){
    if(h.free)return;var d=st-h.t;
    if(d>0&&d<.5)b+=Math.min(1,h.v/650)*1.5*Math.exp(-d*11)*Math.sin(2*Math.PI*8*d);
  });
  // перед кнопкой распирает и трясёт
  b+=1.6*sm(seg(t,TL.FIN0-.4,TL.TAP1))*(1+.6*Math.sin(t*2*Math.PI*23));
  return b;
}
function bulgeAt(t){
  if(t<SIM.T0)return 0;
  if(t<TL.BURST)return bulgeOf(t);
  var d=t-TL.BURST,b0=bulgeOf(TL.BURST-1e-4);
  return b0*Math.exp(-d*6)*Math.cos(2*Math.PI*4.2*d);
}
function talkEnv(t){
  // я говорю в выключенный микрофон
  var a=TL.SPAWN[0]-.08,b=TL.SPAWN[TL.SPAWN.length-1]+.16;
  return pulse(t,a,b);
}
function capOf(t){
  var k=-1;for(var i=0;i<CAPS.length;i++)if(t>=CAPS[i].t0)k=i;
  if(k<0||t>=TL.CAPX+.22)return null;
  return k;
}
function speaking(who,t){
  var v=0;
  CAPS.forEach(function(c){if(c.who===who)v=Math.max(v,pulse(t,c.t0-.04,c.t1+(who===3?.42:.26)))});
  return v;
}
function micMuted(t){return t<TL.TAP1||t>=TL.TAP2}

/* ─────────── отрисовка ─────────── */
function tilePath(T,b,ox,oy){
  var x=T.x+(ox||0),y=T.y+(oy||0),w=T.w,h=T.h,r=TR,bt=b.t||0,br=b.r||0,bb=b.b||0,bl=b.l||0;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.quadraticCurveTo(x+w/2,y-2*bt,x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.quadraticCurveTo(x+w+2*br,y+h/2,x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.quadraticCurveTo(x+w/2,y+h+2*bb,x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.quadraticCurveTo(x-2*bl,y+h/2,x,y+r);
  ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}
function drawTile(T,t,bul){
  var b=T.me?{t:bul,r:bul*.55,b:bul*1.05,l:bul*.55}:{};
  // соседей сверху моя плитка продавливает, когда раздувается сильнее зазора
  var dent=Math.max(0,bul-GAP*.5);
  if(!T.me)b={b:-dent*.8};
  M0();tilePath(T,b);ctx.fillStyle=COL.tile;ctx.fill();
  ctx.strokeStyle=COL.tileLine;ctx.lineWidth=1;ctx.stroke();
  var c=avC(T),spk=T.me?speaking(3,t):(T.n==='Sarah'?speaking(0,t):0),sc=1;
  if(T.me){var e=talkEnv(t);sc=1+.06*e*(.5+.5*Math.sin(t*2*Math.PI*6.3))}
  if(spk>0){
    // кольцо вокруг аватарки дышит голосом
    var ring=AVR+5+3.5*spk*(.5+.5*Math.sin(t*2*Math.PI*5.1));
    M0();ctx.globalAlpha=.9*spk;ctx.strokeStyle=COL.spk;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(c.x,c.y,ring,0,7);ctx.stroke();ctx.globalAlpha=1;
  }
  M0();ctx.translate(c.x,c.y);ctx.scale(sc,sc);
  ctx.fillStyle=COL.av;ctx.beginPath();ctx.arc(0,0,AVR,0,7);ctx.fill();
  setFont(30,600,0);ctx.fillStyle=COL.avInk;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(T.i,0,1.5);
  if(spk>0){
    M0();tilePath(T,b);ctx.globalAlpha=spk;ctx.strokeStyle=COL.spk;ctx.lineWidth=3;
    ctx.save();ctx.clip();ctx.lineWidth=6;ctx.stroke();ctx.restore();ctx.globalAlpha=1;
  }
}
function micIcon(cx,cy,s,col,slash,knock){
  ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.roundRect(-4.2,-11,8.4,13.5,4.2);ctx.fill();
  ctx.beginPath();ctx.arc(0,-3.2,7.6,.08*Math.PI,.92*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,4.4);ctx.lineTo(0,8.6);ctx.stroke();
  if(slash){
    if(knock){ctx.strokeStyle=knock;ctx.lineWidth=5.4;ctx.beginPath();ctx.moveTo(-9.5,-12);ctx.lineTo(9.5,8.6);ctx.stroke()}
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9.5,-12);ctx.lineTo(9.5,8.6);ctx.stroke();
  }
  ctx.restore();
}
function drawLabel(T,t){
  var muted=T.me?micMuted(t):!!T.mute,x=T.x+10,y=T.y+T.h-12-13;
  setFont(14,600);var tw=ctx.measureText(T.n).width,w=tw+(muted?34:20),h=26;
  M0();ctx.fillStyle=COL.lbl;ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.fill();
  var tx=x+10;
  if(muted){micIcon(x+15,y+h/2+1.2,.62,COL.red,true,COL.lblSolid);tx=x+25}
  ctx.fillStyle=COL.lblInk;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(T.n,tx,y+h/2+.5);
}
function drawChip(C,p,sc){
  M0();ctx.translate(p[0],p[1]);ctx.rotate(p[2]);if(sc!==1)ctx.scale(sc,sc);
  ctx.beginPath();ctx.roundRect(-C.w/2,-C.h/2,C.w,C.h,C.h/2);ctx.fillStyle=COL.chip;ctx.fill();
  if(COL.dark){ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=.6;ctx.stroke()}
  setFont(CF,500);ctx.fillStyle=COL.chipInk;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(C.s,0,.6);
}
function drawChips(t,pose){
  var st=t-SIM.T0;
  for(var i=0;i<CHIPS.length;i++){
    var p=pose[i];if(!p||p[1]>SH+40)continue;
    // слово выскакивает из аватарки
    var age=t-TL.SPAWN[i],sc=age<.12?mix(.45,1,eout(age/.12)):1;
    drawChip(CHIPS[i],p,sc);
  }
}
function drawHeader(){
  M0();ctx.strokeStyle=COL.ink;ctx.fillStyle=COL.ink;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(22,80);ctx.lineTo(30,88);ctx.lineTo(38,80);ctx.stroke();
  setFont(17,600);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Monday standup',201,84);
  // динамик
  ctx.save();ctx.translate(372,84);
  ctx.beginPath();ctx.moveTo(-9,-3.5);ctx.lineTo(-5,-3.5);ctx.lineTo(0,-8);ctx.lineTo(0,8);ctx.lineTo(-5,3.5);ctx.lineTo(-9,3.5);ctx.closePath();ctx.fill();
  ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(1,0,5,-.9,.9);ctx.stroke();ctx.beginPath();ctx.arc(1,0,9,-.85,.85);ctx.stroke();
  ctx.restore();
}
function capWidth(k,nw){
  var C=CAPS[k],words=C.s.split(' ');
  setFont(15,600);var w=ctx.measureText(C.who===3?'You':'Sarah').width+10;
  setFont(18,400);w+=ctx.measureText(words.slice(0,nw).join(' ')).width;
  return Math.round(w+CAPP*2);
}
function wordTimes(k){
  var C=CAPS[k],n=C.s.split(' ').length,out=[];
  for(var j=0;j<n;j++)out.push(n>1?mix(C.t0,C.t1,j/(n-1)):C.t0);
  return out;
}
function drawCaption(t){
  var k=capOf(t);if(k==null)return;
  var C=CAPS[k],words=C.s.split(' '),tw=wordTimes(k);
  // ширина тянется за словами пружинкой, от прошлых сабов к новым
  var prev=k>0?capWidth(k-1,CAPS[k-1].s.split(' ').length):capWidth(k,1)*.7,w=prev;
  for(var j=0;j<words.length;j++){var wj=capWidth(k,j+1),wp=j?capWidth(k,j):prev;w+=(wj-wp)*spring(t-tw[j],j?.66:.8,j?7:8)}
  var a=k===0?sm(seg(t,C.t0-.02,C.t0+.14)):1;
  if(t>TL.CAPX)a*=1-sm(seg(t,TL.CAPX,TL.CAPX+.2));
  var sc=k===0?mix(.92,1,eout(seg(t,C.t0-.02,C.t0+.2))):1;
  if(a<=0)return;
  M0();ctx.globalAlpha=a;ctx.translate(201,CAPT+CAPH/2);ctx.scale(sc,sc);
  ctx.beginPath();ctx.roundRect(-w/2,-CAPH/2,w,CAPH,14);ctx.fillStyle=COL.cap;ctx.fill();
  ctx.save();ctx.clip();
  var x=-w/2+CAPP;
  setFont(15,600);ctx.fillStyle=COL.capSub;ctx.textAlign='left';ctx.textBaseline='middle';
  var nm=C.who===3?'You':'Sarah';ctx.fillText(nm,x,.5);x+=ctx.measureText(nm).width+10;
  setFont(18,400);ctx.fillStyle=COL.capInk;
  for(var i=0;i<words.length;i++){
    var wa=sm(seg(t,tw[i]-.01,tw[i]+.07));if(wa<=0)break;
    ctx.globalAlpha=a*wa;ctx.fillText(words[i],x,.5);x+=ctx.measureText(words[i]+' ').width;
  }
  ctx.restore();ctx.globalAlpha=1;
}
function drawControls(t){
  var muted=micMuted(t);
  BTNX.forEach(function(x,i){
    var sc=1;
    if(i===1){[TL.TAP1,TL.TAP2].forEach(function(tp){var d=t-tp;if(d>-.04&&d<.3)sc*=1-.09*Math.sin(Math.PI*c01((d+.04)/.3))})}
    M0();ctx.translate(x,CTY);ctx.scale(sc,sc);
    var bg=i===4?COL.red:(i===1&&muted?COL.red:COL.btn),ink=(i===4||(i===1&&muted))?'#fff':COL.btnInk;
    ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,BR,0,7);ctx.fill();
    ctx.fillStyle=ink;ctx.strokeStyle=ink;ctx.lineCap='round';ctx.lineJoin='round';
    if(i===0){
      ctx.beginPath();ctx.roundRect(-11,-7,15,14,3.5);ctx.fill();
      ctx.beginPath();ctx.moveTo(5.5,-2.2);ctx.lineTo(11,-6);ctx.lineTo(11,6);ctx.lineTo(5.5,2.2);ctx.closePath();ctx.fill();
      ctx.strokeStyle=bg;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(10,10);ctx.stroke();
      ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(10,10);ctx.stroke();
    }else if(i===1){
      micIcon(0,1.5,1.05,ink,muted,bg);
    }else if(i===2){
      ctx.beginPath();ctx.roundRect(-12,-8.5,24,17,4);ctx.fill();
      setFont(10.5,800,0);ctx.fillStyle=bg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CC',0,.8);
    }else if(i===3){
      [-7,0,7].forEach(function(dx){ctx.beginPath();ctx.arc(dx,0,2.2,0,7);ctx.fill()});
    }else{
      ctx.lineWidth=4.6;ctx.beginPath();ctx.moveTo(-10,3);ctx.bezierCurveTo(-8,-6,8,-6,10,3);ctx.stroke();
      ctx.beginPath();ctx.roundRect(-13.5,.5,7.5,5.5,2.2);ctx.fill();ctx.beginPath();ctx.roundRect(6,.5,7.5,5.5,2.2);ctx.fill();
    }
  });
}
function fingerAt(t){
  var g={x:0,y:0,a:0,p:1};
  [[TL.FIN0,TL.TAP1],[TL.FIN2,TL.TAP2]].forEach(function(F){
    var t0=F[0],tp=F[1];
    if(t<t0||t>tp+.34)return;
    if(t<tp){var u=eout(seg(t,t0,tp));g.x=mix(MICX+120,MICX+4,u);g.y=mix(CTY+120,CTY+3,u);g.a=sm(seg(t,t0,t0+.1));g.p=mix(1,.9,u);return}
    var q=seg(t,tp,tp+.34);g.x=MICX+4+40*q*q;g.y=CTY+3+50*q*q;g.p=tp+.08>t?.82:mix(.82,1,seg(t,tp+.08,tp+.34));g.a=1-sm(seg(t,tp+.1,tp+.32));
  });
  return g;
}
function drawFinger(g){
  if(g.a<=0)return;
  M0();ctx.globalAlpha=g.a;ctx.translate(g.x,g.y);ctx.scale(g.p,g.p);
  ctx.fillStyle='rgba(120,120,128,.34)';ctx.beginPath();ctx.arc(0,0,23,0,7);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;
}
function shakeAt(t){
  var d=t-TL.BURST;if(d<0||d>.6)return [0,0];
  var e=Math.exp(-d*10);return [3.2*e*Math.sin(2*Math.PI*11*d+1),4.5*e*Math.sin(2*Math.PI*13*d)];
}

/* ─────────── кадр ─────────── */
function render(t){
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  var sh=shakeAt(t);SHX=sh[0];SHY=sh[1];
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=COL.scr;ctx.fillRect(0,0,cv.width,cv.height);
  drawHeader();
  var bul=bulgeAt(t);
  TILES.forEach(function(T){drawTile(T,t,bul)});
  var pose=poseAt(t),before=t<TL.BURST;
  if(pose&&before)drawChips(t,pose);
  TILES.forEach(function(T){drawLabel(T,t)});
  drawCaption(t);
  drawControls(t);
  if(pose&&!before)drawChips(t,pose);
  if(mode==='auto')drawFinger(fingerAt(t));
  ctx.setTransform(1,0,0,1,0,0);
}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function syllables(w){var m=w.toLowerCase().replace(/’/g,'').match(/[aeiouy]+/g);return Math.max(1,m?m.length:1)}
function buildEvents(){
  EVENTS=[];var R=rng(21);
  // Sarah: трубой с сурдиной, вопрос уходит вверх
  CAPS.forEach(function(C,k){
    var words=C.s.split(' '),tw=wordTimes(k),q=/\?$/.test(C.s);
    if(C.who===3){EVENTS.push([C.t0,'good']);return}
    words.forEach(function(w,j){
      var n=syllables(w),t0=tw[j],t1=j<words.length-1?tw[j+1]:t0+.13*n+.06,d=(t1-t0)/n;
      for(var s=0;s<n;s++){
        var last=j===words.length-1&&s===n-1,f=mix(255,212,(j+s/n)/words.length)*(1+.05*(R()-.5));
        EVENTS.push([t0+s*d,'syl',{f0:f,f1:last?(q?f*1.38:f*.82):f*(1+.04*(R()-.5)),d:Math.max(.07,d*.86)+(last?.1:0),open:1250+500*R(),g:.36,muff:0}]);
      }
    });
  });
  // я в выключенный микрофон: глухо, как в подушку
  WORDS.forEach(function(w,i){
    var t0=TL.SPAWN[i]-.03,t1=i<WORDS.length-1?TL.SPAWN[i+1]-.03:t0+.22,n=w.split(' ').reduce(function(a,x){return a+syllables(x)},0),d=(t1-t0)/n;
    for(var s=0;s<n;s++){var f=150*(1+.12*(R()-.5));EVENTS.push([t0+s*d,'syl',{f0:f,f1:f*(.92+.1*R()),d:Math.max(.05,d*.82),open:900+300*R(),g:.4,muff:460}])}
    EVENTS.push([TL.SPAWN[i],'pop',{f:900+500*R()}]);
  });
  SIM.hits.forEach(function(h){
    var t=SIM.T0+h.t,pan=clamp((h.x-201)/230,-.9,.9);
    if(!h.free)EVENTS.push([t,'plop',{v:h.v,pan:pan}]);
    else if(h.v>380&&R()<.55)EVENTS.push([t,'tick',{v:h.v,pan:pan,wall:h.wall}]);
  });
  EVENTS.push([TL.FIN0-.35,'strain',TL.TAP1-TL.FIN0+.35]);
  EVENTS.push([TL.TAP1,'tap'],[TL.TAP1+.01,'unmute'],[TL.BURST,'burst']);
  // всё, что накопилось, выходит разом и быстро
  for(var b=0;b<26;b++){var tb=TL.BURST+.02+b*.042,f=390+180*R();EVENTS.push([tb,'syl',{f0:f,f1:f*(.9+.2*R()),d:.04,open:2600+800*R(),g:.3*(1-b/34),muff:0,pan:(R()-.5)*.8}])}
  EVENTS.push([TL.TAP2,'tap'],[TL.TAP2+.01,'mute']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,TL.CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Касание запускает отрезок до следующей точки покоя: рассказ в выключенный микрофон,
   потом включение и «good.», потом выключение. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveTap(){
  Sound.start();
  var n=nowS();
  if(mode!=='live'){
    var u=uNow(),k=0;while(k<SEGS.length-2&&u>=SEGS[k+1])k++;
    LV={k:k,t0:n-(u-SEGS[k]),u:u};mode='live';return;
  }
  var end=SEGS[LV.k+1];
  if(LV.u<end-1e-6)return;
  LV.k=(LV.k+1)%(SEGS.length-1);LV.t0=n;LV.u=SEGS[LV.k];
}
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();liveTap()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();liveTap()}
});

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%TL.CYCLE)+TL.CYCLE)%TL.CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%TL.CYCLE)+TL.CYCLE)%TL.CYCLE;
    render(u);
    if(!REC&&!paused)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=TL.CYCLE-1e-6)window.__done=true;
  }else{
    var end=SEGS[LV.k+1],u2=Math.min(end,SEGS[LV.k]+(nowS()-LV.t0));
    if(u2>LV.u)fireBetween(LV.u,u2);
    LV.u=u2;render(u2>=TL.CYCLE-1e-6?0:u2);
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;mode='auto';LV=null;acc=0;lastU=0};
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
  var dark=th==='dark';
  COL={dark:dark,scr:css('--scr'),tile:css('--tile'),tileLine:css('--tile-line'),av:css('--av'),avInk:css('--av-ink'),ink:css('--call-ink'),sub:css('--call-sub'),
       chip:css('--chip'),chipInk:css('--chip-ink'),cap:css('--cap'),capInk:css('--cap-ink'),capSub:css('--cap-sub'),btn:css('--btn'),btnInk:css('--btn-ink'),
       red:css('--red'),spk:css('--spk'),
       lbl:dark?'rgba(0,0,0,.55)':'rgba(242,242,247,.94)',lblSolid:dark?'#0e0e0f':'#f2f2f7',lblInk:dark?'#ffffff':'#000000'};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused)render(uNow())}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?(hh-40)/846:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  K=Math.min(3.2,Math.max(1,S*(window.devicePixelRatio||1)*(REC||STILL?1.3:1)));
  cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
}

window.__seek=function(t){mode='auto';paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;
window.__SIM=SIM;

function boot(){
  buildChips();simulate();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();buildEvents();
  addEventListener('resize',fit);
  render(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
