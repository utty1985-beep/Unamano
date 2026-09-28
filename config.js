(function(){
  const l=document.createElement('link');
  l.rel='stylesheet';
  l.href='./theme-v2.css?v=20260928-3';
  document.head.appendChild(l);
})();

window.UNAMANO_CONFIG={
  supabaseUrl:'https://cfnivvdtyhpgbwmbgoke.supabase.co',
  supabaseKey:'sb_publishable_p_nrywLxqXT26U69v_SmPA_c1-4INqb'
};

window.addEventListener('load',()=>{
  const TERMS_VERSION='2026-09-27';
  const baseUrl=()=>location.origin+location.pathname;

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  window.shareSite=async function(){
    const home=location.origin+location.pathname.replace(/[^/]*$/,'');
    const data={title:'UnaMano',text:'UnaMano — Chiedi una mano. Dai una mano.',url:home};
    try{
      if(navigator.share){await navigator.share(data);return;}
      await navigator.clipboard.writeText(data.url);
      if(typeof toast==='function')toast('Link di UnaMano copiato.');
    }catch(e){if(e?.name!=='AbortError')prompt('Copia questo link:',data.url);}
  };

  const hero=document.querySelector('.hero-actions');
  if(hero&&!document.getElementById('shareSiteBtn')){
    const b=document.createElement('button');
    b.id='shareSiteBtn';b.className='btn g';b.textContent='Condividi UnaMano';b.onclick=window.shareSite;
    hero.appendChild(b);
  }

  window.shareJob=async function(id){
    let j=null;
    try{j=jobs.find(x=>x.id===id);}catch(e){}
    const home=location.origin+location.pathname.replace(/[^/]*$/,'');
    const url=home+'?job='+encodeURIComponent(id);
    const text=j?`${j.title} — ${j.city} — UnaMano`:'UnaMano';
    try{
      if(navigator.share){await navigator.share({title:'UnaMano',text,url});return;}
      await navigator.clipboard.writeText(text+'\n'+url);
      if(typeof toast==='function')toast('Link dell’annuncio copiato.');
    }catch(e){if(e?.name!=='AbortError')prompt('Copia questo link:',url);}
  };

  const sharedId=new URLSearchParams(location.search).get('job');
  if(sharedId){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      try{
        if(jobs.some(x=>x.id===sharedId)){
          clearInterval(timer);
          if(typeof openJob==='function')openJob(sharedId);
        }
      }catch(e){}
      if(tries>=12)clearInterval(timer);
    },350);
  }

  const style=document.createElement('style');
  style.textContent='.legal-consent{margin:12px 0;padding:12px;border:1px solid #D5DFE8;border-radius:12px;background:#F8FAFC;font-size:13px}.legal-consent label{display:flex;gap:8px;align-items:flex-start;margin:0;font-weight:650}.legal-consent input{width:auto;margin-top:3px}.site-footer{max-width:1160px;margin:0 auto 82px;padding:18px 16px;color:#667788;font-size:13px;text-align:center}.site-footer a{margin:0 6px;color:#526B8D}.site-footer strong{color:#31465A}';
  document.head.appendChild(style);

  const testbar=document.querySelector('.testbar');
  if(testbar)testbar.textContent='UnaMano · servizio gratuito · fase iniziale';

  const pass=document.getElementById('pass');
  const authCard=document.querySelector('#auth .card');
  let consent=document.getElementById('legalConsentWrap');
  if(pass&&authCard&&!consent){
    consent=document.createElement('div');
    consent.id='legalConsentWrap';
    consent.className='legal-consent hidden';
    consent.innerHTML='<label><input id="legalAccept" type="checkbox"><span>Dichiaro di avere almeno 18 anni, <a href="termini.html" target="_blank" rel="noopener">accetto i Termini di utilizzo</a> e confermo di aver letto l\' <a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a>.</span></label>';
    pass.insertAdjacentElement('afterend',consent);
  }

  const signupTab=document.getElementById('signupTab'),loginTab=document.getElementById('loginTab');
  signupTab?.addEventListener('click',()=>consent?.classList.remove('hidden'));
  loginTab?.addEventListener('click',()=>consent?.classList.add('hidden'));

  async function recordAcceptance(){
    try{
      if(localStorage.getItem('unamano_legal_pending')!==TERMS_VERSION||typeof sb==='undefined')return;
      const r=await sb.auth.getSession();
      const s=r?.data?.session;
      if(!s?.user?.id)return;
      const ins=await sb.from('legal_acceptances').insert({user_id:s.user.id,terms_version:TERMS_VERSION});
      if(!ins.error||ins.error.code==='23505')localStorage.removeItem('unamano_legal_pending');
    }catch(e){}
  }

  const originalSubmit=window.submitAuth;
  if(typeof originalSubmit==='function'&&document.getElementById('authSubmit')){
    window.submitAuth=async function(){
      let signingUp=false;
      try{signingUp=typeof authState!=='undefined'&&authState==='signup';}catch(e){}
      if(signingUp&&!document.getElementById('legalAccept')?.checked){
        const m=document.getElementById('msg');
        if(m)m.textContent='Per registrarti devi avere almeno 18 anni, accettare i Termini e leggere l’informativa privacy.';
        return;
      }
      const result=await originalSubmit.apply(this,arguments);
      if(signingUp){
        const m=document.getElementById('msg')?.textContent||'';
        let hasSession=false;
        try{hasSession=!!session;}catch(e){}
        if(hasSession||/Registrazione effettuata|Account creato|Benvenuto/i.test(m))localStorage.setItem('unamano_legal_pending',TERMS_VERSION);
      }
      await recordAcceptance();
      return result;
    };
    document.getElementById('authSubmit').onclick=window.submitAuth;
    if(pass)pass.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();window.submitAuth();}};
  }

  const originalLogin=window.login;
  if(typeof originalLogin==='function'){
    window.login=async function(){const r=await originalLogin.apply(this,arguments);await recordAcceptance();return r;};
  }
  recordAcceptance();

  const legalNotice=document.querySelector('#legal .notice');
  if(legalNotice)legalNotice.innerHTML='Consulta <a href="termini.html">Termini di utilizzo</a>, <a href="privacy.html">Informativa privacy</a> e il modulo pubblico <a href="segnala.html">Segnala contenuto</a>. Prima della promozione nazionale devono essere pubblicati i dati identificativi e un recapito diretto del gestore.';

  if(document.querySelector('main')&&!document.getElementById('siteFooter')){
    const footer=document.createElement('footer');
    footer.id='siteFooter';footer.className='site-footer';
    footer.innerHTML='<strong>UnaMano</strong> · gratuito nella fase iniziale<br><a href="termini.html">Termini</a><a href="privacy.html">Privacy</a><a href="segnala.html">Segnala contenuto</a><a href="#" id="footerShare">Condividi</a>';
    document.querySelector('main').insertAdjacentElement('afterend',footer);
    document.getElementById('footerShare')?.addEventListener('click',e=>{e.preventDefault();window.shareSite();});
  }

  window.reportJob=function(id){
    const home=location.origin+location.pathname.replace(/[^/]*$/,'');
    localStorage.setItem('unamano_report_url',home+'?job='+encodeURIComponent(id));
    location.href='segnala.html';
  };

  const reportUrlInput=document.getElementById('url');
  if(reportUrlInput){
    const fromQuery=new URLSearchParams(location.search).get('url');
    const saved=localStorage.getItem('unamano_report_url');
    if(fromQuery||saved)reportUrlInput.value=fromQuery||saved;
    if(saved)localStorage.removeItem('unamano_report_url');
  }
});

(function(){
  const s=document.createElement('script');
  s.src='./worker-features.js?v=20260927-2';
  s.onload=()=>{
    const d=document.createElement('script');
    d.src='./empty-city-demo.js?v=20260927-1';
    document.head.appendChild(d);
  };
  document.head.appendChild(s);
})();

(function(){
  const loadExtra=()=>{
    if(document.getElementById('unamanoProfileChatScript'))return;
    const p=document.createElement('script');
    p.id='unamanoProfileChatScript';
    p.src='./profile-chat.js?v=20260927-1';
    document.head.appendChild(p);
  };
  if(document.readyState==='complete')loadExtra();
  else window.addEventListener('load',loadExtra,{once:true});
})();

(function(){
  const loadAcceptedChat=()=>{
    if(document.getElementById('unamanoAcceptedChatScript'))return;
    const p=document.createElement('script');
    p.id='unamanoAcceptedChatScript';
    p.src='./accepted-chat.js?v=20260928-4';
    document.head.appendChild(p);
  };
  if(document.readyState==='complete')loadAcceptedChat();
  else window.addEventListener('load',loadAcceptedChat,{once:true});
})();

(function(){
  let deferredInstallPrompt=null;
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
  });

  const showInstallHelp=()=>{
    if(isIOS()){
      alert('Per installare UnaMano: tocca Condividi nel browser, poi “Aggiungi alla schermata Home”.');
      return;
    }
    alert('Per installare UnaMano: apri il menu del browser (⋮) e tocca “Installa app” oppure “Aggiungi a schermata Home”.');
  };

  window.installUnaMano=async function(){
    if(isStandalone()){
      if(typeof toast==='function')toast('UnaMano è già installata sul telefono.');
      return;
    }
    if(deferredInstallPrompt){
      const p=deferredInstallPrompt;
      deferredInstallPrompt=null;
      try{
        await p.prompt();
        const choice=await p.userChoice;
        if(choice?.outcome==='accepted'&&typeof toast==='function')toast('UnaMano installata sul telefono.');
        else if(choice?.outcome!=='accepted')showInstallHelp();
      }catch(e){showInstallHelp();}
      return;
    }
    showInstallHelp();
  };

  window.addEventListener('load',()=>{
    if(isStandalone())return;
    const hero=document.querySelector('.hero-actions');
    if(!hero||document.getElementById('installUnaManoBtn'))return;
    const b=document.createElement('button');
    b.id='installUnaManoBtn';
    b.className='btn p';
    b.textContent='📲 Installa sul tuo telefono';
    b.onclick=window.installUnaMano;
    hero.appendChild(b);
  });

  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    document.getElementById('installUnaManoBtn')?.remove();
    if(typeof toast==='function')toast('UnaMano è stata aggiunta al telefono.');
  });
})();
