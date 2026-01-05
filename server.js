const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');

const userRoutes = require('./routes/user.routes');
const addressRoutes = require('./routes/address.routes');
const servicePricingRoutes = require('./routes/servicePricing.routes');
const adminRoutes = require('./routes/admin.routes');
const storeRoutes = require('./routes/store.routes');
const servicesRoutes = require('./routes/services.routes');
const bookingRoutes = require('./routes/booking.routes');
const orderRoutes = require('./routes/order.routes');
const settingRoutes = require('./routes/setting.routes');

const app = express();
const PORT = process.env.PORT || 8000;

/* -------------------- Middleware -------------------- */

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- Routes -------------------- */

app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/service-pricing', servicePricingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingRoutes);

/* -------------------- Health Check -------------------- */

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected'
    });
  }
});

/* -------------------- 404 Handler -------------------- */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

/* -------------------- Error Handler -------------------- */

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

/* -------------------- Global Safety -------------------- */

process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

/* -------------------- Server Start -------------------- */

async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // ⚠️ TEMPORARY / DEV ONLY
    if (process.env.DB_SYNC === 'true') {
      console.warn('⚠️ Running sequelize.sync({ alter: true })');
      await sequelize.sync({ alter: true });
      console.warn('⚠️ DB sync completed');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}


startServer();

module.exports = app;
