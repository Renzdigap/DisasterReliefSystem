package disasterrelief.gui.panels;

import disasterrelief.dao.InventoryDAO;
import disasterrelief.gui.components.MasterDetailPanel;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.Inventory;

import javax.swing.*;
import java.awt.*;
import java.util.List;

public class ReliefGoodsPanel extends MasterDetailPanel {

    private final InventoryDAO inventoryDAO = new InventoryDAO();
    private JTextField txtId, txtName, txtCategory, txtUnit, txtStock;

    public ReliefGoodsPanel() {
        super(new String[]{"ID", "Item Name", "Category", "Current Stock", "Unit", "Status"}, "Inventory Item Details");
        initForm();
        loadData();
        
        // Remove default inline-form behavior
        for (java.awt.event.ActionListener al : btnAdd.getActionListeners()) {
            btnAdd.removeActionListener(al);
        }
        // Attach JDialog logic
        btnAdd.addActionListener(e -> {
            disasterrelief.gui.forms.NewReliefGoodDialog dialog = new disasterrelief.gui.forms.NewReliefGoodDialog(SwingUtilities.getWindowAncestor(this));
            dialog.setVisible(true);
            if (dialog.isSaved()) {
                loadData();
            }
        });
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
        txtName = new JTextField();
        txtCategory = new JTextField();
        txtUnit = new JTextField();
        txtStock = new JTextField(); txtStock.setEditable(false);

        UITheme.styleTextField(txtId);
        UITheme.styleTextField(txtName);
        UITheme.styleTextField(txtCategory);
        UITheme.styleTextField(txtUnit);
        UITheme.styleTextField(txtStock);

        gbc.gridx = 0; gbc.gridy = 0; form.add(new JLabel("Inventory ID:"), gbc);
        gbc.gridx = 1; form.add(txtId, gbc);

        gbc.gridx = 0; gbc.gridy = 1; form.add(new JLabel("Item Name:"), gbc);
        gbc.gridx = 1; form.add(txtName, gbc);

        gbc.gridx = 0; gbc.gridy = 2; form.add(new JLabel("Category:"), gbc);
        gbc.gridx = 1; form.add(txtCategory, gbc);

        gbc.gridx = 0; gbc.gridy = 3; form.add(new JLabel("Unit of Measure:"), gbc);
        gbc.gridx = 1; form.add(txtUnit, gbc);

        gbc.gridx = 0; gbc.gridy = 4; form.add(new JLabel("Current Stock:"), gbc);
        gbc.gridx = 1; form.add(txtStock, gbc);

        // This calls the MasterDetailPanel method to inject our form and the Save/Delete/Cancel buttons
        setupFormPanel(form);
    }

    @Override
    protected void loadData() {
        tableModel.setRowCount(0);
        List<Inventory> inventoryList = inventoryDAO.getFullInventory();
        for (Inventory inv : inventoryList) {
            String status = inv.getCurrentStock() == 0 ? "OUT OF STOCK" : (inv.getCurrentStock() < 100 ? "LOW STOCK" : "IN STOCK");
            tableModel.addRow(new Object[]{
                inv.getInventoryId(),
                inv.getItemName(),
                inv.getCategory(),
                inv.getCurrentStock(),
                inv.getUnitOfMeasure(),
                status
            });
        }
    }

    @Override
    protected void onRowSelected() {
        int row = table.getSelectedRow();
        if (row != -1) {
            int modelRow = table.convertRowIndexToModel(row);
            txtId.setText(tableModel.getValueAt(modelRow, 0).toString());
            txtName.setText(tableModel.getValueAt(modelRow, 1).toString());
            txtCategory.setText(tableModel.getValueAt(modelRow, 2).toString());
            txtStock.setText(tableModel.getValueAt(modelRow, 3).toString());
            txtUnit.setText(tableModel.getValueAt(modelRow, 4).toString());
        }
    }

    @Override
    protected void onAddNew() {
        txtId.setText("Auto-Generated");
        txtName.setText("");
        txtCategory.setText("");
        txtUnit.setText("");
        txtStock.setText("0");
    }

    @Override
    protected void onSave() {
        try {
            int invId = Integer.parseInt(txtId.getText().trim());
            int newStock = Integer.parseInt(txtStock.getText().trim());
            boolean success = inventoryDAO.updateStockByInventoryId(invId, newStock);
            if (success) {
                JOptionPane.showMessageDialog(this, "Inventory item #" + invId + " stock updated to " + newStock + " in PostgreSQL.", "Update Successful", JOptionPane.INFORMATION_MESSAGE);
                loadData();
                showForm(false);
            } else {
                JOptionPane.showMessageDialog(this, "Failed to update inventory in database.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Please enter a valid numeric stock quantity.", "Validation Error", JOptionPane.WARNING_MESSAGE);
        }
    }

    @Override
    protected void onDelete() {
        try {
            int invId = Integer.parseInt(txtId.getText().trim());
            int confirm = JOptionPane.showConfirmDialog(
                    this,
                    "Are you sure you want to permanently delete Inventory Item #" + invId + "?",
                    "Confirm SQL Delete",
                    JOptionPane.YES_NO_OPTION,
                    JOptionPane.WARNING_MESSAGE
            );
            if (confirm == JOptionPane.YES_OPTION) {
                boolean success = inventoryDAO.deleteByInventoryId(invId);
                if (success) {
                    JOptionPane.showMessageDialog(this, "Item #" + invId + " deleted successfully from PostgreSQL.", "Delete Successful", JOptionPane.INFORMATION_MESSAGE);
                    loadData();
                    showForm(false);
                } else {
                    JOptionPane.showMessageDialog(this, "Could not delete item from database.", "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Select a valid item record to delete.", "Warning", JOptionPane.WARNING_MESSAGE);
        }
    }
}
