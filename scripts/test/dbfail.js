// Regression: "the full version still does not show the form on add".
// Lite has no db, so it never ran this path. In the Full build sharedRef.set()
// can throw *synchronously* when the backend dislikes the document shape, and
// the escaping exception abandoned the click handler before it drew the form.
// The UI must render regardless of whether persistence succeeds.
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const W='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+'/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
for(const mode of ['throws-sync','rejects-async']){
  const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
  await p.addInitScript(m=>{
    const ls=[]; let doc={checks:{},bookings:{}};
    window.claude={use:n=>Promise.resolve(n==='db'?{
      doc:()=>({
        set:d=>{
          // a backend that refuses the document shape
          if(m==='throws-sync') throw new TypeError('Nested arrays are not supported');
          return Promise.reject(new Error('invalid-argument'));
        },
        onSnapshot:f=>{ ls.push(f); setTimeout(()=>f({exists:true,data:()=>Object.freeze(JSON.parse(JSON.stringify(doc)))}),5); return ()=>{}; }
      }),
      collection:()=>({doc:()=>({set:()=>Promise.resolve(),delete:()=>Promise.resolve()}),
        orderBy:()=>({limit:()=>({onSnapshot:()=>()=>{}})})})
    }:null)};
  }, mode);
  await p.goto(W); await p.waitForTimeout(500);
  await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(400);
  const form=await p.$('.evform');
  console.log(`  ${form?'✓':'✗'} [${mode}] form shows after Add`);
  console.log(`     sync label: ${await p.$eval('#syncTxt',e=>e.textContent)}`);
  if(errs.length) console.log('     ✗ uncaught exception escaped:',errs[0]);
  else console.log('     ✓ no uncaught exception');
  const stored=await p.evaluate(()=>localStorage.getItem('plan'));
  console.log(`     ${stored?'✓':'✗'} edit still kept on the device`);
  await ctx.close();
}
await b.close();
})();
