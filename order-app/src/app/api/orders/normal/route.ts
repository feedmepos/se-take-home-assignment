import { controller } from "@/lib/order-controller";
import { OrderType } from "@/lib/types";

export async function POST() {
  const order = controller.createOrder(OrderType.NORMAL);

  return Response.json(order);
}