const assert=require('node:assert/strict'),E=require('../cacciatraccia/wind-engine-6.9.3.js');
const start=Date.UTC(2026,9,7,6)/1000;
function weather(dirs,speeds=dirs.map(()=>8),gusts=dirs.map(()=>12)){return{timezone:'Europe/Rome',hourly:{time:dirs.map((_,i)=>start+i*3600),wind_direction_10m:dirs,wind_speed_10m:speeds,wind_gusts_10m:gusts}};}
const p={windDeg:350,windSpeed:8};
let z=E.analyze(weather([355,0,5,90]),p,start);assert(z.similar);assert.equal(z.change.time,start+3*3600);assert.equal(z.change.dir,90);assert.equal(z.similarUntil,start+2*3600);
z=E.analyze(weather([0,5,8]),{windName:'Tramontana',windSpeed:8},start);assert(z.similar);assert.equal(z.change,null);assert.equal(z.knownUntil,start+2*3600);
z=E.analyze(weather([0,180,270],[1,1,2]),{windDeg:0,windSpeed:1},start);assert(z.similar);assert.equal(z.change,null,'direction swings during calm are not a wind change');
z=E.analyze(weather([0,180,180],[1,4,4]),p,start);assert.equal(z.change.time,start+3600,'calm to wind is a change');
z=E.analyze(weather([0,0,0],[8,8,20]),p,start);assert.equal(z.change.time,start+2*3600);
z=E.analyze(weather([0,0],[8,8],[10,30]),p,start);assert.equal(z.change.time,start+3600,'gust change');
z=E.analyze(weather([0,null,0]),p,start);assert(z.gap);assert.equal(z.knownUntil,start);assert.equal(z.change,null,'missing hours cannot imply stability');
z=E.analyze(weather([0,0]),{},start);assert.equal(z.similar,null);assert.equal(z.change,null,'still show forecast if saved wind absent');
assert.throws(()=>E.analyze(weather([0,0]),p,start-3600),/fuori/);
assert.throws(()=>E.analyze(weather([null,0]),p,start),/mancanti/);
const j=weather([90,90]);j.current={time:start+600,wind_direction_10m:350,wind_speed_10m:8,wind_gusts_10m:10};z=E.analyze(j,p,start+600);assert(z.similar);assert.equal(z.now.dir,350,'use same current wind as a newly saved observation');
console.log('PASS wind: wraparound, stable horizon, missing-hour gaps, calm, speed/gust changes, missing baseline, out-of-range dates, current-wind comparison.');
