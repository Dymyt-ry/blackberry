package cz.webflex.bbmm;

// Per-network presentation: a short badge label and an accent color. Keeps the
// unified inbox scannable — you always see which network a conversation is on.
public final class NetworkStyle {

    private NetworkStyle() {}

    public static String label(String network) {
        if (network == null) return "?";
        if (network.equals("whatsapp")) return "WA";
        if (network.equals("sms")) return "SMS";
        if (network.equals("instagram")) return "IG";
        if (network.equals("tiktok")) return "TT";
        return network.toUpperCase();
    }

    public static int color(String network) {
        if (network == null) return 0xFF888888;
        if (network.equals("whatsapp")) return 0xFF25D366;   // WhatsApp green
        if (network.equals("sms")) return 0xFF2196F3;        // blue
        if (network.equals("instagram")) return 0xFFE1306C;  // Instagram pink
        if (network.equals("tiktok")) return 0xFF69C9D0;     // TikTok cyan
        return 0xFF888888;
    }

    // Grey out the badge when the network is unhealthy so a WA outage is visible.
    public static boolean isDown(String status) {
        return "down".equals(status) || "degraded".equals(status);
    }
}
