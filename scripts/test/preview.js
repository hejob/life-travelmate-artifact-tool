// Reproduce the Artifact publish-time wrapper so Playwright sees what a phone sees.
const fs=require('fs');
const path=require('path');
const REPO=path.resolve(__dirname,'..','..');
const src=process.argv[2]||path.join(REPO,'app','sankara-days.html');
const out=process.argv[3]||path.join(REPO,'.preview.html');
const body=fs.readFileSync(src,'utf8');
fs.writeFileSync(out,`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"><style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found]){display:none!important}</style></head><body>\n${body}\n</body></html>`);
console.log('wrapped ->',out);
