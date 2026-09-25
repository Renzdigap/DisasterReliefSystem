package disasterrelief.dao;
import disasterrelief.model.DisasterEvent;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DisasterEventDAO {
    public List<DisasterEvent> getAllEvents() {
        List<DisasterEvent> list = new ArrayList<>();
        String sql = "SELECT * FROM DisasterEvent";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new DisasterEvent(
                    rs.getInt("event_id"), rs.getString("event_name"), rs.getString("location"), rs.getString("status"), rs.getDate("start_date")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean insertEvent(String eventName, String location, String status, Date startDate) {
        String sql = "INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, eventName);
            stmt.setString(2, location);
            stmt.setString(3, status);
            stmt.setDate(4, startDate);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateEventStatus(int eventId, String status) {
        String sql = "UPDATE DisasterEvent SET status = ? WHERE event_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setInt(2, eventId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteEvent(int eventId) {
        String sql = "DELETE FROM DisasterEvent WHERE event_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, eventId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public List<DisasterEvent> searchEvents(String keyword) {
        List<DisasterEvent> list = new ArrayList<>();
        String sql = "SELECT * FROM DisasterEvent WHERE event_name ILIKE ? OR location ILIKE ? OR status ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new DisasterEvent(
                        rs.getInt("event_id"), rs.getString("event_name"), rs.getString("location"),
                        rs.getString("status"), rs.getDate("start_date")
                    ));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}
