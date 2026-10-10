// запись по виртуальному времени: часы страницы и все CSS/WAAPI анимации двигаются ровно на 1/60 с на кадр
const puppeteer=require('puppeteer-core');const fs=require('fs');
const out=process.argv[2],theme=process.argv[3]||'light',url=process.argv[4],FPS=60,MAXS=+(process.argv[5]||60);
(async()=>{
  const b=await puppeteer.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:'new',args:['--hide-scrollbars']});
  const p=await b.newPage();await p.setViewport({width:1080,height:1350,deviceScaleFactor:1});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.evaluateOnNewDocument(()=>{
    const rST=setTimeout.bind(window),base=Date.now();let T=0,id=1;const timers=new Map();let rafs=[];
    performance.now=()=>T;Date.now=()=>base+T;
    window.setTimeout=(f,ms,...a)=>{const i=id++;timers.set(i,{t:T+Math.max(0,+ms||0),f,a,seq:i});return i};
    window.clearTimeout=i=>timers.delete(i);
    window.setInterval=(f,ms)=>{const i=id++;const run=()=>{f();timers.set(i,{t:T+ms,f:run,a:[],seq:id++})};timers.set(i,{t:T+ms,f:run,a:[],seq:i});return i};
    window.clearInterval=i=>timers.delete(i);
    window.requestAnimationFrame=f=>{const i=id++;rafs.push([i,f]);return i};
    window.cancelAnimationFrame=i=>{rafs=rafs.filter(r=>r[0]!==i)};
    const flush=()=>new Promise(r=>rST(r,0));
    window.__step=async dt=>{
      const end=T+dt;
      for(;;){let nx=null;for(const [i,t] of timers)if(t.t<=end&&(!nx||t.t<nx[1].t||(t.t===nx[1].t&&t.seq<nx[1].seq)))nx=[i,t];
        if(!nx)break;timers.delete(nx[0]);T=Math.max(T,nx[1].t);try{nx[1].f(...nx[1].a)}catch(e){console.error(e)}await flush();}
      T=end;
      document.getAnimations().forEach(a=>{
        if(a.__t===undefined){a.__t=a.currentTime||0;a.pause()}
        a.__t+=dt;const tm=a.effect&&a.effect.getComputedTiming();
        if(tm&&isFinite(tm.endTime)&&a.__t>=tm.endTime){try{a.finish()}catch(e){a.currentTime=a.__t}}else a.currentTime=a.__t;
      });
      const rs=rafs;rafs=[];rs.forEach(r=>{try{r[1](T)}catch(e){console.error(e)}});
      await flush();
    };
  });
  const cdp=await p.createCDPSession();
  await p.goto(url);
  let n=0;
  while(n<MAXS*FPS){
    await p.evaluate(dt=>__step(dt),1000/FPS);
    const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    fs.writeFileSync(`${out}/f${String(n).padStart(5,'0')}.jpg`,Buffer.from(s.data,'base64'));n++;
    if(await p.evaluate(()=>window.__done===true))break;
  }
  // звук: сцена писала состояние по кадрам, дорожка считается офлайн
  const a=await p.evaluate(()=>window.__renderAudio?window.__renderAudio():null);
  if(a)fs.writeFileSync(`${out}/audio.wav`,Buffer.from(a,'base64'));
  console.log('frames',n,'dur',(n/FPS).toFixed(2),a?'audio':'no audio');
  await b.close();
})();
