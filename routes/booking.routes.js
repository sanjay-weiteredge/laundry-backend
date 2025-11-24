const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth.middleware');


router.get('/services', bookingController.getServices);


router.get('/time-slots', bookingController.getTimeSlots);


router.post('/book', auth, bookingController.bookService);

 
router.get('/orders/:orderId', auth, bookingController.getOrderDetails);

module.exports = router;
