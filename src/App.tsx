import React from "react";
import OrdersPage from "./pages/Orders/OrdersPage";
// @ts-ignore: CSS module types omitted for rapid prototype
import styles from "./styles/globals.module.css";

/**
 * 根组件（移动端容器）
 */
const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <OrdersPage />
    </div>
  );
};

export default App;
