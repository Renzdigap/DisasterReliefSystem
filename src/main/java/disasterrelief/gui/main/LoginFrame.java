package disasterrelief.gui.main;

import disasterrelief.gui.components.CustomButton;
import disasterrelief.gui.components.GlowCardPanel;
import disasterrelief.gui.components.UITheme;
import disasterrelief.service.AuthenticationService;
import disasterrelief.utils.SessionManager;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public class LoginFrame extends JFrame {

    private final AuthenticationService authService = new AuthenticationService();
    private JTextField txtUsername;
    private JPasswordField txtPassword;

    public LoginFrame() {
        setTitle("NDRDMS - Enterprise Login Portal");
        setSize(1000, 640);
        setMinimumSize(new Dimension(850, 550));
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        getContentPane().setBackground(UITheme.BG_CANVAS);
        initUI();
    }

    private void initUI() {
        setLayout(new BorderLayout());

        // Top subtle branding bar
        JPanel headerBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 24, 14));
        headerBar.setBackground(UITheme.BG_CARD);
        headerBar.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, UITheme.BORDER_SUBTLE));
        JLabel lblHeaderBrand = new JLabel("NATIONAL DISASTER RELIEF & LOGISTICS MANAGEMENT SYSTEM");
        lblHeaderBrand.setFont(UITheme.FONT_BODY_BOLD);
        lblHeaderBrand.setForeground(UITheme.COLOR_PRIMARY);
        headerBar.add(lblHeaderBrand);
        add(headerBar, BorderLayout.NORTH);

        // Center container with GridBagLayout to center the card
        JPanel centerPanel = new JPanel(new GridBagLayout());
        centerPanel.setOpaque(false);

        // Elevated GlowCardPanel for the login form
        GlowCardPanel loginCard = new GlowCardPanel(GlowCardPanel.GlowStyle.BLUE, 12, 32);
        loginCard.setPreferredSize(new Dimension(420, 480));
        loginCard.setLayout(new BoxLayout(loginCard, BoxLayout.Y_AXIS));

        // System title inside card
        JLabel lblLogo = new JLabel("NDRDMS");
        lblLogo.setFont(new Font("Segoe UI", Font.BOLD, 26));
        lblLogo.setForeground(UITheme.COLOR_PRIMARY);
        lblLogo.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel lblTitle = new JLabel("Sign In to Portal");
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);
        lblTitle.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel lblSub = new JLabel("Authorized Operations & Management Access");
        lblSub.setFont(UITheme.FONT_SMALL);
        lblSub.setForeground(UITheme.TEXT_MUTED);
        lblSub.setAlignmentX(Component.CENTER_ALIGNMENT);

        // Form Fields
        JPanel form = new JPanel();
        form.setLayout(new BoxLayout(form, BoxLayout.Y_AXIS));
        form.setOpaque(false);

        JLabel lblUser = new JLabel("Username");
        lblUser.setFont(UITheme.FONT_BODY_BOLD);
        lblUser.setForeground(UITheme.TEXT_SECONDARY);
        lblUser.setAlignmentX(Component.LEFT_ALIGNMENT);

        txtUsername = new JTextField();
        txtUsername.setMaximumSize(new Dimension(Integer.MAX_VALUE, 36));
        UITheme.styleTextField(txtUsername);

        JLabel lblPass = new JLabel("Password");
        lblPass.setFont(UITheme.FONT_BODY_BOLD);
        lblPass.setForeground(UITheme.TEXT_SECONDARY);
        lblPass.setAlignmentX(Component.LEFT_ALIGNMENT);

        txtPassword = new JPasswordField();
        txtPassword.setMaximumSize(new Dimension(Integer.MAX_VALUE, 36));
        UITheme.styleTextField(txtPassword);
        txtPassword.setLayout(new BorderLayout());

        // Capture default bullet echo char for toggling
        char defaultEcho = txtPassword.getEchoChar();
        if (defaultEcho == (char) 0) {
            defaultEcho = '\u2022';
        }
        final char bulletEcho = defaultEcho;

        JButton btnTogglePass = new JButton("Show");
        btnTogglePass.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnTogglePass.setForeground(UITheme.COLOR_PRIMARY);
        btnTogglePass.setContentAreaFilled(false);
        btnTogglePass.setBorderPainted(false);
        btnTogglePass.setFocusPainted(false);
        btnTogglePass.setOpaque(false);
        btnTogglePass.setCursor(new Cursor(Cursor.HAND_CURSOR));
        btnTogglePass.setBorder(BorderFactory.createEmptyBorder(0, 4, 0, 10));
        btnTogglePass.setToolTipText("Toggle password visibility");

        btnTogglePass.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override
            public void mouseEntered(java.awt.event.MouseEvent e) {
                btnTogglePass.setForeground(UITheme.COLOR_PRIMARY_HOVER);
            }
            @Override
            public void mouseExited(java.awt.event.MouseEvent e) {
                btnTogglePass.setForeground(UITheme.COLOR_PRIMARY);
            }
        });

        btnTogglePass.addActionListener(e -> {
            if (txtPassword.getEchoChar() != (char) 0) {
                txtPassword.setEchoChar((char) 0);
                btnTogglePass.setText("Hide");
            } else {
                txtPassword.setEchoChar(bulletEcho);
                btnTogglePass.setText("Show");
            }
            txtPassword.requestFocusInWindow();
        });

        txtPassword.add(btnTogglePass, BorderLayout.EAST);

        form.add(lblUser);
        form.add(Box.createRigidArea(new Dimension(0, 6)));
        form.add(txtUsername);
        form.add(Box.createRigidArea(new Dimension(0, 16)));
        form.add(lblPass);
        form.add(Box.createRigidArea(new Dimension(0, 6)));
        form.add(txtPassword);

        // Custom Action Button
        CustomButton btnLogin = new CustomButton("Authenticate & Enter", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnLogin.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
        btnLogin.setAlignmentX(Component.CENTER_ALIGNMENT);

        // Hint for evaluation
        JLabel lblHint = new JLabel("Seed Credentials: admin / admin123");
        lblHint.setFont(UITheme.FONT_SMALL);
        lblHint.setForeground(UITheme.TEXT_MUTED);
        lblHint.setAlignmentX(Component.CENTER_ALIGNMENT);

        // Action Handlers
        Runnable doLogin = () -> {
            String u = txtUsername.getText().trim();
            String p = new String(txtPassword.getPassword());
            if (u.isEmpty() || p.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please enter both username and password.", "Input Required", JOptionPane.WARNING_MESSAGE);
                return;
            }
            try {
                if (authService.login(u, p)) {
                    SwingUtilities.invokeLater(() -> {
                        new MainFrame().setVisible(true);
                    });
                    dispose();
                } else {
                    JOptionPane.showMessageDialog(this, "Invalid credentials. Please verify your username and password.", "Login Failed", JOptionPane.ERROR_MESSAGE);
                }
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Database Connection Error: " + ex.getMessage(), "Connection Error", JOptionPane.ERROR_MESSAGE);
                ex.printStackTrace();
            }
        };

        btnLogin.addActionListener(e -> doLogin.run());
        txtPassword.addActionListener(e -> doLogin.run());
        txtUsername.addActionListener(e -> doLogin.run());

        loginCard.add(Box.createRigidArea(new Dimension(0, 8)));
        loginCard.add(lblLogo);
        loginCard.add(Box.createRigidArea(new Dimension(0, 6)));
        loginCard.add(lblTitle);
        loginCard.add(Box.createRigidArea(new Dimension(0, 4)));
        loginCard.add(lblSub);
        loginCard.add(Box.createRigidArea(new Dimension(0, 24)));
        loginCard.add(form);
        loginCard.add(Box.createRigidArea(new Dimension(0, 24)));
        loginCard.add(btnLogin);
        loginCard.add(Box.createRigidArea(new Dimension(0, 16)));
        loginCard.add(lblHint);

        centerPanel.add(loginCard);
        add(centerPanel, BorderLayout.CENTER);
    }
}
