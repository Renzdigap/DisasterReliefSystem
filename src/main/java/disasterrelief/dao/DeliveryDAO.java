package disasterrelief.dao;
import disasterrelief.model.Delivery;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DeliveryDAO {
    public List<Delivery> getAllDeliveries() {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location " +
                     "FROM Delivery d " +
                     "LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id " +
                     "LEFT JOIN UserAccount u ON v.user_id = u.user_id " +
                     "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                     "JOIN Organization o ON r.org_id = o.org_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Delivery del = new Delivery(
                    rs.getInt("delivery_id"), rs.getInt("request_id"), (Integer) rs.getObject("volunteer_id"), 
                    rs.getDate("dispatch_date"), rs.getString("delivery_status")
                );
                del.setVolunteerName(rs.getString("volunteer_name"));
                del.setOrgName(rs.getString("org_name"));
                del.setLocation(rs.getString("location"));
                list.add(del);
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
    public List<Delivery> getDeliveriesByUserId(int userId) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location " +
                     "FROM Delivery d " +
                     "JOIN Volunteer v ON d.volunteer_id = v.volunteer_id " +
                     "JOIN UserAccount u ON v.user_id = u.user_id " +
                     "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                     "JOIN Organization o ON r.org_id = o.org_id " +
                     "WHERE v.user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Delivery del = new Delivery(
                        rs.getInt("delivery_id"), rs.getInt("request_id"), rs.getInt("volunteer_id"), 
                        rs.getDate("dispatch_date"), rs.getString("delivery_status")
                    );
                    del.setVolunteerName(rs.getString("volunteer_name"));
                    del.setOrgName(rs.getString("org_name"));
                    del.setLocation(rs.getString("location"));
                    list.add(del);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean insertDelivery(int requestId, Integer volunteerId, Date dispatchDate, String deliveryStatus) {
        String sql = "INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, requestId);
            if (volunteerId != null) stmt.setInt(2, volunteerId);
            else stmt.setNull(2, Types.INTEGER);
            stmt.setDate(3, dispatchDate);
            stmt.setString(4, deliveryStatus);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateDeliveryStatus(int deliveryId, String status) {
        String sql = "UPDATE Delivery SET delivery_status = ? WHERE delivery_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setInt(2, deliveryId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteDelivery(int deliveryId) {
        String sql = "DELETE FROM Delivery WHERE delivery_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, deliveryId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public List<Delivery> searchDeliveries(String keyword) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location " +
                     "FROM Delivery d " +
                     "LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id " +
                     "LEFT JOIN UserAccount u ON v.user_id = u.user_id " +
                     "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                     "JOIN Organization o ON r.org_id = o.org_id " +
                     "WHERE o.org_name ILIKE ? OR o.location ILIKE ? OR d.delivery_status ILIKE ? OR u.full_name ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            stmt.setString(4, pattern);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Delivery del = new Delivery(
                        rs.getInt("delivery_id"), rs.getInt("request_id"), (Integer) rs.getObject("volunteer_id"), 
                        rs.getDate("dispatch_date"), rs.getString("delivery_status")
                    );
                    del.setVolunteerName(rs.getString("volunteer_name"));
                    del.setOrgName(rs.getString("org_name"));
                    del.setLocation(rs.getString("location"));
                    list.add(del);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}
