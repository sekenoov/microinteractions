/* ─────────── Brake ───────────
   Ответ ИИ несётся по словам. Жмёшь стоп, и у текста есть инерция: передний край встаёт сразу,
   а всё, что сзади, ещё едет. Слова клюют вперёд, как пассажиры в автобусе, задние врезаются
   в передние гармошкой, строки съезжаются вниз, потом всё откачивается назад и встаёт.
   Каждое слово считается замкнутой формой от времени после стопа и расстояния до переднего края,
   поэтому волна сжатия бежит назад по тексту. Автопоказ из одного времени t, петля без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}

var TEXT='Great question! The short answer is no, but the full answer is actually more nuanced than you might expect. To understand why, we first need to look at how microwaves work. Back in 1945, an engineer named Percy Spencer noticed that the chocolate bar in his pocket had melted. So: no.';
var WORDS=TEXT.split(' ');
var CUT=WORDS.indexOf('had');   // в автопоказе стоп приходится сюда: «in his pocket had»
var LH=22,FADE=1.6;

/* ─────────── инерция ───────────
   Затухающий осциллятор, нормированный на первый пик. Старт с ненулевой скоростью: в момент стопа
   слова ещё едут. */
function osc(f,z){
  var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z),tp=Math.atan(wd/(z*w))/wd,pk=Math.exp(-z*w*tp)*Math.sin(wd*tp);
  return function(t){return t<=0?0:Math.exp(-z*w*t)*Math.sin(wd*t)/pk};
}
var OX=osc(2.1,.3),OL=osc(2.8,.32),OY=osc(2.4,.3),OJ=osc(7,.42);
var PHY={
  AX:22,   // насколько далеко проезжает хвост, px
  LX:1.8,  // на скольких словах от края сжатие рассасывается
  DX:.0065,// задержка волны на слово, с
  TH:14,   // наклон, градусы
  AY:14,   // строки съезжаются вниз, px
  LY:1.25,
  DY:.034, // задержка волны на строку
  K:.05   // сжатие слова на пиксель нахлёста
};

/* ─────────── разметка ─────────── */
var chat=document.getElementById('chat'),mover=document.getElementById('mover'),zoom=document.getElementById('zoom');
var ask=document.getElementById('ask'),ans=document.getElementById('ans'),flow=document.getElementById('flow'),wordsEl=document.getElementById('words');
var dot=document.getElementById('dot'),acts=document.getElementById('acts'),retry=document.getElementById('retry');
var go=document.getElementById('go'),sq=document.getElementById('sq'),arr=document.getElementById('arr');
var cur=document.getElementById('cur');

var W=WORDS.map(function(t,i){
  var s=h('span',null,t);flow.appendChild(s);if(i<WORDS.length-1)flow.appendChild(document.createTextNode(' '));
  var e=h('span','w',t);wordsEl.appendChild(e);
  return {t:t,i:i,fs:s,el:e,x:0,y:0,w:0,l:0};
});
var NL=1,M={W:360,H:500,gx:0,gy:0,rx:0,ry:0,ax:0,ay:0};
function measure(){
  W.forEach(function(w){w.x=w.fs.offsetLeft;w.y=w.fs.offsetTop;w.w=w.fs.offsetWidth;w.l=Math.round(w.y/LH)});
  NL=W[W.length-1].l+1;
  set(ans,'height',(NL*LH+36)+'px');
  // всё в координатах карточки
  var cr=chat.getBoundingClientRect(),k=1/S;
  function at(el){var r=el.getBoundingClientRect();return {x:(r.left-cr.left)*k+r.width*k/2,y:(r.top-cr.top)*k+r.height*k/2}}
  var g=at(go),a=at(ans);M.gx=g.x;M.gy=g.y;
  M.ax=(ans.getBoundingClientRect().left-cr.left)*k;M.ay=(ans.getBoundingClientRect().top-cr.top)*k;
  M.W=chat.offsetWidth;M.H=chat.offsetHeight;
}
var S=1;
function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight,H=chat.offsetHeight||500;
  S=REC||STILL?Math.min(w/360*.84,hh/H*.84):clamp(Math.min((w-32)/360,(hh-110)/H),.7,1.6);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

/* ─────────── тема ─────────── */
var TH={ink:[27,26,24],off:[217,214,207],card:[255,255,255]};
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function readTheme(){var cs=getComputedStyle(document.documentElement);TH.ink=hex(cs.getPropertyValue('--ink'));TH.off=hex(cs.getPropertyValue('--off'));TH.card=hex(cs.getPropertyValue('--card'))}
function mixc(a,b,t){return 'rgb('+Math.round(mix(a[0],b[0],t))+','+Math.round(mix(a[1],b[1],t))+','+Math.round(mix(a[2],b[2],t))+')'}

/* ─────────── кадр ───────────
   F.p: сколько слов выдано (дробно); F.st: секунды после стопа или −1; F.pS: выдано к стопу;
   F.crash: 0, если ответ дошёл до конца сам (тогда не трясёт); F.wipe: стирание перед повтором;
   F.acts, F.btn (0 стоп, 1 стрелка), F.press, F.rpress, F.hov, F.cur */
var DX=new Float64Array(WORDS.length);
function frontOf(pS){return Math.min(WORDS.length-1,Math.floor(pS-.8))}
function render(F){
  var st=F.st,stopped=st>=0,fi=stopped?frontOf(F.pS):-1,lf=fi>=0?W[fi].l:0,cr=F.crash==null?1:F.crash;
  // горизонталь: хвост проезжает вперёд, у переднего края сжатие
  if(stopped)for(var i=0;i<=fi;i++){var D=fi-i;DX[i]=cr*PHY.AX*(1-Math.exp(-D/PHY.LX))*OX(st-D*PHY.DX)}
  function dyOf(DL){return cr*PHY.AY*(1-Math.exp(-DL/PHY.LY))*OY(st-DL*PHY.DY)}
  var lineDy=[];for(var l=0;l<NL;l++)lineDy.push(stopped&&l<=lf?dyOf(lf-l):0);
  var hid=0;
  W.forEach(function(w,i){
    var op,dx=0,dy=lineDy[w.l],th=0,sx=1,sy=1,ty=0,ox=0;
    if(!stopped){
      op=sm((F.p-i)/FADE);ty=(1-op)*2;ox=-(1-op)*6;
    }else{
      var op0=sm((F.pS-i)/FADE);
      if(i<=fi){
        op=mix(op0,1,sm(st/.12));
        var D=fi-i;dx=DX[i];
        th=cr*PHY.TH*(.5+.5*Math.exp(-D/7))*OL(st-D*PHY.DX*.7);
        var c=((i>0?DX[i-1]:DX[i])-(i<fi?DX[i+1]:0))/2;
        sx=clamp(1-c*PHY.K,.5,1.12);sy=1+(1-sx)*.3;
      }else{
        // слово, которое модель уже выдала, но не успело проявиться: впечатывается в край и пропадает
        op=op0*(1-sm(st/.13));
        sx=1-eout(st/.16)*.92;ox=-w.w*(1-sx)/2;
        if(i>fi+1)op=0;
      }
      if(F.wipe>0&&fi>0){var d=(fi-i)/fi*.45,k=sm(seg(F.wipe,d,d+.55));op*=1-k;ty-=4*k}
    }
    if(op<.004){set(w.el,'opacity','0');hid++;return}
    set(w.el,'opacity',op.toFixed(3));
    set(w.el,'transform','translate('+f2(w.x+dx+ox)+'px,'+f2(w.y+dy+ty)+'px) skewX('+f2(-th)+'deg) scale('+sx.toFixed(3)+','+sy.toFixed(3)+')');
  });

  // точка стрима на переднем крае
  var k=stopped?fi+1:Math.min(WORDS.length,Math.ceil(F.p)),dop=0,dsx=1;
  if(k>0){
    var lw=W[Math.min(k,WORDS.length)-1];
    if(!stopped)dop=F.p<WORDS.length+.2?1:0;
    else if(cr){dop=1-sm(seg(st,.08,.22));dsx=1-.75*eout(seg(st,0,.06))}
    var bx=lw.x+lw.w;
    set(dot,'opacity',dop.toFixed(3));
    set(dot,'transform','translate('+f2(bx+8)+'px,'+f2(lw.y+12+lineDy[lw.l])+'px) scale('+dsx.toFixed(3)+','+(1+(1-dsx)*.5).toFixed(3)+')');
  }else set(dot,'opacity','0');

  // вопрос тоже клюёт, он выше всех строк
  set(ask,'transform',stopped?'translateY('+f2(dyOf(lf+1.4))+'px)':'none');
  // толчок всей карточки
  set(mover,'transform',stopped&&cr?'translateY('+f2(2*OJ(st))+'px)':'none');

  // кнопки под ответом
  set(acts,'opacity',(F.acts||0).toFixed(3));
  set(acts,'transform','translateY('+((lf+1)*LH+6+(1-(F.acts||0))*-3).toFixed(2)+'px)');
  set(retry,'background',F.hov>0?mixc(TH.card,TH.off,.45*F.hov):'transparent');
  set(retry,'transform','scale('+(1-.1*(F.rpress||0)).toFixed(3)+')');

  // стоп ↔ стрелка
  var b=F.btn||0;
  set(go,'background',mixc(TH.ink,TH.off,b));
  set(go,'transform','scale('+(1-.12*(F.press||0)).toFixed(3)+')');
  set(sq,'opacity',(1-b).toFixed(3));set(sq,'transform','scale('+(1-.5*b).toFixed(3)+')');
  set(arr,'opacity',b.toFixed(3));set(arr,'transform','scale('+(.6+.4*b).toFixed(3)+')');
  set(arr,'color',b>.5?'#fff':'');
  go.setAttribute('aria-label',b<.5?'Stop':'Send');

  drawCur(F);
}
function drawCur(F){
  var c=F.cur;
  if(!c||c.a<=.001){set(cur,'opacity','0');return}
  set(cur,'opacity',c.a.toFixed(3));
  set(cur,'transform','translate('+(c.x-5).toFixed(2)+'px,'+(c.y-2.6).toFixed(2)+'px) scale('+c.s.toFixed(3)+')');
  set(cur,'transformOrigin','5px 2.6px');
}

/* ─────────── автопоказ ───────────
   стрим уже идёт, курсор подходит к стопу, удар, качка, под ответом проявляются кнопки,
   курсор жмёт повтор, ответ стирается с переднего края назад, стрим начинается заново */
var TL={};
function buildTL(){
  TL.PRE=1.6;            // столько стрима уже прошло к началу петли: первый кадр в движении
  TL.STOP=1.2;
  TL.PS=CUT+1;
  TL.R=TL.PS/(TL.PRE+TL.STOP);
  TL.ACT0=TL.STOP+.62;TL.ACT1=TL.ACT0+.2;
  TL.CM0=2.95;TL.CM1=3.4;TL.RP=3.5;
  TL.W0=3.58;TL.W1=3.9;
  TL.S0=3.98;
  // повтор: ответ дописывается до конца («So: no.»), пауза на чтение, потом стирание и снова середина стрима
  TL.DONE=TL.S0+(WORDS.length+FADE)/TL.R;
  TL.HOLD=1.5;
  TL.W2=TL.DONE+TL.HOLD;
  TL.S1=TL.W2+.4;
  TL.END=TL.W2;          // ролик кончается на дописанном ответе
  CYCLE=TL.S1+TL.PRE;
}
var CYCLE=5;
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
function scene(u){
  var F={p:0,st:-1,btn:0,acts:0,press:0,rpress:0,hov:0,wipe:0,cur:null};
  if(u<TL.STOP)F.p=(u+TL.PRE)*TL.R;
  else if(u>=TL.S1)F.p=(u-TL.S1)*TL.R;
  else if(u>=TL.DONE){
    F.st=u-TL.DONE;F.pS=WORDS.length+FADE;F.p=F.pS;F.crash=0;
    F.wipe=seg(u,TL.W2,TL.W2+.32);
    F.acts=sm(seg(u,TL.DONE+.08,TL.DONE+.28))*(1-sm(seg(u,TL.W2,TL.W2+.14)));
    F.btn=sm(seg(u,TL.DONE,TL.DONE+.2))*(1-sm(seg(u,TL.W2+.02,TL.W2+.2)));
  }
  else if(u>=TL.S0)F.p=(u-TL.S0)*TL.R;
  else{
    F.st=u-TL.STOP;F.pS=TL.PS;F.p=TL.PS;
    F.wipe=seg(u,TL.W0,TL.W1);
    F.acts=sm(seg(u,TL.ACT0,TL.ACT1))*(1-sm(seg(u,TL.W0,TL.W0+.14)));
    F.btn=sm(seg(u,TL.STOP+.03,TL.STOP+.22))*(1-sm(seg(u,TL.RP+.05,TL.RP+.22)));
    F.hov=sm(seg(u,TL.CM1-.08,TL.CM1+.02))*(1-sm(seg(u,TL.W0,TL.W0+.12)));
  }
  F.press=pulse(u,TL.STOP-.03,TL.STOP+.04);
  F.rpress=pulse(u,TL.RP-.03,TL.RP+.04);
  // курсор: снизу справа к стопу, потом к повтору, потом уходит
  if(u>.25&&u<4.1){
    var rx=M.ax+acts.offsetLeft+acts.children[1].offsetLeft+15,ry=M.ay+(CUT>=0?W[CUT].l+1:0)*LH+6+15;
    var gx=M.gx+1,gy=M.gy+3,e=eout(seg(u,.25,TL.STOP-.1));
    var c={x:mix(gx+70,gx,e),y:mix(gy+140,gy,e),a:sm(seg(u,.25,.42)),s:1-.12*Math.max(F.press,F.rpress)};
    if(u>=TL.CM0){var m=eio(seg(u,TL.CM0,TL.CM1));c.x=mix(gx,rx+1,m);c.y=mix(gy,ry+3,m)}
    if(u>=TL.RP+.12){var o=eio(seg(u,TL.RP+.12,4.1));c.x+=26*o;c.y+=70*o;c.a*=1-sm(o*1.3)}
    F.cur=c;
  }
  return F;
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  W.forEach(function(w,i){
    var a=i/TL.R-TL.PRE;if(a>=0&&a<TL.STOP)EVENTS.push([a,'tick',(w.x/324-.5)*.5,i]);
    EVENTS.push([TL.S0+i/TL.R,'tick',(w.x/324-.5)*.5,i]);
    var b=TL.S1+i/TL.R;if(b<CYCLE)EVENTS.push([b,'tick',(w.x/324-.5)*.5,i]);
  });
  EVENTS.push([TL.STOP-.03,'press'],[TL.STOP,'crash',CUT],[TL.STOP+.06,'release']);
  EVENTS.push([TL.RP-.03,'press'],[TL.RP+.05,'release'],[TL.W0,'wipe'],[TL.DONE+.05,'done'],[TL.W2,'wipe']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим: стоп и повтор жмёт сам зритель ─────────── */
var mode='auto',live=null;
function nowS(){return performance.now()/1000}
function goLive(F){
  if(mode==='live')return;
  mode='live';var n=nowS();
  live={s0:n-F.p/TL.R,stop:F.st>=0?n-F.st:null,pS:F.pS,crash:1,wipe0:null,acts0:F.st>=0?n-1:null,lastP:F.p};
  document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';live=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
var RATE_LIVE=0;
function liveF(n){
  var F={p:0,st:-1,btn:0,acts:0,press:livePress,rpress:liveRPress,hov:retryHover?1:0,wipe:0,cur:null};
  if(live.stop==null){
    F.p=(n-live.s0)*TL.R;
    if(F.p>=WORDS.length+FADE){live.stop=n;live.pS=WORDS.length+FADE;live.crash=0;live.acts0=n}
    else return F;
  }
  F.st=n-live.stop;F.pS=live.pS;F.p=live.pS;F.crash=live.crash;
  F.acts=sm(seg(n,live.acts0+(live.crash?.5:0),live.acts0+(live.crash?.7:.2)));
  F.btn=sm(seg(F.st,.03,.22));
  if(live.wipe0!=null){
    F.wipe=seg(n,live.wipe0,live.wipe0+.32);
    F.acts*=1-sm(seg(n,live.wipe0,live.wipe0+.14));
    F.btn*=1-sm(seg(n,live.wipe0+.02,live.wipe0+.2));
    if(n>=live.wipe0+.4){live={s0:n,stop:null,pS:0,crash:1,wipe0:null,acts0:null}}
  }
  return F;
}
var livePress=0,liveRPress=0,retryHover=false;
function stopNow(){
  Sound.start();
  if(mode==='auto'){var u=uNow();var F=scene(u);if(F.st>=0)return;goLive(F)}
  if(live.stop!=null)return;
  var n=nowS(),p=(n-live.s0)*TL.R;
  if(p<1)return;
  live.stop=n;live.pS=p;live.crash=1;live.acts0=n;
  Sound.play([0,'press']);Sound.play([0,'crash',frontOf(p)]);Sound.play([0,'release'],.06);
  livePress=1;setTimeout(function(){livePress=0},90);
}
function retryNow(){
  Sound.start();
  if(mode==='auto'){var F=scene(uNow());if(F.st<0||F.wipe>0||F.acts<.5)return;goLive(F)}
  if(live.stop==null||live.wipe0!=null)return;
  live.wipe0=nowS();
  Sound.play([0,'press']);Sound.play([0,'release'],.05);Sound.play([0,'wipe'],.08);
  liveRPress=1;setTimeout(function(){liveRPress=0},90);
}
go.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();stopNow()});
go.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();stopNow()}});
retry.addEventListener('click',function(){if(!REC)retryNow()});
retry.addEventListener('pointerenter',function(){retryHover=true});
retry.addEventListener('pointerleave',function(){retryHover=false});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '||e.key==='Escape'){e.preventDefault();stopNow()}
  if(e.key==='r'||e.key==='Enter'){e.preventDefault();retryNow()}
});

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false,lastLiveP=0;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(scene(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=TL.END-PH-1e-6)window.__done=true;
  }else{
    var F=liveF(nowS());
    render(F);
    if(F.st<0){var a=Math.floor(lastLiveP),b=Math.floor(F.p);for(var i=a+1;i<=b&&i<=WORDS.length;i++)Sound.play([0,'tick',((W[i-1].x)/324-.5)*.5,i-1])}
    lastLiveP=F.st<0?F.p:0;
  }
  requestAnimationFrame(tick);
}

var playBtn=document.getElementById('play');
playBtn.onclick=function(){Sound.start();paused=false;goAuto()};
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
  readTheme();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(reduce){PHY.AX*=.35;PHY.TH*=.35;PHY.AY*=.35}

window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,TL.END-PH)};
window.__TL=TL;

function init(){fit();measure();fit();measure();buildTL();buildEvents()}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',function(){fit();measure();buildEvents()});
  requestAnimationFrame(tick);
});
