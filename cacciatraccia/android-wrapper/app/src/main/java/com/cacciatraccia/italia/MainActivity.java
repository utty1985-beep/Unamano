package com.cacciatraccia.italia;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int REQ_LOCATION = 4101;
    private static final int REQ_FILE = 4102;
    private static final int REQ_CAMERA = 4103;

    private static final String APP_HOST = "utty1985-beep.github.io";
    private static final String APP_PATH = "/Unamano/cacciatraccia/";
    private static final String START_URL = "https://" + APP_HOST + APP_PATH + "?v=6403&tester=1";
    private static final String PRIVACY_URL = "https://" + APP_HOST + APP_PATH + "privacy.html";
    private static final String PRO_PRODUCT_ID = "passione_pro_annuale";
    private static final int FREE_DAILY_EXTERNAL_SEARCHES = 5;
    private static final String LIMIT_PREFS = "pfc_daily_limits";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private PermissionRequest pendingWebPermissionRequest;

    private BillingClient billingClient;
    private volatile boolean proActive = false;
    private volatile String proPrice = "19,99 € / anno";
    private ProductDetails proProductDetails;
    private String proOfferToken;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }
        s.setUserAgentString(s.getUserAgentString() + " PassioneFunghiCacciaAndroid/6.4.3");

        webView.addJavascriptInterface(new NativeBridge(), "PassioneNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (isTrustedAppUrl(u)) return false;
                openExternal(u);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isTrustedOrigin(origin)) {
                    callback.invoke(origin, false, false);
                    return;
                }
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                    return;
                }

                pendingGeoOrigin = origin;
                pendingGeoCallback = callback;
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Posizione necessaria")
                        .setMessage("Passione Funghi e Caccia usa la posizione per GPS, punti salvati, distanza dall’auto, camminate e meteo del punto. La posizione non viene venduta e non è richiesta in background. Alcune funzioni online inviano le coordinate necessarie ai servizi descritti nella Privacy Policy.")
                        .setPositiveButton("Continua", (dialog, which) ->
                                requestPermissions(new String[]{
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                }, REQ_LOCATION))
                        .setNegativeButton("Non ora", (dialog, which) -> denyPendingLocation())
                        .setNeutralButton("Privacy", (dialog, which) -> {
                            openExternal(Uri.parse(PRIVACY_URL));
                            denyPendingLocation();
                        })
                        .setOnCancelListener(dialog -> denyPendingLocation())
                        .show();
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!isTrustedOrigin(request.getOrigin().toString())) {
                        request.deny();
                        return;
                    }

                    boolean wantsVideo = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            wantsVideo = true;
                            break;
                        }
                    }
                    if (!wantsVideo) {
                        request.deny();
                        return;
                    }

                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingWebPermissionRequest = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                cameraUri = null;

                try {
                    Intent picker = params.createIntent();
                    Intent camera = acceptsImages(params) ? createCameraIntent() : null;

                    if (params.isCaptureEnabled() && camera != null) {
                        startActivityForResult(camera, REQ_FILE);
                        return true;
                    }

                    Intent chooser = Intent.createChooser(picker, "Scatta foto o scegli dall'album");
                    if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                    startActivityForResult(chooser, REQ_FILE);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    cameraUri = null;
                    Toast.makeText(MainActivity.this, "Fotocamera o selettore foto non disponibile", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        initBilling();

        boolean first643 = !getSharedPreferences("pfc_release_state", MODE_PRIVATE)
                .getBoolean("web_643_loaded", false);
        if (first643) {
            webView.clearCache(true);
            getSharedPreferences("pfc_release_state", MODE_PRIVATE)
                    .edit().putBoolean("web_643_loaded", true).apply();
        }

        if (!first643 && state != null && webView.restoreState(state) != null) {
            String saved = state.getString("cameraUri");
            if (saved != null) cameraUri = Uri.parse(saved);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private boolean isTrustedAppUrl(Uri uri) {
        if (uri == null) return false;
        return "https".equalsIgnoreCase(uri.getScheme())
                && APP_HOST.equalsIgnoreCase(uri.getHost())
                && uri.getPath() != null
                && uri.getPath().startsWith(APP_PATH);
    }

    private boolean isTrustedOrigin(String origin) {
        try {
            Uri uri = Uri.parse(origin);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && APP_HOST.equalsIgnoreCase(uri.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    private void openExternal(Uri uri) {
        if (uri == null) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            Toast.makeText(this, "Impossibile aprire il collegamento", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void denyPendingLocation() {
        if (pendingGeoCallback != null) {
            pendingGeoCallback.invoke(pendingGeoOrigin, false, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    private boolean acceptsImages(WebChromeClient.FileChooserParams params) {
        String[] types = params.getAcceptTypes();
        if (types == null || types.length == 0) return true;
        for (String t : types) {
            if (t == null || t.isEmpty() || t.equals("*/*") || t.startsWith("image/")) return true;
        }
        return false;
    }

    private Intent createCameraIntent() throws IOException {
        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (camera.resolveActivity(getPackageManager()) == null) return null;

        File dir = new File(getCacheDir(), "camera");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("Impossibile creare cartella fotocamera");
        File photo = File.createTempFile("passione_funghi_caccia_", ".jpg", dir);
        cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photo);

        camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        camera.setClipData(ClipData.newRawUri("foto", cameraUri));
        return camera;
    }

    private void initBilling() {
        PendingPurchasesParams pending = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build();

        billingClient = BillingClient.newBuilder(this)
                .setListener((billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        processPurchases(purchases);
                    } else if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
                        toastOnUi("Google Play: acquisto non completato");
                    }
                })
                .enablePendingPurchases(pending)
                .enableAutoServiceReconnection()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    refreshProState();
                    queryProProduct(false);
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                proProductDetails = null;
                proOfferToken = null;
            }
        });
    }

    private void queryProProduct(boolean launchAfter) {
        if (billingClient == null || !billingClient.isReady()) {
            if (launchAfter) toastOnUi("Google Play non è ancora disponibile. Riprova tra poco.");
            return;
        }

        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRO_PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || result.getProductDetailsList().isEmpty()) {
                proProductDetails = null;
                proOfferToken = null;
                if (launchAfter) toastOnUi("Piano PRO non ancora configurato nel Play Store.");
                return;
            }

            proProductDetails = result.getProductDetailsList().get(0);
            selectBestSubscriptionOffer(proProductDetails);
            notifyWebPlanChanged();

            if (launchAfter) runOnUiThread(this::startProPurchase);
        });
    }

    private void selectBestSubscriptionOffer(ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            proOfferToken = null;
            return;
        }

        ProductDetails.SubscriptionOfferDetails selected = null;
        ProductDetails.PricingPhase selectedPrice = null;

        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
                if ("P1Y".equals(phase.getBillingPeriod()) && phase.getPriceAmountMicros() > 0) {
                    if (selected == null || offer.getOfferId() == null) {
                        selected = offer;
                        selectedPrice = phase;
                    }
                    if (offer.getOfferId() == null) break;
                }
            }
            if (selected != null && selected.getOfferId() == null) break;
        }

        if (selected == null) {
            selected = offers.get(0);
            List<ProductDetails.PricingPhase> phases = selected.getPricingPhases().getPricingPhaseList();
            if (!phases.isEmpty()) selectedPrice = phases.get(phases.size() - 1);
        }

        proOfferToken = selected.getOfferToken();
        if (selectedPrice != null) proPrice = selectedPrice.getFormattedPrice() + " / anno";
    }

    private void startProPurchase() {
        if (billingClient == null || !billingClient.isReady()) {
            toastOnUi("Google Play non è disponibile.");
            return;
        }
        if (proProductDetails == null || proOfferToken == null) {
            queryProProduct(true);
            return;
        }

        BillingFlowParams.ProductDetailsParams productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(proProductDetails)
                        .setOfferToken(proOfferToken)
                        .build();

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams))
                .setIsOfferPersonalized(false)
                .build();

        BillingResult result = billingClient.launchBillingFlow(this, flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            toastOnUi("Impossibile avviare l'acquisto Google Play.");
        }
    }

    private void refreshProState() {
        if (billingClient == null || !billingClient.isReady()) return;

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
            processPurchases(purchases);
        });
    }

    private void processPurchases(List<Purchase> purchases) {
        boolean active = false;
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                if (!purchase.getProducts().contains(PRO_PRODUCT_ID)) continue;

                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    active = true;
                    if (!purchase.isAcknowledged()) acknowledgePurchase(purchase);
                }
            }
        }
        proActive = active;
        notifyWebPlanChanged();
    }

    private void acknowledgePurchase(Purchase purchase) {
        if (billingClient == null || !billingClient.isReady()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                refreshProState();
            }
        });
    }

    private String quotaDay() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private int getExternalSearchesUsedToday() {
        synchronized (this) {
            android.content.SharedPreferences prefs = getSharedPreferences(LIMIT_PREFS, MODE_PRIVATE);
            String today = quotaDay();
            String storedDay = prefs.getString("day", "");
            if (!today.equals(storedDay)) {
                prefs.edit().putString("day", today).putInt("used", 0).apply();
                return 0;
            }
            return Math.max(0, Math.min(FREE_DAILY_EXTERNAL_SEARCHES, prefs.getInt("used", 0)));
        }
    }

    private boolean consumeExternalSearch() {
        if (proActive) return true;
        synchronized (this) {
            android.content.SharedPreferences prefs = getSharedPreferences(LIMIT_PREFS, MODE_PRIVATE);
            String today = quotaDay();
            String storedDay = prefs.getString("day", "");
            int used = today.equals(storedDay) ? prefs.getInt("used", 0) : 0;
            used = Math.max(0, Math.min(FREE_DAILY_EXTERNAL_SEARCHES, used));
            if (used >= FREE_DAILY_EXTERNAL_SEARCHES) return false;
            prefs.edit().putString("day", today).putInt("used", used + 1).apply();
            return true;
        }
    }

    private void notifyWebPlanChanged() {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                        "window.PFCNativePlanChanged&&window.PFCNativePlanChanged();",
                        null
                );
            }
        });
    }

    private void toastOnUi(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
    }

    public final class NativeBridge {
        @JavascriptInterface
        public boolean isPro() {
            return proActive;
        }

        @JavascriptInterface
        public String getProPrice() {
            return proPrice;
        }

        @JavascriptInterface
        public int getExternalSearchesUsedToday() {
            return MainActivity.this.getExternalSearchesUsedToday();
        }

        @JavascriptInterface
        public boolean consumeExternalSearch() {
            return MainActivity.this.consumeExternalSearch();
        }

        @JavascriptInterface
        public void buyPro() {
            runOnUiThread(MainActivity.this::startProPurchase);
        }

        @JavascriptInterface
        public void restorePro() {
            runOnUiThread(() -> {
                refreshProState();
                queryProProduct(false);
            });
        }

        @JavascriptInterface
        public void openPrivacy() {
            runOnUiThread(() -> openExternal(Uri.parse(PRIVACY_URL)));
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        if (cameraUri != null) outState.putString("cameraUri", cameraUri.toString());
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);

        if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            boolean ok = hasLocationPermission();
            pendingGeoCallback.invoke(pendingGeoOrigin, ok, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }

        if (requestCode == REQ_CAMERA && pendingWebPermissionRequest != null) {
            boolean ok = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            if (ok) pendingWebPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingWebPermissionRequest.deny();
            pendingWebPermissionRequest = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            Uri[] result = null;

            if (resultCode == RESULT_OK) {
                if (data != null) result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                if ((result == null || result.length == 0) && cameraUri != null) result = new Uri[]{cameraUri};
            }

            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            cameraUri = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (billingClient != null) billingClient.endConnection();
        if (webView != null) {
            webView.removeJavascriptInterface("PassioneNative");
            webView.destroy();
        }
        super.onDestroy();
    }
}
