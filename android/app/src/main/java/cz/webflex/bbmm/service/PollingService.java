package cz.webflex.bbmm.service;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Log;

import cz.webflex.bbmm.MessageActivity;
import cz.webflex.bbmm.NetworkStyle;
import cz.webflex.bbmm.api.ApiClient;
import cz.webflex.bbmm.model.Conversation;
import cz.webflex.bbmm.model.Message;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Request;
import okhttp3.Response;

// Background poll (every ~60s via AlarmManager) that raises a notification for
// new inbound messages across all networks. Prefixes the title with the network
// badge so you know where a message came from.
public class PollingService extends Service {

    private static final String TAG = "PollingService";
    private static final long POLL_INTERVAL = 60 * 1000;
    private static HashMap<String, Long> lastTimestamps = new HashMap<String, Long>();
    private static int notificationId = 1;

    public IBinder onBind(Intent intent) { return null; }

    public static void schedulePolling(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, PollingService.class);
        PendingIntent pendingIntent = PendingIntent.getService(context, 0, intent, 0);
        alarmManager.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + POLL_INTERVAL,
                POLL_INTERVAL,
                pendingIntent);
    }

    public int onStartCommand(Intent intent, int flags, int startId) {
        pollForMessages();
        return START_NOT_STICKY;
    }

    private void pollForMessages() {
        String url = ApiClient.getBaseUrl() + "/chats";
        Request request = new Request.Builder().url(url).get().build();

        ApiClient.getClient().newCall(request).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Poll failed: " + e.getMessage());
            }
            public void onResponse(Call call, Response response) throws IOException {
                if (!response.isSuccessful()) { response.close(); return; }

                String body = response.body().string();
                Type listType = new TypeToken<List<Conversation>>() {}.getType();
                List<Conversation> chats = new Gson().fromJson(body, listType);
                if (chats == null) return;

                for (int i = 0; i < chats.size(); i++) {
                    Conversation chat = chats.get(i);
                    String chatId = chat.getId();
                    long ts = chat.getTimestamp();
                    Long prev = lastTimestamps.get(chatId);
                    if (prev != null && ts > prev.longValue()) {
                        checkAndNotify(chatId, chat.getName(), chat.getNetwork());
                    }
                    lastTimestamps.put(chatId, Long.valueOf(ts));
                }
            }
        });
    }

    private void checkAndNotify(final String chatId, final String chatName, final String network) {
        String url = ApiClient.getBaseUrl() + "/chat/" + ApiClient.encodeId(chatId);
        Request request = new Request.Builder().url(url).get().build();

        ApiClient.getClient().newCall(request).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "checkAndNotify fetch failed: " + e.getMessage());
            }
            public void onResponse(Call call, Response response) throws IOException {
                if (!response.isSuccessful()) { response.close(); return; }

                String body = response.body().string();
                Type listType = new TypeToken<List<Message>>() {}.getType();
                List<Message> msgs = new Gson().fromJson(body, listType);
                if (msgs == null || msgs.isEmpty()) return;

                Message last = msgs.get(msgs.size() - 1);
                Boolean notifyFlag = last.getNotify();
                if (notifyFlag != null && !notifyFlag.booleanValue()) return;

                String content = last.getNotifyText() != null ? last.getNotifyText()
                        : (last.getText() != null ? last.getText() : "New message");
                showNotification(chatId, chatName, network, content);
            }
        });
    }

    private void showNotification(String chatId, String chatName, String network, String text) {
        Intent intent = new Intent(this, MessageActivity.class);
        intent.putExtra("chatId", chatId);
        intent.putExtra("chatName", chatName);
        intent.putExtra("network", network);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, chatId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT);

        String badge = "[" + NetworkStyle.label(network) + "] ";
        String title = badge + (chatName != null ? chatName : chatId);
        String content = text != null ? text : "New message";

        Notification notification = new Notification.Builder(this)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle(title)
                .setContentText(content)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setDefaults(Notification.DEFAULT_ALL)
                .build();

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(notificationId++, notification);
    }
}
