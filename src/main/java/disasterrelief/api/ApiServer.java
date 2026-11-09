package disasterrelief.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import disasterrelief.dao.*;
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
 * Connects Next.js TypeScript Frontend (Vercel) to Supabase PostgreSQL 15 via JDBC DAOs & Atomic Transactions.
 */
public class ApiServer {

    private static final UserDAO userDAO = new UserDAO();
    private static final DonorDAO donorDAO = new DonorDAO();
    private static final OrganizationDAO orgDAO = new OrganizationDAO();
    private static final VolunteerDAO volunteerDAO = new VolunteerDAO();
    private static final DisasterEventDAO eventDAO = new DisasterEventDAO();
    private static final ReliefGoodDAO goodDAO = new ReliefGoodDAO();
    private static final InventoryDAO inventoryDAO = new InventoryDAO();
    private static final DonationDAO donationDAO = new DonationDAO();
    private static final DonationItemDAO donationItemDAO = new DonationItemDAO();
    private static final ReliefRequestDAO requestDAO = new ReliefRequestDAO();
    private static final RequestItemDAO requestItemDAO = new RequestItemDAO();
    private static final DeliveryDAO deliveryDAO = new DeliveryDAO();
    private static final NotificationDAO notificationDAO = new NotificationDAO();
    private static final DashboardDAO dashboardDAO = new DashboardDAO();
    private static final ReportDAO reportDAO = new ReportDAO();

    public static void main(String[] args) throws IOException {
        String portEnv = System.getenv("PORT");
        int port = (portEnv != null && !portEnv.isEmpty()) ? Integer.parseInt(portEnv) : 8080;

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newCachedThreadPool());

        server.createContext("/api/health", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                try (Connection conn = DatabaseConnection.getConnection()) {
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

                if (username == null || password == null) {
                    sendJson(ex, 400, "{\"error\":\"Username and password are required.\"}");
                    return;
                }

                User user = userDAO.getUserByUsername(username.trim());
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

                StringBuilder sb = new StringBuilder();
                sb.append("{\"user\":").append(userToJson(user));

                if ("Donor".equalsIgnoreCase(user.getRole())) {
                    Donor d = donorDAO.getDonorByUserId(user.getUserId());
                    if (d != null) sb.append(",\"donorId\":").append(d.getDonorId()).append(",\"donorType\":").append(q(d.getDonorType()));
                } else if ("Organization".equalsIgnoreCase(user.getRole())) {
                    Organization o = orgDAO.getOrganizationByUserId(user.getUserId());
                    if (o != null) sb.append(",\"orgId\":").append(o.getOrgId()).append(",\"orgName\":").append(q(o.getOrgName())).append(",\"location\":").append(q(o.getLocation()));
                } else if ("Volunteer".equalsIgnoreCase(user.getRole())) {
                    Volunteer v = volunteerDAO.getVolunteerByUserId(user.getUserId());
                    if (v != null) sb.append(",\"volunteerId\":").append(v.getVolunteerId()).append(",\"vehicleType\":").append(q(v.getVehicleType())).append(",\"isAvailable\":").append(v.isAvailable());
                }
                sb.append("}");
                sendJson(ex, 200, sb.toString());
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
                String role = extractString(body, "role");
                String donorType = extractString(body, "donorType");
                String orgName = extractString(body, "orgName");
                String location = extractString(body, "location");
                String vehicleType = extractString(body, "vehicleType");

                if (username == null || password == null || fullName == null || role == null) {
                    sendJson(ex, 400, "{\"error\":\"Missing required registration fields.\"}");
                    return;
                }

                try (Connection conn = DatabaseConnection.getConnection()) {
                    conn.setAutoCommit(false);
                    try {
                        // Golden Record Duplicate Check
                        try (PreparedStatement dupUser = conn.prepareStatement("SELECT user_id FROM UserAccount WHERE LOWER(username) = LOWER(?)")) {
                            dupUser.setString(1, username.trim());
                            try (ResultSet rs = dupUser.executeQuery()) {
                                if (rs.next()) {
                                    conn.rollback();
                                    sendJson(ex, 409, "{\"error\":\"Username already exists in Master Registry.\"}");
                                    return;
                                }
                            }
                        }

                        if ("Organization".equalsIgnoreCase(role) && orgName != null) {
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
                            insUser.setString(1, username.trim());
                            insUser.setString(2, hash);
                            insUser.setString(3, role.trim());
                            insUser.setString(4, fullName.trim());
                            insUser.setString(5, contactInfo != null ? contactInfo.trim() : "");
                            try (ResultSet rs = insUser.executeQuery()) {
                                rs.next();
                                userId = rs.getInt(1);
                            }
                        }

                        if ("Donor".equalsIgnoreCase(role)) {
                            try (PreparedStatement insDonor = conn.prepareStatement("INSERT INTO Donor (user_id, donor_type) VALUES (?, ?)")) {
                                insDonor.setInt(1, userId);
                                insDonor.setString(2, (donorType != null && !donorType.isEmpty()) ? donorType : "Individual");
                                insDonor.executeUpdate();
                            }
                        } else if ("Organization".equalsIgnoreCase(role)) {
                            try (PreparedStatement insOrg = conn.prepareStatement("INSERT INTO Organization (user_id, org_name, location) VALUES (?, ?, ?)")) {
                                insOrg.setInt(1, userId);
                                insOrg.setString(2, (orgName != null && !orgName.isEmpty()) ? orgName.trim() : fullName.trim());
                                insOrg.setString(3, location != null ? location.trim() : "Metro Manila");
                                insOrg.executeUpdate();
                            }
                        } else if ("Volunteer".equalsIgnoreCase(role)) {
                            try (PreparedStatement insVol = conn.prepareStatement("INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES (?, ?, true)")) {
                                insVol.setInt(1, userId);
                                insVol.setString(2, (vehicleType != null && !vehicleType.isEmpty()) ? vehicleType.trim() : "Van");
                                insVol.executeUpdate();
                            }
                        }

                        try (PreparedStatement insNotif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                            insNotif.setInt(1, userId);
                            insNotif.setString(2, "Welcome to DRRMS! Your " + role + " account has been verified under RA 10173 Data Privacy guidelines.");
                            insNotif.executeUpdate();
                        }

                        conn.commit();
                        User created = userDAO.getUserById(userId);
                        sendJson(ex, 201, "{\"user\":" + userToJson(created) + ",\"message\":\"Account registered successfully.\"}");
                    } catch (Exception e) {
                        conn.rollback();
                        throw e;
                    }
                }
            }
        });

        // Consolidated Admin & Public Overview endpoint
        server.createContext("/api/admin/overview", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                Map<String, Integer> metrics = dashboardDAO.getDashboardMetrics();
                int completedDeliveries = dashboardDAO.getCompletedDeliveriesCount();
                int reliefGoodsCount = dashboardDAO.getReliefGoodsCount();

                List<DisasterEvent> events = eventDAO.getAllEvents();
                List<Inventory> inventory = inventoryDAO.getFullInventory();
                List<ReliefGood> goods = goodDAO.getAllGoods();
                List<Donation> donations = donationDAO.getAllDonations();
                for (Donation d : donations) {
                    d.setItems(donationItemDAO.getItemsByDonationId(d.getDonationId()));
                }
                List<ReliefRequest> requests = requestDAO.getAllRequests();
                for (ReliefRequest r : requests) {
                    r.setItems(requestItemDAO.getItemsByRequestId(r.getRequestId()));
                }
                List<Delivery> deliveries = deliveryDAO.getAllDeliveries();
                List<Volunteer> volunteers = volunteerDAO.getAllVolunteers();
                List<Organization> organizations = orgDAO.getAllOrganizations();
                List<Donor> donors = donorDAO.getAllDonors();
                List<User> users = userDAO.getAllUsers();
                List<Notification> notifications = notificationDAO.getAllNotifications();

                List<Object[]> report1 = reportDAO.getDisasterOperationalSummary();
                List<Object[]> report2 = reportDAO.getInventoryStockHealthReport();
                List<Object[]> report3 = reportDAO.getDonorImpactLedger();

                StringBuilder sb = new StringBuilder("{");
                sb.append("\"metrics\":{")
                  .append("\"activeDisasters\":").append(metrics.getOrDefault("activeDisasters", 0)).append(",")
                  .append("\"totalDonations\":").append(metrics.getOrDefault("totalDonations", 0)).append(",")
                  .append("\"pendingRequests\":").append(metrics.getOrDefault("pendingRequests", 0)).append(",")
                  .append("\"registeredVolunteers\":").append(metrics.getOrDefault("registeredVolunteers", 0)).append(",")
                  .append("\"completedDeliveries\":").append(completedDeliveries).append(",")
                  .append("\"reliefGoodsCount\":").append(reliefGoodsCount)
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
                sb.append("\"notifications\":").append(notificationsToJson(notifications.subList(0, Math.min(30, notifications.size())))).append(",");
                sb.append("\"reports\":{")
                  .append("\"operationalSummary\":").append(report1ToJson(report1)).append(",")
                  .append("\"inventoryHealth\":").append(report2ToJson(report2)).append(",")
                  .append("\"donorImpact\":").append(report3ToJson(report3))
                  .append("}");
                sb.append("}");
                sendJson(ex, 200, sb.toString());
            }
        });

        // Donor Portal Data
        server.createContext("/api/portal/donor", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = Integer.parseInt(params.getOrDefault("userId", "0"));
                User user = userDAO.getUserById(userId);
                Donor donor = donorDAO.getDonorByUserId(userId);
                List<Donation> myDonations = donationDAO.getDonationsByUserId(userId);
                for (Donation d : myDonations) {
                    d.setItems(donationItemDAO.getItemsByDonationId(d.getDonationId()));
                }
                List<DisasterEvent> events = eventDAO.getAllEvents();
                List<ReliefGood> goods = goodDAO.getAllGoods();
                List<Inventory> inventory = inventoryDAO.getFullInventory();
                List<Notification> notifications = notificationDAO.getNotificationsForUser(userId);

                StringBuilder sb = new StringBuilder("{");
                sb.append("\"user\":").append(userToJson(user)).append(",");
                sb.append("\"donor\":").append(donor != null ? "{\"donorId\":" + donor.getDonorId() + ",\"userId\":" + donor.getUserId() + ",\"donorType\":" + q(donor.getDonorType()) + "}" : "null").append(",");
                sb.append("\"donations\":").append(donationsToJson(myDonations)).append(",");
                sb.append("\"events\":").append(eventsToJson(events)).append(",");
                sb.append("\"goods\":").append(goodsToJson(goods)).append(",");
                sb.append("\"inventory\":").append(inventoryToJson(inventory)).append(",");
                sb.append("\"notifications\":").append(notificationsToJson(notifications));
                sb.append("}");
                sendJson(ex, 200, sb.toString());
            }
        });

        // Organization Portal Data
        server.createContext("/api/portal/organization", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = Integer.parseInt(params.getOrDefault("userId", "0"));
                User user = userDAO.getUserById(userId);
                Organization org = orgDAO.getOrganizationByUserId(userId);
                List<ReliefRequest> myRequests = requestDAO.getRequestsByUserId(userId);
                for (ReliefRequest r : myRequests) {
                    r.setItems(requestItemDAO.getItemsByRequestId(r.getRequestId()));
                }
                List<Delivery> allDeliveries = deliveryDAO.getAllDeliveries();
                Set<Integer> myReqIds = new HashSet<>();
                for (ReliefRequest r : myRequests) myReqIds.add(r.getRequestId());
                List<Delivery> myDeliveries = new ArrayList<>();
                for (Delivery d : allDeliveries) {
                    if (myReqIds.contains(d.getRequestId())) myDeliveries.add(d);
                }

                List<DisasterEvent> events = eventDAO.getAllEvents();
                List<ReliefGood> goods = goodDAO.getAllGoods();
                List<Inventory> inventory = inventoryDAO.getFullInventory();
                List<Notification> notifications = notificationDAO.getNotificationsForUser(userId);

                StringBuilder sb = new StringBuilder("{");
                sb.append("\"user\":").append(userToJson(user)).append(",");
                sb.append("\"organization\":").append(org != null ? "{\"orgId\":" + org.getOrgId() + ",\"userId\":" + org.getUserId() + ",\"orgName\":" + q(org.getOrgName()) + ",\"location\":" + q(org.getLocation()) + "}" : "null").append(",");
                sb.append("\"requests\":").append(requestsToJson(myRequests)).append(",");
                sb.append("\"deliveries\":").append(deliveriesToJson(myDeliveries)).append(",");
                sb.append("\"events\":").append(eventsToJson(events)).append(",");
                sb.append("\"goods\":").append(goodsToJson(goods)).append(",");
                sb.append("\"inventory\":").append(inventoryToJson(inventory)).append(",");
                sb.append("\"notifications\":").append(notificationsToJson(notifications));
                sb.append("}");
                sendJson(ex, 200, sb.toString());
            }
        });

        // Volunteer Portal Data
        server.createContext("/api/portal/volunteer", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                int userId = Integer.parseInt(params.getOrDefault("userId", "0"));
                User user = userDAO.getUserById(userId);
                Volunteer vol = volunteerDAO.getVolunteerByUserId(userId);
                List<Delivery> myDeliveries = deliveryDAO.getDeliveriesByUserId(userId);
                List<DisasterEvent> events = eventDAO.getAllEvents();
                List<Notification> notifications = notificationDAO.getNotificationsForUser(userId);

                StringBuilder sb = new StringBuilder("{");
                sb.append("\"user\":").append(userToJson(user)).append(",");
                sb.append("\"volunteer\":").append(vol != null ? "{\"volunteerId\":" + vol.getVolunteerId() + ",\"userId\":" + vol.getUserId() + ",\"vehicleType\":" + q(vol.getVehicleType()) + ",\"isAvailable\":" + vol.isAvailable() + ",\"volunteerName\":" + q(vol.getVolunteerName()) + "}" : "null").append(",");
                sb.append("\"deliveries\":").append(deliveriesToJson(myDeliveries)).append(",");
                sb.append("\"events\":").append(eventsToJson(events)).append(",");
                sb.append("\"notifications\":").append(notificationsToJson(notifications));
                sb.append("}");
                sendJson(ex, 200, sb.toString());
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
                    List<int[]> items = extractItemsArray(body);

                    if (items.isEmpty()) {
                        sendJson(ex, 400, "{\"error\":\"At least one donation item is required.\"}");
                        return;
                    }

                    Donor donor = donorDAO.getDonorByUserId(userId);
                    if (donor == null) {
                        sendJson(ex, 400, "{\"error\":\"Donor profile not found for userId.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
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
                                notifStmt.setString(2, "Donation Pledge #" + donationId + " (" + items.size() + " item types) recorded and awaiting Steward verification.");
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
                    String status = extractString(body, "status");

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String prevStatus = "";
                            int donorId = 0;
                            try (PreparedStatement check = conn.prepareStatement("SELECT status, donor_id FROM Donation WHERE donation_id = ?")) {
                                check.setInt(1, donationId);
                                try (ResultSet rs = check.executeQuery()) {
                                    if (rs.next()) {
                                        prevStatus = rs.getString("status");
                                        donorId = rs.getInt("donor_id");
                                    }
                                }
                            }

                            try (PreparedStatement upd = conn.prepareStatement("UPDATE Donation SET status = ? WHERE donation_id = ?")) {
                                upd.setString(1, status);
                                upd.setInt(2, donationId);
                                upd.executeUpdate();
                            }

                            // If transitioning to Approved, atomically credit Inventory stock!
                            if ("Approved".equalsIgnoreCase(status) && !"Approved".equalsIgnoreCase(prevStatus)) {
                                List<DonationItem> items = donationItemDAO.getItemsByDonationId(donationId);
                                for (DonationItem item : items) {
                                    try (PreparedStatement invUpd = conn.prepareStatement(
                                            "INSERT INTO Inventory (good_id, current_stock) VALUES (?, ?) " +
                                            "ON CONFLICT (good_id) DO UPDATE SET current_stock = Inventory.current_stock + EXCLUDED.current_stock")) {
                                        invUpd.setInt(1, item.getGoodId());
                                        invUpd.setInt(2, item.getQuantity());
                                        invUpd.executeUpdate();
                                    }
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
                                            notif.setString(2, "Your Donation #" + donationId + " status has been updated to: " + status + ".");
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
                    int id = Integer.parseInt(params.getOrDefault("id", "0"));
                    boolean ok = donationDAO.deleteDonation(id);
                    sendJson(ex, 200, "{\"deleted\":" + ok + "}");
                }
            }
        });

        // Relief Requests CRUD & Atomic Split-Transaction + Stock Deduction
        server.createContext("/api/requests", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String method = ex.getRequestMethod();
                if ("POST".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int userId = extractInt(body, "userId", 0);
                    int eventId = extractInt(body, "eventId", 1);
                    List<int[]> items = extractItemsArray(body);

                    if (items.isEmpty()) {
                        sendJson(ex, 400, "{\"error\":\"At least one requested relief item is required.\"}");
                        return;
                    }

                    Organization org = orgDAO.getOrganizationByUserId(userId);
                    if (org == null) {
                        sendJson(ex, 400, "{\"error\":\"Organization profile not found for userId.\"}");
                        return;
                    }

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
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
                                notifStmt.setString(2, "Relief Request #" + requestId + " submitted for event #" + eventId + " and queued for Steward review.");
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
                    String status = extractString(body, "status");

                    try (Connection conn = DatabaseConnection.getConnection()) {
                        conn.setAutoCommit(false);
                        try {
                            String prevStatus = "";
                            int orgId = 0;
                            try (PreparedStatement check = conn.prepareStatement("SELECT status, org_id FROM ReliefRequest WHERE request_id = ?")) {
                                check.setInt(1, requestId);
                                try (ResultSet rs = check.executeQuery()) {
                                    if (rs.next()) {
                                        prevStatus = rs.getString("status");
                                        orgId = rs.getInt("org_id");
                                    }
                                }
                            }

                            // When transitioning from Pending to Approved, deduct warehouse stock atomically
                            if ("Approved".equalsIgnoreCase(status) && "Pending".equalsIgnoreCase(prevStatus)) {
                                List<RequestItem> items = requestItemDAO.getItemsByRequestId(requestId);
                                for (RequestItem item : items) {
                                    try (PreparedStatement deduct = conn.prepareStatement(
                                            "UPDATE Inventory SET current_stock = GREATEST(0, current_stock - ?) WHERE good_id = ?")) {
                                        deduct.setInt(1, item.getQuantity());
                                        deduct.setInt(2, item.getGoodId());
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
                                            notif.setString(2, "Relief Request #" + requestId + " status updated to: " + status + ".");
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
                    int id = Integer.parseInt(params.getOrDefault("id", "0"));
                    boolean ok = requestDAO.deleteRequest(id);
                    sendJson(ex, 200, "{\"deleted\":" + ok + "}");
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
                    String status = extractString(body, "deliveryStatus");
                    if (status == null || status.isEmpty()) status = "In Transit";

                    boolean ok = deliveryDAO.insertDelivery(requestId, volunteerId, java.sql.Date.valueOf(LocalDate.now()), status);
                    if (ok && volunteerId != null) {
                        try (Connection conn = DatabaseConnection.getConnection();
                             PreparedStatement ps = conn.prepareStatement("SELECT user_id FROM Volunteer WHERE volunteer_id = ?")) {
                            ps.setInt(1, volunteerId);
                            try (ResultSet rs = ps.executeQuery()) {
                                if (rs.next()) {
                                    int volUserId = rs.getInt(1);
                                    try (PreparedStatement notif = conn.prepareStatement("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, false)")) {
                                        notif.setInt(1, volUserId);
                                        notif.setString(2, "New Dispatch Assignment: You have been assigned to Relief Request #" + requestId + ".");
                                        notif.executeUpdate();
                                    }
                                }
                            }
                        }
                    }
                    sendJson(ex, 201, "{\"created\":" + ok + "}");
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int deliveryId = extractInt(body, "deliveryId", 0);
                    String status = extractString(body, "deliveryStatus");
                    boolean ok = deliveryDAO.updateDeliveryStatus(deliveryId, status);
                    if (ok && "Delivered".equalsIgnoreCase(status)) {
                        try (Connection conn = DatabaseConnection.getConnection();
                             PreparedStatement ps = conn.prepareStatement(
                                     "UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = (SELECT request_id FROM Delivery WHERE delivery_id = ?)")) {
                            ps.setInt(1, deliveryId);
                            ps.executeUpdate();
                        }
                    }
                    sendJson(ex, 200, "{\"updated\":" + ok + "}");
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = Integer.parseInt(params.getOrDefault("id", "0"));
                    boolean ok = deliveryDAO.deleteDelivery(id);
                    sendJson(ex, 200, "{\"deleted\":" + ok + "}");
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
                    String status = extractString(body, "status");
                    String dateStr = extractString(body, "startDate");
                    java.sql.Date startDate = (dateStr != null && !dateStr.isEmpty())
                            ? java.sql.Date.valueOf(dateStr)
                            : java.sql.Date.valueOf(LocalDate.now());
                    boolean ok = eventDAO.insertEvent(name, loc, status != null ? status : "Active", startDate);
                    sendJson(ex, 201, "{\"created\":" + ok + "}");
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int eventId = extractInt(body, "eventId", 0);
                    String status = extractString(body, "status");
                    boolean ok = eventDAO.updateEventStatus(eventId, status);
                    sendJson(ex, 200, "{\"updated\":" + ok + "}");
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = Integer.parseInt(params.getOrDefault("id", "0"));
                    boolean ok = eventDAO.deleteEvent(id);
                    sendJson(ex, 200, "{\"deleted\":" + ok + "}");
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
                    boolean ok = inventoryDAO.insertInventoryItem(itemName, category, unit, initialStock);
                    sendJson(ex, 201, "{\"created\":" + ok + "}");
                } else if ("PUT".equalsIgnoreCase(method)) {
                    String body = readBody(ex);
                    int inventoryId = extractInt(body, "inventoryId", 0);
                    int newStock = extractInt(body, "currentStock", 0);
                    boolean ok = inventoryDAO.updateStockByInventoryId(inventoryId, newStock);
                    sendJson(ex, 200, "{\"updated\":" + ok + "}");
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    Map<String, String> params = parseQuery(ex.getRequestURI().getRawQuery());
                    int id = Integer.parseInt(params.getOrDefault("id", "0"));
                    boolean ok = inventoryDAO.deleteByInventoryId(id);
                    sendJson(ex, 200, "{\"deleted\":" + ok + "}");
                }
            }
        });

        // Volunteer Profile & Availability Update
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

                if (fullName != null && contactInfo != null) {
                    userDAO.updateUserProfile(userId, fullName, contactInfo);
                }
                boolean ok = volunteerDAO.saveOrUpdateVolunteer(userId, vehicleType != null ? vehicleType : "Van", isAvailable);
                sendJson(ex, 200, "{\"updated\":" + ok + "}");
            }
        });

        // Mark Notification as Read
        server.createContext("/api/notifications/read", new BaseHandler() {
            @Override
            protected void handleRequest(HttpExchange ex) throws Exception {
                String body = readBody(ex);
                int notificationId = extractInt(body, "notificationId", 0);
                notificationDAO.markAsRead(notificationId);
                sendJson(ex, 200, "{\"ok\":true}");
            }
        });

        server.start();
        System.out.println("==================================================================");
        System.out.println("DRRMS Java JDBC REST Server running on http://0.0.0.0:" + port);
        System.out.println("Connected to Supabase PostgreSQL 15 via JDBC PreparedStatement DAOs");
        System.out.println("==================================================================");
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
            return m.group(1).replace("\\\"", "\"").replace("\\n", "\n").replace("\\\\", "\\");
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
            return Integer.parseInt(m.group(1));
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

    private static List<int[]> extractItemsArray(String json) {
        List<int[]> list = new ArrayList<>();
        if (json == null) return list;
        Pattern p = Pattern.compile("\\{[^{}]*\"goodId\"\\s*:\\s*(\\d+)[^{}]*\"quantity\"\\s*:\\s*(\\d+)[^{}]*\\}");
        Matcher m = p.matcher(json);
        while (m.find()) {
            int goodId = Integer.parseInt(m.group(1));
            int qty = Integer.parseInt(m.group(2));
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
        return "{\"userId\":" + u.getUserId() +
               ",\"username\":" + q(u.getUsername()) +
               ",\"fullName\":" + q(u.getFullName()) +
               ",\"role\":" + q(u.getRole()) +
               ",\"contactInfo\":" + q(u.getContactInfo()) + "}";
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
              .append(",\"orgName\":").append(q(d.getOrgName()))
              .append(",\"location\":").append(q(d.getLocation()))
              .append("}");
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
              .append(",\"contactInfo\":").append(q(String.valueOf(r[3])))
              .append(",\"totalDonations\":").append(r[4])
              .append(",\"eventsSupported\":").append(r[5])
              .append(",\"totalItemsDonated\":").append(r[6])
              .append("}");
        }
        return sb.append("]").toString();
    }
}
