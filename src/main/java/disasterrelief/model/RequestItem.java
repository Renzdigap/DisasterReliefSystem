package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing a specific line item in a Relief Request.
 * Maps to the 'RequestItem' database table.
 */
public class RequestItem implements Serializable {
    private static final long serialVersionUID = 1L;

    private int requestItemId;
    private int requestId;
    private int goodId;
    private int quantity;

    // Joined helper fields
    private String itemName;
    private String category;
    private String unitOfMeasure;

    public RequestItem() {
    }

    public RequestItem(int requestItemId, int requestId, int goodId, int quantity) {
        this.requestItemId = requestItemId;
        this.requestId = requestId;
        this.goodId = goodId;
        this.quantity = quantity;
    }

    public RequestItem(int requestItemId, int requestId, int goodId, int quantity, String itemName, String category, String unitOfMeasure) {
        this.requestItemId = requestItemId;
        this.requestId = requestId;
        this.goodId = goodId;
        this.quantity = quantity;
        this.itemName = itemName;
        this.category = category;
        this.unitOfMeasure = unitOfMeasure;
    }

    public int getRequestItemId() {
        return requestItemId;
    }

    public void setRequestItemId(int requestItemId) {
        this.requestItemId = requestItemId;
    }

    public int getRequestId() {
        return requestId;
    }

    public void setRequestId(int requestId) {
        this.requestId = requestId;
    }

    public int getGoodId() {
        return goodId;
    }

    public void setGoodId(int goodId) {
        this.goodId = goodId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
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
        return (itemName != null ? itemName : "Good #" + goodId) + " x " + quantity + " " + (unitOfMeasure != null ? unitOfMeasure : "");
    }
}
