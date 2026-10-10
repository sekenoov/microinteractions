/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// темп как в compact: паузы короткие, движения быстрые
var SLOW=1,ANIM=.85;
function D(ms){return reduce?1:ms*ANIM}
function sleep(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms*SLOW)})}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}
function pulse(n,c){n.classList.remove(c);void n.offsetWidth;n.classList.add(c)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mix(a,b,t){return a+(b-a)*t}
function sm(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function eio(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){return 1-Math.pow(1-p,3)}
function until(fn,g,ctx){return new Promise(function(res){
  (function chk(){if(g!==ctx.id)return;if(fn())res();else setTimeout(chk,50)})();
})}
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
var world=document.getElementById('world'),deckEl=document.getElementById('deck');
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
/* кадрируем несколько элементов сразу: их общий прямоугольник переводим в координаты мира */
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

/* ═════════ текст ответа ═════════
   Каждый кусок живёт на уровнях от lo до hi: 3 полный ответ, 0 одна строка.
   Короткие версии получаются только вырезанием, ни одно слово не переписано. */
var SEG=[
  [0,3,'Your starter is'],[2,3,'probably'],[0,3,'too weak'],[2,3,'when you mix'],[1,3,','],[0,0,'.'],
  [1,3,'so the dough is underproofed'],[3,3,'by the time it goes in the oven'],[1,3,'.'],
  [2,3,'A healthy starter doubles within 4 to 6 hours'],[3,3,'of feeding and smells pleasantly sour'],[3,3,', not like nail polish'],[2,3,'.'],
  [1,3,'¶'],
  [0,3,'Let it rise longer'],[1,3,'during bulk fermentation'],[0,3,'.'],
  [2,3,'Wait until the dough has grown by about half'],[3,3,', feels airy, and jiggles when you shake the bowl'],[2,3,'.'],
  [2,3,'In a cool kitchen that can take 8 hours'],[3,3,', not 4'],[2,3,'.'],
  [1,3,'¶'],
  [1,3,'Then shape it tighter and bake it cold'],[2,3,', straight from the fridge'],[3,3,', at 250 °C in a preheated Dutch oven'],[1,3,'.'],
  [2,3,'¶'],
  [2,3,'If it still spreads, go back to 70% hydration'],[3,3,'until your shaping feels more confident'],[2,3,'.']
];
var HIST=[
  ['u','My starter has been in the fridge all week. Feeding it tonight.'],
  ['a','Two feedings before you bake will wake it up. Use it when it peaks, a few hours after the second one.'],
  ['u','Going to try 75% hydration this time.'],
  ['a','Good middle ground. Keep the dough around 24 °C and it will be much easier to shape.']
];
var ASK='Flat again. Why is my sourdough always so flat?';
var ICONS=[
  ['Copy','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="7" y="7" width="9.5" height="9.5" rx="2.2"/><path d="M13 7V5.2A1.7 1.7 0 0 0 11.3 3.5H5.2A1.7 1.7 0 0 0 3.5 5.2v6.1A1.7 1.7 0 0 0 5.2 13H7"/></svg>'],
  ['Good response','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9l3-5.5c1.2 0 2 .9 1.8 2.1L10.8 8h4.3c1 0 1.7.9 1.5 1.9l-1.1 5.3c-.2.8-.9 1.3-1.7 1.3H6.5zM6.5 9H4v7.5h2.5"/></svg>'],
  ['Retry','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.8h-3.8"/></svg>']
];
var WIN=.4,LH=13.5*1.46,GAP=6,TOP=3;

/* ─────────── ответ, который сжимается щипком ─────────── */
var chat={root:document.getElementById('chat')};
chat.thread=chat.root.querySelector('.thread');
chat.tin=chat.root.querySelector('.tin');
var hudEl=document.getElementById('hud'),hudOdo=new Odo(hudEl.querySelector('.hv')),hudL=hudEl.querySelector('.hl');
var ticks=[].slice.call(hudEl.querySelectorAll('.ticks i'));
var fingers=[document.getElementById('t1'),document.getElementById('t2')];

var A={t:TOP,toks:[],hs:0,hv:0,gen:0,stage:'idle',fingers:false,snapId:0,hudT:0};

/* лента прижата к низу, пока не влезает */
function pin(){
  var over=chat.tin.offsetHeight-chat.thread.clientHeight;
  chat.tin.style.transform=over>0?'translateY('+(-over)+'px)':'';
  chat.thread.classList.toggle('over',over>2);
}

function isWord(k){return !k.br&&/[A-Za-z0-9]/.test(k.text)}
/* насколько кусок присутствует при длине t: окна внутри уровня идут по порядку чтения,
   поэтому при сжатии слова уходят снизу вверх, а при разведении возвращаются сверху вниз */
function pres(k,t){
  var a=k.lo>0?sm((t-k.sa)/WIN):1,b=k.hi<TOP?1-sm((t-k.sb)/WIN):1;
  return a*b;
}
function rub(t){
  var R=.3;
  if(t<0)return -R*(1-Math.exp(t/R));
  if(t>TOP)return TOP+R*(1-Math.exp(-(t-TOP)/R));
  return t;
}
function countAt(L){return A.toks.filter(function(k){return isWord(k)&&pres(k,L)>.5}).length}

A.init=function(){
  this.gen++;this.stage='idle';this.t=TOP;this.snapId++;
  chat.tin.innerHTML='';
  HIST.forEach(function(m){
    var it=h('div','item old');
    if(m[0]==='u'){var b=h('div','bub');b.textContent=m[1];it.appendChild(b)}
    else{var p=h('div','txt');p.textContent=m[1];it.appendChild(p)}
    chat.tin.appendChild(it);
  });
  var q=h('div','item'),qb=h('div','bub');qb.textContent=ASK;q.appendChild(qb);chat.tin.appendChild(q);
  this.q=qb;

  var item=h('div','item ans txt'),wr=h('div','words'),acts=h('div','acts');
  ICONS.forEach(function(ic){var b=h('button','ab',ic[1]);b.setAttribute('aria-label',ic[0]);acts.appendChild(b)});
  var wc=h('span','wc','<span class="pv"></span><span class="wl">words</span>');acts.appendChild(wc);
  item.appendChild(wr);item.appendChild(acts);chat.tin.appendChild(item);
  this.item=item;this.wr=wr;this.acts=acts;this.wodo=new Odo(wc.querySelector('.pv'));this.wl=wc.querySelector('.wl');
  this.dot=h('span','sdot');

  // куски в слова; знак препинания в начале куска липнет к предыдущему слову
  var toks=[];
  SEG.forEach(function(s){
    if(s[2]==='¶'){toks.push({br:true,lo:s[0],hi:s[1],text:''});return}
    s[2].trim().split(/\s+/).forEach(function(w,i){
      toks.push({lo:s[0],hi:s[1],text:w,glue:/^[,.]/.test(w)});
    });
  });
  for(var L=1;L<=TOP;L++){
    var g=toks.filter(function(k){return k.lo===L||k.hi===L-1}),n=g.length;
    g.forEach(function(k,r){var s=(L-1)+(1-WIN)*(n>1?r/(n-1):0);if(k.lo===L)k.sa=s;if(k.hi===L-1)k.sb=s});
  }
  var sc=wr.getBoundingClientRect().width/wr.offsetWidth||1;
  var probe=h('span','wd');wr.appendChild(probe);
  probe.textContent='x x';var a=probe.getBoundingClientRect().width;
  probe.textContent='xx';this.spw=(a-probe.getBoundingClientRect().width)/sc;probe.remove();
  toks.forEach(function(k){
    if(k.br)return;
    k.el=h('span','wd');k.el.textContent=k.text;wr.appendChild(k.el);
    k.w=k.el.getBoundingClientRect().width/sc;
    k.x=k.y=k.vx=k.vy=0;k.p=0;k.rev=false;k.ps=0;k.st='';
  });
  this.toks=toks;this.hs=0;this.hv=0;
  this.full=countAt(TOP);this.one=countAt(0);
  wr.style.height='0px';
  this.wodo.set(String(this.full));
  hudEl.classList.remove('on');this.hudShow=false;
  this.setFingers(false);
  var hs=hudEl;hs.classList.add('snap');this.layout();this.paint(0,true);
  setTimeout(function(){hs.classList.remove('snap')},50);
  pin();
};

/* раскладка по строкам с дробными ширинами: уходящее слово сужается, соседи съезжают на его место */
A.layout=function(){
  var W=this.wr.clientWidth,t=clamp(rub(this.t),0,TOP),x=0,y=0,words=0,lines=0,ly=-1,any=false;
  for(var i=0;i<this.toks.length;i++){
    var k=this.toks[i],p=k.rev===false?0:pres(k,t);
    k.p=p;
    if(k.br){
      if(p>.5&&x>0){x=0;y+=LH+GAP*(p-.5)*2}
      continue;
    }
    var sp=(k.glue||x===0)?0:this.spw*p,w=k.w*p;
    if(!k.glue&&x>0&&p>0&&x+sp+w>W+.5){x=0;y+=LH;sp=0}
    k.tx=x+sp;k.ty=y;x+=sp+w;
    if(p>.5){any=true;if(isWord(k))words++;if(y!==ly){lines++;ly=y}}
  }
  this.th=any?y+LH:0;this.words=words;this.lines=lines;this.tt=t;
};

/* пружина по каждому слову: переезд на другую строку идёт дугой, а не скачком */
A.paint=function(dt,snap){
  var w=26,k=w*w,c=2*w,n=snap?0:Math.max(1,Math.ceil(dt/.006)),st=dt/(n||1),anchor=null;
  for(var i=0;i<this.toks.length;i++){
    var q=this.toks[i];if(q.br)continue;
    if(q.fade==null)q.fade=1;
    if(q.oy==null){q.oy=0;q.vy=0}
    var hop=q.pty!=null&&Math.abs(q.ty-q.pty)>LH*.5&&Math.abs(q.tx-q.ptx)>36;
    if(q.glue&&anchor){
      // знак препинания держится за своё слово и не отстаёт от него
      q.oy=anchor.oy;q.vy=0;q.fade=anchor.fade;
    }else if(snap||!q.rev||dt>.25||q.p<.01){q.oy=0;q.vy=0}
    else if(hop){
      // перенос на другую строку: не едем через текст, а проявляемся на новом месте
      q.oy=0;q.vy=0;q.fade=0;
    }else{
      // по горизонтали слово стоит ровно по раскладке, она и так непрерывная.
      // Скачки по вертикали (ушла строка выше) гасим пружиной, у всей строки она одна и та же
      if(q.pty!=null)q.oy-=q.ty-q.pty;
      for(var j=0;j<n;j++){q.vy+=(-q.oy*k-q.vy*c)*st;q.oy+=q.vy*st}
    }
    q.x=q.tx;q.y=q.ty+q.oy;
    q.ptx=q.tx;q.pty=q.ty;
    if(!q.glue&&q.fade<1)q.fade=Math.min(1,q.fade+dt/.26);
    if(!q.glue&&q.p>.01)anchor=q;
    // слово занимает ровно столько, сколько ему отдала раскладка: открывается и закрывается шторкой
    var f=sm(q.fade),o=q.ps*f*(.25+.75*q.p),cut=q.p<.995?(1-q.p)*100:0,bl=f<.98?(1-f)*1.6:0;
    if(q.p<.01)o=0;
    var s=q.x.toFixed(2)+','+q.y.toFixed(2)+'|'+cut.toFixed(1)+'|'+o.toFixed(3)+'|'+bl.toFixed(1);
    if(s!==q.st){
      q.st=s;var e=q.el.style;
      e.transform='translate('+q.x.toFixed(2)+'px,'+q.y.toFixed(2)+'px)';
      e.opacity=o>.999?'':o.toFixed(3);
      e.clipPath=cut?'inset(-4px '+cut.toFixed(1)+'% -4px -2px)':'';
      e.filter=bl?'blur('+bl.toFixed(1)+'px)':'';
    }
  }
  if(snap||dt>.25){this.hs=this.th;this.hv=0}
  else for(var j=0;j<n;j++){this.hv+=((this.th-this.hs)*k-this.hv*c)*st;this.hs+=this.hv*st}
  this.wr.style.height=Math.max(0,this.hs).toFixed(2)+'px';
  // выход за край: текст чуть поддаётся, как резинка
  var te=rub(this.t),over=te-clamp(te,0,TOP);
  this.wr.style.transform=over?'scale('+(1+over*.12).toFixed(4)+')':'';
};

A.frame=function(dt){
  if(!this.toks.length)return;
  var prev=this.tt;
  this.layout();this.paint(dt);
  if(this.stage!=='stream'){
    this.wodo.set(String(this.words));this.wl.textContent=this.words===1?'word':'words';
  }
  hudOdo.set(String(this.lines));hudL.textContent=this.lines===1?'line':'lines';
  var t=this.tt;
  ticks.forEach(function(el,i){el.style.opacity=(.3+.7*clamp(t-i+1,0,1)).toFixed(3)});
  // щелчок на каждом целом уровне, как тактильный отклик
  if(this.hudShow&&prev!=null&&prev!==t)for(var L=0;L<=TOP;L++){
    if((prev-L)*(t-L)<0||(t===L&&prev!==L)){pulse(hudEl,'tick');break}
  }
  // точка стрима стоит за последним показанным словом
  if(this.stage==='stream'&&this.last){
    var q=this.last;this.dot.style.transform='translate('+(q.tx+q.w+5).toFixed(1)+'px,'+(q.ty+6.5).toFixed(1)+'px)';
  }
  if(this.fingers)this.placeFingers();
  if(this.hudShow){
    var r=loc(this.wr.getBoundingClientRect(),chat.root);
    hudEl.style.setProperty('--hx',(r.x+r.w/2).toFixed(1)+'px');
    hudEl.style.setProperty('--hy',(r.y-16).toFixed(1)+'px');
  }
};

/* пальцы в сценарии стоят по диагонали вокруг центра ответа */
A.setFingers=function(on){
  this.fingers=on;
  if(on)this.placeFingers();
  fingers.forEach(function(f){f.classList.toggle('on',on)});
};
A.placeFingers=function(){
  var r=loc(this.wr.getBoundingClientRect(),chat.root);
  var cx=r.x+r.w/2,cy=r.y+r.h/2,d=(44+58*rub(this.t))/2,ux=.8,uy=-.6;
  fingers[0].style.translate=(cx+ux*d).toFixed(1)+'px '+(cy+uy*d).toFixed(1)+'px';
  fingers[1].style.translate=(cx-ux*d).toFixed(1)+'px '+(cy-uy*d).toFixed(1)+'px';
};

/* стрим полного ответа */
A.stream=async function(){
  if(this.stage!=='idle')return;
  var g=this.gen,self=this;this.stage='stream';
  this.wr.appendChild(this.dot);
  var toks=this.toks;
  for(var i=0;i<toks.length;i++){
    var k=toks[i];if(g!==this.gen||this.stage!=='stream')return;
    k.rev=true;
    if(k.br)continue;
    k.el.animate([{opacity:0,filter:'blur(2px)'},{opacity:1,filter:'none'}],{duration:D(300),easing:'ease-out'});
    k.ps=1;this.last=k;
    if(!(toks[i+1]&&toks[i+1].glue))await sleep(k.text.length>6?17:12);
  }
  this.done();
};
A.done=function(){
  this.toks.forEach(function(k){k.rev=true;if(!k.br)k.ps=1});
  if(this.dot.parentNode)this.dot.remove();
  this.stage='ready';this.acts.classList.add('on');
};

/* жест: начало, ведение, отпускание с доводкой до ближайшего уровня */
A.begin=function(){
  if(this.stage!=='ready')this.done();
  this.snapId++;this.gesture=true;
  clearTimeout(this.hudT);this.hudShow=true;hudEl.classList.add('on');
  return true;
};
A.end=function(){
  if(!this.gesture)return;this.gesture=false;
  this.t=rub(this.t);
  this.snapTo(Math.round(clamp(this.t,0,TOP)));
};
A.snapTo=function(L,keepHud){
  var id=++this.snapId,from=this.t,self=this;
  clearTimeout(this.hudT);this.hudShow=true;hudEl.classList.add('on');
  return tween(Math.max(240,Math.abs(L-from)*300),function(p){if(id===self.snapId)self.t=mix(from,L,eout(p))}).then(function(){
    if(id!==self.snapId||keepHud)return;
    self.hudT=setTimeout(function(){self.hudShow=false;hudEl.classList.remove('on')},D(900));
  });
};
/* сценарный щипок: плавно, с короткой задержкой на каждом уровне */
A.drive=async function(to,alive,step){
  // одно слитное движение на всю длину: на каждом уровне палец притормаживает, но не встаёт.
  // Длительность та же, что была у шагов с остановками
  var self=this,a=Math.round(this.t),n=Math.abs(to-a),dir=to>a?1:-1,S=.55;
  if(!n)return;
  await tween(n*((step||820)+235),function(p){
    if(!alive())return;
    var u=(1-Math.cos(Math.PI*p))/2,x=u*n-S*Math.sin(2*Math.PI*u*n)/(2*Math.PI);
    self.t=a+dir*x;
  });
  if(!alive())throw 0;
};

/* ─────────── ввод ─────────── */
var ansHit=function(e){return A.item&&A.item.contains(e.target)};
// тач: два пальца на ответе
var pts=new Map(),p0=null;
function pdist(){var v=[].slice.call(pts.values());return Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)}
chat.root.addEventListener('pointerdown',function(e){
  if(e.pointerType!=='touch'||!ansHit(e))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===2&&A.begin())p0={d:pdist(),t:A.t};
});
addEventListener('pointermove',function(e){
  if(!pts.has(e.pointerId))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(p0&&pts.size===2)A.t=clamp(p0.t+Math.log2(pdist()/p0.d)*2.4,-1.5,TOP+1.5);
});
function pend(e){if(!pts.delete(e.pointerId))return;if(p0&&pts.size<2){p0=null;A.end()}}
addEventListener('pointerup',pend);addEventListener('pointercancel',pend);
// трекпад: в Chrome и Firefox щипок приходит колесом с ctrlKey
var wheelT=0;
addEventListener('wheel',function(e){
  if(!e.ctrlKey)return;
  e.preventDefault();
  if(e.isTrusted&&auto.running)stopAuto();
  if(!A.gesture&&!A.begin())return;
  A.t=clamp(A.t-e.deltaY*.012,-1.5,TOP+1.5);
  clearTimeout(wheelT);wheelT=setTimeout(function(){A.end()},160);
},{passive:false});
// трекпад в Safari
var g0=0;
addEventListener('gesturestart',function(e){e.preventDefault();if(auto.running)stopAuto();if(A.begin())g0=A.t});
addEventListener('gesturechange',function(e){e.preventDefault();if(A.gesture)A.t=clamp(g0+Math.log2(e.scale)*2.4,-1.5,TOP+1.5)});
addEventListener('gestureend',function(e){e.preventDefault();A.end()});

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
var follow=false,fc=0;
(function loop(){
  var last=performance.now();
  function f(now){
    var el=Math.min(4,(now-last)/1000);last=now;
    A.frame(el);pin();
    if(follow&&(++fc%5===0))frame([A.item,hudEl],1.32,.74);
    camStep(el);
    requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
})();

/* ─────────── режиссёр ─────────── */
var auto={id:0,running:false};
var tools=document.getElementById('tools');
if(REC)tools.style.display='none';
function wide(){frame(chat.root,1.15,.88)}

async function play(){
  var g=++auto.id,alive=function(){return g===auto.id};
  var W=function(ms){return sleep(ms).then(function(){if(!alive())throw 0})};
  var U=function(fn){return until(fn,g,auto).then(function(){if(!alive())throw 0})};
  auto.running=true;tools.classList.add('hide');follow=false;
  try{
    if(REC){A.init();wide();camSnap();await W(300)}
    else{
      say('');deckEl.classList.add('fade');await W(380);
      A.init();wide();deckEl.classList.remove('fade');
      await W(450);
    }
    say('One simple question.');
    A.stream();
    await U(function(){return A.stage==='ready'});
    say(A.lines+' lines back.');
    await W(700);
    frame([A.item,hudEl],1.32,.74);follow=true;
    await W(650);
    A.setFingers(true);A.begin();
    await W(260);
    say('Pinch it.');
    await A.drive(2,alive);
    say('Detail leaves first, from the bottom up.');
    await A.drive(0,alive);
    A.end();
    await W(180);A.setFingers(false);
    say(A.words+' words. Still the right answer.');
    await W(1700);
    A.setFingers(true);A.begin();
    await W(300);
    say('Spread, and it comes back in reading order.');
    await A.drive(2,alive,760);
    A.end();
    await W(160);A.setFingers(false);
    await W(900);
    follow=false;wide();
    say(A.full+' words to '+A.one+' and back. Nothing rewritten, only cut.');
    await W(3000);
    if(REC){window.__done=true;return}
    if(!reduce)play();
  }catch(e){if(e!==0)throw e}
}
function stopAuto(){
  auto.id++;auto.running=false;follow=false;
  A.setFingers(false);
  if(A.stage!=='ready')A.done();
  deckEl.classList.remove('fade');
  if(A.gesture&&!pts.size){A.end()}
  wide();say('');tools.classList.remove('hide');
}

/* ─────────── запуск и низ ─────────── */
A.init();
document.addEventListener('pointerdown',function(e){
  if(e.isTrusted&&auto.running&&!e.target.closest('#tools'))stopAuto();
},true);
document.getElementById('play').addEventListener('click',function(){play()});
document.getElementById('reset').addEventListener('click',function(){stopAuto();A.init();A.done()});
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='r'||e.key==='R'){play();return}
  var d=e.key==='-'||e.key==='_'?-1:(e.key==='='||e.key==='+'?1:0);
  if(!d)return;
  if(auto.running)stopAuto();
  if(A.stage!=='ready')A.done();
  A.snapTo(clamp(Math.round(A.t)+d,0,TOP));
});
var themeBtns=document.querySelectorAll('#theme button');
function markTheme(t){themeBtns.forEach(function(x){x.classList.toggle('on',x.dataset.theme===t)})}
markTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
themeBtns.forEach(function(b){
  b.addEventListener('click',function(){markTheme(b.dataset.theme);document.documentElement.setAttribute('data-theme',b.dataset.theme)});
});
// при reduced motion сценарий не крутится сам, только по Replay
if(REC){wide();camSnap();setTimeout(play,60)}
else if(!reduce)setTimeout(play,500);
else A.done();
