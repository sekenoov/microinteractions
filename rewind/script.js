/* ─────────── утилиты ─────────── */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function clamp(v,a,b){return v<a?a:(v>b?b:v)}
function lerp(a,b,t){return a+(b-a)*t}
function smooth(x){x=clamp(x,0,1);return x*x*(3-2*x)}

/* ─────────── одометр с непрерывной прокруткой ─────────── */
function Odo(el,slots){
  this.slots=[];el.innerHTML='';
  for(var i=slots-1;i>=0;i--){
    var s=document.createElement('span');s.className='dig';
    var u=document.createElement('u');
    for(var k=0;k<=10;k++){var b=document.createElement('b');b.textContent=k%10;u.appendChild(b)}
    s.appendChild(u);el.appendChild(s);
    this.slots.unshift({el:s,drum:u,place:Math.pow(10,i),off:null,pos:null});
  }
}
Odo.prototype.set=function(v){
  v=Math.max(0,v);
  for(var i=0;i<this.slots.length;i++){
    var s=this.slots[i],x=v/s.place,base=Math.floor(x),frac=x-base;
    var roll=i===0?frac:(frac>.9?(frac-.9)*10:0);
    var pos=(base%10)+roll;
    if(s.pos===null||Math.abs(pos-s.pos)>.0008){
      s.drum.style.transform='translateY('+(-pos)+'em)';s.pos=pos;
    }
    var off=!(i===0||v>=s.place-.5);
    if(off!==s.off){s.el.classList.toggle('off',off);s.off=off}
  }
};

/* ─────────── пружина, критическое затухание ─────────── */
function Spring(x,w){this.x=x;this.t=x;this.v=0;this.w=w}
Spring.prototype.step=function(dt){
  if(reduce){this.x=this.t;this.v=0;return}
  var w=this.w,dx=this.x-this.t,e=Math.exp(-w*dt);
  this.x=this.t+(dx+(this.v+w*dx)*dt)*e;
  this.v=(this.v-(this.v+w*dx)*w*dt)*e;
  var vmax=6.5;
  if(this.v>vmax)this.v=vmax;else if(this.v<-vmax)this.v=-vmax;
};
Spring.prototype.rest=function(){return Math.abs(this.x-this.t)<.0004&&Math.abs(this.v)<.0025};

/* ─────────── данные ─────────── */
var CPS=[
  {t:'14:02',m:842,l:'Session start'},
  {t:'14:09',m:849,l:'Auth guard added'},
  {t:'14:17',m:857,l:'Session store refactored'},
  {t:'14:26',m:866,l:'Now'}
];
var GROUPS=[null,
  {you:[88,66,44], tools:[['Edit','guard.tsx']],                          out:[76,58,38]},
  {you:[74,52],    tools:[['Edit','tokens.ts'],['Edit','session.ts']],    out:[90,68,46]},
  {you:[92,70,50], tools:[['Edit','auth.spec.ts'],['Bash','npm test']],   out:[82,54]}
];
var FILES=[
  {p:'src/auth/', n:'session.ts',   a:[0,42,96,118], d:[0,4,18,31]},
  {p:'src/auth/', n:'guard.tsx',    a:[0,28,28,46],  d:[0,0,6,6]},
  {p:'src/lib/',  n:'tokens.ts',    a:[0,0,34,52],   d:[0,0,12,12]},
  {p:'tests/',    n:'auth.spec.ts', a:[0,0,0,64],    d:[0,0,0,2]}
];
var SCALE=149;
var DIFF=[
  {t:'ctx',w:62,i:0},
  {t:'ctx',w:44,i:1},
  {t:'del',w:54,i:1,cp:1},
  {t:'add',w:70,i:1,cp:1},
  {t:'add',w:40,i:2,cp:1},
  {t:'ctx',w:34,i:1},
  {t:'ctx',w:56,i:0},
  {t:'add',w:64,i:2,cp:2},
  {t:'add',w:48,i:2,cp:2},
  {t:'add',w:30,i:3,cp:2},
  {t:'del',w:36,i:1,cp:2},
  {t:'ctx',w:50,i:1},
  {t:'add',w:68,i:1,cp:3},
  {t:'add',w:44,i:2,cp:3},
  {t:'del',w:28,i:2,cp:3},
  {t:'ctx',w:58,i:0},
  {t:'ctx',w:40,i:1},
  {t:'ctx',w:30,i:0}
];
var HEAD=CPS.length-1,ROWH=13;

/* ─────────── узлы ─────────── */
var tl=document.getElementById('tl'),ph=document.getElementById('ph'),
    phChip=document.getElementById('phChip'),rew=document.getElementById('rew'),
    hint=document.getElementById('hint'),filesEl=document.getElementById('files'),
    diffEl=document.getElementById('diff'),statusEl=document.getElementById('status'),
    sdot=document.getElementById('sdot');
var phLine=ph.querySelector('.ph__line');
var cpEls=[],grpEls=[],msgEls=[],fileEls=[],diffEls=[];

/* ─────────── состояние ─────────── */
var target=HEAD,scope='both';
var L={
  ph:new Spring(HEAD,21),
  msg:new Spring(HEAD,21),
  diff:new Spring(HEAD,17),
  tot:new Spring(HEAD,13),
  files:[]
};
var running=false,dragging=false,lastT=0;

/* ─────────── сборка ─────────── */
function el(tag,cls,txt){
  var n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!=null)n.textContent=txt;
  return n;
}
function lines(ws){
  var box=el('div','lines');
  ws.forEach(function(w){var l=el('span','ln');l.style.width=w+'%';box.appendChild(l)});
  return box;
}
function message(role,ws,tools){
  var m=el('div','msg'),inr=el('div','msg__in');
  inr.appendChild(el('span','role',role==='you'?'You':'Claude'));
  inr.appendChild(lines(ws));
  if(tools&&tools.length){
    var tr=el('div','tools-row');
    tools.forEach(function(t){
      var c=el('span','tool');
      c.appendChild(el('span','tool__k',t[0]));
      c.appendChild(el('span',null,t[1]));
      c.appendChild(el('span','tool__x','↺'));
      tr.appendChild(c);
    });
    inr.appendChild(tr);
  }
  m.appendChild(inr);
  return m;
}
function checkpoint(i){
  var c=el('div','cp');
  c.dataset.i=i;
  c.appendChild(el('span','cp__dot'));
  c.appendChild(el('span','cp__t',CPS[i].t));
  c.appendChild(el('span','cp__l',CPS[i].l));
  c.addEventListener('click',function(){setTarget(i);kickPh()});
  return c;
}
function buildTimeline(){
  for(var i=0;i<CPS.length;i++){
    cpEls[i]=checkpoint(i);
    tl.appendChild(cpEls[i]);
    if(i<HEAD){
      var g=GROUPS[i+1],box=el('div','grp');
      var m1=message('you',g.you,null),m2=message('ai',g.out,g.tools);
      box.appendChild(m1);box.appendChild(m2);
      tl.appendChild(box);
      grpEls[i+1]=box;
      msgEls.push({g:i+1,el:m1,h:0},{g:i+1,el:m2,h:0});
    }
  }
}
function buildFiles(){
  FILES.forEach(function(f,idx){
    var row=el('div','frow'),top=el('div','ftop'),path=el('span','fpath');
    path.appendChild(el('span','dim',f.p));
    path.appendChild(el('span',null,f.n));
    var st=el('span','fstat'),pair=el('span','pair');
    var sa=el('span','stat stat--a'),sd=el('span','stat stat--d');
    sa.appendChild(document.createTextNode('+'));
    sd.appendChild(document.createTextNode('−'));
    var na=el('span','num'),nd=el('span','num');
    sa.appendChild(na);sd.appendChild(nd);
    pair.appendChild(sa);pair.appendChild(sd);
    var none=el('span','none','unchanged');
    st.appendChild(pair);st.appendChild(none);
    top.appendChild(path);top.appendChild(st);
    var bar=el('div','fbar'),ga=el('span','fseg fseg--a'),gd=el('span','fseg fseg--d');
    bar.appendChild(ga);bar.appendChild(gd);
    row.appendChild(top);row.appendChild(bar);
    filesEl.appendChild(row);
    fileEls.push({f:f,row:row,pair:pair,none:none,ga:ga,gd:gd,
                  oa:new Odo(na,3),od:new Odo(nd,3),pa:-1,pd:-1,mv:false});
    L.files.push(new Spring(HEAD,16-idx*1.2));
  });
}
function buildDiff(){
  DIFF.forEach(function(d){
    var r=el('div','drow drow--'+d.t);
    var sign=el('span','dsign',d.t==='add'?'+':d.t==='del'?'−':'');
    r.appendChild(sign);
    var b=el('span','dbar'),ink=null;
    b.style.width=d.w+'%';
    b.style.marginLeft=(d.i*9)+'px';
    if(d.t==='del'){ink=document.createElement('i');b.appendChild(ink)}
    r.appendChild(b);
    diffEl.appendChild(r);
    diffEls.push({d:d,el:r,sign:sign,ink:ink});
  });
}
function measure(){
  msgEls.forEach(function(m){m.h=m.el.firstChild.offsetHeight});
}
function groupH(gi){
  var s=0;
  for(var i=0;i<msgEls.length;i++)if(msgEls[i].g===gi)s+=msgEls[i].h;
  return s;
}

/* ─────────── геометрия развёрнутой ленты ─────────── */
var PAD=10,CPH=26,EXP=[];
function geometry(){
  PAD=parseFloat(getComputedStyle(tl).paddingTop)||10;
  CPH=cpEls[0].offsetHeight||26;
  var y=PAD;
  for(var k=0;k<=HEAD;k++){
    y+=CPH;
    EXP[k]=y;
    if(k<HEAD)y+=groupH(k+1);
  }
}
function expAt(t){
  var k=clamp(Math.floor(t),0,HEAD-1),fr=clamp(t-k,0,1);
  return t>=HEAD?EXP[HEAD]:lerp(EXP[k],EXP[k+1],fr);
}
function expInv(y){
  if(y<=EXP[0])return 0;
  for(var k=0;k<HEAD;k++){
    if(y<=EXP[k+1])return k+(y-EXP[k])/(EXP[k+1]-EXP[k]);
  }
  return HEAD;
}

/* ─────────── отрисовка кадра ─────────── */
function fmtTime(m){
  var h=Math.floor(m/60),mm=Math.round(m%60);
  if(mm===60){mm=0;h++}
  return h+':'+(mm<10?'0'+mm:mm);
}
function valAt(arr,t){
  var k=clamp(Math.floor(t),0,HEAD-1);
  return lerp(arr[k],arr[k+1],clamp(t-k,0,1));
}

function render(){
  var T=L.ph.x,Tm=L.msg.x;

  /* сообщения и позиция лезвия */
  var pos=PAD,stopped=false;
  for(var gi=1;gi<=HEAD;gi++){
    var fm=clamp(Tm-(gi-1),0,1),fr=clamp(T-(gi-1),0,1);
    var H=groupH(gi),budget=fm*H,vis=0;
    for(var i=0;i<msgEls.length;i++){
      var m=msgEls[i];
      if(m.g!==gi)continue;
      var h=clamp(budget,0,m.h);budget-=h;vis+=h;
      var ratio=m.h?h/m.h:0;
      m.el.style.height=h+'px';
      m.el.style.opacity=smooth(ratio*1.55);
      var cut=ratio>.015&&ratio<.995;
      if(cut!==m.cut){m.el.classList.toggle('cut',cut);m.cut=cut}
    }
    if(!stopped){
      pos+=CPH+Math.min(fr,fm)*H;
      if(fr<1)stopped=true;
    }
  }
  if(!stopped)pos+=CPH;
  ph.style.transform='translateY('+(pos-1)+'px)';
  var sp=Math.min(1,Math.abs(L.ph.v)/2.2);
  phLine.style.opacity=.46+.42*sp;

  /* время на бегунке и активная точка */
  var k=clamp(Math.floor(T),0,HEAD-1),fq=clamp(T-k,0,1);
  phChip.textContent=fmtTime(lerp(CPS[k].m,CPS[k+1].m,fq));
  var near=Math.round(clamp(T,0,HEAD));
  if(near!==lastNear){
    for(var c=0;c<=HEAD;c++)cpEls[c].classList.toggle('on',c===near);
    lastNear=near;
  }

  /* откаченные вызовы инструментов */
  var Tc=L.diff.x;
  for(var g2=1;g2<=HEAD;g2++){
    var un=Tc<g2-.02;
    if(un!==grpEls[g2].un){grpEls[g2].classList.toggle('undone',un);grpEls[g2].un=un}
  }

  /* строки диффа */
  var Td=L.diff.x;
  for(var r=0;r<diffEls.length;r++){
    var x=diffEls[r],d=x.d;
    if(d.t==='add'){
      var ra=clamp(Td-(d.cp-1),0,1);
      x.el.style.height=(ra*ROWH)+'px';
      x.el.style.opacity=smooth(ra*1.7);
    }else if(d.t==='del'){
      var rd=smooth(clamp(Td-(d.cp-1),0,1));
      x.ink.style.opacity=rd;
      x.sign.style.opacity=rd;
    }
  }

  /* файлы */
  for(var fi=0;fi<fileEls.length;fi++){
    var fe=fileEls[fi],tf=L.files[fi].x;
    var a=valAt(fe.f.a,tf),dd=valAt(fe.f.d,tf);
    fe.ga.style.width=(a/SCALE*100)+'%';
    fe.gd.style.width=(dd/SCALE*100)+'%';
    fe.oa.set(a);fe.od.set(dd);
    var z=smooth(clamp((a+dd)/2.2,0,1));
    fe.row.style.opacity=.42+.58*z;
    fe.pair.style.opacity=z;
    fe.none.style.opacity=1-z;
    var mv=Math.abs(a-fe.pa)+Math.abs(dd-fe.pd)>.06;
    if(mv!==fe.mv){fe.ga.classList.toggle('moving',mv);fe.gd.classList.toggle('moving',mv);fe.mv=mv}
    fe.pa=a;fe.pd=dd;
  }

  /* итоги и шапка диффа */
  var tt=L.tot.x,ta=0,td=0;
  for(var f3=0;f3<FILES.length;f3++){ta+=valAt(FILES[f3].a,tt);td+=valAt(FILES[f3].d,tt)}
  odoTotA.set(ta);odoTotD.set(td);
  var tf0=L.files[0].x;
  odoDA.set(valAt(FILES[0].a,tf0));odoDD.set(valAt(FILES[0].d,tf0));

  /* счётчик сообщений */
  var live=0;
  for(var q=0;q<msgEls.length;q++){
    var mq=msgEls[q];
    live+=mq.h?clamp(parseFloat(mq.el.style.height)/mq.h,0,1):0;
  }
  odoMsg.set(live);
}
var lastNear=-1;

/* ─────────── цикл ─────────── */
function frame(now){
  var dt=clamp((now-lastT)/1000,.001,.1);lastT=now;
  L.ph.step(dt);L.msg.step(dt);L.diff.step(dt);L.tot.step(dt);
  var rest=L.ph.rest()&&L.msg.rest()&&L.diff.rest()&&L.tot.rest();
  for(var i=0;i<L.files.length;i++){L.files[i].step(dt);if(!L.files[i].rest())rest=false}
  render();
  if(rest&&!dragging){running=false;return}
  requestAnimationFrame(frame);
}
function wake(){
  if(running)return;
  running=true;lastT=performance.now();
  requestAnimationFrame(frame);
}

/* ─────────── смена состояния ─────────── */
function lanes(v){
  var vm=scope==='code'?HEAD:v,vf=scope==='chat'?HEAD:v;
  L.ph.t=v;L.msg.t=vm;L.diff.t=vf;L.tot.t=vf;
  for(var i=0;i<L.files.length;i++)L.files[i].t=vf;
}
function setTarget(v,live){
  v=clamp(v,0,HEAD);
  if(v===target&&!live)return;
  target=v;
  lanes(v);
  if(!live)chrome();
  wake();
}
function kickPh(){
  if(reduce)return;
  var dir=L.ph.t<L.ph.x?1:-1,vmax=6.5;
  L.ph.v=clamp(L.ph.v+dir*1.5,-vmax,vmax);
  L.msg.v=clamp(L.msg.v+dir*1.5,-vmax,vmax);
}

function chrome(){
  var k=Math.round(target),changed=0;
  for(var i=0;i<FILES.length;i++){
    var kf=scope==='chat'?HEAD:k;
    if(FILES[i].a[kf]+FILES[i].d[kf]>0)changed++;
  }
  var txt;
  if(k===HEAD)txt='Head · '+changed+' files changed';
  else if(scope==='chat')txt='Conversation rewound to '+CPS[k].t+' · files kept';
  else if(scope==='code')txt='Files restored to '+CPS[k].t+' · conversation kept';
  else if(k===0)txt='Rewound to '+CPS[0].t+' · working tree clean';
  else{
    var rr=FILES.length-changed;
    txt='Rewound to '+CPS[k].t+' · '+rr+(rr===1?' file':' files')+' restored';
  }
  sdot.classList.toggle('clean',changed===0);
  if(txt!==statusEl.textContent){
    statusEl.classList.add('swap');
    setTimeout(function(){statusEl.textContent=txt;statusEl.classList.remove('swap')},reduce?0:150);
  }
  var locked=k===0;
  rew.classList.toggle('locked',locked);
  hint.classList.toggle('warn',locked);
  hint.textContent=locked?'Earliest checkpoint':(k===HEAD?'Drag the handle or press ↑':'Reset to return');
}

/* ─────────── управление ─────────── */
rew.addEventListener('click',function(){
  if(Math.round(target)===0){
    rew.classList.remove('shake');void rew.offsetWidth;rew.classList.add('shake');
    return;
  }
  rew.classList.remove('spin');void rew.offsetWidth;rew.classList.add('spin');
  setTarget(Math.round(target)-1);kickPh();
});
document.getElementById('reset').addEventListener('click',function(){setTarget(HEAD);kickPh()});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowUp'){e.preventDefault();setTarget(Math.round(target)-1);kickPh()}
  if(e.key==='ArrowDown'){e.preventDefault();setTarget(Math.round(target)+1);kickPh()}
});

var grip=ph.querySelector('.ph__grip'),y0=0,yExp0=0;
grip.addEventListener('pointerdown',function(e){
  e.preventDefault();
  try{grip.setPointerCapture(e.pointerId)}catch(err){}
  ph.classList.remove('hintpulse');
  geometry();
  y0=e.clientY;yExp0=expAt(target);
  dragging=true;ph.classList.add('drag');
  wake();
});
grip.addEventListener('pointermove',function(e){
  if(!dragging)return;
  var t=expInv(yExp0+(e.clientY-y0));
  if(Math.round(t)!==Math.round(target)){target=t;chrome()}else target=t;
  lanes(t);
});
function endDrag(){
  if(!dragging)return;
  dragging=false;ph.classList.remove('drag');
  setTarget(Math.round(target));
  chrome();
}
grip.addEventListener('pointerup',endDrag);
grip.addEventListener('pointercancel',endDrag);

var scopeEl=document.getElementById('scope');
scopeEl.addEventListener('click',function(e){
  var b=e.target.closest('button');
  if(!b||b.dataset.s===scope)return;
  scopeEl.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');
  scope=b.dataset.s;
  lanes(target);chrome();wake();
});

var ctl=document.querySelector('.seg-ctl');
ctl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  ctl.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');
  document.documentElement.setAttribute('data-theme',b.dataset.theme);
});
window.addEventListener('resize',function(){measure();geometry();wake()});

/* ─────────── старт ─────────── */
buildTimeline();
buildFiles();
buildDiff();
var odoMsg=new Odo(document.getElementById('msgNum'),1),
    odoTotA=new Odo(document.getElementById('totAdd'),3),
    odoTotD=new Odo(document.getElementById('totDel'),3),
    odoDA=new Odo(document.getElementById('dAdd'),3),
    odoDD=new Odo(document.getElementById('dDel'),3);
measure();
geometry();
render();
chrome();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){measure();geometry();render()});
if(!reduce)setTimeout(function(){ph.classList.add('hintpulse')},900);
