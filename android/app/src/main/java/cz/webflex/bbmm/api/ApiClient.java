package cz.webflex.bbmm.api;

import android.content.Context;
import android.content.SharedPreferences;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.InetAddress;
import java.net.Socket;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.Arrays;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.ConnectionSpec;
import okhttp3.Interceptor;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.TlsVersion;

public class ApiClient {

    private static final String DEFAULT_BASE_URL = "http://10.0.2.2:3000";

    private static OkHttpClient client;
    private static String baseUrl = DEFAULT_BASE_URL;
    private static String authToken = "";

    private static final X509TrustManager TRUST_ALL_MANAGER = new X509TrustManager() {
        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        public void checkClientTrusted(X509Certificate[] chain, String authType) {}
        public void checkServerTrusted(X509Certificate[] chain, String authType) {}
    };

    private ApiClient() {}

    public static void configure(String url, String token) {
        baseUrl = url;
        authToken = token;
        client = null;
    }

    public static String getBaseUrl() { return baseUrl; }

    // Composite conversation ids ("whatsapp:123@s.whatsapp.net", "sms:+420...")
    // must be percent-encoded before going into a /chat/{id} path segment.
    public static String encodeId(String id) {
        try {
            return URLEncoder.encode(id, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            return id;
        }
    }

    public static OkHttpClient getClient() {
        if (client == null) {
            OkHttpClient.Builder builder = new OkHttpClient.Builder()
                    .addInterceptor(new Interceptor() {
                        public Response intercept(Chain chain) throws IOException {
                            Request original = chain.request();
                            Request.Builder rb = original.newBuilder()
                                    .header("x-api-token", authToken);
                            if (!(original.body() instanceof MultipartBody)) {
                                rb.header("Content-Type", "application/json");
                            }
                            return chain.proceed(rb.build());
                        }
                    });

            try {
                // Force TLS 1.2 on BlackBerry 10's old Android runtime (API 18),
                // which otherwise negotiates TLS 1.0 and fails modern handshakes.
                SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
                sslContext.init(null, new TrustManager[]{TRUST_ALL_MANAGER}, new SecureRandom());
                SSLSocketFactory tls12SocketFactory = new Tls12SocketFactory(sslContext.getSocketFactory());

                ConnectionSpec cs = new ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_1)
                        .build();

                builder.sslSocketFactory(tls12SocketFactory, TRUST_ALL_MANAGER);
                builder.connectionSpecs(Arrays.asList(cs, ConnectionSpec.CLEARTEXT));
                builder.hostnameVerifier(new HostnameVerifier() {
                    public boolean verify(String hostname, SSLSession session) { return true; }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }

            client = builder.build();
        }
        return client;
    }

    public static void init(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("bbmm_prefs", Context.MODE_PRIVATE);
        String url = prefs.getString("backend_url", DEFAULT_BASE_URL);
        String token = prefs.getString("api_token", "");
        configure(url, token);
    }

    public static boolean isConfigured(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("bbmm_prefs", Context.MODE_PRIVATE);
        String url = prefs.getString("backend_url", "");
        String token = prefs.getString("api_token", "");
        return url.length() > 0 && token.length() > 0;
    }

    // Forces TLS 1.1/1.2 on sockets the old Android runtime would otherwise
    // open as TLS 1.0. (Inner class ported from BBWA.)
    private static class Tls12SocketFactory extends SSLSocketFactory {
        private final SSLSocketFactory delegate;

        public Tls12SocketFactory(SSLSocketFactory delegate) { this.delegate = delegate; }

        public String[] getDefaultCipherSuites() { return delegate.getDefaultCipherSuites(); }
        public String[] getSupportedCipherSuites() { return delegate.getSupportedCipherSuites(); }

        private Socket patch(Socket s) {
            if (s instanceof SSLSocket) {
                ((SSLSocket) s).setEnabledProtocols(new String[]{"TLSv1.1", "TLSv1.2"});
            }
            return s;
        }

        public Socket createSocket(Socket s, String host, int port, boolean autoClose) throws IOException {
            return patch(delegate.createSocket(s, host, port, autoClose));
        }
        public Socket createSocket(String host, int port) throws IOException, UnknownHostException {
            return patch(delegate.createSocket(host, port));
        }
        public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException, UnknownHostException {
            return patch(delegate.createSocket(host, port, localHost, localPort));
        }
        public Socket createSocket(InetAddress host, int port) throws IOException {
            return patch(delegate.createSocket(host, port));
        }
        public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort) throws IOException {
            return patch(delegate.createSocket(address, port, localAddress, localPort));
        }
    }
}
