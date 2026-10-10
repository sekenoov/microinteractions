/* ─ утилиты ───────────────────────────────────────────────── */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;
  var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296}}
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function pop(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')}
function flash(el){el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}

/* ─ базовая карточка ──────────────────────────────────────── */
function Card(root,opts){
  this.root=root;
  this.btn=root.querySelector('.morph');
  this.fill=root.querySelector('.fill');
  this.arc=root.querySelector('.arc');
  this.status=root.querySelector('.status');
  this.dur=opts.dur;this.o=opts;
  for(var k in opts){if(typeof opts[k]==='function')this[k]=opts[k]}
  this.state='idle';this.p=0;this.raf=0;this.runId=0;
  this.seed=(Math.random()*1e5)|0;
  var self=this;
  this.btn.addEventListener('click',function(){self.toggle()});
  this.init();
  this.setStatus('готов');
}
Card.prototype.setStatus=function(html,hot){
  this.status.innerHTML=html;this.status.classList.toggle('hot',!!hot);
};
Card.prototype.toggle=function(){this.state==='gen'?this.stop():this.start()};
Card.prototype.start=function(){
  var self=this,id=++this.runId;
  cancelAnimationFrame(this.raf);
  var wasEmpty=(this.state==='idle');
  /* состояние переключается сразу: «Стоп» доступен даже пока уходит старое */
  this.state='gen';this.btn.dataset.state='gen';pop(this.btn);
  this.root.classList.add('busy');
  this.fill.style.opacity=1;this.p=0;this.paintProgress(0);
  this.setStatus('генерация · <b>0%</b>',true);
  var go=function(){
    if(id!==self.runId)return;
    self.seed=(Math.random()*1e5)|0;
    self.prepare(self.seed);
    var t0=performance.now(),d=reduce?200:self.dur;
    var tick=function(now){
      if(id!==self.runId)return;
      var p=Math.min(1,(now-t0)/d);
      self.p=p;self.paint(p);
      if(p<1)self.raf=requestAnimationFrame(tick);else self.finish(d);
    };
    self.raf=requestAnimationFrame(tick);
  };
  wasEmpty?go():this.clear(go);
};
Card.prototype.paintProgress=function(p){
  this.fill.style.transform='scaleX('+p+')';
  if(this.arc)this.arc.style.strokeDashoffset=(1-p)*38;
};
Card.prototype.paint=function(p){
  this.paintProgress(p);
  this.render(p);
  this.setStatus('генерация · <b>'+Math.round(p*100)+'%</b>',true);
};
Card.prototype.finish=function(d){
  this.state='regen';this.btn.dataset.state='regen';pop(this.btn);
  this.root.classList.remove('busy');flash(this.root);
  this.fill.style.opacity=0;
  this.done();
  this.setStatus('готово · <b>'+(d/1000).toFixed(1)+' с</b>');
};
Card.prototype.stop=function(){
  this.runId++;cancelAnimationFrame(this.raf);
  this.state='regen';this.btn.dataset.state='regen';pop(this.btn);
  this.root.classList.remove('busy');
  this.fill.style.opacity=0;
  this.abort(this.p);
  this.setStatus('прервано на <b>'+Math.round(this.p*100)+'%</b>',true);
};

/* ─ 01 · текст ────────────────────────────────────────────── */
var TEXTS=[
 'Кнопка не исчезает и не появляется заново. Она едет: ширина, иконка и подпись меняются одним движением, взгляд не теряет объект.',
 'Прерывание это состояние, а не отмена анимации. Каретка становится срезом, прогресс замирает там, где его застали.',
 'Перегенерация начинается с ухода. Старый текст размывается по словам, новый приходит раньше, чем успевает появиться пустота.',
 'Скорость решает. Слово встаёт на место за 160 миллисекунд, вся реплика собирается быстрее, чем палец уходит с кнопки.'
];
var tIdx=0;
var textCard={
  dur:1500,
  init:function(){
    this.stream=this.root.querySelector('.stream');
    this.caret=this.root.querySelector('.caret');
    this.words=[];this.shown=0;
  },
  prepare:function(){
    this.words=TEXTS[tIdx++%TEXTS.length].split(' ');
    this.stream.classList.remove('clearing');
    this.stream.innerHTML='';
    this.stream.appendChild(this.caret);
    this.spans=[];this.shown=0;
    this.caret.className='caret on';
  },
  render:function(p){
    var need=Math.round(p*this.words.length);
    while(this.shown<need){
      var s=document.createElement('span');
      s.className='w';s.textContent=this.words[this.shown]+' ';
      this.stream.insertBefore(s,this.caret);
      this.spans.push(s);this.shown++;
    }
  },
  done:function(){this.render(1);this.caret.className='caret'},
  abort:function(){this.caret.className='caret cut'},
  clear:function(cb){
    var self=this;
    this.caret.className='caret';
    this.stream.classList.add('clearing');
    (this.spans||[]).forEach(function(s,i){s.style.transitionDelay=(i*7)+'ms'});
    setTimeout(cb,reduce?10:190);
  }
};

/* ─ 02 · изображение ──────────────────────────────────────── */
var PALETTES=[
  {n:'неон',   base:'#0b0416', c:['#ff2d6f','#7b2dff','#00e5ff','#ff9ae0']},
  {n:'закат',  base:'#1a0a12', c:['#ff7a1a','#ff3d5e','#ffd166','#c2185b']},
  {n:'лёд',    base:'#050b16', c:['#6ee7ff','#4f8cff','#c9f0ff','#2b4bff']},
  {n:'мох',    base:'#06120c', c:['#7cd992','#2f8f6b','#d7e86a','#12735a']},
  {n:'пепел',  base:'#0b0b0d', c:['#e8e6e1','#8a8f99','#cfa27a','#4a4f57']}
];
var imgCard={
  dur:1800,
  init:function(){
    this.cv=this.root.querySelector('canvas');
    this.ctx=this.cv.getContext('2d');
    this.cv.width=320;this.cv.height=240;
    this.src=document.createElement('canvas');
    this.src.width=320;this.src.height=240;
    this.tmp=document.createElement('canvas');
    this.noise=this.makeNoise();
    this.model=document.getElementById('imgModel');
    this.pal=0;this.lastP=0;
    this.buildSwatches();
    this.paintTarget(this.seed);this.draw(0);
  },
  buildSwatches:function(){
    var host=document.getElementById('palette'),self=this;
    PALETTES.forEach(function(p,i){
      var b=document.createElement('button');
      b.className='sw'+(i===0?' on':'');
      b.type='button';b.title=p.n;b.setAttribute('aria-label','палитра '+p.n);
      p.c.forEach(function(c){var s=document.createElement('b');s.style.background=c;b.appendChild(s)});
      b.addEventListener('click',function(){
        self.pal=i;
        host.querySelectorAll('.sw').forEach(function(x){x.classList.remove('on')});
        b.classList.add('on');
        self.model.textContent='diffusion · '+p.n;
        self.start();
      });
      host.appendChild(b);
    });
  },
  makeNoise:function(){
    var c=document.createElement('canvas');c.width=c.height=160;
    var x=c.getContext('2d'),d=x.createImageData(160,160),i;
    for(i=0;i<d.data.length;i+=4){var v=(Math.random()*255)|0;
      d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
    x.putImageData(d,0,0);return c;
  },
  paintTarget:function(seed){
    var r=rng(seed),x=this.src.getContext('2d'),W=320,H=240,P=PALETTES[this.pal];
    x.filter='none';
    x.fillStyle=P.base;x.fillRect(0,0,W,H);
    x.filter='blur(24px)';
    for(var i=0;i<8;i++){
      x.globalAlpha=.45+r()*.5;
      x.fillStyle=P.c[(i+Math.floor(r()*P.c.length))%P.c.length];
      x.beginPath();
      x.ellipse(r()*W,r()*H,34+r()*105,32+r()*90,r()*6.28,0,6.28);
      x.fill();
    }
    x.globalAlpha=1;
    x.filter='blur(2px)';
    x.strokeStyle=P.c[2];x.lineWidth=1.6;x.globalAlpha=.4;
    for(var j=0;j<3;j++){
      x.beginPath();x.moveTo(0,r()*H);
      x.bezierCurveTo(r()*W,r()*H,r()*W,r()*H,W,r()*H);x.stroke();
    }
    x.globalAlpha=1;x.filter='none';
  },
  prepare:function(seed){this.paintTarget(seed)},
  draw:function(p){
    var c=this.ctx,W=320,H=240;
    var block=Math.max(1,Math.round(34*Math.pow(1-p,1.9)));
    c.imageSmoothingEnabled=false;
    c.clearRect(0,0,W,H);
    if(block>1){
      var w=Math.max(2,Math.ceil(W/block)),h=Math.max(2,Math.ceil(H/block));
      this.tmp.width=w;this.tmp.height=h;
      var t=this.tmp.getContext('2d');
      t.imageSmoothingEnabled=true;
      t.clearRect(0,0,w,h);t.drawImage(this.src,0,0,w,h);
      c.drawImage(this.tmp,0,0,w,h,0,0,W,H);
    }else{
      c.imageSmoothingEnabled=true;c.drawImage(this.src,0,0);
    }
    var a=Math.pow(1-p,1.3)*.6;
    if(a>.004){
      c.globalAlpha=a;c.globalCompositeOperation='overlay';
      c.imageSmoothingEnabled=false;
      c.drawImage(this.noise,-Math.random()*40,-Math.random()*40,W+80,H+80);
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
    }
  },
  render:function(p){this.lastP=p;this.draw(p)},
  done:function(){this.lastP=1;this.draw(1)},
  abort:function(p){this.lastP=p;this.draw(p)},
  clear:function(cb){
    var self=this,id=this.runId,p0=this.lastP||1,t0=performance.now(),d=reduce?10:150;
    (function back(now){
      if(id!==self.runId)return;
      var k=Math.min(1,(now-t0)/d);
      self.draw(p0*(1-k*k));
      if(k<1)requestAnimationFrame(back);else cb();
    })(performance.now());
  }
};

/* ─ 03 · аудио ────────────────────────────────────────────── */
var KINDS=[
  {n:'бит',     meta:'128 BPM',      bars:36},
  {n:'речь',    meta:'реплика, 9 с', bars:58},
  {n:'эмбиент', meta:'подложка, 30 с',bars:64},
  {n:'дроп',    meta:'билд, 8 с',    bars:46}
];
var kIdx=0;
var audCard={
  dur:1250,
  init:function(){
    this.wave=this.root.querySelector('.wave');
    this.head=this.root.querySelector('.playhead');
    this.model=document.getElementById('audModel');
    this.N=0;this.bars=[];this.build(52);
    this.h=new Array(this.N).fill(.03);
  },
  build:function(n){
    this.wave.innerHTML='';this.bars=[];this.N=n;
    this.wave.classList.toggle('wide',n<44);
    for(var i=0;i<n;i++){
      var b=document.createElement('i');this.wave.appendChild(b);this.bars.push(b);
    }
  },
  gen:function(seed){
    var r=rng(seed),i,t;
    var kind=KINDS[kIdx++%KINDS.length];
    this.model.textContent=kind.n+' · '+kind.meta;
    this.build(kind.bars);
    var N=this.N,h=new Array(N);
    if(kind.n==='бит'){
      var step=3+Math.floor(r()*2);
      for(i=0;i<N;i++){
        var phase=i%step;
        var kick=phase===0?.88+r()*.12:(phase===1?.22+r()*.14:.07+r()*.08);
        if(i%(step*4)===0)kick=1;
        h[i]=kick;
      }
    }else if(kind.n==='речь'){
      var on=false,left=0;
      for(i=0;i<N;i++){
        if(left<=0){on=!on;left=on?3+Math.floor(r()*9):2+Math.floor(r()*4)}
        left--;
        h[i]=on?.3+r()*.7:.03+r()*.03;
      }
    }else if(kind.n==='эмбиент'){
      var a=r()*6.28,b2=r()*6.28;
      for(i=0;i<N;i++){
        t=i/N;
        h[i]=.42+.18*Math.sin(t*5+a)+.1*Math.sin(t*13+b2)+r()*.05;
      }
    }else{
      var brk=Math.floor(N*(.5+r()*.12));
      for(i=0;i<N;i++){
        if(i<brk)h[i]=.06+(i/brk)*.24+r()*.05;
        else h[i]=.72+r()*.28;
      }
      h[brk]=1;h[brk-1]=.05;
    }
    for(i=0;i<N;i++)h[i]=Math.max(.04,Math.min(1,h[i]));
    return h;
  },
  prepare:function(seed){
    this.h=this.gen(seed);
    this.bars.forEach(function(b){
      b.classList.remove('dead','lit');
      b.style.transitionDelay='0ms';b.style.transform='scaleY(.03)';
    });
  },
  render:function(p){
    this.head.style.left=(p*100)+'%';
    var upto=Math.floor(p*this.N);
    for(var i=0;i<upto;i++){
      var b=this.bars[i];
      if(!b.classList.contains('lit')){
        b.classList.add('lit');b.style.transform='scaleY('+this.h[i]+')';
      }
    }
  },
  done:function(){
    var self=this;
    this.bars.forEach(function(b,i){b.classList.add('lit');b.style.transform='scaleY('+self.h[i]+')'});
  },
  abort:function(p){
    for(var i=Math.floor(p*this.N);i<this.N;i++)this.bars[i].classList.add('dead');
  },
  clear:function(cb){
    this.bars.forEach(function(b,i){
      b.style.transitionDelay=(i*2)+'ms';
      b.style.transform='scaleY(.03)';
      b.classList.remove('lit','dead');
    });
    setTimeout(cb,reduce?10:170);
  }
};

/* ─ сборка ────────────────────────────────────────────────── */
var cards=[
  new Card(document.getElementById('c-text'),textCard),
  new Card(document.getElementById('c-img'),imgCard),
  new Card(document.getElementById('c-aud'),audCard)
];
function runAll(){cards.forEach(function(c,i){setTimeout(function(){c.start()},i*90)})}

document.getElementById('runAll').addEventListener('click',runAll);

var loopBtn=document.getElementById('loopBtn'),loopT=0;
loopBtn.addEventListener('click',function(){
  var on=loopBtn.classList.toggle('on');
  clearInterval(loopT);
  if(on){runAll();loopT=setInterval(runAll,3400)}
});
