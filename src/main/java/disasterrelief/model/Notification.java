package disasterrelief.model;

import java.io.Serializable;
import java.sql.Timestamp;

/**
 * Model representing a system or status notification sent to a user.
 * Maps to the 'Notification' database table.
 */
public class Notification implements Serializable {
    private static final long serialVersionUID = 1L;

    private int notificationId;
    private int userId;
    private String message;
    private boolean isRead;
    private Timestamp dateSent;

    public Notification() {
    }

    public Notification(int notificationId, int userId, String message, boolean isRead, Timestamp dateSent) {
        this.notificationId = notificationId;
        this.userId = userId;
        this.message = message;
        this.isRead = isRead;
        this.dateSent = dateSent;
    }

    public int getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(int notificationId) {
        this.notificationId = notificationId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public Timestamp getDateSent() {
        return dateSent;
    }

    public void setDateSent(Timestamp dateSent) {
        this.dateSent = dateSent;
    }

    @Override
    public String toString() {
        return "Notification #" + notificationId + " [" + (isRead ? "Read" : "Unread") + "]: " + message;
    }
}
