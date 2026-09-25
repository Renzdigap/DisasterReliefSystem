package disasterrelief.gui.panels;

import disasterrelief.dao.DashboardDAO;
import disasterrelief.dao.DisasterEventDAO;
import disasterrelief.model.DisasterEvent;
import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.GlowCardPanel;
import disasterrelief.gui.components.StatCard;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * A public-facing dashboard panel that displays non-sensitive transparency metrics
 * (e.g., active disasters, total funds/donations raised, volunteers) and a feed of recent disaster events.
 */
public class PublicDashboardPanel extends JPanel {

    private final DashboardDAO dashboardDAO;
    private final DisasterEventDAO disasterEventDAO;

    private StatCard cardActiveDisasters;
    private StatCard cardTotalDonations;
    private StatCard cardVolunteers;

    private EmptyStateTable activeEventsTable;
    private DefaultTableModel activeEventsModel;

    public PublicDashboardPanel() {
        this.dashboardDAO = new DashboardDAO();
        this.disasterEventDAO = new DisasterEventDAO();

        setLayout(new BorderLayout(0, 16));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 20, 20, 20));

        JPanel contentContainer = new JPanel();
        contentContainer.setLayout(new BoxLayout(contentContainer, BoxLayout.Y_AXIS));
        contentContainer.setOpaque(false);

        // 1. Header Banner
        contentContainer.add(createHeaderBanner());
        contentContainer.add(Box.createRigidArea(new Dimension(0, 16)));

        // 2. Metrics Grid (3 StatCards for public feed)
        contentContainer.add(createMetricsGrid());
        contentContainer.add(Box.createRigidArea(new Dimension(0, 20)));

        // 3. Recent Active Disasters Table
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

    private JPanel createHeaderBanner() {
        GlowCardPanel banner = new GlowCardPanel(GlowCardPanel.GlowStyle.BLUE, 12, 16);
        banner.setLayout(new BorderLayout(16, 0));
        banner.setMaximumSize(new Dimension(Integer.MAX_VALUE, 110));

        // Left Info
        JPanel leftPanel = new JPanel();
        leftPanel.setLayout(new BoxLayout(leftPanel, BoxLayout.Y_AXIS));
        leftPanel.setOpaque(false);

        JLabel lblTitle = new JLabel("Public Transparency Feed");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);

        JLabel lblSubtitle = new JLabel("Real-time aggregated metrics and recent active operations");
        lblSubtitle.setFont(UITheme.FONT_BODY);
        lblSubtitle.setForeground(UITheme.TEXT_MUTED);

        JLabel lblLiveBadge = new JLabel("● Live Data Synced");
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

        CustomButton btnRefresh = new CustomButton("↻ Refresh Feed", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnRefresh.setPreferredSize(new Dimension(150, 36));
        btnRefresh.addActionListener(e -> refreshData());
        rightPanel.add(btnRefresh);

        banner.add(rightPanel, BorderLayout.EAST);

        return banner;
    }

    private JPanel createMetricsGrid() {
        JPanel grid = new JPanel(new GridLayout(1, 3, 16, 0));
        grid.setOpaque(false);
        grid.setMaximumSize(new Dimension(Integer.MAX_VALUE, 115));

        cardActiveDisasters = new StatCard("Active Disaster Count", "...", UITheme.COLOR_DANGER, "Currently monitored");
        cardTotalDonations = new StatCard("Total Donations Raised", "...", UITheme.COLOR_SUCCESS, "Global contributions");
        cardVolunteers = new StatCard("Registered Volunteers", "...", UITheme.COLOR_PRIMARY, "Active field personnel");

        grid.add(cardActiveDisasters);
        grid.add(cardTotalDonations);
        grid.add(cardVolunteers);

        return grid;
    }

    private JPanel createActiveDisastersSection() {
        JPanel section = new JPanel(new BorderLayout(0, 10));
        section.setOpaque(false);

        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);

        JLabel lblSection = new JLabel("Recent Active Disasters (Top 5)");
        lblSection.setFont(UITheme.FONT_HEADER_MID);
        lblSection.setForeground(UITheme.TEXT_PRIMARY);
        headerPanel.add(lblSection, BorderLayout.WEST);

        section.add(headerPanel, BorderLayout.NORTH);

        String[] columns = {"Event ID", "Disaster Name", "Affected Location", "Status", "Date Commenced"};
        activeEventsTable = new EmptyStateTable(columns, "No recent active disasters found.");
        activeEventsModel = activeEventsTable.getTableModel();
        activeEventsTable.setPreferredSize(new Dimension(0, 200)); // enough for ~5 rows

        section.add(activeEventsTable, BorderLayout.CENTER);

        return section;
    }

    public void refreshData() {
        SwingWorker<DashboardData, Void> worker = new SwingWorker<>() {
            @Override
            protected DashboardData doInBackground() {
                Map<String, Integer> metrics = dashboardDAO.getDashboardMetrics();
                
                // Get top 5 recent active events
                List<DisasterEvent> allEvents = disasterEventDAO.getAllEvents();
                List<DisasterEvent> recentActiveEvents = new ArrayList<>();
                for (DisasterEvent ev : allEvents) {
                    if ("Active".equalsIgnoreCase(ev.getStatus())) {
                        recentActiveEvents.add(ev);
                        if (recentActiveEvents.size() >= 5) {
                            break;
                        }
                    }
                }
                
                return new DashboardData(metrics, recentActiveEvents);
            }

            @Override
            protected void done() {
                try {
                    DashboardData data = get();

                    // Update metrics
                    cardActiveDisasters.setValue(String.valueOf(data.metrics.getOrDefault("activeDisasters", 0)));
                    cardTotalDonations.setValue(String.valueOf(data.metrics.getOrDefault("totalDonations", 0)));
                    cardVolunteers.setValue(String.valueOf(data.metrics.getOrDefault("registeredVolunteers", 0)));

                    // Update Table
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
                    System.err.println("Error loading public dashboard data: " + e.getMessage());
                }
            }
        };

        worker.execute();
    }

    private static class DashboardData {
        final Map<String, Integer> metrics;
        final List<DisasterEvent> activeEvents;

        DashboardData(Map<String, Integer> metrics, List<DisasterEvent> activeEvents) {
            this.metrics = metrics;
            this.activeEvents = activeEvents;
        }
    }
}
