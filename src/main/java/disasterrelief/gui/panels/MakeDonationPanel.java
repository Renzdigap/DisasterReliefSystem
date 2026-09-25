package disasterrelief.gui.panels;

import disasterrelief.dao.DisasterEventDAO;
import disasterrelief.dao.DonationDAO;
import disasterrelief.dao.DonationItemDAO;
import disasterrelief.dao.DonorDAO;
import disasterrelief.dao.ReliefGoodDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.DisasterEvent;
import disasterrelief.model.Donor;
import disasterrelief.model.ReliefGood;
import disasterrelief.model.User;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

public class MakeDonationPanel extends JPanel {
    private JComboBox<String> cmbEvents;
    private List<DisasterEvent> eventsList;
    
    private JComboBox<String> cmbGoods;
    private List<ReliefGood> goodsList;
    private JTextField txtQuantity;
    
    private DefaultTableModel itemsModel;
    private JTable itemsTable;
    
    private List<LineItem> pendingItems = new ArrayList<>();

    private static class LineItem {
        int goodId;
        String goodName;
        int quantity;
    }

    public MakeDonationPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 16, 16, 16));

        // Title
        JLabel title = new JLabel("Make a Donation");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);
        add(title, BorderLayout.NORTH);

        JPanel centerPanel = new JPanel(new BorderLayout(0, 16));
        centerPanel.setOpaque(false);

        // Header Form (Event Selection)
        JPanel headerForm = new JPanel(new FlowLayout(FlowLayout.LEFT, 16, 0));
        headerForm.setOpaque(false);
        headerForm.add(new JLabel("Target Disaster Event (Optional):"));
        
        cmbEvents = new JComboBox<>();
        UITheme.styleComboBox(cmbEvents, UITheme.COLOR_PRIMARY);
        cmbEvents.addItem("None (General Fund / Pool)");
        
        eventsList = new DisasterEventDAO().getAllEvents();
        for (DisasterEvent ev : eventsList) {
            cmbEvents.addItem(ev.getEventId() + " - " + ev.getEventName());
        }
        headerForm.add(cmbEvents);
        centerPanel.add(headerForm, BorderLayout.NORTH);

        // Items Table
        JPanel itemsPanel = new JPanel(new BorderLayout(0, 8));
        itemsPanel.setOpaque(false);
        itemsPanel.setBorder(BorderFactory.createTitledBorder("Donation Items"));

        itemsModel = new DefaultTableModel(new String[]{"Good ID", "Item Name", "Quantity"}, 0) {
            @Override public boolean isCellEditable(int row, int col) { return false; }
        };
        itemsTable = new JTable(itemsModel);
        UITheme.styleTable(itemsTable);
        JScrollPane scrollPane = new JScrollPane(itemsTable);
        scrollPane.setPreferredSize(new Dimension(0, 200));
        UITheme.styleScrollPane(scrollPane);
        itemsPanel.add(scrollPane, BorderLayout.CENTER);

        // Add Item Form
        JPanel addItemForm = new JPanel(new FlowLayout(FlowLayout.LEFT, 16, 8));
        addItemForm.setOpaque(false);
        
        cmbGoods = new JComboBox<>();
        UITheme.styleComboBox(cmbGoods, UITheme.COLOR_PRIMARY);
        goodsList = new ReliefGoodDAO().getAllGoods();
        for (ReliefGood rg : goodsList) {
            cmbGoods.addItem(rg.getGoodId() + " - " + rg.getItemName() + " (" + rg.getCategory() + ")");
        }
        
        txtQuantity = new JTextField(10);
        UITheme.styleTextField(txtQuantity);
        
        CustomButton btnAddItem = new CustomButton("Add Item", UITheme.COLOR_SLATE, Color.WHITE);
        btnAddItem.addActionListener(e -> addItemToTable());

        addItemForm.add(new JLabel("Select Item:"));
        addItemForm.add(cmbGoods);
        addItemForm.add(new JLabel("Quantity:"));
        addItemForm.add(txtQuantity);
        addItemForm.add(btnAddItem);
        
        itemsPanel.add(addItemForm, BorderLayout.SOUTH);
        centerPanel.add(itemsPanel, BorderLayout.CENTER);

        // Bottom Submit
        JPanel bottomPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomPanel.setOpaque(false);
        CustomButton btnSubmit = new CustomButton("Submit Donation", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnSubmit.addActionListener(e -> submitDonation());
        bottomPanel.add(btnSubmit);
        
        add(centerPanel, BorderLayout.CENTER);
        add(bottomPanel, BorderLayout.SOUTH);
    }

    private void addItemToTable() {
        int idx = cmbGoods.getSelectedIndex();
        if (idx < 0) return;
        ReliefGood good = goodsList.get(idx);
        
        try {
            int qty = Integer.parseInt(txtQuantity.getText().trim());
            if (qty <= 0) throw new NumberFormatException();
            
            LineItem item = new LineItem();
            item.goodId = good.getGoodId();
            item.goodName = good.getItemName();
            item.quantity = qty;
            
            pendingItems.add(item);
            itemsModel.addRow(new Object[]{item.goodId, item.goodName, item.quantity});
            txtQuantity.setText("");
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Please enter a valid positive quantity.", "Invalid Input", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void submitDonation() {
        if (pendingItems.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please add at least one item to your donation.", "Empty Donation", JOptionPane.WARNING_MESSAGE);
            return;
        }
        
        User activeUser = SessionManager.getCurrentUser();
        if (activeUser == null) {
            JOptionPane.showMessageDialog(this, "Session expired.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }
        
        Donor donor = new DonorDAO().getDonorByUserId(activeUser.getUserId());
        if (donor == null) {
            JOptionPane.showMessageDialog(this, "You are not registered as a Donor.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        Integer eventId = null;
        int evIdx = cmbEvents.getSelectedIndex();
        if (evIdx > 0) { // 0 is "None"
            eventId = eventsList.get(evIdx - 1).getEventId();
        }

        Date today = new Date(System.currentTimeMillis());
        
        DonationDAO donationDAO = new DonationDAO();
        int donationId = donationDAO.insertDonation(donor.getDonorId(), eventId, today);
        
        if (donationId > 0) {
            DonationItemDAO itemDAO = new DonationItemDAO();
            for (LineItem li : pendingItems) {
                itemDAO.insertDonationItem(donationId, li.goodId, li.quantity);
            }
            JOptionPane.showMessageDialog(this, "Thank you! Your donation (ID: " + donationId + ") has been submitted.");
            
            // Reset form
            pendingItems.clear();
            itemsModel.setRowCount(0);
            cmbEvents.setSelectedIndex(0);
            cmbGoods.setSelectedIndex(0);
            txtQuantity.setText("");
        } else {
            JOptionPane.showMessageDialog(this, "Failed to submit donation.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
