const express = require('express');
const AddressController = require('../controllers/AddressController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, AddressController.getAddresses);
router.post('/', protect, AddressController.addAddress);
router.put('/:addressId', protect, AddressController.updateAddress);
router.delete('/:addressId', protect, AddressController.deleteAddress);

module.exports = router;
