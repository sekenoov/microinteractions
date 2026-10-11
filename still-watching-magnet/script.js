/* ─────────── Still watching ───────────
   Понедельник, 11:14 вечера. Серия кончилась, плеер спрашивает «Are you still watching?».
   Курсор идёт к Back, а Continue Watching работает как магнит: набухает, тянется к курсору,
   курсор упирается, дрожит, почти дотягивается до Back и срывается в Continue с глухим «тук».
   Серия пролетает, часы в строке меню перекручиваются, Mon становится Tue.
   Второй раз борьба короче. Третий раз курсор даже не пытается, а плеер перепечатывает
   вопрос: «Are you okay?». Курсор жмёт Continue Watching.
   Всё рисуется на одном 2D-канвасе из одного t, кадр 432 × 540 точек. */

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
function ein(p){p=c01(p);return p*p*p}
function seg(l,a,b){return c01((l-a)/(b-a))}
function bump(t,a,b){return Math.sin(Math.PI*seg(t,a,b))}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var TAU=Math.PI*2;

var SW=432,SH=540,MB=25;
var FONT='system-ui,-apple-system,"SF Pro Display","SF Pro Text",sans-serif';
var TITLE='Are you still watching?',KEEP='Are you ',OKAY='okay?';

/* ─────────── сценарий петли ───────────
   in появление диалога, snap срыв в Continue, click, ff серия на перемотке */
var TL={
  A:[
    {in:0,ep:5,clock:[1,12,23,14],bat:.64},
    {in:3.5,ep:6,clock:[2,13,0,58],bat:.31},
    {in:5.85,ep:7,clock:[2,13,2,41],bat:.09}
  ],
  END:{clock:[2,13,4,26],bat:.05},
  SNAP1:2.05,CLICK1:2.5,FF1:[2.62,3.5],
  H2:3.8,SNAP2:4.55,CLICK2:4.9,FF2:[4.98,5.85],
  TW0:6.3,TW1:6.58,DEL0:6.75,TYP0:7.2,CLICK3:8.5,FF3:[8.58,9.25],
  BLK0:9.22,BLK1:9.44,CYCLE:9.6
};
TL.TYP1=TL.TYP0+OKAY.length*.07;
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ─────────── раскладка, всё в точках кадра ─────────── */
var L={x:32,label:322,title:358,by:382,bh:48,gap:12,r:12};
var CONT={},BACK={},CDOCK={},BC={},START={x:382,y:490};
function layout(){
  ctx.font='600 16px '+FONT;
  var tw=ctx.measureText('Continue Watching').width,bw=ctx.measureText('Back').width;
  CONT={x:L.x,y:L.by,w:Math.round(20+12+9+tw+22),h:L.bh};
  BACK={x:CONT.x+CONT.w+L.gap,y:L.by,w:Math.round(bw+48),h:L.bh};
  CDOCK={x:CONT.x+CONT.w*.44,y:CONT.y+CONT.h*.56};
  BC={x:BACK.x+BACK.w*.5,y:BACK.y+BACK.h*.5};
}

/* ─────────── курсор: рука хочет к Back, магнит тянет к Continue ───────────
   курсор = рука + (точка в Continue − рука) · w, плюс дрожь от напряжения */
function snapW(w0,u,k,f){return 1-(1-w0)*Math.exp(-k*u)*Math.cos(TAU*f*u)}
function wobble(t){return Math.sin(TAU*1.9*t)*.6+Math.sin(TAU*3.1*t+1.3)*.4}
function arm(t){
  // {hx,hy,w,tr напряжение 0..1,a видимость,e магнит проснулся}
  var A=TL.A,o={hx:CDOCK.x,hy:CDOCK.y,w:1,tr:0,a:1,e:.3};
  if(t<A[1].in){
    var B=BC,S=START;
    if(t<.15){o.hx=S.x;o.hy=S.y}
    else if(t<1.0){var u=eio(seg(t,.15,1.06));o.hx=mix(S.x,B.x+6,u);o.hy=mix(S.y,B.y+4,u)}
    else{var d=t-1.0;o.hx=B.x+6+10*sm(seg(t,1,1.25))+5*Math.sin(TAU*2.1*d);o.hy=B.y+4+3*Math.sin(TAU*1.6*d+1)}
    o.w=w1(t);
    o.e=sm(seg(t,.4,.95));
    o.tr=sm(seg(t,.85,1.15))*(1-sm(seg(t,TL.SNAP1,TL.SNAP1+.08)));
    if(t>TL.SNAP1){o.e=mix(1,.3,sm(seg(t,TL.SNAP1+.1,TL.SNAP1+.6)))}
    return o;
  }
  if(t<A[2].in){
    var t0=A[1].in;
    o.a=sm(seg(t,t0+.05,t0+.22));
    if(t>TL.H2){
      var u2=eout(seg(t,TL.H2,TL.H2+.42)),d2=t-TL.H2;
      o.hx=mix(CDOCK.x,BC.x+14,u2)+4*Math.sin(TAU*2.4*d2)*u2;o.hy=mix(CDOCK.y,BC.y+4,u2)+2.5*Math.sin(TAU*1.7*d2)*u2;
    }
    o.w=w2(t);
    o.e=t<TL.H2?.3:mix(.3,1,sm(seg(t,TL.H2,TL.H2+.25)));
    o.tr=sm(seg(t,TL.H2+.15,TL.H2+.35))*(1-sm(seg(t,TL.SNAP2,TL.SNAP2+.08)));
    if(t>TL.SNAP2)o.e=mix(1,.3,sm(seg(t,TL.SNAP2+.1,TL.SNAP2+.6)));
    return o;
  }
  var t3=A[2].in;
  o.a=sm(seg(t,t3+.05,t3+.22));
  // еле дёрнулся к Back и сдался
  var tw=bump(t,TL.TW0,TL.TW1);
  o.hx=CDOCK.x+46*tw;o.hy=CDOCK.y+6*tw;o.w=1-.12*tw;o.e=.3+.4*tw;o.tr=.25*tw;
  return o;
}
function w1(t){
  if(t<.3)return 0;
  if(t<1.0)return .36*sm(seg(t,.3,1.0));
  var d=t-1.0;
  var w=.36+.13*wobble(d)*sm(seg(t,1,1.2))-.27*bump(t,1.42,1.78)+.16*sm(seg(t,1.78,TL.SNAP1));
  if(t<TL.SNAP1)return w;
  return snapW(w1(TL.SNAP1-1e-6),t-TL.SNAP1,9,2.8);
}
function w2(t){
  if(t<TL.H2)return 1;
  var w=1-.76*eout(seg(t,TL.H2,TL.H2+.4))+.1*wobble(t-TL.H2)*sm(seg(t,TL.H2+.3,TL.H2+.45));
  if(t<TL.SNAP2)return w;
  return snapW(w2(TL.SNAP2-1e-6),t-TL.SNAP2,10,3);
}
function cursorAt(t){
  var o=arm(t),x=o.hx+(CDOCK.x-o.hx)*o.w,y=o.hy+(CDOCK.y-o.hy)*o.w;
  // дрожь: упирается
  var A=2.4*o.tr;
  x+=A*(Math.sin(TAU*23*t)*.6+Math.sin(TAU*31*t+2)*.4);
  y+=A*(Math.sin(TAU*19*t+1)*.6+Math.sin(TAU*27*t)*.4);
  return {x:x,y:y,a:o.a,w:o.w,e:o.e,tr:o.tr,hx:o.hx,hy:o.hy};
}

/* ─────────── состояние кадра ─────────── */
function actOf(t){var A=TL.A;return t<A[1].in?0:t<A[2].in?1:2}
function clickOf(k){return [TL.CLICK1,TL.CLICK2,TL.CLICK3][k]}
function ffOf(k){return [TL.FF1,TL.FF2,TL.FF3][k]}
function snapOf(k){return [TL.SNAP1,TL.SNAP2,null][k]}
function titleAt(t){
  if(t<TL.DEL0)return TITLE;
  var n=TITLE.length-KEEP.length;
  if(t<TL.TYP0)return TITLE.slice(0,TITLE.length-Math.min(n,Math.floor((t-TL.DEL0)/.026)));
  return KEEP+OKAY.slice(0,Math.min(OKAY.length,Math.floor((t-TL.TYP0)/.07)+1));
}
function stateAt(t){
  var k=actOf(t),A=TL.A[k],ck=clickOf(k),ff=ffOf(k),sn=snapOf(k);
  var s={k:k,ep:A.ep,title:k===2?titleAt(t):TITLE};
  s.cur=cursorAt(t);
  // диалог: появился, после клика ушёл
  s.dlg=sm(seg(t,A.in,A.in+.25))*(1-sm(seg(t,ck+.06,ck+.24)));
  s.dlgY=6*(1-eout(seg(t,A.in,A.in+.3)))+4*sm(seg(t,ck+.06,ck+.24));
  s.cur.a*=1-sm(seg(t,ck+.08,ck+.2));
  s.press=bump(t,ck,ck+.12);
  // удар о кнопку: первый проход w через 1
  s.squash=0;
  if(sn!=null){var tc=sn+Math.acos(0)/(TAU*(k?3:2.8));var d=t-tc;if(d>0)s.squash=Math.exp(-d*11)*Math.cos(TAU*6*d)}
  // Back подсвечивается, когда курсор над ним
  var c=s.cur;s.hoverBack=(c.x>BACK.x+2&&c.x<BACK.x+BACK.w-2&&c.y>BACK.y+2&&c.y<BACK.y+BACK.h-2)?1:0;
  s.hoverCont=c.w>.9&&(c.x>CONT.x&&c.x<CONT.x+CONT.w&&c.y>CONT.y&&c.y<CONT.y+CONT.h)?1:0;
  // перемотка серии
  s.ff=t>=ff[0]&&t<ff[1]?seg(t,ff[0],ff[1]):-1;
  s.play=sm(seg(t,ff[0]-.05,ff[0]+.1))*(1-sm(seg(t,ff[1]-.08,ff[1]+.12)));
  s.frame=s.ff>=0?(k*7+3+Math.floor(eio(s.ff)*9))%FR.length:(k*7)%FR.length;
  if(t<A.in+.01&&k>0)s.frame=(k*7)%FR.length;
  // часы и батарея
  var nx=k<2?TL.A[k+1]:TL.END;
  s.clock={from:A.clock,to:nx.clock,r0:ff[0]+.18,t:t};
  s.bat=mix(A.bat,nx.bat,eio(seg(t,ff[0]+.1,ff[1]-.1)));
  s.black=t>=TL.BLK0?sm(seg(t,TL.BLK0,TL.BLK1)):1-sm(seg(t,0,.16));
  return s;
}

/* ─────────── канвас ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),frameEl=document.getElementById('frame');
var K=2,S=1,COL={},FR=[],DY=0;
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function M0(){ctx.setTransform(K,0,0,K,0,K*DY)}

/* размытые стоп-кадры серии: ни одного читаемого предмета, только свет и пятна */
var PAL={
  dark:{base:['#0b1116','#120e0c','#0a0f14','#0f1210'],blob:['#1f3a4a','#3a2a1e','#c27a3a','#2d4f5c','#7a4a3a','#d9a46f','#20303a','#5a3a52','#a7562f','#36505a']},
  light:{base:['#d8d2c6','#cfd6d9','#ddd3c3','#d3d6cc'],blob:['#f3ead9','#a9c0cc','#e4b48c','#c4d4dc','#f8f1e4','#b89a7a','#e8c9a8','#9fb3a8','#efdcc4','#c9b6a8']}
};
function makeFrames(){
  FR=[];var P=COL.dark?PAL.dark:PAL.light,W=Math.round(SW*K),H=Math.round(SH*K);
  for(var i=0;i<14;i++){
    var R=rng(101+i*17),c=document.createElement('canvas');c.width=W;c.height=H;
    var g=c.getContext('2d');g.fillStyle=P.base[i%P.base.length];g.fillRect(0,0,W,H);
    g.filter='blur('+Math.round(34*K)+'px)';g.scale(K,K);
    var n=5+Math.floor(R()*3);
    for(var j=0;j<n;j++){
      g.fillStyle=P.blob[Math.floor(R()*P.blob.length)];g.globalAlpha=.55+R()*.45;
      g.beginPath();g.ellipse(R()*SW,R()*SH,50+R()*150,40+R()*170,R()*3,0,TAU);g.fill();
    }
    // фигура: тёмный вертикальный силуэт в половине кадров
    if(i%2===0){g.globalAlpha=COL.dark?.7:.35;g.fillStyle=COL.dark?'#05070a':'#6d6258';g.beginPath();g.ellipse(120+R()*200,SH*.62,46+R()*20,150,0,0,TAU);g.fill()}
    g.filter='none';g.globalAlpha=1;FR.push(c);
  }
}

function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
var CURSOR=new Path2D('M0 0 L0 17.2 L4.1 13.3 L6.9 19.9 L9.6 18.8 L6.9 12.3 L12.4 12.3 Z');
function drawCursor(c,rot){
  if(c.a<=0)return;
  M0();ctx.globalAlpha=c.a;ctx.translate(c.x,c.y);ctx.rotate(rot);ctx.scale(1.55,1.55);
  ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.lineWidth=2.1;ctx.stroke(CURSOR);
  ctx.fillStyle='#000';ctx.fill(CURSOR);
  ctx.globalAlpha=1;
}

/* строка меню: часы перекручиваются барабаном по разрядам справа налево */
function clockTokens(c){
  var h=c[2]%12||12,ap=c[2]<12?'AM':'PM',m=c[3];
  return [DAYS[c[0]],' ','Oct',' ',String(c[1])[0],String(c[1])[1],'  ',h>=10?'1':'',String(h%10),':',String(Math.floor(m/10)),String(m%10),' ',ap];
}
function digitSeq(a,b,extra){
  var s=[a],x=+a,y=+b,steps=((y-x)%10+10)%10+10*extra;
  for(var i=1;i<=steps;i++)s.push(String((x+i)%10));
  return s;
}
function drawMenubar(s){
  M0();
  ctx.fillStyle=COL.mb;ctx.fillRect(0,0,SW,MB);
  ctx.fillStyle=COL.mbLine;ctx.fillRect(0,MB-.5,SW,.5);
  ctx.fillStyle=COL.mbInk;ctx.textBaseline='alphabetic';
  ctx.font='15px '+FONT;ctx.fillText('',13,17.5);
  ctx.font='600 12.5px '+FONT;ctx.fillText('Safari',34,17);
  var x=34+ctx.measureText('Safari').width+15;ctx.font='12.5px '+FONT;
  ['File','Edit','View'].forEach(function(w){ctx.fillText(w,x,17);x+=ctx.measureText(w).width+15});

  // часы
  var c=s.clock,A=clockTokens(c.from),B=clockTokens(c.to),n=A.length,T=c.t;
  ctx.font='12.5px '+FONT;
  var dw=0;for(var d=0;d<10;d++)dw=Math.max(dw,ctx.measureText(String(d)).width);
  var right=SW-12,xr=right;
  for(var i=n-1;i>=0;i--){
    var a=A[i],b=B[i],isD=/^\d?$/.test(a)&&/^\d?$/.test(b)&&(a+b).length>0;
    var wa=a===''?0:(isD?dw:ctx.measureText(a).width),wb=b===''?0:(isD?dw:ctx.measureText(b).width);
    var st=c.r0+(n-1-i)*.03,extra=i===11?2:i===10?1:0,dur=.34+.12*extra;
    var r=a===b?0:eio(seg(T,st,st+dur));
    var wnow=mix(wa,wb,r);xr-=wnow;
    if(a===b||r<=0||r>=1){
      var str=r>=1?b:a;if(str!==''){ctx.fillStyle=COL.mbInk;ctx.textAlign=isD?'center':'left';ctx.fillText(str,isD?xr+wnow/2:xr,17);ctx.textAlign='left'}
    }else{
      var seq=isD&&a!==''&&b!==''?digitSeq(a,b,extra):[a,b],pos=r*(seq.length-1),lh=15;
      ctx.save();ctx.beginPath();ctx.rect(xr-1,3,wnow+2,MB-6);ctx.clip();
      for(var j=Math.max(0,Math.floor(pos)-1);j<=Math.min(seq.length-1,Math.ceil(pos)+1);j++){
        var off=(j-pos)*lh;if(Math.abs(off)>lh*1.2||seq[j]==='')continue;
        ctx.globalAlpha=1-Math.min(1,Math.abs(off)/lh)*.6;ctx.fillStyle=COL.mbInk;
        ctx.textAlign=isD?'center':'left';ctx.fillText(seq[j],isD?xr+wnow/2:xr,17+off);ctx.textAlign='left';
      }
      ctx.restore();ctx.globalAlpha=1;
    }
  }
  // wi-fi и батарея слева от часов
  var bx=xr-16-25;
  ctx.strokeStyle=COL.mbInk;ctx.globalAlpha=.45;ctx.lineWidth=1;rr(bx+.5,8.5,22,10,3);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle=COL.mbInk;ctx.globalAlpha=.45;rr(bx+23.5,11.5,1.6,4,1);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=s.bat<.12?'#ff3b30':COL.mbInk;rr(bx+2,10,Math.max(1.6,19*s.bat),7,1.8);ctx.fill();
  var wx=bx-13,wy=17.6;ctx.strokeStyle=COL.mbInk;ctx.fillStyle=COL.mbInk;ctx.lineWidth=1.7;ctx.lineCap='round';
  [3.6,6.8].forEach(function(r){ctx.beginPath();ctx.arc(wx,wy,r,-Math.PI*.74,-Math.PI*.26);ctx.stroke()});
  ctx.beginPath();ctx.arc(wx,wy-.2,1.3,0,TAU);ctx.fill();ctx.lineCap='butt';
}

/* кнопка Continue: тянется к курсору от дальнего края, как магнит */
function drawButtons(s,a){
  var c=s.cur,C=CONT,cx=C.x+C.w/2,cy=C.y+C.h/2;
  // Back стоит на месте, Continue тянется поверх него
  M0();ctx.globalAlpha=a;
  rr(BACK.x,BACK.y,BACK.w,BACK.h,L.r);ctx.fillStyle=s.hoverBack?COL.secHi:COL.sec;ctx.fill();
  ctx.font='600 16px '+FONT;ctx.textBaseline='middle';ctx.fillStyle=COL.secInk;ctx.textAlign='center';ctx.fillText('Back',BACK.x+BACK.w/2,BACK.y+BACK.h/2+1);
  ctx.textAlign='left';
  var dx=c.x-cx,dy=c.y-cy,dist=Math.hypot(dx,dy)||1,ux=dx/dist,uy=dy/dist;
  var far=c01((dist-30)/120),pull=s.cur.e*(1-c.w*.85)*far;
  var stretch=1+.1*pull,lean=Math.min(7,dist*.05)*pull;
  var sw=1+.07*s.squash,sh=1-.1*s.squash,pr=1-.04*s.press,grow=1+.03*s.cur.e;
  M0();ctx.globalAlpha=a;
  ctx.translate(cx+ux*lean,cy+uy*lean);
  var ang=Math.atan2(uy,ux);
  // вытяжение вдоль направления на курсор с опорой у дальнего края
  var ext=C.w/2*Math.abs(ux)+C.h/2*Math.abs(uy);
  ctx.rotate(ang);ctx.translate(-ext,0);ctx.scale(stretch,1/Math.sqrt(stretch));ctx.translate(ext,0);ctx.rotate(-ang);
  ctx.scale(sw*pr*grow,sh*pr*grow);
  rr(-C.w/2,-C.h/2,C.w,C.h,L.r);ctx.fillStyle=s.hoverCont?COL.priHi:COL.pri;ctx.fill();
  ctx.fillStyle=COL.priInk;
  var px=-C.w/2+20,py=0;ctx.beginPath();ctx.moveTo(px+1,py-7);ctx.lineTo(px+12,py);ctx.lineTo(px+1,py+7);ctx.closePath();ctx.lineJoin='round';ctx.lineWidth=2;ctx.strokeStyle=COL.priInk;ctx.stroke();ctx.fill();
  ctx.font='600 16px '+FONT;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText('Continue Watching',px+12+9,1);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.globalAlpha=1;
}

var lastCur=null;
function draw(s,rot){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(FR[s.frame],0,0);
  // затемнение под диалогом, на перемотке серия светлее
  M0();ctx.fillStyle=COL.dim;ctx.globalAlpha=mix(1,.25,s.play);ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1;
  if(s.dlg>0){
    var a=s.dlg;M0();ctx.translate(0,s.dlgY);ctx.globalAlpha=a;
    ctx.fillStyle=COL.sub;ctx.font='600 13px '+FONT;try{ctx.letterSpacing='.4px'}catch(e){}
    ctx.fillText('S2 · E'+s.ep,L.x,L.label);try{ctx.letterSpacing='0px'}catch(e){}
    ctx.fillStyle=COL.ink;ctx.font='600 28px '+FONT;try{ctx.letterSpacing='-.3px'}catch(e){}
    ctx.fillText(s.title,L.x,L.title);try{ctx.letterSpacing='0px'}catch(e){}
    ctx.globalAlpha=1;
    DY=s.dlgY;drawButtons(s,a);DY=0;
  }
  if(s.ff>=0||s.play>0){
    M0();var y=SH-18,x0=20,w=SW-40,p=s.ff>=0?eio(s.ff):1;ctx.globalAlpha=s.play;
    rr(x0,y,w,3,1.5);ctx.fillStyle=COL.track;ctx.fill();
    rr(x0,y,Math.max(3,w*p),3,1.5);ctx.fillStyle=COL.fill;ctx.fill();
    ctx.beginPath();ctx.arc(x0+w*p,y+1.5,5.5,0,TAU);ctx.fill();ctx.globalAlpha=1;
  }
  drawMenubar(s);
  drawCursor(s.cur,rot);
  if(s.black>0){M0();ctx.globalAlpha=s.black;ctx.fillStyle='#000';ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1}
  ctx.setTransform(1,0,0,1,0,0);
}
function tiltAt(t){
  // курсор наклоняется по ходу движения, как будто его тащат
  var h=1/120,a=cursorAt(t-h),b=cursorAt(t+h),vx=(b.x-a.x)/(2*h);
  return clamp(-vx*.00045,-.32,.32);
}
function render(t){draw(stateAt(t),tiltAt(t))}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];var A=TL.A;
  A.forEach(function(a,k){EVENTS.push([a.in+.02,'appear',k])});
  // гул магнита и скрип: кривые по кадрам
  [[.3,A[1].in],[A[1].in,A[2].in],[A[2].in,TL.CLICK3]].forEach(function(r,k){
    var hz=60,n=Math.ceil((r[1]-r[0])*hz),g=[],tr=[];
    for(var i=0;i<n;i++){var t=r[0]+i/hz,c=cursorAt(t);g.push(c.e*(1-c.w*.7));tr.push(c.tr)}
    EVENTS.push([r[0],'hum',{hz:hz,g:g,tr:tr,k:k}]);
  });
  // Back подсветился: почти дотянулся
  var was=0;for(var t=.3;t<TL.SNAP1;t+=1/240){var s=stateAt(t);if(s.hoverBack&&!was)EVENTS.push([t,'hover']);was=s.hoverBack}
  EVENTS.push([TL.SNAP1,'snap',0],[TL.SNAP2,'snap',1]);
  [TL.CLICK1,TL.CLICK2,TL.CLICK3].forEach(function(c,k){EVENTS.push([c,'click',k])});
  [TL.FF1,TL.FF2,TL.FF3].forEach(function(f,k){EVENTS.push([f[0],'ff',f[1]-f[0]],[f[0]+.18,'roll',k])});
  EVENTS.push([TL.TW0,'twitch']);
  for(var i=0;i<TITLE.length-KEEP.length;i++)EVENTS.push([TL.DEL0+i*.026,'bs',i]);
  for(var j=0;j<OKAY.length;j++)EVENTS.push([TL.TYP0+j*.07,'key',j]);
  EVENTS.push([TL.TYP1+.12,'hm']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,TL.CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev,ev[0]-u0)});
}

/* ─────────── живой режим ───────────
   Курсор свой, но Continue его притягивает: чем ближе рука к Back, тем сильнее.
   Клик по Continue проматывает серию, и плеер спрашивает снова. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function toLocal(e){var r=frameEl.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH}}
function liveStart(){
  mode='live';document.documentElement.classList.add('live');
  LV={k:0,t0:nowS(),m:{x:START.x,y:START.y},c:{x:START.x,y:START.y},cv:{x:0,y:0},w:0,lock:false,ffT:-1,snapT:-1,clickT:-1,rot:0};
  Sound.liveHum(0,0);
}
function liveStop(){mode='auto';document.documentElement.classList.remove('live');LV=null;Sound.liveHum(0,0)}
frameEl.addEventListener('pointermove',function(e){if(mode==='live')LV.m=toLocal(e)});
frameEl.addEventListener('pointerdown',function(e){
  if(mode!=='live'||e.button>0)return;e.preventDefault();Sound.start();LV.m=toLocal(e);
  if(LV.ffT>=0)return;
  var c=LV.c,inC=c.x>CONT.x&&c.x<CONT.x+CONT.w&&c.y>CONT.y&&c.y<CONT.y+CONT.h;
  if(inC){LV.clickT=nowS();Sound.play([0,'click',LV.k]);setTimeout(function(){LV&&(LV.ffT=nowS(),Sound.play([0,'ff',.88]),Sound.play([0,'roll',LV.k],.18))},120)}
});
function liveFrame(){
  var n=nowS(),V=LV,k=V.k,A=TL.A[k],ff=ffOf(k);
  // где рука: чем ближе к Back, тем сильнее магнит
  var dB=Math.hypot(V.m.x-BC.x,V.m.y-BC.y),dC=Math.hypot(V.m.x-CDOCK.x,V.m.y-CDOCK.y);
  var near=1-c01((dB-20)/170);
  var target=V.lock?1-.35*c01((dC-60)/400):.62*Math.pow(near,1.4)*c01((dC-10)/60);
  if(!V.lock&&near>.72&&V.ffT<0){V.lock=true;V.snapT=n;Sound.play([0,'snap',k])}
  if(V.lock&&dC>300&&dB>230)V.lock=false;
  if(k===2&&V.ffT<0)target=Math.max(target,.9);
  V.w+=(target-V.w)*(V.lock?.28:.18);
  var tx=V.m.x+(CDOCK.x-V.m.x)*V.w,ty=V.m.y+(CDOCK.y-V.m.y)*V.w;
  V.cv.x=(V.cv.x+(tx-V.c.x)*.5)*.55;V.cv.y=(V.cv.y+(ty-V.c.y)*.5)*.55;V.c.x+=V.cv.x;V.c.y+=V.cv.y;
  var tr=V.lock?c01((dC-40)/200)*.8:near*.8;
  Sound.liveHum(near*.9+(V.lock?.2:0),tr);
  // берём кадр сценария как фон: диалог стоит, на третьем вопрос перепечатан
  var tt=A.in+.6;
  if(k===2)tt=Math.min(TL.TYP1+.3,TL.DEL0+(n-V.t0-.6));
  if(V.ffT>=0){var u=(n-V.ffT)/(ff[1]-ff[0]);if(u>=1){V.k=(k+1)%3;V.ffT=-1;V.t0=n;V.lock=false;V.w=k===1?1:0;Sound.play([0,'appear',V.k]);return liveFrame()}tt=mix(ff[0],ff[1],u)}
  else if(V.clickT>=0&&n-V.clickT<.2)tt=clickOf(k)+(n-V.clickT);
  var s=stateAt(clamp(tt,A.in+.3,TL.CYCLE-.01));
  if(k===2&&V.ffT<0)s.title=titleAt(tt<TL.DEL0?TL.DEL0-.01:tt);
  if(V.ffT<0&&!(V.clickT>=0&&n-V.clickT<.2)){s.dlg=sm((n-V.t0)/.25);s.dlgY=6*(1-eout((n-V.t0)/.3));}
  var c=V.c;s.cur={x:c.x+1.5*tr*Math.sin(n*TAU*23),y:c.y+1.5*tr*Math.sin(n*TAU*19+1),a:V.ffT>=0?0:1,w:V.w,e:Math.max(near,V.lock?.5:0),tr:tr};
  s.hoverBack=(c.x>BACK.x&&c.x<BACK.x+BACK.w&&c.y>BACK.y&&c.y<BACK.y+BACK.h)?1:0;
  s.hoverCont=V.w>.8&&(c.x>CONT.x&&c.x<CONT.x+CONT.w&&c.y>CONT.y&&c.y<CONT.y+CONT.h)?1:0;
  s.squash=V.snapT>0?Math.exp(-(n-V.snapT-.1)*11)*Math.cos(TAU*6*(n-V.snapT-.1))*(n-V.snapT>.1?1:0):0;
  s.black=0;
  V.rot+=(clamp(-V.cv.x*60*.00045,-.32,.32)-V.rot)*.3;
  draw(s,V.rot);
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
  COL=dark?{dark:true,dim:'rgba(0,0,0,.5)',ink:'#ffffff',sub:'rgba(255,255,255,.62)',pri:'#ffffff',priHi:'#e9e9eb',priInk:'#000000',
            sec:'rgba(255,255,255,.17)',secHi:'rgba(255,255,255,.32)',secInk:'#ffffff',track:'rgba(255,255,255,.28)',fill:'#ffffff',
            mb:'rgba(22,22,24,.62)',mbLine:'rgba(255,255,255,.08)',mbInk:'rgba(255,255,255,.92)'}
          :{dark:false,dim:'rgba(250,249,246,.6)',ink:'#0d0d0e',sub:'rgba(60,60,67,.62)',pri:'#0d0d0e',priHi:'#2c2c2e',priInk:'#ffffff',
            sec:'rgba(0,0,0,.07)',secHi:'rgba(0,0,0,.15)',secInk:'#0d0d0e',track:'rgba(0,0,0,.14)',fill:'#0d0d0e',
            mb:'rgba(246,246,246,.72)',mbLine:'rgba(0,0,0,.1)',mbInk:'rgba(0,0,0,.86)'};
  makeFrames();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused)render(uNow())}});

function fit(){
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?Math.min(w/SW,hh/SH):clamp(Math.min((hh-96)/SH,(w-32)/SW),.4,1.6);
  frameEl.style.width=SW*S+'px';frameEl.style.height=SH*S+'px';
  K=Math.min(3.2,Math.max(1,S*(window.devicePixelRatio||1)));
  cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
  if(COL.dim)makeFrames();
}

window.__seek=function(t){mode='auto';paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;

function boot(){
  fit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  layout();buildEvents();
  addEventListener('resize',fit);
  if(QS.has('t')){window.__seek(+QS.get('t'));}
  else render(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
