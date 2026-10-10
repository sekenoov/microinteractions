/* ─────────── You pick ───────────
   Воскресенье, 12:04. «what do you want for lunch?», «idk, anything», и переписка буквально
   становится пинг-понгом. Сообщение летит к собеседнику мячиком, отскакивает от поля ввода
   как от стола, и тот отбивает его своим ответом. Каждый удар оставляет пузырь в истории,
   поэтому зигзаг переписки и есть след мяча. Розыгрыш ускоряется, ответы короче, пузырь
   сжимается до шарика «u», мимо пролетает весь день. Alex ловит мяч: «sushi?», то самое,
   от чего отказались первым. Выше в ленте прошлое воскресенье, такое же.
   Автопоказ рисуется из одного времени t, петля замыкается без шва. В живом режиме мяч
   ждёт у твоей стороны, пока не отобьёшь; не отбил, и он укатывается. */

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
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: z затухание, f частота в Гц
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

var LUNCH='what do you want for lunch?',IDK='idk, anything',FIRST='sushi?',HOUR0='12:04 PM';
// розыгрыш: кто отвечает (1 это я), что, и разделитель времени перед ответом
var RALLY=[
  [0,'no'],[1,'pizza?'],[0,'nah'],[1,'thai?'],[0,'eh'],[1,'ok you pick'],[0,'no you pick'],
  [1,'you pick','1:37 PM'],[0,'you pick'],[1,'no you'],[0,'you','3:12 PM'],[1,'you'],[0,'u'],
  [1,'u','5:48 PM'],[0,'u'],[1,'u'],[0,FIRST,'7:12 PM']
];

/* ─────────── геометрия, всё в точках экрана 402 × 874 ───────────
   Поле ввода работает столом: мяч отскакивает от его верхнего края */
var SW=402,SH=874,FS=21,BH=40,RX=20,MEX=382,GX=10,ROW=BH+GX,SEPH=40;
var FX=64,FW=324,FH=46,FB=832,FT=FB-FH,FTX=FX+16,INSET=30,CB=FT-INSET,RY=CB-BH/2,TY=FT-BH/2,TOPY=146;
// длительность подачи: от первой к последней всё короче
var T0=.58,TMIN=.14,TK=.8,DROPT=2.6,DRAG=.9,BOUNCEX=(1-Math.exp(-.7*DRAG))/(1-Math.exp(-DRAG));
var TAIL=new Path2D('M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z');
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
var WHITE=[255,255,255];

var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),COL={},KDPR=1;
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt,ls){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
var MWC={};
function msgW(s){var v=MWC[s];if(v==null){setFont(FS);v=MWC[s]=ctx.measureText(s).width+30}return v}

/* ─────────── сценарий ───────────
   Пункты ленты: разделитель или сообщение. У сообщения время, когда под него открывается
   строка (tIn, dur), и время, с которого оно стоит в истории (show). Подача (vol) идёт
   от пузыря a к пузырю b: вылет t0, удар о стенку t1, ответ готов и улетает tm. */
function Round(){return{items:[],vols:[],ops:[],sends:[],prev:[],tRoll:null,end:0,drop:null}}
function add(R,o){if(!o.sep)o.w=msgW(o.s);R.items.push(o);return o}
function linkSep(sp,it){sp.tIn=it.tIn;sp.dur=it.dur;sp.ease=it.ease}
function relayout(list){var c=0;list.forEach(function(it){it.h=it.sep?SEPH:ROW;it.c=c;c+=it.h});return c}
function typeInto(R,str,t,dt,rnd){
  for(var i=0;i<str.length;i++){R.ops.push({t:t,s:str.slice(0,i+1),ch:str[i]});t+=dt*(.75+.5*rnd())+(str[i]===' '?dt*.4:0)}
  return t;
}
function textAt(R,t){var a=R.ops,lo=0,hi=a.length-1,k=-1;while(lo<=hi){var md=(lo+hi)>>1;if(a[md].t<=t){k=md;lo=md+1}else hi=md-1}return k<0?'':a[k].s}
function lastOpT(R,t){var k=-9;for(var i=0;i<R.ops.length&&R.ops[i].t<=t;i++)k=R.ops[i].t;return k}
function volT(k){return TMIN+(T0-TMIN)*Math.pow(TK,k)}
function apexH(T){return mix(9,82,sm((T-TMIN)/(T0-TMIN)))}
function volK(T){return mix(1.12,.82,c01((T-TMIN)/(T0-TMIN)))}

var TL={};
function buildRound(){
  var R=Round(),rnd=rng(7),t=.08,sp,it;
  t=typeInto(R,LUNCH,t,.0125,rnd);
  var tS=t+.1;R.ops.push({t:tS,s:''});R.sends.push(tS);
  sp=add(R,{sep:HOUR0});
  it=add(R,{me:1,s:LUNCH,kind:'send',tIn:tS,dur:.34,ease:'out',show:tS+.34});linkSep(sp,it);
  var tI=it.show+.06,tR=tI+.36;
  add(R,{me:0,s:IDK,kind:'recv',tIn:tI,dur:.28,ease:'out',show:tR});
  t=typeInto(R,FIRST,tR+.14,.036,rnd);
  var tS2=t+.1;R.ops.push({t:tS2,s:''});R.sends.push(tS2);
  it=add(R,{me:1,s:FIRST,kind:'send',tIn:tS2,dur:.34,ease:'out',show:tS2+.34});
  var a=R.items.length-1,td=it.show+.07;
  TL.SERVE=td;
  RALLY.forEach(function(L,k){
    var T=volT(k),fin=k===RALLY.length-1;
    sp=L[2]?add(R,{sep:L[2]}):null;
    // строка открывается сразу с ударом: пузырь уходит вверх, мяч вбок, они не стоят рядом
    it=add(R,{me:L[0],s:L[1],kind:fin?'catch':'rally',tIn:td,dur:Math.max(.08,.62*T),ease:'out'});
    if(sp)linkSep(sp,it);
    var v={a:a,b:R.items.length-1,k:k,t0:td,T:T,t1:td+T,fin:fin};
    v.tm=v.t1+(fin?.46:clamp(.2*T,.03,.075));it.show=v.tm;td=v.tm;
    R.vols.push(v);a=v.b;
  });
  TL.CATCH=R.vols[R.vols.length-1].t1;
  R.tRoll=td+1.45;R.end=R.tRoll+.42;
  R.HW=relayout(R.items);
  R.events=buildEvents(R);
  return R;
}

/* ─────────── прокрутка: строки открываются под новые сообщения ─────────── */
function prog(it,t){
  if(it.tIn==null||it.tIn===-Infinity)return 1;
  var x=seg(t,it.tIn,it.tIn+it.dur);return it.ease==='sm'?sm(x):1-Math.pow(1-x,2.4);
}
function scrollP(R,t){var P=0;for(var i=0;i<R.items.length;i++)P+=R.items[i].h*prog(R.items[i],t);return P}

/* ─────────── полёт мяча ───────────
   Подача: от пузыря вверх дугой, отскок от стола на половине принимающего, подъём к его
   стенке. Высота дуги задана, ускорение подбирается под время подачи: быстрые плоские. */
function flight(v,xA,xE,tau){
  var T=v.T,T1=.7*T,T2=T-T1,h=apexH(T),d1=TY-RY;
  var g=Math.pow((Math.sqrt(2*h)+Math.sqrt(2*h+2*d1))/T1,2),vy1=-Math.sqrt(2*g*h);
  // мяч слетает с ракетки быстро и чуть тормозит воздухом, поэтому сразу отходит от пузыря
  var k=DRAG/T,nk=1-Math.exp(-k*T),ek=Math.exp(-k*tau),x=xA+(xE-xA)*(1-ek)/nk,vx=(xE-xA)*k*ek/nk,y,vy;
  if(tau<T1){y=RY+vy1*tau+.5*g*tau*tau;vy=vy1+g*tau}
  else{var u=tau-T1,vy2=(-d1-.5*g*T2*T2)/T2;y=TY+vy2*u+.5*g*u*u;vy=vy2+g*u}
  return{x:x,y:y,vx:vx,vy:vy,T1:T1};
}
function sideX(me,w){return me?MEX-w/2:RX+w/2}

/* ─────────── отрисовка ─────────── */
function rgb(c,a){return a==null?'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')':'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+a.toFixed(3)+')'}
function mixc(a,b,t){return[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)]}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function bubble(x,y,w,h,me,col,tail){
  ctx.fillStyle=col;rr(x,y,w,h,Math.min(20,h/2));ctx.fill();
  if(tail>0){
    ctx.save();ctx.globalAlpha*=tail;
    if(me){ctx.translate(x+w+6,y+h-20);ctx.scale(-1,1)}else ctx.translate(x-6,y+h-20);
    ctx.fill(TAIL);ctx.restore();
  }
}
function textMsg(x,y,s,me,tail){
  var w=msgW(s);bubble(x,y,w,BH,me,me?COL.blue:COL.recv,tail);
  setFont(FS);ctx.fillStyle=me?'#fff':COL.ink;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(s,x+15,y+BH/2+1);
}
function ballShape(x,y,w,sx,sy,rot,bg,tail,tailMe,texts){
  ctx.save();ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.scale(sx,sy);
  bubble(-w/2,-BH/2,w,BH,tailMe,bg,tail);
  setFont(FS);ctx.textBaseline='middle';ctx.textAlign='center';
  for(var i=0;i<texts.length;i++){var q=texts[i];if(q[1]<=.01)continue;ctx.globalAlpha=q[1];ctx.fillStyle=q[2];ctx.fillText(q[0],0,1)}
  ctx.restore();
}
function sepText(y,head,time,op){
  if(op<=.004)return;
  ctx.save();ctx.globalAlpha=op;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=COL.sub;
  setFont(13,600,0);var w1=ctx.measureText(head).width;setFont(13,400,0);var rest=' '+time,w2=ctx.measureText(rest).width,x=SW/2-(w1+w2)/2;
  setFont(13,600,0);ctx.fillText(head,x,y);setFont(13,400,0);ctx.fillText(rest,x+w1,y);
  ctx.restore();
}
// подписи времени: в этой неделе Today, в прошлых Sunday; на шве петли Today гаснет, Sunday проявляется
function drawSep(y,it,R,t){
  var ty=y+25;
  if(!R){sepText(ty,'Sunday',it.sep,1);return}
  var a=prog(it,t);if(a<=.004)return;
  var r0=R.tRoll!=null?1-sm(seg(t,R.tRoll,R.tRoll+.16)):1,r1=R.tRoll!=null?sm(seg(t,R.tRoll+.18,R.tRoll+.34)):0;
  sepText(ty,'Today',it.sep,a*r0);sepText(ty,'Sunday',it.sep,a*r1);
}
// Alex печатает: пилюля с тремя точками и хвостиком из двух кружков
function drawDots(top,dt){
  var sc=clamp(spring(dt,.62,4.2),0,1.2),px=RX,py=top+BH;
  ctx.save();ctx.translate(px,py);ctx.scale(sc,sc);ctx.translate(-px,-py);
  ctx.fillStyle=COL.recv;rr(RX,top,64,BH,20);ctx.fill();
  ctx.beginPath();ctx.arc(RX+3,top+BH-4,6.5,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(RX-4,top+BH+3.5,3.2,0,7);ctx.fill();
  for(var i=0;i<3;i++){
    var ph=((dt*1.9-i*.2)%1+1)%1,b=Math.max(0,Math.sin(Math.PI*c01(ph/.55)));
    ctx.fillStyle=COL.dot;ctx.globalAlpha=.4+.6*b;ctx.beginPath();ctx.arc(RX+19+i*13,top+BH/2-1.4*b,4.6,0,7);ctx.fill();
  }
  ctx.restore();
}
function popMsg(x,top,it,dt){
  var sc=clamp(spring(dt,.55,3.6),0,1.3);if(sc<=.002)return;
  var px=it.me?x+it.w:x,py=top+BH;
  ctx.save();ctx.translate(px,py);ctx.scale(sc,sc);ctx.translate(-px,-py);textMsg(x,top,it.s,it.me,1);ctx.restore();
}

var FLYS=[];
function drawItems(list,base,P,t,R){
  for(var i=list.length-1;i>=0;i--){
    var it=list[i],y=CB+base+it.c-P;
    if(y+it.h<TOPY-30)break;
    if(y>SH)continue;
    if(it.sep){drawSep(y,it,R,t);continue}
    var top=y+GX,x=it.me?MEX-it.w:RX;
    if(!R){textMsg(x,top,it.s,it.me,1);continue}
    if(it.tIn!==-Infinity&&t<it.tIn)continue;
    if(it.kind==='send'){if(t<it.show)FLYS.push([it,top]);else textMsg(x,top,it.s,1,1);continue}
    if(it.kind==='recv'){if(t<it.show)drawDots(top,t-it.tIn);else popMsg(x,top,it,t-it.show);continue}
    if(it.kind==='late'){if(t>=it.show)popMsg(x,top,it,t-it.show);continue}
    // ответ проявляется под улетающим мячом, иначе на миг видно два одинаковых пузыря
    if(t>=it.show){var fa=it.kind==='rally'?sm(seg(t,it.show,it.show+.09)):1;if(fa<1){ctx.save();ctx.globalAlpha=fa;textMsg(x,top,it.s,it.me,1);ctx.restore()}else textMsg(x,top,it.s,it.me,1)}
  }
}
// отправленное вылетает из поля ввода в свою строку
function drawFly(it,top,t){
  var e=eout(seg(t,it.tIn,it.show)),x=mix(FTX-15,MEX-it.w,e),y=mix(FT+3,top,e),a=sm(e*2.4);
  bubble(x,y,it.w,BH,true,rgb(COL.blueC,a),a);
  setFont(FS);ctx.fillStyle=rgb(mixc(COL.inkC,WHITE,a));ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(it.s,x+15,y+BH/2+1);
}

function drawComposer(R,t){
  var s=textAt(R,t);
  ctx.fillStyle=COL.card;ctx.fillRect(0,FT-8,SW,SH-FT+8);
  ctx.fillStyle=COL.plus;ctx.beginPath();ctx.arc(35,FB-23,21,0,7);ctx.fill();
  ctx.strokeStyle=COL.sub;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(35,FB-28.5);ctx.lineTo(35,FB-17.5);ctx.moveTo(29.5,FB-23);ctx.lineTo(40.5,FB-23);ctx.stroke();
  ctx.fillStyle=COL.card;rr(FX,FT,FW,FH,23);ctx.fill();
  ctx.strokeStyle=COL.line;ctx.lineWidth=.75;rr(FX+.375,FT+.375,FW-.75,FH-.75,22.6);ctx.stroke();
  setFont(FS);ctx.textBaseline='middle';ctx.textAlign='left';
  var ty=FT+FH/2+1;
  if(!s.length){ctx.fillStyle=COL.sub2;ctx.fillText('iMessage',FTX,ty);drawMic(FX+FW-23,FB-23)}
  else{
    ctx.fillStyle=COL.ink;ctx.fillText(s,FTX,ty);
    var lt=lastOpT(R,t),on=t-lt<.45||((t-lt)%1.1)<.55;
    if(on){ctx.fillStyle=COL.blue;rr(FTX+ctx.measureText(s).width+1,ty-13.5,2,25,1);ctx.fill()}
  }
  // отправить
  var pr=0,gone=1;
  R.sends.forEach(function(ts){pr=Math.max(pr,pulse(t,ts-.06,ts+.01));if(t>=ts&&t<ts+.14)gone=Math.min(gone,seg(t,ts,ts+.14))});
  if(s.length||gone<1){
    var op=s.length?1:1-gone,sc=1-.14*pr;
    ctx.save();ctx.globalAlpha=op;ctx.translate(FX+FW-22,FB-22);ctx.scale(sc,sc);
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

/* мяч: в полёте тянется по скорости и наклоняется по дуге, на столе сплющивается,
   у стенки принимающего сжимается и перекрашивается в его ответ */
function drawBall(R,t,hd){
  if(R.drop){drawDrop(R,t);return}
  var v=null;for(var k=0;k<R.vols.length;k++){var q=R.vols[k];if(t>=q.t0&&t<q.tm){v=q;break}}
  if(!v)return;
  var A=R.items[v.a],B=R.items[v.b],wA=A.w,wB=B.w;
  var cA=A.me?COL.blueC:COL.recvC,cB=B.me?COL.blueC:COL.recvC,iA=A.me?WHITE:COL.inkC,iB=B.me?WHITE:COL.inkC;
  var xA=sideX(A.me,wA),xE=sideX(B.me,wA);
  if(t<v.t1){
    var tau=t-v.t0,F=flight(v,xA,xE,tau);
    var sp=Math.hypot(F.vx,F.vy),st=Math.min(.2,sp/8500)*clamp(64/wA,.35,1);
    var kt=Math.exp(-Math.abs(tau-F.T1)/.016),kd=Math.exp(-tau/.035);
    var rot=clamp(Math.atan(F.vy/F.vx)*.3,-.22,.22)*(1-kt)*(1-kd);
    var kq=clamp(64/wA,.5,1),sx=(1+st)*(1+.14*kt)*(1+.07*kd*kq),sy=(1-.2*kt)/((1+st)*(1+.05*kd*kq));
    ballShape(F.x,F.y+(BH/2)*(1-sy)*kt,wA,sx,sy,rot,rgb(cA),0,false,[[A.s,1,rgb(iA)]]);
    return;
  }
  var q=t-v.t1,mu,kw;
  if(v.fin){kw=.7*Math.sin(Math.PI*c01(q/.13));mu=seg(q,.22,.42)}
  else{mu=c01(q/(v.tm-v.t1));kw=Math.sin(Math.PI*mu)}
  var by=0,sx=1-.16*kw,sy=1+.07*kw;
  // живой режим: мяч ждёт у твоей стенки и чуть дышит
  if(hd!=null){mu=0;var ph=Math.sin(2*Math.PI*1.25*hd);sx=1-.02*ph;sy=1+.03*ph;by=-1.5*ph}
  // перекраска почти мгновенная, на пике сжатия: плавный переход давал бледное пятно
  var w=mix(wA,wB,eio(seg(mu,.2,.8))),x=B.me?MEX-w*sx/2:RX+w*sx/2;
  ballShape(x,RY+by,w,sx,sy,0,rgb(mixc(cA,cB,sm(seg(mu,.42,.58)))),sm(seg(mu,.5,1)),B.me,
    [[A.s,1-seg(mu,.38,.5),rgb(iA)],[B.s,seg(mu,.5,.64),rgb(iB)]]);
}
// не отбил: мяч падает на стол, подпрыгивает и укатывается за край
function dropAt(D,q){
  var y=TY,b=D.b;
  if(q<b[0].t)y=RY+.5*D.g*q*q;
  else for(var i=0;i<b.length;i++){var s=b[i],nx=b[i+1];if(!nx||q<nx.t){var u=q-s.t;y=s.v?Math.min(TY,TY-s.v*u+.5*D.g*u*u):TY;break}}
  return y;
}
function drawDrop(R,t){
  var D=R.drop,q=t-D.t0;if(q<0)return;
  var x=D.x0+D.vx*Math.max(0,q-.12);if(x-D.w/2>SW+6)return;
  var y=dropY(D,q),rot=Math.max(0,q-.12)*D.vx*.004;
  ballShape(x,y,D.w,1,1,rot,rgb(D.c),0,false,[[D.s,1,rgb(D.i)]]);
}
function dropY(D,q){var y=dropAt(D,q);var xr=D.x0+D.vx*Math.max(0,q-.12)-D.w/2;if(xr>FX+FW-6){var u=(xr-(FX+FW-6))/D.vx;y+=.5*D.g*u*u}return y}

function render(R,t,hd){
  ctx.setTransform(KDPR,0,0,KDPR,0,0);
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,SH);
  var P=scrollP(R,t);FLYS.length=0;
  drawItems(R.items,0,P,t,R);
  var base=0;
  for(var w=0;w<R.prev.length;w++){base-=R.prev[w].HW;if(CB+base+R.prev[w].HW-P<TOPY-30)break;drawItems(R.prev[w].items,base,P,t,null)}
  drawComposer(R,t);
  FLYS.forEach(function(f){drawFly(f[0],f[1],t)});
  drawBall(R,t,hd);
  setClock(clockAt(R,t));
}

/* часы в строке статуса идут вместе с разделителями */
var clockEl=document.getElementById('clock'),clockS='';
function clockAt(R,t){
  if(R.tRoll!=null&&t>=R.tRoll+.2)return'12:04';
  var s='12:04';
  for(var i=0;i<R.items.length;i++){var it=R.items[i];if(it.sep&&(it.tIn===-Infinity||t>=it.tIn))s=it.sep.replace(/ [AP]M$/,'')}
  return s;
}
function setClock(s){if(s!==clockS){clockS=s;clockEl.textContent=s}}

/* ─────────── звук: события круга [время, тип, …] ─────────── */
function panX(x){return clamp((x/SW-.5)*.8,-.6,.6)}
function buildEvents(R){
  var E=[],lastK=-9;
  R.ops.forEach(function(o,i){if(o.ch!=null){E.push([o.t,'key',i,clamp((o.t-lastK)/.07,.3,1)]);lastK=o.t}});
  R.sends.forEach(function(ts){E.push([ts-.04,'press']);E.push([ts+.01,'send'])});
  R.items.forEach(function(it){
    if(it.kind==='recv'){E.push([it.tIn+.02,'dots']);E.push([it.show,'recv'])}
    if(it.kind==='late')E.push([it.show,'recv']);
  });
  R.vols.forEach(function(v){
    var A=R.items[v.a],B=R.items[v.b],kk=volK(v.T),xA=sideX(A.me,A.w),xE=sideX(B.me,A.w);
    if(v.k===0)E.push([v.t0,'pok',A.me?.35:-.35,kk]);
    E.push([v.t0+.7*v.T,'tik',panX(mix(xA,xE,BOUNCEX)),kk*.9]);
    if(v.fin){E.push([v.t1,'catch',-.35]);E.push([v.t1+.3,'recv',-.3])}
    else E.push([v.t1,'pok',B.me?.35:-.35,kk,v.k,B.me?1:0]);
  });
  if(R.drop)R.drop.b.forEach(function(s,i){E.push([R.drop.t0+s.t,'tik',.3,[.85,.5,.28,.16][i]||.1])});
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
function fire(R,u0,u1){
  R.events.forEach(function(ev){
    if(!(ev[0]>u0&&ev[0]<=u1))return;
    // живой режим: удар с твоей стороны звучит по твоему тапу, а не по сценарию
    if(mode==='live'&&ev[1]==='pok'&&ev[5]===1&&!LV.pre[ev[4]])return;
    Sound.play(ev);
  });
}
function fireAuto(u0,u1){
  if(u1<u0){fire(AUTO,u0,CYCLE+1e-9);u0=-1e-9}
  fire(AUTO,u0,u1);
}

/* ─────────── живой режим ───────────
   Тот же сценарий, но мяч, прилетевший на твою сторону, ждёт тапа. Отбил: розыгрыш дальше
   и быстрее. Не отбил за пару секунд: мяч укатывается, Alex пишет «sushi?». */
var mode='auto',LV=null,AUTO=null,CYCLE=9;
function nowS(){return performance.now()/1000}
function weekOf(R){return{items:R.items,HW:R.HW}}
function goLive(n){
  var u=uNow(),R=buildRound();R.prev=AUTO.prev;
  LV={R:R,off:n-u,hang:null,pre:{},last:u};mode='live';
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0}
function tap(){
  Sound.start();
  var n=nowS();
  if(REC)return;
  if(mode!=='live')goLive(n);
  var R=LV.R;
  if(LV.hang){
    var v=LV.hang.v;LV.off+=n-LV.hang.since;LV.hang=null;LV.pre[v.k]=true;
    Sound.play([0,'pok',.35,volK(v.T)]);return;
  }
  // мяч ещё летит к тебе: ранний удар засчитывается
  var tau=n-LV.off;
  R.vols.forEach(function(v){if(R.items[v.b].me&&tau>=v.t0&&tau<v.t1&&v.t1-tau<.32)LV.pre[v.k]=true});
}
function startDrop(n){
  var R=LV.R,v=LV.hang.v,A=R.items[v.a],B=R.items[v.b],nr=Round(),bi=R.items.indexOf(B),hadSep=R.items[bi-1]&&R.items[bi-1].sep&&R.items[bi-1].tIn===B.tIn;
  // всё, что уже было, стоит; строка под твой ответ открыта, в неё садится «sushi?»
  for(var i=0;i<bi;i++){var o=Object.assign({},R.items[i]);o.tIn=-Infinity;o.show=-Infinity;if(o.kind)o.kind='rally';nr.items.push(o)}
  var t0=.15,tS=t0+1.05;
  if(!hadSep)nr.items.push({sep:'7:12 PM',tIn:tS-.32,dur:.3,ease:'out'});
  nr.items.push({me:0,s:FIRST,w:msgW(FIRST),kind:'late',tIn:-Infinity,show:tS});
  var g=2600,b=[],tt=Math.sqrt(2*(TY-RY)/g),vv=g*tt;
  for(var k=0;k<4;k++){vv*=.42;b.push({t:tt,v:vv});tt+=2*vv/g}
  b.push({t:tt,v:0});
  nr.drop={t0:t0,x0:sideX(true,A.w),w:A.w,s:A.s,c:A.me?COL.blueC:COL.recvC,i:A.me?WHITE:COL.inkC,vx:150,g:g,b:b};
  nr.tRoll=tS+1.7;nr.end=nr.tRoll+.42;nr.prev=R.prev;nr.HW=relayout(nr.items);nr.events=buildEvents(nr);
  LV.R=nr;LV.hang=null;LV.pre={};LV.off=n;LV.last=0;
}
function nextRound(n,over){
  var old=LV.R,R=buildRound();R.prev=[weekOf(old)].concat(old.prev).slice(0,3);
  LV.R=R;LV.off=n-over;LV.last=-1e-9;LV.pre={};LV.hang=null;
}
function liveFrame(n){
  var R=LV.R;
  if(LV.hang){
    var hd=n-LV.hang.since;
    if(hd>DROPT){startDrop(n);liveFrame(n);return}
    render(R,LV.hang.v.t1,hd);return;
  }
  var tau=n-LV.off;
  for(var k=0;k<R.vols.length;k++){
    var v=R.vols[k];
    if(R.items[v.b].me&&v.t1>LV.last&&v.t1<=tau&&!LV.pre[k]){
      fire(R,LV.last,v.t1);LV.last=v.t1;LV.hang={v:v,since:n-(tau-v.t1)};
      render(R,v.t1,n-LV.hang.since);return;
    }
  }
  fire(R,LV.last,tau);LV.last=tau;
  if(tau>=R.end){nextRound(n,tau-R.end);liveFrame(n);return}
  render(R,tau);
}

/* ввод */
var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),S=1;
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();tap()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();tap()}
});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Tap when it comes back':'Tap or Space when it comes back';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(AUTO,u);
    if(!REC)fireAuto(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else liveFrame(nowS());
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
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),sub2:g('--sub-2'),line:g('--line'),blue:g('--blue'),recv:g('--recv'),plus:g('--plus'),dot:g('--dot'),
       blueC:hexc(g('--blue')),recvC:hexc(g('--recv')),inkC:hexc(g('--ink'))};
  if(AUTO&&LV&&LV.R.drop){var D=LV.R.drop;D.c=COL.recvC;D.i=COL.inkC}
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  zoom.style.transform='none';
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?(hh-40)/846:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  zoom.style.transform='scale('+S.toFixed(4)+')';
  KDPR=S*Math.min(3,devicePixelRatio||1);
  var bw=Math.round(SW*KDPR),bh=Math.round(SH*KDPR);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  KDPR=bw/SW;
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(AUTO,uNow())};
window.__renderAudio=function(){return Sound.renderLoop(AUTO.events,CYCLE,PH+1/60,CYCLE)};

function boot(){
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();
  AUTO=buildRound();CYCLE=AUTO.end;
  var wk=weekOf(AUTO);AUTO.prev=[wk,wk,wk];
  TL.ROLL=AUTO.tRoll;TL.CYCLE=CYCLE;TL.VOL=AUTO.vols.map(function(v){return[+v.t0.toFixed(3),+v.t1.toFixed(3),AUTO.items[v.b].s]});
  window.__TL=TL;
  addEventListener('resize',fit);
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(AUTO,((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
