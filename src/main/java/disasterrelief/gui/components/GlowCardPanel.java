package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * Modern Elevated Web Card Panel (CSS-Style Card).
 * Features soft elevation drop-shadow, crisp white surface, smooth 10px rounded corners,
 * and optional colored accent indicators (Blue, Orange, Red).
 */
public class GlowCardPanel extends JPanel {

    public enum GlowStyle {
        ORANGE,
        RED,
        DUAL_ORANGE_RED,
        DUAL_ORANGE_BLUE,
        BLUE
    }

    private final GlowStyle glowStyle;
    private final int cornerRadius;

    public GlowCardPanel(GlowStyle style) {
        this(style, 10, 16);
    }

    public GlowCardPanel(GlowStyle style, int cornerRadius, int padding) {
        this.glowStyle = style;
        this.cornerRadius = cornerRadius;
        setOpaque(false);
        setBorder(new EmptyBorder(padding, padding, padding, padding));
    }

    @Override
    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g.create();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int width = getWidth();
        int height = getHeight();

        int inset = 3;
        int cardW = width - (inset * 2) - 1;
        int cardH = height - (inset * 2) - 1;

        // 1. Modern Web CSS Soft Drop Shadow (Simulating: box-shadow 0 4px 6px -1px rgba(0,0,0,0.06))
        g2.setColor(new Color(0, 0, 0, 8));
        g2.fillRoundRect(inset - 1, inset + 2, cardW + 2, cardH + 1, cornerRadius + 2, cornerRadius + 2);
        g2.setColor(new Color(0, 0, 0, 14));
        g2.fillRoundRect(inset, inset + 1, cardW, cardH, cornerRadius, cornerRadius);

        // 2. Crisp White Card Surface
        g2.setColor(Color.WHITE);
        g2.fillRoundRect(inset, inset, cardW, cardH, cornerRadius, cornerRadius);

        // 3. Subtle 1px Border (1px solid #E2E8F0)
        g2.setColor(UITheme.BORDER_SUBTLE);
        g2.setStroke(new BasicStroke(1.0f));
        g2.drawRoundRect(inset, inset, cardW, cardH, cornerRadius, cornerRadius);

        // 4. Modern CSS Top-Accent Strip (Color-coded category indicator)
        Color accentColor = null;
        switch (glowStyle) {
            case RED:
                accentColor = UITheme.COLOR_DANGER;
                break;
            case ORANGE:
            case DUAL_ORANGE_RED:
            case DUAL_ORANGE_BLUE:
                accentColor = UITheme.NEON_ORANGE;
                break;
            case BLUE:
                accentColor = UITheme.COLOR_PRIMARY;
                break;
        }

        if (accentColor != null) {
            g2.setColor(accentColor);
            // Draw top 3px rounded accent pill
            g2.fillRoundRect(inset + 2, inset, cardW - 4, 3, 3, 3);
        }

        g2.dispose();
        super.paintComponent(g);
    }
}
