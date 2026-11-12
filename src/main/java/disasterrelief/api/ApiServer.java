package disasterrelief.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import disasterrelief.database.DatabaseConnection;
import disasterrelief.model.*;
import disasterrelief.utils.PasswordUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Embedded Java HTTP REST Server for NDRDMS / DRRMS.
 * Connects Next.js TypeScript Frontend (Vercel) to Supabase PostgreSQL 15 via single-connection JDBC queries & atomic transactions.
 */
public class ApiServer {

    public static void main(String[] args) throws IOException {
        String portEnv = System.getenv("PORT");
        int port = (portEnv != null && !portEnv.isEmpty()) ? Integer.parseInt(portEnv) : 8080;

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newCachedThreadPool());

        server.createContext("/api/health", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                try (Connection conn = DatabaseConnection.getConnection();
                     PreparedStatement ps = conn.prepareStatement("SELECT 1");
                     ResultSet rs = ps.executeQuery()) {
                    sendJson(ex, 200, "{\"status\":\"ok\",\"database\":\"connected\",\"engine\":\"Java JDBC + Supabase PostgreSQL 15\"}");
                }
            }
        });

        server.createContext("/api/auth/login", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                String body = readBody(ex);
                String username = extractString(body, "username");
                String password = extractString(body, "password");

                if (isBlank(username) || isBlank(password)) {
                    sendJson(ex, 400, "{\"error\":\"Username and password are required.\"}");
                    return;
                }

                try (Connection conn = DatabaseConnection.getConnection()) {
                    String identifier = username.trim();
                    User user = null;
                    try (PreparedStatement ps = conn.prepareStatement(
                            "SELECT user_id, username, password_hash, full_name, role, contact_info, email, is_verified " +
                            "FROM UserAccount WHERE LOWER(username) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))")) {
                        ps.setString(1, identifier);
                        ps.setString(2, identifier);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) {
                                user = new User(
                                        rs.getInt("user_id"),
                                        rs.getString("username"),
                                        rs.getString("password_hash"),
                                        rs.getString("full_name"),
                                        rs.getString("role"),
                                        rs.getString("contact_info")
                                );
                                user.setEmail(rs.getString("email"));
                                user.setVerified(rs.getBoolean("is_verified"));
                            }
                        }
                    }

                    if (user == null) {
                        sendJson(ex, 401, "{\"error\":\"Invalid username or password.\"}");
                        return;
                    }

                    boolean valid = PasswordUtils.verifyPassword(password, user.getPasswordHash())
                            || password.equals(user.getPasswordHash());
                    if (!valid) {
                        sendJson(ex, 401, "{\"error\":\"Invalid username or password.\"}");
                        return;
                    }

                    if (!user.isVerified()) {
                        sendJson(ex, 403, "{\"error\":\"Please verify your email address before signing in.\"}");
                        return;
                    }

                    StringBuilder sb = new StringBuilder();
                    sb.append("{\"user\":").append(userToJson(user));

                    if ("Donor".equalsIgnoreCase(user.getRole())) {
                        Donor d = queryDonorByUserId(conn, user.getUserId());
                        if (d != null) {
                            sb.append(",\"donorId\":").append(d.getDonorId())
                              .append(",\"donorType\":").append(q(d.getDonorType()));
                        }
                    } else if ("Organization".equalsIgnoreCase(user.getRole())) {
                        Organization o = queryOrganizationByUserId(conn, user.getUserId());
                        if (o != null) {
                            sb.append(",\"orgId\":").append(o.getOrgId())
                              .append(",\"orgName\":").append(q(o.getOrgName()))
                              .append(",\"location\":").append(q(o.getLocation()));
                        }
                    } else if ("Volunteer".equalsIgnoreCase(user.getRole())) {
                        Volunteer v = queryVolunteerByUserId(conn, user.getUserId());
                        if (v != null) {
                            sb.append(",\"volunteerId\":").append(v.getVolunteerId())
                              .append(",\"vehicleType\":").append(q(v.getVehicleType()))
                              .append(",\"isAvailable\":").append(v.isAvailable());
                        }
                    }
                    sb.append("}");
                    sendJson(ex, 200, sb.toString());
                }
            }
        });

        server.createContext("/api/auth/register", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                String body = readBody(ex);
                String username = extractString(body, "username");
                String password = extractString(body, "password");
                String fullName = extractString(body, "fullName");
                String contactInfo = extractString(body, "contactInfo");
                String rawRole = extractString(body, "role");
                String donorType = extractString(body, "donorType");
                String orgName = extractString(body, "orgName");
                String location = extractString(body, "location");
                String vehicleType = extractString(body, "vehicleType");

                if (isBlank(username) || password == null || password.isEmpty() || isBlank(fullName) || isBlank(rawRole)) {
                    sendJson(ex, 400, "{\"error\":\"Missing required registration fields.\"}");
                    return;
                }
                if (password.length() < 4) {
                    sendJson(ex, 400, "{\"error\":\"Password must be at least 4 characters long.\"}");
                    return;
                }

                String role = normalizeSelfRegisterRole(rawRole);
                if (role == null) {
                    sendJson(ex, 400, "{\"error\":\"Self-registration is restricted to Donor, Organization, or Volunteer roles.\"}");
                    return;
                }

                String safeDonorType = "Corporate".equalsIgnoreCase(donorType) ? "Corporate" : "Individual";
                String trimmedUser = username.trim();
                String trimmedName = fullName.trim();
                String trimmedContact = contactInfo != null ? contactInfo.trim() : "";

                try (Connection conn = DatabaseConnection.getConnection()) {
                    conn.setAutoCommit(false);
                    try {
                        // Golden Record Duplicate Check
                        try (PreparedStatement dupUser = conn.prepareStatement("SELECT user_id FROM UserAccount WHERE LOWER(username) = LOWER(?)")) {
                            dupUser.setString(1, trimmedUser);
                            try (ResultSet rs = dupUser.executeQuery()) {
                                if (rs.next()) {
                                    conn.rollback();
                                    sendJson(ex, 409, "{\"error\":\"Username already exists in Master Registry.\"}");
                                    return;
                                }
                            }
                        }

                        if ("Organization".equals(role) && !isBlank(orgName)) {
                            try (PreparedStatement dupOrg = conn.prepareStatement("SELECT org_id FROM Organization WHERE LOWER(org_name) = LOWER(?)")) {
                                dupOrg.setString(1, orgName.trim());
                                try (ResultSet rs = dupOrg.executeQuery()) {
                                    if (rs.next()) {
                                        conn.rollback();
                                        sendJson(ex, 409, "{\"error\":\"Duplicate Organization detected in Master Data Registry.\"}");
                                        return;
                                    }
                                }
                            }
                        }

                        String hash = PasswordUtils.hashPassword(password);
                        int userId;
                        try (PreparedStatement insUser = conn.prepareStatement(
                                "INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES (?, ?, ?, ?, ?) RETURNING user_id")) {
                            insUser.setString(1, trimmedUser);
                            insUser.setString(2, hash);
                            insUser.setString(3, role);
                            insUser.setString(4, trimmedName);
                            insUser.setString(5, trimmedContact);
                            try (ResultSet rs = insUser.executeQuery()) {
                                rs.next();
                                userId = rs.getInt(1);
                            }
                        }

                        if ("Donor".equals(role)) {
                            try (PreparedStatement insDonor = conn.prepareStatement("INSERT INTO Donor (user_id, donor_type) VALUES (?, ?)")) {
                                insDonor.setInt(1, userId);
                                insDonor.setString(2, safeDonorType);
                                insDonor.executeUpdate();
                            }
                        } else if ("Organization".equals(role)) {
                            try (PreparedStatement insOrg = conn.prepareStatement("INSERT INTO Organization (user_id, org_name, location) VALUES (?, ?, ?)")) {
                                insOrg.setInt(1, userId);
                                insOrg.setString(2, !isBlank(orgName) ? orgName.trim() : trimmedName);
                                insOrg.setString(3, !isBlank(location) ? location.trim() : "City of Batac, Ilocos Norte");
                                insOrg.executeUpdate();
                            }
                        } else if ("Volunteer".equals(role)) {
                            try (PreparedStatement insVol = conn.prepareStatement("INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES (?, ?, true)")) {
                                insVol.setInt(1, userId);
                                insVol.setString(2, !isBlank(vehicleType) ? vehicleType.trim() : "Van");
                                insVol.executeUpdate();
                            }
                        }

                        try (PreparedStatement insNotif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                            insNotif.setInt(1, userId);
                            insNotif.setString(2, "Welcome to DRRMS! Your " + role + " account has been verified under RA 10173 Data Privacy guidelines.");
                            insNotif.executeUpdate();
                        }

                        conn.commit();
                        User created = new User(userId, trimmedUser, "", trimmedName, role, trimmedContact);
                        sendJson(ex, 201, "{\"user\":" + userToJson(created) + ",\"message\":\"Account registered successfully.\"}");
                    } catch (Exception e) {
                        conn.rollback();
                        throw e;
                    }
                }
            }
        });

        // Consolidated Admin Overview endpoint (Single connection, bulk queries, zero N+1)
        server.createContext("/api/admin/overview", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                try (Connection conn = DatabaseConnection.getConnection()) {
                    List<DisasterEvent> events = queryAllEvents(conn);
                    List<Inventory> inventory = queryFullInventory(conn);
                    List<ReliefGood> goods = queryAllGoods(conn);
                    List<Donation> donations = queryDonationsWithItems(conn, null);
                    List<ReliefRequest> requests = queryRequestsWithItems(conn, null);
                    List<Delivery> deliveries = queryDeliveries(conn, null);
                    List<Volunteer> volunteers = queryAllVolunteers(conn);
                    List<Organization> organizations = queryAllOrganizations(conn);
                    List<Donor> donors = queryAllDonors(conn);
                    List<User> users = queryAllUsers(conn);
                    List<Notification> notifications = queryNotifications(conn, null, 30);

                    List<Object[]> report1 = queryOperationalSummaryReport(conn);
                    List<Object[]> report2 = queryInventoryHealthReport(conn);
                    List<Object[]> report3 = queryDonorImpactReport(conn);

                    int activeDisasters = 0;
                    for (DisasterEvent ev : events) {
                        if ("Active".equalsIgnoreCase(ev.getStatus())) activeDisasters++;
                    }
                    int pendingRequests = 0;
                    for (ReliefRequest req : requests) {
                        if ("Pending".equalsIgnoreCase(req.getStatus())) pendingRequests++;
                    }
                    int completedDeliveries = 0;
                    for (Delivery del : deliveries) {
                        if ("Delivered".equalsIgnoreCase(del.getDeliveryStatus())) completedDeliveries++;
                    }

                    StringBuilder sb = new StringBuilder("{");
                    sb.append("\"metrics\":{")
                      .append("\"activeDisasters\":").append(activeDisasters).append(",")
                      .append("\"totalDonations\":").append(donations.size()).append(",")
                      .append("\"pendingRequests\":").append(pendingRequests).append(",")
                      .append("\"registeredVolunteers\":").append(volunteers.size()).append(",")
                      .append("\"completedDeliveries\":").append(completedDeliveries).append(",")
                      .append("\"reliefGoodsCount\":").append(goods.size())
                      .append("},");
                    sb.append("\"events\":").append(eventsToJson(events)).append(",");
                    sb.append("\"inventory\":").append(inventoryToJson(inventory)).append(",");
                    sb.append("\"goods\":").append(goodsToJson(goods)).append(",");
                    sb.append("\"donations\":").append(donationsToJson(donations)).append(",");
                    sb.append("\"requests\":").append(requestsToJson(requests)).append(",");
                    sb.append("\"deliveries\":").append(deliveriesToJson(deliveries)).append(",");
                    sb.append("\"volunteers\":").append(volunteersToJson(volunteers)).append(",");
                    sb.append("\"organizations\":").append(organizationsToJson(organizations)).append(",");
                    sb.append("\"donors\":").append(donorsToJson(donors)).append(",");
                    sb.append("\"users\":").append(usersToJson(users)).append(",");
                    sb.append("\"notifications\":").append(notificationsToJson(notifications)).append(",");
                    sb.append("\"reports\":{")
                      .append("\"operationalSummary\":").append(report1ToJson(report1)).append(",")
                      .append("\"inventoryHealth\":").append(report2ToJson(report2)).append(",")
                      .append("\"donorImpact\":").append(report3ToJson(report3))
                      .append("}");
                    sb.append("}");
                    sendJson(ex, 200, sb.toString());
                }
            }
        });

        // Donor Portal Data (Single connection, bulk queries)
        server.createContext("/api/portal/donor", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = parsePositiveInt(params.get("userId"), 0);

                try (Connection conn = DatabaseConnection.getConnection()) {
                    User user = queryUserById(conn, userId);
                    Donor donor = queryDonorByUserId(conn, userId);
                    List<Donation> myDonations = queryDonationsWithItems(conn, userId);
                    List<DisasterEvent> events = queryAllEvents(conn);
                    List<ReliefGood> goods = queryAllGoods(conn);
                    List<Inventory> inventory = queryFullInventory(conn);
                    List<Notification> notifications = queryNotifications(conn, userId, 50);

                    StringBuilder sb = new StringBuilder("{");
                    sb.append("\"user\":").append(userToJson(user)).append(",");
                    sb.append("\"donor\":").append(donor != null
                            ? "{\"donorId\":" + donor.getDonorId() + ",\"userId\":" + donor.getUserId() + ",\"donorType\":" + q(donor.getDonorType()) + "}"
                            : "null").append(",");
                    sb.append("\"donations\":").append(donationsToJson(myDonations)).append(",");
                    sb.append("\"events\":").append(eventsToJson(events)).append(",");
                    sb.append("\"goods\":").append(goodsToJson(goods)).append(",");
                    sb.append("\"inventory\":").append(inventoryToJson(inventory)).append(",");
                    sb.append("\"notifications\":").append(notificationsToJson(notifications));
                    sb.append("}");
                    sendJson(ex, 200, sb.toString());
                }
            }
        });

        // Organization Portal Data (Single connection, bulk queries)
        server.createContext("/api/portal/organization", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = parsePositiveInt(params.get("userId"), 0);

                try (Connection conn = DatabaseConnection.getConnection()) {
                    User user = queryUserById(conn, userId);
                    Organization org = queryOrganizationByUserId(conn, userId);
                    List<ReliefRequest> myRequests = queryRequestsWithItems(conn, userId);
                    List<Delivery> myDeliveries = queryDeliveriesForOrganizationUser(conn, userId);
                    List<DisasterEvent> events = queryAllEvents(conn);
                    List<ReliefGood> goods = queryAllGoods(conn);
                    List<Inventory> inventory = queryFullInventory(conn);
                    List<Notification> notifications = queryNotifications(conn, userId, 50);

                    StringBuilder sb = new StringBuilder("{");
                    sb.append("\"user\":").append(userToJson(user)).append(",");
                    sb.append("\"organization\":").append(org != null
                            ? "{\"orgId\":" + org.getOrgId() + ",\"userId\":" + org.getUserId() + ",\"orgName\":" + q(org.getOrgName()) + ",\"location\":" + q(org.getLocation()) + "}"
                            : "null").append(",");
                    sb.append("\"requests\":").append(requestsToJson(myRequests)).append(",");
                    sb.append("\"deliveries\":").append(deliveriesToJson(myDeliveries)).append(",");
                    sb.append("\"events\":").append(eventsToJson(events)).append(",");
                    sb.append("\"goods\":").append(goodsToJson(goods)).append(",");
                    sb.append("\"inventory\":").append(inventoryToJson(inventory)).append(",");
                    sb.append("\"notifications\":").append(notificationsToJson(notifications));
                    sb.append("}");
                    sendJson(ex, 200, sb.toString());
                }
            }
        });

        // Volunteer Portal Data (Single connection)
        server.createContext("/api/portal/volunteer", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = parsePositiveInt(params.get("userId"), 0);

                try (Connection conn = DatabaseConnection.getConnection()) {
                    User user = queryUserById(conn, userId);
                    Volunteer vol = queryVolunteerByUserId(conn, userId);
                    List<Delivery> myDeliveries = queryDeliveries(conn, userId);
                    List<DisasterEvent> events = queryAllEvents(conn);
                    List<Notification> notifications = queryNotifications(conn, userId, 50);

                    StringBuilder sb = new StringBuilder("{");
                    sb.append("\"user\":").append(userToJson(user)).append(",");
                    sb.append("\"volunteer\":").append(vol != null
                            ? "{\"volunteerId\":" + vol.getVolunteerId() + ",\"userId\":" + vol.getUserId()
                              + ",\"vehicleType\":" + q(vol.getVehicleType()) + ",\"isAvailable\":" + vol.isAvailable()
                              + ",\"volunteerName\":" + q(vol.getVolunteerName()) + "}"
                            : "null").append(",");
                    sb.append("\"deliveries\":").append(deliveriesToJson(myDeliveries)).append(",");
                    sb.append("\"events\":").append(eventsToJson(events)).append(",");
                    sb.append("\"notifications\":").append(notificationsToJson(notifications));
                    sb.append("}");
                    sendJson(ex, 200, sb.toString());
                }
            }
        });

        // Donations CRUD & Atomic Split-Transaction
        server.createContext("/api/donations", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int userId = extractInt(body, "userId", 0);
                    Integer eventId = extractNullableInt(body, "eventId");
                    List<int[]> items = mergeDuplicateItems(extractItemsArray(body));

                    if (userId <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid userId is required.\"}");
                        return;
                    }
                    if (items.isEmpty()) {
                        sendJson(ex, 400, "{\"error\":\"At least one valid donation item (quantity > 0) is required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            Donor donor = queryDonorByUserId(conn, userId);
                            if (donor == null) {
                                conn.rollback();
                                sendJson(ex, 400, "{\"error\":\"Donor profile not found for userId.\"}");
                                return;
                            }
                            if (eventId != null && eventId > 0) {
                                String evStatus = null;
                                try (PreparedStatement evPs = conn.prepareStatement("SELECT status FROM DisasterEvent WHERE event_id = ?")) {
                                    evPs.setInt(1, eventId);
                                    try (ResultSet rs = evPs.executeQuery()) {
                                        if (rs.next()) evStatus = rs.getString("status");
                                    }
                                }
                                if (evStatus == null) {
                                    conn.rollback();
                                    sendJson(ex, 400, "{\"error\":\"Selected disaster event does not exist.\"}");
                                    return;
                                }
                                if (!"Active".equalsIgnoreCase(evStatus)) {
                                    conn.rollback();
                                    sendJson(ex, 400, "{\"error\":\"Selected disaster event is resolved. Please select an Active disaster or General Relief Fund.\"}");
                                    return;
                                }
                            }

                            for (int[] pair : items) {
                                if (!recordExists(conn, "SELECT 1 FROM ReliefGood WHERE good_id = ?", pair[0])) {
                                    conn.rollback();
                                    sendJson(ex, 400, "{\"error\":\"One or more selected relief items are no longer in the catalog. Please refresh.\"}");
                                    return;
                                }
                            }

                            int donationId;
                            try (PreparedStatement stmt = conn.prepareStatement(
                                    "INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES (?, ?, CURRENT_DATE, 'Pending') RETURNING donation_id")) {
                                stmt.setInt(1, donor.getDonorId());
                                if (eventId != null && eventId > 0) stmt.setInt(2, eventId);
                                else stmt.setNull(2, Types.INTEGER);
                                try (ResultSet rs = stmt.executeQuery()) {
                                    rs.next();
                                    donationId = rs.getInt(1);
                                }
                            }

                            try (PreparedStatement itemStmt = conn.prepareStatement(
                                    "INSERT INTO DonationItem (donation_id, good_id, quantity) VALUES (?, ?, ?)")) {
                                for (int[] pair : items) {
                                    itemStmt.setInt(1, donationId);
                                    itemStmt.setInt(2, pair[0]);
                                    itemStmt.setInt(3, pair[1]);
                                    itemStmt.addBatch();
                                }
                                itemStmt.executeBatch();
                            }

                            try (PreparedStatement notifStmt = conn.prepareStatement(
                                    "INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                notifStmt.setInt(1, userId);
                                notifStmt.setString(2, "Donation Pledge " + donationId + " (" + items.size() + " item types) recorded and awaiting review.");
                                notifStmt.executeUpdate();
                            }

                            conn.commit();
                            sendJson(ex, 201, "{\"donationId\":" + donationId + ",\"message\":\"Donation submitted atomically.\"}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int donationId = extractInt(body, "donationId", 0);
                    String status = normalizeDonationStatus(extractString(body, "status"));

                    if (donationId <= 0 || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Valid donationId and status (Pending or Approved) are required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String prevStatus;
                            int donorId;
                            try (PreparedStatement check = conn.prepareStatement("SELECT status, donor_id FROM Donation WHERE donation_id = ? FOR UPDATE")) {
                                check.setInt(1, donationId);
                                try (ResultSet rs = check.executeQuery()) {
                                    if (!rs.next()) {
                                        conn.rollback();
                                        sendJson(ex, 404, "{\"error\":\"Donation not found.\"}");
                                        return;
                                    }
                                    prevStatus = rs.getString("status");
                                    donorId = rs.getInt("donor_id");
                                }
                            }

                            try (PreparedStatement upd = conn.prepareStatement("UPDATE Donation SET status = ? WHERE donation_id = ?")) {
                                upd.setString(1, status);
                                upd.setInt(2, donationId);
                                upd.executeUpdate();
                            }

                            // If transitioning to Approved, atomically credit Inventory stock using the SAME transaction connection
                            if ("Approved".equals(status) && !"Approved".equalsIgnoreCase(prevStatus)) {
                                Map<Integer, Integer> creditMap = new LinkedHashMap<>();
                                try (PreparedStatement itemPs = conn.prepareStatement(
                                        "SELECT good_id, SUM(quantity) AS total_qty FROM DonationItem WHERE donation_id = ? GROUP BY good_id")) {
                                    itemPs.setInt(1, donationId);
                                    try (ResultSet rs = itemPs.executeQuery()) {
                                        while (rs.next()) {
                                            creditMap.put(rs.getInt("good_id"), rs.getInt("total_qty"));
                                        }
                                    }
                                }
                                try (PreparedStatement invUpd = conn.prepareStatement(
                                        "INSERT INTO Inventory (good_id, current_stock) VALUES (?, ?) " +
                                        "ON CONFLICT (good_id) DO UPDATE SET current_stock = Inventory.current_stock + EXCLUDED.current_stock")) {
                                    for (Map.Entry<Integer, Integer> entry : creditMap.entrySet()) {
                                        invUpd.setInt(1, entry.getKey());
                                        invUpd.setInt(2, entry.getValue());
                                        invUpd.addBatch();
                                    }
                                    invUpd.executeBatch();
                                }
                            }

                            // Notify Donor
                            try (PreparedStatement userLookup = conn.prepareStatement("SELECT user_id FROM Donor WHERE donor_id = ?")) {
                                userLookup.setInt(1, donorId);
                                try (ResultSet rs = userLookup.executeQuery()) {
                                    if (rs.next()) {
                                        int donorUserId = rs.getInt(1);
                                        try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                            notif.setInt(1, donorUserId);
                                            notif.setString(2, "Your Donation " + donationId + " status has been updated to: " + status + ".");
                                            notif.executeUpdate();
                                        }
                                    }
                                }
                            }

                            conn.commit();
                            sendJson(ex, 200, "{\"message\":\"Donation status updated and warehouse inventory synchronized.\"}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = parsePositiveInt(params.get("id"), 0);
                    int ownerUserId = parsePositiveInt(params.get("userId"), 0);
                    boolean onlyPending = "true".equalsIgnoreCase(params.get("onlyPending"));
                    if (id <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid donation id is required.\"}");
                        return;
                    }
                    if (onlyPending || ownerUserId > 0) {
                        try (Connection conn = DatabaseConnection.getConnection()) {
                            conn.setAutoCommit(false);
                            try {
                                String status;
                                int rowUserId;
                                try (PreparedStatement chk = conn.prepareStatement(
                                        "SELECT d.status, dn.user_id FROM Donation d JOIN Donor dn ON d.donor_id = dn.donor_id WHERE d.donation_id = ? FOR UPDATE")) {
                                    chk.setInt(1, id);
                                    try (ResultSet rs = chk.executeQuery()) {
                                        if (!rs.next()) {
                                            conn.rollback();
                                            sendJson(ex, 404, "{\"error\":\"Donation not found.\"}");
                                            return;
                                        }
                                        status = rs.getString("status");
                                        rowUserId = rs.getInt("user_id");
                                    }
                                }
                                if (ownerUserId > 0 && rowUserId != ownerUserId) {
                                    conn.rollback();
                                    sendJson(ex, 403, "{\"error\":\"You can only cancel your own donations.\"}");
                                    return;
                                }
                                if (onlyPending && !"Pending".equalsIgnoreCase(status)) {
                                    conn.rollback();
                                    sendJson(ex, 409, "{\"error\":\"Only pending donations can be cancelled. Approved pledges are already credited to warehouse inventory.\"}");
                                    return;
                                }
                                try (PreparedStatement del = conn.prepareStatement("DELETE FROM Donation WHERE donation_id = ?")) {
                                    del.setInt(1, id);
                                    del.executeUpdate();
                                }
                                conn.commit();
                                sendJson(ex, 200, "{\"deleted\":true}");
                            } catch (Exception e) {
                                conn.rollback();
                                throw e;
                            }
                        }
                    } else {
                        try (Connection conn = DatabaseConnection.getConnection();
                             PreparedStatement ps = conn.prepareStatement("DELETE FROM Donation WHERE donation_id = ?")) {
                            ps.setInt(1, id);
                            int affected = ps.executeUpdate();
                            if (affected == 0) {
                                sendJson(ex, 404, "{\"error\":\"Donation not found.\"}");
                                return;
                            }
                            sendJson(ex, 200, "{\"deleted\":true}");
                        }
                    }
                } else {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                }
            }
        });

        // Relief Requests CRUD & Atomic Split-Transaction + Strict Stock Verification
        server.createContext("/api/requests", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int userId = extractInt(body, "userId", 0);
                    int eventId = extractInt(body, "eventId", 0);
                    List<int[]> items = mergeDuplicateItems(extractItemsArray(body));

                    if (userId <= 0 || eventId <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid userId and eventId are required.\"}");
                        return;
                    }
                    if (items.isEmpty()) {
                        sendJson(ex, 400, "{\"error\":\"At least one requested relief item (quantity > 0) is required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            Organization org = queryOrganizationByUserId(conn, userId);
                            if (org == null) {
                                conn.rollback();
                                sendJson(ex, 400, "{\"error\":\"Organization profile not found for userId.\"}");
                                return;
                            }
                            String eventName = null;
                            String evStatus = null;
                            try (PreparedStatement evPs = conn.prepareStatement("SELECT event_name, status FROM DisasterEvent WHERE event_id = ?")) {
                                evPs.setInt(1, eventId);
                                try (ResultSet rs = evPs.executeQuery()) {
                                    if (rs.next()) {
                                        eventName = rs.getString("event_name");
                                        evStatus = rs.getString("status");
                                    }
                                }
                            }
                            if (evStatus == null) {
                                conn.rollback();
                                sendJson(ex, 400, "{\"error\":\"Selected disaster event does not exist.\"}");
                                return;
                            }
                            if (!"Active".equalsIgnoreCase(evStatus)) {
                                conn.rollback();
                                sendJson(ex, 400, "{\"error\":\"Selected disaster event is resolved. Please select an Active disaster.\"}");
                                return;
                            }
                            for (int[] pair : items) {
                                if (!recordExists(conn, "SELECT 1 FROM ReliefGood WHERE good_id = ?", pair[0])) {
                                    conn.rollback();
                                    sendJson(ex, 400, "{\"error\":\"One or more selected relief items are no longer in the catalog. Please refresh.\"}");
                                    return;
                                }
                            }

                            int requestId;
                            try (PreparedStatement stmt = conn.prepareStatement(
                                    "INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES (?, ?, CURRENT_DATE, 'Pending') RETURNING request_id")) {
                                stmt.setInt(1, org.getOrgId());
                                stmt.setInt(2, eventId);
                                try (ResultSet rs = stmt.executeQuery()) {
                                    rs.next();
                                    requestId = rs.getInt(1);
                                }
                            }

                            try (PreparedStatement itemStmt = conn.prepareStatement(
                                    "INSERT INTO RequestItem (request_id, good_id, quantity) VALUES (?, ?, ?)")) {
                                for (int[] pair : items) {
                                    itemStmt.setInt(1, requestId);
                                    itemStmt.setInt(2, pair[0]);
                                    itemStmt.setInt(3, pair[1]);
                                    itemStmt.addBatch();
                                }
                                itemStmt.executeBatch();
                            }

                            try (PreparedStatement notifStmt = conn.prepareStatement(
                                    "INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                notifStmt.setInt(1, userId);
                                String safeEventName = (eventName != null && !eventName.trim().isEmpty()) ? eventName : ("Event " + eventId);
                                notifStmt.setString(2, "Relief Request " + requestId + " submitted for " + safeEventName + " and queued for Steward review.");
                                notifStmt.executeUpdate();
                            }

                            conn.commit();
                            sendJson(ex, 201, "{\"requestId\":" + requestId + ",\"message\":\"Relief request submitted atomically.\"}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int requestId = extractInt(body, "requestId", 0);
                    String status = normalizeRequestStatus(extractString(body, "status"));

                    if (requestId <= 0 || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Valid requestId and status (Pending, Approved, or Fulfilled) are required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String prevStatus;
                            int orgId;
                            try (PreparedStatement check = conn.prepareStatement("SELECT status, org_id FROM ReliefRequest WHERE request_id = ? FOR UPDATE")) {
                                check.setInt(1, requestId);
                                try (ResultSet rs = check.executeQuery()) {
                                    if (!rs.next()) {
                                        conn.rollback();
                                        sendJson(ex, 404, "{\"error\":\"Relief request not found.\"}");
                                        return;
                                    }
                                    prevStatus = rs.getString("status");
                                    orgId = rs.getInt("org_id");
                                }
                            }

                            // When transitioning out of Pending into Approved/Fulfilled, strictly verify & deduct Inventory stock!
                            if ("Pending".equalsIgnoreCase(prevStatus) && ("Approved".equals(status) || "Fulfilled".equals(status))) {
                                List<Object[]> neededItems = new ArrayList<>();
                                try (PreparedStatement itemsPs = conn.prepareStatement(
                                        "SELECT ri.good_id, SUM(ri.quantity) AS total_qty, g.item_name, g.unit_of_measure " +
                                        "FROM RequestItem ri JOIN ReliefGood g ON ri.good_id = g.good_id " +
                                        "WHERE ri.request_id = ? GROUP BY ri.good_id, g.item_name, g.unit_of_measure ORDER BY ri.good_id")) {
                                    itemsPs.setInt(1, requestId);
                                    try (ResultSet rs = itemsPs.executeQuery()) {
                                        while (rs.next()) {
                                            neededItems.add(new Object[]{
                                                    rs.getInt("good_id"),
                                                    rs.getInt("total_qty"),
                                                    rs.getString("item_name"),
                                                    rs.getString("unit_of_measure")
                                            });
                                        }
                                    }
                                }

                                for (Object[] it : neededItems) {
                                    int goodId = (Integer) it[0];
                                    int reqQty = (Integer) it[1];
                                    String itemName = (String) it[2];
                                    String unit = (String) it[3];

                                    int available = 0;
                                    boolean hasRow = false;
                                    try (PreparedStatement stockPs = conn.prepareStatement(
                                            "SELECT current_stock FROM Inventory WHERE good_id = ? FOR UPDATE")) {
                                        stockPs.setInt(1, goodId);
                                        try (ResultSet srs = stockPs.executeQuery()) {
                                            if (srs.next()) {
                                                hasRow = true;
                                                available = srs.getInt("current_stock");
                                            }
                                        }
                                    }

                                    if (!hasRow || available < reqQty) {
                                        conn.rollback();
                                        sendJson(ex, 400, "{\"error\":" + q("Insufficient warehouse stock for " + itemName
                                                + ": requested " + reqQty + " " + unit + ", available " + available + " " + unit + ".") + "}");
                                        return;
                                    }

                                    try (PreparedStatement deduct = conn.prepareStatement(
                                            "UPDATE Inventory SET current_stock = current_stock - ? WHERE good_id = ?")) {
                                        deduct.setInt(1, reqQty);
                                        deduct.setInt(2, goodId);
                                        deduct.executeUpdate();
                                    }
                                }
                            }

                            try (PreparedStatement upd = conn.prepareStatement("UPDATE ReliefRequest SET status = ? WHERE request_id = ?")) {
                                upd.setString(1, status);
                                upd.setInt(2, requestId);
                                upd.executeUpdate();
                            }

                            try (PreparedStatement userLookup = conn.prepareStatement("SELECT user_id FROM Organization WHERE org_id = ?")) {
                                userLookup.setInt(1, orgId);
                                try (ResultSet rs = userLookup.executeQuery()) {
                                    if (rs.next()) {
                                        int orgUserId = rs.getInt(1);
                                        try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                            notif.setInt(1, orgUserId);
                                            notif.setString(2, "Relief Request " + requestId + " status updated to: " + status + ".");
                                            notif.executeUpdate();
                                        }
                                    }
                                }
                            }

                            conn.commit();
                            sendJson(ex, 200, "{\"message\":\"Request status updated and inventory adjusted atomically.\"}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = parsePositiveInt(params.get("id"), 0);
                    int ownerUserId = parsePositiveInt(params.get("userId"), 0);
                    boolean onlyPending = "true".equalsIgnoreCase(params.get("onlyPending"));
                    if (id <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid request id is required.\"}");
                        return;
                    }
                    if (onlyPending || ownerUserId > 0) {
                        try (Connection conn = DatabaseConnection.getConnection()) {
                            conn.setAutoCommit(false);
                            try {
                                String status;
                                int rowUserId;
                                try (PreparedStatement chk = conn.prepareStatement(
                                        "SELECT r.status, o.user_id FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id WHERE r.request_id = ? FOR UPDATE")) {
                                    chk.setInt(1, id);
                                    try (ResultSet rs = chk.executeQuery()) {
                                        if (!rs.next()) {
                                            conn.rollback();
                                            sendJson(ex, 404, "{\"error\":\"Relief request not found.\"}");
                                            return;
                                        }
                                        status = rs.getString("status");
                                        rowUserId = rs.getInt("user_id");
                                    }
                                }
                                if (ownerUserId > 0 && rowUserId != ownerUserId) {
                                    conn.rollback();
                                    sendJson(ex, 403, "{\"error\":\"You can only cancel your own relief requests.\"}");
                                    return;
                                }
                                if (onlyPending && !"Pending".equalsIgnoreCase(status)) {
                                    conn.rollback();
                                    sendJson(ex, 409, "{\"error\":\"Only pending requests can be cancelled. Approved or fulfilled requests are already allocated.\"}");
                                    return;
                                }
                                if (recordExists(conn, "SELECT 1 FROM Delivery WHERE request_id = ?", id)) {
                                    conn.rollback();
                                    sendJson(ex, 409, "{\"error\":\"Cannot cancel a request that already has a delivery dispatch.\"}");
                                    return;
                                }
                                try (PreparedStatement del = conn.prepareStatement("DELETE FROM ReliefRequest WHERE request_id = ?")) {
                                    del.setInt(1, id);
                                    del.executeUpdate();
                                }
                                conn.commit();
                                sendJson(ex, 200, "{\"deleted\":true}");
                            } catch (Exception e) {
                                conn.rollback();
                                throw e;
                            }
                        }
                    } else {
                        try (Connection conn = DatabaseConnection.getConnection();
                             PreparedStatement ps = conn.prepareStatement("DELETE FROM ReliefRequest WHERE request_id = ?")) {
                            ps.setInt(1, id);
                            int affected = ps.executeUpdate();
                            if (affected == 0) {
                                sendJson(ex, 404, "{\"error\":\"Relief request not found.\"}");
                                return;
                            }
                            sendJson(ex, 200, "{\"deleted\":true}");
                        }
                    }
                } else {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                }
            }
        });

        // Deliveries Dispatch & Volunteer Updates
        server.createContext("/api/deliveries", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int requestId = extractInt(body, "requestId", 0);
                    Integer volunteerId = extractNullableInt(body, "volunteerId");
                    if (volunteerId != null && volunteerId <= 0) volunteerId = null;
                    String rawStatus = extractString(body, "deliveryStatus");
                    String status = (rawStatus == null || rawStatus.trim().isEmpty()) ? "In Transit" : normalizeDeliveryStatus(rawStatus);

                    if (requestId <= 0 || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Valid requestId and deliveryStatus are required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String reqStatus;
                            int orgUserId;
                            try (PreparedStatement reqPs = conn.prepareStatement(
                                    "SELECT r.status, o.user_id FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id WHERE r.request_id = ? FOR UPDATE")) {
                                reqPs.setInt(1, requestId);
                                try (ResultSet rs = reqPs.executeQuery()) {
                                    if (!rs.next()) {
                                        conn.rollback();
                                        sendJson(ex, 404, "{\"error\":\"Relief request not found.\"}");
                                        return;
                                    }
                                    reqStatus = rs.getString("status");
                                    orgUserId = rs.getInt("user_id");
                                }
                            }

                            if (!"Approved".equalsIgnoreCase(reqStatus)) {
                                conn.rollback();
                                sendJson(ex, 400, "{\"error\":" + q("Only Approved relief requests can be dispatched (Request " + requestId + " is " + reqStatus + ").") + "}");
                                return;
                            }

                            try (PreparedStatement dupDel = conn.prepareStatement("SELECT delivery_id FROM Delivery WHERE request_id = ? LIMIT 1")) {
                                dupDel.setInt(1, requestId);
                                try (ResultSet rs = dupDel.executeQuery()) {
                                    if (rs.next()) {
                                        int existingId = rs.getInt("delivery_id");
                                        conn.rollback();
                                        sendJson(ex, 409, "{\"error\":" + q("Request " + requestId + " already has a delivery assignment (Delivery " + existingId + ").") + "}");
                                        return;
                                    }
                                }
                            }

                            Integer volUserId = null;
                            if (volunteerId != null) {
                                try (PreparedStatement vPs = conn.prepareStatement("SELECT user_id FROM Volunteer WHERE volunteer_id = ?")) {
                                    vPs.setInt(1, volunteerId);
                                    try (ResultSet rs = vPs.executeQuery()) {
                                        if (!rs.next()) {
                                            conn.rollback();
                                            sendJson(ex, 404, "{\"error\":\"Assigned volunteer not found.\"}");
                                            return;
                                        }
                                        volUserId = rs.getInt(1);
                                    }
                                }
                            }

                            int deliveryId;
                            try (PreparedStatement ins = conn.prepareStatement(
                                    "INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES (?, ?, CURRENT_DATE, ?) RETURNING delivery_id")) {
                                ins.setInt(1, requestId);
                                if (volunteerId != null) ins.setInt(2, volunteerId);
                                else ins.setNull(2, Types.INTEGER);
                                ins.setString(3, status);
                                try (ResultSet rs = ins.executeQuery()) {
                                    rs.next();
                                    deliveryId = rs.getInt(1);
                                }
                            }

                            if (volUserId != null) {
                                try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                    notif.setInt(1, volUserId);
                                    notif.setString(2, "New Dispatch Assignment (Delivery " + deliveryId + "): You have been assigned to Relief Request " + requestId + ".");
                                    notif.executeUpdate();
                                }
                            }

                            if ("In Transit".equals(status)) {
                                try (PreparedStatement notifOrg = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                    notifOrg.setInt(1, orgUserId);
                                    notifOrg.setString(2, "Delivery " + deliveryId + " for Relief Request " + requestId + " has been dispatched and is now In Transit.");
                                    notifOrg.executeUpdate();
                                }
                            } else if ("Delivered".equals(status)) {
                                try (PreparedStatement reqUpd = conn.prepareStatement("UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = ?")) {
                                    reqUpd.setInt(1, requestId);
                                    reqUpd.executeUpdate();
                                }
                                try (PreparedStatement notifOrg = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                    notifOrg.setInt(1, orgUserId);
                                    notifOrg.setString(2, "Delivery " + deliveryId + " for Relief Request " + requestId + " has been delivered.");
                                    notifOrg.executeUpdate();
                                }
                            }

                            conn.commit();
                            sendJson(ex, 201, "{\"created\":true,\"deliveryId\":" + deliveryId + "}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int deliveryId = extractInt(body, "deliveryId", 0);
                    String status = normalizeDeliveryStatus(extractString(body, "deliveryStatus"));

                    if (deliveryId <= 0 || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Valid deliveryId and deliveryStatus (Pending, In Transit, or Delivered) are required.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String prevStatus;
                            int requestId;
                            int orgUserId;
                            try (PreparedStatement check = conn.prepareStatement(
                                    "SELECT d.delivery_status, d.request_id, o.user_id FROM Delivery d " +
                                    "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                                    "JOIN Organization o ON r.org_id = o.org_id " +
                                    "WHERE d.delivery_id = ? FOR UPDATE")) {
                                check.setInt(1, deliveryId);
                                try (ResultSet rs = check.executeQuery()) {
                                    if (!rs.next()) {
                                        conn.rollback();
                                        sendJson(ex, 404, "{\"error\":\"Delivery not found.\"}");
                                        return;
                                    }
                                    prevStatus = rs.getString("delivery_status");
                                    requestId = rs.getInt("request_id");
                                    orgUserId = rs.getInt("user_id");
                                }
                            }

                            if ("Delivered".equalsIgnoreCase(prevStatus) && !"Delivered".equals(status)) {
                                conn.rollback();
                                sendJson(ex, 409, "{\"error\":\"Delivered shipments cannot be reverted to an earlier status.\"}");
                                return;
                            }

                            try (PreparedStatement upd = conn.prepareStatement("UPDATE Delivery SET delivery_status = ? WHERE delivery_id = ?")) {
                                upd.setString(1, status);
                                upd.setInt(2, deliveryId);
                                upd.executeUpdate();
                            }

                            if ("In Transit".equals(status) && !"In Transit".equalsIgnoreCase(prevStatus)) {
                                try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                    notif.setInt(1, orgUserId);
                                    notif.setString(2, "Delivery " + deliveryId + " for Relief Request " + requestId + " is now In Transit.");
                                    notif.executeUpdate();
                                }
                            } else if ("Delivered".equals(status) && !"Delivered".equalsIgnoreCase(prevStatus)) {
                                try (PreparedStatement ps = conn.prepareStatement("UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = ?")) {
                                    ps.setInt(1, requestId);
                                    ps.executeUpdate();
                                }
                                try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                    notif.setInt(1, orgUserId);
                                    notif.setString(2, "Delivery " + deliveryId + " for Relief Request " + requestId + " has arrived and is marked Fulfilled.");
                                    notif.executeUpdate();
                                }
                            }

                            conn.commit();
                            sendJson(ex, 200, "{\"updated\":true}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = parsePositiveInt(params.get("id"), 0);
                    if (id <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid delivery id is required.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement("DELETE FROM Delivery WHERE delivery_id = ?")) {
                        ps.setInt(1, id);
                        int affected = ps.executeUpdate();
                        if (affected == 0) {
                            sendJson(ex, 404, "{\"error\":\"Delivery not found.\"}");
                            return;
                        }
                        sendJson(ex, 200, "{\"deleted\":true}");
                    }
                } else {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                }
            }
        });

        // Disaster Events CRUD
        server.createContext("/api/events", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    String name = extractString(body, "eventName");
                    String loc = extractString(body, "location");
                    String rawStatus = extractString(body, "status");
                    String status = (rawStatus == null || rawStatus.trim().isEmpty()) ? "Active" : normalizeEventStatus(rawStatus);
                    String dateStr = extractString(body, "startDate");

                    if (isBlank(name) || isBlank(loc) || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Event name, location, and valid status (Active or Resolved) are required.\"}");
                        return;
                    }

                    java.sql.Date startDate = !isBlank(dateStr)
                            ? java.sql.Date.valueOf(dateStr.trim())
                            : java.sql.Date.valueOf(LocalDate.now());

                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement(
                                 "INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES (?, ?, ?, ?) RETURNING event_id")) {
                        ps.setString(1, name.trim());
                        ps.setString(2, loc.trim());
                        ps.setString(3, status);
                        ps.setDate(4, startDate);
                        try (ResultSet rs = ps.executeQuery()) {
                            rs.next();
                            sendJson(ex, 201, "{\"created\":true,\"eventId\":" + rs.getInt(1) + "}");
                        }
                    }
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int eventId = extractInt(body, "eventId", 0);
                    String status = normalizeEventStatus(extractString(body, "status"));
                    if (eventId <= 0 || status == null) {
                        sendJson(ex, 400, "{\"error\":\"Valid eventId and status (Active or Resolved) are required.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement("UPDATE DisasterEvent SET status = ? WHERE event_id = ?")) {
                        ps.setString(1, status);
                        ps.setInt(2, eventId);
                        int affected = ps.executeUpdate();
                        if (affected == 0) {
                            sendJson(ex, 404, "{\"error\":\"Disaster event not found.\"}");
                            return;
                        }
                        sendJson(ex, 200, "{\"updated\":true}");
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = parsePositiveInt(params.get("id"), 0);
                    if (id <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid event id is required.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement("DELETE FROM DisasterEvent WHERE event_id = ?")) {
                        ps.setInt(1, id);
                        int affected = ps.executeUpdate();
                        if (affected == 0) {
                            sendJson(ex, 404, "{\"error\":\"Disaster event not found.\"}");
                            return;
                        }
                        sendJson(ex, 200, "{\"deleted\":true}");
                    }
                } else {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                }
            }
        });

        // Inventory & Master ReliefGood CRUD
        server.createContext("/api/inventory", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    String itemName = extractString(body, "itemName");
                    String category = extractString(body, "category");
                    String unit = extractString(body, "unitOfMeasure");
                    int initialStock = extractInt(body, "currentStock", 0);

                    if (isBlank(itemName) || isBlank(category) || isBlank(unit)) {
                        sendJson(ex, 400, "{\"error\":\"Item name, category, and unit of measure are required.\"}");
                        return;
                    }
                    if (initialStock < 0) {
                        sendJson(ex, 400, "{\"error\":\"Opening stock cannot be negative.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            int goodId;
                            try (PreparedStatement stmtGood = conn.prepareStatement(
                                    "INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES (?, ?, ?) RETURNING good_id")) {
                                stmtGood.setString(1, itemName.trim());
                                stmtGood.setString(2, category.trim());
                                stmtGood.setString(3, unit.trim());
                                try (ResultSet rs = stmtGood.executeQuery()) {
                                    rs.next();
                                    goodId = rs.getInt(1);
                                }
                            }
                            try (PreparedStatement stmtInv = conn.prepareStatement(
                                    "INSERT INTO Inventory (good_id, current_stock) VALUES (?, ?)")) {
                                stmtInv.setInt(1, goodId);
                                stmtInv.setInt(2, initialStock);
                                stmtInv.executeUpdate();
                            }
                            conn.commit();
                            sendJson(ex, 201, "{\"created\":true,\"goodId\":" + goodId + "}");
                        } catch (Exception e) {
                            conn.rollback();
                            throw e;
                        }
                    }
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int inventoryId = extractInt(body, "inventoryId", 0);
                    int newStock = extractInt(body, "currentStock", -1);
                    if (inventoryId <= 0 || newStock < 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid inventoryId and non-negative currentStock are required.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement("UPDATE Inventory SET current_stock = ? WHERE inventory_id = ?")) {
                        ps.setInt(1, newStock);
                        ps.setInt(2, inventoryId);
                        int affected = ps.executeUpdate();
                        if (affected == 0) {
                            sendJson(ex, 404, "{\"error\":\"Inventory record not found.\"}");
                            return;
                        }
                        sendJson(ex, 200, "{\"updated\":true}");
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = parsePositiveInt(params.get("id"), 0);
                    if (id <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid inventory id is required.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement(
                                 "DELETE FROM ReliefGood WHERE good_id = (SELECT good_id FROM Inventory WHERE inventory_id = ?)")) {
                        ps.setInt(1, id);
                        int affected = ps.executeUpdate();
                        if (affected == 0) {
                            sendJson(ex, 404, "{\"error\":\"Inventory record not found.\"}");
                            return;
                        }
                        sendJson(ex, 200, "{\"deleted\":true}");
                    }
                } else {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                }
            }
        });

        // Volunteer Profile & Availability Update (Single connection transaction)
        server.createContext("/api/volunteer/profile", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                if (!"PUT".equalsIgnoreCase(ex.getRequestMethod())) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                String body = readBody(ex);
                int userId = extractInt(body, "userId", 0);
                String fullName = extractString(body, "fullName");
                String contactInfo = extractString(body, "contactInfo");
                String vehicleType = extractString(body, "vehicleType");
                boolean isAvailable = extractBoolean(body, "isAvailable", true);

                if (userId <= 0) {
                    sendJson(ex, 400, "{\"error\":\"Valid userId is required.\"}");
                    return;
                }

                try (Connection conn = DatabaseConnection.getConnection()) {
                    conn.setAutoCommit(false);
                    try {
                        if (!isBlank(fullName) && contactInfo != null) {
                            try (PreparedStatement updUser = conn.prepareStatement(
                                    "UPDATE UserAccount SET full_name = ?, contact_info = ? WHERE user_id = ?")) {
                                updUser.setString(1, fullName.trim());
                                updUser.setString(2, contactInfo.trim());
                                updUser.setInt(3, userId);
                                updUser.executeUpdate();
                            }
                        }
                        try (PreparedStatement upsVol = conn.prepareStatement(
                                "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES (?, ?, ?) " +
                                "ON CONFLICT (user_id) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type, is_available = EXCLUDED.is_available")) {
                            upsVol.setInt(1, userId);
                            upsVol.setString(2, !isBlank(vehicleType) ? vehicleType.trim() : "Van");
                            upsVol.setBoolean(3, isAvailable);
                            upsVol.executeUpdate();
                        }
                        conn.commit();
                        sendJson(ex, 200, "{\"updated\":true}");
                    } catch (Exception e) {
                        conn.rollback();
                        throw e;
                    }
                }
            }
        });

        // Mark Notification as Read
        server.createContext("/api/notifications/read", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if (!"PUT".equalsIgnoreCase(method) && !"POST".equalsIgnoreCase(method)) {
                    sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                String body = readBody(ex);
                boolean markAll = extractBoolean(body, "markAll", false);
                int userId = extractInt(body, "userId", 0);
                if (markAll) {
                    if (userId <= 0) {
                        sendJson(ex, 400, "{\"error\":\"Valid userId is required to mark all notifications read.\"}");
                        return;
                    }
                    try (Connection conn = DatabaseConnection.getConnection();
                         PreparedStatement ps = conn.prepareStatement("UPDATE Notification SET is_read = true WHERE user_id = ? AND is_read = false")) {
                        ps.setInt(1, userId);
                        ps.executeUpdate();
                        sendJson(ex, 200, "{\"ok\":true,\"markAll\":true}");
                    }
                    return;
                }

                int notificationId = extractInt(body, "notificationId", 0);
                if (notificationId <= 0) {
                    sendJson(ex, 400, "{\"error\":\"Valid notificationId is required.\"}");
                    return;
                }
                try (Connection conn = DatabaseConnection.getConnection();
                     PreparedStatement ps = conn.prepareStatement("UPDATE Notification SET is_read = true WHERE notification_id = ?")) {
                    ps.setInt(1, notificationId);
                    ps.executeUpdate();
                    sendJson(ex, 200, "{\"ok\":true}");
                }
            }
        });

        server.start();
        System.out.println("==================================================================");
        System.out.println("DRRMS Java JDBC REST Server running on http://0.0.0.0:" + port);
        System.out.println("Connected to Supabase PostgreSQL 15 via JDBC PreparedStatement DAOs");
        System.out.println("==================================================================");
    }

    // ------------------------------------------------------------------
    // Single-Connection Query Helpers (No N+1, No Multi-Connect Overhead)
    // ------------------------------------------------------------------

    private static User queryUserById(Connection conn, int userId) throws SQLException {
        if (userId <= 0) return null;
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT user_id, username, full_name, role, contact_info, email, is_verified FROM UserAccount WHERE user_id = ?")) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    User u = new User(rs.getInt("user_id"), rs.getString("username"), "",
                            rs.getString("full_name"), rs.getString("role"), rs.getString("contact_info"));
                    u.setEmail(rs.getString("email"));
                    u.setVerified(rs.getBoolean("is_verified"));
                    return u;
                }
            }
        }
        return null;
    }

    private static Donor queryDonorByUserId(Connection conn, int userId) throws SQLException {
        if (userId <= 0) return null;
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT d.donor_id, d.user_id, d.donor_type, u.full_name AS donor_name " +
                "FROM Donor d JOIN UserAccount u ON d.user_id = u.user_id WHERE d.user_id = ?")) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Donor(rs.getInt("donor_id"), rs.getInt("user_id"),
                            rs.getString("donor_type"), rs.getString("donor_name"));
                }
            }
        }
        return null;
    }

    private static Organization queryOrganizationByUserId(Connection conn, int userId) throws SQLException {
        if (userId <= 0) return null;
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT org_id, user_id, org_name, location FROM Organization WHERE user_id = ?")) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Organization(rs.getInt("org_id"), rs.getInt("user_id"),
                            rs.getString("org_name"), rs.getString("location"));
                }
            }
        }
        return null;
    }

    private static Volunteer queryVolunteerByUserId(Connection conn, int userId) throws SQLException {
        if (userId <= 0) return null;
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT v.volunteer_id, v.user_id, v.vehicle_type, v.is_available, u.full_name AS volunteer_name " +
                "FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id WHERE v.user_id = ?")) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Volunteer(rs.getInt("volunteer_id"), rs.getInt("user_id"),
                            rs.getString("vehicle_type"), rs.getBoolean("is_available"),
                            rs.getString("volunteer_name"));
                }
            }
        }
        return null;
    }

    private static List<DisasterEvent> queryAllEvents(Connection conn) throws SQLException {
        List<DisasterEvent> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT event_id, event_name, location, status, start_date FROM DisasterEvent ORDER BY event_id DESC");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new DisasterEvent(rs.getInt("event_id"), rs.getString("event_name"),
                        rs.getString("location"), rs.getString("status"), rs.getDate("start_date")));
            }
        }
        return list;
    }

    private static List<Inventory> queryFullInventory(Connection conn) throws SQLException {
        List<Inventory> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure " +
                "FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id ORDER BY i.inventory_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Inventory(rs.getInt("inventory_id"), rs.getInt("good_id"),
                        rs.getInt("current_stock"), rs.getString("item_name"),
                        rs.getString("category"), rs.getString("unit_of_measure")));
            }
        }
        return list;
    }

    private static List<ReliefGood> queryAllGoods(Connection conn) throws SQLException {
        List<ReliefGood> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT good_id, item_name, category, unit_of_measure FROM ReliefGood ORDER BY good_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new ReliefGood(rs.getInt("good_id"), rs.getString("item_name"),
                        rs.getString("category"), rs.getString("unit_of_measure")));
            }
        }
        return list;
    }

    private static List<Donation> queryDonationsWithItems(Connection conn, Integer filterUserId) throws SQLException {
        List<Donation> donations = new ArrayList<>();
        String donSql = "SELECT d.donation_id, d.donor_id, d.event_id, d.donation_date, d.status, " +
                "u.full_name AS donor_name, e.event_name " +
                "FROM Donation d " +
                "JOIN Donor dn ON d.donor_id = dn.donor_id " +
                "JOIN UserAccount u ON dn.user_id = u.user_id " +
                "LEFT JOIN DisasterEvent e ON d.event_id = e.event_id " +
                (filterUserId != null ? "WHERE dn.user_id = ? " : "") +
                "ORDER BY d.donation_id DESC";
        try (PreparedStatement ps = conn.prepareStatement(donSql)) {
            if (filterUserId != null) ps.setInt(1, filterUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Donation d = new Donation(rs.getInt("donation_id"), rs.getInt("donor_id"),
                            (Integer) rs.getObject("event_id"), rs.getDate("donation_date"),
                            rs.getString("status"));
                    d.setDonorName(rs.getString("donor_name"));
                    d.setEventName(rs.getString("event_name"));
                    donations.add(d);
                }
            }
        }

        if (donations.isEmpty()) return donations;

        Map<Integer, List<DonationItem>> itemMap = new HashMap<>();
        String itemSql = "SELECT di.item_id, di.donation_id, di.good_id, di.quantity, " +
                "r.item_name, r.category, r.unit_of_measure " +
                "FROM DonationItem di " +
                "JOIN ReliefGood r ON di.good_id = r.good_id " +
                (filterUserId != null
                        ? "JOIN Donation d ON di.donation_id = d.donation_id JOIN Donor dn ON d.donor_id = dn.donor_id WHERE dn.user_id = ? "
                        : "") +
                "ORDER BY di.item_id";
        try (PreparedStatement ps = conn.prepareStatement(itemSql)) {
            if (filterUserId != null) ps.setInt(1, filterUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int donId = rs.getInt("donation_id");
                    itemMap.computeIfAbsent(donId, k -> new ArrayList<>()).add(
                            new DonationItem(rs.getInt("item_id"), donId, rs.getInt("good_id"),
                                    rs.getInt("quantity"), rs.getString("item_name"),
                                    rs.getString("category"), rs.getString("unit_of_measure"))
                    );
                }
            }
        }

        for (Donation d : donations) {
            d.setItems(itemMap.get(d.getDonationId()));
        }
        return donations;
    }

    private static List<ReliefRequest> queryRequestsWithItems(Connection conn, Integer filterUserId) throws SQLException {
        List<ReliefRequest> requests = new ArrayList<>();
        String reqSql = "SELECT r.request_id, r.org_id, r.event_id, r.request_date, r.status, " +
                "o.org_name, e.event_name " +
                "FROM ReliefRequest r " +
                "JOIN Organization o ON r.org_id = o.org_id " +
                "JOIN DisasterEvent e ON r.event_id = e.event_id " +
                (filterUserId != null ? "WHERE o.user_id = ? " : "") +
                "ORDER BY r.request_id DESC";
        try (PreparedStatement ps = conn.prepareStatement(reqSql)) {
            if (filterUserId != null) ps.setInt(1, filterUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ReliefRequest r = new ReliefRequest(rs.getInt("request_id"), rs.getInt("org_id"),
                            rs.getInt("event_id"), rs.getDate("request_date"), rs.getString("status"));
                    r.setOrgName(rs.getString("org_name"));
                    r.setEventName(rs.getString("event_name"));
                    requests.add(r);
                }
            }
        }

        if (requests.isEmpty()) return requests;

        Map<Integer, List<RequestItem>> itemMap = new HashMap<>();
        String itemSql = "SELECT ri.request_item_id, ri.request_id, ri.good_id, ri.quantity, " +
                "rg.item_name, rg.category, rg.unit_of_measure " +
                "FROM RequestItem ri " +
                "JOIN ReliefGood rg ON ri.good_id = rg.good_id " +
                (filterUserId != null
                        ? "JOIN ReliefRequest req ON ri.request_id = req.request_id JOIN Organization o ON req.org_id = o.org_id WHERE o.user_id = ? "
                        : "") +
                "ORDER BY ri.request_item_id";
        try (PreparedStatement ps = conn.prepareStatement(itemSql)) {
            if (filterUserId != null) ps.setInt(1, filterUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int reqId = rs.getInt("request_id");
                    itemMap.computeIfAbsent(reqId, k -> new ArrayList<>()).add(
                            new RequestItem(rs.getInt("request_item_id"), reqId, rs.getInt("good_id"),
                                    rs.getInt("quantity"), rs.getString("item_name"),
                                    rs.getString("category"), rs.getString("unit_of_measure"))
                    );
                }
            }
        }

        for (ReliefRequest r : requests) {
            r.setItems(itemMap.get(r.getRequestId()));
        }
        return requests;
    }

    private static void attachItemsToDeliveries(Connection conn, List<Delivery> list) throws SQLException {
        if (list.isEmpty()) return;
        Set<Integer> reqIds = new LinkedHashSet<>();
        for (Delivery d : list) {
            reqIds.add(d.getRequestId());
        }
        StringBuilder placeholders = new StringBuilder();
        for (int i = 0; i < reqIds.size(); i++) {
            if (i > 0) placeholders.append(",");
            placeholders.append("?");
        }
        Map<Integer, List<RequestItem>> itemMap = new HashMap<>();
        String itemSql = "SELECT ri.request_item_id, ri.request_id, ri.good_id, ri.quantity, " +
                "rg.item_name, rg.category, rg.unit_of_measure " +
                "FROM RequestItem ri JOIN ReliefGood rg ON ri.good_id = rg.good_id " +
                "WHERE ri.request_id IN (" + placeholders + ") ORDER BY ri.request_item_id";
        try (PreparedStatement ps = conn.prepareStatement(itemSql)) {
            int idx = 1;
            for (Integer reqId : reqIds) {
                ps.setInt(idx++, reqId);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int reqId = rs.getInt("request_id");
                    itemMap.computeIfAbsent(reqId, k -> new ArrayList<>()).add(
                            new RequestItem(rs.getInt("request_item_id"), reqId, rs.getInt("good_id"),
                                    rs.getInt("quantity"), rs.getString("item_name"),
                                    rs.getString("category"), rs.getString("unit_of_measure"))
                    );
                }
            }
        }
        for (Delivery d : list) {
            d.setItems(itemMap.get(d.getRequestId()));
        }
    }

    private static List<Delivery> queryDeliveries(Connection conn, Integer volunteerUserId) throws SQLException {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.delivery_id, d.request_id, d.volunteer_id, d.dispatch_date, d.delivery_status, " +
                "u.full_name AS volunteer_name, u.contact_info AS volunteer_contact, v.vehicle_type, " +
                "o.org_name, o.location, e.event_name " +
                "FROM Delivery d " +
                (volunteerUserId != null
                        ? "JOIN Volunteer v ON d.volunteer_id = v.volunteer_id JOIN UserAccount u ON v.user_id = u.user_id "
                        : "LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id LEFT JOIN UserAccount u ON v.user_id = u.user_id ") +
                "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                "JOIN Organization o ON r.org_id = o.org_id " +
                "LEFT JOIN DisasterEvent e ON r.event_id = e.event_id " +
                (volunteerUserId != null ? "WHERE v.user_id = ? " : "") +
                "ORDER BY d.delivery_id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            if (volunteerUserId != null) ps.setInt(1, volunteerUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Delivery del = new Delivery(rs.getInt("delivery_id"), rs.getInt("request_id"),
                            (Integer) rs.getObject("volunteer_id"), rs.getDate("dispatch_date"),
                            rs.getString("delivery_status"));
                    del.setVolunteerName(rs.getString("volunteer_name"));
                    del.setVolunteerContact(rs.getString("volunteer_contact"));
                    del.setVehicleType(rs.getString("vehicle_type"));
                    del.setOrgName(rs.getString("org_name"));
                    del.setLocation(rs.getString("location"));
                    del.setEventName(rs.getString("event_name"));
                    list.add(del);
                }
            }
        }
        attachItemsToDeliveries(conn, list);
        return list;
    }

    private static List<Delivery> queryDeliveriesForOrganizationUser(Connection conn, int orgUserId) throws SQLException {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.delivery_id, d.request_id, d.volunteer_id, d.dispatch_date, d.delivery_status, " +
                "u.full_name AS volunteer_name, u.contact_info AS volunteer_contact, v.vehicle_type, " +
                "o.org_name, o.location, e.event_name " +
                "FROM Delivery d " +
                "LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id " +
                "LEFT JOIN UserAccount u ON v.user_id = u.user_id " +
                "JOIN ReliefRequest r ON d.request_id = r.request_id " +
                "JOIN Organization o ON r.org_id = o.org_id " +
                "LEFT JOIN DisasterEvent e ON r.event_id = e.event_id " +
                "WHERE o.user_id = ? " +
                "ORDER BY d.delivery_id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, orgUserId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Delivery del = new Delivery(rs.getInt("delivery_id"), rs.getInt("request_id"),
                            (Integer) rs.getObject("volunteer_id"), rs.getDate("dispatch_date"),
                            rs.getString("delivery_status"));
                    del.setVolunteerName(rs.getString("volunteer_name"));
                    del.setVolunteerContact(rs.getString("volunteer_contact"));
                    del.setVehicleType(rs.getString("vehicle_type"));
                    del.setOrgName(rs.getString("org_name"));
                    del.setLocation(rs.getString("location"));
                    del.setEventName(rs.getString("event_name"));
                    list.add(del);
                }
            }
        }
        attachItemsToDeliveries(conn, list);
        return list;
    }

    private static List<Volunteer> queryAllVolunteers(Connection conn) throws SQLException {
        List<Volunteer> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT v.volunteer_id, v.user_id, v.vehicle_type, v.is_available, u.full_name AS volunteer_name " +
                "FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id ORDER BY v.volunteer_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Volunteer(rs.getInt("volunteer_id"), rs.getInt("user_id"),
                        rs.getString("vehicle_type"), rs.getBoolean("is_available"),
                        rs.getString("volunteer_name")));
            }
        }
        return list;
    }

    private static List<Organization> queryAllOrganizations(Connection conn) throws SQLException {
        List<Organization> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT org_id, user_id, org_name, location FROM Organization ORDER BY org_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Organization(rs.getInt("org_id"), rs.getInt("user_id"),
                        rs.getString("org_name"), rs.getString("location")));
            }
        }
        return list;
    }

    private static List<Donor> queryAllDonors(Connection conn) throws SQLException {
        List<Donor> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT d.donor_id, d.user_id, d.donor_type, u.full_name AS donor_name " +
                "FROM Donor d JOIN UserAccount u ON d.user_id = u.user_id ORDER BY d.donor_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Donor(rs.getInt("donor_id"), rs.getInt("user_id"),
                        rs.getString("donor_type"), rs.getString("donor_name")));
            }
        }
        return list;
    }

    private static List<User> queryAllUsers(Connection conn) throws SQLException {
        List<User> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT user_id, username, full_name, role, contact_info, email, is_verified FROM UserAccount ORDER BY user_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                User u = new User(rs.getInt("user_id"), rs.getString("username"), "",
                        rs.getString("full_name"), rs.getString("role"), rs.getString("contact_info"));
                u.setEmail(rs.getString("email"));
                u.setVerified(rs.getBoolean("is_verified"));
                list.add(u);
            }
        }
        return list;
    }

    private static List<Notification> queryNotifications(Connection conn, Integer userId, int limit) throws SQLException {
        List<Notification> list = new ArrayList<>();
        String sql = "SELECT notification_id, user_id, message, is_read, date_sent FROM Notification " +
                (userId != null ? "WHERE user_id = ? " : "") +
                "ORDER BY date_sent DESC LIMIT ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            int idx = 1;
            if (userId != null) ps.setInt(idx++, userId);
            ps.setInt(idx, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new Notification(rs.getInt("notification_id"), rs.getInt("user_id"),
                            rs.getString("message"), rs.getBoolean("is_read"),
                            rs.getTimestamp("date_sent")));
                }
            }
        }
        return list;
    }

    private static List<Object[]> queryOperationalSummaryReport(Connection conn) throws SQLException {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT e.event_id, e.event_name, e.location, e.status, " +
                "COUNT(DISTINCT d.donation_id) AS total_donations, " +
                "COUNT(DISTINCT r.request_id) AS total_requests, " +
                "COUNT(DISTINCT del.delivery_id) AS total_deliveries " +
                "FROM DisasterEvent e " +
                "LEFT JOIN Donation d ON e.event_id = d.event_id " +
                "LEFT JOIN ReliefRequest r ON e.event_id = r.event_id " +
                "LEFT JOIN Delivery del ON r.request_id = del.request_id " +
                "GROUP BY e.event_id, e.event_name, e.location, e.status " +
                "ORDER BY e.event_id";
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                        rs.getInt("event_id"),
                        rs.getString("event_name"),
                        rs.getString("location"),
                        rs.getString("status"),
                        rs.getInt("total_donations"),
                        rs.getInt("total_requests"),
                        rs.getInt("total_deliveries")
                });
            }
        }
        return report;
    }

    private static List<Object[]> queryInventoryHealthReport(Connection conn) throws SQLException {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT g.good_id, g.item_name, g.category, g.unit_of_measure, " +
                "COALESCE(i.current_stock, 0) AS current_stock, " +
                "COALESCE(SUM(di.quantity), 0) AS total_donated_qty, " +
                "COALESCE(SUM(ri.quantity), 0) AS total_requested_qty, " +
                "CASE " +
                "    WHEN COALESCE(i.current_stock, 0) <= 200 THEN 'CRITICAL ALERT' " +
                "    WHEN COALESCE(i.current_stock, 0) <= 1000 THEN 'LOW STOCK' " +
                "    ELSE 'SUFFICIENT' " +
                "END AS stock_health " +
                "FROM ReliefGood g " +
                "LEFT JOIN Inventory i ON g.good_id = i.good_id " +
                "LEFT JOIN DonationItem di ON g.good_id = di.good_id " +
                "LEFT JOIN RequestItem ri ON g.good_id = ri.good_id " +
                "GROUP BY g.good_id, g.item_name, g.category, g.unit_of_measure, i.current_stock " +
                "ORDER BY i.current_stock ASC";
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                        rs.getInt("good_id"),
                        rs.getString("item_name"),
                        rs.getString("category"),
                        rs.getInt("current_stock") + " " + rs.getString("unit_of_measure"),
                        rs.getInt("total_donated_qty"),
                        rs.getInt("total_requested_qty"),
                        rs.getString("stock_health")
                });
            }
        }
        return report;
    }

    private static List<Object[]> queryDonorImpactReport(Connection conn) throws SQLException {
        List<Object[]> report = new ArrayList<>();
        String sql = "SELECT dn.donor_id, u.full_name AS donor_name, dn.donor_type, u.contact_info, " +
                "COUNT(DISTINCT d.donation_id) AS total_donations, " +
                "COUNT(DISTINCT d.event_id) AS events_supported, " +
                "COALESCE(SUM(di.quantity), 0) AS total_items_donated " +
                "FROM Donor dn " +
                "JOIN UserAccount u ON dn.user_id = u.user_id " +
                "LEFT JOIN Donation d ON dn.donor_id = d.donor_id " +
                "LEFT JOIN DonationItem di ON d.donation_id = di.donation_id " +
                "GROUP BY dn.donor_id, u.full_name, dn.donor_type, u.contact_info " +
                "ORDER BY total_donations DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                report.add(new Object[]{
                        rs.getInt("donor_id"),
                        rs.getString("donor_name"),
                        rs.getString("donor_type"),
                        rs.getString("contact_info"),
                        rs.getInt("total_donations"),
                        rs.getInt("events_supported"),
                        rs.getInt("total_items_donated")
                });
            }
        }
        return report;
    }

    private static boolean recordExists(Connection conn, String sql, int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    // ------------------------------------------------------------------
    // Validation & Parsing Utilities
    // ------------------------------------------------------------------

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static int parsePositiveInt(String val, int fallback) {
        if (val == null || val.trim().isEmpty()) return fallback;
        try {
            return Integer.parseInt(val.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static String normalizeSelfRegisterRole(String raw) {
        if (raw == null) return null;
        String r = raw.trim();
        if ("Donor".equalsIgnoreCase(r)) return "Donor";
        if ("Organization".equalsIgnoreCase(r)) return "Organization";
        if ("Volunteer".equalsIgnoreCase(r)) return "Volunteer";
        return null;
    }

    private static String normalizeDonationStatus(String raw) {
        if (raw == null) return null;
        if ("Pending".equalsIgnoreCase(raw.trim())) return "Pending";
        if ("Approved".equalsIgnoreCase(raw.trim())) return "Approved";
        return null;
    }

    private static String normalizeRequestStatus(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if ("Pending".equalsIgnoreCase(s)) return "Pending";
        if ("Approved".equalsIgnoreCase(s)) return "Approved";
        if ("Fulfilled".equalsIgnoreCase(s)) return "Fulfilled";
        return null;
    }

    private static String normalizeDeliveryStatus(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if ("Pending".equalsIgnoreCase(s)) return "Pending";
        if ("In Transit".equalsIgnoreCase(s)) return "In Transit";
        if ("Delivered".equalsIgnoreCase(s)) return "Delivered";
        return null;
    }

    private static String normalizeEventStatus(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if ("Active".equalsIgnoreCase(s)) return "Active";
        if ("Resolved".equalsIgnoreCase(s)) return "Resolved";
        return null;
    }

    private static List<int[]> mergeDuplicateItems(List<int[]> items) {
        Map<Integer, Integer> merged = new LinkedHashMap<>();
        for (int[] pair : items) {
            if (pair[0] > 0 && pair[1] > 0) {
                merged.merge(pair[0], pair[1], Integer::sum);
            }
        }
        List<int[]> result = new ArrayList<>();
        for (Map.Entry<Integer, Integer> e : merged.entrySet()) {
            result.add(new int[]{e.getKey(), e.getValue()});
        }
        return result;
    }

    private abstract static class BaseHandler implements HttpHandler {
        protected abstract void handleRequest(HttpExchange ex) throws Exception;

        @Override
        public void handle(HttpExchange ex) throws IOException {
            ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            ex.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");

            if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(204, -1);
                return;
            }
            try {
                handleRequest(ex);
            } catch (Exception e) {
                e.printStackTrace();
                sendJson(ex, 500, "{\"error\":" + q(e.getMessage() != null ? e.getMessage() : "Internal server error") + "}");
            }
        }
    }

    private static void sendJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readBody(HttpExchange ex) throws IOException {
        try (InputStream is = ex.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        for (String pair : query.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                map.put(URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8),
                        URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    // Lightweight regex JSON extractors (zero external JAR dependencies)
    private static String extractString(String json, String key) {
        if (json == null) return null;
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
        Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1)
                    .replace("\\\"", "\"")
                    .replace("\\n", "\n")
                    .replace("\\r", "\r")
                    .replace("\\t", "\t")
                    .replace("\\\\", "\\");
        }
        return null;
    }

    private static int extractInt(String json, String key, int defaultVal) {
        Integer v = extractNullableInt(json, key);
        return v != null ? v : defaultVal;
    }

    private static Integer extractNullableInt(String json, String key) {
        if (json == null) return null;
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(-?\\d+)");
        Matcher m = p.matcher(json);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static boolean extractBoolean(String json, String key, boolean defaultVal) {
        if (json == null) return defaultVal;
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(true|false)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(json);
        if (m.find()) {
            return Boolean.parseBoolean(m.group(1));
        }
        return defaultVal;
    }

    /**
     * Parses item objects regardless of key ordering ("goodId" before or after "quantity").
     */
    private static List<int[]> extractItemsArray(String json) {
        List<int[]> list = new ArrayList<>();
        if (json == null) return list;

        String scope = json;
        Pattern arrPattern = Pattern.compile("\"items\"\\s*:\\s*\\[(.*?)\\]", Pattern.DOTALL);
        Matcher arrMatcher = arrPattern.matcher(json);
        if (arrMatcher.find()) {
            scope = arrMatcher.group(1);
        }

        Pattern objPattern = Pattern.compile("\\{[^{}]*\\}", Pattern.DOTALL);
        Matcher objMatcher = objPattern.matcher(scope);
        while (objMatcher.find()) {
            String obj = objMatcher.group();
            int goodId = extractInt(obj, "goodId", 0);
            int qty = extractInt(obj, "quantity", 0);
            if (goodId > 0 && qty > 0) {
                list.add(new int[]{goodId, qty});
            }
        }
        return list;
    }

    private static String q(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\")
                       .replace("\"", "\\\"")
                       .replace("\r", "\\r")
                       .replace("\n", "\\n")
                       .replace("\t", "\\t") + "\"";
    }

    private static String userToJson(User u) {
        if (u == null) return "null";
        String rawEmail = u.getRawEmail();
        return "{\"userId\":" + u.getUserId() +
               ",\"username\":" + q(u.getUsername()) +
               ",\"fullName\":" + q(u.getFullName()) +
               ",\"role\":" + q(u.getRole()) +
               ",\"contactInfo\":" + q(u.getContactInfo() != null ? u.getContactInfo() : "") +
               ",\"email\":" + q(rawEmail != null ? rawEmail : "") +
               ",\"isVerified\":" + u.isVerified() + "}";
    }

    private static String usersToJson(List<User> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(userToJson(list.get(i)));
        }
        return sb.append("]").toString();
    }

    private static String eventsToJson(List<DisasterEvent> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            DisasterEvent e = list.get(i);
            sb.append("{\"eventId\":").append(e.getEventId())
              .append(",\"eventName\":").append(q(e.getEventName()))
              .append(",\"location\":").append(q(e.getLocation()))
              .append(",\"status\":").append(q(e.getStatus()))
              .append(",\"startDate\":").append(q(e.getStartDate() != null ? e.getStartDate().toString() : ""))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String inventoryToJson(List<Inventory> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Inventory inv = list.get(i);
            sb.append("{\"inventoryId\":").append(inv.getInventoryId())
              .append(",\"goodId\":").append(inv.getGoodId())
              .append(",\"currentStock\":").append(inv.getCurrentStock())
              .append(",\"itemName\":").append(q(inv.getItemName()))
              .append(",\"category\":").append(q(inv.getCategory()))
              .append(",\"unitOfMeasure\":").append(q(inv.getUnitOfMeasure()))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String goodsToJson(List<ReliefGood> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            ReliefGood g = list.get(i);
            sb.append("{\"goodId\":").append(g.getGoodId())
              .append(",\"itemName\":").append(q(g.getItemName()))
              .append(",\"category\":").append(q(g.getCategory()))
              .append(",\"unitOfMeasure\":").append(q(g.getUnitOfMeasure()))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String donationsToJson(List<Donation> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Donation d = list.get(i);
            sb.append("{\"donationId\":").append(d.getDonationId())
              .append(",\"donorId\":").append(d.getDonorId())
              .append(",\"eventId\":").append(d.getEventId() != null ? d.getEventId() : "null")
              .append(",\"donationDate\":").append(q(d.getDonationDate() != null ? d.getDonationDate().toString() : ""))
              .append(",\"status\":").append(q(d.getStatus()))
              .append(",\"donorName\":").append(q(d.getDonorName()))
              .append(",\"eventName\":").append(q(d.getEventName() != null ? d.getEventName() : "General Relief Fund"))
              .append(",\"items\":[");
            List<DonationItem> items = d.getItems();
            for (int j = 0; j < items.size(); j++) {
                if (j > 0) sb.append(",");
                DonationItem it = items.get(j);
                sb.append("{\"itemId\":").append(it.getItemId())
                  .append(",\"goodId\":").append(it.getGoodId())
                  .append(",\"quantity\":").append(it.getQuantity())
                  .append(",\"itemName\":").append(q(it.getItemName()))
                  .append(",\"category\":").append(q(it.getCategory()))
                  .append(",\"unitOfMeasure\":").append(q(it.getUnitOfMeasure()))
                  .append("}");
            }
            sb.append("]}");
        }
        return sb.append("]").toString();
    }

    private static String requestsToJson(List<ReliefRequest> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            ReliefRequest r = list.get(i);
            sb.append("{\"requestId\":").append(r.getRequestId())
              .append(",\"orgId\":").append(r.getOrgId())
              .append(",\"eventId\":").append(r.getEventId())
              .append(",\"requestDate\":").append(q(r.getRequestDate() != null ? r.getRequestDate().toString() : ""))
              .append(",\"status\":").append(q(r.getStatus()))
              .append(",\"orgName\":").append(q(r.getOrgName()))
              .append(",\"eventName\":").append(q(r.getEventName()))
              .append(",\"items\":[");
            List<RequestItem> items = r.getItems();
            for (int j = 0; j < items.size(); j++) {
                if (j > 0) sb.append(",");
                RequestItem it = items.get(j);
                sb.append("{\"requestItemId\":").append(it.getRequestItemId())
                  .append(",\"goodId\":").append(it.getGoodId())
                  .append(",\"quantity\":").append(it.getQuantity())
                  .append(",\"itemName\":").append(q(it.getItemName()))
                  .append(",\"category\":").append(q(it.getCategory()))
                  .append(",\"unitOfMeasure\":").append(q(it.getUnitOfMeasure()))
                  .append("}");
            }
            sb.append("]}");
        }
        return sb.append("]").toString();
    }

    private static String deliveriesToJson(List<Delivery> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Delivery d = list.get(i);
            sb.append("{\"deliveryId\":").append(d.getDeliveryId())
              .append(",\"requestId\":").append(d.getRequestId())
              .append(",\"volunteerId\":").append(d.getVolunteerId() != null ? d.getVolunteerId() : "null")
              .append(",\"dispatchDate\":").append(q(d.getDispatchDate() != null ? d.getDispatchDate().toString() : ""))
              .append(",\"deliveryStatus\":").append(q(d.getDeliveryStatus()))
              .append(",\"volunteerName\":").append(q(d.getVolunteerName() != null ? d.getVolunteerName() : "Unassigned"))
              .append(",\"volunteerContact\":").append(q(d.getVolunteerContact() != null ? d.getVolunteerContact() : ""))
              .append(",\"vehicleType\":").append(q(d.getVehicleType() != null ? d.getVehicleType() : ""))
              .append(",\"orgName\":").append(q(d.getOrgName()))
              .append(",\"location\":").append(q(d.getLocation()))
              .append(",\"eventName\":").append(q(d.getEventName() != null ? d.getEventName() : ""))
              .append(",\"items\":[");
            List<RequestItem> items = d.getItems();
            for (int j = 0; j < items.size(); j++) {
                if (j > 0) sb.append(",");
                RequestItem it = items.get(j);
                sb.append("{\"requestItemId\":").append(it.getRequestItemId())
                  .append(",\"goodId\":").append(it.getGoodId())
                  .append(",\"quantity\":").append(it.getQuantity())
                  .append(",\"itemName\":").append(q(it.getItemName()))
                  .append(",\"category\":").append(q(it.getCategory()))
                  .append(",\"unitOfMeasure\":").append(q(it.getUnitOfMeasure()))
                  .append("}");
            }
            sb.append("]}");
        }
        return sb.append("]").toString();
    }

    private static String volunteersToJson(List<Volunteer> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Volunteer v = list.get(i);
            sb.append("{\"volunteerId\":").append(v.getVolunteerId())
              .append(",\"userId\":").append(v.getUserId())
              .append(",\"vehicleType\":").append(q(v.getVehicleType()))
              .append(",\"isAvailable\":").append(v.isAvailable())
              .append(",\"volunteerName\":").append(q(v.getVolunteerName()))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String organizationsToJson(List<Organization> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Organization o = list.get(i);
            sb.append("{\"orgId\":").append(o.getOrgId())
              .append(",\"userId\":").append(o.getUserId())
              .append(",\"orgName\":").append(q(o.getOrgName()))
              .append(",\"location\":").append(q(o.getLocation()))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String donorsToJson(List<Donor> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Donor d = list.get(i);
            sb.append("{\"donorId\":").append(d.getDonorId())
              .append(",\"userId\":").append(d.getUserId())
              .append(",\"donorType\":").append(q(d.getDonorType()))
              .append(",\"donorName\":").append(q(d.getDonorName()))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String notificationsToJson(List<Notification> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Notification n = list.get(i);
            sb.append("{\"notificationId\":").append(n.getNotificationId())
              .append(",\"userId\":").append(n.getUserId())
              .append(",\"message\":").append(q(n.getMessage()))
              .append(",\"isRead\":").append(n.isRead())
              .append(",\"dateSent\":").append(q(n.getDateSent() != null ? n.getDateSent().toString() : ""))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String report1ToJson(List<Object[]> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) sb.append(",");
            Object[] r = rows.get(i);
            sb.append("{\"eventId\":").append(r[0])
              .append(",\"eventName\":").append(q(String.valueOf(r[1])))
              .append(",\"location\":").append(q(String.valueOf(r[2])))
              .append(",\"status\":").append(q(String.valueOf(r[3])))
              .append(",\"totalDonations\":").append(r[4])
              .append(",\"totalRequests\":").append(r[5])
              .append(",\"totalDeliveries\":").append(r[6])
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String report2ToJson(List<Object[]> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) sb.append(",");
            Object[] r = rows.get(i);
            sb.append("{\"goodId\":").append(r[0])
              .append(",\"itemName\":").append(q(String.valueOf(r[1])))
              .append(",\"category\":").append(q(String.valueOf(r[2])))
              .append(",\"currentStockFormatted\":").append(q(String.valueOf(r[3])))
              .append(",\"totalDonatedQty\":").append(r[4])
              .append(",\"totalRequestedQty\":").append(r[5])
              .append(",\"stockHealth\":").append(q(String.valueOf(r[6])))
              .append("}");
        }
        return sb.append("]").toString();
    }

    private static String report3ToJson(List<Object[]> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) sb.append(",");
            Object[] r = rows.get(i);
            sb.append("{\"donorId\":").append(r[0])
              .append(",\"donorName\":").append(q(String.valueOf(r[1])))
              .append(",\"donorType\":").append(q(String.valueOf(r[2])))
              .append(",\"contactInfo\":").append(q(r[3] != null ? String.valueOf(r[3]) : ""))
              .append(",\"totalDonations\":").append(r[4])
              .append(",\"eventsSupported\":").append(r[5])
              .append(",\"totalItemsDonated\":").append(r[6])
              .append("}");
        }
        return sb.append("]").toString();
    }
}
