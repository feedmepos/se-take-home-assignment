import { controller } from "@/lib/order-controller";

export async function DELETE() {
  controller.removeBot();

  return Response.json({ success: true });
}