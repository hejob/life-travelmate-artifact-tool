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
const at=async title=>{const ts=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
  return ts.findIndex(x=>x.startsWith(title));};
let i=await at('Hirauchi sea onsen');
await (await p.$$('[data-eedit]'))[i].click(); await p.waitForTimeout(250);
await p.fill('#f_title','Hirauchi sea onsen renamed');
await p.click('#f_save'); await p.waitForTimeout(300);
ok('edit saved', (await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent))).some(t=>t.includes('Hirauchi sea onsen renamed')));

// two-tap delete, on a different item so the export check below still has one
// delete the last item — the renamed one sorts to the top and the export
// check below still needs it
const dels=await p.$$('[data-edel]');
await dels[dels.length-1].click(); await p.waitForTimeout(200);
const armed=await p.$$eval('[data-edel]',e=>e[e.length-1].textContent.trim());
ok('first tap arms only', armed==='Delete?' && (await p.$$eval('.tl .ev',e=>e.length))===n1);
await (await p.$$('[data-edel]')).at(-1).click(); await p.waitForTimeout(250);
ok('second tap deletes', (await p.$$eval('.tl .ev',e=>e.length))===n1-1);

// export / import round trip
await p.click('#dayExport'); await p.waitForTimeout(250);
const json=await p.$eval('#sheetText',e=>e.value);
ok('export sheet has JSON', json.trim().startsWith('{') && json.includes('Hirauchi sea onsen renamed'));
ok('export sheet is read-only', await p.$eval('#sheetText',e=>e.readOnly));
await p.click('#sheetClose'); await p.waitForTimeout(150);

await p.click('#dayReset'); await p.waitForTimeout(150);
await p.click('#dayReset'); await p.waitForTimeout(300);
ok('reset restores the built-in day', (await p.$$eval('.tl .ev',e=>e.length))===n0);

await p.click('#dayImport'); await p.waitForTimeout(250);
ok('import sheet is editable', !(await p.$eval('#sheetText',e=>e.readOnly)));
ok('import shows Merge and Replace, not Copy',
  JSON.stringify(await p.$$eval('#sheetActs .fchip',e=>e.map(x=>x.textContent)))==='["Merge","Replace"]');
await p.fill('#sheetText',json);
await p.$$eval('#sheetActs .fchip',e=>e[1].click()); await p.waitForTimeout(400);   // Replace
ok('import restored the edited day', (await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent))).some(t=>t.includes('Hirauchi sea onsen renamed')));

// bad JSON is reported, not thrown
await p.click('#dayImport'); await p.waitForTimeout(200);
await p.fill('#sheetText','{oops'); await p.click('#sheetActs .fchip'); await p.waitForTimeout(250);
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


// ---- time ordering ----
console.log('\n  time ordering');
await p.evaluate(()=>localStorage.clear());
await p.goto(U); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(250);
const times=()=>p.$$eval('.tl .ev .time',e=>e.map(x=>x.textContent.trim().split('\n')[0]));
const titles=()=>p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
ok('built-in day starts in order', JSON.stringify(await times())===JSON.stringify(['13:30','15:00','16:00','eve']));

// a late-morning item added at the end lands in the middle
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(250);
await p.fill('#f_title','Early errand'); await p.fill('#f_loc','Naha'); await p.fill('#f_t1','09:15');
await p.click('#f_save'); await p.waitForTimeout(350);
ok('new item sorts to its hour, not the end', (await times())[0]==='09:15');

// editing a time moves the item
const idx=(await titles()).findIndex(t=>t.startsWith('Early errand'));
await (await p.$$('[data-eedit]'))[idx].click(); await p.waitForTimeout(250);
await p.fill('#f_t1','23:30'); await p.click('#f_save'); await p.waitForTimeout(400);
const after=await titles();
ok('retimed item moves to the new slot', after[after.length-1].startsWith('Early errand'));

// word times sort at the hour they mean
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(250);
await p.fill('#f_title','Word timed'); await p.fill('#f_loc','Naha'); await p.fill('#f_t1','am');
await p.click('#f_save'); await p.waitForTimeout(350);
const wt=await times();
ok('"am" sorts before 13:30', wt.indexOf('am')<wt.indexOf('13:30') && wt.indexOf('am')>-1);

// an unsorted import comes back ordered
const unsorted=JSON.stringify({days:{'2026-09-03':[
  {id:'z1',title:'Late',loc:'X',time:'20:00',s:1200},
  {id:'z2',title:'Early',loc:'X',time:'07:00',s:420},
  {id:'z3',title:'Middle',loc:'X',time:'12:00',s:720}]}});
await p.evaluate(()=>document.getElementById('dayImport').click()); await p.waitForTimeout(250);
await p.fill('#sheetText',unsorted); await p.$$eval('#sheetActs .fchip',e=>e[1].click()); await p.waitForTimeout(400);
ok('unsorted import is ordered on the way in', JSON.stringify(await titles())===JSON.stringify(['Early','Middle','Late']));
ok('order survives a reload', await (async()=>{await p.reload();await p.waitForTimeout(500);
  return JSON.stringify(await titles())===JSON.stringify(['Early','Middle','Late']);})());
ok('no drag handles anywhere', (await p.$$('[data-drag], .handle')).length===0);

console.log(errs.length?'\n  JS ERRORS: '+errs.slice(0,4).join(' | '):'\n  ✓ no JS errors');
await b.close();
})();
