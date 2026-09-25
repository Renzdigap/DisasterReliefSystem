package disasterrelief.gui.panels;

import disasterrelief.dao.UserDAO;
import disasterrelief.gui.components.MasterDetailPanel;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.User;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import java.awt.*;
import java.util.Collections;
import java.util.List;

public class ProfilePanel extends MasterDetailPanel {

    private JTextField txtId, txtUsername, txtFullName, txtRole, txtContact;
    private final UserDAO userDAO = new UserDAO();

    public ProfilePanel() {
        super(new String[]{"User ID", "Username", "Full Name", "Role"}, "My Profile");
        initForm();
        loadData();
        
        btnAdd.setVisible(false);
        btnDelete.setVisible(false);
        btnSave.setVisible(true);
        btnSave.setText("Save Changes");
    }

    private void initForm() {
        JPanel form = new JPanel(new GridBagLayout());
        form.setOpaque(false);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(8, 8, 8, 8);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1.0;

        txtId = new JTextField(); txtId.setEditable(false);
        txtUsername = new JTextField(); txtUsername.setEditable(false);
        txtFullName = new JTextField(); txtFullName.setEditable(false);
        txtRole = new JTextField(); txtRole.setEditable(false);
        txtContact = new JTextField(); txtContact.setEditable(true);

        UITheme.styleTextField(txtId);
        UITheme.styleTextField(txtUsername);
        UITheme.styleTextField(txtFullName);
        UITheme.styleTextField(txtRole);
        UITheme.styleTextField(txtContact);

        gbc.gridx = 0; gbc.gridy = 0; form.add(new JLabel("User ID:"), gbc);
        gbc.gridx = 1; form.add(txtId, gbc);

        gbc.gridx = 0; gbc.gridy = 1; form.add(new JLabel("Username:"), gbc);
        gbc.gridx = 1; form.add(txtUsername, gbc);

        gbc.gridx = 0; gbc.gridy = 2; form.add(new JLabel("Full Name:"), gbc);
        gbc.gridx = 1; form.add(txtFullName, gbc);

        gbc.gridx = 0; gbc.gridy = 3; form.add(new JLabel("Role:"), gbc);
        gbc.gridx = 1; form.add(txtRole, gbc);

        gbc.gridx = 0; gbc.gridy = 4; form.add(new JLabel("Contact Number:"), gbc);
        gbc.gridx = 1; form.add(txtContact, gbc);

        setupFormPanel(form);
    }

    @Override
    protected void onRowSelected() {
        int row = table.getSelectedRow();
        if (row != -1) {
            User u = SessionManager.getCurrentUser();
            if (u != null) {
                User dbUser = userDAO.getUserById(u.getId());
                if (dbUser != null) {
                    u = dbUser;
                }
                txtId.setText(String.valueOf(u.getUserId()));
                txtUsername.setText(u.getUsername());
                txtFullName.setText(u.getFullName());
                txtRole.setText(u.getRole());
                txtContact.setText(u.getContactInfo() != null ? u.getContactInfo() : "");
            }
        }
    }

    @Override
    protected void onAddNew() {}

    @Override
    protected void onSave() {
        User active = SessionManager.getCurrentUser();
        if (active == null) {
            disasterrelief.utils.FormUtils.showError(this, "No active session found.", "Session Error");
            return;
        }

        String contact = txtContact.getText().trim();
        if (!disasterrelief.utils.FormUtils.validateContactNumber(contact)) {
            disasterrelief.utils.FormUtils.showError(this, "Please enter a valid contact number (7-15 digits, e.g. 0917-123-4567).", "Validation Error");
            txtContact.requestFocus();
            return;
        }

        boolean success = userDAO.updateContactInfo(active.getId(), contact);
        if (success) {
            active.setContactInfo(contact);
            disasterrelief.utils.FormUtils.showSuccess(this, "Profile contact information updated successfully in PostgreSQL.", "Profile Saved");
            loadData();
            showForm(false);
        } else {
            disasterrelief.utils.FormUtils.showError(this, "Failed to update profile. Please check database connection.", "Database Error");
        }
    }

    @Override
    protected void onDelete() {}

    @Override
    protected void loadData() {
        tableModel.setRowCount(0);
        User active = SessionManager.getCurrentUser();
        if (active != null) {
            tableModel.addRow(new Object[]{
                active.getUserId(),
                active.getUsername(),
                active.getFullName(),
                active.getRole()
            });
        }
    }
}
