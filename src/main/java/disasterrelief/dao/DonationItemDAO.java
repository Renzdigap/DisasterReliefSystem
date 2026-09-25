package disasterrelief.dao;
import disasterrelief.model.DonationItem;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DonationItemDAO {
    public List<DonationItem> getItemsByDonationId(int donationId) {
        List<DonationItem> list = new ArrayList<>();
        String sql = "SELECT di.*, r.item_name, r.category, r.unit_of_measure " +
                     "FROM DonationItem di JOIN ReliefGood r ON di.good_id = r.good_id " +
                     "WHERE di.donation_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, donationId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new DonationItem(
                        rs.getInt("item_id"), rs.getInt("donation_id"), rs.getInt("good_id"), rs.getInt("quantity"),
                        rs.getString("item_name"), rs.getString("category"), rs.getString("unit_of_measure")
                    ));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean insertDonationItem(int donationId, int goodId, int quantity) {
        String sql = "INSERT INTO DonationItem (donation_id, good_id, quantity) VALUES (?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, donationId);
            stmt.setInt(2, goodId);
            stmt.setInt(3, quantity);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); return false; }
    }
}
