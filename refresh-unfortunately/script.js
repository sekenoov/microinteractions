/* ─────────── Refresh ───────────
   Входящие после финального собеседования. Тянешь список вниз, чтобы обновить: ничего.
   Ещё раз, сильнее: ничего. Третий раз изо всех сил, и список растягивается, как пружинка:
   строки разъезжаются, на отпускании схлопываются гармошкой и стучат друг о друга.
   В щель над списком сверху падает тяжёлое письмо, и оно начинается со слова «Unfortunately,».
   Как и все остальные во входящих. Его смахивают в корзину, и всё начинается заново.
   Список это цепочка тел: у каждой строки масса, соседей держит резинка на растяжение
   и жёсткий упор на сжатие, верхнюю строку тянет к шапке своя резинка. Автопоказ
   считается один раз при загрузке и проигрывается по t, поэтому петля замыкается без шва. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function ein(p){p=c01(p);return p*p*p}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}

/* ─────────── письма ─────────── */
var MAIL=[
  {from:'Fernway',time:'9:41 AM',subj:'Re: Final round',prev:'Unfortunately, after careful consideration, we’ve decided to move forward with other candidates.'},
  {from:'Northfield',time:'9:12 AM',subj:'Product Designer, next steps',prev:'Unfortunately, we won’t be moving forward with your application at this time.'},
  {from:'Brightloop',time:'Yesterday',subj:'Thank you for applying',prev:'Unfortunately, the role has been filled. We’ll keep your résumé on file for future openings.'},
  {from:'Kitewing',time:'Tuesday',subj:'Update on your application',prev:'Unfortunately, we’ve decided to pursue candidates whose experience more closely matches our needs.'},
  {from:'Halcyon',time:'Monday',subj:'Re: Design challenge',prev:'Unfortunately, after reviewing your submission the team has decided not to proceed.'},
  {from:'Openfold',time:'Saturday',subj:'Your candidacy',prev:'Unfortunately, we have chosen to move forward with applicants who more closely fit the role.'},
  {from:'Parcelworks',time:'Friday',subj:'Application received',prev:'Unfortunately, due to the high volume of applications we are unable to offer you an interview.'},
  {from:'Moonstone',time:'10/1/26',subj:'Thanks for your interest',prev:'Unfortunately, this position is no longer available.'}
];

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,NAV=98,H=118,NR=MAIL.length-1,ARMD=34;
var listEl=document.getElementById('list'),zoom=document.getElementById('zoom'),screenEl=document.getElementById('screen');
var shakeEl=document.getElementById('shake'),redEl=document.getElementById('red'),trashEl=document.getElementById('trash');
var spinEl=document.getElementById('spin'),hairEl=document.getElementById('hair'),touchEl=document.getElementById('touch');
var st1=document.getElementById('st1'),st2=document.getElementById('st2');
var CHEV='<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5l5 5-5 5"/></svg>';
var ROWS=MAIL.map(function(m,i){
  var r=h('div','row'+(i===0?' new':''));
  r.innerHTML='<span class="dot"></span><div class="l1"><span class="from"></span><span class="time"></span></div><div class="subj"></div><div class="prev"></div>';
  r.querySelector('.from').textContent=m.from;r.querySelector('.time').innerHTML=m.time+CHEV;
  r.querySelector('.subj').textContent=m.subj;r.querySelector('.prev').textContent=m.prev;
  listEl.appendChild(r);return r;
});
// индикатор: восемь штрихов
var TICKS=[];
for(var k=0;k<8;k++){var tr=document.createElementNS('http://www.w3.org/2000/svg','rect');tr.setAttribute('x','-1.6');tr.setAttribute('y','-12');tr.setAttribute('width','3.2');tr.setAttribute('height','7.2');tr.setAttribute('rx','1.6');tr.setAttribute('transform','rotate('+k*45+')');spinEl.appendChild(tr);TICKS.push(tr)}

/* ─────────── физика цепочки ─────────── */
var PHY={ka:420,ca:19,kt:420,ct:8,kh:420,ch:15,kc:3600,cc:44,air:.8,kf:9000,cf:190,me:3.2,ge:4600,v0:0,kae:1300,cae:128,DT:1/1200};
function restY(i,withMail){return NAV+(i-(withMail?0:1))*H}
/* Строки выше той, за которую тянут, висят цепочкой на резинке от шапки: между ними и растёт
   щель. Строка под пальцем и всё, что ниже, привязаны каждая к своему месту, поэтому
   возвращаются быстро и на отпускании набегают на верхние гармошкой. */
function Sim(){
  this.y=new Float64Array(NR+1);this.v=new Float64Array(NR+1);this.act=[];this.gp=new Float64Array(NR+1);
  for(var i=0;i<=NR;i++){this.y[i]=i?restY(i,false):NAV-H-6;this.act.push(i>0)}
  this.hold=0;this.grab=null;this.fy=0;this.grav=0;this.t=0;this.ev=[];this.armed=false;this.split=3;this.fall=false;this.ts=-9;
}
Sim.prototype.list=function(){var a=[];for(var i=0;i<=NR;i++)if(this.act[i])a.push(i);return a};
Sim.prototype.gap0=function(){var a=this.list();return this.y[a[0]]-NAV};
Sim.prototype.under=function(py){var a=this.list();for(var k=0;k<a.length;k++){var i=a[k];if(py>=this.y[i]&&py<this.y[i]+H)return i}return a[a.length-1]};
Sim.prototype.step=function(dt){
  var P=PHY,y=this.y,v=this.v,a=this.list(),F=new Float64Array(NR+1),top=a[0];
  // пока письмо падает, список его ещё не чувствует: держится за шапку сам
  var off=a[0]===0&&this.fall?1:0,g=this.grab&&this.act[this.grab.i]?this.grab:null,kg=g?a.indexOf(g.i):-1;
  for(var k=0;k<a.length;k++){
    var i=a[k];
    if(i===0){if(!this.fall){var ds=sm((this.t-this.ts)/.16);F[0]+=-P.kae*(.35+.65*ds)*(y[0]-NAV)-P.cae*ds*v[0]}continue}
    if(k===off)F[i]+=-P.ka*(y[i]-(NAV+this.hold))-P.ca*v[i];
    else if(i>=this.split){
      // ниже пальца строки едут за ним, а без пальца каждая тянется к своему месту
      var home=g&&k>kg?y[g.i]+(k-kg)*H:NAV+this.hold+(k-off)*H;
      F[i]+=-P.kh*(y[i]-home)-P.ch*v[i];
    }
  }
  for(k=0;k<a.length-1;k++){
    var i=a[k],j=a[k+1],gp=y[j]-(y[i]+H),rv=v[j]-v[i],f=gp>=0?P.kt*gp+P.ct*rv:P.kc*gp+P.cc*rv;
    if(gp>=0&&(j>this.split||(i===0&&this.fall)))f=0;
    F[i]+=f;F[j]-=f;
    // удар: строки только что сошлись
    if(this.gp[j]>=0&&gp<0&&-rv>110){
      this.ev.push([this.t,i===0&&this.fall?'slam':'clack',-rv,j]);
      if(i===0&&this.fall){this.fall=false;this.hold=0;this.ts=this.t}
    }
    this.gp[j]=gp;
  }
  for(k=0;k<a.length;k++){i=a[k];F[i]-=P.air*v[i]}
  if(g)F[g.i]+=P.kf*(this.fy-g.o-y[g.i])-P.cf*v[g.i];
  if(this.act[0])F[0]+=PHY.me*this.grav;
  for(k=0;k<a.length;k++){i=a[k];var m=i===0?P.me:1;v[i]+=F[i]/m*dt;y[i]+=v[i]*dt}
  var g0=y[a[off]]-NAV;
  if(g&&!this.armed&&g0>ARMD){this.armed=true;this.ev.push([this.t,'arm'])}
  this.t+=dt;
};
Sim.prototype.grabAt=function(py){var i=this.under(py);this.grab={i:i,o:py-this.y[i]};this.fy=py;this.armed=false;this.split=Math.max(1,i)};
Sim.prototype.arrive=function(){this.act[0]=true;this.y[0]=NAV-H;this.v[0]=PHY.v0;this.gp[1]=1;this.grav=PHY.ge;this.fall=true};
Sim.prototype.remove=function(){this.act[0]=false;this.gp[1]=1;this.hold=0};

/* ─────────── сценарий автопоказа ───────────
   Три рывка: каждый следующий длиннее и отчаяннее. На третьем список ждёт с щелью
   под письмо, письмо падает, потом его смахивают в корзину. */
var FX0=232,FY0=NAV+2*H+60;
var PULLS=[
  {down:.12,d0:.18,d1:.66,up:.74,dist:122,fx:FX0+8,hold:[.74,1.2],hv:60},
  {down:1.4,d0:1.46,d1:2.08,up:2.16,dist:238,fx:FX0+2,hold:[2.16,2.62],hv:60},
  {down:2.8,d0:2.86,d1:3.78,up:3.9,dist:350,fx:FX0-4,hold:[3.9,4.34],hv:H+8,trem:1}
];
var ARR=4.34,TRASH={down:6.02,d0:6.08,d1:6.37,up:6.4,x0:300,x1:58},TRM=TRASH.up+.13,CYCLE=7.6,SR=240;
var AUTO=null,EVENTS=[],TL={};

function fingerY(p,t){
  var e=t<p.d0?0:p.d1>p.d0?mix(seg(t,p.d0,p.d1),eio(seg(t,p.d0,p.d1)),.6):1,y=FY0+p.dist*e;
  // на пределе палец дёргает ещё, рывками
  if(p.trem){var q=seg(t,p.d1-.34,p.up);y+=q*(9*Math.sin((t-p.d1)*2*Math.PI*7.5)+4*Math.sin((t-p.d1)*2*Math.PI*13.3))}
  return y;
}
function buildAuto(){
  var S=new Sim(),dt=PHY.DT,N=Math.round(CYCLE*SR),sub=Math.round(1/(SR*dt)),Y=[],V=[],ACT=[];
  var t=0,pi=-1,armT=[],tImpact=null;
  EVENTS=[];
  for(var n=0;n<=N;n++){
    Y.push(Array.prototype.slice.call(S.y));V.push(Array.prototype.slice.call(S.v));ACT.push(S.act[0]);
    for(var s=0;s<sub;s++){
      t=S.t;
      for(var q=0;q<PULLS.length;q++){
        var p=PULLS[q];
        if(t>=p.down&&t<p.down+dt){S.grabAt(FY0)}
        if(t>=p.down&&t<p.up&&S.grab)S.fy=fingerY(p,t);
        if(t>=p.up&&t<p.up+dt){S.grab=null}
        if(t>=p.hold[0]&&t<p.hold[1]&&!S.act[0])S.hold=p.hv;else if(t>=p.hold[1]&&t<p.hold[1]+dt&&q<2)S.hold=0;
      }
      if(t>=ARR&&t<ARR+dt)S.arrive();
      if(S.act[0]&&!S.fall)S.grav=0;
      if(t>=TRM&&t<TRM+dt)S.remove();
      S.step(dt);
    }
  }
  // события физики в звук
  S.ev.forEach(function(e){
    if(e[1]==='slam'&&tImpact==null){tImpact=e[0];EVENTS.push([e[0],'slam',e[2]])}
    else if(e[1]==='clack')EVENTS.push([e[0],'clack',e[2],e[3]]);
    else if(e[1]==='arm')EVENTS.push([e[0],'arm'])
  });
  PULLS.forEach(function(p,i){
    EVENTS.push([p.down,'touch']);
    EVENTS.push([p.d0,'creak',p.up-p.d0,p.dist,i]);
    EVENTS.push([p.up,'snap',p.dist,i]);
    if(i<2)EVENTS.push([p.up+.04,'spin',p.hold[1]-p.up-.04]);
  });
  EVENTS.push([PULLS[2].up+.04,'spin',ARR-PULLS[2].up-.02]);
  EVENTS.push([ARR,'drop']);
  if(tImpact!=null)EVENTS.push([tImpact+.06,'ding']);
  EVENTS.push([TRASH.down,'touch']);EVENTS.push([TRASH.d0,'swipe']);EVENTS.push([TRASH.up,'trash']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
  // красное под письмом гаснет, как только первая строка дошла до шапки
  var tRed=CYCLE;for(n=Math.ceil(TRM*SR);n<Y.length;n++)if(Y[n][1]<=NAV+1.5){tRed=n/SR;break}
  AUTO={Y:Y,V:V,ACT:ACT,tImpact:tImpact||ARR+.15,tRed:tRed};
  TL={CYCLE:CYCLE,IMPACT:AUTO.tImpact,ARR:ARR,P3UP:PULLS[2].up,TRM:TRM};
}

/* ─────────── кадр автопоказа ─────────── */
function autoFrame(t){
  var A=AUTO,m=clamp(t*SR,0,A.Y.length-1),i=Math.min(Math.floor(m),A.Y.length-2),f=m-i,y=[];
  // последние доли петли доводятся ровно до покоя, чтобы шов не дёргался
  var b=sm(seg(t,CYCLE-.32,CYCLE));
  for(var k=0;k<=NR;k++){var v=mix(A.Y[i][k],A.Y[i+1][k],f);y.push(k?mix(v,restY(k,false),b):v)}
  var act0=A.ACT[i],F={y:y,act0:act0,ex:0,red:0,fing:null,spin:null,st:['Updated Just Now',''],shake:0,unread:act0||t>=ARR&&t<TRM};
  // палец
  PULLS.forEach(function(p){
    if(t>=p.down-.08&&t<p.up+.16){
      var a=Math.min(sm(seg(t,p.down-.08,p.down)),1-sm(seg(t,p.up,p.up+.14)));
      var yy=t<p.up?fingerY(p,t):fingerY(p,p.up)-40*eout(seg(t,p.up,p.up+.16));
      F.fing={x:p.fx,y:yy,a:a,p:t>=p.down&&t<p.up?1:0};
    }
  });
  // смахивание
  var T=TRASH;
  if(t>=T.down-.08&&t<CYCLE){
    var fx=T.x0+(T.x1-T.x0)*eio(seg(t,T.d0,T.d1)),dx=fx-T.x0;
    if(t<T.up)F.ex=dx;else F.ex=mix(T.x1-T.x0,-SW-4,eout(seg(t,T.up,T.up+.17)));
    var fa=Math.min(sm(seg(t,T.down-.08,T.down)),1-sm(seg(t,T.up,T.up+.12)));
    if(fa>0)F.fing={x:t<T.up?fx:T.x1-30*eout(seg(t,T.up,T.up+.14)),y:NAV+62,a:fa,p:t<T.up?1:0};
    F.red=t<A.tRed?1:0;
  }
  // индикатор и строка состояния
  var top=act0?y[0]:y[1],g0=top-NAV,spinning=0,rate=11;
  PULLS.forEach(function(p,q){
    if(t>=p.up&&t<p.hold[1]){spinning=1;F.st=['Checking for Mail…',''];if(q===2&&t>ARR-.14)F.st=['Downloading 1 of 1','']}
    if(t>=p.d0&&t<p.up&&g0>ARMD-2){spinning=1;rate=p.trem?mix(11,30,seg(t,p.d1-.5,p.up)):11}
  });
  if(t>=ARR&&t<A.tImpact+.3)F.st=['Downloading 1 of 1',''];
  else if(F.unread)F.st=['Updated Just Now','1 Unread'];
  var pa=c01((g0-6)/26),inPull=0;
  PULLS.forEach(function(p){if(t>=p.down&&t<p.hold[1]+.4)inPull=1});
  pa*=inPull;
  if(act0)pa*=1-sm(seg(t,ARR,ARR+.06));
  F.spin={y:NAV+Math.min(g0,H+8)/2,a:pa,n:spinning?8:Math.round(clamp(g0/ARMD,0,1)*8),rot:spinning?Math.floor(t*rate)%8:0,on:spinning};
  // удар письма: экран вздрагивает
  var di=t-A.tImpact;
  if(di>0&&di<.7)F.shake=7*Math.exp(-di*9)*Math.sin(di*2*Math.PI*11);
  return F;
}

/* ─────────── отрисовка ─────────── */
function render(F){
  var y=F.y,act=[];for(var k=0;k<=NR;k++)if(k>0||F.act0)act.push(k);
  for(k=0;k<=NR;k++){
    var r=ROWS[k],yy=y[k],sc=1;
    // сжатие: строка не залезает на следующую, а сплющивается
    var nx=null;for(var q=0;q<act.length;q++)if(act[q]===k&&q<act.length-1)nx=act[q+1];
    if(nx!=null&&(k>0||F.act0)){var hh=y[nx]-yy;if(hh<H)sc=clamp(hh/H,.5,1)}
    var vis=k>0||F.act0||F.ex<0;
    if(k===0&&!vis){set(r,'visibility','hidden');continue}
    set(r,'visibility',yy>874||yy+H<NAV-2?'hidden':'visible');
    set(r,'transform','translate('+f2(k===0?F.ex:0)+'px,'+f2(yy)+'px) scaleY('+sc.toFixed(4)+')');
  }
  // красное под смахнутым письмом
  if(F.red&&F.ex<0){
    var top=y[0],bot=F.act0?y[0]+H:y[1],hgt=Math.max(0,bot-top),left=SW+F.ex;
    set(redEl,'visibility',hgt>.5?'visible':'hidden');
    set(redEl,'transform','translate(0,'+f2(top)+'px)');set(redEl,'height',f2(hgt)+'px');
    set(trashEl,'transform','translate('+f2(clamp(left+8,8,SW-84))+'px,'+f2((Math.min(hgt,H)-50)/2+(hgt<H?0:0))+'px)');
    set(trashEl,'opacity',c01((-F.ex-20)/50).toFixed(3));
  }else set(redEl,'visibility','hidden');
  // индикатор
  var s=F.spin;
  set(spinEl,'opacity',s.a.toFixed(3));
  set(spinEl,'transform','translate(201px,'+f2(s.y)+'px)');
  TICKS.forEach(function(tk,i){
    var o;
    if(s.on){var d=((i-s.rot)%8+8)%8;o=1-d/8*.82}else o=i<s.n?.75:0;
    tk.setAttribute('opacity',o.toFixed(2));
  });
  // шапка: волосок, когда список уходит под неё
  var top0=F.act0?y[0]:y[1];
  set(hairEl,'opacity',c01((NAV-top0)/6).toFixed(2));
  if(st1.textContent!==F.st[0])st1.textContent=F.st[0];
  if(st2.textContent!==F.st[1])st2.textContent=F.st[1];
  set(ROWS[0].querySelector('.dot'),'opacity',F.unread?'1':'0');
  // палец
  var g=F.fing;
  if(g){set(touchEl,'opacity',g.a.toFixed(3));set(touchEl,'transform','translate('+f2(g.x)+'px,'+f2(g.y)+'px) scale('+(1-.16*g.p).toFixed(3)+')')}
  else set(touchEl,'opacity','0');
  set(shakeEl,'transform',F.shake?'translate('+f2(F.shake*.25)+'px,'+f2(F.shake)+'px)':'none');
}

/* ─────────── камера записи ───────────
   Кадр 1080 × 1350. С каждым рывком камера отъезжает, чтобы палец оставался в кадре,
   на ударе письма подъезжает к нему. */
var CAM_TOP=34;
function camAt(t){
  var s0=2.2,s1=1.97,s2=1.64,s3=2.4;
  var s=s0;
  s=mix(s,s1,sm(seg(t,1.3,1.75)));
  s=mix(s,s2,sm(seg(t,2.7,3.3)));
  var ti=AUTO.tImpact;
  s=mix(s,s3,eout(seg(t,ti-.02,ti+.5)));
  s=mix(s,s0,eio(seg(t,5.55,6.25)));
  return s;
}
function placeCam(s,shk){
  var tx=540-s*212,ty=CAM_TOP+(shk||0)*.6;
  set(zoom,'transform','translate('+f2(tx)+'px,'+f2(ty)+'px) scale('+s.toFixed(4)+')');
}

/* ─────────── звук: события петли ─────────── */
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Тянешь список сам. На третьем обновлении приходит письмо. Смахни его влево. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var u=uNow(),A=AUTO,S=new Sim(),m=clamp(u*SR,0,A.Y.length-1),i=Math.floor(m);
  for(var k=0;k<=NR;k++){S.y[k]=A.Y[i][k];S.v[k]=A.V[i][k]}
  // письмо в живой режим берём только если оно уже лежит на месте
  var mailIn=A.ACT[i]&&u>A.tImpact&&u<TRASH.down;
  S.act[0]=mailIn;if(!mailIn){S.y[0]=NAV-H-6;S.v[0]=0}
  for(k=1;k<=NR;k++)S.gp[k]=1;
  LV={S:S,pulls:0,ex:0,exv:0,unread:mailIn,gone:false,arrT:null,holdT:null,zip:null,g:null,last:nowS()};
  mode='live';document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function toScreen(e){var r=screenEl.getBoundingClientRect(),k=r.width/402;return {x:(e.clientX-r.left)/k,y:(e.clientY-r.top)/k}}
var drag=null;
screenEl.addEventListener('pointerdown',function(e){
  if(REC||e.button>0)return;e.preventDefault();screenEl.setPointerCapture(e.pointerId);
  Sound.start();goLive();
  var p=toScreen(e);drag={x0:p.x,y0:p.y,x:p.x,y:p.y,kind:null};
  Sound.play([0,'touch']);
});
screenEl.addEventListener('pointermove',function(e){
  if(!drag||!LV)return;var p=toScreen(e);drag.x=p.x;drag.y=p.y;
  var dx=p.x-drag.x0,dy=p.y-drag.y0,S=LV.S;
  if(!drag.kind&&Math.hypot(dx,dy)>7){
    var onMail=S.act[0]&&drag.y0>=S.y[0]&&drag.y0<S.y[0]+H&&!LV.zip;
    if(Math.abs(dx)>Math.abs(dy)&&onMail){drag.kind='swipe';Sound.play([0,'swipe'])}
    else if(dy>0||S.gap0()>2){drag.kind='pull';S.grabAt(drag.y0);drag.t0=nowS();drag.max=0}
    else drag.kind='none';
  }
  if(drag.kind==='pull'){S.fy=drag.y0+Math.max(-30,dy);drag.max=Math.max(drag.max,dy)}
  if(drag.kind==='swipe'){LV.ex=dx<0?dx:dx*.25}
});
function pointerEnd(){
  if(!drag||!LV){drag=null;return}
  var S=LV.S,n=nowS();
  if(drag.kind==='pull'){
    S.grab=null;LV.relT=n;Sound.play([0,'snap',Math.max(60,drag.max),Math.min(2,LV.pulls)]);
    if(S.gap0()>ARMD&&LV.holdT==null&&LV.arrT==null){
      var arrive=!S.act[0]&&LV.pulls>=2;
      S.hold=arrive?H+8:60;LV.holdT=n+(arrive?.42:.48);LV.arrive=arrive;
      Sound.play([0,'spin',LV.holdT-n],.04);
      if(!arrive&&!S.act[0])LV.pulls++;
    }
  }else if(drag.kind==='swipe'){
    if(LV.ex<-140){LV.zip={t:n,x:LV.ex};Sound.play([0,'trash'])}else LV.snapBack=n;
  }
  drag=null;
}
screenEl.addEventListener('pointerup',pointerEnd);
screenEl.addEventListener('pointercancel',pointerEnd);
var liveTick=0;
function liveStep(n){
  var S=LV.S,dt=Math.min(.05,n-LV.last);LV.last=n;
  if(LV.holdT!=null&&n>=LV.holdT){
    LV.holdT=null;
    if(LV.arrive){S.arrive();LV.unread=true;LV.arrT=n;LV.pulls=0;Sound.play([0,'drop'])}else S.hold=0;
  }
  if(LV.arrT!=null&&!S.fall){S.grav=0}
  if(LV.zip){
    var k=seg(n,LV.zip.t,LV.zip.t+.17);LV.ex=mix(LV.zip.x,-SW-4,eout(k));
    if(k>=.75&&S.act[0]){S.remove();LV.unread=false;LV.redOff=false}
    if(n>LV.zip.t+1.2){LV.zip=null;LV.ex=0;S.y[0]=NAV-H-6;LV.arrT=null}
  }else if(drag&&drag.kind==='swipe'){}
  else if(LV.ex!==0){LV.ex*=Math.exp(-dt*18);if(Math.abs(LV.ex)<.3)LV.ex=0}
  var steps=Math.round(dt/PHY.DT);for(var i=0;i<steps;i++)S.step(PHY.DT);
  S.ev.forEach(function(e){
    if(e[1]==='slam'){Sound.play([0,'slam',e[2]]);Sound.play([0,'ding'],.06);LV.impact=n}
    else if(e[1]==='clack')Sound.play([0,'clack',e[2],e[3]]);
    else Sound.play([0,e[1]]);
  });
  S.ev=[];
}
function liveFrame(n){
  var S=LV.S,y=Array.prototype.slice.call(S.y),g0=S.gap0();
  var F={y:y,act0:S.act[0],ex:LV.ex,red:LV.ex<0&&!LV.redOff?1:0,fing:null,spin:null,st:['Updated Just Now',LV.unread?'1 Unread':''],shake:0,unread:LV.unread};
  var spinning=LV.holdT!=null||(S.grab&&g0>ARMD-2);
  if(LV.holdT!=null)F.st=[LV.arrive?'Downloading 1 of 1':'Checking for Mail…',''];
  var pa=c01((g0-6)/26)*(S.grab||LV.holdT!=null||n<(LV.relT||0)+.4?1:0);if(S.act[0])pa*=c01(1-(n-(LV.arrT||0))/.06);
  if(LV.zip&&S.y[1]<=NAV+1.5)LV.redOff=true;
  F.spin={y:NAV+Math.min(g0,H+8)/2,a:pa,n:spinning?8:Math.round(clamp(g0/ARMD,0,1)*8),rot:Math.floor(n*11)%8,on:spinning};
  if(LV.impact!=null){var di=n-LV.impact;if(di<.7)F.shake=7*Math.exp(-di*9)*Math.sin(di*2*Math.PI*11)}
  if(drag)F.fing={x:drag.x,y:drag.y,a:1,p:1};
  return F;
}

addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();Sound.start();goAuto();paused=false}
});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Pull the inbox down. Swipe a mail left':'Drag the inbox down. Swipe a mail left';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false,S=1;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE,F=autoFrame(u);
    render(F);
    if(REC||STILL)placeCam(camAt(u),F.shake);
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();liveStep(n);render(liveFrame(n));
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

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

function fit(){
  if(REC||STILL)return;
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

window.__seek=function(t){goAuto();paused=true;acc=t;var u=uNow(),F=autoFrame(u);render(F);if(REC||STILL)placeCam(camAt(u),F.shake)};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  fit();buildAuto();window.__TL=TL;window.__EV=EVENTS;
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  var u0=((PH%CYCLE)+CYCLE)%CYCLE,F=autoFrame(u0);render(F);if(REC||STILL)placeCam(camAt(u0),F.shake);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
