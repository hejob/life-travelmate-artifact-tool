const { chromium, devices } = require('playwright');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const WRAPPED='file://'+path.join(REPO,'.preview.html');
process.env.CHROME_BIN=process.env.CHROME_BIN||require('os').homedir()+
  '/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';


const MIN=44, HARD=24;

function srgb(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function lum(p){return 0.2126*srgb(p[0])+0.7152*srgb(p[1])+0.0722*srgb(p[2]);}
function ratio(a,b){const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}

(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
for(const [name,dev,scheme] of [['iphone-se',devices['iPhone SE'],'light'],['iphone-13',devices['iPhone 13'],'dark']]){
  const ctx=await browser.newContext({...dev,colorScheme:scheme});
  const page=await ctx.newPage(); const errs=[];
  page.on('pageerror',e=>errs.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await page.goto(WRAPPED); await page.waitForTimeout(400);
  console.log(`\n===== ${name} ${page.viewportSize().width}x${page.viewportSize().height} (${scheme}) =====`);

  for(const tab of ['plan','ideas','notes','info']){
    await page.evaluate(t=>document.querySelector(`nav [data-tab="${t}"]`).click(),tab); await page.waitForTimeout(200);
    const d=await page.evaluate(({MIN,HARD})=>{
      const vis=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);
        return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
      const box=el=>{ // union of the element and its ::after hit overlay
        const r=el.getBoundingClientRect();
        const a=getComputedStyle(el,'::after');
        let h=r.height;
        if(a && a.content && a.content!=='none' && a.position==='absolute'){
          const ah=parseFloat(a.height); if(ah&&ah>h) h=ah;
        }
        return {w:Math.round(r.width),h:Math.round(h)};
      };
      const small=[],fonts=[],text=[];
      for(const el of document.querySelectorAll('button, a[href], input, select, textarea, [data-chk], [data-bedit]')){
        if(!vis(el))continue;
        const {w,h}=box(el), s=getComputedStyle(el);
        if(w<MIN||h<MIN) small.push({w,h,cls:(el.className.baseVal!==undefined?el.className.baseVal:el.className).toString().slice(0,26),
          label:(el.textContent||el.placeholder||el.id||'').trim().replace(/\s+/g,' ').slice(0,30),hard:(w<HARD||h<HARD),svg:!!el.ownerSVGElement});
        if(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)&&parseFloat(s.fontSize)<16) fonts.push({id:el.id||el.className,size:s.fontSize});
      }
      const bgOf=el=>{let n=el;while(n&&n!==document.documentElement){const b=getComputedStyle(n).backgroundColor;
        if(b&&!/rgba\(0, 0, 0, 0\)|transparent/.test(b))return b;n=n.parentElement;}return getComputedStyle(document.body).backgroundColor;};
      for(const el of document.querySelectorAll('body *')){
        if(!vis(el))continue;
        if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
        const s=getComputedStyle(el);
        text.push({size:parseFloat(s.fontSize),weight:s.fontWeight,fg:s.color,bg:bgOf(el),
          cls:(el.className.baseVal!==undefined?el.className.baseVal:el.className).toString().slice(0,22)||el.tagName,
          sample:el.textContent.trim().replace(/\s+/g,' ').slice(0,24)});
      }
      return {small,fonts,text,hscroll:document.documentElement.scrollWidth>window.innerWidth};
    },{MIN,HARD});

    const uniq=new Map();
    for(const x of d.small) uniq.set(x.cls+x.w+x.h,x);
    const bad=[...uniq.values()];
    console.log(`-- ${tab} --${d.hscroll?'  !! H-SCROLL !!':''}  targets<44: ${d.small.length}` +
      (bad.length?`\n${bad.map(x=>`     ${x.w}x${x.h}${x.hard?' HARD':''}${x.svg?' (svg)':''}  .${x.cls} "${x.label}"`).join('\n')}`:'  ✓'));
    if(d.fonts.length) console.log('     form fonts <16px:',JSON.stringify(d.fonts));
    // contrast
    const parse=c=>{const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c);return m?[+m[1],+m[2],+m[3]]:null;};
    const fails=[];
    for(const t of d.text){
      const fg=parse(t.fg),bg=parse(t.bg); if(!fg||!bg)continue;
      const r=ratio(fg,bg);
      const large=t.size>=24||(t.size>=18.66&&+t.weight>=700);
      const need=large?3:4.5;
      if(r<need) fails.push(`     ${r.toFixed(2)}:1 (need ${need}) ${t.size}px .${t.cls} "${t.sample}"`);
    }
    const uf=[...new Set(fails)];
    if(uf.length) console.log('     contrast fails (WCAG 1.4.3):\n'+uf.slice(0,10).join('\n'));
  }
  if(errs.length) console.log('  JS ERRORS:',errs.slice(0,4));

  // ---- edit mode + drag reorder ----
  await page.evaluate(()=>document.querySelector('nav [data-tab="plan"]').click()); await page.waitForTimeout(200);
  await page.evaluate(()=>document.getElementById('editToggle').click()); await page.waitForTimeout(250);
  const editSmall=await page.evaluate(()=>{
    const out=[];
    for(const el of document.querySelectorAll("#pane-plan button, #pane-plan a[href]")){
      const r=el.getBoundingClientRect(); if(!r.width)continue;
      const a=getComputedStyle(el,'::after'); let h=r.height;
      if(a&&a.content&&a.content!=='none'&&a.position==='absolute'){const ah=parseFloat(a.height); if(ah>h)h=ah;}
      if(r.width<44||h<44) out.push(`${Math.round(r.width)}x${Math.round(h)} .${el.className}`);
    }
    return {out:[...new Set(out)]};
  });
  console.log('-- plan-edit -- targets<44:',editSmall.out.length?editSmall.out:'✓');

  await page.screenshot({path:`v2-${name}-edit.png`});
  await page.evaluate(()=>document.getElementById('editToggle').click()); await page.waitForTimeout(200);
  await page.screenshot({path:`v2-${name}-plan.png`});
  await page.evaluate(()=>document.querySelector('nav [data-tab="info"]').click()); await page.waitForTimeout(250);
  await page.screenshot({path:`v2-${name}-info.png`});
  await ctx.close();
}
await browser.close();
})();
