/* ─────────── Strike ───────────
   Список дел Today, десять задач. Строки по одной встают на попа и прыгают в треугольник в конце
   дорожки: кружок чекбокса становится головой кегли. Курсор оттягивает шар-галочку и отпускает.
   Страйк: девять кеглей разлетаются уже отмеченными, счётчик 9 of 10. Последняя, «do taxes»,
   шатается и стоит. Второй шар катится прямо в неё и в последний момент сваливается в жёлоб.
   Список собирается обратно: девять сделаны, а «do taxes» ложится строкой под Tomorrow.
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
function backOut(p,c){p=c01(p);c=c||1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ─────────── дорожка в перспективе ───────────
   xw в точках ближнего края, z глубина от 0 (ближний край кадра) до LEND (яма). */
var CX=216,H0=-80,YN=500,ZC=3;
function proj(xw,z){var k=ZC/(z+ZC);return{x:CX+xw*k,y:H0+(YN-H0)*k,k:k}}
var LP=1.75,DZ=.32,SX=64,PIH=110,PIW=36,LANE=150,GUT=17,BR=26,LEND=2.98;
var PINS=[];for(var r=0;r<4;r++)for(var j=0;j<=r;j++)PINS.push({xw:(j-r/2)*SX,z:LP+r*DZ});
var SURV=6;

/* ─────────── список ─────────── */
var CARD={x:36,y:32,w:360,h:476,r:22};
var ROWX=56,ROWW=320,ROWH=28;
function rowY(i){return 136+i*34}
function doneY(i){return 136+i*31}
var TMRW_Y=421,TROW_Y=454;
var BARW=[150,110,178,92,136,164,0,120,98,142];

/* ─────────── расписание ─────────── */
var T={hop0:.3,hopD:.055,hopL:.42,
       b1in:1.28,grab1:1.46,rel1:1.8,roll1:.68,
       b2in:3.3,grab2:3.5,rel2:3.82,roll2:.82,
       back:5.0,tom:5.3,end:9.4};
var CYCLE=T.end;
function hopAt(i){return T.hop0+i*T.hopD}

// шар 1: справа с подкруткой в «карман»; шар 2: прямо в последнюю кеглю и в жёлоб
function ballPath(n,t){
  var inT=n===1?T.b1in:T.b2in,gr=n===1?T.grab1:T.grab2,rl=n===1?T.rel1:T.rel2,dur=n===1?T.roll1:T.roll2;
  var x0=n===1?60:4,z0=.3,xb=x0+12,zb=.04;
  if(t<inT)return null;
  var o={sc:backOut(seg(t,inT,inT+.22)),gut:0,a:1,spin:0};
  if(t<gr){o.xw=x0;o.z=z0;return o}
  if(t<rl){var s=eio(seg(t,gr+.04,rl-.04));o.xw=mix(x0,xb,s);o.z=mix(z0,zb,s);return o}
  var p=seg(t,rl,rl+dur),z=zb+(LEND+.35-zb)*(p*(.82+.18*p));
  o.z=z;o.spin=z*5;
  if(n===1)o.xw=xb-(xb-8)*Math.pow(c01(z/LP),2)-6*c01((z-LP)/.8);
  else{o.xw=xb-170*Math.pow(c01(z/2.8),1.6);if(o.xw<-LANE){o.gut=c01((-LANE-o.xw)/10);o.xw=Math.max(o.xw,-LANE-GUT/2-1)}}
  o.a=1-seg(z,LEND+.05,LEND+.3);
  return o;
}
// когда шар 1 доходит до первой кегли и когда шар 2 падает в жёлоб
var HIT1=(function(){for(var t=T.rel1;t<T.rel1+1;t+=1/480){var b=ballPath(1,t);if(b.z>=LP-.12)return t}return T.rel1+.6})();
var GUTT=(function(){for(var t=T.rel2;t<T.rel2+1.2;t+=1/480){var b=ballPath(2,t);if(b.gut>0)return t}return T.rel2+.6})();
// разлёт кеглей
var FLY=(function(){var R=rng(11);return PINS.map(function(p,i){
  var side=p.xw===0?(R()<.5?-1:1):Math.sign(p.xw);
  return{t:HIT1+(p.z-LP)*.25+Math.abs(p.xw)*.0007+R()*.03,vx:side*(70+R()*150),vz:.7+R()*1.1,vh:260+R()*220,vr:side*(5+R()*8)}})})();
function doneAt(t){var n=0;FLY.forEach(function(f,i){if(i!==SURV&&t>=f.t+.04)n++});return n}

/* ─────────── состояние кадра из t ─────────── */
function stateAt(t){
  var o={};
  o.lane=seg(t,.15,.6)*(1-seg(t,T.back,T.back+.4));
  o.b1=ballPath(1,t);o.b2=ballPath(2,t);
  if(o.b1&&t>T.b2in)o.b1=null;
  o.done=doneAt(t);o.doneV=o.done;
  // плавный барабан счётчика: последний отмеченный докатывается
  FLY.forEach(function(f,i){if(i!==SURV){var d=t-f.t-.04;if(d>=-.12&&d<0)o.doneV+=0}});
  var d6=t-HIT1-.08;
  o.wob=.4*wob(d6,1.7,1.45)+.05*wob(t-GUTT-.2,6,7);
  o.tag=seg(t,HIT1+.5,HIT1+.7)*(1-seg(t,T.back,T.back+.2));
  o.cursor=cursorAt(t);
  o.fade=Math.max(1-seg(t,0,.16),seg(t,CYCLE-.4,CYCLE));
  return o;
}
function cursorAt(t){
  function grabPos(n){var b=ballPath(n,t)||ballPath(n,n===1?T.grab1:T.grab2),P=proj(b.xw,b.z);return{x:P.x+4,y:P.y-BR*P.k+2}}
  var rest={x:372,y:470},x=rest.x,y=rest.y,press=0,a=1,s;
  if(t<T.grab1-.3){}
  else if(t<T.grab1){var g=grabPos(1);s=eio(seg(t,T.grab1-.3,T.grab1));x=mix(rest.x,g.x,s);y=mix(rest.y,g.y,s)}
  else if(t<T.rel1){var g1=grabPos(1);x=g1.x;y=g1.y;press=1}
  else if(t<T.b2in+.1){var g2=proj(72,.04);s=eout(seg(t,T.rel1,T.rel1+.25));x=g2.x+4+s*30;y=g2.y-BR+2-s*60;s=eio(seg(t,T.rel1+.6,T.rel1+1.1));x=mix(x,rest.x,s);y=mix(y,rest.y,s)}
  else if(t<T.grab2){var g3=grabPos(2);s=eio(seg(t,T.grab2-.3,T.grab2));x=mix(rest.x,g3.x,s);y=mix(rest.y,g3.y,s)}
  else if(t<T.rel2){var g4=grabPos(2);x=g4.x;y=g4.y;press=1}
  else{var g5=proj(16,.04);s=eout(seg(t,T.rel2,T.rel2+.25));x=g5.x+4-s*10;y=g5.y-BR+2-s*60;s=eio(seg(t,T.rel2+.6,T.rel2+1.1));x=mix(x,rest.x,s);y=mix(y,rest.y,s)}
  a=1-seg(t,T.back,T.back+.3);
  return{x:x,y:y,press:press,a:a};
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
function rollNum(v,x,y,sz,col,wt){
  var n=Math.floor(v+1e-6),f=v-n,a=String(n),b=String(n+1),hh=sz*1.2;
  if(f<.002||a.length!==b.length){txt(f<.5?a:b,x,y,sz,col,wt,'right');return}
  ctx.save();ctx.beginPath();ctx.rect(x-30,y-hh/2,32,hh);ctx.clip();
  txt(a,x,y-f*hh,sz,col,wt,'right');txt(b,x,y+(1-f)*hh,sz,col,wt,'right');ctx.restore();
}

// строка списка и кегля это одна и та же капсула: длина вдоль оси, поворот 0 у строки и π/2 у кегли
function capsule(cx,cy,len,thk,ang,o){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);
  var rad=Math.min(thk/2,mix(8,thk/2,o.round));
  ctx.fillStyle=o.fill;rr(-len/2,-thk/2,len,thk,rad);ctx.fill();
  if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=1.2;rr(-len/2+.6,-thk/2+.6,len-1.2,thk-1.2,Math.max(0,rad-.6));ctx.stroke()}
  // чекбокс у левого края, у кегли это голова
  var cr=Math.min(9,thk*.32),cx0=-len/2+Math.max(cr+4,mix(18,thk*.5,o.round));
  if(o.checked){dot(cx0,0,cr,o.checkFill);ctx.save();ctx.translate(cx0,0);ctx.rotate(-ang);check(0,0,cr*1.1,'#fff',Math.max(1.2,cr*.2));ctx.restore()}
  else{ctx.strokeStyle=o.ring;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx0,0,cr,0,7);ctx.stroke()}
  if(o.text>0){
    ctx.globalAlpha*=o.text;
    if(o.label)txt(o.label,cx0+cr+10,.5,15,COL.ink,400);
    else{ctx.fillStyle=o.bar;rr(cx0+cr+10,-3.5,o.barW,7,3.5);ctx.fill();
      if(o.strike){ctx.fillStyle=COL.sub;ctx.fillRect(cx0+cr+7,-.6,o.barW+6,1.2)}}
  }
  ctx.restore();
}

function lane(a){
  if(a<=0)return;ctx.globalAlpha=a;
  var z0=0,z1=LEND,A=proj(-LANE-GUT,z0),B=proj(-LANE-GUT,z1),C2=proj(LANE+GUT,z1),D=proj(LANE+GUT,z0);
  ctx.fillStyle=COL.gutter;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C2.x,C2.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.fill();
  A=proj(-LANE,z0);B=proj(-LANE,z1);C2=proj(LANE,z1);D=proj(LANE,z0);
  ctx.fillStyle=COL.lane;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C2.x,C2.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.fill();
  // доски сходятся к горизонту
  ctx.strokeStyle=COL.board;ctx.lineWidth=1;
  for(var i=-3;i<=3;i++){if(!i)continue;var p0=proj(i*LANE/4,z0),p1=proj(i*LANE/4,z1);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke()}
  // яма за кеглями
  var Q0=proj(-LANE-GUT,z1),Q1=proj(-LANE-GUT,z1+.3),Q2=proj(LANE+GUT,z1+.3),Q3=proj(LANE+GUT,z1);
  ctx.fillStyle=COL.pit;ctx.beginPath();ctx.moveTo(Q0.x,Q0.y);ctx.lineTo(Q1.x,Q1.y);ctx.lineTo(Q2.x,Q2.y);ctx.lineTo(Q3.x,Q3.y);ctx.closePath();ctx.fill();
  // линия заступа и стрелки
  var f0=proj(-LANE,.3),f1=proj(LANE,.3);ctx.fillStyle=COL.mark;ctx.fillRect(f0.x,f0.y-1,f1.x-f0.x,2);
  for(var k=-3;k<=3;k++){var z=.95+Math.abs(k)*.07,p=proj(k*LANE/4.2,z),s=p.k;
    ctx.beginPath();ctx.moveTo(p.x,p.y-9*s);ctx.lineTo(p.x-5*s,p.y+3*s);ctx.lineTo(p.x+5*s,p.y+3*s);ctx.closePath();ctx.fill()}
  ctx.globalAlpha=1;
}

function ball(b){
  if(!b||b.a<=0)return;
  var P=proj(b.xw,b.z),r=BR*P.k*b.sc*(1-.12*b.gut),y=P.y-r+6*P.k*b.gut;
  ctx.globalAlpha=b.a;
  ctx.fillStyle=COL.shadowBall;ctx.beginPath();ctx.ellipse(P.x,P.y-1,r*.95,r*.28,0,0,7);ctx.fill();
  dot(P.x,y,r,COL.blue);
  ctx.save();ctx.translate(P.x,y);ctx.rotate(-b.spin);check(0,0,r*.95,'#fff',Math.max(1.6,r*.16));ctx.restore();
  ctx.globalAlpha=1;
}

function scene(t,o){
  M0();
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  ctx.save();ctx.shadowColor=COL.shadow;ctx.shadowBlur=40;ctx.shadowOffsetY=12;
  ctx.fillStyle=COL.card;rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(CARD.x+.5,CARD.y+.5,CARD.w-1,CARD.h-1,CARD.r-.5);ctx.stroke();

  // шапка
  txt('Today',64,80,24,COL.ink,700);
  var dn=o.done,cc=dn?COL.blue:COL.sub;
  txt(' of 10',368,81,15,cc,dn?600:400,'right');
  rollNum(o.doneV,368-tw(' of 10',15,dn?600:400),81,15,cc,dn?600:400);

  ctx.save();ctx.beginPath();rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.clip();
  lane(o.lane);

  // что рисовать: строки, прыгающие строки, кегли, шары; сортировка по глубине
  var items=[];
  PINS.forEach(function(p,i){
    var h0=hopAt(i),P=proj(p.xw,p.z),pw=PIW*P.k,ph=PIH*P.k,f=FLY[i];
    if(t<h0||t>=h0+T.hopL){
      if(t<h0){ // ещё строка в списке
        items.push({z:-10,fn:function(){capsule(ROWX+ROWW/2,rowY(i),ROWW,ROWH,0,{fill:COL.row,stroke:COL.rowLine,ring:COL.ring,round:0,text:1,label:i===SURV?'do taxes':null,bar:COL.ghost,barW:BARW[i]})}});
        return;
      }
      if(i===SURV){
        if(t>=T.tom)return;
        items.push({z:p.z,fn:function(){
          var w=o.wob;ctx.save();ctx.translate(P.x,P.y);ctx.rotate(w);
          capsule(0,-ph/2,ph,pw,Math.PI/2,{fill:COL.pin,stroke:COL.pinLine,ring:COL.ring,round:1,text:0});
          ctx.restore();
        }});return;
      }
      if(t<f.t){items.push({z:p.z,fn:function(){capsule(P.x,P.y-ph/2,ph,pw,Math.PI/2,{fill:COL.pin,stroke:COL.pinLine,ring:COL.ring,round:1,text:0})}});return}
      // отмеченная кегля летит в мире дорожки: вбок, назад и вверх, падает в яму
      var d=t-f.t;if(d>1.1)return;
      var zf=p.z+f.vz*d,hf=f.vh*d-1100*d*d,Pf=proj(p.xw+f.vx*d,zf);
      if(hf<0&&zf<LEND)hf=0;
      items.push({z:zf,fn:function(){
        var al=1-seg(d,.7,1.05);if(zf>LEND)al*=1-seg(-hf,0,60);if(al<=0)return;ctx.globalAlpha=al;
        var pwf=PIW*Pf.k,phf=PIH*Pf.k;
        ctx.save();ctx.translate(Pf.x,Pf.y-hf*Pf.k-phf/2);
        capsule(0,0,phf,pwf,Math.PI/2+f.vr*d,{fill:COL.blue,ring:'#fff',round:1,text:0,checked:true,checkFill:COL.blueDeep});
        ctx.restore();ctx.globalAlpha=1;
      }});
      return;
    }
    // прыжок: строка встаёт кеглей по дуге
    // сначала строка сжимается и встаёт, потом летит на место
    var s=eio(seg(t,h0+.06,h0+T.hopL)),q=eout(seg(t,h0,h0+.17)),qr=eio(seg(t,h0+.07,h0+.3)),cx=mix(ROWX+ROWW/2,P.x,s),cy=mix(rowY(i),P.y-ph/2,s)-Math.sin(Math.PI*s)*40;
    items.push({z:-5,fn:function(){capsule(cx,cy,mix(ROWW,ph,q),mix(ROWH,pw,qr),Math.PI/2*qr,{fill:mixc(COL.row,COL.pin,q),stroke:COL.pinLine,ring:COL.ring,round:q,text:1-seg(q,0,.4),label:i===SURV?'do taxes':null,bar:COL.ghost,barW:BARW[i]})}});
  });
  [o.b1,o.b2].forEach(function(b){if(b)items.push({z:b.z+.06,fn:function(){ball(b)}})});
  items.sort(function(a,b){return b.z-a.z});
  items.forEach(function(it){it.fn()});

  // ярлык над последней кеглей
  if(o.tag>0){
    var p6=PINS[SURV],Q=proj(p6.xw,p6.z),ty=Q.y-PIH*Q.k-20,s6='do taxes',w6=tw(s6,13,600)+18;
    ctx.globalAlpha=o.tag;ctx.save();ctx.translate(Q.x+Math.sin(o.wob)*PIH*Q.k,ty);
    ctx.fillStyle=COL.ink;rr(-w6/2,-12,w6,24,12);ctx.fill();
    ctx.beginPath();ctx.moveTo(-5,11);ctx.lineTo(0,17);ctx.lineTo(5,11);ctx.closePath();ctx.fill();
    txt(s6,0,.5,13,COL.card,600,'center');ctx.restore();ctx.globalAlpha=1;
  }

  // обратно в список: девять сделаны, «do taxes» ложится под Tomorrow
  if(t>=T.back){
    for(var i=0;i<10;i++){if(i===SURV)continue;var k=i<SURV?i:i-1,a=eout(seg(t,T.back+.1+k*.045,T.back+.4+k*.045));if(a<=0)continue;
      ctx.globalAlpha=a;capsule(ROWX+ROWW/2,doneY(k)-(1-a)*14,ROWW,ROWH,0,{fill:COL.row,stroke:COL.rowLine,ring:COL.ring,round:0,text:1,bar:COL.ghostDone,barW:BARW[i],checked:true,checkFill:COL.blue,strike:true});ctx.globalAlpha=1}
    var ta=eout(seg(t,T.tom+.1,T.tom+.35));
    if(ta>0){ctx.globalAlpha=ta;txt('Tomorrow',64,TMRW_Y,15,COL.ink,700);ctx.globalAlpha=1}
    if(t>=T.tom){
      // кегля долетает до места и только там ложится строкой
      var p7=PINS[SURV],Q7=proj(p7.xw,p7.z),s7=eio(seg(t,T.tom,T.tom+.5)),r7=eio(seg(t,T.tom+.32,T.tom+.52)),q7=eout(seg(t,T.tom+.46,T.tom+.66)),pw7=PIW*Q7.k,ph7=PIH*Q7.k;
      var cx7=mix(Q7.x,ROWX+ROWW/2,s7),cy7=mix(Q7.y-ph7/2,TROW_Y,s7)-Math.sin(Math.PI*s7)*60;
      var land=wob(t-T.tom-.66,9,4)*3;
      capsule(cx7,cy7+land,mix(ph7,ROWW,q7),mix(pw7,ROWH,r7),Math.PI/2*(1-r7),{fill:mixc(COL.pin,COL.row,q7),stroke:COL.rowLine,ring:COL.ring,round:1-q7,text:seg(q7,.6,1),label:'do taxes'});
    }
  }
  ctx.restore();

  var cu=o.cursor;if(cu&&cu.a>0){ctx.globalAlpha=cu.a;cursorShape(cu.x,cu.y,1.3*(1-.08*cu.press));ctx.globalAlpha=1}
  if(o.fade>0){ctx.globalAlpha=o.fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
}
function hex(c){var n=parseInt(c.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function mixc(a,b,t){var A=hex(a),B=hex(b);t=c01(t);return'rgb('+Math.round(mix(A[0],B[0],t))+','+Math.round(mix(A[1],B[1],t))+','+Math.round(mix(A[2],B[2],t))+')'}
function render(t){scene(t,stateAt(t))}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(){
  var E=[];
  for(var i=0;i<10;i++){E.push([hopAt(i),'hop',i],[hopAt(i)+T.hopL,'land',i])}
  E.push([T.b1in,'ballin'],[T.grab1,'grab'],[T.grab1+.04,'pull'],[T.rel1,'release'],[T.rel1+.02,'roll',T.roll1]);
  E.push([HIT1,'strike']);
  FLY.forEach(function(f,i){if(i!==SURV)E.push([f.t+.04,'tick',doneAtIdx(i)])});
  [.3,.66,1.02,1.36].forEach(function(dd,k){E.push([HIT1+.08+dd,'rock',k])});
  E.push([HIT1+.5,'tag']);
  E.push([T.b2in,'ballin'],[T.grab2,'grab'],[T.grab2+.04,'pull'],[T.rel2,'release'],[T.rel2+.02,'roll',T.roll2]);
  E.push([GUTT,'gutter'],[GUTT+.12,'womp'],[GUTT+.22,'shiver']);
  E.push([T.back+.1,'swish'],[T.tom,'hopback'],[T.tom+.66,'lie']);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
function doneAtIdx(i){var n=0;FLY.forEach(function(f,k){if(k!==SURV&&f.t<=FLY[i].t)n++});return n}
var EVENTS=buildEvents();
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Всё идёт само, но шар бросает зритель: время стоит перед каждым броском, пока не тапнут. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={t:0,last:nowS(),lastT:0,gate:0}}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
var GATES=[T.grab1-.32,T.grab2-.32];
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var V=LV;if(V.gate<2&&V.t>=GATES[V.gate]-.001)V.gate++;
});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;
  var lim=V.gate<2?GATES[V.gate]:Infinity;V.t=Math.min(lim,V.t+dt);
  var t=V.t;fireBetween(EVENTS,V.lastT,t);V.lastT=t;
  if(t>=CYCLE){V.t=0;V.lastT=0;V.gate=0;t=0}
  scene(t,stateAt(t));
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
    ?{bg:'#000000',card:'#1c1c1e',ink:'#f5f5f7',sub:'#8d8d93',line:'#2c2c2f',ghost:'#3a3a3e',ghostDone:'#2e2e32',blue:'#0a84ff',blueDeep:'#0060df',
      row:'#232326',rowLine:'#323236',pin:'#2c2c2f',pinLine:'#45454a',ring:'#6e6e74',lane:'#161618',board:'#202023',gutter:'#0b0b0c',pit:'#050506',mark:'#3a3a3e',
      shadowBall:'rgba(0,0,0,.5)',shadow:'rgba(0,0,0,0)'}
    :{bg:'#f3f3f1',card:'#ffffff',ink:'#1d1d1f',sub:'#8a8a8f',line:'#e6e6e9',ghost:'#e4e4e8',ghostDone:'#ededf0',blue:'#0a7cff',blueDeep:'#0060df',
      row:'#ffffff',rowLine:'#e4e4e8',pin:'#ffffff',pinLine:'#cfcfd5',ring:'#b9b9c0',lane:'#f2f2f4',board:'#e8e8ec',gutter:'#dcdce1',pit:'#d0d0d6',mark:'#d6d6dc',
      shadowBall:'rgba(0,0,0,.08)',shadow:'rgba(0,0,0,.07)'};
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
window.__HIT1=HIT1;window.__GUTT=GUTT;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
