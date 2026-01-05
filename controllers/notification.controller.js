const admin = require('../config/firebase');

const notificationController = {
  sendNotification: async (req, res) => {
    console.log("Notification request:", req.body);
    const { deviceToken, messagePayload } = req.body;

    try {
      if (!deviceToken) {
        return res.status(400).json({ error: 'deviceToken is required' });
      }
      if (!messagePayload || typeof messagePayload !== 'object') {
        return res.status(400).json({ error: 'Invalid messagePayload' });
      }
      if (!messagePayload.title || !messagePayload.body) {
        return res.status(400).json({ error: 'Invalid messagePayload: title and body are required' });
      }

      const message = {
        token: deviceToken,
        notification: {
          title: messagePayload.title,
          body: messagePayload.body,
        },
        data: {
          channelId: 'default',
          title: messagePayload.title,
          body: messagePayload.body,
          subtitle: messagePayload.subtitle || '',
        },
        android: {
          notification: {
            notificationPriority: 'PRIORITY_HIGH',
            color: '#2BA92B',
            visibility: 'PUBLIC',
          }
        }
      };

      const response = await admin.messaging().send(message);

      console.log('Successfully sent message:', response);
      return res.status(200).json({ success: 'Notification sent successfully', messageId: response });

    } catch (error) {
      console.error('Error sending notification:', error);
      return res.status(500).json({ error: error.message });
    }
  },
};

module.exports = notificationController;