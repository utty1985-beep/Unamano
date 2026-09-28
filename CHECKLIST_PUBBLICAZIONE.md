# Checklist pubblicazione UnaMano

Data aggiornamento: 28/09/2026

## Completato
- [x] Progetto Supabase dedicato `UnaMano` attivo.
- [x] Frontend collegato con publishable key; nessuna `service_role` nel client pubblico.
- [x] RLS e policy applicative configurate.
- [x] CV in area privata e Storage protetto.
- [x] Chat consentita solo dopo accettazione della candidatura.
- [x] Protezioni anti-abuso server-side.
- [x] Segnalazioni e moderazione amministratore.
- [x] Cancellazione account direttamente dal profilo.
- [x] Privacy e Termini aggiornati al 28/09/2026.
- [x] Accettazione nuova versione Privacy/Termini gestita nell'app.
- [x] PWA e notifiche push predisposte.
- [x] Google Search Console verificata.
- [x] Sitemap inviata a Google.
- [x] Bing Webmaster Tools collegato.
- [x] IndexNow configurato.
- [x] Pagina Come funziona.
- [x] Pagina Contatti e assistenza.
- [x] Pagina Segnala.
- [x] Onboarding primo accesso.
- [x] SEO, canonical, Open Graph e dati strutturati predisposti.
- [x] Kit social pronto.
- [x] Testi futuri Play Store pronti.
- [x] Piano crescita a costo zero pronto.
- [x] Strategia dominio futuro documentata.
- [x] Backup del codice e della configurazione di sicurezza nel repository.

## Da completare prima della beta
- [ ] Test completo con due telefoni/account reali.
- [ ] Test notifica push con app chiusa.
- [ ] Test reale recupero password via email.
- [ ] Test recapito notifiche email dopo hardening.
- [ ] Test pannello moderazione dal profilo amministratore.
- [ ] Test non distruttivo schermata cancellazione account.
- [ ] Test distruttivo cancellazione con un account sacrificabile.
- [ ] Verifica del sito su almeno Android Chrome e un secondo browser/dispositivo.
- [ ] Correzione di eventuali anomalie emerse.

## Beta
- [ ] Aprire beta locale controllata.
- [ ] 30–50 tester iniziali.
- [ ] Raccogliere feedback tramite `feedback.html`.
- [ ] Monitorare account, annunci, candidature, assegnazioni, completamenti e recensioni.
- [ ] Verificare che gli utenti comprendano il flusso senza assistenza continua.
- [ ] Correggere problemi emersi durante la beta.

## Prima del lancio pubblico più ampio
- [ ] Verifica formale del nome `UnaMano` e di eventuali diritti anteriori.
- [ ] Verifica disponibilità dominio.
- [ ] Valutare acquisto dominio solo dopo beta positiva.
- [ ] Preparare icone/screenshot finali per eventuale Play Store.
- [ ] Valutare backup completo privato di database/Auth/Storage.
- [ ] Decidere se restare PWA o creare/pacchettizzare la versione Android da pubblicare.

## Note tecniche note
- `Leaked Password Protection` di Supabase non è disponibile nel piano gratuito attuale.
- Alcuni warning prestazionali su indici non utilizzati sono normali con pochi dati e non richiedono intervento immediato.
- Gli inviti e la promozione restano sospesi fino al superamento del test finale.
