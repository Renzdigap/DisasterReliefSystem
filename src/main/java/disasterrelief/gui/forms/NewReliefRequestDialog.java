package disasterrelief.gui.forms;

import disasterrelief.dao.ReliefRequestDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.sql.Date;

public class NewReliefRequestDialog extends JDialog {
    private boolean saved = false;
    private JTextField txtOrgId, txtEventId, txtDate;

    public NewReliefRequestDialog(Window owner) {
        super(owner, "New Relief Request", ModalityType.APPLICATION_MODAL);
        initComponents();
        setSize(400, 320);
        setLocationRelativeTo(owner);
    }

    private void initComponents() {
        JPanel panel = new JPanel(new BorderLayout(0, 16));
        panel.setBackground(UITheme.BG_CARD);
        panel.setBorder(new EmptyBorder(24, 24, 24, 24));

        JLabel lblTitle = new JLabel("Create Relief Request");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);
        panel.add(lblTitle, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(3, 2, 8, 16));
        form.setOpaque(false);

        JLabel lblOrg = new JLabel("Organization ID:");
        lblOrg.setFont(UITheme.FONT_BODY_BOLD);
        txtOrgId = new JTextField();
        UITheme.styleTextField(txtOrgId);

        JLabel lblEvent = new JLabel("Disaster Event ID:");
        lblEvent.setFont(UITheme.FONT_BODY_BOLD);
        txtEventId = new JTextField();
        UITheme.styleTextField(txtEventId);

        JLabel lblDate = new JLabel("Date (YYYY-MM-DD):");
        lblDate.setFont(UITheme.FONT_BODY_BOLD);
        txtDate = new JTextField(new java.sql.Date(System.currentTimeMillis()).toString());
        UITheme.styleTextField(txtDate);

        form.add(lblOrg);
        form.add(txtOrgId);
        form.add(lblEvent);
        form.add(txtEventId);
        form.add(lblDate);
        form.add(txtDate);
        panel.add(form, BorderLayout.CENTER);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        btnPanel.setOpaque(false);
        CustomButton btnCancel = new CustomButton("Cancel", UITheme.COLOR_SLATE, Color.WHITE);
        CustomButton btnSave = new CustomButton("Submit", UITheme.COLOR_PRIMARY, Color.WHITE);

        btnCancel.addActionListener(e -> dispose());
        btnSave.addActionListener(e -> saveRequest());

        btnPanel.add(btnCancel);
        btnPanel.add(btnSave);
        panel.add(btnPanel, BorderLayout.SOUTH);

        add(panel);
    }

    private void saveRequest() {
        try {
            int orgId = Integer.parseInt(txtOrgId.getText().trim());
            int eventId = Integer.parseInt(txtEventId.getText().trim());
            Date reqDate = Date.valueOf(txtDate.getText().trim());

            ReliefRequestDAO dao = new ReliefRequestDAO();
            if (dao.insertRequest(orgId, eventId, reqDate) > 0) {
                saved = true;
                JOptionPane.showMessageDialog(this, "Relief Request submitted successfully!");
                dispose();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to submit request.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Invalid input. Please check IDs and Date format.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    public boolean isSaved() {
        return saved;
    }
}
