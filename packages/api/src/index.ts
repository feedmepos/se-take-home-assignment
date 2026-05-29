import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const app = createServer();

app
  .listen({ port, host })
  .then(() => {
    console.log(`FeedMe API listening on http://${host}:${port}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
