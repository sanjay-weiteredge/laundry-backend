const { Admin, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');


const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '30d' }
  );
};
console.log("env",process.env.JWT_SECRET);

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

 
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }


    const adminExists = await Admin.findOne({
      where: { email }
    });

    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists with this email'
      });
    }

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

  
    const admin = await Admin.create({
      name,
      email,
      password_hash: hashedPassword,
      role: 'admin'
    });

 
    const token = generateToken(admin.id, admin.role);


    const adminResponse = admin.get({ plain: true });
    delete adminResponse.password_hash;

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      data: adminResponse
    });
  } catch (error) {
    console.error('Error in admin signup:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({
      where: { email: email.trim() }
    });

    if (!admin) {
      console.log('Admin not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Admin found, comparing password...');
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!isMatch) {
      console.log('Password mismatch for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Login successful for email:', email);

  
    const token = generateToken(admin.id, admin.role);

   
    const adminResponse = admin.get({ plain: true });
    delete adminResponse.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: adminResponse
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile
};