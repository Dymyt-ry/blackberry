package cz.webflex.bbmm.model;

// One conversation in the unified inbox. `id` is the composite "network:chatId"
// the backend uses; `network` and `networkStatus` drive the per-network badge.
public class Conversation {

    private String id;
    private String network;
    private String name;
    private String lastMessage;
    private long timestamp;
    private int unreadCount;
    private String networkStatus;   // "ok" | "degraded" | "down" | "unknown"

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }

    public String getNetworkStatus() { return networkStatus; }
    public void setNetworkStatus(String networkStatus) { this.networkStatus = networkStatus; }
}
