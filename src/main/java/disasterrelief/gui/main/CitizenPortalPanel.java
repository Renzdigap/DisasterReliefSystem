package disasterrelief.gui.main;

import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.GlowCardPanel;
import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class CitizenPortalPanel extends JPanel {
    private final CardLayout cardLayout;
    private final JPanel cardPanel;
    private final List<CustomButton> navButtons = new ArrayList<>();
    private final JLabel lblPageTitle;
    private final JLabel lblPageSubtitle;

    public CitizenPortalPanel() {
        setLayout(new BorderLayout());
        setOpaque(false);

        // ==============================
        // SIDEBAR NAVIGATION
        // ==============================
        JPanel sidebar = new JPanel();
        sidebar.setLayout(new BoxLayout(sidebar, BoxLayout.Y_AXIS));
        sidebar.setBackground(UITheme.BG_CARD);
        sidebar.setPreferredSize(new Dimension(240, 0));
        sidebar.setBorder(BorderFactory.createMatteBorder(0, 0, 0, 1, UITheme.BORDER_SUBTLE));

        // Brand Area
        JPanel brandPanel = new JPanel();
        brandPanel.setLayout(new BoxLayout(brandPanel, BoxLayout.Y_AXIS));
        brandPanel.setOpaque(false);
        brandPanel.setBorder(new EmptyBorder(18, 20, 16, 20));

        JLabel lblBrand = new JLabel("NDRDMS");
        lblBrand.setFont(new Font("Segoe UI", Font.BOLD, 22));
        lblBrand.setForeground(UITheme.COLOR_PRIMARY);

        JLabel lblSubBrand = new JLabel("Citizen & Donor Portal");
        lblSubBrand.setFont(UITheme.FONT_SMALL);
        lblSubBrand.setForeground(UITheme.TEXT_MUTED);

        brandPanel.add(lblBrand);
        brandPanel.add(Box.createRigidArea(new Dimension(0, 2)));
        brandPanel.add(lblSubBrand);
        sidebar.add(brandPanel);

        // Card Container setup
        cardLayout = new CardLayout();
        cardPanel = new JPanel(cardLayout);
        cardPanel.setBackground(UITheme.BG_CANVAS);

        // Register Navigation Modules
        addNavGroup(sidebar, "DASHBOARD");
        addNavItem(sidebar, "Overview", "Public transparency and updates", new disasterrelief.gui.panels.PublicDashboardPanel());

        addNavGroup(sidebar, "ACTION");
        addNavItem(sidebar, "Make a Donation", "Contribute funds or relief goods", new disasterrelief.gui.panels.MakeDonationPanel());
        addNavItem(sidebar, "Request Aid", "Submit a request for assistance", new disasterrelief.gui.panels.RequestAidPanel());
        
        addNavGroup(sidebar, "TRACKING");
        addNavItem(sidebar, "My Contributions", "Track your past donations and impact", new disasterrelief.gui.panels.MyContributionsPanel());
        addNavItem(sidebar, "My Requests", "Status of submitted aid requests", new disasterrelief.gui.panels.MyRequestsPanel());

        addNavGroup(sidebar, "SETTINGS");
        addNavItem(sidebar, "Profile", "Manage your account details", new disasterrelief.gui.panels.ProfilePanel());

        sidebar.add(Box.createVerticalGlue());

        JScrollPane sidebarScroll = new JScrollPane(sidebar);
        sidebarScroll.setBorder(null);
        sidebarScroll.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
        add(sidebarScroll, BorderLayout.WEST);

        // ==============================
        // CONTENT AREA & PAGE HEADER
        // ==============================
        JPanel contentArea = new JPanel(new BorderLayout());
        contentArea.setBackground(UITheme.BG_CANVAS);

        JPanel pageHeader = new JPanel(new BorderLayout());
        pageHeader.setOpaque(false);
        pageHeader.setBorder(new EmptyBorder(20, 24, 16, 24));

        JPanel titleBlock = new JPanel();
        titleBlock.setLayout(new BoxLayout(titleBlock, BoxLayout.Y_AXIS));
        titleBlock.setOpaque(false);

        lblPageTitle = new JLabel("Overview");
        lblPageTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblPageTitle.setForeground(UITheme.TEXT_PRIMARY);

        lblPageSubtitle = new JLabel("Public transparency and updates");
        lblPageSubtitle.setFont(UITheme.FONT_BODY);
        lblPageSubtitle.setForeground(UITheme.TEXT_SECONDARY);

        titleBlock.add(lblPageTitle);
        titleBlock.add(Box.createRigidArea(new Dimension(0, 4)));
        titleBlock.add(lblPageSubtitle);
        pageHeader.add(titleBlock, BorderLayout.WEST);

        contentArea.add(pageHeader, BorderLayout.NORTH);

        JPanel cardWrapper = new JPanel(new BorderLayout());
        cardWrapper.setOpaque(false);
        cardWrapper.setBorder(new EmptyBorder(0, 24, 24, 24));
        cardWrapper.add(cardPanel, BorderLayout.CENTER);
        contentArea.add(cardWrapper, BorderLayout.CENTER);

        add(contentArea, BorderLayout.CENTER);

        if (!navButtons.isEmpty()) {
            navButtons.get(0).doClick();
        }
    }

    private void addNavGroup(JPanel sidebar, String groupName) {
        JLabel lbl = new JLabel(groupName);
        lbl.setForeground(UITheme.TEXT_MUTED);
        lbl.setFont(new Font("Segoe UI", Font.BOLD, 10));
        lbl.setBorder(new EmptyBorder(14, 20, 6, 20));
        sidebar.add(lbl);
    }

    private void addNavItem(JPanel sidebar, String title, String subtitle, JPanel panel) {
        CustomButton btn = new CustomButton(title, UITheme.BG_CARD, UITheme.TEXT_PRIMARY);
        btn.setName(title);
        btn.setHorizontalAlignment(SwingConstants.LEFT);
        btn.setMaximumSize(new Dimension(220, 34));
        btn.setFont(UITheme.FONT_BODY_BOLD);

        btn.addActionListener(e -> {
            cardLayout.show(cardPanel, title);
            for (CustomButton b : navButtons) b.setForeground(UITheme.TEXT_PRIMARY);
            btn.setForeground(UITheme.COLOR_PRIMARY);
            lblPageTitle.setText(title);
            lblPageSubtitle.setText(subtitle);
        });

        navButtons.add(btn);
        JPanel btnWrapper = new JPanel(new FlowLayout(FlowLayout.CENTER, 0, 2));
        btnWrapper.setOpaque(false);
        btnWrapper.add(btn);
        sidebar.add(btnWrapper);
        cardPanel.add(panel, title);
    }

    private JPanel createPlaceholder(String moduleName, GlowCardPanel.GlowStyle style) {
        JPanel container = new JPanel(new BorderLayout(0, 16));
        container.setOpaque(false);
        GlowCardPanel card = new GlowCardPanel(style, 12, 24);
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        JLabel title = new JLabel(moduleName);
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);
        JLabel desc = new JLabel("Module ready for integration.");
        desc.setFont(UITheme.FONT_BODY);
        desc.setForeground(UITheme.TEXT_SECONDARY);
        card.add(title);
        card.add(Box.createRigidArea(new Dimension(0, 8)));
        card.add(desc);
        container.add(card, BorderLayout.NORTH);
        return container;
    }
}
