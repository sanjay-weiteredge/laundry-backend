const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuth = require('../middleware/admin.middleware');


router.post('/signup', adminController.signup);
router.post('/login', adminController.login);


router.get('/profile', adminAuth, adminController.getProfile);

module.exports = router;