(function(){
  let wrapped=false;
  const q=id=>document.getElementById(id);

  async function canChat(peer,jobId){
    try{
      if(!window.sb||!window.session?.user?.id||!peer||!jobId)return false;
      const uid=window.session.user.id;
      const r=await sb.from('jobs').select('id,owner_id,assigned_to,status').eq('id',jobId).maybeSingle();
      if(r.error||!r.data)return false;
      const j=r.data;
      if(!['assigned','completed'].includes(j.status)||!j.assigned_to)return false;
      return (j.owner_id===uid&&j.assigned_to===peer)||(j.assigned_to===uid&&j.owner_id===peer);
    }catch(e){return false;}
  }

  function removeGenericChatButtons(root=document){
    try{
      root.querySelectorAll?.('#modalRoot [onclick*="openConversation"], .modal [onclick*="openConversation"]').forEach(b=>b.remove());
    }catch(e){}
  }

  function installGuard(){
    if(wrapped||typeof window.openConversation!=='function')return false;
    wrapped=true;
    const original=window.openConversation;
    window.openConversation=async function(peer,jobId){
      const ok=await canChat(peer,jobId);
      if(!ok){
        if(typeof window.toast==='function')window.toast('La chat si attiva dopo che una candidatura è stata accettata.','warn');
        return;
      }
      return original.call(this,peer,jobId);
    };
    return true;
  }

  const observer=new MutationObserver(muts=>{
    for(const m of muts){for(const n of m.addedNodes){if(n&&n.nodeType===1)removeGenericChatButtons(n)}}
    removeGenericChatButtons(document);
  });

  function boot(){
    removeGenericChatButtons(document);
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const t=setInterval(()=>{tries++;installGuard();removeGenericChatButtons(document);if(wrapped||tries>40)clearInterval(t)},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
