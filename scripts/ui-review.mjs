// Isolated browser/component review: synthetic data and Next shims exist only
// in this bundle. No application auth bypass, database, or production route.
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".tmp", "ui-review");
await fs.mkdir(output, { recursive: true });
const shims = {
  "next/link": 'import React from "react"; export default function Link({href,children,prefetch,...props}) { return <a href={href} {...props}>{children}</a> }',
  "next/image": 'import React from "react"; export default function Image({src,alt,fill,priority,sizes,quality,placeholder,blurDataURL,...props}) { return <img src={typeof src==="string"?src:src.src} alt={alt} {...props} style={{...props.style,...(fill?{position:"absolute",inset:0,width:"100%",height:"100%"}:{})}}/> }',
  "next/navigation": 'export const usePathname=()=>({workflow:"/dashboard/transfers",runtime:"/dashboard/discovery/runtime",evidence:"/dashboard/consent",twin:"/dashboard/digital-twin"}[new URLSearchParams(location.search).get("view")]??"/dashboard/graph"); export const useSearchParams=()=>new URLSearchParams(location.search); export const useRouter=()=>({push:()=>{},refresh:()=>{}});',
  "@clerk/nextjs": 'export const useUser=()=>({isLoaded:true,isSignedIn:false});',
  "@/components/seo/json-ld": 'export function JsonLd(){return null}',
  "@/lib/recaptcha": 'export const recaptchaSiteKey=()=>"";',
};
await build({ absWorkingDir: root, entryPoints: ["scripts/fixtures/ui-review.tsx"], outdir: output, bundle: true, splitting: true, format: "esm", jsx: "automatic", define: { "process.env": "{}", "process.env.NODE_ENV": '"development"', "process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": '""' }, plugins: [{ name: "review-only-framework-shims", setup(plugin) { plugin.onResolve({ filter: /^(next\/link|next\/image|next\/navigation|@clerk\/nextjs|@\/components\/seo\/json-ld|@\/lib\/recaptcha)$/ }, (args) => ({ path: args.path, namespace: "fixture" })); plugin.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: shims[args.path], loader: "jsx", resolveDir: root })); } }] });
const postcss = require("postcss");
await build({ absWorkingDir: root, entryPoints: ["scripts/fixtures/dpdp-ssr-review.tsx"], outfile: path.join(output,"dpdp-ssr.cjs"), bundle: true, platform: "node", packages: "external", format: "cjs", jsx: "automatic" });
const { markup } = require(path.join(output,"dpdp-ssr.cjs"));
assert.ok(markup.includes('privacy-journey privacy-experience journey-static'),'Server-rendered guide uses readable stacked scenes');
assert.equal((markup.match(/class="act-reference-chapter"/g) ?? []).length,13,'All legal references are server-rendered');
assert.equal((markup.match(/class="journey-scene"/g) ?? []).length,7,'Every scene is accessible before JavaScript');
const styles = await postcss([require("@tailwindcss/postcss")]).process(await fs.readFile(path.join(root,"src/app/globals.css"),"utf8"), { from: path.join(root,"src/app/globals.css") });
await fs.writeFile(path.join(output,"review.css"), styles.css + await fs.readFile(path.join(root,"src/app/dashboard/dashboard.css"),"utf8") + await fs.readFile(path.join(root,"src/app/public-design.css"),"utf8") + await fs.readFile(path.join(root,"src/app/experience.css"),"utf8") + await fs.readFile(path.join(root,"src/app/dpdp-editorial.css"),"utf8") + await fs.readFile(path.join(root,"src/app/privacy-journey.css"),"utf8") + await fs.readFile(path.join(root,"src/app/privacy-experience.css"),"utf8"));
await fs.copyFile(path.join(root,'node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2'),path.join(output,'geist.woff2'));
await fs.appendFile(path.join(output,'review.css'),'@font-face{font-family:ReviewGeist;src:url(/geist.woff2) format("woff2");font-weight:100 900} :root{--font-geist-sans:ReviewGeist;--font-geist-mono:monospace}');
await fs.copyFile(path.join(root,'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'),path.join(output,'manrope.woff2'));
await fs.copyFile(path.join(root,'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'),path.join(output,'editorial.woff2'));
await fs.appendFile(path.join(output,'review.css'),'@font-face{font-family:ReviewManrope;src:url(/manrope.woff2) format("woff2");font-weight:200 800;font-display:swap}@font-face{font-family:ReviewEditorial;src:url(/editorial.woff2) format("woff2");font-weight:400;font-style:italic;font-display:swap}:root{--font-manrope:ReviewManrope;--font-editorial:ReviewEditorial}');
const server = http.createServer(async (request,response) => {
  const pathname = new URL(request.url,"http://localhost").pathname;
  if (pathname === "/" || pathname.startsWith("/dashboard")) { response.setHeader("content-type","text/html"); response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/review.css"><title>Consent Guru UI review</title></head><body><div id="root"></div><script type="module" src="/ui-review.js"></script></body></html>'); return; }
  const base = pathname.startsWith("/brand/") || pathname.startsWith("/images/") ? path.join(root,"public") : output;
  const file = path.resolve(base, "." + pathname);
  if (!file.startsWith(base + path.sep)) { response.writeHead(403).end(); return; }
  try { const bytes = await fs.readFile(file); response.setHeader("content-type", pathname.endsWith(".css") ? "text/css" : pathname.endsWith(".svg") ? "image/svg+xml" : pathname.endsWith(".png") ? "image/png" : "text/javascript"); response.end(bytes); } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0,"127.0.0.1",resolve));
const url = `http://127.0.0.1:${server.address().port}`;
console.log(`Local fixture preview: ${url}`);
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const demoApiRequests=[];
  page.on('request',request=>{if(page.url().includes('view=dpdp') && new URL(request.url()).pathname.startsWith('/api/')) demoApiRequests.push(request.url());});
  page.on("pageerror",(error)=>{ errors.push(error.message); console.error(error.stack); });
  await page.route("**/api/privacy-graph", route => route.fulfill({ json: { success: true, affected: [{ label: "Analytics tracker" }] } }));
  await page.route("**/api/tools/assessments", route => route.fulfill({ json: { assessments: [] } }));
  for (const view of ["graph","runtime","evidence","twin","hub","public","dpdp","pricing","about","solution","legal","blogs","workflow","article","learning","tools","auth"]) {
    await page.goto(`${url}/?view=${view}`); await page.locator("h1").waitFor(); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(550);
    if (view === "blogs" || view === "about") await page.locator('img').evaluateAll(images => Promise.all(images.map(img => { img.loading='eager'; return img.decode().catch(()=>undefined); })));
    await page.screenshot({ path: path.join(output,`${view}-desktop.png`), fullPage: view !== "public" && view !== "dpdp" });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1),true,`${view} desktop overflow`);
    if(view === "graph") {
      await page.getByRole("button",{name:"Analytics, purpose, configured",exact:true}).click();
      await page.getByRole("button",{name:"Preview disabling purpose"}).click();
      await page.getByText("1 affected entities").waitFor();
      await page.getByLabel("Search graph entities").fill("no-matching-entity");
      await page.getByText("No matching entities").waitFor();
      await page.getByRole("button",{name:"Clear filters"}).click();
      await page.getByRole("button",{name:"Dark theme"}).click();
      await page.screenshot({path:path.join(output,"graph-dark.png")});
    }
    if(view === "runtime") {
      await page.getByRole("button",{name:/Inspect fetch/}).click(); await page.getByRole("dialog").waitFor();
      assert.equal(await page.getByText("Not granted",{exact:true}).count(),1);
      await page.screenshot({path:path.join(output,"runtime-detail.png")});
      await page.keyboard.press("Escape"); assert.equal(await page.locator("dialog[open]").count(),0);
    }
    if(view === "twin") {
      await page.getByRole("button",{name:"3D exploration",exact:true}).click(); await page.locator("canvas").waitFor();
      await page.getByRole("button",{name:"Rotate left",exact:true}).click();
      await page.screenshot({path:path.join(output,"twin-3d.png")});
      await page.getByRole("button",{name:"Dependency map",exact:true}).click(); assert.equal(await page.locator("canvas").count(),0);
    }
    if(view === "public") { await page.getByRole("button",{name:"Evidence",exact:true}).click(); await page.getByRole("heading",{name:"Traceable privacy evidence"}).waitFor(); }
    if(view === "dpdp") {
      await page.locator('.privacy-journey.journey-ready').waitFor();
      await page.locator('.privacy-hero-world canvas').waitFor();
      await page.screenshot({path:path.join(output,'dpdp-hero-desktop.png')});
      await page.getByRole('group',{name:'Explore the privacy story'}).getByRole('button',{name:'Notice',exact:true}).click();
      await page.getByRole('heading',{name:'Clarity before a choice'}).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog[open]').count(),0);
      assert.equal(await page.locator('.journey-progression button').count(),7);
      const jump=async index=>{await page.locator('.journey-progression button').nth(index).click();await page.waitForFunction(index=>[...document.querySelectorAll('.journey-progression button')].findIndex(button=>button.hasAttribute('aria-current'))===index,index);await page.waitForTimeout(800);};
      await jump(0);
      await page.locator('.journey-webgl canvas').first().waitFor();
      assert.equal(await page.locator('.journey-travelling-ball,.journey-curved-path').count(),0,'No zigzag movement remains');
      assert.equal(await page.locator('.privacy-stage').count(),8,'Hero and all seven scenes exist');
      assert.ok(await page.locator('canvas').count()<=3,'Viewport limits GPU contexts');
      await page.screenshot({path:path.join(output,'dpdp-purpose-desktop.png')});
      await jump(1);
      assert.equal(await page.locator('#journey-Notice').evaluate(el=>getComputedStyle(el).position),'sticky','Tiles pin in a scroll stack');
      assert.equal(await page.locator('#journey-Purpose').getAttribute('inert'),'','Covered tiles cannot capture keyboard focus');
      assert.ok(await page.locator('#journey-Purpose .journey-scene-inner').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m11)<1,'Earlier tiles scale into the deck');
      await page.screenshot({path:path.join(output,'dpdp-tile-stack.png')});
      await page.locator('#journey-Notice').getByRole('button',{name:'Example data',exact:true}).click();
      await page.getByRole('heading',{name:'What is requested?',exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'dpdp-notice-inspection-desktop.png')});
      await page.getByRole('dialog').getByRole('button',{name:'Close explanation',exact:true}).click();
      await jump(1);
      const noticeCanvas=page.locator('#journey-Notice .journey-webgl canvas');
      const canvasSize=await noticeCanvas.boundingBox();
      await noticeCanvas.click({position:{x:canvasSize.width*.6,y:canvasSize.height*.45}});
      await page.getByRole('heading',{name:'Why is it requested?',exact:true}).waitFor();
      await page.getByRole('dialog').getByRole('button',{name:'Close explanation',exact:true}).click();
      await jump(1);

      await page.screenshot({path:path.join(output,'dpdp-notice-desktop.png')});
      await jump(2);
      assert.equal(await page.locator('.journey-progression [aria-current=step]').innerText(),'Consent');
      await page.locator('.journey-webgl canvas').first().waitFor();
      await page.getByRole('checkbox',{name:/Analytics/}).check();
      assert.equal(await page.locator('.journey-flow-map [data-open=true]').count(),0,'Drafts never open a path');
      await page.getByRole('button',{name:'Record demo choice'}).click();
      assert.equal(await page.locator('.journey-flow-map [data-open=true]').innerText(),'Analytics open');
      await page.waitForTimeout(350);
      await jump(2);
      assert.ok(await page.locator('#journey-Consent .journey-chapter-copy > p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=18,'Body text remains large');
      await page.screenshot({path:path.join(output,'dpdp-scroll-desktop.png')});
      assert.equal(await page.locator('.journey-progression').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true,'Journey controls fit below the header');
      await jump(3);
      await page.getByRole('button',{name:'Withdraw demo consent'}).click();
      assert.equal(await page.locator('.journey-flow-map [data-open=true]').count(),0);
      await page.locator('#journey-Withdrawal').getByLabel('Review demo history').fill('0');
      await page.getByText('Historical demo preview',{exact:true}).waitFor();
      assert.match(await page.locator('.journey-withdrawal [role=status]').innerText(),/withdrawn/);
      await page.locator('#journey-Withdrawal').getByRole('button',{name:'Return to current state'}).click();
      assert.equal(await page.locator('.journey-flow-map [data-open=true]').count(),0);
      await jump(4); await page.getByRole('button',{name:'Adult example'}).click();
      await page.getByText(/selecting this example does not grant consent/).waitFor();
      await page.locator('#journey-Children').getByRole('button',{name:'Guardian checkpoint',exact:true}).click();
      await page.getByRole('heading',{name:'An illustrative checkpoint',exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'dpdp-guardian-desktop.png')});
      await page.getByRole('dialog').getByRole('button',{name:'Close explanation',exact:true}).click();
      await jump(5);
      await page.locator('#journey-Responsibility .journey-webgl canvas').waitFor();
      await page.screenshot({path:path.join(output,'dpdp-responsibility-desktop.png')});
      await jump(6); await page.getByRole('button',{name:'Inspect demo record',exact:true}).click(); await page.getByText('Demo choice withdrawn',{exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'dpdp-record-window.png')});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog[open]').count(),0);
      assert.equal(await page.getByRole('button',{name:'Inspect demo record',exact:true}).evaluate(el=>el===document.activeElement),true,'Window restores keyboard focus');
      await page.locator('#journey-Evidence').getByRole('button',{name:'Time',exact:true}).click();
      await page.getByRole('heading',{name:'When the example happened',exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'dpdp-evidence-inspection-desktop.png')});
      await page.getByRole('dialog').getByRole('button',{name:'Close explanation',exact:true}).click();
      await jump(6);
      assert.equal(await page.locator('#journey-Evidence').evaluate(el=>el.getBoundingClientRect().bottom < document.querySelector('.journey-stage-footnote').getBoundingClientRect().top),true,'Evidence and footer occupy separate document space');
      await page.screenshot({path:path.join(output,'dpdp-evidence-desktop.png')});
      await page.getByRole('button',{name:'Record',exact:true}).click();
      await page.locator('.journey-hotspot-explanation').getByText(/preserves earlier decisions/).waitFor();
      const renderedModels=[];
      for(const [index,model] of ['Purpose','Notice','Consent','Withdrawal','Children','Responsibility','Evidence'].entries()){
        await jump(index);
        const canvas=page.locator(`#journey-${model} .journey-webgl canvas`);
        await canvas.waitFor();
        renderedModels.push((await canvas.screenshot()).toString('base64'));
        await page.screenshot({path:path.join(output,`dpdp-model-${model.toLowerCase()}.png`)});
        assert.ok(await page.locator('canvas').count()<=3,'Offscreen scenes release their GPU contexts');
      }
      assert.equal(new Set(renderedModels).size,7,'All seven sections render distinct visuals');
      await page.locator('#journey-Evidence .journey-webgl canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
      await page.locator('.journey-webgl.is-unavailable').waitFor();
      assert.equal(await page.locator('#journey-Evidence .privacy-stage-diagram').evaluate(el=>getComputedStyle(el).visibility),'visible','Context loss restores the scene-specific diagram');
      await page.locator('#journey-Evidence').getByRole('link',{name:'Read the full explanation'}).click();
      await page.locator('.act-complete-guide[open]').waitFor();
      assert.equal(await page.locator('.act-reference-chapter').count(),13);
      await page.getByRole('button',{name:'Close the complete guide'}).click();
      assert.equal(await page.locator('.act-complete-guide[open]').count(),0);
      await page.getByRole('button',{name:'Read the complete guide'}).click();
      await page.locator('#consent').waitFor({state:'visible'});
      await page.goto(`${url}/?view=dpdp#lifecycle`);
      await page.locator('.act-complete-guide[open]').waitFor();
      await page.locator('#lifecycle').waitFor({state:'visible'});
    }
    if(view === 'pricing') {
      await page.getByRole('tab',{name:/Silver/}).focus(); await page.keyboard.press('End');
      assert.equal(await page.getByRole('tab',{name:/Platinum/}).getAttribute('aria-selected'),'true');
      await page.getByRole('link',{name:/Request Platinum/}).first().waitFor();
      await page.getByText('Compare all three plans',{exact:true}).click();
      await page.screenshot({path:path.join(output,'pricing-comparison.png')});
    }
    if(view === 'legal') {
      await page.getByRole('button',{name:'Expand all sections'}).click();
      assert.equal(await page.locator('.document-section:not([open])').count(),0);
      await page.getByRole('button',{name:'Collapse all sections'}).click();
      await page.getByRole('navigation',{name:'Document sections'}).getByRole('link').nth(1).click();
      assert.equal(await page.locator('.document-section[open]').count(),1);
    }
    if(view === 'blogs') {
      await page.locator('.article-library img').evaluateAll(images => Promise.all(images.map(img => { img.loading='eager'; return img.decode().catch(()=>undefined); })));
      assert.equal(await page.locator('.article-library img').evaluateAll(images => images.filter(img=>!img.complete || img.naturalWidth === 0).length),0,'All referenced article covers load');
      await page.getByLabel('Search privacy articles').fill('no-matching-article');
      await page.getByRole('heading',{name:'No articles match your search.'}).waitFor();
      await page.getByRole('button',{name:'Clear filters'}).click();
      assert.ok(await page.locator('.article-library-results article').count()>0);
    }
    if(view === 'workflow') {
      await page.getByRole('tab',{name:'Transfers',exact:true}).focus();await page.keyboard.press('End');
      assert.equal(await page.getByRole('tab',{name:'Secure transfer',exact:true}).getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');await page.getByText('Create a transfer',{exact:true}).click();await page.getByText('Save transfer',{exact:true}).waitFor();
    }
    if(view === 'article') { await page.getByRole('navigation',{name:'Article sections'}).getByRole('link').first().click(); }
    if(view === 'learning') { await page.getByText('Read the complete module',{exact:true}).click(); assert.equal(await page.locator('.module-reading details[open]').count(),1); }
    if(view === 'tools') { await page.getByLabel('Filter tools').fill('no-matching-tool'); await page.getByText('No tool matches that filter.').waitFor(); await page.getByLabel('Filter tools').fill(''); }
    await page.setViewportSize({width:390,height:844}); await page.goto(`${url}/?view=${view}`); await page.locator("h1").waitFor();
    await page.screenshot({path:path.join(output,`${view}-mobile.png`)});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),true,`${view} mobile overflow`);
    if(view === "graph") { await page.getByRole("button",{name:"Open sidebar",exact:true}).click(); await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape"); assert.equal(await page.locator("dialog[open]").count(),0); }
    if(view === 'dpdp') {
      await page.locator('.privacy-journey.journey-static').waitFor();
      assert.equal(await page.locator('.journey-scene').count(),7);
      assert.equal(await page.locator('.privacy-overview-diagram').getAttribute('aria-label'),'Illustration: notice leads to a choice, continuing safeguards, and connected evidence.');
      assert.equal(await page.locator('.privacy-overview-diagram text').allTextContents().then(labels=>labels.join(',')),'Notice,Choice,Safeguards,Evidence','Compact overview retains the connected story');
      await page.locator('.privacy-hero-world').scrollIntoViewIfNeeded();
      await page.locator('.privacy-hero-world canvas').waitFor();
      await page.screenshot({path:path.join(output,'dpdp-overview-mobile.png')});
      await page.locator('#journey-Notice').getByRole('button',{name:'Control and rights',exact:true}).click();
      await page.getByRole('heading',{name:'What happens after the choice?',exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'dpdp-notice-inspection-mobile.png')});
      await page.getByRole('dialog').getByRole('button',{name:'Close explanation',exact:true}).click();
      await page.locator('#journey-Consent').scrollIntoViewIfNeeded();
      await page.getByRole('checkbox',{name:/Analytics/}).check();
      await page.getByRole('button',{name:'Record demo choice'}).click();
      await page.getByRole('button',{name:'Withdraw demo consent'}).click();
      assert.match(await page.locator('.journey-withdrawal [role=status]').innerText(),/withdrawn/);
      await page.screenshot({path:path.join(output,'dpdp-scroll-mobile.png')});
      const mobileModels=[];
      for (const [index,model] of ['Purpose','Notice','Consent','Withdrawal','Children','Responsibility','Evidence'].entries()) {
        await page.locator('.journey-progression button').nth(index).click();
        const canvas=page.locator(`#journey-${model} canvas`);
        await canvas.waitFor(); await page.waitForTimeout(400);
        assert.equal(await canvas.evaluate(el=>getComputedStyle(el).touchAction),'pan-y','Models preserve vertical touch scrolling');
        mobileModels.push(await canvas.screenshot({path:path.join(output,`dpdp-model-${model.toLowerCase()}-mobile.png`)}));
        assert.ok(await page.locator('.journey-webgl canvas').count()<=3,'Mobile scenes release offscreen GPU contexts');
      }
      assert.equal(new Set(mobileModels.map(buffer=>buffer.toString('base64'))).size,7,'All seven distinct models render on mobile');
    }
    results.push({view,desktop:true,mobile:true}); await page.setViewportSize({width:1440,height:1000});
  }
  const touchPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  touchPage.on('pageerror',error=>errors.push(error.message));
  await touchPage.goto(`${url}/?view=dpdp`);
  await touchPage.locator('.privacy-hero-world').scrollIntoViewIfNeeded();
  const touchCanvas=touchPage.locator('.privacy-hero-world canvas'); await touchCanvas.waitFor();
  assert.ok(await touchCanvas.evaluate(canvas=>canvas.width/canvas.getBoundingClientRect().width)<=1.26,'High-density phones cap rendering density at 1.25');
  const touchBounds=await touchCanvas.boundingBox(); assert.ok(touchBounds);
  const beforeSwipe=await touchPage.evaluate(()=>scrollY);
  const touchSession=await touchPage.context().newCDPSession(touchPage);
  const swipeX=touchBounds.x+touchBounds.width/2,swipeY=touchBounds.y+touchBounds.height*.8;
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipeX,y:swipeY}]});
  for(let step=1;step<=6;step++) { await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipeX,y:swipeY-step*22}]});await touchPage.waitForTimeout(30); }
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForTimeout(250);
  assert.ok(await touchPage.evaluate(()=>scrollY)>beforeSwipe+30,'Touch swipe over a 3D figure scrolls the page');
  await touchPage.screenshot({path:path.join(output,'dpdp-touch-mobile.png')}); await touchSession.detach();await touchPage.close();
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto(`${url}/?view=runtime`); await page.getByRole("button",{name:/Inspect fetch/}).click(); await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape");
  await page.goto(`${url}/?view=dpdp`); await page.locator('.privacy-journey.journey-static').waitFor(); assert.equal(await page.locator('.journey-scene').count(),7);
  assert.equal(await page.locator('.journey-webgl canvas').count(),0);
  await page.screenshot({path:path.join(output,'dpdp-reduced-motion.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:768,height:701});await page.goto(`${url}/?view=dpdp`);
  await page.locator('.privacy-journey.journey-static').waitFor();
  assert.equal(await page.locator('#journey-Consent').evaluate(el=>getComputedStyle(el).position),'relative','Oversized tiles use ordinary reading rather than trapping controls');
  await page.locator('.journey-progression button').nth(2).click();
  await page.getByRole('checkbox',{name:/Analytics/}).check();await page.getByRole('button',{name:'Record demo choice'}).click();
  await page.locator('.journey-progression button').nth(3).click();await page.getByRole('button',{name:'Withdraw demo consent'}).click();
  await page.locator('#journey-Withdrawal').getByRole('button',{name:'Return to current state'}).scrollIntoViewIfNeeded();
  assert.ok(await page.locator('#journey-Withdrawal').getByRole('button',{name:'Return to current state'}).evaluate(button=>button.getBoundingClientRect().bottom<=innerHeight),'Expanded history remains reachable in a short desktop viewport');
  await page.screenshot({path:path.join(output,'dpdp-stack-short-desktop.png')});
  await page.emulateMedia({reducedMotion:'no-preference'}); await page.setViewportSize({width:844,height:390}); await page.goto(`${url}/?view=dpdp`); await page.locator('.privacy-journey.journey-static').waitFor(); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Short-viewport readable fallback');
  assert.deepEqual(errors,[]);
  assert.deepEqual(demoApiRequests,[],'Educational controls never send consent or evidence API requests');
  await fs.writeFile(path.join(output,"results.json"),JSON.stringify({results,errors,reducedMotion:true},null,2));
  console.log(JSON.stringify({results,errors,reducedMotion:true},null,2));
} finally { await browser.close(); server.close(); }
