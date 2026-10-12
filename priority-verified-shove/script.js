/* ─────────── Priority ───────────
   Тред под чужим постом, 4.2K ответов. Пишу «this is so true» и жму Reply.
   У меня галочка, поэтому мой ответ не остаётся внизу, а лезет наверх локтями:
   каждый обогнанный ответ отлетает вбок, крутится и падает на место ниже, по списку идёт дрожь.
   Наверху галочка подпрыгивает. Автор отвечает «who?».
   Снизу выезжает Max с галочкой и «this is SO true», приседает и пролетает весь тред за полсекунды.
   Мой ответ улетает за экран, а «who?» остаётся висеть уже под ним.
   Всё считается из расписания: в авто оно фиксированное, в живом режиме его пишут тапы.
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
function spring(s,z,w){return s<=0?0:1-Math.exp(-z*s)*Math.cos(w*s)}
// импульс: пик 1 через tau, потом гаснет
function kick(s,tau){return s<=0?0:(s/tau)*Math.exp(1-s/tau)}

/* ─────────── раскладка ─────────── */
var L={hd:52,y0:206,sl:56,cmp:484};
function slotY(s){return L.y0+s*L.sl}
var TXT_ME='this is so true',TXT_MAX='this is SO true';
var GEN=[[92,248],[124,206],[70,276],[104,188],[84,232],[116,262]];

/* ─────────── расписание ───────────
   post: мой ответ появился; shoves: толчки 4 → 0; who: ответ автора; maxIn, launch: Max; fling: мой улетает */
var DUR=[.42,.36,.31,.28],LD=.52;
function autoSched(){
  var s={type:.15,post:.98,shoves:[1.62,2.16,2.62,3.0],who:3.95,maxIn:5.2,launch:5.5,end:8.5};
  return finish(s);
}
function finish(s){
  s.bling=s.shoves.length===4?s.shoves[3]+DUR[3]:Infinity;
  // когда Max проходит каждый слот: s(t)=5−5·eio(u), касание за четверть слота
  s.pass=[];
  if(isFinite(s.launch)){
    for(var k=4;k>=0;k--){
      var target=k+.75,lo=0,hi=1;
      for(var it=0;it<30;it++){var m=(lo+hi)/2;if(5-5*eio(m)>target)lo=m;else hi=m}
      s.pass[k]=s.launch+hi*LD;
    }
    s.fling=s.pass[0];s.mbling=s.launch+LD;
  }else{s.fling=Infinity;s.mbling=Infinity}
  return s;
}

/* карточки и их ходы: [t, d, ds, dir, вид]. вид: m толкает, k отлетает и падает на слот ниже,
   b отлетает вбок без смены слота (когда пролетает Max), s просто сдвиг */
function buildCards(sc){
  var C=[];
  for(var i=0;i<6;i++)C.push({id:'g'+i,s0:i,bars:GEN[i],av:i,moves:[]});
  var me={id:'me',s0:4,from:sc.post,me:1,name:'Dias Sekenov',handle:'@sekenoov',text:TXT_ME,badge:1,moves:[]};
  var who={id:'who',s0:1,from:sc.who,name:'Kai',handle:'@kai',letter:'K',avc:'#c0a58a',text:'who?',moves:[]};
  var max={id:'max',s0:5,from:sc.maxIn,name:'Max',handle:'@maxx',letter:'M',avc:'#8ea4ba',text:TXT_MAX,badge:1,moves:[]};
  // пост: g4 уезжает под поле ответа, g5 уже там
  C[4].moves.push([sc.post,.3,1,0,'s']);
  // толчки: мой с k на k−1, тот, кто там был, на k
  var order=[C[3],C[2],C[1],C[0]];
  sc.shoves.forEach(function(t,i){
    var dir=i%2?-1:1;
    me.moves.push([t,DUR[i],-1,dir,'m']);
    order[i].moves.push([t+.04,DUR[i]*1.25,1,dir,'k']);
  });
  // «who?» встаёт под мой, остальные сдвигаются
  if(isFinite(sc.who))for(var j=0;j<5;j++)C[j].moves.push([sc.who,.42,1,0,'s']);
  // Max: прошёл слот, тот отлетает в сторону и возвращается на место
  if(isFinite(sc.launch)){
    max.moves.push([sc.launch,LD,-5,1,'M']);
    var at=[who,C[0],C[1],C[2]];   // слоты 1..4 после «who?»
    at.forEach(function(c,i){var k=i+1;c.moves.push([sc.pass[k],.5,0,k%2?1:-1,'b'])});
  }
  C.push(who,me,max);
  return C;
}

function pose(c,t,sc){
  if(c.from!=null&&t<c.from)return null;
  var s=c.s0,x=0,y=0,r=0,z=0,sc1=1,a=1,lift=0;
  for(var i=0;i<c.moves.length;i++){
    var m=c.moves[i],q=t-m[0];
    // замах перед толчком
    if((m[4]==='m'||m[4]==='M')&&q>-.17&&q<0){var w=bump(q,-.17,0);r+=-m[3]*.045*w;y+=2.5*w;sc1-=.015*w}
    if(q<0)continue;
    var u=c01(q/m[1]);
    if(m[4]==='m'){
      s+=m[2]*eio(u);var b=Math.sin(Math.PI*u);
      if(u<1){x+=-m[3]*11*b;r+=m[3]*.09*b;sc1+=.035*b;z=3;lift=b}
    }else if(m[4]==='M'){
      s+=m[2]*eio(u);var b2=Math.sin(Math.PI*u);
      if(u<1){x+=10*Math.sin(u*Math.PI*7)*b2;r+=.05*Math.sin(u*Math.PI*7)*b2;sc1+=.05*b2;z=3;lift=b2}
    }else if(m[4]==='k'){
      s+=m[2]*eout(u);var kk=kick(q,.11);
      x+=m[3]*124*kk;r+=m[3]*.32*kk;if(kk>.02){z=Math.max(z,2);lift=Math.max(lift,kk)}
    }else if(m[4]==='b'){
      var kb=kick(q,.09);x+=m[3]*96*kb;r+=m[3]*.27*kb;if(kb>.02){z=Math.max(z,2);lift=Math.max(lift,kb)}
    }else s+=m[2]*eio(u);
  }
  if(c.id==='me'){
    var pq=t-c.from;a=c01(pq/.08);y+=26*(1-spring(pq,9,15));
    if(t>=sc.fling){var f=t-sc.fling;x=360*f;y=-250*f+1500*f*f;r=6.5*f;s=0;z=5;lift=1}
  }
  if(c.id==='max'){var mq=t-c.from;s+=.75*(1-eout(seg(mq,0,.3)));a=c01(mq/.12)}
  if(c.id==='who'){var wq=t-c.from;x+=SW*(1-eout(seg(wq,0,.42)))}
  // по списку идёт дрожь от каждого удара
  var jolt=0;
  sc.shoves.forEach(function(ts){var d=t-ts-.05;if(d>0)jolt+=1.8*Math.exp(-16*d)*Math.sin(58*d)});
  if(sc.pass)sc.pass.forEach(function(ts){var d=t-ts;if(d>0)jolt+=1.2*Math.exp(-16*d)*Math.sin(58*d)});
  if(z<2)y+=jolt;
  return {s:s,x:x,y:slotY(s)+y,r:r,z:z,sc:sc1,a:a,lift:lift};
}

/* ─────────── рисование ─────────── */
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function txt(s,x,y,sz,col,wt,al){ctx.font=font(sz,wt);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function tw(s,sz,wt){ctx.font=font(sz,wt);return ctx.measureText(s).width}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}

// розетка верификации, 8 лепестков
function rosette(x,y,r,rot){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);
  var N=120;ctx.beginPath();
  for(var i=0;i<=N;i++){var th=i/N*Math.PI*2,R=r*(1+.1*Math.cos(8*th));i?ctx.lineTo(R*Math.cos(th),R*Math.sin(th)):ctx.moveTo(R*Math.cos(th),R*Math.sin(th))}
  ctx.closePath();ctx.fillStyle=COL.vblue;ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=r*.24;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-.36*r,.02*r);ctx.lineTo(-.1*r,.28*r);ctx.lineTo(.38*r,-.26*r);ctx.stroke();
  ctx.restore();
}
function avatarMe(x,y,r){
  dot(x,y,r,COL.av);ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.clip();
  dot(x,y-r*.22,r*.36,COL.avInk);ctx.fillStyle=COL.avInk;ctx.beginPath();ctx.ellipse(x,y+r*.78,r*.66,r*.5,0,0,7);ctx.fill();ctx.restore();
}
function card(c,blingK){
  var h=L.sl;
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,h);
  if(c.bars){
    dot(34,24,17,COL.genAv[c.av%COL.genAv.length]);
    ctx.fillStyle=COL.bar;rr(62,13,c.bars[0],9,4.5);ctx.fill();rr(62,31,c.bars[1],10,5);ctx.fill();
  }else{
    if(c.me)avatarMe(34,24,17);else{dot(34,24,17,c.avc);txt(c.letter,34,24.5,14,'#fff',600,'center')}
    txt(c.name,62,16,14.5,COL.ink,700);
    var nx=62+tw(c.name,14.5,700)+4;
    if(c.badge){rosette(nx+7.5,16,7.2*(1+.55*(blingK||0)),0);nx+=19}
    txt(c.handle+' · now',nx,16,14,COL.sub);
    txt(c.text,62,36,15,COL.ink);
  }
  ctx.fillStyle=COL.hair;ctx.fillRect(0,h-1,SW,1);
}
function drawPost(){
  dot(36,86,21,'#c0a58a');txt('K',36,86.5,16,'#fff',600,'center');
  txt('Kai',66,77,15.5,COL.ink,700);txt('@kai',66,96,14.5,COL.sub);
  ctx.fillStyle=COL.bar;rr(20,122,372,11,5.5);ctx.fill();rr(20,141,318,11,5.5);ctx.fill();rr(20,160,206,11,5.5);ctx.fill();
  var x=20;
  [['4.2K','Replies'],['1.1K','Reposts'],['31K','Likes']].forEach(function(p){
    txt(p[0],x,186,14,COL.ink,700);x+=tw(p[0]+' ',14,700);txt(p[1],x,186,14,COL.sub);x+=tw(p[1],14)+16;
  });
  ctx.fillStyle=COL.hair;ctx.fillRect(0,205,SW,1);
}
function drawHeader(){
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,L.hd);
  ctx.strokeStyle=COL.ink;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(32,27);ctx.lineTo(18,27);ctx.moveTo(24.5,20.5);ctx.lineTo(18,27);ctx.lineTo(24.5,33.5);ctx.stroke();
  txt('Post',SW/2,27,17,COL.ink,700,'center');
  ctx.fillStyle=COL.hair;ctx.fillRect(0,L.hd-1,SW,1);
}
function drawComposer(typed,press){
  var y=L.cmp;
  ctx.fillStyle=COL.bg;ctx.fillRect(0,y,SW,SH-y);ctx.fillStyle=COL.hair;ctx.fillRect(0,y,SW,1);
  avatarMe(32,y+28,15);
  txt(typed||'Post your reply',58,y+28,15.5,typed?COL.ink:COL.sub);
  if(typed){var cw=tw(typed,15.5);}
  ctx.save();ctx.globalAlpha=typed?1:.5;
  var bs=1-.06*(press||0);ctx.translate(SW-50,y+28);ctx.scale(bs,bs);
  ctx.fillStyle=COL.vblue;rr(-36,-16,72,32,16);ctx.fill();txt('Reply',0,.5,14.5,'#fff',700,'center');
  ctx.restore();
}
function finger(x,y,a,press){
  if(a<=0)return;ctx.globalAlpha=a;
  ctx.fillStyle=COL.touch;ctx.strokeStyle=COL.touchS;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(x,y,21-4*(press||0),0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=1;
}

function scene(t,sc,cards,o){
  o=o||{};
  M0();ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  drawPost();
  var list=[];
  cards.forEach(function(c){var p=pose(c,t,sc);if(p&&p.y<SH+80&&p.y>-200)list.push([c,p])});
  list.sort(function(a,b){return a[1].z-b[1].z});
  list.forEach(function(e){
    var c=e[0],p=e[1];
    ctx.save();ctx.globalAlpha=p.a;
    ctx.translate(SW/2+p.x,p.y+L.sl/2);ctx.rotate(p.r);ctx.scale(p.sc,p.sc);
    if(p.lift>.01){
      ctx.shadowColor=COL.sh;ctx.shadowBlur=22*p.lift;ctx.shadowOffsetY=6*p.lift;
      ctx.fillStyle=COL.bg;ctx.fillRect(-SW/2,-L.sl/2,SW,L.sl);ctx.shadowColor='transparent';
      if(COL.dark){ctx.strokeStyle=COL.edge;ctx.lineWidth=1;ctx.strokeRect(-SW/2+.5,-L.sl/2+.5,SW-1,L.sl-1)}
    }
    ctx.translate(-SW/2,-L.sl/2);
    var bk=c.id==='me'?bump(t,sc.bling,sc.bling+.28):c.id==='max'?bump(t,sc.mbling,sc.mbling+.28):0;
    card(c,bk);
    if(c.id==='who'&&p.x<SW*.5){}
    ctx.restore();
  });
  // нить разговора: аватар над «who?», поверх карточек
  var who=list.find(function(e){return e[0].id==='who'});
  if(who&&who[1].x<SW*.5){
    var above=list.filter(function(e){return Math.abs(e[1].y-(who[1].y-L.sl))<6&&e[1].z<2&&(e[0].id==='me'||e[0].id==='max')})[0];
    if(above){ctx.fillStyle=COL.thread;ctx.fillRect(33,above[1].y+44,2,who[1].y-above[1].y-40)}
  }
  drawHeader();
  drawComposer(o.typed,o.press);
  if(o.finger)finger(o.finger[0],o.finger[1],o.finger[2],o.finger[3]);
  if(o.fade>0){M0();ctx.globalAlpha=o.fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
  ctx.setTransform(1,0,0,1,0,0);
}

/* ─────────── авто ─────────── */
var AS=autoSched(),AC=buildCards(AS),CYCLE=AS.end;
function render(t){
  var n=Math.floor(TXT_ME.length*seg(t,AS.type,AS.post-.22)),typed=t<AS.post?TXT_ME.slice(0,n):'';
  var press=bump(t,AS.post-.12,AS.post+.04);
  var fa=seg(t,AS.post-.42,AS.post-.28)*(1-seg(t,AS.post+.08,AS.post+.24));
  scene(t,AS,AC,{typed:typed,press:press,finger:[SW-50,L.cmp+28,fa,press],fade:Math.max(1-seg(t,0,.18),seg(t,CYCLE-.5,CYCLE))});
}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(sc,auto){
  var E=[];
  if(auto){for(var i=0;i<TXT_ME.length;i++)E.push([mix(sc.type,sc.post-.22,i/TXT_ME.length),'key',i])}
  if(isFinite(sc.post))E.push([sc.post-.06,'tap'],[sc.post,'send'],[sc.post+.05,'land']);
  sc.shoves.forEach(function(t,i){
    var dir=i%2?-1:1;
    E.push([t-.15,'wind',i],[t+.04,'shove',i],[t+.05,'swish',dir],[t+.04+DUR[i]*1.1,'slap',dir]);
  });
  if(isFinite(sc.bling))E.push([sc.bling,'bling',0]);
  if(isFinite(sc.who))E.push([sc.who,'who']);
  if(isFinite(sc.maxIn))E.push([sc.maxIn,'rise']);
  if(isFinite(sc.launch)){
    E.push([sc.launch-.15,'wind',4],[sc.launch,'launch']);
    for(var k=1;k<=4;k++)E.push([sc.pass[k],'shove',4+(4-k)*.4],[sc.pass[k]+.01,'swish',k%2?1:-1]);
    E.push([sc.fling,'fling'],[sc.fling+.82,'crash'],[sc.mbling,'bling',1]);
  }
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EVENTS=buildEvents(AS,true);
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Тап по Reply публикует, дальше каждый тап это толчок. После четвёртого всё идёт само. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function toLocal(e){var r=frameEl.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH}}
function liveRound(){
  LV.t=0;LV.last=nowS();LV.lastT=0;
  LV.sc=finish({type:-1,post:Infinity,shoves:[],who:Infinity,maxIn:Infinity,launch:Infinity,end:Infinity});
  LV.cards=buildCards(LV.sc);LV.ev=buildEvents(LV.sc,false);LV.fin=-1;LV.tap=-9;
}
function liveRebuild(){LV.sc=finish(LV.sc);LV.cards=buildCards(LV.sc);var old=LV.ev;LV.ev=buildEvents(LV.sc,false)}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={};liveRound()}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var V=LV,t=V.t,sc=V.sc,p=toLocal(e);V.tap=t;V.tp=p;
  if(!isFinite(sc.post)){
    if(p.y>L.cmp){sc.post=t+.06;liveRebuild()}
    return;
  }
  var n=sc.shoves.length;
  if(n<4&&t>sc.post+.3&&(n===0||t>sc.shoves[n-1]+DUR[n-1]*.7)){
    sc.shoves.push(t+.02);
    if(sc.shoves.length===4){var b=t+.02+DUR[3];sc.who=b+.95;sc.maxIn=sc.who+1.25;sc.launch=sc.maxIn+.3;V.fin=sc.launch+LD+2.4}
    liveRebuild();
  }
});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;V.t+=dt;
  var t=V.t;
  fireBetween(V.ev,V.lastT,t);V.lastT=t;
  var fade=0;
  if(V.fin>0){fade=seg(t,V.fin-.4,V.fin);if(t>=V.fin){liveRound();fade=1}}
  var sc=V.sc,posted=isFinite(sc.post);
  scene(V.t,sc,V.cards,{typed:posted&&t>=sc.post?'':TXT_ME,press:posted?bump(t,sc.post-.1,sc.post+.06):0,
    finger:V.tp?[V.tp.x,V.tp.y,1-seg(t,V.tap+.12,V.tap+.3),bump(t,V.tap-.02,V.tap+.12)]:null,fade:Math.max(fade,1-seg(t,0,.2))});
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
    ?{dark:true,bg:'#000000',ink:'#e7e9ea',sub:'#71767b',hair:'#2f3336',bar:'#202327',thread:'#333639',vblue:'#1d9bf0',
      av:'#2f3336',avInk:'#55595e',genAv:['#3a3d41','#33363a','#3f4246','#36393d','#3c3f43','#313438'],
      sh:'rgba(0,0,0,.9)',edge:'rgba(255,255,255,.12)',touch:'rgba(255,255,255,.16)',touchS:'rgba(255,255,255,.32)'}
    :{dark:false,bg:'#ffffff',ink:'#0f1419',sub:'#536471',hair:'#eff3f4',bar:'#eceff1',thread:'#cfd9de',vblue:'#1d9bf0',
      av:'#e6ecf0',avInk:'#b8c3cb',genAv:['#e3e8ec','#dde3e8','#e8ecef','#d9e0e5','#e1e6ea','#dbe1e6'],
      sh:'rgba(15,20,25,.2)',edge:'rgba(0,0,0,0)',touch:'rgba(110,110,118,.3)',touchS:'rgba(0,0,0,.22)'};
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
window.__AS=AS;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
