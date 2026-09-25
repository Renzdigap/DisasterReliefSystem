package disasterrelief.gui.main;

import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.UITheme;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public class MainFrame extends JFrame {

    public MainFrame() {
        setTitle("National Disaster Relief & Resource Management System (NDRDMS)");
        setSize(1366, 820);
        setMinimumSize(new Dimension(1080, 680));
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        getContentPane().setBackground(UITheme.BG_CANVAS);
        initUI();
    }

    private void initUI() {
        setLayout(new BorderLayout());

        // ==============================
        // 1. TOP EXECUTIVE HEADER BAR
        // ==============================
        JPanel topBar = new JPanel(new BorderLayout());
        topBar.setBackground(UITheme.BG_HEADER_DARK);
        topBar.setPreferredSize(new Dimension(0, 56));
        topBar.setBorder(new EmptyBorder(0, 24, 0, 24));

        JLabel lblSystemBrand = new JLabel("NDRDMS  |  DISASTER RELIEF OPERATIONS PLATFORM");
        lblSystemBrand.setFont(new Font("Segoe UI", Font.BOLD, 13));
        lblSystemBrand.setForeground(Color.WHITE);

        JPanel userBar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 14, 12));
        userBar.setOpaque(false);

        String userName = SessionManager.getCurrentUser() != null ? SessionManager.getCurrentUser().getFullName() : "Administrator";
        String userRole = SessionManager.getCurrentUser() != null ? SessionManager.getCurrentUser().getRole() : "ADMIN";

        JLabel lblUserName = new JLabel(userName);
        lblUserName.setFont(UITheme.FONT_BODY_BOLD);
        lblUserName.setForeground(Color.WHITE);

        JLabel lblRole = new JLabel("[" + userRole + "]");
        lblRole.setFont(UITheme.FONT_SMALL);
        lblRole.setForeground(new Color(148, 163, 184)); // Slate 400

        CustomButton btnLogout = new CustomButton("Log Out", UITheme.COLOR_DANGER, Color.WHITE);
        btnLogout.setPreferredSize(new Dimension(86, 30));
        btnLogout.addActionListener(e -> {
            SessionManager.logout();
            new LoginFrame().setVisible(true);
            dispose();
        });

        userBar.add(lblUserName);
        userBar.add(lblRole);
        userBar.add(btnLogout);

        topBar.add(lblSystemBrand, BorderLayout.WEST);
        topBar.add(userBar, BorderLayout.EAST);
        add(topBar, BorderLayout.NORTH);

        // ==============================
        // 2. STAKEHOLDER PORTAL ROUTING
        // ==============================
        JPanel portalContainer = new JPanel(new BorderLayout());
        portalContainer.setOpaque(false);

        if (SessionManager.isAdmin()) {
            portalContainer.add(new AdminPortalPanel(), BorderLayout.CENTER);
        } else if (SessionManager.isVolunteer()) {
            portalContainer.add(new VolunteerPortalPanel(), BorderLayout.CENTER);
        } else {
            // Default to Citizen / Donor / Organization public portal
            portalContainer.add(new CitizenPortalPanel(), BorderLayout.CENTER);
        }

        add(portalContainer, BorderLayout.CENTER);
    }
}
