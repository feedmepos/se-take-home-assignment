const express = require("express");
const {
  addBotHandler,
  removeBotHandler,
} = require("../controllers/botController.js");

const router = express.Router();

router.post("/", addBotHandler); // POST /bots
router.delete("/", removeBotHandler); // DELETE /bots

module.exports = router;
