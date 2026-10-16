/* Photo-only Gradio adapter. Never infer species from arbitrary response text. */
(()=>{
 'use strict';
 const BASE='https://gaglileoo-mushroomwiseai.hf.space/gradio_api';
 function parse(data){
  // Output 1 is the visual model; output 0 also uses the service's location defaults.
  const table=data?.[1];
  if(!Array.isArray(table?.headers)||!Array.isArray(table?.data))throw Error('Risposta del riconoscimento non valida.');
  const label=table.headers.indexOf('species_label'),score=table.headers.indexOf('vision_score');
  if(label<0||score<0)throw Error('Formato del riconoscimento cambiato.');
  const rows=table.data.map(row=>{
   const raw=row[score],value=typeof raw==='string'&&raw.trim().endsWith('%')?Number(raw.trim().slice(0,-1))/100:raw;
   return {label:row[label],confidence:value};
  }).filter(row=>typeof row.label==='string'&&row.label.trim()&&typeof row.confidence==='number'&&Number.isFinite(row.confidence)&&row.confidence>=0&&row.confidence<=1).sort((a,b)=>b.confidence-a.confidence);
  if(!rows.length)throw Error('Nessuna ipotesi valida restituita dal modello.');
  return {...rows[0],alternatives:rows.slice(1,3)};
 }
 async function identify(file,{signal,timeout=90000}={}){
  if(navigator.onLine===false)throw Error('Per riconoscere la foto serve Internet. Puoi conservarla e riprovare quando torna la rete.');
  if(!file||!/^image\//.test(file.type)||file.size<=0)throw Error('Scegli una foto valida.');
  if(file.size>12*1024*1024)throw Error('Foto troppo grande: scegli un’immagine inferiore a 12 MB.');
  const controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(cancel,timeout);
  async function request(path,options={}){const r=await fetch(BASE+path,{...options,signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Servizio di riconoscimento momentaneamente non disponibile ('+r.status+').');return r;}
  try{
   const body=new FormData();body.append('files',file,'fungo.jpg');
   const paths=await (await request('/upload',{method:'POST',body})).json();
   if(!Array.isArray(paths)||typeof paths[0]!=='string')throw Error('Caricamento foto non riuscito.');
   // No GPS or account data is transmitted. Only the independent visual ranking is used.
   const job=await (await request('/call/v2/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploaded_image:{path:paths[0],meta:{_type:'gradio.FileData'}},include_clip:false,elevation_m:null})})).json();
   if(typeof job.event_id!=='string'||!job.event_id.match(/^[a-zA-Z0-9_-]+$/))throw Error('Avvio riconoscimento non riuscito.');
   const response=await request('/call/analyze/'+job.event_id),reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   try{while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done}).replace(/\r/g,'');let end;
    while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const lines=block.split('\n'),event=lines.find(x=>x.startsWith('event:'))?.slice(6).trim(),payload=lines.filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');
     if(event==='error')throw Error('Il servizio non ha completato l’analisi. Riprova tra poco.');
     if(event==='complete')return parse(JSON.parse(payload));
    }if(done)throw Error('Analisi interrotta: riprova.');
   }}finally{await reader.cancel().catch(()=>{});}
  }catch(e){if(controller.signal.aborted){if(signal?.aborted)throw new DOMException('Analisi annullata','AbortError');throw Error('Il servizio impiega troppo tempo. La foto resta disponibile: riprova tra poco.');}throw e;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 window.PFC_MUSHROOM={identify,parse};
})();
