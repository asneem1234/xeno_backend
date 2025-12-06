const prisma = require('../config/database');
const { ShopifyService, fullSync } = require('../services/shopify.service');
const { triggerSync, getSyncHistory } = require('../services/scheduler.service');

/**
 * Connect Shopify store with access token
 */
const connectShopify = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const tenantId = req.tenantId;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Verify the access token by making a test request
    const shopifyService = new ShopifyService(tenant.shopifyDomain, accessToken);
    
    try {
      await shopifyService.fetchShopInfo();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Shopify access token'
      });
    }

    // Save access token
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { shopifyAccessToken: accessToken }
    });

    res.json({
      success: true,
      message: 'Shopify connected successfully'
    });
  } catch (error) {
    console.error('Connect Shopify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Shopify'
    });
  }
};

/**
 * Disconnect Shopify store
 */
const disconnectShopify = async (req, res) => {
  try {
    await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { shopifyAccessToken: null }
    });

    res.json({
      success: true,
      message: 'Shopify disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect Shopify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Shopify'
    });
  }
};

/**
 * Trigger manual sync
 */
const syncData = async (req, res) => {
  try {
    const result = await triggerSync(req.tenantId);
    
    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Sync failed'
    });
  }
};

/**
 * Get sync history
 */
const getSyncLogs = async (req, res) => {
  try {
    const logs = await getSyncHistory(req.tenantId);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync logs'
    });
  }
};

/**
 * Get connection status
 */
const getConnectionStatus = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId }
    });

    const isConnected = !!tenant?.shopifyAccessToken;
    let shopInfo = null;

    if (isConnected) {
      try {
        const shopifyService = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
        shopInfo = await shopifyService.fetchShopInfo();
      } catch (error) {
        // Token might be invalid
        console.error('Error fetching shop info:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        isConnected,
        shopifyDomain: tenant?.shopifyDomain,
        shopInfo
      }
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status'
    });
  }
};

module.exports = {
  connectShopify,
  disconnectShopify,
  syncData,
  getSyncLogs,
  getConnectionStatus
};
