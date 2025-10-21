const request = require("supertest");
const express = require("express");
const app = express();
const ordersRouter = require("../routes/ordersRouter.js");
const botsRouter = require("../routes/botsRouter.js");
const setupTestEnv = require("./testUtils.js");

app.use(express.json());
app.use("/orders", ordersRouter);
app.use("/bots", botsRouter);

describe("API routes", () => {
  setupTestEnv();

  test("POST /orders should create a new normal order", async () => {
    const res = await request(app).post("/orders").send({ type: "Normal" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("PENDING");
  });

  test("GET /orders works", async () => {
    await request(app).post("/orders").send({ type: "Normal" });
    await request(app).post("/orders").send({ type: "VIP" });
    const res = await request(app).get("/orders");
    expect(res.body).toHaveProperty("pending");
    expect(res.body.pending).toHaveLength(2);
  });

  test("POST /bots should add a new bot", async () => {
    const res = await request(app).post("/bots");
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("totalBots");
    expect(res.body.totalBots).toBe(1);
  });

  test("DELETE /bots works", async () => {
    await request(app).post("/bots");
    const res = await request(app).delete("/bots");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totalBots");
    expect(res.body.totalBots).toBe(0);
  });
});
