package com.cacciatraccia.italia;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.webkit.WebView;
import org.json.JSONObject;

/** User-started location/listening session with an explicit notification stop action. */
public final class TeamService extends Service implements LocationListener {
    private static final String CHANNEL = "squadra_attiva";
    private static final int NOTIFICATION = 6909;
    private static TeamService instance;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private LocationManager locations;
    private PowerManager.WakeLock wakeLock;
    private boolean watching;
    private final Runnable heartbeat = new Runnable() {
        @Override public void run() {
            if (!TeamConnection.running) return;
            WebView view = MainActivity.retainedWebView;
            if (view != null && MainActivity.trustedUrl(view.getUrl())) {
                // Native scheduling continues with the screen off; no fabricated GPS refresh.
                view.evaluateJavascript("window.dispatchEvent(new Event('pfc:native-tick'))", null);
            }
            handler.postDelayed(this, 5000);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Squadra attiva", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("GPS e ascolto della squadra fino a Interrompi collegamento");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP_TEAM".equals(intent.getAction())) {
            try { TeamConnection.send(new JSONObject().put("event", "stop")); } catch (Exception ignored) {}
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            updateForeground();
            TeamConnection.running = true;
            if (wakeLock == null) {
                wakeLock = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":squadra");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
            }
            updateLocation();
            handler.removeCallbacks(heartbeat);
            handler.post(heartbeat);
            TeamConnection.reportState();
        } catch (Exception exception) {
            TeamConnection.reportError("Collegamento in background non avviato: consenti il GPS e riprova con l’app aperta.");
            stopSelf();
        }
        // Explicitly stopping/force-stopping never silently restarts location sharing.
        return START_NOT_STICKY;
    }

    public static void refresh() {
        if (instance == null) return;
        try { instance.updateForeground(); instance.updateLocation(); }
        catch (Exception exception) { TeamConnection.reportError("Impossibile aggiornare il servizio squadra."); }
    }

    private void updateForeground() {
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openIntent = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, TeamService.class).setAction("STOP_TEAM");
        PendingIntent stopIntent = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        Notification notification = builder.setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("Squadra collegata")
                .setContentText((TeamConnection.sharing ? "GPS attivo" : "Posizione in pausa") + (TeamConnection.audio ? " · ascolto attivo" : ""))
                .setContentIntent(openIntent).setOngoing(true).setOnlyAlertOnce(true)
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "Interrompi collegamento", stopIntent).build())
                .build();
        if (Build.VERSION.SDK_INT >= 29) {
            int types = ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            if (TeamConnection.audio) {
                types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
                if (Build.VERSION.SDK_INT >= 30) types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            }
            startForeground(NOTIFICATION, notification, types);
        } else startForeground(NOTIFICATION, notification);
    }

    private void updateLocation() {
        if (locations == null) return;
        if (!TeamConnection.sharing) {
            if (watching) locations.removeUpdates(this);
            watching = false;
            return;
        }
        if (watching) return;
        boolean fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) return;
        for (String provider : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
            if (!fine && LocationManager.GPS_PROVIDER.equals(provider)) continue;
            try {
                locations.requestLocationUpdates(provider, 5000, 0, this, Looper.getMainLooper());
                watching = true;
                Location last = locations.getLastKnownLocation(provider);
                if (last != null) onLocationChanged(last);
            } catch (IllegalArgumentException ignored) {}
        }
    }

    @Override public void onLocationChanged(Location location) {
        long age = (SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos()) / 1000000;
        if (!TeamConnection.running || !TeamConnection.sharing || age < 0 || age > 30000) return;
        try {
            TeamConnection.send(new JSONObject().put("event", "position")
                    .put("lat", location.getLatitude()).put("lng", location.getLongitude())
                    .put("acc", location.hasAccuracy() ? location.getAccuracy() : 0)
                    .put("at", System.currentTimeMillis() - age));
        } catch (Exception ignored) {}
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(heartbeat);
        if (locations != null) try { locations.removeUpdates(this); } catch (Exception ignored) {}
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        TeamConnection.running = false;
        TeamConnection.audio = false;
        instance = null;
        TeamConnection.reportState();
        stopForeground(true);
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
}
