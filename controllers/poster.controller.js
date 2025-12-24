'use strict';

const { Poster } = require('../models');

exports.createPoster = async (req, res) => {
  try {
    if (!req.file || (!req.file.location && !req.file.path)) {
      return res.status(400).json({
        success: false,
        message: 'Poster image is required'
      });
    }

    const poster = await Poster.create({
      image_url: req.file.location || req.file.path,
      is_active: true,
      created_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Poster uploaded successfully',
      data: poster
    });
  } catch (error) {
    console.error('Error creating poster:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload poster',
      error: error.message
    });
  }
};

exports.getActivePosters = async (req, res) => {
  try {
    const posters = await Poster.findAll({
      where: { is_active: true },
      attributes: ['id', 'image_url', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count: posters.length,
      data: posters
    });
  } catch (error) {
    console.error('Error fetching posters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posters',
      error: error.message
    });
  }
};

exports.deletePoster = async (req, res) => {
  try {
    const { id } = req.params;
    const poster = await Poster.findByPk(id);

    if (!poster || poster.is_active === false) {
      return res.status(404).json({
        success: false,
        message: 'Poster not found'
      });
    }

    poster.is_active = false;
    await poster.save();

    return res.status(200).json({
      success: true,
      message: 'Poster deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting poster:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete poster',
      error: error.message
    });
  }
};

