const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/constants');

/**
 * Register a new tenant with admin user
 */
const register = async (req, res) => {
  try {
    const { email, password, name, shopifyDomain, storeName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if tenant (store) already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Shopify store already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: storeName,
          shopifyDomain
        }
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN',
          tenantId: tenant.id
        }
      });

      return { tenant, user };
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user.id, tenantId: result.tenant.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          shopifyDomain: result.tenant.shopifyDomain
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with tenant
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          shopifyDomain: user.tenant.shopifyDomain,
          isConnected: !!user.tenant.shopifyAccessToken
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        },
        tenant: {
          id: req.user.tenant.id,
          name: req.user.tenant.name,
          shopifyDomain: req.user.tenant.shopifyDomain,
          isConnected: !!req.user.tenant.shopifyAccessToken
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updateData = {};

    if (name) {
      updateData.name = name;
    }

    if (newPassword) {
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
