package disasterrelief.model;

import java.io.Serializable;
import java.sql.Timestamp;

/**
 * Domain entity model representing a user account in the Disaster Relief System.
 */
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private int userId;
    private String username;
    private String passwordHash;
    private String fullName;
    private String role;
    private String contactInfo;
    private String email;
    private Timestamp createdAt;

    public User() {
    }

    public User(int userId, String username, String passwordHash, String fullName, String role, String contactInfo) {
        this.userId = userId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.role = role;
        this.contactInfo = contactInfo;
    }

    // Getters and Setters
    public int getUserId() {
        return userId;
    }

    public int getId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
    }

    // Compatibility alias for contactNumber
    public String getContactNumber() {
        return contactInfo;
    }

    public void setContactNumber(String contactNumber) {
        this.contactInfo = contactNumber;
    }

    public String getEmail() {
        return email != null ? email : contactInfo;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isAdmin() {
        return "Admin".equalsIgnoreCase(role);
    }

    public boolean isDonor() {
        return "Donor".equalsIgnoreCase(role);
    }

    public boolean isVolunteer() {
        return "Volunteer".equalsIgnoreCase(role);
    }

    public boolean isOrganization() {
        return "Organization".equalsIgnoreCase(role);
    }

    @Override
    public String toString() {
        return fullName + " (" + username + " - " + role + ")";
    }
}
