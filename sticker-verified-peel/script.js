/* ─────────── Sticker ───────────
   Мой профиль, камера наезжает на новую галочку у имени. Галочка это наклейка, и у неё отходит уголок.
   Палец разглаживает, тогда отходит противоположный. Прижимаю сильнее и хлопаю два раза: держится.
   Приходит «Payment failed». Наклейка дрожит всеми краями, со звоном отскакивает,
   кувыркается и планирует вниз по профилю листом, ложится изнанкой вверх.
   Загиб: линия сгиба на расстоянии d от центра, клапан поворачивается вокруг неё,
   в проекции это сжатие вдоль нормали в cos θ раз; при cos < 0 видна бумажная изнанка.
   Поле 432 × 540 точек, кадр рисуется из одного t. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');
if(QS.get('theme'))document.documentElement.setAttribute('data-theme',QS.get('theme'));

var SW=432,SH=540,S=1,K=2,COL;
var frameEl=document.getElementById('frame'),cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))}

/* ─────────── раскладка профиля ─────────── */
var P={ny:222,R:10.5,yEnd:421};
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function txt(s,x,y,sz,col,wt,al){ctx.font=font(sz,wt);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function tw(s,sz,wt){ctx.font=font(sz,wt);return ctx.measureText(s).width}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
function layout(){
  P.nw=tw('Dias Sekenov',23,800);P.bx=24+P.nw+P.R+6;
  P.z=2.55;P.cx=P.bx-68;P.cy=P.ny+8;
}

function profile(){
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  ctx.fillStyle=COL.cover;ctx.fillRect(0,0,SW,128);
  dot(34,44,16,'rgba(0,0,0,.4)');
  ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(40.5,44);ctx.lineTo(27.5,44);ctx.moveTo(33,38.5);ctx.lineTo(27.5,44);ctx.lineTo(33,49.5);ctx.stroke();
  // аватар силуэтом
  dot(74,138,50,COL.bg);dot(74,138,46,COL.av);
  ctx.save();ctx.beginPath();ctx.arc(74,138,46,0,7);ctx.clip();
  dot(74,126,16,COL.avInk);ctx.fillStyle=COL.avInk;ctx.beginPath();ctx.ellipse(74,172,32,23,0,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(SW-136.5,146.5,116,36,18);ctx.stroke();
  txt('Edit profile',SW-78.5,165,15,COL.ink,700,'center');
  txt('Dias Sekenov',24,P.ny,23,COL.ink,800);
  txt('@sekenoov',24,P.ny+26,16,COL.sub);
  ctx.fillStyle=COL.bar;[[268,11],[226,11],[290,11],[172,11]].forEach(function(b,i){rr(24,P.ny+50+i*18,b[0],b[1],5.5);ctx.fill()});
  var y=P.ny+134,x=24;
  txt('24',x,y,15.5,COL.ink,700);x+=tw('24 ',15.5,700);txt('Following',x,y,15.5,COL.sub);x+=tw('Following',15.5)+18;
  txt('15',x,y,15.5,COL.ink,700);x+=tw('15 ',15.5,700);txt('Followers',x,y,15.5,COL.sub);
  var ty=P.ny+172;
  [['Posts',58,1],['Replies',158],['Highlights',266],['Media',372]].forEach(function(a){txt(a[0],a[1],ty,15,a[2]?COL.ink:COL.sub,a[2]?700:500,'center')});
  ctx.fillStyle=COL.vblue;rr(36,ty+17,44,4,2);ctx.fill();
  ctx.fillStyle=COL.hair;ctx.fillRect(0,ty+21,SW,1);
  dot(44,ty+66,21,COL.av);
  ctx.fillStyle=COL.bar;rr(76,ty+50,136,10,5);ctx.fill();rr(76,ty+70,300,10,5);ctx.fill();rr(76,ty+88,240,10,5);ctx.fill();
  rr(76,ty+110,330,140,14);ctx.fill();
}

/* ─────────── наклейка ─────────── */
function rosPath(r){
  var N=140;ctx.beginPath();
  for(var i=0;i<=N;i++){var th=i/N*Math.PI*2,R=r*(1+.1*Math.cos(8*th));i?ctx.lineTo(R*Math.cos(th),R*Math.sin(th)):ctx.moveTo(R*Math.cos(th),R*Math.sin(th))}
  ctx.closePath();
}
function face(r,front,shade){
  rosPath(r);
  if(front){
    ctx.fillStyle=COL.vblue;ctx.fill();
    if(shade<1){ctx.fillStyle='rgba(0,0,0,'+(1-shade)*.5+')';ctx.fill()}
    ctx.strokeStyle='#fff';ctx.lineWidth=r*.24;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-.36*r,.02*r);ctx.lineTo(-.1*r,.28*r);ctx.lineTo(.38*r,-.26*r);ctx.stroke();
  }else{
    ctx.fillStyle=COL.paper;ctx.fill();
    if(shade<1){ctx.fillStyle='rgba(0,0,0,'+(1-shade)*.25+')';ctx.fill()}
    ctx.strokeStyle=COL.paperEdge;ctx.lineWidth=.6;ctx.stroke();
  }
}
// полуплоскость n·p < d (side −1) или > d (side +1)
function half(nx,ny,d,side){
  var L=60,px=nx*d,py=ny*d;
  ctx.beginPath();ctx.moveTo(px-ny*L,py+nx*L);ctx.lineTo(px+ny*L,py-nx*L);
  ctx.lineTo(px+ny*L+side*nx*L,py-nx*L+side*ny*L);ctx.lineTo(px-ny*L+side*nx*L,py+nx*L+side*ny*L);ctx.closePath();ctx.clip();
}
function sticker(x,y,r,pe,jit){
  ctx.save();ctx.translate(x+(jit?jit[0]:0),y+(jit?jit[1]:0));if(jit)ctx.rotate(jit[2]);
  var nx=Math.cos(pe.ang),ny=Math.sin(pe.ang),d=pe.d*r,c=pe.c;
  if(pe.d>=1.12){face(r,true,1);ctx.restore();return}
  ctx.save();half(nx,ny,d,-1);face(r,true,1);ctx.restore();
  // клапан: тень на подложке, потом сам клапан в проекции
  var k=1-c;
  ctx.save();
  ctx.transform(1-k*nx*nx,-k*nx*ny,-k*nx*ny,1-k*ny*ny,k*d*nx,k*d*ny);
  half(nx,ny,d,1);
  var lift=Math.sqrt(Math.max(0,1-c*c));
  ctx.shadowColor=COL.sh;ctx.shadowBlur=r*(.5+.6*lift);ctx.shadowOffsetX=-nx*r*.12*lift;ctx.shadowOffsetY=r*.18*lift+1;
  face(r,c>0,c>0?.6+.4*c:.75+.25*Math.abs(c));
  ctx.restore();
  ctx.restore();
}

/* ─────────── сценарий ─────────── */
var TL={zin:[.2,1.0],A:[1.1,1.75,2.0,2.42],B:[2.7,3.2,3.45,3.78],rubA:[2.0,2.45],rubB:[3.45,4.0],taps:[4.15,4.38],
  ban:5.0,banOut:7.3,shiv:[5.38,5.75],pop:5.75,zout:[8.25,9.05],CYCLE:10};
function peelAt(t){
  var a=TL.A,b=TL.B;
  if(t<a[0])return {ang:-.8,d:1.3,c:1};
  if(t<b[0]){
    var u=eout(seg(t,a[0],a[1])),v=eio(seg(t,a[2],a[3])),k=u*(1-v);
    return {ang:-.8,d:mix(1.3,.4,k)+.05*Math.sin(t*13)*k,c:mix(1,-.58,k)+.14*Math.sin(t*9.5)*k};
  }
  if(t<TL.shiv[0]){
    var u2=eout(seg(t,b[0],b[1])),v2=eio(seg(t,b[2],b[3])),k2=u2*(1-v2);
    return {ang:2.35,d:mix(1.3,.24,k2)+.05*Math.sin(t*14)*k2,c:mix(1,-.4,k2)+.16*Math.sin(t*10.5)*k2};
  }
  // дрожь: края приподнимаются по кругу всё быстрее
  var s=seg(t,TL.shiv[0],TL.pop),ang=Math.pow(s,1.6)*26;
  return {ang:ang,d:mix(1.3,.78,sm(s*1.4))+.08*Math.sin(t*70),c:mix(1,.25,sm(s*1.4))};
}
// полёт: подскок, потом лист с раскачкой и кувырками, ложится изнанкой
var FL={};
function flightInit(){
  var D=P.yEnd-(P.ny-72);FL.fland=(-112+Math.sqrt(112*112+4*40*D))/80;FL.land=.34+FL.fland;
}
function flightAt(s){
  var up=eout(s/.34),f=Math.max(0,s-.34),x=P.bx+34*up,y=P.ny-72*up;
  var fl=Math.min(f,FL.fland);
  y+=40*fl*fl+112*fl;
  x+=58*Math.sin(3.1*fl)*Math.min(1,fl*1.6)-26*fl;
  var prog=c01(fl/FL.fland),phi=Math.PI*.9*up+Math.PI*4.1*eio(prog);
  var rot=up*1.1+.55*Math.sin(3.1*fl+1)*(1-prog*.8)-.3*prog;
  var q=s-FL.land,sq=0,by=0;
  if(q>0){by=-7*Math.abs(Math.sin(11*q))*Math.exp(-7*q);sq=.22*Math.exp(-9*q)*Math.sin(22*q);phi=Math.PI*5;x+=4*(1-Math.exp(-6*q))}
  return {x:x,y:y+by,phi:phi,rot:rot,sq:sq};
}
function camAt(t){
  var k=eio(seg(t,TL.zin[0],TL.zin[1]));
  var z=mix(1,P.z,k),cx=mix(SW/2,P.cx,k),cy=mix(SH/2,P.cy,k);
  if(t>=TL.pop){
    var f=flightAt(Math.min(t-TL.pop,FL.land+.2)),q=eio(seg(t,TL.pop,TL.pop+.6));
    z=mix(P.z,1.62,q);
    var hx=SW/2/z,hy=SH/2/z;
    cx=mix(cx,clamp(mix(P.cx,f.x,.55),hx,SW-hx),q);cy=mix(cy,clamp(f.y-20,hy,SH-hy),q);
    var o=eio(seg(t,TL.zout[0],TL.zout[1]));z=mix(z,1.3,o);cx=mix(cx,SW/2/1.3,o);cy=mix(cy,322,o);
  }
  return {z:z,cx:cx,cy:cy};
}
function toScreen(cam,x,y){return [SW/2+(x-cam.cx)*cam.z,SH/2+(y-cam.cy)*cam.z]}
function fingerAt(t,cam){
  var A=TL.rubA,B=TL.rubB,pos=null,a=0,pr=0;
  if(t>1.8&&t<2.62){
    a=seg(t,1.8,1.95)*(1-seg(t,2.47,2.62));
    var r=Math.sin((t-A[0])*24)*bump(t,A[0],A[1]);
    pos=toScreen(cam,P.bx+P.R*.5+r*6,P.ny-P.R*.4+r*3);pr=.4+.6*bump(t,1.92,2.48);
  }else if(t>3.28&&t<4.6){
    a=seg(t,3.28,3.42)*(1-seg(t,4.45,4.6));
    var r2=Math.sin((t-B[0])*28)*bump(t,B[0],B[1]);
    var lift=Math.max(bump(t,4.06,4.22),bump(t,4.29,4.45));
    pos=toScreen(cam,P.bx-P.R*.3+r2*7,P.ny+P.R*.3+r2*2-lift*6);
    pr=t<4.02?1:Math.max(bump(t,4.1,4.2),bump(t,4.33,4.43));
  }
  return pos?{x:pos[0],y:pos[1],a:a,p:pr}:null;
}
function banner(t){
  var a=eout(seg(t,TL.ban,TL.ban+.32))*(1-eio(seg(t,TL.banOut,TL.banOut+.4)));
  if(a<=0)return;
  var y=mix(-80,14,a)+(t<TL.ban+.6?4*Math.sin((t-TL.ban-.32)*16)*Math.exp(-(t-TL.ban-.32)*8)*(t>TL.ban+.32):0);
  ctx.save();ctx.shadowColor=COL.banSh;ctx.shadowBlur=26;ctx.shadowOffsetY=6;
  ctx.fillStyle=COL.ban;rr(14,y,SW-28,66,20);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=.8;rr(14,y,SW-28,66,20);ctx.stroke();
  ctx.fillStyle=COL.ink;rr(28,y+15,36,36,9);ctx.fill();
  txt('$',46,y+33.5,19,COL.bg,700,'center');
  txt('Payment failed',76,y+24,15.5,COL.ink,700);
  txt('Your Premium subscription has ended',76,y+44,14,COL.sub);
  txt('now',SW-30,y+24,13,COL.sub,400,'right');
}
function finger(f){
  if(!f||f.a<=0)return;ctx.globalAlpha=f.a;
  ctx.fillStyle=COL.touch;ctx.strokeStyle=COL.touchS;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(f.x,f.y,23-5*(f.p||0),0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=1;
}

function scene(st){
  M0();var cam=st.cam;
  ctx.save();ctx.translate(SW/2,SH/2);ctx.scale(cam.z,cam.z);ctx.translate(-cam.cx,-cam.cy);
  profile();
  if(st.fly){
    var f=st.fly,cs=Math.cos(f.phi);
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.scale(Math.max(.05,Math.abs(cs))*(1+f.sq),1-f.sq);
    ctx.shadowColor=COL.sh;ctx.shadowBlur=st.landed?3:9;ctx.shadowOffsetY=st.landed?1:5;
    face(P.R,cs>=0,.82+.18*Math.abs(cs));
    ctx.restore();
  }else sticker(P.bx,P.ny,P.R,st.peel,st.jit);
  ctx.restore();
  if(st.ban!=null)banner(st.ban);
  finger(st.finger);
  if(st.fade>0){M0();ctx.globalAlpha=st.fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
  ctx.setTransform(1,0,0,1,0,0);
}
function stateAt(t){
  var cam=camAt(t),st={cam:cam,ban:t,finger:fingerAt(t,cam),fade:Math.max(1-seg(t,0,.2),seg(t,TL.CYCLE-.5,TL.CYCLE))};
  if(t>=TL.pop){var s=t-TL.pop;st.fly=flightAt(s);st.landed=s>FL.land}
  else{
    st.peel=peelAt(t);
    if(t>TL.shiv[0]){var e=seg(t,TL.shiv[0],TL.pop);st.jit=[.8*e*Math.sin(t*83),.6*e*Math.sin(t*71+1),.06*e*Math.sin(t*97)]}
    // прижали: наклейка чуть вдавливается
  }
  return st;
}
function render(t){scene(stateAt(t))}

/* ─────────── звук: события [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  var E=[],A=TL.A,B=TL.B;
  E.push([A[0],'peel',A[1]-A[0]+.1,1],[B[0],'peel',B[1]-B[0]+.1,.8]);
  E.push([A[1]-.05,'flick',0],[B[1]-.05,'flick',1]);
  E.push([1.93,'press',.6],[3.4,'press',1]);
  E.push([TL.rubA[0],'rub',TL.rubA[1]-TL.rubA[0],24/Math.PI],[TL.rubB[0],'rub',TL.rubB[1]-TL.rubB[0],28/Math.PI]);
  E.push([TL.taps[0]+.03,'tap',0],[TL.taps[1]+.03,'tap',1]);
  E.push([TL.ban+.05,'fail']);
  E.push([TL.shiv[0],'shiver',TL.pop-TL.shiv[0]]);
  E.push([TL.pop,'ping']);
  // кувырки: шорох на каждом ребре
  var last=0;
  for(var s=0;s<FL.land;s+=1/240){var f=flightAt(s),k=Math.floor(f.phi/Math.PI+.5);if(k>last){E.push([TL.pop+s,'flutter',k]);last=k}}
  E.push([TL.pop+FL.land,'land']);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Наклейка сама отходит то одним, то другим уголком. Трёшь пальцем: прилипает обратно.
   Три раза пригладил, приходит «Payment failed». Не успел: отлетает сама. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function toLocal(e){var r=frameEl.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH}}
function liveRound(){
  LV.t=0;LV.last=nowS();LV.p=0;LV.ang=-.8;LV.wait=1.1;LV.saves=0;LV.peaked=false;LV.ban=-1;LV.pop=-1;LV.down=false;LV.m=null;LV.rubE=0;LV.end=-1;
}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={};liveRound()}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');if(LV&&LV.rubV)Sound.liveRub(0);LV=null}
frameEl.addEventListener('pointerdown',function(e){if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();LV.down=true;LV.m=toLocal(e);LV.pm=LV.m;try{frameEl.setPointerCapture(e.pointerId)}catch(_){}});
frameEl.addEventListener('pointermove',function(e){if(mode!=='live')return;LV.m=toLocal(e)});
frameEl.addEventListener('pointerup',function(){if(mode==='live')LV.down=false});
frameEl.addEventListener('pointercancel',function(){if(mode==='live')LV.down=false});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;V.t+=dt;var t=V.t;
  var cam={z:P.z,cx:P.cx,cy:P.cy},st={cam:cam,fade:1-seg(t,0,.25),ban:V.ban>=0?TL.ban+(t-V.ban):null};
  if(V.pop<0){
    // трение пальцем рядом с наклейкой прижимает её
    var rub=0;
    if(V.down&&V.m){
      var sp=toScreen(cam,P.bx,P.ny),dx=V.m.x-sp[0],dy=V.m.y-sp[1],near=Math.hypot(dx,dy)<P.R*P.z*2.4;
      var mv=V.pm?Math.hypot(V.m.x-V.pm.x,V.m.y-V.pm.y):0;V.pm=V.m;
      if(near){rub=Math.min(1,mv/dt/600);V.p=Math.max(0,V.p-dt*(.8+8*rub))}
    }
    V.rubE=mix(V.rubE,rub,.25);Sound.liveRub(V.rubE);
    if(V.ban<0){
      if(V.p<.02){V.wait-=dt;if(V.peaked){V.saves++;V.peaked=false;V.ang+=Math.PI*(.8+.4*Math.random());V.wait=.7+Math.random()*.6;
        if(V.saves>=3){V.ban=t;Sound.play([0,'fail'],-.05)}}}
      if(V.wait<=0&&!(V.down&&rub>.05)){var p0=V.p;V.p=Math.min(1,V.p+dt*.32);if(p0<.04&&V.p>=.04)Sound.play([0,'peel',.6,.8]);if(V.p>.3)V.peaked=true}
    }else if(t-V.ban>.6){V.p=Math.min(1,V.p+dt*.9)}
    var k=sm(V.p/.85),pe=V.ban>=0&&t-V.ban>.6?{ang:t*20,d:mix(1.3,.75,k),c:mix(1,.3,k)}:{ang:V.ang,d:mix(1.3,.25,k)+.05*Math.sin(t*13)*k,c:mix(1,-.55,k)+.14*Math.sin(t*9.5)*k};
    st.peel=pe;
    if(V.p>=1){V.pop=t;Sound.liveRub(0);Sound.play([0,'ping'])}
  }
  if(V.pop>=0){
    var s=t-V.pop,f=flightAt(s);st.fly=f;st.landed=s>FL.land;
    var q=eio(seg(s,0,.6));cam.z=mix(P.z,1.62,q);var hx=SW/2/cam.z,hy=SH/2/cam.z;
    cam.cx=mix(P.cx,clamp(mix(P.cx,f.x,.55),hx,SW-hx),q);cam.cy=mix(P.cy,clamp(f.y-20,hy,SH-hy),q);
    var kk=Math.floor(f.phi/Math.PI+.5);if(kk>(V.fk||0)){V.fk=kk;if(s<FL.land)Sound.play([0,'flutter',kk])}
    if(s>FL.land&&!V.landed){V.landed=true;Sound.play([0,'land'])}
    if(s>FL.land+1.6){st.fade=seg(s,FL.land+1.6,FL.land+2)}
    if(s>FL.land+2){V.fk=0;V.landed=false;liveRound()}
  }
  st.finger=V.down&&V.m?{x:V.m.x,y:V.m.y,a:1,p:.7}:null;
  scene(st);
}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%TL.CYCLE)+TL.CYCLE)%TL.CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%TL.CYCLE)+TL.CYCLE)%TL.CYCLE;
    render(u);
    if(!REC&&!paused)fireBetween(EVENTS,lastU,u,TL.CYCLE);
    lastU=u;
    if(REC&&now/1000>=TL.CYCLE-1e-6)window.__done=true;
  }else liveFrame();
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();liveStop();tryBtn.setAttribute('aria-pressed','false');paused=false;acc=0;lastU=0};
var tryBtn=document.getElementById('try');
tryBtn.onclick=function(){Sound.start();if(mode==='live'){liveStop();tryBtn.setAttribute('aria-pressed','false')}else{liveStart();tryBtn.setAttribute('aria-pressed','true')}};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){var on=!Sound.on;Sound.setOn(on);sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on))};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  COL=th==='dark'
    ?{dark:true,bg:'#000000',ink:'#e7e9ea',sub:'#71767b',hair:'#2f3336',line:'#536471',bar:'#202327',cover:'#2c3238',vblue:'#1d9bf0',
      av:'#2f3336',avInk:'#55595e',paper:'#dedbd3',paperEdge:'rgba(0,0,0,.25)',sh:'rgba(0,0,0,.85)',
      ban:'#1c1d1f',banSh:'rgba(0,0,0,.7)',touch:'rgba(255,255,255,.16)',touchS:'rgba(255,255,255,.32)'}
    :{dark:false,bg:'#ffffff',ink:'#0f1419',sub:'#536471',hair:'#eff3f4',line:'#cfd9de',bar:'#eceff1',cover:'#cfd9de',vblue:'#1d9bf0',
      av:'#e6ecf0',avInk:'#b8c3cb',paper:'#e9e5db',paperEdge:'rgba(0,0,0,.2)',sh:'rgba(15,20,25,.32)',
      ban:'#ffffff',banSh:'rgba(15,20,25,.18)',touch:'rgba(110,110,118,.3)',touchS:'rgba(0,0,0,.22)'};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused)render(uNow())}});

function fit(){
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?Math.min(w/SW,hh/SH):clamp(Math.min((hh-96)/SH,(w-32)/SW),.4,1.6);
  frameEl.style.width=SW*S+'px';frameEl.style.height=SH*S+'px';
  K=Math.min(3.6,Math.max(1,S*(window.devicePixelRatio||1)));
  cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
}

window.__seek=function(t){mode='auto';paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  layout();flightInit();EVENTS=buildEvents();
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
