// Ask streams token by token. Every chunk used to replace the whole bubble text
// AND call scrollIntoView, i.e. a forced layout + scroll per token. On the
// second, longer answer that is a main-thread storm: the page stops responding.
const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const W='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+'/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ok=(n,v,extra='')=>console.log(`  ${v?'✓':'✗'} ${n}${extra?'  '+extra:''}`);
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_BIN});
const ctx=await b.newContext({...devices['iPhone 13']});
const p=await ctx.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
await p.addInitScript(()=>{
  const CHUNKS=400;
  const answer=('Yakushima in September is warm and very wet. '.repeat(30));
  const sample=async(msgs,opts)=>{
    let text='';
    const step=Math.ceil(answer.length/CHUNKS);
    for(let i=0;i<CHUNKS;i++){
      text=answer.slice(0,(i+1)*step);
      opts&&opts.onText&&opts.onText({text});
      await new Promise(r=>setTimeout(r,0));
    }
    return {text};
  };
  window.claude={use:n=>Promise.resolve(n==='sample'?sample:null)};
  // heartbeat: the longest gap between ticks is how long the main thread was busy
  window.__gaps=[]; let last=performance.now();
  setInterval(()=>{const t=performance.now();window.__gaps.push(t-last);last=t;},16);
});
await p.goto(W); await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector('nav [data-tab="ask"]').click()); await p.waitForTimeout(300);

for(const round of [1,2]){
  await p.evaluate(()=>{window.__gaps.length=0;});
  await p.fill('#askInput','question '+round);
  const t0=Date.now();
  await p.click('#askGo');
  await p.waitForFunction(()=>document.getElementById('askGo').textContent==='Ask',null,{timeout:60000});
  const ms=Date.now()-t0;
  const worst=await p.evaluate(()=>Math.round(Math.max(...window.__gaps)));
  const geo=await p.evaluate(()=>({scrollY:Math.round(window.scrollY),
    docH:Math.round(document.documentElement.scrollHeight), vh:window.innerHeight,
    navTop:Math.round(document.querySelector('nav').getBoundingClientRect().top),
    chatScrolls:(()=>{const c=document.getElementById('chat');return c.scrollHeight>c.clientHeight+4;})()}));
  console.log(`  round ${round}: ${ms} ms, stall ${worst} ms, page scrollY=${geo.scrollY}, doc ${geo.docH}px, nav top ${geo.navTop} (viewport ${geo.vh}), chat scrolls internally: ${geo.chatScrolls}`);
  ok(`round ${round}: streaming left the page scroll alone`, geo.scrollY===0, `scrollY=${geo.scrollY}`);
  ok(`round ${round}: nav is on screen`, geo.navTop < geo.vh && geo.navTop > 0, `navTop=${geo.navTop}`);
  // can the user still switch tabs right after?
  await p.evaluate(()=>document.querySelector('nav [data-tab="plan"]').click()); await p.waitForTimeout(200);
  const onPlan=await p.$eval('#pane-plan',e=>e.classList.contains('sel'));
  ok(`round ${round}: nav still works afterwards`, onPlan);
  await p.evaluate(()=>document.querySelector('nav [data-tab="ask"]').click()); await p.waitForTimeout(200);
}
ok('the newest reply is in view inside the transcript', await p.evaluate(()=>{
  const c=document.getElementById('chat'), last=c.lastElementChild;
  if(!last) return false;
  const cb=c.getBoundingClientRect(), lb=last.getBoundingClientRect();
  return lb.bottom<=cb.bottom+4 && lb.bottom>cb.top;
}));
ok('Clear chat is offered once there is a conversation', await p.$('#askClear')!==null);
await p.click('#askClear'); await p.waitForTimeout(250);
ok('Clear chat empties the transcript', (await p.$$eval('#chat .msg',e=>e.length))===0);
ok('and the suggestion chips come back', (await p.$$eval('#suggest .fchip',e=>e.length))>0);
console.log(errs.length?'  ✗ JS errors: '+errs[0]:'  ✓ no JS errors');
await b.close();
})();
