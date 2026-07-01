package cz.webflex.bbmm.model;

public class Message {

    private String id;
    private String network;
    private String text;
    private boolean fromMe;
    private long timestamp;
    private String sender;
    private Boolean notify;
    private String notifyText;
    private String reaction;
    private String type;      // "text" | "image"
    private String mediaId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public boolean isFromMe() { return fromMe; }
    public void setFromMe(boolean fromMe) { this.fromMe = fromMe; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public Boolean getNotify() { return notify; }
    public void setNotify(Boolean notify) { this.notify = notify; }

    public String getNotifyText() { return notifyText; }
    public void setNotifyText(String notifyText) { this.notifyText = notifyText; }

    public String getReaction() { return reaction; }
    public void setReaction(String reaction) { this.reaction = reaction; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMediaId() { return mediaId; }
    public void setMediaId(String mediaId) { this.mediaId = mediaId; }
}
