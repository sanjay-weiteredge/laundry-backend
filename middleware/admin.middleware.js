const { verifyToken, getTokenFromHeader } = require('../utils/jwt');
const { Admin } = require('../models');

const adminAuth = async (req, res, next) => {
  const isSignup = req.path === '/signup' || 
                   req.originalUrl === '/api/admin/signup' || 
                   req.originalUrl.endsWith('/admin/signup');
  
  const isLogin = req.path === '/login' || 
                  req.originalUrl === '/api/admin/login' || 
                  req.originalUrl.endsWith('/admin/login');
  
  if ((isSignup || isLogin) && req.method === 'POST') {
    console.log('Skipping auth for public route:', req.originalUrl);
    return next();
  }

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
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    req.user = admin;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

module.exports = adminAuth;
