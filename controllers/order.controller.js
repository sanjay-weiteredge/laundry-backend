const db = require('../models');
const { Order, User, Service, Store } = db;

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: [
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'name']
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name']
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
            model: Service,
            as: 'service',
            attributes: ['id', 'name']
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name']
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

      const formattedOrders = orders.map(order => ({
        orderId: order.id,
        status: order.order_status,
        serviceName: order.service ? order.service.name : 'Unknown',
        storeName: order.store ? order.store.name : 'Unknown',
        storeId: order.store ? order.store.id : null,
        createdAt: order.created_at,
        completedAt: order.order_status === 'delivered' ? order.delivered_at : null,
        pickupSlot: {
          start: order.pickup_scheduled_at,
          end: order.pickup_slot_end
        },
        pickupScheduledAt: order.pickup_scheduled_at,
        pickedUpAt: order.picked_up_at
      }));

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
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

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

      // Check if order can be cancelled (only pending or confirmed orders)
      if (!['pending', 'confirmed'].includes(order.order_status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      // Update order status to cancelled
      await order.update({
        order_status: 'cancelled',
        updated_at: new Date()
      });

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          orderId: order.id,
          status: order.order_status
        }
      });

    } catch (error) {
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
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const vendorId = req.user.id;

      const validStatuses = ['pending', 'cancelled', 'confirmed', 'picked_up', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Valid statuses: pending, cancelled, confirmed, picked_up, processing, ready_for_delivery, out_for_delivery, delivered'
        });
      }

      const order = await Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'admin_id']
          }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.store && order.store.admin_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this order'
        });
      }

      const updateData = { order_status: status };
      
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date();
      } else if (status === 'picked_up') {
        updateData.picked_up_at = new Date();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date();
      }

      await order.update(updateData);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId: order.id,
          status: order.order_status,
          updatedAt: order.updated_at
        }
      });

    } catch (error) {
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