package cz.webflex.bbmm;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import cz.webflex.bbmm.api.ApiClient;
import cz.webflex.bbmm.model.Message;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MessageActivity extends Activity {

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private static final long POLL_INTERVAL = 4000;

    private ListView listView;
    private EditText inputField;
    private Button sendButton;
    private List<Message> messages = new ArrayList<Message>();
    private MessageAdapter adapter;
    private Handler handler = new Handler(Looper.getMainLooper());
    private String chatId;          // composite "network:chatId"
    private String currentChatName;
    private boolean polling = false;
    private String lastMessagesJson = "";

    private Runnable pollRunnable = new Runnable() {
        public void run() {
            if (polling) {
                fetchMessages();
                handler.postDelayed(this, POLL_INTERVAL);
            }
        }
    };

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_message);

        chatId = getIntent().getStringExtra("chatId");
        currentChatName = getIntent().getStringExtra("chatName");
        if (currentChatName != null) setTitle(currentChatName);

        listView = (ListView) findViewById(R.id.message_list);
        inputField = (EditText) findViewById(R.id.message_input);
        sendButton = (Button) findViewById(R.id.send_button);

        adapter = new MessageAdapter();
        listView.setAdapter(adapter);

        sendButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { trySend(); }
        });

        // Hardware keyboard: Enter sends.
        inputField.setOnKeyListener(new View.OnKeyListener() {
            public boolean onKey(View v, int keyCode, KeyEvent event) {
                if (keyCode == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN) {
                    trySend();
                    return true;
                }
                return false;
            }
        });
        // Soft keyboard: IME action sends.
        inputField.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            public boolean onEditorAction(TextView v, int actionId, KeyEvent event) {
                if (actionId == EditorInfo.IME_ACTION_SEND) { trySend(); return true; }
                return false;
            }
        });

        fetchMessages();
    }

    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_message, menu);
        return true;
    }

    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.action_rename) {
            showRenameDialog();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void showRenameDialog() {
        final EditText input = new EditText(this);
        input.setText(currentChatName != null ? currentChatName : "");
        input.setSingleLine(true);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        input.setPadding(pad, input.getPaddingTop(), pad, input.getPaddingBottom());

        new AlertDialog.Builder(this)
            .setTitle("Rename conversation")
            .setView(input)
            .setPositiveButton("Save", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int which) {
                    String alias = input.getText().toString().trim();
                    sendRename(alias);
                    if (alias.length() > 0) {
                        currentChatName = alias;
                        setTitle(alias);
                    }
                }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    protected void onResume() {
        super.onResume();
        polling = true;
        handler.postDelayed(pollRunnable, POLL_INTERVAL);
    }

    protected void onPause() {
        super.onPause();
        polling = false;
        handler.removeCallbacks(pollRunnable);
    }

    private void trySend() {
        String text = inputField.getText().toString().trim();
        if (text.length() > 0) {
            sendMessage(text);
            inputField.setText("");
        }
    }

    private void fetchMessages() {
        String url = ApiClient.getBaseUrl() + "/chat/" + ApiClient.encodeId(chatId);
        Request request = new Request.Builder().url(url).get().build();

        ApiClient.getClient().newCall(request).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) {
                handler.post(new Runnable() {
                    public void run() {
                        Toast.makeText(MessageActivity.this, "Failed to load messages", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            public void onResponse(Call call, Response response) throws IOException {
                if (!response.isSuccessful()) { response.close(); return; }

                final String responseBody = response.body().string();
                response.close();
                if (responseBody.equals(lastMessagesJson)) return;
                lastMessagesJson = responseBody;

                Type listType = new TypeToken<List<Message>>() {}.getType();
                final List<Message> result = new Gson().fromJson(responseBody, listType);

                handler.post(new Runnable() {
                    public void run() {
                        int index = listView.getFirstVisiblePosition();
                        View v = listView.getChildAt(0);
                        int top = (v == null) ? 0 : (v.getTop() - listView.getPaddingTop());
                        boolean isAtBottom = (listView.getLastVisiblePosition() >= adapter.getCount() - 2);

                        messages.clear();
                        if (result != null) messages.addAll(result);
                        adapter.notifyDataSetChanged();

                        if (isAtBottom) {
                            listView.setSelection(adapter.getCount() - 1);
                        } else {
                            listView.setSelectionFromTop(index, top);
                        }
                    }
                });
            }
        });
    }

    private void sendMessage(String text) {
        String url = ApiClient.getBaseUrl() + "/send";
        String json = "{\"conversationId\":\"" + jsonEscape(chatId)
                + "\",\"text\":\"" + jsonEscape(text) + "\"}";
        RequestBody requestBody = RequestBody.create(JSON, json);
        Request request = new Request.Builder().url(url).post(requestBody).build();

        ApiClient.getClient().newCall(request).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) {
                handler.post(new Runnable() {
                    public void run() {
                        Toast.makeText(MessageActivity.this, "Failed to send", Toast.LENGTH_SHORT).show();
                    }
                });
            }
            public void onResponse(Call call, Response response) throws IOException {
                response.close();
                handler.post(new Runnable() { public void run() { fetchMessages(); } });
            }
        });
    }

    private void sendRename(String name) {
        String url = ApiClient.getBaseUrl() + "/chat/" + ApiClient.encodeId(chatId) + "/rename";
        String json = "{\"name\":\"" + jsonEscape(name) + "\"}";
        RequestBody body = RequestBody.create(JSON, json);
        Request request = new Request.Builder().url(url).post(body).build();
        ApiClient.getClient().newCall(request).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) {}
            public void onResponse(Call call, Response response) throws IOException { response.close(); }
        });
    }

    private static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private class MessageAdapter extends BaseAdapter {

        public int getCount() { return messages.size(); }
        public Object getItem(int position) { return messages.get(position); }
        public long getItemId(int position) { return position; }

        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = LayoutInflater.from(MessageActivity.this)
                        .inflate(R.layout.item_message, parent, false);
            }

            Message msg = messages.get(position);
            TextView senderView = (TextView) convertView.findViewById(R.id.message_sender);
            TextView textView = (TextView) convertView.findViewById(R.id.message_text);
            TextView reactionView = (TextView) convertView.findViewById(R.id.message_reaction);

            if (msg.isFromMe()) {
                senderView.setText("You");
            } else {
                String sender = msg.getSender();
                senderView.setText(sender != null ? sender : "");
            }

            textView.setText(msg.getText() != null ? msg.getText() : "");

            String reaction = msg.getReaction();
            if (reaction != null && reaction.length() > 0) {
                reactionView.setText(reaction);
                reactionView.setVisibility(View.VISIBLE);
            } else {
                reactionView.setVisibility(View.GONE);
            }

            return convertView;
        }
    }
}
