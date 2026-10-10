'use strict';
/* ─────────── общее ─────────── */
const W=300,H=400;
const FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
const C={};
const KEYS=['card','ink','sub','line','blue','recv','ghost','eye','dot','plus','bub','bar','btn','btnInk','red','wall',
  'ic1','ic2','ic3','glyph','dock','lbl','noti','lockBtn','touch','touchS'];
function readColors(){const s=getComputedStyle(document.documentElement);KEYS.forEach(k=>C[k]=s.getPropertyValue('--c-'+k).trim())}

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const eo=t=>1-Math.pow(1-t,3);
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const spring=(s,z=5,w=11)=>s<=0?0:1-Math.exp(-z*s)*Math.cos(w*s);
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hex(c){const n=parseInt(c.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function mix(a,b,t){const A=hex(a),B=hex(b);return'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],clamp(t)))).join(',')+')'}

function font(sz,wt){return(wt||400)+' '+sz+'px '+FONT}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function txt(ctx,s,x,y,sz,col,wt,align){ctx.font=font(sz,wt);ctx.fillStyle=col;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function tw(ctx,s,sz,wt){ctx.font=font(sz,wt);return ctx.measureText(s).width}
function dot(ctx,x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}

function statusBar(ctx,time,col){
  const c=col||C.ink;
  if(time)txt(ctx,time,32,19,12,c,600,'center');
  ctx.fillStyle='#000';rr(ctx,W/2-38,7,76,22,11);ctx.fill();
  ctx.fillStyle=c;
  for(let i=0;i<4;i++){rr(ctx,W-72+i*4,21-i*2,2.6,3+i*2,.8);ctx.fill()}
  ctx.strokeStyle=c;ctx.globalAlpha=.4;ctx.lineWidth=1;rr(ctx,W-48.5,14.5,21,10,3);ctx.stroke();ctx.globalAlpha=1;
  rr(ctx,W-47,16,14,7,1.6);ctx.fill();
}
function homeBar(ctx,col){ctx.fillStyle=col||C.ink;rr(ctx,W/2-48,H-7,96,3.5,2);ctx.fill()}
function finger(ctx,x,y,a,press){
  if(a<=0)return;ctx.globalAlpha=a;
  ctx.fillStyle=C.touch;ctx.strokeStyle=C.touchS;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(x,y,17-3*(press||0),0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=1;
}

/* iMessage */
function header(ctx,name,ava,time){
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,80);
  statusBar(ctx,time||'9:41');
  ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(22,40);ctx.lineTo(15,47);ctx.lineTo(22,54);ctx.stroke();
  const a=ava==null?1:ava;
  ctx.globalAlpha=a;dot(ctx,W/2,46,15,'#a4a7b0');txt(ctx,name[0],W/2,46.5,13,'#fff',600,'center');ctx.globalAlpha=1;
  if(a<1){ctx.globalAlpha=1-a;ctx.setLineDash([2.5,2.6]);ctx.strokeStyle=C.sub;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(W/2,46,15,0,7);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1}
  txt(ctx,name,W/2,70,10,C.ink,400,'center');
  ctx.fillStyle=C.line;ctx.fillRect(0,80,W,.7);
}
function composer(ctx,text,ta){
  ctx.fillStyle=C.card;ctx.fillRect(0,H-52,W,52);
  dot(ctx,26,H-28,13,C.plus);
  ctx.strokeStyle=C.sub;ctx.lineWidth=1.6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(26,H-33);ctx.lineTo(26,H-23);ctx.moveTo(21,H-28);ctx.lineTo(31,H-28);ctx.stroke();
  ctx.strokeStyle=C.line;ctx.lineWidth=1;rr(ctx,46.5,H-42.5,W-60,29,14.5);ctx.stroke();
  const a=text?clamp(ta==null?1:ta):0;
  if(a<1)txt(ctx,'Message',58,H-28,14,C.sub);
  if(a>0){
    ctx.fillStyle=C.card;ctx.globalAlpha=a;rr(ctx,52,H-40,W-72,25,12);ctx.fill();
    txt(ctx,text,58,H-28,14,C.ink);
    dot(ctx,W-29,H-28,11,C.blue);
    ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.beginPath();
    ctx.moveTo(W-29,H-23);ctx.lineTo(W-29,H-33);ctx.moveTo(W-33.5,H-28.5);ctx.lineTo(W-29,H-33);ctx.lineTo(W-24.5,H-28.5);ctx.stroke();
    ctx.globalAlpha=1;
  }
  homeBar(ctx);
}
function stamp(ctx,b,r,y){
  const w1=tw(ctx,b+' ',10,600),w2=tw(ctx,r,10),x=W/2-(w1+w2)/2;
  txt(ctx,b,x,y,10,C.sub,600);txt(ctx,r,x+w1,y,10,C.sub);
}
function bubble(ctx,x,y,w,h,me,col,tail){
  ctx.fillStyle=col||(me?C.blue:C.recv);
  rr(ctx,x,y,w,h,Math.min(15,h/2));ctx.fill();
  if(tail===false)return;
  const by=y+h;ctx.beginPath();
  if(me){const bx=x+w;ctx.moveTo(bx-10,by-7);ctx.quadraticCurveTo(bx-1,by-2,bx+4,by+.5);ctx.quadraticCurveTo(bx-6,by+1.2,bx-15,by-3)}
  else{ctx.moveTo(x+10,by-7);ctx.quadraticCurveTo(x+1,by-2,x-4,by+.5);ctx.quadraticCurveTo(x+6,by+1.2,x+15,by-3)}
  ctx.closePath();ctx.fill();
}
function msgW(ctx,s){return tw(ctx,s,14)+24}
function msgAt(ctx,s,x,y,me,a,tail,h,shrink){
  h=h||30;const w=msgW(ctx,s)-(shrink||0);
  ctx.globalAlpha=a==null?1:a;
  bubble(ctx,x,y,w,h,me,null,tail);
  txt(ctx,s,x+12-(shrink||0)/2,y+h/2+.5,14,me?'#fff':C.ink);
  ctx.globalAlpha=1;return{x,y,w,h};
}
function msg(ctx,s,y,me,a,tail){const w=msgW(ctx,s);return msgAt(ctx,s,me?W-14-w:14,y,me,a,tail)}

/* ═════════ 01 · Pushover ═════════ */
const PUSH={P:8,st:{idx:0,prev:0,tc:-1e9,drag:null,rel:null}};
const PUSH_S=['No. 2 + 2 = 4.','Well, it depends.','Fair point. Could be 5.','You’re absolutely right!'];
const PUSH_L=[{y:152,txt:1},{y:184,w:236},{y:204,w:212},{y:224,w:150}];
const P_ROOT=300,P_H=P_ROOT-152,P_MAX=74;
function pushB(t){
  if(t<1.4)return 0;
  if(t<4.4){const p=seg(t,1.4,4.4);return P_MAX*eio(p)+1.4*Math.sin(t*26)*p}
  if(t<5.2)return P_MAX+1.4*Math.sin(t*26);
  const s=t-5.2;return P_MAX*Math.exp(-3.3*s)*Math.cos(8.5*s);
}
function bendAt(B,y){
  const k=(P_ROOT-y)/P_H;
  return{dx:B*k*k,dy:B*B/P_H*k*k*k*.22,ang:Math.atan(2*B*k/P_H)*.32};
}
PUSH.draw=function(ctx,t,now){
  const st=this.st;
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  statusBar(ctx,'9:41');
  txt(ctx,'New chat',W/2,52,12.5,C.ink,600,'center');
  const ut='2 + 2 = 5',uw=tw(ctx,ut,14)+26;
  ctx.fillStyle=C.bub;rr(ctx,W-16-uw,92,uw,32,16);ctx.fill();
  txt(ctx,ut,W-16-uw+13,108.5,14,C.ink);

  // откуда берётся изгиб: палец, отпущенная пружина или сценарий
  let Bf=null,fx=0,fy=0,fa=0,fp=0;
  if(st.drag){const B=st.drag.B;Bf=()=>B;fx=st.drag.x;fy=st.drag.y;fa=1;fp=1}
  else if(st.rel){
    const s=(now-st.rel.t)/1000;
    if(s>1.9){st.rel=null;this.t0=now;t=0}
    else{const B0=st.rel.B;Bf=d=>{const q=Math.max(0,s-d);return B0*Math.exp(-3.3*q)*Math.cos(8.5*q)}}
  }
  const auto=!Bf;
  if(auto)Bf=d=>pushB(Math.max(0,t-d));

  const Btop=Bf(0),a=Math.abs(Btop),idx=a<18?0:a<38?1:a<58?2:3;
  if(idx!==st.idx){st.prev=st.idx;st.idx=idx;st.tc=now}
  PUSH_L.forEach(L=>{
    const k=(P_ROOT-L.y)/P_H,b=bendAt(Bf(.08*(1-k)),L.y);
    ctx.save();ctx.translate(20+b.dx,L.y+b.dy);ctx.rotate(b.ang);
    if(L.txt){
      const p=clamp((now-st.tc)/170);
      if(p<1){ctx.globalAlpha=1-p;txt(ctx,PUSH_S[st.prev],0,-7*p,15,C.ink,500)}
      ctx.globalAlpha=p;txt(ctx,PUSH_S[st.idx],0,7*(1-p),15,C.ink,500);ctx.globalAlpha=1;
    }else{ctx.fillStyle=C.bar;rr(ctx,0,-4,L.w,8,4);ctx.fill()}
    ctx.restore();
  });

  if(auto){
    const b=bendAt(Btop,152);
    fx=20+b.dx+128*Math.cos(b.ang);fy=152+b.dy+128*Math.sin(b.ang);
    fa=seg(t,1.0,1.25)*(1-seg(t,5.2,5.45));fp=seg(t,1.25,1.4);
    if(t>5.2)fy-=10*seg(t,5.2,5.45);
  }
  // поле ввода
  ctx.strokeStyle=C.line;ctx.lineWidth=1;rr(ctx,14.5,H-58.5,W-29,40,20);ctx.stroke();
  txt(ctx,'Ask anything',30,H-38.5,13,C.sub);
  dot(ctx,W-36,H-38.5,13,C.btn);
  ctx.strokeStyle=C.btnInk;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  ctx.moveTo(W-36,H-33);ctx.lineTo(W-36,H-44);ctx.moveTo(W-40.5,H-39.5);ctx.lineTo(W-36,H-44);ctx.lineTo(W-31.5,H-39.5);ctx.stroke();
  homeBar(ctx);
  finger(ctx,fx,fy,fa,fp);
};

/* ═════════ 02 · Unsend ═════════ */
const UNS={P:8};
UNS.draw=function(ctx,t){
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  const out=1-seg(t,7.35,7.85);
  stamp(ctx,'Today','2:13 AM',96);
  msg(ctx,'night :)',108,false);
  msg(ctx,'night',146,true,1,false);

  const s='i miss us',bw=msgW(ctx,s),slotX=W-14-bw,slotY=188;
  const x0=46,y0=H-43,yHold=272,yCreep=228,TS=5.4;
  // подпись и ответ
  const ly=slotY+41;
  if(t>=5.85){
    const r=seg(t,6.35,6.5);
    ctx.globalAlpha=out*(1-r);txt(ctx,'Delivered',W-16,ly,10,C.sub,500,'right');
    ctx.globalAlpha=out*r;txt(ctx,'Read 2:14 AM',W-16,ly,10,C.sub,500,'right');ctx.globalAlpha=1;
  }
  if(t>=6.9){
    const sc=spring(t-6.9,7,14);
    ctx.save();ctx.translate(14,slotY+84);ctx.scale(sc,sc);msgAt(ctx,'lol what',0,-30,false,out);ctx.restore();
  }
  composer(ctx,t<.55||t>7.35?s:'',t<.55?1:seg(t,7.35,7.85));

  // где пузырь
  let bx=null,by=0,lw=5;
  if(t>=.55){
    if(t<1.45){const p=spring(t-.55,6,12);bx=lerp(x0,slotX,eo(seg(t,.55,.85)));by=lerp(y0,slotY,p)}
    else if(t<1.95){bx=slotX;by=lerp(slotY,yHold,eio(seg(t,1.45,1.95)))}
    else if(t<TS){const p=seg(t,1.95,TS);by=lerp(yHold,yCreep,Math.pow(p,1.6))+Math.sin(t*31)*.8*p;bx=slotX+Math.sin(t*47)*.9*p;lw=lerp(5,1.2,p)}
    else{bx=slotX;by=lerp(yCreep,slotY,spring(t-TS,5,13))}
  }
  // резинка
  const A={x:W-29,y:H-28};
  if(bx!=null){
    const E={x:bx+bw-9,y:by+26};
    if(t<TS){
      const d=Math.hypot(E.x-A.x,E.y-A.y),sag=16*(1-clamp(d/260));
      ctx.strokeStyle=C.blue;ctx.lineWidth=lw;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.quadraticCurveTo((A.x+E.x)/2+6,(A.y+E.y)/2+sag,E.x,E.y);ctx.stroke();
    }else if(t<TS+.4){
      const p=eo(seg(t,TS,TS+.35)),M={x:(A.x+W-23-bw+bw)/2,y:(A.y+yCreep+26)/2},wig=Math.sin(t*55)*(1-p)*4;
      ctx.strokeStyle=C.blue;ctx.lineWidth=1.2;ctx.lineCap='round';ctx.globalAlpha=1-p*.6;
      const e1={x:lerp(M.x,A.x,p)+wig,y:lerp(M.y,A.y,p)},e2={x:lerp(M.x,E.x,p)-wig,y:lerp(M.y,E.y,p)};
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(e1.x,e1.y);ctx.moveTo(E.x,E.y);ctx.lineTo(e2.x,e2.y);ctx.stroke();ctx.globalAlpha=1;
    }
    msgAt(ctx,s,bx,by,true,out);
  }
  // тост с отсчётом
  const ta=seg(t,.6,.8)*(1-seg(t,TS,TS+.15));
  if(ta>0){
    const tw0=124,tx=W/2-tw0/2,ty=H-80;
    ctx.globalAlpha=ta;ctx.fillStyle=C.card;ctx.strokeStyle=C.line;ctx.lineWidth=1;
    rr(ctx,tx,ty,tw0,26,13);ctx.fill();ctx.stroke();
    txt(ctx,'Undo Send',tx+13,ty+13.5,11.5,C.blue,600);
    const q=clamp((t-.6)/4.8),n=Math.max(1,Math.ceil(5-q*5));
    ctx.strokeStyle=C.line;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(tx+tw0-16,ty+13,7.5,0,7);ctx.stroke();
    ctx.strokeStyle=C.blue;ctx.beginPath();ctx.arc(tx+tw0-16,ty+13,7.5,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-q));ctx.stroke();
    txt(ctx,String(n),tx+tw0-16,ty+13.5,9,C.ink,600,'center');ctx.globalAlpha=1;
  }
  header(ctx,'Jordan');
  // палец: тап по send, потом держит пузырь и соскальзывает
  let fa=0,fx=0,fy=0,fp=0;
  if(t<.75){fa=seg(t,.12,.28)*(1-seg(t,.55,.75));fx=A.x+2;fy=A.y+2;fp=seg(t,.3,.42)*(1-seg(t,.5,.6))}
  else if(t>=1.1&&bx!=null&&t<TS+.3){
    fa=seg(t,1.1,1.3)*(1-seg(t,TS,TS+.25));fp=seg(t,1.3,1.45);
    fx=bx+bw*.45;fy=(t<TS?by:yCreep)+15+(t>=TS?32*eo(seg(t,TS,TS+.25)):0);
  }
  finger(ctx,fx,fy,fa,fp);
};

/* ═════════ 03 · Badge ═════════ */
const BAD={P:7,st:{n:-1,pulse:-1e9}};
const GRID=[],TI=5;
(function(){const r=rng(11);for(let row=0;row<4;row++)for(let col=0;col<4;col++)
  GRID.push({x:26+col*66,y:50+row*66,c:1+Math.floor(r()*3),g:Math.floor(r()*3),lw:20+r()*18})})();
function icon(ctx,g,hero){
  ctx.fillStyle=hero?C.blue:C['ic'+g.c];rr(ctx,-25,-25,50,50,12);ctx.fill();
  if(hero){
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,-1,14,11.5,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(-9,6);ctx.quadraticCurveTo(-10,12,-15,13);ctx.quadraticCurveTo(-7,13,-3,9);ctx.fill();
    return;
  }
  ctx.fillStyle=C.glyph;
  if(g.g===0){ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.fill()}
  else if(g.g===1){rr(ctx,-9,-9,18,18,5);ctx.fill()}
  else{rr(ctx,-11,-6,22,4.5,2.2);ctx.fill();rr(ctx,-11,2,15,4.5,2.2);ctx.fill()}
}
BAD.draw=function(ctx,t,now){
  const st=this.st;
  ctx.fillStyle=C.wall;ctx.fillRect(0,0,W,H);
  statusBar(ctx,'9:41');
  let n,m,bs=1;
  if(t<3.6){n=Math.round(Math.exp(Math.log(99)*t/3.6));m=Math.pow(t/3.6,1.5)}
  else if(t<4.6){n=100;m=1+.08*eo(seg(t,3.6,4.6))}
  else{const s=t-4.6;n=0;m=1.08*Math.exp(-4*s)*Math.cos(10*s)}
  if(t>=5.9)n=1;
  if(n!==st.n){st.n=n;if(n>0)st.pulse=now}
  if(t<4.6)bs=1+.14*Math.exp(-(now-st.pulse)/90);
  else if(t<4.78){const p=seg(t,4.6,4.78);bs=(1+.25*Math.sin(p*Math.PI))*(1-p)}
  else if(t<5.9)bs=0;
  else bs=spring(t-5.9,6,13);
  const label=n>99?'99+':String(n);

  const T=GRID[TI],tx=T.x+25,ty=T.y+25;
  const order=GRID.map((g,i)=>i).filter(i=>i!==TI).concat(TI);
  order.forEach(i=>{
    const g=GRID[i],cx=g.x+25,cy=g.y+25;let ox=0,oy=0,ang=0,sc=1;
    if(i===TI){oy=26*m;sc=1+.05*m}
    else{
      const dx=cx-tx,dy=cy-(ty+30*Math.max(0,m)),d=Math.hypot(dx,dy)||1,f=Math.exp(-d/100)*m;
      ox=-dx/d*16*f;oy=-dy/d*16*f+8*f;ang=-.14*f*dx/d;
    }
    ctx.save();ctx.translate(cx+ox,cy+oy);ctx.rotate(ang);ctx.scale(sc,sc);
    icon(ctx,g,i===TI);
    ctx.fillStyle=C.lbl;rr(ctx,-g.lw/2,31,g.lw,3.5,1.75);ctx.fill();
    if(i===TI&&bs>0.01){
      const bw=Math.max(19,tw(ctx,label,10.5,600)+11);
      ctx.save();ctx.translate(22,-22);ctx.scale(bs,bs);
      ctx.fillStyle=C.red;rr(ctx,-bw/2,-9.5,bw,19,9.5);ctx.fill();
      txt(ctx,label,0,.5,10.5,'#fff',600,'center');ctx.restore();
    }
    ctx.restore();
  });
  // точки страниц и док
  for(let i=0;i<3;i++){ctx.globalAlpha=i?0.3:0.8;dot(ctx,W/2-10+i*10,H-87,2.4,C.ink)}ctx.globalAlpha=1;
  ctx.fillStyle=C.dock;rr(ctx,10,H-77,W-20,64,26);ctx.fill();
  for(let i=0;i<4;i++){ctx.save();ctx.translate(51+i*66,H-45);icon(ctx,{c:1+(i*2)%3,g:(i+1)%3},false);ctx.restore()}
  homeBar(ctx);
  // свайп вверх по иконке
  const fa=seg(t,4.2,4.35)*(1-seg(t,4.62,4.82)),fp=seg(t,4.35,4.45);
  finger(ctx,tx+4,ty+26*m+6-46*eio(seg(t,4.45,4.8)),fa,fp);
};

/* ═════════ 04 · Fall back ═════════ */
const FAL={P:8};
function falM(t){
  if(t<.5)return 58;if(t<.9)return 58+eio(seg(t,.5,.9));
  if(t<1.5)return 59;if(t<2)return 59+eio(seg(t,1.5,2));
  if(t<4.7)return 60;
  if(t<6.7){const L=60+58*seg(t,4.7,6.7),b=Math.floor(L);return b+eio(clamp((L-b-.45)/.55))}
  return 118;
}
function falH(t){
  if(t<1.5)return 1;if(t<2)return 1+.5*eo(seg(t,1.5,2));
  return 1+.5*(1-spring(t-2,6,15));
}
function rollDigit(ctx,x,y,dw,val,mod,sz,col){
  const S=sz*1.12,b=Math.floor(val),f=val-b,d0=((b%mod)+mod)%mod,d1=(d0+1)%mod;
  ctx.save();ctx.beginPath();ctx.rect(x-2,y-S/2,dw+4,S);ctx.clip();
  txt(ctx,String(d0),x+dw/2,y-f*S,sz,col,700,'center');
  if(f>.001)txt(ctx,String(d1),x+dw/2,y+(1-f)*S,sz,col,700,'center');
  ctx.restore();
}
FAL.draw=function(ctx,t){
  ctx.fillStyle=C.wall;ctx.fillRect(0,0,W,H);
  const dim=seg(t,4.3,4.8)*(1-seg(t,6.8,7.3));
  ctx.fillStyle='#000';ctx.globalAlpha=.74*dim;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  const ink=dim>.5?'#f5f5f7':C.ink;
  statusBar(ctx,'',dim>.5?'#f5f5f7':C.ink);
  ctx.globalAlpha=1-.45*dim;
  // замок
  ctx.strokeStyle=ink;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(W/2,44,4,Math.PI,0);ctx.stroke();
  ctx.fillStyle=ink;rr(ctx,W/2-6.5,44,13,9.5,2.2);ctx.fill();
  txt(ctx,'Sunday, October 25',W/2,74,13,ink,600,'center');
  // часы
  const sz=84,dw=tw(ctx,'0',sz,700),cw=tw(ctx,':',sz,700),tot=dw*3+cw,x=W/2-tot/2,y=128;
  const M=falM(t),tens=Math.floor(M/10)+clamp(M-Math.floor(M/10)*10-9);
  rollDigit(ctx,x,y,dw,falH(t),10,sz,ink);
  txt(ctx,':',x+dw+cw/2,y-5,sz,ink,700,'center');
  rollDigit(ctx,x+dw+cw,y,dw,tens,6,sz,ink);
  rollDigit(ctx,x+dw*2+cw,y,dw,M,10,sz,ink);
  ctx.globalAlpha=1;
  // режим сна
  if(dim>0){
    ctx.globalAlpha=dim;const pw=62,px=W/2-pw/2,py=184;
    ctx.fillStyle='rgba(255,255,255,.14)';rr(ctx,px,py,pw,22,11);ctx.fill();
    dot(ctx,px+15,py+11,5,'#f5f5f7');dot(ctx,px+17.5,py+9,4.3,'#3a3a3a');
    txt(ctx,'Sleep',px+25,py+11.5,10.5,'#f5f5f7',600);ctx.globalAlpha=1;
  }
  // уведомление
  const na=seg(t,2.45,2.7)*(1-seg(t,4.05,4.35));
  if(na>0){
    const ny=H-152+(1-spring(t-2.45,6,12))*36+10*seg(t,4.05,4.35);
    ctx.globalAlpha=na;ctx.fillStyle=C.noti;rr(ctx,12,ny,W-24,58,18);ctx.fill();
    ctx.fillStyle='#111';rr(ctx,23,ny+13,32,32,8);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(39,ny+29,10,0,7);ctx.stroke();
    ctx.beginPath();ctx.moveTo(39,ny+29);ctx.lineTo(39,ny+22.5);ctx.moveTo(39,ny+29);ctx.lineTo(34.5,ny+29);ctx.stroke();
    txt(ctx,'Clock',64,ny+20,11.5,C.ink,600);txt(ctx,'now',W-24,ny+20,10,C.sub,400,'right');
    txt(ctx,'Time changed. You got an extra hour.',64,ny+38,11,C.ink);ctx.globalAlpha=1;
  }
  // кнопки внизу
  const bc=dim>.5?'rgba(255,255,255,.1)':C.lockBtn;
  dot(ctx,50,H-52,20,bc);dot(ctx,W-50,H-52,20,bc);
  ctx.fillStyle=ink;ctx.globalAlpha=1-.45*dim;
  rr(ctx,46.5,H-61,7,15,2);ctx.fill();
  rr(ctx,W-59,H-58,18,12,3);ctx.fill();dot(ctx,W-50,H-52,3.4,dim>.5?'#2a2a2a':C.wall);
  ctx.globalAlpha=1;
  homeBar(ctx,ink);
};

/* ═════════ 05 · Ghosted ═════════ */
const GHO={P:8};
function ghostPath(ctx,x,y,w,h,rt,rb,A,ph){
  ctx.beginPath();ctx.moveTo(x,y+h-rb);ctx.lineTo(x,y+rt);
  ctx.arcTo(x,y,x+rt,y,rt);ctx.lineTo(x+w-rt,y);ctx.arcTo(x+w,y,x+w,y+rt,rt);
  ctx.lineTo(x+w,y+h-rb);ctx.arcTo(x+w,y+h,x+w-rb,y+h,rb);
  const x1=x+w-rb,x0=x+rb,n=4,sw=(x1-x0)/n;
  for(let i=0;i<n;i++){
    const xa=x1-sw*i,xb=xa-sw,last=i===n-1;
    ctx.quadraticCurveTo((xa+xb)/2,y+h+A*(1.5+.4*Math.sin(ph+i*1.7)),xb,last?y+h:y+h-A*.5);
  }
  ctx.arcTo(x,y+h,x,y+h-rb,rb);ctx.closePath();
}
GHO.draw=function(ctx,t){
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  const back=seg(t,6.6,7.3),out=1-back;
  stamp(ctx,'Today','11:40 PM',96);
  msg(ctx,'lol ok',108,false);
  msg(ctx,'so friday?',146,true,1,false);
  const s='hey, you up?',bw=msgW(ctx,s),slotX=W-14-bw,slotY=184;
  if(t>=.5){
    const x=lerp(46,slotX,eo(seg(t,.5,.82))),y=lerp(H-43,slotY,spring(t-.5,6,12));
    msgAt(ctx,s,x,y,true,out);
  }
  if(t>=1){
    const r=seg(t,1.7,1.85),ly=slotY+41;
    ctx.globalAlpha=out*(1-r);txt(ctx,'Delivered',W-16,ly,10,C.sub,500,'right');
    ctx.globalAlpha=out*r;txt(ctx,'Read 11:42 PM',W-16,ly,10,C.sub,500,'right');ctx.globalAlpha=1;
  }
  composer(ctx,t<.5||t>6.6?s:'',t<.5?1:back);
  header(ctx,'Sam',1-.8*seg(t,4.5,5.2)+.8*back);

  // точки набора становятся привидением
  if(t>=2.2&&t<6){
    const sc=t<3?spring(t-2.2,7,14):1,m=eio(seg(t,3,3.6)),r=eio(seg(t,3.6,5.8));
    const w=lerp(46,58,m),h=lerp(30,66,m),bot=272;
    const cx=lerp(14+w/2,W/2+10,r)+Math.sin((t-3.6)*3.2)*10*r,top=bot-h-r*350,left=cx-w/2;
    const al=clamp((top+40)/90);
    ctx.save();ctx.globalAlpha=al;
    ctx.translate(left,bot);ctx.scale(sc,sc);ctx.translate(-left,-bot);
    ctx.fillStyle=mix(C.recv,C.ghost,m);
    if(m<1){ctx.globalAlpha=al*(1-m);dot(ctx,left+3,top+h-3,5.5,ctx.fillStyle);dot(ctx,left-3,top+h+5,2.6,ctx.fillStyle);ctx.globalAlpha=al}
    ghostPath(ctx,left,top,w,h,lerp(15,29,m),lerp(15,0,m),lerp(0,4,m),t*6);ctx.fill();
    for(let i=0;i<3;i++){
      const px=left+12+i*11,py=top+15,ex=cx+(i-1)*8.5,ey=top+24;
      const pulse=.35+.65*Math.max(0,Math.sin(t*6-i*.9));
      const x=lerp(px,ex,m),y=lerp(py,ey,m);
      if(i===1){ctx.globalAlpha=al*(1-m)*pulse;dot(ctx,x,y,3.3,C.dot)}
      else{
        ctx.globalAlpha=al*lerp(pulse,1,m);ctx.fillStyle=mix(C.dot,C.eye,m);
        ctx.beginPath();ctx.ellipse(x,y,lerp(3.3,3.4,m),lerp(3.3,4.9,m),0,0,7);ctx.fill();
      }
    }
    ctx.restore();
  }
};

/* ═════════ 06 · Seen ═════════ */
const SEE={P:7};
SEE.draw=function(ctx,t){
  const grow=Math.pow(seg(t,.6,4.7),1.3);
  let m;if(t<4.9)m=grow;else{const s=t-4.9;m=Math.exp(-4.5*s)*Math.cos(11*s)}
  const reset=seg(t,6.3,6.9),sag=46*m;
  const mins=t<6.6?2+Math.round(45*grow):2;
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  stamp(ctx,'Today','13:58',96+sag*.12);
  msg(ctx,'ok',108+sag*.3,false);
  msg(ctx,'sorry about earlier',146+sag*.6,true,1,false);
  const s='so are we good?',w=msgW(ctx,s),mp=Math.max(0,m),sh=6*mp,bh=30+12*mp,by=182+sag;
  msgAt(ctx,s,W-14-w+sh,by,true,1,true,bh,sh);
  // «Прочитано» тяжелеет
  const la=(t<4.9?1:1-seg(t,4.9,5))+(t>=6.3?reset:0);
  if(la>0){
    const wts=[400,500,600,700,800],wt=wts[Math.min(4,Math.floor(mp*5))];
    ctx.globalAlpha=clamp(la);
    txt(ctx,'Read 14:02',W-16,by+bh+11+6*mp,10+5*mp,mix(C.sub,C.ink,mp*1.2),wt,'right');ctx.globalAlpha=1;
  }
  if(t>=4.9){
    const sc=spring(t-4.9,7,14);
    ctx.save();ctx.translate(14,258+40*m);ctx.scale(sc,sc);msgAt(ctx,'k',0,-30,false,1-reset);ctx.restore();
  }
  composer(ctx,'',0);
  header(ctx,'Riley',1,'14:'+String(mins).padStart(2,'0'));
};

/* ─────────── запуск ─────────── */
const PIECES={pushover:PUSH,unsend:UNS,badge:BAD,fallback:FAL,ghosted:GHO,seen:SEE};
const qs=new URLSearchParams(location.search);
const tiles=[...document.querySelectorAll('.tile')].map(el=>{
  const k=el.dataset.k,cv=el.querySelector('canvas'),p=PIECES[k];p.t0=performance.now();
  return{el,k,cv,ctx:cv.getContext('2d'),p};
});
let full=null,suppress=false;
const FT=qs.get('t')!=null?+qs.get('t'):null;

function frame(now){
  for(const T of tiles){
    if(full&&full!==T)continue;
    const cv=T.cv,dpr=Math.min(2.5,devicePixelRatio||1),cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);
    if(!cw)continue;
    if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch}
    T.ctx.setTransform(cw/W,0,0,ch/H,0,0);
    T.p.draw(T.ctx,FT!=null?FT%T.p.P:((now-T.p.t0)/1000)%T.p.P,now);
  }
  requestAnimationFrame(frame);
}

function openFull(T){full=T;T.el.classList.add('full');document.body.classList.add('has-full')}
function closeFull(){if(!full)return;full.el.classList.remove('full');document.body.classList.remove('has-full');full=null}
tiles.forEach(T=>T.el.addEventListener('click',()=>{
  if(suppress){suppress=false;return}
  if(full===T){if(T.k!=='pushover')T.p.t0=performance.now();return}
  if(!full)openFull(T);
}));
document.querySelector('.veil').addEventListener('click',closeFull);
addEventListener('keydown',e=>{if(e.key==='Escape')closeFull()});

// Pushover: тянешь ответ пальцем
(function(){
  const T=tiles.find(x=>x.k==='pushover'),cv=T.cv,st=PUSH.st;
  const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}};
  cv.addEventListener('pointerdown',e=>{const p=pt(e);st.drag={x0:p.x,x:p.x,y:p.y,B:0,moved:false};st.rel=null;cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{
    if(!st.drag)return;const p=pt(e),dx=p.x-st.drag.x0;
    st.drag.x=p.x;st.drag.y=p.y;st.drag.B=100*Math.tanh(dx*.85/100);
    if(Math.abs(dx)>4)st.drag.moved=true;
  });
  const up=()=>{
    if(!st.drag)return;
    if(st.drag.moved){st.rel={B:st.drag.B,t:performance.now()};suppress=true}
    st.drag=null;
  };
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
})();

document.getElementById('restart').addEventListener('click',()=>{const n=performance.now();tiles.forEach(T=>T.p.t0=n)});
const segBtns=document.querySelectorAll('.seg-ctl button');
function setTheme(th){
  document.documentElement.setAttribute('data-theme',th);
  segBtns.forEach(b=>b.classList.toggle('on',b.dataset.theme===th));
  readColors();
}
segBtns.forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme)));
setTheme(qs.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
if(qs.get('full')){const T=tiles[+qs.get('full')-1];if(T)openFull(T)}
requestAnimationFrame(frame);
