/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var EO='cubic-bezier(.16,1,.3,1)';
// общий темп: все паузы и длительности скрипта растягиваются на этот множитель
var SLOW=1.4;
function D(ms){return reduce?1:ms*SLOW}
function sleep(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms*SLOW)})}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}
function pulse(n,c){n.classList.remove(c);void n.offsetWidth;n.classList.add(c)}
function until(fn,g,ctx){return new Promise(function(res){
  (function chk(){if(g!==ctx.id)return;if(fn())res();else setTimeout(chk,60)})();
})}
/* слово проявляется снизу */
function popIn(el,delay,dur){
  el.animate([{opacity:0,transform:'translateY(3px)',filter:'blur(2px)'},{opacity:1,transform:'none',filter:'none'}],
    {duration:D(dur||340),delay:D(delay||0),easing:EO,fill:'backwards'});
}
/* элемент уже в DOM: раскрываем высоту от нуля, соседи едут плавно */
function enter(el,dur){
  var hh=el.offsetHeight;el.style.overflow='hidden';
  el.animate([{height:'0px'},{height:hh+'px'}],{duration:D(dur||380),easing:EO})
    .finished.then(function(){el.style.overflow=''});
}
/* меняем содержимое; если блок вырос на строку, доращиваем высоту плавно */
function grow(el,fn){
  var a=el.offsetHeight;fn();var b=el.offsetHeight;
  if(a!==b&&!reduce)el.animate([{height:a+'px'},{height:b+'px'}],{duration:D(300),easing:EO});
}
/* текст раскладывается на слова-спаны, чтобы проявлять их по одному */
function wordSpans(text){
  return text.split(' ').map(function(w,i,arr){
    var s=h('span','tw');s.textContent=w+(i<arr.length-1?' ':'');return s;
  });
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

var SAFE=130;
/* ─────────── камера ─────────── */
var world=document.getElementById('world');
var cam={x:0,y:0,s:1,vx:0,vy:0,vs:0,tx:0,ty:0,ts:1};
function camOn(){return !reduce&&innerWidth>780}
(function loop(){
  var last=performance.now();
  function f(now){
    var el=Math.min(.5,(now-last)/1000);last=now;
    if(camOn()){
      // пружина с критическим затуханием: мягкий старт и мягкая остановка.
      // шаг мелкий и по реальному времени, чтобы редкие кадры не тормозили камеру
      var k=7,c=2*Math.sqrt(k);
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
/* кадрируем элемент: переводим его экранный прямоугольник в координаты мира */
function focus(el,maxS,fill){
  if(!camOn())return;
  var r=el.getBoundingClientRect();
  var lx=(r.left-cam.x)/cam.s,ly=(r.top-cam.y)/cam.s,w=r.width/cam.s,hh=r.height/cam.s;
  // снизу место под субтитры и панель
  fill=fill||.8;var H=innerHeight-SAFE;
  var s=Math.min(maxS||1.7,innerWidth*fill/w,H*fill/hh);
  cam.ts=s;cam.tx=innerWidth/2-(lx+w/2)*s;cam.ty=H/2+8-(ly+hh/2)*s;
}
function overview(){cam.ts=1;cam.tx=0;cam.ty=-SAFE/2+20}

/* полёт: клон цели стартует с прямоугольника источника и садится на место */
function fly(src,target,host,dur){
  var s=cam.s,hr=host.getBoundingClientRect(),tr=target.getBoundingClientRect();
  var c=target.cloneNode(true);c.classList.add('flyer');
  c.style.left=(tr.left-hr.left)/s+'px';c.style.top=(tr.top-hr.top)/s+'px';
  c.style.width=tr.width/s+'px';c.style.height=tr.height/s+'px';
  host.appendChild(c);target.style.visibility='hidden';
  var dx=(src.left-tr.left)/s,dy=(src.top-tr.top)/s,sx=src.width/tr.width,sy=src.height/tr.height;
  c.animate([
    {transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')',opacity:.35},
    {opacity:1,offset:.35},
    {transform:'none',opacity:1}
  ],{duration:D(dur||620),easing:'cubic-bezier(.3,.7,.1,1)'});
  setTimeout(function(){target.style.visibility='';c.remove()},D(dur||620));
}

/* ─────────── тексты ─────────── */
var TRIP={
  hist:['Can you help me plan a trip to Japan?',
        'Of course. How many days do you have, and what time of year?'],
  prompt:'10 days in April. I love food and quiet places, not big crowds.',
  thoughts:[
    'April means cherry blossoms, so Kyoto will be packed.',
    'They want quiet. Skip famous spots at midday.',
    'Food matters most. Osaka for street food.',
    'Kanazawa: calmer than Kyoto, great fish market.',
    'Tokyo has quiet corners too. Yanaka, Kiyosumi.',
    'Split it: Tokyo 3, Kanazawa 3, Kyoto 2, Osaka 2.',
    'Kanazawa to Kyoto is about two hours by train.',
    'Temples at 7 am, before the tour buses.',
    'A rail pass won’t pay off for this route.',
    'Keep it short. One line per city.'
  ],
  answer:[
    'Here’s a calm, food-first route for 10 days:',
    '<b>Tokyo, 3 days.</b> Quiet streets in Yanaka, breakfast at the Tsukiji outer market.',
    '<b>Kanazawa, 3 days.</b> Omicho market, the old samurai district, an onsen nearby.',
    '<b>Kyoto, 2 days.</b> Temples at 7 am, before the crowds.',
    '<b>Osaka, 2 days.</b> End with street food in Kuromon.'
  ]
};
var TOAST={
  hist:['Help me write a toast for my sister’s wedding.',
        'Happy to. Tell me one story about her and I’ll build the toast around it.'],
  prompt:'She once drove six hours to bring me soup when I was sick.',
  follow:['Make it a little funnier.','Keep it under a minute.','End with a line everyone can raise a glass to.'],
  answers:[
    ['Here’s a start:','“Anna once drove six hours with a pot of soup on the passenger seat, because I had a cold. Not the flu. A cold. That’s who she is. She shows up. Sam, you’re marrying someone who shows up, every single time.”'],
    ['Funnier:','“Six hours, one pot of soup, zero speeding tickets. Allegedly.”'],
    ['Trimmed. It now reads in about 40 seconds.'],
    ['Closing line:','“To Anna and Sam. May you always show up for each other.”']
  ]
};

/* ─────────── общие куски чата ─────────── */
function bubble(text){
  var item=h('div','item'),b=h('div','bub');b.textContent=text;
  item.appendChild(b);return {item:item,bub:b};
}
function answerStatic(paras){
  var a=h('div','item ans txt');
  paras.forEach(function(t){a.appendChild(h('p','',t))});return a;
}
function history(tin,pair){
  tin.appendChild(bubble(pair[0]).item);
  tin.appendChild(answerStatic([pair[1]]));
}
function Chat(id){
  this.root=document.getElementById(id);
  this.tin=this.root.querySelector('.tin');
  this.cbars=this.root.querySelector('.cbars');
  this.send=this.root.querySelector('.send');
  this.gen=0;
}
Chat.prototype.setComposer=function(text){
  this.cbars.innerHTML='';this.ctext=h('div','ctext');this.ctext.textContent=text||'';
  this.cbars.appendChild(this.ctext);
};
/* ответ печатается словами, в хвосте пульсирует точка. <b> в начале абзаца сохраняется */
async function streamAnswer(tin,paras,per,alive){
  var a=h('div','item ans txt'),dot=h('span','sdot');
  for(var i=0;i<paras.length;i++){
    var p=h('p'),m=paras[i].match(/^<b>(.*?)<\/b>\s*(.*)$/),host=p,rest=paras[i];
    if(i===0){a.appendChild(p);p.appendChild(dot);tin.appendChild(a);enter(a,360)}
    else grow(a,function(){a.appendChild(p);p.appendChild(dot)});
    var chunks=m?[[h('b'),m[1]],[p,m[2]]]:[[p,rest]];
    for(var c=0;c<chunks.length;c++){
      host=chunks[c][0];
      if(host!==p){p.insertBefore(host,dot);p.insertBefore(document.createTextNode(' '),dot)}
      var ws=wordSpans(chunks[c][1]);
      for(var j=0;j<ws.length;j++){
        (function(w,host){grow(a,function(){
          if(host===p)p.insertBefore(w,dot);else host.appendChild(w);
        })})(ws[j],host);
        popIn(ws[j]);
        await sleep(per);if(!alive())return false;
      }
    }
  }
  dot.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}],{duration:D(220),fill:'forwards'});
  setTimeout(function(){dot.remove()},D(230));
  return true;
}

/* ═════════ 01 · размышление складывается ═════════ */
var think=new Chat('think');
think.init=function(){
  this.gen++;this.stage='idle';this.open=false;this.thk=null;this.secs=0;
  this.tin.innerHTML='';history(this.tin,TRIP.hist);
  this.setComposer(TRIP.prompt);this.cbars.style.opacity='';
  this.send.className='send';this.send.disabled=false;
};
think.send.addEventListener('click',function(){if(think.stage==='idle')think.run()});
think.run=async function(){
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send';this.send.classList.add('stop');

  // запрос перелетает из композера в ленту
  var src=this.ctext.getBoundingClientRect();
  var u=bubble(TRIP.prompt);this.tin.appendChild(u.item);
  fly(src,u.bub,this.root,640);enter(u.item,440);
  this.cbars.animate([{opacity:1},{opacity:0}],{duration:D(120),fill:'forwards'});
  await sleep(460);if(!alive())return;
  this.setComposer('');this.cbars.getAnimations().forEach(function(a){a.cancel()});

  // блок размышления: окно на три строки, старые уходят вверх
  var t=h('div','item thk',
    '<button class="thead" disabled><span class="tlabel"><span class="t1">Thinking</span><span class="t2">Thought for</span></span>'+
    '<span class="tsec"><span class="sec"></span>s</span>'+
    '<svg class="chev" viewBox="0 0 10 16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 2l5.5 6-5.5 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<div class="tbox"><div class="tlines"></div></div>');
  var head=t.querySelector('.thead'),lbl=t.querySelector('.tlabel'),
      box=t.querySelector('.tbox'),lines=t.querySelector('.tlines'),
      sec=t.querySelector('.tsec'),odo=new Odo(t.querySelector('.sec'));
  odo.set('0');
  this.tin.appendChild(t);
  var w1=t.querySelector('.t1').offsetWidth,w2=t.querySelector('.t2').offsetWidth;
  lbl.style.width=w1+'px';lbl.style.transition='width '+D(.42)+'s '+EO;
  box.style.height='54px';
  box.style.transition='height '+D(.5)+'s '+EO+',margin-top '+D(.5)+'s '+EO+',opacity '+D(.35)+'s';
  enter(t,380);
  this.thk={el:t,box:box,lines:lines,head:head};
  this.stage='thinking';

  var tick=setInterval(function(){if(!alive()){clearInterval(tick);return}self.secs++;odo.set(String(self.secs))},D(230));
  for(var i=0;i<TRIP.thoughts.length;i++){
    var tl=h('div','tl'),ws=wordSpans(TRIP.thoughts[i]);
    ws.forEach(function(w,k){tl.appendChild(w);popIn(w,k*30,220)});
    lines.appendChild(tl);
    if(i>=3)lines.style.transform='translateY('+(-(i-2)*18)+'px)';
    await sleep(ws.length*30+170);if(!alive()){clearInterval(tick);return}
  }
  clearInterval(tick);
  await sleep(200);if(!alive())return;

  // складывание: видимые строки сжимаются вверх, в заголовок
  this.stage='fold';
  var vis=[].slice.call(lines.children,-3);
  vis.forEach(function(l,k){
    l.animate([{transform:'none',opacity:1},{transform:'translateY('+(-(k+1)*14)+'px) scaleY(.2)',opacity:0}],
      {duration:D(380),delay:D((2-k)*50),easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
  });
  box.style.height='0px';box.style.marginTop='0px';
  t.classList.add('done');lbl.style.width=w2+'px';
  setTimeout(function(){if(alive())pulse(sec,'bump')},D(160));
  head.disabled=false;
  await sleep(420);if(!alive())return;
  box.style.opacity='0';
  vis.forEach(function(l){l.getAnimations().forEach(function(a){a.cancel()})});

  // ответ печатается под свёрнутой строкой
  this.stage='answer';
  var ok=await streamAnswer(this.tin,TRIP.answer,30,alive);if(!ok)return;
  await sleep(240);if(!alive())return;
  this.send.classList.remove('stop');this.send.classList.add('locked');this.send.disabled=true;
  this.stage='done';
};
think.tin.addEventListener('click',function(e){
  var hd=e.target.closest('.thead');
  if(!hd||hd.disabled||!think.thk)return;
  var k=think.thk;think.open=!think.open;
  k.el.classList.toggle('open',think.open);
  var n=k.lines.children.length;
  k.lines.style.transform='none';
  k.box.style.height=think.open?n*18+'px':'0px';
  k.box.style.marginTop=think.open?'10px':'0px';
  k.box.style.opacity=think.open?'1':'0';
  if(think.open)[].forEach.call(k.lines.children,function(l,i){
    l.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],
      {duration:D(300),delay:D(i*26),easing:EO,fill:'backwards'});
  });
});

/* ═════════ 02 · очередь во время ответа ═════════ */
var queue=new Chat('queue');
var CLOCK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var MAXQ=3;
queue.stack=queue.root.querySelector('.qstack');
queue.init=function(){
  this.gen++;
  this.stage='idle';this.streaming=false;this.typing=false;this.filled=true;this.q=[];this.refills=0;this.answered=0;this.sent=0;this.dequeued=0;
  this.tin.innerHTML='';history(this.tin,TOAST.hist);
  this.setComposer(TOAST.prompt);
  this.stack.innerHTML='<span class="qcount"><span class="qn"></span><span>queued</span></span>';
  this.qlbl=this.stack.querySelector('.qcount');
  this.qodo=new Odo(this.stack.querySelector('.qn'));this.qodo.set('0');
  this.layout();this.sync();
};
queue.sync=function(){
  var locked=!this.streaming&&!this.filled&&!this.typing;
  this.send.classList.toggle('stop',this.streaming&&!this.filled&&!this.typing);
  this.send.classList.toggle('locked',locked);
};
queue.pills=function(){return [].slice.call(this.stack.querySelectorAll('.qpill'))};
queue.slot=function(i){
  var k=Math.min(i,2);return 'translateY('+(-k*7)+'px) scale('+(1-k*.045)+')';
};
queue.layout=function(){
  var ps=this.pills(),n=ps.length,self=this;
  this.stack.style.height=n?(38+(Math.min(n,3)-1)*7)+'px':'0px';
  this.stack.classList.toggle('on',n>0);
  ps.forEach(function(p,i){p.style.transform=self.slot(i);p.style.opacity=i>2?'0':'1';p.style.zIndex=10-i});
  this.qlbl.style.opacity=n?'1':'0';
  if(n)this.qodo.set(String(n));
};
queue.takeComposer=function(){
  var t=this.ctext.textContent;this.setComposer('');this.filled=false;return t;
};
/* человек дописывает следующий вопрос, пока модель отвечает */
queue.refill=async function(g){
  if(this.refills>=MAXQ)return;
  var text=TOAST.follow[this.refills++];
  await sleep(200);if(g!==this.gen||!this.streaming)return;
  this.typing=true;this.sync();
  var c=this.ctext,caret=h('span','caret'),node=document.createTextNode('');
  c.appendChild(node);c.appendChild(caret);
  for(var i=0;i<text.length;i++){
    node.data+=text[i];
    await sleep(text[i]===' '?30:17);if(g!==this.gen)return;
  }
  caret.remove();
  this.typing=false;this.filled=true;this.sync();
};
queue.send.addEventListener('click',function(){queue.press()});
queue.press=function(){
  var g=this.gen;
  if(this.typing)return;
  if(!this.filled){
    if(this.streaming&&this.q.length>=MAXQ){pulse(this.stack,'shake');this.full()}
    return;
  }
  var src=this.ctext.getBoundingClientRect(),t=this.takeComposer();
  this.sent++;
  if(!this.streaming){
    this.sync();
    var u=bubble(t);this.tin.appendChild(u.item);
    fly(src,u.bub,this.root,640);enter(u.item,440);
    this.stream(g);this.refill(g);return;
  }
  // в очередь: текст из композера поднимается и становится карточкой стопки
  this.q.push(t);this.sync();
  var p=h('div','qpill',CLOCK),qt=h('span','qt');qt.textContent=t;p.appendChild(qt);
  this.stack.insertBefore(p,this.stack.querySelector('.qpill'));
  this.layout();
  var tr=p.getBoundingClientRect(),s=cam.s;
  var dx=((src.left+src.width/2)-(tr.left+tr.width/2))/s,dy=(src.top-tr.top)/s;
  p.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+(src.width/tr.width)+','+(src.height/tr.height)+')',opacity:.2},
             {transform:this.slot(0),opacity:1}],{duration:D(520),easing:'cubic-bezier(.3,.7,.1,1)'});
  pulse(this.qlbl,'bump');
  if(this.q.length>=MAXQ)setTimeout(function(){if(g===queue.gen)queue.full()},D(420));
  this.refill(g);
};
queue.full=function(){
  var l=this.qlbl;l.classList.add('full');
  clearTimeout(this.fullT);this.fullT=setTimeout(function(){l.classList.remove('full')},D(1300));
};
queue.stream=async function(g){
  var self=this,alive=function(){return g===self.gen};
  this.streaming=true;this.stage='stream';this.sync();
  await sleep(300);if(!alive())return;
  var paras=TOAST.answers[Math.min(this.answered,TOAST.answers.length-1)];
  var ok=await streamAnswer(this.tin,paras,this.answered?60:78,alive);if(!ok)return;
  this.answered++;
  // пока в очереди кто-то есть, ответ считается непрерывным: новое нажатие встанет в стопку
  if(!this.q.length){this.streaming=false;this.sync();this.stage=this.filled?'idle':'done';return}
  await sleep(460);if(!alive())return;

  // самый старый из очереди перелетает в ленту и становится пузырём
  this.dequeued++;
  var ps=this.pills(),back=ps[ps.length-1],src=back.getBoundingClientRect(),t=this.q.shift();
  back.remove();this.layout();
  var u=bubble(t);this.tin.appendChild(u.item);
  fly(src,u.bub,this.root,680);enter(u.item,460);
  this.stream(g);
};

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
    // запасной таймер: rAF стоит, пока вкладка скрыта
    setTimeout(function(){if(done)return;done=true;
      var r=el.getBoundingClientRect();cur.x=r.left+r.width*.55;cur.y=r.top+r.height*.6;
      cur.el.style.transform='translate('+cur.x+'px,'+cur.y+'px)';res()},dur+120);
    function f(now){
      if(done)return;
      var r=el.getBoundingClientRect(),tx=r.left+r.width*.55,ty=r.top+r.height*.6;
      var p=Math.min(1,(now-t0)/dur),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
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
var tools=document.getElementById('tools'),deck=document.getElementById('deck');
async function play(){
  var g=++auto.id,alive=function(){return g===auto.id};
  var W=function(ms){return sleep(ms).then(function(){if(!alive())throw 0})};
  var U=function(fn){return until(fn,g,auto)};
  auto.running=true;tools.classList.add('hide');
  try{
    say('');deck.classList.add('fade');await W(360);
    initAll();overview();deck.classList.remove('fade');
    say('Two small moments from a chat with an AI model.');
    await W(2000);

    // 01: наезд на первую карточку
    focus(think.root,1.6,.86);
    say('You ask a question. The model thinks before it answers.');
    await W(1300);
    await cursorTo(think.send,760);if(!alive())return;await W(160);
    await tap(think.send);
    await W(500);cursorOff();
    await U(function(){return think.stage==='thinking'});
    focus(think.thk.el,1.95,.72);
    say('Its reasoning streams in a small window, three lines at a time.');
    await U(function(){return think.stage==='fold'});
    say('When it’s done, '+think.secs+' seconds of thinking fold into one line.');
    await U(function(){return think.stage==='answer'});
    await W(350);focus(think.root,1.6,.86);
    await U(function(){return think.stage==='done'});
    await W(500);
    say('Tap that line to read the whole thought.');
    await W(700);
    await cursorTo(think.thk.head,700);await W(140);
    await tap(think.thk.head);focus(think.thk.el,1.8,.86);
    await W(2600);
    await tap(think.thk.head);focus(think.root,1.6,.86);
    await W(700);cursorOff();await W(500);

    // 02: переезд на вторую
    focus(queue.root,1.6,.86);
    say('Here the model is busy writing a toast.');
    await W(1200);
    await cursorTo(queue.send,800);await W(160);
    await tap(queue.send);
    await U(function(){return queue.typing});
    say('You don’t have to wait. Keep typing and press send.');
    for(var i=0;i<MAXQ;i++){
      await U(function(){return (queue.filled&&!queue.typing)||!queue.streaming});
      if(!queue.streaming)break;
      await W(i?160:260);
      await tap(queue.send);
      if(i===1)say('Each follow-up waits in a stack above the input.');
    }
    await W(600);cursorOff();
    say('Three at most. The counter turns amber when the stack is full.');
    await U(function(){return queue.dequeued>0});
    say('As soon as an answer ends, the oldest one goes out.');
    await U(function(){return queue.stage==='done'});
    await W(900);

    // отъезд на общий план, итог берём из живого состояния
    overview();
    say(queue.sent+' messages in, '+queue.answered+' answers out, same order.');
    await W(3600);
    play();
  }catch(e){if(e!==0)throw e}
}
function stopAuto(){auto.id++;auto.running=false;cursorOff();overview();say('');tools.classList.remove('hide')}

/* ─────────── запуск и низ ─────────── */
function initAll(){think.init();queue.init()}
initAll();
document.addEventListener('pointerdown',function(e){
  if(e.isTrusted&&auto.running&&!e.target.closest('#tools'))stopAuto();
},true);
document.getElementById('play').addEventListener('click',function(){play()});
document.getElementById('reset').addEventListener('click',function(){stopAuto();initAll()});
var segs=document.querySelectorAll('.seg-ctl button');
function markTheme(t){segs.forEach(function(x){x.classList.toggle('on',x.dataset.theme===t)})}
markTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
segs.forEach(function(b){
  b.addEventListener('click',function(){markTheme(b.dataset.theme);document.documentElement.setAttribute('data-theme',b.dataset.theme)});
});
setTimeout(play,500);
