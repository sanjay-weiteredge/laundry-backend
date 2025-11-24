const { Store } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const storeController = {
  createStore: async (req, res) => {
    try {
      const { name, email, phone, address, password, latitude, longitude, isActive = true } = req.body;

      const existingStore = await Store.findOne({ where: { email } });
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: 'Store with this email already exists'
        });
      }

      const normalizedIsActive =
        typeof isActive === 'string' ? isActive === 'true' : Boolean(isActive);

      const store = await Store.create({
        admin_id: req.user.id,
        name,
        email,
        phone,
        address,
        latitude,
        longitude,
        password_hash: password,
        is_active: normalizedIsActive
      });

      const storeData = store.get({ plain: true });
      delete storeData.password_hash;

      res.status(201).json({
        success: true,
        data: storeData
      });
    } catch (error) {
      console.error('Error creating store:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating store',
        error: error.message
      });
    }
  },

  getStores: async (req, res) => {
    try {
      const stores = await Store.findAll({
        where: { admin_id: req.user.id },
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: stores
      });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stores',
        error: error.message
      });
    }
  },

  storeLogin: async (req, res) => {
    try {
      const { email, password } = req.body;

      const store = await Store.findOne({ where: { email } });
      if (!store) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!store.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Store account is deactivated'
        });
      }

      const isMatch = await store.validatePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const payload = {
        store: {
          id: store.id,
          email: store.email,
          type: 'store'
        }
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      const storeData = store.get({ plain: true });
      delete storeData.password_hash;

      res.json({
        success: true,
        token,
        data: storeData
      });
    } catch (error) {
      console.error('Store login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  getStoreProfile: async (req, res) => {
    try {
      const store = await Store.findByPk(req.store.id, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      res.json({
        success: true,
        data: store
      });
    } catch (error) {
      console.error('Get store profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  updateStore: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        phone,
        address,
        latitude,
        longitude,
        isActive
      } = req.body;

      const store = await Store.findOne({
        where: {
          id,
          admin_id: req.user.id
        }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found or you do not have permission to update it'
        });
      }

      if (email && email !== store.email) {
        const existingStore = await Store.findOne({
          where: { email }
        });

        if (existingStore) {
          return res.status(400).json({
            success: false,
            message: 'Another store already uses this email'
          });
        }
      }

      const updatedData = {};

      if (typeof name !== 'undefined') updatedData.name = name;
      if (typeof email !== 'undefined') updatedData.email = email;
      if (typeof phone !== 'undefined') updatedData.phone = phone;
      if (typeof address !== 'undefined') updatedData.address = address;

      if (typeof latitude !== 'undefined') updatedData.latitude = latitude;
      if (typeof longitude !== 'undefined') updatedData.longitude = longitude;

      if (typeof isActive !== 'undefined') {
        updatedData.is_active =
          typeof isActive === 'string' ? isActive === 'true' : Boolean(isActive);
      }

      await store.update(updatedData);

      const storeData = store.get({ plain: true });
      delete storeData.password_hash;

      res.json({
        success: true,
        message: 'Store updated successfully',
        data: storeData
      });
    } catch (error) {
      console.error('Update store error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  deleteStore: async (req, res) => {
    try {
      const store = await Store.findOne({
        where: {
          id: req.params.id,
          admin_id: req.user.id
        }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found or you do not have permission to delete it'
        });
      }

      await store.destroy();

      res.json({
        success: true,
        message: 'Store deleted successfully'
      });
    } catch (error) {
      console.error('Delete store error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
};

module.exports = storeController;
