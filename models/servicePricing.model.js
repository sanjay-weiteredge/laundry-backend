'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServicePricing extends Model {
    static associate(models) {
      ServicePricing.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      ServicePricing.belongsTo(models.Admin, {
        foreignKey: 'last_updated_by',
        as: 'updated_by'
      });
    }
  }
  
  ServicePricing.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    item_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of item (e.g., shirt, pant, jeans, sports_shoes, etc.)'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    service_type: {
      type: DataTypes.ENUM('dry_clean', 'shoe_clean', 'steam_iron', 'laundry', 'wash_and_fold'),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ServicePricing',
    tableName: 'service_pricing',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: 'idx_service_pricing_service_type',
        fields: ['service_type']
      },
      {
        name: 'idx_service_pricing_item_type',
        fields: ['item_type']
      },
      {
        name: 'idx_service_pricing_service_active',
        fields: ['service_type', 'is_active']
      },
      {
        name: 'idx_service_pricing_unique_active',
        unique: true,
        fields: ['service_id', 'is_active'],
        where: {
          is_active: true
        }
      }
    ]
  });

  return ServicePricing;
};
