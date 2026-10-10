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
      slot.firstChild.style.transform='translateY('+(-text[i]*1)+'em)';
    }else if(slot){slot.textContent=text[i]}
  }
};
Odo.prototype.build=function(text){
  this.el.innerHTML='';
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(/\d/.test(ch)){
      var s=document.createElement('span');s.className='dig';
      var u=document.createElement('u');
      for(var k=0;k<10;k++){var b=document.createElement('b');b.textContent=k;u.appendChild(b)}
      u.style.transform='translateY('+(-ch*1)+'em)';
      s.appendChild(u);this.el.appendChild(s);
    }else{
      var t=document.createElement('span');t.textContent=ch;this.el.appendChild(t);
    }
  }
};

/* ─────────── состояние ─────────── */
var FIXED={sys:2.4,tools:1.8,mem:1.1};
var FIXED_SUM=FIXED.sys+FIXED.tools+FIXED.mem;
var START={ctx:13.46,h5:6,wk:25};
var S={ctx:START.ctx,h5:START.h5,wk:START.wk};

var el={
  send:document.getElementById('send'),
  pbody:document.getElementById('pbody'),
  psize:document.getElementById('psize'),
  segChat:document.getElementById('segChat'),
  ctxRow:document.getElementById('ctxRow'),
  h5Row:document.getElementById('h5Row'),
  wkRow:document.getElementById('wkRow'),
  h5Fill:document.getElementById('h5Fill'),
  wkFill:document.getElementById('wkFill')
};
var odo={
  ctx:new Odo(document.getElementById('ctxNum')),
  pct:new Odo(document.getElementById('ctxPct')),
  h5:new Odo(document.getElementById('h5Num')),
  wk:new Odo(document.getElementById('wkNum'))
};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var busy=false,locked=false,nextSize=0;

document.querySelector('.seg--sys').style.width=FIXED.sys+'%';
document.querySelector('.seg--tools').style.width=FIXED.tools+'%';
document.querySelector('.seg--mem').style.width=FIXED.mem+'%';

function fmtK(pct){
  var k=pct*10;
  return k>=1000?'1.00M':(k<100?k.toFixed(1):k.toFixed(1))+'k';
}
function shake(node){node.classList.remove('shake');void node.offsetWidth;node.classList.add('shake')}
function bump(node){node.classList.remove('bump');void node.offsetWidth;node.classList.add('bump')}
function grow(node){
  node.classList.add('growing');
  setTimeout(function(){node.classList.remove('growing')},640);
}

function paint(animate){
  var chat=Math.max(0,Math.min(100-FIXED_SUM,S.ctx-FIXED_SUM));
  el.segChat.style.width=chat+'%';
  el.h5Fill.style.width=Math.min(100,S.h5)+'%';
  el.wkFill.style.width=Math.min(100,S.wk)+'%';
  odo.ctx.set(fmtK(S.ctx));
  odo.pct.set(String(Math.round(S.ctx)));
  odo.h5.set(String(Math.round(S.h5)));
  odo.wk.set(String(Math.round(S.wk)));
  el.ctxRow.classList.toggle('hot',S.ctx>=86);
  el.h5Row.classList.toggle('hot',S.h5>=86);
  el.wkRow.classList.toggle('hot',S.wk>=86);
  if(animate){grow(el.segChat);grow(el.h5Fill);grow(el.wkFill)}
}

/* ─────────── содержимое запроса ─────────── */
function fillPrompt(animateIn){
  el.pbody.innerHTML='';
  var n=4+Math.floor(Math.random()*3),ws=[];
  for(var i=0;i<n;i++)ws.push(52+Math.random()*48);
  ws[n-1]=28+Math.random()*30;
  ws.forEach(function(w,i){
    var l=document.createElement('span');
    l.className='pline';l.style.width=w+'%';
    if(animateIn&&!reduce){
      l.style.transform='scaleX(.02)';l.style.opacity='0';
      setTimeout(function(){
        l.style.transition='transform .34s cubic-bezier(.16,1,.3,1) ,opacity .2s ease';
        l.style.transform='scaleX(1)';l.style.opacity='1';
      },40+i*42);
    }
    el.pbody.appendChild(l);
  });
  nextSize=38+Math.random()*54;
  el.psize.textContent=nextSize.toFixed(1)+'k tokens';
}

function collapsePrompt(){
  var lines=el.pbody.querySelectorAll('.pline');
  lines.forEach(function(l,i){
    setTimeout(function(){
      l.style.transition='transform .26s cubic-bezier(.4,0,.2,1),opacity .26s ease';
      l.style.transform='scaleX(.02)';l.style.opacity='0';
    },i*38);
  });
}

/* ─────────── полёт пакета ─────────── */
function flyPacket(done){
  var from=el.pbody.getBoundingClientRect();
  var to=el.segChat.getBoundingClientRect();
  var track=el.segChat.parentNode.getBoundingClientRect();
  var x0=from.left+from.width/2,y0=from.top+from.height/2;
  var x1=(to.width>1?to.right:track.left)+2,y1=track.top+track.height/2;
  var p=document.createElement('div');
  p.className='pkg';
  p.style.width='120px';p.style.height='12px';
  p.style.left=(x0-60)+'px';p.style.top=(y0-6)+'px';
  document.body.appendChild(p);
  var dx=x1-x0,dy=y1-y0;
  if(reduce){p.remove();done();return}
  showDelta(x1,y1);
  var a=p.animate([
    {transform:'translate(0,0) scaleX(1) scaleY(1)',opacity:.9,borderRadius:'6px'},
    {transform:'translate('+(dx*.32)+'px,'+(dy*.26-16)+'px) scaleX(.5) scaleY(.92)',opacity:1,offset:.4},
    {transform:'translate('+dx+'px,'+dy+'px) scaleX(.05) scaleY(.6)',opacity:1,borderRadius:'3px'}
  ],{duration:440,easing:'cubic-bezier(.55,0,.2,1)',fill:'forwards'});
  a.onfinish=function(){
    p.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'});
    setTimeout(function(){p.remove()},140);
    done();
  };
}

function showDelta(x,y){
  var d=document.createElement('div');
  d.className='delta';d.textContent='+'+nextSize.toFixed(1)+'k';
  var tr=el.segChat.parentNode.getBoundingClientRect();
  d.style.left=Math.min(x-16,tr.right-58)+'px';d.style.top=(y+5)+'px';
  document.body.appendChild(d);
  if(reduce){setTimeout(function(){d.remove()},400);return}
  d.animate([
    {opacity:0,transform:'translateY(5px) scale(.9)'},
    {opacity:1,transform:'translateY(0) scale(1)',offset:.22},
    {opacity:1,transform:'translateY(-3px) scale(1)',offset:.62},
    {opacity:0,transform:'translateY(-13px) scale(.96)'}
  ],{duration:1050,easing:'cubic-bezier(.2,.75,.2,1)',delay:300,fill:'forwards'})
   .onfinish=function(){d.remove()};
}

/* ─────────── сценарий отправки ─────────── */
function send(){
  if(locked){shake(el.h5Row);return}
  if(busy)return;busy=true;
  var size=nextSize;
  el.send.classList.add('sending');
  el.send.setAttribute('disabled','');
  collapsePrompt();

  setTimeout(function(){
    flyPacket(function(){
      S.ctx=Math.min(99.4,S.ctx+size/10);
      S.h5=Math.min(100,S.h5+size*0.155);
      S.wk=Math.min(100,S.wk+size*0.055);

      var chat=Math.max(0,Math.min(100-FIXED_SUM,S.ctx-FIXED_SUM));
      el.segChat.style.width=chat+'%';grow(el.segChat);
      odo.ctx.set(fmtK(S.ctx));odo.pct.set(String(Math.round(S.ctx)));
      bump(document.getElementById('ctxPct'));
      el.ctxRow.classList.toggle('hot',S.ctx>=86);

      setTimeout(function(){
        el.h5Fill.style.width=Math.min(100,S.h5)+'%';grow(el.h5Fill);
        odo.h5.set(String(Math.round(S.h5)));
        bump(document.getElementById('h5Num'));
        el.h5Row.classList.toggle('hot',S.h5>=86);
        if(S.h5>=99.5){locked=true;el.send.classList.add('locked');el.send.setAttribute('disabled','')}
      },110);

      setTimeout(function(){
        el.wkFill.style.width=Math.min(100,S.wk)+'%';grow(el.wkFill);
        odo.wk.set(String(Math.round(S.wk)));
        bump(document.getElementById('wkNum'));
        el.wkRow.classList.toggle('hot',S.wk>=86);
      },200);
    });
  },reduce?0:170);

  setTimeout(function(){
    el.send.classList.remove('sending');
    el.send.classList.add('done');
  },reduce?60:620);

  setTimeout(function(){
    el.send.classList.remove('done');
    if(!locked)el.send.removeAttribute('disabled');
    fillPrompt(true);
    busy=false;
  },reduce?120:1050);
}

el.send.addEventListener('click',send);
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();send()}
});

document.getElementById('reset').addEventListener('click',function(){
  S.ctx=START.ctx;S.h5=START.h5;S.wk=START.wk;
  locked=false;el.send.classList.remove('locked');el.send.removeAttribute('disabled');
  paint(true);
});

var ctl=document.querySelector('.seg-ctl');
ctl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  ctl.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');
  document.documentElement.setAttribute('data-theme',b.dataset.theme);
});

fillPrompt(false);
paint(false);
