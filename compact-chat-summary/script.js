/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var EO='cubic-bezier(.16,1,.3,1)';
// темп разделён: SLOW растягивает паузы между действиями, ANIM задаёт скорость самих анимаций
var SLOW=1,ANIM=.85;
function D(ms){return reduce?1:ms*ANIM}
function sleep(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms*SLOW)})}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}
function pulse(n,c){n.classList.remove(c);void n.offsetWidth;n.classList.add(c)}
function until(fn,g,ctx){return new Promise(function(res){
  (function chk(){if(g!==ctx.id)return;if(fn())res();else setTimeout(chk,50)})();
})}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mix(a,b,t){return a+(b-a)*t}
function eio(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){return 1-Math.pow(1-p,3)}
/* слово проявляется снизу */
function popIn(el,delay,dur){
  el.animate([{opacity:0,transform:'translateY(3px)',filter:'blur(2px)'},{opacity:1,transform:'none',filter:'none'}],
    {duration:D(dur||340),delay:D(delay||0),easing:EO,fill:'backwards'});
}
/* элемент уже в DOM: раскрываем высоту от нуля, соседи едут плавно */
function enter(el,dur){
  var hh=el.offsetHeight;el.style.overflow='hidden';
  el.animate([{height:'0px'},{height:hh+'px'}],{duration:D(dur||380),easing:EO});
  setTimeout(function(){el.style.overflow=''},D(dur||380));
}
/* меняем содержимое; если блок вырос, доращиваем высоту плавно */
function grow(el,fn,dur){
  var a=el.offsetHeight;fn();var b=el.offsetHeight;
  if(a!==b&&!reduce)el.animate([{height:a+'px'},{height:b+'px'}],{duration:D(dur||300),easing:EO});
}
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
      // новый разряд въезжает снизу, остальные доезжают со своего старого значения
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
(function loop(){
  var last=performance.now();
  function f(now){
    // пропущенное время догоняется целиком: камера всегда там, где должна быть по часам
    var el=Math.min(4,(now-last)/1000);last=now;
    if(camOn()){
      var k=8,c=2*Math.sqrt(k);
      for(var n=Math.ceil(el/.008),dt=el/n,i=0;i<n;i++){
        cam.vx+=((cam.tx-cam.x)*k-cam.vx*c)*dt;cam.x+=cam.vx*dt;
        cam.vy+=((cam.ty-cam.y)*k-cam.vy*c)*dt;cam.y+=cam.vy*dt;
        cam.vs+=((cam.ts-cam.s)*k-cam.vs*c)*dt;cam.s+=cam.vs*dt;
      }
      world.style.transform='translate('+cam.x.toFixed(2)+'px,'+cam.y.toFixed(2)+'px) scale('+cam.s.toFixed(4)+')';
    }else{cam.x=cam.y=0;cam.s=1;world.style.transform=''}
    requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
})();
/* кадрируем несколько элементов сразу: их общий прямоугольник переводим в координаты мира */
/* камера сразу встаёт в цель, без пружины */
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

/* полёт сообщения из композера в пузырь */
function fly(src,target,host,dur){
  var a=loc(src,host),b=loc(target.getBoundingClientRect(),host);
  var cs=getComputedStyle(target),pl=parseFloat(cs.paddingLeft),pt=parseFloat(cs.paddingTop);
  var c=target.cloneNode(true);c.classList.add('flyer');
  c.style.left=b.x+'px';c.style.top=b.y+'px';c.style.width=b.w+'px';c.style.height=b.h+'px';
  host.appendChild(c);target.style.visibility='hidden';
  var dx=a.x-pl-b.x,dy=a.y-pt-b.y,bg=cs.backgroundColor;
  c.animate([
    {transform:'translate('+dx+'px,'+dy+'px)',backgroundColor:'rgba(0,0,0,0)'},
    {backgroundColor:bg,offset:.45},
    {transform:'none',backgroundColor:bg}
  ],{duration:D(dur||620),easing:'cubic-bezier(.3,.7,.1,1)'});
  setTimeout(function(){target.style.visibility='';c.remove()},D(dur||620));
}
/* ожидание, привязанное к длительности CSS, а не к темпу сценария */
function pause(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms)})}

/* ═════════ сцена ═════════ */
// [фраза|k] это факт, который переживёт сжатие
var HIST=[
  ['a','Here are the three areas most people pick for a first visit, and what each one is good for.'],
  ['u','Planning Kyoto for [the two of us|0], [March 14 to 21|1]. Budget is [around $3,200|2] without flights.'],
  ['a','Nice timing, the plum blossoms should be out. With that budget, two nights in a ryokan and the rest in a simple hotel near the station works well.'],
  ['u','My partner is [vegetarian|3] and we both [hate early mornings|4].'],
  ['a','Easy city for both. Shojin ryori started in Kyoto’s temples, and most sights are calmer after ten anyway.'],
  ['u','We booked a [ryokan in Gion|5]. Our flight lands at [KIX at 6:40 pm|6].'],
  ['a','Good pick. Take the [Haruka train|7] from the airport and plan to check in around 8:30.']
];
var TOTAL=42,START=91;
var ASK='Plan our first full day?';
// [слова]{k} ссылаются на факт k из сводки
var ANSWER=[
  '<b>Saturday, March 15.</b> [Sleep in]{4}, breakfast at the [ryokan in Gion]{5} runs until 9:30.',
  'Walk up to Yasaka Shrine and Ninenzaka before the crowds. Lunch at Shigetsu in Arashiyama, [all vegetarian]{3} temple food, about ¥4,000 each [for the two of you]{0}.',
  'Back in Gion for a slow dinner. Around $150 for the day, [well inside your budget]{2}.'
];
var ICON_SUM='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6.5 3.5L10 7l3.5-3.5M6.5 16.5L10 13l3.5 3.5M3.5 10h13" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* текст раскладывается на слова, факты остаются цельными */
function words(host,text){
  var re=/\[([^\]|]+)\|(\d)\]/g,last=0,m;
  function plain(s){
    s.split(/(\s+)/).forEach(function(t){
      if(!t)return;
      if(/^\s+$/.test(t)){host.appendChild(document.createTextNode(' '));return}
      var w=h('span','w');w.textContent=t;host.appendChild(w);
    });
  }
  while((m=re.exec(text))){
    plain(text.slice(last,m.index));
    var k=h('span','kp');k.textContent=m[1];k.dataset.k=m[2];host.appendChild(k);
    last=re.lastIndex;
  }
  plain(text.slice(last));
}

var chat={
  root:document.getElementById('chat'),
  gen:0,stage:'idle',pct:START
};
chat.thread=chat.root.querySelector('.thread');
chat.tin=chat.root.querySelector('.tin');
chat.ctx=document.getElementById('ctx');
chat.rf=chat.ctx.querySelector('.rf');
chat.odo=new Odo(chat.ctx.querySelector('.pv'));
chat.note=chat.root.querySelector('.note');
chat.cbtn=chat.root.querySelector('.cbtn');
chat.composer=chat.root.querySelector('.composer');
chat.field=chat.root.querySelector('.cfield');
chat.ctext=chat.root.querySelector('.ctext');
chat.send=chat.root.querySelector('.send');

/* лента прижата к низу, пока не влезает, и к верху, когда места хватает */
(function pin(){
  var over=chat.tin.offsetHeight-chat.thread.clientHeight;
  chat.tin.style.transform=over>0?'translateY('+(-over)+'px)':'';
  chat.thread.classList.toggle('over',over>2);
  requestAnimationFrame(pin);
})();

chat.setPct=function(v){
  v=Math.round(v);this.pct=v;
  this.odo.set(String(v));
  this.rf.style.strokeDashoffset=100-v;
  this.ctx.classList.toggle('full',v>=95);
};
chat.setComposer=function(text){
  this.ctext.innerHTML='';this.ctext.textContent=text||'';
  this.send.classList.toggle('dim',!text);
};
chat.init=function(){
  this.gen++;this.stage='idle';
  [].forEach.call(this.root.querySelectorAll('.flyw,.flyer'),function(n){n.remove()});
  this.tin.innerHTML='';this.tin.className='tin';
  var self=this;
  HIST.forEach(function(m){
    var item=h('div','item');
    if(m[0]==='u'){var b=h('div','bub');words(b,m[1]);item.appendChild(b)}
    else{item.classList.add('ans','txt');var p=h('p');words(p,m[1]);item.appendChild(p)}
    self.tin.appendChild(item);
  });
  this.note.classList.remove('on','busy');
  this.ctx.classList.remove('ok');
  this.setComposer('');
  // при сбросе барабан встаёт сразу, без прокрутки
  var ctx=this.ctx;ctx.classList.add('snap');this.setPct(START);
  void ctx.offsetWidth;setTimeout(function(){ctx.classList.remove('snap')},50);
};

/* человек печатает: каждые несколько букв кольцо прибавляет процент */
chat.type=async function(){
  if(this.stage!=='idle')return;
  var g=this.gen,self=this;this.stage='typing';
  this.setComposer('');
  var caret=h('span','caret'),node=document.createTextNode('');
  this.ctext.appendChild(node);this.ctext.appendChild(caret);
  for(var i=0;i<ASK.length;i++){
    node.data+=ASK[i];
    if(i%4===3&&this.pct<97)this.setPct(this.pct+1);
    await sleep(ASK[i]===' '?60:38);if(g!==this.gen)return;
  }
  caret.remove();this.send.classList.remove('dim');
  if(this.pct<97)this.setPct(97);
  pulse(this.ctx,'pop');
  await sleep(260);if(g!==this.gen)return;
  this.note.classList.add('on');
  this.stage='full';
};

/* ─── сжатие ─── */
chat.compact=async function(){
  if(this.stage!=='full')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  var root=this.root,tin=this.tin;
  this.stage='scan';
  this.note.classList.add('busy');

  // 1. проход чтения: слова по порядку вспыхивают синим и гаснут, факты остаются подсвечены
  var els=[].slice.call(tin.querySelectorAll('.w,.kp')),N=els.length;
  var step=Math.min(8,1100/N);
  els.forEach(function(e,i){e.style.setProperty('--d',(i*step).toFixed(1)+'ms')});
  tin.classList.add('scan');
  await pause(D(N*step+520));if(!alive())return;
  this.stage='kept';
  await sleep(800);if(!alive())return;

  // 2. факты отрываются от строк и повисают над лентой
  var kps=[].slice.call(tin.querySelectorAll('.kp')).sort(function(a,b){return a.dataset.k-b.dataset.k});
  var fl=kps.map(function(kp){
    var r=loc(kp.getBoundingClientRect(),root);
    var wrap=h('div','flyw'),f=h('span','fact fly raw','<span></span>');
    f.firstChild.textContent=kp.textContent;f.style.height=r.h+'px';
    wrap.appendChild(f);root.appendChild(wrap);
    var o={wrap:wrap,f:f,x:r.x+r.w/2,y:r.y+r.h/2,k:+kp.dataset.k};
    wrap.style.transform='translate('+o.x+'px,'+o.y+'px)';
    return o;
  });
  this.stage='crush';
  var items=[].slice.call(tin.children);
  // слова распадаются снизу вверх
  els.forEach(function(e,i){e.style.setProperty('--c',((N-1-i)*(420/N)).toFixed(1)+'ms')});
  [].forEach.call(tin.querySelectorAll('.bub'),function(b){
    var w=b.querySelector('.w,.kp');b.style.setProperty('--c',w.style.getPropertyValue('--c'))});
  tin.classList.add('crush');
  fl.forEach(function(o,i){
    setTimeout(function(){o.f.classList.remove('raw');o.f.classList.add('up');o.f.style.height=''},D(60+i*40));
  });
  await pause(D(760));if(!alive())return;

  // 3. лента схлопывается, наверху вырастает сводка, кольцо откатывается
  var sum=h('div','item sum'),box=h('div','sbox');
  box.innerHTML='<div class="shd">'+ICON_SUM+'<span class="sl">Summary</span><span class="sn">'+TOTAL+' messages</span></div>';
  var facts=h('div','facts');
  fl.forEach(function(o){var f=h('span','fact');f.textContent=o.f.textContent;facts.appendChild(f);o.target=f});
  box.appendChild(facts);sum.appendChild(box);
  tin.insertBefore(sum,tin.firstChild);enter(sum,700);
  this.sum=sum;this.facts=facts;
  items.forEach(function(it){
    var hh=it.offsetHeight;it.style.overflow='hidden';
    it.animate([{height:hh+'px',paddingTop:'16px'},{height:'0px',paddingTop:'0px'}],{duration:D(720),easing:EO,fill:'forwards'});
  });
  var from=this.pct,to=18;this.freed=from-to;
  this.ctx.classList.add('fast');
  tween(1300,function(p){self.setPct(mix(from,to,eio(p)))}).then(function(){
    self.ctx.classList.remove('fast');if(alive()){self.ctx.classList.add('ok');pulse(self.ctx,'pop')}
  });
  await pause(D(740));if(!alive())return;
  items.forEach(function(it){it.remove()});
  tin.classList.remove('scan','crush');
  this.stage='dock';
  await sleep(250);if(!alive())return;

  // 4. факты садятся в сводку по одному
  await Promise.all(fl.map(function(o,i){
    return pause(D(i*95)).then(function(){return self.dock(o,alive)});
  }));
  if(!alive())return;
  this.stage='docked';
  this.note.classList.remove('on');
  setTimeout(function(){self.note.classList.remove('busy')},D(500));
};
chat.dock=function(o,alive){
  var root=this.root,t=o.target;
  var ax=o.x,ay=o.y;
  return tween(860,function(p){
    if(!alive())return;
    var r=loc(t.getBoundingClientRect(),root),bx=r.x+r.w/2,by=r.y+r.h/2,e=eio(p);
    var x=mix(ax,bx,e)+Math.sin(Math.PI*e)*(ax<bx?-14:14),y=mix(ay,by,e);
    var s=1+Math.sin(Math.PI*e)*.07;
    o.wrap.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+s.toFixed(3)+')';
    if(p>.75)o.f.classList.remove('up');
  }).then(function(){
    if(!alive())return;
    o.wrap.remove();t.classList.add('in');pulse(t,'pop');
  });
};

/* ─── вопрос и ответ ─── */
chat.post=function(text){
  var item=h('div','item'),b=h('div','bub');b.textContent=text;item.appendChild(b);
  var src=this.ctext.getBoundingClientRect(),self=this;
  this.tin.appendChild(item);
  fly(src,b,this.root,640);enter(item,440);
  this.ctext.style.opacity='0';
  setTimeout(function(){self.setComposer('');self.ctext.style.opacity=''},D(460));
  this.send.classList.add('dim');
};
chat.ask=async function(){
  if(this.stage==='full'){await this.compact();}
  if(this.stage!=='docked')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send';
  this.post(ASK);this.setPct(this.pct+1);
  await sleep(650);if(!alive())return;
  this.stage='answer';
  await this.stream(alive);if(!alive())return;
  this.stage='done';
};
chat.stream=async function(alive){
  var tin=this.tin,self=this,count=0;
  var a=h('div','item ans txt'),dot=h('span','sdot');
  function put(host,w){grow(a,function(){if(host.contains(dot))host.insertBefore(w,dot);else host.appendChild(w)})}
  for(var i=0;i<ANSWER.length;i++){
    var p=h('p');
    if(i===0){a.appendChild(p);p.appendChild(dot);tin.appendChild(a);enter(a,360);await sleep(300);if(!alive())return}
    else grow(a,function(){a.appendChild(p);p.appendChild(dot)});
    var m=ANSWER[i].match(/^<b>(.*?)<\/b>\s*(.*)$/),rest=ANSWER[i];
    if(m){
      var b=h('b');p.insertBefore(b,dot);rest=m[2];
      var bw=m[1].split(' ');
      for(var j=0;j<bw.length;j++){
        var w=h('span','tw');w.textContent=bw[j]+(j<bw.length-1?' ':'');put(b,w);popIn(w);
        await sleep(34);if(!alive())return;
      }
      p.insertBefore(document.createTextNode(' '),dot);
    }
    var toks=rest.split(' '),grp=null;
    for(var j=0;j<toks.length;j++){
      var t=toks[j],sp=j<toks.length-1?' ':'';
      if(t[0]==='['){grp=h('span','ref');p.insertBefore(grp,dot);t=t.slice(1)}
      var em=t.match(/^(.*)\]\{(\d)\}(.*)$/);
      var w=h('span','tw');w.textContent=em?em[1]:t+sp;
      put(grp||p,w);popIn(w);
      if(em){
        if(em[3]+sp){var tl=h('span','tw');tl.textContent=em[3]+sp;put(p,tl);popIn(tl)}
        this.cite(grp,+em[2]);grp=null;
      }
      if(++count%9===0)this.setPct(this.pct+1);
      await sleep(em?90:28);if(!alive())return;
    }
  }
  dot.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}],{duration:D(220),fill:'forwards'});
  setTimeout(function(){dot.remove()},D(230));
};
/* слово в ответе и факт в сводке вспыхивают вместе */
chat.cite=function(ref,k){
  var f=this.facts.children[k];
  ref.classList.add('lit');f.classList.add('hit');pulse(f,'pop');
  this.hits=(this.hits||0)+1;
  setTimeout(function(){f.classList.remove('hit')},D(900));
};

chat.field.addEventListener('click',function(){if(chat.stage==='idle')chat.type()});
chat.cbtn.addEventListener('click',function(){chat.compact()});
chat.send.addEventListener('click',function(){if(chat.stage==='full'||chat.stage==='docked')chat.ask()});

/* ─────────── субтитры ─────────── */
var sayEl=document.getElementById('say'),sayI=0,sayLast='';
function say(text){
  if(text===sayLast)return;sayLast=text;
  var sp=sayEl.children,out=sp[sayI],inn=sp[1-sayI];sayI=1-sayI;
  out.classList.remove('on');out.classList.add('off');
  inn.classList.remove('off');void inn.offsetWidth;
  inn.textContent=text;if(text)inn.classList.add('on');
}

/* ─────────── режиссёр: камера и курсор ─────────── */
var cur={el:document.getElementById('cursor'),x:innerWidth*.62,y:innerHeight*.9};
function cursorTo(el,dur){
  var sx=cur.x,sy=cur.y,t0=performance.now();dur=D(dur||700);
  cur.el.classList.add('on');
  return new Promise(function(res){
    var done=false;
    setTimeout(function(){if(done)return;done=true;
      var r=el.getBoundingClientRect();cur.x=r.left+r.width*.55;cur.y=r.top+r.height*.6;
      cur.el.style.transform='translate('+cur.x+'px,'+cur.y+'px)';res()},dur+120);
    function f(now){
      if(done)return;
      var r=el.getBoundingClientRect(),tx=r.left+r.width*.55,ty=r.top+r.height*.6;
      var p=Math.min(1,(now-t0)/dur),e=eio(p);
      cur.x=sx+(tx-sx)*e;cur.y=sy+(ty-sy)*e;
      cur.el.style.transform='translate('+cur.x+'px,'+cur.y+'px)';
      if(p<1)requestAnimationFrame(f);else{done=true;res()}
    }
    requestAnimationFrame(f);
  });
}
async function tap(el){
  cur.el.animate([{scale:1},{scale:.82},{scale:1}],{duration:D(240),easing:'ease-out'});
  el.classList.add('pressed');
  await sleep(110);el.click();
  await sleep(120);el.classList.remove('pressed');
}
function cursorOff(){cur.el.classList.remove('on')}

var auto={id:0,running:false};
var tools=document.getElementById('tools');
if(REC)tools.style.display='none';
function wide(){frame(chat.root,1.15,.88)}

async function play(){
  var g=++auto.id,alive=function(){return g===auto.id};
  var W=function(ms){return sleep(ms).then(function(){if(!alive())throw 0})};
  var U=function(fn){return until(fn,g,auto).then(function(){if(!alive())throw 0})};
  auto.running=true;tools.classList.add('hide');
  try{
    if(REC){chat.init();wide();camSnap();await W(300)}
    else{
      say('');deckEl.classList.add('fade');await W(380);
      chat.init();wide();deckEl.classList.remove('fade');
      await W(500);
    }
    say('A long chat about one trip.');
    await W(1300);
    frame([chat.root.querySelector('.chead'),chat.composer],1.15,.88);
    await cursorTo(chat.field,760);await W(120);
    await tap(chat.field);
    await W(200);cursorOff();
    say('Every word you type takes a little more room.');
    await U(function(){return chat.stage==='full'});
    say('Almost full.');
    await W(600);
    await cursorTo(chat.cbtn,680);await W(140);
    await tap(chat.cbtn);
    await W(160);cursorOff();
    frame(chat.thread,1.15,.82);
    say('It rereads the whole chat once.');
    await U(function(){return chat.stage==='kept'});
    say('Only what still matters stays lit.');
    await U(function(){return chat.stage==='crush'});
    say('Everything else lets go.');
    await U(function(){return chat.stage==='dock'});
    frame(chat.thread,1.15,.82);
    say('The facts move up. The space comes back.');
    await U(function(){return chat.stage==='docked'});
    frame(chat.sum,1.45,.62);
    await W(1100);
    wide();
    say('Now the question.');
    await W(250);
    await cursorTo(chat.send,700);await W(140);
    await tap(chat.send);
    await W(200);cursorOff();
    await U(function(){return chat.stage==='answer'});
    frame([chat.sum,chat.composer],1.2,.9);
    say('Nothing it needed was lost.');
    await U(function(){return chat.stage==='done'});
    await W(900);
    wide();
    say(TOTAL+' messages in, '+chat.facts.children.length+' facts kept, '+chat.freed+'% of the space back.');
    await W(3000);
    if(REC){window.__done=true;return}
    if(!reduce)play();
  }catch(e){if(e!==0)throw e}
}
function stopAuto(){auto.id++;auto.running=false;cursorOff();wide();say('');tools.classList.remove('hide')}

/* ─────────── запуск и низ ─────────── */
chat.init();
document.addEventListener('pointerdown',function(e){
  if(e.isTrusted&&auto.running&&!e.target.closest('#tools'))stopAuto();
},true);
document.getElementById('play').addEventListener('click',function(){play()});
document.getElementById('reset').addEventListener('click',function(){stopAuto();chat.init()});
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='r'||e.key==='R')play();
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
