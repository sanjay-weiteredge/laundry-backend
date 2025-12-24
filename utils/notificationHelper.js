const { Notification } = require('../models');

/**
 * Helper function to create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {number} params.userId - User ID
 * @param {number} params.storeId - Store ID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message/reason
 * @param {string} params.type - Notification type (order_created, order_status_updated, etc.)
 * @returns {Promise<Notification>} Created notification
 */
const createNotification = async ({ userId, storeId, title, message, type = 'system' }) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      store_id: storeId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date()
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = {
  createNotification
};

