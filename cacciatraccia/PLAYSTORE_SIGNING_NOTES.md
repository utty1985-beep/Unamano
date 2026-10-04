# Firma Play Store — continuità con le versioni già installate

## Identità confermata
Le APK 6.3.9 e 6.4.0 usano lo stesso certificato:
SHA-256: `9E:19:0F:D2:BC:0E:CF:D4:76:C6:6B:A1:92:F6:26:F9:E4:42:3C:F7:B1:97:01:97:BC:13:7B:7E:B1:21:81:C8`

Package: `com.cacciatraccia.italia`

La v6.4.0 ha versionCode 6400, superiore alla v6.3.9 (6309), quindi l'APK firmato è predisposto per aggiornare direttamente la versione precedente.

## Prima della prima pubblicazione Play
La Play Console oggi propone per impostazione predefinita chiavi di firma generate da Google. Se vuoi mantenere la continuità di firma anche fra installazioni distribuite fuori da Play e installazioni Play, configura Play App Signing fornendo una copia della chiave di firma esistente prima di rilasciare su canale aperto o Produzione.

Percorso indicativo:
Protetto con Play > Distribuzione sul Play Store > Firma dell'app di Google Play > Cambia chiave di firma dell'app > Fornisci una copia della chiave di firma.

Segui le istruzioni della Play Console/PEPK per trasferire la chiave in modo cifrato. Non caricare mai il keystore o la password in un repository pubblico.

## Backup privato
Il backup della chiave esistente è conservato separatamente nella Libreria dell'utente. Non viene incluso nel pacchetto pubblico Play Store.

## AAB
Il file `Passione-Funghi-e-Caccia-v6.4.0-PLAY-SIGNED.aab` è firmato con la chiave storica CacciaTraccia. Se la Play Console viene configurata con una chiave di caricamento diversa, firma nuovamente l'AAB con la chiave di caricamento registrata.
