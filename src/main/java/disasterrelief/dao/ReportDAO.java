package disasterrelief.dao;

import disasterrelief.database.DatabaseConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object providing high-level operational reporting and analytical summary queries
 * using multi-table SQL JOINs, GROUP BY aggregations, and business health metrics.
 */
public class ReportDAO {

    /**
     * Report 1: Disaster Relief Operational Summary
     * Aggregates active and past disaster operations with total donation counts, aid requests, and dispatches.
     */
    public List<Object[]> getDisasterOperationalSummary() {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT " +
                     "    e.event_id, " +
                     "    e.event_name, " +
                     "    e.location, " +
                     "    e.status, " +
                     "    COUNT(DISTINCT d.donation_id) AS total_donations, " +
                     "    COUNT(DISTINCT r.request_id) AS total_requests, " +
                     "    COUNT(DISTINCT del.delivery_id) AS total_deliveries " +
                     "FROM DisasterEvent e " +
                     "LEFT JOIN Donation d ON e.event_id = d.event_id " +
                     "LEFT JOIN ReliefRequest r ON e.event_id = r.event_id " +
                     "LEFT JOIN Delivery del ON r.request_id = del.request_id " +
                     "GROUP BY e.event_id, e.event_name, e.location, e.status " +
                     "ORDER BY e.event_id";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                    rs.getInt("event_id"),
                    rs.getString("event_name"),
                    rs.getString("location"),
                    rs.getString("status"),
                    rs.getInt("total_donations"),
                    rs.getInt("total_requests"),
                    rs.getInt("total_deliveries")
                });
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return report;
    }

    /**
     * Report 2: Inventory Stock Status & Replenishment Alert Report
     * Tracks warehouse inventory against cumulative donations and relief requests with stock health status.
     */
    public List<Object[]> getInventoryStockHealthReport() {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT " +
                     "    g.good_id, " +
                     "    g.item_name, " +
                     "    g.category, " +
                     "    g.unit_of_measure, " +
                     "    COALESCE(i.current_stock, 0) AS current_stock, " +
                     "    COALESCE(SUM(di.quantity), 0) AS total_donated_qty, " +
                     "    COALESCE(SUM(ri.quantity), 0) AS total_requested_qty, " +
                     "    CASE " +
                     "        WHEN COALESCE(i.current_stock, 0) <= 200 THEN 'CRITICAL ALERT' " +
                     "        WHEN COALESCE(i.current_stock, 0) <= 1000 THEN 'LOW STOCK' " +
                     "        ELSE 'SUFFICIENT' " +
                     "    END AS stock_health " +
                     "FROM ReliefGood g " +
                     "LEFT JOIN Inventory i ON g.good_id = i.good_id " +
                     "LEFT JOIN DonationItem di ON g.good_id = di.good_id " +
                     "LEFT JOIN RequestItem ri ON g.good_id = ri.good_id " +
                     "GROUP BY g.good_id, g.item_name, g.category, g.unit_of_measure, i.current_stock " +
                     "ORDER BY i.current_stock ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                    rs.getInt("good_id"),
                    rs.getString("item_name"),
                    rs.getString("category"),
                    rs.getInt("current_stock") + " " + rs.getString("unit_of_measure"),
                    rs.getInt("total_donated_qty"),
                    rs.getInt("total_requested_qty"),
                    rs.getString("stock_health")
                });
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return report;
    }

    /**
     * Report 3: Donor Contribution & Impact Audit Ledger
     * Analyzes donor participation, types, events supported, and volume of relief goods provided.
     */
    public List<Object[]> getDonorImpactLedger() {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT " +
                     "    dn.donor_id, " +
                     "    u.full_name AS donor_name, " +
                     "    dn.donor_type, " +
                     "    u.contact_info, " +
                     "    COUNT(DISTINCT d.donation_id) AS total_donations, " +
                     "    COUNT(DISTINCT d.event_id) AS events_supported, " +
                     "    COALESCE(SUM(di.quantity), 0) AS total_items_donated " +
                     "FROM Donor dn " +
                     "JOIN UserAccount u ON dn.user_id = u.user_id " +
                     "LEFT JOIN Donation d ON dn.donor_id = d.donor_id " +
                     "LEFT JOIN DonationItem di ON d.donation_id = di.donation_id " +
                     "GROUP BY dn.donor_id, u.full_name, dn.donor_type, u.contact_info " +
                     "ORDER BY total_donations DESC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                    rs.getInt("donor_id"),
                    rs.getString("donor_name"),
                    rs.getString("donor_type"),
                    rs.getString("contact_info"),
                    rs.getInt("total_donations"),
                    rs.getInt("events_supported"),
                    rs.getInt("total_items_donated")
                });
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return report;
    }
}
