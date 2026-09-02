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
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const U=WRAPPED;
await p.goto(U); await p.waitForTimeout(400);
const ok=(n,v)=>console.log(`  ${v?'✓':'✗'} ${n}`);

await p.click('#editToggle'); await p.waitForTimeout(250);
const n0=await p.$$eval('.tl .ev',e=>e.length);

// create
await p.click('#evAdd'); await p.waitForTimeout(250);
ok('add opens the form', await p.$('.evform')!==null);
await p.fill('#f_title','Hirauchi sea onsen');
await p.fill('#f_jp','平内海中温泉');
await p.fill('#f_loc','Hirauchi');
await p.fill('#f_t1','10:15'); await p.fill('#f_t2','11:30');
await p.click('#f_save'); await p.waitForTimeout(300);
const n1=await p.$$eval('.tl .ev',e=>e.length);
ok('item created', n1===n0+1);
ok('times parsed into the timeline', (await p.$$eval('.tl .ev .time',e=>e.map(x=>x.textContent))).some(t=>t.includes('10:15')));

// edit existing
const edits=await p.$$('[data-eedit]');
await edits[0].click(); await p.waitForTimeout(250);
await p.fill('#f_title','Renamed item');
await p.click('#f_save'); await p.waitForTimeout(250);
ok('edit saved', (await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent))).some(t=>t.includes('Renamed item')));

// two-tap delete
const dels=await p.$$('[data-edel]');
await dels[0].click(); await p.waitForTimeout(200);
const armed=await p.$eval('[data-edel]',e=>e.textContent.trim());
ok('first tap arms only', armed==='Delete?' && (await p.$$eval('.tl .ev',e=>e.length))===n1);
await (await p.$$('[data-edel]'))[0].click(); await p.waitForTimeout(250);
ok('second tap deletes', (await p.$$eval('.tl .ev',e=>e.length))===n1-1);

// export / import round trip
await p.click('#dayExport'); await p.waitForTimeout(250);
const json=await p.$eval('#sheetText',e=>e.value);
ok('export sheet has JSON', json.trim().startsWith('{') && json.includes('Hirauchi sea onsen'));
ok('export sheet is read-only', await p.$eval('#sheetText',e=>e.readOnly));
await p.click('#sheetClose'); await p.waitForTimeout(150);

await p.click('#dayReset'); await p.waitForTimeout(150);
await p.click('#dayReset'); await p.waitForTimeout(300);
ok('reset restores the built-in day', (await p.$$eval('.tl .ev',e=>e.length))===n0);

await p.click('#dayImport'); await p.waitForTimeout(250);
ok('import sheet is editable', !(await p.$eval('#sheetText',e=>e.readOnly)));
ok('Copy hidden while importing', await p.$eval('#sheetCopy',e=>e.hidden));
await p.fill('#sheetText',json);
await p.click('#sheetAct'); await p.waitForTimeout(400);
ok('import restored the edited day', (await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent))).some(t=>t.includes('Hirauchi sea onsen')));

// bad JSON is reported, not thrown
await p.click('#dayImport'); await p.waitForTimeout(200);
await p.fill('#sheetText','{oops'); await p.click('#sheetAct'); await p.waitForTimeout(250);
ok('bad JSON shows a hint and keeps the sheet open', (await p.$eval('#sheetHint',e=>e.textContent)).includes('valid JSON') && await p.$eval('#sheet',e=>e.classList.contains('on')));
await p.click('#sheetClose');

// keyboard inset var exists
ok('--kb inset wired', (await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--kb'))).trim()!=='');

// notes flow at 16px (no iOS zoom)
await p.evaluate(()=>document.querySelector('nav [data-tab="notes"]').click()); await p.waitForTimeout(250);
await p.fill('#noteInput','buy onsen towels'); await p.click('#noteAdd'); await p.waitForTimeout(250);
ok('note added', (await p.$$eval('.note-item .txt',e=>e.map(x=>x.textContent))).includes('buy onsen towels'));
ok('note input is 16px', await p.$eval('#noteInput',e=>parseFloat(getComputedStyle(e).fontSize)>=16));

// bookings inline edit
await p.evaluate(()=>document.querySelector('nav [data-tab="info"]').click()); await p.waitForTimeout(250);
await p.click('[data-bedit]'); await p.waitForTimeout(250);
await p.fill('#bkBox','ABC123 seat 12A'); await p.press('#bkBox','Enter'); await p.waitForTimeout(300);
ok('booking saved', (await p.$$eval('.brow .bv',e=>e.map(x=>x.textContent))).some(t=>t.includes('ABC123')));

console.log(errs.length?'\n  JS ERRORS: '+errs.slice(0,4).join(' | '):'\n  ✓ no JS errors');
await b.close();
})();
