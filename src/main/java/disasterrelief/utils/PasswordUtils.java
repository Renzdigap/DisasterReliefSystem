package disasterrelief.utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Utility for SHA-256 cryptographic hashing and password verification.
 */
public class PasswordUtils {

    // Default system seed credentials
    public static final String DEFAULT_ADMIN_USERNAME = "admin";
    public static final String DEFAULT_ADMIN_PASSWORD = "admin123";
    public static final String DEFAULT_ADMIN_HASH = hashPassword(DEFAULT_ADMIN_PASSWORD);

    /**
     * Hashes a plain-text password using SHA-256 and encodes to Base64.
     *
     * @param password Plain-text password
     * @return Base64-encoded SHA-256 hash
     */
    public static String hashPassword(String password) {
        if (password == null) {
            throw new IllegalArgumentException("Password cannot be null");
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available in JVM environment", e);
        }
    }

    /**
     * Verifies a plain-text password against a stored SHA-256 Base64 hash.
     *
     * @param password Plain-text password entered by user
     * @param storedHash The hashed password stored in the database
     * @return true if password matches the hash, false otherwise
     */
    public static boolean verifyPassword(String password, String storedHash) {
        if (password == null || storedHash == null) {
            return false;
        }
        return hashPassword(password).equals(storedHash);
    }
}
