# Passione Funghi e Caccia — Piano stabile di recupero

## Regola di lavoro
Una modifica per volta. Ogni punto deve:
1. preservare tutte le funzioni già stabili;
2. compilare senza errori;
3. superare i controlli automatici;
4. non sovrascrivere handler/comandi già esistenti;
5. essere verificato prima di passare al punto successivo.

## Base di riferimento
- v6.5.0 RECOVERY
- Base funzionale recuperata dalla linea 6.4.0 / nucleo stabile precedente
- Radar più recente preservato
- Cache WebView/PWA forzata al rinnovo

## A. FUNZIONI STABILI DA PRESERVARE
- [x] Mappa principale
- [x] GPS e posizione utente
- [x] Pulsante Seguimi
- [x] Mappa satellitare / stradale
- [x] Rotazione / orientamento mappa
- [x] Ricerca luogo / coordinate
- [x] Pressione lunga sulla mappa per scegliere un punto
- [x] Meteo e vento del punto selezionato
- [x] Navigazione verso il punto con Maps
- [x] Salvataggio punti
- [x] Numero progressivo punto + data/ora
- [x] Modifica nome / descrizione / foto del punto
- [x] Avvistamenti caccia
- [x] Avvistamenti funghi
- [x] Diario / storico
- [x] Eliminazione punti e avvistamenti
- [x] Parcheggio auto
- [x] Spostamento punto auto
- [x] Ritorna alla macchina
- [x] Distanza live dall’auto
- [x] Camminata / traccia percorso
- [x] Condivisione percorso / punto / posizione
- [x] Backup / ripristino dati
- [x] Foto istantanea da fotocamera
- [x] Riconoscimento specie fungo indicativo
- [x] Radar / Vista punti entro 10 km
- [x] Radar: telefono piatto, rotazione solo sinistra/destra
- [x] Radar: ignora movimenti su/giù e inclinazioni
- [x] Radar: non mostra punti dietro / in allontanamento
- [x] Modalità Caccia / Funghi
- [x] FREE: limite ricerche esterne giornaliere
- [x] PRO: predisposizione Play Billing
- [x] Privacy / permessi Android / API 36
- [x] Firma Android e continuità package com.cacciatraccia.italia

## B. AGGIORNAMENTI DA REINSERIRE UNO ALLA VOLTA
- [x] 0. Modalità TESTER: tutte le funzioni Free/PRO sbloccate, limiti disattivati solo nella build di prova
- [ ] 1. Anti-regressione comandi: test automatici completi di tutti i pulsanti principali
- [ ] 2. Modalità Caccia/Funghi: mostrare solo i comandi pertinenti
- [ ] 3. Confronto meteo appostamenti in Caccia, con verde/rosso
- [ ] 4. Calendario venatorio: solo in Caccia
- [ ] 5. Calendario venatorio: Regione da GPS + ATC automatico coerente
- [ ] 6. Calendario venatorio: possibilità di cambiare Regione manualmente senza ATC incoerente
- [ ] 7. Aree protette: pagina che non si blocca in attesa GPS
- [ ] 8. Aree protette: cartografia interna sempre caricabile
- [ ] 9. Aree protette: collegamento cartografia ufficiale sempre disponibile
- [ ] 10. Aree protette: fallback chiaro se GPS/rete non disponibili
- [ ] 11. Normative funghi regionali con aggiornamento dati e fallback offline
- [ ] 12. Normative caccia / calendario aggiornabili senza bloccare UI
- [ ] 13. Cruscotto uscita: GPS, auto, rete, modalità, punti vicini
- [ ] 14. Miglior punto di caccia in base allo storico meteo
- [ ] 15. Miglioramenti grafici senza cambiare handler o struttura funzionale
- [ ] 16. Verifica generale modalità offline
- [ ] 17. Verifica generale fotocamera / riconoscimento specie
- [ ] 18. Verifica generale condivisione / backup / ripristino
- [ ] 19. Verifica FREE/PRO e quota giornaliera
- [ ] 20. Pacchetto finale Play Store APK + AAB + privacy + Data Safety

## C. MIGLIORAMENTI PENSATI DA TENERE IN CODA
- [ ] Avviso prossimità punto con distanza configurabile
- [ ] Confronto condizioni attuali vs storico più leggibile
- [ ] Indicatore precisione GPS e stato sensori
- [ ] Modalità uscita semplificata con soli comandi essenziali
- [ ] Cache cartografia offline più robusta
- [ ] Controllo automatico fonti normative con data ultimo aggiornamento
- [ ] Log diagnostico locale esportabile in caso di errore
- [ ] Test di regressione prima di ogni release
- [ ] Backup automatico della versione stabile prima di ogni nuova modifica
