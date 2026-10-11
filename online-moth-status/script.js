/* ─────────── Online ───────────
   Понедельник, 8:59. Ставлю себе Active, и зелёная точка статуса загорается как фонарь
   над крыльцом. Сообщения слетаются со всех краёв, как мотыльки: кружат спиралью,
   ныряют и бьются о точку. Курсор пробивается через рой и ставит Away. Точка гаснет,
   рой на секунду зависает и разлетается. Тишина, сверчки. Потом прилетает одно,
   крупное и медленное: «you there?», садится рядом и стучит в серую точку три раза.
   Active. «sorry, just saw this». Рой возвращается весь сразу.
   Рой считается один раз при загрузке (шаг 1/240 с, хранится 120 Гц), кадр рисуется из одного t,
   поле 432 × 540 точек. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');
if(QS.get('theme'))document.documentElement.setAttribute('data-theme',QS.get('theme'));

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return Math.sin(Math.PI*seg(t,a,b))}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var TAU=Math.PI*2;

var SW=432,SH=540,MB=25;
var FONT='system-ui,-apple-system,"SF Pro Display","SF Pro Text",sans-serif';
var ASK='you there?',LIE='sorry, just saw this';

/* ─────────── сценарий петли ───────────
   ON свет включён кликом, OFF выключен, B полёт начальника, KN стуки, RP ответ */
var TL={
  ON1:.5,OFF1:3.58,ON2:6.48,
  SP1:[.68,2.75],SP2:[6.62,7.3],
  CR:[4.45,4.8],
  B0:4.72,B1:5.5,KN:[5.66,5.91,6.16],RP:6.8,
  BLK0:8.45,BLK1:8.7,CYCLE:8.75
};
var CUR=[[0,372,505],[.18,372,505],[.46,152,388],[.62,157,393],[1.15,252,472],[2.9,266,480],[3.48,150,389],[3.74,159,396],[4.3,318,482],[5.98,322,488],[6.44,152,388],[6.7,161,395],[7.5,350,502],[8.75,372,505]];
var CLICKS=[TL.ON1,TL.OFF1,TL.ON2];

/* ─────────── раскладка ─────────── */
var CARD={x:56,y:108,w:320,h:346,r:14};
var AV={x:160,y:126,s:112,r:26};
var D={x:262,y:228},RD=15,RING=4;
var ITEM={x:64,y:368,w:304,h:36},ITEM2={x:64,y:406,w:304,h:36};
var BOSS={w:124,h:34,x:290,y:211};
var REPLY={h:34,y:253,right:414};

/* ─────────── свет ─────────── */
function onAt(t){return (t>=TL.ON1+.05&&t<TL.OFF1)||t>=TL.ON2+.05}
function flick(u){
  if(u<.05)return 0;if(u<.09)return 1;if(u<.15)return .12;if(u<.19)return 1;if(u<.25)return .35;
  return mix(.85,1,sm((u-.25)/.12));
}
function lampAt(t){
  if(t<TL.ON1)return 0;
  if(t<TL.OFF1)return flick(t-TL.ON1);
  if(t<TL.ON2)return 1-sm(seg(t,TL.OFF1+.02,TL.OFF1+.12));
  return flick(t-TL.ON2);
}

/* ─────────── рой ───────────
   Мотылёк держит к свету постоянный угол, поэтому идёт к нему спиралью.
   Угол дышит: когда он сжимается, мотылёк ныряет и бьётся о точку.
   Свет погас: секунда растерянности, потом наружу. */
var COLS=['#d4734a','#4a8fd4','#58a86b','#c9a23a','#9a6cc9','#d45a7a','#3aa6a0','#7d8a96','#c97a3a','#5a6fd4'];
function newMoth(R,t,live){
  var th=R()*TAU,cx=Math.cos(th),cy=Math.sin(th),m=40;
  // луч от точки до рамки кадра с запасом
  var kx=cx>0?(SW+m-D.x)/cx:cx<0?(-m-D.x)/cx:1e9,ky=cy>0?(SH+m-D.y)/cy:cy<0?(MB-m-D.y)/cy:1e9,k=Math.min(kx,ky);
  var x=D.x+cx*k,y=D.y+cy*k,a=Math.atan2(D.y-y,D.x-x)+(R()-.5)*1.1,sp=190+R()*70;
  return {t0:t,x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
    phi:(R()<.68?1:-1),ro:46+R()*80,sp:170+R()*110,df:.45+R()*.55,dp:R()*TAU,wf:.5+R()*.9,wp:R()*TAU,wp2:R()*TAU,
    s:1.2+R()*.36,ff:5+R()*2.2,fp:R()*TAU,col:COLS[Math.floor(R()*COLS.length)],
    w1:9+R()*5,w2:5+R()*5,off:-1,gone:false,
    X:[],Y:[],VX:[]};
}
function stepMoth(m,t,dt,on,hits){
  var dx=D.x-m.x,dy=D.y-m.y,r=Math.hypot(dx,dy)||1,dvx,dvy,k;
  var wan=.55*Math.sin(TAU*m.wf*t+m.wp)+.3*Math.sin(TAU*2.3*m.wf*t+m.wp2);
  if(on){
    m.off=-1;
    // орбита дышит: радиус то большой, то почти ноль, тогда мотылёк ныряет и бьётся
    var ux=dx/r,uy=dy/r,sg=m.phi>0?1:-1;
    var ro=m.ro*Math.max(0,.55+.6*Math.sin(TAU*m.df*t+m.dp));
    var vr=clamp((r-ro)*3.4,-170,300),vt=m.sp*(.45+.55*sm((r-18)/70))*(1-.6*sm((r-180)/160));
    dvx=ux*vr-uy*sg*vt+70*Math.cos(TAU*m.wf*t+m.wp)+40*Math.cos(TAU*2.3*m.wf*t+m.wp2);
    dvy=uy*vr+ux*sg*vt+70*Math.sin(TAU*m.wf*t+m.wp)+40*Math.sin(TAU*2.3*m.wf*t+m.wp2);
    k=4.6;
  }else{
    if(m.off<0)m.off=t;
    var a=t-m.off;
    if(a<.22){dvx=m.vx*.1+Math.cos(TAU*m.wf*3*t+m.wp)*40;dvy=m.vy*.1+Math.sin(TAU*m.wf*3*t+m.wp2)*40;k=8}
    else{
      var ho=Math.atan2(-dy,-dx)+m.phi*.3+wan*.9,sp2=mix(90,470,sm((a-.22)/.32));
      dvx=Math.cos(ho)*sp2;dvy=Math.sin(ho)*sp2-30;k=4;
    }
  }
  var q=Math.min(1,k*dt);m.vx+=(dvx-m.vx)*q;m.vy+=(dvy-m.vy)*q;
  var v=Math.hypot(m.vx,m.vy);if(v>380){m.vx*=380/v;m.vy*=380/v}
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  // удар о точку
  var mr=RD+RING+8*m.s;dx=m.x-D.x;dy=m.y-D.y;r=Math.hypot(dx,dy)||1;
  if(r<mr){
    var nx=dx/r,ny=dy/r,vn=m.vx*nx+m.vy*ny;
    if(vn<0){
      m.vx-=1.55*vn*nx;m.vy-=1.55*vn*ny;
      var tg=(m.phi>0?1:-1)*(40+Math.abs(vn)*.3);m.vx+=-ny*tg;m.vy+=nx*tg;
      if(hits&&-vn>35)hits.push([t,Math.min(1,-vn/260),nx,ny]);
    }
    m.x=D.x+nx*mr;m.y=D.y+ny*mr;
  }
  if(!on&&m.off>=0&&t-m.off>.4&&(m.x<-50||m.x>SW+50||m.y<MB-60||m.y>SH+50))m.gone=true;
}
function separate(arr){
  for(var i=0;i<arr.length;i++)for(var j=i+1;j<arr.length;j++){
    var a=arr[i],b=arr[j],dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
    if(d<576&&d>.01){d=Math.sqrt(d);var p=(24-d)*.22/d;a.x-=dx*p;a.y-=dy*p;b.x+=dx*p;b.y+=dy*p}
  }
}

var SIM={hz:240,st:120,M:[],H:[]};
function simulate(){
  var R=rng(4127),M=[],H=[],spawn=[];
  function wave(n,a,b,pw){for(var i=0;i<n;i++)spawn.push(a+(b-a)*Math.pow(i/(n-1),pw))}
  wave(30,TL.SP1[0],TL.SP1[1],1.45);wave(34,TL.SP2[0],TL.SP2[1],.75);
  var dt=1/SIM.hz,n=Math.ceil(TL.CYCLE*SIM.hz)+2,live=[],si=0;
  for(var i=0;i<=n;i++){
    var t=i*dt,on=onAt(t);
    while(si<spawn.length&&spawn[si]<=t){var m=newMoth(R,t);m.i0=i;M.push(m);live.push(m);si++}
    live.forEach(function(m){stepMoth(m,t,dt,on,H)});
    separate(live);
    live=live.filter(function(m){if(m.gone){m.i1=i;return false}return true});
    if(i%(SIM.hz/SIM.st)===0)live.forEach(function(m){m.X.push(m.x);m.Y.push(m.y);m.VX.push(m.vx)});
  }
  M.forEach(function(m){m.k0=Math.ceil(m.i0/(SIM.hz/SIM.st))});
  SIM.M=M;SIM.H=H;
}
function mothsAt(t){
  var out=[];
  SIM.M.forEach(function(m){
    var f=t*SIM.st-m.k0;if(f<0||f>m.X.length-1)return;
    var i=Math.floor(f),u=f-i,j=Math.min(i+1,m.X.length-1);
    out.push({x:mix(m.X[i],m.X[j],u),y:mix(m.Y[i],m.Y[j],u),vx:mix(m.VX[i],m.VX[j],u),m:m});
  });
  return out;
}
function dotKick(t,hits){
  // точка вздрагивает от ударов
  var x=0,y=0,sq=0;
  for(var i=hits.length-1;i>=0;i--){
    var d=t-hits[i][0];if(d<0)continue;if(d>.3)break;
    var e=hits[i][1]*Math.exp(-d*16);x-=hits[i][2]*e*3;y-=hits[i][3]*e*3;sq+=e;
  }
  return {x:x,y:y,sq:Math.min(1,sq)};
}

/* ─────────── начальник ─────────── */
function bez(a,b,c,d,u){var v=1-u;return v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d}
function bossAt(t){
  // центр пузыря, видимость, взмах, наклон, сдвиг стука
  var L={x:BOSS.x+BOSS.w/2,y:BOSS.y+BOSS.h/2};
  if(t<TL.B0)return null;
  var o={x:L.x,y:L.y,flap:0,tilt:0,a:1,kx:0};
  if(t<TL.B1){
    var u=eio(seg(t,TL.B0,TL.B1));
    o.x=bez(SW+90,SW-10,L.x+70,L.x,u);o.y=bez(70,40,L.y-60,L.y,u)+5*Math.sin(TAU*1.6*(t-TL.B0))*(1-u);
    o.flap=1-sm(seg(t,TL.B1-.18,TL.B1));
    var h=1/120,u2=eio(seg(t+h,TL.B0,TL.B1)),x2=bez(SW+90,SW-10,L.x+70,L.x,u2);o.tilt=clamp((x2-o.x)/h*.0011,-.3,.3);
  }else o.y+=1.2*Math.sin(TAU*.9*(t-TL.B1));
  TL.KN.forEach(function(k){var d=t-k;if(d>-.08&&d<.16)o.kx-=9*(d<0?sm((d+.08)/.08):1-sm(d/.16))});
  // после ответа пузырь чуть отъезжает, освобождая место
  return o;
}
function knockAt(t){var e=0;TL.KN.forEach(function(k){var d=t-k;if(d>=0)e+=Math.exp(-d*20)*Math.cos(TAU*9*d)});return e}

/* ─────────── курсор ─────────── */
function cursorBase(t){
  for(var i=0;i<CUR.length-1;i++)if(t<CUR[i+1][0]){
    var a=CUR[i],b=CUR[i+1],u=eio(seg(t,a[0],b[0]));
    return {x:mix(a[1],b[1],u),y:mix(a[2],b[2],u)};
  }
  var z=CUR[CUR.length-1];return {x:z[1],y:z[2]};
}

/* ─────────── состояние кадра ─────────── */
function stateAt(t){
  var s={t:t};
  s.lamp=lampAt(t);
  s.on=t>=TL.ON2?2:t>=TL.OFF1?1:t>=TL.ON1?2:1; // 2 active, 1 away
  if(t<TL.ON1)s.on=1;
  s.moths=mothsAt(t);
  s.kick=dotKick(t,SIM.H);
  var kn=knockAt(t);s.kick.x+=-2.4*kn;s.kick.sq=Math.min(1,s.kick.sq+Math.abs(kn)*.6);
  s.boss=bossAt(t);
  s.reply=t>=TL.RP?seg(t,TL.RP,TL.RP+.5):-1;
  // курсор: путь плюс толчки от мотыльков
  var c=cursorBase(t),jx=0,jy=0;
  c.x+=1.6*Math.sin(TAU*.4*t+1)+1.2*Math.sin(TAU*.23*t);c.y+=1.2*Math.sin(TAU*.31*t+2);
  s.moths.forEach(function(o){var dx=c.x+5-o.x,dy=c.y+8-o.y,d=Math.hypot(dx,dy);if(d<26&&d>.1){var p=(26-d)/26;jx+=dx/d*p*7;jy+=dy/d*p*7}});
  c.x+=clamp(jx,-10,10);c.y+=clamp(jy,-10,10);
  s.cur=c;s.press=0;CLICKS.forEach(function(k){s.press=Math.max(s.press,bump(t,k-.02,k+.1))});
  s.hover=c.x>ITEM.x&&c.x<ITEM.x+ITEM.w&&c.y>ITEM.y&&c.y<ITEM.y+ITEM.h?1:0;
  s.clock=t<TL.OFF1?{from:[1,12,8,59],to:[1,12,9,0],r0:TL.ON1+.06,t:t}:{from:[1,12,9,0],to:[1,12,9,1],r0:TL.OFF1+.06,t:t};
  s.black=t>=TL.BLK0?sm(seg(t,TL.BLK0,TL.BLK1)):1-sm(seg(t,0,.14));
  return s;
}

/* ─────────── канвас ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),frameEl=document.getElementById('frame');
var K=2,S=1,COL={};
function M0(){ctx.setTransform(K,0,0,K,0,0)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
var CURSOR=new Path2D('M0 0 L0 17.2 L4.1 13.3 L6.9 19.9 L9.6 18.8 L6.9 12.3 L12.4 12.3 Z');
function drawCursor(c,press,rot){
  M0();ctx.translate(c.x,c.y);ctx.rotate(rot);var k=1.55*(1-.1*press);ctx.scale(k,k);
  ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.lineWidth=2.1;ctx.stroke(CURSOR);
  ctx.fillStyle='#000';ctx.fill(CURSOR);
}

/* строка меню: часы перекручиваются барабаном по разрядам справа налево */
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function clockTokens(c){
  var h=c[2]%12||12,ap=c[2]<12?'AM':'PM',m=c[3];
  return [DAYS[c[0]],' ','Oct',' ',String(c[1])[0],String(c[1])[1],'  ',h>=10?'1':'',String(h%10),':',String(Math.floor(m/10)),String(m%10),' ',ap];
}
function digitSeq(a,b){var s=[a],x=+a,y=+b,n=((y-x)%10+10)%10;for(var i=1;i<=n;i++)s.push(String((x+i)%10));return s}
function drawMenubar(s){
  M0();
  ctx.fillStyle=COL.mb;ctx.fillRect(0,0,SW,MB);
  ctx.fillStyle=COL.mbLine;ctx.fillRect(0,MB-.5,SW,.5);
  ctx.fillStyle=COL.mbInk;ctx.textBaseline='alphabetic';ctx.textAlign='left';
  ctx.font='15px '+FONT;ctx.fillText('',13,17.5);
  ctx.font='600 12.5px '+FONT;ctx.fillText('Chat',34,17);
  var x=34+ctx.measureText('Chat').width+15;ctx.font='12.5px '+FONT;
  ['File','Edit','View'].forEach(function(w){ctx.fillText(w,x,17);x+=ctx.measureText(w).width+15});
  var c=s.clock,A=clockTokens(c.from),B=clockTokens(c.to),n=A.length,T=c.t;
  var dw=0;for(var d=0;d<10;d++)dw=Math.max(dw,ctx.measureText(String(d)).width);
  var xr=SW-12;
  for(var i=n-1;i>=0;i--){
    var a=A[i],b=B[i],isD=/^\d?$/.test(a)&&/^\d?$/.test(b)&&(a+b).length>0;
    var wa=a===''?0:(isD?dw:ctx.measureText(a).width),wb=b===''?0:(isD?dw:ctx.measureText(b).width);
    var st=c.r0+(n-1-i)*.03,r=a===b?0:eio(seg(T,st,st+.34));
    var wnow=mix(wa,wb,r);xr-=wnow;
    if(a===b||r<=0||r>=1){
      var str=r>=1?b:a;if(str!==''){ctx.fillStyle=COL.mbInk;ctx.textAlign=isD?'center':'left';ctx.fillText(str,isD?xr+wnow/2:xr,17);ctx.textAlign='left'}
    }else{
      var seq=isD&&a!==''&&b!==''?digitSeq(a,b):[a,b],pos=r*(seq.length-1),lh=15;
      ctx.save();ctx.beginPath();ctx.rect(xr-1,3,wnow+2,MB-6);ctx.clip();
      for(var j=Math.max(0,Math.floor(pos)-1);j<=Math.min(seq.length-1,Math.ceil(pos)+1);j++){
        var off=(j-pos)*lh;if(Math.abs(off)>lh*1.2||seq[j]==='')continue;
        ctx.globalAlpha=1-Math.min(1,Math.abs(off)/lh)*.6;ctx.fillStyle=COL.mbInk;
        ctx.textAlign=isD?'center':'left';ctx.fillText(seq[j],isD?xr+wnow/2:xr,17+off);ctx.textAlign='left';
      }
      ctx.restore();ctx.globalAlpha=1;
    }
  }
  var bx=xr-16-25;
  ctx.strokeStyle=COL.mbInk;ctx.globalAlpha=.45;ctx.lineWidth=1;rr(bx+.5,8.5,22,10,3);ctx.stroke();
  rr(bx+23.5,11.5,1.6,4,1);ctx.fillStyle=COL.mbInk;ctx.fill();ctx.globalAlpha=1;
  rr(bx+2,10,15.5,7,1.8);ctx.fill();
  var wx=bx-13,wy=17.6;ctx.strokeStyle=COL.mbInk;ctx.lineWidth=1.7;ctx.lineCap='round';
  [3.6,6.8].forEach(function(r){ctx.beginPath();ctx.arc(wx,wy,r,-Math.PI*.74,-Math.PI*.26);ctx.stroke()});
  ctx.beginPath();ctx.arc(wx,wy-.2,1.3,0,TAU);ctx.fill();ctx.lineCap='butt';
}

/* карточка профиля, как меню статуса в рабочем чате */
function drawCard(s){
  M0();
  ctx.save();ctx.shadowColor=COL.cardSh;ctx.shadowBlur=30;ctx.shadowOffsetY=10;
  rr(CARD.x,CARD.y,CARD.w,CARD.h,CARD.r);ctx.fillStyle=COL.card;ctx.fill();ctx.restore();
  rr(CARD.x+.5,CARD.y+.5,CARD.w-1,CARD.h-1,CARD.r);ctx.strokeStyle=COL.hair;ctx.lineWidth=1;ctx.stroke();
  // аватар по умолчанию: силуэт
  ctx.save();rr(AV.x,AV.y,AV.s,AV.s,AV.r);ctx.clip();
  ctx.fillStyle=COL.av;ctx.fillRect(AV.x,AV.y,AV.s,AV.s);
  ctx.fillStyle=COL.avInk;ctx.beginPath();ctx.arc(AV.x+AV.s/2,AV.y+AV.s*.4,AV.s*.18,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(AV.x+AV.s/2,AV.y+AV.s*1.02,AV.s*.36,AV.s*.31,0,0,TAU);ctx.fill();
  ctx.restore();
  // имя полосой, статус словом
  var cx=CARD.x+CARD.w/2;
  rr(cx-52,302,104,11,5.5);ctx.fillStyle=COL.bar;ctx.fill();
  var act=s.on===2,lbl=act?'Active':'Away';
  ctx.font='14px '+FONT;var tw=ctx.measureText(lbl).width,x0=cx-(tw+14)/2;
  ctx.beginPath();ctx.arc(x0+4.5,334,4.5,0,TAU);
  if(act){ctx.fillStyle=COL.green;ctx.fill()}else{ctx.strokeStyle=COL.awayRing;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x0+4.5,334,3.8,0,TAU);ctx.stroke()}
  ctx.fillStyle=COL.sub;ctx.textBaseline='middle';ctx.fillText(lbl,x0+14,334.5);
  ctx.fillStyle=COL.hair;ctx.fillRect(CARD.x+16,358,CARD.w-32,1);
  // пункты меню
  if(s.hover){rr(ITEM.x+4,ITEM.y,ITEM.w-8,ITEM.h,7);ctx.fillStyle=COL.blue;ctx.fill()}
  ctx.font='15px '+FONT;ctx.fillStyle=s.hover?'#fff':COL.ink;
  ctx.fillText(act?'Set yourself as away':'Set yourself as active',ITEM.x+18,ITEM.y+ITEM.h/2+.5);
  ctx.fillStyle=COL.ink;ctx.fillText('Pause notifications',ITEM2.x+18,ITEM2.y+ITEM2.h/2+.5);
  ctx.strokeStyle=COL.sub2;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
  var ax=ITEM2.x+ITEM2.w-22,ay=ITEM2.y+ITEM2.h/2;ctx.beginPath();ctx.moveTo(ax-3,ay-5);ctx.lineTo(ax+2,ay);ctx.lineTo(ax-3,ay+5);ctx.stroke();ctx.lineCap='butt';
  ctx.textBaseline='alphabetic';
}

/* точка статуса и её свет */
function drawLamp(s){
  var L=s.lamp;if(L<=0)return;
  M0();ctx.save();
  if(COL.dark)ctx.globalCompositeOperation='lighter';
  [[150,.16],[70,.22]].forEach(function(p){
    var g=ctx.createRadialGradient(D.x,D.y,RD,D.x,D.y,p[0]);
    g.addColorStop(0,COL.glow+(p[1]*L*COL.glowK)+')');g.addColorStop(1,COL.glow+'0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(D.x,D.y,p[0],0,TAU);ctx.fill();
  });
  ctx.restore();
}
function drawDot(s){
  var k=s.kick,x=D.x+k.x,y=D.y+k.y,sq=k.sq;
  M0();ctx.translate(x,y);ctx.scale(1+.08*sq,1-.08*sq);
  ctx.beginPath();ctx.arc(0,0,RD+RING,0,TAU);ctx.fillStyle=COL.card;ctx.fill();
  // выключено: пустое кольцо; включено: зелёная заливка
  ctx.beginPath();ctx.arc(0,0,RD-1.6,0,TAU);ctx.strokeStyle=COL.awayRing;ctx.lineWidth=3.2;ctx.stroke();
  if(s.lamp>0){
    ctx.globalAlpha=Math.min(1,s.lamp*1.15);ctx.beginPath();ctx.arc(0,0,RD,0,TAU);ctx.fillStyle=COL.green;ctx.fill();
    ctx.globalAlpha=s.lamp*.55;ctx.beginPath();ctx.arc(-3.5,-4,4.2,0,TAU);ctx.fillStyle=COL.greenHi;ctx.fill();
    ctx.globalAlpha=1;
  }
}

/* мотылёк: маленький пузырь сообщения, машет «крыльями» по вертикали */
function drawMoth(o,t){
  var m=o.m,fl=Math.abs(Math.sin(Math.PI*m.ff*t+m.fp)),tilt=clamp(o.vx*.0015,-.45,.45)+.12*Math.sin(TAU*m.wf*2*t+m.wp);
  M0();ctx.translate(o.x,o.y);ctx.rotate(tilt);ctx.scale(m.s*(1+.06*(1-fl)),m.s*(.5+.5*fl));
  ctx.shadowColor=COL.mothSh;ctx.shadowBlur=COL.dark?0:4;ctx.shadowOffsetY=COL.dark?0:1;
  ctx.beginPath();ctx.roundRect(-13,-9,26,18,9);
  ctx.moveTo(-5,8.6);ctx.quadraticCurveTo(-11,9.6,-15,9.4);ctx.quadraticCurveTo(-11.5,7,-11,2);ctx.closePath();
  ctx.fillStyle=COL.moth;ctx.fill();ctx.shadowColor='transparent';
  if(!COL.dark){ctx.strokeStyle=COL.mothLine;ctx.lineWidth=.6;ctx.stroke()}
  ctx.beginPath();ctx.arc(-6.5,0,3.4,0,TAU);ctx.fillStyle=m.col;ctx.fill();
  ctx.fillStyle=COL.mothBar;rr(-1.5,-3.6,m.w1,2.6,1.3);ctx.fill();rr(-1.5,1.2,m.w2,2.6,1.3);ctx.fill();
}

// пузырь в текущей системе координат
function drawBubble(x,y,w,h,txt,mine,av,a){
  ctx.globalAlpha=a;
  ctx.save();if(!COL.dark){ctx.shadowColor=COL.mothSh;ctx.shadowBlur=8;ctx.shadowOffsetY=2}
  ctx.beginPath();ctx.roundRect(x,y,w,h,h/2);
  // хвостик как в мессенджере
  var e=mine?x+w:x,sx=mine?1:-1;
  ctx.moveTo(e-sx*16,y+h-.5);ctx.quadraticCurveTo(e-sx*3,y+h+.5,e+sx*4.5,y+h+.5);ctx.quadraticCurveTo(e-sx*1.5,y+h-4,e-sx*3,y+h-13);ctx.closePath();
  ctx.fillStyle=mine?COL.blue:COL.moth;ctx.fill();ctx.restore();
  if(!mine&&!COL.dark){ctx.strokeStyle=COL.mothLine;ctx.lineWidth=.6;ctx.stroke()}
  var tx=x+14;
  if(av){ctx.beginPath();ctx.arc(x+h/2,y+h/2,10,0,TAU);ctx.fillStyle='#c4603d';ctx.fill();
    ctx.fillStyle='#fff';ctx.font='600 11px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('D',x+h/2,y+h/2+.5);tx=x+h+4}
  ctx.font='15px '+FONT;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=mine?'#fff':COL.mothInk;
  ctx.fillText(txt,tx,y+h/2+.5);ctx.textBaseline='alphabetic';ctx.globalAlpha=1;
}
function drawBoss(s,t){
  var b=s.boss;if(!b)return;
  var w=BOSS.w,h=BOSS.h,fl=Math.abs(Math.sin(Math.PI*3.2*t)),f=b.flap;
  M0();ctx.translate(b.x+b.kx,b.y);ctx.rotate(b.tilt);ctx.scale(1,1-f*.42*(1-fl));
  drawBubble(-w/2,-h/2,w,h,ASK,false,true,b.a);
}
function drawReply(s){
  if(s.reply<0)return;
  var u=s.reply,sc=u<1?1+(-Math.exp(-u*9)*Math.cos(u*16)):1;
  ctx.font='15px '+FONT;var w=Math.ceil(ctx.measureText(LIE).width)+28,x=REPLY.right-w,y=REPLY.y,h=REPLY.h;
  M0();ctx.translate(x+w,y+h/2);ctx.scale(sc,sc);ctx.translate(-(x+w),-(y+h/2));
  drawBubble(x,y,w,h,LIE,true,false,c01(u*6));
}

function draw(s,rot){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=COL.bg;ctx.fillRect(0,0,cv.width,cv.height);
  drawCard(s);
  drawLamp(s);
  drawDot(s);
  var t=s.t;
  s.moths.forEach(function(o){drawMoth(o,t)});
  ctx.shadowColor='transparent';
  drawBoss(s,t);
  drawReply(s);
  drawMenubar(s);
  drawCursor(s.cur,s.press,rot);
  if(s.black>0){M0();ctx.globalAlpha=s.black;ctx.fillStyle='#000';ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
  ctx.setTransform(1,0,0,1,0,0);
}
function tiltAt(t){var h=1/120,a=cursorBase(t-h),b=cursorBase(t+h);return clamp(-(b.x-a.x)/(2*h)*.00035,-.25,.25)}
function render(t){draw(stateAt(t),tiltAt(t))}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  CLICKS.forEach(function(c,k){EVENTS.push([c,'click',k])});
  EVENTS.push([TL.ON1+.05,'on'],[TL.ON2+.05,'on'],[TL.OFF1+.02,'off']);
  EVENTS.push([TL.ON1+.06,'roll'],[TL.OFF1+.06,'roll']);
  // рой: шорох крыльев по числу мотыльков и их скорости, гул лампы по яркости
  var hz=60,n=Math.ceil(TL.CYCLE*hz),g=[],lp=[],pan=[];
  for(var i=0;i<n;i++){
    var t=i/hz,ms=mothsAt(t),e=0,px=0;
    ms.forEach(function(o){var on=o.x>-10&&o.x<SW+10&&o.y>0&&o.y<SH+10?1:.3;e+=on;px+=(o.x/SW*2-1)*on});
    g.push(Math.min(1,e/26));pan.push(e?px/e:0);lp.push(lampAt(t));
  }
  EVENTS.push([0,'buzz',{hz:hz,g:g,pan:pan,lamp:lp}]);
  // удары о точку: не чаще раза в 22 мс, берём сильнейший
  var last=-1;SIM.H.forEach(function(h){if(h[0]-last>.022){EVENTS.push([h[0],'hit',h[1],h[2]]);last=h[0]}});
  EVENTS.push([TL.CR[0],'chirp'],[TL.CR[1],'chirp']);
  EVENTS.push([TL.B0,'flap',TL.B1-TL.B0]);
  TL.KN.forEach(function(k,i){EVENTS.push([k,'knock',i])});
  EVENTS.push([TL.RP,'pop']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,TL.CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev,u1-ev[0])});
}

/* ─────────── живой режим ───────────
   Клик по пункту меню переключает статус. Пока горит, мотыльки слетаются.
   Погасил и сидишь тихо: прилетает «you there?» и стучит, пока не включишь. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function toLocal(e){var r=frameEl.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH}}
function liveStart(){
  mode='live';document.documentElement.classList.add('live');
  LV={t:0,last:nowS(),on:false,onT:-9,offT:-9,M:[],R:rng(77),next:0,m:{x:330,y:480},quiet:-1,boss:-1,reply:-1,pressT:-9,hits:[]};
}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null;Sound.liveBuzz(0,0,0)}
frameEl.addEventListener('pointermove',function(e){if(mode==='live')LV.m=toLocal(e)});
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();LV.m=toLocal(e);
  var c=LV.m;LV.pressT=LV.t;Sound.play([0,'click',0]);
  if(c.x>ITEM.x&&c.x<ITEM.x+ITEM.w&&c.y>ITEM.y&&c.y<ITEM.y+ITEM.h){
    LV.on=!LV.on;
    if(LV.on){LV.onT=LV.t;Sound.play([0,'on']);if(LV.boss>=0&&LV.reply<0){LV.reply=LV.t;Sound.play([0,'pop'],-.3)}}
    else{LV.offT=LV.t;Sound.play([0,'off'])}
  }
});
function liveFrame(){
  var n=nowS(),V=LV,dt=Math.min(.05,n-V.last);V.last=n;
  var sub=Math.max(1,Math.round(dt*240)),h=dt/sub,on=V.on&&V.t-V.onT>.05;
  for(var q=0;q<sub;q++){
    V.t+=h;
    if(on&&V.M.length<38&&V.t>=V.next){V.M.push(newMoth(V.R,V.t));V.next=V.t+.05+V.R()*.12}
    var hits=[];V.M.forEach(function(m){stepMoth(m,V.t,h,on,hits)});separate(V.M);
    V.M=V.M.filter(function(m){return !m.gone});
    hits.forEach(function(x){V.hits.push(x);if(V.hits.length>40)V.hits.shift();Sound.play([0,'hit',x[1],x[2]])});
  }
  var t=V.t;
  // тишина без мотыльков: через 1.4 с прилетает начальник
  if(!V.on&&V.M.length===0){if(V.quiet<0)V.quiet=t;if(V.boss<0&&t-V.quiet>1.4){V.boss=t;Sound.play([0,'flap',TL.B1-TL.B0])}}else V.quiet=-1;
  if(V.reply>=0&&t-V.reply>2.6){V.boss=-1;V.reply=-1}
  var s={t:t,lamp:V.on?flick(t-V.onT):1-sm((t-V.offT-.02)/.1),on:V.on?2:1};
  s.moths=V.M.map(function(m){return {x:m.x,y:m.y,vx:m.vx,m:m}});
  s.kick=dotKick(t,V.hits);
  s.boss=null;s.reply=-1;
  if(V.boss>=0){
    var bt=t-V.boss,lt=TL.B0+bt;
    if(V.reply<0&&lt>TL.KN[2]+.3)lt=TL.KN[0]-.12+((lt-TL.KN[0]+.12)%(TL.KN[2]-TL.KN[0]+.55));
    if(V.reply<0){var kt=lt;TL.KN.forEach(function(k){if(Math.abs(kt-k)<dt*.5+.0001)Sound.play([0,'knock',0])})}
    s.boss=bossAt(lt);
    if(V.reply<0){var kn=knockAt(lt);s.kick.x+=-2.4*kn;s.kick.sq=Math.min(1,s.kick.sq+Math.abs(kn)*.6)}
    else{s.reply=seg(t-V.reply,0,.5);s.boss.kx=0}
    var fade=V.reply>=0?1-sm((t-V.reply-2.2)/.4):1;s.boss.a=fade;if(fade<1)s.reply=-1;
  }
  var c={x:V.m.x,y:V.m.y};
  s.cur=c;s.press=bump(t,V.pressT-.02,V.pressT+.1);
  s.hover=c.x>ITEM.x&&c.x<ITEM.x+ITEM.w&&c.y>ITEM.y&&c.y<ITEM.y+ITEM.h?1:0;
  s.clock={from:[1,12,9,0],to:[1,12,9,0],r0:0,t:0};s.black=0;
  var e=0;V.M.forEach(function(m){if(m.x>0&&m.x<SW&&m.y>0&&m.y<SH)e++});
  Sound.liveBuzz(Math.min(1,e/26),s.lamp,0);
  draw(s,0);
}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%TL.CYCLE)+TL.CYCLE)%TL.CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%TL.CYCLE)+TL.CYCLE)%TL.CYCLE;
    render(u);
    if(!REC&&!paused)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=TL.CYCLE-1e-6)window.__done=true;
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
    ?{dark:true,bg:'#141517',card:'#1f2023',cardSh:'rgba(0,0,0,.55)',hair:'rgba(255,255,255,.09)',ink:'#f2f2f4',sub:'rgba(235,235,245,.6)',sub2:'rgba(235,235,245,.35)',
      bar:'rgba(255,255,255,.2)',av:'#3a3c41',avInk:'#5d6067',green:'#2bac76',greenHi:'#7ee0b2',awayRing:'#8b8d93',blue:'#1d6fd6',
      glow:'rgba(43,172,118,',glowK:1,moth:'#ececf0',mothInk:'#111113',mothBar:'rgba(0,0,0,.2)',mothLine:'rgba(0,0,0,0)',mothSh:'rgba(0,0,0,0)',
      mb:'rgba(30,30,32,.9)',mbLine:'rgba(255,255,255,.07)',mbInk:'rgba(255,255,255,.9)'}
    :{dark:false,bg:'#f3f3f1',card:'#ffffff',cardSh:'rgba(0,0,0,.12)',hair:'rgba(0,0,0,.08)',ink:'#1d1c1d',sub:'rgba(60,60,67,.62)',sub2:'rgba(60,60,67,.35)',
      bar:'rgba(0,0,0,.12)',av:'#e3e3e6',avInk:'#c4c5ca',green:'#2bac76',greenHi:'#9bf0c8',awayRing:'#9a9ba0',blue:'#1264d6',
      glow:'rgba(43,172,118,',glowK:.75,moth:'#e9e9ec',mothInk:'#1d1c1d',mothBar:'rgba(0,0,0,.16)',mothLine:'rgba(0,0,0,.07)',mothSh:'rgba(0,0,0,.14)',
      mb:'rgba(246,246,246,.86)',mbLine:'rgba(0,0,0,.1)',mbInk:'rgba(0,0,0,.86)'};
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
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  simulate();buildEvents();
  addEventListener('resize',fit);
  if(QS.has('t'))window.__seek(+QS.get('t'));
  else render(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
