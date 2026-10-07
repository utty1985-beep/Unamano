package com.cacciatraccia.italia;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.WebMessage;
import android.webkit.WebMessagePort;
import android.webkit.WebView;
import org.json.JSONObject;

/** The port is delivered only to the trusted top-level document, never to iframes. */
public final class TeamConnection {
    private static WebMessagePort port;
    public static boolean running;
    public static boolean sharing = true;
    public static boolean audio;

    public static void connect(WebView view) {
        closePort();
        if (!MainActivity.trustedUrl(view.getUrl())) return;
        WebMessagePort[] ports = view.createWebMessageChannel();
        port = ports[0];
        port.setWebMessageCallback(new WebMessagePort.WebMessageCallback() {
            @Override public void onMessage(WebMessagePort ignored, WebMessage message) {
                if (!MainActivity.trustedUrl(view.getUrl())) return;
                try {
                    JSONObject data = new JSONObject(message.getData());
                    String command = data.optString("command");
                    if ("stop".equals(command)) {
                        MainActivity activity = MainActivity.current();
                        if (activity != null) activity.cancelTeamStart();
                        view.getContext().getApplicationContext().stopService(new Intent(view.getContext(), TeamService.class));
                    } else if ("start".equals(command)) {
                        MainActivity activity = MainActivity.current();
                        if (activity != null && activity.isVisible()) activity.startTeam();
                    } else if ("sharing".equals(command)) {
                        sharing = data.optBoolean("enabled", true);
                        if (running) TeamService.refresh();
                    } else if ("audio".equals(command)) {
                        boolean requested = data.optBoolean("enabled");
                        MainActivity activity = MainActivity.current();
                        if (!requested || (activity != null && activity.isVisible()
                                && activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)) {
                            audio = requested;
                            if (running) TeamService.refresh();
                        }
                    }
                } catch (Exception ignoredException) {}
            }
        });
        view.postWebMessage(new WebMessage("pfc-native-team-v1", new WebMessagePort[]{ports[1]}),
                Uri.parse("https://utty1985-beep.github.io"));
        reportState();
    }

    public static void closePort() {
        if (port != null) { try { port.close(); } catch (Exception ignored) {} port = null; }
    }

    public static void send(JSONObject data) {
        if (port != null) try { port.postMessage(new WebMessage(data.toString())); } catch (Exception ignored) {}
    }

    public static void reportState() {
        try { send(new JSONObject().put("event", "state").put("active", running).put("version", "6.9.9")); }
        catch (Exception ignored) {}
    }

    public static void reportError(String message) {
        try { send(new JSONObject().put("event", "error").put("message", message)); } catch (Exception ignored) {}
    }
}
