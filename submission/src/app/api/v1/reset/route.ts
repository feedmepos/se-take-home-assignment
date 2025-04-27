import { reset } from "@/services";

export const POST = () => {
  reset();
  return new Response("OK", { status: 200 });
};
