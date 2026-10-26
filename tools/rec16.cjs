// node rec16.cjs url outdir  → кадры 1920×1080 через window.__render(t) и audio.wav
const puppeteer=require('puppeteer-core');const fs=require('fs');
(async()=>{
  const [url,out,only]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await puppeteer.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:'new',args:['--hide-scrollbars']});
  const p=await b.newPage();await p.setViewport({width:1440,height:810,deviceScaleFactor:4/3});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto(url,{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);await new Promise(r=>setTimeout(r,500));
  const dur=await p.evaluate(()=>window.__dur),FPS=60,n=Math.round(dur*FPS);
  const cdp=await p.createCDPSession();
  const list=only?only.split(',').map(Number):[...Array(n).keys()];
  for(const i of list){
    await p.evaluate(t=>{window.__render(t)},only?i:i/FPS);
    // Brave не учитывает масштаб пикселей при снимке, поэтому масштаб задаётся в clip явно: 1440 × 4/3 = 1920
    const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:93,clip:{x:0,y:0,width:1440,height:810,scale:4/3}});
    fs.writeFileSync(`${out}/f${only?String(i).replace('.','_'):String(i).padStart(5,'0')}.jpg`,Buffer.from(s.data,'base64'));
  }
  if(!only){const a=await p.evaluate(()=>window.__renderAudio?window.__renderAudio():null);if(a)fs.writeFileSync(`${out}/audio.wav`,Buffer.from(a,'base64'));console.log('frames',n,a?'audio':'no audio')}
  await b.close();
})();
