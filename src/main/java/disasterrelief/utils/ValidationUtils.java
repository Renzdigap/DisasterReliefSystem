package disasterrelief.utils;

/**
 * Utility functions for validating user inputs and form fields.
 */
public class ValidationUtils {

    public static boolean isEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }

    public static boolean isNumeric(String str) {
        if (isEmpty(str)) {
            return false;
        }
        try {
            Double.parseDouble(str.trim());
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public static boolean isInteger(String str) {
        if (isEmpty(str)) {
            return false;
        }
        try {
            Integer.parseInt(str.trim());
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public static boolean isValidEmail(String email) {
        if (isEmpty(email)) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }

    /**
     * Validates contact / telephone numbers.
     * Supports standard formats including Philippine mobile/landlines, international format with +,
     * parentheses, hyphens, and spaces. Ensures length is between 7 and 15 digits.
     */
    public static boolean isValidContactNumber(String contact) {
        if (isEmpty(contact)) {
            return false;
        }
        String trimmed = contact.trim();
        // Allowed characters: +, (, ), -, space, and digits
        if (!trimmed.matches("^[+]?[0-9\\s\\-\\(\\)]{7,25}$")) {
            return false;
        }
        String digits = trimmed.replaceAll("[^0-9]", "");
        return digits.length() >= 7 && digits.length() <= 15;
    }
}
