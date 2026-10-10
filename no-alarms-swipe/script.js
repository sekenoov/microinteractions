/* ─────────── No alarms ───────────
   Суббота, без восьми полночь. В часах восемь будильников: 6:00, 6:05, 6:10 и дальше.
   Палец проводит вниз по колонке переключателей, как по струнам: каждый выключается своей нотой,
   нисходящая пентатоника, разделители дрожат, как задетые струны, «Next alarm in» перекручивается.
   Последний, 7:00 «dog, every day», выключаться отказывается: ручка едет и пружиной возвращается.
   Тап ещё раз: мотает головой. Потом воскресенье: палец ведёт вверх, всё включается обратно, в миноре.
   Переключатели это пружины. Автопоказ считается один раз заранее с шагом 1/240 с и проигрывается
   по t, поэтому петля замыкается без шва. В живом режиме та же функция шага идёт в реальном времени. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0),DBG=QS.has('dbg');
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
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function pad(m){return (m<10?'0':'')+m}

var ROWS=[
  {h:6,m:0,l:'Alarm'},
  {h:6,m:5,l:'wake up'},
  {h:6,m:10,l:'WAKE UP'},
  {h:6,m:15,l:'snooze is not a plan'},
  {h:6,m:20,l:'last one'},
  {h:6,m:25,l:'ok actually last one'},
  {h:6,m:30,l:'you’re late'},
  {h:7,m:0,l:'dog, every day'}
];
var N=ROWS.length,DOG=N-1,NOW=23*60+52;   // на часах 11:52 PM

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,LT=174,RH=76,TGX=322,TGW=64,TGH=28,KW=38,KH=24,TRAV=TGW-4-KW,ZONE=250;
function rowY(i){return LT+i*RH}
function tgY(i){return rowY(i)+38}
function sepY(j){return LT+j*RH}          // j = 0 линия над первой строкой, j = i+1 под строкой i

var zoom=document.getElementById('zoom'),screenEl=document.getElementById('screen'),list=document.getElementById('list');
var sepsEl=document.getElementById('seps'),touchEl=document.getElementById('touch');

var RW=ROWS.map(function(r,i){
  var li=h('li','row');li.style.top=rowY(i)+'px';
  var tm=h('span','tm');tm.appendChild(document.createTextNode(r.h+':'+pad(r.m)));tm.appendChild(h('small',null,'AM'));
  var lb=h('span','lb',r.l);
  var tg=h('span','tg'),kn=h('span','kn'),clip=h('span','clip'),lens=h('span','lens'),face=h('span','face');
  tg.setAttribute('role','switch');tg.setAttribute('aria-checked','true');tg.setAttribute('aria-label',r.h+':'+pad(r.m)+' AM, '+r.l);
  clip.appendChild(lens);kn.appendChild(clip);kn.appendChild(face);tg.appendChild(kn);
  li.appendChild(tm);li.appendChild(lb);li.appendChild(tg);list.appendChild(li);
  return {tm:tm,lb:lb,tg:tg,kn:kn,lens:lens,face:face,on:true};
});
var SEPS=[];
for(var j=0;j<=N;j++){var p=document.createElementNS('http://www.w3.org/2000/svg','path');sepsEl.appendChild(p);SEPS.push(p)}

/* одометр в подзаголовке: часы, десятки минут (схлопываются, когда ноль), единицы */
function mkDigit(n){var d=h('span','dg'),c=h('span','col');for(var i=0;i<=n;i++)c.appendChild(h('i',null,String(i%n)));d.appendChild(c);return {el:d,col:c,n:n}}
var DH=mkDigit(10),DT=mkDigit(6),DO=mkDigit(10),DW=8.6,subSr=document.getElementById('subsr');
document.getElementById('oh').appendChild(DH.el);
var om=document.getElementById('om');om.appendChild(DT.el);om.appendChild(DO.el);

/* ─────────── модель ───────────
   У каждого переключателя пружина k (1 включён, 0 выключен), стекло g (палец рядом),
   яркость текста d. Палец, пересекая центр переключателя вниз, выключает его, вверх включает.
   Собака не выключается: пока палец тянет, ручка идёт к 0.4, потом пружина бросает её назад. */
var SPR={w:2*Math.PI*3.3,z:.66},REF={D:.17,K:.08};
function minsTo(i){return ROWS[i].h*60+ROWS[i].m+24*60-NOW}
function nextT(S){for(var i=0;i<N;i++)if(S.tg[i].K)return minsTo(i);return null}
function newState(t){
  var S={t:t||0,tg:[],sp:[],T:0,Tv:0,fp:null,ev:[]};
  for(var i=0;i<N;i++)S.tg.push({k:1,v:0,K:1,g:0,d:1,hold:-9,ref:-9,nope:-9});
  for(var j=0;j<=N;j++)S.sp.push([-9,0,350]);
  S.T=nextT(S);return S;
}
function flip(S,i,on,t){
  var o=S.tg[i];
  if(i===DOG&&!on){
    if(o.K===1&&t-o.ref>REF.D+.3){o.ref=t;o.hold=t+REF.D+.06;S.ev.push([t,'refuse',i],[t+REF.D,'snap',i])}
    return;
  }
  if(o.K===on)return;
  o.K=on;o.hold=t+.1;S.ev.push([t,on?'on':'off',i]);
}
function tapToggle(S,i,t){
  var o=S.tg[i];
  if(i===DOG&&o.K===1){o.nope=t;o.hold=t+.34;S.ev.push([t,'nope',i]);return}
  flip(S,i,o.K?0:1,t);
}
function stepSim(S,dt,F){
  var t=S.t+dt,P=S.fp||F,i;
  if(P.down&&F.down&&F.x>=ZONE-40){
    for(i=0;i<N;i++){var yc=tgY(i);if(P.y<yc&&F.y>=yc)flip(S,i,0,t);else if(P.y>yc&&F.y<=yc)flip(S,i,1,t)}
    for(var j=0;j<=N;j++){var ys=sepY(j);if((P.y<ys&&F.y>=ys)||(P.y>ys&&F.y<=ys))S.sp[j]=[t,F.y>P.y?1:-1,F.x]}
  }
  for(i=0;i<N;i++){
    var o=S.tg[i],near=F.down&&F.x>=ZONE&&Math.abs(F.y-tgY(i))<22,G=near||t<o.hold?1:0;
    o.g+=(G-o.g)*(1-Math.exp(-dt/(G>o.g?.03:.085)));
    var K=o.K,z=SPR.z,w=SPR.w,r=t-o.ref;
    if(r>=0&&r<REF.D){K=REF.K;z=.9}
    else if(r>=REF.D&&r<REF.D+1.4){z=.36;w=SPR.w*1.12}
    var a=w*w*(K-o.k)-2*z*w*o.v;o.v+=a*dt;o.k+=o.v*dt;
    o.d+=(o.K-o.d)*(1-Math.exp(-dt/.09));
  }
  var Tt=nextT(S);
  if(Tt!=null){var wT=2*Math.PI*2.3,aT=wT*wT*(Tt-S.T)-2*wT*S.Tv;S.Tv+=aT*dt;S.T+=S.Tv*dt}
  S.t=t;S.fp={x:F.x,y:F.y,down:F.down};
}
function snap(S){
  return {k:S.tg.map(function(o){return o.k}),v:S.tg.map(function(o){return o.v}),g:S.tg.map(function(o){return o.g}),
    d:S.tg.map(function(o){return o.d}),nope:S.tg.map(function(o){return o.nope}),T:S.T,sp:S.sp.map(function(s){return s.slice()}),full:S.tg.map(function(o){return Object.assign({},o)}),Tv:S.Tv};
}

/* ─────────── сценарий петли ─────────── */
var TL={
  D0:-.12,                                       // палец касается над первым переключателем
  C:[.02,.125,.222,.313,.398,.48,.562,.672],     // пересечения центров, последний это собака
  E:.8,L:.88,                                    // палец дожимает собаку и отпускает
  TAP:1.08,TAPL:1.17,                            // второй раз: тап по собаке
  PAN0:.04,PAN1:.86,PB0:1.7,PB1:2.38,            // камера едет за пальцем, даёт прочитать собаку и отъезжает на весь телефон
  U0:3.06,UC:[3.15,3.25,3.345,3.435,3.52,3.6,3.675],UE:3.78,UL:3.84,  // воскресенье: вверх от 6:30 до 6:00
  ZI0:4.04,ZI1:4.7,CYCLE:4.94
};
var CYCLE=TL.CYCLE;

/* монотонный кубический сплайн по точкам (t, y) */
function spline(P){
  var n=P.length,d=[],m=[];
  for(var i=0;i<n-1;i++)d.push((P[i+1][1]-P[i][1])/(P[i+1][0]-P[i][0]));
  m[0]=d[0];m[n-1]=d[n-2];
  for(i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue}var a=m[i]/d[i],b=m[i+1]/d[i],s=a*a+b*b;if(s>9){var q=3/Math.sqrt(s);m[i]=q*a*d[i];m[i+1]=q*b*d[i]}}
  return function(t){
    if(t<=P[0][0])return P[0][1];if(t>=P[n-1][0])return P[n-1][1];
    var k=0;while(t>P[k+1][0])k++;
    var hh=P[k+1][0]-P[k][0],s=(t-P[k][0])/hh,s2=s*s,s3=s2*s;
    return (2*s3-3*s2+1)*P[k][1]+(s3-2*s2+s)*hh*m[k]+(-2*s3+3*s2)*P[k+1][1]+(s3-s2)*hh*m[k+1];
  };
}
var STRUM,UPS;
function buildPaths(){
  var P=[[TL.D0,tgY(0)-32]];TL.C.forEach(function(c,i){P.push([c,tgY(i)])});P.push([TL.E,tgY(DOG)+30]);
  var ys=spline(P);
  STRUM={a:TL.D0,b:TL.L,pos:function(u){var y=ys(u),q=seg(y,tgY(0)-32,tgY(DOG));return {x:366-8*q+1.5*Math.sin(q*9),y:y}}};
  var Q=[[TL.U0,tgY(6)+30]];TL.UC.forEach(function(c,k){Q.push([c,tgY(6-k)])});Q.push([TL.UE,tgY(0)-28]);
  var yu=spline(Q);
  UPS={a:TL.U0,b:TL.UL,pos:function(u){var y=yu(u),q=seg(y,tgY(6)+30,tgY(0)-28);return {x:358+6*q,y:y}}};
}
var TAPS={a:TL.TAP,b:TL.TAPL,pos:function(){return {x:TGX+50,y:tgY(DOG)+12}}};
function strokes(){return [STRUM,TAPS,UPS,{a:STRUM.a+CYCLE,b:STRUM.b+CYCLE,pos:function(u){return STRUM.pos(u-CYCLE)}}]}
/* палец: где он, касается ли, видно ли точку касания */
function fingerAuto(u){
  var best={x:350,y:tgY(0),down:false,vis:0,sc:1},bv=-1;
  strokes().forEach(function(s){
    var vis=sm(seg(u,s.a,s.a+.05))*(1-sm(seg(u,s.b,s.b+.14)));
    if(vis>bv){bv=vis;var p=s.pos(clamp(u,s.a,s.b));
      best={x:p.x,y:p.y,down:u>=s.a&&u<s.b,vis:vis,sc:1+.16*(1-sm(seg(u,s.a,s.a+.08)))+.22*sm(seg(u,s.b,s.b+.14))}}
  });
  return best;
}
function camAuto(u){
  var z=u<TL.PB0?1:u<TL.PB1?1-eio(seg(u,TL.PB0,TL.PB1)):u<TL.ZI0?0:eio(seg(u,TL.ZI0,TL.ZI1));
  var pan=u<TL.PB1+.01?eio(seg(u,TL.PAN0,TL.PAN1)):0;
  return {z:z,pan:pan};
}

/* сцена считается один раз: 240 кадров в секунду, с разгоном до нуля, чтобы конец петли совпал с началом */
var HZ=240,FR=[],EVENTS=[];
function precompute(){
  var W0=Math.round(.7*HZ),hh=1/HZ,S=newState(-W0*hh),tapped=false;
  S.fp=fingerAuto(-W0*hh);
  var nF=Math.round(CYCLE*HZ);
  for(var n=-W0+1;n<=nF;n++){
    var u=n*hh;
    if(!tapped&&u>=TL.TAP){tapToggle(S,DOG,TL.TAP);tapped=true}
    stepSim(S,hh,fingerAuto(u));S.t=u;
    if(n>=0)FR[n]=snap(S);
  }
  EVENTS=S.ev.filter(function(e){return e[0]>=0&&e[0]<CYCLE});
  [STRUM,TAPS,UPS].forEach(function(s){EVENTS.push([s.a<0?s.a+CYCLE:s.a,'touch'])});
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function frameAt(u){
  var x=c01(u/CYCLE)*CYCLE*HZ,i=Math.min(FR.length-2,Math.floor(x)),f=x-i,A=FR[i],B=FR[i+1];
  function lm(a,b){return a.map(function(v,k){return mix(v,b[k],f)})}
  return {k:lm(A.k,B.k),v:lm(A.v,B.v),g:lm(A.g,B.g),d:lm(A.d,B.d),nope:A.nope,T:mix(A.T,B.T,f),sp:A.sp,t:u};
}

/* ─────────── кадр ─────────── */
var S0=1,MC=1.5714,DARK=true;
var COL={ink:[0,0,0],sec:[138,138,142],green:[52,199,89],off:[233,233,235]};
function rgb(a,b,t){return 'rgb('+Math.round(mix(a[0],b[0],t))+','+Math.round(mix(a[1],b[1],t))+','+Math.round(mix(a[2],b[2],t))+')'}

function applyCam(c){
  var mc=Math.min(MC,(innerWidth-8)/(424*S0)),m=mix(1,Math.max(1,mc),c.z),s=S0*m,half=innerHeight/2/s;
  var top=Math.min(448,half-8),bot=Math.max(448,896-half+8),cy=mix(top,bot,c.pan);
  set(zoom,'transform','translate(0px,'+f2((448-cy)*s)+'px) scale('+s.toFixed(4)+')');
}
function nopeDx(r){return r<0||r>.6?0:5.5*Math.exp(-r/.11)*Math.sin(2*Math.PI*11*r)}
function renderToggle(i,k,v,g,nr){
  var E=RW[i],kc=c01(k),over=k>1?k-1:k<0?k:0;
  var c=sm(kc),tr=rgb(COL.off,COL.green,c);
  set(E.tg,'background',tr);
  // стекло: ручка раздувается в линзу, на ходу тянется по скорости, у края сплющивается
  var st=Math.min(.2,Math.abs(v)*.017)*(1-.4*g);
  var sx=1+.44*g+st-Math.abs(over)*1.1,sy=1+.52*g-st*.35+Math.abs(over)*.4;
  var cx=2+KW/2+TRAV*kc+over*TRAV*.35+nopeDx(nr);
  set(E.kn,'transform','translate('+f2(cx-KW/2)+'px,2px) scale('+sx.toFixed(3)+','+sy.toFixed(3)+')');
  if(g>.004){
    var M=1.16;
    set(E.lens,'display','block');
    set(E.lens,'left',f2(KW/2+(-cx*M)/sx)+'px');set(E.lens,'width',f2(TGW*M/sx)+'px');
    set(E.lens,'top',f2(KH/2+(-14*M)/sy)+'px');set(E.lens,'height',f2(TGH*M/sy)+'px');
    set(E.lens,'borderRadius',f2(14*M/sx)+'px / '+f2(14*M/sy)+'px');
    set(E.lens,'background',tr);
  }else set(E.lens,'display','none');
  var a=(1-.93*g).toFixed(3);
  set(E.face,'background','rgba(255,255,255,'+a+')');
  // на светлом стекло держится тёмной кромкой и тенью, на тёмном светлой кромкой
  var rim=DARK?'rgba(255,255,255,'+(.6*g).toFixed(3)+')':'rgba(0,0,0,'+(.16*g).toFixed(3)+')';
  set(E.face,'boxShadow',g>.004?
    'inset 0 0 0 .7px '+rim+',inset 1.6px 2px 2px -1px rgba(255,255,255,'+(.75*g).toFixed(3)+'),inset -1.4px -1.8px 2px -1px rgba(255,255,255,'+(.4*g).toFixed(3)+')'+
    (DARK?'':',inset 0 -2px 3px -1px rgba(0,0,0,'+(.1*g).toFixed(3)+')')+
    ',0 '+f2(2.5+2*g)+'px '+f2(7+6*g)+'px rgba(0,0,0,'+((DARK?.16:.17)+(DARK?.08:.1)*g).toFixed(3)+'),0 2px 1px rgba(0,0,0,'+(.05*(1-g)).toFixed(3)+')'
    :'0 2.5px 7px rgba(0,0,0,.16),0 2px 1px rgba(0,0,0,.05)');
}
function sepPath(j,sp,t){
  var y=sepY(j)+.3,age=t-sp[0];
  if(age<0||age>.95)return 'M16 '+y+'H402';
  var A=sp[1]*2.5*Math.exp(-age/.2)*Math.cos(2*Math.PI*8.5*age),s0=(clamp(sp[2],60,388)-16)/386,d='M16 '+y.toFixed(2);
  for(var x=28;x<=402;x+=11){var s=(x-16)/386,sh=s<s0?Math.sin(Math.PI/2*s/s0):Math.cos(Math.PI/2*(s-s0)/(1-s0));d+='L'+Math.min(x,402)+' '+(y+A*sh).toFixed(2)}
  return d+'L402 '+y;
}
function odo(T){
  var H=Math.floor(T/60),m=T-H*60,o=m-Math.floor(m/10)*10;
  var tp=Math.floor(m/10)+Math.max(0,o-9),hp=H+Math.max(0,m-59);
  set(DH.col,'transform','translateY('+f2(-((hp%10+10)%10)*20)+'px)');
  set(DT.col,'transform','translateY('+f2(-tp*20)+'px)');
  set(DO.col,'transform','translateY('+f2(-o*20)+'px)');
  set(DT.el,'width',f2(DW*c01(Math.min(tp,6-tp)))+'px');
  var r=Math.round(T),txt='Next alarm in '+Math.floor(r/60)+' hr '+(r%60)+' min';
  if(subSr.textContent!==txt)subSr.textContent=txt;
}
function render(F,cam,fin){
  applyCam(cam);
  for(var i=0;i<N;i++){
    renderToggle(i,F.k[i],F.v[i],F.g[i],F.t-F.nope[i]);
    var col=rgb(COL.sec,COL.ink,c01(F.d[i]));set(RW[i].tm,'color',col);set(RW[i].lb,'color',col);
  }
  for(var j=0;j<=N;j++){var d=sepPath(j,F.sp[j],F.t);if(SEPS[j].__d!==d){SEPS[j].__d=d;SEPS[j].setAttribute('d',d)}}
  odo(F.T);
  set(touchEl,'opacity',fin.vis.toFixed(3));
  set(touchEl,'transform','translate('+f2(fin.x)+'px,'+f2(fin.y)+'px) scale('+fin.sc.toFixed(3)+')');
}

/* ─────────── звук ─────────── */
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Мышью или пальцем вниз по переключателям выключает, вверх включает, тап переключает один.
   Стрелки вниз и вверх проводят пальцем сами, D тапает собаку. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveInit(u){
  var A=FR[Math.min(FR.length-1,Math.round(c01(u/CYCLE)*CYCLE*HZ))],S=newState(nowS());
  S.tg=A.full.map(function(o){var q=Object.assign({},o),sh=nowS()-u;q.hold+=sh;q.ref+=sh;q.nope+=sh;return q});
  S.T=A.T;S.Tv=A.Tv;S.fp={x:350,y:0,down:false};
  LV={S:S,cam:camAuto(u),F:{x:350,y:0,down:false},ptr:null,script:null,evn:0,vis:0,sc:1};
  mode='live';document.documentElement.classList.add('live');
}
function goLive(){if(mode!=='live')liveInit(uNow())}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function liveFinger(t){
  if(LV.script){var s=LV.script,u=s.st.a+(t-s.t0);if(u<=s.st.b)return {x:s.st.pos(u).x,y:s.st.pos(u).y,down:u>=s.st.a};LV.script=null}
  return LV.F;
}
function liveStep(n,dt){
  var hh=1/HZ,steps=Math.max(1,Math.round(dt/hh)),S=LV.S,F0=S.fp||LV.F;
  for(var k=1;k<=steps;k++){
    var t=S.t+dt/steps,F=LV.script?liveFinger(t):{x:mix(F0.x,LV.F.x,k/steps),y:mix(F0.y,LV.F.y,k/steps),down:LV.F.down&&(F0.down||k===steps)};
    stepSim(S,dt/steps,F);
  }
  while(LV.evn<S.ev.length){var ev=S.ev[LV.evn++];Sound.play(ev,Math.max(0,ev[0]-S.t))}
  RW.forEach(function(E,i){var on=!!S.tg[i].K;if(E.on!==on){E.on=on;E.tg.setAttribute('aria-checked',String(on))}});
  // камера отъезжает на весь телефон
  LV.cam.z+=(0-LV.cam.z)*(1-Math.exp(-dt/.18));
  var F=S.fp;LV.vis+=((F.down?1:0)-LV.vis)*(1-Math.exp(-dt/(F.down?.03:.07)));
  LV.fx=F.x;LV.fy=F.y;
}
function liveF(n){
  var S=LV.S;
  return {k:S.tg.map(function(o){return o.k}),v:S.tg.map(function(o){return o.v}),g:S.tg.map(function(o){return o.g}),
    d:S.tg.map(function(o){return o.d}),nope:S.tg.map(function(o){return o.nope}),T:S.T,sp:S.sp,t:S.t};
}
function toScreen(e){var r=screenEl.getBoundingClientRect(),k=r.width/402;return {x:(e.clientX-r.left)/k,y:(e.clientY-r.top)/k}}
function toggleAt(p){if(p.x<290)return -1;for(var i=0;i<N;i++)if(Math.abs(p.y-tgY(i))<30)return i;return -1}
screenEl.addEventListener('pointerdown',function(e){
  if(REC||e.button>0)return;
  Sound.start();goLive();
  screenEl.setPointerCapture(e.pointerId);
  var p=toScreen(e);LV.script=null;
  LV.ptr={id:e.pointerId,x0:p.x,y0:p.y,t0:nowS(),moved:0};
  LV.F={x:p.x,y:p.y,down:true};LV.S.fp={x:p.x,y:p.y,down:false};
});
screenEl.addEventListener('pointermove',function(e){
  if(!LV||!LV.ptr||LV.ptr.id!==e.pointerId)return;
  var p=toScreen(e);LV.F={x:p.x,y:p.y,down:true};
  LV.ptr.moved=Math.max(LV.ptr.moved,Math.hypot(p.x-LV.ptr.x0,p.y-LV.ptr.y0));
});
function endPtr(e){
  if(!LV||!LV.ptr||LV.ptr.id!==e.pointerId)return;
  var P=LV.ptr;LV.ptr=null;
  if(P.moved<10&&nowS()-P.t0<.4){var i=toggleAt({x:P.x0,y:P.y0});if(i>=0)tapToggle(LV.S,i,LV.S.t)}
  LV.F={x:LV.F.x,y:LV.F.y,down:false};
}
screenEl.addEventListener('pointerup',endPtr);screenEl.addEventListener('pointercancel',endPtr);
function runStroke(st){Sound.start();goLive();LV.ptr=null;LV.F.down=false;LV.script={st:st,t0:LV.S.t}}
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
  if(e.key==='ArrowDown'){e.preventDefault();runStroke(STRUM)}
  else if(e.key==='ArrowUp'){e.preventDefault();runStroke(UPS)}
  else if(e.key==='d'||e.key==='D'){Sound.start();goLive();tapToggle(LV.S,DOG,LV.S.t)}
});

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(frameAt(u),camAuto(u),fingerAuto(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();
    if(dt>0)liveStep(n,Math.min(dt,.05));
    render(liveF(n),LV.cam,{x:LV.fx||350,y:LV.fy||0,vis:LV.vis,sc:1});
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
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Swipe down the switches':'Drag down the switches, or press ↓ ↑';

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);DARK=th==='dark';
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var cs=getComputedStyle(document.documentElement);
  COL={ink:hex(cs.getPropertyValue('--ink')),sec:hex(cs.getPropertyValue('--sec')),green:hex(cs.getPropertyValue('--green')),off:hex(cs.getPropertyValue('--offtr'))};
  RW.forEach(function(E){E.tm.style.color='';E.tm.__s.color=null;E.lb.__s&&(E.lb.__s.color=null)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  var w=innerWidth,hh=innerHeight;
  S0=REC||STILL?(hh-96)/896:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.4);
}
function measure(){
  var probe=h('span','dg');probe.textContent='0';probe.style.width='auto';document.querySelector('.subt .vis').appendChild(probe);
  DW=probe.getBoundingClientRect().width||8.6;probe.remove();
  [DH,DT,DO].forEach(function(D){D.el.style.width=DW+'px'});
}

window.__seek=function(t){goAuto();paused=true;acc=t;var u=uNow();render(frameAt(u),camAuto(u),fingerAuto(u))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};
window.__TL=TL;

function init(){
  RW.forEach(function(E){E.tm.__s={};E.lb.__s={}});
  applyTheme(document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();measure();buildPaths();precompute();
}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',fit);
  requestAnimationFrame(tick);
});
