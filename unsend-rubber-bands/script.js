/* ─────────── Unsend ───────────
   2:13 ночи, «i miss us». Отправленное сообщение не улетает сразу: его держат пять синих
   резинок, вытянутых из кнопки отправки, как жвачка. Это и есть окно Undo Send: каждые
   0.6 с одна резинка лопается струной, и сообщение подпрыгивает ближе к своему месту.
   Палец сомневается, тянется к Undo и попадает в пустоту на долю секунды позже последней.
   Сообщение шлёпается на место, сразу Read, в ответ «who is this?». Следующая ночь: лента
   уезжает вверх, и видно, что вчера было то же самое.
   Автопоказ рисуется из одного времени t: тарзанка считается один раз заранее и проигрывается
   по t. В живом режиме можно успеть: тап, пока резинки целы, и они утаскивают сообщение назад. */

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
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

var MSG='i miss us',REPLY='who is this?',READ_AT='2:14 AM';

/* ─────────── геометрия в точках экрана 402 × 874 ───────────
   Лента прижата к верху, как в новом диалоге: место сообщения высоко, до поля ввода
   больше 400 точек, резинкам есть где тянуться. Блок одной ночи: метка дня, вопрос,
   Read (только у последнего), ответ. */
var MEX=382,RX=20,BH=40,Y0=330,GAPB=18,HB=114,LABH=22,QOFF=28,RGAP=6;
var SLOT_Y=Y0+QOFF,FIELD_Y=788,FIELD_X=65;
var A={x:366,y:808};                       // кнопка отправки, из неё тянутся резинки
var EQ=[488,535,578,616,650];              // где висит сообщение при 1…5 целых резинках
var ORDER=[0,4,1,3,2];                     // какая лопается по счёту: края первыми, середина последней
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z';
var DAYS={cur:['Today','2:13 AM'],prev:['Today','2:13 AM','Yesterday','2:14 AM'],prev2:['Yesterday','2:14 AM','Saturday','2:11 AM']};

var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),thread=document.getElementById('thread');
var strandsG=document.getElementById('strands'),knobG=document.getElementById('knobG');
var undoEl=document.getElementById('undo'),undoN=document.getElementById('undoN'),ringFg=document.getElementById('ringfg'),touchEl=document.getElementById('touch');
var typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),ph=document.getElementById('ph'),mic=document.getElementById('mic'),sendBtn=document.getElementById('send');
knobG.style.transformOrigin='366px 808px';
var RING=2*Math.PI*9;ringFg.style.strokeDasharray=RING.toFixed(2);

function tailSvg(me){return '<svg class="tail" viewBox="0 0 20 20" aria-hidden="true"><path d="'+TAILP+'"'+(me?' transform="matrix(-1 0 0 1 20 0)"':'')+'/></svg>'}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function msgEl(me,text){var e=h('div','msg '+(me?'me':'them'));e.innerHTML='<span class="t">'+esc(text)+'</span>'+tailSvg(me);thread.appendChild(e);return e}
function stampHTML(d){return '<b>'+d[0]+'</b> '+d[1]}

/* три роли блоков: позавчера, вчера, сегодня. Содержимое у всех одно и то же, поэтому
   роль определяется временем петли, а не историей, и петля замыкается без шва */
var BLK={};
['prev2','prev','cur'].forEach(function(k){
  var d=DAYS[k],st=h('div','stamp');
  st.innerHTML='<span class="s0">'+stampHTML(d)+'</span><span class="s1">'+(d[2]?stampHTML(d.slice(2)):'')+'</span>';
  thread.appendChild(st);
  var B={st:st,s0:st.children[0],s1:st.children[1],q:msgEl(1,MSG),lb:h('div','lbl'),r:msgEl(0,REPLY)};
  B.lb.innerHTML='<b>Read</b> '+READ_AT;thread.appendChild(B.lb);
  BLK[k]=B;
});
var CUR=BLK.cur;CUR.q.classList.add('q-fly');CUR.r.style.transformOrigin='0 100%';
var TI=h('div','ti');TI.innerHTML='<span class="c2"></span><span class="c1"></span><span class="pill"></span><span class="d"></span><span class="d"></span><span class="d"></span>';
thread.appendChild(TI);
var TID=[].slice.call(TI.querySelectorAll('.d'));TID.forEach(function(d,i){d.style.left=(13+i*15)+'px'});

var QW=0,LW={};
function measure(){
  QW=CUR.q.offsetWidth;
  CUR.lb.innerHTML='Delivered';LW.d=CUR.lb.offsetWidth;CUR.lb.innerHTML='<b>Read</b> '+READ_AT;LW.r=CUR.lb.offsetWidth;CUR.lb.__t=null;
}

/* ─────────── раунд ───────────
   Одна ночь: (прокрутка) набор, отправка, пять щелчков, посадка, ответ. Все времена
   раунда известны заранее, кроме посадки: её находит симуляция тарзанки. */
function makeRound(t0,o){
  var R={auto:!!o.auto,typed:!!o.typed,keys:[],sim:null,tUndo:null,tBack:null,tLand:null,landV:0,tap:!!o.tap};
  if(o.scroll){R.tScr0=t0+.05;R.tScr1=t0+.5}
  if(o.typed){var k=t0+.36;for(var i=0;i<MSG.length;i++){R.keys.push(k);k+=.05+((i*7)%4)*.008+(MSG[i]===' '?.03:0)}R.tSend=k+.14}
  else R.tSend=t0+(o.delay||0);
  R.snaps=[];for(var j=0;j<5;j++)R.snaps.push(R.tSend+.95+j*.6);
  return R;
}
function derive(R){
  if(R.tLand==null||R.tDel!=null)return;
  R.tDel=R.tLand+.2;R.tRead=R.tLand+.38;R.tTI=R.tLand+.75;R.tReply=R.tTI+.78;
}
function aliveAt(R,t){
  var n=5;for(var j=0;j<5;j++)if(R.snaps[j]<=t&&(R.tUndo==null||R.snaps[j]<R.tUndo))n--;
  return n;
}
function tiltAt(R,t){
  var s=0;for(var j=0;j<5;j++)if(!(R.snaps[j]<=t&&(R.tUndo==null||R.snaps[j]<R.tUndo)))s+=ORDER[j]-2;
  return s;
}

/* тарзанка: сообщение тянет к своему месту, резинки тянут к кнопке. Каждая лопнувшая
   резинка поднимает точку равновесия, и оно подпрыгивает. Без резинок летит к месту
   и шлёпается об него. После Undo уцелевшие резинки утаскивают его в поле. */
var DT=1/600;
function simTo(R,tEnd){
  var S=R.sim;
  if(!S)S=R.sim={y:[FIELD_Y],v:[-2500],th:[0],w:[0]};
  var n=S.y.length-1,y=S.y[n],v=S.v[n],th=S.th[n],w=S.w[n];
  while(R.tSend+n*DT<tEnd){
    var t=R.tSend+n*DT,al=aliveAt(R,t),und=R.tUndo!=null&&t>=R.tUndo,eq,om,ze;
    if(und){eq=FIELD_Y+40;om=2*Math.PI*1.15;ze=.05}
    else if(al>0){eq=EQ[al-1];om=2*Math.PI*1.9;ze=.2}
    else{eq=SLOT_Y-60;om=2*Math.PI*1.6;ze=0}
    if(R.tLand!=null){y=SLOT_Y;v=0}
    else if(R.tBack!=null){y=FIELD_Y;v=0}
    else{
      v+=(-om*om*(y-eq)-2*ze*om*v)*DT;y+=v*DT;
      if(!und&&al===0&&y<=SLOT_Y){R.landV=v;R.tLand=t;y=SLOT_Y;v=0}
      if(und&&y>=FIELD_Y){R.tBack=t;y=FIELD_Y;v=0}
    }
    // наклон: уцелевшие резинки тянут неравномерно
    var teq=(!und&&al>0&&R.tLand==null)?.02*tiltAt(R,t):0,ow=2*Math.PI*2.2;
    w+=(-ow*ow*(th-teq)-2*.28*ow*w)*DT;th+=w*DT;
    n++;S.y.push(y);S.v.push(v);S.th.push(th);S.w.push(w);
  }
  derive(R);
}
function stAt(R,t){
  var S=R.sim,m=clamp((t-R.tSend)/DT,0,S.y.length-1),i=Math.min(Math.floor(m),Math.max(0,S.y.length-2)),f=m-i,j=Math.min(i+1,S.y.length-1);
  return {y:mix(S.y[i],S.y[j],f),v:mix(S.v[i],S.v[j],f),th:mix(S.th[i],S.th[j],f)};
}

/* пузырь: положение, растяжение от скорости и натяжения, шлепок при посадке */
function bubbleAt(R,t){
  if(t<R.tSend||(R.tBack!=null&&t>=R.tBack))return null;
  var s=stAt(R,t),al=aliveAt(R,t),und=R.tUndo!=null&&t>=R.tUndo;
  var x=mix(FIELD_X,MEX-QW,eout(seg(t,R.tSend,R.tSend+.3))),a=sm(seg(t,R.tSend,R.tSend+.1));
  if(und){x=mix(x,FIELD_X,sm(seg(t,R.tUndo,R.tUndo+.2)));a*=1-sm(seg(s.y,FIELD_Y-70,FIELD_Y))}
  var hang=R.tLand==null&&!und&&al>0;
  var sy=1+.15*c01(Math.abs(s.v)/2600)+(hang?.012*al:0),sx=1/Math.sqrt(sy);
  if(R.tLand!=null&&t>=R.tLand){
    var d=t-R.tLand,q=.24*c01(Math.abs(R.landV)/1800)*Math.exp(-d*12)*Math.cos(d*36);
    sy=1-q;sx=1+.6*q;
  }
  return {x:x,y:s.y,v:s.v,th:s.th,sx:sx,sy:sy,a:a};
}
function attach(B,i){
  var lx=(14+i*(QW-28)/4-QW/2)*B.sx,ly=(BH-7)*B.sy,c=Math.cos(B.th),s=Math.sin(B.th);
  return {x:B.x+QW/2+lx*c-ly*s,y:B.y+lx*s+ly*c};
}
function anchor(i){return {x:A.x+(i-2)*2.6,y:A.y-4}}
function vibAt(R,t,i){
  var v=0,sg=i%2?1:-1;
  function add(t0,amp){var d=t-t0;if(d>0&&d<1.4)v+=amp*Math.exp(-d*5.5)*Math.sin(2*Math.PI*7.2*d+i*1.1)}
  add(R.tSend+.05,10);
  for(var j=0;j<5;j++){if(R.tUndo!=null&&R.snaps[j]>=R.tUndo)break;add(R.snaps[j],15)}
  if(R.tUndo!=null)add(R.tUndo,12);
  return v*sg;
}
function lastSnap(R){return R.snaps[4]}

/* ─────────── кадр из раунда ─────────── */
function frame(R,t){
  var F={};
  F.s=R.tScr0!=null?eio(seg(t,R.tScr0,R.tScr1)):1;
  F.stamp=R.typed?sm(seg(t,R.keys[0]-.12,R.keys[0]+.16)):1;
  // поле ввода
  var n=0;
  if(R.typed){for(var i=0;i<R.keys.length;i++)if(t>=R.keys[i])n=i+1}else n=MSG.length;
  if(t>=R.tSend)n=0;
  if(R.tBack!=null&&t>=R.tBack)n=MSG.length;
  F.n=n;
  F.caret=R.typed&&t>=R.keys[0]-.3&&t<R.tSend?1:0;
  F.sendOp=n>0?1:0;
  F.press=sm(seg(t,R.tSend-.05,R.tSend))*(1-sm(seg(t,R.tSend+.02,R.tSend+.1)));
  // пузырь и резинки
  F.B=bubbleAt(R,t);
  var und=R.tUndo!=null&&t>=R.tUndo;
  F.alive=t>=R.tSend?aliveAt(R,t):0;
  if(t<R.tSend)F.knob=0;
  else if(und)F.knob=R.tBack!=null&&t>=R.tBack?0:1;
  else F.knob=1-sm(seg(t,lastSnap(R),lastSnap(R)+.2));
  F.knobS=1-.12*F.press-.1*sm(seg(t,lastSnap(R),lastSnap(R)+.2))*(und?0:1);
  // плашка Undo
  var pin=sm(seg(t,R.tSend+.25,R.tSend+.45)),pout=und?sm(seg(t,R.tUndo,R.tUndo+.12)):sm(seg(t,lastSnap(R),lastSnap(R)+.1));
  F.pill=pin*(1-pout);F.pillS=.94+.06*pin-.06*pout;
  F.ring=c01((lastSnap(R)-t)/(lastSnap(R)-R.tSend-.35));
  var lastJ=-1;for(var j=0;j<5;j++)if(R.snaps[j]<=t)lastJ=j;
  F.nPulse=lastJ>=0?Math.exp(-(t-R.snaps[lastJ])*9):0;
  // метка доставки, точки, ответ
  F.lb0=R.tDel!=null?eout(seg(t,R.tDel,R.tDel+.2)):0;
  F.lbRead=R.tRead!=null?sm(seg(t,R.tRead-.05,R.tRead+.07)):0;
  F.ti=R.tTI!=null&&t>=R.tTI&&t<R.tReply+.1?{pin:spring(t-R.tTI,.5,3.4)*(1-sm(seg(t,R.tReply-.02,R.tReply+.08))),ph:t-R.tTI}:null;
  F.reply=R.tReply!=null&&t>=R.tReply?spring(t-R.tReply,.55,3.2):0;
  // палец
  F.fg=fingerAt(R,t);
  F.R=R;F.t=t;
  return F;
}
function fingerAt(R,t){
  var T=R.tSend,fg={x:A.x+3,y:A.y+5,a:0,p:0};
  if(R.auto||R.tap){
    var a1=sm(seg(t,T-.28,T-.16))*(1-sm(seg(t,T+.06,T+.22)));
    if(a1>0){fg.a=a1;fg.p=sm(seg(t,T-.07,T-.01))*(1-sm(seg(t,T+.03,T+.1)));return fg}
  }
  if(!R.auto||R.tUndo!=null)return fg;
  // сомневается, тянется к Undo и опаздывает
  var L=lastSnap(R),K=[[L-1.3,318,688],[L-.95,266,704],[L-.63,283,697],[L-.33,240,712],[L+.12,203,742]];
  var a=sm(seg(t,L-1.36,L-1.16))*(1-sm(seg(t,L+.36,L+.54)));
  if(a<=0)return fg;
  var x=K[0][1],y=K[0][2];
  for(var i=0;i<K.length-1;i++){if(t>=K[i][0]){var e=eio(seg(t,K[i][0],K[i+1][0]));x=mix(K[i][1],K[i+1][1],e);y=mix(K[i][2],K[i+1][2],e)}}
  var hes=1-sm(seg(t,L-.02,L+.1));
  x+=Math.sin(t*8.3)*1.6*hes;y+=Math.sin(t*6.1+1)*1.2*hes;
  return {x:x,y:y,a:a,p:sm(seg(t,L+.11,L+.17))*(1-sm(seg(t,L+.27,L+.35)))};
}

/* ─────────── отрисовка ─────────── */
var BLUE=[10,124,255],INK=[13,13,14];
function rgb(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+(a==null?1:a).toFixed(3)+')'}
function mixc(a,b,t){return [Math.round(mix(a[0],b[0],t)),Math.round(mix(a[1],b[1],t)),Math.round(mix(a[2],b[2],t))]}

function placeBlock(B,top,lab,mixDay,op){
  var vis=op>.002&&top>-200?'visible':'hidden';
  [B.st,B.q,B.lb,B.r].forEach(function(e){set(e,'visibility',vis);set(e,'opacity',op<1?op.toFixed(3):'')});
  if(vis==='hidden')return;
  set(B.st,'transform','translate(0,'+f2(top)+'px)');
  set(B.s0,'opacity',(1-sm(seg(mixDay,.12,.45))).toFixed(3));set(B.s1,'opacity',sm(seg(mixDay,.55,.88)).toFixed(3));
  set(B.q,'transform','translate('+f2(MEX-QW)+'px,'+f2(top+QOFF)+'px)');
  set(B.lb,'transform','translate('+f2(MEX-LW.r)+'px,'+f2(top+QOFF+BH+3)+'px)');
  set(B.lb,'opacity',(lab*op).toFixed(3));
  set(B.r,'transform','translate('+RX+'px,'+f2(top+QOFF+BH+LABH*lab+RGAP)+'px)');
}

var POOL=[];
function strand(k){
  while(POOL.length<=k){var p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('class','s');strandsG.appendChild(p);POOL.push(p)}
  return POOL[k];
}
function P(x,y){return x.toFixed(1)+','+y.toFixed(1)}

function render(F){
  var R=F.R,t=F.t,s=F.s;
  // вчерашние ночи
  var prevTop=Y0-s*(HB+GAPB);
  placeBlock(BLK.prev,prevTop,1-s,s,1);
  placeBlock(BLK.prev2,prevTop-GAPB-HB,0,s,1-sm(s));

  // сегодня: метка дня
  set(CUR.st,'transform','translate(0,'+Y0+'px)');set(CUR.st,'opacity',F.stamp.toFixed(3));
  // сообщение
  var B=F.B,q=CUR.q;
  if(B){
    set(q,'visibility','visible');
    set(q,'transform','translate('+f2(B.x)+'px,'+f2(B.y)+'px) rotate('+(B.th*57.2958).toFixed(2)+'deg) scale('+B.sx.toFixed(4)+','+B.sy.toFixed(4)+')');
    set(q,'background',B.a<.999?rgb(BLUE,B.a):'');
    set(q,'color',B.a<.999?rgb(mixc(INK,[255,255,255],B.a)):'');
    set(q.querySelector('.tail'),'opacity',B.a.toFixed(3));
  }else set(q,'visibility','hidden');
  // метка доставки
  var lw=F.lbRead>.5?LW.r:LW.d,lt=F.lbRead>.5?'<b>Read</b> '+READ_AT:'Delivered';
  if(CUR.lb.__t!==lt){CUR.lb.innerHTML=lt;CUR.lb.__t=lt}
  set(CUR.lb,'opacity',(F.lb0*(1-Math.min(F.lbRead,1-F.lbRead)*2)).toFixed(3));
  set(CUR.lb,'transform','translate('+f2(MEX-lw)+'px,'+f2(Y0+QOFF+BH+3)+'px)');
  // точки и ответ
  var ry=Y0+QOFF+BH+LABH+RGAP;
  if(F.ti){
    set(TI,'visibility','visible');
    set(TI,'transform','translate('+RX+'px,'+f2(ry)+'px) scale('+Math.max(0,F.ti.pin).toFixed(3)+')');
    TID.forEach(function(d,i){var p=((F.ti.ph*1.4-i*.17)%1+1)%1,b=p<.42?Math.pow(Math.sin(Math.PI*p/.42),2):0;set(d,'opacity',(.4+.6*b).toFixed(3));set(d,'transform','translateY('+f2(-1.5*b)+'px)')});
  }else set(TI,'visibility','hidden');
  if(F.reply>0){
    set(CUR.r,'visibility','visible');
    set(CUR.r,'transform','translate('+RX+'px,'+f2(ry)+'px) scale('+(.55+.45*F.reply).toFixed(4)+')');
    set(CUR.r,'opacity',sm(F.reply*3).toFixed(3));
  }else set(CUR.r,'visibility','hidden');
  set(CUR.q,'opacity','');

  // резинки
  var k=0;
  if(B&&F.knob>0&&t>=R.tSend){
    for(var j=0;j<5;j++){
      var i=ORDER[j],ts=R.snaps[j],cut=ts<=t&&(R.tUndo==null||ts<R.tUndo);
      if(!cut){
        var a0=anchor(i),p1=attach(B,i),dx=p1.x-a0.x,dy=p1.y-a0.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,vb=vibAt(R,t,i)*.8,kk=.32*Math.abs(dy);
        var w=clamp(10*Math.sqrt(70/len),1.8,7.5);
        var el=strand(k++);
        el.setAttribute('d','M'+P(a0.x,a0.y)+'C'+P(a0.x+nx*vb,a0.y-kk+ny*vb)+' '+P(p1.x+nx*vb,p1.y+kk+ny*vb)+' '+P(p1.x,p1.y));
        el.setAttribute('stroke-width',w.toFixed(2));el.setAttribute('opacity','1');
      }else if(t-ts<.32){
        // половинки щёлкают к своим концам и закручиваются
        var tau=t-ts,Bs=bubbleAt(R,ts),a1=anchor(i),ps=attach(Bs,i),pc=attach(B,i);
        var M={x:(a1.x+ps.x)/2,y:(a1.y+ps.y)/2},l0=Math.hypot(ps.x-a1.x,ps.y-a1.y)||1,mx=-(ps.y-a1.y)/l0,my=(ps.x-a1.x)/l0;
        var pp=eout(tau/.24),wig=Math.sin(tau*75)*(1-pp)*14,w0=clamp(10*Math.sqrt(70/l0),1.8,7.5)*(1-.5*pp),op=1-sm(seg(tau,.2,.32));
        var e1={x:mix(M.x,a1.x,pp)+mx*wig,y:mix(M.y,a1.y,pp)+my*wig},e2={x:mix(M.x,pc.x,pp)-mx*wig,y:mix(M.y,pc.y,pp)-my*wig};
        var lo=strand(k++),up=strand(k++);
        lo.setAttribute('d','M'+P(a1.x,a1.y)+'Q'+P(mix(a1.x,e1.x,.5)+mx*wig*.7,mix(a1.y,e1.y,.5)+my*wig*.7)+' '+P(e1.x,e1.y));
        up.setAttribute('d','M'+P(pc.x,pc.y)+'Q'+P(mix(pc.x,e2.x,.5)-mx*wig*.7,mix(pc.y,e2.y,.5)-my*wig*.7)+' '+P(e2.x,e2.y));
        [lo,up].forEach(function(e){e.setAttribute('stroke-width',w0.toFixed(2));e.setAttribute('opacity',op.toFixed(3))});
      }
    }
  }
  for(var m=k;m<POOL.length;m++)POOL[m].setAttribute('d','');
  set(knobG,'opacity',F.knob.toFixed(3));set(knobG,'transform','scale('+F.knobS.toFixed(3)+')');

  // плашка
  set(undoEl,'opacity',F.pill.toFixed(3));set(undoEl,'transform','scale('+F.pillS.toFixed(3)+')');
  var nTxt=String(Math.max(1,F.alive));if(undoN.__t!==nTxt){undoN.textContent=nTxt;undoN.__t=nTxt}
  set(undoN,'transform','scale('+(1+.25*F.nPulse).toFixed(3)+')');
  set(ringFg,'strokeDashoffset',(RING*(1-F.ring)).toFixed(2));

  // поле ввода
  typedEl.textContent=MSG.slice(0,F.n);
  set(ph,'opacity',F.n>0?'0':'1');set(mic,'opacity',F.n>0||F.knob>0?'0':'1');
  set(caret,'opacity',F.caret?((t%1)<.55||F.n<MSG.length?'1':'0'):'0');
  set(sendBtn,'opacity',(F.n>0&&F.knob<=0?1:0).toFixed(3));
  set(sendBtn,'transform','scale('+(1-.14*F.press).toFixed(3)+')');

  // палец
  var g=F.fg;
  set(touchEl,'opacity',g.a.toFixed(3));
  set(touchEl,'transform','translate('+f2(g.x)+'px,'+f2(g.y)+'px) scale('+(1-.18*g.p).toFixed(3)+')');
}

/* ─────────── звук: события раунда [время, тип, …] ─────────── */
function eventsOf(R){
  var E=[];
  if(R.tScr0!=null)E.push([R.tScr0,'swish']);
  R.keys.forEach(function(k,i){E.push([k,'key',i])});
  E.push([R.tSend-.03,'press']);E.push([R.tSend,'send']);
  E.push([R.tSend+.4,'creak',.45,0]);
  var full=true;
  for(var j=0;j<5;j++){
    if(R.tUndo!=null&&R.snaps[j]>=R.tUndo){full=false;break}
    E.push([R.snaps[j],'snap',j,(ORDER[j]-2)*.3]);
    if(j<4)E.push([R.snaps[j]+.1,'creak',.36,j+1]);
  }
  if(full){
    E.push([R.snaps[4]+.006,'zip']);
    if(R.auto)E.push([R.snaps[4]+.14,'dead']);
  }
  if(R.tLand!=null){
    E.push([R.tLand,'land',.55+.45*c01(Math.abs(R.landV)/1800)]);
    E.push([R.tRead,'read']);E.push([R.tTI,'blip']);E.push([R.tReply,'reply']);
  }
  if(R.tUndo!=null)E.push([R.tUndo,'undo']);
  if(R.tBack!=null)E.push([R.tBack,'plop']);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var AUTO=null,EVENTS=[],CYCLE=7;
function buildAuto(){
  AUTO=makeRound(0,{scroll:true,typed:true,auto:true});
  simTo(AUTO,lastSnap(AUTO)+1.2);
  CYCLE=AUTO.tReply+.95;
  EVENTS=eventsOf(AUTO);
  window.__TL={send:AUTO.tSend,snaps:AUTO.snaps,land:AUTO.tLand,reply:AUTO.tReply,cycle:CYCLE};
}
function fireBetween(E,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(E,u0,cyc+1e-9);u0=-1e-9}
  E.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Тап, пока резинки целы: Undo, сообщение утаскивает в поле. Тап, когда текст в поле:
   отправить снова. Тап после ответа: следующая ночь. Если ничего не делать, раунд
   доигрывает сам и возвращается в автопоказ. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function cloneRound(A,base,u){
  var R={auto:A.auto,typed:A.typed,keys:A.keys.map(function(k){return k+base}),tSend:A.tSend+base,snaps:A.snaps.map(function(s){return s+base}),
    tUndo:null,tBack:null,tLand:null,landV:0,tap:false,sim:null};
  if(A.tScr0!=null){R.tScr0=A.tScr0+base;R.tScr1=A.tScr1+base}
  if(u>A.tSend){
    var m=Math.floor((u-A.tSend)/DT)+1;
    R.sim={y:A.sim.y.slice(0,m),v:A.sim.v.slice(0,m),th:A.sim.th.slice(0,m),w:A.sim.w.slice(0,m)};
    if(u>=A.tLand){R.sim=A.sim;R.tLand=A.tLand+base;R.landV=A.landV;derive(R)}
  }
  return R;
}
function goLive(){
  if(mode==='live')return;
  var n=nowS(),u=uNow();
  LV={R:cloneRound(AUTO,n-u,u),last:n,idle:n};
  mode='live';
}
function goAuto(acc0){mode='auto';LV=null;acc=acc0||0;lastU=uNow()}
function tap(){
  Sound.start();goLive();
  var n=nowS(),R=LV.R;LV.idle=n;
  simTo(R,n);
  if(n>=R.tSend+.1&&R.tUndo==null&&R.tLand==null&&aliveAt(R,n)>0){R.tUndo=n;return}
  if(R.tBack!=null&&n>=R.tBack+.12){LV.R=makeRound(n,{delay:.03});return}
  if(R.tReply!=null&&n>=R.tReply+.3){LV.R=makeRound(n,{scroll:true,typed:true})}
}
function liveStep(n){
  var R=LV.R;
  simTo(R,n);
  fireBetween(eventsOf(R),LV.last,n);LV.last=n;
  // успел отменить и ничего не делаешь: всё равно отправишь
  if(R.tBack!=null&&n>R.tBack+1.7&&n-LV.idle>1.7){LV.R=makeRound(n,{delay:.45,tap:true});LV.idle=n}
  // доиграло: обратно в автопоказ с того же места
  if(R.tReply!=null&&n>R.tReply+1.3&&n-LV.idle>1.3)goAuto(AUTO.tReply+(n-R.tReply));
}

screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();tap()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();tap()}
});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Tap before the last one snaps':'Tap or press Space before the last one snaps';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false,S=1;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(frame(AUTO,u));
    if(!REC&&!paused)fireBetween(EVENTS,lastU,u,CYCLE);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();liveStep(n);
    if(mode==='live')render(frame(LV.R,n));
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;goAuto(0)};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var cs=getComputedStyle(document.documentElement);
  BLUE=hex(cs.getPropertyValue('--blue'));INK=hex(cs.getPropertyValue('--ink'));
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?w*.72/424:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}

window.__seek=function(t){goAuto(t);paused=true;render(frame(AUTO,uNow()))};
window.__state=function(){return {mode:mode,u:uNow(),R:LV&&{undo:LV.R.tUndo,back:LV.R.tBack,land:LV.R.tLand,send:LV.R.tSend}}};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  fit();measure();buildAuto();
  addEventListener('resize',function(){fit()});
  if(QS.has('t'))window.__seek(+QS.get('t'));
  render(frame(AUTO,((PH%CYCLE)+CYCLE)%CYCLE));
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
