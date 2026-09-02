const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const WRAPPED='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+
  '/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
for(const dv of ['iPhone SE','iPhone 13']){
  const ctx=await b.newContext({...devices[dv]});
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR>',e));
  await p.goto(WRAPPED); await p.waitForTimeout(400);
  await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(300);
  // park the handle near the top of the visual viewport
  await p.evaluate(()=>{const r=document.querySelector('.handle').getBoundingClientRect();window.scrollBy(0,r.top-140);});
  await p.waitForTimeout(250);
  const geo=await p.evaluate(()=>{
    const r=document.querySelector('.handle').getBoundingClientRect();
    return {hx:r.x+r.width/2,hy:r.y+r.height/2,vv:window.visualViewport.height,
      rows:[...document.querySelectorAll('.tl .ev')].map(e=>{const b=e.getBoundingClientRect();return e.dataset.ev+':'+Math.round(b.top)+'-'+Math.round(b.bottom)})};
  });
  console.log(`\n== ${dv} == handle(${Math.round(geo.hx)},${Math.round(geo.hy)}) visual=${geo.vv}`);
  console.log('   rows', geo.rows.join(' | '));
  const before=await p.$$eval('.tl .ev',e=>e.map(x=>x.dataset.ev));
  await p.mouse.move(geo.hx,geo.hy); await p.mouse.down(); await p.waitForTimeout(260);
  const armed=await p.$eval('.handle',e=>e.classList.contains('armed'));
  const end=Math.min(geo.vv-60, geo.hy+320);
  for(let i=1;i<=12;i++) { await p.mouse.move(geo.hx, geo.hy+(end-geo.hy)*i/12); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(400);
  const after=await p.$$eval('.tl .ev',e=>e.map(x=>x.dataset.ev));
  const ls=await p.evaluate(()=>localStorage.getItem('plan'));
  console.log('   armed:',armed,' before:',before.join(),' after:',after.join());
  console.log('   reordered:',before.join()!==after.join(),' persisted:',!!ls);
  await p.reload(); await p.waitForTimeout(500);
  console.log('   survives reload:',(await p.$$eval('.tl .ev',e=>e.map(x=>x.dataset.ev))).join()===after.join());
  await ctx.close();
}
await b.close();
})();
