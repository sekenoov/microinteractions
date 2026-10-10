/* ─────────── Anyway ───────────
   Воскресенье, 8:47 вечера, экран блокировки. Под часами пилюля фокуса «Do Not Disturb».
   Пишет босс. Баннер падает сверху, пилюля подпрыгивает навстречу, растягивается стеклом
   и отбивает его вверх. Второй («?») уходит рикошетом вбок, на пилюле остаётся трещина.
   Пилюля дрожит. Третий приходит с пометкой TIME SENSITIVE: «quick question» пробивает её
   насквозь, осколки и луна сыплются на уведомление, которое садится на своё место.
   Смахиваешь его, осколки собираются обратно, и пилюля снова на посту.
   Всё рисуется на одном 2D-канвасе из одного t. Осколки считаются один раз при загрузке
   (твёрдые тела, 480 Гц), обратная сборка это та же запись задом наперёд. */

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
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,HY=304,SLOT=598,HORIZON=520;
var DATE='Sunday, October 11',TIME='8:47';
var FONT='system-ui,-apple-system,"SF Pro Display","SF Pro Text",sans-serif';
var MSG=[{body:'you around?',h:92},{body:'?',h:92},{body:'quick question',h:114,ts:true}];
var CARD={x:10,w:382,r:27};
var BTN=[[68,798],[334,798]],BTNR=25;
var H0=48,W0=200,MR=10,PFS=20; // пилюля: высота, ширина (уточняется по тексту), радиус луны, кегль

/* ─────────── сценарий петли ───────────
   c0 присел, j0 прыжок, tc касание, te отскок, tl приземление, yc/wc/hc поза в воздухе */
var TL={
  B:[
    {c0:.32,j0:.44,tc:.64,te:.77,tl:1.0,yc:198,wc:300,hc:32,dip:16,v:800,vy:-1000,vx:-80,vr:-.6,g:600,damp:7,fq:3.2,tilt:-.05},
    {c0:1.5,j0:1.62,tc:1.8,te:1.91,tl:2.13,yc:186,wc:318,hc:30,dip:20,v:1150,vy:-640,vx:950,vr:1.6,g:600,damp:6,fq:3.6,tilt:.12},
    {c0:2.95,j0:3.08,tc:3.24,ts:3.31,tl:3.5,yc:204,wc:322,hc:30,dip:12,v:2300}
  ],
  TREM0:2.55,FIN0:5.18,TOUCH:5.34,SW0:5.4,SW1:5.66,RW0:5.42,RW1:6.22,HOME1:6.44,
  Z0:3.6,Z1:4.1,ZO0:5.48,ZO1:6.3,CYCLE:7.0
};
// точки покоя: в живом режиме каждое касание проигрывает следующий отрезок
var SEGS=[0,1.42,2.55,TL.FIN0,TL.CYCLE];

/* ─────────── пилюля ─────────── */
function block(B,t,p){
  if(t<B.j0){var c=sm(seg(t,B.c0,B.j0));p.h=H0*(1-.2*c);p.w=W0*(1+.08*c);p.y=HY+(H0-p.h)/2;return}
  if(t<B.tc){
    var q=seg(t,B.j0,B.tc),e=eout(q),sp=sm(seg(q,.42,1));
    p.y=mix(HY+.1*H0,B.yc,e);p.w=W0*mix(.86,B.wc/W0,sp);p.h=H0*mix(1.24,B.hc/H0,sp);
    p.rot=B.tilt*sp*.4;return;
  }
  if(B.ts!=null){
    // третий: упирается, трещины бегут, и всё
    var s=seg(t,B.tc,B.ts);p.y=B.yc+B.dip*s;p.w=B.wc*(1+.05*s);p.h=B.hc*(1-.25*s);p.spread=s;return;
  }
  if(t<B.te){
    var sn=Math.sin(Math.PI*seg(t,B.tc,B.te));
    p.y=B.yc+B.dip*sn;p.w=B.wc*(1+.07*sn);p.h=B.hc*(1-.3*sn);p.rot=B.tilt*(.4+.6*sn);return;
  }
  if(t<B.tl){
    var u=seg(t,B.te,B.tl),r=sm(seg(u,0,.6));
    p.y=mix(B.yc,HY,u*u);p.w=mix(B.wc,W0*.92,r);p.h=mix(B.hc,H0*1.1,r);p.rot=B.tilt*(1-u);return;
  }
  var d=t-B.tl,k=Math.exp(-d*B.damp)*Math.cos(2*Math.PI*B.fq*d);
  p.h=H0*(1-.26*k);p.w=W0*(1+.16*k);p.y=HY+(H0-p.h)/2;
}
function pillAt(t){
  var p={x:201,y:HY,w:W0,h:H0,rot:0,crack:0,spread:0,broken:false};
  var B=TL.B;
  if(t>=B[1].tl)p.crack=1;
  if(t<B[1].c0){if(t>=B[0].c0)block(B[0],t,p);return p}
  if(t<B[2].c0){
    block(B[1],t,p);
    // дрожит перед третьим
    if(t>=TL.TREM0){var q=seg(t,TL.TREM0,B[2].c0),a=2.6*sm(q);p.x+=a*Math.sin(t*2*Math.PI*19);p.h*=1-.06*sm(q);p.y+=H0*.03*sm(q);p.rot=.025*sm(q)*Math.sin(t*2*Math.PI*13)}
    return p;
  }
  if(t<B[2].ts){
    block(B[2],t,p);
    if(t<B[2].j0){var g=1-seg(t,B[2].c0,B[2].j0);p.x+=1.8*g*Math.sin(t*2*Math.PI*19)}
    return p;
  }
  if(t<TL.RW1){p.broken=true;return p}
  // собралась в воздухе и падает домой
  var P=SHOT;
  p.crack=1-sm(seg(t,TL.RW1+.04,TL.RW1+.3));
  if(t<TL.HOME1){
    var u=seg(t,TL.RW1,TL.HOME1),r=sm(seg(u,.1,.7));
    p.y=mix(P.y,HY,u*u);p.w=mix(P.w,W0*.92,r);p.h=mix(P.h,H0*1.1,r);return p;
  }
  var d=t-TL.HOME1,k=Math.exp(-d*6.5)*Math.cos(2*Math.PI*3.4*d);
  p.h=H0*(1-.28*k);p.w=W0*(1+.17*k);p.y=HY+(H0-p.h)/2;
  return p;
}

/* ─────────── баннеры ─────────── */
function bannerAt(k,t){
  var B=TL.B[k],H=MSG[k].h,top=B.yc-B.hc/2-H,T0=-H-40,b0=B.tc-(top-T0)/B.v;
  if(t<b0)return null;
  var o={x:CARD.x,y:0,rot:0,sx:1,sy:1,h:H};
  if(t<B.tc){o.y=T0+B.v*(t-b0);return o}
  if(k<2){
    if(t<B.te){var P=pillAt(t);o.y=P.y-P.h/2-H;o.rot=P.rot*.5;return o}
    var d=t-B.te;o.y=top+B.vy*d+.5*B.g*d*d;o.x=CARD.x+B.vx*d;o.rot=B.tilt*.5+B.vr*d;
    if(d>.6)return null;return o;
  }
  if(t<B.ts){var Q=pillAt(t);o.y=Q.y-Q.h/2-H;return o}
  var ys=SHOT.y-SHOT.h/2-H,T=B.tl-B.ts;
  if(t<B.tl){var e=t-B.ts,a=2*(SLOT-ys-B.v*T)/(T*T);o.y=ys+B.v*e+.5*a*e*e;o.sy=1+.04*(e/T);o.sx=1-.015*(e/T);return o}
  o.y=SLOT;
  var dd=t-B.tl,kk=Math.exp(-dd*10)*Math.cos(2*Math.PI*5*dd);o.sy=1-.08*kk;o.sx=1+.03*kk;
  if(t>=TL.SW0){var q=seg(t,TL.SW0,TL.SW1);o.x=CARD.x-480*Math.pow(q,1.7);o.rot=-.04*q;if(q>=1)return null}
  return o;
}
function b0Of(k){var B=TL.B[k],H=MSG[k].h,top=B.yc-B.hc/2-H;return B.tc-(top+H+40)/B.v}

/* ─────────── осколки ─────────── */
var SHOT=null,SHARDS=[],MOON=null,SIM={hz:120,frames:[],hits:[],T:0};
function clipHalf(poly,a,b){
  var mx=(a.x+b.x)/2,my=(a.y+b.y)/2,nx=b.x-a.x,ny=b.y-a.y,out=[];
  for(var i=0;i<poly.length;i++){
    var p=poly[i],q=poly[(i+1)%poly.length],dp=(p.x-mx)*nx+(p.y-my)*ny,dq=(q.x-mx)*nx+(q.y-my)*ny;
    if(dp<=0)out.push(p);
    if((dp<0)!==(dq<0)){var s=dp/(dp-dq);out.push({x:p.x+(q.x-p.x)*s,y:p.y+(q.y-p.y)*s})}
  }
  return out;
}
function centroid(P){
  var a=0,cx=0,cy=0;
  for(var i=0;i<P.length;i++){var p=P[i],q=P[(i+1)%P.length],c=p.x*q.y-q.x*p.y;a+=c;cx+=(p.x+q.x)*c;cy+=(p.y+q.y)*c}
  a*=.5;return {x:cx/(6*a),y:cy/(6*a),a:Math.abs(a)};
}
function buildShards(){
  SHOT=pillAt(TL.B[2].ts-1e-4);
  var w=SHOT.w,h=SHOT.h,R=rng(29),seeds=[];
  // гуще у места удара (середина верхнего края)
  var tries=0;
  while(seeds.length<14&&tries<4000){
    tries++;
    var near=seeds.length<4,x=near?(R()-.5)*60:(R()-.5)*(w-8),y=near?-h/2+R()*h*.6:(R()-.5)*h;
    var ok=true;for(var i=0;i<seeds.length;i++)if(Math.hypot(seeds[i].x-x,(seeds[i].y-y)*1.6)<(near?13:19))ok=false;
    if(ok)seeds.push({x:x,y:y});
  }
  var rect=[{x:-w/2,y:-h/2},{x:w/2,y:-h/2},{x:w/2,y:h/2},{x:-w/2,y:h/2}];
  SHARDS=seeds.map(function(s,i){
    var P=rect.slice();
    seeds.forEach(function(o,j){if(j!==i)P=clipHalf(P,s,o)});
    var c=centroid(P);
    return {c:c,poly:P.map(function(p){return {x:p.x-c.x,y:p.y-c.y}}),area:c.a,f:3000+R()*3400};
  }).filter(function(s){return s.poly.length>2&&s.area>4});
  // трещина после второго удара: от верхнего края вниз, в долях пилюли
  CRACK=[[[0,-.5],[.012,-.18],[-.006,.08],[.02,.32]],[[.012,-.18],[.05,-.02],[.075,.1]],[[-.006,.08],[-.04,.22]]];
}
var CRACK=[];

/* сцена для столкновений: края экрана, кнопки, крыша уведомления (когда оно село) */
function sdBox(px,py,cx,cy,hw,hh,r){
  var qx=Math.abs(px-cx)-(hw-r),qy=Math.abs(py-cy)-(hh-r);
  return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;
}
function sdScene(x,y,card){
  var d=-sdBox(x,y,201,0,195,852,46),k=0;
  for(var i=0;i<2;i++){var e=Math.hypot(x-BTN[i][0],y-BTN[i][1])-BTNR;if(e<d){d=e;k=1+i}}
  if(card){var c=sdBox(x,y,CARD.x+CARD.w/2,SLOT+MSG[2].h/2,CARD.w/2,MSG[2].h/2,CARD.r);if(c<d){d=c;k=3}}
  return {d:d,k:k};
}
function nrm(x,y,card){
  var e=.35,a=sdScene(x+e,y,card).d-sdScene(x-e,y,card).d,b=sdScene(x,y+e,card).d-sdScene(x,y-e,card).d,l=Math.hypot(a,b)||1;
  return {x:a/l,y:b/l};
}
function simulate(){
  var R=rng(7),P=SHOT,B=TL.B[2],sx=P.w/W0;
  var bodies=SHARDS.map(function(s){
    var dx=s.c.x/(P.w/2),m=s.area*.01,bw=0,bh=0;
    s.poly.forEach(function(p){bw=Math.max(bw,Math.abs(p.x));bh=Math.max(bh,Math.abs(p.y))});
    var center=Math.abs(dx)<.22;
    return {x:P.x+s.c.x,y:P.y+s.c.y,a:0,
      vx:dx*(360+R()*300)+(R()-.5)*120,
      vy:center?900+R()*600:-(220+R()*520)*(1-.4*Math.abs(dx)),
      w:(R()-.5)*26,m:m,I:m*(bw*bw+bh*bh)/3,poly:s.poly,e:.22,mu:.55,card:false,last:-1,f:s.f};
  });
  var mx=P.x+(-W0/2+16+MR)*sx;
  MOON={x:mx,y:P.y,a:0,vx:-150,vy:-560,w:-9,m:2,I:2*MR*MR*.5,r:MR,e:.42,mu:.6,card:false,last:-1,moon:true};
  bodies.push(MOON);
  var dt=1/480,t=0,T=TL.RW0-B.ts,cardT=B.tl-B.ts,flagged=false,G=2500,rec=0,step=0,moved=0;
  SIM.frames=[];SIM.hits=[];
  function hit(b,vn,kind){
    if(t-b.last<.05||vn<110)return;b.last=t;
    SIM.hits.push({t:t,v:vn,moon:!!b.moon,f:b.f||700,x:b.x,k:kind});
  }
  function contact(b,px,py,d,card){
    var n=nrm(px,py,card),rx=px-b.x,ry=py-b.y;
    b.x-=n.x*d*.9;b.y-=n.y*d*.9;
    var vx=b.vx-b.w*ry,vy=b.vy+b.w*rx,vn=vx*n.x+vy*n.y;
    if(vn>=0)return;
    var rn=rx*n.y-ry*n.x,jn=-(1+b.e)*vn/(1/b.m+rn*rn/b.I);
    b.vx+=jn*n.x/b.m;b.vy+=jn*n.y/b.m;b.w+=rn*jn/b.I;
    var tx=-n.y,ty=n.x;vx=b.vx-b.w*ry;vy=b.vy+b.w*rx;var vt=vx*tx+vy*ty,rt=rx*ty-ry*tx;
    var jt=-vt/(1/b.m+rt*rt/b.I);jt=clamp(jt,-b.mu*jn,b.mu*jn);
    b.vx+=jt*tx/b.m;b.vy+=jt*ty/b.m;b.w+=rt*jt/b.I;
    hit(b,-vn,sdScene(px,py,card).k);
    b.touch=1;
  }
  while(t<T+1e-9){
    if(step%4===0){SIM.frames.push(bodies.map(function(b){return [b.x,b.y,b.a]}))}
    var cardOn=t>=cardT;
    if(cardOn&&!flagged){
      flagged=true;
      bodies.forEach(function(b){
        var my=b.moon?b.y+b.r:Math.max.apply(null,b.poly.map(function(p){var c=Math.cos(b.a),s=Math.sin(b.a);return b.y+p.x*s+p.y*c}));
        b.card=my<SLOT+1;
      });
    }
    bodies.forEach(function(b){
      b.vy+=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;b.w*=1-.4*dt;b.touch=0;
      var card=cardOn&&b.card;
      for(var it=0;it<2;it++){
        if(b.moon){
          var s=sdScene(b.x,b.y,card);
          if(s.d<b.r){var n=nrm(b.x,b.y,card);contact(b,b.x-n.x*b.r,b.y-n.y*b.r,s.d-b.r,card)}
        }else{
          var c=Math.cos(b.a),sn=Math.sin(b.a);
          for(var i=0;i<b.poly.length;i++){
            var p=b.poly[i],px=b.x+p.x*c-p.y*sn,py=b.y+p.x*sn+p.y*c,q=sdScene(px,py,card);
            if(q.d<0)contact(b,px,py,q.d,card);
          }
        }
      }
      // лежит: гасим дрожь и качение
      if(b.touch){var damp=b.moon?2.2:5;b.w*=1-damp*dt;b.vx*=1-(b.moon?.9:3)*dt}
    });
    var vmax=0;bodies.forEach(function(b){vmax=Math.max(vmax,Math.hypot(b.vx,b.vy)+Math.abs(b.w)*8)});if(vmax>10)moved=t;
    t+=dt;step++;
  }
  SIM.T=T;SIM.Tr=Math.min(T,moved+.04);
}
function simPose(st){
  var F=SIM.frames,x=clamp(st*SIM.hz,0,F.length-1),i=Math.floor(x),f=x-i,A=F[i],B=F[Math.min(i+1,F.length-1)];
  return A.map(function(a,k){var b=B[k];return [mix(a[0],b[0],f),mix(a[1],b[1],f),mix(a[2],b[2],f)]});
}
// время симуляции для момента петли: вперёд после удара, потом перемотка назад
function rwEase(p){return 1-Math.pow(1-p,2.2)}
function simTime(t){
  var B=TL.B[2];
  if(t<B.ts||t>=TL.RW1)return null;
  if(t<TL.RW0)return t-B.ts;
  // перемотка начинается с момента, когда всё улеглось, быстро в начале и мягко в конце
  return SIM.Tr*(1-rwEase(seg(t,TL.RW0,TL.RW1)));
}

/* ─────────── отрисовка ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),zoom=document.getElementById('zoom'),screenEl=document.getElementById('screen');
var base=document.createElement('canvas'),blurS=document.createElement('canvas'),blurL=document.createElement('canvas');
var K=2,S=1,COL={},SHX=0,SHY=0;
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function M0(){ctx.setTransform(K,0,0,K,K*SHX,K*SHY)}

function moonPath(c,x,y,r,rot){
  // полумесяц: круг минус смещённый круг
  c.save();c.translate(x,y);c.rotate(rot||0);
  c.beginPath();c.rect(-r*2,-r*2,r*4,r*4);c.arc(r*.52,-r*.42,r*.86,0,7,true);c.clip('evenodd');
  c.beginPath();c.arc(0,0,r,0,7);c.fill();c.restore();
}
function drawBase(){
  base.width=Math.round(SW*K);base.height=Math.round(SH*K);
  var c=base.getContext('2d');c.setTransform(K,0,0,K,0,0);
  c.fillStyle=COL.sky;c.fillRect(0,0,SW,SH);
  // солнце садится за горизонт
  c.save();c.beginPath();c.rect(0,0,SW,HORIZON);c.clip();c.fillStyle=COL.sun;c.beginPath();c.arc(292,HORIZON+8,66,0,7);c.fill();c.restore();
  c.fillStyle=COL.sea;c.fillRect(0,HORIZON,SW,SH-HORIZON);
  c.fillStyle=COL.glint;
  [[0,96],[11,72],[23,84],[36,52],[50,60],[66,36],[83,40],[102,22],[124,26]].forEach(function(g,i){
    var y=HORIZON+6+g[0],w=g[1];c.beginPath();c.roundRect(292-w/2+((i*37)%11-5),y,w,i<3?4:3,2);c.fill();
  });
  // надписи экрана блокировки
  var ink=COL.ink;c.fillStyle=ink;c.strokeStyle=ink;
  c.globalAlpha=.9;c.lineWidth=2;c.beginPath();c.arc(201,79,5,Math.PI,0);c.lineTo(206,84);c.moveTo(196,84);c.lineTo(196,79);c.stroke();
  c.beginPath();c.roundRect(193.5,83,15,11.5,2.6);c.fill();
  c.globalAlpha=.86;c.textAlign='center';c.textBaseline='alphabetic';
  c.font='600 21px '+FONT;c.fillText(DATE,201,131);
  c.globalAlpha=1;c.font='700 124px '+FONT;
  try{c.letterSpacing='-4px'}catch(e){}
  c.fillText(TIME,203,252);
  try{c.letterSpacing='0px'}catch(e){}
  BTN.forEach(function(p,i){
    c.fillStyle=COL.btn;c.beginPath();c.arc(p[0],p[1],BTNR,0,7);c.fill();
    c.fillStyle=ink;c.strokeStyle=ink;c.lineWidth=1.7;c.lineJoin='round';c.lineCap='round';
    if(i===0){
      c.beginPath();c.moveTo(p[0]-5,p[1]-11);c.lineTo(p[0]+5,p[1]-11);c.lineTo(p[0]+5,p[1]-6);c.lineTo(p[0]+3,p[1]-3);c.lineTo(p[0]+3,p[1]+11);c.lineTo(p[0]-3,p[1]+11);c.lineTo(p[0]-3,p[1]-3);c.lineTo(p[0]-5,p[1]-6);c.closePath();c.stroke();
      c.beginPath();c.arc(p[0],p[1]+3,1.4,0,7);c.fill();
    }else{
      c.beginPath();c.roundRect(p[0]-11,p[1]-7,22,16,3.5);c.stroke();
      c.beginPath();c.moveTo(p[0]-5,p[1]-7);c.lineTo(p[0]-3,p[1]-10);c.lineTo(p[0]+3,p[1]-10);c.lineTo(p[0]+5,p[1]-7);c.stroke();
      c.beginPath();c.arc(p[0],p[1]+1,4,0,7);c.stroke();
    }
  });
  blurOf(blurS,7);blurOf(blurL,20);
}
function blurOf(dst,r){
  dst.width=base.width;dst.height=base.height;var c=dst.getContext('2d');
  c.fillStyle=COL.sky;c.fillRect(0,0,dst.width,dst.height);
  if(typeof c.filter==='string'){c.filter='blur('+(r*K)+'px)';c.drawImage(base,0,0);c.filter='none';return}
  // без фильтров: уменьшить и растянуть обратно
  var s=document.createElement('canvas'),k=Math.max(2,r*K/2);s.width=Math.ceil(base.width/k);s.height=Math.ceil(base.height/k);
  var sc=s.getContext('2d');sc.imageSmoothingQuality='high';sc.drawImage(base,0,0,s.width,s.height);
  c.imageSmoothingQuality='high';c.drawImage(s,0,0,dst.width,dst.height);
}
// стекло: размытая подложка под формой, слегка увеличенная как линза
function glassUnder(blur,cx,cy,lens){
  M0();ctx.translate(cx,cy);ctx.scale(lens,lens);ctx.translate(-cx,-cy);ctx.drawImage(blur,0,0,SW,SH);
}
function pillContent(sx,sy,withMoon){
  // в локальных координатах пилюли, растянутых вместе с ней
  ctx.save();ctx.scale(sx,sy);
  var x0=-W0/2+16;
  if(withMoon){ctx.fillStyle=COL.moon;moonPath(ctx,x0+MR,0,MR,-.35)}
  ctx.fillStyle=COL.ink;ctx.font='600 '+PFS+'px '+FONT;ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.fillText('Do Not Disturb',x0+MR*2+8,1);
  ctx.restore();
}
function crackLines(P,amt){
  if(amt<=0)return;
  ctx.save();ctx.globalAlpha=amt;ctx.lineCap='round';ctx.lineJoin='round';
  [[COL.rimStrong,1.3]].forEach(function(st){
    ctx.strokeStyle=st[0];ctx.lineWidth=st[1];
    CRACK.forEach(function(L){ctx.beginPath();L.forEach(function(q,i){var x=q[0]*P.w,y=q[1]*P.h;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});
  });
  ctx.restore();
}
function drawPill(P){
  var r=Math.min(P.h,P.w)/2;
  ctx.save();
  M0();ctx.translate(P.x,P.y);ctx.rotate(P.rot);
  ctx.beginPath();ctx.roundRect(-P.w/2,-P.h/2,P.w,P.h,r);ctx.clip();
  glassUnder(blurS,P.x,P.y,1.12);
  M0();ctx.translate(P.x,P.y);ctx.rotate(P.rot);
  ctx.fillStyle=COL.pill;ctx.fillRect(-P.w/2,-P.h/2,P.w,P.h);
  pillContent(P.w/W0,P.h/H0,true);
  crackLines(P,P.crack);
  // трещины расходятся от места удара по будущим швам осколков
  if(P.spread>0){
    var Rr=P.spread*P.w*.62,sx=P.w/SHOT.w,sy=P.h/SHOT.h;
    ctx.strokeStyle=COL.rimStrong;ctx.lineWidth=1.2;
    SHARDS.forEach(function(s){
      ctx.beginPath();
      s.poly.forEach(function(p,i){var x=(p.x+s.c.x)*sx,y=(p.y+s.c.y)*sy;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
      ctx.closePath();
      var d=Math.hypot(s.c.x*sx,(s.c.y+SHOT.h/2)*sy);ctx.globalAlpha=c01((Rr-d)/30);ctx.stroke();
    });
    ctx.globalAlpha=1;
  }
  ctx.restore();
  // кромка
  M0();ctx.translate(P.x,P.y);ctx.rotate(P.rot);
  ctx.beginPath();ctx.roundRect(-P.w/2+.5,-P.h/2+.5,P.w-1,P.h-1,Math.max(0,r-.5));ctx.strokeStyle=COL.rim;ctx.lineWidth=1;ctx.stroke();
}
function drawShard(s,pose){
  var P=SHOT,sx=P.w/W0,sy=P.h/H0;
  ctx.save();
  M0();ctx.translate(pose[0],pose[1]);ctx.rotate(pose[2]);
  ctx.beginPath();s.poly.forEach(function(p,i){i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.clip();
  ctx.beginPath();ctx.roundRect(-s.c.x-P.w/2,-s.c.y-P.h/2,P.w,P.h,P.h/2);ctx.clip();
  glassUnder(blurS,pose[0],pose[1],1.12);
  M0();ctx.translate(pose[0],pose[1]);ctx.rotate(pose[2]);ctx.translate(-s.c.x,-s.c.y);
  ctx.fillStyle=COL.pill;ctx.fillRect(-P.w/2,-P.h/2,P.w,P.h);
  pillContent(sx,sy,false);
  ctx.translate(s.c.x,s.c.y);
  // свежие сколы светятся по краю
  ctx.beginPath();s.poly.forEach(function(p,i){i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();
  ctx.strokeStyle=COL.rimStrong;ctx.lineWidth=1.6;ctx.stroke();
  ctx.beginPath();ctx.roundRect(-s.c.x-P.w/2+.5,-s.c.y-P.h/2+.5,P.w-1,P.h-1,P.h/2-.5);ctx.strokeStyle=COL.rim;ctx.lineWidth=1;ctx.stroke();
  ctx.restore();
}
var BADGE=new Path2D('M10 4.2c-3.6 0-6.4 2.3-6.4 5.2 0 1.7.9 3.2 2.4 4.1-.1.9-.6 1.8-1.3 2.5 1.5 0 2.8-.6 3.7-1.4.5.1 1 .1 1.6.1 3.6 0 6.4-2.3 6.4-5.3S13.6 4.2 10 4.2z');
function drawBanner(k,o){
  var m=MSG[k],w=CARD.w,h=o.h,cx=o.x+w/2,cy=o.y+h/2;
  ctx.save();
  M0();ctx.translate(cx,cy);ctx.rotate(o.rot);ctx.scale(o.sx,o.sy);
  ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,CARD.r);ctx.clip();
  glassUnder(blurL,cx,cy,1.04);
  M0();ctx.translate(cx,cy);ctx.rotate(o.rot);ctx.scale(o.sx,o.sy);ctx.translate(-w/2,-h/2);
  ctx.fillStyle=COL.noti;ctx.fillRect(0,0,w,h);
  var ay=h/2;
  ctx.fillStyle='#a4a7b0';ctx.beginPath();ctx.arc(40,ay,25,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='600 22px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('B',40,ay+1);
  ctx.fillStyle=COL.cardBg;ctx.beginPath();ctx.roundRect(51.5,ay+11.5,25,25,7.5);ctx.fill();
  ctx.fillStyle='#34c759';ctx.beginPath();ctx.roundRect(53,ay+13,22,22,6);ctx.fill();
  ctx.save();ctx.translate(56,ay+16);ctx.scale(.8,.8);ctx.fillStyle='#fff';ctx.fill(BADGE);ctx.restore();
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  var ty=m.ts?52:40;
  if(m.ts){ctx.fillStyle=COL.notiSub;ctx.font='600 13px '+FONT;try{ctx.letterSpacing='.6px'}catch(e){}ctx.fillText('TIME SENSITIVE',80,30);try{ctx.letterSpacing='0px'}catch(e){}}
  ctx.fillStyle=COL.notiInk;ctx.font='600 20px '+FONT;ctx.fillText('Boss',80,ty);
  ctx.fillStyle=COL.notiSub;ctx.font='15px '+FONT;ctx.textAlign='right';ctx.fillText('now',w-18,m.ts?30:ty-1);
  ctx.fillStyle=COL.notiInk;ctx.font='20px '+FONT;ctx.textAlign='left';ctx.fillText(m.body,80,ty+27);
  ctx.restore();
  M0();ctx.translate(cx,cy);ctx.rotate(o.rot);ctx.scale(o.sx,o.sy);
  ctx.beginPath();ctx.roundRect(-w/2+.25,-h/2+.25,w-.5,h-.5,CARD.r);ctx.strokeStyle=COL.cardLine;ctx.lineWidth=.5;ctx.stroke();
}
function drawFinger(g){
  if(g.a<=0)return;
  M0();ctx.globalAlpha=g.a;ctx.translate(g.x,g.y);ctx.scale(g.p,g.p);
  ctx.fillStyle='rgba(120,120,128,.34)';ctx.beginPath();ctx.arc(0,0,23,0,7);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;
}

/* ─────────── кадр ─────────── */
function fingerAt(t){
  var g={x:0,y:0,a:0,p:1};
  if(t<TL.FIN0||t>TL.SW0+.32)return g;
  var cy=SLOT+MSG[2].h/2;
  if(t<TL.TOUCH){var u=eout(seg(t,TL.FIN0,TL.TOUCH));g.x=mix(380,310,u);g.y=mix(cy+110,cy,u);g.a=sm(seg(t,TL.FIN0,TL.FIN0+.1));g.p=mix(1,.9,u);return g}
  if(t<TL.SW0){g.x=310;g.y=cy;g.a=1;g.p=.82;return g}
  var q=seg(t,TL.SW0,TL.SW1);g.x=310-480*Math.pow(q,1.7);g.y=cy-6*q;g.a=1-sm(seg(t,TL.SW0+.12,TL.SW0+.3));g.p=.82;
  return g;
}
function camAt(t){
  // при записи камера подъезжает к уведомлению, пока оно лежит
  if(!(REC||STILL))return 1;
  if(t<TL.Z0||t>=TL.ZO1)return 1;
  if(t<TL.Z1)return mix(1,1.3,eio(seg(t,TL.Z0,TL.Z1)));
  if(t<TL.ZO0)return 1.3;
  return mix(1.3,1,eio(seg(t,TL.ZO0,TL.ZO1)));
}
function shakeAt(t){
  var x=0,y=0;
  TL.B.forEach(function(B,i){
    var t0=i<2?B.tc:B.tl,A=i<2?1.6:8,d=t-t0;
    if(d>0&&d<.7){var e=Math.exp(-d*(i<2?14:9));y+=A*e*Math.sin(2*Math.PI*12*d);x+=A*.45*e*Math.sin(2*Math.PI*9*d+1)}
  });
  return [x,y];
}
function render(t){
  set(zoom,'transform','scale('+(S*camAt(t)).toFixed(4)+')');
  var sh=shakeAt(t);SHX=sh[0];SHY=sh[1];
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=COL.sky;ctx.fillRect(0,0,cv.width,cv.height);
  M0();ctx.drawImage(base,0,0,SW,SH);
  var P=pillAt(t);
  if(!P.broken&&!(t>=TL.RW0&&t<TL.RW1))drawPill(P);
  for(var k=0;k<3;k++){var o=bannerAt(k,t);if(o)drawBanner(k,o)}
  var st=simTime(t);
  if(st!=null){
    var pose=simPose(st);
    SHARDS.forEach(function(s,i){drawShard(s,pose[i])});
    var m=pose[pose.length-1];M0();ctx.fillStyle=COL.moon;
    // в полёте луна круглая, в пилюле была сплющена вместе с ней
    moonPath(ctx,m[0],m[1],MR,-.35+m[2]);
  }
  drawFinger(fingerAt(t));
  ctx.setTransform(1,0,0,1,0,0);
}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function rwInv(y){var a=0,b=1;for(var i=0;i<30;i++){var m=(a+b)/2;if(rwEase(m)<y)a=m;else b=m}return (a+b)/2}
function buildEvents(){
  EVENTS=[];var B=TL.B;
  for(var k=0;k<2;k++){EVENTS.push([b0Of(k),'whoosh',k],[B[k].j0,'hop',k],[B[k].tc,'block',k],[B[k].tl,'land',k])}
  EVENTS.push([B[1].tl+.03,'crack'],[TL.TREM0,'chatter',B[2].j0-TL.TREM0]);
  EVENTS.push([b0Of(2),'incoming'],[B[2].j0,'hop',2],[B[2].tc,'strain'],[B[2].ts,'smash'],[B[2].tl,'thud'],[B[2].tl+.03,'ding']);
  SIM.hits.forEach(function(h,i){
    var pan=clamp((h.x-201)/220,-.9,.9);
    EVENTS.push([B[2].ts+h.t,h.moon?'tonk':'tink',{v:h.v,f:h.f,pan:pan,k:h.k}]);
    // перемотка: те же удары задом наперёд
    if(h.t>SIM.Tr)return;
    var u=rwInv(1-h.t/SIM.Tr);
    EVENTS.push([TL.RW0+u*(TL.RW1-TL.RW0),'rtink',{v:h.v,f:h.f,pan:pan,moon:h.moon}]);
  });
  EVENTS.push([TL.TOUCH,'touch'],[TL.SW0+.02,'swipe'],[TL.RW0,'rewind',TL.RW1-TL.RW0],[TL.RW1,'reform'],[TL.HOME1,'land',3]);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,TL.CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Касание отправляет следующее сообщение от босса: первые два пилюля отбивает,
   третье пробивает её. Ещё касание смахивает уведомление, и пилюля собирается. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function liveTap(){
  Sound.start();
  var n=nowS();
  if(mode!=='live'){
    var u=uNow(),k=0;while(k<SEGS.length-2&&u>=SEGS[k+1])k++;
    LV={k:k,t0:n-(u-SEGS[k]),u:u};mode='live';return;
  }
  var end=SEGS[LV.k+1];
  if(LV.u<end-1e-6)return;
  LV.k=(LV.k+1)%(SEGS.length-1);LV.t0=n;LV.u=SEGS[LV.k];
}
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();liveTap()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();liveTap()}
});

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
  }else{
    var end=SEGS[LV.k+1],u2=Math.min(end,SEGS[LV.k]+(nowS()-LV.t0));
    if(u2>LV.u)fireBetween(LV.u,u2);
    LV.u=u2;render(u2>=TL.CYCLE-1e-6?0:u2);
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;mode='auto';LV=null;acc=0;lastU=0};
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
  var dark=th==='dark';
  COL={dark:dark,sky:css('--sky'),sun:css('--sun'),sea:css('--sea'),glint:css('--glint'),ink:css('--lock-ink'),btn:css('--btn'),
       noti:css('--noti'),notiInk:css('--noti-ink'),notiSub:css('--noti-sub'),rim:css('--rim'),pill:css('--pill'),moon:css('--moon'),
       rimStrong:dark?'rgba(255,255,255,.55)':'rgba(255,255,255,.95)',cardLine:dark?'rgba(255,255,255,.1)':'rgba(255,255,255,.6)',cardBg:dark?'#2a2a2e':'#f4f4f6'};
  drawBase();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused)render(uNow())}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?(hh-40)/808:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  K=Math.min(3.2,Math.max(1,S*(window.devicePixelRatio||1)*(REC||STILL?1.3:1)));
  cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
  if(COL.sky)drawBase();
}
function measurePill(){
  ctx.font='600 '+PFS+'px '+FONT;
  W0=Math.round(16+MR*2+8+ctx.measureText('Do Not Disturb').width+18);
}

window.__seek=function(t){mode='auto';paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;

function boot(){
  measurePill();
  // лёгкая разница в ширине: трещины и осколки считаются от реальной позы
  TL.B[0].wc=W0*1.5;TL.B[1].wc=W0*1.6;TL.B[2].wc=W0*1.62;
  buildShards();simulate();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();buildEvents();
  addEventListener('resize',fit);
  render(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
