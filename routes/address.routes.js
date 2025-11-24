const express = require('express');
const router = express.Router();
const { skipAuth } = require('../middleware/auth.middleware');
const {
  getCurrentLocation,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/address.controller');


router.get('/location', getCurrentLocation);


router.use(skipAuth);
router.post('/add-address', addAddress);
router.get('/addresses', getAddresses);
router.put('/update-address/:id', updateAddress);
router.delete('/delete-address/:id', deleteAddress);
router.patch('/set-default-address/:id', setDefaultAddress);

module.exports = router;
