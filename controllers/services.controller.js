const { Service, Order, OrderItem, sequelize } = require('../models');

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return defaultValue;
};

exports.createService = async (req, res) => {
  try {
    const { name, description, price, vendor, user } = req.body;
    const imageUrl = req.file ? (req.file.location || req.file.path) : null;
    
    if (!name || !imageUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and image are required fields' 
      });
    }

    const service = await Service.create({
      name,
      image: imageUrl,
      description: description || null,
      price: price ? parseFloat(price) : 0.00,
      vendor: parseBoolean(vendor, false),
      user: parseBoolean(user, false)
    });

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service',
      error: error.message
    });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const { audience } = req.query;

    const where = {};
    if (audience === 'user') {
      where.user = true;
    } else if (audience === 'vendor') {
      where.vendor = true;
    }

    const services = await Service.findAll({
      where,
      attributes: ['id', 'name', 'image', 'description', 'price', 'vendor', 'user', 'created_at']
    });
    
    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description, price, vendor, user } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (name !== undefined && name !== null && name !== '') {
      service.name = name;
    }
    if (image !== undefined && image !== null && image !== '') {
      service.image = image;
    }
    if (description !== undefined) {
      service.description = description || null;
    }
    
    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        service.price = parsedPrice;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number'
        });
      }
    }

    if (vendor !== undefined) {
      service.vendor = parseBoolean(vendor, service.vendor);
    }

    if (user !== undefined) {
      service.user = parseBoolean(user, service.user);
    }

    await service.save();
    
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service:', error);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: error.message
    });
  }
};

exports.deleteService = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    const service = await Service.findByPk(id, { transaction });
    if (!service) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const orders = await Order.findAll({
      where: { service_id: id },
      attributes: ['id'],
      transaction
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length) {
      // Delete order items for these orders
      await OrderItem.destroy({ where: { order_id: orderIds }, transaction });
      // Delete orders for this service
      await Order.destroy({ where: { id: orderIds }, transaction });
    }

    // Also delete any order items directly referencing this service (defensive)
    await OrderItem.destroy({ where: { service_id: id }, transaction });

    await service.destroy({ transaction });
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: error.message
    });
  }
};