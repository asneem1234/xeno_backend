const { body, validationResult } = require('express-validator');

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('shopifyDomain')
    .trim()
    .matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
    .withMessage('Please provide a valid Shopify domain (e.g., yourstore.myshopify.com)'),
  body('storeName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Store name must be at least 2 characters'),
  handleValidationErrors
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Shopify connection validation
 */
const shopifyConnectValidation = [
  body('accessToken')
    .notEmpty()
    .withMessage('Shopify access token is required'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  shopifyConnectValidation,
  handleValidationErrors
};
