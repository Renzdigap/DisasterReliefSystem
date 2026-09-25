package disasterrelief.service;

import disasterrelief.dao.UserDAO;
import disasterrelief.model.User;
import disasterrelief.utils.PasswordUtils;
import disasterrelief.utils.SessionManager;

public class AuthenticationService {
    
    private final UserDAO userDAO;
    
    public AuthenticationService() {
        this.userDAO = new UserDAO();
    }

    /**
     * Authenticates a user. If successful, sets the user in the SessionManager.
     * 
     * @param username The username attempting to log in.
     * @param password The raw text password.
     * @return true if authentication succeeds, false otherwise.
     * @throws Exception if a database or hashing error occurs.
     */
    public boolean login(String username, String password) throws Exception {
        User user = userDAO.getUserByUsername(username);
        
        if (user != null && PasswordUtils.verifyPassword(password, user.getPasswordHash())) {
            // Authentication successful, store the user globally
            SessionManager.setCurrentUser(user);
            return true;
        }
        
        return false;
    }
    
    /**
     * Logs the current user out.
     */
    public void logout() {
        SessionManager.logout();
    }
}
