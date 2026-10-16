/* Passione Funghi e Caccia · otto venti e denominazioni tradizionali foggiane.
   Direzione e nome canonico restano invariati nei dati salvati. */
(()=>{
 'use strict';
 const rows=[
  {standard:'Tramontana',dir:'N', local:'A Vòrjë',     aliases:['vorje','voria','vorie']},
  {standard:'Grecale',   dir:'NE',local:'U Rignanêsë', aliases:['rignanese']},
  {standard:'Levante',   dir:'E', local:'A Vutìnë',    aliases:['vutine','vutina']},
  {standard:'Scirocco',  dir:'SE',local:'U Sciròcche', aliases:['scirocche']},
  {standard:'Ostro',     dir:'S', local:"L'Asculänë",  aliases:['asculane','asculano']},
  {standard:'Libeccio',  dir:'SO',local:'U Garbìne',   aliases:['garbine','garbino']},
  {standard:'Ponente',   dir:'O', local:'U Favùgnë',   aliases:['favugne','favugna']},
  {standard:'Maestrale', dir:'NO',local:'U Majëllêsë', aliases:['majellese','majelese']}
 ];
 const names=rows.map(row=>row.standard);
 const simplify=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it-IT').replace(/[’']/g,'').trim();
 function canonical(value){
  const text=String(value??'').trim();
  if(!text)return '';
  // Prefer the named standard direction, including legacy "Voria (Grecale)" data.
  const hit=names.find(n=>new RegExp('(?:^|[^a-zÀ-ÿ])'+n+'(?:$|[^a-zÀ-ÿ])','i').test(text));
  if(hit)return hit;
  const clean=simplify(text);
  const local=rows.find(row=>row.aliases.some(alias=>new RegExp('(?:^|[^a-z])'+alias+'(?:$|[^a-z])','i').test(clean)));
  return local?.standard||text;
 }
 function name(value){
  const standard=canonical(value);
  const row=rows.find(r=>r.standard===standard);
  return row?row.local+' ('+row.standard+' · '+row.dir+')':standard;
 }
 function fromDegrees(value){
  if(value==null||value===''||!Number.isFinite(Number(value)))return 'Vento non disponibile';
  const degree=((Number(value)%360)+360)%360;
  return name(names[Math.round(degree/45)%8]);
 }
 const api={name,canonical,fromDegrees,names,rows:rows.map(({standard,dir,local})=>({standard,dir,local}))};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.PFC_WIND_LABELS=api;
})();
