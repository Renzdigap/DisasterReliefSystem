package disasterrelief.utils;

import disasterrelief.model.User;

/**
 * Manages the global application authentication state and active user session.
 */
public class SessionManager {
    private static User currentUser = null;
    private static long loginTimestamp = 0;

    /**
     * Sets the active authenticated user and records login timestamp.
     *
     * @param user The logged-in User entity
     */
    public static void setCurrentUser(User user) {
        currentUser = user;
        loginTimestamp = (user != null) ? System.currentTimeMillis() : 0;
    }

    /**
     * Gets the active authenticated user.
     *
     * @return Currently logged-in User or null if no active session
     */
    public static User getCurrentUser() {
        return currentUser;
    }

    /**
     * Terminates the current active session.
     */
    public static void logout() {
        currentUser = null;
        loginTimestamp = 0;
    }

    /**
     * Checks if a user is currently logged into the system.
     *
     * @return true if authenticated, false otherwise
     */
    public static boolean isLoggedIn() {
        return currentUser != null;
    }

    /**
     * Checks if the active user has Administrator privileges.
     *
     * @return true if active user is Admin
     */
    public static boolean isAdmin() {
        return currentUser != null && currentUser.isAdmin();
    }

    /**
     * Checks if the active user is a Donor.
     *
     * @return true if active user is Donor
     */
    public static boolean isDonor() {
        return currentUser != null && currentUser.isDonor();
    }

    /**
     * Checks if the active user is a Volunteer.
     *
     * @return true if active user is Volunteer
     */
    public static boolean isVolunteer() {
        return currentUser != null && currentUser.isVolunteer();
    }

    /**
     * Checks if the active user is an Organization.
     *
     * @return true if active user is Organization
     */
    public static boolean isOrganization() {
        return currentUser != null && currentUser.isOrganization();
    }

    /**
     * Returns the username of the active session.
     *
     * @return Username string or "Guest"
     */
    public static String getActiveUsername() {
        return currentUser != null ? currentUser.getUsername() : "Guest";
    }

    /**
     * Returns the role of the active session.
     *
     * @return Role string or "Guest"
     */
    public static String getActiveRole() {
        return currentUser != null ? currentUser.getRole() : "Guest";
    }

    /**
     * Returns the epoch timestamp of login.
     *
     * @return Milliseconds since epoch
     */
    public static long getLoginTimestamp() {
        return loginTimestamp;
    }
}
