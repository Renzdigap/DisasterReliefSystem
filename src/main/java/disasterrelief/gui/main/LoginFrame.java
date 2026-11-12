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
        setTitle("DRRMS - City of Batac Disaster Relief Portal");
        setSize(1000, 640);
        setMinimumSize(new Dimension(850, 550));
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        getContentPane().setBackground(new Color(248, 250, 252));
        initUI();
    }

    private void initUI() {
        setLayout(new BorderLayout());

        // Top subtle branding bar
        JPanel headerBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 24, 12));
        headerBar.setBackground(Color.WHITE);
        headerBar.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, new Color(226, 232, 240)));
        JLabel lblHeaderBrand = new JLabel("MARIANO MARCOS STATE UNIVERSITY • CITY OF BATAC CDRRMO");
        lblHeaderBrand.setFont(new Font("Segoe UI", Font.BOLD, 12));
        lblHeaderBrand.setForeground(new Font("Segoe UI", Font.BOLD, 12) != null ? new Color(0, 56, 168) : Color.BLUE);
        headerBar.add(lblHeaderBrand);
        add(headerBar, BorderLayout.NORTH);

        // Center container with GridBagLayout to center the card
        JPanel centerPanel = new JPanel(new GridBagLayout());
        centerPanel.setOpaque(false);

        // Clean, solid institutional card (no sci-fi neon glow)
        JPanel loginCard = new JPanel();
        loginCard.setBackground(Color.WHITE);
        loginCard.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225), 1),
                new EmptyBorder(32, 36, 32, 36)
        ));
        loginCard.setPreferredSize(new Dimension(420, 480));
        loginCard.setLayout(new BoxLayout(loginCard, BoxLayout.Y_AXIS));

        // System title inside card
        JLabel lblLogo = new JLabel("DRRMS");
        lblLogo.setFont(new Font("Segoe UI", Font.BOLD, 26));
        lblLogo.setForeground(new Color(0, 56, 168));
        lblLogo.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel lblTitle = new JLabel("Authorized Portal Access");
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 18));
        lblTitle.setForeground(new Color(15, 23, 42));
        lblTitle.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel lblSub = new JLabel("City Disaster Risk Reduction & Management Office");
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(100, 116, 139));
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
        CustomButton btnLogin = new CustomButton("Sign In to Portal", UITheme.COLOR_PRIMARY, Color.WHITE);
        btnLogin.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
        btnLogin.setAlignmentX(Component.CENTER_ALIGNMENT);

        // Hint for evaluation
        JLabel lblHint = new JLabel("For Academic Evaluation: admin / admin123");
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
