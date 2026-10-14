/* ─────────── Unsubscribe ───────────
   Папка Promotions, 8 непрочитанных, это поле whack-a-mole: девять лунок, из них выскакивают промо-письма.
   Молоток: на ручке вместо головы красная кнопка Unsubscribe. Бьёт по письмам, одно ныряет и выскакивает
   в другой лунке. Счётчик падает до нуля, All caught up. Тишина. В центре осторожно выглядывает
   «We miss you», молоток бьёт и его, и тут лезут все девять сразу. Счётчик раскручивается до 99+,
   молоток отскакивает от письма, мечется и выпадает из кадра.
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
function ein(p){p=c01(p);return Math.pow(p,2.2)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))}
function backOut(p,c){p=c01(p);c=c||1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}
function hex(c){var n=parseInt(c.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function mixc(a,b,t){var A=hex(a),B=hex(b);t=c01(t);return'rgb('+Math.round(mix(A[0],B[0],t))+','+Math.round(mix(A[1],B[1],t))+','+Math.round(mix(A[2],B[2],t))+')'}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ─────────── геометрия ─────────── */
var CARD={x:36,y:32,w:360,h:476,r:22};
var HX=[112,216,320],HY=[238,350,462];
var MW=92,MH=74,RISE=66;                 // письмо и насколько оно высовывается
var HEAD={dx:-58,dy:92,w:106,h:34};      // голова молотка относительно точки хвата
var REST={x:398,y:186};
function holeXY(h){return{x:HX[h%3],y:HY[h/3|0]}}
function gripFor(h){var p=holeXY(h);return{x:p.x-HEAD.dx,y:p.y-RISE*.55-HEAD.h/2-HEAD.dy}}

/* ─────────── расписание ─────────── */
// c: цвет аватарки, l: буква отправителя
var EV=[
  {h:4,up:.22,hit:.75,s:'Flash sale',c:0,l:'Z'},
  {h:0,up:.95,hit:1.32,s:'New drop',c:1,l:'N'},
  {h:8,up:1.45,hit:1.8,s:'This week',c:2,l:'W'},
  {h:7,up:1.82,duck:2.06,s:'Free gift',c:3,l:'G'},
  {h:3,up:2.24,hit:2.52,s:'Free gift',c:3,l:'G'},
  {h:2,up:2.5,hit:2.84,s:'Your cart',c:4,l:'C'},
  {h:6,up:2.78,hit:3.12,s:'Just for you',c:5,l:'J'},
  {h:5,up:3.0,hit:3.38,s:'Don’t miss',c:6,l:'D'},
  {h:1,up:3.25,hit:3.62,s:'Last call',c:7,l:'L'}
];
var CREEP={h:4,up:4.7,hit:5.25,s:'We miss you',c:8,l:'B'};
var ZERO=3.74,ERUPT=5.42,PLUS=6.5,SINK=8.5;
var ORD=[4,1,3,5,7,0,2,6,8];
var SWS=['Come back','Last chance','Psst','Miss us?','We miss you','Wait!','Final call','One more','Hi again'];
var SWC=[1,0,4,3,8,6,2,7,5],SWL=['N','Z','C','G','B','D','W','L','J'];
// удары молотка: по каждому письму, промах по нырнувшему, «We miss you», отскок от вылезшего
var SL=[];
EV.forEach(function(e){SL.push({t:e.hit||e.duck+.1,h:e.h,miss:!!e.duck})});
SL.push({t:CREEP.hit,h:CREEP.h},{t:5.82,h:3,rebound:true});
var CYCLE=9.2;

/* ─────────── письма ─────────── */
function moleAt(i,t){
  var k=ORD.indexOf(i),su=ERUPT+k*.045;
  if(t>=su){
    var m=backOut(seg(t,su,su+.22))*(1-eio(seg(t,SINK,SINK+.3)));
    m+=.03*Math.sin((t-su)*7+i*1.7)*seg(t,su+.25,su+.6);
    var sq=1;if(i===3){var d=t-5.82;if(d>=0)sq=1-.5*Math.exp(-d*7)*Math.cos(d*26)}
    return{m:m,sq:sq,s:SWS[i],c:SWC[i],l:SWL[i]};
  }
  if(i===CREEP.h&&t>=CREEP.up&&t<CREEP.hit+.25){
    // выглядывает наполовину, замирает, потом высовывается целиком
    if(t<CREEP.hit)return{m:.42*eio(seg(t,CREEP.up,CREEP.up+.16))+.58*eio(seg(t,4.98,5.12)),sq:1,s:CREEP.s,c:CREEP.c,l:CREEP.l};
    return{m:1-eio(seg(t,CREEP.hit+.05,CREEP.hit+.17)),sq:mix(1,.55,seg(t,CREEP.hit,CREEP.hit+.035)),s:CREEP.s,c:CREEP.c,l:CREEP.l};
  }
  for(var j=0;j<EV.length;j++){
    var e=EV[j];if(e.h!==i||t<e.up)continue;
    if(e.duck){
      if(t>e.duck+.2)continue;
      return{m:t<e.duck?backOut(seg(t,e.up,e.up+.2)):1-eio(seg(t,e.duck,e.duck+.09)),sq:1,s:e.s,c:e.c,l:e.l};
    }
    if(t>e.hit+.25)continue;
    if(t<e.hit)return{m:backOut(seg(t,e.up,e.up+.2)),sq:1,s:e.s,c:e.c,l:e.l};
    return{m:1-eio(seg(t,e.hit+.05,e.hit+.2)),sq:mix(1,.55,seg(t,e.hit,e.hit+.035)),s:e.s,c:e.c,l:e.l};
  }
  return null;
}

/* ─────────── молоток ─────────── */
// замах и удар к моменту T: чуть выше перед ударом, потом вниз с разгоном
function slamA(t,T){return t<T-.1?.55+.14*bump(t,T-.24,T-.1):.55*(1-ein(seg(t,T-.1,T)))}
function malletAt(t){
  var s0=SL[0],g0=gripFor(s0.h),s,x,y,a=.55,dy=0;
  if(t<s0.t-.12){
    s=eio(seg(t,.04,s0.t-.12));
    return{x:mix(SW+110,g0.x,s),y:mix(g0.y-30,g0.y,s)-Math.sin(Math.PI*s)*14,a:slamA(t,s0.t)};
  }
  var k=0;while(k<SL.length-1&&t>=SL[k+1].t-.12)k++;
  var P=SL[k],G=gripFor(P.h),N=SL[k+1],d=t-P.t;x=G.x;y=G.y;
  if(P.miss)dy=t<P.t?26*ein(seg(t,P.t-.1,P.t)):26*(1-eout(seg(d,.05,.2)));
  if(t<P.t)return{x:x,y:y+dy,a:slamA(t,P.t)};
  if(P.rebound){
    // письмо не сдалось: молоток отлетает, мечется по лункам, никнет и выпадает
    a=d<.1?.85*eout(seg(d,0,.1)):mix(.85,.55,eio(seg(d,.1,.2)));
    var A=gripFor(3),B=gripFor(1),C=gripFor(7);
    if(t<5.92){x=A.x;y=A.y}
    else if(t<6.04){s=eio(seg(t,5.92,6.04));x=mix(A.x,B.x,s);y=mix(A.y,B.y,s)-Math.sin(Math.PI*s)*14}
    else if(t<6.16){s=eio(seg(t,6.06,6.16));x=mix(B.x,C.x,s);y=mix(B.y,C.y,s)-Math.sin(Math.PI*s)*14}
    else{x=C.x;y=C.y}
    if(t>=6.18){s=eio(seg(t,6.18,6.36));a=mix(.55,-.45,s);y+=10*s}
    if(t>=6.36){var f=t-6.36;y+=1500*f*f;x-=30*f;a-=2.4*f}
    return{x:x,y:y,a:a};
  }
  a=d<.06?0:.55*eout(seg(d,.06,.2));
  if(!N)return{x:x,y:y+dy,a:a};
  var Q=gripFor(N.h);
  if(k===EV.length-1){
    // к краю, пауза All caught up, потом к выглядывающему письму
    if(t<4.15){s=eio(seg(t,P.t+.1,4.15));x=mix(G.x,REST.x,s);y=mix(G.y,REST.y,s)-Math.sin(Math.PI*s)*16;a=Math.min(a,mix(.55,.22,s))}
    else if(t<4.86){x=REST.x;y=REST.y+1.5*Math.sin((t-4.15)*5);a=.22}
    else{s=eio(seg(t,4.86,N.t-.12));x=mix(REST.x,Q.x,s);y=mix(REST.y,Q.y,s)-Math.sin(Math.PI*s)*16;a=mix(.22,.55,s)}
    return{x:x,y:y,a:a};
  }
  if(P.t===CREEP.hit){
    // лезут все: молоток шарахается назад и бросается к ближайшему
    if(t<ERUPT)return{x:x,y:y,a:a};
    if(t<ERUPT+.1){s=eout(seg(t,ERUPT,ERUPT+.1));return{x:x+16*s,y:y-36*s,a:.55+.4*s}}
    s=eio(seg(t,ERUPT+.12,N.t-.12));
    return{x:mix(x+16,Q.x,s),y:mix(y-36,Q.y,s),a:mix(.95,.55,s)};
  }
  if(t>P.t+.07){s=eio(seg(t,P.t+.07,N.t-.12));x=mix(G.x,Q.x,s);y=mix(G.y,Q.y,s)-Math.sin(Math.PI*s)*16}
  return{x:x,y:y+dy,a:a};
}

/* ─────────── счётчик и подпись ─────────── */
function badgeAt(t){
  var v=8;EV.forEach(function(e){if(e.hit)v-=eio(seg(t,e.hit+.02,e.hit+.16))});
  var sc=1-eio(seg(t,ZERO-.04,ZERO+.1)),plus=false;
  if(t>=ERUPT){sc=backOut(seg(t,ERUPT+.03,ERUPT+.25));v=1+98*Math.pow(seg(t,ERUPT+.08,PLUS),2.4);plus=t>=PLUS;sc*=1+.18*bump(t,PLUS,PLUS+.2);v=Math.floor(v)}
  return{v:v,sc:sc,plus:plus};
}
function hitsAt(t){var n=0;EV.forEach(function(e){if(e.hit&&t>=e.hit)n++});if(t>=CREEP.hit)n++;return n}

/* ─────────── состояние кадра из t ─────────── */
function stateAt(t){
  var o={moles:[],toasts:[]};
  for(var i=0;i<9;i++)o.moles.push(moleAt(i,t));
  o.mallet=malletAt(t);
  o.badge=badgeAt(t);
  o.n=hitsAt(t);
  var SB=[[0,'upd'],[EV[0].hit,'n'],[ZERO,'zero'],[ERUPT,'n']],c=0;while(c<SB.length-1&&t>=SB[c+1][0])c++;
  o.sub={cur:SB[c][1],prev:c?SB[c-1][1]:null,p:c?eout(seg(t,SB[c][0],SB[c][0]+.25)):1};
  EV.concat([CREEP]).forEach(function(e){if(e.hit&&t>=e.hit&&t<e.hit+.75){var p=holeXY(e.h);o.toasts.push({x:p.x,y:p.y,p:(t-e.hit)/.75})}});
  var j=0;SL.forEach(function(s){j+=(s.miss?1.2:.9)*wob(t-s.t,22,12)});
  o.jolt=j+2.4*wob(t-ERUPT,10,9);
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

// число барабаном: разряды, которые меняются между n и n+1, прокручиваются на дробную часть
function rollNum(v,x,y,sz,col,wt,al){
  var n=Math.floor(v+1e-6),f=v-n,a=String(n),b=String(n+1);
  if(f<.002||a.length!==b.length){txt(f<.5?a:b,x,y,sz,col,wt,al);return}
  var w=tw(a,sz,wt),x0=al==='center'?x-w/2:x,hh=sz*1.15;
  ctx.save();ctx.beginPath();ctx.rect(x0-2,y-hh/2,w+4,hh);ctx.clip();
  for(var i=0;i<a.length;i++){
    var cw=tw(a.slice(0,i),sz,wt),dx=x0+cw;
    if(a[i]===b[i])txt(a[i],dx,y,sz,col,wt);
    else{txt(a[i],dx,y-f*hh,sz,col,wt);txt(b[i],dx,y+(1-f)*hh,sz,col,wt)}
  }
  ctx.restore();
}

function drawMole(x,y,M){
  var top=y-RISE*M.m*M.sq;
  ctx.save();ctx.beginPath();ctx.rect(x-MW/2-12,y-200,MW+24,200+1);ctx.clip();
  ctx.translate(x,top);ctx.scale(1+(1-M.sq)*.45,M.sq);
  ctx.fillStyle=COL.mole;rr(-MW/2,0,MW,MH+8,13);ctx.fill();
  ctx.strokeStyle=COL.moleLine;ctx.lineWidth=1;rr(-MW/2+.5,.5,MW-1,MH+7,12.5);ctx.stroke();
  var ac=COL.av[M.c%COL.av.length];
  dot(-MW/2+19,19,11,ac);txt(M.l,-MW/2+19,19.5,12,'#fff',700,'center');
  ctx.fillStyle=COL.ghost;rr(-MW/2+36,16,28,6,3);ctx.fill();
  dot(MW/2-13,19,4,COL.blue);
  var sz=13;while(sz>9&&tw(M.s,sz,650)>MW-20)sz-=.5;
  txt(M.s,-MW/2+10,42,sz,COL.ink,650);
  ctx.fillStyle=COL.ghost;rr(-MW/2+10,55,MW-36,6,3);ctx.fill();
  ctx.restore();
}

function subLine(k,y,n){
  if(k==='upd')txt('Updated just now',64,y,14,COL.sub);
  else if(k==='n')txt('Unsubscribed from '+n,64,y,14,COL.sub);
  else{dot(71,y,7,COL.green);check(71,y,9,'#fff',1.8);txt('All caught up',84,y,14,COL.green,600)}
}
function scene(t,o){
  M0();
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  ctx.save();ctx.translate(0,o.jolt);

  ctx.save();ctx.shadowColor=COL.shadow;ctx.shadowBlur=40;ctx.shadowOffsetY=12;
  ctx.fillStyle=COL.card;rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(CARD.x+.5,CARD.y+.5,CARD.w-1,CARD.h-1,CARD.r-.5);ctx.stroke();

  // шапка: Promotions и красный счётчик
  txt('Promotions',64,78,22,COL.ink,700);
  var B=o.badge;
  if(B.sc>.01){
    var bs=B.plus?'99+':String(Math.round(B.v)),bw=Math.max(26,tw(bs,13.5,650)+16),bx=64+tw('Promotions',22,700)+10;
    ctx.save();ctx.translate(bx+bw/2,78);ctx.scale(B.sc,B.sc);
    ctx.fillStyle=COL.red;rr(-bw/2,-12,bw,24,12);ctx.fill();
    if(B.plus)txt('99+',0,.5,13.5,'#fff',650,'center');else rollNum(B.v,0,.5,13.5,'#fff',650,'center');
    ctx.restore();
  }
  // подпись: Updated just now → Unsubscribed from N → All caught up → снова Unsubscribed
  var sy=104,Sb=o.sub;
  ctx.save();ctx.beginPath();ctx.rect(CARD.x,sy-11,CARD.w,22);ctx.clip();
  if(Sb.prev&&Sb.p<1){ctx.globalAlpha=1-Sb.p;subLine(Sb.prev,sy-12*Sb.p,o.n)}
  ctx.globalAlpha=Sb.p;subLine(Sb.cur,sy+12*(1-Sb.p),o.n);
  ctx.restore();ctx.globalAlpha=1;
  ctx.fillStyle=COL.line;ctx.fillRect(CARD.x,128,CARD.w,1);

  // лунки по рядам сверху вниз, чтобы нижние письма перекрывали верхние лунки
  for(var r=0;r<3;r++)for(var c=0;c<3;c++){
    var i=r*3+c,x=HX[c],y=HY[r],M=o.moles[i];
    ctx.fillStyle=COL.hole;ctx.beginPath();ctx.ellipse(x,y,49,14,0,0,7);ctx.fill();
    ctx.fillStyle=COL.hole2;ctx.beginPath();ctx.ellipse(x,y+2,41,10,0,0,7);ctx.fill();
    if(M&&M.m>.002)drawMole(x,y,M);
    ctx.fillStyle=COL.hole;ctx.beginPath();ctx.ellipse(x,y,49,14,0,0,Math.PI);ctx.fill();
  }
  // «Unsubscribed» над прибитым письмом
  o.toasts.forEach(function(q){
    var a=1-seg(q.p,.55,1),y=q.y-RISE-20-eout(q.p)*24;
    ctx.globalAlpha=a*seg(q.p,0,.12);var w=tw('Unsubscribed',12,600)+20,x=q.x-w/2;
    dot(x+6,y,6,COL.green);check(x+6,y,8,'#fff',1.6);txt('Unsubscribed',x+16,y+.5,12,COL.green,600);
    ctx.globalAlpha=1;
  });

  // молоток: красная кнопка Unsubscribe на ручке
  var m=o.mallet;
  if(m&&m.y<SH+140){
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);
    var hx=HEAD.dx,hy=HEAD.dy,L=Math.hypot(hx,hy-HEAD.h/2);
    ctx.save();ctx.rotate(Math.atan2(hy-HEAD.h/2,hx));ctx.fillStyle=COL.handle;rr(-5,-3.5,L+5,7,3.5);ctx.fill();ctx.restore();
    ctx.fillStyle=COL.red;rr(hx-HEAD.w/2,hy-HEAD.h/2,HEAD.w,HEAD.h,HEAD.h/2);ctx.fill();
    txt('Unsubscribe',hx,hy+.5,14,'#fff',600,'center');
    ctx.restore();
    dot(m.x,m.y,6,COL.handle);
  }
  ctx.restore();

  if(o.fade>0){ctx.globalAlpha=o.fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
}
function render(t){scene(t,stateAt(t))}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(){
  var E=[];
  EV.forEach(function(e,i){
    E.push([e.up,'pop',i]);
    if(e.duck)E.push([e.duck,'duck']);
    else{E.push([e.hit,'bonk',i],[e.hit+.05,'toast',i],[e.hit+.03,'tick',i])}
  });
  SL.forEach(function(s){E.push([s.t-.1,'swing',s.miss?1:0]);if(s.miss)E.push([s.t,'miss'])});
  E.push([ZERO,'zero']);
  E.push([CREEP.up,'peek'],[4.98,'pop',9],[CREEP.hit,'bonk',9],[CREEP.hit+.05,'toast',9]);
  E.push([ERUPT,'erupt']);
  ORD.forEach(function(h,k){E.push([ERUPT+k*.045,'pop',10+k])});
  // счётчик раскручивается: тики всё чаще и выше
  var last=1;for(var tt=ERUPT+.1;tt<PLUS;tt+=1/60){var v=Math.floor(1+98*Math.pow(seg(tt,ERUPT+.08,PLUS),2.4));if(v>=last+4||(v>last&&v<12)){E.push([tt,'roll',v]);last=v}}
  E.push([PLUS,'plus']);
  E.push([5.82,'bonk',20],[5.83,'boing']);
  E.push([5.93,'swish',0],[6.06,'swish',1],[6.36,'drop'],[6.8,'clatter']);
  E.push([SINK,'sink']);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EVENTS=buildEvents();
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Настоящая игра: письма выскакивают сами, тап по письму бьёт молотком. Восемь отписок, и дальше
   концовка из ролика: All caught up, «We miss you», лезут все, 99+. Потом новый раунд. */
var mode='auto',LV=null,SUBJ=['Flash sale','New drop','This week','Free gift','Your cart','Just for you','Don’t miss','Last call','Sale ends','Hot deals','Top picks','Restock'];
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');liveReset()}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
function liveReset(){LV={t:0,last:nowS(),moles:[],hits:0,next:.5,R:rng(Math.floor(Math.random()*1e6)),slam:null,mx:REST.x,my:REST.y,end:null,toasts:[]}}
function liveSpawn(V){
  var busy=V.moles.filter(function(e){return V.t<e.gone}).map(function(e){return e.h}),free=[];
  for(var h=0;h<9;h++)if(busy.indexOf(h)<0)free.push(h);
  if(!free.length)return;
  var h=free[Math.floor(V.R()*free.length)],life=1.25-Math.min(.45,V.hits*.06);
  V.moles.push({h:h,up:V.t,duck:V.t+life,gone:V.t+life+.12,hit:null,s:SUBJ[Math.floor(V.R()*SUBJ.length)],c:Math.floor(V.R()*9),l:'ABCDEFGHJKLMNPRSTW'[Math.floor(V.R()*18)]});
  Sound.play([0,'pop',Math.floor(V.R()*9)]);
}
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var V=LV;if(V.end!=null||(V.slam&&V.t<V.slam.T))return;
  var r=frameEl.getBoundingClientRect(),px=(e.clientX-r.left)/S,py=(e.clientY-r.top)/S,best=null,bd=1e9;
  V.moles.forEach(function(m){
    if(m.hit!=null||V.t>m.duck)return;var p=holeXY(m.h),d=Math.hypot(px-p.x,(py-(p.y-RISE/2))*.8);
    if(d<70&&d<bd){bd=d;best=m}
  });
  var h=best?best.h:null;
  if(h==null){var nd=1e9;for(var k=0;k<9;k++){var q=holeXY(k),dd=Math.hypot(px-q.x,py-q.y);if(dd<nd){nd=dd;h=k}}}
  var g=gripFor(h);V.slam={fx:V.mx,fy:V.my,x:g.x,y:g.y,t0:V.t,T:V.t+.16,miss:!best};
  if(best){best.hit=V.t+.16;best.duck=best.hit+1;best.gone=best.hit+.25}
  Sound.play([0,'swing',best?0:1],-.06);
});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;
  if(V.end!=null){
    // концовка из ролика
    var pt=V.end;V.end+=dt;fireBetween(EVENTS,pt,V.end);
    if(V.end>=CYCLE){liveReset();return}
    var so=stateAt(V.end);so.fade=Math.max(seg(V.end,CYCLE-.4,CYCLE),1-seg(V.end,ZERO-.25,ZERO-.05));scene(V.end,so);return;
  }
  var t0=V.t;V.t+=dt;var t=V.t;
  if(t>=V.next&&V.hits<8){liveSpawn(V);V.next=t+mix(.5,.75,V.R())-Math.min(.25,V.hits*.03)}
  V.moles.forEach(function(m){
    if(m.hit!=null&&m.hit>t0&&m.hit<=t){V.hits++;V.toasts.push({h:m.h,t:m.hit});Sound.play([0,'bonk',V.hits]);Sound.play([0,'toast',V.hits],-.05);Sound.play([0,'tick',V.hits],-.03)}
    if(m.hit==null&&m.duck>t0&&m.duck<=t)Sound.play([0,'duck']);
  });
  if(V.slam&&V.slam.miss&&V.slam.T>t0&&V.slam.T<=t)Sound.play([0,'miss']);
  if(V.hits>=8&&V.slam&&t>V.slam.T+.3){V.end=ZERO-.25;return}
  // письма
  var o={moles:[],toasts:[]};
  for(var i=0;i<9;i++)o.moles.push(null);
  V.moles.forEach(function(e){
    if(t<e.up||t>e.gone)return;var M;
    if(e.hit!=null&&t>=e.hit)M={m:1-eio(seg(t,e.hit+.05,e.hit+.2)),sq:mix(1,.55,seg(t,e.hit,e.hit+.035))};
    else if(t<e.duck)M={m:backOut(seg(t,e.up,e.up+.2)),sq:1};
    else M={m:1-eio(seg(t,e.duck,e.duck+.09)),sq:1};
    M.s=e.s;M.c=e.c;M.l=e.l;o.moles[e.h]=M;
  });
  V.moles=V.moles.filter(function(e){return t<e.gone+.5});
  // молоток: летит к лунке, бьёт, ждёт поднятым там же
  var a=.55,x=V.mx,y=V.my,dy=0;
  if(V.slam){
    var Sl=V.slam,s=eio(seg(t,Sl.t0,Sl.T-.07));x=mix(Sl.fx,Sl.x,s);y=mix(Sl.fy,Sl.y,s);
    if(t<Sl.T)a=slamA(t,Sl.T);else a=t-Sl.T<.06?0:.55*eout(seg(t-Sl.T,.06,.2));
    if(Sl.miss)dy=t<Sl.T?26*ein(seg(t,Sl.T-.1,Sl.T)):26*(1-eout(seg(t-Sl.T,.05,.2)));
    if(t>=Sl.T-.07){V.mx=Sl.x;V.my=Sl.y}
  }else{y+=1.5*Math.sin(t*5)}
  o.mallet={x:x,y:y+dy,a:a};
  o.badge={v:8-V.hits,sc:1,plus:false};o.n=V.hits;o.sub={cur:V.hits?'n':'upd',prev:null,p:1};
  V.toasts.forEach(function(q){if(t-q.t<.75){var p=holeXY(q.h);o.toasts.push({x:p.x,y:p.y,p:(t-q.t)/.75})}});
  o.jolt=V.slam?.9*wob(t-V.slam.T,22,12):0;o.fade=1-seg(t,0,.2);
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
    ?{bg:'#000000',card:'#1c1c1e',ink:'#f5f5f7',sub:'#8d8d93',line:'#2c2c2f',ghost:'#3a3a3e',blue:'#0a84ff',red:'#ff453a',green:'#30d158',
      hole:'#0e0e10',hole2:'#000000',mole:'#2c2c2e',moleLine:'#3a3a3d',handle:'#808289',shadow:'rgba(0,0,0,0)',
      av:['#ff9f0a','#0a84ff','#30d158','#bf5af2','#ff453a','#64d2ff','#ff375f','#ffd60a','#ac8e68']}
    :{bg:'#f3f3f1',card:'#ffffff',ink:'#1d1d1f',sub:'#8a8a8f',line:'#e6e6e9',ghost:'#e8e8eb',blue:'#0a7cff',red:'#ff3b30',green:'#34c759',
      hole:'#e2e2e6',hole2:'#cbcbd1',mole:'#ffffff',moleLine:'#d9d9de',handle:'#9a9da4',shadow:'rgba(0,0,0,.07)',
      av:['#ff9500','#0a7cff','#34c759','#af52de','#ff3b30','#32ade6','#ff2d55','#e6b800','#a2845e']};
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
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
