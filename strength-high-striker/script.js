/* ─────────── Strength ───────────
   Форма Create password. Индикатор силы пароля из четырёх сегментов стоит вертикально,
   как силомер на ярмарке, наверху колокол. Молот рядом: на ручке вместо головы кнопка Continue.
   Пишу «password1», жму Continue: замах, удар по рычагу, шайба еле отрывается до Weak, поле трясёт.
   Стираю, пишу «correct horse battery staple», тот же удар: шайба летит через Fair и Good,
   звонит в колокол, Strong. Потом форма просит Confirm password, поле снова пустое.
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
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))}
// затухающий звон после удара, старт с 0, частота в Гц
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}
function hex(c){var n=parseInt(c.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function mixc(a,b,t){var A=hex(a),B=hex(b);t=c01(t);return'rgb('+Math.round(mix(A[0],B[0],t))+','+Math.round(mix(A[1],B[1],t))+','+Math.round(mix(A[2],B[2],t))+')'}
function rgba(c,a){var n=hex(c);return'rgba('+n[0]+','+n[1]+','+n[2]+','+a+')'}

/* ─────────── текст и расписание ─────────── */
var PW1='password1',PW2='correct horse battery staple';
var T={k1:.2,k1e:.98,click1:1.22,w1:1.3,s1:1.52,hit1:1.68,ret1:1.86,
       sel:2.5,del:2.7,k2:2.86,k2e:3.78,click2:4.0,w2:4.08,s2:4.3,hit2:4.46,ret2:4.64,
       conf:6.45,end:8.3};
var CYCLE=T.end;

/* ─────────── геометрия ─────────── */
var CARD={x:44,y:34,w:344,h:472,r:22};
var FLD={x:72,y:110,w:288,h:40};
var TX=180,BOT=460,SEG=55,COLW=18,PKW=38,PKH=15;
var REST=BOT-PKH/2-1,BELL={x:TX,y:192},CE=REST-PKH/2-(BELL.y+38);   // шайба в покое и её путь до обода колокола
var G={x:340,y:498},LEN=104,HW=86,HH=30,BACK=-1.0,AH=null;
var PIV={x:TX+20,y:468.5},PADL=78;
var GR=2300,V1=371,V2=1238;
var LN=['Weak','Fair','Good','Strong'];

/* ─────────── шайба: честная баллистика, отскоки от колокола и от низа ─────────── */
function simulate(v0){
  var dt=1/480,N=480*4,h=new Float32Array(N+1),mx=new Float32Array(N+1),ev=[],y=0,v=v0,m=0;
  for(var i=1;i<=N;i++){
    v-=GR*dt;y+=v*dt;
    if(y>=CE){y=CE;if(v>0){ev.push([i*dt,'ceil',v]);v=-v*.2}}
    if(y<=0){y=0;if(v<0){var sp=-v;if(sp>60){ev.push([i*dt,'floor',sp]);v=sp*.32}else v=0}}
    h[i]=y;if(y>m)m=y;mx[i]=m;
  }
  return{h:h,mx:mx,ev:ev,dt:dt};
}
function look(run,d){
  if(d<=0)return{h:0,mx:0};
  var f=d/run.dt,i=Math.floor(f),n=run.h.length-1;
  if(i>=n)return{h:run.h[n],mx:run.mx[n]};
  var a=f-i;return{h:mix(run.h[i],run.h[i+1],a),mx:mix(run.mx[i],run.mx[i+1],a)};
}
var RUN1=simulate(V1),RUN2=simulate(V2);
var DING=T.hit2+RUN2.ev.filter(function(e){return e[1]==='ceil'})[0][0];
// моменты, когда заливка проходит границы сегментов (для тиков в звуке)
var CROSS=[];
(function(){for(var k=1;k<4;k++)for(var i=0;i<RUN2.h.length;i++)if(RUN2.h[i]+PKH/2>=k*SEG){CROSS.push(i*RUN2.dt);break}})();

/* ─────────── молот ─────────── */
function headEnds(a){
  var hx=G.x+LEN*Math.cos(a),hy=G.y+LEN*Math.sin(a),r=a+Math.PI/2,c=Math.cos(r),s=Math.sin(r);
  return[[hx+HW/2*c,hy+HW/2*s],[hx-HW/2*c,hy-HW/2*s]];
}
(function(){for(var a=-Math.PI/2;a>-Math.PI;a-=.001){var e=headEnds(a);if(Math.max(e[0][1],e[1][1])>=463){AH=a;break}}})();
function malletAt(t){
  var R=-Math.PI/2;
  function sw(w,s,h,r){
    if(t<w||t>r+.7)return null;
    if(t<s)return mix(R,BACK,eout(seg(t,w,s)));
    if(t<h)return mix(BACK,AH,Math.pow(seg(t,s,h),2.4));
    if(t<r)return AH+.05*bump(t,h,h+.15);
    var p=seg(t,r,r+.5);return mix(AH,R,eio(p))+.05*wob(t-r-.5,7,2.2);
  }
  var a=sw(T.w2,T.s2,T.hit2,T.ret2);
  if(a==null)a=sw(T.w1,T.s1,T.hit1,T.ret1);
  if(a==null)a=R;
  var sq=0;[T.hit1,T.hit2].forEach(function(h){var d=t-h;if(d>=0&&d<.3)sq+=.1*Math.exp(-d*22)});
  var press=bump(t,T.click1-.05,T.click1+.08)+bump(t,T.click2-.05,T.click2+.08);
  return{a:a,sq:sq,press:press};
}
function leverAt(t){
  var th=0;[T.hit1,T.hit2].forEach(function(h){var d=t-h;if(d>=0&&d<.6)th+=.075*Math.exp(-d*13)*Math.cos(d*34)});
  return th;
}
function joltAt(t){return 1.3*wob(t-T.hit1,20,11)+1.8*wob(t-T.hit2,20,11)+2.2*wob(t-DING,16,13)}

/* ─────────── курсор ─────────── */
function cursorAt(t){
  var rx=370,ry=432,hx=G.x+4,hy=G.y-LEN+6,x=rx,y=ry,s;
  if(t<T.click1-.3){x=rx;y=ry}
  else if(t<T.click1-.06){s=eio(seg(t,T.click1-.3,T.click1-.06));x=mix(rx,hx,s);y=mix(ry,hy,s)}
  else if(t<DING+.7){x=hx;y=hy}
  else{s=eio(seg(t,DING+.7,DING+1.1));x=mix(hx,rx,s);y=mix(hy,ry,s)}
  var press=bump(t,T.click1-.05,T.click1+.08)+bump(t,T.click2-.05,T.click2+.08);
  return{x:x,y:y,press:press};
}

/* ─────────── состояние кадра из t ─────────── */
function stateAt(t){
  var o={};
  // шайба и заливка шкалы
  o.h=0;o.fill=0;o.trail=null;
  if(t>=T.hit2){
    var a=look(RUN2,t-T.hit2);o.h=a.h;o.fill=(a.mx+PKH/2)*(1-eio(seg(t,T.conf+.05,T.conf+.55)));
    var d=t-T.hit2;if(d<.5)o.trail=[look(RUN2,d-.012).h,look(RUN2,d-.024).h,look(RUN2,d-.036).h];
  }else if(t>=T.hit1){
    var b=look(RUN1,t-T.hit1);o.h=b.h;o.fill=(b.mx+PKH/2)*(1-eio(seg(t,T.del,T.del+.35)));
  }
  o.lvl=o.fill<=9?0:Math.min(4,Math.ceil(o.fill/SEG));
  // поле
  var s='',sel=false,tx=0,ta=1,typing=false;
  if(t<T.del){s=PW1.slice(0,Math.ceil(PW1.length*seg(t,T.k1,T.k1e)));sel=t>=T.sel;typing=t>T.k1&&t<T.k1e+.06}
  else if(t>=T.k2){
    s=PW2.slice(0,Math.ceil(PW2.length*seg(t,T.k2,T.k2e)));typing=t<T.k2e+.06;
    if(t>=T.conf){var q=eio(seg(t,T.conf,T.conf+.3));tx=-26*q;ta=1-q;if(q>=1)s=''}
  }
  o.pw=s;o.sel=sel;o.ptx=tx;o.pta=ta;o.caret=!sel&&(typing||((t*1.8)%1)<.55);
  o.weak=seg(t,T.hit1+.14,T.hit1+.26)*(1-seg(t,T.sel-.05,T.sel+.1));
  o.strong=seg(t,DING+.04,DING+.2)*(1-seg(t,T.conf,T.conf+.2));
  var ds=t-T.hit1-.14;o.shake=ds>0&&ds<.6?7*Math.sin(ds*56)*Math.exp(-ds*8):0;
  o.conf=eio(seg(t,T.conf,T.conf+.4));
  o.bell=.36*wob(t-DING,2.3,2.6);
  o.ring=t-DING;
  o.bellG=seg(t,DING,DING+.08)*(1-seg(t,T.conf,T.conf+.4));
  o.mallet=malletAt(t);o.lever=leverAt(t);o.jolt=joltAt(t);o.cursor=cursorAt(t);
  o.fade=Math.max(1-seg(t,0,.16),seg(t,CYCLE-.4,CYCLE));
  return o;
}

/* ─────────── рисование ─────────── */
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)))}
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(-.012*sz)+'px'}
function tw(s,sz,wt){setFont(sz,wt);return ctx.measureText(s).width}
function txt(s,x,y,sz,col,wt,al){setFont(sz,wt);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
function check(x,y,r,col,lw){
  ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(x-.42*r,y+.02*r);ctx.lineTo(x-.12*r,y+.32*r);ctx.lineTo(x+.44*r,y-.3*r);ctx.stroke();
}
function cursorShape(x,y,sc){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,15.5);ctx.lineTo(3.8,12);ctx.lineTo(6.4,17.6);ctx.lineTo(8.9,16.5);ctx.lineTo(6.4,11);ctx.lineTo(11.4,11);ctx.closePath();
  ctx.lineJoin='round';ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.fillStyle='#000';ctx.fill();ctx.restore();
}
function levelCol(l){return l<=1?COL.red:l===2?COL.amber:COL.green}

function scene(t,o){
  M0();
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  ctx.save();ctx.translate(0,o.jolt);

  // карточка
  ctx.save();ctx.shadowColor=COL.shadow;ctx.shadowBlur=40;ctx.shadowOffsetY=12;
  ctx.fillStyle=COL.card;rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(CARD.x+.5,CARD.y+.5,CARD.w-1,CARD.h-1,CARD.r-.5);ctx.stroke();

  // заголовок: Create → Confirm
  var c=o.conf;
  ctx.save();ctx.beginPath();ctx.rect(CARD.x,54,CARD.w,52);ctx.clip();
  if(c<1){ctx.globalAlpha=1-c;txt('Create password',72,72-12*c,20,COL.ink,700);txt('Use 8 or more characters',72,94-12*c,13.5,COL.sub)}
  if(c>0){ctx.globalAlpha=c;txt('Confirm password',72,72+12*(1-c),20,COL.ink,700);txt('Re-enter your password',72,94+12*(1-c),13.5,COL.sub)}
  ctx.restore();ctx.globalAlpha=1;

  // поле
  var fx=FLD.x+o.shake,bc=COL.blue;
  if(o.weak>0)bc=mixc(COL.blue,COL.red,o.weak);
  if(o.strong>0)bc=mixc(COL.blue,COL.green,o.strong);
  ctx.fillStyle=COL.field;rr(fx,FLD.y,FLD.w,FLD.h,11);ctx.fill();
  ctx.strokeStyle=bc;ctx.globalAlpha=COL.halo;ctx.lineWidth=5;rr(fx-2.5,FLD.y-2.5,FLD.w+5,FLD.h+5,13.5);ctx.stroke();
  ctx.globalAlpha=1;ctx.lineWidth=1.5;rr(fx,FLD.y,FLD.w,FLD.h,11);ctx.stroke();
  var pw=o.pw,w=tw(pw,16),ty=FLD.y+FLD.h/2+.5,tx0=fx+15+o.ptx;
  ctx.save();ctx.beginPath();ctx.rect(fx+8,FLD.y+2,FLD.w-46,FLD.h-4);ctx.clip();
  if(o.sel){ctx.fillStyle=COL.selBg;rr(tx0-1.5,ty-11,w+3,22,3);ctx.fill()}
  ctx.globalAlpha=o.pta;txt(pw,tx0,ty,16,COL.ink);ctx.globalAlpha=1;
  if(o.caret){ctx.fillStyle=COL.blue;rr(tx0+(o.pta<1?0:w)+1.5,ty-10,2,20,1);ctx.fill()}
  ctx.restore();
  // глаз: пароль показан
  var ex=fx+FLD.w-22;
  ctx.strokeStyle=COL.sub;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ex-9,ty);ctx.quadraticCurveTo(ex,ty-9.5,ex+9,ty);ctx.quadraticCurveTo(ex,ty+9.5,ex-9,ty);ctx.stroke();
  dot(ex,ty,2.8,COL.sub);

  // подпись под полем
  var my=FLD.y+FLD.h+20;
  if(o.weak>0){
    ctx.globalAlpha=o.weak;dot(77,my,4,COL.red);
    txt('Weak',87,my,13.5,COL.red,600);txt('· too easy to guess',87+tw('Weak ',13.5,600),my,13.5,COL.sub);ctx.globalAlpha=1;
  }
  if(o.strong>0){
    ctx.globalAlpha=o.strong;dot(78,my,7,COL.green);check(78,my,9,'#fff',1.8);
    txt('Strong',91,my,13.5,COL.green,600);txt('· you’re good to go',91+tw('Strong ',13.5,600),my,13.5,COL.sub);ctx.globalAlpha=1;
  }

  // шкала: обычный индикатор из четырёх сегментов, поставленный вертикально
  var lc=levelCol(o.lvl);
  for(var i=0;i<4;i++){
    var y2=BOT-i*SEG-2.5,y1=BOT-(i+1)*SEG+2.5,on=o.lvl>i;
    ctx.fillStyle=COL.ghost;rr(TX-COLW/2,y1,COLW,y2-y1,5);ctx.fill();
    txt(LN[i],TX-COLW/2-14,(y1+y2)/2,13.5,on?lc:COL.sub,on?650:400,'right');
  }
  if(o.fill>0){
    ctx.save();ctx.beginPath();
    for(var j=0;j<4;j++){var b2=BOT-j*SEG-2.5,b1=BOT-(j+1)*SEG+2.5;ctx.roundRect(TX-COLW/2,b1,COLW,b2-b1,5)}
    ctx.clip();ctx.fillStyle=lc;ctx.fillRect(TX-COLW/2,BOT-o.fill,COLW,o.fill);ctx.restore();
  }

  // колокол: висит над шкалой, звенит качанием и волнами
  if(o.ring>0&&o.ring<.8){
    ctx.strokeStyle=COL.green;ctx.lineWidth=2;ctx.lineCap='round';
    for(var k=0;k<2;k++){var d=o.ring-k*.13;if(d<=0)continue;var r=34+d*70;ctx.globalAlpha=c01(1-d/.6);
      ctx.beginPath();ctx.arc(BELL.x,BELL.y+22,r,-.42,.42);ctx.stroke();ctx.beginPath();ctx.arc(BELL.x,BELL.y+22,r,Math.PI-.42,Math.PI+.42);ctx.stroke()}
    ctx.globalAlpha=1;
  }
  var bcol=mixc(COL.steel,COL.green,o.bellG);
  ctx.save();ctx.translate(BELL.x,BELL.y);ctx.rotate(o.bell);ctx.fillStyle=bcol;
  dot(0,3,4.5,bcol);
  ctx.beginPath();ctx.moveTo(-23,33);ctx.bezierCurveTo(-23,16,-14,7,0,7);ctx.bezierCurveTo(14,7,23,16,23,33);ctx.closePath();ctx.fill();
  rr(-28,31,56,7,3.5);ctx.fill();
  ctx.restore();

  // шайба со следом на взлёте
  if(o.trail){for(var m=0;m<3;m++){ctx.globalAlpha=.16-.045*m;ctx.fillStyle=COL.ink;rr(TX-PKW/2,REST-o.trail[m]-PKH/2,PKW,PKH,PKH/2);ctx.fill()}ctx.globalAlpha=1}
  ctx.fillStyle=COL.ink;rr(TX-PKW/2,REST-o.h-PKH/2,PKW,PKH,PKH/2);ctx.fill();

  // основание, рычаг, земля
  ctx.fillStyle=COL.line;ctx.fillRect(72,482,288,1);
  ctx.fillStyle=COL.base;rr(TX-21,BOT+1,42,17,4);ctx.fill();
  ctx.save();ctx.translate(PIV.x,PIV.y);ctx.rotate(o.lever);
  ctx.fillStyle=COL.handle;rr(-4,-3.5,PADL+4,7,3.5);ctx.fill();
  ctx.fillStyle=COL.base;rr(PADL-26,-6.5,26,4,2);ctx.fill();
  ctx.restore();
  dot(PIV.x,PIV.y,4,COL.base);

  // молот: ручка из точки хвата, голова это кнопка Continue
  var M=o.mallet;
  ctx.save();ctx.translate(G.x,G.y);ctx.rotate(M.a);
  ctx.fillStyle=COL.handle;rr(-5,-3.5,LEN-HH/2+6,7,3.5);ctx.fill();
  ctx.translate(LEN,0);ctx.rotate(Math.PI/2);
  var ps=1-.05*M.press;ctx.scale((1-M.sq)*ps,(1+M.sq*.6)*ps);
  ctx.fillStyle=COL.btn;rr(-HW/2,-HH/2,HW,HH,HH/2);ctx.fill();
  txt('Continue',0,.5,14,'#fff',600,'center');
  ctx.restore();
  dot(G.x,G.y,6,COL.handle);

  ctx.restore();

  // курсор поверх всего
  var cu=o.cursor;if(cu)cursorShape(cu.x,cu.y,1.3*(1-.08*cu.press));

  if(o.fade>0){ctx.globalAlpha=o.fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
}
function render(t){scene(t,stateAt(t))}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(){
  var E=[],i;
  for(i=0;i<PW1.length;i++)E.push([mix(T.k1,T.k1e,i/PW1.length)+.01,'key',i]);
  E.push([T.click1,'click'],[T.w1,'wind'],[T.s1,'swing'],[T.hit1,'hit',0],[T.hit1+.004,'zip',0],[T.hit1+.14,'err']);
  RUN1.ev.forEach(function(e){if(e[1]==='floor')E.push([T.hit1+e[0],'floor',e[2]])});
  E.push([T.sel,'sel'],[T.del,'del'],[T.del+.02,'drain',0]);
  for(i=0;i<PW2.length;i++)E.push([mix(T.k2,T.k2e,i/PW2.length)+.01,'key',i+20]);
  E.push([T.click2,'click'],[T.w2,'wind'],[T.s2,'swing'],[T.hit2,'hit',1],[T.hit2+.004,'zip',1]);
  CROSS.forEach(function(c,k){E.push([T.hit2+c,'step',k])});
  E.push([DING,'ding'],[DING+.1,'ok']);
  RUN2.ev.forEach(function(e){if(e[1]==='floor')E.push([T.hit2+e[0],'floor',e[2]])});
  E.push([T.conf,'conf'],[T.conf+.06,'drain',1]);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EVENTS=buildEvents();
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Всё идёт само, но Continue жмёт зритель: время стоит перед каждым кликом, пока не тапнут. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={t:0,last:nowS(),lastT:0,gate:0}}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
var GATES=[T.click1-.07,T.click2-.07];
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var V=LV;if(V.gate<2&&V.t>=GATES[V.gate]-.001)V.gate++;
});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;
  var lim=V.gate<2?GATES[V.gate]:Infinity;V.t=Math.min(lim,V.t+dt);
  var t=V.t;fireBetween(EVENTS,V.lastT,t);V.lastT=t;
  if(t>=CYCLE){V.t=0;V.lastT=0;V.gate=0;t=0}
  var o=stateAt(t),waiting=V.gate<2&&t>=GATES[V.gate]-.001;
  if(waiting)o.caret=((n*1.8)%1)<.55;
  scene(t,o);
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
    ?{bg:'#000000',card:'#1c1c1e',field:'#1c1c1e',ink:'#f5f5f7',sub:'#8d8d93',line:'#2c2c2f',ghost:'#2e2e32',blue:'#0a84ff',btn:'#0a84ff',
      red:'#ff453a',amber:'#ff9f0a',green:'#30d158',steel:'#76787f',base:'#45464b',handle:'#808289',shadow:'rgba(0,0,0,0)',halo:.28,selBg:'rgba(10,132,255,.35)'}
    :{bg:'#f3f3f1',card:'#ffffff',field:'#ffffff',ink:'#1d1d1f',sub:'#8a8a8f',line:'#e6e6e9',ghost:'#ededf0',blue:'#0a7cff',btn:'#0a7cff',
      red:'#ff3b30',amber:'#ff9f0a',green:'#34c759',steel:'#b1b3b9',base:'#cfd1d5',handle:'#9a9da4',shadow:'rgba(0,0,0,.07)',halo:.16,selBg:'rgba(10,124,255,.2)'};
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
window.__T=T;window.__DING=DING;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
