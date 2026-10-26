/* ─────────── Radius ───────────
   Редактор, во фрейме Icon квадратная иконка «Aa», выделена. На холст падают пины комментариев Dana.
   «make it friendlier»: курсор тянет ручку скругления 0 → 20. «friendlier»: 20 → 44. «more»: 44 → 72, квадрат стал кругом.
   Ручка упирается, курсор тянет ещё, ручка срывается резинкой и раскручивает круг. Он катится вправо, фрейм обрезает его,
   а синяя рамка выделения крутится дальше одна и уходит с холста. Поле X в инспекторе продолжает считать.
   На пустой фрейм прилетает «perfect», следом «actually the first one». ⌘Z, ⌘Z, ⌘Z: 44, 20, 0, квадрат на месте.
   Все пины разом закрываются, и петля начинается заново. Поле 432 × 540 точек, кадр рисуется из одного t. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');
if(QS.get('theme'))document.documentElement.setAttribute('data-theme',QS.get('theme'));

var SW=432,SH=540,S=1,K=2,COL;
var frameEl=document.getElementById('frame'),cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var HEAD='"Inter Tight",-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif';
var BODY='"Geist",-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif';

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function backOut(p,c){p=c01(p);c=c||1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}

/* ─────────── геометрия ─────────── */
var ART={x:92,y:104,w:248,h:248};            // фрейм Icon
var SZ=144,RMAX=72,C0={x:216,y:228};         // иконка и её центр
var PANEL={x:12,y:396,w:408,h:132};
var H0=14,HK=.5;                             // ручка скругления: отступ от угла 14 + r/2
var V=330,KR=.24;                            // скорость качения и разгон после срыва

/* ─────────── расписание ─────────── */
var DR=[
  {press:1.0, d0:1.05,d1:1.55,rel:1.62,r0:0, r1:20},
  {press:2.65,d0:2.7, d1:3.25,rel:3.32,r0:20,r1:44},
  {press:4.3, d0:4.35,d1:5.0, rel:5.26,r0:44,r1:72}
];
var T={over:5.22,slip:5.26,roll:5.3,undo:[8.7,9.05,9.4],res:9.85,end:10.7};
var CYCLE=T.end;
var PINS=[
  {t:.25, s:'make it friendlier',x:16, y:16},
  {t:2.0, s:'friendlier',        r:416,y:16},
  {t:3.7, s:'more',              x:16, y:150},
  {t:7.0, s:'perfect',           r:416,y:236},
  {t:7.95,s:'actually the first one',x:16,y:338}
];

function radiusAt(t){
  var U=T.undo;
  if(t>=U[2])return 0;if(t>=U[1])return 20;if(t>=U[0])return 44;
  for(var i=DR.length-1;i>=0;i--){var d=DR[i];if(t>=d.d0)return mix(d.r0,d.r1,eio(seg(t,d.d0,d.d1)))}
  return 0;
}
// сколько проехал после срыва
function rollAt(t){if(t<T.roll||t>=T.undo[0])return 0;var u=t-T.roll;return V*(u-KR*(1-Math.exp(-u/KR)))}
function handleInset(r){return H0+HK*r}
function tForRoll(x){var a=T.roll,b=T.undo[0];for(var i=0;i<40;i++){var m=(a+b)/2;if(rollAt(m)<x)a=m;else b=m}return(a+b)/2}
function tForRadius(d,r){var a=d.d0,b=d.d1;for(var i=0;i<40;i++){var m=(a+b)/2;if(radiusAt(m)<r)a=m;else b=m}return(a+b)/2}
function dragAt(t){for(var i=0;i<DR.length;i++)if(t>=DR[i].press&&t<DR[i].rel)return DR[i];return null}

/* ─────────── курсор ─────────── */
var CP0={x:262,y:252},OFF={x:22,y:26};
function H(r,o){var s=handleInset(r)+(o||0);return{x:C0.x-SZ/2+s,y:C0.y-SZ/2+s}}
function add(p,q){return{x:p.x+q.x,y:p.y+q.y}}
// ключевые точки между перетаскиваниями, внутри перетаскивания курсор держит ручку
var KEYS=[[0,CP0],[.55,CP0],[.95,H(0)],[1.62,H(20)],[1.75,H(20)],[2.1,add(H(20),OFF)],[2.35,add(H(20),OFF)],[2.6,H(20)],
  [3.32,H(44)],[3.45,H(44)],[3.8,add(H(44),OFF)],[4.0,add(H(44),OFF)],[4.25,H(44)],[5.26,H(72,12)],[5.6,H(72,12)],[6.6,CP0]];
function cursorAt(t){
  var p,d=null;
  for(var i=0;i<DR.length;i++)if(t>=DR[i].d0&&t<DR[i].rel)d=DR[i];
  if(d){p=t<d.d1?H(radiusAt(t)):H(72,12*eout(seg(t,d.d1,T.over)))}
  else{
    p=KEYS[KEYS.length-1][1];
    for(var k=0;k<KEYS.length-1;k++){var A=KEYS[k],B=KEYS[k+1];if(t>=A[0]&&t<B[0]){var e=eio(seg(t,A[0],B[0]));p={x:mix(A[1].x,B[1].x,e),y:mix(A[1].y,B[1].y,e)};break}}
    if(t<DR[0].d0&&t>=.95)p=H(0);
    for(var j=0;j<DR.length;j++)if(t>=DR[j].press-.05&&t<DR[j].d0)p=H(DR[j].r0);
  }
  var press=0;
  DR.forEach(function(d){press=Math.max(press,seg(t,d.press-.04,d.press)*(1-seg(t,d.rel,d.rel+.06)))});
  return{x:p.x,y:p.y,press:press};
}

/* ─────────── рисование ─────────── */
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)))}
function setFont(sz,wt,head){ctx.font=(wt||400)+' '+sz+'px '+(head?HEAD:BODY);if('letterSpacing'in ctx)ctx.letterSpacing=(head?.005*sz:0)+'px'}
function tw(s,sz,wt,head){setFont(sz,wt,head);return ctx.measureText(s).width}
function txt(s,x,y,sz,col,wt,al,head){setFont(sz,wt,head);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function cursorShape(x,y,sc){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,15.5);ctx.lineTo(3.8,12);ctx.lineTo(6.4,17.6);ctx.lineTo(8.9,16.5);ctx.lineTo(6.4,11);ctx.lineTo(11.4,11);ctx.closePath();
  ctx.lineJoin='round';ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.fillStyle='#000';ctx.fill();ctx.restore();
}
function pill(s,cx,cy,sz){
  var w=tw(s,sz,500)+12,h=sz+8;
  ctx.fillStyle=COL.blue;rr(cx-w/2,cy-h/2,w,h,4);ctx.fill();
  txt(s,cx,cy+.5,sz,'#fff',500,'center');
}

// барабан: разряды перекатываются справа налево, новая цифра приходит снизу
function odo(v,x,y,sz,col,pre,post){
  setFont(sz,400);
  var dw=ctx.measureText('0').width,lh=sz*1.4,n=Math.max(1,String(Math.floor(v)).length),cx=x;
  if(pre){txt(pre,cx,y,sz,col);cx+=tw(pre,sz,400)}
  var lead=Math.floor(v+1)>=Math.pow(10,n)&&v>=9?1:0,places=n+lead;
  ctx.save();ctx.beginPath();ctx.rect(x-2,y-sz*.8,200,sz*1.6);ctx.clip();
  for(var i=places-1;i>=0;i--){
    var p=Math.pow(10,i),d=Math.floor(v/p)%10,low=v-Math.floor(v/p)*p,f=eio(seg(i===0?v-Math.floor(v):Math.max(0,low-(p-1)),.55,1));
    var px=cx+(places-1-i)*dw;
    if(!(lead&&i===places-1))txt(String(d),px+dw/2,y-f*lh,sz,col,400,'center');
    if(f>0)txt(String((d+1)%10),px+dw/2,y+(1-f)*lh,sz,col,400,'center');
  }
  ctx.restore();
  if(post)txt(post,cx+places*dw+1,y,sz,col);
}

function shape(cx,cy,r,ang,sx,sy){
  ctx.save();ctx.translate(cx,cy);ctx.scale(sx,sy);ctx.rotate(ang);
  ctx.fillStyle=COL.shape;rr(-SZ/2,-SZ/2,SZ,SZ,r);ctx.fill();
  txt('Aa',0,3,54,COL.glyph,600,'center',true);
  ctx.restore();
}

function selection(cx,cy,ang,r,hnd,hov,solo){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);
  ctx.strokeStyle=COL.blue;ctx.lineWidth=1;ctx.strokeRect(-SZ/2,-SZ/2,SZ,SZ);
  ctx.fillStyle=COL.handle;
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c){
    ctx.fillRect(c[0]*SZ/2-3.5,c[1]*SZ/2-3.5,7,7);ctx.strokeRect(c[0]*SZ/2-3.5,c[1]*SZ/2-3.5,7,7);
  });
  if(hnd>0){
    ctx.globalAlpha=hnd;var s=handleInset(r);
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c,i){
      var hx=c[0]*(SZ/2-s),hy=c[1]*(SZ/2-s),hr=4+(i===0?1.2*hov:0);
      ctx.globalAlpha=hnd*(i===0?1:1-solo);if(ctx.globalAlpha<=0)return;
      ctx.beginPath();ctx.arc(hx,hy,hr,0,7);ctx.fillStyle=COL.handle;ctx.fill();ctx.stroke();
    });
    ctx.globalAlpha=1;
  }
  ctx.restore();
  // размер под рамкой, не крутится
  var ext=SZ/2*(Math.abs(Math.cos(ang))+Math.abs(Math.sin(ang)));
  pill('144 × 144',cx,cy+ext+14,10.5);
}

// пин комментария: аватар с острым нижним левым углом и пузырь с текстом в одну строку
function pinW(s){return 34+tw(s,13,400)+24}
function pins(t){
  PINS.forEach(function(P,i){
    var r0=T.res+i*.07,inn=seg(t,P.t,P.t+.1),s=backOut(seg(t,P.t,P.t+.34),2.2)*(1-eio(seg(t,r0,r0+.2)));
    if(t<P.t||s<=0)return;
    var w=pinW(P.s),x=P.r!=null?P.r-w:P.x,y=P.y,ax=x,ay=y+28,bw=mix(30,w-34,eout(seg(t,P.t+.06,P.t+.34)));
    ctx.save();ctx.globalAlpha=inn;ctx.translate(ax,ay);ctx.scale(s,s);ctx.translate(-ax,-ay);
    ctx.fillStyle=COL.card;rr(x+34,y+1,bw,28,14);ctx.fill();
    ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(x+34.5,y+1.5,bw-1,27,13.5);ctx.stroke();
    ctx.save();ctx.beginPath();ctx.rect(x+35,y,bw-2,30);ctx.clip();
    ctx.globalAlpha=inn*seg(t,P.t+.12,P.t+.3);txt(P.s,x+46,y+15.5,13,COL.ink);
    ctx.restore();
    ctx.fillStyle=COL.avatar;ctx.beginPath();ctx.roundRect(x,y,30,30,[15,15,15,3]);ctx.fill();
    txt('D',x+15,y+15.5,13,COL.avatarInk,500,'center');
    ctx.restore();
  });
}

function icon(kind,x,y){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=COL.sub;ctx.lineWidth=1.3;ctx.lineCap='round';ctx.lineJoin='round';
  if(kind==='rot'){
    ctx.beginPath();ctx.arc(0,0,4.6,-Math.PI*.15,Math.PI*1.35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(3.2,-5.6);ctx.lineTo(4.5,-1.6);ctx.lineTo(.6,-2.4);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(-5,5);ctx.lineTo(-5,1);ctx.arcTo(-5,-5,1,-5,6);ctx.lineTo(5,-5);ctx.stroke();
  }
  ctx.restore();
}

function field(i,row,label,kind,draw,active){
  var w=124,h=32,x=PANEL.x+12+i*(w+8),y=PANEL.y+44+row*(h+8);
  ctx.fillStyle=COL.field;rr(x,y,w,h,7);ctx.fill();
  if(active>0){ctx.globalAlpha=active;ctx.strokeStyle=COL.blue;ctx.lineWidth=1;rr(x+.5,y+.5,w-1,h-1,6.5);ctx.stroke();ctx.globalAlpha=1}
  if(kind)icon(kind,x+15,y+h/2);else txt(label,x+15,y+h/2+.5,12,COL.sub,400,'center');
  draw(x+30,y+h/2+.5);
}

function panel(t,r,dx,ang){
  var P=PANEL;
  ctx.fillStyle=COL.card;rr(P.x,P.y,P.w,P.h,14);ctx.fill();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(P.x+.5,P.y+.5,P.w-1,P.h-1,13.5);ctx.stroke();
  txt('Rectangle',P.x+16,P.y+24,14,COL.ink,600,'left',true);
  txt('Icon',P.x+P.w-16,P.y+24,12,COL.sub,400,'right');
  var deg=Math.abs(ang)*180/Math.PI%360,act=0;
  DR.forEach(function(d){act=Math.max(act,seg(t,d.d0-.06,d.d0)*(1-seg(t,d.rel,d.rel+.2)))});
  field(0,0,'X',null,function(x,y){odo(52+dx,x,y,13,COL.ink)});
  field(1,0,'Y',null,function(x,y){txt('52',x,y,13,COL.ink)});
  field(2,0,'',  'rot',function(x,y){odo(deg,x,y,13,COL.ink,deg>.5?'−':'','°')});
  field(0,1,'W',null,function(x,y){txt('144',x,y,13,COL.ink)});
  field(1,1,'H',null,function(x,y){txt('144',x,y,13,COL.ink)});
  field(2,1,'',  'rad',function(x,y){odo(r,x,y,13,COL.ink)},act);
}

// ⌘Z справа под фреймом, утапливается на каждое нажатие
function keycap(t){
  var U=T.undo,a=seg(t,U[0]-.18,U[0]-.1)*(1-seg(t,U[2]+.42,U[2]+.56));
  if(a<=0)return;
  var dip=1;U.forEach(function(u){dip-=.07*Math.sin(Math.PI*seg(t,u-.04,u+.06))});
  var w=60,h=30,cx=374,cy=374;
  ctx.save();ctx.globalAlpha=a;ctx.translate(cx,cy);ctx.scale(dip,dip);
  ctx.fillStyle=COL.key;rr(-w/2,-h/2,w,h,8);ctx.fill();
  txt('⌘Z',0,1,14,COL.keyInk,500,'center');
  ctx.restore();
}

function scene(t){
  ctx.setTransform(K,0,0,K,0,0);
  ctx.fillStyle=COL.canvas;ctx.fillRect(0,0,SW,SH);

  txt('Icon',ART.x,ART.y-12,12,COL.sub);
  ctx.fillStyle=COL.art;ctx.fillRect(ART.x,ART.y,ART.w,ART.h);

  var rolling=t>=T.slip&&t<T.undo[0];
  var r=rolling?RMAX:radiusAt(t),dx=rollAt(t),ang=dx/RMAX;
  // срыв ручки: короткий шлепок по горизонтали
  var q=rolling?.06*wob(t-T.slip,9,3.2):0,pop=1;
  T.undo.forEach(function(u){if(t>=u)pop=mix(.95,1,backOut(seg(t,u,u+.24),2.4))});
  var cx=C0.x+dx,cy=C0.y;

  ctx.save();ctx.beginPath();ctx.rect(ART.x,ART.y,ART.w,ART.h);ctx.clip();
  shape(cx,cy,r,ang,(1-q)*pop,(1+q)*pop);
  ctx.restore();

  var cu=cursorAt(t),h0=H(r),hd=Math.hypot(cu.x-h0.x,cu.y-h0.y);
  var hov=rolling?0:c01(1-hd/10),solo=0;
  DR.forEach(function(d){solo=Math.max(solo,seg(t,d.press,d.press+.12)*(1-seg(t,d.rel,d.rel+.15)))});
  if(cx-110<SW)selection(cx,cy,ang,r,rolling?0:1,hov,solo);
  // значение скругления над левым верхним углом рамки
  var pa=0;DR.forEach(function(d){pa=Math.max(pa,seg(t,d.d0-.04,d.d0+.04)*(1-seg(t,d.rel,d.rel+.06)))});
  if(pa>0){ctx.globalAlpha=pa;var lb='Radius '+Math.round(r);setFont(11,500);pill(lb,C0.x-SZ/2+(ctx.measureText(lb).width+12)/2,C0.y-SZ/2-14,11);ctx.globalAlpha=1}

  pins(t);
  panel(t,r,dx,ang);
  keycap(t);

  cursorShape(cu.x,cu.y,1.25*(1-.06*cu.press));
}
function render(t){scene(t)}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(){
  var E=[];
  PINS.forEach(function(P,i){E.push([P.t,'pin',i]);E.push([T.res+i*.07,'pop',i])});
  DR.forEach(function(d,i){
    E.push([d.press-.08,'hover'],[d.press,'press'],[d.d0,'stretch',d.d1-d.d0,[d.r0/RMAX,d.r1/RMAX]]);
    for(var v=d.r0+6;v<d.r1;v+=6)E.push([tForRadius(d,v),'tick',v/RMAX]);
    if(i<2)E.push([d.rel,'release']);
  });
  E.push([DR[2].d1,'max'],[DR[2].d1,'strain',T.slip-DR[2].d1]);
  E.push([T.slip,'slip'],[T.roll,'roll',T.undo[0]-T.roll]);
  E.push([tForRoll(ART.x+ART.w-C0.x+RMAX),'gone']);
  E.push([T.undo[0]-.12,'key',0]);
  T.undo.forEach(function(u,i){E.push([u-.02,'key',1],[u,'snap',i])});
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EVENTS=buildEvents();
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Всё идёт само, но тянуть и отменять даёт зритель: время стоит перед захватом ручки и перед ⌘Z. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={t:0,last:nowS(),lastT:0,gate:0}}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
var GATES=[DR[0].press-.02,DR[1].press-.02,DR[2].press-.02,T.undo[0]-.2];
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var L=LV;if(L.gate<GATES.length&&L.t>=GATES[L.gate]-.7)L.gate++;
});
function liveFrame(){
  var L=LV,n=nowS(),dt=Math.min(.05,n-L.last);L.last=n;
  var lim=L.gate<GATES.length?GATES[L.gate]:Infinity;L.t=Math.min(lim,L.t+dt);
  var t=L.t;fireBetween(EVENTS,L.lastT,t);L.lastT=t;
  if(t>=CYCLE){L.t=0;L.lastT=0;L.gate=0;t=0}
  render(t);
}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(u);
    if(!REC&&!paused)fireBetween(EVENTS,lastU,u,CYCLE);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
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
    ?{canvas:'#1b1b1b',art:'#2a2a2a',shape:'#efeeea',glyph:'#1b1b1b',ink:'#f1f1ef',sub:'#8a8a8d',line:'#303030',card:'#232323',field:'#2d2d2d',
      blue:'#4c8dff',handle:'#1b1b1b',avatar:'#4a4138',avatarInk:'#efe6da',key:'#efeeea',keyInk:'#161616'}
    :{canvas:'#efefec',art:'#ffffff',shape:'#161616',glyph:'#ffffff',ink:'#161616',sub:'#86868a',line:'#e3e3df',card:'#ffffff',field:'#f3f3f0',
      blue:'#1a6dff',handle:'#ffffff',avatar:'#e8ddcf',avatarInk:'#5a4a38',key:'#161616',keyInk:'#ffffff'};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused)render(uNow())}});

function fit(){
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?Math.min(w/SW,hh/SH):clamp(Math.min((hh-96)/SH,(w-32)/SW),.4,1.6);
  frameEl.style.width=SW*S+'px';frameEl.style.height=SH*S+'px';
  K=Math.min(3.2,Math.max(1,S*(window.devicePixelRatio||1)));
  cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
}

window.__seek=function(t){mode='auto';paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
Promise.all([document.fonts.load('600 20px "Inter Tight"'),document.fonts.load('400 20px "Geist"'),document.fonts.load('500 20px "Geist"')]).then(boot,boot);
