const { addBot, removeNewestBot } = require('../services/botService');

function handleAddBot(req, res) {
  const bot = addBot();
  res.status(201).json(bot);
}

function handleRemoveBot(req, res) {
  const bot = removeNewestBot();
  if (!bot) return res.status(404).json({ error: 'No bots to remove' });
  res.json(bot);
}

module.exports = { handleAddBot, handleRemoveBot };
