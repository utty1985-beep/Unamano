package com.cacciatraccia.italia;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
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
    private static final int REQ_CAMERA = 4103;
    private static final String START_URL = "https://utty1985-beep.github.io/Unamano/cacciatraccia/?v=6309";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private PermissionRequest pendingWebPermissionRequest;

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
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " PassioneFunghiCacciaAndroid/6.3.9");

        webView.setWebViewClient(new WebViewClient() {
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
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
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
                        request.grant(request.getResources());
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

        webView.clearCache(true);
        webView.loadUrl(START_URL + "&t=" + System.currentTimeMillis());
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
        if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            boolean ok = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            pendingGeoCallback.invoke(pendingGeoOrigin, ok, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
        if (requestCode == REQ_CAMERA && pendingWebPermissionRequest != null) {
            boolean ok = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            if (ok) pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
            else pendingWebPermissionRequest.deny();
            pendingWebPermissionRequest = null;
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
