import { botAllocationService } from "@/services";

export const GET = () => {
  const bots = botAllocationService.getDeployedBots().map((b) => b.toJSON());
  return Response.json(bots, {
    status: 200,
  });
};

export const POST = () => {
  const bot = botAllocationService.deploy().toJSON();
  return Response.json(bot, {
    status: 200,
  });
};
