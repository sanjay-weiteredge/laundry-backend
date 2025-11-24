'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Using system as default updater since no admin is required
    const systemId = 0; // Default system ID
    const now = new Date();
    
    // Dry Clean Service
    const dryCleanPricing = [
      { item_type: 'shirt', price: 110, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'shirt_silk', price: 150, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'shirt_woolen', price: 150, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'tshirt', price: 110, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'pant', price: 130, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'jeans', price: 130, service_type: 'dry_clean', last_updated_by: systemId, created_at: now, updated_at: now },
    ];

    // Shoe Clean Service
    const shoeCleanPricing = [
      { item_type: 'sports_shoes_right', price: 170, service_type: 'shoe_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'sports_shoes_left', price: 170, service_type: 'shoe_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'canvas_shoes_right', price: 170, service_type: 'shoe_clean', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'canvas_shoes_left', price: 170, service_type: 'shoe_clean', last_updated_by: systemId, created_at: now, updated_at: now },
    ];

    // Steam Iron Service
    const steamIronPricing = [
      { item_type: 'shirt', price: 30, service_type: 'steam_iron', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'tshirt', price: 25, service_type: 'steam_iron', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'pant', price: 40, service_type: 'steam_iron', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'jeans', price: 50, service_type: 'steam_iron', last_updated_by: systemId, created_at: now, updated_at: now },
      { item_type: 'suit', price: 100, service_type: 'steam_iron', last_updated_by: systemId, created_at: now, updated_at: now },
    ];

    // Laundry Service (per kg)
    const laundryPricing = [
      { item_type: 'per_kg', price: 140, service_type: 'laundry', last_updated_by: adminId, created_at: now, updated_at: now },
    ];

    // Wash and Fold Service (per kg)
    const washAndFoldPricing = [
      { item_type: 'per_kg', price: 100, service_type: 'wash_and_fold', last_updated_by: adminId, created_at: now, updated_at: now },
    ];

    // Insert all pricing data
    await queryInterface.bulkInsert('service_pricing', [
      ...dryCleanPricing,
      ...shoeCleanPricing,
      ...steamIronPricing,
      ...laundryPricing,
      ...washAndFoldPricing
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('service_pricing', null, {});
  }
};
