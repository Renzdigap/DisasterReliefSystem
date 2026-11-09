package disasterrelief.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    // Supports environment variables for Render/production deployment with fallback to Supabase Pooler
    private static final String HOST = getEnvOrDefault("DB_HOST", "aws-0-ap-northeast-2.pooler.supabase.com");
    private static final String PORT = getEnvOrDefault("DB_PORT", "6543");
    private static final String DB_NAME = getEnvOrDefault("DB_NAME", "postgres");
    private static final String USER = getEnvOrDefault("DB_USER", "postgres.jkhvrohsrihmkyxzrhyw");
    private static final String PASS = getEnvOrDefault("DB_PASS", "DisasterReliefSystem");

    // prepareThreshold=0 ensures compatibility with Supabase PgBouncer Transaction Pooler on port 6543
    private static final String URL = "jdbc:postgresql://" + HOST + ":" + PORT + "/" + DB_NAME + "?prepareThreshold=0&sslmode=require";

    private static String getEnvOrDefault(String key, String defaultValue) {
        String val = System.getenv(key);
        return (val != null && !val.trim().isEmpty()) ? val.trim() : defaultValue;
    }

    public static Connection getConnection() throws SQLException {
        try {
            Class.forName("org.postgresql.Driver");
            return DriverManager.getConnection(URL, USER, PASS);
        } catch (ClassNotFoundException e) {
            System.err.println("PostgreSQL JDBC Driver not found. Include it in your library path.");
            e.printStackTrace();
            throw new SQLException("Driver not found", e);
        }
    }
}
