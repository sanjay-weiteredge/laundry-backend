'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      Admin.hasMany(models.Store, { 
        foreignKey: 'admin_id', 
        as: 'stores' 
      });
      Admin.hasMany(models.ServicePricing, {
        foreignKey: 'last_updated_by',
        as: 'updated_pricings'
      });
    }
    
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password_hash);
    }
  }
  
  Admin.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
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
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(30),
      defaultValue: 'admin'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: false,
    underscored: true,
    // Password hashing is handled in the controller to prevent double-hashing
  });

  return Admin;
};
