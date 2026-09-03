// "Happening now / Up next" must react to ticking. Sep 3 is:
//   13:30 Set off · 15:00-16:00 Check in · 16:00 Toyota · eve Free
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const W='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+'/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ok=(n,v)=>console.log(`  ${v?'✓':'✗'} ${n}`);
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
const card=p=>p.evaluate(()=>{const c=document.querySelector('.nowcard');
  return c?{k:c.querySelector('.k').textContent,t:c.querySelector('.t').textContent.trim(),
    late:c.querySelector('.m.late')?c.querySelector('.m.late').textContent.trim():null,
    alldone:c.classList.contains('alldone')}:null;});
const tickByTitle=(p,t)=>p.evaluate(t=>{
  for(const ev of document.querySelectorAll('.tl .ev'))
    if(ev.querySelector('.title').textContent.includes(t)){ ev.querySelector('[data-tick]').click(); return true; }
  return false;},t);

// 14:00 JST = 05:00Z on Sep 3
const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
await p.clock.install({time:new Date('2026-09-03T05:00:00Z')});
await p.goto(W); await p.waitForTimeout(400);
let c=await card(p);
ok('at 14:00 the 13:30 item is "Happening now"', c && c.k==='Happening now' && c.t.startsWith('Set off by car'));

await tickByTitle(p,'Set off by car'); await p.waitForTimeout(300);
c=await card(p);
ok('ticking it advances to Up next', c && c.k.startsWith('Up next') && c.t.startsWith('Check in'));
ok('the countdown is right (60 min)', c && c.k.includes('1 h 0 min'));

await tickByTitle(p,'Check in'); await p.waitForTimeout(300);
c=await card(p);
ok('ticking again moves to the 16:00 item', c && c.t.startsWith('Drop car at Toyota'));

await tickByTitle(p,'Drop car at Toyota'); await p.waitForTimeout(300);
c=await card(p);
ok('with every timed item ticked it says so', c && c.alldone && c.t.includes('All ticked off'));

// un-tick and the card comes straight back
await tickByTitle(p,'Drop car at Toyota'); await p.waitForTimeout(300);
c=await card(p);
ok('un-ticking restores the card', c && !c.alldone && c.t.startsWith('Drop car at Toyota'));
await ctx.close();

// later in the day: an unticked item whose slot has passed is surfaced
const ctx2=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p2=await ctx2.newPage(); p2.on('pageerror',e=>errs.push(String(e).slice(0,120)));
await p2.clock.install({time:new Date('2026-09-03T08:30:00Z')});   // 17:30 JST
await p2.goto(W); await p2.waitForTimeout(400);
c=await card(p2);
ok('after the last slot it flags what is still unticked', c && c.late && c.late.includes('Not ticked yet'));
await tickByTitle(p2,'Set off by car'); await p2.waitForTimeout(200);
await tickByTitle(p2,'Check in'); await p2.waitForTimeout(200);
await tickByTitle(p2,'Drop car at Toyota'); await p2.waitForTimeout(300);
c=await card(p2);
ok('and clears the flag once they are ticked', c && !c.late && c.alldone);
await ctx2.close();

// a day that is not today shows no card at all
const ctx3=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:2400}});
const p3=await ctx3.newPage();
await p3.clock.install({time:new Date('2026-09-03T05:00:00Z')});
await p3.goto(W); await p3.waitForTimeout(400);
await p3.evaluate(()=>document.querySelectorAll('.daychip')[5].click()); await p3.waitForTimeout(300);
ok('other days show no now-card', (await card(p3))===null);
await ctx3.close();

console.log(errs.length?'  ✗ JS errors: '+errs[0]:'  ✓ no JS errors');
await b.close();
})();
