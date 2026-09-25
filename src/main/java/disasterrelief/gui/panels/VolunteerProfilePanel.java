package disasterrelief.gui.panels;

import disasterrelief.dao.UserDAO;
import disasterrelief.dao.VolunteerDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.User;
import disasterrelief.model.Volunteer;
import disasterrelief.utils.FormUtils;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * Data-entry profile panel for Field Volunteers.
 * Allows volunteers to update their availability status and contact info
 * with live PostgreSQL database synchronization.
 */
public class VolunteerProfilePanel extends JPanel {

    private final UserDAO userDAO = new UserDAO();
    private final VolunteerDAO volunteerDAO = new VolunteerDAO();

    // Read-only account fields
    private JTextField txtUserId;
    private JTextField txtUsername;
    private JTextField txtFullName;
    private JTextField txtRole;

    // Editable volunteer fields
    private JTextField txtContact;
    private JComboBox<String> cmbAvailability;
    private JComboBox<String> cmbVehicle;

    // Status label
    private JLabel lblCurrentStatusBadge;

    public VolunteerProfilePanel() {
        setLayout(new BorderLayout());
        setOpaque(false);
        setBorder(new EmptyBorder(20, 24, 24, 24));

        initUI();
        loadData();
    }

    private void initUI() {
        JPanel scrollContainer = new JPanel();
        scrollContainer.setLayout(new BoxLayout(scrollContainer, BoxLayout.Y_AXIS));
        scrollContainer.setOpaque(false);

        // 1. Header Banner
        scrollContainer.add(FormUtils.createSectionHeader(
                "Field Volunteer Profile",
                "Manage your availability status, transportation capabilities, and emergency contact details"
        ));

        // 2. Main Form Card
        JPanel card = FormUtils.createCardContainer();

        // Account Details Section
        JLabel lblSection1 = new JLabel("Account Information (Read-Only)");
        lblSection1.setFont(UITheme.FONT_HEADER_MID);
        lblSection1.setForeground(UITheme.TEXT_PRIMARY);
        lblSection1.setAlignmentX(Component.LEFT_ALIGNMENT);
        card.add(lblSection1);
        card.add(Box.createRigidArea(new Dimension(0, 14)));

        // Read-only Grid
        JPanel readOnlyGrid = new JPanel(new GridLayout(2, 2, 16, 0));
        readOnlyGrid.setOpaque(false);
        readOnlyGrid.setAlignmentX(Component.LEFT_ALIGNMENT);
        readOnlyGrid.setMaximumSize(new Dimension(Integer.MAX_VALUE, 140));

        txtUserId = new JTextField();
        txtUserId.setEditable(false);
        readOnlyGrid.add(FormUtils.createFormField("User ID", txtUserId));

        txtUsername = new JTextField();
        txtUsername.setEditable(false);
        readOnlyGrid.add(FormUtils.createFormField("Username", txtUsername));

        txtFullName = new JTextField();
        txtFullName.setEditable(false);
        readOnlyGrid.add(FormUtils.createFormField("Full Name", txtFullName));

        txtRole = new JTextField();
        txtRole.setEditable(false);
        readOnlyGrid.add(FormUtils.createFormField("System Role", txtRole));

        card.add(readOnlyGrid);
        card.add(Box.createRigidArea(new Dimension(0, 16)));

        // Section Divider
        JSeparator sep = new JSeparator();
        sep.setForeground(UITheme.BORDER_SUBTLE);
        sep.setMaximumSize(new Dimension(Integer.MAX_VALUE, 2));
        sep.setAlignmentX(Component.LEFT_ALIGNMENT);
        card.add(sep);
        card.add(Box.createRigidArea(new Dimension(0, 16)));

        // Operational Dispatch Settings Section
        JLabel lblSection2 = new JLabel("Emergency Dispatch & Availability Settings");
        lblSection2.setFont(UITheme.FONT_HEADER_MID);
        lblSection2.setForeground(UITheme.TEXT_PRIMARY);
        lblSection2.setAlignmentX(Component.LEFT_ALIGNMENT);
        card.add(lblSection2);
        card.add(Box.createRigidArea(new Dimension(0, 14)));

        // Contact Number Field
        txtContact = new JTextField();
        card.add(FormUtils.createFormField(
                "Contact Number *",
                txtContact,
                "Format: 0917-123-4567, +63 917 123 4567, or 7-15 numerical digits"
        ));

        // Availability ComboBox
        cmbAvailability = new JComboBox<>(new String[]{
                "Available for Immediate Dispatch (Active)",
                "Unavailable / Off-Duty (Busy)"
        });
        UITheme.styleComboBox(cmbAvailability, UITheme.COLOR_PRIMARY);
        card.add(FormUtils.createFormField(
                "Deployment Availability Status *",
                cmbAvailability,
                "Determines whether logistics officers can assign you to relief delivery routes"
        ));

        // Vehicle Mode ComboBox
        cmbVehicle = new JComboBox<>(new String[]{
                "Truck",
                "Van",
                "Pickup / 4x4",
                "Motorcycle",
                "Bicycle",
                "On Foot / Walking",
                "Boat / Watercraft",
                "Other"
        });
        UITheme.styleComboBox(cmbVehicle, UITheme.COLOR_PRIMARY);
        card.add(FormUtils.createFormField(
                "Vehicle / Transportation Mode",
                cmbVehicle,
                "Primary vehicle used for delivering aid goods to disaster areas"
        ));

        card.add(Box.createRigidArea(new Dimension(0, 10)));

        // Action Buttons
        CustomButton btnReset = new CustomButton("Reset", UITheme.BG_CARD, UITheme.COLOR_SLATE);
        btnReset.setPreferredSize(new Dimension(100, 38));
        btnReset.addActionListener(e -> loadData());

        CustomButton btnSave = new CustomButton("Save Profile", UITheme.COLOR_SUCCESS, Color.WHITE);
        btnSave.setPreferredSize(new Dimension(140, 38));
        btnSave.addActionListener(e -> saveProfile());

        card.add(FormUtils.createButtonGroup(btnReset, btnSave));

        scrollContainer.add(card);
        scrollContainer.add(Box.createVerticalGlue());

        JScrollPane scrollPane = new JScrollPane(scrollContainer);
        scrollPane.setBorder(null);
        scrollPane.setOpaque(false);
        scrollPane.getViewport().setOpaque(false);
        scrollPane.getVerticalScrollBar().setUnitIncrement(16);

        add(scrollPane, BorderLayout.CENTER);
    }

    /**
     * Loads the authenticated user's profile and volunteer dispatch settings from PostgreSQL.
     */
    public void loadData() {
        User currentUser = SessionManager.getCurrentUser();
        if (currentUser == null) {
            return;
        }

        int userId = currentUser.getId();

        // 1. Fetch fresh User record from database
        User dbUser = userDAO.getUserById(userId);
        if (dbUser != null) {
            txtUserId.setText(String.valueOf(dbUser.getUserId()));
            txtUsername.setText(dbUser.getUsername());
            txtFullName.setText(dbUser.getFullName());
            txtRole.setText(dbUser.getRole());
            txtContact.setText(dbUser.getContactInfo() != null ? dbUser.getContactInfo() : "");
        } else {
            txtUserId.setText(String.valueOf(currentUser.getUserId()));
            txtUsername.setText(currentUser.getUsername());
            txtFullName.setText(currentUser.getFullName());
            txtRole.setText(currentUser.getRole());
            txtContact.setText(currentUser.getContactInfo() != null ? currentUser.getContactInfo() : "");
        }

        // 2. Fetch fresh Volunteer record from database
        Volunteer volunteer = volunteerDAO.getVolunteerByUserId(userId);
        if (volunteer != null) {
            if (volunteer.isAvailable()) {
                cmbAvailability.setSelectedIndex(0); // Available
            } else {
                cmbAvailability.setSelectedIndex(1); // Unavailable
            }

            if (volunteer.getVehicleType() != null) {
                for (int i = 0; i < cmbVehicle.getItemCount(); i++) {
                    if (cmbVehicle.getItemAt(i).equalsIgnoreCase(volunteer.getVehicleType())) {
                        cmbVehicle.setSelectedIndex(i);
                        break;
                    }
                }
            }
        } else {
            cmbAvailability.setSelectedIndex(0);
        }
    }

    /**
     * Validates user inputs and executes SQL UPDATE statements against PostgreSQL.
     */
    private void saveProfile() {
        User currentUser = SessionManager.getCurrentUser();
        if (currentUser == null) {
            FormUtils.showError(this, "No active session found. Please log in again.", "Session Error");
            return;
        }

        int userId = currentUser.getId();
        String contact = txtContact.getText().trim();
        boolean isAvailable = (cmbAvailability.getSelectedIndex() == 0);
        String vehicle = (String) cmbVehicle.getSelectedItem();

        // 1. Basic validation for contact number
        if (!FormUtils.validateContactNumber(contact)) {
            FormUtils.showError(
                    this,
                    "Invalid contact number format.\nPlease enter a valid telephone/mobile number containing 7 to 15 digits (e.g., 0917-123-4567 or +63 917 123 4567).",
                    "Validation Error"
            );
            txtContact.requestFocus();
            return;
        }

        // 2. Execute SQL UPDATE via UserDAO for contact info
        boolean userUpdated = userDAO.updateContactInfo(userId, contact);

        // 3. Execute SQL UPDATE / UPSERT via VolunteerDAO for availability and vehicle
        boolean volunteerUpdated = volunteerDAO.saveOrUpdateVolunteer(userId, vehicle, isAvailable);

        if (userUpdated && volunteerUpdated) {
            // Update in-memory session object
            currentUser.setContactInfo(contact);

            FormUtils.showSuccess(
                    this,
                    "Your volunteer profile and dispatch availability have been successfully updated!",
                    "Profile Updated"
            );
            loadData();
        } else {
            FormUtils.showError(
                    this,
                    "An error occurred while saving your profile changes to the database. Please try again.",
                    "Database Error"
            );
        }
    }
}
