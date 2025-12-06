const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, tenantScope } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);
router.use(tenantScope);

// Dashboard stats
router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/growth', analyticsController.getGrowthMetrics);

// Charts and trends
router.get('/orders-by-date', analyticsController.getOrdersByDate);
router.get('/revenue-trends', analyticsController.getRevenueTrends);
router.get('/top-customers', analyticsController.getTopCustomers);
router.get('/top-products', analyticsController.getTopProducts);
router.get('/order-status', analyticsController.getOrderStatusDistribution);

// Data lists
router.get('/customers', analyticsController.getCustomers);
router.get('/orders', analyticsController.getOrders);
router.get('/products', analyticsController.getProducts);

module.exports = router;
