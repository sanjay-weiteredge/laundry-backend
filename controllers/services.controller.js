const { Service } = require('../models');

exports.createService = async (req, res) => {
  try {
    const { name, image, description, price } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and image are required fields' 
      });
    }

    const service = await Service.create({
      name,
      image,
      description: description || null,
      price: price ? parseFloat(price) : 0.00
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
  console.log("getAllServicessssssssss")
  try {
    const services = await Service.findAll({
      attributes: ['id', 'name', 'image', 'description', 'price', 'created_at']
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
    const { name, image, description, price } = req.body;
    
    // Validate id parameter
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

    // Update only provided fields
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
  try {
    const { id } = req.params;
    
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await service.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: error.message
    });
  }
};