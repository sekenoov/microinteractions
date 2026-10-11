/* ─────────── Thank god ───────────
   Групповой чат «sunday brunch». В четверг все за: каждый, кто ответил, запрыгивает
   аватаркой в шапку группы. В воскресенье утром у меня в поле ввода уже набрано
   «so sorry guys i can't», и тут друзья сливаются по одному, а их аватарки буквально
   выпадают из шапки и кучей ложатся на поле ввода. Шапка пустеет. Стираю черновик,
   отправляю «thank god». Через неделю всё заново.
   Кадр рисуется из одного времени t, падение считается один раз при загрузке. */

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
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

/* ─────────── люди и реплики ─────────── */
var PPL=[
  {n:'Sam',i:'S',c:'#ff9f0a'},
  {n:'Jo',i:'J',c:'#30b85a'},
  {n:'Alex',i:'A',c:'#7a6cf0'},
  {n:'Mia',i:'M',c:'#ff4f79'}
];
var PLAN='brunch sunday 11am??',DRAFT='so sorry guys i can’t',END='thank god',GROUP='sunday brunch';
var YES=['YES','i’m in!!','obviously','can’t wait 🥹'];
var FLAKE=[[0,'guys i’m so sorry 😭'],[1,'omg same, can’t today'],[2,'raincheck?'],[3,'next week for sure!!']];

/* ─────────── геометрия, точки экрана 402 × 874 ─────────── */
var SW=402,SH=874,FS=21,BH=40,RX=20,MEX=382,GX=10,ROW=BH+GX,LBL=19,SEPH=40;
var FX=64,FW=324,FH=46,FB=832,FT=FB-FH,FTX=FX+16,INSET=56,CB=FT-INSET,TOPY=146;
var AR=21,HY=83,HSP=33,FLOOR=FT-2;
var TAIL=new Path2D('M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z');
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
var WHITE=[255,255,255];

var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),COL={},KDPR=1;
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(sz,wt,ls){ctx.font=font(sz,wt);if('letterSpacing'in ctx)ctx.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
var MWC={};
function msgW(s){var v=MWC[s];if(v==null){setFont(FS);v=MWC[s]=ctx.measureText(s).width+30}return v}

/* ─────────── сценарий одной недели ───────────
   Четверг: план, четыре «да», каждый запрыгивает в шапку. Воскресенье: мой черновик,
   четыре отмены, каждый выпадает, стираю, «thank god». */
var TL={};
function Round(){return{items:[],ops:[],sends:[],prev:[],jumps:[],drops:[],tRoll:null,end:0}}
function add(R,o){if(!o.sep)o.w=msgW(o.s);o.h=o.sep?SEPH:(o.me?ROW:ROW+LBL);R.items.push(o);return o}
function typeInto(R,str,t,dt,rnd){
  for(var i=0;i<str.length;i++){R.ops.push({t:t,s:str.slice(0,i+1),ch:str[i]});t+=dt*(.75+.5*rnd())+(str[i]===' '?dt*.4:0)}
  return t;
}
function deleteAll(R,str,t){
  // delete держат: сначала по букве, потом всё быстрее
  for(var i=str.length-1,k=0;i>=0;i--,k++){R.ops.push({t:t,s:str.slice(0,i),del:1});t+=mix(.075,.022,c01(k/9))}
  return t;
}
function textAt(R,t){var a=R.ops,lo=0,hi=a.length-1,k=-1;while(lo<=hi){var md=(lo+hi)>>1;if(a[md].t<=t){k=md;lo=md+1}else hi=md-1}return k<0?'':a[k].s}
function lastOpT(R,t){var k=-9;for(var i=0;i<R.ops.length&&R.ops[i].t<=t;i++)k=R.ops[i].t;return k}

function buildRound(){
  var R=Round(),rnd=rng(11),t=.12,it,sp;
  // четверг
  t=typeInto(R,PLAN,t,.03,rnd);
  var tS=t+.1;R.ops.push({t:tS,s:''});R.sends.push(tS);
  sp=add(R,{sep:'Thursday',time:'8:14 PM',tIn:tS,dur:.34});
  it=add(R,{me:1,s:PLAN,kind:'send',tIn:tS,dur:.34,show:tS+.34});
  var tr=it.show+.2,gaps=[.36,.3,.26,0];
  YES.forEach(function(s,k){
    it=add(R,{me:0,who:k,s:s,kind:'recv',tIn:tr,dur:.28,show:tr});
    R.jumps.push({k:k,t0:tr+.05,T:.5});
    tr+=gaps[k];
  });
  TL.SUN=tr+.5;
  // воскресенье: черновик уже набирается
  t=typeInto(R,DRAFT,TL.SUN,.04,rnd);
  var tf=t+.35,fg=[.72,.62,.55,0];
  sp=add(R,{sep:'Today',time:'9:41 AM',tIn:tf,dur:.3,today:1});
  FLAKE.forEach(function(f,k){
    it=add(R,{me:0,who:f[0],s:f[1],kind:'recv',tIn:tf,dur:.3,show:tf});
    R.drops.push({k:f[0],t:tf+.16});
    tf+=fg[k];
  });
  TL.LAST=tf;
  t=deleteAll(R,DRAFT,tf+.95);
  t=typeInto(R,END,t+.18,.055,rnd);
  var tE=t+.16;R.ops.push({t:tE,s:''});R.sends.push(tE);
  it=add(R,{me:1,s:END,kind:'send',tIn:tE,dur:.34,show:tE+.34});
  TL.END=tE;
  R.tRoll=tE+1.1;R.end=R.tRoll+.4;
  var c=0;R.items.forEach(function(o){o.c=c;c+=o.h});R.HW=c;
  return R;
}

/* ─────────── шапка: лица группы ───────────
   Кто в шапке, решают прыжки и падения. Остальные съезжают к центру пружиной. */
function headerPlan(R){
  var ev=[];
  R.jumps.forEach(function(j){ev.push({t:j.t0+j.T-.1,k:j.k,on:1})});
  R.drops.forEach(function(d){ev.push({t:d.t+.14,k:d.k,on:0})});
  ev.sort(function(a,b){return a.t-b.t});
  // на старте недели шапка пустая (все лежат с прошлого воскресенья)
  var set=[],ep=[],last={};
  ev.forEach(function(e){
    if(e.on)set.push(e.k);else set.splice(set.indexOf(e.k),1);
    set.sort(function(a,b){return a-b});
    var pos={};set.forEach(function(k,i){pos[k]=SW/2+(i-(set.length-1)/2)*HSP});
    var d={};set.forEach(function(k){d[k]=last[k]==null?0:pos[k]-last[k];last[k]=pos[k]});
    ep.push({t:e.t,d:d,pos:pos,k:e.k,on:e.on});
  });
  return ep;
}
function headX(R,k,t){
  var x=null;
  for(var i=0;i<R.hdr.length;i++){
    var e=R.hdr[i];if(e.t>t)break;
    if(e.on&&e.k===k){x=e.pos[k];continue}
    if(x!=null&&e.d[k]!=null)x+=e.d[k]*(spring(t-e.t,.62,3.4)-1)+e.d[k];
  }
  return x;
}
// где окажется аватарка, когда сядет в шапку (новый ряд целиком)
function slotAt(R,k){for(var i=0;i<R.hdr.length;i++){var e=R.hdr[i];if(e.on&&e.k===k)return e.pos[k]}return SW/2}

/* ─────────── падение: круги, пол это поле ввода ───────────
   Считается один раз: от первого падения до конца недели, 480 Гц, хранится по 240 Гц. */
var SIM=null;
function simulate(R){
  var dt=1/480,G=4000,body=[],frames=[],hits=[],t0=R.drops[0].t-.02,t1=R.end+.02;
  var VX={0:-260,1:300,2:-70,3:170};
  PPL.forEach(function(p,k){body.push({k:k,on:0,x:0,y:HY,vx:0,vy:0,a:0,w:0,sq:0,sv:0,lastHit:-9})});
  var n=Math.ceil((t1-t0)/dt);
  for(var s=0;s<=n;s++){
    var t=t0+s*dt;
    R.drops.forEach(function(d){var b=body[d.k];if(!b.on&&t>=d.t){b.on=1;b.x=headX(R,d.k,d.t);b.y=HY;b.vx=VX[d.k];b.vy=-240;b.w=VX[d.k]/AR*.6}});
    body.forEach(function(b){
      if(!b.on)return;
      b.vy+=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
      // сплющивание пружиной
      b.sv+=(-900*b.sq-26*b.sv)*dt;b.sq+=b.sv*dt;
    });
    for(var it=0;it<4;it++){
      body.forEach(function(b){
        if(!b.on)return;
        var pen=b.y+AR-FLOOR;
        if(pen>0){
          b.y-=pen;
          if(b.vy>0){
            if(b.vy>140&&t-b.lastHit>.06){hits.push([t,b.k,b.vy,b.x]);b.sv+=b.vy*.0042;b.lastHit=t}
            b.vy=b.vy>90?-b.vy*.44:0;
          }
          b.vx*=Math.exp(-2.6*dt);b.w=mix(b.w,b.vx/AR,.35);
        }
        if(b.x-AR<8){b.x=8+AR;if(b.vx<0)b.vx=-b.vx*.4}
        if(b.x+AR>SW-8){b.x=SW-8-AR;if(b.vx>0)b.vx=-b.vx*.4}
      });
      for(var i=0;i<body.length;i++)for(var j=i+1;j<body.length;j++){
        var A=body[i],B=body[j];if(!A.on||!B.on)continue;
        var dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy),m=AR*2-d;
        if(m>0&&d>1e-6){
          var nx=dx/d,ny=dy/d;A.x-=nx*m/2;A.y-=ny*m/2;B.x+=nx*m/2;B.y+=ny*m/2;
          var rv=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;
          if(rv<0){
            var jn=-(1.3)*rv/2;A.vx-=jn*nx;A.vy-=jn*ny;B.vx+=jn*nx;B.vy+=jn*ny;
            if(-rv>160&&t-A.lastHit>.06){hits.push([t,A.k,-rv*.7,(A.x+B.x)/2]);A.lastHit=t;B.lastHit=t}
            // касание крутит обоих в разные стороны
            var tv=(B.vx-A.vx)*-ny+(B.vy-A.vy)*nx;A.w+=tv*.004;B.w+=tv*.004;
          }
        }
      }
    }
    if(s%2===0)frames.push(body.map(function(b){return b.on?[b.x,b.y,b.a,b.sq]:null}));
  }
  return{t0:t0,dt:dt*2,frames:frames,hits:hits,rest:body.map(function(b){return[b.x,b.y,b.a]})};
}
function simAt(k,t){
  var f=(t-SIM.t0)/SIM.dt,i=Math.floor(f),u=f-i,F=SIM.frames;
  if(i<0)return null;if(i>=F.length-1){var z=F[F.length-1][k];return z}
  var a=F[i][k],b=F[i+1][k];if(!a||!b)return a||b;
  return[mix(a[0],b[0],u),mix(a[1],b[1],u),mix(a[2],b[2],u),mix(a[3],b[3],u)];
}

/* состояние аватарки в момент t: лежит, прыгает, сидит в шапке, падает */
function avatarAt(R,k,t){
  var J=R.jumps[k],D=null;R.drops.forEach(function(d){if(d.k===k)D=d});
  var rest=SIM.rest[k];
  if(t<J.t0)return{x:rest[0],y:rest[1],a:rest[2],sx:1,sy:1,ay:1};
  if(t<J.t0+J.T){
    var u=(t-J.t0)/J.T,x1=slotAt(R,k),y0=rest[1],Dy=HY-y0,H=16,b=-2*(H-Dy)-2*Math.sqrt(H*(H-Dy)),c=Dy-b;
    var a1=2*Math.PI*Math.round(rest[2]/(2*Math.PI))-2*Math.PI;
    // отрыв: короткое приседание перед прыжком
    var crouch=u<.08?Math.sin(Math.PI*u/.08)*.16:0;
    return{x:mix(rest[0],x1,u),y:y0+b*u+c*u*u,a:mix(rest[2],a1,eio(u)),sx:1+crouch-.08*Math.sin(Math.PI*u),sy:1-crouch+.1*Math.sin(Math.PI*u),ay:1};
  }
  if(t<D.t){
    var land=t-(J.t0+J.T),q=Math.exp(-land*7)*Math.sin(land*34)*.14;
    // перед падением аватарку трясёт
    var sh=seg(t,D.t-.2,D.t),jx=Math.sin(t*95)*3*sh;
    return{x:headX(R,k,t)+jx,y:HY,a:0,sx:1+q+.06*sh,sy:1-q+.06*sh,ay:0};
  }
  var s=simAt(k,t);if(!s)return{x:headX(R,k,D.t),y:HY,a:0,sx:1,sy:1,ay:0};
  return{x:s[0],y:s[1],a:s[2],sx:1+s[3],sy:1-s[3],ay:1};
}

/* ─────────── прокрутка ─────────── */
function prog(it,t){
  if(it.tIn==null||it.tIn===-Infinity)return 1;
  var x=seg(t,it.tIn,it.tIn+it.dur);return 1-Math.pow(1-x,2.4);
}
function scrollP(R,t){var P=0;for(var i=0;i<R.items.length;i++)P+=R.items[i].h*prog(R.items[i],t);return P}

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
function nameLbl(x,y,s,op){
  ctx.save();ctx.globalAlpha*=op;setFont(12.5,400,0);ctx.fillStyle=COL.sub;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(s,x+13,y);ctx.restore();
}
function sepText(y,head,time,op){
  if(op<=.004)return;
  ctx.save();ctx.globalAlpha=op;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=COL.sub;
  setFont(13,600,0);var w1=ctx.measureText(head).width;setFont(13,400,0);var rest=' '+time,w2=ctx.measureText(rest).width,x=SW/2-(w1+w2)/2;
  setFont(13,600,0);ctx.fillText(head,x,y);setFont(13,400,0);ctx.fillText(rest,x+w1,y);
  ctx.restore();
}
function drawSep(y,it,R,t){
  var ty=y+25;
  if(!it.today){sepText(ty,it.sep,it.time,R?prog(it,t):1);return}
  if(!R){sepText(ty,'Sunday',it.time,1);return}
  var a=prog(it,t);if(a<=.004)return;
  var r0=1-sm(seg(t,R.tRoll,R.tRoll+.16)),r1=sm(seg(t,R.tRoll+.18,R.tRoll+.34));
  sepText(ty,'Today',it.time,a*r0);sepText(ty,'Sunday',it.time,a*r1);
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
    if(it.sep){if(!R||t>=it.tIn)drawSep(y,it,R,t);continue}
    var top=y+GX+(it.me?0:LBL),x=it.me?MEX-it.w:RX;
    if(!R){if(!it.me)nameLbl(x,top-9,PPL[it.who].n,1);textMsg(x,top,it.s,it.me,1);continue}
    if(t<it.tIn)continue;
    if(it.kind==='send'){if(t<it.show)FLYS.push([it,top]);else textMsg(x,top,it.s,1,1);continue}
    nameLbl(x,top-9,PPL[it.who].n,sm(seg(t,it.show,it.show+.12)));
    popMsg(x,top,it,t-it.show);
  }
}
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
function drawHeader(){
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,TOPY);
  ctx.fillStyle=COL.line;ctx.fillRect(0,TOPY-.5,SW,.5);
  setFont(13,400,-.1);ctx.textBaseline='middle';ctx.textAlign='left';
  var w=ctx.measureText(GROUP).width,x=SW/2-(w+10)/2,y=HY+AR+17;
  ctx.fillStyle=COL.ink;ctx.fillText(GROUP,x,y);
  ctx.strokeStyle=COL.sub;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(x+w+4,y-4);ctx.lineTo(x+w+8,y);ctx.lineTo(x+w+4,y+4);ctx.stroke();
}
function drawAvatar(p,s){
  ctx.save();
  // сплющивание по вертикали мира, от точки касания, потом поворот вокруг центра
  var by=s.y+AR*s.ay;
  ctx.translate(s.x,by);ctx.scale(s.sx,s.sy);ctx.translate(0,-AR*s.ay);ctx.rotate(s.a);
  ctx.fillStyle=COL.card;ctx.beginPath();ctx.arc(0,0,AR+2.5,0,7);ctx.fill();
  ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(0,0,AR,0,7);ctx.fill();
  setFont(18,600,0);ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(p.i,0,1);
  ctx.restore();
}

function render(R,t){
  ctx.setTransform(KDPR,0,0,KDPR,0,0);
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,SH);
  var P=scrollP(R,t);FLYS.length=0;
  drawItems(R.items,0,P,t,R);
  var base=0;
  for(var w=0;w<R.prev.length;w++){base-=R.prev[w].HW;if(CB+base+R.prev[w].HW-P<TOPY-30)break;drawItems(R.prev[w].items,base,P,t,null)}
  drawComposer(R,t);
  drawHeader();
  // в шапке левые ниже правых, как стопка; в воздухе и на полу поверх всего
  var st=PPL.map(function(p,k){return[k,avatarAt(R,k,t)]});
  st.sort(function(a,b){return(b[1].ay-a[1].ay)||(a[0]-b[0])});
  st.reverse().forEach(function(q){drawAvatar(PPL[q[0]],q[1])});
  // отправленное летит поверх лежащих
  FLYS.forEach(function(f){drawFly(f[0],f[1],t)});
  setClock(t>=TL.SUN&&t<R.end?'9:41':'8:14');
}
var clockEl=document.getElementById('clock'),clockS='';
function setClock(s){if(s!==clockS){clockS=s;clockEl.textContent=s}}

/* ─────────── звук ─────────── */
function panX(x){return clamp((x/SW-.5)*.8,-.6,.6)}
function buildEvents(R){
  var E=[],lastK=-9;
  R.ops.forEach(function(o,i){
    if(o.ch!=null){E.push([o.t,'key',i,clamp((o.t-lastK)/.07,.3,1)]);lastK=o.t}
    else if(o.del)E.push([o.t,'del',i]);
  });
  R.sends.forEach(function(ts){E.push([ts-.04,'press']);E.push([ts+.01,'send'])});
  R.items.forEach(function(it){if(it.kind==='recv')E.push([it.show,'recv',-.25])});
  R.jumps.forEach(function(j){
    var x0=SIM.rest[j.k][0];
    E.push([j.t0,'hop',panX(x0)]);E.push([j.t0+.02,'up',panX(x0),j.T]);E.push([j.t0+j.T-.02,'plop',panX(slotAt(R,j.k))]);
  });
  R.drops.forEach(function(d){
    var x=headX(R,d.k,d.t),first=null;
    SIM.hits.forEach(function(h){if(h[1]===d.k&&first==null)first=h[0]});
    E.push([d.t-.2,'shiver',panX(x)]);E.push([d.t,'pop',panX(x)]);
    E.push([d.t+.03,'down',panX(x),(first||d.t+.5)-d.t-.03]);
  });
  SIM.hits.forEach(function(h){E.push([h[0],'bonk',panX(h[3]),clamp(h[2]/1100,.15,1)])});
  E.sort(function(a,b){return a[0]-b[0]});
  return E;
}
function fire(R,u0,u1){R.events.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)})}
function fireAuto(u0,u1){
  if(u1<u0){fire(AUTO,u0,CYCLE+1e-9);u0=-1e-9}
  fire(AUTO,u0,u1);
}

var AUTO=null,CYCLE=9;
var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),S=1;
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function restart(){Sound.start();Sound.stopAll();paused=false;acc=TL.SUN-.2;lastU=uNow()}
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();restart()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();restart()}
});

function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(!paused)acc+=dt;
  var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
  render(AUTO,u);
  if(!REC)fireAuto(lastU,u);
  lastU=u;
  if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=restart;
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
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),sub2:g('--sub-2'),line:g('--line'),blue:g('--blue'),recv:g('--recv'),plus:g('--plus'),
       blueC:hexc(g('--blue')),recvC:hexc(g('--recv')),inkC:hexc(g('--ink'))};
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

window.__seek=function(t){paused=true;acc=t;render(AUTO,uNow())};
window.__renderAudio=function(){return Sound.renderLoop(AUTO.events,CYCLE,PH+1/60,CYCLE)};

function boot(){
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();
  AUTO=buildRound();CYCLE=AUTO.end;
  AUTO.hdr=headerPlan(AUTO);
  SIM=simulate(AUTO);
  AUTO.events=buildEvents(AUTO);
  var wk={items:AUTO.items,HW:AUTO.HW};AUTO.prev=[wk,wk,wk];
  TL.CYCLE=CYCLE;TL.ROLL=AUTO.tRoll;TL.DROPS=AUTO.drops.map(function(d){return+d.t.toFixed(3)});TL.JUMPS=AUTO.jumps.map(function(j){return+j.t0.toFixed(3)});
  TL.REST=SIM.rest.map(function(r){return r.map(function(v){return+v.toFixed(1)})});TL.HITS=SIM.hits.length;
  window.__TL=TL;
  addEventListener('resize',fit);
  if(!REC&&!STILL)acc=TL.SUN-.2;
  render(AUTO,REC?((PH%CYCLE)+CYCLE)%CYCLE:uNow());
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
