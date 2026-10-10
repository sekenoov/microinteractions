'use strict';
/* ─────────── общее ─────────── */
const W=300,H=400;
const FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
const C={};
const KEYS=['card','ink','sub','line','blue','recv','dot','plus','red','touch','touchS'];
function readColors(){const s=getComputedStyle(document.documentElement);KEYS.forEach(k=>C[k]=s.getPropertyValue('--c-'+k).trim())}

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const eo=t=>1-Math.pow(1-t,3);
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const spring=(s,z=5,w=11)=>s<=0?0:1-Math.exp(-z*s)*Math.cos(w*s);
const bump=(t,a,b)=>t<a||t>b?0:Math.sin(Math.PI*(t-a)/(b-a));
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
function header(ctx,name,time){
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,80);
  statusBar(ctx,time||'9:41');
  ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(22,40);ctx.lineTo(15,47);ctx.lineTo(22,54);ctx.stroke();
  dot(ctx,W/2,46,15,'#a4a7b0');txt(ctx,name[0],W/2,46.5,13,'#fff',600,'center');
  txt(ctx,name,W/2,70,10,C.ink,400,'center');
  ctx.fillStyle=C.line;ctx.fillRect(0,80,W,.7);
}
function composer(ctx,text,ta,dy){
  ctx.save();ctx.translate(0,dy||0);
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
  ctx.restore();
  homeBar(ctx);
}
function stamp(ctx,b,r,y,a){
  const w1=tw(ctx,b+' ',10,600),w2=tw(ctx,r,10),x=W/2-(w1+w2)/2;
  ctx.globalAlpha=a==null?1:a;txt(ctx,b,x,y,10,C.sub,600);txt(ctx,r,x+w1,y,10,C.sub);ctx.globalAlpha=1;
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
function msgAt(ctx,s,x,y,me,a,tail){
  const w=msgW(ctx,s);
  ctx.globalAlpha=a==null?1:a;
  bubble(ctx,x,y,w,30,me,null,tail);
  txt(ctx,s,x+12,y+15.5,14,me?'#fff':C.ink);
  ctx.globalAlpha=1;return w;
}
// пузырь с точками набора, растёт из левого нижнего угла
function typingAt(ctx,x,y,t,a,sc){
  if(a<=0||sc<=0)return;
  ctx.save();ctx.globalAlpha=a;ctx.translate(x,y+30);ctx.scale(sc,sc);ctx.translate(-x,-(y+30));
  dot(ctx,x+3,y+27,5.5,C.recv);dot(ctx,x-3,y+35,2.6,C.recv);
  ctx.fillStyle=C.recv;rr(ctx,x,y,46,30,15);ctx.fill();
  for(let i=0;i<3;i++){ctx.globalAlpha=a*(.35+.65*Math.max(0,Math.sin(t*6-i*.9)));dot(ctx,x+12+i*11,y+15,3.3,C.dot)}
  ctx.restore();
}
function popAt(ctx,x,y,sc,fn){ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.translate(-x,-y);fn();ctx.restore()}

/* ═════════ 01 · Nvm ═════════
   Голосовое пишется, и лента волны лезет из пузыря змейкой по экрану.
   Запись кончилась: лента втягивается рулеткой (верле, считается один раз), хвост хлещет и бьёт в пузырь. */
const NV={bx:14,by:244,bw:72,bh:34,r:17,xl:30,xr:W-30,sp:4,SMAX:158,PMAX:54,
  t0:.6,t1:4.4,TS:4.68,slk:1.12,v0:900,acc:12000,fric:0,free:.25};
NV.cy=NV.by+NV.bh/2;NV.ax=NV.bx+NV.bw-12;
function nvAt(d){
  d=clamp(d,0,NV.n-1.001);const i=Math.floor(d),f=d-i,P=NV.path;
  return{x:lerp(P[i*2],P[i*2+2],f),y:lerp(P[i*2+1],P[i*2+3],f)};
}
function nvmInit(){
  // змейка: ряды через весь экран, разворот полукругом, ряды чуть гуляют по высоте
  const R=rng(23),pts=[];let x=NV.ax,y=NV.cy,dir=1;
  for(let row=0;row<11;row++){
    const xe=dir>0?NV.xr:NV.xl,ye=y+(R()*2-1)*2.2,n=Math.ceil(Math.abs(xe-x)/.5);
    for(let i=0;i<n;i++)pts.push(lerp(x,xe,i/n),lerp(y,ye,i/n));
    x=xe;y=ye;const m=Math.ceil(Math.PI*NV.r/.5);
    for(let i=0;i<m;i++){const a=Math.PI*i/m;pts.push(x+dir*NV.r*Math.sin(a),y+NV.r-NV.r*Math.cos(a))}
    y+=2*NV.r;dir=-dir;
  }
  pts.push(x,y);
  // равный шаг 1px по длине
  const out=[pts[0],pts[1]];let acc=0,need=1;
  for(let i=2;i<pts.length;i+=2){
    const ax=pts[i-2],ay=pts[i-1],bx=pts[i],by=pts[i+1],d=Math.hypot(bx-ax,by-ay);
    while(acc+d>=need){const f=(need-acc)/d;out.push(lerp(ax,bx,f),lerp(ay,by,f));need++}
    acc+=d;
  }
  NV.path=new Float32Array(out);NV.n=out.length/2;
  NV.my=new Float32Array(NV.n);let mx=-1e9;
  for(let i=0;i<NV.n;i++){mx=Math.max(mx,NV.path[i*2+1]);NV.my[i]=mx}
  let d8=0;const yRow=NV.cy+2*NV.r*8-3;
  for(let i=0;i<NV.n;i++)if(NV.path[i*2+1]>=yRow){d8=i;break}
  NV.L=d8+130;
  // высоты столбиков привязаны к материалу ленты
  NV.bar=new Float32Array(1400);const R2=rng(5);
  for(let j=0;j<1400;j++){const env=Math.pow(.5+.5*Math.sin(j*.13+1.7*Math.sin(j*.031)),.8);NV.bar[j]=3+13*env*(.3+.7*R2())}

  // рулетка: голова втягивается в пузырь с ускорением, нить только тянет.
  // лента лежит с запасом (SLK), поэтому складки распрямляются по очереди, а трение гасит разлёт,
  // и только последняя четверть идёт без трения: хвост хлещет
  const L=NV.L,sp=NV.sp,SLK=NV.slk,rest=sp*SLK,N=Math.floor(L/sp)+1;
  const x0=new Float64Array(N),y0=new Float64Array(N),px=new Float64Array(N),py=new Float64Array(N);
  for(let i=0;i<N;i++){const p=nvAt(L-i*sp);x0[i]=px[i]=p.x;y0[i]=py[i]=p.y}
  const A={x:NV.ax,y:NV.cy},SUB=960,dt=1/SUB,fr=[],Lt=(N-1)*rest+(L-(N-1)*sp);
  let Rl=0,v=NV.v0,step=0;
  for(;;){
    v+=NV.acc*dt;Rl+=v*dt;
    const k=Math.ceil((Lt-Rl)/rest)-1;if(k<0)break;
    const e=Lt-k*rest-Rl,fk=k/N,damp=fk>NV.free?NV.fric:lerp(.9995,NV.fric,fk/NV.free);
    for(let i=0;i<k;i++){
      const vx=(x0[i]-px[i])*damp,vy=(y0[i]-py[i])*damp;
      px[i]=x0[i];py[i]=y0[i];x0[i]+=vx;y0[i]+=vy;
    }
    const dx=x0[k]-A.x,dy=y0[k]-A.y,dl=Math.hypot(dx,dy)||1,q=Math.min(dl,e)/dl;
    x0[k]=A.x+dx*q;y0[k]=A.y+dy*q;px[k]=x0[k];py[k]=y0[k];
    for(let it=0;it<2;it++)for(let i=k-1;i>=0;i--){
      const ex=x0[i]-x0[i+1],ey=y0[i]-y0[i+1],d=Math.hypot(ex,ey);
      if(d>rest){const f=rest/d;x0[i]=x0[i+1]+ex*f;y0[i]=y0[i+1]+ey*f}
    }
    if(step%8===0){const a=new Float32Array((k+1)*2);for(let i=0;i<=k;i++){a[i*2]=x0[i];a[i*2+1]=y0[i]}fr.push(a)}
    step++;
  }
  NV.fr=fr;NV.TR=fr.length/120;NV.ts=NV.TS+NV.TR;
}
function nvScroll(L){
  const need=NV.my[Math.min(NV.n-1,Math.floor(L))]+14-(H-60);
  return{S:clamp(need,0,NV.SMAX),P:clamp(need-NV.SMAX,0,NV.PMAX)};
}
function nvClock(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function voiceIn(ctx,x,y,w,dur){
  ctx.fillStyle=C.ink;ctx.beginPath();ctx.moveTo(x+14,y+10.5);ctx.lineTo(x+25,y+17);ctx.lineTo(x+14,y+23.5);ctx.closePath();ctx.fill();
  ctx.strokeStyle=mix(C.recv,C.ink,.5);ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();
  for(let i=0;i<22;i++){const bx=x+36+i*4.2,h=NV.bar[i*7+3]*.62+2;ctx.moveTo(bx,y+17-h/2);ctx.lineTo(bx,y+17+h/2)}
  ctx.stroke();
  txt(ctx,dur,x+w-12,y+17.5,11.5,C.sub,500,'right');
}
const VW=176;
function ribbon(ctx,xs,ys,n){
  ctx.strokeStyle=C.recv;ctx.lineWidth=26;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(xs[0],ys[0]);for(let i=1;i<n;i++)ctx.lineTo(xs[i],ys[i]);ctx.stroke();
}
const NVM={P:8.2};
const _rx=new Float32Array(2000),_ry=new Float32Array(2000);
NVM.draw=function(ctx,t){
  if(!NV.fr)nvmInit();
  const {t0,t1,TS,ts}=NV,out=1-seg(t,this.P-.45,this.P-.05);
  const pe=Math.pow(seg(t,t0,t1),1.25),L=NV.L*pe;
  // прокрутка и выдавленное поле ввода
  let S,Pu;
  if(t<TS){const s=nvScroll(L);S=s.S;Pu=s.P}
  else{const s=nvScroll(NV.L),k=1-spring(t-ts-.06,5,9);S=s.S*k;Pu=s.P*k}
  const shake=t>ts?3.2*Math.exp(-9*(t-ts))*Math.sin(55*(t-ts)):0;

  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(shake*.4,-S+shake);

  // история: то же самое вчера
  stamp(ctx,'Yesterday','9:14 PM',96);
  bubble(ctx,14,108,VW,34,false,null,false);voiceIn(ctx,14,108,VW,'9:03');
  msgAt(ctx,'nvm',14,146,false);
  msgAt(ctx,'lol ok',W-14-msgW(ctx,'lol ok'),188,true);
  stamp(ctx,'Today','4:47 PM',232);

  const bc=mix(C.recv,C.ink,.5);
  if(t>=t0&&t<TS&&L>2){
    // лента выезжает по змейке
    let n=0;for(let d=0;d<L;d+=2.5){const p=nvAt(d);_rx[n]=p.x;_ry[n]=p.y;n++}
    const p=nvAt(L);_rx[n]=p.x;_ry[n]=p.y;n++;
    ribbon(ctx,_rx,_ry,n);
    ctx.strokeStyle=bc;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();
    for(let j=0;j*4.6<L-10;j++){
      const d=L-j*4.6,q=nvAt(d),a=nvAt(d-1),b=nvAt(d+1),tx=b.x-a.x,ty=b.y-a.y,tl=Math.hypot(tx,ty)||1,h=NV.bar[j]/2;
      const nx=-ty/tl*h,ny=tx/tl*h;ctx.moveTo(q.x-nx,q.y-ny);ctx.lineTo(q.x+nx,q.y+ny);
    }
    ctx.stroke();
  }else if(t>=TS&&t<ts){
    // рулетка
    const F=NV.fr[Math.min(NV.fr.length-1,Math.floor((t-TS)*120))],k=F.length/2-1;
    // хвост хлещет: бегущая волна поперёк ленты, растёт к концу
    const r=k/(NV.L/NV.sp),lash=r<.3?30*Math.pow(1-r/.3,1.4):0,τ=t-TS;
    let n=0;
    for(let i=0;i<=k;i++){
      let x=F[i*2],y=F[i*2+1];
      if(lash>0&&i<k){
        const j=Math.min(i+1,k),tx=F[j*2]-F[Math.max(0,i-1)*2],ty=F[j*2+1]-F[Math.max(0,i-1)*2+1],tl=Math.hypot(tx,ty)||1;
        const o=lash*Math.exp(-i*NV.sp/110)*Math.sin(i*.09-τ*48);x+=-ty/tl*o;y+=tx/tl*o;
      }
      _rx[n]=x;_ry[n]=y;n++;
    }
    _rx[n]=NV.ax;_ry[n]=NV.cy;n++;
    ribbon(ctx,_rx,_ry,n);
    ctx.strokeStyle=bc;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();
    for(let j=0;;j++){
      const m=j*4.6/NV.sp,i=Math.floor(m);if(i>=k)break;
      const f=m-i,x=lerp(_rx[i],_rx[i+1],f),y=lerp(_ry[i],_ry[i+1],f);
      const tx=_rx[i+1]-_rx[i],ty=_ry[i+1]-_ry[i],tl=Math.hypot(tx,ty)||1,h=NV.bar[j]/2;
      const nx=-ty/tl*h,ny=tx/tl*h;ctx.moveTo(x-nx,y-ny);ctx.lineTo(x+nx,y+ny);
    }
    ctx.stroke();
  }

  // пузырь: запись, потом готовое голосовое
  if(t>=.3){
    const sc=t<t0?spring(t-.3,7,14):1,τ=t-ts;
    const jolt=τ>0?-9*Math.exp(-7*τ)*Math.cos(24*τ):0,m=τ>0?eo(seg(τ,.04,.36)):0;
    const w=lerp(NV.bw,VW,m)+(τ>0?6*Math.exp(-6*τ)*Math.sin(18*τ)*(1-m*.6):0);
    const x=NV.bx+jolt,y=NV.by;
    popAt(ctx,x,y+34,sc,()=>{
      ctx.globalAlpha=out;
      bubble(ctx,x,y,w,34,false,null,false);
      ctx.save();rr(ctx,x,y,w,34,17);ctx.clip();
      if(m<1){
        ctx.globalAlpha=out*(1-m);
        const rec=t<t1+.08;
        if(rec)dot(ctx,x+17,y+17,4.5,C.red);
        ctx.globalAlpha=out*(1-m)*(rec?.55+.45*Math.cos(t*7):1);
        if(!rec)dot(ctx,x+17,y+17,4.5,C.sub);
        ctx.globalAlpha=out*(1-m);
        txt(ctx,nvClock(468*pe),x+29,y+17.5,13.5,C.ink,500);
      }
      if(m>0){ctx.globalAlpha=out*m*m;voiceIn(ctx,x,y,VW,'7:48')}
      ctx.restore();ctx.globalAlpha=1;
    });
  }
  // и ответ
  if(t>=ts+.85){
    const sc=spring(t-ts-.85,7,14);
    popAt(ctx,14,NV.by+68,sc,()=>msgAt(ctx,'nvm',14,NV.by+38,false,out));
  }
  ctx.restore();

  composer(ctx,'',0,Pu);
  header(ctx,'Alex','4:47');
};

/* ═════════ 02 · k. ═════════
   Переписка лежит на качелях: справа твой абзац, слева их ответ.
   «k» ничего не весит, точка падает гирей, и абзац улетает. */
const KP=['i’m so sorry about tonight. i said','i’d be there and i wasn’t. work ran',
  'late, my phone died, and by the time','i got home i didn’t know what to say.',
  'i really care about this. can we','talk tomorrow? please'];
const KPV={x:150,y:284},KDEG=Math.PI/180,K_LAND=4.25,K_SLAM=4.37,K_LAUNCH=4.31,K_Y=284,KPY=162;
let KW=0;
function kTheta(t){
  let th=0;
  if(t<.8)th=0;
  else if(t<3)th=7*KDEG*spring(t-.8,3.5,9);
  else if(t<K_LAND){const s=t-3;th=7*KDEG-.9*KDEG*Math.exp(-4*s)*Math.sin(13*s)}
  else if(t<K_SLAM){const p=seg(t,K_LAND,K_SLAM);th=lerp(7,-15,p*p)*KDEG}
  else{const s=t-K_SLAM;th=(-10-5*Math.exp(-5*s)*Math.cos(13*s))*KDEG}
  return th*(1-eio(seg(t,7.3,7.9)));
}
function rot(p,th){const c=Math.cos(th),s=Math.sin(th),dx=p.x-KPV.x,dy=p.y-KPV.y;return{x:KPV.x+c*dx-s*dy,y:KPV.y+s*dx+c*dy}}
function paraDraw(ctx,lines,x,y,w,tail){
  const h=lines.length*14.5+14;
  bubble(ctx,x,y,w,h,true,null,tail);
  lines.forEach((s,i)=>txt(ctx,s,x+12,y+7+14.5*(i+.5)+.5,12,'#fff'));
  return h;
}
const KD={P:8};
KD.draw=function(ctx,t){
  if(!KW)KW=Math.max(...KP.map(s=>tw(ctx,s,12)))+24;
  const th=kTheta(t),out=1-seg(t,7.3,7.75),ph=KP.length*14.5+14,px=W-14-KW;
  const shk=t>K_LAND?3.5*Math.exp(-8*(t-K_LAND))*Math.sin(60*(t-K_LAND)):0;
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(0,shk);

  ctx.save();ctx.translate(KPV.x,KPV.y);ctx.rotate(th);ctx.translate(-KPV.x,-KPV.y);
  // вчера было то же самое
  paraDraw(ctx,KP,px,96-ph,KW,true);
  msgAt(ctx,'k.',14,102,false);
  stamp(ctx,'Today','11:52 PM',150);
  // новый абзац, пока лежит на доске
  if(t>=.35&&t<K_LAUNCH){
    const p=spring(t-.35,6,12),x=lerp(46,px,eo(seg(t,.35,.62))),y=lerp(H-43,KPY,p);
    paraDraw(ctx,KP,x,y,KW,true);
  }
  if(t>=.9&&t<K_LAUNCH+.05){
    const r=seg(t,1.4,1.55),a=1-seg(t,K_LAUNCH,K_LAUNCH+.05);
    ctx.globalAlpha=(1-r)*a;txt(ctx,'Delivered',W-16,KPY+ph+10,10,C.sub,500,'right');
    ctx.globalAlpha=r*a;txt(ctx,'Read 11:53 PM',W-16,KPY+ph+10,10,C.sub,500,'right');ctx.globalAlpha=1;
  }
  // набор, потом «k», потом «k.» с вмятиной
  typingAt(ctx,14,K_Y,t,1-seg(t,2.95,3),t<2.95?spring(t-2.2,7,14):1);
  if(t>=3){
    const sc=t<K_LAND?spring(t-3,7,14):1,s=t-K_LAND,sq=s>0?Math.exp(-9*s)*Math.cos(20*s):0;
    ctx.save();ctx.translate(14,K_Y+30);ctx.scale(sc*(1+.16*sq),sc*(1-.22*sq));ctx.translate(-14,-(K_Y+30));
    msgAt(ctx,t<K_LAND?'k':'k.',14,K_Y,false,out);
    ctx.restore();
  }
  ctx.restore();

  // абзац улетает катапультой
  if(t>=K_LAUNCH){
    const th0=kTheta(K_LAUNCH),c=rot({x:px+KW/2,y:KPY+ph/2},th0),s=t-K_LAUNCH;
    const x=c.x+230*s,y=c.y-1150*s+700*s*s,a=th0-2.6*s;
    if(y>-260){ctx.save();ctx.translate(x,y);ctx.rotate(a);paraDraw(ctx,KP,-KW/2,-ph/2,KW,true);ctx.restore()}
  }
  // точка падает сверху
  if(t>=3.95&&t<K_LAND){
    const kw=tw(ctx,'k',14),tg=rot({x:26+kw+2,y:K_Y+20.5},kTheta(K_LAND)),p=seg(t,3.95,K_LAND),y=lerp(-12,tg.y,p*p);
    ctx.strokeStyle=C.ink;ctx.lineCap='round';ctx.lineWidth=2.6;ctx.globalAlpha=.18;
    ctx.beginPath();ctx.moveTo(tg.x,y-40*p);ctx.lineTo(tg.x,y);ctx.stroke();ctx.globalAlpha=1;
    dot(ctx,tg.x,y,1.7,C.ink);
  }
  ctx.restore();

  composer(ctx,t<.35?'i’m so sorry about tonig…':'',t<.35?1:0);
  header(ctx,'Jordan','11:53');
  finger(ctx,W-27,H-26,seg(t,.05,.15)*(1-seg(t,.4,.55)),bump(t,.18,.36));
};

/* ═════════ 03 · Double text ═════════
   Сообщения без ответа стоят башней и качаются. Набор поднимает её, пропал набор: роняет обратно.
   Приходит «?», и башня падает (обломки считаются один раз). */
const SM=['hey','you up?','hellooo?','did i do something','ok nvm','forget it lol','sorry'];
const STT=[.45,1,1.5,1.95,2.35,2.7,3];
const SE={floor:H-74,typ:4.6,off:5.25,q:5.9};
let SW=null,SJ=null,SB=null,SQW=0;
function stLift(t){
  let L=0;
  if(t>=SE.typ)L+=36*spring(t-SE.typ,6,14);
  if(t>=SE.off)L-=36*spring(t-SE.off,6,14);
  if(t>=SE.q)L+=36*spring(t-SE.q,6,16);
  return L;
}
const slotH=(i,t)=>34*eo(seg(t,STT[i],STT[i]+.22));
function stTh(t){
  let n=0;STT.forEach(s=>n+=eo(seg(t,s,s+.3)));
  let th=-.0065*Math.pow(n,1.6);
  const ev=(te,I)=>t>te?I*Math.exp(-1.3*(t-te))*Math.sin(7*(t-te)):0;
  STT.forEach((s,i)=>th+=ev(s,(i%2?1:-1)*(.012+.008*i)));
  th+=ev(3.75,.025)+ev(SE.typ,-.11)+ev(SE.off,.15);
  if(t>SE.q+.05)th-=.05*(Math.exp(4.2*(t-SE.q-.05))-1);
  return th;
}
function stPose(t){
  let n=0;while(n<STT.length&&t>=STT[n])n++;
  if(!n)return[];
  const th=stTh(t),p=t<SE.q?.75:lerp(.75,.3,seg(t,SE.q,SB?SB.tb:SE.q+.7)),base=SE.floor-stLift(t),P=[];
  let cx=W-14-SW[n-1],cy=base;
  for(let j=0;j<n;j++){
    const i=n-1-j,a=th*Math.pow((j+1)/n,p);
    P[i]={x:cx,y:cy,a,w:SW[i]};
    if(i>0){const dx=SW[i]-SW[i-1]+SJ[i-1],dy=-slotH(i,t);cx+=Math.cos(a)*dx-Math.sin(a)*dy;cy+=Math.sin(a)*dx+Math.cos(a)*dy}
  }
  return P;
}
function stCenter(b){const c=Math.cos(b.a),s=Math.sin(b.a);return{x:b.x+c*b.w/2+s*15,y:b.y+s*b.w/2-c*15}}
function stInit(ctx){
  SW=SM.map(s=>msgW(ctx,s));SQW=msgW(ctx,'?');
  const r=rng(41);SJ=SM.map(()=>(r()*2-1)*8);
  // когда башня проходит точку невозврата
  let tb=SE.q+.05;while(stTh(tb)>-1&&tb<SE.q+2)tb+=.001;
  SB={tb};
  const A=stPose(tb),B=stPose(tb-1/240),bl=A.map((b,i)=>{
    const c=stCenter(b),c0=stCenter(B[i]);
    return{x:c.x,y:c.y,a:b.a,w:b.w,vx:(c.x-c0.x)*240,vy:(c.y-c0.y)*240,va:(b.a-B[i].a)*240,land:-1,lx:0,ly:0,la:0,ta:0};
  });
  const hm=new Float32Array(W+1).fill(H-54),qy=SE.floor-36+16;
  for(let x=14;x<=14+SQW;x++)hm[x]=qy;
  const dt=1/240,fr=[];
  for(let s=0;s<720;s++){
    const tt=s*dt;
    for(const b of bl){
      if(b.land>=0)continue;
      b.vy+=2600*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.va*dt;b.va*=.996;
      const c=Math.abs(Math.cos(b.a)),sn=Math.abs(Math.sin(b.a)),ex=c*b.w/2+sn*15,ey=sn*b.w/2+c*15;
      if(b.x-ex<1){b.x=1+ex;b.vx=-b.vx*.35}
      if(b.x+ex>W-1){b.x=W-1-ex;b.vx=-b.vx*.35}
      let top=1e9;for(let x=Math.max(0,Math.floor(b.x-ex));x<=Math.min(W,Math.ceil(b.x+ex));x++)top=Math.min(top,hm[x]);
      if(b.y+ey>=top){
        b.land=tt;b.la=b.a;b.ta=Math.round(b.a/Math.PI)*Math.PI;b.lx=b.x+b.vx*.03;
        let tp=1e9;for(let x=Math.max(0,Math.floor(b.lx-b.w/2));x<=Math.min(W,Math.ceil(b.lx+b.w/2));x++)tp=Math.min(tp,hm[x]);
        b.ly=tp-15;
        for(let x=Math.max(0,Math.floor(b.lx-b.w/2+6));x<=Math.min(W,Math.ceil(b.lx+b.w/2-6));x++)hm[x]=Math.min(hm[x],b.ly-15);
      }
    }
    if(s%2===0)fr.push(bl.map(b=>[b.x,b.y,b.a]));
  }
  SB.fr=fr;SB.bl=bl;
}
function blockAt(ctx,s,x,y,a,w,al){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=al;
  ctx.fillStyle=C.blue;rr(ctx,-w/2,-15,w,30,15);ctx.fill();
  txt(ctx,s,0,.5,14,'#fff',400,'center');ctx.restore();ctx.globalAlpha=1;
}
const STK={P:9};
STK.draw=function(ctx,t){
  if(!SB)stInit(ctx);
  const out=1-seg(t,this.P-.5,this.P-.05),base=SE.floor-stLift(t);
  ctx.fillStyle=C.card;ctx.fillRect(0,0,W,H);
  // штамп времени стоит над башней и уезжает вверх вместе с ней
  let sum=0;for(let i=0;i<STT.length;i++)sum+=slotH(i,t);
  stamp(ctx,'Today','1:12 AM',base-sum-24+(t>=SB.tb?0:0),out);

  if(t<SB.tb){
    const P=stPose(t);
    P.forEach((b,i)=>{
      const age=t-STT[i],c=stCenter(b);
      if(age<.28){
        // летит из поля ввода
        const k=eo(seg(age,0,.28));
        blockAt(ctx,SM[i],lerp(58+b.w/2,c.x,k),lerp(H-28,c.y,spring(age,6,12)),b.a*k,b.w,1);
      }else blockAt(ctx,SM[i],c.x,c.y,b.a,b.w,1);
    });
    // хвостик у нижнего
    if(P.length){
      const b=P[P.length-1],ca=Math.cos(b.a),sa=Math.sin(b.a);
      if(t-STT[P.length-1]>=.28){
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.fillStyle=C.blue;ctx.beginPath();
        const bx=b.w,by=0;ctx.moveTo(bx-10,by-7);ctx.quadraticCurveTo(bx-1,by-2,bx+4,by+.5);ctx.quadraticCurveTo(bx-6,by+1.2,bx-15,by-3);ctx.closePath();ctx.fill();ctx.restore();
      }
      if(t>=3.3){
        const r=seg(t,3.75,3.9),la=1-seg(t,SB.tb-.2,SB.tb);
        const lx=b.x+ca*(b.w-2)-sa*10,ly=b.y+sa*(b.w-2)+ca*10;
        ctx.save();ctx.translate(lx,ly);ctx.rotate(b.a);
        ctx.globalAlpha=(1-r)*la;txt(ctx,'Delivered',0,0,10,C.sub,500,'right');
        ctx.globalAlpha=r*la;txt(ctx,'Read 1:14 AM',0,0,10,C.sub,500,'right');ctx.restore();ctx.globalAlpha=1;
      }
    }
  }else{
    const s=t-SB.tb,F=SB.fr[Math.min(SB.fr.length-1,Math.floor(s*120))];
    SB.bl.forEach((b,i)=>{
      if(b.land>=0&&s>=b.land){
        const q=s-b.land,a=b.ta+(b.la-b.ta)*Math.exp(-11*q)*Math.cos(17*q),y=b.ly-5*Math.exp(-9*q)*Math.abs(Math.sin(15*q));
        blockAt(ctx,SM[i],lerp(F[i][0],b.lx,eo(seg(q,0,.12))),y,a,b.w,out);
      }else blockAt(ctx,SM[i],F[i][0],F[i][1],F[i][2],b.w,out);
    });
  }
  // набор появился, пропал, потом «?»
  const ty=base+16;
  if(t>=SE.typ&&t<SE.off+.2)typingAt(ctx,14,ty,t,1,t<SE.off?spring(t-SE.typ,7,14):1-eo(seg(t,SE.off,SE.off+.16)));
  if(t>=SE.q){const sc=spring(t-SE.q,7,14);popAt(ctx,14,ty+30,sc,()=>msgAt(ctx,'?',14,ty,false,out))}

  let ci=-1;for(let i=0;i<SM.length;i++)if(t>=STT[i]-.32&&t<STT[i])ci=i;
  composer(ctx,ci>=0?SM[ci]:'',ci>=0?1:0);
  header(ctx,'Sam','1:14');
  let fp=0;STT.forEach(s=>fp=Math.max(fp,bump(t,s-.1,s+.06)));
  finger(ctx,W-27,H-26,seg(t,.1,.25)*(1-seg(t,3.1,3.3)),fp);
};

/* ─────────── запуск ─────────── */
const PIECES={nvm:NVM,kdot:KD,stack:STK};
const qs=new URLSearchParams(location.search);
const tiles=[...document.querySelectorAll('.tile')].map(el=>{
  const k=el.dataset.k,cv=el.querySelector('canvas'),p=PIECES[k];p.t0=performance.now();
  return{el,k,cv,ctx:cv.getContext('2d'),p};
});
let full=null;
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
window.__seek=(k,t)=>{const T=tiles.find(x=>x.k===k);const cv=T.cv;T.ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0);T.p.draw(T.ctx,t,performance.now())};

function openFull(T){full=T;T.el.classList.add('full');document.body.classList.add('has-full')}
function closeFull(){if(!full)return;full.el.classList.remove('full');document.body.classList.remove('has-full');full=null}
tiles.forEach(T=>T.el.addEventListener('click',()=>{
  if(full===T){T.p.t0=performance.now();return}
  if(!full)openFull(T);
}));
document.querySelector('.veil').addEventListener('click',closeFull);
addEventListener('keydown',e=>{if(e.key==='Escape')closeFull()});

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
