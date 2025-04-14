package all.mcd;

public class Order{

    private final int id;
    private final String role;
    private boolean cooking = false;

    public Order(int id, String role) {
        this.id = id;
        this.role = role;
    }

    public int getId() {return id;}
    public String getRole() {return role;}
    public boolean isCooking() {return cooking;}

    public void setProcessing(boolean cooking) {
        this.cooking = cooking;
    }
}
