const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuth = require('../middleware/admin.middleware');

// Public routes (no auth required)
router.post('/signup', adminController.signup);
router.post('/login', adminController.login);

// Protected routes (auth required)
router.get('/profile', adminAuth, adminController.getProfile);

module.exports = router;