package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing a Master Relief Good in the 13-table schema.
 * Maps to the 'ReliefGood' database table.
 */
public class ReliefGood implements Serializable {
    private static final long serialVersionUID = 1L;

    private int goodId;
    private String itemName;
    private String category; // 'Water', 'Food', 'Non-Food', 'Medicine', etc.
    private String unitOfMeasure; // 'Bottles', 'Sacks', 'Cans', 'Pieces', 'Boxes', etc.

    public ReliefGood() {
    }

    public ReliefGood(int goodId, String itemName, String category, String unitOfMeasure) {
        this.goodId = goodId;
        this.itemName = itemName;
        this.category = category;
        this.unitOfMeasure = unitOfMeasure;
    }

    public int getGoodId() {
        return goodId;
    }

    public void setGoodId(int goodId) {
        this.goodId = goodId;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getUnitOfMeasure() {
        return unitOfMeasure;
    }

    public void setUnitOfMeasure(String unitOfMeasure) {
        this.unitOfMeasure = unitOfMeasure;
    }

    @Override
    public String toString() {
        return itemName + " [" + category + " / " + unitOfMeasure + "]";
    }
}
