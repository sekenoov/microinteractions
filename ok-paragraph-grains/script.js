/* ─────────── ok ───────────
   Спрашиваешь «can we talk?». Под тремя точками у Alex из зёрен собирается длинный честный ответ:
   каждая буква вылетает горсткой из точек и садится на место, пузырь растёт строка за строкой.
   Потом зажатый backspace: текст с конца всё быстрее втягивается обратно в точки, точки набиты
   и дрожат, и из всех зёрен разом собирается плотное «ok».
   Кадр считается из раунда и момента t: у каждого зерна своё время вылета, посадки и возврата,
   поэтому петля замыкается без шва и пишется по виртуальному времени. В живом режиме Alex печатает,
   пока держишь палец, и стирает всё, когда отпускаешь. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
// пружинный выход на 1 с перелётом: размер пузыря, появление
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}
// выход с перелётом для посадки «ok»
function eback(p){p=c01(p);var c1=1.5,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)}

var ASK='can we talk?',OK='ok',READ_AT='11:52 PM';
var DRAFT='honestly? yes. I’ve wanted to say this for weeks. I always feel like the one who plans everything, and when I bring it up you change the subject. I’m not mad. I just miss how it was.';

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,YB=768,RX=20,MEX=382,BH=40,GQ=12,GL=21,GB=16,KMIN=-6;
var PADX=15,PADT=7,LH=26,TW=262,PILL=66,DOTY=YB-20,DOTX=[RX+18,RX+33,RX+48],DR=5;
var N0={x:RX+4,y:YB-4};
var K1={x:RX+2,y:YB-1,r:7},K2={x:RX-5,y:YB+7.5,r:3.5};
var FIELDTXT={x:64+16,y:786+9};
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z';
var FONT='21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',LS=-.012*21,BASE=20.5;
// темп: набор целиком, пауза на прочтение, зажатый backspace
var TYPE_D=4.6,HOLD_D=1.5,DEL_D=1.05,LAG=.22;

var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom');
var thread=document.getElementById('thread'),cv=document.getElementById('grain'),cx=cv.getContext('2d');
var typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),ph=document.getElementById('ph'),mic=document.getElementById('mic'),sendBtn=document.getElementById('send');
var TAIL2D=null;

function tailSvg(me){return '<svg class="tail" viewBox="0 0 20 20" aria-hidden="true"><path d="'+TAILP+'"'+(me?' transform="matrix(-1 0 0 1 20 0)"':'')+'/></svg>'}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}

/* блоки ленты: k < 0 старые обмены, 0 текущий */
var BL={};
for(var k=KMIN;k<=0;k++){
  var q=h('div','msg me');q.innerHTML=esc(ASK)+tailSvg(1);
  var r=h('div','msg them');r.innerHTML='<span class="t"></span>'+tailSvg(0);
  thread.appendChild(q);thread.appendChild(r);
  BL[k]={q:q,r:r,rt:r.querySelector('.t'),word:null};
}
var LBA=h('div','lbl'),LBB=h('div','lbl');thread.appendChild(LBA);thread.appendChild(LBB);
LBB.innerHTML='<b>Read</b> '+READ_AT;
var probe=h('div','msg them');probe.style.visibility='hidden';thread.appendChild(probe);
var QW=0,OKW=0,LW={};
function measure(){
  QW=BL[0].q.offsetWidth;probe.textContent=OK;OKW=probe.offsetWidth;
  LBA.innerHTML='Delivered';LW.d=LBA.offsetWidth;LBA.innerHTML='<b>Read</b> '+READ_AT;LW.r=LBA.offsetWidth;
}

/* ─────────── текст в зёрна ───────────
   Черновик раскладывается по строкам шириной пузыря, рисуется крупно и снимается сеткой
   с дрожью: каждое зерно знает свою букву. «ok» снимается гуще, туда садятся все зёрна сразу. */
var N=DRAFT.length,CL,CX1,Wm,NLm,NP=0,PX,PY,PC,PD,P1,P2,P3,P4,OX,OY;
function textCtx(c){var x=c.getContext('2d',{willReadFrequently:true});x.font=FONT;if('letterSpacing' in x)x.letterSpacing=LS+'px';return x}
function sampleText(lines,step,seed){
  var K=4,c=document.createElement('canvas');c.width=Math.ceil((TW+20)*K);c.height=Math.ceil(lines.length*LH*K);
  var x=textCtx(c);x.font=FONT.replace('21px',(21*K)+'px');if('letterSpacing' in x)x.letterSpacing=(LS*K)+'px';
  x.fillStyle='#000';lines.forEach(function(s,l){x.fillText(s,0,(l*LH+BASE)*K)});
  var d=x.getImageData(0,0,c.width,c.height).data,R=rng(seed),out=[];
  for(var y=step/2;y<lines.length*LH;y+=step)for(var xx=step/2;xx<TW+20;xx+=step){
    var px=xx+(R()-.5)*step*.7,py=y+(R()-.5)*step*.7,i=(Math.round(py*K)*c.width+Math.round(px*K))*4+3;
    if(d[i]>120)out.push(px,py);
  }
  return out;
}
function layout(){
  var x=textCtx(document.createElement('canvas')),words=DRAFT.split(' '),lines=[],cur='';
  words.forEach(function(w){var t=cur?cur+' '+w:w;if(cur&&x.measureText(t).width>TW){lines.push(cur);cur=w}else cur=t});
  lines.push(cur);
  CL=new Int16Array(N);CX1=new Float32Array(N);var CX0=new Float32Array(N),c=0,ls=[];
  lines.forEach(function(s,l){
    ls.push(c);
    for(var j=0;j<s.length;j++){CL[c]=l;CX0[c]=x.measureText(s.slice(0,j)).width;CX1[c]=x.measureText(s.slice(0,j+1)).width;c++}
    // пробел на переносе остаётся в конце строки
    if(c<N){CL[c]=l;CX0[c]=CX1[c]=x.measureText(s).width;c++}
  });
  Wm=new Float32Array(N+1);NLm=new Int16Array(N+1);
  for(c=1;c<=N;c++){Wm[c]=Math.max(Wm[c-1],CX1[c-1]);NLm[c]=CL[c-1]+1}

  var S=sampleText(lines,1.15,7);NP=S.length/2;
  PX=new Float32Array(NP);PY=new Float32Array(NP);PC=new Int16Array(NP);PD=new Uint8Array(NP);
  P1=new Float32Array(NP);P2=new Float32Array(NP);P3=new Float32Array(NP);P4=new Float32Array(NP);OX=new Float32Array(NP);OY=new Float32Array(NP);
  var O=sampleText([OK],.8,13),NO=O.length/2,R=rng(11);
  for(var i=0;i<NP;i++){
    var px=S[i*2],py=S[i*2+1],l=clamp(Math.floor(py/LH),0,lines.length-1),ci=ls[l];
    while(ci<N-1&&CL[ci+1]===l&&CX1[ci]<px)ci++;
    PX[i]=px;PY[i]=py;PC[i]=ci;
    P1[i]=R();P2[i]=R();P3[i]=R();P4[i]=R();
    PD[i]=(ci+(P4[i]<.25?1:0))%3;
    var j=(i*7919)%NO;OX[i]=O[j*2]+(R()-.5)*.7;OY[i]=O[j*2+1]+(R()-.5)*.7;
  }
}

/* ─────────── темп набора ───────────
   Внутри слова быстро, на пробеле чуть дольше, после точки и запятой задумывается.
   Смещения считаются один раз и растягиваются на TYPE_D; живой режим идёт по ним же. */
var OFF;
function typeOffsets(){
  OFF=new Float64Array(N);var t=0,R=rng(5);
  for(var c=0;c<N;c++){
    OFF[c]=t;var ch=DRAFT[c],nx=DRAFT[c+1];
    var d=.03+R()*.03;if(ch===' ')d=.05;if(/[.?,]/.test(ch)&&nx===' ')d+=.3;
    t+=d;
  }
  var k=TYPE_D/OFF[N-1];for(c=0;c<N;c++)OFF[c]*=k;
}

/* ─────────── раунд ───────────
   Tc: когда набрана буква, Td: когда её стёрли. Ненабранные буквы стёрты заранее (−∞),
   тогда Td не растёт по индексу и видимый текст всегда префикс. */
function newR(tSend){
  return {tSend:tSend,tDel:tSend+.42,tRead:tSend+.8,tTI:tSend+.98,tTy:tSend+1.3,Tc:new Float64Array(N).fill(Infinity),Td:new Float64Array(N).fill(Infinity),tC:null,ev:[]};
}
function startDelete(R,tC){
  var k=0;while(k<N&&R.Tc[k]<=tC)k++;
  var dd=k?DEL_D*Math.max(.3,Math.sqrt(k/N)):0;
  R.tC=tC;
  // зажатый backspace разгоняется: первые буквы уходят медленно, потом целыми словами
  for(var c=0;c<N;c++)R.Td[c]=c<k?tC+dd*Math.pow((k-1-c)/Math.max(1,k-1),.55):-Infinity;
  R.tPack=tC+dd+.12;R.tOK=tC+dd+.62;R.tL=R.tOK+.46;R.tDom=R.tL+.32;
  sizeEvents(R);
}
function typedAt(R,t){var lo=0,hi=N;while(lo<hi){var m=(lo+hi)>>1;if(R.Tc[m]<=t)lo=m+1;else hi=m}return lo}
function keptAt(R,t){if(R.tC==null||t<R.tC)return N;var lo=0,hi=N;while(lo<hi){var m=(lo+hi)>>1;if(R.Td[m]<=t)hi=m;else lo=m+1}return lo}
function visAt(R,t){return Math.min(typedAt(R,t),keptAt(R,t))}
function tgtW(m){return m?Math.max(PILL,Wm[m]+PADX*2):PILL}
function tgtH(m){return m?BH+3+NLm[m]*LH:BH}
// пузырь догоняет текст пружиной: каждое изменение длины текста это ступенька со своим откликом
function sizeEvents(R){
  var T=[],c;
  for(c=0;c<N;c++){if(isFinite(R.Tc[c]))T.push(R.Tc[c]);if(isFinite(R.Td[c]))T.push(R.Td[c])}
  T.sort(function(a,b){return a-b});
  var ev=[],m0=0;
  // набранная буква ещё летит, поэтому рост пузыря отстаёт на LAG; стирание ужимает сразу
  T.forEach(function(t){var m=visAt(R,t);if(m!==m0){var dw=tgtW(m)-tgtW(m0),dh=tgtH(m)-tgtH(m0);if(dw||dh)ev.push([m>m0?t+LAG:t,dw,dh]);m0=m}});
  ev.sort(function(a,b){return a[0]-b[0]});
  if(R.tOK!=null)ev.push([R.tOK+.18,OKW-PILL,0]);
  R.ev=ev;
}
function sizeAt(R,t){
  var w=PILL,hh=BH;
  for(var i=0;i<R.ev.length;i++){var e=R.ev[i],d=t-e[0];if(d<=0)break;w+=e[1]*spring(d,.8,3.4);hh+=e[2]*spring(d,.62,3.1)}
  return {w:w,h:hh};
}

var AUTO=null,CYCLE=10,TL={};
function buildAuto(){
  var R=newR(0);
  for(var c=0;c<N;c++)R.Tc[c]=R.tTy+OFF[c];
  startDelete(R,R.Tc[N-1]+HOLD_D);
  R.tTy0=R.tDom+.75;R.keys=[];var t=R.tTy0;
  for(var i=0;i<ASK.length;i++){R.keys.push(t);t+=.026+((i*7)%5)*.004+(ASK[i]===' '?.02:0)}
  R.tTy1=t;R.tNext=t+.17;
  CYCLE=R.tNext;
  TL={TI:R.tTI,TY:R.tTy,C:R.tC,OK:R.tOK,DOM:R.tDom,CYCLE:CYCLE};
  AUTO=R;
}

/* ─────────── кадр ─────────── */
var INK='#000',RECV='#e9e9eb',DOT='#8e8e93',BLUE=[10,124,255],INKC=[13,13,14];
function rgb(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+(a==null?1:a).toFixed(3)+')'}
function mixc(a,b,t){return [Math.round(mix(a[0],b[0],t)),Math.round(mix(a[1],b[1],t)),Math.round(mix(a[2],b[2],t))]}
var BUF_A=new Float32Array(0),BUF_B=new Float32Array(0);

function render(R,t,hist){
  var pin=R.tTI!=null&&t>=R.tTI?spring(t-R.tTI,.5,3.4):0;
  var S=sizeAt(R,t),dom=R.tDom!=null&&t>=R.tDom,k=dom?sm(seg(t,R.tDom,R.tDom+.22)):0;
  renderThread(R,t,hist,pin*S.h,dom,k);
  renderField(R,t);

  cx.save();cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.restore();
  if(!pin||k>=1)return;
  cx.save();
  if(pin!==1){cx.translate(N0.x,N0.y);cx.scale(pin,pin);cx.translate(-N0.x,-N0.y)}

  // пузырь
  var top=YB-S.h,land=R.tL!=null?sm(seg(t,R.tL-.08,R.tL+.1)):0;
  if(!dom){
    cx.fillStyle=RECV;cx.beginPath();cx.roundRect(RX,top,S.w,S.h,Math.min(20,S.h/2));cx.fill();
    var kn=1-land;
    if(kn>0){
      cx.beginPath();cx.arc(K1.x,K1.y,K1.r*kn,0,7);cx.fill();
      cx.beginPath();cx.arc(K2.x,K2.y,K2.r*Math.sqrt(kn),0,7);cx.fill();
    }
    if(land>0){cx.save();cx.globalAlpha=land;cx.translate(RX-6,YB-20);cx.fill(TAIL2D);cx.restore()}
  }

  // зёрна: в полёте серые и чуть крупнее, на месте цвета текста
  var ox=RX+PADX,oy=top+PADT,okx=RX+PADX,oky=YB-BH+PADT;
  var inDot=0,na=0,nb=0,burst=R.tOK!=null&&t>=R.tOK;
  if(BUF_A.length<NP*2){BUF_A=new Float32Array(NP*2);BUF_B=new Float32Array(NP*2)}
  for(var i=0;i<NP;i++){
    var c=PC[i],d=PD[i],dx=DOTX[d]+(P3[i]-.5)*4,dy=DOTY+(P4[i]-.5)*4,x,y,fly=false;
    var tb=burst?R.tOK+P3[i]*.1:Infinity;
    if(t>=tb){
      // все зёрна разом садятся в «ok»
      var ub=(t-tb)/(.34+.14*P4[i]),eb=eback(ub),ar=(P2[i]-.5)*10*Math.sin(Math.PI*c01(ub));
      x=mix(dx,okx+OX[i],eb)+ar*.4;y=mix(dy,oky+OY[i],eb)-Math.abs(ar);
    }else{
      var ts=R.Tc[c]+P1[i]*.07;
      if(!(t>=ts))continue;
      var td=R.Td[c]+P2[i]*.05;
      var tx=ox+PX[i],ty=oy+PY[i];
      if(t>=td){
        if(td<ts)continue;
        // стёрта: втягивается в свою точку, ускоряясь
        var uc=(t-td)/(.22+.14*P3[i]);
        if(uc>=1){inDot++;continue}
        var ec=Math.pow(uc,2.2),sw=(P1[i]-.5)*12*Math.sin(Math.PI*uc);
        x=mix(tx,dx,ec)+sw;y=mix(ty,dy,ec)+sw*.3;fly=true;
      }else{
        var fl=.38+.22*P3[i],uf=(t-ts)/fl;
        if(uf<1){
          var ef=eout(uf),arc=(P2[i]-.5)*40*Math.sin(Math.PI*uf)*(1-uf);
          x=mix(dx,tx,ef)+arc;y=mix(dy,ty,ef)-Math.abs(arc)*.5;fly=true;
        }else{x=tx;y=ty}
      }
    }
    if(fly){BUF_B[nb++]=x;BUF_B[nb++]=y}else{BUF_A[na++]=x;BUF_A[na++]=y}
  }
  var ga=1-k;
  cx.globalAlpha=ga;cx.fillStyle=INK;
  for(i=0;i<na;i+=2)cx.fillRect(BUF_A[i]-.6,BUF_A[i+1]-.6,1.2,1.2);
  cx.globalAlpha=ga*.6;cx.fillStyle=DOT;
  for(i=0;i<nb;i+=2)cx.fillRect(BUF_B[i]-.6,BUF_B[i+1]-.6,1.2,1.2);
  cx.globalAlpha=1;

  // три точки: волна, пока печатает; при стирании наполняются и дрожат; при «ok» отдают всё
  if(!burst||t<R.tOK+.2){
    var fill=Math.sqrt(inDot/Math.max(1,NP)),go=burst?1-sm(seg(t,R.tOK,R.tOK+.16)):1;
    var del=R.tC!=null&&t>=R.tC,pk=R.tPack!=null&&t>=R.tPack?seg(t,R.tPack,R.tOK):0;
    for(var n=0;n<3;n++){
      var phs=((t*1.35-n*.17)%1+1)%1,bump=phs<.42?Math.pow(Math.sin(Math.PI*phs/.42),2):0;
      var op=del?1:.42+.58*bump,rad=DR*(1+.06*bump*(del?0:1)+.5*fill)*go;
      var jx=pk?(Math.sin(t*170+n*2)+.6*Math.sin(t*233+n))*.7*pk:0,jy=pk?(Math.sin(t*190+n)+.6*Math.sin(t*251+n*3))*.7*pk:0;
      cx.globalAlpha=op;cx.fillStyle=del?mixcHex(DOT,INK,c01(fill*1.4)):DOT;
      cx.beginPath();cx.arc(DOTX[n]+jx,DOTY-(del?0:bump*1.5)+jy,Math.max(0,rad),0,7);cx.fill();
    }
    cx.globalAlpha=1;
  }
  cx.restore();
}
function hexArr(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function mixcHex(a,b,t){return rgb(mixc(hexArr(a),hexArr(b),t))}

function renderThread(R,t,hist,H,dom,k){
  var qe=eout(seg(t,R.tSend,R.tSend+.4)),lbOld=1-eout(seg(t,R.tSend,R.tSend+.26));
  var lb0=eout(seg(t,R.tDel,R.tDel+.24)),lbRead=sm(seg(t,R.tRead-.05,R.tRead+.07));
  var y=YB,pr=c01(H/BH);
  y-=H+GQ*pr;
  y-=GL*lb0;var l0=y;
  y-=BH*qe;var q0=y;y-=GB*qe;
  var b0=BL[0];
  // свой вопрос вылетает из поля ввода
  var qx=mix(FIELDTXT.x-15,MEX-QW,qe),qy=mix(FIELDTXT.y-7,q0,qe);
  set(b0.q,'transform','translate('+f2(qx)+'px,'+f2(qy)+'px)');
  set(b0.q,'visibility',qe>0?'visible':'hidden');
  var a=sm(qe*2.4);
  set(b0.q,'background',a<.999?rgb(BLUE,a):'');
  set(b0.q,'color',a<.999?rgb(mixc(INKC,[255,255,255],a)):'');
  set(b0.q.querySelector('.tail'),'opacity',a.toFixed(3));
  // ответ в ленте: после посадки «ok» становится обычным пузырём
  if(dom){
    if(b0.word!==OK){b0.rt.textContent=OK;b0.word=OK}
    set(b0.r,'visibility','visible');set(b0.r,'transform','translate('+RX+'px,'+f2(YB-BH)+'px)');
    set(b0.rt,'opacity',k.toFixed(3));
  }else set(b0.r,'visibility','hidden');
  // метка доставки у текущего вопроса
  var lw=lbRead>.5?LW.r:LW.d,lt=lbRead>.5?'<b>Read</b> '+READ_AT:'Delivered';
  if(LBA.__t!==lt){LBA.innerHTML=lt;LBA.__t=lt}
  set(LBA,'opacity',(lb0*(1-Math.min(lbRead,1-lbRead)*2)).toFixed(3));
  set(LBA,'transform','translate('+f2(MEX-lw)+'px,'+f2(l0+3)+'px)');
  // старые обмены
  for(var kk=-1;kk>=KMIN;kk--){
    var B=BL[kk],rt=y-BH;y=rt-GQ;
    if(kk===-1){y-=GL*lbOld;set(LBB,'opacity',lbOld.toFixed(3));set(LBB,'transform','translate('+f2(MEX-LW.r)+'px,'+f2(y+3)+'px)')}
    var qt=y-BH;y=qt-GB;
    var w=hist[-kk-1]||OK;if(B.word!==w){B.rt.textContent=w;B.word=w}
    set(B.r,'visibility',rt>-60?'visible':'hidden');set(B.q,'visibility',qt>-60?'visible':'hidden');
    set(B.r,'transform','translate('+RX+'px,'+f2(rt)+'px)');
    set(B.q,'transform','translate('+f2(MEX-QW)+'px,'+f2(qt)+'px)');
  }
}

function renderField(R,t){
  var n=0,crt=0;
  if(R.keys){
    for(var i=0;i<R.keys.length;i++)if(t>=R.keys[i])n=i+1;
    crt=t>=R.tTy0-.32?(t<R.tTy1+.1||((t-R.tTy1)%1)<.55?1:0):0;
  }
  var press=Math.max(pulse(t,R.tSend-.05,R.tSend+.02),R.tNext!=null?pulse(t,R.tNext-.05,R.tNext+.02):0);
  typedEl.textContent=ASK.slice(0,n);
  set(ph,'opacity',n>0?'0':'1');set(mic,'opacity',n>0?'0':'1');
  set(caret,'opacity',String(crt));
  set(sendBtn,'opacity',(n>0?1:1-seg(t,R.tSend,R.tSend+.14)).toFixed(3));
  set(sendBtn,'transform','scale('+(1-.14*press).toFixed(3)+')');
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function roundEvents(R,from){
  var E=[];from=from==null?-Infinity:from;
  for(var c=0;c<N;c++){
    if(!isFinite(R.Tc[c])||DRAFT[c]===' ')continue;
    if(R.Tc[c]>from)E.push([R.Tc[c],'grain',c]);
    if(c%2===0&&R.Tc[c]+.5>from)E.push([R.Tc[c]+.5,'settle',c]);
  }
  if(R.tC!=null){
    for(c=0;c<N;c++)if(isFinite(R.Td[c])&&R.Td[c]>from&&DRAFT[c]!==' ')E.push([R.Td[c],'del',c]);
    E.push([R.tC,'suck',R.tPack-R.tC+.35]);
    E.push([R.tPack,'pack',R.tOK-R.tPack+.04]);
    E.push([R.tOK+.4,'ok']);
  }
  return E.filter(function(e){return e[0]>from});
}
function buildEvents(){
  var R=AUTO;EVENTS=[[R.tSend+.01,'send'],[R.tTI+.02,'blip']].concat(roundEvents(R));
  R.keys.forEach(function(t,i){EVENTS.push([t,'key',i])});
  EVENTS.push([R.tNext-.04,'press']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Держишь палец: Alex печатает. Отпускаешь: всё стирается, и приходит «ok». */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var n=nowS(),u=uNow(),base=n-u,A=AUTO,R=newR(base+A.tSend);
  var cut=u<A.tC?u:Infinity;
  for(var c=0;c<N;c++)if(A.Tc[c]<=cut)R.Tc[c]=base+A.Tc[c];
  if(u>=A.tC){
    startDelete(R,base+A.tC);
    if(u>=A.tTy0){R.tTy0=base+A.tTy0;R.keys=A.keys.map(function(k){return base+k});R.tTy1=base+A.tTy1}
  }else sizeEvents(R);
  LV={R:R,hist:AUTOHIST.slice(),hold:false,clock:Math.max(0,u-A.tTy),played:n};
  mode='live';document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function roundDone(R,n){return R.tDom!=null&&n>R.tDom}
function pressDown(){
  Sound.start();goLive();
  var n=nowS(),R=LV.R;
  if(R.tC!=null&&!roundDone(R,n))return;
  if(roundDone(R,n)){
    LV.hist.unshift(OK);LV.hist.length=8;
    LV.R=newR(n);LV.clock=0;LV.played=n;sizeEvents(LV.R);
    Sound.play([0,'press']);Sound.play([0,'send'],.01);Sound.play([0,'blip'],.99);
  }
  LV.hold=true;
}
function pressUp(){
  if(!LV||!LV.hold)return;
  LV.hold=false;
  var n=nowS(),R=LV.R;
  if(R.tC!=null)return;
  startDelete(R,Math.max(n+.05,R.tTy+.25));
  roundEvents(R,n).forEach(function(e){Sound.play(e,e[0]-n)});
}
function liveStep(n,dt){
  var R=LV.R;
  if(LV.hold&&R.tC==null&&n>=R.tTy){
    LV.clock+=dt;var ch=false;
    for(var c=0;c<N;c++){
      if(isFinite(R.Tc[c]))continue;
      if(OFF[c]>LV.clock)break;
      R.Tc[c]=n;ch=true;
      if(DRAFT[c]!==' '){Sound.play([0,'grain',c]);if(c%2===0)Sound.play([0,'settle',c],.5)}
    }
    if(ch)sizeEvents(R);
  }
  // ответ пришёл: следующий вопрос набирается сам и ждёт, пока его отправят
  if(R.tDom!=null&&!R.keys&&n>R.tDom+.5){
    R.tTy0=n;R.keys=[];var t=n;for(var i=0;i<ASK.length;i++){R.keys.push(t);t+=.026+((i*7)%5)*.004+(ASK[i]===' '?.02:0)}R.tTy1=t;
    R.keys.forEach(function(k,i){Sound.play([0,'key',i],k-n)});
  }
}

/* ввод */
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();screenEl.setPointerCapture(e.pointerId);pressDown()});
screenEl.addEventListener('pointerup',function(){pressUp()});
screenEl.addEventListener('pointercancel',function(){pressUp()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();pressDown()}
});
addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();pressUp()}});
addEventListener('blur',function(){pressUp()});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Hold the screen while Alex types, then let go':'Hold the screen or Space while Alex types, then let go';

/* ─────────── часы ─────────── */
var AUTOHIST=[OK,OK,OK,OK,OK,OK,OK];
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(AUTO,u,AUTOHIST);
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();
    liveStep(n,dt);
    render(LV.R,n,LV.hist);
  }
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();paused=false;goAuto()};
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
  var cs=getComputedStyle(document.documentElement);
  BLUE=hexArr(cs.getPropertyValue('--blue'));INKC=hexArr(cs.getPropertyValue('--ink'));
  INK=cs.getPropertyValue('--ink').trim();RECV=cs.getPropertyValue('--recv').trim();DOT=cs.getPropertyValue('--dot').trim();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

var S=1;
function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?w*.83/424:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  // холст в пикселях экрана, рисуем в точках телефона
  var k=S*(devicePixelRatio||1);
  cv.width=Math.round(SW*k);cv.height=Math.round(874*k);
  cx.setTransform(k,0,0,k,0,0);
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(AUTO,uNow(),AUTOHIST)};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function init(){TAIL2D=new Path2D(TAILP);fit();measure();layout();typeOffsets();buildAuto();buildEvents();window.__TL=TL}
function boot(){
  init();
  addEventListener('resize',function(){fit()});
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(AUTO,((PH%CYCLE)+CYCLE)%CYCLE,AUTOHIST);
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
