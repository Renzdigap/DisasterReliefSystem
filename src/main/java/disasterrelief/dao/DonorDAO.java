package disasterrelief.dao;
import disasterrelief.model.Donor;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DonorDAO {
    public List<Donor> getAllDonors() {
        List<Donor> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as donor_name FROM Donor d JOIN UserAccount u ON d.user_id = u.user_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new Donor(
                    rs.getInt("donor_id"), rs.getInt("user_id"), rs.getString("donor_type"), rs.getString("donor_name")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public Donor getDonorByUserId(int userId) {
        String sql = "SELECT * FROM Donor WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Donor(rs.getInt("donor_id"), rs.getInt("user_id"), rs.getString("donor_type"), null);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }
}

