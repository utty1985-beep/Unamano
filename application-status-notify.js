(function(){
  let patchedAccept=false,patchedDecline=false,deepLinkHandled=false;

  async function notifyStatus(applicationId){
    if(!applicationId||!window.sb||!window.session?.user?.id)return;
    try{
      const r=await sb.functions.invoke('send-application-status-notify',{body:{application_id:applicationId}});
      if(r.error)console.warn('status notification dispatch failed',r.error);
    }catch(e){console.warn('status notification dispatch failed',e)}
  }

  function patchActions(){
    if(!patchedAccept&&typeof window.acceptApp==='function'){
      const original=window.acceptApp;
      const wrapped=async function(id){
        const result=await original.apply(this,arguments);
        setTimeout(()=>notifyStatus(id),120);
        return result;
      };
      wrapped.__umStatusNotifyWrapper=true;
      window.acceptApp=wrapped;
      patchedAccept=true;
    }
    if(!patchedDecline&&typeof window.declineApp==='function'){
      const original=window.declineApp;
      const wrapped=async function(id){
        const result=await original.apply(this,arguments);
        setTimeout(()=>notifyStatus(id),120);
        return result;
      };
      wrapped.__umStatusNotifyWrapper=true;
      window.declineApp=wrapped;
      patchedDecline=true;
    }
  }

  function handleActivityDeepLink(){
    if(deepLinkHandled)return;
    const params=new URLSearchParams(location.search);
    if(params.get('activity')!=='1')return;
    if(window.session?.user?.id&&typeof window.go==='function'){
      deepLinkHandled=true;
      go('activity');
      setTimeout(()=>{try{history.replaceState({},'',location.pathname)}catch(e){}},300);
    }
  }

  function boot(){
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      patchActions();
      handleActivityDeepLink();
      if((patchedAccept&&patchedDecline&&deepLinkHandled)||tries>120)clearInterval(t);
    },250);
  }

  if(document.readyState==='complete')boot();
  else window.addEventListener('load',boot,{once:true});
})();
