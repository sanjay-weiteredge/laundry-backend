const { Address, sequelize } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

const formatAddressResponse = (addressInstance) => ({
  id: addressInstance.id,
  fullName: addressInstance.full_name,
  phone: addressInstance.phone,
  altPhone: addressInstance.alt_phone || '',
  pincode: addressInstance.pincode,
  state: addressInstance.state,
  city: addressInstance.city,
  house: addressInstance.house,
  street: addressInstance.street,
  landmark: addressInstance.landmark || '',
  label: addressInstance.label,
  instructions: addressInstance.instructions || '',
  isDefault: Boolean(addressInstance.is_default),
  latitude: addressInstance.latitude,
  longitude: addressInstance.longitude
});


const getCurrentLocation = async (req, res) => {
  try {
    
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

 
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );

    const { address } = response.data;
    const locationInfo = {
      address: response.data.display_name,
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      country: address.country || '',
      postal_code: address.postcode || '',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    res.json({
      success: true,
      data: locationInfo
    });

  } catch (error) {
    console.error('Error getting location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location',
      error: error.message
    });
  }
};


const addAddress = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      altPhone = '',
      pincode,
      state,
      city,
      house,
      street,
      landmark = '',
      label = 'Home',
      instructions = '',
      latitude = null,
      longitude = null,
      country = null,
      postal_code = null,
      isDefault = false
    } = req.body;

    if (!fullName || !phone || !pincode || !state || !city || !house || !street) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, pincode, state, city, house, and street are required'
      });
    }

    const numericPhone = phone.replace(/[^0-9]/g, '');
    const numericAltPhone = altPhone ? altPhone.replace(/[^0-9]/g, '') : '';

    if (numericPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must have at least 10 digits'
      });
    }

    if (numericAltPhone && numericAltPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Alternate phone number must have at least 10 digits'
      });
    }

    const is_default = Boolean(isDefault);
    const addressLine = `${house}, ${street}`;

   
    if (is_default) {
      await Address.update(
        { is_default: false },
        { 
          where: { 
            user_id: req.user.id,
            is_default: true
          } 
        }
      );
    }

    const address = await Address.create({
      user_id: req.user.id,
      label,
      full_name: fullName.trim(),
      phone: numericPhone,
      alt_phone: numericAltPhone || null,
      address_line: addressLine,
      latitude,
      longitude,
      state,
      city,
      country,
      postal_code,
      pincode,
      house,
      street,
      landmark: landmark || null,
      instructions: instructions || null,
      is_default
    });

    await address.reload();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: formatAddressResponse(address)
    });

  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: error.message
    });
  }
};


const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: addresses.map(formatAddressResponse)
    });

  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses',
      error: error.message
    });
  }
};


const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      phone,
      altPhone,
      pincode,
      state,
      city,
      house,
      street,
      landmark,
      label,
      instructions,
      latitude,
      longitude,
      country,
      postal_code,
      isDefault
    } = req.body;

    const address = await Address.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

  
    if (isDefault) {
      await Address.update(
        { is_default: false },
        { 
          where: { 
            user_id: req.user.id,
            is_default: true,
            id: { [Op.ne]: id }
          } 
        }
      );
    }

    const updatedFields = {};
    if (fullName !== undefined) updatedFields.full_name = fullName.trim();
    if (phone !== undefined) {
      const numericPhone = phone.replace(/[^0-9]/g, '');
      if (numericPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must have at least 10 digits'
        });
      }
      updatedFields.phone = numericPhone;
    }
    if (altPhone !== undefined) {
      const numericAltPhone = altPhone.replace(/[^0-9]/g, '');
      if (numericAltPhone && numericAltPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Alternate phone number must have at least 10 digits'
        });
      }
      updatedFields.alt_phone = numericAltPhone || null;
    }
    if (pincode !== undefined) updatedFields.pincode = pincode;
    if (state !== undefined) updatedFields.state = state;
    if (city !== undefined) updatedFields.city = city;
    if (house !== undefined) updatedFields.house = house;
    if (street !== undefined) updatedFields.street = street;
    if (house !== undefined || street !== undefined) {
      const newHouse = house !== undefined ? house : address.house;
      const newStreet = street !== undefined ? street : address.street;
      updatedFields.address_line = `${newHouse}, ${newStreet}`;
    }
    if (landmark !== undefined) updatedFields.landmark = landmark || null;
    if (label !== undefined) updatedFields.label = label;
    if (latitude !== undefined) updatedFields.latitude = latitude;
    if (longitude !== undefined) updatedFields.longitude = longitude;
    if (country !== undefined) updatedFields.country = country;
    if (postal_code !== undefined) updatedFields.postal_code = postal_code;
    if (instructions !== undefined) updatedFields.instructions = instructions || null;
    if (isDefault !== undefined) updatedFields.is_default = Boolean(isDefault);

    await address.update(updatedFields);
    await address.reload();

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: formatAddressResponse(address)
    });

  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await address.destroy();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
};


const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;


    const transaction = await sequelize.transaction();

    try {

      await Address.update(
        { is_default: false },
        { 
          where: { 
            user_id: req.user.id,
            is_default: true,
            id: { [Op.ne]: id }
          },
          transaction
        }
      );

      // Set new default address
      const [updated] = await Address.update(
        { is_default: true },
        { 
          where: { 
            id,
            user_id: req.user.id
          },
          returning: true,
          transaction
        }
      );

      if (updated === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Default address updated successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
};

module.exports = {
  getCurrentLocation,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
