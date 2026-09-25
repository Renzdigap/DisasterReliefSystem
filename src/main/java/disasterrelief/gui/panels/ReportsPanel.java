package disasterrelief.gui.panels;

import disasterrelief.dao.ReportDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

/**
 * Operational Reports Panel providing multi-report generation and tabular analytics.
 * Satisfies the Phase 1 requirement to generate at least three (3) meaningful operational reports.
 */
public class ReportsPanel extends JPanel {

    private final ReportDAO reportDAO = new ReportDAO();

    private JComboBox<String> cmbReportType;
    private JLabel lblReportDescription;
    private EmptyStateTable reportTable;

    public ReportsPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 20, 20, 20));

        // 1. Header & Controls
        add(createHeaderPanel(), BorderLayout.NORTH);

        // 2. Initial Tabular View
        String[] initialCols = {"Event ID", "Disaster Name", "Location", "Status", "Donations", "Aid Requests", "Deliveries"};
        reportTable = new EmptyStateTable(initialCols, "Generating operational report from PostgreSQL...");
        add(reportTable, BorderLayout.CENTER);

        // Generate default Report 1 on load
        generateSelectedReport();
    }

    private JPanel createHeaderPanel() {
        JPanel header = new JPanel(new BorderLayout(0, 12));
        header.setOpaque(false);

        // Title Block
        JPanel titleBlock = new JPanel();
        titleBlock.setLayout(new BoxLayout(titleBlock, BoxLayout.Y_AXIS));
        titleBlock.setOpaque(false);

        JLabel title = new JLabel("Operational Reports & Analytics");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        lblReportDescription = new JLabel("Multi-table relational summary queries for operational decision-making");
        lblReportDescription.setFont(UITheme.FONT_BODY);
        lblReportDescription.setForeground(UITheme.TEXT_MUTED);

        titleBlock.add(title);
        titleBlock.add(Box.createRigidArea(new Dimension(0, 4)));
        titleBlock.add(lblReportDescription);
        header.add(titleBlock, BorderLayout.WEST);

        // Control Toolbar (Dropdown + Action Button)
        JPanel controlPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        controlPanel.setOpaque(false);

        JLabel lblSelect = new JLabel("Select Operational Report:");
        lblSelect.setFont(UITheme.FONT_BODY_BOLD);
        lblSelect.setForeground(UITheme.TEXT_SECONDARY);
        controlPanel.add(lblSelect);

        cmbReportType = new JComboBox<>(new String[]{
                "1. Disaster Relief Operational Summary",
                "2. Warehouse Inventory & Replenishment Alert",
                "3. Donor Contribution & Impact Audit Ledger"
        });
        UITheme.styleComboBox(cmbReportType, UITheme.COLOR_PRIMARY);
        cmbReportType.setPreferredSize(new Dimension(340, 36));
        cmbReportType.addActionListener(e -> generateSelectedReport());
        controlPanel.add(cmbReportType);

        CustomButton btnRefresh = new CustomButton("↻ Generate Report", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnRefresh.setPreferredSize(new Dimension(160, 36));
        btnRefresh.addActionListener(e -> generateSelectedReport());
        controlPanel.add(btnRefresh);

        header.add(controlPanel, BorderLayout.EAST);

        return header;
    }

    /**
     * Executes the appropriate SQL aggregation query via ReportDAO
     * and refreshes the table structure and data rows.
     */
    private void generateSelectedReport() {
        int selectedIndex = cmbReportType.getSelectedIndex();
        DefaultTableModel model = reportTable.getTableModel();
        model.setRowCount(0);

        switch (selectedIndex) {
            case 0: // Report 1
                lblReportDescription.setText("Report 1: Aggregates active disaster operations with total donations, aid requests, and dispatched deliveries (JOIN & GROUP BY)");
                model.setColumnIdentifiers(new String[]{
                        "Event ID", "Disaster Event Name", "Affected Location", "Status", 
                        "Total Donations", "Aid Requests", "Dispatched Fleet"
                });
                List<Object[]> rep1 = reportDAO.getDisasterOperationalSummary();
                for (Object[] row : rep1) {
                    model.addRow(row);
                }
                break;

            case 1: // Report 2
                lblReportDescription.setText("Report 2: Real-time stock audit tracking cumulative donations, allocations, and replenishment alert thresholds");
                model.setColumnIdentifiers(new String[]{
                        "Good ID", "Relief Good Name", "Category", "Current Stock", 
                        "Total Donated Qty", "Total Requested Qty", "Replenishment Status"
                });
                List<Object[]> rep2 = reportDAO.getInventoryStockHealthReport();
                for (Object[] row : rep2) {
                    model.addRow(row);
                }
                break;

            case 2: // Report 3
                lblReportDescription.setText("Report 3: Audit ledger summarizing individual & corporate donor participation, supported events, and contributed volume");
                model.setColumnIdentifiers(new String[]{
                        "Donor ID", "Donor / Sponsor Name", "Classification", "Contact Info", 
                        "Donation Count", "Disaster Events Supported", "Total Goods Contributed"
                });
                List<Object[]> rep3 = reportDAO.getDonorImpactLedger();
                for (Object[] row : rep3) {
                    model.addRow(row);
                }
                break;
        }

        reportTable.updateState();
    }
}
