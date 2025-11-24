const jwt = require('jsonwebtoken');
const config = require('../config/config.json');

const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret || 'your-secret-key';
const JWT_EXPIRES_IN = '365d'; // 7 days

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromHeader
};
