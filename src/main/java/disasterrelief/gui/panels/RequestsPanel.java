package disasterrelief.gui.panels;

import disasterrelief.dao.ReliefRequestDAO;
import disasterrelief.dao.RequestItemDAO;
import disasterrelief.gui.components.MasterDetailPanel;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.ReliefRequest;
import disasterrelief.model.RequestItem;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class RequestsPanel extends MasterDetailPanel {

    private final ReliefRequestDAO requestDAO = new ReliefRequestDAO();
    private final RequestItemDAO requestItemDAO = new RequestItemDAO();
    
    private JTextField txtId, txtOrg, txtEvent, txtDate, txtStatus;
    private JTable itemsTable;
    private DefaultTableModel itemsTableModel;

    public RequestsPanel() {
        super(new String[]{"Req ID", "Organization", "Disaster Event", "Date", "Status"}, "Relief Request Details");
        initForm();
        loadData();
        
        // Remove default inline-form behavior
        for (java.awt.event.ActionListener al : btnAdd.getActionListeners()) {
            btnAdd.removeActionListener(al);
        }
        // Attach JDialog logic
        btnAdd.addActionListener(e -> {
            disasterrelief.gui.forms.NewReliefRequestDialog dialog = new disasterrelief.gui.forms.NewReliefRequestDialog(SwingUtilities.getWindowAncestor(this));
            dialog.setVisible(true);
            if (dialog.isSaved()) {
                loadData();
            }
        });
    }

    private void initForm() {
        JPanel form = new JPanel(new BorderLayout(0, 16));
        form.setOpaque(false);

        // Top Header Info
        JPanel infoPanel = new JPanel(new GridBagLayout());
        infoPanel.setOpaque(false);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(8, 8, 8, 8);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1.0;

        txtId = new JTextField(); txtId.setEditable(false);
        txtOrg = new JTextField(); txtOrg.setEditable(false);
        txtEvent = new JTextField(); txtEvent.setEditable(false);
        txtDate = new JTextField(); txtDate.setEditable(false);
        txtStatus = new JTextField();

        UITheme.styleTextField(txtId);
        UITheme.styleTextField(txtOrg);
        UITheme.styleTextField(txtEvent);
        UITheme.styleTextField(txtDate);
        UITheme.styleTextField(txtStatus);

        gbc.gridx = 0; gbc.gridy = 0; infoPanel.add(new JLabel("Request ID:"), gbc);
        gbc.gridx = 1; infoPanel.add(txtId, gbc);

        gbc.gridx = 0; gbc.gridy = 1; infoPanel.add(new JLabel("Organization:"), gbc);
        gbc.gridx = 1; infoPanel.add(txtOrg, gbc);

        gbc.gridx = 0; gbc.gridy = 2; infoPanel.add(new JLabel("Event Name:"), gbc);
        gbc.gridx = 1; infoPanel.add(txtEvent, gbc);

        gbc.gridx = 0; gbc.gridy = 3; infoPanel.add(new JLabel("Date:"), gbc);
        gbc.gridx = 1; infoPanel.add(txtDate, gbc);

        gbc.gridx = 0; gbc.gridy = 4; infoPanel.add(new JLabel("Status:"), gbc);
        gbc.gridx = 1; infoPanel.add(txtStatus, gbc);

        // Requested Items Split Transaction Sub-Table
        JPanel splitTablePanel = new JPanel(new BorderLayout(0, 8));
        splitTablePanel.setOpaque(false);
        
        JLabel lblItemsTitle = new JLabel("Requested Relief Items");
        lblItemsTitle.setFont(UITheme.FONT_BODY_BOLD);
        lblItemsTitle.setForeground(UITheme.COLOR_PRIMARY);
        splitTablePanel.add(lblItemsTitle, BorderLayout.NORTH);

        itemsTableModel = new DefaultTableModel(new String[]{"Item Name", "Qty", "Unit", "Category"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        itemsTable = new JTable(itemsTableModel);
        UITheme.styleTable(itemsTable);
        JScrollPane scrollPane = new JScrollPane(itemsTable);
        UITheme.styleScrollPane(scrollPane);
        scrollPane.setPreferredSize(new Dimension(0, 150));
        splitTablePanel.add(scrollPane, BorderLayout.CENTER);

        form.add(infoPanel, BorderLayout.NORTH);
        form.add(splitTablePanel, BorderLayout.CENTER);

        setupFormPanel(form);
    }

    @Override
    protected void loadData() {
        tableModel.setRowCount(0);
        List<ReliefRequest> requests = requestDAO.getAllRequests();
        for (ReliefRequest req : requests) {
            tableModel.addRow(new Object[]{
                req.getRequestId(),
                req.getOrgName(),
                req.getEventName(),
                req.getRequestDate(),
                req.getStatus()
            });
        }
    }

    @Override
    protected void onRowSelected() {
        int row = table.getSelectedRow();
        if (row != -1) {
            int modelRow = table.convertRowIndexToModel(row);
            int reqId = Integer.parseInt(tableModel.getValueAt(modelRow, 0).toString());

            txtId.setText(String.valueOf(reqId));
            txtOrg.setText(tableModel.getValueAt(modelRow, 1).toString());
            txtEvent.setText(tableModel.getValueAt(modelRow, 2).toString());
            txtDate.setText(tableModel.getValueAt(modelRow, 3).toString());
            txtStatus.setText(tableModel.getValueAt(modelRow, 4).toString());

            // ⚡ Split Transaction Logic: Fetch child RequestItems for this ReliefRequest
            itemsTableModel.setRowCount(0);
            List<RequestItem> items = requestItemDAO.getItemsByRequestId(reqId);
            for (RequestItem item : items) {
                itemsTableModel.addRow(new Object[]{
                    item.getItemName(),
                    item.getQuantity(),
                    item.getUnitOfMeasure(),
                    item.getCategory()
                });
            }
        }
    }

    @Override
    protected void onAddNew() {
        txtId.setText("Auto-Generated");
        txtOrg.setText("");
        txtEvent.setText("");
        txtDate.setText("YYYY-MM-DD");
        txtStatus.setText("PENDING");
        itemsTableModel.setRowCount(0);
    }

    @Override
    protected void onSave() {
        try {
            int reqId = Integer.parseInt(txtId.getText().trim());
            String newStatus = txtStatus.getText().trim();
            boolean success = requestDAO.updateRequestStatus(reqId, newStatus);
            if (success) {
                JOptionPane.showMessageDialog(this, "Relief Request #" + reqId + " status updated to '" + newStatus + "' in PostgreSQL.", "Update Successful", JOptionPane.INFORMATION_MESSAGE);
                loadData();
                showForm(false);
            } else {
                JOptionPane.showMessageDialog(this, "Failed to update request in database.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Invalid request ID.", "Validation Error", JOptionPane.WARNING_MESSAGE);
        }
    }

    @Override
    protected void onDelete() {
        try {
            int reqId = Integer.parseInt(txtId.getText().trim());
            int confirm = JOptionPane.showConfirmDialog(
                    this,
                    "Are you sure you want to permanently delete Relief Request #" + reqId + " and all requested items?",
                    "Confirm SQL Delete",
                    JOptionPane.YES_NO_OPTION,
                    JOptionPane.WARNING_MESSAGE
            );
            if (confirm == JOptionPane.YES_OPTION) {
                boolean success = requestDAO.deleteRequest(reqId);
                if (success) {
                    JOptionPane.showMessageDialog(this, "Relief Request #" + reqId + " successfully deleted from PostgreSQL.", "Delete Successful", JOptionPane.INFORMATION_MESSAGE);
                    loadData();
                    showForm(false);
                } else {
                    JOptionPane.showMessageDialog(this, "Could not delete relief request from database.", "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Select a valid request record to delete.", "Warning", JOptionPane.WARNING_MESSAGE);
        }
    }
}
