# Checklist pubblicazione UnaMano

1. Creare un progetto Supabase NUOVO dedicato a UnaMano.
2. Eseguire `supabase_schema.sql` nel nuovo progetto.
3. Inserire SOLO URL e publishable/anon key del nuovo progetto in `config.js` (mai service_role key).
4. In Supabase Auth impostare Site URL e Redirect URLs sull'indirizzo pubblico del nuovo sito.
5. Testare: registrazione, conferma email, login, reset password, profilo, annuncio, candidatura con secondo account, assegnazione, conclusione, recensione, segnalazione.
6. Creare un repository GitHub pubblico separato e caricare i file della cartella.
7. Attivare GitHub Pages dalla branch di pubblicazione.
8. Completare Termini e Privacy con titolare, contatti, basi giuridiche, tempi di conservazione, fornitori e procedure reali prima del lancio pubblico.
9. Scegliere il nome definitivo solo dopo verifica di dominio e marchio.
10. Se si acquista un dominio, verificarlo su GitHub e configurare DNS/HTTPS.
