// иконки, общие для всех четырёх баров
const IC={
  cal:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><path d="M4 13.5 6.5 5.5h11l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  note:'<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16 5l3 3L9 18z"/></svg>',
  list:'<svg viewBox="0 0 24 24"><path d="M10 7h10M10 12h10M10 17h10M4 7l1.3 1.3L7.5 6M4 12l1.3 1.3L7.5 11"/><circle cx="5.5" cy="17" r="1.3"/></svg>',
  photo:'<svg viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="17" height="12.5" rx="2.5"/><circle cx="12" cy="12.75" r="3.2"/><path d="M9 6.5l1.2-2h3.6l1.2 2"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M7 12h10"/></svg>',
  voice:'<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3"/></svg>',
  sketch:'<svg viewBox="0 0 24 24"><path d="M4 16c3-6 5-9 6.5-8s-2.5 7-.5 8 4-5 5.5-4.5S15 17 17 17s3-2 3-2"/></svg>'
};
const TABS=[['cal','Сегодня'],['inbox','Входящие'],['user','Люди'],['folder','Файлы']];
const ACTS=[['note','Note'],['list','Checklist'],['photo','Photo'],['scan','Scan'],['voice','Voice'],['sketch','Sketch']];
const ic=k=>`<span class="ic" aria-hidden="true">${IC[k]}</span>`;
const el=(tag,cls,html='')=>{const e=document.createElement(tag);if(cls)e.className=cls;e.innerHTML=html;return e};
const tabsHTML=(cls='tab')=>TABS.map(([k,l],i)=>`<button class="${cls}" role="tab" aria-label="${l}" aria-selected="${i===0}" data-i="${i}">${ic(k)}</button>`).join('');
const plusBtn=()=>{const b=el('button','plus surface',ic('plus'));b.setAttribute('aria-label','Создать');b.setAttribute('aria-expanded','false');return b};
const setOpenAttr=(st,plus,o)=>{st.classList.toggle('open',o);plus.setAttribute('aria-expanded',o)};
const select=(tabs,i)=>tabs.forEach((t,j)=>t.setAttribute('aria-selected',j===i));
const rnd=(a,b)=>a+Math.random()*(b-a);
const isGlass=()=>document.documentElement.dataset.style!=='flat';
// пружина: x тянется к target
const spring=(k,c)=>({x:0,v:0,target:0,k,c,step(dt){const a=-this.k*(this.x-this.target)-this.c*this.v;this.v+=a*dt;this.x+=this.v*dt}});
const loops=[];
let last=performance.now();
(function tick(t){const dt=Math.min(.033,(t-last)/1000);last=t;loops.forEach(f=>f(dt,t));requestAnimationFrame(tick)})(last);

// цветные фигуры за стеклом: без них стеклу нечего преломлять
const DECO=(W,H)=>[
  {x:W/2-159,y:H-159,w:128,h:128,r:64,rot:0,c:'#ff6b3d'},
  {x:W/2+20,y:H-196,w:112,h:112,r:28,rot:12,c:'#4767ff'},
  {x:W/2-40,y:H-74,w:150,h:36,r:18,rot:0,c:'#22b36b'}];
const decorate=st=>{const d=el('div','deco');d.setAttribute('aria-hidden','true');
  DECO(st.clientWidth,st.clientHeight).forEach(s=>{const i=el('i');Object.assign(i.style,{left:s.x+'px',top:s.y+'px',width:s.w+'px',height:s.h+'px',borderRadius:s.r+'px',background:s.c,transform:`rotate(${s.rot}deg)`});d.append(i)});
  st.prepend(d)};
document.querySelectorAll('.stage').forEach(decorate);

/* ───────── переключатель стиля ───────── */
(()=>{
  const sw=document.querySelector('.switch'),thumb=sw.querySelector('.switch__thumb'),btns=[...sw.querySelectorAll('button')];
  const place=()=>{const b=btns.find(b=>b.dataset.style===(isGlass()?'glass':'flat'));thumb.style.width=b.offsetWidth+'px';thumb.style.transform=`translateX(${b.offsetLeft-3}px)`;btns.forEach(x=>x.setAttribute('aria-checked',x===b))};
  const apply=s=>{document.documentElement.dataset.style=s;try{localStorage.setItem('tb-style',s)}catch(e){}place();document.dispatchEvent(new Event('stylechange'))};
  btns.forEach(b=>b.onclick=()=>{const s=b.dataset.style;if(s===document.documentElement.dataset.style)return;
    document.startViewTransition?document.startViewTransition(()=>apply(s)):apply(s)});
  sw.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const n=btns.find(b=>b.getAttribute('aria-checked')==='false');n.focus();n.click()}});
  document.fonts.ready.then(place);place();
})();

/* ───────── 01 запотевшее стекло ───────── */
document.fonts.load('600 30px Caveat').then(()=>{
  const st=document.getElementById('mist');
  const panel=el('div','mist-panel');
  panel.append(el('div','mist-under'));
  const fog=el('canvas');panel.append(fog);
  const acts=el('div','mist-acts',ACTS.map(([,l])=>`<button aria-label="${l}"></button>`).join(''));panel.append(acts);
  const bar=el('div','bar',tabsHTML());bar.setAttribute('role','tablist');panel.append(bar);
  st.append(panel);const plus=plusBtn();st.append(plus);

  const dpr=Math.min(2,devicePixelRatio||1);
  const PW=300,PH=230,BAR=174;
  // источник тумана: размытый фон в стекле, ровная серая плёнка во flat
  const src=document.createElement('canvas');
  const paintSource=()=>{
    const SW=st.clientWidth,SH=st.clientHeight;src.width=SW*dpr;src.height=SH*dpr;
    const s=src.getContext('2d');s.scale(dpr,dpr);
    if(!isGlass()){s.fillStyle='#ececea';s.fillRect(0,0,SW,SH);return}
    const g=s.createLinearGradient(0,0,SW*.35,SH);g.addColorStop(0,'#eceefe');g.addColorStop(.5,'#f6eef5');g.addColorStop(1,'#ecf5f0');s.fillStyle=g;s.fillRect(0,0,SW,SH);
    s.filter='blur(10px)';
    DECO(SW,SH).forEach(d=>{s.save();s.translate(d.x+d.w/2,d.y+d.h/2);s.rotate(d.rot*Math.PI/180);s.fillStyle=d.c;s.beginPath();s.roundRect(-d.w/2,-d.h/2,d.w,d.h,d.r);s.fill();s.restore()});
    s.filter='none';s.fillStyle='rgba(255,255,255,.62)';s.fillRect(0,0,SW,SH);
  };
  paintSource();document.addEventListener('stylechange',paintSource);

  fog.width=PW*dpr;fog.height=PH*dpr;
  const d=fog.getContext('2d');
  const mask=document.createElement('canvas');mask.width=fog.width;mask.height=fog.height;
  const m=mask.getContext('2d');m.scale(dpr,dpr);m.fillRect(0,0,PW,PH);
  const brush=document.createElement('canvas');brush.width=brush.height=60;
  const bc=brush.getContext('2d'),bgr=bc.createRadialGradient(30,30,0,30,30,30);
  bgr.addColorStop(0,'#000');bgr.addColorStop(.6,'rgba(0,0,0,.9)');bgr.addColorStop(1,'transparent');bc.fillStyle=bgr;bc.fillRect(0,0,60,60);
  const dab=(x,y,r)=>{m.globalCompositeOperation='destination-out';m.drawImage(brush,x-r,y-r,r*2,r*2);m.globalCompositeOperation='source-over'};

  const jobs=[],drips=[];
  const tabs=[...bar.children];let cur=0,open=false;
  const wipe=(i,inst)=>{
    select(tabs,i);
    const cx=PW/8*(2*i+1),cy=BAR+28;
    const path=[[-18,-6],[14,-9],[-14,4],[16,2],[-8,9],[10,7]];
    if(inst){path.forEach(([x,y])=>dab(cx+x,cy+y,19));return}
    jobs.push({t:0,dur:.3,f(p){const k=p*(path.length-1),a=path[Math.floor(k)],c=path[Math.min(path.length-1,Math.ceil(k))],f=k%1;dab(cx+a[0]+(c[0]-a[0])*f,cy+a[1]+(c[1]-a[1])*f,19)},
      end(){for(let n=0;n<2;n++)drips.push({x:cx+rnd(-16,16),y:cy+rnd(4,10),v:rnd(8,14),w:rnd(1.5,2.3)})}});
  };
  wipe(0,true);
  bar.addEventListener('click',e=>{const t=e.target.closest('.tab');if(!t)return;cur=+t.dataset.i;wipe(cur)});

  const write=(i,delay)=>{
    const [,label]=ACTS[i],cx=PW/6*(2*(i%3)+1),cy=i<3?66:136;
    jobs.push({t:-delay,dur:.4,f(p){m.save();m.font='600 30px Caveat';m.textAlign='center';const w=m.measureText(label).width;
      m.beginPath();m.rect(cx-w/2-4,cy-30,(w+8)*p,44);m.clip();m.globalCompositeOperation='destination-out';m.fillText(label,cx,cy);m.restore()}});
  };
  const setOpen=o=>{
    open=o;setOpenAttr(st,plus,o);
    if(o){
      // дыхание: туман набегает от плюса
      jobs.push({t:0,dur:.45,f(p){m.globalAlpha=.25;m.beginPath();m.arc(PW+20,PH,40+p*360,0,7);m.fill();m.globalAlpha=1}});
      ACTS.forEach((_,i)=>write(i,.35+i*.14));
    }else setTimeout(()=>{if(!open){m.fillRect(0,0,PW,BAR);wipe(cur)}},560);
  };
  plus.onclick=()=>setOpen(!open);
  acts.onclick=()=>setOpen(false);

  loops.push(dt=>{
    // туман медленно возвращается везде
    m.fillStyle='rgba(0,0,0,.0016)';m.fillRect(0,0,PW,PH);m.fillStyle='#000';
    for(let i=jobs.length-1;i>=0;i--){const j=jobs[i];j.t+=dt;if(j.t<0)continue;const p=Math.min(1,j.t/j.dur);j.f(p);if(p>=1){j.end&&j.end();jobs.splice(i,1)}}
    for(let i=drips.length-1;i>=0;i--){const q=drips[i];q.y+=q.v*dt;dab(q.x,q.y,q.w*1.4);if(q.y>PH-3)drips.splice(i,1)}
    d.globalCompositeOperation='source-over';d.clearRect(0,0,fog.width,fog.height);
    d.drawImage(src,panel.offsetLeft*dpr,panel.offsetTop*dpr,fog.width,fog.height,0,0,fog.width,fog.height);
    d.globalCompositeOperation='destination-in';d.drawImage(mask,0,0);
    d.globalCompositeOperation='source-over';
    // в стекле сверху ещё блик по краю
    if(isGlass()){d.strokeStyle='rgba(255,255,255,.7)';d.lineWidth=dpr;d.beginPath();d.roundRect(dpr/2,dpr/2,fog.width-dpr,fog.height-dpr,28*dpr);d.stroke()}
  });
});

/* ───────── 02 ящик на рычагах ───────── */
(()=>{
  const st=document.getElementById('tool');
  const cells=a=>a.map(([k,l])=>`<button class="tb-cell">${ic(k)}${l}</button>`).join('');
  const A=el('div','tb-tray surface a',cells(ACTS.slice(0,3))),B=el('div','tb-tray surface b',cells(ACTS.slice(3)));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('tb-arms');svg.setAttribute('aria-hidden','true');
  const box=el('div','tb-box surface','<div class="tb-plate"></div>'+tabsHTML());box.setAttribute('role','tablist');
  const plus=plusBtn();st.append(A,B,svg,box,plus);
  const plate=box.querySelector('.tb-plate'),tabs=[...box.querySelectorAll('.tab')];
  const sel=i=>{plate.style.transform=`translateX(${75*i+6}px)`;select(tabs,i)};sel(0);
  box.addEventListener('click',e=>{const t=e.target.closest('.tab');if(t)sel(+t.dataset.i)});

  const s=spring(90,11);let open=false,dropped=false,slips=[],count=43;
  const toggle=()=>{open=!open;setOpenAttr(st,plus,open);s.target=open?1:0;
    if(!open){slips.forEach(q=>{q.e.style.opacity=0;setTimeout(()=>q.e.remove(),300)});slips=[];dropped=false}};
  plus.onclick=toggle;A.onclick=B.onclick=e=>{if(e.target.closest('.tb-cell'))toggle()};
  const RB=60,RA=70;
  loops.push(dt=>{
    s.step(dt);const k=Math.max(0,s.x),a=k*Math.PI/2;
    // B ходит по дуге вокруг оси справа, A по дуге вокруг оси на B слева
    const bx=RB*(1-Math.cos(a)),by=-RB*Math.sin(a);
    const ax=bx-RA*(1-Math.cos(a)),ay=by-RA*Math.sin(a);
    B.style.transform=`translate(${bx}px,${by}px)`;A.style.transform=`translate(${ax}px,${ay}px)`;
    const L=box.offsetLeft,T=box.offsetTop+28,col=getComputedStyle(st).getPropertyValue('--arm');
    const arm=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
    let h='';
    if(k>.01)[40,260].forEach(o=>{h+=arm(L+o+RB,T,L+o+bx,T+by)+arm(L+o+bx-RA,T+by,L+o+ax,T+ay)});
    svg.innerHTML=h;
    // заметки высыпаются, когда верхний лоток почти раскрылся
    if(open&&!dropped&&k>.8){dropped=true;
      for(let n=0;n<4;n++){const e=el('div','slip surface',`Untitled ${count++}`);st.append(e);
        slips.push({e,x:L+ax+30+n*60,y:T+ay-10,vx:rnd(-80,80),vy:rnd(-240,-120),r:rnd(-10,10),vr:rnd(-90,90),floor:st.clientHeight-22-rnd(0,6),rest:false})}}
    slips.forEach(q=>{if(q.rest)return;q.vy+=1500*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.r+=q.vr*dt;
      if(q.y>q.floor){q.y=q.floor;q.vy*=-.25;q.vx*=.5;q.vr*=.4;if(Math.abs(q.vy)<40)q.rest=true}
      q.e.style.transform=`translate(${q.x}px,${q.y}px) rotate(${q.r}deg)`});
  });
})();

/* ───────── 03 мыльный пузырь ───────── */
(()=>{
  const st=document.getElementById('bub');
  const bar=el('div','bar surface',tabsHTML());bar.setAttribute('role','tablist');
  const small=el('div','film bub-sm');bar.prepend(small);
  const tabs=[...bar.querySelectorAll('.tab')];
  const big=el('div','film bub-big'),acts=el('div','bub-acts');
  ACTS.forEach(([k,l],i)=>{const a=el('button','bub-act',ic(k)+l);const ang=-Math.PI/2+i*Math.PI/3;
    a.style.left=`calc(50% + ${Math.cos(ang)*70}px - 32px)`;a.style.top=`calc(50% + ${Math.sin(ang)*70}px - 20px)`;a.style.animationDelay=`${-i*.4}s`;acts.append(a)});
  big.append(acts);
  const plus=plusBtn();st.append(big,bar,plus);
  const cx=i=>75*i+37.5-31;
  const x=spring(260,17),blow=spring(140,7),bs=spring(120,9);
  x.x=x.target=cx(0);blow.x=blow.target=1;
  let lastClick=0,popped=false,open=false;
  const drops=[];
  const burst=(X,Y,n,R,up)=>{for(let k=0;k<n;k++){const e=el('div','drop'),a=rnd(0,7);st.append(e);
    drops.push({e,x:X+Math.cos(a)*R,y:Y+Math.sin(a)*R,vx:Math.cos(a)*rnd(40,160),vy:Math.sin(a)*rnd(40,160)-up,life:0,floor:st.clientHeight-84})}};
  bar.addEventListener('click',e=>{const t=e.target.closest('.tab');if(!t)return;const now=performance.now();
    x.target=cx(+t.dataset.i);select(tabs,+t.dataset.i);
    if(!popped&&now-lastClick<380){
      // слишком быстро, пузырь лопнул
      popped=true;blow.x=blow.target=0;blow.v=0;
      burst(bar.offsetLeft+x.x+31,bar.offsetTop+28,12,20,80);
      setTimeout(()=>{x.x=x.target;x.v=0;blow.target=1;popped=false},900);
    }
    lastClick=now});
  const toggle=()=>{open=!open;setOpenAttr(st,plus,open);
    if(open){bs.target=1}else{bs.x=bs.target=0;bs.v=0;burst(st.clientWidth/2,st.clientHeight-100-118,30,114,20)}};
  plus.onclick=toggle;acts.onclick=toggle;
  loops.push(dt=>{
    x.step(dt);blow.step(dt);bs.step(dt);
    if(popped)x.x=x.target;
    const str=Math.min(.35,Math.abs(x.v)/1600),b=Math.max(0,blow.x);
    small.style.transform=`translateX(${x.x}px) scale(${(1+str)*b},${(1-str*.6)*b})`;
    const k=Math.max(0,bs.x);big.style.transform=`translate(${(1-k)*140}px,${(1-k)*90}px) scale(${k})`;
    for(let i=drops.length-1;i>=0;i--){const q=drops[i];q.vy+=900*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life+=dt;
      q.e.style.transform=`translate(${q.x}px,${q.y}px)`;
      if(q.y>q.floor||q.life>1.4){q.e.animate([{transform:`translate(${q.x}px,${q.y}px) scale(1.6,.5)`,opacity:.8},{transform:`translate(${q.x}px,${q.y}px) scale(2.4,.2)`,opacity:0}],{duration:220}).onfinish=()=>q.e.remove();drops.splice(i,1)}}
  });
})();

/* ───────── 04 формочка для льда ───────── */
(()=>{
  const st=document.getElementById('ice');
  const tray=el('div','ice-tray surface',tabsHTML('well tab'));tray.setAttribute('role','tablist');
  [...tray.children].forEach(w=>w.insertAdjacentHTML('afterbegin','<span class="cube"></span>'));
  const plus=plusBtn();st.append(tray,plus);
  const wells=[...tray.children];
  tray.addEventListener('click',e=>{const t=e.target.closest('.well');if(t&&!open)select(wells,+t.dataset.i)});
  let open=false,cubes=[],busy=false;
  const slot=i=>{const W=st.clientWidth,H=st.clientHeight;return[W/2-128+(i%3)*90,H-28-56-28-(i<3?2:1)*76]};
  const toggle=()=>{if(busy)return;open=!open;setOpenAttr(st,plus,open);busy=true;setTimeout(()=>busy=false,open?1700:900);
    if(open){
      tray.animate([{transform:'none'},{transform:'perspective(400px) rotateY(-12deg) skewY(-2.5deg)'},{transform:'perspective(400px) rotateY(12deg) skewY(2.5deg)'},{transform:'none'}],{duration:500,easing:'ease-in-out'});
      const tx=tray.offsetLeft,ty=tray.offsetTop;
      cubes=ACTS.map(([k,l],i)=>{
        const c=el('button','fly',ic(k)+l);c.onclick=toggle;st.append(c);
        const [sx,sy]=[tx+40+i*40,ty-4],[ex,ey]=slot(i),late=i===4;
        const kf=[{transform:`translate(${sx}px,${sy}px) scale(.55)`,opacity:late?1:0},
          ...(late?[{transform:`translate(${sx-3}px,${sy}px) scale(.55) rotate(-4deg)`,opacity:1,offset:.12},{transform:`translate(${sx+3}px,${sy}px) scale(.55) rotate(4deg)`,opacity:1,offset:.24},{transform:`translate(${sx-3}px,${sy}px) scale(.55) rotate(-4deg)`,opacity:1,offset:.36},{transform:`translate(${sx}px,${sy}px) scale(.55)`,opacity:1,offset:.45}]:[{opacity:1,transform:`translate(${sx}px,${sy-10}px) scale(.6)`,offset:.1}]),
          {transform:`translate(${(sx+ex)/2}px,${ey-70}px) scale(.95) rotate(${rnd(-25,25)}deg)`,opacity:1,offset:late?.72:.55},
          {transform:`translate(${ex}px,${ey}px) scale(1.08,.88)`,opacity:1,offset:late?.9:.82},
          {transform:`translate(${ex}px,${ey}px)`,opacity:1}];
        c.animate(kf,{duration:late?1400:700,delay:late?250:380+i*45,easing:'cubic-bezier(.3,.6,.4,1)',fill:'both'});
        return c});
    }else{
      cubes.forEach((c,i)=>{const [ex,ey]=slot(i),tx=tray.offsetLeft+40+(i%4)*70,ty=tray.offsetTop;
        c.animate([{transform:`translate(${ex}px,${ey}px)`,filter:'blur(0)',opacity:1},
          {transform:`translate(${ex}px,${ey+20}px) scale(1.15,.35)`,filter:'blur(2px)',opacity:.7,offset:.5},
          {transform:`translate(${tx}px,${ty}px) scale(.2,.2)`,filter:'blur(3px)',opacity:0}],{duration:700,delay:i*35,easing:'ease-in',fill:'both'}).onfinish=()=>c.remove()});
      cubes=[];
    }};
  plus.onclick=toggle;
})();
