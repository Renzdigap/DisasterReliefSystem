package disasterrelief.dao;
import disasterrelief.model.Donation;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DonationDAO {
    public List<Donation> getAllDonations() {
        List<Donation> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as donor_name, e.event_name " +
                     "FROM Donation d " +
                     "JOIN Donor dn ON d.donor_id = dn.donor_id " +
                     "JOIN UserAccount u ON dn.user_id = u.user_id " +
                     "LEFT JOIN DisasterEvent e ON d.event_id = e.event_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Donation don = new Donation(
                    rs.getInt("donation_id"), rs.getInt("donor_id"), (Integer) rs.getObject("event_id"), 
                    rs.getDate("donation_date"), rs.getString("status")
                );
                don.setDonorName(rs.getString("donor_name"));
                don.setEventName(rs.getString("event_name"));
                list.add(don);
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public int insertDonation(int donorId, Integer eventId, java.sql.Date donationDate) {
        String sql = "INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES (?, ?, ?, 'Pending') RETURNING donation_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, donorId);
            if (eventId != null) stmt.setInt(2, eventId);
            else stmt.setNull(2, java.sql.Types.INTEGER);
            stmt.setDate(3, donationDate);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return -1;
    }
    public List<Donation> getDonationsByUserId(int userId) {
        List<Donation> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as donor_name, e.event_name " +
                     "FROM Donation d " +
                     "JOIN Donor dn ON d.donor_id = dn.donor_id " +
                     "JOIN UserAccount u ON dn.user_id = u.user_id " +
                     "LEFT JOIN DisasterEvent e ON d.event_id = e.event_id " +
                     "WHERE dn.user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Donation don = new Donation(
                        rs.getInt("donation_id"), rs.getInt("donor_id"), (Integer) rs.getObject("event_id"), 
                        rs.getDate("donation_date"), rs.getString("status")
                    );
                    don.setDonorName(rs.getString("donor_name"));
                    don.setEventName(rs.getString("event_name"));
                    list.add(don);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean updateDonationStatus(int donationId, String status) {
        String sql = "UPDATE Donation SET status = ? WHERE donation_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setInt(2, donationId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteDonation(int donationId) {
        String sql = "DELETE FROM Donation WHERE donation_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, donationId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public List<Donation> searchDonations(String keyword) {
        List<Donation> list = new ArrayList<>();
        String sql = "SELECT d.*, u.full_name as donor_name, e.event_name " +
                     "FROM Donation d " +
                     "JOIN Donor dn ON d.donor_id = dn.donor_id " +
                     "JOIN UserAccount u ON dn.user_id = u.user_id " +
                     "LEFT JOIN DisasterEvent e ON d.event_id = e.event_id " +
                     "WHERE u.full_name ILIKE ? OR e.event_name ILIKE ? OR d.status ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Donation don = new Donation(
                        rs.getInt("donation_id"), rs.getInt("donor_id"), (Integer) rs.getObject("event_id"), 
                        rs.getDate("donation_date"), rs.getString("status")
                    );
                    don.setDonorName(rs.getString("donor_name"));
                    don.setEventName(rs.getString("event_name"));
                    list.add(don);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}
