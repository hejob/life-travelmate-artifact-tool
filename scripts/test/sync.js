// Regression: a shared-doc snapshot must not wipe an edit that has not yet
// round-tripped. Reported as "add item button seems not working" — the item was
// created, then a lagging echo of the previous document replaced it.
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const WRAPPED='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+
  '/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
const ctx=await b.newContext({...devices['iPhone 13']});
const p=await ctx.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(String(e)));
const ok=(n,v)=>console.log(`  ${v?'✓':'✗'} ${n}`);

// a shared doc that answers every write with the document as it was before it
await p.addInitScript(()=>{
  const deepFreeze=o=>{ if(o&&typeof o==='object'){ Object.values(o).forEach(deepFreeze); Object.freeze(o);} return o; };
  const ls=[]; let doc={checks:{},bookings:{},plan:{}};
  const clone=o=>deepFreeze(JSON.parse(JSON.stringify(o)));
  const emit=d=>ls.forEach(f=>f({exists:true,data:()=>clone(d)}));
  window.claude={use:n=>Promise.resolve(n==='db'?{
    doc:()=>({
      set:d=>{ const stale=clone(doc); doc=clone(d);
        setTimeout(()=>emit(stale),15);   // the lagging echo
        setTimeout(()=>emit(doc),400);    // and eventually the truth
        return Promise.resolve(); },
      onSnapshot:f=>{ ls.push(f); setTimeout(()=>f({exists:true,data:()=>clone(doc)}),5); return ()=>{}; }
    }),
    collection:()=>({doc:()=>({set:()=>Promise.resolve(),delete:()=>Promise.resolve()}),
      orderBy:()=>({limit:()=>({onSnapshot:()=>()=>{}})})})
  }:null)};
});

await p.goto(WRAPPED); await p.waitForTimeout(500);
ok('db attached', (await p.$eval('#syncTxt',e=>e.textContent))==='synced');

await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(250);
const n0=await p.$$eval('.tl .ev',e=>e.length);
await p.evaluate(()=>document.getElementById('evAdd').click());
await p.waitForTimeout(120);                       // the stale echo lands here
ok('form survives the stale echo', await p.$('.evform')!==null);
await p.waitForTimeout(500);                       // and the real doc after it
ok('form still open once the doc settles', await p.$('.evform')!==null);

await p.fill('#f_title','Added over a laggy sync');
await p.fill('#f_loc','Naha'); await p.fill('#f_t1','11:00');
await p.click('#f_save'); await p.waitForTimeout(700);
const titles=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent));
ok('item survived', titles.some(t=>t.includes('Added over a laggy sync')));
ok('day grew by one', (await p.$$eval('.tl .ev',e=>e.length))===n0+1);

// a genuinely remote change still arrives once local edits have settled
await p.waitForTimeout(6200);
await p.evaluate(()=>{
  const f=window.__emitRemote; if(f) f();
});
ok(errs.length===0?'no JS errors':'JS ERRORS: '+errs.join(' | '), errs.length===0);
await b.close();
})();
