/* Passione Funghi e Caccia: load application functions only after verified account access. */
(() => {
 'use strict';
 const q=id=>document.getElementById(id);
 const gate=q('pfcAuthGate'),form=q('pfcAuthForm'),message=q('pfcAuthMessage');
 let client,mode='login',loading=false,opened=false,recovery=false;
 const loadedScripts=new Set();let mailReadyAt=0;
 const callbackUrl=new URL(location.href),callbackHash=new URLSearchParams(location.hash.slice(1));
 const linkError=callbackUrl.searchParams.get('error')||callbackHash.get('error');
 function mailCooldown(seconds=60){mailReadyAt=Date.now()+seconds*1000;}
 function errorMessage(e){const raw=String(e.message||'');return e.status===429||/rate limit|only request this after/i.test(raw)?'Richiesta troppo ravvicinata. Attendi almeno un minuto prima di riprovare.':/invalid login/i.test(raw)?'Email o password non corrette.':/email not confirmed/i.test(raw)?'Email non confermata. Usa Reinvia conferma e apri il link più recente.':/fetch|network/i.test(raw)?'Servizio non raggiungibile. Controlla Internet e riprova.':/expired|otp_expired|token not found|invalid.*link/i.test(raw)?'Link non valido o scaduto. Richiedi un nuovo link e usa soltanto l’ultima email.':raw||'Operazione non riuscita. Riprova.';}
 function status(text){message.textContent=text;}
 function setMode(next){
  mode=next; q('pfcAuthPasswordRow').hidden=next==='forgot'||next==='resend';
  q('pfcAuthPassword').autocomplete=next==='signup'||next==='reset'?'new-password':'current-password';
  q('pfcAuthPassword').required=next!=='forgot'&&next!=='resend';
  q('pfcAuthSubmit').textContent=({login:'Accedi',signup:'Crea account',forgot:'Invia email di recupero',resend:'Reinvia email di conferma',reset:'Salva nuova password'})[next];
  q('pfcAuthTitle').textContent=({login:'Accedi alla tua app',signup:'Crea il tuo account',forgot:'Recupera la password',resend:'Conferma il tuo indirizzo email',reset:'Scegli una nuova password'})[next];
  q('pfcAuthEmailRow').hidden=next==='reset';q('pfcAuthEmail').required=next!=='reset';status('');
 }
 function loadScript(src){if(loadedScripts.has(src))return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;const timer=setTimeout(()=>{s.remove();reject(Error('Caricamento troppo lento. Ricarica con Internet attivo.'))},20000);s.onload=()=>{clearTimeout(timer);loadedScripts.add(src);resolve()};s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('Caricamento non riuscito. Controlla Internet e ricarica.'))};document.body.appendChild(s);});}
 async function openApp(){
  if(opened||loading||recovery)return;loading=true;
  try {
   let user,offline=false;const remembered=window.PFC_LOCAL?.profile();
   if(!navigator.onLine&&!remembered)throw Error('Per il primo accesso su questo dispositivo serve Internet.');
   if(!navigator.onLine&&remembered){user=remembered;offline=true}
   else{
    let result,timer;try{result=await Promise.race([client.auth.getUser(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('network timeout')),10000)})])}catch(error){result={error}}finally{clearTimeout(timer)}
    if(result.error&&remembered&&(/fetch|network|timeout|offline/i.test(result.error.message||'')||result.error.status===0)){user=remembered;offline=true}
    else if(result.error||!result.data?.user||result.data.user.is_anonymous)throw Error(result.error&&!/session missing/i.test(result.error.message||'')?'Verifica account non riuscita. Controlla Internet e riprova.':'Accedi con email e password per continuare.');
    else user=result.data.user;
   }
   window.PFC_LOCAL?.selectAccount(user);if(!offline)window.PFC_LOCAL?.remember(user);
   window.__PFC_ACCOUNT_CONTEXT__={id:user.id,email:user.email||'',client,offline};
   status(offline?'Apro i dati locali senza rete…':'Accesso verificato. Apertura app…');
   for(const script of document.querySelectorAll('script[data-pfc-src]'))await loadScript(script.dataset.pfcSrc);
   opened=true;document.body.classList.remove('pfc-auth-locked');gate.hidden=true;
   const account=document.createElement('button');account.id='pfcAccountLogout';account.className='ghost';account.textContent='Esci';account.title=user.email||'Account';
   account.onclick=async()=>{account.disabled=true;const {error}=await client.auth.signOut();if(error){account.disabled=false;alert('Uscita non riuscita. Riprova.');return;}window.PFC_LOCAL?.forget();location.reload();};
   document.querySelector('.topActions')?.appendChild(account);
   if(q('accountBtn')){q('accountBtn').disabled=false;q('accountBtn').textContent='Account / Esci';q('accountBtn').onclick=()=>{if(confirm('Account: '+user.email+'\nVuoi uscire?'))account.click();};}
   if(q('cloudStatus'))q('cloudStatus').textContent=offline?'Offline: modifiche sul dispositivo; backup in attesa di Internet.':'Account: '+user.email+' · preparo il backup privato.';
   window.dispatchEvent(new CustomEvent('pfc:authenticated',{detail:{id:user.id}}));
  }catch(e){status(e.message||'Accesso non disponibile. Riprova.');}finally{loading=false;}
 }
 q('pfcAuthSignup').onclick=()=>setMode('signup');q('pfcAuthLogin').onclick=()=>setMode('login');q('pfcAuthForgot').onclick=()=>setMode('forgot');q('pfcAuthResend').onclick=()=>setMode('resend');
 form.onsubmit=async event=>{
  event.preventDefault();if(!client){status('Servizio di accesso non disponibile. Ricarica con Internet.');return;}
  const button=q('pfcAuthSubmit'),email=q('pfcAuthEmail').value.trim(),password=q('pfcAuthPassword').value;
  button.disabled=true;status('Attendi…');
  try{
   if(['forgot','signup','resend'].includes(mode)&&Date.now()<mailReadyAt)throw Error('Attendi '+Math.ceil((mailReadyAt-Date.now())/1000)+' secondi prima di richiedere un’altra email.');
   if(mode==='resend'){
    const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:new URL('./',location.href).href}});if(error)throw error;mailCooldown();
    status('Richiesta inviata. Controlla anche Spam e usa soltanto il link dell’ultima email di conferma. Attendi un minuto prima di riprovare.');
   }else if(mode==='forgot'){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('./',location.href).href});if(error)throw error;mailCooldown();
    status('Se l’indirizzo è registrato, riceverai un’email con il link per scegliere una nuova password.');
   }else if(mode==='signup'){
    if(password.length<8)throw Error('Usa una password di almeno 8 caratteri.');
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('./',location.href).href}});if(error)throw error;mailCooldown();
    q('pfcAuthPassword').value='';if(data?.session)await openApp();else status('Controlla la tua email e conferma la registrazione, poi torna su Accedi.');
   }else if(mode==='reset'){
    if(password.length<8)throw Error('Usa una password di almeno 8 caratteri.');
    const {error}=await client.auth.updateUser({password});if(error)throw error;
    recovery=false;q('pfcAuthPassword').value='';await openApp();
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    q('pfcAuthPassword').value='';await openApp();
   }
  }catch(e){if(e.status===429)mailCooldown();status(errorMessage(e));}
  finally{button.disabled=false;}
 };
 async function init(){
  try{
   if(!window.supabase)throw Error('Servizio di accesso non caricato. Ricarica con Internet.');
   client=window.supabase.createClient('https://cfnivvdtyhpgbwmbgoke.supabase.co','sb_publishable_p_nrywLxqXT26U69v_SmPA_c1-4INqb',{auth:{storageKey:'pfc-account-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
   recovery=location.hash.includes('type=recovery');
   client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&opened&&session?.user?.id!==window.__PFC_ACCOUNT_CONTEXT__?.id){location.reload();return;}
    if(event==='PASSWORD_RECOVERY'){recovery=true;setMode('reset');}
    if(event==='SIGNED_OUT'){window.PFC_LOCAL?.forget();}if(event==='SIGNED_OUT'&&opened){document.body.classList.add('pfc-auth-locked');gate.hidden=false;location.reload();}
   });
   if(linkError){status('Link non valido o scaduto. Usa Reinvia conferma oppure Password dimenticata e apri soltanto il link più recente.');return;}
   if(recovery){setMode('reset');return;}
   await openApp();
  }catch(e){status(e.message||'Servizio non disponibile. Ricarica.');}
 }
 init();
})();
