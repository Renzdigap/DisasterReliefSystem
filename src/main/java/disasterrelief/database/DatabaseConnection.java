package disasterrelief.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    // Supabase PostgreSQL Connection details using connection pooler
    private static final String HOST = "aws-0-ap-northeast-2.pooler.supabase.com";
    private static final String PORT = "6543";
    private static final String DB_NAME = "postgres";
    private static final String USER = "postgres.jkhvrohsrihmkyxzrhyw";
    private static final String PASS = "DisasterReliefSystem";
    
    private static final String URL = "jdbc:postgresql://" + HOST + ":" + PORT + "/" + DB_NAME;

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
