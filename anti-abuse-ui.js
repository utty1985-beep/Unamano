(function(){
  function friendly(raw){
    const s=String(raw?.message||raw||'Errore imprevisto');
    if(s.includes('rate_limit_jobs'))return 'Hai pubblicato molte richieste in poco tempo. Riprova più tardi.';
    if(s.includes('rate_limit_applications'))return 'Hai inviato molte candidature in poco tempo. Riprova più tardi.';
    if(s.includes('rate_limit_messages'))return 'Stai inviando messaggi troppo velocemente. Attendi qualche minuto e riprova.';
    if(s.includes('rate_limit_reports'))return 'Hai inviato molte segnalazioni in poco tempo. Riprova più tardi.';
    if(s.includes('rate_limit_reviews'))return 'Hai inviato molte recensioni in poco tempo. Riprova più tardi.';
    if(s.includes('row-level security')||s.includes('violates row-level security'))return 'Operazione non consentita per questo account o in questo momento.';
    return s;
  }
  let tries=0;
  const t=setInterval(()=>{
    tries++;
    if(typeof window.errText==='function'){
      window.__umOriginalErrText=window.__umOriginalErrText||window.errText;
      window.errText=friendly;
      clearInterval(t);
    }
    if(tries>40)clearInterval(t);
  },250);
})();
