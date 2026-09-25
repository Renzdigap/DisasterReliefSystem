package disasterrelief.gui.panels;

import disasterrelief.dao.OrganizationDAO;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.Organization;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class OrganizationsPanel extends JPanel {
    private final OrganizationDAO dao = new OrganizationDAO();
    private EmptyStateTable emptyStateTable;

    public OrganizationsPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);

        JLabel title = new JLabel("Partner Organizations");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        JPanel header = new JPanel(new BorderLayout());
        header.setOpaque(false);
        header.add(title, BorderLayout.WEST);

        add(header, BorderLayout.NORTH);

        String[] cols = {"Organization ID", "User ID", "Organization Name", "Location"};
        emptyStateTable = new EmptyStateTable(cols, "No partner organizations registered.");
        add(emptyStateTable, BorderLayout.CENTER);

        loadData();
    }

    private void loadData() {
        DefaultTableModel model = emptyStateTable.getTableModel();
        model.setRowCount(0);
        List<Organization> list = dao.getAllOrganizations();
        for (Organization o : list) {
            model.addRow(new Object[]{
                o.getOrgId(), o.getUserId(), o.getOrgName(), o.getLocation()
            });
        }
        emptyStateTable.updateState();
    }
}
