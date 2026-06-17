import { controller } from "@/lib/order-controller";

export async function GET() {
  return Response.json(controller.getState());
}