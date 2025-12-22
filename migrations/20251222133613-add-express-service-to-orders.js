'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'is_express', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if the order is an express service'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'is_express');
  }
};

