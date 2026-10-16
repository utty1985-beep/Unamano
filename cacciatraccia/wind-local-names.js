/* Local names shown in the UI; save canonical winds and exact compass direction. */
(()=>{
 'use strict';
 const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];
 const labels={
  Tramontana:'Voria (Tramontana · N)',
  Grecale:'Voria (Grecale · NE)',
  Ostro:'Favugna (Ostro · S)',
  Libeccio:'Favugna (Libeccio · SO)'
 };
 function canonical(value){
  const text=String(value??'').trim();
  if(!text)return '';
  const hit=names.find(n=>new RegExp('(?:^|[^a-zÀ-ÿ])'+n+'(?:$|[^a-zÀ-ÿ])','i').test(text));
  // A dialect word alone may represent more than one direction. Never guess.
  return hit||text;
 }
 function name(value){
  const standard=canonical(value);
  return labels[standard]||standard;
 }
 function fromDegrees(value){
  if(value==null||value===''||!Number.isFinite(Number(value)))return 'Vento non disponibile';
  const d=(((Number(value)%360)+360)%360),index=Math.round(d/45)%8;
  return name(names[index]);
 }
 const api={name,canonical,fromDegrees,names};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.PFC_WIND_LABELS=api;
})();
