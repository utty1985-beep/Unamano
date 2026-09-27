# Checklist pubblicazione UnaMano

## Stato tecnico attuale
- [x] Progetto Supabase dedicato `UnaMano` creato e attivo.
- [x] Frontend collegato con URL e publishable key; nessuna `service_role` nel client.
- [x] RLS attiva sulle tabelle applicative.
- [x] Funzioni RPC irrobustite con `SECURITY INVOKER` e accesso agli utenti autenticati.
- [x] Advisor di sicurezza Supabase senza segnalazioni.
- [x] Aggiunto il pulsante `Rifiuta` per le candidature in attesa.
- [x] Salvati `supabase_rpc.sql` e `supabase_rls_hardening.sql` per mantenere allineata la configurazione.

## Prima di aprire al pubblico
1. Completare Privacy e Termini con identità/contatti reali del gestore, finalità e basi giuridiche, categorie di dati, fornitori, conservazione, diritti, reclami e procedure di moderazione.
2. Testare con due account reali: registrazione, conferma email, login, reset password, profilo, annuncio, candidatura, rifiuto candidatura, scelta candidato, conclusione, recensione e segnalazione.
3. Rendere pubblico il repository GitHub se si vuole usare GitHub Pages con GitHub Free.
4. In GitHub: `Settings > Pages > Deploy from a branch > main > /(root) > Save`.
5. In Supabase Auth impostare Site URL e Redirect URLs sull'indirizzo GitHub Pages effettivamente pubblicato.
6. Verificare da telefono il flusso completo e l'installazione PWA.

## Dominio a pagamento — fase successiva
1. Scegliere il nome definitivo dopo verifica di disponibilità e marchio.
2. Acquistare il dominio.
3. Verificarlo su GitHub.
4. Collegare DNS e GitHub Pages, poi attivare HTTPS.
5. Aggiornare Site URL/Redirect URLs Supabase e i link pubblici.
6. Aggiornare Privacy/Termini con il dominio definitivo.
