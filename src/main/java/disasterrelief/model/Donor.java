package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing a Donor in the 13-table schema.
 * Maps to the 'Donor' database table.
 */
public class Donor implements Serializable {
    private static final long serialVersionUID = 1L;

    private int donorId;
    private int userId;
    private String donorType; // 'Individual', 'Corporate'

    // Optional joined helper field
    private String donorName;

    public Donor() {
    }

    public Donor(int donorId, int userId, String donorType) {
        this.donorId = donorId;
        this.userId = userId;
        this.donorType = donorType;
    }

    public Donor(int donorId, int userId, String donorType, String donorName) {
        this.donorId = donorId;
        this.userId = userId;
        this.donorType = donorType;
        this.donorName = donorName;
    }

    public int getDonorId() {
        return donorId;
    }

    public void setDonorId(int donorId) {
        this.donorId = donorId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getDonorType() {
        return donorType;
    }

    public void setDonorType(String donorType) {
        this.donorType = donorType;
    }

    public String getDonorName() {
        return donorName;
    }

    public void setDonorName(String donorName) {
        this.donorName = donorName;
    }

    @Override
    public String toString() {
        return (donorName != null ? donorName : "Donor #" + donorId) + " (" + donorType + ")";
    }
}
