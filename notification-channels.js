(function(){
  const q=id=>document.getElementById(id);
  let prefsLoaded=false, saveBound=false;

  function toastMsg(msg,type){
    try{if(typeof toast==='function')return toast(msg,type)}catch(e){}
    console.log(msg);
  }
  function normalizePhone(raw){
    let v=String(raw||'').trim().replace(/[\s().-]/g,'');
    if(v.startsWith('00'))v='+'+v.slice(2);
    if(/^39\d{9,10}$/.test(v))v='+'+v;
    if(/^3\d{9}$/.test(v))v='+39'+v;
    return v;
  }
  function validPhone(v){return /^\+[1-9][0-9]{7,14}$/.test(v)}

  function ensureUi(){
    const card=q('workerPrefsCard');
    if(!card)return false;
    const save=q('saveWorkerPrefs')||[...card.querySelectorAll('button')].find(b=>/salva/i.test(b.textContent||''));
    if(!save)return false;

    if(!q('umNotifyChannels')){
      const box=document.createElement('div');
      box.id='umNotifyChannels';
      box.className='notice info';
      box.style.marginTop='14px';
      box.innerHTML=`
        <b>📲 Canali di notifica</b>
        <div class="small" style="margin:5px 0 10px">Puoi scegliere come ricevere gli avvisi di UnaMano.</div>
        <label for="workerWhatsappPhone">Numero WhatsApp</label>
        <input id="workerWhatsappPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+393471234567" maxlength="20">
        <div class="small" style="margin-top:5px">Inserisci il numero completo di prefisso internazionale. Per i numeri italiani puoi scrivere anche 3471234567: verrà salvato come +39.</div>
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input id="workerWhatsappJobNotify" type="checkbox" style="width:auto;margin-top:3px"><span><b>WhatsApp · nuove richieste</b><br><span class="small">Avvisami quando viene pubblicata una richiesta nella mia città e in una categoria scelta.</span></span></label>
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px"><input id="ownerEmailAppNotify" type="checkbox" style="width:auto;margin-top:3px"><span><b>Email · nuove candidature</b><br><span class="small">Avvisami quando qualcuno si candida a un mio annuncio.</span></span></label>
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px"><input id="ownerWhatsappAppNotify" type="checkbox" style="width:auto;margin-top:3px"><span><b>WhatsApp · nuove candidature</b><br><span class="small">Avvisami su WhatsApp quando qualcuno si candida a un mio annuncio.</span></span></label>
        <div class="small" style="margin-top:10px"><b>Consenso:</b> attivando un avviso WhatsApp autorizzi UnaMano a usare il numero indicato esclusivamente per le notifiche selezionate. Puoi disattivarle in qualsiasi momento.</div>
        <div class="small" style="margin-top:8px">ℹ️ Il numero e le preferenze possono già essere salvati. L'invio automatico WhatsApp partirà quando il canale WhatsApp Business di UnaMano sarà collegato e approvato.</div>`;
      save.insertAdjacentElement('beforebegin',box);
    }

    if(!saveBound){
      saveBound=true;
      save.addEventListener('click',saveExtraPrefs);
    }
    if(!prefsLoaded)loadExtraPrefs();
    return true;
  }

  async function loadExtraPrefs(){
    if(!session?.user?.id||typeof sb==='undefined'||!sb||!q('umNotifyChannels'))return;
    const r=await sb.from('worker_preferences')
      .select('whatsapp_number_e164,whatsapp_job_notifications_enabled,email_application_notifications_enabled,whatsapp_application_notifications_enabled')
      .eq('user_id',session.user.id).maybeSingle();
    if(r.error)return;
    const p=r.data||{};
    if(q('workerWhatsappPhone'))q('workerWhatsappPhone').value=p.whatsapp_number_e164||'';
    if(q('workerWhatsappJobNotify'))q('workerWhatsappJobNotify').checked=!!p.whatsapp_job_notifications_enabled;
    if(q('ownerEmailAppNotify'))q('ownerEmailAppNotify').checked=!!p.email_application_notifications_enabled;
    if(q('ownerWhatsappAppNotify'))q('ownerWhatsappAppNotify').checked=!!p.whatsapp_application_notifications_enabled;
    prefsLoaded=true;
  }

  async function saveExtraPrefs(){
    if(!session?.user?.id||typeof sb==='undefined'||!sb)return;
    const phone=normalizePhone(q('workerWhatsappPhone')?.value||'');
    const waJobs=!!q('workerWhatsappJobNotify')?.checked;
    const emailApps=!!q('ownerEmailAppNotify')?.checked;
    const waApps=!!q('ownerWhatsappAppNotify')?.checked;
    if((waJobs||waApps)&&!validPhone(phone)){
      toastMsg('Per gli avvisi WhatsApp inserisci un numero valido, ad esempio +393471234567.','warn');
      return;
    }
    const row={
      user_id:session.user.id,
      whatsapp_number_e164:phone||null,
      whatsapp_job_notifications_enabled:waJobs,
      email_application_notifications_enabled:emailApps,
      whatsapp_application_notifications_enabled:waApps,
      whatsapp_opt_in_at:(waJobs||waApps)?new Date().toISOString():null,
      updated_at:new Date().toISOString()
    };
    const r=await sb.from('worker_preferences').upsert(row,{onConflict:'user_id'});
    if(r.error){toastMsg((typeof errText==='function'?errText(r.error):r.error.message)||'Errore salvataggio notifiche','err');return;}
    if(q('workerWhatsappPhone'))q('workerWhatsappPhone').value=phone;
    if(waJobs||waApps)toastMsg('Preferenze WhatsApp salvate. Gli avvisi partiranno quando il canale WhatsApp Business sarà attivato.');
    else if(emailApps)toastMsg('Avvisi email per nuove candidature attivati.');
  }

  async function notifyApplication(jobId){
    if(!session?.user?.id||typeof sb==='undefined'||!sb||!jobId)return;
    try{
      const r=await sb.from('applications').select('id,status').eq('job_id',jobId).eq('applicant_id',session.user.id).maybeSingle();
      if(r.error||!r.data||r.data.status!=='pending')return;
      await sb.functions.invoke('send-application-notify',{body:{application_id:r.data.id}});
    }catch(e){console.warn('application notification dispatch skipped',e)}
  }

  function patchApply(){
    const current=window.applyJob;
    if(typeof current!=='function'||current.__umNotifyChannelsWrapper)return;
    const wrapped=async function(id){
      const result=await current.apply(this,arguments);
      setTimeout(()=>notifyApplication(id),120);
      return result;
    };
    wrapped.__umNotifyChannelsWrapper=true;
    window.applyJob=wrapped;
  }

  function boot(){
    ensureUi();patchApply();
    let n=0;
    const t=setInterval(()=>{
      n++;ensureUi();patchApply();
      if(n>80)clearInterval(t);
    },300);
  }
  if(document.readyState==='complete')setTimeout(boot,150);else window.addEventListener('load',()=>setTimeout(boot,150),{once:true});
})();
