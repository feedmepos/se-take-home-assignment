module all.mcd {
    requires javafx.controls;
    requires javafx.fxml;


    opens all.mcd to javafx.fxml;
    exports all.mcd;
}