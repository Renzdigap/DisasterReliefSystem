package disasterrelief.model;

import java.io.Serializable;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a Donation transaction event in the 13-table schema.
 * Maps to the 'Donation' database table.
 */
public class Donation implements Serializable {
    private static final long serialVersionUID = 1L;

    private int donationId;
    private int donorId;
    private Integer eventId; // Nullable for general fund donations
    private Date donationDate;
    private String status; // 'Pending', 'Approved'

    // Joined helper fields
    private String donorName;
    private String eventName;
    private List<DonationItem> items = new ArrayList<>();

    public Donation() {
    }

    public Donation(int donationId, int donorId, Integer eventId, Date donationDate, String status) {
        this.donationId = donationId;
        this.donorId = donorId;
        this.eventId = eventId;
        this.donationDate = donationDate;
        this.status = status;
    }

    public int getDonationId() {
        return donationId;
    }

    public void setDonationId(int donationId) {
        this.donationId = donationId;
    }

    public int getDonorId() {
        return donorId;
    }

    public void setDonorId(int donorId) {
        this.donorId = donorId;
    }

    public Integer getEventId() {
        return eventId;
    }

    public void setEventId(Integer eventId) {
        this.eventId = eventId;
    }

    public Date getDonationDate() {
        return donationDate;
    }

    public void setDonationDate(Date donationDate) {
        this.donationDate = donationDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDonorName() {
        return donorName;
    }

    public void setDonorName(String donorName) {
        this.donorName = donorName;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public List<DonationItem> getItems() {
        return items;
    }

    public void setItems(List<DonationItem> items) {
        this.items = (items != null) ? items : new ArrayList<>();
    }

    public void addItem(DonationItem item) {
        if (item != null) {
            this.items.add(item);
        }
    }

    public boolean isApproved() {
        return "Approved".equalsIgnoreCase(status);
    }

    @Override
    public String toString() {
        return "Donation #" + donationId + " by " + (donorName != null ? donorName : "Donor #" + donorId) 
                + " [" + status + " - " + donationDate + "]";
    }
}
