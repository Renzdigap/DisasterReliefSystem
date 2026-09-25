package disasterrelief.gui.components;

import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

/**
 * Modern Web / CSS Styled Button (Tailwind UI / shadcn Style).
 * Features solid vibrant colors, 8px rounded corners, crisp 1px borders,
 * soft tactile elevation shadow, and smooth hover/pressed feedback.
 */
public class CustomButton extends JButton {

    private final Color normalBg;
    private final Color hoverBg;
    private final Color pressedBg;
    private boolean isHovered = false;
    private boolean isPressed = false;

    public CustomButton(String text, Color bgColor, Color fgColor) {
        super(text);
        this.normalBg = bgColor;
        this.hoverBg = computeHoverColor(bgColor);
        this.pressedBg = bgColor.darker();

        setFont(new Font("Segoe UI", Font.BOLD, 12));
        setForeground(fgColor != null ? fgColor : Color.WHITE);
        setFocusPainted(false);
        setBorderPainted(false);
        setContentAreaFilled(false);
        setOpaque(false);
        setCursor(new Cursor(Cursor.HAND_CURSOR));
        setBorder(BorderFactory.createEmptyBorder(7, 18, 7, 18));

        addMouseListener(new MouseAdapter() {
            @Override
            public void mouseEntered(MouseEvent e) {
                isHovered = true;
                repaint();
            }

            @Override
            public void mouseExited(MouseEvent e) {
                isHovered = false;
                repaint();
            }

            @Override
            public void mousePressed(MouseEvent e) {
                isPressed = true;
                repaint();
            }

            @Override
            public void mouseReleased(MouseEvent e) {
                isPressed = false;
                repaint();
            }
        });
    }

    /**
     * Convenient 4-arg constructor for backwards compatibility.
     */
    public CustomButton(String text, Color glowColor, Color bgColor, Color fgColor) {
        this(text, glowColor != null ? glowColor : bgColor, fgColor);
    }

    private Color computeHoverColor(Color c) {
        int r = Math.min(255, (int)(c.getRed() * 1.12) + 12);
        int g = Math.min(255, (int)(c.getGreen() * 1.12) + 12);
        int b = Math.min(255, (int)(c.getBlue() * 1.12) + 12);
        return new Color(r, g, b);
    }

    @Override
    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g.create();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        int width = getWidth();
        int height = getHeight();

        // 1. Modern Web Subtle Button Drop Shadow (box-shadow: 0 1px 2px rgba(0,0,0,0.08))
        if (!isPressed) {
            g2.setColor(new Color(0, 0, 0, 20));
            g2.fillRoundRect(1, 2, width - 2, height - 2, 8, 8);
        }

        // 2. Button Body Fill
        int yOffset = isPressed ? 1 : 0;
        if (isPressed) {
            g2.setColor(pressedBg);
        } else if (isHovered) {
            g2.setColor(hoverBg);
        } else {
            g2.setColor(normalBg);
        }
        g2.fillRoundRect(0, yOffset, width - 1, height - 2, 8, 8);

        // 3. Crisp 1px Border (Tailwind style)
        g2.setColor(normalBg.darker());
        g2.setStroke(new BasicStroke(1.0f));
        g2.drawRoundRect(0, yOffset, width - 1, height - 2, 8, 8);

        g2.dispose();
        super.paintComponent(g);
    }
}
