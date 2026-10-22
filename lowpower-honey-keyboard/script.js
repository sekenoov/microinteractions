/* ─────────── Low Power ───────────
   1% и жёлтая батарейка. Low Power Mode понят буквально: интерфейс в мёде.
   Каждая клавиша отлипает от пальца жёлтой ниткой, и каждая следующая буква
   медленнее предыдущей. «on my way» набрано, Send, пузырь ползёт из поля, палец
   тянет за собой нитку, и на этом телефон гаснет. Пустая батарейка с проводом,
   чат снова открыт, черновик так и висит в поле, а Maya пишет пачкой. Последнее: «wow.»
   Кадр считается из одного времени t, поэтому петля замыкается без шва. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function ein(p){p=c01(p);return p*p*p}
function seg(l,a,b){return c01((l-a)/(b-a))}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

/* ─────────── слова ─────────── */
var TYPE='on my way';
var KSEQ=['o','n','space','m','y','space','w','a','y'];
// r получено, m моё, d дата
var OLD=[
  ['d','Yesterday',' 6:02 PM'],
  ['r','dinner sat 8pm. don’t be late'],
  ['m','i’m never late'],
  ['d','Today',' 8:31 PM'],
  ['r','we’re here!!'],
  ['r','where are you'],
  ['m','leaving now'],
  ['r','it’s been 40 min'],
  ['r','ETA?']
];
var FLOOD=['hello??','???','answer your phone','are you alive','we ordered without you','your food is getting cold','ok we’re leaving'];
var WOW='wow.',NAME='Maya';
var CLOCK0='8:47',CLOCK1='9:26';

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,FS=21,BH=40,RX=20,MEX=382,GG=3,GX=12,DH=34,NAVB=146;
var KH=292,KBY=SH-KH,KX=3.5,KG=6,KW=(SW-2*KX-9*KG)/10,KHH=44,KP=55,KT=9;
var FX=64,FW=324,FTX=FX+16,FH=46;
var FB1=KBY-8,FB2=SH-36;                          // поле над клавиатурой и внизу, когда её нет
var VIS=850;                                      // сколько экрана видно в записи
var TAIL=new Path2D('M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z');
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

// клавиши: координаты от верха клавиатуры
var KEYS={},SPK={};
(function(){
  var rows=['qwertyuiop','asdfghjkl','zxcvbnm'],x0=[KX,KX+(KW+KG)/2,KX+1.5*(KW+KG)];
  rows.forEach(function(r,j){for(var i=0;i<r.length;i++)KEYS[r[i]]={x:x0[j]+i*(KW+KG),y:KT+j*KP,w:KW,h:KHH}});
  SPK.shift={x:KX,y:KT+2*KP,w:44,h:KHH};SPK.del={x:SW-KX-44,y:KT+2*KP,w:44,h:KHH};
  SPK.n123={x:KX,y:KT+3*KP,w:92,h:KHH};SPK.ret={x:SW-KX-92,y:KT+3*KP,w:92,h:KHH};
  SPK.space={x:KX+92+KG,y:KT+3*KP,w:SW-2*KX-184-2*KG,h:KHH};
})();

/* ─────────── время ─────────── */
// нажатия: каждое следующее в 1.2 раза медленнее, последнее это Send
var NP=KSEQ.length,PR=[];
(function(){
  var t=.08;
  for(var i=0;i<=NP;i++){
    var dt=i<NP?.15*Math.pow(1.2,i):.62,k=i/NP;
    PR.push({t0:t,dt:dt,tl:t+dt*(i<NP?.34:.4),k:k,c:i<NP?KSEQ[i]:'send',Lb:46+64*k});
    t+=dt;
  }
})();
var TL={};
TL.send=PR[NP].t0;TL.rise=TL.send+.1;TL.die=TL.send+.86;
TL.dark=TL.die+.08;TL.bat0=TL.die+.3;TL.bat1=TL.bat0+.5;TL.on0=TL.bat1+.14;TL.on1=TL.on0+.2;
TL.fl0=TL.on1+.12;TL.flDt=.115;TL.wow=TL.fl0+FLOOD.length*TL.flDt+.32;
TL.fade0=TL.wow+.65;TL.end=TL.fade0+.4;
var CYCLE=TL.end;

function kp(i){
  var c=PR[i].c;
  if(c==='send')return {x:FX+FW-22,y:FB1-23};
  if(c==='space')return {x:i===2?186:214,y:KBY+SPK.space.y+KHH/2};
  var k=KEYS[c];return {x:k.x+k.w/2,y:KBY+k.y+k.h/2};
}
// палец: висит над «o», жмёт, отлипает и дугой переходит к следующей клавише
function fingerAt(t){
  var q=kp(0);
  if(t<PR[0].t0)return {x:q.x,y:q.y-14*(1-eout(seg(t,-.1,PR[0].t0))),p:sm(seg(t,PR[0].t0-.05,PR[0].t0))};
  for(var i=0;i<=NP;i++){
    var P=PR[i];q=kp(i);
    if(t<P.tl)return {x:q.x,y:q.y,p:1};
    // от Send палец уходит вниз и влево, нитка тянется над клавиатурой
    if(i===NP){var u=seg(t,P.tl,TL.die),e=1-Math.pow(1-u,1.6);return {x:q.x-50*e,y:q.y+64*e,p:1-sm(u/.3)}}
    var N=PR[i+1];
    if(t<N.t0){
      var v=seg(t,P.tl,N.t0),q2=kp(i+1),e=eio(v),H=26+40*P.k;
      return {x:mix(q.x,q2.x,e),y:mix(q.y,q2.y,e)-H*Math.sin(Math.PI*v),p:Math.max(1-sm(v/.22),sm(seg(v,.84,1)))};
    }
  }
  return {x:q.x,y:q.y,p:0};
}
// где рвётся нитка: палец ушёл от клавиши дальше Lb
function buildBreaks(){
  var r=rng(7);
  for(var i=0;i<NP;i++){
    var P=PR[i],A=kp(i),N=PR[i+1],tb=mix(P.tl,N.t0,.9);
    for(var t=P.tl;t<N.t0;t+=1/480){var F=fingerAt(t);if(Math.hypot(F.x-A.x,F.y-A.y)>=P.Lb){tb=t;break}}
    var F2=fingerAt(tb);
    P.tb=tb;P.rt=.16+.14*P.k;P.F=F2;
    P.M={x:mix(A.x,F2.x,.42),y:mix(A.y,F2.y,.42)};
    // капля остаётся на клавише чуть ниже центра
    P.blob={x:A.x+(r()-.5)*6,y:A.y+4+(r()-.5)*3,r:7+4*P.k};
  }
}

/* ─────────── холст ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),X=ctx,COL={},KDPR=1,S=1;
function font(sz,wt,fam){return(wt||400)+' '+sz+'px '+(fam||FONT)}
function setFont(sz,wt,ls,fam){X.font=font(sz,wt,fam);if('letterSpacing'in X)X.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
function tw(s,sz,wt,ls){var o=X;X=ctx;setFont(sz||FS,wt,ls);var w=ctx.measureText(s).width;X=o;return w}
function rr(x,y,w,h,r){X.beginPath();X.roundRect(x,y,w,h,r)}

var TYW=0,CHW=[];
function measure(){
  TYW=Math.round(tw(TYPE)+30);
  CHW=[];for(var i=0;i<=TYPE.length;i++)CHW.push(tw(TYPE.slice(0,i)));
}

/* ─────────── лента: снизу вверх, у каждого сообщения своя доля слота g ─────────── */
function gapB(a,b){return b.type==='d'?GX:a.type==='d'?0:a.type===b.type?GG:GX}
function stack(items,bottom){
  var y=bottom;
  for(var i=items.length-1;i>=0;i--){
    var it=items[i];it.h=it.type==='d'?DH:BH;
    var gA=i>0?gapB(items[i-1],it):0;
    it.y=y-it.h+(1-it.g)*(it.h+gA);
    y-=(it.h+gA)*it.g;
  }
  // хвостик только у последнего в серии, у предыдущего он гаснет по мере въезда нового
  for(i=0;i<items.length;i++){
    var nx=items[i+1];
    items[i].tail=nx&&nx.type===items[i].type?1-nx.g:1;
  }
  return items;
}
function oldItems(){return OLD.map(function(o){return {type:o[0],s:o[1],s2:o[2],g:1}})}
function lay1(t){
  var it=oldItems(),p=riseAt(t);
  it.push({type:'m',s:TYPE,g:p,rise:true});
  return stack(it,FB1-FH-14);
}
function lay2(t){
  var it=oldItems();
  FLOOD.forEach(function(s,j){var t0=TL.fl0+j*TL.flDt;it.push({type:'r',s:s,g:eout(seg(t,t0,t0+.12)),t0:t0})});
  it.push({type:'r',s:WOW,g:eout(seg(t,TL.wow,TL.wow+.18)),t0:TL.wow,wow:true});
  return stack(it,FB2-FH-14);
}
function riseAt(t){var u=seg(t,TL.rise,TL.die);return .42*(1-Math.pow(1-u,1.7))}

/* ─────────── отрисовка ─────────── */
function bubble(x,y,w,h,me,col,tail){
  X.fillStyle=col;rr(x,y,w,h,Math.min(20,h/2));X.fill();
  if(tail>.004){
    X.save();X.globalAlpha*=tail;
    if(me){X.translate(x+w+6,y+h-20);X.scale(-1,1)}else X.translate(x-6,y+h-20);
    X.fill(TAIL);X.restore();
  }
}
function textMsg(x,y,s,me,tail){
  setFont(FS);var w=X.measureText(s).width+30;
  if(me)x=MEX-w;
  bubble(x,y,w,BH,me,me?COL.blue:COL.recv,tail);
  X.fillStyle=me?'#fff':COL.ink;X.textBaseline='middle';X.textAlign='left';X.fillText(s,x+15,y+BH/2+1);
  return w;
}
function drawDate(top,head,rest){
  X.textBaseline='middle';X.textAlign='left';
  setFont(13,600,0);var w1=X.measureText(head).width;setFont(13,400,0);var w2=X.measureText(rest).width,x=SW/2-(w1+w2)/2,y=top+DH/2;
  X.fillStyle=COL.sub;setFont(13,600,0);X.fillText(head,x,y);setFont(13,400,0);X.fillText(rest,x+w1,y);
}
function drawItems(items,t){
  items.forEach(function(it){
    if(it.rise||it.g<=.001||it.y>SH||it.y+it.h<NAVB-40)return;
    if(it.type==='d'){drawDate(it.y,it.s,it.s2);return}
    if(it.t0!=null){
      // входящее выскакивает из левого нижнего угла
      var d=t-it.t0,s=it.wow?spring(d,.42,3.6):spring(d,.5,5.2);
      X.save();X.translate(RX,it.y+BH);X.scale(s,s);X.translate(-RX,-(it.y+BH));
      textMsg(RX,it.y,it.s,false,it.tail);X.restore();return;
    }
    textMsg(RX,it.y,it.s,it.type==='m',it.tail);
  });
}

// статус-бар: Low Power, 1% и жёлтая батарейка, после включения 2% с молнией
function drawStatus(after){
  X.fillStyle=COL.ink;X.textBaseline='alphabetic';X.textAlign='left';setFont(17,600,-.34);X.fillText(after?CLOCK1:CLOCK0,52,37);
  X.save();X.translate(282,24);
  [[0,8.5,4],[5,6,6.5],[10,3.5,9],[15,.5,12]].forEach(function(b){rr(b[0],b[1],3,b[2],.8);X.fill()});
  X.restore();
  X.save();X.translate(344,24);
  setFont(15,600,-.2);X.textAlign='right';X.textBaseline='alphabetic';X.fillText(after?'2%':'1%',-5,12.5);
  X.strokeStyle=COL.ink;X.globalAlpha=.4;X.lineWidth=1;rr(.5,.5,25,12,3.6);X.stroke();
  X.globalAlpha=.4;rr(26.6,4.3,1.6,4.2,.8);X.fill();
  X.globalAlpha=1;X.fillStyle=COL.yellow;rr(2.5,2.5,after?3.4:2.4,8,1.4);X.fill();
  if(after){
    X.fillStyle=COL.ink;
    X.fill(new Path2D('M14.6 1.4L8.6 7.4h3.6l-1.6 4.8 6-6.2h-3.6z'));
  }
  X.restore();
}
function drawHeader(){
  X.fillStyle=COL.card;X.fillRect(0,0,SW,NAVB);
  X.fillStyle=COL.line;X.fillRect(0,NAVB-.5,SW,.5);
  X.fillStyle=COL.plus;X.beginPath();X.arc(38,86,22,0,7);X.fill();X.beginPath();X.arc(364,86,22,0,7);X.fill();
  X.strokeStyle=COL.ink;X.lineWidth=2.2;X.lineCap='round';X.lineJoin='round';
  X.beginPath();X.moveTo(41.5,79.5);X.lineTo(35,86);X.lineTo(41.5,92.5);X.stroke();
  X.lineWidth=1.7;rr(352.5,80,14,12,3);X.stroke();
  X.beginPath();X.moveTo(366.5,84.6);X.lineTo(372.5,81.2);X.lineTo(372.5,90.8);X.lineTo(366.5,87.4);X.closePath();X.stroke();
  X.fillStyle=COL.ava;X.beginPath();X.arc(201,83,27,0,7);X.fill();
  X.fillStyle='#fff';X.textAlign='center';X.textBaseline='middle';setFont(24,600,-.24);X.fillText('M',201,84);
  setFont(13,400,0);X.fillStyle=COL.ink;var nw=X.measureText(NAME).width;X.fillText(NAME,201-4,124);
  X.strokeStyle=COL.sub;X.lineWidth=1.6;X.beginPath();X.moveTo(201-4+nw/2+3,120.5);X.lineTo(201-4+nw/2+6.5,124);X.lineTo(201-4+nw/2+3,127.5);X.stroke();
}
function drawMic(x,y){
  X.save();X.strokeStyle=COL.sub;X.lineWidth=1.7;X.lineCap='round';
  rr(x-3,y-8,6,10,3);X.stroke();
  X.beginPath();X.arc(x,y-1,5.5,.15,Math.PI-.15);X.moveTo(x,y+4.5);X.lineTo(x,y+7);X.stroke();X.restore();
}
function sendBtn(x,y,sc){
  if(sc<=.004)return;
  X.save();X.translate(x,y);X.scale(sc,sc);
  X.fillStyle=COL.blue;X.beginPath();X.arc(0,0,17,0,7);X.fill();
  X.strokeStyle='#fff';X.lineWidth=2.3;X.lineCap='round';X.lineJoin='round';
  X.beginPath();X.moveTo(0,5.6);X.lineTo(0,-5.2);X.moveTo(-4.8,-.6);X.lineTo(0,-5.4);X.lineTo(4.8,-.6);X.stroke();
  X.restore();
}
// сколько букв набрано и когда появилась последняя
function typedAt(t){
  var n=0,ta=-9;
  for(var i=0;i<NP;i++)if(t>=PR[i].t0){n=i+1;ta=PR[i].t0}
  return {n:n,ta:ta,k:n?PR[n-1].k:0};
}
function drawComposer(fb,t,after){
  var ft=fb-FH,ty=ft+FH/2+1;
  X.fillStyle=COL.card;X.fillRect(0,ft-8,SW,(after?SH:KBY)-ft+8);
  X.fillStyle=COL.plus;X.beginPath();X.arc(35,fb-23,21,0,7);X.fill();
  X.strokeStyle=COL.sub;X.lineWidth=1.8;X.lineCap='round';X.beginPath();X.moveTo(35,fb-28.5);X.lineTo(35,fb-17.5);X.moveTo(29.5,fb-23);X.lineTo(40.5,fb-23);X.stroke();
  X.fillStyle=COL.card;rr(FX,ft,FW,FH,23);X.fill();
  X.strokeStyle=COL.line;X.lineWidth=.75;rr(FX+.375,ft+.375,FW-.75,FH-.75,22.6);X.stroke();
  setFont(FS);X.textBaseline='middle';X.textAlign='left';
  if(after){
    // черновик так и висит, отправить не успели
    X.fillStyle=COL.ink;X.fillText(TYPE,FTX,ty);sendBtn(FX+FW-22,fb-23,1);return;
  }
  var T=typedAt(t),sent=t>=TL.send+.06;
  if(sent){
    X.save();X.globalAlpha=sm(seg(t,TL.send+.25,TL.die));X.fillStyle=COL.sub2;X.fillText('iMessage',FTX,ty);X.restore();
  }else if(!T.n){
    X.fillStyle=COL.sub2;X.fillText('iMessage',FTX,ty);
  }else{
    // последняя буква вытекает из строки вверх медленнее предыдущих
    X.fillStyle=COL.ink;X.fillText(TYPE.slice(0,T.n-1),FTX,ty);
    var ch=TYPE[T.n-1],s=spring(t-T.ta,.62,mix(3.4,1.5,T.k));
    X.save();X.translate(FTX+CHW[T.n-1],ty+8);X.scale(mix(1.18,1,c01(s)),Math.max(.02,s));X.fillText(ch,0,-8);X.restore();
  }
  if(!sent){
    var cx=FTX+(T.n?CHW[T.n]:0)+1,blink=t-T.ta<.45?1:.5+.5*Math.cos((t-T.ta-.45)*Math.PI*2/1.3);
    X.save();X.globalAlpha=sm(blink*1.6-.3);X.fillStyle=COL.blue;rr(cx,ty-13,2,25,1);X.fill();X.restore();
  }
  if(!T.n)drawMic(FX+FW-23,fb-23);
  else{
    var P=PR[NP],pr=t>=P.t0?(t<P.tl?sm(seg(t,P.t0,P.t0+.12)):1-sm(seg(t,P.tl,P.tl+.4))):0;
    var sc=spring(t-PR[0].t0,.6,2.2)*(1-.16*pr);
    sendBtn(FX+FW-22,fb-23,sc);
  }
}

/* клавиатура */
function keyRect(k,ky,fill){
  X.fillStyle=COL.keysh;rr(k.x,ky+k.y+1,k.w,k.h,5.5);X.fill();
  X.fillStyle=fill;rr(k.x,ky+k.y,k.w,k.h,5.5);X.fill();
}
function drawKeyboard(ky,spaceDown){
  X.fillStyle=COL.kb;X.fillRect(0,ky,SW,SH-ky);
  setFont(23,400,0);X.textBaseline='middle';X.textAlign='center';
  for(var c in KEYS){var k=KEYS[c];keyRect(k,ky,COL.key);X.fillStyle=COL.keyink;X.fillText(c,k.x+k.w/2,ky+k.y+k.h/2-1)}
  keyRect(SPK.shift,ky,COL.key2);keyRect(SPK.del,ky,COL.key2);
  keyRect(SPK.n123,ky,COL.key2);keyRect(SPK.ret,ky,COL.key2);keyRect(SPK.space,ky,spaceDown?COL.key2:COL.key);
  setFont(16,400,0);X.fillStyle=COL.keyink;
  [['n123','123'],['ret','return'],['space','space']].forEach(function(q){var k=SPK[q[0]];X.fillText(q[1],k.x+k.w/2,ky+k.y+k.h/2)});
  X.strokeStyle=COL.keyink;X.lineWidth=1.6;X.lineJoin='round';X.lineCap='round';
  var s=SPK.shift,cx=s.x+s.w/2,cy=ky+s.y+s.h/2;
  X.beginPath();X.moveTo(cx,cy-9);X.lineTo(cx+9,cy+.5);X.lineTo(cx+4.5,cy+.5);X.lineTo(cx+4.5,cy+8);X.lineTo(cx-4.5,cy+8);X.lineTo(cx-4.5,cy+.5);X.lineTo(cx-9,cy+.5);X.closePath();X.stroke();
  var d=SPK.del;cx=d.x+d.w/2+1;cy=ky+d.y+d.h/2;
  X.beginPath();X.moveTo(cx-12,cy);X.lineTo(cx-5.5,cy-8);X.lineTo(cx+11,cy-8);X.lineTo(cx+11,cy+8);X.lineTo(cx-5.5,cy+8);X.closePath();X.stroke();
  X.beginPath();X.moveTo(cx-1,cy-3.6);X.lineTo(cx+6.2,cy+3.6);X.moveTo(cx+6.2,cy-3.6);X.lineTo(cx-1,cy+3.6);X.stroke();
  var by=ky+KT+3*KP+KHH+36;
  X.strokeStyle=COL.sub;X.fillStyle=COL.sub;X.lineWidth=1.7;
  X.beginPath();X.arc(34,by,11,0,7);X.stroke();
  X.beginPath();X.arc(30,by-3,1.4,0,7);X.arc(38,by-3,1.4,0,7);X.fill();
  X.beginPath();X.arc(34,by+1,5.5,.25,Math.PI-.25);X.stroke();
  var mx=SW-34;rr(mx-4,by-11,8,13,4);X.stroke();
  X.beginPath();X.arc(mx,by-2,7,.15,Math.PI-.15);X.moveTo(mx,by+5);X.lineTo(mx,by+9);X.stroke();
}
function drawPopup(ch,ky,a){
  var k=KEYS[ch];if(!k||a<=.004)return;
  var x=k.x,y=ky+k.y,w=k.w,h=k.h,ex=11,th=56,ty=y-th+2;
  X.save();X.globalAlpha=a;
  X.shadowColor='rgba(0,0,0,.28)';X.shadowBlur=7*KDPR;X.shadowOffsetY=KDPR;
  X.fillStyle=COL.key;
  X.beginPath();
  X.moveTo(x-ex+10,ty);X.lineTo(x+w+ex-10,ty);X.quadraticCurveTo(x+w+ex,ty,x+w+ex,ty+10);
  X.lineTo(x+w+ex,ty+th-24);X.bezierCurveTo(x+w+ex,ty+th-10,x+w,ty+th-8,x+w,y+12);
  X.lineTo(x+w,y+h-5.5);X.quadraticCurveTo(x+w,y+h,x+w-5.5,y+h);X.lineTo(x+5.5,y+h);X.quadraticCurveTo(x,y+h,x,y+h-5.5);
  X.lineTo(x,y+12);X.bezierCurveTo(x,ty+th-8,x-ex,ty+th-10,x-ex,ty+th-24);
  X.lineTo(x-ex,ty+10);X.quadraticCurveTo(x-ex,ty,x-ex+10,ty);X.closePath();X.fill();
  X.shadowColor='transparent';
  setFont(33,400,0);X.fillStyle=COL.keyink;X.textBaseline='middle';X.textAlign='center';X.fillText(ch,x+w/2,ty+22);
  X.restore();
}

/* ─────────── мёд ─────────── */
// нитка от A к B: толстые основания, тонкая шейка, провисает вниз
function strand(ax,ay,bx,by,ra,rb,neck,sag){
  var N=28,L=[],R=[],dx=bx-ax,dy=by-ay;
  for(var i=0;i<=N;i++){
    var u=i/N,cx=ax+dx*u,cy=ay+dy*u+sag*4*u*(1-u);
    var tx=dx,ty=dy+sag*4*(1-2*u),tl=Math.hypot(tx,ty)||1,nx=-ty/tl,ny=tx/tl;
    var h=neck+(ra-neck)*Math.pow(1-u,3.2)+(rb-neck)*Math.pow(u,3.2);
    L.push(cx+nx*h,cy+ny*h);R.push(cx-nx*h,cy-ny*h);
  }
  var p=new Path2D();p.moveTo(L[0],L[1]);
  for(i=2;i<L.length;i+=2)p.lineTo(L[i],L[i+1]);
  for(i=R.length-2;i>=0;i-=2)p.lineTo(R[i],R[i+1]);
  p.closePath();
  if(ra>.3){p.moveTo(ax+ra,ay);p.arc(ax,ay,ra,0,7)}
  if(rb>.3){p.moveTo(bx+rb,by);p.arc(bx,by,rb,0,7)}
  X.save();
  X.fillStyle=COL.honey;X.globalAlpha=.94;X.fill(p,'nonzero');
  X.globalAlpha=1;X.strokeStyle=COL.honeyEdge;X.lineWidth=.6;X.stroke(p);
  // блик по одной стороне нитки
  if(neck>.9){
    X.strokeStyle=COL.honeyHi;X.lineWidth=Math.min(2,neck*.42);X.lineCap='round';X.beginPath();
    for(i=5;i<=N-5;i++){
      var u2=i/N,h2=neck+(ra-neck)*Math.pow(1-u2,3.2)+(rb-neck)*Math.pow(u2,3.2);
      var cx2=ax+dx*u2,cy2=ay+dy*u2+sag*4*u2*(1-u2),tx2=dx,ty2=dy+sag*4*(1-2*u2),tl2=Math.hypot(tx2,ty2)||1;
      var px=cx2-ty2/tl2*h2*.45,py=cy2+tx2/tl2*h2*.45;
      if(i===5)X.moveTo(px,py);else X.lineTo(px,py);
    }
    X.stroke();
  }
  X.restore();
}
// лужица на клавише: прозрачная, буква видна сквозь мёд
function blob(x,y,r,a){
  if(r<=.2||a<=.004)return;
  var p=new Path2D();
  p.ellipse(x,y,r*1.15,r*.7,-.08,0,7);
  p.moveTo(x+r*1.3+r*.42,y+r*.32);p.ellipse(x+r*1.3,y+r*.32,r*.42,r*.3,0,0,7);
  p.moveTo(x-r*.55+r*.5,y+r*.55);p.ellipse(x-r*.55,y+r*.55,r*.5,r*.32,.2,0,7);
  X.save();X.globalAlpha=a*.78;X.fillStyle=COL.honey;X.fill(p);
  X.globalAlpha=a*.8;X.strokeStyle=COL.honeyEdge;X.lineWidth=.6;X.stroke(p);
  X.globalAlpha=a;X.fillStyle=COL.honeyHi;X.beginPath();X.ellipse(x-r*.4,y-r*.28,r*.42,r*.15,-.12,0,7);X.fill();
  X.restore();
}
function drawHoney(t){
  var F=fingerAt(t);
  for(var i=0;i<NP;i++){
    var P=PR[i],A=kp(i);
    if(t<P.tl)continue;
    if(t<P.tb){
      var d=Math.hypot(F.x-A.x,F.y-A.y),k=c01(d/P.Lb);
      strand(A.x,A.y,F.x,F.y,mix(11,8.5,k),mix(10,7,k),.6+7.4*Math.pow(1-k,1.4),4+.12*d);
      continue;
    }
    // разрыв: нижний обрывок втягивается в каплю, верхний в палец
    var r=seg(t,P.tb,P.tb+P.rt),e=eout(r),B=P.blob;
    if(r<1){
      var M=P.M,mx=mix(M.x,A.x,e),my=mix(M.y,A.y,e)+10*Math.sin(Math.PI*r)*(1-r);
      strand(A.x,A.y,mx,my,mix(7,B.r,e),1.6*(1-r),.55*(1-r)+.2,2);
      if(t<PR[i+1].t0+.05){
        var ux=F.x+(M.x-P.F.x)*.9*(1-e),uy=F.y+(M.y-P.F.y)*.9*(1-e);
        strand(F.x,F.y,ux,uy,6*(1-e),1.2*(1-r),.5*(1-r)+.2,-1);
      }
    }
    blob(B.x,B.y,B.r*mix(.8,1,e),1);
  }
  // Send: нитка тянется за пальцем и уже не рвётся
  var S2=PR[NP];
  if(t>=S2.tl){
    var A2=kp(NP),d2=Math.hypot(F.x-A2.x,F.y-A2.y),k2=c01(d2/96);
    strand(A2.x,A2.y,F.x,F.y,mix(12,9,k2),mix(10,8,k2),.9+7*Math.pow(1-k2,1.3),3+.1*d2);
  }
}
// капли на клавишах до этой минуты (рисуются до попапа)
function drawResidue(t){
  for(var i=0;i<NP;i++){var P=PR[i];if(t>=P.tb+P.rt)blob(P.blob.x,P.blob.y,P.blob.r,1)}
}

function drawTouch(x,y,a,p){
  if(a<=.004)return;
  X.save();X.globalAlpha=a;X.fillStyle='rgba(120,120,128,.34)';X.strokeStyle='rgba(255,255,255,.6)';X.lineWidth=1.5;
  X.beginPath();X.arc(x,y,23*(1-.16*p),0,7);X.fill();X.stroke();X.restore();
}

// пузырь, который не долетел
function drawRising(t,items){
  if(t<TL.send+.06)return;
  var p=riseAt(t),e=p/.42;
  var x0=FX+1,y0=FB1-FH+3,x1=MEX-TYW,y1=FB1-FH-14-BH;
  var x=mix(x0,x1,eout(e)),y=mix(y0,y1,p);
  X.save();
  bubble(x,y,TYW,BH,true,COL.blue,sm(e));
  setFont(FS);X.fillStyle='#fff';X.textBaseline='middle';X.textAlign='left';X.fillText(TYPE,x+15,y+BH/2+1);
  X.restore();
}

function phase1(t){
  var items=lay1(t),F=fingerAt(t);
  X.fillStyle=COL.card;X.fillRect(0,0,SW,SH);
  drawItems(items,t);
  drawHeader();
  drawComposer(FB1,t,false);
  var spaceDown=false,pop=null,pa=0;
  for(var i=0;i<NP;i++){
    var P=PR[i];
    if(t>=P.t0&&t<P.tl+.06){
      var a=1-sm(seg(t,P.tl,P.tl+.06));
      if(P.c==='space')spaceDown=a>.5;else{pop=P.c;pa=a}
    }
  }
  drawKeyboard(KBY,spaceDown);
  drawResidue(t);
  if(pop)drawPopup(pop,KBY,pa);
  drawRising(t,items);
  drawTouch(F.x,F.y,1,F.p);
  drawHoney(t);
  drawStatus(false);
}
function phase2(t){
  var items=lay2(t);
  var dn=t-TL.wow-.05,sh=dn>0&&dn<.32?2.6*Math.exp(-dn*15)*Math.sin(dn*72):0;
  X.fillStyle=COL.card;X.fillRect(0,0,SW,SH);
  X.save();if(sh)X.translate(0,sh);
  drawItems(items,t);
  drawHeader();
  drawComposer(FB2,t,true);
  X.restore();
  drawStatus(true);
}
// разряженный телефон: пустая батарейка и провод
function drawDead(a){
  X.fillStyle='#000';X.fillRect(0,0,SW,SH);
  if(a<=.004)return;
  X.save();X.globalAlpha=a;
  var cx=201,cy=380,w=150,h=68;
  X.strokeStyle='#e8e8ea';X.lineWidth=5;rr(cx-w/2,cy-h/2,w,h,15);X.stroke();
  X.fillStyle='#e8e8ea';rr(cx+w/2+5,cy-13,7,26,3.5);X.fill();
  X.fillStyle=COL.red;rr(cx-w/2+8,cy-h/2+8,10,h-16,4);X.fill();
  // провод снизу, разъём смотрит вверх
  var py=cy+h/2+62;
  X.fillStyle='#e8e8ea';rr(cx-7,py,14,22,2.5);X.fill();
  rr(cx-11,py+22,22,30,5);X.fill();
  X.fillRect(cx-3.5,py+52,7,60);
  X.restore();
}
function scene(t){
  if(t<TL.die){phase1(t);return}
  if(t<TL.dark){phase1(TL.die);X.fillStyle='rgba(0,0,0,'+sm(seg(t,TL.die,TL.dark)).toFixed(3)+')';X.fillRect(0,0,SW,SH);return}
  if(t<TL.on0){drawDead(sm(seg(t,TL.bat0,TL.bat0+.1))*(1-sm(seg(t,TL.bat1-.1,TL.bat1))));return}
  phase2(t);
  var b=1-sm(seg(t,TL.on0,TL.on1));
  if(b>.004){X.fillStyle='rgba(0,0,0,'+b.toFixed(3)+')';X.fillRect(0,0,SW,SH)}
}
// камера: медленный наезд на клавиатуру, пока всё вязнет, в темноте назад
var ZM=1.3,CAMY=250;
function camAt(t){var e=t<TL.dark?eio(seg(t,.35,TL.die)):0;return {z:1+(ZM-1)*e,y:CAMY*e}}
function render(t){
  if(REC||STILL){var C=camAt(t>=TL.fade0?TL.fade0:t);set(zoom,'transform','translateY('+(-C.y*S*C.z).toFixed(2)+'px) scale('+(S*C.z).toFixed(4)+')')}
  ctx.setTransform(KDPR,0,0,KDPR,0,0);X=ctx;
  if(t>=TL.fade0){
    var k=seg(t,TL.fade0,TL.end),a=k<.5?sm(k*2):1-sm(k*2-1);
    scene(k<.5?TL.fade0:0);
    ctx.fillStyle=COL.card;ctx.globalAlpha=a;ctx.fillRect(0,0,SW,SH);ctx.globalAlpha=1;
    return;
  }
  scene(t);
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function panX(x){return clamp((x/SW-.5)*.7,-.6,.6)}
function buildEvents(){
  EVENTS=[];
  for(var i=0;i<NP;i++){
    var P=PR[i],x=panX(kp(i).x);
    EVENTS.push([P.t0,'key',i,x],[P.tl,'peel',P.tb-P.tl,i,x],[P.tb,'drip',i,x]);
  }
  var S2=PR[NP];
  EVENTS.push([S2.t0,'press'],[TL.rise,'ooze',TL.die-TL.rise],[S2.tl,'peel',TL.die-S2.tl,NP,.35]);
  EVENTS.push([TL.die,'die'],[TL.bat0,'plug'],[TL.on0,'wake']);
  FLOOD.forEach(function(s,j){EVENTS.push([TL.fl0+j*TL.flDt,'recv',j])});
  EVENTS.push([TL.wow,'wow']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(!paused)acc+=dt;
  var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
  render(u);
  if(!REC&&!paused)fireBetween(lastU,u);
  lastU=u;
  if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  requestAnimationFrame(tick);
}
function replay(){Sound.start();paused=false;acc=0;lastU=0}
document.getElementById('play').onclick=replay;
var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom');
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;replay()});
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
  var cs=getComputedStyle(document.documentElement),g=function(k){return cs.getPropertyValue(k).trim()};
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),sub2:g('--sub-2'),line:g('--line'),blue:g('--blue'),recv:g('--recv'),plus:g('--plus'),ava:g('--ava'),
       kb:g('--kb'),key:g('--key'),key2:g('--key2'),keysh:g('--keysh'),keyink:g('--keyink'),
       yellow:g('--yellow'),honey:g('--honey'),honeyEdge:g('--honey-edge'),honeyHi:g('--honey-hi'),red:g('--red')};
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?(hh-40)/(VIS+11):clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  KDPR=S*(REC||STILL?ZM:1)*Math.min(3,devicePixelRatio||1);
  var bw=Math.round(SW*KDPR),bh=Math.round(SH*KDPR);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  KDPR=bw/SW;
}

window.__seek=function(t){paused=true;acc=t;render(uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();measure();buildBreaks();buildEvents();
  window.__TL=TL;window.__PR=PR;
  addEventListener('resize',fit);
  // первый кадр сразу, чтобы запись не начиналась с пустого экрана
  render(((PH%CYCLE)+CYCLE)%CYCLE);
  if(STILL&&QS.has('t')){paused=true;acc=+QS.get('t');render(uNow())}
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
