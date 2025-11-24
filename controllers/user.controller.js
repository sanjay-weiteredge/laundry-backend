const { User, sequelize } = require('../models');
const AuthService = require('../services/auth.service');
const { Op } = require('sequelize');


const sendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Static OTP for now
    const otp = "0000";

    res.json({
      success: true,
      message: "OTP sent successfully",
      phone_number,
      otp
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};



const verifyOTP = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Static OTP check
    if (otp !== "0000") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
      phone_number
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};


const getUserProfile = async (req, res) => {
  console.log("Fetching authenticated user profile");
  try {
    const authUser = req.user;
    
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findByPk(authUser.id, {
      attributes: ['id', 'name', 'email', 'phone_number', 'image', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Error fetching user profile by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    
  
    if (email !== undefined && email !== user.email) {
  
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }


      const existingUser = await User.findOne({
        where: {
          email: email,
          id: { [Op.ne]: user.id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another account'
        });
      }
      
      updates.email = email;
    }
    
   
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imagePath = `/uploads/${req.file.filename}`;
      updates.image = `${baseUrl}${imagePath}`;
    }

   
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await User.update(updates, {
        where: { id: user.id }
      });
    }

  
    const updatedUser = await User.findByPk(user.id);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        image: updatedUser.image
      }
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      attributes: [
        'id',
        'name',
        'email',
        'phone_number',
        'role',
        'created_at',
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM orders WHERE orders.user_id = "User"."id")'
          ),
          'totalOrders'
        ]
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.max(Math.ceil(count / limit), 1)
      }
    });
  } catch (error) {
    console.error('Error fetching users list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  getUserProfile,
  updateProfile,
  listUsers
};
