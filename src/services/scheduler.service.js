const cron = require('node-cron');
const prisma = require('../config/database');
const { fullSync } = require('./shopify.service');
const config = require('../config/constants');

/**
 * Schedule automated sync jobs for all active tenants
 */
function scheduleSyncJobs() {
  console.log('📅 Setting up scheduled sync jobs...');

  // Run every 6 hours by default
  cron.schedule(config.sync.cronSchedule, async () => {
    console.log('🔄 Starting scheduled sync for all tenants...');
    
    try {
      // Get all active tenants with Shopify connected
      const tenants = await prisma.tenant.findMany({
        where: {
          isActive: true,
          shopifyAccessToken: { not: null }
        }
      });

      console.log(`Found ${tenants.length} tenants to sync`);

      for (const tenant of tenants) {
        try {
          console.log(`Syncing tenant: ${tenant.name} (${tenant.shopifyDomain})`);
          await fullSync(tenant.id);
          console.log(`✅ Sync completed for: ${tenant.name}`);
        } catch (error) {
          console.error(`❌ Sync failed for ${tenant.name}:`, error.message);
        }
      }

      console.log('🔄 Scheduled sync completed for all tenants');
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  });

  console.log(`✅ Sync jobs scheduled (${config.sync.cronSchedule})`);
}

/**
 * Manual sync trigger for a specific tenant
 */
async function triggerSync(tenantId, syncType = 'FULL') {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (!tenant.shopifyAccessToken) {
    throw new Error('Shopify not connected for this tenant');
  }

  return await fullSync(tenantId);
}

/**
 * Get sync history for a tenant
 */
async function getSyncHistory(tenantId, limit = 10) {
  return await prisma.syncLog.findMany({
    where: { tenantId },
    orderBy: { startedAt: 'desc' },
    take: limit
  });
}

module.exports = {
  scheduleSyncJobs,
  triggerSync,
  getSyncHistory
};
