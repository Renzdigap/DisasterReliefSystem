package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing a Volunteer in the 13-table schema.
 * Maps to the 'Volunteer' database table.
 */
public class Volunteer implements Serializable {
    private static final long serialVersionUID = 1L;

    private int volunteerId;
    private int userId;
    private String vehicleType;
    private boolean isAvailable;

    // Optional joined helper field
    private String volunteerName;

    public Volunteer() {
    }

    public Volunteer(int volunteerId, int userId, String vehicleType, boolean isAvailable) {
        this.volunteerId = volunteerId;
        this.userId = userId;
        this.vehicleType = vehicleType;
        this.isAvailable = isAvailable;
    }

    public Volunteer(int volunteerId, int userId, String vehicleType, boolean isAvailable, String volunteerName) {
        this.volunteerId = volunteerId;
        this.userId = userId;
        this.vehicleType = vehicleType;
        this.isAvailable = isAvailable;
        this.volunteerName = volunteerName;
    }

    public int getVolunteerId() {
        return volunteerId;
    }

    public void setVolunteerId(int volunteerId) {
        this.volunteerId = volunteerId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }

    public String getVolunteerName() {
        return volunteerName;
    }

    public void setVolunteerName(String volunteerName) {
        this.volunteerName = volunteerName;
    }

    @Override
    public String toString() {
        return (volunteerName != null ? volunteerName : "Volunteer #" + volunteerId) 
                + " [" + vehicleType + " - " + (isAvailable ? "Available" : "Busy") + "]";
    }
}
