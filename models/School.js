const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  district: { type: DataTypes.STRING },
  province: { type: DataTypes.STRING },
});

module.exports = School;
