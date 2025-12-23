const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuth = require('../middleware/admin.middleware');
const posterController = require('../controllers/poster.controller');
const { uploadPoster } = require('../utils/fileUpload');


router.post('/signup', adminController.signup);
router.post('/login', adminController.login);

router.post('/posters', adminAuth, uploadPoster, posterController.createPoster);

router.get('/profile', adminAuth, adminController.getProfile);

module.exports = router;