package disasterrelief.dao;
import disasterrelief.model.Organization;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class OrganizationDAO {
    public List<Organization> getAllOrganizations() {
        List<Organization> list = new ArrayList<>();
        String sql = "SELECT * FROM Organization";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new Organization(
                    rs.getInt("org_id"), rs.getInt("user_id"), rs.getString("org_name"), rs.getString("location")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public Organization getOrganizationByUserId(int userId) {
        String sql = "SELECT * FROM Organization WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Organization(rs.getInt("org_id"), rs.getInt("user_id"), rs.getString("org_name"), rs.getString("location"));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }
}

