package cz.webflex.bbmm;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import cz.webflex.bbmm.api.ApiClient;

public class SettingsActivity extends Activity {

    private static final String PREFS_NAME = "bbmm_prefs";
    private static final String KEY_BACKEND_URL = "backend_url";
    private static final String KEY_API_TOKEN = "api_token";

    private EditText editBackendUrl;
    private EditText editApiToken;

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        if (getActionBar() != null) {
            getActionBar().setDisplayHomeAsUpEnabled(true);
        }

        editBackendUrl = (EditText) findViewById(R.id.edit_backend_url);
        editApiToken = (EditText) findViewById(R.id.edit_api_token);
        Button btnSave = (Button) findViewById(R.id.btn_save);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        editBackendUrl.setText(prefs.getString(KEY_BACKEND_URL, ""));
        editApiToken.setText(prefs.getString(KEY_API_TOKEN, ""));

        btnSave.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { saveSettings(); }
        });
    }

    private void saveSettings() {
        String url = editBackendUrl.getText().toString().trim();
        String token = editApiToken.getText().toString().trim();

        if (url.length() == 0 || token.length() == 0) {
            Toast.makeText(this, R.string.settings_required, Toast.LENGTH_SHORT).show();
            return;
        }
        // Strip a trailing slash so baseUrl + "/chats" doesn't double up.
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);

        SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
        editor.putString(KEY_BACKEND_URL, url);
        editor.putString(KEY_API_TOKEN, token);
        editor.commit();

        ApiClient.configure(url, token);
        Toast.makeText(this, R.string.settings_saved, Toast.LENGTH_SHORT).show();
        finish();
    }

    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
