/* Passione Funghi e Caccia · Open-Meteo gratuito per uso non commerciale.
   Dati: Open-Meteo.com (CC BY 4.0); https://open-meteo.com/en/terms
   Bridge compatibile con le funzioni /forecast già usate dall'app.
*/
(()=>{'use strict';
 if(window.__PFC_OPEN_METEO_ONLY__)return;
 window.__PFC_OPEN_METEO_ONLY__=true;
 const rawFetch=window.fetch.bind(window);
 const memo=new Map();
 const MAX_ENTRIES=80,TTL_MS=12*60*1000,TIMEOUT_MS=17000;
 let active=0;
 const waiting=[];
 async function limited(run){
   if(active>=3)await new Promise(resolve=>waiting.push(resolve));
   active++;
   try{return await run();}
   finally{active--;const next=waiting.shift();if(next)next();}
 }
 function validateCoords(params){
   const lats=String(params.latitude??'').split(',').map(Number);
   const lons=String(params.longitude??'').split(',').map(Number);
   if(!lats.length||lats.length>49||lats.length!==lons.length||
      lats.some(v=>!Number.isFinite(v)||Math.abs(v)>90)||
      lons.some(v=>!Number.isFinite(v)||Math.abs(v)>180))
      throw Error('Coordinate meteo non valide');
   return {lats,lons};
 }
 function apiUrl(params,coords){
   const u=new URL('https://api.open-meteo.com/v1/forecast');
   u.searchParams.set('latitude',coords.lats.join(','));
   u.searchParams.set('longitude',coords.lons.join(','));
   const fields=['current','hourly','start_date','end_date','forecast_days','timeformat'];
   for(const key of fields){if(params[key])u.searchParams.set(key,String(params[key]));}
   if(params.start_date||params.end_date)u.searchParams.delete('forecast_days');
   if(!params.start_date&&!params.end_date&&!params.forecast_days)u.searchParams.set('forecast_days','7');
   u.searchParams.set('wind_speed_unit','kmh');
   u.searchParams.set('timezone','Europe/Rome');
   return u;
 }
 function annotate(d){
   if(!d||d.error||typeof d!=='object')throw Error(d?.reason||'Previsioni Open-Meteo non disponibili');
   return {...d,source:'Open-Meteo',source_url:'https://open-meteo.com/',source_license:'CC BY 4.0'};
 }
 async function obtain(params){
   const coords=validateCoords(params),url=apiUrl(params,coords);
   const key=url.toString(),now=Date.now(),saved=memo.get(key);
   if(saved&&now-saved.at<TTL_MS)return saved.promise;
   const promise=limited(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
      try{
        const response=await rawFetch(url.toString(),{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw Error(response.status===429?'Servizio meteo temporaneamente limitato':'Open-Meteo non disponibile (HTTP '+response.status+')');
        const data=await response.json(),result=Array.isArray(data)?data.map(annotate):annotate(data);
        if(coords.lats.length>1&&!Array.isArray(result))throw Error('Risposta meteo incompleta');
        return result;
      }finally{clearTimeout(timer);}
   });
   memo.set(key,{at:now,promise});
   promise.catch(()=>{if(memo.get(key)?.promise===promise)memo.delete(key);});
   while(memo.size>MAX_ENTRIES)memo.delete(memo.keys().next().value);
   return promise;
 }
 function respectAbort(promise,signal){
   if(!signal)return promise;
   if(signal.aborted)return Promise.reject(new DOMException('Operazione annullata','AbortError'));
   return new Promise((resolve,reject)=>{
     const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Operazione annullata','AbortError'));};
     signal.addEventListener('abort',abort,{once:true});
     promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},err=>{signal.removeEventListener('abort',abort);reject(err);});
   });
 }
 window.fetch=(input,init)=>{
   const raw=typeof input==='string'?input:input?.url||input?.href;
   let u;try{u=new URL(raw,location.href);}catch{return rawFetch(input,init);}
   if(u.hostname==='pfc-weather.invalid'&&u.pathname==='/forecast'){
     const params=Object.fromEntries(u.searchParams.entries());
     return respectAbort(obtain(params),init?.signal).then(data=>new Response(JSON.stringify(data),{
       status:200,headers:{'Content-Type':'application/json','X-Weather-Source':'Open-Meteo'}
     }));
   }
   return rawFetch(input,init);
 };
 try{localStorage.setItem('cacciatraccia-weather-v2',JSON.stringify({model:'best_match',site:'openmeteo',custom:''}));}catch{}
 function credit(){
   const body=document.getElementById('weatherBody'),card=body?.closest('.card');
   if(!card||document.getElementById('pfcWeatherSource'))return;
   const info=document.createElement('p');info.id='pfcWeatherSource';info.className='note';
   info.append('Previsioni e vento: ');
   const link=document.createElement('a');link.href='https://open-meteo.com/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open-Meteo.com';info.appendChild(link);
   info.append(' · dati CC BY 4.0 · aggiornamento online. I nomi locali dei venti sono indicativi.');
   body.insertAdjacentElement('beforebegin',info);
 }
 document.addEventListener('DOMContentLoaded',credit);
 window.addEventListener('pfc:ready',credit);
 if(document.body)new MutationObserver(credit).observe(document.body,{childList:true,subtree:true});
})();