package disasterrelief.dao;
import disasterrelief.model.Inventory;
import disasterrelief.database.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class InventoryDAO {
    public List<Inventory> getFullInventory() {
        List<Inventory> list = new ArrayList<>();
        String sql = "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure " +
                     "FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(new Inventory(
                    rs.getInt("inventory_id"), rs.getInt("good_id"), rs.getInt("current_stock"),
                    rs.getString("item_name"), rs.getString("category"), rs.getString("unit_of_measure")
                ));
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }

    public boolean insertInventoryItem(String name, String category, String unit, int initialStock) {
        String sqlGood = "INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES (?, ?, ?) RETURNING good_id";
        String sqlInv = "INSERT INTO Inventory (good_id, current_stock) VALUES (?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmtGood = conn.prepareStatement(sqlGood);
             PreparedStatement stmtInv = conn.prepareStatement(sqlInv)) {
            
            stmtGood.setString(1, name);
            stmtGood.setString(2, category);
            stmtGood.setString(3, unit);
            // using executeQuery because of RETURNING
            try (java.sql.ResultSet rs = stmtGood.executeQuery()) {
                if (rs.next()) {
                    int goodId = rs.getInt(1);
                    stmtInv.setInt(1, goodId);
                    stmtInv.setInt(2, initialStock);
                    return stmtInv.executeUpdate() > 0;
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateInventoryStock(int goodId, int currentStock) {
        String sql = "UPDATE Inventory SET current_stock = ? WHERE good_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, currentStock);
            stmt.setInt(2, goodId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteInventory(int goodId) {
        String sql = "DELETE FROM ReliefGood WHERE good_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, goodId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean updateStockByInventoryId(int inventoryId, int newStock) {
        String sql = "UPDATE Inventory SET current_stock = ? WHERE inventory_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, newStock);
            stmt.setInt(2, inventoryId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public boolean deleteByInventoryId(int inventoryId) {
        String sql = "DELETE FROM ReliefGood WHERE good_id = (SELECT good_id FROM Inventory WHERE inventory_id = ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, inventoryId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) { e.printStackTrace(); }
        return false;
    }

    public List<Inventory> searchInventory(String keyword) {
        List<Inventory> list = new ArrayList<>();
        String sql = "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure " +
                     "FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id " +
                     "WHERE r.item_name ILIKE ? OR r.category ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new Inventory(
                        rs.getInt("inventory_id"), rs.getInt("good_id"), rs.getInt("current_stock"),
                        rs.getString("item_name"), rs.getString("category"), rs.getString("unit_of_measure")
                    ));
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return list;
    }
}

