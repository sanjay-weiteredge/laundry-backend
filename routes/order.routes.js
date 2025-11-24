const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { auth, adminAuth } = require('../middleware/auth.middleware');

router.get('/', auth, orderController.getUserOrders);
router.get('/all', orderController.getAllOrders);

router.post('/:orderId/cancel', auth, orderController.cancelOrder);

router.put('/:orderId/reschedule', auth, orderController.rescheduleOrder);


router.put('/:orderId/status', auth, orderController.updateOrderStatus);

module.exports = router;