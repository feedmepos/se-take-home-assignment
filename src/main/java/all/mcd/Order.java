package all.mcd;

public class Order{

    private int id;
    private String role;

    public Order(int id, String role) {
        this.id = id;
        this.role = role;
    }

    public int getId() {return id;}
    public String getRole() {return role;}
}
