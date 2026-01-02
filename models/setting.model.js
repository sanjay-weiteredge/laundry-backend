'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Setting extends Model {
    static associate(models) {
      // No associations needed for a simple key-value table
    }
  }

  Setting.init({
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true, // Automatically add createdAt and updatedAt
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  });

  return Setting;
};
