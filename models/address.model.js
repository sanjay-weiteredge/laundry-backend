'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      Address.belongsTo(models.User, { 
        foreignKey: 'user_id', 
        as: 'user' 
      });
      Address.hasMany(models.Order, { 
        foreignKey: 'address_id', 
        as: 'orders' 
      });
    }
  }
  
  Address.init({
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
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    alt_phone: {
      type: DataTypes.STRING(15)
    },
    label: {
      type: DataTypes.STRING(50),
      defaultValue: 'Home'
    },
    address_line: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    house: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    street: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    landmark: {
      type: DataTypes.STRING(180)
    },
    instructions: {
      type: DataTypes.TEXT
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(100)
    },
    postal_code: {
      type: DataTypes.STRING(20)
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    timestamps: false,
    underscored: true
  });

  return Address;
};
