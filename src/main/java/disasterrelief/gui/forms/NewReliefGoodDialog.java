package disasterrelief.gui.forms;

import disasterrelief.dao.InventoryDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public class NewReliefGoodDialog extends JDialog {
    private boolean saved = false;
    private JTextField txtName, txtUnit, txtStock;
    private JComboBox<String> cmbCategory;

    public NewReliefGoodDialog(Window owner) {
        super(owner, "Add Relief Good", ModalityType.APPLICATION_MODAL);
        initComponents();
        setSize(400, 360);
        setLocationRelativeTo(owner);
    }

    private void initComponents() {
        JPanel panel = new JPanel(new BorderLayout(0, 16));
        panel.setBackground(UITheme.BG_CARD);
        panel.setBorder(new EmptyBorder(24, 24, 24, 24));

        JLabel lblTitle = new JLabel("Add Catalog Item");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);
        panel.add(lblTitle, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(4, 2, 8, 16));
        form.setOpaque(false);

        JLabel lblName = new JLabel("Item Name:");
        lblName.setFont(UITheme.FONT_BODY_BOLD);
        txtName = new JTextField();
        UITheme.styleTextField(txtName);

        JLabel lblCat = new JLabel("Category:");
        lblCat.setFont(UITheme.FONT_BODY_BOLD);
        cmbCategory = new JComboBox<>(new String[]{"Food", "Water", "Medical", "Shelter", "Clothing", "Fund"});
        UITheme.styleComboBox(cmbCategory, UITheme.COLOR_PRIMARY);

        JLabel lblUnit = new JLabel("Unit of Measure:");
        lblUnit.setFont(UITheme.FONT_BODY_BOLD);
        txtUnit = new JTextField("e.g. Boxes, Bottles, USD");
        UITheme.styleTextField(txtUnit);

        JLabel lblStock = new JLabel("Initial Stock:");
        lblStock.setFont(UITheme.FONT_BODY_BOLD);
        txtStock = new JTextField("0");
        UITheme.styleTextField(txtStock);

        form.add(lblName);
        form.add(txtName);
        form.add(lblCat);
        form.add(cmbCategory);
        form.add(lblUnit);
        form.add(txtUnit);
        form.add(lblStock);
        form.add(txtStock);
        panel.add(form, BorderLayout.CENTER);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        btnPanel.setOpaque(false);
        CustomButton btnCancel = new CustomButton("Cancel", UITheme.COLOR_SLATE, Color.WHITE);
        CustomButton btnSave = new CustomButton("Add Item", UITheme.COLOR_PRIMARY, Color.WHITE);

        btnCancel.addActionListener(e -> dispose());
        btnSave.addActionListener(e -> saveItem());

        btnPanel.add(btnCancel);
        btnPanel.add(btnSave);
        panel.add(btnPanel, BorderLayout.SOUTH);

        add(panel);
    }

    private void saveItem() {
        try {
            String name = txtName.getText().trim();
            String cat = cmbCategory.getSelectedItem().toString();
            String unit = txtUnit.getText().trim();
            int stock = Integer.parseInt(txtStock.getText().trim());

            if (name.isEmpty() || unit.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Name and Unit are required.", "Input Required", JOptionPane.WARNING_MESSAGE);
                return;
            }

            InventoryDAO dao = new InventoryDAO();
            if (dao.insertInventoryItem(name, cat, unit, stock)) {
                saved = true;
                JOptionPane.showMessageDialog(this, "Item added to catalog successfully!");
                dispose();
            } else {
                JOptionPane.showMessageDialog(this, "Failed to add item.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Invalid stock value. Must be a number.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    public boolean isSaved() {
        return saved;
    }
}
