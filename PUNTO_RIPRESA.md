# Punto di ripresa — UnaMano

Data: 27/09/2026

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
- La funzione cerca soltanto utenti con:
  1. notifiche attive;
  2. stessa città della richiesta;
  3. categoria compatibile con le preferenze scelte.
- Le notifiche push possono arrivare anche con sito/PWA chiuso, se il sistema operativo/browser consente le notifiche per UnaMano.
- Il Service Worker `sw.js` gestisce evento `push`, visualizzazione notifica, vibrazione e apertura diretta dell'annuncio toccando la notifica.
- Sul profilo viene indicato se le notifiche push risultano realmente attive sul dispositivo.
- Al logout la sottoscrizione push del dispositivo viene rimossa per evitare notifiche dell'account precedente sullo stesso telefono.
- Se una sottoscrizione push scade o viene revocata, la Edge Function elimina automaticamente gli endpoint non più validi quando riceve risposta 404/410 dal servizio push.

## Sicurezza notifiche
- RLS attivo su `push_subscriptions`.
- Rimossi i precedenti RPC `SECURITY DEFINER` per salvataggio/rimozione push e sostituiti con normali operazioni protette da RLS.
- Advisor sicurezza Supabase: nessun warning di sicurezza sulle nuove funzioni push; rimane solo un INFO intenzionale su `push_server_config` perché ha RLS attivo senza policy pubbliche, quindi nessun utente client può leggerlo.

## Video promozionale
- Base video verde UnaMano mantenuta.
- Audio MP3 dell'utente mantenuto.
- Recuperata la schermata che mostra più attività oltre Babysitter (Babysitter, Giardinaggio, Spesa, Pulizie, Piccoli aiuti).
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

## Regola di prodotto
UnaMano parte gratuito. Non gestisce pagamenti in-app. Eventuali accordi economici avvengono direttamente tra gli utenti e restano soggetti alla normativa applicabile.
