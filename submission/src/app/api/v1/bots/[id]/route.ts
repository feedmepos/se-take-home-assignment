import { botAllocationService } from "@/services";
import { NextRequest } from "next/server";

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const botId = Number(id);
  botAllocationService.undeploy(botId);
  return new Response(null, { status: 204 });
};
