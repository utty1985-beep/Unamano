window.UNAMANO_CONFIG={
  supabaseUrl:'https://cfnivvdtyhpgbwmbgoke.supabase.co',
  supabaseKey:'sb_publishable_p_nrywLxqXT26U69v_SmPA_c1-4INqb'
};

window.addEventListener('load',()=>{
  const baseUrl=()=>location.origin+location.pathname;

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  window.shareSite=async function(){
    const data={title:'UnaMano',text:'UnaMano — Chiedi una mano. Dai una mano.',url:baseUrl()};
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
    const url=baseUrl()+'?job='+encodeURIComponent(id);
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
});
