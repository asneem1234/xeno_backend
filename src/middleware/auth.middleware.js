const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/constants');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Fetch user with tenant info
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { tenant: true }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive.'
        });
      }

      if (!user.tenant.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Tenant account is inactive.'
        });
      }

      // Attach user and tenant to request
      req.user = user;
      req.tenantId = user.tenantId;
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Admin role check middleware
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }
  next();
};

/**
 * Tenant isolation middleware - ensures data access is scoped to tenant
 */
const tenantScope = (req, res, next) => {
  // Add tenant filter helper to request
  req.tenantFilter = { tenantId: req.tenantId };
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  tenantScope
};
