package disasterrelief.dao;
import disasterrelief.model.ReliefGood;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReliefGoodDAO {
    public List<ReliefGood> getAllGoods() {
        List<ReliefGood> list = new ArrayList<>();
        String sql = "SELECT * FROM ReliefGood";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new ReliefGood(
                    rs.getInt("good_id"), rs.getString("item_name"), rs.getString("category"), rs.getString("unit_of_measure")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}
