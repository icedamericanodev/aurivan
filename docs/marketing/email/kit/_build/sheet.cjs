const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const [out,w,...files]=process.argv.slice(2); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:+w*files.length+16*(files.length+1),height:900}});
const f=path.resolve('_build/_sheet.html'); fs.writeFileSync(f,`<body style="margin:16px;background:#888;display:flex;gap:16px;align-items:flex-start">${files.map(f=>`<img src="file://${path.resolve('previews',f)}" style="width:${w}px;display:block">`).join('')}</body>`);
await p.goto('file://'+f); await p.waitForLoadState('networkidle'); await p.screenshot({path:out,fullPage:true}); await b.close(); })();
