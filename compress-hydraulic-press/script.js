/* ─────────── Compress ───────────
   Окно Finder, на рабочем столе три выделенных файла: brief.pdf, hero.png, reel.mov, всего 48 MB.
   Правый клик, Compress 3 Items. Сверху опускается гидравлический пресс, зависает над файлами,
   потом давит: файлы раздуваются бочкой и дрожат, стрелка манометра ползёт к красному, хруст,
   они сплющиваются в блины, а из щели выстреливает горстка битов (это и есть сэкономленные 0.1 MB).
   Блины съезжаются и выпрыгивают одним Archive.zip, размер перекатывается с 48.0 на 47.9 MB.
   Пресс бьёт ещё раз со злостью, zip сплющивается и отпружинивает резиной. Всё те же 47.9 MB.
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
function ein(p){p=c01(p);return p*p*p}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))}
function backOut(p,c){p=c01(p);c=c||1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function wob(d,dec,f){return d<0?0:Math.exp(-dec*d)*Math.sin(2*Math.PI*f*d)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ─────────── геометрия ─────────── */
var WIN={x:36,y:40,w:360,h:452,r:14};
var FX=[118,216,314],B=322,FW=80,FH=102,FLAT=13;
var FILES=[{n:'brief.pdf',s:'2.1 MB',tag:'PDF',k:'red'},{n:'hero.png',s:'8.4 MB',tag:'PNG',k:'blue'},{n:'reel.mov',s:'37.5 MB',tag:'MOV',k:'purple'}];
var MENU={x:214,y:244,w:170,items:['Open','Get Info','Rename…','-','Compress 3 Items','Duplicate']};
var PLATE={x:58,w:316,h:38},TOP=-44;

/* ─────────── расписание ─────────── */
var T={rclick:.36,menu:.42,click:.98,close:1.06,down:1.08,hover:1.38,touch:1.56,crush:2.3,flat:2.42,up:2.95,merge:3.48,zip:3.86,roll:4.6,slam:5.25,squash:5.4,lift:5.9,end:7.6};
var CYCLE=T.end;

// низ плиты пресса
function plateAt(t){
  var Y0=B-FH-20,Y1=B-FH;
  if(t<T.down)return TOP;
  if(t<T.hover)return mix(TOP,Y0,eio(seg(t,T.down,T.hover)))+0;
  if(t<T.touch)return Y0+2.5*wob(t-T.hover,8,5);
  if(t<T.touch+.08)return mix(Y0,Y1,eio(seg(t,T.touch,T.touch+.08)));
  if(t<T.crush)return mix(Y1,B-48,eout(seg(t,T.touch+.08,T.crush)))+.7*Math.sin(t*95)*seg(t,T.touch+.3,T.crush);
  if(t<T.flat)return mix(B-48,B-FLAT,ein(seg(t,T.crush,T.flat)));
  if(t<T.up)return B-FLAT-1.5*wob(t-T.flat,12,9);
  if(t<T.up+.5)return mix(B-FLAT,TOP,eio(seg(t,T.up,T.up+.5)));
  if(t<T.slam)return TOP;
  if(t<T.squash)return mix(TOP,Y1,ein(seg(t,T.slam,T.squash)));
  if(t<T.squash+.14)return mix(Y1,B-38,eout(seg(t,T.squash,T.squash+.14)));
  if(t<T.lift)return B-38+.9*Math.sin(t*110)*seg(t,T.squash+.14,T.squash+.3);
  return mix(B-38,TOP,eio(seg(t,T.lift,T.lift+.45)));
}
// стрелка манометра: 0 покой, 1 красная зона
function gaugeAt(t,pb){
  if(t<T.up)return c01((pb-(B-FH))/(FH-FLAT))*(t>T.crush?1.05:1);
  if(t>=T.slam&&t<T.lift+.1)return c01((pb-(B-FH))/40)+.12*Math.sin(t*60)*seg(t,T.squash+.14,T.squash+.3);
  return 0;
}
// горстка битов из щели в момент хруста
var BITS=(function(){var R=rng(19),a=[];for(var i=0;i<14;i++){var side=i%2?1:-1,from=i<10?side:(R()<.5?-1:1);
  a.push({x:from>0?FX[2]+50:FX[0]-50,vx:from*(110+R()*230),vy:-(140+R()*280),s:5+R()*4,c:['red','blue','purple','ink','sub'][Math.floor(R()*5)],r:R()*6})}return a})();

/* ─────────── курсор ─────────── */
function cursorAt(t){
  var rest={x:352,y:424},on={x:MENU.x+2,y:MENU.y+2},it={x:MENU.x+92,y:MENU.y+5+3*22+9+11},x=rest.x,y=rest.y,s;
  if(t<T.rclick-.04){s=eio(seg(t,.04,T.rclick-.04));x=mix(rest.x,on.x,s);y=mix(rest.y,on.y,s)}
  else if(t<T.menu+.12){x=on.x;y=on.y}
  else if(t<T.click){s=eio(seg(t,T.menu+.12,T.click-.12));x=mix(on.x,it.x,s);y=mix(on.y,it.y,s)}
  else if(t<T.close+.05){x=it.x;y=it.y}
  else{s=eio(seg(t,T.close+.05,T.close+.55));x=mix(it.x,rest.x,s);y=mix(it.y,rest.y,s)}
  var press=bump(t,T.rclick-.05,T.rclick+.07)+bump(t,T.click-.05,T.click+.07);
  return{x:x,y:y,press:press};
}

/* ─────────── рисование ─────────── */
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)))}
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(-.012*sz)+'px'}
function tw(s,sz,wt){setFont(sz,wt);return ctx.measureText(s).width}
function txt(s,x,y,sz,col,wt,al){setFont(sz,wt);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
function cursorShape(x,y,sc){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,15.5);ctx.lineTo(3.8,12);ctx.lineTo(6.4,17.6);ctx.lineTo(8.9,16.5);ctx.lineTo(6.4,11);ctx.lineTo(11.4,11);ctx.closePath();
  ctx.lineJoin='round';ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.fillStyle='#000';ctx.fill();ctx.restore();
}

// документ: при сжатии раздувается бочкой, z это доля проявленной молнии у архива
function doc(cx,h,kind,tagCol,tag,zipP,jit){
  var q=1-h/FH,w=FW*(1+q*.3),bul=16*q*(h/FH)*2.2*seg(h,16,34),x0=cx-w/2+(jit||0),x1=x0+w,top=B-h,f=Math.min(17,h*.24),k=h/FH;
  ctx.beginPath();ctx.moveTo(x0+4,top);ctx.lineTo(x1-f,top);ctx.lineTo(x1,top+f);
  ctx.quadraticCurveTo(x1+bul,(top+f+B)/2,x1,B-4);ctx.quadraticCurveTo(x1,B,x1-4,B);
  ctx.lineTo(x0+4,B);ctx.quadraticCurveTo(x0,B,x0,B-4);
  ctx.quadraticCurveTo(x0-bul,(top+B)/2,x0,top+4);ctx.quadraticCurveTo(x0,top,x0+4,top);ctx.closePath();
  ctx.fillStyle=COL.doc;ctx.fill();ctx.strokeStyle=COL.docLine;ctx.lineWidth=1.2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(x1-f,top);ctx.lineTo(x1-f,top+f-3);ctx.quadraticCurveTo(x1-f,top+f,x1-f+3,top+f);ctx.lineTo(x1,top+f);ctx.closePath();
  ctx.fillStyle=COL.fold;ctx.fill();ctx.stroke();
  // значок посередине, сплющивается вместе с файлом
  var gx=(x0+x1)/2,gy=top+h*.42;
  ctx.save();ctx.translate(gx,gy);ctx.scale(1+q*.3,Math.max(.05,k));
  ctx.fillStyle=COL.glyph;ctx.strokeStyle=COL.glyph;ctx.lineWidth=2;
  ctx.scale(1.2,1.2);
  if(kind==='PDF'){for(var i=0;i<4;i++){rr(-16,-12+i*7,i===3?20:32,3.2,1.6);ctx.fill()}}
  else if(kind==='PNG'){dot(-8,-7,4.5,COL.glyph);ctx.beginPath();ctx.moveTo(-18,12);ctx.lineTo(-5,-1);ctx.lineTo(3,7);ctx.lineTo(9,1);ctx.lineTo(18,12);ctx.closePath();ctx.fill()}
  else if(kind==='MOV'){rr(-17,-12,34,24,5);ctx.stroke();ctx.beginPath();ctx.moveTo(-4,-6);ctx.lineTo(7,0);ctx.lineTo(-4,6);ctx.closePath();ctx.fill()}
  ctx.restore();
  if(kind==='ZIP'){
    // молния сверху вниз, проявляется по zipP
    var n=Math.round(9*c01(zipP==null?1:zipP));ctx.fillStyle=COL.zip;
    for(var j=0;j<n;j++){var yy=top+6+j*6.5*k;ctx.fillRect(gx+(j%2?0:-7),yy,7,3.8*k)}
    if(n>0){rr(gx-6,top+6+n*6.5*k,12,11*k,2.5);ctx.fill()}
  }
  // ярлык типа
  var th=Math.max(2,17*k),tw2=42*(1+q*.3);
  ctx.fillStyle=tagCol;rr(gx-tw2/2,B-8-th-k*6,tw2,th,Math.min(4,th/2));ctx.fill();
  if(h>50)txt(tag,gx,B-8-th/2-k*6+.5,11,'#fff',700,'center');
}
function label(cx,name,size,a,dy){
  if(a<=0)return;ctx.globalAlpha=a;var w=tw(name,12.5,500)+14,y=B+22+(dy||0);
  ctx.fillStyle=COL.sel;rr(cx-w/2,y-10,w,20,6);ctx.fill();
  txt(name,cx,y+.5,12.5,'#fff',500,'center');
  if(size)txt(size,cx,y+19,11.5,COL.sub,400,'center');
  ctx.globalAlpha=1;
}
function rollText(A,Z,f,x,y,sz,col){
  // строки одинаковой длины, разные символы перекатываются вниз
  var w=tw(A,sz),x0=x-w/2,hh=sz*1.25;
  ctx.save();ctx.beginPath();ctx.rect(x0-4,y-hh/2,w+8,hh);ctx.clip();
  for(var i=0;i<A.length;i++){var dx=x0+tw(A.slice(0,i),sz);
    if(A[i]===Z[i])txt(A[i],dx,y,sz,col);else{txt(A[i],dx,y+f*hh,sz,col);txt(Z[i],dx,y-(1-f)*hh,sz,col)}}
  ctx.restore();
}

function press(pb,g){
  if(pb<=TOP+1)return;
  var px=PLATE.x,pw=PLATE.w,ph=PLATE.h,ptop=pb-ph;
  // шток и муфта
  ctx.fillStyle=COL.rod;ctx.fillRect(SW/2-26,-10,52,ptop+10);
  ctx.fillStyle=COL.rodLine;ctx.fillRect(SW/2-26,-10,4,ptop+10);
  ctx.fillStyle=COL.plate;rr(SW/2-46,ptop-14,92,16,4);ctx.fill();
  // плита
  rr(px,ptop,pw,ph,6);ctx.fill();
  ctx.fillStyle=COL.face;rr(px,pb-7,pw,7,3);ctx.fill();
  dot(px+16,ptop+15,3.2,COL.face);dot(px+pw-16,ptop+15,3.2,COL.face);
  // манометр
  var gx=px+pw-50,gy=ptop+15;
  dot(gx,gy,11.5,COL.gauge);ctx.strokeStyle=COL.face;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(gx,gy,11.5,0,7);ctx.stroke();
  ctx.strokeStyle=COL.red;ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(gx,gy,8,-.35,.75);ctx.stroke();
  var a=mix(Math.PI*.82,Math.PI*2.22,c01(g));
  ctx.strokeStyle=COL.needle;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+8.5*Math.cos(a),gy+8.5*Math.sin(a));ctx.stroke();
  dot(gx,gy,2,COL.needle);
}

function scene(t,o){
  M0();
  ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);
  var pb=plateAt(t),g=gaugeAt(t,pb);
  var jolt=1.4*wob(t-T.touch-.08,18,10)+2.6*wob(t-T.flat,14,10)+2.4*wob(t-T.squash,14,10);
  ctx.save();ctx.translate(0,jolt);

  // окно Finder
  ctx.save();ctx.shadowColor=COL.shadow;ctx.shadowBlur=40;ctx.shadowOffsetY=12;
  ctx.fillStyle=COL.card;rr(WIN.x,WIN.y,WIN.w,WIN.h,WIN.r);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.line;ctx.lineWidth=1;rr(WIN.x+.5,WIN.y+.5,WIN.w-1,WIN.h-1,WIN.r-.5);ctx.stroke();
  dot(58,62,6,'#ff5f57');dot(78,62,6,'#febc2e');dot(98,62,6,'#28c840');
  txt('Desktop',216,62.5,14,COL.ink,600,'center');
  ctx.fillStyle=COL.line;ctx.fillRect(WIN.x,84,WIN.w,1);ctx.fillRect(WIN.x,WIN.y+WIN.h-40,WIN.w,1);

  // файлы
  if(t<T.zip){
    var hf=t<T.flat?Math.min(FH,B-pb):FLAT,mg=eio(seg(t,T.merge,T.zip-.04)),la=1-seg(t,T.merge-.18,T.merge);
    var jit=t>T.touch+.3&&t<T.crush?.8*Math.sin(t*97):0;
    for(var k=0;k<3;k++){
      var x=mix(FX[k],FX[1],mg),a=k===1?1:1-seg(t,T.zip-.12,T.zip-.02);if(a<=0)continue;
      ctx.globalAlpha=a;doc(x,hf,FILES[k].tag,COL[FILES[k].k],FILES[k].tag,null,jit*(k-1));ctx.globalAlpha=1;
      label(FX[k],FILES[k].n,FILES[k].s,la);
    }
  }else{
    var hz=mix(FLAT,FH,backOut(seg(t,T.zip,T.zip+.4),2.6));
    if(t>=T.lift){var d=t-T.lift;hz=FH-(FH-38)*Math.exp(-d*5.5)*Math.cos(d*15)}
    if(t>=T.slam)hz=Math.min(hz,B-pb);
    doc(FX[1],Math.max(8,hz),'ZIP',COL.zipTag,'ZIP',seg(t,T.zip+.08,T.zip+.38));
    var la2=seg(t,T.zip+.14,T.zip+.28),ly=t>=T.lift?-3*wob(t-T.lift,5,3):0;
    label(FX[1],'Archive.zip','',la2,ly);
    if(la2>0){ctx.globalAlpha=la2;rollText('48.0 MB','47.9 MB',eio(seg(t,T.roll,T.roll+.45)),FX[1],B+41+ly,11.5,COL.sub);ctx.globalAlpha=1}
  }

  // биты, выдавленные прессом
  if(t>=T.flat-.03&&t<T.flat+1.2){
    var db=t-T.flat+.03;
    BITS.forEach(function(b){
      var x=b.x+b.vx*db,y=B-6+b.vy*db+900*db*db,al=1-seg(db,.7,1.15);
      if(y>B-b.s/2){y=B-b.s/2}
      ctx.globalAlpha=al;ctx.save();ctx.translate(x,y);ctx.rotate(b.r+db*8);ctx.fillStyle=COL[b.c];ctx.fillRect(-b.s/2,-b.s/2,b.s,b.s);ctx.restore();ctx.globalAlpha=1;
    });
  }

  // строка состояния
  var sp=eio(seg(t,T.roll+.4,T.roll+.6)),sy=WIN.y+WIN.h-20;
  ctx.save();ctx.beginPath();ctx.rect(WIN.x,sy-10,WIN.w,20);ctx.clip();
  if(sp<1){ctx.globalAlpha=1-sp;txt('3 items selected, 48 MB',216,sy-10*sp,12,COL.sub,400,'center')}
  if(sp>0){ctx.globalAlpha=sp;txt('1 item selected, 47.9 MB',216,sy+10*(1-sp),12,COL.sub,400,'center')}
  ctx.restore();ctx.globalAlpha=1;

  // контекстное меню
  var ma=seg(t,T.menu,T.menu+.06)*(1-seg(t,T.close,T.close+.08));
  if(ma>0){
    var mx=MENU.x,my=MENU.y,mh=5+5*22+9+5;
    ctx.globalAlpha=ma;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.2)';ctx.shadowBlur=22;ctx.shadowOffsetY=8;ctx.fillStyle=COL.menu;rr(mx,my,MENU.w,mh,9);ctx.fill();ctx.restore();
    ctx.strokeStyle=COL.menuLine;ctx.lineWidth=1;rr(mx+.5,my+.5,MENU.w-1,mh-1,8.5);ctx.stroke();
    var y=my+5;
    MENU.items.forEach(function(s,i){
      if(s==='-'){ctx.fillStyle=COL.menuLine;ctx.fillRect(mx+10,y+4,MENU.w-20,1);y+=9;return}
      var hi=i===4&&t>T.click-.14&&!(t>T.click-.01&&t<T.click+.04);
      if(hi){ctx.fillStyle=COL.sel;rr(mx+5,y,MENU.w-10,22,5);ctx.fill()}
      txt(s,mx+14,y+11.5,13,hi?'#fff':COL.ink);y+=22;
    });
    ctx.globalAlpha=1;
  }
  ctx.restore();

  // пресс поверх окна
  ctx.save();ctx.translate(0,jolt*.5);press(pb,g);ctx.restore();

  var cu=cursorAt(t);cursorShape(cu.x,cu.y,1.3*(1-.08*cu.press));
  var fade=Math.max(1-seg(t,0,.16),seg(t,CYCLE-.4,CYCLE));
  if(fade>0){ctx.globalAlpha=fade;ctx.fillStyle=COL.bg;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
}
function render(t){scene(t,null)}

/* ─────────── звук: события [время, тип, …] ─────────── */
function buildEvents(){
  var E=[];
  E.push([T.rclick,'click'],[T.menu,'menu'],[T.click-.14,'hover'],[T.click,'click'],[T.close,'close']);
  E.push([T.down,'hiss',.3],[T.down+.02,'motor',.3],[T.hover,'clunk',.5]);
  E.push([T.touch+.06,'touch'],[T.touch+.08,'groan',T.crush-T.touch-.08]);
  [.25,.43,.58,.66].forEach(function(d,i){E.push([T.touch+.08+d,'creak',i])});
  E.push([T.crush,'crunch'],[T.flat,'boom'],[T.flat+.01,'squirt']);
  BITS.forEach(function(b,i){var vy=b.vy,tl=(-vy)/900*2;E.push([T.flat+tl,'bit',i])});
  E.push([T.up,'release',.5]);
  E.push([T.merge,'slide'],[T.zip,'pop'],[T.zip+.08,'zipper',.3]);
  E.push([T.roll,'roll'],[T.roll+.45,'settle']);
  E.push([T.slam-.02,'hiss',.15],[T.squash,'slam'],[T.squash+.02,'groan',.4],[T.lift,'release',.45],[T.lift+.02,'boing']);
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
var EVENTS=buildEvents();
function fireBetween(ev,u0,u1,cyc){
  if(cyc&&u1<u0){fireBetween(ev,u0,cyc+1e-9,cyc);u0=-1e-9}
  ev.forEach(function(e){if(e[0]>u0&&e[0]<=u1)Sound.play(e,u1-e[0])});
}

/* ─────────── живой режим ───────────
   Всё идёт само, но пресс запускает зритель: время стоит перед кликом Compress и перед вторым ударом. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveStart(){mode='live';document.documentElement.classList.add('live');LV={t:0,last:nowS(),lastT:0,gate:0}}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null}
var GATES=[T.click-.07,T.slam-.05];
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();
  var V=LV;if(V.gate<2&&V.t>=GATES[V.gate]-.001)V.gate++;
});
function liveFrame(){
  var V=LV,n=nowS(),dt=Math.min(.05,n-V.last);V.last=n;
  var lim=V.gate<2?GATES[V.gate]:Infinity;V.t=Math.min(lim,V.t+dt);
  var t=V.t;fireBetween(EVENTS,V.lastT,t);V.lastT=t;
  if(t>=CYCLE){V.t=0;V.lastT=0;V.gate=0;t=0}
  render(t);
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
    ?{bg:'#000000',card:'#1e1e20',ink:'#f5f5f7',sub:'#8d8d93',line:'#2e2e31',doc:'#2c2c2f',docLine:'#47474c',fold:'#3a3a3e',glyph:'#5c5c62',zip:'#8a8d94',zipTag:'#6e7178',
      red:'#ff453a',blue:'#0a84ff',purple:'#bf5af2',sel:'#0a84ff',menu:'#2a2a2d',menuLine:'#3c3c40',
      rod:'#4b4e54',rodLine:'#5c5f66',plate:'#5d6067',face:'#3a3c41',gauge:'#e9e9ec',needle:'#1d1d1f',shadow:'rgba(0,0,0,0)'}
    :{bg:'#f3f3f1',card:'#ffffff',ink:'#1d1d1f',sub:'#8a8a8f',line:'#e6e6e9',doc:'#ffffff',docLine:'#cfcfd5',fold:'#ececf0',glyph:'#c5c5cc',zip:'#9a9da4',zipTag:'#8e9198',
      red:'#ff3b30',blue:'#0a7cff',purple:'#af52de',sel:'#0a7cff',menu:'#ffffff',menuLine:'#dedee3',
      rod:'#a6a9b0',rodLine:'#bfc2c8',plate:'#b9bcc3',face:'#8e9198',gauge:'#ffffff',needle:'#1d1d1f',shadow:'rgba(0,0,0,.07)'};
  COL.inkc=COL.ink;
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

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%CYCLE)+CYCLE)%CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
