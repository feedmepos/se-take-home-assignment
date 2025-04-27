import { orderService } from "@/services";
import { NextRequest } from "next/server";
import z from "zod";

export const GET = () => {
  const orders = orderService.getOrders().map((o) => o.toJSON());
  return Response.json(orders, {
    status: 200,
  });
};

const postSchema = z.object({
  isPriority: z.boolean().default(false),
});

export const POST = async (req: NextRequest) => {
  const payload = postSchema.safeParse(await req.json());
  if (payload.error) {
    return Response.json({ message: payload.error.message }, { status: 400 });
  }
  const order = orderService.createOrder(payload.data.isPriority).toJSON();
  return Response.json(order, {
    status: 200,
  });
};
