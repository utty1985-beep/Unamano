const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync('cacciatraccia/'+n,'utf8');
function harness(source){
 const apply=source.match(/function applyMode\(\)\{[\s\S]*?\n  \}/)[0];
 const elements=Object.fromEntries(['ctSightingCheck','quickSightingBtn','ctConditionBtn','ctCompareMainBtn','ctCalendarCard','ctHuntDayBar','quickMushroomBtn','quickSpeciesBtn'].map(id=>[id,{style:{display:''}}]));
 const ctx={cfg:{mode:'hunt'},historyFilter:'sightings',q:id=>elements[id]||null};vm.createContext(ctx);vm.runInContext(apply,ctx);
 return {ctx,elements,refresh:()=>ctx.applyMode(),visible:()=>elements.ctSightingCheck.style.display==='block'};
}
let old=harness(read('app-6.8.1.js'));old.elements.ctSightingCheck.style.display='block';old.refresh();assert.equal(old.visible(),false,'reproduce disappearing panel');
let h=harness(read('app-6.8.2.js'));h.elements.ctSightingCheck.style.display='block';
for(let i=0;i<20;i++){h.refresh();assert.equal(h.visible(),true,'mode refresh must preserve comparison');}
for(const filter of ['all','diary']){h.ctx.historyFilter=filter;h.refresh();assert.equal(h.visible(),false);}
h.ctx.historyFilter='sightings';h.refresh();assert.equal(h.visible(),true);
h.ctx.cfg.mode='mushroom';h.refresh();assert.equal(h.visible(),false);
h.ctx.cfg.mode='hunt';h.refresh();assert.equal(h.visible(),true);
for(const name of ['app-6.8.2.js','home-6.8.2.js','sw-6.8.2.js'])new Function(read(name));
assert.equal(read('index.html'),read('6.8.2.html'));
for(const file of ['app-6.8.2.js?v=6.8.2-final','home-6.8.2.js?v=6.8.2-forest']){assert.ok(read('index.html').includes(file));assert.ok(read('sw-6.8.2.js').includes(file));}
assert.ok(read('app-6.8.2.js').includes('./sw-6.8.2.js?v=6.8.2-final'));
console.log('PASS: reproduce 6.8.1 disappearing panel; 6.8.2 preserves it after updates and filter/mode changes; syntax and offline assets.');
