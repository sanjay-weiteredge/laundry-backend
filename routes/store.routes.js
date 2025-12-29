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
router.patch('/stores/status', storeAuth, storeController.updateStoreStatus);
router.get('/stores/orders', storeAuth, storeController.getStoreOrders);
router.post('/stores/orders', storeAuth, storeController.createOrder);
router.put('/stores/orders/:orderId/items', storeAuth, storeController.updateOrderItems);


router.post('/stores/revenue/set-password', storeAuth, storeController.setRevenuePassword);
router.post('/stores/revenue/verify', storeAuth, storeController.verifyRevenuePassword);
router.get('/stores/transactions', storeAuth, storeController.getTransactionHistory);

module.exports = router;
