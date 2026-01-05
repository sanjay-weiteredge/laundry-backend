'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'production';

// Load config.json ONLY as fallback
const configFile = require(path.join(__dirname, '/../config/config.json'));
const config = configFile[env];

const db = {};

let sequelize;

/**
 * ✅ Preferred: use environment variables (Docker / Production)
 */
if (process.env.DB_NAME && process.env.DB_USER && process.env.DB_HOST) {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,

      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },

      dialectOptions: {
        connectTimeout: 30000,
        keepAlive: true
      }
    }
  );
}
/**
 * ⚠️ Fallback: config.json (local / legacy / migrations)
 */
else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      ...config,
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        connectTimeout: 30000,
        keepAlive: true
      }
    }
  );
}

/* -------------------- Load Models -------------------- */

fs.readdirSync(__dirname)
  .filter(file => (
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    !file.endsWith('.test.js')
  ))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

/* -------------------- Associations -------------------- */

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

/* -------------------- Exports -------------------- */

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
