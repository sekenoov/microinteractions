// node ov.cjs outdir "A name" "A desc" "B name" "B desc"
const puppeteer=require('puppeteer-core');const [out,a,ad,b,bd]=process.argv.slice(2);
(async()=>{const br=await puppeteer.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:'new'});
for(const ph of ['1','2']){const p=await br.newPage();await p.setViewport({width:1080,height:1350});
await p.goto('file://'+__dirname+'/ab-overlay.html?'+new URLSearchParams({a,ad,b,bd,ph}),{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:out+'/ov'+ph+'.png',omitBackground:true});await p.close()}
await br.close()})();
