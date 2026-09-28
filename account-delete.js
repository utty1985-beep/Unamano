(function(){
  const q=id=>document.getElementById(id);
  let installed=false;

  function ensureStyles(){
    if(q('umAccountDeleteStyle'))return;
    const s=document.createElement('style');
    s.id='umAccountDeleteStyle';
    s.textContent='.account-danger{border:1px solid #f2c7c1;background:#fff8f7}.account-danger h3{color:#8b2c22;margin-top:0}.account-danger p{font-size:13px;color:#6f4b46}';
    document.head.appendChild(s);
  }

  function addCard(){
    if(q('deleteAccountCard'))return;
    const profile=document.getElementById('profile');
    if(!profile)return;
    const aside=profile.querySelector('aside')||profile;
    const card=document.createElement('div');
    card.id='deleteAccountCard';
    card.className='card account-danger';
    card.innerHTML='<h3>Elimina account</h3><p>Elimina definitivamente il tuo account, il profilo, gli annunci e gli altri dati collegati. Gli eventuali dati che devono essere conservati per obblighi di legge possono restare per il tempo necessario.</p><button id="deleteAccountBtn" class="btn d" type="button">Elimina definitivamente il mio account</button>';
    aside.appendChild(card);
    q('deleteAccountBtn').addEventListener('click',window.deleteUnaManoAccount);
  }

  window.deleteUnaManoAccount=async function(){
    try{
      if(!window.session?.user?.id||!window.sb){
        if(typeof window.toast==='function')window.toast('Accedi prima di eliminare l’account.','warn');
        return;
      }
      const first=confirm('Questa operazione elimina definitivamente l’account UnaMano e i dati collegati. Vuoi continuare?');
      if(!first)return;
      const typed=prompt('Per confermare scrivi esattamente: ELIMINA');
      if(typed!=='ELIMINA'){
        if(typeof window.toast==='function')window.toast('Eliminazione annullata.','warn');
        return;
      }
      const btn=q('deleteAccountBtn');
      if(btn){btn.disabled=true;btn.textContent='Eliminazione in corso…';}
      const {data,error}=await sb.functions.invoke('delete-account',{body:{confirm:'ELIMINA'}});
      if(error||!data?.ok)throw error||new Error(data?.error||'account_deletion_failed');
      try{await sb.auth.signOut({scope:'local'});}catch(e){}
      try{localStorage.clear();sessionStorage.clear();}catch(e){}
      alert('Account eliminato.');
      location.href=location.origin+location.pathname;
    }catch(e){
      const btn=q('deleteAccountBtn');
      if(btn){btn.disabled=false;btn.textContent='Elimina definitivamente il mio account';}
      if(typeof window.toast==='function')window.toast('Non è stato possibile eliminare l’account. Riprova.','err');
    }
  };

  function boot(){ensureStyles();addCard();installed=!!q('deleteAccountCard');}
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
  let tries=0;const t=setInterval(()=>{tries++;boot();if(installed||tries>40)clearInterval(t)},250);
})();
