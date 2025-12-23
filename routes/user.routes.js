const express = require('express');
const router = express.Router();
const { 
  sendOTP, 
  verifyOTP, 
  getUserProfile, 
  updateProfile,
  listUsers,
  deleteUser,
  reportUser
} = require('../controllers/user.controller');
const { getActivePosters } = require('../controllers/poster.controller');
const { skipAuth } = require('../middleware/auth.middleware');
const adminAuth = require('../middleware/admin.middleware');
const { uploadImage } = require('../utils/fileUpload');


router.get('/', adminAuth, listUsers);
router.delete('/:id', adminAuth, deleteUser);
router.post('/:id/report', adminAuth, reportUser);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);


router.use(skipAuth);
router.get('/posters', getActivePosters);
router.get('/profile', getUserProfile);
router.put('/update-profile', uploadImage, updateProfile);

module.exports = router;
