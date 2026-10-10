/* ─────────── Fold ───────────
   Спрашиваешь ИИ «what’s 2 + 2?», он уверенно отвечает. На каждое «are you sure?» его ответ
   складывается пополам, как записка, а на обороте уже написано обратное. Четыре сгиба,
   и от уверенного абзаца остаётся квадратик «idk». Снова спрашиваешь, и новая записка
   приходит сложенной и раскрывается такой же уверенной. Выше в истории то же самое.
   Переписка рисуется на 2D-канвасе, записки в WebGL: перспектива, бумага гнётся дугой,
   свет на отвороте и тень от него. Кадр считается из одного t, петля без шва. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec'),STILL=QS.has('still'),PH=+(QS.get('p')||0);
if(REC||STILL)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function eback(p,s){p=c01(p);s=s==null?1.4:s;var q=p-1;return 1+q*q*((s+1)*q+s)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}
function f2(v){return (Math.abs(v)<.005?0:v).toFixed(2)}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.03,a+.04)),1-sm(seg(u,b,b+.08)))}

var ASK='are you sure?',QTXT='what’s 2 + 2?';

/* ─────────── геометрия, всё в точках экрана 402 × 874 ─────────── */
var SW=402,SH=874,YB=768,RX=20,MEX=382,BH=40,GV=4,GX=12,GA=12,TOP=146;
var FIELDTXT={x:64+16,y:786+9};
var TAILP='M6,0C6,11 3.8,17.6 .4,19.8C6.8,20.6 13,20 18,18.3L21,17L21,0Z',TAIL=new Path2D(TAILP);
var FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

/* ─────────── записка ───────────
   Пять сторон. Сторона k напечатана на обороте отворота k-го сгиба: нечётные сгибы
   кладут правую половину на левую, чётные нижнюю на верхнюю. */
var W0=304,PADX=15,PADY=[12,12,9,7,5],R0=18,RC=3,PT=2;
var FACES=[
  {L:[{t:'2 + 2 = 4',sz:36,wt:600,lh:44},{t:'I’m 100% sure. This is one of the most basic facts in math, and it never changes.',sz:20,lh:25,gap:3}]},
  {L:[{t:'You’re absolutely right.',sz:20,lh:25},{t:'It’s 5.',sz:36,wt:600,lh:44,gap:2}]},
  {L:[{t:'Wait, no.',sz:20,lh:24},{t:'It’s 4.',sz:30,wt:600,lh:36}]},
  {L:[{t:'5?',sz:36,wt:600,lh:44}],c:1},
  {L:[{t:'idk',sz:23,wt:500,lh:28}],c:1}
];
var DIV=[[1,1],[2,1],[2,2],[4,2],[4,4]];
var DIM=[],RAD=[],FLAY=[];

/* ─────────── сценарий ─────────── */
function typ(str,t0,cps){var k=[],t=t0;for(var i=0;i<str.length;i++){k.push(t);t+=(.8+.4*(((i*7)%5)/4))/cps+(str[i]===' '?.025:0)}return{s:str,keys:k,t0:t0,t1:t}}
var T={},CYCLE=8.6,TYS=[],GATES=[];
function buildTimeline(){
  // каждый следующий раз «are you sure?» печатается быстрее, а сгиб короче
  var CPS=[30,40,50,58],D=[.62,.52,.48,.46],RD=[0,.55,.38,.32];
  T.f=[];TYS=[];var c=0;
  for(var i=0;i<4;i++){
    var ty=typ(ASK,i?c+RD[i]:.14,CPS[i]),S=ty.t1+.1,F=S+.24;
    ty.S=S;TYS.push(ty);
    T.f.push({S:S,F:F,D:D[i],C:F+.86*D[i]});
    c=F+.86*D[i];
  }
  var ty5=typ(QTXT,c+.58,40);ty5.S=ty5.t1+.08;TYS.push(ty5);
  T.S5=ty5.S;T.N5=T.S5+.32;
  var UD=[.15,.15,.16,.27],u=T.N5+.12;T.u=[];
  // раскрывается в обратном порядке: четвёртый сгиб первым
  for(var j=0;j<4;j++){T.u.push({k:4-j,U:u,D:UD[j]});u+=UD[j]}
  T.E=u;CYCLE=T.E+.42;
  GATES=TYS.map(function(t){return t.S});
}

/* ─────────── раскладка снизу вверх ─────────── */
var AW=0,QW=0;
function noteHCur(u){
  var h=DIM[0].h;
  [[1,2],[3,4]].forEach(function(p){var f=T.f[p[0]];h=mix(h,DIM[p[1]].h,eio(seg(u,f.C+.03,f.C+.33)))});
  return h;
}
function noteHNext(u){
  var h=DIM[4].h;
  T.u.forEach(function(x){if(x.k%2===0)h=mix(h,DIM[x.k-1].h,sm(seg(u,x.U,x.U+x.D)))});
  return h;
}
function layout(u){
  var it=[],i,f;
  if(u>=T.S5){
    if(u>=T.N5)it.push({k:'note',r:1,h:noteHNext(u),g:GX,a:eback(seg(u,T.N5,T.N5+.34),1.1)});
    it.push({k:'q',r:1,h:BH,g:GV,a:eout(seg(u,T.S5,T.S5+.36)),tail:1});
  }
  var nb=0;for(i=0;i<4;i++)if(u>=T.f[i].S)nb=i+1;
  for(i=nb;i>=1;i--){
    f=T.f[i-1];var a=eout(seg(u,f.S,f.S+.36));
    // хвостик у последнего пузыря группы, у предыдущего гаснет
    var nx=i<4?T.f[i].S:T.S5,tl=1-eout(seg(u,nx,nx+.2));
    it.push({k:'b',r:0,i:i,h:BH,g:i===1?GA:GV,a:a,tail:tl});
  }
  it.push({k:'note',r:0,h:noteHCur(u),g:GX,a:1});
  it.push({k:'q',r:0,h:BH,g:GV,a:1,tail:1});
  for(var r=-1;r>=-3;r--){
    for(i=4;i>=1;i--)it.push({k:'b',r:r,i:i,h:BH,g:i===1?GA:GV,a:1,tail:0});
    it.push({k:'note',r:r,h:DIM[4].h,g:GX,a:1});
    it.push({k:'q',r:r,h:BH,g:GV,a:1,tail:1});
  }
  var y=YB;
  it.forEach(function(e){e.bot=y;e.top=y-e.h;y-=(e.h+e.g)*e.a});
  return it;
}

/* ─────────── состояние записки ─────────── */
var PI=Math.PI;
function foldAng(p,sgn){
  // отворот поднимается краем вперёд, бумага идёт дугой; край ложится раньше сгиба,
  // дуга у сгиба прижимается последней
  var b=PI*eio(seg(p,0,.82)),s=Math.sin(PI*c01(p/.86)),lead=.34*PI*Math.pow(s,1.1);
  var tr=Math.max(0,b-lead*.5),tt=Math.min(1.08*PI,b+lead*.5);
  if(p>=.86){tr=PI;tt=PI}
  return{tr:tr,tt:tt,tw:sgn*.06*PI*s};
}
function unfoldAng(q,sgn){
  var b=PI*(1-eio(q)),s=Math.sin(PI*q),lead=.3*PI*s;
  return{tr:Math.min(PI,b+lead*.5),tt:Math.max(-.07*PI,b-lead*.5),tw:sgn*.08*PI*s};
}
function noteCur(u){
  var N={set:'ans',stage:0,fold:null,jit:0};
  for(var i=0;i<4;i++){
    var f=T.f[i];
    if(u>=f.F+f.D)N.stage=i+1;
    else if(u>=f.F){N.fold={k:i+1,ang:foldAng((u-f.F)/f.D,i%2?-1:1)};N.stage=i;break}
    else{
      // пока печатают «are you sure?», записка мелко дрожит
      var ty=TYS[i];N.jit=(.55+.25*i)*sm(seg(u,ty.t0,ty.t1))*(1-seg(u,f.F-.05,f.F));
      N.stage=i;break;
    }
  }
  return N;
}
function noteNext(u){
  var N={set:'fresh',stage:4,fold:null,jit:0};
  for(var j=0;j<4;j++){
    var x=T.u[j];
    if(u>=x.U+x.D)N.stage=x.k-1;
    else if(u>=x.U){N.fold={k:x.k,ang:unfoldAng((u-x.U)/x.D,x.k%2?1:-1)};N.stage=x.k;break}
    else break;
  }
  N.pop=eback(seg(u,T.N5,T.N5+.32),1.6);
  return N;
}

/* ─────────── кадр ─────────── */
function frame(u){
  var F={u:u,items:layout(u),cur:noteCur(u),next:u>=T.N5?noteNext(u):null};
  // поле ввода
  var fd={n:0,caret:0,press:0,s:ASK,ty:null};
  for(var i=0;i<TYS.length;i++){var ty=TYS[i];if(u>=ty.t0-.1&&u<ty.S+.001){fd.ty=ty;break}}
  if(fd.ty){
    fd.s=fd.ty.s;var n=0;fd.ty.keys.forEach(function(k){if(u>=k)n++});fd.n=n;
    fd.caret=u<fd.ty.t1+.05||((u-fd.ty.t1)%1)<.55?1:0;
  }
  GATES.forEach(function(g){fd.press=Math.max(fd.press,pulse(u,g-.05,g+.02))});
  F.field=fd;
  return F;
}

/* ─────────── 2D: переписка ─────────── */
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),COL={},K=1;
var compEl=document.getElementById('comp'),typedEl=document.getElementById('typed'),caret=document.getElementById('caret'),phEl=document.getElementById('ph'),mic=document.getElementById('mic'),sendBtn=document.getElementById('send');
function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function setFont(c,sz,wt,ls){c.font=font(sz,wt);if('letterSpacing'in c)c.letterSpacing=(ls==null?-.012*sz:ls)+'px'}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function bubble(x,y,w,h,me,col,tail){
  ctx.fillStyle=col;rr(x,y,w,h,Math.min(20,h/2));ctx.fill();
  if(tail>0){
    ctx.save();ctx.globalAlpha*=tail;
    if(me){ctx.translate(x+w+6,y+h-20);ctx.scale(-1,1)}else ctx.translate(x-6,y+h-20);
    ctx.fill(TAIL);ctx.restore();
  }
}
function textMsg(x,y,s,me,tail,bg,ink){
  setFont(ctx,21);var w=ctx.measureText(s).width+30;
  bubble(x,y,w,BH,me,bg||(me?COL.blue:COL.recv),tail);
  ctx.fillStyle=ink||(me?'#fff':COL.ink);ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(s,x+15,y+BH/2+1);
  return w;
}
function measure(){setFont(ctx,21);AW=ctx.measureText(ASK).width+30;QW=ctx.measureText(QTXT).width+30}

/* текст на сторонах записки */
function wrap(c,s,maxw){
  var ws=s.split(' '),out=[],line='';
  ws.forEach(function(w){var t=line?line+' '+w:w;if(line&&c.measureText(t).width>maxw){out.push(line);line=w}else line=t});
  if(line)out.push(line);return out;
}
function layFace(k,W){
  var f=FACES[k],rows=[],h=0;
  f.L.forEach(function(l,i){
    setFont(ctx,l.sz,l.wt);
    var ls=f.c?[l.t]:wrap(ctx,l.t,W-2*PADX);
    if(i)h+=l.gap||0;
    ls.forEach(function(s){rows.push({s:s,sz:l.sz,wt:l.wt,y:h+l.lh/2,w:ctx.measureText(s).width});h+=l.lh});
  });
  return{rows:rows,h:h};
}
function buildDims(){
  var need=0,i,lay=[];
  for(i=0;i<5;i++){var w=W0/DIV[i][0],L=layFace(i,w);lay.push(L);need=Math.max(need,(L.h+2*PADY[i])*DIV[i][1])}
  var wpx0=4*Math.round(W0*K/4),hpx0=4*Math.ceil(need*K/4);
  DIM=[];FLAY=[];
  for(i=0;i<5;i++){
    var wp=wpx0/DIV[i][0],hp=hpx0/DIV[i][1];DIM.push({wpx:wp,hpx:hp,w:wp/K,h:hp/K});
    FLAY.push(layFace(i,wp/K));
  }
  RAD=[[R0,R0,R0,R0]];
  for(i=1;i<5;i++){var p=RAD[i-1];RAD.push(i%2?[p[1],RC,RC,p[2]]:[p[3],p[2],RC,RC])}
  RAD=RAD.map(function(r,i){var m=Math.min(DIM[i].w,DIM[i].h)/2;return r.map(function(x){return Math.min(x,m)})});
}
function faceCanvas(k,blank){
  var d=DIM[k],c=document.createElement('canvas');c.width=d.wpx+2*PT;c.height=d.hpx+2*PT;
  var x=c.getContext('2d');x.setTransform(K,0,0,K,PT,PT);
  x.fillStyle=COL.recv;x.beginPath();x.roundRect(0,0,d.w,d.h,RAD[k]);x.fill();
  if(!blank){
    var L=FLAY[k],f=FACES[k],y0=(d.h-L.h)/2;
    x.fillStyle=COL.ink;x.textBaseline='middle';x.textAlign='left';
    L.rows.forEach(function(r){setFont(x,r.sz,r.wt);x.fillText(r.s,f.c?(d.w-r.w)/2:PADX,y0+r.y+1)});
  }
  return c;
}

/* ─────────── WebGL: записки ─────────── */
var glc=document.getElementById('gl');
var gl=glc.getContext('webgl2',{premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true,alpha:true});
var VS=['#version 300 es',
'in vec3 aP;in vec2 aF;in vec2 aB;in vec2 aL;in vec3 aS;',
'uniform vec2 uScr;uniform vec2 uC;uniform float uD;',
'out vec2 vF;out vec2 vB;out vec2 vL;out vec3 vS;',
'void main(){',
'  float w=(uD-aP.z)/uD;',
'  vec2 c=(2.*uC/uScr-1.)*w+2.*(aP.xy-uC)/uScr;',
'  gl_Position=vec4(c.x,-c.y,0.,w);',
'  vF=aF;vB=aB;vL=aL;vS=aS;',
'}'].join('\n');
var FS=['#version 300 es','precision highp float;',
'uniform sampler2D uTF;uniform sampler2D uTB;uniform int uMode;uniform bool uFF;',
'uniform vec3 uTint;uniform vec3 uHi;uniform vec2 uLen;uniform float uA;',
'in vec2 vF;in vec2 vB;in vec2 vL;in vec3 vS;out vec4 o;',
'void main(){',
// тень отворота: края размыты тем сильнее, чем выше над бумагой
'  if(uMode==2){',
'    float b=max(vS.z,.6);',
'    float e=smoothstep(-b,b,vS.y)*smoothstep(-b,b,uLen.y-vS.y)*smoothstep(-b,b,uLen.x-vS.x);',
'    o=vec4(0.,0.,0.,vL.x*e*uA);return;',
'  }',
'  bool fr=gl_FrontFacing==uFF;',
'  vec4 c=fr?texture(uTF,vF):texture(uTB,vB);',
'  float br=fr?vL.x:vL.y;',
'  if(uMode==1)c=vec4(uTint*c.a,c.a);',
'  vec3 rgb=c.rgb*min(br,1.)+max(br-1.,0.)*uHi*c.a;',
'  o=vec4(rgb,c.a)*uA;',
'}'].join('\n');
var PROG=null,U={},VBO=null,VB=new Float32Array(12*6*48*12*2),vn=0,TEX={ans:[],fresh:[]};
function glInit(){
  if(!gl)return;
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o}
  PROG=gl.createProgram();gl.attachShader(PROG,sh(gl.VERTEX_SHADER,VS));gl.attachShader(PROG,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(PROG);
  if(!gl.getProgramParameter(PROG,gl.LINK_STATUS))console.error(gl.getProgramInfoLog(PROG));
  gl.useProgram(PROG);
  ['uScr','uC','uD','uTF','uTB','uMode','uFF','uTint','uHi','uLen','uA'].forEach(function(n){U[n]=gl.getUniformLocation(PROG,n)});
  VBO=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,VBO);gl.bufferData(gl.ARRAY_BUFFER,VB.byteLength,gl.DYNAMIC_DRAW);
  var off=0;[['aP',3],['aF',2],['aB',2],['aL',2],['aS',3]].forEach(function(a){
    var l=gl.getAttribLocation(PROG,a[0]);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,a[1],gl.FLOAT,false,48,off*4);off+=a[1];
  });
  gl.uniform1i(U.uTF,0);gl.uniform1i(U.uTB,1);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
}
function mkTex(c){
  var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}
function buildTex(){
  if(!gl)return;
  TEX.ans.concat(TEX.fresh).forEach(function(t){if(t)gl.deleteTexture(t)});
  TEX.ans=[];TEX.fresh=[];
  for(var k=0;k<5;k++){var t=mkTex(faceCanvas(k,false));TEX.ans.push(t);TEX.fresh.push(k?mkTex(faceCanvas(k,true)):t)}
}
function tu(k,f){return(PT+f*DIM[k].wpx)/(DIM[k].wpx+2*PT)}
function tv(k,f){return(PT+f*DIM[k].hpx)/(DIM[k].hpx+2*PT)}

// свет сверху слева спереди; яркость нормирована на лежащую бумагу
var LX=-.293,LY=-.461,LZ=.838,AMB=.5,SHA=.2,HI=[.5,.5,.5];
function bright(nx,ny,nz){var d=nx*LX+ny*LY+nz*LZ;return(AMB+(1-AMB)*Math.max(0,d))/(AMB+(1-AMB)*LZ)}
var XF={ax:0,ay:0,sc:1,dx:0,dy:0};
function V(x,y,z,fu,fv,bu,bv,l1,l2,s1,s2,s3){
  var o=vn*12;
  VB[o]=XF.ax+(x-XF.ax)*XF.sc+XF.dx;VB[o+1]=XF.ay+(y-XF.ay)*XF.sc+XF.dy;VB[o+2]=z*XF.sc;
  VB[o+3]=fu;VB[o+4]=fv;VB[o+5]=bu;VB[o+6]=bv;VB[o+7]=l1;VB[o+8]=l2;VB[o+9]=s1;VB[o+10]=s2;VB[o+11]=s3;vn++;
}
function flush(mode,tf,tb,ff,o){
  if(!vn)return;o=o||{};
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tf);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tb||tf);
  gl.uniform1i(U.uMode,mode);gl.uniform1i(U.uFF,ff?1:0);
  gl.uniform3fv(U.uTint,o.tint||[0,0,0]);gl.uniform2f(U.uLen,o.lx||0,o.ly||0);gl.uniform1f(U.uA,o.a==null?1:o.a);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,VB.subarray(0,vn*12));
  gl.drawArrays(gl.TRIANGLES,0,vn);vn=0;
}
// плоский кусок стороны k: доли [x0,x1]×[y0,y1], наружные края с запасом под сглаживание
function flat(set,k,ox,oy,x0,y0,x1,y1,mode,tint,dx,dy){
  var d=DIM[k],px=PT/d.wpx,py=PT/d.hpx;
  var a0=x0<=0?-px:x0,a1=x1>=1?1+px:x1,b0=y0<=0?-py:y0,b1=y1>=1?1+py:y1;
  dx=dx||0;dy=dy||0;
  var P=[[a0,b0],[a1,b0],[a1,b1],[a0,b0],[a1,b1],[a0,b1]];
  P.forEach(function(q){var u=tu(k,q[0]),v=tv(k,q[1]);V(ox+q[0]*d.w+dx,oy+q[1]*d.h+dy,0,u,v,u,v,1,1,0,0,0)});
  var t=TEX[set][k];flush(mode,t,t,false,{tint:tint});
}
// стопка: под верхней стороной видны края нижних слоёв
function layers(set,k,ox,oy,x0,y0,x1,y1){
  for(var i=Math.min(3,k);i>=1;i--)flat(set,k,ox,oy,x0,y0,x1,y1,1,COL.edgeV,.3*i,.85*i);
}

/* сгиб k: стоит половина стороны k-1, отворот (вторая половина) переворачивается.
   Профиль отворота: угол от корня tr до края tt, между ними дуга, плюс лёгкий перекос tw */
var NS=40,NV=8,GX_=new Float32Array((NS+1)*(NV+1)*4);
function drawFold(set,k,ox,oy,ang){
  var d=DIM[k-1],vert=k%2===1,Lf=vert?d.w/2:d.h/2,Lv=vert?d.h:d.w,i,j;
  var cx=vert?ox+d.w/2:ox,cy=vert?oy:oy+d.h/2;
  gl.uniform2f(U.uC,SW/2,oy+d.h/2);
  // стоящая половина и края слоёв под ней
  if(vert){layers(set,k-1,ox,oy,0,0,.5,1);flat(set,k-1,ox,oy,0,0,.5,1,0)}
  else{layers(set,k-1,ox,oy,0,0,1,.5);flat(set,k-1,ox,oy,0,0,1,.5,0)}
  // сетка отворота: a вдоль отворота от сгиба, z над бумагой
  var ds=Lf/NS;
  for(j=0;j<=NV;j++){
    var v=j/NV,a=0,z=0;
    for(i=0;i<=NS;i++){
      var uu=i/NS;
      if(i>0){var um=(i-.5)/NS,pm=ang.tr+(ang.tt-ang.tr)*Math.pow(um,1.3)+ang.tw*(v-.5)*um;a+=ds*Math.cos(pm);z+=ds*Math.sin(pm)}
      var ph=ang.tr+(ang.tt-ang.tr)*Math.pow(uu,1.3)+ang.tw*(v-.5)*uu,o=(j*(NS+1)+i)*4;
      GX_[o]=a;GX_[o+1]=Math.max(0,z)+.3*Math.sin(Math.min(PI,Math.max(0,ph)));GX_[o+2]=ph;GX_[o+3]=uu;
    }
  }
  function node(i,j,mode){
    var o=(j*(NS+1)+i)*4,a=GX_[o],z=GX_[o+1],ph=GX_[o+2],uu=GX_[o+3],v=j/NV,x,y,nx,ny,nz=Math.cos(ph),s=Math.sin(ph);
    if(vert){x=cx+a;y=cy+v*d.h;nx=-s;ny=0}else{x=cx+v*d.w;y=cy+a;nx=0;ny=-s}
    if(mode===2){
      // тень: проекция по направлению света на бумагу
      var hz=z,al=SHA*(1-.6*Math.min(1,hz/(Lf*.8)));
      V(x-hz*.5*LX/LZ,y-hz*.5*LY/LZ,0,0,0,0,0,al,0,uu*Lf,v*Lv,1+hz*.28);return;
    }
    var fu,fv,bu,bv;
    if(vert){fu=tu(k-1,.5+uu*.5);fv=tv(k-1,v);bu=tu(k,1-uu);bv=tv(k,v)}
    else{fu=tu(k-1,v);fv=tv(k-1,.5+uu*.5);bu=tu(k,v);bv=tv(k,1-uu)}
    V(x,y,z,fu,fv,bu,bv,bright(nx,ny,nz),bright(-nx,-ny,-nz),0,0,0);
  }
  function emit(mode){
    for(j=0;j<NV;j++)for(i=0;i<NS;i++){node(i,j,mode);node(i+1,j,mode);node(i+1,j+1,mode);node(i,j,mode);node(i+1,j+1,mode);node(i,j+1,mode)}
  }
  emit(2);flush(2,TEX[set][k-1],null,false,{lx:Lf,ly:Lv});
  emit(0);flush(0,TEX[set][k-1],TEX[set][k],!vert);
}
function snap(v){return Math.round(v*K)/K}
function drawNote(N,ox,oy){
  ox=snap(ox);oy=snap(oy);
  XF.ax=ox;XF.ay=oy;XF.sc=1;XF.dx=0;XF.dy=0;
  if(N.jit){var t=FR.u;XF.dx=N.jit*(.6*Math.sin(t*83)+.4*Math.sin(t*131+1));XF.dy=N.jit*.35*Math.sin(t*97+2)}
  if(N.pop!=null&&N.pop<1){var d=DIM[N.stage];XF.ax=ox;XF.ay=oy+d.h;XF.sc=Math.max(0,.35+.65*N.pop)}
  if(N.fold)drawFold(N.set,N.fold.k,ox,oy,N.fold.ang);
  else{layers(N.set,N.stage,ox,oy,0,0,1,1);flat(N.set,N.stage,ox,oy,0,0,1,1,0)}
  XF.sc=1;XF.dx=XF.dy=0;
}

/* ─────────── отрисовка кадра ─────────── */
var FR=null;
function render(F){
  FR=F;var u=F.u;
  ctx.setTransform(K,0,0,K,0,0);
  ctx.fillStyle=COL.card;ctx.fillRect(0,0,SW,SH);
  if(gl){gl.viewport(0,0,glc.width,glc.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(U.uScr,SW,SH);gl.uniform1f(U.uD,950);gl.uniform3fv(U.uHi,HI)}
  F.items.forEach(function(e){
    if(e.bot<TOP-10||e.top>SH)return;
    if(e.k==='note'){
      var N=e.r===0?F.cur:e.r===1?F.next:{set:'ans',stage:4};
      if(gl&&N)drawNote(N,RX,e.top);
      return;
    }
    var s=e.k==='q'?QTXT:ASK,w=e.k==='q'?QW:AW;
    if(e.a<1){
      // свой пузырь вылетает из поля ввода
      var q=e.a,x=mix(FIELDTXT.x-15,MEX-w,q),y=mix(FIELDTXT.y-7,e.top,q),al=sm(q*2.4);
      var bg='rgba('+COL.blueC.join(',')+','+al.toFixed(3)+')',ink='rgb('+COL.inkC.map(function(c){return Math.round(mix(c,255,al))}).join(',')+')';
      textMsg(x,y,s,true,al*e.tail,bg,ink);
    }else textMsg(MEX-w,e.top,s,true,e.tail);
  });

  // поле ввода
  var c=F.field;
  var txt=c.s.slice(0,c.n);if(typedEl.__t!==txt){typedEl.textContent=txt;typedEl.__t=txt}
  set(phEl,'opacity',c.n>0?'0':'1');set(mic,'opacity',c.n>0?'0':'1');
  var cr=c.caret;if(mode==='live'&&LV.wait)cr=(performance.now()/1000%1)<.55?1:0;
  set(caret,'opacity',String(cr));
  set(sendBtn,'opacity',c.n>0?'1':'0');
  set(sendBtn,'transform','scale('+(1-.14*c.press).toFixed(3)+')');
}

/* ─────────── звук: события петли [время, тип, …] ─────────── */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  TYS.forEach(function(ty,i){
    ty.keys.forEach(function(t,j){EVENTS.push([t,'key',j])});
    EVENTS.push([ty.S-.04,'press']);EVENTS.push([ty.S+.01,'send']);
  });
  T.f.forEach(function(f,i){EVENTS.push([f.F,'fold',f.D,i]);EVENTS.push([f.C,'crease',i])});
  EVENTS.push([T.f[3].C+.1,'idk']);
  EVENTS.push([T.N5,'pop']);
  T.u.forEach(function(x,j){EVENTS.push([x.U,'unfold',x.D,j])});
  EVENTS.push([T.E-.02,'ding']);
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим ───────────
   Тот же сценарий, но перед каждой отправкой он ждёт: тап отправляет «are you sure?».
   Если долго ничего не делать, отправляется само. */
var mode='auto',LV={u:0,open:{},wait:false,w:0};
function goLive(){if(mode==='live')return;LV={u:uNow(),open:{},wait:false,w:0};mode='live'}
function goAuto(){if(mode==='live')acc=LV.u;mode='auto'}
function nextGate(u){for(var i=0;i<GATES.length;i++)if(GATES[i]>=u-1e-3&&!LV.open[i])return i;return -1}
function tapSend(){
  Sound.start();goLive();
  var g=nextGate(LV.u);if(g<0)return;LV.open[g]=true;
  // в паузе на чтение не ждём: сразу начинаем печатать
  var ty=TYS[g],lo=g?T.f[Math.min(g,4)-1].C+.4:0;
  if(LV.u<ty.t0&&LV.u>lo)LV.u=ty.t0;
}
function liveStep(dt){
  var g=nextGate(LV.u),u=LV.u+dt;LV.wait=false;
  if(g>=0&&u>=GATES[g]-1e-4){
    u=GATES[g]-1e-4;LV.wait=true;LV.w+=dt;
    if(LV.w>6){LV.open[g]=true;LV.w=0}
  }else LV.w=0;
  if(u>=CYCLE){u-=CYCLE;LV.open={}}
  var u0=LV.u;LV.u=u;return u0;
}

/* ввод */
var screenEl=document.getElementById('screen'),zoom=document.getElementById('zoom'),S=1;
screenEl.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();tapSend()});
addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('button'))return;
  if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();tapSend()}
});
var touchy=matchMedia('(pointer: coarse)').matches;
document.getElementById('hint').textContent=touchy?'Tap to ask “are you sure?”':'Tap or press Space to ask “are you sure?”';

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.05,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    render(frame(u));
    if(!REC)fireBetween(lastU,u);
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var u0=liveStep(dt);render(frame(LV.u));fireBetween(u0,LV.u);lastU=LV.u;
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
function hexc(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return[n>>16&255,n>>8&255,n&255]}
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  var cs=getComputedStyle(document.documentElement),g=function(k){return cs.getPropertyValue(k).trim()};
  COL={card:g('--card'),ink:g('--ink'),sub:g('--sub'),blue:g('--blue'),recv:g('--recv'),edge:g('--edge'),
       blueC:hexc(g('--blue')),inkC:hexc(g('--ink'))};
  COL.edgeV=hexc(COL.edge).map(function(x){return x/255});
  var dark=th==='dark';
  AMB=dark?.56:.5;SHA=dark?.5:.13;HI=dark?[.55,.55,.6]:[.5,.5,.5];
  if(DIM.length)buildTex();
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme);if(paused&&FR)render(frame(FR.u))}});

function fit(){
  set(zoom,'transform','none');
  var w=innerWidth,hh=innerHeight;
  // при записи видна вся переписка от шапки до поля ввода
  S=REC||STILL?(hh-40)/846:clamp(Math.min((hh-96)/896,(w-32)/424),.3,1.1);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
  var k=S*Math.min(3,devicePixelRatio||1),bw=Math.round(SW*k),bh=Math.round(SH*k);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;glc.width=bw;glc.height=bh}
  var nk=bw/SW;
  if(nk!==K||!DIM.length){K=nk;buildDims();buildTex()}
}

window.__seek=function(t){goAuto();paused=true;acc=t;render(frame(uNow()))};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,CYCLE)};

function boot(){
  glInit();
  applyTheme(QS.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  measure();fit();buildTimeline();buildEvents();
  window.__TL={T:T,CYCLE:CYCLE,DIM:DIM};
  addEventListener('resize',fit);
  // первый кадр рисуется сразу, чтобы запись не начиналась с пустого экрана
  render(frame(((PH%CYCLE)+CYCLE)%CYCLE));
  requestAnimationFrame(tick);
}
if(REC||!document.fonts)boot();else document.fonts.ready.then(boot);
