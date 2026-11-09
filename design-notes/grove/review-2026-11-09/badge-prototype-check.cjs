const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'kaisip-badges.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function boot(saved){const events={},els={};for(const id of ['kb-main','kb-status','kb-try','kb-back'])els[id]={innerHTML:'',textContent:'',disabled:false,addEventListener(t,fn){this[t]=fn;}};const root={querySelector:s=>els[s.slice(1)]};let persisted;const ctx={document:{getElementById:()=>root},window:{addEventListener:(n,fn)=>events[n]=fn,openai:{widgetState:saved?{privateContent:{badges:saved}}:null,setWidgetState:s=>{persisted=s;return Promise.resolve();}}},localStorage:{getItem:()=>null,setItem(){}}};vm.createContext(ctx);vm.runInContext(script,ctx);return {els,events,saved:()=>persisted,click:(action,id)=>els['kb-main'].click({target:{closest:()=>({dataset:{action,id:String(id)}})}})}}
let app=boot();assert(app.els['kb-main'].innerHTML.includes('1 earned'));app.click('select',5);assert(app.els['kb-status'].textContent.includes('100 practice questions'));
app.els['kb-try'].onclick();assert(app.els['kb-status'].textContent.includes('First review'));assert.equal(app.saved().privateContent.badges.owned.length,2);
app.els['kb-back'].onclick();assert(app.els['kb-main'].innerHTML.includes('Your five areas'));assert(!/plant|grove|companion|pet/i.test(app.els['kb-main'].innerHTML));app.click('open',0);assert(app.els['kb-main'].innerHTML.includes('Your collection'));
for(let i=0;i<8;i++)app.els['kb-try'].onclick();assert(app.els['kb-try'].disabled);assert.equal(app.saved().privateContent.badges.owned.length,6);
let resumed=boot(app.saved().privateContent.badges);assert(resumed.els['kb-main'].innerHTML.includes('6 earned'));
let malformed=boot({version:1,owned:[-1,0,0,17,'oops']});assert(malformed.els['kb-main'].innerHTML.includes('1 earned'));
assert(!/data:image|fetch\(|XMLHttpRequest/.test(html));console.log('PASS: badge detail, award, no duplicates, completion, navigation, persistence, invalid-state filtering; no character assets or network requests.');
