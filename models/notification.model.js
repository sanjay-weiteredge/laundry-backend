'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      Notification.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store'
      });
    }
  }
  
  Notification.init({
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
    title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        'order_created',
        'order_status_updated',
        'promotion',
        'system',
        'other'
      ),
      defaultValue: 'system'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'is_read']
      },
      {
        fields: ['store_id', 'is_read']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Notification;
};
