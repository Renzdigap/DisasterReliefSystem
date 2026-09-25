package disasterrelief.gui.panels;

import disasterrelief.dao.DashboardDAO;
import disasterrelief.dao.DisasterEventDAO;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.GlowCardPanel;
import disasterrelief.gui.components.StatCard;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.DisasterEvent;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * High-level executive analytics dashboard panel for the Admin Operations Portal.
 * Displays key operational metrics using modern StatCard components and real-time monitored incident tables.
 */
public class DashboardPanel extends JPanel {

    private final DashboardDAO dashboardDAO;
    private final DisasterEventDAO disasterEventDAO;

    private StatCard cardActiveDisasters;
    private StatCard cardTotalDonations;
    private StatCard cardPendingRequests;
    private StatCard cardVolunteers;

    private DefaultTableModel activeEventsModel;
    private EmptyStateTable activeEventsTable;

    public DashboardPanel() {
        this.dashboardDAO = new DashboardDAO();
        this.disasterEventDAO = new DisasterEventDAO();

        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 20, 20, 20));

        JPanel contentContainer = new JPanel();
        contentContainer.setLayout(new BoxLayout(contentContainer, BoxLayout.Y_AXIS));
        contentContainer.setOpaque(false);

        // 1. Header Executive Banner
        contentContainer.add(createHeaderBanner());
        contentContainer.add(Box.createRigidArea(new Dimension(0, 16)));

        // 2. Metrics Grid (4 StatCards)
        contentContainer.add(createMetricsGrid());
        contentContainer.add(Box.createRigidArea(new Dimension(0, 20)));

        // 3. Active Surveillance / Monitored Disasters Table
        contentContainer.add(createActiveDisastersSection());

        JScrollPane scrollPane = new JScrollPane(contentContainer);
        scrollPane.setBorder(null);
        scrollPane.setOpaque(false);
        scrollPane.getViewport().setOpaque(false);
        scrollPane.getVerticalScrollBar().setUnitIncrement(16);

        add(scrollPane, BorderLayout.CENTER);

        // Fetch live PostgreSQL metrics on initialization
        refreshData();
    }

    /**
     * Creates the top executive banner with system title, status indicator, and refresh button.
     */
    private JPanel createHeaderBanner() {
        GlowCardPanel banner = new GlowCardPanel(GlowCardPanel.GlowStyle.BLUE, 12, 16);
        banner.setLayout(new BorderLayout(16, 0));
        banner.setMaximumSize(new Dimension(Integer.MAX_VALUE, 110));

        // Left Branding Info
        JPanel leftPanel = new JPanel();
        leftPanel.setLayout(new BoxLayout(leftPanel, BoxLayout.Y_AXIS));
        leftPanel.setOpaque(false);

        JLabel lblTitle = new JLabel("Disaster Relief Operations Dashboard");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);

        JLabel lblSubtitle = new JLabel("National Disaster Risk Reduction & Emergency Resource Coordination System");
        lblSubtitle.setFont(UITheme.FONT_BODY);
        lblSubtitle.setForeground(UITheme.TEXT_MUTED);

        JLabel lblLiveBadge = new JLabel("● PostgreSQL Live Synced  •  Real-Time Operational Feed");
        lblLiveBadge.setFont(UITheme.FONT_SMALL);
        lblLiveBadge.setForeground(UITheme.COLOR_SUCCESS);

        leftPanel.add(lblTitle);
        leftPanel.add(Box.createRigidArea(new Dimension(0, 4)));
        leftPanel.add(lblSubtitle);
        leftPanel.add(Box.createRigidArea(new Dimension(0, 4)));
        leftPanel.add(lblLiveBadge);

        banner.add(leftPanel, BorderLayout.WEST);

        // Right Action Button
        JPanel rightPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 0, 14));
        rightPanel.setOpaque(false);

        CustomButton btnRefresh = new CustomButton("↻ Refresh Analytics", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnRefresh.setPreferredSize(new Dimension(170, 36));
        btnRefresh.addActionListener(e -> refreshData());
        rightPanel.add(btnRefresh);

        banner.add(rightPanel, BorderLayout.EAST);

        return banner;
    }

    /**
     * Creates a 4-column responsive grid containing the key operational StatCards.
     */
    private JPanel createMetricsGrid() {
        JPanel grid = new JPanel(new GridLayout(1, 4, 16, 0));
        grid.setOpaque(false);
        grid.setMaximumSize(new Dimension(Integer.MAX_VALUE, 115));

        cardActiveDisasters = new StatCard("Total Active Disasters", "...", UITheme.COLOR_DANGER, "Current monitored incidents");
        cardTotalDonations = new StatCard("Total Donations", "...", UITheme.COLOR_SUCCESS, "Contributions processed");
        cardPendingRequests = new StatCard("Pending Relief Requests", "...", UITheme.COLOR_WARNING, "Awaiting approval / dispatch");
        cardVolunteers = new StatCard("Registered Volunteers", "...", UITheme.COLOR_PRIMARY, "Field response personnel");

        grid.add(cardActiveDisasters);
        grid.add(cardTotalDonations);
        grid.add(cardPendingRequests);
        grid.add(cardVolunteers);

        return grid;
    }

    /**
     * Creates the active disaster incident table section.
     */
    private JPanel createActiveDisastersSection() {
        JPanel section = new JPanel(new BorderLayout(0, 10));
        section.setOpaque(false);

        // Section Title Header
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);

        JLabel lblSection = new JLabel("Active Disaster Surveillance & Response Zones");
        lblSection.setFont(UITheme.FONT_HEADER_MID);
        lblSection.setForeground(UITheme.TEXT_PRIMARY);
        headerPanel.add(lblSection, BorderLayout.WEST);

        section.add(headerPanel, BorderLayout.NORTH);

        // Monitored Events Table
        String[] columns = {"Event ID", "Disaster Name", "Affected Location", "Status", "Commenced Date"};
        activeEventsTable = new EmptyStateTable(columns, "No active disaster zones at this moment");
        activeEventsModel = activeEventsTable.getTableModel();
        activeEventsTable.setPreferredSize(new Dimension(0, 240));

        section.add(activeEventsTable, BorderLayout.CENTER);

        return section;
    }

    /**
     * Asynchronously refreshes all analytics metrics and table data from the database.
     */
    public void refreshData() {
        SwingWorker<DashboardData, Void> worker = new SwingWorker<>() {
            @Override
            protected DashboardData doInBackground() {
                Map<String, Integer> metrics = dashboardDAO.getDashboardMetrics();
                List<DisasterEvent> allEvents = disasterEventDAO.getAllEvents();
                List<DisasterEvent> activeEvents = new ArrayList<>();
                for (DisasterEvent ev : allEvents) {
                    if ("Active".equalsIgnoreCase(ev.getStatus())) {
                        activeEvents.add(ev);
                    }
                }
                return new DashboardData(metrics, activeEvents);
            }

            @Override
            protected void done() {
                try {
                    DashboardData data = get();

                    // 1. Update StatCards
                    cardActiveDisasters.setValue(String.valueOf(data.metrics.getOrDefault("activeDisasters", 0)));
                    cardTotalDonations.setValue(String.valueOf(data.metrics.getOrDefault("totalDonations", 0)));
                    cardPendingRequests.setValue(String.valueOf(data.metrics.getOrDefault("pendingRequests", 0)));
                    cardVolunteers.setValue(String.valueOf(data.metrics.getOrDefault("registeredVolunteers", 0)));

                    // 2. Populate Active Events Table
                    activeEventsModel.setRowCount(0);
                    for (DisasterEvent ev : data.activeEvents) {
                        activeEventsModel.addRow(new Object[]{
                                ev.getEventId(),
                                ev.getEventName(),
                                ev.getLocation(),
                                ev.getStatus(),
                                ev.getStartDate()
                        });
                    }
                    activeEventsTable.updateState();

                } catch (Exception e) {
                    System.err.println("Error loading dashboard data: " + e.getMessage());
                }
            }
        };

        worker.execute();
    }

    /**
     * Internal container holding background-loaded dashboard data.
     */
    private static class DashboardData {
        final Map<String, Integer> metrics;
        final List<DisasterEvent> activeEvents;

        DashboardData(Map<String, Integer> metrics, List<DisasterEvent> activeEvents) {
            this.metrics = metrics;
            this.activeEvents = activeEvents;
        }
    }
}
