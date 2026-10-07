package com.cacciatraccia.italia;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.content.MutableContextWrapper;
import android.view.ViewGroup;
import java.lang.ref.WeakReference;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.PermissionRequest;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

public class MainActivity extends Activity {
    private static final int REQ_LOCATION = 4101;
    private static final int REQ_FILE = 4102;
    private static final int REQ_AUDIO = 4103;
    private static final int REQ_TEAM = 4104;
    private static final int REQ_NOTIFICATIONS = 4105;
    public static WebView retainedWebView;
    private static WeakReference<MainActivity> currentActivity = new WeakReference<>(null);
    private boolean visible;
    private boolean teamRequested;
    private boolean teamPermissionPending;
    public static MainActivity current() { return currentActivity.get(); }
    public boolean isVisible() { return visible; }
    private static final String START_URL = "https://utty1985-beep.github.io/Unamano/cacciatraccia/";

    private WebView webView;
    private PermissionRequest pendingAudioRequest;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        currentActivity = new WeakReference<>(this);
        boolean existing = retainedWebView != null;
        webView = existing ? retainedWebView : new WebView(new MutableContextWrapper(this));
        retainedWebView = webView;
        ((MutableContextWrapper) webView.getContext()).setBaseContext(this);
        if (webView.getParent() instanceof ViewGroup) ((ViewGroup) webView.getParent()).removeView(webView);
        if (Build.VERSION.SDK_INT >= 26) webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (!s.getUserAgentString().contains("PassioneFunghiCacciaAndroid/")) s.setUserAgentString(s.getUserAgentString() + " PassioneFunghiCacciaAndroid/6.9.9");

        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                TeamConnection.closePort();
                if (!trustedUrl(url)) stopService(new Intent(MainActivity.this, TeamService.class));
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (trustedUrl(url)) TeamConnection.connect(view);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String host = u.getHost();
                if ("https".equalsIgnoreCase(u.getScheme()) && "utty1985-beep.github.io".equalsIgnoreCase(host)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> requestAudio(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (pendingAudioRequest == request) pendingAudioRequest = null;
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    requestPermissions(new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    }, REQ_LOCATION);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                cameraUri = null;

                try {
                    Intent picker = params.createIntent();
                    Intent camera = acceptsImages(params) ? createCameraIntent() : null;

                    // Gli input con capture="environment" (es. Vedi specie) aprono subito la fotocamera.
                    if (params.isCaptureEnabled() && camera != null) {
                        startActivityForResult(camera, REQ_FILE);
                        return true;
                    }

                    // Negli altri campi foto l'utente può scegliere tra fotocamera istantanea e album/file.
                    Intent chooser = Intent.createChooser(picker, "Scatta foto o scegli dall'album");
                    if (camera != null) {
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                    }
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

        if (!existing) {
            webView.clearCache(true);
            webView.loadUrl(START_URL + "?t=" + System.currentTimeMillis());
        } else TeamConnection.connect(webView);
    }

    private boolean isAppPage() {
        return trustedUrl(webView.getUrl());
    }

    public static boolean trustedUrl(String url) {
        Uri page = Uri.parse(url == null ? "" : url);
        String path = page.getPath();
        return "https".equalsIgnoreCase(page.getScheme())
                && "utty1985-beep.github.io".equalsIgnoreCase(page.getHost())
                && (page.getPort() == -1 || page.getPort() == 443)
                && path != null && path.startsWith("/Unamano/cacciatraccia/");
    }

    private boolean isTrustedAudioRequest(PermissionRequest request) {
        Uri origin = request.getOrigin();
        if (!isAppPage() || !"https".equalsIgnoreCase(origin.getScheme())
                || !"utty1985-beep.github.io".equalsIgnoreCase(origin.getHost())
                || (origin.getPort() != -1 && origin.getPort() != 443)) return false;
        String[] resources = request.getResources();
        return resources.length == 1
                && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0]);
    }

    private void requestAudio(PermissionRequest request) {
        if (!isTrustedAudioRequest(request) || pendingAudioRequest != null) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            return;
        }
        boolean asked = getPreferences(MODE_PRIVATE).getBoolean("microphoneAsked", false);
        if (asked && !shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO)) {
            request.deny();
            showMicrophoneSettings();
            return;
        }
        pendingAudioRequest = request;
        getPreferences(MODE_PRIVATE).edit().putBoolean("microphoneAsked", true).apply();
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_AUDIO);
    }

    private void showMicrophoneSettings() {
        new AlertDialog.Builder(this)
                .setTitle("Abilita il microfono")
                .setMessage("Apri le autorizzazioni di Passione Funghi e Caccia e consenti il microfono. Poi torna qui e premi Attiva audio o Parla.")
                .setPositiveButton("Apri autorizzazioni", (dialog, which) -> {
                    try {
                        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                Uri.parse("package:" + getPackageName())));
                    } catch (Exception e) {
                        Toast.makeText(this, "Apri Impostazioni > App > Passione Funghi e Caccia > Autorizzazioni", Toast.LENGTH_LONG).show();
                    }
                })
                .setNegativeButton("Annulla", null)
                .show();
    }

    public void cancelTeamStart() { teamRequested = false; }

    public void startTeam() {
        teamRequested = true;
        if (!visible) return;
        boolean gps = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!gps) {
            if (pendingGeoCallback == null && !teamPermissionPending) { teamPermissionPending = true; requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_TEAM); }
            return;
        }
        teamRequested = false;
        try {
            Intent intent = new Intent(this, TeamService.class);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent); else startService(intent);
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                    && !getPreferences(MODE_PRIVATE).getBoolean("teamNotificationAsked", false)) {
                getPreferences(MODE_PRIVATE).edit().putBoolean("teamNotificationAsked", true).apply();
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
            }
        } catch (Exception exception) { TeamConnection.reportError("Impossibile avviare il collegamento in background."); }
    }

    @Override protected void onResume() {
        super.onResume(); visible = true; currentActivity = new WeakReference<>(this);
        if (teamRequested && !teamPermissionPending) startTeam();
    }

    @Override protected void onPause() { visible = false; super.onPause(); }

    @Override
    protected void onDestroy() {
        if (pendingAudioRequest != null) {
            pendingAudioRequest.deny();
            pendingAudioRequest = null;
        }
        if (current() == this) {
            currentActivity.clear();
            if (webView.getParent() instanceof ViewGroup) ((ViewGroup) webView.getParent()).removeView(webView);
            ((MutableContextWrapper) webView.getContext()).setBaseContext(getApplicationContext());
            webView.setWebChromeClient(null);
            webView.setWebViewClient(new BackgroundWebClient());
            if (!TeamConnection.running) { TeamConnection.closePort(); webView.destroy(); retainedWebView = null; }
        }
        super.onDestroy();
    }

    private static final class BackgroundWebClient extends WebViewClient {
        @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
            TeamConnection.closePort();
            if (!trustedUrl(url)) view.getContext().getApplicationContext().stopService(new Intent(view.getContext().getApplicationContext(), TeamService.class));
        }
        @Override public void onPageFinished(WebView view, String url) { if (trustedUrl(url)) TeamConnection.connect(view); }
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
        cameraUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                photo
        );

        camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        camera.setClipData(ClipData.newRawUri("foto", cameraUri));
        return camera;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        if (cameraUri != null) outState.putString("cameraUri", cameraUri.toString());
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onRestoreInstanceState(Bundle state) {
        super.onRestoreInstanceState(state);
        String saved = state.getString("cameraUri");
        if (saved != null) cameraUri = Uri.parse(saved);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_TEAM) {
            teamPermissionPending = false;
            boolean gps = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (gps && teamRequested) { if (visible) startTeam(); }
            else { teamRequested = false; TeamConnection.reportError("Consenti il GPS per mantenere la squadra attiva in background."); }
        }
        if (requestCode == REQ_AUDIO && pendingAudioRequest != null) {
            PermissionRequest request = pendingAudioRequest;
            pendingAudioRequest = null;
            boolean granted = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (granted && isTrustedAudioRequest(request)) {
                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                request.deny();
                if (!granted) {
                    Toast.makeText(this, "Microfono non autorizzato. Premi di nuovo Attiva audio o Parla per abilitarlo.", Toast.LENGTH_LONG).show();
                }
            }
        }
        if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            boolean ok = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            pendingGeoCallback.invoke(pendingGeoOrigin, ok, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
            if (ok && teamRequested && visible) startTeam();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            Uri[] result = null;

            if (resultCode == RESULT_OK) {
                if (data != null) {
                    result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                }
                if ((result == null || result.length == 0) && cameraUri != null) {
                    result = new Uri[]{cameraUri};
                }
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
}

