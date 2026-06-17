import { useContext } from "react";
import { OrderContext } from "../context/OrderContext";

export function useOrderContext() {
  const ctx = useContext(OrderContext);
  if (!ctx)
    throw new Error("useOrderContext must be used within OrderProvider");
  return ctx;
}
