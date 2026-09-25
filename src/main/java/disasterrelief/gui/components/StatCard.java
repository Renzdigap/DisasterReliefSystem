package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * Modern SaaS metric card component for displaying key statistics.
 * Features rounded card surface, soft drop-shadow, dynamic accent pill bar, and reactive value setters.
 */
public class StatCard extends JPanel {

    private final JLabel lblTitle;
    private final JLabel lblValue;
    private JLabel lblSubtitle;
    private Color accentColor;
    private final int cornerRadius = 12;

    public StatCard(String title, String value) {
        this(title, value, null, null);
    }

    public StatCard(String title, String value, Color accentColor) {
        this(title, value, accentColor, null);
    }

    public StatCard(String title, String value, Color accentColor, String subtitle) {
        this.accentColor = accentColor;
        setLayout(new BorderLayout(0, UITheme.SP_4));
        setOpaque(false);
        setBorder(new EmptyBorder(16, 18, 16, 18));

        lblTitle = new JLabel(title);
        lblTitle.setFont(UITheme.FONT_BODY_BOLD);
        lblTitle.setForeground(UITheme.TEXT_SECONDARY);

        lblValue = new JLabel(value);
        lblValue.setFont(UITheme.FONT_DISPLAY);
        lblValue.setForeground(UITheme.TEXT_PRIMARY);

        JPanel contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        contentPanel.setOpaque(false);

        contentPanel.add(lblTitle);
        contentPanel.add(Box.createRigidArea(new Dimension(0, 6)));
        contentPanel.add(lblValue);

        if (subtitle != null && !subtitle.isEmpty()) {
            lblSubtitle = new JLabel(subtitle);
            lblSubtitle.setFont(UITheme.FONT_SMALL);
            lblSubtitle.setForeground(UITheme.TEXT_MUTED);
            contentPanel.add(Box.createRigidArea(new Dimension(0, 4)));
            contentPanel.add(lblSubtitle);
        }

        add(contentPanel, BorderLayout.CENTER);
    }

    public void setValue(String value) {
        lblValue.setText(value);
        revalidate();
        repaint();
    }

    public String getValue() {
        return lblValue.getText();
    }

    public void setTitle(String title) {
        lblTitle.setText(title);
        revalidate();
        repaint();
    }

    public void setSubtitle(String subtitle) {
        if (lblSubtitle != null) {
            lblSubtitle.setText(subtitle);
        }
    }

    public void setAccentColor(Color accentColor) {
        this.accentColor = accentColor;
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        Graphics2D g2d = (Graphics2D) g.create();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int w = getWidth();
        int h = getHeight();
        int pad = 2;
        int cardW = w - (pad * 2) - 1;
        int cardH = h - (pad * 2) - 1;

        // Subtle ambient shadow
        g2d.setColor(new Color(0, 0, 0, 8));
        g2d.fillRoundRect(pad, pad + 2, cardW, cardH, cornerRadius, cornerRadius);
        g2d.setColor(new Color(0, 0, 0, 14));
        g2d.fillRoundRect(pad, pad + 1, cardW, cardH, cornerRadius, cornerRadius);

        // White card background
        g2d.setColor(UITheme.SURFACE_PANEL);
        g2d.fillRoundRect(pad, pad, cardW, cardH, cornerRadius, cornerRadius);

        // 1px Subtle Border
        g2d.setColor(UITheme.BORDER_SUBTLE);
        g2d.setStroke(new BasicStroke(1f));
        g2d.drawRoundRect(pad, pad, cardW, cardH, cornerRadius, cornerRadius);

        // Optional Top Accent Pill / Bar
        if (accentColor != null) {
            g2d.setColor(accentColor);
            g2d.fillRoundRect(pad + 4, pad, cardW - 8, 4, 4, 4);
        }

        g2d.dispose();
        super.paintComponent(g);
    }
}
