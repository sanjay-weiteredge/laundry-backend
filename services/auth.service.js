const crypto = require('crypto');
const { User } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwt');

const otpStore = new Map();

class AuthService {
  static async generateOTP(phoneNumber) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); 
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 
    
    otpStore.set(phoneNumber, { otp, expiresAt });
    
    console.log(`OTP for ${phoneNumber}: ${otp}`);
    
    // Include OTP in response for development
    // In production, you might want to remove the OTP from the response
    return { 
      success: true, 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    };
  }
  
  static async verifyOTP(phoneNumber, otp) {
    const storedData = otpStore.get(phoneNumber);
    
    if (!storedData || storedData.expiresAt < new Date()) {
      otpStore.delete(phoneNumber); 
      return { success: false, message: 'Invalid or expired OTP' };
    }
    
    if (storedData.otp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }
    
    otpStore.delete(phoneNumber);
    
    let user = await User.findOne({ where: { phone_number: phoneNumber } });
    const isNewUser = !user;
    
    if (isNewUser) {
      user = await User.create({
        phone_number: phoneNumber,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    const token = generateToken({ id: user.id, phone_number: user.phone_number });
    
    return {
      success: true,
      message: isNewUser ? 'User registered successfully' : 'Login successful',
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        name: user.name,
        email: user.email
      },
      isNewUser
    };
  }
}

module.exports = AuthService;
