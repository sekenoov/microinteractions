/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var EO='cubic-bezier(.16,1,.3,1)';
// темп разделён: SLOW растягивает паузы между действиями, ANIM задаёт скорость самих анимаций
var SLOW=1.4,ANIM=1;
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
var SAFE=130;
var world=document.getElementById('world'),deckEl=document.getElementById('deck');
var cam={x:0,y:0,s:1,vx:0,vy:0,vs:0,tx:0,ty:0,ts:1};
function camOn(){return !reduce&&innerWidth>780}
(function loop(){
  var last=performance.now();
  function f(now){
    // пропущенное время догоняется целиком: камера всегда там, где должна быть по часам
    var el=Math.min(4,(now-last)/1000);last=now;
    if(camOn()){
      // пружина с критическим затуханием, шаг мелкий и по реальному времени
      var k=6,c=2*Math.sqrt(k);
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
function frame(el,maxS,fill){
  if(!camOn())return;
  var r=el.getBoundingClientRect();
  var lx=(r.left-cam.x)/cam.s,ly=(r.top-cam.y)/cam.s,w=r.width/cam.s,hh=r.height/cam.s;
  fill=fill||.8;var H=innerHeight-SAFE;
  var s=Math.min(maxS||1.7,innerWidth*fill/w,H*fill/hh);
  cam.ts=s;cam.tx=innerWidth/2-(lx+w/2)*s;cam.ty=H/2+8-(ly+hh/2)*s;
}
function overview(){frame(deckEl,1.15,.88)}

/* полёт сообщения: текст не масштабируется, а переезжает из композера в пузырь.
   Клон совмещается с исходным текстом по первой строке, фон пузыря проявляется по дороге */
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

/* ─────────── общие куски чата ─────────── */
var ICON_MEM='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.4" y="5.6" width="13.2" height="11" rx="2.4"/><path d="M6 3.4h8M7 9.4h6M7 12.6h3.6" stroke-linecap="round"/></svg>';
var ICON_TICK='<svg class="tick" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="M4.6 10.4l3.6 3.6 7.2-7.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var ICON_GLOBE='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.2"/><path d="M2.8 10h14.4M10 2.8c2 2 3 4.4 3 7.2s-1 5.2-3 7.2c-2-2-3-4.4-3-7.2s1-5.2 3-7.2z" stroke-linejoin="round"/></svg>';
var ICON_OK='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4.8 10.4l3.4 3.4 7-7.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function bubble(html){
  var item=h('div','item'),b=h('div','bub');b.innerHTML=html;
  item.appendChild(b);return {item:item,bub:b};
}
function seed(tin,pair){
  tin.appendChild(bubble(pair[0]).item);
  var a=h('div','item ans txt');a.appendChild(h('p','',pair[1]));tin.appendChild(a);
}
/* подпись статуса, которая меняется на итоговую: ширина едет вместе со сменой слов */
function statusLabel(box){
  var l1=box.querySelector('.l1'),l2=box.querySelector('.l2');
  box.style.width=l1.offsetWidth+'px';
  box.style.transition='width '+D(420)/1000+'s '+EO;
  // шиммер снимается до смены: градиентный текст в движении рисуется плашкой
  return function(){l1.classList.remove('shim');box.style.width=l2.offsetWidth+'px'};
}
function Chat(id){
  this.root=document.getElementById(id);
  this.tin=this.root.querySelector('.tin');
  this.composer=this.root.querySelector('.composer');
  this.ctext=this.root.querySelector('.ctext');
  this.send=this.root.querySelector('.send');
  this.mic=this.root.querySelector('.mic');
  this.gen=0;this.stage='idle';
}
Chat.prototype.setComposer=function(text){
  this.ctext.innerHTML='';this.ctext.textContent=text||'';
  this.send.classList.toggle('dim',!text);
  this.send.classList.remove('locked');
};
Chat.prototype.clean=function(){
  [].forEach.call(this.root.querySelectorAll('.flyer,.chip.fly,.tip,.cfly,.peek,.kfly'),function(n){n.remove()});
};
/* текст из композера перелетает в ленту и становится пузырём */
Chat.prototype.post=function(html){
  var src=this.ctext.getBoundingClientRect(),u=bubble(html),self=this;
  this.tin.appendChild(u.item);
  fly(src,u.bub,this.root,640);enter(u.item,440);
  this.ctext.style.opacity='0';
  setTimeout(function(){self.setComposer('');self.ctext.style.opacity=''},D(460));
  this.send.classList.add('dim');
  return u.bub;
};
/* человек печатает в композер */
Chat.prototype.type=async function(text,g){
  this.setComposer('');
  var caret=h('span','caret'),node=document.createTextNode('');
  this.ctext.appendChild(node);this.ctext.appendChild(caret);
  for(var i=0;i<text.length;i++){
    node.data+=text[i];
    await sleep(text[i]===' '?44:24);if(g!==this.gen)return;
  }
  caret.remove();this.send.classList.remove('dim');
};

/* ответ печатается словами, в хвосте пульсирует точка.
   <b> в начале абзаца сохраняется, {n} превращается в сноску на источник */
async function stream(tin,paras,o){
  var per=o.per||30,alive=o.alive;
  var a=h('div','item ans txt'),dot=h('span','sdot');
  for(var i=0;i<paras.length;i++){
    var p=h('p');
    if(i===0){
      a.appendChild(p);if(o.pre)p.appendChild(o.pre);p.appendChild(dot);
      tin.appendChild(a);enter(a,360);
      if(o.start){await o.start(a);if(!alive())return false}
    }else grow(a,function(){a.appendChild(p);p.appendChild(dot)});
    var m=paras[i].match(/^<b>(.*?)<\/b>\s*(.*)$/),chunks=m?[[h('b'),m[1]],[p,m[2]]]:[[p,paras[i]]];
    for(var c=0;c<chunks.length;c++){
      var host=chunks[c][0];
      if(host!==p){p.insertBefore(host,dot);p.insertBefore(document.createTextNode(' '),dot)}
      var toks=chunks[c][1].split(' ');
      for(var j=0;j<toks.length;j++){
        var cm=toks[j].match(/^\{(\d)\}$/);
        if(cm){
          var ch=h('span','cite');ch.textContent=cm[1];ch.dataset.n=cm[1];
          grow(a,function(){p.insertBefore(ch,dot)});
          if(o.cite)o.cite(ch,+cm[1]);
          await sleep(per*5);if(!alive())return false;continue;
        }
        var nx=toks[j+1],sp=j<toks.length-1&&!(nx&&/^\{\d\}$/.test(nx))?' ':'';
        var w=h('span','tw');w.textContent=toks[j]+sp;
        (function(w,host){grow(a,function(){if(host===p)p.insertBefore(w,dot);else host.appendChild(w)})})(w,host);
        popIn(w);
        await sleep(per);if(!alive())return false;
      }
    }
  }
  dot.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}],{duration:D(220),fill:'forwards'});
  setTimeout(function(){dot.remove()},D(230));
  return a;
}

/* ═════════ 01 · голос превращается в слова ═════════ */
var VOICE={
  hist:['Making pancakes with the kids. My hands are all flour.','Best kind of Sunday. Shout if you get stuck.'],
  words:['I’m','out','of','eggs','what','can','I','use','instead'],
  cap:{4:1},
  syl:[1,1,1,1,1,1,1,1,2],
  stress:[.7,.9,.5,1,.85,.7,.55,.8,.95],
  punct:{3:'.',8:'?'},
  answer:['Mash half a ripe banana for each egg, or use three spoons of yogurt.',
          'They’ll come out a little denser and just as good.']
};
/* волна строится из самой фразы: слог это горб из двух или трёх баров, между словами тишина */
function makePattern(N){
  var W=VOICE.words,syl=[];
  W.forEach(function(w,k){for(var s=0;s<VOICE.syl[k];s++)syl.push({k:k,s:s,n:0})});
  var gaps=W.length-1+Object.keys(VOICE.punct).length-1,lead=1,tail=3;
  var avail=N-lead-gaps-tail,base=Math.max(2,Math.floor(avail/syl.length)),extra=Math.max(0,avail-base*syl.length);
  syl.forEach(function(x){x.n=base});
  // лишние бары получают ударные слоги
  syl.map(function(x,i){return i}).sort(function(a,b){return VOICE.stress[syl[b].k]-VOICE.stress[syl[a].k]})
     .slice(0,extra).forEach(function(i){syl[i].n++});
  var pat=[{a:.08,w:-1}];
  syl.forEach(function(x,i){
    var peak=clamp(VOICE.stress[x.k]*(x.k===8&&x.s===0?.7:1)*(.86+Math.random()*.22),.4,1);
    for(var j=0;j<x.n;j++){
      var env=Math.pow(Math.sin(Math.PI*(j+.5)/x.n),.75);
      pat.push({a:clamp(.2+(peak-.2)*env*(.82+Math.random()*.3),.18,1),w:x.k});
    }
    var nx=syl[i+1];
    if(nx&&nx.k!==x.k){
      pat.push({a:.06+Math.random()*.05,w:-1});
      if(VOICE.punct[x.k])pat.push({a:.05,w:-1});
    }
  });
  while(pat.length<N)pat.push({a:.05+Math.random()*.03,w:-1});
  return pat;
}
var voice=new Chat('voice');
voice.field=voice.root.querySelector('.cfield');
voice.wave=voice.root.querySelector('.wave');
voice.rdot=voice.root.querySelector('.rdot');
voice.todo=new Odo(voice.root.querySelector('.rtime'));
voice.build=function(){
  this.wave.innerHTML='';this.bars=[];
  var W=this.wave.clientWidth||150,N=Math.max(26,Math.floor((W+2)/4));
  for(var i=0;i<N;i++){var b=h('span','bar');this.wave.appendChild(b);this.bars.push(b)}
  this.pat=makePattern(N);
};
voice.init=function(){
  this.gen++;this.stage='idle';clearInterval(this.recT);this.heard=0;
  this.composer.classList.remove('recording','morphing');
  this.clean();[].forEach.call(this.field.querySelectorAll('.wm'),function(n){n.remove()});
  this.tin.innerHTML='';seed(this.tin,VOICE.hist);
  this.setComposer('');this.todo.set('0:00');this.rdot.style.transform='';
  this.build();
};
voice.start=function(){
  if(this.stage!=='idle')return;
  var g=this.gen,self=this;
  this.build();
  this.stage='rec';this.i=0;this.t0=performance.now();this.todo.set('0:00');
  this.composer.classList.add('recording');this.send.classList.remove('dim');
  var end=0;this.pat.forEach(function(p,i){if(p.w>=0)end=i});
  this.recT=setInterval(function(){
    if(g!==self.gen){clearInterval(self.recT);return}
    var i=self.i;
    if(i<self.bars.length){
      var p=self.pat[i],b=self.bars[i];
      b.classList.add('on');if(p.w<0)b.classList.add('quiet');
      b.style.height=Math.max(3,p.a*22)+'px';
      self.rdot.style.transform='scale('+(1+(p.w>=0?p.a:0)*.55)+')';
      self.i++;
    }else self.rdot.style.transform='';
    if(self.i>end+2&&self.stage==='rec')self.stage='heard';
    var sec=Math.floor((performance.now()-self.t0)/1000);
    self.todo.set('0:'+(sec<10?'0':'')+sec);
  },D(68));
};
voice.cancel=function(){
  clearInterval(this.recT);this.stage='idle';
  this.composer.classList.remove('recording');this.send.classList.add('dim');
  this.bars.forEach(function(b){b.classList.remove('on','quiet');b.style.height=''});
};
voice.stop=async function(){
  if(this.stage!=='rec'&&this.stage!=='heard')return;
  clearInterval(this.recT);
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  var bars=this.bars,pat=this.pat,n=this.i,field=this.field,comp=this.composer;
  // в текст идут только слова, записанные целиком
  var groups=[];
  VOICE.words.forEach(function(w,k){
    var idx=[];pat.forEach(function(p,j){if(p.w===k)idx.push(j)});
    if(idx.length&&idx[idx.length-1]<n)groups.push({k:k,idx:idx});
  });
  if(!groups.length){this.cancel();return}
  this.stage='morph';this.heard=groups.length;
  comp.classList.remove('recording');comp.classList.add('morphing');
  this.send.classList.add('dim');this.rdot.style.transform='';

  // 1. каждое слово забирает свои бары в отдельную капсулу. Координаты от нижнего края поля:
  //    композер растёт вверх, и капсулы не прыгают
  var fh=field.offsetHeight,wr=loc(this.wave.getBoundingClientRect(),field);
  var b0=loc(bars[0].getBoundingClientRect(),field),b1=loc(bars[1].getBoundingClientRect(),field);
  var gap=b1.x-b0.x-b0.w,HB=28;
  groups.forEach(function(gr){
    var r0=loc(bars[gr.idx[0]].getBoundingClientRect(),field);
    var cnt=gr.idx.length,w=cnt*b0.w+(cnt+1)*gap;
    gr.from={x:r0.x-gap,b:fh-(wr.y+wr.h/2+HB/2),w:w,h:HB};
    var wm=h('div','wm');
    wm.style.cssText='left:'+gr.from.x+'px;bottom:'+gr.from.b+'px;width:'+w+'px;height:'+HB+'px;background:transparent;transition:background-color '+D(260)/1000+'s ease';
    gr.idx.forEach(function(j){var i=h('i');i.style.height=bars[j].offsetHeight+'px';i.style.width=b0.w+'px';wm.appendChild(i);bars[j].style.visibility='hidden'});
    field.appendChild(wm);gr.wm=wm;
  });
  // тишина между словами гаснет
  bars.forEach(function(b){if(b.style.visibility!=='hidden')b.animate([{opacity:getComputedStyle(b).opacity},{opacity:0,height:'1px'}],{duration:D(260),easing:'ease-out',fill:'forwards'})});
  requestAnimationFrame(function(){groups.forEach(function(gr){gr.wm.style.backgroundColor='var(--hl)'})});
  setTimeout(function(){if(alive())groups.forEach(function(gr){gr.wm.style.backgroundColor='var(--hl)'})},40);
  await sleep(380);if(!alive())return;

  // 2. раскладываем итоговый текст невидимым, композер доращивает высоту
  grow(comp,function(){
    self.ctext.innerHTML='';
    groups.forEach(function(gr,q){
      var box=h('span');box.style.whiteSpace='nowrap';
      var w=h('span','vw'),wd=VOICE.words[gr.k];w.textContent=wd;box.appendChild(w);gr.word=w;
      // слово после точки пока со строчной: заглавная встанет, когда появится точка
      if(VOICE.cap[gr.k]&&VOICE.punct[gr.k-1]&&q>0){
        w.innerHTML='<span class="cap"><span class="c0">'+wd[0]+'</span><span class="c1">'+wd[0].toUpperCase()+'</span></span>'+wd.slice(1);
        gr.cap=w.querySelector('.cap');
      }
      var last=q===groups.length-1,pc=VOICE.punct[gr.k]||(last?(gr.k<=3?'.':'?'):'');
      if(pc){var pn=h('span','pn');pn.textContent=pc;box.appendChild(pn);gr.pn=pn}
      self.ctext.appendChild(box);
      if(!last)self.ctext.appendChild(document.createTextNode(' '));
    });
  },520);
  var fh2=field.offsetHeight;

  // 3. капсулы едут на места своих слов: бары сплющиваются в строку, из неё проступает слово
  var MD=560,ST=75;
  groups.forEach(function(gr,q){
    var r=loc(gr.word.getBoundingClientRect(),field);
    var to={x:r.x-3,b:fh2-(r.y+r.h)-1,w:r.w+6,h:r.h+2};
    var dl=D(q*ST);gr.to=to;
    gr.wm.animate([
      {left:gr.from.x+'px',bottom:gr.from.b+'px',width:gr.from.w+'px',height:gr.from.h+'px'},
      {left:to.x+'px',bottom:to.b+'px',width:to.w+'px',height:to.h+'px'}
    ],{duration:D(MD),delay:dl,easing:'cubic-bezier(.45,0,.18,1)',fill:'forwards'});
    [].forEach.call(gr.wm.children,function(bar){
      var h0=parseFloat(bar.style.height);
      bar.animate([{height:h0+'px',opacity:1},{height:Math.max(2,h0*.35)+'px',opacity:.55,offset:.3},{height:'2px',opacity:0,offset:.52},{height:'2px',opacity:0}],
        {duration:D(MD),delay:dl,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
    });
    gr.word.style.display='inline-block';
    gr.word.animate([{opacity:0,filter:'blur(4px)',transform:'translateY(3px) scale(.96)'},{opacity:1,filter:'blur(0)',transform:'none'}],
      {duration:D(440),delay:dl+D(MD*.58),easing:EO,fill:'both'});
    setTimeout(function(){if(alive())gr.wm.style.transition='background-color '+D(600)/1000+'s ease';gr.wm.style.backgroundColor='transparent'},dl+D(MD+260));
  });
  window.__dbg={fh:fh,fh2:fh2,g:groups.map(function(gr){return [VOICE.words[gr.k],gr.from,gr.to]})};
  await sleep(((groups.length-1)*ST+MD)+120);if(!alive())return;

  // 4. знаки препинания последними: голос их не произносил
  this.stage='punct';
  var pns=groups.filter(function(gr){return gr.pn});
  for(var i=0;i<pns.length;i++){
    pns[i].pn.animate([{opacity:0,transform:'translateY(-5px) scale(.3)'},{opacity:1,transform:'none'}],
      {duration:D(480),easing:'cubic-bezier(.3,1.7,.45,1)',fill:'both'});
    await sleep(170);if(!alive())return;
    // после точки следующее слово перекатывается на заглавную
    var nx=groups[groups.indexOf(pns[i])+1];
    if(nx&&nx.cap){
      var cp=nx.cap,c0=cp.children[0],c1=cp.children[1];
      cp.style.width=c0.offsetWidth+'px';void cp.offsetWidth;
      cp.style.transition='width '+D(420)/1000+'s '+EO;cp.style.width=c1.offsetWidth+'px';
      [c0,c1].forEach(function(c){c.animate([{transform:'none'},{transform:'translateY(-100%)'}],{duration:D(420),easing:'cubic-bezier(.3,1.3,.5,1)',fill:'forwards'})});
      await sleep(220);if(!alive())return;
    }
  }
  await sleep(420);if(!alive())return;
  groups.forEach(function(gr){
    gr.wm.remove();gr.word.getAnimations().forEach(function(a){a.cancel()});gr.word.style.opacity='1';gr.word.style.display='';
    if(gr.cap)gr.word.textContent=VOICE.words[gr.k][0].toUpperCase()+VOICE.words[gr.k].slice(1);
  });
  pns.forEach(function(gr){gr.pn.getAnimations().forEach(function(a){a.cancel()});gr.pn.style.opacity='1'});
  comp.classList.remove('morphing');
  bars.forEach(function(b){b.getAnimations().forEach(function(a){a.cancel()});b.style.visibility='';b.classList.remove('on','quiet');b.style.height=''});
  this.send.classList.remove('dim');pulse(this.send,'pop');
  this.stage='ready';
};
voice.submit=async function(){
  if(this.stage!=='ready')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send';
  var text=this.ctext.textContent;
  this.post(text.replace(/&/g,'&amp;').replace(/</g,'&lt;'));
  await sleep(760);if(!alive())return;
  this.stage='answer';
  var ok=await stream(this.tin,VOICE.answer,{per:30,alive:alive});if(!ok)return;
  this.send.classList.add('locked');this.stage='done';
};
voice.mic.addEventListener('click',function(){
  if(voice.stage==='idle')voice.start();
  else if(voice.stage==='rec'||voice.stage==='heard')voice.cancel();
});
voice.send.addEventListener('click',function(){
  if(voice.stage==='rec'||voice.stage==='heard')voice.stop();
  else if(voice.stage==='ready')voice.submit();
});

/* ═════════ 02 · память ═════════ */
var MEM={
  hist:['Back to back meetings until one.','Oof. Want help fitting in a proper lunch?'],
  prompt:'Yes please. Something quick. I’m vegetarian and I’ve got 15 minutes.',
  promptHTML:'Yes please. Something quick. I’m <span class="mk">vegetarian</span> and I’ve got <span class="mk2">15 minutes</span>.',
  saved:[['Lives in Lisbon','Mar'],['Dog named Miso','Jun'],['Runs on Sunday mornings','Aug']],
  fact:'Vegetarian',
  ans1:['Try a chickpea smash wrap. Mash a can of chickpeas with lemon, a little mayo and salt, then roll it up with spinach.',
        'Ten minutes, one bowl.'],
  prompt2:'Plan a dinner for my parents on Saturday.',
  ans2:['Here’s a menu that feels like an occasion:',
        '<b>Start.</b> Burrata with roasted peaches.',
        '<b>Main.</b> Mushroom risotto with lemon and thyme.',
        '<b>Dessert.</b> Olive oil cake and berries.']
};
var memory=new Chat('memory');
memory.pop=memory.root.querySelector('.mpop');
memory.list=memory.root.querySelector('.mlist');
memory.btn=memory.root.querySelector('.membtn');
memory.newBtn=memory.root.querySelector('.newchat');
memory.title=memory.root.querySelector('.ctitle');
memory.modo=new Odo(memory.root.querySelector('.mcount'));
memory.row=function(t,w){
  var r=h('div','mrow','<span class="md"></span><span class="mt"></span><span class="mw"></span>');
  r.querySelector('.mt').textContent=t;r.querySelector('.mw').textContent=w;return r;
};
memory.setTitle=function(t,anim){
  var box=this.title,old=box.lastElementChild;
  if(old&&old.textContent===t)return;
  var s=h('span');s.textContent=t;
  if(!anim||!old){box.innerHTML='';box.appendChild(s);return}
  box.appendChild(s);
  old.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-7px)'}],{duration:D(280),easing:'ease-in',fill:'forwards'});
  s.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:D(460),delay:D(140),easing:EO,fill:'backwards'});
  setTimeout(function(){old.remove()},D(300));
};
memory.openPop=function(on){this.pop.classList.toggle('open',on);this.open=on};
memory.init=function(){
  this.gen++;this.stage='idle';this.clean();this.openPop(false);
  this.btn.classList.remove('glow');
  this.setTitle('Quick lunch',false);
  this.tin.innerHTML='';seed(this.tin,MEM.hist);
  this.setComposer(MEM.prompt);
  var self=this;this.list.innerHTML='';
  MEM.saved.slice().reverse().forEach(function(s){self.list.appendChild(self.row(s[0],s[1]))});
  this.modo.set(String(MEM.saved.length));
};
/* фишка летит по дуге. Цель читается каждый кадр, поэтому камера и раскрывающийся поповер не мешают */
memory.flyChip=function(fromRect,toFn,opt){
  var root=this.root,chip=h('span','chip fly',ICON_MEM+'<span>'+MEM.fact+'</span>');
  root.appendChild(chip);
  var cw=chip.offsetWidth,chh=chip.offsetHeight,A=loc(fromRect,root);
  var ax=A.x+A.w/2,ay=A.y+A.h/2;
  return tween(opt.dur,function(p){
    var B=toFn(),bx=B.x+cw/2,by=B.y+B.h/2;
    // короткий подъём на месте, потом перелёт по дуге
    var lift=clamp(p/.16,0,1),q=clamp((p-.12)/.88,0,1),e=eio(q);
    var x=mix(ax,bx,e),y=mix(ay,by,e)-Math.sin(Math.PI*e)*opt.arc-eout(lift)*(1-e)*6;
    var s=mix(opt.s0,1,eout(lift))*(1+Math.sin(Math.PI*e)*.06)*mix(1,opt.s1,e);
    var o=opt.fadeIn?clamp(p/.12,0,1):1;
    if(opt.fadeOut)o*=1-clamp((p-.86)/.14,0,1);
    chip.style.transform='translate('+(x-cw/2).toFixed(2)+'px,'+(y-chh/2).toFixed(2)+'px) scale('+s.toFixed(3)+')';
    chip.style.opacity=o;
  }).then(function(){chip.remove()});
};
memory.run1=async function(){
  if(this.stage!=='idle')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send';
  var bub=this.post(MEM.promptHTML);
  await sleep(780);if(!alive())return;

  var st=h('div','item mstat','<span class="ico"><span class="base">'+ICON_MEM+'</span>'+ICON_TICK+'</span>'+
    '<span class="slbl"><span class="l1 shim">Saving to memory</span><span class="l2">Memory updated</span></span>');
  this.tin.appendChild(st);enter(st,340);
  var swap=statusLabel(st.querySelector('.slbl'));
  this.stage='mark';this.bub=bub;
  await sleep(420);if(!alive())return;

  // что останется правдой и через неделю, подсвечивается. Минуты гаснут
  var mk=bub.querySelector('.mk'),mk2=bub.querySelector('.mk2');
  mk.classList.add('on');
  await sleep(300);if(!alive())return;
  mk2.classList.add('on');
  await sleep(1150);if(!alive())return;
  mk2.classList.add('gone');mk2.style.opacity='.55';this.stage='letgo';
  await sleep(900);if(!alive())return;

  // фишка отрывается от слова и садится первой строкой в память
  this.stage='lift';
  this.btn.classList.add('glow');this.openPop(true);
  var row=this.row(MEM.fact,'Now');row.classList.add('hold','new');
  this.list.insertBefore(row,this.list.firstChild);
  row.animate([{height:'0px',opacity:0},{height:'30px',opacity:1}],{duration:D(480),delay:D(160),easing:EO,fill:'backwards'});
  var mt=row.querySelector('.mt');
  await this.flyChip(mk.getBoundingClientRect(),function(){
    var r=loc(mt.getBoundingClientRect(),self.root);
    return {x:r.x-22,y:r.y,h:r.h};
  },{dur:980,arc:46,s0:.92,s1:.96,fadeIn:true,fadeOut:true});
  if(!alive())return;
  row.classList.remove('hold');pulse(row,'flash');
  this.modo.set(String(MEM.saved.length+1));pulse(this.root.querySelector('.mpn'),'bump');
  this.stage='saved';
  await sleep(1500);if(!alive())return;
  this.openPop(false);this.btn.classList.remove('glow');
  swap();st.classList.add('done');
  await sleep(500);if(!alive())return;

  this.stage='answer';
  var ok=await stream(this.tin,MEM.ans1,{per:28,alive:alive});if(!ok)return;
  this.stage='done1';
};
memory.fresh=async function(){
  if(this.stage!=='done1')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='clear';this.openPop(false);
  var items=[].slice.call(this.tin.children).reverse();
  items.forEach(function(it,i){
    it.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-16px)'}],
      {duration:D(380),delay:D(i*45),easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  });
  this.setTitle('New chat',true);
  await sleep(380+items.length*45+80);if(!alive())return;
  this.tin.innerHTML='';
  await sleep(420);if(!alive())return;
  this.stage='typing';
  await this.type(MEM.prompt2,g);if(!alive())return;
  this.stage='typed';
};
memory.run2=async function(){
  if(this.stage!=='typed')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send2';
  this.post(MEM.prompt2);
  this.setTitle('Dinner for my parents',true);
  await sleep(760);if(!alive())return;
  var chip=h('span','chip',ICON_MEM+'<span>'+MEM.fact+'</span>');chip.style.visibility='hidden';
  this.chip=chip;
  var ok=await stream(this.tin,MEM.ans2,{per:32,alive:alive,pre:chip,start:async function(){
    self.stage='recall';
    self.btn.classList.add('glow');pulse(self.btn,'pop');
    await sleep(380);if(!alive())return;
    await self.flyChip(self.btn.getBoundingClientRect(),function(){return loc(chip.getBoundingClientRect(),self.root)},
      {dur:900,arc:-28,s0:.5,s1:1,fadeIn:true,fadeOut:false});
    if(!alive())return;
    chip.style.visibility='';pulse(chip,'pop');
    self.btn.classList.remove('glow');
    self.stage='recalled';
    await sleep(420);
  }});
  if(!ok)return;
  this.stage='done';
};
memory.tip=function(chip){
  var root=this.root,old=root.querySelector('.tip');
  if(old){old.classList.remove('on');setTimeout(function(){old.remove()},D(200));chip.classList.remove('pressed');if(old.anchor===chip)return}
  var t=h('div','tip','Saved on Tuesday, in <b>Quick lunch</b>');t.anchor=chip;
  root.appendChild(t);
  var r=loc(chip.getBoundingClientRect(),root),W=root.clientWidth;
  var x=clamp(r.x+r.w/2-t.offsetWidth/2,10,W-10-t.offsetWidth);
  t.style.left=x+'px';t.style.top=(r.y-t.offsetHeight-9)+'px';
  t.style.setProperty('--ax',(r.x+r.w/2-x)+'px');
  void t.offsetWidth;t.classList.add('on');
};
memory.send.addEventListener('click',function(){
  if(memory.stage==='idle')memory.run1();else if(memory.stage==='typed')memory.run2();
});
memory.newBtn.addEventListener('click',function(){memory.fresh()});
memory.btn.addEventListener('click',function(){
  if(['idle','done1','done','typed'].indexOf(memory.stage)>=0)memory.openPop(!memory.open);
});
memory.tin.addEventListener('click',function(e){
  var c=e.target.closest('.ans .chip');if(c)memory.tip(c);
});

/* ═════════ 03 · источники ═════════ */
var SRC={
  hist:['My phone is at 12% and I’m about to go to bed.','Plug it in, then. Anything worrying you?'],
  prompt:'Is it bad to leave it charging all night?',
  answer:['Mostly no. It stops at 100% and only tops up as the charge drifts down. {1}',
          'Heat does the real damage, so keep it off the pillow while it charges. {2}',
          'Optimized charging holds it at 80% until just before your alarm. {3}',
          'Past that, every battery fades a little with age, whatever you do. {4}']
};
(function(){
  var slow0=[
    {d:'dealsdaily.shop',t:'Fast chargers, 40% off today only',tag:'Ad'},
    {d:'chargeguide.org',t:'Can a phone overcharge? What happens at 100%',keep:1},
    {d:'gadgetforum.net',t:'charged overnight and now my phone is dead??',tag:'Forum'},
    {d:'techtips.blog',t:'Never charge your phone overnight',tag:'2013'}
  ];
  var doms=['northpixel.com','thecircuit.blog','voltnotes.org','pocketgear.net','lumenreview.com','everydaytech.io',
    'gridandgadget.com','smallscreens.net','quietcharge.org','techunpacked.co','ampere.guide','kilnlabs.dev',
    'mobileweekly.news','handheld.fyi','signalandnoise.io','brightbyte.co','cellsense.net','dailydevice.com',
    'plugged.guide','wattwise.org','screenside.com','lowbattery.blog'];
  var titles=['Is overnight charging safe? Experts weigh in','Phone battery tips for 2026','Why your phone gets warm on the charger',
    'Wireless or cable: which is kinder to batteries','How to check your battery health','Should you ever let it hit 0%?',
    'Charging habits that actually matter','Fast charging, explained simply','What trickle charging really does',
    'Battery myths, debunked','Leaving phones plugged in: a guide','The 80% rule, explained','Can a cheap cable hurt your battery?',
    'How long do phone batteries really last','Charging in the car: yes or no','Battery health at 89%. Is that normal?',
    'Why phones sometimes pause at 80%','Does airplane mode charge faster?','What a battery swap costs now',
    'Five settings that save battery','Cold weather and your phone','Overnight charging and fire risk'];
  var fast=[];
  for(var i=0;i<22;i++)fast.push({d:doms[i],t:titles[i]});
  fast[3]={d:'voltwise.io',t:'Heat, not time, is what ages a battery',keep:2};
  fast[14]={d:'devicehelp.net',t:'About optimized battery charging',keep:3};
  var slow1=[
    {d:'thecircuit.blog',t:'Is overnight charging safe? (repost)',tag:'Duplicate'},
    {d:'batterylab.org',t:'How lithium-ion capacity fades over the years',keep:4},
    {d:'wiredreview.com',t:'The truth about charging overnight',tag:'Paywall'},
    {d:'phonecare.tips',t:'Unplug at 100% or your battery will swell',tag:'Myth'},
    {d:'cellsense.net',t:'Battery care for older phones'}
  ];
  SRC.cards=slow0.concat(fast,slow1);
})();
/* сколько держится карточка: медленно в начале, потом разгон, в конце снова медленно */
function dwell(i,n){
  if(i<4)return [720,760,660,640][i];
  var e=n-5;
  if(i<10)return Math.round(mix(460,110,eio((i-4)/6)));
  if(i<e)return 100;
  return [150,700,560,560,380][i-e];
}
var sources=new Chat('sources');
sources.init=function(){
  this.gen++;this.stage='idle';this.i=0;this.read=0;this.keptN=0;this.srch=null;this.clean();
  this.tin.innerHTML='';seed(this.tin,SRC.hist);
  this.setComposer(SRC.prompt);
};
sources.card=function(c){
  var el=h('div','scard','<span class="fav"></span><span class="sm"><span class="sd"></span><span class="st"></span></span>'+
    '<span class="tag"></span><span class="ok">'+ICON_OK+'</span>');
  el.querySelector('.fav').textContent=c.d[0].toUpperCase();
  el.querySelector('.sd').textContent=c.d;el.querySelector('.st').textContent=c.t;
  el.querySelector('.tag').textContent=c.tag||'';
  if(!c.tag)el.querySelector('.tag').remove();
  el.data=c;return el;
};
function slot(k){return 'translateY('+(k*7)+'px) scale('+(1-k*.05)+')'}
sources.layout=function(ms){
  this.cards.forEach(function(el,k){
    el.style.transitionDuration=D(ms)/1000+'s, '+D(Math.min(ms,250))/1000+'s, .25s';
    el.style.transform=slot(k);el.style.opacity=k<3?(k?1-k*.18:1):0;el.style.zIndex=10-k;
  });
};
sources.run=async function(){
  if(this.stage!=='idle')return;
  var g=this.gen,self=this,alive=function(){return g===self.gen};
  this.stage='send';
  this.post(SRC.prompt);
  await sleep(700);if(!alive())return;

  var s=h('div','item srch',
    '<div class="shead">'+ICON_GLOBE+'<span class="slbl"><span class="l1 shim">Reading</span><span class="l2">Read</span></span>'+
    '<span class="scount"><span class="dg"></span><span class="pw">pages</span></span></div>'+
    '<div class="sdeck"></div>'+
    '<div class="kept"><div class="kfavs"></div><span class="klbl"><span class="dg"></span><span class="kw">sources</span></span></div>');
  this.tin.appendChild(s);this.srch=s;
  var deck=s.querySelector('.sdeck'),pages=new Odo(s.querySelector('.scount .dg')),pw=s.querySelector('.pw');
  this.kfavs=s.querySelector('.kfavs');this.kept=s.querySelector('.kept');
  this.kodo=new Odo(s.querySelector('.klbl .dg'));this.kw=s.querySelector('.kw');
  pages.set('0');
  var swap=statusLabel(s.querySelector('.slbl'));
  var C=SRC.cards,n=C.length;
  this.cards=[];
  for(var k=0;k<4;k++){var el=this.card(C[k]);deck.appendChild(el);this.cards.push(el)}
  this.layout(0);
  enter(s,480);
  this.stage='reading';
  await sleep(640);if(!alive())return;

  for(var i=0;i<n;i++){
    var top=this.cards[0],c=C[i],dw=dwell(i,n);
    this.i=i;this.read=i+1;
    s.classList.toggle('fast',dw<200);
    pages.set(String(i+1));pw.textContent=i?'pages':'page';
    if(c.tag){
      await sleep(dw*.35);if(!alive())return;
      top.classList.add('tagged');this.tagged=c.tag;
      await sleep(dw*.65+140);if(!alive())return;
    }else if(c.keep){
      await sleep(Math.max(dw*.4,160));if(!alive())return;
      top.classList.add('keep');
      await sleep(dw<200?300:440);if(!alive())return;
      this.keep(top,c,g);
    }else{
      await sleep(dw);if(!alive())return;
    }
    // последняя карточка не смахивается: она уйдёт вместе с колодой
    if(i===n-1&&!c.keep)break;
    // отложенная карточка смахивается вверх, следующая поднимается из стопки
    if(!c.keep){
      var fd=clamp(dw*2.2,240,420);
      top.style.transition='none';
      top.animate([{transform:slot(0),opacity:1},{transform:'translate(-6px,-18px) rotate(-2.5deg) scale(.97)',opacity:0}],
        {duration:D(fd),easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'});
      (function(t){setTimeout(function(){t.remove()},D(fd)+20)})(top);
    }
    this.cards.shift();
    if(C[i+4]){var nx=this.card(C[i+4]);nx.style.transform=slot(3);nx.style.opacity=0;deck.appendChild(nx);this.cards.push(nx)}
    this.layout(dw<200?240:420);
  }
  s.classList.remove('fast');
  await sleep(160);if(!alive())return;

  // колода схлопывается, остаются заголовок и четыре значка
  this.stage='fold';
  deck.style.transition='height '+D(560)/1000+'s '+EO+',margin '+D(560)/1000+'s '+EO+',opacity '+D(260)/1000+'s ease';
  this.cards.forEach(function(el){el.style.transform='translateY(-6px) scale(.97)'});
  deck.style.overflow='hidden';deck.style.opacity='0';deck.style.height='0px';deck.style.marginTop='0px';
  swap();s.classList.add('done');
  await sleep(760);if(!alive())return;
  deck.innerHTML='';

  this.stage='answer';
  var ok=await stream(this.tin,SRC.answer,{per:30,alive:alive,cite:function(ch,num){self.cite(ch,num,g)}});
  if(!ok)return;
  this.stage='done';
};
/* от отобранной карточки отрывается её значок и дугой встаёт в ряд источников, сама карточка тает */
sources.keep=function(card,c,g){
  var root=this.root,self=this;
  var fav=h('span','fav');fav.textContent=c.d[0].toUpperCase();fav.style.visibility='hidden';fav.data=c;
  this.kfavs.appendChild(fav);this.kept.classList.add('on');
  var cf=card.querySelector('.fav'),A=loc(cf.getBoundingClientRect(),root);
  var f=h('span','fav kfly');f.textContent=fav.textContent;
  f.style.cssText='position:absolute;left:0;top:0;z-index:40;margin:0;box-shadow:var(--lift),inset 0 0 0 1px var(--line)';
  root.appendChild(f);cf.style.visibility='hidden';
  card.style.transition='none';
  card.animate([{transform:slot(0),opacity:1},{transform:'translateY(10px) scale(.94)',opacity:0}],
    {duration:D(360),easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
  setTimeout(function(){card.remove()},D(380));
  tween(680,function(p){
    var B=loc(fav.getBoundingClientRect(),root),e=eio(p);
    var x=mix(A.x,B.x,e),y=mix(A.y,B.y,e)-Math.sin(Math.PI*e)*22;
    var s=1+Math.sin(Math.PI*e)*.18;
    f.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+s.toFixed(3)+')';
    f.style.borderRadius=mix(6,11,e)+'px';
  }).then(function(){
    f.remove();if(g!==self.gen)return;
    fav.style.visibility='';pulse(fav,'pop');
    self.keptN++;self.kodo.set(String(self.keptN));self.kept.classList.add('has');self.kw.textContent=self.keptN>1?'sources':'source';
  });
};
/* сноска вылетает из своего значка и встаёт в текст */
sources.cite=function(ch,num,g){
  var root=this.root,self=this,fav=this.kfavs.children[num-1];
  if(!fav)return;
  ch.style.visibility='hidden';
  var f=h('span','cite cfly');f.textContent=num;root.appendChild(f);
  var fw=f.offsetWidth,fh=f.offsetHeight;
  fav.classList.add('lift');
  tween(620,function(p){
    var A=loc(fav.getBoundingClientRect(),root),B=loc(ch.getBoundingClientRect(),root),e=eio(p);
    var x=mix(A.x+A.w/2,B.x+B.w/2,e),y=mix(A.y+A.h/2,B.y+B.h/2,e)-Math.sin(Math.PI*e)*18;
    var s=mix(1.25,1,e);
    f.style.transform='translate('+(x-fw/2)+'px,'+(y-fh/2)+'px) scale('+s+')';
    f.style.opacity=clamp(p*4,0,1);
  }).then(function(){
    f.remove();fav.classList.remove('lift');if(g!==self.gen)return;
    ch.style.visibility='';pulse(ch,'pop');
  });
};
sources.peek=function(ch){
  var root=this.root,old=root.querySelector('.peek');
  [].forEach.call(this.kfavs?this.kfavs.children:[],function(f){f.classList.remove('lift')});
  [].forEach.call(root.querySelectorAll('.cite.act'),function(c){c.classList.remove('act')});
  if(old){old.classList.remove('on');setTimeout(function(){old.remove()},D(220));if(old.anchor===ch)return}
  var num=+ch.dataset.n,fav=this.kfavs.children[num-1];if(!fav)return;
  var p=this.card(fav.data);p.classList.add('peek');p.anchor=ch;p.querySelector('.ok').remove();
  root.appendChild(p);
  var r=loc(ch.getBoundingClientRect(),root),W=root.clientWidth;
  var x=clamp(r.x+r.w/2-p.offsetWidth/2,10,W-10-p.offsetWidth);
  p.style.left=x+'px';p.style.top=(r.y-p.offsetHeight-8)+'px';
  ch.classList.add('act');fav.classList.add('lift');
  void p.offsetWidth;p.classList.add('on');
};
sources.send.addEventListener('click',function(){if(sources.stage==='idle')sources.run()});
sources.tin.addEventListener('click',function(e){
  var c=e.target.closest('.cite');if(c&&sources.stage==='done')sources.peek(c);
});

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
/* курсор прилипает к цели, пока камера едет */
function cursorStick(el){
  var r=el.getBoundingClientRect();cur.x=r.left+r.width*.55;cur.y=r.top+r.height*.6;
  cur.el.style.transform='translate('+cur.x+'px,'+cur.y+'px)';
}
async function tap(el){
  cur.el.animate([{scale:1},{scale:.82},{scale:1}],{duration:D(240),easing:'ease-out'});
  el.classList.add('pressed');
  await sleep(110);el.click();
  await sleep(120);el.classList.remove('pressed');
}
function cursorOff(){cur.el.classList.remove('on')}

var auto={id:0,running:false,solo:0};
var tools=document.getElementById('tools');

var SEG={};
SEG[1]=async function(W,U){
  frame(voice.root,1.2,.8);
  say('Hands covered in flour, so you tap the mic.');
  await W(1500);
  await cursorTo(voice.mic,760);await W(150);
  await tap(voice.mic);
  await W(260);cursorOff();
  frame(voice.composer,1.5,.6);
  await W(700);
  say('Every word leaves its own little cluster of bars.');
  await U(function(){return voice.stage==='heard'});
  await W(450);
  await cursorTo(voice.send,620);await W(140);
  say('Tap done.');
  await tap(voice.send);
  await W(160);cursorOff();
  await W(340);
  say('Each cluster turns into the word it was.');
  await U(function(){return voice.stage==='punct'});
  say('Punctuation goes in last. You never said any.');
  await U(function(){return voice.stage==='ready'});
  await W(1500);
  frame(voice.root,1.2,.8);
  await W(300);
  await cursorTo(voice.send,700);await W(140);
  await tap(voice.send);
  say('');
  await W(300);cursorOff();
  await U(function(){return voice.stage==='done'});
  await W(1400);
};
SEG[2]=async function(W,U){
  frame(memory.root,1.2,.8);
  say('You mention something in passing.');
  await W(1400);
  await cursorTo(memory.send,760);await W(150);
  await tap(memory.send);
  await W(260);cursorOff();
  await U(function(){return memory.stage==='mark'});
  frame(memory.bub,1.4,.6);
  say('It keeps what will still be true next week.');
  await U(function(){return memory.stage==='letgo'});
  say('The fifteen minutes, it lets go.');
  await W(420);
  frame(memory.root,1.2,.8);
  await U(function(){return memory.stage==='lift'});
  say('Into memory, where you can always see it.');
  await U(function(){return memory.stage==='answer'});
  await W(400);say('');
  await U(function(){return memory.stage==='done1'});
  await W(1100);
  say('Days later, a new chat.');
  await cursorTo(memory.newBtn,760);await W(150);
  await tap(memory.newBtn);
  await W(200);cursorOff();
  await U(function(){return memory.stage==='typed'});
  await W(260);
  await cursorTo(memory.send,640);await W(140);
  await tap(memory.send);
  await W(200);cursorOff();
  await U(function(){return memory.stage==='recall'});
  say('You never had to say it twice.');
  await U(function(){return memory.stage==='done'});
  await W(700);
  say('Tap it to see where it came from.');
  await W(500);
  await cursorTo(memory.chip,760);await W(150);
  await tap(memory.chip);
  frame(memory.chip.closest('.ans'),1.35,.7);
  await W(2800);
  await tap(memory.chip);
  frame(memory.root,1.2,.8);
  await W(500);cursorOff();
  await W(800);
};
SEG[3]=async function(W,U){
  frame(sources.root,1.2,.8);
  say('A question with plenty of bad answers online.');
  await W(1400);
  await cursorTo(sources.send,760);await W(150);
  await tap(sources.send);
  await W(260);cursorOff();
  await U(function(){return sources.stage==='reading'});
  frame(sources.srch,1.4,.6);
  say('It starts reading.');
  await U(function(){return sources.tagged==='2013'});
  say('An ad, a forum panic, advice from 2013.');
  await U(function(){return sources.i>=8});
  say('Then it picks up speed.');
  await U(function(){return sources.i>=SRC.cards.length-4});
  say('A few more careful looks at the end.');
  await U(function(){return sources.stage==='fold'});
  say(sources.read+' pages read, '+sources.keptN+' worth keeping.');
  await W(900);
  frame(sources.root,1.2,.8);
  await U(function(){return sources.stage==='answer'});
  await W(900);
  say('Every claim points back to one of them.');
  await U(function(){return sources.stage==='done'});
  await W(700);
  say('Each number opens the page behind it.');
  var c2=sources.tin.querySelectorAll('.cite')[1];
  await W(400);
  await cursorTo(c2,760);await W(150);
  await tap(c2);
  frame(c2.closest('.ans'),1.35,.7);
  await W(3000);
  await tap(c2);
  frame(sources.root,1.2,.8);
  await W(500);cursorOff();
  await W(900);
};

async function play(){
  var g=++auto.id,alive=function(){return g===auto.id};
  var W=function(ms){return sleep(ms).then(function(){if(!alive())throw 0})};
  var U=function(fn){return until(fn,g,auto).then(function(){if(!alive())throw 0})};
  auto.running=true;tools.classList.add('hide');
  try{
    say('');deckEl.classList.add('fade');await W(380);
    initAll();
    var list=auto.solo?[auto.solo]:[1,2,3];
    if(!auto.solo){
      overview();deckEl.classList.remove('fade');
      say('Three small moments from a chat app.');
      await W(2200);
    }else{
      frame(document.querySelector('.tile[data-n="'+auto.solo+'"] .chat'),1.2,.8);
      deckEl.classList.remove('fade');await W(700);
    }
    for(var i=0;i<list.length;i++)await SEG[list[i]](W,U);
    if(!auto.solo){
      overview();
      say('Heard '+voice.heard+' words, remembered one thing, kept '+sources.keptN+' of '+sources.read+' pages.');
      await W(4200);
    }
    if(!reduce)play();
  }catch(e){if(e!==0)throw e}
}
function stopAuto(){auto.id++;auto.running=false;cursorOff();if(!auto.solo)overview();say('');tools.classList.remove('hide')}

/* ─────────── запуск и низ ─────────── */
function initAll(){voice.init();memory.init();sources.init()}
initAll();
document.addEventListener('pointerdown',function(e){
  if(e.isTrusted&&auto.running&&!e.target.closest('#tools'))stopAuto();
},true);
document.getElementById('play').addEventListener('click',function(){play()});
document.getElementById('reset').addEventListener('click',function(){stopAuto();initAll()});

var soloBtns=document.querySelectorAll('#solo button');
function setSolo(n,go){
  auto.solo=n;deckEl.dataset.solo=n;
  soloBtns.forEach(function(b){b.classList.toggle('on',+b.dataset.solo===n)});
  try{history.replaceState(null,'',n?'#'+n:location.pathname)}catch(e){}
  if(go)play();
}
soloBtns.forEach(function(b){b.addEventListener('click',function(){setSolo(+b.dataset.solo,true)})});
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(/^[0-3]$/.test(e.key))setSolo(+e.key,true);
  else if(e.key==='r'||e.key==='R')play();
});
var themeBtns=document.querySelectorAll('#theme button');
function markTheme(t){themeBtns.forEach(function(x){x.classList.toggle('on',x.dataset.theme===t)})}
markTheme(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
themeBtns.forEach(function(b){
  b.addEventListener('click',function(){markTheme(b.dataset.theme);document.documentElement.setAttribute('data-theme',b.dataset.theme)});
});
var hs=+(location.hash||'').replace('#','');
if(hs>=1&&hs<=3)setSolo(hs,false);
// при reduced motion сценарий не крутится сам, только по Replay
if(!reduce)setTimeout(play,500);
