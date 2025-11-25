const db = require('../models');
const { Order, User, Service, Store, OrderItem, Address } = db;
const { Op } = require('sequelize');

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
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
            attributes: ['id', 'name', 'phone', 'address']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: ['id', 'address_line', 'city', 'state', 'pincode', 'landmark']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching all orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }
  },

getUserOrders: async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.findAll({
      where: {
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
          attributes: ['id', 'name', 'phone', 'address']
        },
        {
          model: Address,
          as: 'delivery_address',
          attributes: ['id', 'address_line', 'city', 'state', 'pincode', 'landmark']
        }
      ],
      attributes: [
        'id',
        'order_status',
        'created_at',
        'updated_at',
        'pickup_scheduled_at',
        'pickup_slot_end',
        'picked_up_at',
        'delivered_at'
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedOrders = orders.map(order => {
      // Extract services with quantities
      const services = order.items.map(item => ({
        id: item.service.id,
        name: item.service.name,
        description: item.service.description,
        quantity: item.quantity,
        price: item.price // Add this if you have price per item
      }));

      // Calculate total items
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        orderId: order.id,
        status: order.order_status,
        services: services,
        totalItems: totalItems,
        storeName: order.store ? order.store.name : 'Unknown',
        storeId: order.store ? order.store.id : null,
        storePhone: order.store ? order.store.phone : null,
        deliveryAddress: order.delivery_address ? {
          addressLine: order.delivery_address.address_line,
          city: order.delivery_address.city,
          state: order.delivery_address.state,
          pincode: order.delivery_address.pincode,
          landmark: order.delivery_address.landmark
        } : null,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        pickupSlot: {
          start: order.pickup_scheduled_at,
          end: order.pickup_slot_end
        },
        pickupScheduledAt: order.pickup_scheduled_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at
      };
    });

    res.json({
      success: true,
      data: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
},


  cancelOrder: async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({
        where: { 
          id: orderId,
          user_id: userId
        },
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order can be cancelled (only pending or confirmed orders)
      if (!['pending', 'confirmed'].includes(order.order_status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      // Update order status to cancelled
      await order.update({
        order_status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date()
      }, { transaction });

      await transaction.commit();

      // Get updated order with details
      const updatedOrder = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Service,
              as: 'service'
            }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: updatedOrder
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: error.message
      });
    }
  },


  rescheduleOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { pickupSlotStart, pickupSlotEnd } = req.body;
      const userId = req.user.id;

   
      if (!pickupSlotStart || !pickupSlotEnd) {
        return res.status(400).json({
          success: false,
          message: 'Pickup slot start and end times are required'
        });
      }

      const order = await Order.findOne({
        where: { 
          id: orderId,
          user_id: userId
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

   
      if (!['pending', 'confirmed'].includes(order.order_status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be rescheduled at this stage'
        });
      }

      // Update pickup times
      await order.update({
        pickup_scheduled_at: new Date(pickupSlotStart),
        pickup_slot_end: new Date(pickupSlotEnd),
        updated_at: new Date()
      });

      res.json({
        success: true,
        message: 'Order rescheduled successfully',
        data: {
          orderId: order.id,
          pickupSlot: {
            start: order.pickup_scheduled_at,
            end: order.pickup_slot_end
          }
        }
      });

    } catch (error) {
      console.error('Error rescheduling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reschedule order',
        error: error.message
      });
    }
  },

  updateOrderStatus: async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const vendorId = req.user.id;

      const validStatuses = ['pending', 'cancelled', 'confirmed', 'picked_up', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered'];
      if (!validStatuses.includes(status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
        });
      }

      const order = await Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'admin_id']
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Service,
              as: 'service'
            }]
          }
        ],
        transaction
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.store && order.store.admin_id !== vendorId) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this order'
        });
      }

      const updateData = { 
        order_status: status,
        updated_at: new Date()
      };
      
      // Set timestamps based on status
      const statusTimestamps = {
        'cancelled': 'cancelled_at',
        'picked_up': 'picked_up_at',
        'processing': 'processing_at',
        'ready_for_delivery': 'ready_for_delivery_at',
        'out_for_delivery': 'out_for_delivery_at',
        'delivered': 'delivered_at'
      };

      if (statusTimestamps[status]) {
        updateData[statusTimestamps[status]] = new Date();
      }

      // Add admin notes if provided
      if (notes) {
        updateData.admin_notes = notes;
      }

      await order.update(updateData, { transaction });
      await transaction.commit();

      // Fetch the updated order with all its relationships
      const updatedOrder = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Service,
              as: 'service'
            }]
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'phone', 'address']
          },
          {
            model: Address,
            as: 'delivery_address',
            attributes: ['id', 'address_line', 'city', 'state', 'pincode', 'landmark']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
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

module.exports = orderController;