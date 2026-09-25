package disasterrelief.gui.forms;

import disasterrelief.dao.DonationDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.sql.Date;

public class NewDonationDialog extends JDialog {
    private boolean saved = false;
    private JTextField txtDonorId, txtEventId, txtDate;

    public NewDonationDialog(Window owner) {
        super(owner, "New Donation", ModalityType.APPLICATION_MODAL);
        initComponents();
        setSize(400, 320);
        setLocationRelativeTo(owner);
    }

    private void initComponents() {
        JPanel panel = new JPanel(new BorderLayout(0, 16));
        panel.setBackground(UITheme.BG_CARD);
        panel.setBorder(new EmptyBorder(24, 24, 24, 24));

        JLabel lblTitle = new JLabel("Log New Donation");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);
        panel.add(lblTitle, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(3, 2, 8, 16));
        form.setOpaque(false);

        JLabel lblDonor = new JLabel("Donor ID:");
        lblDonor.setFont(UITheme.FONT_BODY_BOLD);
        txtDonorId = new JTextField();
        UITheme.styleTextField(txtDonorId);

        JLabel lblEvent = new JLabel("Event ID (Optional):");
        lblEvent.setFont(UITheme.FONT_BODY_BOLD);
        txtEventId = new JTextField();
        UITheme.styleTextField(txtEventId);

        JLabel lblDate = new JLabel("Date (YYYY-MM-DD):");
        lblDate.setFont(UITheme.FONT_BODY_BOLD);
        txtDate = new JTextField(new java.sql.Date(System.currentTimeMillis()).toString());
        UITheme.styleTextField(txtDate);

        form.add(lblDonor);
        form.add(txtDonorId);
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
        btnSave.addActionListener(e -> saveDonation());

        btnPanel.add(btnCancel);
        btnPanel.add(btnSave);
        panel.add(btnPanel, BorderLayout.SOUTH);

        add(panel);
    }

    private void saveDonation() {
        try {
            int donorId = Integer.parseInt(txtDonorId.getText().trim());
            Integer eventId = txtEventId.getText().trim().isEmpty() ? null : Integer.parseInt(txtEventId.getText().trim());
            Date reqDate = Date.valueOf(txtDate.getText().trim());

            DonationDAO dao = new DonationDAO();
            if (dao.insertDonation(donorId, eventId, reqDate) > 0) {
                saved = true;
                JOptionPane.showMessageDialog(this, "Donation logged successfully!");
                dispose();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to log donation.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Invalid input. Please check IDs and Date format.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    public boolean isSaved() {
        return saved;
    }
}
