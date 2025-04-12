package all.mcd;

import javafx.application.Application;
import javafx.beans.Observable;
import javafx.beans.property.SimpleObjectProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {

    public static void main(String[] args) {
        launch(args);
    }



    int orderCounter = 1;
    ObservableList<Order> pendingOrders = FXCollections.observableArrayList();
    ObservableList<Order> completedOrders = FXCollections.observableArrayList();

    @Override
    public void start(Stage primaryStage) {

        HBox root = new HBox();
        root.setAlignment(Pos.CENTER);

        VBox customerPanel = new VBox();
        customerPanel.setAlignment(Pos.CENTER);
        root.getChildren().add(customerPanel);

        GridPane customerGrid = new GridPane();
        customerGrid.setAlignment(Pos.CENTER);
        customerGrid.setHgap(10);
        customerGrid.setVgap(10);
        customerPanel.getChildren().add(customerGrid);

        TableView<Order> pendingTable = new TableView<>();

        TableColumn<Order, Integer> pendingIdCol = new TableColumn<>("Order ID");
        TableColumn<Order, String> pendingRoleCol = new TableColumn<>("Role");

        pendingIdCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getId()));
        pendingRoleCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getRole()));

        pendingTable.getColumns().addAll(pendingIdCol, pendingRoleCol);
        pendingTable.setItems(pendingOrders);


        TableView<Order> completedTable = new TableView<>();

        TableColumn<Order, Integer> completedIdCol2 = new TableColumn<>("Order ID");
        TableColumn<Order, String> completedRoleCol2 = new TableColumn<>("Role");

        completedIdCol2.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getId()));
        completedRoleCol2.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getRole()));

        completedTable.getColumns().addAll(completedIdCol2, completedRoleCol2);
        completedTable.setItems(completedOrders);

        Spinner<Integer> normalOrderSpinner = new Spinner<>(0,Integer.MAX_VALUE,1);
        Spinner<Integer> VIPOrderSpinner = new Spinner<>(0,Integer.MAX_VALUE,1);

        Button normalOrderButton = new Button("Order");
        Button VIPOrderButton = new Button("VIP Order");

        normalOrderButton.setOnAction(event -> {
            pendingOrders.add(new Order(orderCounter,"customer"));
            orderCounter++;
        });

        VIPOrderButton.setOnAction(event -> {
            for (Order order : pendingOrders) {
                if (!order.getRole().equals("VIP")) {
                    int index = pendingOrders.indexOf(order);
                    pendingOrders.add(index, new Order(orderCounter, "VIP"));
                    orderCounter++;
                    return;
                }
            }
            pendingOrders.add(new Order(orderCounter, "VIP"));
            orderCounter++;
        });

        customerGrid.add(pendingTable, 0, 0,2,1);
        customerGrid.add(completedTable, 2, 0,2,1);
        customerGrid.add(normalOrderSpinner, 1, 1);
        customerGrid.add(normalOrderButton, 1, 2);
        customerGrid.add(VIPOrderSpinner, 3, 1);
        customerGrid.add(VIPOrderButton, 3, 2);

        VBox adminPanel = new VBox();
        adminPanel.setAlignment(Pos.CENTER);
        root.getChildren().add(adminPanel);

        ScrollPane adminScrollPane = new ScrollPane();
        VBox botDisplayVBox = new VBox();
        botDisplayVBox.setAlignment(Pos.CENTER);
        adminScrollPane.setContent(botDisplayVBox);

        Button addbotButton = new Button("Add Bot");
        addbotButton.setOnAction(event -> {

        });

        Scene scene = new Scene(root,700,500);
        primaryStage.setScene(scene);
        primaryStage.setTitle("MCD");
        primaryStage.show();
    }
}