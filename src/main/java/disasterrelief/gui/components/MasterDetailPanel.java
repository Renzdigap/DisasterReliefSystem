package disasterrelief.gui.components;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.TableRowSorter;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;

public abstract class MasterDetailPanel extends JPanel {
    protected JTable table;
    protected DefaultTableModel tableModel;
    protected TableRowSorter<DefaultTableModel> sorter;
    protected JPanel formPanelContainer;
    protected JTextField txtSearch;
    protected CustomButton btnAdd, btnSave, btnDelete, btnRefresh, btnCancel;
    protected JLabel formTitleLabel;
    protected String formTitle;
    protected boolean isEditing = false;

    public MasterDetailPanel(String[] columns) {
        this(columns, "Record Details");
    }

    public MasterDetailPanel(String[] columns, String formTitle) {
        this.formTitle = formTitle;
        setLayout(new BorderLayout(0, 8));
        setOpaque(false);
        setBorder(new EmptyBorder(0, 0, 0, 0));

        // ---- Toolbar ----
        JPanel toolbar = new JPanel(new BorderLayout());
        toolbar.setOpaque(false);
        toolbar.setBorder(new EmptyBorder(0, 0, 8, 0));

        JPanel searchPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 0));
        searchPanel.setOpaque(false);
        JLabel lblSearch = new JLabel("Search:");
        lblSearch.setFont(UITheme.FONT_BODY);
        lblSearch.setForeground(UITheme.TEXT_SECONDARY);
        searchPanel.add(lblSearch);
        txtSearch = new JTextField(25);
        UITheme.styleTextField(txtSearch);
        txtSearch.addKeyListener(new KeyAdapter() {
            @Override
            public void keyReleased(KeyEvent e) {
                String text = txtSearch.getText().trim();
                if (text.isEmpty()) sorter.setRowFilter(null);
                else sorter.setRowFilter(RowFilter.regexFilter("(?i)" + text));
            }
        });
        searchPanel.add(txtSearch);

        JPanel actionPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 4, 0));
        actionPanel.setOpaque(false);
        btnRefresh = new CustomButton("Refresh", UITheme.COLOR_SLATE, Color.WHITE);
        btnAdd = new CustomButton("+ New", UITheme.COLOR_PRIMARY, Color.WHITE);
        actionPanel.add(btnRefresh);
        actionPanel.add(btnAdd);

        toolbar.add(searchPanel, BorderLayout.WEST);
        toolbar.add(actionPanel, BorderLayout.EAST);
        add(toolbar, BorderLayout.NORTH);

        // ---- Table ----
        tableModel = new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        table = new JTable(tableModel);
        UITheme.styleTable(table);
        table.setDefaultRenderer(Object.class, new StatusBadgeRenderer());
        sorter = new TableRowSorter<>(tableModel);
        table.setRowSorter(sorter);

        JScrollPane scrollPane = new JScrollPane(table);
        UITheme.styleScrollPane(scrollPane);

        // ---- Form Container ----
        formPanelContainer = new JPanel(new BorderLayout());
        formPanelContainer.setBackground(UITheme.BG_CARD);
        formPanelContainer.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(UITheme.BORDER_SUBTLE),
            new EmptyBorder(16, 16, 16, 16)
        ));

        showForm(false);

        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, scrollPane, formPanelContainer);
        splitPane.setDividerLocation(0.65);
        splitPane.setResizeWeight(0.7);
        splitPane.setBorder(null);
        splitPane.setOpaque(false);
        add(splitPane, BorderLayout.CENTER);

        // ---- Listeners ----
        table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting() && table.getSelectedRow() != -1) {
                isEditing = true;
                onRowSelected();
                showForm(true);
            }
        });

        btnAdd.addActionListener(e -> {
            table.clearSelection();
            isEditing = false;
            onAddNew();
            showForm(true);
        });

        btnRefresh.addActionListener(e -> {
            loadData();
            showForm(false);
        });
    }

    protected void setupFormPanel(JPanel customForm) {
        formPanelContainer.removeAll();

        formTitleLabel = new JLabel(formTitle);
        formTitleLabel.setFont(UITheme.FONT_HEADER_LARGE);
        formTitleLabel.setForeground(UITheme.TEXT_PRIMARY);
        formTitleLabel.setBorder(new EmptyBorder(0, 0, 16, 0));
        formPanelContainer.add(formTitleLabel, BorderLayout.NORTH);

        formPanelContainer.add(customForm, BorderLayout.CENTER);

        JPanel bottomPanel = new JPanel(new BorderLayout());
        bottomPanel.setOpaque(false);
        bottomPanel.setBorder(new EmptyBorder(16, 0, 0, 0));

        btnDelete = new CustomButton("Delete", UITheme.COLOR_DANGER, Color.WHITE);
        btnCancel = new CustomButton("Cancel", UITheme.COLOR_SLATE, Color.WHITE);
        btnSave = new CustomButton("Save", UITheme.COLOR_SUCCESS, Color.WHITE);

        btnCancel.addActionListener(e -> { table.clearSelection(); showForm(false); });
        btnDelete.addActionListener(e -> onDelete());
        btnSave.addActionListener(e -> onSave());

        JPanel leftActions = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 0));
        leftActions.setOpaque(false);
        leftActions.add(btnDelete);

        JPanel rightActions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 4, 0));
        rightActions.setOpaque(false);
        rightActions.add(btnCancel);
        rightActions.add(btnSave);

        bottomPanel.add(leftActions, BorderLayout.WEST);
        bottomPanel.add(rightActions, BorderLayout.EAST);
        formPanelContainer.add(bottomPanel, BorderLayout.SOUTH);
    }

    protected void showForm(boolean show) {
        formPanelContainer.setVisible(show);
        if (btnDelete != null) {
            btnDelete.setVisible(show && isEditing);
        }
        if (formTitleLabel != null) {
            formTitleLabel.setText(isEditing ? formTitle : "New " + formTitle);
        }
        revalidate();
        repaint();
    }

    protected abstract void loadData();
    protected abstract void onRowSelected();
    protected abstract void onAddNew();
    protected abstract void onSave();
    protected abstract void onDelete();
}
