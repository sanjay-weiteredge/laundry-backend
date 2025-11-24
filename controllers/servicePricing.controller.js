const { ServicePricing } = require('../models');
const { Op } = require('sequelize');

const getServicePricing = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    const validServiceTypes = ['dry_clean', 'shoe_clean', 'steam_iron', 'laundry', 'wash_and_fold'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type',
        validServiceTypes
      });
    }

    const pricings = await ServicePricing.findAll({
      where: {
        service_type: serviceType,
        is_active: true
      },
      attributes: ['id', 'item_type', 'price', 'service_type'],
      order: [['item_type', 'ASC']]
    });

    if (serviceType === 'laundry' || serviceType === 'wash_and_fold') {
      const price = serviceType === 'laundry' ? 140 : 100;
      return res.json({
        success: true,
        data: [{
          item_type: 'per_kg',
          price: price,
          service_type: serviceType,
          description: serviceType === 'laundry' 
            ? 'Wash and steam iron (per kg)' 
            : 'Wash and fold (per kg)'
        }]
      });
    }

    res.json({
      success: true,
      data: pricings
    });
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service pricing',
      error: error.message
    });
  }
};

const getAllServicePricings = async (req, res) => {
  try {
    const pricings = await ServicePricing.findAll({
      attributes: ['id', 'item_type', 'price', 'service_type', 'is_active', 'updatedAt'],
      order: [
        ['service_type', 'ASC'],
        ['item_type', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: pricings
    });
  } catch (error) {
    console.error('Error fetching all service pricings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service pricings',
      error: error.message
    });
  }
};



const createOrUpdateServicePricing = async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user?.id || 0;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of items with item_type, price, and service_type'
      });
    }

    const validServiceTypes = ['dry_clean', 'shoe_clean', 'steam_iron', 'laundry', 'wash_and_fold'];
    const results = [];

    for (const item of items) {
      const { item_type, price, service_type } = item;

      if (!item_type || price === undefined || !service_type) {
        results.push({
          success: false,
          message: 'Each item must include item_type, price, and service_type',
          item
        });
        continue;
      }

      if (!validServiceTypes.includes(service_type)) {
        results.push({
          success: false,
          message: `Invalid service type: ${service_type}`,
          validServiceTypes,
          item
        });
        continue;
      }

      if ((service_type === 'laundry' || service_type === 'wash_and_fold') && item_type !== 'per_kg') {
        results.push({
          success: false,
          message: `For ${service_type} service, item_type must be 'per_kg'`,
          item
        });
        continue;
      }

      try {
        const [pricing, created] = await ServicePricing.findOrCreate({
          where: {
            service_type,
            item_type
          },
          defaults: {
            price,
            last_updated_by: userId,
            is_active: true
          }
        });

        if (!created) {
          pricing.price = price;
          pricing.last_updated_by = userId;
          pricing.is_active = true;
          await pricing.save();
        }

        results.push({
          success: true,
          message: created ? 'Created' : 'Updated',
          data: {
            id: pricing.id,
            item_type: pricing.item_type,
            price: pricing.price,
            service_type: pricing.service_type,
            is_active: pricing.is_active,
            last_updated_by: pricing.last_updated_by,
            updatedAt: pricing.updatedAt
          }
        });
      } catch (error) {
        results.push({
          success: false,
          message: 'Error processing item',
          error: error.message,
          item
        });
      }
    }

    const allSucceeded = results.every(result => result.success);
    const someSucceeded = results.some(result => result.success);

    res.status(someSucceeded ? (allSucceeded ? 201 : 207) : 400).json({
      success: someSucceeded,
      message: someSucceeded 
        ? (allSucceeded ? 'All items processed successfully' : 'Some items processed with errors')
        : 'Failed to process items',
      results
    });
  } catch (error) {
    console.error('Error in createOrUpdateServicePricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};


const getAllServiceTypesWithItems = async (req, res) => {
  try {
    const pricings = await ServicePricing.findAll({
      where: { is_active: true },
      attributes: ['id', 'item_type', 'price', 'service_type'],
      order: [
        ['service_type', 'ASC'],
        ['item_type', 'ASC']
      ]
    });


    const serviceTypes = {};
    pricings.forEach(pricing => {
      if (!serviceTypes[pricing.service_type]) {
        serviceTypes[pricing.service_type] = [];
      }
      serviceTypes[pricing.service_type].push({
        id: pricing.id,
        item_type: pricing.item_type,
        price: pricing.price
      });
    });

    res.json({
      success: true,
      data: serviceTypes
    });
  } catch (error) {
    console.error('Error fetching service types with items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service types with items',
      error: error.message
    });
  }
};

module.exports = {
  getServicePricing,
  getAllServicePricings,
  createOrUpdateServicePricing,
  getAllServiceTypesWithItems
};
