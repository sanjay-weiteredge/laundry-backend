const express = require('express');
const router = express.Router();
const { skipAuth } = require('../middleware/auth.middleware');
const servicePricingController = require('../controllers/servicePricing.controller');


router.get('/:serviceType', servicePricingController.getServicePricing);
router.get('/all/grouped', servicePricingController.getAllServiceTypesWithItems);


router.use(skipAuth);

router.get('/', servicePricingController.getAllServicePricings);

router.post('/', servicePricingController.createOrUpdateServicePricing);

module.exports = router;
