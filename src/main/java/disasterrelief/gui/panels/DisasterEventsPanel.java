package disasterrelief.gui.panels;

import disasterrelief.dao.DisasterEventDAO;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.DisasterEvent;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class DisasterEventsPanel extends JPanel {
    private final DisasterEventDAO dao = new DisasterEventDAO();
    private EmptyStateTable emptyStateTable;

    public DisasterEventsPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);

        JLabel title = new JLabel("Disaster Events Management");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        JPanel header = new JPanel(new BorderLayout());
        header.setOpaque(false);
        JPanel actionPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        actionPanel.setOpaque(false);

        JButton btnAdd = new disasterrelief.gui.components.CustomButton("+ New Event", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnAdd.addActionListener(e -> addNewEvent());

        JButton btnToggleStatus = new disasterrelief.gui.components.CustomButton("Toggle Status", UITheme.COLOR_WARNING, Color.WHITE);
        btnToggleStatus.addActionListener(e -> toggleEventStatus());

        JButton btnDelete = new disasterrelief.gui.components.CustomButton("Delete", UITheme.COLOR_DANGER, Color.WHITE);
        btnDelete.addActionListener(e -> deleteSelectedEvent());

        actionPanel.add(btnAdd);
        actionPanel.add(btnToggleStatus);
        actionPanel.add(btnDelete);
        header.add(actionPanel, BorderLayout.EAST);

        add(header, BorderLayout.NORTH);

        String[] cols = {"Event ID", "Name", "Location", "Start Date", "Status"};
        emptyStateTable = new EmptyStateTable(cols, "No active disaster events found.");
        add(emptyStateTable, BorderLayout.CENTER);

        loadData();
    }

    private void addNewEvent() {
        JTextField txtName = new JTextField();
        JTextField txtLoc = new JTextField();
        JComboBox<String> cmbStatus = new JComboBox<>(new String[]{"Active", "Resolved"});

        Object[] msg = {
            "Disaster Event Name:", txtName,
            "Affected Location:", txtLoc,
            "Initial Status:", cmbStatus
        };

        int opt = JOptionPane.showConfirmDialog(this, msg, "Create New Disaster Event", JOptionPane.OK_CANCEL_OPTION);
        if (opt == JOptionPane.OK_OPTION) {
            String name = txtName.getText().trim();
            String loc = txtLoc.getText().trim();
            String status = (String) cmbStatus.getSelectedItem();

            if (name.isEmpty() || loc.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Event name and location cannot be empty.", "Validation Error", JOptionPane.WARNING_MESSAGE);
                return;
            }

            boolean ok = dao.insertEvent(name, loc, status, new java.sql.Date(System.currentTimeMillis()));
            if (ok) {
                JOptionPane.showMessageDialog(this, "Disaster event created successfully in PostgreSQL!", "Success", JOptionPane.INFORMATION_MESSAGE);
                loadData();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to insert event into database.", "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void toggleEventStatus() {
        JTable table = emptyStateTable.getTable();
        int row = table.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select an event row to toggle status.", "Notice", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        int modelRow = table.convertRowIndexToModel(row);
        int eventId = Integer.parseInt(emptyStateTable.getTableModel().getValueAt(modelRow, 0).toString());
        String currentStatus = emptyStateTable.getTableModel().getValueAt(modelRow, 4).toString();
        String nextStatus = "Active".equalsIgnoreCase(currentStatus) ? "Resolved" : "Active";

        boolean ok = dao.updateEventStatus(eventId, nextStatus);
        if (ok) {
            JOptionPane.showMessageDialog(this, "Event #" + eventId + " status updated to " + nextStatus + "!", "Status Updated", JOptionPane.INFORMATION_MESSAGE);
            loadData();
        } else {
            JOptionPane.showMessageDialog(this, "Failed to update event status.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void deleteSelectedEvent() {
        JTable table = emptyStateTable.getTable();
        int row = table.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select an event row to delete.", "Notice", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        int modelRow = table.convertRowIndexToModel(row);
        int eventId = Integer.parseInt(emptyStateTable.getTableModel().getValueAt(modelRow, 0).toString());

        int confirm = JOptionPane.showConfirmDialog(
                this,
                "Are you sure you want to delete Disaster Event #" + eventId + "?",
                "Confirm Delete",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE
        );
        if (confirm == JOptionPane.YES_OPTION) {
            boolean ok = dao.deleteEvent(eventId);
            if (ok) {
                JOptionPane.showMessageDialog(this, "Disaster event #" + eventId + " deleted from PostgreSQL.", "Deleted", JOptionPane.INFORMATION_MESSAGE);
                loadData();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to delete event.", "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void loadData() {
        DefaultTableModel model = emptyStateTable.getTableModel();
        model.setRowCount(0);
        List<DisasterEvent> list = dao.getAllEvents();
        for (DisasterEvent ev : list) {
            model.addRow(new Object[]{
                ev.getEventId(), ev.getEventName(), ev.getLocation(), ev.getStartDate(), ev.getStatus()
            });
        }
        emptyStateTable.updateState();
    }
}
