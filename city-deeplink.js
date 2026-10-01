(function(){
  const params=new URLSearchParams(location.search);
  const city=(params.get('city')||'').trim();
  if(!city)return;
  let applied=false;
  function apply(){
    if(applied)return true;
    const input=document.getElementById('cityFilter');
    if(!input||typeof window.renderJobs!=='function')return false;
    input.value=city;
    try{window.renderJobs()}catch(e){}
    applied=true;
    setTimeout(()=>document.getElementById('feed')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    return true;
  }
  if(document.readyState==='complete')apply();else window.addEventListener('load',apply,{once:true});
  window.addEventListener('unamano:jobs-loaded',apply);
  let n=0;const t=setInterval(()=>{n++;if(apply()||n>40)clearInterval(t)},250);
})();
