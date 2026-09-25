package disasterrelief.model;

import java.io.Serializable;
import java.sql.Date;

/**
 * Model representing a Disaster Event in the 13-table schema.
 * Maps to the 'DisasterEvent' database table.
 */
public class DisasterEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int eventId;
    private String eventName;
    private String location;
    private String status; // 'Active', 'Resolved'
    private Date startDate;

    public DisasterEvent() {
    }

    public DisasterEvent(int eventId, String eventName, String location, String status, Date startDate) {
        this.eventId = eventId;
        this.eventName = eventName;
        this.location = location;
        this.status = status;
        this.startDate = startDate;
    }

    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public boolean isActive() {
        return "Active".equalsIgnoreCase(status);
    }

    @Override
    public String toString() {
        return eventName + " (" + location + " - " + status + ")";
    }
}
