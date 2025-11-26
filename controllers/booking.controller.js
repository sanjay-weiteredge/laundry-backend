const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../models');
const { Order, Service, Store, User, Address, ServicePricing, OrderItem } = require('../models');
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
    console.log("bookService", req.body);
    
    try {
      const { services, slotStart, slotEnd, addressId, notes } = req.body;
      const userId = req.user.id;

     
      if (!Array.isArray(services) || services.length === 0 || !slotStart || !slotEnd || !addressId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'services array, slotStart, slotEnd, and addressId are required'
        });
      }

      // Validate service IDs
      for (const serviceId of services) {
        if (!serviceId || typeof serviceId !== 'number' || serviceId < 1) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Each service must have a valid numeric ID'
          });
        }
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

      
      console.log('Creating order with services:', JSON.stringify(services, null, 2));
      console.log('Assigning to store:', nearestStore.name, '(ID:', nearestStore.id, ')');
      
      // Create the order
      const order = await Order.create({
        user_id: userId,
        store_id: nearestStore.id,
        address_id: addressId,
        service_id: services[0], // Keeping for backward compatibility
        pickup_scheduled_at: new Date(slotStart),
        pickup_slot_end: new Date(slotEnd),
        order_status: 'pending',
        payment_mode: 'cash',
        notes: notes || null
      }, { transaction });

      console.log('Order created with ID:', order.id);
      
      // Store all services as order items
      for (const serviceId of services) {
        console.log(`Processing service ID: ${serviceId}`);
        
        const serviceExists = await Service.findByPk(serviceId, { transaction });
        if (!serviceExists) {
          console.error(`Service with id ${serviceId} not found`);
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Service with id ${serviceId} not found` 
          });
        }

        // Create order item for each service
        const orderItem = await OrderItem.create({
          order_id: order.id,
          service_id: serviceId
        }, { transaction });
        
        console.log(`Created order item for service ${serviceId}`);
      }

      // Commit the transaction
      await transaction.commit();
      console.log('Order successfully booked with ID:', order.id);
      
      // Log store assignment
      console.log(`Order assigned to store: ${nearestStore.name} (ID: ${nearestStore.id})`);
      console.log('Store location:', {
        latitude: nearestStore.latitude,
        longitude: nearestStore.longitude,
        distance: nearestStore.dataValues.distance ? nearestStore.dataValues.distance.toFixed(2) + ' km' : 'N/A'
      });
      
      
      const orderWithDetails = await Order.findByPk(order.id, {
        attributes: ['id', 'order_status', 'pickup_scheduled_at', 'pickup_slot_end', 'created_at', 'notes'],
        include: [
          {
            model: OrderItem,
            as: 'items',
            attributes: ['id'],
            include: [{
              model: Service,
              as: 'service',
              attributes: ['id', 'name', 'description']
            }]
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'phone', 'address', 'latitude', 'longitude']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: ['id', 'address_line', 'city', 'state', 'pincode', 'landmark']
          }
          

        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: orderWithDetails
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
        where: {
          id: orderId,
          user_id: userId
        },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Service,
              as: 'service',
              attributes: ['id', 'name', 'description']
            }]
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'phone', 'address', 'latitude', 'longitude']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: ['id', 'address_line', 'city', 'state', 'pincode', 'landmark', 'latitude', 'longitude']
          }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or you do not have permission to view this order'
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
  }
};

module.exports = bookingController;
