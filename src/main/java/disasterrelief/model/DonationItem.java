package disasterrelief.model;

import java.io.Serializable;

/**
 * Model representing a specific line item in a Donation transaction.
 * Maps to the 'DonationItem' database table.
 */
public class DonationItem implements Serializable {
    private static final long serialVersionUID = 1L;

    private int itemId;
    private int donationId;
    private int goodId;
    private int quantity;

    // Joined helper fields
    private String itemName;
    private String category;
    private String unitOfMeasure;

    public DonationItem() {
    }

    public DonationItem(int itemId, int donationId, int goodId, int quantity) {
        this.itemId = itemId;
        this.donationId = donationId;
        this.goodId = goodId;
        this.quantity = quantity;
    }

    public DonationItem(int itemId, int donationId, int goodId, int quantity, String itemName, String category, String unitOfMeasure) {
        this.itemId = itemId;
        this.donationId = donationId;
        this.goodId = goodId;
        this.quantity = quantity;
        this.itemName = itemName;
        this.category = category;
        this.unitOfMeasure = unitOfMeasure;
    }

    public int getItemId() {
        return itemId;
    }

    public void setItemId(int itemId) {
        this.itemId = itemId;
    }

    public int getDonationId() {
        return donationId;
    }

    public void setDonationId(int donationId) {
        this.donationId = donationId;
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
