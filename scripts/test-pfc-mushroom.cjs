const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('cacciatraccia/mushroom-recognition.js','utf8');
const table={headers:['rank','species_label','vision_score'],data:[[1,'Amanita muscaria','91.6%'],[2,'Suillus luteus','8.4%']]};
let calls=[],mode='ok';const navigator={onLine:true},context={window:{},navigator,AbortController,DOMException,FormData,TextDecoder,setTimeout,clearTimeout,fetch:async(url,options)=>{
 calls.push({url,options});
 if(mode==='hang')return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
 if(url.endsWith('/upload'))return Response.json(['/tmp/test.jpg']);
 if(url.endsWith('/call/v2/analyze'))return Response.json({event_id:'test'});
 const text=mode==='error'?'event: error\ndata: {"error":null}\n\n':'event: heartbeat\ndata: null\n\nevent: complete\ndata: '+JSON.stringify([{headers:['fake'],data:[]},table,'not a species'])+'\n\n';
 // Exercise incremental SSE decoding across event and JSON boundaries.
 const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){c.enqueue(bytes.slice(0,40));c.enqueue(bytes.slice(40,90));c.enqueue(bytes.slice(90));c.close()}}));
}};
vm.runInNewContext(source,context);const api=context.window.PFC_MUSHROOM;
(async()=>{
 const file=new File(['photo'],'test.jpg',{type:'image/jpeg'});
 const p=await api.identify(file);assert.equal(p.label,'Amanita muscaria');assert(Math.abs(p.confidence-.916)<1e-10);assert.equal(calls.length,3);
 const body=JSON.parse(calls[1].options.body);assert(!('latitude'in body)&&!('longitude'in body));assert.equal(body.include_clip,false);
 assert.throws(()=>api.parse(['species_label','Not a prediction']),/non valida/);
 assert.throws(()=>api.parse([null,{headers:['species_label','vision_score'],data:[['bad',null],['bad2','NaN%']]}]),/Nessuna ipotesi/);
 navigator.onLine=false;const count=calls.length;await assert.rejects(api.identify(file),/Internet/);assert.equal(calls.length,count);navigator.onLine=true;
 await assert.rejects(api.identify(new File(['x'],'x.txt',{type:'text/plain'})),/foto valida/);
 mode='error';await assert.rejects(api.identify(file),/non ha completato/);
 mode='hang';await assert.rejects(api.identify(file,{timeout:5}),/troppo tempo/);
 const abort=new AbortController(),pending=api.identify(file,{signal:abort.signal});abort.abort();await assert.rejects(pending,e=>e.name==='AbortError');
 console.log('PASS mushroom: documented API, photo upload, visual ranking, split SSE, strict parsing, no GPS/auth transmission, offline, backend failure, timeout and cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1});
