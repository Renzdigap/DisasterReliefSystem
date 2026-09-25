package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing warehouse inventory tracking for a relief good.
 * Maps to the 'Inventory' database table.
 */
public class Inventory implements Serializable {
    private static final long serialVersionUID = 1L;

    private int inventoryId;
    private int goodId;
    private int currentStock;

    // Joined helper fields from ReliefGood
    private String itemName;
    private String category;
    private String unitOfMeasure;

    public Inventory() {
    }

    public Inventory(int inventoryId, int goodId, int currentStock) {
        this.inventoryId = inventoryId;
        this.goodId = goodId;
        this.currentStock = currentStock;
    }

    public Inventory(int inventoryId, int goodId, int currentStock, String itemName, String category, String unitOfMeasure) {
        this.inventoryId = inventoryId;
        this.goodId = goodId;
        this.currentStock = currentStock;
        this.itemName = itemName;
        this.category = category;
        this.unitOfMeasure = unitOfMeasure;
    }

    public int getInventoryId() {
        return inventoryId;
    }

    public void setInventoryId(int inventoryId) {
        this.inventoryId = inventoryId;
    }

    public int getGoodId() {
        return goodId;
    }

    public void setGoodId(int goodId) {
        this.goodId = goodId;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(int currentStock) {
        this.currentStock = currentStock;
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
        return (itemName != null ? itemName : "Good #" + goodId) + ": " + currentStock + " " + (unitOfMeasure != null ? unitOfMeasure : "units");
    }
}
