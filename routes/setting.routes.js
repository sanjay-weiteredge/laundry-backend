'use strict';
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const adminAuth = require('../middleware/admin.middleware');
const { skipAuth } = require('../middleware/auth.middleware');


router.use(skipAuth, adminAuth);


router.get('/:key', settingController.getSetting);

router.put('/:key', settingController.updateSetting);


router.get('/nearby/radius', settingController.getNearbyRadius);
router.put('/nearby/radius', settingController.updateNearbyRadius);

module.exports = router;
