(function(){
  const VERSION='2026-09-28';
  let busy=false,doneFor=null;
  const q=id=>document.getElementById(id);
  const getSession=()=>{try{return typeof session!=='undefined'?session:null}catch(e){return window.session||null}};

  function removeGate(){q('legalVersionGate')?.remove();}
  function gate(uid){
    if(q('legalVersionGate'))return;
    const d=document.createElement('div');d.id='legalVersionGate';d.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(10,26,22,.62);display:grid;place-items:center;padding:16px';
    d.innerHTML=`<div style="width:min(560px,100%);background:#fff;border-radius:20px;padding:22px;box-shadow:0 22px 70px rgba(0,0,0,.25)"><h2 style="margin-top:0">Termini aggiornati</h2><p>Per continuare a usare UnaMano devi accettare i Termini di utilizzo aggiornati e confermare di aver letto l’Informativa privacy.</p><label style="display:flex;gap:9px;align-items:flex-start;font-weight:700"><input id="legalV28Check" type="checkbox" style="width:auto;margin-top:4px"><span>Dichiaro di avere almeno 18 anni, <a href="termini.html" target="_blank" rel="noopener">accetto i Termini</a> e confermo di aver letto la <a href="privacy.html" target="_blank" rel="noopener">Privacy</a>.</span></label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button id="legalV28Accept" class="btn p" type="button">Accetta e continua</button><button id="legalV28Logout" class="btn g" type="button">Esci</button></div><div id="legalV28Msg" class="small" style="margin-top:9px"></div></div>`;
    document.body.appendChild(d);
    q('legalV28Accept').onclick=async()=>{
      if(!q('legalV28Check')?.checked){q('legalV28Msg').textContent='Devi accettare i Termini per continuare.';return;}
      const b=q('legalV28Accept');b.disabled=true;b.textContent='Salvataggio…';
      const r=await sb.from('legal_acceptances').insert({user_id:uid,terms_version:VERSION});
      if(r.error&&r.error.code!=='23505'){b.disabled=false;b.textContent='Accetta e continua';q('legalV28Msg').textContent='Non è stato possibile salvare l’accettazione. Riprova.';return;}
      doneFor=uid;removeGate();
    };
    q('legalV28Logout').onclick=async()=>{try{await sb.auth.signOut()}catch(e){};removeGate();location.reload();};
  }

  async function check(){
    const s=getSession();
    const uid=s?.user?.id;
    if(!uid){doneFor=null;removeGate();return;}
    if(doneFor===uid||busy||typeof sb==='undefined'||!sb)return;
    busy=true;
    try{
      const r=await sb.from('legal_acceptances').select('id').eq('user_id',uid).eq('terms_version',VERSION).maybeSingle();
      if(!r.error&&r.data){doneFor=uid;removeGate();return;}
      gate(uid);
    }catch(e){}finally{busy=false;}
  }
  if(document.readyState==='complete')setTimeout(check,300);else window.addEventListener('load',()=>setTimeout(check,300),{once:true});
  setInterval(check,1200);
})();
