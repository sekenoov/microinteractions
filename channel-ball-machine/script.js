/* ─────────── @channel ───────────
   Понедельник, 9:00, канал # general. Канал это стол для пинг-понга: на дальнем краю стоит пушка-робот
   и стреляет сообщениями коллег. Каждый мяч несёт сообщение: morning! quick q, got a sec?, any update?
   Ракетка отбивает каждый реакцией 👍 1, пушка разгоняется, последние три пролетают мимо, растёт
   непрочитанное. Потом Mark пишет @channel: бункер набивается доверху, сорок мячей летят веером,
   счётчик раскручивается до 99+, ракетка сдаётся и ложится на стол. Тишина. Из пушки выкатывается
   последний мяч свечой: «sorry, wrong channel 🙏», докатывается до лежащей ракетки. На часах 9:07.
   Поле 432 × 540 точек, кадр рисуется из одного t; россыпь мячей заранее считается физикой. */

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
function backOut(p,c){p=c01(p);c=c||1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ─────────── геометрия ─────────── */
var CARD={x:36,y:32,w:360,h:476,r:22};
var TOP=372,TX0=60,TX1=372,NX=216,NETH=24,FLOOR=452,BR=5.5,G=1400;
var MOUTH={x:290,y:306},P={x:106,y:318},FAR=280;    // выход пушки, точка удара ракеткой, отскок ответа
var GRIP={x:78,y:360},BLADE=44;                     // ракетка вращается вокруг хвата
var PADC={x:70+BLADE*Math.sin(1.38),y:367-BLADE*Math.cos(1.38)};   // лопасть лежащей ракетки
var MX0=312,MY0=288;                                 // пушка твёрдая правее и ниже этой точки

/* ─────────── люди и сообщения ─────────── */
var PEOPLE={A:['Anna',0],M:['Mark',1],L:['Lisa',2],T:['Tom',3],K:['Kate',4],B:['Ben',5]};
var MSGS=[['A','morning! quick q'],['M','got a sec?'],['L','can you look at this?'],['T','bumping this ↑'],['K','👀'],['B','quick call?'],
  ['A','also…'],['M','any update?'],['L','+1'],['T','?'],['K','ping'],['M','hello??']];
var MISS_FROM=9;                                     // с десятого мяча ракетка не успевает

/* ─────────── расписание ─────────── */
// a: от пушки до отскока на твоей стороне, b: от отскока до ракетки, r: ответ до отскока на той стороне
var SHOTS=[];
(function(){var s=.55;MSGS.forEach(function(m,k){
  var u=k/(MSGS.length-1),o={k:k,who:m[0],msg:m[1],s:s,a:mix(.5,.3,u),b:mix(.22,.15,u),r:mix(.42,.34,u),bx:mix(168,150,u)};
  o.arr=o.s+o.a+o.b;SHOTS.push(o);s+=Math.max(.26,1.1*Math.pow(.78,k));
})})();
var WIND=6.3,FILL0=6.36,FILL1=6.86,FLOOD=6.95,FN=40,FDT=.024,BADGE0=7.0,PLUS=8.1,DROOP=7.7,LAST=9.35,CYCLE=12.9;
var FRANTIC=[7.08,7.27,7.45];
var MIN=[1.9,3.2,4.2,5.0,5.9,7.4,10.45];            // 9:01 … 9:07

/* ─────────── траектории ─────────── */
// баллистика из (x0,y0) в (x1,y1) ровно за d секунд
function bal(x0,y0,x1,y1,d,tau){var vy=(y1-y0-.5*G*d*d)/d;return{x:mix(x0,x1,tau/d),y:y0+vy*tau+.5*G*tau*tau,vx:(x1-x0)/d,vy:vy+G*tau}}
function inPos(Sh,t){var tau=t-Sh.s;return tau<Sh.a?bal(MOUTH.x,MOUTH.y,Sh.bx,TOP-BR,Sh.a,tau):bal(Sh.bx,TOP-BR,P.x,P.y,Sh.b,tau-Sh.a)}
function outPos(Sh,t){
  var tau=t-Sh.arr;if(tau<Sh.r)return bal(P.x,P.y,FAR,TOP-BR,Sh.r,tau);
  var f=bal(P.x,P.y,FAR,TOP-BR,Sh.r,Sh.r),d=tau-Sh.r,vy=-f.vy*.78;
  return{x:FAR+f.vx*d,y:TOP-BR+vy*d+.5*G*d*d};
}

/* ─────────── россыпь: промахи, @channel и последний мяч считаются физикой один раз ─────────── */
function buildGroup(plan){
  var R=rng(11),B=[],ev=[];
  SHOTS.forEach(function(Sh){if(plan.hit[Sh.k]===false){var q=inPos(Sh,Sh.arr);B.push({t0:Sh.arr,x:q.x,y:q.y,vx:q.vx,vy:q.vy,k:Sh.k})}});
  for(var i=0;i<FN;i++){var a=R(),b=R();B.push({t0:FLOOD+i*FDT,x:MOUTH.x,y:MOUTH.y,vx:-(210+a*330),vy:-(b*360-70),f:i,fr:.35})}
  // последний мяч: медленная свеча через сетку, усталый: прыгает ниже и тормозит сильнее
  B.push({t0:LAST,x:MOUTH.x,y:MOUTH.y,vx:-118,vy:-520,last:true,e:.38,fr:.45});
  function hit(b,T,type,v){
    if(v<55||b.lt[type]&&T-b.lt[type]<.03)return;b.lt[type]=T;
    ev.push([T,type,Math.min(1,v/650),clamp((b.x-216)/190,-1,1)]);
  }
  var DT=1/240,T0=Math.min.apply(null,B.map(function(b){return b.t0})),steps=Math.ceil((CYCLE+.3-T0)/DT);
  B.forEach(function(b){b.on=false;b.xs=[];b.ys=[];b.lt={}});
  for(var n=0;n<=steps;n++){
    var T=T0+n*DT,act=[];
    B.forEach(function(b){
      if(!b.on){if(T<b.t0)return;b.on=true;b.tr0=null}
      act.push(b);
      var px=b.x,py=b.y;b.vy+=G*DT;b.x+=b.vx*DT;b.y+=b.vy*DT;
      if(b.vy>0&&py<=TOP-BR+.01&&b.y>TOP-BR&&b.x>TX0-BR*.5&&b.x<TX1+BR*.5){b.y=TOP-BR;if(b.vy>50){hit(b,T,'tok',b.vy);b.vy=-b.vy*(b.e||.66);b.vx*=.94}else b.vy=0}
      if((px-NX)*(b.x-NX)<=0&&b.y>TOP-NETH-BR&&b.y<TOP){b.x=px;hit(b,T,'net',Math.abs(b.vx)*1.6);b.vx=-b.vx*.2}
      if(b.x>MX0-BR&&b.y>MY0&&b.y<TOP&&px<=MX0-BR){b.x=MX0-BR;b.vx=-Math.abs(b.vx)*.4}
      if(b.y>FLOOR-BR){b.y=FLOOR-BR;if(b.vy>50){hit(b,T,'floor',b.vy);b.vy=-b.vy*.42;b.vx*=.86}else if(b.vy>0)b.vy=0}
      if(b.x<CARD.x+BR){b.x=CARD.x+BR;hit(b,T,'wall',Math.abs(b.vx));b.vx=Math.abs(b.vx)*.45}
      if(b.x>CARD.x+CARD.w-BR){b.x=CARD.x+CARD.w-BR;b.vx=-Math.abs(b.vx)*.45}
      // лежащая ракетка: круг на месте лопасти; в неё упирается только последний мяч и гаснет
      if(b.last){
        var ex=b.x-PADC.x,ey=b.y-PADC.y,ed=Math.hypot(ex,ey),ER=23+BR;
        if(ed<ER){var ux=ex/ed,uy=ey/ed,un=b.vx*ux+b.vy*uy;b.x=PADC.x+ux*ER;b.y=Math.min(PADC.y+uy*ER,TOP-BR);if(un<0){hit(b,T,'pad',-un*1.4);b.vx=0;b.vy-=un*uy}}
      }
      var onT=Math.abs(b.y-(TOP-BR))<.8&&b.x>TX0&&b.x<TX1,onF=Math.abs(b.y-(FLOOR-BR))<.8;
      if(Math.abs(b.vy)<45&&(onT||onF))b.vx*=1-(onF?7:b.fr||1.1)*DT;   // по полю ввода мячи катятся хуже, копятся кучкой
    });
    // мячи толкаются друг с другом
    for(var i=0;i<act.length;i++)for(var j=i+1;j<act.length;j++){
      var p=act[i],q=act[j],dx=q.x-p.x,dy=q.y-p.y,d2=dx*dx+dy*dy;
      if(d2<4*BR*BR&&d2>1e-6){
        var d=Math.sqrt(d2),nx=dx/d,ny=dy/d,o=(2*BR-d)/2;p.x-=nx*o;p.y-=ny*o;q.x+=nx*o;q.y+=ny*o;
        var vn=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;if(vn<0){var J=-vn*.65;p.vx-=nx*J;p.vy-=ny*J;q.vx+=nx*J;q.vy+=ny*J}
        p.vx*=.96;q.vx*=.96;   // трение в контакте: куча не растекается
      }
    }
    if(n%2===0)act.forEach(function(b){if(b.tr0==null)b.tr0=T;b.xs.push(b.x);b.ys.push(b.y)});
  }
  ev.sort(function(a,b){return a[0]-b[0]});
  // слишком густые удары одного типа сливаются
  var out=[],lastT={};ev.forEach(function(e){if(lastT[e[1]]!=null&&e[0]-lastT[e[1]]<.012)return;lastT[e[1]]=e[0];out.push(e)});
  return{balls:B,ev:out};
}
function gpos(b,t){
  if(b.tr0==null||t<b.tr0||b.xs.length<2)return null;
  var f=(t-b.tr0)*120,i=Math.min(Math.floor(f),b.xs.length-2),u=Math.min(1,f-i);
  return{x:mix(b.xs[i],b.xs[i+1],u),y:mix(b.ys[i],b.ys[i+1],u)};
}

/* ─────────── план: кто отбит, когда машет ракетка ─────────── */
function mkPlan(hit,sw){var p={hit:hit,sw:sw};p.group=buildGroup(p);p.events=buildEvents(p);return p}
function autoPlan(){
  var hit=SHOTS.map(function(Sh){return Sh.k<MISS_FROM}),sw=[];
  SHOTS.forEach(function(Sh){sw.push(hit[Sh.k]?Sh.arr-.025:Sh.arr+.11)});
  return mkPlan(hit,sw.concat(FRANTIC).sort(function(a,b){return a-b}));
}

/* ─────────── счётчики ─────────── */
function unreadAt(t,plan){
  var v=0;SHOTS.forEach(function(Sh){v+=eio(seg(t,Sh.s,Sh.s+.14));if(plan.hit[Sh.k]!==false)v-=eio(seg(t,Sh.arr,Sh.arr+.14))});
  return v;
}
function badgeAt(t,plan){
  var v=unreadAt(t,plan),plus=false,sc=v<1?backOut(c01(v*1.2)):1;
  if(t>=BADGE0){var b0=unreadAt(BADGE0,plan);v=Math.floor(b0+(99-b0)*Math.pow(seg(t,BADGE0,PLUS),2.2));plus=t>=PLUS;sc=1}
  return{v:Math.max(1,v),sc:sc*(1+.18*bump(t,PLUS,PLUS+.2)),plus:plus};
}
function minuteAt(t){var m=0;MIN.forEach(function(T){m+=eio(seg(t,T,T+.22))});return m}
function hopperAt(t,plan){
  var n=12;SHOTS.forEach(function(Sh){if(t>=Sh.s)n--});
  n+=Math.floor(41*seg(t,FILL0,FILL1));
  for(var i=0;i<FN;i++)if(t>=FLOOD+i*FDT)n--;
  if(t>=LAST)n--;
  return Math.max(0,n);
}
// ячейки бункера снизу вверх: стакан, потом горка над краем
var SLOTS=[];
(function(){var y=285,row=0;while(SLOTS.length<44&&y>190){
  var w=y>=232?mix(30,72,(285-y)/53):72-(232-y)*2.6;if(w<10)break;
  var n=Math.max(1,Math.floor(w/10.8)),cx=338+(row%2?2.6:0);
  for(var i=0;i<n;i++)SLOTS.push({x:cx-(n-1)*5.4+i*10.8,y:y});y-=9.4;row++;
}})();

/* ─────────── ракетка ─────────── */
function paddleAt(t,plan){
  var a=.35,dx=0,d=null;
  plan.sw.forEach(function(T){var e=t-T;if(e>-.14&&e<.34)d=e});
  if(d!=null){
    if(d<0){var s=eout((d+.14)/.14);a=mix(.35,-.25,s);dx=-6*s}
    else if(d<.07){var s2=eout(d/.07);a=mix(-.25,.9,s2);dx=mix(-6,8,s2)}
    else{var s3=eio((d-.07)/.27);a=mix(.9,.35,s3);dx=mix(8,0,s3)}
  }
  var x=GRIP.x+dx,y=GRIP.y+1.2*Math.sin(t*3.1);
  if(t>=DROOP){
    // сдалась: заваливается и ложится на стол, чуть подпрыгнув
    var k=eio(seg(t,DROOP,DROOP+.36));a=mix(a,1.38,k);x=mix(x,70,k);y=mix(y,367,k);
    a-=.07*wob(t-DROOP-.36,8,3.2);
  }
  return{x:x,y:y,a:a};
}

/* ─────────── рисование ─────────── */
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)))}
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(-.012*sz)+'px'}
function tw(s,sz,wt){setFont(sz,wt);return ctx.measureText(s).width}
function txt(s,x,y,sz,col,wt,al){setFont(sz,wt);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}

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

function ball(x,y,al){ctx.globalAlpha=al==null?1:al;dot(x,y,BR,COL.ball);dot(x-1.7,y-1.8,1.7,COL.ballHi);ctx.globalAlpha=1}

// сообщение как в чате: аватарка, имя, текст; @channel подсвечен как упоминание
function bubble(x,y,who,text,sc,al,big){
  if(al<=.002||sc<=.002)return;
  var p=PEOPLE[who],fs=big?12.5:11,av=big?18:15,pd=big?6:5,men=text.indexOf('@channel')===0,
      nw=tw(p[0],fs,700),mw=tw(text,fs,450),w=pd+av+6+nw+5+mw+pd+(men?6:1),h=av+pd*2;
  x=clamp(x,CARD.x+8+w/2,CARD.x+CARD.w-8-w/2);
  ctx.save();ctx.globalAlpha=al;ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.save();ctx.shadowColor=COL.bshadow;ctx.shadowBlur=12;ctx.shadowOffsetY=3;ctx.fillStyle=COL.bubble;rr(-w/2,-h/2,w,h,8);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.bline;ctx.lineWidth=1;rr(-w/2+.5,-h/2+.5,w-1,h-1,7.5);ctx.stroke();
  var x0=-w/2+pd;ctx.fillStyle=COL.av[p[1]];rr(x0,-av/2,av,av,4);ctx.fill();
  txt(p[0][0],x0+av/2,.5,av*.6,'#fff',700,'center');
  txt(p[0],x0+av+6,.5,fs,COL.ink,700);
  var tx=x0+av+6+nw+5;
  if(men){
    var m='@channel',mw2=tw(m,fs,600);
    ctx.fillStyle=COL.menBg;rr(tx-2,-fs*.72,mw2+4,fs*1.44,3);ctx.fill();
    txt(m,tx,.5,fs,COL.menInk,600);txt(text.slice(m.length),tx+mw2+3,.5,fs,COL.ink2,450);
  }else txt(text,tx,.5,fs,COL.ink2,450);
  ctx.restore();ctx.globalAlpha=1;
}
// реакция 👍 1 на ответном мяче
function chip(x,y,sc,al){
  if(al<=.002)return;var w=38,h=21;
  ctx.save();ctx.globalAlpha=al;ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.fillStyle=COL.chip;rr(-w/2,-h/2,w,h,10.5);ctx.fill();
  ctx.strokeStyle=COL.blue;ctx.lineWidth=1;rr(-w/2+.5,-h/2+.5,w-1,h-1,10);ctx.stroke();
  txt('👍',-7.5,1,11.5,COL.ink,400,'center');txt('1',9,.5,11.5,COL.blue,700,'center');
  ctx.restore();ctx.globalAlpha=1;
}

function drawTable(){
  ctx.fillStyle=COL.leg;rr(TX0+26,TOP+6,5,FLOOR-TOP-6,2);ctx.fill();rr(TX1-31,TOP+6,5,FLOOR-TOP-6,2);ctx.fill();
  ctx.fillStyle=COL.table;ctx.fillRect(TX0,TOP,TX1-TX0,8);
  ctx.fillStyle=COL.tableSide;ctx.fillRect(TX0,TOP+5.5,TX1-TX0,2.5);
  ctx.fillStyle=COL.edge;ctx.fillRect(TX0,TOP,TX1-TX0,1.5);
  // сетка: стойка и белая лента сверху
  ctx.fillStyle=COL.mesh;ctx.fillRect(NX-2,TOP-NETH,4,NETH);
  ctx.fillStyle=COL.post;ctx.fillRect(NX-1,TOP-NETH-1,2,NETH+1);
  ctx.fillStyle=COL.edge;rr(NX-3,TOP-NETH-3,6,3,1.5);ctx.fill();
}

function drawPaddle(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
  ctx.fillStyle=COL.wood;rr(-5,-27,10,29,4);ctx.fill();
  ctx.fillStyle=COL.woodDk;ctx.fillRect(-5,-8,10,1.5);
  ctx.fillStyle=COL.rubberEdge;ctx.beginPath();ctx.ellipse(0,-BLADE,22.5,24.5,0,0,7);ctx.fill();
  ctx.fillStyle=COL.rubber;ctx.beginPath();ctx.ellipse(0,-BLADE,20.8,22.8,0,0,7);ctx.fill();
  ctx.restore();
}

function drawMachine(t,plan){
  // отдача на каждый выстрел, дрожь перед @channel
  var sh=0;SHOTS.forEach(function(Sh){sh+=1.8*wob(t-Sh.s,16,8)});
  for(var i=0;i<FN;i++)sh+=.9*wob(t-FLOOD-i*FDT,20,10);
  sh+=1.3*Math.sin(t*92)*bump(t,FILL0,FLOOD+.05);
  ctx.save();ctx.translate(sh,0);
  ctx.fillStyle=COL.mach;rr(316,TOP-6,46,6,3);ctx.fill();rr(335,316,8,TOP-316,2);ctx.fill();
  // бункер: стекло, мячи, передняя кромка
  var hop=new Path2D();hop.moveTo(299,232);hop.lineTo(377,232);hop.lineTo(358,291);hop.lineTo(318,291);hop.closePath();
  ctx.fillStyle=COL.glass;ctx.fill(hop);
  var n=Math.min(hopperAt(t,plan),SLOTS.length);
  for(var k=0;k<n;k++){var s=SLOTS[k],pop=t>=FILL0&&t<FILL1+.2?1:1;ball(s.x,s.y)}
  ctx.strokeStyle=COL.glassLine;ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke(hop);
  ctx.fillStyle=COL.mach;rr(312,288,56,32,10);ctx.fill();
  ctx.fillStyle=COL.mach2;rr(322,298,22,2.5,1.25);ctx.fill();rr(322,304,22,2.5,1.25);ctx.fill();
  ctx.fillStyle=COL.mach;rr(284,297,34,18,9);ctx.fill();
  dot(MOUTH.x-.5,MOUTH.y,5.2,COL.mouth);
  // лампочка: зелёная вспышка на выстрел, после @channel мигает красным
  var led=0;SHOTS.forEach(function(Sh){led=Math.max(led,1-seg(t,Sh.s,Sh.s+.14))});
  var red=t>=WIND&&t<LAST-.4;
  dot(357,309,2.6,red?(Math.sin(t*26)>0?COL.red:COL.mach2):(led>0?COL.green:COL.mach2));
  ctx.restore();

  // табличка над бункером: #general → @channel
  var fl=seg(t,WIND-.08,WIND+.08),sy=Math.abs(Math.cos(Math.PI*fl)),on=fl>=.5,lab=on?'@channel':'#general';
  var w=tw(lab,11.5,650)+18;
  ctx.save();ctx.translate(338+sh,203);ctx.scale(1+.12*bump(t,WIND+.08,WIND+.3),Math.max(.04,sy));
  ctx.fillStyle=on?COL.red:COL.pill;rr(-w/2,-11,w,22,11);ctx.fill();
  txt(lab,0,.5,11.5,on?'#fff':COL.pillInk,650,'center');
  ctx.restore();
}

function scene(t,plan){
  M0();
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  var jolt=2.6*wob(t-FLOOD,9,9)+1.2*wob(t-WIND,14,11);
  ctx.save();ctx.translate(0,jolt);

  ctx.save();ctx.shadowColor=COL.shadow;ctx.shadowBlur=40;ctx.shadowOffsetY=12;
  ctx.fillStyle=COL.card;rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(CARD.x+.5,CARD.y+.5,CARD.w-1,CARD.h-1,CARD.r-.5);ctx.stroke();

  // шапка канала
  txt('#',60,70,20,COL.sub,500);txt('general',75,70,20,COL.ink,700);
  var B=badgeAt(t,plan);
  if(B.sc>.01&&(unreadAt(t,plan)>.004||t>=BADGE0)){
    var bs=B.plus?'99+':String(Math.round(B.v)),bw=Math.max(24,tw(bs,13,650)+14),bx=75+tw('general',20,700)+10;
    ctx.save();ctx.translate(bx+bw/2,70);ctx.scale(B.sc,B.sc);
    ctx.fillStyle=COL.red;rr(-bw/2,-11.5,bw,23,11.5);ctx.fill();
    if(B.plus)txt('99+',0,.5,13,'#fff',650,'center');else rollNum(B.v,0,.5,13,'#fff',650,'center');
    ctx.restore();
  }
  var pre='Monday, 9:0',m=minuteAt(t);
  txt(pre,60,94,13,COL.sub,450);var mx=60+tw(pre,13,450);
  rollNum(m,mx,94,13,COL.sub,450);txt(' AM',mx+tw(String(Math.round(m)),13,450),94,13,COL.sub,450);
  // участники справа
  var ax=[310,324,338];['L','A','T'].forEach(function(w,i){
    ctx.fillStyle=COL.card;rr(ax[i]-1.5,59.5,21,21,6);ctx.fill();
    ctx.fillStyle=COL.av[PEOPLE[w][1]];rr(ax[i],61,18,18,5);ctx.fill();txt(w,ax[i]+9,70.5,10.5,'#fff',700,'center');
  });
  txt('14',372,70.5,13,COL.sub,500,'right');
  ctx.fillStyle=COL.line;ctx.fillRect(CARD.x,112,CARD.w,1);

  // поле ввода внизу: на нём стоит стол и копятся мячи
  ctx.strokeStyle=COL.line2;ctx.lineWidth=1;rr(52.5,452.5,327,39,11);ctx.stroke();
  txt('Message #general',66,472.5,13,COL.sub,450);
  ctx.fillStyle=COL.sub;ctx.beginPath();ctx.moveTo(356,466);ctx.lineTo(366,472.5);ctx.lineTo(356,479);ctx.lineTo(358.5,472.5);ctx.closePath();ctx.fill();

  ctx.save();rr(CARD.x,113,CARD.w,CARD.h-81,0);ctx.clip();
  drawTable();

  // мячи розыгрыша
  SHOTS.forEach(function(Sh){
    if(t<Sh.s)return;var h=plan.hit[Sh.k],q;
    if(t<Sh.arr||h===undefined){q=inPos(Sh,Math.min(t,Sh.arr));ball(q.x,q.y)}
    else if(h===true&&t-Sh.arr<1.1){q=outPos(Sh,t);ball(q.x,q.y)}
  });
  plan.group.balls.forEach(function(b){var q=gpos(b,t);if(q)ball(q.x,q.y)});
  drawMachine(t,plan);
  drawPaddle(paddleAt(t,plan));
  ctx.restore();

  // сообщения над мячами
  SHOTS.forEach(function(Sh){
    if(t<Sh.s)return;var h=plan.hit[Sh.k],q,al=1,sc=backOut(seg(t,Sh.s,Sh.s+.18));
    if(t<Sh.arr||h===undefined)q=inPos(Sh,Math.min(t,Sh.arr));
    else if(h===true){q=P;var f=seg(t,Sh.arr,Sh.arr+.08);al=1-f;sc*=1-.3*f}
    else{
      var gb=plan.group.balls.filter(function(b){return b.k===Sh.k})[0];q=gb&&gpos(gb,t)||P;
      al=1-seg(t,Sh.arr+.3,Sh.arr+.6);
    }
    if(al>0)bubble(q.x,q.y-23,Sh.who,Sh.msg,sc,al,false);
    if(h===true&&t>=Sh.arr&&t<Sh.arr+.6){
      var o=outPos(Sh,t);chip(o.x,o.y-21,backOut(seg(t,Sh.arr,Sh.arr+.16)),1-seg(t,Sh.arr+.36,Sh.arr+.58));
    }
  });
  // @channel над пушкой
  if(t>=WIND&&t<WIND+1.1){
    var up=eio(seg(t,WIND+.75,WIND+1.1));
    bubble(232,160-up*18,'M','@channel pls read ↓',backOut(seg(t,WIND,WIND+.22)),1-up,true);
  }
  // последний мяч
  var lb=plan.group.balls[plan.group.balls.length-1],lq=gpos(lb,t);
  if(lq&&t>=LAST+.08)bubble(lq.x,lq.y-26-22*seg(lq.y,330,366),'M','sorry, wrong channel 🙏',backOut(seg(t,LAST+.08,LAST+.3)),1,true);

  ctx.restore();
  var fade=Math.max(1-seg(t,0,.16),seg(t,CYCLE-.45,CYCLE));
  if(fade>0){ctx.globalAlpha=fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(plan){
  var E=[];
  SHOTS.forEach(function(Sh){
    E.push([Sh.s,'shot',Sh.k],[Sh.s+.03,'msg',Sh.k],[Sh.s+Sh.a,'tok',.75,-.35]);
    if(plan.hit[Sh.k]===true)E.push([Sh.arr,'pok',Sh.k],[Sh.arr+.04,'react',Sh.k],[Sh.arr+Sh.r,'tok',.55,.35]);
  });
  plan.sw.forEach(function(T){E.push([T-.05,'whiff'])});
  MIN.forEach(function(T,i){E.push([T,'tick',i])});
  E.push([WIND,'alert'],[FILL0,'whirr'],[FILL0,'fill']);
  E.push([FLOOD-.05,'rush']);for(var i=0;i<FN;i++)E.push([FLOOD+i*FDT,'pew',i]);
  var b0=unreadAt(BADGE0,plan),last=0;
  for(var tt=BADGE0;tt<PLUS;tt+=1/60){var v=Math.floor(b0+(99-b0)*Math.pow(seg(tt,BADGE0,PLUS),2.2));if(v>=last+4||(v>last&&v<12)){E.push([tt,'roll',v]);last=v}}
  E.push([PLUS,'plus'],[DROOP,'droop'],[DROOP+.36,'clack'],[LAST,'puff'],[LAST+.08,'sorry']);
  plan.group.ev.forEach(function(e){E.push(e)});
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Пушка стреляет по тому же расписанию, тап или пробел машет ракеткой. Успел к мячу, он улетает
   обратно с 👍, не успел, остаётся непрочитанным. Дальше всё равно приходит @channel. */
var AUTO,mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');liveReset()}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
function liveReset(){LV={t:0,last:nowS(),hit:[],sw:[]};LV.plan=mkPlan(LV.hit,LV.sw)}
function liveSwing(){
  if(mode!=='live')return;Sound.start();
  var V=LV;if(V.t>DROOP)return;
  if(V.sw.length&&V.t-V.sw[V.sw.length-1]<.16)return;
  V.sw.push(V.t);Sound.play([0,'whiff']);
}
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;
  var t0=V.t;V.t+=dt;var t=V.t,ch=false;
  SHOTS.forEach(function(Sh){
    if(V.hit[Sh.k]===undefined&&t>=Sh.arr){V.hit[Sh.k]=V.sw.some(function(T){return T>=Sh.arr-.18&&T<=Sh.arr+.01});ch=true}
  });
  if(ch){V.plan=mkPlan(V.hit,V.sw)}
  // взмахи уже звучат по тапу, из списка событий их убираем
  fireBetween(V.plan.events.filter(function(e){return e[1]!=='whiff'}),t0,t);
  if(t>=CYCLE){liveReset();return}
  scene(t,V.plan);
}
frameEl.addEventListener('pointerdown',function(e){if(mode==='live'&&e.button<=0){e.preventDefault();liveSwing()}});
addEventListener('keydown',function(e){if(mode==='live'&&e.code==='Space'){e.preventDefault();liveSwing()}});

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function render(u){scene(u,AUTO)}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(u);
    if(!REC&&!paused)fireBetween(AUTO.events,lastU,u,CYCLE);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else liveFrame();
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();liveStop();tryBtn.setAttribute('aria-pressed','false');paused=false;acc=0;lastU=0};
var tryBtn=document.getElementById('try');
tryBtn.onclick=function(){Sound.start();if(mode==='live'){liveStop();tryBtn.setAttribute('aria-pressed','false')}else{liveStart();tryBtn.setAttribute('aria-pressed','true')}tryBtn.blur()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){var on=!Sound.on;Sound.setOn(on);sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on))};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var base={ball:'#ff8a1f',ballHi:'#ffc58f',rubber:'#e2302b',rubberEdge:'#b51f1b',wood:'#d9a66b',woodDk:'#b98549'};
  COL=Object.assign(base,th==='dark'
    ?{bg:'#000000',card:'#1c1c1e',ink:'#f5f5f7',ink2:'#d8d8dc',sub:'#8d8d93',line:'#2c2c2f',line2:'#3a3a3e',red:'#ff453a',green:'#30d158',blue:'#4ea4ff',
      chip:'rgba(78,164,255,.16)',bubble:'#2c2c2e',bline:'#3a3a3d',bshadow:'rgba(0,0,0,.5)',menBg:'rgba(255,214,10,.2)',menInk:'#ffd60a',
      table:'#2f66b3',tableSide:'#244f8c',edge:'#e8e8ea',leg:'#3a3a3e',mesh:'rgba(255,255,255,.14)',post:'#8d8d93',
      mach:'#3a3a3e',mach2:'#4f4f55',mouth:'#111113',glass:'rgba(255,255,255,.05)',glassLine:'#4a4a4f',pill:'#f5f5f7',pillInk:'#0d0d0e',shadow:'rgba(0,0,0,0)',
      av:['#ff9f0a','#0a84ff','#30d158','#bf5af2','#ff375f','#64d2ff']}
    :{bg:'#f3f3f1',card:'#ffffff',ink:'#1d1d1f',ink2:'#3a3a3e',sub:'#8a8a8f',line:'#e6e6e9',line2:'#dcdce0',red:'#ff3b30',green:'#34c759',blue:'#0a7cff',
      chip:'rgba(10,124,255,.08)',bubble:'#ffffff',bline:'#e2e2e6',bshadow:'rgba(0,0,0,.09)',menBg:'#fff1bf',menInk:'#9a6a00',
      table:'#2b5ea7',tableSide:'#214a85',edge:'#ffffff',leg:'#cfcfd4',mesh:'rgba(0,0,0,.1)',post:'#5a5a60',
      mach:'#2a2a2d',mach2:'#45454a',mouth:'#0d0d0e',glass:'rgba(0,0,0,.035)',glassLine:'#d4d4d9',pill:'#1d1d1f',pillInk:'#ffffff',shadow:'rgba(0,0,0,.07)',
      av:['#ff9500','#0a7cff','#34c759','#af52de','#ff2d55','#32ade6']});
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
window.__renderAudio=function(){return Sound.renderLoop(AUTO.events,CYCLE,PH+1/60,CYCLE)};

function boot(){
  AUTO=autoPlan();
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',function(){fit();if(paused)render(uNow())});
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
