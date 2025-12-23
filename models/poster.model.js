'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Poster extends Model {
    static associate(models) {
      // No associations for posters currently
    }
  }

  Poster.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Poster',
    tableName: 'posters',
    timestamps: false,
    underscored: true
  });

  return Poster;
};

