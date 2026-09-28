# UnaMano — lista fissa delle cose da completare

Aggiornata al 28/09/2026.

## Da fare con l'intervento del gestore

- [ ] **Test reale finale con due account/telefoni** — provare il flusso completo: pubblicazione → più candidature → ritiro → scelta candidato → chat → completamento → recensione, e verificare una notifica push a sito/PWA chiusa.
- [ ] **Protezione password compromesse Supabase** — il Security Advisor segnala `Leaked Password Protection Disabled`. Va attivata dalle impostazioni Auth del progetto Supabase; non e' esposta dagli strumenti automatici disponibili.
- [ ] **Google Search Console** — al momento nessuna proprieta e' collegata al GSC Wizard. Accedere a Google Search Console, aggiungere/verificare `https://utty1985-beep.github.io/Unamano/`; se Google fornisce un file/token di verifica, possiamo inserirlo nel repository. Poi inviare `sitemap.xml`.
- [ ] **Bing Webmaster Tools** — al momento non e' configurata alcuna chiave/account Bing nel GSC Wizard. Collegarlo dopo Google Search Console (eventualmente importando il sito da GSC) e inviare la sitemap/IndexNow.
- [ ] **Instagram / Facebook / TikTok in Metricool** — il brand Metricool esiste ma non ha ancora social collegati. Collegare almeno i profili social; dopo il collegamento possiamo programmare i post automaticamente.
- [ ] **Telegram UnaMano Italia** — creare il canale/account dall'app Telegram e fornire/collegare il canale per il flusso di pubblicazione.
- [ ] **Dati del gestore prima della promozione nazionale** — completare i riferimenti identificativi e un recapito diretto del gestore nelle pagine legali/supporto.
- [ ] **WhatsApp automatico** — predisposizione tecnica gia fatta; per attivarlo serve un numero WhatsApp Business/Cloud API e l'approvazione dei template `unamano_nuova_richiesta` e `unamano_nuova_candidatura`. Rimandabile per evitare costi iniziali.

## Future funzioni non bloccanti

- [ ] **Assistente AI generativo reale** — l'assistente attuale funziona con regole/risposte predisposte. Per un assistente generativo serve un endpoint server-side sicuro e una chiave/provider AI.
- [ ] **Ulteriori video/promozioni AI** — continuare con nuove varianti social quando serve; non blocca il lancio tecnico.

## Completato automaticamente

- [x] **Ritiro candidatura** — una candidatura ritirata viene nascosta dalle candidature attive sia lato candidato sia lato proprietario.
- [x] **Permanenza annuncio in bacheca** — verificata la logica database: il ritiro/non accettazione di una candidatura non chiude l'annuncio; la richiesta resta `open` finche' il proprietario non accetta una persona. Solo l'accettazione porta lo stato a `assigned`.
- [x] **Data e ora annunci** — aggiunta visualizzazione completa della data/ora di pubblicazione nelle card e nei dettagli dell'annuncio.
- [x] **Stabilita moduli JavaScript** — ordinato il caricamento dei correttivi per evitare che piu' wrapper di `renderActivity`/`applyJob` si sovrascrivano in modo non deterministico.
- [x] **Aggiornamento PWA** — incrementata la cache Service Worker a `unamano-v21-20260928` per forzare i telefoni a ricevere i nuovi file.
- [x] **Foto profilo** — verificato bucket `avatars`, limiti JPG/PNG/WEBP fino a 5 MB, salvataggio online e visualizzazione nel profilo.
- [x] **Curriculum/esperienza** — bucket privato `curricula`, caricamento PDF/DOC/DOCX e accesso controllato.
- [x] **Profilo completo** — citta, presentazione, competenze, disponibilita, recensioni, annunci e chat gia integrati.
- [x] **Categorie** — galleria con simboli e filtri, Babysitter, Lavori stagionali/campagna e creazione di categorie personalizzate.
- [x] **Notifiche** — preferenze per citta/categorie, Web Push, Realtime, Edge Function e rimozione della sottoscrizione al logout gia predisposti.
- [x] **SEO di base** — sitemap, meta, canonical, robots/meta robots e predisposizione IndexNow.
- [x] **Pagine legali di base** — Termini, Privacy, Segnalazioni e consenso 18+ presenti; resta da inserire il dato reale del gestore prima della promozione nazionale.
- [x] **Database performance** — aggiunto indice `messages_job_id_idx`; ottimizzate le policy RLS che rivalutavano `auth.uid()` per riga. Restano solo warning di performance non bloccanti relativi a policy separate per flussi diversi e indici ancora inutilizzati perche' il progetto e' giovane.
- [x] **Sicurezza server-only** — le tabelle di dispatch/configurazione push restano con RLS e senza policy client, intenzionalmente non leggibili dagli utenti.
- [x] Tema grafico blu polvere e riquadri piu grandi/evidenti.
- [x] Funzione server per notificare una nuova candidatura via email/WhatsApp quando i canali saranno configurati.
- [x] Secondo spot social verticale completato e materiale media archiviato nella Libreria del progetto.

Questa lista va aggiornata man mano che ogni punto viene chiuso.