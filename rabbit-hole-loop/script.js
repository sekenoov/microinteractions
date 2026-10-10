/* ─────────── Rabbit hole ───────────
   Слово из ответа выделяется, уходит в «Ask» и становится следующим вопросом.
   Три ответа замыкаются: coffee → adenosine → sleep → coffee.
   Каждый кадр считается из одного времени t, поэтому цикл закрывается без шва. */

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var REC=/\brec\b/.test(location.search);
if(REC)document.documentElement.classList.add('rec');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function c01(v){return clamp(v,0,1)}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=c01(x);return x*x*(3-2*x)}
function eio(p){p=c01(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=c01(p);return 1-Math.pow(1-p,3)}
function ein(p){p=c01(p);return p*p*p}
function seg(l,a,b){return c01((l-a)/(b-a))}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}

/* [вопрос, ответ, слово, которое станет следующим вопросом] */
var STEPS=[
  ['coffee','Caffeine blocks the receptors your brain uses to feel tired. It has almost the same shape as [adenosine], so it gets there first and the signal never lands.'],
  ['adenosine','Adenosine is what’s left when your cells burn energy. It builds up the whole time you’re awake, and that’s the heavy feeling by evening. A night of [sleep] clears it.'],
  ['sleep','Sleep is when the brain washes out the day’s waste. Cut it short and some of that pressure is still there when you wake up, so you reach for [coffee].']
];
var ICONS=[
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="7" y="7" width="9.5" height="9.5" rx="2.2"/><path d="M13 7V5.2A1.7 1.7 0 0 0 11.3 3.5H5.2A1.7 1.7 0 0 0 3.5 5.2v6.1A1.7 1.7 0 0 0 5.2 13H7"/></svg>',
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9l3-5.5c1.2 0 2 .9 1.8 2.1L10.8 8h4.3c1 0 1.7.9 1.5 1.9l-1.1 5.3c-.2.8-.9 1.3-1.7 1.3H6.5zM6.5 9H4v7.5h2.5"/></svg>',
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.8h-3.8"/></svg>'
];

/* ─────────── хронометраж одного шага, секунды ─────────── */
var STEP=3.6,N=STEPS.length,CYCLE=STEP*N;
var TS=.34,DW=.03,WF=.16;           // поток слов
var C_IN=1.42,C_AT=1.84;             // курсор подходит к слову
var DR0=1.88,DR1=2.18;               // протяжка выделения
var M0=2.22;                         // меню
var C_M0=2.3,C_M1=2.6,CLK=2.66;      // курсор к «Ask» и нажатие
var DIVE=2.76,DD=STEP-DIVE;          // провал в новое слово

var chat=document.getElementById('chat'),thread=document.getElementById('thread');
var fly=document.getElementById('fly'),flyTxt=fly.querySelector('span'),fSel=fly.querySelector('.fsel'),fBub=fly.querySelector('.fbub');
var menu=document.getElementById('menu'),askEl=menu.querySelector('.ask');
var cur=document.getElementById('cur');
var titles=[].slice.call(document.querySelectorAll('#title span'));

/* ─────────── страницы ─────────── */
var pages=STEPS.map(function(s,k){
  var el=h('div','page'),bub=h('div','bub'),ans=h('div','ans'),acts=h('div','acts');
  bub.textContent=s[0];
  var words=[],target=null;
  s[1].split(' ').forEach(function(tok,i){
    var w=h('span','w'),m=tok.match(/^([^\[]*)\[([^\]]+)\](.*)$/);
    if(m){
      w.appendChild(document.createTextNode(m[1]));
      target=h('span','tg');target.textContent=m[2];w.appendChild(target);
      w.appendChild(document.createTextNode(m[3]));
    }else w.textContent=tok;
    ans.appendChild(w);ans.appendChild(document.createTextNode(' '));words.push(w);
  });
  var dot=h('span','dot'),sel=h('span','sel');
  ans.insertBefore(sel,ans.firstChild);ans.appendChild(dot);
  ICONS.forEach(function(ic){acts.appendChild(h('span','ab',ic))});
  el.appendChild(bub);el.appendChild(ans);el.appendChild(acts);
  thread.insertBefore(el,fly);
  return {el:el,bub:bub,ans:ans,acts:acts,words:words,target:target,tw:target.parentNode,sel:sel,dot:dot,q:s[0],
    title:s[0][0].toUpperCase()+s[0].slice(1)};
});

/* ─────────── раскладка: всё в координатах страницы, без учёта масштаба записи ─────────── */
var L={};
function measure(){
  var sc=chat.getBoundingClientRect().width/chat.offsetWidth||1;
  L.tx=thread.offsetLeft;L.ty=thread.offsetTop;L.tw=thread.offsetWidth;
  pages.forEach(function(P){
    P.el.style.transform='';
    var ax=P.ans.offsetLeft,ay=P.ans.offsetTop,t=P.target;
    var line=Math.round((t.offsetTop-2)/22);
    P.wx=ax+t.offsetLeft;P.wy=ay+line*22;P.ww=t.offsetWidth;
    // границы букв: выделение прыгает по ним, как настоящее
    var r=document.createRange(),node=t.firstChild;P.cx=[0];
    for(var i=1;i<=node.length;i++){r.setStart(node,0);r.setEnd(node,i);P.cx.push(r.getBoundingClientRect().width/sc)}
    P.bx=P.bub.offsetLeft;P.by=P.bub.offsetTop;P.bw=P.bub.offsetWidth;P.bh=P.bub.offsetHeight;
    P.dx=ax;P.dy=ay;
  });
  // меню ставится над словом
  pages.forEach(function(P){
    var mw=menu.offsetWidth,mh=menu.offsetHeight;
    P.mx=clamp(P.wx+P.ww/2-mw/2,10,L.tw-10-mw);P.my=P.wy-mh-7;
    P.ax=P.mx+askEl.offsetLeft+askEl.offsetWidth/2;P.ay=P.my+askEl.offsetTop+askEl.offsetHeight/2;
  });
}

/* ─────────── кадр ─────────── */
var last={};
function set(el,k,v){if(!el.__s)el.__s={};if(el.__s[k]!==v){el.__s[k]=v;el.style[k]=v}}

function render(t){
  var u=((t%CYCLE)+CYCLE)%CYCLE,k=Math.floor(u/STEP)%N,l=u-k*STEP;
  var P=pages[k],Q=pages[(k+1)%N],p=seg(l,DIVE,STEP);
  var diving=l>=DIVE;

  pages.forEach(function(X){if(X!==P&&(X!==Q||!diving))set(X.el,'visibility','hidden')});

  /* текущая страница */
  set(P.el,'visibility','visible');
  set(P.bub,'opacity','1');
  P.words.forEach(function(w,i){set(w,'opacity',diving&&w===P.tw?'0':String(sm((l-TS-i*DW)/WF)))});
  var sEnd=TS+P.words.length*DW+WF;
  set(P.acts,'opacity',String(sm((l-sEnd-.02)/.25)));
  var dp=l-.06;
  set(P.dot,'opacity',String(sm(dp/.1)*(1-sm((l-TS)/.08))));
  set(P.dot,'transform','scale('+(.78+.22*(.5-.5*Math.cos(2*Math.PI*dp/.56))).toFixed(3)+')');

  /* выделение прыгает по границам букв за курсором */
  var dr=eio(seg(l,DR0,DR1)),cx=P.cx[P.cx.length-1]*dr,n=0;
  while(n<P.cx.length-1&&cx>(P.cx[n]+P.cx[n+1])/2)n++;
  var sw=l>=DR0&&!diving?P.cx[n]+(n?4:0):0;
  set(P.sel,'opacity',sw?'1':'0');
  set(P.sel,'transform','translate('+(P.wx-P.dx-2)+'px,'+(P.wy-P.dy)+'px)');
  set(P.sel,'width',sw+'px');

  /* меню правки */
  var mi=eout(seg(l,M0,M0+.16)),mo=sm(seg(l,DIVE,DIVE+.12));
  set(menu,'opacity',String(mi*(1-mo)));
  set(menu,'transform','translate('+P.mx+'px,'+(P.my+4*(1-mi))+'px) scale('+(.94+.06*mi-.03*mo).toFixed(3)+')');
  askEl.classList.toggle('hov',l>=2.5&&l<DIVE+.1);

  /* курсор */
  var x0=P.wx+64,y0=P.wy+66,xa=P.wx-1,ya=P.wy+11,xb=P.wx+P.ww+1,cx2,cy2;
  if(l<C_AT){var a=eout(seg(l,C_IN,C_AT));cx2=mix(x0,xa,a);cy2=mix(y0,ya,a)}
  else if(l<C_M0){var b=eio(seg(l,DR0,DR1));cx2=mix(xa,xb,b);cy2=ya}
  else{var c=eio(seg(l,C_M0,C_M1));cx2=mix(xb,P.ax,c);cy2=mix(ya,P.ay,c)+10*sm(seg(l,DIVE,DIVE+.25))}
  var ib=l>=1.62&&l<2.36;
  cur.classList.toggle('ib',ib);
  var press=l>=CLK&&l<CLK+.09?.86:(l>=DR0&&l<DR1?.94:1);
  var hx=ib?12:5,hy=ib?12:2.6;
  set(cur,'opacity',String(sm(seg(l,C_IN,C_IN+.14))*(1-sm(seg(l,DIVE+.02,DIVE+.2)))));
  set(cur,'transform','translate('+(L.tx+cx2-hx).toFixed(2)+'px,'+(L.ty+cy2-hy).toFixed(2)+'px) scale('+press+')');
  set(cur,'transformOrigin',hx+'px '+hy+'px');

  /* провал: старый тред пролетает мимо, слово едет на место вопроса */
  if(diving){
    var ox=P.wx+P.ww/2,oy=P.wy+11,s=reduce?1:1+.9*p*p;
    set(P.el,'transform','translate('+ox+'px,'+oy+'px) scale('+s.toFixed(4)+') translate('+(-ox)+'px,'+(-oy)+'px)');
    set(P.el,'opacity',String(1-sm(p/.7)));
    set(P.el,'filter',reduce?'none':'blur('+(6*p*p).toFixed(2)+'px)');
    set(Q.el,'visibility','visible');
    Q.words.forEach(function(w){set(w,'opacity','0')});
    set(Q.acts,'opacity','0');set(Q.dot,'opacity','0');set(Q.sel,'opacity','0');
    set(Q.bub,'opacity','0');
    set(Q.el,'transform','none');set(Q.el,'opacity','1');set(Q.el,'filter','none');

    var q=c01(p/.9),ex=eio(c01(q*1.12-.12)),ey=eio(c01(q*1.12)),m=sm((q-.08)/.6);
    var ax0=P.wx-2,ay0=P.wy,aw=P.ww+4,ah=22;
    var w=mix(aw,Q.bw,m),hh=mix(ah,Q.bh,m);
    var cxf=mix(ax0+aw/2,Q.bx+Q.bw/2,ex),cyf=mix(ay0+ah/2,Q.by+Q.bh/2,ey);
    var lift=Math.sin(Math.PI*q);
    flyTxt.textContent!==P.target.textContent&&(flyTxt.textContent=P.target.textContent);
    set(fly,'opacity','1');
    set(fly,'width',w.toFixed(2)+'px');set(fly,'height',hh.toFixed(2)+'px');
    set(fly,'borderRadius',mix(4,18,m).toFixed(2)+'px');
    set(fly,'transform','translate('+(cxf-w/2).toFixed(2)+'px,'+(cyf-hh/2).toFixed(2)+'px) scale('+(1+.05*lift).toFixed(4)+')');
    set(fly,'boxShadow','0 '+(6*lift).toFixed(1)+'px '+(18*lift).toFixed(1)+'px rgba(0,0,0,'+(.16*lift).toFixed(3)+')');
    set(fSel,'opacity',String(1-m));set(fBub,'opacity',String(m));
  }else{
    set(P.el,'transform','none');set(P.el,'opacity','1');set(P.el,'filter','none');
    set(fly,'opacity','0');
  }

  /* заголовок перекатывается на новое слово */
  var r=eio(seg(p,.18,.78));
  if(titles[0].textContent!==P.title)titles[0].textContent=P.title;
  if(titles[1].textContent!==Q.title)titles[1].textContent=Q.title;
  set(titles[0],'transform','translateY('+(-18*r).toFixed(2)+'px)');set(titles[0],'opacity',String(1-r));
  set(titles[1],'transform','translateY('+(18*(1-r)).toFixed(2)+'px)');set(titles[1],'opacity',String(r));
}

/* ─────────── часы ─────────── */
var playing=true,acc=0,prev=null;
function tick(now){
  if(prev===null)prev=now;
  if(playing)acc+=(now-prev)/1000;
  prev=now;
  var t=REC?now/1000:acc;
  render(t);
  if(REC&&t>=CYCLE-1e-6)window.__done=true;
  requestAnimationFrame(tick);
}

var playBtn=document.getElementById('play');
function toggle(){playing=!playing;playBtn.textContent=playing?'Pause':'Play'}
playBtn.onclick=toggle;
chat.addEventListener('click',toggle);
addEventListener('keydown',function(e){if(e.code==='Space'&&e.target===document.body){e.preventDefault();toggle()}});

/* тема */
var themeBtns=[].slice.call(document.querySelectorAll('#theme button'));
function applyTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  themeBtns.forEach(function(b){b.classList.toggle('on',b.dataset.theme===th)});
}
themeBtns.forEach(function(b){b.onclick=function(){applyTheme(b.dataset.theme)}});
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');

// для проверки кадров: __seek(секунды)
window.__seek=function(t){playing=false;playBtn.textContent='Play';acc=t;render(t)};

measure();
addEventListener('resize',measure);
requestAnimationFrame(tick);
