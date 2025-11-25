'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the service_id column from the orders table
    await queryInterface.removeColumn('orders', 'service_id');
  },

  down: async (queryInterface, Sequelize) => {
    // Add the service_id column back if we need to rollback
    await queryInterface.addColumn('orders', 'service_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'services',
        key: 'id'
      }
    });
  }
};
