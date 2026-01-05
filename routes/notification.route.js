const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

router.post('/send-notification', auth, notificationController.sendNotification);

module.exports = router;