# Passione Funghi e Caccia 6.4.0 — Play Store readiness

## Release identity
- Package: `com.cacciatraccia.italia`
- Version: `6.4.0`
- Version code: `6400`
- Target SDK: Android 16 / API 36
- Minimum SDK: 24
- Play Billing product ID: `passione_pro_annuale`
- Suggested annual base plan: EUR 19.99

## Permissions intentionally requested
- INTERNET
- ACCESS_NETWORK_STATE
- ACCESS_COARSE_LOCATION
- ACCESS_FINE_LOCATION
- CAMERA

No background location, storage-wide media permission, contacts, microphone, SMS or call-log permission is requested.

## Free / PRO
Free has 5 external searches per local calendar day. Local coordinate entry, basic GPS and basic weather remain outside the quota. PRO removes the external-search quota and gates selected advanced features (camera/radar view, advanced condition comparison, offline-area preparation). The quota is a product rule, not a safety control.

## Privacy / Data Safety draft
Data processed:
- Approximate and precise location: app functionality (maps/GPS/weather/distances), not sold.
- Photos: app functionality; mushroom-recognition photos are sent only after an explicit in-app disclosure/consent to MushroomWiseAI/Hugging Face.
- Purchase information: Google Play entitlement/subscription status, for app functionality/accounting of PRO access.
- User-created content stored locally: points, outings, diary, notes and backups.

Current app does not advertise, does not contain an ad SDK, and does not intentionally use behavioral analytics.

External processors/services used by feature:
- GitHub Pages: web-app delivery.
- Open-Meteo: weather/wind requests.
- OpenStreetMap/Nominatim: place search/map data.
- Esri ArcGIS: map imagery/tiles.
- jsDelivr: technical web libraries.
- Hugging Face / MushroomWiseAI: mushroom photo recognition only when requested.
- Google Maps: opened by user for navigation.
- Google Play: distribution, billing and purchase restoration.

## Play Console actions still required
1. Create the app entry with package `com.cacciatraccia.italia`.
2. Create subscription `passione_pro_annuale` and an annual base plan priced at EUR 19.99 (local prices can be adjusted by Play).
3. Upload the signed AAB.
4. Enter the public URL `https://utty1985-beep.github.io/Unamano/cacciatraccia/privacy.html` as the Privacy Policy URL.
5. Complete Data safety consistently with this file and the final Play Console behavior.
6. Complete Content rating, App access, Ads declaration (No, unless ads are added later), Target audience, Store listing and testing-track requirements.
7. Test purchase, restore, revoked subscription, approximate-only location, denied camera/location, offline behavior, and Android 16 behavior before production.

## Signing
Do not commit signing keystores or passwords to this public repository. Keep the Play upload key private and backed up separately.
