/* ─────────── Charged ───────────
   Экран блокировки с пятницы 17:00 до утра понедельника. Телефон на 3%, его ставят на зарядку,
   и выходные проматываются: часы разгоняются до размытия, день и ночь сменяют друг друга
   (оформление «Автоматически»), дата перещёлкивается. Заряд доходит до 100 ровно в 00:00
   понедельника. Потом 09:00, приходят уведомления, и каждое съедает кусок заряда до тех же 3%.
   Экран гаснет, снова пятница. Автопоказ считается из одного времени u, петля без шва. */

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
function setVar(el,k,v){if(!el.__v)el.__v={};if(el.__v[k]!==v){el.__v[k]=v;el.style.setProperty(k,v)}}
function setAt(el,k,v){if(!el.__a)el.__a={};if(el.__a[k]!==v){el.__a[k]=v;el.setAttribute(k,v)}}
function px(v){return v.toFixed(2)+'px'}
// затухающая пружина от 0 к 1: a затухание, b частота
function spring(t,a,b){if(t<=0)return 0;return 1-Math.exp(-a*t)*(Math.cos(b*t)+a/b*Math.sin(b*t))}
function bump(t,d){return t<0||t>d?0:Math.sin(Math.PI*t/d)}
function jolt(t,a,b){return t<0?0:Math.exp(-a*t)*Math.sin(b*t)}

/* ─────────── время сюжета: часы от полуночи пятницы ─────────── */
var ST0=17,ST1=71+57/60;          // пятница 17:00 → воскресенье 23:57
var DR=[100,78,55,34,17,3];       // заряд после каждого уведомления понедельника

// разгон выходных: скорость ∝ x^RA (1-x)^RB, быстро взлетает и долго тормозит к вечеру воскресенья
var RA=2,RB=2.4,FN=2000,FT=new Float64Array(FN+1);
(function(){var s=0,i;for(i=1;i<=FN;i++){var x=(i-.5)/FN;s+=Math.pow(x,RA)*Math.pow(1-x,RB);FT[i]=s}for(i=1;i<=FN;i++)FT[i]/=s})();
function runF(x){x=c01(x)*FN;var i=Math.min(FN-1,Math.floor(x));return mix(FT[i],FT[i+1],x-i)}

var TL={PLUG:.12,RUN0:.32,RUN:2.35,TKG:.27,MIDG:.4,READY:.62,MONR:.68,NG:.14,HOLD:.6,BLACK:.42};
TL.RUN1=TL.RUN0+TL.RUN;
TL.TK=[TL.RUN1+TL.TKG,TL.RUN1+2*TL.TKG,TL.RUN1+2*TL.TKG+TL.MIDG];  // 23:58, 23:59, 00:00
TL.MID=TL.TK[2];
TL.MON0=TL.MID+.2+TL.READY;
TL.N1=TL.MON0+TL.MONR+.12;
TL.NT=[0,1,2,3,4].map(function(k){return TL.N1+k*TL.NG});
TL.OFF=TL.NT[4]+.28+TL.HOLD;
TL.RESET=TL.OFF+.2;
TL.WAKE=TL.OFF+TL.BLACK;
var CYCLE=TL.WAKE+.36;
TL.C=CYCLE;

function tickDur(k){return k===2?.2:.15}
function story(u){
  if(u<TL.RUN0)return ST0;
  if(u<TL.RUN1)return ST0+(ST1-ST0)*runF((u-TL.RUN0)/TL.RUN);
  if(u<TL.MON0){var m=0;for(var k=0;k<3;k++)m+=eio(seg(u,TL.TK[k],TL.TK[k]+tickDur(k)));return ST1+m/60}
  if(u<TL.RESET)return 72+9*eio(seg(u,TL.MON0,TL.MON0+TL.MONR));
  return ST0;
}
function battery(u){
  if(u<TL.RUN0)return 3;
  if(u<TL.RUN1)return 3+94*(story(u)-ST0)/(ST1-ST0);
  var b,k;
  if(u<TL.N1){b=97;for(k=0;k<3;k++)b+=eio(seg(u,TL.TK[k],TL.TK[k]+tickDur(k)));return b}
  if(u<TL.RESET){b=100;for(k=0;k<5;k++)b-=(DR[k]-DR[k+1])*eio(seg(u,TL.NT[k]+.06,TL.NT[k]+.28));return b}
  return 3;
}
function deriv(f,u){var e=1/500;return(f(Math.min(u+e,CYCLE))-f(Math.max(u-e,0)))/(2*e)}

/* переходы по времени сюжета: закаты, рассветы, полночи, отключение зарядки */
var TRN=[],MIDS=[],UNPLUG=0;
function crossing(th){
  var a=TL.RUN0,b=TL.RESET-1e-4,du=.002,u;
  for(u=a;u<b;u+=du)if(story(u)<th&&story(u+du)>=th){var lo=u,hi=u+du;for(var i=0;i<40;i++){var m=(lo+hi)/2;if(story(m)<th)lo=m;else hi=m}return hi}
  return null;
}
function buildTransitions(){
  TRN=[];MIDS=[];
  [19,31,43,55,67,79].forEach(function(th,k){var u=crossing(th);if(u!=null)TRN.push({u:u,d:k%2?-1:1})});
  [24,48,72].forEach(function(th){var u=crossing(th);if(u!=null)MIDS.push(u)});
  UNPLUG=crossing(80);
}
var DAYN=.26;
function night(u){
  if(u>=TL.RESET)return 0;
  var n=0;TRN.forEach(function(t){n+=t.d*eio(seg(u,t.u-DAYN/2,t.u+DAYN/2))});
  return c01(n);
}

/* барабаны: целые шаги с быстрым перекатом, на скорости переходят в непрерывное вращение */
function quant(x,v){
  var r=c01(Math.abs(v)*.08);
  if(r>=1)return x;
  var i=Math.floor(x),f=x-i;
  if(r<=1e-4)return i;
  return i+eio(c01((f-(1-r))/r));
}
var TEN=[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,2,2,2,2,3];
function clockPos(M){
  var o=((M%10)+10)%10;
  var m1=((Math.floor(M/10+1e-9)%6)+6)%6+c01(o-9);
  var mm=((M%60)+60)%60,hr=Math.floor(M/60+1e-9)+c01(mm-59);
  var hh=((hr%24)+24)%24,hi=Math.floor(hh),hf=hh-hi;
  return [TEN[hi]+(TEN[hi+1]-TEN[hi])*hf,hh,m1,o];
}
function batPos(B){
  var o=((B%10)+10)%10;
  return [Math.floor(B/10+1e-9)+c01(o-9),o];
}

/* ─────────── кадр сюжета ─────────── */
var CAMW={y:236},CAMM={y:330,z:.86};
function scene(u){
  var F={u:u},k;
  var s=story(u);F.s=s;
  var M=s*60;
  if((u>=TL.RUN0&&u<TL.RUN1)||(u>=TL.MON0&&u<TL.RESET))M=quant(M,deriv(story,u)*60);
  F.cp=clockPos(M);
  var dp=0;if(u<TL.RESET)MIDS.forEach(function(m){dp+=eio(seg(u,m-.03,m+.22))});
  F.dp=dp;
  F.N=night(u);
  var B=battery(u),vb=deriv(battery,u);F.B=B;F.vb=vb;
  var BN=B;if(u>=TL.RUN0&&u<TL.RUN1)BN=quant(B,vb);
  F.bp=batPos(BN);F.tv=c01(BN-9);F.hv=c01(BN-99);
  F.chg=eio(seg(u,TL.PLUG,TL.PLUG+.18))*(1-eio(seg(u,UNPLUG,UNPLUG+.18)));
  if(u>=TL.RESET)F.chg=0;
  F.low=c01((21-B)/3)*(1-F.chg);
  F.bolt=spring(u-TL.PLUG,10,17)*(1-eio(seg(u,UNPLUG,UNPLUG+.14)));
  if(u>=TL.RESET)F.bolt=0;
  // блик на переднем крае: живёт, пока шкала растёт, гаснет когда встала
  F.hl=u<TL.N1?c01(vb/40)*.7+.55*bump(u-TL.MID,.5):0;
  F.wpop=.07*bump(u-TL.PLUG,.24)+.11*bump(u-TL.MID-.1,.34);
  F.cpop=.025*bump(u-TL.MID,.3);
  // уведомления: новое встаёт первым под виджетом, старые уезжают вниз
  F.ne=[];F.na=[];
  for(k=0;k<5;k++){F.ne.push(u<TL.RESET?spring(u-TL.NT[k],11,16):0);F.na.push(u<TL.RESET?c01((u-TL.NT[k])/.07):0)}
  // камера: в понедельник отъезжает вниз, к уведомлениям; на чёрном экране возвращается
  F.cam=eio(seg(u,TL.MON0+.28,TL.N1-.02))*(1-eio(seg(u,TL.OFF+.16,TL.WAKE-.04)));
  F.jy=-6*jolt(u-TL.PLUG,13,44);
  F.jx=0;for(k=0;k<5;k++)F.jx+=(k%2?1:-1)*2.6*jolt(u-TL.NT[k]-.11,20,70);
  F.off=eio(seg(u,TL.OFF,TL.OFF+.14))*(1-eio(seg(u,TL.WAKE,TL.WAKE+.22)));
  return F;
}

/* ─────────── DOM ─────────── */
var zoom=document.getElementById('zoom'),phone=document.getElementById('phone'),screen=document.getElementById('screen');
var dateEl=document.getElementById('date'),clockEl=document.getElementById('clock'),numEl=document.getElementById('num');
var wgt=document.getElementById('wgt'),ring=document.getElementById('ring'),ringHl=document.getElementById('ringHl'),bolt=document.getElementById('bolt');
var batIn=document.getElementById('batIn'),boltS=document.getElementById('boltS'),notesEl=document.getElementById('notes'),offEl=document.getElementById('off');
var defs=document.getElementById('defs');
var RC=2*Math.PI*31.5;

var DRUMS=[];
function Drum(parent,cls,items,lh,off){
  var w=h('span',cls),s=h('span','strip');
  items.forEach(function(x){s.appendChild(h('b',null,x))});
  w.appendChild(s);parent.appendChild(w);
  var id='vb'+DRUMS.length,f=document.createElementNS('http://www.w3.org/2000/svg','filter');
  f.setAttribute('id',id);f.setAttribute('x','-10%');f.setAttribute('y','-50%');f.setAttribute('width','120%');f.setAttribute('height','200%');
  var g=document.createElementNS('http://www.w3.org/2000/svg','feGaussianBlur');g.setAttribute('stdDeviation','0 0');f.appendChild(g);defs.appendChild(f);
  var d={w:w,s:s,n:items.length-1,lh:lh,g:g,id:id,off:off||0};
  DRUMS.push(d);return d;
}
// pos в строках, vel строк в секунду: на скорости барабан размывается по вертикали
function drumSet(d,pos,vel){
  var p=((pos%d.n)+d.n)%d.n;
  set(d.s,'transform','translate3d(0,'+px(-p*d.lh-d.off)+',0)');
  var over=d.still?0:Math.abs(vel)-12,b=clamp(over*.0024,0,.1)*d.lh;
  b=Math.round(b*4)/4;
  if(b<=0)set(d.s,'filter','none');
  else{setAt(d.g,'stdDeviation','0 '+b);set(d.s,'filter','url(#'+d.id+')')}
  set(d.s,'opacity',(1-.15*c01(over/40)).toFixed(3));
}
function wrapD(a,n){var d=a%n;if(d>n/2)d-=n;if(d<-n/2)d+=n;return d}

var DATES=['Friday, October 2','Saturday, October 3','Sunday, October 4','Monday, October 5'];
var dDate,dClk=[],colonEl,dNum=[],hundEl;
var NOTE=[
  {ic:'mail',h:72,t:118,b:[236]},
  {ic:'cal',h:88,t:92,b:[250,148]},
  {ic:'msg',h:72,t:74,b:[204]},
  {ic:'mail',h:72,t:134,b:[262]},
  {ic:'rem',h:88,t:108,b:[226,96]}
];
var NOTES=[],NTOP=314,NGAP=8;
var ICONS={
  mail:'<rect width="38" height="38" fill="#1a84ff"/><rect x="8.5" y="11.5" width="21" height="15" rx="2.6" fill="none" stroke="#fff" stroke-width="1.9"/><path d="M9.5 13l9.5 7.2 9.5-7.2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/>',
  cal:'<rect width="38" height="38" fill="#fff"/><rect x="12" y="6.5" width="14" height="3.4" rx="1.7" fill="#ff3b30"/><text x="19" y="31" text-anchor="middle" font-size="19" font-weight="300" fill="#1b1a18" font-family="-apple-system,BlinkMacSystemFont,sans-serif">5</text>',
  msg:'<rect width="38" height="38" fill="#34c759"/><path d="M19 9.5c-6.4 0-11.3 4-11.3 9.1 0 2.9 1.6 5.4 4.1 7.1-.3 1.6-1.1 3-2.4 4.1 2.4-.1 4.5-.9 6-2.2 1.1.3 2.3.4 3.6.4 6.4 0 11.3-4 11.3-9.4 0-5.1-4.9-9.1-11.3-9.1z" fill="#fff"/>',
  rem:'<rect width="38" height="38" fill="#fff"/><circle cx="11" cy="12" r="2.6" fill="#1a84ff"/><circle cx="11" cy="19" r="2.6" fill="#ff3b30"/><circle cx="11" cy="26" r="2.6" fill="#ff9f0a"/><rect x="16" y="11" width="13" height="2" rx="1" fill="#c9c6c0"/><rect x="16" y="18" width="11" height="2" rx="1" fill="#c9c6c0"/><rect x="16" y="25" width="14" height="2" rx="1" fill="#c9c6c0"/>'
};

(function build(){
  dDate=Drum(dateEl,'dd',DATES.concat([DATES[0]]),28);
  dDate.w.style.cssText='position:absolute;left:0;top:0;width:402px;height:28px;overflow:hidden';
  dDate.still=true;   // дату не размываем, по ней читается день
  var dig=['0','1','2','3','4','5','6','7','8','9'];
  var H2=[];for(var i=0;i<=24;i++)H2.push(String((i%24)%10));
  // окно барабана плотно по высоте цифры, шаг строки больше окна
  dClk.push(Drum(clockEl,'dg',['0','1','2','0'],104,11));
  dClk.push(Drum(clockEl,'dg',H2,104,11));
  colonEl=h('span','colon',':');clockEl.appendChild(colonEl);
  dClk.push(Drum(clockEl,'dg',['0','1','2','3','4','5','0'],104,11));
  dClk.push(Drum(clockEl,'dg',dig.concat(['0']),104,11));
  hundEl=h('span','nd');hundEl.appendChild(h('b',null,'1'));numEl.appendChild(hundEl);
  dNum.push(Drum(numEl,'nd',dig.concat(['0']),28));
  dNum.push(Drum(numEl,'nd',dig.concat(['0']),28));
  NOTE.forEach(function(n){
    var c=h('div','nt');c.style.height=n.h+'px';
    var ic=h('span','ic');ic.innerHTML='<svg viewBox="0 0 38 38">'+ICONS[n.ic]+'</svg>';
    ic.style.top=((n.h-38)/2)+'px';
    var tt=h('span','tt');tt.style.width=n.t+'px';
    c.appendChild(ic);c.appendChild(tt);
    n.b.forEach(function(w,k){var b=h('span','bd'+(k?' bd2':''));b.style.width=w+'px';c.appendChild(b)});
    c.appendChild(h('span','tm','now'));
    notesEl.appendChild(c);NOTES.push({el:c,h:n.h});
  });
})();

var DW=60,CW=30,NW=14;
function measure(){
  var b=dClk[3].s.firstChild;b.style.display='inline-block';DW=b.getBoundingClientRect().width/(SC||1);b.style.display='';
  colonEl.style.display='inline-block';colonEl.style.position='static';CW=colonEl.getBoundingClientRect().width/(SC||1);colonEl.style.display='';colonEl.style.position='';
  var n=dNum[1].s.firstChild;n.style.display='inline-block';NW=n.getBoundingClientRect().width/(SC||1);n.style.display='';
  DW=Math.round(DW*10)/10;CW=Math.round(CW*10)/10;NW=Math.round(NW*10)/10;
  // раскладка часов: цифры моноширинные, двоеточие уже, всё по центру
  var tight=-3,tot=4*DW+CW+4*tight,x=(402-tot)/2;
  [0,1].forEach(function(i){set(dClk[i].w,'left',px(x));set(dClk[i].w,'width',px(DW));x+=DW+tight});
  set(colonEl,'left',px(x));set(colonEl,'width',px(CW));x+=CW+tight;
  [2,3].forEach(function(i){set(dClk[i].w,'left',px(x));set(dClk[i].w,'width',px(DW));x+=DW+tight});
  [hundEl,dNum[0].w,dNum[1].w].forEach(function(e){set(e,'width',px(NW))});
}

/* ─────────── палитра: оформление меняется с днём и ночью ─────────── */
var PAL={
  light:{
    day:{wall:[236,232,224,1],ink:[24,23,21,1],sub:[24,23,21,.5],disk:[0,0,0,.07],track:[0,0,0,.11],cardb:[255,255,255,.66],bar1:[24,23,21,.78],bar2:[24,23,21,.24],qa:[0,0,0,.14],grn:[52,199,89,1],red:[255,59,48,1]},
    night:{wall:[17,18,20,1],ink:[244,241,235,1],sub:[244,241,235,.5],disk:[255,255,255,.1],track:[255,255,255,.15],cardb:[255,255,255,.11],bar1:[244,241,235,.8],bar2:[244,241,235,.28],qa:[255,255,255,.14],grn:[48,209,88,1],red:[255,69,58,1]}
  },
  dark:{
    day:{wall:[30,30,32,1],ink:[244,241,235,1],sub:[244,241,235,.5],disk:[255,255,255,.1],track:[255,255,255,.15],cardb:[255,255,255,.12],bar1:[244,241,235,.8],bar2:[244,241,235,.28],qa:[255,255,255,.14],grn:[48,209,88,1],red:[255,69,58,1]},
    night:{wall:[11,11,12,1],ink:[222,218,212,1],sub:[222,218,212,.5],disk:[255,255,255,.08],track:[255,255,255,.12],cardb:[255,255,255,.09],bar1:[222,218,212,.8],bar2:[222,218,212,.28],qa:[255,255,255,.12],grn:[44,190,80,1],red:[240,64,55,1]}
  }
};
var THEME='light';
function mixc(a,b,t){return [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t),mix(a[3],b[3],t)]}
function css(c){return 'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+c[3].toFixed(3)+')'}
function pal(n){var P=PAL[THEME],o={};for(var k in P.day)o[k]=mixc(P.day[k],P.night[k],n);return o}

/* ─────────── камера и подгонка ─────────── */
var VW=1080,VH=1350,SC=1,SF=1;
function fit(){VW=innerWidth;VH=innerHeight;SF=clamp(Math.min((VH-96)/896,(VW-32)/424),.3,1.1)}

/* ─────────── отрисовка ─────────── */
function render(F,V){
  var P=pal(F.N),k;
  // камера
  var S,tx,ty;
  if(REC||STILL){
    var S0=VW*.985/424;S=S0*mix(1,CAMM.z,F.cam);
    var cy=mix(CAMW.y,CAMM.y,F.cam);tx=VW/2-212*S;ty=VH/2-cy*S;
  }else{S=SF;tx=(VW-424*S)/2;ty=(VH-60-896*S)/2}
  SC=S;
  tx+=F.jx*S;ty+=F.jy*S;
  set(zoom,'transform','translate('+px(tx)+','+px(ty)+') scale('+S.toFixed(4)+')');

  ['wall','ink','sub','disk','track','cardb','bar1','bar2','qa'].forEach(function(k){setVar(screen,'--'+k,css(P[k]))});

  // дата и часы
  drumSet(dDate,F.dp,V.date);
  for(k=0;k<4;k++)drumSet(dClk[k],F.cp[k],V.clk[k]);
  set(clockEl,'transform','scale('+(1+F.cpop).toFixed(4)+')');

  // виджет: кольцо, молния, число
  var col=mixc(mixc(P.ink,P.grn,F.chg),P.red,F.low);
  set(ring,'color',css(col));set(bolt,'color',css(mixc(P.ink,P.grn,F.chg)));
  var len=Math.max(.01,RC*c01(F.B/100));
  setAt(ring,'stroke-dasharray',len.toFixed(2)+' '+(RC+10).toFixed(2));
  var hlL=Math.min(16,len);
  setAt(ringHl,'stroke-dasharray',hlL.toFixed(2)+' '+(RC+10).toFixed(2));
  setAt(ringHl,'stroke-dashoffset',(-(len-hlL)).toFixed(2));
  set(ringHl,'opacity',(F.hl*(F.N>.5?.55:.8)).toFixed(3));
  set(bolt,'transform','scale('+Math.max(0,F.bolt).toFixed(3)+')');
  set(bolt,'opacity',c01(F.bolt*3).toFixed(3));
  set(wgt,'transform','scale('+(1+F.wpop).toFixed(4)+')');
  // число по центру: десятки и сотни появляются и уходят вместе с шириной
  var tot=NW*(1+F.tv+F.hv),x0=38+tot/2;
  set(dNum[1].w,'left',px(x0-NW));
  set(dNum[0].w,'left',px(x0-2*NW));set(dNum[0].w,'opacity',F.tv.toFixed(3));
  set(hundEl,'left',px(x0-3*NW));set(hundEl,'opacity',F.hv.toFixed(3));
  set(hundEl,'transform','translateY('+px((1-F.hv)*10)+')');
  drumSet(dNum[0],F.bp[0],V.num[0]);drumSet(dNum[1],F.bp[1],V.num[1]);

  // батарея в строке состояния
  set(batIn,'width',px(Math.max(1.5,22*c01(F.B/100))));
  set(batIn,'background',css(F.chg>.5?P.grn:F.low>.5?P.red:P.ink));
  set(boltS,'opacity',c01(F.bolt).toFixed(3));
  set(boltS,'transform','scale('+mix(.4,1,c01(F.bolt)).toFixed(3)+')');

  // уведомления
  for(k=0;k<5;k++){
    var N=NOTES[k],dn=0;
    for(var j=k+1;j<5;j++)dn+=(NOTES[j].h+NGAP)*F.ne[j];
    var y=NTOP+dn-(1-F.ne[k])*26;
    set(N.el,'transform','translateY('+px(y)+') scale('+mix(.9,1,F.ne[k]).toFixed(4)+')');
    set(N.el,'opacity',F.na[k].toFixed(3));
  }
  set(offEl,'opacity',F.off.toFixed(3));
}

/* скорости барабанов: тот же сюжет на долю секунды раньше */
var EPS=1/240;
function speeds(F,F1,rate){
  var V={clk:[],num:[],date:0},n=[3,24,6,10];
  for(var k=0;k<4;k++)V.clk[k]=wrapD(F.cp[k]-F1.cp[k],n[k])/EPS*rate;
  V.num[0]=(F.bp[0]-F1.bp[0])/EPS*rate;V.num[1]=wrapD(F.bp[1]-F1.bp[1],10)/EPS*rate;
  V.date=(F.dp-F1.dp)/EPS*rate;
  return V;
}
function frame(u,rate){
  var F=scene(u),F1=scene(Math.max(0,u-EPS));
  render(F,speeds(F,F1,rate==null?1:rate));
  return F;
}

/* ─────────── звук: события петли ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  var u,k,prevM=Math.floor(ST0*60);
  EVENTS.push([TL.PLUG,'plug']);
  // минуты щёлкают, пока их можно различить, дальше гул перемотки
  for(u=TL.RUN0;u<TL.RUN1;u+=1/1000){
    var M=Math.floor(story(u)*60+1e-6),v=deriv(story,u)*60;
    if(M!==prevM){if(v<9)EVENTS.push([u,'tick',c01(v/9)*.4]);prevM=M}
  }
  var cv=[];for(k=0;k<=120;k++)cv.push(deriv(story,TL.RUN0+TL.RUN*k/120));
  var mx=Math.max.apply(null,cv);
  EVENTS.push([TL.RUN0,'whirr',cv.map(function(x){return x/mx}),TL.RUN]);
  MIDS.slice(0,2).forEach(function(m,i){EVENTS.push([m,'flap',i])});
  EVENTS.push([TL.TK[0],'tick',1]);EVENTS.push([TL.TK[0]+.05,'blip',0]);
  EVENTS.push([TL.TK[1],'tick',1]);EVENTS.push([TL.TK[1]+.05,'blip',1]);
  EVENTS.push([TL.MID,'clack']);EVENTS.push([TL.MID+.08,'charged']);
  EVENTS.push([MIDS[2]||TL.MID+.2,'flap',2]);
  EVENTS.push([TL.MON0,'ff']);
  EVENTS.push([UNPLUG,'unplug']);
  TL.NT.forEach(function(t,k){EVENTS.push([t+.02,'ping',k]);EVENTS.push([t+.08,'drop',k])});
  EVENTS.push([TL.OFF,'lock']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1,noLoop){
  if(u1<u0){if(noLoop)return;fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1){if(noLoop&&ev[1]==='whirr')return;Sound.play(ev)}});
}

/* ─────────── живой режим: телефон тащат, и время прокручивается ─────────── */
var mode='auto',acc=0,prev=null,lastU=0,paused=false,drag=null,rate=1;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
phone.addEventListener('pointerdown',function(e){
  if(REC||e.button>0)return;
  Sound.start();Sound.cut();
  phone.setPointerCapture(e.pointerId);phone.classList.add('grab');
  drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,a0:acc,last:acc,t:performance.now()};
  mode='scrub';
});
phone.addEventListener('pointermove',function(e){
  if(!drag||drag.id!==e.pointerId)return;
  // вверх и вправо это вперёд по времени: 700 точек протяжки на всю петлю
  var d=((e.clientX-drag.x0)-(e.clientY-drag.y0))/SC;
  acc=drag.a0+d*CYCLE/700;
});
function endDrag(e){
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;phone.classList.remove('grab');mode='auto';lastU=uNow();
}
phone.addEventListener('pointerup',endDrag);phone.addEventListener('pointercancel',endDrag);
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '){e.preventDefault();paused=!paused;Sound.cut()}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){Sound.cut();acc+=e.key==='ArrowRight'?.25:-.25;lastU=uNow()}
});

/* ─────────── часы ─────────── */
var lastAcc=0;
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  var u;
  if(REC){
    u=((now/1000+PH)%CYCLE+CYCLE)%CYCLE;frame(u,1);
    if(now/1000>=CYCLE-1e-6)window.__done=true;
  }else if(mode==='scrub'){
    u=uNow();
    var r=dt>0?(acc-lastAcc)/dt:0;rate=mix(rate,r,.35);
    frame(u,rate);
    if(acc>lastAcc)fireBetween(lastU,u,true);
    lastU=u;
  }else{
    if(!paused&&!reduce)acc+=dt;
    u=reduce?TL.MID+.5:uNow();
    frame(u,paused?0:1);
    if(!paused&&!reduce)fireBetween(lastU,u);
    lastU=u;rate=1;
  }
  lastAcc=acc;
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();Sound.cut();paused=false;mode='auto';acc=0;lastU=0;lastAcc=0};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});
if(matchMedia('(pointer: coarse)').matches)document.getElementById('hint').textContent='Drag the phone to scrub the weekend';

/* тема: светлая это «Автоматически», день и ночь; тёмная держит тёмное оформление и ночью гасит экран */
var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  THEME=th;document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

// для проверки кадров: __seek(секунды петли); для записи: __renderAudio
window.__seek=function(t){mode='auto';paused=true;acc=t;frame(uNow(),0)};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60)};
window.__TL=TL;

(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  fit();measure();buildTransitions();buildEvents();
  TL.MIDS=MIDS;TL.UNPLUG=UNPLUG;TL.TRN=TRN;
  addEventListener('resize',function(){fit()});
  requestAnimationFrame(tick);
});
