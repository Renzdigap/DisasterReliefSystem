package disasterrelief.gui.panels;

import disasterrelief.dao.DeliveryDAO;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.Delivery;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class DeliveriesPanel extends JPanel {
    private final DeliveryDAO dao = new DeliveryDAO();
    private EmptyStateTable emptyStateTable;

    public DeliveriesPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);

        JLabel title = new JLabel("Dispatch & Logistics Tracking");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        JPanel header = new JPanel(new BorderLayout());
        header.setOpaque(false);
        JPanel actionPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        actionPanel.setOpaque(false);

        JButton btnMarkDelivered = new disasterrelief.gui.components.CustomButton("Mark Delivered", UITheme.COLOR_SUCCESS, Color.WHITE);
        btnMarkDelivered.addActionListener(e -> updateStatus("Delivered"));

        JButton btnMarkTransit = new disasterrelief.gui.components.CustomButton("Mark In Transit", UITheme.COLOR_WARNING, Color.WHITE);
        btnMarkTransit.addActionListener(e -> updateStatus("In Transit"));

        JButton btnDelete = new disasterrelief.gui.components.CustomButton("Delete", UITheme.COLOR_DANGER, Color.WHITE);
        btnDelete.addActionListener(e -> deleteSelectedDelivery());

        actionPanel.add(btnMarkDelivered);
        actionPanel.add(btnMarkTransit);
        actionPanel.add(btnDelete);
        header.add(actionPanel, BorderLayout.EAST);

        add(header, BorderLayout.NORTH);

        String[] cols = {"Delivery ID", "Request ID", "Organization", "Location", "Volunteer", "Dispatch Date", "Status"};
        emptyStateTable = new EmptyStateTable(cols, "No deliveries dispatched yet.");
        add(emptyStateTable, BorderLayout.CENTER);

        loadData();
    }

    private void updateStatus(String newStatus) {
        JTable table = emptyStateTable.getTable();
        int row = table.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select a delivery record to update.", "Notice", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        int modelRow = table.convertRowIndexToModel(row);
        int deliveryId = Integer.parseInt(emptyStateTable.getTableModel().getValueAt(modelRow, 0).toString());

        boolean ok = dao.updateDeliveryStatus(deliveryId, newStatus);
        if (ok) {
            JOptionPane.showMessageDialog(this, "Delivery #" + deliveryId + " status updated to " + newStatus + " in PostgreSQL.", "Status Updated", JOptionPane.INFORMATION_MESSAGE);
            loadData();
        } else {
            JOptionPane.showMessageDialog(this, "Failed to update delivery status in database.", "Database Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void deleteSelectedDelivery() {
        JTable table = emptyStateTable.getTable();
        int row = table.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select a delivery record to delete.", "Notice", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        int modelRow = table.convertRowIndexToModel(row);
        int deliveryId = Integer.parseInt(emptyStateTable.getTableModel().getValueAt(modelRow, 0).toString());

        int confirm = JOptionPane.showConfirmDialog(
                this,
                "Permanently delete Delivery record #" + deliveryId + " from PostgreSQL?",
                "Confirm Delete",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE
        );
        if (confirm == JOptionPane.YES_OPTION) {
            boolean ok = dao.deleteDelivery(deliveryId);
            if (ok) {
                JOptionPane.showMessageDialog(this, "Delivery #" + deliveryId + " deleted from database.", "Deleted", JOptionPane.INFORMATION_MESSAGE);
                loadData();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to delete delivery from database.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void loadData() {
        DefaultTableModel model = emptyStateTable.getTableModel();
        model.setRowCount(0);
        List<Delivery> list = dao.getAllDeliveries();
        for (Delivery del : list) {
            String volName = del.getVolunteerName() != null ? del.getVolunteerName() : "Unassigned";
            model.addRow(new Object[]{
                del.getDeliveryId(), del.getRequestId(), del.getOrgName(), 
                del.getLocation(), volName, del.getDispatchDate(), del.getDeliveryStatus()
            });
        }
        emptyStateTable.updateState();
    }
}
