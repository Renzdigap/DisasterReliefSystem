package disasterrelief.dao;
import disasterrelief.model.User;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class UserDAO {
    public List<User> getAllUsers() {
        List<User> list = new ArrayList<>();
        String sql = "SELECT * FROM UserAccount";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new User(
                    rs.getInt("user_id"), rs.getString("username"), rs.getString("password_hash"),
                    rs.getString("full_name"), rs.getString("role"), rs.getString("contact_info")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
    public User getUserByUsername(String username) {
        String sql = "SELECT * FROM UserAccount WHERE username = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new User(
                        rs.getInt("user_id"), rs.getString("username"), rs.getString("password_hash"),
                        rs.getString("full_name"), rs.getString("role"), rs.getString("contact_info")
                    );
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    public User getUserById(int userId) {
        String sql = "SELECT * FROM UserAccount WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new User(
                        rs.getInt("user_id"), rs.getString("username"), rs.getString("password_hash"),
                        rs.getString("full_name"), rs.getString("role"), rs.getString("contact_info")
                    );
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    public boolean updateContactInfo(int userId, String contactInfo) {
        String sql = "UPDATE UserAccount SET contact_info = ? WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, contactInfo);
            stmt.setInt(2, userId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateUserProfile(int userId, String fullName, String contactInfo) {
        String sql = "UPDATE UserAccount SET full_name = ?, contact_info = ? WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, fullName);
            stmt.setString(2, contactInfo);
            stmt.setInt(3, userId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }
}
