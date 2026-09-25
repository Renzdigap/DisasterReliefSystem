package disasterrelief.dao;
import disasterrelief.model.Notification;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class NotificationDAO {
    public List<Notification> getNotificationsForUser(int userId) {
        List<Notification> list = new ArrayList<>();
        String sql = "SELECT * FROM Notification WHERE user_id = ? ORDER BY date_sent DESC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new Notification(
                        rs.getInt("notification_id"), rs.getInt("user_id"), rs.getString("message"),
                        rs.getBoolean("is_read"), rs.getTimestamp("date_sent")
                    ));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public List<Notification> getAllNotifications() {
        List<Notification> list = new ArrayList<>();
        String sql = "SELECT * FROM Notification ORDER BY date_sent DESC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new Notification(
                    rs.getInt("notification_id"), rs.getInt("user_id"), rs.getString("message"),
                    rs.getBoolean("is_read"), rs.getTimestamp("date_sent")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
    
    public void markAsRead(int notificationId) {
        String sql = "UPDATE Notification SET is_read = true WHERE notification_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, notificationId);
            stmt.executeUpdate();
        } catch (SQLException e) { e.printStackTrace(); }
    }
}
