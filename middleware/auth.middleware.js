const { verifyToken, getTokenFromHeader } = require('../utils/jwt');
const { User, Store, Admin } = require('../models');


const auth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    let user = null;

    if (decoded.role === 'admin') {
      user = await Admin.findByPk(decoded.id);
    } else {
      user = await User.findByPk(decoded.id);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Store authentication middleware
const storeAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'store') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const store = await Store.findByPk(decoded.store.id);
    
    if (!store) {
      return res.status(401).json({
        success: false,
        message: 'Store not found'
      });
    }

    if (!store.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Store account is deactivated'
      });
    }
    
    req.store = store;
    next();
  } catch (error) {
    console.error('Store authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};


const skipAuth = async (req, res, next) => {
  const publicPaths = [
    '/signup',
    '/api/admin/signup',
    '/admin/signup',
    '/api/stores/login',
    '/send-otp',
    '/verify-otp'
  ];

 
  if (publicPaths.some(path => req.path.endsWith(path)) || 
      (req.path === '/admin/signup' && req.method === 'POST')) {
    console.log('Skipping auth for:', req.path);
    return next();
  }
  
 
  if (req.path.startsWith('/api/stores/')) {
    return storeAuth(req, res, next);
  }
  

  return auth(req, res, next);
};


const adminAuth = (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin privileges'
    });
  }
};

module.exports = {
  auth,
  storeAuth,
  skipAuth,
  adminAuth
};
