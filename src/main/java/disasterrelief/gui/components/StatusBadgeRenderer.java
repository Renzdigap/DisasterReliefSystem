package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.table.DefaultTableCellRenderer;
import java.awt.*;

public class StatusBadgeRenderer extends DefaultTableCellRenderer {

    private static final java.util.Set<String> BADGE_HEADERS = java.util.Set.of(
        "STATUS", "SEVERITY", "URGENCY", "AVAILABILITY", "STOCK", "DELIVERY STATUS"
    );

    private boolean isBadgeColumn(JTable table, int column) {
        if (table == null) return false;
        String header = table.getColumnName(column).toUpperCase();
        for (String key : BADGE_HEADERS) {
            if (header.contains(key)) return true;
        }
        return false;
    }

    @Override
    public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected, boolean hasFocus, int row, int column) {
        super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row, column);

        setFont(UITheme.FONT_BODY);
        setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));

        if (value == null) return this;

        setHorizontalAlignment(SwingConstants.LEFT);
        setBackground(isSelected ? table.getSelectionBackground() : Color.WHITE);
        setForeground(isSelected ? table.getSelectionForeground() : UITheme.TEXT_PRIMARY);

        if (isBadgeColumn(table, column)) {
            String status = value.toString().toUpperCase().trim();
            setHorizontalAlignment(SwingConstants.CENTER);
            setFont(UITheme.FONT_SMALL);

            if (!isSelected) {
                if (isSuccess(status)) {
                    setBackground(new Color(209, 250, 229)); // Light Green (Emerald 100)
                    setForeground(new Color(6, 95, 70));     // Dark Green (Emerald 900)
                } else if (isWarning(status)) {
                    setBackground(new Color(254, 243, 199)); // Light Amber
                    setForeground(new Color(146, 64, 14));   // Dark Amber
                } else if (isDanger(status)) {
                    setBackground(new Color(255, 228, 230)); // Light Rose
                    setForeground(new Color(159, 18, 57));   // Dark Rose
                } else {
                    setBackground(new Color(241, 245, 249)); // Slate 100
                    setForeground(new Color(51, 65, 85));    // Slate 700
                }
            }
        }

        return this;
    }

    private boolean isSuccess(String s) {
        return s.equals("ACTIVE") || s.equals("DELIVERED") || s.equals("IN STOCK") || s.equals("AVAILABLE") || s.equals("APPROVED") || s.equals("COMPLETED") || s.equals("RESOLVED");
    }

    private boolean isWarning(String s) {
        return s.equals("PENDING") || s.equals("LOW STOCK") || s.equals("MONITORING") || s.equals("IN TRANSIT") || s.equals("MODERATE") || s.equals("MEDIUM") || s.equals("BUSY") || s.equals("LOW");
    }

    private boolean isDanger(String s) {
        return s.equals("CRITICAL") || s.equals("HIGH") || s.equals("OUT OF STOCK") || s.equals("REJECTED") || s.equals("CANCELLED") || s.equals("DELAYED") || s.equals("INACTIVE");
    }

    @Override
    protected void paintComponent(Graphics g) {
        Graphics2D g2d = (Graphics2D) g.create();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        Color bg = getBackground();
        if (getHorizontalAlignment() == SwingConstants.CENTER && !bg.equals(Color.WHITE) && !bg.equals(UITheme.BG_CARD_ALT)) {
            // Fill cell background first
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, getWidth(), getHeight());

            // Draw pill shape (radius 9999px approx height/2)
            int pillH = 22;
            int pillW = getWidth() - 24;
            int yOff = (getHeight() - pillH) / 2;
            
            g2d.setColor(bg);
            g2d.fillRoundRect(12, yOff, pillW, pillH, pillH, pillH);
        } else {
            g2d.setColor(bg);
            g2d.fillRect(0, 0, getWidth(), getHeight());
        }

        setOpaque(false);
        super.paintComponent(g2d);
        g2d.dispose();
    }

    @Override
    public boolean isOpaque() { return false; }
}
