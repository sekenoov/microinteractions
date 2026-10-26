/* ─────────── Ice Tray ───────────
   Таб-бар сделан из формочки для льда. Активная вкладка замёрзла в своей ячейке кубиком:
   при переключении старый кубик тает в лужицу, в новой ячейке поднимается вода и схватывается инеем.
   Плюс скручивает лоток, и шесть действий выскакивают кубиками в сетку 3 × 2, приземляются со звоном
   и доезжают по инерции, потому что лёд скользкий. Voice каждый раз примерзает: дребезжит в ячейке,
   лоток стукают ещё раз, и он вылетает последним, тяжелее всех, расталкивая соседей.
   Выбор действия или крестик растапливают кубики, капли падают обратно в лоток.
   Два стиля, Glass и Flat, переключаются в шапке круговым проявлением от кнопки.
   Поле 432 × 540 точек. В ?rec играет демо с курсором и пишется журнал звука. */

var QS=new URLSearchParams(location.search);
var REC=QS.has('rec');
if(REC){document.documentElement.classList.add('rec');Sound.rec=true}
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches&&!REC;

function $(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mix(a,b,t){return a+(b-a)*t}
function eio(p){p=clamp(p,0,1);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function eout(p){p=clamp(p,0,1);return 1-Math.pow(1-p,3)}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var R=rng(4);
function now(){return performance.now()/1000}

var FW=432,FH=540,S=1;
var frame=$('frame'),app=$('app'),tray=$('tray'),plus=$('plus'),cubesEl=$('cubes'),content=$('content'),titleEl=$('title'),subEl=$('sub'),cursorEl=$('cursor');

var IC={
  cal:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><path d="M4 13.5 6.5 5.5h11l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
  note:'<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16 5l3 3L9 18z"/></svg>',
  list:'<svg viewBox="0 0 24 24"><path d="M10 7h10M10 12h10M10 17h10M4 7l1.3 1.3L7.5 6M4 12l1.3 1.3L7.5 11"/><circle cx="5.5" cy="17" r="1.3"/></svg>',
  photo:'<svg viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="17" height="12.5" rx="2.5"/><circle cx="12" cy="12.75" r="3.2"/><path d="M9 6.5l1.2-2h3.6l1.2 2"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M7 12h10"/></svg>',
  voice:'<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3"/></svg>',
  sketch:'<svg viewBox="0 0 24 24"><path d="M4 16c3-6 5-9 6.5-8s-2.5 7-.5 8 4-5 5.5-4.5S15 17 17 17s3-2 3-2"/></svg>',
  doc:'<svg viewBox="0 0 24 24"><path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6"/></svg>',
  image:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 16l5-4.5 4 3.5 3-2.5 5 4"/><circle cx="15.5" cy="9.5" r="1.5"/></svg>',
  wave:'<svg viewBox="0 0 24 24"><path d="M4 12h1.5M7.5 8v8M11 5v14M14.5 9v6M18 7v10M20 12h.5"/></svg>'
};
var TABS=[{k:'cal',l:'Today',sub:'Saturday, 25 October'},{k:'inbox',l:'Inbox',sub:'3 unread'},{k:'user',l:'People',sub:'12 contacts'},{k:'folder',l:'Files',sub:'Recent'}];
var ACTS=[['note','Note'],['list','Checklist'],['photo','Photo'],['scan','Scan'],['voice','Voice'],['sketch','Sketch']];
var VOICE=4;

/* ─────────── экраны вкладок ─────────── */
var PAGES=[
  '<div class="hero c-sun" style="top:0;height:150px"><span class="k">Morning run</span><b>6.2 km</b><i>32 min · 5:09 /km</i></div>'+
  '<div class="row" style="top:162px"><span class="dot c-sea"></span>Call Mira<span class="tm">11:00</span></div>'+
  '<div class="row" style="top:216px"><span class="dot c-leaf"></span>Pick up keys<span class="tm">14:30</span></div>'+
  '<div class="hero c-sea" style="top:274px;height:170px"><span class="k">Focus</span><b>2h 15m</b><i>Deep work · 3 sessions</i></div>',
  [['MK','c-plum','Mira K.','Lunch still on? I found a place near the park','9:41'],['S9','c-sun','Studio Nine','Invoice #2025-114 is ready','9:02'],['D','c-leaf','Dad','Call me when you can','8:15'],
   ['L','c-sea','Lev','Sent a photo','Yesterday'],['C','c-lemon','Courier','Your parcel arrives today, 14:00–16:00','Yesterday'],['A','c-plum','Ana','haha yes','Mon']]
   .map(function(m,i){return '<div class="msg" style="top:'+i*64+'px"><span class="av '+m[1]+'">'+m[0]+'</span><div><b>'+m[2]+'<span>'+m[4]+'</span></b><p>'+m[3]+'</p></div></div>'}).join(''),
  ['Mira','Lev','Ana','Dad','Sam','Jo','Kai','Noor','Eli'].map(function(n,i){var c=['c-plum','c-sea','c-sun','c-leaf','c-lemon','c-sea','c-sun','c-plum','c-leaf'][i];
    return '<div class="person" style="top:'+Math.floor(i/3)*128+'px;left:'+(i%3)*135+'px"><span class="av '+c+'">'+n[0]+'</span>'+n+'</div>'}).join(''),
  [['Trip.key','c-sea','24 MB','doc'],['Budget.xlsx','c-leaf','310 KB','doc'],['Moodboard','c-plum','48 photos','image'],['Lease.pdf','c-sun','1.2 MB','doc'],['Voice 014','c-lemon','2:31','wave'],['Sketches','c-sea','12 items','image']]
   .map(function(f,i){return '<div class="file" style="top:'+Math.floor(i/2)*142+'px;left:'+(i%2)*204+'px"><div class="th '+f[1]+'">'+IC[f[3]]+'</div><b>'+f[0]+'</b><span>'+f[2]+'</span></div>'}).join('')
];
var pages=PAGES.map(function(h,i){var p=document.createElement('section');p.className='page'+(i===0?' on':'');p.innerHTML=h;p.setAttribute('aria-label',TABS[i].l);content.append(p);return p});

/* ─────────── лоток ─────────── */
var TRAY={x:28,y:452,w:304,h:60},PLUS={x:374,y:482},WW=68.5;
function wellX(j){return TRAY.x+6+j*(WW+6)+WW/2}
var WELL_Y=482;
var wells=TABS.map(function(t,j){
  var b=document.createElement('button');b.className='well';b.setAttribute('role','tab');b.setAttribute('aria-label',t.l);b.setAttribute('aria-selected',j===0);
  b.innerHTML='<span class="water"></span><span class="cube"></span>'+IC[t.k];
  b.onclick=function(){selectTab(j)};tray.append(b);return b;
});
var cur=0,open=false,switching=false;

function stopAll(el){el.getAnimations().forEach(function(a){a.cancel()})}
function spark(x,y,delay,size){
  var s=document.createElement('span');s.className='spark';app.append(s);var k=size||1;
  s.animate([{transform:'translate('+x+'px,'+y+'px) scale(0) rotate(0)',opacity:1},{transform:'translate('+x+'px,'+y+'px) scale('+k+') rotate(45deg)',opacity:1,offset:.4},{transform:'translate('+x+'px,'+y+'px) scale(0) rotate(90deg)',opacity:0}],
    {duration:520,delay:delay*1000,fill:'both',easing:'ease-out'}).onfinish=function(){s.remove()};
}
function melt(j){
  var w=wells[j],cube=w.querySelector('.cube'),water=w.querySelector('.water');stopAll(cube);stopAll(water);
  cube.animate([{opacity:1,transform:'none',filter:'blur(0)'},{opacity:.85,transform:'translateY(6px) scale(1.08,.5)',filter:'blur(1px)',offset:.5},{opacity:0,transform:'translateY(14px) scale(1.15,.12)',filter:'blur(2px)'}],{duration:560,easing:'ease-in'});
  water.animate([{opacity:0,transform:'scaleY(0)'},{opacity:.9,transform:'scaleY(.3)',offset:.35},{opacity:0,transform:'scaleY(.06)'}],{duration:900,delay:200,easing:'ease-out'});
  Sound.play('melt',wellX(j));
}
function freeze(j,delay){
  var w=wells[j],cube=w.querySelector('.cube'),water=w.querySelector('.water'),d=(delay||0)*1000;stopAll(cube);stopAll(water);
  water.animate([{opacity:1,transform:'scaleY(0)'},{opacity:1,transform:'scaleY(1)',offset:.5},{opacity:0,transform:'scaleY(1)'}],{duration:460,delay:d,easing:'cubic-bezier(.3,.7,.4,1)'});
  cube.animate([{opacity:0,transform:'scale(.9)',filter:'blur(4px)'},{opacity:0,transform:'scale(.9)',filter:'blur(4px)',offset:.32},{opacity:1,transform:'scale(1.07)',filter:'blur(0)',offset:.72},{opacity:1,transform:'scale(1)',filter:'blur(0)'}],{duration:560,delay:d,easing:'ease-out',fill:'backwards'});
  for(var k=0;k<3;k++)spark(wellX(j)-4+(R()-.5)*48,WELL_Y-4+(R()-.5)*30,(delay||0)+.24+k*.07,.8+R()*.5);
  setTimeout(function(){Sound.play('freeze',wellX(j))},d+120);
}
function swapPage(from,to){
  var dir=to>from?1:-1,a=pages[from],b=pages[to];stopAll(a);stopAll(b);
  a.classList.remove('on');b.classList.add('on');
  a.animate([{opacity:1,visibility:'visible',transform:'none'},{opacity:0,visibility:'visible',transform:'translateX('+(-dir*18)+'px)'}],{duration:180,easing:'cubic-bezier(.4,0,1,1)'});
  b.animate([{opacity:0,transform:'translateX('+(dir*24)+'px)'},{opacity:1,transform:'none'}],{duration:380,delay:70,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
  [titleEl,subEl].forEach(function(el,k){stopAll(el);
    el.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-5px)'}],{duration:130,delay:k*30,easing:'ease-in',fill:'forwards'}).onfinish=function(){
      el.textContent=k?TABS[to].sub:TABS[to].l;stopAll(el);
      el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'})}});
}
function selectTab(j){
  if(open)closeMenu();
  if(j===cur)return;
  Sound.play('tick',wellX(j));
  wells[cur].setAttribute('aria-selected','false');wells[j].setAttribute('aria-selected','true');
  melt(cur);freeze(j,.08);swapPage(cur,j);cur=j;
}

/* ─────────── скрутка лотка ─────────── */
function twist(k){
  var d=Math.round(480*Math.max(.55,k));
  tray.animate([{transform:'none'},{transform:'perspective(600px) rotateY('+(-9*k)+'deg) skewY('+(-2*k)+'deg) translateY('+(2*k)+'px)'},{transform:'perspective(600px) rotateY('+(8*k)+'deg) skewY('+(1.8*k)+'deg)'},{transform:'none'}],{duration:d,easing:'ease-in-out'});
  wells.forEach(function(w,j){var a=(j-1.5)*13*k;
    w.animate([{transform:'none'},{transform:'perspective(240px) rotateX('+a+'deg)'},{transform:'perspective(240px) rotateX('+(-a*.6)+'deg)'},{transform:'none'}],{duration:d,easing:'ease-in-out'})});
  Sound.play('creak',k);
}

/* ─────────── кубики ─────────── */
var CW=88,CH=76,cubes=[],drops=[];
function slot(i){return{x:72+(i%3)*100,y:i<3?264:352}}
var FROM=[0,1,2,3,1,3];
function openMenu(){
  if(open||switching)return;
  open=true;app.classList.add('open');plus.setAttribute('aria-expanded','true');
  Sound.play('press',PLUS.x);
  cubes.forEach(function(c){c.el.remove()});cubes=[];
  twist(1);
  var t=now();
  ACTS.forEach(function(a,i){
    var el=document.createElement('button');el.className='ice';el.innerHTML=IC[a[0]]+'<span>'+a[1]+'</span>';el.setAttribute('aria-label',a[1]);
    el.style.opacity=0;cubesEl.append(el);
    var order=i===VOICE?4:i>VOICE?i-1:i;
    var c={el:el,i:i,phase:'wait',t0:t+(RM?.05:.3+order*.07),x:wellX(FROM[i])-CW/2+(R()-.5)*10,y:WELL_Y-CH/2,r:0,rv:0,sc:.55,sq:0,sqv:0,mx:1,my:1,op:0,heavy:i===VOICE};
    el.onclick=function(){pick(c)};
    cubes.push(c);
  });
}
function launch(c,t){
  var s=slot(c.i),dir=Math.sign(s.x-c.x)||1;
  c.phase='fly';c.f0=t;c.sx=c.x;c.sy=c.y;c.sc0=c.sc;c.lx=s.x-dir*(c.heavy?26:16);c.ly=s.y;
  c.D=RM?.2:c.heavy?.62:.5+R()*.06;c.H=c.heavy?120:c.i<3?72:56;
  c.r0=(R()-.5)*70;c.rL=(R()-.5)*14+(c.heavy?dir*8:0);
  Sound.play('pop',c.x+CW/2,c.i);
}
function land(c){
  c.phase='slide';c.x=c.lx;c.y=c.ly;c.r=c.rL;c.rv=0;c.sqv=c.heavy?11:6.5;
  Sound.play(c.heavy?'thud':'clink',c.x+CW/2,c.i);Sound.play('slide',c.x+CW/2,c.heavy?.4:.25);
  if(c.heavy){
    // Voice падает тяжелее и толкает соседей, лёд даёт им отъехать и вернуться
    cubes.forEach(function(o){if(o===c||o.phase==='wait'||o.phase==='fly'||o.phase==='stuck')return;
      var dx=o.x-c.x,dy=o.y-c.y;if(Math.abs(dx)<110&&Math.abs(dy)<100){o.x+=Math.sign(dx||1)*7;o.r+=Math.sign(dx||1)*4;o.sqv=4;o.phase='slide'}});
    tray.animate([{transform:'none'},{transform:'translateY(2px) scaleY(.97)'},{transform:'none'}],{duration:200,easing:'ease-out'});
    for(var k=0;k<4;k++)spark(c.x+CW/2+(R()-.5)*90,c.y+CH-6+(R()-.5)*16,k*.05,.7+R()*.5);
  }
}
function pick(c){
  if(!open||(c.phase!=='rest'&&c.phase!=='slide'))return;
  c.el.classList.add('picked');c.sqv=-6;c.picked=true;
  Sound.play('pick',c.x+CW/2);
  setTimeout(closeMenu,380);
}
function closeMenu(){
  if(!open)return;
  open=false;app.classList.remove('open');plus.setAttribute('aria-expanded','false');
  Sound.play('press',PLUS.x);
  var t=now(),k=0;
  cubes.forEach(function(c){
    c.el.classList.remove('live');
    if(c.phase==='wait'){c.el.remove();c.phase='gone';return}
    c.phase='meltwait';c.m0=t+(c.picked?.14+cubes.length*.05:k++*.05);
  });
}
function spawnDrops(c){
  var x0=c.x+CW/2,y0=c.y+CH-6;
  for(var k=0;k<2;k++){
    var j=clamp(Math.round((x0-TRAY.x-6-WW/2)/(WW+6)+(k?.4:-.4)),0,3),wx=wellX(j)+(R()-.5)*16,tf=Math.sqrt(2*Math.max(20,TRAY.y+14-y0)/1600);
    var el=document.createElement('span');el.className='drop';cubesEl.append(el);
    drops.push({el:el,x:x0+(k-.5)*14,y:y0,vx:(wx-x0)/tf,vy:0,j:j,snd:k===0});
  }
}
function ripple(j){
  var water=wells[j].querySelector('.water');
  water.animate([{opacity:0,transform:'scaleY(.1)'},{opacity:.85,transform:'scaleY(.3)',offset:.3},{opacity:0,transform:'scaleY(.05)'}],{duration:420,easing:'ease-out'});
}
plus.onclick=function(){if(open)closeMenu();else openMenu()};

function stepCubes(t,dt){
  cubes.forEach(function(c){
    if(c.phase==='gone')return;
    var e,ground=false;
    if(c.phase==='wait'&&t>=c.t0){
      if(c.heavy&&!RM){c.phase='stuck';c.s0=t;c.bx=c.x;c.tapped=false;Sound.play('rattle',c.x+CW/2)}else launch(c,t);
    }
    if(c.phase==='stuck'){
      // примёрз: дребезжит в ячейке, лоток стукают, и только тогда отрывается
      e=t-c.s0;c.op=Math.min(1,e*8);
      var amp=e<.6?1:1.7;c.sc=.72;c.x=c.bx+Math.sin(e*70)*2.6*amp;c.r=Math.sin(e*55)*7*amp;
      if(e>=.6&&!c.tapped){c.tapped=true;twist(.5)}
      if(e>=.95){c.x=c.bx;launch(c,t)}
    }
    if(c.phase==='fly'){
      var p=clamp((t-c.f0)/c.D,0,1);
      c.x=mix(c.sx,c.lx,p);c.y=mix(c.sy,c.ly,p)-c.H*4*p*(1-p);
      c.r=mix(c.r0,c.rL,p);c.sc=mix(c.sc0,1,eout(p*1.3));c.op=Math.min(1,p*7+(c.heavy?1:0));
      if(p>=1)land(c);
    }
    if(c.phase==='slide'||c.phase==='rest'){
      ground=true;c.sc=1;c.op=1;
      var s=slot(c.i);c.x+=(s.x-c.x)*(1-Math.exp(-dt*5.5));c.y=s.y;
      c.rv+=(-140*c.r-10*c.rv)*dt;c.r+=c.rv*dt;
      if(c.phase==='slide'&&Math.abs(s.x-c.x)<.3&&Math.abs(c.r)<.4&&Math.abs(c.sq)<.01){c.phase='rest';c.x=s.x;if(open)c.el.classList.add('live')}
    }
    if(c.phase==='meltwait'&&t>=c.m0){c.phase='melt';c.mt=t;c.dropped=false}
    if(c.phase==='meltwait')ground=c.sc>=1;
    if(c.phase==='melt'){
      // тает снизу: оседает в лужицу, мутнеет, капли уходят в лоток
      ground=true;e=clamp((t-c.mt)/.55,0,1);
      c.my=1-.86*eio(e);c.mx=1+.24*e;c.op=1-e*e;c.el.style.filter='blur('+(2.4*e)+'px)';
      if(e>=.45&&!c.dropped){c.dropped=true;spawnDrops(c)}
      if(e>=1){c.phase='gone';c.el.remove();return}
    }
    c.sqv+=(-380*c.sq-15*c.sqv)*dt;c.sq+=c.sqv*dt;
    var sy=c.sc*(1-c.sq*.35)*c.my,sx=c.sc*(1+c.sq*.25)*c.mx;
    var y=c.y+(ground?CH*(1-sy)/2:0);
    c.el.style.opacity=c.op;
    c.el.style.transform='translate('+c.x.toFixed(2)+'px,'+y.toFixed(2)+'px) rotate('+c.r.toFixed(2)+'deg) scale('+sx.toFixed(4)+','+sy.toFixed(4)+')';
  });
  cubes=cubes.filter(function(c){return c.phase!=='gone'});
  drops=drops.filter(function(d){
    d.vy+=1600*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
    if(d.y>=TRAY.y+14){d.el.remove();ripple(d.j);if(d.snd)Sound.play('drip',d.x);return false}
    var st=Math.min(1.6,1+d.vy/1400);
    d.el.style.transform='translate('+(d.x-3.5).toFixed(2)+'px,'+(d.y-4.5).toFixed(2)+'px) scale('+(1/Math.sqrt(st)).toFixed(3)+','+st.toFixed(3)+')';
    return true;
  });
}

/* ─────────── Glass ↔ Flat ─────────── */
var segBtns=[].slice.call(app.querySelectorAll('.seg button'));
var SEG={glass:{x:304,y:46},flat:{x:374,y:46}};
function setStyle(s,instant){
  if(s===app.dataset.style||switching)return;
  if(open)closeMenu();
  var done=function(){
    app.classList.add('no-tr');app.dataset.style=s;
    segBtns.forEach(function(b){b.setAttribute('aria-checked',b.dataset.set===s)});
    app.offsetWidth;requestAnimationFrame(function(){app.classList.remove('no-tr')});
  };
  if(instant||RM){done();return}
  switching=true;
  // новый стиль проявляется кругом от кнопки поверх старого
  var o=SEG[s],clone=app.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id')});
  clone.querySelectorAll('.ice,.drop,.spark').forEach(function(n){n.remove()});
  clone.classList.add('reveal');clone.setAttribute('aria-hidden','true');frame.insertBefore(clone,cursorEl);
  clone.offsetWidth;clone.dataset.style=s;
  clone.querySelectorAll('.seg button').forEach(function(b){b.setAttribute('aria-checked',b.dataset.set===s)});
  Sound.play('whoosh',o.x);
  clone.animate([{clipPath:'circle(0px at '+o.x+'px '+o.y+'px)'},{clipPath:'circle(720px at '+o.x+'px '+o.y+'px)'}],{duration:700,easing:'cubic-bezier(.6,0,.25,1)',fill:'forwards'}).onfinish=function(){
    done();setTimeout(function(){clone.remove();switching=false},30);
  };
}
segBtns.forEach(function(b){b.onclick=function(){setStyle(b.dataset.set)}});

/* ─────────── курсор и демо ─────────── */
var cur0={x:330,y:430,fx:330,fy:430,tx:330,ty:430,t0:0,d:0,bend:1,op:0,press:-9};
function moveTo(x,y,d){var c=cur0;c.fx=c.x;c.fy=c.y;c.tx=x;c.ty=y;c.t0=now();c.d=d;c.bend=-c.bend}
function stepCursor(t){
  var c=cur0,p=c.d?clamp((t-c.t0)/c.d,0,1):1,q=eio(p);
  var mx=(c.fx+c.tx)/2,my=(c.fy+c.ty)/2,dx=c.tx-c.fx,dy=c.ty-c.fy,len=Math.hypot(dx,dy)||1;
  var bx=mx-dy/len*len*.12*c.bend,by=my+dx/len*len*.12*c.bend;
  c.x=(1-q)*(1-q)*c.fx+2*(1-q)*q*bx+q*q*c.tx;c.y=(1-q)*(1-q)*c.fy+2*(1-q)*q*by+q*q*c.ty;
  var e=t-c.press,k=e<0||e>.3?1:e<.08?1-.16*(e/.08):.84+.16*eout((e-.08)/.22);
  cursorEl.style.opacity=c.op;
  cursorEl.style.transform='translate('+(c.x-2.5).toFixed(2)+'px,'+(c.y-1.7).toFixed(2)+'px) scale('+k.toFixed(3)+')';
}
function fadeCursor(to,d){var c=cur0,from=c.op,t0=now();cursorFade={from:from,to:to,t0:t0,d:d}}
var cursorFade=null;
function tap(el){
  cur0.press=now();
  setTimeout(function(){el.classList.add('is-pressed');setTimeout(function(){el.classList.remove('is-pressed')},120);el.click()},70);
}
function cubeEl(i){var c=cubes.find(function(c){return c.i===i});return c&&c.el}
function at(i){var s=slot(i);return[s.x+CW/2,s.y+CH/2]}

var STEPS=[
  [0,function(){fadeCursor(1,.3)}],
  [.3,function(){moveTo(wellX(1),WELL_Y+4,.6)}],
  [1.0,function(){tap(wells[1])}],
  [1.7,function(){moveTo(wellX(2),WELL_Y+4,.45)}],
  [2.25,function(){tap(wells[2])}],
  [3.0,function(){moveTo(PLUS.x,PLUS.y+2,.55)}],
  [3.65,function(){tap(plus)}],
  [6.3,function(){var p=at(0);moveTo(p[0],p[1]+4,.6)}],
  [7.0,function(){var e=cubeEl(0);if(e)tap(e)}],
  [8.3,function(){moveTo(SEG.flat.x,SEG.flat.y+2,.7)}],
  [9.1,function(){tap(segBtns[1])}],
  [10.2,function(){moveTo(wellX(3),WELL_Y+4,.6)}],
  [10.9,function(){tap(wells[3])}],
  [11.6,function(){moveTo(PLUS.x,PLUS.y+2,.45)}],
  [12.2,function(){tap(plus)}],
  [12.6,function(){moveTo(392,300,.7)}],
  [14.9,function(){moveTo(PLUS.x,PLUS.y+2,.5)}],
  [15.5,function(){tap(plus)}],
  [16.6,function(){moveTo(SEG.glass.x,SEG.glass.y+2,.7)}],
  [17.4,function(){tap(segBtns[0])}],
  [18.4,function(){moveTo(372,300,.6);fadeCursor(0,.6)}],
  [19.2,function(){}]
];
var END=19.2;
var demo={on:false,t0:0,i:0};
function resetScene(){
  if(open){cubes.forEach(function(c){c.el.remove()});cubes=[];open=false;app.classList.remove('open');plus.setAttribute('aria-expanded','false')}
  drops.forEach(function(d){d.el.remove()});drops=[];
  if(cur!==0){wells[cur].setAttribute('aria-selected','false');wells[0].setAttribute('aria-selected','true');pages[cur].classList.remove('on');pages[0].classList.add('on');titleEl.textContent=TABS[0].l;subEl.textContent=TABS[0].sub;cur=0}
  setStyle('glass',true);
}
function startDemo(){resetScene();demo.on=true;demo.t0=now();demo.i=0;cur0.op=0;cur0.x=cur0.fx=cur0.tx=330;cur0.y=cur0.fy=cur0.ty=430;cur0.d=0}
function stopDemo(){demo.on=false;fadeCursor(0,.2)}
function stepDemo(t){
  if(!demo.on)return;
  var e=t-demo.t0;
  while(demo.i<STEPS.length&&STEPS[demo.i][0]<=e)STEPS[demo.i++][1]();
  if(demo.i>=STEPS.length){demo.on=false;if(REC)window.__done=true}
}
frame.addEventListener('pointerdown',function(e){if(e.isTrusted&&demo.on)stopDemo();Sound.start()},true);

/* ─────────── часы ─────────── */
var prev=null;
function tick(){
  var t=now(),dt=prev===null?0:Math.min(.05,t-prev);prev=t;
  stepDemo(t);
  if(cursorFade){var f=cursorFade,p=clamp((t-f.t0)/f.d,0,1);cur0.op=mix(f.from,f.to,p);if(p>=1)cursorFade=null}
  stepCubes(t,dt);stepCursor(t);
  requestAnimationFrame(tick);
}

document.getElementById('play').onclick=function(){Sound.start();startDemo()};
var sndBtn=document.getElementById('snd');
sndBtn.onclick=function(){var on=!Sound.on;Sound.setOn(on);sndBtn.textContent=on?'Sound on':'Sound off';sndBtn.setAttribute('aria-pressed',String(on))};
addEventListener('keydown',function(e){if(e.key==='Escape'&&open)closeMenu()});

function fit(){
  var w=innerWidth,h=innerHeight;
  S=REC?Math.min(w/FW,h/FH):clamp(Math.min((h-96)/FH,(w-32)/FW),.5,1.6);
  frame.style.zoom=S;
}
window.__renderAudio=function(){return Sound.render(0,END)};
fit();addEventListener('resize',fit);
startDemo();
requestAnimationFrame(tick);
