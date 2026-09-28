# UnaMano — backup e ripristino

Aggiornato: 28/09/2026

## Cosa è già salvato nel repository
- Frontend completo GitHub Pages.
- PWA, Service Worker e manifest.
- Script SQL `supabase_security_20260928.sql` con le protezioni principali riproducibili: privacy CV, chat vincolata all'incarico, limiti anti-abuso e sospensioni.
- File di configurazione client con sola publishable key (nessuna chiave segreta).

## Edge Functions attive in Supabase
- `send-job-push`
- `send-application-notify`
- `delete-account`
- `admin-moderation`

Le chiavi segrete e le credenziali server non devono mai essere copiate nel repository pubblico.

## Backup dei dati
Un backup reale dei dati deve includere database, utenti Auth e Storage privato. Non va salvato nel repository pubblico perché contiene dati personali. Prima del lancio pubblico è consigliato creare/esportare un backup dal progetto Supabase e conservarlo in uno spazio privato e cifrato.

## Ripristino minimo
1. Ripubblicare il repository su GitHub Pages.
2. Creare/ripristinare il progetto Supabase.
3. Ripristinare database e Storage da un backup privato.
4. Applicare `supabase_security_20260928.sql` se le migrazioni di sicurezza non sono già presenti.
5. Ridistribuire le Edge Functions.
6. Ripristinare le variabili/segreti server direttamente in Supabase, mai nel repository.
7. Verificare Site URL e Redirect URL Auth.
8. Testare registrazione, reset password, annunci, candidature, chat, notifiche, recensioni, moderazione e cancellazione account.

## Nota
Questo repository costituisce un backup della configurazione e del codice, non dei dati personali degli utenti. Il backup dati completo deve restare privato.
