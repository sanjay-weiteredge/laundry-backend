const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const adminAuth = require('../middleware/admin.middleware');
const { storeAuth } = require('../middleware/auth.middleware');


router.post('/admin/stores', adminAuth, storeController.createStore);
router.put('/admin/stores/:id', adminAuth, storeController.updateStore);
router.delete('/admin/stores/:id', adminAuth, storeController.deleteStore);
router.get('/admin/stores', adminAuth, storeController.getStores);

router.post('/stores/login', storeController.storeLogin);
router.get('/stores/profile', storeAuth, storeController.getStoreProfile);

module.exports = router;
