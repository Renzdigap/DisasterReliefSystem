package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.TableRowSorter;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;

public class EmptyStateTable extends JPanel {
    private JTable table;
    private DefaultTableModel tableModel;
    private TableRowSorter<DefaultTableModel> sorter;
    private JTextField txtSearch;
    private JPanel centerPanel;
    private JScrollPane scrollPane;
    private JPanel emptyStatePanel;

    public EmptyStateTable(String[] columns, String emptyStateMessage) {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(BorderFactory.createEmptyBorder(0, 0, 0, 0));

        // Toolbar
        JPanel toolbar = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 0));
        toolbar.setOpaque(false);
        JLabel lblSearch = new JLabel("Search:");
        lblSearch.setFont(UITheme.FONT_BODY);
        lblSearch.setForeground(UITheme.TEXT_SECONDARY);
        toolbar.add(lblSearch);
        
        txtSearch = new JTextField(25);
        UITheme.styleTextField(txtSearch);
        txtSearch.addKeyListener(new KeyAdapter() {
            @Override
            public void keyReleased(KeyEvent e) {
                String text = txtSearch.getText().trim();
                if (text.isEmpty()) sorter.setRowFilter(null);
                else sorter.setRowFilter(RowFilter.regexFilter("(?i)" + text));
            }
        });
        toolbar.add(txtSearch);
        add(toolbar, BorderLayout.NORTH);

        // Table
        tableModel = new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        table = new JTable(tableModel);
        UITheme.styleTable(table);
        table.setDefaultRenderer(Object.class, new StatusBadgeRenderer());
        sorter = new TableRowSorter<>(tableModel);
        table.setRowSorter(sorter);

        scrollPane = new JScrollPane(table);
        UITheme.styleScrollPane(scrollPane);

        // Empty State Panel
        emptyStatePanel = new JPanel(new GridBagLayout());
        emptyStatePanel.setBackground(UITheme.BG_CARD);
        emptyStatePanel.setBorder(BorderFactory.createLineBorder(UITheme.BORDER_SUBTLE));
        
        JLabel lblEmptyIcon = new JLabel("📁"); // Placeholder for an icon
        lblEmptyIcon.setFont(new Font("Segoe UI", Font.PLAIN, 48));
        lblEmptyIcon.setForeground(UITheme.TEXT_MUTED);
        
        JLabel lblEmptyText = new JLabel(emptyStateMessage);
        lblEmptyText.setFont(UITheme.FONT_BODY_BOLD);
        lblEmptyText.setForeground(UITheme.TEXT_SECONDARY);
        
        JPanel emptyInner = new JPanel();
        emptyInner.setLayout(new BoxLayout(emptyInner, BoxLayout.Y_AXIS));
        emptyInner.setOpaque(false);
        lblEmptyIcon.setAlignmentX(Component.CENTER_ALIGNMENT);
        lblEmptyText.setAlignmentX(Component.CENTER_ALIGNMENT);
        emptyInner.add(lblEmptyIcon);
        emptyInner.add(Box.createRigidArea(new Dimension(0, 16)));
        emptyInner.add(lblEmptyText);
        
        emptyStatePanel.add(emptyInner);

        // Center container to swap between table and empty state
        centerPanel = new JPanel(new CardLayout());
        centerPanel.setOpaque(false);
        centerPanel.add(scrollPane, "TABLE");
        centerPanel.add(emptyStatePanel, "EMPTY");

        add(centerPanel, BorderLayout.CENTER);
        
        updateState();
    }

    public DefaultTableModel getTableModel() {
        return tableModel;
    }
    
    public JTable getTable() {
        return table;
    }

    public void updateState() {
        CardLayout cl = (CardLayout) centerPanel.getLayout();
        if (tableModel.getRowCount() == 0) {
            cl.show(centerPanel, "EMPTY");
        } else {
            cl.show(centerPanel, "TABLE");
        }
    }
}
