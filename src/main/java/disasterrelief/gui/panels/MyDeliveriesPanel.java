package disasterrelief.gui.panels;

import disasterrelief.dao.DeliveryDAO;
import disasterrelief.gui.components.MasterDetailPanel;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.Delivery;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import java.awt.*;
import java.util.List;

public class MyDeliveriesPanel extends MasterDetailPanel {

    private final DeliveryDAO dao = new DeliveryDAO();
    private JTextField txtId, txtReqId, txtOrg, txtLoc, txtStatus;

    public MyDeliveriesPanel() {
        super(new String[]{"Delivery ID", "Request ID", "Organization", "Location", "Dispatch Date", "Status"}, "Delivery Details");
        initForm();
        loadData();
        
        btnAdd.setVisible(false);
        btnDelete.setVisible(false);
        btnSave.setVisible(false);
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
        txtReqId = new JTextField(); txtReqId.setEditable(false);
        txtOrg = new JTextField(); txtOrg.setEditable(false);
        txtLoc = new JTextField(); txtLoc.setEditable(false);
        txtStatus = new JTextField(); txtStatus.setEditable(false);

        UITheme.styleTextField(txtId);
        UITheme.styleTextField(txtReqId);
        UITheme.styleTextField(txtOrg);
        UITheme.styleTextField(txtLoc);
        UITheme.styleTextField(txtStatus);

        gbc.gridx = 0; gbc.gridy = 0; form.add(new JLabel("Delivery ID:"), gbc);
        gbc.gridx = 1; form.add(txtId, gbc);

        gbc.gridx = 0; gbc.gridy = 1; form.add(new JLabel("Request ID:"), gbc);
        gbc.gridx = 1; form.add(txtReqId, gbc);

        gbc.gridx = 0; gbc.gridy = 2; form.add(new JLabel("Organization:"), gbc);
        gbc.gridx = 1; form.add(txtOrg, gbc);

        gbc.gridx = 0; gbc.gridy = 3; form.add(new JLabel("Destination:"), gbc);
        gbc.gridx = 1; form.add(txtLoc, gbc);

        gbc.gridx = 0; gbc.gridy = 4; form.add(new JLabel("Status:"), gbc);
        gbc.gridx = 1; form.add(txtStatus, gbc);

        setupFormPanel(form);
    }

    @Override
    protected void onRowSelected() {
        int row = table.getSelectedRow();
        if (row != -1) {
            int modelRow = table.convertRowIndexToModel(row);
            txtId.setText(tableModel.getValueAt(modelRow, 0).toString());
            txtReqId.setText(tableModel.getValueAt(modelRow, 1).toString());
            txtOrg.setText(tableModel.getValueAt(modelRow, 2).toString());
            txtLoc.setText(tableModel.getValueAt(modelRow, 3).toString());
            txtStatus.setText(tableModel.getValueAt(modelRow, 5).toString());
        }
    }

    @Override
    protected void onAddNew() {
        // Not used
    }

    @Override
    protected void onSave() {
        // Read-only module
    }

    @Override
    protected void onDelete() {
        // Read-only module
    }

    @Override
    protected void loadData() {
        tableModel.setRowCount(0);
        if (SessionManager.getCurrentUser() == null) return;
        List<Delivery> deliveries = dao.getDeliveriesByUserId(SessionManager.getCurrentUser().getId());
        
        for (Delivery del : deliveries) {
            tableModel.addRow(new Object[]{
                del.getDeliveryId(),
                del.getRequestId(),
                del.getOrgName(),
                del.getLocation(),
                del.getDispatchDate(),
                del.getDeliveryStatus()
            });
        }
    }
}
