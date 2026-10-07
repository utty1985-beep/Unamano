/* Wind comparisons and forecast timing. Unix timestamps avoid point/phone timezone ambiguity. */
(function(root){'use strict';
const num=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const angle=(a,b)=>Math.abs(((a-b+540)%360)-180);
const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];
const windName=d=>names[Math.round((((d%360)+360)%360)/45)%8];
function baseline(p){let dir=num(p.windDeg)??num(p.weather?.windDeg);if(dir==null){const name=String(p.windName||p.weather?.windName||'').replace(/\s*\(.*?\)\s*/g,'').trim(),i=names.indexOf(name);if(i>=0)dir=i*45;}return {dir,speed:num(p.windSpeed)??num(p.weather?.windSpeed),gust:num(p.windGust)??num(p.weather?.windGust)};}
function sample(h,i){return {time:num(h.time?.[i]),dir:num(h.wind_direction_10m?.[i]),speed:num(h.wind_speed_10m?.[i]),gust:num(h.wind_gusts_10m?.[i])};}
const complete=s=>s.time!=null&&s.dir!=null&&s.speed!=null&&s.dir>=0&&s.dir<=360&&s.speed>=0;
function compare(base,now){if(base.dir==null||base.speed==null)return null;return (base.speed<3&&now.speed<3||angle(base.dir,now.dir)<=45)&&Math.abs(base.speed-now.speed)<=10;}
function changed(a,b){if(a.speed<3&&b.speed<3)return false;return (a.speed<3)!==(b.speed<3)||a.speed>=3&&b.speed>=3&&angle(a.dir,b.dir)>=45||Math.abs(a.speed-b.speed)>=10||a.gust!=null&&b.gust!=null&&Math.abs(a.gust-b.gust)>=15;}
function analyze(data,point,targetSeconds){
 const h=data.hourly||{},times=h.time||[];if(!times.length||!Number.isFinite(targetSeconds))throw Error('Previsione oraria non disponibile.');
 const numeric=times.map(num);if(numeric.some(x=>x==null))throw Error('Orari meteo non validi.');
 if(targetSeconds<numeric[0]||targetSeconds>numeric.at(-1)+3599)throw Error('L’orario scelto è fuori dall’intervallo della previsione.');
 let i=0;for(let n=1;n<times.length;n++){if(numeric[n]>targetSeconds)break;i=n;}
 let now=sample(h,i);const c=data.current;
 if(c&&num(c.time)!=null&&Math.abs(c.time-targetSeconds)<=1800){const live={time:+c.time,dir:num(c.wind_direction_10m),speed:num(c.wind_speed_10m),gust:num(c.wind_gusts_10m)};if(complete(live))now=live;}
 if(!complete(now))throw Error('Dati del vento mancanti per l’orario scelto.');
 const base=baseline(point),similar=compare(base,now),end=Math.min(numeric.at(-1),targetSeconds+24*3600);
 let change=null,knownUntil=now.time,gap=false,similarUntil=similar===true?now.time:null,similarEnded=false;
 for(let n=i+1;n<times.length&&numeric[n]<=end;n++){
  const next=sample(h,n);if(!complete(next)||next.time-knownUntil>5400){gap=true;break;}
  knownUntil=next.time;
  if(!change&&changed(now,next))change=next;
  if(similar&&!similarEnded){if(compare(base,next)!==true){similarEnded=true;}else similarUntil=next.time;}
 }
 return {now,base,similar,change,knownUntil,gap,similarUntil,timezone:data.timezone||'Europe/Rome'};
}
const api={analyze,baseline,compare,changed,angle,windName};if(typeof module==='object'&&module.exports)module.exports=api;else root.PFC_WIND_ENGINE=api;
})(typeof window!=='undefined'?window:globalThis);
