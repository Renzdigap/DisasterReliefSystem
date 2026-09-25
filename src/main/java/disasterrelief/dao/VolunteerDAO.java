package disasterrelief.dao;
import disasterrelief.model.Volunteer;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class VolunteerDAO {
    public List<Volunteer> getAllVolunteers() {
        List<Volunteer> list = new ArrayList<>();
        String sql = "SELECT v.*, u.full_name as volunteer_name FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new Volunteer(
                    rs.getInt("volunteer_id"), rs.getInt("user_id"), rs.getString("vehicle_type"), rs.getBoolean("is_available"), rs.getString("volunteer_name")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public Volunteer getVolunteerByUserId(int userId) {
        String sql = "SELECT v.*, u.full_name as volunteer_name FROM Volunteer v " +
                     "JOIN UserAccount u ON v.user_id = u.user_id WHERE v.user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Volunteer(
                        rs.getInt("volunteer_id"), rs.getInt("user_id"), rs.getString("vehicle_type"),
                        rs.getBoolean("is_available"), rs.getString("volunteer_name")
                    );
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    public boolean updateVolunteerAvailability(int userId, boolean isAvailable) {
        String sql = "UPDATE Volunteer SET is_available = ? WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBoolean(1, isAvailable);
            stmt.setInt(2, userId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateVolunteer(int userId, String vehicleType, boolean isAvailable) {
        String sql = "UPDATE Volunteer SET vehicle_type = ?, is_available = ? WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, vehicleType);
            stmt.setBoolean(2, isAvailable);
            stmt.setInt(3, userId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean saveOrUpdateVolunteer(int userId, String vehicleType, boolean isAvailable) {
        // PostgreSQL ON CONFLICT statement for UPSERT
        String sql = "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES (?, ?, ?) " +
                     "ON CONFLICT (user_id) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type, is_available = EXCLUDED.is_available";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            stmt.setString(2, vehicleType);
            stmt.setBoolean(3, isAvailable);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }
}
