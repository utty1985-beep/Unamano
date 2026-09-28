(function(){
const q=id=>document.getElementById(id);
const INPS_URL='https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-aree-tematiche.prestazioni-di-lavoro-occasionale-libretto-famiglia-51098.prestazioni-di-lavoro-occasionale-libretto-famiglia.html';

function safe(s){return typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}

function answer(text){
 const t=normalize(text);
 if(!t)return 'Scrivimi pure la tua domanda su UnaMano.';
 if(/(piu annunci|piu lavori|candidar.*piu|candidature contemporanee|candidarmi a.*annunci)/.test(t))return 'Sì. Puoi candidarti a più annunci contemporaneamente. Il limite vale solo sullo stesso annuncio: non puoi avere due candidature attive duplicate per la stessa richiesta.';
 if(/(ritir|annulla.*candid|cancella.*candid)/.test(t))return 'Puoi ritirare una candidatura finché è in attesa. Dopo il ritiro non compare più tra le tue candidature attive. Se l’annuncio è ancora aperto puoi candidarti di nuovo.';
 if(/(accett|scelt|sceglie|assegn)/.test(t))return 'La richiesta resta visibile in bacheca mentre le candidature sono in attesa. Scompare dalle richieste aperte quando chi ha pubblicato sceglie e accetta una persona.';
 if(/(inps|libretto famiglia|occasionale|saltuari|saltuario|regolar|contribut)/.test(t))return `Per piccoli lavori occasionali tra privati UnaMano rimanda alle informazioni ufficiali INPS sul Libretto Famiglia. Puoi aprire la pagina ufficiale qui: ${INPS_URL}`;
 if(/(pagament|compenso|soldi|prezzo|quanto pago|quanto guadagno)/.test(t))return 'UnaMano non gestisce pagamenti. Eventuali accordi economici avvengono direttamente tra gli utenti e devono rispettare la normativa applicabile.';
 if(/(chat|messagg)/.test(t))return 'Dalla sezione Chat puoi parlare privatamente con gli altri utenti. Dopo che una candidatura viene accettata, la chat dell’incarico serve per concordare i dettagli.';
 if(/(profilo|cv|curriculum|foto)/.test(t))return 'Nel Profilo puoi inserire foto, presentazione, competenze, disponibilità e curriculum. Chi valuta una candidatura può consultare il profilo prima di scegliere.';
 if(/(recension|stelle|valutaz)/.test(t))return 'Le recensioni diventano disponibili dopo che l’incarico assegnato viene segnato come completato. Entrambe le parti possono lasciare una valutazione collegata a quell’esperienza.';
 if(/(notific|avvis|citta|categoria)/.test(t))return 'Impostando città e categorie di interesse nel profilo puoi ricevere segnalazioni più pertinenti sulle nuove richieste della tua zona.';
 if(/(sicurezza|truff|indirizzo|iban|document|dati personali|telefono)/.test(t))return 'Per sicurezza non pubblicare indirizzo completo, documenti, IBAN, password o dati sensibili negli annunci. Condividi i dettagli privati solo quando necessario e usa la chat interna.';
 if(/(pubblic|annuncio|richiesta|chiedere aiuto)/.test(t))return 'Per chiedere aiuto premi “+ Pubblica”, inserisci titolo, categoria, città, quando e descrizione. La richiesta resta aperta finché non scegli una persona o la chiudi.';
 if(/(registr|account|acced|password|email)/.test(t))return 'Puoi registrarti con email e password. Se dimentichi la password usa “Password dimenticata”; è disponibile anche il reinvio dell’email di conferma.';
 if(/(cos.?e unamano|come funziona|aiuto|help)/.test(t))return 'UnaMano è una bacheca locale: una persona pubblica una richiesta, altre persone si candidano, chi ha chiesto aiuto sceglie una persona, poi si può usare la chat e al termine lasciare una recensione.';
 return 'Posso aiutarti soprattutto su come funziona UnaMano: annunci, candidature, profilo/CV, chat, recensioni, sicurezza, notifiche e informazioni INPS. Prova a chiedermi, per esempio: “Posso candidarmi a più annunci?”';
}

function addStyles(){
 if(q('umAssistantStyle'))return;
 const s=document.createElement('style');s.id='umAssistantStyle';s.textContent=`
 #umAssistantBtn{position:fixed;right:14px;bottom:96px;z-index:99;min-width:88px;height:54px;padding:0 16px;border:0;border-radius:999px;background:var(--g);color:#fff;font-size:17px;font-weight:900;box-shadow:0 12px 30px rgba(0,0,0,.24);display:flex;align-items:center;justify-content:center;gap:7px}
 #umAssistantPanel{position:fixed;right:12px;bottom:158px;z-index:100;width:min(390px,calc(100vw - 24px));max-height:min(610px,72vh);background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 18px 55px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden}
 #umAssistantPanel.hidden{display:none!important}.uma-head{padding:14px 15px;background:var(--g);color:#fff;display:flex;align-items:center;gap:10px}.uma-head b{flex:1}.uma-close{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:10px;width:34px;height:34px}.uma-chat{padding:13px;overflow:auto;display:flex;flex-direction:column;gap:9px;min-height:230px}.uma-msg{max-width:88%;padding:10px 12px;border-radius:14px;background:#f0f5f3;align-self:flex-start;font-size:14px;white-space:pre-wrap;word-break:break-word}.uma-msg.me{background:var(--g);color:#fff;align-self:flex-end}.uma-compose{border-top:1px solid var(--line);padding:10px;display:grid;grid-template-columns:1fr auto;gap:7px}.uma-compose input{margin:0}.uma-compose button{min-width:62px}.uma-note{font-size:11px;color:var(--muted);padding:0 12px 10px}
 @media(max-width:840px){#umAssistantBtn{bottom:84px;right:10px;min-width:82px;height:50px;padding:0 14px}#umAssistantPanel{right:8px;bottom:142px;width:calc(100vw - 16px)}}
 `;document.head.appendChild(s);
}
function linkify(txt){return safe(txt).replace(/(https:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">Apri link</a>');}
function addMsg(text,me=false){const box=q('umAssistantChat');if(!box)return;const d=document.createElement('div');d.className='uma-msg'+(me?' me':'');d.innerHTML=me?safe(text):linkify(text);box.appendChild(d);box.scrollTop=box.scrollHeight;}
function ask(){const i=q('umAssistantInput');if(!i)return;const text=i.value.trim();if(!text)return;i.value='';addMsg(text,true);setTimeout(()=>addMsg(answer(text)),180);}
function build(){
 if(q('umAssistantBtn'))return;addStyles();
 const b=document.createElement('button');b.id='umAssistantBtn';b.type='button';b.setAttribute('aria-label','Apri assistente UnaMano');b.innerHTML='<span>🤖</span><span>AI</span>';b.onclick=()=>q('umAssistantPanel')?.classList.toggle('hidden');document.body.appendChild(b);
 const p=document.createElement('div');p.id='umAssistantPanel';p.className='hidden';p.innerHTML=`<div class="uma-head"><span style="font-size:24px">🤖</span><b>Assistente UnaMano</b><button class="uma-close" type="button" aria-label="Chiudi">✕</button></div><div id="umAssistantChat" class="uma-chat"></div><div class="uma-compose"><input id="umAssistantInput" maxlength="500" placeholder="Chiedi qualcosa su UnaMano"><button id="umAssistantSend" class="btn p sm" type="button">Invia</button></div><div class="uma-note">Assistente automatico per l’uso del sito. Per questioni legali, fiscali o previdenziali verifica sempre le fonti ufficiali.</div>`;document.body.appendChild(p);
 p.querySelector('.uma-close').onclick=()=>p.classList.add('hidden');q('umAssistantSend').onclick=ask;q('umAssistantInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ask();}});
 addMsg('Ciao! Sono l’assistente di UnaMano. Posso spiegarti come usare il sito, le candidature, la chat, il profilo, le recensioni e dove trovare le informazioni INPS.');
}
if(document.readyState==='complete')build();else window.addEventListener('load',build,{once:true});
})();