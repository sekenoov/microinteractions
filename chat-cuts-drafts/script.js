/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var EO='cubic-bezier(.16,1,.3,1)';
function D(ms){return reduce?1:ms}
function sleep(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms)})}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;
  var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296}}
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e}
function bar(w){var b=h('span','bar');b.style.width=w+'%';return b}
function draw(b,w,dur,ease){
  b.style.width=w+'%';
  return b.animate([{width:'0%'},{width:w+'%'}],{duration:D(dur),easing:ease||'cubic-bezier(.33,.6,.4,1)'}).finished;
}
/* элемент уже в DOM: раскрываем высоту от нуля, соседи едут плавно */
function enter(el,dur){
  var hh=el.offsetHeight;el.style.overflow='hidden';
  return el.animate([{height:'0px',opacity:0},{height:hh+'px',opacity:1}],{duration:D(dur||340),easing:EO})
    .finished.then(function(){el.style.overflow=''});
}
function shake(n){n.classList.remove('shake');void n.offsetWidth;n.classList.add('shake')}
function pulse(n,c){n.classList.remove(c);void n.offsetWidth;n.classList.add(c)}

/* ─────────── одометр ─────────── */
function Odo(el){this.el=el;this.cur=''}
Odo.prototype.set=function(text){
  if(text===this.cur)return;
  var old=this.cur;this.cur=text;
  if(old.length!==text.length){this.build(text);return}
  for(var i=0;i<text.length;i++){
    if(old[i]===text[i])continue;
    var slot=this.el.children[i];
    if(slot&&slot.classList.contains('dig')&&/\d/.test(text[i])){
      slot.firstChild.style.transitionDelay=((text.length-i-1)*22)+'ms';
      slot.firstChild.style.transform='translateY('+(-text[i]*1.2)+'em)';
    }else if(slot){slot.textContent=text[i]}
  }
};
Odo.prototype.build=function(text){
  this.el.innerHTML='';
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(/\d/.test(ch)){
      var s=h('span','dig'),u=h('u');
      for(var k=0;k<10;k++){var b=h('b');b.textContent=k;u.appendChild(b)}
      u.style.transform='translateY('+(-ch*1.2)+'em)';
      s.appendChild(u);this.el.appendChild(s);
    }else{var t=h('span');t.textContent=ch;this.el.appendChild(t)}
  }
};

/* ─────────── общие куски чата ─────────── */
function bubble(ws){
  var item=h('div','item'),b=h('div','bub');
  ws.forEach(function(w){b.appendChild(bar(w))});
  item.appendChild(b);return {item:item,bub:b};
}
function answer(ws){
  var item=h('div','item ans');
  ws.forEach(function(w){var al=h('div','al');al.appendChild(bar(w));item.appendChild(al)});
  return item;
}
function history(tin){
  tin.appendChild(bubble([74]).item);
  tin.appendChild(answer([97,90,58]));
}
function Chat(id){
  this.root=document.getElementById(id);
  this.tin=this.root.querySelector('.tin');
  this.cbars=this.root.querySelector('.cbars');
  this.send=this.root.querySelector('.send');
  this.gen=0;
}

/* ═════════ 01 · размышление складывается ═════════ */
var think=new Chat('think');
think.init=function(){
  this.gen++;this.state='idle';this.open=false;
  this.tin.innerHTML='';history(this.tin);
  this.cbars.innerHTML='';this.cbars.appendChild(bar(92));this.cbars.appendChild(bar(46));
  this.send.className='send';this.send.disabled=false;
};
think.send.addEventListener('click',function(){if(think.state==='idle')think.run()});
think.run=async function(){
  var g=this.gen,self=this,r=rng(Math.random()*1e9|0);
  var alive=function(){return g===self.gen};
  this.state='run';this.send.classList.add('stop');

  // запрос уезжает из композера в ленту
  var ws=[].map.call(this.cbars.children,function(b){return parseFloat(b.style.width)});
  [].forEach.call(this.cbars.children,function(b){b.style.width='0%'});
  var u=bubble(ws.map(function(w){return Math.round(w*.92)}));
  this.tin.appendChild(u.item);enter(u.item,380);
  await sleep(320);if(!alive())return;
  this.cbars.innerHTML='';

  // блок размышления: три строки в окне, старые уходят вверх
  var t=h('div','item thk',
    '<button class="thead" disabled><span class="tlabel"><span class="t1">Thinking</span><span class="t2">Thought for</span></span>'+
    '<span class="tsec"><span class="sec"></span>s</span>'+
    '<svg class="chev" viewBox="0 0 10 16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 2l5.5 6-5.5 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<div class="tbox"><div class="tlines"></div></div>');
  var head=t.querySelector('.thead'),lbl=t.querySelector('.tlabel'),
      box=t.querySelector('.tbox'),lines=t.querySelector('.tlines'),
      odo=new Odo(t.querySelector('.sec'));
  odo.set('0');
  this.tin.appendChild(t);
  var w1=t.querySelector('.t1').offsetWidth,w2=t.querySelector('.t2').offsetWidth;
  lbl.style.width=w1+'px';lbl.style.transition='width .38s '+EO;
  box.style.height='37px';box.style.transition='height .42s '+EO+',margin-top .42s '+EO+',opacity .3s';
  enter(t,340);
  this.thk={el:t,box:box,lines:lines,head:head};

  var s=0,tick=setInterval(function(){if(!alive()){clearInterval(tick);return}s++;odo.set(String(s))},D(172));
  var N=9;
  for(var i=0;i<N;i++){
    var b=bar(0);lines.appendChild(b);draw(b,52+r()*44,250);
    if(i>=3)lines.style.transform='translateY('+(-(i-2)*15)+'px)';
    await sleep(270);if(!alive()){clearInterval(tick);return}
  }
  clearInterval(tick);
  await sleep(140);if(!alive())return;

  // складывание: окно схлопывается, заголовок меняет глагол
  t.classList.add('done');lbl.style.width=w2+'px';
  box.style.height='0px';box.style.marginTop='0px';box.style.opacity='0';
  head.disabled=false;
  await sleep(200);if(!alive())return;

  // ответ печатается под свёрнутой строкой
  var a=answer([]);this.tin.appendChild(a);
  var n=5+(r()*2|0);
  for(i=0;i<n;i++){
    var al=h('div','al'),ab=bar(0);al.appendChild(ab);a.appendChild(al);
    enter(i===0?a:al,300);draw(ab,i===n-1?30+r()*30:84+r()*14,340);
    await sleep(95);if(!alive())return;
  }
  await sleep(260);if(!alive())return;
  this.send.classList.remove('stop');this.send.classList.add('locked');this.send.disabled=true;
  this.state='done';
};
think.tin.addEventListener('click',function(e){
  var hd=e.target.closest('.thead');
  if(!hd||hd.disabled||!think.thk)return;
  var k=think.thk;think.open=!think.open;
  k.el.classList.toggle('open',think.open);
  var n=k.lines.children.length,full=n*7+(n-1)*8;
  k.lines.style.transform='none';
  k.box.style.height=think.open?full+'px':'0px';
  k.box.style.marginTop=think.open?'9px':'0px';
  k.box.style.opacity=think.open?'1':'0';
});

/* ═════════ 02 · правка делает ветку ═════════ */
var branch=new Chat('branch');
var PEN='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.6 2.6l2.8 2.8M3 13l.6-3.1 7.6-7.6 2.8 2.8-7.6 7.6L3 13z" stroke-linejoin="round"/></svg>';
var PREV='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 3.5L5.5 8l4.5 4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var NEXT='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3.5L10.5 8 6 12.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
branch.init=function(){
  this.gen++;this.busy=false;this.r=rng(Math.random()*1e9|0);
  this.tin.innerHTML='';
  this.branches=[{u:[90,48,0],a:[96,92,87,94,44]}];this.cur=0;
  var u=bubble([0,0,0]);this.bub=u.bub;this.bars=[].slice.call(u.bub.children);
  this.acts=h('div','acts',
    '<div class="pager"><button class="ib prev" aria-label="Previous version">'+PREV+'</button>'+
    '<span class="pnum"><span class="pc"></span> / <span class="pt"></span></span>'+
    '<button class="ib next" aria-label="Next version">'+NEXT+'</button></div>'+
    '<button class="ib edit" aria-label="Edit message">'+PEN+'</button>');
  u.item.appendChild(this.acts);
  this.pager=this.acts.querySelector('.pager');
  this.prev=this.acts.querySelector('.prev');this.next=this.acts.querySelector('.next');
  this.edit=this.acts.querySelector('.edit');
  this.oc=new Odo(this.acts.querySelector('.pc'));this.ot=new Odo(this.acts.querySelector('.pt'));
  this.oc.set('1');this.ot.set('1');
  this.ans=answer([]);
  this.tin.appendChild(u.item);this.tin.appendChild(this.ans);
  this.paintBubble(this.branches[0].u);
  this.fillAnswer(this.branches[0].a);
  var self=this;
  this.edit.onclick=function(){if(!self.busy)self.run()};
  this.prev.onclick=function(){self.go(self.cur-1)};
  this.next.onclick=function(){self.go(self.cur+1)};
  this.arrows();
};
branch.paintBubble=function(u){
  this.bars.forEach(function(b,i){b.style.width=u[i]+'%';b.classList.toggle('gone',!u[i])});
};
branch.fillAnswer=function(ws){
  this.ans.innerHTML='';var self=this;
  ws.forEach(function(w){var al=h('div','al');al.appendChild(bar(w));self.ans.appendChild(al)});
};
branch.arrows=function(){
  var n=this.branches.length;
  this.prev.disabled=this.busy||this.cur===0;
  this.next.disabled=this.busy||this.cur===n-1;
  this.edit.disabled=this.busy||n>=9;
};
branch.swapOut=function(dir){
  var als=[].slice.call(this.ans.children);
  return Promise.all(als.map(function(al,i){
    return al.animate([{transform:'none',opacity:1},{transform:'translateX('+(dir*16)+'px)',opacity:0}],
      {duration:D(200),delay:D(i*28),easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}).finished;
  }));
};
branch.run=async function(){
  var g=this.gen,self=this,r=this.r,alive=function(){return g===self.gen};
  this.busy=true;this.arrows();pulse(this.edit,'pulse');
  var old=this.branches[this.cur].u,u=[old[0],58+r()*36,26+r()*44];

  // режим правки: рамка и каретка
  this.bub.classList.add('editing');
  var last=old[2]?2:1,caret=h('i','caret');
  this.bars[last].appendChild(caret);
  await sleep(300);if(!alive())return;
  // стираем хвост, потом дописываем новый
  this.bars[last].style.width='12%';
  await sleep(380);if(!alive())return;
  this.bars[1].appendChild(caret);
  if(last===2){this.bars[2].classList.add('gone');this.bars[2].style.width='0%'}
  this.bars[1].style.width=u[1]+'%';
  await sleep(320);if(!alive())return;
  this.bars[2].appendChild(caret);
  this.bars[2].style.width='0%';this.bars[2].classList.remove('gone');void this.bars[2].offsetWidth;
  this.bars[2].style.width=u[2]+'%';
  await sleep(420);if(!alive())return;
  caret.remove();this.bub.classList.remove('editing');

  // новая ветка: счётчик растёт, старый ответ уходит влево
  var a=[];for(var i=0;i<5;i++)a.push(i===4?28+r()*34:82+r()*16);
  this.branches.push({u:u,a:a});this.cur=this.branches.length-1;
  this.pager.classList.add('on');
  this.ot.set(String(this.branches.length));
  setTimeout(function(){if(alive())self.oc.set(String(self.cur+1))},D(90));
  this.swapOut(-1);await sleep(320);if(!alive())return;
  this.ans.innerHTML='';
  for(i=0;i<a.length;i++){
    var al=h('div','al'),b=bar(0);al.appendChild(b);this.ans.appendChild(al);
    draw(b,a[i],340);
    await sleep(85);if(!alive())return;
  }
  await sleep(260);if(!alive())return;
  this.busy=false;this.arrows();
};
branch.go=async function(i){
  if(this.busy||i<0||i>=this.branches.length||i===this.cur)return;
  var g=this.gen,self=this,dir=i>this.cur?1:-1;
  this.busy=true;this.cur=i;this.arrows();
  this.oc.set(String(i+1));
  this.paintBubble(this.branches[i].u);
  this.swapOut(-dir);await sleep(300);if(g!==this.gen)return;
  this.fillAnswer(this.branches[i].a);
  [].forEach.call(this.ans.children,function(al,k){
    al.animate([{transform:'translateX('+(dir*16)+'px)',opacity:0},{transform:'none',opacity:1}],
      {duration:D(280),delay:D(k*28),easing:EO,fill:'backwards'});
  });
  await sleep(300);if(g!==this.gen)return;
  this.busy=false;this.arrows();
};

/* ═════════ 03 · очередь во время ответа ═════════ */
var queue=new Chat('queue');
var CLOCK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var MAXQ=3;
queue.stack=queue.root.querySelector('.qstack');
queue.init=function(){
  this.gen++;this.r=rng(Math.random()*1e9|0);
  this.streaming=false;this.typing=false;this.filled=true;this.q=[];this.refills=0;
  this.tin.innerHTML='';history(this.tin);
  this.cbars.innerHTML='';this.cbars.appendChild(bar(64));
  this.stack.innerHTML='<span class="qcount"><span class="qn"></span><span>queued</span></span>';
  this.qlbl=this.stack.querySelector('.qcount');
  this.qodo=new Odo(this.stack.querySelector('.qn'));this.qodo.set('0');
  this.layout();this.sync();
};
queue.sync=function(){
  var locked=!this.streaming&&!this.filled&&!this.typing;
  this.send.classList.toggle('stop',this.streaming&&!this.filled);
  this.send.classList.toggle('locked',locked);
};
queue.layout=function(){
  var pills=[].slice.call(this.stack.querySelectorAll('.qpill:not(.leaving)')),n=pills.length;
  this.stack.style.height=n?(36+(Math.min(n,3)-1)*6)+'px':'0px';
  this.stack.classList.toggle('on',n>0);
  pills.forEach(function(p,i){
    p.style.transform='translateY('+(-Math.min(i,2)*6)+'px) scale('+(1-Math.min(i,2)*.045)+')';
    p.style.opacity=i>2?'0':'1';p.style.zIndex=10-i;
  });
  this.qlbl.style.opacity=n?'1':'0';
  if(n)this.qodo.set(String(n));
};
queue.takeComposer=function(){
  var b=this.cbars.firstChild,w=parseFloat(b.style.width);
  b.style.width='0%';this.filled=false;
  return w;
};
queue.refill=async function(g){
  if(this.refills>=MAXQ)return;
  this.refills++;
  await sleep(260);if(g!==this.gen||!this.streaming)return;
  this.typing=true;this.sync();
  this.cbars.innerHTML='';var b=bar(0);this.cbars.appendChild(b);
  draw(b,40+this.r()*50,400,'cubic-bezier(.5,.2,.5,1)');
  await sleep(400);if(g!==this.gen)return;
  this.typing=false;this.filled=true;this.sync();
};
queue.send.addEventListener('click',function(){queue.press()});
queue.press=function(){
  var g=this.gen;
  if(!this.filled||this.typing)return;
  if(!this.streaming){
    var w=this.takeComposer();this.sync();
    var u=bubble([w*1.1]);this.tin.appendChild(u.item);enter(u.item,380);
    this.stream(g);this.refill(g);return;
  }
  if(this.q.length>=MAXQ){shake(this.send);shake(this.stack);return}
  // в очередь: полоса уезжает из композера в стопку
  w=this.takeComposer();this.q.push(w);this.sync();
  var p=h('div','qpill',CLOCK);p.appendChild(bar(Math.min(52,w*.62)));
  p.style.transform='translateY(22px) scale(.96)';p.style.opacity='0';
  this.stack.insertBefore(p,this.stack.querySelector('.qpill')||null);
  void p.offsetWidth;this.layout();
  this.refill(g);
};
queue.stream=async function(g){
  this.streaming=true;this.sync();
  var r=this.r,a=answer([]);this.tin.appendChild(a);
  var n=6+(r()*3|0);
  await sleep(260);if(g!==this.gen)return;
  for(var i=0;i<n;i++){
    var al=h('div','al'),b=bar(0);al.appendChild(b);a.appendChild(al);
    enter(i===0?a:al,260);
    var d=i===n-1?260:470;draw(b,i===n-1?24+r()*36:82+r()*16,d,'linear');
    await sleep(d);if(g!==this.gen)return;
  }
  this.streaming=false;this.sync();
  if(!this.q.length)return;
  await sleep(380);if(g!==this.gen)return;
  // самый старый из очереди улетает в ленту
  var pills=this.stack.querySelectorAll('.qpill'),back=pills[pills.length-1],w=this.q.shift();
  var k=Math.min(pills.length-1,2);
  back.style.transform='translateY('+(-k*6-28)+'px) scale(.9)';back.style.opacity='0';
  setTimeout(function(){back.remove()},D(320));
  back.classList.add('leaving');this.layout();
  var u=bubble([w*1.1]);this.tin.appendChild(u.item);enter(u.item,380);
  this.stream(g);
};
/* ─────────── запуск и низ ─────────── */
function initAll(){think.init();branch.init();queue.init()}
initAll();
document.getElementById('reset').addEventListener('click',initAll);
document.querySelectorAll('.seg-ctl button').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('.seg-ctl button').forEach(function(x){x.classList.toggle('on',x===b)});
    document.documentElement.setAttribute('data-theme',b.dataset.theme);
  });
});
