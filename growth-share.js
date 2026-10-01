(function(){
  const CAMPAIGN='unamano_invito';
  const BASE=()=>location.origin+location.pathname.replace(/[^/]*$/,'');
  const addTracking=(url,medium='organic')=>{
    try{
      const u=new URL(url,location.href);
      u.searchParams.set('utm_source','share');
      u.searchParams.set('utm_medium',medium);
      u.searchParams.set('utm_campaign',CAMPAIGN);
      return u.toString();
    }catch(e){return url;}
  };
  const getJob=id=>{try{return jobs.find(x=>x.id===id)}catch(e){return null}};
  const toastOk=msg=>{try{if(typeof toast==='function')toast(msg)}catch(e){}};

  async function share(data){
    try{
      if(navigator.share){await navigator.share(data);return true;}
      await navigator.clipboard.writeText(`${data.text||''}\n${data.url}`.trim());
      toastOk('Link copiato. Puoi inviarlo a chi vuoi.');
      return true;
    }catch(e){
      if(e?.name==='AbortError')return false;
      try{prompt('Copia questo link:',data.url)}catch(_){ }
      return false;
    }
  }

  window.shareSite=async function(){
    const url=addTracking(BASE(),'organic');
    return share({
      title:'UnaMano',
      text:'🤝 UnaMano mette in contatto persone della stessa città: puoi chiedere una mano o offrirla. Il servizio è gratuito nella fase iniziale.',
      url
    });
  };

  window.shareJob=async function(id){
    const j=getJob(id);
    const raw=BASE()+'?job='+encodeURIComponent(id);
    const url=addTracking(raw,'job-share');
    const text=j
      ? `🤝 Su UnaMano c’è questa richiesta a ${j.city}: “${j.title}”. Se conosci qualcuno interessato, condividila.`
      : '🤝 Guarda questa richiesta su UnaMano.';
    return share({title:j?.title||'UnaMano',text,url});
  };

  async function copyInvite(){
    const url=addTracking(BASE(),'copy');
    try{await navigator.clipboard.writeText(url);toastOk('Link invito copiato.');}
    catch(e){try{prompt('Copia questo link:',url)}catch(_){}}
  }

  function installInviteCard(){
    const host=document.querySelector('#home .side-sticky');
    if(!host||document.getElementById('umInviteCard'))return;
    const card=document.createElement('div');
    card.id='umInviteCard';
    card.className='card';
    card.style.marginTop='12px';
    card.innerHTML=`
      <b>📣 Fai conoscere UnaMano</b>
      <p class="small" style="margin:7px 0 11px">Più persone della stessa città partecipano, più è facile trovare una mano quando serve.</p>
      <div class="actions" style="margin-top:0">
        <button class="btn p sm" id="umInviteShare" type="button">Invita una persona</button>
        <button class="btn g sm" id="umInviteCopy" type="button">Copia link</button>
      </div>`;
    host.appendChild(card);
    document.getElementById('umInviteShare')?.addEventListener('click',()=>window.shareSite());
    document.getElementById('umInviteCopy')?.addEventListener('click',copyInvite);
  }

  function strengthenShareLabels(){
    document.querySelectorAll('button').forEach(b=>{
      if((b.textContent||'').trim()==='Condividi'&&b.getAttribute('onclick')?.includes('shareJob')) b.textContent='📣 Condividi richiesta';
    });
  }

  function boot(){
    installInviteCard();
    strengthenShareLabels();
    let n=0;
    const t=setInterval(()=>{
      n++;
      installInviteCard();
      strengthenShareLabels();
      if(n>30)clearInterval(t);
    },500);
    window.addEventListener('unamano:jobs-loaded',strengthenShareLabels);
  }

  if(document.readyState==='complete')boot();
  else window.addEventListener('load',boot,{once:true});
})();
