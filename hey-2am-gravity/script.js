/* ─────────── Hey ───────────
   2:13 ночи, экран блокировки. Приходит уведомление от контакта, записанного как DO NOT ANSWER:
   «hey». У него есть гравитация: звёзды на обоях закручиваются в него, большие часы тянутся
   и гнутся к нему, кнопки фонарика и камеры клонятся. Палец пытается смахнуть уведомление,
   но его уводит по спирали, как монетку в воронке, и он попадает ровно в «hey». Открывается чат,
   а там каждую ночь в 2:13 одно и то же. Набираешь «hey», отправляешь, экран гаснет.
   Экран блокировки рисуется в WebGL: каждый пиксель берёт картинку из точки дальше от уведомления
   (поэтому всё будто стягивается к нему) и чуть повёрнутой вокруг него (поэтому закручивается).
   Автопоказ считается из одного времени t, петля замыкается без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}
function spring(t,z,f){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t))}

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,YB=768,RX=20,MEX=382,BH=40;
var NOTI={x:10,y:600,w:382,h:92},M={x:201,y:646};
var DATE='Wednesday, October 7',TIME='2:13',WORD='hey';

var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),lockEl=document.getElementById('lock');
var glc=document.getElementById('gl'),notiEl=document.getElementById('noti'),cardEl=document.getElementById('card'),clearEl=document.getElementById('clear');
var appEl=document.getElementById('app'),appIn=document.getElementById('appin'),thread=document.getElementById('thread'),touchEl=document.getElementById('touch');
var offEl=document.getElementById('off'),sysbar=document.getElementById('sysbar'),sclock=document.getElementById('sclock'),homeEl=document.getElementById('home'),pwr=document.getElementById('pwr');
var typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),ph=document.getElementById('ph'),mic=document.getElementById('mic'),sendEl=document.getElementById('send');

/* ─────────── экран блокировки в WebGL ─────────── */
var gl=glc.getContext('webgl2',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
var ui=document.createElement('canvas'),uctx=ui.getContext('2d');
var VS='#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
var FS=['#version 300 es','precision highp float;',
'uniform sampler2D uUI;uniform vec2 uRes;uniform vec2 uM;uniform float uA;uniform float uW;uniform float uT;uniform float uDark;',
'uniform vec3 uWall;uniform vec3 uDot;out vec4 o;',
'const vec2 SZ=vec2(402.,874.);',
// поле шире по горизонтали: уведомление это широкая карточка
'vec2 warp(vec2 p){',
'  vec2 d=p-uM;vec2 e=vec2(d.x*.72,d.y);float r2=dot(e,e),r=sqrt(r2);',
'  float pull=uA*90000./(r+260.);',
'  float sw=-uW*(.95*exp(-r2/30000.)+.02*40000./(r2+40000.));',
'  float c=cos(sw),s=sin(sw);vec2 dr=vec2(c*d.x-s*d.y,s*d.x+c*d.y);float L=length(dr);',
'  return uM+dr*((L+pull)/max(L,.001));',
'}',
'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'float stars(vec2 q,float aa){',
'  float cell=13.;vec2 g=floor(q/cell);float acc=0.;',
'  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
'    vec2 c=g+vec2(float(i),float(j));float hh=hash(c);if(hh>.6)continue;',
'    vec2 pos=(c+.15+.7*vec2(hash(c+3.1),hash(c+9.7)))*cell;float b=hash(c+7.7);',
'    float rad=.42+1.15*b*b*b;float br=.22+.78*b;float tw=.82+.18*sin(uT*(1.+3.*hh)+hh*40.);',
'    acc+=br*tw*smoothstep(rad+aa,rad-aa*.5,length(q-pos));',
'  }',
'  return acc;',
'}',
'float grid(vec2 q,float aa){vec2 f=mod(q,16.)-8.;return smoothstep(1.25+aa,1.25-aa*.6,length(f));}',
'void main(){',
'  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);vec2 k=SZ/uRes;vec3 col=vec3(0.);',
'  for(int s=0;s<4;s++){',
'    vec2 off=vec2(float(s&1),float(s>>1))*.5-.25;vec2 p=(px+off)*k;vec2 q=warp(p);',
'    float aa=max(.55,k.x*1.2);',
'    float v=uDark>.5?stars(q,aa):grid(q,aa)*.2;',
'    vec3 base=mix(uWall,uDot,clamp(v,0.,1.));',
'    vec4 u=texture(uUI,clamp(q/SZ,0.,1.));',
'    col+=u.rgb+(1.-u.a)*base;',
'  }',
'  o=vec4(col*.25,1.);',
'}'].join('\n');
var PROG=null,U={},TEX=null,GLK=1;
function glInit(){
  if(!gl)return;
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s}
  PROG=gl.createProgram();gl.attachShader(PROG,sh(gl.VERTEX_SHADER,VS));gl.attachShader(PROG,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(PROG);
  if(!gl.getProgramParameter(PROG,gl.LINK_STATUS))console.error(gl.getProgramInfoLog(PROG));
  gl.useProgram(PROG);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var la=gl.getAttribLocation(PROG,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
  ['uUI','uRes','uM','uA','uW','uT','uDark','uWall','uDot'].forEach(function(n){U[n]=gl.getUniformLocation(PROG,n)});
  TEX=gl.createTexture();
}
var COL={};
function hexc(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
// надписи экрана блокировки рисуются один раз в текстуру, дальше их только искривляет шейдер
function drawUI(){
  var K=GLK,w=Math.round(SW*K),hh=Math.round(SH*K);
  ui.width=w;ui.height=hh;var c=uctx;c.setTransform(K,0,0,K,0,0);c.clearRect(0,0,SW,SH);
  var ink=COL.lockInk,btn=COL.btn;
  c.fillStyle=ink;c.strokeStyle=ink;
  // замочек
  c.globalAlpha=.9;c.lineWidth=2;c.beginPath();c.arc(201,79,5,Math.PI,0);c.lineTo(206,84);c.moveTo(196,84);c.lineTo(196,79);c.stroke();
  c.beginPath();c.roundRect(193.5,83,15,11.5,2.6);c.fill();
  // дата и часы
  c.globalAlpha=.86;c.textAlign='center';c.textBaseline='alphabetic';
  c.font='600 21px system-ui,-apple-system,"SF Pro Display",sans-serif';c.fillText(DATE,201,131);
  c.globalAlpha=1;
  c.font='700 124px system-ui,-apple-system,"SF Pro Display",sans-serif';
  try{c.letterSpacing='-4px'}catch(e){}
  c.fillText(TIME,201+2,252);
  try{c.letterSpacing='0px'}catch(e){}
  // фонарик и камера
  [[68,798],[334,798]].forEach(function(p,i){
    c.globalAlpha=1;c.fillStyle=btn;c.beginPath();c.arc(p[0],p[1],25,0,7);c.fill();
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
  c.globalAlpha=1;
  if(!gl)return;
  gl.bindTexture(gl.TEXTURE_2D,TEX);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ui);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function glSize(){
  GLK=Math.min(3,Math.max(1,S*(window.devicePixelRatio||1)));
  glc.width=Math.round(SW*GLK);glc.height=Math.round(SH*GLK);
  if(gl)gl.viewport(0,0,glc.width,glc.height);
  drawUI();
}
function glDraw(A,Wd,t,mx,my){
  if(!gl)return;
  gl.useProgram(PROG);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,TEX);
  gl.uniform1i(U.uUI,0);gl.uniform2f(U.uRes,glc.width,glc.height);gl.uniform2f(U.uM,mx==null?M.x:mx,my==null?M.y:my);
  gl.uniform1f(U.uA,A);gl.uniform1f(U.uW,Wd);gl.uniform1f(U.uT,t);gl.uniform1f(U.uDark,COL.dark?1:0);
  gl.uniform3f(U.uWall,COL.wall[0]/255,COL.wall[1]/255,COL.wall[2]/255);gl.uniform3f(U.uDot,COL.dot[0]/255,COL.dot[1]/255,COL.dot[2]/255);
  gl.drawArrays(gl.TRIANGLES,0,3);
}

/* ─────────── чат ─────────── */
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z';
function tailSvg(me){return '<svg class="tail" viewBox="0 0 20 20" aria-hidden="true"><path d="'+TAILP+'"'+(me?' transform="matrix(-1 0 0 1 20 0)"':'')+'/></svg>'}
function bubble(me){var b=h('div','msg '+(me?'me':'them'));b.innerHTML='<span class="t">'+WORD+'</span>'+tailSvg(me);thread.appendChild(b);return b}
var DAYS=['Sunday','Monday','Yesterday','Today'],CH=[];
DAYS.forEach(function(d,i){
  var day=h('div','day');day.innerHTML='<b>'+d+'</b> '+TIME+' AM';thread.appendChild(day);
  CH.push({day:day,them:bubble(false),me:bubble(true)});
});
var DLV=h('div','lbl','Delivered');thread.appendChild(DLV);
var HW=0,DW=0;
function measure(){
  // чат скрыт через display, мерить его можно только показав
  var d=appEl.style.display,v=appEl.style.visibility;appEl.style.visibility='hidden';appEl.style.display='block';
  HW=CH[0].me.offsetWidth;DW=DLV.offsetWidth;
  appEl.style.display=d;appEl.style.visibility=v;if(appEl.__s){delete appEl.__s.display}
}
var FIELDTXT={x:64+16,y:786+9};
function layoutChat(qe,lb){
  var y=YB;
  y-=20*lb;var lt=y;
  y-=BH*qe;var mt=y;y-=12*qe;
  var cur=CH[3];
  set(cur.them,'transform','translate('+RX+'px,'+f2(y-BH)+'px)');y-=BH;
  y-=22;set(cur.day,'transform','translateY('+f2(y-16)+'px)');y-=16+14;
  // свой новый «hey» вылетает из поля ввода
  var tx=MEX-HW,e=qe,qx=mix(FIELDTXT.x-15,tx,e),qy=mix(FIELDTXT.y-7,mt,e);
  set(cur.me,'transform','translate('+f2(qx)+'px,'+f2(qy)+'px)');set(cur.me,'visibility',qe>0?'visible':'hidden');
  var a=sm(e*2.4);
  set(cur.me,'background',a<.999?'rgba('+COL.blue.join(',')+','+a.toFixed(3)+')':'');
  set(cur.me,'color',a<.999?'rgb('+COL.ink.map(function(v){return Math.round(mix(v,255,a))}).join(',')+')':'');
  set(cur.me.querySelector('.tail'),'opacity',a.toFixed(3));
  set(DLV,'opacity',lb.toFixed(3));set(DLV,'transform','translate('+f2(MEX-DW)+'px,'+f2(lt+3)+'px)');
  for(var k=2;k>=0;k--){
    var B=CH[k];
    set(B.me,'transform','translate('+f2(MEX-HW)+'px,'+f2(y-BH)+'px)');y-=BH+12;
    set(B.them,'transform','translate('+RX+'px,'+f2(y-BH)+'px)');y-=BH;
    y-=22;set(B.day,'transform','translateY('+f2(y-16)+'px)');y-=16+14;
  }
}

/* ─────────── сценарий петли ─────────── */
var TL={N:.3,A0:.45,FIN:1.2,TOUCH:1.42,SLIP:1.72,TAP:2.78,OPEN0:2.84,OPEN1:3.26,
        KEYS:[3.52,3.64,3.76],SEND:3.98,DLV:4.3,LOCK:4.86,WAKE:5.2,CYCLE:5.76};
var WSTAT=.9,WRATE=2,APOW=1.8;
// сила притяжения: нарастает с ускорением до самого тапа, после тапа пространство пружинит обратно
function Araw(t){return t<TL.A0?0:Math.pow(seg(t,TL.A0,TL.TAP),APOW)}
// закрутка копится, пока тянет: интеграл Araw
function Wraw(t){
  var n=Math.min(t,TL.TAP);if(n<=TL.A0)return 0;
  var L=TL.TAP-TL.A0,x=seg(n,TL.A0,TL.TAP);
  return WSTAT*Araw(n)+WRATE*L*Math.pow(x,APOW+1)/(APOW+1);
}
function warpAt(t){
  if(t<TL.TAP)return {A:Araw(t),W:Wraw(t)};
  var k=1-spring(t-TL.TAP,.32,2.4);
  return {A:Araw(TL.TAP)*k,W:Wraw(TL.TAP)*k};
}

/* палец: подходит справа, тянет уведомление влево, срывается и уходит по спирали внутрь */
var SPX=175,SPY=100;
function fingerAuto(t){
  var g={x:0,y:0,a:0,p:0};
  if(t<TL.FIN||t>TL.TAP+.2)return g;
  if(t<TL.TOUCH){
    var u=eout(seg(t,TL.FIN,TL.TOUCH));g.x=mix(446,334,u);g.y=mix(718,652,u);g.a=sm(seg(t,TL.FIN,TL.FIN+.12));g.p=.35*sm(seg(t,TL.TOUCH-.06,TL.TOUCH));return g;
  }
  if(t<TL.SLIP){
    var v=eio(seg(t,TL.TOUCH,TL.SLIP));g.x=mix(334,248,v);g.y=mix(652,661,v*v);g.a=1;g.p=1;return g;
  }
  var w=seg(t,TL.SLIP,TL.TAP),th=.34+2*Math.PI*1.55*Math.pow(w,1.6),f=(.3+.7*sm(w/.2))*Math.pow(1-w,.85);
  g.x=M.x+SPX*f*Math.cos(th);g.y=M.y+SPY*f*Math.sin(th);g.a=1;
  g.p=1-.6*pulse(t,TL.TAP-.09,TL.TAP-.04);
  if(t>TL.TAP){g.a=1-sm(seg(t,TL.TAP+.04,TL.TAP+.2))}
  return g;
}
// уведомление тянется за пальцем с сопротивлением и пружинит обратно
function cardDxAuto(t){
  if(t<TL.TOUCH)return 0;
  if(t<TL.SLIP)return .5*(fingerAuto(t).x-334);
  var d0=.5*(248-334);return d0*(1-spring(t-TL.SLIP,.45,3.2));
}

/* ─────────── кадр ─────────── */
function frame(t){
  var F={t:t,A:0,W:0,noti:0,ny:0,dx:0,fing:fingerAuto(t),press:0,open:0,typed:0,caret:0,qe:0,lb:0,off:0,wake:1,lockOn:1,pwr:0};
  var w=warpAt(t);F.A=w.A;F.W=w.W;
  F.noti=t>=TL.N&&t<TL.OPEN1?1:0;
  F.ny=t>=TL.N?spring(t-TL.N,.62,2.6):0;
  F.dx=cardDxAuto(t);
  F.press=pulse(t,TL.TAP-.03,TL.TAP+.05);
  F.open=t>=TL.OPEN0&&t<TL.LOCK+.12?eio(seg(t,TL.OPEN0,TL.OPEN1)):0;
  var n=0;TL.KEYS.forEach(function(k){if(t>=k)n++});if(t>=TL.SEND)n=0;F.typed=n;
  F.caret=t>=TL.OPEN1&&t<TL.SEND?(t<TL.KEYS[2]+.1||((t-TL.KEYS[2])%1)<.55?1:0):0;
  F.qe=t>=TL.SEND?eout(seg(t,TL.SEND,TL.SEND+.38)):0;
  F.lb=t>=TL.DLV?eout(seg(t,TL.DLV,TL.DLV+.22)):0;
  F.sendp=pulse(t,TL.SEND-.04,TL.SEND+.02);
  // боковая кнопка: экран гаснет и просыпается уже без уведомления
  F.pwr=pulse(t,TL.LOCK-.02,TL.LOCK+.08);
  F.off=t<TL.LOCK?0:t<TL.WAKE?sm(seg(t,TL.LOCK,TL.LOCK+.09)):1-sm(seg(t,TL.WAKE,TL.WAKE+.3));
  F.wake=t>=TL.WAKE?sm(seg(t,TL.WAKE,TL.WAKE+.42)):1;
  F.lockOn=t<TL.OPEN1||t>=TL.LOCK+.1?1:0;
  F.cam=t>=TL.OPEN0&&t<TL.LOCK+.1?eio(seg(t,TL.OPEN0+.06,TL.OPEN1+.16)):0;
  return F;
}

function render(F){
  var t=F.t,o=F.open;
  // при записи камера подъезжает к переписке, чтобы «hey» читалось в ленте
  if(REC||STILL){var cz=F.cam||0;set(zoom,'transform','scale('+(S*mix(1,1.3,cz)).toFixed(4)+')')}
  // экран блокировки
  var lockVis=F.lockOn||o<1;
  set(lockEl,'visibility',lockVis?'visible':'hidden');
  if(lockVis){
    var ls=mix(1,.93,o)*mix(1.035,1,F.wake);
    set(lockEl,'transform','scale('+ls.toFixed(4)+')');
    set(lockEl,'filter',o>0?'brightness('+mix(1,.55,o).toFixed(3)+')':'');
    // источник притяжения едет вместе с уведомлением
    glDraw(F.A,F.W,t,M.x+F.dx,M.y+4*F.A+(F.noti?(1-F.ny)*70:0));
  }
  // уведомление: всплывает снизу, тяжелеет вместе с полем, тянется за пальцем
  if(F.noti){
    set(notiEl,'visibility','visible');
    var ny=(1-F.ny)*70,sc=mix(.9,1,F.ny)*(1+.025*F.A)*(1-.03*F.press),sag=4*F.A;
    var jit=F.A>.75?(F.A-.75)*1.6*Math.sin(t*157)*Math.sin(t*41):0;
    set(notiEl,'opacity',c01(F.ny*1.6).toFixed(3));
    set(cardEl,'transform','translate('+f2(F.dx+jit)+'px,'+f2(ny+sag)+'px) scale('+sc.toFixed(4)+')');
    set(clearEl,'opacity',(c01(-F.dx/60)*(F.clr==null?1:F.clr)).toFixed(3));
    set(clearEl,'transform','translateY('+f2(ny+sag)+'px) scale('+mix(.7,1,c01(-F.dx/60)).toFixed(3)+')');
    set(cardEl,'visibility',o>.35?'hidden':'visible');
  }else set(notiEl,'visibility','hidden');
  // чат раскрывается из уведомления
  if(o>0){
    set(appEl,'display','block');
    var r=NOTI,x0=mix(r.x+F.dx,0,o),y0=mix(r.y+4*F.A,0,o),x1=mix(r.x+r.w+F.dx,SW,o),y1=mix(r.y+r.h+4*F.A,SH,o),rad=mix(27,57,o);
    set(appEl,'clipPath','inset('+f2(y0)+'px '+f2(SW-x1)+'px '+f2(SH-y1)+'px '+f2(x0)+'px round '+rad.toFixed(1)+'px)');
    set(appEl,'opacity',c01(o*2.2).toFixed(3));
    // содержимое приложения проступает, когда окно уже раскрылось
    set(appIn,'opacity',sm(seg(o,.3,.85)).toFixed(3));set(appIn,'transform','scale('+mix(.9,1,eout(o)).toFixed(4)+')');
    layoutChat(F.qe,F.lb);
    typedEl.textContent=WORD.slice(0,F.typed);
    set(ph,'opacity',F.typed>0?'0':'1');set(mic,'opacity',F.typed>0?'0':'1');
    set(caret,'opacity',F.caret.toFixed(2));
    set(sendEl,'opacity',F.typed>0?'1':t>=TL.SEND?(1-c01((t-TL.SEND)/.14)).toFixed(3):'0');
    set(sendEl,'transform','scale('+(1-.14*F.sendp).toFixed(3)+')');
  }else set(appEl,'display','none');
  // палец
  var g=F.fing;
  set(touchEl,'opacity',g.a.toFixed(3));
  if(g.a>0)set(touchEl,'transform','translate('+f2(g.x)+'px,'+f2(g.y)+'px) scale('+mix(.62,1,g.p).toFixed(3)+')');
  // системный слой
  set(sclock,'opacity',o>.6?'1':'0');
  var dark=COL.dark||o<.6;
  set(sysbar,'color',o>.6?'var(--ink)':'var(--lock-ink)');set(homeEl,'background',o>.6?'var(--ink)':'var(--lock-ink)');
  set(offEl,'opacity',F.off.toFixed(3));
  set(pwr,'transform','scaleX('+(1-.6*F.pwr).toFixed(3)+')');
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  EVENTS.push([TL.N+.02,'chime']);
  // гул поля: громкость и высота идут от силы притяжения
  var G=[],Wr=[];for(var i=0;i<=Math.round((TL.TAP-TL.A0)*100);i++){var t=TL.A0+i/100;G.push(Araw(t));Wr.push(i?(Wraw(t)-Wraw(t-.01))*100:0)}
  EVENTS.push([TL.A0,'grav',{g:G,w:Wr,D:TL.TAP-TL.A0}]);
  EVENTS.push([TL.TOUCH,'touch'],[TL.TOUCH+.02,'drag',TL.SLIP-TL.TOUCH]);
  // монетка в воронке: частота обращения пальца вокруг уведомления
  var O=[],R=[];for(i=0;i<=Math.round((TL.TAP-TL.SLIP)*100);i++){var tt=TL.SLIP+i/100,w=seg(tt,TL.SLIP,TL.TAP),dth=2*Math.PI*1.55*1.6*Math.pow(Math.max(w,1e-3),.6)/(TL.TAP-TL.SLIP);O.push(dth/(2*Math.PI));R.push((.3+.7*sm(w/.2))*Math.pow(1-w,.85))}
  EVENTS.push([TL.SLIP,'orbit',{f:O,r:R,D:TL.TAP-TL.SLIP}]);
  EVENTS.push([TL.TAP,'tap'],[TL.TAP+.01,'snap'],[TL.OPEN0,'open']);
  TL.KEYS.forEach(function(k,i){EVENTS.push([k,'key',i])});
  EVENTS.push([TL.SEND-.03,'press'],[TL.SEND+.01,'send'],[TL.DLV,'tick'],[TL.LOCK,'lock']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,TL.CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Уведомление можно тащить, но касание стягивает к нему. Смахнёшь сильно: оно улетает
   и возвращается бумерангом, а тянет после этого ещё сильнее. Тап по нему открывает чат,
   «hey» набирается сам, экран гаснет, и через секунду всё снова. */
var mode='auto',LV=null;
function nowS(){return performance.now()/1000}
function goLive(){
  if(mode==='live')return;
  var n=nowS(),u=uNow();
  LV={tN:n-(u<TL.N||u>=TL.WAKE?-.15:u-TL.N),boost:0,ptr:null,card:{x:0,v:0,fly:null},tap:null,fing:{x:0,y:0,a:0,p:0}};
  if(u>=TL.TAP&&u<TL.WAKE){LV.tN=n+.6}
  mode='live';document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';LV=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function liveA(n){
  if(n<LV.tN+.15)return 0;
  // сначала быстро до заметного, потом медленно до предела; каждое смахивание добавляет
  var e=n-LV.tN-.15;return Math.min(1,.62*sm(e/2.2)+.3*sm((e-2.2)/7)+LV.boost);
}
function toPt(e){var r=screenEl.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH}}
// касание притягивается к уведомлению тем сильнее, чем ближе и чем сильнее поле
function pulled(p,A){var dx=M.x-p.x,dy=M.y-p.y,d=Math.hypot(dx*.72,dy),k=c01(A*.55*Math.exp(-d/240));return {x:p.x+dx*k,y:p.y+dy*k}}
function onCard(p){return p.x>NOTI.x&&p.x<NOTI.x+NOTI.w&&p.y>NOTI.y-6&&p.y<NOTI.y+NOTI.h+6}
function liveDown(e){
  Sound.start();goLive();
  var n=nowS(),p=toPt(e);
  if(LV.tap!=null)return;
  if(n<LV.tN)return;
  LV.ptr={id:e.pointerId,x0:p.x,y0:p.y,p:p,t0:n,card:onCard(pulled(p,liveA(n))),moved:0};
  Sound.play([0,'touch']);
}
function liveMove(e){
  if(!LV||!LV.ptr||LV.ptr.id!==e.pointerId)return;
  var p=toPt(e);LV.ptr.moved=Math.max(LV.ptr.moved,Math.hypot(p.x-LV.ptr.x0,p.y-LV.ptr.y0));LV.ptr.p=p;
}
function liveUp(e){
  if(!LV||!LV.ptr)return;
  var P=LV.ptr,n=nowS();LV.ptr=null;
  if(P.card&&P.moved<10){openLive(n);return}
  if(P.card&&LV.card.x<-90){
    // смахнули: улетает влево и возвращается бумерангом
    LV.card.fly={t0:n,x0:LV.card.x};LV.boost=Math.min(.5,LV.boost+.14);
    Sound.play([0,'fling']);
  }
}
function openLive(n){
  LV.tap=n;Sound.play([0,'tap']);Sound.play([0,'snap'],.01);Sound.play([0,'open'],.06);
  [0,1,2].forEach(function(i){Sound.play([0,'key',i],TL.KEYS[i]-TL.TAP)});
  Sound.play([0,'press'],TL.SEND-.03-TL.TAP);Sound.play([0,'send'],TL.SEND+.01-TL.TAP);Sound.play([0,'tick'],TL.DLV-TL.TAP);Sound.play([0,'lock'],TL.LOCK-TL.TAP);
}
function liveFrame(n,dt){
  var L=LV,F;
  if(L.tap!=null){
    // после тапа идёт тот же сценарий, что в автопоказе, со сдвигом времени
    var u=TL.TAP+(n-L.tap);
    if(u>=TL.CYCLE){L.tap=null;L.tN=n+.55;L.boost=0;L.card={x:0,v:0,fly:null};u=0}
    else{
      F=frame(u);F.t=n;
      var A0=L.Atap,k=u<TL.TAP?1:1-spring(u-TL.TAP,.32,2.4);
      if(A0==null){L.Atap=liveA(n-(u-TL.TAP));L.Wtap=L.W||0;A0=L.Atap}
      F.A=A0*k;F.W=L.Wtap*k;F.dx=L.card.x*(1-spring(u-TL.TAP,.5,3));F.fing={x:0,y:0,a:0,p:0};
      if(L.tapP){F.fing={x:L.tapP.x,y:L.tapP.y,a:1-sm(seg(u,TL.TAP+.04,TL.TAP+.2)),p:1-pulse(u,TL.TAP-.02,TL.TAP+.05)*.4}}
      if(u>=TL.WAKE){F.noti=0}
      return F;
    }
  }
  L.Atap=null;
  var A=liveA(n);L.W=(L.W||0)+(A*WRATE)*dt;if(n<L.tN+.15)L.W=0;
  F=frame(0);F.t=n;F.A=A;F.W=WSTAT*A+L.W;
  F.noti=n>=L.tN?1:0;F.ny=n>=L.tN?spring(n-L.tN,.62,2.6):0;F.open=0;F.off=0;F.wake=1;F.lockOn=1;
  // карточка: тянется за пальцем, иначе пружина или бумеранг
  var C=L.card;
  if(L.ptr&&L.ptr.card){
    var pp=pulled(L.ptr.p,A),tx=Math.min(30,(pp.x-pulled({x:L.ptr.x0,y:L.ptr.y0},A).x)*.6);C.x=tx;C.v=0;
  }else if(C.fly){
    var e=n-C.fly.t0,D=.95;
    if(e<D){var s=Math.sin(Math.PI*e/D);C.x=C.fly.x0*(1-e/D)-420*s;}
    else{C.fly=null;C.x=0;C.v=0;Sound.play([0,'thud'])}
  }else{
    var kk=420,cc=2*Math.sqrt(kk)*.45;C.v+=(-kk*C.x-cc*C.v)*dt;C.x+=C.v*dt;
  }
  F.dx=C.x;F.clr=C.fly?0:1;
  if(L.ptr){var q=pulled(L.ptr.p,A);F.fing={x:q.x,y:q.y,a:1,p:1};L.tapP=q}
  else F.fing={x:0,y:0,a:0,p:0};
  return F;
}

/* ввод */
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();screenEl.setPointerCapture(e.pointerId);liveDown(e)});
screenEl.addEventListener('pointermove',liveMove);
screenEl.addEventListener('pointerup',liveUp);screenEl.addEventListener('pointercancel',function(){if(LV)LV.ptr=null});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();Sound.start();goLive();var n=nowS();if(LV.tap==null&&n>=LV.tN){LV.tapP={x:M.x,y:M.y};openLive(n)}}
});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Try to swipe it away':'Try to swipe it away, or tap it';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false,S=1;
function uNow(){return((acc%TL.CYCLE)+TL.CYCLE)%TL.CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%TL.CYCLE)+TL.CYCLE)%TL.CYCLE;
    render(frame(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=TL.CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS();
    render(liveFrame(n,dt));
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
  COL={dark:th==='dark',wall:hexc(cs.getPropertyValue('--wall')),dot:hexc(cs.getPropertyValue('--wall-dot')),
       lockInk:cs.getPropertyValue('--lock-ink').trim(),btn:cs.getPropertyValue('--btn').trim(),
       blue:hexc(cs.getPropertyValue('--blue')),ink:hexc(cs.getPropertyValue('--ink'))};
  if(PROG)drawUI();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  // при записи виден весь экран блокировки от даты до фонарика
  S=REC||STILL?(hh-40)/808:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  if(PROG)glSize();
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(frame(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,TL.CYCLE,PH+1/60,TL.CYCLE)};
window.__TL=TL;

function boot(){
  glInit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  fit();measure();buildEvents();
  addEventListener('resize',function(){fit()});
  render(frame(((PH%TL.CYCLE)+TL.CYCLE)%TL.CYCLE));
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
