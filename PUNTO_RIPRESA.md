# Punto di ripresa — UnaMano

Data: 28/09/2026

## Stato attuale verificato
- Progetto GitHub: `utty1985-beep/Unamano`
- Branch principale: `main`
- Repository pubblico.
- GitHub Pages attivo.
- Sito pubblico: `https://utty1985-beep.github.io/Unamano/`
- Supabase dedicato `UnaMano` attivo e collegato tramite `config.js` con publishable key.
- Pagine Privacy, Termini e Segnalazioni pubblicate.
- Registrazione: 18+, accettazione Termini e lettura Privacy; registrazione dell'accettazione nel database.
- Funzioni presenti: registrazione/accesso, recupero password, profilo, pubblicazione annunci, candidature ricevute/inviate, accetta/rifiuta/ritira candidatura, completamento attività, recensioni, segnalazioni, condivisione sito/annunci, PWA/installazione.

## Bacheca e preferenze lavoro
- Categoria `Babysitter` aggiunta alle categorie disponibili.
- Tabella Supabase `worker_preferences` con RLS per salvare categorie di interesse e attivazione notifiche per ogni utente.
- Nel profilo compare la sezione `Lavori che mi interessano`, dove l'utente può scegliere una o più categorie e attivare le notifiche.
- La città viene presa dal profilo utente e resta modificabile.
- In home è presente la `Bacheca di oggi nella tua città`, che mostra le richieste aperte pubblicate oggi nella città dell'utente.
- La bacheca è filtrabile per categoria.
- Realtime sulla tabella `jobs` mantiene aggiornata la bacheca quando il sito è aperto.

## Modalità città vuota / richieste demo
- Se una città non ha ancora richieste reali aperte, la bacheca non appare vuota.
- Compare un messaggio `UnaMano sta partendo` con invito a pubblicare la prima richiesta reale.
- Vengono mostrati alcuni annunci dimostrativi chiaramente marcati `ESEMPIO` e `Richiesta dimostrativa`.
- Le richieste demo non accettano candidature e non vengono inserite nel database come annunci reali.
- Appena esistono richieste reali nella città, la bacheca mostra quelle reali al posto delle demo.
- Esempi inclusi: Babysitter, Aiuto doposcuola per compiti, Giardinaggio, Spesa/commissioni e Piccoli lavori.
- `Doposcuola` è mostrato come esempio nella categoria `Ripetizioni`.

## Notifiche push complete
- Configurato Web Push con chiavi VAPID dedicate a UnaMano.
- Aggiunta tabella `push_subscriptions` con RLS: ogni utente gestisce solo le proprie sottoscrizioni del browser/telefono.
- La chiave privata VAPID è conservata solo lato Supabase nella tabella protetta `push_server_config`; non è esposta nel sito o nel repository.
- Deployata Edge Function Supabase `send-job-push`.
- Quando un utente pubblica una nuova richiesta, il sito invoca la funzione server-side.
- La funzione cerca soltanto utenti con notifiche attive, stessa città della richiesta e categoria compatibile.
- Le notifiche push possono arrivare anche con sito/PWA chiuso, se il sistema operativo/browser consente le notifiche per UnaMano.
- Il Service Worker `sw.js` gestisce evento `push`, visualizzazione notifica, vibrazione e apertura diretta dell'annuncio.
- Sul profilo viene indicato se le notifiche push risultano realmente attive sul dispositivo.
- Al logout la sottoscrizione push del dispositivo viene rimossa.
- Se una sottoscrizione push scade o viene revocata, la Edge Function elimina automaticamente gli endpoint non più validi su risposta 404/410.

## Indicizzazione e motori di ricerca — completato 28/09/2026
- Google Search Console verificata tramite file HTML.
- `sitemap.xml` inviata a Google.
- Home inviata manualmente a Google con richiesta di indicizzazione accettata.
- Bing Webmaster Tools collegato importando la proprietà da Google Search Console.
- Home inviata manualmente anche a Bing.
- `robots.txt` attivo e collegato alla sitemap.
- IndexNow configurato con chiave pubblica e workflow GitHub Actions.
- Il workflow IndexNow notifica automaticamente gli aggiornamenti del sito ai motori compatibili.
- Sitemap comprende home, Privacy, Termini e Segnalazioni.

## Beta controllata — predisposta ma NON ancora avviata
- Creata pagina `feedback.html` per raccogliere feedback dei tester.
- Creata tabella Supabase `beta_feedback` con RLS e senza lettura pubblica.
- Privacy aggiornata per documentare la raccolta feedback beta.
- Creati contatori beta nel database per account, annunci, candidature, attività concluse, recensioni e feedback.
- Preparato il kit di invito beta per Foggia e individuati alcuni contatti pubblici di associazioni/community.
- Gmail collegato a ChatGPT per eventuali inviti futuri.
- DECISIONE: **non inviare ancora inviti e non avviare la promozione**. Prima si ultima il sito e si esegue il controllo finale completo.

## Stato beta attuale prima del lancio
- 2 account presenti.
- 2 annunci presenti.
- 2 candidature presenti.
- 1 candidatura accettata.
- 1 attività completata.
- 1 recensione.
- 0 feedback beta.

## Audit sicurezza e stabilità — 28/09/2026
- Nessuna `service_role` o chiave segreta trovata nel repository pubblico.
- Bucket `avatars` pubblico intenzionalmente; bucket `curricula` privato.
- Policy Storage CV verificate: proprietario sempre autorizzato; proprietario dell'annuncio autorizzato solo mentre valuta una candidatura `pending` su annuncio `open`.
- Le vecchie colonne CV presenti in `profiles` risultano vuote; aggiunta protezione database che le mantiene sempre `NULL`, per evitare future esposizioni accidentali.
- Il CV effettivo resta in `candidate_private`.
- Chat irrigidita: messaggi consentiti solo tra proprietario dell'annuncio e candidato accettato, per incarichi `assigned` o `completed`.
- Aggiunto `chat-access-guard.js` per rimuovere i pulsanti di messaggistica generica e bloccare tentativi di apertura chat senza incarico accettato.
- Service Worker aggiornato alla cache `unamano-v23-20260928` e include la protezione chat.
- Colori PWA/manifest allineati alla grafica verde di UnaMano.
- Advisor Supabase: le segnalazioni RLS senza policy riguardano tabelle volutamente chiuse al client (`application_notification_dispatches`, `job_notification_dispatches`, `push_server_config`).
- Unico warning di sicurezza residuo: `Leaked Password Protection Disabled`; la funzione Supabase per bloccare password già compromesse è disponibile sui piani Pro e superiori, quindi non è un blocco risolvibile sul piano gratuito.

## Video promozionale
- Base video verde UnaMano mantenuta.
- Audio MP3 dell'utente mantenuto.
- Recuperata la schermata che mostra più attività oltre Babysitter.
- Creato il file finale `UnaMano_SPOT_FINALE_COMPLETO_CATEGORIE.mp4` e salvato nella Libreria ChatGPT.

## Test reale consigliato con due telefoni/account
1. Registrazione con email.
2. Conferma email.
3. Accesso.
4. Impostazione città e categorie di interesse.
5. Attivazione notifiche e accettazione del permesso del telefono/browser.
6. Verifica nel profilo della scritta `Notifiche push attive anche con UnaMano chiusa.`
7. Chiudere completamente UnaMano sul telefono B.
8. Pubblicare da account A una richiesta nella stessa città e in una categoria selezionata dall'account B.
9. Verificare notifica push/vibrazione sul telefono B e apertura dell'annuncio al tocco.
10. Verifica comparsa nella bacheca giornaliera.
11. Candidatura, accettazione/rifiuto/ritiro, completamento e recensione.
12. Verificare che la chat sia disponibile solo dopo l'accettazione.
13. Reset password.
14. Foto profilo.
15. Segnalazione contenuto.
16. Installazione PWA su entrambi i telefoni.

## Regola di prodotto
UnaMano parte gratuito. Non gestisce pagamenti in-app. Eventuali accordi economici avvengono direttamente tra gli utenti e restano soggetti alla normativa applicabile.

## Prossimo step
- Aspettare il completamento dell'ultimo deploy GitHub Pages.
- Eseguire il test reale completo con due account/telefoni seguendo la checklist sopra.
- Correggere eventuali anomalie emerse nel test.
- Solo dopo: beta controllata e inviti.
