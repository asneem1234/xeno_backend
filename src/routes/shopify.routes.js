const express = require('express');
const router = express.Router();
const shopifyController = require('../controllers/shopify.controller');
const { authenticate, requireAdmin, tenantScope } = require('../middleware/auth.middleware');
const { shopifyConnectValidation } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);
router.use(tenantScope);

// Connection management
router.post('/connect', requireAdmin, shopifyConnectValidation, shopifyController.connectShopify);
router.post('/disconnect', requireAdmin, shopifyController.disconnectShopify);
router.get('/status', shopifyController.getConnectionStatus);

// Sync operations
router.post('/sync', requireAdmin, shopifyController.syncData);
router.get('/sync-logs', shopifyController.getSyncLogs);

module.exports = router;
