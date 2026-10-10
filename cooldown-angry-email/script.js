/* ─────────── Cooldown ───────────
   Злое письмо раскалено. Цвет каждой буквы считается по излучению чёрного тела при её температуре:
   спектр Планка через кривые CIE 1931 в sRGB. Кнопка отправки становится термометром и не пускает
   горячее письмо. Пока её держишь, письмо остывает, и каждый кусок, дойдя до точки Дрейпера
   (525°, ниже металл уже не светится), шипит паром и становится корпоративным.
   Автопоказ считается из одного времени t, поэтому петля замыкается без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function eback(p,c){p=c01(p);c=c==null?1.2:c;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}

/* ─────────── чёрное тело ───────────
   Для каждых 10° от 0 до 1700: спектр Планка, свёрнутый с кривыми CIE (аппроксимация Wyman, Sloan, Shirley),
   XYZ в линейный sRGB. Храним цветность (максимум канала = 1) и логарифм яркости. */
var BB=(function(){
  function g(l,m,a,b){var t=(l-m)/(l<m?a:b);return Math.exp(-.5*t*t)}
  var out=[];
  for(var T=0;T<=1700;T+=10){
    var K=T+273.15,X=0,Y=0,Z=0;
    for(var l=380;l<=780;l+=4){
      var lm=l*1e-9,B=1/(Math.pow(lm,5)*(Math.exp(1.4388e-2/(lm*K))-1));
      X+=B*(1.056*g(l,599.8,37.9,31)+.362*g(l,442,16,26.7)-.065*g(l,501.1,20.4,26.2));
      Y+=B*(.821*g(l,568.8,46.9,40.5)+.286*g(l,530.9,16.3,31.1));
      Z+=B*(1.217*g(l,437,11.8,36)+.681*g(l,459,26,13.8));
    }
    var r=Math.max(0,3.2406*X-1.5372*Y-.4986*Z),gg=Math.max(0,-.9689*X+1.8758*Y+.0415*Z),b=Math.max(0,.0557*X-.204*Y+1.057*Z),m=Math.max(r,gg,b)||1;
    out.push({c:[r/m,gg/m,b/m],lY:Math.log(Math.max(Y,1e-300))});
  }
  return out;
})();
var DRAPER=525,ROOM=21,TOP=1450;
function lut(T){
  var f=clamp(T,300,1695)/10,i=Math.floor(f),k=f-i,a=BB[i],b=BB[i+1];
  return {c:[mix(a.c[0],b.c[0],k),mix(a.c[1],b.c[1],k),mix(a.c[2],b.c[2],k)],lY:mix(a.lY,b.lY,k)};
}
var LY0=lut(DRAPER).lY,LY1=lut(TOP).lY;
function oetf(x){x=c01(x);return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055}
function to255(a){return [Math.round(a[0]*255),Math.round(a[1]*255),Math.round(a[2]*255)]}
/* яркое ядро с пересветом: чем горячее, тем сильнее каналы упираются в 1, и оранжевое уходит в жёлто-белое */
function look(T){
  var L=lut(T),g=c01((L.lY-LY0)/(LY1-LY0)),c=L.c,E=.9+.075*Math.exp(4.8*g);
  // засветка: у самых горячих каналы перетекают друг в друга, как на матрице камеры, и жёлтое белеет
  var w=1.6*Math.pow(Math.max(0,g-.7),2)*E;
  var core=to255([oetf(1-Math.exp(-(c[0]*E+w))),oetf(1-Math.exp(-(c[1]*E+w))),oetf(1-Math.exp(-(c[2]*E+w)))]);
  var halo=to255([oetf(c[0]),oetf(c[1]),oetf(c[2])]);
  // на белом светящееся не может быть светлее фона: чернила сохраняют тон накала, но темнее
  var v=mix(.18,.95,Math.pow(g,1.4)),lit=to255([oetf(c[0]*v),oetf(c[1]*v),oetf(c[2]*v)]);
  return {g:g,core:core,halo:halo,lit:lit};
}
function rgb(a){return 'rgb('+a[0]+','+a[1]+','+a[2]+')'}
function rgba(a,al){return 'rgba('+a[0]+','+a[1]+','+a[2]+','+c01(al).toFixed(3)+')'}
function mixc(a,b,t){return [Math.round(mix(a[0],b[0],t)),Math.round(mix(a[1],b[1],t)),Math.round(mix(a[2],b[2],t))]}
function lum(a){return (.2126*a[0]+.7152*a[1]+.0722*a[2])/255}

/* ─────────── письмо ───────────
   Горячий кусок и его остывшая версия. T0: температура накала. Строки без горячего текста
   конденсируются, когда остыл кусок after. */
var LINES=[
  {it:[{h:'MARK.',c:'Hi Mark,',T:800}]},
  {it:[{h:'I SENT IT',c:'Per my last',T:960},{h:'TWICE.',c:'two emails,',T:1110}]},
  {it:[{h:'',c:'re-attaching for visibility.',after:2,gap:.1}]},
  {it:[{h:'READ YOUR EMAILS',c:'Hope this helps',T:1260},{h:'!!!',c:'!',T:1450,glue:1}]},
  {it:[{h:'',c:'Best,',after:4,gap:.12}]}
];
var K=.5;            // остывание: T = комната + (T0 − комната)·e^(−K·t)
var MORPH=.4;        // смена горячего куска на холодный
var LH=22;

var mail=document.getElementById('mail'),mover=document.getElementById('mover'),zoom=document.getElementById('zoom');
var body=document.getElementById('body'),glyphs=document.getElementById('glyphs'),caret=document.getElementById('caret');
var att=document.getElementById('att'),quote=document.getElementById('quote');
var sendB=document.getElementById('send'),sarr=document.getElementById('sarr'),deg=document.getElementById('deg'),tip=document.getElementById('tip');
var bloom=document.getElementById('bloom'),fx=document.getElementById('fx'),bctx=bloom.getContext('2d'),fctx=fx.getContext('2d');
var cur=document.getElementById('cur');

var ITEMS=[],HOT=[];
LINES.forEach(function(L,li){
  L.li=li;
  L.items=L.it.map(function(d,ii){
    var it={L:L,li:li,ii:ii,h:d.h,c:d.c,T0:d.T||0,glue:!!d.glue,after:d.after,gap:d.gap||0,x:0,w:0};
    it.el=h('span','it');
    it.hotEl=h('span','ch hot');it.coolEl=h('span','ch cool');
    it.hg=Array.from(d.h).map(function(ch){var e=h('i',null,ch);it.hotEl.appendChild(e);return {el:e,ch:ch,b:1e9}});
    it.cg=Array.from(d.c).map(function(ch){var e=h('i',null,ch);it.coolEl.appendChild(e);return {el:e,ch:ch}});
    it.el.appendChild(it.hotEl);it.el.appendChild(it.coolEl);glyphs.appendChild(it.el);
    if(d.h){it.hi=HOT.length;HOT.push(it);it.q=Math.log((it.T0-ROOM)/(DRAPER-ROOM))/K}
    ITEMS.push(it);return it;
  });
  L.cool=L.items.every(function(it){return !it.h});
});

/* набор: злые короткие очереди, пауза после точки, перенос строки, три удара по «!» */
var TOK=[],TYEND=0;
(function(){
  var r=rng(11),t=0,prev=null;
  function gap(ch){
    if(prev===null)return 0;
    var g=.052+r()*.03;
    if(ch===' ')g=.07+r()*.025;
    if(ch==='\n')g=.2+r()*.05;
    if(prev==='.')g+=.09;
    if(ch==='!')g=prev==='!'?.062:.12;
    return g;
  }
  LINES.forEach(function(L){
    if(L.cool)return;
    if(prev!==null){t+=gap('\n');prev='\n';TOK.push({k:'nl',L:L,t:t})}
    L.items.forEach(function(it,ii){
      if(ii&&!it.glue){t+=gap(' ');prev=' ';TOK.push({k:'sp',it:it,t:t})}
      it.hg.forEach(function(g,k){t+=gap(g.ch);prev=g.ch;g.b=t;TOK.push({k:'g',it:it,g:k,t:t,ch:g.ch})});
      it.b0=it.hg[0].b;
    });
  });
  TYEND=t;
})();

/* искры от ударов по раскалённым клавишам и пар при закалке: всё заранее, из сида */
var SPARKS=[];
(function(){
  var r=rng(5);
  HOT.forEach(function(it){
    if(it.T0<1050)return;
    it.hg.forEach(function(g,k){
      var n=it.T0>=1400?5+Math.floor(r()*3):it.T0>=1200?2+Math.floor(r()*2):1+Math.floor(r()*1.4);
      for(var i=0;i<n;i++){
        var a=-Math.PI/2+(r()-.5)*2.3;
        SPARKS.push({it:it,k:k,b:g.b+r()*.03,vx:Math.cos(a)*(40+r()*120),vy:Math.sin(a)*(70+r()*140),life:.35+r()*.45,sz:1+r()*.8,dx:(r()-.5)*.6});
      }
    });
  });
})();
HOT.forEach(function(it,i){
  var r=rng(40+i),n=6+Math.round(it.h.length*1.3);
  it.steam=[];
  for(var k=0;k<n;k++)it.steam.push({u:r(),d:.08+r()*.2,vy:26+r()*30,sw:(r()-.5)*2,ph:r()*6.28,life:.7+r()*.6,rad:4+r()*6,a:.5+r()*.5});
});
function afterQ(it,F){var p=F.qt[it.after];return p==null?null:p+it.gap}

/* ─────────── раскладка: всё в координатах письма, без учёта масштаба ─────────── */
var M={sp:4,dw:8,cw:3,dg:5,bx:0,by:0,sendR:0,cy:26,W:360,H:392};
var DG=[];   // разряды термометра: тысячи, запятая, сотни, десятки, единицы
(function(){
  deg.textContent='';
  [3,-1,2,1,0].forEach(function(p){
    if(p<0){var c=h('span','dc',',');deg.appendChild(c);DG.push({comma:true,el:c});return}
    var d=h('span','dg'),u=h('u');
    for(var k=0;k<11;k++)u.appendChild(h('b',null,String(k%10)));
    d.appendChild(u);deg.appendChild(d);DG.push({p:p,el:d,u:u});
  });
  deg.appendChild(h('span','dd','°'));
})();
function measure(){
  ITEMS.forEach(function(it){
    it.wh=it.hotEl.offsetWidth;it.wc=it.coolEl.offsetWidth;
    it.hg.forEach(function(g){g.x=g.el.offsetLeft;g.w=g.el.offsetWidth});
    it.cg.forEach(function(g){g.x=g.el.offsetLeft;g.w=g.el.offsetWidth});
  });
  var m=h('span','meas',' ');body.appendChild(m);M.sp=m.getBoundingClientRect().width/scaleNow();body.removeChild(m);
  M.W=mail.clientWidth;M.H=mail.clientHeight;
  M.bx=body.offsetLeft;M.by=body.offsetTop+body.clientTop+12;
  M.sendR=sendB.offsetLeft+32;M.cy=sendB.offsetTop+16;
  var u=DG[0].u;DG.forEach(function(d){if(!d.comma)set(d.el,'width','')});
  M.dw=DG[0].el.getBoundingClientRect().width/scaleNow()||7.6;
  M.cw=DG[1].el.getBoundingClientRect().width/scaleNow()||3.4;
  M.dg=deg.lastChild.getBoundingClientRect().width/scaleNow()||5;
  sizeCanvas();
}
var S=1;
function scaleNow(){return S}
function fit(){
  var w=innerWidth,hh=innerHeight;
  S=REC||STILL?Math.min(w/360*.88,hh/392*.74):clamp(Math.min((w-32)/360,(hh-110)/392),.8,1.6);
  set(zoom,'transform','scale('+S.toFixed(4)+')');
}
var DPR=1;
function sizeCanvas(){
  DPR=Math.min(2,window.devicePixelRatio||1)*S;
  [bloom,fx].forEach(function(c){c.width=Math.round(M.W*DPR);c.height=Math.round(M.H*DPR)});
}

/* ─────────── тема ─────────── */
var TH={dark:false,ink:[27,26,24],blue:[47,111,237],card:[255,255,255]};
function hex(v){v=v.trim().replace('#','');if(v.length===3)v=v.split('').map(function(x){return x+x}).join('');var n=parseInt(v,16);return [n>>16&255,n>>8&255,n&255]}
function readTheme(){
  var cs=getComputedStyle(document.documentElement);
  TH.ink=hex(cs.getPropertyValue('--ink'));TH.blue=hex(cs.getPropertyValue('--blue'));TH.card=hex(cs.getPropertyValue('--card'));
  TH.dark=lum(TH.card)<.5;
}

/* ─────────── кадр ───────────
   F: mv сдвиг письма, ty время набора, cool сколько письмо остывало, ct часы эффектов с начала остывания,
   qt[i] когда кусок i прошёл точку Дрейпера (по часам эффектов), tap с момента отказа, tip, cur, t время для марева */
function chunkT(it,F){
  var q=F.qt[it.hi];
  if(q!=null)return ROOM+(DRAPER-ROOM)*Math.exp(-(F.ct-q)*7);
  return ROOM+(it.T0-ROOM)*Math.exp(-K*F.cool);
}
function morphOf(it,F){
  var q=it.h?F.qt[it.hi]:afterQ(it,F);
  return q==null?0:seg(F.ct,q,q+MORPH);
}
// ширина меняется, когда горячие буквы уже почти ушли паром, иначе соседний кусок наезжает на них
function widthOf(it,F){
  var q=it.h?F.qt[it.hi]:afterQ(it,F);
  return q==null?0:it.h?seg(F.ct,q+.16,q+.6):seg(F.ct,q,q+MORPH);
}
function tempNow(F){
  var D=ROOM;
  HOT.forEach(function(it){
    if(F.ty<it.b0)return;
    var T=chunkT(it,F),rise=eout(seg(F.ty,it.b0,it.b0+.42));
    D=Math.max(D,ROOM+(T-ROOM)*rise);
  });
  return D;
}

function layout(F){
  var y=0;
  LINES.forEach(function(L){
    var x=0,hh=LH;
    if(L.cool){var a=afterQ(L.items[0],F);hh=a==null?0:LH*eio(seg(F.ct,a-.04,a+.28))}
    else if(F.ty<L.items[0].b0-.0001&&L!==LINES[0]){
      // строка ещё не начата: занимает место с момента переноса
      var nl=TOK.filter(function(k){return k.k==='nl'&&k.L===L})[0];
      if(!nl||F.ty<nl.t)hh=0;
    }
    L.y=y;L.h=hh;
    L.items.forEach(function(it,ii){
      if(ii&&!it.glue)x+=M.sp;
      it.m=morphOf(it,F);
      it.x=x;it.w=mix(it.wh,it.wc,eio(widthOf(it,F)));
      x+=it.w;
    });
    y+=hh;
  });
  return y;
}

function drawText(F,t){
  var H=layout(F),dark=TH.dark,inkEmber=look(DRAPER+40);
  set(body,'height',Math.max(98,12+H+12).toFixed(2)+'px');
  ITEMS.forEach(function(it){
    var L=it.L,vis=it.h?F.ty>=it.b0:it.m>0;
    set(it.el,'visibility',vis?'visible':'hidden');
    if(!vis)return;
    set(it.el,'transform','translate('+it.x.toFixed(2)+'px,'+L.y.toFixed(2)+'px)');
    var m=it.m;
    // горячий кусок
    if(it.h){
      if(F.qt[it.hi]!=null&&F.ct>=F.qt[it.hi]+.6)set(it.hotEl,'display','none');
      else{
        set(it.hotEl,'display','');
        // закалка: горячие буквы уходят паром вверх, по очереди слева направо
        var q=F.qt[it.hi],ev=q==null?0:seg(F.ct,q,q+.6),nh=it.hg.length;
        set(it.hotEl,'filter',ev?'blur('+(ev*2.2).toFixed(2)+'px)':'none');
        var T=chunkT(it,F);
        it.hg.forEach(function(g,k){
          if(F.ty<g.b){set(g.el,'visibility','hidden');return}
          set(g.el,'visibility','visible');
          var age=F.ty-g.b,fl=F.cool>0?0:380*Math.exp(-age/.12),lk=look(T+fl),gg=lk.g;
          if(!(q!=null&&F.ct>q))set(g.el,'color',rgb(dark?lk.core:lk.lit));
          set(g.el,'textShadow',gg<.004?'none':dark
            ?'0 0 1px '+rgba(lk.core,.6*gg)+',0 0 5px '+rgba(lk.halo,.85*gg)+',0 0 13px '+rgba(lk.halo,.55*gg)
            :'0 0 4px '+rgba(lk.halo,.5*gg)+',0 0 12px '+rgba(lk.halo,.32*gg));
          // марево: соседние буквы дрожат вместе, как воздух над металлом
          var gx=it.x+g.x+g.w/2,A=reduce?0:gg,pop=reduce?0:.1*Math.exp(-age/.06);
          var dy=A*.42*(Math.sin(gx*.23+t*7.3+it.li)+.6*Math.sin(gx*.071-t*4.6+2*it.li));
          var dx=A*.22*Math.sin(gx*.13+t*5.1);
          if(ev>0){
            var e=seg(ev,k/nh*.3,k/nh*.3+.7),rs=Math.sin(k*12.9898+it.hi*78.233)*43758.5453;rs-=Math.floor(rs);
            dy-=(reduce?0:8)*eout(e);dx+=(reduce?0:(rs-.5)*3)*eout(e);
            set(g.el,'opacity',(1-sm(e*1.25)).toFixed(3));
            set(g.el,'color',rgb(mixc(dark?lk.core:lk.lit,dark?[205,200,192]:[168,168,172],sm(e*1.4))));
          }else set(g.el,'opacity','1');
          set(g.el,'transform',(dx||dy||pop)?'translate('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px) scale('+(1+pop).toFixed(3)+')':'none');
        });
      }
    }else set(it.hotEl,'display','none');
    // холодный кусок: буквы конденсируются слева направо, первые мгновения ещё тёплые
    if(m<=0){set(it.coolEl,'display','none');return}
    set(it.coolEl,'display','');
    var q=it.h?F.qt[it.hi]:afterQ(it,F),n=it.cg.length,st=Math.min(.016,.26/n),t0=q+.08;
    it.cg.forEach(function(g,k){
      var p=seg(F.ct,t0+k*st,t0+k*st+.34);
      set(g.el,'opacity',p>=1?'1':sm(p).toFixed(3));
      set(g.el,'filter',p>=1?'none':'blur('+((1-p)*2.6).toFixed(2)+'px)');
      set(g.el,'transform',p>=1?'none':'translateY('+((1-eout(p))*3).toFixed(2)+'px)');
      var w=it.h?1-sm(p*1.3):0;
      set(g.el,'color',w>0?rgb(mixc(TH.ink,dark?inkEmber.core:inkEmber.lit,w*.8)):'');
    });
  });
  // вложение появляется вместе со строкой «re-attaching»
  var ra=LINES[2].items[0],aa=afterQ(ra,F),ao=aa==null?0:eio(seg(F.ct,aa+.06,aa+.4));
  set(att,'height',(ao*40).toFixed(2)+'px');
  set(att,'opacity',aa==null?'0':sm(seg(F.ct,aa+.18,aa+.5)).toFixed(3));
  set(att,'marginTop',(ao*2).toFixed(2)+'px');
  // каретка: сплошная при наборе, мигает в паузе
  var ca=F.caret;
  if(ca>0){
    var last=null;for(var i=0;i<TOK.length&&TOK[i].t<=F.ty;i++)last=TOK[i];
    var cx=0,cl=LINES[0];
    if(last){
      if(last.k==='g'){var g=last.it.hg[last.g];cx=last.it.x+g.x+g.w;cl=last.it.L}
      else if(last.k==='sp'){var pv=last.it.L.items[last.it.ii-1];cx=pv.x+pv.w+M.sp;cl=last.it.L}
      else{cx=0;cl=last.L}
    }
    var idle=last?F.ty-last.t:0,blink=idle<.45?1:(.5+.5*Math.cos((idle-.45)*Math.PI*2/1.05))>.5?1:0;
    set(caret,'opacity',String(ca*blink));
    set(caret,'transform','translate('+(cx+.5).toFixed(2)+'px,'+(12+cl.y+1.5).toFixed(2)+'px)');
  }else set(caret,'opacity','0');
}

/* термометр на месте кнопки: разряды крутятся барабаном, лишние разряды схлопываются */
function reel(D,v){
  // единицы и десятки щёлкают по целым (на такой скорости барабан был бы кашей), старшие перекатываются
  var p10=Math.pow(10,D.p),w=D.p>=2?p10*.04:1,pos=D.p>=2?Math.floor(v/p10)%10+c01((v%p10-(p10-w))/w):Math.floor(v/p10)%10;
  set(D.u,'transform','translateY('+(-pos*16).toFixed(2)+'px)');
}
function drawSend(F,t){
  var D=tempNow(F),P=sm(seg(D,40,260)),v=Math.max(0,D);
  var vth=sm((v-988)/24),vhu=sm((v-88)/24);
  DG.forEach(function(d){
    if(d.comma){set(d.el,'width',(M.cw*vth).toFixed(2)+'px');set(d.el,'opacity',vth.toFixed(3));return}
    var vis=d.p===3?vth:d.p===2?vhu:1;
    set(d.el,'width',(M.dw*vis).toFixed(2)+'px');set(d.el,'opacity',vis.toFixed(3));
    reel(d,v);
  });
  var cw=M.dw*(2+vth+vhu)+M.cw*vth+M.dg,W=mix(32,22+cw,P);
  var lk=look(Math.max(D,DRAPER+15)),hot=lk.core,bg=mixc(TH.blue,hot,P),tl=sm((lum(bg)-.42)/.2);
  set(sendB,'width',W.toFixed(2)+'px');
  set(sendB,'background',rgb(bg));
  set(sendB,'color',rgb(mixc([255,255,255],[27,22,18],tl*P)));
  set(sendB,'boxShadow',P>.01?'0 0 '+(TH.dark?14:10)+'px '+rgba(lk.halo,(TH.dark?.55:.35)*lk.g*P):'none');
  set(sarr,'opacity',(1-sm(P*2)).toFixed(3));
  set(sarr,'transform','scale('+(1-.3*P).toFixed(3)+')');
  set(deg,'opacity',sm((P-.35)/.65).toFixed(3));
  // отказ: кнопка трясёт головой
  var sx=0;
  if(F.tap>=0&&F.tap<.6&&!reduce)sx=5*Math.sin(F.tap*Math.PI*2*6.5)*Math.exp(-F.tap*6.5);
  var pr=F.press||0;
  set(sendB,'transform','translateX('+sx.toFixed(2)+'px) scale('+(1-.06*pr).toFixed(4)+')');
  set(sendB,'transformOrigin','100% 50%');
  set(tip,'opacity',F.tip.toFixed(3));
  set(tip,'transform','translateY('+((1-eout(F.tip))*-4).toFixed(2)+'px) scale('+(.96+.04*eout(F.tip)).toFixed(4)+')');
  sendB.setAttribute('aria-label',P>.5?'Too hot to send: '+Math.round(D)+' degrees. Hold to cool down':'Send');
  return {D:D,P:P,lk:lk};
}

/* свечение на бумаге под текстом, искры и пар поверх */
function drawFx(F,t){
  var dark=TH.dark;
  bctx.setTransform(DPR,0,0,DPR,0,0);bctx.clearRect(0,0,M.W,M.H);
  fctx.setTransform(DPR,0,0,DPR,0,0);fctx.clearRect(0,0,M.W,M.H);
  if(F.ty<0)return;
  // свет от раскалённых кусков
  bctx.globalCompositeOperation=dark?'lighter':'source-over';
  HOT.forEach(function(it){
    if(F.ty<it.b0||it.m>=1)return;
    var lk=look(chunkT(it,F)),gg=lk.g*(1-it.m)*sm(seg(F.ty,it.b0,it.b0+.3));
    if(gg<.01)return;
    var last=0;it.hg.forEach(function(g){if(F.ty>=g.b)last=g.x+g.w});
    var cx=M.bx+it.x+last/2,cy=M.by+it.L.y+11,rx=last/2+24,ry=22;
    bctx.save();bctx.translate(cx,cy);bctx.scale(rx/ry,1);
    var gr=bctx.createRadialGradient(0,0,0,0,0,ry);
    var al=dark?.2*Math.pow(gg,1.2):.1*gg;
    gr.addColorStop(0,rgba(lk.halo,al));gr.addColorStop(.55,rgba(lk.halo,al*.35));gr.addColorStop(1,rgba(lk.halo,0));
    bctx.fillStyle=gr;bctx.fillRect(-ry,-ry,ry*2,ry*2);bctx.restore();
  });
  // искры: баллистика, короткий след
  if(!reduce)SPARKS.forEach(function(s){
    var a=F.ty-s.b;if(a<0||a>s.life)return;
    var g=s.it.hg[s.k],x0=M.bx+s.it.x+g.x+g.w/2,y0=M.by+s.it.L.y+6;
    function P(tt){return [x0+s.vx*tt+s.dx*tt*60,y0+s.vy*tt+.5*420*tt*tt]}
    var p1=P(a),p0=P(Math.max(0,a-.035)),k=a/s.life,lk=look(1550-650*k);
    fctx.strokeStyle=rgba(dark?lk.core:lk.lit,1-k*k);
    fctx.lineWidth=s.sz*(1-.5*k);fctx.lineCap='round';
    fctx.beginPath();fctx.moveTo(p0[0],p0[1]);fctx.lineTo(p1[0],p1[1]);fctx.stroke();
  });
  // пар: клубы поднимаются от куска, растут и тают
  HOT.forEach(function(it){
    var q=F.qt[it.hi];if(q==null)return;
    it.steam.forEach(function(s){
      var a=F.ct-q-s.d;if(a<0||a>s.life)return;
      var k=a/s.life,x=M.bx+it.x+s.u*it.wh+s.sw*a*16+Math.sin(a*4+s.ph)*2.5,y=M.by+it.L.y-2-s.vy*a*(1-.3*a);
      var r=2+s.rad*eout(k),al=s.a*sm(a/.15)*(1-sm(k))*(dark?.09:.14);
      // клуб вытянут вверх: пар поднимается быстрее, чем расходится
      fctx.save();fctx.translate(x,y);fctx.scale(1,1.45);
      var gr=fctx.createRadialGradient(0,0,0,0,0,r);
      var c=dark?[236,233,226]:[140,146,154];
      gr.addColorStop(0,rgba(c,al));gr.addColorStop(.5,rgba(c,al*.45));gr.addColorStop(1,rgba(c,0));
      fctx.fillStyle=gr;fctx.fillRect(-r,-r,r*2,r*2);fctx.restore();
    });
  });
}

function drawCur(F){
  var c=F.cur;
  if(!c||c.a<=.001){set(cur,'opacity','0');return}
  set(cur,'opacity',c.a.toFixed(3));
  set(cur,'transform','translate('+(c.x-5).toFixed(2)+'px,'+(c.y+F.mvC-2.6).toFixed(2)+'px) scale('+c.s.toFixed(3)+')');
  set(cur,'transformOrigin','5px 2.6px');
}

function render(F,t){
  set(mover,'transform',F.mv?'translateY('+F.mv.toFixed(2)+'px)':'none');
  drawText(F,t);
  var st=drawSend(F,t);
  drawFx(F,t);
  drawCur(F);
  return st;
}

/* ─────────── автопоказ ───────────
   набор, курсор идёт к кнопке, тап: «слишком горячее», удержание: остывание и закалка по кускам,
   отпускание, пауза на чтение, отправка улетает вверх, снизу приезжает новый черновик */
var TL={};
function buildTL(){
  TL.TY0=.3;TL.TYE=TL.TY0+TYEND;
  TL.CUR0=TL.TYE+.06;TL.CUR1=TL.CUR0+.52;
  TL.TAP=TL.CUR1+.04;
  TL.HOLD=TL.TAP+.95;
  var last=0;ITEMS.forEach(function(it){var q=it.h?it.q:HOT[it.after].q+it.gap;last=Math.max(last,q)});
  TL.COOLD=Math.max(HOT[HOT.length-1].q+.52,last+MORPH+.08);
  TL.REL=TL.HOLD+TL.COOLD;
  TL.SEND=TL.REL+1.5;
  TL.FLY=TL.SEND+.1;TL.FLYE=TL.FLY+.44;
  TL.IN=TL.FLYE+.1;
  CYCLE=TL.IN+.6;
}
var CYCLE=10;
function flyDist(){return (innerHeight/S)/2+M.H/2+40}
function emptyF(u){return {mv:0,mvC:0,ty:-1,cool:0,ct:0,qt:HOT.map(function(){return null}),tap:-1,tip:0,caret:1,press:0,cur:null,t:u}}
function scene(u){
  var F=emptyF(u);
  if(u>=TL.IN){F.mv=flyDist()*(1-eback(seg(u,TL.IN,CYCLE),.55));F.caret=1;F.ty=-1;return F}
  F.ty=u-TL.TY0;
  F.ct=Math.max(0,u-TL.HOLD);
  F.cool=Math.min(F.ct,TL.COOLD);
  HOT.forEach(function(it,i){F.qt[i]=F.cool>=it.q?it.q:null});
  F.tap=u>=TL.TAP?u-TL.TAP:-1;
  F.tip=sm(seg(u,TL.TAP+.05,TL.TAP+.22))*(1-sm(seg(u,TL.HOLD+.15,TL.HOLD+.38)));
  F.caret=1-sm(seg(u,TL.TAP,TL.TAP+.15));
  if(u>=TL.FLY)F.mv=-flyDist()*ein(seg(u,TL.FLY,TL.FLYE));
  F.press=Math.max(pulse(u,TL.TAP,TL.TAP+.09),pulse(u,TL.HOLD,TL.REL),pulse(u,TL.SEND,TL.SEND+.09));
  // курсор: подходит снизу справа к кружку кнопки (он всегда внутри, даже когда кнопка раздута)
  if(u>=TL.CUR0-.02&&u<TL.FLYE){
    var tx=M.sendR-11,ty=M.cy+6,e=eout(seg(u,TL.CUR0,TL.CUR1)),c={x:mix(tx+64,tx,e),y:mix(ty+170,ty,e),a:sm(seg(u,TL.CUR0,TL.CUR0+.14)),s:1-.12*F.press};
    if(u>=TL.FLY){var d=seg(u,TL.FLY,TL.FLYE);c.a*=1-sm(d*1.6);c.y+=10*eout(d)}
    F.cur=c;
  }
  F.mvC=0;
  return F;
}
function pulse(u,a,b){return u<a-.06||u>b+.08?0:Math.min(sm(seg(u,a-.02,a+.05)),1-sm(seg(u,b,b+.08)))}

/* ─────────── звук ───────────
   события петли: [время, тип, …]; фон печи идёт от температуры кнопки */
var EVENTS=[];
function buildEvents(){
  EVENTS=[];
  TOK.forEach(function(k){
    var heat=k.k==='g'?c01((k.it.T0-700)/750):0;
    EVENTS.push([TL.TY0+k.t,'key',k.k==='nl'?2:k.k==='sp'?1:k.ch==='!'?3:0,heat]);
  });
  var r=rng(77);
  SPARKS.forEach(function(s){if(r()<.5)EVENTS.push([TL.TY0+s.b+.01,'spark',(s.it.x+s.it.hg[s.k].x)/M.W-.5])});
  EVENTS.push([TL.TAP,'press'],[TL.TAP+.03,'deny'],[TL.HOLD,'press']);
  HOT.forEach(function(it){EVENTS.push([TL.HOLD+it.q,'hiss',.55+.45*c01(it.wh/110),(M.bx+it.x+it.wh/2)/M.W*1.2-.6])});
  ITEMS.forEach(function(it){if(!it.h)EVENTS.push([TL.HOLD+HOT[it.after].q+it.gap+.1,'form'])});
  [.55,1.05,1.5,2.35,2.95,3.5].forEach(function(d,i){
    if(TL.HOLD+d<TL.SEND)EVENTS.push([TL.HOLD+d,'tink',2300+r()*1500,(r()-.5)*.8,.5+.5*r()]);
  });
  EVENTS.push([TL.HOLD+HOT[HOT.length-1].q+.46,'ready']);
  EVENTS.push([TL.REL,'release'],[TL.SEND,'press'],[TL.SEND+.08,'release'],[TL.FLY,'whoosh'],[TL.IN+.05,'arrive']);
  // треск печи: чем горячее кнопка, тем чаще
  for(var u=0;u<CYCLE;u+=1/60){
    var lv=c01((tempNow(scene(u))-500)/950);
    if(r()<lv*lv*.22)EVENTS.push([u,'crk',(r()-.5)*.8,.4+.6*r()]);
  }
  EVENTS.sort(function(a,b){return a[0]-b[0]});
}
function bedAt(u){return Math.pow(c01((tempNow(scene(u))-450)/1000),1.3)}
function fireBetween(u0,u1){
  if(u1<u0){fireBetween(u0,CYCLE+1e-9);u0=-1e-9}
  EVENTS.forEach(function(ev){if(ev[0]>u0&&ev[0]<=u1)Sound.play(ev)});
}

/* ─────────── живой режим: кнопку держит сам зритель ─────────── */
var mode='auto',live=null;
function nowS(){return performance.now()/1000}
function goLive(F){
  if(mode==='live')return;
  mode='live';
  var n=nowS();
  live={ty0:n-Math.max(0,F.ty),cool:F.cool,ct0:F.ct>0?n-F.ct:null,qt:F.qt.slice(),tap0:-9,holding:false,hold0:0,fly0:null,in0:null,press:0,sent:false};
  document.documentElement.classList.add('live');
}
function goAuto(){mode='auto';live=null;acc=0;lastU=0;document.documentElement.classList.remove('live')}
function liveF(n,dt){
  var F=emptyF(n);
  if(live.in0!=null){
    var p=seg(n,live.in0,live.in0+.6);
    F.mv=flyDist()*(1-eback(p,.55));
    if(p>=1){live={ty0:n+.25,cool:0,ct0:null,qt:HOT.map(function(){return null}),tap0:-9,holding:false,hold0:0,fly0:null,in0:null,press:0}}
    return F;
  }
  F.ty=n-live.ty0;
  var typed=F.ty>=TYEND;
  if(live.holding&&typed){
    if(live.ct0==null)live.ct0=n;
    live.cool=Math.min(TL.COOLD,live.cool+dt);
  }
  F.cool=live.cool;F.ct=live.ct0==null?0:n-live.ct0;
  HOT.forEach(function(it,i){if(live.qt[i]==null&&live.cool>=it.q)live.qt[i]=F.ct-(live.cool-it.q)});
  F.qt=live.qt;
  F.tap=n-live.tap0<.7?n-live.tap0:-1;
  F.tip=F.tap>=0?sm(seg(F.tap,.05,.2))*(1-sm(seg(F.tap,1.4,1.6))):0;
  if(F.tap>=0&&live.holding&&typed)F.tip*=1-sm(seg(n-live.hold0,.1,.3));
  live.press=mix(live.press,live.holding?1:0,1-Math.exp(-dt*30));
  F.press=live.press;
  F.caret=live.ct0==null?1:0;
  if(live.fly0!=null){
    var d=seg(n,live.fly0,live.fly0+.44);
    F.mv=-flyDist()*ein(d);
    if(d>=1){live.in0=n+.1;Sound.play([0,'arrive'],.15)}
  }
  return F;
}
function isHot(){var F=mode==='live'?liveF(nowS(),0):scene(uNow());return tempNow(F)>40}
function down(){
  Sound.start();
  if(mode==='auto'){var u=uNow();if(u>=TL.FLY)return;goLive(scene(u))}
  if(live.fly0!=null||live.in0!=null)return;
  var n=nowS();
  if(isHot()){
    live.holding=true;live.hold0=n;Sound.play([0,'press']);
    if(nowS()-live.ty0<TYEND){live.tap0=n;Sound.play([0,'deny'],.03)}
  }else{
    Sound.play([0,'press']);Sound.play([0,'release'],.08);
    live.fly0=n+.1;Sound.play([0,'whoosh'],.1);
  }
}
function up(){
  if(mode!=='live'||!live.holding)return;
  var n=nowS();live.holding=false;Sound.play([0,'release']);
  if(n-live.hold0<.2&&tempNow(liveF(n,0))>40){live.tap0=n;Sound.play([0,'deny'],.02)}
}
sendB.addEventListener('pointerdown',function(e){if(REC||e.button>0)return;e.preventDefault();sendB.setPointerCapture(e.pointerId);down()});
sendB.addEventListener('pointerup',up);
sendB.addEventListener('pointercancel',up);
sendB.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();down()}});
sendB.addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();up()}});

/* звуковые события живого режима: закалка, отказ, готовность */
var liveQ=null,liveReady=false,liveCrk=rng(3);
function liveSound(F,D){
  if(!liveQ)liveQ=HOT.map(function(){return null});
  HOT.forEach(function(it,i){
    if(F.qt[i]!=null&&liveQ[i]==null)Sound.play([0,'hiss',.55+.45*c01(it.wh/110),(M.bx+it.x+it.wh/2)/M.W*1.2-.6]);
    liveQ[i]=F.qt[i];
  });
  var rd=D<40&&F.cool>0;
  if(rd&&!liveReady)Sound.play([0,'ready']);
  liveReady=rd;
  var lv=c01((D-500)/950);
  if(liveCrk()<lv*lv*.22)Sound.play([0,'crk',(liveCrk()-.5)*.8,.4+.6*liveCrk()]);
  Sound.bed(Math.pow(c01((D-450)/1000),1.3));
}

/* ─────────── часы ─────────── */
var acc=0,prev=null,lastU=0,paused=false,lastTy=-1;
function uNow(){return((acc%CYCLE)+CYCLE)%CYCLE}
function tick(now){
  var dt=prev===null?0:Math.min(.1,(now-prev)/1000);prev=now;
  if(mode==='auto'){
    if(!paused)acc+=dt;
    var t=REC?now/1000+PH:acc,u=((t%CYCLE)+CYCLE)%CYCLE;
    var st=render(scene(u),u);
    if(!REC){fireBetween(lastU,u);Sound.bed(bedAt(u))}
    lastU=u;
    if(REC&&now/1000>=CYCLE-1e-6)window.__done=true;
  }else{
    var n=nowS(),F=liveF(n,dt),s2=render(F,n);
    // клавиши в живом режиме: тот же набор, что и в петле
    TOK.forEach(function(k){if(k.t>lastTy&&k.t<=F.ty){var heat=k.k==='g'?c01((k.it.T0-700)/750):0;Sound.play([0,'key',k.k==='nl'?2:k.k==='sp'?1:k.ch==='!'?3:0,heat])}});
    lastTy=F.ty;
    liveSound(F,s2.D);
  }
  requestAnimationFrame(tick);
}

var playBtn=document.getElementById('play');
playBtn.onclick=function(){Sound.start();paused=false;goAuto()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){
  var on=!Sound.on;Sound.setOn(on);
  sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on));
};
document.addEventListener('pointerdown',function(){Sound.start()},{once:true});

/* тема */
var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
  readTheme();
  ITEMS.forEach(function(it){it.hg.concat(it.cg).forEach(function(g){if(g.el.__s){delete g.el.__s.color;delete g.el.__s.textShadow}})});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

// для проверки кадров: __seek(секунды петли); для записи: __renderAudio
window.__seek=function(t){goAuto();paused=true;acc=t;render(scene(uNow()),uNow())};
window.__renderAudio=function(){return Sound.renderLoop(EVENTS,CYCLE,PH+1/60,bedAt)};
window.__TL=TL;

function init(){fit();measure();buildTL();buildEvents()}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  init();
  addEventListener('resize',function(){fit();measure();buildEvents()});
  requestAnimationFrame(tick);
});
