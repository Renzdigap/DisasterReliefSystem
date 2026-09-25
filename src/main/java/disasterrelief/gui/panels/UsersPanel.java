package disasterrelief.gui.panels;

import disasterrelief.dao.UserDAO;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.User;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class UsersPanel extends JPanel {
    private final UserDAO dao = new UserDAO();
    private EmptyStateTable emptyStateTable;

    public UsersPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);

        JLabel title = new JLabel("User Accounts & Access Control");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        JPanel header = new JPanel(new BorderLayout());
        header.setOpaque(false);
        header.add(title, BorderLayout.WEST);

        add(header, BorderLayout.NORTH);

        String[] cols = {"User ID", "Username", "Full Name", "Role", "Contact Info"};
        emptyStateTable = new EmptyStateTable(cols, "No user accounts found.");
        add(emptyStateTable, BorderLayout.CENTER);

        loadData();
    }

    private void loadData() {
        DefaultTableModel model = emptyStateTable.getTableModel();
        model.setRowCount(0);
        List<User> list = dao.getAllUsers();
        for (User u : list) {
            model.addRow(new Object[]{
                u.getUserId(), u.getUsername(), u.getFullName(), u.getRole(), u.getContactInfo()
            });
        }
        emptyStateTable.updateState();
    }
}
