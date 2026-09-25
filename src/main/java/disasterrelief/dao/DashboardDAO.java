package disasterrelief.dao;

import disasterrelief.database.DatabaseConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * Data Access Object dedicated to high-level system dashboard analytics and real-time count aggregations.
 */
public class DashboardDAO {

    /**
     * Executes all core count queries and returns a consolidated map of metrics.
     *
     * @return Map containing metric names and their real-time counts
     */
    public Map<String, Integer> getDashboardMetrics() {
        Map<String, Integer> metrics = new HashMap<>();
        metrics.put("activeDisasters", getActiveDisastersCount());
        metrics.put("totalDonations", getTotalDonationsCount());
        metrics.put("pendingRequests", getPendingRequestsCount());
        metrics.put("registeredVolunteers", getRegisteredVolunteersCount());
        return metrics;
    }

    /**
     * Retrieves the count of currently active and monitored disaster events.
     */
    public int getActiveDisastersCount() {
        return executeCountQuery("SELECT COUNT(*) FROM DisasterEvent WHERE status = 'Active'");
    }

    /**
     * Retrieves the total number of logged contributions/donations in the system.
     */
    public int getTotalDonationsCount() {
        return executeCountQuery("SELECT COUNT(*) FROM Donation");
    }

    /**
     * Retrieves the number of relief requests awaiting approval or dispatch.
     */
    public int getPendingRequestsCount() {
        return executeCountQuery("SELECT COUNT(*) FROM ReliefRequest WHERE status = 'Pending'");
    }

    /**
     * Retrieves the count of registered field volunteers in the system.
     */
    public int getRegisteredVolunteersCount() {
        return executeCountQuery("SELECT COUNT(*) FROM Volunteer");
    }

    /**
     * Retrieves the count of fulfilled/delivered dispatches.
     */
    public int getCompletedDeliveriesCount() {
        return executeCountQuery("SELECT COUNT(*) FROM Delivery WHERE delivery_status = 'Delivered'");
    }

    /**
     * Retrieves the total count of relief goods catalog items.
     */
    public int getReliefGoodsCount() {
        return executeCountQuery("SELECT COUNT(*) FROM ReliefGood");
    }

    /**
     * Helper method to execute standard COUNT(*) aggregate queries against PostgreSQL.
     */
    private int executeCountQuery(String sql) {
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.err.println("DashboardDAO query error for [" + sql + "]: " + e.getMessage());
        }
        return 0;
    }
}
