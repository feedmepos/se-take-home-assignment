import { OrderProvider } from "./context/OrderContext";
import { KitchenPage } from "./pages/KitchenPage";

export default function App() {
  return (
    <OrderProvider>
      <KitchenPage />
    </OrderProvider>
  );
}
