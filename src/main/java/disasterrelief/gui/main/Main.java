package disasterrelief.gui.main;

import disasterrelief.database.DatabaseConnection;

import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.JOptionPane;
import java.sql.Connection;

/**
 * Enterprise Application Entry Point for the unified Disaster Relief System.
 * Architecture: MVC / Service-Oriented Architecture (SOA)
 * Enforces strict DAO-based data access.
 */
public class Main {
    public static void main(String[] args) {
        // 1. Initialize Database Connection Pool & Verify Integrity
        try {
            Connection testConn = DatabaseConnection.getConnection();
            if (testConn != null) {
                testConn.close();
                System.out.println("[NDRDMS] Boot Sequence: PostgreSQL Connection Pool Initialized Successfully.");
            }
        } catch (Exception e) {
            System.err.println("[NDRDMS] FATAL: Database connectivity failed. " + e.getMessage());
            JOptionPane.showMessageDialog(null, 
                "FATAL ERROR: Could not connect to the PostgreSQL database.\nPlease verify your internet connection or contact the system administrator.", 
                "System Initialization Error", JOptionPane.ERROR_MESSAGE);
            System.exit(1);
        }

        // 2. Apply Global System Look and Feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
            // Fallback to default Metal/Ocean
        }

        // 3. Launch Secure Login Portal
        SwingUtilities.invokeLater(() -> {
            LoginFrame login = new LoginFrame();
            login.setVisible(true);
        });
    }
}
