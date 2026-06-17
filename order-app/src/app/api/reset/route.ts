// app/api/reset/route.ts

import { controller } from "@/lib/order-controller";

export async function POST() {
  controller.resetSystem();

  return Response.json({
    success: true,
  });
}