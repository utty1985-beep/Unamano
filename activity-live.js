(function(){
let channel=null,currentUser=null;
function notify(text,type=''){if(typeof toast==='function')toast(text,type);}
async function refresh(){try{if(typeof loadActivity==='function')await loadActivity(true);if(typeof loadJobs==='function')await loadJobs();}catch(e){}}
function start(){
  try{
    if(typeof sb==='undefined'||!sb||!session?.user?.id)return false;
    const uid=session.user.id;if(channel&&currentUser===uid)return true;
    if(channel)try{sb.removeChannel(channel)}catch(e){}
    currentUser=uid;
    channel=sb.channel('activity-live-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'applications'},payload=>{
      const n=payload.new||{},o=payload.old||{};
      if(payload.eventType==='INSERT'&&n.applicant_id!==uid)notify('Nuova candidatura ricevuta.');
      if(payload.eventType==='UPDATE'&&n.applicant_id===uid&&n.status!==o.status){
        if(n.status==='accepted')notify('🎉 La tua candidatura è stata accettata. Ora puoi aprire la chat.');
        else if(n.status==='declined')notify('La candidatura non è stata scelta.','warn');
      }
      refresh();
    }).subscribe();
    return true;
  }catch(e){return false;}
}
function boot(){let n=0;const t=setInterval(()=>{n++;if(start()&&n>6)clearInterval(t);if(n>40)clearInterval(t)},400);}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();