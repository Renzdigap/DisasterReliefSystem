package disasterrelief.dao;
import disasterrelief.model.RequestItem;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class RequestItemDAO {
    public List<RequestItem> getItemsByRequestId(int requestId) {
        List<RequestItem> list = new ArrayList<>();
        String sql = "SELECT ri.*, r.item_name, r.category, r.unit_of_measure " +
                     "FROM RequestItem ri JOIN ReliefGood r ON ri.good_id = r.good_id " +
                     "WHERE ri.request_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, requestId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new RequestItem(
                        rs.getInt("request_item_id"), rs.getInt("request_id"), rs.getInt("good_id"), rs.getInt("quantity"),
                        rs.getString("item_name"), rs.getString("category"), rs.getString("unit_of_measure")
                    ));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean insertRequestItem(int requestId, int goodId, int quantity) {
        String sql = "INSERT INTO RequestItem (request_id, good_id, quantity) VALUES (?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, requestId);
            stmt.setInt(2, goodId);
            stmt.setInt(3, quantity);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); return false; }
    }
}
