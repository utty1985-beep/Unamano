/* Auth UI integration. All authentication and mail calls are mocked; no email is sent. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PFC_JSDOM_PATH||'jsdom');
const html=fs.readFileSync('cacciatraccia/index.html','utf8'),source=fs.readFileSync('cacciatraccia/auth-required.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture({url='https://example.test/cacciatraccia/',auth={}}={}){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;let calls=0;
 const mocked={getUser:async()=>({data:{user:null},error:{message:'Auth session missing'}}),onAuthStateChange(){},resend:async input=>{calls++;assert.equal(input.type,'signup');return{error:null}},...auth};
 w.supabase={createClient:()=>({auth:mocked})};w.eval(source);await tick();
 return{w,q:id=>w.document.getElementById(id),calls:()=>calls,close:()=>w.close()};
}
(async()=>{
 let f=await fixture();try{f.q('pfcAuthEmail').value='fixture@example.test';f.q('pfcAuthResend').click();assert(f.q('pfcAuthPasswordRow').hidden);assert(!f.q('pfcAuthPassword').required);await f.q('pfcAuthForm').onsubmit({preventDefault(){}});assert.equal(f.calls(),1);assert.match(f.q('pfcAuthMessage').textContent,/Richiesta inviata/);await f.q('pfcAuthForm').onsubmit({preventDefault(){}});assert.equal(f.calls(),1,'rapid repeat must not call the mail provider');assert.match(f.q('pfcAuthMessage').textContent,/Attendi/);}finally{f.close()}
 f=await fixture({url:'https://example.test/cacciatraccia/#error=access_denied&error_code=otp_expired'});try{assert.match(f.q('pfcAuthMessage').textContent,/Link non valido o scaduto/);assert(f.w.document.body.classList.contains('pfc-auth-locked'));}finally{f.close()}
 f=await fixture({auth:{signInWithPassword:async()=>({error:{status:400,message:'Email not confirmed'}})}});try{await f.q('pfcAuthForm').onsubmit({preventDefault(){}});assert.match(f.q('pfcAuthMessage').textContent,/Reinvia conferma/);}finally{f.close()}
 f=await fixture({auth:{resend:async()=>({error:{status:429,message:'For security purposes, you can only request this after 47 seconds.'}})}});try{f.q('pfcAuthResend').click();await f.q('pfcAuthForm').onsubmit({preventDefault(){}});assert.match(f.q('pfcAuthMessage').textContent,/minuto/);assert(!f.q('pfcAuthSubmit').disabled);}finally{f.close()}
 console.log('PASS auth: missing session stays locked; resend, cooldown, expired links, unconfirmed email and 429 recovery; no real mail sent.');
})().catch(e=>{console.error(e);process.exitCode=1});
