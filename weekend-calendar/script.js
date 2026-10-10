/* ─────────── Weekend ───────────
   Календарь на неделю. Красная линия «сейчас» прогоняет неделю, прошедшие встречи бледнеют
   ровно по линии. В пятницу время ползёт, последняя «Quick sync» съедается минута за минутой.
   В 5:00 PM в переключателе Day Week Month Year появляется пятый сегмент Weekend. Клик:
   будни сжимаются в полоски, суббота и воскресенье занимают окно, сетка часов и линия времени
   исчезают. Потом понедельник возвращает всё обратно.
   Автопоказ считается из одного времени t, поэтому петля замыкается без шва. */

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
function px(v){return v.toFixed(2)+'px'}
// затухающая пружина от 0 к 1 по секундам: a затухание, b частота
function spring(t,a,b){if(t<=0)return 0;return 1-Math.exp(-a*t)*(Math.cos(b*t)+a/b*Math.sin(b*t))}
function bump(t,d){return t<0||t>d?0:Math.sin(Math.PI*t/d)}

/* ─────────── геометрия ─────────── */
var W=420,G0=56,G1=8,SLIV=11,GT=8,HOUR=61,H0=12;
var DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],DNUM=['28','29','30','1','2','3','4'],DI=['M','T','W','T','F','S','S'];
// день, начало, конец (часы), название, календарь
var EVD=[
  [0,13,14,'Planning','b'],[0,14.5,15,'1:1','p'],[0,16,17,'Sync','b'],
  [1,12.5,13.5,'Review','b'],[1,14,15.5,'Kickoff','b'],[1,16,16.5,'1:1','p'],[1,17,17.5,'Sync','b'],
  [2,12,13,'All hands','b'],[2,13.5,14,'1:1','p'],[2,14.5,16,'OKRs','b'],[2,16.5,17.5,'Sync','b'],
  [3,13,14,'Retro','b'],[3,14,15,'Hiring','p'],[3,15.5,16,'Sync','b'],[3,16,17,'Crit','b'],
  [4,12,13,'Demo','b'],[4,14,15,'Sync','b'],[4,15,15.5,'1:1','p'],[4,16.5,17,'Quick sync','b']
];
function fmt(x){var hh=Math.floor(x),mm=Math.round((x-hh)*60),h12=hh%12||12;return h12+(mm?':'+String(mm).padStart(2,'0'):'')+' PM'}

/* ─────────── сценарий ─────────── */
var TL={
  MON0:.9,      // после щелчка понедельника линия стоит на 12 PM
  DAY:.45,      // будний день пролетает
  FRIS:1.1,     // пятница: от полудня до 4:56 с торможением
  TICK:.27,     // потом часы тикают по минуте
  SEGIN:0,SEL:0,PRESS:0,CUR0:0,CURAR:0,MORPH:0,HOP1:0,HOP2:0,CUROUT:0
};
TL.FRI0=TL.MON0+4*TL.DAY;
TL.TK=[1,2,3].map(function(k){return TL.FRI0+TL.FRIS+k*TL.TICK});
TL.FIVE=TL.FRI0+TL.FRIS+3*TL.TICK+.35;   // перед пятью пауза чуть длиннее
TL.SEGIN=TL.FIVE+.14;
TL.CUR0=TL.FIVE-.2;
TL.CURAR=TL.FIVE+.58;
TL.PRESS=TL.FIVE+.64;
TL.SEL=TL.PRESS+.05;
TL.MORPH=TL.PRESS+.07;
TL.CUROUT=TL.MORPH+.8;
TL.HOP1=TL.MORPH+1.05;
TL.HOP2=TL.HOP1+.8;
var CYCLE=TL.HOP2+.85;
TL.C=CYCLE;

// пятница: от 12 до 4:56 с торможением, скорость на входе как у будних дней
var FRI_END=16+56/60;
function friH(q){return 12+(FRI_END-12)*eout(q)}
function friQ(hh){return 1-Math.cbrt(1-(hh-12)/(FRI_END-12))}

function springIn(t){return spring(t,9,13.5)}
function springOut(t){return spring(t,13,17)}

function scene(u){
  var F={m:[0,0,0,0,0],gk:0,lw:0,segS:0,sel:0,day:0,h:12,vd:-1,lineA:1,todayF:0,r:[1,1,1,1,1],
         cx:0,cy:0,ca:0,cp:0,pulse:0,sweep:0,cam:0,ts:1};
  var i;
  if(u<TL.MON0){
    // понедельник: всё возвращается, новая неделя
    for(i=0;i<5;i++){F.m[i]=1-springOut(u-.04-i*.035);F.r[i]=sm(seg(u,.14+i*.05,.42+i*.05))}
    F.gk=1-sm(seg(u,.06,.36));F.lw=1-sm(seg(u,0,.22));
    F.sel=1-eio(seg(u,0,.26));F.segS=1-spring(u-.08,12,15);
    // кружок гаснет на воскресенье и загорается на понедельнике
    F.todayF=u<.16?6:0;F.ts=u<.16?1-eout(seg(u,0,.14)):eout(seg(u,.2,.4));
    F.lineA=sm(seg(u,.32,.6));
  }else if(u<TL.FRI0){
    var k=(u-TL.MON0)/TL.DAY,d=Math.floor(k),f=k-d;
    F.day=d;F.h=12+6*f;F.todayF=d+eio(seg(f,.86,1));F.sweep=1;
  }else if(u<TL.FRI0+TL.FRIS){
    F.day=4;F.h=friH((u-TL.FRI0)/TL.FRIS);F.todayF=4;F.sweep=1;
  }else if(u<TL.FIVE){
    // последние минуты: каждая перекатывается барабаном
    var vd=296;TL.TK.concat([TL.FIVE]).forEach(function(tk){vd+=eio(seg(u,tk,tk+.14))});
    F.day=4;F.vd=vd;F.h=12+vd/60;F.todayF=4;
  }else{
    F.day=4;F.h=17;F.vd=300;
    F.pulse=bump(u-TL.FIVE,.32);
    F.segS=spring(u-TL.SEGIN,10,13);
    F.sel=eio(seg(u,TL.SEL,TL.SEL+.3));
    var t=u-TL.MORPH;
    for(i=0;i<5;i++)F.m[i]=springIn(t-(4-i)*.04);
    F.gk=sm(seg(t,0,.34));F.lw=sm(seg(t,.12,.5));
    F.todayF=4+eio(seg(u,TL.HOP1,TL.HOP1+.32))+eio(seg(u,TL.HOP2,TL.HOP2+.32));
  }
  // камера: в пятницу наезжает на линию и метку, в пять отъезжает к переключателю
  F.cam=eio(seg(u,TL.FRI0+.1,TL.FRI0+TL.FRIS+.25))*(1-eio(seg(u,TL.FIVE+.06,TL.FIVE+.62)));
  // курсор: приходит к новому сегменту, жмёт, уходит в сторону и гаснет
  if(u>=TL.CUR0&&u<TL.CUROUT+.4){
    var we=segRects(1,1)[4],tx=we.x+we.w*.56,ty=23+3;
    var a=eio(seg(u,TL.CUR0,TL.CURAR));
    F.cx=mix(W*.8,tx,a)+Math.sin(a*Math.PI)*-14;F.cy=mix(300,ty,a)+Math.sin(a*Math.PI)*10;
    var o=eout(seg(u,TL.MORPH+.25,TL.CUROUT+.3));
    F.cx+=o*-70;F.cy+=o*150;
    F.ca=sm(seg(u,TL.CUR0,TL.CUR0+.14))*(1-sm(seg(u,TL.CUROUT,TL.CUROUT+.3)));
    F.cp=bump(u-TL.PRESS,.16);
  }
  return F;
}

/* ─────────── DOM ─────────── */
var win=document.getElementById('win'),zoom=document.getElementById('zoom'),grid=document.getElementById('grid');
var heads=document.getElementById('heads'),todayEl=document.getElementById('today');
var segEl=document.getElementById('seg'),pill=document.getElementById('pill'),cur=document.getElementById('cur');
var segBtns=[].slice.call(segEl.querySelectorAll('button'));
var COLS=[],HDS=[],HRS=[],EVS=[];
var nowEl,labEl,dgH,dgT,dgO,HW=[];

(function build(){
  var i;
  for(i=0;i<7;i++){
    var c=h('div','col');c.appendChild(h('div','hl'));grid.appendChild(c);COLS.push({el:c,hl:c.firstChild});
    var hd=h('div','hd'),dn=h('span','dn',DN[i]),nm=h('span','nm',DNUM[i]),nmw=h('span','nmw',DNUM[i]),ini=h('span','in',DI[i]),inw=h('span','inw',DI[i]);
    [dn,ini,nm].forEach(function(e){hd.appendChild(e)});
    heads.appendChild(hd);HDS.push({el:hd,dn:dn,nm:nm,nmw:nmw,ini:ini,inw:inw});
  }
  // белые цифры поверх красного кружка
  heads.appendChild(todayEl);
  HDS.forEach(function(H){heads.appendChild(H.nmw);heads.appendChild(H.inw)});
  for(i=0;i<=6;i++){var r=h('div','hr',fmt(H0+i));grid.appendChild(r);HRS.push({el:r,y:GT+i*HOUR})}
  EVD.forEach(function(d){
    var e=h('div','ev '+d[4]),dim=h('i','dim'),t=h('b','t',d[3]),tm=h('span','tm',fmt(d[1]));
    e.appendChild(t);if(d[2]-d[1]>.6)e.appendChild(tm);e.appendChild(dim);grid.appendChild(e);
    EVS.push({d:d[0],s:d[1],e:d[2],el:e,dim:dim,t:t,tm:tm,a:d[0]*24+d[1],b:d[0]*24+d[2]});
  });
  nowEl=h('div','now');grid.appendChild(nowEl);
  labEl=h('div','lab');
  function strip(items){var s=h('span','dg'),u=h('u');items.forEach(function(x){u.appendChild(h('b',null,x))});s.appendChild(u);return {el:s,u:u}}
  dgH=strip(['12','1','2','3','4','5','6','7']);dgT=strip(['0','1','2','3','4','5','0']);dgO=strip(['0','1','2','3','4','5','6','7','8','9','0']);
  labEl.appendChild(dgH.el);labEl.appendChild(h('span',null,':'));labEl.appendChild(dgT.el);labEl.appendChild(dgO.el);labEl.appendChild(h('span','ap','PM'));
  grid.appendChild(labEl);
})();

var SW=[],HRW=[];
function measure(){
  segBtns.forEach(function(b,i){b.style.transform='none';SW[i]=b.offsetWidth});
  HRW=[];[].slice.call(dgH.u.children).forEach(function(b){b.style.display='inline-block';HRW.push(b.offsetWidth);b.style.display=''});
  HRS.forEach(function(r){r.w=r.el.offsetWidth});
}
// раскладка сегментов: Weekend растёт из нуля, весь контрол остаётся по центру
function segRects(s,sel){
  var ws=SW.slice(0,4).concat([SW[4]*Math.max(0,s)]),tot=4,x=0,out=[];
  ws.forEach(function(w){tot+=w});
  var x0=W/2-tot/2;x=x0+2;
  ws.forEach(function(w){out.push({x:x,w:w});x+=w});
  out.x0=x0;out.tot=tot;
  return out;
}

var S=1;
function fit(){
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?Math.min(w/W*.9,hh/520*.86):clamp(Math.min((w-24)/W,(hh-110)/520),.6,1.6);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

/* ─────────── отрисовка ─────────── */
var CAM={x:180,y:300,z:1.3};
function render(F){
  var i,R=segRects(F.segS,F.sel);
  var cz=mix(1,CAM.z,F.cam),ccx=mix(W/2,CAM.x,F.cam),ccy=mix(260,CAM.y,F.cam);
  set(win,'transform','translate('+px(W/2-ccx*cz)+','+px(260-ccy*cz)+') scale('+cz.toFixed(4)+')');
  // переключатель
  set(segEl,'left',px(R.x0));set(segEl,'width',px(R.tot));
  segBtns.forEach(function(b,k){
    set(b,'left',px(R[k].x-R.x0));
    if(k===4){
      var v=c01(F.segS);
      set(b,'opacity',sm(seg(v,.35,1)).toFixed(3));
      set(b,'transform','translateX('+px(-(1-Math.min(1,F.segS))*SW[4]/2)+') scale('+mix(.7,1,Math.min(1.08,F.segS)).toFixed(3)+')');
      set(b,'visibility',F.segS<.01?'hidden':'visible');
    }
  });
  var a=R[1],b=R[4],sel=c01(F.sel);
  set(pill,'left',px(mix(a.x,b.x,sel)+1-R.x0));set(pill,'width',px(mix(a.w,b.w,sel)-2));

  // колонки: будни сжимаются до полосок, выходные забирают остаток
  var g=mix(G0,G1,F.gk),base=(W-G0)/7,ws=[],xs=[],sum=0;
  for(i=0;i<5;i++){ws[i]=Math.max(3,mix(base,SLIV,F.m[i]));sum+=ws[i]}
  ws[5]=ws[6]=(W-g-sum)/2;
  var x=g;for(i=0;i<7;i++){xs[i]=x;x+=ws[i]}
  for(i=0;i<7;i++){
    var C=COLS[i];set(C.el,'left',px(xs[i]));set(C.el,'width',px(ws[i]+1));
    set(C.hl,'opacity',(i>4?1-F.lw:1).toFixed(3));
    var H=HDS[i],full=sm(seg(ws[i],34,46)),ini=1-sm(seg(ws[i],18,28));
    set(H.el,'left',px(xs[i]));set(H.el,'width',px(ws[i]));
    set(H.dn,'opacity',full.toFixed(3));set(H.nm,'opacity',full.toFixed(3));set(H.ini,'opacity',ini.toFixed(3));
    var on=c01(1-Math.abs(F.todayF-i))*F.ts;
    set(H.nmw,'left',px(xs[i]));set(H.nmw,'width',px(ws[i]));set(H.inw,'left',px(xs[i]));set(H.inw,'width',px(ws[i]));
    set(H.nmw,'opacity',(full*on).toFixed(3));set(H.inw,'opacity',(ini*on).toFixed(3));
  }
  // кружок сегодняшнего дня: между центрами колонок, на полоске сжимается в точку
  var ta=clamp(Math.floor(F.todayF),0,6),tb=clamp(ta+1,0,6),tf=F.todayF-ta;
  var cxT=mix(xs[ta]+ws[ta]/2,xs[tb]+ws[tb]/2,tf),szT=mix(clamp(ws[ta]-1,9,22),clamp(ws[tb]-1,9,22),tf);
  set(todayEl,'transform','translate('+px(cxT-11)+',0) scale('+(szT/22*F.ts).toFixed(3)+')');

  // часы слева
  var ly=GT+(F.h-H0)*HOUR,la=F.lineA*(1-F.gk);
  HRS.forEach(function(r){
    var near=c01((Math.abs(r.y-ly)-9)/6);
    set(r.el,'left',px(g-6-r.w));set(r.el,'top',px(r.y-6));
    set(r.el,'opacity',((1-F.gk)*mix(1,near,la)).toFixed(3));
  });

  // встречи: прошедшая часть бледнеет ровно по линии времени
  var abs=F.day*24+F.h;
  EVS.forEach(function(E){
    var w=ws[E.d],tx=c01((w-30)/14);
    set(E.el,'left',px(xs[E.d]+1.5));set(E.el,'width',px(Math.max(2,w-3)));
    set(E.el,'top',px(GT+(E.s-H0)*HOUR+1));set(E.el,'height',px((E.e-E.s)*HOUR-2));
    set(E.t,'opacity',tx.toFixed(3));set(E.tm,'opacity',(tx*.78).toFixed(3));
    var p=Math.max(c01((abs-E.a)/(E.b-E.a)),1-F.r[E.d]);
    set(E.dim,'height',(p*100).toFixed(2)+'%');
  });

  // линия «сейчас» и метка с барабаном минут
  set(nowEl,'left',px(xs[F.day]));set(nowEl,'width',px(ws[F.day]+1));set(nowEl,'top',px(ly));
  set(nowEl,'opacity',la.toFixed(3));
  var vd=F.vd>=0?F.vd:Math.floor((F.h-H0)*60+1e-6);
  var o=((vd%10)+10)%10,tc=Math.floor(vd/10+1e-9)+c01(o-9),hc=Math.floor(vd/60+1e-9)+c01(vd%60-59);
  set(dgO.u,'transform','translateY('+px(-o*16)+')');
  set(dgT.u,'transform','translateY('+px(-(tc%6)*16)+')');
  set(dgH.u,'transform','translateY('+px(-hc*16)+')');
  var hi=Math.floor(hc),hw=mix(HRW[hi]||6,HRW[hi+1]||6,hc-hi);
  set(dgH.el,'width',px(hw));
  set(labEl,'right',px(W-g-1));set(labEl,'top',px(ly));set(labEl,'opacity',la.toFixed(3));
  set(labEl,'transform','scale('+(1+.1*F.pulse).toFixed(3)+')');

  // курсор
  set(cur,'opacity',F.ca.toFixed(3));
  set(cur,'transform','translate('+px(F.cx-5)+','+px(F.cy-3)+') scale('+(1-.12*F.cp).toFixed(3)+')');
}

/* ─────────── звук: события петли ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  var d,i;
  EVENTS.push([0,'snap']);
  // будни: каждая встреча, которую проходит линия, щёлкает
  EVS.forEach(function(E){
    var e=Math.min(E.e,18),t;
    if(E.d<4)t=TL.MON0+(E.d+(e-12)/6)*TL.DAY;
    else{if(e>=17)return;t=TL.FRI0+friQ(e)*TL.FRIS}
    EVENTS.push([t,'eat',E.d/4,(E.e-E.s)]);
  });
  for(d=1;d<=4;d++)EVENTS.push([TL.MON0+d*TL.DAY,'day',d/4]);
  // последние минуты пятницы: каждая щёлкает
  TL.TK.forEach(function(tk,k){EVENTS.push([tk+.1,'min',k/2])});
  EVENTS.push([TL.FIVE,'chime']);
  EVENTS.push([TL.SEGIN+.02,'pop']);
  EVENTS.push([TL.PRESS,'press']);EVENTS.push([TL.PRESS+.09,'release']);
  EVENTS.push([TL.MORPH+.03,'whoosh']);EVENTS.push([TL.MORPH+.42,'settle']);
  EVENTS.push([TL.HOP1+.16,'hop',0]);EVENTS.push([TL.HOP2+.16,'hop',1]);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим: зритель сам переключает Week и Weekend ─────────── */
var mode='auto',live=null,lastF=null;
function nowS(){return performance.now()/1000}
function liveF(n){
  var t=n-live.t0,to=live.to,fr=live.from,F={m:[],gk:0,lw:0,segS:1,sel:0,day:4,h:17,lineA:1,todayF:4,ts:1,cam:0,r:[1,1,1,1,1],cx:0,cy:0,ca:0,cp:0,pulse:0};
  for(var i=0;i<5;i++){
    var k=to?springIn(t-(4-i)*.04):springOut(t-.02-i*.035);
    F.m[i]=mix(fr.m[i],to,k);
  }
  var gk=to?sm(seg(t,0,.34)):sm(seg(t,.06,.36)),lw=to?sm(seg(t,.12,.5)):sm(seg(t,0,.22));
  F.gk=mix(fr.gk,to,gk);F.lw=mix(fr.lw,to,lw);
  F.sel=mix(fr.sel,to,eio(seg(t,0,.28)));
  F.segS=mix(fr.segS,1,spring(t,10,13));
  return F;
}
function choose(v){
  if(v!==1&&v!==4)return;
  Sound.start();
  var n=nowS(),from=mode==='live'?liveF(n):lastF||scene(0);
  if(mode==='auto'&&from.segS<.5)return;  // Weekend ещё не наступил
  var to=v===4?1:0;
  if(mode==='live'&&live.to===to)return;
  mode='live';live={t0:n,to:to,from:{m:from.m.slice(),gk:from.gk,lw:from.lw,sel:from.sel,segS:from.segS}};
  Sound.play([0,'press']);Sound.play([0,'release'],.08);
  Sound.play([0,to?'whoosh':'snap'],.04);if(to)Sound.play([0,'settle'],.44);
}
segBtns.forEach(function(b){
  b.addEventListener('click',function(e){if(REC)return;choose(+b.dataset.v)});
});
addEventListener('keydown',function(e){
  if(e.key==='ArrowRight')choose(4);
  if(e.key==='ArrowLeft')choose(1);
});
function goAuto(){mode='auto';live=null;acc=0;lastU=0}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused&&!reduce)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    if(reduce&&!REC)u=TL.MORPH+1.2;
    lastF=scene(u);render(lastF);
    if(!REC&&!paused)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    lastF=liveF(nowS());render(lastF);
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

/* тема */
var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

// для проверки кадров: __seek(секунды петли); для записи: __renderAudio
window.__seek=function(t){goAuto();paused=true;acc=t;lastF=scene(uNow());render(lastF)};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60)};
window.__TL=TL;

(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  fit();measure();buildEvents();
  addEventListener('resize',function(){fit();measure()});
  requestAnimationFrame(tick);
});
