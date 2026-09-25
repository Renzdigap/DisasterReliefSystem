package disasterrelief.gui.panels;

import disasterrelief.dao.VolunteerDAO;
import disasterrelief.gui.components.EmptyStateTable;
import disasterrelief.gui.components.UITheme;
import disasterrelief.model.Volunteer;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class VolunteersPanel extends JPanel {
    private final VolunteerDAO dao = new VolunteerDAO();
    private EmptyStateTable emptyStateTable;

    public VolunteersPanel() {
        setLayout(new BorderLayout(0, 16));
        setOpaque(false);

        JLabel title = new JLabel("Volunteer Directory");
        title.setFont(UITheme.FONT_HEADER_LARGE);
        title.setForeground(UITheme.TEXT_PRIMARY);

        JPanel header = new JPanel(new BorderLayout());
        header.setOpaque(false);
        header.add(title, BorderLayout.WEST);

        add(header, BorderLayout.NORTH);

        String[] cols = {"Volunteer ID", "User ID", "Name", "Vehicle Type", "Available"};
        emptyStateTable = new EmptyStateTable(cols, "No volunteers registered yet.");
        add(emptyStateTable, BorderLayout.CENTER);

        loadData();
    }

    private void loadData() {
        DefaultTableModel model = emptyStateTable.getTableModel();
        model.setRowCount(0);
        List<Volunteer> list = dao.getAllVolunteers();
        for (Volunteer v : list) {
            model.addRow(new Object[]{
                v.getVolunteerId(), v.getUserId(), v.getVolunteerName(), 
                v.getVehicleType(), v.isAvailable() ? "Yes" : "No"
            });
        }
        emptyStateTable.updateState();
    }
}
