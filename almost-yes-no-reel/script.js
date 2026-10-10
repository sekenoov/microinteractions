/* ─────────── Almost ───────────
   Ответ ИИ держится на нескольких словах, которые модель выбрала почти наугад: «No.» набрало 51%, «Yes.» 46%.
   Такие слова подчёркнуты точками. Слово тянется вверх или вниз, как барабан: всплывают варианты с долями,
   и всё, что шло после слова, перекатывается в другой ответ. То, что было до слова, остаётся.
   Автопоказ считается из одного времени t, поэтому петля замыкается без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var REC=/\brec\b/.test(location.search);
var PH=+(new URLSearchParams(location.search).get('p')||0);   // с какой секунды петли начинать запись
var STILL=/\bstill\b/.test(location.search);    // кадр крупно, как в записи, но время ставит __seek
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function eback(p){p=c01(p);var c=1.45;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}

/* ─────────── ответы ───────────
   Первое слово и одно слово в середине: варианты с долями. У каждого варианта свой хвост,
   всё до развилки общее. По умолчанию стоит самый вероятный вариант. */
var Q='should i text my ex?';
var TREE=[
  {w:'No.',p:51,pre:'You miss how it felt, not who they were. Mute the chat for a',opts:[
    {w:'month',p:47,tail:' and see if you still want to.'},
    {w:'week',p:38,tail:' and let a friend read the draft first.'},
    {w:'year',p:9,tail:'. By then you won’t even want to.'}]},
  {w:'Yes.',p:46,pre:'It’s been long enough, and you clearly still care. Keep it short and',opts:[
    {w:'honest',p:44,tail:': “hey, I’ve been thinking about you. no pressure to reply.”'},
    {w:'casual',p:41,tail:': “hey, do you still have my grey hoodie?”'},
    {w:'funny',p:12,tail:': “saw a dog today that looked exactly like yours lol”'}]},
  {w:'Maybe.',p:3,pre:'Write it in your notes first, then',opts:[
    {w:'sleep',p:52,tail:' on it. If it still sounds right tomorrow, send it.'},
    {w:'show',p:31,tail:' it to one friend. If they wince, don’t.'},
    {w:'delete',p:14,tail:' it. Some texts are for you, not for them.'}]}
];

/* ─────────── ритм, секунды и пиксели ─────────── */
var LH=22,RH=30;                    // строка текста и строка барабана
var ROLLD=.04,IN=.32;               // перекат слова: задержка после закрытия барабана, длительность
var V=1500;                         // скорость волны по тексту, px/с: строка за строкой, слева направо

var chat=document.getElementById('chat'),thread=document.getElementById('thread'),ans=document.getElementById('ans');
var meas=document.getElementById('meas'),pick=document.getElementById('pick'),psh=document.getElementById('psh'),pclip=document.getElementById('pclip');
var cur=document.getElementById('cur');
document.getElementById('q').textContent=Q;

function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}

/* ─────────── тексты: 'a.b', где a вариант первого слова, b вариант слова в середине ─────────── */
var TX={};
function toks(a,b){
  var V=TREE[a],O=V.opts[b],out=[{s:V.w,fk:'v'}];
  V.pre.split(' ').forEach(function(s){out.push({s:s})});
  out.push({s:O.w,fk:'m'});
  var glue=O.tail[0]!==' ';
  O.tail.trim().split(' ').forEach(function(s,i){out.push({s:s,glue:glue&&!i})});
  return out;
}
TREE.forEach(function(V,a){V.opts.forEach(function(O,b){
  var id=a+'.'+b,tk=toks(a,b),layer=h('div','tx'),T={id:id,a:a,b:b,tk:tk,mi:1+V.pre.split(' ').length,layer:layer};
  T.els=tk.map(function(t){
    var o=h('span','wd'+(t.fk?' fk':'')+(t.fk==='v'?' v':'')),i=h('span','wi',t.s);
    o.appendChild(i);layer.appendChild(o);
    if(t.fk){
      var F=t.fk==='v'?TREE:V.opts;
      o.dataset.fk=t.fk;o.tabIndex=-1;o.setAttribute('role','button');
      o.setAttribute('aria-label',t.s+' '+(t.fk==='v'?V.p:O.p)+' percent. Other options: '+F.filter(function(x){return x.w!==t.s}).map(function(x){return x.w+' '+x.p+' percent'}).join(', '));
    }
    return {o:o,i:i,x:0,y:0};
  });
  ans.insertBefore(layer,pick);
  TX[id]=T;
})});
function nextId(T,fk,b){return fk==='v'?b+'.0':T.a+'.'+b}
function forkK(T,fk){return fk==='v'?0:T.mi}

/* ─────────── барабаны ─────────── */
var FORK={};
function mkFork(key,opts,bold){
  var el=h('div','prows'+(bold?' pv':''));
  var rows=opts.map(function(O){
    var r=h('div','prow'),bar=h('span','pbar'),on=h('i'),lab=h('span','plab',O.w),pct=h('span','ppct');
    bar.appendChild(on);
    var digs=String(O.p).split('').map(function(){
      var d=h('span','dg'),u=h('u');
      for(var k=0;k<11;k++)u.appendChild(h('b',null,String(k%10)));
      d.appendChild(u);pct.appendChild(d);return {d:d,u:u};
    });
    pct.appendChild(document.createTextNode('%'));
    r.appendChild(bar);r.appendChild(lab);r.appendChild(pct);el.appendChild(r);
    return {el:r,bar:bar,on:on,lab:lab,pct:pct,digs:digs,p:O.p,w:O.w};
  });
  pclip.appendChild(el);
  FORK[key]={key:key,el:el,rows:rows,n:rows.length};
}
mkFork('v',TREE,true);
TREE.forEach(function(V,a){mkFork('m'+a,V.opts,false)});
function forkOf(T,fk){return FORK[fk==='v'?'v':'m'+T.a]}

/* ─────────── раскладка: всё в координатах ответа, без учёта масштаба записи ─────────── */
var L={aw:0,ax:0,ay:0};
function measure(){
  L.aw=ans.offsetWidth;
  Object.keys(TX).forEach(function(id){
    var T=TX[id];meas.textContent='';
    var sp=T.tk.map(function(t,j){
      if(j&&!t.glue)meas.appendChild(document.createTextNode(' '));
      var s=h('span',t.fk==='v'?'v':null,t.s);meas.appendChild(s);return s;
    });
    T.pos=sp.map(function(s){return {x:s.offsetLeft,y:Math.round((s.offsetTop-2)/LH)*LH,w:s.offsetWidth}});
    T.H=T.pos[T.pos.length-1].y+LH;
    T.els.forEach(function(e,j){e.x=T.pos[j].x;e.y=T.pos[j].y});
  });
  meas.textContent='';
  Object.keys(FORK).forEach(function(k){
    var F=FORK[k];F.el.style.display='block';
    F.lw=0;F.pw=0;
    F.rows.forEach(function(r){F.lw=Math.max(F.lw,r.lab.offsetWidth);F.pw=Math.max(F.pw,r.pct.offsetWidth)});
    F.el.style.display='';
  });
  curFork=null;
  var cr=chat.getBoundingClientRect(),ar=ans.getBoundingClientRect(),sc=cr.width/chat.offsetWidth||1;
  L.ax=(ar.left-cr.left)/sc;L.ay=(ar.top-cr.top)/sc;
}

/* где встаёт барабан слова: подписи точно поверх слова, доли справа, у края доли слева */
function geo(T,fk){
  var k=forkK(T,fk),P=T.pos[k],F=forkOf(T,fk);
  var padL=8,gap=16,padR=10,rw=Math.max(176,padL+F.lw+gap+F.pw+padR),left=P.x-padL,flip=false;
  // у правого края барабан растёт влево: правый край по самой длинной подписи
  if(left+rw>L.aw+10){flip=true;left=P.x+F.lw+padL-rw}
  return {k:k,P:P,F:F,left:left,rw:rw,flip:flip,padR:padR};
}

/* ─────────── кадр ─────────── */
/* текст: Y стоит на месте; tr = {X,k,tt,dir}: хвост X уходит, хвост Y прикатывается.
   Волна идёт от развилки по строкам. Время слова считается по его месту, а не по номеру,
   поэтому старое и новое слово в одном месте строки катятся вместе, как один барабан. */
function wave(T,j,Y,k){
  var O=Y.pos[k],P=T.pos[j];
  return Math.max(0,(P.y-O.y)/LH*L.aw+P.x+P.w/2-(O.x+O.w))/V;
}
function trDur(X,Y,k){
  var m=0,j;
  for(j=k+1;j<Y.tk.length;j++)m=Math.max(m,wave(Y,j,Y,k));
  for(j=k+1;j<X.tk.length;j++)m=Math.max(m,wave(X,j,Y,k));
  return ROLLD+m+IN+.02;
}
var shownY=null;
function place(e,dy,op,roll){
  set(e.o,'transform','translate('+e.x+'px,'+e.y+'px)');
  set(e.o,'opacity',op<=0?'0':op>=1?'1':op.toFixed(3));
  set(e.o,'clipPath',roll?'inset(0 -4px)':'none');
  set(e.i,'transform',dy?'translateY('+dy.toFixed(2)+'px)':'none');
}
function drawText(Y,tr,hideK){
  Object.keys(TX).forEach(function(id){set(TX[id].layer,'visibility',id===Y.id||(tr&&id===tr.X.id)?'visible':'hidden')});
  var H=Y.H;
  if(tr)H=mix(tr.X.H,Y.H,eio(tr.tt/(trDur(tr.X,Y,tr.k)-.02)));
  Y.els.forEach(function(e,j){
    if(j===hideK){place(e,0,0,false);return}
    if(tr&&j>tr.k){
      var n=c01((tr.tt-ROLLD-wave(Y,j,Y,tr.k))/IN);
      if(reduce){place(e,0,sm(n),false);return}
      place(e,tr.dir*LH*(1-eback(n)),n<=0?0:sm(n*2.6),n<1);
      return;
    }
    place(e,0,1,false);
  });
  if(tr)tr.X.els.forEach(function(e,j){
    if(j<=tr.k){place(e,0,0,false);return}
    var n=c01((tr.tt-ROLLD-wave(tr.X,j,Y,tr.k))/IN);
    if(reduce){place(e,0,1-sm(n),false);return}
    place(e,-tr.dir*LH*Math.min(1.2,eback(n)),n>=1?0:1-sm(n*1.6),n>0&&n<1);
  });
  set(ans,'height',H.toFixed(2)+'px');
  if(shownY!==Y){
    if(shownY)shownY.els.forEach(function(e){if(e.o.dataset.fk)e.o.tabIndex=-1});
    Y.els.forEach(function(e){if(e.o.dataset.fk)e.o.tabIndex=0});
    shownY=Y;
  }
}

/* барабан: off непрерывный номер строки в прорези, o раскрытие, q разгон долей, wr прямоугольник слова */
var curFork=null;
function reel(r,v){
  var n=r.digs.length;
  for(var d=0;d<n;d++){
    var D=r.digs[n-1-d],p10=Math.pow(10,d),pos=d?Math.floor(v/p10)%10+Math.max(0,v%p10-(p10-1)):v%10;
    set(D.u,'transform','translateY('+(-pos*16).toFixed(2)+'px)');
    // старший разряд не показывает ведущий ноль
    if(d&&d===n-1)set(D.d,'opacity',String(sm(v-(p10-1))));
  }
}
function drawPick(pk){
  var F=pk?pk.G.F:null;
  if(curFork!==F){if(curFork)curFork.el.style.display='';if(F)F.el.style.display='block';curFork=F}
  if(!pk||pk.o<=VIS){set(pick,'visibility','hidden');return}
  set(pick,'visibility','visible');
  var G=pk.G,P=G.P,o=pk.o,off=pk.off,wr=pk.wr;
  var fx=G.left-4,fy=P.y-4-off*RH-4,fw=G.rw+8,fh=F.n*RH+8;
  var x=mix(wr.x-3,fx,o),y=mix(wr.y,fy,o),w=mix(wr.w+6,fw,o),hh=mix(LH,fh,o),rad=mix(5,12,o);
  [psh,pclip].forEach(function(el){
    set(el,'transform','translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)');
    set(el,'width',w.toFixed(2)+'px');set(el,'height',hh.toFixed(2)+'px');set(el,'borderRadius',rad.toFixed(2)+'px');
  });
  set(psh,'opacity',String(sm(o*1.5)));
  set(F.el,'transform','translate('+(-x).toFixed(2)+'px,'+(-y).toFixed(2)+'px)');
  F.rows.forEach(function(r,i){
    var top=P.y-4+(i-off)*RH,hl=Math.max(0,1-Math.abs(i-off)),q=eout(c01((pk.q-i*.1)/.72));
    set(r.el,'transform','translate('+G.left+'px,'+top.toFixed(2)+'px)');
    set(r.el,'width',G.rw+'px');
    // полоса доли, как итог опроса
    set(r.bar,'width',Math.max(10,(G.rw-4)*r.p/100*q).toFixed(2)+'px');
    set(r.bar,'opacity',String(sm(o*1.6)));
    set(r.on,'opacity',hl.toFixed(3));
    set(r.lab,'left',(P.x-G.left)+'px');
    set(r.lab,'opacity',hl>.5?'1':String(sm(o*1.4)));
    set(r.pct,G.flip?'left':'right',G.padR+'px');set(r.pct,G.flip?'right':'left','auto');
    set(r.pct,'opacity',String(sm((o-.25)/.75)));
    set(r.pct,'color','color-mix(in srgb,var(--blue) '+Math.round(hl*100)+'%,var(--sub))');
    reel(r,r.p*q);
  });
}

function drawCur(c){
  if(!c||c.a<=.001){set(cur,'opacity','0');return}
  cur.classList.toggle('rs',!!c.rs);
  var hx=c.rs?12:5,hy=c.rs?12:2.6;
  set(cur,'opacity',c.a.toFixed(3));
  set(cur,'transform','translate('+(L.ax+c.x-hx).toFixed(2)+'px,'+(L.ay+c.y-hy).toFixed(2)+'px) scale('+c.s.toFixed(3)+')');
  set(cur,'transformOrigin',hx+'px '+hy+'px');
}

var VIS=.002;   // ниже этого барабан не рисуется, и слово под ним снова видно
function render(fr){
  drawText(fr.Y,fr.tr,fr.pk&&fr.pk.o>VIS?fr.pk.hideK:-1);
  drawPick(fr.pk);
  drawCur(fr.cur);
}

/* ─────────── автопоказ: три щелчка, петля 12 с ───────────
   No. → Yes. (всё после первого слова другое), honest → casual (меняется только хвост), Yes. → No. */
var FL=[
  {T:.55,from:'0.0',fk:'v',b:1,hold:.66},
  {T:4.3,from:'1.0',fk:'m',b:1,hold:.4},
  {T:8.2,from:'1.1',fk:'v',b:0,hold:.36}
];
var CYCLE=12;
FL.forEach(function(F){
  var X=TX[F.from];
  F.a=F.fk==='v'?X.a:X.b;F.to=nextId(X,F.fk,F.b);F.dir=F.b>F.a?1:-1;F.k=forkK(X,F.fk);
  F.o0=F.T+.1;F.o1=F.o0+.26;F.d0=F.o1+F.hold;F.d1=F.d0+.42;F.rel=F.d1+.03;
  F.c0=F.rel+.08;F.c1=F.c0+.22;F.s0=F.c0+.05;   // волна трогается, пока барабан ещё сворачивается
});
function offAt(F,u){
  if(u<F.d0)return F.a;
  if(u<F.d1)return F.a+F.dir*1.06*eio(seg(u,F.d0,F.d1));
  return F.a+F.dir*(1+.06*(1-eout(seg(u,F.d1,F.d1+.2))));
}
function scene(u){
  var F=null;
  for(var i=FL.length-1;i>=0;i--)if(u>=FL[i].T-.5){F=FL[i];break}
  if(!F)return {Y:TX[FL[FL.length-1].to]};
  var X=TX[F.from],Y=TX[F.to],fr={Y:u<F.s0?X:Y};
  if(u>=F.s0&&u-F.s0<trDur(X,Y,F.k))fr.tr={X:X,k:F.k,tt:u-F.s0,dir:F.dir};

  if(u>=F.o0&&u<F.c1){
    var closing=u>=F.c0,W=(closing?Y:X).pos[F.k];
    fr.pk={G:geo(X,F.fk),off:offAt(F,u),hideK:F.k,
      o:closing?1-eio(seg(u,F.c0,F.c1)):eout(seg(u,F.o0,F.o1)),q:seg(u,F.o0+.04,F.o0+.62),wr:W};
  }

  // курсор: подходит к слову, берёт его за правый край, тянет вместе с барабаном, отпускает и уходит
  var P=X.pos[F.k],tx=P.x+P.w+5,ty=P.y+11,a0=F.T-.5,a1=F.T-.06;
  if(u<F.rel+.5){
    var c={rs:u>=F.T-.14&&u<F.rel+.1,s:1,a:1};
    if(u<a1){var e=eout(seg(u,a0,a1));c.x=mix(tx+58,tx,e);c.y=mix(ty+64,ty,e);c.a=sm(seg(u,a0,a0+.16))}
    else if(u<F.rel){c.x=tx;c.y=ty-(offAt(F,u)-F.a)*RH}
    else{
      var d=eout(seg(u,F.rel+.06,F.rel+.5));
      c.x=tx+10*d;c.y=ty-(offAt(F,F.rel)-F.a)*RH+14*d;c.a=1-sm(seg(u,F.rel+.1,F.rel+.42));
    }
    c.s=1-.1*sm(seg(u,F.T,F.T+.07))*(1-sm(seg(u,F.rel,F.rel+.07)));
    fr.cur=c;
  }
  return fr;
}

/* события звука в петле: [время, тип, …]; слово встаёт на место, когда перелёт барабана пересекает строку */
var EVENTS=[];
function lands(Y,k,t0){
  var out=[],n=Y.tk.length-k-1;
  for(var j=k+1;j<Y.tk.length;j++)out.push([t0+ROLLD+wave(Y,j,Y,k)+IN*.4,'land',j-k-1,n]);
  return out;
}
function buildEvents(){
  EVENTS=[];
  FL.forEach(function(F){
    var lo=0,hi=1;
    for(var k=0;k<30;k++){var m=(lo+hi)/2;if(1.06*eio(m)<.5)lo=m;else hi=m}
    EVENTS.push([F.T,'press'],[F.o0,'open'],[F.d0+lo*(F.d1-F.d0),'tick'],[F.rel,'release'],[F.c0,'close']);
    EVENTS=EVENTS.concat(lands(TX[F.to],F.k,F.s0));
  });
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=0}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим: слово тянется пальцем, мышью или стрелками ─────────── */
var mode='auto',live=null;
function liveNow(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var fr=scene(uNow());
  mode='live';live={Y:fr.Y,tr:null,pk:null};
  document.documentElement.classList.add('live');
  playBtn.textContent='Replay';
}
function goAuto(){
  mode='auto';live=null;acc=0;lastU=0;
  document.documentElement.classList.remove('live');
}
function toAns(e){
  var r=ans.getBoundingClientRect(),sc=r.width/ans.offsetWidth||1;
  return {x:(e.clientX-r.left)/sc,y:(e.clientY-r.top)/sc};
}
function hitFork(Y,x,y){
  for(var j=0;j<Y.tk.length;j++){
    var t=Y.tk[j],P=Y.pos[j];
    if(t.fk&&x>=P.x-6&&x<=P.x+P.w+6&&y>=P.y-5&&y<=P.y+LH+5)return t.fk;
  }
  return null;
}
function openPick(fk,y0,sticky){
  var Y=live.Y,now=liveNow();
  live.tr=null;
  var a=fk==='v'?Y.a:Y.b;
  live.pk={fk:fk,G:geo(Y,fk),a:a,off:a,target:a,t0:now,state:sticky?'sticky':'press',y0:y0,row:a,hideK:forkK(Y,fk)};
  Sound.play([0,'press']);Sound.play([0,'open'],.06);
}
function closePick(b){
  var pk=live.pk;if(!pk||pk.state==='closing')return;
  var now=liveNow();
  pk.state='closing';pk.tc=now;pk.from=pk.off;pk.b=b;
  Sound.play([0,'release']);Sound.play([0,'close'],.05);
  if(b!==pk.a){
    var X=live.Y,Y=TX[nextId(X,pk.fk,b)];
    live.tr={X:X,k:pk.hideK,t0:now+.1,dir:b>pk.a?1:-1};live.Y=Y;
    lands(Y,pk.hideK,.1).forEach(function(ev){Sound.play(ev,ev[0])});
  }
}
function rubber(off,n){
  if(off<0)return -.4*(1-1/(1-off*.9));
  if(off>n-1){var e=off-(n-1);return n-1+.4*(1-1/(1+e*.9))}
  return off;
}
function liveFrame(now,dt){
  var fr={Y:live.Y},pk=live.pk;
  if(live.tr){
    var tt=now-live.tr.t0;
    if(tt>trDur(live.tr.X,live.Y,live.tr.k))live.tr=null;
    else fr.tr={X:live.tr.X,k:live.tr.k,tt:tt,dir:live.tr.dir};
  }
  if(pk){
    var G=pk.G,F=G.F,o;
    if(pk.state==='closing'){
      pk.off=mix(pk.from,pk.b,eout(seg(now,pk.tc,pk.tc+.16)));
      o=1-eio(seg(now,pk.tc+.05,pk.tc+.27));
      if(o<=0){live.pk=null;pk=null}
    }else{
      if(pk.state==='sticky')pk.off=mix(pk.off,pk.target,1-Math.exp(-dt*16));
      o=eout(seg(now,pk.t0,pk.t0+.24));
    }
    if(pk){
      var row=clamp(Math.round(pk.off),0,F.n-1);
      if(row!==pk.row&&pk.state!=='closing'){pk.row=row;Sound.play([0,'tick'])}
      fr.pk={G:G,off:pk.off,o:o,q:seg(now,pk.t0+.04,pk.t0+.62),wr:live.Y.pos[pk.hideK],hideK:pk.hideK};
    }
  }
  set(pick,'pointerEvents',pk&&pk.state==='sticky'?'auto':'none');
  return fr;
}

var drag=null;
thread.addEventListener('pointerdown',function(e){
  if(REC||e.button>0)return;
  Sound.start();
  var p=toAns(e);
  if(mode==='live'&&live.pk&&live.pk.state==='sticky'){
    var pk=live.pk,G=pk.G,row=Math.floor((p.y-(G.P.y-4))/RH+pk.off);
    closePick(p.x>=G.left&&p.x<=G.left+G.rw&&row>=0&&row<G.F.n?row:pk.a);
    e.preventDefault();return;
  }
  var Y=mode==='live'?live.Y:scene(uNow()).Y,fk=hitFork(Y,p.x,p.y);
  if(!fk)return;
  if(mode==='live'&&live.pk)return;
  goLive();
  openPick(fk,p.y,false);
  drag={id:e.pointerId,moved:false};
  thread.setPointerCapture(e.pointerId);
  e.preventDefault();
});
thread.addEventListener('pointermove',function(e){
  if(!drag||e.pointerId!==drag.id||!live.pk||live.pk.state==='closing')return;
  var pk=live.pk,p=toAns(e),dy=p.y-pk.y0;
  if(Math.abs(dy)>4)drag.moved=true;
  if(drag.moved){pk.state='drag';pk.off=rubber(pk.a-dy/RH,pk.G.F.n)}
});
function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  var pk=live&&live.pk;drag=null;
  if(!pk||pk.state==='closing')return;
  if(pk.state==='drag')closePick(clamp(Math.round(pk.off),0,pk.G.F.n-1));
  else{pk.state='sticky';pk.target=pk.a}
}
thread.addEventListener('pointerup',endDrag);
thread.addEventListener('pointercancel',endDrag);
document.addEventListener('pointerdown',function(e){
  if(mode==='live'&&live.pk&&live.pk.state==='sticky'&&!thread.contains(e.target))closePick(live.pk.a);
});
pick.addEventListener('wheel',function(e){
  if(mode!=='live'||!live.pk||live.pk.state!=='sticky')return;
  e.preventDefault();
  var pk=live.pk;pk.wacc=(pk.wacc||0)+e.deltaY;
  if(Math.abs(pk.wacc)>36){pk.target=clamp(pk.target+(pk.wacc>0?1:-1),0,pk.G.F.n-1);pk.wacc=0}
},{passive:false});
ans.addEventListener('keydown',function(e){
  var el=e.target.closest&&e.target.closest('.wd');
  if(!el||!el.dataset.fk)return;
  var k=e.key;
  if(k!=='Enter'&&k!==' '&&k!=='ArrowUp'&&k!=='ArrowDown'&&k!=='Escape')return;
  e.preventDefault();Sound.start();
  goLive();
  var pk=live.pk;
  if(!pk){if(k==='Escape')return;openPick(el.dataset.fk,0,true);pk=live.pk}
  if(pk.state!=='sticky')return;
  if(k==='ArrowDown')pk.target=clamp(pk.target+1,0,pk.G.F.n-1);
  else if(k==='ArrowUp')pk.target=clamp(pk.target-1,0,pk.G.F.n-1);
  else if(k==='Escape')closePick(pk.a);
  else if(pk.target!==pk.a||k==='Enter')closePick(pk.target);
});

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(scene(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else render(liveFrame(liveNow(),dt));
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
window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60)};

measure();buildEvents();
addEventListener('resize',function(){measure();buildEvents()});
requestAnimationFrame(tick);
