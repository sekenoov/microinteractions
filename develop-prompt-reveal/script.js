/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// темп под X: паузы короткие, движения быстрые
var SLOW=1,ANIM=.85;
function D(ms){return reduce?1:ms*ANIM}
function sleep(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms*SLOW)})}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mix(a,b,t){return a+(b-a)*t}
function eio(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){return 1-Math.pow(1-p,3)}
/* покадровая анимация по реальному времени. Запасной таймер добивает её, если rAF стоит в скрытой вкладке */
function tween(dur,fn){
  dur=D(dur);var t0=performance.now();
  return new Promise(function(res){
    var done=false;
    function end(){if(done)return;done=true;fn(1);res()}
    setTimeout(end,dur+160);
    (function f(now){
      if(done)return;var p=clamp((now-t0)/dur,0,1);fn(p);
      if(p<1)requestAnimationFrame(f);else end();
    })(t0);
  });
}
/* экранный прямоугольник в локальные координаты хоста, без учёта зума камеры */
function loc(r,host){
  var hr=host.getBoundingClientRect(),s=hr.width/host.offsetWidth||1;
  return {x:(r.left-hr.left)/s-host.clientLeft,y:(r.top-hr.top)/s-host.clientTop,w:r.width/s,h:r.height/s};
}

/* ─────────── одометр ─────────── */
function Odo(el){this.el=el;this.cur=''}
Odo.prototype.set=function(text){
  if(text===this.cur)return;
  var old=this.cur;this.cur=text;
  if(old.length!==text.length){this.build(text,old);return}
  for(var i=0;i<text.length;i++){
    if(old[i]===text[i])continue;
    var slot=this.el.children[i];
    if(slot&&slot.classList.contains('dig')&&/\d/.test(text[i])){
      slot.firstChild.style.transitionDelay=((text.length-i-1)*24)+'ms';
      slot.firstChild.style.transform='translateY('+(-text[i]*1.25)+'em)';
    }else if(slot){slot.textContent=text[i]}
  }
};
Odo.prototype.build=function(text,old){
  this.el.innerHTML='';
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(/\d/.test(ch)){
      var s=h('span','dig'),u=h('u');
      for(var k=0;k<10;k++){var b=h('b');b.textContent=k;u.appendChild(b)}
      var prev=old&&old.length?old[i-(text.length-old.length)]:null;
      var from=prev&&/\d/.test(prev)?+prev:(ch==='0'?0:+ch-1);
      u.style.transform='translateY('+(-from*1.25)+'em)';
      s.appendChild(u);this.el.appendChild(s);
      void u.offsetWidth;u.style.transform='translateY('+(-ch*1.25)+'em)';
    }else{var t=h('span');t.textContent=ch;this.el.appendChild(t)}
  }
};

/* ─────────── камера ─────────── */
// ?rec: один проход без панели снизу, для записи ролика. Кадр 1080×1350, всё крупнее в Z раз
var REC=/\brec\b/.test(location.search),Z=REC?1.4:1;
if(REC)document.documentElement.classList.add('rec');
var SAFE=130*Z;
var world=document.getElementById('world');
var cam={x:0,y:0,s:1,vx:0,vy:0,vs:0,tx:0,ty:0,ts:1};
function camOn(){return !reduce&&innerWidth>780}
function camStep(el){
  if(camOn()){
    var k=6.5,c=2*Math.sqrt(k);
    for(var n=Math.ceil(el/.008),dt=el/n,i=0;i<n;i++){
      cam.vx+=((cam.tx-cam.x)*k-cam.vx*c)*dt;cam.x+=cam.vx*dt;
      cam.vy+=((cam.ty-cam.y)*k-cam.vy*c)*dt;cam.y+=cam.vy*dt;
      cam.vs+=((cam.ts-cam.s)*k-cam.vs*c)*dt;cam.s+=cam.vs*dt;
    }
    world.style.transform='translate('+cam.x.toFixed(2)+'px,'+cam.y.toFixed(2)+'px) scale('+cam.s.toFixed(4)+')';
  }else{cam.x=cam.y=0;cam.s=1;world.style.transform=''}
}
function camSnap(){cam.x=cam.tx;cam.y=cam.ty;cam.s=cam.ts;cam.vx=cam.vy=cam.vs=0}
function frame(els,maxS,fill){
  if(!camOn())return;
  if(!els.length)els=[els];
  var L=1e9,T=1e9,R=-1e9,B=-1e9;
  els.forEach(function(el){var r=el.getBoundingClientRect();L=Math.min(L,r.left);T=Math.min(T,r.top);R=Math.max(R,r.right);B=Math.max(B,r.bottom)});
  var lx=(L-cam.x)/cam.s,ly=(T-cam.y)/cam.s,w=(R-L)/cam.s,hh=(B-T)/cam.s;
  fill=fill||.8;var H=innerHeight-SAFE;
  var s=Math.min((maxS||1.5)*Z,innerWidth*fill/w,H*fill/hh);
  cam.ts=s;cam.tx=innerWidth/2-(lx+w/2)*s;cam.ty=H/2+8-(ly+hh/2)*s;
}

/* ═════════ промпт ═════════
   У каждого ключевого куска своя область кадра: 0 маяк, 1 скалы, 2 волны, 3 небо */
var PROMPT=[['A ',-1],['red lighthouse',0],[' on ',-1],['black rocks',1],[', ',-1],['crashing waves',2],[', ',-1],['pink dusk sky',3]];
var STEPS=30,TYPED=.5;

/* ═════════ картинка: WebGL ═════════ */
var canvas=document.getElementById('gl');
var gl=canvas.getContext('webgl2',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:REC});
var VS='#version 300 es\nin vec2 a;out vec2 vUv;void main(){vUv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
var FS=[
'#version 300 es',
'precision highp float;',
'in vec2 vUv;out vec4 o;',
'uniform sampler2D uImg,uMask;',
'uniform vec4 uR,uF;uniform float uFA,uT,uSeed;uniform vec2 uRes;',
'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
'  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}',
// размытие по мип-уровню: 9 выборок шатром, чтобы крупные уровни не рябили ромбами
'vec3 blur(vec2 uv,float l){',
'  vec2 d=vec2(exp2(l)/1024.*.8);',
'  vec3 c=textureLod(uImg,uv,l).rgb*4.;',
'  c+=(textureLod(uImg,uv+vec2(d.x,0.),l).rgb+textureLod(uImg,uv-vec2(d.x,0.),l).rgb',
'     +textureLod(uImg,uv+vec2(0.,d.y),l).rgb+textureLod(uImg,uv-vec2(0.,d.y),l).rgb)*2.;',
'  c+=textureLod(uImg,uv+d,l).rgb+textureLod(uImg,uv-d,l).rgb',
'     +textureLod(uImg,uv+vec2(d.x,-d.y),l).rgb+textureLod(uImg,uv+vec2(-d.x,d.y),l).rgb;',
'  return c/16.;}',
'void main(){',
'  vec2 uv=vUv;',
'  vec4 m=texture(uMask,uv);m/=max(1e-4,dot(m,vec4(1.)));',
// проявка расползается за край области мягко, поэтому берём размытую маску
'  vec4 ms=textureLod(uMask,uv,2.5);ms/=max(1e-4,dot(ms,vec4(1.)));',
'  float P=dot(ms,uR);',
// порог проявки пятнами, а не ровной заливкой
'  float th=vn(uv*7.+uSeed)*.7+hash(uv*997.+uSeed)*.3;',
'  float p=clamp(P*1.5-th*.5,0.,1.);',
// сначала крупные формы, потом детали: как у настоящей диффузии
'  float lod=6.4*pow(1.-p,.8);',
'  vec3 img=blur(uv,lod);',
'  float fr=floor(uT*24.);',
'  vec2 px=floor(uv*uRes/1.6);',
'  vec3 g=vec3(hash(px+fr*vec2(7.13,3.71)),hash(px+fr*vec2(2.9,8.3)+17.),hash(px+fr*vec2(5.3,1.7)+41.))-.5;',
'  vec2 q=uv*4.5+vec2(uSeed,fr*.015);',
'  vec3 lf=vec3(vn(q),vn(q+vec2(9.2,3.1)),vn(q+vec2(4.4,7.7)))-.5;',
// шум почти серый: зерно по яркости и немного цвета
'  float gm=(g.r+g.g+g.b)/3.,ll=(lf.r+lf.g+lf.b)/3.;',
'  vec3 nz=vec3(.5)+gm*.62+(g-gm)*.34+ll*.3+(lf-ll)*.16;',
'  float sa=1.-pow(1.-p,2.2);',
'  vec3 c=mix(nz,img,sa)+(gm*.8+(g-gm)*.3)*(1.-p)*.26;',
// подсветка слова: чужие пиксели гаснут в серый
'  float w=dot(m,uF);',
'  float lum=dot(c,vec3(.299,.587,.114));',
'  c=mix(c,vec3(lum*.3+.03),uFA*(1.-w)*.86);',
'  o=vec4(clamp(c,0.,1.),1.);',
'}'].join('\n');

function shader(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
var prog=gl.createProgram();
gl.attachShader(prog,shader(gl.VERTEX_SHADER,VS));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,FS));
gl.linkProgram(prog);gl.useProgram(prog);
var vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
var aLoc=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(aLoc);gl.vertexAttribPointer(aLoc,2,gl.FLOAT,false,0,0);
var U={};['uImg','uMask','uR','uF','uFA','uT','uSeed','uRes'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
gl.uniform1i(U.uImg,0);gl.uniform1i(U.uMask,1);gl.uniform2f(U.uRes,canvas.width,canvas.height);

function tex(unit){var t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);return t}

/* ═════════ маски: какой кусок промпта отвечает за какой пиксель ═════════
   Считаются из самой картинки по цвету и месту: красное в рамке маяка, всё выше горизонта небо,
   ниже горизонта бирюза и пена это волны, остальное скалы */
var MS=256,HOR=.414,COVER=[0,0,0,0];
function buildMasks(img){
  var c=document.createElement('canvas');c.width=c.height=MS;
  var x=c.getContext('2d');x.drawImage(img,0,0,MS,MS);
  var px=x.getImageData(0,0,MS,MS).data,N=MS*MS;
  var ch=[new Float32Array(N),new Float32Array(N),new Float32Array(N),new Float32Array(N)];
  for(var j=0;j<MS;j++)for(var i=0;i<MS;i++){
    var k=j*MS+i,r=px[k*4]/255,g=px[k*4+1]/255,b=px[k*4+2]/255,u=(i+.5)/MS,v=(j+.5)/MS;
    var lum=.299*r+.587*g+.114*b;
    var inBox=u>.64&&u<.755&&v>.165&&v<.462;
    var red=r>.3&&r>g*1.6&&r>b*1.45;
    var lantern=u>.666&&u<.732&&v>.172&&v<.27&&(b<g-.1||lum<.3);
    if(inBox&&(red||lantern)){ch[0][k]=1;continue}
    if(v<HOR){ch[3][k]=1;continue}
    var water=(b-r)>.025||(g-r)>.05||(lum>.62&&Math.abs(r-b)<.12);
    if(water)ch[2][k]=1;else ch[1][k]=1;
  }
  // чистим крапинки голосованием соседей, потом смягчаем край
  ch=ch.map(function(a){return blurCh(blurCh(a,2).map(function(q){return q>.5?1:0}),2)});
  ch[0]=ch[0].map(function(q){return sm2(q*1.4)});
  var out=new Uint8Array(N*4);
  for(var n=0;n<N;n++){
    var s=ch[0][n]+ch[1][n]+ch[2][n]+ch[3][n]||1;
    for(var q=0;q<4;q++){var w=ch[q][n]/s;COVER[q]+=w/N;out[n*4+q]=Math.round(w*255)}
  }
  tex(1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,MS,MS,0,gl.RGBA,gl.UNSIGNED_BYTE,out);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function sm2(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function blurCh(a,r){
  var t=new Float32Array(a.length),o=new Float32Array(a.length),d=2*r+1;
  for(var j=0;j<MS;j++)for(var i=0;i<MS;i++){var s=0;for(var k=-r;k<=r;k++)s+=a[j*MS+clamp(i+k,0,MS-1)];t[j*MS+i]=s/d}
  for(var j2=0;j2<MS;j2++)for(var i2=0;i2<MS;i2++){var s2=0;for(var k2=-r;k2<=r;k2++)s2+=t[clamp(j2+k2,0,MS-1)*MS+i2];o[j2*MS+i2]=s2/d}
  return o;
}

var ready=false;
var picture=new Image();
picture.onload=function(){
  tex(0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,picture);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  buildMasks(picture);
  ready=true;start();
};
picture.src=IMG;

/* ═════════ состояние картинки ═════════
   R: насколько проявлена каждая область (0 шум, TYPED грубо, 1 готово). F: какая область подсвечена */
var S={R:[0,0,0,0],Rt:[0,0,0,0],rate:[3,3,3,3],F:[0,0,0,0],Ft:[0,0,0,0],FA:0,FAt:0,seed:Math.random()*50,t:0};
function setRegion(i,v,rate){S.Rt[i]=v;S.rate[i]=rate||3}
function setAll(v,hard){for(var i=0;i<4;i++){S.Rt[i]=v;if(hard)S.R[i]=v}}
function render(dt){
  S.t+=dt;
  for(var i=0;i<4;i++){
    S.R[i]+=(S.Rt[i]-S.R[i])*(1-Math.exp(-dt*S.rate[i]));
    S.F[i]+=(S.Ft[i]-S.F[i])*(1-Math.exp(-dt*12));
  }
  S.FA+=(S.FAt-S.FA)*(1-Math.exp(-dt*9));
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform4fv(U.uR,S.R);gl.uniform4fv(U.uF,S.F);
  gl.uniform1f(U.uFA,S.FA);gl.uniform1f(U.uT,S.t);gl.uniform1f(U.uSeed,S.seed);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  Sound.update({R:S.R,F:S.F,FA:S.FA,cover:COVER});
}

/* ═════════ композер ═════════ */
var card=document.getElementById('card'),shot=document.getElementById('shot');
var ctext=document.getElementById('ctext'),send=document.getElementById('send');
var pill=document.getElementById('pill'),pl=pill.querySelector('.pl'),bar=document.getElementById('bar'),barI=bar.querySelector('i');
var cursorEl=document.getElementById('cursor');
var caret=h('span','caret'),phs=[];

function clearPrompt(){
  ctext.innerHTML='';phs=[];
  PROMPT.forEach(function(p){var s=h('span',p[1]<0?'gl':'ph');s.dataset.full=p[0];s.dataset.r=p[1];ctext.appendChild(s);phs.push(s)});
  ctext.appendChild(caret);
  syncEmpty();
}
function fillPrompt(){phs.forEach(function(s){s.textContent=s.dataset.full});syncEmpty()}
function syncEmpty(){
  var n=phs.reduce(function(a,s){return a+s.textContent.length},0);
  ctext.classList.toggle('empty',!n);
  send.classList.toggle('dim',!n);
  return n;
}
function phraseOf(r){return phs.filter(function(s){return +s.dataset.r===r})[0]}

/* печать: каждое законченное слово ключевого куска добавляет проявки его области */
async function typePrompt(alive){
  caret.classList.add('hold');
  for(var i=0;i<phs.length;i++){
    var s=phs[i],full=s.dataset.full,r=+s.dataset.r;
    var words=full.split(' ').length,done=0;
    if(r>=0)s.classList.add('live');
    for(var c=0;c<full.length;c++){
      if(!alive())throw 0;
      s.textContent=full.slice(0,c+1);syncEmpty();
      var end=c===full.length-1||full[c+1]===' ';
      if(r>=0&&end&&full[c]!==' '){done++;setRegion(r,TYPED*done/words,4.2);if(done===words)Sound.ev('accent',r)}
      var ch=full[c];
      if(ch!==' ')Sound.ev('key');
      await sleep(ch===' '?46:(ch===','?120:30+Math.random()*26));
    }
    if(r>=0){(function(el){setTimeout(function(){el.classList.remove('live')},D(650))})(s);await sleep(260)}
  }
  caret.classList.remove('hold');
}
/* стирание с конца: кусок, который начали стирать, сразу возвращает свою область в шум */
async function erasePrompt(alive){
  caret.classList.add('hold');
  for(var i=phs.length-1;i>=0;i--){
    var s=phs[i],r=+s.dataset.r;
    if(r>=0){s.classList.add('live');setRegion(r,0,2.6)}
    while(s.textContent.length){
      if(!alive())throw 0;
      s.textContent=s.textContent.slice(0,-1);syncEmpty();Sound.ev('del');
      await sleep(r>=0?24:36);
    }
    s.classList.remove('live');
    if(r>=0)await sleep(170);
  }
  caret.classList.remove('hold');
}

/* ─────────── плашка ─────────── */
var pillOdo=null;
function pillSet(html,on){
  pl.innerHTML=html;var v=pl.querySelector('.v');pillOdo=v?new Odo(v):null;
  pill.classList.toggle('on',on!==false);
}
function pillOff(){pill.classList.remove('on')}

/* ─────────── генерация: 30 шагов, всё доводится от грубого к резкому ─────────── */
var genId=0,lastGen=0;
async function generate(){
  var id=++genId,base=S.R.slice(),t0=performance.now();
  unfocus();
  send.classList.add('run');send.classList.remove('dim');
  pillSet('Step&nbsp;<span class="v"></span>&nbsp;of '+STEPS);pillOdo.set('0');
  bar.classList.add('on');barI.style.setProperty('--gl',1);
  for(var i=0;i<4;i++)S.rate[i]=80;
  Sound.ev('rise',D(2500)/1000);var lastStep=0;
  await tween(2500,function(p){
    if(id!==genId)return;
    var e=eio(p);
    for(var i=0;i<4;i++)S.Rt[i]=mix(base[i],1,e);
    var step=Math.round(p*STEPS);pillOdo.set(String(step));
    if(step!==lastStep){lastStep=step;Sound.ev('step',step)}
    barI.style.transform='scaleX('+p.toFixed(4)+')';
  });
  if(id!==genId)return;
  lastGen=(performance.now()-t0)/1000;
  send.classList.remove('run');
  barI.style.setProperty('--gl',0);
  pillSet('Done in '+lastGen.toFixed(1)+' s');
  setTimeout(function(){if(id===genId){bar.classList.remove('on');if(!S.FAt)pillOff()}},D(1200));
}

/* ─────────── подсветка слова ─────────── */
var focused=-1;
function focus(r){
  focused=r;
  for(var i=0;i<4;i++)S.Ft[i]=i===r?1:0;
  S.FAt=1;
  phs.forEach(function(s){s.classList.toggle('foc',+s.dataset.r===r)});
  var pct=Math.round(COVER[r]*100);
  Sound.ev('accent',r);
  pillSet('<span class="v"></span>% of the frame');pillOdo.set(String(Math.max(0,pct-9)));
  setTimeout(function(){if(focused===r&&pillOdo)pillOdo.set(String(pct))},40);
  return pct;
}
function unfocus(){
  focused=-1;S.FAt=0;
  phs.forEach(function(s){s.classList.remove('foc')});
  pillOff();
}
ctext.addEventListener('click',function(e){
  var s=e.target.closest('.ph');
  if(!s||S.R[+s.dataset.r]<.9)return;
  var r=+s.dataset.r;
  Sound.ev('tap');
  if(focused===r)unfocus();else focus(r);
});
shot.addEventListener('click',function(){if(focused>=0)unfocus()});

/* ─────────── курсор ─────────── */
var CUR={x:0,y:0};
function curPlace(){cursorEl.style.transform='translate('+(CUR.x-5).toFixed(1)+'px,'+(CUR.y-3).toFixed(1)+'px)'}
function centerOf(el){var r=loc(el.getBoundingClientRect(),card);return {x:r.x+r.w/2,y:r.y+r.h/2}}
function curMove(x,y,dur){
  var x0=CUR.x,y0=CUR.y;
  // лёгкая дуга, как у руки
  var nx=-(y-y0),ny=x-x0,L=Math.hypot(nx,ny)||1,bend=Math.min(40,L*.12);
  return tween(dur||520,function(p){
    var e=eio(p),a=Math.sin(Math.PI*e)*bend;
    CUR.x=mix(x0,x,e)+nx/L*a;CUR.y=mix(y0,y,e)+ny/L*a;curPlace();
  });
}
async function curClick(){cursorEl.classList.add('down');Sound.ev('tap');await sleep(110);cursorEl.classList.remove('down')}

/* ─────────── субтитры ─────────── */
var sayEl=document.getElementById('say'),sayI=0,sayLast='';
function say(text){
  if(text===sayLast)return;sayLast=text;
  var sp=sayEl.children,out=sp[sayI],inn=sp[1-sayI];sayI=1-sayI;
  out.classList.remove('on');out.classList.add('off');
  inn.classList.remove('off');void inn.offsetWidth;
  inn.textContent=text;if(text)inn.classList.add('on');
}

/* ─────────── общий кадр ─────────── */
(function loop(){
  var last=performance.now();
  function f(now){
    var el=Math.min(4,(now-last)/1000);last=now;
    if(ready)render(Math.min(el,.1));
    camStep(el);
    requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
})();

/* ─────────── режиссёр ─────────── */
var auto={id:0,running:false};
var tools=document.getElementById('tools');
if(REC)tools.style.display='none';
function wide(){frame(card,1.25,.88)}

async function play(){
  var g=++auto.id,alive=function(){return g===auto.id};
  var W=function(ms){return sleep(ms).then(function(){if(!alive())throw 0})};
  auto.running=true;tools.classList.add('hide');
  try{
    genId++;unfocus();bar.classList.remove('on');send.classList.remove('run');
    clearPrompt();setAll(0);for(var i=0;i<4;i++)S.rate[i]=2.4;
    wide();if(REC)camSnap();
    CUR.x=card.offsetWidth+40;CUR.y=card.offsetHeight+30;curPlace();cursorEl.classList.remove('on');
    await W(REC?500:900);
    say('Each word you type develops its own part of the picture.');
    await W(250);
    await typePrompt(alive);
    await W(250);

    // жмём «сгенерировать»
    var b=centerOf(send);
    cursorEl.classList.add('on');
    await curMove(b.x+4,b.y+6,560);
    await curClick();send.classList.add('press');setTimeout(function(){send.classList.remove('press')},D(160));
    say('Then '+STEPS+' steps sharpen all of it at once.');
    await generate();
    if(!alive())throw 0;
    await W(750);

    // слово показывает свои пиксели
    var p0=phraseOf(0),c0=centerOf(p0);
    say('Tap a word to see which pixels it drew.');
    await curMove(c0.x+8,c0.y+5,620);
    await curClick();focus(0);
    await W(1600);
    var p2=phraseOf(2),c2=centerOf(p2);
    await curMove(c2.x+6,c2.y+5,520);
    await curClick();var pct=focus(2);
    say('“crashing waves” drew '+pct+'% of the frame.');
    await W(1700);
    var sh=loc(shot.getBoundingClientRect(),card);
    await curMove(sh.x+sh.w*.3,sh.y+sh.h*.2,560);
    await curClick();unfocus();
    await W(150);
    cursorEl.classList.remove('on');
    await W(500);

    // стираем промпт: картинка уходит обратно в шум, и цикл замыкается
    say('Delete the words and their pixels go back to noise.');
    await W(350);
    await erasePrompt(alive);
    await W(1300);
    if(REC){window.__done=true;return}
    if(!reduce)play();
  }catch(e){if(e!==0)throw e}
}
function settle(){
  genId++;if(!phs.length)clearPrompt();fillPrompt();
  for(var i=0;i<4;i++){S.rate[i]=6;S.Rt[i]=1}
  send.classList.remove('run');bar.classList.remove('on');
}
function stopAuto(){
  auto.id++;auto.running=false;
  cursorEl.classList.remove('on');
  phs.forEach(function(s){s.classList.remove('live')});
  settle();unfocus();
  wide();say('');tools.classList.remove('hide');
}

/* ─────────── запуск и низ ─────────── */
function start(){
  clearPrompt();
  if(REC){Sound.record();window.__renderAudio=function(){return Sound.render(COVER)}}
  if(REC){wide();camSnap();setTimeout(play,60)}
  else if(!reduce)setTimeout(play,400);
  else{settle();setAll(1,true)}
}
document.addEventListener('pointerdown',function(e){
  if(e.isTrusted&&!REC&&!e.target.closest('#snd'))Sound.start();
  if(e.isTrusted&&auto.running&&!e.target.closest('#tools'))stopAuto();
},true);
document.getElementById('play').addEventListener('click',function(){play()});
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(!REC)Sound.start();
  if(e.key==='r'||e.key==='R')play();
});
addEventListener('resize',function(){wide()});
var sndBtn=document.getElementById('snd');
sndBtn.addEventListener('click',function(){
  var v=!Sound.on;Sound.setOn(v);
  sndBtn.textContent=v?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',v);
});
var themeBtns=document.querySelectorAll('#theme button');
function markTheme(t){themeBtns.forEach(function(x){x.classList.toggle('on',x.dataset.theme===t)})}
markTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
themeBtns.forEach(function(b){
  b.addEventListener('click',function(){markTheme(b.dataset.theme);document.documentElement.setAttribute('data-theme',b.dataset.theme)});
});
