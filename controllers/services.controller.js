const { Service } = require('../models');

exports.createService = async (req, res) => {
  try {
    const { name, image, description } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and image are required fields' 
      });
    }

    const service = await Service.create({
      name,
      image,
      description: description || null
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
      attributes: ['id', 'name', 'image', 'description', 'created_at']
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