(function(){
const q=id=>document.getElementById(id);
let installed=false;
function addAcceptedChatButtons(){try{if(!session?.user?.id||typeof jobs==='undefined'||typeof applications==='undefined')return;const uid=session.user.id,map=new Map(jobs.map(j=>[j.id,j])),incoming=applications.filter(a=>map.get(a.job_id)?.owner_id===uid),outgoing=applications.filter(a=>a.applicant_id===uid);document.querySelectorAll('#incomingApps .appcard').forEach((card,i)=>{const a=incoming[i],j=a&&map.get(a.job_id);if(!a||!j||a.status!=='accepted'||!['assigned','completed'].includes(j.status)||card.querySelector('.accepted-chat-btn'))return;const box=document.createElement('div');box.className='actions accepted-chat-actions';box.innerHTML=`<button class="btn p sm accepted-chat-btn" type="button">💬 Chatta con la persona scelta</button>`;box.querySelector('button').onclick=()=>{if(typeof openConversation==='function')openConversation(a.applicant_id,a.job_id);else if(typeof toast==='function')toast('La chat non è ancora disponibile. Ricarica la pagina.','warn');};card.appendChild(box);});document.querySelectorAll('#outgoingApps .appcard').forEach((card,i)=>{const a=outgoing[i],j=a&&map.get(a.job_id);if(!a||!j||a.status!=='accepted'||!['assigned','completed'].includes(j.status)||card.querySelector('.accepted-chat-btn'))return;const box=document.createElement('div');box.className='actions accepted-chat-actions';box.innerHTML=`<button class="btn p sm accepted-chat-btn" type="button">💬 Chatta con chi ha pubblicato</button>`;box.querySelector('button').onclick=()=>{if(typeof openConversation==='function')openConversation(j.owner_id,a.job_id);else if(typeof toast==='function')toast('La chat non è ancora disponibile. Ricarica la pagina.','warn');};card.appendChild(box);});}catch(e){}}
function install(){if(installed||typeof window.renderActivity!=='function')return false;installed=true;const old=window.renderActivity;window.renderActivity=function(){const r=old.apply(this,arguments);setTimeout(addAcceptedChatButtons,0);return r;};addAcceptedChatButtons();return true;}
function boot(){let tries=0;const timer=setInterval(()=>{tries++;if(install())setTimeout(addAcceptedChatButtons,250);else addAcceptedChatButtons();if(installed&&tries>8)clearInterval(timer);if(tries>40)clearInterval(timer);},250);}
function loadScriptOnce(id,src,onload){if(document.getElementById(id)){onload?.();return}const s=document.createElement('script');s.id=id;s.src=src;if(onload){s.onload=onload;s.onerror=onload}document.head.appendChild(s);}
function loadMarketplaceExtras(){
  loadScriptOnce('unamanoMarketplacePolish','./marketplace-polish.js?v=20260928-5',()=>{
    loadScriptOnce('unamanoCandidateActions','./candidate-actions.js?v=20260928-2',()=>{
      loadScriptOnce('unamanoMultiApplications','./multi-applications.js?v=20260928-2',()=>{
        loadScriptOnce('unamanoWorkflowFixes','./workflow-fixes.js?v=20260928-3');
      });
    });
  });
}
if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',boot,{once:true});
loadScriptOnce('unamanoGlobalBridge','./global-bridge.js?v=20260928-1');
loadScriptOnce('unamanoLegalV28','./legal-v20260928.js?v=20260928-1');
loadScriptOnce('unamanoSoftTheme','./soft-theme.js?v=20260928-2');
loadScriptOnce('unamanoSeoMeta','./seo-meta.js?v=20260928-3');
loadScriptOnce('unamanoOnboarding','./onboarding.js?v=20260928-1');
loadScriptOnce('unamanoCustomCategories','./custom-categories.js?v=20260928-2');
loadScriptOnce('unamanoNotificationChannels','./notification-channels.js?v=20260928-2');
loadScriptOnce('unamanoApplicationPushUi','./application-push-ui.js?v=20261001-1');
loadScriptOnce('unamanoApplicationStatusNotify','./application-status-notify.js?v=20261001-1');
loadScriptOnce('unamanoCityDeepLink','./city-deeplink.js?v=20261001-1');
loadScriptOnce('unamanoSiteAssistant','./site-assistant.js?v=20260928-3');
loadScriptOnce('unamanoChatBootstrap','./chat-bootstrap.js?v=20260928-2');
loadScriptOnce('unamanoChatAccessGuard','./chat-access-guard.js?v=20260928-1');
loadScriptOnce('unamanoAccountDelete','./account-delete.js?v=20260928-2');
loadScriptOnce('unamanoModerationAdmin','./moderation-admin.js?v=20260928-1');
loadScriptOnce('unamanoAntiAbuseUi','./anti-abuse-ui.js?v=20260928-1');
loadScriptOnce('unamanoGrowthShare','./growth-share.js?v=20261001-1');
const existingPrivacy=document.getElementById('unamanoPrivacyEnhancements')||document.getElementById('unamanoProfilePrivacyEnhancements');
if(existingPrivacy)loadMarketplaceExtras();
else loadScriptOnce('unamanoPrivacyEnhancements','./profile-privacy-enhancements.js?v=20260928-5',loadMarketplaceExtras);
})();