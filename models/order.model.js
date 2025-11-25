'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      Order.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store'
      });
      
      Order.belongsTo(models.Address, {
        foreignKey: 'address_id',
        as: 'delivery_address'
      });
      
      Order.hasMany(models.OrderItem, {
        foreignKey: 'order_id',
        as: 'items'
      });
    }
  }
  
  Order.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'addresses',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_mode: {
      type: DataTypes.STRING(20),
      defaultValue: 'cash',
      validate: {
        isIn: [['cash']] 
      }
    },
    order_status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'picked_up',
        'processing',
        'ready_for_delivery',
        'out_for_delivery',
        'delivered',
        'cancelled'
      ),
      defaultValue: 'pending'
    },
    pickup_scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pickup_slot_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    picked_up_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: false,
    underscored: true,
    hooks: {
      beforeUpdate: (order) => {
        // Update the updated_at timestamp whenever the order is modified
        order.updated_at = new Date();
        
        // Set timestamps for status changes
        if (order.changed('order_status')) {
          const now = new Date();
          switch(order.order_status) {
            case 'picked_up':
              order.picked_up_at = order.picked_up_at || now;
              break;
            case 'delivered':
              order.delivered_at = order.delivered_at || now;
              break;
          }
        }
      }
    }
  });

  return Order;
};
