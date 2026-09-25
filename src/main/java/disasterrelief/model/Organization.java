package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing an Organization in the 13-table schema.
 * Maps to the 'Organization' database table.
 */
public class Organization implements Serializable {
    private static final long serialVersionUID = 1L;

    private int orgId;
    private int userId;
    private String orgName;
    private String location;

    public Organization() {
    }

    public Organization(int orgId, int userId, String orgName, String location) {
        this.orgId = orgId;
        this.userId = userId;
        this.orgName = orgName;
        this.location = location;
    }

    public int getOrgId() {
        return orgId;
    }

    public void setOrgId(int orgId) {
        this.orgId = orgId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
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

    @Override
    public String toString() {
        return orgName + " (" + location + ")";
    }
}
