# Riconoscimento fotografico: verifica del 16 ottobre 2026

Corretto il collegamento a MushroomWise AI: l’API pubblica attuale espone `/analyze`, non `/predict`, e richiede un’immagine caricata attraverso `/gradio_api/upload`. L’adattatore locale utilizza il contratto documentato `/gradio_api/call/v2/analyze` e legge il flusso SSE del relativo lavoro. Rimosso l’import dinamico di una versione non fissata di Gradio da CDN e il tentativo indiscriminato di tutti gli endpoint.

La risposta contiene tabelle: viene letta esclusivamente la graduatoria fotografica `species_label` / `vision_score`, separata dalla graduatoria che usa il contesto geografico del servizio. Non vengono inviate coordinate GPS, credenziali o dati dell’account. L’app dichiara il servizio destinatario della foto e il limite delle 16 specie confrontabili. Le percentuali non attestano la sicurezza alimentare; rimane l’indicazione al controllo micologico.

Gestiti attesa massima di 90 secondi, rete assente, risposta non valida, errore remoto, annullamento e foto successive. Un risultato precedente non può sovrascrivere la foto più recente o un altro punto. Il pulsante Riprova riutilizza la stessa foto. Se l’analisi fallisce, è possibile salvare la foto come «Fungo da identificare», senza assegnarle una specie.

## Esito della prova reale

Il servizio risulta avviato e rende disponibili configurazione e contratto API. Due lavori reali con una sua foto campione di Amanita muscaria (anche caricata realmente tramite upload) hanno restituito `event: error` con `{"error":null}`. Non è disponibile il dettaglio interno dell’errore e non abbiamo accesso amministrativo allo Space di un altro autore.

**Il riconoscimento completo resta bloccato dal servizio esterno e non è dichiarato risolto.** Le correzioni dell’app e i percorsi di errore sono verificati con trasporto simulato. Non è stato verificato un risultato reale positivo. Per eliminare questa dipendenza occorre un servizio funzionante o un modello gestito dal progetto.

## Verifiche automatiche

- Test del contratto HTTP, upload, lettura SSE anche suddivisa, percentuali, risposta non interpretabile, errore remoto, rete assente, timeout e annullamento.
- Test dell’interfaccia effettiva: due foto con risposte in ordine inverso; conservazione e salvataggio della foto senza identificazione dopo errore.
- Suite corrente completa, inclusi offline, backup, account, radar, meteo e squadra.
