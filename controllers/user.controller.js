const { User, Order, OrderItem, Address, Notification, sequelize } = require('../models');
const AuthService = require('../services/auth.service');
const { Op, QueryTypes } = require('sequelize');
const twilio = require('twilio');
const AccountSid = process.env.TWILIO_ACCOUNT_SID;
const AuthToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(AccountSid, AuthToken);


const sendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

   
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    
    console.log("phone number:", phone_number);
    console.log("otp:", otp);
    try {
      // const result = await client.messages.create({
      //   body: `Your OTP for authentication is: ${otp}. This OTP is valid for 10 minutes.`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: "+918292355155"
      // });

      // console.log('Twilio message sent:', result);


      res.json({
        success: true,
        message: 'OTP sent successfully',
        
        phone_number: phone_number
      });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      throw new Error('Failed to send OTP via SMS');
    }
    
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
    
    
    if (otp !== '0000') {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
   
    let user = await User.findOne({ where: { phone_number } });
    const isNewUser = !user;

    // Block login for reported/flagged accounts
    if (!isNewUser && user.action_button) {
      return res.status(403).json({
        success: false,
        message: 'This account has been reported and cannot log in. Please contact support.'
      });
    }
    
    if (isNewUser) {
      user = await User.create({
        phone_number: phone_number,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    // Generate token
    const token = require('../utils/jwt').generateToken({ 
      id: user.id, 
      phone_number: user.phone_number 
    });
    
    // Return success response
    res.json({
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
    });
    
  } catch (error) {
    console.error('Error in verifyOTP:', error);
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
      
      updates.image = req.file.location || req.file.path;
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

const deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    const user = await User.findByPk(id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Optional safeguard: prevent deleting admins
    if (user.role === 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin accounts'
      });
    }

    // Delete order items and orders for this user
    const orders = await Order.findAll({
      where: { user_id: id },
      attributes: ['id'],
      transaction
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length) {
      await OrderItem.destroy({ where: { order_id: orderIds }, transaction });
      await Order.destroy({ where: { id: orderIds }, transaction });
    }

    // Delete addresses for this user
    await Address.destroy({ where: { user_id: id }, transaction });

    await user.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

const reportUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot report admin accounts'
      });
    }

    user.action_button = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User reported and blocked from login'
    });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report user',
      error: error.message
    });
  }
};

const getNearbyStores = async (req, res) => {
  console.log("nearby store", req.query)
  try {
    const { latitude, longitude, radius_km } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = radius_km ? parseFloat(radius_km) : 3;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude query parameters are required and must be valid numbers'
      });
    }

    const effectiveRadius = Number.isNaN(radius) ? 3 : radius;

    const stores = await sequelize.query(
      `
        SELECT *
        FROM (
          SELECT 
            id,
            name,
            email,
            phone,
            address,
            latitude,
            longitude,
            is_active,
            is_admin_locked,
            (
              6371 * acos(
                cos(radians(:lat)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(:lng)) +
                sin(radians(:lat)) * sin(radians(latitude))
              )
            ) AS distance
          FROM stores
          WHERE 
            is_active = true
            AND is_admin_locked = false
            AND latitude IS NOT NULL
            AND longitude IS NOT NULL
        ) AS s
        WHERE s.distance <= :radius
        ORDER BY s.distance ASC
      `,
      {
        replacements: { lat, lng, radius: effectiveRadius },
        type: QueryTypes.SELECT
      }
    );

    const formattedStores = stores.map((store) => ({
      ...store,
      latitude: store.latitude !== null ? parseFloat(store.latitude) : null,
      longitude: store.longitude !== null ? parseFloat(store.longitude) : null,
      distance: store.distance !== null ? parseFloat(store.distance) : null
    }));

    return res.json({
      success: true,
      data: formattedStores,
      meta: {
        radiusKm: effectiveRadius,
        center: { latitude: lat, longitude: lng },
        count: formattedStores.length
      }
    });
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby stores',
      error: error.message
    });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await Notification.findAll({
      where: {
        user_id: userId
      },
      attributes: [
        'id',
        'title',
        'message',
        'type',
        'is_read',
        'created_at'
      ],
      include: [
        {
          model: require('../models').Store,
          as: 'store',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    const unreadCount = await Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      reason: notification.message,
      time: notification.created_at,
      type: notification.type,
      isRead: notification.is_read,
      storeName: notification.store ? notification.store.name : null
    }));

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({
      is_read: true
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications',
      error: error.message
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  getUserProfile,
  updateProfile,
  listUsers,
  deleteUser,
  reportUser,
  getNearbyStores,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
