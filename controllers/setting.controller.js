'use strict';
const { Setting } = require('../models');

const settingController = {
  // Get a specific setting by key
  getSetting: async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await Setting.findByPk(key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
        });
      }

      res.json({ success: true, data: setting });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch setting', error: error.message });
    }
  },

  // Create or update a setting
  updateSetting: async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined || value === null) {
        return res.status(400).json({ success: false, message: 'Value is required' });
      }

      // Use findOrCreate to handle both creation and updates gracefully
      const [setting, created] = await Setting.findOrCreate({
        where: { key },
        defaults: { value: value.toString() },
      });

      if (!created) {
        // If the setting already existed, update its value
        setting.value = value.toString();
        await setting.save();
      }

      res.status(created ? 201 : 200).json({
        success: true,
        message: `Setting '${key}' ${created ? 'created' : 'updated'} successfully`,
        data: setting,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ success: false, message: 'Failed to update setting', error: error.message });
    }
  },

  // Update nearby radius specifically
  updateNearbyRadius: async (req, res) => {
    try {
      const { value } = req.body;

      if (value === undefined || value === null) {
        return res.status(400).json({ success: false, message: 'Radius value is required' });
      }

      // Validate that value is a positive number
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({ success: false, message: 'Radius must be a positive number' });
      }

      // Use findOrCreate to handle both creation and updates gracefully
      const [setting, created] = await Setting.findOrCreate({
        where: { key: 'nearby_radius_km' },
        defaults: { value: value.toString() },
      });

      if (!created) {
        // If the setting already existed, update its value
        setting.value = value.toString();
        await setting.save();
      }

      res.status(created ? 201 : 200).json({
        success: true,
        message: `Nearby radius ${created ? 'created' : 'updated'} successfully`,
        data: {
          key: 'nearby_radius_km',
          value: value.toString(),
          radius_km: numValue
        },
      });
    } catch (error) {
      console.error('Error updating nearby radius:', error);
      res.status(500).json({ success: false, message: 'Failed to update nearby radius', error: error.message });
    }
  },

  // Get nearby radius specifically
  getNearbyRadius: async (req, res) => {
    try {
      const setting = await Setting.findByPk('nearby_radius_km');

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Nearby radius setting not found',
        });
      }

      const radius = parseFloat(setting.value);
      res.json({ 
        success: true, 
        data: {
          key: setting.key,
          value: setting.value,
          radius_km: isNaN(radius) ? 3 : radius // fallback to 3 if invalid
        }
      });
    } catch (error) {
      console.error('Error fetching nearby radius:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch nearby radius', error: error.message });
    }
  },
};

module.exports = settingController;
