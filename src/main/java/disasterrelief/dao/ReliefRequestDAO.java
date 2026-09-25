package disasterrelief.dao;
import disasterrelief.model.ReliefRequest;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReliefRequestDAO {
    public List<ReliefRequest> getAllRequests() {
        List<ReliefRequest> list = new ArrayList<>();
        String sql = "SELECT r.*, o.org_name, e.event_name " +
                     "FROM ReliefRequest r " +
                     "JOIN Organization o ON r.org_id = o.org_id " +
                     "JOIN DisasterEvent e ON r.event_id = e.event_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                ReliefRequest req = new ReliefRequest(
                    rs.getInt("request_id"), rs.getInt("org_id"), rs.getInt("event_id"), 
                    rs.getDate("request_date"), rs.getString("status")
                );
                req.setOrgName(rs.getString("org_name"));
                req.setEventName(rs.getString("event_name"));
                list.add(req);
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public int insertRequest(int orgId, int eventId, java.sql.Date requestDate) {
        String sql = "INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES (?, ?, ?, 'Pending') RETURNING request_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, orgId);
            stmt.setInt(2, eventId);
            stmt.setDate(3, requestDate);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return -1;
    }
    public List<ReliefRequest> getRequestsByUserId(int userId) {
        List<ReliefRequest> list = new ArrayList<>();
        String sql = "SELECT r.*, o.org_name, e.event_name " +
                     "FROM ReliefRequest r " +
                     "JOIN Organization o ON r.org_id = o.org_id " +
                     "JOIN DisasterEvent e ON r.event_id = e.event_id " +
                     "WHERE o.user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ReliefRequest req = new ReliefRequest(
                        rs.getInt("request_id"), rs.getInt("org_id"), rs.getInt("event_id"), 
                        rs.getDate("request_date"), rs.getString("status")
                    );
                    req.setOrgName(rs.getString("org_name"));
                    req.setEventName(rs.getString("event_name"));
                    list.add(req);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean updateRequestStatus(int requestId, String status) {
        String sql = "UPDATE ReliefRequest SET status = ? WHERE request_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setInt(2, requestId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteRequest(int requestId) {
        String sql = "DELETE FROM ReliefRequest WHERE request_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, requestId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public List<ReliefRequest> searchRequests(String keyword) {
        List<ReliefRequest> list = new ArrayList<>();
        String sql = "SELECT r.*, o.org_name, e.event_name " +
                     "FROM ReliefRequest r " +
                     "JOIN Organization o ON r.org_id = o.org_id " +
                     "JOIN DisasterEvent e ON r.event_id = e.event_id " +
                     "WHERE o.org_name ILIKE ? OR e.event_name ILIKE ? OR r.status ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ReliefRequest req = new ReliefRequest(
                        rs.getInt("request_id"), rs.getInt("org_id"), rs.getInt("event_id"), 
                        rs.getDate("request_date"), rs.getString("status")
                    );
                    req.setOrgName(rs.getString("org_name"));
                    req.setEventName(rs.getString("event_name"));
                    list.add(req);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}
