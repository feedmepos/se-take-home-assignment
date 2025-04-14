package all.mcd;

import javafx.application.Application;
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
    int botCounter = 1;
    ObservableList<Order> pendingOrders = FXCollections.observableArrayList();
    ObservableList<Order> completedOrders = FXCollections.observableArrayList();
    ObservableList<Thread> workingBot = FXCollections.observableArrayList();

    @Override
    public void start(Stage primaryStage) {

        VBox root = new VBox(5);
        root.setAlignment(Pos.CENTER);

        Label orderLabel = new Label("Order");
        orderLabel.setStyle("-fx-font-weight: bold;-fx-font-size: 20");
        root.getChildren().add(orderLabel);

        GridPane customerGrid = new GridPane();
        customerGrid.setAlignment(Pos.CENTER);
        customerGrid.setHgap(5);
        customerGrid.setVgap(5);
        root.getChildren().add(customerGrid);

        Label pendingLabel = new Label("Pending");
        pendingLabel.setStyle("-fx-font-size: 16");
        Label completedLabel = new Label("Completed");
        completedLabel.setStyle("-fx-font-size: 16");

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

        HBox orderControlPanel = new HBox(10);
        orderControlPanel.setAlignment(Pos.CENTER);
        root.getChildren().add(orderControlPanel);

        Button normalOrderButton = new Button("Order");
        orderControlPanel.getChildren().add(normalOrderButton);
        Button VIPOrderButton = new Button("VIP Order");
        orderControlPanel.getChildren().add(VIPOrderButton);

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

        customerGrid.add(pendingLabel, 0, 0);
        customerGrid.add(completedLabel, 1, 0);
        customerGrid.add(pendingTable, 0, 1);
        customerGrid.add(completedTable, 1, 1);

        Label adminLabel = new Label("Admin");
        adminLabel.setStyle("-fx-font-weight: bold;-fx-font-size: 20");
        root.getChildren().add(adminLabel);

        Label botCount = new Label("0 Bot Working");
        root.getChildren().add(botCount);

        HBox botControlPanel = new HBox();
        botControlPanel.setAlignment(Pos.CENTER);
        botControlPanel.setSpacing(10);
        root.getChildren().add(botControlPanel);

        Button addBotButton = new Button("Add Bot");
        botControlPanel.getChildren().add(addBotButton);

        Button removeBotButton = new Button("Remove Bot");
        botControlPanel.getChildren().add(removeBotButton);

        addBotButton.setOnAction(event -> {
            Thread bot = new Thread(() -> runBot(botCounter));
            bot.setDaemon(true);
            bot.start();
            workingBot.add(bot);
            botCount.setText(botCounter + " bot working");
            botCounter++;
        });

        removeBotButton.setOnAction(event -> {
            if (!workingBot.isEmpty()) {
                Thread lastBot = workingBot.removeLast();
                lastBot.interrupt();
                botCounter--;
                botCount.setText(botCounter + " bot working");
            }
        });

        Scene scene = new Scene(root,700,600);
        primaryStage.setScene(scene);
        primaryStage.setTitle("MCD");
        primaryStage.show();
    }

    private void runBot(int botID){
        while (!Thread.currentThread().isInterrupted()) {
            Order orderToCook = null;

            for (Order order : pendingOrders) {
                if (!order.isCooking()){
                    orderToCook = order;
                    order.setProcessing(true);
                    break;
                }
            }

            if (orderToCook != null) {
                try{
                    Thread.sleep(10000);
                    pendingOrders.remove(orderToCook);
                    completedOrders.add(orderToCook);
                }catch (InterruptedException e){
                    int indexOfInterruptOrder = pendingOrders.indexOf(orderToCook);
                    pendingOrders.get(indexOfInterruptOrder).setProcessing(false);
                    break;
                }
            }

            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                break;
            }
        }
    }
}

