# Punto di ripresa — UnaMano

Data: 27/09/2026

## Stato attuale verificato
- Progetto GitHub: `utty1985-beep/Unamano`
- Branch principale: `main`
- Repository pubblico.
- GitHub Pages attivo.
- Sito pubblico: `https://utty1985-beep.github.io/Unamano/`
- Supabase dedicato `UnaMano` attivo e collegato tramite `config.js` con publishable key.
- Advisor sicurezza Supabase: nessun avviso di sicurezza dopo gli ultimi interventi.
- Pagine Privacy, Termini e Segnalazioni pubblicate.
- Registrazione: 18+, accettazione Termini e lettura Privacy; registrazione dell'accettazione nel database.
- Funzioni presenti: registrazione/accesso, recupero password, profilo, pubblicazione annunci, candidature ricevute/inviate, accetta/rifiuta/ritira candidatura, completamento attività, recensioni, segnalazioni, condivisione sito/annunci, PWA/installazione.

## Nuove funzioni 27/09/2026 sera
- Aggiunta categoria `Babysitter` alle categorie disponibili.
- Aggiunta tabella Supabase `worker_preferences` con RLS per salvare categorie di interesse e attivazione notifiche per ogni utente.
- Aggiunto Realtime sulla tabella `jobs` per intercettare nuove richieste.
- Aggiunto file `worker-features.js` nel repository.
- Nel profilo compare la sezione `Lavori che mi interessano`, dove l'utente può scegliere una o più categorie e attivare le notifiche.
- La città viene presa dal profilo utente e resta modificabile.
- Aggiunta in home la `Bacheca di oggi nella tua città`, che mostra le richieste aperte pubblicate oggi nella città dell'utente.
- La bacheca resta filtrabile per categoria.
- Quando la PWA/sito è attivo e arriva una nuova richiesta della stessa città e di una categoria selezionata, viene mostrata una notifica e, se supportato dal dispositivo, una vibrazione.
- Aggiornato `sw.js` con nuova cache e apertura dell'annuncio al tocco sulla notifica.
- Nota tecnica: per notifiche push garantite anche quando il browser/PWA è completamente chiuso serve ancora configurare Web Push lato server con chiavi push/VAPID; la versione attuale usa Realtime lato client.

## Video promozionale
- Base video verde UnaMano mantenuta.
- Audio MP3 dell'utente mantenuto.
- Recuperata la schermata che mostra più attività oltre Babysitter (Babysitter, Giardinaggio, Spesa, Pulizie, Piccoli aiuti).
- Creato il file finale `UnaMano_SPOT_FINALE_COMPLETO_CATEGORIE.mp4` e salvato nella Libreria ChatGPT.

## Test reale ancora da fare
Serve un test end-to-end dal telefono con almeno due account reali:
1. Registrazione con email.
2. Conferma email.
3. Accesso.
4. Recupero/reset password.
5. Impostazione città e categorie di interesse.
6. Attivazione del permesso notifiche.
7. Pubblicazione annuncio da account A nella stessa città/categoria scelta da account B.
8. Verifica comparsa nella bacheca giornaliera e notifica/vibrazione con PWA aperta o attiva.
9. Candidatura da account B.
10. Accettazione/rifiuto e ritiro candidatura.
11. Completamento attività.
12. Recensione reciproca.
13. Condivisione diretta di sito e annuncio.

## Regola di prodotto
UnaMano parte gratuito. Non gestisce pagamenti in-app. Eventuali accordi economici avvengono direttamente tra gli utenti e restano soggetti alla normativa applicabile.
