(function(){
function addInfo(){
  const head=document.querySelector('#activity .section-head');
  if(head&&!document.getElementById('umMultiAppsInfo')){
    const d=document.createElement('div');
    d.id='umMultiAppsInfo';
    d.className='notice info';
    d.style.marginBottom='14px';
    d.innerHTML='<b>📨 Puoi candidarti a più annunci</b><br><span class="small">Le candidature a richieste diverse possono restare attive contemporaneamente. Non puoi inviare due candidature duplicate allo stesso annuncio.</span>';
    head.insertAdjacentElement('afterend',d);
  }
}
function patch(){
  if(window.__umMultiApply||typeof window.applyJob!=='function')return false;
  window.__umMultiApply=1;
  const old=window.applyJob;
  window.applyJob=async function(id){
    const r=await old.apply(this,arguments);
    setTimeout(addInfo,80);
    return r;
  };
  return true;
}
function boot(){
  addInfo();
  let n=0;
  const t=setInterval(()=>{n++;addInfo();patch();if((window.__umMultiApply&&n>8)||n>40)clearInterval(t)},250);
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();