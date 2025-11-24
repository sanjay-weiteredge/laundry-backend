const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../models');
const { Order, Service, Store, User, Address, ServicePricing } = require('../models');
const { getDistance } = require('geolib');

const bookingController = {
 
  getServices: async (req, res) => {
    try {
      const services = await Service.findAll({
        attributes: ['id', 'name', 'description'],
        where: { is_active: true },
        include: [
          {
            model: ServicePricing,
            as: 'pricings',
            attributes: ['id', 'service_type', 'item_name', 'price', 'unit', 'description'],
            where: { is_active: true },
            required: false
          }
        ]
      });
      
      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching services',
        error: error.message
      });
    }
  },


  getTimeSlots: async (req, res) => {
    try {
      const { date, serviceId } = req.query;
      
      if (!date || !serviceId) {
        return res.status(400).json({
          success: false,
          message: 'Date and serviceId are required'
        });
      }

      const slots = [];
      const startHour = 10; 
      const endHour = 20;   
      const slotDuration = 2; 
      const now = new Date();
      const selectedDate = new Date(date);
      const isToday = selectedDate.toDateString() === now.toDateString();

      const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      };

      for (let hour = startHour; hour <= endHour; hour += slotDuration) {
        const startTime = new Date(selectedDate);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + slotDuration);

        if (isToday && endTime <= now) {
          continue;
        }

        slots.push({
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          display: `${formatTime(startTime)} - ${formatTime(endTime)}`,
          isAvailable: true
        });
      }

      if (slots.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No available time slots for the selected date',
          data: []
        });
      }

      res.json({
        success: true,
        data: slots
      });
    } catch (error) {
      console.error('Error fetching time slots:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching time slots',
        error: error.message
      });
    }
  },

  
  bookService: async (req, res) => {
    const transaction = await sequelize.transaction();
    console.log("bookService",req.body)
    
    try {
      const { serviceId, slotStart, slotEnd, addressId, notes } = req.body;
      const userId = req.user.id;

      
      if (!serviceId || !slotStart || !slotEnd || !addressId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'serviceId, slotStart, slotEnd, and addressId are required'
        });
      }

      
      const userAddress = await Address.findByPk(addressId, { transaction });
      if (!userAddress || userAddress.user_id !== userId) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Address not found or does not belong to user'
        });
      }

      
      const stores = await Store.findAll({
        where: {
          is_active: true,
          [Op.and]: [
            sequelize.literal(`(
              6371 * acos(
                cos(radians(${userAddress.latitude})) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(${userAddress.longitude})) +
                sin(radians(${userAddress.latitude})) *
                sin(radians(latitude))
              )
            ) <= 3`)
          ]
        },
        attributes: [
          'id', 'name', 'latitude', 'longitude',
          [
            sequelize.literal(`(
              6371 * acos(
                cos(radians(${userAddress.latitude})) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(${userAddress.longitude})) +
                sin(radians(${userAddress.latitude})) *
                sin(radians(latitude))
              )
            )`),
            'distance'
          ]
        ],
        order: [['distance', 'ASC']],
        transaction
      });
      console.log("stores",stores)

      if (stores.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'No stores available in your area'
        });
      }

      
      const nearestStore = stores[0];

      
      const storeDistance = nearestStore.dataValues.distance;
      
      console.log('Nearest store data:', nearestStore.dataValues);
      console.log('Store distance value:', storeDistance);
      console.log('Store distance type:', typeof storeDistance);

      console.log('Creating order with nearest store:', nearestStore.dataValues);

      const order = await Order.create({
        user_id: userId,
        store_id: nearestStore.id,
        service_id: serviceId,
        address_id: addressId,
        pickup_scheduled_at: new Date(slotStart),
        pickup_slot_end: new Date(slotEnd),
        order_status: 'pending',
        total_amount: 0, 
        weight: 1.0, 
        created_at: new Date()
      }, { transaction });

     
      console.log(`New order ${order.id} created for store ${nearestStore.id}`);

      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Service booked successfully',
        data: {
          orderId: order.id,
          store: {
            id: nearestStore.id,
            name: nearestStore.name,
            distance: storeDistance ? storeDistance.toFixed(2) + ' km' : 'Unknown'
          },
          pickupSlot: {
            start: slotStart,
            end: slotEnd
          }
        }
      });

    } catch (error) {
      console.error('Error booking service:', error);
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      res.status(500).json({
        success: false,
        message: 'Error booking service',
        error: error.message
      });
    }
  },

  
  getOrderDetails: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
        include: [
          { model: Service, attributes: ['id', 'name'] },
          { model: Store, attributes: ['id', 'name', 'phone'] },
          { model: Address, attributes: ['id', 'address_line1', 'landmark', 'city', 'state', 'pincode'] }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching order details',
        error: error.message
      });
    }
  },



  getVendorOrders: async (req, res) => {
    try {
      const { status } = req.query;
      const storeId = req.store.id;

      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: 'Vendor authentication required'
        });
      }

      const whereClause = { store_id: storeId };
      if (status) {
        whereClause.status = status;
      }

      const orders = await Order.findAll({
        where: whereClause,
        include: [
          { 
            model: Service, 
            attributes: ['id', 'name'],
            include: [{
              model: ServicePricing,
              as: 'pricings',
              attributes: ['id', 'item_name', 'price', 'unit']
            }]
          },
          { 
            model: User, 
            attributes: ['id', 'name', 'phone'],
            include: [{
              model: Address,
              as: 'addresses',
              where: { id: Sequelize.col('Order.address_id') },
              required: false
            }]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching orders',
        error: error.message
      });
    }
  },

 
  updateOrderStatus: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const storeId = req.store.id;

      // Validate status
      const validStatuses = ['pending', 'accepted', 'picked_up', 'processing', 'ready_for_delivery', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid status provided'
        });
      }

      // Find the order
      const order = await Order.findOne({
        where: { id: orderId, store_id: storeId },
        include: [
          { model: User, attributes: ['id', 'fcm_token'] },
          { model: Service, attributes: ['name'] }
        ],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found or not authorized'
        });
      }

      // Update order status
      const previousStatus = order.status;
      order.status = status;
      if (notes) order.notes = notes;
      await order.save({ transaction });

      // Send notification to user
      if (order.User && order.User.fcm_token) {
        try {
          // This is a placeholder - implement your actual notification logic
          console.log(`Sending notification to user ${order.User.id} about order ${orderId} status change: ${status}`);
          // sendPushNotification({
          //   to: order.User.fcm_token,
          //   title: 'Order Update',
          //   body: `Your order for ${order.Service.name} is now ${status.replace('_', ' ')}`,
          //   data: { orderId, status }
          // });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Don't fail the request if notification fails
        }
      }

      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId: order.id,
          previousStatus,
          newStatus: status
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating order status',
        error: error.message
      });
    }
  }
};

module.exports = bookingController;
