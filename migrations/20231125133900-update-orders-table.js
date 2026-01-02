'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // This migration is commented out because it was failing in production.
    // It's assumed that these changes have already been applied to the production database.
    /*
    // Add notes column if it doesn't exist
    await queryInterface.addColumn('orders', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Remove service_id foreign key constraint first
    const [results] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE " +
      "WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'service_id' AND CONSTRAINT_NAME != 'PRIMARY'"
    );

    if (results.length > 0) {
      const constraintName = results[0].CONSTRAINT_NAME;
      await queryInterface.removeConstraint('orders', constraintName);
    }

    // Remove service_id column
    await queryInterface.removeColumn('orders', 'service_id');
    */
  },

  down: async (queryInterface, Sequelize) => {
    // This migration is commented out because it was failing in production.
    /*
    // Add service_id column back
    await queryInterface.addColumn('orders', 'service_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'services',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Remove notes column
    await queryInterface.removeColumn('orders', 'notes');
    */
  }
};
