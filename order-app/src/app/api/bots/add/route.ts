import { controller } from "@/lib/order-controller";

export async function POST() {
  try {
    const bot = controller.addBot();

    if (!bot) {
      return Response.json(
        { success: false, message: "Failed to create bot" },
        { status: 400 }
      );
    }

    return Response.json(
      { success: true },
      { status: 201 }
    );

  } catch (err) {
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}