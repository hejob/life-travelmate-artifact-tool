// The real db freezes snapshots and their data(). Assigning them to state that
// the app later mutates throws in strict mode — silently killing the handler.
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const W='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+'/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p=await ctx.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
const ok=(n,v)=>console.log(`  ${v?'✓':'✗'} ${n}`);
await p.addInitScript(()=>{
  const deepFreeze=o=>{ if(o&&typeof o==='object'){ Object.values(o).forEach(deepFreeze); Object.freeze(o);} return o; };
  const ls=[]; let doc={checks:{},bookings:{},plan:{}};
  window.claude={use:n=>Promise.resolve(n==='db'?{
    doc:()=>({
      set:d=>{ doc=JSON.parse(JSON.stringify(d));
        setTimeout(()=>ls.forEach(f=>f({exists:true,data:()=>deepFreeze(doc)})),20);
        return Promise.resolve(); },
      onSnapshot:f=>{ ls.push(f); setTimeout(()=>f({exists:true,data:()=>deepFreeze(doc)}),5); return ()=>{}; }
    }),
    collection:()=>({doc:()=>({set:()=>Promise.resolve(),delete:()=>Promise.resolve()}),
      orderBy:()=>({limit:()=>({onSnapshot:()=>()=>{}})})})
  }:null)};
});
await p.goto(W); await p.waitForTimeout(600);
ok('db attached', (await p.$eval('#syncTxt',e=>e.textContent))==='synced');

// checklist tick
await p.evaluate(()=>document.querySelector('nav [data-tab="info"]').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-chk]').click()); await p.waitForTimeout(300);
ok('checklist tick registers', await p.$eval('[data-chk]',e=>e.classList.contains('on')));

// add item
await p.evaluate(()=>document.querySelector('nav [data-tab="plan"]').click()); await p.waitForTimeout(250);
await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(400);
ok('Add shows the form', await p.$('.evform')!==null);

// save it
if(await p.$('#f_title')){
  await p.fill('#f_title','Frozen snapshot test'); await p.fill('#f_loc','X'); await p.fill('#f_t1','09:45');
  await p.click('#f_save'); await p.waitForTimeout(500);
  ok('Save closes the form', await p.$('.evform')===null);
  ok('saved item is in the day', (await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent))).some(t=>t.includes('Frozen snapshot test')));
}
console.log(errs.length?'  ✗ uncaught: '+errs[0]:'  ✓ no uncaught exceptions');
await b.close();
})();
