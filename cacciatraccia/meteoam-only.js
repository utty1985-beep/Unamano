/* Single weather provider: the public forecast service used by www.meteoam.it. */
function meteoamToForecast(data,request,now=Date.now()){
 if(!Array.isArray(data.timeseries)||!Array.isArray(data.paramlist)||!data.datasets?.['0'])throw Error('Risposta MeteoAM non valida');
 const read=(name,index)=>{const p=data.paramlist.indexOf(name),v=data.datasets['0'][String(p)]?.[String(index)];return p<0||v==null||v==='-'||v===''||!Number.isFinite(Number(v))?null:Number(v);};
 let rows=data.timeseries.map((t,i)=>({t:Date.parse(t),i})).filter(x=>Number.isFinite(x.t));
 if(request.start_date)rows=rows.filter(x=>new Date(x.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'})>=request.start_date);
 if(request.end_date)rows=rows.filter(x=>new Date(x.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'})<=request.end_date);
 if(!rows.length)throw Error('Previsione MeteoAM non disponibile per la data scelta');
 const all=data.timeseries.map((t,i)=>({t:Date.parse(t),i})).filter(x=>Number.isFinite(x.t));
 const closest=all.reduce((a,b)=>Math.abs(b.t-now)<Math.abs(a.t-now)?b:a),time=t=>request.timeformat==='unixtime'?Math.floor(t/1000):new Date(t).toISOString();
 if(read('wkmh',closest.i)==null||read('wdir',closest.i)==null)throw Error('Vento MeteoAM non disponibile');
 if(Math.abs(closest.t-now)>6*3600000)throw Error('Previsione MeteoAM non aggiornata');
 const hourly={time:rows.map(x=>time(x.t)),temperature_2m:[],wind_speed_10m:[],wind_direction_10m:[],wind_gusts_10m:[],weather_code:[],precipitation_probability:[],precipitation:[]};
 for(const row of rows){hourly.temperature_2m.push(read('2t',row.i));hourly.wind_speed_10m.push(read('wkmh',row.i));hourly.wind_direction_10m.push(read('wdir',row.i));hourly.precipitation.push(read('tpp',row.i));hourly.wind_gusts_10m.push(null);hourly.weather_code.push(null);hourly.precipitation_probability.push(null);}
 return{latitude:Number(request.latitude),longitude:Number(request.longitude),timezone:'Europe/Rome',source:'Meteo Aeronautica Militare',source_url:'https://www.meteoam.it/',source_models:data.extrainfo?.models||{},current:{time:time(closest.t),temperature_2m:read('2t',closest.i),wind_speed_10m:read('wkmh',closest.i),wind_direction_10m:read('wdir',closest.i),wind_gusts_10m:null,weather_code:null},hourly,hourly_units:{temperature_2m:'°C',wind_speed_10m:'km/h',wind_direction_10m:'°',precipitation:'mm'},unavailableParameters:['weather_code','wind_gusts_10m','precipitation_probability']};
}
if(typeof module!=='undefined'&&module.exports)module.exports=meteoamToForecast;
if(typeof window!=='undefined')(()=>{
 'use strict';if(window.__PFC_METEOAM_ONLY__)return;window.__PFC_METEOAM_ONLY__=true;
 const original=window.fetch.bind(window),cache=new Map();let active=0;const queue=[];
 async function slot(task){if(active>=2)await new Promise(resolve=>queue.push(resolve));active++;try{return await task();}finally{active--;queue.shift()?.();}}
 function get(lat,lng){
  const key=lat.toFixed(3)+','+lng.toFixed(3),old=cache.get(key);if(old&&Date.now()-old.at<15*60000)return old.promise;
  const promise=slot(async()=>{const r=await original('https://api.meteoam.it/deda-meteograms/api/GetMeteogram/preset1/'+lat+','+lng,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('MeteoAM non disponibile');return r.json();});
  cache.set(key,{at:Date.now(),promise});promise.catch(()=>cache.delete(key));if(cache.size>64)cache.delete(cache.keys().next().value);return promise;
 }
 window.fetch=async(input,init)=>{
  const raw=typeof input==='string'?input:input?.url;let url;try{url=new URL(raw,location.href);}catch{return original(input,init);}
  if(url.hostname==='pfc-weather.invalid'&&url.pathname==='/forecast'){
   const parameters=Object.fromEntries(url.searchParams),lats=String(parameters.latitude).split(',').map(Number),lngs=String(parameters.longitude).split(',').map(Number);
   if(lats.length!==lngs.length||lats.length>49||lats.some(x=>!Number.isFinite(x)||Math.abs(x)>90)||lngs.some(x=>!Number.isFinite(x)||Math.abs(x)>180))throw Error('Coordinate meteo non valide');
   if(init?.signal?.aborted)throw new DOMException('Operazione annullata','AbortError');
   const result=await Promise.all(lats.map(async(lat,i)=>meteoamToForecast(await get(lat,lngs[i]),{...parameters,latitude:lat,longitude:lngs[i]})));
   return new Response(JSON.stringify(result.length===1?result[0]:result),{status:200,headers:{'Content-Type':'application/json','X-Weather-Source':'MeteoAM'}});
  }
  // Weather requests never fall back to a different supplier.
  if(/(^|\.)(windy\.com|3bmeteo\.com|ilmeteo\.it|open-meteo\.com)$/.test(url.hostname))throw Error('Fonte meteo disattivata: usa Aeronautica Militare');
  return original(input,init);
 };
 try{localStorage.setItem('cacciatraccia-weather-v2',JSON.stringify({model:'meteoam',site:'meteoam',custom:''}));}catch{}
 const style=document.createElement('style');style.textContent='#ctWeatherCustomWrap{display:none!important}';document.head.appendChild(style);
 function note(){const body=document.getElementById('weatherBody'),card=body?.closest('.card');if(!card||document.getElementById('pfcMeteoamSource'))return;const p=document.createElement('p');p.id='pfcMeteoamSource';p.className='note';p.textContent='Fonte unica: Meteo Aeronautica Militare. Raffiche, stato del cielo e probabilità di pioggia non disponibili nel collegamento non vengono stimati. Per il bollettino completo apri MeteoAM. I nomi locali dei venti sono indicativi: nome standard e direzione restano visibili.';body.insertAdjacentElement('beforebegin',p);}
 document.addEventListener('DOMContentLoaded',note);window.addEventListener('pfc:ready',note);new MutationObserver(note).observe(document.body,{childList:true,subtree:true});
})();
