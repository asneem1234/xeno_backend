const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// Get tenant details
router.get('/current', authenticate, async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        name: true,
        shopifyDomain: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            customers: true,
            orders: true,
            products: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant details'
    });
  }
});

// Update tenant
router.put('/current', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { name }
    });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        id: tenant.id,
        name: tenant.name,
        shopifyDomain: tenant.shopifyDomain
      }
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant'
    });
  }
});

// Get tenant users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

module.exports = router;
