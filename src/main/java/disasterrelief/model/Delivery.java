package disasterrelief.model;

import java.io.Serializable;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a dispatch and delivery assignment for an approved relief request.
 * Maps to the 'Delivery' database table.
 */
public class Delivery implements Serializable {
    private static final long serialVersionUID = 1L;

    private int deliveryId;
    private int requestId;
    private Integer volunteerId; // Nullable until assigned
    private Date dispatchDate;
    private String deliveryStatus; // 'Pending', 'In Transit', 'Delivered'

    // Joined helper fields
    private String volunteerName;
    private String volunteerContact;
    private String vehicleType;
    private String orgName;
    private String location;
    private String eventName;
    private List<RequestItem> items = new ArrayList<>();

    public Delivery() {
    }

    public Delivery(int deliveryId, int requestId, Integer volunteerId, Date dispatchDate, String deliveryStatus) {
        this.deliveryId = deliveryId;
        this.requestId = requestId;
        this.volunteerId = volunteerId;
        this.dispatchDate = dispatchDate;
        this.deliveryStatus = deliveryStatus;
    }

    public int getDeliveryId() {
        return deliveryId;
    }

    public void setDeliveryId(int deliveryId) {
        this.deliveryId = deliveryId;
    }

    public int getRequestId() {
        return requestId;
    }

    public void setRequestId(int requestId) {
        this.requestId = requestId;
    }

    public Integer getVolunteerId() {
        return volunteerId;
    }

    public void setVolunteerId(Integer volunteerId) {
        this.volunteerId = volunteerId;
    }

    public Date getDispatchDate() {
        return dispatchDate;
    }

    public void setDispatchDate(Date dispatchDate) {
        this.dispatchDate = dispatchDate;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
    }

    public String getVolunteerName() {
        return volunteerName;
    }

    public void setVolunteerName(String volunteerName) {
        this.volunteerName = volunteerName;
    }

    public String getVolunteerContact() {
        return volunteerContact;
    }

    public void setVolunteerContact(String volunteerContact) {
        this.volunteerContact = volunteerContact;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getOrgName() {
        return orgName;
    }

    public void setOrgName(String orgName) {
        this.orgName = orgName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
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
        this.items = items != null ? items : new ArrayList<>();
    }

    public boolean isDelivered() {
        return "Delivered".equalsIgnoreCase(deliveryStatus);
    }

    public boolean isInTransit() {
        return "In Transit".equalsIgnoreCase(deliveryStatus);
    }

    @Override
    public String toString() {
        return "Delivery " + deliveryId + " for Request " + requestId
                + " [" + deliveryStatus + " - " + (volunteerName != null ? volunteerName : "Unassigned") + "]";
    }
}
