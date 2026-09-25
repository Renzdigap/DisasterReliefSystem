package disasterrelief.model;

import java.io.Serializable;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a Relief Request submitted by an Organization.
 * Maps to the 'ReliefRequest' database table.
 */
public class ReliefRequest implements Serializable {
    private static final long serialVersionUID = 1L;

    private int requestId;
    private int orgId;
    private int eventId;
    private Date requestDate;
    private String status; // 'Pending', 'Approved', 'Fulfilled'

    // Joined helper fields
    private String orgName;
    private String eventName;
    private List<RequestItem> items = new ArrayList<>();

    public ReliefRequest() {
    }

    public ReliefRequest(int requestId, int orgId, int eventId, Date requestDate, String status) {
        this.requestId = requestId;
        this.orgId = orgId;
        this.eventId = eventId;
        this.requestDate = requestDate;
        this.status = status;
    }

    public int getRequestId() {
        return requestId;
    }

    public void setRequestId(int requestId) {
        this.requestId = requestId;
    }

    public int getOrgId() {
        return orgId;
    }

    public void setOrgId(int orgId) {
        this.orgId = orgId;
    }

    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    public Date getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(Date requestDate) {
        this.requestDate = requestDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOrgName() {
        return orgName;
    }

    public void setOrgName(String orgName) {
        this.orgName = orgName;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public List<RequestItem> getItems() {
        return items;
    }

    public void setItems(List<RequestItem> items) {
        this.items = (items != null) ? items : new ArrayList<>();
    }

    public void addItem(RequestItem item) {
        if (item != null) {
            this.items.add(item);
        }
    }

    public boolean isApproved() {
        return "Approved".equalsIgnoreCase(status);
    }

    public boolean isFulfilled() {
        return "Fulfilled".equalsIgnoreCase(status);
    }

    @Override
    public String toString() {
        return "Request #" + requestId + " from " + (orgName != null ? orgName : "Org #" + orgId) 
                + " [" + status + " - " + requestDate + "]";
    }
}
