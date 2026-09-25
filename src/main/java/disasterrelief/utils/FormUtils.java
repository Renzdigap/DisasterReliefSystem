package disasterrelief.utils;

import disasterrelief.gui.components.UITheme;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * Modern utility class providing standardized form-building helpers,
 * input field containers, styling, and validation wrappers across portals.
 */
public class FormUtils {

    /**
     * Creates a standardized vertical form field with a styled label and input component.
     *
     * @param labelText The display label text
     * @param field     The input component (e.g. JTextField, JComboBox, etc.)
     * @return A JPanel formatted for modern form layouts
     */
    public static JPanel createFormField(String labelText, JComponent field) {
        return createFormField(labelText, field, null);
    }

    /**
     * Creates a standardized vertical form field with a styled label, input component, and hint text.
     *
     * @param labelText The display label text
     * @param field     The input component
     * @param hintText  Optional helper / format hint text shown below the field
     * @return Form field panel
     */
    public static JPanel createFormField(String labelText, JComponent field, String hintText) {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setOpaque(false);
        panel.setAlignmentX(Component.LEFT_ALIGNMENT);

        JLabel lbl = new JLabel(labelText);
        lbl.setFont(UITheme.FONT_BODY_BOLD);
        lbl.setForeground(UITheme.TEXT_SECONDARY);
        lbl.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(lbl);
        panel.add(Box.createRigidArea(new Dimension(0, 6)));

        field.setAlignmentX(Component.LEFT_ALIGNMENT);
        if (field instanceof JTextField) {
            UITheme.styleTextField((JTextField) field);
            field.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
            field.setPreferredSize(new Dimension(320, 38));
        } else if (field instanceof JComboBox) {
            field.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
            field.setPreferredSize(new Dimension(320, 38));
        }
        panel.add(field);

        if (hintText != null && !hintText.trim().isEmpty()) {
            panel.add(Box.createRigidArea(new Dimension(0, 4)));
            JLabel lblHint = new JLabel(hintText);
            lblHint.setFont(UITheme.FONT_SMALL);
            lblHint.setForeground(UITheme.TEXT_MUTED);
            lblHint.setAlignmentX(Component.LEFT_ALIGNMENT);
            panel.add(lblHint);
        }

        panel.add(Box.createRigidArea(new Dimension(0, 14)));
        return panel;
    }

    /**
     * Creates a clean section header with title and subtitle.
     */
    public static JPanel createSectionHeader(String title, String subtitle) {
        JPanel headerPanel = new JPanel();
        headerPanel.setLayout(new BoxLayout(headerPanel, BoxLayout.Y_AXIS));
        headerPanel.setOpaque(false);
        headerPanel.setAlignmentX(Component.LEFT_ALIGNMENT);

        JLabel lblTitle = new JLabel(title);
        lblTitle.setFont(UITheme.FONT_HEADER_LARGE);
        lblTitle.setForeground(UITheme.TEXT_PRIMARY);
        lblTitle.setAlignmentX(Component.LEFT_ALIGNMENT);

        JLabel lblSub = new JLabel(subtitle);
        lblSub.setFont(UITheme.FONT_BODY);
        lblSub.setForeground(UITheme.TEXT_MUTED);
        lblSub.setAlignmentX(Component.LEFT_ALIGNMENT);

        headerPanel.add(lblTitle);
        headerPanel.add(Box.createRigidArea(new Dimension(0, 4)));
        headerPanel.add(lblSub);
        headerPanel.add(Box.createRigidArea(new Dimension(0, 16)));

        return headerPanel;
    }

    /**
     * Creates an elevated card container for forms.
     */
    public static JPanel createCardContainer() {
        JPanel card = new JPanel();
        card.setBackground(UITheme.BG_CARD);
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(UITheme.BORDER_SUBTLE, 1, true),
                new EmptyBorder(24, 28, 24, 28)
        ));
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setAlignmentX(Component.LEFT_ALIGNMENT);
        return card;
    }

    /**
     * Creates a horizontal button group for form submission/actions.
     */
    public static JPanel createButtonGroup(JButton... buttons) {
        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 12, 0));
        btnPanel.setOpaque(false);
        btnPanel.setAlignmentX(Component.LEFT_ALIGNMENT);

        for (JButton btn : buttons) {
            btnPanel.add(btn);
        }
        return btnPanel;
    }

    /**
     * Validates contact number format using ValidationUtils.
     */
    public static boolean validateContactNumber(String contact) {
        return ValidationUtils.isValidContactNumber(contact);
    }

    /**
     * Displays a standardized success message dialog.
     */
    public static void showSuccess(Component parent, String message, String title) {
        JOptionPane.showMessageDialog(parent, message, title != null ? title : "Success", JOptionPane.INFORMATION_MESSAGE);
    }

    /**
     * Displays a standardized error message dialog.
     */
    public static void showError(Component parent, String message, String title) {
        JOptionPane.showMessageDialog(parent, message, title != null ? title : "Validation Error", JOptionPane.ERROR_MESSAGE);
    }
}
