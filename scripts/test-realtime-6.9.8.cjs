const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const supabase=new Function(fs.readFileSync('cacciatraccia/vendor/supabase-2.95.3.js','utf8')+';return supabase;')();
const src=fs.readFileSync('cacciatraccia/friends-6.9.8.js','utf8');
const url=src.match(/const URL='([^']+)'/)[1],key=src.match(/const KEY='([^']+)'/)[1],room='pfc-check-'+crypto.randomBytes(16).toString('hex');
const clients=[0,1].map(()=>supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
let channels=[],received=false,present=false;
const timeout=setTimeout(()=>{console.error('Realtime integration timed out');process.exit(2)},25000);
(async()=>{
 for(let i=0;i<2;i++)channels.push(clients[i].channel(room,{config:{presence:{key:'test'+i},broadcast:{ack:true}}}));
 channels[1].on('broadcast',{event:'team'},e=>{assert.equal(e.payload.test,'voice-fragment-check');received=true;});
 channels[1].on('presence',{event:'sync'},()=>{present=Object.keys(channels[1].presenceState()).includes('test0');});
 await Promise.all(channels.map(c=>new Promise((res,rej)=>c.subscribe(s=>{if(s==='SUBSCRIBED')res();if(s==='CHANNEL_ERROR')rej(Error('Channel error'));}))));
 assert.equal(await channels[0].track({test:'position-check',lat:0,lng:0}),'ok');
 assert.equal(await channels[0].send({type:'broadcast',event:'team',payload:{test:'voice-fragment-check'}}),'ok');
 await new Promise((res,rej)=>{let t=setInterval(()=>{if(received&&present){clearInterval(t);res()}},50);setTimeout(()=>{clearInterval(t);rej(Error('No presence/broadcast delivery'))},7000)});
 console.log('PASS actual Supabase Realtime: two independent clients, acknowledged broadcast delivered, position presence synchronized. Synthetic payload; test channels removed.');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{for(let i=0;i<channels.length;i++)await clients[i].removeChannel(channels[i]);clearTimeout(timeout);});
