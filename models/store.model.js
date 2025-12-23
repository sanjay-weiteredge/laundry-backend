'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    static associate(models) {
      Store.belongsTo(models.Admin, { 
        foreignKey: 'admin_id', 
        as: 'admin' 
      });
      Store.hasMany(models.Order, { 
        foreignKey: 'store_id', 
        as: 'orders' 
      });
      Store.hasMany(models.Notification, {
        foreignKey: 'store_id',
        as: 'notifications'
      });
    }
    
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password_hash);
    }
    
    async validateRevenuePassword(password) {
      if (!this.revenue_password_hash) return false;
      return await bcrypt.compare(password, this.revenue_password_hash);
    }
  }
  
  Store.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_admin_locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revenue_password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Store',
    tableName: 'stores',
    timestamps: false,
    underscored: true,
    hooks: {
      beforeCreate: async (store) => {
        if (store.password_hash) {
          const salt = await bcrypt.genSalt(10);
          store.password_hash = await bcrypt.hash(store.password_hash, salt);
        }
      },
      beforeUpdate: async (store) => {
        if (store.changed('password_hash')) {
          const salt = await bcrypt.genSalt(10);
          store.password_hash = await bcrypt.hash(store.password_hash, salt);
        }
      }
    }
  });

  return Store;
};
