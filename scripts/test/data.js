// Export/import: one bundle format, merge vs replace, and round-trips for
// schedule, notes, ticks and bookings.
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
const tab=t=>p.evaluate(t=>document.querySelector(`nav [data-tab="${t}"]`).click(),t);
const editOn=async()=>{ if(!(await p.$('#evAdd'))) await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(250); };
await p.goto(W); await p.waitForTimeout(400);

// seed: a note, a tick, a booking, a schedule edit
await tab('notes'); await p.waitForTimeout(250);
await p.fill('#noteInput','buy onsen towels'); await p.click('#noteAdd'); await p.waitForTimeout(250);
await p.fill('#noteInput','call sankara about shuttle'); await p.click('#noteAdd'); await p.waitForTimeout(250);
await tab('info'); await p.waitForTimeout(250);
await p.evaluate(()=>document.querySelector('[data-chk]').click()); await p.waitForTimeout(200);
await p.evaluate(()=>document.querySelector('[data-bedit]').click()); await p.waitForTimeout(250);
await p.fill('#bkBox','JTA052 conf ABC123'); await p.press('#bkBox','Enter'); await p.waitForTimeout(300);
await tab('plan'); await p.waitForTimeout(250);
await editOn();
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(300);
await p.fill('#f_title','Seeded item'); await p.fill('#f_loc','Naha'); await p.fill('#f_t1','11:11');
await p.click('#f_save'); await p.waitForTimeout(350);

// export everything
await tab('info'); await p.waitForTimeout(300);
await p.click('#exportAll'); await p.waitForTimeout(300);
const all=await p.$eval('#sheetText',e=>e.value);
const j=JSON.parse(all);
ok('bundle carries days', !!j.days && Object.keys(j.days).length===9);
ok('bundle carries notes', Array.isArray(j.notes) && j.notes.length===2);
ok('bundle carries ticks', j.checks && Object.keys(j.checks).length>=1);
ok('bundle carries bookings', j.bookings && Object.values(j.bookings).some(v=>String(v).includes('ABC123')));
ok('bundle has a Copy action', (await p.$$eval('#sheetActs .fchip',e=>e.map(x=>x.textContent))).includes('Copy'));
await p.click('#sheetClose'); await p.waitForTimeout(150);

// notes-only export
await tab('notes'); await p.waitForTimeout(250);
await p.click('#notesExport'); await p.waitForTimeout(250);
const nj=JSON.parse(await p.$eval('#sheetText',e=>e.value));
ok('notes export has notes and no days', Array.isArray(nj.notes)&&nj.notes.length===2&&!nj.days);
await p.click('#sheetClose'); await p.waitForTimeout(150);

// MERGE: a note added locally survives an import that does not mention it
await p.fill('#noteInput','local only note'); await p.click('#noteAdd'); await p.waitForTimeout(250);
await p.click('#notesImport'); await p.waitForTimeout(250);
ok('import offers both modes', JSON.stringify(await p.$$eval('#sheetActs .fchip',e=>e.map(x=>x.textContent)))==='["Merge","Replace"]');
await p.fill('#sheetText',JSON.stringify(nj));
await p.click('#sheetActs .fchip'); await p.waitForTimeout(400);       // Merge
let texts=await p.$$eval('.note-item .txt',e=>e.map(x=>x.textContent));
ok('merge kept the local-only note', texts.includes('local only note'));
ok('merge restored the imported notes', texts.includes('buy onsen towels'));

// REPLACE: the same import now drops it
await p.click('#notesImport'); await p.waitForTimeout(250);
await p.fill('#sheetText',JSON.stringify(nj));
await p.$$eval('#sheetActs .fchip',e=>e[1].click()); await p.waitForTimeout(500);
texts=await p.$$eval('.note-item .txt',e=>e.map(x=>x.textContent));
ok('replace dropped the local-only note', !texts.includes('local only note'));
ok('replace kept the file\'s notes', texts.includes('buy onsen towels')&&texts.length===2);

// day merge vs replace
await tab('plan'); await p.waitForTimeout(250);
await editOn();
const before=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
const oneItem=JSON.stringify({days:{'2026-09-03':[{id:'zz9',title:'From the file',loc:'X',time:'06:00',s:360}]}});
await p.click('#dayImport'); await p.waitForTimeout(250);
await p.fill('#sheetText',oneItem);
await p.click('#sheetActs .fchip'); await p.waitForTimeout(400);       // Merge
let t2=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
ok('day merge added without removing', t2.length===before.length+1 && t2.some(x=>x.startsWith('From the file')));
await p.click('#dayImport'); await p.waitForTimeout(250);
await p.fill('#sheetText',oneItem);
await p.$$eval('#sheetActs .fchip',e=>e[1].click()); await p.waitForTimeout(400);
t2=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
ok('day replace swapped the day', t2.length===1 && t2[0].startsWith('From the file'));

// a whole-trip bundle restores every part at once
await tab('info'); await p.waitForTimeout(300);
await p.click('#planImportAll'); await p.waitForTimeout(250);
await p.fill('#sheetText',all);
await p.$$eval('#sheetActs .fchip',e=>e[1].click()); await p.waitForTimeout(600);
await tab('plan'); await p.waitForTimeout(300);
await editOn();
const t3=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
ok('full restore brought the schedule back', t3.some(x=>x.startsWith('Seeded item')) && !t3.some(x=>x.startsWith('From the file')));
await tab('notes'); await p.waitForTimeout(250);
ok('full restore brought notes back', (await p.$$eval('.note-item .txt',e=>e.map(x=>x.textContent))).includes('call sankara about shuttle'));
await tab('info'); await p.waitForTimeout(300);
ok('full restore brought the booking back', (await p.$$eval('.brow .bv',e=>e.map(x=>x.textContent))).some(v=>v.includes('ABC123')));
ok('full restore brought the tick back', await p.$eval('[data-chk]',e=>e.classList.contains('on')));

// v1 files (days only) still load
await p.click('#planImportAll'); await p.waitForTimeout(250);
await p.fill('#sheetText',JSON.stringify({app:'sankara-days',version:1,days:{'2026-09-04':[{id:'v1a',title:'Old format',loc:'X',time:'08:00',s:480}]}}));
await p.click('#sheetActs .fchip'); await p.waitForTimeout(400);
ok('v1 day-only file still imports', !(await p.$eval('#sheetHint',e=>e.textContent)).startsWith('⚠'));

// share: offered only when the platform provides it, and falls back to Copy
const ctx2=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p2=await ctx2.newPage();
await p2.addInitScript(()=>{ window.__shared=null;
  Object.defineProperty(navigator,'share',{value:d=>{window.__shared=d;return Promise.resolve();},configurable:true}); });
await p2.goto(W); await p2.waitForTimeout(400);
await p2.evaluate(()=>document.querySelector('nav [data-tab="info"]').click()); await p2.waitForTimeout(300);
await p2.click('#exportAll'); await p2.waitForTimeout(300);
const labels=await p2.$$eval('#sheetActs .fchip',e=>e.map(x=>x.textContent));
ok('Share offered when the platform has it', labels.some(l=>l.includes('Share')));
await p2.click('#sheetActs .fchip'); await p2.waitForTimeout(300);
const shared=await p2.evaluate(()=>window.__shared);
ok('Share hands over the bundle', shared && shared.text.includes('"app": "sankara-days"'));
await ctx2.close();

console.log(errs.length?'  ✗ JS errors: '+errs[0]:'  ✓ no JS errors');
await b.close();
})();
