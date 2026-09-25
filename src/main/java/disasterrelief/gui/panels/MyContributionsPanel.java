package disasterrelief.gui.panels;

import disasterrelief.model.Donation;
import disasterrelief.utils.SessionManager;
import java.util.List;

public class MyContributionsPanel extends DonationsPanel {
    
    public MyContributionsPanel() {
        super();
        btnAdd.setVisible(false);
        btnDelete.setVisible(false);
        btnSave.setVisible(false);
    }

    @Override
    protected void loadData() {
        if (tableModel == null) return; // Might be called by super() before initialization
        tableModel.setRowCount(0);
        
        if (SessionManager.getCurrentUser() == null) return;
        
        List<Donation> donations = new disasterrelief.dao.DonationDAO().getDonationsByUserId(SessionManager.getCurrentUser().getId());
        for (Donation d : donations) {
            tableModel.addRow(new Object[]{
                d.getDonationId(),
                d.getDonorName(),
                d.getEventName() != null ? d.getEventName() : "General Fund",
                d.getDonationDate(),
                d.getStatus()
            });
        }
    }
}
