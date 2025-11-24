const express = require('express');
const router = express.Router();
const { 
  sendOTP, 
  verifyOTP, 
  getUserProfile, 
  updateProfile,
  listUsers
} = require('../controllers/user.controller');
const { skipAuth } = require('../middleware/auth.middleware');
const adminAuth = require('../middleware/admin.middleware');
const uploadImage = require('../utils/fileUpload');

router.get('/', adminAuth, listUsers);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);


router.use(skipAuth);
router.get('/profile', getUserProfile);
router.put('/update-profile', uploadImage, updateProfile);

module.exports = router;
