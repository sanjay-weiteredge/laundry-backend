const db = require('../models');
const { Store, Order, OrderItem, Service, User, Address } = db;
const { sequelize } = db;
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');

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
        is_active: normalizedIsActive,
        is_admin_locked: false
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
        id: store.id,
        type: 'store',
        store: {
          id: store.id,
          email: store.email
        }
      };

      const token = generateToken(payload);

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

  getStoreOrders: async (req, res) => {
    try {
      const { status } = req.query;

      const whereClause = {
        store_id: req.store.id
      };

      if (status && status !== 'all') {
        whereClause.order_status = status;
      }

      const orders = await Order.findAll({
        where: whereClause,
        order: [['pickup_scheduled_at', 'ASC']],
        attributes: [
          'id',
          'service_id',
          'order_status',
          'pickup_scheduled_at',
          'pickup_slot_end',
          'picked_up_at',
          'delivered_at',
          'payment_mode',
          'notes',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'phone_number', 'email']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: [
              'id',
              'label',
              'full_name',
              'phone',
              'address_line',
              'house',
              'street',
              'city',
              'state',
              'pincode',
              'landmark'
            ]
          },
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'name', 'description', 'price']
          },
          {
            model: OrderItem,
            as: 'items',
            attributes: ['id', 'quantity', 'total_amount'],
            include: [
              {
                model: Service,
                as: 'service',
                attributes: ['id', 'name', 'description', 'price']
              }
            ]
          }
        ]
      });

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Get store orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load store orders',
        error: error.message
      });
    }
  },

  updateOrderItems: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required'
        });
      }

      const normalizedItems = items.map((item) => ({
        serviceId: Number(item.service_id ?? item.serviceId ?? item.id),
        quantity: Number(item.quantity ?? item.count ?? 0),
        totalAmount: item.total_amount !== undefined ? Number(item.total_amount ?? item.totalAmount) : null
      }));
      
      console.log('Received items to update:', normalizedItems); 

      for (const item of normalizedItems) {
        if (!item.serviceId || Number.isNaN(item.serviceId)) {
          return res.status(400).json({
            success: false,
            message: 'Each item must include a valid serviceId'
          });
        }

        if (Number.isNaN(item.quantity) || item.quantity < 0) {
          return res.status(400).json({
            success: false,
            message: 'Item quantity must be zero or a positive number'
          });
        }
      }

      const order = await Order.findOne({
        where: {
          id: orderId,
          store_id: req.store.id
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found for this store'
        });
      }

      await sequelize.transaction(async (transaction) => {
        for (const item of normalizedItems) {
          if (item.quantity === 0) {
            await OrderItem.destroy({
              where: {
                order_id: orderId,
                service_id: item.serviceId
              },
              transaction
            });
            continue;
          }

          const service = await Service.findByPk(item.serviceId, { transaction });
          const servicePrice = service ? Number(service.price || 0) : 0;
          
          const totalAmount = item.totalAmount !== null && item.totalAmount !== undefined
            ? Number(item.totalAmount)
            : item.quantity * servicePrice;

          console.log(`Updating order item - serviceId: ${item.serviceId}, quantity: ${item.quantity}, totalAmount: ${totalAmount}`); // Debug log

          const [orderItem, created] = await OrderItem.findOrCreate({
            where: {
              order_id: orderId,
              service_id: item.serviceId
            },
            defaults: {
              quantity: item.quantity,
              total_amount: totalAmount
            },
            transaction
          });

          if (!created) {
            await orderItem.update({
              quantity: item.quantity,
              total_amount: totalAmount
            }, { transaction });
            
            await orderItem.reload({ transaction });
            console.log(`Saved order item - id: ${orderItem.id}, quantity: ${orderItem.quantity}, total_amount: ${orderItem.total_amount}`); // Debug log
          } else {
            if (!orderItem.total_amount && totalAmount) {
              await orderItem.update({
                total_amount: totalAmount
              }, { transaction });
            }
            await orderItem.reload({ transaction });
            console.log(`Created order item - id: ${orderItem.id}, quantity: ${orderItem.quantity}, total_amount: ${orderItem.total_amount}`); // Debug log
          }
        }
      });

      const updatedOrder = await Order.findOne({
        where: {
          id: orderId,
          store_id: req.store.id
        },
        attributes: [
          'id',
          'order_status',
          'pickup_scheduled_at',
          'pickup_slot_end',
          'picked_up_at',
          'delivered_at',
          'payment_mode',
          'notes',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'phone_number', 'email']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: [
              'id',
              'label',
              'full_name',
              'phone',
              'address_line',
              'house',
              'street',
              'city',
              'state',
              'pincode',
              'landmark'
            ]
          },
          {
            model: OrderItem,
            as: 'items',
            attributes: ['id', 'quantity', 'total_amount'],
            include: [
              {
                model: Service,
                as: 'service',
                attributes: ['id', 'name', 'description', 'price']
              }
            ]
          }
        ]
      });

      const verifyItems = await OrderItem.findAll({
        where: { order_id: orderId },
        attributes: ['id', 'service_id', 'quantity', 'total_amount'],
        raw: true
      });
      console.log('Verification - Order items in DB:', verifyItems); // Debug log
      
      console.log('Response order items:', updatedOrder.items?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        total_amount: item.total_amount,
        service_id: item.service?.id
      }))); 

      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      console.error('Update order items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order items',
        error: error.message
      });
    }
  },

  updateStoreStatus: async (req, res) => {
    try {
      const { status, is_active, isActive } = req.body;

      const normalizeBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowered = value.trim().toLowerCase();
          if (['true', '1', 'active', 'enabled'].includes(lowered)) return true;
          if (['false', '0', 'inactive', 'disabled'].includes(lowered)) return false;
        }
        if (typeof value === 'number') {
          return value === 1;
        }
        return undefined;
      };

      const normalizedStatus = (() => {
        if (typeof status !== 'undefined') return normalizeBoolean(status);
        if (typeof is_active !== 'undefined') return normalizeBoolean(is_active);
        if (typeof isActive !== 'undefined') return normalizeBoolean(isActive);
        return undefined;
      })();

      if (typeof normalizedStatus === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'A valid status value is required'
        });
      }

      req.store.is_active = normalizedStatus;
      await req.store.save();

      const storeData = req.store.get({ plain: true });
      delete storeData.password_hash;

      return res.json({
        success: true,
        message: 'Store status updated successfully',
        data: storeData
      });
    } catch (error) {
      console.error('Update store status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update store status',
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
        isActive,
        isAdminLocked,
        is_admin_locked
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
        const normalizedIsActive =
          typeof isActive === 'string' ? isActive === 'true' : Boolean(isActive);
        updatedData.is_active = normalizedIsActive;
        updatedData.is_admin_locked = !normalizedIsActive;
      }

      const explicitAdminLock =
        typeof isAdminLocked !== 'undefined'
          ? isAdminLocked
          : typeof is_admin_locked !== 'undefined'
          ? is_admin_locked
          : undefined;

      if (typeof explicitAdminLock !== 'undefined') {
        updatedData.is_admin_locked =
          typeof explicitAdminLock === 'string'
            ? explicitAdminLock === 'true'
            : Boolean(explicitAdminLock);
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
