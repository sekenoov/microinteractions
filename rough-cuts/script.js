/* одометр */
function Odo(el){this.el=el;this.cur=''}
Odo.prototype.set=function(t){
  if(t===this.cur)return;
  var o=this.cur;this.cur=t;
  if(o.length!==t.length){this.build(t);return}
  for(var i=0;i<t.length;i++){
    if(o[i]===t[i])continue;
    var s=this.el.children[i];
    if(s&&s.classList.contains('dig')&&/\d/.test(t[i])){
      s.firstChild.style.transitionDelay=((t.length-i-1)*22)+'ms';
      s.firstChild.style.transform='translateY('+(-t[i])+'em)';
    }else if(s)s.textContent=t[i];
  }
};
Odo.prototype.build=function(t){
  this.el.innerHTML='';
  for(var i=0;i<t.length;i++){
    var c=t[i];
    if(/\d/.test(c)){
      var s=document.createElement('span');s.className='dig';
      var u=document.createElement('u');
      for(var k=0;k<10;k++){var b=document.createElement('b');b.textContent=k;u.appendChild(b)}
      u.style.transform='translateY('+(-c)+'em)';s.appendChild(u);this.el.appendChild(s);
    }else{var x=document.createElement('span');x.textContent=c;this.el.appendChild(x)}
  }
};
var $=function(id){return document.getElementById(id)};

/* ═══ 01 · автосжатие ═══ */
(function(){
  var SYS=4,FULL={chat:88,sum:0,k:'921.4',p:'92'},SMALL={chat:11,sum:6,k:'186.2',p:'21'};
  var chat=$('aChat'),sum=$('aSum'),sweep=$('aSweep'),track=$('aTrack'),
      note=$('aNote'),btn=$('aBtn'),
      oK=new Odo($('aNum')),oP=new Odo($('aPct')),small=false,busy=false;
  $('aTrack').querySelector('.seg--sys').style.width=SYS+'%';
  function put(s,hot){
    chat.style.width=s.chat+'%';sum.style.width=s.sum+'%';
    oK.set(s.k+'k');oP.set(s.p);
    track.classList.toggle('hot',hot);
  }
  put(FULL,true);
  btn.addEventListener('click',function(){
    if(busy)return;busy=true;btn.disabled=true;
    sweep.classList.remove('on');void sweep.offsetWidth;sweep.classList.add('on');
    note.classList.remove('on');
    setTimeout(function(){
      small=!small;
      put(small?SMALL:FULL,!small);
      note.textContent=small?'42 messages folded into 1 summary':'restored from summary';
      note.classList.add('on');
      btn.textContent=small?'Restore':'Compact';
    },420);
    setTimeout(function(){busy=false;btn.disabled=false},1100);
  });
})();

/* ═══ 02 · разрешение ═══ */
(function(){
  var perm=$('bPerm'),asks=$('bAsks'),run=$('bRun'),spin=$('bSpin'),lbl=$('bLbl'),
      time=$('bTime'),out=$('bOut'),reset=$('bReset'),ts=[];
  function clear(){ts.forEach(clearTimeout);ts=[]}
  function go(){
    clear();
    asks.classList.add('gone');
    ts.push(setTimeout(function(){run.classList.add('on')},220));
    [0,1,2].forEach(function(i){
      ts.push(setTimeout(function(){
        var l=document.createElement('div');l.className='oline';
        l.style.width=(46+Math.random()*48)+'%';out.appendChild(l);
      },520+i*230));
    });
    ts.push(setTimeout(function(){
      spin.classList.add('done');lbl.textContent='Done';
      time.textContent='1.2s';perm.classList.add('ok');
    },1320));
  }
  asks.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.go)go();else{asks.classList.add('gone');
      ts.push(setTimeout(function(){run.classList.add('on');lbl.textContent='Denied';
        spin.style.display='none'},220))}
  });
  reset.addEventListener('click',function(){
    clear();out.innerHTML='';asks.classList.remove('gone');run.classList.remove('on');
    spin.className='spin';spin.style.display='';lbl.textContent='Running';
    time.textContent='';perm.classList.remove('ok');
  });
})();

/* ═══ 03 · параллельные агенты ═══ */
(function(){
  var NAMES=['search-repo','run-tests','write-docs','lint-fix'];
  var host=$('cList'),btn=$('cBtn'),rows=[],raf=0;
  NAMES.forEach(function(n){
    var r=document.createElement('div');r.className='agent';
    r.innerHTML='<span class="adot"></span><span class="aname">'+n+'</span>'+
      '<span class="atrack"><span class="afill"></span></span><span class="atime"></span>';
    host.appendChild(r);
    rows.push({el:r,fill:r.querySelector('.afill'),t:r.querySelector('.atime'),p:0,sp:0});
  });
  function flip(fn){
    var was=rows.map(function(r){return r.el.getBoundingClientRect().top});
    fn();
    rows.forEach(function(r,i){
      var now=r.el.getBoundingClientRect().top,d=was[i]-now;
      if(!d)return;
      r.el.style.transition='none';r.el.style.transform='translateY('+d+'px)';
      requestAnimationFrame(function(){
        r.el.style.transition='';r.el.style.transform='';
      });
    });
  }
  var DUR=[2600,1200,3400,1900];
  btn.addEventListener('click',function(){
    cancelAnimationFrame(raf);
    rows.forEach(function(r,i){
      r.p=0;r.acc=0;r.dur=DUR[i]*(.88+Math.random()*.24);r.done=false;
      r.el.className='agent run';r.fill.style.width='0';r.t.textContent='';
    });
    flip(function(){NAMES.forEach(function(n,i){host.appendChild(rows[i].el)})});
    var last=performance.now();
    (function tick(now){
      var dt=Math.min(50,now-last);last=now;
      var alive=false;
      rows.forEach(function(r){
        if(r.done)return;
        r.acc+=dt;r.p=Math.min(1,r.acc/r.dur);
        r.fill.style.width=(r.p*100)+'%';
        if(r.p>=1){
          r.done=true;r.el.className='agent done';
          r.t.textContent=(r.dur/1000).toFixed(1)+'s';
          flip(function(){
            var above=rows.filter(function(x){return x.done&&x!==r});
            host.insertBefore(r.el,host.children[above.length]);
          });
        }else alive=true;
      });
      if(alive)raf=requestAnimationFrame(tick);
    })(performance.now());
  });
})();

/* ═══ 04 · выбор модели ═══ */
(function(){
  var M=[
    {n:'Haiku', speed:'320',cost:'0.25',sp:96,co:8,  note:'Fastest. Good for simple, high-volume tasks.'},
    {n:'Sonnet',speed:'180',cost:'3.00',sp:58,co:32, note:'Balanced. Default for most work.'},
    {n:'Opus',  speed:'74', cost:'15.00',sp:24,co:92,note:'Deepest reasoning. Slower and pricier.'}
  ];
  var ctl=$('dCtl'),pill=$('dPill'),note=$('dNote'),
      sF=$('dSpeedFill'),cF=$('dCostFill'),
      oS=new Odo($('dSpeed')),oC=new Odo($('dCost'));
  function pick(i){
    var m=M[i];
    pill.style.transform='translateX('+(i*100)+'%)';
    ctl.querySelectorAll('button').forEach(function(b,k){b.classList.toggle('on',k===i)});
    sF.style.width=m.sp+'%';cF.style.width=m.co+'%';
    oS.set(m.speed);oC.set(m.cost);
    note.style.opacity=0;
    setTimeout(function(){note.textContent=m.note;note.style.opacity=1},160);
  }
  ctl.addEventListener('click',function(e){
    var b=e.target.closest('button');if(b)pick(+b.dataset.i);
  });
  pick(1);
})();

/* тема */
var tctl=document.querySelector('.tools .seg-ctl');
tctl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  tctl.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');document.documentElement.setAttribute('data-theme',b.dataset.theme);
});
