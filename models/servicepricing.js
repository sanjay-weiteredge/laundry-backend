'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ServicePricing extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ServicePricing.init({
    service_id: DataTypes.INTEGER,
    item_type: DataTypes.STRING,
    price: DataTypes.DECIMAL,
    service_type: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN,
    last_updated_by: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'ServicePricing',
  });
  return ServicePricing;
};