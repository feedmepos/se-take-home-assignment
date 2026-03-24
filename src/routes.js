const express = require('express');
const { handleCreateOrder, handleGetOrders } = require('./controllers/orderController');
const { handleAddBot, handleRemoveBot } = require('./controllers/botController');

const router = express.Router();

router.post('/orders', handleCreateOrder);
router.get('/orders', handleGetOrders);
router.post('/bots', handleAddBot);
router.delete('/bots', handleRemoveBot);

module.exports = router;
