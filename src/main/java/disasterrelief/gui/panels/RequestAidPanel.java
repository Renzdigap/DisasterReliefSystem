package disasterrelief.gui.panels;

import disasterrelief.dao.DisasterEventDAO;
import disasterrelief.dao.OrganizationDAO;
import disasterrelief.dao.ReliefGoodDAO;
import disasterrelief.dao.ReliefRequestDAO;
import disasterrelief.dao.RequestItemDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.DisasterEvent;
import disasterrelief.model.Organization;
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

public class RequestAidPanel extends JPanel {
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

    public RequestAidPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 16, 16, 16));

        // Title
        JLabel title = new JLabel("Request Relief Aid");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);
        add(title, BorderLayout.NORTH);

        JPanel centerPanel = new JPanel(new BorderLayout(0, 16));
        centerPanel.setOpaque(false);

        // Header Form (Event Selection)
        JPanel headerForm = new JPanel(new FlowLayout(FlowLayout.LEFT, 16, 0));
        headerForm.setOpaque(false);
        headerForm.add(new JLabel("Target Disaster Event:"));
        
        cmbEvents = new JComboBox<>();
        UITheme.styleComboBox(cmbEvents, UITheme.COLOR_PRIMARY);
        
        eventsList = new DisasterEventDAO().getAllEvents();
        for (DisasterEvent ev : eventsList) {
            cmbEvents.addItem(ev.getEventId() + " - " + ev.getEventName());
        }
        headerForm.add(cmbEvents);
        centerPanel.add(headerForm, BorderLayout.NORTH);

        // Items Table
        JPanel itemsPanel = new JPanel(new BorderLayout(0, 8));
        itemsPanel.setOpaque(false);
        itemsPanel.setBorder(BorderFactory.createTitledBorder("Requested Items"));

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
        CustomButton btnSubmit = new CustomButton("Submit Request", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnSubmit.addActionListener(e -> submitRequest());
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

    private void submitRequest() {
        if (pendingItems.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please request at least one item.", "Empty Request", JOptionPane.WARNING_MESSAGE);
            return;
        }
        
        User activeUser = SessionManager.getCurrentUser();
        if (activeUser == null) {
            JOptionPane.showMessageDialog(this, "Session expired.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }
        
        Organization org = new OrganizationDAO().getOrganizationByUserId(activeUser.getUserId());
        if (org == null) {
            JOptionPane.showMessageDialog(this, "You are not registered as an Organization.\nOnly Organizations can request aid.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        int evIdx = cmbEvents.getSelectedIndex();
        if (evIdx < 0) {
            JOptionPane.showMessageDialog(this, "Please select a disaster event.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }
        int eventId = eventsList.get(evIdx).getEventId();

        Date today = new Date(System.currentTimeMillis());
        
        ReliefRequestDAO requestDAO = new ReliefRequestDAO();
        int requestId = requestDAO.insertRequest(org.getOrgId(), eventId, today);
        
        if (requestId > 0) {
            RequestItemDAO itemDAO = new RequestItemDAO();
            for (LineItem li : pendingItems) {
                itemDAO.insertRequestItem(requestId, li.goodId, li.quantity);
            }
            JOptionPane.showMessageDialog(this, "Your aid request (ID: " + requestId + ") has been successfully submitted.");
            
            // Reset form
            pendingItems.clear();
            itemsModel.setRowCount(0);
            cmbEvents.setSelectedIndex(0);
            cmbGoods.setSelectedIndex(0);
            txtQuantity.setText("");
        } else {
            JOptionPane.showMessageDialog(this, "Failed to submit request.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
