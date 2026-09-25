package disasterrelief.gui.panels;

import disasterrelief.model.ReliefRequest;
import disasterrelief.utils.SessionManager;
import java.util.List;

public class MyRequestsPanel extends RequestsPanel {
    
    public MyRequestsPanel() {
        super();
        btnAdd.setVisible(false);
        btnDelete.setVisible(false);
        btnSave.setVisible(false);
    }

    @Override
    protected void loadData() {
        if (tableModel == null) return;
        tableModel.setRowCount(0);
        
        if (SessionManager.getCurrentUser() == null) return;
        
        List<ReliefRequest> requests = new disasterrelief.dao.ReliefRequestDAO().getRequestsByUserId(SessionManager.getCurrentUser().getId());
        for (ReliefRequest r : requests) {
            tableModel.addRow(new Object[]{
                r.getRequestId(),
                r.getOrgName(),
                r.getEventName(),
                r.getRequestDate(),
                r.getStatus()
            });
        }
    }
}
