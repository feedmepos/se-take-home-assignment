const express = require("express");
const {
  createOrderHandler,
  getOrdersHandler,
  getSummaryHandler,
} = require("../controllers/orderController.js");

const router = express.Router();

router.post("/", createOrderHandler);
router.get("/", getOrdersHandler);
router.get("/summary", getSummaryHandler);

module.exports = router;
