package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.border.Border;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.JTableHeader;
import java.awt.*;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;

/**
 * Modern Web / SaaS Design System for Disaster Relief Resource Management System.
 * Inspired by modern web UI frameworks (Tailwind CSS, Radix, shadcn/ui):
 * Clean slate canvas, crisp elevated white cards, soft shadows, and vibrant semantic buttons.
 * Serves as the central styling manager for the entire application.
 */
public final class UITheme {

    private UITheme() {}

    // Canvas & Surface Backgrounds (Modern CSS Web Theme)
    public static final Color BG_CANVAS        = new Color(248, 250, 252);   // #F8FAFC (Slate 50)
    public static final Color BG_CARD          = Color.WHITE;                // #FFFFFF (Crisp White Card)
    public static final Color BG_CARD_ALT      = new Color(241, 245, 249);   // #F1F5F9 (Slate 100)
    public static final Color BG_HEADER_DARK   = new Color(15, 23, 42);      // #0F172A (Slate 900 Executive Banner)
    public static final Color BG_INPUT         = Color.WHITE;                // #FFFFFF
    public static final Color BG_TABLE_HEADER  = new Color(241, 245, 249);   // #F1F5F9

    // Backwards-compatible aliases
    public static final Color BG_DARKEST       = BG_CANVAS;
    public static final Color BG_HEADER        = BG_HEADER_DARK;

    // Semantic Web Palette (Tailwind CSS Inspired)
    public static final Color COLOR_PRIMARY    = new Color(37, 99, 235);     // #2563EB (Royal Blue 600)
    public static final Color COLOR_PRIMARY_HOVER = new Color(29, 78, 216); // #1D4ED8 (Blue 700)
    public static final Color COLOR_SUCCESS    = new Color(16, 185, 129);    // #10B981 (Emerald 500)
    public static final Color COLOR_DANGER     = new Color(225, 29, 72);     // #E11D48 (Rose 600)
    public static final Color COLOR_WARNING    = new Color(245, 158, 11);    // #F59E0B (Amber 500)
    public static final Color COLOR_SLATE      = new Color(71, 85, 105);     // #475569 (Slate 600)

    // Neon / Glow backward-compatibility aliases
    public static final Color NEON_BLUE        = COLOR_PRIMARY;
    public static final Color NEON_BLUE_DARK   = COLOR_PRIMARY_HOVER;
    public static final Color NEON_ORANGE      = new Color(234, 88, 12);     // #EA580C (Orange 600)
    public static final Color NEON_ORANGE_DARK = new Color(194, 65, 12);     // #C2410C (Orange 700)
    public static final Color NEON_RED         = COLOR_DANGER;
    public static final Color NEON_RED_DARK    = new Color(190, 18, 60);     // #BE123C

    // Typography
    public static final Color TEXT_PRIMARY     = new Color(15, 23, 42);      // #0F172A (Deep Slate 900)
    public static final Color TEXT_SECONDARY   = new Color(51, 65, 85);      // #334155 (Slate 700)
    public static final Color TEXT_MUTED       = new Color(100, 116, 139);   // #64748B (Slate 500)
    public static final Color TEXT_LIGHT       = Color.WHITE;

    // Structural CSS Borders & Surfaces
    public static final Color BORDER_SUBTLE    = new Color(226, 232, 240);   // #E2E8F0 (Slate 200)
    public static final Color BORDER_MEDIUM    = new Color(203, 213, 225);   // #CBD5E1 (Slate 300)
    public static final Color BORDER_DEFAULT   = BORDER_SUBTLE;
    public static final Color SURFACE_PANEL    = BG_CARD;
    public static final Color FOCUS_RING       = new Color(59, 130, 246);    // #3B82F6 (Blue 500 focus outline)

    // Layout Spacing constants
    public static final int SP_4  = 4;
    public static final int SP_8  = 8;
    public static final int SP_16 = 16;
    public static final int SP_24 = 24;

    // Fonts
    public static final Font FONT_DISPLAY      = new Font("Segoe UI", Font.BOLD, 28);
    public static final Font FONT_HEADER_LARGE = new Font("Segoe UI", Font.BOLD, 22);
    public static final Font FONT_HEADER_MID   = new Font("Segoe UI", Font.BOLD, 15);
    public static final Font FONT_METRIC_VALUE = new Font("Segoe UI", Font.BOLD, 22);
    public static final Font FONT_BODY_BOLD    = new Font("Segoe UI", Font.BOLD, 12);
    public static final Font FONT_BODY         = new Font("Segoe UI", Font.PLAIN, 12);
    public static final Font FONT_SMALL        = new Font("Segoe UI", Font.PLAIN, 11);

    /**
     * Styles a JTable to match modern web SaaS data tables:
     * Subtle horizontal dividers, clean hoverable rows, crisp slate headers.
     */
    public static void styleTable(JTable table) {
        table.setBackground(Color.WHITE);
        table.setForeground(TEXT_PRIMARY);
        table.setGridColor(BORDER_SUBTLE);
        table.setRowHeight(30);
        table.setFont(FONT_BODY);
        table.setSelectionBackground(new Color(224, 231, 255)); // Soft modern indigo selection
        table.setSelectionForeground(TEXT_PRIMARY);
        table.setShowHorizontalLines(true);
        table.setShowVerticalLines(false);

        // Modern Header
        JTableHeader header = table.getTableHeader();
        header.setBackground(BG_TABLE_HEADER);
        header.setForeground(TEXT_SECONDARY);
        header.setFont(FONT_BODY_BOLD);
        header.setPreferredSize(new Dimension(0, 34));
        header.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, BORDER_MEDIUM));

        // Alternating row renderer with padding
        DefaultTableCellRenderer renderer = new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable tbl, Object value, boolean isSelected, boolean hasFocus, int row, int col) {
                Component c = super.getTableCellRendererComponent(tbl, value, isSelected, hasFocus, row, col);
                if (!isSelected) {
                    c.setBackground(row % 2 == 0 ? Color.WHITE : BG_CARD_ALT);
                    c.setForeground(TEXT_PRIMARY);
                } else {
                    c.setBackground(new Color(224, 231, 255));
                    c.setForeground(TEXT_PRIMARY);
                }
                setBorder(new EmptyBorder(0, 10, 0, 10));
                return c;
            }
        };
        table.setDefaultRenderer(Object.class, renderer);
    }

    /**
     * Styles a JTextField like a modern web input field:
     * 1px crisp border, comfortable padding, dynamic focus ring.
     */
    public static void styleTextField(JTextField field, Color accentColor) {
        field.setBackground(Color.WHITE);
        field.setForeground(TEXT_PRIMARY);
        field.setCaretColor(COLOR_PRIMARY);
        field.setFont(FONT_BODY);

        Border normalBorder = new CompoundBorder(
                new LineBorder(BORDER_MEDIUM, 1),
                new EmptyBorder(6, 10, 6, 10)
        );
        Border focusedBorder = new CompoundBorder(
                new LineBorder(FOCUS_RING, 2),
                new EmptyBorder(5, 9, 5, 9)
        );

        field.setBorder(normalBorder);
        field.addFocusListener(new FocusAdapter() {
            @Override
            public void focusGained(FocusEvent e) {
                field.setBorder(focusedBorder);
            }

            @Override
            public void focusLost(FocusEvent e) {
                field.setBorder(normalBorder);
            }
        });
    }

    /**
     * Overload defaulting to primary blue focus ring.
     */
    public static void styleTextField(JTextField field) {
        styleTextField(field, COLOR_PRIMARY);
    }

    /**
     * Styles a JComboBox like a clean modern web select element.
     */
    public static void styleComboBox(JComboBox<?> box, Color accentColor) {
        box.setBackground(Color.WHITE);
        box.setForeground(TEXT_PRIMARY);
        box.setFont(FONT_BODY);
        box.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER_MEDIUM, 1),
                new EmptyBorder(4, 8, 4, 8)
        ));

        box.setRenderer(new DefaultListCellRenderer() {
            @Override
            public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected, boolean cellHasFocus) {
                Component c = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
                if (isSelected) {
                    c.setBackground(COLOR_PRIMARY);
                    c.setForeground(Color.WHITE);
                } else {
                    c.setBackground(Color.WHITE);
                    c.setForeground(TEXT_PRIMARY);
                }
                setBorder(new EmptyBorder(6, 10, 6, 10));
                return c;
            }
        });
    }

    /**
     * Styles a JScrollPane to match modern web clean borders.
     */
    public static void styleScrollPane(JScrollPane scrollPane) {
        scrollPane.getViewport().setBackground(Color.WHITE);
        scrollPane.setBackground(Color.WHITE);
        scrollPane.setBorder(new LineBorder(BORDER_SUBTLE, 1));
    }
}
