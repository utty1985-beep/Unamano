# Punto di ripresa — UnaMano

Data: 27/09/2026

## Stato attuale verificato
- Progetto GitHub: `utty1985-beep/Unamano`
- Branch principale: `main`
- Repository pubblico.
- GitHub Pages attivo e deploy riuscito.
- Sito pubblico: `https://utty1985-beep.github.io/Unamano/`
- Supabase dedicato `UnaMano` attivo e collegato tramite `config.js` con publishable key.
- Advisor sicurezza Supabase: nessun avviso di sicurezza dopo gli ultimi interventi.
- Pagine Privacy, Termini e Segnalazioni pubblicate.
- Titolare/gestore indicato nelle pagine legali: Mario Di Bari.
- Contatto pubblico: utty1985@gmail.com.
- Registrazione: 18+, accettazione Termini e lettura Privacy; registrazione dell'accettazione nel database.
- Funzioni presenti: registrazione/accesso, recupero password, profilo, pubblicazione annunci, candidature ricevute/inviate, accetta/rifiuta/ritira candidatura, completamento attività, recensioni, segnalazioni, condivisione sito/annunci, PWA/installazione.
- Test tecnici completati: deploy, file pubblicati, sintassi JavaScript, struttura database, RLS e flusso database simulato in transazione.
- Test database completato con esito positivo: profili -> annuncio -> candidatura -> accettazione -> completamento -> recensioni; dati di test annullati a fine transazione.
- Hardening aggiuntivo applicato per impedire inserimenti diretti di annunci/candidature in stati non consentiti.
- Dopo hardening, il ciclo database è stato rieseguito con esito positivo.
- Database lasciato pulito dopo i test.

## Test reale ancora da fare
Serve un test end-to-end dal telefono con almeno due account reali:
1. Registrazione con email.
2. Conferma email.
3. Accesso.
4. Recupero/reset password.
5. Pubblicazione annuncio da account A.
6. Candidatura da account B.
7. Accettazione/rifiuto e ritiro candidatura.
8. Completamento attività.
9. Recensione reciproca.
10. Condivisione diretta di sito e annuncio.

## Prossima fase
- Effettuare il test reale con due telefoni/account.
- Preparare lancio gratuito e promozione iniziale.
- Strategia promozione: condivisione WhatsApp, gruppi Facebook/locali, Instagram Reels, TikTok, YouTube Shorts, passaparola e micro-community locali.
- Preparare un video verticale breve riutilizzabile sulle principali piattaforme social, mostrando il problema, come funziona UnaMano, pubblicazione/candidatura e call to action finale.
- Dopo i primi utenti/test, valutare dominio personalizzato e monetizzazione futura senza compromettere la fase gratuita iniziale.

## Regola di prodotto
UnaMano parte gratuito. Non gestisce pagamenti in-app. Eventuali accordi economici avvengono direttamente tra gli utenti e restano soggetti alla normativa applicabile.
