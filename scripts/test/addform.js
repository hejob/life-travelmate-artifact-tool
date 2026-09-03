// Regression: "the add button is not showing the input form".
// A new item has no time, so it sorted to the end of the day — below the fold,
// and an artifact iframe cannot scroll itself (the page around it scrolls).
// The form now opens at the top of the list, where the button is.
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const W='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+'/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
const errs=[];
// emulate the artifact frame: the page itself never scrolls, the parent does
const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e)));
const ok=(n,v)=>console.log(`  ${v?'✓':'✗'} ${n}`);
await p.goto(W); await p.waitForTimeout(400);
// pick the longest day
await p.evaluate(()=>document.querySelectorAll('.daychip')[5].click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(300);
const addY=await p.evaluate(()=>Math.round(document.getElementById('evAdd').getBoundingClientRect().bottom));
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(350);
const g=await p.evaluate(()=>{const f=document.querySelector('.evform');
  if(!f) return null; const r=f.getBoundingClientRect();
  const first=document.querySelector('.tl').firstElementChild;
  return {top:Math.round(r.top),isFirst:first&&first.classList.contains('evform'),
    title:document.getElementById('f_title').value};});
ok('form exists', !!g);
ok('form opens at the top of the list, next to the button', g && g.isFirst);
// the edit bar wraps to a second row of chips below the Add button, so ~110px
ok(`form starts right under the edit bar (gap ${g&&g.top-addY}px)`, g && g.top-addY < 140);
ok('title starts empty, ready to type', g && g.title==='');

// cancel must not leave a stub row
const n0=await p.$$eval('.tl .ev',e=>e.length);
await p.click('#f_cancel'); await p.waitForTimeout(300);
const titles=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent));
ok('cancel leaves no empty stub', !titles.some(t=>t.includes('New item')||t.trim()==='') && (await p.$$eval('.tl .ev',e=>e.length))===n0);

// add + save lands in time order and confirms where
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(300);
await p.fill('#f_title','Hirauchi sea onsen'); await p.fill('#f_loc','Hirauchi'); await p.fill('#f_t1','09:20');
await p.click('#f_save'); await p.waitForTimeout(400);
const t2=await p.$$eval('.tl .ev .title',e=>e.map(x=>x.textContent.trim()));
const times=await p.$$eval('.tl .ev .time',e=>e.map(x=>x.textContent.trim().split('\n')[0]));
const mins=times.map(t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t);return m?+m[1]*60+ +m[2]:null;}).filter(x=>x!=null);
ok('saved item is in the day', t2.some(t=>t.startsWith('Hirauchi sea onsen')));
ok('clock times run forwards ['+times.join(', ')+']', mins.every((v,i)=>i===0||v>=mins[i-1]));
const note=await p.$('.savednote');
ok('confirmation says where it landed', note && (await note.textContent()).includes('09:20'));

// leaving edit mode with an unsaved new item discards it
const n1=await p.$$eval('.tl .ev',e=>e.length);
await p.evaluate(()=>document.getElementById('evAdd').click()); await p.waitForTimeout(250);
await p.evaluate(()=>document.getElementById('editToggle').click()); await p.waitForTimeout(300);
ok('exiting edit mode discards the unsaved stub', (await p.$$eval('.tl .ev',e=>e.length))===n1);
console.log(errs.length?'  JS ERRORS: '+errs.join(' | '):'  ✓ no JS errors');
await b.close();
})();
