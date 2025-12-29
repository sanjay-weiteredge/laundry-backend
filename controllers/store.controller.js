const db = require('../models');
const { QueryTypes } = require('sequelize');
const { Store, Order, OrderItem, Service, User, Address } = db;
const { sequelize } = db;
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');
const { createNotification } = require('../utils/notificationHelper');

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

      const storeIds = stores.map((store) => store.id);
      let revenueByStore = {};

      if (storeIds.length > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const last90DaysStart = new Date(now);
        last90DaysStart.setDate(last90DaysStart.getDate() - 90);
        const lastYearStart = new Date(now);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);

        const revenueRows = await sequelize.query(
          `
            SELECT 
              o.store_id AS "storeId",
              SUM(CASE WHEN o.created_at >= :startOfMonth THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "currentMonthRevenue",
              SUM(CASE WHEN o.created_at >= :last90DaysStart THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "last90DaysRevenue",
              SUM(CASE WHEN o.created_at >= :lastYearStart THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "lastYearRevenue"
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.store_id IN (:storeIds)
              AND o.order_status = 'delivered'
            GROUP BY o.store_id
          `,
          {
            replacements: {
              startOfMonth,
              last90DaysStart,
              lastYearStart,
              storeIds
            },
            type: QueryTypes.SELECT
          }
        );

        revenueByStore = revenueRows.reduce((acc, row) => {
          acc[row.storeId] = {
            currentMonth: Number(row.currentMonthRevenue || 0),
            last90Days: Number(row.last90DaysRevenue || 0),
            lastYear: Number(row.lastYearRevenue || 0)
          };
          return acc;
        }, {});
      }

      const storesWithRevenue = stores.map((store) => {
        const storeData = store.get({ plain: true });
        storeData.revenue = revenueByStore[store.id] || {
          currentMonth: 0,
          last90Days: 0,
          lastYear: 0
        };
        return storeData;
      });

      res.json({
        success: true,
        data: storesWithRevenue
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
  
  setRevenuePassword: async (req, res) => {
    try {
      const { newPassword, currentPassword } = req.body;

      // Validate input
      if (!newPassword || !currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both current password and new password are required'
        });
      }

      // Find the store
      const store = await Store.findByPk(req.store.id);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, store.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash the new revenue password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update the revenue password
      await store.update({ revenue_password_hash: hashedPassword });

      return res.json({
        success: true,
        message: 'Revenue password set successfully'
      });

    } catch (error) {
      console.error('Set revenue password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set revenue password',
        error: error.message
      });
    }
  },

  verifyRevenuePassword: async (req, res) => {
  try {
    const { revenuePassword } = req.body;

    if (!revenuePassword) {
      return res.status(400).json({
        success: false,
        message: 'Revenue password required'
      });
    }

    const store = await Store.findByPk(req.store.id);

    if (!store || !store.revenue_password_hash) {
      return res.status(403).json({
        success: false,
        message: 'Revenue password not set'
      });
    }

    const isValid = await bcrypt.compare(
      revenuePassword,
      store.revenue_password_hash
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid revenue password'
      });
    }

    return res.json({
      success: true,
      message: 'Revenue access granted'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
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

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const last90DaysStart = new Date(now);
      last90DaysStart.setDate(last90DaysStart.getDate() - 90);
      const lastYearStart = new Date(now);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);

      const [revenueRow] = await sequelize.query(
        `
          SELECT 
            SUM(CASE WHEN o.created_at >= :startOfMonth THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "currentMonthRevenue",
            SUM(CASE WHEN o.created_at >= :last90DaysStart THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "last90DaysRevenue",
            SUM(CASE WHEN o.created_at >= :lastYearStart THEN COALESCE(oi.total_amount, 0) ELSE 0 END) AS "lastYearRevenue"
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          WHERE o.store_id = :storeId
            AND o.order_status = 'delivered'
        `,
        {
          replacements: {
            startOfMonth,
            last90DaysStart,
            lastYearStart,
            storeId: store.id
          },
          type: QueryTypes.SELECT
        }
      );

      const revenue = {
        currentMonth: Number(revenueRow?.currentMonthRevenue || 0),
        last90Days: Number(revenueRow?.last90DaysRevenue || 0),
        lastYear: Number(revenueRow?.lastYearRevenue || 0)
      };

      res.json({
        success: true,
        data: {
          ...store.get({ plain: true }),
          revenue
        }
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
          'is_express',
          'is_walk_in',
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
          'service_id',
          'order_status',
          'pickup_scheduled_at',
          'pickup_slot_end',
          'picked_up_at',
          'delivered_at',
          'payment_mode',
          'notes',
          'is_express',
          'is_walk_in',
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

      // Create notification for user when order items are updated
      if (updatedOrder && updatedOrder.user) {
        try {
          await createNotification({
            userId: updatedOrder.user.id,
            storeId: req.store.id,
            title: 'Order Items Updated',
            message: `The vendor has updated the items in your order #${orderId}. Please check the updated order details.`,
            type: 'order_status_updated'
          });
        } catch (notifError) {
          console.error('Error creating order items update notification:', notifError);
          // Don't fail the update if notification fails
        }
      }

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
  },

  getTransactionHistory: async (req, res) => {
    try {
      const { period = '30' } = req.query; 
      
      
      const validPeriods = ['30', '90', '365'];
      if (!validPeriods.includes(period.toString())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period. Allowed values: 30, 90, or 365 days'
        });
      }

      const days = parseInt(period, 10);
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      
      
      const transactions = await sequelize.query(
        `
          SELECT 
            o.id AS "orderId",
            o.delivered_at AS "deliveredDate",
            u.name AS "userName",
            COALESCE(SUM(oi.total_amount), 0) AS "totalAmount"
          FROM orders o
          INNER JOIN users u ON u.id = o.user_id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.store_id = :storeId
            AND o.order_status = 'delivered'
            AND o.delivered_at IS NOT NULL
            AND o.delivered_at >= :startDate
            AND o.delivered_at <= :endDate
          GROUP BY o.id, o.delivered_at, u.name
          ORDER BY o.delivered_at DESC
        `,
        {
          replacements: {
            storeId: req.store.id,
            startDate: startDate,
            endDate: now
          },
          type: QueryTypes.SELECT
        }
      );

      
      const totalRevenue = transactions.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.totalAmount || 0);
      }, 0);

      const totalTransactions = transactions.length;

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          summary: {
            totalTransactions,
            totalRevenue: parseFloat(totalRevenue.toFixed(2))
          },
          transactions: transactions.map(transaction => ({
            orderId: transaction.orderId,
            deliveredDate: transaction.deliveredDate,
            userName: transaction.userName,
            totalAmount: parseFloat(transaction.totalAmount || 0)
          }))
        }
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction history',
        error: error.message
      });
    }
  },

  createOrder: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const {
        // Customer details
        customerName,
        customerPhone,
        customerEmail,
        // Address details (optional for walk-in, can use store address)
        addressLine,
        house,
        street,
        city,
        state,
        pincode,
        landmark,
        fullName,
        phone,
        altPhone,
        latitude,
        longitude,
        deliveryType = 'pickup', // 'pickup' or 'delivery'
        // Order details
        services,
        notes,
        isExpress,
        paymentMode = 'cash'
      } = req.body;

      const storeId = req.store.id;

      // Validate required fields
      if (!customerPhone || !customerName) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Customer name and phone number are required'
        });
      }

      if (!services || !Array.isArray(services) || services.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one service is required'
        });
      }

      // Find or create user
      let user = await User.findOne({
        where: { phone_number: customerPhone },
        transaction
      });

      if (!user) {
        user = await User.create({
          phone_number: customerPhone,
          name: customerName,
          email: customerEmail || null,
          created_at: new Date(),
          updated_at: new Date()
        }, { transaction });
      } else {
        // Update user details if provided
        const updateData = {};
        if (customerName && customerName !== user.name) {
          updateData.name = customerName;
        }
        if (customerEmail && customerEmail !== user.email) {
          updateData.email = customerEmail;
        }
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date();
          await user.update(updateData, { transaction });
        }
      }

      // Get store details for address
      const store = await Store.findByPk(storeId, { transaction });
      if (!store) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }
      
      let address;
      
      // If delivery, require address. If pickup, use store address as fallback
      if (deliveryType === 'delivery') {
        if (!addressLine || !city || !state || !pincode || !house || !street) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Delivery address is required for delivery orders'
          });
        }
        
        address = await Address.create({
          user_id: user.id,
          full_name: fullName || customerName,
          phone: phone || customerPhone,
          alt_phone: altPhone || null,
          label: 'Delivery',
          address_line: addressLine,
          house: house,
          street: street,
          city: city,
          state: state,
          pincode: pincode,
          landmark: landmark || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_default: false,
          created_at: new Date()
        }, { transaction });
      } else {
        // For pickup, create a minimal address using store address
        address = await Address.create({
          user_id: user.id,
          full_name: customerName,
          phone: customerPhone,
          alt_phone: null,
          label: 'Store Pickup',
          address_line: store.address,
          house: 'Store',
          street: store.address,
          city: 'Store Location',
          state: 'Store Location',
          pincode: '000000',
          landmark: store.name,
          latitude: store.latitude,
          longitude: store.longitude,
          is_default: false,
          created_at: new Date()
        }, { transaction });
      }

      // Normalize and validate services
      const normalizedServices = services.map((service) => {
        const serviceId = Number(service.serviceId || service.id);
        const quantity = Number(service.quantity || 1);
        return { serviceId, quantity: quantity > 0 ? quantity : 1 };
      });

      // Validate services exist
      for (const { serviceId } of normalizedServices) {
        const serviceExists = await Service.findByPk(serviceId, { transaction });
        if (!serviceExists) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Service with id ${serviceId} not found`
          });
        }
      }

      // For walk-in customers: pickup is immediate
      const now = new Date();
      
      const order = await Order.create({
        user_id: user.id,
        store_id: storeId,
        address_id: address.id,
        service_id: normalizedServices[0]?.serviceId || null, // For backward compatibility
        pickup_scheduled_at: now, // Already at store
        pickup_slot_end: now, // Already at store
        picked_up_at: now, // Already dropped off
        order_status: 'picked_up', // Start as picked_up since they're at store
        payment_mode: paymentMode,
        notes: notes || null,
        is_express: isExpress === true || isExpress === 'true' || isExpress === 1,
        is_walk_in: true // Mark as walk-in order
      }, { transaction });

      // Create order items
      for (const { serviceId, quantity } of normalizedServices) {
        await OrderItem.create({
          order_id: order.id,
          service_id: serviceId,
          quantity
        }, { transaction });
      }

      await transaction.commit();

      // Fetch the created order with all relationships
      const createdOrder = await Order.findByPk(order.id, {
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

      // Create notification for user
      try {
        await createNotification({
          userId: user.id,
          storeId: storeId,
          title: 'Order Created',
          message: `Order #${order.id} has been created at the store.`,
          type: 'order_created'
        });
      } catch (notifError) {
        console.error('Error creating order notification:', notifError);
        // Don't fail the order creation if notification fails
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: createdOrder
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message
      });
    }
  },
  getTransactionHistoryByDateRange: async (req, res) => {
    try {
      const { period, startDate: startDateParam, endDate: endDateParam } = req.query;
      
      let startDate, endDate = new Date();
      
      // If both startDate and endDate are provided, use them
      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Please use ISO 8601 format (e.g., 2023-01-01)'
          });
        }
        
        if (startDate > endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date cannot be after end date'
          });
        }
      } 
      // Otherwise, use the period parameter
      else if (period) {
        const validPeriods = ['30', '90', '365'];
        if (!validPeriods.includes(period.toString())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid period. Allowed values: 30, 90, or 365 days'
          });
        }
        const days = parseInt(period, 10);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      } 
      
      // If no parameters are provided, default to last 30 days
      else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Format dates for query
      const formatDate = (date) => date.toISOString().split('T')[0] + ' 00:00:00';
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

     const transactions = await sequelize.query(
    `
      SELECT 
        o.id AS "orderId",
        o.delivered_at AS "deliveredDate",
        u.name AS "userName",
        COALESCE(SUM(oi.total_amount), 0) AS "totalAmount",
        o.payment_mode AS "paymentMethod"
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.store_id = :storeId
        AND o.order_status = 'delivered'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at >= :startDate
        AND o.delivered_at <= :endDate
      GROUP BY o.id, o.delivered_at, u.name, o.payment_mode
      ORDER BY o.delivered_at DESC
    `,
    {
      replacements: {
        storeId: req.store.id,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
      type: QueryTypes.SELECT
    }
  );

      // Calculate summary statistics
      const totalRevenue = transactions.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.totalAmount || 0);
      }, 0);

      const totalTransactions = transactions.length;

      // Group by payment method
      const paymentMethods = transactions.reduce((acc, transaction) => {
        const method = transaction.paymentMethod || 'unknown';
        if (!acc[method]) {
          acc[method] = {
            count: 0,
            amount: 0
          };
        }
        acc[method].count += 1;
        acc[method].amount += parseFloat(transaction.totalAmount || 0);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalTransactions,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            averageOrderValue: totalTransactions > 0 
              ? parseFloat((totalRevenue / totalTransactions).toFixed(2))
              : 0
          },
          paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
            method,
            count: data.count,
            amount: parseFloat(data.amount.toFixed(2)),
            percentage: totalRevenue > 0 
              ? parseFloat(((data.amount / totalRevenue) * 100).toFixed(2))
              : 0
          })),
          transactions: transactions.map(transaction => ({
            orderId: transaction.orderId,
            deliveredDate: transaction.deliveredDate,
            userName: transaction.userName,
            totalAmount: parseFloat(transaction.totalAmount || 0),
            paymentMethod: transaction.paymentMethod,
            paymentStatus: transaction.paymentStatus
          }))
        }
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction history',
        error: error.message
      });
    }
  }
};

module.exports = storeController;
