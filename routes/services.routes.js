const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { auth } = require('../middleware/auth.middleware');
const adminAuth = require('../middleware/admin.middleware');
const { uploadImage } = require('../utils/fileUpload');


router.use(auth);


router.post('/create', adminAuth, uploadImage, servicesController.createService);
router.put('/update/:id', adminAuth, uploadImage, servicesController.updateService);router.delete('/delete/:id', adminAuth, servicesController.deleteService);

router.get('/all', servicesController.getAllServices);

module.exports = router;