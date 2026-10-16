# Verifica dello storico — Passione Funghi e Caccia

Verifica del 16 ottobre 2026. Progetto effettivo: `utty1985-beep/Unamano/cacciatraccia`, ingresso `index.html`. I test seguono i moduli dichiarati da questo ingresso, non le vecchie pagine numerate. Le precedenti affermazioni di completamento non sono considerate prove.

## Esclusioni confermate del 15 ottobre

- Walkie-talkie, voce e microfono esclusi dall'app web: nessun modulo `team-*` caricato. Il ponte nativo web impone audio disattivato. Non ripristinare chat/PTT.
- Squadra Live: posizione degli amici, nomi e distanze, riconnessione e ultima posizione riconoscibile come non in diretta. Punti personali non trasmessi.
- Normativa e territorio: Puglia. Nessuna reintroduzione dei regolamenti delle altre regioni.
- Meteo: esclusivamente Aeronautica Militare. Conservati vento e nomi locali indicativi Favugna/Voria, insieme a direzione e nome standard.
- Il precedente player audio delle specie resta rimosso.
- Aggiornamento successivo del 16 ottobre: fotocamera rimossa dal radar su richiesta dell’utente. Il radar usa solo GPS e bussola; foto di punti e funghi restano disponibili.

## Riscontri voce per voce

| Richiesta/anomalia storica | Esito e prova | Limite residuo |
|---|---|---|
| Mappa bloccata al caricamento | Avvio completo del codice attuale passa; Leaflet/CSS inclusi localmente; aggiornamento dimensioni quando la pagina diventa visibile | Rendering sul telefono non osservato in questa verifica |
| Stradale/satellite e ricerca città/coordinate | Handler e risorse presenti; cambio stradale verificato nel DOM con Leaflet reale | Servizi cartografici/geocodifica esterni possono non rispondere |
| GPS, Seguimi e ricentramento forzato | Logica GPS e riavvio presenti; trascinamento disattiva Seguimi nella prova | Ricezione GPS reale, permessi e risparmio energetico Android non certificati |
| Pressione lunga e scelta punto | Evento tenuto premuto seleziona coordinate valide; il punto salvato conserva le coordinate scelte | Prova DOM, non touch fisico |
| Appostamento assente | Corretta visibilità indipendente dal vecchio giorno selezionato; filtro data esplicito facoltativo | Una nota priva di coordinate non può diventare automaticamente un appostamento |
| Cancellazione incoerente | Stesso record eliminato da memoria persistente e API della mappa; diario ha cancellazione propria | Dati effettivi del telefono non accessibili da qui |
| Avvistamenti che spariscono / pannello confronto | Cambio Caccia/Funghi e apertura Avvistamenti provati; pannello resta visibile nel filtro corretto | Nessun ripristino di funzioni voce |
| Duplicati e date | ID casuali; date locali; salvataggi e note vuote coperti dai test | Le date storiche già inserite non vengono riscritte |
| Foto precedente su punto successivo | Campo file ripulito all'apertura; meteo non ereditato da punti diversi | Fotocamera/file chooser fisici non provati |
| Camminata e recupero | Avvio/arresto e persistenza provati; errore foto o memoria non cancella il recupero | Registrazione in background dipende da Android |
| Auto e ritorno | Salvataggio/rimozione provati; distanza, linea di ritorno e trascinamento presenti | Trascinamento fisico e navigatore esterno non provati |
| Navigazione e condivisione | Coordinate e link Google Maps presenti; Web Share con ripiego | Apertura app esterne non certificata sul dispositivo |
| Diario e backup locali | Creazione/eliminazione note, campi ripuliti, rifiuto backup errato senza perdita dati provati | Non equivalgono a sincronizzazione cloud dei punti |
| Accesso e conferma email | Aggiunti reinvio esplicito, pausa tra richieste e messaggi per link scaduti/429/email non confermata; prove con servizio simulato | Nessuna email reale inviata da questa verifica; consegna in casella non dimostrata |
| Meteo “Failed to fetch” | URL dei moduli attuali punta all'adattatore MeteoAM; API reale risponde HTTP 200 con header CORS per l'origine GitHub Pages; dati reali convertiti correttamente | La rete del singolo telefono può fallire; nessun cambio automatico ad altra fonte |
| Vento e calma 0 km/h | Test di conversione e salvataggio mantengono zero; direzione/velocità mancanti non inventate | Raffiche, stato cielo e probabilità pioggia assenti nel collegamento MeteoAM restano non disponibili |
| Confronto e ora cambio vento | Motore provato per direzioni, calma, cambi, intervallo previsione e buchi temporali | Non promette continuità oltre le ore effettivamente disponibili |
| Nomi locali | Etichette Favugna/Voria presenti, senza modificare i gradi salvati | Terminologia dialettale indicativa |
| Radar e inclinazione | Corretto ulteriore errore: valori sensore nulli non diventano falsamente Nord; test per rotazione e blocco su inclinazione | Sensori reali e fotocamera non certificati |
| Fotocamera radar | Rimossa su richiesta del 16 ottobre. Nessun elemento video o chiamata getUserMedia nel radar attuale; apertura/chiusura e direzione provate | Nessun nuovo APK richiesto per questa rimozione online |
| Squadra Live | Test sul modulo effettivamente caricato: nomi, membri senza GPS, coordinate fresche, ultima posizione, riconnessione, pausa/uscita, ponte background; crittografia reale con trasporto simulato | Due telefoni reali, Bluetooth/Wi-Fi Direct e continuità Android non certificati. Nessun PTT da ripristinare |
| Regolamenti Puglia e avvisi in mappa | Dati ufficiali caricati: 40 aree protette e 120 SIC/ZPS; test geometrie, buchi, precisione GPS e freschezza; controllo giornaliero configurato | Una variazione della pagina normativa non genera automaticamente nuovi divieti geolocalizzati; ordinanze locali non tutte incluse |
| ATC automatico | Rilevamento provincia/comune e correzione BAT presenti; indicazione espressamente da verificare | Non è una verifica giuridica di ogni confine ATC |
| Funghi: comandi e schede | Ritrovamenti separati, foto, scheda specie e avviso micologico presenti; errore servizio gestito | Servizio esterno di riconoscimento non confermato disponibile: controllo di salute terminato per timeout; non certificabile come risolto |
| Offline e backup cloud — aggiunti successivamente su richiesta | Cache dell’app corrente, accesso locale dopo il primo accesso, mappe scaricabili, backup cloud privati con 20 versioni e ripristino esplicito. Test offline/riconnessione/foto e isolamento account superati | Primo accesso e nuove mappe richiedono rete. Meteo/Squadra Live nuovi richiedono Internet. Vedi OFFLINE-E-BACKUP-CLOUD.md |
| Play Store / PRO | Nessuna attivazione di limiti o pagamenti durante i test | Pubblicazione store, firma APK e Billing non verificati qui |
| Video tutorial | Richiesta rintracciata nello storico | Consegna finale del tutorial non accertata da questa verifica |

## Controlli aggiornati

`node scripts/validate-pfc-current.cjs`, con `PFC_JSDOM_PATH` rivolto a jsdom 26.1.0, esegue:

- test dei moduli caricati dall'ingresso di produzione e delle esclusioni;
- avvio app, punti, date, note, backup errato, mappe, auto, camminata, pressione lunga, cancellazioni e filtri;
- interfaccia accesso e reinvio email con servizio simulato, senza inviare messaggi;
- motore vento, geometrie/avvisi e connessione squadra del modulo attuale;
- sensori mancanti e inclinazione radar.

Il workflow Pages ora richiede questi controlli prima del deploy, invece di verificare soltanto vecchi file 6.9.3. L'esito positivo resta distinto da una prova su hardware Android o dalla consegna effettiva delle email.

## Conclusione della verifica

Le regressioni web riproducibili coperte dai test sono corrette; restano aperti consegna email, disponibilità del riconoscimento funghi e verifiche Android reali. La fotocamera del radar è stata rimossa su richiesta del 16 ottobre. Dopo la verifica l’utente ha richiesto uso offline e backup cloud: implementati con test dedicati e isolamento degli account sul database. Il Play Store resta escluso e il tutorial non è stato verificato. Vedi OFFLINE-E-BACKUP-CLOUD.md per la preparazione delle mappe e i limiti di rete.


## Decisione successiva: verifica funghi eliminata

Il 16 ottobre 2026 l’utente ha chiesto di eliminare il riconoscimento dei funghi. Non è più una funzione da completare: rimosso il modulo corrente, i pulsanti e la presentazione delle analisi. Rimane il salvataggio di foto e note come appostamento funghi, visibile anche nel diario senza duplicare il dato.
