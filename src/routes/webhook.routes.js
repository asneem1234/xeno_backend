const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Webhooks don't use authentication - they use HMAC verification
// Customer webhooks
router.post('/customers', webhookController.handleCustomerWebhook);

// Order webhooks
router.post('/orders', webhookController.handleOrderWebhook);

// Product webhooks
router.post('/products', webhookController.handleProductWebhook);

// Cart/Checkout events
router.post('/carts', webhookController.handleCartEvent);
router.post('/checkouts', webhookController.handleCartEvent);

module.exports = router;
