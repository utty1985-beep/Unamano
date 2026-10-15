/* Passione Funghi e Caccia: load application functions only after verified account access. */
(() => {
 'use strict';
 const q=id=>document.getElementById(id);
 const gate=q('pfcAuthGate'),form=q('pfcAuthForm'),message=q('pfcAuthMessage');
 let client,mode='login',loading=false,opened=false,recovery=false;
 function status(text){message.textContent=text;}
 function setMode(next){
  mode=next; q('pfcAuthPasswordRow').hidden=next==='forgot';
  q('pfcAuthPassword').autocomplete=next==='signup'||next==='reset'?'new-password':'current-password';
  q('pfcAuthPassword').required=next!=='forgot';
  q('pfcAuthSubmit').textContent=({login:'Accedi',signup:'Crea account',forgot:'Invia email di recupero',reset:'Salva nuova password'})[next];
  q('pfcAuthTitle').textContent=({login:'Accedi alla tua app',signup:'Crea il tuo account',forgot:'Recupera la password',reset:'Scegli una nuova password'})[next];
  q('pfcAuthEmailRow').hidden=next==='reset';q('pfcAuthEmail').required=next!=='reset';status('');
 }
 function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(Error('Caricamento non riuscito. Controlla Internet e ricarica.'));document.body.appendChild(s);});}
 async function openApp(){
  if(opened||loading||recovery)return;loading=true;
  try {
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user||data.user.is_anonymous)throw Error(error && !/session missing/i.test(error.message||'') ? 'Verifica account non riuscita. Controlla Internet e riprova.' : 'Accedi con email e password per continuare.');
   const user=data.user;
   status('Accesso verificato. Apertura app…');
   for(const script of document.querySelectorAll('script[data-pfc-src]'))await loadScript(script.dataset.pfcSrc);
   opened=true;document.body.classList.remove('pfc-auth-locked');gate.hidden=true;
   const account=document.createElement('button');account.id='pfcAccountLogout';account.className='ghost';account.textContent='Esci';account.title=user.email||'Account';
   account.onclick=async()=>{account.disabled=true;const {error}=await client.auth.signOut();if(error){account.disabled=false;alert('Uscita non riuscita. Riprova.');return;}location.reload();};
   document.querySelector('.topActions')?.appendChild(account);
   if(q('accountBtn')){q('accountBtn').disabled=false;q('accountBtn').textContent='Account / Esci';q('accountBtn').onclick=()=>{if(confirm('Account: '+user.email+'\nVuoi uscire?'))account.click();};}
   if(q('cloudStatus'))q('cloudStatus').textContent='Accesso effettuato: '+user.email+'. Punti e diario sono conservati su questo dispositivo.';
   window.dispatchEvent(new CustomEvent('pfc:authenticated',{detail:{id:user.id}}));
  }catch(e){status(e.message||'Accesso non disponibile. Riprova.');}finally{loading=false;}
 }
 q('pfcAuthSignup').onclick=()=>setMode('signup');q('pfcAuthLogin').onclick=()=>setMode('login');q('pfcAuthForgot').onclick=()=>setMode('forgot');
 form.onsubmit=async event=>{
  event.preventDefault();if(!client){status('Servizio di accesso non disponibile. Ricarica con Internet.');return;}
  const button=q('pfcAuthSubmit'),email=q('pfcAuthEmail').value.trim(),password=q('pfcAuthPassword').value;
  button.disabled=true;status('Attendi…');
  try{
   if(mode==='forgot'){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('./',location.href).href});if(error)throw error;
    status('Se l’indirizzo è registrato, riceverai un’email con il link per scegliere una nuova password.');
   }else if(mode==='signup'){
    if(password.length<8)throw Error('Usa una password di almeno 8 caratteri.');
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('./',location.href).href}});if(error)throw error;
    q('pfcAuthPassword').value='';if(data?.session)await openApp();else status('Controlla la tua email e conferma la registrazione, poi torna su Accedi.');
   }else if(mode==='reset'){
    if(password.length<8)throw Error('Usa una password di almeno 8 caratteri.');
    const {error}=await client.auth.updateUser({password});if(error)throw error;
    recovery=false;q('pfcAuthPassword').value='';await openApp();
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    q('pfcAuthPassword').value='';await openApp();
   }
  }catch(e){const raw=String(e.message||'');status(/invalid login/i.test(raw)?'Email o password non corrette.':/email not confirmed/i.test(raw)?'Conferma prima l’indirizzo tramite il link ricevuto per email.':/fetch|network/i.test(raw)?'Servizio non raggiungibile. Controlla Internet e riprova.':/rate limit/i.test(raw)?'Troppi tentativi. Attendi qualche minuto e riprova.':raw||'Operazione non riuscita. Riprova.');}
  finally{button.disabled=false;}
 };
 async function init(){
  try{
   if(!window.supabase)throw Error('Servizio di accesso non caricato. Ricarica con Internet.');
   client=window.supabase.createClient('https://cfnivvdtyhpgbwmbgoke.supabase.co','sb_publishable_p_nrywLxqXT26U69v_SmPA_c1-4INqb',{auth:{storageKey:'pfc-account-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
   recovery=location.hash.includes('type=recovery');
   client.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY'){recovery=true;setMode('reset');}
    if(event==='SIGNED_OUT'&&opened){document.body.classList.add('pfc-auth-locked');gate.hidden=false;location.reload();}
   });
   if(recovery){setMode('reset');return;}
   await openApp();
  }catch(e){status(e.message||'Servizio non disponibile. Ricarica.');}
 }
 init();
})();
