'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stores', 'is_admin_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'is_active'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stores', 'is_admin_locked');
  }
};

