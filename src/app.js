const express = require("express");
const ordersRouter = require("./routes/ordersRouter.js");
const botsRouter = require("./routes/botsRouter.js");

const app = express();
const PORT = 3000;

app.use(express.json());

// Routes
app.use("/orders", ordersRouter);
app.use("/bots", botsRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "An error occurred",
  });
});

app.listen(PORT);
