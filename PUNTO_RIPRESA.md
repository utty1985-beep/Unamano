# Punto di ripresa — UnaMano

Data: 28/09/2026

## Stato generale
- Repository: `utty1985-beep/Unamano`, branch `main`, pubblico.
- Sito: `https://utty1985-beep.github.io/Unamano/`.
- Backend: Supabase progetto `UnaMano` (`cfnivvdtyhpgbwmbgoke`).
- Il progetto resta gratuito nella fase iniziale e non gestisce pagamenti in-app.
- Beta/promozione/inviti: **NON ancora avviati per decisione dell'utente**. Si parte solo dopo il test finale reale.

## Funzioni applicative già presenti
- Registrazione/accesso email e password, conferma email e recupero password.
- Profilo pubblico con città, bio, competenze, disponibilità e foto.
- Curriculum/esperienze private in `candidate_private` e bucket `curricula` privato.
- Pubblicazione/modifica/eliminazione annunci.
- Candidature ricevute/inviate, rifiuto, ritiro, scelta del candidato.
- Completamento attività e recensioni.
- Chat privata collegata all'incarico.
- Segnalazioni, pagina pubblica `segnala.html` e gestione delle segnalazioni.
- Preferenze lavori/città, notifiche push, avvisi email/WhatsApp predisposti.
- PWA/installazione, condivisione sito e singolo annuncio.
- Bacheca giornaliera nella città dell'utente e richieste dimostrative marcate `ESEMPIO` quando non ci sono annunci reali.

## Sicurezza CV e Storage
- `avatars` pubblico intenzionalmente, massimo 5 MB e solo immagini ammesse.
- `curricula` privato, massimo 10 MB, PDF/DOC/DOCX.
- CV leggibile dal proprietario e dal proprietario di un annuncio solo mentre valuta una candidatura `pending` su un annuncio `open`.
- Le vecchie colonne CV presenti nella tabella pubblica `profiles` sono vuote e vengono forzate a `NULL` da trigger database.

## Chat — regola definitiva
- La chat si attiva solo dopo l'accettazione della candidatura.
- Database: INSERT/SELECT/UPDATE dei messaggi consentiti solo tra proprietario dell'annuncio e persona assegnata, per incarichi `assigned` o `completed`.
- Frontend: `chat-access-guard.js` rimuove i pulsanti di messaggistica generica e blocca aperture senza incarico valido.
- `global-bridge.js` sincronizza sessione e client Supabase con i moduli caricati successivamente.

## Protezioni anti-abuso
Limiti server-side attivi tramite trigger Supabase:
- Annunci: massimo 10/ora e 30/24h per utente.
- Candidature: massimo 30/ora e 100/24h.
- Messaggi: massimo 15/minuto e 180/ora.
- Segnalazioni: massimo 10/ora.
- Recensioni: massimo 20/ora.
- `anti-abuse-ui.js` traduce gli errori tecnici in messaggi comprensibili.

## Moderazione
- Tabella server-only `user_suspensions` con RLS e nessuna policy client.
- Un account sospeso non può creare nuovi annunci, candidature, messaggi o recensioni.
- Edge Function `admin-moderation` attiva con JWT obbligatorio e accesso amministrativo all'account del gestore.
- `moderation-admin.js` aggiunge al profilo amministratore un pannello per vedere segnalazioni, chiudere annunci, sospendere/riattivare utenti e aggiornare gli stati.

## Cancellazione account
- Edge Function `delete-account` attiva con JWT obbligatorio.
- Dal profilo compare la sezione `Elimina account`.
- Richiede doppia conferma e digitazione di `ELIMINA`.
- Prima dell'eliminazione rimuove i file dell'utente nei bucket `avatars` e `curricula`.
- Elimina quindi l'utente Auth; le relazioni `ON DELETE CASCADE` rimuovono profilo e dati applicativi collegati.
- `beta_feedback.user_id` diventa `NULL` per la relazione `ON DELETE SET NULL`.
- Non è stato eseguito un test distruttivo su uno dei due account reali di prova per evitare perdita di dati.

## Privacy e Termini
- Privacy aggiornata al 28/09/2026 con cancellazione account, moderazione e prevenzione abusi.
- Termini aggiornati al 28/09/2026 con chat post-accettazione, anti-abuso, sospensioni e cancellazione account.
- `legal-v20260928.js` obbliga gli utenti già registrati ad accettare la versione `2026-09-28` prima di continuare.
- Le accettazioni sono registrate in `legal_acceptances`.

## Edge Functions attive
- `send-job-push` — ACTIVE, JWT richiesto.
- `send-application-notify` — ACTIVE, JWT richiesto.
- `delete-account` — ACTIVE, JWT richiesto.
- `admin-moderation` — ACTIVE, JWT richiesto.

## Notifiche
- Push Web con VAPID configurato.
- `send-job-push` gestisce push e, se configurati i segreti server, email Resend e WhatsApp.
- `send-application-notify` gestisce avvisi per nuove candidature via email/WhatsApp quando attivati.
- Le tabelle di dispatch risultano ancora a zero: non è stato ancora eseguito un invio reale end-to-end dopo questo hardening.

## PWA
- Service Worker corrente: cache `unamano-v30-20260928`.
- Inclusi nella cache anche i nuovi moduli: global bridge, consenso legale corrente, protezione chat, cancellazione account, moderazione, anti-abuso, onboarding e nuove pagine pubbliche.
- Manifest allineato al tema verde UnaMano.

## Audit Supabase finale
### Sicurezza
Restano solo:
- INFO `RLS Enabled No Policy` su tabelle volutamente server-only/chiuse al client: `application_notification_dispatches`, `job_notification_dispatches`, `push_server_config`, `user_suspensions`.
- WARN `Leaked Password Protection Disabled`: la protezione password compromesse di Supabase è disponibile sui piani Pro e superiori, quindi non è attivabile nel piano gratuito attuale.
- I precedenti warning sulle funzioni `SECURITY DEFINER` esposte come RPC sono stati risolti spostando l'helper sospensioni nello schema non esposto `private` e revocando l'esecuzione diretta dei trigger helper.

### Prestazioni
- Rimosso l'indice duplicato sui messaggi.
- Aggiunto indice su `user_suspensions.created_by`.
- Restano alcuni `unused index` perché il database ha pochissimi dati: non vengono rimossi prematuramente.
- Restano 3 warning `multiple permissive policies` intenzionali per separare azioni con regole diverse.

## Backup e ripristino
Nel repository sono salvati:
- `supabase_security_20260928.sql` — baseline riproducibile di sicurezza.
- `supabase_security_private_helpers_20260928.sql` — hardening degli helper non esposti.
- `RECOVERY_BACKUP.md` — procedura di ripristino.
- sorgente delle Edge Function nuove in `supabase/functions/delete-account/` e `supabase/functions/admin-moderation/`.
- Il repository è backup del codice/configurazione, **non dei dati personali**.
- Non è stato creato un dump completo di database/Auth/Storage perché deve essere conservato privatamente e il connettore disponibile non espone un'operazione di backup completo sicuro.

## SEO e indicizzazione
- Google Search Console verificata, sitemap inviata e richiesta indicizzazione home accettata.
- Bing Webmaster Tools collegato e home inviata.
- `robots.txt`, sitemap e IndexNow attivi.
- Canonical, Open Graph, Twitter Card e dati strutturati presenti tramite `seo-meta.js`.
- Aggiunta anteprima social `social-card.svg` 1200×630.
- Pagine pubbliche indicizzabili: `come-funziona.html`, `faq.html`, `sicurezza.html`, `contatti.html`, Privacy, Termini e Segnala.
- `faq.html` include dati strutturati FAQPage.
- Pagina `404.html` resa coerente con UnaMano e con collegamenti utili.

## Onboarding e presentazione pubblica
- Aggiunto `onboarding.js`.
- Al primo accesso compare una guida breve in 3 passaggi: esplora, candidati/pubblica, chat/recensioni.
- L'onboarding viene mostrato una sola volta per dispositivo/browser tramite memoria locale.
- Nel footer sono presenti `Come funziona`, `FAQ`, `Sicurezza` e `Contatti`.
- Le nuove risorse sono incluse nella cache PWA.

## Preparazione lancio completata — 28/09/2026
- Creato `BRAND_GUIDE.md` con posizionamento, payoff, tono di voce e identità visiva.
- Nome operativo mantenuto: **UnaMano**; payoff: **Chiedi una mano. Dai una mano.**
- Dal controllo pubblico risultano nomi/progetti simili; prima di dominio o marchio serve verifica formale. Nessun acquisto è stato effettuato.
- Aggiornato `DOMINIO_FUTURO.md` con strategia e candidati da verificare in futuro, senza dichiararne la disponibilità.
- Creato `PLAY_STORE_COPY.md` con nome, breve descrizione, descrizione lunga e lista degli screenshot futuri.
- Creato `SOCIAL_LAUNCH_KIT.md` con bio, post, messaggio WhatsApp, testo beta e scaletta Reel/Short.
- Creato `SOCIAL_ACCOUNT_SETUP.md` con username candidati e ordine futuro di apertura dei profili social.
- Creato `PIANO_CRESCITA_ZERO_BUDGET.md` con lancio locale, metriche e strategia di espansione.
- Aggiornata `CHECKLIST_PUBBLICAZIONE.md` con stato reale completato/da testare.
- Nessuna campagna, invito, account social o pubblicazione social è stata avviata.

## Beta predisposta ma sospesa
- `feedback.html` e tabella `beta_feedback` pronti.
- Contatori beta predisposti.
- Kit beta Foggia e contatti pubblici già preparati.
- Gmail collegato per eventuali inviti futuri.
- Nessun invito deve essere inviato finché non viene completato il test reale finale.

## Stato dati di prova prima del test finale
- 2 account.
- 2 annunci.
- 2 candidature.
- 1 candidatura accettata.
- 1 attività completata.
- 1 recensione.
- 0 feedback beta.

## Cose che richiedono ancora un test/manualità
1. Test fisico completo con due telefoni/account: registrazione, conferma email, login, città/preferenze, annuncio, candidatura, accettazione/rifiuto/ritiro, chat, completamento, recensione.
2. Test push con app chiusa e permessi reali del sistema operativo/browser.
3. Test effettivo di recapito email di recupero password e notifiche email.
4. Test del pannello moderazione accedendo con l'account amministratore.
5. Test non distruttivo della schermata cancellazione; il test distruttivo dell'Edge Function richiede un account sacrificabile.
6. Backup completo privato di database/Auth/Storage.
7. `Leaked Password Protection` non disponibile nel piano Supabase gratuito.
8. Verifica formale del nome/marchio e disponibilità dominio prima di qualsiasi acquisto.
9. Pubblicazione Play Store solo dopo collaudo e preparazione pacchetto Android finale.

## Prossimo step
Il test reale su due telefoni è stato rimandato per decisione dell'utente. Tutta la preparazione non distruttiva utile prima del collaudo è ora sostanzialmente completata. Non inviare beta/promozione prima del collaudo finale. Dopo il test: beta locale controllata, raccolta feedback, correzioni e solo successivamente lancio pubblico più ampio.
